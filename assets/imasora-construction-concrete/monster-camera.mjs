import * as T from '../three.module.min.js';
export const CONCRETE_CAMERA_MODES=Object.freeze({overview:'施工全体',eye:'モンスターの目線',above:'モンスターの上から'});
// Camera-only state. The model, tools, contact measurements and saved project never change.
export function createMonsterCamera({camera,model,actor}){
 let mode='overview',yaw=0,pitch=0,snap=true,originalNear=null;
 const eye=new T.Vector3(),forward=new T.Vector3(),horizontal=new T.Vector3(),desired=new T.Vector3(),rotation=new T.Quaternion();
 function heading(){actor.getWorldQuaternion(rotation);forward.set(0,0,1).applyQuaternion(rotation);return Math.atan2(forward.x,forward.z);}
 function eyePoint(){actor.updateWorldMatrix(true,false);const features=model.userData.faceFeatures??[];eye.set(0,0,0);if(features.length){for(const f of features)eye.add(f.getWorldPosition(desired));eye.multiplyScalar(1/features.length);}else{actor.getWorldPosition(eye);eye.y+=31;}return eye;}
 function projection(){if(originalNear==null)return;const near=mode==='eye'?Math.min(originalNear,.15):originalNear;if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}}
 function reset(){yaw=heading();pitch=mode==='above'?-.72:0;snap=true;}
 return{
  get mode(){return mode;},
  enter(){originalNear=camera.near;reset();projection();},
  exit(){if(originalNear!=null&&camera.near!==originalNear){camera.near=originalNear;camera.updateProjectionMatrix();}originalNear=null;snap=true;},
  select(next){if(!Object.hasOwn(CONCRETE_CAMERA_MODES,next))throw Error('選べない視点です。');mode=next;reset();projection();},
  reset,
  look(dx,dy,sensitivity){if(mode==='overview')return false;yaw-=dx*sensitivity;pitch=T.MathUtils.clamp(pitch-dy*sensitivity,mode==='above'?-1.35:-1.2,mode==='above'?-.22:1.2);return true;},
  tick(dt=0,{aboard=false}={}){
   if(mode==='overview')return false;
   eyePoint();forward.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
   if(mode==='eye')desired.copy(eye).addScaledVector(horizontal.set(Math.sin(yaw),0,Math.cos(yaw)),2.4);
   else{const distance=(aboard?170:105)*Math.max(1,1.05/camera.aspect);desired.copy(eye).addScaledVector(forward,-distance);}
   // Only position follows the actor. Automatic tool strokes never turn the player's gaze.
   const blend=snap?1:1-Math.exp(-Math.max(0,Math.min(.05,dt))/.12);
   camera.position.lerp(desired,blend);snap=false;
   if(mode==='eye')camera.lookAt(desired.copy(camera.position).addScaledVector(forward,20));
   else camera.lookAt(eye);
   return true;
  }
 };
}
