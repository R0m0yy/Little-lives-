"""Little Lives — Naomi (mother, 36). Procedural Blender build -> assets/characters/naomi.glb (+ naomi_game.glb)

usage: python3 art/naomi/build_naomi.py [out.glb]
Head + hair are rebuilt from round 26 (art/naomi/head.py, art/naomi/hair.py) against refs/naomi_landmarks.json
through the reference camera (web/lib/refcam.js). Body/outfit unchanged from round 25 (figure height 1.0).
"""
import math, os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector as V, Matrix
import meshkit as K
import textures as TX
import numpy as np
import head as HEAD
import hair as HAIR

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].endswith('.glb') else os.path.join(ROOT, 'assets/characters/naomi.glb')
TEX = os.path.join(ROOT, 'art/naomi/tex')
os.makedirs(TEX, exist_ok=True)

# ------------------------------------------------------------------ parameters (tuned in compare rounds)
P = dict(
    collar_z=0.645, waist_z=0.474, hem_z=0.128, hem_rx=0.235, hem_ry=0.205,
    shoulder=V((0.100, 0.0, 0.598)), elbow=V((0.153, 0.006, 0.456)), wrist=V((0.182, -0.078, 0.346)),
    hand_c=V((0.185, -0.094, 0.322)),   # hands rest on the front-sides of the skirt (round 10: were buried inside it)
)
C = HEAD.H['C']
rnd = random.Random(7)

K.reset()

# ------------------------------------------------------------------ textures
TX.floral(os.path.join(TEX, 'floral.png'))
TX.floral(os.path.join(TEX, 'apron.png'), seed=9, base=(232, 224, 218), density=0.95)   # cooler, lighter apron print
TX.lace(os.path.join(TEX, 'lace.png'))
TX.trim(os.path.join(TEX, 'trim.png'))
TX.weave(os.path.join(TEX, 'weave.png'))
TX.iris2(os.path.join(TEX, 'iris2.png'))
TX.hair_strands(os.path.join(TEX, 'hair_strands.png'), os.path.join(TEX, 'hair_normal.png'))

# ------------------------------------------------------------------ materials (names drive Three.js tuning in web/lib/look.js)
M = dict(
    skin=K.material('skin_face', base='#d6886a', rough=0.55, sheen=0.25, sheen_tint='#ff9a70', spec=0.45),   # texture assigned after painting
    skinPlain=K.material('skin_body', base='#c87a5a', rough=0.55, sheen=0.25, sheen_tint='#ff9a70', spec=0.45),
    eye=K.material('eye', tex=os.path.join(TEX, 'iris2.png'), rough=0.12, spec=0.5),
    cornea=K.material('cornea', base='#ffffff', rough=0.0, transmission=1.0, ior=1.376, spec=0.8),
    lash=K.material('lash', base='#120b0a', rough=0.55),
    lidline=K.material('skin_lidline', base='#8a4a36', rough=0.6),
    hair=K.material('hair', tex=os.path.join(TEX, 'hair_strands.png'), tex_mult='#1b1412', rough=0.38, spec=0.55,
                    normal_tex=os.path.join(TEX, 'hair_normal.png'), normal_strength=0.25),
    bun=K.material('hair_bun', tex=os.path.join(TEX, 'hair_strands.png'), tex_mult='#1e1512', rough=0.40, spec=0.55,
                   normal_tex=os.path.join(TEX, 'hair_normal.png'), normal_strength=0.25),
    blouse=K.material('fabric_blouse', tex=os.path.join(TEX, 'weave.png'), rough=0.85, sheen=0.35, sheen_tint='#f0d8c8', sheen_rough=0.6),
    apron=K.material('fabric_apron', tex=os.path.join(TEX, 'apron.png'), rough=0.8, sheen=0.5, sheen_rough=0.6),
    floral=K.material('fabric_floral', tex=os.path.join(TEX, 'floral.png'), rough=0.8, sheen=0.5, sheen_rough=0.6),
    lace=K.material('fabric_lace', tex=os.path.join(TEX, 'lace.png'), rough=0.85, sheen=0.5),
    trim=K.material('fabric_trim', tex=os.path.join(TEX, 'trim.png'), rough=0.7, sheen=0.4),
    under=K.material('fabric_under', base='#6e2622', rough=0.7, sheen=0.6, sheen_tint='#ffb0a0'),
    tights=K.material('fabric_tights', base='#3e1d10', rough=0.6, sheen=0.5, sheen_tint='#c08060'),
    shoe=K.material('leather_shoe', base='#4a2212', rough=0.34, coat=0.6, coat_rough=0.2),
    pearl=K.material('pearl', base='#f4ece0', rough=0.25, coat=0.8),
    gold=K.material('metal_gold', base='#e0b060', metal=1.0, rough=0.25),
)


