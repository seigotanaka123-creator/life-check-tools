// Reusable 4 x 4 templates. They produce the existing verified brush operation,
// so finite paint charges, contact checks, undo and old save formats still apply.
export const STENCIL_TEMPLATES=Object.freeze([
 {id:'arrow',label:'矢印',pixels:[1,4,5,6,9,13]},
 {id:'line',label:'ライン',pixels:[4,5,6,7,8,9,10,11]},
 {id:'checker',label:'市松模様',pixels:[0,2,5,7,8,10,13,15]},
 {id:'diagonal',label:'斜めしま',pixels:Array.from({length:16},(_,i)=>i).filter(i=>(i%4+Math.floor(i/4))%4<2)},
 {id:'border',label:'ふちどり',pixels:Array.from({length:16},(_,i)=>i).filter(i=>i%4===0||i%4===3||i<4||i>=12)}
].map(t=>Object.freeze({...t,pixels:Object.freeze(t.pixels)})));
export function stencilPixels(id,turns=0){
 const pattern=STENCIL_TEMPLATES.find(t=>t.id===id);if(!pattern||!Number.isInteger(turns)||turns<0||turns>3)throw Error('型紙の模様と向きを選んでください。');
 return pattern.pixels.map(i=>{let x=i%4,y=Math.floor(i/4);for(let t=0;t<turns;t++)[x,y]=[3-y,x];return y*4+x;}).sort((a,b)=>a-b);
}
export function stencilGuide(id,turns=0){const pixels=stencilPixels(id,turns),pattern=STENCIL_TEMPLATES.find(t=>t.id===id);return`${pattern.label}・${turns*90}°。色のついた${pixels.length}マスだけを刷毛で塗ります。空いている部分の色はそのままです。`;}
