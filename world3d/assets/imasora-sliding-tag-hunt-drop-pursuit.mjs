import{BODY,worldHeight,worldSight,worldValid}from'./imasora-sliding-tag-hunt-world.mjs';

const RANGE=42,MIN_DROP=2.2;
function dropLane(hunter,target){
 const dx=target.x-hunter.x,dz=target.z-hunter.z,distance=Math.hypot(dx,dz);
 if(distance<2||distance>RANGE+8)return null;
 const x=dx/distance,z=dz/distance,top=hunter.y,radius=hunter.radius+.1;
 const at=d=>({x:hunter.x+x*d,z:hunter.z+z*d});
 let previous=top,edge=-1;
 const limit=Math.min(26,distance);
 for(let d=.75;d<=limit;d+=.75){
  const p=at(d),floor=worldHeight(p.x,p.z);
  // We can run off a lip, but must not skip a wall or an uphill step.
  if(floor>top+.45||floor>previous+.45)return null;
  if(previous-floor>=MIN_DROP){edge=d;break;}
  previous=floor;
 }
 if(edge<0)return null;
 const speed=BODY.dash*(hunter.tuning?.speed??1);
 const landing=at(edge+speed*Math.sqrt(2*Math.max(0,top-target.floor)/BODY.gravity));
 const lip=at(edge);
 if(!worldSight({...hunter,y:top+2.5},{...lip,y:top+2.5},radius))return null;
 // Sample the falling lane out past the lip. Use the same floor and body
 // clearance as movement; contact and the fall itself are still simulated.
 let airborne=true;
 const span=Math.hypot(landing.x-lip.x,landing.z-lip.z);
 for(let d=0;d<=span+.5;d+=.75){
  const p=at(edge+d),floor=worldHeight(p.x,p.z);
  const falling=top-BODY.gravity*(d/speed)**2/2;
  if(floor>top+.45||(d<1.5&&floor>top-1))return null;
  if(airborne&&falling<=floor)airborne=false;
  if(!worldValid({...p,y:airborne?falling:floor},radius))return null;
 }
 return {x,z,edge};
}

// Only a personally seen descent can start this shortcut. A moment of terrain
// occlusion can finish the committed run, but cannot redirect it to an unseen runner.
export function huntDropPursuit(s,hunter,runner,seen,{cancel=false}={}){
 const brain=hunter.brain;
 if(cancel||hunter.dive||(hunter.recoverUntil??0)>s.time){brain.dropPursuit=null;return null;}
 let plan=brain.dropPursuit;
 if(plan){
  if(!hunter.grounded)plan.airborne=true;
  if((plan.airborne&&hunter.grounded)||s.time>=plan.until){brain.dropPursuit=null;plan=null;}
  else return{x:plan.x,z:plan.z,dash:true,jump:false};
 }
 if(!seen||!hunter.grounded||runner.grounded||runner.vy>1.5||
    Math.hypot(runner.x-hunter.x,runner.z-hunter.z)>RANGE)return null;
 const floor=worldHeight(runner.x,runner.z),drop=hunter.y-floor;
 if(drop<MIN_DROP||runner.y<floor+.35||runner.y>hunter.y+4.5||s.time<(brain.nextDropCheck??0))return null;
 brain.nextDropCheck=s.time+.1;
 const lane=dropLane(hunter,{x:runner.x+runner.vx*.2,z:runner.z+runner.vz*.2,floor})??
   dropLane(hunter,{x:runner.x,z:runner.z,floor});
 if(!lane)return null;
 brain.dropPursuit={...lane,airborne:false,until:s.time+Math.min(2.3,.85+lane.edge/18+Math.sqrt(2*drop/BODY.gravity))};
 brain.supply=null;
 return {x:lane.x,z:lane.z,dash:true,jump:false};
}

