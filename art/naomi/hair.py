"""Naomi hair v2 (round 26+): big sculpted masses, not strands.

  * a smooth hair volume (cap) offset from the scalp; it rises high on the head and dives under the skin outside
    the hairline (no hard black band); the skin texture paints a thin darker transition at the hairline
  * 8 large, fat, tapered clumps with rounded cross-sections sweeping from the hairline back and up to the bun;
    they overlap with soft valleys (the front three form the board's side-swept forehead lock)
  * bun high on the back toward her right: a core + 10 soft S-curve curly locks + 3 hanging ringlets
  * 2 thin tapered face-framing spirals in front of the ears
Shading (strand-direction texture + normal map, double anisotropic highlight) is applied in web/lib/look.js.
"""
import math, random
from mathutils import Vector as V
import head as HD

P = dict(
    bun=V((-0.170, 0.160, 0.862)), bun_r=(0.084, 0.082, 0.140),   # tall oval chignon (board: y 96..182 px)
    t_top=0.016, t_front=0.020, t_side=0.012, t_back=0.022,
)


def slerp(a, b, t):
    om = a.angle(b)
    if om < 1e-6:
        return a.copy()
    return ((a * math.sin((1 - t) * om) + b * math.sin(t * om)) / math.sin(om)).normalized()


def dirs_path(ws, n):
    ws = [w.normalized() for w in ws]
    out, seg = [], len(ws) - 1
    for k in range(n):
        t = k / (n - 1) * seg
        i = min(int(t), seg - 1)
        out.append(slerp(ws[i], ws[i + 1], t - i))
    return out


def thick(d):
    """Hair volume above the scalp for direction d (units)."""
    t = P['t_side'] + (P['t_top'] - P['t_side']) * max(0.0, d.z) ** 1.1
    t += (P['t_back'] - P['t_side']) * max(0.0, d.y) * 0.8 + (P['t_front'] - P['t_side']) * max(0.0, -d.y) * max(0.0, d.z)
    t += 0.012 * HD.gauss_ang(d, V((-0.55, 0.30, 0.78)), 0.45)     # dome peaks toward her right/back (board silhouette)
    return t


def cap_point(d, lift=0.0):
    s = HD.surf(d)
    keep = HD.hair_keep(s)
    k = HD.smooth(-0.002, 0.016, keep)                 # rounded lip at the hairline
    sink = 0.012 * HD.smooth(0.0, -0.02, keep)         # outside the hairline the volume dives under the skin
    n = (s - HD.H['C']).normalized()
    return s + n * (thick(d) * k - sink + lift)


