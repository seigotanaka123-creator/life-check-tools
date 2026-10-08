import {canonical} from './imasora-construction-state.js';
import {createNativeSoilTransport,validateSoilTransport,soilTransportCommand,soilTransportTotals} from './imasora-construction-soil-transport.mjs';
import {createScoopDumpWork,validateScoopDumpWork,SCOOP_DUMP_FORMAT,SCOOP_DUMP_SCOPE} from './imasora-construction-fragment-scoop.mjs';
import {createBucketDumpWork,linkedExcavatorSeat,linkedArmClear} from './imasora-construction-bucket-dump.mjs';
import {shovelMachineState,shovelStanding,shovelDumpPoint,shovelMachines,shovelSoilBoxes} from './imasora-construction-shovel-work.mjs';
import {dumpPositionSafe,dumpBoxesOverlap} from './imasora-construction-dump-work.mjs';
import {SITE} from './imasora-construction-loader-physics.js';

export const WORLD_TRANSPORT_SCOPE='imasora-world-soil-transport-v1';
const check=(v,t)=>{if(!v)throw Error('土の保存：'+t);};
// The inner transport state is a replayable quantity model, not an import
// permission. Only the current world's stopped native allocation can open it.
export function createWorldTransport(earth,profileId){
 return validateWorldTransport({version:1,scope:WORLD_TRANSPORT_SCOPE,profileId,soil:createNativeSoilTransport(earth)},earth,profileId);
}
export const worldTransportSoil=record=>record?.version===2?record.work.frame.soil:record?.soil;
// A quantity-only legacy record has no actor continuation. It can reuse the
// recorded source actors only when every soil position and owner is restored.
// Keep its replayable history; equal totals alone do not prove a safe opening.
const restingSoil=({revision,journal,...state})=>state;
// Only a reviewed v3 migration may change restart positions. Search a bounded,
// deterministic grid nearest the original stop; use the real support, body,
// door and arm checks, never a cleared or flattened copy of the soil.
function restartGrid(p){
 const points=[];
 for(let i=Math.ceil((SITE.minX-p.x)/16);i<=Math.floor((SITE.maxX-p.x)/16);i++)for(let k=Math.ceil((SITE.minZ-p.z)/16);k<=Math.floor((SITE.maxZ-p.z)/16);k++)points.push({x:p.x+i*16,z:p.z+k*16,d:i*i+k*k});
 return points.sort((a,b)=>a.d-b.d||a.x-b.x||a.z-b.z);
}
function safeRestart(work){
 let frame=work.frame;
 check(!shovelSoilBoxes(frame.soil).some(b=>dumpBoxesOverlap(shovelMachines(frame)[0],b)),'保存したショベルの車体が土と重なっています。土も車体も消さず、元の現場の控えを保持します。');
 const parkingClear=f=>dumpPositionSafe(f,{preciseArm:true})&&linkedArmClear(f)&&[-1,1].some(side=>{const p=shovelDumpPoint(f,side*52,0,18);return shovelStanding(f,{...f.player,x:p[0],y:0,z:p[2]});});
 if(!dumpPositionSafe(frame,{preciseArm:true})||!linkedArmClear(frame)){
  const spot=restartGrid(frame.dump).find(p=>parkingClear({...frame,dump:{x:p.x,z:p.z,heading:frame.dump.heading}}));
  check(spot,'土を残したまま安全に駐車できる場所がありません。元の現場の控えを保持してください。');
  frame={...frame,dump:{x:spot.x,z:spot.z,heading:frame.dump.heading}};
 }
 if(work.mode==='foot'&&!shovelStanding(frame,frame.player)){
  const spot=restartGrid(frame.player).find(p=>shovelStanding(frame,{...frame.player,x:p.x,y:0,z:p.z}));
  check(spot,'土を残したまま立てる再開位置がありません。元の現場の控えを保持してください。');
  frame={...frame,player:{...frame.player,x:spot.x,y:0,z:spot.z}};
 }
 return {...work,frame};
}
function openWorldTransportWork(earth,profileId,previous=null,recoverLegacy=false,relocate=false){
 if(previous){validateWorldTransport(previous,earth,profileId);if(previous.version===2)return previous;}
 const soil=createNativeSoilTransport(earth);
 if(previous){if(recoverLegacy)check(!previous.soil.pending,'途中の土の扱いを確認してから切り替えてください。');else check(canonical(restingSoil(previous.soil))===canonical(restingSoil(soil)),'土が既に動いています。人物と途中作業を確認してから切り替えてください。');}
 const held=soil.containers.bucket.amount;
 let work=held?{...createBucketDumpWork(earth),format:SCOOP_DUMP_FORMAT,scope:SCOOP_DUMP_SCOPE,scoop:null}:createScoopDumpWork(earth);
 const old=shovelMachineState(work.frame);check(['foot','working'].includes(old.loader.mode),'ショベルを降りるか作業モードにしてから切り替えてください。');
 const p=old.loader.player;
 work={...work,mode:old.loader.mode==='working'?'excavating':'foot',frame:{...work.frame,soil:previous?structuredClone(previous.soil):work.frame.soil,player:{x:p.x,y:p.y,z:p.z,heading:p.heading,travel:0}}};
 if(work.mode==='excavating')work.frame.player=linkedExcavatorSeat(work.frame);
 if(relocate)work=safeRestart(work);
 return validateWorldTransport({version:2,scope:WORLD_TRANSPORT_SCOPE,profileId,work},earth,profileId);
}
export function createWorldTransportWork(earth,profileId,previous=null){return openWorldTransportWork(earth,profileId,previous);}
// Only the reviewed recovery journal uses this entry. Soil is never re-seeded:
// retain its replayed coordinates and owners, and use the recorded stopped
// source actors. A v3 review can additionally choose checked restart positions;
// the default and all earlier journals keep their original refusal policy.
export function recoverLegacyWorldTransportWork(earth,profileId,previous,relocate=false){
 check(typeof relocate==='boolean','再開位置の確認方法が不正です。');
 validateWorldTransport(previous,earth,profileId);check(previous.version===1,'旧形式の共有土だけを引き継げます。');
 return openWorldTransportWork(earth,profileId,previous,true,relocate);
}
export function validateWorldTransport(record,earth,profileId){
 check(record&&Object.getPrototypeOf(record)===Object.prototype,'土の保存形式が不正です。');
 const descriptors=Object.getOwnPropertyDescriptors(record),version=descriptors.version?.value;
 const names=['version','scope','profileId',version===2?'work':'soil'];
 check(Reflect.ownKeys(record).length===names.length&&Object.keys(record).sort().join('|')===names.sort().join('|')&&Object.values(Object.getOwnPropertyDescriptors(record)).every(d=>Object.hasOwn(d,'value')),'土の保存項目が不正です。');
 check([1,2].includes(record.version)&&record.scope===WORLD_TRANSPORT_SCOPE&&typeof profileId==='string'&&/^[a-f0-9]{8}$/.test(profileId)&&record.profileId===profileId,'別の世界や試験用の土は取り込めません。');
 const soil=worldTransportSoil(record);if(record.version===2)validateScoopDumpWork(record.work);else validateSoilTransport(soil);
 check(soil.schema===2&&canonical(soil.initial.source)===canonical(earth),'切替元の地形・姿勢・土量が変わっています。旧地形だけを復元できません。');
 return record;
}
export function commandWorldTransport(record,earth,profileId,command){
 validateWorldTransport(record,earth,profileId);
 check(record.version===1,'土と人物の動きを一緒に保存してください。数量だけの操作はできません。');
 const soil=soilTransportCommand(record.soil,command);
 return soil===record.soil?record:validateWorldTransport({...record,soil},earth,profileId);
}
export function worldTransportTotals(record,earth,profileId){validateWorldTransport(record,earth,profileId);return soilTransportTotals(worldTransportSoil(record));}
