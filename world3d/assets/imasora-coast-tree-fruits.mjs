import './imasora-island-fruits.js?v=120ne';
import {COAST_ISLANDS,islandRelief} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {islandRockRecords} from './imasora-coast-pebble-crabs.mjs?v=120nd';
export const FRUITS=globalThis.ImasoraIslandFruits;
const rnd=n=>{const v=Math.sin(n*127.13+43.91)*43758.5453;return v-Math.floor(v);};
export function islandTreeRecords(i){
 const trees=[];for(let n=0;n<720&&trees.length<(i.hidden?40:130);n++){const x=(rnd(n+i.seed*1000)-.5)*i.rx*1.65,z=(rnd(n*7+i.seed*300)-.5)*i.rz*1.65,y=islandRelief(i,i.x+x,i.z+z),slope=Math.hypot(islandRelief(i,i.x+x+4,i.z+z)-y,islandRelief(i,i.x+x,i.z+z+4)-y)/4;
  if((i.hidden&&Math.abs(x)<210&&z+i.z>i.landingZ-180&&z+i.z<i.landingZ+900)||y<14||slope>.5||Math.hypot(x,z+i.z-i.landingZ)<230||(Math.abs(x)<95&&z+i.z>i.landingZ&&z+i.z<i.landingZ+i.rz*1.35)||trees.some(t=>Math.hypot(t.x-x,t.z-z)<45))continue;
  trees.push({x,y,z,h:76+rnd(n*3.4)*64,index:trees.length,id:'coast-tree-'+i.id+'-'+trees.length,island:i.id,worldX:i.x+x,worldZ:i.z+z});
 }return trees;
}
let treeMap,rocks;const landingCache=new Map();export function coastFruitTrees(){if(!treeMap){treeMap=new Map(COAST_ISLANDS.flatMap(islandTreeRecords).map(t=>[t.id,t]));rocks=COAST_ISLANDS.flatMap(islandRockRecords);}return treeMap;}
export function fruitLanding(t){coastFruitTrees();if(landingCache.has(t.id))return landingCache.get(t.id);const start=FRUITS.hash(t.id)%16;for(let n=0;n<16;n++){const a=(start+n)*Math.PI/8,x=t.worldX+Math.sin(a)*28,z=t.worldZ+Math.cos(a)*28,y=coastWalkingHeight(x,z);if(y<3||Math.abs(y-coastWalkingHeight(t.worldX,t.worldZ))>10)continue;if([...treeMap.values()].some(o=>o.id!==t.id&&Math.hypot(o.worldX-x,o.worldZ-z)<14)||rocks.some(o=>Math.hypot(o.worldX-x,o.worldZ-z)<o.w+8))continue;const p=Object.freeze({x,y,z});landingCache.set(t.id,p);return p;}landingCache.set(t.id,null);return null;}
export function fruitDropPose(tree,landing,seconds){
 const fall=Math.max(0,seconds-.65),height=tree.y+tree.h*.68+4,gravity=220,hit=Math.sqrt(Math.max(0,2*(height-landing.y-4)/gravity));let y=height;
 if(fall<hit)y=height-gravity*fall*fall/2;else{const t=fall-hit,bounce=.38;if(t<bounce)y=landing.y+4+4*Math.sin(t/bounce*Math.PI);else y=landing.y+4;}
 return{x:landing.x,y,z:landing.z,landed:fall>=hit+.38,spin:fall*4};
}
export function fruitState(events){const latest=new Map();for(const e of events??[])if(e.kind==='coast-fruit'){const old=latest.get(e.tree);if(!old||e.cycle>old.cycle)latest.set(e.tree,e);}return latest;}
export function validateFruitReceipts(events,source){const prior=new Map();for(const e of events)if(e.kind==='coast-fruit'){const trees=coastFruitTrees();FRUITS.validateEvent(e,source);if(!trees.has(e.tree)||!fruitLanding(trees.get(e.tree)))throw Error('木の場所をたしかめてね。');const old=prior.get(e.tree);if(old&&(e.cycle<=old.cycle||(old.fruit&&!old.picked)))throw Error('前の木の実の記録を残して止めました。');prior.set(e.tree,e);}return prior;}
export function assertFruitAccess(world,tree,point=tree){const p=world?.position,x=point.worldX??point.x,z=point.worldZ??point.z;if(world?.map!=='coast'||!p||Math.hypot(p.x-x,p.z-z)>64||Math.abs(p.y-coastWalkingHeight(p.x,p.z))>24)throw Error('木の実の近くの地面に立ってね。');}
