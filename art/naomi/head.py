"""Naomi head v2 (round 26+): one subdivided base mesh, carved eye sockets, painted brows/lips/blush.

Workflow (sculpt-style):
  1. quad-sphere base mesh (6 x N x N quads) with an equirectangular UV layout
  2. coarse forms on the base vertices: head mass, apple cheeks (widest part of the face), short round chin,
     slight brow ridge, tucked temples, jaw tucking into a thin neck
  3. Catmull-Clark subdivision level 2
  4. detail pass on the subdivided vertices: eye sockets carved into the mesh (lids are skin of the head mesh,
     the eyeball shows through the aperture), button nose, closed smile with fuller lower lip, corner dimples
  5. skin texture painted per texel from a baked world-position map: base tan, blush, brows, lips, lid lines,
     hairline transition (+ baked AO multiplied in, see build_naomi.py)
Design targets come from refs/naomi_landmarks.json through the reference camera (17 deg yaw, 9 deg elevation):
  chin z .676, mouth .727, nose tip .755, eye centres .791, brows .864, hairline .928; iris centres x +-.064,
  inner corners +-.032, outer corners +-.105; cheek half-width ~.118.
Blender coords: Z up, face toward -Y, her left = +X.
"""
import math
import bmesh, bpy
import numpy as np
from mathutils import Vector as V, Matrix
from mathutils.bvhtree import BVHTree

# ----------------------------------------------------------------------------------------------- parameters
H = dict(
    C=V((0.0, 0.0, 0.818)), a=0.126, bf=0.112, bb=0.126, c_top=0.152, c_bot=0.160,
    eye_x=0.0639, eye_z=0.801, eye_front_y=-0.108, eye_r=0.043, iris_deg=56.0,   # round 28: set into the face, raised
    ap_in=58.0, ap_out=80.0, lid_up=50.0, lid_low=-60.0, corner_in=-4.0, corner_out=8.0,
    nose_z=0.755, mouth_z=0.727, mouth_hw=0.0285, chin_z=0.676,
    brow_z=0.864, brow_x0=0.034, brow_x1=0.104, brow_arch=0.010, brow_thick=0.0078,
    base_n=16,
)
# hairline height (scalp z) by azimuth phi (0 = front, + toward her left): asymmetric like the board's swoop
HAIRLINE = [(-180, 0.700), (-140, 0.735), (-105, 0.785), (-80, 0.826), (-45, 0.885), (0, 0.928), (35, 0.905),
            (62, 0.872), (95, 0.800), (140, 0.735), (180, 0.700)]


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def gauss_ang(d, c, s):
    c = c.normalized()
    ang = math.acos(max(-1.0, min(1.0, d.dot(c))))
    return math.exp(-(ang * ang) / (2 * s * s))


# coarse forms: (direction, amplitude as fraction of radius, sigma in radians)
FORMS = [
    (V((0.62, -0.62, -0.42)), 0.135, 0.36), (V((-0.62, -0.62, -0.42)), 0.135, 0.36),   # apple cheeks (widest part)
    (V((0.0, -0.72, -0.69)), 0.060, 0.17),                                             # short round chin under the mouth (round 29)
    (V((0.62, -0.45, -0.64)), -0.095, 0.27), (V((-0.62, -0.45, -0.64)), -0.095, 0.27),  # jaw sides curve up to the chin (round 29)
    (V((0.0, 0.45, -0.90)), -0.20, 0.40),                                              # underside/back -> thin neck
    (V((0.50, -0.84, -0.22)), -0.035, 0.16), (V((-0.50, -0.84, -0.22)), -0.035, 0.16),  # shallow eye sockets
    (V((0.86, -0.30, 0.28)), -0.045, 0.24), (V((-0.86, -0.30, 0.28)), -0.045, 0.24),   # temples tuck in
    (V((0.38, -0.86, 0.36)), 0.022, 0.17), (V((-0.38, -0.86, 0.36)), 0.022, 0.17),    # slight brow ridge
    (V((0.0, -0.85, 0.5)), 0.012, 0.35),                                               # forehead fullness
    (V((0.0, -1.0, 0.0)), -0.018, 0.45),                                               # soften front plane
]


