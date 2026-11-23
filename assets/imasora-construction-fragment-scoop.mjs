import {retainingBasinCut} from './imasora-construction-basin-shape.mjs?v=120ov';
import {nativeDumpHeightReader,nativeEarthHeightReader} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {excavatorWorkSupported} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {hasQuarryMountain,hasSummitFace,quarryRangeSummitBench,unopenedGround} from './imasora-construction-field-earth.mjs?v=120ov';
export {driveTransportExcavator} from './imasora-construction-transport-drive.mjs?v=121gf';
import * as bucket from './imasora-construction-bucket-dump.mjs?v=120pv';
import {createDumpWork} from './imasora-construction-dump-work.mjs?v=120pv';
import {shovelMachineState,shovelDumpObstacles,shovelDumpPoint,shovelSegmentHits,shovelSoilContactCandidates} from './imasora-construction-shovel-work.mjs?v=120pv';
import {soilTransportCommand,soilTransportCommands,validateSoilTransport,isValidatedFrozenSoil,scoopTerrainDelta,SOIL_LIMITS} from './imasora-construction-soil-transport.mjs?v=120pv';
import {beginOneTouch,stepOneTouch,DIG_READY} from './imasora-construction-excavator-one-touch.js?v=120ov';
import {excavatorAccessPath} from './imasora-construction-excavator-access.js?v=120ov';
import {localToWorld} from './imasora-construction-loader-physics.js?v=120ov';
import {bucketContactGeometry,prismTouchesBox,prismTouchesCube} from './imasora-construction-excavator-contact.js?v=120fc';
import {armPose,EX} from './imasora-construction-excavator.js?v=120ov';
import {actWorldExcavation} from './imasora-construction-world-excavation.js?v=120ov';
import {canonical} from './imasora-construction-state.js';
import {isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {runWorldSaveTask} from './imasora-world-save-client.mjs?v=120pv';
import {nativeStorageBin,transportDigProtection} from './imasora-construction-transport-field.mjs?v=120ov';
export const SCOOP_DUMP_FORMAT='imasora-fragment-scoop-dump-checkpoint-v1';
export const SCOOP_DUMP_SCOPE='imasora-fragment-scoop-dump-isolated-v1';
const STEP=1/60,cache=new WeakMap(),certificates=new WeakMap(),shadowCache=new WeakMap(),replayPlans=new Map();
const basinCache=new WeakMap();
// Save/readback clones lose identity. Keep a small exact-value cache of the
// privately frozen audit projections; never cache an imported validation verdict.
const shadowValues=new Map();let shadowBytes=0;const shadowLimit=8*1024*1024;
const axes=['boom','stick','curl','slew'],same=(a,b)=>canonical(a)===canonical(b);
const check=(v,t)=>{if(!v)throw Error('ショベル作業：'+t);};
const exact=(v,keys)=>check(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...keys].sort().join('|'),'保存の項目が不正です。');
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const base=s=>{const {scoop,...v}=s;return{...v,format:bucket.BUCKET_DUMP_FORMAT,scope:bucket.BUCKET_DUMP_SCOPE};};
const next=(s,frame,extra={})=>({...s,revision:s.revision+1,frame:{...frame,revision:s.frame.revision+1},...extra});
const lift=v=>({...v,format:SCOOP_DUMP_FORMAT,scope:SCOOP_DUMP_SCOPE,scoop:null});
function assertIdle(s){check(!s.scoop&&!s.link&&!s.unload&&!s.frame.job&&!s.frame.soil.pending,'今の作業を終えてから操作してください。');}
function physical(s,soil=s.frame.soil,{partialExact=false}={}){
 const original=shovelMachineState(s.frame),terrain={};
 for(const [key,b]of Object.entries(soil.blocks))if(b.mask!=='0000000000000000'&&(!partialExact||b.mask==='ffffffffffffffff'))terrain[key]=key.split(',').map(Number);
 // These are disposable motion candidates; exact occupied shapes are checked below.
 const spoil=Object.values(soil.loose).filter(b=>b.mask!=='0000000000000000').map(b=>({id:b.legacyId,x:b.position[0],y:b.position[1],z:b.position[2]}));
 const boxes=shovelDumpObstacles(s.frame);
 if(soil.containers.dump.amount){const v=soil.containers.dump.amount*8,w=Math.min(48,Math.max(4,Math.sqrt(v/4))),d=Math.min(29,Math.max(4,v/(w*4))),h=v/(w*d);boxes.push({position:bucketPoint(s.frame,-24+w/2,17+h/2,-22),half:[w/2,h/2,d/2],heading:s.frame.dump.heading});}
 const external=boxes.map((b,i)=>{const h=b.half??Array(3).fill(b.size/2);return{name:'車体・既存の土:'+i,x:b.position[0],y:b.position[1]-h[1],z:b.position[2],w:h[0]*2,h:h[1]*2,d:h[2]*2,angle:b.heading??0};});
 return{work:{...original,arm:{...s.frame.machineArm},load:0,terrain,spoil,falling:[],cutMask:Object.fromEntries(Object.keys(terrain).map(k=>[k,true])),action:null,guide:null,hit:'',loader:{...original.loader,mode:'working',transition:null,vehicle:{...original.loader.vehicle,speed:0}}},external};
}
function bucketPoint(f,x,y,z){const p=localToWorld(f.dump,x,z);return[p.x,y,p.z];}
const lerp=(a,b,t)=>Object.fromEntries(axes.map(k=>[k,a[k]+(b[k]-a[k])*t]));
const fullBlockIndices=Array.from({length:64},(_,i)=>i);
const voxelBits=fullBlockIndices.map(i=>1n<<BigInt(i));
function groups(soil,vehicle,reach=200){
 const out=[],bits=mask=>{
  if(mask==='ffffffffffffffff')return fullBlockIndices;
  const value=BigInt('0x'+mask);
  return fullBlockIndices.filter(i=>(value&voxelBits[i])!==0n);
 };
 for(const [id,b]of Object.entries(soil.blocks)){const c=id.split(',').map(Number);if(vehicle&&(Math.abs(c[0]*8+4-vehicle.x)>reach||Math.abs(c[2]*8+4-vehicle.z)>reach))continue;const indexes=bits(b.mask),full=indexes.length===64;
  out.push({from:'terrain',id,center:c.map(n=>n*8+4),materialId:b.materialId,amount:indexes.length,positions:()=>indexes.map(i=>[c[0]*4+i%4,c[1]*4+Math.floor(i/4)%4,c[2]*4+Math.floor(i/16)]),boxes:full?[{position:c.map(n=>n*8+4),size:8,materialId:b.materialId}]:indexes.map(i=>({position:[c[0]*8+i%4*2+1,c[1]*8+Math.floor(i/4)%4*2+1,c[2]*8+Math.floor(i/16)*2+1],size:2,materialId:b.materialId}))});
 }
 for(const [id,b]of Object.entries(soil.loose)){if(vehicle&&(Math.abs(b.position[0]-vehicle.x)>reach||Math.abs(b.position[2]-vehicle.z)>reach))continue;const indexes=bits(b.mask);if(!indexes.length)continue;out.push({from:'loose',id,center:b.position,materialId:b.materialId,amount:indexes.length,positions:()=>indexes.map(i=>[i%4,Math.floor(i/4)%4,Math.floor(i/16)]),boxes:indexes.length===64?[{position:[...b.position],size:8,materialId:b.materialId}]:indexes.map(i=>({position:[b.position[0]-3+i%4*2,b.position[1]-3+Math.floor(i/4)%4*2,b.position[2]-3+Math.floor(i/16)*2],size:2,materialId:b.materialId}))});}
 return out.sort((a,b)=>(a.from+':'+a.id).localeCompare(b.from+':'+b.id));
}
function takeGroup(soil,g){if(g.from==='terrain'){const blocks={...soil.blocks};delete blocks[g.id];return{...soil,blocks};}return{...soil,loose:{...soil.loose,[g.id]:{...soil.loose[g.id],mask:'0000000000000000'}}};}
export const TOOTH_VOXEL_PLAN='tooth-voxel-v2';
export const BUCKET_SWEEP_PLAN='bucket-sweep-v3';
const PRIOR_SURFACE_PLAN='native-surface-sweep-v4';
export const SURFACE_SWEEP_PLAN='native-surface-carry-v5';
export const SUMMIT_SWEEP_PLAN='native-summit-carry-v1';
export const AIMED_SWEEP_PLAN='native-aimed-carry-v1';
const carryArm={boom:.76,stick:-1.53,curl:12*Math.PI/180};
function groupVoxels(soil,g){
 const ps=g.positions(),origin=g.from==='terrain'?null:soil.loose[g.id].position;
 return ps.map(p=>({p,box:{position:origin?[origin[0]-3+p[0]*2,origin[1]-3+p[1]*2,origin[2]-3+p[2]*2]:p.map(n=>n*2+1),size:2,materialId:g.materialId}}));
}
function clearBlockVoxels(old,group,positions){
 const cell=group.from==='terrain'?group.id.split(',').map(Number):null;
 let bits=BigInt('0x'+old.mask);
 for(const p of positions){
  const q=cell?p.map((n,i)=>n-cell[i]*4):p;
  bits&=~voxelBits[q[0]+q[1]*4+q[2]*16];
 }
 return bits||!cell?{...old,mask:bits.toString(16).padStart(16,'0')}:null;
}
function takeVoxels(soil,group,positions){
 const {id,from}=group,terrain=from==='terrain';
 const changed=clearBlockVoxels(terrain?soil.blocks[id]:soil.loose[id],group,positions);
 if(!terrain)return {...soil,loose:{...soil.loose,[id]:changed}};
 const blocks={...soil.blocks};
 if(changed)blocks[id]=changed;else delete blocks[id];
 return {...soil,blocks};
}
function touchesCut(part,box){
 const [x,y,z]=box.position;
 return prismTouchesCube(part,x,y,z,box.size/2,.08);
}
function somePartCuts(parts,box){
 const [x,y,z]=box.position,half=box.size/2;
 const lx=x-half-.08,rx=x+half+.08,ly=y-half-.08,ry=y+half+.08,lz=z-half-.08,rz=z+half+.08;
 for(const part of parts){
  const {min,max}=part;
  if(min[0]<=rx&&max[0]>=lx&&min[1]<=ry&&max[1]>=ly&&min[2]<=rz&&max[2]>=lz&&
     prismTouchesCube(part,x,y,z,half,.08))return true;
 }
 return false;
}
function cutTouchesAnyBox(parts,boxes){
 for(const box of boxes)if(somePartCuts(parts,box))return true;
 return false;
}
function indexCutGroups(groups){
 const cells=new Map(),rank=new Map(groups.map((g,i)=>[g,i]));
 for(const group of groups)for(const b of group.boxes){const r=b.size/2;for(let x=Math.floor((b.position[0]-r-.08)/16);x<=Math.floor((b.position[0]+r+.08)/16);x++)for(let y=Math.floor((b.position[1]-r-.08)/16);y<=Math.floor((b.position[1]+r+.08)/16);y++)for(let z=Math.floor((b.position[2]-r-.08)/16);z<=Math.floor((b.position[2]+r+.08)/16);z++){const key=x+','+y+','+z,set=cells.get(key)??new Set();set.add(group);cells.set(key,set);}}
 return parts=>{const out=new Set();for(const p of parts)for(let x=Math.floor((p.min[0]-.08)/16);x<=Math.floor((p.max[0]+.08)/16);x++)for(let y=Math.floor((p.min[1]-.08)/16);y<=Math.floor((p.max[1]+.08)/16);y++)for(let z=Math.floor((p.min[2]-.08)/16);z<=Math.floor((p.max[2]+.08)/16);z++)for(const group of cells.get(x+','+y+','+z)??[])out.add(group);return [...out].sort((a,b)=>rank.get(a)-rank.get(b));};
}
function* generate(s,{partialExact=false,voxelExact=false,bowlSweep=false,allowProtected=false,carry=false}={}){
 if(s.mode!=='excavating'||s.scoop||s.link||s.unload||s.frame.job||s.frame.soil.pending||s.frame.soil.containers.bucket.amount)return null;
 const {work,external}=physical(s,s.frame.soil,{partialExact});if(voxelExact){work.terrain={};work.spoil=[];work.cutMask={};}let run=beginOneTouch(work,'scoop',external),time=0,remaining=s.frame.soil,amount=0;
 const candidates=groups(remaining,work.loader.vehicle),removed=new Set(),voxelRows=voxelExact?new Map():null,nearby=voxelExact?indexCutGroups(candidates):null,poses=[{time:0,arm:{...work.arm},phase:run.sequence.phase}],cuts=[];
 while(run.sequence&&time<45){
  if(carry&&amount&&run.sequence.phase==='lift'){
   const frame={...s.frame,soil:remaining},from=run.work.arm;
   for(const sample of surfaceSamples(from,{...from,...carryArm},time)){
    if(!bucket.linkedArmClear(frame,sample.arm))return null;
    poses.push({...sample,phase:'lift'});time=sample.time;yield;
   }
   if(time>45||poses.length>2800)return null;
   return freeze({kind:SURFACE_SWEEP_PLAN,amount,duration:time,poses,cuts});
  }
  const previous=voxelExact?{...run.work,load:0}:run.work,seq=run.sequence,oldTime=time;run=stepOneTouch(previous,seq,{},STEP,external);time+=STEP;
  const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(run.work.arm[k]-previous.arm[k])/.003)));let safe={...previous.arm};
  for(let i=1;i<=n;i++){
   const arm=lerp(previous.arm,run.work.arm,i/n),probe={...run.work,arm},geometry=bucketContactGeometry(probe,armPose(probe));
   const beforeRemaining=remaining,beforeAmount=amount,beforeCuts=cuts.length,added=[],capturing=voxelExact&&['cut','close'].includes(seq.phase),cutters=capturing?[...(bowlSweep?geometry.all:geometry.teeth),...geometry.capture]:geometry.teeth;
   if(seq.phase==='cut'||voxelExact&&seq.phase==='close')for(const group of voxelExact?nearby(cutters):candidates){const id=group.from+':'+group.id;if(group.materialId!=='earth-soil'||amount>=384)continue;
    if(voxelExact){
     if(!group.boxes.some(b=>cutters.some(t=>touchesCut(t,b))))continue;
     if(!voxelRows.has(id))voxelRows.set(id,groupVoxels(s.frame.soil,group));
     const hit=voxelRows.get(id).filter(v=>!removed.has(id+':'+v.p.join(','))&&(allowProtected||!transportDigProtection(s.frame,v.box.position[0],v.box.position[2],1))&&cutters.some(t=>touchesCut(t,v.box))).slice(0,384-amount);
     if(!hit.length)continue;
     const positions=hit.map(v=>v.p);remaining=takeVoxels(remaining,group,positions);amount+=hit.length;
     for(const v of hit){const k=id+':'+v.p.join(',');removed.add(k);added.push(k);}
     cuts.push({from:group.from,id:group.id,positions,boxes:hit.map(v=>v.box),time:oldTime+STEP*i/n});
    }else{
     if(removed.has(id)||group.amount>384-amount||!group.boxes.some(b=>geometry.teeth.some(t=>touchesCut(t,b))))continue;
     remaining=takeGroup(remaining,group);removed.add(id);amount+=group.amount;cuts.push({from:group.from,id:group.id,positions:group.positions(),boxes:group.boxes,time:oldTime+STEP*i/n});
    }
   }
   if(!bucket.linkedArmClear({...s.frame,machineArm:arm,soil:remaining})){
    // The legacy loose cube is 0.1 smaller. Stop at the exact surface, then cut.
    const tooth=candidates.some(group=>!removed.has(group.from+':'+group.id)&&group.boxes.some(b=>geometry.teeth.some(t=>touchesCut(t,b))));
    const hardClear=bowlSweep?bucket.linkedArmHardClear({...s.frame,soil:remaining},arm):bucket.linkedArmClear({...s.frame,machineArm:arm,soil:{...remaining,blocks:{},loose:{}}});
    if(voxelExact&&seq.phase==='cut'&&beforeAmount>0&&hardClear){
     remaining=beforeRemaining;amount=beforeAmount;cuts.length=beforeCuts;for(const k of added)removed.delete(k);
     run={work:{...previous,arm:safe,load:amount/64,action:null,hit:'',message:'爪の接触面で掘削を終え、バケットを閉じます。'},sequence:{...seq,phase:'close'}};yield;break;
    }
    if(!['lower','draw'].includes(seq.phase)||!tooth||!hardClear)return null;
    const cutting=actWorldExcavation({...previous,arm:safe},'scoop',external);if(cutting.action?.kind!=='scoop')return null;
    run={work:cutting,sequence:{...seq,phase:'cut'}};yield;break;
   }
   safe=arm;if(voxelExact&&['cut','close'].includes(seq.phase)){poses.push({time:oldTime+STEP*i/n,arm:{...arm},phase:seq.phase});if(amount>=384&&seq.phase==='cut'){run={work:{...run.work,arm:{...arm},load:6,action:null,hit:''},sequence:{...seq,phase:'close'}};yield;break;}}yield;
  }
  poses.push({time,arm:{...run.work.arm},phase:run.sequence?.phase??'done'});
 }
 if(run.sequence||!cuts.length||amount>384||Math.abs(run.work.arm.boom-DIG_READY.boom)>1e-8||Math.round(run.work.arm.curl*180/Math.PI)!==24)return null;
 return freeze({...(voxelExact?{kind:bowlSweep?BUCKET_SWEEP_PLAN:TOOTH_VOXEL_PLAN}:{}),amount,duration:time,poses,cuts});
}

