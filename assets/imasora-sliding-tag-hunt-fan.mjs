import{HUNT_FIELDS}from'./imasora-sliding-tag-hunt-items.mjs';
import{worldSight,worldValid,worldHeight}from'./imasora-sliding-tag-hunt-world.mjs';
import{usesCommittedBalloonDescent}from'./imasora-sliding-tag-hunt-contact-rules.mjs';
// A stationary, visible source. Only the forward stream applies force;
// ordinary world collision still resolves the resulting movement.
export function huntFanExposure(a,g,now){
 if(g.kind!=='fan'||g.until<=now)return 0;const dx=a.x-g.x,dz=a.z-g.z,forward=dx*Math.sin(g.yaw)+dz*Math.cos(g.yaw),side=Math.abs(dx*Math.cos(g.yaw)-dz*Math.sin(g.yaw));
 if(forward<g.radius-.2||forward>HUNT_FIELDS.windRange||side>3+forward*.2+(a.radius??2.7)||Math.abs(a.y+2.7-g.y-5.4)>5)return 0;
 if(!worldSight({x:g.x+Math.sin(g.yaw)*(g.radius+.1),y:g.y+5.4,z:g.z+Math.cos(g.yaw)*(g.radius+.1)},{x:a.x,y:a.y+2.7,z:a.z},.1))return 0;
 return Math.max(.2,1-forward/HUNT_FIELDS.windRange*.75);
}
export function applyHuntWind(s,a,dt){let hit=false;for(const g of s.gadgets){const strength=huntFanExposure(a,g,s.time);if(!strength)continue;hit=true;
 const mass=Math.sqrt(3/Math.max(2,a.radius)),dx=Math.sin(g.yaw),dz=Math.cos(g.yaw),along=a.vx*dx+a.vz*dz,force=Math.max(0,Math.min(100*strength*mass*dt,38-along));a.vx+=dx*force;a.vz+=dz*force;a.externalForce=true;
 if(s.time>(a.windContactUntil??0)){
  // A committed landing holds the horizontal position. Lifting the actor
  // again here can trap it above the fan until the fan expires.
 if(!usesCommittedBalloonDescent(s.rules)||a.flight?.stage!=='descend'){
   a.vy=Math.max(a.vy,5.5*mass);a.grounded=false;a.jumps=Math.max(1,a.jumps);
   s.events.push({id:s.nextId++,type:'fan-push',owner:a.owner,at:s.time});
  }
 }
 a.windContactUntil=s.time+.25;
 }return hit;}
// Include a swept test so a fast dash cannot tunnel through the fan pedestal.
export function resolveHuntFans(s,a,before){if(!before)return;for(const g of s.gadgets){if(g.kind!=='fan'||g.until<=s.time||a.y>=g.y+HUNT_FIELDS.fanHeight||a.y+5.4<=g.y)continue;const radius=g.radius+a.radius,dx=a.x-before.x,dz=a.z-before.z,ox=before.x-g.x,oz=before.z-g.z,A=dx*dx+dz*dz,B=ox*dx+oz*dz,C=ox*ox+oz*oz-radius*radius,D=B*B-A*C;let x=a.x,z=a.z;const d=Math.hypot(x-g.x,z-g.z);if(d>=radius&&!(A>1e-9&&C>0&&B<0&&D>=0&&(-B-Math.sqrt(D))/A<=1))continue;
 if(C>0&&A>1e-9&&D>=0){const t=Math.max(0,(-B-Math.sqrt(D))/A-.0001);x=before.x+dx*t;z=before.z+dz*t;}else{const n=d||1;x=g.x+(x-g.x)/n*(radius+.01);z=g.z+(z-g.z)/n*(radius+.01);if(d<.001){x=g.x+radius+.01;z=g.z;}}
 const q={x,y:a.y,z};if(!worldValid(q,a.radius)||a.grounded&&Math.abs(worldHeight(x,z)-a.y)>.3){x=before.x;z=before.z;}const n=Math.hypot(x-g.x,z-g.z)||1,nx=(x-g.x)/n,nz=(z-g.z)/n,into=a.vx*nx+a.vz*nz;if(into<0){a.vx-=nx*into;a.vz-=nz*into;}a.x=x;a.z=z;if(a.hook){a.hook=null;s.zipTouch=null;}
 }}
export function steerAroundHuntFans(s,a,input){const n=Math.hypot(input.x??0,input.z??0);if(n<.1)return input;const dx=input.x/n,dz=input.z/n;for(const g of s.gadgets){if(g.kind!=='fan'||g.until<=s.time||a.y>=g.y+HUNT_FIELDS.fanHeight)continue;const x=g.x-a.x,z=g.z-a.z,forward=x*dx+z*dz,side=x*dz-z*dx,r=g.radius+a.radius+1;if(forward<=0||forward>r+9||Math.abs(side)>r)continue;const sign=side>=0?-1:1;return{...input,x:dx*.25+dz*sign*.95,z:dz*.25-dx*sign*.95};}return input;}
