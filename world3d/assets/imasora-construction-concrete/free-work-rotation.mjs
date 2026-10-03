// Clockwise as seen from above (north is -Z): (x,z) -> (-z,x).
// Bake quarter turns into the 4x4 data so every existing render/contact reader
// continues to consume the same cells, heights and face-local paint patches.
export const rotateFreeIndex=i=>(i%4)*4+3-Math.floor(i/4);
const faceNext={north:'east',east:'south',south:'west',west:'north',top:'top'};
export function rotateFreePaint(face,pixels){
 const result=Array(16).fill(null);
 for(let i=0;i<16;i++){const next=face==='top'?rotateFreeIndex(i):face==='east'||face==='west'?Math.floor(i/4)*4+3-i%4:i;result[next]=pixels[i];}
 return result;
}
export function rotateFreeMask(mask){let next=0;for(let i=0;i<16;i++)if(mask&(1<<i))next|=1<<rotateFreeIndex(i);return next;}
export function rotateFreeWork(work,quarterTurns=0){
 if(!Number.isInteger(quarterTurns)||quarterTurns<0||quarterTurns>3)throw Error('回転は90度ずつ指定してください。');
 let w=structuredClone(work);
 for(let n=0;n<quarterTurns;n++){
  const fill=Array(16).fill(0),paint={};for(let i=0;i<16;i++)fill[rotateFreeIndex(i)]=w.fill[i];
  for(const [key,pixels]of Object.entries(w.paint)){const [cell,face]=key.split(':');paint[rotateFreeIndex(Number(cell))+':'+faceNext[face]]=rotateFreePaint(face,pixels);}
  w={...w,mask:rotateFreeMask(w.mask),fill,paint,...(w.placedMask!==undefined?{placedMask:rotateFreeMask(w.placedMask)}:{})};
 }
 return w;
}
