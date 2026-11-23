// Turn downloaded flag/emblem images into 320x240 realm flag tiles (webp) with headless Chrome.
// usage: node compose_realm_flags.mjs MAP.json OUTDIR [WIDTH HEIGHT]   (default 320 240; modern flags use 192 144;
// HEIGHT 'native' keeps each flag's own proportions at that width, so 1:2 flags such as the Soviet one are not cropped;
// a 5th argument 'emblem' forces the cream-field layout, for shields that fill most of their image)
// MAP.json = [[key, absolute image path], ...]. Images with a lot of transparency (seals, symbols) are centred on a
// cream field at 82 % height; opaque images (real flags) fill the tile (cover, centred).
import fs from 'node:fs'; import { spawn } from 'node:child_process';
const [mapPath, outDir, TW, TH, MODE] = process.argv.slice(2);
const items = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ch = spawn(CH, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9334', '--allow-file-access-from-files', '--user-data-dir=' + (process.env.TMPDIR || '/tmp') + '/pp-compose', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch('http://127.0.0.1:9334/json/list')).json()).find(x => x.type === 'page'); } catch (e) {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
await send('Page.navigate', {url: 'file://' + outDir + '/'}); await sleep(800);
const fn = `async (src, W, H, force) => {
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas');
  if (H === 0) H = Math.round(W * img.height / img.width); c.width = W; c.height = H; const x = c.getContext('2d');
  const p = document.createElement('canvas'); p.width = 64; p.height = 64; const px = p.getContext('2d'); px.drawImage(img, 0, 0, 64, 64);
  const a = px.getImageData(0, 0, 64, 64).data; let clear = 0; for (let i = 3; i < a.length; i += 4) if (a[i] < 128) clear++;
  const emblem = force || clear / 4096 > 0.1;
  if (emblem) { x.fillStyle = '#f3ead6'; x.fillRect(0, 0, W, H); const s = Math.min(W * 0.86 / img.width, H * 0.82 / img.height); const w = img.width * s, h = img.height * s; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }
  else { const s = Math.max(W / img.width, H / img.height); const w = img.width * s, h = img.height * s; x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }
  return {emblem, url: c.toDataURL('image/webp', 0.9)};
}`;
const enc = k => k.replace(/%/g, '%25').replace(/\//g, '%2F').replace(/:/g, '%3A');
for (const [key, src] of items) {
  const r = await send('Runtime.evaluate', {expression: `(${fn})(${JSON.stringify('file://' + src)}, ${+TW || 320}, ${TH === 'native' ? 0 : (+TH || 240)}, ${MODE === 'emblem'})`, awaitPromise: true, returnByValue: true});
  const v = r.result.result && r.result.result.value;
  if (!v) { console.log('FAIL', key, JSON.stringify(r.result.exceptionDetails || r.result).slice(0, 200)); continue; }
  fs.writeFileSync(outDir + '/' + enc(key) + '.webp', Buffer.from(v.url.split(',')[1], 'base64'));
  console.log(v.emblem ? 'emblem' : 'flag  ', key);
}
ws.close(); ch.kill(); process.exit(0);
