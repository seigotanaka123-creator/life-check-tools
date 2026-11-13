import{huntCanObserve,huntHasClearSight}from'./imasora-sliding-tag-hunt-sight.mjs';
import{huntIsDizzy}from'./imasora-sliding-tag-hunt-cushion-stun.mjs';
import{worldHeight,worldSteering,worldTraversable,worldValid}from'./imasora-sliding-tag-hunt-world.mjs';

const advanceSeconds=.58, holdSeconds=.95;

function approachPoint(hunter,lastSeen){
 const dx=lastSeen.x+lastSeen.vx*.45-hunter.x;
 const dz=lastSeen.z+lastSeen.vz*.45-hunter.z;
 const gap=Math.hypot(dx,dz),speed=Math.hypot(hunter.vx,hunter.vz);
 if(Math.hypot(lastSeen.vx,lastSeen.vz)>1&&dx*lastSeen.vx+dz*lastSeen.vz<0)return null;
 if(gap<2||speed>1&&dx*hunter.vx+dz*hunter.vz<0)return null;
 const travel=Math.min(gap,Math.max(4,Math.min(12,speed*.5)));
 const radius=hunter.radius-.05;
 for(const scale of[1,.55,.25]){
  const x=hunter.x+dx/gap*travel*scale,z=hunter.z+dz/gap*travel*scale;
  const point={x,z,y:worldHeight(x,z)};
  if(worldValid(point,radius)&&worldTraversable(hunter,point,radius))return point;
 }
 return null;
}

export function rememberCloakDisappearance(state){
 const {player,time}=state;
 const lastSeen={x:player.x,y:player.y,z:player.z,vx:player.vx,vz:player.vz};
 for(const hunter of state.hunters){
  if(hunter.flight||huntIsDizzy(state,hunter)||huntHasClearSight(state,hunter)
     ||!huntCanObserve(state,hunter,player,hunter.role==='patrol'?70:140))continue;
  const brain=hunter.brain;
  const point=approachPoint(hunter,lastSeen);
  brain.cloakReaction={point,advanceUntil:time+advanceSeconds,holdUntil:time+advanceSeconds+holdSeconds};
  brain.seen={...lastSeen};
  brain.seenAt=time;
  brain.next=0;
  brain.searchPlan=null;
  brain.closeChase=null;
  brain.airPursuit=null;
  brain.supply=null;
 }
}

export function cloakDisappearanceMovement(hunter,time,runnerVisible){
 const reaction=hunter.brain.cloakReaction;
 if(!reaction)return null;
 if(runnerVisible||time>=reaction.holdUntil){
  delete hunter.brain.cloakReaction;
  hunter.brain.next=0;
  return null;
 }
 const point=reaction.point;
 if(point&&time<reaction.advanceUntil&&Math.hypot(hunter.x-point.x,hunter.z-point.z)>1.8){
  return worldSteering(hunter,point,null,{sprint:false});
 }
 // Brake through the usual movement solver, including on ice. On arrival
 // the same reaction cannot restart if a collision nudges the hunter.
 reaction.point=null;
 return Math.hypot(hunter.vx,hunter.vz)>.22?worldSteering(hunter,hunter,null,{sprint:false}):{};
}
