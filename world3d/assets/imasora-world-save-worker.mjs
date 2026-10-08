import {executeWorldSaveTask} from './imasora-world-save-task.mjs';
self.onmessage=({data})=>{
 try{self.postMessage({id:data.id,ok:true,result:executeWorldSaveTask(data.kind,data.args)});}
 catch(error){self.postMessage({id:data.id,ok:false,message:error.message});}
};
