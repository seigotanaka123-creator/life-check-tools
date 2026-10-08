import {CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {validateTransportMigrationJournal} from './imasora-construction-transport-migration.mjs';
export const TRANSPORT_MIGRATION_KEY='construction-transport-migration';
const check=(v,t)=>{if(!v)throw Error('現場の引継ぎ：'+t);};
function native(store){check(store?.name==='imasora-world-authority-v1','通常保存で操作してください。');}
export async function readTransportMigrationState(store){
 native(store);const db=await store.open();return new Promise((resolve,reject)=>{const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(TRANSPORT_MIGRATION_KEY);tx.oncomplete=()=>resolve({record:head.result??null,journal:point.result??null});tx.onabort=()=>reject(tx.error??Error('控えの読込みを中断しました。'));tx.onerror=()=>{};});
}
export async function commitTransportMigration(store,journal){
 native(store);const frozen=structuredClone(validateTransportMigrationJournal(journal)),db=await store.open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get('construction'),point=os.get(TRANSPORT_MIGRATION_KEY);let a=false,b=false,next,error;
  const stop=e=>{error=e;tx.abort();},write=()=>{if(!a||!b)return;try{
   const prior=head.result;check(prior?.generation===frozen.expectedGeneration&&prior.current===frozen.expectedRaw,'別の画面で保存が変わりました。上書きせず停止しました。');
   check(Array.isArray(prior.backups)&&prior.backups.length<=5&&prior.backups.every(x=>typeof x==='string'),'保存管理情報が不正です。');
   // Never overwrite an earlier migration point, even a malformed one. It is
   // retained beyond the rolling five-save history for recovery/export.
   check(point.result==null,'引継ぎ前の控えが既にあります。記録を保持して停止します。');
   next={generation:frozen.appliedGeneration,current:frozen.appliedRaw,backups:[prior.current,...prior.backups].slice(0,5)};
   os.put(frozen,TRANSPORT_MIGRATION_KEY);const request=os.put(next,'construction');request.onsuccess=()=>{if(store.failNext){store.failNext=false;stop(Error('確認用に現場の引継ぎを中断しました。'));}};
  }catch(e){stop(e);}};head.onsuccess=()=>{a=true;write();};point.onsuccess=()=>{b=true;write();};tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error??tx.error??Error('引継ぎを中断し、元の現場を保持しました。'));tx.onerror=()=>{};
 });
}
