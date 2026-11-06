// Little Lives core — grid navigation (port of src/nav.js): inflated occupancy grid, 8-way A*, LOS smoothing.
import { lerp } from './math.js';

export class NavGrid {
  constructor(b, cell, radius) {
    this.x0 = b.x0; this.z0 = b.z0; this.cell = cell; this.r = radius;
    this.nx = Math.ceil((b.x1 - b.x0) / cell); this.nz = Math.ceil((b.z1 - b.z0) / cell);
    this.base = new Uint8Array(this.nx * this.nz); this.grid = new Uint8Array(this.nx * this.nz);
    this.shapes = []; this.dynamic = {}; this.dirty = true;
  }
  addStatic(s) { this.shapes.push(s); }
  setDynamic(id, s) { this.dynamic[id] = s; this.dirty = true; }
  _blocked(x, z, s, r) {
    if (s.type === 'rect') { const dx = Math.max(s.x0 - x, 0, x - s.x1), dz = Math.max(s.z0 - z, 0, z - s.z1); return dx * dx + dz * dz < r * r; }
    return Math.hypot(x - s.x, z - s.z) < s.r + r;
  }
  _cellCenter(i, j) { return [this.x0 + (i + 0.5) * this.cell, this.z0 + (j + 0.5) * this.cell]; }
  bake(walkable) {
    for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
      const [x, z] = this._cellCenter(i, j);
      let b = walkable(x, z) ? 0 : 1;
      if (!b) for (const s of this.shapes) if (this._blocked(x, z, s, s.pad != null ? s.pad : this.r)) { b = 1; break; }
      this.base[j * this.nx + i] = b;
    }
    this.dirty = true;
  }
  refresh() {
    if (!this.dirty) return; this.dirty = false;
    this.grid.set(this.base);
    for (const s of Object.values(this.dynamic)) {
      if (!s) continue;
      for (let j = 0; j < this.nz; j++) for (let i = 0; i < this.nx; i++) {
        const [x, z] = this._cellCenter(i, j);
        if (this._blocked(x, z, s, s.pad != null ? s.pad : this.r)) this.grid[j * this.nx + i] = 1;
      }
    }
  }
  idx(x, z) { const i = Math.floor((x - this.x0) / this.cell), j = Math.floor((z - this.z0) / this.cell); return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : j * this.nx + i; }
  free(x, z) { const k = this.idx(x, z); return k >= 0 && !this.grid[k]; }
  nearestFree(x, z) {
    if (this.free(x, z)) return [x, z];
    for (let r = 1; r < 30; r++) {
      let best = null, bd = 1e9;
      for (let a = 0; a < 16 * r; a++) {
        const t = (a / (16 * r)) * Math.PI * 2, px = x + Math.cos(t) * r * this.cell, pz = z + Math.sin(t) * r * this.cell;
        if (this.free(px, pz)) { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = [px, pz]; } }
      }
      if (best) return best;
    }
    return null;
  }
  los(a, b) {
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / (this.cell * 0.4));
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(1, n); const x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t);
      if (!this.free(x, z) && Math.min(t * d, (1 - t) * d) > 0.5) return false;
    }
    return true;
  }
  /** @returns {number[][]|null} [x,z] waypoints ending exactly at goal */
  path(from, goal) {
    this.refresh();
    const s = this.nearestFree(from[0], from[1]), g = this.nearestFree(goal[0], goal[1]);
    if (!s || !g) return null;
    const si = this.idx(s[0], s[1]), gi = this.idx(g[0], g[1]);
    const nx = this.nx, N = this.grid.length;
    const gS = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N), inOpen = new Uint8Array(N);
    const open = [si]; inOpen[si] = 1; gS[si] = 0;
    const gx = gi % nx, gz = (gi / nx) | 0;
    const h = (k) => { const dx = Math.abs((k % nx) - gx), dz = Math.abs(((k / nx) | 0) - gz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const f = new Float32Array(N).fill(1e9); f[si] = h(si);
    let found = false, iter = 0;
    while (open.length && iter++ < 20000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop(); inOpen[cur] = 0;
      if (cur === gi) { found = true; break; }
      closed[cur] = 1;
      const cx = cur % nx, cz = (cur / nx) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= nx || z >= this.nz) continue;
        const k = z * nx + x; if (this.grid[k] || closed[k]) continue;
        if (dx && dz && (this.grid[cz * nx + x] || this.grid[z * nx + cx])) continue; // no corner cutting
        const ng = gS[cur] + (dx && dz ? 1.414 : 1);
        if (ng < gS[k]) { gS[k] = ng; came[k] = cur; f[k] = ng + h(k); if (!inOpen[k]) { open.push(k); inOpen[k] = 1; } }
      }
    }
    if (!found) return null;
    const cells = []; for (let k = gi; k !== -1; k = came[k]) cells.push(this._cellCenter(k % nx, (k / nx) | 0));
    cells.reverse();
    const pts = [from.slice(), ...cells.slice(1, -1), g];
    const out = [pts[0]]; let a = 0;
    while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !this.los(pts[a], pts[b])) b--; out.push(pts[b]); a = b; }
    if (Math.hypot(goal[0] - g[0], goal[1] - g[1]) > 1e-3) out.push(goal.slice());
    return out;
  }
}
