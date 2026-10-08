import {CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {snapshotTransportRestoreJournal,prepareTransportRestoreCommit,sameTransportRestoreValue} from './imasora-construction-transport-restore.mjs';
import {runWorldSaveTask} from './imasora-world-save-client.mjs';
export const TRANSPORT_RESTORE_KEY='construction-transport-restore';
const check=(yes,t)=>{if(!yes)throw Error('現場の復元：'+t);};
function native(s){check(s?.name==='imasora-world-authority-v1','通常保存以外へ復元できません。');}
export async function readTransportRestoreState(store){native(store);const db=await store.open();return new Promise((resolve,reject)=>{const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(TRANSPORT_RESTORE_KEY);tx.oncomplete=()=>resolve({record:head.result??null,journal:point.result??null});tx.onabort=()=>reject(tx.error??Error('控えの読込みが中断されました。'));tx.onerror=()=>{};});}
// The checked head is already captured in the incoming journal. Its complete
// bytes are compared again in the write transaction; do not clone unused
// head/backups merely to inspect the previous point before validation.
async function readPriorPoint(store){const db=await store.open();return new Promise((resolve,reject)=>{const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),point=tx.objectStore(CONSTRUCTION_STORE).get(TRANSPORT_RESTORE_KEY);tx.oncomplete=()=>resolve(point.result??null);tx.onabort=()=>reject(tx.error??Error('控えの読込みが中断されました。'));tx.onerror=()=>{};});}
export async function commitTransportRestore(store,journal){
 native(store);const captured=snapshotTransportRestoreJournal(journal),prior=await readPriorPoint(store),args={journal:captured,priorPoint:prior===null?null:snapshotTransportRestoreJournal(prior)};
 // Validate the new and previous points before opening a write transaction.
 // Compare BOTH current head and previous point inside the atomic write so
 // another tab cannot replace the checked inputs while validation is running.
 const prepared=captured.expectedRaw?.length>=2*1024*1024||captured.appliedRaw?.length>=2*1024*1024?await runWorldSaveTask('restore-commit',args):prepareTransportRestoreCommit(args);
 const frozen=prepared.journal,db=await store.open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(TRANSPORT_RESTORE_KEY);let a=false,b=false,next,error;
  const stop=e=>{error=e;tx.abort();},write=()=>{if(!a||!b)return;try{
   const prior=head.result;check(prior?.generation===frozen.expectedGeneration&&prior.current===frozen.expectedRaw,'別の画面で保存が変わりました。上書きせず停止しました。');check(Array.isArray(prior.backups)&&prior.backups.every(x=>typeof x==='string'),'保存管理情報が不正です。');
   check(sameTransportRestoreValue(point.result??null,prepared.priorPoint),'確認中に復元前の控えが変わりました。上書きせず停止しました。');
   next={generation:frozen.appliedGeneration,current:frozen.appliedRaw,backups:[prior.current,...prior.backups].slice(0,5)};os.put(frozen,TRANSPORT_RESTORE_KEY);const request=os.put(next,'construction');request.onsuccess=()=>{if(store.failNext){store.failNext=false;stop(Error('確認用に現場の復元を中断しました。'));}};
  }catch(e){stop(e);}};head.onsuccess=()=>{a=true;write();};point.onsuccess=()=>{b=true;write();};tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error??tx.error??Error('復元を中断し、元の現場を保持しました。'));tx.onerror=()=>{};
 });
}
