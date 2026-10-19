// A reusable painting aid. Only the resulting paint enters the project ledger;
// a face selection never charges stock, creates an operation or edits a save.
const index=n=>Number.isInteger(n)&&n>=0&&n<16;
const faces=new Set(['top','north','south','west','east']);
export function unmaskedPaintPixels(pixels,mask=0){
 if(!Number.isInteger(mask)||mask<0||mask>65535||!Array.isArray(pixels)||pixels.length>16||pixels.some(i=>!index(i))||new Set(pixels).size!==pixels.length)throw Error('塗る場所を選び直してください。');
 return pixels.filter(i=>!(mask&(1<<i))).sort((a,b)=>a-b);
}
export function createPaintMaskSelection(){
 const entries=new Map();
 function entry(f,target){
  const {work,cell,face}=target,w=f?.completed?.[work],key=`${work}:${cell}:${face}`;
  if(!index(work)||!index(cell)||!faces.has(face)||!w||!(w.mask&(1<<cell))||!w.fill[cell]||w.placedMask!==undefined&&!(w.placedMask&(1<<cell))){entries.delete(key);return null;}
  const shape=JSON.stringify([w.x,w.z,w.baseY??0,w.mask,w.fill,w.placedMask??w.mask]);
  if(entries.get(key)?.shape!==shape)entries.set(key,{shape,mask:0,applied:0,target:{work,cell,face}});
  return entries.get(key);
 }
 return {
  get(f,target){return entry(f,target)?.mask??0;},
  applied(f,target){return entry(f,target)?.applied??0;},
  accept(f,target,mask){if(!Number.isInteger(mask)||mask<0||mask>65535)throw Error('テープの場所を選び直そう。');const e=entry(f,target);if(!e)throw Error('完成した作品を選ぼう。');e.mask=e.applied=mask;},
  appliedSelections(f){const result=[];for(const e of [...entries.values()]){const current=entry(f,e.target);if(current?.applied)result.push({...e.target,mask:current.applied});}return result;},
  toggle(f,target,pixel){if(!index(pixel))throw Error('塗らないマスを選んでください。');const e=entry(f,target);if(!e)throw Error('完成した作品の面を選んでください。');e.mask^=1<<pixel;return e.mask;},
  clear(f,target){const e=entry(f,target);if(e)e.mask=0;},
  reset(){entries.clear();},
  pixels(f,target,pixels){return unmaskedPaintPixels(pixels,this.get(f,target));},
  appliedPixels(f,target,pixels){return unmaskedPaintPixels(pixels,this.applied(f,target));}
 };
}
