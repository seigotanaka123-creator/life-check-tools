export const HUNT_TURN_RATE=110*Math.PI/180;
const PAD_TURN_TRAVEL=.75;
const KEY_TURN_TRAVEL=.24;

// The pad steers the actor independently of the viewing camera.
export function huntPadMovement(heading,{x,z},dt,turnTravel=PAD_TURN_TRAVEL){
 const turn=Math.sign(x)*Math.max(0,(Math.abs(x)-.10)/.90);
 const yaw=heading-turn*HUNT_TURN_RATE*dt;
 const nextHeading=Math.atan2(Math.sin(yaw),Math.cos(yaw));
 const travel=turnTravel*Math.abs(x)*(1-Math.abs(z))-z;
 return {heading:nextHeading,x:Math.sin(nextHeading)*travel,z:Math.cos(nextHeading)*travel};
}

// Keyboard and pad share this single heading. Keep it while reversing so the
// body's backward-facing pose cannot flip the next input. If a special move
// took over the body, resume from its actual facing, never from turns queued
// invisibly during the interruption.
export function huntKeyboardMovement(memory,heading,axis,dt,{keyboard=true}={}){
 if(Number.isFinite(memory.facing)&&Math.abs(Math.atan2(Math.sin(heading-memory.facing),Math.cos(heading-memory.facing)))>.001)memory.heading=null;
 // A digital sideways key is all-or-nothing. Reduce its travel so a
 // small correction beside a pickup doesn't carry the body past it.
 const move=huntPadMovement(memory.heading??heading,axis,dt,keyboard?KEY_TURN_TRAVEL:PAD_TURN_TRAVEL);
 memory.heading=axis.x||axis.z?move.heading:null;
 memory.facing=Math.hypot(move.x,move.z)>.05?Math.atan2(move.x,move.z):null;
 return {x:move.x,z:move.z};
}
