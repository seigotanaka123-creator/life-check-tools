import{huntPermanentToolUseful}from'./imasora-sliding-tag-hunt-sight.mjs';
import{PLAYER_ITEMS,HUNTER_ITEMS,HOOK_POLES,EXTRA_BALLOON_COUNT}from'./imasora-sliding-tag-hunt-items.mjs';
import{WORLD_STARTS,HUNT_JUMP,HUNT_CHARACTER_HEIGHT,worldHeight,worldValid,worldSight,worldTraversable}from'./imasora-sliding-tag-hunt-world.mjs';

// Both factions have a radar, alongside the existing props, spread over the world instead of a ring at the start.
// Static geometry work is shared between rounds, never repeated every frame.
// Above a short first jump; ordinary repeated presses or a held jump can
// touch the tool. Collection depends on that contact, not a jump counter.
export const PICKUP_LIFT=HUNT_CHARACTER_HEIGHT+HUNT_JUMP.launch**2/(2*HUNT_JUMP.gravity)+.3;
export const SUPPLY_ZONES=Object.freeze([...Array.from({length:20},(_,i)=>({id:'cell-'+i,x:-256+(i%5)*128,z:-180+Math.floor(i/5)*120})),{id:'cell-20',x:-192,z:0},{id:'cell-21',x:192,z:120}].map(p=>Object.freeze({...p,y:worldHeight(p.x,p.z)})));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),padding=6.2,cache=new Map();
const shuffle=(items,random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function candidates(zone){
 if(cache.has(zone.id))return cache.get(zone.id);
 const points=[];
 for(let dz=-48;dz<=48;dz+=16)for(let dx=-48;dx<=48;dx+=16){
  const p={x:zone.x+dx,z:zone.z+dz};p.y=worldHeight(p.x,p.z);
  if(!worldValid(p,padding)||WORLD_STARTS.some(s=>distance(p,{x:s.escape.player[0],z:s.escape.player[1]})<55)||!worldValid({...p,y:p.y+PICKUP_LIFT},padding))continue;
  const hook=HOOK_POLES.some(h=>{const d=distance(p,h);return d>6&&d<30&&worldSight({...p,y:p.y+3},{...h,y:worldHeight(h.x,h.z)+4});});
  points.push(Object.freeze({...p,hook,}));
 }
 const result=Object.freeze(points);cache.set(zone.id,result);return result;
}
export function createHuntSupplies(random,actors=[]){
 const result=[],zones=shuffle(SUPPLY_ZONES,random),hookZone=zones.find(z=>candidates(z).some(p=>p.hook&&actors.every(a=>distance(a,p)>a.radius+12))),types=shuffle([...PLAYER_ITEMS.map(type=>({type,audience:'player'})),...HUNTER_ITEMS.map(type=>({type,audience:'hunters'}))].filter(p=>p.type!=='hook'&&p.type!=='mirror'),random);
 types.push({type:'mirror',audience:'player'});
 if(!hookZone)throw Error('NO_HOOK_SUPPLY_CELL');
 for(const [index,zone]of[hookZone,...zones.filter(z=>z!==hookZone)].slice(0,types.length+1).entries()){
  const {type,audience}=index===0?{type:'hook',audience:'player'}:types[index-1];
  const options=candidates(zone).filter(p=>(type!=='hook'||p.hook)&&actors.every(a=>distance(a,p)>a.radius+12)&&result.every(a=>distance(a,p)>48));
  const ranked=options.map(p=>({p,score:random()*18+Math.min(120,...result.map(a=>distance(a,p)))*.5})).sort((a,b)=>b.score-a.score);
  if(!ranked.length)throw Error('NO_SAFE_SUPPLY_'+zone.id+'_'+type);
  const {x,y,z}=ranked[0].p;result.push({x,y,z,lift:audience==='player'?PICKUP_LIFT:0,bobPhase:index,home:{x,y,z},region:zone.id,id:'pickup-'+result.length,type,audience,readyAt:0,pull:null});
 }
 return result;
}


// Add coverage to regions without a pickup after the ordinary layout and
// opening tool have been placed. The original layout and its RNG are retained.
export function addHuntBalloonSupplies(pickups, actors) {
 const occupied = new Set(pickups.map(p => p.region));
 for (let added = 0; added < EXTRA_BALLOON_COUNT; added++) {
  const balloons = pickups.filter(p => p.type === 'balloon');
  let best = null;
  let bestScore = -Infinity;
  for (const zone of SUPPLY_ZONES) {
   if (occupied.has(zone.id)) continue;
   for (const point of candidates(zone)) {
    if (actors.some(a => distance(a, point) <= a.radius + 12)) continue;
    const nearest = Math.min(...pickups.map(p => distance(p, point)));
    if (nearest <= 48) continue;
    const nearestBalloon = Math.min(...balloons.map(p => distance(p, point)));
    // Cover a different area without pushing the new tools to the map corners.
    const score = Math.min(160, nearestBalloon) + Math.min(90, nearest) * .25 -
      Math.hypot(point.x, point.z) * .1;
    if (score > bestScore) {
     best = {point, region:zone.id};
     bestScore = score;
    }
   }
  }
  if (!best) throw Error('NO_SAFE_EXTRA_BALLOON');
  const {x, y, z} = best.point;
  const index = pickups.length;
  pickups.push({
   x, y, z, home:{x, y, z}, region:best.region, id:'pickup-' + index,
   type:'balloon', audience:'hunters', lift:0, bobPhase:index, readyAt:0, pull:null
  });
  occupied.add(best.region);
 }
}

const approachDistances=[44,36,52,28,60,68];
const approachAngles=[0,Math.PI/12,-Math.PI/12,Math.PI/6,-Math.PI/6];
function onOpeningApproach(hunter,pickup){
 const dx=pickup.x-hunter.x,dz=pickup.z-hunter.z;
 const forward=dx*Math.sin(hunter.yaw)+dz*Math.cos(hunter.yaw);
 return forward>=Math.hypot(dx,dz)*Math.cos(Math.PI/6)-.01&&
  worldTraversable(hunter,pickup,hunter.radius+.25)&&
  worldSight({...hunter,y:hunter.y+4},{...pickup,y:pickup.y+3.5});
}

// Keep one regular ground tool within reach of the opening route. Do not
// change the assortment or consume any extra random numbers for the match.
export function placeHuntOpeningSupply(pickups,hunter,actors){
 const groundTools=pickups.filter(p=>p.audience==='hunters');
 if(groundTools.some(p=>distance(hunter,p)<=65&&onOpeningApproach(hunter,p)))return;
 groundTools.sort((a,b)=>distance(hunter,a)-distance(hunter,b));
 for(const angle of approachAngles){
  const yaw=hunter.yaw+angle;
  for(const gap of approachDistances){
   const x=hunter.x+Math.sin(yaw)*gap,z=hunter.z+Math.cos(yaw)*gap;
   const point={x,y:worldHeight(x,z),z};
   if(!worldValid(point,padding)||!onOpeningApproach(hunter,point))continue;
   if(actors.some(a=>distance(a,point)<(a.owner==='player'?55:a.radius+12)))continue;
   const neighbors=pickups.filter(p=>distance(p,point)<=48);
   if(neighbors.length>1)continue;
   const tool=neighbors[0]??groundTools[0];
   if(tool?.audience!=='hunters')continue;
   Object.assign(tool,point,{home:point,region:'opening-approach'});
   return;
  }
 }
}

const preferences={pursuit:{scarf:5,ink:4,sunglasses:4,radar:4},intercept:{balloon:5,sunglasses:4},patrol:{sunglasses:5,ink:3,radar:4}};
// A short, visible detour on the existing route; never replace a role's goal
// with an item across the map, infer a hidden player, or run an extra pathfinder.
export function huntSupplySteering(s,a,control,{playerVisible=false,itemVisible=p=>worldSight({...a,y:a.y+3},{...p,y:p.y+1.8})}={}){
 const m=a.brain;if(a.item||a.pendingItem||a.flight||!a.grounded&&!m.supply){m.supply=null;return control;}
 if(playerVisible&&distance(a,s.player)<18){m.supply=null;return control;}
 const goal=m.path?.[m.at],gx=goal?goal.x-a.x:0,gz=goal?goal.z-a.z:0,length=Math.hypot(gx,gz);
 const prior=m.supply;if(prior&&s.time<prior.nextCheck){
  const p=s.pickups.find(p=>p.id===prior.id);
  const d=p?distance(a,p):Infinity;
  if(p&&huntPermanentToolUseful(s,a,p.type)&&!p.pull&&p.readyAt<=s.time&&d<24&&(p.lift||Math.abs(p.y-a.y)<3)&&onRoute(a,p,goal,d,gx,gz,length)&&itemVisible(p))return steer(a,p,control,s.time);
 }
 m.supply=null;
 if(s.time<(m.supplyScanAt??0))return control;m.supplyScanAt=s.time+.3;
 if(!goal)return control;
 if(length<4)return control;
 let best=null,bestScore=-Infinity;
 for(const p of s.pickups){
  const d=distance(a,p);if(!huntPermanentToolUseful(s,a,p.type)||p.audience!==(a.owner==='player'?'player':'hunters')||p.readyAt>s.time||p.pull||d>24||!p.lift&&Math.abs(p.y-a.y)>3)continue;
  if(s.hunters.some(h=>h!==a&&h.brain.supply?.id===p.id&&h.brain.supply.nextCheck>s.time))continue;
  if(!onRoute(a,p,goal,d,gx,gz,length))continue;
  if(p.type==='guard'&&!s.gadgets.some(g=>['cushion','fan'].includes(g.kind)&&distance(a,g)<(g.kind==='fan'?60:28)&&worldSight({...a,y:a.y+3},{...g,y:g.y+2}))&&!(playerVisible&&['sticky','cushion'].includes(s.player.item)))continue;
  if(!itemVisible(p)||!worldTraversable(a,p,a.radius+.2))continue;
  const score=(preferences[a.role]?.[p.type]??1)*2-d*.3+(prior?.id===p.id?3:0);
  if(score>bestScore){best=p;bestScore=score;}
 }
 if(!best)return control;m.supply={id:best.id,nextCheck:s.time+.3};return steer(a,best,control,s.time);
}
// Reuse the same forward cone and travel budget even when a waypoint changes.
// Validity depends on today's route, not the identity of an old route node.
function onRoute(a,p,goal,d,gx,gz,length){return!!goal&&length>=4&&((p.x-a.x)*gx+(p.z-a.z)*gz)/(d*length)>=.4&&d+distance(p,goal)-length<=10;}
function steer(a,p,control,time){const d=distance(a,p);if(!p.lift)return{...control,x:(p.x-a.x)/(d||1),z:(p.z-a.z)/(d||1)};
 const out={...control,dash:false,x:Math.max(-1,Math.min(1,(p.x-a.x)*.35-a.vx*.45)),z:Math.max(-1,Math.min(1,(p.z-a.z)*.35-a.vz*.45))};
 if(d<a.radius+5){if(a.grounded){a.brain.supplyJumpAt=time+.24;out.jump=true;}else if(a.jumps===1&&time>=a.brain.supplyJumpAt)out.jump=!a.jumpHeld;else out.jump=a.vy>0;}return out;
}
