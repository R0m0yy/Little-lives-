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
    head_c=V((0, 0.0, 0.800)), head_rx=0.142, head_ry=0.136, head_rz_top=0.158, head_rz_bot=0.150,
    cheek_amp=0.07, cheek_low=-0.36, chin_narrow=0.30,
    eye_x=0.068, eye_z=0.788, eye_r=0.041, eye_depth=0.62, eye_out=0.10,
    lid_up=40, lid_low=-40, lid_corner=4,
    brow_z=0.842,
    mouth_z=0.703, nose_z=0.742,
    collar_z=0.645, waist_z=0.474, hem_z=0.128, hem_rx=0.235, hem_ry=0.205,
    shoulder=V((0.100, 0.0, 0.598)), elbow=V((0.150, 0.004, 0.452)), wrist=V((0.166, -0.006, 0.330)),
    hand_c=V((0.168, -0.008, 0.300)),
    bun_c=V((-0.128, 0.065, 0.872)), bun_r=0.066,
)
C = P['head_c']
rnd = random.Random(7)

K.reset()

# ------------------------------------------------------------------ textures
TX.floral(os.path.join(TEX, 'floral.png'))
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
    lip=K.material('skin_lip', base='#b85a4e', rough=0.45, spec=0.5),
    hair=K.material('hair', base='#0f0a0c', rough=0.3, aniso=0.5, spec=0.65),
    hairCap=K.material('hair_cap', base='#0f0a0c', rough=0.3, aniso=0.5, spec=0.65),
    bun=K.material('hair_bun', base='#2c1a16', rough=0.38, aniso=0.6, spec=0.6),
    blouse=K.material('fabric_blouse', tex=os.path.join(TEX, 'weave.png'), rough=0.8, sheen=0.35, sheen_tint='#f0d8c8', sheen_rough=0.6),
    floral=K.material('fabric_floral', tex=os.path.join(TEX, 'floral.png'), rough=0.8, sheen=0.5, sheen_rough=0.6),
    lace=K.material('fabric_lace', tex=os.path.join(TEX, 'lace.png'), rough=0.85, sheen=0.5),
    trim=K.material('fabric_trim', tex=os.path.join(TEX, 'trim.png'), rough=0.7, sheen=0.4),
    under=K.material('fabric_under', base='#6e2622', rough=0.7, sheen=0.6, sheen_tint='#ffb0a0'),
    tights=K.material('fabric_tights', base='#3e1d10', rough=0.6, sheen=0.5, sheen_tint='#c08060'),
    shoe=K.material('leather_shoe', base='#2c1209', rough=0.32, coat=0.6, coat_rough=0.2),
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
    (V((0.52, -0.78, -0.40)), 0.055, 0.33), (V((-0.52, -0.78, -0.40)), 0.055, 0.33),  # apple cheeks
    (V((0, -0.97, -0.37)), 0.045, 0.085),   # nose button
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
        k -= 0.06 * gauss(d, eye_dir(sg), 0.20)
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
            px[x, Hh - 1 - y] = tuple(lin2s(c[i]) for i in range(3))
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
            far = math.radians(62) if top else math.radians(-58)
            b = e + (far - e) * vv
            band = abs(b - e)
            R = er * (1.010 + 0.035 * K.smoothstep(0.0, math.radians(12), band))
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
    K.subsurf(K.sweep(f'Lash{sg}', pts, lambda t: (0.0042 + 0.0035 * t ** 1.5, 0.0016 + 0.0018 * t), nprof=8, mat=M['lash'], normals=nrm), 1)
    for k, (a0, ln, curl) in enumerate([(0.70, 0.014, 0.6), (0.86, 0.018, 0.8), (1.02, 0.016, 1.0)]):
        a = a0 * am
        b = edge(min(am, a), True)
        d0 = f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)
        p0 = c + d0 * er * 1.07
        tip_dir = (r * 0.9 + u * 0.6 + f * 0.2).normalized()
        lp = [p0 + (tip_dir * t * ln + u * (t * t) * ln * curl * 0.5) for t in [i / 7 for i in range(8)]]
        K.sweep(f'LashFlick{sg}{k}', lp, lambda t: (0.0022 * (1 - t) + 0.0003, 0.0011 * (1 - t) + 0.0002), nprof=6, mat=M['lash'], up=f)
    # lower lid: subtle line
    pts = []
    for k in range(24):
        a = (-0.7 + 1.55 * k / 23) * am
        b = edge(max(-am, min(am, a)), False) - math.radians(3)
        pts.append(c + (f * math.cos(b) * math.cos(a) + r * math.cos(b) * math.sin(a) + u * math.sin(b)) * er * 1.05)
    K.sweep(f'LashLow{sg}', pts, lambda t: (0.0012 * math.sin(math.pi * t) + 0.0003, 0.0009), nprof=6, mat=M['lash'], up=f)

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

