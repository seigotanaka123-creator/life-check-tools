import {waterBuildTotal,validateWaterBuilds} from './imasora-construction-water-build.mjs?v=120fb';
import {inWorkArea} from './imasora-construction-field-area.mjs?v=120ey';

// Water placed in the field belongs to the same finite tank circuit. A pool
// keeps its measured volume and position through saving and recovery.
export const fieldWaterTotal=s=>Object.values(s.pools??{}).reduce((n,p)=>n+p.q,0)+waterBuildTotal(s);
export const poolKey=p=>[p.x,p.y,p.z].join(',');
export function fieldWaterTarget(s,p,external=[],heightAt=()=>0){
 if(!s.loader.vehicle.field)return null;
 const target={x:Math.round(p.x/8)*8,y:0,z:Math.round(p.z/8)*8};
 const height=heightAt(target.x,target.z);
 if(!Number.isFinite(height)||height< -32||height>48)return null;
 target.y=height;
 // A gentle slope can receive water too. Missing ground and cliffs cannot.
 for(let dx=-6;dx<=6;dx+=2)for(let dz=-6;dz<=6;dz+=2){
  if(dx*dx+dz*dz>36)continue;
  const surface=heightAt(target.x+dx,target.z+dz);
  if(!inWorkArea({x:target.x+dx,z:target.z+dz},s.loader.vehicle)||!Number.isFinite(surface)||surface< -32||surface>48||Math.abs(surface-height)>2)return null;
 }
 for(const b of external){const c=Math.cos(b.angle??0),sn=Math.sin(b.angle??0),x=target.x-b.x,z=target.z-b.z;
  const dx=Math.max(0,Math.abs(c*x-sn*z)-b.w/2),dz=Math.max(0,Math.abs(sn*x+c*z)-b.d/2);
  if(Math.hypot(dx,dz)<7&&b.y+b.h>height+.05&&b.y<height+48)return null;
 }
 return target;
}
export function nearbyFieldPool(s,p){return Object.entries(s.pools??{}).filter(([,v])=>v.q>0&&Math.hypot(v.x-p.x,v.y-p.y,v.z-p.z)<=42).sort((a,b)=>Math.hypot(a[1].x-p.x,a[1].z-p.z)-Math.hypot(b[1].x-p.x,b[1].z-p.z))[0]??null;}
export function validateFieldPools(s){
 validateWaterBuilds(s);
 if(s.pools===undefined)return;
 if(!s.loader.vehicle.field||!s.pools||Object.getPrototypeOf(s.pools)!==Object.prototype||Object.keys(s.pools).length>768)throw Error('現場の水の記録が不正です。');
 for(const [k,p]of Object.entries(s.pools)){
  if(!p||Object.keys(p).sort().join(',')!=='dir,q,x,y,z'||![p.x,p.y,p.z].every(Number.isFinite)||p.x%8||p.z%8||p.y< -32||p.y>48||!inWorkArea(p,s.loader.vehicle)||k!==poolKey(p)||!Number.isSafeInteger(p.q)||p.q<1||p.q>768||![1,2,4,8,16,32].includes(p.dir))throw Error('現場の水の量・位置が不正です。');
 }
}
