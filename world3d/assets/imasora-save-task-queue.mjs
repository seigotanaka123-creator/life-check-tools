import {encodeSaveWire,decodeSaveWireAsync} from './imasora-save-wire.mjs';
// One bounded, serial worker for save and recovery checks. Reuse its checked
// value caches. Storage tasks retain their fresh atomic transaction checks.
export function createSaveTaskQueue({createWorker,idleMs=60000,keepAlive=()=>true,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let worker=null,active=null,serial=0,idle=null,disposed=false;const pending=[];
 const aborted=()=>Object.assign(Error('確認を中止しました。作業はそのままです。'),{name:'AbortError'});
 function clearIdle(){if(idle!==null){clearTimer(idle);idle=null;}}
 function stopWorker(){clearIdle();if(worker){worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();worker=null;}}
 function settle(job,error,result){job.signal?.removeEventListener('abort',job.abort);error?job.reject(error):job.resolve(result);}
 function done(error,result,drop=false){const job=active;if(!job)return;active=null;if(drop)stopWorker();settle(job,error,result);pump();}
 function pump(){
  if(disposed||active)return;
  clearIdle();const job=pending.shift();
  if(!job){if(worker){if(!keepAlive())stopWorker();else{idle=setTimer(()=>{idle=null;if(!active&&!pending.length)stopWorker();},idleMs);idle?.unref?.();}}return;}
  active=job;
  if(job.signal?.aborted){done(aborted());return;}
  try{
   if(!worker){const owned=createWorker();if(active!==job||disposed){owned?.terminate();return;}if(!owned)throw Error('保存の確認を開始できません。');worker=owned;
    owned.onmessage=async({data})=>{if(worker!==owned||!active||data?.id!==active.id)return;const job=active;if(data.ok===true){try{const result=data.wire?await decodeSaveWireAsync(data.wire):data.result;if(worker===owned&&active===job)done(null,result);}catch(error){if(worker===owned&&active===job)done(error,undefined,true);}}else if(data.ok===false&&typeof data.message==='string')done(Error(data.message));else done(Error('保存の確認結果を読み取れませんでした。'),undefined,true);};
    owned.onerror=event=>{if(worker!==owned)return;event.preventDefault?.();done(Error('保存の確認が中断されました。もう一度お試しください。'),undefined,true);};
    owned.onmessageerror=()=>{if(worker===owned)done(Error('保存の確認結果を読み取れませんでした。'),undefined,true);};
   }
   if(job.signal?.aborted){done(aborted(),undefined,true);return;}
   const wire=encodeSaveWire(job.args);worker.postMessage(wire?{id:job.id,kind:job.kind,wire}:{id:job.id,kind:job.kind,args:job.args});job.args=null;
  }catch(error){done(error,undefined,true);}
 }
 return {
  run(kind,args,{signal}={}){if(disposed)return Promise.reject(Error('保存の確認は終了しています。'));if(signal?.aborted)return Promise.reject(aborted());if(pending.length>=4)return Promise.reject(Error('先の保存が終わるまでお待ちください。'));
   // postMessage captures the first task immediately. Waiting tasks need their
   // own snapshot now so later caller edits cannot change the queued request.
   let captured;try{captured=active?structuredClone(args):args;}catch(error){return Promise.reject(error);}
   return new Promise((resolve,reject)=>{const job={id:++serial,kind,args:captured,signal,resolve,reject,abort:null};job.abort=()=>{if(active===job)done(aborted(),undefined,true);else{const i=pending.indexOf(job);if(i>=0){pending.splice(i,1);settle(job,aborted());}}};signal?.addEventListener('abort',job.abort,{once:true});pending.push(job);pump();});
  },
  releaseIdle(){if(!active&&!pending.length)stopWorker();},
  dispose(){if(disposed)return;disposed=true;stopWorker();if(active){settle(active,aborted());active=null;}for(const job of pending.splice(0))settle(job,aborted());}
 };
}
let shared;
export function runSharedSaveTask(kind,args,options={}){
 if(!shared){shared=createSaveTaskQueue({idleMs:600000,createWorker:()=>new Worker(new URL('./imasora-world-save-worker.mjs?v=120fw',import.meta.url),{type:'module',name:'imasora-save'})});}
 return shared.run(kind,args,options);
}
