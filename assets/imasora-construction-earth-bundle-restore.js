// Read one live-earth candidate from a verified whole-save backup. This module
// never opens storage and never returns any other world or account data to apply.
import {unpackRecoveryBundle,MAX_RECOVERY_FILE} from './imasora-world-recovery-bundle.js?v=496';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=496';
import {inspectEarthRestore} from './imasora-construction-earth-restore.js?v=497';

export const MAX_EARTH_BUNDLE_RESTORE_INPUT=MAX_RECOVERY_FILE;
const LIVE_DB='imasora-world-authority-v1',STORE='snapshots',HEAD='construction';
const check=(yes,message)=>{if(!yes)throw Error(`一括控えの地形確認：${message}`);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;

export async function inspectEarthBundleRestore(text,{current,origin}={}){
  // Freeze the comparison source before the asynchronous SHA check. The session
  // separately checks its generation/work signature before exposing confirmation.
  const reference=inspectEarthRestore(current,{current,origin}).record;
  const payload=await unpackRecoveryBundle(text);
  check(payload.origin===origin,'保存元のアドレスが違います。別の保存元の記録は使用しません。');
  const database=payload.domains.databases.find(entry=>entry.name===LIVE_DB);
  check(database&&database.version!==null,'通常の世界の保存が控えにありません。旧保存や試験保存では代用しません。');
  check(database.version===1,'通常保存のデータベース版に対応していません。');
  const store=database.stores.find(entry=>entry.name===STORE);
  const entry=store?.entries.find(entry=>entry.key===HEAD);
  check(entry,'通常の世界の最新記録がありません。履歴の記録では代用しません。');
  const head=entry.value;
  check(object(head)&&Object.keys(head).sort().join('|')==='backups|current|generation','通常保存の管理情報が不正です。');
  check(Number.isSafeInteger(head.generation)&&head.generation>0&&head.generation<Number.MAX_SAFE_INTEGER,'通常保存の保存番号が不正です。');
  check(typeof head.current==='string'&&Array.isArray(head.backups)&&head.backups.length<=5&&head.backups.every(raw=>typeof raw==='string'),'通常保存の本文または履歴一覧が不正です。');
  // Validate managed history without selecting from it. A bad current head must
  // never silently turn into an older or preview candidate.
  for(const packet of head.backups)L.unpackWorldPurchaseLedger(packet);
  const inspected=inspectEarthRestore(head.current,{current:reference,origin});
  return {record:inspected.record,summary:inspected.summary,sourceKind:'recovery-bundle',
    source:{origin:payload.origin,capturedAt:payload.capturedAt,generation:head.generation,version:payload.version}};
}
