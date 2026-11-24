const {JSDOM}=require('jsdom'); const fs=require('fs');
let html=fs.readFileSync('../pinpoint.html','utf8');
const d3src=fs.readFileSync('node_modules/d3/dist/d3.min.js','utf8'), tjsrc=fs.readFileSync('node_modules/topojson-client/dist/topojson-client.min.js','utf8');
html=html.replace(/<script src="[^"]*d3[^"]*"><\/script>/,()=>'<script>'+d3src.replace(/<\/script>/g,'<\\/script>')+'</script>')
         .replace(/<script src="[^"]*topojson[^"]*"><\/script>/,()=>'<script>'+tjsrc.replace(/<\/script>/g,'<\\/script>')+'</script>');
const errors=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.com/',beforeParse(w){w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});w.addEventListener('error',e=>errors.push(e.message));}});
const w=dom.window,doc=w.document,$=id=>doc.getElementById(id);
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// badges (2026-11-24): 29 badges from saved data; earned once, named on the end screen; page lists progress
(async()=>{
  await sleep(200);
  w.localStorage.setItem('pinpoint:seen','1');
  click($('badgesBtn')); await sleep(20);
  const tiles=()=>[...$('bdGrid').querySelectorAll('.bd')];
  console.log('fresh:', $('bdSum').textContent, '| tiles', tiles().length, '| panel open', !$('badgesPanel').hidden);
  if(tiles().length!==29) errors.push('expected 29 badges, got '+tiles().length);
  if(tiles().some(t=>t.classList.contains('on'))) errors.push('a fresh player has a badge');
  console.log('names:', tiles().map(t=>t.querySelector('b').textContent).join(' | '));
  click($('bdDone')); await sleep(10);
  // play one game (skip everything) -> "First steps"
  click($('tabMap')); click(doc.querySelector('#ticks button[data-i="0"]')); click($('start')); await sleep(20);
  for(let i=0;i<10;i++){ click($('act')); await sleep(5); click($('act')); await sleep(5); }
  await sleep(50);
  console.log('end screen:', $('bdNew').hidden ? '(none)' : $('bdNew').textContent);
  if(!/First steps/.test($('bdNew').textContent)) errors.push('First steps not announced');
  click($('home')); await sleep(5); click($('home')); await sleep(20);
  // a second game does not announce it again
  click($('start')); await sleep(20); for(let i=0;i<10;i++){ click($('act')); await sleep(5); click($('act')); await sleep(5); } await sleep(50);
  if(!$('bdNew').hidden) errors.push('badge announced twice: '+$('bdNew').textContent);
  click($('home')); await sleep(5); click($('home')); await sleep(20);
  // saved data the badges read: a 7-day streak, a perfect flags game, 25 in dating, mastery of Oceania
  const D={last:'2026-11-23', streak:7, best:7, days:{'2026-11-23':{n:11, mode:'journey', log:[3,3,3,3,3,3,3,3,3,3], done:true}}};
  w.localStorage.setItem('pinpoint:daily', JSON.stringify(D));
  w.localStorage.setItem('pinpoint:best:flags:hard:World:10','30');
  w.localStorage.setItem('pinpoint:best:dating:medium:10','26');
  const oce=['Fiji','Papua New Guinea','Vanuatu','Solomon Is.','New Zealand','Australia'];
  const M={modern:{}}; oce.forEach(n=>M.modern[n]=[3,[3,3,3]]); w.localStorage.setItem('pinpoint:mastery', JSON.stringify(M));
  // explore all 11 maps -> Explorer
  click($('tabExplore')); await sleep(200);
  for(const m of ['bronze','classical','ancient','early','medieval','discovery','vienna','wwi','ww2','coldwar','modern']){ const s=$('exploreMode'); s.value=m; s.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(500); }
  click($('exploreBar').querySelector('#exploreHome') || $('home')); await sleep(50);
  click($('badgesBtn')); await sleep(30);
  const on=tiles().filter(t=>t.classList.contains('on')).map(t=>t.querySelector('b').textContent);
  console.log('after:', $('bdSum').textContent, '| earned:', on.join(', '));
  for(const n of ['First steps','On a roll','Week-long streak','First journey','Flawless journey','Perfect round','Flag expert','Time traveller','Explorer']) if(on.indexOf(n)<0) errors.push('missing badge '+n);
  if(on.indexOf('Know Oceania')<0) errors.push('Know Oceania not earned');
  console.log('errors',errors); process.exit(0);
})();
