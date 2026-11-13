import{BODY,worldMove,worldValid,worldHeight,worldGradient}from'./imasora-sliding-tag-hunt-world.mjs';
export function huntTerrainTilt(actor){
 if(!actor.grounded)return {pitch:0,roll:0};
 const grade=worldGradient(actor.x,actor.z),yaw=actor.yaw??0;
 const sine=Math.sin(yaw),cosine=Math.cos(yaw);
 return {pitch:-Math.atan(grade.x*sine+grade.z*cosine),roll:Math.atan(grade.x*cosine-grade.z*sine)};
}
export const HUNT_DIVE=Object.freeze({prepare:.12,slide:.44,recover:.55,cooldown:5.7,speed:38});
export function startHuntDive(s,a,cooldown=HUNT_DIVE.cooldown,{aimFromFacing=false}={}){if(s.phase!=='playing'||a.owner==='player'||(a.effects?.dizzy??0)>s.time||!a.grounded||a.flight||a.pendingItem||a.dive||s.time<(a.nextDiveAt??0))return false;const speed=Math.hypot(a.vx,a.vz),yaw=!aimFromFacing&&speed>2?Math.atan2(a.vx,a.vz):a.yaw;a.dive={since:s.time,age:0,stage:'prepare',x:Math.sin(yaw),z:Math.cos(yaw),...(aimFromFacing?{aimFromFacing:true}:{})};a.nextDiveAt=s.time+cooldown;return true;}
export function moveHuntDive(s,a,input,dt){const d=a.dive;if(!d)return false;if(input.jump||a.flight){a.dive=null;return false;}d.age=s.time-d.since;const end=HUNT_DIVE.prepare+HUNT_DIVE.slide,total=end+HUNT_DIVE.recover;if(d.age>=total||!a.grounded){a.dive=null;return false;}const previous=d.stage;d.stage=d.age<HUNT_DIVE.prepare?'prepare':d.age<end?'slide':'recover';const tuning=a.tuning;a.tuning={...tuning};try{
 if(d.stage==='slide'){const speed=HUNT_DIVE.speed*Math.min(1.18,Math.max(.9,tuning.speed));a.vx=d.x*speed;a.vz=d.z*speed;a.tuning.speed=Math.max(a.tuning.speed,speed/BODY.dash);a.tuning.accel=0;const before={x:a.x,z:a.z};worldMove(a,{x:d.x,z:d.z,dash:true},dt);a.yaw=Math.atan2(d.x,d.z);if(Math.hypot(a.x-before.x,a.z-before.z)<speed*dt*.35){d.since=s.time-end;d.age=end;d.stage='recover';a.vx=a.vz=0;}}
 else{if(previous==='slide'){a.vx*=.32;a.vz*=.32;}a.tuning.speed*=d.stage==='recover'?.45:.65;worldMove(a,{...input,jump:false,dash:false},dt);
  // Aim with the visible body during the wind-up, even when ice is still
  // carrying the feet sideways. The actual slide stays committed to that aim.
  if(d.aimFromFacing&&d.stage==='prepare'){d.x=Math.sin(a.yaw);d.z=Math.cos(a.yaw);}
 }
 }finally{a.tuning=tuning;}
 // A normal collision or an edge ends the burst; it never goes through a wall.
 if(d.stage==='slide'&&(!worldValid(a,a.radius-.01)||Math.abs(worldHeight(a.x,a.z)-a.y)>.6)){a.dive=null;}
 return true;
}
export function diveCanTouch(a,b){return a.dive?.stage!=='slide'||b.y<a.y+2;}
export function huntDiveTilt(d){if(!d)return 0;const {prepare,slide,recover}=HUNT_DIVE;if(d.age<prepare)return .35*Math.max(0,d.age/prepare);if(d.age<prepare+slide)return .35+1.1*Math.min(1,(d.age-prepare)/.08);return 1.45*Math.max(0,1-(d.age-prepare-slide)/recover);}
