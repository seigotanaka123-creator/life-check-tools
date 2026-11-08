// One real scene handle owns one pointer. No inventory or saved poses are
// edited here; the existing fixed-step mechanism receives ordinary forces.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function coastHandleInput(gesture,state){
 if(!gesture||gesture.kind==='aim')return{a:false,b:false};
 if(gesture.kind==='pump')return{a:true,b:false};
 const current=gesture.kind==='turn'?state.lighthouse.angle:state.rocks.gate;
 const target=gesture.kind==='turn'?clamp(gesture.initial+gesture.dx/110,-1.4,1.4):clamp(gesture.initial-gesture.dy/100,0,1);
 const difference=target-current,slop=gesture.kind==='turn'?.025:.008;
 return gesture.kind==='turn'?{a:difference < -slop,b:difference > slop}:{a:difference > slop,b:difference < -slop};
}

export function createCoastLandmarkGesture({canvas,events=window,doc=document,available,pick,snapshot,onGrab=()=>{},onAim=()=>{},onRelease=()=>{}}){
 let owner=null,disposed=false;const listeners=[];
 if(!canvas?.addEventListener)return{get active(){return false;},get id(){return null;},read:()=>({a:false,b:false}),cancel(){},dispose(){}};
 const listen=(target,type,handler)=>{target.addEventListener(type,handler,{capture:true,passive:false});listeners.push(()=>target.removeEventListener(type,handler,true));};
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function cancel(){const previous=owner;owner=null;if(!previous)return;
  if(canvas.hasPointerCapture?.(previous.pointer))try{canvas.releasePointerCapture(previous.pointer);}catch{}
  onRelease(previous);
 }
 const ready=()=>!disposed&&!doc.hidden&&available();
 listen(canvas,'pointerdown',e=>{
  if(!ready()||e.button!==0||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;
  if(owner){stop(e);return;}
  const hit=pick(e.clientX,e.clientY);if(!hit)return;
  const s=snapshot();owner={...hit,pointer:e.pointerId,pointerType:e.pointerType,x:e.clientX,y:e.clientY,dx:0,dy:0,initial:hit.kind==='turn'?s.lighthouse.angle:s.rocks.gate};
  stop(e);onGrab(hit);
  try{canvas.setPointerCapture(e.pointerId);}catch{cancel();}
 });
 listen(events,'pointermove',e=>{
  const g=owner;if(!g||e.pointerId!==g.pointer)return;
  if(!ready()||(g.pointerType==='mouse'&&(e.buttons&1)===0)||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY)){cancel();return;}
  const r=canvas.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){cancel();return;}
  g.dx=e.clientX-g.x;g.dy=e.clientY-g.y;stop(e);
 });
 listen(events,'pointerup',e=>{
  const g=owner;if(!g||e.pointerId!==g.pointer)return;
  const r=canvas.getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
  const tap=ready()&&inside&&Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<=12;
  stop(e);cancel();if(g.kind==='aim'&&tap)onAim(g.aim);
 });
 for(const type of['pointercancel','lostpointercapture'])listen(events,type,e=>{if(owner?.pointer===e.pointerId)cancel();});
 for(const type of ['blur','pagehide','pageshow','resize','orientationchange'])listen(events,type,cancel);
 listen(doc,'visibilitychange',()=>{if(doc.hidden)cancel();});
 return{get active(){return!!owner;},get id(){return owner?.id??null;},get kind(){return owner?.kind??null;},
  read(state){if(owner&&!ready())cancel();return coastHandleInput(owner,state);},cancel,
  dispose(){cancel();disposed=true;for(const remove of listeners)remove();}
 };
}
