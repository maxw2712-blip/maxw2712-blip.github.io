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
// Explore: alliances over time (modern map) and the period slider
(async()=>{
  await sleep(200);
  click($('tabExplore')); await sleep(60);
  console.log('modern: alliances button visible', !$('allyBtn').hidden, '| period slider visible', !$('eraBar').hidden, 'at', $('eraRange').value);
  click($('allyBtn')); await sleep(30);
  const count=()=>doc.querySelectorAll('#map g.ally .allyOn').length;
  const setYear=y=>{ const r=$('allyRange'); r.value=String(y); r.dispatchEvent(new w.Event('input',{bubbles:true})); };
  const setA=v=>{ const s=$('allySel'); s.value=v; s.dispatchEvent(new w.Event('change',{bubbles:true})); };
  const want={NATO:[[1949,12],[1952,14],[1980,15],[2004,26],[2024,32]], EU:[[1958,6],[1973,9],[2019,27],[2020,26],[2026,26]], WARSAW:[[1960,23],[1970,22],[1991,0]], BRICS:[[2009,4],[2010,5],[2025,10]], ASEAN:[[1967,4],[1999,9],[2026,10]]};
  for(const [a,rows] of Object.entries(want)){
    setA(a); await sleep(5);
    for(const [y,n] of rows){
      setYear(y); await sleep(5);
      const got=count(); const shapes=new Set([...doc.querySelectorAll('#map g.ally .allyOn')].map(p=>p.getAttribute('d')));
      // a country drawn as several features counts once per feature; compare by members instead
      const names=JSON.parse(fs.readFileSync('../src/data/ALLIANCES.json','utf8'))[a].members.filter(m=>m[1]<=y&&!(m[2]&&y>=m[2])).length;
      if(names!==n) errors.push(`${a} ${y}: table says ${names}, expected ${n}`);
      if(!got && n) errors.push(`${a} ${y}: nothing shaded`);
      console.log(`${a.padEnd(6)} ${y}: ${n} members, ${got} shapes shaded | ${$('allyNote').textContent.slice(0,70)}`);
    }
  }
  setA('NATO'); setYear(1980); await sleep(5);
  const hatched=[...doc.querySelectorAll('#map g.ally .allyOn')].filter(p=>p.getAttribute('fill')==='url(#allyHatch)').length;
  console.log('NATO 1980: West Germany drawn hatched =', hatched>0); if(!hatched) errors.push('no hatch for West Germany');
  // play runs the years forward
  setYear(1949); click($('allyPlay')); await sleep(1100); const yPlay=+$('allyRange').value; click($('allyPlay'));
  console.log('play: 1949 -> ', yPlay, 'after ~1 s'); if(yPlay<=1950) errors.push('play does not advance');
  // mastery and alliances exclude each other
  click($('masteryBtn')); await sleep(30);
  console.log('mastery on: alliances off', !$('app').classList.contains('allying'), '| bar hidden', $('allyBar').hidden);
  if($('app').classList.contains('allying')) errors.push('both layers on');
  click($('masteryBtn')); await sleep(30);
  // period slider: to 1914
  const r=$('eraRange'); r.value='7'; r.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(1200);
  console.log('period slider -> select', $('exploreMode').value, '| alliances button hidden', $('allyBtn').hidden, '| labels', doc.querySelectorAll('#map .plabel').length);
  if($('exploreMode').value!=='wwi') errors.push('period slider did not switch');
  r.value='0'; r.dispatchEvent(new w.Event('input',{bubbles:true})); await sleep(1200);
  console.log('period slider -> select', $('exploreMode').value);
  const s=$('exploreMode'); s.value='geo'; s.dispatchEvent(new w.Event('change',{bubbles:true})); await sleep(900);
  console.log('geography: period slider hidden', $('eraBar').hidden, '| alliances hidden', $('allyBtn').hidden);
  console.log('errors',errors); process.exit(0);
})();
