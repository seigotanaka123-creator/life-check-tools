import{worldHeight,worldValid,worldTraversable,worldSteering,worldHuntAim}from'./imasora-sliding-tag-hunt-world.mjs';
export const HUNT_TEAM_CONTACT=Object.freeze({interval:.5,delay:.2,lifetime:4});
// Input consists exclusively of real optical sightings. No hidden target,
// radar, inventory, prediction of future inputs or player controls enter here.
export function updateHuntTeamContact(s,observations){
 const pending=s.teamContactPending;
 if(pending&&pending.availableAt<=s.time){s.teamContact=pending;s.teamContactPending=null;}
 if(s.teamContact&&s.time-s.teamContact.at>HUNT_TEAM_CONTACT.lifetime)s.teamContact=null;
 if(observations.length&&s.time>=(s.nextTeamContactAt??0)){
  const sighting=observations[0];s.nextTeamContactAt=s.time+HUNT_TEAM_CONTACT.interval;
  s.teamContactPending={owner:sighting.owner,at:s.time,availableAt:s.time+HUNT_TEAM_CONTACT.delay,point:{...sighting.point}};
 }
}
export function receiveHuntTeamContact(a,contact,time){
 const m=a.brain;if(!contact||contact.owner===a.owner||time<contact.availableAt||time-contact.at>HUNT_TEAM_CONTACT.lifetime||contact.at<=(m.seenAt??-Infinity))return false;
 m.seen={...contact.point};m.seenAt=contact.at;m.teamSeenAt=contact.at;m.next=0;m.searchPlan=null;m.supply=null;m.freshSweep=null;m.sweep=null;return true;
}
// Refresh the observed destination ten times a second. On open ground steer
// towards it directly; walls, steps and narrow passages retain normal routing.
// worldMove still supplies every acceleration, turn, speed limit and collision.
export function observedHuntChase(a,observed,time,m){
 if(!observed){m.closeChase=null;return null;}
 if(!m.closeChase||time>=m.closeChase.next){
  const gap=Math.hypot(observed.x-a.x,observed.z-a.z),aim=gap>55?worldHuntAim(a,observed,m).target:(()=>{
   const lead=Math.min(.35,Math.max(.06,gap/120));return{x:observed.x+(observed.vx??0)*lead,z:observed.z+(observed.vz??0)*lead,y:observed.y};})();
  const padding=(a.radius??2.7)-.05,point={x:aim.x,z:aim.z,y:worldHeight(aim.x,aim.z)},current={x:observed.x,z:observed.z,y:worldHeight(observed.x,observed.z)};
  let goal=null;
  if(gap<=60&&worldValid(point,padding)&&worldTraversable(a,point,padding))goal=point;
  else if(gap<=60&&worldValid(current,padding)&&worldTraversable(a,current,padding))goal=current;
  m.closeChase={goal,next:time+.1};
 }
 return m.closeChase.goal?worldSteering(a,m.closeChase.goal,null):null;
}
