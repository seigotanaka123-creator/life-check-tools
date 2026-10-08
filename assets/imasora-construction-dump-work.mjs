import {nativeDumpPose,nativeDumpLocal,nativeDumpBox,nativeDumpDoorPoint,boxExtent,boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs';
import {nativeDumpHeightAt} from './imasora-construction-native-dump-support.mjs';
import {canonical} from './imasora-construction-state.js';
import {createShovelWork,validateShovelWork,shovelSoilBoxes,shovelMachines,shovelGroundHeight,shovelStanding,shovelDumpBody,shovelDumpPoint,walkShovelWork,turnShovelWork,startShovelWork,progressShovelWork,finishShovelWork,returnShovelWork} from './imasora-construction-shovel-work.mjs';
import {soilTransportCommand,soilVoxel,SOIL_CAPACITY,SOIL_LIMITS} from './imasora-construction-soil-transport.mjs';
import {LOADER,SITE} from './imasora-construction-loader-physics.js';
import {BIN} from './imasora-construction-excavator.js';
import {shovelStorageObstacles} from './imasora-construction-shovel-work.mjs';
import {nativeDumpSupport,nativeDumpRecoveryStep} from './imasora-construction-native-dump-support.mjs';

export const DUMP_WORK_SCOPE='imasora-shared-soil-dump-work-isolated-v1';
export const DUMP_WORK_FORMAT='imasora-shared-soil-dump-work-checkpoint-v1';
export const DUMP_UNLOAD_SECONDS=2.4;
const check=(ok,text)=>{if(!ok)throw Error('土を運ぶ：'+text);};
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const exact=(s,keys)=>check(s&&Object.getPrototypeOf(s)===Object.prototype&&Object.keys(s).sort().join('|')===[...keys].sort().join('|'),'保存の項目が不正です。');
const id=n=>typeof n==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(n);
const heading=n=>Math.atan2(Math.sin(n),Math.cos(n));
const cachedObstacles=new WeakMap(),identity=new WeakMap();
const local=(s,p)=>nativeDumpLocal(s,p);
const horizontalLocal=(s,p)=>{const dx=p[0]-s.dump.x,dz=p[2]-s.dump.z,c=Math.cos(s.dump.heading),sn=Math.sin(s.dump.heading);return[c*dx-sn*dz,p[1],sn*dx+c*dz];};
export function dumpBoxesOverlap(a,b){return boxesOverlap3D(a,b);}
function obstacles(frame){const key=frame.machineArm??frame.soil;let entry=cachedObstacles.get(key),boxes=entry?.soil===frame.soil?entry.boxes:null;if(!boxes){boxes=[...shovelMachines(frame),...shovelSoilBoxes(frame.soil).filter(b=>b.position[1]+b.size/2>.01)];cachedObstacles.set(key,{soil:frame.soil,boxes});}return boxes;}
export function dumpRaisedBoxes(frame,angle){
 check(finite(angle,0,.8),'荷台の角度が不正です。');const c=Math.cos(angle),sn=Math.sin(angle),gate=Math.min(1.45,angle*2),gc=Math.cos(gate),gs=Math.sin(gate);
 return[nativeDumpBox(frame,[0,16+6*c+18*sn,-40-6*sn+18*c],[27,7*c+20*sn,7*sn+20*c]),nativeDumpBox(frame,[0,16+12*c-6*gc,-40-12*sn-6*gs],[26,6*gc+.7*gs,6*gs+.7*gc])];
}
export function dumpRaiseClear(frame,extra=[]){
 const path=[];for(let k=0;k<=16;k++)path.push(...dumpRaisedBoxes(frame,.8*k/16));
 const extents=path.map(boxExtent),min=[0,1,2].map(i=>Math.min(...path.map((b,j)=>b.position[i]-extents[j][i]))),max=[0,1,2].map(i=>Math.max(...path.map((b,j)=>b.position[i]+extents[j][i])));
 const blocks=[...obstacles(frame),...extra].filter(b=>{const e=boxExtent(b);return e.every((r,i)=>b.position[i]+r>min[i]&&b.position[i]-r<max[i]);});
 return path.every((box,i)=>Math.abs(box.position[0])+extents[i][0]<=SITE.maxX-1&&Math.abs(box.position[2])+extents[i][2]<=SITE.maxZ-1&&!blocks.some(b=>dumpBoxesOverlap(box,b)));
}
export function dumpPositionSafe(frame,{preciseArm=false,legacySupport=false}={}){
 const body=shovelDumpBody(frame),extent=boxExtent(body),c=Math.abs(Math.cos(frame.dump.heading)),sn=Math.abs(Math.sin(frame.dump.heading));
 if(Math.abs(body.position[0])+extent[0]>SITE.maxX-1||Math.abs(body.position[2])+extent[2]>SITE.maxZ-1)return false;
 if(Math.abs(frame.dump.x)+34*c+43*sn>SITE.maxX-1||Math.abs(frame.dump.z)+34*sn+43*c>SITE.maxZ-1)return false;
 if(legacySupport){
  // Keep existing v1 checkpoints readable. New moves/plans use every tyre
  // cell; a historical stop can leave only without adding unsupported area.
  for(const [x,z]of[[-25.5,-31],[25.5,-31],[-25.5,18],[25.5,18]]){const p=[frame.dump.x+Math.cos(frame.dump.heading)*x+Math.sin(frame.dump.heading)*z,0,frame.dump.z-Math.sin(frame.dump.heading)*x+Math.cos(frame.dump.heading)*z];for(const [dx,dz]of[[0,0],[-2,0],[2,0],[0,-2],[0,2]])if(Math.abs(shovelGroundHeight(frame,p[0]+dx,p[2]+dz,0))>.05)return false;}
 }else{const support=nativeDumpSupport(frame);if(!support.driveReady)return false;}
 // The live-arm bridge validates the real shell and swept shafts separately.
 // Its bucket can be above the open bed; the legacy broad body box cannot
 // describe that opening. Ordinary dump driving keeps the conservative guard.
 const blocks=preciseArm?[...shovelMachines(frame).slice(0,2),...shovelSoilBoxes(frame.soil).filter(b=>b.position[1]+b.size/2>.01)]:obstacles(frame);
 return !blocks.some(b=>Math.abs(b.position[0]-body.position[0])<100+(b.size??90)&&Math.abs(b.position[2]-body.position[2])<100+(b.size??90)&&dumpBoxesOverlap(body,b));
}
const seat=frame=>{const p=shovelDumpPoint(frame,-14,LOADER.floor,18);return{...frame.player,x:p[0],y:p[1],z:p[2],heading:frame.dump.heading};};
export function createDumpWork(source){return validateDumpWork({format:DUMP_WORK_FORMAT,scope:DUMP_WORK_SCOPE,version:1,revision:0,frame:createShovelWork(source),mode:'foot',vehicleTravel:0,wheelTravel:0,unload:null});}
const next=(s,frame,extra={})=>({...s,revision:s.revision+1,frame,...extra});
const idle=s=>check(!s.frame.job&&!s.unload&&!s.frame.soil.pending,'土を動かしている間は、移動や乗り降りを待ってください。');
export function dumpBoardTarget(s){
 if(s.mode!=='foot'||s.frame.job||s.unload||s.frame.soil.pending)return null;
 for(const side of[-1,1]){const target=nativeDumpDoorPoint(s.frame,side),p=s.frame.player;if(target&&Math.hypot(p.x-target[0],p.z-target[2])<=10&&Math.abs(p.y-target[1])<.05&&shovelStanding(s.frame,p))return{side,target};}return null;
}
export function boardDumpWork(s){idle(s);check(dumpBoardTarget(s),'運転席の横のドアへ近づいてください。');return next(s,{...s.frame,revision:s.frame.revision+1,player:seat(s.frame)},{mode:'driving'});}
export function leaveDumpWork(s){idle(s);check(s.mode==='driving','車に乗っていません。');
 for(const side of[-1,1]){const p=nativeDumpDoorPoint(s.frame,side);if(!p)continue;const player={...s.frame.player,x:p[0],y:p[1],z:p[2]};if(shovelStanding(s.frame,player))return next(s,{...s.frame,revision:s.frame.revision+1,player},{mode:'foot'});}
 throw Error('土を運ぶ：ドアの横がふさがっています。空いた場所へ動かしてから降りてください。');
}
export function walkDumpWork(s,x,z,dt,opts){idle(s);check(s.mode==='foot','車に乗っている間は走行操作を使ってください。');const frame=walkShovelWork(s.frame,x,z,dt,opts);return frame===s.frame?s:next(s,frame);}
export function turnDumpWalker(s,h){idle(s);check(s.mode==='foot','人物の向きは降りてから変えてください。');const frame=turnShovelWork(s.frame,h);return frame===s.frame?s:next(s,frame);}
export function driveDumpWork(s,throttle,steer,dt,{fast=false}={}){
 idle(s);check(s.mode==='driving','ドアの前で車に乗ってください。');check(finite(throttle,-1,1)&&finite(steer,-1,1)&&finite(dt,Number.EPSILON,.05),'走行の入力が不正です。');if(!throttle)return s;
 const slope=nativeDumpSupport(s.frame),up=throttle*Math.tan(slope.pitch??0),load=s.frame.soil.containers.dump.amount/SOIL_CAPACITY.dump,grade=up>0?Math.max(.45,1-up*(1.2+load)):up<0?Math.max(.55,1+up*(1.2+load)):1,speed=(throttle>0?48:30)*(1-load*.3)*(fast?2.5:1)*grade,length=throttle*speed*dt,n=Math.max(1,Math.ceil(Math.abs(length)/.5));let frame=s.frame,moved=0;
 for(let i=0;i<n;i++){
  const h=heading(frame.dump.heading-steer*length/n/65),dump={x:frame.dump.x+Math.sin(h)*length/n,z:frame.dump.z+Math.cos(h)*length/n,heading:h},candidate={...frame,dump};
  if(Math.abs(nativeDumpPose(candidate).position[1]-nativeDumpPose(frame).position[1])>2.01)break;if(!dumpPositionSafe(candidate)&&!(dumpPositionSafe(frame,{legacySupport:true})&&dumpPositionSafe(candidate,{legacySupport:true})&&nativeDumpRecoveryStep(frame,candidate)))break;moved+=Math.abs(length/n);frame={...candidate,player:seat(candidate)};
 }
 return moved?next(s,{...frame,revision:s.frame.revision+1},{vehicleTravel:s.vehicleTravel+moved,wheelTravel:s.wheelTravel+Math.sign(throttle)*moved}):s;
}
export function startDumpHandWork(s,kind,operationId,point=null){idle(s);check(s.mode==='foot','手作業は車を降りて行います。');return next(s,startShovelWork(s.frame,kind,operationId,point));}
export const progressDumpHandWork=(s,dt)=>next(s,progressShovelWork(s.frame,dt));
export const finishDumpHandWork=s=>next(s,finishShovelWork(s.frame));
export const returnDumpHandWork=s=>next(s,returnShovelWork(s.frame));

// Empty the full bed with one action, using bounded atomic batches. All planned
// voxels have support and clear volume before any soil leaves the bed.
export function dumpUnloadPlan(s){
 if(s.mode!=='driving'||s.frame.job||s.unload||s.frame.soil.pending||!s.frame.soil.containers.dump.amount)return null;
 if(!dumpPositionSafe(s.frame))return null;const support=nativeDumpSupport(s.frame);if(Math.abs(support.pitch)>8*Math.PI/180||Math.abs(support.roll)>6*Math.PI/180)return null;
 if(!dumpRaiseClear(s.frame))return null;
 const frame=s.frame,centre=shovelDumpPoint(frame,0,0,-62),columns=[];
 for(let x=Math.floor((centre[0]-40)/2);x<=Math.ceil((centre[0]+40)/2);x++)for(let z=Math.floor((centre[2]-40)/2);z<=Math.ceil((centre[2]+40)/2);z++){
  const p=[x*2+1,0,z*2+1],l=horizontalLocal(frame,p);if(Math.abs(l[0])>23||l[2]<-76||l[2]>-48||Math.abs(p[0])>296||Math.abs(p[2])>216)continue;
  const h=nativeDumpHeightAt(frame,p[0],p[2]);if(!Number.isFinite(h)||Math.abs(h/2-Math.round(h/2))>1e-8)continue;columns.push({x,z,l,y:Math.round(h/2)});
 }
 columns.sort((a,b)=>Math.abs(a.l[2]+62)-Math.abs(b.l[2]+62)||Math.abs(a.l[0])-Math.abs(b.l[0])||a.x-b.x||a.z-b.z);
 const positions=[],amount=frame.soil.containers.dump.amount;
 if(!columns.length)return null;
 const min=[Math.min(...columns.map(c=>c.x*2)),Math.min(...columns.map(c=>c.y*2)),Math.min(...columns.map(c=>c.z*2))],max=[Math.max(...columns.map(c=>c.x*2+2)),Math.max(...columns.map(c=>c.y*2+10)),Math.max(...columns.map(c=>c.z*2+2))];
 // The exact contacts below are unchanged. Unrelated native terrain cannot
 // touch this bounded drop volume and must not be scanned for every voxel.
 const blocked=[shovelDumpBody(frame),...obstacles(frame)].filter(b=>{const e=boxExtent(b);return e.every((r,i)=>b.position[i]+r>min[i]&&b.position[i]-r<max[i]);});
 for(let y=0;y<5&&positions.length<amount;y++)for(const c of columns){
  if(positions.length===amount)break;const p=[c.x,c.y+y,c.z],box={position:p.map(n=>n*2+1),size:2},parent=frame.soil.blocks[p.map(n=>Math.floor(n/4)).join(',')];
  if(soilVoxel(frame.soil,p)||parent&&parent.materialId!==frame.soil.containers.dump.materialId||blocked.some(b=>dumpBoxesOverlap(box,b)))return null;positions.push(p);
 }
 if(positions.length!==amount)return null;return{positions,amount,materialId:frame.soil.containers.dump.materialId};
}
const batchId=j=>j.id+'_'+Math.floor(j.done/SOIL_LIMITS.transfer);
function reserve(frame,j){const tid=batchId(j),storage=j.destination==='storage',positions=storage?[]:j.positions.slice(j.done,j.done+SOIL_LIMITS.transfer);return soilTransportCommand(frame.soil,{type:'reserve',id:tid+'_reserve',expectedRevision:frame.soil.revision,transferId:tid,from:'dump',to:storage?'storage':'terrain',materialId:j.materialId,amount:storage?Math.min(SOIL_LIMITS.transfer,j.total-j.done):positions.length,positions});}
// The rendered stream and its swept contact test share these coordinates.
// Each 2-unit soil particle stays above the bin bottom and inside its real rims.
export function dumpStorageFlowPoint(frame,target,index,u){
 const start=shovelDumpPoint(frame,0,17,-42),dest=[target[0]+(index%6-2.5)*4,target[1],target[2]+(Math.floor(index/6)-1.5)*3];
 return start.map((v,k)=>v+(dest[k]-v)*u+(k===1?Math.sin(Math.PI*u)*4:0));
}
const storageContacts=new WeakMap();
export function dumpStorageContact(frame){
 const key=canonical([frame.dump,frame.machineArm]),cached=storageContacts.get(frame.soil);if(cached?.key===key)return cached.target;
 let target=null;const landing=shovelDumpPoint(frame,0,0,-70);landing[1]=5.2;
 if(Math.abs(landing[0]-BIN.x)<=BIN.width/2-13&&Math.abs(landing[2]-BIN.z)<=BIN.depth/2-8&&dumpPositionSafe(frame)&&dumpRaiseClear(frame)){
  const start=shovelDumpPoint(frame,0,17,-42),min=[Math.min(start[0],landing[0]-10)-1,landing[1]-1,Math.min(start[2],landing[2]-4.5)-1],max=[Math.max(start[0],landing[0]+10)+1,Math.max(start[1],landing[1])+4,Math.max(start[2],landing[2]+4.5)+1];
  const blocks=shovelStorageObstacles(frame).filter(b=>{const ext=boxExtent(b);return ext.every((r,i)=>b.position[i]+r>=min[i]&&b.position[i]-r<=max[i]);});
  const gates=[.8*Math.sin(.8*Math.PI/2),.78,.8].map(a=>dumpRaisedBoxes(frame,a)[1]);
  let safe=true;
  for(let i=0;i<24&&safe;i++)for(let k=0;k<=128;k++){
   const u=k/128,bit={position:dumpStorageFlowPoint(frame,landing,i,u),size:2};
   if(blocks.some(b=>dumpBoxesOverlap(bit,b))||gates.some(gate=>dumpBoxesOverlap(bit,gate))){safe=false;break;}
  }
  if(safe)target=Object.freeze(landing);
 }
 storageContacts.set(frame.soil,{key,target});return target;
}
export function dumpStoragePlan(s){
 if(s.mode!=='driving'||s.frame.job||s.unload||s.frame.soil.pending)return null;
 const cargo=s.frame.soil.containers.dump,stored=s.frame.soil.containers.storage,amount=Math.min(cargo.amount,SOIL_CAPACITY.storage-stored.amount);
 if(amount<=0||stored.amount&&stored.materialId!==cargo.materialId)return null;const target=dumpStorageContact(s.frame);
 return target?{amount,materialId:cargo.materialId,target,retained:cargo.amount-amount}:null;
}
export function startDumpStorage(s,operationId){
 idle(s);check(id(operationId),'操作番号が不正です。');const plan=dumpStoragePlan(s);check(plan,'荷台の後ろを保管箱へ向けて停めてください。土と箱の空き、荷台の通り道を確認します。');
 check(s.frame.soil.journal.length+Math.ceil(plan.amount/SOIL_LIMITS.transfer)*3<=SOIL_LIMITS.history,'作業の記録が上限です。積荷を保持して止めます。');
 const unload={id:operationId,total:plan.amount,done:0,elapsed:0,returning:false,positions:[],materialId:plan.materialId,destination:'storage',target:plan.target,retained:plan.retained};
 return next(s,{...s.frame,revision:s.frame.revision+1,soil:reserve(s.frame,unload)},{unload});
}
export function startDumpUnload(s,operationId){
 idle(s);check(id(operationId),'操作番号が不正です。');const plan=dumpUnloadPlan(s);check(plan,'荷台が空か、後ろの地面がふさがっています。平らで空いた場所へ移動してください。');
 check(s.frame.soil.journal.length+Math.ceil(plan.amount/SOIL_LIMITS.transfer)*3<=SOIL_LIMITS.history,'作業の記録が上限です。積荷を保持して止めます。');
 const unload={id:operationId,total:plan.amount,done:0,elapsed:0,returning:false,positions:plan.positions,materialId:plan.materialId};return next(s,{...s.frame,revision:s.frame.revision+1,soil:reserve(s.frame,unload)},{unload});
}
export function progressDumpUnload(s,dt){check(s.unload&&finite(dt,0,.05),'荷下ろしの時間が不正です。');const j=s.unload,elapsed=j.returning?Math.max(0,j.elapsed-dt):Math.min(DUMP_UNLOAD_SECONDS,j.elapsed+dt);return next(s,s.frame,{unload:{...j,elapsed}});}
export const dumpUnloadReady=s=>!!s.unload&&(s.unload.returning?s.unload.elapsed===0:s.unload.elapsed===DUMP_UNLOAD_SECONDS);
export function cancelDumpUnload(s){check(s.unload,'荷下ろし中ではありません。');return next(s,s.frame,{unload:{...s.unload,returning:true}});}
export function finishDumpUnload(s){
 check(dumpUnloadReady(s),'荷台が戻るまでお待ちください。');const j=s.unload,tid=batchId(j);let soil=s.frame.soil;
 const command=type=>soil=soilTransportCommand(soil,{type,id:tid+'_'+type,expectedRevision:soil.revision,transferId:tid});
 if(j.returning){command('cancel');return next(s,{...s.frame,revision:s.frame.revision+1,soil},{unload:null});}
 const amount=soil.pending.amount;command('release');command('complete');const done=j.done+amount;
 const unload=done===j.total?null:{...j,done,elapsed:0};if(unload)soil=reserve({...s.frame,soil},unload);
 return next(s,{...s.frame,revision:s.frame.revision+1,soil},{unload});
}
export function dumpUnloadVisual(s){const j=s.unload;if(!j)return{bed:0,cargo:s.frame.soil.containers.dump.amount,portion:0,progress:0};const u=j.elapsed/DUMP_UNLOAD_SECONDS,portion=Math.max(0,Math.min(1,(u-.2)/.6)),storage=j.destination==='storage',raised=storage&&j.done&&!j.returning?1:Math.sin(Math.min(1,u/.25)*Math.PI/2),last=!storage||j.done+s.frame.soil.pending.amount===j.total;return{bed:raised*.8*(last&&u>.85?(1-u)/.15:1),cargo:s.frame.soil.containers.dump.amount+s.frame.soil.pending.amount*(1-portion),portion,progress:(j.done+s.frame.soil.pending.amount*portion)/j.total};}
export function validateDumpWork(s,{liveArm=false,aboardExcavator=false,bucketTransfer=false,storageTransfer=false}={}){
 exact(s,['format','scope','version','revision','frame','mode','vehicleTravel','wheelTravel','unload']);check(s.format===DUMP_WORK_FORMAT&&s.scope===DUMP_WORK_SCOPE&&s.version===1,'通常保存や旧ダンプの練習データは読み込めません。');
 check(Number.isSafeInteger(s.revision)&&s.revision>=0&&s.revision<Number.MAX_SAFE_INTEGER-1000&&['foot','driving'].includes(s.mode)&&finite(s.vehicleTravel,0,1e12)&&finite(s.wheelTravel,-1e12,1e12)&&Math.abs(s.wheelTravel)<=s.vehicleTravel+1e-6,'車両の保存内容が不正です。');
 validateShovelWork(s.frame,{mobileDump:true,aboardDump:s.mode==='driving',unloading:!!s.unload,liveArm,aboardExcavator,bucketTransfer,storageTransfer});check(dumpPositionSafe(s.frame,{preciseArm:liveArm})||dumpPositionSafe(s.frame,{preciseArm:liveArm,legacySupport:true}),'車が障害物や支えのない地面へ重なっています。');
 if(s.mode==='driving'){const p=seat(s.frame);check(!s.frame.job&&['x','y','z','heading'].every(k=>Math.abs(p[k]-s.frame.player[k])<1e-8),'人物が運転席にいません。');}
 if(s.unload){
  const j=s.unload,p=s.frame.soil.pending,storage=j.destination==='storage';exact(j,['id','total','done','elapsed','returning','positions','materialId',...(storage?['destination','target','retained']:[])]);
  check(dumpRaiseClear(s.frame),'上げる荷台の通り道がふさがっています。');
  check(s.mode==='driving'&&!s.frame.job&&id(j.id)&&Number.isSafeInteger(j.total)&&j.total>0&&j.total<=SOIL_CAPACITY.dump&&Number.isSafeInteger(j.done)&&j.done>=0&&j.done<j.total&&j.done%SOIL_LIMITS.transfer===0&&finite(j.elapsed,0,DUMP_UNLOAD_SECONDS)&&typeof j.returning==='boolean'&&Array.isArray(j.positions)&&j.positions.length===(storage?0:j.total),'荷下ろしの途中状態が不正です。');
  check(j.positions.every(q=>Array.isArray(q)&&q.length===3&&q.every(Number.isSafeInteger)&&q[1]>=-16&&q[1]<=127)&&new Set(j.positions.map(q=>q.join(','))).size===(storage?0:j.total),'盛土の座標が不正です。');
  check(p?.id===batchId(j)&&p.from==='dump'&&p.to===(storage?'storage':'terrain')&&p.phase==='reserved'&&p.materialId===j.materialId&&p.amount===Math.min(SOIL_LIMITS.transfer,j.total-j.done)&&canonical(p.positions)===canonical(j.positions.slice(j.done,j.done+p.amount)),'積荷と移送先の記録が一致しません。');
  if(storage){
   check(Array.isArray(j.target)&&j.target.length===3&&canonical(j.target)===canonical(dumpStorageContact(s.frame)),'保管箱への土の通り道が一致しません。');
   const stored=s.frame.soil.containers.storage.amount;check(Number.isSafeInteger(j.retained)&&j.retained>=0&&j.total+j.retained<=SOIL_CAPACITY.dump&&stored>=j.done&&j.total===Math.min(j.total+j.retained,SOIL_CAPACITY.storage-(stored-j.done)),'保管箱の空きと積荷の記録が一致しません。');
  }
  check(s.frame.soil.containers.dump.amount+p.amount===j.total-j.done+(storage?j.retained:0),'荷台の残量が一致しません。');
  const journal=s.frame.soil.journal,first=journal.findIndex(c=>c.type==='reserve'&&c.transferId===j.id+'_0');check(first>=0&&journal.length-first===j.done/SOIL_LIMITS.transfer*3+1,'荷下ろしの履歴数が不正です。');
  for(let k=0;k<=j.done/SOIL_LIMITS.transfer;k++){
   const r=journal[first+k*3],tid=j.id+'_'+k,amount=Math.min(SOIL_LIMITS.transfer,j.total-k*SOIL_LIMITS.transfer);
   check(r.type==='reserve'&&r.id===tid+'_reserve'&&r.transferId===tid&&r.from==='dump'&&r.to===(storage?'storage':'terrain')&&r.materialId===j.materialId&&r.amount===amount&&canonical(r.positions)===canonical(j.positions.slice(k*SOIL_LIMITS.transfer,k*SOIL_LIMITS.transfer+amount)),'下ろした部分の履歴が一致しません。');
   if(k<j.done/SOIL_LIMITS.transfer)for(const [i,type]of[[1,'release'],[2,'complete']]){const c=journal[first+k*3+i];check(c.type===type&&c.id===tid+'_'+type&&c.transferId===tid,'荷下ろし完了の履歴が一致しません。');}
  }
  const supporting=new Set(),blocked=[shovelDumpBody(s.frame),...obstacles(s.frame)];
  for(let i=0;i<j.positions.length;i++){
   const q=j.positions[i],l=horizontalLocal(s.frame,q.map(n=>n*2+1)),box={position:q.map(n=>n*2+1),size:2};check(Math.abs(l[0])<=23.01&&l[2]>=-76.01&&l[2]<=-47.99,'荷台の後ろ以外へ土は下ろせません。');
   if(i<j.done)check(soilVoxel(s.frame.soil,q)===j.materialId,'下ろした土が見つかりません。');
   else{check(!soilVoxel(s.frame.soil,q)&&!blocked.some(b=>dumpBoxesOverlap(box,b)),'置く場所に別の土や機械があります。');if(!supporting.has([q[0],q[1]-1,q[2]].join(',')))check(Math.abs(nativeDumpHeightAt(s.frame,q[0]*2+1,q[2]*2+1)-q[1]*2)<.05,'盛土の足元に地面がありません。');}
   if(q[1]>-16&&!supporting.has([q[0],q[1]-1,q[2]].join(',')))check(!!soilVoxel(s.frame.soil,[q[0],q[1]-1,q[2]])||q[1]===0,'盛土に支えがありません。');supporting.add(q.join(','));
  }
 }else check(!s.frame.soil.pending||!!s.frame.job||bucketTransfer||storageTransfer,'途中の土に作業がありません。');return s;
}
function soilIdentity(soil){let v=identity.get(soil);if(!v){v=canonical({site:soil.site,initial:soil.initial});identity.set(soil,v);}return v;}
export function validateDumpContinuation(a,b){validateDumpWork(a);validateDumpWork(b);check(soilIdentity(a.frame.soil)===soilIdentity(b.frame.soil),'別の現場へ切り替えられません。');check(b.frame.soil.journal.length>=a.frame.soil.journal.length&&a.frame.soil.journal.every((c,i)=>canonical(c)===canonical(b.frame.soil.journal[i])),'古い土の所有へ戻せません。');check(b.revision>=a.revision&&b.frame.revision>=a.frame.revision&&b.vehicleTravel>=a.vehicleTravel&&b.frame.player.travel>=a.frame.player.travel,'古い作業へ戻せません。');check(b.revision!==a.revision||canonical(a)===canonical(b),'同じ保存番号の内容が不正です。');return b;}
function checksum(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packDumpWork(s){validateDumpWork(s);return JSON.stringify({kind:DUMP_WORK_FORMAT,checksum:checksum(canonical(s)),state:s});}
export function unpackDumpWork(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+98304,'保存が大きすぎます。');let p;try{p=JSON.parse(text);}catch{throw Error('土を運ぶ：保存を読み取れません。');}exact(p,['kind','checksum','state']);check(p.kind===DUMP_WORK_FORMAT&&p.checksum===checksum(canonical(p.state)),'保存の検査に失敗しました。');return validateDumpWork(p.state);}
