import {soilTransportGeometry,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs';
import {PLOT} from './imasora-construction-excavator.js';
import {SITE} from './imasora-construction-loader-physics.js';

// Native terrain is a 2-unit grid. Inspect every cell touched by the tyre,
// Include steering and the projected shift from tilt/suspension. Five isolated
// sample points can miss a small hole.
// This read model never replays commands or invents/imports practice soil.
const surfaces=new WeakMap(),supports=new WeakMap(),finite=n=>typeof n==='number'&&Number.isFinite(n);
const rad=n=>n*Math.PI/180;
function surface(soil){
 let top=surfaces.get(soil);if(top)return top;top=new Map();
 // Loose fragments are objects, not a continuous ground foundation. Existing
 // body/arm collision checks still protect them. Only placed terrain supports.
 for(const b of soilTransportGeometry({blocks:soil.blocks,loose:{}})){
  const r=b.size/2,h=b.position[1]+r;
  for(let x=Math.floor((b.position[0]-r)/2);x<Math.ceil((b.position[0]+r)/2);x++)for(let z=Math.floor((b.position[2]-r)/2);z<Math.ceil((b.position[2]+r)/2);z++){
   const key=x+','+z;top.set(key,Math.max(top.get(key)??-Infinity,h));
  }
 }
 surfaces.set(soil,top);return top;
}
export function nativeDumpHeightAt(frame,x,z){
 if(!finite(x)||!finite(z)||x<SITE.minX||x>=SITE.maxX||z<SITE.minZ||z>=SITE.maxZ||frame?.soil?.schema!==2)return undefined;
 const base=x>=PLOT.minX&&x<PLOT.maxX&&z>=PLOT.minZ&&z<PLOT.maxZ?PLOT.bottom:0;
 return Math.max(base,surface(frame.soil).get(Math.floor(x/2)+','+Math.floor(z/2))??base);
}
const point=(v,x,z)=>({x:v.x+Math.cos(v.heading)*x+Math.sin(v.heading)*z,z:v.z-Math.sin(v.heading)*x+Math.cos(v.heading)*z});
function overlapArea(dx,dz,c,s,hx,hz){
 let p=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>[c*(dx+x)-s*(dz+z),s*(dx+x)+c*(dz+z)]);
 for(const [axis,sign,limit]of[[0,1,hx],[0,-1,hx],[1,1,hz],[1,-1,hz]]){const next=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],aa=sign*a[axis]-limit,bb=sign*b[axis]-limit;if(aa<=0)next.push(a);if((aa<=0)!==(bb<=0)){const u=aa/(aa-bb);next.push(a.map((v,k)=>v+(b[k]-v)*u));}}p=next;}
 return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
}
function cells(frame,centre,heading,hx,hz){
 const c=Math.cos(heading),s=Math.sin(heading),ac=Math.abs(c),as=Math.abs(s),ex=hx*ac+hz*as,ez=hx*as+hz*ac,out=[];
 for(let x=Math.floor((centre.x-ex)/2);x<Math.ceil((centre.x+ex)/2);x++)for(let z=Math.floor((centre.z-ez)/2);z<Math.ceil((centre.z+ez)/2);z++){
  const dx=x*2+1-centre.x,dz=z*2+1-centre.z;
  // Four separating axes for an axis-aligned cell and a rotated tyre/bed.
  if(Math.abs(dx)>=ex+1-1e-9||Math.abs(dz)>=ez+1-1e-9||Math.abs(c*dx-s*dz)>=hx+ac+as-1e-9||Math.abs(s*dx+c*dz)>=hz+ac+as-1e-9)continue;
  const h=nativeDumpHeightAt(frame,x*2+1,z*2+1);out.push({x:x*2+1,z:z*2+1,h,area:0});
 }
 return out;
}
function calculate(frame){
 const v=frame?.dump,stored=frame?.soil?.containers?.dump?.amount,load=stored+(frame?.soil?.pending?.from==='dump'?frame.soil.pending.amount:0);
 if(!v||!['x','z','heading'].every(k=>finite(v[k]))||v.x<SITE.minX||v.x>SITE.maxX||v.z<SITE.minZ||v.z>SITE.maxZ||Math.abs(v.heading)>Math.PI||!finite(load)||load<0||load>SOIL_CAPACITY.dump||frame.soil.schema!==2)return{ok:false,flatReady:false,reason:'車の位置と地面を確認できません。'};
 const wheels=[],patches=[],defects=[];let issue='';
 for(const z of[-31,18])for(const x of[-25.5,25.5]){
  const p=point(v,x,z),patch=cells(frame,p,v.heading,7.5,12.65);
  if(!patch.length||patch.some(q=>q.h===undefined))return{ok:false,flatReady:false,reason:'道の端です。後退して戻ってください。'};
  patches.push(patch);const min=Math.min(...patch.map(q=>q.h)),max=Math.max(...patch.map(q=>q.h));
  if(max-min>4.5)issue='タイヤの下に大きな段差があります。後退して戻ってください。';
  wheels.push({x,z,height:nativeDumpHeightAt(frame,p.x,p.z),min,max,cells:patch.length});
 }
 const rear=(wheels[0].height+wheels[1].height)/2,front=(wheels[2].height+wheels[3].height)/2,left=(wheels[0].height+wheels[2].height)/2,right=(wheels[1].height+wheels[3].height)/2;
 const y=rear+(front-rear)*31/49,pitch=Math.atan2(front-rear,49),roll=Math.atan2(right-left,51);
 if(Math.abs(pitch)>rad(load?15:19)||Math.abs(roll)>rad(load?10:13))issue='車が傾きすぎます。後退して戻ってください。';
 const chassis=cells(frame,v,v.heading,29,39),c=Math.cos(v.heading),s=Math.sin(v.heading);
 for(const q of chassis){const dx=q.x-v.x,dz=q.z-v.z,lx=c*dx-s*dz,lz=s*dx+c*dz,plane=y+Math.tan(pitch)*lz+Math.tan(roll)*lx;
  if(q.h===undefined||q.h>plane+3.75||plane-q.h>5)issue='車の下に穴や段差があります。後退して戻ってください。';
 }
 const flatReady=!issue&&wheels.every(w=>Math.abs(w.min)<.05&&Math.abs(w.max)<.05);
 // Smooth stairs may slope, but a local pit is not a supporting ramp.
 // A single isolated missing cell is not a continuous step of the ramp.
 let hole=false;
 for(const patch of patches){for(const q of patch){
  if([[-2,0],[2,0],[0,-2],[0,2]].every(([dx,dz])=>nativeDumpHeightAt(frame,q.x+dx,q.z+dz)>q.h+1.99))hole=true;
 }}
 const driveReady=!issue&&!hole;
 // Overlap areas are needed only to let a historical unsupported stop escape.
 // Supported ramps must not clip hundreds of polygons on every input frame.
 if(!driveReady){for(const [i,patch]of patches.entries()){const p=point(v,wheels[i].x,wheels[i].z);for(const q of patch)if(q.h!==0)defects.push({key:i+':'+q.x+','+q.z,area:q.h===undefined?Infinity:overlapArea(q.x-p.x,q.z-p.z,c,s,7.5,12.65)});}for(const q of chassis)if(q.h===undefined||q.h>3.2||q.h< -5)defects.push({key:'body:'+q.x+','+q.z,area:q.h===undefined?Infinity:overlapArea(q.x-v.x,q.z-v.z,c,s,29,39)});}
 return{ok:!issue,flatReady,driveReady,y,pitch,roll,wheels,defects,chassisCells:chassis.length,reason:issue||(hole||!driveReady?'タイヤの下に穴や段差があります。進む向きを変えてください。':'')};
}
export function nativeDumpSupport(frame){
 if(!frame?.soil||typeof frame.soil!=='object')return calculate(frame);
 let cache=supports.get(frame.soil);if(!cache){cache=new Map();supports.set(frame.soil,cache);}
 const key=JSON.stringify([frame.dump?.x,frame.dump?.z,frame.dump?.heading,frame.soil.containers?.dump?.amount]);
 if(cache.has(key))return cache.get(key);const result=calculate(frame);
 for(const key of['wheels','defects'])if(result[key]){for(const value of result[key])Object.freeze(value);Object.freeze(result[key]);}Object.freeze(result);
 if(cache.size>=192)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
export function nativeDumpRecoveryStep(before,after){
 const a=nativeDumpSupport(before),b=nativeDumpSupport(after);
 if(a.driveReady||!a.defects?.length||!b.defects||!finite(a.defects.reduce((n,q)=>n+q.area,0)))return false;
 const keys=new Set(a.defects.map(q=>q.key));
 return b.defects.every(q=>keys.has(q.key)&&finite(q.area))&&b.defects.reduce((n,q)=>n+q.area,0)<=a.defects.reduce((n,q)=>n+q.area,0)+1e-7;
}
// Transient feedback only: a stopped input never changes saved soil or pose.
export function dumpDriveNotice(throttle,before,after,wasBlocked=false){
 if(!throttle)return{blocked:wasBlocked,message:null};
 const blocked=before===after;
 const escape=throttle>0?'後退':'前進';
 return{blocked,message:blocked&&!wasBlocked?`この先はタイヤや車体を安全に支えられません。${escape}するか、進む向きを変えてください。`:!blocked&&wasBlocked?'走行できます。':null};
}
