"""Cycles diagnostic render of Naomi from the reference-matched camera (owner brief, Phase D).

usage: python3 tools/naomi_cycles.py <tag> [samples]
Reads qa/naomi3d/<tag>_measure.json (camera fitted by web/lib/refcam.js), imports assets/characters/naomi.glb,
rebuilds the same lighting rig as web/lib/look.js (warm key upper-left, cool fill right, warm rims behind),
adds real subsurface scattering to the skin materials and a Principled Hair BSDF on hair, and renders the
head window at 2x, downsampled to qa/naomi3d/<tag>_cycles_head.png (CPU, OIDN denoise when available).
If Cycles looks right and Three.js doesn't, the difference is shading; if both look wrong, it is modelling.
"""
import json, math, os, sys
import bpy
from mathutils import Vector, Quaternion, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
tag = sys.argv[1]
SAMPLES = int(sys.argv[2]) if len(sys.argv) > 2 else 96
M = json.load(open(os.path.join(ROOT, 'qa/naomi3d', f'{tag}_measure.json')))
GLB = os.path.join(ROOT, 'assets/characters/naomi.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
sc = bpy.context.scene


# ---- coordinate conversion: three.js (Y up) -> Blender (Z up): (x, y, z) -> (x, -z, y)
def v3(a):
    return Vector((a[0], -a[2], a[1]))


cam_d = bpy.data.cameras.new('RefCam')
cam = bpy.data.objects.new('RefCam', cam_d)
sc.collection.objects.link(cam)
pos = v3(M['cam']['position'])
qx, qy, qz, qw = M['cam']['quaternion']
q_three = Quaternion((qw, qx, qy, qz))
conv = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0))).to_quaternion()   # three -> blender basis
cam.location = pos
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = conv @ q_three
cam_d.sensor_fit = 'VERTICAL'
cam_d.angle_y = math.radians(M['cam']['fovDeg'])
sc.camera = cam

# ---- view window -> render resolution + lens shift (same crop as the Three.js setViewOffset)
W = M['window']
Wf, Hf = M['Wf'], M['Hf']
SS = 2
sc.render.resolution_x = int(round(W['w'])) * SS
sc.render.resolution_y = int(round(W['h'])) * SS
sc.render.resolution_percentage = 100
# full-frame vertical FOV -> window FOV; shift is in units of the larger window dimension
cam_d.angle_y = 2 * math.atan(math.tan(math.radians(M['cam']['fovDeg']) / 2) * W['h'] / Hf)
cx_full, cy_full = W['ox'] + W['w'] / 2, W['oy'] + W['h'] / 2
big = max(W['w'], W['h'])
cam_d.shift_x = (cx_full - Wf / 2) / big
cam_d.shift_y = -(cy_full - Hf / 2) / big
cam_d.sensor_fit = 'VERTICAL' if W['h'] >= W['w'] else 'HORIZONTAL'
if cam_d.sensor_fit == 'HORIZONTAL':
    cam_d.angle_x = 2 * math.atan(math.tan(cam_d.angle_y / 2) * W['w'] / W['h'])

# ---- lights (directions copied from web/lib/look.js studioLights; three.js positions -> blender)
def sun(name, three_pos, color, strength, ang=8):
    d = bpy.data.lights.new(name, 'SUN')
    d.color = color
    d.energy = strength
    d.angle = math.radians(ang)
    o = bpy.data.objects.new(name, d)
    sc.collection.objects.link(o)
    p = v3(three_pos)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = (-p).normalized().to_track_quat('-Z', 'Y')
    return o


sun('Key', (-2.2, 3.0, 2.8), (1.0, 0.78, 0.59), 3.2, 10)
sun('Fill', (2.8, 1.1, 2.2), (0.74, 0.80, 1.0), 0.9, 25)
sun('Rim', (2.3, 2.5, -2.7), (1.0, 0.71, 0.47), 3.4, 6)
sun('Rim2', (-2.6, 1.8, -2.2), (1.0, 0.85, 0.69), 1.1, 6)
world = bpy.data.worlds.new('W')
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs['Color'].default_value = (0.24, 0.18, 0.21, 1)
bg.inputs['Strength'].default_value = 0.55
sc.world = world

# ---- shading upgrades Cycles can do natively: SSS skin, hair BSDF
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    p = m.node_tree.nodes.get('Principled BSDF')
    n = m.name
    if p and n.startswith('skin'):
        p.inputs['Subsurface Weight'].default_value = 0.35
        p.inputs['Subsurface Radius'].default_value = (1.0, 0.35, 0.18)
        p.inputs['Subsurface Scale'].default_value = 0.012
    if p and (n == 'hair' or n.startswith('hair_bun')):
        p.inputs['Roughness'].default_value = 0.42
        p.inputs['Anisotropic'].default_value = 0.6
    if p and n.startswith('cornea'):
        p.inputs['Transmission Weight'].default_value = 1.0
        p.inputs['Roughness'].default_value = 0.0

# backdrop plane behind the head (board-like mauve), out of focus
bpy.ops.mesh.primitive_plane_add(size=4, location=cam.location + (Vector(M['target']).xzy * Vector((1, -1, 1)) - cam.location) * 2.2)
pl = bpy.context.active_object
pl.rotation_mode = 'QUATERNION'
pl.rotation_quaternion = cam.rotation_quaternion
bm = bpy.data.materials.new('backdrop')
bm.use_nodes = True
em = bm.node_tree.nodes.new('ShaderNodeEmission')
em.inputs['Color'].default_value = (0.24, 0.17, 0.21, 1)
em.inputs['Strength'].default_value = 1.0
bm.node_tree.links.new(em.outputs['Emission'], bm.node_tree.nodes['Material Output'].inputs['Surface'])
pl.data.materials.append(bm)

sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
try:
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'None'
sc.view_settings.exposure = 0.85   # round 35: matched to the Three.js render's overall level
sc.render.film_transparent = False
out2x = os.path.join(ROOT, 'qa/naomi3d', f'{tag}_cycles_head@2x.png')
sc.render.filepath = out2x
bpy.ops.render.render(write_still=True)
from PIL import Image
Image.open(out2x).convert('RGB').resize((int(round(W['w'])), int(round(W['h']))), Image.LANCZOS).save(
    os.path.join(ROOT, 'qa/naomi3d', f'{tag}_cycles_head.png'))
print('CYCLES', out2x, sc.render.resolution_x, sc.render.resolution_y, 'denoise', sc.cycles.use_denoising)
