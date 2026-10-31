import {UNCHARTED_ISLAND as I} from './imasora-coast-geography.mjs?v=120li';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
// Natural buoyant stone: displaced water, inertia and drag. No save-owned parts.
export const CAVE_STONES=Object.freeze(Array.from({length:6},(_,n)=>Object.freeze({id:'tide-cave-stone-'+n,x:I.x+[0,16,-12,12,-16,0][n],z:I.landingZ+207+n*60,halfX:24,halfZ:23,depth:30,mass:180,density:.008})));
export const CAVE_TOP=Object.freeze([[-24,-15],[-16,-23],[16,-23],[24,-15],[24,15],[16,23],[-16,23],[-24,15]].map(Object.freeze));
export function onCaveStone(s,x,z){const dx=Math.abs(x-s.x),dz=Math.abs(z-s.z);return dx<=24&&dz<=23&&dx+dz<=39;}
export function createTideCave({wave=coastWave}={}){
 const stones=CAVE_STONES.map(s=>({...s,y:12,v:0,water:0}));let clock=null,remainder=0,active=false,steps=0;
 const reset=t=>{for(const s of stones){const w=wave(s.x,s.z,t);s.water=w.height;s.y=w.height+s.depth-s.mass/(s.density*2080);s.v=0;}};
 function update(time,actors=[]){
  const near=actors.some(a=>a&&Math.hypot(a.x-I.x,a.z-(I.landingZ+340))<1600);
  if(!Number.isFinite(time)){return;}if(!near){clock=null;active=false;remainder=0;return;}
  if(clock===null||time<clock||time-clock>.5){reset(time);clock=time;remainder=0;active=true;return;}
  active=true;remainder+=Math.min(.1,time-clock);clock=time;
  for(let n=0;n<6&&remainder>=1/60;n++,remainder-=1/60){steps++;const t=time-remainder+1/60;
   for(const s of stones){const w=wave(s.x,s.z,t);s.water=w.height;
    let load=0;for(const a of actors)if(a&&a.grounded!==false&&onCaveStone(s,a.x,a.z)&&Math.abs((a.groundY??a.y)-s.y)<3)load+=Math.max(0,Math.min(200,a.mass??65));
    const displaced=Math.max(0,Math.min(s.depth,w.height-(s.y-s.depth)))*2080*s.density,mass=s.mass+load;
    s.v+=(98*(displaced-mass)/mass-(s.v-w.vy)*4)/60;s.v=Math.max(-35,Math.min(35,s.v));s.y+=s.v/60;
    // Bedrock and loss of focus cannot accumulate runaway impulses.
    if(s.y<6){s.y=6;s.v=Math.max(0,s.v);}if(s.y>35){s.y=35;s.v=Math.min(0,s.v);}
   }
  }
 }
 return{stones,update,surfaceAt(x,z){if(Math.abs(x-I.x)>60||z<I.landingZ+180||z>I.landingZ+540)return undefined;let y=-Infinity;for(const s of stones)if(onCaveStone(s,x,z))y=Math.max(y,s.y);return Number.isFinite(y)?y:undefined;},get active(){return active;},get steps(){return steps;}};
}
