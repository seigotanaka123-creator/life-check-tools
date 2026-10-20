import {LOADER,localToWorld,worldToLocal,samplePath} from './imasora-construction-loader-physics.js?v=120gf';

// The saved driving anchor is historical. Move the visible cab and driver
// together without rewriting that anchor, terrain, inventory or checkpoints.
// The sprung body moves up when a tyre compresses the suspension. Keep a
// low fixed cab floor, with 0.25 clearance above the maximum relative tyre
// rise and a 1.2-thick floor. Neither tyre nor occupant is resized.
export const DUMP_MAX_WHEEL_RISE=4.5;
export const dumpSuspensionLift=offsets=>{const n=Math.max(0,...offsets.map(y=>y-DUMP_MAX_WHEEL_RISE));return n>1e-7?n:0;};
export const DUMP_CAB=Object.freeze({driverX:-14,passengerX:14,driverZ:18,floor:23.5,gripY:36.38,gripZ:34});
export const dumpCabLift=DUMP_CAB.floor-LOADER.floor;
export const dumpDriverLocal=footBottom=>[DUMP_CAB.driverX,DUMP_CAB.floor-footBottom,DUMP_CAB.driverZ];
export const dumpPassengerLocal=footBottom=>[DUMP_CAB.passengerX,DUMP_CAB.floor-footBottom,DUMP_CAB.driverZ];

// Practice boarding uses the same cab as normal play. Lift before crossing
// the wheel, then finish at the left driver seat; reverse exactly when leaving.
export function dumpCabActorPose(rig){
 if(rig.mode==='driving')return{...localToWorld(rig.vehicle,DUMP_CAB.driverX,DUMP_CAB.driverZ),y:DUMP_CAB.floor,heading:rig.vehicle.heading};
 if(!rig.transition)return rig.player;
 const points=rig.transition.path.map(p=>{
  const local=worldToLocal(rig.vehicle,p.x,p.z);
  if(Math.abs(p.y-LOADER.floor)<1e-6&&Math.abs(local.x-LOADER.seatX)<1e-6&&Math.abs(local.z-DUMP_CAB.driverZ)<1e-6)local.x=DUMP_CAB.driverX;
  return{...p,...localToWorld(rig.vehicle,local.x,local.z),y:p.y*DUMP_CAB.floor/LOADER.floor};
 });
 return samplePath(points,rig.transition.elapsed/rig.transition.duration);
}
