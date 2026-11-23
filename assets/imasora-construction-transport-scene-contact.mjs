import {bucketGroundFlowBoxes,bucketPlanPose} from './imasora-construction-bucket-dump.mjs?v=120pv';
import {shovelMachines,shovelDumpBody,shovelSegmentHits} from './imasora-construction-shovel-work.mjs?v=120pv';
import {boxExtent,boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120pv';
import {nativeDumpHeightAt,nativeDumpHeightReader} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {dumpRaisedBoxes} from './imasora-construction-dump-work.mjs?v=120pv';
import {shovelMachineState} from './imasora-construction-shovel-work.mjs?v=120pv';
import {armPose} from './imasora-construction-excavator.js?v=120ov';
import {bucketContactGeometry} from './imasora-construction-excavator-contact.js?v=120fc';
import {cutBank,quarryMountain,quarryRange} from './imasora-construction-field-earth.mjs?v=120ov';
import {handEarthBox} from './imasora-construction-hand-area.mjs?v=120pv';
import {nativeStorageBin,storageBinBox} from './imasora-construction-transport-field.mjs?v=120ov';
// Transient scene checks supplement the saved soil model. They never mint a
// save receipt, move an obstacle, or flatten a surface to let a vehicle through.
export function transportSceneMovementAllowed(before,next,{solids=[],blocked=()=>false,heightAt=null}={}){
 if(next.frame.version!==2)return true;
 const f=next.frame,origin=f.soil.field.origin,walk=next.mode==='foot',exc=next.mode==='excavating';
 const p=f.player,boxes=walk?[{position:[p.x,p.y+14,p.z],half:[13.5,14,13.5]}]:exc?shovelMachines(f).filter((_,i)=>i!==1):[shovelDumpBody(f)];
 const level=walk?f.player.y:exc?f.machineVehicle.groundY:f.dump.groundY;
 if(boxes.some(b=>solids.some(s=>!(f.decks&&s.supportSurface&&s.position[1]+s.half[1]<=level+8)&&boxesOverlap3D(b,s))))return false;
 if(!f.decks)for(const b of boxes){
  const e=boxExtent(b),pos=[origin[0]+b.position[0],b.position[1],origin[1]+b.position[2]],size=e.map(v=>v*2);
  if(blocked(pos,size))return false;
 }
 if(heightAt){const v=walk?p:exc?f.machineVehicle:f.dump,c=Math.cos(v.heading),s=Math.sin(v.heading);
  const samples=walk?[[0,0],[-13,0],[13,0],[0,-13],[0,13]]:[[-28,-36],[28,-36],[-28,36],[28,36],[0,0]];
  for(const [x,z]of samples){const px=v.x+c*x+s*z,pz=v.z-s*x+c*z,h=heightAt(origin[0]+px,origin[1]+pz,level??0),expected=nativeDumpHeightAt(f,px,pz,level??0);if(!Number.isFinite(h)||!Number.isFinite(expected)||Math.abs(h-expected)>.15)return false;}
 }
 return true;
}
function terrainCutBoxes(frame,segments){
 const heightAt=nativeDumpHeightReader(frame),heights=new Map(),cuts=[];
 for(const part of segments)if(part.from==='terrain')for(const [columnX,row,columnZ] of part.positions){
  const x=columnX*2+1,z=columnZ*2+1,low=row*2,key=columnX+','+columnZ;
  if(!heights.has(key))heights.set(key,heightAt(x,z,0));
  const ground=heights.get(key);
  if(!Number.isFinite(ground))return null;
  const high=Math.max(low+2,ground+4);
  cuts.push({position:[x,(low+high)/2,z],half:[1,(high-low)/2,1]});
 }
 return cuts;
}
function clearSceneBoxes(frame,boxes,scene,cutOnly=false){
 const origin=frame.soil.field.origin;
 let solids=scene.solids??[];
 // A cut may touch dozens of grains. Filter distant obstacles once.
 if(cutOnly&&solids.length){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const box of boxes)for(let i=0;i<3;i++){
   min[i]=Math.min(min[i],box.position[i]-box.half[i]);
   max[i]=Math.max(max[i],box.position[i]+box.half[i]);
  }
  solids=solids.filter(s=>!boxExtent(s).some((half,i)=>s.position[i]+half<min[i]||s.position[i]-half>max[i]));
 }
 const blocked=scene.blocked;
 return !boxes.some(b=>{
  if(solids.some(s=>boxesOverlap3D(b,s)))return true;
  if(!blocked)return false;
  const extent=!b.axes&&!b.heading&&b.half?b.half:boxExtent(b);
  return blocked([origin[0]+b.position[0],b.position[1],origin[1]+b.position[2]],extent.map(v=>v*2));
 });
}
export function transportSceneScoopTargetAllowed(frame,plan,scene){
 if(frame.version!==2)return true;
 const cuts=terrainCutBoxes(frame,plan.cuts);
 return !!cuts&&clearSceneBoxes(frame,cuts,scene,cuts.length>1);
}
export function transportSceneActionAllowed(before,next,name,scene,flight=null){
 if(next.frame.version!==2)return true;
 if(name==='dropQuarryTransport'){
  scene=typeof scene==='function'?scene():scene;
  return !!flight?.length&&transportSceneMovementAllowed(before,next,scene)&&
    !flight.some(box=>scene.solids?.some(solid=>boxesOverlap3D(box,solid)));
 }
 if(name==='relocateEarthStorage'){
  scene=typeof scene==='function'?scene():scene;
  const f=next.frame,bin=nativeStorageBin(f),[x,z]=f.soil.field.origin,p=f.player;
  const fixed=storageBinBox(f),lane={position:[bin.x,16,bin.z+81*bin.approachSign],half:[44,16,58],heading:0};
  const blockers=[...(scene.solids??[]),...shovelMachines(before.frame),shovelDumpBody(before.frame),{position:[p.x,p.y+14,p.z],half:[15.6,14,15.6]}];
  return ![fixed,lane].some(box=>blockers.some(b=>boxesOverlap3D(box,b))||scene.blocked?.([box.position[0]+x,box.position[1],box.position[2]+z],box.half.map(v=>v*2)));
 }
 if(name==='startBucketPour'||['startBucketStorage','startBucketStorageDeposit','startBucketSiteStorage'].includes(name)&&nativeStorageBin(next.frame).clustered){
  scene=typeof scene==='function'?scene():scene;
  const f=next.frame,base=name==='startBucketSiteStorage'?f.dump:f.machineVehicle;
  const sweep={position:[base.x,(base.groundY??0)+80,base.z],half:[180,80,180]},solids=(scene.solids??[]).filter(b=>boxesOverlap3D(sweep,b));
  if(!solids.length)return true;
  if(name==='startBucketSiteStorage'){
   for(let i=0;i<=24;i++)if(dumpRaisedBoxes(f,.8*i/24).some(b=>solids.some(o=>boxesOverlap3D(b,o))))return false;
   return true;
  }
  const w=shovelMachineState(f),plan=next.link?.plan;
  if(!plan)return false;
  const count=Math.ceil(plan.duration/.04);
  for(let i=0;i<=count;i++){
   const state={...w,arm:bucketPlanPose(plan,plan.duration*i/count)},pose=armPose(state),pieces=bucketContactGeometry(state,pose).all;
   if(solids.some(box=>pose.world.slice(0,2).some((p,j)=>shovelSegmentHits([p.x,p.y,p.z],[pose.world[j+1].x,pose.world[j+1].y,pose.world[j+1].z],box,2.8))||
    pieces.some(p=>boxesOverlap3D({position:p.min.map((n,j)=>(n+p.max[j])/2),half:p.min.map((n,j)=>(p.max[j]-n)/2)},box))))return false;
  }
  return true;
 }
 if(['openCutBank','openQuarryMountain','openQuarryRange'].includes(name)){
  const soil=next.frame.soil,earth=name==='openQuarryRange'?quarryRange(soil):name==='openQuarryMountain'?quarryMountain(soil):cutBank(soil,soil.journal.at(-1).type==='open-cut-ridge');
  const {minX,maxX,minZ,maxZ,maxY}=earth.bounds;
  const bank={position:[(minX+maxX)/2,maxY/2,(minZ+maxZ)/2],half:[(maxX-minX)/2,maxY/2,(maxZ-minZ)/2],heading:0};
  const [x,z]=next.frame.soil.field.origin;
  scene=typeof scene==='function'?scene():scene;
  const p=before.frame.player;
  return ![...(scene.solids??[]),...shovelMachines(before.frame),shovelDumpBody(before.frame),{position:[p.x,p.y+14,p.z],half:[14,14,14],heading:0}].some(b=>boxesOverlap3D(bank,b))
   &&!scene.blocked?.([bank.position[0]+x,maxY/2,bank.position[2]+z],bank.half.map(n=>n*2));
 }
 const movement=['walkBucketSite','driveBucketSite','driveTransportExcavator','adjustBucketArmWork','returnTransportToParking','arriveHandEarth'].includes(name),pending=next.frame.soil.pending;
 const changesGround=pending&&pending!==before.frame.soil.pending&&(pending.to==='terrain'||['terrain','batch'].includes(pending.from));
 // Most animation ticks have no live-scene query at all. Build the current
 // obstacle list lazily only when the original checks actually consume it.
 if(!movement&&!(name==='startBasinScoop'&&next.scoop)&&name!=='startBucketSiteUnload'&&name!=='editHandEarth'&&!changesGround)return true;
 scene=typeof scene==='function'?scene():scene;
 if(movement)return transportSceneMovementAllowed(before,next,scene);
 const f=next.frame,p=f.soil.pending,boxes=[];
 if(name==='editHandEarth'){
  const command=f.soil.journal.at(-1),piece=handEarthBox(command.base,command.shape);
  boxes.push(piece);
  if(command.action==='remove'){
   const top=piece.position[1]+piece.half[1];
   boxes.push({position:[piece.position[0],top+3,piece.position[2]],half:[4,3,4]});
  }
 }
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
  if(scene.blocked?.([f.soil.field.origin[0]+envelope.position[0],envelope.position[1],f.soil.field.origin[1]+envelope.position[2]],envelope.half.map(v=>v*2)))return false;
  if(nearby.some(s=>motion.some(b=>boxesOverlap3D(b,s))))return false;
 }
 if(p&&p!==before.frame.soil.pending&&p.to==='terrain')for(const q of p.positions??[])boxes.push({position:q.map(v=>v*2+1),half:[1,1,1]});
 if(name==='startBucketGroundPour'&&next.link?.plan.kind==='ground-pour-v1')for(let i=0;i<next.link.plan.positions.length;i++)boxes.push(...bucketGroundFlowBoxes(f,next.link.plan,i));
 if(name==='startBucketSiteUnload')for(let i=0;i<=16;i++)boxes.push(...dumpRaisedBoxes(f,.8*i/16));
 // Surveying only reveals ground. The cut itself cannot remove a foundation
 // beneath a saved building or another vehicle.
 if(p&&p!==before.frame.soil.pending&&['terrain','batch'].includes(p.from)){
  const cuts=terrainCutBoxes(before.frame,p.from==='batch'?p.segments:[p]);
  if(!cuts)return false;
  return clearSceneBoxes(f,[...boxes,...cuts],scene,cuts.length>1&&boxes.length===0);
 }
 return clearSceneBoxes(f,boxes,scene);
}
