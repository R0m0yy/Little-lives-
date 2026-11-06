"""Little Lives — procedural modeling kit for Blender-as-a-module (bpy).

Everything is built from parametric surfaces (smooth quad grids with UVs), sweeps along paths,
lathes, and voxel-remesh unions (for organic joins like hands/arms), then subdivided.
Blender convention: Z up, character faces -Y, character's left = +X.
"""
import math, os
import bpy, bmesh
from mathutils import Vector, Matrix

V = Vector
TAU = math.tau


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))) if b != a else float(x >= a)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def col(h, a=1.0):
    h = h.lstrip('#')
    return (srgb_to_lin(int(h[0:2], 16)), srgb_to_lin(int(h[2:4], 16)), srgb_to_lin(int(h[4:6], 16)), a)


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


# ---------------------------------------------------------------------------------------- materials
_imgs = {}


def material(name, base='#cccccc', rough=0.5, metal=0.0, coat=0.0, coat_rough=0.05, sheen=0.0, sheen_tint='#ffffff',
             sheen_rough=0.5, aniso=0.0, aniso_rot=0.0, tex=None, vcol=False, spec=0.5, emission=None, emission_strength=0.0,
             transmission=0.0, ior=1.45, alpha=1.0, double=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = col(base) if isinstance(base, str) else base
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = coat_rough
    p.inputs['Sheen Weight'].default_value = sheen
    p.inputs['Sheen Tint'].default_value = col(sheen_tint)
    p.inputs['Sheen Roughness'].default_value = sheen_rough
    p.inputs['Anisotropic'].default_value = aniso
    p.inputs['Anisotropic Rotation'].default_value = aniso_rot
    p.inputs['Specular IOR Level'].default_value = spec
    p.inputs['IOR'].default_value = ior
    p.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
    if emission:
        p.inputs['Emission Color'].default_value = col(emission)
        p.inputs['Emission Strength'].default_value = emission_strength
    if tex:
        img = _imgs.get(tex) or bpy.data.images.load(tex)
        _imgs[tex] = img
        img.pack()
        tn = nt.nodes.new('ShaderNodeTexImage')
        tn.image = img
        nt.links.new(tn.outputs['Color'], p.inputs['Base Color'])
    elif vcol:
        cn = nt.nodes.new('ShaderNodeVertexColor')
        cn.layer_name = 'Col'
        nt.links.new(cn.outputs['Color'], p.inputs['Base Color'])
    m.use_backface_culling = not double
    return m


# ---------------------------------------------------------------------------------------- mesh building
def build(name, rows, wrap_u=False, mat=None, uv=None, vcolor=None, keep=None, merge=1e-6, smooth=True, flip=False, orient=None):
    """rows: list (v) of lists (u) of Vector. uv: fn(i,j)->(u,v). vcolor: fn(point,i,j)->rgba. keep: fn(i,j)->bool per quad."""
    bm = bmesh.new()
    nv, nu = len(rows), len(rows[0])
    vs = [[bm.verts.new(p) for p in r] for r in rows]
    uvl = bm.loops.layers.uv.new('UVMap')
    cl = bm.loops.layers.float_color.new('Col') if vcolor else None
    ucount = nu if wrap_u else nu - 1
    for i in range(nv - 1):
        for j in range(ucount):
            if keep and not keep(i, j):
                continue
            j1 = (j + 1) % nu
            quad = [(i, j), (i, j1), (i + 1, j1), (i + 1, j)]
            if flip:
                quad.reverse()
            vv = [vs[a][b] for a, b in quad]
            if len(set(vv)) < 3:
                continue
            try:
                f = bm.faces.new(vv)
            except ValueError:
                continue
            for lp, (a, b) in zip(f.loops, quad):
                bb = b
                if wrap_u and j1 == 0 and b == 0:
                    bb = nu  # seam: u = 1
                lp[uvl].uv = uv(a, bb) if uv else (bb / max(1, nu - (0 if wrap_u else 1)), a / (nv - 1))
                if cl:
                    lp[cl] = vcolor(vs[a][b].co, a, b)
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    if merge:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=merge)
    if orient is not None:  # open surfaces: normals point away from `orient`
        for f in bm.faces:
            f.normal_update()
            if (f.calc_center_median() - orient).dot(f.normal) < 0:
                f.normal_flip()
    else:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    ob = link(bpy.data.objects.new(name, me))
    if mat:
        me.materials.append(mat)
    return ob


def surface(name, f, nu, nv, wrap_u=False, **kw):
    """f(u in [0,1], v in [0,1]) -> Vector."""
    uc = nu if wrap_u else nu - 1
    rows = [[f(j / uc, i / (nv - 1)) for j in range(nu)] for i in range(nv)]
    return build(name, rows, wrap_u=wrap_u, **kw)


def frames(pts, up=None, normals=None):
    """Parallel-transport frames along a polyline. Returns list of (T, N, B)."""
    n = len(pts)
    T = []
    for i in range(n):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        t = (b - a)
        T.append(t.normalized() if t.length > 1e-9 else V((0, 0, 1)))
    out = []
    if normals:
        for i in range(n):
            N = normals[i] - T[i] * normals[i].dot(T[i])
            N = N.normalized() if N.length > 1e-9 else V((1, 0, 0))
            out.append((T[i], N, T[i].cross(N)))
        return out
    up = up or V((0, 0, 1))
    N = up - T[0] * up.dot(T[0])
    if N.length < 1e-6:
        N = V((1, 0, 0)) - T[0] * T[0].x
    N.normalize()
    for i in range(n):
        if i:
            N = N - T[i] * N.dot(T[i])
            N = N.normalized() if N.length > 1e-9 else out[-1][1]
        out.append((T[i], N, T[i].cross(N)))
    return out


