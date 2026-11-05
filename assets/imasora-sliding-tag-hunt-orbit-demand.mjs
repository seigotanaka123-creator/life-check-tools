// View-only work. Never advances the round or alters the movement clock.
export function createHuntOrbitDemand(){
 let pending=false,requests=0;
 return{get pending(){return pending;},request(){pending=true;requests++;},clear(){pending=false;},
  captureYaw(rendered,requested,{viewOnly=false}={}){return viewOnly&&pending?requested:rendered;},
  frameDt(dt,{paused=false,viewOnly=false,dragging=false,replaying=false}={}){return paused&&!dragging&&!replaying&&!(viewOnly&&pending)?0:dt;},
  accept(pose,{viewOnly=false}={}){pending=viewOnly&&!!pose.settling;},
  stats:()=>({pending,requests})};
}
