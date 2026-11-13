// Shared by the home/arcade, 3D maps and construction vehicle pages.
// Native text fields remain editable; ordinary menu scrolling is preserved.
(function installGameTouchGuard(doc){
 'use strict';if(!doc||doc.getElementById('imasora-game-touch-guard'))return;
 const controls='button,[role="button"],[role="tab"],summary,a,canvas,input[type="button"],input[type="submit"],input[type="reset"],input[type="range"],.touch-pad,.ufo-flight-pad';
 const editable='input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]),textarea,select,[contenteditable]:not([contenteditable="false"]),[data-allow-text-selection]';
 const surface='[data-game-gesture-surface]';
 const style=doc.createElement('style');style.id='imasora-game-touch-guard';
 style.textContent=`:is(${controls}),:is(${controls}) *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-drag:none!important}
 :is(${editable}),:is(${editable}) *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}
 button,[role="button"],[role="tab"],summary,a{touch-action:manipulation}
 .concrete-controls [data-drive],.concrete-controls [data-move]{touch-action:none!important}
 ${surface}{touch-action:pan-y}`;
 (doc.head||doc.documentElement).append(style);
 const guard=e=>{const target=e.target?.nodeType===3?e.target.parentElement:e.target;if(!target?.closest||target.closest(editable)||!target.closest(controls))return;e.preventDefault();};
 for(const event of ['selectstart','contextmenu','dragstart'])doc.addEventListener(event,guard,{capture:true,passive:false});
 // Safari can recognize a page pinch across separate controls. Cancel only
 // its browser default, so both fingers still reach the movement handlers.
 const touches=new Map();let gameGesture=false;
 const inGame=target=>!!target?.closest&&!target.closest(editable)&&!!target.closest(surface);
 function reconcile(e){
  if(e.touches){const live=new Set();for(const t of Array.from(e.touches)){live.add(t.identifier);if(t.target)touches.set(t.identifier,inGame(t.target));else if(!touches.has(t.identifier))touches.set(t.identifier,inGame(e.target));}for(const id of touches.keys())if(!live.has(id))touches.delete(id);}
  else for(const t of Array.from(e.changedTouches??[])){if(e.type==='touchend'||e.type==='touchcancel')touches.delete(t.identifier);else touches.set(t.identifier,inGame(t.target??e.target));}
 }
 const prevent=e=>{if(e.cancelable!==false)e.preventDefault();};
 const hasGameTouch=()=>Array.from(touches.values()).some(Boolean);
 function multiTouch(e){reconcile(e);if(touches.size>1&&hasGameTouch())prevent(e);}
 for(const event of ['touchstart','touchmove'])doc.addEventListener(event,multiTouch,{capture:true,passive:false});
 for(const event of ['touchend','touchcancel'])doc.addEventListener(event,e=>{reconcile(e);if(touches.size<2)gameGesture=false;},{capture:true,passive:true});
 doc.addEventListener('gesturestart',e=>{gameGesture=hasGameTouch()||inGame(e.target);if(gameGesture)prevent(e);},{capture:true,passive:false});
 doc.addEventListener('gesturechange',e=>{if(gameGesture||hasGameTouch()||inGame(e.target))prevent(e);},{capture:true,passive:false});
 doc.addEventListener('gestureend',e=>{if(gameGesture||hasGameTouch()||inGame(e.target))prevent(e);gameGesture=false;},{capture:true,passive:false});
 const reset=()=>{touches.clear();gameGesture=false;};
 for(const event of ['blur','pagehide'])doc.defaultView?.addEventListener(event,reset);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)reset();});
})(typeof document==='undefined'?null:document);

