import {encodeSaveWire,decodeSaveWire} from './imasora-save-wire.mjs';
import {runSharedSaveTask} from './imasora-save-task-queue.mjs?v=120fw';
// This is a bounded scheduling estimate, never a substitute for validation.
// Six characters per UTF-16 code unit cover JSON escaping; 32 cover any
// finite JSON number. High-complexity candidates leave the UI thread early.
// Inspect data descriptors so choosing a route never evaluates a getter.
export function worldSaveCandidateNeedsWorker(candidate,minimumChars){
 if(!Number.isSafeInteger(minimumChars)||minimumChars<0)throw Error('セーブの処理設定が不正です。');
 const pending=[candidate],seen=new WeakSet(),nodeLimit=16384;let chars=128,nodes=0;
 while(pending.length){
  if(chars>=minimumChars||++nodes>nodeLimit)return true;
  const value=pending.pop();
  if(value===null){chars+=4;continue;}
  if(typeof value==='string'){chars+=2+value.length*6;continue;}
  if(typeof value==='number'){chars+=32;continue;}
  if(typeof value==='boolean'){chars+=5;continue;}
  if(typeof value!=='object')return true;
  if(seen.has(value))return true;seen.add(value);
  const array=Array.isArray(value),proto=Object.getPrototypeOf(value);
  if(!array&&proto!==Object.prototype&&proto!==null)return true;
  if(array&&value.length+nodes+pending.length>nodeLimit)return true;
  const keys=Object.keys(value);
  if(keys.length+nodes+pending.length>nodeLimit)return true;
  // Empty array slots serialize as null, with separators of their own.
  chars+=2+(array?value.length*5:keys.length);
  for(const key of keys){
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!descriptor||!Object.hasOwn(descriptor,'value'))return true;
   if(!array)chars+=3+key.length*6;
   pending.push(descriptor.value);
  }
 }
 return chars>=minimumChars;
}
import {captureOwnedConstructionJson,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
const checkedRestorePoints=new WeakSet();
export const isCheckedTransportRestorePoint=point=>checkedRestorePoints.has(point);
function workerFactory(){
 if(typeof Worker==='function'){
  try{return new Worker(new URL('./imasora-world-save-worker.mjs?v=120fw',import.meta.url),{type:'module',name:'imasora-save'});}
  catch{throw Error('セーブの処理を開始できません。現在の作業を保持しています。保存を再試行してください。');}
 }
 if(typeof document==='undefined')return null;
 throw Error('この画面でセーブの処理を開始できません。現在の作業を保持しています。');
}
async function runTask(kind,args,{createWorker=workerFactory,signal}={}){
 if(!['scoop-plan','pack','pack-checked','unpack','restore-plan','restore-commit','soil-check','transport-check','prepare-transport','prepare-high','prepare-world','read-transport','restore-plan-checked','restore-point-checked','restore-point-proof','restore-point-bound','restore-result-check'].includes(kind))throw Error('セーブの処理を確認できませんでした。');
 if(signal?.aborted)throw Error('控えの確認を中止しました。');
 if(createWorker===workerFactory&&typeof document!=='undefined')return runSharedSaveTask(kind,args,{signal});
 const worker=createWorker();
 if(!worker){const {executeWorldSaveTask}=await import('./imasora-world-save-task.mjs?v=120fw');return structuredClone(executeWorldSaveTask(kind,args));}
 return new Promise((resolve,reject)=>{
  let settled=false;const abort=()=>done(Error('控えの確認を中止しました。'));
  const done=(error,result)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();error?reject(error):resolve(result);};
  worker.onmessage=({data})=>{if(data?.id!==1)return;if(data.ok===true){try{done(null,data.wire?decodeSaveWire(data.wire):data.result);}catch(error){done(error);}}else if(data.ok===false&&typeof data.message==='string')done(Error(data.message));else done(Error('セーブの処理結果を読み取れませんでした。'));};
  worker.onerror=event=>{event.preventDefault?.();done(Error('セーブの処理を完了できませんでした。現在の作業を保持しています。保存を再試行してください。'));};
  worker.onmessageerror=()=>done(Error('セーブの処理結果を読み取れませんでした。現在の作業を保持しています。'));
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  try{worker.postMessage({id:1,kind,args});}catch(error){done(error);}
 });
}

// Only this completed full-check path grants a certificate. The point is a
// private immutable capture, so a queue caller cannot alter it after validation.
export async function runWorldSaveTask(kind,args,options={}){
 // An already owned immutable input needs only the full check's verdict.
 // It cannot change across the worker wait; copying it back adds no evidence.
 if(kind==='restore-point-checked'&&isCapturedConstructionJson(args.journal)){
  const point=args.journal,ok=await runTask('restore-point-proof',{journal:point},options);
  if(options.signal?.aborted)throw Error('控えの確認を中止しました。');
  if(ok!==true)throw Error('復元前の記録を確認できませんでした。');
  checkedRestorePoints.add(point);return point;
 }
 // Only the captured caller-side soil can be borrowed after the worker's
 // complete journal check. Mutable callers retain the independent result.
 const boundCurrent=kind==='restore-point-bound'?args.current:null,boundSoil=boundCurrent?.work?.frame?.soil;
 const bindCapturedSoil=isCapturedConstructionJson(boundSoil);
 const result=await runTask(kind,kind==='restore-point-bound'?{...args,bindCapturedSoil}:args,options);if(options.signal?.aborted)throw Error('控えの確認を中止しました。');
 if(kind==='restore-plan-checked'){
  const saved=args.ledger?.world?.constructionTransport,soil=saved?.work?.frame?.soil;
  const chosen=(proof,input,fallback)=>proof===true&&isCapturedConstructionJson(input)?input:fallback;
  // Share unchanged, exactly compared soil among the three immutable scenes.
  // Keep actor/task records separate; moving a voxel invalidates these proofs.
  const shareSoil=(record,proof)=>proof===true&&isCapturedConstructionJson(soil)?{...record,work:{...record.work,frame:{...record.work.frame,soil}}}:record;
  const point=await captureOwnedConstructionJson({...result.point,
    beforeSaved:chosen(result.exactBeforeSaved,saved,result.point.beforeSaved),
    beforeUnsaved:shareSoil(chosen(result.exactBeforeUnsaved,args.before,result.point.beforeUnsaved),result.unsavedSoilIsSaved),
    applied:shareSoil(chosen(result.exactApplied,args.candidate,result.point.applied),result.candidateSoilIsSaved)});
  if(options.signal?.aborted)throw Error('控えの確認を中止しました。');checkedRestorePoints.add(point);return {...result,point};
 }
 if(kind==='restore-point-bound'){
  const value={...result.point},names=['beforeSaved','beforeUnsaved','applied'],soil=boundSoil;
  for(let i=0;i<names.length;i++){
   const name=names[i],record=value[name];
   if(name==='applied'&&result.exactCurrent===true&&isCapturedConstructionJson(boundCurrent))value[name]=boundCurrent;
   else if(result.soilMatches[i]===true&&isCapturedConstructionJson(soil))value[name]={...record,work:{...record.work,frame:{...record.work.frame,soil}}};
  }
  const point=await captureOwnedConstructionJson(value);if(options.signal?.aborted)throw Error('控えの確認を中止しました。');checkedRestorePoints.add(point);return point;
 }
 if(kind==='restore-point-checked'){
  const point=await captureOwnedConstructionJson(result);if(options.signal?.aborted)throw Error('控えの確認を中止しました。');checkedRestorePoints.add(point);return point;
 }
 return result;
}
