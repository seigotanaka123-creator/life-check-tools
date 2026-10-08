import {nativeDumpBox,nativeDumpLocal,boxAxes,boxLocal,boxExtent} from './imasora-construction-native-dump-pose.mjs';
import {canonical} from './imasora-construction-state.js';
import {createDumpWork,validateDumpWork,DUMP_WORK_FORMAT,DUMP_WORK_SCOPE,walkDumpWork,turnDumpWalker,driveDumpWork,boardDumpWork,leaveDumpWork,dumpBoardTarget,dumpUnloadPlan,dumpStoragePlan,startDumpStorage,startDumpUnload,progressDumpUnload,finishDumpUnload,cancelDumpUnload,startDumpHandWork,progressDumpHandWork,finishDumpHandWork,returnDumpHandWork} from './imasora-construction-dump-work.mjs';
import {shovelMachineState,shovelMachines,shovelSoilBoxes,shovelSegmentHits,shovelDumpObstacles,shovelDumpPoint,shovelStanding} from './imasora-construction-shovel-work.mjs';
import {armPose,armIntersections,solveBucketPose,EX} from './imasora-construction-excavator.js';
import {bucketContactGeometry,prismTouchesBox} from './imasora-construction-excavator-contact.js';
import {bucketPoint,isContactDig,isBackhoe} from './imasora-construction-excavator-bucket.js';
import {excavatorAccessPath,excavatorAccessClear,EX_ACCESS} from './imasora-construction-excavator-access.js';
import {LOADER,localToWorld} from './imasora-construction-loader-physics.js';
import {soilTransportCommand,SOIL_LIMITS,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs';

export const BUCKET_DUMP_FORMAT='imasora-shared-bucket-dump-checkpoint-v1';
export const BUCKET_DUMP_SCOPE='imasora-shared-bucket-dump-isolated-v1';
export const LINK_POUR_SECONDS=1.2;
const READY={boom:74*Math.PI/180,stick:-Math.PI/6,curl:-1.25};
const axes=['boom','stick','curl','slew'],speed={boom:.5,stick:.65,curl:.75,slew:.62},planChecks=new WeakMap(),obstacleCache=new WeakMap(),plans=new WeakMap();
const check=(ok,text)=>{if(!ok)throw Error('荷台への積込み：'+text);};
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const exact=(v,ks)=>check(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...ks].sort().join('|'),'保存の項目が不正です。');
const same=(a,b)=>canonical(a)===canonical(b);
function freezePlan(value){if(value&&typeof value==='object'){for(const v of Object.values(value))freezePlan(v);Object.freeze(value);}return value;}
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(v);
const heading=n=>Math.atan2(Math.sin(n),Math.cos(n));
const cabPath=(f,side,board=true)=>excavatorAccessPath(poseWork(f).loader.vehicle,f.machineArm.slew,side,board).map(p=>({...p,heading:heading(p.heading)}));
const legacy=s=>({format:DUMP_WORK_FORMAT,scope:DUMP_WORK_SCOPE,version:1,revision:s.revision,frame:s.frame,mode:s.mode==='excavating'?'foot':s.mode,vehicleTravel:s.vehicleTravel,wheelTravel:s.wheelTravel,unload:s.unload});
const idle=s=>check(!s.link&&!s.unload&&!s.frame.job&&!s.frame.soil.pending,'今の作業を終えるか、メニューで一時停止してください。');
const next=(s,frame,extra={})=>({...s,revision:s.revision+1,frame:{...frame,revision:s.frame.revision+1},...extra});
const poseWork=(frame,arm=frame.machineArm)=>({...shovelMachineState(frame),arm,terrain:{},spoil:[],falling:[],load:frame.soil.containers.bucket.amount/64});
export function linkedExcavatorSeat(frame){const w=poseWork(frame),v={...w.loader.vehicle,heading:w.loader.vehicle.heading+frame.machineArm.slew},p=localToWorld(v,LOADER.seatX,LOADER.seatZ);return{...frame.player,x:p.x,y:EX_ACCESS.floor,z:p.z,heading:Math.atan2(Math.sin(v.heading),Math.cos(v.heading))};}
function armValid(a){exact(a,axes);check(finite(a.boom,EX.boomMin,EX.boomMax)&&finite(a.stick,-2.55,-Math.PI/6+1e-8)&&finite(a.curl,-1.25,1.1)&&finite(a.slew,-EX.slewLimit,EX.slewLimit),'アームの範囲が不正です。');}
function boxContact(prism,box){
 const half=box.half??Array(3).fill(box.size/2),h=box.heading??0;
 const extent=boxExtent(box);
 if(extent.some((v,i)=>prism.min[i]>box.position[i]+v||prism.max[i]<box.position[i]-v))return false;
 if(!h&&!box.axes)return prismTouchesBox(prism,box.position.map((v,i)=>v-half[i]),box.position.map((v,i)=>v+half[i]));
 const basis=boxAxes(box),turn=v=>basis.map(a=>a.reduce((sum,n,i)=>sum+n*v[i],0)),vertices=prism.vertices.map(v=>boxLocal(v,box)),aa=prism.axes.map(turn),ranges=aa.map(a=>{const ds=vertices.map(v=>v.reduce((n,x,i)=>n+x*a[i],0));return[Math.min(...ds),Math.max(...ds)];});
 return prismTouchesBox({vertices,axes:aa,ranges,min:[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i]))),max:[0,1,2].map(i=>Math.max(...vertices.map(v=>v[i])))},half.map(v=>-v),half);
}
function cargoBox(f){const amount=f.soil.containers.dump.amount;if(!amount)return null;const vol=amount*8,w=Math.min(48,Math.max(4,Math.sqrt(vol/4))),d=Math.min(29,Math.max(4,vol/(w*4))),height=vol/(w*d);return nativeDumpBox(f,[-24+w/2,17+height/2,-22],[w/2,height/2,d/2]);}
export function linkedArmClear(frame,arm=frame.machineArm){
 const w=poseWork(frame,arm),p=armPose(w);if(armIntersections(w).size)return false;
 const parts=bucketContactGeometry(w,p).all,key=canonical(frame.dump);let entry=obstacleCache.get(frame.soil);if(!entry||entry.key!==key){const cargo=cargoBox(frame);entry={key,boxes:[...shovelDumpObstacles(frame),...shovelSoilBoxes(frame.soil),...(cargo?[cargo]:[])]};obstacleCache.set(frame.soil,entry);}
 const min=[0,1,2].map(i=>Math.min(...p.world.map(v=>[v.x,v.y,v.z][i]-2.8),...parts.map(p=>p.min[i]))),max=[0,1,2].map(i=>Math.max(...p.world.map(v=>[v.x,v.y,v.z][i]+2.8),...parts.map(p=>p.max[i])));
 for(const b of entry.boxes){const extent=boxExtent(b);if(extent.some((v,i)=>min[i]>b.position[i]+v||max[i]<b.position[i]-v))continue;
  for(let n=0;n<2;n++)if(shovelSegmentHits([p.world[n].x,p.world[n].y,p.world[n].z],[p.world[n+1].x,p.world[n+1].y,p.world[n+1].z],b,2.8))return false;
  if(parts.some(part=>boxContact(part,b)))return false;
 }
 return true;
}
const interpolate=(a,b,u)=>Object.fromEntries(axes.map(k=>[k,a[k]+(b[k]-a[k])*u]));
function segmentClear(f,a,b){const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(b[k]-a[k])/.006)));check(n<=1100,'予定の移動が長すぎます。');for(let i=0;i<=n;i++)if(!linkedArmClear(f,interpolate(a,b,i/n)))return false;return true;}
function localDump(f,p){return nativeDumpLocal(f,p);}
export function bucketPourMouth(frame,arm=frame.machineArm,x=0){const w=poseWork(frame,arm),p=armPose(w),v=bucketPoint(w,{x,y:-10,z:-17}),c=Math.cos(p.heading),s=Math.sin(p.heading);return[p.wrist.x+c*v.x+s*v.z,p.wrist.y+v.y,p.wrist.z-s*v.x+c*v.z];}
function mouthFits(frame,arm){return[-8,0,8].every(x=>{const p=bucketPourMouth(frame,arm,x),l=localDump(frame,p);return l[1]>29&&Math.abs(l[0])<=24&&l[2]>=-37&&l[2]<=-7;});}
const stage=(kind,from,to,duration)=>({kind,from:{...from},to:{...to},duration:duration??Math.max(.15,...axes.map(k=>Math.abs(to[k]-from[k])/speed[k]))});
function planKey(s){return canonical([s.frame.dump,s.frame.machineArm,s.mode]);}
function* segmentSteps(f,a,b){const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(b[k]-a[k])/.006)));check(n<=1100,'予定の移動が長すぎます。');for(let i=0;i<=n;i++){if(!linkedArmClear(f,interpolate(a,b,i/n)))return false;yield;}return true;}
function* planSteps(s){
 if(s.mode!=='excavating'||s.link||s.unload||s.frame.job||s.frame.soil.pending||!s.frame.soil.containers.bucket.amount||s.frame.soil.containers.dump.amount>=SOIL_CAPACITY.dump)return null;
 const f=s.frame,w=poseWork(f),closed=f.machineArm.curl,amount=Math.min(f.soil.containers.bucket.amount,SOIL_CAPACITY.dump-f.soil.containers.dump.amount);
 // Bounded candidates. The bowl remains over the same receiving mouth while opening.
 for(const y of[60,56,52,48,64])for(const z of[-22,-27,-17]){
  const target=shovelDumpPoint(f,0,y,z),at=solveBucketPose(w,{x:target[0],y:target[1],z:target[2]},closed),open=solveBucketPose(w,{x:target[0],y:target[1],z:target[2]},-1.25);
  if(!at||!open||at.stick>-Math.PI/6||open.stick>-Math.PI/6||!mouthFits(f,open))continue;
  const raised={...f.machineArm,boom:READY.boom},reach={...raised,stick:READY.stick},above={...reach,slew:at.slew};
  const remaining=f.soil.containers.bucket.amount-amount,end={...READY,slew:at.slew,curl:remaining?closed:READY.curl},lift={...open,boom:READY.boom,curl:remaining?closed:open.curl};
  const points=[f.machineArm,raised,reach,above,at,open,open,lift,end],kinds=['raise','clear','swing','lower','open','pour','lift','ready'];
  let safe=true;for(let i=1;i<points.length;i++)if(!(yield* segmentSteps(f,points[i-1],points[i]))){safe=false;break;}if(!safe)continue;
  const path=points.slice(1).map((p,i)=>stage(kinds[i],points[i],p,kinds[i]==='pour'?LINK_POUR_SECONDS:undefined)),duration=path.reduce((n,p)=>n+p.duration,0),flowStart=path.slice(0,5).reduce((n,p)=>n+p.duration,0);
  if(duration>45)continue;return{amount,path,duration,flowStart,flowEnd:flowStart+LINK_POUR_SECONDS};
 }
 return null;
}
export function bucketDumpPlan(s){const key=planKey(s),entry=plans.get(s.frame.soil);if(entry?.key===key)return entry.plan;const g=planSteps(s);let step;do{step=g.next();}while(!step.done);const plan=freezePlan(step.value);plans.set(s.frame.soil,{key,plan});return plan;}
export async function bucketDumpPlanAsync(s,yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0))){const key=planKey(s),entry=plans.get(s.frame.soil);if(entry?.key===key)return entry.plan;const g=planSteps(s);let step,count=0;do{step=g.next();if(!step.done&&++count%8===0)await yieldFrame();}while(!step.done);const plan=freezePlan(step.value);plans.set(s.frame.soil,{key,plan});return plan;}

