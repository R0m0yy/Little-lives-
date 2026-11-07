// House reference measurement: node tools/house_measure.cjs <tag> [--calibrate]
// Renders web/house.html?view=ref (reference-matched camera, web/lib/housecam.js) at deviceScaleFactor 2:
//   qa/house3d/<tag>_ref@2x.png (beauty, K=2 px per board px), <tag>_mask@2x.png (white silhouette), <tag>_measure.json
// then runs tools/house_report.py <tag>. --calibrate: grid-search fov/elevation/yaw for the lowest mean landmark error
// (done once in H0; the result is frozen in HOUSE_CAM).
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const tag = process.argv[2] || 'test', CAL = process.argv.includes('--calibrate');
const OUT = path.join(ROOT, 'qa/house3d'); fs.mkdirSync(OUT, { recursive: true });
const REF = JSON.parse(fs.readFileSync(path.join(ROOT, 'refs/house_landmarks.json')));
const HH = REF.points[REF.house_bottom][1] - REF.points[REF.house_top][1];
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port, K = 2, W = 520 * K, H = 420 * K;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const err = (proj) => { let s = 0, n = 0; for (const [k, r] of Object.entries(REF.points)) if (proj[k]) { s += Math.hypot(proj[k][0] - r[0], proj[k][1] - r[1]) / HH; n++; } return s / n * 100; };
  let measure = null;
  for (const [name, extra] of [['ref', ''], ['mask', '&mask=1']]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 }); const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
    await pg.goto(`http://localhost:${port}/web/house.html?view=ref&K=${K}${extra}`);
    await pg.waitForFunction('window.READY', null, { timeout: 600000 });
    if (errs.length) console.error('ERRORS', errs.slice(0, 3));
    if (CAL && name === 'ref') {
      let best = null;
      for (const fov of [8, 11, 14, 18, 24, 32]) for (const el of [0, 2, 4, 6, 8, 11]) for (const yaw of [-2, 0, 2]) {
        const f = await pg.evaluate((c) => window.FIT(c).proj, { fovDeg: fov, elevDeg: el, yawDeg: yaw });
        const e = err(f); if (!best || e < best.e) best = { fov, el, yaw, e };
      }
      console.log('CALIBRATION best', JSON.stringify(best));
    }
    await pg.screenshot({ path: path.join(OUT, `${tag}_${name}@2x.png`), timeout: 600000 });
    if (name === 'ref') { measure = await pg.evaluate('window.MEASURE'); measure.stats = await pg.evaluate(() => window.STATS && window.STATS()); measure.frame_ms = await pg.evaluate(() => { const t0 = performance.now(); for (let i = 0; i < 3; i++) window.DRAW && window.DRAW(); return (performance.now() - t0) / 3; }); }
    await ctx.close();
  }
  await b.close(); srv.close();
  fs.writeFileSync(path.join(OUT, `${tag}_measure.json`), JSON.stringify(measure, null, 1));
  console.log(execFileSync('python3', [path.join(ROOT, 'tools/house_report.py'), tag], { encoding: 'utf8' }).split('\n').slice(-3).join('\n'));
});
