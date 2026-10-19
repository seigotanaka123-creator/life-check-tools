// A bounded, reusable drawing draft. Only an existing FREE_PAINT operation
// may spend paint or change the saved work; sampling never edits that work.
const pixel=i=>Number.isInteger(i)&&i>=0&&i<16;
const validMask=mask=>Number.isInteger(mask)&&mask>=0&&mask<=65535;
export function paintLinePixels(from,to,width=1,mask=0){
 if(!pixel(from)||!pixel(to)||![1,3].includes(width)||!validMask(mask))throw Error('線を描く場所を選び直してね。');
 let x=from%4,y=Math.floor(from/4);const tx=to%4,ty=Math.floor(to/4),dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1,r=(width-1)/2,points=new Set();let error=dx+dy;
 for(;;){for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){const cx=x+ox,cy=y+oy,i=cy*4+cx;if(cx>=0&&cx<4&&cy>=0&&cy<4&&!(mask&(1<<i)))points.add(i);}if(x===tx&&y===ty)break;const twice=2*error;if(twice>=dy){error+=dy;x+=sx;}if(twice<=dx){error+=dx;y+=sy;}}
 return [...points].sort((a,b)=>a-b);
}
export function createPaintDrawing(){
 let key='',pixels=new Set(),last=null,before=null;
 return {
  target(next){if(next!==key){key=next;pixels.clear();last=null;before=null;}},
  clear(){pixels.clear();last=null;before=null;},
  begin(){before=new Set(pixels);last=null;},
  sample(i,width=1,mask=0){if(i===null){last=null;return;}for(const p of paintLinePixels(last??i,i,width,mask))pixels.add(p);last=i;},
  finish(cancel=false){if(cancel&&before)pixels=before;before=null;last=null;},
  get pixels(){return [...pixels].sort((a,b)=>a-b);}
 };
}
