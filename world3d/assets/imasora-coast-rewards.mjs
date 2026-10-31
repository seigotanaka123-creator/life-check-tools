import {validatePebbleFind} from './imasora-coast-pebble-crabs.mjs?v=120nd';
import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {islandTriangleHeight} from './imasora-coast-island-ground.mjs?v=120mu';
import {rigPart} from './imasora-coast-fitting.mjs?v=120js';
export const ISLAND_CRYSTALS=4,OAR_PARTS_COST=6;
export const SAILING_ROUTES=Object.freeze({walk:3,tournament:4,catcher:1,triLink:2,pachicoin:2});
const ok=(v,m)=>{if(!v)throw Error(m);};
const exact=(v,k)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===k;
export function validateSailingAward(a){
 ok(exact(a,'amount|id|route')&&Object.hasOwn(SAILING_ROUTES,a.route)&&a.amount===SAILING_ROUTES[a.route],'航海パーツの受取内容が違うよ。');
 const patterns={walk:/^walk:\d{4}-\d{2}-\d{2}:[1-9]\d{0,8}$/,tournament:/^tournament:[a-z0-9-]{1,32}:[1-9]\d{0,15}$/,catcher:/^arcade:catcher:[A-Za-z0-9_-]{8,180}$/,triLink:/^arcade:triLink:[A-Za-z0-9_-]{8,180}$/,pachicoin:/^arcade:pachicoin:[A-Za-z0-9_-]{8,180}$/};
 ok(typeof a.id==='string'&&patterns[a.route].test(a.id),'航海パーツの受取番号が違うよ。');return a;
}
export function readHomeSailingAwards(raw){
 if(raw==null)return[];const home=JSON.parse(raw),r=home?.constructionRewardLedger;
 if(r?.sailingAwards===undefined)return[];
 ok(!r.blocked&&Array.isArray(r.sailingAwards)&&r.sailingAwards.length<=10000,'冒険の賞品をたしかめてから進もう。');
 const seen=new Set();for(const a of r.sailingAwards){validateSailingAward(a);ok(!seen.has(a.id),'航海パーツの賞品が重なっているよ。');seen.add(a.id);}return r.sailingAwards;
}
export function sailingReceiptId(a){validateSailingAward(a);let h=2166136261,k=5381;for(const c of a.id){h=Math.imul(h^c.charCodeAt(0),16777619);k=Math.imul(k,33)^c.charCodeAt(0);}return 'coast-supply-'+(h>>>0).toString(16).padStart(8,'0')+(k>>>0).toString(16).padStart(8,'0');}
export function islandAtLanding(w,contact){
 const p=w?.position;if(w?.map!=='coast'||!p||![p.x,p.y,p.z].every(Number.isFinite))return null;
 const onLand=q=>COAST_ISLANDS.find(i=>{const h=islandTriangleHeight(i,q.x,q.z);return h>=.5&&Math.abs(q.y-h)<.4;})??null;
 const at=onLand(p);if(at)return at;
 // A rounded belly can touch a slope before its centre is over that face.
 // Use only the current body solver's nearby dry contact, never a berth or
 // the old analytic mountain height. The current world pose is saved intact.
 if(!exact(contact,'floor|x|y|z')||![contact.x,contact.y,contact.z,contact.floor].every(Number.isFinite)||Math.abs(contact.floor-p.y)>.24||Math.hypot(contact.x-p.x,contact.z-p.z)>32||contact.y<p.y-.5||contact.y-p.y>40)return null;
 return onLand(contact);
}
export const emptyCoastRewards=()=>({version:1,islands:[],nauticalParts:0,crystals:0});
export function validateCoastRewards(r){if(r===undefined)return;ok(exact(r,'crystals|islands|nauticalParts|version')&&r.version===1&&Array.isArray(r.islands)&&r.islands.every(id=>COAST_ISLANDS.some(i=>i.id===id))&&new Set(r.islands).size===r.islands.length&&Number.isSafeInteger(r.nauticalParts)&&r.nauticalParts>=0&&r.crystals===r.islands.length*ISLAND_CRYSTALS,'島の賞品を残して止めたよ。');}
// Replay permanent receipts, separately from the ten reversible work steps.
export function replayCoastRewards(events){
 const r=emptyCoastRewards(),sources=new Set();
 for(const e of events){
  if(e.kind==='coast-arrival'){ok(exact(e,'id|island|kind')&&e.id==='coast-arrival-'+e.island&&COAST_ISLANDS.some(i=>i.id===e.island)&&!r.islands.includes(e.island),'島の到着記録が違うよ。');r.islands.push(e.island);r.crystals+=ISLAND_CRYSTALS;}
  if(e.kind==='coast-pebble-find'){validatePebbleFind(e);r.nauticalParts+=e.amount;}
  if(e.kind==='coast-supply'){ok(exact(e,'award|id|kind'),'航海パーツの記録が違うよ。');validateSailingAward(e.award);ok(e.id===sailingReceiptId(e.award)&&!sources.has(e.award.id),'同じ航海パーツは受取済みだよ。');sources.add(e.award.id);r.nauticalParts+=e.award.amount;}
  if(e.kind==='reward-voyage'){ok(e.resource==='starMaterials'&&Number.isSafeInteger(e.amount)&&e.amount>0&&e.amount<=100,'宇宙の航海パーツをたしかめよう。');r.nauticalParts+=e.amount;}
  if(e.kind==='coast-rig'&&e.level===3){r.nauticalParts-=OAR_PARTS_COST;ok(r.nauticalParts>=0,'航海パーツが足りないよ。');}
  if(e.kind==='coast-part'){ok(exact(e,'id|kind|part')&&e.id==='coast-part-'+e.part,'部品の作成記録が違うよ。');r.nauticalParts-=rigPart(e.part).cost;ok(r.nauticalParts>=0,'航海パーツが足りないよ。');}
 }validateCoastRewards(r);return r;
}
export const specialLightUsed=w=>(w?.constructionHighBuild?.lights?.items??[]).filter(i=>i.color==='sea').length;
export function seaCrystalStock(w){return(w?.coastRewards?.crystals??0)-specialLightUsed(w);}
export function assertSeaCrystalBudget(w){validateCoastRewards(w?.coastRewards);ok(seaCrystalStock(w)>=0,'海あかりの結晶が足りないよ。島へ上陸すると4こ手に入るよ。');}
