const TURN_RATE=110*Math.PI/180;

// The pad steers the actor independently of the viewing camera.
export function huntPadMovement(heading,{x,z},dt){
 const turn=Math.sign(x)*Math.max(0,(Math.abs(x)-.10)/.90);
 const yaw=heading-turn*TURN_RATE*dt;
 const nextHeading=Math.atan2(Math.sin(yaw),Math.cos(yaw));
 const travel=.75*Math.abs(x)*(1-Math.abs(z))-z;
 return {heading:nextHeading,x:Math.sin(nextHeading)*travel,z:Math.cos(nextHeading)*travel};
}
