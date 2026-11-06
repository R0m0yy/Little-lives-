// Little Lives — procedural mesh builder
// Vertex layout: pos3 nrm3 uv2 col4(rgb,spec) mat2(shininess,emissive) joint2 weight2  = 18 floats
(function () {
  const { M4, V, M } = LL;
  const STRIDE = 18;

  class MeshBuilder {
    constructor() {
      this.v = []; this.i = [];
      this.stack = [M4.ident()];
      this.color = [1, 1, 1]; this.spec = 0.15; this.shin = 0.25; this.emis = 0;
      this.skin = null; // fn(pos)->[j0,j1,w0,w1]
      this.bone = -1;
      this.uvScale = 1;
    }
    get mat() { return this.stack[this.stack.length - 1]; }
    push(m) { this.stack.push(M4.mul(this.mat, m)); return this; }
    pushT(x, y, z, q, s) { return this.push(M4.trs([x, y, z], q, s)); }
    pop() { this.stack.pop(); return this; }
    set(o) { Object.assign(this, o); return this; }
    vcount() { return this.v.length / STRIDE; }

    _emit(pos, uv, col) {
      const p = M4.point(this.mat, pos);
      let j = [0, 0, 1, 0];
      if (this.skin) j = this.skin(p);
      else if (this.bone >= 0) j = [this.bone, 0, 1, 0];
      const c = col || this.color;
      this.v.push(p[0], p[1], p[2], 0, 0, 0, uv[0], uv[1], c[0], c[1], c[2], this.spec, this.shin, this.emis, j[0], j[1], j[2], j[3]);
      return this.vcount() - 1;
    }
    _normals(start, istart) {
      const v = this.v, I = this.i;
      for (let k = istart; k < I.length; k += 3) {
        const a = I[k] * STRIDE, b = I[k + 1] * STRIDE, c = I[k + 2] * STRIDE;
        const e1 = [v[b] - v[a], v[b + 1] - v[a + 1], v[b + 2] - v[a + 2]];
        const e2 = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]];
        const n = V.cross(e1, e2);
        for (const o of [a, b, c]) { v[o + 3] += n[0]; v[o + 4] += n[1]; v[o + 5] += n[2]; }
      }
      for (let k = start; k < this.vcount(); k++) {
        const o = k * STRIDE; const l = Math.hypot(v[o + 3], v[o + 4], v[o + 5]) || 1;
        v[o + 3] /= l; v[o + 4] /= l; v[o + 5] /= l;
      }
    }
    // generic parametric grid. fn(u,v)->[x,y,z] (local). u,v in [0,1]
    grid(nu, nv, fn, opt = {}) {
      const start = this.vcount(), istart = this.i.length;
      const colFn = opt.colFn;
      for (let b = 0; b <= nv; b++) for (let a = 0; a <= nu; a++) {
        const u = a / nu, w = b / nv;
        const p = fn(u, w);
        const uv = opt.uv ? opt.uv(u, w, p) : [u * (opt.us || 1), w * (opt.vs || 1)];
        this._emit(p, uv, colFn ? colFn(u, w, p) : null);
      }
      const row = nu + 1;
      for (let b = 0; b < nv; b++) for (let a = 0; a < nu; a++) {
        const i0 = start + b * row + a, i1 = i0 + 1, i2 = i0 + row, i3 = i2 + 1;
        if (opt.flip) this.i.push(i0, i1, i2, i1, i3, i2); else this.i.push(i0, i2, i1, i1, i2, i3);
      }
      // weld seam along u for closed surfaces so normals are smooth
      if (opt.closedU) {
        const v = this.v;
        this._normals(start, istart);
        for (let b = 0; b <= nv; b++) {
          const o0 = (start + b * row) * STRIDE, o1 = (start + b * row + nu) * STRIDE;
          const n = V.norm([v[o0 + 3] + v[o1 + 3], v[o0 + 4] + v[o1 + 4], v[o0 + 5] + v[o1 + 5]]);
          for (const o of [o0, o1]) { v[o + 3] = n[0]; v[o + 4] = n[1]; v[o + 5] = n[2]; }
        }
        return this;
      }
      this._normals(start, istart);
      return this;
    }
    // ellipsoid / partial sphere. u around (phi), v from top(0) to bottom(1)
    sphere(rx, ry, rz, nu = 24, nv = 16, opt = {}) {
      const t0 = opt.t0 || 0, t1 = opt.t1 == null ? 1 : opt.t1, p0 = opt.p0 || 0, p1 = opt.p1 == null ? 1 : opt.p1;
      const def = opt.deform;
      return this.grid(nu, nv, (u, v) => {
        const ph = (p0 + (p1 - p0) * u) * Math.PI * 2, th = (t0 + (t1 - t0) * v) * Math.PI;
        let p = [Math.sin(th) * Math.sin(ph) * rx, Math.cos(th) * ry, Math.sin(th) * Math.cos(ph) * rz];
        if (def) p = def(p, u, v);
        return p;
      }, { closedU: p1 - p0 >= 1, ...opt });
    }
    // revolve profile [[r,y],...] around Y
    lathe(prof, nu = 24, opt = {}) {
      const n = prof.length - 1;
      const def = opt.deform;
      return this.grid(nu, n, (u, v) => {
        const k = Math.round(v * n); const [r, y] = prof[k];
        const ph = u * Math.PI * 2;
        let p = [Math.sin(ph) * r, y, Math.cos(ph) * r];
        if (def) p = def(p, u, v);
        return p;
      }, { closedU: true, flip: opt.flip, uv: opt.uv || ((u, v) => [u * (opt.us || 1), v * (opt.vs || 1)]), colFn: opt.colFn });
    }
    cylinder(rt, rb, h, nu = 16, caps = true) {
      this.lathe(caps ? [[0, h], [rt, h], [rt, h], [rb, 0], [rb, 0], [0, 0]].map((p, k) => [p[0] * (k === 2 || k === 3 ? 1 : 1), p[1]]) : [[rt, h], [rb, 0]], nu);
      return this;
    }
    // cylinder with hard caps (separate normals)
    cyl(rt, rb, h, nu = 16) {
      this.lathe([[rt, h], [rb, 0]], nu);
      this.disk(rt, h, nu, true); this.disk(rb, 0, nu, false);
      return this;
    }
    disk(r, y, nu = 16, up = true) {
      const start = this.vcount(), istart = this.i.length;
      const c = this._emit([0, y, 0], [0.5, 0.5]);
      for (let a = 0; a <= nu; a++) { const ph = (a / nu) * Math.PI * 2; this._emit([Math.sin(ph) * r, y, Math.cos(ph) * r], [0.5 + Math.sin(ph) * 0.5, 0.5 + Math.cos(ph) * 0.5]); }
      for (let a = 0; a < nu; a++) up ? this.i.push(c, c + 1 + a, c + 2 + a) : this.i.push(c, c + 2 + a, c + 1 + a);
      this._normals(start, istart);
      return this;
    }
    torus(R, r, nu = 24, nv = 10, arc = 1) {
      return this.grid(nu, nv, (u, v) => {
        const a = u * Math.PI * 2 * arc, b = v * Math.PI * 2;
        const rr = R + Math.cos(b) * r;
        return [Math.cos(a) * rr, Math.sin(b) * r, Math.sin(a) * rr];
      }, { closedU: arc >= 1 });
    }
    // tube along polyline pts with radius fn r(t)
    tube(pts, r, nv = 8, opt = {}) {
      const n = pts.length - 1;
      const rf = typeof r === 'function' ? r : () => r;
      const frames = [];
      let prevN = opt.up || [0, 1, 0];
      for (let k = 0; k <= n; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n, k + 1)];
        const t = V.norm(V.sub(b, a));
        let nn = V.cross(t, V.cross(prevN, t));
        if (V.len(nn) < 1e-4) nn = V.cross(t, [1, 0, 0]);
        nn = V.norm(nn); prevN = nn;
        frames.push([t, nn, V.cross(t, nn)]);
      }
      return this.grid(nv, n, (u, v) => {
        const k = Math.round(v * n); const [, nn, bb] = frames[k];
        const ang = u * Math.PI * 2, rad = rf(v);
        const sx = opt.flat ? opt.flat : 1;
        return V.add(pts[k], V.add(V.scale(nn, Math.cos(ang) * rad), V.scale(bb, Math.sin(ang) * rad * sx)));
      }, { closedU: true, flip: true, us: 1, vs: opt.vs || 1 });
    }
    // box centered at origin; uv in world units * uvScale
    box(w, h, d, opt = {}) {
      const hx = w / 2, hy = h / 2, hz = d / 2, s = opt.uvScale || this.uvScale;
      const faces = [
        [[1, 0, 0], [0, 0, -1], [0, 1, 0], hx, d, h],
        [[-1, 0, 0], [0, 0, 1], [0, 1, 0], hx, d, h],
        [[0, 1, 0], [1, 0, 0], [0, 0, -1], hy, w, d],
        [[0, -1, 0], [1, 0, 0], [0, 0, 1], hy, w, d],
        [[0, 0, 1], [1, 0, 0], [0, 1, 0], hz, w, h],
        [[0, 0, -1], [-1, 0, 0], [0, 1, 0], hz, w, h],
      ];
      for (const [n, uA, vA, off, su, sv] of faces) {
        if (opt.skip && opt.skip.includes(faces.findIndex((f) => f[0] === n))) continue;
        const start = this.vcount(), istart = this.i.length;
        const c = V.scale(n, off);
        const P = (a, b) => V.add(c, V.add(V.scale(uA, a * su / 2), V.scale(vA, b * sv / 2)));
        const k = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        for (const [a, b] of k) this._emit(P(a, b), [((a + 1) / 2) * su * s, ((b + 1) / 2) * sv * s]);
        this.i.push(start, start + 1, start + 2, start, start + 2, start + 3);
        this._normals(start, istart);
      }
      return this;
    }
    // rounded box (soft bevel) centered
    rbox(w, h, d, r, k = 3, opt = {}) {
      r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
      const half = [w / 2, h / 2, d / 2], inner = half.map((x) => x - r);
      const coords = (ax) => { const c = [-half[ax]]; for (let i = 1; i <= k; i++) c.push(-inner[ax] - r * Math.cos((i / k) * Math.PI / 2)); c.push(inner[ax]); for (let i = 1; i <= k; i++) c.push(inner[ax] + r * Math.sin((i / k) * Math.PI / 2)); return c; };
      const s = opt.uvScale || this.uvScale;
      const proj = (p) => { const q = p.map((x, i) => M.clamp(x, -inner[i], inner[i])); const dd = V.sub(p, q); const l = V.len(dd); return l < 1e-6 ? p : V.add(q, V.scale(dd, r / l)); };
      const faces = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 0, 2, 1], [1, 0, 2, -1], [2, 0, 1, 1], [2, 0, 1, -1]];
      for (const [ax, ua, va, sg] of faces) {
        const cu = coords(ua), cv = coords(va);
        const nu = cu.length - 1, nv = cv.length - 1;
        this.grid(nu, nv, (u, v) => {
          const p = [0, 0, 0]; p[ax] = sg * half[ax]; p[ua] = cu[Math.round(u * nu)]; p[va] = cv[Math.round(v * nv)];
          return proj(p);
        }, { flip: (sg > 0) !== (ax === 1), uv: (u, v, p) => [(p[ua] + half[ua]) * s, (p[va] + half[va]) * s] });
      }
      return this;
    }
    quad(w, d, opt = {}) { return this.box(w, 0.001, d, { ...opt, skip: [0, 1, 3, 4, 5] }); }
    build() { return { data: new Float32Array(this.v), index: new Uint32Array(this.i), count: this.i.length }; }
  }
  MeshBuilder.STRIDE = STRIDE;
  LL.MeshBuilder = MeshBuilder;
})();