def surf(d):
    """Coarse head surface for unit direction d (also used by the hair to find the scalp)."""
    C = H['C']
    p = V((d.x * H['a'], d.y * (H['bf'] if d.y < 0 else H['bb']), d.z * (H['c_top'] if d.z > 0 else H['c_bot'])))
    k = 1.0
    for c, amp, s in FORMS:
        k += amp * gauss_ang(d, c, s)
    return C + p * k


def azimuth(p):
    """Azimuth of a point around the head's vertical axis: 0 = front, + toward her left (+X)."""
    q = p - H['C']
    return math.degrees(math.atan2(q.x, -q.y))


def hairline_z(phi):
    for (a0, z0), (a1, z1) in zip(HAIRLINE, HAIRLINE[1:]):
        if a0 <= phi <= a1:
            t = (phi - a0) / (a1 - a0)
            t = t * t * (3 - 2 * t)
            return z0 + (z1 - z0) * t
    return HAIRLINE[-1][1]


def hair_keep(p):
    """Signed distance-like value (units of z): > 0 inside the hair region on the scalp."""
    return p.z - hairline_z(azimuth(p))


# ----------------------------------------------------------------------------------------------- eyes
def eye_frame(sg):
    """sg=-1 her right eye, +1 her left eye. Returns (E centre, f gaze, u up, o outward)."""
    re = H['eye_r']
    f = V((0.0, -1.0, 0.0))
    E = V((sg * H['eye_x'], H['eye_front_y'] + re, H['eye_z']))
    u = V((0.0, 0.0, 1.0))
    o = V((sg * 1.0, 0.0, 0.0))
    return E, f, u, o


def aperture(t):
    """Upper/lower lid edge elevations (radians) at t in [0 inner corner, 1 outer corner]; azimuth alpha (radians, + outward)."""
    ai, ao = math.radians(H['ap_in']), math.radians(H['ap_out'])
    alpha = -ai + (ai + ao) * t
    base = math.radians(H['corner_in'] + (H['corner_out'] - H['corner_in']) * t)
    s = math.sin(math.pi * min(1.0, max(0.0, t)))
    up = base + (math.radians(H['lid_up']) - base) * s ** 0.62 * (1 + 0.06 * math.sin(math.pi * (t - 0.1)))
    lo = base + (math.radians(H['lid_low']) - base) * s ** 0.75
    return alpha, up, lo


def eye_dir(E, f, u, o, alpha, beta):
    return (f * (math.cos(beta) * math.cos(alpha)) + o * (math.cos(beta) * math.sin(alpha)) + u * math.sin(beta)).normalized()


def aperture_sd(v, f, u, o):
    """Signed angular distance (radians) of local direction v from the eye aperture: < 0 inside the opening."""
    x, y, z = v.dot(o), v.dot(u), v.dot(f)
    alpha = math.atan2(x, z)
    beta = math.atan2(y, math.hypot(x, z))
    ai, ao = math.radians(H['ap_in']), math.radians(H['ap_out'])
    t = (alpha + ai) / (ai + ao)
    tc = min(1.0, max(0.0, t))
    _, up, lo = aperture(tc)
    side = max(-ai - alpha, alpha - ao)
    return max(beta - up, lo - beta, side), t


