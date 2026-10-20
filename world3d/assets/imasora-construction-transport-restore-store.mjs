import {encodeSaveWire,decodeSaveWire} from './imasora-save-wire.mjs';
import {runSharedSaveTask} from './imasora-save-task-queue.mjs?v=120gn';
// A dedicated worker runs proofs locally instead of spawning nested workers.
const proofOptions=typeof WorkerGlobalScope!=='undefined'&&globalThis instanceof WorkerGlobalScope?{createWorker:()=>null}:undefined;
const backgroundStorage=store=>typeof document!=='undefined'&&typeof Worker==='function'&&store.indexedDB===globalThis.indexedDB&&!store.failNext;
import {CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {snapshotTransportRestoreJournal,prepareTransportRestoreCommit,sameTransportRestoreValue,linkCheckedTransportRestorePoints} from './imasora-construction-transport-restore.mjs?v=120gn';
import {runWorldSaveTask,isCheckedTransportRestorePoint} from './imasora-world-save-client.mjs?v=120gn';
import {captureConstructionJson,captureOwnedConstructionJson,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
// IndexedDB has already produced ordinary data properties. Keep exact types,
// prototypes, array order and field presence, without repeating millions of
// descriptor allocations inside the atomic transaction. External callers still
// use the descriptor-safe comparator and full journal preflight.
function sameNativePoint(a,b,pairs=new WeakMap(),strictNumbers=false,knownRight=isCapturedConstructionJson(b)){
 if(a===b)return !strictNumbers||typeof a!=='number'||Object.is(a,b);if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b)||Array.isArray(a)!==Array.isArray(b))return false;
 // Numeric coordinates dominate large journals. Compare their exact native
 // values directly rather than allocating a WeakSet for every tiny triple.
 if(Array.isArray(a)&&a.length===3&&b.length===3&&Object.keys(a).length===3&&Object.hasOwn(a,0)&&Object.hasOwn(a,1)&&Object.hasOwn(a,2)&&typeof a[0]==='number'&&typeof a[1]==='number'&&typeof a[2]==='number'&&(knownRight||Object.keys(b).length===3&&Object.hasOwn(b,0)&&Object.hasOwn(b,1)&&Object.hasOwn(b,2)))return strictNumbers?Object.is(a[0],b[0])&&Object.is(a[1],b[1])&&Object.is(a[2],b[2]):a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
 // A captured right-hand tree is dense, acyclic and bounded in depth. Walking
 // it cannot loop, even if the new native left-hand value contains a cycle.
 // Keep checking every left key/value, but don't allocate pair sets or a
 // second index list for each array in that already captured tree.
 if(knownRight&&Array.isArray(a)){
  if(a.length!==b.length)return false;const keys=Object.keys(a);
  if(keys.length!==a.length)return false;
  for(let i=0;i<a.length;i++)if(!Object.hasOwn(a,i)||!sameNativePoint(a[i],b[i],pairs,strictNumbers,true))return false;
  return true;
 }
 if(!knownRight){let matches=pairs.get(a);if(matches?.has(b))return true;if(!matches){matches=new WeakSet();pairs.set(a,matches);}matches.add(b);}
 const keys=Object.keys(a);if(keys.length!==Object.keys(b).length||Array.isArray(a)&&a.length!==b.length)return false;
 return keys.every(k=>Object.hasOwn(b,k)&&sameNativePoint(a[k],b[k],pairs,strictNumbers,knownRight));
}
// Private, immutable points remain reusable only while a fresh native read
// exactly matches every field of the certificate. Another tab's edits are
// never trusted, even when the current head or restoration id is unchanged.
const checkedNativePoints=new WeakMap();
export function rememberCheckedTransportRestore(store,point){native(store);if(isCheckedTransportRestorePoint(point))checkedNativePoints.set(store,point);}
export function reuseCheckedTransportRestore(store,point){native(store);const cached=checkedNativePoints.get(store);return cached&&isCapturedConstructionJson(point)&&sameNativePoint(point,cached)?cached:null;}
function storedPoint(value){
 if(value?.format!=='imasora-soil-wire-1')return value??null;
 if(Object.keys(value).sort().join('|')!=='format|paths|root|soils')throw Error('復元前の保存が変わっています。');
 return decodeSaveWire(value);
}
export const TRANSPORT_RESTORE_KEY='construction-transport-restore';
const check=(yes,t)=>{if(!yes)throw Error('現場の復元：'+t);};
function native(s){check(s?.name==='imasora-world-authority-v1','通常保存以外へ復元できません。');}
// A private IndexedDB result has native data properties. Reuse only a
// structurally captured soil with exactly equal native values; this does NOT
// certify the imported point. Its complete worker check still follows.
function bindNativeSoil(journal,soil){
 if(!isCapturedConstructionJson(soil)||!journal||Object.getPrototypeOf(journal)!==Object.prototype)return journal;
 const matches=new WeakMap();let bound=journal;for(const name of ['beforeSaved','beforeUnsaved','applied']){
  const r=journal[name],w=r?.work,f=w?.frame;
  if(!r||!w||!f||Object.getPrototypeOf(r)!==Object.prototype||Object.getPrototypeOf(w)!==Object.prototype||Object.getPrototypeOf(f)!==Object.prototype)continue;
  const value=f.soil;let equal=value&&typeof value==='object'?matches.get(value):false;
  if(equal===undefined){equal=sameNativePoint(value,soil,new WeakMap(),true);matches.set(value,equal);}
  if(!equal)continue;
  if(bound===journal)bound={...journal};bound[name]={...r,work:{...w,frame:{...f,soil}}};
 }return bound;
}
export async function readTransportRestoreState(store,{soil=null}={}){native(store);if(backgroundStorage(store)){const result=await runSharedSaveTask('storage:transport-read',{name:store.name,soil}),cached=checkedNativePoints.get(store);return {...result,journal:cached&&sameNativePoint(result.journal,cached)?cached:result.journal};}const db=await store.open();return new Promise((resolve,reject)=>{const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(TRANSPORT_RESTORE_KEY);tx.oncomplete=()=>{try{const journal=storedPoint(point.result),cached=checkedNativePoints.get(store);resolve({record:head.result??null,journal:cached&&sameNativePoint(journal,cached)?cached:bindNativeSoil(journal,soil)});}catch(error){reject(error);}};tx.onabort=()=>reject(tx.error??Error('控えの読込みが中断されました。'));tx.onerror=()=>{};});}
// The checked head is already captured in the incoming journal. Its complete
// bytes are compared again in the write transaction; do not clone unused
// head/backups merely to inspect the previous point before validation.
async function readPriorPoint(store,soil=null){const db=await store.open();return new Promise((resolve,reject)=>{const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),point=tx.objectStore(CONSTRUCTION_STORE).get(TRANSPORT_RESTORE_KEY);tx.oncomplete=()=>{try{const value=storedPoint(point.result),cached=checkedNativePoints.get(store);resolve(cached&&sameNativePoint(value,cached)?cached:bindNativeSoil(value,soil));}catch(error){reject(error);}};tx.onabort=()=>reject(tx.error??Error('控えの読込みが中断されました。'));tx.onerror=()=>{};});}
function complexPoint(point){
 for(const name of ['beforeSaved','beforeUnsaved','applied']){
  let value=point;
  for(const key of [name,'work','frame','soil','journal']){
   const d=value&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,key):null;
   if(!d||!Object.hasOwn(d,'value'))return true;value=d.value;
  }
  if(!Array.isArray(value)||value.length>=256)return true;
 }
 return false;
}
export async function commitTransportRestore(store,journal,{priorSnapshot=null}={}){
 native(store);const size=k=>{const value=Object.getOwnPropertyDescriptor(journal??{},k)?.value;return typeof value==='string'?value.length:0;},large=size('expectedRaw')>=2*1024*1024||size('appliedRaw')>=2*1024*1024;
 const captured=isCheckedTransportRestorePoint(journal)?journal:large&&complexPoint(journal)?await captureConstructionJson(journal):snapshotTransportRestoreJournal(journal);
 // Keep the fresh native reads and atomic compare/write on one background
 // worker. The worker fully validates both points before its transaction.
 if(large&&backgroundStorage(store)){const record=await runSharedSaveTask('storage:transport-commit',{name:store.name,journal:captured,priorSnapshot:isCheckedTransportRestorePoint(priorSnapshot)?priorSnapshot:null});if(isCheckedTransportRestorePoint(captured))rememberCheckedTransportRestore(store,captured);return record;}
 const prior=await readPriorPoint(store,captured.beforeSaved?.work?.frame?.soil),args={journal:captured,priorPoint:prior};
 // Validate the new and previous points before opening a write transaction.
 // Compare BOTH current head and previous point inside the atomic write so
 // another tab cannot replace the checked inputs while validation is running.
 let prepared;
 if(isCheckedTransportRestorePoint(captured)){
  let checkedPrior=null;
  if(args.priorPoint!==null){
   if(isCheckedTransportRestorePoint(priorSnapshot)){
    check(sameNativePoint(args.priorPoint,priorSnapshot),'確認中に復元前の控えが変わりました。');checkedPrior=priorSnapshot;
   }else checkedPrior=isCheckedTransportRestorePoint(args.priorPoint)?args.priorPoint:await runWorldSaveTask('restore-point-bound',{journal:args.priorPoint,current:captured.beforeSaved},proofOptions);
  }
  prepared=linkCheckedTransportRestorePoints(captured,checkedPrior);
 }else prepared=captured.expectedRaw?.length>=2*1024*1024||captured.appliedRaw?.length>=2*1024*1024?await runWorldSaveTask('restore-commit',args,proofOptions):prepareTransportRestoreCommit(args);
 const frozen=prepared.journal,encoded=large&&complexPoint(frozen)?encodeSaveWire(frozen):null,db=await store.open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(TRANSPORT_RESTORE_KEY);let a=false,b=false,next,error;
  const stop=e=>{error=e;tx.abort();},write=()=>{if(!a||!b)return;try{
   const prior=head.result;check(prior?.generation===frozen.expectedGeneration&&prior.current===frozen.expectedRaw,'別の画面で保存が変わりました。上書きせず停止しました。');check(Array.isArray(prior.backups)&&prior.backups.every(x=>typeof x==='string'),'保存管理情報が不正です。');
   check(sameNativePoint(storedPoint(point.result),prepared.priorPoint),'確認中に復元前の控えが変わりました。上書きせず停止しました。');
   next={generation:frozen.appliedGeneration,current:frozen.appliedRaw,backups:[prior.current,...prior.backups].slice(0,5)};os.put(encoded??frozen,TRANSPORT_RESTORE_KEY);const request=os.put(next,'construction');request.onsuccess=()=>{if(store.failNext){store.failNext=false;stop(Error('確認用に現場の復元を中断しました。'));}};
  }catch(e){stop(e);}};head.onsuccess=()=>{a=true;write();};point.onsuccess=()=>{b=true;write();};tx.oncomplete=()=>{rememberCheckedTransportRestore(store,frozen);resolve(next);};tx.onabort=()=>reject(error??tx.error??Error('復元を中断し、元の現場を保持しました。'));tx.onerror=()=>{};
 });
}
