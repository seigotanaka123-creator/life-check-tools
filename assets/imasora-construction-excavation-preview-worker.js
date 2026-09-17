import {predictExcavation} from './imasora-construction-excavation-preview.js';
// Each request owns a structured-cloned snapshot. The parent terminates stale
// or slow workers; the predictor also has a finite simulation-step budget.
self.onmessage=({data})=>{
  const id=data?.id;
  try{self.postMessage({id,result:predictExcavation(data?.work,data?.kind)});}
  catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
