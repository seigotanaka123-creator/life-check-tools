import{BODY,HUNT_JUMP,WORLD_COURTYARD,worldHeight,worldSteering,worldTraversable}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntCanObserve}from'./imasora-sliding-tag-hunt-sight.mjs';
import{huntFanExposure,steerAroundHuntFans}from'./imasora-sliding-tag-hunt-fan.mjs';

const SCAN=.2,MEMORY=.45,REACTION=.24,DECIDE=.18;
const offsets=[0,.4,-.4,.8,-.8,1.2,-1.2,1.57,-1.57];
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Perception stores a short snapshot, not a live link to hidden gadgets. A
// visible machine can be avoided immediately; interpreting its wind takes time.
function observedFans(s,a,visible){
 const m=a.brain;
 if(s.time>=(m.windScanAt??0)){
  m.windScanAt=s.time+SCAN;const prior=m.windFans??[],seen=[];
  for(const g of s.gadgets){
   if(g.kind!=='fan'||g.until<=s.time||gap(a,g)>72||!visible(g))continue;
   const old=prior.find(p=>p.id===g.id);
   seen.push({id:g.id,kind:'fan',x:g.x,y:g.y,z:g.z,yaw:g.yaw,radius:g.radius,until:s.time+MEMORY,readyAt:old?.readyAt??s.time+REACTION});
  }
  for(const g of prior)if(g.until>s.time&&!seen.some(p=>p.id===g.id))seen.push(g);
  m.windFans=seen.slice(0,12);
 }
 return(m.windFans??[]).filter(g=>g.until>s.time);
}
function windRisk(s,a,dir,fans,input){
 const speed=Math.max(12,Math.min(BODY.dash*(a.tuning?.speed??1),Math.hypot(a.vx,a.vz)+10));let risk=0;
 for(const t of[.15,.5,1.1]){
  const x=a.x+(a.vx*.2+dir.x*speed*.8)*t,z=a.z+(a.vz*.2+dir.z*speed*.8)*t;
  const airborne=!a.grounded||input.jump,y=airborne?Math.max(worldHeight(x,z),a.y+(a.grounded?HUNT_JUMP.launch:a.vy)*t-BODY.gravity*t*t/2):worldHeight(x,z);
  const p={x,y,z,radius:a.radius};
  for(const g of fans){
   // A helpful tailwind is still real wind, not a blanket hazard immunity.
   const into=dir.x*Math.sin(g.yaw)+dir.z*Math.cos(g.yaw);
   if(into>.65)continue;
   risk+=huntFanExposure(p,g,s.time)*(1-into*.45);
  }
 }
 return risk;
}
const court=WORLD_COURTYARD;
const courtGates=[
 {x:court.x,z:court.z+court.halfD,dx:0,dz:1},
 {x:court.x,z:court.z-court.halfD,dx:0,dz:-1},
 {x:court.x+court.halfW-court.wall/2,z:court.z,dx:1,dz:0}
];
const insideCourt=p=>Math.abs(p.x-court.x)<court.halfW-court.wall/2&&Math.abs(p.z-court.z)<court.halfD;
function gatePoint(gate,offset){
 const x=gate.x+gate.dx*offset,z=gate.z+gate.dz*offset;
 return{x,z,y:worldHeight(x,z)};
}
function eastCourtCorner(dz){
 const x=court.x+court.halfW+12,z=court.z+dz*(court.halfD+12);
 return {x,z,y:worldHeight(x,z)};
}
function gateBlocked(s,a,gate,fans){
 return [-16,-8,0,8].some(offset=>{
  const point=gatePoint(gate,offset);
  return fans.some(fan=>gap(point,fan)<a.radius+fan.radius||
    huntFanExposure({...point,radius:a.radius},fan,s.time)>0);
 });
}
function safeSightRoute(s,a,seen,fans){
 const distance=gap(a,seen);
 if(distance>36||!worldTraversable(a,seen,a.radius+.2))return false;
 const steps=Math.max(1,Math.ceil(distance/4));
 for(let step=0;step<=steps;step++){
  const t=step/steps,x=a.x+(seen.x-a.x)*t,z=a.z+(seen.z-a.z)*t;
  const point={x,z,y:worldHeight(x,z),radius:a.radius};
  if(fans.some(fan=>gap(point,fan)<a.radius+fan.radius||huntFanExposure(point,fan,s.time)>0))return false;
 }
 return true;
}
function courtyardDetour(s,a,input,fans,interruptOnSight,shareGates){
 const m=a.brain,seen=m.seen;
 let plan=m.courtyardWind;
 if(!seen||insideCourt(seen)||plan?.until<=s.time){
  m.courtyardWind=null;
  return null;
 }
 if(plan&&interruptOnSight&&m.visible&&s.time-m.seenAt<.7&&s.time>=(plan.reviewAt??0)){
  plan.reviewAt=s.time+.25;
  if(safeSightRoute(s,a,seen,fans)){
   m.courtyardWind=null;
   m.next=0;
   return null;
  }
 }
 if(!plan){
  if(!insideCourt(a)||!fans.length||s.time-(m.seenAt??-Infinity)>8||s.time<(m.courtyardWindAt??0))return null;
  m.courtyardWindAt=s.time+.35;
  const closest=courtGates.reduce((best,g)=>gap(gatePoint(g,12),seen)<gap(gatePoint(best,12),seen)?g:best);
  if(!gateBlocked(s,a,closest,fans))return null;
  // Keep the pursuer on its shortest route. The others favor a visible
  // teammate's unused exit only when the extra distance is small.
  const reserved=shareGates&&a.role!=='pursuit'?(s.hunters??[]).filter(other=>{
   const route=other.brain.courtyardWind;
   return other!==a&&route?.until>s.time&&route.at<2&&huntCanObserve(s,a,other,60);
  }).map(other=>other.brain.courtyardWind.gate):[];
  const alternatives=[];
  for(const gate of courtGates){
   if(gate===closest||gateBlocked(s,a,gate,fans))continue;
   // Carry the detour past the outside corner. Immediately handing control
   // back at the arch can make the normal route return through the same gate.
   const path=[gatePoint(gate,-12),gatePoint(gate,12),eastCourtCorner(gate.dz||closest.dz)];
   if(gate.dz&&closest.dz)path.push(eastCourtCorner(closest.dz));
   if(!path.every((point,i)=>worldTraversable(path[i-1]??a,point,a.radius+.2)))continue;
   const score=path.reduce((total,p,i)=>total+gap(path[i-1]??a,p),0)+gap(path.at(-1),seen);
   alternatives.push({gate,path,score:score+(reserved.includes(gate)?22:0)});
  }
  const alternative=alternatives.sort((p,q)=>p.score-q.score)[0];
  if(!alternative)return null;
  plan=m.courtyardWind={gate:alternative.gate,path:alternative.path,at:0,until:s.time+10};
 }
 if(gap(a,plan.path[plan.at])<2.8)plan.at++;
 if(plan.at===plan.path.length){
  m.courtyardWind=null;
  return null;
 }
 const steering=worldSteering(a,plan.path[plan.at],plan.path[plan.at+1],{sprint:input.dash,room:5});
 return{...input,...steering};
}

