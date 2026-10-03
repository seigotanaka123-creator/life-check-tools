import {PROJECT_HISTORY_PAGE,PROJECT_HISTORY_LIMIT,projectOperationCount,findProjectOperation,archiveProjectPage} from './imasora-construction-concrete/project-history.mjs';
import {newFreeBuild,canonicalFreeAction,applyFreeAction,freeStock,freeFrameBoards} from './imasora-construction-concrete/free-build-state.mjs';
import './imasora-construction-pack-transfer.js?v=530';
import {createTrialState,assertTrialState,transitionTrial} from './imasora-construction-concrete-site-state.js';
import {createMixer,supplyIngredients,startMix,advanceMix,cancelMix,availableMixCells,CURE_DURATION_MS} from './imasora-construction-concrete/mixing.mjs';
import {DEFAULT_CONCRETE_LOCATION,nextFloorProblem,moveConcreteFloorProblem} from './imasora-construction-concrete/projects.mjs';
import {floorMask,floorPanelsProblem,paintCost,paintRemaining} from './imasora-construction-concrete/floor-parts.mjs';
import {foundationBoardCount} from './imasora-construction-concrete/free-foundation-state.mjs';

export const PROFILE_PROJECT_SCOPE='imasora-construction-profile-project-v1';
export const PROFILE_PROJECT_SITE='construction';
export const PROFILE_PROJECT_OPERATION_LIMIT=PROJECT_HISTORY_LIMIT;
const PACK=globalThis.ImasoraConstructionPackTransfer;
const SITE_ACTIONS=new Set(['PLACE_FORMWORK','CANCEL_FORMWORK','LOAD_BUCKET','RETURN_BUCKET','POUR','RECOVER_WET','FINISH_SURFACE','START_CURE','COMPLETE_CURE','DEMOLD']);
const clone=value=>structuredClone(value),fail=code=>{throw Error(code);};
const same=(a,b)=>{
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 if(Array.isArray(a)&&a.length!==b.length)return false;
 const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&same(a[key],b[key]));
};
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);

