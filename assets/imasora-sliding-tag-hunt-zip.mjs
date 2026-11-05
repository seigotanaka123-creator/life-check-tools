import{huntBodiesTouch}from'./imasora-sliding-tag-hunt-body-touch.mjs';
import{worldHeight,worldValid,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
import{HOOK_POLES}from'./imasora-sliding-tag-hunt-items.mjs';
import{trampolineSurface,trampolineClear}from'./imasora-sliding-tag-hunt-trampoline.mjs';
import{diveCanTouch}from'./imasora-sliding-tag-hunt-dive.mjs';
export const HUNT_ZIP=Object.freeze({range:132,seconds:.28,loft:3,sweep:.65,exitSpeed:30});
const surface=(s,x,z)=>s?trampolineSurface(s,x,z):worldHeight(x,z);
function point(s,h,t){const x=h.fromX+(h.toX-h.fromX)*t,z=h.fromZ+(h.toZ-h.fromZ)*t;return{x,z,y:Math.max(surface(s,x,z),h.fromY+(h.toY-h.fromY)*t+Math.sin(Math.PI*t)*HUNT_ZIP.loft)};}
function clear(s,a,p,q){return worldValid(q,a.radius+.1)&&(!s||trampolineClear(s,q,a.radius+.1))&&worldSight({...p,y:p.y+2},{...q,y:q.y+2},a.radius+.1);}
export function findHuntZipAnchor(a,s,allowed){
 const forward={x:Math.sin(a.yaw),z:Math.cos(a.yaw)},candidates=[];
 for(const p of HOOK_POLES){if(allowed&&!allowed(p))continue;const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz),alignment=(dx*forward.x+dz*forward.z)/(d||1);if(d<a.radius+5||d>HUNT_ZIP.range||alignment<.2)continue;
  const stop=a.radius+3,landing={x:p.x-dx/d*stop,z:p.z-dz/d*stop};landing.y=surface(s,landing.x,landing.z);const anchor={...p,y:worldHeight(p.x,p.z)+4};if(!worldSight({...a,y:a.y+3},anchor,.1))continue;
  candidates.push({...anchor,landing,score:alignment*HUNT_ZIP.range+d*.3});
 }
 candidates.sort((a,b)=>b.score-a.score);
 for(const p of candidates){const h={fromX:a.x,fromY:a.y,fromZ:a.z,toX:p.landing.x,toY:p.landing.y,toZ:p.landing.z},steps=Math.ceil(Math.hypot(h.toX-a.x,h.toZ-a.z)/HUNT_ZIP.sweep);let prev={x:a.x,y:a.y,z:a.z},safe=true;
  for(let i=1;i<=steps;i++){const q=point(s,h,i/steps);if(!clear(s,a,prev,q)){safe=false;break;}prev=q;}if(safe)return p;
 }
 return null;
}
export function startHuntZip(s,a,p){a.hook={x:p.x,y:p.y,z:p.z,fromX:a.x,fromY:a.y,fromZ:a.z,toX:p.landing.x,toY:p.landing.y,toZ:p.landing.z,since:s.time,until:s.time+HUNT_ZIP.seconds};}
export function moveHuntZip(s,a,dt){
 const h=a.hook;if(!h)return false;const t=Math.max(0,Math.min(1,(s.time-h.since)/HUNT_ZIP.seconds)),target=point(s,h,t),steps=Math.max(1,Math.ceil(Math.hypot(target.x-a.x,target.z-a.z, target.y-a.y)/HUNT_ZIP.sweep)),from={x:a.x,y:a.y,z:a.z};let stopped=false;
 for(let i=1;i<=steps;i++){const q={x:from.x+(target.x-from.x)*i/steps,y:from.y+(target.y-from.y)*i/steps,z:from.z+(target.z-from.z)*i/steps};if(!clear(s,a,a,q)){stopped=true;break;}Object.assign(a,q);
  const catcher=s.hunters.find(b=>!b.flight&&!((b.effects?.dizzy??0)>s.time)&&s.time>=(b.noTagUntil??0)&&s.time>=(a.trampolineSafeUntil??0)&&huntBodiesTouch(b,a));if(catcher){s.zipTouch=catcher.owner;stopped=true;break;}
 }
 a.grounded=false;a.externalForce=true;a.vx=(a.x-from.x)/dt;a.vy=(a.y-from.y)/dt;a.vz=(a.z-from.z)/dt;
 if(stopped||t>=1){const dx=h.toX-h.fromX,dz=h.toZ-h.fromZ,d=Math.hypot(dx,dz)||1;a.hook=null;a.vx=stopped?0:dx/d*HUNT_ZIP.exitSpeed;a.vz=stopped?0:dz/d*HUNT_ZIP.exitSpeed;a.vy=0;const floor=surface(s,a.x,a.z);if(a.y<=floor+.05){a.y=floor;a.grounded=true;a.jumps=0;}}
 return true;
}