// Use known courtyard exits before trying local directions near a fan.
export function steerClearOfHuntWind(s,a,input,{visible=g=>huntCanObserve(s,a,g,72),courtyard=false,interruptOnSight=false,shareGates=false}={}){
 const length=Math.hypot(input.x??0,input.z??0);if(length<.1)return input;
 const m=a.brain,fans=observedFans(s,a,visible);
 if(courtyard&&(m.courtyardWind||fans.length)){
  const detour=courtyardDetour(s,a,input,fans.filter(g=>g.readyAt<=s.time),interruptOnSight,shareGates);
  if(detour)return detour;
 }
 if(!fans.length){m.windChoice=null;return input;}
 const desired={x:input.x/length,z:input.z/length},ready=fans.filter(g=>g.readyAt<=s.time);
 let result=input;
 if(ready.length&&windRisk(s,a,desired,ready,input)>.12){
  // A failed search is a cached decision too. Sudden new goals discard the
  // old steering but wait for the same bounded review, rather than retrying
  // all nine corridors on every physics tick in a tight corner.
  if(m.windGoal&&desired.x*m.windGoal.x+desired.z*m.windGoal.z<.7)m.windChoice=null;
  if(!m.windGoal||s.time>=(m.windDecideAt??0)){
   m.windDecideAt=s.time+DECIDE;m.windGoal=desired;let best=null,score=Infinity;
   let fan=ready[0],strongest=-Infinity;for(const g of ready){const risk=windRisk(s,a,desired,[g],input);if(risk>strongest){strongest=risk;fan=g;}}
   const sidePosition=(a.x-fan.x)*Math.cos(fan.yaw)-(a.z-fan.z)*Math.sin(fan.yaw),across=desired.x*Math.cos(fan.yaw)-desired.z*Math.sin(fan.yaw);
   if(!m.windBypass||m.windBypass.id!==fan.id||m.windBypass.until<s.time)m.windBypass={id:fan.id,side:Math.abs(across)>.4?Math.sign(across):Math.abs(sidePosition)>1?Math.sign(sidePosition):a.owner==='hunter-1'?1:-1,until:s.time+2};
   m.windBypass.until=s.time+2;
   for(const angle of offsets){
    const c=Math.cos(angle),v=Math.sin(angle),dir={x:desired.x*c+desired.z*v,z:desired.z*c-desired.x*v};
    const point={x:a.x+dir.x*26,z:a.z+dir.z*26};if(!worldTraversable(a,point,a.radius+.2))continue;
    const prior=m.windChoice?dir.x*m.windChoice.x+dir.z*m.windChoice.z:0;
    const lateral=(dir.x*Math.cos(fan.yaw)-dir.z*Math.sin(fan.yaw))*m.windBypass.side;
    const cost=windRisk(s,a,dir,ready,input)*18+(1-Math.cos(angle))*3-prior*.8+Math.max(0,-lateral)*6-lateral*2;
    if(cost<score){score=cost;best=dir;}
   }
   m.windChoice=best;
  }
  if(m.windChoice)result={...input,x:m.windChoice.x*length,z:m.windChoice.z*length};
 }else m.windChoice=null;
 return steerAroundHuntFans({time:s.time,gadgets:fans},a,result);
}
