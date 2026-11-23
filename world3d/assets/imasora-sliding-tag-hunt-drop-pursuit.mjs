import{BODY,STEP,worldHeight,worldMove,worldSight,worldTraversable,worldValid}from'./imasora-sliding-tag-hunt-world.mjs';

const RANGE=42,MIN_DROP=2.2,MIN_FOLLOW_DROP=.65;
function dropLane(hunter,target,{minDrop=MIN_DROP,reach=26}={}){
 const dx=target.x-hunter.x,dz=target.z-hunter.z,distance=Math.hypot(dx,dz);
 if(distance<2||distance>RANGE+8)return null;
 const x=dx/distance,z=dz/distance,top=hunter.y,radius=hunter.radius+.1;
 const at=d=>({x:hunter.x+x*d,z:hunter.z+z*d});
 let previous=top,edge=-1;
 const limit=Math.min(reach,distance);
 for(let d=.75;d<=limit;d+=.75){
  const p=at(d),floor=worldHeight(p.x,p.z);
  // We can run off a lip, but must not skip a wall or an uphill step.
  if(floor>top+.45||floor>previous+.45)return null;
  if(previous-floor>=minDrop){edge=d;break;}
  previous=floor;
 }
 if(edge<0)return null;
 const speed=BODY.dash*(hunter.dashScale??1)*(hunter.tuning?.speed??1);
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
  if(floor>top+.45||(d<1.5&&floor>top-Math.min(1,minDrop)))return null;
  if(airborne&&falling<=floor)airborne=false;
  if(!worldValid({...p,y:airborne?falling:floor},radius))return null;
 }
 return {x,z,edge};
}

const LEDGE_ANGLES=[0,15,-15,30,-30,45,-45,60,-60,75,-75,90,-90];
function findLedge(hunter,x,z,reach){
 const top=worldHeight(hunter.x,hunter.z);
 let previous=top;
 for(let d=.25;d<=reach;d+=.25){
  const floor=worldHeight(hunter.x+x*d,hunter.z+z*d);
  if(floor>previous+.6)return null;
  if(previous-floor>=MIN_FOLLOW_DROP)return {x,z,edge:d,fall:previous-floor,rampLoss:Math.max(0,top-previous)};
  previous=floor;
 }
 return null;
}

// Check the same body motion used by the match, including momentum at the rim.
function previewDrop(hunter,lane,speed,dashDelay){
 const probe={...hunter};
 const limit=.6+dashDelay+lane.edge/speed+Math.sqrt(2*(hunter.y+6)/BODY.gravity);
 let off=false;
 for(let t=STEP;t<=limit;t+=STEP){
  worldMove(probe,{x:lane.x,z:lane.z,dash:t>=dashDelay},STEP);
  if(!off&&!probe.grounded){
   const dx=probe.x-hunter.x,dz=probe.z-hunter.z;
   const across=Math.abs(dx*lane.z-dz*lane.x);
   if(across>hunter.radius||dx*lane.x+dz*lane.z<lane.edge-.75)return null;
   off=true;
  }
  if(off&&probe.grounded){
   const progress=(probe.x-hunter.x)*lane.x+(probe.z-hunter.z)*lane.z;
   if(progress<lane.edge-.75||probe.y>hunter.y-MIN_FOLLOW_DROP)return null;
   return {x:probe.x,y:probe.y,z:probe.z,time:t};
  }
 }
 return null;
}

function directDropLane(hunter,target,time){
 const dx=target.x-hunter.x,dz=target.z-hunter.z,distance=Math.hypot(dx,dz);
 if(distance<1e-6)return null;
 const yaw=Math.atan2(dx,dz),speed=BODY.dash*(hunter.dashScale??1)*(hunter.tuning?.speed??1);
 const dashDelay=Math.max(0,(hunter.recoverUntil??0)-time);
 // A straight bearing can stay on a ramp for its full length. Also look
 // sideways for a nearby rim, and compare the route all the way to the runner.
 const lanes=LEDGE_ANGLES.flatMap(angle=>{
  const heading=yaw+angle*Math.PI/180;
  const lane=findLedge(hunter,Math.sin(heading),Math.cos(heading),Math.min(RANGE,distance+4));
  if(!lane)return [];
  const travel=lane.edge+speed*Math.sqrt(2*lane.fall/BODY.gravity);
  const remaining=Math.hypot(dx-lane.x*travel,dz-lane.z*travel);
  return [{...lane,angle,cost:(travel+remaining)/speed+Math.abs(angle)*.005+lane.rampLoss/speed}];
 }).sort((a,b)=>a.cost-b.cost||a.edge-b.edge);
 let best=null,bestCost=Infinity;
 const padding=hunter.radius-.05;
 for(const lane of lanes){
  // The runner is already below us. A rim beyond them would overshoot them.
  if(lane.edge>distance+2)continue;
  if(lane.angle!==0&&distance/speed+Math.abs(lane.angle)*.005>=bestCost)continue;
  const landing=previewDrop(hunter,lane,speed,dashDelay);
  if(!landing)continue;
  const gap=Math.hypot(target.x-landing.x,target.z-landing.z);
  if(gap>distance&&lane.angle!==0)continue;
  if(!worldTraversable(landing,target,padding)){
   // Landing on another tread is useful when it continues down toward the runner.
   const x=(target.x-landing.x)/(gap||1),z=(target.z-landing.z)/(gap||1);
   if(!findLedge(landing,x,z,Math.min(gap,12)))continue;
  }
  const plan={x:lane.x,z:lane.z,edge:lane.edge,duration:landing.time};
  if(lane.angle===0&&lane.rampLoss<MIN_FOLLOW_DROP&&gap<distance)return plan;
  const cost=landing.time+gap/speed+Math.abs(lane.angle)*.005+lane.rampLoss/speed;
  if(cost<bestCost){bestCost=cost;best=plan;}
 }
 return best;
}

