import{RUNNER_STARTS}from'./imasora-sliding-tag-hunt-random-starts.mjs';
import{WORLD_CORNER_STAIRS,worldHeight,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
// Only public, traversable locations and teammates' assignments are used.
// There is deliberately no runner/target argument or read of hidden equipment.
export const SEARCH_PLACES=Object.freeze([
 ...RUNNER_STARTS.map(p=>({id:'area-'+p.id,x:p.x,y:p.y,z:p.z,edge:false})),
 ...WORLD_CORNER_STAIRS.map((c,i)=>{const x=c.x-c.sx*16,z=c.z-c.sz*16;return{id:'corner-'+i,x,y:worldHeight(x,z),z,edge:true};})
].map(Object.freeze));
export const SEARCH_REFRESH_SECONDS=36;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),offset={pursuit:0,intercept:7,patrol:14};
export function freshHuntSweep(a,{time,seed,coverage,team}){
 const m=a.brain,visits=coverage.placeVisits??={},avoid=m.searchAvoid??={};
 for(const key of Object.keys(avoid))if(avoid[key]<=time)delete avoid[key];
 // A visit is physical and requires a clear view at the correct height.
 // Walking below a high step must not mark its top as checked.
 for(const p of SEARCH_PLACES)if(a.grounded&&Math.abs(a.y-p.y)<1.5&&distance(a,p)<14&&worldSight({...a,y:a.y+3},{...p,y:p.y+3}))visits[p.id]=time;
 let goal=m.freshSweep;
 if(goal&&(distance(a,goal)<10&&Math.abs(a.y-goal.y)<1.5&&a.grounded||m.stuck>=3||time>=goal.until)){
  if(distance(a,goal)<14&&Math.abs(a.y-goal.y)<1.5&&a.grounded)visits[goal.id]=time;
  else avoid[goal.id]=time+8;
  m.freshSweep=null;goal=null;
 }
 if(!goal){
  const reserved=team.filter(h=>h!==a&&!h.flight&&h.brain.freshSweep).map(h=>h.brain.freshSweep),speed=Math.max(8,20*(a.tuning?.speed??1)),n=SEARCH_PLACES.length,start=((seed>>>0)+(offset[a.role]??0))%n;let best=-Infinity;
  for(let i=0;i<n;i++){
   const p=SEARCH_PLACES[(start+i)%n];if(avoid[p.id]>time||visits[p.id]!==undefined&&time-visits[p.id]<8&&distance(a,p)<14||reserved.some(q=>q.id===p.id||distance(q,p)<28))continue;
   const age=visits[p.id]===undefined?SEARCH_REFRESH_SECONDS*2:Math.min(SEARCH_REFRESH_SECONDS*2,Math.max(0,time-visits[p.id])),travel=distance(a,p)/speed;
   const score=age*2-travel*3+(p.edge&&a.role==='patrol'?4:0)-i*.001;
   if(score>best){best=score;goal=p;}
  }
  if(!goal)return false;
  const travel=distance(a,goal)/speed;m.freshSweep={...goal,until:time+Math.min(50,Math.max(12,travel*2.5+10))};
  m.target={x:goal.x,y:goal.y,z:goal.z};m.sweep={...m.target};m.next=0;m.stuck=0;
 }
 // Preserve this destination through ordinary pathfinding, collisions, slopes,
 // acceleration and speed caps. No position correction or extra pathfinder.
 m.goalSince=time;return true;
}
