import * as T from '../three.module.min.js';
import {footSurface} from './free-footing.mjs';
import {VEHICLE_GROUND} from './free-vehicle-ground.mjs';

export const WALK_GROUND_MESSAGE='足元の両足を支える地面に穴・段差・強い傾きがあります。安全な地面へ停め直してください。';
// Travel may follow gentle ground. Stationary tool work separately requires a level stance.
export function walkingGroundAt(f,x,z,heightAt=()=>0,includeCured=false){
 if(!Number.isFinite(x+z))return null;
 const points=[];for(const dx of [-12,-6,0,6,12])for(const dz of [-12,-6,0,6,12]){
  const h=footSurface(f,x+dx,z+dz,heightAt,includeCured);if(!Number.isFinite(h))return null;points.push({dx,dz,h});
 }
 const mean=points.reduce((s,p)=>s+p.h,0)/points.length;
 const a=points.reduce((s,p)=>s+p.dx*p.h,0)/points.reduce((s,p)=>s+p.dx*p.dx,0),b=points.reduce((s,p)=>s+p.dz*p.h,0)/points.reduce((s,p)=>s+p.dz*p.dz,0);
 const slope=Math.hypot(a,b),error=Math.max(...points.map(p=>Math.abs(p.h-mean-a*p.dx-b*p.dz)));
 if(slope>VEHICLE_GROUND.maxSlope+1e-8||error>VEHICLE_GROUND.maxPatchError+1e-8)return null;
 return{height:points[12].h,normal:new T.Vector3(-a,1,-b).normalize(),slope,error,samples:points.length};
}
export function walkingGroundSegment(f,from,to,heightAt=()=>0,includeCured=false){
 const length=Math.hypot(to.x-from.x,to.z-from.z),n=Math.max(1,Math.ceil(length/2));let last=null;
 for(let i=0;i<=n;i++){const t=i/n,s=walkingGroundAt(f,from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,heightAt,includeCured);
  if(!s||i===0&&Number.isFinite(from.y)&&Math.abs(s.height-from.y)>.15||last!==null&&Math.abs(s.height-last)>VEHICLE_GROUND.maxSlope*length/n+.15)return false;last=s.height;
 }return true;
}
export function walkingGroundRotation(s,heading){return new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),s.normal).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading));}

// Use points on the actual rendered shoe geometry rather than the bottom of its
// world-aligned bounding box, which is incorrect once a shoe tilts on a slope.
export function renderedSoles(root,actor,feet){
 root.updateMatrixWorld(true);const points=[];
 for(const e of feet)e.o.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;const g=o.geometry;g.computeBoundingBox();const a=g.attributes.position;
  for(let i=0;i<a.count;i++)if(a.getY(i)<=g.boundingBox.min.y+.02)points.push(root.worldToLocal(o.localToWorld(new T.Vector3().fromBufferAttribute(a,i))));
 });return points;
}
export function soleClearance(root,actor,feet){
 const points=renderedSoles(root,actor,feet);if(!points.length)throw Error(WALK_GROUND_MESSAGE);
 return Math.min(...points.map(p=>p.clone().sub(actor.position).applyQuaternion(actor.quaternion.clone().invert()).y));
}
export function assertLandingSoles(f,root,actor,feet,s,heightAt,clearance){
 const points=renderedSoles(root,actor,feet);if(!points.length)throw Error(WALK_GROUND_MESSAGE);let error=0;
 for(const p of points){const h=footSurface(f,p.x,p.z,heightAt);if(!Number.isFinite(h))throw Error(WALK_GROUND_MESSAGE);error=Math.max(error,Math.abs((p.y-h)*s.normal.y-clearance));}
 if(error>.15+1e-5)throw Error(WALK_GROUND_MESSAGE);return error;
}