// A warehouse count is picked up at its actual bin surface, never teleported
// into the truck. The last close respects the existing physical stop (24° on HUD).
const storagePlans=new WeakMap(),storageChecks=new WeakMap(),storageProofs=new Map();
// Save packing clones the same immutable journal several times. Certify/replay
// still runs first; this bounded cache only avoids repeating identical sweeps.
const storageProof=s=>canonical([s.frame.soil.initial,s.frame.soil.site,s.frame.soil.journal,s.frame.dump,s.link.plan]);
function rememberStorage(s){const proof=storageProof(s);storageProofs.delete(proof);storageProofs.set(proof,true);if(storageProofs.size>8)storageProofs.delete(storageProofs.keys().next().value);}
const STORAGE_KINDS=['raise','clear','swing','above','lower','cut','clearBin','lift','ready','close'];
export function bucketStorageClear(frame,arm){
 if(!linkedArmClear(frame,arm))return false;
 const w=poseWork(frame,arm),p=armPose(w),floor={position:[-94,1.5,-12],half:[32,1.5,24]};
 return !bucketContactGeometry(w,p).all.some(part=>boxContact(part,floor))&&!p.world.slice(0,2).some((v,i)=>shovelSegmentHits([v.x,v.y,v.z],[p.world[i+1].x,p.world[i+1].y,p.world[i+1].z],floor,2.8));
}
function* storageSegmentSteps(f,a,b){const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(b[k]-a[k])/.006)));check(n<=1100,'箱への移動が長すぎます。');for(let i=0;i<=n;i++){if(!bucketStorageClear(f,interpolate(a,b,i/n)))return false;yield;}return true;}
function* storagePlanSteps(s){
 if(s.mode!=='excavating'||s.link||s.unload||s.frame.job||s.frame.soil.pending||s.frame.soil.containers.bucket.amount||!s.frame.soil.containers.storage.amount)return null;
 const f=s.frame,w=poseWork(f),amount=Math.min(f.soil.containers.storage.amount,SOIL_CAPACITY.bucket);
 for(const x of[-94,-92,-88])for(const z of[-22,-18,-12]){
  const open=solveBucketPose(w,{x,y:16,z},-1.25),cut=solveBucketPose(w,{x,y:12,z},-.5),high=solveBucketPose(w,{x,y:40,z},-1.25),highCut=solveBucketPose(w,{x,y:30,z},-.5);
  if([open,cut,high,highCut].some(a=>!a||a.stick>-Math.PI/6))continue;
  const teeth=bucketContactGeometry({...w,arm:cut},armPose({...w,arm:cut})).teeth;
  if(!teeth.some(p=>prismTouchesBox(p,[-123,3.12,-33],[ -65,4.72,9])))continue;
  const raised={...f.machineArm,boom:READY.boom},reach={...READY,slew:raised.slew},above={...reach,slew:open.slew},lift={...cut,boom:READY.boom},reset={...lift,stick:READY.stick},closed={...reset,curl:23.7*Math.PI/180};
  const points=[f.machineArm,raised,reach,above,high,open,cut,highCut,lift,reset,closed];
  let safe=true;for(let i=1;i<points.length;i++)if(!(yield* storageSegmentSteps(f,points[i-1],points[i]))){safe=false;break;}if(!safe)continue;
  const path=points.slice(1).map((p,i)=>stage(STORAGE_KINDS[i],points[i],p)),duration=path.reduce((n,p)=>n+p.duration,0),cutStart=path.slice(0,5).reduce((n,p)=>n+p.duration,0);
  let contact=null;for(let i=0;i<=256;i++){const arm=interpolate(open,cut,i/256),pose={...w,arm};if(bucketContactGeometry(pose,armPose(pose)).teeth.some(p=>prismTouchesBox(p,[-123,3.12,-33],[-65,4.72,9]))){contact=i/256;break;}yield;}
  if(contact===null||contact===1||duration>45)continue;const flowStart=cutStart+path[5].duration*contact;return{amount,path,duration,flowStart,flowEnd:cutStart+path[5].duration};
 }return null;
}
export function bucketStoragePlan(s){const key=planKey(s),e=storagePlans.get(s.frame.soil);if(e?.key===key)return e.plan;const g=storagePlanSteps(s);let n;do{n=g.next();}while(!n.done);const plan=freezePlan(n.value);storagePlans.set(s.frame.soil,{key,plan});return plan;}
export async function bucketStoragePlanAsync(s,yieldFrame=()=>new Promise(r=>setTimeout(r,0))){const key=planKey(s),e=storagePlans.get(s.frame.soil);if(e?.key===key)return e.plan;const g=storagePlanSteps(s);let n,count=0;do{n=g.next();if(!n.done&&++count%8===0)await yieldFrame();}while(!n.done);const plan=freezePlan(n.value);storagePlans.set(s.frame.soil,{key,plan});return plan;}
export function startBucketStorage(s,operationId){
 idle(s);check(id(operationId),'操作番号が不正です。');const plan=bucketStoragePlan(s);check(plan,'箱の土がないか、バケットの通り道がふさがっています。');check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の作業数が上限です。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,from:'storage',to:'bucket',materialId:s.frame.soil.containers.storage.materialId,amount:plan.amount,positions:[]});
 storageChecks.set(plan,{soil,dump:canonical(s.frame.dump),signature:canonical(plan)});const result=next(s,{...s.frame,soil},{link:{kind:'storage',id:operationId,plan,elapsed:0,returning:false}});rememberStorage(result);return result;
}
export function linkedStorageVisual(s){const j=s.link;if(j?.kind!=='storage')return{portion:0,bucket:s.frame.soil.containers.bucket.amount,sourceVisible:false};const portion=Math.max(0,Math.min(1,(j.elapsed-j.plan.flowStart)/(j.plan.flowEnd-j.plan.flowStart)));return{portion,bucket:s.frame.soil.pending.amount*portion,sourceVisible:portion<1};}
function validateStorageLink(s,j){
 exact(j,['kind','id','plan','elapsed','returning']);exact(j.plan,['amount','path','duration','flowStart','flowEnd']);const p=s.frame.soil.pending;
 check(id(j.id)&&p?.id===j.id&&p.from==='storage'&&p.to==='bucket'&&p.phase==='reserved'&&p.positions.length===0&&j.plan.amount===p.amount&&finite(j.elapsed,0,j.plan.duration)&&j.returning===false,'箱の予約と動きが一致しません。');
 check(Array.isArray(j.plan.path)&&j.plan.path.length===10&&finite(j.plan.duration,.15,45),'箱の動作区分が不正です。');
 for(const seg of j.plan.path){exact(seg,['kind','from','to','duration']);armValid(seg.from);armValid(seg.to);check(finite(seg.duration,.15,12),'動作時間が不正です。');}
 const r=s.frame.soil.journal.at(-1);check(r.type==='reserve'&&r.id===j.id+'_reserve'&&r.transferId===j.id&&r.from==='storage'&&r.to==='bucket'&&r.amount===j.plan.amount,'箱の履歴が一致しません。');
 check(same(s.frame.machineArm,bucketPlanPose(j.plan,j.elapsed)),'箱から取り出す途中の姿勢が一致しません。');
 const key=canonical(s.frame.dump),signature=canonical(j.plan),cached=storageChecks.get(j.plan);
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
export function linkedAccessTarget(s,boarding=true){
 if(s.link||s.unload||s.frame.job||s.frame.soil.pending||s.mode!==(boarding?'foot':'excavating'))return null;const f=s.frame,w=poseWork(f),v=w.loader.vehicle;
 const boxes=[...shovelDumpObstacles(f),...shovelSoilBoxes(f.soil)],obstacles=boxes.map(b=>{const h=b.axes?boxExtent(b):b.half??Array(3).fill(b.size/2);return{x:b.position[0],z:b.position[2],width:h[0]*2,depth:h[2]*2,y:b.position[1]-h[1],height:h[1]*2,angle:b.axes?0:b.heading??0};});
 for(const side of[-1,1]){let path=cabPath(f,side,boarding);const first=path[0],p=f.player;if(boarding&&(Math.hypot(first.x-p.x,first.z-p.z)>10||Math.abs(p.y)>.05||!shovelStanding(f,p)))continue;
  path=[{...p},...path];if(!excavatorAccessClear(path,v,obstacles))continue;return{side,path};
 }return null;
}
function pathAt(path,u){if(!u)return{...path[0]};const distances=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y,p.z-path[i].z)),total=distances.reduce((a,b)=>a+b,0),face=heading(path[0].heading+heading(path.at(-1).heading-path[0].heading)*Math.min(1,u/.18));let d=total*u;for(let i=0;i<distances.length;i++){if(d<=distances[i]||i===distances.length-1){const t=distances[i]?Math.min(1,d/distances[i]):1,a=path[i],b=path[i+1];return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,heading:face,travel:path[0].travel+total*u};}d-=distances[i];}}
function accessPath(s,j){return[{...j.fromPlayer},...cabPath(s.frame,j.side,j.kind==='board')];}
export function createBucketDumpWork(source){
 const b=createDumpWork(source),w=shovelMachineState(b.frame);check(isContactDig(w)&&isBackhoe(w)&&b.frame.soil.containers.bucket.amount>0,'停止した接触掘削ショベルの持ち土が必要です。');
 const loc=localToWorld(w.loader.vehicle,80,13),frame={...b.frame,dump:{x:loc.x,z:loc.z,heading:w.loader.vehicle.heading},machineArm:{...w.arm}};const path=cabPath(frame,-1);frame.player={...frame.player,...path[0],travel:0};
 return validateBucketDumpWork({...b,format:BUCKET_DUMP_FORMAT,scope:BUCKET_DUMP_SCOPE,frame,link:null});
}
export function startBucketAccess(s,boarding){idle(s);const target=linkedAccessTarget(s,boarding);check(target,boarding?'運転席横の黄色い目印へ近づいてください。':'ドア横がふさがっています。');return next(s,s.frame,{mode:'excavating',link:{kind:boarding?'board':'leave',side:target.side,fromPlayer:{...s.frame.player},elapsed:0,duration:boarding?1.9:2.1,returning:false}});}
export function startBucketPour(s,operationId){
 idle(s);check(id(operationId),'操作番号が不正です。');const plan=bucketDumpPlan(s);check(plan,'荷台の位置か通り道を確認してください。届く場所へダンプを停め、荷台を空けてください。');check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の作業数が上限です。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,from:'bucket',to:'dump',materialId:s.frame.soil.containers.bucket.materialId,amount:plan.amount,positions:[]});
 planChecks.set(plan,{soil,dump:canonical(s.frame.dump),signature:canonical(plan)});return next(s,{...s.frame,soil},{link:{kind:'pour',id:operationId,plan,elapsed:0,returning:false}});
}
export function linkedPourVisual(s){const j=s.link;if(j?.kind!=='pour')return{portion:0,bucket:s.frame.soil.containers.bucket.amount,cargo:s.frame.soil.containers.dump.amount,mouth:null,progress:0};const p=Math.max(0,Math.min(1,(j.elapsed-j.plan.flowStart)/LINK_POUR_SECONDS)),amt=s.frame.soil.pending.amount;return{portion:p,bucket:s.frame.soil.containers.bucket.amount+amt*(1-p),cargo:s.frame.soil.containers.dump.amount+amt*p,mouth:bucketPourMouth(s.frame),progress:j.elapsed/j.plan.duration};}
export function progressBucketLink(s,dt){check(s.link&&finite(dt,0,.05),'進行時間が不正です。');const j=s.link,duration=['pour','storage'].includes(j.kind)?j.plan.duration:j.duration,elapsed=j.returning?Math.max(0,j.elapsed-dt):Math.min(duration,j.elapsed+dt),link={...j,elapsed};let f=s.frame;
 if(['pour','storage'].includes(j.kind)){f={...f,machineArm:bucketPlanPose(j.plan,elapsed)};f.player=linkedExcavatorSeat(f);}else f={...f,player:pathAt(accessPath(s,j),elapsed/duration)};
 return next(s,f,{link});
}
export const bucketLinkReady=s=>!!s.link&&(s.link.returning?s.link.elapsed===0:s.link.elapsed===(['pour','storage'].includes(s.link.kind)?s.link.plan.duration:s.link.duration));
export function cancelBucketPour(s){check(s.link?.kind==='pour'&&s.link.elapsed<s.link.plan.flowStart,'放し始めた土は戻せません。メニューで一時停止し、続きから再開できます。');return next(s,s.frame,{link:{...s.link,returning:true}});}
export function finishBucketLink(s){check(bucketLinkReady(s),'動作の終了を待ってください。');const j=s.link;let f=s.frame,mode=s.mode;if(['pour','storage'].includes(j.kind)){
  let soil=soilTransportCommand(f.soil,{type:j.returning?'cancel':'release',id:j.id+(j.returning?'_cancel':'_release'),expectedRevision:f.soil.revision,transferId:j.id});
  if(!j.returning)soil=soilTransportCommand(soil,{type:'complete',id:j.id+'_complete',expectedRevision:soil.revision,transferId:j.id});f={...f,soil};
 }else mode=j.kind==='board'?'excavating':'foot';return next(s,f,{mode,link:null});}
