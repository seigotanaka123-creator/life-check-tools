import {Matrix4,Quaternion,Vector3} from './three.module.min.js';

const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>v*v*(3-2*v);
// Presentation only: no movement, hitbox, input, inventory or save mutation.
export function jumpActionPose(stage,elapsed){
 const lift=Math.sin(Math.PI*clamp(elapsed/.42)),tuck=stage===3?Math.sin(Math.PI*clamp(elapsed/.44)):lift;
 return {pitch:stage===3?-TAU*smooth(clamp(elapsed/.44)):stage===2?-.24*lift:.12*lift,
  roll:stage===2?.08*lift:0,handUp:(stage===1?9:stage===2?5:4)*lift,
  handOut:(stage===1?1:stage===2?7:-4)*lift,footUp:(stage===1?4:stage===2?11:14)*tuck,
  // Ren has a round belly: lift the soles forward too, so they remain visible.
  footForward:(stage===1?-3:stage===2?24:28)*tuck,footTilt:-(stage===1?.15:.45)*tuck};
}

export function createCharacterJumpAction(model){
 const baseMatrix=new Matrix4(),transform=new Matrix4(),turn=new Matrix4(),back=new Matrix4(),q=new Quaternion(),axis=new Vector3(1,0,0),zAxis=new Vector3(0,0,1),rollQ=new Quaternion();
 const body=model.userData.body;body?.geometry?.computeBoundingBox();
 const pivot=body?.geometry?.boundingBox?.getCenter(new Vector3())??new Vector3(0,36,0);
 if(body)pivot.applyMatrix4(body.matrix);back.makeTranslation(-pivot.x,-pivot.y,-pivot.z);
 const limbs=['hands','feet'].flatMap(kind=>(model.userData[kind]??[]).map((part,index)=>({kind,index,part,position:new Vector3(),rotation:new Quaternion(),neutral:(model.userData.walkRig?.[kind]?.find(e=>e.part===part)?.basePosition??part.position).clone()})));
 let stage=0,owner=null,elapsed=0,lastVelocity=null,lastHeight=null,applied=false,auto=true;
 function restore(){if(!applied)return;for(const l of limbs){l.part.position.copy(l.position);l.part.quaternion.copy(l.rotation);}model.matrix.copy(baseMatrix);model.matrixAutoUpdate=auto;model.matrixWorldNeedsUpdate=true;model.updateMatrixWorld(true);applied=false;}
 function render(motion,dt,draw){
  restore();const n=motion?.airborne&&Number.isInteger(motion.stage)&&motion.stage>=1&&motion.stage<=3?motion.stage:0;
  if(!n){stage=0;owner=null;elapsed=0;lastVelocity=lastHeight=null;return draw();}
  const changed=n!==stage||owner!==motion.owner;
  if(changed){stage=n;owner=motion.owner;elapsed=0;}
  const advanced=changed||motion.velocity!==lastVelocity||motion.height!==lastHeight;
  if(advanced&&Number.isFinite(dt)&&dt>0)elapsed+=Math.min(.05,dt);
  lastVelocity=motion.velocity;lastHeight=motion.height;
  const pose=jumpActionPose(stage,elapsed);
  auto=model.matrixAutoUpdate;if(auto)model.updateMatrix();baseMatrix.copy(model.matrix);applied=true;
  try{
   for(const l of limbs){l.position.copy(l.part.position);l.rotation.copy(l.part.quaternion);l.part.position.copy(l.neutral);if(l.kind==='hands'){if(motion.handsFree===false){l.part.position.copy(l.position);continue;}l.part.position.y+=pose.handUp;l.part.position.x+=(l.index%2===0?-1:1)*pose.handOut;}else{l.part.position.y+=pose.footUp;l.part.position.z+=pose.footForward;l.part.rotateX(pose.footTilt);}}
   q.setFromAxisAngle(axis,pose.pitch).multiply(rollQ.setFromAxisAngle(zAxis,pose.roll));turn.makeRotationFromQuaternion(q);transform.makeTranslation(pivot.x,pivot.y,pivot.z).multiply(turn).multiply(back);
   model.matrix.multiply(transform);model.matrixAutoUpdate=false;model.matrixWorldNeedsUpdate=true;
   return draw();
  }finally{restore();}
 }
 return {render,reset(){restore();stage=0;owner=null;elapsed=0;lastVelocity=lastHeight=null;},get stage(){return stage;},get elapsed(){return elapsed;}};
}
