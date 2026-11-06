// Headless render of a web/ page: node tools/render.cjs <page?query> <out.png> [w h]
// Serves the repo root on a local port and screenshots once window.READY is set.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg' };
const [page, out, W = 600, H = 1000] = process.argv.slice(2);
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
}).listen(0, async () => {
  const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: +W, height: +H } });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto(`http://localhost:${port}/web/${page}`);
  await pg.waitForFunction('window.READY', null, { timeout: 240000 });
  const st = await pg.evaluate('window.READY');
  await pg.screenshot({ path: out });
  if (errs.length || st === 'error') console.error('ERRORS', errs.slice(0, 5), st);
  await b.close(); srv.close();
});
