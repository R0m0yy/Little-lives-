"""Naomi reference report: python3 tools/naomi_report.py <tag>

Reads qa/naomi3d/<tag>_measure.json + the @2x renders from tools/naomi_measure.cjs and writes:
  <tag>_ref_head.png / <tag>_ref_full.png  2x renders downsampled (anti-aliased) to K px per board px
  <tag>_table.md / <tag>_table.json        landmark error table (board px and % of reference head height) + IoU
  <tag>_onion.png                          50 % onion skin of reference and render, head window
  <tag>_lm.png                             landmarks: reference (green) vs render (red), on the reference
  <tag>_sbs.png                            reference | Three.js | Cycles (if <tag>_cycles_head.png exists) + table
Targets (owner brief): every face landmark within 3 % of head height; head+hair silhouette IoU >= 0.90.
Head height = reference chin to top of hair mass = 95.4 board px.
"""
import json, os, sys, math
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
Q = os.path.join(ROOT, 'qa/naomi3d')
tag = sys.argv[1]
L = json.load(open(os.path.join(ROOT, 'refs/naomi_landmarks.json')))
M = json.load(open(os.path.join(Q, f'{tag}_measure.json')))
B = Image.open(os.path.join(ROOT, 'refs/design_board.png')).convert('RGB')
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(F, 15); fsm = ImageFont.truetype(F, 12); fbig = ImageFont.truetype(F, 18)

R = L['head']
HH = R['chin'][1] - R['hair_top'][1]
TOL = 0.03

def down(name, size):
    p = os.path.join(Q, f'{tag}_{name}@2x.png')
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB').resize(size, Image.LANCZOS)
    im.save(os.path.join(Q, f'{tag}_{name}.png'))
    return im

hx0, hy0, hx1, hy1 = L['crop_head']; K = 4
head = down('ref_head', ((hx1 - hx0) * K, (hy1 - hy0) * K))
mask = down('ref_mask', ((hx1 - hx0) * K, (hy1 - hy0) * K))
fx0, fy0, fx1, fy1 = L['crop_full']
full = down('ref_full', ((fx1 - fx0) * 3, (fy1 - fy0) * 3))

# ---- landmark table
rows = []
for k, (rx, ry) in R.items():
    p = M['proj'].get(k)
    if p is None:
        rows.append((k, None, None, None)); continue
    e = math.hypot(p[0] - rx, p[1] - ry)
    rows.append((k, p, e, e / HH))
face_rows = [r for r in rows if r[2] is not None]
n_pass = sum(1 for r in face_rows if r[3] <= TOL)

# ---- silhouette IoU (4x)
iou = None
if mask is not None:
    rm = Image.open(os.path.join(ROOT, 'refs/naomi_head_mask_4x.png')).convert('L')
    a = mask.convert('L').point(lambda v: 255 if v > 127 else 0)
    inter = union = 0
    pa, pb = a.load(), rm.load()
    for y in range(a.height):
        for x in range(a.width):
            u, v = pa[x, y] > 0, pb[x, y] > 0
            inter += u and v; union += u or v
    iou = inter / max(1, union)
    # mask diff image: green = both, red = render only, blue = reference only
    d = Image.new('RGB', a.size)
    pd = d.load()
    for y in range(a.height):
        for x in range(a.width):
            u, v = pa[x, y] > 0, pb[x, y] > 0
            pd[x, y] = (40, 200, 90) if u and v else (230, 60, 60) if u else (60, 110, 240) if v else (20, 18, 24)
    d.save(os.path.join(Q, f'{tag}_maskdiff.png'))

summary = {'tag': tag, 'head_height_ref_px': HH, 'tolerance': TOL, 'pass': n_pass, 'total': len(face_rows),
           'mean_err_pct': sum(r[3] for r in face_rows) / max(1, len(face_rows)) * 100, 'iou': iou,
           'rows': [{'landmark': k, 'render': p, 'err_px': e, 'err_pct': None if pc is None else pc * 100} for k, p, e, pc in rows],
           'camera': {k: M[k] for k in ('D', 'shift', 'cam') if k in M}}
