import{huntJumpInput,huntJumpRestRemaining,recordHuntJumpLanding}from'./imasora-sliding-tag-hunt-jump-rest.mjs';
import{huntSweepControl}from'./imasora-sliding-tag-hunt-sweep.mjs';
import{huntStartFacing}from'./imasora-sliding-tag-hunt-start-facing.mjs';
import{huntCanObserve,huntOpticalHidden,huntHasClearSight,huntPermanentToolUseful}from'./imasora-sliding-tag-hunt-sight.mjs';
import{applyHuntWind,resolveHuntFans}from'./imasora-sliding-tag-hunt-fan.mjs';
import{steerClearOfHuntWind}from'./imasora-sliding-tag-hunt-wind-steering.mjs';
import{cushionJumpControl}from'./imasora-sliding-tag-hunt-cushion-jump.mjs';
import{applyCushionDizzy,huntIsDizzy}from'./imasora-sliding-tag-hunt-cushion-stun.mjs';
import{huntBodiesTouch,DEFAULT_TOUCH_SHAPE,validHuntTouchShape}from'./imasora-sliding-tag-hunt-body-touch.mjs';
import{startHuntZip,moveHuntZip}from'./imasora-sliding-tag-hunt-zip.mjs';
import{MATCH_SECONDS,TRACE_CAPACITY}from'./imasora-sliding-tag-hunt-match.mjs';

import{radarObservations}from'./imasora-sliding-tag-hunt-radar.mjs';
import{runnerHookControl}from'./imasora-sliding-tag-hunt-runner-hook.mjs';
import{huntGadgetPlacement,huntHookAnchor}from'./imasora-sliding-tag-hunt-placement.mjs';
import{startHuntDive,moveHuntDive,diveCanTouch,HUNT_DIVE}from'./imasora-sliding-tag-hunt-dive.mjs';
// Experimental simulation for the accepted multi-hunter redesign.
// The normal trial uses this simulation; formal growth/rewards remain disabled.
import{STEP,BODY,HUNT_JUMP,WORLD,WORLD_STARTS,WORLD_RADII,TAG_CHARACTERS,actor,opponentSpec,worldHeight,worldValid,worldSight,worldTraversable,worldMove,worldPilot,worldSteering,worldRoute,worldRouteSeconds}from'./imasora-sliding-tag-hunt-world.mjs';
import{ITEM_TYPES,PLAYER_ITEMS,HUNTER_ITEMS,HOOK_POLES,INK,HUNT_FIELDS}from'./imasora-sliding-tag-hunt-items.mjs';
import{createHuntSupplies,huntSupplySteering}from'./imasora-sliding-tag-hunt-supplies.mjs';
import{movingItemContactRadius,huntSupplyContact}from'./imasora-sliding-tag-hunt-contact.mjs';

