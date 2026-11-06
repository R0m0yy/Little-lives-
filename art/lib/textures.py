"""Little Lives — procedural texture painting (PIL). All textures tile horizontally."""
import math, random
from PIL import Image, ImageDraw, ImageFilter


def _blob(d, cx, cy, rx, ry, ang, fill, n=18):
    pts = []
    for k in range(n):
        t = k / n * math.tau
        x, y = math.cos(t) * rx, math.sin(t) * ry
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
    d.polygon(pts, fill=fill)


def _tiled(d, W, H, fn, x, y, margin):
    for ox in (-W, 0, W):
        for oy in (-H, 0, H):
            if -margin < x + ox < W + margin and -margin < y + oy < H + margin:
                fn(d, x + ox, y + oy)


def floral(path, W=1024, H=1024, seed=3, base=(234, 214, 198), density=1.15, soft=2.2):
    """Cream cotton with scattered small roses / blossoms and leaves (design-board pinafore)."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    # faint weave noise
    for _ in range(int(W * H / 60)):
        x, y = rnd.randrange(W), rnd.randrange(H)
        v = rnd.randint(-10, 6)
        d.point((x, y), fill=tuple(max(0, min(255, c + v)) for c in base))
    # muted, board-like palette: dusty coral, rose, dusty blue, soft gold, peach; sage leaves
    pal = [((212, 118, 98), (184, 86, 72)), ((222, 150, 132), (198, 116, 100)), ((150, 166, 196), (118, 136, 172)), ((212, 118, 98), (184, 86, 72)),
           ((226, 196, 132), (200, 166, 96)), ((206, 140, 160), (178, 108, 132)), ((236, 180, 150), (214, 146, 118))]
    leaf = [(160, 172, 134), (138, 154, 118), (176, 186, 150)]

    def flower(d, x, y, s, c):
        main, dark = c
        a0 = rnd.random() * math.tau
        for k in range(5):  # outer petals
            a = a0 + k / 5 * math.tau
            _blob(d, x + math.cos(a) * s * 0.55, y + math.sin(a) * s * 0.55, s * 0.55, s * 0.4, a, main)
        _blob(d, x, y, s * 0.5, s * 0.45, a0, dark)
        _blob(d, x - s * 0.08, y - s * 0.1, s * 0.22, s * 0.18, a0, tuple(min(255, c + 30) for c in main))

    def leaves(d, x, y, s):
        for _ in range(rnd.randint(2, 3)):
            a = rnd.random() * math.tau
            _blob(d, x + math.cos(a) * s * 0.9, y + math.sin(a) * s * 0.9, s * 0.55, s * 0.22, a, rnd.choice(leaf), 14)

    items = []
    for _ in range(int(150 * density)):
        items.append((rnd.random() * W, rnd.random() * H, rnd.uniform(34, 62), rnd.choice(pal)))
    for x, y, s, c in items:
        _tiled(d, W, H, lambda d, X, Y: leaves(d, X, Y, s), x, y, 40)
    for x, y, s, c in items:
        st = rnd.getstate()
        for ox in (-W, 0, W):
            for oy in (-H, 0, H):
                if -40 < x + ox < W + 40 and -40 < y + oy < H + 40:
                    rnd.setstate(st)
                    flower(d, x + ox, y + oy, s, c)
    for _ in range(int(260 * density)):  # tiny dots / buds
        x, y = rnd.random() * W, rnd.random() * H
        c = rnd.choice(pal)[0]
        _tiled(d, W, H, lambda d, X, Y: d.ellipse((X - 2.5, Y - 2.5, X + 2.5, Y + 2.5), fill=c), x, y, 5)
    im = im.filter(ImageFilter.GaussianBlur(soft))
    im.save(path)


def lace(path, W=1024, H=128, base=(240, 222, 200)):
    """Broderie-anglaise band: eyelet flowers, scalloped lower edge shading, bands at top."""
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    hole = (168, 136, 112)
    n = 24
    for k in range(n):
        cx = (k + 0.5) * W / n
        for a in range(6):
            t = a / 6 * math.tau
            _blob(d, cx + math.cos(t) * 10, H * 0.48 + math.sin(t) * 10, 5, 3, t, hole, 10)
        d.ellipse((cx - 3, H * 0.48 - 3, cx + 3, H * 0.48 + 3), fill=hole)
        for dx in (-W / n / 2,):
            d.ellipse((cx + dx - 3, H * 0.78 - 3, cx + dx + 3, H * 0.78 + 3), fill=hole)
    d.rectangle((0, 4, W, 9), fill=(226, 206, 186))
    d.rectangle((0, H - 10, W, H), fill=(230, 212, 192))
    im.filter(ImageFilter.GaussianBlur(0.7)).save(path)


def trim(path, W=1024, H=64):
    """Waistband: dusty pink ribbon with blue/cream embroidered rosettes."""
    im = Image.new('RGB', (W, H), (214, 150, 150))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 5), fill=(236, 210, 196)); d.rectangle((0, H - 6, W, H), fill=(236, 210, 196))
    n = 20
    for k in range(n):
        cx = (k + 0.5) * W / n
        for a in range(5):
            t = a / 5 * math.tau
            _blob(d, cx + math.cos(t) * 7, H / 2 + math.sin(t) * 7, 6, 4, t, (150, 172, 206), 10)
        d.ellipse((cx - 4, H / 2 - 4, cx + 4, H / 2 + 4), fill=(240, 220, 170))
        d.ellipse((cx + W / n / 2 - 3, H / 2 - 3, cx + W / n / 2 + 3, H / 2 + 3), fill=(236, 210, 196))
    im.filter(ImageFilter.GaussianBlur(0.6)).save(path)


def weave(path, W=512, H=512, base=(218, 190, 158), seed=5):
    """Fine cotton/voile with faint woven dots (blouse)."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    for y in range(0, H, 4):
        for x in range(0, W, 4):
            v = rnd.randint(-7, 4)
            d.rectangle((x, y, x + 1, y + 1), fill=tuple(max(0, min(255, c + v)) for c in base))
    for y in range(0, H, 32):
        for x in range(0, W, 32):
            ox = 16 if (y // 32) % 2 else 0
            d.ellipse((x + ox - 3, y - 3, x + ox + 3, y + 3), fill=(232, 214, 196))
    im.filter(ImageFilter.GaussianBlur(0.5)).save(path)


def iris(path, S=512, iris_r=0.66, pupil_r=0.36, dark=(7, 6, 8), mid=(34, 40, 58), ring=(14, 8, 8), sclera=(246, 240, 236)):
    """Eye texture in planar front projection: (0.5,0.5) = cornea centre; iris_r etc. as fraction of eyeball radius."""
    im = Image.new('RGB', (S, S), sclera)
    px = im.load()
    rnd = random.Random(11)
    fib = [rnd.uniform(-1, 1) for _ in range(180)]
    for y in range(S):
        for x in range(S):
            u, v = (x + 0.5) / S * 2 - 1, (y + 0.5) / S * 2 - 1
            r = math.hypot(u, v)
            if r > iris_r + 0.03:
                k = min(1, max(0, (r - 0.75) / 0.25))  # pinkish toward the back
                px[x, y] = tuple(int(sclera[i] * (1 - 0.12 * k) + (222, 170, 160)[i] * 0.12 * k) for i in range(3))
                continue
            a = math.atan2(v, u)
            f = fib[int((a / math.tau + 0.5) * 180) % 180]
            t = (r - pupil_r) / (iris_r - pupil_r)
            if r < pupil_r:
                c = (8, 5, 5)
            elif r > iris_r - 0.04:
                k = min(1, (r - (iris_r - 0.04)) / 0.07)
                c = tuple(int(ring[i] * (1 - k) + sclera[i] * k * 0.0 + ring[i] * k) for i in range(3))
                if r > iris_r:
                    k2 = min(1, (r - iris_r) / 0.03)
                    c = tuple(int(ring[i] * (1 - k2) + sclera[i] * k2) for i in range(3))
            else:
                lower = max(0, v) ** 1.2  # warmer, lighter lower iris (light passes through cornea)
                w = (0.35 + 0.65 * math.sin(math.pi * t)) * (0.45 + 0.55 * lower) + f * 0.08
                c = tuple(int(dark[i] * (1 - w) + mid[i] * w) for i in range(3))
            px[x, y] = c
    im = im.filter(ImageFilter.GaussianBlur(1.0))
    # painted catch-lights (stylised, like the board): big soft upper one, small lower one
    d = ImageDraw.Draw(im)
    for (cx, cy, rr, a) in [(-0.22, -0.26, 0.13, 255), (0.24, 0.22, 0.055, 230)]:
        X, Y, R = (cx + 1) / 2 * S, (cy + 1) / 2 * S, rr / 2 * S
        d.ellipse((X - R, Y - R * 0.9, X + R, Y + R * 0.9), fill=(255, 255, 255))
    im.filter(ImageFilter.GaussianBlur(0.8)).save(path)


# ------------------------------------------------------------------ house textures
def wallpaper(path, base=(232, 200, 140), motif=(212, 172, 108), W=512, H=512, kind='damask', seed=1):
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    if kind == 'stripe':
        for x in range(0, W, 64):
            d.rectangle((x, 0, x + 22, H), fill=motif)
            d.rectangle((x + 30, 0, x + 34, H), fill=motif)
    n = 4
    for j in range(n):
        for i in range(n):
            cx, cy = (i + 0.5 * (j % 2) + 0.25) * W / n, (j + 0.5) * H / n
            if kind in ('damask', 'stripe'):
                for k in range(4):
                    a = k / 4 * math.tau + math.pi / 4
                    _blob(d, cx + math.cos(a) * 14, cy + math.sin(a) * 20, 9, 5, a + 0.6, motif, 12)
                _blob(d, cx, cy, 7, 12, 0, motif, 12)
            elif kind == 'floral':
                for k in range(5):
                    a = k / 5 * math.tau
                    _blob(d, cx + math.cos(a) * 7, cy + math.sin(a) * 7, 6, 4, a, motif, 10)
                d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=(220, 180, 110))
    for _ in range(4000):
        x, y = rnd.randrange(W), rnd.randrange(H)
        v = rnd.randint(-8, 8)
        d.point((x, y), fill=tuple(max(0, min(255, c + v)) for c in im.getpixel((x, y))))
    im.filter(ImageFilter.GaussianBlur(1.0)).save(path)