def sweep(name, pts, radius, nprof=12, mat=None, normals=None, up=None, twist=None, cap=True, uv_len=1.0, vcolor=None, offset=None):
    """Tube along pts. radius(t)->(a,b): a along N, b along B. twist(t)->radians. offset(t,ang)->extra radial scale."""
    fr = frames(pts, up=up, normals=normals)
    n = len(pts)
    rows = []
    if cap:
        rows.append([pts[0] - fr[0][0] * 1e-5] * (nprof + 1))
    L = [0.0]
    for i in range(1, n):
        L.append(L[-1] + (pts[i] - pts[i - 1]).length)
    for i in range(n):
        t = i / (n - 1)
        a, b = radius(t)
        T, N, B = fr[i]
        tw = twist(t) if twist else 0.0
        r = []
        for k in range(nprof + 1):
            ang = k / nprof * TAU + tw
            s = offset(t, ang) if offset else 1.0
            r.append(pts[i] + (N * math.cos(ang) * a + B * math.sin(ang) * b) * s)
        rows.append(r)
    if cap:
        rows.append([pts[-1] + fr[-1][0] * 1e-5] * (nprof + 1))
    total = max(L[-1], 1e-6)

    def uvf(i, j):
        ii = min(max(i - (1 if cap else 0), 0), n - 1)
        return (L[ii] / total * uv_len, j / nprof)
    return build(name, rows, wrap_u=False, mat=mat, uv=uvf, vcolor=vcolor, merge=1e-5)


def lathe(name, prof, nu=48, mat=None, disp=None, uv_scale=(1, 1), **kw):
    """prof: list of (rx, ry, z) top->bottom (elliptical rings around Z). disp(u,v,theta)->radial scale."""
    nv = len(prof)

    def f(u, v):
        i = round(v * (nv - 1))
        rx, ry, z = prof[i]
        th = u * TAU
        s = disp(u, v, th) if disp else 1.0
        return V((math.sin(th) * rx * s, -math.cos(th) * ry * s, z))
    return surface(name, f, nu, nv, wrap_u=True, mat=mat, uv=lambda i, j: (j / nu * uv_scale[0], i / (nv - 1) * uv_scale[1]), **kw)


def ellipsoid(name, c, r, mat=None, nu=32, nv=20, rot=None, disp=None, vcolor=None):
    R = rot or Matrix.Identity(3)

    def f(u, v):
        th, ph = u * TAU, v * math.pi
        d = V((math.sin(ph) * math.cos(th), math.sin(ph) * math.sin(th), math.cos(ph)))
        s = disp(d) if disp else 1.0
        return c + R @ V((d.x * r[0] * s, d.y * r[1] * s, d.z * r[2] * s))
    return surface(name, f, nu, nv, wrap_u=True, mat=mat, vcolor=vcolor)


def capsule(name, a, b, ra, rb, mat=None, nprof=16, nseg=12):
    pts = [a.lerp(b, i / (nseg - 1)) for i in range(nseg)]
    # extend ends by radius so the caps are round
    d = (b - a).normalized()
    pts = [a - d * ra * 0.98] + pts + [b + d * rb * 0.98]
    m = len(pts)

    def rad(t):
        i = t * (m - 1)
        if i < 1:
            r = ra * math.sqrt(max(0.0, 1 - (1 - i) ** 2))
        elif i > m - 2:
            r = rb * math.sqrt(max(0.0, 1 - (i - (m - 2)) ** 2))
        else:
            r = lerp(ra, rb, (i - 1) / (m - 3))
        return (r, r)
    return sweep(name, pts, rad, nprof=nprof, mat=mat)


# ---------------------------------------------------------------------------------------- modifiers
def apply_mods(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    bpy.data.meshes.remove(old)
    return ob


def subsurf(ob, levels=1, apply=True):
    m = ob.modifiers.new('sub', 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    return apply_mods(ob) if apply else ob


def join(name, obs):
    bm = bmesh.new()
    for o in obs:
        t = bmesh.new()
        t.from_mesh(o.data)
        t.transform(o.matrix_world)
        me = bpy.data.meshes.new('tmp')
        t.to_mesh(me)
        t.free()
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        bpy.data.objects.remove(o)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def union(name, obs, voxel=0.002, smooth_iter=6, smooth_factor=0.5, decimate=None, mat=None):
    """Organic union of overlapping closed parts: voxel remesh -> smooth -> optional decimate."""
    ob = join(name, obs)
    r = ob.modifiers.new('re', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel
    r.use_smooth_shade = True
    if smooth_iter:
        s = ob.modifiers.new('sm', 'SMOOTH')
        s.iterations = smooth_iter
        s.factor = smooth_factor
    if decimate:
        d = ob.modifiers.new('dec', 'DECIMATE')
        d.ratio = decimate
    apply_mods(ob)
    for p in ob.data.polygons:
        p.use_smooth = True
    if mat:
        ob.data.materials.clear()
        ob.data.materials.append(mat)
    return ob


def set_vcolor(ob, fn):
    me = ob.data
    a = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(me.vertices):
        a.data[i].color = fn(v.co)


def export_glb(path, objs=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objs or bpy.context.scene.objects):
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=bool(objs), export_apply=True,
                              export_tangents=False, export_vertex_color='ACTIVE', export_yup=True)