# ----------------------------------------------------------------------------------------------- mesh helpers
def quad_sphere(name, n):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UVMap')
    verts = {}

    def vert(p):
        key = (round(p.x, 6), round(p.y, 6), round(p.z, 6))
        if key not in verts:
            verts[key] = bm.verts.new(p.normalized())
        return verts[key]
    axes = [(V((1, 0, 0)), V((0, 1, 0)), V((0, 0, 1))), (V((-1, 0, 0)), V((0, -1, 0)), V((0, 0, 1))),
            (V((0, 1, 0)), V((-1, 0, 0)), V((0, 0, 1))), (V((0, -1, 0)), V((1, 0, 0)), V((0, 0, 1))),
            (V((0, 0, 1)), V((1, 0, 0)), V((0, 1, 0))), (V((0, 0, -1)), V((1, 0, 0)), V((0, -1, 0)))]
    for nrm, ua, va in axes:
        g = [[vert(nrm + ua * (2 * i / n - 1) + va * (2 * j / n - 1)) for i in range(n + 1)] for j in range(n + 1)]
        for j in range(n):
            for i in range(n):
                q = [g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]]
                try:
                    bm.faces.new(q)
                except ValueError:
                    pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # equirectangular UVs from the sphere direction, front (-Y) at u = 0.5; fix the seam per face
    for f in bm.faces:
        uvs = []
        for lp in f.loops:
            d = lp.vert.co
            lon = math.atan2(d.x, -d.y)
            lat = math.asin(max(-1, min(1, d.z)))
            uvs.append([lon / (2 * math.pi) + 0.5, lat / math.pi + 0.5])
        us = [a[0] for a in uvs]
        if max(us) - min(us) > 0.5:
            for a in uvs:
                if a[0] < 0.5:
                    a[0] += 1.0
        for lp, a in zip(f.loops, uvs):
            lp[uvl].uv = a
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def sweep_simple(K, name, pts, prof, mat, normals, nprof=8):
    return K.sweep(name, pts, prof, nprof=nprof, mat=mat, normals=normals)


