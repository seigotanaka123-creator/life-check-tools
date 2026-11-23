import {transportArea,transportDigProtection} from './imasora-construction-transport-field.mjs?v=120ov';
import {nativeDeckBoxes} from './imasora-construction-native-decks.mjs?v=120ps';
import {excavatorGroundFrame,excavatorGroundHeight,excavatorWorkSupported,groundPoint,groundLocal} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {nativeDumpBox,nativeDumpLocal,boxAxes,boxLocal,boxExtent,boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120pv';
import {transportExcavatorPositionSafe} from './imasora-construction-transport-drive.mjs?v=120pv';
import {transportPoseKey} from './imasora-construction-transport-field.mjs?v=120ov';
import {canonical} from './imasora-construction-state.js';
import {dumpPositionSafe,createDumpWork,validateDumpWork,DUMP_WORK_FORMAT,DUMP_WORK_SCOPE,walkDumpWork,turnDumpWalker,driveDumpWork,boardDumpWork,leaveDumpWork,dumpBoardTarget,dumpUnloadPlan,dumpStoragePlan,startDumpStorage,startDumpUnload,progressDumpUnload,finishDumpUnload,cancelDumpUnload,startDumpHandWork,progressDumpHandWork,finishDumpHandWork,returnDumpHandWork} from './imasora-construction-dump-work.mjs?v=121gf';
import {shovelMachineState,shovelMachines,shovelSoilContactCandidates,shovelNearbySoil,shovelSegmentHits,shovelDumpObstacles,shovelDumpPoint,shovelStanding} from './imasora-construction-shovel-work.mjs?v=120pv';
import {armPose,armIntersections,solveBucketPose,EX} from './imasora-construction-excavator.js?v=120ov';
import {nativeStorageBin} from './imasora-construction-transport-field.mjs?v=120ov';
import {bucketContactGeometry,prismTouchesBox} from './imasora-construction-excavator-contact.js?v=120fc';
import {bucketPoint,isContactDig,isBackhoe} from './imasora-construction-excavator-bucket.js';
import {excavatorAccessPath,excavatorAccessClear,EX_ACCESS} from './imasora-construction-excavator-access.js?v=120ov';
import {LOADER,WALKER,localToWorld} from './imasora-construction-loader-physics.js?v=120ov';
import {soilTransportCommand,soilTransportCommands,soilVoxel,SOIL_LIMITS,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs?v=120pv';
import {quarryRock} from './imasora-construction-field-earth.mjs?v=120ov';

export const BUCKET_DUMP_FORMAT='imasora-shared-bucket-dump-checkpoint-v1';
export const BUCKET_DUMP_SCOPE='imasora-shared-bucket-dump-isolated-v1';
export const LINK_POUR_SECONDS=1.2;
const READY={boom:74*Math.PI/180,stick:-Math.PI/6,curl:-1.25};
const axes=['boom','stick','curl','slew'],speed={boom:.5,stick:.65,curl:.75,slew:.62},planChecks=new WeakMap(),obstacleCache=new WeakMap(),hardObstacleCache=new WeakMap(),plans=new WeakMap();
const check=(ok,text)=>{if(!ok)throw Error('荷台への積込み：'+text);};
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const exact=(v,ks)=>check(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...ks].sort().join('|'),'保存の項目が不正です。');
const same=(a,b)=>canonical(a)===canonical(b);
function freezePlan(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freezePlan(v);Object.freeze(value);}return value;}
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(v);
const heading=n=>Math.atan2(Math.sin(n),Math.cos(n));
const cabPath=(f,side,board=true)=>{const w=poseWork(f),v=w.loader.vehicle,g=w.groundPose;return excavatorAccessPath(v,f.machineArm.slew,side,board).map(p=>{if(!g)return{...p,heading:heading(p.heading)};const c=Math.cos(v.heading),s=Math.sin(v.heading),dx=p.x-v.x,dz=p.z-v.z,q=groundPoint(g,c*dx-s*dz,p.y,s*dx+c*dz);return{...p,x:q[0],y:p.y===0?excavatorGroundHeight(f,q[0],q[2],q[1])??q[1]:q[1],z:q[2],heading:heading(p.heading)};});};
const legacy=s=>({format:DUMP_WORK_FORMAT,scope:DUMP_WORK_SCOPE,version:1,revision:s.revision,frame:s.frame,mode:s.mode==='excavating'?'foot':s.mode,vehicleTravel:s.vehicleTravel,wheelTravel:s.wheelTravel,unload:s.unload});
const idle=s=>check(!s.link&&!s.unload&&!s.frame.job&&!s.frame.soil.pending,'今の作業を終えるか、メニューで一時停止してください。');
const next=(s,frame,extra={})=>({...s,revision:s.revision+1,frame:{...frame,revision:s.frame.revision+1},...extra});
const poseWork=(frame,arm=frame.machineArm)=>({...shovelMachineState(frame),arm,terrain:{},spoil:[],falling:[],load:frame.soil.containers.bucket.amount/64});
export function linkedExcavatorSeat(frame){const w=poseWork(frame),v={...w.loader.vehicle,heading:w.loader.vehicle.heading+frame.machineArm.slew},p=localToWorld(v,LOADER.seatX,LOADER.seatZ);const g=w.groundPose;if(g){const c=Math.cos(w.loader.vehicle.heading),sn=Math.sin(w.loader.vehicle.heading),dx=p.x-w.loader.vehicle.x,dz=p.z-w.loader.vehicle.z,q=groundPoint(g,c*dx-sn*dz,EX_ACCESS.floor,sn*dx+c*dz);return{...frame.player,x:q[0],y:q[1],z:q[2],heading:heading(v.heading)};}return{...frame.player,x:p.x,y:EX_ACCESS.floor,z:p.z,heading:Math.atan2(Math.sin(v.heading),Math.cos(v.heading))};}
function armValid(a){exact(a,axes);check(finite(a.boom,EX.boomMin,EX.boomMax)&&finite(a.stick,-2.55,-Math.PI/6+1e-8)&&finite(a.curl,-1.25,1.1)&&finite(a.slew,-EX.slewLimit,EX.slewLimit),'アームの範囲が不正です。');}
function boxBoundsOverlap(bounds,box,extent){
 const [x,y,z]=box.position,[hx,hy,hz]=extent;
 return bounds.min[0]<=x+hx&&bounds.max[0]>=x-hx&&
        bounds.min[1]<=y+hy&&bounds.max[1]>=y-hy&&
        bounds.min[2]<=z+hz&&bounds.max[2]>=z-hz;
}
function boxContact(prism,box,prepared=null){
 const half=prepared?.half??box.half??Array(3).fill(box.size/2),h=box.heading??0;
 const extent=prepared?.extent??boxExtent(box);
 if(!boxBoundsOverlap(prism,box,extent))return false;
 if(!h&&!box.axes)return prismTouchesBox(prism,prepared?.min??box.position.map((v,i)=>v-half[i]),prepared?.max??box.position.map((v,i)=>v+half[i]));
 const basis=boxAxes(box),turn=v=>basis.map(a=>a.reduce((sum,n,i)=>sum+n*v[i],0)),vertices=prism.vertices.map(v=>boxLocal(v,box)),aa=prism.axes.map(turn),ranges=aa.map(a=>{const ds=vertices.map(v=>v.reduce((n,x,i)=>n+x*a[i],0));return[Math.min(...ds),Math.max(...ds)];});
 return prismTouchesBox({vertices,axes:aa,ranges,min:[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))),max:[0,1,2].map(i=>Math.max(...vertices.map(v=>v[i])))},half.map(v=>-v),half);
}
function cargoBox(f){const amount=f.soil.containers.dump.amount;if(!amount)return null;const vol=amount*8,w=Math.min(48,Math.max(4,Math.sqrt(vol/4))),d=Math.min(29,Math.max(4,vol/(w*4))),height=vol/(w*d);return nativeDumpBox(f,[-24+w/2,17+height/2,-22],[w/2,height/2,d/2]);}
function rockHitsArm(rock,joints,geometry,min,max,readColumn){
 rock=rock?.surface??rock;
 if(!rock||rock.upperBound(min[0],max[0],min[2],max[2])<=min[1])return false;
 const padding=2.8;
 const segments=[0,1].map(i=>{
  const a=joints[i],b=joints[i+1];
  return{a,b,min:a.map((v,j)=>Math.min(v,b[j])-padding-1e-8),max:a.map((v,j)=>Math.max(v,b[j])+padding+1e-8)};
 });
 const bucket=geometry.bounds;
 const xOverlap=(b,x)=>x+1>=b.min[0]&&x-1<=b.max[0]&&b.max[1]>=0;
 const zOverlap=(b,z)=>z+1>=b.min[2]&&z-1<=b.max[2];
 const [first,second]=segments,at=readColumn??((x,z)=>rock.at(x,z));
 const clearBoom=readColumn?.clearBoom?.(first)===true;
 const left=Math.floor(min[0]/2)*2+1,near=Math.floor(min[2]/2)*2+1;
 // Ignore a rock tile only when all of its exact sampled columns lie
 // below every overlapping part of the arm.
 if(readColumn?.tileTop){
  const parts=clearBoom?[second,bucket]:[first,second,bucket];
  for(let x=left;x<=max[0]+1;){
   const endX=Math.min(Math.floor(x/8)*8+7,max[0]+1);
   for(let z=near;z<=max[2]+1;){
    const endZ=Math.min(Math.floor(z/8)*8+7,max[2]+1);
    let low=Infinity;
    for(const part of parts)
     if(part.max[0]>=x-1&&part.min[0]<=endX+1&&part.max[2]>=z-1&&part.min[2]<=endZ+1&&part.max[1]>=0)
      low=Math.min(low,part.min[1]);
    if(low<Infinity&&readColumn.tileTop(x,z)>=low){
     for(let cx=x;cx<=endX;cx+=2)for(let cz=z;cz<=endZ;cz+=2)
      if(columnHits(cx,cz))return true;
    }
    z=Math.floor(z/8)*8+9;
   }
   x=Math.floor(x/8)*8+9;
  }
 }else for(let x=left;x<=max[0]+1;x+=2)for(let z=near;z<=max[2]+1;z+=2)if(columnHits(x,z))return true;
 function columnHits(x,z){
  const xBoom=!clearBoom&&xOverlap(first,x),xStick=xOverlap(second,x),xMouth=xOverlap(bucket,x);
  const zBoom=xBoom&&zOverlap(first,z),zStick=xStick&&zOverlap(second,z),zMouth=xMouth&&zOverlap(bucket,z);
  if(!zBoom&&!zStick&&!zMouth)return false;
  const h=at(x,z);if(!h||h<=min[1])return false;
  const boom=zBoom&&h>=first.min[1],stick=zStick&&h>=second.min[1],mouth=zMouth&&h>=bucket.min[1];
  if(!boom&&!stick&&!mouth)return false;
  const box={position:[x,h/2,z],half:[1,h/2,1],heading:0};
  if(boom&&shovelSegmentHits(first.a,first.b,box,padding)||
     stick&&shovelSegmentHits(second.a,second.b,box,padding))return true;
  return mouth&&geometry.mayTouchBox(x,h/2,z,1,h/2,1)&&geometry.all.some(part=>prismTouchesBox(part,[x-1,0,z-1],[x+1,h,z+1]));
 }
 return false;
}
function linkedArmContact(frame,w,p,ignoreEarth,rock=quarryRock(frame.soil),readColumn,dumpKey=canonical(frame.dump)){
 if(armIntersections(w,0,[],p).size)return null;
 const geometry=bucketContactGeometry(w,p),key=dumpKey,cache=ignoreEarth?hardObstacleCache:obstacleCache;let entry=cache.get(frame.soil);if(!entry||entry.key!==key||entry.decks!==frame.decks){const cargo=cargoBox(frame);entry={key,decks:frame.decks,grid:new Map()};for(const b of [...shovelDumpObstacles(frame),...nativeDeckBoxes(frame),...(cargo?[cargo]:[])]){const extent=boxExtent(b),half=b.half??Array(3).fill(b.size/2),item={b,extent,half,min:b.position.map((v,i)=>v-half[i]),max:b.position.map((v,i)=>v+half[i])};for(let x=Math.floor((b.position[0]-extent[0])/32);x<=Math.floor((b.position[0]+extent[0])/32);x++)for(let z=Math.floor((b.position[2]-extent[2])/32);z<=Math.floor((b.position[2]+extent[2])/32);z++){const cell=x+','+z,list=entry.grid.get(cell)??[];list.push(item);entry.grid.set(cell,list);}}cache.set(frame.soil,entry);}
 const joints=p.world.map(v=>[v.x,v.y,v.z]),bounds=geometry.bounds;
 const min=bounds.min.map((v,i)=>Math.min(v,joints[0][i]-2.8,joints[1][i]-2.8,joints[2][i]-2.8));
 const max=bounds.max.map((v,i)=>Math.max(v,joints[0][i]+2.8,joints[1][i]+2.8,joints[2][i]+2.8));
 if(rockHitsArm(rock,joints,geometry,min,max,readColumn))return null;
 const nearby=new Set();for(let x=Math.floor(min[0]/32);x<=Math.floor(max[0]/32);x++)for(let z=Math.floor(min[2]/32);z<=Math.floor(max[2]/32);z++)for(const item of entry.grid.get(x+','+z)??[])nearby.add(item);
 const sweepBounds={min,max};
 const hits=(box,extent,prepared)=>{
  if(!boxBoundsOverlap(sweepBounds,box,extent))return false;
  return shovelSegmentHits(joints[0],joints[1],box,2.8)||
   shovelSegmentHits(joints[1],joints[2],box,2.8)||
   boxBoundsOverlap(bounds,box,extent)&&geometry.all.some(part=>boxContact(part,box,prepared));
 };
 for(const item of nearby)if(hits(item.b,item.extent,item))return null;
 for(const box of shovelSoilContactCandidates(frame.soil,min[0],max[0],min[2],max[2],min[1],ignoreEarth)){
  const radius=box.size/2;
  const extent=box.half||box.axes||box.heading?boxExtent(box):[radius,radius,radius];
  if(hits(box,extent))return null;
 }
 return {geometry,joints,min,max};
}
export function linkedArmClear(frame,arm=frame.machineArm,{ignoreEarth=false}={}){
 let w,p;try{w=poseWork(frame,arm);p=armPose(w);}catch{return false;}
 return !!linkedArmContact(frame,w,p,ignoreEarth);
}
// One fixed support frame for a sweep. Each arm pose gets the same hard
// contact checks; the soil cutter then reuses those exact tested bounds.
export function createLinkedArmSweepProbe(frame){
 const work=poseWork(frame),rock=quarryRock(frame.soil),surface=rock?.surface??rock,dumpKey=canonical(frame.dump);
 // Arm samples revisit the same two-unit rock columns. Keep their exact
 // heights on a local grid so the contact loop can reuse them directly.
 const {x,z}=work.loader.vehicle,left=Math.floor(x/2)-104,near=Math.floor(z/2)-104,width=209;
 const columns=surface?new Float64Array(width*width).fill(NaN):null;
 function readColumn(x,z){
  const i=(x-1)/2-left,j=(z-1)/2-near;
  if(i<0||i>=width||j<0||j>=width)return surface.at(x,z);
  const k=j*width+i,y=columns[k];
  return Number.isNaN(y)?(columns[k]=surface.at(x,z)):y;
 }
 // The boom can keep the same endpoints across hundreds of bucket
 // samples. Only skip it when the terrain bound proves it is clear.
 let lastBoom,boomClear=false;
 readColumn.clearBoom=({a,b,min,max})=>{
  if(!lastBoom||a.some((v,i)=>v!==lastBoom.a[i])||b.some((v,i)=>v!==lastBoom.b[i])){
   lastBoom={a,b};
   boomClear=surface.upperBound(min[0]-1,max[0]+1,min[2]-1,max[2]+1)<min[1];
  }
  return boomClear;
 };
 const tileTops=new Map();
 readColumn.tileTop=(x,z)=>{
  const startX=Math.floor(x/8)*8+1,startZ=Math.floor(z/8)*8+1;
  const key=startX+startZ*65536,prior=tileTops.get(key);
  if(prior!==undefined)return prior;
  let height=0;
  for(let cx=startX;cx<startX+8;cx+=2)for(let cz=startZ;cz<startZ+8;cz+=2)height=Math.max(height,readColumn(cx,cz));
  tileTops.set(key,height);return height;
 };
 return arm=>{
  const w={...work,arm};
  return linkedArmContact(frame,w,armPose(w),true,rock,readColumn,dumpKey);
 };
}
// Only classify an already detected soil contact; real support and every hard
// obstacle remain. Authoritative movement still uses linkedArmClear normally.
export const linkedArmHardClear=(frame,arm=frame.machineArm)=>linkedArmClear(frame,arm,{ignoreEarth:true});
const interpolate=(a,b,u)=>Object.fromEntries(axes.map(k=>[k,a[k]+(b[k]-a[k])*u]));
function segmentClear(f,a,b){const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(b[k]-a[k])/.006)));check(n<=1100,'予定の移動が長すぎます。');for(let i=0;i<=n;i++)if(!linkedArmClear(f,interpolate(a,b,i/n)))return false;return true;}
function localDump(f,p){return nativeDumpLocal(f,p);}
export function bucketPourMouth(frame,arm=frame.machineArm,x=0){const w=poseWork(frame,arm),p=armPose(w),v=bucketPoint(w,{x,y:-10,z:-17}),c=Math.cos(p.heading),s=Math.sin(p.heading);if(p.axes)return[p.wrist.x,p.wrist.y,p.wrist.z].map((n,i)=>n+p.axes[0][i]*v.x+p.axes[1][i]*v.y+p.axes[2][i]*v.z);return[p.wrist.x+c*v.x+s*v.z,p.wrist.y+v.y,p.wrist.z-s*v.x+c*v.z];}
function mouthFits(frame,arm){return[-8,0,8].every(x=>{const p=bucketPourMouth(frame,arm,x),l=localDump(frame,p);return l[1]>29&&Math.abs(l[0])<=24&&l[2]>=-37&&l[2]<=-7;});}
function storageMouthFits(frame,arm){
 const bin=nativeStorageBin(frame);
 return [-8,0,8].every(x=>{
  const p=bucketPourMouth(frame,arm,x);
  return p[1]>12&&Math.abs(p[0]-bin.x)<=bin.width/2-4&&Math.abs(p[2]-bin.z)<=bin.depth/2-4;
 });
}
const DIRECT_DUMP_PLAN='direct-dump-v1';
const stage=(kind,from,to,duration)=>({kind,from:{...from},to:{...to},duration:duration??Math.max(.15,...axes.map(k=>Math.abs(to[k]-from[k])/speed[k]))});
function planKey(s){return canonical([s.frame.dump,s.frame.machineArm,s.frame.machineVehicle??null,s.frame.decks??null,s.mode]);}
function* segmentSteps(f,a,b){const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(b[k]-a[k])/.006)));check(n<=1100,'予定の移動が長すぎます。');for(let i=0;i<=n;i++){if(!linkedArmClear(f,interpolate(a,b,i/n)))return false;yield;}return true;}
function* planSteps(s,destination='dump'){
 const f=s.frame;
 if(s.mode!=='excavating'||s.link||s.unload||f.job||f.soil.pending||!f.soil.containers.bucket.amount)return null;
 if(!excavatorWorkSupported(f)||!dumpPositionSafe(f))return null;
 const inBin=destination==='storage',bin=nativeStorageBin(f),container=f.soil.containers[destination],bucket=f.soil.containers.bucket;
 if(inBin&&(!f.machineVehicle||Math.hypot(f.machineVehicle.x-bin.x,f.machineVehicle.z-bin.z)>170))return null;
 const amount=Math.min(bucket.amount,SOIL_CAPACITY[destination]-container.amount);
 if(amount<=0||container.amount&&container.materialId!==bucket.materialId)return null;
 const w=poseWork(f),closed=f.machineArm.curl;
 if(!inBin&&!dumpPositionSafe({...f,soil:{...f.soil,containers:{...f.soil.containers,dump:{...container,amount:container.amount+amount}}}}))return null;
 if(!inBin){
  const current=f.machineArm,open={...current,curl:READY.curl},finish=amount<bucket.amount?current:open;
  if(mouthFits(f,open)&&(yield* segmentSteps(f,current,open))){
   const path=[stage('open',current,open),stage('pour',open,open,LINK_POUR_SECONDS),stage('ready',open,finish)];
   const flowStart=path[0].duration,flowEnd=flowStart+LINK_POUR_SECONDS;
   return {kind:DIRECT_DUMP_PLAN,amount,path,flowStart,flowEnd,duration:flowEnd+path[2].duration};
  }
 }
 const targets=inBin?[36,40,44,48,32].flatMap(y=>[0,-10,10].flatMap(x=>[0,-8,8].map(z=>[bin.x+x,y,bin.z+z]))):
  [60,56,52,48,64].flatMap(y=>[-22,-27,-17].map(z=>shovelDumpPoint(f,0,y,z)));
 // Bounded candidates. The bowl remains over the same receiving mouth while opening.
 for(const [x,y,z] of targets){
  const target={x,y,z},at=solveBucketPose(w,target,closed),open=solveBucketPose(w,target,-1.25);
  if(!at||!open||at.stick>-Math.PI/6||open.stick>-Math.PI/6||!(inBin?storageMouthFits:mouthFits)(f,open))continue;
  const raised={...f.machineArm,boom:READY.boom},reach={...raised,stick:READY.stick},above={...reach,slew:at.slew};
  const remaining=f.soil.containers.bucket.amount-amount,end={...READY,slew:at.slew,curl:remaining?closed:READY.curl},lift={...open,boom:READY.boom,curl:remaining?closed:open.curl};
  const points=[f.machineArm,raised,reach,above,at,open,open,lift,end],kinds=['raise','clear','swing','lower','open','pour','lift','ready'];
  let safe=true;for(let i=1;i<points.length;i++)if(!(yield* segmentSteps(f,points[i-1],points[i]))){safe=false;break;}if(!safe)continue;
  const path=points.slice(1).map((p,i)=>stage(kinds[i],points[i],p,kinds[i]==='pour'?LINK_POUR_SECONDS:undefined)),duration=path.reduce((n,p)=>n+p.duration,0),flowStart=path.slice(0,5).reduce((n,p)=>n+p.duration,0);
  if(duration>45)continue;return{...(inBin?{kind:'storage-drop-v1'}:{}),amount,path,duration,flowStart,flowEnd:flowStart+LINK_POUR_SECONDS};
 }
 return null;
}
export function bucketDumpPlan(s){const key=planKey(s),entry=plans.get(s.frame.soil);if(entry?.key===key)return entry.plan;const g=planSteps(s);let step;do{step=g.next();}while(!step.done);const plan=freezePlan(step.value);plans.set(s.frame.soil,{key,plan});return plan;}
export async function bucketDumpPlanAsync(s,yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0))){
 const key=planKey(s),entry=plans.get(s.frame.soil);
 if(entry?.key===key)return entry.plan;
 let result;
 if(typeof document!=='undefined'&&typeof Worker==='function'){
  // Run the same full sweep without waiting for a painted frame every eight poses.
  const {runWorldSaveTask}=await import('./imasora-world-save-client.mjs?v=120pv');
  result=await runWorldSaveTask('bucket-dump-plan',{work:s});
 }else{
  const sweep=planSteps(s);let step,count=0;
  do{step=sweep.next();if(!step.done&&++count%8===0)await yieldFrame();}while(!step.done);
  result=step.value;
 }
 const plan=freezePlan(result);
 plans.set(s.frame.soil,{key,plan});
 return plan;
}
const storageDropPlans=new WeakMap();
export function bucketStorageDepositPlan(s){
 const key=planKey(s),cached=storageDropPlans.get(s.frame.soil);if(cached?.key===key)return cached.plan;
 const generator=planSteps(s,'storage');let step;
 do{step=generator.next();}while(!step.done);
 const plan=freezePlan(step.value);storageDropPlans.set(s.frame.soil,{key,plan});return plan;
}
export async function bucketStorageDepositPlanAsync(s,yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0))){
 const key=planKey(s),cached=storageDropPlans.get(s.frame.soil);if(cached?.key===key)return cached.plan;
 const generator=planSteps(s,'storage');let step,slice=performance.now();
 do{step=generator.next();if(!step.done&&performance.now()-slice>=5){await yieldFrame();slice=performance.now();}}while(!step.done);
 const plan=freezePlan(step.value);storageDropPlans.set(s.frame.soil,{key,plan});return plan;
}


