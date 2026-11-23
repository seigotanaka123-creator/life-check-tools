import {VEHICLE_CONTACT,vehicleTravelHeading} from './free-vehicle-shape.mjs?v=120ov';
import {CONSTRUCTION_STEERING_FACTOR,steerVehicleClearOfContact} from '../imasora-construction-shared-field.mjs?v=120ey';
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
export function steeredVehicleCandidates(v,name,throttle,steer,stride=8){
 if(![v.x,v.z,v.heading,throttle,steer].every(Number.isFinite)||!['truck','pump'].includes(name)||Math.abs(throttle)<.08)return [];
 throttle=Math.max(-1,Math.min(1,throttle));steer=Math.max(-1,Math.min(1,steer))*CONSTRUCTION_STEERING_FACTOR;
 const out=[],seen=new Set();
 for(const size of [...new Set([Math.max(8,Math.min(15,stride)),8,4,2,1])]){
  const travel=size*throttle,angle=-travel*Math.tan(steer*.48)/52,mid=v.heading+angle/2;
  const x=Math.round(v.x+Math.sin(mid)*travel),z=Math.round(v.z+Math.cos(mid)*travel),distance=Math.hypot(x-v.x,z-v.z);
  if(!distance||seen.has(x+','+z))continue;seen.add(x+','+z);
  const heading=Math.atan2(Math.sin(v.heading+angle),Math.cos(v.heading+angle));
  out.push({type:'FREE_MOVE',vehicle:name,x,z,heading});
 }
 return out;
}
export function chooseSteeredVehicleTravel(v,name,throttle,steer,problem,stride=8){
 const candidates=steeredVehicleCandidates(v,name,throttle,steer,stride);
 const move=candidates.find(a=>!problem(a));
 if(move||!candidates.length||Math.abs(steer)<.08)return move??candidates[0]??null;
 const action=pose=>({type:'FREE_MOVE',vehicle:name,x:Math.round(pose.x),z:Math.round(pose.z),heading:Math.atan2(Math.sin(pose.heading),Math.cos(pose.heading))});
 // `problem` checks the entire segment from the saved pose, including all six
 // wheels, fixtures and hoses. The chosen action is checked again at commit.
 for(const dt of [.10,.065,.038]){
  const turn=steerVehicleClearOfContact(v,{throttle,steer:Math.max(-1,Math.min(1,steer))*Math.min(1,Math.abs(throttle))*CONSTRUCTION_STEERING_FACTOR,dt,
   halfWidth:VEHICLE_CONTACT.halfX,halfLength:throttle>0?VEHICLE_CONTACT.halfZ:48,
   clear:pose=>!problem(action(pose)),swept:true});
  if(turn)return action(turn);
 }
 return candidates[0];
}

