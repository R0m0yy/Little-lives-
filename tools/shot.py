"""Headless Chrome screenshot helper for Little Lives QA.
usage: python3 shot.py <url> <out.png> [w h] [--wait SECONDS] [--eval JS]
"""
import sys, time, json
from playwright.sync_api import sync_playwright

args = sys.argv[1:]
url, out = args[0], args[1]
w, h = 1600, 900
wait = 0
evals = []
rest = args[2:]
i = 0
while i < len(rest):
    if rest[i] == '--wait': wait = float(rest[i + 1]); i += 2
    elif rest[i] == '--eval': evals.append(rest[i + 1]); i += 2
    else:
        w, h = int(rest[i]), int(rest[i + 1]); i += 2

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'])
    pg = b.new_page(viewport={'width': w, 'height': h})
    logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(url)
    try:
        pg.wait_for_function('window.DONE === true || window.READY === true', timeout=120000)
    except Exception as e:
        logs.append(f'[timeout] {e}')
    for e in evals:
        try:
            r = pg.evaluate(e)
            if r is not None: logs.append('[eval] ' + json.dumps(r)[:4000])
        except Exception as ex:
            logs.append(f'[evalerror] {ex}')
    if wait: time.sleep(wait)
    pg.screenshot(path=out)
    for l in logs: print(l)
    b.close()
