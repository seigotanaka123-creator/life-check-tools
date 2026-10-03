// Isolated C2 workflow only. These credits are not production inventory.
export const TRIAL = Object.freeze({scope:'c2-profile-funded-site-v1',schemaVersion:1,cellSize:8,formWidth:32,formHeight:2,targetCells:4,initialCells:0,panels:8,bucketCapacity:1,cureMs:30000,maxOperations:1024,maxConcreteCells:Number.MAX_SAFE_INTEGER});
const clone = value => structuredClone(value);
const fail = code => { throw new Error(code); };
const int = value => Number.isSafeInteger(value) && value >= 0;

export function createTrialState(initialCells=0) {
  if(!int(initialCells)||initialCells>TRIAL.maxConcreteCells)fail('INVALID_INITIAL_STOCK');
  return {schemaVersion:TRIAL.schemaVersion,scope:TRIAL.scope,revision:0,stage:'unframed',initialConcreteCells:initialCells,receivedConcreteCells:0,
    availableConcreteCells:initialCells,bucketCells:0,pouredCells:0,targetCells:4,totalFormworkPanels:8,availableFormworkPanels:8,
    formworkPanelsInUse:0,cureStartedAt:null,cureDueAt:null,appliedOperations:[]};
}

function canonicalAction(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) fail('ACTION_REQUIRED');
  if (typeof action.operationId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(action.operationId)) fail('INVALID_OPERATION_ID');
  const allowed = ['type','operationId'];
  const out = {type:action.type,operationId:action.operationId};
  switch(action.type) {
    case 'RECEIVE_CONCRETE':
      allowed.push('cells','receiptId');
      if(!int(action.cells)||action.cells<1||action.cells>TRIAL.maxConcreteCells)fail('INVALID_RECEIPT_AMOUNT');
      if(typeof action.receiptId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(action.receiptId))fail('INVALID_RECEIPT_ID');
      out.cells=action.cells;out.receiptId=action.receiptId;break;
    case 'LOAD_BUCKET': case 'POUR':
      allowed.push('cells');
      if (!int(action.cells) || action.cells < 1 || action.cells > TRIAL.bucketCapacity) fail('INVALID_BUCKET_AMOUNT');
      out.cells = action.cells;
      break;
    case 'START_CURE': case 'COMPLETE_CURE':
      allowed.push('now');
      if (!int(action.now) || action.now > Number.MAX_SAFE_INTEGER-TRIAL.cureMs) fail('INVALID_CLOCK');
      out.now = action.now;
      break;
    case 'PLACE_FORMWORK': case 'CANCEL_FORMWORK': case 'RETURN_BUCKET': case 'RECOVER_WET': case 'FINISH_SURFACE': case 'DEMOLD': break;
    default: fail('UNKNOWN_ACTION');
  }
  if (Object.keys(action).some(key=>!allowed.includes(key))) fail('UNKNOWN_ACTION_FIELD');
  return out;
}

