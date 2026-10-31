// One distance scale for walking, sailing and fitted placement previews.
export const CAMERA_DISTANCE_PRESETS = Object.freeze([
  Object.freeze({label:'近景', distance:145}),
  Object.freeze({label:'標準', distance:190}),
  Object.freeze({label:'引き', distance:250}),
  Object.freeze({label:'遠景', distance:330}),
]);
export function cameraDistanceIndex(index) {
  return Number.isInteger(index) ? Math.max(0, Math.min(3,index)) : 1;
}
export function worldCameraDistance(index,{aspect=1,base=190,fit=0}={}) {
  const distance=CAMERA_DISTANCE_PRESETS[cameraDistanceIndex(index)].distance;
  // Narrow screens retain room either side of the monster. A fitted subject
  // still fits at the nearest setting; all four settings remain distinct.
  const portrait=Math.max(1,Math.min(1.4,.8/Math.max(.2,aspect)));
  return Math.max(base*portrait,fit*190/145)*distance/190;
}
// Keep a useful horizontal field on tall phones, without an extreme fisheye.
// This changes the lens only: the actual eyes, tools and contacts stay real.
export function firstPersonFov(aspect=1) {
 const ratio=Number.isFinite(aspect)&&aspect>0?aspect:1;
 return Math.min(92,Math.max(64,2*Math.atan(Math.tan(23*Math.PI/180)/ratio)*180/Math.PI));
}
export function createFirstPersonLens(){
 let owned=null,original=null;
 function restore(){if(!owned)return;if(owned.fov!==original){owned.fov=original;owned.updateProjectionMatrix();}owned=null;original=null;}
 return{apply(camera,enabled){if(owned&&(owned!==camera||!enabled))restore();if(!enabled)return;if(!owned){owned=camera;original=camera.userData?.eyeViewBaseFov??camera.fov;}const fov=firstPersonFov(camera.aspect);if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}},restore};
}
export function nextCameraDistance(mode,index) {
  // Pressing distance from eye view first returns to the labelled orbit.
  return {mode:'third',index:mode==='first'?cameraDistanceIndex(index):(cameraDistanceIndex(index)+1)%4};
}
export function conversationFraming({width,height,panel,index=1,fov=48}) {
  const portrait=height>=width;
  const usableWidth=portrait?width:Math.max(width*.45,panel.left-12);
  const usableHeight=portrait?Math.max(height*.4,panel.top-12):height;
  const fraction=Math.max(.25,Math.min(usableHeight/height,usableWidth/height));
  const fit=38/(Math.tan(fov*Math.PI/360)*fraction);
  return {distance:Math.max(115,fit)*(1+(cameraDistanceIndex(index)-1)*.16),
    offsetX:(width-usableWidth)/2,offsetY:(height-usableHeight)/2};
}
