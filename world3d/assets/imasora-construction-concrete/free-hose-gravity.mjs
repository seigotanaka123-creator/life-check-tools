// Quasi-static vertical relaxation of an already clear hose. Fixed couplers,
// ground support and checked edges constrain gravity and elastic tension.
// A finite solve runs at installation, never in the animation frame loop.
import {createHoseSelfContact} from './free-hose-self-contact.mjs';
export const HOSE_GRAVITY_LIMITS=Object.freeze({passes:32,checks:4000,step:.5,strain:.04,stiffness:1200});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function settleSupplyHose(source,floor,edgeClear,{gravity=1,stiffness=HOSE_GRAVITY_LIMITS.stiffness,maxLength=240,maxChecks=HOSE_GRAVITY_LIMITS.checks,canContinue=()=>true}={}){
 if(!Array.isArray(source)||source.length<2||source.length>300||!Array.isArray(floor)||floor.length!==source.length||!source.every((p,i)=>['x','y','z'].every(k=>Number.isFinite(p[k]))&&Number.isFinite(floor[i])&&floor[i]<=p.y+1e-8)||!Number.isFinite(gravity)||gravity<0||!Number.isFinite(stiffness)||stiffness<=0)throw Error('ホースの重さと支えを確認できません。');
 const path=source.map(p=>({...p})),rest=source.slice(1).map((b,i)=>distance(source[i],b)),lengths=[...rest],mass=source.map((_,i)=>((rest[i-1]??0)+(rest[i]??0))/2);let total=rest.reduce((a,b)=>a+b,0),checks=0,passes=0,capped=false;
 if(!Number.isFinite(maxLength)||total>maxLength+1e-8)throw Error('ホースが長すぎます。');
 const self=createHoseSelfContact(path);if(!self.clear())throw Error('ホースが重なっています。両車の後ろに通路を空けてください。');
 const elastic=(length,index)=>.5*stiffness*Math.max(0,length-rest[index])**2/Math.max(rest[index],1e-8);
 const energy=()=>path.reduce((n,p,i)=>n+mass[i]*gravity*p.y,0)+lengths.reduce((n,l,i)=>n+elastic(l,i),0),energyBefore=energy();
 solve:for(let pass=0;pass<HOSE_GRAVITY_LIMITS.passes;pass++){
  passes++;let changed=false;
  for(let k=1;k<path.length-1;k++){
   if(checks+2>maxChecks||!canContinue()||self.exhausted){capped=true;break solve;}
   const i=pass%2?path.length-1-k:k,p=path[i],a=path[i-1],b=path[i+1];if(rest[i-1]<1e-8||rest[i]<1e-8)continue;
   let lo=Math.max(floor[i],p.y-HOSE_GRAVITY_LIMITS.step),hi=Math.min(source[i].y,p.y+HOSE_GRAVITY_LIMITS.step);
   for(const [other,j]of[[a,i-1],[b,i]]){const reach=rest[j]*(1+HOSE_GRAVITY_LIMITS.strain),dy=Math.sqrt(Math.max(0,reach*reach-(p.x-other.x)**2-(p.z-other.z)**2));lo=Math.max(lo,other.y-dy);hi=Math.min(hi,other.y+dy);}
   if(hi-lo<1e-7)continue;
   const derivative=y=>{let force=mass[i]*gravity;for(const[other,j]of[[a,i-1],[b,i]]){const l=Math.hypot(p.x-other.x,y-other.y,p.z-other.z);force+=stiffness*Math.max(0,l-rest[j])/rest[j]*(y-other.y)/Math.max(l,1e-8);}return force;};
   let low=lo,high=hi;for(let n=0;n<18;n++){const mid=(low+high)/2;if(derivative(mid)>0)high=mid;else low=mid;}const target=(low+high)/2;
   if(Math.abs(target-p.y)<1e-5)continue;
   const next={...p,y:target},left=distance(a,next),right=distance(next,b),newTotal=total-lengths[i-1]-lengths[i]+left+right;
   if(newTotal>maxLength+1e-8)continue;
   const delta=mass[i]*gravity*(target-p.y)+elastic(left,i-1)+elastic(right,i)-elastic(lengths[i-1],i-1)-elastic(lengths[i],i);if(delta>=-1e-8)continue;
   // Sub-radius moves with whole-segment checks cannot step through thin walls.
   if(!self.moveClear(i,next))continue;
   checks++;if(!edgeClear(a,next))continue;checks++;if(!edgeClear(next,b))continue;
   path[i]=next;lengths[i-1]=left;lengths[i]=right;total=newTotal;changed=true;
  }
  if(!changed)break;
 }
 return{path,passes,checks,capped:capped||self.exhausted,selfPairs:self.pairs,selfChecks:self.distances,energyBefore,energyAfter:energy(),length:total,maxStrain:Math.max(0,...lengths.map((l,i)=>rest[i]>1e-8?l/rest[i]-1:0))};
}