export function slewBucketWork(s,axis,dt){idle(s);check(s.mode==='excavating'&&finite(axis,-1,1)&&finite(dt,Number.EPSILON,.05),'旋回の入力が不正です。');if(!axis)return s;const a=s.frame.machineArm,h=Math.max(-EX.slewLimit,Math.min(EX.slewLimit,a.slew-axis*.62*dt)),arm={...a,slew:h};if(!segmentClear(s.frame,a,arm))return s;let f={...s.frame,machineArm:arm};f.player=linkedExcavatorSeat(f);return next(s,f);}
export function validateBucketDumpWork(s){
 exact(s,['format','scope','version','revision','frame','mode','vehicleTravel','wheelTravel','unload','link']);check(s.format===BUCKET_DUMP_FORMAT&&s.scope===BUCKET_DUMP_SCOPE&&s.version===1&&['foot','driving','excavating'].includes(s.mode),'専用のショベル積込保存が必要です。');armValid(s.frame.machineArm);
 validateDumpWork(legacy(s),{liveArm:true,aboardExcavator:s.mode==='excavating',bucketTransfer:s.link?.kind==='pour',storageTransfer:s.link?.kind==='storage'});check(linkedArmClear(s.frame),'アーム・バケットの通り道がふさがっています。');
 if(s.mode==='excavating'){check(!s.unload&&!s.frame.job,'乗車中の手作業はできません。');if(!s.link||['pour','storage'].includes(s.link.kind)){const p=linkedExcavatorSeat(s.frame);check(['x','y','z','heading'].every(k=>Math.abs(p[k]-s.frame.player[k])<1e-8),'人物がショベルの運転席にいません。');}}
 if(s.link){const j=s.link;check(s.mode==='excavating'&&!s.unload&&!s.frame.job&&typeof j.returning==='boolean','別の動作と重なっています。');if(j.kind==='storage'){validateStorageLink(s,j);}else if(j.kind==='pour'){
   exact(j,['kind','id','plan','elapsed','returning']);exact(j.plan,['amount','path','duration','flowStart','flowEnd']);const p=s.frame.soil.pending;
   check(id(j.id)&&p?.id===j.id&&p.from==='bucket'&&p.to==='dump'&&p.phase==='reserved'&&j.plan.amount===p.amount&&finite(j.elapsed,0,j.plan.duration)&&(!j.returning||j.elapsed<j.plan.flowStart),'予約と動きが一致しません。');
   const r=s.frame.soil.journal.at(-1);check(r.type==='reserve'&&r.id===j.id+'_reserve'&&r.transferId===j.id&&r.from==='bucket'&&r.to==='dump'&&r.amount===j.plan.amount,'予約の履歴が不正です。');
   check(Array.isArray(j.plan.path)&&j.plan.path.length===8&&finite(j.plan.duration,LINK_POUR_SECONDS,45),'動作の区分が不正です。');let t=0;const kinds=['raise','clear','swing','lower','open','pour','lift','ready'];
   for(let i=0;i<8;i++){const seg=j.plan.path[i];exact(seg,['kind','from','to','duration']);armValid(seg.from);armValid(seg.to);check(seg.kind===kinds[i]&&finite(seg.duration,.15,12)&&(!i||same(j.plan.path[i-1].to,seg.from)),'動作の接続が不正です。');if(i===5)check(seg.duration===LINK_POUR_SECONDS&&same(seg.from,seg.to)&&mouthFits(s.frame,seg.from),'土が荷台へ入る位置にありません。');t+=seg.duration;}
   const path=j.plan.path,near=(a,b)=>Math.abs(a-b)<1e-8,hold=(n,ks)=>ks.every(k=>near(path[n].from[k],path[n].to[k]));
   check(hold(0,['stick','curl','slew'])&&near(path[0].to.boom,READY.boom)&&hold(1,['boom','curl','slew'])&&near(path[1].to.stick,READY.stick)&&hold(2,['boom','stick','curl'])&&hold(3,['slew','curl'])&&hold(4,['slew'])&&near(path[4].to.curl,READY.curl)&&hold(6,['stick','slew'])&&hold(7,['boom','curl','slew'])&&near(path[7].to.boom,READY.boom)&&near(path[7].to.stick,READY.stick)&&near(path[7].to.curl,s.frame.soil.containers.bucket.amount?path[0].from.curl:READY.curl),'一連の積込みの姿勢が不正です。');
   check(Math.abs(t-j.plan.duration)<1e-8&&Math.abs(j.plan.flowStart-j.plan.path.slice(0,5).reduce((n,p)=>n+p.duration,0))<1e-8&&j.plan.flowEnd===j.plan.flowStart+LINK_POUR_SECONDS,'動作の時刻が不正です。');check(same(s.frame.machineArm,bucketPlanPose(j.plan,j.elapsed)),'現在のアームと保存した途中が一致しません。');
   const key=canonical(s.frame.dump),signature=canonical(j.plan),cached=planChecks.get(j.plan);if(!cached||cached.soil!==s.frame.soil||cached.dump!==key||cached.signature!==signature){check(j.plan.path.every(seg=>segmentClear(s.frame,seg.from,seg.to)),'保存した積込経路がふさがっています。');planChecks.set(j.plan,{soil:s.frame.soil,dump:key,signature});}
  }else{
   exact(j,['kind','side','fromPlayer','elapsed','duration','returning']);check(['board','leave'].includes(j.kind)&&[-1,1].includes(j.side)&&j.duration===(j.kind==='board'?1.9:2.1)&&j.returning===false&&finite(j.elapsed,0,j.duration),'乗降の保存が不正です。');exact(j.fromPlayer,['x','y','z','heading','travel']);const path=accessPath(s,j),p=pathAt(path,j.elapsed/j.duration);check(['x','y','z','heading','travel'].every(k=>Math.abs(p[k]-s.frame.player[k])<1e-8),'乗降経路と人物が一致しません。');
   check(Object.values(j.fromPlayer).every(Number.isFinite)&&j.fromPlayer.travel>=0,'乗降前の人物が不正です。');if(j.kind==='leave'){const seat=linkedExcavatorSeat(s.frame);check(['x','y','z','heading'].every(k=>Math.abs(seat[k]-j.fromPlayer[k])<1e-8),'降車前に運転席にいません。');}
   const start={...s,link:null,mode:j.kind==='board'?'foot':'excavating',frame:{...s.frame,player:j.fromPlayer}};check(linkedAccessTarget(start,j.kind==='board')?.side===j.side,'乗降を始める位置が不正です。');
  }
 }else check(!s.frame.soil.pending||!!s.unload||!!s.frame.job,'途中の土に作業がありません。');return s;
}
export function validateBucketDumpContinuation(a,b){validateBucketDumpWork(a);validateBucketDumpWork(b);check(same(a.frame.soil.site,b.frame.soil.site)&&same(a.frame.soil.initial,b.frame.soil.initial),'別の現場へ切り替えられません。');check(b.frame.soil.journal.length>=a.frame.soil.journal.length&&a.frame.soil.journal.every((c,i)=>same(c,b.frame.soil.journal[i])),'古い土へ巻き戻せません。');check(b.revision>=a.revision&&b.frame.revision>=a.frame.revision&&b.vehicleTravel>=a.vehicleTravel&&b.frame.player.travel>=a.frame.player.travel,'古い動きへ巻き戻せません。');check(b.revision!==a.revision||same(a,b),'同じ保存番号の内容が不正です。');return b;}
const wrap=fn=>(s,...args)=>{idle(s);return fn(s,...args);};
export const walkBucketSite=wrap(walkDumpWork),turnBucketWalker=wrap(turnDumpWalker),driveBucketSite=wrap(driveDumpWork),boardBucketSiteDump=wrap(boardDumpWork),leaveBucketSiteDump=wrap(leaveDumpWork),startBucketSiteHand=wrap(startDumpHandWork),startBucketSiteUnload=wrap(startDumpUnload),startBucketSiteStorage=wrap(startDumpStorage);
export {dumpBoardTarget,dumpUnloadPlan,dumpStoragePlan,progressDumpUnload,finishDumpUnload,cancelDumpUnload,progressDumpHandWork,finishDumpHandWork,returnDumpHandWork};
function checksum(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packBucketDumpWork(s){validateBucketDumpWork(s);return JSON.stringify({kind:BUCKET_DUMP_FORMAT,checksum:checksum(canonical(s)),state:s});}
export function unpackBucketDumpWork(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+131072,'保存が大きすぎます。');const p=JSON.parse(text);exact(p,['kind','checksum','state']);check(p.kind===BUCKET_DUMP_FORMAT&&p.checksum===checksum(canonical(p.state)),'保存の検査に失敗しました。');return validateBucketDumpWork(p.state);}
