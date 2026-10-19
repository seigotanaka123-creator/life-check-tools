// Shared on-foot timing matches the sky map. No inventory or save access.
export const SKY_WALK_SPEED=68;
export const SKY_RUN_SPEED=SKY_WALK_SPEED*2.5;
export const SKY_MAX_JUMPS=3;
export const SKY_JUMP_VELOCITY=44*Math.sqrt(2);
export const SKY_JUMP_GRAVITY=118;
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
 let height=0,vy=0,count=0;
 return{start(){if(count>=SKY_MAX_JUMPS)return false;vy=SKY_JUMP_VELOCITY;count++;return true;},
  tick(dt,ceiling=Infinity){if(!Number.isFinite(dt)||dt<=0||dt>.1)return;if(!count&&!height)return;
   let left=dt;const top=Math.max(0,ceiling);
   while(left>1e-9){const step=Math.min(left,1/120),next=height+vy*step-SKY_JUMP_GRAVITY*step*step/2;vy-=SKY_JUMP_GRAVITY*step;
    if(next>top){height=top;vy=Math.min(0,vy);}else if(next<=0&&vy<=0){height=vy=count=0;break;}else height=next;left-=step;}
  },reset(){height=vy=count=0;},get height(){return height;},get count(){return count;},get airborne(){return count>0||height>0;},get velocity(){return vy;}};
}

// A touch is one owner: Safari's synthetic pointer/click must not count again.
export function bindJumpButton({element,enabled,activate,windowTarget=globalThis.window,documentTarget=globalThis.document}){
 const held=new Set(),listeners=[];
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push(()=>target?.removeEventListener(type,fn,options));};
 const allowed=()=>!documentTarget?.hidden&&enabled();
 const press=(source,e)=>{if(held.has(source)||!allowed())return;held.add(source);e.preventDefault?.();e.stopPropagation?.();activate();};
 listen(element,'touchstart',e=>{for(const t of Array.from(e.changedTouches??[]))press('touch:'+t.identifier,e);},{passive:false});
 for(const type of ['touchend','touchcancel'])listen(windowTarget,type,e=>{for(const t of Array.from(e.changedTouches??[]))held.delete('touch:'+t.identifier);},true);
 listen(element,'pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;press('pointer:'+e.pointerId,e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(windowTarget,type,e=>held.delete('pointer:'+e.pointerId),true);
 listen(element,'keydown',e=>{if(!['Space','Enter'].includes(e.code)||e.repeat)return;press('key:'+e.code,e);});
 listen(windowTarget,'keyup',e=>held.delete('key:'+e.code),true);
 // Keyboard/accessibility clicks have no pointerdown; physical clicks do.
 listen(element,'click',e=>{e.preventDefault();if(e.detail===0&&allowed())activate();});
 for(const type of ['blur','pagehide'])listen(windowTarget,type,()=>held.clear());
 listen(documentTarget,'visibilitychange',()=>{if(documentTarget.hidden)held.clear();});
 for(const type of ['contextmenu','selectstart','dragstart'])listen(element,type,e=>e.preventDefault());
 return{sync(){const can=allowed();element.disabled=!can;if(!can)held.clear();},dispose(){held.clear();listeners.forEach(fn=>fn());}};
}