export function createProfileProject(profileId,schemaVersion=5){
 if(typeof profileId!=='string'||!/^[0-9a-f]{8}$/.test(profileId))fail('INVALID_PROJECT_PROFILE');
 const state={schemaVersion,scope:PROFILE_PROJECT_SCOPE,siteId:PROFILE_PROJECT_SITE,profileId,revision:0,site:createTrialState(0),importedTransfers:[],operations:[]};
 if(schemaVersion>=2){state.mixer=createMixer();state.cureElapsedMs=null;}
 if(schemaVersion>=3){state.location={...DEFAULT_CONCRETE_LOCATION};state.completedFloors=[];}
 if(schemaVersion>=5)state.paintUsed=0;
 if(schemaVersion>=6)state.freeBuild=newFreeBuild();
 if(schemaVersion>=10)state.foundation=null;
 if(schemaVersion>=11)state.freeBuild.baseY=0;
 if(schemaVersion>=14)state.archivedOperations=[];
 return state;
}
function canonical(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!validId(raw.operationId))fail('INVALID_PROJECT_ACTION');
 if(typeof raw.type==='string'&&raw.type.startsWith('FREE_'))return canonicalFreeAction(raw);
 const action={type:raw.type,operationId:raw.operationId},allowed=['type','operationId'];
 if(['IMPORT_PACK_CONCRETE','IMPORT_PACK_INGREDIENTS'].includes(action.type)){
  if(typeof raw.transferId!=='string'||!/^pack-transfer-[A-Za-z0-9_-]{8,180}$/.test(raw.transferId))fail('INVALID_PACK_TRANSFER_ID');
  action.transferId=raw.transferId;allowed.push('transferId');
 }else if(action.type==='START_NEXT_FLOOR'){
  if(!Number.isSafeInteger(raw.x)||!Number.isSafeInteger(raw.z))fail('INVALID_CONCRETE_LOCATION');action.x=raw.x;action.z=raw.z;allowed.push('x','z');
 }else if(action.type==='MOVE_COMPLETED_FLOOR'){
  if(!Number.isSafeInteger(raw.floorIndex)||raw.floorIndex<0||!Number.isSafeInteger(raw.x)||!Number.isSafeInteger(raw.z))fail('INVALID_CONCRETE_LOCATION');action.floorIndex=raw.floorIndex;action.x=raw.x;action.z=raw.z;allowed.push('floorIndex','x','z');
 }else if(['SET_FLOOR_PANELS','PAINT_FLOOR_PANELS'].includes(action.type)){
  if(!Number.isSafeInteger(raw.floorIndex)||raw.floorIndex<0||!Number.isInteger(raw.mask)||raw.mask<0||raw.mask>15)fail('INVALID_FLOOR_PANELS');
  action.floorIndex=raw.floorIndex;action.mask=raw.mask;allowed.push('floorIndex','mask');
  if(action.type==='PAINT_FLOOR_PANELS'){if(typeof raw.color!=='string')fail('INVALID_FLOOR_COLOR');action.color=raw.color;allowed.push('color');}
 }else if(action.type==='START_MIX'){
  if(!Number.isSafeInteger(raw.cells)||raw.cells<1||raw.cells>8)fail('INVALID_MIX_BATCH');action.cells=raw.cells;allowed.push('cells');
 }else if(['ADVANCE_MIX','CANCEL_MIX'].includes(action.type)){
  if(!validId(raw.mixId))fail('INVALID_MIX_ID');action.mixId=raw.mixId;allowed.push('mixId');
  if(action.type==='ADVANCE_MIX'){if(!Number.isSafeInteger(raw.elapsedMs)||raw.elapsedMs<1||raw.elapsedMs>5000)fail('INVALID_MIX_ELAPSED');action.elapsedMs=raw.elapsedMs;allowed.push('elapsedMs');}
 }else if(action.type==='ADVANCE_ACTIVE_CURE'){
  if(!Number.isSafeInteger(raw.elapsedMs)||raw.elapsedMs<1||raw.elapsedMs>CURE_DURATION_MS)fail('INVALID_CURE_ELAPSED');action.elapsedMs=raw.elapsedMs;allowed.push('elapsedMs');
 }else if(['START_ACTIVE_CURE','ADOPT_ACTIVE_CURE'].includes(action.type)){
 }else if(SITE_ACTIONS.has(action.type)){
  if(['LOAD_BUCKET','POUR'].includes(action.type)){if(!Number.isSafeInteger(raw.cells)||raw.cells<1||raw.cells>1)fail('INVALID_BUCKET_AMOUNT');action.cells=raw.cells;allowed.push('cells');}
  if(['START_CURE','COMPLETE_CURE'].includes(action.type)){if(!Number.isSafeInteger(raw.now)||raw.now<0)fail('INVALID_CLOCK');action.now=raw.now;allowed.push('now');}
 }else fail('UNKNOWN_PROJECT_ACTION');
 if(Object.keys(raw).some(key=>!allowed.includes(key)))fail('UNKNOWN_PROJECT_ACTION_FIELD');return action;
}
function packetFor(ledger,id,profileId){
 if(!PACK)fail('PACK_TRANSFER_UNAVAILABLE');
 PACK.validateTrialLedger(ledger,profileId);
 const packet=ledger.transfers.find(entry=>entry.id===id);if(!packet)fail('PACK_TRANSFER_NOT_RECEIVED');
 return packet;
}
function apply(state,action,packLedger){
 if(action.type==='PLACE_FORMWORK'&&state.foundation&&foundationBoardCount(state.foundation)+(state.schemaVersion>=11&&!['design','complete'].includes(state.freeBuild.stage)?freeFrameBoards(state.freeBuild.mask):0)+8>(packLedger.quantities?.auxiliaryUnits?.formwork??0))fail('土台で使用中の板を回収してから型枠を組んでください。');
 if(action.type.startsWith('FREE_')){applyFreeAction(state,action,packLedger);
 }else if(['IMPORT_PACK_CONCRETE','IMPORT_PACK_INGREDIENTS'].includes(action.type)){
  const packet=packetFor(packLedger,action.transferId,state.profileId),previous=state.importedTransfers.find(receipt=>receipt.transferId===packet.id);
  if(previous)return false;
  const cells=packet.quantities.concreteBlockCredits;if(!Number.isSafeInteger(cells)||cells<1)fail('PACK_HAS_NO_CONCRETE');
  const receiptId=`pack-${state.importedTransfers.length+1}`;
  if(action.type==='IMPORT_PACK_INGREDIENTS'){
   if(!state.mixer)fail('MIXER_SCHEMA_REQUIRED');supplyIngredients(state.mixer,cells);
  }else state.site=transitionTrial(state.site,{type:'RECEIVE_CONCRETE',operationId:action.operationId,cells,receiptId},state.site.revision).state;
  state.importedTransfers.push({transferId:packet.id,cells,receiptId,operationId:action.operationId,...(action.type==='IMPORT_PACK_INGREDIENTS'?{kind:'ingredients'}:{})});
 }else if(action.type==='START_NEXT_FLOOR'){
  if(state.schemaVersion<3)fail('MULTI_FLOOR_SCHEMA_REQUIRED');
  const position={x:action.x,z:action.z},problem=nextFloorProblem(state,position);if(problem)fail(problem);
  state.completedFloors.push({...state.location,cells:state.site.pouredCells});
  state.site=createTrialState(state.site.availableConcreteCells);state.cureElapsedMs=null;state.location=position;
 }else if(action.type==='MOVE_COMPLETED_FLOOR'){
  if(state.schemaVersion<4)fail('FLOOR_MOVE_SCHEMA_REQUIRED');
  const position={x:action.x,z:action.z},problem=moveConcreteFloorProblem(state,action.floorIndex,position);if(problem)fail(problem);
  state.completedFloors[action.floorIndex]={...state.completedFloors[action.floorIndex],...position};
 }else if(['SET_FLOOR_PANELS','PAINT_FLOOR_PANELS'].includes(action.type)){
  if(state.schemaVersion<5)fail('FLOOR_PANEL_SCHEMA_REQUIRED');
  const f=state.completedFloors[action.floorIndex];if(!f)fail('FLOOR_NOT_FOUND');
  if(action.type==='SET_FLOOR_PANELS'){
   if(action.mask===floorMask(f))fail('FLOOR_PANELS_UNCHANGED');
   const problem=floorPanelsProblem(state,action.floorIndex,f,action.mask);if(problem)fail(problem);
   f.panelMask=action.mask;
  }else{
   const cost=paintCost(f,action.mask,action.color);if(!cost)fail('FLOOR_PAINT_UNCHANGED');
   if(cost>paintRemaining(state,packLedger))fail('PAINT_STOCK_INSUFFICIENT');
   f.paint??=[null,null,null,null];for(let i=0;i<4;i++)if(action.mask&(1<<i))f.paint[i]=action.color;
   state.paintUsed+=cost;
  }
 }else if(action.type==='START_MIX'){
  if(!state.mixer)fail('MIXER_SCHEMA_REQUIRED');startMix(state.mixer,action.cells,action.operationId);
 }else if(action.type==='ADVANCE_MIX'){
  if(!state.mixer)fail('MIXER_SCHEMA_REQUIRED');const cells=advanceMix(state.mixer,action.mixId,action.elapsedMs);
  if(cells)state.site=transitionTrial(state.site,{type:'RECEIVE_CONCRETE',operationId:action.operationId,cells,receiptId:`mix-${state.revision}`},state.site.revision).state;
 }else if(action.type==='CANCEL_MIX'){
  if(!state.mixer)fail('MIXER_SCHEMA_REQUIRED');cancelMix(state.mixer,action.mixId);
 }else if(action.type==='START_ACTIVE_CURE'){
  if(!state.mixer)fail('MIXER_SCHEMA_REQUIRED');state.site=transitionTrial(state.site,{type:'START_CURE',operationId:action.operationId,now:0},state.site.revision).state;state.cureElapsedMs=0;
 }else if(action.type==='ADOPT_ACTIVE_CURE'){
  if(!state.mixer||state.site.stage!=='curing'||state.cureElapsedMs!==null)fail('INVALID_CURE_ADOPTION');state.cureElapsedMs=0;
 }else if(action.type==='ADVANCE_ACTIVE_CURE'){
  if(!state.mixer||state.site.stage!=='curing'||!Number.isSafeInteger(state.cureElapsedMs)||action.elapsedMs>CURE_DURATION_MS-state.cureElapsedMs)fail('INVALID_CURE_PROGRESS');
  state.cureElapsedMs+=action.elapsedMs;
  if(state.cureElapsedMs===CURE_DURATION_MS)state.site=transitionTrial(state.site,{type:'COMPLETE_CURE',operationId:action.operationId,now:state.site.cureDueAt},state.site.revision).state;
 }else{
  const next=transitionTrial(state.site,action,state.site.revision);if(!next.changed)return false;state.site=next.state;
 }
 state.operations.push(clone(action));state.revision++;archiveProjectPage(state);return true;
}
// Only exact, already replayed archived pages may use this private bounded
// cache. The key includes every page byte and the full validated pack ledger.
// State fields and the active page are still checked on every call.
const archivedReplayCache=new Map();
function upgradeProjectHistory(state){
 const next={...createProfileProject(state.profileId,14),...clone(state),schemaVersion:14,archivedOperations:[],historySourceSchemaVersion:state.schemaVersion};
 next.freeBuild.baseY??=0;
 return next;
}
function replayArchived(state,ledger){
 const pages=state.archivedOperations??[];
 if(!pages.length)return{replay:createProfileProject(state.profileId,state.schemaVersion),ids:new Set()};
 const key=JSON.stringify([state.schemaVersion,state.historySourceSchemaVersion??14,state.profileId,ledger,pages]);
 let cached=archivedReplayCache.get(key);
 if(!cached){
  let replay=createProfileProject(state.profileId,state.historySourceSchemaVersion??state.schemaVersion);const ids=new Set();
  for(const page of pages){for(const raw of page){const action=canonical(raw);if(ids.has(action.operationId))fail('DUPLICATE_PROJECT_OPERATION');ids.add(action.operationId);if(!apply(replay,action,ledger))fail('NOOP_IN_PROJECT_HISTORY');}if(replay.schemaVersion<14)replay=upgradeProjectHistory(replay);replay.archivedOperations.push(replay.operations);replay.operations=[];}
  const {operations,archivedOperations,...snapshot}=replay;cached={snapshot,ids};
  if(archivedReplayCache.size>=2)archivedReplayCache.delete(archivedReplayCache.keys().next().value);
  archivedReplayCache.set(key,cached);
 }
 return{replay:{...clone(cached.snapshot),operations:[],archivedOperations:pages},ids:cached.ids};
}
export function assertProfileProject(state,packLedger){
 if(!state||![1,2,3,4,5,6,7,8,9,10,11,12,13,14].includes(state.schemaVersion)||state.scope!==PROFILE_PROJECT_SCOPE||state.siteId!==PROFILE_PROJECT_SITE||typeof state.profileId!=='string'||!/^[0-9a-f]{8}$/.test(state.profileId)||!Array.isArray(state.operations)||state.operations.length>PROJECT_HISTORY_PAGE)fail('INVALID_PROFILE_PROJECT');
 if(state.schemaVersion>=14){
  if(!Array.isArray(state.archivedOperations)||state.archivedOperations.length>=PROJECT_HISTORY_LIMIT/PROJECT_HISTORY_PAGE||state.archivedOperations.some(page=>!Array.isArray(page)||page.length!==PROJECT_HISTORY_PAGE)||state.archivedOperations.length&&state.operations.length===0||projectOperationCount(state)>PROJECT_HISTORY_LIMIT)fail('INVALID_PROFILE_PROJECT');
  if(Object.hasOwn(state,'historySourceSchemaVersion')&&(!Number.isInteger(state.historySourceSchemaVersion)||state.historySourceSchemaVersion<1||state.historySourceSchemaVersion>13||!state.archivedOperations.length))fail('INVALID_PROFILE_PROJECT_HISTORY_SOURCE');
 }
 const ledger=packLedger??PACK.emptyTrialLedger(state.profileId);PACK.validateTrialLedger(ledger,state.profileId);
 const {replay,ids}=replayArchived(state,ledger),recent=new Set();
 for(const raw of state.operations){const action=canonical(raw);if(ids.has(action.operationId)||recent.has(action.operationId))fail('DUPLICATE_PROJECT_OPERATION');recent.add(action.operationId);if(!apply(replay,action,ledger))fail('NOOP_IN_PROJECT_HISTORY');}
 assertTrialState(state.site);
 if(!same(replay,state))fail('PROFILE_PROJECT_REPLAY_MISMATCH');
 const imported=state.importedTransfers.reduce((total,receipt)=>total+receipt.cells,0);
 const earned=ledger.transfers.reduce((total,packet)=>total+packet.quantities.concreteBlockCredits,0);
 const raw=state.mixer?availableMixCells(state.mixer)+(state.mixer.pending?.cells??0):0;
 const completed=(state.completedFloors??[]).reduce((sum,f)=>sum+f.cells,0);
 if(imported>earned||imported!==state.site.availableConcreteCells+state.site.bucketCells+state.site.pouredCells+raw+completed+(state.freeBuild?freeStock(state.freeBuild):0))fail('PROFILE_PROJECT_MATERIAL_NOT_CONSERVED');
 return true;
}
export function transitionProfileProject(state,raw,expectedRevision,packLedger){
 assertProfileProject(state,packLedger);const action=canonical(raw),prior=findProjectOperation(state,action.operationId);
 if(prior){if(!same(prior,action))fail('OPERATION_ID_REUSED_WITH_DIFFERENT_ACTION');return{state:clone(state),changed:false,duplicate:true};}
 if(['IMPORT_PACK_CONCRETE','IMPORT_PACK_INGREDIENTS'].includes(action.type)&&state.importedTransfers.some(r=>r.transferId===action.transferId)){
  const packet=packetFor(packLedger,action.transferId,state.profileId);if(packet.quantities.concreteBlockCredits!==state.importedTransfers.find(r=>r.transferId===action.transferId).cells)fail('IMPORTED_PACK_CHANGED');
  return{state:clone(state),changed:false,duplicate:true};
 }
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==state.revision)fail('STALE_PROFILE_PROJECT_REVISION');
 if(projectOperationCount(state)>=PROJECT_HISTORY_LIMIT)fail('PROFILE_PROJECT_OPERATION_LIMIT');
 // Old saved operations retain their meaning. Upgrade only on a successful
 // explicit new operation, within the same compare-and-swap world save.
 const version=Math.max(state.schemaVersion,state.schemaVersion<14&&state.operations.length===PROJECT_HISTORY_PAGE?14:0,action.type==='FREE_TRANSFORM_SUPPORTED_WORK'?13:action.type==='FREE_PAINT'&&(state.freeBuild.completed[action.work]?.baseY??0)>0?12:action.type==='FREE_UNFRAME'||['FREE_FRAME','FREE_FRAME_RAISED'].includes(action.type)&&state.foundation?11:action.type.startsWith('FREE_FOUNDATION_')?10:action.type==='FREE_TRANSFORM_WORK'?9:action.type==='FREE_MOVE_WORK'?8:action.type==='FREE_SET_WORK_PARTS'?7:action.type.startsWith('FREE_')?6:5);
 const pagingUpgrade=version===14&&state.schemaVersion<14&&state.operations.length===PROJECT_HISTORY_PAGE;
 const next=pagingUpgrade?upgradeProjectHistory(state):state.schemaVersion===version?clone(state):createProfileProject(state.profileId,version);
 if(!pagingUpgrade&&state.schemaVersion<version)for(const previous of state.operations)apply(next,canonical(previous),packLedger);
 apply(next,action,packLedger);assertProfileProject(next,packLedger);return{state:next,changed:true,duplicate:false};
}
export function availablePackConcreteCredits(ledger,project,profileId){
 PACK.validateTrialLedger(ledger,profileId);if(project)assertProfileProject(project,ledger);
 const earned=ledger.transfers.reduce((sum,packet)=>sum+packet.quantities.concreteBlockCredits,0);
 const assigned=project?.importedTransfers.reduce((sum,receipt)=>sum+receipt.cells,0)??0;
 return earned-assigned;
}
