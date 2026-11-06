// LL-030 regression: loads a save code with HTML in memory/relationship text and checks nothing is injected.
// usage: node tools/xss_check.cjs file://$PWD/dist/index.html#test   (uses the Node Playwright preinstalled in cloud sessions)
const { chromium } = require('playwright');
const url = process.argv[2];
const evil = '<img src=x onerror="window.PWNED=1">';
const save = { v: 1, clock: { min: 600, day: 0 }, O: {}, agents: [{ id: 'naomi', pos: [0, 0, 0.5], heading: 0, needs: { hunger: 50, energy: 50, hygiene: 50, fun: 50, social: 50 },
  rel: { darius: { label: evil, affection: 80, trust: 1, friendship: 1, conflict: 1 } }, memories: [{ t: evil, day: 0, text: evil, tags: [] }],
  moodlets: [], cooldowns: {}, history: [], away: false, sleeping: false, hold: { R: null, L: null, both: null }, action: null, stepIdx: 0, vars: {}, sit: 0, activity: 'x' }] };
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 900, height: 600 } });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(url); await pg.waitForFunction('window.READY===true', null, { timeout: 120000 });
  await pg.evaluate((s) => LLAPI.sim.load(s), JSON.stringify(save));
  const res = {};
  for (const tab of ['mem', 'rel']) {
    await pg.evaluate((t) => document.querySelector(`.tabs button[data-tab=${t}]`).click(), tab);
    await pg.evaluate(() => LLAPI.frame(1 / 30, 10)); await pg.waitForTimeout(300);
    res[tab] = await pg.evaluate(() => ({ imgs: document.querySelectorAll('#cardBody img').length, pwned: !!window.PWNED, text: document.querySelector('#cardBody').textContent.slice(0, 90) }));
  }
  console.log(JSON.stringify(res, null, 1)); console.log('pageerrors', errs.slice(0, 3));
  await b.close();
})();
