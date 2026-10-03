// One sampled centreline owns both rendering and contact. No physics state or soil is changed.
import * as T from '../three.module.min.js';
const vec=p=>new T.Vector3(p.x,p.y??0,p.z);
export const SUPPLY_HOSE_RADIUS=1.1,HOSE_CLEARANCE=.2;
export function curveSupplyHose(route,sag=20,round=4){
 const points=[vec(route[0])];
 const append=p=>{const a=points.at(-1).clone(),n=Math.max(1,Math.ceil(a.distanceTo(p)/2));for(let i=1;i<=n;i++)points.push(a.clone().lerp(p,i/n));};
 for(let i=1;i<route.length-1;i++){
  const a=vec(route[i-1]),b=vec(route[i]),c=vec(route[i+1]),cut=Math.min(round,a.distanceTo(b)/4,c.distanceTo(b)/4),start=b.clone().lerp(a,cut/b.distanceTo(a)),end=b.clone().lerp(c,cut/b.distanceTo(c));append(start);
  const n=Math.max(2,Math.ceil(cut*2));for(let j=1;j<=n;j++){const t=j/n;points.push(start.clone().multiplyScalar((1-t)**2).addScaledVector(b,2*t*(1-t)).addScaledVector(end,t*t));}
 }
 append(vec(route.at(-1)));let total=0;const distances=[0];for(let i=1;i<points.length;i++){total+=points[i].distanceTo(points[i-1]);distances.push(total);}
 return points.map((p,i)=>({x:p.x,y:p.y-sag*Math.sin(Math.PI*distances[i]/total)**2,z:p.z}));
}
export function hangingHose(end,tip,heading=0,response={x:0,z:0}){
 const length=vec(end).distanceTo(vec(tip)),n=Math.max(1,Math.ceil(length/2)),bow=Math.min(2.2,length*.1);
 return Array.from({length:n+1},(_,i)=>{const t=i/n,p=vec(end).lerp(vec(tip),t),offset=bow*Math.sin(Math.PI*t)**2;return{x:p.x+Math.cos(heading)*offset+response.x*Math.sin(Math.PI*t)**2,y:p.y,z:p.z-Math.sin(heading)*offset+response.z*Math.sin(Math.PI*t)**2};});
}
export function hoseLength(path){return path.slice(1).reduce((n,b,i)=>n+vec(b).distanceTo(vec(path[i])),0);}
export function hoseBlocks(path,x,z,radius=14){
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<radius+SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE)return true;}
 return false;
}
export function hoseCorners(path,margin=18){if(!path.length)return[];const xs=path.map(p=>p.x),zs=path.map(p=>p.z);return[Math.min(...xs)-margin,Math.max(...xs)+margin].flatMap(x=>[Math.min(...zs)-margin,Math.max(...zs)+margin].map(z=>({x,z})));}
export function hoseGeometry(path,location,motionRadius=0){return{floors:[],walls:path.slice(1).map((b,i)=>{const a=path[i],radius=SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE+motionRadius;return{id:'construction-concrete-supply-hose-'+i,buildingId:'construction-concrete',x:location.x+(a.x+b.x)/2,z:location.z+(a.z+b.z)/2,rotation:Math.atan2(b.x-a.x,b.z-a.z),localHalfX:radius,localHalfZ:Math.hypot(b.x-a.x,b.z-a.z)/2+radius,minY:Math.min(a.y,b.y)-radius,maxY:Math.max(a.y,b.y)+radius,surfaceEdge:true,stepAdjacent:false};})};}
