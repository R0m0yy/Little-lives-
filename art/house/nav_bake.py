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


def bake(levels, interactions, stairs):
    """levels: [{level, z, rects: [(x0,x1,y0,y1)], holes: [(x0,x1,y0,y1)]}]. Returns nav dict + report."""
    gx0 = min(r[0] for L in levels for r in L['rects']); gx1 = max(r[1] for L in levels for r in L['rects'])
    gy0 = min(r[2] for L in levels for r in L['rects']); gy1 = max(r[3] for L in levels for r in L['rects'])
    nx, ny = int(math.ceil((gx1 - gx0) / CELL)), int(math.ceil((gy1 - gy0) / CELL))
    xs = gx0 + (np.arange(nx) + 0.5) * CELL; ys = gy0 + (np.arange(ny) + 0.5) * CELL
    X, Y = np.meshgrid(xs, ys)          # [ny, nx]
    rad = int(math.ceil(RADIUS / CELL))
    disk = [(dx, dy) for dx in range(-rad, rad + 1) for dy in range(-rad, rad + 1) if dx * dx + dy * dy <= rad * rad]
    nav, report = [], {'levels': []}
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
        lvl_ips = [ip for ip in interactions if abs(ip['stand'][2] - L['z']) < 0.3]
        bad = []
        for ip in lvl_ips:
            j, i = cell_of(ip['stand'][0], ip['stand'][1])
            ok = 0 <= j < ny and 0 <= i < nx and walk[j, i]
            if not ok:   # allow snapping to the nearest walkable cell within 0.12
                best = None
                for dj in range(-3, 4):
                    for di in range(-3, 4):
                        c, d = j + dj, i + di
                        if 0 <= c < ny and 0 <= d < nx and walk[c, d] and (best is None or dj * dj + di * di < best[0]):
                            best = (dj * dj + di * di, c, d)
                if best:
                    j, i = best[1], best[2]; ok = True; ip['snapped'] = True
            reach = ok and comp[j, i] == main
            ip['reachable'] = bool(reach)
            if not reach:
                bad.append(ip['id'])
        rows = [''.join('1' if walk[j, i] else '0' for i in range(nx)) for j in range(ny)]
        nav.append(dict(level=L['level'], z=round(L['z'], 4), origin=[round(gx0, 4), round(gy0, 4)], cell=CELL, nx=nx, ny=ny, rows=rows))
        report['levels'].append(dict(level=L['level'], walkable_cells=int(walk.sum()), components=nc, main_size=int(sizes[main]) if sizes else 0,
                                     interactions=len(lvl_ips), unreachable=bad, _walk=walk, _comp=comp, _main=main))
    # stair links: bottom (level L) and top (level L+1) must both be in their level's main component
    links = []
    for st in stairs:
        lv = [k for k, L in enumerate(levels) if abs(L['z'] - st['bottom'][2]) < 0.3]
        lt = [k for k, L in enumerate(levels) if abs(L['z'] - st['top'][2]) < 0.3]
        links.append(dict(stair=st['id'], from_level=levels[lv[0]]['level'] if lv else None, to_level=levels[lt[0]]['level'] if lt else None))
    return dict(cell=CELL, radius=RADIUS, levels=nav, links=links), report
