function workerFactory(){
 if(typeof Worker==='function'){
  try{return new Worker(new URL('./imasora-world-save-worker.mjs',import.meta.url),{type:'module',name:'imasora-save'});}
  catch{throw Error('セーブの処理を開始できません。現在の作業を保持しています。保存を再試行してください。');}
 }
 if(typeof document==='undefined')return null;
 throw Error('この画面でセーブの処理を開始できません。現在の作業を保持しています。');
}
export async function runWorldSaveTask(kind,args,{createWorker=workerFactory}={}){
 if(!['pack','pack-checked','unpack','restore-plan','restore-commit'].includes(kind))throw Error('セーブの処理を確認できませんでした。');
 const worker=createWorker();
 if(!worker){const {executeWorldSaveTask}=await import('./imasora-world-save-task.mjs');return executeWorldSaveTask(kind,args);}
 return new Promise((resolve,reject)=>{
  let settled=false;
  const done=(error,result)=>{if(settled)return;settled=true;worker.onmessage=worker.onerror=worker.onmessageerror=null;worker.terminate();error?reject(error):resolve(result);};
  worker.onmessage=({data})=>{if(data?.id!==1)return;if(data.ok===true)done(null,data.result);else if(data.ok===false&&typeof data.message==='string')done(Error(data.message));else done(Error('セーブの処理結果を読み取れませんでした。'));};
  worker.onerror=event=>{event.preventDefault?.();done(Error('セーブの処理を完了できませんでした。現在の作業を保持しています。保存を再試行してください。'));};
  worker.onmessageerror=()=>done(Error('セーブの処理結果を読み取れませんでした。現在の作業を保持しています。'));
  try{worker.postMessage({id:1,kind,args});}catch(error){done(error);}
 });
}
