"""Render character QA shots and compose side-by-side sheets with the reference crops.
usage: compare.py <tag> [who]  -> qa/v3/<tag>_face_cmp.png, <tag>_body.png, <tag>_expr.png"""
import sys, subprocess, pathlib
from PIL import Image, ImageDraw, ImageFont
ROOT = pathlib.Path(__file__).resolve().parent.parent
tag = sys.argv[1]; who = sys.argv[2] if len(sys.argv) > 2 else 'naomi'
out = ROOT / 'qa/v3'; out.mkdir(parents=True, exist_ok=True)
def shot(mode, path, w, h):
    r = subprocess.run(['python3', str(ROOT / 'tools/shot.py'), f'file://{ROOT}/test/hero.html#{mode},who={who}', str(path), str(w), str(h)], capture_output=True, text=True, timeout=600)
    errs = [l for l in r.stdout.splitlines() if 'error' in l.lower()]
    if errs: print('\n'.join(errs))
modes = sys.argv[3].split(',') if len(sys.argv) > 3 else ['face', 'body', 'expr']
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception: font = ImageFont.load_default()
if 'face' in modes:
    shot('face', out / f'{tag}_face.png', 840, 720)
    a = Image.open(ROOT / 'qa/v3/ref_naomi_face.png').convert('RGB').resize((840, 720))
    b = Image.open(out / f'{tag}_face.png').convert('RGB')
    s = Image.new('RGB', (1680, 760), (30, 26, 34)); s.paste(a, (0, 40)); s.paste(b, (840, 40))
    d = ImageDraw.Draw(s); d.text((12, 8), 'REFERENCE (design board)', fill='white', font=font); d.text((852, 8), f'IN-ENGINE {tag}', fill='white', font=font)
    s.save(out / f'{tag}_face_cmp.png')
if 'body' in modes:
    shot('body', out / f'{tag}_body.png', 1600, 900)
    a = Image.open(ROOT / 'qa/v3/ref_naomi_full.png').convert('RGB').resize((464, 900))
    b = Image.open(out / f'{tag}_body.png').convert('RGB')
    s = Image.new('RGB', (2064, 940), (30, 26, 34)); s.paste(a, (0, 40)); s.paste(b, (464, 40))
    d = ImageDraw.Draw(s); d.text((12, 8), 'REFERENCE', fill='white', font=font); d.text((476, 8), f'IN-ENGINE {tag}: front / 3-4 / side / back', fill='white', font=font)
    s.save(out / f'{tag}_body_cmp.png')
if 'expr' in modes:
    shot('expr', out / f'{tag}_expr.png', 1600, 900)
print('ok', tag)
