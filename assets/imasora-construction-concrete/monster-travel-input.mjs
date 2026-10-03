import {createTravelTap,travelDirection} from '../imasora-construction-travel-input.mjs';

export const constructionTravelAllowed=s=>!!(s.active&&!s.paused&&!s.blocked&&!s.confirm&&!s.sheet&&(!s.busy||s.driving||s.progressSaving)&&(!s.serviceBusy||s.driving||s.progressSaving));

// Project onto the ground, so looking up/down cannot change walking speed.
export function viewRelativeTravel(forward,dx,dz){
 const length=Math.hypot(forward.x,forward.z);
 if(!Number.isFinite(length)||length<1e-6||!Number.isFinite(dx)||!Number.isFinite(dz))return{x:0,z:0};
 const x=forward.x/length,z=forward.z/length;
 return{x:-z*dx-x*dz,z:x*dx-z*dz};
}
const vectors={west:[-1,0],north:[0,-1],south:[0,1],east:[1,0]};
const keySource=e=>'key:'+(e.code||e.key?.toLowerCase());
const pointerSource=id=>'pointer:'+id;
const touchSource=id=>'touch:'+id;
const editable=e=>e.target?.isContentEditable||e.target?.closest?.('input,select,textarea,[contenteditable="true"],[role="textbox"]')||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName);

// Keyboard keys and pointer IDs are separate owners. A release never cancels
// another owner's press, and repeated keydown cannot revive a cleared press.
export function createMonsterTravelInput({enabled,context=()=> 'foot',onStop=()=>{},fastHeld=()=>false,clearFast=()=>{},windowTarget=globalThis.window,documentTarget=globalThis.document,now=()=>performance.now()}){
 const held=new Map(),sticks=new Map(),tap=createTravelTap();let mode=context();
 function rawVector(){let x=0,z=0;for(const name of new Set(held.values())){x+=vectors[name][0];z+=vectors[name][1];}for(const stick of sticks.values()){x+=stick.x;z+=stick.z;}return{x,z};}
 function notifyStop(){const v=rawVector();if(!v.x&&!v.z)onStop();}
 function reset(){clearFast();const had=held.size+sticks.size;held.clear();sticks.clear();tap.reset();if(had)onStop();}
 function sync(){const next=context(),allowed=enabled();if(!allowed||mode!==next)reset();mode=next;return allowed;}
 function press(name,source,repeat=false){if(!sync()||!vectors[name]||repeat||held.has(source)||sticks.has(source))return false;held.set(source,name);tap.press(name,source,now());return true;}
 function release(source){const digital=held.delete(source),analog=sticks.delete(source);if(!digital&&!analog)return;tap.release(source);notifyStop();}
 function key(e){if(e.type==='keyup'){release(keySource(e));return false;}const code=e.code||e.key?.toLowerCase();if(!/^(Key[WASD]|[wasd])$/.test(code??'')||editable(e)||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return false;return press(travelDirection(code),keySource(e),e.repeat===true);}
 function beginStick(source,{fast=false}={}){if(!sync()||held.has(source)||sticks.has(source))return false;sticks.set(source,{x:0,z:0,fast,moved:false});return true;}
 function setStick(source,x,z){if(!sync()||!sticks.has(source)||!Number.isFinite(x)||!Number.isFinite(z))return false;const value=sticks.get(source),length=Math.hypot(x,z),limit=Math.max(1,length);value.x=x/limit;value.z=z/limit;if(length)value.moved=true;else if(value.moved)value.fast=false;notifyStop();return true;}
 // Touch uses Touch.identifier from start to end. Do not keep a second,
 // potentially orphaned PointerEvent owner for the same finger on Safari.
 function pointer(e,name){if(e.pointerType==='touch'||e.button!==0)return false;return press(travelDirection(name),pointerSource(e.pointerId));}
 function reconcileTouches(e){
  if(!e.touches)return;
  const live=new Set(Array.from(e.touches,t=>touchSource(t.identifier)));
  for(const source of [...held.keys(),...sticks.keys()])if(source.startsWith('touch:')&&!live.has(source))release(source);
 }
 function touch(e,name){
  reconcileTouches(e);let accepted=false;
  for(const t of Array.from(e.changedTouches??[]))accepted=press(travelDirection(name),touchSource(t.identifier))||accepted;
  return accepted;
 }
 function releaseTouch(e){
  for(const t of Array.from(e.changedTouches??[]))release(touchSource(t.identifier));
  reconcileTouches(e);
 }
 const releaseKey=e=>release(keySource(e)),releasePointer=e=>release(pointerSource(e.pointerId));
 // Capture releases even when a dialog stops bubbling or a disabled button
 // loses pointer capture. No synthetic key events or timeout-based walking.
 windowTarget?.addEventListener('keyup',releaseKey,true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])windowTarget?.addEventListener(type,releasePointer,true);
 const touchOptions={capture:true,passive:true};
 for(const type of ['touchend','touchcancel'])windowTarget?.addEventListener(type,releaseTouch,touchOptions);
 for(const type of ['touchstart','touchmove'])windowTarget?.addEventListener(type,reconcileTouches,touchOptions);
 // OS selection/callout interrupts play; a surviving key repeat must not
 // restart movement after the native menu is dismissed.
 const interrupted=e=>queueMicrotask(()=>{if(!e.defaultPrevented)reset();});
 for(const type of ['contextmenu','selectstart'])windowTarget?.addEventListener(type,interrupted,true);
 for(const type of ['blur','pagehide'])windowTarget?.addEventListener(type,reset);
 const hidden=()=>{if(documentTarget.hidden)reset();};documentTarget?.addEventListener('visibilitychange',hidden);
 return{key,pointer,touch,beginStick,setStick,release,hasStick:source=>sync()&&sticks.has(source),releasePointer,releaseTouch,reset,get vector(){sync();return rawVector();},get held(){sync();return held.size+sticks.size;},get fast(){sync();const v=rawVector();return tap.fast||!!((v.x||v.z)&&fastHeld())||[...sticks.values()].some(s=>s.fast&&(s.x||s.z));},dispose(){reset();windowTarget?.removeEventListener('keyup',releaseKey,true);for(const type of ['pointerup','pointercancel','lostpointercapture'])windowTarget?.removeEventListener(type,releasePointer,true);for(const type of ['touchend','touchcancel'])windowTarget?.removeEventListener(type,releaseTouch,true);for(const type of ['touchstart','touchmove'])windowTarget?.removeEventListener(type,reconcileTouches,true);for(const type of ['contextmenu','selectstart'])windowTarget?.removeEventListener(type,interrupted,true);for(const type of ['blur','pagehide'])windowTarget?.removeEventListener(type,reset);documentTarget?.removeEventListener('visibilitychange',hidden);}};
}
