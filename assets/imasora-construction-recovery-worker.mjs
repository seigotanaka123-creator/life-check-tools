import {executeTransportRecoveryTask} from './imasora-construction-recovery-task.mjs';
// One immutable request per dedicated worker. The caller terminates it on
// completion, cancellation or disposal, so large histories are not retained.
self.onmessage=async({data})=>{
 try{const result=await executeTransportRecoveryTask(data.kind,data.args);self.postMessage({id:data.id,ok:true,result});}
 catch(error){self.postMessage({id:data.id,ok:false,message:error?.message??'控えを確認できませんでした。'});}
};
