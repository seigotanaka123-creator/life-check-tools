import {transitionTrial} from './imasora-construction-concrete-site-state.js';
import {transitionProfileProject} from './imasora-construction-profile-project.js';
const fail=code=>{throw new Error(code);};
const EPSILON=1e-5;
const RECEIPT_KEYS=['type','maxGripError','maxLipError','maxBladeError','maxPoleLength','streamSamples','contactSamples','completedBands','completedPanels','hammerHits','maxHitError','fillSamples','maxFillError','maxVolumeError'];
const finite=(value)=>Number.isFinite(value)&&value>=0;
const exactIds=(value,count)=>Array.isArray(value)&&value.length===count&&new Set(value).size===count&&value.every((id,index)=>Number.isInteger(id)&&id>=0&&id<count);
const PHYSICAL_ACTIONS=new Set(['PLACE_FORMWORK','LOAD_BUCKET','POUR','FINISH_SURFACE']);

// The profile save boundary accepts a completed tool-contact receipt, never a
// button click alone. `site-view.mjs` produces this shape after checking the
// real hand/tool mesh contact in the isolated C2 scene.
export function assertConstructionToolReceipt(actionType,receipt){
 if(!PHYSICAL_ACTIONS.has(actionType)||!receipt||typeof receipt!=='object'||Array.isArray(receipt)||receipt.type!==actionType)fail('TOOL_RECEIPT_TYPE_MISMATCH');
 const keys=Object.keys(receipt).sort(),expected=[...RECEIPT_KEYS].sort();
 if(keys.length!==expected.length||keys.some((key,index)=>key!==expected[index]))fail('INVALID_TOOL_RECEIPT_FIELDS');
 for(const key of ['maxGripError','maxLipError','maxBladeError','maxPoleLength','streamSamples','contactSamples'])if(!finite(receipt[key]))fail('INVALID_TOOL_RECEIPT_METRIC');
 if(receipt.maxGripError>EPSILON)fail('TOOL_GRIP_CONTACT_NOT_CONFIRMED');
 if(actionType==='PLACE_FORMWORK'){
  if(!finite(receipt.maxHitError)||receipt.maxHitError>EPSILON||!exactIds(receipt.completedPanels,8)||!exactIds(receipt.hammerHits,16))fail('FRAME_CONTACT_NOT_CONFIRMED');
 }else if(actionType==='LOAD_BUCKET'){
  if(!finite(receipt.fillSamples)||receipt.fillSamples<1||!finite(receipt.maxFillError)||receipt.maxFillError>EPSILON||!finite(receipt.maxVolumeError)||receipt.maxVolumeError>EPSILON)fail('LOAD_CONTACT_NOT_CONFIRMED');
 }else if(actionType==='POUR'){
  if(receipt.streamSamples<1||receipt.maxLipError>EPSILON)fail('POUR_CONTACT_NOT_CONFIRMED');
 }else if(actionType==='FINISH_SURFACE'){
  if(receipt.contactSamples<8||receipt.maxBladeError>EPSILON||receipt.maxPoleLength>30||!exactIds(receipt.completedBands,8))fail('FINISH_CONTACT_NOT_CONFIRMED');
 }
 return true;
}

// Bridges the C2 scene's verified interaction receipt to the profile project's
// atomic save. A failed queued save is retried through WorldSaveService.retry,
// which retains its operation ID and payload rather than replaying animation.
export function createProfileSiteController({view,service,toSceneState=state=>state,makeOperationId=()=>crypto.randomUUID()}){
 if(!view||typeof view.performAction!=='function'||!service||typeof service.saveConstructionConcreteProject!=='function')fail('PROFILE_SITE_DEPENDENCIES_REQUIRED');
 let pending=null,running=false;
 const physical=type=>PHYSICAL_ACTIONS.has(type);
 return{
  get pending(){return pending?structuredClone(pending):null;},
  async run(type,extra={}){
   if(running||pending||service.busy||service.blocked)fail('PROFILE_SITE_BUSY');
   const project=service.constructionConcreteProject;
   if(!project)fail('PROFILE_SITE_NOT_LOADED');
   const action={type,operationId:makeOperationId(),...structuredClone(extra)};
   const checked=service.constructionPackTrialStock
    ?transitionProfileProject(project,action,project.revision,service.constructionPackTrialStock)
    :transitionTrial(project.site,action,project.site.revision);
   if(!checked.changed)fail('PROFILE_SITE_ACTION_NOT_READY');
   let receipt=null;running=true;
   try{
    if(physical(type)){receipt=await view.performAction(type,structuredClone(toSceneState(project.site)));assertConstructionToolReceipt(type,receipt);}
    pending={action,expectedRevision:project.revision,receipt:receipt?structuredClone(receipt):null};
    await service.saveConstructionConcreteProject(action,project.revision,service.world,receipt);
    pending=null;return service.constructionConcreteProject;
   }catch(error){if(!service.jobs?.length)pending=null;throw error;}
   finally{running=false;}
  },
  async retry(){
   if(running||!pending||!service.blocked||typeof service.retry!=='function')fail('PROFILE_SITE_NO_RETRY');
   running=true;try{await service.retry();pending=null;return service.constructionConcreteProject;}finally{running=false;}
  },
  clearPendingAfterReload(){pending=null;return service.constructionConcreteProject;}
 };
}
