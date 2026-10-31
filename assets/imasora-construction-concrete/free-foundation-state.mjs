import {groundTile,groundLayout,assignGroundLayout} from './ground-grid.mjs?v=120hb';
import {assignDesignLevels} from './design-levels.mjs?v=120hb';
import {highCastingBoards} from './high-casting-state.mjs?v=120hc';
import {freeFrameBoards} from './free-build-state.mjs?v=120pv';
import {freeWorkCells} from './free-work-parts.mjs?v=120hb';
import {floorPanels,boxesOverlap} from './floor-parts.mjs?v=120hb';
export const FOUNDATION_ACTIONS=new Set(['FREE_FOUNDATION_BUILD','FREE_FOUNDATION_REMOVE']);
export function foundationCorners(mask,w=null){const corners=new Map();for(let i=0;i<16;i++)if(mask&(1<<i)){const t=groundTile(i,w);for(const dx of [-t.w/2,t.w/2])for(const dz of [-t.d/2,t.d/2])corners.set((t.x+dx)+','+(t.z+dz),{x:t.x+dx,z:t.z+dz});}return [...corners.values()];}
export function validateFoundationDesign(a){
 if(a.layout)groundLayout(a.mask,a.layout);
 if(!Number.isInteger(a.mask)||a.mask<1||a.mask>65535||!Number.isFinite(a.deckY)||a.deckY<=0||a.deckY>16||!Number.isInteger(a.deckY*4)||!Array.isArray(a.bottoms)||a.bottoms.length!==foundationCorners(a.mask,a).length||a.bottoms.some(y=>!Number.isFinite(y)||a.deckY-y<.25-1e-8||a.deckY-y>12))throw Error('土台の高さ・支柱の配置を確認できません。');return true;
}
export function foundationBoardCount(a){validateFoundationDesign(a);let planks=0;for(let i=0;i<16;i++)if(a.mask&(1<<i))planks+=groundTile(i,a).d/2;return planks+a.bottoms.reduce((n,y)=>n+Math.ceil((a.deckY-y)/2),0);}
export const foundationAvailableBoards=(p,ledger)=>(ledger.quantities?.auxiliaryUnits?.formwork??0)-highCastingBoards(p.freeBuild)-(p.site?.formworkPanelsInUse??0)-(p.schemaVersion>=11&&!['design','complete'].includes(p.freeBuild.stage)?freeFrameBoards(p.freeBuild.mask,p.freeBuild):0);
export function assertFoundationClear(p,s){const occupied=[...(p.completedFloors??[]).flatMap(floorPanels),...p.freeBuild.completed.flatMap(w=>freeWorkCells(w))];for(let i=0;i<16;i++)if(s.mask&(1<<i)){const t=groundTile(i,s),tile={x:s.x+t.x,z:s.z+t.z,w:t.w,d:t.d};if(occupied.some(c=>boxesOverlap(tile,{...c,w:c.w??16,d:c.d??16})))throw Error('土台と完成床・作品が重なっています。配置を確認してください。');}}
export function foundationParts(s){if(!s)return[];const cells=[];for(let i=0;i<16;i++)if(s.mask&(1<<i))cells.push({...groundTile(i,s),index:i});return [...foundationCorners(s.mask,s).map((c,i)=>({id:'post-'+i,x:c.x,y:(s.deckY+s.bottoms[i]-.2)/2,z:c.z,width:.6,height:s.deckY-s.bottoms[i]-.2,depth:.6,bottom:s.bottoms[i]})),...cells.flatMap(c=>Array.from({length:c.d/2},(_,i)=>({id:'plank-'+c.index+'-'+i,x:c.x,y:s.deckY-.1,z:c.z-c.d/2+1+i*2,width:c.w,height:.2,depth:2,bottom:s.deckY-.2})))];}
export function foundationContains(s,x,z,margin=0){if(!s)return false;for(let i=0;i<16;i++)if(s.mask&(1<<i)){const t=groundTile(i,s);if(Math.abs(x-t.x)<t.w/2+margin&&Math.abs(z-t.z)<t.d/2+margin)return true;}return false;}
export function foundationGeometry(p){const s=p?.foundation;if(!s)return{walls:[]};return{walls:Array.from({length:16},(_,i)=>i).filter(i=>s.mask&(1<<i)).map(i=>{const t=groundTile(i,s);return{id:'construction-concrete-foundation-'+i,buildingId:'construction-concrete',x:s.x+t.x,z:s.z+t.z,rotation:0,localHalfX:t.w/2,localHalfZ:t.d/2,minY:Math.min(...s.bottoms),maxY:s.deckY,surfaceEdge:true,stepAdjacent:false};})};}
export function applyFoundation(p,a,ledger){
 if(p.schemaVersion<10)throw Error('FOUNDATION_SCHEMA_REQUIRED');const f=p.freeBuild;if(!f?.location||!((p.schemaVersion>=11?['design','complete']:['design']).includes(f.stage))||f.aboard||f.fill.some(Boolean)||f.connected||f.hose)throw Error('車を降り、型枠を組む前に土台を準備してください。');
 if(a.type==='FREE_FOUNDATION_BUILD'){
  validateFoundationDesign(a);if(p.foundation)throw Error('先に設置済みの土台を片付けてください。');assertFoundationClear(p,{...a,...f.location});const cost=foundationBoardCount(a);if(cost>foundationAvailableBoards(p,ledger))throw Error('土台に使う型枠の板が不足しています。形を小さくするか板を受け取ってください。');
  p.foundation={x:f.location.x,z:f.location.z,mask:a.mask,deckY:a.deckY,bottoms:[...a.bottoms],...(a.layout?{layout:structuredClone(a.layout)}:{})};if(a.layout)assignGroundLayout(f,a.levels,a.layout);else if(Object.hasOwn(a,'levels')){delete f.layout;assignDesignLevels(f,a.levels);}
 }else{if(!p.foundation)throw Error('片付ける土台がありません。');assertFoundationClear(p,p.foundation);p.foundation=null;}
}
