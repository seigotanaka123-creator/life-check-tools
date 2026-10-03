import {driveFactor} from '../imasora-construction-travel-input.mjs';
import * as T from '../three.module.min.js';
import {FREE_VEHICLE_ACTIONS,VEHICLE_WHEELS,VEHICLE_PADS,vehicleContactPoint,vehiclePoseAt,headingDelta,vehicleActionProblem,vehiclePoseProblem,vehicleSweepProblem,newVehicleReceipt,assertVehicleReceipt} from './free-vehicle-contact.mjs';
import {vehicleGroundPose,applyVehicleGround,vehicleGroundError,placeVehicleDriver} from './free-vehicle-ground.mjs';

export function createFreeVehicleMotion({a,p,root,actor,vehicles,environment,fast=false}){
 if(!FREE_VEHICLE_ACTIONS.has(a.type))throw Error('車両操作を確認してください。');
 const f=p.freeBuild,name=a.type==='FREE_MOVE'?a.vehicle:'pump',v=vehicles[name],from={...f[name]},to={...from,...(a.type==='FREE_MOVE'?{x:a.x,z:a.z,heading:a.heading}:{legs:a.deployed})};
 const moving=a.type==='FREE_MOVE',travelEnvironment={...environment,terrainTravel:moving};
 const problem=vehicleActionProblem(f,a,environment);if(problem)throw Error(problem);
 const receipt=newVehicleReceipt(a,p);const preflight=vehicleSweepProblem(f,name,from,to,travelEnvironment,()=>receipt.checkedPoses++);if(preflight)throw Error(preflight);
 const prior={position:v.root.position.clone(),rotation:v.root.rotation.clone(),scale:v.root.scale.clone(),legs:v.legs.visible,actor:actor.position.clone(),actorRotation:actor.rotation.clone(),wheels:VEHICLE_WHEELS.map((_,i)=>v.root.getObjectByName('wheel-assembly-'+i).position.clone())};
 const duration=a.type==='FREE_LEGS'?1.4:Math.max(.45/driveFactor({fast}),Math.hypot(to.x-from.x,to.z-from.z)/24/driveFactor({fast}),Math.abs(headingDelta(from.heading,to.heading))/(Math.PI*1.2));
 let elapsed=0,started=false,done=false,last=from,lastGround=vehicleGroundPose(f,from,environment.supportHeightAt);
 function deployment(t){v.legs.visible=true;const extension=a.deployed?t:1-t;for(let i=0;i<4;i++){const pad=v.root.getObjectByName('support-pad-'+i),jack=v.root.getObjectByName('support-jack-'+i);pad.position.y=.8+(1-extension)*8.4;const height=1.6+8.4*extension;jack.scale.y=height/10;jack.position.y=10-height/2;}}
 function restoreLegs(){for(let i=0;i<4;i++){const pad=v.root.getObjectByName('support-pad-'+i),jack=v.root.getObjectByName('support-jack-'+i);pad.position.y=.8;jack.position.y=5;jack.scale.y=1;}}
 function supportError(mesh,point,expected){root.updateMatrixWorld(true);const actual=root.worldToLocal(mesh.localToWorld(new T.Vector3(...point)));return actual.distanceTo(new T.Vector3(expected.x,expected.y??0,expected.z));}
 function measureGround(ground){
  for(let i=0;i<6;i++){const mesh=v.root.getObjectByName('contact-wheel-'+i);if(!mesh)throw Error('車輪の接地位置を確認できません。');receipt.maxGroundError=Math.max(receipt.maxGroundError,supportError(mesh,[-1,0,0],ground.contacts[i]));}
  if(moving){receipt.terrainSamples+=6;for(const k of ['maxSlope','maxSuspension','maxPatchError'])receipt[k]=Math.max(receipt[k],k==='maxSlope'?ground.slope:ground[k]);}
 }
 function verify(){
  const ground=vehicleGroundPose(f,last,environment.supportHeightAt);
  if(vehicleGroundError(v,lastGround)>1e-5)throw Error('車体の位置が変わったため作業を止めました。');
  if(ground.position.distanceTo(lastGround.position)>1e-5||ground.rotation.angleTo(lastGround.rotation)>1e-5||ground.suspension.some((h,i)=>Math.abs(h-lastGround.suspension[i])>1e-5))throw Error('車輪を支える地面が変わったため作業を止めました。');
  const issue=vehiclePoseProblem(f,name,last,travelEnvironment);if(issue)throw Error(issue);
  if(done&&last.legs)for(let i=0;i<4;i++){const error=supportError(v.root.getObjectByName('support-pad-'+i),[0,-.8,0],{...vehicleContactPoint(last,VEHICLE_PADS[i]),y:ground.position.y});if(error>1e-5)throw Error('支持脚の接地位置が変わったため保存を止めました。');}
  measureGround(ground);
 }
 function render(t){
  verify();
  const pose=vehiclePoseAt(from,to,t),problem=vehicleSweepProblem(f,name,last,pose,travelEnvironment,()=>receipt.checkedPoses++);if(problem)throw Error(problem);
  const ground=vehicleGroundPose(f,pose,environment.supportHeightAt);applyVehicleGround(v,ground);last=pose;lastGround=ground;
  placeVehicleDriver(root,actor,v);
  if(a.type==='FREE_LEGS')deployment(t);
  measureGround(ground);receipt.maxPoseError=Math.max(receipt.maxPoseError,vehicleGroundError(v,ground));receipt.samples++;receipt.min=Math.min(receipt.min,t);receipt.max=Math.max(receipt.max,t);
  if(t===1){
   receipt.supports=[];
   for(let i=0;i<VEHICLE_WHEELS.length;i++)receipt.supports.push('wheel-'+i);
   if(to.legs)for(let i=0;i<4;i++){receipt.maxGroundError=Math.max(receipt.maxGroundError,supportError(v.root.getObjectByName('support-pad-'+i),[0,-.8,0],{...vehicleContactPoint(to,VEHICLE_PADS[i]),y:ground.position.y}));receipt.supports.push('pad-'+i);}
   assertVehicleReceipt(a,p,p.revision,receipt);done=true;
  }
 }
 return{focus:{x:from.x,y:20,z:from.z},verifyFooting:verify,get phase(){return a.type==='FREE_MOVE'?'周囲と車輪の接地を確認して走行しています。':a.deployed?'4本の支持脚を下ろしています。':'支持脚を収納しています。';},get receipt(){return receipt;},tick(dt){if(done)return true;if(!started){started=true;render(0);return false;}elapsed+=Math.min(.05,Math.max(0,dt));render(Math.min(1,elapsed/duration));return done;},
  settle(success){restoreLegs();v.legs.visible=success?to.legs:prior.legs;if(!success){v.root.position.copy(prior.position);v.root.rotation.copy(prior.rotation);v.root.scale.copy(prior.scale);actor.position.copy(prior.actor);actor.rotation.copy(prior.actorRotation);prior.wheels.forEach((p,i)=>v.root.getObjectByName('wheel-assembly-'+i).position.copy(p));}},
  cancel(){done=true;this.settle(false);}
 };
}
