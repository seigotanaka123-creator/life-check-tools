import {actExcavatorBuild} from './imasora-construction-excavator-build.js';
// The worker receives a disposable snapshot, never the world save or inventory.
self.onmessage=({data:{state,action}})=>{
  try{const result=actExcavatorBuild(state,action);self.postMessage({guide:result.guide,message:result.message});}
  catch(error){self.postMessage({guide:null,message:`経路を計算できませんでした：${error.message}`});}
};
