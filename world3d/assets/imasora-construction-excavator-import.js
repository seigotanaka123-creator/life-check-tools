import {EXCAVATION_FORMAT,packExcavation,unpackExcavation} from './imasora-construction-excavator-save.js';
import {totals} from './imasora-construction-excavator.js';
import {buildProgress} from './imasora-construction-excavator-build.js';
import {EXCAVATION_DB,EXCAVATION_RESTORE_TEST_DB,EXCAVATION_RESTORE_POINT} from './imasora-construction-excavator-storage.js';
export const EXCAVATION_IMPORT_LIMIT=8*1024*1024;
const fail=message=>{throw Error(message);};
export function excavationImportSummary(state){
  const t=totals(state),p=buildProgress(state),mode={foot:'徒歩',boarding:'乗車途中',driving:'走行',working:'掘削作業',exiting:'降車途中'}[state.loader.mode];
  return `掘削 ${p.removed} / ${p.required} · 地形 ${t.terrain} · 積載 ${t.bucket} · 落下中 ${t.inFlight} · 排土 ${t.ground} · 受け箱 ${t.bin} · 合計 ${t.total}\n${mode}${state.action?` · ${state.action.kind==='scoop'?'すくい込み':state.action.kind==='dump'?'排土':'正面旋回'}の途中`:''} · 再開時は一時停止`;
}
function candidate(packet,label){
  try{const state=unpackExcavation(packet);return {label,packet:packExcavation(state),summary:excavationImportSummary(state),error:null};}
  catch(error){return {label,packet:null,summary:null,error:error.message};}
}
function fromRecord(record){
  if(!record||!Number.isSafeInteger(record.generation)||record.generation<1||!Array.isArray(record.backups)||record.backups.length>5)fail('保存原本の管理情報が不正です。');
  if(record.current?.kind!==EXCAVATION_FORMAT)fail('未対応の保存形式です。古い控えへ自動で戻すことはしません。');
  return [candidate(record.current,'原本の現在の記録'),...record.backups.map((p,i)=>candidate(p,`原本の控え ${i+1}`))];
}
export function readExcavationImport(text){
  if(typeof text!=='string'||text.length>EXCAVATION_IMPORT_LIMIT)fail('バックアップは8 MB以下で指定してください。');
  let data;try{data=JSON.parse(text.replace(/^\uFEFF/,''));}catch{fail('JSONとして読み込めません。書き出したファイルの内容を指定してください。');}
  let candidates;
  if(data?.kind===EXCAVATION_FORMAT)candidates=[candidate(data,'掘削作業のバックアップ')];
  else if([EXCAVATION_DB,EXCAVATION_RESTORE_TEST_DB].includes(data?.database)&&data.protectedRecord)candidates=fromRecord(data.protectedRecord);
  else if(data?.kind===EXCAVATION_RESTORE_POINT){
    candidates=data.work?[candidate(data.work,'復元前の未保存分を含む作業')]:[];
    if(data.previousRecord)candidates.push(...fromRecord(data.previousRecord));
  }else fail('この掘削区画のバックアップではありません。通常ゲーム・財布・他の工事区画は読み込めません。');
  if(!candidates.some(c=>c.packet))fail(candidates[0]?.error||'復元できる正常な作業がありません。');
  return candidates;
}
