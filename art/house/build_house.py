"""Little Lives — 3-storey Victorian dollhouse blockout -> assets/house/house.glb

Matches the lower-right house of refs/design_board.png (architectural authority).
Scale: board px / 51.4 = units; Naomi is 1.0 tall. X right, -Y = open front, Z up.
Measured from the board: main body x 1080..1420 px (3 bays split by posts at 1205/1305), floor lines at
y 1000/905/820/722 px, left gable apex 645, centre gable apex 625, wings 45 px each side.
Room lights are exported as empties named  Light_<room>  (Three.js adds PointLights there).
"""
import math, os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import bpy, bmesh
from mathutils import Vector as V, Matrix
import meshkit as K
import textures as TX

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets/house/house.glb')
TEX = os.path.join(ROOT, 'art/house/tex')
os.makedirs(TEX, exist_ok=True)
rnd = random.Random(3)
PX = 51.4
X = lambda px: (px - 1250) / PX
Z = lambda py: (1005 - py) / PX

# ------------------------------------------------------------------ layout
D = 2.5                       # depth of the rooms (front y=0 -> back y=D)
WALL = 0.08
FLOORS = [Z(1000), Z(905), Z(820), Z(722)]          # F1, F2, F3 floor levels + attic floor
POSTS = [X(1082), X(1205), X(1305), X(1420)]
WING = (X(1031), X(1468))   # round 7: measured wing extents
EAVE_Z = Z(722)

K.reset()
T = {}
for name, fn, args in [
    ('wp_gold', TX.wallpaper, dict(base=(214, 168, 96), motif=(186, 136, 70))),
    ('wp_rose', TX.wallpaper, dict(base=(206, 150, 112), motif=(180, 116, 84), kind='floral', seed=2)),
    ('wp_sage', TX.wallpaper, dict(base=(190, 170, 110), motif=(160, 140, 84), kind='stripe', seed=3)),
    ('wp_cream', TX.wallpaper, dict(base=(222, 186, 124), motif=(196, 156, 96), kind='floral', seed=4)),
    ('wp_blue', TX.wallpaper, dict(base=(176, 190, 196), motif=(150, 168, 178), kind='damask', seed=5)),
    ('planks', TX.planks, {}), ('slate', TX.slate2, {}), ('siding', TX.siding, {}),   # round 11: slate2
    ('shingle', TX.fishscale, {}), ('beds', TX.flowerbed, {}),   # round 10: real fish-scale shingles
]:
    p = os.path.join(TEX, name + '.png'); fn(p, **args); T[name] = p

M = dict(
    trim=K.material('trim_cream', base='#efe4cf', rough=0.55),
    trimDark=K.material('trim_shadow', base='#d8ccb4', rough=0.6),
    slate=K.material('roof_slate', tex=T['slate'], rough=0.48, spec=0.55),
    siding=K.material('siding', tex=T['siding'], rough=0.7),
    shingle=K.material('siding_shingle', tex=T['shingle'], rough=0.7),
    floor=K.material('floor_planks', tex=T['planks'], rough=0.4, coat=0.4),
    ceil=K.material('ceiling', base='#d8b080', rough=0.8),
    wain=K.material('wood_wainscot', base='#7a4a2a', rough=0.5),
    wood=K.material('wood_dark', base='#5a3420', rough=0.45, coat=0.2),
    woodLight=K.material('wood_light', base='#a8703e', rough=0.5),
    linen=K.material('fabric_linen', base='#f3ece0', rough=0.85),
    quilt=K.material('fabric_quilt', base='#efd6d0', rough=0.85),
    sofa=K.material('fabric_sofa', base='#c8b8a0', rough=0.85),
    rose=K.material('fabric_rose', base='#c77a78', rough=0.85),
    rug=K.material('fabric_rug', base='#8a3a30', rough=0.9),
    brass=K.material('metal_brass', base='#d8a850', metal=1.0, rough=0.3),
    iron=K.material('metal_iron', base='#262422', metal=0.6, rough=0.45),
    shade=K.material('lamp_shade', base='#ffe6b0', rough=0.7, emission='#ffc070', emission_strength=4.0),
    bulb=K.material('lamp_bulb', base='#fff0c0', emission='#ffd890', emission_strength=12.0),
    fire=K.material('fire', base='#ff9a30', emission='#ff8a20', emission_strength=14.0),
    glass=K.material('window_glass', base='#3a4a66', rough=0.1, emission='#3a5578', emission_strength=0.6),
    stone=K.material('stone_plinth', base='#cfc3ae', rough=0.8),
    beds=K.material('garden_beds', tex=T['beds'], rough=0.9),
    leaf=K.material('plant_leaf', base='#4a7a3c', rough=0.7),
    table=K.material('tabletop_wood', tex=T['planks'], rough=0.35, coat=0.5),
    frame=K.material('picture_frame', base='#b08840', metal=0.6, rough=0.35),
    art=K.material('picture_art', base='#6a7a8a', rough=0.7),
    pot=K.material('pottery', base='#e8e0d0', rough=0.4),
)
for k in ('wp_gold', 'wp_rose', 'wp_sage', 'wp_cream', 'wp_blue'):
    M[k] = K.material('wall_' + k, tex=T[k], rough=0.85)


# ------------------------------------------------------------------ primitives
def box(name, x0, x1, y0, y1, z0, z1, mat, bevel=0.0, tex_scale=1.0):
    """Axis-aligned box with world-planar UVs (textures keep physical size)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    P = [V((x, y, z)) for z in (z0, z1) for y in (y0, y1) for x in (x0, x1)]
    vs = [bm.verts.new(p) for p in P]
    faces = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
    for f in faces:
        face = bm.faces.new([vs[i] for i in f])
        n = face.normal
        for lp in face.loops:
            c = lp.vert.co
            if abs(n.z) > 0.5: uv = (c.x, c.y)
            elif abs(n.y) > 0.5: uv = (c.x, c.z)
            else: uv = (c.y, c.z)
            lp[uvl].uv = (uv[0] / tex_scale, uv[1] / tex_scale)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = K.link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    if bevel > 0:
        b = ob.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'NONE'
        K.apply_mods(ob)
        for p in ob.data.polygons: p.use_smooth = True
    return ob


def bx(name, c, s, mat, bevel=0.01, ts=1.0):
    return box(name, c[0] - s[0] / 2, c[0] + s[0] / 2, c[1] - s[1] / 2, c[1] + s[1] / 2, c[2] - s[2] / 2, c[2] + s[2] / 2, mat, bevel, ts)


def poly(name, pts, mat, thick=0.03, tex_scale=1.0, axis='y'):
    """Extruded planar polygon (pts in the XZ plane at y=pts[i][1]) — gables, brackets."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    a = [bm.verts.new(V(p)) for p in pts]
    b = [bm.verts.new(V(p) + V((0, thick, 0))) for p in pts]
    fs = [bm.faces.new(a[::-1]), bm.faces.new(b)]
    n = len(pts)
    for i in range(n):
        fs.append(bm.faces.new([a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]]))
    for f in fs:
        for lp in f.loops:
            lp[uvl].uv = (lp.vert.co.x / tex_scale, lp.vert.co.z / tex_scale)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = K.link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    return ob


def slab(name, corners, mat, thick=0.06, tex_scale=1.0):
    """Roof plane from 4 corners (counter-clockwise from outside) with thickness along its normal."""
    c = [V(p) for p in corners]
    n = (c[1] - c[0]).cross(c[3] - c[0]).normalized()
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    top = [bm.verts.new(p) for p in c]
    bot = [bm.verts.new(p - n * thick) for p in c]
    u_ax = (c[1] - c[0]).normalized(); v_ax = n.cross(u_ax)
    fs = [bm.faces.new(top), bm.faces.new(bot[::-1])]
    for i in range(4):
        fs.append(bm.faces.new([top[i], bot[i], bot[(i + 1) % 4], top[(i + 1) % 4]]))
    for f in fs:
        for lp in f.loops:
            d = lp.vert.co - c[0]
            lp[uvl].uv = (d.dot(u_ax) / tex_scale, d.dot(v_ax) / tex_scale)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = K.link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    return ob


def cyl(name, c, r, h, mat, seg=16, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=V(c))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    ob = K.link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    return ob


def empty(name, p):
    e = bpy.data.objects.new(name, None); e.location = p; K.link(e); return e


# ------------------------------------------------------------------ pierced fretwork (round 10)
def pierced(name, origin, u_dir, v_dir, L, Hh, keep, cell=0.0145, thick=0.032, mat=None):
    """Planar panel with real cut-outs: grid cells in (u, v) kept where keep(u, v); solidified along u x v."""
    nu, nv = max(2, int(L / cell)), max(2, int(Hh / cell))
    du, dv = L / nu, Hh / nv
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UVMap')
    grid = {}
    def vert(i, j):
        if (i, j) not in grid:
            grid[(i, j)] = bm.verts.new(origin + u_dir * (i * du) + v_dir * (j * dv))
        return grid[(i, j)]
    for i in range(nu):
        for j in range(nv):
            if keep((i + 0.5) * du, (j + 0.5) * dv):
                f = bm.faces.new([vert(i, j), vert(i + 1, j), vert(i + 1, j + 1), vert(i, j + 1)])
                for lp, (a, b) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]):
                    lp[uvl].uv = (a * du * 2, b * dv * 2)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = K.link(bpy.data.objects.new(name, me)); me.materials.append(mat or M['trim'])
    sm = ob.modifiers.new('sol', 'SOLIDIFY'); sm.thickness = thick; sm.offset = 0.0
    K.apply_mods(ob)
    return ob


