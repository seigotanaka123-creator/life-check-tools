// Frame the actual ghost mesh and the player together. This is temporary;
// never replace the player's saved walking camera settings.
export function buildingCameraFrame({min,max,actor,yaw,pitch=.55,fov=55,aspect=1}){
 if(![...min,...max,...actor,yaw,pitch,fov,aspect].every(Number.isFinite)||aspect<=0||fov<=1||fov>=179)return null;
 const low=min.map((v,i)=>Math.min(v,actor[i]-(i===1?0:16))),high=max.map((v,i)=>Math.max(v,actor[i]+(i===1?42:16)));
 const target=low.map((v,i)=>(v+high[i])/2),radius=Math.hypot(...high.map((v,i)=>(v-low[i])/2));
 const vfov=fov*Math.PI/360,halfAngle=Math.min(vfov,Math.atan(Math.tan(vfov)*aspect)),distance=radius/Math.sin(halfAngle)*1.1,angle=Math.max(.3,Math.min(1.15,pitch));
 return{target,position:[target[0]-Math.sin(yaw)*Math.cos(angle)*distance,target[1]+Math.sin(angle)*distance,target[2]-Math.cos(yaw)*Math.cos(angle)*distance],distance};
}
