// Build src/img/depth.webp: ocean depth shading in the game's map frame (Natural Earth 1, 960x500 map units at 3 px per
// unit; drawn at 1.5 px per unit, which is enough for a soft gradient, and stretched to the same frame as relief.webp), as dark navy with an alpha that grows with depth, softly blurred.
// Source: Natural Earth 1:10m bathymetry polygons (public domain), v5.1.2 GeoJSON from github.com/nvkelso/natural-earth-vector:
// ne_10m_bathymetry_K_200 ... A_10000. Usage: node scripts/make_depth.mjs <dir with the geojson files> <out.webp>
// Needs Google Chrome and tests/node_modules/d3.
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const [srcDir, out] = process.argv.slice(2);
const d3file = path.resolve('tests/node_modules/d3/dist/d3.min.js');
// depth (m), how much navy each step adds (alpha composited, so deeper water darkens step by step)
const LEVELS = [['K_200', .06], ['J_1000', .08], ['I_2000', .08], ['H_3000', .09], ['G_4000', .10], ['F_5000', .09], ['E_6000', .09], ['D_7000', .08], ['C_8000', .06], ['B_9000', .05], ['A_10000', .05]];
const page = path.join(path.dirname(out), '_depth.html');
fs.writeFileSync(page, `<!doctype html><script src="file://${d3file}"></script><body></body>`);
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ch = spawn(CH, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9335', '--allow-file-access-from-files', '--user-data-dir=' + (process.env.TMPDIR || '/tmp') + '/pp-depth', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch('http://127.0.0.1:9335/json/list')).json()).find(x => x.type === 'page'); } catch (e) {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
await send('Page.navigate', {url: 'file://' + page}); await sleep(1500);
const files = LEVELS.map(([n, a]) => ['file://' + path.resolve(srcDir, 'ne_10m_bathymetry_' + n + '.geojson'), a]);
const fn = `async (files) => {
  const W = 960, H = 500, S = 1.5, c = document.createElement('canvas'); c.width = W*S; c.height = H*S;
  const x = c.getContext('2d');
  const proj = d3.geoNaturalEarth1().fitExtent([[6*S, 6*S], [(W-6)*S, (H-6)*S]], {type:'Sphere'});
  const gp = d3.geoPath(proj, x);
  const load = u => new Promise((res, rej) => { const q = new XMLHttpRequest(); q.open('GET', u); q.onload = () => res(JSON.parse(q.responseText)); q.onerror = rej; q.send(); });
  // GeoJSON rings are counter-clockwise; d3 wants clockwise exteriors, else it fills the rest of the sphere
  const fix = g => { const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
    return {type:'MultiPolygon', coordinates: polys.map(p => { const a = d3.geoArea({type:'Polygon', coordinates:p}); return a > 2*Math.PI ? p.map(r => r.slice().reverse()) : p; })}; };
  const stats = [];
  for (const [u, a] of files) {
    const gj = await load(u); x.fillStyle = 'rgba(8,46,108,' + a + ')';
    let n = 0;
    for (const f of gj.features) { if (!f.geometry) continue; x.beginPath(); gp(fix(f.geometry)); x.fill(); n++; }
    stats.push(u.split('_').slice(-2).join('_') + ':' + n);
  }
  // soften the contour steps into a gradient
  const b = document.createElement('canvas'); b.width = c.width; b.height = c.height;
  const bx = b.getContext('2d'); bx.filter = 'blur(2.5px)'; bx.drawImage(c, 0, 0);
  return {stats, url: b.toDataURL('image/webp', 0.7)};
}`;
const r = await send('Runtime.evaluate', {expression: `(${fn})(${JSON.stringify(files)})`, awaitPromise: true, returnByValue: true, timeout: 300000});
const v = r.result.result && r.result.result.value;
if (!v) { console.log('FAIL', JSON.stringify(r.result).slice(0, 500)); } else {
  fs.writeFileSync(out, Buffer.from(v.url.split(',')[1], 'base64'));
  console.log('layers', v.stats.join(' '), '| wrote', out, fs.statSync(out).size, 'bytes');
}
fs.unlinkSync(page); ws.close(); ch.kill(); process.exit(0);
