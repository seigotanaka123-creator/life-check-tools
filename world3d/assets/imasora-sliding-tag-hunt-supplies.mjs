import{huntPermanentToolUseful}from'./imasora-sliding-tag-hunt-sight.mjs';
import{PLAYER_ITEMS,HUNTER_ITEMS,HOOK_POLES}from'./imasora-sliding-tag-hunt-items.mjs';
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
