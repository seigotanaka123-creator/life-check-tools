import {FREE_STEP_UNDO_LIMIT,freeStepUndoPointTarget} from './free-step-undo.mjs?v=120ft';
// Temporary tape and saved material work use the same on-screen undo chain.
// A failed save or a cancelled confirmation must never spend an undo turn.
export function createWorkUndoCursor(){
 let remaining=FREE_STEP_UNDO_LIMIT;const consumed=new Set();
 return{get remaining(){return remaining;},newWork(){remaining=FREE_STEP_UNDO_LIMIT;consumed.clear();},consume(id){if(!id||consumed.has(id))return;consumed.add(id);remaining=Math.max(0,remaining-1);},select(history,tapes){
  if(!remaining)return null;const step=history.at(-1),tape=tapes.at(-1),count=Math.min(remaining,history.length+tapes.length);
  if(tape&&(!step||tape.revision>step.revision))return{...tape,sourceType:'MASK_UNDO',label:tape.applied?'テープを貼った':'テープをはがした',count};
  const target=freeStepUndoPointTarget(step);return target?{...target,count}:null;
 }};
}
