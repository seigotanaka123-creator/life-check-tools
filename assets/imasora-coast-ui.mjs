import {COAST_PLACES,coastTime,coastShore} from './imasora-coast-layout.mjs?v=120go';
export function createCoastUI({host,context,clearInput,returnTown}){
 const el=document.createElement('div');el.className='coast-hud';el.hidden=true;
 el.innerHTML='<div class="coast-weather"><small>IMASORA · SHORE</small><strong>ひかりの海岸</strong><span data-coast-time></span></div><button type="button" data-coast-map>海辺の地図</button><button type="button" data-coast-town hidden>橋を渡って街へ</button><p data-coast-water hidden>浮きの内側で、波と遊ぼう</p>';
 const dialog=document.createElement('dialog');dialog.className='coast-atlas';dialog.setAttribute('aria-label','海辺の地図');
 const points=COAST_PLACES.map(p=>`<g transform="translate(${(p.x+900)/3} ${(p.z+700)/3})"><circle r="9"/><text y="-17" text-anchor="middle">${p.name}</text></g>`).join('');
 const shore=Array.from({length:31},(_,i)=>{const x=-900+i*60;return `${(x+900)/3},${(coastShore(x)+700)/3}`;}).join(' ');
 dialog.innerHTML=`<header><div><small>よりみちしよう</small><h2>ひかりの海岸</h2></div><button type="button" data-coast-close>海岸に戻る</button></header><p>街から続く、ひとつながりの海辺。気になる場所まで自由に歩こう。</p><svg viewBox="0 0 600 470" role="img" aria-label="北に街、南に海。左に灯台と潮だまり、右に庭と桟橋"><rect width="600" height="470" fill="#d8e9d8"/><polygon points="0,470 600,470 ${shore.split(' ').reverse().join(' ')}" fill="#9ad9e4"/><path d="M236 0V270H530 M65 270H236" fill="none" stroke="#fff5dd" stroke-width="12"/><path d="M413 297V425" stroke="#cba779" stroke-width="13"/><g class="coast-map-places">${points}</g><g data-coast-dot><circle r="8" fill="#f18b84" stroke="white" stroke-width="3"/><text y="24" text-anchor="middle">いまここ</text></g><text x="25" y="30" fill="#376278">↑ 街の方角</text></svg><div class="coast-atlas-places">${COAST_PLACES.map(p=>`<article><b>${p.icon} ${p.name}</b><p>${p.description}</p></article>`).join('')}</div>`;
 host.append(el);document.body.append(dialog);let last='',lastMinute=-1,busy=false;
 el.querySelector('[data-coast-map]').onclick=()=>{clearInput();if(!dialog.open)dialog.showModal();};
 dialog.querySelector('[data-coast-close]').onclick=()=>dialog.close();
 dialog.addEventListener('close',clearInput);dialog.addEventListener('cancel',clearInput);
 el.querySelector('[data-coast-town]').onclick=async()=>{if(busy)return;busy=true;clearInput();const b=el.querySelector('[data-coast-town]');b.disabled=true;b.textContent='街へ…';try{await returnTown();}finally{b.disabled=false;b.textContent='橋を渡って街へ';busy=false;}};
 function update(date=new Date()){
  const c=context();el.hidden=c.map!=='coast';if(el.hidden){if(dialog.open)dialog.close();return;}
  const minute=Math.floor(+date/60000);
  if(minute!==lastMinute){
   lastMinute=minute;const t=coastTime(date),text=`${t.label} · ${date.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`;
   el.dataset.phase=t.phase;
   if(text!==last){el.querySelector('[data-coast-time]').textContent=text;last=text;}
  }
  const blocked=c.blocked||dialog.open;el.style.visibility=c.overlay?'hidden':'visible';
  el.querySelector('[data-coast-town]').hidden=blocked||Math.hypot(c.x+192,c.z+410)>65;
  el.querySelector('[data-coast-water]').hidden=blocked||c.z<coastShore(c.x)+95||Math.abs(c.x-340)<80;
  if(dialog.open)dialog.querySelector('[data-coast-dot]').setAttribute('transform',`translate(${(c.x+900)/3} ${(c.z+700)/3})`);
 }
 return {update,get open(){return dialog.open;},dispose(){dialog.remove();el.remove();}};
}
