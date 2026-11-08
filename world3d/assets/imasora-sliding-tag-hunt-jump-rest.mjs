export const HUNT_JUMP_REST=1.3;
export const HUNT_JUMP_QUICK_REST=1.1;
export function huntJumpRestRemaining(s,a){return a.jumps>0?0:Math.max(0,(a.nextJumpAt??0)-s.time);}
// Only the start of a new chain rests. A human press during the rest is not
// queued; release it before the next chain. CPU commands use ordinary input
// again when ready without keeping a physical key latched.
export function huntJumpInput(s,a,input,{releaseRequired=false}={}){
 const waiting=huntJumpRestRemaining(s,a)>0;
 if(releaseRequired){if(!input.jump)delete a.jumpRestRelease;else if(waiting)a.jumpRestRelease=true;}
 return input.jump&&a.jumps===0&&(waiting||releaseRequired&&a.jumpRestRelease)?{...input,jump:false}:input;
}
export function recordHuntJumpLanding(s,a,before,rest=HUNT_JUMP_REST){
 if(!a.kind&&before&&!before.grounded&&before.jumps>0&&a.grounded)a.nextJumpAt=s.time+rest;
}
