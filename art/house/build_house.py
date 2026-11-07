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
    ('planks', TX.planks, {}), ('slate', TX.slate, {}), ('siding', TX.siding, {}),
    ('shingle', TX.siding, dict(base=(214, 204, 188), scallop=True)), ('beds', TX.flowerbed, {}),
]:
    p = os.path.join(TEX, name + '.png'); fn(p, **args); T[name] = p

M = dict(
    trim=K.material('trim_cream', base='#efe4cf', rough=0.55),
    trimDark=K.material('trim_shadow', base='#d8ccb4', rough=0.6),
    slate=K.material('roof_slate', tex=T['slate'], rough=0.6),
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


# ------------------------------------------------------------------ room shells
def room(name, x0, x1, z0, z1, wp, d=D, back_window=True):
    zc = z1
    box(f'{name}_floor', x0, x1, 0, d, z0 - 0.08, z0, M['floor'], 0, 1.2)
    box(f'{name}_back', x0, x1, d - WALL, d, z0, zc, M[wp], 0, 0.9)
    box(f'{name}_wainB', x0, x1, d - WALL - 0.02, d - WALL, z0, z0 + 0.42, M['wain'], 0)
    box(f'{name}_chairrail', x0, x1, d - WALL - 0.04, d - WALL, z0 + 0.42, z0 + 0.47, M['trim'], 0.005)
    box(f'{name}_crown', x0, x1, d - WALL - 0.06, d - WALL, zc - 0.1, zc, M['trim'], 0.01)
    box(f'{name}_base', x0, x1, d - WALL - 0.04, d - WALL, z0, z0 + 0.1, M['trim'], 0.005)
    for xs, xe, sgn in ((x0, x0 + WALL, 1), (x1 - WALL, x1, -1)):
        box(f'{name}_side', xs, xe, 0, d, z0, zc, M[wp], 0, 0.9)
        xi = xe if sgn > 0 else xs
        box(f'{name}_wainS', min(xi, xi + 0.02 * sgn), max(xi, xi + 0.02 * sgn), 0, d - WALL, z0, z0 + 0.42, M['wain'], 0)
    box(f'{name}_ceil', x0, x1, 0, d, zc - 0.02, zc, M['ceil'], 0)
    empty(f'Light_{name}', (0.5 * (x0 + x1), d * 0.45, zc - 0.45))
    return 0.5 * (x0 + x1)


BOOKS = [K.material(f'book_{i}', base=c, rough=0.6) for i, c in enumerate(['#7a2a2a', '#2a4a6a', '#3a5a2a', '#a07a3a'])]
F1, F2, F3, F4 = FLOORS
CEIL = [F2 - 0.12, F3 - 0.12, F4 - 0.12]
BAYS = [(POSTS[0], POSTS[1]), (POSTS[1], POSTS[2]), (POSTS[2], POSTS[3])]
WPS = [['wp_gold', 'wp_rose', 'wp_cream'], ['wp_rose', 'wp_gold', 'wp_sage'], ['wp_cream', 'wp_gold', 'wp_rose']]
for fi in range(3):
    for bi, (a, b) in enumerate(BAYS):
        z0, z1 = FLOORS[fi], CEIL[fi]
        cx = room(f'R{fi}{bi}', a, b, z0, z1, WPS[fi][bi])
        h = z1 - z0
        w = b - a
        if bi != 1:
            chandelier(cx, 1.1, z1)
        for sx, xw in ((1, a + WALL + 0.02), (-1, b - WALL - 0.02)):   # pictures on the side walls
            for k, zz in enumerate((z0 + 1.05, z0 + 1.35)):
                bx('sidePic', (xw + sx * 0.015, 0.9 + 0.5 * k, zz), (0.03, 0.3 - 0.08 * k, 0.24), M['frame'], 0.005)
        if bi == 0 or (fi == 0 and bi == 1):  # bookshelf with books
            sx0 = b - 0.55 if bi == 0 else a + 0.3
            bx('shelf', (sx0, D - 0.22, z0 + 0.75), (0.5, 0.3, 1.5), M['wood'], 0.01)
            for r in range(4):
                xx = sx0 - 0.21
                while xx < sx0 + 0.2:
                    bw = rnd.uniform(0.03, 0.05)
                    bx('book', (xx + bw / 2, D - 0.26, z0 + 0.2 + r * 0.34 + 0.12), (bw, 0.2, rnd.uniform(0.18, 0.26)), BOOKS[rnd.randrange(4)], 0)
                    xx += bw + 0.004
        if fi == 0 and bi == 0:   # living room: fireplace + armchairs
            bx('fireplace', (cx, D - 0.25, z0 + 0.55), (1.0, 0.36, 1.1), M['wood'], 0.02)
            bx('firebox', (cx, D - 0.44, z0 + 0.35), (0.5, 0.02, 0.45), M['iron'], 0)
            K.ellipsoid('flames', V((cx, D - 0.42, z0 + 0.3)), (0.16, 0.05, 0.13), mat=M['fire'], nu=12, nv=8)
            empty('Light_fire', (cx, D - 0.7, z0 + 0.35))
            bx('mantel', (cx, D - 0.24, z0 + 1.12), (1.2, 0.42, 0.06), M['woodLight'], 0.01)
            picture(cx, z0 + 1.45, 0.6, 0.4)
            armchair(cx - 0.75, 0.9, z0); armchair(cx + 0.78, 1.0, z0, 'rose')
            table(cx, 0.9, z0, 0.5, 0.4, 0.32); rug(cx, 1.1, z0, 1.6, 1.3)
            lamp(a + 0.3, D - 0.5, z0 + 0.0, 0.9); plant(b - 0.25, D - 0.35, z0)
        elif fi == 0 and bi == 1:  # dining
            table(cx, 1.2, z0, 1.1, 0.7, 0.62, cloth=True)
            for dx in (-0.35, 0.35):
                chair(cx + dx, 1.7, z0, 0); chair(cx + dx, 0.72, z0, 1)
            window(cx, z0 + 0.8, 0.8, 0.8); chandelier(cx, 1.2, z1)
            cabinet(a + 0.35, D - 0.3, z0, 0.5, 1.2); rug(cx, 1.2, z0, 1.5, 1.4)
            lamp(b - 0.3, D - 0.35, z0 + 0.8, 0.5); cabinet(b - 0.3, D - 0.35, z0, 0.45, 0.8)
        elif fi == 0 and bi == 2:  # kitchen
            cabinet(cx - 0.2, D - 0.3, z0, w - 0.5, 0.85, 0.5, 'woodLight')
            bx('counter', (cx - 0.2, D - 0.3, z0 + 0.88), (w - 0.45, 0.55, 0.05), M['pot'], 0.01)
            bx('range', (cx + 0.35, D - 0.33, z0 + 0.45), (0.7, 0.55, 0.9), M['iron'], 0.02)
            bx('hood', (cx + 0.35, D - 0.3, z0 + 1.45), (0.75, 0.5, 0.4), M['trim'], 0.02)
            cabinet(cx - 0.4, D - 0.2, z0 + 1.2, 0.8, 0.5, 0.3, 'woodLight')
            window(cx - 0.45, z0 + 1.0, 0.5, 0.6); table(cx - 0.3, 0.9, z0, 0.6, 0.5, 0.62)
            plant(cx - 0.3, 0.9, z0 + 0.65, 0.5); cabinet(a + 0.3, 1.0, z0, 0.4, 0.85, 0.5, 'woodLight')
        elif bi == 0:              # bedrooms (left)
            bed(cx + 0.05, D - 0.8, z0, 1.0, 1.3)
            lamp(cx - 0.75, D - 0.4, z0 + 0.5, 0.45); cabinet(cx - 0.75, D - 0.4, z0, 0.4, 0.5)
            lamp(cx + 0.8, D - 0.4, z0 + 0.5, 0.45); cabinet(cx + 0.8, D - 0.4, z0, 0.4, 0.5)
            picture(cx, z0 + 1.25, 0.5, 0.35); rug(cx, 1.0, z0, 1.4, 1.0)
            chair(a + 0.35, 0.8, z0, 0, 'sofa')
            if fi == 2:
                cabinet(a + 0.4, D - 0.25, z0, 0.6, 1.5, 0.3)  # bookcase
        elif bi == 1:              # sitting rooms
            window(cx, z0 + 0.75, 0.75, 0.75); armchair(cx - 0.55, 1.0, z0, 'rose'); armchair(cx + 0.55, 1.0, z0)
            table(cx, 0.9, z0, 0.45, 0.4, 0.4); chandelier(cx, 1.1, z1); picture(a + 0.35, z0 + 1.1, 0.3, 0.3)
            plant(b - 0.28, D - 0.35, z0)
        else:                      # right rooms
            if fi == 1:
                cabinet(cx, D - 0.3, z0, w - 0.5, 0.9); window(cx + 0.3, z0 + 1.0, 0.5, 0.55)
                table(cx - 0.3, 0.9, z0, 0.7, 0.5, 0.7); chair(cx - 0.3, 0.45, z0, 1); lamp(cx + 0.5, 0.9, z0 + 0.0, 0.85)
            else:
                bed(cx, D - 0.85, z0, 1.1, 1.3, 'linen'); window(cx, z0 + 0.9, 0.6, 0.6, D - WALL / 2)
                lamp(b - 0.3, D - 0.4, z0 + 0.5, 0.45); cabinet(b - 0.3, D - 0.4, z0, 0.4, 0.5); chair(a + 0.35, 0.8, z0, 0, 'rose')

# ------------------------------------------------------------------ attic rooms
# centre gable attic room (with arched window) and right attic room (open under the roof)
ga, gb = X(1180), X(1310)
room('A_centre', ga + 0.1, gb - 0.1, F4, Z(650), 'wp_cream', d=D * 0.8)
window(0.5 * (ga + gb), F4 + 0.5, 0.5, 0.75, D * 0.8 - WALL / 2)
chair(0.5 * (ga + gb) - 0.4, 0.8, F4, 0); table(0.5 * (ga + gb) + 0.2, 0.9, F4, 0.5, 0.4, 0.5)
ra, rb = X(1295), X(1410)
room('A_right', ra, rb, F4, Z(668), 'wp_sage', d=D * 0.8)
armchair(0.5 * (ra + rb) - 0.1, 1.2, F4, 'linen'); plant(rb - 0.35, 1.3, F4, 1.2); picture(0.5 * (ra + rb), F4 + 0.95, 0.5, 0.35, D * 0.8 - WALL / 2)

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
            pts = [(px, -0.04, fz + 0.1), (px + sgn * 0.42, -0.04, fz + 0.1), (px + sgn * 0.42, -0.04, fz + 0.04),
                   (px + sgn * 0.12, -0.04, fz - 0.06), (px + sgn * 0.06, -0.04, fz - 0.3)]
            poly('bracket', pts if sgn > 0 else pts[::-1], M['trim'], 0.03)
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
         M['slate'], 0.05, 0.6)
    # upper bay with window
    box('bayFront', x0, x1, -0.02, 0.06, F2 + 0.5, F3, M['siding'], 0, 0.8)
    bx('bayWin', ((x0 + x1) / 2, -0.04, (F2 + F3) / 2 + 0.25), (x1 - x0 - 0.3, 0.03, 0.8), M['glass'], 0.0)
    bx('bayWinFrame', ((x0 + x1) / 2, -0.055, (F2 + F3) / 2 + 0.25), (0.05, 0.03, 0.85), M['trim'], 0.0)
    box('bayWall', (x0 if side < 0 else x1 - 0.06), (x0 + 0.06 if side < 0 else x1), 0, wd, F2 + 0.5, F3, M['siding'], 0, 0.8)
    empty(f'Light_bay{side}', ((x0 + x1) / 2, 0.6, F3 - 0.5))
    xo_up = X(1033) if side < 0 else X(1457)
    slab('wingRoof2', [(xo_up, -0.25, F3 - 0.05), (xi, -0.25, Z(770)), (xi, wd, Z(770)), (xo_up, wd, F3 - 0.05)][:: (1 if side > 0 else -1)],
         M['slate'], 0.05, 0.6)
    # small pediment over the upper wing roof
    pc = (x0 + x1) / 2
    pc = X(1058.3) if side < 0 else X(1445)
    poly('wingPediment', [(x0, -0.27, F3 - 0.05), (x1, -0.27, F3 - 0.05), (pc, -0.27, Z(772))], M['shingle'], 0.04, 0.5)
    cyl('wingFinial', (pc, -0.25, Z(767)), 0.03, 0.22, M['trim'], 8, 0.01)
    K.ellipsoid('wingFinialBall', V((pc, -0.25, Z(763.5))), (0.035, 0.035, 0.035), mat=M['trim'], nu=8, nv=6)

