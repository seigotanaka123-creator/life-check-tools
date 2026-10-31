import {coastFindPose} from './imasora-coast-tidal-finds.mjs?v=120mx';
import './imasora-construction-pack-transfer.js?v=120ho';
import {COAST_SALVAGE} from './imasora-coast-salvage.mjs?v=120ny';
import {assertCoastRecoveryReceipt,COAST_RECOVERY_KITS} from './imasora-coast-recovery-receipt.mjs?v=120nz';
import{validateHarvestReceipt}from'./imasora-construction-garden.mjs?v=120ps';
import {coastHeight} from './imasora-coast-layout.mjs?v=120mx';
import {applyCoastVisitMaterials} from './imasora-coast-visit-rewards.mjs?v=120mx';

export const COAST_RECIPES=Object.freeze({dye:{name:'花の染料',icon:'🌸',needs:{petal:1},makes:{dye:2},result:'花の染料 2こ'},paint:{name:'花のペンキ',icon:'🎨',needs:{dye:1,glass:1},makes:{},result:'ペンキ 32面分'},decoration:{name:'海と花のかざり',icon:'💐',needs:{petal:1,shell:1,weed:1},makes:{},result:'かざり 4こ'}});
export const COAST_REFILL_MS=10*60*1000;
export const COAST_WORKSHOP=Object.freeze({x:590,z:114,radius:28});
export const COAST_KIT_RAW=Object.freeze({'mars-timber':26880,'mars-soil':8000,'mars-water':32000});
export const COAST_FINDS=Object.freeze([
 {id:'supply-west',kind:'kit',x:-192,z:225}, {id:'supply-center',kind:'kit',x:40,z:260}, {id:'supply-east',kind:'kit',x:440,z:220},
 {id:'shell-west',kind:'shell',x:-520,z:200}, {id:'shell-cove',kind:'shell',x:-580,z:230},
 {id:'glass-shore',kind:'glass',x:-110,z:300}, {id:'glass-pier',kind:'glass',x:220,z:300},
 {id:'weed-garden',kind:'weed',x:520,z:235}, {id:'weed-east',kind:'weed',x:680,z:200},
 {id:'litter-west',kind:'litter',x:-260,z:230}, {id:'litter-shore',kind:'litter',x:-170,z:275},
 {id:'litter-center',kind:'litter',x:104,z:265}, {id:'litter-pier',kind:'litter',x:290,z:240},
 {id:'litter-garden',kind:'litter',x:510,z:185}, {id:'litter-east',kind:'litter',x:650,z:200}
].map(Object.freeze));
export const COAST_FIND_NAMES=Object.freeze({kit:'波の建築セット',shell:'貝がら',glass:'シーグラス',weed:'海藻',litter:'浜の落とし物'});
const keys=(o,list)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...list].sort().join('|');
const ok=(v,m)=>{if(!v)throw Error(m);},int=n=>Number.isSafeInteger(n)&&n>=0;
export const coastFindAvailable=(state,find,at=Date.now())=>!Object.hasOwn(state.picked,find.id)||at-state.picked[find.id]>=COAST_REFILL_MS;
export const emptyCoastForage=()=>({lastAt:0,picked:{},bag:{kit:0,shell:0,glass:0,weed:0,petal:0,dye:0},harvests:{},cycles:{},recoveries:{},cleaned:0,totalCleaned:0,materials:{'mars-timber':0,'mars-soil':0,'mars-water':0},transfers:[],receipts:[]});
export function validateCoastAction(a){
 const fields={recover:['type','site','cargo','at'],pick:['type','slot','at'],open:['type','at','auxiliaryKind'],craft:['type','at','recipe'],harvest:['type','at','receipt'],'undo-harvest':['type','at','receiptId']};
 ok(Object.hasOwn(fields,a?.type)&&keys(a,fields[a.type])&&int(a.at)&&a.at>0&&a.at<=8640000000000000,'素材の記録をたしかめよう。');
 if(a.type==='recover')ok(a.site===COAST_SALVAGE.id&&typeof a.cargo==='string'&&/^sea-\d{1,12}$/.test(a.cargo)&&a.cargo!=='sea-1','持ち帰った箱をたしかめよう。');
 if(a.type==='pick')ok(COAST_FINDS.some(f=>f.id===a.slot),'その落とし物は見つからないよ。');
 if(a.type==='open')ok(['formwork','rebar','tiles','decoration'].includes(a.auxiliaryKind),'セットに入れる道具をえらぼう。');
 if(a.type==='craft')ok(Object.hasOwn(COAST_RECIPES,a.recipe),'つくるものをえらぼう。');
 if(a.type==='harvest'){validateHarvestReceipt(a.receipt);ok(a.at===a.receipt.at,'花びらの時刻をたしかめよう。');}
 if(a.type==='undo-harvest')ok(typeof a.receiptId==='string'&&/^garden-petal-[A-Za-z0-9_-]{1,80}$/.test(a.receiptId),'もどす花びらをたしかめよう。');
 return a;
}
// Replay only explicit finds and conversions. Ordinary scene snapshots cannot grant supplies.
export function applyCoastEvent(state,event,profileId){
 ok(keys(event,['kind','id','action'])&&event.kind==='coast'&&typeof event.id==='string'&&/^[A-Za-z0-9_-]{8,96}$/.test(event.id),'海辺の受取番号をたしかめよう。');
 const a=validateCoastAction(event.action);ok(a.at>=state.lastAt,'海辺の時計をたしかめよう。');
 if(a.type==='recover'){
  ok(!Object.hasOwn(state.recoveries,a.site),'この箱の建材は、もうポーチに入っているよ。');
  state.recoveries[a.site]={eventId:event.id,cargo:a.cargo};state.bag.kit+=COAST_RECOVERY_KITS;
 }else if(a.type==='pick'){
  const f=COAST_FINDS.find(f=>f.id===a.slot);ok(coastFindAvailable(state,f,a.at),'波が次の落とし物を運んでくるまで、ほかを探そう。');
  state.picked[f.id]=a.at;
  if(f.kind==='litter'){state.cleaned++;state.totalCleaned++;if(state.cleaned===3){state.cleaned=0;state.bag.kit++;}}
  else state.bag[f.kind]+=f.kind==='kit'?1:2;
 }else if(a.type==='harvest'){
  const r=a.receipt,key=r.bedId+':'+r.cycle;ok(event.id===r.id&&!Object.hasOwn(state.harvests,r.id)&&!Object.hasOwn(state.cycles,key),'この花びらはもう集めたよ。水をあげて次の花を育てよう。');state.harvests[r.id]={...r,undone:false};state.cycles[key]=r.id;state.bag.petal+=r.amount;
 }else if(a.type==='undo-harvest'){
  const r=state.harvests[a.receiptId];ok(r&&!r.undone,'この収穫はもうもどしたよ。');ok(state.bag.petal>=r.amount,'花びらを加工に使ったので、この収穫はもどせないよ。');state.bag.petal-=r.amount;r.undone=true;delete state.cycles[r.bedId+':'+r.cycle];
 }else if(a.type==='craft'){
  const recipe=COAST_RECIPES[a.recipe];for(const[k,n]of Object.entries(recipe.needs))ok(state.bag[k]>=n,'加工する素材が足りないよ。ポーチで必要な数を見よう。');
  for(const[k,n]of Object.entries(recipe.needs))state.bag[k]-=n;for(const[k,n]of Object.entries(recipe.makes))state.bag[k]+=n;
  if(a.recipe!=='dye')state.transfers.push(globalThis.ImasoraConstructionPackTransfer.createFlowerTransferPacket({targetProfileId:profileId,eventId:event.id,recipe:a.recipe}));
 }else{
  ok(state.bag.kit>0,'先に浜で建築セットを見つけよう。');state.bag.kit--;
  const packet=globalThis.ImasoraConstructionPackTransfer.createCoastTransferPacket({targetProfileId:profileId,eventId:event.id,auxiliaryKind:a.auxiliaryKind});
  state.transfers.push(packet);
  for(const [offerId,amount] of Object.entries(COAST_KIT_RAW)){
   state.materials[offerId]+=amount;
   state.receipts.push({kind:'coast-supply',id:event.id+'-'+offerId,offerId,amount});
  }
 }
 state.lastAt=a.at;
 ok(Object.values(state.bag).every(int)&&Object.values(state.materials).every(int),'素材がいっぱいだよ。いまの記録を残して止めたよ。');
 return state;
}
export function projectCoastForage(events,profileId){
 const state=emptyCoastForage(),ids=new Set();
 for(const e of events??[])if(e.kind==='coast'||e.kind==='coast-visit'){ok(!ids.has(e.id),'同じ落とし物の受取番号が重なっているよ。');ids.add(e.id);if(e.kind==='coast')applyCoastEvent(state,e,profileId);else applyCoastVisitMaterials(state,e);}
 return state;
}
export function assertCoastAccess(draft,a){
 validateCoastAction(a);ok(['recover','pick','open','craft'].includes(a.type),'花壇のそばで花びらを集めよう。');const p=draft.position,x=Array.isArray(p)?p[0]:p?.x,y=Array.isArray(p)?p[1]:p?.y,z=Array.isArray(p)?p[2]:p?.z;
 ok(draft.map==='coast'&&!draft.ufoBoarded&&[x,y,z].every(Number.isFinite),'海岸へ歩いて来てね。');
 if(a.type==='recover')return assertCoastRecoveryReceipt(draft,a);
 const f=a.type==='pick'?coastFindPose(COAST_FINDS.find(f=>f.id===a.slot),a.at):COAST_WORKSHOP;
 if(a.type==='pick')ok(f.visible,'波がかぶっているよ。潮が引いた浜を探そう。');
 ok(Math.hypot(x-f.x,z-f.z)<=(a.type==='pick'?22:COAST_WORKSHOP.radius),'もう少し近くへ歩いて来てね。');
 ok(Math.abs(y-coastHeight(x,z))<1.5,'着地してから、もう一度ためそう。');
 return true;
}
