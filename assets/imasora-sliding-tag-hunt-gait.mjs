import{Vector3}from'./three.module.min.js';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Distance drives the planted sole backward at the actor's actual ground speed.
export function huntFootPose(phase,index=0){const u=((phase/TAU+index*.5)%1+1)%1;if(u<.6)return{forward:1.14-3.8*u,lift:0,tilt:0,stance:true};const v=(u-.6)/.4,s=v*v*(3-2*v);return{forward:-1.14+2.28*s,lift:Math.sin(Math.PI*v)*.46,tilt:-Math.sin(Math.PI*v)*.2,stance:false};}
export function createHuntGait(model){
 const feet=(model.userData.feet??[]).map(part=>{part.geometry?.computeBoundingBox();return{part,base:part.position.clone(),rotation:part.quaternion.clone(),box:part.geometry?.boundingBox};}),hands=(model.userData.hands??[]).map(part=>({part,base:part.position.clone()}));
 const position=new Vector3(),scale=new Vector3(),point=new Vector3();let owner=null,lastX=0,lastZ=0,phase=0,blend=0,lastContact=0;
 function render(motion,dt,draw){
  if(owner!==motion.owner){owner=motion.owner;lastX=motion.x;lastZ=motion.z;phase=0;blend=0;lastContact=0;}
  const distance=Math.hypot(motion.x-lastX,motion.z-lastZ);lastX=motion.x;lastZ=motion.z;
  if(motion.grounded&&!motion.frozen&&distance<3){phase+=distance/3.8*TAU;blend+=(Math.min(1,motion.speed/3)-blend)*(1-Math.exp(-Math.min(.1,dt)*24));}
  if(!motion.grounded){blend=0;return draw();}
  const contact=Math.floor(phase/Math.PI);if(contact!==lastContact){lastContact=contact;if(!motion.ice&&!motion.frozen&&motion.speed>2)motion.onStep?.();}
  model.getWorldScale(scale);const unit=Math.max(.0001,scale.y),savedY=model.position.y,savedPitch=model.rotation.x;
  const gaitBlend=blend*(motion.ice?.18:1),bounce=-Math.abs(Math.sin(phase*2))*.06*gaitBlend;
  model.position.y+=bounce;model.rotation.x+=Math.min(.07,motion.speed*.0035)*gaitBlend;
  try{
   for(let i=0;i<feet.length;i++){const f=feet[i],pose=huntFootPose(phase,i);f.part.position.copy(f.base);f.part.quaternion.copy(f.rotation);f.part.position.z+=pose.forward*gaitBlend/unit;f.part.rotateX(pose.tilt*gaitBlend);}
   for(let i=0;i<hands.length;i++){const h=hands[i];h.part.position.copy(h.base);h.part.position.z+=Math.sin(phase+i*Math.PI)*.07*gaitBlend/unit;}
   model.updateWorldMatrix(true,false);
   for(let i=0;i<feet.length;i++){const f=feet[i];if(!f.box)continue;f.part.updateWorldMatrix(false,false);let min=Infinity;const b=f.box;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])min=Math.min(min,point.set(x,y,z).applyMatrix4(f.part.matrixWorld).y);f.part.getWorldPosition(position);const lift=huntFootPose(phase,i).lift*gaitBlend,target=motion.groundAt(position.x,position.z)+.04+lift;f.part.position.y+=clamp(target-min,-.7,.7)/Math.max(.001,Math.abs(model.matrixWorld.elements[5]));}
   return draw();
  }finally{model.position.y=savedY;model.rotation.x=savedPitch;for(const f of feet){f.part.position.copy(f.base);f.part.quaternion.copy(f.rotation);}for(const h of hands)h.part.position.copy(h.base);model.updateWorldMatrix(true,false);}
 }
 return{render,reset(){owner=null;lastX=lastZ=phase=blend=lastContact=0;},get phase(){return phase;}};
}
