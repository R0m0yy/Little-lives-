"""House reference report: python3 tools/house_report.py <tag> ["title"]
Reads qa/house3d/<tag>_measure.json + @2x renders from tools/house_measure.cjs and writes
  <tag>_ref.png (2x downsampled to K=2), <tag>_table.md/.json (landmark error, % of house height; IoU),
  <tag>_onion.png (50 % blend), <tag>_lm.png (reference green vs render red), <tag>_maskdiff.png,
  <tag>_sbs.png (reference | Three.js | Cycles if <tag>_cycles.png exists, + table).
Targets (owner brief): silhouette IoU >= 0.92, every landmark <= 2 % of house height (396 board px)."""
import json, os, sys, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..')); Q = os.path.join(ROOT, 'qa/house3d')
tag = sys.argv[1]; title = sys.argv[2] if len(sys.argv) > 2 else tag
L = json.load(open(os.path.join(ROOT, 'refs/house_landmarks.json'))); M = json.load(open(os.path.join(Q, f'{tag}_measure.json')))
R = L['points']; HH = R[L['house_bottom']][1] - R[L['house_top']][1]; TOL = 0.02
x0, y0, x1, y1 = L['crop']; K = 2; size = ((x1 - x0) * K, (y1 - y0) * K)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; font = ImageFont.truetype(F, 15); fsm = ImageFont.truetype(F, 12); fbig = ImageFont.truetype(F, 18)
def down(n):
    p = os.path.join(Q, f'{tag}_{n}@2x.png')
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGB').resize(size, Image.LANCZOS); im.save(os.path.join(Q, f'{tag}_{n}.png')); return im
ren = down('ref'); msk = down('mask')
rows = []
for k, (rx, ry) in R.items():
    p = M['proj'].get(k)
    if p is None: rows.append((k, None, None, None)); continue
    e = math.hypot(p[0] - rx, p[1] - ry); rows.append((k, p, e, e / HH))
ok = [r for r in rows if r[2] is not None]; npass = sum(1 for r in ok if r[3] <= TOL)
a = np.asarray(msk.convert('L')) > 127; bm = np.asarray(Image.open(os.path.join(ROOT, 'refs/house_mask_2x.png')).convert('L')) > 127
iou = float((a & bm).sum() / max(1, (a | bm).sum()))
d = np.zeros(a.shape + (3,), np.uint8); d[:] = (20, 18, 24); d[a & bm] = (40, 200, 90); d[a & ~bm] = (230, 60, 60); d[~a & bm] = (60, 110, 240)
Image.fromarray(d).save(os.path.join(Q, f'{tag}_maskdiff.png'))
mean = sum(r[3] for r in ok) / max(1, len(ok)) * 100
summ = {'tag': tag, 'house_height_px': HH, 'pass': npass, 'total': len(ok), 'mean_err_pct': mean, 'iou': iou, 'frame_ms': M.get('frame_ms'),
        'rows': [{'landmark': k, 'render': p, 'err_px': e, 'err_pct': None if pc is None else pc * 100} for k, p, e, pc in rows], 'camera': M.get('cam')}
json.dump(summ, open(os.path.join(Q, f'{tag}_table.json'), 'w'), indent=1)
md = [f'## {tag} — house landmarks vs reference (house height {HH:.0f} px, target <= 2 %)', '', '| landmark | ref | render | err px | % | |', '|---|---|---|---|---|---|']
for k, p, e, pc in rows:
    md.append(f'| {k} | {R[k][0]:.0f}, {R[k][1]:.0f} | ' + ('— | — | — | missing |' if p is None else f'{p[0]:.0f}, {p[1]:.0f} | {e:.1f} | {pc*100:.1f} | {"ok" if pc <= TOL else "FAIL"} |'))
md += ['', f'**{npass}/{len(ok)} landmarks within 2 %**, mean {mean:.2f} % · silhouette IoU **{iou:.3f}** (target 0.92)']
open(os.path.join(Q, f'{tag}_table.md'), 'w').write('\n'.join(md) + '\n')
B = Image.open(os.path.join(ROOT, 'refs/design_board.png')).convert('RGB'); refi = B.crop((x0, y0, x1, y1)).resize(size, Image.LANCZOS)
Image.blend(refi, ren, 0.5).save(os.path.join(Q, f'{tag}_onion.png'))
lm = refi.copy(); dr = ImageDraw.Draw(lm)
for k, p, e, pc in rows:
    rx, ry = (R[k][0] - x0) * K, (R[k][1] - y0) * K; dr.ellipse((rx - 4, ry - 4, rx + 4, ry + 4), outline=(60, 255, 90), width=2)
    if p is not None:
        px, py = (p[0] - x0) * K, (p[1] - y0) * K; dr.line((rx, ry, px, py), fill=(255, 230, 60), width=2); dr.ellipse((px - 3, py - 3, px + 3, py + 3), fill=(255, 60, 60))
lm.save(os.path.join(Q, f'{tag}_lm.png'))
panels = [('REFERENCE (board, 2x)', refi), ('THREE.JS (ref camera)', ren)]
cy = os.path.join(Q, f'{tag}_cycles.png')
if os.path.exists(cy): panels.append(('BLENDER CYCLES (same camera)', Image.open(cy).convert('RGB').resize(size, Image.LANCZOS)))
W = sum(im.width for _, im in panels) + 12 * (len(panels) + 1) + 300; Hh = size[1] + 70
can = Image.new('RGB', (W, Hh), (30, 27, 34)); dd = ImageDraw.Draw(can); dd.text((12, 8), title, fill=(255, 235, 200), font=fbig)
x = 12
for t, im in panels: can.paste(im, (x, 62)); dd.text((x, 40), t, fill=(220, 210, 230), font=font); x += im.width + 12
ty = 62
for line in (f'{npass}/{len(ok)} landmarks <= 2 %', f'IoU {iou:.3f} (target .92)', f'mean error {mean:.2f} % of house h'):
    dd.text((x, ty), line, fill=(255, 235, 200), font=font); ty += 20
ty += 6
for k, p, e, pc in rows:
    dd.text((x, ty), f'{k:<18s} ' + ('—' if pc is None else f'{pc*100:5.1f} %'), fill=(150, 230, 150) if (pc is not None and pc <= TOL) else (240, 140, 140), font=fsm); ty += 15
can.save(os.path.join(Q, f'{tag}_sbs.png'))
print('\n'.join(md))
