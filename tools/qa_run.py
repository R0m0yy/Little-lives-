"""QA harness: soak-simulates Little Lives (full AI/nav/anim logic, no rendering) and renders sample frames.
usage: qa_run.py <url> <prefix> <samples> <minutes_between> [cam] [w h]"""
import sys, time, json
from playwright.sync_api import sync_playwright
url, prefix, n, gap = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
camm = sys.argv[5] if len(sys.argv) > 5 else 'director'
W, H = (int(sys.argv[6]), int(sys.argv[7])) if len(sys.argv) > 7 else (1280, 720)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': W, 'height': H})
    logs = []
    pg.on('console', lambda m: logs.append(m.text) if 'Driver' not in m.text and 'TUNNEL' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(url); pg.wait_for_function('window.READY===true', timeout=120000)
    pg.evaluate(f"LLAPI.setCam('{camm}')")
    t0 = time.time()
    for i in range(n):
        if gap > 0: pg.evaluate(f"LLAPI.soak({gap}, 0.1)")
        t1 = time.time(); pg.evaluate("LLAPI.frame(1/30, 45)"); ft = (time.time() - t1) / 45
        st = pg.evaluate("LLAPI.state()")
        print(f"{i:02d} {st['clock']:<22} {str(st['action']):<12} {st['activity']:<34} pos={st['pos']} sit={st['sit']} away={st['away']} needs={st['needs']} ({ft:.2f}s/frame)", flush=True)
        pg.screenshot(path=f'{prefix}_{i:02d}.png')
    print('total', round(time.time() - t0, 1), 's')
    for l in logs[:30]: print('LOG', l)
    b.close()
