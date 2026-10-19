import {shovelMachines,shovelDumpBody} from './imasora-construction-shovel-work.mjs?v=120fw';
import {boxExtent,boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120fw';
import {nativeDumpHeightAt} from './imasora-construction-native-dump-support.mjs?v=120fw';
import {dumpRaisedBoxes} from './imasora-construction-dump-work.mjs?v=120fw';
import {shovelMachineState} from './imasora-construction-shovel-work.mjs?v=120fw';
import {armPose} from './imasora-construction-excavator.js?v=120fc';
import {bucketContactGeometry} from './imasora-construction-excavator-contact.js?v=120fc';
// Transient scene checks supplement the saved soil model. They never mint a
// save receipt, move an obstacle, or flatten a surface to let a vehicle through.
export function transportSceneMovementAllowed(before,next,{solids=[],blocked=()=>false,heightAt=null}={}){
 if(next.frame.version!==2)return true;
 const f=next.frame,origin=f.soil.field.origin,walk=next.mode==='foot',exc=next.mode==='excavating';
 const p=f.player,boxes=walk?[{position:[p.x,p.y+14,p.z],half:[13.5,14,13.5]}]:exc?shovelMachines(f).filter((_,i)=>i!==1):[shovelDumpBody(f)];
 if(boxes.some(b=>solids.some(s=>boxesOverlap3D(b,s))))return false;
 for(const b of boxes){const e=boxExtent(b),pos=[origin[0]+b.position[0],b.position[1],origin[1]+b.position[2]],size=e.map(v=>v*2);if(blocked(pos,size))return false;}
 if(heightAt){const v=walk?p:exc?f.machineVehicle:f.dump,c=Math.cos(v.heading),s=Math.sin(v.heading);
  const samples=walk?[[0,0],[-13,0],[13,0],[0,-13],[0,13]]:[[-28,-36],[28,-36],[-28,36],[28,36],[0,0]];
  for(const [x,z]of samples){const px=v.x+c*x+s*z,pz=v.z-s*x+c*z,h=heightAt(origin[0]+px,origin[1]+pz),expected=nativeDumpHeightAt(f,px,pz);if(!Number.isFinite(h)||!Number.isFinite(expected)||Math.abs(h-expected)>.15)return false;}
 }
 return true;
}
export function transportSceneActionAllowed(before,next,name,scene){
 if(next.frame.version!==2)return true;
 const movement=['walkBucketSite','driveBucketSite','driveTransportExcavator'].includes(name),pending=next.frame.soil.pending;
 const changesGround=pending&&pending!==before.frame.soil.pending&&(pending.to==='terrain'||['terrain','batch'].includes(pending.from));
 // Most animation ticks have no live-scene query at all. Build the current
 // obstacle list lazily only when the original checks actually consume it.
 if(!movement&&!(name==='startBasinScoop'&&next.scoop)&&name!=='startBucketSiteUnload'&&!changesGround)return true;
 scene=typeof scene==='function'?scene():scene;
 if(movement)return transportSceneMovementAllowed(before,next,scene);
 const f=next.frame,origin=f.soil.field.origin,p=f.soil.pending,boxes=[];
 // The hole tool can aim the upper structure before cutting. Other vehicles
 // and saved buildings are not in the soil planner: check its entire motion
 // against the live scene, as well as protecting the removed ground below.
 if(name==='startBasinScoop'&&next.scoop){
  const w=shovelMachineState(f),motion=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const step of next.scoop.plan.poses){const frame={...w,arm:step.arm},pose=armPose(frame),parts=bucketContactGeometry(frame,pose).all;
   const ranges=[];for(let j=0;j<2;j++){const a=pose.world[j],b=pose.world[j+1];ranges.push({min:[Math.min(a.x,b.x)-2.8,Math.min(a.y,b.y)-2.8,Math.min(a.z,b.z)-2.8],max:[Math.max(a.x,b.x)+2.8,Math.max(a.y,b.y)+2.8,Math.max(a.z,b.z)+2.8]});}
   ranges.push({min:[0,1,2].map(i=>Math.min(...parts.map(p=>p.min[i]))),max:[0,1,2].map(i=>Math.max(...parts.map(p=>p.max[i])))});
   for(const r of ranges){for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],r.min[i]);hi[i]=Math.max(hi[i],r.max[i]);}motion.push({position:lo.map((_,i)=>(r.min[i]+r.max[i])/2),half:lo.map((_,i)=>(r.max[i]-r.min[i])/2)});}
  }
  const envelope={position:lo.map((n,i)=>(n+hi[i])/2),half:lo.map((n,i)=>(hi[i]-n)/2)},nearby=(scene.solids??[]).filter(s=>boxesOverlap3D(envelope,s));
  // Legacy work controllers expose a footprint predicate, not an index. Ask
  // it once for the whole bounded swept area; conservatively stop if occupied.
  if(scene.blocked?.([origin[0]+envelope.position[0],envelope.position[1],origin[1]+envelope.position[2]],envelope.half.map(v=>v*2)))return false;
  if(nearby.some(s=>motion.some(b=>boxesOverlap3D(b,s))))return false;
 }
 if(p&&p!==before.frame.soil.pending&&p.to==='terrain')for(const q of p.positions??[])boxes.push({position:q.map(v=>v*2+1),half:[1,1,1]});
 if(name==='startBucketSiteUnload')for(let i=0;i<=16;i++)boxes.push(...dumpRaisedBoxes(f,.8*i/16));
 // Surveying only reveals ground. The cut itself cannot remove a foundation
 // beneath a saved building or another vehicle.
 if(p&&p!==before.frame.soil.pending&&['terrain','batch'].includes(p.from))for(const part of p.from==='batch'?p.segments:[p])if(part.from==='terrain')for(const q of part.positions){const x=q[0]*2+1,z=q[2]*2+1,low=q[1]*2,ground=nativeDumpHeightAt(before.frame,x,z);if(!Number.isFinite(ground))return false;const high=Math.max(low+2,ground+4);boxes.push({position:[x,(low+high)/2,z],half:[1,(high-low)/2,1]});}
 const solids=scene.solids??[],blocked=scene.blocked??(()=>false);
 return !boxes.some(b=>{if(solids.some(s=>boxesOverlap3D(b,s)))return true;const e=boxExtent(b);return blocked([origin[0]+b.position[0],b.position[1],origin[1]+b.position[2]],e.map(v=>v*2));});
}
