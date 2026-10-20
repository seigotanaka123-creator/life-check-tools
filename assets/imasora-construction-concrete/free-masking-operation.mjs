import {assertPaintAccess} from './free-contact.mjs?v=120gn';
import {freePlacedFill} from './free-work-parts.mjs';
const validMask=n=>Number.isInteger(n)&&n>=0&&n<=65535;
export function maskingPlan(f,target,fromMask,toMask){
 if(!validMask(fromMask)||!validMask(toMask))throw Error('テープの場所を選び直そう。');
 const {work,cell,face}=target,w=f?.completed?.[work];
 if(!Number.isInteger(work)||work<0||work>=16||!Number.isInteger(cell)||cell<0||cell>=16||!['top','north','south','west','east'].includes(face)||!w||!freePlacedFill(w,cell))throw Error('完成した作品を選ぼう。');
 if(f.aboard)throw Error('車を降りてからテープを貼ろう。');
 const pixels=Array.from({length:16},(_,i)=>i).filter(i=>((fromMask^toMask)&(1<<i))!==0);
 if(pixels.length)assertPaintAccess(f,{...target,pixels});
 return {work,cell,face,fromMask,toMask,pixels,shape:JSON.stringify([w.x,w.z,w.baseY??0,w.mask,w.fill,w.placedMask??w.mask])};
}
export function assertMaskingPlan(f,plan){const next=maskingPlan(f,plan,plan.fromMask,plan.toMask);if(next.shape!==plan.shape||JSON.stringify(next.pixels)!==JSON.stringify(plan.pixels))throw Error('作品が変わったよ。テープの場所を選び直そう。');return next;}
export function maskingProgress(plan,completed){
 if(!Array.isArray(completed)||new Set(completed).size!==completed.length||completed.some(i=>!plan.pixels.includes(i)))throw Error('テープの手順を確認できません。');
 let mask=plan.fromMask;for(const i of completed)mask=(mask&~(1<<i))|(plan.toMask&(1<<i));return mask;
}
// A transient surface aid shares the verified walking/contact renderer with
// painting. This descriptor is never sent to the project or save writer.
export function maskingContactAction(plan,operationId){if(!plan.pixels.length)throw Error('テープはもうその形だよ。');return{type:'FREE_PAINT',operationId,work:plan.work,cell:plan.cell,face:plan.face,pixels:[...plan.pixels],color:'yellow',tool:'roller'};}
