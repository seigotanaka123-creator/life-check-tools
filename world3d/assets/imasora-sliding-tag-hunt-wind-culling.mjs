import * as T from './three.module.min.js';
import {HUNT_FIELDS} from './imasora-sliding-tag-hunt-items.mjs';

// Match the wind cone. Contact adds the monster's body radius separately.
const halfWidth=distance=>3+distance*.2;

// Include every animated endpoint AND the mouth used when a wall blocks it.
// This is a conservative drawing bound; it never participates in game physics.
export function huntWindBounds(fan, box=new T.Box3()) {
 const dx=Math.sin(fan.yaw),dz=Math.cos(fan.yaw),start=fan.radius+.1,end=HUNT_FIELDS.windRange;
 const along=(end-start)/2,across=halfWidth(end);
 const x=fan.x+dx*(start+end)/2,z=fan.z+dz*(start+end)/2;
 const rx=Math.abs(dx)*along+Math.abs(dz)*across,rz=Math.abs(dz)*along+Math.abs(dx)*across;
 box.min.set(x-rx-.25,fan.y+3.2-.25,z-rz-.25);
 box.max.set(x+rx+.25,fan.y+7.6+.25,z+rz+.25);
 return box;
}

export function createHuntWindCulling(camera) {
 const frustum=new T.Frustum(),matrix=new T.Matrix4(),box=new T.Box3();
 let prepared=false,candidates=0,culled=0,rays=0,frustumUpdates=0;
 return {
  beginFrame(){prepared=false;candidates=culled=rays=frustumUpdates=0;},
  visible(fan){
   candidates++;
   if(!camera)return true;
   // Most frames have no fan: do not build a frustum unless one needs it.
   if(!prepared){matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);prepared=true;frustumUpdates++;}
   const visible=frustum.intersectsBox(huntWindBounds(fan,box));
   if(!visible)culled++;
   return visible;
  },
  ray(){rays++;},
  stats:()=>({candidates,culled,rays,frustumUpdates})
 };
}

// Wind shape and wall clipping depend only on the fan transform and match
// time. The camera still decides visibility on every frame.
export function createHuntWindGeometry({sight,onRay}){
 const samples=new WeakMap();
 const mouth={x:0,y:0,z:0},point={x:0,y:0,z:0};
 return function update(position,fan,time){
  const {x,y,z,yaw,radius}=fan;
  let sample=samples.get(position);
  if(sample&&sample.time===time&&sample.x===x&&sample.y===y&&sample.z===z&&sample.yaw===yaw&&sample.radius===radius)return;
  const dx=Math.sin(yaw),dz=Math.cos(yaw),p=position.array;
  mouth.x=x+dx*(radius+.1);mouth.y=y+5.4;mouth.z=z+dz*(radius+.1);
  for(let j=0;j<12;j++){
   const along=radius+1+(time*22+j*3.1)%(HUNT_FIELDS.windRange-radius-2);
   const lane=j%3-1;
   point.y=y+5.4+(Math.floor(j/3)%3-1)*2.2;
   for(let k=0;k<2;k++){
    const distance=Math.min(HUNT_FIELDS.windRange,along+k*1.8),across=lane*halfWidth(distance),at=(j*2+k)*3;
    point.x=x+dx*distance+dz*across;
    point.z=z+dz*distance-dx*across;
    onRay();
    const end=sight(mouth,point,.1)?point:mouth;
    p[at]=end.x;p[at+1]=end.y;p[at+2]=end.z;
   }
  }
  if(!sample){sample={};samples.set(position,sample);}
  sample.x=x;sample.y=y;sample.z=z;sample.yaw=yaw;sample.radius=radius;sample.time=time;
  position.needsUpdate=true;
 };
}
