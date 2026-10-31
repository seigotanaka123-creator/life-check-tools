import {RULES,OPPONENTS,opponentSpec,STEP,match,step,WORLD,WORLD_RULES,worldMatch,worldStep,worldStart} from './imasora-sliding-tag-model.mjs?v=120rk';
export const MAX_TICKS=Math.ceil(37/STEP)+4;
const idOK=id=>typeof id==='string'&&/^tag:[A-Za-z0-9_-]{8,80}$/.test(id);
const newId=()=>{const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return'tag:'+Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');};
function components(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>2||Math.abs(z)>2)throw Error('INVALID_INPUT');
}
// Capture the applied inputs, including the countdown. Pause time never enters
// this trace. Fixed-size storage avoids allocating history objects every tick.
export function createRecordedMatch(role='escape',opponent='cutoff',id=newId()){
 if(!idOK(id))throw Error('INVALID_ROUND_ID');
 const state=match(role,35,opponent),trace=new Float64Array(MAX_TICKS*3);let ticks=0;
 return{state,tick(input={}){if(state.phase==='finished')return state;if(ticks>=MAX_TICKS)throw Error('TRACE_FULL');const x=input.x??0,z=input.z??0;components(x,z);const i=ticks++*3;trace[i]=x;trace[i+1]=z;trace[i+2]=(input.jump?1:0)|(input.dash?2:0);return step(state,input);},proof(){if(state.phase!=='finished')throw Error('ROUND_UNFINISHED');return{version:1,id,rules:RULES,role,opponent,duration:35,inputs:trace.slice(0,ticks*3),claim:{...state.result}};}};
}
// Recompute the outcome. A personal best or a claimed win is never a reward
// receipt. This is consistency checking on the client, not server anti-cheat.
export function verifyRound(proof){
 const wide=proof?.rules===WORLD_RULES;
 if(!proof||proof.version!==1||!idOK(proof.id)||(!wide&&proof.rules!==RULES)||proof.duration!==(wide?WORLD.duration:35)||!['chase','escape'].includes(proof.role)||!opponentSpec(proof.opponent))throw Error('INVALID_PROOF');
 if(wide&&!worldStart(proof.startKey))throw Error('INVALID_START');
 const input=proof.inputs;
 if(!(input instanceof Float64Array)||input.length<3||input.length%3||input.length>(wide?MAX_WORLD_TICKS:MAX_TICKS)*3)throw Error('INVALID_TRACE');
 const state=wide?worldMatch(proof.role,WORLD.duration,proof.opponent,{playerRadius:proof.playerRadius,startKey:proof.startKey}):match(proof.role,35,proof.opponent);
 for(let i=0;i<input.length;i+=3){if(state.phase==='finished')throw Error('EXTRA_TICKS');const x=input[i],z=input[i+1],flags=input[i+2];if(!Number.isInteger(flags)||flags<0||flags>3)throw Error('INVALID_FLAGS');components(x,z);(wide?worldStep:step)(state,{x,z,jump:!!(flags&1),dash:!!(flags&2)});}
 if(state.phase!=='finished')throw Error('INCOMPLETE_TRACE');
 const claim=proof.claim,result=state.result;if(!claim||claim.caught!==result.caught||claim.win!==result.win||!Number.isFinite(claim.time)||Math.abs(claim.time-result.time)>STEP/2)throw Error('RESULT_MISMATCH');
 return Object.freeze({version:1,id:proof.id,rules:state.rules,role:state.role,opponent:state.opponent,duration:state.duration,...(wide?{startKey:state.startKey}:{}),playedSeconds:result.time,caught:result.caught,win:result.win});
}

export const MAX_WORLD_TICKS=Math.ceil((WORLD.duration+2)/STEP)+4;
export function createRecordedWorldMatch(role='escape',opponent='cutoff',id=newId(),{playerRadius=2.7,startKey='boulevard'}={}){
 if(!idOK(id))throw Error('INVALID_ROUND_ID');const state=worldMatch(role,WORLD.duration,opponent,{playerRadius,startKey}),trace=new Float64Array(MAX_WORLD_TICKS*3);let ticks=0;return{state,tick(input={}){if(state.phase==='finished')return state;if(ticks>=MAX_WORLD_TICKS)throw Error('TRACE_FULL');const x=input.x??0,z=input.z??0;components(x,z);const i=ticks++*3;trace[i]=x;trace[i+1]=z;trace[i+2]=(input.jump?1:0)|(input.dash?2:0);return worldStep(state,input);},proof(){if(state.phase!=='finished')throw Error('ROUND_UNFINISHED');return{version:1,id,rules:WORLD_RULES,playerRadius,startKey,role,opponent,duration:WORLD.duration,inputs:trace.slice(0,ticks*3),claim:{...state.result}};}};
}