function* generatePlan(s,carry=false){
 const original=yield* generate(s,{carry});if(original)return original;
 if(!Object.values(s.frame.soil.blocks).some(b=>b.mask!=='0000000000000000'&&b.mask!=='ffffffffffffffff'))return null;
 // A thin deposited layer is not an occupied 8-cube. Let exact tooth contact
 // start the cut instead of the legacy full-cube candidate. Exact remaining
 // soil, hard ground, body, shell and shafts are still checked at every pose.
 return yield* generate(s,{partialExact:true,carry});
}

// The original 33-degree descent was made for the raised legacy soil plot.
// Native flat ground needs an actual surface-guided insertion of this bowl.
// Every sampled position uses the same hard collision and occupied-grain checks.
function localQuarrySoil(frame){
 const soil=frame.soil;
 if(!hasQuarryMountain(soil))return soil;
 const v=frame.machineVehicle,d=frame.dump;
 const blocks={};
 // The cutter groups already search 200 units, with tracks and their pit
 // probes much closer. Keep the dump's independent support area as well.
 for(const key of Object.keys(soil.blocks)){
  const x=Number(key.slice(0,key.indexOf(',')))*8+4;
  const z=Number(key.slice(key.lastIndexOf(',')+1))*8+4;
  if(Math.abs(x-v.x)<=204&&Math.abs(z-v.z)<=204||Math.abs(x-d.x)<=86&&Math.abs(z-d.z)<=86)
   blocks[key]=soil.blocks[key];
 }
 return {...soil,blocks};
}
const preparationAxes=['curl','stick','boom'];
const surfaceArmRates={boom:.5,stick:.65,curl:.75,slew:.62};
function* surfaceSamples(from,to,start,duration){
 const seconds=duration??Math.max(...axes.map(k=>Math.abs(to[k]-from[k])/surfaceArmRates[k]));
 if(seconds<1e-12)return;
 const samples=Math.max(1,Math.ceil(seconds/STEP),...axes.map(k=>Math.ceil(Math.abs(to[k]-from[k])/.003)));
 const boom=to.boom-from.boom,stick=to.stick-from.stick,curl=to.curl-from.curl,slew=to.slew-from.slew;
 for(let i=1;i<=samples;i++){
  const u=i/samples;
  yield {arm:{boom:from.boom+boom*u,stick:from.stick+stick*u,curl:from.curl+curl*u,slew:from.slew+slew*u},time:start+seconds*i/samples};
 }
}
function* firstSurfaceSamples(arm){
 let time=0;
 for(const key of preparationAxes){
  const to={...arm,[key]:DIG_READY[key]};
  let finalArm=arm;
  for(const step of surfaceSamples(arm,to,time)){yield step;time=step.time;finalArm=step.arm;}
  arm=finalArm;
 }
 yield* surfaceSamples(arm,{...arm,boom:EX.boomMin},time);
}
// At the current pose, start only with the unchanged arm's real sweep.
// The worker will supply the remaining plan, and the first cut always waits
// for ownership. Stop this short path at any possible grain contact.
export function immediateScoopApproach(s){
 if(s.frame.version!==2||!canPlan(s))return [];
 const f=s.frame,work=shovelMachineState(f),poses=[{time:0,arm:f.machineArm}],deadline=performance.now()+10;
 for(const step of firstSurfaceSamples(f.machineArm)){
  if(step.time>.23||!bucket.linkedArmClear(f,step.arm))break;
  const w={...work,arm:step.arm},g=bucketContactGeometry(w,armPose(w));
  const min=g.bounds.min.slice(),max=g.bounds.max.slice();
  for(const part of g.capture)for(let i=0;i<3;i++){min[i]=Math.min(min[i],part.min[i]);max[i]=Math.max(max[i],part.max[i]);}
  const candidates=shovelSoilContactCandidates(f.soil,min[0]-.08,max[0]+.08,min[2]-.08,max[2]+.08,min[1]-.08);
  if(candidates.some(({position:[x,y,z],size,materialId})=>{
   const h=size/2+.08;
   return materialId==='earth-soil'&&x+h>=min[0]&&x-h<=max[0]&&y+h>=min[1]&&y-h<=max[1]&&z+h>=min[2]&&z-h<=max[2];
  }))break;
  poses.push(step);
  if(performance.now()>=deadline&&step.time>=.05)break;
 }
 return poses;
}
const surfaceSources=new WeakMap(),surfaceRegions=new WeakMap();
function regionalCutIndex(soil,vehicle,reusable){
 // Index the local tiles once while the machine is adjusting its position.
 // The exact window is still enforced for this pose, including loose soil.
 const x=Math.floor(vehicle.x/16)*16+8,z=Math.floor(vehicle.z/16)*16+8,key=x+','+z;
 let region=reusable?surfaceRegions.get(soil):null;
 if(region?.key!==key){
  region={key,nearby:indexCutGroups(groups(soil,{x,z},208))};
  if(reusable)surfaceRegions.set(soil,region);
 }
 return boxes=>region.nearby(boxes).filter(({center})=>Math.abs(center[0]-vehicle.x)<=200&&Math.abs(center[2]-vehicle.z)<=200);
}
function surfaceSource(frame,vehicle){
 const {soil,dump}=frame;
 const reusable=isValidatedFrozenSoil(soil)||isCapturedConstructionJson(soil);
 const key=[vehicle.x,vehicle.z,dump.x,dump.z].join(',');
 const previous=reusable?surfaceSources.get(soil):null;
 if(previous?.key===key)return previous;
 const source=localQuarrySoil(frame),nearby=regionalCutIndex(soil,vehicle,reusable);
 const result={key,source,nearby,regionGroups:new Map(),protectedRows:new Map()};
 if(reusable)surfaceSources.set(soil,result);
 return result;
}
// A clipped triangle often only spans a few of a cell's 64 voxels.
// Use its world bounds to find those voxels first. Contact is still
// decided by the existing prism test, including the cutting tolerance.
function cutRow(voxels,{center}){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],grid=[];
 for(const voxel of voxels){
  const p=voxel.box.position;
  for(let axis=0;axis<3;axis++){
   min[axis]=Math.min(min[axis],p[axis]-1-.08);max[axis]=Math.max(max[axis],p[axis]+1+.08);
  }
  const x=Math.round((p[0]-center[0]+3)*.5),y=Math.round((p[1]-center[1]+3)*.5),z=Math.round((p[2]-center[2]+3)*.5);
  grid[x+y*4+z*16]=voxel;
 }
 return {voxels,min,max,grid};
}
function collectCutVoxels(row,parts,{center:[x,y,z]},limit,scratch){
 if(row.voxels.length<10){
  const hits=[];
  for(const voxel of row.voxels)if(somePartCuts(parts,voxel.box)){
   hits.push(voxel);if(hits.length===limit)break;
  }
  return hits;
 }
 scratch.fill(0);
 // Expand outwards at fractional cell boundaries. This can only add
 // a candidate. The same narrow-phase check below resolves the edge.
 const margin=1.08+1e-8;
 for(const part of parts){
  const {min,max}=part;
  const x0=Math.max(0,Math.ceil((min[0]-x+3-margin)*.5)),x1=Math.min(3,Math.floor((max[0]-x+3+margin)*.5));
  const y0=Math.max(0,Math.ceil((min[1]-y+3-margin)*.5)),y1=Math.min(3,Math.floor((max[1]-y+3+margin)*.5));
  const z0=Math.max(0,Math.ceil((min[2]-z+3-margin)*.5)),z1=Math.min(3,Math.floor((max[2]-z+3+margin)*.5));
  for(let k=z0;k<=z1;k++)for(let j=y0;j<=y1;j++)for(let i=x0;i<=x1;i++){
   const index=i+j*4+k*16,voxel=row.grid[index];
   if(!voxel||scratch[index])continue;
   const [vx,vy,vz]=voxel.box.position;
   if(prismTouchesCube(part,vx,vy,vz,1,.08))scratch[index]=1;
  }
 }
 // Preserve the original order of assigned cuts and the bucket capacity.
 const hits=[];
 for(let index=0;index<64;index++)if(scratch[index]){
  hits.push(row.grid[index]);if(hits.length===limit)break;
 }
 return hits;
}
function* generateSurfacePlan(s,carry=false,summitDraw=0,aimed=false,sharedStart=null,mustExceed=0){
 if(s.mode!=='excavating'||s.scoop||s.link||s.unload||s.frame.job||s.frame.soil.pending||s.frame.soil.containers.bucket.amount)return null;
 const start=sharedStart?.state;
 if(start===null)return null;
 const work=shovelMachineState(s.frame);
 const survey=sharedStart?.survey??surfaceSource(s.frame,work.loader.vehicle);
 if(sharedStart)sharedStart.survey=survey;
 const {source,nearby,regionGroups,protectedRows}=survey;
 const probe=sharedStart?.probe??bucket.createLinkedArmSweepProbe(s.frame);
 if(sharedStart)sharedStart.probe=probe;
 const rows=new Map(start?.rows),cuts=start?.cuts.slice()??[],poses=start?.poses.slice()??[{time:0,arm:{...work.arm},phase:'prepare'}];
 let arm={...(start?.arm??work.arm)},remaining=start?.remaining??source;
 let amount=start?.amount??0,time=start?.time??0,changedSupport=start?.changedSupport??false;
 const localBoxes=new Map(),voxelBoxes=new Map(),cutScratch=new Uint8Array(64),vehicle=work.loader.vehicle;
 // Most cuts are well away from the tracks. Keep only the changed cells
 // while testing those poses. Materialize terrain for the full support
 // check whenever a cut can affect it.
 const edits=new Map(start?.edits);
 function currentBlock(group){
  const edited=edits.get(group);
  if(edited!==undefined)return edited;
  return group.from==='terrain'?source.blocks[group.id]:source.loose[group.id];
 }
 function terrainWithEdits(soil,groups){
  let {blocks,loose}=soil;
  for(const group of groups){
   const changed=edits.get(group);
   if(group.from==='terrain'){
    if(blocks===soil.blocks)blocks={...blocks};
    if(changed)blocks[group.id]=changed;else delete blocks[group.id];
   }else{
    if(loose===soil.loose)loose={...loose};
    loose[group.id]=changed;
   }
  }
  return blocks===soil.blocks&&loose===soil.loose?soil:{...soil,blocks,loose};
 }
 function groupsIn(min,max){
  const x0=Math.floor((min[0]-.08)/16),y0=Math.floor((min[1]-.08)/16),z0=Math.floor((min[2]-.08)/16);
  const x1=Math.floor((max[0]+.08)/16),y1=Math.floor((max[1]+.08)/16),z1=Math.floor((max[2]+.08)/16);
  const key=x0+','+y0+','+z0+','+x1+','+y1+','+z1;
  let groups=regionGroups.get(key);
  if(!groups){
   if(regionGroups.size>=384)regionGroups.delete(regionGroups.keys().next().value);
   groups=nearby([{min,max}]).filter(group=>group.materialId==='earth-soil');regionGroups.set(key,groups);
  }
  return groups;
 }
 const supportRadius=source===s.frame.soil?97.5:80;
 function boxMayTouch({min,max},x,y,z,h){
  return min[0]<=x+h&&max[0]>=x-h&&min[1]<=y+h&&max[1]>=y-h&&min[2]<=z+h&&max[2]>=z-h;
 }
 // Curling moves the bowl. The boom stays in place, and the stick
 // only moves on some samples. Reuse exact shaft contacts while both
 // endpoints and the occupied voxels in a cell remain identical.
 function shaftSweep(){
  const bounds={min:[0,0,0],max:[0,0,0]},touches=new Map();
  let start,end;
  function set(a,b){
   if(start&&a[0]===start[0]&&a[1]===start[1]&&a[2]===start[2]&&
     b[0]===end[0]&&b[1]===end[1]&&b[2]===end[2])return;
   start=a;end=b;touches.clear();
   for(let axis=0;axis<3;axis++){
    bounds.min[axis]=Math.min(a[axis],b[axis])-2.8-1e-8;
    bounds.max[axis]=Math.max(a[axis],b[axis])+2.8+1e-8;
   }
  }
  function intersects(group,boxes,sweepBounds){
   let checked=touches.get(group);
   if(checked?.boxes!==boxes){
    // The whole-cell rejection depends only on these shaft endpoints.
    const edge=4.00000001,outer=group.amount!==64&&{position:group.center,half:[edge,edge,edge]};
    const hits=outer&&!shovelSegmentHits(start,end,outer,2.8)?[]:boxes.filter(box=>{
     const [x,y,z]=box.position,h=box.size/2;
     return boxMayTouch(bounds,x,y,z,h)&&shovelSegmentHits(start,end,box,2.8);
    });
    checked={boxes,hits};touches.set(group,checked);
   }
   return checked.hits.some(({position:[x,y,z],size})=>boxMayTouch(sweepBounds,x,y,z,size/2));
  }
  return {bounds,set,intersects};
 }
 const boom=shaftSweep(),stick=shaftSweep();
 function earthClear({geometry:g,joints,min,max}){
  const candidates=groupsIn(min,max);
  if(!candidates.length)return true;
  const bounds=g.bounds,[limbA,limbB,limbC]=joints;
  boom.set(limbA,limbB);stick.set(limbB,limbC);
  const sweepBounds={min,max};
  for(const group of candidates){
   const [cx,cy,cz]=group.center,edge=4.00000001;
   const besideBoom=boxMayTouch(boom.bounds,cx,cy,cz,edge),besideStick=boxMayTouch(stick.bounds,cx,cy,cz,edge);
   const besideBucket=boxMayTouch(bounds,cx,cy,cz,edge);
   if(!besideBoom&&!besideStick&&!besideBucket)continue;
   const item=edits.get(group);
   if(item===null||item?.mask==='0000000000000000')continue;
   const old=item&&localBoxes.get(group);
   let boxes=item===undefined?group.boxes:old?.mask===item.mask?old.boxes:null;
   if(!boxes){
    // A cut changes the occupancy bits, while the sixty-four possible
    // positions in this cell stay fixed for the whole stroke.
    let voxels=voxelBoxes.get(group);
    if(!voxels){
     const cell=group.from==='terrain'?group.id.split(',').map(Number):null;
     voxels=fullBlockIndices.map(i=>{
      const offset=[i%4,Math.floor(i/4)%4,Math.floor(i/16)];
      const position=offset.map((n,k)=>cell?cell[k]*8+n*2+1:item.position[k]-3+n*2);
      return {position,size:2,materialId:group.materialId};
     });
     voxelBoxes.set(group,voxels);
    }
    const occupied=BigInt('0x'+item.mask);
    boxes=voxels.filter((_,i)=>(occupied&voxelBits[i])!==0n);
    localBoxes.set(group,{mask:item.mask,boxes});
   }
   if(besideBoom&&boom.intersects(group,boxes,sweepBounds)||
      besideStick&&stick.intersects(group,boxes,sweepBounds))return false;
   if(!besideBucket||!g.mayTouchBox(cx,cy,cz,edge,edge,edge))continue;
   const solids=g.all.filter(part=>boxMayTouch(part,cx,cy,cz,edge));
   if(!solids.length)continue;
   for(const box of boxes){
    const [x,y,z]=box.position,h=box.size/2;
    if(!boxMayTouch(bounds,x,y,z,h)||!g.mayTouchBox(x,y,z,h,h,h))continue;
    for(const part of solids)if(prismTouchesCube(part,x,y,z,h))return false;
   }
  }return true;
 }
 function accept(a,cutting,at,phase){
  if(a.boom<EX.boomMin||a.boom>EX.boomMax||a.stick<-2.55||a.stick>DIG_READY.stick+1e-8||a.curl<-1.25||a.curl>1.1||Math.abs(a.slew)>EX.slewLimit)return 'hard';
  const contact=probe(a);
  if(!contact)return 'hard';
  let taken=amount;
  const changes=[],records=[],g=contact.geometry;
  if(cutting&&taken<384){
   const captureBounds=g.cutBounds,cutEdge=4.08000001;
   let parts;
   for(const group of groupsIn(captureBounds.min,captureBounds.max)){
    if(taken>=384)break;
    const [x,y,z]=group.center;
    if(!boxMayTouch(captureBounds,x,y,z,cutEdge))continue;
    let row=rows.get(group)??protectedRows.get(group);
    if(row){
     // During closure the lip often revisits already cut cells. A box
     // around the remaining eligible soil rejects those empty samples.
     const {min,max}=row,lo=captureBounds.min,hi=captureBounds.max;
     if(max[0]<lo[0]||min[0]>hi[0]||max[1]<lo[1]||min[1]>hi[1]||max[2]<lo[2]||min[2]>hi[2])continue;
    }
    if(!g.mayTouchBox(x,y,z,cutEdge,cutEdge,cutEdge,true))continue;
    parts??=[...g.all,...g.capture];
    const overlapping=parts.filter(part=>boxMayTouch(part,x,y,z,cutEdge));
    if(!overlapping.length)continue;
    if((!row||group.amount===64)&&!cutTouchesAnyBox(overlapping,group.boxes))continue;
    if(!row){
     row=cutRow(groupVoxels(source,group).filter(v=>!transportDigProtection(s.frame,v.box.position[0],v.box.position[2],1)),group);
     protectedRows.set(group,row);
    }
    rows.set(group,row);
    const before=row.voxels,hit=collectCutVoxels(row,overlapping,group,384-taken,cutScratch);
    if(!hit.length)continue;
    const positions=hit.map(v=>v.p),previousEdit=edits.get(group);
    edits.set(group,clearBlockVoxels(currentBlock(group),group,positions));
    taken+=hit.length;
    changes.push({group,before,hit,previousEdit});
    records.push({from:group.from,id:group.id,positions,boxes:hit.map(v=>v.box),time:at});
   }
  }
  // Shafts, protected soil and every grain left outside the real bucket remain
  // solid. A failed pose commits none of its candidate cuts.
  // Full track/radius samples are inside 41×35 from the center. The depression
  // probe adds at most 24 units. Keep 80 including the edited two-unit cube.
  const nearSupport=changedSupport||changes.some(c=>c.hit.some(v=>Math.hypot(v.box.position[0]-vehicle.x,v.box.position[2]-vehicle.z)<supportRadius));
  const soil=nearSupport?terrainWithEdits(remaining,changedSupport?changes.map(c=>c.group):edits.keys()):remaining;
  if(nearSupport?!bucket.linkedArmClear({...s.frame,machineArm:a,soil}):!earthClear(contact)){
   for(const {group,previousEdit} of changes){
    if(previousEdit===undefined)edits.delete(group);else edits.set(group,previousEdit);
   }
   return 'soil';
  }
  remaining=soil;amount=taken;changedSupport=nearSupport;for(const c of changes){const hit=new Set(c.hit);rows.set(c.group,cutRow(c.before.filter(v=>!hit.has(v)),c.group));}cuts.push(...records);arm={...a};poses.push({time:at,arm:{...a},phase});return '';
 }
 function* segment(to,phase,{cutting=false,stop=null,duration=null}={}){
  for(const {arm:pose,time:at} of surfaceSamples({...arm},to,time,duration)){
   const reason=accept(pose,cutting,at,phase);if(reason)return reason;time=at;
   yield amount===0?poses.at(-1):null;
   if(stop?.(arm)||time>=45||amount>=384&&phase==='lower')return 'stopped';
  }return '';
 }
 if(!start){
  // All automatic strokes share the same preparation and first contact.
  // Keep that exact result when trying a different draw length.
  if(sharedStart)sharedStart.state=null;
  for(const name of aimed?['curl']:preparationAxes){
   const target={...arm,[name]:DIG_READY[name]};
   if(yield* segment(target,'prepare'))return null;
  }
  const descent=yield* segment({...arm,boom:EX.boomMin},'lower',{cutting:true,stop:()=>amount>0});
  if(!amount||descent==='hard'&&!bucket.linkedArmHardClear({
   ...s.frame,soil:changedSupport?remaining:terrainWithEdits(remaining,edits.keys())
  },arm))return null;
  if(sharedStart){
   sharedStart.state={arm,remaining,amount,time,changedSupport,rows:new Map(rows),edits:new Map(edits),cuts:cuts.slice(),poses:poses.slice()};
  }
 }
 yield* segment({...arm,stick:Math.max(-2.55,arm.stick-(summitDraw||.22)),curl:Math.min(24*Math.PI/180,arm.curl+.95)},'cut',{cutting:true,duration:1.6});
 // Retain an open, 12-degree carrying bowl within the unchanged 24-degree
 // mechanical stop. If the bowl meets its freshly cut
 // edge, the same bounded stick clearance used by the original action applies.
 let guard=0;const close=12*Math.PI/180;
 while(Math.abs(arm.curl-close)>1e-8&&guard++<700){
  const target={...arm,curl:Math.min(close,arm.curl+.003)},reason=yield* segment(target,'close',{cutting:true});
  if(reason){if(arm.stick>=DIG_READY.stick-1e-8)return null;const clear=yield* segment({...arm,stick:Math.min(DIG_READY.stick,arm.stick+.006)},'close',{cutting:true});if(clear)return null;}
 }
 // Lifting cannot add soil. A shorter stroke which can no longer win
 // does not need a lift plan. Any adopted stroke still checks every pose.
 if(Math.abs(arm.curl-close)>1e-8||amount<=mustExceed)return null;
 if(carry){
  // Lift out of the cut while retracting the stick, keeping the bowl level.
  // Move the physical joints through every intermediate contact sample.
  const lift=Math.min(.20,Math.max(0,carryArm.boom-arm.boom));
  if(lift&& (yield* segment({...arm,boom:arm.boom+lift,stick:arm.stick-lift},'lift')))return null;
  if(yield* segment({...arm,...carryArm},'lift'))return null;
 }else if(yield* segment({...arm,boom:DIG_READY.boom},'lift'))return null;
 if(!amount||time>45||poses.length>2800||cuts.length>384)return null;
 return freeze({kind:aimed?AIMED_SWEEP_PLAN:summitDraw?SUMMIT_SWEEP_PLAN:carry?SURFACE_SWEEP_PLAN:PRIOR_SURFACE_PLAN,amount,duration:time,poses,cuts});
}

