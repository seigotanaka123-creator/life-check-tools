// Explicit restoration of one finite live-earth grant only. No wallet, work,
// equipment, purchase, or localStorage data is returned for replacement.
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=497';
import {EARTH_LIVE_SCOPE,validateAuthorityExcavation,validateAuthorityExcavationContinuation,authorityExcavationSummary} from './imasora-construction-earth-authority.js?v=497';

export const LIVE_EARTH_RECOVERY_KIND='imasora-excavation-live-recovery-v1';
export const MAX_EARTH_RESTORE_INPUT=32*1024*1024;
const encoder=new TextEncoder(),clone=structuredClone;
const check=(condition,message)=>{if(!condition)throw Error(`掘削の読み戻し：${message}`);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;

// Inspect object descriptors before JSON serialization so a caller cannot hide
// mutations in accessors, symbols, sparse arrays, or a custom toJSON function.
function checkJSON(value,depth=0,seen=new Set(),budget={nodes:0}){
  check(++budget.nodes<=500000&&depth<=100,'読み込む記録が大きすぎるか、階層が深すぎます。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){check(Number.isFinite(value),'保存できない数値です。');return;}
  const array=Array.isArray(value);
  check(array?Object.getPrototypeOf(value)===Array.prototype:object(value),'対応しない値が含まれています。');
  check(!seen.has(value),'循環した記録は使えません。');seen.add(value);
  const names=Object.keys(value);
  check(Reflect.ownKeys(value).length===names.length+(array?1:0),'保存できない属性があります。');
  if(array)check(names.length===value.length&&names.every((name,i)=>name===String(i)),'配列の内容が不正です。');
  for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(value,name);check(Object.hasOwn(descriptor,'value'),'動的な属性は使えません。');checkJSON(descriptor.value,depth+1,seen,budget);}
  seen.delete(value);
}
function liveRecord(record){
  validateAuthorityExcavation(record);
  check(record.version===2&&record.scope===EARTH_LIVE_SCOPE&&record.source.kind==='native-earth-yard-live','通常の工事現場の記録だけを読み戻せます。貸出・接続確認用の記録は使えません。');
  return record;
}
export function sameEarthRestoreSource(current,candidate){
  liveRecord(current);liveRecord(candidate);
  for(const key of ['version','scope','origin','site','yardOrigin','source'])
    check(canonical(current[key])===canonical(candidate[key]),'現在の作業と保存元・地形の取得番号・区画が一致しません。');
  check(current.counts.total===candidate.counts.total&&current.volume.total===candidate.volume.total,'土の総量が一致しません。');
  return true;
}
export function restoreAuthorityEarth(current,candidate){
  sameEarthRestoreSource(current,candidate);
  check(current.revision<Number.MAX_SAFE_INTEGER-1,'掘削の保存番号が上限です。');
  // Restoring an older physical state is intentional here. Normal checkpoint
  // continuation remains monotonic and cannot use this route implicitly.
  const restored={...clone(candidate),revision:current.revision+1};
  liveRecord(restored);return restored;
}
function fromLedger(packet){
  const ledger=L.unpackWorldPurchaseLedger(packet);
  check(ledger.schemaVersion===2,'通常地形を取得した後の保存を選んでください。');
  check(!ledger.pending&&!ledger.world.equipmentCraftPending,'購入・装備作成の途中の記録は読み戻せません。');
  return liveRecord(ledger.world.constructionExcavation);
}
function fromExport(value){
  check(typeof value.origin==='string','保存元がありません。');
  check(Object.hasOwn(value,'pending')&&value.pending===null,'保存処理が未完了の書出記録は読み戻せません。');
  const saved=value.world,raw=saved?.committed;
  check(saved?.scope==='world-save-recovery-readonly'&&Array.isArray(saved.pending)&&saved.pending.length===0,'世界の保存処理が未完了か、書出形式が不正です。');
  check(object(raw)&&Number.isSafeInteger(raw.generation)&&raw.generation>0&&Array.isArray(raw.backups)&&raw.backups.length<=5&&raw.backups.every(x=>typeof x==='string'),'世界の保存管理情報が不正です。');
  const committed=fromLedger(raw.current);
  check(value.origin===committed.origin,'書出元と保存済み地形のアドレスが一致しません。');
  check(Object.hasOwn(value,'uncommitted'),'作業状態の項目がありません。');
  if(value.uncommitted!==null){sameEarthRestoreSource(committed,value.uncommitted);validateAuthorityExcavationContinuation(committed,value.uncommitted);return {record:value.uncommitted,sourceKind:'live-export-uncommitted'};}
  return {record:committed,sourceKind:'live-export-committed'};
}
export function inspectEarthRestore(input,{current,origin}={}){
  liveRecord(current);check(origin===current.origin,'現在の保存元アドレスと一致しません。');
  let value;
  if(typeof input==='string'){
    check(input.length<=MAX_EARTH_RESTORE_INPUT&&encoder.encode(input).length<=MAX_EARTH_RESTORE_INPUT,'ファイルが32 MiBを超えています。');
    try{value=JSON.parse(input);}catch{throw Error('控えの文字列を読み取れませんでした。途中で欠けていないJSONファイルを選び直してください。現在の作業は変更していません。');}
  }else value=input;
  checkJSON(value);
  const text=JSON.stringify(value);check(encoder.encode(text).length<=MAX_EARTH_RESTORE_INPUT,'読み込む内容が32 MiBを超えています。');
  let result;
  if(value?.kind===LIVE_EARTH_RECOVERY_KIND)result=fromExport(value);
  else if(value?.format===L.LINK_SCOPE)result={record:fromLedger(text),sourceKind:'world-ledger'};
  else if(value?.scope===EARTH_LIVE_SCOPE)result={record:liveRecord(value),sourceKind:'earth-record'};
  else throw Error('通常の掘削書出、通常保存の履歴、または通常地形の記録を選んでください。一括控え・貸出v3・旧復元ファイルとは別です。');
  sameEarthRestoreSource(current,result.record);
  const record=clone(result.record);
  return {record,summary:authorityExcavationSummary(record),sourceKind:result.sourceKind};
}
