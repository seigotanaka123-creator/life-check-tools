// Stored concrete keeps its volume and face colours; only placement changes.
// Absence of placedMask preserves pre-119q saves byte-for-byte on read.
export const freeFilledMask=w=>(w?.fill??[]).reduce((mask,q,i)=>q>0?mask|(1<<i):mask,0);
export const freeWorkMask=w=>w?.placedMask??freeFilledMask(w);
export const freePlacedFill=(w,i)=>(freeWorkMask(w)&(1<<i))?(w?.fill[i]??0):0;
export const freeWorkCells=(w,mask=freeWorkMask(w))=>(w?.fill??[]).flatMap((q,i)=>q&&(mask&(1<<i))?[{index:i,x:w.x+(i%4-1.5)*16,z:w.z+(Math.floor(i/4)-1.5)*16,height:q/2,quarters:q,...(w.baseY?{baseY:w.baseY}:{})}]:[]);
export const freePartCount=mask=>{let n=0;for(let i=0;i<16;i++)n+=(mask>>i)&1;return n;};
export function freeWorkSummary(w,mask=freeWorkMask(w)){
 const all=freeFilledMask(w),placed=freeWorkCells(w,mask).reduce((n,c)=>n+c.quarters,0),total=(w?.fill??[]).reduce((n,q)=>n+q,0);
 return{placed:freePartCount(mask),stored:freePartCount(all&~mask),placedCups:placed/4,storedCups:(total-placed)/4,totalCups:total/4};
}
