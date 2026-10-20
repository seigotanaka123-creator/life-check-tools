// A tap chooses; a drag still belongs to the existing orbit camera. No global
// gesture cancellation or movement keys are introduced by the landing tool.
export function bindCranePointInput({canvas,events=globalThis,doc=globalThis.document,ready,pick}){
 let gesture=null;const listeners=[];
 const on=(el,type,fn)=>{el.addEventListener(type,fn);listeners.push(()=>el.removeEventListener(type,fn));};
 const cancel=()=>{gesture=null;};
 on(canvas,'pointerdown',e=>{if(gesture){cancel();return;}if(!ready()||doc.hidden||e.button!==0||![e.clientX,e.clientY].every(Number.isFinite))return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY};});
 on(events,'pointerdown',e=>{if(gesture&&e.pointerId!==gesture.id)cancel();});
 on(events,'pointermove',e=>{if(gesture&&e.pointerId===gesture.id&&(!ready()||!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY)||Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>8))cancel();});
 on(events,'pointerup',e=>{const g=gesture;if(!g||g.id!==e.pointerId)return;cancel();if(ready()&&!doc.hidden&&[e.clientX,e.clientY].every(Number.isFinite)&&Math.hypot(e.clientX-g.x,e.clientY-g.y)<=8)pick(e.clientX,e.clientY);});
 on(events,'pointercancel',cancel);on(events,'blur',cancel);on(doc,'visibilitychange',cancel);
 return{cancel,dispose(){cancel();for(const remove of listeners)remove();}};
}