# ================================================================== HEAD + HAIR (v2, round 26+)
HINFO = HEAD.build(K, M)
RINFO = HAIR.build(K, M)

# ================================================================== BODY (union of arms + hands + legs + neck)
def arm_parts(sg):
    S, E, W, Hc = [V((sg * v.x, v.y, v.z)) for v in (P['shoulder'], P['elbow'], P['wrist'], P['hand_c'])]
    parts = [K.capsule('ua', S, E, 0.030, 0.024), K.capsule('fa', E, W, 0.023, 0.016)]
    inward = V((-sg, 0, 0))
    parts.append(K.ellipsoid('palm', Hc, (0.0105, 0.020, 0.017), nu=20, nv=14))
    parts.append(K.capsule('wristj', W + (W - Hc).normalized() * 0.006, Hc + V((0, 0, 0.008)), 0.0162, 0.0150))
    kz = Hc.z - 0.013
    for i, (oy, ln) in enumerate([(-0.0150, 0.018), (-0.0050, 0.021), (0.0050, 0.0195), (0.0148, 0.016)]):  # shorter, closer
        k0 = V((Hc.x + inward.x * 0.001, Hc.y + oy, kz))
        mid = k0 + V((inward.x * 0.004, oy * 0.06 - 0.002, -ln * 0.52))      # relaxed: gentle inward + forward curl
        tip = mid + V((inward.x * 0.009, oy * 0.04 - 0.004, -ln * 0.40))
        rr = 0.0047 if i < 3 else 0.0042
        parts.append(K.capsule(f'f{i}a', k0, mid, rr, rr * 0.95, nprof=12, nseg=6))
        parts.append(K.capsule(f'f{i}b', mid, tip, rr * 0.95, rr * 0.82, nprof=12, nseg=6))
    t0 = Hc + V((inward.x * 0.007, -0.017, 0.004))
    t1 = t0 + V((inward.x * 0.008, -0.006, -0.010))
    t2 = t1 + V((inward.x * 0.006, -0.001, -0.008))
    parts += [K.capsule('th1', t0, t1, 0.0062, 0.0055, nprof=12, nseg=6), K.capsule('th2', t1, t2, 0.0055, 0.0048, nprof=12, nseg=6)]
    return parts


