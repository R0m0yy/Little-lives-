"""Little Lives — Naomi (mother, 36). Procedural Blender build -> assets/characters/naomi.glb

usage: python3 art/naomi/build_naomi.py [out.glb]
Proportions measured from refs/design_board.png (Naomi ~290 px tall => H = 1.0 here):
  hair top 1.00, chin .652, eye line .783, brows .838, nose .734, mouth .700, collar .645,
  waist .474, skirt hem .13, underskirt .095, shoe top .045; head width .29; skirt hem half-width .25.
"""
import math, os, sys, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import bpy
from mathutils import Vector as V, Matrix
import meshkit as K
import textures as TX

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].endswith('.glb') else os.path.join(ROOT, 'assets/characters/naomi.glb')
TEX = os.path.join(ROOT, 'art/naomi/tex')
os.makedirs(TEX, exist_ok=True)

# ------------------------------------------------------------------ parameters (tuned in compare rounds)
P = dict(
    head_c=V((0, 0.0, 0.800)), head_rx=0.150, head_ry=0.138, head_rz_top=0.152, head_rz_bot=0.152,
    cheek_amp=0.115, cheek_low=-0.40, chin_narrow=0.10,
    eye_x=0.067, eye_z=0.796, eye_r=0.046, eye_depth=0.62, eye_out=0.10,
    lid_up=47, lid_low=-42, lid_corner=4,
    brow_z=0.850,
    mouth_z=0.703, nose_z=0.742,
    collar_z=0.645, waist_z=0.474, hem_z=0.128, hem_rx=0.235, hem_ry=0.205,
    shoulder=V((0.100, 0.0, 0.598)), elbow=V((0.153, 0.006, 0.456)), wrist=V((0.182, -0.078, 0.346)),
    hand_c=V((0.185, -0.094, 0.322)),   # hands rest on the front-sides of the skirt (round 10: were buried inside it)
    bun_c=V((-0.150, 0.060, 0.868)), bun_r=0.078,
)
C = P['head_c']
rnd = random.Random(7)

K.reset()

# ------------------------------------------------------------------ textures
TX.floral(os.path.join(TEX, 'floral.png'))
TX.floral(os.path.join(TEX, 'apron.png'), seed=9, base=(232, 224, 218), density=0.95)   # cooler, lighter apron print
TX.lace(os.path.join(TEX, 'lace.png'))
TX.trim(os.path.join(TEX, 'trim.png'))
TX.weave(os.path.join(TEX, 'weave.png'))
TX.iris(os.path.join(TEX, 'iris.png'))

