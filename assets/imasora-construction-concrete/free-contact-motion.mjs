import * as T from '../three.module.min.js';
import {freeCell} from './free-build-state.mjs';
import {newFreeReceipt,assertFreeReceipt,assertPaintAccess,paintPatch,vehiclePoint,walkPath,walkingSurface,walkingSegmentBlocked} from './free-contact.mjs';
import {resolveBoardingAccess,freeBoardProblem} from './free-boarding.mjs';
import {vehicleGroundError} from './free-vehicle-ground.mjs';
import {walkingGroundAt,walkingGroundRotation,walkingGroundSegment,soleClearance,assertLandingSoles,WALK_GROUND_MESSAGE} from './free-walking-ground.mjs';

import {footingAt,FOOTING_MESSAGE} from './free-footing.mjs';
import {paintAccessPlan,paintScaffoldSteps} from './free-paint-access.mjs';
import {createScaffoldMotion} from './free-scaffold-motion.mjs';
import {frameBlocked,frameSegmentBlocked} from './free-frames.mjs';
import {createFootingGuard} from './free-footing-motion.mjs';

const vec=p=>new T.Vector3(p.x,p.y??0,p.z),distance=(a,b)=>Math.hypot(a.x-b.x,(a.y??0)-(b.y??0),a.z-b.z);
export function createFreeContactMotion({a,p,root,actor,model,hand,feet,vehicles,tools,colors,mats,line,drawPaint,external,supportHeightAt=()=>0,paintGroundExternal=external,sharedPlatform=null}){
 const f=p.freeBuild,r=newFreeReceipt(a,p),stages=[];let stage=0,progress=0,started=false,phase=0,finished=false;
 const modelPosition=model.position.clone(),modelScale=model.scale.clone(),modelRotation=model.quaternion.clone();
 const focus={x:actor.position.x,y:10,z:actor.position.z};
 const groundGuard=()=>createFootingGuard({f,root,actor,feet,record:r.footing,heightAt:supportHeightAt});let footing=a.type==='FREE_PAINT'?groundGuard():null;
 function walk(route,scaffold=null){for(let i=1;i<route.length;i++)stages.push({kind:'walk',from:route[i-1],to:route[i],scaffold,duration:Math.max(.08,distance(route[i-1],route[i])/60)});}
 const resetFeet=()=>feet.forEach(e=>e.o.position.copy(e.position));
 const from={x:actor.position.x,y:actor.position.y,z:actor.position.z};
 let endPose,paintPose,access=null,vehicle=null,cameraAngle,boarding=null,landingRotation=null,clearance=null;
 if(a.type==='FREE_PAINT'){
  // On a supported deck a sparse square ground sample can miss a concrete
  // corner touched by a real rotated shoe. Reject that candidate before walking
  // and try another stance. Preflight samples are never added to saved evidence.
  const checkRoute=p.schemaVersion>=13&&p.foundation?(route,stance)=>{
   const position=actor.position.clone(),rotation=actor.rotation.clone(),poses=feet.map(e=>e.o.position.clone()),record={samples:0,maxSpread:0,maxHeightError:0},guard=createFootingGuard({f,root,actor,feet,record,heightAt:supportHeightAt});let budget=2000;
   const at=(x,z,heading)=>{if(--budget<0)throw Error('route budget');const s=walkingGroundAt(f,x,z,supportHeightAt);if(!s)throw Error(FOOTING_MESSAGE);actor.position.set(x,s.height,z);actor.quaternion.copy(walkingGroundRotation(s,heading));feet.forEach(e=>e.o.position.copy(e.position));guard.stand();};
   try{for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2)),heading=Math.atan2(b.x-a.x,b.z-a.z);for(let j=0;j<=n;j++){const t=j/n;at(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,heading);}}at(stance.x,stance.z,stance.heading??0);return true;}catch{return false;}finally{actor.position.copy(position);actor.rotation.copy(rotation);feet.forEach((e,i)=>e.o.position.copy(poses[i]));root.updateMatrixWorld(true);}
  }:null;
  root.updateMatrixWorld(true);const handBase=actor.worldToLocal(hand.getWorldPosition(new T.Vector3()));access=paintAccessPlan(f,a,from,handBase,external,supportHeightAt,checkRoute,paintGroundExternal,sharedPlatform);paintPose=access.stance;walk(access.ground);
  if(access.scaffold){const platform=access.scaffold,{up,down}=paintScaffoldSteps(access);r.access.height=platform.height;stages.push({kind:'scaffold-open',stance:platform.entry,duration:.65});stages.push(...up);walk(platform.path,platform);for(const pixel of a.pixels)stages.push({kind:'paint',pixel,duration:a.tool==='roller'?.32:.28});walk([...platform.path].reverse(),platform);stages.push(...down);stages.push({kind:'scaffold-close',stance:platform.entry,duration:.55});endPose={...platform.entry,heading:platform.direction<0?0:Math.PI};}
  else{endPose=paintPose;for(const pixel of a.pixels)stages.push({kind:'paint',pixel,duration:a.tool==='roller'?.32:.28});}
 }else{
  const name=a.type==='FREE_BOARD'?a.vehicle:f.aboard;vehicle=vehicles[name];const v=f[name];
  cameraAngle=v.heading-.9;
  boarding=resolveBoardingAccess(f,name,external,supportHeightAt,a.type==='FREE_BOARD'?from:null);const {door:approach,steps}=boarding,seat=steps.at(-1);
  landingRotation=walkingGroundRotation(boarding.support,v.heading);clearance=soleClearance(root,actor,feet);
  if(a.type==='FREE_BOARD'){const problem=freeBoardProblem(f,from,name,external,supportHeightAt);if(problem)throw Error(problem);walk([from,approach]);}
  stages.push({kind:'door',from:0,to:Math.PI/2,duration:.35});
  const order=a.type==='FREE_BOARD'?steps:[...steps].reverse();
  for(let i=1;i<order.length;i++){const entering=a.type==='FREE_BOARD';stages.push({kind:'step',from:order[i-1],to:order[i],rotationFrom:entering&&i===1?landingRotation:boarding.ground.rotation,rotationTo:!entering&&i===order.length-1?landingRotation:boarding.ground.rotation,duration:.4});}
  stages.push({kind:'door',from:Math.PI/2,to:0,duration:.35});
  if(a.type==='FREE_LEAVE')endPose={...approach,heading:v.heading};
  else endPose={...seat,heading:v.heading};
 }
 function verifyBoarding(checkSoles=true){
  if(!vehicle)return;const name=a.type==='FREE_BOARD'?a.vehicle:f.aboard,now=resolveBoardingAccess(f,name,external,supportHeightAt,boarding.door),poseError=vehicleGroundError(vehicle,now.ground);
  if(distance(now.door,boarding.door)>1e-5||poseError>1e-5)throw Error('乗降中に車体やドア前の地面が変わりました。安全な場所へ停め直してください。');
  const b=r.boarding;b.samples++;b.terrainSamples+=now.ground.contacts.length+now.support.samples;b.maxSlope=Math.max(b.maxSlope,now.ground.slope,now.support.slope);b.maxPatchError=Math.max(b.maxPatchError,now.ground.maxPatchError,now.support.error);b.maxPoseError=Math.max(b.maxPoseError,poseError);
  if(checkSoles&&actor.position.distanceTo(vec(boarding.door))<1e-5){const s=walkingGroundAt(f,actor.position.x,actor.position.z,supportHeightAt);b.maxSoleError=Math.max(b.maxSoleError,assertLandingSoles(f,root,actor,feet,s,supportHeightAt,clearance));b.landingSamples++;}
 }
 const head=new T.Mesh(a.tool==='roller'?new T.CylinderGeometry(1,1,1,16):new T.BoxGeometry(1,1,1),colors[a.color]??mats.metal);head.name='verified-paint-head';
 const completed=[],temporary=new T.Group(),unit=new T.BoxGeometry(1,1,1);temporary.name='paint-access-operation';if(access?.scaffold)root.add(temporary);
 function box(parent,x,y,z,w,h,d,mat,name){const m=new T.Mesh(unit,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;parent.add(m);return m;}
 const scaffold=access?.scaffold?createScaffoldMotion({f,root,actor,feet,record:r.access,footing:r.footing,heightAt:supportHeightAt,external,parent:temporary,box,mats,name:'paint-scaffold',fixedPlan:sharedPlatform?.visible?sharedPlatform.plan:null,sharedPlatform:sharedPlatform?.visible?sharedPlatform:null}):null;let cleaned=false;
 function cleanup(){if(cleaned)return;cleaned=true;scaffold?.dispose();root.remove(temporary);unit.dispose();}

 function paint(pixel,t){
  const patch=paintPatch(f,a,pixel,t),point=vec(patch.point),n=new T.Vector3(...patch.normal),u=new T.Vector3(...patch.u);
  actor.rotation.set(0,paintPose.heading,0);resetFeet();if(scaffold)scaffold.stand(access.scaffold);else footing.stand();root.updateMatrixWorld(true);
  const grip=root.worldToLocal(hand.getWorldPosition(new T.Vector3()));
  let anchor;
  if(a.tool==='roller'){
   const radius=a.face==='top'?.65:Math.min(.65,patch.span*.018);
   head.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),u);head.scale.set(radius,3.99,radius);head.position.copy(point).addScaledVector(n,radius);
   anchor=n.clone().applyQuaternion(head.quaternion.clone().invert()).negate();
  }else{
   head.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(u,n,u.clone().cross(n)));head.scale.set(3.99,.36,patch.span*.03);head.position.copy(point).addScaledVector(n,.18);anchor=new T.Vector3(0,-.5,0);
  }
  tools.add(head);const handleEnd=head.position.clone().addScaledVector(n,.6),pole=line(tools,grip,handleEnd,.32,mats.wood);pole.name='verified-paint-handle';
  root.updateMatrixWorld(true);
  const actualGrip=pole.localToWorld(new T.Vector3(0,-.5,0)),actualContact=head.localToWorld(anchor),wanted=root.localToWorld(point.clone());
  r.maxGripError=Math.max(r.maxGripError,actualGrip.distanceTo(hand.getWorldPosition(new T.Vector3())));
  r.maxContactError=Math.max(r.maxContactError,actualContact.distanceTo(wanted));r.maxPoleLength=Math.max(r.maxPoleLength,grip.distanceTo(handleEnd));
  if(r.maxPoleLength>(sharedPlatform?.visible?64:42)||r.maxGripError>1e-5||r.maxContactError>1e-5)throw Error('工具が施工面に届かないため止めました。塗料は使っていません。');
  const record=r.patches.find(b=>b.pixel===pixel);record.samples++;record.min=Math.min(record.min,t);record.max=Math.max(record.max,t);
  if(t===1&&!completed.includes(pixel))completed.push(pixel);drawPaint(completed);
  Object.assign(focus,patch.point);
 }
 function render(s,t){
  if(s.kind==='scaffold-open'||s.kind==='scaffold-close'){resetFeet();actor.position.copy(vec(s.stance));actor.rotation.set(0,s.stance.heading,0);footing=groundGuard();footing.stand();scaffold[s.kind==='scaffold-open'?'open':'close'](access.scaffold,t);return;}
  if(s.kind==='climb'){resetFeet();scaffold.climb(s,t);if(frameBlocked(f,access.scaffold.panels,actor.position,external,14))throw Error('足場の通路がふさがったため止めました。');return;}
  if(s.kind==='paint'){paint(s.pixel,t);return;}
  if(s.kind==='door'){vehicle.driverDoor.rotation.y=s.from+(s.to-s.from)*t;if(vehicle.driverDoor.rotation.y>=Math.PI/2-1e-5)r.doorOpened=true;resetFeet();return;}
  const prior={x:actor.position.x,z:actor.position.z};actor.position.copy(vec(s.from).lerp(vec(s.to),t));
  resetFeet();const delta=vec(s.to).sub(vec(s.from));if(delta.length()>.001)actor.rotation.set(0,Math.atan2(delta.x,delta.z),0);
  if(s.kind==='walk'&&!s.scaffold){if(footing)footing.walk(phase);else{const support=walkingGroundAt(f,actor.position.x,actor.position.z,supportHeightAt);if(!support||!walkingGroundSegment(f,s.from,{x:actor.position.x,z:actor.position.z},supportHeightAt))throw Error(WALK_GROUND_MESSAGE);actor.position.y=support.height;}}
  if(vehicle){if(s.kind==='step')actor.quaternion.copy(s.rotationFrom).slerp(s.rotationTo,t);else{const support=walkingGroundAt(f,actor.position.x,actor.position.z,supportHeightAt);actor.quaternion.copy(walkingGroundRotation(support,f[a.type==='FREE_BOARD'?a.vehicle:f.aboard].heading));}}
  if(s.scaffold)scaffold.walk(s.scaffold,phase);else if(!footing)feet.forEach((e,i)=>e.o.position.y+=Math.max(0,Math.sin(phase+i*Math.PI))*2.6);
  if(s.kind==='walk'){if(s.scaffold?frameSegmentBlocked(f,s.scaffold.panels,prior,actor.position,(x,z,m)=>external(x,z,m,s.scaffold.height),14):sharedPlatform?.visible&&access?.scaffold?frameSegmentBlocked(f,access.scaffold.panels,prior,actor.position,external,14):walkingSegmentBlocked(f,prior,actor.position,paintGroundExternal))throw Error('通路がふさがったため止めました。');r.travelSamples=(r.travelSamples??0)+1;}
  else r.stepSamples++;
  Object.assign(focus,{x:actor.position.x,y:actor.position.y+12,z:actor.position.z});
 }
 return{focus,cameraAngle,cameraDistance:vehicle?150:110,cameraHeight:vehicle?105:85,verifyFooting(){footing?.stand();verifyBoarding();},get endPose(){return endPose;},get receipt(){return r;},get phase(){const s=stages[stage];if(vehicle)return a.type==='FREE_BOARD'?'ドアを開け、足掛けから運転席へ乗っています。':'足掛けを下りて、ドア前の地面に立っています。';if(sharedPlatform?.visible&&s?.kind==='scaffold-open')return '同じ作業台の足元を確認しています。';if(sharedPlatform?.visible&&s?.kind==='scaffold-close')return '同じ作業台を残して地上に戻りました。';return s?.kind==='climb'?(s.ascending?'塗装用足場の階段を上っています。':'塗装用足場の階段を下りています。'):({'scaffold-open':'塗装用の足場を広げています。','scaffold-close':'塗装用の足場を片付けています。',paint:scaffold?'足場に立って施工面を塗っています。':'施工面を塗っています。',walk:scaffold?'塗る面へ安全な通路を歩いています。':'塗る面へ歩いています。'}[s?.kind]??'');},
  tick(dt){
   if(finished)return true;
   if(model.position.distanceTo(modelPosition)>1e-5||model.scale.distanceTo(modelScale)>1e-5||model.quaternion.angleTo(modelRotation)>1e-5)throw Error('キャラクターの位置が変わったため作業を止めました。');
   phase+=Math.min(.05,Math.max(0,dt))*10;const s=stages[stage];tools.clear();
   if(!started){progress=0;started=true;render(s,0);verifyBoarding(s.kind==='door');return false;}
   progress=Math.min(1,progress+Math.min(.05,Math.max(0,dt))/s.duration);render(s,progress);verifyBoarding(s.kind==='door');
   if(progress===1){stage++;started=false;if(stage===stages.length){
    resetFeet();if(vehicle)actor.quaternion.copy(a.type==='FREE_BOARD'?boarding.ground.rotation:landingRotation);else actor.rotation.y=endPose.heading;root.updateMatrixWorld(true);
    if(a.type!=='FREE_PAINT'){
     const actual=root.worldToLocal(model.getWorldPosition(new T.Vector3()));
     actual.sub(model.position.clone().applyQuaternion(actor.quaternion));
     r.endpointError=distance(actual,endPose);r.doorClosedError=Math.abs(vehicle.driverDoor.rotation.y);
    }
    else delete r.travelSamples;
    assertFreeReceipt(a,p,p.revision,r);finished=true;head.geometry.dispose();return true;
   }}return false;
  },
  settle(){cleanup();},
  cancel(){cleanup();if(vehicle)vehicle.driverDoor.rotation.y=0;resetFeet();tools.clear();if(!finished)head.geometry.dispose();finished=true;}
 };
}
