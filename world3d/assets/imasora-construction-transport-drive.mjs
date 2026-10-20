import {excavatorGroundFrame} from './imasora-construction-native-excavator-ground.mjs?v=120gn';
import {shovelMachines,shovelMachineState,shovelNearbySoil,shovelDumpBody} from './imasora-construction-shovel-work.mjs?v=120gn';
import {transportArea} from './imasora-construction-transport-field.mjs?v=120gf';
import {nativeDumpHeightAt} from './imasora-construction-native-dump-support.mjs?v=120gn';
import {boxExtent,boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120gn';
import {linkedArmClear,linkedExcavatorSeat} from './imasora-construction-bucket-dump.mjs?v=120gn';

const finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b;
// Ground support, hulls, arm, rider and display share the same derived frame.
export function transportExcavatorPositionSafe(frame){
 const v=frame.machineVehicle??shovelMachineState(frame).loader.vehicle,a=transportArea(frame);try{excavatorGroundFrame(frame);}catch{return false;}
 if(!['x','z','heading'].every(k=>Number.isFinite(v[k])))return false;
 const parts=shovelMachines(frame),body=parts[0],e=boxExtent(body);
 if(v.x-e[0]<a.minX+1||v.x+e[0]>a.maxX-1||v.z-e[2]<a.minZ+1||v.z+e[2]>a.maxZ-1)return false;
 // Query the entire tilted hull, never just its centre or wheel contacts.
 const nearby=shovelNearbySoil(frame.soil,body.position[0],body.position[2],Math.max(e[0],e[2])+.01);
 if([parts[1],shovelDumpBody(frame),...nearby].some(b=>boxesOverlap3D(body,b)))return false;
 return linkedArmClear(frame);
}
// Steering changes heading only through actual forward/backward travel.
// Substeps are at most half a unit; a stopped steering input never spins.
export function driveTransportExcavator(work,throttle,steer,dt,{fast=false}={}){
 if(work.frame.version!==2||work.mode!=='excavating'||work.scoop||work.link||work.unload||work.frame.job||work.frame.soil.pending)throw Error('ショベルに乗り、作業を終えてから走行しよう。');
 if(!finite(throttle,-1,1)||!finite(steer,-1,1)||!finite(dt,Number.EPSILON,.05)||typeof fast!=='boolean')throw Error('走行の入力を確認してください。');
 if(!throttle)return work;
 const length=throttle*(throttle>0?40:26)*(fast?2.5:1)*dt,n=Math.max(1,Math.ceil(Math.abs(length)/.5));let frame=work.frame,moved=0;
 for(let i=0;i<n;i++){
  const v=frame.machineVehicle,angle=v.heading-steer*length/n/65,h=Math.atan2(Math.sin(angle),Math.cos(angle));
  const machineVehicle={...v,x:v.x+Math.sin(h)*length/n,z:v.z+Math.cos(h)*length/n,heading:h,wheelTravel:v.wheelTravel+length/n};
  const candidate={...frame,machineVehicle};if(!transportExcavatorPositionSafe(candidate))break;
  moved+=Math.abs(length/n);frame={...candidate,player:linkedExcavatorSeat(candidate)};
 }
 return moved?{...work,revision:work.revision+1,frame:{...frame,revision:work.frame.revision+1}}:work;
}
