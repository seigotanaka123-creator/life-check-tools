import {COAST_SEA_PLACES,coastSeaChart} from './imasora-coast-sea-chart.mjs?v=120mx';
import {COAST_PLACES,COAST_TOWN_CANAL,coastTime,coastShore} from './imasora-coast-layout.mjs?v=120mx';
import {coastAtlasPoint,coastAtlasLocation,coastAtlasMode,createCoastReturnGate} from './imasora-coast-navigation.mjs?v=120mx';
import {coastDestination,coastSearchAreas,coastSearchBearing,coastMapFrame,createCoastBoatReturnBearing} from './imasora-coast-wayfinding.mjs?v=120mx';

export function createCoastUI({host,context,clearInput,returnTown,onActivity=()=>{},destination=null,onDestinationChange=()=>{}}){
 const el=document.createElement('div');el.className='coast-hud';el.hidden=true;
 el.innerHTML='<div class="coast-weather"><small>IMASORA · SHORE</small><strong>ひかりの海岸</strong><span data-coast-time></span></div><button type="button" data-coast-map aria-label="海辺の地図・海図">🗺️ 地図・海図</button><button type="button" data-coast-town hidden>橋を渡って街へ</button><p data-coast-water hidden>浮きの内側で、波と遊ぼう</p>';
 const clock=el.querySelector('.coast-weather');clock.className+=' coast-place-clock';clock.querySelector('small').hidden=true;host.append(clock);
 const dialog=document.createElement('dialog');dialog.className='coast-atlas';dialog.setAttribute('aria-label','海辺の地図');
 const points=COAST_PLACES.map((p,i)=>{const a=coastAtlasPoint(p.x,p.z);return `<g data-map-pin="${p.id}" transform="translate(${a.x} ${a.y})"><circle r="14"/><text text-anchor="middle" dy="6">${i+1}</text></g>`;}).join('');
 const point=(x,z)=>{const p=coastAtlasPoint(x,z);return `${p.x},${p.y}`;};
 const shore=Array.from({length:61},(_,i)=>{const x=-900+i*30;return point(x,coastShore(x));}).join(' ');
 const beach=Array.from({length:61},(_,i)=>{const x=900-i*30;return point(x,coastShore(x)-105);}).join(' ');
 const canal=COAST_TOWN_CANAL,canalOutline=[[-900,canal.z-canal.halfWidth],[900,canal.z-canal.halfWidth],[900,canal.z+canal.halfWidth],[-900,canal.z+canal.halfWidth]].map(([x,z])=>point(x,z)).join(' ');
 dialog.innerHTML=`<header><div><small>どこへ行こう？</small><h2>海辺の地図</h2></div><button type="button" data-coast-close>とじる ✕</button></header>
 <div class="coast-atlas-layout"><section class="coast-atlas-picture" aria-label="現在地と行き先"><div class="coast-map-key"><button type="button" data-coast-locate>📍 現在地を見る</button><span>矢印は向いている方向</span></div><div class="coast-atlas-map">
 <svg viewBox="0 0 600 470" role="img" aria-label="北が上、沖は上側、浜と街は下側。現在地と施設の地図。">
 <defs><pattern id="coast-map-sea" width="40" height="24" patternUnits="userSpaceOnUse"><path d="M0 12q10-7 20 0t20 0" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/></pattern></defs>
 <rect width="600" height="470" rx="20" fill="#dcf0cc"/>
 <polygon points="${shore} ${beach}" fill="#ffe8b3"/><polygon points="0,470 600,470 ${shore.split(' ').reverse().join(' ')}" fill="#89d1df"/><polygon points="0,470 600,470 ${shore.split(' ').reverse().join(' ')}" fill="url(#coast-map-sea)"/>
 <path d="M${point(-192,-525)} L${point(-192,110)} L${point(665,110)} M${point(-192,110)} L${point(-650,110)} L${point(-650,185)} M${point(590,110)} L${point(590,75)}" fill="none" stroke="#fffaf0" stroke-width="15" stroke-linejoin="round"/>
 <polygon data-coast-canal points="${canalOutline}" fill="#89d1df" stroke="#b8af94" stroke-width="3"/><polygon points="${canalOutline}" fill="url(#coast-map-sea)"/>
 <path d="M${point(340,185)} L${point(340,580)}" stroke="#b98c58" stroke-width="13"/><path d="M${point(-192,-500)} L${point(-192,-240)}" stroke="#57958a" stroke-width="22"/><path d="M${point(-192,-500)} L${point(-192,-240)}" stroke="#edc77d" stroke-width="13"/>
 <text x="300" y="31" class="coast-map-title" text-anchor="middle">🏘️ いつもの街</text><text x="510" y="384" class="coast-map-title" text-anchor="middle">ひかりの海</text>
 <path data-coast-route fill="none" stroke="#ad6181" stroke-width="4" stroke-dasharray="7 6" pointer-events="none"/>
 <g class="coast-map-places">${points}</g>
 </svg><div class="coast-map-location" data-coast-dot role="img" aria-label="現在地"><span class="coast-map-location-ring"></span><span class="coast-map-location-heading" data-coast-heading></span><strong data-coast-location-label>いまここ</strong></div></div>
 <p class="coast-map-tip">気になる行き先をタップして、場所をたしかめよう。</p></section>
 <section class="coast-atlas-destinations" aria-label="行き先を選ぶ"><div class="coast-atlas-places">${COAST_PLACES.map((p,i)=>`<button type="button" data-coast-place="${p.id}" aria-pressed="false"><span class="coast-place-number">${i+1}</span><span class="coast-place-name">${p.icon} ${p.name}${p.id==='garden'?'<small>建築セット・花の加工はここ！</small>':''}</span></button>`).join('')}</div>
 <div class="coast-map-choice" hidden aria-live="polite"><strong data-map-name>行き先を選んでね</strong><p data-map-description>番号が同じ場所を、地図で見つけよう。砂浜のきらきらでは素材も見つかるよ。</p></div></section></div>`;
 const mapKey=dialog.querySelector('.coast-map-key');dialog.querySelector('.coast-atlas-layout').before(mapKey);dialog.append(dialog.querySelector('.coast-map-choice'));
 const svg=dialog.querySelector('svg'),shoreDrawing=svg.innerHTML,shoreButtons=dialog.querySelector('.coast-atlas-places').innerHTML,shoreLabel=svg.getAttribute('aria-label');
 const tabs=document.createElement('nav');tabs.className='coast-chart-tabs';tabs.setAttribute('aria-label','地図の範囲');tabs.innerHTML='<button type="button" data-chart="shore" aria-pressed="true">🏖️ 海岸</button><button type="button" data-chart="sea" aria-pressed="false">⛵ 海図</button>';dialog.querySelector('header').after(tabs);const locate=dialog.querySelector('[data-coast-locate]');locate.textContent='📍';locate.setAttribute('aria-label','現在地を見る');locate.title='現在地を見る';tabs.append(locate);
 const confirm=document.createElement('dialog');confirm.className='coast-return-dialog';confirm.setAttribute('aria-labelledby','coast-return-title');
 confirm.innerHTML='<span class="coast-return-icon" aria-hidden="true">🏘️</span><h2 id="coast-return-title">街に戻る？</h2><p>集めた素材や今いる場所は、セーブしてから戻るよ。</p><p data-return-error role="status" hidden></p><div><button type="button" data-return-no autofocus>いいえ</button><button type="button" data-return-yes>はい</button></div>';
 const compass=document.createElement('button');compass.type='button';compass.className='coast-search-compass';compass.hidden=true;compass.title='海図をひらく';compass.setAttribute('aria-haspopup','dialog');compass.setAttribute('aria-expanded','false');compass.setAttribute('aria-label','航海コンパス・海図をひらく');compass.addEventListener('pointerdown',event=>event.stopPropagation());compass.addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();});
 compass.innerHTML='<svg viewBox="0 0 80 80" aria-hidden="true"><circle class="coast-device-rim" cx="40" cy="40" r="37"/><g data-search-north><path class="coast-device-ticks" d="M40 6V12M74 40H68M40 74V68M6 40H12M16 16L20 20M64 16L60 20M64 64L60 60M16 64L20 60"/><text x="40" y="23" text-anchor="middle">N</text></g><g data-search-bearing><path class="coast-device-sector" d="M40 40L25 14Q40 5 55 14Z"/><path class="coast-device-needle" d="M40 18L35 43L40 39L45 43Z"/></g><path class="coast-device-boat" d="M40 32L45 45L40 42L35 45Z"/><text class="coast-device-near" x="40" y="59" text-anchor="middle" data-search-near>⌕</text></svg><div><strong data-search-name></strong><span data-search-side></span></div>';
 host.append(el,compass);document.body.append(dialog,confirm);
 let last='',lastMinute=-1,busy=false,selected=null,selectedTarget=null,lastPoint='',lastRoute='',lastHeading=null,chartMode='shore',chartKey='shore',navigationTarget=coastDestination(destination),frameKey='',mapFrame=coastMapFrame(0,'shore'),compassAt=-Infinity,compassKey='',atlasAt=-Infinity;
 const gate=createCoastReturnGate(),boatReturnBearing=createCoastBoatReturnBearing();const dot=dialog.querySelector('[data-coast-dot]'),heading=dialog.querySelector('[data-coast-heading]'),locationLabel=dialog.querySelector('[data-coast-location-label]');let route=dialog.querySelector('[data-coast-route]');
 const yes=confirm.querySelector('[data-return-yes]'),no=confirm.querySelector('[data-return-no]'),error=confirm.querySelector('[data-return-error]');
 const visited=c=>Array.isArray(c.visited)?c.visited:[];
 function orientMap(c){
  const key=chartMode;if(key===frameKey)return;frameKey=key;mapFrame=coastMapFrame(0,chartMode);
  let world=svg.querySelector('[data-chart-world]');if(!world){world=document.createElementNS('http://www.w3.org/2000/svg','g');world.setAttribute('data-chart-world','');for(const child of [...svg.childNodes])if(child.nodeName.toLowerCase()!=='defs')world.append(child);svg.append(world);}
  world.setAttribute('transform',`translate(300 235) scale(${mapFrame.scale}) rotate(${mapFrame.angle}) translate(-300 -235)`);
  for(const text of world.querySelectorAll('text'))text.setAttribute('transform',`rotate(${-mapFrame.angle} ${Number(text.getAttribute('x')??0)} ${Number(text.getAttribute('y')??0)})`);
  dialog.querySelector('.coast-map-key>span').textContent='北 ↑ · 浜は南';lastPoint='';lastHeading=null;
 }
 function updateAtlas(c){
  orientMap(c);const raw=coastAtlasLocation(c.x,c.z,c.heading,chartMode),p=mapFrame.point(raw),a={...raw,...p,rotation:raw.rotation+mapFrame.angle},key=`${a.x.toFixed(1)},${a.y.toFixed(1)},${a.contained}`;
  if(key!==lastPoint){dot.style.left=`${a.x/6}%`;dot.style.top=`${a.y/4.7}%`;dot.dataset.labelX=a.x<160?'left':a.x>440?'right':'center';dot.dataset.labelY=a.y<95?'below':'above';locationLabel.textContent=a.contained?'いまここ':'地図の外';dot.setAttribute('aria-label',a.contained?'現在地：いまここ。矢印は向いている方向です。':'現在地はこの地図の外です。「現在地を見る」で切り替えられます。');lastPoint=key;}
  // A paper-chart marker does not need the hull's sub-degree wave jitter.
  const angle=Math.round(a.rotation*2)/2;
  if(angle!==lastHeading){heading.style.transform=`rotate(${angle}deg)`;lastHeading=angle;}
  if(selected){const b=coastAtlasPoint(selectedTarget.x,selectedTarget.z,chartMode),path=chartMode==='sea'?'':`M${raw.x.toFixed(1)} ${raw.y.toFixed(1)}L${b.x} ${b.y}`;if(path!==lastRoute){route.setAttribute('d',path);lastRoute=path;}}
 }
 const playHere=document.createElement('button');playHere.type='button';playHere.className='coast-map-play';playHere.hidden=true;playHere.dataset.coastPlayHere='';dialog.querySelector('.coast-map-choice').append(playHere);
 const sailHere=document.createElement('button');sailHere.type='button';sailHere.className='coast-map-sail';sailHere.hidden=true;sailHere.dataset.coastDestination='';dialog.querySelector('.coast-map-choice').append(sailHere);
 const destinationBar=document.createElement('div');destinationBar.className='coast-map-destination';destinationBar.hidden=true;destinationBar.innerHTML='<span data-destination-current role="status"></span><button type="button" data-destination-clear>解除</button>';tabs.after(destinationBar);const clearDestination=destinationBar.querySelector('button');clearDestination.setAttribute('aria-label','目的地を解除');dialog.querySelector('.coast-map-choice').append(clearDestination);
 function destinationStatus(){
  const active=coastSearchAreas(visited(context())).find(p=>p.id===navigationTarget);
  destinationBar.hidden=true;destinationBar.querySelector('[data-destination-current]').textContent=active?'目的地：'+active.name:'目的地を選ぼう';
  clearDestination.hidden=chartMode!=='sea'||!active;sailHere.hidden=chartMode!=='sea'||!selected;
  sailHere.textContent=selected?.id===navigationTarget?'この目的地で海へ戻る':'ここを目的地にする';
  for(const p of dialog.querySelectorAll('[data-map-pin]'))p.classList.toggle('is-destination',chartMode==='sea'&&p.dataset.mapPin===navigationTarget);
 }
 function chooseDestination(id){navigationTarget=coastDestination(id);compassAt=-Infinity;destinationStatus();onDestinationChange(navigationTarget);}
 sailHere.onclick=()=>{if(chartMode!=='sea'||!selected)return;chooseDestination(selected.id);dialog.close();clearInput();};
 clearDestination.onclick=()=>chooseDestination(null);
 playHere.onclick=()=>{if(!selected||selected.id!=='pier')return;dialog.close();clearInput();onActivity('pier');};
 function showMap(id){const c=context();if(c.map!=='coast'||confirm.open)return;clearInput();const mode=id==='sea'||COAST_SEA_PLACES.some(p=>p.id===id&&id!=='pier')?'sea':coastAtlasMode(c.x,c.z),pick=typeof id==='string'&&id!=='sea'?id:chartMode===mode?selected?.id:null;setChart(mode);if(pick&&selected?.id!==pick)selectPlace(pick);updateAtlas(c);if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
 function askReturn(){if(busy||confirm.open||context().map!=='coast')return;gate.latch();clearInput();error.hidden=true;if(dialog.open)dialog.close();confirm.showModal();no.focus();}
 function selectPlace(id){
  const place=(chartMode==='sea'?coastSearchAreas(visited(context())):COAST_PLACES).find(p=>p.id===id);if(!place)return;selected=place;selectedTarget=place;dialog.querySelector('.coast-map-choice').hidden=false;
  for(const btn of dialog.querySelectorAll('[data-coast-place]'))btn.setAttribute('aria-pressed',String(btn.dataset.coastPlace===id));
  for(const p of dialog.querySelectorAll('[data-map-pin]'))p.classList.toggle('is-selected',p.dataset.mapPin===selected.id);
  dialog.querySelector('[data-map-name]').textContent=selected.name+(selected.id==='garden'?'・海辺の工房':'');
  dialog.querySelector('[data-map-description]').textContent=chartMode==='sea'?'方角をたよりに、島影を探そう。':selected.description;
  playHere.hidden=chartMode==='sea'||selected.id!=='pier';playHere.textContent='いかだの乗り口へ';
  destinationStatus();updateAtlas(context());
 }
 function bindPlaces(){for(const b of dialog.querySelectorAll('[data-coast-place]'))b.onclick=()=>selectPlace(b.dataset.coastPlace);for(const pin of svg.querySelectorAll('[data-map-pin]')){pin.setAttribute('role','button');pin.setAttribute('tabindex','0');pin.setAttribute('aria-label',(chartMode==='sea'?coastSearchAreas(visited(context())):COAST_PLACES).find(p=>p.id===pin.dataset.mapPin)?.name??'行き先');pin.onclick=()=>selectPlace(pin.dataset.mapPin);pin.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectPlace(pin.dataset.mapPin);}};}}
 function setChart(mode){
  const known=visited(context()),key=mode==='sea'?'sea:'+known.slice().sort().join('|'):'shore';
  if(mode===chartMode&&key===chartKey)return;chartMode=mode;chartKey=key;selected=null;selectedTarget=null;lastPoint='';lastRoute='';lastHeading=null;frameKey='';playHere.hidden=true;dialog.querySelector('.coast-map-choice').hidden=true;
  svg.innerHTML=mode==='sea'?coastSeaChart({visited:visited(context())}):shoreDrawing;svg.setAttribute('aria-label',mode==='sea'?'北が上、浜は南。島を探す広い海域と現在地。正確な島や上陸口は表示しません。':'北が上、沖は上側、浜と街は下側。現在地と施設の地図。');
  dialog.querySelector('.coast-atlas-places').innerHTML=mode==='sea'?coastSearchAreas(visited(context())).map(p=>'<button type="button" data-coast-place="'+p.id+'" aria-pressed="false"><span class="coast-place-number">'+p.icon+'</span><span class="coast-place-name">'+p.name+'</span></button>').join(''):shoreButtons;
  route=svg.querySelector('[data-coast-route]');bindPlaces();
  for(const b of tabs.querySelectorAll('[data-chart]'))b.setAttribute('aria-pressed',String(b.dataset.chart===mode));
  dialog.querySelector('[data-map-name]').textContent=mode==='sea'?'沖の島へ出かけよう':'行き先を選んでね';
  dialog.querySelector('[data-map-description]').textContent=mode==='sea'?'地図か行き先のボタンを押して、目的地を決めよう。':'番号が同じ場所を、地図で見つけよう。';if(mode==='sea'&&navigationTarget)selectPlace(navigationTarget);destinationStatus();updateAtlas(context());
 }
 bindPlaces();for(const b of tabs.querySelectorAll('[data-chart]'))b.onclick=()=>setChart(b.dataset.chart);
 dialog.querySelector('[data-coast-locate]').onclick=()=>{const c=context();setChart(coastAtlasMode(c.x,c.z));updateAtlas(c);dialog.scrollTop=0;};
 el.querySelector('[data-coast-map]').onclick=showMap;
 compass.onclick=()=>{showMap('sea');compass.setAttribute('aria-expanded',String(dialog.open));};
 dialog.addEventListener('close',()=>compass.setAttribute('aria-expanded','false'));
 dialog.querySelector('[data-coast-close]').onclick=()=>dialog.close();
 for(const d of [dialog,confirm]){d.addEventListener('close',clearInput);d.addEventListener('cancel',e=>{if(busy)e.preventDefault();clearInput();});}
 no.onclick=()=>{if(!busy)confirm.close();};
 yes.onclick=async()=>{
  if(busy)return;busy=true;clearInput();yes.disabled=no.disabled=true;yes.textContent='セーブ中…';error.hidden=true;
  try{if(await returnTown()===false)throw Error('いまは戻れないみたい。少し待って、もう一度ためしてね。');confirm.close();}
  catch(e){error.textContent=e?.message||'セーブできなかったよ。海岸に残って、もう一度ためしてね。';error.hidden=false;}
  finally{yes.disabled=no.disabled=false;yes.textContent='はい';busy=false;}
 };
 el.querySelector('[data-coast-town]').onclick=askReturn;
 function update(date=new Date()){
  const c=context();el.hidden=c.map!=='coast';clock.hidden=el.hidden;clock.style.visibility=c.overlay?'hidden':'visible';
  let place=c.riding||c.z>1000?'ひかりの海':'ひかりの海岸';const island=COAST_SEA_PLACES.find(p=>p.rx&&Math.abs(c.x-p.x)<p.rx*1.5&&Math.abs(c.z-p.z)<p.rz*1.7);if(island)place=island.name;else if(!c.riding){let nearest=140;for(const p of COAST_PLACES){const d=Math.hypot(c.x-p.x,c.z-p.z);if(d<nearest){nearest=d;place=p.name;}}}if(clock.querySelector('strong').textContent!==place)clock.querySelector('strong').textContent=place;
  if(el.hidden){compass.hidden=true;gate.update(c);if(dialog.open)dialog.close();if(confirm.open&&!busy)confirm.close();return;}
  const minute=Math.floor(+date/60000);
  if(minute!==lastMinute){lastMinute=minute;const t=coastTime(date),text=`${t.label} · ${date.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`;el.dataset.phase=t.phase;clock.dataset.phase=t.phase;if(text!==last){clock.querySelector('[data-coast-time]').textContent=text;last=text;}}
  const blocked=c.blocked||dialog.open||confirm.open||c.overlay||!!document.querySelector('dialog[open]');
  // Auto-save does not interrupt passive navigation information.
  const obscured=dialog.open||confirm.open||c.overlay||!!document.querySelector('dialog[open]');
  if(obscured)compass.hidden=true;
  const now=performance.now();if(!obscured&&now-compassAt>=100){compassAt=now;const r=c.riding?coastSearchBearing({...c,target:navigationTarget,visited:visited(c)}):boatReturnBearing.update(c);compass.hidden=!r;if(r){const danger=c.riding&&['caution','danger'].includes(c.raftDanger)?c.raftDanger:'safe';const key=[danger,!!r.ashore,r.name,r.inside,r.label,r.description,r.heading,Math.round(r.rotation),Math.round(r.northRotation)].join('|');if(key!==compassKey){compassKey=key;compass.setAttribute('data-danger',danger);const basis=r.ashore?'目線':'船首';compass.querySelector('[data-search-name]').textContent=r.unselected?'海図':r.name;compass.querySelector('[data-search-side]').textContent=r.unselected?'':r.inside?(r.id==='pier'?'浜を探す':'島影を探す'):r.label.replace(/の方$/, '');const fan=compass.querySelector('[data-search-bearing]');fan.setAttribute('transform',`rotate(${Math.round(r.rotation)} 40 40)`);fan.style.visibility=r.inside||r.unselected?'hidden':'visible';compass.querySelector('[data-search-north]').setAttribute('transform',`rotate(${Math.round(r.northRotation)} 40 40)`);compass.querySelector('[data-search-near]').style.display=r.inside?'':'none';compass.setAttribute('aria-label','海図をひらく。航海コンパス：'+basis+'は'+r.heading+'。'+r.name+'、'+r.label+'。'+r.description+(r.ashore?'':danger==='danger'?'。いかだは危険、赤色。':danger==='caution'?'。いかだは少し危険、黄色。':'。いかだは安定、緑色。'));}}}
  el.style.visibility=c.overlay?'hidden':'visible';
  el.querySelector('[data-coast-town]').hidden=blocked||Math.hypot(c.x+192,c.z+410)>95;
  el.querySelector('[data-coast-water]').hidden=true;
  if(dialog.open&&now-atlasAt>=100){atlasAt=now;updateAtlas(c);}
  if(gate.update({...c,blocked}))askReturn();
 }
 return {showMap,addAction:button=>el.append(button),update,get destination(){return navigationTarget;},get open(){return dialog.open||confirm.open;},dispose(){dialog.remove();confirm.remove();el.remove();compass.remove();clock.remove();}};
}