// Restore the original bucket-to-ground operation alongside truck loading.
// The destination is derived from this bucket's real open mouth and gravity;
// the owned soil journal reserves exactly those supported native voxels.
const groundPlans=new WeakMap(),groundChecks=new WeakMap();
const groundSignature=s=>canonical([s.frame.dump,s.frame.machineVehicle??null,s.frame.machineArm,s.frame.decks??null,s.mode]);
export function bucketGroundFlowPoint(frame,plan,index,u){
 const destination=plan.positions[index%plan.positions.length].map(v=>v*2+1),arm=plan.path[5].from,w=poseWork(frame,arm),heading=armPose(w).heading,centre=bucketPourMouth(frame,arm),dx=destination[0]-centre[0],dz=destination[2]-centre[2],side=Math.max(-8,Math.min(8,dx*Math.cos(heading)-dz*Math.sin(heading))),start=bucketPourMouth(frame,arm,side),t=Math.max(0,Math.min(1,u));
 return[start[0]+(destination[0]-start[0])*t,start[1]+(destination[1]-start[1])*t*t,start[2]+(destination[2]-start[2])*t];
}
export function bucketGroundFlowBoxes(frame,plan,index){
 const out=[];let a=bucketGroundFlowPoint(frame,plan,index,0);
 for(let k=1;k<=16;k++){const b=bucketGroundFlowPoint(frame,plan,index,k/16);out.push({position:a.map((v,i)=>(v+b[i])/2),half:a.map((v,i)=>1+Math.abs(v-b[i])/2)});a=b;}
 return out;
}
function* groundPlanSteps(s,{allowProtected=false}={}){
 if(!excavatorWorkSupported(s.frame)||s.mode!=='excavating'||s.link||s.unload||s.frame.job||s.frame.soil.pending||!s.frame.soil.containers.bucket.amount)return null;
 const f=s.frame,amount=f.soil.containers.bucket.amount,raised={...f.machineArm,boom:READY.boom},reach={...raised,stick:READY.stick},open={...reach,curl:READY.curl},end={...open};
 const points=[f.machineArm,raised,reach,reach,reach,open,open,open,end],kinds=['raise','clear','swing','lower','open','pour','lift','ready'];
 for(let i=1;i<points.length;i++)if(!(yield* segmentSteps(f,points[i-1],points[i])))return null;
 const path=points.slice(1).map((p,i)=>stage(kinds[i],points[i],p,kinds[i]==='pour'?LINK_POUR_SECONDS:undefined)),duration=path.reduce((n,p)=>n+p.duration,0),flowStart=path.slice(0,5).reduce((n,p)=>n+p.duration,0);
 const w=poseWork(f,open),pose=armPose(w),centre=bucketPourMouth(f,open),c=Math.cos(pose.heading),sn=Math.sin(pose.heading),area=transportArea(f),columns=[];
 const bucketBottom=Math.min(...bucketContactGeometry(w,pose).all.map(p=>p.min[1]));
 for(let x=Math.floor((centre[0]-12)/2);x<=Math.ceil((centre[0]+12)/2);x++)for(let z=Math.floor((centre[2]-12)/2);z<=Math.ceil((centre[2]+12)/2);z++){
  const px=x*2+1,pz=z*2+1,dx=px-centre[0],dz=pz-centre[2],side=c*dx-sn*dz,forward=sn*dx+c*dz;
  if(Math.abs(side)>9||Math.abs(forward)>6||px<area.minX+2||px>area.maxX-2||pz<area.minZ+2||pz>area.maxZ-2)continue;
  if(!allowProtected&&transportDigProtection(f,px,pz,1))continue;
  const h=excavatorGroundHeight(f,px,pz,0);if(!Number.isFinite(h)||Math.abs(h/2-Math.round(h/2))>1e-8)continue;
  columns.push({x,z,y:Math.round(h/2),radius:Math.hypot(side,forward),blocked:false});
 }
 if(!columns.length)return null;
 const obstacles=[...shovelMachines({...f,machineArm:open}),...shovelDumpObstacles(f),...nativeDeckBoxes(f),...shovelNearbySoil(f.soil,centre[0],centre[2],20)].filter(b=>{const e=boxExtent(b);return Math.abs(b.position[0]-centre[0])<e[0]+14&&Math.abs(b.position[2]-centre[2])<e[2]+14&&b.position[1]+e[1]>-80&&b.position[1]-e[1]<centre[1]+2;});
 // The bucket shell is the source of the stream, not an obstacle to its own
 // first escaping grain. Its endpoint is still protected by bucketBottom.
 const own=shovelMachines({...f,machineArm:open}).at(-1),fallObstacles=obstacles.filter(b=>b!==own),positions=[];
 const plan={kind:'ground-pour-v1',amount,path,duration,flowStart,flowEnd:flowStart+LINK_POUR_SECONDS,positions};
 for(let n=0;n<amount;n++){
  const choices=columns.filter(v=>!v.blocked).sort((a,b)=>(a.y+a.radius*.35)-(b.y+b.radius*.35)||a.radius-b.radius||a.x-b.x||a.z-b.z);let found=false;
  for(const col of choices){
   const q=[col.x,col.y,col.z],box={position:q.map(v=>v*2+1),half:[1,1,1]},parent=f.soil.blocks[q.map(v=>Math.floor(v/4)).join(',')];
   if(q[1]*2+2>=bucketBottom-1||soilVoxel(f.soil,q)||parent&&parent.materialId!==f.soil.containers.bucket.materialId||obstacles.some(b=>boxesOverlap3D(box,b))){col.blocked=true;continue;}
   positions.push(q);const flow=bucketGroundFlowBoxes(f,plan,positions.length-1);
   if(flow.some(b=>fallObstacles.some(o=>boxesOverlap3D(b,o)))){positions.pop();col.blocked=true;yield;continue;}
   col.y++;found=true;yield;break;
  }
  if(!found)return null;
 }
 plan.fallSeconds=positions.map((q,i)=>Math.sqrt(2*Math.max(0,bucketGroundFlowPoint(f,plan,i,0)[1]-(q[1]*2+1))/90));
 const flightEnd=Math.max(...plan.fallSeconds.map((seconds,i)=>seconds+LINK_POUR_SECONDS*i/Math.max(1,positions.length-1)));path[5].duration=flightEnd;plan.flowEnd=flowStart+flightEnd;plan.duration=path.reduce((n,p)=>n+p.duration,0);
 return plan;
}
export function bucketGroundPlan(s,{allowProtected=false}={}){const key=(allowProtected?'historical:':'current:')+groundSignature(s),entry=groundPlans.get(s.frame.soil);if(entry?.key===key)return entry.plan;const g=groundPlanSteps(s,{allowProtected});let n;do{n=g.next();}while(!n.done);const plan=freezePlan(n.value);groundPlans.set(s.frame.soil,{key,plan});return plan;}
export async function bucketGroundPlanAsync(s,yieldFrame=()=>new Promise(r=>setTimeout(r,0)),{allowProtected=false}={}){const key=(allowProtected?'historical:':'current:')+groundSignature(s),entry=groundPlans.get(s.frame.soil);if(entry?.key===key)return entry.plan;const g=groundPlanSteps(s,{allowProtected});let n,start=performance.now(),count=0;do{n=g.next();if(!n.done&&(++count>=24||performance.now()-start>=6)){await yieldFrame();start=performance.now();count=0;}}while(!n.done);const plan=freezePlan(n.value);groundPlans.set(s.frame.soil,{key,plan});return plan;}
export function startBucketGroundPour(s,operationId){
 idle(s);check(id(operationId),'操作番号が不正です。');const plan=bucketGroundPlan(s);check(plan,'バケットの下に土を置けないよ。旋回して、空いている地面へ向けよう。');check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の作業数が上限です。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,from:'bucket',to:'terrain',materialId:s.frame.soil.containers.bucket.materialId,amount:plan.amount,positions:plan.positions});
 groundChecks.set(plan,{soil,key:groundSignature(s),signature:canonical(plan)});return next(s,{...s.frame,soil},{link:{kind:'pour',id:operationId,plan,elapsed:0,returning:false}});
}
function validateGroundLink(s,j){
 exact(j,['kind','id','plan','elapsed','returning']);exact(j.plan,['kind','amount','path','duration','flowStart','flowEnd','positions','fallSeconds']);const p=s.frame.soil.pending,r=s.frame.soil.journal.at(-1);
 check(j.plan.kind==='ground-pour-v1'&&id(j.id)&&p?.id===j.id&&p.from==='bucket'&&p.to==='terrain'&&p.phase==='reserved'&&j.plan.amount===p.amount&&same(p.positions,j.plan.positions)&&finite(j.elapsed,0,j.plan.duration)&&(!j.returning||j.elapsed<j.plan.flowStart),'地面への予約と動きが一致しません。');
 check(r.type==='reserve'&&r.id===j.id+'_reserve'&&r.transferId===j.id&&r.from==='bucket'&&r.to==='terrain'&&r.amount===j.plan.amount&&same(r.positions,j.plan.positions),'地面へ置く履歴が不正です。');
 check(Array.isArray(j.plan.path)&&j.plan.path.length===8&&finite(j.plan.duration,LINK_POUR_SECONDS,45)&&same(s.frame.machineArm,bucketPlanPose(j.plan,j.elapsed)),'地面へ置く姿勢と時刻が不正です。');
 const signature=canonical(j.plan),old=groundChecks.get(j.plan),key=groundSignature({...s,frame:{...s.frame,machineArm:j.plan.path[0].from}});
 if(!old||old.soil!==s.frame.soil||old.key!==key||old.signature!==signature){const soil=soilTransportCommand(s.frame.soil,{type:'cancel',id:j.id+'_ground_validate',expectedRevision:s.frame.soil.revision,transferId:j.id}),frame={...s.frame,soil,machineArm:j.plan.path[0].from},original={...s,frame,link:null};frame.player=linkedExcavatorSeat(frame);check(same(bucketGroundPlan(original,{allowProtected:true}),j.plan),'地面へ置く経路・支持・落下先が一致しません。');groundChecks.set(j.plan,{soil:s.frame.soil,key,signature});}
}

