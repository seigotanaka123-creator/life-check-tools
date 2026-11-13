import{worldHeight,worldSight,worldValid}from'./imasora-sliding-tag-hunt-world.mjs';
import{HUNT_TURN_RATE}from'./imasora-sliding-tag-hunt-pad-steering.mjs';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
// Keep one approach side for the whole flight. Do not alternate between a
// tangent and the opposite bearing whenever the runner crosses a distance band.
export function stableBalloonTarget(s,a,gap){
 const f=a.flight??{},runner=s.player,aim={x:runner.x+runner.vx*.18,z:runner.z+runner.vz*.18};
 const angle=f.stableBearing??Math.atan2(a.x-aim.x,a.z-aim.z),radius=a.radius+runner.radius+gap;
 for(const offset of[0,.25,-.25,.5,-.5,.75,-.75,1,-1,1.5,-1.5,2,-2,2.5,-2.5,Math.PI]){
  const bearing=angle+offset,p={x:aim.x+Math.sin(bearing)*radius,z:aim.z+Math.cos(bearing)*radius};p.y=worldHeight(p.x,p.z);
  if(!worldValid(p,a.radius+.2))continue;
  f.stableBearing=bearing;return p;
 }
 return null;
}
export function stableBalloonSteer(a,goal,dt){
 const f=a.flight,dx=goal.x-a.x,dz=goal.z-a.z,d=Math.hypot(dx,dz);
 const requested=d>.5?Math.atan2(dx,dz):f.steerYaw??a.yaw;
 const prior=f.steerYaw??a.yaw,delta=Math.atan2(Math.sin(requested-prior),Math.cos(requested-prior));
 f.turnRate??=0;
 const acceleration=clamp(delta*16-f.turnRate*8,-4.2,4.2);
 f.turnRate=clamp(f.turnRate+acceleration*dt,-2.1,2.1);
 f.steerYaw=prior+f.turnRate*dt;
 return{x:a.x+Math.sin(f.steerYaw)*d,z:a.z+Math.cos(f.steerYaw)*d};
}
export function stableBalloonHeight(f,wanted,dt){
 f.hoverY??=f.launchY;
 f.hoverY+=clamp(wanted-f.hoverY,-5*dt,12*dt);
 return f.hoverY;
}

// The descent holds the landing column. Directional input can still turn
// the monster and its follow camera while it comes down.
export function balloonDescentFacing(a,input,dt){
 if(Math.hypot(input.x??0,input.z??0)<=.05)return;
 const heading=Math.atan2(input.x,input.z);
 const delta=Math.atan2(Math.sin(heading-a.yaw),Math.cos(heading-a.yaw));
 a.yaw+=clamp(delta,-HUNT_TURN_RATE*dt,HUNT_TURN_RATE*dt);
}

// A raised street can split the walking graph even when there is room to
// float across it. Keep the same building, tree and pole clearances as
// balloon movement, and never use the air path as the descent footprint.
export function balloonAirApproach(a,target){
 const dx=target.x-a.x,dz=target.z-a.z,distance=Math.hypot(dx,dz),floor=worldHeight(a.x,a.z);
 if(distance<8||distance>190||a.y<floor+6)return null;
 const pad=a.radius+.35,steps=Math.ceil(distance/2),cap=Math.max(a.y,floor+14.5);
 let altitude=Math.max(floor,worldHeight(target.x,target.z))+.9;
 for(let i=0;i<=steps;i++){
  const u=i/steps,x=a.x+dx*u,z=a.z+dz*u;
  altitude=Math.max(altitude,Math.max(worldHeight(x,z),worldHeight(x-pad,z),worldHeight(x+pad,z),worldHeight(x,z-pad),worldHeight(x,z+pad))+.9);
  if(altitude>cap)return null;
 }
 if(!worldSight({...a,y:altitude},{...target,y:altitude},pad))return null;
 for(let i=0;i<=steps;i++){
  const u=i/steps;
  if(!worldValid({x:a.x+dx*u,z:a.z+dz*u,y:altitude},pad))return null;
 }
 return altitude;
}
