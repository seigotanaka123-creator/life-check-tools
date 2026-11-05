// Fixed physics ticks remain unchanged. A stalled display must not force a
// burst of stale movement or an ever-growing catch-up queue on the next frame.
export function createHuntFrameBudget(step,{maxSteps=8,maxDelta=.25}={}){
 if(!Number.isFinite(step)||step<=0||!Number.isSafeInteger(maxSteps)||maxSteps<1||!Number.isFinite(maxDelta)||maxDelta<step)throw Error('INVALID_HUNT_FRAME_BUDGET');
 let remainder=0,frames=0,ticks=0,limitedFrames=0,droppedSeconds=0,lastSteps=0;
 return{consume(delta,{running=true,visible=true}={}){
  lastSteps=0;if(!running||!visible){remainder=0;return{steps:0,delta:0};}
  delta=Number.isFinite(delta)?Math.max(0,delta):0;const bounded=Math.min(delta,maxDelta),available=remainder+bounded,whole=Math.floor((available+step*1e-9)/step),steps=Math.min(whole,maxSteps);
  remainder=Math.max(0,available-whole*step);frames++;ticks+=steps;lastSteps=steps;const discarded=Math.max(0,delta-bounded)+(whole-steps)*step;if(discarded>step*1e-8){limitedFrames++;droppedSeconds+=discarded;}
  return{steps,delta:steps*step};
 },reset(){remainder=0;lastSteps=0;},restart(){remainder=frames=ticks=limitedFrames=droppedSeconds=lastSteps=0;},stats:()=>({maxSteps,lastSteps,frames,ticks,limitedFrames,droppedSeconds,remainder})};
}
