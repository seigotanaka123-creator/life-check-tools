import {constructionBase} from './free-supported-build.mjs';
import {freeWorkMask,freeWorkCells} from './free-work-parts.mjs';
import {freeWorkPartsProblem} from './free-work-placement.mjs';
import {vehicleFootprints,overlaps} from './free-vehicle-contact.mjs';
export function freeWorkEnvironmentProblem(p,index,mask,{foot,blockedAt=()=>false,supportHeightAt=()=>0}={}){
 const problem=freeWorkPartsProblem(p,index,mask);if(problem)return problem;
 const f=p.freeBuild,w=f.completed[index],changed=freeWorkMask(w)^mask;
 for(const c of freeWorkCells(w,changed)){
  if(foot&&Math.abs(c.x-f.location.x-foot.x)<20&&Math.abs(c.z-f.location.z-foot.z)<20)return '足元の部分は変更できません。作品から離れてください。';
  if(!(mask&(1<<c.index)))continue;
  // Four square queries cover the whole restored part.
  for(const dx of [-4,4])for(const dz of [-4,4])if(blockedAt(c.x+dx,c.z+dz,4))return '建物・土・水などがある部分は復元できません。';
  for(const dx of [-7.9,0,7.9])for(const dz of [-7.9,0,7.9]){const y=supportHeightAt(c.x+dx,c.z+dz);if(!Number.isFinite(y)||Math.abs(y-constructionBase(w))>.12)return '平らな地面を確保してから復元してください。';}
  const tile={x:c.x-f.location.x,z:c.z-f.location.z,hx:8,hz:8,heading:0};
  for(const name of ['truck','pump'])if(vehicleFootprints(f[name],name).some(body=>overlaps(body,tile)))return '車両を移動してから復元してください。';
 }
 return '';
}
