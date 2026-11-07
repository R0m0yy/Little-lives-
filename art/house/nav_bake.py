"""Per-level navigation grid for the house (round 21, H5). Called from build_house.py before the static merge.

Walkable = room floor rectangles (minus stair openings) minus every mesh footprint that stands on that floor
(furniture, partitions, door leaves, stair flights, railings), inflated by the character radius. Doorways are the
gaps in the partitions; stairs are links between levels (bottom on level L -> top on level L+1).
Validation: every interaction stand point must be on a walkable cell and reachable from every other one on the
same level (BFS); stairs make the levels one connected graph. Results go into house_data.json['nav'].
"""
import math
import numpy as np
import bpy

CELL = 0.04
SNAP = 0.50      # max distance an approach anchor may move to reach walkable space
REACH = 1.00     # an anchor must stay within this of its contact point (bed centre / first stair tread / seat)
RADIUS = 0.17      # character footprint radius (Naomi's skirt hem is ~0.235 wide each side at its widest; dolls are smaller)


def footprints(z0, z_top=0.45, z_min_height=0.03):
    """AABBs (x0, x1, y0, y1) of every mesh standing on the floor at z0."""
    out = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.name.startswith(('tabletop', 'plinth', 'step', 'bed', 'shrub', 'flower')) or not o.data.vertices:
            continue
        co = np.array([o.matrix_world @ v.co for v in o.data.vertices])
        zmin, zmax = co[:, 2].min(), co[:, 2].max()
        if zmin < z0 - 0.02 or zmin > z0 + z_top or zmax < z0 + z_min_height:
            continue
        x0, x1, y0, y1 = co[:, 0].min(), co[:, 0].max(), co[:, 1].min(), co[:, 1].max()
        if (x1 - x0) * (y1 - y0) > 3.0:      # slabs / big shells are handled by the room rectangles
            continue
        out.append((x0, x1, y0, y1, o.name))
    return out