/* BEGIN GAME BUTTON FEEDBACK */
// Embedded identically in the keyboard and touch entry points. Either can load first.
(function installGameButtonFeedback(global){
 'use strict';const doc=global.document;if(!doc?.createElement||!global.addEventListener||global.IMASORA_BUTTON_FEEDBACK)return;
 const buttonSelector='button,[role="button"],input[type="button"],input[type="submit"]';
 const editable='input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable],[role="textbox"]';
 const style=doc.createElement('style');style.id='imasora-game-button-feedback';
 style.textContent=`:is(${buttonSelector}):not(:disabled):not([aria-disabled="true"]){translate:0 -2px;filter:drop-shadow(0 3px 0 #14394d66)}
 :is(${buttonSelector})[data-game-press="true"],body.hunt #dash[data-latched="true"]{translate:0 2px!important;filter:brightness(.94) drop-shadow(0 1px 0 #14394d66)!important;box-shadow:inset 0 3px 5px #102d4555,inset 0 -1px 1px #ffffff55!important}
 @media(prefers-reduced-motion:no-preference){:is(${buttonSelector}){transition:translate 55ms ease-out,filter 55ms ease-out}}`;
 (doc.head||doc.documentElement).append(style);
 const owners=new Map(),painted=new Set();
 let keyboardScope=()=>doc;
 const onScreen=b=>!b.closest('[hidden],[inert]')&&(b.checkVisibility?.()??true)&&(b.getClientRects?.().length??1)>0;
 const visible=b=>!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&onScreen(b);
 const button=target=>target?.closest?.(buttonSelector);
 function paint(){const next=new Set();for(const buttons of owners.values())for(const b of buttons)if(onScreen(b))next.add(b);for(const b of painted)if(!next.has(b))b.removeAttribute('data-game-press');for(const b of next)b.setAttribute('data-game-press','true');painted.clear();for(const b of next)painted.add(b);}
 function release(){owners.clear();paint();}
 function releaseKeyboard(){
  for(const owner of owners.keys())if(owner.startsWith('key:'))owners.delete(owner);
  paint();
 }
 function pointerDown(e){if(e.button>0||e.pointerType==='touch')return;const b=button(e.target);if(!b||!visible(b))return;owners.set('pointer:'+e.pointerId,new Set([b]));paint();}
 function move(id,e){const held=owners.get(id);if(!held)return;const origin=[...held][0];if(doc.body?.classList.contains('hunt')&&origin?.closest('#pair')&&['dash','jump'].includes(origin.id)){const over=button(doc.elementFromPoint(e.clientX,e.clientY));owners.set(id,new Set(over?.closest('#pair')&&['dash','jump'].includes(over.id)?[origin,over]:[origin]));paint();}}
 function pointerMove(e){move('pointer:'+e.pointerId,e);}
 function pointerUp(e){owners.delete('pointer:'+e.pointerId);paint();}
 for(const [type,fn]of [['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerUp],['lostpointercapture',pointerUp]])doc.addEventListener(type,fn,true);
 // Touch identifiers reconcile Safari's omitted pointer-up without releasing a second finger.
 function touch(e){const live=new Set(Array.from(e.touches??[],t=>'touch:'+t.identifier));for(const id of owners.keys())if(id.startsWith('touch:')&&!live.has(id))owners.delete(id);for(const t of Array.from(e.changedTouches??[])){const id='touch:'+t.identifier;if(e.type==='touchstart'){const b=button(t.target??e.target);if(b&&visible(b))owners.set(id,new Set([b]));}else if(e.type==='touchmove')move(id,t);else owners.delete(id);}paint();}
 for(const type of ['touchstart','touchmove','touchend','touchcancel'])doc.addEventListener(type,touch,{capture:true,passive:true});
 const aliases={up:'forward',down:'back',backward:'back',accelerate:'forward',throttle:'forward',reverse:'back',fire:'shoot',rise:'surface'};
 function actionFor(b){
  if(b.closest('.keyboard-settings'))return null;
  const declared=b.dataset.gameAction||b.dataset.action||b.dataset.move||b.dataset.drive||b.dataset.hold;
  if(declared)return aliases[declared]||declared;
  const id=b.id??'',classes=b.classList;
  if(b.dataset.oar)return {left:'oarLeft',both:'oarBoth',right:'oarRight',brake:'brake'}[b.dataset.oar];
  if(id==='ufoSpaceFireButton')return 'shoot';
  if(id==='use'&&doc.body?.classList.contains('hunt'))return 'huntItem';
  if(id==='dive'&&doc.body?.classList.contains('hunt'))return 'huntDive';
  if(b.dataset.freeJump!==undefined||/jump/i.test(id)||classes.contains('jump'))return 'jump';
  if(b.dataset.holdDash!==undefined||/dash/i.test(id)||classes.contains('dash'))return 'dash';
  for(const [c,a]of [['coast-snorkel-dive','dive'],['coast-snorkel-rise','surface'],['coast-snorkel-net','net'],['coast-snorkel-kick','kick']])if(classes.contains(c))return a;
  return null;
 }
 function keysFor(b,e){
  const api=global.IMASORA_KEYS,bindings=api?.bindings??{},canonical=Object.prototype.hasOwnProperty.call(e,'imasoraConfirm');
  const action=actionFor(b),defaults=api?.actions?.find(a=>a.id===action)?.keys??[];
  if(action==='huntDive'||action==='huntItem'){
   const key=action==='huntDive'?'KeyH':'KeyL',conflict=['forward','back','left','right','jump','dash','tool','menu'].some(a=>bindings[a]?.includes(key));
   return [...(!conflict?[key]:[]),...(action==='huntItem'?(bindings.tool??[]):[])];
  }
  if(action&&api){const keys=canonical?defaults:(bindings[action]??[]);return b.id==='ufoSpaceFireButton'?[...keys,'KeyJ']:keys;}
  if(!api&&['jump','brake'].includes(action))return ['Space'];
  if(action&&['forward','back','left','right'].includes(action))return {forward:['KeyW','ArrowUp'],back:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']}[action];
  // Explicit per-map shortcuts also cover controls which have no shared action.
  return (b.getAttribute('aria-keyshortcuts')??'').split(/\s+/).filter(Boolean).map(k=>/^[a-z]$/i.test(k)?'Key'+k.toUpperCase():k);
 }
 function keyDown(e){
  if(e.code==='Escape'){release();return;}
  if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing||global.IMASORA_KEYS?.capturing||e.target?.closest?.(editable)||doc.hidden)return;
  if(doc.body?.classList.contains('hunt')&&!doc.body.classList.contains('playing'))return;
  const scope=keyboardScope(e);
  if(!scope){releaseKeyboard();return;}
  if(e.repeat&&owners.has('key:'+e.code))return;
  const matches=[...scope.querySelectorAll(buttonSelector)].filter(b=>visible(b)&&keysFor(b,e).includes(e.code));
  if(matches.length){owners.set('key:'+e.code,new Set(matches));paint();}
 }
 function keyUp(e){owners.delete('key:'+e.code);paint();}
 global.addEventListener('keydown',keyDown,true);global.addEventListener('keyup',keyUp,true);
 for(const type of ['blur','pagehide'])global.addEventListener(type,release);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)release();});
 global.IMASORA_BUTTON_FEEDBACK={release,releaseKeyboard,setKeyboardScope(resolve){releaseKeyboard();keyboardScope=resolve;}};
})(globalThis);
/* END GAME BUTTON FEEDBACK */