function apply(draft, action) {
  const stage = (...allowed) => { if(!allowed.includes(draft.stage)) fail('INVALID_STAGE_TRANSITION_'+draft.stage.toUpperCase()); };
  switch(action.type) {
    case 'RECEIVE_CONCRETE':
      if(draft.appliedOperations.some(a=>a.type==='RECEIVE_CONCRETE'&&a.receiptId===action.receiptId))fail('RECEIPT_ALREADY_APPLIED');
      if(action.cells>TRIAL.maxConcreteCells-draft.initialConcreteCells-draft.receivedConcreteCells)fail('PROFILE_SUPPLY_LIMIT');
      draft.receivedConcreteCells+=action.cells;draft.availableConcreteCells+=action.cells;break;
    case 'PLACE_FORMWORK':
      stage('unframed'); draft.availableFormworkPanels=0; draft.formworkPanelsInUse=8; draft.stage='framed'; break;
    case 'CANCEL_FORMWORK':
      stage('framed'); if(draft.bucketCells)fail('RETURN_BUCKET_FIRST'); draft.availableFormworkPanels=8; draft.formworkPanelsInUse=0; draft.stage='unframed'; break;
    case 'LOAD_BUCKET':
      stage('framed','pouring');
      if(draft.bucketCells+action.cells>TRIAL.bucketCapacity)fail('BUCKET_FULL');
      if(draft.bucketCells+action.cells>draft.targetCells-draft.pouredCells)fail('PROJECT_ALREADY_SUPPLIED');
      if(action.cells>draft.availableConcreteCells)fail('INSUFFICIENT_CONCRETE');
      draft.availableConcreteCells-=action.cells;draft.bucketCells+=action.cells;break;
    case 'RETURN_BUCKET':
      stage('framed','pouring'); if(!draft.bucketCells)fail('BUCKET_EMPTY');
      draft.availableConcreteCells+=draft.bucketCells;draft.bucketCells=0;break;
    case 'POUR':
      stage('framed','pouring');
      if(action.cells>draft.targetCells-draft.pouredCells) fail('POUR_EXCEEDS_FORM');
      if(action.cells>draft.bucketCells)fail('BUCKET_NOT_LOADED');
      draft.bucketCells-=action.cells;draft.pouredCells+=action.cells;draft.stage='pouring';break;
    case 'RECOVER_WET':
      stage('pouring','finished'); draft.availableConcreteCells+=draft.pouredCells+draft.bucketCells; draft.pouredCells=0;draft.bucketCells=0;draft.stage='framed'; break;
    case 'FINISH_SURFACE':
      stage('pouring'); if(draft.pouredCells!==draft.targetCells||draft.bucketCells) fail('PROJECT_NOT_FULL'); draft.stage='finished'; break;
    case 'START_CURE':
      stage('finished'); draft.cureStartedAt=action.now; draft.cureDueAt=action.now+TRIAL.cureMs; draft.stage='curing'; break;
    case 'COMPLETE_CURE':
      stage('curing'); if(action.now<draft.cureDueAt) return false; draft.stage='cured'; break;
    case 'DEMOLD':
      stage('cured'); draft.availableFormworkPanels=8; draft.formworkPanelsInUse=0; draft.cureStartedAt=null; draft.cureDueAt=null; draft.stage='demolded'; break;
  }
  draft.appliedOperations.push(clone(action)); draft.revision++;
  return true;
}

// Replay the bounded operation history: forged totals/stages cannot pass just by
// balancing available+poured, nor can an old schema silently become a new game.
export function assertTrialState(state) {
  if (!state || typeof state!=='object' || Array.isArray(state)) fail('INVALID_TRIAL_STATE');
  if(state.schemaVersion!==TRIAL.schemaVersion || state.scope!==TRIAL.scope) fail('UNSUPPORTED_TRIAL_STATE');
  if(!Array.isArray(state.appliedOperations) || state.appliedOperations.length>TRIAL.maxOperations) fail('INVALID_OPERATION_LOG');
  const replay=createTrialState(state.initialConcreteCells), ids=new Set();
  for(const raw of state.appliedOperations) {
    const action=canonicalAction(raw);
    if(ids.has(action.operationId)) fail('DUPLICATE_OPERATION_ID'); ids.add(action.operationId);
    if(!apply(replay,action)) fail('PREMATURE_CURE_RECORD');
  }
  if(Object.keys(state).length!==Object.keys(replay).length) fail('UNKNOWN_STATE_FIELD');
  for(const key of Object.keys(replay)) {
    if(key==='appliedOperations') continue;
    if(state[key]!==replay[key]) fail('INVALID_REPLAY_'+key.toUpperCase());
  }
  return true;
}

export function transitionTrial(state, rawAction, expectedRevision=state?.revision) {
  assertTrialState(state);
  const action=canonicalAction(rawAction);
  const previous=state.appliedOperations.find(item=>item.operationId===action.operationId);
  if(previous) {
    if(JSON.stringify(canonicalAction(previous))!==JSON.stringify(action)) fail('OPERATION_ID_REUSED_WITH_DIFFERENT_ACTION');
    return {state:clone(state),changed:false,duplicate:true};
  }
  if(!int(expectedRevision) || expectedRevision!==state.revision) fail('STALE_TRIAL_REVISION');
  if(state.appliedOperations.length===TRIAL.maxOperations) fail('TRIAL_OPERATION_LIMIT');
  const next=clone(state), changed=apply(next,action);
  return {state:next,changed,duplicate:false,notReady:!changed};
}

export function isWalkable(state) { assertTrialState(state); return state.stage==='demolded'; }

// The official actor uses scale .36. Spread the same four cells over 32x32
// to make a traversable 2-unit slab; each 8^3 bucket raises it by .5.
export function slabGeometry(state) {
  assertTrialState(state);
  const width=TRIAL.formWidth,depth=TRIAL.formWidth,height=TRIAL.formHeight*state.pouredCells/TRIAL.targetCells;
  return {width,depth,height,maxHeight:TRIAL.formHeight,volume:width*depth*height,ledgerPoints:state.pouredCells*1000,
    fullPaintFaces:36,readyForSurface:isWalkable(state)};
}