function* generateFinePlan(s){return yield* generate(s,{partialExact:true,voxelExact:true,bowlSweep:true});}
function* generateBasin(s,legacy=false,fine=false,surface=false,protect=false){
 // Survey a few nearby upper-body directions; keep the crawler stationary.
 // Every candidate is the existing swept-tooth excavation, not a rectangular
 // deletion. The broad area is bounded to one bucket's actual capacity.
 let best=null;const start=s.frame.machineArm;
 for(const offset of[0,-.2,.2]){
  const arm={...start,slew:start.slew+offset};if(Math.abs(arm.slew)>EX.slewLimit)continue;
  const count=Math.ceil(Math.abs(offset)/(.62*STEP)),aim=[];let safe=true;
  for(let i=0;i<=count;i++){const a=lerp(start,arm,count?i/count:0);if(!bucket.linkedArmClear(s.frame,a)){safe=false;break;}aim.push({time:i*STEP,arm:a,phase:'aim'});yield;}
  if(!safe)continue;
  const known=surface&&offset===0?cache.get(s.frame.soil):null;
  const p=known?.key===scoopKey(s,PRIOR_SURFACE_PLAN)?known.plan:yield* (surface?generateSurfacePlan:fine?generateFinePlan:generatePlan)({...s,frame:{...s.frame,machineArm:arm}});if(!p||protect&&p.cuts.some(c=>c.boxes.some(b=>transportDigProtection(s.frame,b.position[0],b.position[2],b.size/2)))||(legacy?p.cuts.some(c=>c.from!=='terrain'||c.positions.some(q=>q[1]<-4||q[1]>=0)):!retainingBasinCut(s.frame,p,nativeDumpHeightReader(s.frame))))continue;
  const delay=count*STEP,plan={...p,kind:surface?'basin-v4':fine?'basin-v3':legacy?'basin':protect?'basin-v5':'basin-v2',duration:p.duration+delay,poses:[...aim.slice(0,-1),...p.poses.map(q=>({...q,time:q.time+delay}))],cuts:p.cuts.map(c=>({...c,time:c.time+delay}))};
  if(plan.duration>45)continue;
  if(!best||plan.amount>best.amount)best=plan;if(best.amount>=256||surface)break;
 }
 return best?freeze(best):null;
}
function key(s,ignoreSlew=false){
 const {machineArm,machineVehicle,dump,decks}=s.frame;
 return canonical([ignoreSlew?{...machineArm,slew:0}:machineArm,machineVehicle??null,dump,decks??null,s.mode]);
}
const canPlan=s=>s.mode==='excavating'&&!s.scoop&&!s.link&&!s.unload&&!s.frame.job&&!s.frame.soil.pending&&!s.frame.soil.containers.bucket.amount&&excavatorWorkSupported(s.frame);
const replayTerrainKeys=new WeakMap();
const terrainTransitions=new Set([
 'open-ground','open-cut-bank','open-cut-ridge','open-quarry-mountain','open-quarry-range',
 'surface-quarry-slopes','open-summit-face','relocate-earth-storage'
]);
function replayKey(s){
 const f=s.frame,soil=f.soil,immutable=isValidatedFrozenSoil(soil)||isCapturedConstructionJson(soil);
 let terrain=immutable?replayTerrainKeys.get(soil):null;
 if(!terrain){
  terrain=canonical([soil.initial,soil.site,soil.field??null,
   soil.journal.filter(command=>terrainTransitions.has(command.type)),
   soil.blocks,soil.loose,soil.containers.dump]);
  if(immutable)replayTerrainKeys.set(soil,terrain);
 }
 return terrain+':'+key(s);
}
const scoopKey=(s,kind)=>kind+':'+key(s);
function scoopKind(s){
 const {frame}=s;
 if(frame.version!==2)return 'legacy-tooth';
 if(!hasSummitFace(frame.soil))return SURFACE_SWEEP_PLAN;
 const [ox,oz]=frame.soil.field.origin,v=frame.machineVehicle;
 const bench=quarryRangeSummitBench(frame.soil.field.corner);
 const x=v.x+ox,z=v.z+oz;
 return x>=bench.minX-100&&x<=bench.maxX+100&&z>=bench.minZ-120&&z<=bench.maxZ+120?SUMMIT_SWEEP_PLAN:SURFACE_SWEEP_PLAN;
}
// The real input step gives the closest forward aim and the next aim
// past it. These snapshots are used only for read-only collision checks.
export function summitForwardScoopPoses(s){
 if(scoopKind(s)!==SUMMIT_SWEEP_PLAN)return [];
 const {frame}=s,arm=frame.machineArm;
 const direction=Math.sign(arm.slew);
 let slew=arm.slew;
 for(let i=0;i<20;i++){
  const next=bucket.bucketSlewAngle(slew,direction,STEP);
  if(Math.abs(next)>=Math.abs(slew)){
   if(slew===arm.slew)return [];
   return [slew,next].map(angle=>({...s,frame:{...frame,machineArm:{...arm,slew:angle}}}));
  }
  slew=next;
 }
 return [];
}
export function sameScoopPreviewPose(a,b,ignoreSlew=false){
 return a.frame.soil===b.frame.soil&&key(a,ignoreSlew)===key(b,ignoreSlew);
}
function* settleScoopCandidate(local,parallel){
 while(parallel?.value===undefined){
  const step=local.next();
  if(step.done)return step.value;
  yield step.value;
 }
 return freeze(parallel.value);
}
function* generateSummitExtended(s,start,short){
 // Both longer paths keep the same exact closing and lift checks. Their
 // original order still breaks ties in favor of the deeper stroke.
 const deep=yield* generateSurfacePlan(s,true,.50,false,start);
 if(deep?.amount===384)return deep;
 const shorter=yield* settleScoopCandidate(generateSurfacePlan(s,true,.36,false,start,deep?.amount??0),short);
 return shorter&&(!deep||shorter.amount>deep.amount)?shorter:deep;
}
function* generateScoop(s,kind,sharedStart=null,alternatives=null){
 if(kind===AIMED_SWEEP_PLAN)return yield* generateSurfacePlan(s,true,.30,true);
 if(kind===SUMMIT_SWEEP_PLAN){
  const start={};
  const best=yield* settleScoopCandidate(generateSummitExtended(s,start,alternatives?.short),alternatives?.extended);
  if(best?.amount>=192)return best;
  // The independent worker has the same terrain and pose. If it has
  // not finished, keep evaluating the normal path on this thread.
  const usual=yield* settleScoopCandidate(generateScoop(s,SURFACE_SWEEP_PLAN,start),alternatives?.standard);
  return usual&&(!best||usual.amount>best.amount)?usual:best;
 }
 if(kind===SURFACE_SWEEP_PLAN||kind===PRIOR_SURFACE_PLAN){const surface=yield* generateSurfacePlan(s,kind===SURFACE_SWEEP_PLAN,0,false,sharedStart);if(surface)return surface;}
 const original=yield* generatePlan(s,kind===SURFACE_SWEEP_PLAN);
 return original&&original.cuts.every(c=>c.boxes.every(b=>!transportDigProtection(s.frame,b.position[0],b.position[2],b.size/2)))?original:null;
}
const surfaceReplays=new Map();
function usesSurfaceReplay(s,kind){
 return (kind===SURFACE_SWEEP_PLAN||kind===PRIOR_SURFACE_PLAN||kind===SUMMIT_SWEEP_PLAN||kind===AIMED_SWEEP_PLAN)&&isValidatedFrozenSoil(s.frame.soil)&&typeof WeakRef==='function';
}
function recentScoopPlan(s,k,kind){
 const soil=s.frame.soil,local=cache.get(soil);
 if(local?.key===k)return local;
 if(usesSurfaceReplay(s,kind)){
  const recent=surfaceReplays.get(k),prior=recent?.soil.deref();
  // Compare full geometry only if someone already checked this exact pose.
  if(prior&&(prior===soil||replayKey(s)===replayKey({...s,frame:{...s.frame,soil:prior}})))
   return {plan:rememberPlan(s,k,recent.plan,kind)};
 }
 // Preview and reservation may represent the same exact terrain with
 // different validation identities after the worker takes ownership.
 const stamp=kind+':'+replayKey(s);
 return replayPlans.has(stamp)?{plan:rememberPlan(s,k,replayPlans.get(stamp),kind)}:null;
}
function rememberPlan(s,k,plan,kind){
 const soil=s.frame.soil;
 cache.set(soil,{key:k,plan});
 if(usesSurfaceReplay(s,kind)){
  surfaceReplays.delete(k);
  surfaceReplays.set(k,{soil:new WeakRef(soil),plan});
  if(kind===SUMMIT_SWEEP_PLAN&&plan?.kind===SURFACE_SWEEP_PLAN)surfaceReplays.set(scoopKey(s,SURFACE_SWEEP_PLAN),{soil:new WeakRef(soil),plan});
  while(surfaceReplays.size>8)surfaceReplays.delete(surfaceReplays.keys().next().value);
 }else{
  const stamp=kind+':'+replayKey(s);
  replayPlans.delete(stamp);replayPlans.set(stamp,plan);
  if(kind===SUMMIT_SWEEP_PLAN&&plan?.kind===SURFACE_SWEEP_PLAN)replayPlans.set(SURFACE_SWEEP_PLAN+':'+replayKey(s),plan);
  while(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);
 }
 return plan;
}
// Atomic save/readback clones the soil. Reuse only a previously checked path
// with the same source, occupied geometry, cargo, vehicle and starting arm.
// Journal and revision still undergo the full ownership audit below.
function replayPlan(s,kind){
 if(kind==='basin'){const k='legacy-basin:'+replayKey(s);if(replayPlans.has(k))return replayPlans.get(k);const it=generateBasin(s,true);let n;do{n=it.next();}while(!n.done);replayPlans.set(k,n.value);if(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);return n.value;}
 if(kind==='basin-v4'||kind==='basin-v5'){
  const k='preserved-'+kind+':'+replayKey(s);if(replayPlans.has(k))return replayPlans.get(k);
  const it=kind==='basin-v5'?generateBasin(s,false,false,false,true):generateBasin(s,false,true,true);let n;do{n=it.next();}while(!n.done);
  replayPlans.set(k,n.value);if(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);return n.value;
 }
 if(kind===SURFACE_SWEEP_PLAN||kind===PRIOR_SURFACE_PLAN||kind===SUMMIT_SWEEP_PLAN||kind===AIMED_SWEEP_PLAN)return checkedScoopPlan(s,kind);
 if(kind==='basin-v3'||kind===BUCKET_SWEEP_PLAN){const k='preserved-'+kind+':'+replayKey(s);if(replayPlans.has(k))return replayPlans.get(k);const it=kind==='basin-v3'?generateBasin(s,false,true):generateFinePlan(s);let n;do{n=it.next();}while(!n.done);replayPlans.set(k,n.value);if(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);return n.value;}
 if(kind==='basin-v2'||kind===TOOTH_VOXEL_PLAN){const k='preserved-'+kind+':'+replayKey(s);if(replayPlans.has(k))return replayPlans.get(k);const it=kind==='basin-v2'?generateBasin(s,false,false):generate(s,{partialExact:true,voxelExact:true,allowProtected:true});let n;do{n=it.next();}while(!n.done);replayPlans.set(k,n.value);if(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);return n.value;}
 const k='legacy-tooth:'+replayKey(s);if(replayPlans.has(k))return replayPlans.get(k);const it=generatePlan(s);let n;do{n=it.next();}while(!n.done);replayPlans.set(k,n.value);if(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);return n.value;
}
function* generateAvailableBasin(s){
 // The retaining-hole tool has its own established sweep and water check.
 // The normal surface scoop can leave cuts that do not hold water.
 const retaining=yield* generateBasin(s,false,false,false,true);
 return retaining??(yield* generateBasin(s,false,true,true,true));
}
function rememberBasin(s,k,plan){basinCache.set(s.frame.soil,{key:k,plan});const replay=replayKey(s),stamp='available-basin:'+replay;
 if(plan?.kind)replayPlans.set('preserved-'+plan.kind+':'+replay,plan);replayPlans.delete(stamp);replayPlans.set(stamp,plan);if(replayPlans.size>8)replayPlans.delete(replayPlans.keys().next().value);return plan;}
