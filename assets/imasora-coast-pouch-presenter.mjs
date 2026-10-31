import {COAST_RECIPES} from './imasora-coast-forage.mjs?v=120ps';
import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {coastVisitGift} from './imasora-coast-visit-rewards.mjs?v=120mx';
import {seaCrystalStock} from './imasora-coast-rewards.mjs?v=120nd';

// Describe the last committed landing, not a lifetime total or a new grant.
export function latestCoastIslandGift(ledger){
 const e=ledger?.events?.findLast(e=>e.kind==='coast-visit');if(!e)return null;
 const island=COAST_ISLANDS.find(i=>i.id===e.island);if(!island)return null;
 const g=coastVisitGift(e.island,e.count),icon={'focus-ramune':'🎯','guard-tape':'🛡️','wind-pin':'🍃'}[g.battle.id];
 return {id:e.id,title:island.name+' · 上陸'+e.count+'回目',count:e.count,tier:g.tier,nextTier:Math.min(e.count+1,10),
  home:[[icon,g.battle.name,g.tier+'こ'],['🌱','成長のタネ',g.tier+'こ']],
  construction:[['🪵','木材',g.tier+'枚'],['⛰️','土',g.tier*8+'ブロック'],['💧','水',g.tier*32+'L']]};
}

// Always open the same simple inventory, not a different work page depending
// on the last material picked up. Counts and short uses are read-only.
export const coastPouchStart=()=> 'bag';
export function coastPouchItems(bag={},world={},workshopEnabled=false){
 const specs=[
 ['kit','📦','建築セット','箱',workshopEnabled?'開けると工事の材料になる。':'工事用の材料セット。今はポーチで保管。'],
 ['shell','🐚','貝がら','こ','花びら・海藻と合わせて、かざりの材料に。'],
 ['glass','💎','シーグラス','こ','花の染料と合わせて、ペンキの材料に。'],
 ['weed','🌿','海藻','こ','花びら・貝がらと合わせて、かざりの材料に。'],
 ['petal','🌸','花びらの束','束','染料や花のかざりの材料。'],
 ['dye','🧴','花の染料','こ','シーグラスと合わせて、ペンキの材料に。'],
 ['nautical','🛶','航海パーツ','こ','いかだ工房で、いかだのパーツをつくる。'],
 ['crystal','💎','海あかりの結晶','こ','工事現場で灯りを作るときに使う。']];
 return specs.map(([id,icon,name,unit,use])=>({id,icon,name,unit,use,amount:id==='nautical'?(world.coastRewards?.nauticalParts??0):id==='crystal'?world.crystalStock??0:bag[id]??0})).filter(i=>i.amount>0);
}
const extras={formwork:['🪵','型枠','枚'],rebar:['🏗️','鉄筋','本'],tiles:['🟦','タイル','枚'],decoration:['🌼','かざり','こ']};
// Read the receipt that actually committed. This never allocates materials or
// describes a lifetime total as the amount just received.
export function coastPouchReceipt(action,eventId,projection){
 if(action.type==='craft'&&action.recipe==='dye')return {title:'花の染料ができたよ！',where:'素材ポーチに入れたよ。シーグラスと合わせると、好きな色のペンキにできるよ。',items:[['🧴','花の染料','2こ']]};
 const p=projection?.transfers?.find(p=>p.source?.eventId===eventId);
 if(!p)return null;
 const q=p.quantities,items=[];
 if(q.concreteBlockCredits)items.push(['🪣','生コンの材料',q.concreteBlockCredits+'杯分']);
 if(q.paintSurfaceCredits)items.push(['🎨','ペンキ',q.paintSurfaceCredits+'面分']);
 for(const[k,[icon,name,unit]]of Object.entries(extras))if(q.auxiliaryUnits[k])items.push([icon,name,q.auxiliaryUnits[k]+unit]);
 if(action.type==='open')for(const[id,icon,name,unit,scale]of[['mars-timber','🪵','木材','枚',26880],['mars-soil','⛰️','土','ブロック',1000],['mars-water','💧','水','L',1000]]){
  const n=(projection.receipts??[]).filter(r=>r.id===eventId+'-'+id).reduce((n,r)=>n+r.amount,0);if(n)items.push([icon,name,(n/scale)+unit]);
 }
 return {title:action.type==='open'?'建材がそろったよ！':COAST_RECIPES[action.recipe].name+'ができたよ！',where:'工事現場の保管庫に入ったよ。もう一度受け取る必要はないよ。',items};
}

export function coastPouchDestination(map,p){if(map==='coast')return (p?.hasSupplies??!!p?.transfers?.length)?'construction':null;if(map==='construction')return p?.bag&&(p.bag.kit||p.bag.petal||p.bag.dye)?'coast':null;return null;}

export function readCoastPouch(service){const p=service.coastForage;return p?{...p,hasSupplies:seaCrystalStock(service.ledger?.world)>0||Object.keys(service.ledger?.world.coastVisits?.islands??{}).length>0||(service.ledger?.world.constructionPackTrialLedger?.transfers??[]).some(p=>p.version===2||p.version===3)}:null;}
export function committedCoastPouchReceipt(service,action,eventId){return coastPouchReceipt(action,eventId,{transfers:service.constructionPackTrialStock?.transfers??[],receipts:action.type==='open'?service.constructionStock?.receipts??[]:[]});}
