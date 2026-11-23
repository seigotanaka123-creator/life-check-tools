import {scoopDumpPlan,basinScoopPlan,summitScoopCandidate} from './imasora-construction-fragment-scoop.mjs?v=120pv';
import {captureOwnedConstructionJson} from './imasora-construction-json-capture.mjs';
let terrain;
const channel=new MessageChannel(),waiters=[];
channel.port1.onmessage=()=>waiters.shift()?.();
const yieldCapture=()=>new Promise(resolve=>{waiters.push(resolve);channel.port2.postMessage(null);});
let active;
async function checkSummit({id,work,soilVersion,variant}){
 active?.controller.abort();
 const job={id,controller:new AbortController()};
 active=job;
 try{
  if(work.frame.soil){
   const soil=await captureOwnedConstructionJson(work.frame.soil,{yieldTask:yieldCapture});
   if(job.controller.signal.aborted)return;
   terrain={version:soilVersion,soil};
   self.postMessage({terrainReady:true,soilVersion});
  }
  if(terrain?.version!==soilVersion)throw Error('土の状態が変わりました。');
  work.frame.soil=terrain.soil;
  const plan=await summitScoopCandidate(work,variant,yieldCapture,job.controller.signal);
  if(!job.controller.signal.aborted)self.postMessage({id,ok:true,plan});
 }catch{if(!job.controller.signal.aborted)self.postMessage({id,ok:false});}
 finally{if(active===job)active=null;}
}
// Read-only simulation. No save APIs, DOM or user storage.
self.onmessage=({data})=>{
 if(data.kind==='cancel-summit'){if(active?.id===data.id)active.controller.abort();return;}
 if(data.kind==='summit-candidate'){void checkSummit(data);return;}
 try{self.postMessage({ok:true,plan:data.kind==='basin'?basinScoopPlan(data.work):scoopDumpPlan(data)});}catch(error){self.postMessage({ok:false,message:error.message});}};
