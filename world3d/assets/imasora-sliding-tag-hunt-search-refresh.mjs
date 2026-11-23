import{RUNNER_STARTS}from'./imasora-sliding-tag-hunt-random-starts.mjs';
import{WORLD,WORLD_CORNER_STAIRS,worldCornerIndex,worldCornerPathAllowed,worldHeight,worldRoute,worldSight,worldSteering,worldTraversable}from'./imasora-sliding-tag-hunt-world.mjs';
// Only public, traversable locations and teammates' assignments are used.
// There is deliberately no runner/target argument or read of hidden equipment.
export const SEARCH_PLACES=Object.freeze([
 ...RUNNER_STARTS.map(p=>({id:'area-'+p.id,x:p.x,y:p.y,z:p.z,edge:false})),
 ...WORLD_CORNER_STAIRS.map((c,i)=>{const x=c.x-c.sx*16,z=c.z-c.sz*16;return{id:'corner-'+i,x,y:worldHeight(x,z),z,edge:true};})
].map(Object.freeze));
export const SEARCH_REFRESH_SECONDS=36;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),offset={pursuit:0,intercept:7,patrol:14};
export function freshHuntSweep(a,{time,seed,coverage,team,groundOnly=false,activePatrol=false}){
 const m=a.brain,visits=coverage.placeVisits??={},avoid=m.searchAvoid??={};
 for(const key of Object.keys(avoid))if(avoid[key]<=time)delete avoid[key];
 // A visit is physical and requires a clear view at the correct height.
 // Walking below a high step must not mark its top as checked.
 for(const p of SEARCH_PLACES)if((!groundOnly||worldCornerIndex(p)<0)&&a.grounded&&Math.abs(a.y-p.y)<1.5&&distance(a,p)<14&&worldSight({...a,y:a.y+3},{...p,y:p.y+3}))visits[p.id]=time;
 let goal=m.freshSweep;
 if(goal&&(distance(a,goal)<10&&Math.abs(a.y-goal.y)<1.5&&a.grounded||m.stuck>=(activePatrol?2:3)||time>=goal.until)){
  if(distance(a,goal)<14&&Math.abs(a.y-goal.y)<1.5&&a.grounded)visits[goal.id]=time;
  else avoid[goal.id]=time+8;
  m.freshSweep=null;goal=null;
  if(activePatrol){m.sweep=null;m.target=null;m.next=0;}
 }
 if(!goal){
  if(activePatrol&&time<(m.nextSweepAt??0))return false;
  const reserved=team.filter(h=>h!==a&&!h.flight&&h.brain.freshSweep).map(h=>h.brain.freshSweep),speed=Math.max(8,20*(a.tuning?.speed??1)),n=SEARCH_PLACES.length,start=((seed>>>0)+(offset[a.role]??0))%n;let best=-Infinity;
  const options=[],outer=activePatrol&&rimDepth(a)<44;
  for(let i=0;i<n;i++){
   const p=SEARCH_PLACES[(start+i)%n];if(groundOnly&&worldCornerIndex(p)>=0||avoid[p.id]>time||visits[p.id]!==undefined&&time-visits[p.id]<8&&distance(a,p)<14||reserved.some(q=>q.id===p.id||distance(q,p)<28))continue;
   const age=visits[p.id]===undefined?SEARCH_REFRESH_SECONDS*2:Math.min(SEARCH_REFRESH_SECONDS*2,Math.max(0,time-visits[p.id])),travel=distance(a,p)/speed;
   const score=age*2-travel*3+(p.edge&&a.role==='patrol'?4:0)-i*.001;
   if(activePatrol){
    if(distance(a,p)>=14)options.push({point:p,score:score+(outer&&rimDepth(p)>=64?30:0)});
   }else if(score>best){best=score;goal=p;}
  }
  if(activePatrol){
   options.sort((a,b)=>b.score-a.score);
   for(const {point} of options){
    if(worldRoute(a,point,m.cornerAccess).length){goal=point;break;}
    avoid[point.id]=time+8;
   }
   if(!goal)m.nextSweepAt=time+.5;
  }
  if(!goal)return false;
  const travel=distance(a,goal)/speed;m.freshSweep={...goal,until:time+Math.min(50,Math.max(12,travel*2.5+10))};
  m.target={x:goal.x,y:goal.y,z:goal.z};m.sweep={...m.target};m.next=0;m.stuck=0;
 }
 // Preserve this destination through ordinary pathfinding, collisions, slopes,
 // acceleration and speed caps. No position correction or extra pathfinder.
 m.goalSince=time;return true;
}
export function huntRimDepth(p){return Math.min(WORLD.width/2-Math.abs(p.x),WORLD.depth/2-Math.abs(p.z));}
function rimDepth(p){return huntRimDepth(p);}
// At the rim a route can end at its nearest graph node, or a steering line
// can be blocked by the lip of a step. Recover via a local traversable line.
// Keep this goal separate from sightings; it never uses the runner's position.
export function huntRimRecovery(a,time,cornerAccess,visible){
 const m=a.brain;
 if(!a.grounded||a.dive||huntRimDepth(a)>52){m.rimProgress=null;return null;}
 const trace=m.rimProgress??={x:a.x,z:a.z,at:time};
 if(trace.goal){
  if(distance(a,trace.goal)>3&&time<trace.until){
   if(!visible||trace.visible||distance(a,trace)>1.5)return worldSteering(a,trace.goal,null);
  }
  m.rimProgress={x:a.x,z:a.z,at:time};m.next=0;m.path=null;
  return null;
 }
 if(distance(a,trace)>=1.25){Object.assign(trace,{x:a.x,z:a.z,at:time});return null;}
 if(time-trace.at<.9)return null;
 const {width,depth}=WORLD,nearSide=width/2-Math.abs(a.x)<depth/2-Math.abs(a.z);
 const yaw=nearSide?-Math.sign(a.x)*Math.PI/2:a.z<0?0:Math.PI;
 const padding=a.radius+.04;
 for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2])
  for(const length of [20,12,7]){
   const angle=yaw+offset,x=a.x+Math.sin(angle)*length,z=a.z+Math.cos(angle)*length,pt={x,z,y:worldHeight(x,z)};
   if(!worldTraversable(a,pt,padding)||!worldCornerPathAllowed(a,pt,cornerAccess))continue;
   Object.assign(trace,{goal:pt,until:time+2,visible});
   m.supply=null;m.freshSweep=null;m.sweep=null;m.target=null;m.stuck=0;m.path=null;m.next=0;m.closeChase=null;m.airPursuit=null;
   return worldSteering(a,pt,null);
  }
 trace.at=time-.6;m.next=0;m.path=null;
 return null;
}
