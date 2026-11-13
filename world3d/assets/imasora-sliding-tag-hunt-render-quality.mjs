// Change only the drawing buffer after sustained load. Physics, CSS sizes,
// pointer ownership and camera settings are outside this controller.
export function createHuntRenderQuality({maxRatio=1.5,onChange=()=>{}}={}){
 if(!Number.isFinite(maxRatio)||maxRatio<=0)throw Error('INVALID_RENDER_RATIO');
 const maximum=Math.min(1.5,maxRatio),levels=maximum<1?[]:[.7,.85,1,1.25,1.5].filter(n=>n<maximum);levels.push(maximum);
 let level=levels.length-1,seconds=0,frames=0,slowFrames=0,severeFrames=0,lateFrames=0,lateSeconds=0,slow=0,severe=0,fast=0,cooldown=0,changes=0,capturing=false;
 const windowReset=()=>{seconds=frames=slowFrames=severeFrames=lateFrames=lateSeconds=0;};
 function reset(){windowReset();slow=severe=fast=0;}
 const ratio=()=>capturing?Math.max(levels[level],Math.min(1,maximum)):levels[level];
 function change(next){level=next;changes++;cooldown=8;reset();onChange(ratio());}
 return{sample(delta,active=true){
  if(levels.length===1)return ratio();
  // Menu/recording/background time and isolated large stalls are not a GPU
  // measurement. In particular, never recover quality from an idle screen.
  if(capturing||!active||!Number.isFinite(delta)||delta<=0||delta>.5){reset();return ratio();}
  // Bound the weight of any one long frame, but keep repeated visible stalls
  // in the measurement. A full reset on each slow frame never adapted at 1x.
  const interval=Math.min(.2,delta);
  cooldown=Math.max(0,cooldown-interval);seconds+=interval;frames++;if(delta>1/36)slowFrames++;if(delta>1/12)severeFrames++;
  // Twelve fixed physics steps cover 100ms. Recurring gaps can discard
  // time even in a window with many fast frames and a good average FPS.
  if(interval>.1){lateFrames++;lateSeconds+=interval-.1;}
  if(seconds<2)return ratio();
  const average=seconds/frames;
  if(average>1/32&&slowFrames/frames>.45){slow=Math.min(8,slow+seconds);fast=0;}
  else if(average<1/52&&slowFrames===0){fast=Math.min(18,fast+seconds);slow=0;}
  else slow=fast=0;
  const fallingBehind=lateFrames>=4&&lateSeconds>=seconds*.05;
  severe=(average>1/18&&severeFrames/frames>=1/3||fallingBehind)?Math.min(8,severe+seconds):0;
  windowReset();
  if(cooldown===0&&level>0&&(levels[level-1]>=1?slow>=4:severe>=4))change(level-1);
  else if(cooldown===0&&fast>=16&&level<levels.length-1)change(level+1);
  return ratio();
 },setCapture(active){
  if(capturing===!!active)return;
  const prior=ratio();capturing=!!active;reset();
  // Keep the existing native-resolution minimum for video and live output.
  if(ratio()!==prior)onChange(ratio());
 },reset,stats:()=>({ratio:ratio(),maximum,changes,cooldown,windowSeconds:seconds,windowFrames:frames})};
}
