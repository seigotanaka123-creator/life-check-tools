import * as T from './three.module.min.js';
// A short observation, never a game save, reward, teleport or a new menu.
export function createCoastWhaleScene({view,context,clearInput,windowTarget=globalThis.window,documentTarget=globalThis.document}){
 const shield=documentTarget.createElement('div');shield.hidden=true;shield.tabIndex=-1;shield.setAttribute('aria-label','クジラの潮吹きを眺めています');shield.style.cssText='position:fixed;inset:0;z-index:10000;background:transparent;touch-action:none;user-select:none;-webkit-user-select:none';
 const caption=documentTarget.createElement('span');caption.textContent='クジラの潮吹き';caption.style.cssText='position:absolute;bottom:max(26px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:7px 15px;background:#f3fbffdc;color:#375563;border:2px solid white;border-radius:22px;font:700 15px system-ui;white-space:nowrap;pointer-events:none';shield.append(caption);documentTarget.body.append(shield);
 const sceneStyle=documentTarget.createElement('style');sceneStyle.textContent='body.coast-whale-watching :is(.world-player-bar,.world-camera-controls,.coast-hud,.coast-search-compass,.sea-play-dock,.sea-helm,[data-oar],.sea-shore-recovery,#touchPad,#constructionJumpButton,#walkDashButton){visibility:hidden!important;pointer-events:none!important}';documentTarget.body.append(sceneStyle);
 let active=false,owner=null,previousFocus=null,saved=null,disposed=false;
 const eye=new T.Vector3(),target=new T.Vector3(),look=new T.PerspectiveCamera(),up=new T.Vector3(0,1,0);
 const stop=e=>{if(!active||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();e.stopImmediatePropagation();};
 for(const name of['pointerdown','pointermove','pointerup','pointercancel','touchstart','touchmove','touchend','contextmenu','wheel'])shield.addEventListener(name,stop,{passive:false});
 for(const name of['keydown','keyup'])windowTarget.addEventListener(name,stop,true);
 function finish(){if(!active)return;active=false;owner=null;saved=null;shield.hidden=true;documentTarget.body.classList?.toggle('coast-whale-watching',false);globalThis.IMASORA_KEYS?.release();clearInput();if(previousFocus?.isConnected)previousFocus.focus?.({preventScroll:true});previousFocus=null;}
 function update(){if(disposed)return;const v=view(),c=context();if(active&&(v!==owner||c.map!=='coast'||c.interrupted||!v?.watchingWhale)){if(v!==owner||c.interrupted||c.map!=='coast')owner?.cancelWhaleWatch?.();finish();return;}if(!active&&c.map==='coast'&&!c.interrupted&&v?.watchingWhale){active=true;owner=v;saved=null;previousFocus=documentTarget.activeElement;globalThis.IMASORA_KEYS?.release();clearInput();shield.hidden=false;documentTarget.body.classList?.toggle('coast-whale-watching',true);shield.focus({preventScroll:true});}}
 function cameraFrame(camera){if(!active)return false;const focus=owner.whaleFocus;if(!focus)return false;
  saved??={eye:camera.position.clone(),rotation:camera.quaternion.clone()};
  const h=focus.heading,dx=saved.eye.x-focus.x,dz=saved.eye.z-focus.z,side=dx*Math.cos(h)-dz*Math.sin(h)<0?-1:1;
  const half=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect)),distance=210/Math.max(.13,Math.sin(half));
  eye.set(focus.x+Math.cos(h)*side*distance,focus.water+distance*.28+40,focus.z-Math.sin(h)*side*distance);target.set(focus.x,focus.water+9,focus.z);
  look.position.copy(eye);look.up.copy(up);look.lookAt(target);camera.position.lerpVectors(saved.eye,eye,focus.weight);camera.quaternion.slerpQuaternions(saved.rotation,look.quaternion,focus.weight);return true;
 }
 return {update,cameraFrame,get busy(){return active;},dispose(){if(disposed)return;owner?.cancelWhaleWatch?.();finish();disposed=true;shield.remove();sceneStyle.remove();for(const name of['keydown','keyup'])windowTarget.removeEventListener(name,stop,true);}};
}
