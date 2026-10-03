import {SUPPLY_HOSE_RADIUS,HOSE_CLEARANCE} from './free-hose-shape.mjs';

// Capsule separation for distinct portions of the tube. The material within
// one diameter of a joint is continuous, so it is not a separate collider.
export const HOSE_SELF_LIMITS=Object.freeze({pairs:400000,distances:40000,sweepDepth:8});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export function hoseSegmentDistance(a,b,c,d){
 const u=sub(b,a),v=sub(d,c),w=sub(a,c),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w);let s=0,t=0;
 if(aa<1e-16&&cc<1e-16)return distance(a,c);
 if(aa<1e-16)t=clamp(ee/cc);
 else if(cc<1e-16)s=clamp(-dd/aa);
 else{const den=aa*cc-bb*bb;s=den>1e-14*aa*cc?clamp((bb*ee-cc*dd)/den):0;t=(bb*s+ee)/cc;if(t<0){t=0;s=clamp(-dd/aa);}else if(t>1){t=1;s=clamp((bb-dd)/aa);}}
 return distance(mix(a,b,s),mix(c,d,t));
}
function apart(a,b,c,d,pad){return Math.max(a.x,b.x)+pad<Math.min(c.x,d.x)||Math.max(c.x,d.x)+pad<Math.min(a.x,b.x)||Math.max(a.y,b.y)+pad<Math.min(c.y,d.y)||Math.max(c.y,d.y)+pad<Math.min(a.y,b.y)||Math.max(a.z,b.z)+pad<Math.min(c.z,d.z)||Math.max(c.z,d.z)+pad<Math.min(a.z,b.z);}

// path is the solver's private mutable copy; only checked vertex moves may be
// committed to it. Material adjacency stays tied to the original rest length.
export function createHoseSelfContact(path,{maxPairs=HOSE_SELF_LIMITS.pairs,maxDistances=HOSE_SELF_LIMITS.distances}={}){
 if(!Array.isArray(path)||path.length<2||path.length>300||!path.every(p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k])))||!Number.isSafeInteger(maxPairs)||maxPairs<0||!Number.isSafeInteger(maxDistances)||maxDistances<0)throw Error('ホースの重なりを確認できません。');
 const separation=2*SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE,arc=[0];for(let i=1;i<path.length;i++)arc[i]=arc[i-1]+distance(path[i-1],path[i]);
 let pairs=0,distances=0,exhausted=false;
 const nonlocal=(i,j)=>{if(i>j)[i,j]=[j,i];return j>i+1&&arc[j]-arc[i+1]>=separation-1e-7;};
 const check=(a,b,c,d,pad=separation)=>{if(++pairs>maxPairs){pairs=maxPairs;exhausted=true;return false;}if(apart(a,b,c,d,pad))return true;if(++distances>maxDistances){distances=maxDistances;exhausted=true;return false;}return hoseSegmentDistance(a,b,c,d)>=pad-1e-8;};
 function clear(){for(let i=0;i<path.length-1;i++)for(let j=i+2;j<path.length-1;j++)if(nonlocal(i,j)&&!check(path[i],path[i+1],path[j],path[j+1]))return false;return !exhausted;}
 function sweep(a,b,endA,endB,c,d,depth=0){
  // Reject distant pairs without allocating intermediate poses. Every point
  // stays within move of its initial pose, or move/2 of its midpoint pose.
  const move=Math.max(distance(a,endA),distance(b,endB));
  if(check(a,b,c,d,separation+move))return true;if(exhausted)return false;
  const ma=mix(a,endA,.5),mb=mix(b,endB,.5);
  if(check(ma,mb,c,d,separation+move/2))return true;
  if(exhausted||depth>=HOSE_SELF_LIMITS.sweepDepth)return false;
  if(!check(ma,mb,c,d))return false;
  return sweep(a,b,ma,mb,c,d,depth+1)&&sweep(ma,mb,endA,endB,c,d,depth+1);
 }
 function moveClear(index,next){
  if(!Number.isInteger(index)||index<1||index>=path.length-1||!next||!['x','y','z'].every(k=>Number.isFinite(next[k])))return false;
  for(const i of[index-1,index])for(let j=0;j<path.length-1;j++)if(nonlocal(i,j)){
   const a=path[i],b=path[i+1],endA=i===index?next:a,endB=i+1===index?next:b;
   if(!sweep(a,b,endA,endB,path[j],path[j+1]))return false;
  }
  return !exhausted;
 }
 return{clear,moveClear,get pairs(){return pairs;},get distances(){return distances;},get exhausted(){return exhausted;}};
}
export const hoseSelfClear=path=>createHoseSelfContact(path).clear();