// A warehouse count is picked up at its actual bin surface, never teleported
// into the truck. The last close respects the existing physical stop (24° on HUD).
const storagePlans=new WeakMap(),storageChecks=new WeakMap(),storageProofs=new Map();
// Save packing clones the same immutable journal several times. Certify/replay
// still runs first; this bounded cache only avoids repeating identical sweeps.
const storageProof=s=>canonical([s.frame.soil.initial,s.frame.soil.site,s.frame.soil.journal,s.frame.dump,s.frame.machineVehicle??null,s.link.plan]);
function rememberStorage(s){const proof=storageProof(s);storageProofs.delete(proof);storageProofs.set(proof,true);if(storageProofs.size>8)storageProofs.delete(storageProofs.keys().next().value);}
const STORAGE_KINDS=['raise','clear','swing','above','lower','cut','clearBin','lift','ready','close'];
export function bucketStorageClear(frame,arm){
 if(!linkedArmClear(frame,arm))return false;
 const bin=nativeStorageBin(frame),w=poseWork(frame,arm),p=armPose(w),floor={position:[bin.x,1.5,bin.z],half:[bin.width/2,1.5,bin.depth/2]};
 return !bucketContactGeometry(w,p).all.some(part=>boxContact(part,floor))&&!p.world.slice(0,2).some((v,i)=>shovelSegmentHits([v.x,v.y,v.z],[p.world[i+1].x,p.world[i+1].y,p.world[i+1].z],floor,2.8));
}
function* storageSegmentSteps(f,a,b){const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(b[k]-a[k])/.006)));check(n<=1100,'箱への移動が長すぎます。');for(let i=0;i<=n;i++){if(!bucketStorageClear(f,interpolate(a,b,i/n)))return false;yield;}return true;}
function* storagePlanSteps(s){
 if(!excavatorWorkSupported(s.frame))return null;
 if(s.mode!=='excavating'||s.link||s.unload||s.frame.job||s.frame.soil.pending||s.frame.soil.containers.bucket.amount||!s.frame.soil.containers.storage.amount)return null;
 const f=s.frame,bin=nativeStorageBin(f),w=poseWork(f),amount=Math.min(f.soil.containers.storage.amount,SOIL_CAPACITY.bucket);
 if(bin.clustered&&Math.hypot(f.machineVehicle.x-bin.x,f.machineVehicle.z-bin.z)>170)return null;
 const left=[bin.x-bin.width/2+3,3.12,bin.z-bin.depth/2+3],right=[bin.x+bin.width/2-3,4.72,bin.z+bin.depth/2-3];
 const xs=bin.clustered?[0,2,-2,6,-6]:[0,2,6],zs=bin.clustered?[0,-6,6,-10,10]:[-10,-6,0];
 for(const dx of xs)for(const dz of zs){
  const x=bin.x+dx,z=bin.z+dz;
  const open=solveBucketPose(w,{x,y:16,z},-1.25),cut=solveBucketPose(w,{x,y:12,z},-.5),high=solveBucketPose(w,{x,y:40,z},-1.25),highCut=solveBucketPose(w,{x,y:30,z},-.5);
  if([open,cut,high,highCut].some(a=>!a||a.stick>-Math.PI/6))continue;
  const teeth=bucketContactGeometry({...w,arm:cut},armPose({...w,arm:cut})).teeth;
  if(!teeth.some(p=>prismTouchesBox(p,left,right)))continue;
  const raised={...f.machineArm,boom:READY.boom},reach={...READY,slew:raised.slew},above={...reach,slew:open.slew},lift={...cut,boom:READY.boom},reset={...lift,stick:READY.stick},closed={...reset,curl:23.7*Math.PI/180};
  const points=[f.machineArm,raised,reach,above,high,open,cut,highCut,lift,reset,closed];
  let safe=true;for(let i=1;i<points.length;i++)if(!(yield* storageSegmentSteps(f,points[i-1],points[i]))){safe=false;break;}if(!safe)continue;
  const path=points.slice(1).map((p,i)=>stage(STORAGE_KINDS[i],points[i],p)),duration=path.reduce((n,p)=>n+p.duration,0),cutStart=path.slice(0,5).reduce((n,p)=>n+p.duration,0);
  let contact=null;for(let i=0;i<=256;i++){const arm=interpolate(open,cut,i/256),pose={...w,arm};if(bucketContactGeometry(pose,armPose(pose)).teeth.some(p=>prismTouchesBox(p,left,right))){contact=i/256;break;}yield;}
  if(contact===null||contact===1||duration>45)continue;const flowStart=cutStart+path[5].duration*contact;return{amount,path,duration,flowStart,flowEnd:cutStart+path[5].duration};
 }return null;
}
export function bucketStoragePlan(s){const key=planKey(s),e=storagePlans.get(s.frame.soil);if(e?.key===key)return e.plan;const g=storagePlanSteps(s);let n;do{n=g.next();}while(!n.done);const plan=freezePlan(n.value);storagePlans.set(s.frame.soil,{key,plan});return plan;}
export async function bucketStoragePlanAsync(s,yieldFrame=()=>new Promise(r=>setTimeout(r,0))){const key=planKey(s),e=storagePlans.get(s.frame.soil);if(e?.key===key)return e.plan;const g=storagePlanSteps(s);let n,count=0;do{n=g.next();if(!n.done&&++count%8===0)await yieldFrame();}while(!n.done);const plan=freezePlan(n.value);storagePlans.set(s.frame.soil,{key,plan});return plan;}
export function startBucketStorage(s,operationId){
 idle(s);check(id(operationId),'操作番号が不正です。');const plan=bucketStoragePlan(s);check(plan,'箱の土がないか、バケットの通り道がふさがっています。');check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の作業数が上限です。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,from:'storage',to:'bucket',materialId:s.frame.soil.containers.storage.materialId,amount:plan.amount,positions:[]});
 storageChecks.set(plan,{soil,dump:canonical([s.frame.dump,s.frame.machineVehicle??null]),signature:canonical(plan)});const result=next(s,{...s.frame,soil},{link:{kind:'storage',id:operationId,plan,elapsed:0,returning:false}});rememberStorage(result);return result;
}
export function linkedStorageVisual(s){const j=s.link;if(j?.kind!=='storage')return{portion:0,bucket:s.frame.soil.containers.bucket.amount,sourceVisible:false};const portion=Math.max(0,Math.min(1,(j.elapsed-j.plan.flowStart)/(j.plan.flowEnd-j.plan.flowStart)));return{portion,bucket:s.frame.soil.pending.amount*portion,sourceVisible:portion<1};}
function validateStorageLink(s,j){
 exact(j,['kind','id','plan','elapsed','returning']);exact(j.plan,['amount','path','duration','flowStart','flowEnd']);const p=s.frame.soil.pending;
 check(id(j.id)&&p?.id===j.id&&p.from==='storage'&&p.to==='bucket'&&p.phase==='reserved'&&p.positions.length===0&&j.plan.amount===p.amount&&finite(j.elapsed,0,j.plan.duration)&&j.returning===false,'箱の予約と動きが一致しません。');
 check(Array.isArray(j.plan.path)&&j.plan.path.length===10&&finite(j.plan.duration,.15,45),'箱の動作区分が不正です。');
 for(const seg of j.plan.path){exact(seg,['kind','from','to','duration']);armValid(seg.from);armValid(seg.to);check(finite(seg.duration,.15,12),'動作時間が不正です。');}
 const r=s.frame.soil.journal.at(-1);check(r.type==='reserve'&&r.id===j.id+'_reserve'&&r.transferId===j.id&&r.from==='storage'&&r.to==='bucket'&&r.amount===j.plan.amount,'箱の履歴が一致しません。');
 check(same(s.frame.machineArm,bucketPlanPose(j.plan,j.elapsed)),'箱から取り出す途中の姿勢が一致しません。');
 const key=canonical([s.frame.dump,s.frame.machineVehicle??null]),signature=canonical(j.plan),cached=storageChecks.get(j.plan);
 if(!cached||cached.soil!==s.frame.soil||cached.dump!==key||cached.signature!==signature){
  if(storageProofs.has(storageProof(s))){storageChecks.set(j.plan,{soil:s.frame.soil,dump:key,signature});return;}
  // Reconstruct the pre-reservation count through the same checked journal.
  // This temporary value is never persisted or installed into the session.
  const soil=soilTransportCommand(s.frame.soil,{type:'cancel',id:j.id+'_validate',expectedRevision:s.frame.soil.revision,transferId:j.id});
  const frame={...s.frame,soil,machineArm:j.plan.path[0].from},original={...s,frame,link:null};frame.player=linkedExcavatorSeat(frame);
  check(same(bucketStoragePlan(original),j.plan),'箱への接触・経路・土量が一致しません。');rememberStorage(s);storageChecks.set(j.plan,{soil:s.frame.soil,dump:key,signature});
 }
}

