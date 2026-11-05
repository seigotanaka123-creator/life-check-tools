import{HUNT_JUMP,worldHeight,worldTraversable,worldValid}from'./imasora-sliding-tag-hunt-world.mjs';
export const TRAMPOLINE=Object.freeze({x:0,z:0,radius:9,matRadius:7.85,top:2.2,launch:HUNT_JUMP.launch*Math.sqrt(HUNT_JUMP.maxJumps*1.25),forwardMin:28,forwardMax:34,forwardAdded:8});
export function trampolineLaunchSpeed(speed){return Math.min(TRAMPOLINE.forwardMax,Math.max(TRAMPOLINE.forwardMin,(Number.isFinite(speed)?Math.max(0,speed):0)+TRAMPOLINE.forwardAdded));}
export function createHuntTrampoline(){return{...TRAMPOLINE,y:worldHeight(0,0)+TRAMPOLINE.top,used:false,usedAt:null};}
export function trampolineJumpAccess(s,a){const p=s.trampoline;return !!p&&!p.used&&a.grounded&&a.y<p.y-.05&&Math.hypot(a.x-p.x,a.z-p.z)<=p.radius+(a.radius??2.7)+Math.max(3,Math.min(10,Math.hypot(a.vx,a.vz)*.5));}
export function trampolineInput(a,input){if(a.trampolineBoost&&a.vy>0)return{...input,jump:true};a.trampolineBoost=false;a.trampolineForwardSpeed=0;return input;}
export function trampolineSurface(s,x,z){const p=s.trampoline;return p&&!p.used&&Math.hypot(x-p.x,z-p.z)<=p.radius?p.y:worldHeight(x,z);}
export function trampolineClear(s,a,radius=a.radius??2.7){const p=s.trampoline;return !p||p.used||a.y>=p.y-.001||Math.hypot(a.x-p.x,a.z-p.z)>=p.radius+radius-.001;}
export function resolveTrampoline(s,a,before){const p=s.trampoline;if(!p||p.used)return null;const dx=a.x-p.x,dz=a.z-p.z,d=Math.hypot(dx,dz),lowRadius=a.kind==='cushion'||a.kind==='sticky'?a.radius:Math.min(1.25,a.radius*.35),foot=p.matRadius+lowRadius,support=p.radius+lowRadius,descending=a.y<=p.y&&a.vy<=0,above=before.y>p.y+1e-5&&descending,onTop=before.y>=p.y-.03&&descending;
 if(d<=support&&(above||onTop)){
  if(d<=foot&&a===s.player&&!before.grounded&&before.jumps>0&&above){const speed=Math.hypot(a.vx,a.vz),launch=trampolineLaunchSpeed(speed),nx=speed>2?a.vx/speed:Math.sin(a.yaw),nz=speed>2?a.vz/speed:Math.cos(a.yaw);p.used=true;p.usedAt=s.time;delete a.stepJump;a.y=p.y;a.vy=p.launch;a.vx=nx*launch;a.vz=nz*launch;a.trampolineForwardSpeed=launch;a.grounded=false;a.jumps=HUNT_JUMP.maxJumps;a.jumpHeld=true;a.trampolineBoost=true;a.trampolineSafeUntil=s.time+.25;return'bounce';}
  a.y=p.y;a.vy=0;a.grounded=true;a.jumps=0;delete a.stepJump;return'support';
 }
 if(a.y<p.y-.001&&d<support){const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0,r=support+.001,q={x:p.x+nx*r,z:p.z+nz*r,y:a.y};if(worldValid(q,a.radius-.01)){a.x=q.x;a.z=q.z;const inward=a.vx*nx+a.vz*nz;if(inward<0){a.vx-=nx*inward;a.vz-=nz*inward;}}}return null;
}
export function trampolineObstacleJump(s,a,input){const p=s.trampoline;if(!p||p.used||!a.grounded||a.y>=p.y-.05)return false;const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);return d<p.radius+a.radius+8&&dx*(input.x??0)+dz*(input.z??0)>1;}
export function trampolineEscapeControl(s,a,input,underPressure){const p=s.trampoline,m=a.brain;if(!m||!p||p.used||a.trampolineBoost){if(m)m.trampolineApproach=false;return input;}const dx=p.x-a.x,dz=p.z-a.z,d=Math.hypot(dx,dz);
 if(!m.trampolineApproach){if(!underPressure||d>48)return input;if(s.time<(m.trampolineCheckAt??0))return input;m.trampolineCheckAt=s.time+.3;if(!worldTraversable(a,p,a.radius+.2))return input;m.trampolineApproach=true;}
 if(d>65){m.trampolineApproach=false;return input;}m.supply=null;return{...input,x:dx/(d||1),z:dz/(d||1),dash:true,jump:a.grounded?d<20:a.jumpHeld&&a.vy>0};
}
