"""Compose a labelled comparison: reference crop | render(s).  usage: side_by_side.py out.png "title" ref.png render1.png [render2.png ...]"""
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, *imgs = sys.argv[1:]
H = 760
ims = []
for p in imgs:
    im = Image.open(p).convert('RGB'); ims.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
W = sum(i.width for i in ims) + 12 * (len(ims) + 1)
can = Image.new('RGB', (W, H + 64), (34, 30, 38)); d = ImageDraw.Draw(can)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20); fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except OSError: f = fs = ImageFont.load_default()
x = 12
for i, (im, p) in enumerate(zip(ims, imgs)):
    can.paste(im, (x, 52)); d.text((x, 30), 'REFERENCE (design board)' if i == 0 else f'RENDER: {p.split("/")[-1]}', fill=(220, 210, 230), font=fs); x += im.width + 12
d.text((12, 4), title, fill=(255, 235, 200), font=f)
can.save(out); print(out, can.size)
