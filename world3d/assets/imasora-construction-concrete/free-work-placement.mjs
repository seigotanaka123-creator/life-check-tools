import {constructionBase,supportedWorkMatches} from './free-supported-build.mjs';
import {freeFilledMask,freeWorkMask,freeWorkCells} from './free-work-parts.mjs';
import {floorPanels,boxesOverlap} from './floor-parts.mjs';
export function freeWorkPartsProblem(p,index,mask){
 const f=p.freeBuild,w=f?.completed[index];
 if(!Number.isInteger(index)||!w)return '保管・復元する完成作品を選んでください。';
 if(!Number.isInteger(mask)||mask<0||mask>65535||(mask&freeFilledMask(w))!==mask)return 'コンクリートのあるマスを選んでください。';
 if(f.aboard)return '車を降りてから作品を編集してください。';
 if(f.connected||f.hose)return '配管を外し、ホースを空にしてから作品を編集してください。';
 if(mask===freeWorkMask(w))return '配置は変わっていません。';
 // Only restored parts need free space. Storing must remain possible when a
 // later obstacle is nearby, and unchanged parts must not block their own edit.
 const added=freeWorkCells(w,mask&~freeWorkMask(w));
 if(added.length&&constructionBase(w)&&!supportedWorkMatches(p,w,mask&~freeWorkMask(w)))return '元と同じ位置・高さの土台を設置してから復元してください。';
 const others=[...(p.completedFloors??[]).flatMap(floorPanels),...f.completed.flatMap((v,i)=>i===index?[]:freeWorkCells(v))];
 for(const c of added){
  const box={...c,w:16,d:16};
  if(p.location&&boxesOverlap(box,{...p.location,w:296,d:296}))return '工房・通路と重なる部分は復元できません。';
  const safeRestored=p.schemaVersion>=13&&f.stage==='design'&&!f.fill.some(Boolean)&&constructionBase(w)>0&&supportedWorkMatches(p,w,mask);
  const sameFinished=safeRestored||f.stage==='complete'&&(p.schemaVersion>=8||(w.x===f.location.x&&w.z===f.location.z));
  if(!sameFinished&&boxesOverlap(box,{...f.location,w:296,d:296}))return '施工中の区画と重なる部分は復元できません。';
  if(others.some(v=>boxesOverlap(box,{...v,w:16,d:16})))return 'ほかの完成床・作品と重なる部分は復元できません。';
 }
 return '';
}
