import {nativeDeckBoxes} from './imasora-construction-native-decks.mjs?v=120ps';
import {excavatorGroundFrame} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {shovelExcavatorBody,shovelMachineState,shovelSoilContactCandidates,shovelDumpBody,shovelMachines,shovelNearbySoil} from './imasora-construction-shovel-work.mjs?v=120pv';
import {transportArea,storageBinBox} from './imasora-construction-transport-field.mjs?v=120ov';
import {nativeDumpHeightReader,nativeDumpSupport} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {dumpDriverSeat,dumpPositionSafe} from './imasora-construction-dump-work.mjs?v=120pv';
import {boxExtent,boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120pv';
import {linkedArmClear,linkedExcavatorSeat} from './imasora-construction-bucket-dump.mjs?v=120pv';
import {CONSTRUCTION_STEERING_FACTOR,steerVehicleClearOfContact} from './imasora-construction-shared-field.mjs?v=120ey';

import {ascentTravelFactor,quarryAscentFactor} from './imasora-construction-locomotion.mjs?v=121gf';

const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
// Ground support, hulls, arm, rider and display share the same derived frame.
export function transportExcavatorPositionSafe(frame){
 const v=frame.machineVehicle??shovelMachineState(frame).loader.vehicle,a=transportArea(frame);
 let ground;
 try{ground=excavatorGroundFrame(frame);}catch{return false;}
 if(!['x','z','heading'].every(k=>Number.isFinite(v[k])))return false;
 const body=shovelExcavatorBody(v,ground),e=boxExtent(body);
 if(v.x-e[0]<a.minX+1||v.x+e[0]>a.maxX-1||v.z-e[2]<a.minZ+1||v.z+e[2]>a.maxZ-1)return false;
 // Query the entire tilted hull, never just its centre or wheel contacts.
 const [cx,cy,cz]=body.position,reach=Math.max(e[0],e[2])+.01;
 if(!finite(cx,-8400,8400)||!finite(cz,-5200,5200))throw Error('シャベル作業：接触範囲が不正です。');
 const nearby=shovelSoilContactCandidates(frame.soil,cx-reach,cx+reach,cz-reach,cz+reach,cy-e[1]-1e-9);
 if([storageBinBox(frame),shovelDumpBody(frame),...nativeDeckBoxes(frame,{vehicleY:ground.position[1],x:v.x,z:v.z,r:80})].some(b=>boxesOverlap3D(body,b)))return false;
 // Most soil on a slope is beneath the pitched hull. Reuse the hull's
 // projection on its own up axis and reject only clearly separated cubes.
 const up=body.axes[1];
 const upRadius=body.axes.reduce((radius,axis,i)=>radius+body.half[i]*Math.abs(axis[0]*up[0]+axis[1]*up[1]+axis[2]*up[2]),0);
 const cubeScale=Math.abs(up[0])+Math.abs(up[1])+Math.abs(up[2]);
 for(const box of nearby){
  const [x,y,z]=box.position,r=box.size/2,dx=x-cx,dy=y-cy,dz=z-cz;
  if(Math.abs(dx)>e[0]+r+1e-9||Math.abs(dy)>e[1]+r+1e-9||Math.abs(dz)>e[2]+r+1e-9)continue;
  if(Math.abs(dx*up[0]+dy*up[1]+dz*up[2])>upRadius+r*cubeScale+1e-9)continue;
  if(boxesOverlap3D(body,box))return false;
 }
 return linkedArmClear(frame);
}
// A tracked chassis can turn under steering load when straight travel is
// obstructed. Keep the arm and tracks in the same swept contact checks.
export function driveTransportExcavator(work,throttle,steer,dt,{fast=false,contactTurn=false,canMove=()=>true}={}){
 if(work.frame.version!==2||work.mode!=='excavating'||work.scoop||work.link||work.unload||work.frame.job||work.frame.soil.pending)throw Error('ショベルに乗り、作業を終えてから走行しよう。');
 if(!finite(throttle,-1,1)||!finite(steer,-1,1)||!finite(dt,Number.EPSILON,.05)||typeof fast!=='boolean')throw Error('走行の入力を確認してください。');
 if(!throttle&&!steer)return work;
 const steering=steer*(throttle?.84*CONSTRUCTION_STEERING_FACTOR:.89);
 let length=throttle*(throttle>0?140:86)*(fast?2.5:1)*dt;
 if(length){
  const {frame}=work;
  let fitted=1;
  try{
   const forward=excavatorGroundFrame(frame).axes[2];
   fitted=ascentTravelFactor(Math.hypot(forward[0],forward[2]),Math.sign(length)*forward[1]);
  }catch{ /* Let the regular swept drive check handle a recovery step. */ }
  length*=Math.min(fitted,quarryAscentFactor(nativeDumpHeightReader(frame),frame.machineVehicle,length));
 }
 // Opposite track travel about the chassis centre. Bound the swept steps
 // by the same half-unit scale at the far end of the raised arm.
 const pivot=throttle?0:steering*36/56*dt;
 const n=Math.max(1,Math.ceil(Math.max(Math.abs(length),Math.abs(pivot)*140)/.5));
 let frame=work.frame;
 for(let i=0;i<n;i++){
  const v=frame.machineVehicle,travel=length/n,turn=throttle?steering*travel/65:pivot/n;
  const checked=machineVehicle=>{
   let candidate={...frame,machineVehicle};
   if(frame.decks){try{const groundY=excavatorGroundFrame(candidate).position[1];candidate={...candidate,machineVehicle:{...machineVehicle,groundY}};}catch{return null;}}
   if(!transportExcavatorPositionSafe(candidate))return null;
   candidate={...candidate,player:linkedExcavatorSeat(candidate)};
   return canMove({...work,frame:candidate})?candidate:null;
  };
  const advance=(distance,yaw)=>{
   const angle=v.heading-yaw,h=Math.atan2(Math.sin(angle),Math.cos(angle));
   return checked({...v,x:v.x+Math.sin(h)*distance,z:v.z+Math.cos(h)*distance,heading:h,wheelTravel:v.wheelTravel+distance});
  };
  let next=contactTurn?null:advance(travel,turn);
  if(!next&&turn&&throttle){
   const normalize=p=>({...p,heading:Math.atan2(Math.sin(p.heading),Math.cos(p.heading))});
   const turned=steerVehicleClearOfContact(v,{throttle,steer:steering,dt,halfWidth:35,halfLength:40,clear:p=>!!checked(normalize(p))});
   next=turned?checked(normalize(turned)):null;
   if(next)frame=next;
   break;
  }
  if(!next)break;
  frame=next;
 }
 return frame!==work.frame?{...work,revision:work.revision+1,frame:{...frame,revision:work.frame.revision+1}}:work;
}

// The preview and the swept collision check follow the same measured descent.
// Keep transient heights off the vehicle/save format.
const descentProfiles=new WeakMap();
export function quarryDropPose(from,to,t){
 t=Math.min(1,Math.max(0,t));
 const profile=descentProfiles.get(to),index=t*(profile?.length-1||0),i=Math.floor(index);
 const groundY=profile?profile[i]+((profile[i+1]??profile[i])-profile[i])*(index-i):
  from.groundY+(to.groundY-from.groundY)*t*t;
 return {x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,groundY,heading:from.heading};
}

export function dropQuarryTransport(work,throttle,canMove){
 const f=work.frame,tracked=work.mode==='excavating',key=tracked?'machineVehicle':'dump',v=f[key];
 if(!v||!['driving','excavating'].includes(work.mode)||work.scoop||work.link||work.unload||
    f.job||f.soil.pending||f.soil.schema!==3||!finite(throttle,-1,1)||!throttle||!Number.isFinite(v.groundY))return work;
 const forward=Math.sign(throttle),c=Math.cos(v.heading),s=Math.sin(v.heading),dx=s*forward,dz=c*forward;
 const ground=nativeDumpHeightReader(f),area=transportArea(f),start=ground(v.x,v.z,v.groundY);
 if(!Number.isFinite(start))return work;
 // A wheel or track can lose support before the centre reaches the lip.
 const length=tracked?40:43,width=tracked?34:33;
 let downhill=false;
 for(let d=3;d<=length*2&&!downhill;d+=3){
  for(const side of [0,-width,width]){
   const px=v.x+c*side,pz=v.z-s*side,y=ground(px+dx*d,pz+dz*d,v.groundY);
   if(Number.isFinite(y)&&y<ground(px,pz,v.groundY)-.5){downhill=true;break;}
  }
 }
 if(!downhill)return work;
 const footprint=(x,z)=>{let high=-Infinity;
  for(const side of [-width,0,width])for(const along of [-length,-length/2,0,length/2,length]){
   const y=ground(x+c*side+s*along,z-s*side+c*along,v.groundY);
   if(!Number.isFinite(y))return Infinity;
   high=Math.max(high,y);
  }
  return high;
 };
 const lip=footprint(v.x,v.z),ridge=[lip];
 // Sample until supported ground is found, including narrow shelves and long
 // descents. The actual field edge, terrain rising ahead and solids end a path.
 const spacing=3,extentX=Math.abs(c)*width+Math.abs(s)*length,extentZ=Math.abs(s)*width+Math.abs(c)*length;
 for(let i=1;;i++){
  const distance=i*spacing,x=v.x+dx*distance,z=v.z+dz*distance;
  if(x-extentX<=area.minX||x+extentX>=area.maxX||z-extentZ<=area.minZ||z+extentZ>=area.maxZ)break;
  const expected=ground(x,z,v.groundY),roof=footprint(x,z);
  if(!Number.isFinite(expected)||!Number.isFinite(roof)||roof>lip+6)break;
  ridge.push(roof);
  if(expected>Math.max(start,v.groundY)-.6||i<2)continue;
  let frame={...f,[key]:{...v,x,z,groundY:expected}};
  try{
   const support=tracked?excavatorGroundFrame(frame):nativeDumpSupport(frame);
   if(!tracked&&!support.driveReady)continue;
   const y=tracked?support.position[1]:support.y;
   if(!Number.isFinite(y)||y>v.groundY-.5)continue;
   // A momentarily supported pose on the lip is not a landing when the ground
   // still falls away under both ends of the vehicle.
   const beyond=ground(x+dx*length,z+dz*length,y);
   if(Number.isFinite(beyond)&&beyond<y-length*.6)continue;
   frame[key].groundY=y;
   if(!(tracked?transportExcavatorPositionSafe(frame):dumpPositionSafe(frame)))continue;
   frame.player=tracked?linkedExcavatorSeat(frame):dumpDriverSeat(frame);
  }catch{continue;}
  const target=frame[key],fall=v.groundY-target.groundY;
  const heights=ridge.map((h,k)=>{
   const t=k/i,carry=Math.min(.55,length/distance),air=Math.max(0,(t-carry)/(1-carry));
   // Above the measured footprint on a crowned or sloping takeoff/landing.
   const terrainY=h+(v.groundY-lip)*(1-t)+(target.groundY-roof)*t;
   return Math.max(v.groundY-fall*air*air,terrainY);
  });
  heights[0]=v.groundY;heights[i]=target.groundY;
  const hard=[...nativeDeckBoxes(f,{x:(x+v.x)/2,z:(z+v.z)/2,r:distance/2+175}),
   ...(tracked?[storageBinBox(f),shovelDumpBody(f)]:shovelMachines(f))];
  // Use the same vehicle, cab and attachment pose the flight renderer draws.
  const parts=tracked?shovelMachines(frame).filter((_,index)=>index!==1):[shovelDumpBody(frame)];
  const sweep=[];
  for(let k=0;k<=i;k++){
   const qx=v.x+dx*k*spacing,qz=v.z+dz*k*spacing,y=heights[k];
   const soil=shovelSoilContactCandidates(f.soil,qx-180,qx+180,qz-180,qz+180,y-64);
   for(const part of parts){
    const box={...part,position:[part.position[0]+qx-x,part.position[1]+y-target.groundY,part.position[2]+qz-z]};
    if(hard.some(o=>boxesOverlap3D(box,o))||soil.some(o=>boxesOverlap3D(box,o)))return work;
    sweep.push(box);
   }
  }
  const next={...work,revision:work.revision+1,frame:{...frame,revision:f.revision+1},...(!tracked?{
   vehicleTravel:work.vehicleTravel+distance,wheelTravel:work.wheelTravel+forward*distance}:null)};
  if(!canMove(next,sweep))return work;
  descentProfiles.set(target,heights);
  return next;
 }
 return work;
}
