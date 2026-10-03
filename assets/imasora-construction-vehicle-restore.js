// Explicit rollback of one closed vehicle work scope, never its material ledger.
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=496';
import {unpackRecoveryBundle,MAX_RECOVERY_FILE} from './imasora-world-recovery-bundle.js?v=496';
import * as W from './imasora-construction-world-water.js';
import * as S from './imasora-construction-world-soil.js';
import * as T from './imasora-construction-world-timber.js';
export const MAX_VEHICLE_RESTORE_INPUT=MAX_RECOVERY_FILE;
export const VEHICLE_RESTORE_KINDS=Object.freeze(['water','soil','timber']);
const clone=structuredClone,equal=(a,b)=>canonical(a)===canonical(b);
const check=(v,m)=>{if(!v)throw Error(`車両作業の復元：${m}`);};
const specs={water:{key:'constructionWater',label:'給水ローダー',unit:'L',scale:1000,validate:W.validateWorldWater,checkpoint:W.waterCheckpoint,continuation:W.validateWaterContinuation},soil:{key:'constructionSoil',label:'火星土ローダー',unit:'ブロック',scale:1000,validate:S.validateWorldSoil,checkpoint:S.soilCheckpoint,continuation:S.validateSoilContinuation},timber:{key:'constructionTimber',label:'木材クレーン',unit:'枚',scale:T.FLOOR_VOLUME,validate:T.validateWorldTimber,checkpoint:T.timberCheckpoint,continuation:T.validateTimberContinuation}};
export function vehicleRestoreSpec(kind){check(VEHICLE_RESTORE_KINDS.includes(kind),'車両の種類が不正です。');return specs[kind];}
function exact(value,names){check(value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).sort().join('|')===[...names].sort().join('|'),'確認情報の項目が不正です。');}
function validLedger(ledger){L.validateWorldPurchaseLedger(ledger);check(ledger.scope==='imasora-world-ledger-v1'&&!ledger.pending&&!ledger.world.equipmentCraftPending,'通常保存の購入・装備作成を完了してから確認してください。');return ledger;}
function received(ledger,kind){return ledger.events.filter(e=>e.kind==='delivery'&&e.offerId===`mars-${kind}`).reduce((n,e)=>n+e.amount,0);}
function safeWork(kind,work,total){
  const s=vehicleRestoreSpec(kind);s.validate(work,total);
  check(kind!=='water'||!work.delivery,'保管口の水の移送を終えて保存してから確認してください。');
  check(kind!=='soil'||!['load','store'].includes(work.work.task?.kind),'土の積込・収納を終えて保存してから確認してください。');
  check(kind!=='timber'||!work.work.rig.transition,'乗り降りを終えて保存してから確認してください。');
  return work;
}
function inUse(kind,work){return kind==='water'?work.allocated*250:kind==='soil'?S.worldSoilTotals(work).inUse:T.worldTimberTotals(work).inUse;}
export function vehicleRestoreBoundary(ledger,kind){
  validLedger(ledger);const s=vehicleRestoreSpec(kind),work=ledger.world[s.key],total=received(ledger,kind);safeWork(kind,work,total);
  const allocated=inUse(kind,work);return {source:clone(ledger.source),material:`mars-${kind}`,events:clone(ledger.events.filter(e=>e.offerId===`mars-${kind}`)),purchased:ledger.materials[`mars-${kind}`],received:total,warehouse:total-allocated,inUse:allocated,siteIndex:work.siteIndex,workTotal:kind==='water'?work.allocated:work.work.source.total};
}
export function vehicleRestoreCheckpoint(kind,work){return vehicleRestoreSpec(kind).checkpoint(work);}
export function vehicleRestoreUndoMatches(kind,current,applied){
  if(!current||!applied||current.revision<applied.revision)return false;
  const a=vehicleRestoreCheckpoint(kind,current),b=vehicleRestoreCheckpoint(kind,applied);a.revision=b.revision;return equal(a,b);
}
export function validateVehicleRestoreBefore(currentLedger,kind,beforeUnsaved){
  const s=vehicleRestoreSpec(kind),boundary=vehicleRestoreBoundary(currentLedger,kind),old=currentLedger.world[s.key];safeWork(kind,beforeUnsaved,boundary.received);
  if(!equal(old,beforeUnsaved))s.continuation(old,beforeUnsaved);
  check(beforeUnsaved.siteIndex===old.siteIndex&&inUse(kind,beforeUnsaved)===boundary.inUse,'未保存の出庫・収納を先に保存してください。');
  if(kind!=='water')check(beforeUnsaved.work.source.total===old.work.source.total,'未保存の受取反映を先に保存してください。');
  return beforeUnsaved;
}
export function vehicleRestoreCandidate(ledger,kind){const boundary=vehicleRestoreBoundary(ledger,kind);return {work:clone(ledger.world[vehicleRestoreSpec(kind).key]),boundary};}
export function vehicleRestoreUndoCandidate(journal){const candidate=vehicleRestoreCandidate(L.unpackWorldPurchaseLedger(journal.expectedRaw),journal.vehicleKind);candidate.work=clone(journal.beforeUnsaved);return candidate;}
function validateCandidate(current,kind,candidate){
  exact(candidate,['work','boundary']);const boundary=vehicleRestoreBoundary(current,kind);
  check(equal(boundary,candidate.boundary),'購入・受取・保管量または区画が現在と違います。この控えでは復元できません。');
  safeWork(kind,candidate.work,boundary.received);
  check(candidate.work.siteIndex===boundary.siteIndex&&inUse(kind,candidate.work)===boundary.inUse,'復元する作業の区画・使用量が一致しません。');
  check((kind==='water'?candidate.work.allocated:candidate.work.work.source.total)===boundary.workTotal,'作業側の受取量が一致しません。');return candidate;
}
function advance(...values){check(values.every(v=>Number.isSafeInteger(v)&&v>=0)&&Math.max(...values)<Number.MAX_SAFE_INTEGER-1,'作業の保存番号が上限です。');return Math.max(...values)+1;}
export function createVehicleRestoreLedger(currentLedger,kind,candidate,beforeUnsaved){
  validateVehicleRestoreBefore(currentLedger,kind,beforeUnsaved);validateCandidate(currentLedger,kind,candidate);
  const s=vehicleRestoreSpec(kind),old=currentLedger.world[s.key],work=vehicleRestoreCheckpoint(kind,candidate.work);
  work.revision=advance(old.revision,candidate.work.revision,beforeUnsaved.revision);
  work.work.revision=advance(old.work.revision,candidate.work.work.revision,beforeUnsaved.work.revision);
  if(kind==='timber'&&[old,candidate.work,beforeUnsaved].some(w=>w.work.joints!==undefined)){
    work.work.joints??=[];work.work.assemblyRevision=advance(old.work.assemblyRevision??0,candidate.work.work.assemblyRevision??0,beforeUnsaved.work.assemblyRevision??0);
    if(work.work.joining)work.work.joining.operation=work.work.assemblyRevision;
  }
  const next=clone(currentLedger);next.world[s.key]=work;next.worldWrites=advance(currentLedger.worldWrites);next.revision=advance(currentLedger.revision);
  safeWork(kind,work,received(next,kind));L.validateWorldPurchaseLedger(next);return next;
}
export function vehicleRestoreSummary(kind,work,ledger){
  const s=vehicleRestoreSpec(kind),b=ledger?vehicleRestoreBoundary(ledger,kind):null;let counts;
  if(kind==='water'){const t=W.worldWaterTotals(work);counts=Object.fromEntries(['source','bucket','transit','course','returnTank','moving'].map(k=>[k,(t[k]??0)/4]));counts.total=t.totalWithTransit/4;}
  else if(kind==='soil'){const t=S.worldSoilTotals(work);counts=Object.fromEntries(['stock','bucket','ground','moving','total'].map(k=>[k,t[k]]));}
  else{const t=T.worldTimberTotals(work);counts=Object.fromEntries(['stored','loose','held','floating','fixed','total'].map(k=>[k,t[k]]));}
  return {kind,label:s.label,unit:s.unit,siteIndex:work.siteIndex,revision:work.revision,purchased:b?b.purchased/s.scale:null,received:b?b.received/s.scale:null,warehouse:b?b.warehouse/s.scale:null,inUse:inUse(kind,work)/s.scale,counts:clone(counts)};
}
function inspected(ledger,{kind,currentLedger,beforeUnsaved},source){
  const candidate=vehicleRestoreCandidate(ledger,kind);createVehicleRestoreLedger(currentLedger,kind,candidate,beforeUnsaved);
  return {candidate,source,summary:vehicleRestoreSummary(kind,candidate.work,ledger)};
}
// Callers may use this ONLY for a raw entry from the current managed history.
export function inspectVehicleRestoreHistory(raw,options){return inspected(L.unpackWorldPurchaseLedger(raw),options,{kind:'history'});}
export async function inspectVehicleRestoreBundle(text,{kind,currentLedger,beforeUnsaved,origin}={}){
  const options={kind,currentLedger:clone(currentLedger),beforeUnsaved:clone(beforeUnsaved)};validateVehicleRestoreBefore(options.currentLedger,kind,options.beforeUnsaved);
  const payload=await unpackRecoveryBundle(text);check(payload.origin===origin,'控えの保存元アドレスが現在と違います。');
  const db=payload.domains.databases.find(d=>d.name==='imasora-world-authority-v1');check(db?.version===1,'通常保存のデータベースがありません。');
  const head=db.stores.find(s=>s.name==='snapshots')?.entries.find(e=>e.key==='construction')?.value;
  exact(head,['generation','current','backups']);check(Number.isSafeInteger(head.generation)&&head.generation>0&&head.generation<Number.MAX_SAFE_INTEGER&&typeof head.current==='string'&&Array.isArray(head.backups)&&head.backups.length<=5&&head.backups.every(x=>typeof x==='string'),'通常保存の管理情報が不正です。');
  head.backups.forEach(raw=>L.unpackWorldPurchaseLedger(raw));
  return inspected(L.unpackWorldPurchaseLedger(head.current),options,{kind:'recovery-bundle',origin:payload.origin,capturedAt:payload.capturedAt,generation:head.generation,version:payload.version});
}