def bake(levels, interactions, stairs, excluded=()):
    """levels: [{level, z, rects: [(x0,x1,y0,y1)], holes: [(x0,x1,y0,y1)]}]. Returns nav dict + report."""
    gx0 = min(r[0] for L in levels for r in L['rects']); gx1 = max(r[1] for L in levels for r in L['rects'])
    gy0 = min(r[2] for L in levels for r in L['rects']); gy1 = max(r[3] for L in levels for r in L['rects'])
    nx, ny = int(math.ceil((gx1 - gx0) / CELL)), int(math.ceil((gy1 - gy0) / CELL))
    xs = gx0 + (np.arange(nx) + 0.5) * CELL; ys = gy0 + (np.arange(ny) + 0.5) * CELL
    X, Y = np.meshgrid(xs, ys)          # [ny, nx]
    rad = int(math.ceil(RADIUS / CELL))
    disk = [(dx, dy) for dx in range(-rad, rad + 1) for dy in range(-rad, rad + 1) if dx * dx + dy * dy <= rad * rad]
    nav, report = [], {'levels': []}
    LC = []
    cell_of = lambda x, y: (int((y - gy0) / CELL), int((x - gx0) / CELL))
    for L in levels:
        floor = np.zeros((ny, nx), bool)
        for x0, x1, y0, y1 in L['rects']:
            floor |= (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
        for x0, x1, y0, y1 in L.get('holes', []):
            floor &= ~((X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1))
        blocked = ~floor
        for x0, x1, y0, y1, _ in footprints(L['z']):
            blocked |= (X >= x0) & (X <= x1) & (Y >= y0) & (Y <= y1)
        infl = blocked.copy()
        for dx, dy in disk:     # inflate by the character radius
            sh = np.zeros_like(blocked)
            sy0, sy1 = max(0, dy), ny + min(0, dy); sx0, sx1 = max(0, dx), nx + min(0, dx)
            sh[sy0:sy1, sx0:sx1] = blocked[sy0 - dy:sy1 - dy, sx0 - dx:sx1 - dx]
            infl |= sh
        walk = ~infl
        # BFS components
        comp = -np.ones((ny, nx), int); nc = 0
        for j in range(ny):
            for i in range(nx):
                if walk[j, i] and comp[j, i] < 0:
                    stack = [(j, i)]; comp[j, i] = nc
                    while stack:
                        a, b = stack.pop()
                        for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                            c, d = a + da, b + db
                            if 0 <= c < ny and 0 <= d < nx and walk[c, d] and comp[c, d] < 0:
                                comp[c, d] = nc; stack.append((c, d))
                    nc += 1
        sizes = [(comp == k).sum() for k in range(nc)]
        main = int(np.argmax(sizes)) if sizes else -1
        lvl_ips = [ip for ip in interactions if abs(ip['stand'][2] - L['z']) < 0.3 and ip.get('room') not in excluded]
        R = int(round(SNAP / CELL))
        for ip in lvl_ips:
            j0, i0 = cell_of(ip['stand'][0], ip['stand'][1])
            cj, ci = cell_of(ip['contact'][0], ip['contact'][1])
            best = None   # approach anchors snap to the nearest walkable cell within SNAP (and within REACH of the contact)
            for dj in range(-R, R + 1):
                for di in range(-R, R + 1):
                    c, d = j0 + dj, i0 + di
                    if not (0 <= c < ny and 0 <= d < nx) or not walk[c, d] or math.hypot(c - cj, d - ci) * CELL > REACH:
                        continue
                    dd = dj * dj + di * di
                    if dd <= R * R and (best is None or dd < best[0]):
                        best = (dd, c, d)
            if best is None:
                ip['_lc'] = None; continue
            if best[0] > 0:
                ip['moved'] = round(math.sqrt(best[0]) * CELL, 3)
                ip['stand'] = [round(xs[best[2]], 4), round(ys[best[1]], 4), ip['stand'][2]]
            ip['_lc'] = (L['level'], int(comp[best[1], best[2]]))
        LC.append((L, walk, comp, main, lvl_ips, nc, sizes))
    # round 22: global reachability — components joined by stair links (climb point <-> arrive point), rooted at the
    # largest component of the ground floor
    adj = {}
    for st in stairs:
        a = [ip for ip in interactions if ip.get('stair') == st['id'] and ip['kind'] == 'climb' and ip.get('_lc')]
        b = [ip for ip in interactions if ip.get('stair') == st['id'] and ip['kind'] == 'arrive' and ip.get('_lc')]
        if a and b:
            adj.setdefault(a[0]['_lc'], set()).add(b[0]['_lc']); adj.setdefault(b[0]['_lc'], set()).add(a[0]['_lc'])
    root = (LC[0][0]['level'], LC[0][3]); seen = {root}; stack = [root]
    while stack:
        u = stack.pop()
        for v in adj.get(u, ()):
            if v not in seen:
                seen.add(v); stack.append(v)
    for (L, walk, comp, main, lvl_ips, nc, sizes) in LC:
        bad = []
        for ip in lvl_ips:
            ip['reachable'] = bool(ip.get('_lc') in seen)
            if not ip['reachable']:
                bad.append(ip['id'])
        for ip in lvl_ips:
            ip.pop('_lc', None)
        reach_mask = np.isin(comp, [c for (lv, c) in seen if lv == L['level']])
        rows = [''.join('1' if walk[j, i] else '0' for i in range(nx)) for j in range(ny)]
        nav.append(dict(level=L['level'], z=round(L['z'], 4), origin=[round(gx0, 4), round(gy0, 4)], cell=CELL, nx=nx, ny=ny, rows=rows))
        report['levels'].append(dict(level=L['level'], walkable_cells=int(walk.sum()), components=nc, main_size=int(sizes[main]) if sizes else 0,
                                     reachable_cells=int(reach_mask.sum()), interactions=len(lvl_ips), unreachable=bad, _walk=walk, _comp=reach_mask.astype(int), _main=1))
    # stair links: bottom (level L) and top (level L+1) must both be in their level's main component
    links = []
    for st in stairs:
        lv = [k for k, L in enumerate(levels) if abs(L['z'] - st['bottom'][2]) < 0.3]
        lt = [k for k, L in enumerate(levels) if abs(L['z'] - st['top'][2]) < 0.3]
        links.append(dict(stair=st['id'], from_level=levels[lv[0]]['level'] if lv else None, to_level=levels[lt[0]]['level'] if lt else None))
    return dict(cell=CELL, radius=RADIUS, levels=nav, links=links), report
