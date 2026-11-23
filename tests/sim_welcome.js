const {JSDOM}=require('jsdom'); const fs=require('fs');
let html=fs.readFileSync(process.env.PINPOINT_HTML||'../pinpoint.html','utf8');
const d3src=fs.readFileSync('node_modules/d3/dist/d3.min.js','utf8'), tjsrc=fs.readFileSync('node_modules/topojson-client/dist/topojson-client.min.js','utf8');
html=html.replace(/<script src="[^"]*d3[^"]*"><\/script>/,()=>'<script>'+d3src.replace(/<\/script>/g,'<\\/script>')+'</script>')
         .replace(/<script src="[^"]*topojson[^"]*"><\/script>/,()=>'<script>'+tjsrc.replace(/<\/script>/g,'<\\/script>')+'</script>');
const errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// welcome for first-time visitors (2026-11-23): shown only with nothing saved; Play = Easy modern round; marks seen
function load(store){
  const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/',beforeParse(w){
    w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}}); w.addEventListener('error',e=>errors.push(e.message));
    for(const k in store) w.localStorage.setItem(k, store[k]); }});
  return dom.window;
}
(async()=>{
  // 1) fresh visitor
  let w=load({}), $=id=>w.document.getElementById(id), click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await sleep(200);
  const fresh={welcome:!$('welcome').hidden, cls:$('app').classList.contains('welcoming')};
  console.log('fresh visitor: welcome shown', fresh.welcome, '| class', fresh.cls);
  if(!fresh.welcome || !fresh.cls) errors.push('welcome not shown to a newcomer');
  click($('welPlay')); await sleep(50);
  const lvl=[...w.document.querySelectorAll('#ticks button')].findIndex(b=>b.classList.contains('on'));
  const mode=w.document.querySelector('.seg[data-key="mode"] button[aria-pressed="true"]');
  const play={setupHidden:$('setup').hidden, round:$('round').textContent, level:lvl, mode:mode&&mode.getAttribute('data-v'), seen:w.localStorage.getItem('pinpoint:seen'), cls:$('app').classList.contains('welcoming')};
  console.log('after Play:', JSON.stringify(play));
  if(!play.setupHidden || play.round!=='1 of 10' || play.level!==0 || play.mode!=='modern' || play.seen!=='1' || play.cls) errors.push('Play did not start an Easy modern round');
  // 2) a returning player (seen) and an old player who never saw it but has progress
  for(const store of [{'pinpoint:seen':'1'}, {'pinpoint:mastery':'{}'}, {'pinpoint:best:modern:easy:World:10':'20'}]){
    w=load(store); await sleep(150);
    const shown=!w.document.getElementById('welcome').hidden;
    console.log('stored', Object.keys(store)[0], '-> welcome shown', shown);
    if(shown) errors.push('welcome shown to a returning player ('+Object.keys(store)[0]+')');
  }
  // 3) settings alone do not count as having played
  w=load({'pinpoint:cfg':'{"auto":true}'}); await sleep(150);
  console.log('only settings saved -> welcome shown', !w.document.getElementById('welcome').hidden);
  if(w.document.getElementById('welcome').hidden) errors.push('settings alone hid the welcome');
  // 4) "See all modes" shows the menu and marks seen
  click(w.document.getElementById('welAll')); await sleep(20);
  console.log('See all modes -> welcome hidden', w.document.getElementById('welcome').hidden, '| seen', w.localStorage.getItem('pinpoint:seen'));
  if(!w.document.getElementById('welcome').hidden || w.localStorage.getItem('pinpoint:seen')!=='1') errors.push('See all modes failed');
  console.log('errors',errors); process.exit(0);
})();
