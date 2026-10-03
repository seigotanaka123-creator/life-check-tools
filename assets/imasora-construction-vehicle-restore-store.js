// Vehicle-only restore and its previous unsaved work are committed atomically.
import {CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=496';
import {vehicleRestoreSpec,vehicleRestoreCandidate,vehicleRestoreUndoMatches,validateVehicleRestoreBefore,createVehicleRestoreLedger} from './imasora-construction-vehicle-restore.js?v=502';
const check=(v,m)=>{if(!v)throw Error(`車両作業の復元：${m}`);},equal=(a,b)=>canonical(a)===canonical(b);
const id=v=>typeof v==='string'&&/^[\w-]{8,96}$/.test(v);
export function vehicleRestoreKey(kind){vehicleRestoreSpec(kind);return `construction-vehicle-restore:${kind}`;}
function nativeStore(store){check(store?.name==='imasora-world-authority-v1','通常保存以外では復元できません。');}
export function validateVehicleRestoreJournal(j){
  const names=['version','scope','id','kind','vehicleKind','priorRestoreId','expectedGeneration','expectedRaw','appliedGeneration','appliedRaw','beforeSaved','beforeUnsaved','candidate','applied'];
  check(j&&Object.getPrototypeOf(j)===Object.prototype&&Object.keys(j).sort().join('|')===names.sort().join('|'),'直前控えの項目が不正です。');
  check(j.version===1&&j.scope==='imasora-vehicle-restore-point-v1'&&id(j.id)&&['restore','undo'].includes(j.kind),'直前控えの形式が不正です。');
  check(j.kind==='restore'?j.priorRestoreId===null:id(j.priorRestoreId),'取消元の番号が不正です。');const s=vehicleRestoreSpec(j.vehicleKind);
  check(Number.isSafeInteger(j.expectedGeneration)&&j.expectedGeneration>0&&j.expectedGeneration<Number.MAX_SAFE_INTEGER-1&&j.appliedGeneration===j.expectedGeneration+1,'保存番号が不正です。');
  const before=L.unpackWorldPurchaseLedger(j.expectedRaw),after=L.unpackWorldPurchaseLedger(j.appliedRaw);
  check(equal(before.world[s.key],j.beforeSaved)&&equal(after.world[s.key],j.applied),'作業の控えと世界保存が一致しません。');
  validateVehicleRestoreBefore(before,j.vehicleKind,j.beforeUnsaved);
  if(j.kind==='undo')check(vehicleRestoreUndoMatches(j.vehicleKind,j.beforeUnsaved,j.beforeSaved),'復元後に未保存の作業が変わっています。');
  check(equal(createVehicleRestoreLedger(before,j.vehicleKind,j.candidate,j.beforeUnsaved),after),'対象車両以外の保存を変更できません。');return j;
}
export function validateVehicleRestorePrevious(journal,old){
  const j=validateVehicleRestoreJournal(journal),before=L.unpackWorldPurchaseLedger(j.expectedRaw);
  if(old!==null&&old!==undefined){validateVehicleRestoreJournal(old);check(old.vehicleKind===j.vehicleKind&&equal(L.unpackWorldPurchaseLedger(old.appliedRaw).source,before.source),'別の車両・保存元の直前控えです。');}
  if(j.kind==='undo'){
    check(old?.kind==='restore'&&old.id===j.priorRestoreId,'戻せる復元前控えが変更されています。');
    check(vehicleRestoreUndoMatches(j.vehicleKind,j.beforeSaved,old.applied)&&vehicleRestoreUndoMatches(j.vehicleKind,j.beforeUnsaved,old.applied),'復元後に作業が変更されています。');
    const prior=L.unpackWorldPurchaseLedger(old.expectedRaw),candidate=vehicleRestoreCandidate(prior,j.vehicleKind);candidate.work=structuredClone(old.beforeUnsaved);
    check(equal(j.candidate,candidate),'戻す作業が直前の控えと一致しません。');
  }return j;
}
export async function readVehicleRestoreState(store,kind){
  nativeStore(store);const key=vehicleRestoreKey(kind),db=await store.open();return new Promise((resolve,reject)=>{
    const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(key);
    tx.oncomplete=()=>resolve({record:head.result??null,journal:point.result??null});tx.onabort=()=>reject(tx.error??Error('車両の直前控えを読めませんでした。'));tx.onerror=()=>{};
  });
}
export async function commitVehicleRestore(store,journal){
  nativeStore(store);const frozen=structuredClone(validateVehicleRestoreJournal(journal)),key=vehicleRestoreKey(frozen.vehicleKind),db=await store.open();return new Promise((resolve,reject)=>{
    const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(key);let gotHead=false,gotPoint=false,next,error;
    const stop=e=>{error=e;tx.abort();};const write=()=>{if(!gotHead||!gotPoint)return;try{
      const prior=head.result;check(prior?.generation===frozen.expectedGeneration&&prior.current===frozen.expectedRaw,'別の画面で保存が変わりました。上書きせず停止します。');
      check(Array.isArray(prior.backups)&&prior.backups.length<=5&&prior.backups.every(v=>typeof v==='string'),'保存管理情報が不正です。');
      validateVehicleRestorePrevious(frozen,point.result);
      next={generation:frozen.appliedGeneration,current:frozen.appliedRaw,backups:[prior.current,...prior.backups].slice(0,5)};os.put(frozen,key);
      const req=os.put(next,'construction');req.onsuccess=()=>{if(store.failNext){store.failNext=false;stop(Error('確認用に車両復元を中断しました。'));}};
    }catch(e){stop(e);}};
    head.onsuccess=()=>{gotHead=true;write();};point.onsuccess=()=>{gotPoint=true;write();};tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error??tx.error??Error('復元を中断しました。元の記録を保持しています。'));tx.onerror=()=>{};
  });
}
