"""Pose verification: run the sim until an activity starts, then render it from a debug camera that faces Naomi.
usage: pose_check.py <url> <out_prefix> '<json list of [label, predicate_js, extra_min, eye, target]>'"""
import sys, json, time
from playwright.sync_api import sync_playwright
url, prefix, plan = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 800, 'height': 600})
    logs = []
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto(url); pg.wait_for_function('window.READY===true', timeout=120000)
    for i, (label, pred, extra, eye, tgt) in enumerate(plan):
        m = pg.evaluate(f"LLAPI.until({json.dumps(pred)}, 900)")
        if extra: pg.evaluate(f"LLAPI.soak({extra}, 0.05)")
        if eye == 'agent':
            eye = pg.evaluate("(()=>{const a=LLAPI.agent;const f=[Math.sin(a.heading),0,Math.cos(a.heading)];const side=a.pos[0]>0?-1:1;return [a.pos[0]+side*1.1,2.25,Math.min(2.6,a.pos[2]+2.9)]})()")
            tgt = pg.evaluate("(()=>{const a=LLAPI.agent;return [a.pos[0],1.25-a.anim.sit*0.3,a.pos[2]]})()")
        pg.evaluate(f"LLAPI.debugCam({json.dumps(eye)}, {json.dumps(tgt)}, 0.7)")
        pg.evaluate("LLAPI.frame(1/30, 2)")
        st = pg.evaluate("LLAPI.state()")
        print(f"{label:<14} reached={m}  {st['clock']}  {st['activity']}  pos={st['pos']} sit={st['sit']}", flush=True)
        pg.screenshot(path=f'{prefix}_{i:02d}_{label}.png')
    for l in logs: print(l)
    b.close()
