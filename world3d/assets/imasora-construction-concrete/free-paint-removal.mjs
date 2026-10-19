// Explicit surface work: remove only the chosen paint, never the concrete or
// its original material. Used paint is not refunded by normal removal.
export const PAINT_REMOVE_COLOR='bare';
export const paintResultColor=color=>color===PAINT_REMOVE_COLOR?null:color;
export function paintRemovalPixels(work,cell,face,pixels,mask=0){
 if(!Array.isArray(pixels)||pixels.length>16||new Set(pixels).size!==pixels.length||pixels.some(i=>!Number.isSafeInteger(i)||i<0||i>15)||!Number.isSafeInteger(mask)||mask<0||mask>65535)throw Error('色を落とす場所を選び直してね。');
 const values=work?.paint?.[`${cell}:${face}`]??[];
 return pixels.filter(i=>values[i]!=null&&!(mask&(1<<i))).sort((a,b)=>a-b);
}