export{STEP,HUNT_JUMP,ITEM_TYPES,PLAYER_ITEMS,HUNTER_ITEMS};
import{runnerControl,runnerJumpControl,runnerPressureControl,safeTrampolineApproach}from'./imasora-sliding-tag-hunt-runner.mjs';
import{runnerSupplyControl,runnerItemTactic}from'./imasora-sliding-tag-hunt-runner-tools.mjs';
import{randomHuntStart,mixHuntStartSeed}from'./imasora-sliding-tag-hunt-random-starts.mjs';
import{trampolineJumpAccess,createHuntTrampoline,trampolineInput,resolveTrampoline,trampolineEscapeControl,trampolineSurface,trampolineClear,trampolineObstacleJump}from'./imasora-sliding-tag-hunt-trampoline.mjs';
export const HUNT_RULES='tag-corner-reversal-v64';
export const CONTACT_APPROACH_RULES='tag-contact-approach-v65';
export const CORNER_SEARCH_RULES='tag-corner-search-v66';
export const RUNNER_SUPPLY_RULES='tag-runner-supply-v67';
export const RUNNER_CUSHION_RULES='tag-runner-cushion-v68';
export const RUNNER_FAN_RULES='tag-runner-fan-v69';
export const COURTYARD_WIND_RULES='tag-courtyard-wind-v70';
export const COURTYARD_REACQUIRE_RULES='tag-courtyard-reacquire-v71';
export const COURTYARD_TEAM_RULES='tag-courtyard-team-v72';
const SHORTER_REST_RULES='tag-shorter-rest-v63';
const AIR_PURSUIT_RULES='tag-air-pursuit-v62';
const PREVIOUS_HUNT_RULES='tag-rear-mirror-v61';
const usesCourtyardReacquire=s=>s.rules===COURTYARD_TEAM_RULES||s.rules===COURTYARD_REACQUIRE_RULES;
const usesCourtyardWind=s=>usesCourtyardReacquire(s)||s.rules===COURTYARD_WIND_RULES;
const usesRunnerFan=s=>usesCourtyardWind(s)||s.rules===RUNNER_FAN_RULES;
const usesRunnerCushion=s=>usesRunnerFan(s)||s.rules===RUNNER_CUSHION_RULES;
const usesRunnerSupply=s=>usesRunnerCushion(s)||s.rules===RUNNER_SUPPLY_RULES;
const usesCornerSearch=s=>usesRunnerSupply(s)||s.rules===CORNER_SEARCH_RULES;
const usesContactApproach=s=>usesCornerSearch(s)||s.rules===CONTACT_APPROACH_RULES;
const usesCornerReversal=s=>usesContactApproach(s)||s.rules===HUNT_RULES;
const usesShorterRest=s=>usesCornerReversal(s)||s.rules===SHORTER_REST_RULES;
export const HUNTER_COUNT=3;
export const HUNTER_ROLES=Object.freeze(['pursuit','intercept','patrol']);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),raised=a=>({...a,y:a.y+3});
const byId=new Map(TAG_CHARACTERS.map(c=>[c.id,c]));
const visible=(a,b,range=140)=>near(a,b)<range&&worldSight(raised(a),raised(b));
const alive=(s,a,key)=>(a.effects[key]??0)>s.time;
function body(x,z,id,radius){const spec=opponentSpec(id),a=Object.assign(actor(x,z),{y:worldHeight(x,z),id,radius,keepInputFacing:true,contactKey:id==='player'?DEFAULT_TOUCH_SHAPE:id,baseTuning:{accel:1,speed:1,turn:1,brake:1,...spec?.movement},effects:{},item:null,flight:null,nextHop:0});a.tuning={...a.baseTuning};return a;}
function random(s){s.randomState=(Math.imul(s.randomState,1664525)+1013904223)>>>0;return s.randomState/4294967296;}
export function createHunt({hunterCount=HUNTER_COUNT,opponents,startKey='random',seed=12031,duration=MATCH_SECONDS,playerItem='none',playerRadius=2.7,playerShape=DEFAULT_TOUCH_SHAPE,mode='escape',hunterItem='none'}={}){
 if(hunterCount!==HUNTER_COUNT||!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||duration!==MATCH_SECONDS)throw Error('INVALID_HUNT_CONFIG');
 if(!validHuntTouchShape(playerShape))throw Error('INVALID_TOUCH_SHAPE');
 if(playerItem!=='none'&&!PLAYER_ITEMS.includes(playerItem)||!Number.isFinite(playerRadius)||playerRadius<2||playerRadius>6)throw Error('INVALID_PLAYER_CONFIG');
 if(!['escape','hunt'].includes(mode)||hunterItem!=='none'&&!HUNTER_ITEMS.includes(hunterItem))throw Error('INVALID_ROLE_CONFIG');
 if(startKey!=='random'&&!WORLD_STARTS.some(x=>x.id===startKey))throw Error('INVALID_START');startKey='random';
 const defaults=['walkBrave','rioSaber','walkCute'].map(p=>TAG_CHARACTERS.find(c=>c.profileKey===p).id),ids=opponents??defaults;
 if(!Array.isArray(ids)||ids.length!==3||ids.some(id=>!byId.has(id)))throw Error('INVALID_OPPONENTS');
 const initial={randomState:mixHuntStartSeed(seed)},layout=randomHuntStart(()=>random(initial),mode);
 const player=body(layout.runner.x,layout.runner.z,mode==='hunt'?ids[0]:'player',mode==='hunt'?WORLD_RADII[byId.get(ids[0]).profileKey]:playerRadius),s={rules:HUNT_RULES,config:{hunterCount,opponents:[...ids],startKey,seed,duration,playerItem,playerRadius,playerShape,mode,hunterItem},time:0,countdown:2,phase:'countdown',duration,randomState:initial.randomState,player,hunters:[],pickups:[],pools:[],footprints:[],gadgets:[],events:[],nextId:1,result:null,useHeld:false,inkUntil:0};
 const spawns=layout.hunters;
 if(mode==='hunt'){const costs=new Map(spawns.map(p=>{const a={...p,radius:playerRadius,tuning:{accel:1,speed:1,turn:1,brake:1},vx:0,vz:0},path=worldRoute(a,player);return[p,path.length?worldRouteSeconds(a,path):1000+near(a,player)];}));spawns.sort((a,b)=>costs.get(a)-costs.get(b));[spawns[1],spawns[2]]=[spawns[2],spawns[1]];}
 s.spawnLayout={runner:layout.runner.id,hunters:spawns.map(p=>p.id),positions:[layout.runner,...spawns].map(p=>({x:p.x,y:p.y,z:p.z}))};
 ids.forEach((id,i)=>{const human=mode==='hunt'&&i===0,c=byId.get(id),radius=human?playerRadius:WORLD_RADII[c.profileKey],p=spawns[i],a=body(p.x,p.z,human?'player':id,radius);a.owner='hunter-'+i;a.role=HUNTER_ROLES[i];a.brain={profile:id,role:a.role,next:0};s.hunters.push(a);});
 (mode==='hunt'?s.hunters[0]:player).contactKey=playerShape;player.owner='player';player.brain={profile:ids[0],next:0};
 for(const[i,a]of s.hunters.entries()){worldPilot(a,player,true,0,a.brain);a.brain.next=.4+i*.16;}
 const human=controlledHuntActor(s);human.yaw=huntStartFacing(human,[player,...s.hunters].filter(a=>a!==human));
 s.trampoline=createHuntTrampoline();s.pickups=createHuntSupplies(()=>random(s),[player,...s.hunters]);return s;
}
export function controlledHuntActor(s){return s.config.mode==='hunt'?s.hunters[0]:s.player;}
function moveWithTrampoline(s,a,input,dt){if(huntIsDizzy(s,a))input={};const before={y:a.y,grounded:a.grounded,jumps:a.jumps};worldMove(a,huntJumpInput(s,a,{...trampolineInput(a,input),jumpAccess:input.jump&&!a.jumpHeld&&trampolineJumpAccess(s,a)}),dt);if(resolveTrampoline(s,a,before)==='bounce')emit(s,'trampoline-bounce',a,{position:{x:s.trampoline.x,y:s.trampoline.y,z:s.trampoline.z}});}
function participants(s){return[s.player,...s.hunters];}
function emit(s,type,a,extra={}){s.events.push({id:s.nextId++,type,owner:a.owner,time:s.time,...extra});}
function tune(s,a){const t=a.tuning,b=a.baseTuning;for(const k of['accel','speed','turn','brake'])t[k]=b[k];if(a===s.player)t.speed*=1.04;if(alive(s,a,'speed')){t.speed*=1.4;t.accel*=1.2;}if(s.gadgets.some(g=>g.kind==='sheet'&&near(g,a)<g.radius&&Math.abs(a.y-g.y)<.6)){t.brake*=.35;t.turn*=.65;a.slippery=true;}else a.slippery=false;}
// Leave more than one complete dive of room, measured between body radii.
// A live lower bound also prevents an approaching runner shortening the landing.
const BALLOON_GAP=28, BALLOON_MIN_GAP=26;
function landingFor(s,a,tracking=false){
 // This specific homing item tracks the runner independently of ordinary vision.
 const speed=Math.hypot(s.player.vx,s.player.vz),lead=tracking?.4:Math.min(.5,15/(speed||1)),ahead={x:s.player.x+s.player.vx*lead,z:s.player.z+s.player.vz*lead,y:s.player.y};
 const aim=worldTraversable(s.player,ahead,s.player.radius-.05)?ahead:s.player;
 const dx=a.x-aim.x,dz=a.z-aim.z,side=(a.x-s.player.x)*s.player.vz-(a.z-s.player.z)*s.player.vx,angle=tracking&&speed>3&&Math.hypot(dx,dz)<60?Math.atan2(dx,dz):tracking&&speed>3?Math.atan2(s.player.vx,s.player.vz)+(a.flight?.side??(side>=0?1:-1))*Math.PI/2:tracking&&a.flight?a.flight.approachAngle:Math.atan2(dx,dz),radius=a.radius+s.player.radius+BALLOON_GAP;
 for(const offset of[0,.5,-.5,1,-1,1.5,-1.5,2,-2,2.5,-2.5,Math.PI]){const p={x:aim.x+Math.sin(angle+offset)*radius,z:aim.z+Math.cos(angle+offset)*radius};p.y=worldHeight(p.x,p.z);if(!worldValid(p,a.radius+.2))continue;
  if(tracking)return p;const peak=Math.max(a.y,p.y)+13;let clear=true;for(let i=0;i<=20;i++){const t=i/20,q={x:a.x+(p.x-a.x)*t,z:a.z+(p.z-a.z)*t,y:t<.25?a.y+(peak-a.y)*smooth(t/.25):peak+(p.y-peak)*smooth((t-.65)/.35)};if(!worldValid(q,a.radius+.2)){clear=false;break;}}if(clear)return p;
 }
 return null;
}
// If every nearby landing footprint is blocked, begin safely and keep
// retargeting the runner during the flight.
function emergencyBalloonPlan(s,a){
 const direction=Math.hypot(a.vx,a.vz)>2?Math.atan2(a.vx,a.vz):a.yaw;
 for(const distance of[48,28,12,0])for(const offset of[0,.7,-.7,1.5,-1.5,Math.PI]){
  const p={x:a.x+Math.sin(direction+offset)*distance,z:a.z+Math.cos(direction+offset)*distance};p.y=worldHeight(p.x,p.z);if(!worldValid(p,a.radius+.05))continue;
  for(const rise of[13,6,1]){const peak=Math.max(a.y,p.y)+rise;let clear=true;
   for(let i=0;i<=12;i++){const t=i/12,q={x:a.x+(p.x-a.x)*t,z:a.z+(p.z-a.z)*t,y:t<.25?a.y+(peak-a.y)*smooth(t/.25):peak+(p.y-peak)*smooth((t-.65)/.35)};if(!worldValid(q,a.radius+.01)){clear=false;break;}}
   if(clear)return{target:p,peak};
  }
 }
 // Under a low ceiling or tight wall, inflate in place. Normal collision
 // still limits the rise; the balloon deflates and returns to the floor.
 return{target:{x:a.x,z:a.z,y:worldHeight(a.x,a.z)},peak:a.y+1};
}
function canSee(s,a,b,range=140){return huntCanObserve(s,a,b,range);}
function addGadget(s,a,kind,life,radius=2){
 const p=huntGadgetPlacement(s,a,kind);if(!p)return null;
 const g={...actor(p.x,p.z),...p,id:s.nextId++,kind,owner:a.owner,radius,trampolineSupport:p.y>worldHeight(p.x,p.z)+.1,until:s.time+life,yaw:a.yaw,spawnedAt:s.time,tuning:{accel:1,speed:1,turn:1,brake:1}};s.gadgets.push(g);return g;
}
export function activateHuntItem(s,owner='player'){
 if(s.phase!=='playing')return false;const a=participants(s).find(a=>a.owner===owner);if(!a||huntIsDizzy(s,a)||a.flight||a.pendingItem)return false;if(a.hook){a.hook=null;const v=Math.hypot(a.vx,a.vz);if(v>30){a.vx*=30/v;a.vz*=30/v;}a.vy=clamp(a.vy,-8,8);emit(s,'hook-released',a);return true;}if(!a.item)return false;
 const type=a.item;if(!(a===s.player?PLAYER_ITEMS:HUNTER_ITEMS).includes(type)||((type==='radar'||type==='mirror')&&!huntPermanentToolUseful(s,a,type)))return false;
 if(a!==s.player&&type!=='balloon'){if(s.time<(s.nextTeamItemAt??0))return false;
  if(type==='scarf'&&s.hunters.some(h=>h!==a&&(h.flight||h.pendingItem||alive(s,h,'speed'))))return false;
 }
 if(type==='balloon'){
  if(a===s.player)return false;const visibleTarget=landingFor(s,a,true),plan=visibleTarget?{target:visibleTarget,peak:Math.max(a.y,visibleTarget.y)+13}:emergencyBalloonPlan(s,a),{target,peak}=plan;
  a.flight={stage:'prepare',since:s.time,launchAt:s.time+.6,launchY:a.y,target,peak,nextTrack:s.time+.6,side:visibleTarget&&((a.x-s.player.x)*s.player.vz-(a.z-s.player.z)*s.player.vx<0)?-1:1,approachAngle:visibleTarget?Math.atan2(a.x-s.player.x,a.z-s.player.z):a.yaw+Math.PI,free:!visibleTarget};emit(s,'balloon-prepare',a,{target:{...target}});
 }else if(type==='ink'){
  s.inkUntil=s.player.effects.ink=s.duration+STEP;s.player.lastFoot=null;emit(s,'runner-inked',a,{target:s.player.owner,until:s.player.effects.ink});
 }else if(type==='sunglasses')a.effects.sunglasses=s.duration+STEP;
 else if(type==='radar'||type==='mirror')a.effects[type]=s.duration+STEP;
 else if(type==='speed')a.effects.speed=s.time+3;
 else if(type==='scarf'){a.pendingItem={type,at:s.time+.6};emit(s,'item-prepare',a,{item:type});}
 else if(type==='cloak')a.effects.cloak=s.time+4;
 else if(type==='hook'){
  const p=huntHookAnchor(a,s);if(!p)return false;
  startHuntZip(s,a,p);emit(s,'hook-attached',a,{anchor:{...p}});
  }else{
  const radius={clone:a.radius,cushion:3,curtain:HUNT_FIELDS.curtainRadius,sheet:HUNT_FIELDS.sheetRadius,fan:HUNT_FIELDS.fanRadius}[type],life={clone:5,cushion:7,curtain:5,sheet:7,fan:HUNT_FIELDS.fanSeconds}[type];
  const g=addGadget(s,a,type,life,radius);if(!g)return false;
  const speed={clone:19,cushion:32}[type]??0;if(type==='cushion')g.yaw+=Math.PI;g.vx=Math.sin(g.yaw)*speed;g.vz=Math.cos(g.yaw)*speed;g.heading=g.yaw;if(['cushion'].includes(type))g.tuning.brake=.12;
 }
 a.item=null;if(a!==s.player)s.nextTeamItemAt=s.time+1.5;emit(s,'item-use',a,{item:type});return true;
}
// Equipment answers terrain and visible events, not hidden current positions.
export function huntItemOpportunity(s,a,{playerVisible}={}){
 const item=a.item,seen=a.brain?.seen;if(!item||a.flight||a.pendingItem)return false;
 if(item==='balloon')return near(a,s.player)>a.radius+s.player.radius+BALLOON_GAP+4;

 if(item==='radar')return!alive(s,a,'radar')&&playerVisible!==true;
 if(item==='sunglasses')return !huntHasClearSight(s,a);
 if(item==='ink')return!((s.inkUntil??0)>s.time);
 if(huntOpticalHidden(s,a,s.player)||!(typeof playerVisible==='boolean'?playerVisible:canSee(s,a,s.player,a.role==='patrol'?70:140)))return false;
 const gap=near(a,s.player),goal=a.brain.path?.[a.brain.at],dx=(goal?.x??s.player.x)-a.x,dz=(goal?.z??s.player.z)-a.z,n=Math.hypot(dx,dz),v=Math.hypot(a.vx,a.vz),alignment=n>1&&v>2?(dx*a.vx+dz*a.vz)/(n*v):1;
 const next=a.brain.path?.[(a.brain.at??0)+1],nx=next&&goal?next.x-goal.x:0,nz=next&&goal?next.z-goal.z:0,leg=Math.hypot(nx,nz),cornerSoon=leg>1&&n<Math.max(18,v*.9)&&(dx*nx+dz*nz)/((n||1)*leg)<.65;
 if(item==='scarf')return gap>20&&gap<95&&alignment>.8&&!a.slippery&&!cornerSoon;

 return item==='balloon'&&gap>24&&gap<105;
}
function itemForces(s,a,dt){
 a.externalForce=false;if(a.brain){if(a.item&&!(a===s.player?PLAYER_ITEMS:HUNTER_ITEMS).includes(a.item))a.item=null;a.fanStepOrigin??={};Object.assign(a.fanStepOrigin,{x:a.x,y:a.y,z:a.z,grounded:a.grounded,jumps:a.jumps});if(a===s.player)delete a.effects.sunglasses;for(const k of['grip','landing','sticky','recoil','guard','windGuard','flag'])delete a.effects[k];applyHuntWind(s,a,dt);}
 if(a.pendingItem&&a.pendingItem.type!=='scarf')a.pendingItem=null;
 if(a.pendingItem&&s.time>=a.pendingItem.at){const p=a.pendingItem;a.pendingItem=null;if(p.type==='scarf')a.effects.speed=s.time+3;}
}
function afterMove(s,a){resolveHuntFans(s,a,a.fanStepOrigin);recordHuntJumpLanding(s,a,a.fanStepOrigin,usesShorterRest(s)?undefined:1.5);}
function updateGadgets(s,dt){
 for(const p of s.pickups)delete p.pull;
 for(const g of s.gadgets){
  if(g.trampolineSupport&&s.trampoline.used&&!['clone','cushion'].includes(g.kind)){g.vy-=BODY.gravity*dt;g.y=Math.max(worldHeight(g.x,g.z),g.y+g.vy*dt);if(g.y===worldHeight(g.x,g.z)){g.vy=0;g.trampolineSupport=false;}}

  if(['clone','cushion'].includes(g.kind)){
   if(g.attached){const a=participants(s).find(a=>a.owner===g.attached);if(a){g.x=a.x;g.z=a.z;g.y=a.y+2;}continue;}
   itemForces(s,g,dt);moveWithTrampoline(s,g,g.kind==='clone'?{x:Math.sin(g.heading),z:Math.cos(g.heading),dash:true}:{},dt);
   for(const a of participants(s)){
    if(a.owner===g.owner&&s.time-g.spawnedAt<.35||g.ignore===a.owner&&s.time<g.ignoreUntil)continue;
    const contact=movingItemContactRadius(a,g);if(contact<0)continue;
    const d=near(a,g);if(d>contact)continue;
    if(g.kind==='clone'){if(a.owner!=='player'){g.until=s.time;a.recoverUntil=s.time+.45;emit(s,'clone-popped',a);}continue;}
    
    if(applyCushionDizzy(s,a,g))emit(s,'cushion-bump',a,{object:g.id,until:a.effects.dizzy});
    const nx=(a.x-g.x)/(d||1),nz=(a.z-g.z)/(d||1),closing=(g.vx-a.vx)*nx+(g.vz-a.vz)*nz;if(closing>0){const impulse=Math.min(16,closing*.6);a.vx+=nx*impulse;a.vz+=nz*impulse;g.vx-=nx*impulse;g.vz-=nz*impulse;}
    const push=Math.min(.15,(contact-d)/2);for(const [body,sign]of[[a,1],[g,-1]]){const q={x:body.x+nx*push*sign,z:body.z+nz*push*sign,y:body.y};if(worldValid(q,body.radius)&&trampolineClear(s,q,body.radius)&&(!body.grounded||Math.abs(trampolineSurface(s,q.x,q.z)-body.y)<.3)){body.x=q.x;body.z=q.z;if(body.grounded)body.y=trampolineSurface(s,body.x,body.z);}}
   }
  }
 }
 s.gadgets=s.gadgets.filter(g=>g.until>s.time);
}
const BALLOON_TRACK_LIMIT=22;
function balloonLandingSpot(a){
 const spot={x:a.x,z:a.z,y:worldHeight(a.x,a.z)};
 return worldValid(spot,a.radius-.01)?spot:null;
}
function balloonNearbyLanding(a){
 for(const distance of [2,4,8,12])for(let i=0;i<8;i++){
  const angle=i*Math.PI/4,x=a.x+Math.sin(angle)*distance,z=a.z+Math.cos(angle)*distance;
  const spot={x,z,y:worldHeight(x,z)},above={x,z,y:a.y};
  if(worldValid(spot,a.radius+.05)&&worldValid(above,a.radius+.05)&&worldSight({...a,y:a.y+3},{...above,y:a.y+3},a.radius))return spot;
 }
 return null;
}
function descendBalloon(s,a,dt){
 const before={y:a.y,grounded:a.grounded,jumps:a.jumps};
 const floor=trampolineSurface(s,a.x,a.z);
 // Commit horizontally and ease into a controlled vertical descent.
 a.vx=a.vz=0;
 if(!a.grounded||a.y>floor){
  a.grounded=false;
  const speed=-clamp((a.y-floor)*2.8,7,16);
  a.vy+=clamp(speed-a.vy,-38*dt,38*dt)+BODY.gravity*dt;
  worldMove(a,{},dt);
  resolveTrampoline(s,a,before);
 }
 if(a.grounded){
  emit(s,'balloon-land',a);
  a.flight=null;
  a.recoverUntil=s.time+.65;
  a.noTagUntil=a.recoverUntil;
 }
 return true;
}
function floatMove(s,a,dt,input={}){const f=a.flight;if(!f)return false;
 if(s.time<f.launchAt){worldMove(a,input,dt);return true;}
 const t=s.time-f.launchAt;if(f.stage==='prepare'){f.stage='float';f.launchY=a.y;f.peak=Math.max(f.peak,a.y+1);emit(s,'balloon-lift',a);}
 if(f.stage==='descend')return descendBalloon(s,a,dt);
 if(!f.landingApproach&&s.time>=f.nextTrack){f.nextTrack=s.time+.12;const target=landingFor(s,a,true);if(target){f.target=target;f.targetVx=s.player.vx;f.targetVz=s.player.vz;}else f.targetVx=f.targetVz=0;}
 const gap=near(a,s.player)-a.radius-s.player.radius,close=gap>=BALLOON_MIN_GAP&&gap<BALLOON_GAP+4;
 if(gap<45)f.nearSince??=s.time;
 else f.nearSince=null;
 const forced=t>=BALLOON_TRACK_LIMIT||f.nearSince!=null&&s.time-f.nearSince>=8;
 const seconds=clamp((a.y-worldHeight(a.x,a.z))/16+.35,.35,1.6);
 const predictedGap=Math.hypot(a.x-s.player.x-s.player.vx*seconds,a.z-s.player.z-s.player.vz*seconds)-a.radius-s.player.radius;
 const ready=close&&predictedGap>=BALLOON_MIN_GAP&&predictedGap<BALLOON_GAP+12;
 if(ready)f.closeSince??=s.time;
 else f.closeSince=null;
 if(forced||t>1.2&&f.closeSince!=null&&s.time-f.closeSince>=.18){
  const spot=balloonLandingSpot(a);
  if(spot){
   f.target=spot;
   f.stage='descend';
   return descendBalloon(s,a,dt);
  }
  if(forced&&!f.landingApproach){
   const nearby=balloonNearbyLanding(a);
   if(nearby){f.target=nearby;f.landingApproach=true;f.routeAt=0;}
  }
 }
 if(!f.route||s.time>=(f.routeAt??0)){f.routeAt=s.time+.6;f.route=worldRoute({...a,y:worldHeight(a.x,a.z)},f.target);}
 while(f.route.length>1&&near(a,f.route[0])<Math.max(10,a.radius+4)&&worldTraversable(a,f.route[1],a.radius+.1))f.route.shift();
 let steer=close&&!f.landingApproach?f.target:f.route[0]??f.target;
 if(!close||f.landingApproach){for(const p of f.route){if(near(a,p)>80||!worldTraversable(a,p,a.radius+.2)||!worldSight({...a,y:a.y+3},{...p,y:a.y+3},a.radius+.2))break;steer=p;}if(worldTraversable(a,f.target,a.radius+.2)&&worldSight({...a,y:a.y+3},{...f.target,y:a.y+3},a.radius+.2))steer=f.target;}
 const ahead={x:a.x+(steer.x-a.x)*Math.min(1,8/(near(a,steer)||1)),z:a.z+(steer.z-a.z)*Math.min(1,8/(near(a,steer)||1))};
 let lift=0;for(const h of[13,6,2,.1,0]){const p={x:a.x,z:a.z,y:worldHeight(a.x,a.z)+h},q={...ahead,y:worldHeight(ahead.x,ahead.z)+h};if(worldValid(p,a.radius+.1)&&worldValid(q,a.radius+.1)&&worldSight({...p,y:p.y+3},{...q,y:q.y+3},a.radius+.1)){lift=h;break;}}
 f.peak=worldHeight(a.x,a.z)+lift;
 const wanted=t<.8?f.launchY+(f.peak-f.launchY)*smooth(t/.8):f.peak;
 // Match the runner's velocity only on the final approach. At a detour
 // waypoint that velocity can point into the very tree we must go around.
 {a.grounded=false;a.vy+=(BODY.gravity+clamp((wanted-a.y)*14-a.vy*6,-55,55))*dt;const tracking=steer===f.target&&!f.landingApproach,vx=(steer.x-a.x)*8+((tracking?f.targetVx??0:0)-a.vx)*6,vz=(steer.z-a.z)*8+((tracking?f.targetVz??0:0)-a.vz)*6,k=Math.min(1,90/(Math.hypot(vx,vz)||1));a.vx+=vx*k*dt;a.vz+=vz*k*dt;}
 const horizontal=Math.hypot(a.vx,a.vz);if(horizontal>54){a.vx*=54/horizontal;a.vz*=54/horizontal;}
 const before={x:a.x,z:a.z,y:a.y,grounded:a.grounded,jumps:a.jumps},speed=a.tuning.speed;a.tuning.speed*=3;worldMove(a,{x:clamp((steer.x-a.x)/12,-1,1),z:clamp((steer.z-a.z)/12,-1,1),dash:true},dt);a.tuning.speed=speed;resolveTrampoline(s,a,before);
 if(!worldValid(a,a.radius-.01)){a.y=before.y;a.vy=0;if(!worldValid(a,a.radius-.01)){a.x=before.x;a.z=before.z;a.vx*=.2;a.vz*=.2;f.routeAt=0;}}
 // The bowl rim can rise by a small permitted step while the balloon ascends.
 // Keep feet on the surface instead of waiting for downward-velocity landing.
 const floor=worldHeight(a.x,a.z);if(a.y<floor){a.y=floor;a.vy=Math.max(0,a.vy);}
 return true;
}
function hopControl(s,a,input){
 if(a!==controlledHuntActor(s))input=steerClearOfHuntWind(s,a,input,{courtyard:usesCourtyardWind(s)&&a!==s.player,interruptOnSight:usesCourtyardReacquire(s),shareGates:s.rules===COURTYARD_TEAM_RULES});
 if(huntJumpRestRemaining(s,a)>0)return{...input,jump:false};
 if((a.brain?.supply||a.brain?.trampolineApproach)&&input.jump!==undefined)return input;if(!a.grounded)return{...input,jump:a.jumpHeld&&a.vy>0};
 if(s.time<a.nextHop)return input;if(trampolineObstacleJump(s,a,input)){a.nextHop=s.time+1;return{...input,jump:true};}const n=Math.hypot(input.x,input.z);if(n<.1)return input;
 const distance=a.radius+1.5+Math.hypot(a.vx,a.vz)*.12,p={x:a.x+input.x/n*distance,z:a.z+input.z/n*distance},h=worldHeight(p.x,p.z)-a.y;
 if(h>.65&&h<HUNT_JUMP.launch**2/(2*HUNT_JUMP.gravity)*.85&&worldValid({...p,y:worldHeight(p.x,p.z)},a.radius+.1)){a.nextHop=s.time+1;return{...input,jump:true};}return input;
}
function airbornePursuit(s,hunter,runner,visible,route){
 const brain=hunter.brain;
 const gap=near(hunter,runner);
 if(!visible||gap>36){
  brain.airPursuit=null;
  return null;
 }
 if(!runner.grounded)brain.airPursuitUntil=s.time+.55;
 if(s.time>=(brain.airPursuitUntil??0))return null;
 if(!brain.airPursuit||s.time>=brain.airPursuit.next){
  const floor=worldHeight(runner.x,runner.z);
  const height=Math.max(0,runner.y-floor);
  const landing=(runner.vy+Math.sqrt(runner.vy**2+2*HUNT_JUMP.gravity*height))/HUNT_JUMP.gravity;
  const lead=runner.grounded?.25:clamp(landing,.12,.6);
  const ahead={x:runner.x+runner.vx*lead,z:runner.z+runner.vz*lead};
  const padding=hunter.radius-.05;
  const current={x:runner.x,z:runner.z};
  const forward=(ahead.x-hunter.x)*(current.x-hunter.x)+(ahead.z-hunter.z)*(current.z-hunter.z);
  const currentClear=worldTraversable(hunter,current,padding);
  const goal=currentClear?(forward>0&&worldTraversable(hunter,ahead,padding)?ahead:current):null;
  brain.airPursuit={goal,next:s.time+.1};
 }
 const goal=brain.airPursuit.goal;
 return goal?worldSteering(hunter,goal,null):route;
}
function airbornePursuitAction(s,hunter,runner,control){
 if(hunter.dive||s.time<(hunter.recoverUntil??0))return control;
 const dx=runner.x-hunter.x,dz=runner.z-hunter.z,gap=Math.hypot(dx,dz);
 const rise=runner.y+runner.vy*.16-HUNT_JUMP.gravity*.16**2/2-hunter.y;
 // When the runner is vaulting directly towards the hunter, stay low.
 // Jumping in that lane too puts the hunter directly into the passing arc.
 const headOn=usesCornerReversal(s)&&gap>0&&runner.vx*dx+runner.vz*dz<=-8*gap;
 const jump=gap<=14&&!headOn&&rise>=2&&rise<=5.2&&!hunter.jumpHeld&&
   huntJumpRestRemaining(s,hunter)===0&&hunter.jumps<HUNT_JUMP.maxJumps&&
   (hunter.grounded||hunter.vy<=1);
 if(jump)return {...control,jump:true};
 if(control.jump||!hunter.grounded||s.time<(hunter.nextDiveAt??0)||
    s.time<(hunter.noTagUntil??0)||s.time<(runner.trampolineSafeUntil??0))return control;
 const speed=Math.hypot(hunter.vx,hunter.vz);
 const fx=speed>2?hunter.vx/speed:Math.sin(hunter.yaw);
 const fz=speed>2?hunter.vz/speed:Math.cos(hunter.yaw);
 const eta=HUNT_DIVE.prepare+HUNT_DIVE.slide*.6;
 const x=dx+runner.vx*eta,z=dz+runner.vz*eta;
 const along=x*fx+z*fz,side=Math.abs(x*fz-z*fx);
 const landing=worldHeight(hunter.x+x,hunter.z+z);
 const feet=runner.grounded?landing:Math.max(landing,runner.y+runner.vy*eta-HUNT_JUMP.gravity*eta**2/2);
 const dive=gap>=6&&along>=7&&along<=16&&side<=2.4&&Math.abs(feet-hunter.y)<=1.4;
 return dive&&worldTraversable(hunter,{x:hunter.x+x,z:hunter.z+z},hunter.radius-.05)?{...control,dive:true}:control;
}
function footprintAwareness(s,a){
 if(canSee(s,a,s.player,a.role==='patrol'?70:140))return;
 for(let i=s.footprints.length-1;i>=0;i--){const f=s.footprints[i];if(f.owner!=='player'||f.id===(a.brain.lastFootId??-1)||!canSee(s,a,{...f,y:f.y+.1},80))continue;const at=f.at??f.until-3.5;if(at<(a.brain.seenAt??-Infinity))continue;a.brain.lastFootId=f.id;a.brain.seen={x:f.x,z:f.z,y:f.y,vx:0,vz:0};a.brain.seenAt=at;a.brain.searchPlan=null;return;}
}
function collectAndPaint(s,a){
 if(!huntIsDizzy(s,a)&&!a.item)for(const p of s.pickups)if((p.audience==='player'?a.owner==='player':a.owner!=='player')&&p.readyAt<=s.time&&huntPermanentToolUseful(s,a,p.type)&&huntSupplyContact(a,p,s.time)){a.item=p.type;p.readyAt=s.time+24+random(s)*12;p.pull=null;if(p.home)Object.assign(p,p.home);emit(s,'pickup',a,{pickup:p.id,item:p.type});break;}
 // Hunter ink reveals only the runner's path, never the placing hunter or allies.

 if(a===s.player&&alive(s,a,'ink')&&a.grounded&&(!a.lastFoot||near(a,a.lastFoot)>2)){
  const f={id:s.nextId++,owner:a.owner,x:a.x+Math.cos(a.yaw)*((s.nextId-1)%2?1:-1)*a.radius*.28,z:a.z-Math.sin(a.yaw)*((s.nextId-1)%2?1:-1)*a.radius*.28,y:a.y,yaw:a.yaw,trampolineSupport:a.y>worldHeight(a.x,a.z)+.1&&trampolineSurface(s,a.x,a.z)===a.y,at:s.time,until:s.time+INK.trailSeconds};s.footprints.push(f);a.lastFoot={x:a.x,z:a.z};if(s.footprints.length>INK.maxFootprints)s.footprints.shift();
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
 s.gadgets=s.gadgets.filter(g=>['clone','cushion','curtain','sheet','fan'].includes(g.kind));
 s.zipTouch=null;s.time=Math.min(s.duration,s.time+dt);for(const h of s.hunters){delete h.effects.ink;} s.pools=[];s.footprints=s.footprints.filter(p=>p.owner===s.player.owner&&p.until>s.time&&!(p.trampolineSupport&&s.trampoline.used));
 const diveCooldown=usesShorterRest(s)?HUNT_DIVE.cooldown:6;
 const human=controlledHuntActor(s);if(huntIsDizzy(s,human))input={};input=huntJumpInput(s,human,input,{releaseRequired:true});if(input.use&&!s.useHeld)activateHuntItem(s,human.owner);s.useHeld=!!input.use;if(input.dive&&!s.diveHeld&&!input.jump)startHuntDive(s,human,diveCooldown);s.diveHeld=!!input.dive;itemForces(s,s.player,dt);tune(s,s.player);
 let runnerInput=input;if(s.config.mode==='hunt'&&!huntIsDizzy(s,s.player)){const runner=s.player,observations=s.hunters.filter(a=>canSee(s,runner,a,140)),seenOwners=new Set(observations.map(a=>a.owner));if(alive(s,runner,'radar')){if(s.time>=(runner.brain.radarAt??0)){runner.brain.radarAt=s.time+.75;runner.brain.radarContacts=radarObservations(s,runner);}observations.push(...(runner.brain.radarContacts??[]).filter(p=>!seenOwners.has(p.owner)));}const threat=observations.sort((a,b)=>near(a,runner)-near(b,runner))[0];runnerInput=runnerControl(s,observations);runnerInput=runnerHookControl(s,runnerInput,{poleVisible:p=>canSee(s,runner,{...p,y:p.y-3},132)});runnerInput=runnerSupplyControl(s,runnerInput,{usableOnly:usesRunnerSupply(s),itemVisible:p=>canSee(s,runner,{...p,y:p.y+(p.lift??0)},72)});const tactic=runnerItemTactic(s,runnerInput,{checkAllCushionThreats:usesRunnerCushion(s),checkFanExposure:usesRunnerFan(s)});if(tactic){runner.brain.nextToolAt=s.time+.35;const yaw=runner.yaw;runner.yaw=tactic.yaw;if(activateHuntItem(s)){runner.brain.nextToolAt=s.time+.8;if(['cloak','clone','curtain'].includes(tactic.item)){runner.brain.next=0;runner.brain.target=null;}}runner.yaw=yaw;}const padSafe=!s.trampoline.used&&near(runner,s.trampoline)<48&&safeTrampolineApproach(s);if(!padSafe)runner.brain.trampolineApproach=false;else runnerInput=trampolineEscapeControl(s,runner,runnerInput,!!threat);runnerInput=runnerPressureControl(s,runnerInput);runnerInput=cushionJumpControl(s,runner,runnerJumpControl(s,hopControl(s,runner,runnerInput)));}if(!moveHuntZip(s,s.player,dt))moveWithTrampoline(s,s.player,runnerInput,dt);afterMove(s,s.player);collectAndPaint(s,s.player);
 const coverage=usesCornerSearch(s)&&s.time>=45?(s.cornerSearch??={visited:0}):null;
 for(const a of s.hunters){
  itemForces(s,a,dt);tune(s,a);if(huntIsDizzy(s,a)){moveWithTrampoline(s,a,{},dt);afterMove(s,a);continue;}const actualVisible=canSee(s,a,s.player,a.role==='patrol'?70:140),decoy=!actualVisible?s.gadgets.find(g=>g.kind==='clone'&&canSee(s,a,g,a.role==='patrol'?70:140)):null;
  a.brain.suppressSight=!actualVisible&&!decoy;footprintAwareness(s,a);
  if(a!==human&&!actualVisible&&!decoy&&alive(s,a,'radar')&&s.time>=(a.brain.radarAt??0)){a.brain.radarAt=s.time+.75;const p=radarObservations(s,a).sort((x,y)=>near(a,x)-near(a,y)||x.x-y.x)[0];if(p){a.brain.seen={x:p.x,z:p.z,y:worldHeight(p.x,p.z),vx:0,vz:0};a.brain.seenAt=s.time;a.brain.next=0;a.brain.searchPlan=null;}}

  if(a.flight){floatMove(s,a,dt,a===human?input:{});afterMove(s,a);collectAndPaint(s,a);continue;}
  if(s.time>=a.brain.next||!a.brain.path){
   a.brain.reservedTargets=s.hunters.filter(h=>h!==a&&h.brain.target&&s.time-(h.brain.seenAt??-Infinity)<3).map(h=>({...h.brain.target}));
   a.brain.searchReservations=s.hunters.filter(h=>h!==a&&h.brain.target&&h.brain.seen&&a.brain.seen&&['search','last-seen'].includes(h.brain.mode)&&s.time-h.brain.seenAt<18&&Math.abs(h.brain.seenAt-a.brain.seenAt)<3&&near(h.brain.seen,a.brain.seen)<32).map(h=>({...h.brain.target}));
  }
  if(a===human){if(actualVisible){a.brain.seen={x:s.player.x,z:s.player.z,y:s.player.y,vx:s.player.vx,vz:s.player.vz};a.brain.seenAt=s.time;}if(a.flight)floatMove(s,a,dt,input);else if(!moveHuntDive(s,a,input,dt))moveWithTrampoline(s,a,input,dt);afterMove(s,a);collectAndPaint(s,a);continue;}
  huntSweepControl(a,{time:s.time,seed:s.config.seed,visible:actualVisible||!!decoy,coverage,team:s.hunters});
  const target=decoy??s.player;
  const route=worldPilot(a,target,true,s.time,a.brain,usesContactApproach(s));
  const pressure=s.rules!==PREVIOUS_HUNT_RULES?airbornePursuit(s,a,s.player,actualVisible,route):null;
  if(pressure)a.brain.supply=null;
  const control=pressure??huntSupplySteering(s,a,route,{playerVisible:actualVisible,itemVisible:p=>canSee(s,a,p,24)});
  if(s.time>(a.nextItemAt??2)&&huntItemOpportunity(s,a,{playerVisible:actualVisible})){a.nextItemAt=s.time+.35;if(activateHuntItem(s,a.owner))a.nextItemAt=s.time+12;}
  if(a.flight){floatMove(s,a,dt);afterMove(s,a);continue;}
  if(s.time<(a.recoverUntil??0))control.dash=false;
  let movement=hopControl(s,a,control);
  if(pressure&&a.brain.airPursuit.goal)movement=airbornePursuitAction(s,a,s.player,movement);
  movement=cushionJumpControl(s,a,movement);
  if(movement.dive&&!movement.jump)startHuntDive(s,a,diveCooldown);
  if(!a.dive||!moveHuntDive(s,a,movement,dt))moveWithTrampoline(s,a,movement,dt);
  afterMove(s,a);collectAndPaint(s,a);
 }
 hunterContacts(s);updateGadgets(s,dt);
 const catcher=s.hunters.find(a=>a.owner===s.zipTouch&&!huntIsDizzy(s,a))??s.hunters.find(a=>s.time>=(s.player.trampolineSafeUntil??0)&&!a.flight&&!huntIsDizzy(s,a)&&s.time>=(a.noTagUntil??0)&&huntBodiesTouch(a,s.player));
 if(catcher||s.time>=s.duration){s.phase='finished';s.result={caught:!!catcher,win:s.config.mode==='hunt'?!!catcher:!catcher,time:s.time,catcher:catcher?.owner??null};}
 return s;
}
// Nearby clear-space approach cues are not a through-wall enemy radar.
export function huntThreatCues(s){return s.hunters.filter(a=>canSee(s,s.player,a,52)).map(a=>({owner:a.owner,role:a.role,x:a.x,y:a.y+3,z:a.z,preparing:!!a.pendingItem||a.flight?.stage==='prepare'}));}
// Display data is read-only and includes an always-visual counterpart to sounds.
export function huntPresentation(s){const view=a=>({owner:a.owner,character:a.id,role:a.role,x:a.x,y:a.y,z:a.z,yaw:a.yaw,item:a.item,grounded:a.grounded,jumps:a.jumps,vy:a.vy,cloaked:alive(s,a,'cloak'),speedUp:alive(s,a,'speed'),flight:a.flight?structuredClone(a.flight):null});return{time:s.time,phase:s.phase,player:view(s.player),hunters:s.hunters.map(view),events:s.events.map(e=>structuredClone(e)),pools:s.pools.map(p=>({...p})),footprints:s.footprints.map(f=>({...f}))};}
export function recordHunt(config,{rules=HUNT_RULES}={}){if(![HUNT_RULES,CONTACT_APPROACH_RULES,CORNER_SEARCH_RULES,RUNNER_SUPPLY_RULES,RUNNER_CUSHION_RULES,RUNNER_FAN_RULES,COURTYARD_WIND_RULES,COURTYARD_REACQUIRE_RULES,COURTYARD_TEAM_RULES].includes(rules))throw Error('INVALID_HUNT_RULES');const s=createHunt(config),frames=[];s.rules=rules;return{state:s,tick(input={}){if(s.phase==='finished')return s;if(frames.length>=TRACE_CAPACITY)throw Error('TRACE_FULL');const x=input.x??0,z=input.z??0;if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>1||Math.abs(z)>1)throw Error('INVALID_INPUT');frames.push([x,z,(input.jump?1:0)|(input.dash?2:0)|(input.use?4:0)|(input.dive?8:0)]);return huntStep(s,input);},proof(){if(s.phase!=='finished')throw Error('ROUND_UNFINISHED');return{rules,config:structuredClone(s.config),frames:frames.map(f=>[...f]),claim:{...s.result}};}};}
export function verifyHunt(proof){if(![COURTYARD_TEAM_RULES,COURTYARD_REACQUIRE_RULES,COURTYARD_WIND_RULES,RUNNER_FAN_RULES,RUNNER_CUSHION_RULES,RUNNER_SUPPLY_RULES,CORNER_SEARCH_RULES,CONTACT_APPROACH_RULES,HUNT_RULES,SHORTER_REST_RULES,AIR_PURSUIT_RULES,PREVIOUS_HUNT_RULES].includes(proof?.rules)||proof?.config?.startKey!=='random'||!Array.isArray(proof.frames)||proof.frames.length>TRACE_CAPACITY)throw Error('INVALID_PROOF');const s=createHunt(proof.config);s.rules=proof.rules;for(const f of proof.frames){if(s.phase==='finished'||!Array.isArray(f)||f.length!==3||!Number.isFinite(f[0])||!Number.isFinite(f[1])||Math.abs(f[0])>1||Math.abs(f[1])>1||!Number.isInteger(f[2])||f[2]<0||f[2]>15)throw Error('INVALID_TRACE');huntStep(s,{x:f[0],z:f[1],jump:!!(f[2]&1),dash:!!(f[2]&2),use:!!(f[2]&4),dive:!!(f[2]&8)});}if(s.phase!=='finished'||JSON.stringify(s.result)!==JSON.stringify(proof.claim))throw Error('RESULT_MISMATCH');return{rules:s.rules,...s.result};}