# ------------------------------------------------------------------ materials (names drive Three.js tuning in web/lib/look.js)
M = dict(
    skin=K.material('skin', vcol=True, rough=0.55, sheen=0.15, sheen_tint='#ff8a5a', spec=0.45),
    skinPlain=K.material('skin_body', base=(0.70, 0.27, 0.13, 1), rough=0.55, sheen=0.15, sheen_tint='#ff8a5a', spec=0.45),
    eye=K.material('eye', tex=os.path.join(TEX, 'iris.png'), rough=0.08, coat=1.0, coat_rough=0.0, spec=0.6),
    lash=K.material('lash', base='#160d0b', rough=0.5),
    brow=K.material('hair_brow', base='#3a2218', rough=0.7),
    cornea=K.material('cornea', base='#ffffff', rough=0.0, coat=1.0, coat_rough=0.0, alpha=0.15),
    crease=K.material('skin_crease', base='#9a4a30', rough=0.6),
    lip=K.material('skin_lip', base='#c4604e', rough=0.38, spec=0.55),
    mouth=K.material('skin_mouth', base='#7a2a22', rough=0.6),
    hair=K.material('hair', base='#120b0c', rough=0.30, aniso=0.65, spec=0.65, sheen=0.15, sheen_tint='#56627e', sheen_rough=0.4),
    hairCap=K.material('hair_cap', base='#060304', rough=0.6, aniso=0.2, spec=0.35),
    bun=K.material('hair_bun', base='#3a2218', rough=0.48, aniso=0.3, spec=0.45, sheen=0.4, sheen_tint='#c09070', sheen_rough=0.45),
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


# ================================================================== HEAD
def gauss(d, c, s):
    a = d.angle(c.normalized()) if d.length > 0 else 0
    return math.exp(-(a * a) / (2 * s * s))


def eye_dir(sign):
    return V((sign * P['eye_x'] / P['head_rx'] * 0.92, -0.86, (P['eye_z'] - C.z) / P['head_rz_top'])).normalized()


def head_raw(d):
    """Unit direction (front = -Y) -> head surface point (before fine bumps)."""
    h = d.z
    rz = P['head_rz_top'] if h > 0 else P['head_rz_bot']
    horiz = math.sqrt(max(0.0, 1 - h * h))
    s = horiz * (1 + P['cheek_amp'] * math.exp(-((h - P['cheek_low']) ** 2) / (2 * 0.33 ** 2))) - 0.05 * max(h, 0) ** 2 * horiz
    s *= 1 - P['chin_narrow'] * K.smoothstep(-0.55, -1.0, h)
    hd = V((d.x, d.y, 0))
    hd = hd.normalized() if hd.length > 1e-9 else V((0, -1, 0))
    p = V((hd.x * s * P['head_rx'], hd.y * s * P['head_ry'], h * rz))
    # flatter back of skull, rounder front face
    if p.y > 0:
        p.y *= 0.95
    return C + p


BUMPS = [  # (direction, amplitude (fraction of radius), sigma radians)
    (V((0.52, -0.78, -0.40)), 0.072, 0.31), (V((-0.52, -0.78, -0.40)), 0.072, 0.31),  # apple cheeks (fuller)
    (V((0, -0.97, -0.355)), 0.085, 0.064),  # nose button (tip)
    (V((0, -0.96, -0.22)), 0.012, 0.05),    # soft bridge
    (V((0.085, -0.96, -0.40)), 0.022, 0.040), (V((-0.085, -0.96, -0.40)), 0.022, 0.040),   # nostril wings
    (V((0.045, -0.96, -0.425)), -0.010, 0.028), (V((-0.045, -0.96, -0.425)), -0.010, 0.028),  # nostril dimples
    (V((0, -0.95, -0.62)), 0.012, 0.12),    # chin pad
    (V((0, -0.94, -0.53)), -0.010, 0.07),   # mouth line
    (V((0, -0.85, 0.45)), 0.02, 0.4),       # forehead fullness
]


def head_point(d):
    p = head_raw(d)
    k = 1.0
    for c, a, s in BUMPS:
        k += a * gauss(d, c, s)
    for sg in (1, -1):  # eye sockets
        k -= 0.022 * gauss(d, eye_dir(sg), 0.20)   # shallow socket: no dark under-eye hollow
    return C + (p - C) * k


def blush(p):
    d = (p - C).normalized()
    w = max(gauss(d, V((0.55, -0.75, -0.42)), 0.20), gauss(d, V((-0.55, -0.75, -0.42)), 0.20))
    lip = gauss(d, V((0, -0.93, -0.555)), 0.07) * 0.8
    base = (0.70, 0.27, 0.13)  # linear ~ #db8f64 (warm saturated tan)
    bl = (0.80, 0.18, 0.11)
    li = (0.62, 0.17, 0.13)
    c = [base[i] * (1 - w * 0.55) + bl[i] * w * 0.55 for i in range(3)]
    c = [c[i] * (1 - lip) + li[i] * lip for i in range(3)]
    tip = gauss(d, V((0, -0.97, -0.34)), 0.045) * 0.45            # warm nose tip
    under = gauss(d, V((0, -0.95, -0.445)), 0.035) * 0.35         # soft shadow under the nose
    c = [c[i] * (1 - tip) + bl[i] * tip for i in range(3)]
    c = [c[i] * (1 - under * 0.55) for i in range(3)]
    return (*c, 1.0)


def sphere_dir(u, v):
    th, ph = u * K.TAU, v * math.pi
    return V((math.sin(ph) * math.sin(th), -math.sin(ph) * math.cos(th), math.cos(ph)))


def bake_head_tex(path, W=512, Hh=256):
    from PIL import Image
    im = Image.new('RGB', (W, Hh)); px = im.load()
    lin2s = lambda c: int(255 * (c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055))
    for y in range(Hh):
        for x in range(W):
            c = blush(head_point(sphere_dir((x + 0.5) / W, (y + 0.5) / Hh)))
            px[x, y] = tuple(lin2s(c[i]) for i in range(3))  # PIL row 0 = top = UV v 1 = sphere top
    im.save(path)


bake_head_tex(os.path.join(TEX, 'face.png'))
M['skin'] = K.material('skin_face', tex=os.path.join(TEX, 'face.png'), rough=0.55, sheen=0.15, sheen_tint='#ff8a5a', spec=0.45)
head = K.surface('Head', lambda u, v: head_point(sphere_dir(u, v)), 96, 72, wrap_u=True, mat=M['skin'],
                 uv=lambda i, j: (j / 96, 1 - i / 71))
K.subsurf(head, 1)

# ears
for sg in (1, -1):
    ec = head_raw(V((sg * 0.98, 0.05, -0.32)).normalized()) + V((sg * -0.006, 0.006, 0))
    R = Matrix.Rotation(sg * 0.35, 3, 'Z')
    ear = K.ellipsoid(f'Ear{sg}', ec, (0.013, 0.022, 0.030), mat=M['skinPlain'], rot=R,
                      disp=lambda d: 1 - 0.25 * math.exp(-((d.x * sg + 0.9) ** 2) / 0.05) * (abs(d.z) < 0.7))
    K.subsurf(ear, 1)
    # gold drop earring
    ep = ec + V((sg * 0.004, -0.004, -0.032))
    K.subsurf(K.ellipsoid(f'EarringHook{sg}', ep + V((0, 0, 0.006)), (0.0028, 0.0028, 0.006), mat=M['gold'], nu=12, nv=8), 1)
    K.subsurf(K.ellipsoid(f'Earring{sg}', ep - V((0, 0, 0.004)), (0.0065, 0.0065, 0.009), mat=M['gold'], nu=16, nv=10), 1)


# ------------------------------------------------------------------ eyes
def eye_frame(sg):
    f = eye_dir(sg)
    f = (f + V((sg * P['eye_out'], 0, 0))).normalized()  # gaze slightly outward from socket normal -> forward-ish
    f = (V((0, -1, 0)) * 0.75 + f * 0.25).normalized()  # mostly forward gaze
    surf = head_raw(eye_dir(sg))
    c = surf - (surf - C).normalized() * P['eye_r'] * P['eye_depth']
    up = V((0, 0, 1))
    r = up.cross(f).normalized() * -1  # points to character's left (+X) for forward f=-Y
    if sg < 0:
        r = -r  # 'outer' side for each eye
    u = f.cross(r).normalized() * (1 if sg > 0 else -1)
    if u.z < 0:
        u = -u
    return c, f, r, u


for sg in (1, -1):
    c, f, r, u = eye_frame(sg)
    er = P['eye_r']

    def eyeball(uu, vv, c=c, f=f, r=r, u=u):
        th, ph = uu * K.TAU, vv * math.pi
        dl = V((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))  # local: z=forward
        return c + (r * dl.x + u * dl.y + f * dl.z) * er

    def eye_uv(i, j, n=48, m=32, r=r, u=u):
        th, ph = j / n * K.TAU, i / (m - 1) * math.pi
        x, y = math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th)
        return (0.5 + x * 0.5 * (1 if sg > 0 else -1), 0.5 + y * 0.5)
    K.subsurf(K.surface(f'Eye{sg}', eyeball, 48, 32, wrap_u=True, mat=M['eye'], uv=eye_uv), 1)
    # cornea: clear glossy shell with a slight forward bulge -> cool environment reflection over the iris
    def cornea(uu, vv, c=c, f=f, r=r, u=u):
        th, ph = uu * K.TAU, vv * math.pi
        dl = V((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))
        bulge = 1.0 + 0.06 * max(0.0, dl.z) ** 3
        return c + (r * dl.x + u * dl.y + f * dl.z) * er * 1.012 * bulge
    K.subsurf(K.surface(f'Cornea{sg}', cornea, 40, 24, wrap_u=True, mat=M['cornea']), 1)

    # lids: shells around the eyeball, aperture edges at lid_up / lid_low degrees
    am = math.radians(78)
    bc = math.radians(P['lid_corner'])

    def edge(a, top):
        e = math.radians(P['lid_up'] if top else P['lid_low'])
        k = math.sqrt(max(0.0, 1 - (a / am) ** 2))
        # outer corner (a>0) slightly lifted, inner corner lower
        corner = bc + (0.08 if a > 0 else -0.05) * abs(a / am)
        return corner + (e - corner) * k

    def lid(top, c=c, f=f, r=r, u=u):
        def g(uu, vv):
            a = (uu * 2 - 1) * math.radians(92)
            e = edge(max(-am, min(am, a)), top)
            far = math.radians(62) if top else math.radians(-48)
            b = e + (far - e) * vv
            band = abs(b - e)
            R = er * (1.030 + (0.035 if top else 0.014) * K.smoothstep(0.0, math.radians(12 if top else 7), band))
            return c + (f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)) * R
        return g
    for top in (True, False):
        K.subsurf(K.surface(f'Lid{"U" if top else "L"}{sg}', lid(top), 40, 12, mat=M['skinPlain'], orient=c), 1)

    # upper lash line: thick, heavier toward the outer corner, with a flick
    pts, nrm = [], []
    for k in range(40):
        a = (-0.92 + 1.98 * k / 39) * am
        b = edge(max(-am, min(am, a)), True) + math.radians(2)
        d = f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)
        pts.append(c + d * er * 1.075)
        nrm.append(d)
    K.subsurf(K.sweep(f'Lash{sg}', pts, lambda t: (0.0040 + 0.0050 * t ** 1.6, 0.0016 + 0.0020 * t), nprof=8, mat=M['lash'], normals=nrm), 1)
    for k, (a0, ln, curl) in enumerate([(0.98, 0.026, 0.9)]):   # one neat outer flick
        a = a0 * am
        b = edge(min(am, a), True)
        d0 = f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)
        p0 = c + d0 * er * 1.07
        tip_dir = (r * 0.9 + u * 0.6 + f * 0.2).normalized()
        lp = [p0 + (tip_dir * t * ln + u * (t * t) * ln * curl * 0.5) for t in [i / 7 for i in range(8)]]
        K.subsurf(K.sweep(f'LashFlick{sg}{k}', lp, lambda t: (0.0040 * (1 - t) ** 0.8 + 0.0003, 0.0017 * (1 - t) + 0.0002), nprof=8, mat=M['lash'], up=f), 1)
    # lid crease: soft darker line above the upper lid
    pts, nrm = [], []
    for k in range(30):
        a = (-0.75 + 1.55 * k / 29) * am
        b = edge(max(-am, min(am, a)), True) + math.radians(17 + 4 * (1 - abs(a / am)))
        d = f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)
        pts.append(c + d * er * 1.075); nrm.append(d)
    K.subsurf(K.sweep(f'Crease{sg}', pts, lambda t: (0.0008, 0.0016 * math.sin(math.pi * t) + 0.0002), nprof=6, mat=M['crease'], normals=nrm), 1)
    # lower lid: subtle line
    pts = []
    for k in range(24):
        a = (-0.7 + 1.55 * k / 23) * am
        b = edge(max(-am, min(am, a)), False) - math.radians(3)
        pts.append(c + (f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)) * er * 1.05)
    K.sweep(f'LashLow{sg}', pts, lambda t: (0.0007 * math.sin(math.pi * t) + 0.0002, 0.0006), nprof=6, mat=M['lash'], up=f)

    # eyebrow: short, thick, arched; follows the head surface
    bp, bn = [], []
    for k in range(20):
        t = k / 19
        x = sg * (0.030 + 0.085 * t)
        z = P['brow_z'] + 0.014 * math.sin(math.pi * (0.25 + 0.75 * t)) - 0.012 * t
        d = V((x / P['head_rx'], -0.80, (z - C.z) / P['head_rz_top'])).normalized()
        for _ in range(4):  # project onto the surface (fixed point on height)
            pp = head_point(d)
            d = V((x - C.x, (d.y / max(1e-6, abs(d.y))) * 1, 0))
            d = V((x / P['head_rx'], -math.sqrt(max(0.05, 1 - (x / P['head_rx']) ** 2 - ((z - C.z) / P['head_rz_top']) ** 2)), (z - C.z) / P['head_rz_top'])).normalized()
        pp = head_point(d)
        bp.append(pp + (pp - C).normalized() * 0.003)
        bn.append((pp - C).normalized())
    K.subsurf(K.sweep(f'Brow{sg}', bp, lambda t: (0.0028, 0.0058 * (1 - 0.6 * t) * min(1, t * 6 + 0.35)), nprof=8, mat=M['brow'], normals=bn), 1)

