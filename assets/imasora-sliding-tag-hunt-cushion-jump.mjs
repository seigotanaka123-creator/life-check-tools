import{huntJumpRestRemaining}from'./imasora-sliding-tag-hunt-jump-rest.mjs';
import{worldSurface,worldTraversable,worldSight,worldHeight}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntCanObserve}from'./imasora-sliding-tag-hunt-sight.mjs';
import{movingItemContactRadius}from'./imasora-sliding-tag-hunt-contact.mjs';
const SCAN=.1,MEMORY=.22,REACTION=.18;
// A short estimate using the observed rolling speed and ordinary drag. It is
// advice for a jump, never a new impact volume or a guaranteed dodge.
export function cushionImpactTime(a,g,now){
 if(g.kind!=='cushion'||g.until<=now)return null;
 const radius=movingItemContactRadius(a,g);if(radius<0)return null;
 const drag=g.grounded===false?.0096:(worldSurface(g.x,g.z)==='grip'?4.7:1.8)*.12;
 const distance=t=>{const travel=(1-Math.exp(-drag*t))/drag;return Math.hypot(g.x+g.vx*travel-a.x-a.vx*t,g.z+g.vz*travel-a.z-a.vz*t)-radius;};
 if(distance(0)<=0)return 0;
 let prev=0;for(let t=.07;t<=1.401;t+=.07){if(distance(t)<=0){let lo=prev,hi=t;for(let i=0;i<6;i++){const m=(lo+hi)/2;if(distance(m)<=0)hi=m;else lo=m;}return hi;}prev=t;}
 return null;
}
export function cushionJumpControl(s,a,input,{visible=g=>huntCanObserve(s,a,g,55)}={}){
 const m=a.brain;if(!s.gadgets.length&&!m.cushionJump&&!m.watchedCushion)return input;
 if(huntJumpRestRemaining(s,a)>0||a.flight||a.hook||a.trampolineBoost||m.supply||m.trampolineApproach){m.cushionJump=null;return input;}
 const jump=m.cushionJump;
 if(jump){const t=s.time-jump.at;if(t>2.2||t>.4&&a.grounded){m.cushionJump=null;return input;}return{...input,jump:t<.03?false:t<.26?true:t<.29?false:t<.53?true:t<.56?false:t<.6||a.vy>0};}
 if(!a.grounded)return input;
 if(s.time>=(m.cushionScanAt??0)){
  m.cushionScanAt=s.time+SCAN;const old=m.watchedCushion;let best=null,entry=Infinity,oldVisible=false;
  for(const g of s.gadgets){
   if(g.kind!=='cushion'||g.until<=s.time||g.attached||g.owner===a.owner&&s.time-g.spawnedAt<.35||g.ignore===a.owner&&s.time<g.ignoreUntil||Math.hypot(g.x-a.x,g.z-a.z)>55||!visible(g))continue;
   if(g.id===old?.id)oldVisible=true;
   const p={id:g.id,kind:g.kind,x:g.x,y:g.y,z:g.z,vx:g.vx,vz:g.vz,radius:g.radius,grounded:g.grounded,until:s.time+MEMORY,at:s.time,first:old?.id===g.id?old.first:s.time},eta=cushionImpactTime(a,p,s.time);
   if(eta!==null&&eta<entry){entry=eta;best=p;}
  }
  m.watchedCushion=best??(!oldVisible&&old?.until>s.time?old:null);
 }
 const seen=m.watchedCushion;if(!seen||seen.until<=s.time||s.time-seen.first<REACTION||s.time<(m.cushionCooldown??0)||s.time<(m.cushionPlanAt??0))return input;
 m.cushionPlanAt=s.time+.2;
 const elapsed=s.time-seen.at,drag=seen.grounded===false?.0096:(worldSurface(seen.x,seen.z)==='grip'?4.7:1.8)*.12,travel=(1-Math.exp(-drag*elapsed))/drag;
 const predicted={...seen,x:seen.x+seen.vx*travel,z:seen.z+seen.vz*travel,vx:seen.vx*Math.exp(-drag*elapsed),vz:seen.vz*Math.exp(-drag*elapsed)},eta=cushionImpactTime(a,predicted,s.time);
 if(eta===null||eta<.58||eta>.95)return input;
 const n=Math.hypot(input.x??0,input.z??0);if(n<.1)return input;
 const reach=Math.max(24,Math.min(42,Math.hypot(a.vx,a.vz)*1.6)),end={x:a.x+input.x/n*reach,z:a.z+input.z/n*reach};
 if(!worldTraversable(a,end,a.radius+.2)||[7,11,15.5].some(h=>!worldSight({...a,y:a.y+h},{...end,y:worldHeight(end.x,end.z)+h},a.radius+.2)))return input;
 m.cushionJump={at:s.time};m.cushionCooldown=s.time+3;
 return{...input,jump:false};
}
