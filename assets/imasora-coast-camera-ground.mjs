import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';

// The view may orbit around the walker, but its lens must not enter the solid
// island. Raise the orbit along the same radius; never zoom into the character,
// change the saved look controls, make land transparent, or add a new collider.
export function createCoastGroundCamera({heightAt=coastWalkingHeight}={}){
 const result={x:0,y:0,z:0},offsets=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]];
 let previous=null,elevation=0;
 return function resolve(target,desired,{near=4,fov=55,aspect=1}={}){
  const key=[target.x,target.y,target.z,desired.x,desired.y,desired.z,near,fov,aspect];
  if(previous&&key.every((v,i)=>v===previous[i]))return result;
  const dx=desired.x-target.x,dy=desired.y-target.y,dz=desired.z-target.z,horizontal=Math.hypot(dx,dz),distance=Math.hypot(horizontal,dy);
  result.x=desired.x;result.y=desired.y;result.z=desired.z;
  if(!(distance>1)||!key.every(Number.isFinite)){previous=null;return result;}
  const ux=horizontal>1e-6?dx/horizontal:0,uz=horizontal>1e-6?dz/horizontal:1;
  // A sphere encloses all four corners of the near clipping plane, including
  // a wide landscape screen. Checking only the camera point still cuts sand.
  const tangent=Math.tan(fov*Math.PI/360),radius=Math.hypot(near,near*tangent,near*tangent*aspect)+3;
  function clear(angle){
   const h=Math.cos(angle)*distance,v=Math.sin(angle)*distance,x=target.x+ux*h,z=target.z+uz*h,y=target.y+v;
   for(const [sx,sz]of offsets)if(y<heightAt(x+sx*radius,z+sz*radius)+radius)return false;
   // Keep the line of sight out of a ridge too. This is the immutable terrain
   // height field, not a per-frame raycast against every scenery mesh.
   const steps=Math.max(1,Math.ceil(h/4));
   for(let n=1;n<steps;n++){const t=n/steps;if(target.y+v*t<heightAt(target.x+ux*h*t,target.z+uz*h*t)+6)return false;}
   return true;
  }
  const wanted=Math.atan2(dy,horizontal);
  if(clear(wanted)){elevation=wanted;previous=key;return result;}
  let low=wanted,high=Math.max(wanted,Math.min(Math.PI/2,elevation)),safe=high>wanted&&clear(high);
  while(!safe&&high<Math.PI/2){low=high;high=Math.min(Math.PI/2,high+.12);safe=clear(high);}
  // A legitimate dry-land target is above its supporting terrain. A malformed
  // target inside a solid is left to the existing player/restore safeguards.
  if(!safe){previous=null;return result;}
  for(let n=0;n<9;n++){const mid=(low+high)/2;if(clear(mid))high=mid;else low=mid;}
  elevation=high;previous=key;const h=Math.cos(high)*distance;
  result.x=target.x+ux*h;result.y=target.y+Math.sin(high)*distance;result.z=target.z+uz*h;
  return result;
 };
}