def barge_keep(L, P=0.13, depth=0.17):
    def keep(u, v):
        if u < 0.04 or u > L - 0.04:
            return v < 0.115
        if v < 0.038:
            return True
        f = (u / P) % 1.0
        ccx = (math.floor(u / P) + 0.5) * P
        if math.hypot(u - ccx, v - 0.082) < 0.030:          # round piercing
            return False
        if math.hypot(u - math.floor(u / P + 0.5) * P, v - 0.072) < 0.013:   # small eyelet between
            return False
        return v < 0.118 + 0.048 * math.exp(-((f - 0.5) / 0.13) ** 2)      # scalloped edge with pendant drops
    return keep


def bargeboard(name, a, b, depth=0.17):
    """Pierced bargeboard hanging below the roof edge from a to b (both in a y = const plane)."""
    u = (b - a); L = u.length; u.normalize()
    n1 = V((u.z, 0, -u.x)); n2 = -n1
    v = n1 if n1.z < 0 else n2
    return pierced(name, a, u, v, L, depth, barge_keep(L))


def spandrel_keep(Wd, Hh):
    def keep(u, v):
        if math.hypot(u - Wd, v - Hh) < min(Wd, Hh) * 0.96:   # quarter-circle cut -> curved bracket
            return False
        if math.hypot(u - Wd * 0.28, v - Hh * 0.28) < 0.045:
            return False
        return True
    return keep


# ------------------------------------------------------------------ furniture kit
def bed(x, y, z, w=1.0, l=1.25, quilt='quilt'):
    bx('bedframe', (x, y, z + 0.18), (w, l, 0.2), M['wood'])
    bx('mattress', (x, y - 0.03, z + 0.36), (w * 0.94, l * 0.96, 0.16), M['linen'], 0.04)
    bx('quilt', (x, y - 0.18, z + 0.43), (w * 0.98, l * 0.66, 0.06), M[quilt], 0.03)
    bx('headboard', (x, y + l / 2 - 0.03, z + 0.55), (w * 1.04, 0.07, 0.75), M['wood'], 0.02)
    for sx in (-0.22, 0.22):
        K.ellipsoid('pillow', V((x + sx * w, y + l / 2 - 0.22, z + 0.49)), (w * 0.2, 0.1, 0.06), mat=M['linen'], nu=16, nv=10)


def lamp(x, y, z, h=0.55, name='lamp'):
    cyl('lampbase', (x, y, z + h * 0.35), 0.035, h * 0.7, M['brass'])
    cyl(name + '_shade', (x, y, z + h * 0.8), 0.14, 0.18, M['shade'], 20, 0.08)


def chandelier(x, y, zc):
    cyl('chain', (x, y, zc - 0.12), 0.01, 0.24, M['brass'], 6)
    for k in range(5):
        a = k / 5 * K.TAU
        cyl('candle', (x + math.cos(a) * 0.16, y + math.sin(a) * 0.16, zc - 0.3), 0.022, 0.09, M['bulb'], 8)
    K.ellipsoid('bowl', V((x, y, zc - 0.33)), (0.2, 0.2, 0.05), mat=M['brass'], nu=20, nv=8)


def chair(x, y, z, rot=0.0, mat='rose'):
    bx('seat', (x, y, z + 0.42), (0.38, 0.38, 0.07), M[mat], 0.02)
    by = 0.17 if rot == 0 else -0.17
    bx('back', (x, y + by, z + 0.72), (0.38, 0.05, 0.55), M['wood'], 0.015)
    for dx in (-0.16, 0.16):
        for dy in (-0.16, 0.16):
            bx('leg', (x + dx, y + dy, z + 0.2), (0.04, 0.04, 0.4), M['wood'], 0)


def armchair(x, y, z, mat='sofa'):
    bx('ac_seat', (x, y, z + 0.32), (0.6, 0.55, 0.22), M[mat], 0.06)
    bx('ac_back', (x, y + 0.24, z + 0.62), (0.6, 0.12, 0.5), M[mat], 0.06)
    for sx in (-0.27, 0.27):
        bx('ac_arm', (x + sx, y, z + 0.5), (0.1, 0.52, 0.24), M[mat], 0.05)


def table(x, y, z, w=1.0, l=0.6, h=0.62, cloth=False):
    bx('tabletop', (x, y, z + h), (w, l, 0.05), M['linen' if cloth else 'woodLight'], 0.01)
    if cloth:
        bx('tablecloth', (x, y, z + h - 0.12), (w + 0.04, l + 0.04, 0.22), M['linen'], 0.02)
    for dx in (-w / 2 + 0.06, w / 2 - 0.06):
        for dy in (-l / 2 + 0.06, l / 2 - 0.06):
            bx('tleg', (x + dx, y + dy, z + h / 2), (0.05, 0.05, h), M['wood'], 0)


def cabinet(x, y, z, w, h, d=0.4, mat='wood'):
    bx('cab', (x, y, z + h / 2), (w, d, h), M[mat], 0.015)
    n = max(1, round(w / 0.4))
    for i in range(n):
        bx('door', (x - w / 2 + (i + 0.5) * w / n, y - d / 2 - 0.005, z + h / 2), (w / n - 0.05, 0.01, h - 0.08), M['woodLight'], 0.005)


def window(x, z0, w, h, y=D - WALL / 2):
    bx('glass', (x, y - 0.01, z0 + h / 2), (w, 0.02, h), M['glass'], 0)
    for dx in (-w / 2, 0, w / 2):
        bx('mullion', (x + dx, y - 0.03, z0 + h / 2), (0.05, 0.05, h + 0.05), M['trim'], 0.005)
    for dz in (0, h / 2, h):
        bx('transom', (x, y - 0.03, z0 + dz), (w + 0.1, 0.05, 0.05), M['trim'], 0.005)
    bx('sill', (x, y - 0.08, z0 - 0.03), (w + 0.2, 0.12, 0.05), M['trim'], 0.01)
    for sx in (-1, 1):  # curtains
        bx('curtain', (x + sx * (w / 2 + 0.06), y - 0.07, z0 + h / 2 + 0.05), (0.16, 0.04, h + 0.3), M['rose'], 0.02)


def picture(x, z, w=0.36, h=0.28, y=D - WALL / 2):
    bx('frame', (x, y - 0.02, z), (w, 0.03, h), M['frame'], 0.005)
    bx('art', (x, y - 0.04, z), (w - 0.06, 0.01, h - 0.06), M['art'], 0)


def plant(x, y, z, s=1.0):
    cyl('planter', (x, y, z + 0.1 * s), 0.08 * s, 0.2 * s, M['pot'], 12, 0.06 * s)
    for k in range(7):
        a = k / 7 * K.TAU
        K.ellipsoid('leaf', V((x + math.cos(a) * 0.08 * s, y + math.sin(a) * 0.08 * s, z + 0.3 * s)), (0.09 * s, 0.05 * s, 0.04 * s), mat=M['leaf'], nu=10, nv=6,
                    rot=Matrix.Rotation(a, 3, 'Z'))


def rug(x, y, z, w, l):
    bx('rug', (x, y, z + 0.006), (w, l, 0.012), M['rug'], 0.004)


# ------------------------------------------------------------------ ROOM PLAN (round 9, H1)
# 12 rooms on 4 levels, partitions with hinged doors, straight stairs stacked along the centre-bay back wall
# (headroom >= 0.66 over a 1.0-tall doll on every flight), floor openings with balustrades, attic stair to the
# centre-gable landing and a second stair (Laila's room) to the open loft. Markers: Room_<id>, Floor_<n>, Light_<id>,
# Door_<a>_<b>, Stair_<id> (custom properties carry sizes / tags for the gameplay export in H5).
F1, F2, F3, F4 = FLOORS
CEIL = [F2 - 0.12, F3 - 0.12, F4 - 0.12]
BAYS = [(POSTS[0], POSTS[1]), (POSTS[1], POSTS[2]), (POSTS[2], POSTS[3])]
XI = [(POSTS[0] - 0.04, POSTS[1] - 0.04), (POSTS[1] + 0.04, POSTS[2] - 0.04), (POSTS[2] + 0.04, POSTS[3] + 0.04)]
YB = D - WALL                      # back wall interior face
DY0, DY1, DH = 0.36, 0.96, 1.25    # partition door: y range + height
BOOKS = [K.material(f'book_{i}', base=c, rough=0.6) for i, c in enumerate(['#7a2a2a', '#2a4a6a', '#3a5a2a', '#a07a3a'])]
M.update(enamel=K.material('enamel', base='#f4f0ea', rough=0.15, coat=0.6), mirror=K.material('mirror', base='#dfe6ee', metal=1.0, rough=0.05),
         toyR=K.material('toy_red', base='#c0443a', rough=0.5), toyB=K.material('toy_blue', base='#3c6aa8', rough=0.5),
         toyY=K.material('toy_yellow', base='#e0b440', rough=0.5), paper=K.material('paper', base='#efe6d2', rough=0.8))
