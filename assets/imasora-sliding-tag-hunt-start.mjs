import{recordHunt,HUNT_RULES,CONTACT_APPROACH_RULES,CORNER_SEARCH_RULES,RUNNER_SUPPLY_RULES,RUNNER_CUSHION_RULES,RUNNER_FAN_RULES,COURTYARD_WIND_RULES,COURTYARD_REACQUIRE_RULES,COURTYARD_TEAM_RULES,JUMP_RECOVERY_RULES,TERRITORY_SEARCH_RULES}from'./imasora-sliding-tag-hunt.mjs';

// Use the accepted layout seed, not the originally requested (possibly rejected)
// seed. Carry only round settings: never inventory, effects, time or a result.
export function huntRetryConfig(state){
 if(![HUNT_RULES,CONTACT_APPROACH_RULES,CORNER_SEARCH_RULES,RUNNER_SUPPLY_RULES,RUNNER_CUSHION_RULES,RUNNER_FAN_RULES,COURTYARD_WIND_RULES,COURTYARD_REACQUIRE_RULES,COURTYARD_TEAM_RULES,JUMP_RECOVERY_RULES,TERRITORY_SEARCH_RULES].includes(state?.rules)||state.phase!=='finished'||!state.result)throw Error('NO_FINISHED_RETRY');
 const c=state.config;
 if(!c||!Array.isArray(c.opponents)||c.opponents.length!==3||!Number.isInteger(c.seed)||c.seed<0||c.seed>0xffffffff)throw Error('INVALID_RETRY_CONFIG');
 const{hunterCount,startKey,seed,duration,playerItem,playerRadius,playerShape,mode,hunterItem}=c;
 return Object.freeze({hunterCount,opponents:Object.freeze([...c.opponents]),startKey,seed,duration,playerItem,playerRadius,playerShape,mode,hunterItem});
}

// Retry a rejected random layout before play starts. The accepted seed remains
// in the normal record, so replay/proof verification uses the unchanged rules.
export function recordReadyHunt(config={},record=recordHunt,accept=()=>true){
 const seed=config.seed??12031;let rejected;
 for(let attempt=0;attempt<16;attempt++){
  try{
   const round=record(attempt?{...config,seed:(seed+Math.imul(attempt,0x9e3779b9))>>>0}:config);
   if(accept(round))return round;
   rejected=Error('NO_DIFFERENT_HUNT_START');
  }
  catch(error){
   if(!/^NO_SAFE_SUPPLY_cell-\d+_\w+$|^NO_HOOK_SUPPLY_CELL$/.test(error?.message??''))throw error;
   rejected=error;
  }
 }
 throw rejected;
}

function controlledSpawn(state){
 return state?.spawnLayout?.positions[state.config.mode==='hunt'?1:0];
}

export function recordFreshHunt(config,previous,record=recordHunt){
 const prior=controlledSpawn(previous);
 if(!prior)return recordReadyHunt(config,record);
 return recordReadyHunt(config,record,round=>{
  const next=controlledSpawn(round.state);
  return next.x!==prior.x||next.z!==prior.z;
 });
}