function rememberRunner(brain,runner,time){
 brain.seen={x:runner.x,y:runner.y,z:runner.z,vx:runner.vx,vz:runner.vz};
 brain.seenAt=time;
 brain.searchPlan=null;
 brain.searchIndex=0;
}

// Use a recent sighting when the lip briefly hides the runner.
function dropTarget(hunter,time,point){
 if(!point)return null;
 const age=time-point.at;
 if(age>1.25)return null;
 if(worldHeight(point.x,point.z)<hunter.y-MIN_FOLLOW_DROP)return point;
 // Only extrapolate the short observed run over the lip.
 const lead=Math.min(.55,age+.15);
 const x=point.x+point.vx*lead,z=point.z+point.vz*lead;
 if(worldHeight(x,z)>=hunter.y-MIN_FOLLOW_DROP)return null;
 return {...point,x,z};
}
export function huntDropPursuit(s,hunter,runner,seen,{cancel=false,followLedges=false,rememberLedges=false,teamContact=null,directLedges=false}={}){
 const brain=hunter.brain;
 if(cancel){
  brain.dropPursuit=null;
  if(rememberLedges)brain.dropSighting=null;
  return null;
 }
 if(rememberLedges&&seen)brain.dropSighting={x:runner.x,y:runner.y,z:runner.z,vx:runner.vx,vz:runner.vz,vy:runner.vy,grounded:runner.grounded,at:s.time};
 if(hunter.dive||(!directLedges&&(hunter.recoverUntil??0)>s.time)||(directLedges&&hunter.externalForce)){brain.dropPursuit=null;return null;}
 const plan=brain.dropPursuit;
 const dash=!directLedges||(hunter.recoverUntil??0)<=s.time;
 if(plan){
  if(!hunter.grounded)plan.airborne=true;
  const landed=plan.airborne&&hunter.grounded;
  const changedDirection=directLedges&&seen&&!plan.airborne&&
    (runner.x-hunter.x)*plan.x+(runner.z-hunter.z)*plan.z<0;
  if(landed||changedDirection||(s.time>=plan.until&&(!directLedges||!plan.airborne))){
   brain.dropPursuit=null;
   if(followLedges){brain.next=s.time;brain.closeChase=null;}
   if(directLedges){brain.airPursuit=null;brain.nextDropCheck=s.time;}
  }else{
   if(followLedges&&seen)rememberRunner(brain,runner,s.time);
   return{x:plan.x,z:plan.z,dash,jump:false};
  }
 }
 let sighting=rememberLedges?brain.dropSighting:null;
 if(rememberLedges&&!seen&&teamContact&&(teamContact.at>(sighting?.at??-Infinity))){
  sighting={...teamContact.point,at:teamContact.at};
 }
 const target=seen?runner:dropTarget(hunter,s.time,sighting);
 if(!target||!hunter.grounded||(!followLedges&&target.grounded)||(!directLedges&&target.vy>1.5)||
    ((!directLedges||!seen)&&Math.hypot(target.x-hunter.x,target.z-hunter.z)>RANGE))return null;
 const floor=worldHeight(target.x,target.z),drop=hunter.y-floor;
 if(drop<(followLedges?MIN_FOLLOW_DROP:MIN_DROP)||(!followLedges&&target.y<floor+.35)||
    target.y>hunter.y+4.5||s.time<(brain.nextDropCheck??0))return null;
 brain.nextDropCheck=s.time+(directLedges?.2:.1);
 const laneOptions=followLedges?{minDrop:MIN_FOLLOW_DROP,reach:RANGE}:undefined;
 // An unseen target must keep the previously observed direction.
 const lane=directLedges?directDropLane(hunter,target,s.time):
   (seen?dropLane(hunter,{x:target.x+target.vx*.2,z:target.z+target.vz*.2,floor},laneOptions):null)??
   dropLane(hunter,{x:target.x,z:target.z,floor},laneOptions);
 if(!lane)return null;
 const fallTime=Math.sqrt(2*drop/BODY.gravity);
 const dashSpeed=BODY.dash*(hunter.dashScale??1)*(hunter.tuning?.speed??1);
 const limit=directLedges?lane.duration+.5:followLedges?.85+lane.edge/dashSpeed+fallTime:Math.min(2.3,.85+lane.edge/18+fallTime);
 brain.dropPursuit={...lane,airborne:false,until:s.time+limit};
 brain.supply=null;
 if(followLedges){
  if(seen)rememberRunner(brain,runner,s.time);
  else if(sighting.at>=(brain.seenAt??-Infinity))rememberRunner(brain,sighting,sighting.at);
 }
 return {x:lane.x,z:lane.z,dash,jump:false};
}

