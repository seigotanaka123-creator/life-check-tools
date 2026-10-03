// Temporary formwork boards are reserved, never converted into concrete or soil.
import {freeFrameBoards} from './free-build-state.mjs';
import {freeWorkCells} from './free-work-parts.mjs';
import {floorPanels,boxesOverlap} from './floor-parts.mjs';
export const FOUNDATION_ACTIONS=new Set(['FREE_FOUNDATION_BUILD','FREE_FOUNDATION_REMOVE']);
export function foundationCorners(mask){const corners=new Map();for(let i=0;i<16;i++)if(mask&(1<<i)){const x=(i%4-1.5)*16,z=(Math.floor(i/4)-1.5)*16;for(const dx of [-8,8])for(const dz of [-8,8])corners.set((x+dx)+','+(z+dz),{x:x+dx,z:z+dz});}return [...corners.values()];}
export function validateFoundationDesign(a){
 if(!Number.isInteger(a.mask)||a.mask<1||a.mask>65535||!Number.isFinite(a.deckY)||a.deckY<=0||a.deckY>16||!Number.isInteger(a.deckY*4)||!Array.isArray(a.bottoms)||a.bottoms.length!==foundationCorners(a.mask).length||a.bottoms.some(y=>!Number.isFinite(y)||a.deckY-y<.25-1e-8||a.deckY-y>12))throw Error('土台の高さ・支柱の配置を確認できません。');
 return true;
}
export function foundationBoardCount(a){validateFoundationDesign(a);let tiles=0;for(let i=0;i<16;i++)if(a.mask&(1<<i))tiles++;return tiles*8+a.bottoms.reduce((n,y)=>n+Math.ceil((a.deckY-y)/2),0);}
export const foundationAvailableBoards=(p,ledger)=>(ledger.quantities?.auxiliaryUnits?.formwork??0)-(p.site?.formworkPanelsInUse??0)-(p.schemaVersion>=11&&!['design','complete'].includes(p.freeBuild.stage)?freeFrameBoards(p.freeBuild.mask):0);
export function assertFoundationClear(p,s){const occupied=[...(p.completedFloors??[]).flatMap(floorPanels),...p.freeBuild.completed.flatMap(w=>freeWorkCells(w))];for(let i=0;i<16;i++)if(s.mask&(1<<i)){const tile={x:s.x+(i%4-1.5)*16,z:s.z+(Math.floor(i/4)-1.5)*16,w:16,d:16};if(occupied.some(c=>boxesOverlap(tile,{...c,w:16,d:16})))throw Error('土台と完成床・作品が重なっています。配置を確認してください。');}}
export function foundationParts(s){if(!s)return[];const cells=[];for(let i=0;i<16;i++)if(s.mask&(1<<i))cells.push({x:(i%4-1.5)*16,z:(Math.floor(i/4)-1.5)*16,index:i});return [...foundationCorners(s.mask).map((c,i)=>({id:'post-'+i,x:c.x,y:(s.deckY+s.bottoms[i]-.2)/2,z:c.z,width:.6,height:s.deckY-s.bottoms[i]-.2,depth:.6,bottom:s.bottoms[i]})),...cells.flatMap(c=>Array.from({length:8},(_,i)=>({id:'plank-'+c.index+'-'+i,x:c.x,y:s.deckY-.1,z:c.z-7+i*2,width:16,height:.2,depth:2,bottom:s.deckY-.2})))];}
export function foundationContains(s,x,z,margin=0){if(!s)return false;for(let i=0;i<16;i++)if(s.mask&(1<<i)){const cx=(i%4-1.5)*16,cz=(Math.floor(i/4)-1.5)*16;if(Math.abs(x-cx)<8+margin&&Math.abs(z-cz)<8+margin)return true;}return false;}
export function foundationGeometry(p){const s=p?.foundation;if(!s)return{walls:[]};return{walls:Array.from({length:16},(_,i)=>i).filter(i=>s.mask&(1<<i)).map(i=>({id:'construction-concrete-foundation-'+i,buildingId:'construction-concrete',x:s.x+(i%4-1.5)*16,z:s.z+(Math.floor(i/4)-1.5)*16,rotation:0,localHalfX:8,localHalfZ:8,minY:Math.min(...s.bottoms),maxY:s.deckY,surfaceEdge:true,stepAdjacent:false}))};}
export function applyFoundation(p,a,ledger){
 if(p.schemaVersion<10)throw Error('FOUNDATION_SCHEMA_REQUIRED');const f=p.freeBuild;if(!f?.location||!((p.schemaVersion>=11?['design','complete']:['design']).includes(f.stage))||f.aboard||f.fill.some(Boolean)||f.connected||f.hose)throw Error('車を降り、型枠を組む前に土台を準備してください。');
 if(a.type==='FREE_FOUNDATION_BUILD'){
  validateFoundationDesign(a);if(p.foundation)throw Error('先に設置済みの土台を片付けてください。');assertFoundationClear(p,{...a,...f.location});const cost=foundationBoardCount(a);if(cost>foundationAvailableBoards(p,ledger))throw Error('土台に使う型枠の板が不足しています。形を小さくするか板を受け取ってください。');
  p.foundation={x:f.location.x,z:f.location.z,mask:a.mask,deckY:a.deckY,bottoms:[...a.bottoms]};
 }else{if(!p.foundation)throw Error('片付ける土台がありません。');assertFoundationClear(p,p.foundation);p.foundation=null;}
}