function checkPreviewSignal(signal){if(signal?.aborted)throw new DOMException('土の確認を中止しました。','AbortError');}
async function sharedScoopPlan(s,basin,signal,onApproach,aimed=false){
 // Planning and the later full save check use one worker, retaining its exact
 // geometric replay cache. This result is a preview, never a save receipt.
 checkPreviewSignal(signal);
 const abort=new AbortController(),cancel=()=>abort.abort(),timer=setTimeout(cancel,30000);
 signal?.addEventListener('abort',cancel,{once:true});
 try{return await runWorldSaveTask('scoop-plan',{work:s,basin,aimed},{signal:abort.signal,onProgress:onApproach});}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}
export function basinScoopPlan(s){if(!canPlan(s))return null;const k=key(s),old=basinCache.get(s.frame.soil);if(old?.key===k)return old.plan;const stamp='available-basin:'+replayKey(s);if(replayPlans.has(stamp))return rememberBasin(s,k,replayPlans.get(stamp));const it=generateAvailableBasin(s);let n;do{n=it.next();}while(!n.done);return rememberBasin(s,k,n.value);}
export async function basinScoopPlanAsync(s,yieldFrame=()=>new Promise(r=>setTimeout(r,0)),{signal}={}){
 checkPreviewSignal(signal);
 if(!canPlan(s))return null;const k=key(s),old=basinCache.get(s.frame.soil);if(old?.key===k)return old.plan;const stamp='available-basin:'+replayKey(s);if(replayPlans.has(stamp))return rememberBasin(s,k,replayPlans.get(stamp));
 let plan;if(typeof document!=='undefined'&&typeof Worker==='function'){
  plan=await sharedScoopPlan(s,true,signal);
 }else{const it=generateAvailableBasin(s);let n,count=0,time=performance.now();do{n=it.next();if(!n.done&&(++count>=32||performance.now()-time>=6)){await yieldFrame();checkPreviewSignal(signal);count=0;time=performance.now();}}while(!n.done);plan=n.value;}
 plan=plan?freeze(plan):null;return rememberBasin(s,k,plan);
}
export function scoopDumpPlan(s,aimed=false){return checkedScoopPlan(s,aimed?AIMED_SWEEP_PLAN:scoopKind(s));}
function checkedScoopPlan(s,kind){
 if(!canPlan(s))return null;
 const k=scoopKey(s,kind),old=recentScoopPlan(s,k,kind);
 if(old)return old.plan;
 const it=generateScoop(s,kind);let n;
 do{n=it.next();}while(!n.done);
 return rememberPlan(s,k,n.value,kind);
}
export async function scoopDumpPlanAsync(s,yieldFrame=()=>new Promise(r=>setTimeout(r,0)),{signal,onApproach,aimed=false,runAlternatives,sliceMs=8}={}){
 checkPreviewSignal(signal);
 if(!canPlan(s))return null;
 const kind=aimed?AIMED_SWEEP_PLAN:scoopKind(s),k=scoopKey(s,kind),old=recentScoopPlan(s,k,kind);
 if(old)return old.plan;
 if(typeof document!=='undefined'&&typeof Worker==='function'){
  const plan=await sharedScoopPlan(s,false,signal,onApproach,aimed);
  return rememberPlan(s,k,freeze(plan),kind);
 }
 return checkScoopPlanAsync(s,kind,yieldFrame,{signal,onApproach:aimed?null:onApproach,runAlternatives,sliceMs});
}
async function checkScoopPlanAsync(s,kind,yieldFrame,{signal,onApproach,runAlternatives,sliceMs}){
 checkPreviewSignal(signal);
 if(!canPlan(s))return null;
 const k=scoopKey(s,kind),old=recentScoopPlan(s,k,kind);
 if(old)return old.plan;
 const alternatives=kind===SUMMIT_SWEEP_PLAN?runAlternatives?.(s):null;
 const plan=await runScoopPlanner(generateScoop(s,kind,null,alternatives),s,yieldFrame,{signal,onApproach,sliceMs});
 return rememberPlan(s,k,plan,kind);
}
async function runScoopPlanner(it,s,yieldFrame,{signal,onApproach,sliceMs=18}){
 const poses=onApproach?[{time:0,arm:s.frame.machineArm}]:[];
 let n,slice=performance.now();
 do{
  n=it.next();
  if(!n.done&&n.value&&onApproach)poses.push(n.value);
  if(!n.done&&performance.now()-slice>=sliceMs){
   if(poses.length)onApproach(poses.splice(0));
   await yieldFrame();checkPreviewSignal(signal);
   slice=performance.now();
  }
 }while(!n.done);
 if(poses.length)onApproach(poses);
 return n.value;
}
// Read-only candidates have the same exact sweep and the usual fallback.
export function summitScoopCandidate(s,variant,yieldFrame,signal){
 if(!canPlan(s)||scoopKind(s)!==SUMMIT_SWEEP_PLAN)return null;
 const it=variant==='short'?generateSurfacePlan(s,true,.36):
  variant==='extended'?generateSummitExtended(s,{}):generateScoop(s,SURFACE_SWEEP_PLAN);
 return runScoopPlanner(it,s,yieldFrame,{signal});
}
function segments(plan){return plan.cuts.map(c=>({from:c.from,positions:c.positions,...(c.from==='loose'?{looseId:c.id}:{})}));}
export function scoopPoseAt(plan,time){const poses=plan.poses;for(let i=1;i<poses.length;i++)if(time<=poses[i].time){const a=poses[i-1],b=poses[i];return lerp(a.arm,b.arm,(time-a.time)/(b.time-a.time));}return{...poses.at(-1).arm};}
export function scoopVisual(s){const j=s.scoop;if(!j)return{bucket:s.frame.soil.containers.bucket.amount,source:[],progress:0,phase:null};const collected=j.plan.cuts.filter(c=>c.time<=j.elapsed+1e-10).reduce((n,c)=>n+c.positions.length,0),phase=j.plan.poses.find(p=>p.time>=j.elapsed)?.phase??'done';return{bucket:collected,source:j.plan.cuts.filter(c=>c.time>j.elapsed+1e-10).flatMap(c=>c.boxes),progress:j.elapsed/j.plan.duration,phase};}
export function createScoopDumpWork(source){
 const b=createDumpWork(source),w=shovelMachineState(b.frame);check(w.digMode==='tooth-contact-v1'&&!b.frame.soil.containers.bucket.amount,'停止した空バケットの現行接触掘削記録が必要です。');
 const p=localToWorld(w.loader.vehicle,80,13),frame={...b.frame,dump:{x:p.x,z:p.z,heading:w.loader.vehicle.heading},machineArm:{...w.arm}},door=excavatorAccessPath(w.loader.vehicle,frame.machineArm.slew,-1)[0];frame.player={...frame.player,...door,heading:Math.atan2(Math.sin(door.heading),Math.cos(door.heading)),travel:0};
 return validateScoopDumpWork(lift({...b,frame,link:null}));
}
export const startScoopDump=(s,operationId)=>startPlannedScoop(s,operationId,false);
export const startAimedScoop=(s,operationId)=>startPlannedScoop(s,operationId,false,true);
export const startBasinScoop=(s,operationId)=>startPlannedScoop(s,operationId,true);
function startPlannedScoop(s,operationId,basin,aimed=false){
 check(excavatorWorkSupported(s.frame),'履帯を支える地面がないよ。安全な地面へ停め直そう。');
 assertIdle(s);check(typeof operationId==='string'&&/^[a-zA-Z0-9_-]{1,55}$/.test(operationId),'操作番号が不正です。');check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の履歴が上限です。土を保持します。');
 const plan=basin?basinScoopPlan(s):scoopDumpPlan(s,aimed);check(plan,basin?'穴を掘れる地面へ向けよう。平らな地面で、車や建物から離してね。':'爪が届く土がないか、通り道がふさがっています。位置・向きを変えてください。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve-batch',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,to:'bucket',materialId:'earth-soil',segments:segments(plan)});
 certificates.set(plan,{soil,soilKey:isValidatedFrozenSoil(soil)?null:canonical(soil),dump:canonical([s.frame.dump,s.frame.machineVehicle??null,s.frame.decks??null])});
 return next(s,{...s.frame,soil},{scoop:{id:operationId,plan,elapsed:0,returning:false}});
}
export function scoopApproachFrame(frame,plan,elapsed){
 const pose={...frame,machineArm:scoopPoseAt(plan,elapsed)};
 pose.player=bucket.linkedExcavatorSeat(pose);
 return pose;
}
export function progressScoopDump(s,dt){
 check(s.scoop&&finite(dt,0,.05),'進行時間が不正です。');
 const j=s.scoop,elapsed=j.returning?Math.max(0,j.elapsed-dt):Math.min(j.plan.duration,j.elapsed+dt);
 return next(s,scoopApproachFrame(s.frame,j.plan,elapsed),{scoop:{...j,elapsed}});
}
export function confirmScoopApproach(s,elapsed){
 const j=s.scoop;
 check(j&&!j.returning&&finite(elapsed,j.elapsed,j.plan.cuts[0].time-1e-6),'掘削前の動作を確認できません。');
 return next(s,scoopApproachFrame(s.frame,j.plan,elapsed),{scoop:{...j,elapsed}});
}
export const scoopDumpReady=s=>!!s.scoop&&(s.scoop.returning?s.scoop.elapsed===0:s.scoop.elapsed===s.scoop.plan.duration);
export function cancelScoopDump(s){check(s.scoop&&s.scoop.elapsed<s.scoop.plan.cuts[0].time,'すくい始めた土は戻せません。メニューで一時停止し、続きから再開できます。');return next(s,s.frame,{scoop:{...s.scoop,returning:true}});}
export function finishScoopDump(s){
 check(scoopDumpReady(s),'動作が終わるまでお待ちください。');
 const {id,returning}=s.scoop,prior=s.frame.soil,rev=prior.revision;
 const soil=returning?soilTransportCommand(prior,{type:'cancel',id:id+'_cancel',expectedRevision:rev,transferId:id}):
  soilTransportCommands(prior,[
   {type:'release',id:id+'_release',expectedRevision:rev,transferId:id},
   {type:'complete',id:id+'_complete',expectedRevision:rev+1,transferId:id},
  ]);
 return validateScoopDumpWork(next(s,{...s.frame,soil},{scoop:null}));
}
function completedAuditSoil(soil,p){
 return soilTransportCommands(soil,[
  {type:'release',id:p.id+'_audit_release',expectedRevision:soil.revision,transferId:p.id},
  {type:'complete',id:p.id+'_audit_complete',expectedRevision:soil.revision+1,transferId:p.id}
 ]);
}
function projections(s){
 const soil=s.frame.soil,identity=shadowCache.get(soil),immutable=isValidatedFrozenSoil(soil);
 if(identity?.immutable&&immutable)return identity.value;
 const delta=immutable?scoopTerrainDelta(soil):null;
 if(delta?.command.type==='reserve-batch'&&isValidatedFrozenSoil(delta.previous)){
  // A checked parent has the exact terrain restored by cancelling a reserve.
  // Keep its identity so the already checked sweep can be reused.
  const landed=completedAuditSoil(soil,soil.pending);
  const value=Object.freeze({original:delta.previous,landed:isValidatedFrozenSoil(landed)?landed:freeze(landed)});
  shadowCache.set(soil,{value,immutable});
  return value;
 }
 const key=canonical(soil);if(identity?.key===key)return identity.value;let c;
 // Caller has fully validated soil before reaching this function. The entire
 // value, including history and reservation, is compared; no hash can collide.
 const old=shadowValues.get(key);
 if(old){shadowValues.delete(key);shadowValues.set(key,old);c=old.value;}
 else{const p=soil.pending;const original=soilTransportCommand(soil,{type:'cancel',id:p.id+'_audit_cancel',expectedRevision:soil.revision,transferId:p.id});c=freeze({original,landed:completedAuditSoil(soil,p)});
  const bytes=(key.length+canonical(c).length)*2;if(bytes<=shadowLimit){while(shadowValues.size>=8||shadowBytes+bytes>shadowLimit){const first=shadowValues.keys().next().value;shadowBytes-=shadowValues.get(first).bytes;shadowValues.delete(first);}shadowValues.set(key,{value:c,bytes});shadowBytes+=bytes;}
 }
 shadowCache.set(soil,{key,value:c,immutable});return c;
}
export function validateScoopDumpWork(s){
 exact(s,['format','scope','version','revision','frame','mode','vehicleTravel','wheelTravel','unload','link','scoop']);check(s.format===SCOOP_DUMP_FORMAT&&s.scope===SCOOP_DUMP_SCOPE&&s.version===1,'専用の掘削・積込み保存が必要です。');
 if(!s.scoop){bucket.validateBucketDumpWork(base(s));return s;}
 const j=s.scoop;exact(j,['id','plan','elapsed','returning']);exact(j.plan,['amount','duration','poses','cuts',...(j.plan.kind===undefined?[]:['kind'])]);check(j.plan.kind===undefined||['basin','basin-v2','basin-v3','basin-v4','basin-v5',TOOTH_VOXEL_PLAN,BUCKET_SWEEP_PLAN,PRIOR_SURFACE_PLAN,SURFACE_SWEEP_PLAN,SUMMIT_SWEEP_PLAN,AIMED_SWEEP_PLAN].includes(j.plan.kind),'掘り方が不正です。');check(s.mode==='excavating'&&!s.link&&!s.unload&&!s.frame.job&&typeof j.returning==='boolean','別の作業と重なっています。');
 check(typeof j.id==='string'&&/^[a-zA-Z0-9_-]{1,55}$/.test(j.id)&&finite(j.plan.duration,STEP,45)&&Array.isArray(j.plan.poses)&&j.plan.poses.length<=2800&&Array.isArray(j.plan.cuts)&&j.plan.cuts.length>0&&j.plan.cuts.length<=384&&j.plan.amount>=1&&j.plan.amount<=384&&j.plan.amount===j.plan.cuts.reduce((n,c)=>n+c.positions.length,0),'掘削経路が不正です。');
 validateSoilTransport(s.frame.soil);const p=s.frame.soil.pending,r=s.frame.soil.journal.at(-1);
 check(p?.id===j.id&&p.from==='batch'&&p.to==='bucket'&&p.phase==='reserved'&&p.materialId==='earth-soil'&&p.amount===j.plan.amount&&s.frame.soil.containers.bucket.amount===0&&r.id===j.id+'_reserve'&&same(p.segments,segments(j.plan)),'土の予約と掘る範囲が一致しません。');
 check(finite(j.elapsed,0,j.plan.duration)&&(!j.returning||j.elapsed<j.plan.cuts[0].time)&&same(s.frame.machineArm,scoopPoseAt(j.plan,j.elapsed)),'アームと途中時刻が一致しません。');
 const shadow=projections(s);
 bucket.validateBucketDumpWork({...base(s),frame:{...s.frame,soil:shadow.landed}});
 const old=certificates.get(j.plan);
 const stamp={soil:s.frame.soil,soilKey:isValidatedFrozenSoil(s.frame.soil)?null:canonical(s.frame.soil),dump:canonical([s.frame.dump,s.frame.machineVehicle??null,s.frame.decks??null])};
 if(!old||old.soil!==stamp.soil||old.soilKey!==stamp.soilKey||old.dump!==stamp.dump){
  const start={...s,scoop:null,frame:{...s.frame,soil:shadow.original,machineArm:j.plan.poses[0]?.arm}};start.frame.player=bucket.linkedExcavatorSeat(start.frame);bucket.validateBucketDumpWork(base(start));const expected=replayPlan(start,j.plan.kind);check(expected&&same(expected,j.plan),'保存した経路が実際の接触掘削と一致しません。');freeze(j.plan);certificates.set(j.plan,stamp);
 }
 return s;
}
export function validateScoopDumpContinuation(a,b){validateScoopDumpWork(a);validateScoopDumpWork(b);check(a.frame.version===b.frame.version&&same(a.frame.soil.field??null,b.frame.soil.field??null)&&same(a.frame.soil.site,b.frame.soil.site)&&same(a.frame.soil.initial,b.frame.soil.initial),'別の現場へ切り替えられません。');check(a.frame.soil===b.frame.soil||b.frame.soil.journal.length>=a.frame.soil.journal.length&&a.frame.soil.journal.every((c,i)=>same(c,b.frame.soil.journal[i])),'土の所有を巻き戻せません。');check(b.revision>=a.revision&&b.frame.revision>=a.frame.revision&&b.vehicleTravel>=a.vehicleTravel&&b.frame.player.travel>=a.frame.player.travel,'動作を巻き戻せません。');check(a.revision!==b.revision||same(a,b),'同じ番号の保存が変わっています。');return b;}
const wrap=fn=>(s,...args)=>{check(!s.scoop,'すくう動作が終わるまでお待ちください。');return lift(fn(base(s),...args));};
export {bucketStorageDepositPlanAsync} from './imasora-construction-bucket-dump.mjs?v=120pv';
export const startBucketAccess=wrap(bucket.startBucketAccess),progressBucketLink=wrap(bucket.progressBucketLink),finishBucketLink=wrap(bucket.finishBucketLink),startBucketStorage=wrap(bucket.startBucketStorage),startBucketPour=wrap(bucket.startBucketPour),startBucketGroundPour=wrap(bucket.startBucketGroundPour),startBucketStorageDeposit=wrap(bucket.startBucketStorageDeposit),cancelBucketPour=wrap(bucket.cancelBucketPour),slewBucketWork=wrap(bucket.slewBucketWork),adjustBucketArmWork=wrap(bucket.adjustBucketArmWork),walkBucketSite=wrap(bucket.walkBucketSite),turnBucketWalker=wrap(bucket.turnBucketWalker),driveBucketSite=wrap(bucket.driveBucketSite),boardBucketSiteDump=wrap(bucket.boardBucketSiteDump),leaveBucketSiteDump=wrap(bucket.leaveBucketSiteDump),startBucketSiteStorage=wrap(bucket.startBucketSiteStorage),startBucketSiteUnload=wrap(bucket.startBucketSiteUnload),progressDumpUnload=wrap(bucket.progressDumpUnload),finishDumpUnload=wrap(bucket.finishDumpUnload),cancelDumpUnload=wrap(bucket.cancelDumpUnload);
export const linkedAccessTarget=(s,...args)=>s.scoop?null:bucket.linkedAccessTarget(base(s),...args),dumpBoardTarget=(s,...args)=>s.scoop?null:bucket.dumpBoardTarget(base(s),...args),dumpStoragePlan=(s,...args)=>s.scoop?null:bucket.dumpStoragePlan(base(s),...args),dumpUnloadPlan=(s,...args)=>s.scoop?null:bucket.dumpUnloadPlan(base(s),...args),bucketStoragePlanAsync=(s,...args)=>s.scoop?null:bucket.bucketStoragePlanAsync(base(s),...args),bucketDumpPlanAsync=(s,...args)=>s.scoop?null:bucket.bucketDumpPlanAsync(base(s),...args),bucketGroundPlan=(s,...args)=>s.scoop?null:bucket.bucketGroundPlan(base(s),...args),bucketGroundPlanAsync=(s,...args)=>s.scoop?null:bucket.bucketGroundPlanAsync(base(s),...args);
export const bucketGroundFlowPoint=bucket.bucketGroundFlowPoint,bucketGroundFlowBoxes=bucket.bucketGroundFlowBoxes;
export const linkedPourVisual=bucket.linkedPourVisual,bucketLinkReady=bucket.bucketLinkReady;
export const startBucketSiteHand=wrap(bucket.startBucketSiteHand),progressDumpHandWork=wrap(bucket.progressDumpHandWork),finishDumpHandWork=wrap(bucket.finishDumpHandWork),returnDumpHandWork=wrap(bucket.returnDumpHandWork);
function checksum(v){let n=2166136261;for(let i=0;i<v.length;i++)n=Math.imul(n^v.charCodeAt(i),16777619);return(n>>>0).toString(16).padStart(8,'0');}
export function packScoopDumpWork(s){validateScoopDumpWork(s);return JSON.stringify({kind:SCOOP_DUMP_FORMAT,checksum:checksum(canonical(s)),state:s});}
export function unpackScoopDumpWork(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+1048576,'保存が大きすぎます。');const p=JSON.parse(text);exact(p,['kind','checksum','state']);check(p.kind===SCOOP_DUMP_FORMAT&&p.checksum===checksum(canonical(p.state)),'保存の検査に失敗しました。');return validateScoopDumpWork(p.state);}

