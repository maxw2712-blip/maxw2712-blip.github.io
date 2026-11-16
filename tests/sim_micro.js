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
// micro-states (2026-11-16): 29 dots on the modern map, asked only on Hard (max 2) and Impossible (max 3), tappable
// through their screen-sized hit circles, flagged in Explore, shaded on the alliances map
(async()=>{
  await sleep(200);
  const MICRO=JSON.parse(fs.readFileSync('../src/data/MICRO.json','utf8')).map(r=>r[0]), MS=new Set(MICRO);
  const caps=[0,0,2,3], names=['easy','medium','hard','impossible'];
  click($('tabMap')); click(doc.querySelector('.seg[data-key="mode"] button[data-v="modern"]'));
  console.log('modern map: micro dots', doc.querySelectorAll('#map path.country.micro').length, '| hit circles', doc.querySelectorAll('#map .microHit circle').length);
  if(doc.querySelectorAll('#map path.country.micro').length!==29) errors.push('dots missing');
  for(let lv=0;lv<4;lv++){
    click(doc.querySelector('#ticks button[data-i="'+lv+'"]'));
    let maxPer=0, total=0, seen=new Set();
    for(let gm=0;gm<25;gm++){
      click($('start')); await sleep(5);
      let n=0;
      for(let i=0;i<10;i++){ const q=$('qname').textContent; if(MS.has(q)){ n++; seen.add(q); } click($('act')); await sleep(2); click($('act')); await sleep(2); }
      maxPer=Math.max(maxPer,n); total+=n;
      click($('change')); await sleep(5);
    }
    console.log(`${names[lv].padEnd(10)} 25 games: micro questions ${total}, most in one game ${maxPer} (cap ${caps[lv]}), different ${seen.size}`);
    if(maxPer>caps[lv]) errors.push(names[lv]+': too many micro-states in one game');
    if(caps[lv] && !total) errors.push(names[lv]+': micro-states never asked');
  }
  // tap a micro-state through its hit circle when it is asked (Hard)
  click(doc.querySelector('#ticks button[data-i="2"]'));
  let tapped=false;
  for(let gm=0;gm<40 && !tapped;gm++){
    click($('start')); await sleep(5);
    for(let i=0;i<10;i++){
      const q=$('qname').textContent;
      if(MS.has(q)){
        const before=+$('score').textContent.replace(/\D/g,'')||0;
        const c=[...doc.querySelectorAll('#map .microHit circle')].find(c=>c.__data__.properties.name===q);
        click(c); await sleep(5);
        const after=+$('score').textContent.replace(/\D/g,'')||0;
        console.log('tapped the hit circle of', q, '| score', before, '->', after);
        if(after<=before) errors.push('tapping a micro-state did not score');
        tapped=true; break;
      }
      click($('act')); await sleep(2); click($('act')); await sleep(2);
    }
    click($('home')); await sleep(5); click($('home')); await sleep(10);
    click($('tabMap')); await sleep(5);
  }
  if(!tapped) errors.push('no micro-state question found to tap');
  // Explore: flags painted on the dots; alliances shade Malta (EU 2004) and Singapore (ASEAN 1967)
  click($('tabExplore')); await sleep(80);
  const flagged=[...doc.querySelectorAll('#map g.pfill')].map(g=>g.getAttribute('data-key')).filter(k=>MS.has(k));
  console.log('explore: micro-states with a flag painted', new Set(flagged).size);
  if(new Set(flagged).size<29) errors.push('micro flags missing');
  click($('allyBtn')); await sleep(30);
  const setYear=y=>{ const r=$('allyRange'); r.value=String(y); r.dispatchEvent(new w.Event('input',{bubbles:true})); };
  const setA=v=>{ const s=$('allySel'); s.value=v; s.dispatchEvent(new w.Event('change',{bubbles:true})); };
  for(const [a,y,n] of [['EU',2010,'Malta'],['ASEAN',1967,'Singapore']]){
    setA(a); setYear(y); await sleep(10);
    const on=[...doc.querySelectorAll('#map g.ally .allyOn[data-micro]')].map(p=>p.getAttribute('data-micro'));
    console.log(`${a} ${y}: micro-states shaded`, on);
    if(on.indexOf(n)<0) errors.push(n+' not shaded');
  }
  console.log('errors',errors); process.exit(0);
})();