# mouth: small closed smile
mp, mn = [], []
for k in range(16):
    t = k / 15 * 2 - 1
    x = t * 0.021
    z = P['mouth_z'] + 0.0055 * t * t - 0.0015
    d = V((x / P['head_rx'], -0.97, (z - C.z) / P['head_rz_bot'])).normalized()
    pp = head_point(d)
    mp.append(pp + (pp - C).normalized() * 0.0012)
    mn.append((pp - C).normalized())
K.sweep('Mouth', mp, lambda t: (0.0012, 0.0016 * (0.5 + 0.5 * math.sin(math.pi * t))), nprof=6, mat=M['lip'], normals=mn)

# ================================================================== HAIR
BUN = P['bun_c']
bun_dir = (BUN - C).normalized()


def hair_keep(d):
    fx, fy, fz = d.x, -d.y, d.z
    hl = 0.47 - 0.62 * fx * fx
    keep_face = max(fz - hl, 0.22 - fy)
    keep_ear = max(0.74 - abs(fx), fz + 0.10, -0.30 - fy)
    keep_nape = fz + 0.58
    return min(keep_face, keep_ear, keep_nape)


def hair_thick(d):
    t = 0.03 + 0.20 * max(0, d.z) ** 1.2 + 0.05 * max(0, d.y)
    t += 0.09 * gauss(d, V((0.18, -0.55, 0.80)), 0.42)       # lift above the parting / forehead
    return t


def _flow_basis():
    a = bun_dir
    e1 = V((0, -1, 0)) - a * a.dot(V((0, -1, 0)))
    e1.normalize()
    return a, e1, a.cross(e1)


FLOW = _flow_basis()


def clump(d, n=12, depth=0.20):
    """Broad hair clumps: grooves along great circles converging on the bun."""
    a, e1, e2 = FLOW
    psi = math.atan2(d.dot(e2), d.dot(e1))
    w = 0.5 - 0.5 * math.cos(n * psi + 0.6 * math.sin(3 * psi))
    conv = K.smoothstep(0.98, 0.6, d.dot(a))  # grooves fade out where they meet the bun
    return 1 - depth * (w ** 3) * conv


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


hs = []
# side-swept forehead lock (part on character's left / viewer's right, sweeping across the forehead)
part = V((0.42, -0.55, 0.75)).normalized()
for o in hs:
    K.subsurf(o, 1)


# curly tendrils at the temples
def tendril(name, top, length, turns, rad, tube, sg):
    pts = []
    n = 48
    for k in range(n):
        t = k / (n - 1)
        a = t * turns * K.TAU
        pts.append(top + V((sg * math.cos(a) * rad * (0.6 + 0.4 * t), -math.sin(a) * rad * (0.6 + 0.4 * t), -t * length)))
    return K.subsurf(K.sweep(name, pts, lambda t: (tube * (1 - 0.7 * t), tube * (1 - 0.7 * t)), nprof=8, mat=M['hair']), 1)


tendril('TendrilR', head_raw(V((0.92, -0.38, -0.05)).normalized()) + V((0.004, -0.004, 0.0)), 0.085, 1.6, 0.009, 0.0055, 1)
tendril('TendrilL', head_raw(V((-0.93, -0.33, 0.05)).normalized()) + V((-0.006, -0.004, 0.0)), 0.06, 1.3, 0.008, 0.005, -1)