# mouth: soft closed smile — darker line curving up at the corners, fuller lower lip, thin upper lip
def on_face(x, z, lift):
    d = V((x / P['head_rx'], -0.97, (z - C.z) / P['head_rz_bot'])).normalized()
    pp = head_point(d)
    n = (pp - C).normalized()
    return pp + n * lift, n


def face_curve(name, fx, fz, n, lift, prof, mat):
    pts, nrm = [], []
    for k in range(n):
        t = k / (n - 1) * 2 - 1
        p, nn = on_face(fx(t), fz(t), lift(t) if callable(lift) else lift)
        pts.append(p); nrm.append(nn)
    return K.subsurf(K.sweep(name, pts, prof, nprof=10, mat=mat, normals=nrm), 1)


MZ = P['mouth_z']
face_curve('MouthLine', lambda t: t * 0.020, lambda t: MZ + 0.0062 * t ** 2 - 0.0012 + 0.0025 * abs(t) ** 6, 24, 0.0008,
           lambda t: (0.0007, 0.0010 * (0.4 + 0.6 * math.sin(math.pi * t))), M['mouth'])
face_curve('LipLower', lambda t: t * 0.0135, lambda t: MZ - 0.0050 + 0.0022 * t ** 2, 20, lambda t: 0.0012 + 0.0018 * (1 - t * t),
           lambda t: (0.0030 * math.sin(math.pi * t) ** 0.7 + 0.0003, 0.0040 * math.sin(math.pi * t) ** 0.6 + 0.0004), M['lip'])
