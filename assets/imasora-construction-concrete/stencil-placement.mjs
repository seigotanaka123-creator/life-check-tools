import {stencilPixels,STENCIL_TEMPLATES} from './free-stencil.mjs?v=120e';

// Placement remains a pending tool choice. Only the resulting verified brush
// pixels are saved, so old projects keep their format and paint accounting.
export function placedStencilPixels(id,turn=0,offset={x:0,y:0}){
 if(!offset||Object.keys(offset).some(k=>!['x','y'].includes(k))||!Number.isSafeInteger(offset.x)||!Number.isSafeInteger(offset.y)||Math.abs(offset.x)>3||Math.abs(offset.y)>3)throw Error('型紙の位置を選び直してね。');
 return stencilPixels(id,turn).map(i=>({x:i%4+offset.x,y:Math.floor(i/4)+offset.y})).filter(p=>p.x>=0&&p.x<4&&p.y>=0&&p.y<4).map(p=>p.y*4+p.x).sort((a,b)=>a-b);
}
export function stencilPlacementLabel({x,y}){
 return [x?(x<0?'左':'右')+Math.abs(x):'',y?(y<0?'上':'下')+Math.abs(y):''].filter(Boolean).join('・')||'中央';
}
export function placedStencilGuide(id,turn,offset){
 const label=STENCIL_TEMPLATES.find(t=>t.id===id)?.label,pixels=placedStencilPixels(id,turn,offset);
 return label+'・'+turn*90+'°・'+stencilPlacementLabel(offset)+'。色のついた'+pixels.length+'マスを塗るよ。枠からはみ出た部分は塗らないよ。';
}
export function createStencilPlacement(){
 let offset={x:0,y:0},target=null,pattern='arrow',turn=0;
 function select(id,rotation,key){
  stencilPixels(id,rotation);
  if(key!==target||id!==pattern)offset={x:0,y:0};
  target=key;pattern=id;turn=rotation;
  if(!placedStencilPixels(pattern,turn,offset).length)offset={x:0,y:0};
  return {...offset};
 }
 function canSet(candidate){try{return placedStencilPixels(pattern,turn,candidate).length>0;}catch{return false;}}
 function set(candidate){if(!canSet(candidate))return false;offset={...candidate};return true;}
 return {select,set,canSet,reset(){offset={x:0,y:0};},get offset(){return {...offset};},get pixels(){return placedStencilPixels(pattern,turn,offset);}};
}

