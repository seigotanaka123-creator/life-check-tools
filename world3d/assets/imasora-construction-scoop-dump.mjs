import * as bucket from './imasora-construction-bucket-dump.mjs';
import {createDumpWork} from './imasora-construction-dump-work.mjs';
import {shovelMachineState,shovelDumpObstacles,shovelSoilBoxes} from './imasora-construction-shovel-work.mjs';
import {soilTransportCommand,validateSoilTransport,SOIL_LIMITS} from './imasora-construction-soil-transport.mjs';
import {beginOneTouch,stepOneTouch,DIG_READY,DIG_CLOSE} from './imasora-construction-excavator-one-touch.js';
import {excavatorAccessPath} from './imasora-construction-excavator-access.js';
import {localToWorld} from './imasora-construction-loader-physics.js';
import {bucketContactGeometry,prismTouchesBox} from './imasora-construction-excavator-contact.js';
import {armPose} from './imasora-construction-excavator.js';
import {canonical} from './imasora-construction-state.js';
export const SCOOP_DUMP_FORMAT='imasora-shared-scoop-dump-checkpoint-v1';
export const SCOOP_DUMP_SCOPE='imasora-shared-scoop-dump-isolated-v1';
const STEP=1/60,FULL='ffffffffffffffff',cache=new WeakMap(),certificates=new WeakMap(),shadowCache=new WeakMap(),physicalSoils=new WeakMap();
const axes=['boom','stick','curl','slew'],same=(a,b)=>canonical(a)===canonical(b);
const check=(v,t)=>{if(!v)throw Error('ショベル作業：'+t);};
const exact=(v,keys)=>check(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...keys].sort().join('|'),'保存の項目が不正です。');
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const base=s=>{const {scoop,...v}=s;return{...v,format:bucket.BUCKET_DUMP_FORMAT,scope:bucket.BUCKET_DUMP_SCOPE};};
const next=(s,frame,extra={})=>({...s,revision:s.revision+1,frame:{...frame,revision:s.frame.revision+1},...extra});
const lift=v=>({...v,format:SCOOP_DUMP_FORMAT,scope:SCOOP_DUMP_SCOPE,scoop:null});
function assertIdle(s){check(!s.scoop&&!s.link&&!s.unload&&!s.frame.job&&!s.frame.soil.pending,'今の作業を終えてから操作してください。');}
function physical(s,soil=s.frame.soil){
 const original=shovelMachineState(s.frame),terrain={};
 for(const [key,b]of Object.entries(soil.blocks))if(b.mask===FULL)terrain[key]=key.split(',').map(Number);
 // Keep every loose pile, even when its centre shares an intact ground cell.
 const partial=shovelSoilBoxes({...soil,blocks:Object.fromEntries(Object.entries(soil.blocks).filter(([,b])=>b.mask!==FULL))});
 const boxes=[...shovelDumpObstacles(s.frame),...partial];
 if(soil.containers.dump.amount){const v=soil.containers.dump.amount*8,w=Math.min(48,Math.max(4,Math.sqrt(v/4))),d=Math.min(29,Math.max(4,v/(w*4))),h=v/(w*d);boxes.push({position:bucketPoint(s.frame,-24+w/2,17+h/2,-22),half:[w/2,h/2,d/2],heading:s.frame.dump.heading});}
 const external=boxes.map((b,i)=>{const h=b.half??Array(3).fill(b.size/2);return{name:'車体・既存の土:'+i,x:b.position[0],y:b.position[1]-h[1],z:b.position[2],w:h[0]*2,h:h[1]*2,d:h[2]*2,angle:b.heading??0};});
 return{work:{...original,arm:{...s.frame.machineArm},load:0,terrain,spoil:[],falling:[],cutMask:Object.fromEntries(Object.keys(terrain).map(k=>[k,true])),action:null,guide:null,hit:'',loader:{...original.loader,mode:'working',transition:null,vehicle:{...original.loader.vehicle,speed:0}}},external};
}
function bucketPoint(f,x,y,z){const p=localToWorld(f.dump,x,z);return[p.x,y,p.z];}
function bodyFrame(s,blocks,arm){let entry=physicalSoils.get(blocks);if(!entry||entry.source!==s.frame.soil){entry={source:s.frame.soil,soil:{...s.frame.soil,blocks}};physicalSoils.set(blocks,entry);}return{...s.frame,machineArm:arm,soil:entry.soil};}
const lerp=(a,b,t)=>Object.fromEntries(axes.map(k=>[k,a[k]+(b[k]-a[k])*t]));
function* generate(s){
 if(s.mode!=='excavating'||s.scoop||s.link||s.unload||s.frame.job||s.frame.soil.pending||s.frame.soil.containers.bucket.amount)return null;
 const {work,external}=physical(s);let run=beginOneTouch(work,'scoop',external),time=0,blocks={...s.frame.soil.blocks};
 const poses=[{time:0,arm:{...work.arm},phase:run.sequence.phase}],cuts=[];
 while(run.sequence&&time<45){
  const previous=run.work,seq=run.sequence,oldTime=time;run=stepOneTouch(previous,seq,{},STEP,external);time+=STEP;
  const changed=Object.keys(previous.terrain).filter(k=>!run.work.terrain[k]),remaining=new Set(changed);
  const n=Math.max(1,...axes.map(k=>Math.ceil(Math.abs(run.work.arm[k]-previous.arm[k])/.003)));
  for(let i=1;i<=n;i++){
   const arm=lerp(previous.arm,run.work.arm,i/n),probe={...run.work,arm},g=bucketContactGeometry(probe,armPose(probe));
   for(const k of [...remaining]){
    const p=k.split(',').map(v=>Number(v)*8),exposed=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(d=>!blocks[p.map((v,j)=>v/8+d[j]).join(',')]);
    if(exposed&&g.teeth.some(t=>prismTouchesBox(t,p,p.map(v=>v+8),.08))){blocks={...blocks};delete blocks[k];remaining.delete(k);cuts.push({cell:k,time:oldTime+STEP*i/n});}
   }
   if(!bucket.linkedArmClear(bodyFrame(s,blocks,arm)))return null;yield;
  }
  if(remaining.size)return null;
  poses.push({time,arm:{...run.work.arm},phase:run.sequence?.phase??'done'});
 }
 if(run.sequence||!cuts.length||cuts.length>6||run.work.load!==cuts.length||Math.abs(run.work.arm.boom-DIG_READY.boom)>1e-8||Math.round(run.work.arm.curl*180/Math.PI)!==24)return null;
 return freeze({amount:cuts.length*64,duration:time,poses,cuts});
}
function key(s){return canonical([s.frame.machineArm,s.frame.dump,s.mode]);}
export function scoopDumpPlan(s){const k=key(s),old=cache.get(s.frame.soil);if(old?.key===k)return old.plan;const it=generate(s);let n;do{n=it.next();}while(!n.done);cache.set(s.frame.soil,{key:k,plan:n.value});return n.value;}
export async function scoopDumpPlanAsync(s,yieldFrame=()=>new Promise(r=>setTimeout(r,0))){const k=key(s),old=cache.get(s.frame.soil);if(old?.key===k)return old.plan;const it=generate(s);let n,count=0,slice=performance.now();do{n=it.next();if(!n.done&&(++count>=32||performance.now()-slice>=6)){await yieldFrame();slice=performance.now();count=0;}}while(!n.done);cache.set(s.frame.soil,{key:k,plan:n.value});return n.value;}
function positions(plan){return plan.cuts.flatMap(({cell})=>{const c=cell.split(',').map(Number);return Array.from({length:64},(_,i)=>[c[0]*4+i%4,c[1]*4+Math.floor(i/4)%4,c[2]*4+Math.floor(i/16)]);});}
export function scoopPoseAt(plan,time){const poses=plan.poses;for(let i=1;i<poses.length;i++)if(time<=poses[i].time){const a=poses[i-1],b=poses[i];return lerp(a.arm,b.arm,(time-a.time)/(b.time-a.time));}return{...poses.at(-1).arm};}
export function scoopVisual(s){const j=s.scoop;if(!j)return{bucket:s.frame.soil.containers.bucket.amount,source:[],progress:0,phase:null};const collected=j.plan.cuts.filter(c=>c.time<=j.elapsed+1e-10).length,phase=j.plan.poses.find(p=>p.time>=j.elapsed)?.phase??'done';return{bucket:collected*64,source:j.plan.cuts.filter(c=>c.time>j.elapsed+1e-10).map(c=>({position:c.cell.split(',').map(n=>Number(n)*8+4),size:8,materialId:'earth-soil'})),progress:j.elapsed/j.plan.duration,phase};}
export function createScoopDumpWork(source){
 const b=createDumpWork(source),w=shovelMachineState(b.frame);check(w.digMode==='tooth-contact-v1'&&!b.frame.soil.containers.bucket.amount,'停止した空バケットの現行接触掘削記録が必要です。');
 const p=localToWorld(w.loader.vehicle,80,13),frame={...b.frame,dump:{x:p.x,z:p.z,heading:w.loader.vehicle.heading},machineArm:{...w.arm}},door=excavatorAccessPath(w.loader.vehicle,frame.machineArm.slew,-1)[0];frame.player={...frame.player,...door,heading:Math.atan2(Math.sin(door.heading),Math.cos(door.heading)),travel:0};
 return validateScoopDumpWork(lift({...b,frame,link:null}));
}
export function startScoopDump(s,operationId){
 assertIdle(s);check(typeof operationId==='string'&&/^[a-zA-Z0-9_-]{1,55}$/.test(operationId),'操作番号が不正です。');check(s.frame.soil.journal.length<=SOIL_LIMITS.history-3,'保存の履歴が上限です。土を保持します。');
 const plan=scoopDumpPlan(s);check(plan,'爪が届く土がないか、通り道がふさがっています。位置・向きを変えてください。');
 const soil=soilTransportCommand(s.frame.soil,{type:'reserve',id:operationId+'_reserve',expectedRevision:s.frame.soil.revision,transferId:operationId,from:'terrain',to:'bucket',materialId:'earth-soil',amount:plan.amount,positions:positions(plan)});
 certificates.set(plan,{soil,dump:canonical(s.frame.dump),signature:canonical(plan)});
 return next(s,{...s.frame,soil},{scoop:{id:operationId,plan,elapsed:0,returning:false}});
}
export function progressScoopDump(s,dt){check(s.scoop&&finite(dt,0,.05),'進行時間が不正です。');const j=s.scoop,elapsed=j.returning?Math.max(0,j.elapsed-dt):Math.min(j.plan.duration,j.elapsed+dt),frame={...s.frame,machineArm:scoopPoseAt(j.plan,elapsed)};frame.player=bucket.linkedExcavatorSeat(frame);return next(s,frame,{scoop:{...j,elapsed}});}
export const scoopDumpReady=s=>!!s.scoop&&(s.scoop.returning?s.scoop.elapsed===0:s.scoop.elapsed===s.scoop.plan.duration);
export function cancelScoopDump(s){check(s.scoop&&s.scoop.elapsed<s.scoop.plan.cuts[0].time,'すくい始めた土は戻せません。メニューで一時停止し、続きから再開できます。');return next(s,s.frame,{scoop:{...s.scoop,returning:true}});}
export function finishScoopDump(s){check(scoopDumpReady(s),'動作が終わるまでお待ちください。');const j=s.scoop;let soil=soilTransportCommand(s.frame.soil,{type:j.returning?'cancel':'release',id:j.id+(j.returning?'_cancel':'_release'),expectedRevision:s.frame.soil.revision,transferId:j.id});if(!j.returning)soil=soilTransportCommand(soil,{type:'complete',id:j.id+'_complete',expectedRevision:soil.revision,transferId:j.id});return validateScoopDumpWork(next(s,{...s.frame,soil},{scoop:null}));}
function projections(s){let c=shadowCache.get(s.frame.soil);if(!c){const p=s.frame.soil.pending;let original=soilTransportCommand(s.frame.soil,{type:'cancel',id:p.id+'_audit_cancel',expectedRevision:s.frame.soil.revision,transferId:p.id});let landed=soilTransportCommand(s.frame.soil,{type:'release',id:p.id+'_audit_release',expectedRevision:s.frame.soil.revision,transferId:p.id});landed=soilTransportCommand(landed,{type:'complete',id:p.id+'_audit_complete',expectedRevision:landed.revision,transferId:p.id});c={original,landed};shadowCache.set(s.frame.soil,c);}return c;}
export function validateScoopDumpWork(s){
 exact(s,['format','scope','version','revision','frame','mode','vehicleTravel','wheelTravel','unload','link','scoop']);check(s.format===SCOOP_DUMP_FORMAT&&s.scope===SCOOP_DUMP_SCOPE&&s.version===1,'専用の掘削・積込み保存が必要です。');
 if(!s.scoop){bucket.validateBucketDumpWork(base(s));return s;}
 const j=s.scoop;exact(j,['id','plan','elapsed','returning']);exact(j.plan,['amount','duration','poses','cuts']);check(s.mode==='excavating'&&!s.link&&!s.unload&&!s.frame.job&&typeof j.returning==='boolean','別の作業と重なっています。');
 check(typeof j.id==='string'&&/^[a-zA-Z0-9_-]{1,55}$/.test(j.id)&&finite(j.plan.duration,STEP,45)&&Array.isArray(j.plan.poses)&&j.plan.poses.length<=2800&&Array.isArray(j.plan.cuts)&&j.plan.cuts.length>0&&j.plan.cuts.length<=6&&j.plan.amount===j.plan.cuts.length*64,'掘削経路が不正です。');
 validateSoilTransport(s.frame.soil);const p=s.frame.soil.pending,r=s.frame.soil.journal.at(-1);
 check(p?.id===j.id&&p.from==='terrain'&&p.to==='bucket'&&p.phase==='reserved'&&p.materialId==='earth-soil'&&p.amount===j.plan.amount&&s.frame.soil.containers.bucket.amount===0&&r.id===j.id+'_reserve'&&same(p.positions,positions(j.plan)),'土の予約と掘る範囲が一致しません。');
 check(finite(j.elapsed,0,j.plan.duration)&&(!j.returning||j.elapsed<j.plan.cuts[0].time)&&same(s.frame.machineArm,scoopPoseAt(j.plan,j.elapsed)),'アームと途中時刻が一致しません。');
 const shadow=projections(s);
 bucket.validateBucketDumpWork({...base(s),frame:{...s.frame,soil:shadow.landed}});
 const stamp={soil:s.frame.soil,dump:canonical(s.frame.dump),signature:canonical(j.plan)},old=certificates.get(j.plan);
 if(!old||old.soil!==stamp.soil||old.dump!==stamp.dump||old.signature!==stamp.signature){
  const start={...s,scoop:null,frame:{...s.frame,soil:shadow.original,machineArm:j.plan.poses[0]?.arm}};start.frame.player=bucket.linkedExcavatorSeat(start.frame);bucket.validateBucketDumpWork(base(start));const expected=scoopDumpPlan(start);check(expected&&same(expected,j.plan),'保存した経路が実際の接触掘削と一致しません。');freeze(j.plan);certificates.set(j.plan,stamp);
 }
 return s;
}
export function validateScoopDumpContinuation(a,b){validateScoopDumpWork(a);validateScoopDumpWork(b);check(same(a.frame.soil.site,b.frame.soil.site)&&same(a.frame.soil.initial,b.frame.soil.initial),'別の現場へ切り替えられません。');check(b.frame.soil.journal.length>=a.frame.soil.journal.length&&a.frame.soil.journal.every((c,i)=>same(c,b.frame.soil.journal[i])),'土の所有を巻き戻せません。');check(b.revision>=a.revision&&b.frame.revision>=a.frame.revision&&b.vehicleTravel>=a.vehicleTravel&&b.frame.player.travel>=a.frame.player.travel,'動作を巻き戻せません。');check(a.revision!==b.revision||same(a,b),'同じ番号の保存が変わっています。');return b;}
const wrap=fn=>(s,...args)=>{check(!s.scoop,'すくう動作が終わるまでお待ちください。');return lift(fn(base(s),...args));};
export const startBucketAccess=wrap(bucket.startBucketAccess),progressBucketLink=wrap(bucket.progressBucketLink),finishBucketLink=wrap(bucket.finishBucketLink),startBucketPour=wrap(bucket.startBucketPour),cancelBucketPour=wrap(bucket.cancelBucketPour),slewBucketWork=wrap(bucket.slewBucketWork),walkBucketSite=wrap(bucket.walkBucketSite),turnBucketWalker=wrap(bucket.turnBucketWalker),driveBucketSite=wrap(bucket.driveBucketSite),boardBucketSiteDump=wrap(bucket.boardBucketSiteDump),leaveBucketSiteDump=wrap(bucket.leaveBucketSiteDump),startBucketSiteUnload=wrap(bucket.startBucketSiteUnload),progressDumpUnload=wrap(bucket.progressDumpUnload),finishDumpUnload=wrap(bucket.finishDumpUnload),cancelDumpUnload=wrap(bucket.cancelDumpUnload);
export const linkedAccessTarget=(s,...args)=>s.scoop?null:bucket.linkedAccessTarget(base(s),...args),dumpBoardTarget=(s,...args)=>s.scoop?null:bucket.dumpBoardTarget(base(s),...args),dumpUnloadPlan=(s,...args)=>s.scoop?null:bucket.dumpUnloadPlan(base(s),...args),bucketDumpPlanAsync=(s,...args)=>s.scoop?null:bucket.bucketDumpPlanAsync(base(s),...args);
export const linkedPourVisual=bucket.linkedPourVisual,bucketLinkReady=bucket.bucketLinkReady;
function checksum(v){let n=2166136261;for(let i=0;i<v.length;i++)n=Math.imul(n^v.charCodeAt(i),16777619);return(n>>>0).toString(16).padStart(8,'0');}
export function packScoopDumpWork(s){validateScoopDumpWork(s);return JSON.stringify({kind:SCOOP_DUMP_FORMAT,checksum:checksum(canonical(s)),state:s});}
export function unpackScoopDumpWork(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+1048576,'保存が大きすぎます。');const p=JSON.parse(text);exact(p,['kind','checksum','state']);check(p.kind===SCOOP_DUMP_FORMAT&&p.checksum===checksum(canonical(p.state)),'保存の検査に失敗しました。');return validateScoopDumpWork(p.state);}
