import {encodeSaveWire,decodeSaveWire} from './imasora-save-wire.mjs';
import {executeWorldSaveTask} from './imasora-world-save-task.mjs?v=121if';
import {WORLD_LEDGER} from './imasora-world-live-ledger.js?v=121gr';
import {executeTransportStorageTask} from './imasora-construction-storage-task.mjs?v=120pv';
import {executeTransportRecoveryTask} from './imasora-construction-recovery-task.mjs?v=120pv';
import {scoopDumpPlanAsync,basinScoopPlanAsync,summitForwardScoopPoses,sameScoopPreviewPose} from './imasora-construction-fragment-scoop.mjs?v=120pv';
import {isValidatedFrozenSoil,reuseScoopSoilTransition} from './imasora-construction-soil-transport.mjs?v=120pv';
import {sameConstructionRecordValue,sameValidatedConstructionRecordValue} from './imasora-construction-record-equality.mjs';
import {captureOwnedConstructionJson,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
let runningScoop=null,scoopChannel,yieldResolve,lastPreparedSoil=null,lastPreviewSoil=null,lastSavedSoil=null;
function yieldScoopWorker(){
 if(!scoopChannel){
  if(typeof MessageChannel!=='function')return new Promise(resolve=>setTimeout(resolve,0));
  scoopChannel=new MessageChannel();
  scoopChannel.port1.onmessage=()=>{const resume=yieldResolve;yieldResolve=null;resume?.();};
 }
 return new Promise(resolve=>{yieldResolve=resolve;scoopChannel.port2.postMessage(null);});
}
const summitWorkers=new Map();
let summitJob=0,lastSummitPosition=null,forwardCheck=null,pastForwardCheck=null,lastForwardBasis=null;
function releaseSummitWorker(variant,lane){
 clearTimeout(lane.idle);
 lane.job?.settle?.();
 lane.worker.terminate();
 if(summitWorkers.get(variant)===lane)summitWorkers.delete(variant);
}
function startSummitCandidate(variant,work,sweep=variant,waitable=false){
 let lane=summitWorkers.get(variant);
 if(!lane){
  try{
   const worker=new Worker(new URL('./imasora-construction-scoop-plan-worker.mjs?v=121gq',import.meta.url),{type:'module',name:'summit-'+variant});
   lane={worker,soil:null,soilVersion:0,terrainReady:0,job:null,idle:null};
   summitWorkers.set(variant,lane);
   worker.onmessage=({data})=>{
    if(data.terrainReady&&data.soilVersion===lane.soilVersion){lane.terrainReady=data.soilVersion;return;}
    if(lane.job?.id!==data.id)return;
    if(data.ok)lane.job.value=data.plan;
    else lane.soil=null;
    lane.job.settle?.();
   };
   worker.onerror=event=>{event.preventDefault();releaseSummitWorker(variant,lane);};
   worker.onmessageerror=()=>releaseSummitWorker(variant,lane);
  }catch{return null;}
 }
 const soil=work.frame.soil,changed=soil!==lane.soil||lane.terrainReady!==lane.soilVersion;
 const job={id:++summitJob,value:undefined,warming:changed};
 if(waitable)job.done=new Promise(resolve=>{job.settle=resolve;});
 if(changed)lane.soilVersion++;
 try{
  lane.job?.settle?.();
  lane.worker.postMessage({kind:'summit-candidate',variant:sweep,id:job.id,soilVersion:lane.soilVersion,
   work:{...work,frame:{...work.frame,soil:changed?soil:null}}});
  lane.job=job;lane.soil=soil;
  clearTimeout(lane.idle);lane.idle=setTimeout(()=>releaseSummitWorker(variant,lane),45000);
  return job;
 }catch{releaseSummitWorker(variant,lane);return null;}
}
function stopSummitCandidates(jobs,aborted){
 if(!jobs)return;
 for(const [variant,job] of Object.entries(jobs)){
  const lane=summitWorkers.get(variant);
  if(!job||lane?.job!==job||job.value!==undefined||job.warming&&!aborted)continue;
  try{
   lane.worker.postMessage({kind:'cancel-summit',id:job.id});
   job.settle?.();lane.job=null;
   if(job.warming)lane.soil=null;
  }catch{releaseSummitWorker(variant,lane);}
 }
}

function extraSummitSweeps(work){
 return {short:startSummitCandidate('short',work),standard:startSummitCandidate('standard',work)};
}
function cancelForwardCheck(){
 const previous=forwardCheck;
 if(!previous)return;
 forwardCheck=null;previous.controller.abort();
}
function cancelPastForwardCheck(){
 const previous=pastForwardCheck;
 if(!previous)return;
 pastForwardCheck=null;
 stopSummitCandidates({short:previous.extended,standard:previous.standard},true);
}
function startPastForwardCheck(basis,past){
 if(pastForwardCheck&&sameScoopPreviewPose(pastForwardCheck.work,past))return true;
 const extended=startSummitCandidate('short',past,'extended',true);
 const standard=startSummitCandidate('standard',past,'standard',true);
 if(extended&&standard){pastForwardCheck={basis,work:past,extended,standard};return true;}
 stopSummitCandidates({short:extended,standard},true);
 return false;
}
function startForwardCheck(basis){
 const [work,past]=summitForwardScoopPoses(basis);
 if(!work||lastForwardBasis&&sameScoopPreviewPose(lastForwardBasis,basis,true))return;
 lastForwardBasis=basis;
 startPastForwardCheck(basis,past);
 const controller=new AbortController(),check={work,controller,promise:null};
 forwardCheck=check;
 // An auxiliary lane that has completed the farther aim can help
 // the center. The checked result for the farther aim remains available.
 const pastWork=pastForwardCheck;
 let candidates;
 check.promise=scoopDumpPlanAsync(work,yieldScoopWorker,{signal:controller.signal,sliceMs:16,
  runAlternatives:state=>candidates=pastWork?.standard.value!==undefined?
   {standard:startSummitCandidate('standard',state)}:null
 }).catch(()=>null).finally(()=>{
  stopSummitCandidates(candidates,controller.signal.aborted);
  if(forwardCheck===check)forwardCheck=null;
 });
}
// Let the matching sweep finish without duplicating the same CPU work.
// After a short wait, the ordinary local solver can still help or take over.
async function awaitPastSweep(past,signal){
 if(signal.aborted)return;
 const {extended,standard}=past;
 let timeout,abort;
 try{
  await Promise.race([
   extended.done.then(()=>extended.value===undefined||extended.value?.amount>=192?null:standard.done),
   new Promise(resolve=>{timeout=setTimeout(resolve,155);abort=resolve;signal.addEventListener('abort',abort,{once:true});})
  ]);
 }finally{clearTimeout(timeout);signal.removeEventListener('abort',abort);}
}
async function planScoop(data){
 const controller=new AbortController();
 let candidates,usedPast=false,startedPast=false;
 runningScoop={id:data.id,controller};
 try{
  if(!data.args.basin){
   const frame=data.args.work.frame,soil=frame.soil;
   // A world edit must supply a new exact snapshot before spatial data is reused.
   if(lastPreviewSoil&&sameConstructionRecordValue(lastPreviewSoil,soil))frame.soil=lastPreviewSoil;
   else if(lastSavedSoil&&sameValidatedConstructionRecordValue(lastSavedSoil,soil,true))lastPreviewSoil=frame.soil=lastSavedSoil;
   else lastPreviewSoil=frame.soil=isCapturedConstructionJson(soil)?soil:await captureOwnedConstructionJson(soil);
   if(lastPreparedSoil&&!isValidatedFrozenSoil(frame.soil))reuseScoopSoilTransition(lastPreparedSoil,frame.soil);
  }
  const work=data.args.work,pending=forwardCheck;
  const past=(!data.args.basin&&!data.args.aimed&&pastForwardCheck&&sameScoopPreviewPose(pastForwardCheck.work,work))?pastForwardCheck:null;
  usedPast=!!past;
  const preparingFromThisPose=pastForwardCheck&&sameScoopPreviewPose(pastForwardCheck.basis,work);
  if(!past&&!preparingFromThisPose&&pastForwardCheck&&(!sameScoopPreviewPose(pastForwardCheck.work,work,true)||
    pastForwardCheck.extended.value===undefined||pastForwardCheck.standard.value===undefined))cancelPastForwardCheck();
  if(pending){
   if(data.args.basin||data.args.aimed||!sameScoopPreviewPose(pending.work,work))cancelForwardCheck();
   else controller.signal.addEventListener('abort',cancelForwardCheck,{once:true});
   await pending.promise;
   if(controller.signal.aborted)throw new DOMException('土の確認を中止しました。','AbortError');
  }
  if(past){await awaitPastSweep(past,controller.signal);if(controller.signal.aborted)throw new DOMException('土の確認を中止しました。','AbortError');}
  const onApproach=data.watchApproach?approach=>self.postMessage({id:data.id,approach}):null;
  const plan=data.args.basin?basinScoopPlanAsync:scoopDumpPlanAsync;
  const runAlternatives=typeof Worker==='function'&&(self.navigator?.hardwareConcurrency??0)>=8?work=>{
   const {x,z}=work.frame.machineVehicle;
   const rotatedInPlace=!lastSummitPosition||x===lastSummitPosition.x&&z===lastSummitPosition.z;
   lastSummitPosition={x,z};
   // Ordinary travel often fills the bucket with the first sweep.
   // Save the additional CPU work for the tighter angles after a turn.
   if(past)return {extended:past.extended,standard:past.standard};
   if(!lastForwardBasis||!sameScoopPreviewPose(lastForwardBasis,work,true)){
    const [,next]=summitForwardScoopPoses(work);
    if(next&&startPastForwardCheck(work,next)){startedPast=true;return null;}
   }
   if(!rotatedInPlace)return null;
   candidates=extraSummitSweeps(work);
   return candidates;
  }:null;
  return await plan(data.args.work,yieldScoopWorker,{signal:controller.signal,onApproach,aimed:data.args.aimed===true,runAlternatives,sliceMs:18});
 }finally{
  stopSummitCandidates(candidates,controller.signal.aborted);
  if(usedPast||startedPast&&controller.signal.aborted)cancelPastForwardCheck();
  runningScoop=null;
 }
}
// The structured-cloned worker payload is private. Seal the two soil trees
// once so every normal transport check can share its fully validated identity.
function sealSoil(soil){
 const pending=[soil];
 while(pending.length){
  const value=pending.pop();
  if(!value||typeof value!=='object'||Object.isFrozen(value))continue;
  Object.freeze(value);
  for(const child of Object.values(value))if(child&&typeof child==='object')pending.push(child);
 }
}
self.onmessage=async({data})=>{
 if(data.kind==='cancel-scoop-plan'){
  if(runningScoop?.id===data.id)runningScoop.controller.abort();
  return;
 }
 try{if(data.wire)data.args=decodeSaveWire(data.wire);
  const transport=['prepare-transport','transport-check'].includes(data.kind)?data.args.record?.work:null;
  if(data.kind==='warm-scoop-base'){
   const {raw,predictSummit}=data.args;
   // Begin the read-only checks while the owned save packet is being
   // validated. An independently verified copy must match before reuse.
   let warming=false;
   if(predictSummit&&typeof Worker==='function'&&(self.navigator?.hardwareConcurrency??0)>=8){
    const stored=JSON.parse(raw).state.world.constructionTransport;
    if(stored?.version===2){
     const [,next]=summitForwardScoopPoses(stored.work);
     if(next)warming=startPastForwardCheck(stored.work,next);
    }
   }
   const base=WORLD_LEDGER.unpackWorldPurchaseLedger(raw).world.constructionTransport;
   lastSavedSoil=base?.version===2?base.work.frame.soil:null;
   if(warming&&lastSavedSoil){
    const [,next]=summitForwardScoopPoses(base.work);
    if(next){
     pastForwardCheck.basis=base.work;pastForwardCheck.work=next;
     for(const [role,job] of [['short',pastForwardCheck.extended],['standard',pastForwardCheck.standard]]){
      const lane=summitWorkers.get(role);if(lane?.job===job)lane.soil=lastSavedSoil;
     }
    }else cancelPastForwardCheck();
   }
  }else if(data.kind==='prepare-transport'){
   const frame=data.args.ledger?.world?.constructionTransport?.work?.frame;
   // Reuse the checked parent only when every value still matches. The save
   // service still checks the live head, and the arm path is still validated.
   const pending=transport?.frame?.soil?.pending??frame?.soil?.pending;
   const movingCargo=pending?.from==='bucket'&&pending.to==='dump'||pending?.from==='dump'&&pending.to==='storage';
   if((transport?.scoop||movingCargo)&&frame?.soil){
    // Reuse the immutable snapshot the arm check already warmed. This only
    // shares identities after exact comparison. The world audit still runs.
    for(const prior of [lastPreparedSoil,lastPreviewSoil]){
     if(prior&&sameValidatedConstructionRecordValue(prior,frame.soil,true)){frame.soil=prior;break;}
    }
   }
   sealSoil(frame?.soil);
   sealSoil(transport?.frame?.soil);
  }else if(data.kind==='transport-check'){
   // The first unload after reopening can reuse this checked terrain too.
   sealSoil(transport?.frame?.soil);
  }else if(data.kind==='bucket-dump-plan'){
   const frame=data.args.work.frame;
   if(lastPreparedSoil&&sameValidatedConstructionRecordValue(lastPreparedSoil,frame.soil,true))frame.soil=lastPreparedSoil;
   else sealSoil(frame.soil);
  }else if(data.kind==='scoop-plan'){
   sealSoil(data.args.work.frame.soil);
  }
  const preview=data.kind==='scoop-plan'&&data.cooperative;
  if(!preview&&data.kind!=='warm-scoop-base')cancelPastForwardCheck();
  if(!preview&&forwardCheck){
   const pending=forwardCheck;cancelForwardCheck();await pending.promise;
  }
  const result=preview?await planScoop(data):data.kind.startsWith('storage:')?await executeTransportStorageTask(data.kind.slice(8),data.args):data.kind.startsWith('recovery:')?await executeTransportRecoveryTask(data.kind.slice(9),data.args):executeWorldSaveTask(data.kind,data.args);
  if(data.kind==='prepare-transport'||data.kind==='transport-check')lastPreparedSoil=isValidatedFrozenSoil(transport?.frame?.soil)?transport.frame.soil:null;
  const wire=encodeSaveWire(result);self.postMessage(wire===null?{id:data.id,ok:true,result}:{id:data.id,ok:true,wire});
  if(preview&&!result)cancelPastForwardCheck();
  if(preview&&result&&typeof Worker==='function'&&(self.navigator?.hardwareConcurrency??0)>=8&&!data.args.basin&&!data.args.aimed)
   startForwardCheck(data.args.work);
 }
 catch(error){if(data.kind==='warm-scoop-base')cancelPastForwardCheck();self.postMessage({id:data.id,ok:false,message:error.message});}
};
