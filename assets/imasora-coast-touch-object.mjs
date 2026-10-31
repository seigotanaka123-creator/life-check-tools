import {COAST_PULL_REACH} from './imasora-coast-shore-access.mjs?v=120mx';
// A pointer owns only the object it actually touched. The solver, not this
// gesture, moves the body. No timers, second editor, or extra animation loop.
export function coastHandTarget(point, actor, reach=COAST_PULL_REACH) {
 if (!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite)||!actor||![actor.x,actor.y,actor.z].every(Number.isFinite)||!Number.isFinite(reach)||reach<=0) return null;
 const dx=point[0]-actor.x,dz=point[2]-actor.z,d=Math.hypot(dx,dz),scale=d>reach?reach/d:1;
 return [actor.x+dx*scale,Math.max(actor.y-18,Math.min(actor.y+35,point[1])),actor.z+dz*scale];
}

export function createCoastObjectTouch({canvas,events=window,doc=document,allowed,pick,begin,project,move,end,tap}) {
 let gesture=null,disposed=false;const listeners=[];
 const listen=(target,type,fn)=>{target.addEventListener(type,fn,true);listeners.push(()=>target.removeEventListener(type,fn,true));};
 const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function cancel(){const g=gesture;gesture=null;if(!g)return;try{if(canvas.hasPointerCapture?.(g.id))canvas.releasePointerCapture(g.id);}catch{}if(g.started)end();}
 listen(canvas,'pointerdown',e=>{
  if(disposed||e.button!==0||doc.hidden)return;
  if(gesture){consume(e);cancel();return;}
  if(!allowed())return;const hit=pick(e);if(!hit)return;
  gesture={id:e.pointerId,type:e.pointerType,x:e.clientX,y:e.clientY,hit,started:false};
  try{canvas.setPointerCapture(e.pointerId);}catch{cancel();return;}consume(e);
 });
 listen(canvas,'pointermove',e=>{
  const g=gesture;if(!g||g.id!==e.pointerId)return;consume(e);
  if(!allowed()||doc.hidden||(g.type==='mouse'&&(e.buttons&1)===0)){cancel();return;}
  if(!g.started&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<6)return;
  const point=project(e,g.hit);if(!point)return;
  if(!g.started){if(!begin(g.hit)){cancel();return;}g.started=true;}
  move(point);
 });
 listen(events,'pointerup',e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;consume(e);const clicked=!g.started&&allowed()&&!doc.hidden;cancel();if(clicked)tap(g.hit);});
 for(const type of ['pointercancel','lostpointercapture'])listen(canvas,type,e=>{if(gesture?.id===e.pointerId)cancel();});
 for(const type of ['blur','pagehide','orientationchange','resize'])listen(events,type,cancel);
 listen(doc,'visibilitychange',()=>{if(doc.hidden)cancel();});
 return {cancel,get active(){return !!gesture;},dispose(){cancel();disposed=true;listeners.forEach(fn=>fn());}};
}