face_curve('LipUpper', lambda t: t * 0.0155, lambda t: MZ + 0.0022 + 0.0042 * t ** 2 - 0.0010 * math.exp(-t * t / 0.02), 20, 0.0010,
           lambda t: (0.0013 * math.sin(math.pi * t) ** 0.7 + 0.0002, 0.0022 * math.sin(math.pi * t) ** 0.6 + 0.0003), M['lip'])
for sg in (1, -1):  # smile dimples at the corners
    p, n = on_face(sg * 0.0215, MZ + 0.0058, 0.0005)
    K.subsurf(K.ellipsoid(f'Dimple{sg}', p, (0.0016, 0.0016, 0.0016), mat=M['mouth'], nu=10, nv=6), 1)

# ================================================================== HAIR
BUN = P['bun_c']
bun_dir = (BUN - C).normalized()


def hair_keep(d):
    fx, fy, fz = d.x, -d.y, d.z
    hl = 0.60 - 0.70 * fx * fx
    keep_face = max(fz - hl, 0.22 - fy)
    keep_ear = max(0.74 - abs(fx), fz + 0.10, -0.30 - fy)
    keep_nape = fz + 0.58
    return min(keep_face, keep_ear, keep_nape)


def hair_thick(d):
    t = 0.04 + 0.24 * max(0, d.z) ** 1.6 + 0.05 * max(0, d.y) + 0.04 * abs(d.x)
    t += 0.10 * gauss(d, V((0.18, -0.45, 0.85)), 0.40)       # pompadour lift above the parting       # lift above the parting / forehead
    return t


