// Experimental simulation for the accepted multi-hunter redesign.
// The normal trial uses this simulation; formal growth/rewards remain disabled.
import{STEP,BODY,HUNT_JUMP,WORLD,WORLD_STARTS,WORLD_RADII,TAG_CHARACTERS,actor,opponentSpec,worldHeight,worldValid,worldSight,worldTraversable,worldMove,worldPilot}from'./imasora-sliding-tag-hunt-world.mjs';
import{ITEM_TYPES,PLAYER_ITEMS,HUNTER_ITEMS,HOOK_POLES}from'./imasora-sliding-tag-hunt-items.mjs';
export{STEP,HUNT_JUMP,ITEM_TYPES,PLAYER_ITEMS,HUNTER_ITEMS};
export const HUNT_RULES='tag-role-balance-v4';
export const HUNTER_COUNT=3;
export const HUNTER_ROLES=Object.freeze(['pursuit','intercept','patrol']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),raised=a=>({...a,y:a.y+3});
const byId=new Map(TAG_CHARACTERS.map(c=>[c.id,c]));
const visible=(a,b,range=140)=>near(a,b)<range&&worldSight(raised(a),raised(b));
const alive=(s,a,key)=>(a.effects[key]??0)>s.time;
function body(x,z,id,radius){const spec=opponentSpec(id),a=Object.assign(actor(x,z),{y:worldHeight(x,z),id,radius,baseTuning:{accel:1,speed:1,turn:1,brake:1,...spec?.movement},effects:{},item:null,flight:null,nextHop:0});a.tuning={...a.baseTuning};return a;}
function random(s){s.randomState=(Math.imul(s.randomState,1664525)+1013904223)>>>0;return s.randomState/4294967296;}
function spawnNear(player,desired,radius,others){
 const candidates=[];for(let z=-224;z<=224;z+=8)for(let x=-304;x<=304;x+=8){const p={x,z,y:worldHeight(x,z)},distance=near(p,player);if(distance<38||distance>125||!worldValid(p,radius+.2)||others.some(a=>near(a,p)<18))continue;candidates.push({p,score:near(p,desired)});}
 candidates.sort((a,b)=>a.score-b.score);if(!candidates.length)throw Error('NO_SAFE_SPAWN');return candidates[0].p;
}
export function createHunt({hunterCount=HUNTER_COUNT,opponents,startKey='boulevard',seed=12031,duration=90,playerItem='speed',playerRadius=2.7}={}){
 if(hunterCount!==HUNTER_COUNT||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||duration!==90)throw Error('INVALID_HUNT_CONFIG');
 if(!PLAYER_ITEMS.includes(playerItem)||!Number.isFinite(playerRadius)||playerRadius<2||playerRadius>6)throw Error('INVALID_PLAYER_CONFIG');
 const area=WORLD_STARTS.find(x=>x.id===startKey);if(!area)throw Error('INVALID_START');
 const defaults=['walkBrave','rioSaber','walkCute'].map(p=>TAG_CHARACTERS.find(c=>c.profileKey===p).id),ids=opponents??defaults.slice(0,hunterCount);
 if(!Array.isArray(ids)||ids.length!==hunterCount||ids.some(id=>!byId.has(id)))throw Error('INVALID_OPPONENTS');
 const player=body(...area.escape.player,'player',playerRadius),s={rules:HUNT_RULES,config:{hunterCount,opponents:[...ids],startKey,seed,duration,playerItem,playerRadius},time:0,countdown:2,phase:'countdown',duration,randomState:seed,player,hunters:[],pickups:[],pools:[],footprints:[],gadgets:[],events:[],nextId:1,result:null,useHeld:false};
 const base={x:area.escape.cpu[0],z:area.escape.cpu[1]},dx=base.x-player.x,dz=base.z-player.z;
 ids.forEach((id,i)=>{const c=byId.get(id),radius=WORLD_RADII[c.profileKey],angle=i===0?0:i===1?1.1:-1.1,desired={x:player.x+dx*Math.cos(angle)-dz*Math.sin(angle),z:player.z+dx*Math.sin(angle)+dz*Math.cos(angle)},p=spawnNear(player,desired,radius,s.hunters),a=body(p.x,p.z,id,radius);a.owner='hunter-'+i;a.role=HUNTER_ROLES[i];a.brain={profile:id,role:a.role,next:0};a.item=i===0?'ink':i===1?'balloon':'flag';s.hunters.push(a);});
 player.owner='player';player.item=playerItem;for(const [i,a]of s.hunters.entries()){worldPilot(a,player,true,0,a.brain);a.brain.next=.4+i*.16;}
 // Ground pickups share one bounded pool. A full slot is never overwritten.
 for(let i=0;i<20;i++){const angle=i*Math.PI/10,r=26+random(s)*60,desired={x:player.x+Math.cos(angle)*r,z:player.z+Math.sin(angle)*r};let p=null;
  for(let j=0;j<128;j++){const q={x:desired.x+Math.cos(j*2.4)*Math.floor(j/8)*7,z:desired.z+Math.sin(j*2.4)*Math.floor(j/8)*7};q.y=worldHeight(q.x,q.z);if(worldValid(q,5)&&s.pickups.every(p=>near(p,q)>8)){p=q;break;}}
  if(p)s.pickups.push({...p,home:{...p},id:'pickup-'+i,type:i<14?PLAYER_ITEMS[i]:HUNTER_ITEMS[i-14],audience:i<14?'player':'hunters',readyAt:0,pull:null});
 }
 return s;
}
function participants(s){return[s.player,...s.hunters];}
function emit(s,type,a,extra={}){s.events.push({id:s.nextId++,type,owner:a.owner,time:s.time,...extra});}
function tune(s,a){const t=a.tuning,b=a.baseTuning;for(const k of['accel','speed','turn','brake'])t[k]=b[k];if(alive(s,a,'speed')){t.speed*=1.4;t.accel*=1.2;}if(alive(s,a,'grip')){t.brake*=1.7;t.turn*=1.35;}if(alive(s,a,'sticky')){t.accel*=.68;t.turn*=.72;}if(s.gadgets.some(g=>g.kind==='sheet'&&near(g,a)<g.radius&&Math.abs(a.y-g.y)<.6)){t.brake*=.35;t.turn*=.65;a.slippery=true;}else a.slippery=false;}
function landingFor(s,a){
 if(alive(s,s.player,'cloak')||!canSee(s,a,s.player)||near(a,s.player)>75)return null;
 const speed=Math.hypot(s.player.vx,s.player.vz),lead=Math.min(1.2,20/(speed||1)),ahead={x:s.player.x+s.player.vx*lead,z:s.player.z+s.player.vz*lead,y:s.player.y};
 const aim=worldTraversable(s.player,ahead,s.player.radius-.05)?ahead:s.player;
 const dx=a.x-aim.x,dz=a.z-aim.z,angle=Math.atan2(dx,dz),radius=a.radius+s.player.radius+3;
 for(const offset of[0,.5,-.5,1,-1]){const p={x:aim.x+Math.sin(angle+offset)*radius,z:aim.z+Math.cos(angle+offset)*radius};p.y=worldHeight(p.x,p.z);if(!worldValid(p,a.radius+.2))continue;
  const peak=Math.max(a.y,p.y)+7;let clear=true;for(let i=0;i<=20;i++){const t=i/20,q={x:a.x+(p.x-a.x)*t,z:a.z+(p.z-a.z)*t,y:t<.25?a.y+(peak-a.y)*smooth(t/.25):peak+(p.y-peak)*smooth((t-.65)/.35)};if(!worldValid(q,a.radius+.2)){clear=false;break;}}if(clear)return p;
 }
 return null;
}
function curtainBetween(s,a,b){const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;return s.gadgets.some(g=>{if(g.kind!=='curtain'||Math.min(a.y,b.y)>g.y+9)return false;const t=clamp(((g.x-a.x)*dx+(g.z-a.z)*dz)/(len||1),0,1);return t>0&&t<1&&Math.hypot(a.x+dx*t-g.x,a.z+dz*t-g.z)<g.radius;});}
function canSee(s,a,b,range=140){return visible(a,b,range)&&!curtainBetween(s,raised(a),raised(b));}
function addGadget(s,a,kind,life,radius=2){
 const dx=Math.sin(a.yaw),dz=Math.cos(a.yaw),distance=a.radius+radius+1.5,p={x:a.x+dx*distance,z:a.z+dz*distance};p.y=worldHeight(p.x,p.z);
 if(!worldValid(p,radius+.15)||Math.abs(p.y-a.y)>3)return null;
 if(s.gadgets.length>=12)return null;
 const g={...actor(p.x,p.z),...p,id:s.nextId++,kind,owner:a.owner,radius,until:s.time+life,yaw:a.yaw,spawnedAt:s.time,tuning:{accel:1,speed:1,turn:1,brake:1}};s.gadgets.push(g);return g;
}
function protectiveHit(s,a,g){if(!alive(s,a,'guard'))return false;a.effects.guard=0;const dx=g.x-a.x,dz=g.z-a.z,n=Math.hypot(dx,dz)||1;g.vx=dx/n*24;g.vz=dz/n*24;g.ignore=a.owner;g.ignoreUntil=s.time+.45;emit(s,'guard-block',a,{object:g.id});return true;}
function shareFlag(s,a){const seen=a.brain?.seen;if(!seen||s.time-a.brain.seenAt>3)return false;for(const h of s.hunters){if(h===a||canSee(s,h,s.player)&&!alive(s,s.player,'cloak'))continue;h.brain.seen={...seen};h.brain.seenAt=a.brain.seenAt;h.brain.searchPlan=null;}emit(s,'flag-shared',a,{seen:{...seen}});return true;}
export function activateHuntItem(s,owner='player'){
 if(s.phase!=='playing')return false;const a=participants(s).find(a=>a.owner===owner);if(!a||!a.item||a.flight||a.pendingItem)return false;
 const type=a.item;if(!(a===s.player?PLAYER_ITEMS:HUNTER_ITEMS).includes(type))return false;
 if(a!==s.player){if(s.time<(s.nextTeamItemAt??0))return false;
  if(['scarf','gloves','balloon'].includes(type)&&s.hunters.some(h=>h!==a&&(h.flight||h.pendingItem||alive(s,h,'speed')||alive(s,h,'grip'))))return false;
 }
 if(type==='balloon'){
  if(a===s.player||!a.grounded)return false;const target=landingFor(s,a);if(!target||s.hunters.some(h=>h!==a&&h.flight))return false;
  a.flight={stage:'prepare',since:s.time,launchAt:s.time+.8,launchY:a.y,target,peak:Math.max(a.y,target.y)+7};emit(s,'balloon-prepare',a,{target:{...target}});
 }else if(type==='ink'){
  if(!a.grounded)return false;if(s.pools.length>=4)s.pools.shift();s.pools.push({id:s.nextId++,x:a.x,z:a.z,y:worldHeight(a.x,a.z),radius:4,until:s.time+7});
 }else if(type==='speed')a.effects.speed=s.time+3;
 else if(type==='scarf'||type==='gloves'){a.pendingItem={type,at:s.time+.6};emit(s,'item-prepare',a,{item:type});}
 else if(type==='cloak')a.effects.cloak=s.time+4;
 else if(type==='grip')a.effects.grip=s.time+4;
 else if(type==='landing'){a.effects.landing=s.time+8;a.landingAirborne=!a.grounded;}
 else if(type==='guard')a.effects.guard=s.time+8;
 else if(type==='flag'){if(!a.brain?.seen||s.time-a.brain.seenAt>3)return false;a.pendingItem={type,at:s.time+.65};a.effects.flag=s.time+1.3;emit(s,'item-prepare',a,{item:type});}
 else if(type==='hook'){
  const p=HOOK_POLES.map(p=>({...p,y:worldHeight(p.x,p.z)+4})).filter(p=>near(a,p)>4&&near(a,p)<34&&worldSight(raised(a),p)).sort((x,y)=>near(a,x)-near(a,y))[0];if(!p)return false;
  a.hook={...p,length:near(a,p),until:s.time+3};emit(s,'hook-attached',a,{anchor:{...p}});
 }else if(type==='magnet'){
  const p=s.pickups.filter(p=>p.audience==='player'&&p.readyAt<=s.time&&!p.pull&&near(a,p)<24&&canSee(s,a,p,24)).sort((x,y)=>near(a,x)-near(a,y))[0];if(!p)return false;p.pull={owner:a.owner,until:s.time+3};emit(s,'magnet-pull',a,{pickup:p.id});
 }else{
  const radius={clone:2.7,stamp:1,cushion:3,curtain:9,fan:3,sheet:8,bell:2,sticky:1.3}[type],life={clone:5,stamp:4,cushion:7,curtain:5,fan:6,sheet:7,bell:18,sticky:5}[type];
  const g=addGadget(s,a,type,life,radius);if(!g)return false;
  const speed={clone:19,stamp:19,cushion:32,sticky:38}[type]??0;g.vx=Math.sin(a.yaw)*speed;g.vz=Math.cos(a.yaw)*speed;g.heading=a.yaw;if(['stamp','cushion','sticky'].includes(type))g.tuning.brake=.12;
  if(type==='stamp'){g.yaw+=.8;g.vx=Math.sin(g.yaw)*speed;g.vz=Math.cos(g.yaw)*speed;}
 }
 a.item=null;if(a!==s.player)s.nextTeamItemAt=s.time+1.5;emit(s,'item-use',a,{item:type});return true;
}
// Equipment answers terrain and visible events, not hidden current positions.
export function huntItemOpportunity(s,a){
 const item=a.item,seen=a.brain?.seen;if(!item||a.flight||a.pendingItem)return false;
 if(item==='guard')return s.gadgets.some(g=>['sticky','cushion'].includes(g.kind)&&!g.attached&&g.owner!==a.owner&&canSee(s,a,g,23)&&((g.vx-a.vx)*(a.x-g.x)+(g.vz-a.vz)*(a.z-g.z))>2);
 if(item==='flag')return !!seen&&s.time-a.brain.seenAt<3&&s.hunters.some(h=>h!==a&&(!h.brain.seen||h.brain.seenAt<a.brain.seenAt-.4)&&(!canSee(s,h,s.player)||alive(s,s.player,'cloak')));
 if(alive(s,s.player,'cloak')||!canSee(s,a,s.player,a.role==='patrol'?70:140))return false;
 const gap=near(a,s.player),goal=a.brain.path?.[a.brain.at],dx=(goal?.x??s.player.x)-a.x,dz=(goal?.z??s.player.z)-a.z,n=Math.hypot(dx,dz),v=Math.hypot(a.vx,a.vz),alignment=n>1&&v>2?(dx*a.vx+dz*a.vz)/(n*v):1;
 const next=a.brain.path?.[(a.brain.at??0)+1],nx=next&&goal?next.x-goal.x:0,nz=next&&goal?next.z-goal.z:0,leg=Math.hypot(nx,nz),cornerSoon=leg>1&&n<Math.max(18,v*.9)&&(dx*nx+dz*nz)/((n||1)*leg)<.65;
 if(item==='scarf')return gap>20&&gap<95&&alignment>.8&&!a.slippery&&!cornerSoon;
 if(item==='gloves')return gap<80&&(a.slippery||cornerSoon||alignment<.65&&v>6);
 if(item==='ink')return a.grounded&&(gap<13||gap<30&&((a.x-s.player.x)*s.player.vx+(a.z-s.player.z)*s.player.vz)>8);
 return item==='balloon'&&gap>24&&gap<75;
}
function itemForces(s,a,dt){
 a.externalForce=false;
 if(a.pendingItem&&s.time>=a.pendingItem.at){const p=a.pendingItem;a.pendingItem=null;if(p.type==='flag')shareFlag(s,a);else a.effects[p.type==='scarf'?'speed':'grip']=s.time+(p.type==='scarf'?3:4);}
 if(a.hook){const h=a.hook,d=near(a,h);if(s.time>=h.until||d>40||!worldSight(raised(a),h)){a.hook=null;}else if(d>h.length*.92){const nx=(h.x-a.x)/(d||1),nz=(h.z-a.z)/(d||1),speed=Math.hypot(a.vx,a.vz),force=clamp(speed*speed/Math.max(6,h.length)+(d-h.length)*14-(a.vx*nx+a.vz*nz)*1.5,0,90);a.vx+=nx*force*dt;a.vz+=nz*force*dt;a.externalForce=force>0;}}
 for(const g of s.gadgets)if(g.kind==='fan'&&near(g,a)<16&&Math.abs(a.y-g.y)<7){const dx=a.x-g.x,dz=a.z-g.z,along=dx*Math.cos(g.yaw)-dz*Math.sin(g.yaw),across=dx*Math.sin(g.yaw)+dz*Math.cos(g.yaw);if(Math.abs(across)<7&&along>0&&along<15){a.vx+=Math.cos(g.yaw)*16*dt;a.vz-=Math.sin(g.yaw)*16*dt;a.externalForce=true;}}
}
function afterMove(s,a){if(!alive(s,a,'landing'))return;if(!a.grounded)a.landingAirborne=true;else if(a.landingAirborne){const n=Math.hypot(a.vx,a.vz),dx=n>1?a.vx/n:Math.sin(a.yaw),dz=n>1?a.vz/n:Math.cos(a.yaw);a.vx+=dx*12;a.vz+=dz*12;a.effects.landing=0;emit(s,'landing-boost',a);}}
function updateGadgets(s,dt){
 for(const p of s.pickups)if(p.pull){const a=participants(s).find(a=>a.owner===p.pull.owner),d=a?near(a,p):0;if(!a||s.time>=p.pull.until||!canSee(s,a,p,32)){p.pull=null;continue;}const t=Math.min(1,34*dt/(d||1)),q={x:p.x+(a.x-p.x)*t,z:p.z+(a.z-p.z)*t,y:p.y};q.y=worldHeight(q.x,q.z);if(worldValid(q,1.3)&&Math.abs(q.y-p.y)<2)Object.assign(p,q);else p.pull=null;}
 for(const g of s.gadgets){
  if(['clone','stamp','cushion','sticky'].includes(g.kind)){
   if(g.attached){const a=participants(s).find(a=>a.owner===g.attached);if(a){g.x=a.x;g.z=a.z;g.y=a.y+2;}continue;}
   itemForces(s,g,dt);worldMove(g,g.kind==='clone'?{x:Math.sin(g.heading),z:Math.cos(g.heading),dash:true}:{},dt);
   if(g.kind==='stamp'&&(!g.lastFoot||near(g,g.lastFoot)>2)){const f={id:s.nextId++,owner:'player',fake:true,x:g.x,z:g.z,y:g.y,at:s.time,until:s.time+3.5};s.footprints.push(f);g.lastFoot={x:g.x,z:g.z};if(s.footprints.length>64)s.footprints.shift();}
   for(const a of participants(s)){
    if(a.owner===g.owner&&s.time-g.spawnedAt<.35||g.ignore===a.owner&&s.time<g.ignoreUntil||Math.abs(a.y-g.y)>5)continue;
    const d=near(a,g);if(d>a.radius+g.radius)continue;
    if(g.kind==='clone'){if(a.owner!=='player'){g.until=s.time;a.recoverUntil=s.time+.45;emit(s,'clone-popped',a);}continue;}
    if(g.kind==='stamp')continue;if(protectiveHit(s,a,g))continue;
    if(g.kind==='sticky'){a.effects.sticky=s.time+3;g.attached=a.owner;g.until=s.time+3;emit(s,'sticky-hit',a);break;}
    const nx=(a.x-g.x)/(d||1),nz=(a.z-g.z)/(d||1),closing=(g.vx-a.vx)*nx+(g.vz-a.vz)*nz;if(closing>0){const impulse=Math.min(16,closing*.6);a.vx+=nx*impulse;a.vz+=nz*impulse;g.vx-=nx*impulse;g.vz-=nz*impulse;if(impulse>.6&&s.time>=(g.nextBumpAt??0)){emit(s,'cushion-bump',a,{object:g.id});g.nextBumpAt=s.time+.15;}}
    const push=Math.min(.15,(a.radius+g.radius-d)/2);for(const [body,sign]of[[a,1],[g,-1]]){const q={x:body.x+nx*push*sign,z:body.z+nz*push*sign,y:body.y};if(worldValid(q,body.radius)&&(!body.grounded||Math.abs(worldHeight(q.x,q.z)-body.y)<.3)){body.x=q.x;body.z=q.z;if(body.grounded)body.y=worldHeight(body.x,body.z);}}
   }
  }else if(g.kind==='bell'&&s.time>=(g.nextRing??0)&&s.hunters.some(a=>near(a,g)<9&&Math.abs(a.y-g.y)<5)){
   g.ringingUntil=s.time+1.3;g.nextRing=s.time+2;emit(s,'bell-ring',s.player,{position:{x:g.x,y:g.y,z:g.z}});
  }
 }
 s.gadgets=s.gadgets.filter(g=>g.until>s.time);
}
function floatMove(s,a,dt){const f=a.flight;if(!f)return false;
 if(s.time<f.launchAt){worldMove(a,{},dt);return true;}
 const t=s.time-f.launchAt;if(f.stage==='prepare'){f.stage='float';emit(s,'balloon-lift',a);}
 if(t<5.5){const wanted=t<1.4?f.launchY+(f.peak-f.launchY)*smooth(t/1.4):f.peak+(f.target.y-.15-f.peak)*smooth((t-3.5)/2);
  a.grounded=false;a.vy+=(BODY.gravity+clamp((wanted-a.y)*10-a.vy*5,-40,40))*dt;
  a.vx+=clamp((f.target.x-a.x)*1.8-a.vx*2,-12,12)*dt;a.vz+=clamp((f.target.z-a.z)*1.8-a.vz*2,-12,12)*dt;
 }
 worldMove(a,{dash:true},dt);
 if(t>1&&a.grounded){emit(s,'balloon-land',a);a.flight=null;a.recoverUntil=s.time+.65;a.noTagUntil=s.time+.65;}
 return true;
}
function hopControl(s,a,input){
 if(!a.grounded)return{...input,jump:a.jumpHeld&&a.vy>0};
 if(s.time<a.nextHop)return input;const n=Math.hypot(input.x,input.z);if(n<.1)return input;
 const distance=a.radius+1.5+Math.hypot(a.vx,a.vz)*.12,p={x:a.x+input.x/n*distance,z:a.z+input.z/n*distance},h=worldHeight(p.x,p.z)-a.y;
 if(h>.65&&h<HUNT_JUMP.launch**2/(2*HUNT_JUMP.gravity)*.85&&worldValid({...p,y:worldHeight(p.x,p.z)},a.radius+.1)){a.nextHop=s.time+1;return{...input,jump:true};}return input;
}
function footprintAwareness(s,a){
 if(!alive(s,s.player,'cloak')&&canSee(s,a,s.player,a.role==='patrol'?70:140))return;
 for(let i=s.footprints.length-1;i>=0;i--){const f=s.footprints[i];if(f.owner!=='player'||f.id===(a.brain.lastFootId??-1)||!canSee(s,a,{...f,y:f.y+.1},80))continue;const at=f.at??f.until-3.5;if(at<(a.brain.seenAt??-Infinity))continue;a.brain.lastFootId=f.id;a.brain.seen={x:f.x,z:f.z,y:f.y,vx:0,vz:0};a.brain.seenAt=at;a.brain.searchPlan=null;return;}
}
function collectAndPaint(s,a){
 if(!a.item&&a.grounded)for(const p of s.pickups)if((p.audience==='player'?a.owner==='player':a.owner!=='player')&&p.readyAt<=s.time&&near(a,p)<a.radius+1.2&&Math.abs(a.y-p.y)<1){a.item=p.type;p.readyAt=s.time+24+random(s)*12;p.pull=null;if(p.home)Object.assign(p,p.home);emit(s,'pickup',a,{pickup:p.id,item:p.type});break;}
 if(a.grounded&&s.pools.some(p=>near(a,p)<p.radius&&Math.abs(a.y-p.y)<.4))a.effects.ink=s.time+3;
 if(alive(s,a,'ink')&&!alive(s,a,'cloak')&&a.grounded&&(!a.lastFoot||near(a,a.lastFoot)>2)){
  const f={id:s.nextId++,owner:a.owner,x:a.x,z:a.z,y:a.y,at:s.time,until:s.time+3.5};s.footprints.push(f);a.lastFoot={x:a.x,z:a.z};if(s.footprints.length>64)s.footprints.shift();
 }
}
function hunterContacts(s){
 // Ordinary equal-mass body contact, never a routing teleport. Check the same
 // walls and ground before applying the small penetration correction.
 for(let pass=0;pass<2;pass++)for(let i=0;i<s.hunters.length;i++)for(let j=i+1;j<s.hunters.length;j++){
  const a=s.hunters[i],b=s.hunters[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),r=a.radius+b.radius;
  if(d>=r||Math.abs(a.y-b.y)>=5.4)continue;
  const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0,push=Math.min(.3,(r-d)/2+.00001);
  for(const [body,sign]of[[a,-1],[b,1]]){const next={x:body.x+nx*push*sign,z:body.z+nz*push*sign,y:body.y};if(worldValid(next,body.radius)&&(!body.grounded||Math.abs(worldHeight(next.x,next.z)-body.y)<.3)){body.x=next.x;body.z=next.z;if(body.grounded)body.y=worldHeight(body.x,body.z);}}
  const closing=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;if(closing<0){a.vx+=closing*nx/2;a.vz+=closing*nz/2;b.vx-=closing*nx/2;b.vz-=closing*nz/2;}
 }
}
export function huntStep(s,input={},dt=STEP){
 if(dt!==STEP)throw Error('FIXED_STEP_REQUIRED');if(!['countdown','playing'].includes(s.phase))return s;s.events.length=0;
 if(s.countdown>0){s.countdown=Math.max(0,s.countdown-dt);if(!s.countdown)s.phase='playing';return s;}
 s.time=Math.min(s.duration,s.time+dt);s.pools=s.pools.filter(p=>p.until>s.time);s.footprints=s.footprints.filter(p=>p.until>s.time);
 if(input.use&&!s.useHeld)activateHuntItem(s);s.useHeld=!!input.use;itemForces(s,s.player,dt);tune(s,s.player);worldMove(s.player,input,dt);afterMove(s,s.player);collectAndPaint(s,s.player);
 for(const a of s.hunters){
  itemForces(s,a,dt);tune(s,a);const actualVisible=!alive(s,s.player,'cloak')&&canSee(s,a,s.player,a.role==='patrol'?70:140),decoy=!actualVisible?s.gadgets.find(g=>g.kind==='clone'&&canSee(s,a,g,a.role==='patrol'?70:140)):null;
  a.brain.suppressSight=!actualVisible&&!decoy;footprintAwareness(s,a);
  if(a.flight){floatMove(s,a,dt);collectAndPaint(s,a);continue;}
  if(s.time>=a.brain.next||!a.brain.path)a.brain.reservedTargets=s.hunters.filter(h=>h!==a&&h.brain.target&&s.time-(h.brain.seenAt??-Infinity)<3).map(h=>({...h.brain.target}));
  const target=decoy??s.player,control=worldPilot(a,target,true,s.time,a.brain);
  if(s.time>(a.nextItemAt??2)&&huntItemOpportunity(s,a))if(activateHuntItem(s,a.owner))a.nextItemAt=s.time+12;
  if(a.flight){floatMove(s,a,dt);continue;}
  if(s.time<(a.recoverUntil??0))control.dash=false;
  worldMove(a,hopControl(s,a,control),dt);afterMove(s,a);collectAndPaint(s,a);
 }
 hunterContacts(s);updateGadgets(s,dt);
 const catcher=s.hunters.find(a=>!a.flight&&s.time>=(a.noTagUntil??0)&&near(a,s.player)<=a.radius+s.player.radius&&Math.abs(a.y-s.player.y)<5.4&&worldSight({...a,y:a.y+2},{...s.player,y:s.player.y+2},.05));
 if(catcher||s.time>=s.duration){s.phase='finished';s.result={caught:!!catcher,win:!catcher,time:s.time,catcher:catcher?.owner??null};}
 return s;
}
// Nearby clear-space approach cues are not a through-wall enemy radar.
export function huntThreatCues(s){return s.hunters.filter(a=>canSee(s,s.player,a,52)).map(a=>({owner:a.owner,role:a.role,x:a.x,y:a.y+3,z:a.z,preparing:!!a.pendingItem||a.flight?.stage==='prepare'}));}
// Display data is read-only and includes an always-visual counterpart to sounds.
export function huntPresentation(s){const view=a=>({owner:a.owner,character:a.id,role:a.role,x:a.x,y:a.y,z:a.z,yaw:a.yaw,item:a.item,grounded:a.grounded,jumps:a.jumps,vy:a.vy,cloaked:alive(s,a,'cloak'),speedUp:alive(s,a,'speed'),flight:a.flight?structuredClone(a.flight):null});return{time:s.time,phase:s.phase,player:view(s.player),hunters:s.hunters.map(view),events:s.events.map(e=>structuredClone(e)),pools:s.pools.map(p=>({...p})),footprints:s.footprints.map(f=>({...f}))};}
export function recordHunt(config){const s=createHunt(config),frames=[];return{state:s,tick(input={}){if(s.phase==='finished')return s;if(frames.length>11200)throw Error('TRACE_FULL');const x=input.x??0,z=input.z??0;if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1||Math.abs(z)>1)throw Error('INVALID_INPUT');frames.push([x,z,(input.jump?1:0)|(input.dash?2:0)|(input.use?4:0)]);return huntStep(s,input);},proof(){if(s.phase!=='finished')throw Error('ROUND_UNFINISHED');return{rules:HUNT_RULES,config:structuredClone(s.config),frames:frames.map(f=>[...f]),claim:{...s.result}};}};}
export function verifyHunt(proof){if(proof?.rules!==HUNT_RULES||!Array.isArray(proof.frames)||proof.frames.length>11200)throw Error('INVALID_PROOF');const s=createHunt(proof.config);for(const f of proof.frames){if(s.phase==='finished'||!Array.isArray(f)||f.length!==3||!Number.isFinite(f[0])||!Number.isFinite(f[1])||Math.abs(f[0])>1||Math.abs(f[1])>1||!Number.isInteger(f[2])||f[2]<0||f[2]>7)throw Error('INVALID_TRACE');huntStep(s,{x:f[0],z:f[1],jump:!!(f[2]&1),dash:!!(f[2]&2),use:!!(f[2]&4)});}if(s.phase!=='finished'||JSON.stringify(s.result)!==JSON.stringify(proof.claim))throw Error('RESULT_MISMATCH');return{rules:HUNT_RULES,...s.result};}