export const linkedStorageVisual=s=>bucket.linkedStorageVisual(base(s));


// A continuously visible working cursor, never a physical-plan certificate.
// It is rebuilt from this frame's real machine/ground geometry; no idle-key
// rule, old pose, soil quantity, save command or simulated state is involved.
const liveGuideCache=new WeakMap();
export function liveBucketWorkGuide(s,aimed=false){
 const f=s?.frame;if(!f?.soil||!f.machineArm)return null;
 const a=f.machineArm,v=f.machineVehicle??{},b=f.soil.containers.bucket;
 const key=[aimed,f.soil.revision,a.boom,a.stick,a.curl,a.slew,v.x,v.z,v.heading,v.groundY,f.dump.x,f.dump.z,f.dump.heading,f.dump.groundY,b.amount,b.materialId,f.soil.pending?.from,f.soil.pending?.amount,s.link?.kind,s.link?.id,s.link?.elapsed].join('|'),old=liveGuideCache.get(f.soil);
 if(old?.key===key&&old.decks===f.decks)return old.value;
 const value=calculateLiveBucketWorkGuide(s,aimed);liveGuideCache.set(f.soil,{key,decks:f.decks,value});return value;
}

// Find the first actual earth contact while the bucket is being aimed. This
// small sweep can draw the current target, but never reserves soil or starts H.
function liveNativeCut(frame,work,ready){
 const floor=EX.boomMin,steps=Math.max(1,Math.ceil((ready.boom-floor)/.08));
 function sample(boom){
  const arm={...ready,boom},posed={...work,arm},geometry=bucketContactGeometry(posed,armPose(posed));
  const parts=[...geometry.all,...geometry.capture],min=geometry.bounds.min.slice(),max=geometry.bounds.max.slice();
  for(const part of geometry.capture)for(let i=0;i<3;i++){min[i]=Math.min(min[i],part.min[i]);max[i]=Math.max(max[i],part.max[i]);}
  const hits=shovelSoilContactCandidates(frame.soil,min[0]-.08,max[0]+.08,min[2]-.08,max[2]+.08,min[1]-.08)
    .filter(box=>box.materialId==='earth-soil'&&parts.some(part=>touchesCut(part,box)));
  return hits.length?{arm,parts,hits}:null;
 }
 let above=ready.boom;
 for(let i=0;i<=steps;i++){
  const boom=ready.boom+(floor-ready.boom)*i/steps;
  let contact=sample(boom);
  if(!contact){above=boom;continue;}
  for(let j=0;j<4;j++){
   const mid=(above+contact.arm.boom)/2,closer=sample(mid);
   if(closer)contact=closer;else above=mid;
  }
  const canReach=bucket.createLinkedArmSweepProbe(frame);
  const midway={...ready,boom:(ready.boom+contact.arm.boom)/2};
  if(!canReach(ready)||!canReach(midway)||!canReach(contact.arm))return {boxes:[],blocked:true};
  const boxes=[];
  for(const hit of contact.hits){
   const [x,y,z]=hit.position,half=hit.size/2;
   for(let a=x-half+1;a<x+half;a+=2)for(let b=z-half+1;b<z+half;b+=2){
    if(transportDigProtection(frame,a,b,1))continue;
    for(let h=y+half-1;h>y-half;h-=2){
     const cell={position:[a,h,b],size:2,materialId:'earth-soil'};
     if(contact.parts.some(part=>touchesCut(part,cell))){boxes.push(cell);break;}
    }
   }
  }
  return {boxes,blocked:boxes.length===0};
 }
 return null;
}

