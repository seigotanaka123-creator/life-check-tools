import * as T from '../three.module.min.js';

export const VEHICLE_WHEELS=Object.freeze([-29,29].flatMap(x=>[-30,-13,26].map(z=>Object.freeze({x,z}))));
export const VEHICLE_GROUND=Object.freeze({maxSlope:Math.tan(8*Math.PI/180),maxSuspension:.9,maxPatchError:.15,bodyHeight:64});
const UP=new T.Vector3(0,1,0);
const problem=(reason='step')=>Error(({
 missing:'6輪を支える地面がありません。来た道へ戻り、穴を避けてください。',
 slope:'地面の傾きが急すぎます。来た道へ戻り、緩やかな坂から進んでください。',
 step:'地面の段差が大きく、車輪を支えられません。来た道へ戻り、段差をならしてから進んでください。',
 chassis:'盛り上がった地面が車体の底に当たります。来た道へ戻り、土をならすか別の道を選んでください。'
})[reason]);

// Fit the chassis to the six wheel heights. Suspension absorbs small smooth
// irregularities; it is never a fallback over missing ground or a cliff.
export function vehicleGroundPose(f,v,heightAt=()=>0){
 if(!f?.location||![v.x,v.z,v.heading].every(Number.isFinite))throw problem();
 const sample=(x,z)=>{const h=heightAt(f.location.x+x,f.location.z+z);if(!Number.isFinite(h))throw problem('missing');return h;};
 const yaw=new T.Quaternion().setFromAxisAngle(UP,v.heading),points=VEHICLE_WHEELS.map(p=>new T.Vector3(p.x,0,p.z).applyQuaternion(yaw).add(new T.Vector3(v.x,0,v.z)));
 const heights=points.map(p=>sample(p.x,p.z)),meanZ=VEHICLE_WHEELS.reduce((s,p)=>s+p.z,0)/6,meanH=heights.reduce((a,b)=>a+b,0)/6;
 const a=VEHICLE_WHEELS.reduce((s,p,i)=>s+p.x*(heights[i]-meanH),0)/VEHICLE_WHEELS.reduce((s,p)=>s+p.x*p.x,0);
 const b=VEHICLE_WHEELS.reduce((s,p,i)=>s+(p.z-meanZ)*(heights[i]-meanH),0)/VEHICLE_WHEELS.reduce((s,p)=>s+(p.z-meanZ)**2,0),slope=Math.hypot(a,b);
 if(slope>VEHICLE_GROUND.maxSlope+1e-8)throw problem('slope');
 const tilt=new T.Quaternion().setFromUnitVectors(UP,new T.Vector3(-a,1,-b).normalize()),rotation=yaw.clone().multiply(tilt),position=new T.Vector3(v.x,meanH-b*meanZ,v.z),up=UP.clone().applyQuaternion(rotation);
 const contacts=[],suspension=[];let maxPatchError=0;
 for(const wheel of VEHICLE_WHEELS){
  let offset=0,p;
  // The suspension follows the tilted chassis normal, so changing its extension
  // also changes X/Z slightly. Resolve the contact against the same surface.
  for(let i=0;i<6;i++){p=new T.Vector3(wheel.x,offset,wheel.z).applyQuaternion(rotation).add(position);offset+=(sample(p.x,p.z)-p.y)/up.y;}
  if(Math.abs(offset)>VEHICLE_GROUND.maxSuspension+1e-8)throw problem();
  p=new T.Vector3(wheel.x,offset,wheel.z).applyQuaternion(rotation).add(position);
  if(Math.abs(p.y-sample(p.x,p.z))>1e-5)throw problem();
  for(const dx of [-2.5,0,2.5])for(const dz of [-1,0,1]){const q=new T.Vector3(wheel.x+dx,offset,wheel.z+dz).applyQuaternion(rotation).add(position);maxPatchError=Math.max(maxPatchError,Math.abs(q.y-sample(q.x,q.z)));}
  if(maxPatchError>VEHICLE_GROUND.maxPatchError+1e-8)throw problem();
  // Check the leading/trailing tire arc as well as the bottom contact patch.
  // A curb must not already pass through the wheel before its centre reaches it.
  for(const dx of [-3,0,3])for(const dz of [-8,-6,-4,-2,2,4,6,8]){const rise=8-Math.sqrt(64-dz*dz),q=new T.Vector3(wheel.x+dx,offset+rise,wheel.z+dz).applyQuaternion(rotation).add(position);if(sample(q.x,q.z)>q.y+.15)throw problem();}
  contacts.push(p);suspension.push(offset);
 }
 // A ridge between the axles can miss every tire but still hit the chassis.
 for(let x=-42;x<=42;x+=6)for(let z=-48;z<=48;z+=6){const q=new T.Vector3(x,7,z).applyQuaternion(rotation).add(position);if(sample(q.x,q.z)>q.y)throw problem('chassis');}
 // Tilting the cab moves its roof beyond the old horizontal footprint.
 const normal=UP.clone().applyQuaternion(tilt),extra=61*(1-normal.y);
 return{position,rotation,contacts,suspension,slope,maxPatchError,maxSuspension:Math.max(...suspension.map(Math.abs)),padX:64*Math.abs(normal.x)+extra,padZ:64*Math.abs(normal.z)+extra};
}

export function applyVehicleGround(model,ground){
 model.root.position.copy(ground.position);model.root.quaternion.copy(ground.rotation);
 ground.suspension.forEach((offset,i)=>model.root.getObjectByName('wheel-assembly-'+i).position.set(0,offset,0));
}

export function vehicleGroundError(model,ground){
 return Math.max(model.root.position.distanceTo(ground.position),model.root.quaternion.angleTo(ground.rotation),model.root.scale.distanceTo(new T.Vector3(1,1,1)),...ground.suspension.map((offset,i)=>model.root.getObjectByName('wheel-assembly-'+i).position.distanceTo(new T.Vector3(0,offset,0))));
}

export function placeVehicleDriver(root,actor,model){
 root.updateMatrixWorld(true);actor.position.copy(root.worldToLocal(model.root.localToWorld(new T.Vector3(-15,19,21))));actor.quaternion.copy(model.root.quaternion);
}

export function vehicleLevelWorkProblem(f,v,heightAt=()=>0,allowRaised=true){
 try{const g=vehicleGroundPose(f,v,heightAt);if((allowRaised||Math.abs(g.position.y)<1e-5)&&g.slope<1e-7&&g.maxSuspension<1e-5)return '';}catch{}
 return '施工・支持脚の操作は、平らな作業区画へ戻ってから行ってください。';
}
