import{worldCameraPose,worldHeight,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),DEG=Math.PI/180;
// Exact rate-limited first-order easing. No rounding to direction sectors.
export function easeHuntCamera(value,goal,dt,{rate=60*DEG,response=8,angle=false}={}){
 const delta=angle?Math.atan2(Math.sin(goal-value),Math.cos(goal-value)):goal-value,n=Math.abs(delta),t=clamp(Number.isFinite(dt)?dt:0,0,.1),threshold=rate/response;
 let travelled;if(n<=threshold)travelled=n*(1-Math.exp(-response*t));else{const linear=(n-threshold)/rate;travelled=t<=linear?rate*t:n-threshold*Math.exp(-response*(t-linear));}
 return value+Math.sign(delta)*travelled;
}
const clearRay=(target,p)=>p.y>worldHeight(p.x,p.z)+.2&&worldSight(target,p,.8);
const sameTarget=(prior,target)=>prior&&prior.x===target.x&&prior.y===target.y&&prior.z===target.z;
export function createHuntSmoothCamera({plan=worldCameraPose,clear=clearRay}={}){
 let state=null,lastPlan=null,lastRay=null,frames=0,maxYawStep=0,maxPitchStep=0,collisions=0,planChecks=0,rayChecks=0;
 function cameraGoal(target,yaw,pitch,distance,minDistance){
  const previousYaw=state.yaw;
  if(sameTarget(lastPlan,target)&&lastPlan.yaw===yaw&&lastPlan.pitch===pitch&&
     lastPlan.distance===distance&&lastPlan.minDistance===minDistance&&lastPlan.previousYaw===previousYaw)return lastPlan.goal;
  planChecks++;
  const goal=plan(target,{yaw,pitch,distance,minDistance,previousYaw,maxTurn:Infinity});
  // The default checks only read the static field. Custom checks may change.
  if(plan===worldCameraPose)lastPlan={x:target.x,y:target.y,z:target.z,yaw,pitch,distance,minDistance,previousYaw,goal};
  return goal;
 }
 function safeDistance(target,yaw,pitch,distance,at){
  if(sameTarget(lastRay,target)&&lastRay.yaw===yaw&&lastRay.pitch===pitch&&lastRay.distance===distance)return lastRay.safe;
  rayChecks++;
  let safe=distance;
  if(!clear(target,at(distance))){
   let lo=0,hi=distance;
   for(let i=0;i<10;i++){const mid=(lo+hi)/2;if(clear(target,at(mid)))lo=mid;else hi=mid;}
   safe=Math.max(0,lo-.16);
  }
  if(clear===clearRay)lastRay={x:target.x,y:target.y,z:target.z,yaw,pitch,distance,safe};
  return safe;
 }
 return{reset(options){state=options&&Number.isFinite(options.yaw)?{yaw:options.yaw,pitch:options.pitch??.28,distance:null}:null;lastPlan=lastRay=null;frames=maxYawStep=maxPitchStep=collisions=planChecks=rayChecks=0;},update(target,{yaw=0,pitch=.28,distance=31,minDistance=16,dt=0,keepAngle=false,following=false,reversing=false}={}){
   const t=clamp(Number.isFinite(dt)?dt:0,0,.1),idealPitch=clamp(pitch,.1,1.3);if(!state)state={yaw,pitch:idealPitch,distance:null};
   // The old obstacle planner selects only a goal. Its side/high-angle choices
   // are never used as an immediate rendered camera position.
   const goal=keepAngle||following?{yaw,pitch:idealPitch}:cameraGoal(target,yaw,idealPitch,distance,minDistance),oldYaw=state.yaw,oldPitch=state.pitch;
   // A following camera must be able to catch a continuously turning actor.
   // A per-render-frame cap made 30 Hz following half as fast as 60 Hz and
   // eventually sent the camera the opposite way around the actor. Follow
   // the committed body pose with bounded, time-based lag; walls shorten the
   // ray instead of choosing a new heading unrelated to the player's turn.
   const quickReverse=following&&reversing;
   const yawStep=easeHuntCamera(state.yaw,goal.yaw,quickReverse?Math.min(t,1/13):t,{angle:true,rate:(quickReverse?255:following?180:60)*DEG,response:quickReverse?11:8})-state.yaw;
   state.yaw+=following?yawStep:clamp(yawStep,-DEG,DEG);
   state.pitch+=clamp(easeHuntCamera(state.pitch,goal.pitch,t,{rate:45*DEG})-state.pitch,-DEG,DEG);
   const h=Math.cos(state.pitch),rayX=Math.sin(state.yaw)*h,rayY=Math.sin(state.pitch),rayZ=Math.cos(state.yaw)*h;
   const at=d=>({x:target.x+rayX*d,y:target.y+rayY*d,z:target.z+rayZ*d});
   // Every changed intermediate ray gets a collision check before drawing.
   const safe=safeDistance(target,state.yaw,state.pitch,distance,at);
   state.distance=state.distance===null?safe:Math.min(safe,easeHuntCamera(state.distance,safe,t,{rate:18,response:7}));
   const dy=Math.abs(state.yaw-oldYaw),dp=Math.abs(state.pitch-oldPitch);frames++;maxYawStep=Math.max(maxYawStep,dy);maxPitchStep=Math.max(maxPitchStep,dp);if(safe<distance-.001)collisions++;
   const settling=Math.abs(Math.atan2(Math.sin(goal.yaw-state.yaw),Math.cos(goal.yaw-state.yaw)))>.01*DEG||Math.abs(goal.pitch-state.pitch)>.01*DEG||safe-state.distance>.01;
   return{position:at(state.distance),yaw:state.yaw,pitch:state.pitch,distance:state.distance,adjusted:goal.adjusted||safe<distance-.001,settling};
 },stats:()=>({frames,maxYawStep,maxPitchStep,collisions,planChecks,rayChecks,yaw:state?.yaw??null,pitch:state?.pitch??null})};
}