def planks(path, W=512, H=512, base=(118, 68, 36), seed=2):
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    rows = 8
    for r in range(rows):
        y0 = r * H / rows
        x = -rnd.random() * W
        while x < W:
            ln = rnd.uniform(0.35, 0.8) * W
            v = rnd.randint(-22, 18)
            c = tuple(max(0, min(255, base[i] + v)) for i in range(3))
            d.rectangle((x, y0, x + ln, y0 + H / rows), fill=c)
            for g in range(6):
                gy = y0 + rnd.random() * H / rows
                d.line((x, gy, x + ln, gy + rnd.uniform(-2, 2)), fill=tuple(max(0, ch - 14) for ch in c), width=1)
            d.line((x, y0, x, y0 + H / rows), fill=(70, 40, 22), width=2)
            x += ln
        d.line((0, y0, W, y0), fill=(70, 40, 22), width=2)
    im.filter(ImageFilter.GaussianBlur(0.6)).save(path)


def slate(path, W=512, H=512, base=(70, 88, 116), seed=4):
    """Fish-scale / rectangular slate shingles, blue-grey."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), (52, 60, 72))
    d = ImageDraw.Draw(im)
    rows, cols = 16, 12
    for r in range(rows):
        y = r * H / rows
        off = (r % 2) * W / cols / 2
        for c in range(-1, cols + 1):
            x = c * W / cols + off
            v = rnd.randint(-14, 14)
            colr = tuple(max(0, min(255, base[i] + v + (8 if i == 2 else 0))) for i in range(3))
            w, h = W / cols - 3, H / rows * 1.35
            if r % 4 < 2:
                d.rounded_rectangle((x + 1, y, x + w, y + h), radius=3, fill=colr)
            else:
                d.pieslice((x + 1, y - h * 0.3, x + w, y + h), 0, 180, fill=colr)
                d.rectangle((x + 1, y, x + w, y + h * 0.35), fill=colr)
    im.filter(ImageFilter.GaussianBlur(0.7)).save(path)


def siding(path, W=512, H=512, base=(226, 214, 192), seed=6, scallop=False):
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    rows = 16
    for r in range(rows):
        y = r * H / rows
        v = rnd.randint(-6, 6)
        c = tuple(max(0, min(255, base[i] + v)) for i in range(3))
        if scallop:
            cols = 16
            for k in range(cols + 1):
                x = k * W / cols + (r % 2) * W / cols / 2
                d.pieslice((x - W / cols / 2, y - H / rows, x + W / cols / 2, y + H / rows), 0, 180, fill=c, outline=tuple(ch - 30 for ch in base))
        else:
            d.rectangle((0, y, W, y + H / rows), fill=c)
            d.line((0, y + H / rows - 1, W, y + H / rows - 1), fill=tuple(ch - 40 for ch in base), width=2)
    im.filter(ImageFilter.GaussianBlur(0.6)).save(path)


def flowerbed(path, W=512, H=128, seed=8):
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), (52, 78, 44))
    d = ImageDraw.Draw(im)
    for _ in range(600):
        x, y = rnd.random() * W, rnd.random() * H
        _blob(d, x, y, rnd.uniform(4, 9), rnd.uniform(2, 4), rnd.random() * math.tau, rnd.choice([(70, 108, 58), (88, 128, 66), (46, 72, 40)]), 10)
    for _ in range(260):
        x, y = rnd.random() * W, rnd.random() * H * 0.8
        c = rnd.choice([(236, 120, 170), (250, 240, 244), (220, 80, 120), (250, 200, 220), (200, 120, 220)])
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=c)
    im.filter(ImageFilter.GaussianBlur(0.6)).save(path)
