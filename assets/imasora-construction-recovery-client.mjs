const kinds=new Set(['export','inspect','summaries','journal']);
function workerFactory(){
 if(typeof Worker==='function'){
  try{return new Worker(new URL('./imasora-construction-recovery-worker.mjs',import.meta.url),{type:'module',name:'imasora-recovery-check'});}
  catch{throw Error('控えの確認を開始できません。現場はそのままです。画面を開き直してお試しください。');}
 }
 // Headless unit tests keep the same domain implementation. In a browser,
 // failure to start a worker is reported, never silently run on the UI thread.
 if(typeof document==='undefined')return null;
 throw Error('控えの確認を開始できません。この画面を開き直してお試しください。');
}
const aborted=()=>Object.assign(Error('確認を中止しました。現場は変更していません。'),{name:'AbortError'});
export async function runTransportRecoveryTask(kind,args,{signal,createWorker=workerFactory}={}){
 if(!kinds.has(kind))throw Error('その控えの確認方法は使えません。');
 if(signal?.aborted)throw aborted();
 const worker=createWorker();
 if(!worker){const {executeTransportRecoveryTask}=await import('./imasora-construction-recovery-task.mjs');if(signal?.aborted)throw aborted();const result=await executeTransportRecoveryTask(kind,args);if(signal?.aborted)throw aborted();return result;}
 return new Promise((resolve,reject)=>{
  let settled=false;
  const done=(error,result)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',cancel);worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();error?reject(error):resolve(result);};
  const cancel=()=>done(aborted());
  worker.onmessage=({data})=>{if(data?.id!==1)return;if(data.ok===true)done(null,data.result);else if(data.ok===false&&typeof data.message==='string')done(Error(data.message));else done(Error('控えの確認結果を読み取れませんでした。'));};
  worker.onerror=event=>{event.preventDefault?.();done(Error('控えを確認できませんでした。現場は変更していません。'));};
  worker.onmessageerror=()=>done(Error('控えの確認結果を読み取れませんでした。'));
  signal?.addEventListener('abort',cancel,{once:true});
  if(signal?.aborted){cancel();return;}
  try{worker.postMessage({id:1,kind,args});}catch(error){done(error);}
 });
}
