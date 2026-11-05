import{WORLD_BLOCKS,worldHeight,worldSight,worldValid}from'./imasora-sliding-tag-hunt-world.mjs';
import{INK,ITEM_DEFS,SUPPLY_COUNT}from'./imasora-sliding-tag-hunt-items.mjs';
import{MATCH_SECONDS}from'./imasora-sliding-tag-hunt-match.mjs';
import{controlledHuntActor}from'./imasora-sliding-tag-hunt.mjs';
import{HUNT_DIVE}from'./imasora-sliding-tag-hunt-dive.mjs';
// A bounded, presentation-only history. No CPU brains, proofs, home saves,
// models, video frames or input replay; playback cannot run a second match.
export const HUNT_REPLAY_SECONDS=6,HUNT_REPLAY_HZ=20,HUNT_REPLAY_CAPACITY=122;
const FULL_REPLAY_HZ=10,HIGHLIGHT_LIMIT=32;
const EMPTY_GADGETS=Object.freeze([]);
const immediateEffects=new Set(['cloak','sunglasses','radar','mirror','speed']);
export const HUNT_FULL_REPLAY_CAPACITY=MATCH_SECONDS*FULL_REPLAY_HZ+2;
const fields=['owner','id','kind','type','audience','x','y','z','vx','vy','vz','yaw','radius','grounded','jumps','slippery','item','readyAt','lift','bobPhase','until','ringingUntil','spawnedAt','attached','trampolineSupport','at','fake','used','usedAt','matRadius','top','launch'];
function row(a){if(!a)return null;const out={};for(const k of fields)if(['number','string','boolean'].includes(typeof a[k])||a[k]===null)out[k]=a[k];return out;}
function shareEffects(source,previous){
 if(previous){
  let size=0,unchanged=true;
  for(const key in source){
   if(!Object.hasOwn(source,key))continue;
   size++;
   if(!Object.hasOwn(previous,key)||!Object.is(source[key],previous[key])){unchanged=false;break;}
  }
  if(unchanged){
   for(const key in previous)size--;
   if(size===0)return previous;
  }
 }
 return Object.freeze({...source});
}
function flightPose(flight){
 return flight?{stage:flight.stage,since:flight.since,target:row(flight.target)}:null;
}
function actor(a,previous){return{...row(a),effects:shareEffects(a.effects,previous?.effects),dive:a.dive?{...a.dive}:null,pendingItem:a.pendingItem?{type:a.pendingItem.type,at:a.pendingItem.at}:null,hook:row(a.hook),flight:flightPose(a.flight)};}
function replaySnapshot(s,pickups,footprints,gadgets,previous){
 const config=previous&&previous.config.mode===s.config.mode?previous.config:Object.freeze({mode:s.config.mode});
 const trampoline=sameRow(s.trampoline,previous?.trampoline)?previous?.trampoline??null:Object.freeze(row(s.trampoline));
 return{time:s.time,phase:s.phase,config,player:actor(s.player,previous?.player),
  hunters:s.hunters.slice(0,3).map((hunter,i)=>actor(hunter,previous?.hunters[i])),trampoline,pickups,
  pools:s.pools.slice(0,4).map(row),footprints,gadgets};
}
export function huntReplaySnapshot(s){
 return replaySnapshot(s,s.pickups.slice(0,SUPPLY_COUNT).map(row),s.footprints.slice(-INK.maxFootprints).map(row),s.gadgets.slice(0,12).map(row));
}
function sameRow(source,previous){
 if(!source||!previous)return !source&&previous===null;
 for(const key of fields)if(!Object.is(source[key],previous[key]))return false;
 return true;
}
// Reuse the list while every row is identical. Copy only after the first
// changed slot, so static supplies and trails do not allocate per frame.
function shareRows(source,start,length,previous,copy){
 let next=length===previous.length?null:[];
 for(let i=0;i<length;i++){
  const value=copy(source[start+i],previous[i]);
  if(!next&&value!==previous[i])next=previous.slice(0,i);
  if(next)next.push(value);
 }
 return next?Object.freeze(next):previous;
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const diveRecoveryAge=HUNT_DIVE.prepare+HUNT_DIVE.slide;
function between(a,b,t,out={}){
 Object.assign(out,a);
 for(const key of ['x','y','z','vx','vy','vz']){
  if(Number.isFinite(a[key])&&Number.isFinite(b?.[key]))out[key]=a[key]+(b[key]-a[key])*t;
 }
 if(Number.isFinite(a.yaw)&&Number.isFinite(b?.yaw)){
  out.yaw=a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*t;
 }
 return out;
}
function sampleActor(a,b,t,time,previousTime,out){
 const actor=between(a,b,t,out);
 if(b?.actorChanges){
  let effects=null;
  for(const {time:at,key,value} of b.actorChanges){
   if(at>time)break;
   if(at<=previousTime)continue;
   if(key==='item'||key==='pendingItem'||key==='hook')actor[key]=value;
   else{
    effects??={...actor.effects};
    effects[key]=value;
   }
  }
  if(effects)actor.effects=Object.freeze(effects);
 }
 const changes=b?.flightChanges;
 if(changes)for(const change of changes){
  if(change.time<=previousTime)continue;
  if(change.time>time)break;
  actor.flight=change.flight;
  actor.grounded=change.grounded;
 }
 if(Number.isFinite(b?.jumpAt)&&b.jumpAt!==a.jumpAt&&time>=b.jumpAt){
  actor.grounded=false;
  actor.jumps=b.jumps;
  actor.jumpAt=b.jumpAt;
 }
 const nextDive=b?.dive;
 let dive=a.dive;
 if(nextDive&&Number.isFinite(nextDive.since)){
  // A wall hit rebases the dive clock to the start of recovery.
  const changeAt=nextDive.since+(nextDive.stage==='recover'?diveRecoveryAge:0);
  if(time+1e-9>=changeAt)dive=nextDive;
 }
 if(!nextDive&&Number.isFinite(b?.diveEndedAt)&&time>=b.diveEndedAt)dive=null;
 if(Number.isFinite(dive?.since)){
  const age=Math.max(0,time-dive.since);
  const stage=age<HUNT_DIVE.prepare?'prepare':age+1e-9<diveRecoveryAge?'slide':'recover';
  dive={...dive,age,stage};
 }
 actor.dive=dive;
 return actor;
}
function samplePickups(a,b,time){
 if(a===b)return a;
 let changed=null;
 for(let i=0;i<a.length;i++){
  const current=a[i],next=b[i];
  if(!next||next.id!==current.id||next.readyAt===current.readyAt||
     !Number.isFinite(next.collectedAt)||next.collectedAt>time)continue;
  changed??=a.slice();
  changed[i]=next;
 }
 return changed?Object.freeze(changed):a;
}
function sampleFootprints(a,b,time){
 const prior=a.footprints,next=b.footprints;
 // Both histories append marks in order. Only the new tail may begin
 // between snapshots; earlier removals still follow their own expiry.
 let start=next.length,end=next.length;
 if(prior!==next){
  while(start>0&&next[start-1].at>a.time)start--;
  end=start;
  while(end<next.length&&next[end].at<=time)end++;
 }
 if(start===end&&!prior.some(mark=>mark.until<=time))return prior;
 let visible=prior;
 for(let i=start;i<end;i++){
  const mark=next[i];
  visible=visible.filter(foot=>!(foot.until<=mark.at));
  visible.push(mark);
  if(visible.length>INK.maxFootprints)visible.shift();
 }
 return Object.freeze(visible.filter(mark=>!(mark.until<=time)));
}
function sampleGadgets(a,b,t,time,shareGadgets){
 if(shareGadgets&&a.gadgets===b.gadgets&&!b.cloneEnds&&
    a.gadgets.every(gadget=>!Number.isFinite(gadget.until)||gadget.until>time))return a.gadgets;
 const visible=[];
 for(const gadget of a.gadgets){
  const end=b.cloneEnds?.get(gadget.id);
  const until=end?.until??gadget.until;
  if(Number.isFinite(until)&&until<=time)continue;
  const next=b.gadgets.find(candidate=>candidate.id===gadget.id);
  if(shareGadgets&&next===gadget&&!end)visible.push(gadget);
  else visible.push(next||!end?between(gadget,next,t):between(gadget,end,(time-a.time)/(until-a.time)));
 }
 const newGadgets=b.cloneEnds?[...b.gadgets,...b.cloneEnds.values()]:b.gadgets;
 for(const gadget of newGadgets){
  const start=gadget.startPose;
  if(!start||time<start.spawnedAt||time>=gadget.until||
     a.gadgets.some(previous=>previous.id===gadget.id))continue;
  if(visible.length===12)break;
  const span=Math.min(b.time,gadget.until??Infinity)-start.spawnedAt;
  visible.push(between(start,gadget,span>0?(time-start.spawnedAt)/span:0));
 }
 return visible;
}
function sampleFrame(frames,time,view,shareGadgets=false){
 if(!frames.length)return null;
 time=clamp(time,frames[0].time,frames.at(-1).time);
 let i=0,hi=frames.length;
 while(i+1<hi){
  const mid=Math.floor((i+hi)/2);
  if(frames[mid].time<=time)i=mid;
  else hi=mid;
 }
 const a=frames[i],b=frames[i+1]??a,t=b.time>a.time?(time-a.time)/(b.time-a.time):0;
 const out=view??{player:{},hunters:[]};
 const {player,hunters}=out;
 Object.assign(out,a);
 out.time=time;
 if(b.trampoline?.used&&Number.isFinite(b.trampoline.usedAt)&&time>=b.trampoline.usedAt)out.trampoline=b.trampoline;
 out.pickups=samplePickups(a.pickups,b.pickups,time);
 out.footprints=sampleFootprints(a,b,time);
 out.player=sampleActor(a.player,b.player,t,time,a.time,player);
 hunters.length=a.hunters.length;
 for(let j=0;j<hunters.length;j++)hunters[j]=sampleActor(a.hunters[j],b.hunters[j],t,time,a.time,hunters[j]);
 out.hunters=hunters;
 out.gadgets=sampleGadgets(a,b,t,time,shareGadgets);
 return out;
}
export function sampleHuntReplay(frames,time){return sampleFrame(frames,time,null);}

const REPLAY_PITCH=.82,FULL_REPLAY_PITCH=.92,REPLAY_PORTRAIT_MAX_DISTANCE=144,REPLAY_HALF_FOV_TAN=Math.tan(28*Math.PI/180);
export function huntReplayCamera(s,catcher,aspect=1,follow=s.player){
 if(!catcher)return{target:{x:follow.x,y:follow.y+3,z:follow.z},yaw:follow.yaw+Math.PI,pitch:REPLAY_PITCH,distance:aspect<1?76:66,minDistance:aspect<1?57:49};
 const a=s.player,b=s.hunters.find(h=>h.owner===catcher)??s.hunters[0];
 const portrait=aspect<1,gap=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),framedGap=Math.min(gap,portrait?112:72);
 const weight=gap>0?framedGap/(2*gap):.5;
 // On narrow screens, a distant pair fits along the depth of the shot.
 const narrowScale=1-Math.max(0,framedGap-72)/40*(1-Math.min(1,aspect/.53));
 const sideAngle=Math.PI/2*Math.min(1,(portrait?23*narrowScale:72)/Math.max(1,framedGap));
 const room=(framedGap*.5*Math.sin(sideAngle)+Math.max(a.radius??2.7,b.radius??2.7)+1.5)/(.53*Math.max(.35,aspect));
 const distance=clamp(Math.max((portrait?68:59)+framedGap*.8,room),59,portrait?REPLAY_PORTRAIT_MAX_DISTANCE:110);
 // Keep the extra room when an obstruction would otherwise move the camera closer.
 const distanceFloor=portrait?54+Math.max(0,framedGap-72)*2:46;
 const subjects=gap<=72?[a,b].map(actor=>({x:actor.x,y:actor.y+2.7,z:actor.z})):null;
 return{target:{x:a.x+(b.x-a.x)*weight,y:a.y+Math.max(0,b.y-a.y)*weight+3,z:a.z+(b.z-a.z)*weight},yaw:Math.atan2(b.x-a.x,b.z-a.z)+sideAngle,pitch:REPLAY_PITCH,distance,minDistance:Math.min(distance,Math.max(distanceFloor,room)),subjects};
}
function replayTarget(shot,focus){
 return worldValid(shot.target,.8)?shot.target:{x:focus.x,y:focus.y+4,z:focus.z};
}
function checkReplayAngle({target,subjects},yaw,pitch,distance,aspect,padding=0){
 const sinYaw=Math.sin(yaw),cosYaw=Math.cos(yaw),sinPitch=Math.sin(pitch),cosPitch=Math.cos(pitch);
 const position={x:target.x+distance*sinYaw*cosPitch,y:target.y+distance*sinPitch,z:target.z+distance*cosYaw*cosPitch};
 if(position.y<=worldHeight(position.x,position.z)+.2||!worldSight(target,position,.8))return -1;
 let visible=true;
 for(const subject of subjects){
  const x=subject.x-target.x,y=subject.y-target.y,z=subject.z-target.z;
  const along=x*sinYaw+z*cosYaw,depth=distance-along*cosPitch-y*sinPitch;
  const vertical=depth*REPLAY_HALF_FOV_TAN*.94;
  if(depth<1||Math.abs(y*cosPitch-along*sinPitch)>vertical||Math.abs(x*cosYaw-z*sinYaw)>vertical*aspect)return -1;
  if(!worldSight(subject,position,padding))visible=false;
 }
 return visible?1:0;
}
function planFinishView(clip,aspect){
 const samples=[];
 for(let i=0;i<=24;i++){
  const frame=sampleFrame(clip.frames,clip.start+(clip.end-clip.start)*i/24,null);
  const catcher=frame.hunters.find(h=>h.owner===clip.catcher);
  if(!catcher)return null;
  const shot=huntReplayCamera(frame,clip.catcher,aspect);
  samples.push({...shot,center:shot.target,target:replayTarget(shot,frame.player),subjects:[frame.player,catcher].map(a=>({x:a.x,y:a.y+2.7,z:a.z}))});
 }
 const scores=samples.map(s=>checkReplayAngle(s,s.yaw,s.pitch,s.distance,aspect));
 const distance=Math.max(...samples.map(s=>s.distance));
 if(scores.filter(score=>score===0).length>=5){
  const clear=scores.filter(score=>score===1).length;
  const plan=findFinishAngle(samples,aspect,distance,clear+3);
  if(plan)return plan;
 }
 if(aspect>=1||samples.filter(s=>s.target!==s.center).length<3)return null;
 // Keep the focus on the pair as it crosses the building. A fixed lift clears
 // the highest roof on that path without jumping up and down at each wall.
 let lift=0;
 for(const {center} of samples)for(const block of WORLD_BLOCKS){
  if(Math.abs(center.x-block.x)>block.w/2+.8||Math.abs(center.z-block.z)>block.d/2+.8)continue;
  lift=Math.max(lift,(block.base??0)+block.h+1-center.y);
 }
 if(!lift)return null;
 const raised=samples.map(s=>({...s,target:{...s.center,y:s.center.y+lift}}));
 const plan=findFinishAngle(raised,aspect,REPLAY_PORTRAIT_MAX_DISTANCE,samples.length-1);
 return plan?{...plan,lift}:null;
}
function findFinishAngle(samples,aspect,distance,bestClear){
 let best=null;
 for(const pitch of [REPLAY_PITCH,1,1.16,1.29])for(let i=0;i<12;i++){
  const step=Math.ceil(i/2)*(i%2?1:-1);
  const yaw=samples[0].yaw+step*Math.PI/6;
  let count=0,valid=true;
  for(const sample of samples){
   const score=checkReplayAngle(sample,yaw,pitch,distance,aspect,.25);
   if(score<0){valid=false;break;}
   count+=score;
  }
  if(valid&&count>bestClear){
   best={yaw,pitch,distance};bestClear=count;
   if(count===samples.length)return best;
  }
 }
 return best;
}
export function updateHuntReplayView(camera,state,{catcher,aspect,focus=state.player,dt,viewPlan,scope='finish'}){
 const shot=huntReplayCamera(state,catcher,aspect,focus);
 const target=viewPlan?.lift?{...shot.target,y:shot.target.y+viewPlan.lift}:replayTarget(shot,focus);
 const options=viewPlan?{...shot,...viewPlan,subjects:null,keepAngle:true}:shot;
 if(scope==='full'){
  options.pitch=FULL_REPLAY_PITCH;
  options.subjects=[.35,2.7].map(offset=>({x:focus.x,y:focus.y+offset,z:focus.z}));
 }
 return{target,pose:camera.update(target,{...options,wide:true,dt})};
}
export function createHuntReplay(){let frames=[],fullFrames=[],sounds=[],highlights=[],outcome=null,clip=null,elapsed=0,active=false,paused=false,view=null,lastTime=null,footprintCache=new WeakMap(),footprintRowsCreated=0,footprintRowsReused=0;
 const activeDives=[false,false,false],diveEndTimes=[null,null,null];
 const scarfPreparations=[null,null,null];
 const flightStages=[null,null,null],flightChanges=[[],[],[]];
 const pickupTimes=new Map(),actorChanges=new Map();
 const recentClones=new Set();
 let gadgetStarts=new WeakMap(),hookWasAttached=false;
 const jumpStages=[0,0,0,0],jumpTimes=[null,null,null,null];
 let lastStepSoundAt=-Infinity,actionSoundCount=0;
 function trackJump(a,index,time,relaunch=false){
  const stage=a.grounded?0:a.jumps;
  if(stage!==jumpStages[index]||relaunch){
   jumpStages[index]=stage;
   jumpTimes[index]=stage>0?time:null;
  }
 }
 // Share immutable copies, never simulation objects. Check the allowlisted
 // values so a changed footprint cannot rewrite an earlier frame.
 function copyFootprint(source){
  if(!source||typeof source!=='object')return row(source);
  const prior=footprintCache.get(source);

  if(sameRow(source,prior)){footprintRowsReused++;return prior;}
  const copy=Object.freeze(row(source));footprintCache.set(source,copy);footprintRowsCreated++;return copy;
 }
 function copySupply(source,previous){
  if(sameRow(source,previous))return previous;
  const supply=row(source),collectedAt=pickupTimes.get(source.id);
  if(collectedAt!==undefined)Object.defineProperty(supply,'collectedAt',{value:collectedAt});
  return Object.freeze(supply);
 }
 function rememberActorChange(owner,time,key,value){
  const changes=actorChanges.get(owner)??[];
  if(!changes.some(change=>change.time===time&&change.key===key&&change.value===value)){
   changes.push({time,key,value});
  }
  actorChanges.set(owner,changes);
 }
 function record(s,{force=false,lighting,feedbackCues}={}){if(active||!['playing','finished'].includes(s.phase)||!Number.isFinite(s.time))return false;const prev=frames.at(-1);if(prev&&s.time<prev.time)return false;
  for(const event of s.events){
   if(event.type==='pickup'){
    pickupTimes.set(event.pickup,event.time);
    if(typeof event.item==='string')rememberActorChange(event.owner,event.time,'item',event.item);
   }else if(event.type==='item-use'){
    rememberActorChange(event.owner,event.time,'item',null);
   }else if(event.type==='item-prepare'){
    const pending=s.hunters.find(hunter=>hunter.owner===event.owner)?.pendingItem;
    if(pending)rememberActorChange(event.owner,event.time,'pendingItem',Object.freeze({type:pending.type,at:pending.at}));
   }
   let owner=event.owner,key,until=event.until;
   if(event.type==='cushion-bump')key='dizzy';
   else if(event.type==='runner-inked'){owner=event.target;key='ink';}
   else if(event.type==='item-use'&&immediateEffects.has(event.item)){
    key=event.item;
    const wearer=owner===s.player.owner?s.player:s.hunters.find(hunter=>hunter.owner===owner);
    until=wearer?.effects[key];
   }
   if(key&&Number.isFinite(until))rememberActorChange(owner,event.time,key,until);
  }
  for(const gadget of s.gadgets){
   if(gadget.spawnedAt===s.time&&!gadgetStarts.has(gadget))gadgetStarts.set(gadget,Object.freeze(row(gadget)));
   if(gadget.kind==='clone'&&Number.isFinite(gadget.until))recentClones.add(gadget);
  }
  // The hook can end through movement or contact without a release event.
  const hookAttached=!!s.player.hook;
  if(hookAttached!==hookWasAttached){
   const hook=row(s.player.hook);
   rememberActorChange(s.player.owner,s.time,'hook',hook&&Object.freeze(hook));
   hookWasAttached=hookAttached;
  }
  const human=s.config.mode==='hunt'?controlledHuntActor(s):null;
  trackJump(s.player,0,s.time,s.trampoline?.usedAt===s.time&&s.trampoline.used);
  for(let i=0;i<s.hunters.length;i++){
   const hunter=s.hunters[i],diving=!!hunter.dive;
   const preparation=scarfPreparations[i];
   if(hunter.pendingItem?.type==='scarf'){
    scarfPreparations[i]=hunter.effects.speed??0;
   }else if(preparation!==null){
    scarfPreparations[i]=null;
    rememberActorChange(hunter.owner,s.time,'pendingItem',null);
    const speed=hunter.effects.speed;
    if(Number.isFinite(speed)&&speed!==preparation)rememberActorChange(hunter.owner,s.time,'speed',speed);
   }
   trackJump(hunter,i+1,s.time);
   const stage=hunter.flight?.stage??null;
   if(stage!==flightStages[i]){
    flightStages[i]=stage;
    flightChanges[i].push({time:s.time,flight:flightPose(hunter.flight),grounded:hunter.grounded});
   }
   if(diving===activeDives[i])continue;
   activeDives[i]=diving;
   diveEndTimes[i]=diving?null:s.time;
   if(diving&&hunter===human)recordHighlight({type:'dive-start',owner:hunter.owner,time:s.time},hunter.owner);
  }
  if(!force&&prev&&s.time-prev.time<1/HUNT_REPLAY_HZ-1e-8)return false;
  const pickupRows=shareRows(s.pickups,0,Math.min(s.pickups.length,SUPPLY_COUNT),prev?.pickups??[],copySupply);
  const footprintCount=Math.min(s.footprints.length,INK.maxFootprints);
  const footprintRows=shareRows(s.footprints,s.footprints.length-footprintCount,footprintCount,prev?.footprints??[],copyFootprint);
  const gadgetRows=shareRows(s.gadgets,0,Math.min(s.gadgets.length,12),prev?.gadgets??EMPTY_GADGETS,(source,previous)=>{
   const start=gadgetStarts.get(source);
   const startPose=start&&s.time-start.spawnedAt<=1/FULL_REPLAY_HZ+1e-8?start:undefined;
   if(sameRow(source,previous)&&previous.startPose===startPose)return previous;
   const gadget=row(source);
   if(startPose)Object.defineProperty(gadget,'startPose',{value:startPose});
   return Object.freeze(gadget);
  });
  const snap=replaySnapshot(s,pickupRows,footprintRows,gadgetRows,prev);
  // Contact shortens a clone's lifetime before the simulation removes it.
  let cloneEnds;
  for(const clone of recentClones){
   if(s.time-clone.until>1/FULL_REPLAY_HZ+1e-8)recentClones.delete(clone);
   else if(clone.until<=s.time){
    cloneEnds??=new Map();
    const end=row(clone),start=gadgetStarts.get(clone);
    if(start&&s.time-start.spawnedAt<=1/FULL_REPLAY_HZ+1e-8)end.startPose=start;
    cloneEnds.set(clone.id,Object.freeze(end));
   }
  }
  if(cloneEnds)Object.defineProperty(snap,'cloneEnds',{value:cloneEnds});
  // Keep item and effect changes that fall between both the 20 Hz and 10 Hz snapshots.
  for(const actor of [snap.player,...snap.hunters]){
   const changes=actorChanges.get(actor.owner);
   if(!changes)continue;
   while(changes.length&&s.time-changes[0].time>1/FULL_REPLAY_HZ+1e-8)changes.shift();
   if(changes.length)Object.defineProperty(actor,'actorChanges',{value:changes.slice()});
   else actorChanges.delete(actor.owner);
  }
  snap.player.jumpAt=jumpTimes[0];
  for(let i=0;i<snap.hunters.length;i++){
   snap.hunters[i].jumpAt=jumpTimes[i+1];
   const changes=flightChanges[i];
   while(changes.length&&s.time-changes[0].time>1/FULL_REPLAY_HZ+1e-8)changes.shift();
   if(changes.length)Object.defineProperty(snap.hunters[i],'flightChanges',{value:changes.slice()});
   const endedAt=diveEndTimes[i];
   if(endedAt!==null&&s.time-endedAt<=1/FULL_REPLAY_HZ+1e-8){
    Object.defineProperty(snap.hunters[i],'diveEndedAt',{value:endedAt});
   }
  }
  const recordedLighting=lighting??prev?.lighting;
  if(recordedLighting)snap.lighting=recordedLighting;
  const recordedCues=feedbackCues??prev?.feedbackCues;
  if(recordedCues)snap.feedbackCues=recordedCues;
  if(prev?.time===s.time)frames[frames.length-1]=snap;else frames.push(snap);
  const fullPrev=fullFrames.at(-1);
  if(fullPrev?.time===s.time)fullFrames[fullFrames.length-1]=snap;
  else if(fullFrames.length<HUNT_FULL_REPLAY_CAPACITY&&
          (force||!fullPrev||s.time-fullPrev.time>=1/FULL_REPLAY_HZ-1e-8))fullFrames.push(snap);
  while(frames.length>HUNT_REPLAY_CAPACITY)frames.shift();while(frames.length>2&&frames[1].time<s.time-HUNT_REPLAY_SECONDS)frames.shift();return true;}
 function recordHighlight(event,owner){
  if(active||event.owner!==owner||!Number.isFinite(event.time)||event.time<0||event.time>MATCH_SECONDS)return false;
  let label;
  if(event.type==='trampoline-bounce')label='トランポリン';
  else if(event.type==='dive-start')label='ダイブ';
  else if(event.type==='item-use'||event.type==='pickup'){
   const item=ITEM_DEFS[event.item];
   if(item)label=(event.type==='pickup'?'取得 · ':'使用 · ')+item.name;
  }
  const last=highlights.at(-1);
  if(!label||last&&(event.time<last.time||event.time-last.time<.25&&label===last.label))return false;
  highlights.push({time:event.time,label,pickup:event.type==='pickup'});
  if(highlights.length>HIGHLIGHT_LIMIT){
   const firstPickup=highlights.findIndex(mark=>mark.pickup);
   highlights.splice(Math.max(0,firstPickup),1);
  }
  return true;
 }
 function highlightList(){
  if(!active||clip.scope!=='full')return [];
  const {start,end,catcher}=clip;
  const seek=(time,lead)=>Math.max(start,time-lead);
  return [
   ...highlights.filter(event=>event.time>=start&&event.time<=end)
    .map(({time,label,pickup})=>({time,label,seek:seek(time,pickup?2:1.25)})),
   {label:catcher?'タッチで決着':'時間切れ',time:end,seek:seek(end,2.5)},
  ];
 }
 function recordSound(time,{type,stage}){
  if(active||!Number.isFinite(time)||time<0||time>MATCH_SECONDS||
     time<(sounds.at(-1)?.time??0))return;
  if(type==='step'){
   // Keep the same minimum spacing as the live footstep effect.
   if(time-lastStepSoundAt<.12-1e-9)return;
   lastStepSoundAt=time;
  }else{
   if(!['jump','land','item'].includes(type)||actionSoundCount>=2048)return;
   actionSoundCount++;
  }
  sounds.push({time,cue:type==='jump'?{type,stage}:{type}});
 }
 function soundsAt(time,delta){
  if(!active||paused||delta<=0)return [];
  // Skip stale sounds after a slow frame instead of playing a pile at once.
  const previous=time-Math.min(delta,.22);
  let lo=0,hi=sounds.length;
  while(lo<hi){
   const mid=(lo+hi)>>>1;
   if(sounds[mid].time<=previous+1e-9)lo=mid+1;else hi=mid;
  }
  const cues=[];
  for(;lo<sounds.length&&sounds[lo].time<=time;lo++)cues.push(sounds[lo].cue);
  return cues;
 }
 function complete(s){
  if(!s?.result)return false;
  record(s,{force:true});
  if(frames.length<2||frames.at(-1).time<=frames[0].time)return false;
  outcome={catcher:s.result.catcher,end:frames.at(-1).time};
  return true;
 }
 function start(s,{scope='finish'}={}){
  if(s&&!complete(s))return false;
  if(!outcome)return false;
  const full=scope==='full',source=full?fullFrames:frames;
  const start=full?source[0].time:Math.max(source[0].time,outcome.end-HUNT_REPLAY_SECONDS);
  clip={...outcome,frames:source,start,scope,speed:full?1:.8};
  active=true;paused=false;elapsed=0;view=null;lastTime=null;
  return true;
 }
 function viewPlan(aspect){
  if(!active||clip.scope!=='finish'||!clip.catcher)return null;
  if(clip.plannedAspect===undefined||Math.abs(aspect/clip.plannedAspect-1)>.02){
   clip.viewPlan=planFinishView(clip,aspect);
   clip.plannedAspect=aspect;
  }
  return clip.viewPlan;
 }
 function seek(time){
  if(!active||clip.scope!=='full'||!Number.isFinite(time))return false;
  elapsed=(clamp(time,clip.start,clip.end)-clip.start)/clip.speed;
  paused=true;
  lastTime=null;
  view=null;
  return true;
 }
 function setSpeed(speed){
  if(!active||clip.scope!=='full'||![.5,1,2].includes(speed))return false;
  const span=clip.end-clip.start,previousDuration=span/clip.speed;
  const playhead=Math.min(span,elapsed*clip.speed);
  // The endpoint hold follows wall time, even when changing speed there.
  elapsed=playhead/speed+Math.max(0,elapsed-previousDuration);
  clip.speed=speed;
  return true;
 }
 function setPaused(next){
  if(!active||clip.scope!=='full')return false;
  paused=!!next;
  return true;
 }
 // Presentation follows elapsed time, not the number of rendered frames.
 // A throttled browser must not turn eight seconds into eighty and outlive
 // the recorder's bounded deadline. Show both endpoints before completing.
 function advance(dt){
  if(!active)return null;
  const previous=lastTime,duration=(clip.end-clip.start)/clip.speed+.5;
  if(!paused&&previous!==null&&Number.isFinite(dt)&&dt>0)elapsed=Math.min(duration,elapsed+dt);
  const time=Math.min(clip.end,clip.start+elapsed*clip.speed);
  // Seek and start invalidate the view. The final hold can reuse it while
  // the clock still advances towards the results.
  if(!view||time!==previous)view=sampleFrame(clip.frames,time,view,true);
  lastTime=time;
  const holdingEnd=time===clip.end&&previous===clip.end;
  const done=!paused&&elapsed>=duration&&holdingEnd;
  return{state:view,delta:previous===null?0:Math.max(0,time-previous),done,
   catcher:clip.catcher,progress:clamp((time-clip.start)/(clip.end-clip.start),0,1)};
 }
 return{record,recordHighlight,highlightList,recordSound,soundsAt,complete,start,advance,viewPlan,seek,setSpeed,setPaused,stop(){active=false;paused=false;view=null;lastTime=null;},reset(){frames=[];fullFrames=[];sounds=[];lastStepSoundAt=-Infinity;actionSoundCount=0;highlights=[];pickupTimes.clear();actorChanges.clear();recentClones.clear();hookWasAttached=false;flightStages.fill(null);for(const changes of flightChanges)changes.length=0;gadgetStarts=new WeakMap();activeDives.fill(false);diveEndTimes.fill(null);scarfPreparations.fill(null);outcome=null;clip=null;active=false;paused=false;view=null;lastTime=null;elapsed=0;jumpStages.fill(0);jumpTimes.fill(null);footprintCache=new WeakMap();footprintRowsCreated=footprintRowsReused=0;},get active(){return active;},get paused(){return paused;},get scope(){return clip?.scope??null;},get available(){return!!outcome;},stats:()=>({frames:frames.length,capacity:HUNT_REPLAY_CAPACITY,fullFrames:fullFrames.length,fullCapacity:HUNT_FULL_REPLAY_CAPACITY,scope:clip?.scope??null,active,available:!!outcome,start:clip?.start??null,end:clip?.end??null,elapsed,footprintRowsCreated,footprintRowsReused})};
}

export function createHuntReplaySound(){
 let ended=false;
 return{
  reset(){ended=false;},
  sample(cues,{atEnd=false,caught=false}={}){
   if(!atEnd||ended)return cues;
   ended=true;
   return [...cues,{type:caught?'touch':'timeout'}];
  },
 };
}