# bun: dark core + ringlet coils
K.subsurf(K.ellipsoid('BunCore', BUN, (P['bun_r'] * 0.86, P['bun_r'] * 0.8, P['bun_r'] * 0.86), mat=M['bun']), 1)
golden = math.pi * (3 - math.sqrt(5))
for k in range(26):
    zz = 1 - 2 * (k + 0.5) / 26
    rr = math.sqrt(1 - zz * zz)
    d = V((math.cos(golden * k) * rr, math.sin(golden * k) * rr, zz))
    if d.dot(-bun_dir) > 0.55:  # inside the head: skip
        continue
    cen = BUN + d * P['bun_r'] * 0.82
    t1 = d.cross(V((0, 0, 1)) if abs(d.z) < 0.9 else V((1, 0, 0))).normalized()
    t2 = d.cross(t1)
    rad = P['bun_r'] * rnd.uniform(0.30, 0.42)
    pts = []
    for i in range(40):
        t = i / 39
        a = t * K.TAU * 1.15 + rnd.random()
        rr2 = rad * (1 - 0.45 * t)
        pts.append(cen + (t1 * math.cos(a) + t2 * math.sin(a)) * rr2 + d * (0.25 - t * 0.5) * rad)
    K.subsurf(K.sweep(f'Curl{k}', pts, lambda t: (0.013 * (1 - 0.6 * t), 0.011 * (1 - 0.6 * t)), nprof=10, mat=M['bun'], uv_len=3), 1)

# ================================================================== BODY (union of arms + hands + legs + neck)
def arm_parts(sg):
    S, E, W, Hc = [V((sg * v.x, v.y, v.z)) for v in (P['shoulder'], P['elbow'], P['wrist'], P['hand_c'])]
    parts = [K.capsule('ua', S, E, 0.030, 0.024), K.capsule('fa', E, W, 0.023, 0.016)]
    inward = V((-sg, 0, 0))
    parts.append(K.ellipsoid('palm', Hc, (0.0105, 0.020, 0.022), nu=20, nv=14))
    parts.append(K.capsule('wristj', W, Hc + V((0, 0, 0.01)), 0.0165, 0.016))
    kz = Hc.z - 0.016
    for i, (oy, ln) in enumerate([(-0.0128, 0.023), (-0.0042, 0.027), (0.0045, 0.025), (0.0128, 0.020)]):
        k0 = V((Hc.x + inward.x * 0.001, Hc.y + oy, kz))
        mid = k0 + V((inward.x * 0.003, oy * 0.12, -ln * 0.55))
        tip = mid + V((inward.x * 0.007, oy * 0.08, -ln * 0.45))
        rr = 0.0056 if i < 3 else 0.0050
        parts.append(K.capsule(f'f{i}a', k0, mid, rr, rr * 0.95, nprof=12, nseg=6))
        parts.append(K.capsule(f'f{i}b', mid, tip, rr * 0.95, rr * 0.82, nprof=12, nseg=6))
    t0 = Hc + V((inward.x * 0.006, -0.016, 0.006))
    t1 = t0 + V((inward.x * 0.006, -0.008, -0.014))
    t2 = t1 + V((inward.x * 0.004, -0.002, -0.010))
    parts += [K.capsule('th1', t0, t1, 0.0068, 0.0062, nprof=12, nseg=6), K.capsule('th2', t1, t2, 0.0062, 0.0055, nprof=12, nseg=6)]
    return parts


for sg in (1, -1):
    K.union(f'Arm{sg}', arm_parts(sg), voxel=0.0016, smooth_iter=8, smooth_factor=0.5, decimate=0.25, mat=M['skinPlain'])
legs = []
for sg in (1, -1):
    legs.append(K.capsule('leg', V((sg * 0.050, 0.0, 0.26)), V((sg * 0.043, 0.0, 0.05)), 0.026, 0.017))
K.union('Legs', legs, voxel=0.003, smooth_iter=4, decimate=0.3, mat=M['tights'])
K.subsurf(K.capsule('Neck', V((0, 0.012, 0.715)), V((0, 0.012, 0.620)), 0.040, 0.044), 0)
bpy.data.objects['Neck'].data.materials.append(M['skinPlain'])

