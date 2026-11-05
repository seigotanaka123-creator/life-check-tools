import{ITEM_DEFS,itemIcon}from'./imasora-sliding-tag-hunt-items.mjs';
import{createHuntInkNotice,INK_PAINT_SECONDS}from'./imasora-sliding-tag-hunt-ink-display.mjs';

export const ITEM_USE_SECONDS=INK_PAINT_SECONDS;
export const HOOK_USE_SECONDS=4.2;
export const itemUseDuration=id=>id==='hook'?HOOK_USE_SECONDS:ITEM_USE_SECONDS;
const clamp=v=>Math.max(0,Math.min(1,v));
const captions=Object.freeze({speed:'ぐんと加速',cloak:'姿を隠す',clone:'分身が走り出す',cushion:'後ろへころがす',curtain:'泡で視界を隠す',fan:'巨大ファンを設置',sheet:'すべる床を広げる',hook:'紐でビュンと移動',scarf:'予兆のあと加速',sunglasses:'試合中ずっと見通す',balloon:'ふわふわ近くまで',radar:'試合終了まで索敵',mirror:'後方ミラーを装着'});
const person='<circle cx="46" cy="26" r="9" fill="#fff6df"/><path d="M37 37Q46 32 55 37L58 58H34Z" fill="#86cbd4"/><path d="M39 59v7m14-7v7" stroke="#fff6df" stroke-width="5" stroke-linecap="round"/>';
const bubble=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#a8e5f744" stroke="#d6f7ff" stroke-width="1.7"/><path d="M${x-r*.5} ${y-r*.2}q0-${r*.5} ${r*.5}-${r*.5}" fill="none" stroke="#fff" stroke-width="2"/>`;
const icons=id=>'<g transform="translate(28 16)">'+itemIcon(id)+'</g>';
// A small effect illustration, with the same item design as the use button.
// No character models, lights, particles or new animation loop are allocated.
export function itemUseArtwork(id){
 if(!captions[id])return '';
 const shapes={
 speed:[person,'<path d="M5 28h24M1 42h23M8 55h21" stroke="#ffe7a0" stroke-width="3" stroke-linecap="round"/>',icons(id)],
 scarf:[person,'<path d="M6 30q16-13 26 0M2 44h27M8 57h20" fill="none" stroke="#ffd0b5" stroke-width="3" stroke-linecap="round"/>',icons(id)],
 cloak:[person,'<path d="M18 16l2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#e8d9ff"/>',icons(id)],
 clone:[person,'<g transform="translate(29 -5) scale(.84)">'+person+'</g>',icons(id)],
 cushion:['<path d="M70 51H18m0 0 9-8m-9 8 9 8" fill="none" stroke="#ffd3b2" stroke-width="2"/>','<path d="M67 26h15m-12 9h16" stroke="#ffd3b2" stroke-width="2"/>',icons(id)],
 curtain:[person,bubble(27,32,13)+bubble(53,20,15)+bubble(68,43,14)+bubble(43,54,12),icons(id)],
 fan:['<circle cx="46" cy="29" r="18" fill="#234956" stroke="#b9f1e3" stroke-width="2"/><path d="M46 48v15m-12 1h24" fill="none" stroke="#b9f1e3" stroke-width="4"/>','<path d="M67 17q17-7 20 3M69 30h22M67 43q17 7 20-3" fill="none" stroke="#ddfff5" stroke-width="2"/>','<g fill="#9ee1d3"><path d="M46 29Q26 2 39 10L48 24Z"/><path d="M46 29Q79 25 66 39L50 33Z"/><path d="M46 29Q37 63 31 45L41 32Z"/><circle cx="46" cy="29" r="4" fill="#fff7dc"/></g>'],
 sheet:['<path d="M13 50L65 36l20 19-53 14Z" fill="#9bd4f4" stroke="#d7f2ff" stroke-width="2"/>','<path d="M28 53l39-7m-31 15 38-8" stroke="#fff" stroke-width="2"/>',icons(id)],
 hook:['<g transform="translate(-14 17) scale(.7)">'+person+'<path d="M40 42L54 37" fill="none" stroke="#fff6df" stroke-width="5" stroke-linecap="round"/></g>','<path d="M82 8v58m-7 0h14" stroke="#dbd7bb" stroke-width="4"/><path data-rope fill="none" stroke="#ffe2b6" stroke-width="2.5"/><g data-latch stroke="#fff1ac" stroke-width="2"><path d="M73 7l-4-5m17 8 6-3m-7 15 6 3"/></g>','<path d="M-2-7V0Q-2 8 4 5q4-2 0-5" fill="none" stroke="#fac9a1" stroke-width="3" stroke-linecap="round"/>'],
 sunglasses:[person,'<path d="M19 28l-4-5m61 5 5-5M20 52l-6 2m62-2 6 2" stroke="#a7fff2" stroke-width="2"/>',icons(id)],
 balloon:['<g transform="translate(0 17) scale(.8)">'+person+'</g>','<path d="M45 50Q33 36 45 21" fill="none" stroke="#fff6e6" stroke-width="1.8"/>',icons(id)],
 mirror:['<path d="M8 53l24-12 14 4 21-9 18 10" fill="none" stroke="#b2dbf3" stroke-width="2"/>','<path d="M18 25h60M22 53h52" stroke="#fff3c7" stroke-width="2"/>','<g transform="translate(12 -9) scale(1.8)">'+itemIcon(id)+'</g>'],
 radar:['<circle cx="46" cy="37" r="27" fill="#173e4b" stroke="#8ce6d7" stroke-width="2"/><circle cx="46" cy="37" r="16" fill="none" stroke="#8ce6d766"/><path d="M46 10v54M19 37h54" stroke="#8ce6d744"/>','<circle cx="59" cy="24" r="3" fill="#ffe39d"/><circle cx="30" cy="48" r="2.5" fill="#ffe39d"/>','<path d="M46 37L46 11A26 26 0 0 1 72 37Z" fill="#8ce6d766"/><path d="M46 37V11" stroke="#c5fff4" stroke-width="2"/>']
 };
 const[a,b,main]=shapes[id];return '<svg viewBox="0 0 96 76" aria-hidden="true"><g data-body>'+a+'</g><g data-effect>'+b+'</g><g data-main>'+main+'</g></svg>';
}
export function itemUseFrame(id,time,at,reduced=false){
 if(id==='hook')return hookUseFrame(time,at,reduced);
 const age=Math.max(0,time-at),p=clamp((age-.08)/1.35),q=1-(1-p)**3;
 const f={active:age<ITEM_USE_SECONDS-1e-9,opacity:Math.min(clamp(age/.08),clamp((ITEM_USE_SECONDS-age)/.25)),body:'',effect:'',main:'',bodyOpacity:1,effectOpacity:1};
 if(reduced)return f;
 switch(id){
 case'speed':f.body=`translate(${q*17} 0)`;f.main=`translate(${q*17} -11)`;f.effect=`translate(${-p*15} 0)`;break;
 case'scarf':{const t=clamp((age-.6)/.8);f.body=`translate(${t*17} 0)`;f.main=`translate(${t*17} 0)`;f.effect=`translate(${-t*15} 0)`;f.effectOpacity=clamp(age/.6);break;}
 case'cloak':f.bodyOpacity=1-q*.85;f.main=`translate(0 ${-q*5})`;f.effect=`rotate(${p*40} 20 18)`;break;
 case'clone':f.effect=`translate(${q*15} 0)`;f.main=`translate(${-q*14} 0)`;f.body=`translate(${-q*12} 0)`;break;
 case'cushion':f.main=`translate(${24-q*48} 12) rotate(${-q*250} 48 36)`;f.effect=`translate(${-q*12} 0)`;break;
 case'curtain':f.effect=`translate(0 ${7-q*14})`;f.effectOpacity=.35+.65*q;f.bodyOpacity=1-q*.7;f.main=`translate(-23 12) scale(.7)`;break;
 case'fan':f.main=`rotate(${p*540} 46 29)`;f.effect=`translate(${p*9} 0)`;f.effectOpacity=.4+.6*Math.abs(Math.sin(age*5));break;
 case'sheet':f.body=`translate(13 50) scale(${.15+q*.85} 1) translate(-13 -50)`;f.effect=`translate(${q*8} 0)`;f.main=`translate(${-q*16} -4)`;break;
 case'hook':f.main=`translate(${-20+q*43} ${18-q*34})`;f.effectOpacity=q;break;
 case'sunglasses':f.main=`translate(0 ${-22+q*16}) scale(1 .8)`;f.effectOpacity=clamp((p-.4)/.3);break;
 case'balloon':f.main=`translate(2 ${8-q*27}) scale(.85)`;f.body=`translate(0 ${-q*11})`;f.effect=`translate(0 ${-q*11})`;break;
 case'mirror':f.main=`translate(0 ${(1-q)*12})`;f.effectOpacity=q;break;
 case'radar':f.main=`rotate(${p*360} 46 37)`;f.effectOpacity=.35+.65*Math.abs(Math.sin(age*4));break;
 }
 return f;
}
export function hookUseFrame(time,at,reduced=false){
 const age=Math.max(0,time-at),stage=age<.7?0:age<1.4?1:age<2.1?2:age<3.4?3:4,t=clamp((age-2.1)/1.3),travel=t*t*(3-2*t),fly=clamp(age/.7),returning=clamp((age-3.4)/.6),body=reduced?47:47*travel,x=reduced?80:age<.7?24+56*fly:80-9*returning,y=reduced?14:age<.7?43-29*fly-10*Math.sin(Math.PI*fly):14+29*returning;
 return{active:age<HOOK_USE_SECONDS-1e-9,opacity:Math.min(clamp(age/.08),clamp((HOOK_USE_SECONDS-age)/.25)),body:`translate(${body} 0)`,effect:'',main:`translate(${x} ${y})`,bodyOpacity:1,effectOpacity:1,rope:`M${24+body} 43Q${(24+body+x)/2} ${age<1.4&&!reduced?52:28} ${x} ${y}`,ropeOpacity:age>3.4?1-returning:1,latchOpacity:stage===1?1:0,caption:['フックを発射','ポールに引っかける','紐をピンと張る','紐に引かれて移動','到着・紐をしまう'][stage]};
}

