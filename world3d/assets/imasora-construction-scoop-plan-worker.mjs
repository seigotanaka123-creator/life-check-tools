import {scoopDumpPlan,basinScoopPlan} from './imasora-construction-fragment-scoop.mjs?v=120fw';
// Read-only disposable simulation. No save APIs, DOM or user storage.
self.onmessage=({data})=>{try{self.postMessage({ok:true,plan:data.kind==='basin'?basinScoopPlan(data.work):scoopDumpPlan(data)});}catch(error){self.postMessage({ok:false,message:error.message});}};