# ----------------------------------------------------------------------------------------------- build
def build(K, M):
    """Builds head mesh, eyes, cornea, lashes, lid lines, ears; returns info dict used by hair/LM/paint."""
    C = H['C']
    head = quad_sphere('Head', H['base_n'])
    me = head.data
    for v in me.vertices:
        v.co = surf(V(v.co).normalized())
    K.subsurf(head, 2)
    me = head.data

    # ---------- detail pass (on subdivided vertices)
    re = H['eye_r']
    frames = {sg: eye_frame(sg) for sg in (-1, 1)}
    MZ, mhw = H['mouth_z'], H['mouth_hw']
    nose_base = surf(V((0, -1, (H['nose_z'] - C.z) / H['c_bot'])).normalized())

    def mouth_curve_z(x):
        return MZ + 0.0032 * (x / mhw) ** 2

    for v in me.vertices:
        p = V(v.co)
        rdir = (p - C).normalized()
        disp = 0.0
        # nose: small rounded button + nostril wings + soft undercut
        dn = (p - nose_base)
        disp += 0.0125 * math.exp(-(dn.x ** 2 / (2 * 0.0095 ** 2) + (dn.z - 0.001) ** 2 / (2 * 0.0080 ** 2))) * (p.y < 0)
        for sx in (-1, 1):
            disp += 0.0035 * math.exp(-((p.x - sx * 0.0105) ** 2 + (p.z - (H['nose_z'] - 0.004)) ** 2) / (2 * 0.0045 ** 2)) * (p.y < 0)
        disp -= 0.0022 * math.exp(-(p.x ** 2 / (2 * 0.010 ** 2) + (p.z - (H['nose_z'] - 0.0105)) ** 2 / (2 * 0.0030 ** 2))) * (p.y < 0)
        # mouth: groove, fuller lower lip, subtle upper lip, corner dimples
        if p.y < 0 and abs(p.x) < 0.05 and abs(p.z - MZ) < 0.03:
            xm = max(-mhw * 1.05, min(mhw * 1.05, p.x))
            dz = p.z - mouth_curve_z(xm)
            edge = math.exp(-max(0.0, abs(p.x) - mhw) ** 2 / (2 * 0.003 ** 2))
            disp -= 0.0016 * math.exp(-dz * dz / (2 * 0.0019 ** 2)) * edge
            disp += 0.0034 * math.exp(-(p.x ** 2 / (2 * 0.0125 ** 2) + (p.z - (MZ - 0.0058)) ** 2 / (2 * 0.0034 ** 2)))
            disp += 0.0013 * math.exp(-(p.x ** 2 / (2 * 0.0130 ** 2) + (p.z - (MZ + 0.0042)) ** 2 / (2 * 0.0026 ** 2)))
            for sx in (-1, 1):
                disp -= 0.0018 * math.exp(-((p.x - sx * (mhw + 0.0025)) ** 2 + (p.z - (MZ + 0.0040)) ** 2) / (2 * 0.0026 ** 2))
        p = p + rdir * disp
        # eye sockets carved into the mesh: lids are this skin resting on the eyeball. Vertices move along the HEAD
        # normal (ray from the head centre), never toward the eye centre, so they keep their spacing (no streaks).
        for sg, (E, f, u, o) in frames.items():
            w = p - E
            rho = w.length
            if rho > re * 2.6 or w.dot(f) < 0.10 * rho:
                continue
            sd, t = aperture_sd(w / rho, f, u, o)
            n = (p - C).normalized()
            s_now = (p - C).dot(n)
            lid = 0.010 + 0.020 * smooth(0.0, 0.10, sd) if sd >= 0 else 0.0
            R = re * (1.0 + lid)
            b = n.dot(C - E)
            disc = b * b - ((C - E).length_squared - R * R)
            if disc < 0:
                continue
            s_out = -b + math.sqrt(disc)                # where this head-normal ray leaves the (lid-padded) eyeball
            graze = smooth(0.0, (0.30 * R) ** 2, disc)      # round 30: fade out as the ray approaches tangency (no seam)
            if sd < 0:
                target = min(s_now, s_out - 0.14 * re * smooth(0.0, 0.035, -sd))   # inside the opening: behind the eye
                wgt = graze
            else:
                target = max(s_now, s_out)                  # outside the opening: lids only ever rest ON the eye
                wgt = (1.0 - smooth(0.03, 0.30, sd)) * graze
            if wgt <= 0:
                continue
            p = C + n * (s_now + (target - s_now) * wgt)
        v.co = p
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.append(M['skin'])

    # ---------- eyes: eyeball (planar-projected iris texture), cornea dome, lash line + outer flicks, lower lid line
    info = {'frames': frames, 'lash_mid': {}, 'corners': {}}
    iris_t = math.radians(H['iris_deg'])
    for sg, (E, f, u, o) in frames.items():
        X = V((1, 0, 0))   # texture x = screen right for both eyes, so painted highlights sit upper-left on both

        def eyeball(uu, vv, E=E):
            th, ph = uu * 2 * math.pi, vv * math.pi
            dl = V((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))  # z = forward
            return E + (X * dl.x + u * dl.y + f * dl.z) * re

        def eye_uv(i, j, n=48, m=36):
            th, ph = j / n * 2 * math.pi, i / (m - 1) * math.pi
            return (0.5 + 0.5 * math.sin(ph) * math.cos(th), 0.5 + 0.5 * math.sin(ph) * math.sin(th))
        K.subsurf(K.surface(f'Eye{sg}', eyeball, 48, 36, wrap_u=True, mat=M['eye'], uv=eye_uv), 1)

        def cornea(uu, vv, E=E):
            th, ph = uu * 2 * math.pi, vv * math.radians(80)
            bul = 1.002 + 0.075 * max(0.0, math.cos(min(ph, iris_t) / iris_t * math.pi / 2)) ** 1.6 * (ph < iris_t)
            dl = V((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))
            return E + (X * dl.x + u * dl.y + f * dl.z) * re * bul
        K.subsurf(K.surface(f'Cornea{sg}', cornea, 40, 18, wrap_u=True, mat=M['cornea'], orient=E), 1)

        # thick dark upper lid line wrapping over the iris top, thickening toward the outer corner
        pts, nrm = [], []
        for k in range(48):
            t = 0.01 + 1.03 * k / 47
            alpha, up, lo = aperture(min(1.0, t))
            if t > 1.0:
                alpha += math.radians(H['ap_in'] + H['ap_out']) * (t - 1.0)
                up += math.radians(30) * (t - 1.0)
            d = eye_dir(E, f, u, o, alpha, up + math.radians(1.5))
            pts.append(E + d * re * 1.035); nrm.append(d)
        K.subsurf(K.sweep(f'LashLine{sg}', pts, lambda t: (0.0024 + 0.0012 * t, 0.0016 + 0.0042 * t ** 1.25), nprof=8,
                          mat=M['lash'], normals=nrm), 1)
        info['lash_mid'][sg] = pts[len(pts) // 2]
        # 4 lashes flicking outward at the outer corner
        for k, (t0, ln) in enumerate([(0.70, 0.010), (0.80, 0.012), (0.90, 0.0145), (0.99, 0.017)]):
            alpha, up, lo = aperture(t0)
            d0 = eye_dir(E, f, u, o, alpha, up + math.radians(2))
            p0 = E + d0 * re * 1.04
            tip = (o * 0.85 + u * 0.55 + f * 0.25).normalized()
            lp = [p0 + tip * (ln * s) + u * (ln * 0.55 * s * s) for s in [i / 9 for i in range(10)]]
            K.subsurf(K.sweep(f'LashFlick{sg}_{k}', lp, lambda s: (0.0016 * (1 - s) ** 0.8 + 0.0002, 0.0011 * (1 - s) + 0.00015),
                              nprof=6, mat=M['lash'], up=f), 1)
        # thin soft lower lid line
        pts, nrm = [], []
        for k in range(30):
            t = 0.12 + 0.84 * k / 29
            alpha, up, lo = aperture(t)
            d = eye_dir(E, f, u, o, alpha, lo - math.radians(1.0))
            pts.append(E + d * re * 1.018); nrm.append(d)
        K.sweep(f'LidLineLow{sg}', pts, lambda t: (0.0006 + 0.0004 * math.sin(math.pi * t), 0.0008 * math.sin(math.pi * t) + 0.0002),
                nprof=6, mat=M['lidline'], normals=nrm)
        a0, up0, _ = aperture(0.0)
        a1, up1, _ = aperture(1.0)
        info['corners'][sg] = (E + eye_dir(E, f, u, o, a0, up0) * re * 1.01, E + eye_dir(E, f, u, o, a1, up1) * re * 1.01)

    # ---------- ears: sized/placed per landmarks (top z ~.786, bottom ~.727), concha + rim, half under the hair
    for sg in (-1, 1):
        # ear-local frame: n = outward face normal, a = forward (along the head), b = up
        ec = V((sg * 0.146, 0.048, 0.757))
        n_ = V((sg * 0.92, -0.38, 0.0)).normalized(); b_ = V((0, 0, 1)); a_ = b_.cross(n_).normalized() * sg
        if a_.y > 0:
            a_ = -a_
        L = lambda x, y, zz=0.0: ec + a_ * x + b_ * y + n_ * zz
        parts = []
        # helix rim: C-shaped roll from the front-top, over the top, down the back, into the lobe
        rim = [L(0.012 * math.cos(t) - 0.002, 0.026 * math.sin(t) * (1 if math.sin(t) > 0 else 1.05), -0.002 + 0.004 * math.sin(t * 0.5))
               for t in [math.radians(70 + 270 * k / 39) for k in range(40)]]
        parts.append(K.sweep('rim', rim, lambda t: (0.0042 * (1 - 0.3 * t), 0.0046 * (1 - 0.2 * t)), nprof=10))
        # recessed bowl (concha) plate and the lobe
        parts.append(K.ellipsoid('plate', L(0.0, -0.002, -0.004), (0.011, 0.023, 0.004), rot=Matrix((a_, b_, n_)).transposed(), nu=20, nv=12))
        parts.append(K.ellipsoid('lobe', L(-0.001, -0.022, -0.0015), (0.0075, 0.0085, 0.0048), rot=Matrix((a_, b_, n_)).transposed(), nu=16, nv=10))
        parts.append(K.capsule('root', L(0.006, 0.0, -0.010), L(0.012, 0.0, -0.022), 0.010, 0.012))   # joins the ear to the head side
        ear = K.union(f'Ear{sg}', parts, voxel=0.0011, smooth_iter=4, smooth_factor=0.5, decimate=0.35, mat=M['skinPlain'])
        ep = ec + V((sg * 0.004, -0.004, -0.036))
        K.subsurf(K.ellipsoid(f'EarringHook{sg}', ep + V((0, 0, 0.007)), (0.0026, 0.0026, 0.0065), mat=M['gold'], nu=12, nv=8), 1)
        K.subsurf(K.ellipsoid(f'Earring{sg}', ep - V((0, 0, 0.004)), (0.0062, 0.0062, 0.0088), mat=M['gold'], nu=16, nv=10), 1)
    info['head'] = head
    return info


# ----------------------------------------------------------------------------------------------- surface queries
def bvh_of(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    return BVHTree.FromObject(ob, dg)


def hit_front(bvh, x, z):
    loc, nrm, idx, dist = bvh.ray_cast(V((x, -1.0, z)), V((0, 1, 0)))
    return loc


# ----------------------------------------------------------------------------------------------- texture painting
def bake_position_map(ob, W, Ht):
    """Bake world-space position per texel with Cycles (EMIT). Returns (pos[H,W,3], valid[H,W])."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 1
    img = bpy.data.images.new('posmap', W, Ht, float_buffer=True, alpha=True)
    img.generated_color = (0, 0, 0, 0)
    tmp = bpy.data.materials.new('tmp_pos')
    tmp.use_nodes = True
    nt = tmp.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.links.new(geo.outputs['Position'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    nt.nodes.active = tex
    old = list(ob.data.materials)
    ob.data.materials.clear()
    ob.data.materials.append(tmp)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    sc.render.bake.margin = 6
    bpy.ops.object.bake(type='EMIT', margin=6)
    px = np.array(img.pixels[:], dtype=np.float32).reshape(Ht, W, 4)[::-1]   # row 0 = top (v = 1)
    ob.data.materials.clear()
    for m in old:
        ob.data.materials.append(m)
    return px[..., :3].copy(), px[..., 3] > 0.5


def bake_ao_map(ob, W, Ht, samples=48):
    """Bake ambient occlusion (with every other mesh in the scene as occluder). Returns ao[H,W] in 0..1."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    img = bpy.data.images.new('aomap', W, Ht, float_buffer=True)
    mat = ob.data.materials[0]
    nt = mat.node_tree
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = img
    nt.nodes.active = tex
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    sc.world = sc.world or bpy.data.worlds.new('w')
    bpy.ops.object.bake(type='AO', margin=6)
    ao = np.array(img.pixels[:], dtype=np.float32).reshape(Ht, W, 4)[::-1][..., 0].copy()
    nt.nodes.remove(tex)
    return ao


def srgb2lin(c):
    c = np.asarray(c, dtype=np.float32) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def seg_dist(P, pts):
    """Distance from points P[...,2] to a 2D polyline pts[N,2]; returns (dist, t along curve 0..1)."""
    best = np.full(P.shape[:-1], 1e9, dtype=np.float32)
    bt = np.zeros(P.shape[:-1], dtype=np.float32)
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        ab = b - a
        t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
        q = a + t[..., None] * ab
        d = np.linalg.norm(P - q, axis=-1)
        m = d < best
        best = np.where(m, d, best)
        bt = np.where(m, (L[i] + t * np.linalg.norm(ab)) / L[-1], bt)
    return best, bt


def paint_skin(pos, valid, ao=None, base=(214, 136, 98)):
    """Paints the face texture (sRGB uint8) from the world-position map."""
    Ht, W = valid.shape
    col = np.broadcast_to(srgb2lin(base), (Ht, W, 3)).copy()
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    front = (y < -0.02) & valid

    def mix(alpha, c):
        nonlocal col
        a = np.clip(alpha, 0, 1)[..., None]
        col = col * (1 - a) + srgb2lin(c) * a

    def g3(cx, cy, cz, sx, sz, sy=None):
        sy = sy or sx
        return np.exp(-(((x - cx) / sx) ** 2 + ((z - cz) / sz) ** 2 + ((y - cy) / sy) ** 2) / 2)
    # warm tan with a slightly cooler/lighter forehead and warmer lower face
    mix(0.18 * np.clip((z - 0.80) / 0.12, 0, 1) * front, (226, 150, 112))
    # blush: apple cheeks, nose tip, chin
    for sx in (-1, 1):
        mix(0.50 * g3(sx * 0.066, -0.085, 0.744, 0.021, 0.017, 0.05) * front, (232, 112, 92))
    mix(0.45 * g3(0, -0.12, H['nose_z'] + 0.001, 0.0085, 0.0075, 0.05) * front, (226, 104, 86))
    mix(0.22 * g3(0, -0.09, 0.688, 0.016, 0.010, 0.05) * front, (226, 118, 96))
    # lips: rosy fuller lower lip, thinner upper lip, darker closed-mouth line with lifted corners
    MZ, mhw = H['mouth_z'], H['mouth_hw']
    lip_lo = np.exp(-((x / 0.0125) ** 2 + ((z - (MZ - 0.0055)) / 0.0042) ** 2) / 2) * front
    lip_up = np.exp(-((x / 0.0135) ** 2 + ((z - (MZ + 0.0036)) / 0.0026) ** 2) / 2) * front
    mix(0.62 * lip_lo, (204, 98, 86)); mix(0.40 * lip_up, (196, 96, 84))
    xs = np.linspace(-mhw, mhw, 25)
    curve = np.stack([xs, MZ + 0.0032 * (xs / mhw) ** 2], 1)
    dm, _ = seg_dist(np.stack([x, z], -1), curve)
    mix(0.85 * np.clip(1 - dm / 0.0011, 0, 1) * front, (122, 52, 44))
    # brows: soft, tapered, arched, moderately thick (painted, not geometry)
    for sx in (-1, 1):
        ts = np.linspace(0, 1, 30)
        bx = sx * (H['brow_x0'] + (H['brow_x1'] - H['brow_x0']) * ts)
        bz = H['brow_z'] + H['brow_arch'] * np.sin(np.pi * (0.15 + 0.85 * ts)) - 0.010 * ts
        db, tb = seg_dist(np.stack([x, z], -1), np.stack([bx, bz], 1))
        hw = H['brow_thick'] * (1 - 0.62 * tb ** 1.4) * np.clip(tb * 8 + 0.55, 0, 1)
        a = np.clip((hw - db) / (0.35 * hw + 1e-6) + 0.5, 0, 1)
        mix(0.92 * a * front, (74, 42, 30))
    # hairline: thin darker transition where the front hair clumps start
    hl = np.zeros_like(x)
    phi = np.degrees(np.arctan2(x - H['C'].x, -(y - H['C'].y)))
    zh = np.interp(phi, [a for a, _ in HAIRLINE], [b for _, b in HAIRLINE])
    dz = z - zh
    hl = np.exp(-((dz + 0.004) / 0.007) ** 2 / 2) * valid
    mix(0.55 * hl, (96, 58, 44))
    mix(0.9 * (dz > 0.004) * valid, (40, 28, 26))    # scalp under the hair: dark (never shows as skin)
    if ao is not None:
        col *= (0.45 + 0.55 * np.clip(ao, 0, 1))[..., None]
    return (lin2srgb(col) * 255 + 0.5).astype(np.uint8)
