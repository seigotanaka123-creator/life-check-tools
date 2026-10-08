import {shovelSoilBoxes,shovelMachines,shovelDumpBody} from './imasora-construction-shovel-work.mjs';
import {PLOT} from './imasora-construction-excavator.js';
import {EXCAVATION_FENCES} from './imasora-construction-world-excavation-model.js';

// One tap casts one bounded ray. The closest solid surface decides the hit;
// a vehicle, fence or side face cannot select hidden ground behind it.
function hitBox(o,d,b){
 const c=Math.cos(b.heading??0),s=Math.sin(b.heading??0),x=o[0]-b.position[0],z=o[2]-b.position[2];
 const a=[c*x-s*z,o[1]-b.position[1],s*x+c*z],v=[c*d[0]-s*d[2],d[1],s*d[0]+c*d[2]],h=b.half??Array(3).fill(b.size/2);let near=0,far=1200,face=-1;
 for(let i=0;i<3;i++){if(Math.abs(v[i])<1e-9){if(Math.abs(a[i])>h[i])return null;continue;}let lo=(-h[i]-a[i])/v[i],hi=(h[i]-a[i])/v[i];if(lo>hi)[lo,hi]=[hi,lo];if(lo>near){near=lo;face=i===1&&v[i]<0?1:0;}far=Math.min(far,hi);if(near>far)return null;}
 return near>1e-4?{distance:near,top:face===1}:null;
}
export function pickShovelSurface(frame,origin,direction){
 if(!Array.isArray(origin)||!Array.isArray(direction)||origin.length!==3||direction.length!==3||![...origin,...direction].every(Number.isFinite))return null;
 const length=Math.hypot(...direction);if(length<1e-8)return null;const d=direction.map(v=>v/length);let nearest=null;
 const objects=[...shovelSoilBoxes(frame.soil).map(b=>({b,soil:true})),...shovelMachines(frame).map(b=>({b})),{b:shovelDumpBody(frame)},...EXCAVATION_FENCES.map(b=>({b:{position:[b.x,20,b.z],half:[b.w/2,20,b.d/2]}}))];
 for(const obj of objects){const hit=hitBox(origin,d,obj.b);if(hit&&(!nearest||hit.distance<nearest.distance-1e-6))nearest={...hit,selectable:!!obj.soil&&hit.top};}
 if(d[1]<-1e-8)for(const y of [0,PLOT.bottom]){const distance=(y-origin[1])/d[1],x=origin[0]+d[0]*distance,z=origin[2]+d[2]*distance,inside=x>=PLOT.minX&&x<PLOT.maxX&&z>=PLOT.minZ&&z<PLOT.maxZ;if(distance>1e-4&&distance<=1200&&(y===0?!inside:inside)&&(!nearest||distance<nearest.distance-1e-6))nearest={distance,selectable:true};}
 if(!nearest?.selectable)return null;
 return origin.map((v,i)=>v+d[i]*nearest.distance);
}
export function placementTap(start,end){return !!start&&start.id===end.pointerId&&[end.clientX,end.clientY].every(Number.isFinite)&&!start.dragged&&Math.hypot(end.clientX-start.x,end.clientY-start.y)<=8;}
export const travelHeading=(x,z)=>Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x,z)>1e-6?Math.atan2(x,z):null;
