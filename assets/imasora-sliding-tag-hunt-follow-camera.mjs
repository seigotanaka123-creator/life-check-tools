// Actors face local +Z; an aligned third-person camera sits behind them.
export function huntFacingCameraYaw(actor,{freeYaw=0,paused=false,dragging=false}={}){
 if(paused||dragging||!Number.isFinite(actor?.yaw))return freeYaw;
 return Math.atan2(Math.sin(actor.yaw+Math.PI),Math.cos(actor.yaw+Math.PI));
}
// On an interruption, hold what was actually rendered, not a partially eased
// pointer target. This does not rotate the actor or alter the physical round.
export function holdHuntCameraView(actual,{yaw=0,pitch=.28}={}){
 return{yaw:Number.isFinite(actual?.yaw)?actual.yaw:Number.isFinite(yaw)?yaw:0,pitch:Number.isFinite(actual?.pitch)?actual.pitch:Number.isFinite(pitch)?pitch:.28};
}
