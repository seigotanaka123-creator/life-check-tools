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
