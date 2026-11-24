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
// daily "journey through time" (2026-11-24): 7 finds on maps in time order + 3 trivia, easy to hard, hints off after Q5
(async()=>{
  await sleep(200);
  w.localStorage.setItem('pinpoint:seen','1');
  const TR=JSON.parse(fs.readFileSync('../src/data/TRIVIA.json','utf8'));
  const order=['Bronze','Classical','Ancient','Early medieval','Medieval','Age of Discovery','Congress of Vienna','World War I','World War II','Cold War','Modern'];
  click($('dailyBtn')); await sleep(30);
  const seen=[]; let triviaScored=false;
  for(let i=0;i<10;i++){
    const trivia=$('app').classList.contains('trivia');
    const row={i:i+1, kind:$('kind').textContent, q:trivia?$('tQuestion').textContent:$('qname').textContent, trivia, hint:$('hint').textContent, round:$('round').textContent};
    seen.push(row);
    if(trivia && !triviaScored){
      const T=TR.find(t=>t.q===row.q); const btn=[...$('tOpts').querySelectorAll('button')].find(b=>b.textContent.slice(1)===T.a);
      click(btn); await sleep(20); triviaScored=true; row.answered=true;
      click($('act')); await sleep(40); continue;
    }
    click($('act')); await sleep(15); if(!trivia){ click($('act')); await sleep(40); } else { click($('act')); await sleep(40); }
  }
  seen.forEach(r=>console.log(String(r.i).padStart(2), r.trivia?'TRIVIA':'find  ', '|', r.kind.padEnd(34), '|', r.q.slice(0,60), r.answered?'(answered right)':'', '| hints', !/No hints/.test(r.hint)));
  const finds=seen.filter(r=>!r.trivia), triv=seen.filter(r=>r.trivia);
  if(seen.length!==10 || finds.length!==7 || triv.length!==3) errors.push('expected 7 finds and 3 trivia');
  if(JSON.stringify(triv.map(r=>r.i))!=='[3,6,9]') errors.push('trivia not at 3, 6, 9: '+triv.map(r=>r.i));
  const idx=finds.map(r=>order.findIndex(o=>r.kind.includes(o)));
  if(idx.some(x=>x<0) || idx.some((x,k)=>k && x<=idx[k-1])) errors.push('maps not in time order: '+finds.map(r=>r.kind));
  if(!finds[6].kind.includes('Modern')) errors.push('last map is not today');
  if(seen.slice(0,5).some(r=>/No hints/.test(r.hint)) || seen.slice(5).some(r=>!/No hints from here on/.test(r.hint))) errors.push('hints should be on for 1-5 and off for 6-10');
  const rec=JSON.parse(w.localStorage.getItem('pinpoint:daily')).days; const r=Object.values(rec)[0];
  console.log('saved log', JSON.stringify(r.log), 'mode', r.mode, 'done', r.done);
  if(r.log.length!==10 || r.log.reduce((a,b)=>a+b,0)!==3) errors.push('the right trivia answer (3 points) was not saved in the daily log');
  const rows=[...$('log').querySelectorAll('li')].map(li=>li.textContent);
  console.log('end rows:', rows.slice(0,4).join(' || '));
  if(rows.length!==10 || rows.some(t=>/undefined/.test(t))) errors.push('end screen rows');
  if(!$('recapWrap').hidden) errors.push('recap map should be hidden for a journey');
  if($('app').classList.contains('trivia')) errors.push('trivia class left on');
  console.log('errors',errors); process.exit(0);
})();
