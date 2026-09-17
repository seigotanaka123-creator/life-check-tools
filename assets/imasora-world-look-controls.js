// A gesture belongs to one canvas pointer and one camera owner until released.
export function createLookControls({element,events=window,document:doc=document,context,onDelta,indicator=element}){
  let gesture=null,disposed=false;
  const listeners=[];
  const listen=(target,type,handler)=>{target.addEventListener(type,handler);listeners.push(()=>target.removeEventListener(type,handler));};
  function cancel(){
    const old=gesture;gesture=null;indicator.classList.remove('is-looking');
    if(old&&element.hasPointerCapture?.(old.id))element.releasePointerCapture(old.id);
  }
  listen(element,'pointerdown',event=>{
    if(disposed||gesture||doc.hidden||event.button!==0||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    const owner=context();if(owner==null)return;
    // A second finger may look while the first finger holds the separate movement pad.
    gesture={id:event.pointerId,type:event.pointerType,owner,x:event.clientX,y:event.clientY};
    try{element.setPointerCapture(event.pointerId);}catch{cancel();return;}
    indicator.classList.add('is-looking');event.preventDefault();
  });
  listen(element,'pointermove',event=>{
    const g=gesture;if(!g||event.pointerId!==g.id)return;
    if(context()!==g.owner||doc.hidden||(g.type==='mouse'&&(event.buttons&1)===0)){cancel();return;}
    if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY)){cancel();return;}
    const dx=event.clientX-g.x,dy=event.clientY-g.y;g.x=event.clientX;g.y=event.clientY;
    if(dx||dy)onDelta(dx,dy,g.type,g.owner);
    event.preventDefault();
  });
  const end=event=>{if(gesture?.id===event.pointerId)cancel();};
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(element,type,end);
  listen(events,'blur',cancel);
  listen(doc,'visibilitychange',()=>{if(doc.hidden)cancel();});
  return{cancel,dispose(){cancel();disposed=true;for(const remove of listeners)remove();}};
}

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
// Display-only offsets. Work records, joints, materials and saved poses are untouched.
export function createOrbitLook(){
  let heading=0,elevation=0,basePitch=.6;
  return{
    reset(){heading=0;elevation=0;},
    yaw(base){return base+heading;},
    pitch(base){basePitch=base;return clamp(base+elevation,.1,1.35);},
    drag(dx,dy,sensitivity){
      if(![dx,dy,sensitivity].every(Number.isFinite)||sensitivity<=0)return;
      heading=Math.atan2(Math.sin(heading-dx*sensitivity),Math.cos(heading-dx*sensitivity));
      elevation=clamp(basePitch+elevation+dy*sensitivity*.78,.1,1.35)-basePitch;
    }
  };
}