ROOMS = [  # id, level, bay, title, wallpaper
    ('living', 0, 0, 'Living room', 'wp_gold'), ('dining', 0, 1, 'Dining room', 'wp_rose'), ('kitchen', 0, 2, 'Kitchen', 'wp_cream'),
    ('master', 1, 0, 'Master bedroom', 'wp_rose'), ('sitting', 1, 1, 'Sitting & play room', 'wp_gold'), ('bath', 1, 2, 'Bathroom', 'wp_blue'),
    ('elias', 2, 0, "Elias's room", 'wp_sage'), ('study', 2, 1, 'Study & library', 'wp_gold'), ('laila', 2, 2, "Laila's room", 'wp_rose'),
]
RID_OF = {(r[1], r[2]): r for r in ROOMS}


def tag(objs, **kv):
    for o in objs:
        for k, v in kv.items():
            o[k] = v
    return objs


def place(fn, x, y, z, rot=0.0, room=None, item=None, **kw):
    """Build fn at the origin, then rotate about Z and move to (x, y, z); tag every new object."""
    before = set(bpy.context.scene.objects)
    fn(0.0, 0.0, 0.0, **kw)
    new = [o for o in bpy.context.scene.objects if o not in before]
    Mt = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rot, 4, 'Z')
    for o in new:
        if o.type == 'MESH':
            o.data.transform(Mt)
        else:
            o.location = Mt @ o.location
    return tag(new, ll_room=room or '', ll_item=item or fn.__name__)


def marker(name, p, **props):
    e = empty(name, p)
    for k, v in props.items():
        e[k] = v
    return e


