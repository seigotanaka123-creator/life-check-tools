import {canonical} from './imasora-construction-state.js';
import {unpackExcavationLedger,packExcavationLedger,excavationLedgerSummary} from './imasora-construction-excavation-ledger.js';

export const LEDGER_RESTORE_POINT='imasora-excavation-ledger-before-restore-v1';
export const LEDGER_RESTORE_LIMIT=64*1024*1024;
// A backup is usable only within the same isolated world/terrain lineage.
// This is deliberately not a route for granting soil to the ordinary world.
export function sameExcavationSource(a,b){
  for(const key of ['origin','site','yardOrigin','source','worldLedger']){
    if(canonical(a[key])!==canonical(b[key]))throw Error('保存元・区画・取得元が現在の作業と異なります。この記録へは復元できません。');
  }
}
export function prepareLedgerReplacement(text,current){
  const record=unpackExcavationLedger(text);sameExcavationSource(record,current);
  const revision=Math.max(record.revision,current.revision)+1;
  if(!Number.isSafeInteger(revision)||revision>=Number.MAX_SAFE_INTEGER)throw Error('保存番号が上限です。');
  record.revision=revision;
  return {record,packet:packExcavationLedger(record),summary:excavationLedgerSummary(record)};
}
export function inspectLedgerRestorePoint(point,current){
  if(!point||point.kind!==LEDGER_RESTORE_POINT||typeof point.restoreId!=='string'||!point.restoreId||typeof point.work!=='string')throw Error('復元前の控えがないか、形式が不正です。');
  const record=unpackExcavationLedger(point.work);sameExcavationSource(record,current);
  const raw=point.previousRecord;
  if(raw!==null){
    if(!raw||!Number.isSafeInteger(raw.generation)||raw.generation<1||!Array.isArray(raw.backups)||raw.backups.length>5)throw Error('復元前の保存管理情報が不正です。');
    for(const text of [raw.current,...raw.backups])sameExcavationSource(unpackExcavationLedger(text),current);
  }
  return record;
}
