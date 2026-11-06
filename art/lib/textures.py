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


def floral(path, W=1024, H=1024, seed=3, base=(232, 204, 190), density=2.6):
    """Cream cotton with scattered small roses / blossoms and leaves (design-board pinafore)."""
    rnd = random.Random(seed)
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    # faint weave noise
    for _ in range(int(W * H / 60)):
        x, y = rnd.randrange(W), rnd.randrange(H)
        v = rnd.randint(-10, 6)
        d.point((x, y), fill=tuple(max(0, min(255, c + v)) for c in base))
    pal = [((214, 96, 80), (178, 60, 52)), ((228, 128, 100), (196, 84, 66)), ((140, 160, 200), (98, 120, 170)), ((214, 96, 80), (178, 60, 52)),
           ((232, 196, 112), (206, 160, 70)), ((214, 132, 160), (180, 96, 128)), ((240, 170, 140), (220, 130, 104))]
    leaf = [(150, 168, 120), (124, 146, 104), (170, 182, 140)]

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
        items.append((rnd.random() * W, rnd.random() * H, rnd.uniform(18, 38), rnd.choice(pal)))
    for x, y, s, c in items:
        _tiled(d, W, H, lambda d, X, Y: leaves(d, X, Y, s), x, y, 40)
    for x, y, s, c in items:
        st = rnd.getstate()
        for ox in (-W, 0, W):
            for oy in (-H, 0, H):
                if -40 < x + ox < W + 40 and -40 < y + oy < H + 40:
                    rnd.setstate(st)
                    flower(d, x + ox, y + oy, s, c)
    for _ in range(int(500 * density)):  # tiny dots / buds
        x, y = rnd.random() * W, rnd.random() * H
        c = rnd.choice(pal)[0]
        _tiled(d, W, H, lambda d, X, Y: d.ellipse((X - 2.5, Y - 2.5, X + 2.5, Y + 2.5), fill=c), x, y, 5)
    im = im.filter(ImageFilter.GaussianBlur(0.8))
    im.save(path)


def lace(path, W=1024, H=128, base=(240, 222, 200)):
    """Broderie-anglaise band: eyelet flowers, scalloped lower edge shading, bands at top."""
    im = Image.new('RGB', (W, H), base)
    d = ImageDraw.Draw(im)
    hole = (196, 170, 150)
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


def weave(path, W=512, H=512, base=(236, 212, 188), seed=5):
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


def iris(path, S=512, iris_r=0.64, pupil_r=0.34, dark=(18, 12, 12), mid=(70, 40, 26), ring=(14, 8, 8), sclera=(246, 240, 236)):
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
