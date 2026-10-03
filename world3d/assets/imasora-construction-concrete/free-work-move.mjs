import {constructionBase} from './free-supported-build.mjs';
import {freeWorkCells,freeWorkMask,freeFilledMask} from './free-work-parts.mjs';
import {floorPanels,boxesOverlap} from './floor-parts.mjs';
import {vehicleFootprints,overlaps} from './free-vehicle-contact.mjs';
import {FRAME_RACK} from './free-frames.mjs';
import {rotateFreeWork} from './free-work-rotation.mjs';

// Translation changes only the work's anchor. Stored parts keep their offsets,
// concrete volume and face colours; moving never restores a stored part.
export function freeWorkMoveProblem(p,index,position,quarterTurns=0){
 const f=p.freeBuild,w=f?.completed[index];
 if(w&&constructionBase(w))return '土台上の作品は、現在の場所で保管・復元してください。移動と回転はまだ利用できません。';
 if(!Number.isInteger(index)||!w)return '移動する完成作品を選んでください。';
 if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)return '回転は90度ずつ指定してください。';
 if(!Number.isSafeInteger(position?.x)||!Number.isSafeInteger(position?.z)||Math.abs(position.x)>2400||Math.abs(position.z)>1450)return '工事現場の内側を選んでください。';
 if(f.aboard)return '車を降りてから作品を移動してください。';
 if(f.connected||f.hose)return '配管を外し、ホースを空にしてから作品を移動してください。';
 if(!quarterTurns&&w.x===position.x&&w.z===position.z)return '移動先は現在の場所と同じです。';
 const others=[...(p.completedFloors??[]).flatMap(floorPanels),...f.completed.flatMap((v,i)=>i===index?[]:freeWorkCells(v))];
 for(const c of freeWorkCells({...rotateFreeWork(w,quarterTurns),x:position.x,z:position.z})){
  const box={...c,w:16,d:16};
  if(p.location&&boxesOverlap(box,{...p.location,w:296,d:296}))return '工房・通路と重なります。';
  if(f.stage!=='complete'&&boxesOverlap(box,{...f.location,w:296,d:296}))return '施工中の区画と重なります。';
  if(others.some(v=>boxesOverlap(box,{...v,w:16,d:16})))return 'ほかの完成床・作品と重なります。辺を合わせてください。';
 }
 return '';
}

export function freeWorkMoveEnvironmentProblem(p,index,position,{foot,blockedAt=()=>false,supportHeightAt=()=>0}={},quarterTurns=0){
 const problem=freeWorkMoveProblem(p,index,position,quarterTurns);if(problem)return problem;
 const f=p.freeBuild,w=f.completed[index],next={...rotateFreeWork(w,quarterTurns),x:position.x,z:position.z};
 for(const c of [...freeWorkCells(w),...freeWorkCells(next)])if(foot&&Math.abs(c.x-f.location.x-foot.x)<20&&Math.abs(c.z-f.location.z-foot.z)<20)return '足元の作品は移動できません。元の場所・移動先から離れてください。';
 for(const c of freeWorkCells(next)){
  for(const dx of [-4,4])for(const dz of [-4,4])if(blockedAt(c.x+dx,c.z+dz,4))return '建物・土・水などがある場所へは移動できません。';
  for(const dx of [-7.9,0,7.9])for(const dz of [-7.9,0,7.9]){const y=supportHeightAt(c.x+dx,c.z+dz);if(!Number.isFinite(y)||Math.abs(y)>.12)return '平らな地面へ配置してください。';}
  const tile={x:c.x-f.location.x,z:c.z-f.location.z,hx:8,hz:8,heading:0};
  for(const name of ['truck','pump'])if(vehicleFootprints(f[name],name).some(body=>overlaps(body,tile)))return '車両を移動してから配置してください。';
  if(boxesOverlap({...tile,w:16,d:16},{...FRAME_RACK,w:22,d:12}))return '型枠の置き場と重なります。';
 }
 return '';
}

export function freeWorkMoveTargets(p,index){
 return [...(p.completedFloors??[]).flatMap((w,i)=>floorPanels(w).length?[{id:'floor:'+i,label:'床 '+(i+1),cells:floorPanels(w)}]:[]),...(p.freeBuild?.completed??[]).flatMap((w,i)=>i!==index&&freeWorkMask(w)?[{id:'work:'+i,label:'作品 '+(i+1),cells:freeWorkCells(w)}]:[])];
}
// Align actual occupied cell edges, not bounding boxes (which leave gaps for
// concave shapes). Candidate count is bounded to 16 x 16; full validation wins.
export function freeWorkSnapCandidates(w,target,side,from=w){
 const direction={west:[-16,0],east:[16,0],north:[0,-16],south:[0,16]}[side];
 if(!direction||!target?.cells?.length||!freeWorkMask(w))return [];
 const found=new Map();
 for(const a of freeWorkCells(w))for(const b of target.cells){const x=w.x+b.x+direction[0]-a.x,z=w.z+b.z+direction[1]-a.z;found.set(x+':'+z,{x,z});}
 return [...found.values()].sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z)||a.x-b.x||a.z-b.z);
}

// Numeric-only plan data shared by the editor and tests; hidden parts are shown
// separately and never silently included in placement collision or quantity.
export function freeWorkMovePlan(p,index,position,quarterTurns=0){
 const w=p.freeBuild?.completed[index];if(!w)return [];
 const next={...rotateFreeWork(w,quarterTurns),x:position.x,z:position.z};
 return [...freeWorkCells(w).map(c=>({...c,kind:'source'})),...freeWorkMoveTargets(p,index).flatMap(t=>t.cells.filter(c=>Math.abs(c.x-position.x)<112&&Math.abs(c.z-position.z)<112).map(c=>({...c,kind:'other'}))),...freeWorkCells(next,freeFilledMask(next)).map(c=>({...c,kind:freeWorkMask(next)&(1<<c.index)?'target':'stored',paint:next.paint[c.index+':top']}))];
}
