import {SNORKEL_NET,snorkelNetContact,snorkelNetAim} from './imasora-coast-snorkel-net.mjs?v=120ob';
import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {coastWalkingHeight as ground} from './imasora-coast-layout.mjs?v=120mx';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
const island=COAST_ISLANDS.find(i=>i.id==='tide-island');
export const SNORKEL=Object.freeze({island:island.id,x:island.x+650,z:island.landingZ,rx:650,rz:390,entry:Object.freeze({x:island.x+137,z:island.landingZ}),slots:16,air:90,maxDepth:480});
export const REEF_FISH=Object.freeze([
 {id:'blue',name:'ソラいろスズメ',color:0x40bfec,min:9,max:19,speed:13},
 {id:'stripe',name:'しましまチョウ',color:0xffd45c,min:13,max:27,speed:18},
 {id:'coral',name:'サンゴいろベラ',color:0xfa818e,min:18,max:36,speed:24},
 {id:'pearl',name:'真珠のきらめき',color:0xb8f8ed,min:22,max:42,speed:27},
].map(Object.freeze));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const coveRadius=(x,z,margin=0)=>Math.hypot((x-SNORKEL.x)/(SNORKEL.rx-margin),(z-SNORKEL.z)/(SNORKEL.rz-margin));
export const snorkelInside=(x,z,margin=0)=>coveRadius(x,z,margin)<=1;
export const snorkelEntryNear=p=>snorkelInside(p.x,p.z)&&Math.hypot(p.x-SNORKEL.entry.x,p.z-SNORKEL.entry.z)<=68;
export function snorkelFloor(x,z,radius=32){let y=ground(x,z);for(let n=0;n<8;n++){const a=n*Math.PI/4;y=Math.max(y,ground(x+Math.sin(a)*radius,z+Math.cos(a)*radius));}return y+2;}
export function emptySnorkel(){return{version:2,edit:0,clock:0,active:false,diving:false,air:SNORKEL.air,position:{x:SNORKEL.entry.x,y:ground(SNORKEL.entry.x,SNORKEL.entry.z),z:SNORKEL.entry.z},catches:REEF_FISH.map(f=>({id:f.id,count:0,best:0})),generation:Array(16).fill(0),availableAt:Array(16).fill(0)};}
export function validateSnorkel(s){
 if(s===undefined)return;const ok=v=>{if(!v)throw Error('入り江の記録を消さずに停止しました。');},keys=(o,k)=>o&&Object.keys(o).sort().join('|')===k.split(' ').sort().join('|'),int=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e9;
 ok(keys(s,'version edit clock active diving air position catches generation availableAt')&&[1,2].includes(s.version)&&int(s.edit)&&Number.isFinite(s.clock)&&s.clock>=0&&s.clock<=1e9&&typeof s.active==='boolean'&&typeof s.diving==='boolean'&&Number.isFinite(s.air)&&s.air>=0&&s.air<=(s.version===1?18:SNORKEL.air));
 ok(keys(s.position,'x y z')&&Object.values(s.position).every(Number.isFinite)&&snorkelInside(s.position.x,s.position.z)&&s.position.y>=(s.version===1?-200:-600)&&s.position.y<=150);
 ok(Array.isArray(s.catches)&&s.catches.length===4);s.catches.forEach((r,i)=>ok(keys(r,'id count best')&&r.id===REEF_FISH[i].id&&int(r.count)&&Number.isInteger(r.best)&&r.best>=0&&r.best<=REEF_FISH[i].max&&(r.count>0?r.best>=REEF_FISH[i].min:r.best===0)));
 ok(Array.isArray(s.generation)&&s.generation.length===16&&s.generation.every(int)&&Array.isArray(s.availableAt)&&s.availableAt.length===16&&s.availableAt.every(t=>Number.isFinite(t)&&t>=0&&t<=s.clock+46));
 ok(s.generation.reduce((a,b)=>a+b,0)===s.catches.reduce((a,b)=>a+b.count,0));return s;
}
export function assertSnorkelContinuation(old,next){validateSnorkel(next);if(!old)return;if(!next||next.version<old.version||next.edit<old.edit||next.clock<old.clock||old.catches.some((r,i)=>next.catches[i].count<r.count||next.catches[i].best<r.best)||old.generation.some((n,i)=>next.generation[i]<n))throw Error('集めた魚の記録を残して、開きなおしてください。');}
export function reefFish(slot,generation=0){
 const seed=slot*89+generation*131,roll=random(seed+18),species=roll>.965?3:slot%3,spec=REEF_FISH[species],size=spec.min+Math.floor(random(seed+23)*(spec.max-spec.min+1));
 // Shallow shoals, middle reefs and deep-water fish reward exploring at
 // different depths. A rare fish lives deep; no extra meshes or save slots.
 const band=species===3?2:slot%3,x=island.x+430+band*215+random(seed+1)*105,z=SNORKEL.z+(random(seed+3)-.5)*300;
 return{slot,generation,species,size,x,z,y:Math.max(ground(x,z)+50,-55-band*125-random(seed+4)*45),heading:random(seed+6)*Math.PI*2,vx:0,vz:0,vy:0};
}
export function createSnorkelSimulation(saved){
 const record=structuredClone(validateSnorkel(saved)??emptySnorkel());if(record.version===1){record.version=2;record.air=record.air/18*SNORKEL.air;}
 let vx=0,vz=0,vy=0,swing=0,previousNet=null,caught=false,autoSurface=record.air===0||record.active&&!record.diving&&record.position.y+32<coastWave(record.position.x,record.position.z,0).height-3,homes=record.generation.map((g,i)=>reefFish(i,g)),fish=homes.map(f=>({...f}));
 function step(dt,{x=0,z=0,vertical=0,fast=false,time=0,bodyRadius=32,clear=()=>true}={}){
  const floorAt=(x,z)=>snorkelFloor(x,z,Math.max(32,bodyRadius));
  if(!record.active)return{};dt=clamp(Number.isFinite(dt)?dt:0,0,.05);record.clock+=dt;const p=record.position,w=coastWave(p.x,p.z,time),floor=floorAt(p.x,p.z),swimming=floor<w.height-24;let surfaced=false,boundary=false;
  const under=swimming&&p.y+32<w.height-3;
  if(under){record.air=Math.max(0,record.air-dt);if(record.air===0&&!autoSurface){autoSurface=true;surfaced=true;}}else{record.air=Math.min(SNORKEL.air,record.air+dt*24);if(record.air>5)autoSurface=false;}
  const speed=fast?65:46,len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}const drag=1-Math.exp(-dt*7);
  vx+=(x*speed+(swimming?w.vx*.28:0)-vx)*drag;vz+=(z*speed+(swimming?w.vz*.28:0)-vz)*drag;
  // Stop against the actual shore/rocks, with small swept steps. The cove
  // boundary also bounds currents; it never grants swimming in the open sea.
  const steps=Math.max(1,Math.ceil(Math.hypot(vx,vz)*dt/2));for(let i=0;i<steps;i++){
   const nx=p.x+vx*dt/steps,nz=p.z+vz*dt/steps;
   if(!snorkelInside(nx,nz,20)){
    // Gear can be worn on the dry beach outside the swimming inset. Walk
    // through that shore fringe, or inward from an older saved position.
    // Deep water still cannot lead outward beyond the swimming boundary.
    const inward=coveRadius(p.x,p.z,20)>1&&coveRadius(nx,nz,20)<coveRadius(p.x,p.z,20);
    if(!snorkelInside(nx,nz)||!inward&&floorAt(nx,nz)<coastWave(nx,nz,time).height-24){vx=vz=0;boundary=true;break;}
   }
   if(clear(nx,Math.max(p.y,floorAt(nx,nz)),nz)){p.x=nx;p.z=nz;}else{vx=vz=0;break;}
  }
  const bed=floorAt(p.x,p.z),water=coastWave(p.x,p.z,time).height,up=autoSurface||vertical<0;
  const desired=!swimming?0:up?58:vertical>0&&record.air>5?-48:record.diving?0:clamp((water-13-p.y)*4,-48,58);
  vy+=(desired-vy)*drag;const ny=clamp(p.y+vy*dt,Math.max(bed,water-SNORKEL.maxDepth),Math.max(bed,water-11));
  // Check vertical motion too, in steps no longer than the horizontal sweep.
  const ys=Math.max(1,Math.ceil(Math.abs(ny-p.y)/2)),dy=(ny-p.y)/ys;for(let n=0;n<ys;n++){if(clear(p.x,p.y+dy,p.z))p.y+=dy;else{vy=0;break;}}
  if(p.y<bed){p.y=bed;vy=0;}record.diving=swimming&&!autoSurface&&(p.y<water-30||vertical>0);
  for(const f of fish){if(record.availableAt[f.slot]>record.clock)continue;const spec=REEF_FISH[f.species],dx=f.x-p.x,dy=f.y-(p.y+32),dz=f.z-p.z,d=Math.hypot(dx,dy,dz),radius=(fast?155:72)+(swing>0?85:0),near=clamp((radius-d)/(radius*.65),0,1),fear=near*near*(3-2*near),a=Math.sin(record.clock*.31+f.slot)*1.5+f.slot*1.91;
   // Quiet flanking works; rushing or swinging early alerts fish much farther
   // away. A real three-dimensional escape prevents catching from above.
   const away=d?2.25*spec.speed*fear/d:0;
   f.vx+=(Math.sin(a)*spec.speed*(1-fear)+dx*away-f.vx)*drag;f.vz+=(Math.cos(a)*spec.speed*(1-fear)+dz*away-f.vz)*drag;
   const home=homes[f.slot],nx=f.x+f.vx*dt+(home.x-f.x)*dt*.09,nz=f.z+f.vz*dt+(home.z-f.z)*dt*.09;
   if(snorkelInside(nx,nz,25)&&ground(nx,nz)<-75){f.x=nx;f.z=nz;}else{f.vx*=-1;f.vz*=-1;}
   f.vy+=((dy*away*.75+(home.y-f.y)*.8+Math.sin(record.clock*.7+f.slot)*4)*(1-fear*.4)-f.vy)*drag;
   f.y=Math.max(ground(f.x,f.z)+50,Math.min(coastWave(f.x,f.z,time).height-18,f.y+f.vy*dt));f.heading=Math.atan2(f.vx,f.vz);
  }
  swing=Math.max(0,swing-dt);return{swimming,surfaced,boundary,speed:Math.hypot(vx,vz),verticalSpeed:vy,kicking:swimming&&fast&&len>.08,water,depth:Math.max(0,water-p.y-13)};
 }
 const visibleFish=()=>fish.filter(f=>record.availableAt[f.slot]<=record.clock);
 function startCatch(){if(!record.active||swing>0)return false;swing=SNORKEL_NET.duration;previousNet=null;caught=false;return true;}
 function sweepNet(pose){
  const previous=previousNet;previousNet=pose;
  if(!record.active||!pose||!previous||swing<=0||caught||pose.phase<.28||previous.phase>.72)return null;
  const f=visibleFish().find(f=>snorkelNetContact(f,previous,pose));if(!f)return null;
  // The net cannot catch through the visible seabed.
  for(let n=0;n<=6;n++){const t=n/6,x=pose.grip.x+(f.x-pose.grip.x)*t,z=pose.grip.z+(f.z-pose.grip.z)*t,y=pose.grip.y+(f.y-pose.grip.y)*t;if(ground(x,z)>y+2)return null;}
  const item=record.catches[f.species],first=item.count===0,newRecord=!first&&f.size>item.best;
  item.count++;item.best=Math.max(item.best,f.size);record.generation[f.slot]++;record.availableAt[f.slot]=record.clock+45;record.edit++;caught=true;
  homes[f.slot]=reefFish(f.slot,record.generation[f.slot]);fish[f.slot]={...homes[f.slot]};
  return{...f,name:REEF_FISH[f.species].name,first,record:newRecord};
 }
 function previewNet(grip,heading){if(!record.active||!grip)return null;let best=null,distance=Infinity;for(const f of visibleFish()){if(!snorkelNetAim(grip,heading,f))continue;const d=Math.hypot(f.x-grip.x,f.y-grip.y,f.z-grip.z);if(d<distance){let clear=true;for(let n=0;n<=6;n++){const t=n/6;if(ground(grip.x+(f.x-grip.x)*t,grip.z+(f.z-grip.z)*t)>grip.y+(f.y-grip.y)*t+2){clear=false;break;}}if(clear){best=f;distance=d;}}}return best;}
 return{record,step,startCatch,sweepNet,previewNet,visibleFish,get swing(){return swing;},surface(){autoSurface=true;record.diving=false;},stop(){vx=vz=vy=0;swing=0;previousNet=null;},snapshot:()=>structuredClone(record)};
}