def _flow_basis():
    a = bun_dir
    e1 = V((0, -1, 0)) - a * a.dot(V((0, -1, 0)))
    e1.normalize()
    return a, e1, a.cross(e1)


FLOW = _flow_basis()


def clump(d, n=11, depth=0.25):
    """Sculpted clumps: rounded lobes with sharp valleys, flowing along great circles into the bun."""
    a, e1, e2 = FLOW
    psi = math.atan2(d.dot(e2), d.dot(e1))
    ph = n * psi / 2 + 0.7 * math.sin(3 * psi) + 0.45 * math.sin(5 * psi + 1.3)  # irregular clump widths
    lobe = abs(math.sin(ph)) ** 0.45                                               # round top, V-shaped valley
    conv = K.smoothstep(0.985, 0.62, d.dot(a))                                     # clumps merge into the bun
    return 1 - depth * (1 - lobe) * conv


def cap_point(d, lift=0.0):
    kp = hair_keep(d)
    k = K.smoothstep(-0.01, 0.06, kp)    # quick rounded lip at the hairline
    sink = 0.05 * K.smoothstep(0.0, -0.08, kp)  # outside the hairline the cap dives under the skin -> smooth hairline
    p = head_point(d)
    return C + (p - C) * (1 + hair_thick(d) * k * clump(d) - sink + lift)


