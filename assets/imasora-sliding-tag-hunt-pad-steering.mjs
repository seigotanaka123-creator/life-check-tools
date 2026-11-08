const TURN_RATE=110*Math.PI/180;

// The pad steers the actor independently of the viewing camera.
export function huntPadMovement(heading,{x,z},dt){
 const turn=Math.sign(x)*Math.max(0,(Math.abs(x)-.10)/.90);
 const yaw=heading-turn*TURN_RATE*dt;
 const nextHeading=Math.atan2(Math.sin(yaw),Math.cos(yaw));
 const travel=.75*Math.abs(x)*(1-Math.abs(z))-z;
 return {heading:nextHeading,x:Math.sin(nextHeading)*travel,z:Math.cos(nextHeading)*travel};
}

// Keyboard and pad share this single heading. Keep it while reversing so the
// body's backward-facing pose cannot flip the next input. If a special move
// took over the body, resume from its actual facing, never from turns queued
// invisibly during the interruption.
export function huntKeyboardMovement(memory,heading,axis,dt){
 if(Number.isFinite(memory.facing)&&Math.abs(Math.atan2(Math.sin(heading-memory.facing),Math.cos(heading-memory.facing)))>.001)memory.heading=null;
 const move=huntPadMovement(memory.heading??heading,axis,dt);
 memory.heading=axis.x||axis.z?move.heading:null;
 memory.facing=Math.hypot(move.x,move.z)>.05?Math.atan2(move.x,move.z):null;
 return {x:move.x,z:move.z};
}
