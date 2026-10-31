// Ambient encounters own no physics, rewards or save data. They use elapsed
// visible time, not a catch-up queue after a suspended tab or a loaded save.
export const COAST_ENCOUNTER_SECONDS=Object.freeze({gulls:22,fish:19,dolphins:24,whale:27,meteor:2.2,ufo:24});
export const COAST_WHALE_SCENE_SECONDS=7;
export const COAST_WHALE_APPROACH=430;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function coastWhalePresentation(e){
 const scene=e?.whaleScene;if(!scene)return null;const age=scene.age,dive=smooth((age-2.3)/4.2),rise=smooth(age/.7),fade=((scene.startFade??1)+(1-(scene.startFade??1))*rise)*(1-smooth((age-6.4)/.6));
 return {age,dive,fade,blow:age>=.6&&age<2.7?Math.sin(Math.PI*(age-.6)/2.1):0,weight:rise*(1-smooth((age-6.15)/.85)),x:scene.point.x+Math.sin(e.heading)*dive*45,z:scene.point.z+Math.cos(e.heading)*dive*45,y:(scene.startY??10)+(10-(scene.startY??10))*rise-dive*190,pitch:(scene.startPitch??0)*(1-rise)+Math.sin(dive*Math.PI)*.58,watching:scene.reason==='approach'&&age<COAST_WHALE_SCENE_SECONDS};
}
const marine=new Set(['fish','dolphins','whale']);
export function coastEncounterPoint(e,age=0,side=0,ahead=0){
 const along=e.speed*age+ahead,lateral=e.cross*age+side;
 return{x:e.x+Math.sin(e.heading)*along+Math.cos(e.heading)*lateral,z:e.z+Math.cos(e.heading)*along-Math.sin(e.heading)*lateral};
}
export function coastEncounterWaterClear(e,ground,waterY,age=0){
 if(!marine.has(e.kind))return true;
 const radius=e.kind==='whale'?220:e.kind==='dolphins'?85:70,depth=e.kind==='whale'?220:e.kind==='dolphins'?18:5;
 for(const [side,ahead]of[[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius]]){const p=coastEncounterPoint(e,age,side,ahead);if(!(ground(p.x,p.z)<waterY-depth))return false;}
 return true;
}
export function createCoastEncounters({random=Math.random,ground=()=>-240}={}){
 let active=null,wait=8+random()*8,lastTime=null,lastNight=null,bag=[],serial=0,waterCheck=0;
 const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
 function finish(){wait=(active?.kind==='ufo'?50:active?.kind==='meteor'?18:17)+random()*27;active=null;}
 return {get active(){return active;},update({time,night=false,actor,heading=0,raft=null,level=1,waterY=-4.5,paused=false,watchWhale=true}){
  if(!Number.isFinite(time)||!actor)return null;
  const elapsed=lastTime===null?0:Math.max(0,(time-lastTime)/1000),dt=Math.min(.1,elapsed);lastTime=time;
  if(paused)return active;
  if(night!==lastNight){bag=[];lastNight=night;if(active)active.ending=true;}
  if(active){
   if(active.whaleScene){active.whaleScene.age+=Math.min(.25,elapsed);if(active.whaleScene.age>=COAST_WHALE_SCENE_SECONDS){finish();return null;}return active;}
   active.age+=dt;waterCheck-=dt;
   if(marine.has(active.kind)&&(!raft||level>7))active.ending=true;
   if(waterCheck<=0){waterCheck=.5;if(!coastEncounterWaterClear(active,ground,waterY,active.age))active.ending=true;}
   if(Math.hypot(actor.x-active.x,actor.z-active.z)>5000)active.ending=true;
   if(active.kind==='whale'){
    const p=coastEncounterPoint(active,active.age),near=watchWhale&&!active.ending&&active.fade>.5&&Math.hypot(actor.x-p.x,actor.z-p.z)<=COAST_WHALE_APPROACH;
    if(near||active.ending||active.age>=active.duration-COAST_WHALE_SCENE_SECONDS){active.whaleScene={age:0,point:p,reason:near?'approach':'departure',startY:-10+Math.sin(Math.PI*active.age/active.duration)*19,startPitch:Math.sin(active.age*.3)*.025,startFade:active.fade};return active;}
   }
   active.fade=Math.min(1,active.age/(active.kind==='meteor'?.15:2),Math.max(0,(active.duration-active.age)/2));
   if(active.ending){active.out=(active.out??1)-dt/1.5;active.fade=Math.min(active.fade,Math.max(0,active.out));}
   if(active.age>=active.duration||active.out<=0){finish();return null;}return active;
  }
  wait-=dt;if(wait>0)return null;
  if(!bag.length)bag=shuffle(night?['meteor','meteor','meteor','ufo']:['gulls','fish','gulls','dolphins','fish','dolphins','whale']);
  let kind=bag.pop();if(marine.has(kind)&&(!raft||level>6)){wait=4+random()*5;return null;}
  const side=random()<.5?-1:1,base=raft?{x:raft.p[0],z:raft.p[2]}:actor;
  const distances={gulls:[-230*side,340],fish:[65*side,130],dolphins:[135*side,240],whale:[380*side,620],meteor:[-620*side,1500],ufo:[-650*side,1350]},[lateral,forward]=distances[kind];
  const speed=kind==='dolphins'?Math.max(22,Math.min(65,Math.hypot(raft?.v?.[0]??30,raft?.v?.[2]??0))):kind==='fish'?15:kind==='whale'?12:0;
  const e={kind,id:++serial,age:0,duration:COAST_ENCOUNTER_SECONDS[kind],fade:0,heading,side,seed:random()*10,speed,cross:kind==='gulls'?side*23:kind==='ufo'?side*55:0,x:base.x+Math.sin(heading)*forward+Math.cos(heading)*lateral,z:base.z+Math.cos(heading)*forward-Math.sin(heading)*lateral};
  // Check the whole route before starting; do not send a dolphin through a
  // headland or put a fish silhouette over the beach. Recheck live as it swims.
  if([0,.25,.5,.75,1].some(t=>!coastEncounterWaterClear(e,ground,waterY,e.duration*t))){wait=6;return null;}
  if(kind==='gulls'||kind==='ufo'){
   e.altitude=kind==='gulls'?95:240;
   for(let i=0;i<=8;i++)for(const side of[-65,0,65]){const p=coastEncounterPoint(e,e.duration*i/8,side);e.altitude=Math.max(e.altitude,ground(p.x,p.z)+65);}
  }
  waterCheck=0;active=e;return e;
 },reset(){active=null;lastTime=null;bag=[];wait=8+random()*8;}};
}
