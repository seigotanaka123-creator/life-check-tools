import {groundQueries} from './ground-grid.mjs?v=120hb';
import {constructionBase} from './free-supported-build.mjs?v=120pv';
import {freeWorkMask,freeWorkCells} from './free-work-parts.mjs?v=120hb';
import {freeWorkPartsProblem} from './free-work-placement.mjs?v=120pv';
import {liveVehicleFootprints,overlaps} from './free-vehicle-contact.mjs?v=120pv';
export function freeWorkEnvironmentProblem(p,index,mask,{foot,blockedAt=()=>false,supportHeightAt=()=>0}={}){
 const problem=freeWorkPartsProblem(p,index,mask);if(problem)return problem;
 const f=p.freeBuild,w=f.completed[index],changed=freeWorkMask(w)^mask;
 for(const c of freeWorkCells(w,changed)){
  if(foot&&Math.abs(c.x-f.location.x-foot.x)<(c.w??16)/2+12&&Math.abs(c.z-f.location.z-foot.z)<(c.d??16)/2+12)return '足元の部分は変更できません。作品から離れてください。';
  if(!(mask&(1<<c.index)))continue;
  // Four square queries cover the whole restored part.
  for(const q of groundQueries(c))if(blockedAt(c.x+q.x,c.z+q.z,q.r))return '建物・土・水などがある部分は復元できません。';
  for(const dx of [-(c.w??16)/2+.1,0,(c.w??16)/2-.1])for(const dz of [-(c.d??16)/2+.1,0,(c.d??16)/2-.1]){const y=supportHeightAt(c.x+dx,c.z+dz);if(!Number.isFinite(y)||Math.abs(y-constructionBase(w))>.12)return '平らな地面を確保してから復元してください。';}
  const tile={x:c.x-f.location.x,z:c.z-f.location.z,hx:(c.w??16)/2,hz:(c.d??16)/2,heading:0};
  for(const name of ['truck','pump'])if(liveVehicleFootprints(f[name],name).some(body=>overlaps(body,tile)))return '車両を移動してから復元してください。';
 }
 return '';
}
