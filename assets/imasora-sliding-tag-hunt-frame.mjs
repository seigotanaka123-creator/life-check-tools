// A 10 FPS display still has time for twelve 120 Hz steps. Bound work on
// longer stalls and carry only the fraction needed for the next fixed step.
export function createHuntFrameBudget(step,{maxSteps=12,maxDelta=.25}={}){
 if(!Number.isFinite(step)||step<=0||!Number.isSafeInteger(maxSteps)||maxSteps<1||!Number.isFinite(maxDelta)||maxDelta<step)throw Error('INVALID_HUNT_FRAME_BUDGET');
 let remainder=0,frames=0,ticks=0,limitedFrames=0,droppedSeconds=0,lastSteps=0;
 return{consume(delta,{running=true,visible=true}={}){
  lastSteps=0;if(!running||!visible){remainder=0;return{steps:0,delta:0};}
  delta=Number.isFinite(delta)?Math.max(0,delta):0;const bounded=Math.min(delta,maxDelta),available=remainder+bounded,whole=Math.floor((available+step*1e-9)/step),steps=Math.min(whole,maxSteps);
  remainder=Math.max(0,available-whole*step);frames++;ticks+=steps;lastSteps=steps;const discarded=Math.max(0,delta-bounded)+(whole-steps)*step;if(discarded>step*1e-8){limitedFrames++;droppedSeconds+=discarded;}
  return{steps,delta:steps*step};
 },firstStepAt(now){
  // Midpoint of the first retained step, on the same millisecond clock as
  // browser key events. The earlier part of a capped stall was discarded.
  return now-(remainder+(lastSteps-.5)*step)*1000;
 },reset(){remainder=0;lastSteps=0;},restart(){remainder=frames=ticks=limitedFrames=droppedSeconds=lastSteps=0;},stats:()=>({maxSteps,lastSteps,frames,ticks,limitedFrames,droppedSeconds,remainder})};
}

// A visible browser can throttle animation callbacks independently of timers.
// Start the backup near the fixed-step limit, even if slow callbacks still arrive.
export function startHuntFrameDriver(draw,{
 isInteractive,
 now=()=>performance.now(),
 requestFrame=callback=>requestAnimationFrame(callback),
 schedule=(callback,ms)=>setTimeout(callback,ms),
 cancel=timer=>clearTimeout(timer)
}){
 const slowFrameMs=110,backupIntervalMs=34;
 let lastRaf=now(),lastDraw=-Infinity,timer=null,usingTimer=false;
 function dispatch(time){
  lastDraw=time;
  draw(time);
 }
 function poll(){
  timer=null;
  if(!isInteractive()){
   usingTimer=false;
   return;
  }
  const time=now(),untilSlowFrame=slowFrameMs-(time-lastRaf);
  if(!usingTimer&&untilSlowFrame>0){
   timer=schedule(poll,Math.ceil(untilSlowFrame));
   return;
  }
  usingTimer=true;
  dispatch(time);
  timer=schedule(poll,backupIntervalMs);
 }
 function frame(){
  requestFrame(frame);
  const time=now(),gap=time-lastRaf;
  lastRaf=time;
  if(!isInteractive()){
   usingTimer=false;
   if(timer!==null)cancel(timer);
   timer=null;
  }else if(timer===null){
   timer=schedule(poll,slowFrameMs);
  }
  if(usingTimer){
   if(gap>=slowFrameMs)return;
   usingTimer=false;
   if(time-lastDraw<8)return;
  }
  dispatch(time);
 }
 requestFrame(frame);
}