def build(K, M):
    C = HD.H['C']
    B = P['bun']
    bun_dir = (B - C).normalized()
    out = {'bun_dir': bun_dir}
    # ---------- hair volume
    NU, NV = 120, 84

    def sphere_dir(u, v):
        th, ph = u * 2 * math.pi, v * math.pi
        return V((math.sin(ph) * math.sin(th), -math.sin(ph) * math.cos(th), math.cos(ph)))
    rows = [[cap_point(sphere_dir(j / NU, i / (NV - 1))) for j in range(NU)] for i in range(NV)]
    keep = lambda i, j: HD.hair_keep(HD.surf(sphere_dir((j + 0.5) / NU, (i + 0.5) / (NV - 1)))) > -0.03
    cap = K.build('HairCap', rows, wrap_u=True, mat=M['hair'], orient=C, keep=keep,
                  uv=lambda i, j: (j / NU * 6.0, i / (NV - 1) * 4.0))
    K.subsurf(cap, 1)

    # ---------- 8 big clumps (fat, rounded, tapered), riding on the volume
    def clump(name, ws, width, th, n=56, lift=0.0):
        ds = dirs_path(ws, n)
        pts, nrm = [], []
        for k, d in enumerate(ds):
            t = k / (n - 1)
            prof_t = th * (0.18 + 0.82 * math.sin(math.pi * min(1.0, 0.02 + t * 0.98)) ** 0.55)
            p = cap_point(d, lift * math.sin(math.pi * t)) + (cap_point(d) - C).normalized() * (prof_t * 0.42)
            pts.append(p); nrm.append((p - C).normalized())
        prof = lambda t: (th * (0.18 + 0.82 * math.sin(math.pi * min(1.0, 0.02 + t * 0.98)) ** 0.55) * 0.5,
                          width * (0.22 + 0.78 * math.sin(math.pi * min(1.0, 0.04 + t * 0.96)) ** 0.5) * 0.5)
        ob = K.sweep(name, pts, prof, nprof=14, mat=M['hair'], normals=nrm, uv_len=3.0)
        return K.subsurf(ob, 1)

    bd = bun_dir
    CL = [
        # side-swept forehead lock: from the parting on her left, across the forehead, down her right temple, back to the bun
        ('HairClump_S1', [V((0.34, -0.60, 0.72)), V((-0.02, -0.80, 0.60)), V((-0.70, -0.62, 0.32)), V((-0.96, 0.02, 0.26)), bd], 0.070, 0.030, 0.004),
        ('HairClump_S2', [V((0.36, -0.48, 0.80)), V((0.00, -0.66, 0.75)), V((-0.60, -0.48, 0.62)), V((-0.86, 0.12, 0.50)), bd], 0.080, 0.032, 0.006),
        ('HairClump_S3', [V((0.26, -0.34, 0.90)), V((-0.18, -0.30, 0.94)), V((-0.60, 0.15, 0.78)), bd], 0.090, 0.032, 0.006),
        # her left side, from the left temple back over the crown to the bun
        ('HairClump_L1', [V((0.62, -0.52, 0.58)), V((0.86, 0.02, 0.50)), V((0.42, 0.74, 0.52)), bd], 0.075, 0.028, 0.002),
        ('HairClump_L2', [V((0.46, -0.30, 0.84)), V((0.44, 0.32, 0.85)), V((-0.08, 0.74, 0.66)), bd], 0.085, 0.030, 0.004),
        # nape + behind her right ear, rising to the bun
        ('HairClump_N1', [V((0.52, 0.66, -0.40)), V((0.16, 0.86, -0.02)), bd], 0.085, 0.026, 0.0),
        ('HairClump_N2', [V((-0.38, 0.80, -0.46)), V((-0.56, 0.74, -0.06)), bd], 0.080, 0.026, 0.0),
        ('HairClump_R1', [V((-0.90, 0.28, -0.12)), V((-0.84, 0.46, 0.16)), bd], 0.070, 0.024, 0.0),
    ]
    for name, ws, w, th, lift in CL:
        clump(name, ws, w, th, lift=lift)

    # ---------- bun: core + 10 S-curve curly locks + 3 hanging ringlets
    br = random.Random(41)
    K.subsurf(K.ellipsoid('BunCore', B, (P['bun_r'][0] * 0.82, P['bun_r'][1] * 0.82, P['bun_r'][2] * 0.82), mat=M['bun']), 1)

    def bun_lock(name, axis, start, sweep, layer, width, th, amp, freq):
        axis = axis.normalized()
        start = (start - axis * start.dot(axis)).normalized()
        side = axis.cross(start)
        pts, nrm = [], []
        n = 48
        for k in range(n):
            t = k / (n - 1)
            a = sweep * t
            d = (start * math.cos(a) + side * math.sin(a) + axis * amp * math.sin(freq * math.pi * t)).normalized()
            rr = V((P['bun_r'][0] * d.x, P['bun_r'][1] * d.y, P['bun_r'][2] * d.z)).length * layer * (1 + 0.06 * math.sin(math.pi * t))
            p = B + d * rr
            pts.append(p); nrm.append((p - B).normalized())
        prof = lambda t: (th * (0.25 + 0.75 * math.sin(math.pi * t) ** 0.6) * 0.5, width * (0.25 + 0.75 * math.sin(math.pi * t) ** 0.5) * 0.5)
        return K.subsurf(K.sweep(name, pts, prof, nprof=12, mat=M['bun'], normals=nrm, uv_len=2.5), 1)
    for k in range(10):
        ax = V((br.uniform(-1, 1), br.uniform(-1, 1), br.uniform(-1, 1)))
        st = V((br.uniform(-1, 1), br.uniform(-1, 1), br.uniform(-1, 1)))
        bun_lock(f'BunLock{k}', ax, st, math.radians(br.uniform(200, 290)), 0.90 + 0.10 * (k % 3) / 2, br.uniform(0.034, 0.044),
                 br.uniform(0.018, 0.024), br.uniform(0.18, 0.30), br.choice((2, 3)))
    for k in range(3):   # hanging ringlets below the bun, toward her right (board: curls at the lower left of the bun)
        base = B + V((-0.035 - 0.02 * k, 0.02 - 0.03 * k, -P['bun_r'][2] * 0.75))
        ph = br.random() * 2 * math.pi
        ln = 0.050 + 0.012 * k
        pts = [base + V((math.cos(ph + t * 2.4 * 2 * math.pi) * 0.010 * (1 + 0.5 * t) - 0.012 * t, math.sin(ph + t * 2.4 * 2 * math.pi) * 0.010 * (1 + 0.5 * t),
                         -t * ln)) for t in [i / 59 for i in range(60)]]
        K.subsurf(K.sweep(f'BunCurl{k}', pts, lambda t: (0.0065 * (1 - 0.55 * t) + 0.001, 0.006 * (1 - 0.55 * t) + 0.001), nprof=10,
                          mat=M['bun'], uv_len=3.0), 1)

    # ---------- 2 face-framing curls (thin tapered spirals) in front of the ears
    for sg, top, ln, turns in ((-1, V((-0.118, -0.050, 0.832)), 0.090, 2.6), (1, V((0.116, -0.040, 0.800)), 0.105, 2.9)):
        ph = br.random() * 2 * math.pi
        pts = []
        for k in range(80):
            t = k / 79
            a = ph + t * turns * 2 * math.pi
            r = 0.0055 + 0.0055 * t
            pts.append(top + V((sg * (0.004 * t) + math.cos(a) * r, -math.sin(a) * r - 0.008 * t, -t * ln)))
        K.subsurf(K.sweep(f'FaceCurl{sg}', pts, lambda t: (0.0034 * (1 - 0.65 * t) + 0.0005, 0.0034 * (1 - 0.65 * t) + 0.0005), nprof=8,
                          mat=M['hair'], uv_len=4.0), 1)
    return out
