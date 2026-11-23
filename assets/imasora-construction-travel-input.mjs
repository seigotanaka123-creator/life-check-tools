import {createHeldDashButton,holdDashButtonTemplate} from './imasora-hold-dash.mjs?v=120od';
import {createTravelAcceleration} from './imasora-construction-locomotion.mjs?v=121d1';
export const DOUBLE_TAP_MS=380;
export const walkFactor=input=>input?.fast===true?2.5:1;
export const driveFactor=input=>input?.fast===true?2:1;
const aliases={KeyW:'north',ArrowUp:'north',w:'north',arrowup:'north',forward:'north',accelerate:'north',north:'north',KeyS:'south',ArrowDown:'south',s:'south',arrowdown:'south',back:'south',reverse:'south',south:'south',KeyA:'west',ArrowLeft:'west',a:'west',arrowleft:'west',left:'west',west:'west',KeyD:'east',ArrowRight:'east',d:'east',arrowright:'east',right:'east',east:'east'};
export const travelDirection=value=>aliases[value]??null;
export function createTravelTap(){
 const held=new Map();let last=null,fast=false;
 return{
  press(direction,source,now,{repeat=false}={}){direction=travelDirection(direction);if(!direction||repeat||held.has(source)||!Number.isFinite(now))return false;
   if(last?.released&&last.direction===direction&&now>=last.at&&now-last.at<=DOUBLE_TAP_MS)fast=true;
   last={direction,source,at:now};held.set(source,direction);return fast;
  },
  release(source){held.delete(source);if(last?.source===source)last.released=true;if(!held.size)fast=false;},
  reset(){held.clear();last=null;fast=false;},
  get fast(){return fast;},get held(){return held.size;}
 };
}
// Observe presses without synthesizing events or taking ownership away from each
// vehicle's input gate. Work modes, menus, blur and pointer cancellation clear it.
export function bindTravelBoost({panel,enabled,context,selector='[data-hold]',attribute='hold',show=true}){
 // Geometry-only checks can construct views without installing browser input.
 if(typeof window==='undefined'||typeof document==='undefined')return{reset(){},fast:false,input:value=>({...value,fast:false})};
 const tap=createTravelTap(),dashKeys=new Set(),footAcceleration=createTravelAcceleration();let mode=null;
 const dashKey=e=>e.code==='KeyK'||!e.code&&e.key?.toLowerCase()==='k'?'KeyK':null;
 const dock=show?(panel.querySelector('.gv-quick')??panel):null;
 dock?.insertAdjacentHTML('beforeend',holdDashButtonTemplate());
 const button=dock?.lastElementChild;
 if(button){button.classList.add('work-foot-dash');button.hidden=true;}
 const dash=createHeldDashButton({element:button,context,enabled:()=>!!button&&!button.hidden&&enabled()&&['foot','driving','truck','pump'].includes(context())});
 const badge=show?document.createElement('span'):null;
 if(badge){badge.setAttribute('role','status');badge.setAttribute('aria-label','移動速度');badge.hidden=true;(panel.querySelector('header')??panel).append(badge);}
 function sync(){const next=context(),allowed=enabled()&&['foot','driving','truck','pump'].includes(next);if(!allowed||mode!==next){tap.reset();dashKeys.clear();dash.cancel();footAcceleration.reset();}mode=next;return allowed;}
 function render(fast=tap.fast){if(badge){badge.hidden=!fast;badge.textContent=fast?(mode==='foot'?'走る 2.5倍':'高速走行 2倍'):'';}}
 function reset(){tap.reset();dashKeys.clear();dash.cancel();footAcceleration.reset();if(button)button.hidden=true;render();}
 const textEntry=e=>e.target?.closest?.('input,select,textarea,[contenteditable="true"]');
 const keyDown=e=>{if(!sync()||textEntry(e)||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;const dir=travelDirection(e.code||e.key);if(dir)tap.press(dir,'key:'+(e.code||e.key),performance.now(),{repeat:e.repeat});else if(dashKey(e)){if(mode==='foot'||dashKey(e)==='KeyK'){if(!e.repeat)dashKeys.add(dashKey(e));}}render();};
 const keyUp=e=>{dashKeys.delete(dashKey(e));tap.release('key:'+(e.code||e.key));render();};
 window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);
 panel.addEventListener('pointerdown',e=>{const b=e.target.closest?.(selector);if(!b||b.disabled||e.button!==0||!sync())return;const dir=travelDirection(b.dataset[attribute]);if(dir)tap.press(dir,'pointer:'+e.pointerType+':'+dir,performance.now());else reset();render();},true);
 const releasePointer=e=>{const b=e.target.closest?.(selector),dir=travelDirection(b?.dataset[attribute]);if(dir)tap.release('pointer:'+e.pointerType+':'+dir);render();};
 panel.addEventListener('pointerup',releasePointer,true);panel.addEventListener('lostpointercapture',releasePointer,true);panel.addEventListener('pointercancel',reset,true);
 window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
 return{
  reset,
  get fast(){const allowed=sync();if(button)button.hidden=!allowed;const fast=tap.fast||allowed&&(dashKeys.size>0||dash.active);render(fast);return fast;},
  input(value,dt){
   const fast=this.fast;
   if(mode!=='foot'||!Number.isFinite(dt))return{...value,fast};
   const {x=0,z=0}=value;
   const normalization=Math.max(1,Math.hypot(x,z));
   const ratio=footAcceleration.step(x,z,dt,fast)/walkFactor({fast});
   return{...value,fast,x:x*ratio/normalization,z:z*ratio/normalization};
  }
 };
}