function calculateLiveBucketWorkGuide(s,aimed){
 const f=s?.frame;if(!f?.machineArm||!f.soil)return null;

 if(s.link?.kind==='storage'||s.link?.plan?.kind==='storage-drop-v1'){
  const bin=nativeStorageBin(f),top=4.72,boxes=[];
  for(let x=bin.x-(bin.width-6)/2+1;x<bin.x+(bin.width-6)/2;x+=2)for(let z=bin.z-(bin.depth-6)/2+1;z<bin.z+(bin.depth-6)/2;z+=2)boxes.push({position:[x,top-1,z],size:2,materialId:'earth-soil'});
  return{kind:'storage',boxes,centre:[bin.x,top+.24,bin.z],bounds:{position:[bin.x,3.92,bin.z],size:[bin.width-6,1.6,bin.depth-6]},projected:true,validSurface:true,exact:true};
 }
 if(s.link?.kind==='pour'&&s.link.plan?.kind!=='ground-pour-v1'){
  const amount=bucket.linkedPourVisual(base(s)).cargo,volume=amount*8,width=Math.min(48,Math.max(4,Math.sqrt(volume/4))),depth=Math.min(29,Math.max(4,volume/(width*4))),height=amount?volume/(width*depth):0,top=17+height,boxes=[];
  for(let x=-23;x<24;x+=2)for(let z=-36;z<-7;z+=2){const point=shovelDumpPoint(f,x,top,z);boxes.push({position:[point[0],point[1]-1,point[2]],size:2,materialId:'earth-soil'});}
  const centre=shovelDumpPoint(f,0,top+.24,-22);
  return{kind:'dump',boxes,centre,bounds:{corners:[[-24,-37],[24,-37],[24,-7],[-24,-7]].map(([x,z])=>shovelDumpPoint(f,x,top,z))},projected:true,validSurface:true,exact:true};
 }
 const carried=f.soil.containers.bucket.amount||f.soil.pending?.from==='bucket';
 let original;try{original=shovelMachineState(f);}catch{try{original=shovelMachineState({...f,version:1});}catch{return null;}}
 const earthAt=nativeEarthHeightReader(f),surfaceAt=nativeDumpHeightReader(f);
 const ready=aimed?{...f.machineArm,curl:DIG_READY.curl}:{...f.machineArm,...DIG_READY};
 const collect=arm=>{
  const w={...original,arm},parts=bucketContactGeometry(w,armPose(w)).teeth,cells=new Map();let blocked=false;
  for(const part of parts){
   const cx=(part.min[0]+part.max[0])/2,cz=(part.min[2]+part.max[2])/2;
   const sample=[[cx,cz],[part.min[0],part.min[2]],[part.max[0],part.max[2]]].map(([x,z])=>earthAt(x,z,0)).filter(Number.isFinite);
   if(!sample.length||part.min[1]>Math.max(...sample)+.09)continue;
   for(let x=Math.floor(part.min[0]/2);x<=Math.floor(part.max[0]/2);x++)for(let z=Math.floor(part.min[2]/2);z<=Math.floor(part.max[2]/2);z++){
    const px=x*2+1,pz=z*2+1,h=earthAt(px,pz,0);if(!Number.isFinite(h))continue;
    if(!prismTouchesBox(part,[px-1,h-2,pz-1],[px+1,h,pz+1],.09))continue;
    const top=surfaceAt(px,pz,h);if(Number.isFinite(top)&&top>h+.1)blocked=true;
    cells.set(x+','+z,{position:[px,h-1,pz],size:2,materialId:'earth-soil'});
   }
  }
  return{boxes:[...cells.values()],blocked};
 };
 let projected=null,contact=!carried&&f.version===2?liveNativeCut(f,original,ready):null;
 const nativeContact=!!contact?.boxes.length;
 if(!carried&&!contact){
  const n=Math.max(1,Math.ceil((ready.boom-EX.boomMin)/.12));
  let previous=ready;
  for(let i=aimed?0:1;i<=n;i++){
   const arm={...ready,boom:ready.boom+(EX.boomMin-ready.boom)*i/n},hit=collect(arm);
   if(hit.boxes.length){
    let low=previous,high=arm;
    for(let j=0;j<3;j++){
     const middle={...ready,boom:(low.boom+high.boom)/2};
     if(collect(middle).boxes.length)high=middle;else low=middle;
    }
    contact=collect(high);
    // A bare surveyable surface can have no allocated voxels yet. It still
    // needs the same solid-object check before displaying a playable target.
    if(f.version===2&&!contact.blocked&&!contact.boxes.some(b=>transportDigProtection(f,b.position[0],b.position[2],b.size/2)))
     contact.blocked=!bucket.linkedArmHardClear(f,high);
    projected=armPose({...original,arm:high}).bucket;break;
   }
   previous=arm;
  }
 }
 if(!projected){const w={...original,arm:carried?ready:{...ready,boom:EX.boomMin}};projected=carried?(()=>{const p=bucket.bucketPourMouth(f,w.arm);return{x:p[0],y:p[1],z:p[2]};})():armPose(w).bucket;}
 const h=surfaceAt(projected.x,projected.z,0),fallback=Number.isFinite(h)?h:0;
 if(carried){
  const heading=armPose({...original,arm:ready}).heading,c=Math.cos(heading),sn=Math.sin(heading),cells=[];let blocked=false;
  for(let x=Math.floor((projected.x-12)/2);x<=Math.ceil((projected.x+12)/2);x++)for(let z=Math.floor((projected.z-12)/2);z<=Math.ceil((projected.z+12)/2);z++){
   const px=x*2+1,pz=z*2+1,dx=px-projected.x,dz=pz-projected.z;if(Math.abs(c*dx-sn*dz)>9||Math.abs(sn*dx+c*dz)>6)continue;
   const top=surfaceAt(px,pz,0);if(!Number.isFinite(top))continue;
   cells.push({position:[px,top-1,pz],size:2,materialId:f.soil.containers.bucket.materialId});
   if(top>=projected.y-1)blocked=true;
  }
  contact={boxes:cells,blocked};
 }
 const boxes=contact?.boxes.length?contact.boxes:[{position:[projected.x,fallback-2,projected.z],size:4,materialId:'earth-soil'}];
 const centre=[boxes.reduce((n,b)=>n+b.position[0],0)/boxes.length,Math.max(...boxes.map(b=>b.position[1]+b.size/2))+.24,boxes.reduce((n,b)=>n+b.position[2],0)/boxes.length];
 const reason=boxes.map(b=>transportDigProtection(f,b.position[0],b.position[2],b.size/2)).find(Boolean)??'';
 return{kind:carried?'ground':'scoop',boxes,centre,projected:nativeContact||Number.isFinite(h),validSurface:!!contact?.boxes.length&&!contact.blocked&&!reason,reason,exact:false,nativeContact};
}

