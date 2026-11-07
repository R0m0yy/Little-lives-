// Naomi reference measurement: node tools/naomi_measure.cjs <tag> [model.glb]
// Renders web/viewer.html?view=ref (reference-matched camera, see web/lib/refcam.js) at 2x device pixel ratio:
//   qa/naomi3d/<tag>_ref_head@2x.png   beauty, head window (K=4 px per board px, 2x supersampled)
//   qa/naomi3d/<tag>_ref_mask@2x.png   white head+hair silhouette on black, same window
//   qa/naomi3d/<tag>_ref_full@2x.png   beauty, full-body window (K=3)
//   qa/naomi3d/<tag>_measure.json      camera fit + projected landmarks (board px)
// then runs tools/naomi_report.py <tag> for the landmark error table, silhouette IoU and onion-skin overlay.
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png' };
const tag = process.argv[2] || 'test';
const model = process.argv[3] || '../assets/characters/naomi.glb';
const OUT = path.join(ROOT, 'qa/naomi3d'); fs.mkdirSync(OUT, { recursive: true });

const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const shots = [
    { name: 'ref_head', win: 'head', K: 4, extra: '', w: 155 * 4, h: 125 * 4 },
    { name: 'ref_mask', win: 'head', K: 4, extra: '&mask=1', w: 155 * 4, h: 125 * 4 },
    { name: 'ref_full', win: 'full', K: 3, extra: '', w: 175 * 3, h: 310 * 3 },
  ];
  let measure = null;
  for (const s of shots) {
    const ctx = await b.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await pg.goto(`http://localhost:${port}/web/viewer.html?view=ref&win=${s.win}&K=${s.K}&model=${encodeURIComponent(model)}${s.extra}`);
    await pg.waitForFunction('window.READY', null, { timeout: 300000 });
    if (errs.length) console.error('ERRORS', s.name, errs.slice(0, 4));
    await pg.screenshot({ path: path.join(OUT, `${tag}_${s.name}@2x.png`), timeout: 300000 });
    if (s.name === 'ref_head') measure = await pg.evaluate('window.MEASURE');
    await ctx.close();
  }
  await b.close(); srv.close();
  fs.writeFileSync(path.join(OUT, `${tag}_measure.json`), JSON.stringify(measure, null, 1));
  console.log(execFileSync('python3', [path.join(ROOT, 'tools/naomi_report.py'), tag], { encoding: 'utf8' }));
});
