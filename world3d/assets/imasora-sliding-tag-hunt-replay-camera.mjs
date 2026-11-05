import{createHuntSmoothCamera}from'./imasora-sliding-tag-hunt-smooth-camera.mjs';
import{worldCameraPose,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
// A replay begins with its own establishing shot. The ordinary camera's
// history remains available when returning to the result or starting again.
export function createHuntReplayCamera({plan=worldCameraPose,clear}={}){
 const camera=createHuntSmoothCamera({plan,...(clear?{clear}:{})});let first=true,cuts=0,elevated=false;
 return{reset(){camera.reset();first=true;cuts=0;elevated=false;},update(target,options){
  if(first){const shot=options.keepAngle?options:plan(target,{...options,previousYaw:options.yaw,maxTurn:Infinity});camera.reset({yaw:shot.yaw,pitch:shot.pitch});first=false;cuts++;}
  const pose=camera.update(target,options);
  if(!options.wide)return pose;
  const minimum=options.minDistance;
  elevated=pose.distance<minimum+(elevated?5:0);
  const seesSubjects=position=>!options.subjects||options.subjects.every(subject=>worldSight(subject,position));
  if(!elevated&&seesSubjects(pose.position))return pose;
  const distance=options.distance,yaw=pose.yaw;
  const elevatedPose=pitch=>{
   const reach=distance*Math.cos(pitch);
   const position={x:target.x+Math.sin(yaw)*reach,y:target.y+Math.sin(pitch)*distance,z:target.z+Math.cos(yaw)*reach};
   return{...pose,position,pitch,distance,adjusted:true};
  };
  let anchorView=null;
  for(const pitch of [1.08,1.22,1.36,1.48]){
   if(pitch<pose.pitch)continue;
   if(!elevated&&pitch-pose.pitch>.27)break;
   const candidate=elevatedPose(pitch);
   if(!worldSight(target,candidate.position,.8))continue;
   if(seesSubjects(candidate.position))return candidate;
   anchorView??=candidate;
  }
  if(!elevated)return pose;
  const overhead=elevatedPose(Math.PI/2-.015);
  const overheadClear=worldSight(target,overhead.position,.8);
  if(overheadClear&&seesSubjects(overhead.position))return overhead;
  if(anchorView)return anchorView;
  // Use a cutaway only when a roof also blocks the overhead view.
  return{...overhead,near:overheadClear ? .15 : distance-8};
 },stats:()=>({...camera.stats(),cuts})};
}