NU, NV = 160, 110
cap_rows = [[cap_point(sphere_dir(j / NU, i / (NV - 1))) for j in range(NU)] for i in range(NV)]
cap = K.build('HairCap', cap_rows, wrap_u=True, mat=M['hairCap'], orient=C,
              keep=lambda i, j: hair_keep(sphere_dir((j + 0.5) / NU, (i + 0.5) / (NV - 1))) > -0.14)
K.subsurf(cap, 1)


def slerp(a, b, t):
    om = a.angle(b)
    if om < 1e-6:
        return a.copy()
    return (a * math.sin((1 - t) * om) + b * math.sin(t * om)) / math.sin(om)


def strand_to_bun(name, d0, width, thick, lift0=0.004, via=None, n=36, mat=None, end_lift=0.0):
    pts, nrm = [], []
    for k in range(n):
        t = k / (n - 1)
        if via is not None:
            d = slerp(d0, via, t / 0.5).normalized() if t < 0.5 else slerp(via, bun_dir, (t - 0.5) / 0.5).normalized()
        else:
            d = slerp(d0, bun_dir, t).normalized()
        p = cap_point(d, lift0 + 0.004 * math.sin(math.pi * t) + end_lift * t)
        pts.append(p)
        nrm.append((p - C).normalized())
    taper = lambda t: (thick * (0.35 + 0.65 * math.sin(math.pi * min(1, t * 1.1)) ** 0.4),
                       width * (0.25 + 0.75 * math.sin(math.pi * min(1.0, 0.08 + t)) ** 0.5))
    ob = K.sweep(name, pts, taper, nprof=10, mat=mat or M['hair'], normals=nrm, uv_len=4)
    return ob


def dirs_path(ws, n):
    """Piecewise slerp through unit-direction waypoints."""
    out = []
    seg = len(ws) - 1
    for k in range(n):
        t = k / (n - 1) * seg
        i = min(int(t), seg - 1)
        out.append(slerp(ws[i], ws[i + 1], t - i).normalized())
    return out


def strand(name, ds, width, thick, lift, mat, n=None, wave=0.0, seed=0):
    """Thin tapered hair strand riding over the cap along unit directions ds."""
    r = random.Random(seed)
    ph = r.random() * K.TAU
    pts, nrm = [], []
    m = len(ds)
    for k, d in enumerate(ds):
        t = k / (m - 1)
        p = cap_point(d, lift * math.sin(math.pi * t) ** 0.8)   # ends tuck into the cap (no shingled tips)
        nn = (p - C).normalized()
        pts.append(p + nn * wave * math.sin(t * 9 + ph) * math.sin(math.pi * t)); nrm.append(nn)
    prof = lambda t: (thick * (0.25 + 0.75 * math.sin(math.pi * min(1, 0.03 + t)) ** 0.5),
                      width * (0.15 + 0.85 * math.sin(math.pi * min(1, 0.05 + t * 0.98)) ** 0.7))
    return K.sweep(name, pts, prof, nprof=6, mat=mat, normals=nrm, uv_len=6)