# ------------------------------------------------------------------ roof
RID = Z(656.5)         # main ridge (round 7: measured)
OV = 0.3               # eave overhang (front)
xL, xR = X(1060), X(1437)   # round 7: measured eave ends
HIP_L, HIP_R = X(1090), X(1415)   # ridge ends / hip tops (measured end finials)
# main roof: front slope only over the parts not covered by the cross gables / attic opening, plus back slope
slab('roofBack', [(xL, D + OV, EAVE_Z), (xR, D + OV, EAVE_Z), (HIP_R, D * 0.45, RID), (HIP_L, D * 0.45, RID)], M['slate'], 0.06, 0.6)
# hip ends
slab('roofHipL', [(xL, -OV, EAVE_Z), (xL, D + OV, EAVE_Z), (HIP_L, D * 0.45, RID), (HIP_L, D * 0.45 - 0.001, RID)], M['slate'], 0.06, 0.6)
slab('roofHipR', [(xR, D + OV, EAVE_Z), (xR, -OV, EAVE_Z), (HIP_R, D * 0.45 - 0.001, RID), (HIP_R, D * 0.45, RID)], M['slate'], 0.06, 0.6)


def front_slope(x0, x1, z_lo, z_hi, y_lo=-OV, y_hi=D * 0.45):
    slab('roofFront', [(x1, y_lo, z_lo), (x0, y_lo, z_lo), (x0, y_hi, z_hi), (x1, y_hi, z_hi)], M['slate'], 0.06, 0.6)