# ---------------- floors with stair openings
def slab_with_holes(name, z, x0, x1, y0, y1, holes, top_mat, bottom_mat=None, thick=0.12):
    """Floor slab (plank top + plaster ceiling below) as rectangles around axis-aligned holes."""
    xs = sorted({x0, x1, *[h[0] for h in holes], *[h[1] for h in holes]})
    ys = sorted({y0, y1, *[h[2] for h in holes], *[h[3] for h in holes]})
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            cx, cy = (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2
            if any(h[0] <= cx <= h[1] and h[2] <= cy <= h[3] for h in holes):
                continue
            box(f'{name}_top', xs[i], xs[i + 1], ys[j], ys[j + 1], z - 0.025, z, top_mat, 0, 1.2)
            if bottom_mat:
                box(f'{name}_ceil', xs[i], xs[i + 1], ys[j], ys[j + 1], z - thick, z - 0.025, bottom_mat, 0, 1.0)


# ---------------- stairs
STAIRS = []


def stair(sid, axis, s0, s1, z0, z1, a0, a1, n=10, mat='woodLight', room='', head=1.10):
    """Open-tread straight flight. axis 'x' or 'y'; runs from s0 (bottom) to s1 (top) along that axis, a0..a1 across.
    Returns the opening needed in the floor above: along-axis range where headroom < `head`."""
    H = z1 - z0; L = s1 - s0; rise, tread = H / n, L / n
    objs = []
    for i in range(n):
        u0, u1 = s0 + tread * i, s0 + tread * (i + 1)
        zt = z0 + rise * (i + 1)
        lo, hi = min(u0, u1), max(u0, u1)
        if axis == 'x':
            objs.append(box(f'{sid}_tread', lo, hi + 0.01, a0, a1, zt - 0.045, zt, M[mat], 0.005))
            objs.append(box(f'{sid}_riser', lo, lo + 0.015, a0, a1, zt - rise, zt - 0.045, M['wood'], 0) if L > 0 else box(f'{sid}_riser', hi - 0.015, hi, a0, a1, zt - rise, zt - 0.045, M['wood'], 0))
        else:
            objs.append(box(f'{sid}_tread', a0, a1, lo - 0.01, hi, zt - 0.045, zt, M[mat], 0.005))
    # stringer on the open side + handrail with balusters
    open_a = a0 if axis == 'x' else a0
    for k in range(n):
        u = s0 + L * (k + 0.5) / n; zt = z0 + H * (k + 1) / n
        p = (u, open_a + 0.03, zt + 0.28) if axis == 'x' else (open_a + 0.03, u, zt + 0.28)
        objs.append(cyl(f'{sid}_baluster', p, 0.012, 0.56, M['trim'], 6))
    pa = V((s0, open_a + 0.03, z0 + rise + 0.56)) if axis == 'x' else V((open_a + 0.03, s0, z0 + rise + 0.56))
    pb = V((s1, open_a + 0.03, z1 + 0.56)) if axis == 'x' else V((open_a + 0.03, s1, z1 + 0.56))
    objs.append(K.sweep(f'{sid}_handrail', [pa, pb], lambda t: (0.022, 0.022), nprof=8, mat=M['wood'], cap=True))
    tag(objs, ll_room=room, ll_item='stair')
    # headroom: opening where the tread is closer than `head` below the slab above
    frac = max(0.0, (H - head) / H)
    h0 = s0 + L * frac
    bot = (s0, (a0 + a1) / 2, z0) if axis == 'x' else ((a0 + a1) / 2, s0, z0)
    top = (s1, (a0 + a1) / 2, z1) if axis == 'x' else ((a0 + a1) / 2, s1, z1)
    STAIRS.append(dict(id=sid, bottom=bot, top=top, axis=axis, n=n))
    marker(f'Stair_{sid}', V(bot), ll_type='stair', top_x=top[0], top_y=top[1], top_z=top[2], room=room)
    return (min(h0, s1), max(h0, s1))


def balustrade(name, pts, z, h=0.55):
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        L = math.hypot(xb - xa, yb - ya); n = max(2, int(L / 0.12))
        for k in range(n + 1):
            t = k / n
            cyl(f'{name}_bal', (xa + (xb - xa) * t, ya + (yb - ya) * t, z + h / 2), 0.012, h, M['trim'], 6)
        K.sweep(f'{name}_rail', [V((xa, ya, z + h)), V((xb, yb, z + h))], lambda t: (0.02, 0.02), nprof=8, mat=M['wood'])


# main flights: centre bay, back strip, left -> right, stacked
ca, cb = XI[1]
SY0, SY1 = YB - 0.52, YB
holes = {1: [], 2: [], 3: []}
ms, me = ca + 0.25, cb - 0.35
h = stair('S1', 'x', ms, me, F1, F2, SY0, SY1, room='dining'); holes[1].append((h[0], h[1], SY0, SY1))
h = stair('S2', 'x', ms, me, F2, F3, SY0, SY1, room='sitting'); holes[2].append((h[0], h[1], SY0, SY1))
# attic flight (steep): centre bay back strip, arrives under the centre gable ridge
h = stair('S3', 'x', ca + 0.02, X(1245) + 0.40, F3, F4, SY0, SY1, n=10, room='study'); holes[3].append((h[0], h[1], SY0, SY1))
# loft flight: Laila's room, right wall, back (bottom) -> front (top)
ra, rb = XI[2][1] - 0.52, XI[2][1] - 0.02
h = stair('S4', 'y', YB - 0.20, 0.62, F3, F4, ra, rb, n=10, room='laila'); holes[3].append((ra, rb, h[0], h[1]))
slab_with_holes('floorF1', F1, POSTS[0] - 0.16, POSTS[3] + 0.16, 0, D, [], M['floor'])
for lvl, z in ((1, F2), (2, F3), (3, F4)):
    slab_with_holes(f'floorF{lvl + 1}', z, POSTS[0] - 0.16, POSTS[3] + 0.16, 0, D, holes[lvl], M['floor'], M['ceil'])
for lvl, z in ((1, F2), (2, F3)):
    (x0h, x1h, y0h, y1h), = holes[lvl]
    balustrade(f'rail{lvl}', [(x0h, y0h), (x1h, y0h)], z); balustrade(f'railE{lvl}', [(x0h, y0h), (x0h, y1h)], z)
(x0h, x1h, y0h, y1h) = holes[3][0]
balustrade('railA', [(x0h, y0h), (x1h, y0h)], F4); balustrade('railAE', [(x0h, y0h), (x0h, y1h)], F4)
(x0h, x1h, y0h, y1h) = holes[3][1]
balustrade('railL', [(x0h, y0h), (x0h, y1h), (x1h, y1h)], F4)


# ---------------- walls: back walls, outer wall linings, partitions with doors
def finishes(name, x0, x1, y_face, z0, z1, wp, sgn=-1):
    """Wallpaper + wainscot + chair rail + crown + skirting on a wall whose room-side face is at y_face (back wall)."""
    box(f'{name}_wp', x0, x1, y_face, y_face + 0.01, z0, z1, M[wp], 0, 0.9)
    box(f'{name}_wain', x0, x1, y_face - 0.02, y_face, z0, z0 + 0.42, M['wain'], 0)
    box(f'{name}_rail', x0, x1, y_face - 0.04, y_face, z0 + 0.42, z0 + 0.47, M['trim'], 0.005)
    box(f'{name}_crown', x0, x1, y_face - 0.06, y_face, z1 - 0.1, z1, M['trim'], 0.01)
    box(f'{name}_skirt', x0, x1, y_face - 0.04, y_face, z0, z0 + 0.1, M['trim'], 0.005)


def side_finishes(name, x_face, sgn, y0, y1, z0, z1, wp, gaps=()):
    """Same on a side wall (room side at x_face, room toward sgn*x). gaps: [(y0, y1, z_top)] door openings."""
    segs = [(y0, y1)]
    for g0, g1, _ in gaps:
        segs = [s for a, b in segs for s in ((a, g0), (g1, b)) if True]
    segs = [(a, b) for a, b in segs if b - a > 0.01]
    xa, xb = (x_face, x_face + 0.01 * sgn)
    for a, b in segs:
        box(f'{name}_wp', min(xa, xb), max(xa, xb), a, b, z0, z1, M[wp], 0, 0.9)
        box(f'{name}_wain', min(x_face, x_face + 0.02 * sgn), max(x_face, x_face + 0.02 * sgn), a, b, z0, z0 + 0.42, M['wain'], 0)
        box(f'{name}_skirt', min(x_face, x_face + 0.04 * sgn), max(x_face, x_face + 0.04 * sgn), a, b, z0, z0 + 0.1, M['trim'], 0.005)
    for g0, g1, zt in gaps:   # lintel wallpaper above the door + architrave
        box(f'{name}_wpL', min(xa, xb), max(xa, xb), g0, g1, zt, z1, M[wp], 0, 0.9)
        for yy in (g0, g1):
            box(f'{name}_arch', min(x_face, x_face + 0.03 * sgn), max(x_face, x_face + 0.03 * sgn), yy - 0.03, yy + 0.03, z0, zt + 0.05, M['trim'], 0.005)
        box(f'{name}_archT', min(x_face, x_face + 0.03 * sgn), max(x_face, x_face + 0.03 * sgn), g0 - 0.03, g1 + 0.03, zt, zt + 0.06, M['trim'], 0.005)


DOORS = []


def door(did, x, y_hinge, y_free, z0, open_deg=170.0, rooms=('', '')):   # exported folded back against the wall
    """Hinged door leaf in a partition at x. Object origin = hinge; rotation about Z opens it (exported open)."""
    w = abs(y_free - y_hinge); sgn = 1 if y_free > y_hinge else -1
    bm_objs = []
    leaf = box(f'Door_{did}', -0.02, 0.02, 0 if sgn > 0 else -w, w if sgn > 0 else 0, 0, DH - 0.02, M['wood'], 0.006)
    for zz in (0.25, 0.85):   # raised panels
        p = box(f'Door_{did}_panel', -0.03, 0.03, (0.08 if sgn > 0 else -w + 0.08), (w - 0.08 if sgn > 0 else -0.08), zz, zz + 0.32, M['woodLight'], 0.004)
        bm_objs.append(p)
    knob = K.ellipsoid(f'Door_{did}_knob', V((0.0, sgn * (w - 0.07), 0.6)), (0.05, 0.02, 0.02), mat=M['brass'], nu=10, nv=6)
    bm_objs.append(knob)
    for o in bm_objs:   # merge into the leaf so the whole door rotates as one node
        o.select_set(False)
    import bmesh as _bm
    bm = _bm.new(); bm.from_mesh(leaf.data)
    for o in bm_objs:
        bm.from_mesh(o.data); bpy.data.objects.remove(o)
    bm.to_mesh(leaf.data); bm.free()
    leaf.data.materials.append(M['woodLight']); leaf.data.materials.append(M['brass'])
    leaf.location = (x, y_hinge, z0)
    leaf.rotation_euler = (0, 0, math.radians(open_deg) * (-sgn))
    leaf['ll_type'] = 'door'; leaf['ll_open_deg'] = open_deg; leaf['ll_rooms'] = '|'.join(rooms)
    DOORS.append(dict(id=did, x=x, y=(y_hinge + y_free) / 2, z=z0, rooms=rooms))
    return leaf


for lvl in range(3):
    z0, z1 = FLOORS[lvl], FLOORS[lvl + 1] - 0.12
    for bay in range(3):
        rid, _, _, title, wp = RID_OF[(lvl, bay)]
        x0, x1 = XI[bay]
        finishes(f'{rid}_back', x0, x1, YB, z0, z1, wp)
        marker(f'Room_{rid}', V(((x0 + x1) / 2, 1.2, z0 + 0.8)), ll_type='room', title=title, level=lvl, w=x1 - x0, d=YB, h=z1 - z0, z0=z0,
               x0=x0, x1=x1)
        empty(f'Light_{rid}', ((x0 + x1) / 2, D * 0.45, z1 - 0.45))
    # outer wall linings
    side_finishes(f'{RID_OF[(lvl, 0)][0]}_sideL', XI[0][0], 1, 0, YB, z0, z1, RID_OF[(lvl, 0)][4])
    side_finishes(f'{RID_OF[(lvl, 2)][0]}_sideR', XI[2][1], -1, 0, YB, z0, z1, RID_OF[(lvl, 2)][4])
    # partitions (structural core + both linings, door opening near the front) + doors
    for pi, px in ((1, POSTS[1]), (2, POSTS[2])):
        la, rb_ = RID_OF[(lvl, pi - 1)], RID_OF[(lvl, pi)]
        for a, b in ((0.12, DY0), (DY1, YB)):
            box('partition', px - 0.03, px + 0.03, a, b, z0, z1, M['trimDark'], 0)
        box('partitionLintel', px - 0.03, px + 0.03, DY0, DY1, z0 + DH, z1, M['trimDark'], 0)
        side_finishes(f'{la[0]}_partR', px - 0.03, -1, 0.12, YB, z0, z1, la[4], gaps=[(DY0, DY1, z0 + DH)])
        side_finishes(f'{rb_[0]}_partL', px + 0.03, 1, 0.12, YB, z0, z1, rb_[4], gaps=[(DY0, DY1, z0 + DH)])
        door(f'{la[0]}_{rb_[0]}', px, DY1, DY0 + 0.02, z0, rooms=(la[0], rb_[0]))
    marker(f'Floor_{lvl + 1}', V((0.0, 1.2, (z0 + z1) / 2)), ll_type='floor', level=lvl, w=WING[1] - WING[0], h=z1 - z0 + 0.3)

# ---------------- attic: centre-gable landing, open loft, sealed left-gable storage
gxC, apC = X(1245), Z(625)
_hwC = (X(1310) - X(1180)) / 2 + 0.05
def roofC(x):
    return apC + 0.05 - abs(x - gxC) * (apC + 0.05 - (EAVE_Z - 0.02)) / (_hwC + 0.12)
ACX0, ACX1 = X(1192), X(1298)
poly('attic_c_back', [(ACX0, YB, F4), (ACX1, YB, F4), (ACX1, YB, roofC(ACX1) - 0.04), (gxC, YB, apC - 0.06), (ACX0, YB, roofC(ACX0) - 0.04)], M['wp_cream'], 0.02, 0.9)
for xx in (ACX0, ACX1):
    box('attic_c_side', xx - 0.02, xx + 0.02, 0, YB, F4, roofC(xx) - 0.03, M['wp_cream'], 0, 0.9)
window(X(1237), F4 + 0.30, 0.42, 0.62, YB - 0.01)
marker('Room_attic_c', V((gxC, 1.0, F4 + 0.6)), ll_type='room', title='Attic landing (centre gable)', level=3, w=ACX1 - ACX0, d=YB, h=apC - F4, z0=F4,
       x0=ACX0, x1=ACX1)
empty('Light_attic_c', (gxC, 1.0, F4 + 1.0))
LX0, LX1, LY1 = X(1300), X(1410), 1.85
for xx in (LX0, LX1):
    box('loft_side', xx - 0.03, xx + 0.03, 0, LY1, F4, Z(668), M['wp_sage'], 0, 0.9)
box('loft_knee', LX0, LX1, LY1, LY1 + 0.04, F4, F4 + 0.62, M['wp_sage'], 0, 0.9)
marker('Room_loft', V(((LX0 + LX1) / 2, 0.9, F4 + 0.5)), ll_type='room', title='Loft playroom', level=3, w=LX1 - LX0, d=LY1, h=Z(668) - F4, z0=F4, x0=LX0, x1=LX1)
empty('Light_loft', ((LX0 + LX1) / 2, 0.9, F4 + 0.85))
marker('Floor_4', V((0.0, 1.0, F4 + 0.7)), ll_type='floor', level=3, w=WING[1] - WING[0], h=1.9)
empty('Light_attic_l', (X(1137), 0.8, F4 + 0.6))
marker('Room_attic_l', V((X(1137), 0.8, F4 + 0.5)), ll_type='room', title='Storage + window seat (left gable, sealed)', level=3, w=1.8, d=1.6, h=1.2, z0=F4,
       x0=X(1090), x1=X(1188), walkable=0)


# ---------------- furniture kit additions (blockout shapes; upgraded in H3 rounds)
def sofa(x, y, z, mat='sofa'):
    bx('sofa_seat', (x, y, z + 0.30), (1.0, 0.48, 0.2), M[mat], 0.06); bx('sofa_back', (x, y + 0.2, z + 0.58), (1.0, 0.12, 0.42), M[mat], 0.06)
    for sx in (-0.47, 0.47):
        bx('sofa_arm', (x + sx, y, z + 0.45), (0.1, 0.48, 0.22), M[mat], 0.05)
    for sx in (-0.42, 0.42):
        for sy in (-0.18, 0.18):
            cyl('sofa_leg', (x + sx, y + sy, z + 0.1), 0.025, 0.2, M['wood'], 8)


def fireplace(x, y, z):
    bx('fireplace', (x, y, z + 0.55), (1.0, 0.36, 1.1), M['wood'], 0.02)
    bx('firebox', (x, y - 0.19, z + 0.35), (0.5, 0.02, 0.45), M['iron'], 0)
    K.ellipsoid('flames', V((x, y - 0.17, z + 0.3)), (0.16, 0.05, 0.13), mat=M['fire'], nu=12, nv=8)
    empty('Light_fire', (x, y - 0.45, z + 0.35))
    bx('mantel', (x, y + 0.01, z + 1.12), (1.2, 0.42, 0.06), M['woodLight'], 0.01)


def dresser(x, y, z):
    cabinet(x, y, z, 0.7, 0.8, 0.35)
    bx('dresser_hutch', (x, y + 0.08, z + 1.15), (0.66, 0.18, 0.7), M['wood'], 0.01)
    for k in range(3):
        cyl('plate', (x - 0.2 + 0.2 * k, y - 0.0, z + 1.2), 0.08, 0.01, M['pot'], 16)


def range_stove(x, y, z):
    bx('range', (x, y, z + 0.45), (0.7, 0.5, 0.9), M['iron'], 0.02)
    bx('range_top', (x, y, z + 0.91), (0.74, 0.52, 0.03), M['iron'], 0.01)
    for sx in (-0.17, 0.17):
        cyl('burner', (x + sx, y - 0.05, z + 0.93), 0.08, 0.01, M['brass'], 16)
    bx('hood', (x, y + 0.05, z + 1.5), (0.75, 0.45, 0.35), M['trim'], 0.02)


def counter_sink(x, y, z, w=1.0):
    cabinet(x, y, z, w, 0.85, 0.5, 'woodLight')
    bx('counter', (x, y, z + 0.88), (w + 0.04, 0.54, 0.05), M['pot'], 0.01)
    bx('sink_basin', (x - w * 0.25, y, z + 0.9), (0.36, 0.3, 0.04), M['enamel'], 0.01)
    cyl('tap', (x - w * 0.25, y + 0.18, z + 1.0), 0.012, 0.18, M['brass'], 8)
    bx('shelf_wall', (x, y + 0.14, z + 1.45), (w, 0.22, 0.03), M['woodLight'], 0.005)
    for k in range(5):
        cyl('jar', (x - w * 0.4 + k * w * 0.2, y + 0.14, z + 1.53), 0.04, 0.13, M['pot' if k % 2 else 'glass'], 10)


def icebox(x, y, z):
    bx('icebox', (x, y, z + 0.62), (0.55, 0.45, 1.24), M['woodLight'], 0.02)
    for zz in (0.35, 0.95):
        bx('icebox_door', (x, y - 0.23, z + zz), (0.47, 0.02, 0.45), M['wood'], 0.01)
        bx('icebox_latch', (x + 0.18, y - 0.25, z + zz), (0.04, 0.02, 0.08), M['brass'], 0.005)


def wardrobe(x, y, z):
    bx('wardrobe', (x, y, z + 0.8), (0.75, 0.42, 1.6), M['wood'], 0.02)
    for sx in (-0.18, 0.18):
        bx('wardrobe_door', (x + sx, y - 0.215, z + 0.85), (0.34, 0.01, 1.3), M['woodLight'], 0.005)
    bx('wardrobe_crown', (x, y, z + 1.63), (0.8, 0.46, 0.06), M['wood'], 0.01)


def vanity(x, y, z):
    table(x, y, z, 0.6, 0.35, 0.62)
    bx('vanity_mirror', (x, y + 0.15, z + 1.0), (0.4, 0.02, 0.5), M['mirror'], 0.0)
    bx('vanity_frame', (x, y + 0.16, z + 1.0), (0.46, 0.015, 0.56), M['frame'], 0.005)


def tub(x, y, z):
    K.ellipsoid('tub', V((x, y, z + 0.33)), (0.55, 0.26, 0.2), mat=M['enamel'], nu=28, nv=14)
    bx('tub_rim', (x, y, z + 0.48), (1.06, 0.48, 0.04), M['enamel'], 0.02)
    for sx in (-0.42, 0.42):
        for sy in (-0.16, 0.16):
            K.ellipsoid('tub_claw', V((x + sx, y + sy, z + 0.06)), (0.04, 0.04, 0.06), mat=M['brass'], nu=8, nv=6)
    cyl('tub_tap', (x - 0.5, y, z + 0.58), 0.015, 0.2, M['brass'], 8)


def toilet(x, y, z):
    cyl('toilet_bowl', (x, y - 0.05, z + 0.2), 0.16, 0.4, M['enamel'], 16, 0.12)
    bx('toilet_tank', (x, y + 0.14, z + 0.62), (0.34, 0.14, 0.32), M['enamel'], 0.02)
    bx('toilet_seat', (x, y - 0.05, z + 0.41), (0.34, 0.38, 0.03), M['wood'], 0.01)


def pedestal_sink(x, y, z):
    cyl('pedestal', (x, y, z + 0.38), 0.07, 0.76, M['enamel'], 12, 0.05)
    bx('basin', (x, y, z + 0.8), (0.46, 0.34, 0.08), M['enamel'], 0.03)
    bx('mirror', (x, y + 0.16, z + 1.25), (0.38, 0.02, 0.5), M['mirror'], 0.0)
    bx('mirror_frame', (x, y + 0.17, z + 1.25), (0.44, 0.015, 0.56), M['frame'], 0.005)


def towel_rail(x, y, z):
    for sy in (-0.2, 0.2):
        cyl('rail_post', (x, y + sy, z + 0.45), 0.012, 0.9, M['brass'], 8)
    K.sweep('rail_bar', [V((x, y - 0.2, z + 0.85)), V((x, y + 0.2, z + 0.85))], lambda t: (0.012, 0.012), nprof=8, mat=M['brass'])
    bx('towel', (x, y, z + 0.66), (0.03, 0.34, 0.4), M['quilt'], 0.01)


def desk(x, y, z):
    table(x, y, z, 0.8, 0.45, 0.62)
    bx('desk_drawers', (x + 0.25, y, z + 0.45), (0.28, 0.4, 0.3), M['wood'], 0.01)
    for k in range(3):
        bx('desk_book', (x - 0.25 + 0.05 * k, y + 0.1, z + 0.73), (0.04, 0.16, 0.2), BOOKS[k], 0)


def bookshelf(x, y, z, w=0.6, h=1.4):
    bx('bookshelf', (x, y, z + h / 2), (w, 0.3, h), M['wood'], 0.01)
    rr = random.Random(int(abs(x * 100 + z * 10)))
    for r in range(int(h / 0.34)):
        xx = x - w / 2 + 0.05
        while xx < x + w / 2 - 0.06:
            bw = rr.uniform(0.03, 0.05)
            bx('book', (xx + bw / 2, y - 0.04, z + 0.08 + r * 0.34 + 0.12), (bw, 0.2, rr.uniform(0.18, 0.26)), BOOKS[rr.randrange(4)], 0)
            xx += bw + 0.004


def toy_chest(x, y, z):
    bx('toychest', (x, y, z + 0.18), (0.45, 0.3, 0.36), M['toyB'], 0.02)
    bx('toychest_lid', (x, y, z + 0.38), (0.47, 0.32, 0.05), M['toyR'], 0.01)
    K.ellipsoid('ball', V((x + 0.32, y - 0.1, z + 0.08)), (0.08, 0.08, 0.08), mat=M['toyY'], nu=12, nv=8)


def toy_dollhouse(x, y, z):
    bx('mini_house', (x, y, z + 0.2), (0.36, 0.24, 0.4), M['quilt'], 0.01)
    poly('mini_roof', [(x - 0.2, y - 0.13, z + 0.4), (x + 0.2, y - 0.13, z + 0.4), (x, y - 0.13, z + 0.58)], M['toyB'], 0.26)


def window_seat(x, y, z):
    bx('seat_box', (x, y, z + 0.2), (0.8, 0.35, 0.4), M['woodLight'], 0.02)
    bx('seat_cushion', (x, y, z + 0.43), (0.78, 0.33, 0.07), M['rose'], 0.03)


def trunk(x, y, z):
    bx('trunk', (x, y, z + 0.17), (0.5, 0.3, 0.34), M['wood'], 0.02)
    bx('trunk_band', (x, y, z + 0.17), (0.52, 0.31, 0.04), M['brass'], 0.005)


def globe(x, y, z):
    cyl('globe_stand', (x, y, z + 0.35), 0.02, 0.7, M['wood'], 8)
    K.ellipsoid('globe', V((x, y, z + 0.82)), (0.13, 0.13, 0.13), mat=M['toyB'], nu=16, nv=10)


def small_bed(x, y, z, w=0.62, l=1.1, quilt='quilt'):
    bed(x, y, z, w, l, quilt)


# ---------------- dressing per room (walk paths: front band y<0.62 and door openings kept clear)
z = F1
xa0, xa1 = XI[0]; cxl = (xa0 + xa1) / 2
place(fireplace, cxl, YB - 0.18, z, room='living'); picture(cxl, z + 1.45, 0.6, 0.4, YB)
place(armchair, cxl - 0.72, 1.28, z, math.pi - 0.45, room='living'); place(armchair, cxl + 0.72, 1.28, z, math.pi + 0.45, room='living', mat='rose')
place(sofa, xa0 + 0.27, 1.15, z, math.pi / 2, room='living'); place(table, cxl, 1.05, z, room='living', w=0.5, l=0.4, h=0.32)
rug(cxl, 1.2, z, 1.6, 1.3); place(lamp, xa0 + 0.25, YB - 0.3, z, room='living', h=0.9); place(plant, xa1 - 0.25, YB - 0.3, z, room='living')
xc0, xc1 = XI[1]
place(table, 0.02, 1.15, z, room='dining', w=0.8, l=0.55, h=0.62, cloth=True)
for dx in (-0.2, 0.22):
    place(chair, dx, 0.8, z, math.pi, room='dining'); place(chair, dx, 1.52, z, 0.0, room='dining')
place(dresser, xc1 - 0.19, 1.35, z, -math.pi / 2, room='dining'); chandelier(0.02, 1.15, CEIL[0]); rug(0.02, 1.15, z, 1.3, 1.1)
xk0, xk1 = XI[2]
place(counter_sink, xk0 + 0.62, YB - 0.27, z, room='kitchen', w=1.05); place(range_stove, xk1 - 0.45, YB - 0.27, z, room='kitchen')
place(icebox, xk1 - 0.25, 1.2, z, -math.pi / 2, room='kitchen'); place(table, xk0 + 0.75, 1.15, z, room='kitchen', w=0.6, l=0.45, h=0.62)
place(chair, xk0 + 0.75, 0.82, z, math.pi, room='kitchen'); window(xk0 + 0.62, z + 1.0, 0.5, 0.42, YB - 0.01); chandelier((xk0 + xk1) / 2, 1.1, CEIL[0])
z = F2
place(bed, cxl + 0.35, YB - 0.66, z, room='master', w=1.1, l=1.3); place(cabinet, cxl - 0.42, YB - 0.2, z, room='master', w=0.32, h=0.5, d=0.32)
place(lamp, cxl - 0.42, YB - 0.2, z + 0.5, room='master', h=0.42); place(cabinet, cxl + 1.08, YB - 0.2, z, room='master', w=0.3, h=0.5, d=0.32)
place(wardrobe, xa0 + 0.22, YB - 0.42, z, math.pi / 2, room='master'); place(vanity, xa0 + 0.2, 1.05, z, math.pi / 2, room='master')
picture(cxl + 0.35, z + 1.25, 0.5, 0.35, YB); rug(cxl + 0.2, 1.1, z, 1.4, 1.0); chandelier(cxl, 1.1, CEIL[1])
place(armchair, -0.42, 1.2, z, 0.0, room='sitting', mat='rose'); place(armchair, 0.32, 1.25, z, 0.0, room='sitting')
place(table, -0.05, 0.85, z, room='sitting', w=0.42, l=0.36, h=0.36); place(toy_chest, -0.55, 0.62, z, room='sitting')
window(-0.35, z + 0.85, 0.5, 0.5, YB - 0.01); rug(-0.05, 1.05, z, 1.3, 1.0); chandelier(0.02, 1.1, CEIL[1])
place(tub, xk0 + 0.95, YB - 0.3, z, room='bath'); place(pedestal_sink, xk0 + 0.25, YB - 0.22, z, room='bath')
place(toilet, xk1 - 0.25, 1.35, z, -math.pi / 2, room='bath'); place(towel_rail, xk1 - 0.06, 0.75, z, room='bath')
window(xk0 + 0.95, z + 0.95, 0.4, 0.42, YB - 0.01); rug(xk0 + 0.9, 1.3, z, 0.9, 0.6); chandelier((xk0 + xk1) / 2, 1.1, CEIL[1])
z = F3
place(small_bed, xa0 + 0.4, YB - 0.6, z, room='elias', w=0.66, l=1.2); place(desk, cxl + 0.45, YB - 0.25, z, room='elias')
place(chair, cxl + 0.45, YB - 0.62, z, math.pi, room='elias'); place(bookshelf, xa1 - 0.36, 1.45, z, -math.pi / 2, room='elias', w=0.6, h=1.3)
place(lamp, cxl + 0.7, YB - 0.22, z + 0.62, room='elias', h=0.35); window(cxl + 0.45, z + 0.95, 0.5, 0.5, YB - 0.01); rug(cxl, 1.1, z, 1.2, 0.9)
place(desk, 0.1, 1.15, z, room='study'); place(chair, 0.1, 1.5, z, 0.0, room='study'); place(globe, 0.72, 1.6, z, room='study')
bx('study_shelf', (0.55, YB - 0.1, z + 1.25), (0.8, 0.18, 0.03), M['wood'], 0.005); rug(0.1, 1.0, z, 1.2, 0.9); chandelier(0.02, 1.0, CEIL[2])
place(small_bed, xk0 + 0.4, YB - 0.56, z, room='laila', w=0.6, l=1.08, quilt='rose'); place(toy_chest, xk0 + 1.05, YB - 0.2, z, room='laila')
place(toy_dollhouse, xk1 - 0.78, 1.3, z, room='laila'); rug(xk0 + 0.6, 0.95, z, 0.9, 0.7); window(xk0 + 0.4, z + 0.95, 0.45, 0.5, YB - 0.01)
place(lamp, xk0 + 0.95, YB - 0.2, z + 0.36, room='laila', h=0.35)
z = F4
place(chair, gxC - 0.25, 0.75, z, 0.0, room='attic_c'); place(plant, gxC + 0.35, 0.55, z, room='attic_c', s=0.7); rug(gxC, 0.9, z, 0.8, 0.8)
place(trunk, ACX0 + 0.35, 1.2, z, room='attic_c')
place(armchair, LX0 + 0.55, 0.95, z, 0.3, room='loft', mat='linen'); place(plant, LX0 + 1.15, 1.45, z, room='loft', s=1.0)
place(toy_chest, LX0 + 1.2, 0.7, z, room='loft'); rug(LX0 + 0.8, 0.95, z, 1.1, 0.9); place(lamp, LX0 + 0.25, 1.55, z, room='loft', h=0.5)
place(window_seat, X(1137), 0.3, z, room='attic_l'); place(trunk, X(1137) - 0.5, 1.1, z, room='attic_l'); place(trunk, X(1137) + 0.45, 1.2, z, room='attic_l')

# ------------------------------------------------------------------ facade frame
FR = -0.06   # front plane of the trim
for i, px in enumerate(POSTS):
    bx(f'post{i}', (px, -0.02, (F1 + F4) / 2), (0.22, 0.22, F4 - F1 + 0.1), M['trim'], 0.025)
    for fz in FLOORS[:3]:
        bx('postBase', (px, -0.03, fz + 0.1), (0.3, 0.26, 0.2), M['trim'], 0.02)
    for fz in FLOORS[1:]:
        bx('capital', (px, -0.01, fz - 0.06), (0.24, 0.22, 0.08), M['trim'], 0.02)
for fz in FLOORS:
    bx('beam', (0, -0.02, fz - 0.06), (POSTS[3] - POSTS[0] + 0.3, 0.16, 0.18), M['trim'], 0.02)
    bx('beamDentil', (0, -0.08, fz - 0.17), (POSTS[3] - POSTS[0] + 0.2, 0.04, 0.05), M['trimDark'], 0.005)
# spindle frieze under each beam, across every bay
for fz in CEIL:
    for a, b in BAYS:
        x0, x1 = a + 0.14, b - 0.14
        bx('friezeRail', ((x0 + x1) / 2, -0.04, fz - 0.02), (x1 - x0, 0.05, 0.035), M['trim'], 0.005)
        n = int((x1 - x0) / 0.09)
        for k in range(n + 1):
            cyl('spindle', (x0 + (x1 - x0) * k / n, -0.04, fz + 0.04), 0.014, 0.12, M['trim'], 6)
# gingerbread corner brackets at each post/ceiling
for fz in CEIL:
    for i, px in enumerate(POSTS):
        for sgn in (-1, 1):
            if (i == 0 and sgn < 0) or (i == 3 and sgn > 0):
                continue
            pierced('bracket', V((px + sgn * 0.11, -0.05, fz + 0.03)), V((sgn, 0, 0)), V((0, 0, -1)), 0.40, 0.30,
                    spandrel_keep(0.40, 0.30), cell=0.012, thick=0.03)   # round 10: pierced spandrel
# outer side walls (siding)
for xs in (POSTS[0] - 0.1, POSTS[3] + 0.1):
    box('sideWall', xs - 0.06, xs + 0.06, 0, D, F1, F4, M['siding'], 0, 0.8)
box('backWall', POSTS[0] - 0.1, POSTS[3] + 0.1, D, D + 0.08, F1, F4, M['siding'], 0, 0.8)

# side wings: ground-floor porch (railing) + first-floor bay, each with a slate pent roof
for side in (-1, 1):
    xo, xi = (WING[0], POSTS[0] - 0.1) if side < 0 else (WING[1], POSTS[3] + 0.1)
    x0, x1 = min(xo, xi), max(xo, xi)
    wd = 1.5
    box('wingFloor', x0, x1, 0.0, wd, F1 - 0.08, F1, M['floor'], 0, 1.2)
    box('wingBack', x0, x1, wd - 0.06, wd, F1, F3, M['siding'], 0, 0.8)
    box('wingSide', (x0 if side < 0 else x1 - 0.06), (x0 + 0.06 if side < 0 else x1), 0, wd, F1, F2 - 0.1, M['siding'], 0, 0.8)
    # porch railing + posts
    for k in range(9):
        xx = x0 + 0.08 + (x1 - x0 - 0.16) * k / 8
        bx('baluster', (xx, 0.05, F1 + 0.25), (0.035, 0.035, 0.45), M['trim'], 0.005)
    bx('rail', ((x0 + x1) / 2, 0.05, F1 + 0.5), (x1 - x0, 0.07, 0.05), M['trim'], 0.01)
    for xx in (x0 + 0.05, x1 - 0.05):
        bx('wingPost', (xx, 0.05, (F1 + F2) / 2), (0.1, 0.1, F2 - F1), M['trim'], 0.01)
    bx('wingBench', ((x0 + x1) / 2, wd - 0.35, F1 + 0.25), (x1 - x0 - 0.3, 0.35, 0.08), M['woodLight'], 0.01)
    plant((x0 + x1) / 2, wd - 0.35, F1 + 0.3, 0.8)
    empty(f'Light_wing{side}', ((x0 + x1) / 2, 0.7, F2 - 0.4))
    # lower pent roof
    bx('wingFascia', ((x0 + x1) / 2, -0.42, F2 - 0.06), (x1 - x0 + 0.3, 0.06, 0.1), M['trim'], 0.01)
    xo_low = X(1023) if side < 0 else X(1475)
    slab('wingRoof1', [(xo_low, -0.45, F2 - 0.04), (xi, -0.45, F2 + 0.55), (xi, wd, F2 + 0.55), (xo_low, wd, F2 - 0.04)][:: (1 if side > 0 else -1)],
         M['slate'], 0.05, 1.0)
    # upper bay with window
    box('bayFront', x0, x1, -0.02, 0.06, F2 + 0.5, F3, M['siding'], 0, 0.8)
    bx('bayWin', ((x0 + x1) / 2, -0.04, (F2 + F3) / 2 + 0.25), (x1 - x0 - 0.3, 0.03, 0.8), M['glass'], 0.0)
    bx('bayWinFrame', ((x0 + x1) / 2, -0.055, (F2 + F3) / 2 + 0.25), (0.05, 0.03, 0.85), M['trim'], 0.0)
    box('bayWall', (x0 if side < 0 else x1 - 0.06), (x0 + 0.06 if side < 0 else x1), 0, wd, F2 + 0.5, F3, M['siding'], 0, 0.8)
    empty(f'Light_bay{side}', ((x0 + x1) / 2, 0.6, F3 - 0.5))
    xo_up = X(1033) if side < 0 else X(1457)
    slab('wingRoof2', [(xo_up, -0.25, F3 - 0.05), (xi, -0.25, Z(770)), (xi, wd, Z(770)), (xo_up, wd, F3 - 0.05)][:: (1 if side > 0 else -1)],
         M['slate'], 0.05, 1.0)
    # small pediment over the upper wing roof
    pc = (x0 + x1) / 2
    pc = X(1058.3) if side < 0 else X(1445)
    poly('wingPediment', [(x0, -0.27, F3 - 0.05), (x1, -0.27, F3 - 0.05), (pc, -0.27, Z(772))], M['shingle'], 0.04, 0.5)
    for e0 in (x0, x1):
        bargeboard('wingBarge', V((pc, -0.29, Z(772) + 0.02)), V((e0, -0.29, F3 - 0.05)), depth=0.12)
    cyl('wingFinial', (pc, -0.25, Z(767)), 0.03, 0.22, M['trim'], 8, 0.01)
    K.ellipsoid('wingFinialBall', V((pc, -0.25, Z(763.5))), (0.035, 0.035, 0.035), mat=M['trim'], nu=8, nv=6)

# ------------------------------------------------------------------ roof
RID = Z(656.5)         # main ridge (round 7: measured)
OV = 0.3               # eave overhang (front)
xL, xR = X(1060), X(1437)   # round 7: measured eave ends
HIP_L, HIP_R = X(1090), X(1415)   # ridge ends / hip tops (measured end finials)
# main roof: front slope only over the parts not covered by the cross gables / attic opening, plus back slope
slab('roofBack', [(xL, D + OV, EAVE_Z), (xR, D + OV, EAVE_Z), (HIP_R, D * 0.45, RID), (HIP_L, D * 0.45, RID)], M['slate'], 0.06, 1.0)
# hip ends
slab('roofHipL', [(xL, -OV, EAVE_Z), (xL, D + OV, EAVE_Z), (HIP_L, D * 0.45, RID), (HIP_L, D * 0.45 - 0.001, RID)], M['slate'], 0.06, 1.0)
slab('roofHipR', [(xR, D + OV, EAVE_Z), (xR, -OV, EAVE_Z), (HIP_R, D * 0.45 - 0.001, RID), (HIP_R, D * 0.45, RID)], M['slate'], 0.06, 1.0)


def front_slope(x0, x1, z_lo, z_hi, y_lo=-OV, y_hi=D * 0.45):
    slab('roofFront', [(x1, y_lo, z_lo), (x0, y_lo, z_lo), (x0, y_hi, z_hi), (x1, y_hi, z_hi)], M['slate'], 0.06, 1.0)


# main front slope (visible behind/between the gables), cut open above the right attic room
yR = D * 0.45
def slope_z(y):
    return EAVE_Z + (RID - EAVE_Z) * (y + OV) / (yR + OV)
slab('roofFrontHipL', [(HIP_L, D * 0.45, RID), (xL, -OV, EAVE_Z), (xL, -OV, EAVE_Z - 0.001), (HIP_L, D * 0.45 + 0.001, RID)], M['slate'], 0.06, 1.0)
y_open = (Z(668) - EAVE_Z) / (RID - EAVE_Z) * (yR + OV) - OV   # slope y at the attic-room top
front_slope(X(1295) - 0.02, xR, Z(668), RID, y_lo=y_open, y_hi=yR)
front_slope(X(1410), xR, EAVE_Z, Z(668), y_lo=-OV, y_hi=y_open)   # thin return right of the opening
box('atticLintel', X(1295) - 0.05, X(1410) + 0.05, y_open - 0.1, y_open + 0.05, Z(668) - 0.12, Z(668), M['trim'], 0.01)
for xx in (X(1295), X(1410)):
    box('atticJamb', xx - 0.06, xx + 0.06, -0.12, 0.05, F4, Z(668), M['trim'], 0.01)
box('atticSill', X(1295), POSTS[3], -0.1, 0.05, F4 - 0.02, F4 + 0.12, M['trim'], 0.01)
# cross gables: (centre x, half width, apex z, depth)
FINIAL_TOP = {}
GABLES = [(X(1137), (X(1195) - X(1060)) / 2 + 0.05, Z(645), 'L'), (X(1245), (X(1310) - X(1180)) / 2 + 0.05, Z(625), 'C')]
# round 8 (LL-034): where the left gable's right plane meets the centre gable's left plane. The board shows the left
# gable in front: its right bargeboard runs unbroken to its foot and the centre gable's left side stops on it.
_gl, _gc = GABLES[0], GABLES[1]
_bz = EAVE_Z + 0.03
def _line(gx, hw, apex, sgn, ext, dz_top, dz_foot):   # z(x) of a gable edge line
    x0, z0 = gx, apex + dz_top; x1, z1 = gx + sgn * (hw + ext), _bz + dz_foot
    return lambda x: z0 + (z1 - z0) * (x - x0) / (x1 - x0)
_zl = _line(_gl[0], _gl[1], _gl[2], 1, 0.12, 0.05, -0.05); _zc = _line(_gc[0], _gc[1], _gc[2], -1, 0.12, 0.05, -0.05)
X_VALLEY = next(x for x in [ _gl[0] + i * 0.001 for i in range(4000)] if _zl(x) <= _zc(x))
Z_VALLEY = _zl(X_VALLEY)
for gx, hw, apex, tag in GABLES:
    base = EAVE_Z + 0.03   # round 7: gable feet on the eave line (measured)
    for sgn in (-1, 1):  # two roof planes of the gable, running back to the main roof
        e = (gx + sgn * (hw + 0.12), base - 0.05)
        if tag == 'C' and sgn < 0:
            e = (X_VALLEY, Z_VALLEY)      # clipped at the valley (no X crossing)
        yb_ = D + OV if tag == 'C' else D * 0.6   # round 9: centre gable runs the full depth (attic stair headroom)
        corners = [(gx, -OV - 0.05, apex + 0.05), (e[0], -OV - 0.05, e[1]), (e[0], yb_, e[1]), (gx, yb_, apex + 0.05)]
        slab(f'gableRoof{tag}{sgn}', corners if sgn < 0 else corners[::-1], M['slate'], 0.06, 1.0)
    # shingled gable face, recessed a little
    GF = -OV - 0.02 if tag == 'L' else -0.05   # round 10: left gable face projects in front of the main slope
    tri = [(gx - hw, GF, base), (gx + hw, GF, base), (gx, GF, apex - 0.05)]
    if tag == 'L':
        poly(f'gableFace{tag}', tri, M['shingle'], 0.05, 0.5)
        # arched attic window
        wx, wz = X(1137), Z(697)   # round 7: measured
        bx('gWinGlass', (wx, GF - 0.03, wz), (0.42, 0.02, 0.6), M['shade'], 0)
        bx('gWinFrame', (wx, GF - 0.05, wz - 0.32), (0.55, 0.06, 0.06), M['trim'], 0.01)
        for dx in (-0.23, 0, 0.23):
            bx('gWinBar', (wx + dx, GF - 0.05, wz), (0.05, 0.05, 0.62), M['trim'], 0.005)
        K.ellipsoid('gWinArch', V((wx, GF - 0.05, wz + 0.3)), (0.28, 0.04, 0.12), mat=M['trim'], nu=16, nv=8)
        empty('Light_gableL', (wx, 0.5, wz))
    else:
        # centre gable is open: frame its opening with a shingled band above the room
        # face triangle above the open attic room, bounded by its own roof lines (round 8b)
        _xl = gx - (apex - Z(650)) * hw / (apex - base); _xr = gx + (apex - Z(650)) * hw / (apex - base)
        poly(f'gableFace{tag}', [(_xl, -0.05, Z(650)), (_xr, -0.05, Z(650)), (gx, -0.05, apex - 0.05)], M['shingle'], 0.05, 0.5)
    # bargeboards with fretwork drops, finial
    for sgn in (-1, 1):
        a = V((gx, -OV - 0.1, apex + 0.08)); b = V((gx + sgn * (hw + 0.14), -OV - 0.1, base - 0.08))
        if tag == 'C' and sgn < 0:   # stop on the left gable's bargeboard
            b = a + (b - a) * ((a.x - X_VALLEY) / (a.x - b.x))
        bargeboard(f'barge{tag}{sgn}', a, b)   # round 10: pierced fretwork
    fh = 0.40 if tag == 'L' else 0.15            # round 7: measured finial heights above the apex
    cyl('finial', (gx, -OV - 0.1, apex + fh * 0.45), 0.04, fh * 0.9, M['trim'], 8, 0.015)
    K.ellipsoid('finialBall', V((gx, -OV - 0.1, apex + fh - 0.05)), (0.05, 0.05, 0.05), mat=M['trim'], nu=10, nv=8)
    FINIAL_TOP[tag] = apex + fh
# main front slope only behind the left gable (round 8b): it used to run through the centre-gable attic room
front_slope(xL, X_VALLEY, EAVE_Z, RID)
# cresting along the main ridge + end finials
for k in range(26):
    xx = HIP_L + (HIP_R - HIP_L) * k / 25
    cyl('crest', (xx, D * 0.45, RID + 0.1), 0.015, 0.2, M['trim'], 6)
    K.ellipsoid('crestBall', V((xx, D * 0.45, RID + 0.22)), (0.03, 0.03, 0.03), mat=M['trim'], nu=8, nv=6)
END_FIN = {'L': Z(648) - RID, 'R': Z(630.7) - RID}   # measured end finial heights above the ridge
for xx, tag in ((HIP_L, 'L'), (HIP_R, 'R')):
    h = END_FIN[tag]
    cyl('ridgeFinial', (xx, D * 0.45, RID + h * 0.45), 0.04, h * 0.9, M['trim'], 8, 0.015)
    K.ellipsoid('ridgeFinialBall', V((xx, D * 0.45, RID + h - 0.05)), (0.045, 0.045, 0.05), mat=M['trim'], nu=10, nv=8)
bx('ridgeCap', ((HIP_L + HIP_R) / 2, D * 0.45, RID + 0.01), (HIP_R - HIP_L, 0.12, 0.06), M['trim'], 0.01)
bx('eaveFascia', (0, -OV + 0.02, EAVE_Z - 0.05), (xR - xL, 0.06, 0.14), M['trim'], 0.01)

# ------------------------------------------------------------------ plinth, steps, garden, tabletop
FLOWERS = [K.material('flower_pink', base='#e86aa0', rough=0.6), K.material('flower_white', base='#f6eef0', rough=0.6),
           K.material('flower_magenta', base='#c03070', rough=0.6), K.material('flower_lilac', base='#c890e0', rough=0.6)]
PL_L, PL_R = X(1008), X(1492)   # round 7: measured plinth / flower-bed extents
box('plinth', PL_L, PL_R, -0.35, D + 0.1, -0.02, F1 - 0.08, M['stone'], 0.01, 0.5)
for k in range(3):
    box('step', X(1205), X(1300), -0.35 - 0.16 * (k + 1), -0.35 - 0.16 * k, -0.02, F1 - 0.08 - (F1 - 0.06) * (k + 1) / 4, M['stone'], 0.01, 0.5)
for x0, x1 in ((PL_L, X(1200)), (X(1305), PL_R)):
    box('bed', x0, x1, -0.75, -0.36, -0.02, 0.12, M['beds'], 0.03, 0.5)
    for k in range(int((x1 - x0) / 0.35)):
        xx = x0 + 0.17 + k * 0.35
        K.ellipsoid('shrub', V((xx, -0.55, 0.16)), (0.2, 0.16, 0.14), mat=M['leaf'], nu=12, nv=8)
        for f in range(7):
            fx, fy = xx + rnd.uniform(-0.17, 0.17), -0.55 + rnd.uniform(-0.12, 0.1)
            K.ellipsoid('flower', V((fx, fy, 0.24 + rnd.uniform(0, 0.06))), (0.035, 0.035, 0.03), mat=FLOWERS[f % 4], nu=8, nv=6)
box('tabletop', -9, 9, -4.5, 5, -0.12, -0.02, M['table'], 0, 1.6)

# ------------------------------------------------------------------ measurement landmarks (H0 baseline: on the round-6 model)
def lm(name, p):
    e = bpy.data.objects.new('LM_' + name, None); e.location = p; e.empty_display_size = 0.05
    bpy.context.scene.collection.objects.link(e)


(gxL, hwL, apL, _), (gxC, hwC, apC, _) = GABLES
lm('finial_C_top', (gxC, -OV - 0.1, FINIAL_TOP['C'])); lm('gable_C_apex', (gxC, -OV - 0.1, apC + 0.08))
lm('gable_C_foot_R', (gxC + hwC + 0.14, -OV - 0.1, EAVE_Z + 0.03 - 0.08)); lm('gable_C_window', (gxC, -0.05, Z(690)))
lm('finial_L_top', (gxL, -OV - 0.1, FINIAL_TOP['L'])); lm('gable_L_apex', (gxL, -OV - 0.1, apL + 0.08)); lm('gable_L_window', (X(1137), -OV - 0.07, Z(697)))
lm('finial_end_L_top', (HIP_L, D * 0.45, RID + END_FIN['L'])); lm('finial_end_R_top', (HIP_R, D * 0.45, RID + END_FIN['R'])); lm('ridge_R_end', (HIP_R, D * 0.45, RID))
lm('eave_L', (xL, -OV, EAVE_Z)); lm('eave_R', (xR, -OV, EAVE_Z))
lm('attic_open_TL', (X(1295), y_open, Z(668))); lm('attic_open_BR', (X(1410), -0.1, F4 + 0.12))
for i, px in enumerate(POSTS):
    lm(f'post_{i + 1}_F3', (px, -0.13, F3 - 0.06)); lm(f'post_{i + 1}_F2', (px, -0.13, F2 - 0.06))
lm('ground_C', (X(1255), -0.1, F1))
for side, nm in ((-1, 'wingL'), (1, 'wingR')):
    xo = WING[0] if side < 0 else WING[1]
    lm(f'{nm}_finial', (X(1058.3) if side < 0 else X(1445), -0.25, Z(763.5) + 0.035))
    lm(f'{nm}_upper_eave', (X(1033) if side < 0 else X(1457), -0.25, F3 - 0.05))
    lm(f'{nm}_lower_eave', (X(1023) if side < 0 else X(1475), -0.45, F2 - 0.04)); lm(f'{nm}_rail_top', (xo, 0.05, F1 + 0.5))
lm('plinth_L', (PL_L, -0.75, 0.12)); lm('plinth_R', (PL_R, -0.75, 0.12)); lm('plinth_bottom_C', (X(1256.7), -0.83, -0.02))

for o in bpy.context.scene.objects:
    if o.data:
        o.data.name = o.name
K.export_glb(OUT)
tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects if o.data for p in o.data.polygons)
print('EXPORTED', OUT, 'objects', len(bpy.context.scene.objects), 'tris', tris)
