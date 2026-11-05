// Change only the drawing buffer after sustained load. Physics, CSS sizes,
// pointer ownership and camera settings are outside this controller.
export function createHuntRenderQuality({maxRatio=1.5,onChange=()=>{}}={}){
 if(!Number.isFinite(maxRatio)||maxRatio<=0)throw Error('INVALID_RENDER_RATIO');
 const maximum=Math.min(1.5,maxRatio),levels=[1,1.25,1.5].filter(n=>n<maximum);levels.push(maximum);
 let level=levels.length-1,seconds=0,frames=0,slowFrames=0,slow=0,fast=0,cooldown=0,changes=0;
 const windowReset=()=>{seconds=frames=slowFrames=0;};
 function reset(){windowReset();slow=fast=0;}
 const ratio=()=>levels[level];
 function change(next){level=next;changes++;cooldown=8;reset();onChange(ratio());}
 return{sample(delta,active=true){
  if(levels.length===1)return ratio();
  // Menu/recording/background time and isolated large stalls are not a GPU
  // measurement. In particular, never recover quality from an idle screen.
  if(!active||!Number.isFinite(delta)||delta<=0||delta>.25){reset();return ratio();}
  cooldown=Math.max(0,cooldown-delta);seconds+=delta;frames++;if(delta>1/36)slowFrames++;
  if(seconds<2)return ratio();
  const average=seconds/frames;
  if(average>1/32&&slowFrames/frames>.45){slow=Math.min(8,slow+seconds);fast=0;}
  else if(average<1/52&&slowFrames===0){fast=Math.min(18,fast+seconds);slow=0;}
  else slow=fast=0;
  windowReset();
  if(cooldown===0&&slow>=4&&level>0)change(level-1);
  else if(cooldown===0&&fast>=16&&level<levels.length-1)change(level+1);
  return ratio();
 },reset,stats:()=>({ratio:ratio(),maximum,changes,cooldown,windowSeconds:seconds,windowFrames:frames})};
}