# main front slope (visible behind/between the gables), cut open above the right attic room
yR = D * 0.45
def slope_z(y):
    return EAVE_Z + (RID - EAVE_Z) * (y + OV) / (yR + OV)
front_slope(xL, X(1295) - 0.02, EAVE_Z, RID)
slab('roofFrontHipL', [(HIP_L, D * 0.45, RID), (xL, -OV, EAVE_Z), (xL, -OV, EAVE_Z - 0.001), (HIP_L, D * 0.45 + 0.001, RID)], M['slate'], 0.06, 0.6)
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
for gx, hw, apex, tag in GABLES:
    base = EAVE_Z + 0.03   # round 7: gable feet on the eave line (measured)
    for sgn in (-1, 1):  # two roof planes of the gable, running back to the main roof
        e = (gx + sgn * (hw + 0.12), base - 0.05)
        corners = [(gx, -OV - 0.05, apex + 0.05), (e[0], -OV - 0.05, e[1]), (e[0], D * 0.6, e[1]), (gx, D * 0.6, apex + 0.05)]
        slab(f'gableRoof{tag}{sgn}', corners if sgn < 0 else corners[::-1], M['slate'], 0.06, 0.6)
    # shingled gable face, recessed a little
    tri = [(gx - hw, -0.05, base), (gx + hw, -0.05, base), (gx, -0.05, apex - 0.05)]
    if tag == 'L':
        poly(f'gableFace{tag}', tri, M['shingle'], 0.05, 0.5)
        # arched attic window
        wx, wz = X(1137), Z(697)   # round 7: measured
        bx('gWinGlass', (wx, -0.08, wz), (0.42, 0.02, 0.6), M['shade'], 0)
        bx('gWinFrame', (wx, -0.1, wz - 0.32), (0.55, 0.06, 0.06), M['trim'], 0.01)
        for dx in (-0.23, 0, 0.23):
            bx('gWinBar', (wx + dx, -0.1, wz), (0.05, 0.05, 0.62), M['trim'], 0.005)
        K.ellipsoid('gWinArch', V((wx, -0.1, wz + 0.3)), (0.28, 0.04, 0.12), mat=M['trim'], nu=16, nv=8)
        empty('Light_gableL', (wx, 0.5, wz))
    else:
        # centre gable is open: frame its opening with a shingled band above the room
        poly(f'gableFace{tag}', [(gx - hw, -0.05, Z(650)), (gx + hw, -0.05, Z(650)), (gx, -0.05, apex - 0.05)], M['shingle'], 0.05, 0.5)
    # bargeboards with fretwork drops, finial
    for sgn in (-1, 1):
        a = V((gx, -OV - 0.1, apex + 0.08)); b = V((gx + sgn * (hw + 0.14), -OV - 0.1, base - 0.08))
        dvec = b - a; n = 14
        for k in range(n):
            p = a + dvec * ((k + 0.5) / n)
            cyl('fret', (p.x, p.y, p.z - 0.07), 0.025, 0.12, M['trim'], 6)
        L = dvec.length
        ob = box('barge', -L / 2, L / 2, -0.03, 0.03, -0.06, 0.06, M['trim'], 0.01)
        ob.rotation_euler = (0, -math.atan2(dvec.z, dvec.x), 0)
        ob.location = (a + b) / 2
    fh = 0.40 if tag == 'L' else 0.15            # round 7: measured finial heights above the apex
    cyl('finial', (gx, -OV - 0.1, apex + fh * 0.45), 0.04, fh * 0.9, M['trim'], 8, 0.015)
    K.ellipsoid('finialBall', V((gx, -OV - 0.1, apex + fh - 0.05)), (0.05, 0.05, 0.05), mat=M['trim'], nu=10, nv=8)
    FINIAL_TOP[tag] = apex + fh
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
lm('finial_L_top', (gxL, -OV - 0.1, FINIAL_TOP['L'])); lm('gable_L_apex', (gxL, -OV - 0.1, apL + 0.08)); lm('gable_L_window', (X(1137), -0.1, Z(697)))
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
