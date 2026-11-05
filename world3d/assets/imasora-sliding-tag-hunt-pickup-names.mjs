import*as T from'./three.module.min.js';
import{worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
// Use the actual resolved camera, including orbit, portrait framing and replay.
// Reuse one vector. Offscreen points never request an occlusion query.
export function createHuntPickupNameView(camera,{rayClear=worldSight}={}){
 const projected=new T.Vector3();let checks=0,rays=0;
 return{visible(point){checks++;projected.copy(point).project(camera);
  if(projected.z< -1||projected.z>1||Math.abs(projected.x)>.96||projected.y<-.9||projected.y>.84)return false;
  rays++;return rayClear(camera.position,point,.15);
 },stats:()=>({checks,rays})};
}
