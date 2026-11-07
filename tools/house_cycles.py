"""Cycles diagnostic render of the house from the reference-matched camera.

usage: python3 tools/house_cycles.py <tag> [samples]
Reads qa/house3d/<tag>_measure.json (camera fitted by web/lib/housecam.js), imports assets/house/house.glb, adds the
same warm room point lights at Light_* empties as web/house.html plus a cool dusk sky, and renders at K=2 board px
-> qa/house3d/<tag>_cycles.png (CPU, denoised). Same purpose as for Naomi: Cycles right + Three.js wrong = shading.
"""
import json, math, os, sys
import bpy
from mathutils import Vector, Quaternion, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
tag = sys.argv[1]
SAMPLES = int(sys.argv[2]) if len(sys.argv) > 2 else 24
M = json.load(open(os.path.join(ROOT, 'qa/house3d', f'{tag}_measure.json')))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'assets/house/house.glb'))
sc = bpy.context.scene
v3 = lambda a: Vector((a[0], -a[2], a[1]))
cd = bpy.data.cameras.new('RefCam'); cam = bpy.data.objects.new('RefCam', cd); sc.collection.objects.link(cam)
cam.location = v3(M['cam']['position'])
qx, qy, qz, qw = M['cam']['quaternion']
cam.rotation_mode = 'QUATERNION'
cam.rotation_quaternion = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0))).to_quaternion() @ Quaternion((qw, qx, qy, qz))
W, H = M['W'], M['H']
cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(M['cam']['fovDeg'])
big = max(W, H)
cd.shift_x = (-M['shift'][0] * M['K']) / big
cd.shift_y = (M['shift'][1] * M['K']) / big
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = int(W), int(H)
# lights like web/house.html: warm room point lights at Light_* empties, fire, cool dusk sky + soft front fill
for o in list(sc.objects):
    if o.name.startswith('Light_'):
        fire = o.name.startswith('Light_fire')
        ld = bpy.data.lights.new(o.name + '_pt', 'POINT'); ld.color = (1.0, 0.48, 0.17) if fire else (1.0, 0.62, 0.30)
        ld.energy = 60 if fire else 110; ld.shadow_soft_size = 0.25
        lo = bpy.data.objects.new(o.name + '_pt', ld); lo.location = o.matrix_world.translation; sc.collection.objects.link(lo)
sd = bpy.data.lights.new('Front', 'SUN'); sd.color = (1.0, 0.85, 0.66); sd.energy = 1.2; sd.angle = math.radians(12)
so = bpy.data.objects.new('Front', sd); sc.collection.objects.link(so)
so.rotation_mode = 'QUATERNION'; so.rotation_quaternion = (-v3((3, 4, 12))).normalized().to_track_quat('-Z', 'Y')
w = bpy.data.worlds.new('W'); w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.10, 0.11, 0.14, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
sc.world = w
# emissive materials (lamp shades / bulbs / fire / glass) keep their glTF emission
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
sc.cycles.max_bounces = 4
sc.view_settings.view_transform = 'AgX'
out = os.path.join(ROOT, 'qa/house3d', f'{tag}_cycles.png')
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('CYCLES', out, sc.render.resolution_x, sc.render.resolution_y)