for sg in (1, -1):
    arm = K.union(f'Arm{sg}', arm_parts(sg), voxel=0.0011, smooth_iter=3, smooth_factor=0.5, decimate=0.18, mat=M['skinPlain'])
    # round 25: smooth only around the wrist joint (whole-arm smoothing would fuse the fingers again)
    import bmesh
    Wp = V((sg * P['wrist'].x, P['wrist'].y, P['wrist'].z))
    bm = bmesh.new(); bm.from_mesh(arm.data)
    zone = [v for v in bm.verts if (v.co - Wp).length < 0.034 and v.co.z > P['hand_c'].z + 0.002]
    for _ in range(30):
        bmesh.ops.smooth_vert(bm, verts=zone, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    bm.to_mesh(arm.data); bm.free()
    arm.data.update()
    for poly in arm.data.polygons:
        poly.use_smooth = True
legs = []
for sg in (1, -1):
    legs.append(K.capsule('leg', V((sg * 0.050, 0.0, 0.26)), V((sg * 0.047, 0.0, 0.05)), 0.026, 0.018))
K.union('Legs', legs, voxel=0.003, smooth_iter=4, decimate=0.3, mat=M['tights'])
K.subsurf(K.capsule('Neck', V((0, 0.020, 0.715)), V((0, 0.016, 0.620)), 0.031, 0.036), 0)
bpy.data.objects['Neck'].data.materials.append(M['skinPlain'])

# shoes: rounded toe Mary Janes
for sg in (1, -1):
    fc = V((sg * 0.047, -0.016, 0.026))   # round 20: ~30% larger Mary Janes
    parts = [K.ellipsoid('toe', fc + V((0, -0.022, -0.001)), (0.0285, 0.044, 0.025)),
             K.ellipsoid('heel', fc + V((0, 0.022, 0.0)), (0.025, 0.028, 0.026)),
             K.capsule('ank', V((sg * 0.047, 0.004, 0.03)), V((sg * 0.047, 0.004, 0.06)), 0.021, 0.019)]
    sh = K.union(f'Shoe{sg}', parts, voxel=0.0018, smooth_iter=6, decimate=0.3, mat=M['shoe'])
    for v in sh.data.vertices:
        if v.co.z < 0.004:
            v.co.z = 0.0
    # strap
    sp = [V((sg * 0.047 + math.cos(a) * 0.0278, -0.010 + math.sin(a) * 0.005, 0.034 + 0.015 * math.sin(a * 0.5 + 0.8)))
          for a in [math.pi * (i / 15) for i in range(16)]]
    K.sweep(f'ShoeStrap{sg}', sp, lambda t: (0.0042, 0.0021), nprof=8, mat=M['shoe'], up=V((0, -1, 0)))

# ================================================================== CLOTHES
# blouse torso
prof = [(0.044, 0.044, 0.652), (0.060, 0.056, 0.640), (0.083, 0.066, 0.626), (0.097, 0.073, 0.605), (0.098, 0.076, 0.578),
        (0.092, 0.073, 0.545), (0.083, 0.068, 0.512), (0.077, 0.064, 0.488), (0.078, 0.065, 0.455)]
K.subsurf(K.lathe('Blouse', prof, nu=48, mat=M['blouse'], uv_scale=(3, 1)), 1)

# stand collar with a ruffled top edge
def collar(u, v):
    th = u * K.TAU
    z = P['collar_z'] - 0.004 + v * (0.030 + 0.003 * math.sin(th * 14))
    r = 0.046 - 0.004 * v + 0.004 * v * v * math.sin(th * 14)
    return V((math.sin(th) * r, -math.cos(th) * r + 0.006, z))
K.subsurf(K.surface('Collar', collar, 112, 6, wrap_u=True, mat=M['blouse']), 1)
K.subsurf(K.ellipsoid('Brooch', V((0, -0.044, 0.652)), (0.006, 0.003, 0.0075), mat=M['gold'], nu=16, nv=10), 1)
# necklace + pendant
npts = []
for k in range(30):
    t = k / 29
    a = (t * 2 - 1) * 1.25
    npts.append(V((math.sin(a) * 0.058, -math.cos(a) * 0.066 - 0.004 * (1 - abs(t * 2 - 1)), 0.628 - 0.04 * (1 - abs(t * 2 - 1)) ** 1.5)))
K.sweep('Necklace', npts, lambda t: (0.0012, 0.0012), nprof=6, mat=M['gold'])
K.subsurf(K.ellipsoid('Pendant', V((0, -0.074, 0.582)), (0.0055, 0.003, 0.008), mat=M['gold'], nu=16, nv=10), 1)

# puff sleeves with gathered pleats and a ruffled cuff
for sg in (1, -1):
    A = V((sg * 0.088, 0.0, 0.615))
    Cf = V((sg * P['elbow'].x, P['elbow'].y, P['elbow'].z + 0.012))
    ax = (Cf - A)
    L = ax.length
    ax.normalize()
    side = V((sg, 0, 0)) - ax * ax.x * sg
    side.normalize()
    fwd = ax.cross(side).normalized()

    def puff(u, v, A=A, ax=ax, side=side, fwd=fwd, L=L):
        th = u * K.TAU
        t = v
        r = 0.031 + 0.035 * math.sin(math.pi * min(1, t * 1.02)) ** 0.65
        gather = (1 - math.sin(math.pi * t)) ** 2
        r *= 1 + (0.06 + 0.12 * gather) * math.cos(th * 12) + 0.03 * math.cos(th * 5 + 1.3)
        r *= 1 + 0.12 * max(0, math.cos(th)) * math.sin(math.pi * t)  # balloon sags outward
        return A + ax * (t * L) + (side * math.cos(th) + fwd * math.sin(th)) * r
    K.subsurf(K.surface(f'Sleeve{sg}', puff, 72, 28, wrap_u=True, mat=M['blouse']), 1)

    def cuff(u, v, A=A, ax=ax, side=side, fwd=fwd, L=L):
        th = u * K.TAU
        r = 0.030 + 0.024 * v
        w = 0.006 * v * math.sin(th * 13)
        return A + ax * (L + v * 0.024 + w) + (side * math.cos(th) + fwd * math.sin(th)) * r
    K.subsurf(K.surface(f'Cuff{sg}', cuff, 104, 5, wrap_u=True, mat=M['blouse']), 1)

# lace yoke over the upper chest + pearl buttons
def yoke(u, v):
    th = u * K.TAU
    z = K.lerp(0.640, 0.582 - 0.006 * abs(math.sin(th * 18)) * v, v)   # scalloped lower edge
    k = max(0.0, (z - 0.578) / (0.652 - 0.578))
    rx = K.lerp(0.099, 0.046, k ** 1.3) + 0.0035
    ry = K.lerp(0.077, 0.046, k ** 1.3) + 0.0035
    return V((math.sin(th) * rx, -math.cos(th) * ry + 0.004 * k, z))
K.subsurf(K.surface('Yoke', yoke, 144, 10, wrap_u=True, mat=M['lace'], uv=lambda i, j: (j / 144 * 6, i / 9)), 1)
for k in range(4):
    z = 0.632 - k * 0.016
    yy = -(0.046 + (0.077 - 0.046) * (1 - (z - 0.578) / 0.074) ** 1.3) - 0.008
    K.subsurf(K.ellipsoid(f'Button{k}', V((0, yy, z)), (0.0035, 0.002, 0.0035), mat=M['pearl'], nu=12, nv=8), 1)

# pinafore bodice + straps
bprof = [(r[0] + 0.004, r[1] + 0.004, r[2]) for r in prof if 0.47 < r[2] < 0.585]
bprof = [(0.096, 0.078, 0.585)] + bprof + [(0.082, 0.069, 0.476)]
K.subsurf(K.lathe('Bodice', bprof, nu=48, mat=M['floral'], uv_scale=(2, 0.4)), 1)
for sg in (1, -1):
    sp = []
    for k in range(20):
        t = k / 19
        a = (t * 2 - 1) * math.pi * 0.5
        sp.append(V((sg * (0.058 + 0.012 * math.cos(a)), math.sin(a) * 0.078, 0.583 + 0.046 * math.cos(a) ** 0.7)))
    K.subsurf(K.sweep(f'Strap{sg}', sp, lambda t: (0.0035, 0.011), nprof=8, mat=M['floral'], up=V((sg, 0, 0))), 1)
    # ruffle along the outer edge of the strap
    fr = []
    for k in range(60):
        t = k / 59
        a = (t * 2 - 1) * math.pi * 0.5
        c0 = V((sg * (0.058 + 0.012 * math.cos(a)), math.sin(a) * 0.078, 0.583 + 0.046 * math.cos(a) ** 0.7))
        out = V((-sg, 0, 0.35 * math.cos(a))).normalized()   # inner edge: visible on the chest, not under the puff
        nrm = V((c0.x, c0.y, 0)).normalized()
        row = []
        for j in range(4):
            v = j / 3
            wave = 0.0035 * v * math.sin(t * 46)
            row.append(c0 + out * (0.010 + 0.013 * v) + nrm * (0.002 + wave))
        fr.append(row)
    K.subsurf(K.build(f'StrapRuffle{sg}', fr, mat=M['lace'], uv=lambda i, j: (j / 3, i / 59 * 6)), 1)
# waistband
K.subsurf(K.lathe('Waistband', [(0.086, 0.071, 0.494), (0.087, 0.072, 0.484), (0.087, 0.072, 0.474), (0.086, 0.071, 0.464)],
                  nu=64, mat=M['trim'], uv_scale=(1, 1)), 1)


# skirt: bell with folds
def skirt_r(t):
    rw, rh = (0.080, 0.066), (P['hem_rx'], P['hem_ry'])
    k = 0.55 * t + 0.45 * (1 - (1 - t) ** 2.6)
    return (K.lerp(rw[0], rh[0], k), K.lerp(rw[1], rh[1], k))


Z0, Z1 = 0.478, P['hem_z'] + 0.052   # round 20: wider lace hem band
NS = 36
fold_ph = [rnd.random() * K.TAU for _ in range(4)]


def fold(t, th):
    a = 0.012 + 0.07 * t
    return 1 + a * (0.65 * math.cos(16 * th + fold_ph[0]) + 0.25 * math.cos(7 * th + fold_ph[1]) + 0.1 * math.cos(23 * th + fold_ph[2]))


sk = [(*skirt_r(i / (NS - 1)), K.lerp(Z0, Z1, i / (NS - 1))) for i in range(NS)]
K.subsurf(K.lathe('Skirt', sk, nu=128, mat=M['floral'], disp=lambda u, v, th: fold(v, th), uv_scale=(3, 1.1)), 1)
# lace hem band (follows the skirt folds, scalloped lower edge)
def lace_band(u, v):
    th = u * K.TAU
    z = K.lerp(Z1 + 0.004, P['hem_z'] - 0.002 - 0.004 * abs(math.sin(th * 24)) * v, v)
    rx, ry = skirt_r(1.0)
    s = fold(1.0, th) * (1.012 + 0.03 * v)
    return V((math.sin(th) * rx * s, -math.cos(th) * ry * s, z))
K.subsurf(K.surface('Lace', lace_band, 192, 6, wrap_u=True, mat=M['lace'], uv=lambda i, j: (j / 192 * 4, i / 5)), 1)
# apron: front panel over the skirt (waist -> just above the hem), follows the skirt folds, lace-edged hem
AP_TH = 1.05          # half-angle of the front panel (radians)
AP_Z1 = P['hem_z'] + 0.07
def apron(u, v):
    th = (u * 2 - 1) * AP_TH
    z = K.lerp(Z0 - 0.004, AP_Z1, v)
    t = (Z0 - z) / (Z0 - Z1)
    rx, ry = skirt_r(min(1.0, t))
    s = fold(min(1.0, t), th) * (1.018 + 0.010 * t)
    return V((math.sin(th) * rx * s, -math.cos(th) * ry * s, z))
K.subsurf(K.surface('Apron', apron, 72, 30, mat=M['apron'], uv=lambda i, j: (j / 71 * 1.6, i / 29 * 1.1)), 1)
def apron_lace(u, v):
    th = (u * 2 - 1) * AP_TH
    z = K.lerp(AP_Z1 + 0.012, AP_Z1 - 0.008 - 0.004 * abs(math.sin(th * 16)) * v, v)
    t = min(1.0, (Z0 - z) / (Z0 - Z1))
    rx, ry = skirt_r(t)
    s = fold(t, th) * (1.032 + 0.012 * t)
    return V((math.sin(th) * rx * s, -math.cos(th) * ry * s, z))
K.subsurf(K.surface('ApronLace', apron_lace, 96, 5, mat=M['lace'], uv=lambda i, j: (j / 95 * 2, i / 4)), 1)
for sgn in (1, -1):   # thin trim down each side edge of the apron
    ep = []
    for k in range(30):
        z = K.lerp(Z0 - 0.004, AP_Z1, k / 29)
        t = (Z0 - z) / (Z0 - Z1)
        rx, ry = skirt_r(min(1.0, t))
        sc = fold(min(1.0, t), sgn * AP_TH) * (1.026 + 0.010 * t)
        ep.append(V((math.sin(sgn * AP_TH) * rx * sc, -math.cos(sgn * AP_TH) * ry * sc, z)))
    K.sweep(f'ApronEdge{sgn}', ep, lambda t: (0.0022, 0.0028), nprof=8, mat=M['trim'])

# underskirt peeking below
def under(u, v):
    th = u * K.TAU
    rx, ry = skirt_r(0.96)
    s = (0.97 + 0.015 * math.cos(th * 20)) * (1 + 0.02 * v)
    z = K.lerp(0.25, P['hem_z'] - 0.035 - 0.004 * math.sin(th * 20), v ** 0.5)
    k = K.lerp(0.6, 1.0, v)
    return V((math.sin(th) * rx * s * k, -math.cos(th) * ry * s * k, z))
K.subsurf(K.surface('Underskirt', under, 128, 10, wrap_u=True, mat=M['under']), 1)

# ------------------------------------------------------------------ pose (static, no rig): relaxed stance, head turn + tilt
for o in list(bpy.context.scene.objects):   # weight shift: her left foot steps forward, right foot turns out
    if o.name.startswith(('Shoe1', 'ShoeStrap1')):
        o.data.transform(Matrix.Translation(V((0.004, -0.022, 0))))
    elif o.name.startswith(('Shoe-1', 'ShoeStrap-1')):
        fp = V((-0.047, 0.0, 0))
        o.data.transform(Matrix.Translation(fp) @ Matrix.Rotation(math.radians(-16), 4, 'Z') @ Matrix.Translation(-fp))

# ------------------------------------------------------------------ skin texture: baked position map + AO -> painted face
head_ob = HINFO['head']
PW, PH = 2048, 1024
pos, valid = HEAD.bake_position_map(head_ob, PW, PH)
ao = HEAD.bake_ao_map(head_ob, 1024, 512, samples=32)
from PIL import Image as _Img, ImageFilter as _IF
ao = np.asarray(_Img.fromarray((np.clip(ao, 0, 1) * 255).astype(np.uint8)).filter(_IF.GaussianBlur(3)), np.float32) / 255.0
ao_up = np.kron(ao, np.ones((2, 2), np.float32))
# skin pushed behind the eyeballs bakes black: exclude the sockets so no dark edges bleed onto the lids
near_eye = np.zeros(valid.shape, np.float32)
for sg in (-1, 1):
    E = HINFO['frames'][sg][0]
    dist = np.linalg.norm(pos - np.array(E[:]), axis=-1) / HEAD.H['eye_r']
    near_eye = np.maximum(near_eye, np.clip((1.45 - dist) / 0.40, 0, 1))
ao_typ = float(np.median(ao_up[valid & (pos[..., 1] < -0.06)]))   # round 35: typical face AO, not 1.0 (no pale patch)
ao_up = ao_up * (1 - near_eye) + ao_typ * near_eye
face = HEAD.paint_skin(pos, valid, ao=0.55 + 0.45 * ao_up)
_Img.fromarray(face).save(os.path.join(TEX, 'face2.png'))
M['skin'] = K.material('skin_face', tex=os.path.join(TEX, 'face2.png'), rough=0.55, sheen=0.25, sheen_tint='#ff9a70', spec=0.45)
head_ob.data.materials.clear(); head_ob.data.materials.append(M['skin'])

# ------------------------------------------------------------------ measurement landmarks (LM_ empties) + mesh groups
# Anchor landmarks are empties; silhouette landmarks (hair_top, bun_top, chin, cheeks, ear extremes) are computed by
# web/lib/refcam.js from the mesh groups, because they depend on the camera.
bvh = HEAD.bvh_of(head_ob)
HH = HEAD.H
LM = {}
for sg, side in ((-1, 'R'), (1, 'L')):
    E, f, u, o = HINFO['frames'][sg]
    LM[f'eye_{side}'] = E + HEAD.GAZE * HH['eye_r']   # iris centre (gaze straight ahead)
    inner, outer = HINFO['corners'][sg]
    LM[f'eye_{side}_inner'] = inner; LM[f'eye_{side}_outer'] = outer
    bxm = sg * (HH['brow_x0'] + HH['brow_x1']) / 2
    bzm = HH['brow_z'] + HH['brow_arch'] * math.sin(math.pi * (0.15 + 0.85 * 0.5)) - 0.005
    LM[f'brow_{side}'] = HEAD.hit_front(bvh, bxm, bzm)
LM['nose_tip'] = HEAD.hit_front(bvh, 0.0, HH['nose_z'])
LM['mouth_R'] = HEAD.hit_front(bvh, -HH['mouth_hw'], HH['mouth_z'] + 0.0032)
LM['mouth_L'] = HEAD.hit_front(bvh, HH['mouth_hw'], HH['mouth_z'] + 0.0032)
LM['mouth_centre'] = HEAD.hit_front(bvh, 0.0, HH['mouth_z'])
LM['hairline_centre'] = HEAD.hit_front(bvh, 0.0, HEAD.hairline_z(0))


def scalp_at(phi, z):
    """Head surface point at azimuth phi (deg) and height z."""
    a = math.radians(phi)
    best = None
    for k in range(400):
        el = -0.9 + 1.8 * k / 399
        d = V((math.sin(a) * math.cos(el), -math.cos(a) * math.cos(el), math.sin(el)))
        pnt = HEAD.surf(d)
        if best is None or abs(pnt.z - z) < abs(best.z - z):
            best = pnt
    return best


LM['hairline_temple_R'] = scalp_at(-80, HEAD.hairline_z(-80))
LM['hairline_temple_L'] = scalp_at(62, HEAD.hairline_z(62))

GROUPS = [('Head', 'head'), ('EarringHook', 'jewel'), ('Earring', 'jewel'), ('Ear', 'ear'),
          (('Eye', 'Cornea', 'LashLine', 'LashFlick', 'LidLine'), 'face'),
          (('BunCore', 'BunLock', 'BunCurl'), 'bun'), (('FaceCurl',), 'curl'),
          (('HairCap', 'HairClump'), 'hair')]
for o in bpy.context.scene.objects:
    for pre, g in GROUPS:
        if o.name.startswith(pre):
            o['ll_group'] = g
            if g == 'ear':
                o['ll_side'] = 'R' if o.name.endswith('-1') else 'L'
            break
for nm, pt in LM.items():
    e = bpy.data.objects.new('LM_' + nm, None); e.location = pt; e.empty_display_size = 0.005
    bpy.context.scene.collection.objects.link(e)

# ------------------------------------------------------------------ export: hero + game LOD (head+hair <= 60k tris)
for o in bpy.context.scene.objects:
    if o.data:
        o.data.name = o.name
HEADHAIR = ('head', 'ear', 'face', 'hair', 'bun', 'curl', 'jewel')


def tri_count(objs):
    return sum(len(p.vertices) - 2 for o in objs if o.type == 'MESH' for p in o.data.polygons)


hh_objs = [o for o in bpy.context.scene.objects if o.get('ll_group') in HEADHAIR]
hero_hh = tri_count(hh_objs)
K.export_glb(OUT)
tris = tri_count(bpy.context.scene.objects)
# game LOD: decimate head+hair meshes proportionally until head+hair <= 58k triangles
ratio = min(1.0, 50000 / max(1, hero_hh))
if ratio < 1.0:
    for o in hh_objs:
        if len(o.data.polygons) > 400:
            d = o.modifiers.new('lod', 'DECIMATE'); d.ratio = ratio; K.apply_mods(o)
game_hh = tri_count(hh_objs)
K.export_glb(OUT.replace('.glb', '_game.glb'))
print('EXPORTED', OUT, 'objects', len(bpy.context.scene.objects), 'tris', tris, '| head+hair hero', hero_hh, 'game', game_hh)