json.dump(summary, open(os.path.join(Q, f'{tag}_table.json'), 'w'), indent=1)
md = [f'## {tag} — landmark error vs reference (head height {HH:.1f} px, target <= 3 %)', '',
      '| landmark | ref (board px) | render | error px | % head h | |', '|---|---|---|---|---|---|']
for k, p, e, pc in rows:
    if p is None:
        md.append(f'| {k} | {R[k][0]:.1f}, {R[k][1]:.1f} | — | — | — | missing |')
    else:
        md.append(f'| {k} | {R[k][0]:.1f}, {R[k][1]:.1f} | {p[0]:.1f}, {p[1]:.1f} | {e:.1f} | {pc*100:.1f} | {"ok" if pc <= TOL else "FAIL"} |')
md += ['', f'**{n_pass}/{len(face_rows)} landmarks within 3 %**, mean error {summary["mean_err_pct"]:.1f} % · '
       f'silhouette IoU **{iou:.3f}** (target 0.90)' if iou is not None else '']
open(os.path.join(Q, f'{tag}_table.md'), 'w').write('\n'.join(md) + '\n')

# ---- onion skin + landmark overlay (head window, 4x)
refh = B.crop((hx0, hy0, hx1, hy1)).resize(((hx1 - hx0) * K, (hy1 - hy0) * K), Image.LANCZOS)
if head is not None:
    Image.blend(refh, head, 0.5).save(os.path.join(Q, f'{tag}_onion.png'))
lm = refh.copy(); d = ImageDraw.Draw(lm)
for k, p, e, pc in rows:
    rx, ry = (R[k][0] - hx0) * K, (R[k][1] - hy0) * K
    d.ellipse((rx - 5, ry - 5, rx + 5, ry + 5), outline=(60, 255, 90), width=2)
    if p is not None:
        px, py = (p[0] - hx0) * K, (p[1] - hy0) * K
        d.line((rx, ry, px, py), fill=(255, 230, 60), width=2)
        d.ellipse((px - 4, py - 4, px + 4, py + 4), fill=(255, 60, 60))
lm.save(os.path.join(Q, f'{tag}_lm.png'))

# ---- side-by-side: reference | Three.js | Cycles  + table column
panels = [('REFERENCE (board, 4x)', refh), ('THREE.JS (ref camera)', head)]
cyc = os.path.join(Q, f'{tag}_cycles_head.png')
if os.path.exists(cyc):
    panels.append(('BLENDER CYCLES (same camera, SSS)', Image.open(cyc).convert('RGB').resize(refh.size, Image.LANCZOS)))
panels = [(t, im) for t, im in panels if im is not None]
W = sum(im.width for _, im in panels) + 12 * (len(panels) + 1) + 330
Hh = refh.height + 90
can = Image.new('RGB', (W, Hh), (30, 27, 34)); dd = ImageDraw.Draw(can)
title = sys.argv[2] if len(sys.argv) > 2 else tag
dd.text((12, 8), title, fill=(255, 235, 200), font=fbig)
x = 12
for t, im in panels:
    can.paste(im, (x, 62)); dd.text((x, 40), t, fill=(220, 210, 230), font=font); x += im.width + 12
ty = 62
dd.text((x, ty), f'{n_pass}/{len(face_rows)} landmarks <= 3 %', fill=(255, 235, 200), font=font); ty += 20
if iou is not None:
    dd.text((x, ty), f'silhouette IoU {iou:.3f} (target .90)', fill=(255, 235, 200), font=font); ty += 20
dd.text((x, ty), f'mean error {summary["mean_err_pct"]:.1f} % of head h', fill=(255, 235, 200), font=font); ty += 26
for k, p, e, pc in rows:
    col = (150, 230, 150) if (pc is not None and pc <= TOL) else (240, 140, 140)
    dd.text((x, ty), f'{k:<18s} ' + ('—' if pc is None else f'{pc*100:5.1f} %'), fill=col, font=fsm); ty += 16
can.save(os.path.join(Q, f'{tag}_sbs.png'))
print('\n'.join(md))