def jitter(d, amt, r):
    return (d + V((r.uniform(-amt, amt), r.uniform(-amt, amt), r.uniform(-amt, amt)))).normalized()


# (a) scalp strands: ~130 thin strands from hairline/crown flowing into the bun, over a darker cap
sr = random.Random(21)
golden = math.pi * (3 - math.sqrt(5))
NS = 1400
count = 0
for k in range(NS):
    zz = 1 - 2 * (k + 0.5) / NS
    rr = math.sqrt(1 - zz * zz)
    d0 = V((math.cos(golden * k) * rr, math.sin(golden * k) * rr, zz))
    kp = hair_keep(d0)
    if kp < 0.06 or d0.dot(bun_dir) > 0.80 or (kp > 0.30 and sr.random() < 0.75):
        continue  # hairline + some crown starts; skip the bun area
    via = jitter(slerp(d0, bun_dir, 0.5).normalized(), 0.05, sr)
    ds = dirs_path([d0, via, bun_dir], 30)
    strand(f'HairStrand{count}', ds, sr.uniform(0.0075, 0.011), sr.uniform(0.0045, 0.0062), sr.uniform(0.002, 0.007), M['hair'],
           wave=0.0015, seed=k)
    count += 1
print('scalp strands', count)

# (b) side-swept forehead lock as a fan of strands from the parting across the forehead
part = V((0.45, -0.50, 0.74))
base_ws = [part, V((0.10, -0.76, 0.68)), V((-0.50, -0.66, 0.58)), V((-0.86, -0.15, 0.52)), bun_dir]
for k in range(22):
    t = k / 21
    ws = [jitter(w + V((0.0, 0.03 * t, 0.10 * t)), 0.012, sr) for w in base_ws[:-1]] + [bun_dir]
    strand(f'HairSwoop{k}', dirs_path(ws, 46), sr.uniform(0.009, 0.012), 0.0055, 0.004 + 0.010 * t + sr.uniform(0, 0.002), M['hair'],
           wave=0.002, seed=500 + k)


# (c) two loose curls framing the face, in front of the ears
def face_curl(name, top, length, turns, r0, r1, tube, sg, seed):
    r = random.Random(seed)
    ph = r.random() * K.TAU
    pts = []
    n = 70
    for k in range(n):
        t = k / (n - 1)
        a = ph + t * turns * K.TAU
        rad = K.lerp(r0, r1, t)
        pts.append(top + V((sg * (math.cos(a) * rad + 0.010 * t), -math.sin(a) * rad - 0.012 * t, -t * length)))
    return K.sweep(name, pts, lambda t: (tube * (1 - 0.6 * t) + 0.0006, tube * (1 - 0.6 * t) + 0.0006), nprof=8, mat=M['hair'], uv_len=6)


for sg in (1, -1):
    top = cap_point(V((sg * 0.84, -0.50, 0.02)).normalized(), 0.002)
    face_curl(f'FaceCurl{sg}', top, 0.105, 2.6, 0.0075, 0.012, 0.0042, sg, 80 + sg)

