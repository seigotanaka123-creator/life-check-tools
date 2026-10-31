import {groundTile,groundHeight} from './ground-grid.mjs?v=120hb';
// Stored concrete keeps its volume and face colours; only placement changes.
// Absence of placedMask preserves pre-119q saves byte-for-byte on read.
export const freeFilledMask=w=>(w?.fill??[]).reduce((mask,q,i)=>q>0?mask|(1<<i):mask,0);
export const freeWorkMask=w=>w?.placedMask??freeFilledMask(w);
export const freePlacedFill=(w,i)=>(freeWorkMask(w)&(1<<i))?(w?.fill[i]??0):0;
export const freeWorkCells=(w,mask=freeWorkMask(w))=>(w?.fill??[]).flatMap((q,i)=>q&&(mask&(1<<i))?(()=>{const t=groundTile(i,w);return[{index:i,x:w.x+t.x,z:w.z+t.z,height:groundHeight(w,i),quarters:q,...(w.layout?{w:t.w,d:t.d}:{}),...(w.baseY?{baseY:w.baseY}:{})}];})():[]);
export const freePartCount=mask=>{let n=0;for(let i=0;i<16;i++)n+=(mask>>i)&1;return n;};
export function freeWorkSummary(w,mask=freeWorkMask(w)){
 const all=freeFilledMask(w),placed=freeWorkCells(w,mask).reduce((n,c)=>n+c.quarters,0),total=(w?.fill??[]).reduce((n,q)=>n+q,0);
 return{placed:freePartCount(mask),stored:freePartCount(all&~mask),placedCups:placed/4,storedCups:(total-placed)/4,totalCups:total/4};
}