export function bucketPlanPose(plan,time){let t=time;for(const p of plan.path){if(t<=p.duration)return interpolate(p.from,p.to,Math.max(0,Math.min(1,t/p.duration)));t-=p.duration;}return{...plan.path.at(-1).to};}
export function bucketAccessPathClear(path,boxes){
 const r=WALKER.radius,h=WALKER.height,min=[Math.min(...path.map(p=>p.x))-r,Math.min(...path.map(p=>p.y)),Math.min(...path.map(p=>p.z))-r],max=[Math.max(...path.map(p=>p.x))+r,Math.max(...path.map(p=>p.y))+h,Math.max(...path.map(p=>p.z))+r];
 const nearby=boxes.filter(b=>{const e=boxExtent(b);return e.every((n,i)=>b.position[i]+n>min[i]+.05&&b.position[i]-n<max[i]-.05);});
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.3));for(let j=0;j<=steps;j++){const t=j/steps,body={position:[a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t+h/2,a.z+(b.z-a.z)*t],half:[r,h/2,r]};if(nearby.some(b=>boxesOverlap3D(body,b,.05)))return false;}}
 return true;
}
export function linkedAccessTarget(s,boarding=true){
 if(s.link||s.unload||s.frame.job||s.frame.soil.pending||s.mode!==(boarding?'foot':'excavating'))return null;const f=s.frame,w=poseWork(f),v=w.loader.vehicle;
 const dump=shovelDumpObstacles(f),g=w.groundPose;
 for(const side of[-1,1]){
  let path=cabPath(f,side,boarding);
  const first=path[0],p=f.player;
  if(boarding&&(Math.hypot(first.x-p.x,first.z-p.z)>10||Math.abs(p.y-first.y)>2.1||!shovelStanding(f,p)))continue;
  path=[{...p},...path];
  if(!path.every(q=>[q.x,q.y,q.z].every(Number.isFinite))||!boarding&&!shovelStanding(f,path.at(-1)))continue;
  // Fetch soil intersecting the enclosing walk corridor before the exact swept
  // contact tests. Distant cubes cannot affect either door or its treads.
  const xs=path.map(q=>q.x),zs=path.map(q=>q.z);
  const x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
  const r=Math.max(x1-x0,z1-z0)/2+WALKER.radius;
  const boxes=[...dump,...shovelNearbySoil(f.soil,(x0+x1)/2,(z0+z1)/2,r)];
  const obstacles=g?[]:boxes.map(b=>{
   const h=b.axes?boxExtent(b):b.half??Array(3).fill(b.size/2);
   return{x:b.position[0],z:b.position[2],width:h[0]*2,depth:h[2]*2,y:b.position[1]-h[1],height:h[1]*2,angle:b.axes?0:b.heading??0};
  });
  const localPath=g?path.map(p=>{const q=groundLocal(g,[p.x,p.y,p.z]),c=Math.cos(v.heading),s=Math.sin(v.heading);return{...p,x:v.x+c*q[0]+s*q[2],y:q[1],z:v.z-s*q[0]+c*q[2]};}):path;
  if(!excavatorAccessClear(localPath,v,obstacles)||g&&!bucketAccessPathClear(path,boxes))continue;
  return{side,path};
 }return null;
}
function pathAt(path,u,gradualTurn){
 const first=path[0];
 if(!u)return{...first};
 const distances=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y,p.z-path[i].z));
 const total=distances.reduce((a,b)=>a+b,0);
 // Keep older in-progress boarding on its saved turn curve.
 const turn=Math.min(1,u/(gradualTurn?.75:.18));
 const turnProgress=gradualTurn?turn*turn*(3-2*turn):turn;
 const face=heading(first.heading+heading(path.at(-1).heading-first.heading)*turnProgress);
 let d=total*u;
 for(let i=0;i<distances.length;i++){
  if(d<=distances[i]||i===distances.length-1){
   const t=distances[i]?Math.min(1,d/distances[i]):1,a=path[i],b=path[i+1];
   return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,heading:face,travel:first.travel+total*u};
  }
  d-=distances[i];
 }
}
function accessPath(s,j){return[{...j.fromPlayer},...cabPath(s.frame,j.side,j.kind==='board')];}
export function createBucketDumpWork(source){
 const b=createDumpWork(source),w=shovelMachineState(b.frame);check(isContactDig(w)&&isBackhoe(w)&&b.frame.soil.containers.bucket.amount>0,'停止した接触掘削ショベルの持ち土が必要です。');
 const loc=localToWorld(w.loader.vehicle,80,13),frame={...b.frame,dump:{x:loc.x,z:loc.z,heading:w.loader.vehicle.heading},machineArm:{...w.arm}};const path=cabPath(frame,-1);frame.player={...frame.player,...path[0],travel:0};
 return validateBucketDumpWork({...b,format:BUCKET_DUMP_FORMAT,scope:BUCKET_DUMP_SCOPE,frame,link:null});
}
export function startBucketAccess(s,boarding){idle(s);const target=linkedAccessTarget(s,boarding);check(target,boarding?'運転席横の黄色い目印へ近づいてください。':'ドア横がふさがっています。');return next(s,s.frame,{mode:'excavating',link:{kind:boarding?'board':'leave',side:target.side,fromPlayer:{...s.frame.player},elapsed:0,duration:boarding?.60:.65,returning:false,...(boarding?{gradualTurn:true}:{})}});}
function startBucketContainerPour(s,operationId,destination){
 idle(s);check(id(operationId),'操作番号が不正です。');
 const inBin=destination==='storage',plan=(inBin?bucketStorageDepositPlan:bucketDumpPlan)(s);
 check(plan,inBin?'保管庫にアームが届く位置へ移動してください。通り道と保管庫の空きを確認しましょう。':'荷台の位置か通り道を確認してください。届く場所へダンプを停め、荷台を空けてください。');
 check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の作業数が上限です。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,from:'bucket',to:destination,materialId:s.frame.soil.containers.bucket.materialId,amount:plan.amount,positions:[]});
 planChecks.set(plan,{soil,dump:canonical([s.frame.dump,s.frame.machineVehicle??null]),signature:canonical(plan)});return next(s,{...s.frame,soil},{link:{kind:'pour',id:operationId,plan,elapsed:0,returning:false}});
}
export const startBucketPour=(s,operationId)=>startBucketContainerPour(s,operationId,'dump');
export const startBucketStorageDeposit=(s,operationId)=>startBucketContainerPour(s,operationId,'storage');
export function linkedPourVisual(s){
 const j=s.link;if(j?.kind!=='pour')return{portion:0,bucket:s.frame.soil.containers.bucket.amount,cargo:s.frame.soil.containers.dump.amount,mouth:null,progress:0};
 const amt=s.frame.soil.pending.amount,elapsed=j.elapsed-j.plan.flowStart,emitted=Math.max(0,Math.min(1,elapsed/LINK_POUR_SECONDS));
 if(j.plan.kind==='ground-pour-v1'){
  const settled=[],particles=[],count=j.plan.positions.length;
  for(let i=0;i<count;i++){const release=LINK_POUR_SECONDS*i/Math.max(1,count-1);if(elapsed>=release+j.plan.fallSeconds[i])settled.push(j.plan.positions[i]);}
  for(let n=0;n<24;n++){const i=Math.round(n*(count-1)/23),age=elapsed-LINK_POUR_SECONDS*i/Math.max(1,count-1),fall=j.plan.fallSeconds[i];if(age>0&&age<fall)particles.push(bucketGroundFlowPoint(s.frame,j.plan,i,age/fall));}
  return{portion:Math.max(0,Math.min(1,elapsed/(j.plan.flowEnd-j.plan.flowStart))),bucket:s.frame.soil.containers.bucket.amount+amt*(1-emitted),cargo:s.frame.soil.containers.dump.amount,mouth:bucketPourMouth(s.frame),progress:j.elapsed/j.plan.duration,groundPositions:j.plan.positions,groundPlan:j.plan,groundLanded:settled.length,groundSettledPositions:settled,groundParticles:particles};
 }
 if(j.plan.kind==='storage-drop-v1'){
  const particles=[],mouth=bucketPourMouth(s.frame),bottom=6,flight=Math.sqrt(2*Math.max(0,mouth[1]-bottom)/100);
  const emitUntil=Math.max(.18,LINK_POUR_SECONDS-flight);
  for(let i=0;i<24;i++){
   const age=elapsed-emitUntil*i/23;
   if(age>0&&age<flight) {
    const p=bucketPourMouth(s.frame,(i%7-3)*2);
    particles.push([p[0],Math.max(bottom,p[1]-50*age*age),p[2]]);
   }
  }
  const emitted=Math.max(0,Math.min(1,elapsed/emitUntil));
  return{portion:emitted,bucket:s.frame.soil.containers.bucket.amount+amt*(1-emitted),cargo:s.frame.soil.containers.dump.amount,mouth,progress:j.elapsed/j.plan.duration,groundParticles:particles};
 }
 return{portion:emitted,bucket:s.frame.soil.containers.bucket.amount+amt*(1-emitted),cargo:s.frame.soil.containers.dump.amount+amt*emitted,mouth:bucketPourMouth(s.frame),progress:j.elapsed/j.plan.duration};
}
export function progressBucketLink(s,dt){check(s.link&&finite(dt,0,.05),'進行時間が不正です。');const j=s.link,duration=['pour','storage'].includes(j.kind)?j.plan.duration:j.duration,elapsed=j.returning?Math.max(0,j.elapsed-dt):Math.min(duration,j.elapsed+dt),link={...j,elapsed};let f=s.frame;
 if(['pour','storage'].includes(j.kind)){f={...f,machineArm:bucketPlanPose(j.plan,elapsed)};f.player=linkedExcavatorSeat(f);}else f={...f,player:pathAt(accessPath(s,j),elapsed/duration,j.gradualTurn)};
 return next(s,f,{link});
}
export const bucketLinkReady=s=>!!s.link&&(s.link.returning?s.link.elapsed===0:s.link.elapsed===(['pour','storage'].includes(s.link.kind)?s.link.plan.duration:s.link.duration));
export function cancelBucketPour(s){check(s.link?.kind==='pour'&&s.link.elapsed<s.link.plan.flowStart,'放し始めた土は戻せません。メニューで一時停止し、続きから再開できます。');return next(s,s.frame,{link:{...s.link,returning:true}});}
export function finishBucketLink(s){check(bucketLinkReady(s),'動作の終了を待ってください。');const j=s.link;let f=s.frame,mode=s.mode;if(['pour','storage'].includes(j.kind)){
  const revision=f.soil.revision;
  let soil;
  if(j.returning)soil=soilTransportCommand(f.soil,{type:'cancel',id:j.id+'_cancel',expectedRevision:revision,transferId:j.id});
  else{
   const transferId=j.id;
   const release={type:'release',id:transferId+'_release',expectedRevision:revision,transferId};
   const complete={type:'complete',id:transferId+'_complete',expectedRevision:revision+1,transferId};
   soil=f.soil.pending?.from==='bucket'&&f.soil.pending.to==='dump'
    ?soilTransportCommands(f.soil,[release,complete])
    :soilTransportCommand(soilTransportCommand(f.soil,release),complete);
  }
  f={...f,soil};
 }else mode=j.kind==='board'?'excavating':'foot';return next(s,f,{mode,link:null});}
