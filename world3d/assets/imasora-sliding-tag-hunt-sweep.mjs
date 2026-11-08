import{freshHuntSweep}from'./imasora-sliding-tag-hunt-search-refresh.mjs';
import{HUNTER_STARTS}from'./imasora-sliding-tag-hunt-random-starts.mjs';
import{WORLD_CORNER_STAIRS,worldHeight}from'./imasora-sliding-tag-hunt-world.mjs';
// Public, already traversable map locations. No current target position, item,
// or unseen observation enters this broad search. Each stride covers all 20.
const patterns={pursuit:{offset:0,stride:7},intercept:{offset:7,stride:9},patrol:{offset:14,stride:11}};
const cornerChecks=WORLD_CORNER_STAIRS.map(corner=>{
 const x=corner.x-corner.sx*16,z=corner.z-corner.sz*16;
 return{x,y:worldHeight(x,z),z};
});
function setSweepDestination(memory,point){
 memory.sweep={...point};memory.target={...point};memory.next=0;memory.stuck=0;
}
function sweepCorner(a,time,coverage,team){
 const m=a.brain;
 if(m.cornerIndex!==undefined){
  if(a.grounded&&Math.abs(a.y-m.sweep.y)<1.5&&Math.hypot(a.x-m.sweep.x,a.z-m.sweep.z)<10){
   coverage.visited|=1<<m.cornerIndex;
  }else if(m.stuck<3)return true;
  else m.cornerRetryAt=time+8;
  delete m.cornerIndex;
  m.sweep=null;
 }
 if(coverage.visited===(1<<cornerChecks.length)-1||time<(m.cornerRetryAt??0))return false;
 let nearest=Infinity,index=-1;
 for(const [i,point] of cornerChecks.entries()){
  if((coverage.visited&(1<<i))||team.some(h=>h!==a&&!h.flight&&h.brain.cornerIndex===i))continue;
  const distance=Math.hypot(a.x-point.x,a.z-point.z);
  if(distance<nearest){nearest=distance;index=i;}
 }
 if(index<0)return false;
 m.cornerIndex=index;
 setSweepDestination(m,cornerChecks[index]);
 return true;
}
export function huntSweepControl(a,{time,seed,visible=false,coverage,team,refresh=false}){
 const m=a.brain;
 if(visible||m.seen&&time-(m.seenAt??-Infinity)<18){
  if(refresh){m.freshSweep=null;m.sweep=null;}
  if(coverage&&m.cornerIndex!==undefined){delete m.cornerIndex;m.sweep=null;}
  return false;
 }
 if(refresh&&coverage)return freshHuntSweep(a,{time,seed,coverage,team});
 if(coverage&&time>=45&&sweepCorner(a,time,coverage,team)){
  m.goalSince=time;
  return true;
 }
 if(!m.sweep||Math.hypot(a.x-m.sweep.x,a.z-m.sweep.z)<10||m.stuck>=3){
  const p=patterns[a.role]??patterns.pursuit,n=HUNTER_STARTS.length;
  m.sweepIndex=((m.sweepIndex??((seed>>>0)+p.offset)%n)+p.stride)%n;
  const point=HUNTER_STARTS[m.sweepIndex];m.sweep={x:point.x,y:point.y,z:point.z};m.target={...m.sweep};m.next=0;m.stuck=0;
 }
 // Keep this public destination until reached; worldPilot still chooses the
 // route, steering and normal collision. Expired sightings return here too.
 m.goalSince=time;return true;
}
