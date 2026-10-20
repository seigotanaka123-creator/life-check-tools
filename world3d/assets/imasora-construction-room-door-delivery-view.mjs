import * as T from './three.module.min.js';
import {roomDoorDelivery,roomDeliveryPhase,roomDoorVisualBoxes,roomDoorGrip} from './imasora-construction-room-door-delivery.mjs?v=120gn';

export function createRoomDoorDeliveryView(parent,{unit,cylinder,mats,handPoint}){
  const root=new T.Group();root.name='room-door-material-delivery';parent.add(root);
  const kits=Array.from({length:3},(_,i)=>{const m=new T.Mesh(unit,mats.wood);m.name='door-material-set-'+(i+1);root.add(m);return m;});
  const rods=Array.from({length:2},()=>{const m=new T.Mesh(cylinder,mats.tool);root.add(m);return m;}),jaws=Array.from({length:2},()=>{const m=new T.Mesh(unit,mats.steel);m.scale.set(.9,.9,.9);root.add(m);return m;});
  const grips=Array.from({length:2},()=>{const m=new T.Mesh(unit,mats.steel);m.scale.set(.6,.6,2);root.add(m);return m;}),up=new T.Vector3(0,1,0);
  function update(w,plan,actor,paused){
    root.visible=roomDoorDelivery(plan);if(!root.visible)return;
    kits.forEach(m=>m.visible=false);rods.forEach(m=>m.visible=false);jaws.forEach(m=>m.visible=false);grips.forEach(m=>m.visible=false);
    const phase=roomDeliveryPhase(w,plan),boxes=roomDoorVisualBoxes(w,plan,actor);
    for(const b of boxes){const m=kits[b.index];m.visible=true;m.position.set(b.x,b.y,b.z);m.rotation.set(0,b.angle,0);m.rotateX(b.tilt);m.scale.set(21,20,2*b.remaining);}
    if(phase.kind==='carry')grips.forEach((m,i)=>{const x=i?-7:7,h=actor.heading,f=10.5;m.visible=true;m.position.set(actor.x+Math.cos(h)*x+Math.sin(h)*f,actor.y+10.51,actor.z-Math.sin(h)*x+Math.cos(h)*f);m.rotation.y=h;});
    if(phase.kind==='unload')for(let i=0;i<2;i++){
      const side=i?-1:1,h=plan.delivery.depot.angle,world=handPoint?.(i),a=world?parent.worldToLocal(world):new T.Vector3(actor.x+Math.cos(h)*side*7.02+Math.sin(h)*8.67,actor.y+10.51,actor.z-Math.sin(h)*side*7.02+Math.cos(h)*8.67),b=roomDoorGrip(boxes.find(b=>b.index===phase.trip),side),end=new T.Vector3(b.x,b.y,b.z),delta=end.clone().sub(a),m=rods[i];
      m.visible=jaws[i].visible=true;m.position.copy(a).add(end).multiplyScalar(.5);m.scale.set(.3,delta.length(),.3);m.quaternion.setFromUnitVectors(up,delta.normalize());jaws[i].position.copy(end);
    }
  }
  return{root,update,dispose(){root.removeFromParent();}};
}
