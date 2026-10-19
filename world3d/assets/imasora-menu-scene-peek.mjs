// Hold the exposed scene to look behind a menu. No menu is closed or rebuilt,
// and this module never reads/writes a scene, inventory or save record.
const installed=new WeakMap();
const within=(p,r)=>Number.isFinite(p.clientX)&&Number.isFinite(p.clientY)&&r?.width>0&&r?.height>0&&p.clientX>=r.left&&p.clientX<=r.right&&p.clientY>=r.top&&p.clientY<=r.bottom;
export function createMenuScenePeek({surfaces,sceneBounds,canStart=()=>true,windowTarget=globalThis.window,documentTarget=globalThis.document,classTarget=documentTarget?.body,onStart=()=>{}}){
 const owners=new Map(),listeners=[];let held=null,suppressClick=false,disposed=false;
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push(()=>target?.removeEventListener(type,fn,options));};
 const block=e=>{if(e.cancelable!==false)e.preventDefault();e.stopImmediatePropagation?.();};
 const visible=()=>surfaces().filter(s=>!s.element.hidden&&s.element.isConnected!==false&&(!s.native||s.element.open));
 function candidate(e,p){
  if(documentTarget?.hidden||disposed||!canStart(e)||!within(p,sceneBounds()))return null;
  const list=visible();if(!list.length)return null;
  const targetDialog=e.target?.closest?.('dialog[open]');
  const top=list.find(s=>s.element===targetDialog)??list.filter(s=>s.native).at(-1)??list.filter(s=>s.element.contains?.(e.target)).at(-1)??list.at(-1);
  return within(p,top.card.getBoundingClientRect())?null:{top,list};
 }
 function start(kind,id,e,p){
  if(held){owners.set(kind+':'+id,{kind,id});block(e);return true;}
  const c=candidate(e,p);if(!c)return false;
  held={anchor:c.top.element,focus:documentTarget?.activeElement,records:[],blocks:[]};
  owners.set(kind+':'+id,{kind,id});suppressClick=true;
  const seen=new Set();
  for(const s of c.list){held.records.push({element:s.element,peek:s.element.getAttribute('data-menu-scene-peek'),aria:s.element.getAttribute('aria-hidden')});s.element.setAttribute('data-menu-scene-peek','true');s.element.setAttribute('aria-hidden','true');for(const el of s.blocks){if(seen.has(el))continue;seen.add(el);held.blocks.push({element:el,inert:el.inert});el.inert=true;}}
  classTarget?.classList.add('menu-scene-peeking');block(e);onStart();
  if(kind==='pointer')try{c.top.element.setPointerCapture?.(id);}catch{}
  return true;
 }
 function restore(focus=true){
  if(!held)return;const prior=held;held=null;
  for(const r of prior.records){for(const [name,value]of [['data-menu-scene-peek',r.peek],['aria-hidden',r.aria]])if(value===null)r.element.removeAttribute(name);else r.element.setAttribute(name,value);}
  for(const r of prior.blocks)r.element.inert=r.inert;
  classTarget?.classList.remove('menu-scene-peeking');
  for(const o of owners.values())if(o.kind==='pointer')try{if(prior.anchor.hasPointerCapture?.(o.id))prior.anchor.releasePointerCapture(o.id);}catch{}
  owners.clear();
  if(focus&&!documentTarget?.hidden&&prior.focus?.isConnected!==false&&prior.focus?.getClientRects?.().length&&!prior.focus.disabled)prior.focus.focus?.({preventScroll:true});
 }
 function end(kind,id){const key=kind+':'+id;if(!owners.has(key))return;const o=owners.get(key);owners.delete(key);if(o.kind==='pointer')try{if(held?.anchor.hasPointerCapture?.(id))held.anchor.releasePointerCapture(id);}catch{}if(!owners.size)restore();}
 const reconcile=e=>{if(!e.touches)return;const live=new Set(Array.from(e.touches,t=>'touch:'+t.identifier));for(const [key,o]of [...owners])if(o.kind==='touch'&&!live.has(key))end('touch',o.id);};
 listen(windowTarget,'pointerdown',e=>{if(e.pointerType==='touch'){if(held)block(e);return;}if(e.button!==0){if(held)block(e);return;}if(!held)suppressClick=false;start('pointer',e.pointerId,e,e);},true);
 listen(windowTarget,'pointermove',e=>{if(!held)return;block(e);if(e.pointerType==='mouse'&&owners.has('pointer:'+e.pointerId)&&(e.buttons&1)===0)end('pointer',e.pointerId);},true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(windowTarget,type,e=>{if(held)block(e);end('pointer',e.pointerId);},true);
 listen(windowTarget,'touchstart',e=>{if(!held)suppressClick=false;reconcile(e);for(const t of Array.from(e.changedTouches??[]))start('touch',t.identifier,e,t);if(held)block(e);},{capture:true,passive:false});
 listen(windowTarget,'touchmove',e=>{if(held)block(e);reconcile(e);},{capture:true,passive:false});
 for(const type of ['touchend','touchcancel'])listen(windowTarget,type,e=>{if(held)block(e);for(const t of Array.from(e.changedTouches??[]))end('touch',t.identifier);reconcile(e);},{capture:true,passive:false});
 listen(windowTarget,'click',e=>{if(held||suppressClick&&e.detail!==0){block(e);if(!held)suppressClick=false;}},true);
 for(const type of ['keydown','keyup','contextmenu','selectstart','dragstart','wheel'])listen(windowTarget,type,e=>{if(held)block(e);},{capture:true,passive:false});
 for(const type of ['blur','pagehide','resize'])listen(windowTarget,type,()=>restore(false),true);
 listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)restore(false);});
 listen(windowTarget,'close',e=>{if(held?.anchor===e.target)restore(false);},true);
 return{get active(){return !!held;},cancel(){restore(false);},sync(){if(held&&!visible().some(s=>s.element===held.anchor))restore(false);if(held)for(const r of held.blocks)r.element.inert=true;return !!held;},dispose(){restore(false);disposed=true;for(const remove of listeners)remove();}};
}
// Only the four work-mode panels and their toolboxes belong to this gesture.
// The real menu, save pages and confirmations keep their normal modal behavior.
export function constructionWorkPeekSurfaces(doc){
 const shown=el=>el&&!el.closest('[hidden],[data-developer-only],[data-player-debug]')&&el.getClientRects().length;
 const result=[];
 for(const panel of doc.querySelectorAll('.free-concrete[data-work-peek="true"]')){
  if(!shown(panel))continue;
  const deck=panel.querySelector('.free-deck'),overlay=panel.querySelector('.free-sheet-overlay');
  if(shown(deck))result.push({element:deck,card:deck,native:false,blocks:[deck]});
  if(shown(overlay)){const card=overlay.querySelector('.free-sheet');if(card)result.push({element:overlay,card,native:false,blocks:[card]});}
  for(const element of panel.querySelectorAll('.pop-subpage[open]'))if(shown(element))result.push({element,card:element,native:true,blocks:[...element.children]});
 }
 if(!result.length)return result;
 for(const el of doc.querySelectorAll('dialog[open],.world-map-menu,.gv-menu,.free-confirm-overlay'))if(shown(el)&&!result.some(s=>s.element===el))return [];
 return result;
}
export function installMenuScenePeek({onStart=()=>{}}={}){
 if(typeof document==='undefined'||!document.body)return null;
 if(installed.has(document))return installed.get(document);
 const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./imasora-menu-scene-peek.css?v=120ds',import.meta.url).href;document.head.append(css);
 const surfaces=()=>constructionWorkPeekSurfaces(document);
 const canStart=e=>!e.target?.closest?.('.free-hud-top,.free-basics,.free-deck-open,.free-stop,.free-work-watch,[data-hold-dash],button,a,input,select,textarea,summary,[role="button"],[role="tab"],[data-construction-pad]');
 const peek=createMenuScenePeek({surfaces,canStart,sceneBounds:()=>document.getElementById('viewport')?.getBoundingClientRect(),onStart(){onStart();document.dispatchEvent(new Event('imasora-menu-peek-start'));}});
 installed.set(document,peek);return peek;
}
