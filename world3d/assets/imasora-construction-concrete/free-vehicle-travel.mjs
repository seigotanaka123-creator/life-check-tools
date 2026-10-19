import {vehicleTravelHeading} from './free-vehicle-shape.mjs';
// A keyboard's full step must not strand a safely parked car in a narrow aisle.
// Every candidate uses the same complete chassis sweep and terrain validation.
export function vehicleTravelCandidates(v,name,dx,dz,strength=1){
 const len=Math.hypot(dx,dz);if(!Number.isFinite(len)||!len||!Number.isFinite(strength)||strength<=0)return [];
 const heading=vehicleTravelHeading(v,dx,dz),steps=[8,4,2,1],seen=new Set(),out=[];
 for(const size of steps){const step=size*Math.min(1,strength),x=Math.round(v.x+dx/len*step),z=Math.round(v.z+dz/len*step),key=x+','+z;if(x===v.x&&z===v.z||seen.has(key))continue;seen.add(key);out.push({type:'FREE_MOVE',vehicle:name,x,z,heading});}
 return out;
}
export function chooseVehicleTravel(v,name,dx,dz,strength,problem){
 const candidates=vehicleTravelCandidates(v,name,dx,dz,strength);
 // If every step is blocked, keep the full request so the normal player notice
 // reports the obstacle; no mutation occurs unless all receipt checks pass.
 return candidates.find(a=>!problem(a))??candidates[0]??null;
}

// Player driving uses accelerator/reverse and steering, never camera-relative translation.
export function steeredVehicleCandidates(v,name,throttle,steer){
 if(![v.x,v.z,v.heading,throttle,steer].every(Number.isFinite)||!['truck','pump'].includes(name)||Math.abs(throttle)<.08)return [];
 throttle=Math.max(-1,Math.min(1,throttle));steer=Math.max(-1,Math.min(1,steer));
 const out=[],seen=new Set();
 for(const size of [8,4,2,1]){
  const travel=size*throttle,angle=-travel*Math.tan(steer*.48)/52,mid=v.heading+angle/2;
  const x=Math.round(v.x+Math.sin(mid)*travel),z=Math.round(v.z+Math.cos(mid)*travel),distance=Math.hypot(x-v.x,z-v.z);
  if(!distance||seen.has(x+','+z))continue;seen.add(x+','+z);
  const heading=Math.atan2(Math.sin(v.heading+angle),Math.cos(v.heading+angle));
  out.push({type:'FREE_MOVE',vehicle:name,x,z,heading});
 }
 return out;
}
export function chooseSteeredVehicleTravel(v,name,throttle,steer,problem){
 const candidates=steeredVehicleCandidates(v,name,throttle,steer);
 return candidates.find(a=>!problem(a))??candidates[0]??null;
}