export const bucketSlewAngle=(slew,axis,dt)=>Math.max(-EX.slewLimit,Math.min(EX.slewLimit,slew-axis*.62*dt));
export function slewBucketWork(s,axis,dt){idle(s);check(s.mode==='excavating'&&finite(axis,-1,1)&&finite(dt,Number.EPSILON,.05),'旋回の入力が不正です。');if(!axis)return s;const a=s.frame.machineArm,h=bucketSlewAngle(a.slew,axis,dt),arm={...a,slew:h};if(!segmentClear(s.frame,a,arm))return s;let f={...s.frame,machineArm:arm};f.player=linkedExcavatorSeat(f);return next(s,f);}
export function adjustBucketArmWork(s,joint,axis,dt){
 idle(s);
 check(s.mode==='excavating'&&s.frame.version===2&&['boom','stick'].includes(joint)&&finite(axis,-1,1)&&finite(dt,Number.EPSILON,.05),'アーム操作を確認してください。');
 const current=s.frame.machineArm,[min,max]=joint==='boom'?[EX.boomMin,EX.boomMax]:[-2.55,READY.stick];
 const angle=Math.max(min,Math.min(max,current[joint]+axis*speed[joint]*dt));
 if(angle===current[joint])return s;
 const arm={...current,[joint]:angle};
 if(!segmentClear(s.frame,current,arm))return s;
 const frame={...s.frame,machineArm:arm};
 frame.player=linkedExcavatorSeat(frame);
 return next(s,frame);
}
export function validateBucketDumpWork(s){
 exact(s,['format','scope','version','revision','frame','mode','vehicleTravel','wheelTravel','unload','link']);check(s.format===BUCKET_DUMP_FORMAT&&s.scope===BUCKET_DUMP_SCOPE&&s.version===1&&['foot','driving','excavating'].includes(s.mode),'専用のショベル積込保存が必要です。');armValid(s.frame.machineArm);
 const inBin=s.link?.plan?.kind==='storage-drop-v1',destination=inBin?'storage':'dump';
 validateDumpWork(legacy(s),{liveArm:true,aboardExcavator:s.mode==='excavating',bucketTransfer:s.link?.kind==='pour'?(s.link.plan.kind==='ground-pour-v1'?'ground':inBin?'storage':true):false,storageTransfer:s.link?.kind==='storage'});check(linkedArmClear(s.frame),'アーム・バケットの通り道がふさがっています。');if(s.frame.version===2)check(transportExcavatorPositionSafe(s.frame),'ショベルの車体や足元がふさがっています。');
 if(s.mode==='excavating'){check(!s.unload&&!s.frame.job,'乗車中の手作業はできません。');if(!s.link||['pour','storage'].includes(s.link.kind)){const p=linkedExcavatorSeat(s.frame);check(['x','y','z','heading'].every(k=>Math.abs(p[k]-s.frame.player[k])<1e-8),'人物がショベルの運転席にいません。');}}
 if(s.link){const j=s.link;check(s.mode==='excavating'&&!s.unload&&!s.frame.job&&typeof j.returning==='boolean','別の動作と重なっています。');if(j.kind==='storage'){validateStorageLink(s,j);}else if(j.kind==='pour'&&j.plan?.kind==='ground-pour-v1'){validateGroundLink(s,j);}else if(j.kind==='pour'){
   const direct=j.plan.kind===DIRECT_DUMP_PLAN;
   exact(j,['kind','id','plan','elapsed','returning']);exact(j.plan,['amount','path','duration','flowStart','flowEnd',...(inBin||direct?['kind']:[])]);const p=s.frame.soil.pending;
   check(id(j.id)&&p?.id===j.id&&p.from==='bucket'&&p.to===destination&&p.phase==='reserved'&&j.plan.amount===p.amount&&finite(j.elapsed,0,j.plan.duration)&&(!j.returning||j.elapsed<j.plan.flowStart),'予約と動きが一致しません。');
   const r=s.frame.soil.journal.at(-1);check(r.type==='reserve'&&r.id===j.id+'_reserve'&&r.transferId===j.id&&r.from==='bucket'&&r.to===destination&&r.amount===j.plan.amount,'予約の履歴が不正です。');
   const kinds=direct?['open','pour','ready']:['raise','clear','swing','lower','open','pour','lift','ready'];
   const pourIndex=kinds.indexOf('pour');
   check(Array.isArray(j.plan.path)&&j.plan.path.length===kinds.length&&finite(j.plan.duration,LINK_POUR_SECONDS,45),'動作の区分が不正です。');let t=0;
   for(let i=0;i<kinds.length;i++){const seg=j.plan.path[i];exact(seg,['kind','from','to','duration']);armValid(seg.from);armValid(seg.to);check(seg.kind===kinds[i]&&finite(seg.duration,.15,12)&&(!i||same(j.plan.path[i-1].to,seg.from)),'動作の接続が不正です。');if(i===pourIndex)check(seg.duration===LINK_POUR_SECONDS&&same(seg.from,seg.to)&&(inBin?storageMouthFits:mouthFits)(s.frame,seg.from),'土が受け入れ先へ落ちる位置にありません。');t+=seg.duration;}
   const path=j.plan.path,near=(a,b)=>Math.abs(a-b)<1e-8,hold=(n,ks)=>ks.every(k=>near(path[n].from[k],path[n].to[k]));
   if(direct){
    check([0,2].every(i=>hold(i,['boom','stick','slew']))&&near(path[0].to.curl,READY.curl)&&near(path[2].to.curl,s.frame.soil.containers.bucket.amount?path[0].from.curl:READY.curl),'荷台の上でバケットを開く姿勢が不正です。');
   }else check(hold(0,['stick','curl','slew'])&&near(path[0].to.boom,READY.boom)&&hold(1,['boom','curl','slew'])&&near(path[1].to.stick,READY.stick)&&hold(2,['boom','stick','curl'])&&hold(3,['slew','curl'])&&hold(4,['slew'])&&near(path[4].to.curl,READY.curl)&&hold(6,['stick','slew'])&&hold(7,['boom','curl','slew'])&&near(path[7].to.boom,READY.boom)&&near(path[7].to.stick,READY.stick)&&near(path[7].to.curl,s.frame.soil.containers.bucket.amount?path[0].from.curl:READY.curl),'一連の積込みの姿勢が不正です。');
   check(Math.abs(t-j.plan.duration)<1e-8&&Math.abs(j.plan.flowStart-j.plan.path.slice(0,pourIndex).reduce((n,p)=>n+p.duration,0))<1e-8&&j.plan.flowEnd===j.plan.flowStart+LINK_POUR_SECONDS,'動作の時刻が不正です。');check(same(s.frame.machineArm,bucketPlanPose(j.plan,j.elapsed)),'現在のアームと保存した途中が一致しません。');
   const key=canonical([s.frame.dump,s.frame.machineVehicle??null]),signature=canonical(j.plan),cached=planChecks.get(j.plan);if(!cached||cached.soil!==s.frame.soil||cached.dump!==key||cached.signature!==signature){check(j.plan.path.every(seg=>segmentClear(s.frame,seg.from,seg.to)),'保存した積込経路がふさがっています。');planChecks.set(j.plan,{soil:s.frame.soil,dump:key,signature});}
  }else{
   const gradual=Object.hasOwn(j,'gradualTurn');
   exact(j,['kind','side','fromPlayer','elapsed','duration','returning',...(gradual?['gradualTurn']:[])]);
   check(!gradual||j.kind==='board'&&j.gradualTurn===true,'乗車時の向きの記録が不正です。');
   check(['board','leave'].includes(j.kind)&&[-1,1].includes(j.side)&&(j.kind==='board'?[.60,1.9]:[.65,2.1]).includes(j.duration)&&j.returning===false&&finite(j.elapsed,0,j.duration),'乗降の保存が不正です。');exact(j.fromPlayer,['x','y','z','heading','travel']);const path=accessPath(s,j),p=pathAt(path,j.elapsed/j.duration,j.gradualTurn);check(['x','y','z','heading','travel'].every(k=>Math.abs(p[k]-s.frame.player[k])<1e-8),'乗降経路と人物が一致しません。');
   check(Object.values(j.fromPlayer).every(Number.isFinite)&&j.fromPlayer.travel>=0,'乗降前の人物が不正です。');if(j.kind==='leave'){const seat=linkedExcavatorSeat(s.frame);check(['x','y','z','heading'].every(k=>Math.abs(seat[k]-j.fromPlayer[k])<1e-8),'降車前に運転席にいません。');}
   const start={...s,link:null,mode:j.kind==='board'?'foot':'excavating',frame:{...s.frame,player:j.fromPlayer}};check(linkedAccessTarget(start,j.kind==='board')?.side===j.side,'乗降を始める位置が不正です。');
  }
 }else check(!s.frame.soil.pending||!!s.unload||!!s.frame.job,'途中の土に作業がありません。');return s;
}
export function validateBucketDumpContinuation(a,b){validateBucketDumpWork(a);validateBucketDumpWork(b);check(a.frame.version===b.frame.version&&same(a.frame.soil.field??null,b.frame.soil.field??null)&&same(a.frame.soil.site,b.frame.soil.site)&&same(a.frame.soil.initial,b.frame.soil.initial),'別の現場へ切り替えられません。');check(b.frame.soil.journal.length>=a.frame.soil.journal.length&&a.frame.soil.journal.every((c,i)=>same(c,b.frame.soil.journal[i])),'古い土へ巻き戻せません。');check(b.revision>=a.revision&&b.frame.revision>=a.frame.revision&&b.vehicleTravel>=a.vehicleTravel&&b.frame.player.travel>=a.frame.player.travel,'古い動きへ巻き戻せません。');check(b.revision!==a.revision||same(a,b),'同じ保存番号の内容が不正です。');return b;}
const wrap=fn=>(s,...args)=>{idle(s);return fn(s,...args);};
export const walkBucketSite=wrap(walkDumpWork),turnBucketWalker=wrap(turnDumpWalker),driveBucketSite=wrap(driveDumpWork),boardBucketSiteDump=wrap(boardDumpWork),leaveBucketSiteDump=wrap(leaveDumpWork),startBucketSiteHand=wrap(startDumpHandWork),startBucketSiteUnload=wrap(startDumpUnload),startBucketSiteStorage=wrap(startDumpStorage);
export {dumpBoardTarget,dumpUnloadPlan,dumpStoragePlan,progressDumpUnload,finishDumpUnload,cancelDumpUnload,progressDumpHandWork,finishDumpHandWork,returnDumpHandWork};
function checksum(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packBucketDumpWork(s){validateBucketDumpWork(s);return JSON.stringify({kind:BUCKET_DUMP_FORMAT,checksum:checksum(canonical(s)),state:s});}
export function unpackBucketDumpWork(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+131072,'保存が大きすぎます。');const p=JSON.parse(text);exact(p,['kind','checksum','state']);check(p.kind===BUCKET_DUMP_FORMAT&&p.checksum===checksum(canonical(p.state)),'保存の検査に失敗しました。');return validateBucketDumpWork(p.state);}