// The aiming area is the full projected reach of the bucket around first
// contact. Exact cuts and amount still come from the checked scoop plan.
const aimFootprints=new WeakMap();
export function bucketAimFootprint(s,contacts,zone=null){
 const f=s.frame,old=aimFootprints.get(contacts);
 if(old?.soil===f.soil&&old.decks===f.decks&&old.arm===f.machineArm&&old.vehicle===f.machineVehicle&&old.zone===zone)return old.boxes;
 const {heading,wrist}=armPose(shovelMachineState(f)),sn=Math.sin(heading),c=Math.cos(heading);
 const side=wrist.x*c-wrist.z*sn;
 const forward=Math.max(...contacts.map(({position:[x,,z]})=>x*sn+z*c))+2;
 // 18 units of shell plus one soil cell on each side. Cover the inward sweep
 // in a single footprint, even if the edge of one tooth is the first contact.
 const halfWidth=11,depth=20,middle=forward-depth/2;
 const cx=side*c+middle*sn,cz=middle*c-side*sn,r=Math.ceil(Math.hypot(halfWidth,depth/2));
 const earth=nativeEarthHeightReader(f),surface=nativeDumpHeightReader(f),height=f.machineVehicle?.groundY??0;
 const [ox,oz]=f.soil.field?.origin??[0,0],boxes=[];
 for(let i=Math.floor((cx-r)/2);i<=Math.floor((cx+r)/2);i++)for(let j=Math.floor((cz-r)/2);j<=Math.floor((cz+r)/2);j++){
  const x=i*2+1,z=j*2+1,facing=x*sn+z*c;
  if(Math.abs(x*c-z*sn-side)>halfWidth||facing<forward-depth||facing>forward)continue;
  if(zone&&(x+ox-1<zone.minX||x+ox+1>zone.maxX||z+oz-1<zone.minZ||z+oz+1>zone.maxZ))continue;
  if(transportDigProtection(f,x,z,1))continue;
  const y=earth(x,z,height),top=surface===earth?y:surface(x,z,height);
  if(!Number.isFinite(y)||!Number.isFinite(top)||top>y+.1)continue;
  boxes.push({position:[x,y-1,z],size:2,materialId:'earth-soil'});
 }
 aimFootprints.set(contacts,{soil:f.soil,decks:f.decks,arm:f.machineArm,vehicle:f.machineVehicle,zone,boxes});return boxes;
}

const preparedSurveys=new WeakMap();
export function openScoopGround(s){
 const patches=unopenedGround(s);if(!patches.length)return s;assertIdle(s);
 const prior=s.frame.soil,reuse=isValidatedFrozenSoil(prior);
 const key=JSON.stringify(patches),prepared=reuse?preparedSurveys.get(prior):null;
 let soil=prepared?.key===key?prepared.soil:null;
 if(!soil){
  soil=soilTransportCommand(prior,{type:'open-ground',id:'ground_'+prior.revision,expectedRevision:prior.revision,patches});
  if(isValidatedFrozenSoil(prior)&&isValidatedFrozenSoil(soil))preparedSurveys.set(prior,{key,soil});
 }
 return next(s,{...s.frame,soil});
}
