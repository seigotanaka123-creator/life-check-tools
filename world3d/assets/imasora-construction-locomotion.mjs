// Shared on-foot timing matches the sky map. No inventory or save access.
export const SKY_WALK_SPEED=68;
export const SKY_RUN_SPEED=SKY_WALK_SPEED*2.5;
export const SKY_MAX_JUMPS=3;
// Article profile: v0=12, g=25, release=0.5; one design unit is 6 world units.
// Constant acceleration preserves the same time-to-apex (0.48s) at game scale.
export const SKY_JUMP_VELOCITY=72;
export const SKY_JUMP_GRAVITY=150;
export const JUMP_RELEASE_MULTIPLIER=.5;
export function releasedJumpVelocity(v){return v>0?v*JUMP_RELEASE_MULTIPLIER:v;}
export function releaseThreeJump(body){body.vy=releasedJumpVelocity(body.vy);}
export function updateJumpHold(body,down){if(body.jumpHeld&&!down)releaseThreeJump(body);body.jumpHeld=!!down;}
// Retain even a short touch between simulation frames, without extending its hold.
export function createJumpIntent(){let held=false,edges=[];return{
 press(){if(held)return false;held=true;if(edges.length<12)edges.push(true);return true;},
 release(){if(!held)return;held=false;if(edges.length<12)edges.push(false);},
 read(consume=true){return edges.length?(consume?edges.shift():edges[0]):held;},reset(){held=false;edges=[];},get held(){return held;}
};}

export function beginThreeJump(body,velocity=SKY_JUMP_VELOCITY){
 if(!Number.isFinite(velocity)||velocity<=0)return false;
 const count=body.grounded?0:(body.jumpCount??0);
 if(!Number.isInteger(count)||count<0||count>=SKY_MAX_JUMPS)return false;
 body.vy=velocity;body.grounded=false;body.jumpCount=count+1;return true;
}
export function landThreeJump(body){if(body.grounded){body.vy=0;if(body.jumpCount!==undefined)body.jumpCount=0;}}

export function jumpClearance(p,boxes,intersects){
 const a=[p.x,p.y+26.6,p.z];let limit=64;
 for(const box of boxes){if(!intersects(a,[a[0],a[1]+limit,a[2]],box,14))continue;let low=0,high=limit;
  for(let i=0;i<18;i++){const mid=(low+high)/2;if(intersects(a,[a[0],a[1]+mid,a[2]],box,14))high=mid;else low=mid;}limit=Math.max(0,low-.02);
 }return limit;
}

// Offset from a supported walking stance; lateral movement keeps all existing
// body-sized obstruction checks. Integrate in small steps and sweep the ceiling.
export function createThreeJump(){
 let height=0,vy=0,count=0,held=false;
 return{start(){if(count>=SKY_MAX_JUMPS)return false;vy=SKY_JUMP_VELOCITY;count++;held=true;return true;},
  tick(dt,ceiling=Infinity){if(!Number.isFinite(dt)||dt<=0||dt>.1)return;if(!count&&!height)return;
   let left=dt;const top=Math.max(0,ceiling);
   while(left>1e-9){const step=Math.min(left,1/120),next=height+vy*step-SKY_JUMP_GRAVITY*step*step/2;vy-=SKY_JUMP_GRAVITY*step;
    if(next>top){height=top;vy=Math.min(0,vy);}else if(next<=0&&vy<=0){height=vy=count=0;break;}else height=next;left-=step;}
  },release(){if(held)vy=releasedJumpVelocity(vy);held=false;},reset(){height=vy=count=0;held=false;},get height(){return height;},get count(){return count;},get airborne(){return count>0||height>0;},get velocity(){return vy;}};
}

// All physical owners share one held gesture. A second finger is not a new jump.
export function bindJumpButton({element,enabled,canHold=enabled,activate,release=()=>{},windowTarget=globalThis.window,documentTarget=globalThis.document}){
 const held=new Set(),listeners=[];let keyClickUntil=0;
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push(()=>target?.removeEventListener(type,fn,options));};
 const allowed=()=>!documentTarget?.hidden&&enabled();
 const end=source=>{if(!held.delete(source))return;if(!held.size)release();};
 const cancel=()=>{if(held.size){held.clear();release();}};
 const press=(source,e)=>{if(held.has(source)||!allowed()&&!held.size)return false;e.preventDefault?.();e.stopPropagation?.();const first=!held.size;held.add(source);if(first&&activate()===false){held.delete(source);return false;}return true;};
 const key=e=>{if(!['Space','Enter'].includes(e.code))return false;if(e.type==='keyup'){end('key:'+e.code);return true;}if(e.repeat)return true;keyClickUntil=Date.now()+500;return press('key:'+e.code,e);};
 listen(element,'touchstart',e=>{keyClickUntil=0;for(const t of Array.from(e.changedTouches??[]))press('touch:'+t.identifier,e);},{passive:false});
 for(const type of ['touchend','touchcancel'])listen(windowTarget,type,e=>{for(const t of Array.from(e.changedTouches??[]))end('touch:'+t.identifier);},true);
 listen(element,'pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;keyClickUntil=0;if(press('pointer:'+e.pointerId,e))element.setPointerCapture?.(e.pointerId);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(windowTarget,type,e=>end('pointer:'+e.pointerId),true);
 listen(element,'keydown',key);listen(windowTarget,'keyup',e=>{if(['Space','Enter'].includes(e.code))end('key:'+e.code);},true);
 listen(element,'click',e=>{e.preventDefault();if(e.detail===0&&Date.now()>keyClickUntil&&!held.size&&allowed()){activate();release();}});
 for(const type of ['blur','pagehide'])listen(windowTarget,type,cancel);
 listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)cancel();});
 for(const type of ['contextmenu','selectstart','dragstart'])listen(element,type,e=>e.preventDefault());
 return{key,cancel,get held(){return held.size>0;},sync(){element.disabled=!allowed();if(documentTarget?.hidden||!canHold())cancel();},dispose(){cancel();listeners.forEach(fn=>fn());}};
}
