import {balloonDescentFacing} from './imasora-sliding-tag-hunt-balloon-steering.mjs';
import {huntCanObserve} from './imasora-sliding-tag-hunt-sight.mjs';
import {worldHeight,worldSight,worldSurface,worldTraversable,worldValid} from './imasora-sliding-tag-hunt-world.mjs';

// The balloon sets down in its committed column. While descending, look
// toward a genuinely visible runner; a turn or reverse always wins.
export function balloonLandingFacing(a,input,observed,dt){
 if(input.manualSteering){balloonDescentFacing(a,input,dt);return;}
 if(!observed)return;
 balloonDescentFacing(a,{x:observed.x-a.x,z:observed.z-a.z},dt);
}

export function balloonLandingObservation(s,a,runner){
 if(!huntCanObserve(s,a,runner))return null;
 // The view must not identify the original through a visible decoy.
 if(s.gadgets.some(g=>g.kind==='clone'&&g.until>s.time&&huntCanObserve(s,a,g)))return null;
 return {x:runner.x,z:runner.z};
}

export function runnerThreatSight(s,runner,hunter){
 const dx=hunter.x-runner.x,dz=hunter.z-runner.z,gap=Math.hypot(dx,dz);
 const front=(dx*Math.sin(runner.yaw)+dz*Math.cos(runner.yaw))/(gap||1);
 // Outside the forward arc, nearby visible motion can still startle the
 // runner. A radar pickup is handled separately and still works all around.
 const range=front>=.14?125:58;
 return gap<range&&huntCanObserve(s,runner,hunter,range);
}

export function escapeChaseRhythm(time){
 const progress=Math.max(0,Math.min(1,(time-26)/40));
 return {share:time>=28,allowBalloon:time>=26,closeAll:time>=40,
  pursuit:.88+.08*progress,support:.72+.17*progress};
}

export function balloonExitClear(spot,observed,radius){
 const dx=observed.x-spot.x,dz=observed.z-spot.z;
 const distance=Math.hypot(dx,dz);
 const reach=Math.min(distance,18);
 if(reach<1)return true;
 return worldTraversable(spot,{
  x:spot.x+dx*reach/distance,
  z:spot.z+dz*reach/distance
 },radius-.05);
}

export function balloonExitPenalty(spot,target,radius){
 const dx=target.x-spot.x,dz=target.z-spot.z,distance=Math.hypot(dx,dz);
 if(distance<1)return 0;
 let penalty=worldSurface(spot.x,spot.z)==='ice'?10:0;
 for(let length=3;length<=Math.min(30,distance);length+=3){
  const x=spot.x+dx*length/distance,z=spot.z+dz*length/distance;
  const end={x,z,y:worldHeight(x,z)};
  if(!worldValid(end,radius+.15)||!worldTraversable(spot,end,radius+.15)){
   return penalty+Math.max(0,30-length)*1.1;
  }
  if(worldSurface(x,z)==='ice')penalty+=1.5;
 }
 return penalty;
}

export function balloonTouchdownStride(a,input){
 const magnitude=Math.hypot(input.x??0,input.z??0);
 if(!input.dash||magnitude<.7||a.externalForce||a.slippery)return;
 const x=input.x/magnitude,z=input.z/magnitude;
 const next={x:a.x+x*5,z:a.z+z*5};
 if(!worldValid(next,a.radius+.15)||!worldTraversable(a,next,a.radius+.15))return;
 const speed=worldSurface(a.x,a.z)==='ice'?7:5;
 a.vx=x*speed;
 a.vz=z*speed;
}

// Pick a short, open glide once. Both the current and projected runner
// need a full dive's worth of space, even on the inside of a turn.
export function balloonDescentGlide(s,a,runner,minimumGap){
 if(a.externalForce||a.y-worldHeight(a.x,a.z)<6||!balloonLandingObservation(s,a,runner))return null;
 const floor=worldHeight(a.x,a.z);
 const ahead=balloonDescentLead(a,runner),radius=a.radius+.15;
 const clear=(spot)=>balloonLandingObservation(s,spot,runner)&&balloonExitClear(spot,ahead,a.radius);
 const gap=p=>Math.hypot(p.x-ahead.x,p.z-ahead.z);
 const startsClear=clear({...a,y:floor});
 let best=null,bestScore=gap(a)+(startsClear?0:18)+balloonExitPenalty(a,ahead,a.radius);
 const bearing=Math.atan2(ahead.x-a.x,ahead.z-a.z);
 for(const distance of [10,20,29])for(const angle of [0,-.5,.5,-1,1,-1.5,1.5]){
  const x=a.x+Math.sin(bearing+angle)*distance,z=a.z+Math.cos(bearing+angle)*distance;
  const y=worldHeight(x,z),spot={...a,x,y,z};
  if(Math.abs(y-floor)>.85||gap(spot)<minimumGap||
   Math.hypot(x-runner.x,z-runner.z)<minimumGap||
   !worldValid(spot,radius)||!worldTraversable(a,spot,radius)||
   !worldSight(a,{x,y:a.y,z},radius)||!clear(spot))continue;
  const score=gap(spot)+distance*.16+balloonExitPenalty(spot,ahead,a.radius);
  if(score+1<bestScore){best={x,z};bestScore=score;}
 }
 return best;
}

export function balloonDescentLead(hunter,runner){
 const height=Math.max(0,hunter.y-(runner.y??0));
 const seconds=Math.min(1.55,.45+height/18);
 const x=runner.vx*seconds,z=runner.vz*seconds;
 for(const fraction of [1,.6,.3]){
  const ahead={x:runner.x+x*fraction,z:runner.z+z*fraction};
  if(worldTraversable(runner,ahead,runner.radius-.05))return ahead;
 }
 return {x:runner.x,z:runner.z};
}

export function readableEscapeDive(runner,hunter,time,{movingOpening=false}={}){
 if(movingOpening){
  const aheadX=runner.x+(runner.vx??0)*.9-hunter.x,aheadZ=runner.z+(runner.vz??0)*.9-hunter.z;
  const facingX=Math.sin(hunter.yaw),facingZ=Math.cos(hunter.yaw);
  const along=aheadX*facingX+aheadZ*facingZ,side=Math.abs(aheadX*facingZ-aheadZ*facingX);
  if(along<3||along>28||side>7)return false;
 }
 if(hunter.role==='pursuit'||time>=105)return true;
 const dx=hunter.x-runner.x,dz=hunter.z-runner.z;
 const front=dx*Math.sin(runner.yaw)+dz*Math.cos(runner.yaw);
 return front>=Math.hypot(dx,dz)*.45;
}