# (d) bun: core + many small loose ringlets springing outward
K.subsurf(K.ellipsoid('BunCore', BUN, (P['bun_r'] * 0.80, P['bun_r'] * 0.76, P['bun_r'] * 0.80), mat=M['bun']), 1)
NCURL = 90
for k in range(NCURL):
    zz = 1 - 2 * (k + 0.5) / NCURL
    rr = math.sqrt(1 - zz * zz)
    d = V((math.cos(golden * k) * rr, math.sin(golden * k) * rr, zz))
    if d.dot(-bun_dir) > 0.5:
        continue
    d = jitter(d, 0.15, sr)
    cen = BUN + d * P['bun_r'] * sr.uniform(0.62, 0.78)
    t1 = d.cross(V((0, 0, 1)) if abs(d.z) < 0.9 else V((1, 0, 0))).normalized()
    t2 = d.cross(t1)
    rad, ln, turns = sr.uniform(0.0055, 0.0085), sr.uniform(0.020, 0.032), sr.uniform(1.6, 2.4)
    ph = sr.random() * K.TAU
    pts = [cen + d * (t * ln) + (t1 * math.cos(ph + t * turns * K.TAU) + t2 * math.sin(ph + t * turns * K.TAU)) * rad * (1 - 0.25 * t)
           for t in [i / 39 for i in range(40)]]
    K.sweep(f'Ringlet{k}', pts, lambda t: (0.0042 * (1 - 0.55 * t) + 0.0005, 0.0040 * (1 - 0.55 * t) + 0.0005), nprof=8, mat=M['bun'], uv_len=3)

# ================================================================== BODY (union of arms + hands + legs + neck)
def arm_parts(sg):
    S, E, W, Hc = [V((sg * v.x, v.y, v.z)) for v in (P['shoulder'], P['elbow'], P['wrist'], P['hand_c'])]
    parts = [K.capsule('ua', S, E, 0.030, 0.024), K.capsule('fa', E, W, 0.023, 0.016)]
    inward = V((-sg, 0, 0))
    parts.append(K.ellipsoid('palm', Hc, (0.0105, 0.020, 0.017), nu=20, nv=14))
    parts.append(K.capsule('wristj', W, Hc + V((0, 0, 0.01)), 0.0165, 0.016))
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
    K.union(f'Arm{sg}', arm_parts(sg), voxel=0.0011, smooth_iter=3, smooth_factor=0.5, decimate=0.18, mat=M['skinPlain'])
legs = []
for sg in (1, -1):
    legs.append(K.capsule('leg', V((sg * 0.050, 0.0, 0.26)), V((sg * 0.047, 0.0, 0.05)), 0.026, 0.018))
K.union('Legs', legs, voxel=0.003, smooth_iter=4, decimate=0.3, mat=M['tights'])
K.subsurf(K.capsule('Neck', V((0, 0.012, 0.715)), V((0, 0.012, 0.620)), 0.040, 0.044), 0)
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
HEAD_PARTS = ('Head', 'Ear', 'Eye', 'Cornea', 'Lid', 'Lash', 'Crease', 'Brow', 'MouthLine', 'LipLower', 'LipUpper', 'Dimple',
              'HairCap', 'HairStrand', 'HairSwoop', 'FaceCurl', 'BunCore', 'Ringlet')
piv = V((0, 0.012, 0.662))
Rh = Matrix.Rotation(math.radians(P.get('head_yaw', 0)), 4, 'Z') @ Matrix.Rotation(math.radians(P.get('head_roll', 0)), 4, 'Y') \
    @ Matrix.Rotation(math.radians(P.get('head_pitch', 2)), 4, 'X')
Mh = Matrix.Translation(piv) @ Rh @ Matrix.Translation(-piv)
for o in list(bpy.context.scene.objects):
    if o.type == 'MESH' and o.name.startswith(HEAD_PARTS):
        o.data.transform(Mh)
for o in list(bpy.context.scene.objects):   # weight shift: her left foot steps forward, right foot turns out
    if o.name.startswith(('Shoe1', 'ShoeStrap1')):
        o.data.transform(Matrix.Translation(V((0.004, -0.022, 0))))
    elif o.name.startswith(('Shoe-1', 'ShoeStrap-1')):
        fp = V((-0.047, 0.0, 0))
        o.data.transform(Matrix.Translation(fp) @ Matrix.Rotation(math.radians(-16), 4, 'Z') @ Matrix.Translation(-fp))

# ------------------------------------------------------------------ export
for o in bpy.context.scene.objects:
    o.data.name = o.name
K.export_glb(OUT)
tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects for p in o.data.polygons)
print('EXPORTED', OUT, 'objects', len(bpy.context.scene.objects), 'tris', tris)
