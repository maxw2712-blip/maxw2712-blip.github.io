// Build og.png, the 1200x630 link-preview image (2026-11-23): the real game in headless Chrome, Explore on one map, with a
// title block laid over the left side. Usage: node scripts/make_og.mjs <mode> <out.png>   (mode: modern, wwi, ww2...)
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';
const [mode, out] = process.argv.slice(2);
const page = 'file://' + path.resolve('pinpoint.html');
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ch = spawn(CH, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=9336', '--window-size=1200,630',
  '--user-data-dir=' + (process.env.TMPDIR || '/tmp') + '/pp-og', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(250); try { t = (await (await fetch('http://127.0.0.1:9336/json/list')).json()).find(x => x.type === 'page'); } catch (e) {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); let id = 0; const pend = {};
ws.onmessage = m => { const d = JSON.parse(m.data); if (pend[d.id]) { pend[d.id](d); delete pend[d.id]; } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({id: i, method, params})); });
await send('Emulation.setDeviceMetricsOverride', {width: 1200, height: 630, deviceScaleFactor: 1, mobile: false});
await send('Page.navigate', {url: page}); await sleep(4000);
const js = `(async () => {
  const W = ms => new Promise(r => setTimeout(r, ms)), $ = id => document.getElementById(id);
  localStorage.setItem('pinpoint:seen', '1');
  $('tabExplore').click(); await W(1500);
  const s = $('exploreMode'); s.value = ${JSON.stringify(mode)}; s.dispatchEvent(new Event('change', {bubbles: true})); await W(3500);
  ['exploreBar','zoomBtns','eraBar'].forEach(i => { const e = $(i); if (e) e.style.display = 'none'; });
  document.body.insertAdjacentHTML('beforeend', '<div id="ogCard" style="position:fixed;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(8,28,40,.94) 0%,rgba(8,28,40,.86) 34%,rgba(8,28,40,0) 62%);z-index:9999">'
    + '<div style="position:absolute;left:64px;top:150px;width:430px;color:#fff;font-family:Figtree,system-ui,sans-serif">'
    + '<div style="font:800 88px/1 \\'Bricolage Grotesque\\',system-ui,sans-serif;letter-spacing:-2px">Pinpoint</div>'
    + '<div style="margin-top:22px;font:600 31px/1.25 Figtree,system-ui,sans-serif">Find countries, flags and empires across 3,500 years of history</div>'
    + '<div style="margin-top:26px;font:500 21px/1.4 Figtree,system-ui,sans-serif;color:#bcd3dd">11 historical maps, a daily challenge and history quizzes. Free, no sign-up.</div>'
    + '<div style="margin-top:30px;display:inline-block;padding:10px 18px;border-radius:999px;background:#f4b740;color:#13202a;font:700 20px Figtree,system-ui,sans-serif">maxw2712-blip.github.io</div>'
    + '</div></div>');
  await W(800); return 'ok';
})()`;
const r = await send('Runtime.evaluate', {expression: js, awaitPromise: true, returnByValue: true});
console.log('page:', JSON.stringify(r.result.result && r.result.result.value));
const shot = await send('Page.captureScreenshot', {format: 'png', clip: {x: 0, y: 0, width: 1200, height: 630, scale: 1}});
fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log('wrote', out, fs.statSync(out).size, 'bytes');
ws.close(); ch.kill(); process.exit(0);
