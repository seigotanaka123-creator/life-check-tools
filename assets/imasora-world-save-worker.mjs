import {encodeSaveWire,decodeSaveWire} from './imasora-save-wire.mjs';
import {executeWorldSaveTask} from './imasora-world-save-task.mjs?v=120gn';
import {executeTransportStorageTask} from './imasora-construction-storage-task.mjs?v=120gn';
import {executeTransportRecoveryTask} from './imasora-construction-recovery-task.mjs?v=120gn';
self.onmessage=async({data})=>{
 try{if(data.wire)data.args=decodeSaveWire(data.wire);const result=data.kind.startsWith('storage:')?await executeTransportStorageTask(data.kind.slice(8),data.args):data.kind.startsWith('recovery:')?await executeTransportRecoveryTask(data.kind.slice(9),data.args):executeWorldSaveTask(data.kind,data.args);const wire=encodeSaveWire(result);self.postMessage(wire===null?{id:data.id,ok:true,result}:{id:data.id,ok:true,wire});}
 catch(error){self.postMessage({id:data.id,ok:false,message:error.message});}
};
