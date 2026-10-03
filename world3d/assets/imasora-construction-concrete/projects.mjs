import {freeWorkMask,freeWorkCells} from './free-work-parts.mjs';
import {freeGeometry} from './free-build-state.mjs';
import {floorMask,floorPanels,floorPanelsProblem,boxesOverlap} from './floor-parts.mjs';
export const DEFAULT_CONCRETE_LOCATION=Object.freeze({x:600,z:1450});
export const MAX_CONCRETE_FLOORS=16;
export const concreteLocation=project=>project.location??DEFAULT_CONCRETE_LOCATION;
export function nextFloorProblem(project,position){
 if(project.site.stage!=='demolded'||project.site.bucketCells)return '今の床を完成させ、型枠を外してください。';
 if(project.mixer?.pending)return '混練を終えるか取り消してください。';
 if((project.completedFloors?.length??0)+1>=MAX_CONCRETE_FLOORS)return '保存できる床は16枚までです。';
 if(!position||!Number.isSafeInteger(position.x)||!Number.isSafeInteger(position.z)||Math.abs(position.x)>2500||Math.abs(position.z)>1600)return '工事現場の内側を選んでください。';
 const free=project.freeBuild;if(free?.location&&Math.abs(position.x-free.location.x)<280&&Math.abs(position.z-free.location.z)<280)return '自由施工の作業区画と重なります。';
 if((free?.completed??[]).some(w=>freeWorkMask(w)&&Math.abs(w.x-position.x)<160&&Math.abs(w.z-position.z)<160))return '自由施工の完成作品と重なります。';
 const floors=[...(project.completedFloors??[]).filter(f=>floorMask(f)),concreteLocation(project)];
 if(floors.some(f=>Math.abs(f.x-position.x)<160&&Math.abs(f.z-position.z)<160))return '完成した床と通路に重なります。少し離してください。';
 return '';
}
export function moveConcreteFloorProblem(project,floorIndex,position){
 const floors=project.completedFloors??[];
 if(!Number.isSafeInteger(floorIndex)||floorIndex<0||floorIndex>=floors.length)return '移設する完成床を選んでください。';
 if(!position||!Number.isSafeInteger(position.x)||!Number.isSafeInteger(position.z)||Math.abs(position.x)>2500||Math.abs(position.z)>1600)return '工事現場の内側を選んでください。';
 const source=floors[floorIndex];
 if(source.x===position.x&&source.z===position.z)return '移設先が現在の場所と同じです。';
 if(project.schemaVersion>=5)return floorPanelsProblem(project,floorIndex,position,floorMask(source));
 if(Math.abs(position.x-concreteLocation(project).x)<160&&Math.abs(position.z-concreteLocation(project).z)<160)return '施工中の工房・通路と重なります。少し離してください。';
 if(floors.some((f,index)=>index!==floorIndex&&Math.abs(f.x-position.x)<160&&Math.abs(f.z-position.z)<160))return 'ほかの完成床と通路に重なります。少し離してください。';
 return '';
}
// All saved works use this geometry for rendering, walking and machine contact.
// Four shallow approach steps replace the workshop's temporary ramp.
export function completedConcreteGeometry(project){
 const allPanels=[...(project.completedFloors??[]).flatMap(f=>floorPanels(f)),...(project.freeBuild?.completed??[]).flatMap(w=>freeWorkCells(w))];
 return [...freeGeometry(project),...(project.completedFloors??[]).flatMap((f,index)=>{
  const part=(suffix,x,z,w,d,height)=>({id:`construction-concrete-${index+1}-${suffix}`,buildingId:'construction-concrete',x,z,rotation:0,halfX:w/2,halfZ:d/2,localHalfX:w/2,localHalfZ:d/2,height,underside:0,size:[w,d]});
  if(!floorMask(f))return [];
  // Preserve the old floor and surface IDs until the user edits its panels.
  const steps=(suffix,x,z,width)=>[.5,1,1.5,2].map((h,i)=>part(`${suffix}${i}`,x,z+10.5-i*3,width,3,h));
  const clearSteps=items=>items.filter(g=>!allPanels.some(p=>boxesOverlap({x:g.x,z:g.z,w:g.size[0],d:g.size[1]},{...p,w:16,d:16})));
  if(f.panelMask===undefined&&!f.paint)return [part('floor',f.x,f.z,32,32,2),...clearSteps(steps('step-',f.x,f.z+16,24))];
  return floorPanels(f).flatMap(p=>[
   {...part(`panel-${p.index}-floor`,p.x,p.z,16,16,2),paint:p.color},
   ...clearSteps(steps(`panel-${p.index}-step-`,p.x,p.z+8,16))
  ]);
 })];
}
export function concreteBuildOverlap(project,p,size){
 if(!Array.isArray(p)||!Array.isArray(size)||![p[0],p[2],size[0],size[2]].every(Number.isFinite)||size[0]<=0||size[2]<=0)return true;
 const free=project.freeBuild?.location;if(free&&Math.abs(p[0]-free.x)<148+size[0]/2&&Math.abs(p[2]-free.z)<148+size[2]/2)return true;
 const loc=concreteLocation(project);
 if(Math.abs(p[0]-loc.x)<110+size[0]/2&&Math.abs(p[2]-loc.z)<110+size[2]/2)return true;
 return completedConcreteGeometry(project).some(g=>Math.abs(p[0]-g.x)<g.halfX+size[0]/2+2&&Math.abs(p[2]-g.z)<g.halfZ+size[2]/2+2);
}