# shoes: rounded toe Mary Janes
for sg in (1, -1):
    fc = V((sg * 0.043, -0.012, 0.021))
    parts = [K.ellipsoid('toe', fc + V((0, -0.016, -0.001)), (0.022, 0.034, 0.020)),
             K.ellipsoid('heel', fc + V((0, 0.018, 0.0)), (0.019, 0.022, 0.021)),
             K.capsule('ank', V((sg * 0.043, 0.004, 0.025)), V((sg * 0.043, 0.004, 0.05)), 0.018, 0.0175)]
    sh = K.union(f'Shoe{sg}', parts, voxel=0.0018, smooth_iter=6, decimate=0.3, mat=M['shoe'])
    for v in sh.data.vertices:
        if v.co.z < 0.004:
            v.co.z = 0.0
    # strap
    sp = [V((sg * 0.043 + math.cos(a) * 0.0215, -0.006 + math.sin(a) * 0.004, 0.026 + math.sin(a) * 0.0 + 0.012 * math.sin(a * 0.5 + 0.8)))
          for a in [math.pi * (i / 15) for i in range(16)]]
    K.sweep(f'Strap{sg}', sp, lambda t: (0.0035, 0.0018), nprof=8, mat=M['shoe'], up=V((0, -1, 0)))

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
# waistband
K.subsurf(K.lathe('Waistband', [(0.086, 0.071, 0.494), (0.087, 0.072, 0.484), (0.087, 0.072, 0.474), (0.086, 0.071, 0.464)],
                  nu=64, mat=M['trim'], uv_scale=(1, 1)), 1)


# skirt: bell with folds
def skirt_r(t):
    rw, rh = (0.080, 0.066), (P['hem_rx'], P['hem_ry'])
    k = 0.55 * t + 0.45 * (1 - (1 - t) ** 2.6)
    return (K.lerp(rw[0], rh[0], k), K.lerp(rw[1], rh[1], k))


Z0, Z1 = 0.478, P['hem_z'] + 0.03
NS = 36
fold_ph = [rnd.random() * K.TAU for _ in range(4)]


def fold(t, th):
    a = 0.012 + 0.07 * t
    return 1 + a * (0.65 * math.cos(16 * th + fold_ph[0]) + 0.25 * math.cos(7 * th + fold_ph[1]) + 0.1 * math.cos(23 * th + fold_ph[2]))


sk = [(*skirt_r(i / (NS - 1)), K.lerp(Z0, Z1, i / (NS - 1))) for i in range(NS)]
K.subsurf(K.lathe('Skirt', sk, nu=128, mat=M['floral'], disp=lambda u, v, th: fold(v, th), uv_scale=(4, 1.5)), 1)
# lace hem band (follows the skirt folds, scalloped lower edge)
def lace_band(u, v):
    th = u * K.TAU
    z = K.lerp(Z1 + 0.004, P['hem_z'] - 0.002 - 0.004 * abs(math.sin(th * 24)) * v, v)
    rx, ry = skirt_r(1.0)
    s = fold(1.0, th) * (1.012 + 0.03 * v)
    return V((math.sin(th) * rx * s, -math.cos(th) * ry * s, z))
K.subsurf(K.surface('Lace', lace_band, 192, 6, wrap_u=True, mat=M['lace'], uv=lambda i, j: (j / 192 * 4, i / 5)), 1)
# underskirt peeking below
def under(u, v):
    th = u * K.TAU
    rx, ry = skirt_r(0.96)
    s = (0.97 + 0.015 * math.cos(th * 20)) * (1 + 0.02 * v)
    z = K.lerp(0.25, P['hem_z'] - 0.035 - 0.004 * math.sin(th * 20), v ** 0.5)
    k = K.lerp(0.6, 1.0, v)
    return V((math.sin(th) * rx * s * k, -math.cos(th) * ry * s * k, z))
K.subsurf(K.surface('Underskirt', under, 128, 10, wrap_u=True, mat=M['under']), 1)

# ------------------------------------------------------------------ export
for o in bpy.context.scene.objects:
    o.data.name = o.name
K.export_glb(OUT)
tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects for p in o.data.polygons)
print('EXPORTED', OUT, 'objects', len(bpy.context.scene.objects), 'tris', tris)
