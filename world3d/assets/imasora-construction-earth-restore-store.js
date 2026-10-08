// Normal earth restoration is one transaction: retain both old snapshots and
// the exact applied record before exposing a new world head. No localStorage.
import {CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=497';
import {validateAuthorityExcavationContinuation} from './imasora-construction-earth-authority.js?v=496';
import {sameEarthRestoreSource,restoreAuthorityEarth} from './imasora-construction-earth-restore.js?v=497';

export const EARTH_RESTORE_KEY='construction-earth-restore';
const HEAD_KEY='construction',LIVE_DB='imasora-world-authority-v1';
const check=(yes,message)=>{if(!yes)throw Error(`通常地形の復元：${message}`);};
const equal=(a,b)=>canonical(a)===canonical(b);
function nativeStore(store){check(store?.name===LIVE_DB,'通常保存以外へ復元できません。');}
export function validateEarthRestoreBefore(current,before){
  sameEarthRestoreSource(current,before);
  if(!equal(current,before))validateAuthorityExcavationContinuation(current,before);
  return before;
}
export function createEarthRestoreLedger(current,candidate){
  L.validateWorldPurchaseLedger(current);
  check(current.world.constructionTransport===undefined,'共有土の地形だけを復元できません。荷台・手元・移送中の土も一緒に確認してください。');
  check(!current.pending&&!current.world.equipmentCraftPending,'保留中の購入・装備作成を先に確認してください。');
  const next=structuredClone(current);
  next.world.constructionExcavation=restoreAuthorityEarth(current.world.constructionExcavation,candidate);
  next.worldWrites++;next.revision++;L.validateWorldPurchaseLedger(next);return next;
}
export function validateEarthRestoreJournal(journal){
  const names=['version','scope','id','kind','priorRestoreId','expectedGeneration','expectedRaw','appliedGeneration','appliedRaw','beforeSaved','beforeUnsaved','applied'];
  check(journal&&Object.getPrototypeOf(journal)===Object.prototype&&Object.keys(journal).sort().join('|')===names.sort().join('|'),'復元前控えの項目が不正です。');
  check(journal.version===1&&journal.scope==='imasora-earth-restore-point-v1','復元前控えの形式が不正です。');
  check(typeof journal.id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(journal.id),'復元の確認番号が不正です。');
  check(['restore','undo'].includes(journal.kind),'復元の区分が不正です。');
  check(journal.kind==='restore'?journal.priorRestoreId===null:typeof journal.priorRestoreId==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(journal.priorRestoreId),'復元元の確認番号が不正です。');
  check(Number.isSafeInteger(journal.expectedGeneration)&&journal.expectedGeneration>0&&journal.expectedGeneration<Number.MAX_SAFE_INTEGER-1&&journal.appliedGeneration===journal.expectedGeneration+1,'保存番号が不正です。');
  const before=L.unpackWorldPurchaseLedger(journal.expectedRaw),after=L.unpackWorldPurchaseLedger(journal.appliedRaw);
  check(equal(before.world.constructionExcavation,journal.beforeSaved),'保存済みの地形控えが一致しません。');
  validateEarthRestoreBefore(journal.beforeSaved,journal.beforeUnsaved);
  check(equal(after.world.constructionExcavation,journal.applied),'復元した地形の控えが一致しません。');
  // Full-ledger comparison proves that wallet, history, works, equipment and
  // every unknown world field remain byte-equivalent JSON values.
  const expected=createEarthRestoreLedger(before,journal.applied);
  check(equal(expected,after),'地形以外の保存を変更する復元はできません。');
  return journal;
}
export async function readEarthRestoreState(store){
  nativeStore(store);const db=await store.open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),os=tx.objectStore(CONSTRUCTION_STORE);
    const head=os.get(HEAD_KEY),point=os.get(EARTH_RESTORE_KEY);
    tx.oncomplete=()=>resolve({record:head.result??null,journal:point.result??null});
    tx.onabort=()=>reject(tx.error??Error('復元前控えの読込みが中断されました。'));tx.onerror=()=>{};
  });
}
export async function readEarthRestore(store){
  const {journal}=await readEarthRestoreState(store);return journal===null?null:validateEarthRestoreJournal(journal);
}
export async function commitEarthRestore(store,journal){
  nativeStore(store);const frozen=structuredClone(validateEarthRestoreJournal(journal)),db=await store.open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE);
    const head=os.get(HEAD_KEY),point=os.get(EARTH_RESTORE_KEY);let gotHead=false,gotPoint=false,next,error;
    const stop=e=>{error=e;tx.abort();};
    const write=()=>{
      if(!gotHead||!gotPoint)return;
      try{
        const prior=head.result;
        check(prior?.generation===frozen.expectedGeneration&&prior.current===frozen.expectedRaw,'別の画面で保存が変更されています。上書きせず停止しました。');
        check(Array.isArray(prior.backups)&&prior.backups.every(v=>typeof v==='string'),'保存管理情報が不正です。');
        if(point.result!==undefined&&point.result!==null){
          const old=validateEarthRestoreJournal(point.result);
          sameEarthRestoreSource(frozen.beforeSaved,old.applied);
        }
        if(frozen.kind==='undo'){
          const old=validateEarthRestoreJournal(point.result);
          check(old.kind==='restore'&&old.id===frozen.priorRestoreId,'復元前控えが変更されています。');
          check(equal(frozen.beforeSaved,old.applied),'復元後に地形が変更されています。');
          check(equal(frozen.applied,restoreAuthorityEarth(frozen.beforeSaved,old.beforeUnsaved)),'復元前の作業と戻す内容が一致しません。');
        }
        next={generation:frozen.appliedGeneration,current:frozen.appliedRaw,backups:[prior.current,...prior.backups].slice(0,5)};
        os.put(frozen,EARTH_RESTORE_KEY);
        const request=os.put(next,HEAD_KEY);
        request.onsuccess=()=>{if(store.failNext){store.failNext=false;stop(Error('確認用に地形復元を中断しました。'));}};
      }catch(e){stop(e);}
    };
    head.onsuccess=()=>{gotHead=true;write();};point.onsuccess=()=>{gotPoint=true;write();};
    tx.oncomplete=()=>resolve(next);
    tx.onabort=()=>reject(error??tx.error??Error('地形の復元が中断されました。元の記録を保持しています。'));tx.onerror=()=>{};
  });
}