// Observe successful simulation events, not clicks. Only the human's own use
// is announced; incoming ink keeps its existing, valid runner-target feedback.
export function createHuntItemNotice({document:doc=globalThis.document,reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false}={}){
 const ink=createHuntInkNotice({document:doc,reducedMotion}),el=doc.createElement('div');
 el.className='tag-ink-paint tag-item-use';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');doc.body.append(el);
 let active=null,lastEvent=0,pending=[],nodes=null,disposed=false;
 function start(s,event){active={id:event.item,at:s.time};el.hidden=true;ink.reset();
  if(event.item==='ink'){ink.event(s,event);return;}
  const d=ITEM_DEFS[event.item];el.innerHTML='<style>.tag-item-use{border-color:var(--item-color)}.tag-item-use span{display:flex;flex-direction:column;line-height:1.4}.tag-item-use b{font-size:13px}.tag-item-use small{font:600 11px/1.4 system-ui;color:#d2e8e8}.tag-item-use .item-icon{width:40px;height:40px}</style>'+itemUseArtwork(d.id)+'<span><b data-name></b><small data-caption></small></span>';
  el.style.setProperty('--item-color',d.color);el.setAttribute('data-item',d.id);el.querySelector('[data-name]').textContent=d.name;el.querySelector('[data-caption]').textContent=captions[d.id];
  nodes={body:el.querySelector('[data-body]'),effect:el.querySelector('[data-effect]'),main:el.querySelector('[data-main]'),rope:d.id==='hook'?el.querySelector('[data-rope]'):null,latch:d.id==='hook'?el.querySelector('[data-latch]'):null,caption:el.querySelector('[data-caption]')};
 }
 function reset(){active=null;pending=[];lastEvent=0;nodes=null;el.hidden=true;ink.reset();}
 return{event(s,e){
  if(disposed||s.phase!=='playing'||!Number.isSafeInteger(e.id)||e.id<=lastEvent)return false;
  const own=s.config.mode==='hunt'?s.hunters[0]:s.player;
  let item=e.item;
  if(e.type==='runner-inked'){if(e.target!==s.player.owner||!s.hunters.some(a=>a.owner===e.owner))return false;item='ink';}
  else{const d=ITEM_DEFS[item];if(e.type!=='item-use'||e.owner!==own.owner||!d||item==='ink'||(d.audience!=='both'&&d.audience!==(own===s.player?'player':'hunters')))return false;}
  lastEvent=e.id;const event={...e,item};if(!active)start(s,event);else{if(pending.length===3)pending.shift();pending.push(event);}return true;
 },update(s,{visible=true}={}){
  if(disposed)return;
  if(s.phase!=='playing'){if(active||pending.length||!el.hidden||!ink.element.hidden)reset();return;}
  if(active&&s.time-active.at>=itemUseDuration(active.id)-1e-9){active=null;el.hidden=true;ink.reset();if(pending.length)start(s,pending.shift());}
  if(!active){if(!el.hidden)el.hidden=true;return;}
  if(active.id==='ink'){if(!el.hidden)el.hidden=true;ink.update(s,{visible});return;}
  const f=itemUseFrame(active.id,s.time,active.at,reducedMotion),hidden=!visible||!f.active;if(el.hidden!==hidden)el.hidden=hidden;if(hidden)return;
  el.style.opacity=String(f.opacity);for(const key of['body','effect','main'])nodes[key].setAttribute('transform',f[key]);nodes.body.style.opacity=String(f.bodyOpacity);nodes.effect.style.opacity=String(f.effectOpacity);
  if(nodes.rope){nodes.rope.setAttribute('d',f.rope);nodes.rope.style.opacity=String(f.ropeOpacity);nodes.latch.style.opacity=String(f.latchOpacity);if(nodes.caption.textContent!==f.caption)nodes.caption.textContent=f.caption;}
 },reset,dispose(){if(disposed)return;reset();disposed=true;ink.dispose();el.remove();},stats:()=>({item:active?.id??null,pending:pending.length,elements:disposed?0:2}),element:el,inkElement:ink.element};
}
