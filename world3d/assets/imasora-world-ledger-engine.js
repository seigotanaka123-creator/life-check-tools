// Shared transaction rules. Live and preview ledgers have incompatible formats.
import {canonical} from './imasora-construction-state.js';
import {IMASORA_WORLD_SCHEMA_VERSION} from './imasora-world-map-schema.js';
import {SHOP_OFFERS} from './imasora-mars-construction-shop.js';
import {deliveryAccess} from './imasora-construction-delivery.js';
import {validateWorldWater,validateWaterContinuation,waterCheckpoint} from './imasora-construction-world-water.js';
import {validateWorldSoil,validateSoilContinuation,soilCheckpoint,worldSoilTotals} from './imasora-construction-world-soil.js';
import {validateWorldTimber,validateTimberContinuation,timberCheckpoint,worldTimberTotals} from './imasora-construction-world-timber.js';
export function createWorldLedgerAPI({scope,kinds}) {
const LINK_SCOPE=scope;
const LINK_PRICES=Object.freeze({'mars-water':3,'mars-soil':2,'mars-timber':4});
const LINK_OFFERS=Object.freeze(SHOP_OFFERS.map(o=>Object.freeze({...o,price:LINK_PRICES[o.id]})));
const RESOURCE_KEYS=['spaceCoins','energyCells','starMaterials'];
const MATERIAL_IDS=LINK_OFFERS.map(o=>o.id), LIMIT=10000;
const clone=s=>structuredClone(s);
const ok=(value,message)=>{if(!value)throw Error(message);};
const object=o=>o&&Object.getPrototypeOf(o)===Object.prototype;
const int=(v,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const checkId=id=>ok(typeof id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(id),'取引番号が不正です。');
function keys(o,list){ok(object(o)&&Object.keys(o).sort().join('|')===[...list].sort().join('|'),'接続保存の項目が不正です。');}
function fingerprint(value){const text=canonical(value);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
function validateWorld(world){
  ok(object(world)&&world.version===3&&world.mapSchemaVersion===IMASORA_WORLD_SCHEMA_VERSION,'本体セーブの版が対応外です。元のデータは変更しません。');
  ok(world.builtByMap===undefined||object(world.builtByMap),'建築データが不正です。');
  ok(world.ufoResources===undefined||object(world.ufoResources),'資源データが不正です。');
  for(const key of RESOURCE_KEYS){const v=world.ufoResources?.[key];ok(v===undefined||int(v),`${key}が不正です。数値を丸めたり残高を補充したりせず停止します。`);}
  // Reject NaN/Infinity and unserializable values before any structured clone/write.
  const seen=new Set(),stack=[world];while(stack.length){const v=stack.pop();if(v===null||typeof v==='string'||typeof v==='boolean')continue;if(typeof v==='number'){ok(Number.isFinite(v),'座標等に有限でない数があります。');continue;}ok(Array.isArray(v)||object(v),'保存できない値があります。');ok(!seen.has(v),'循環・共有参照を含む保存は使えません。');seen.add(v);stack.push(...Object.values(v));}
  const json=JSON.stringify(world);ok(json.length<=8000000,'本体セーブのサイズが大きすぎます。');
  return world;
}
function resources(world){return Object.fromEntries(RESOURCE_KEYS.map(k=>[k,world.ufoResources?.[k]??0]));}
function readWorldSource(raw){ok(typeof raw==='string'&&raw.length<=8000000,'同じオリジンの本体セーブがありません。別ポートの保存は読み込みません。');const world=JSON.parse(raw);validateWorld(world);return world;}
function quoteLinkedOrder(id,quantity=1){const o=LINK_OFFERS.find(o=>o.id===id);ok(o,'販売対象でない素材です。');ok(int(quantity,5)&&quantity>0,'購入数は1〜5セットで選んでください。');return{offerId:id,quantity,cost:o.price*quantity,amount:o.amount*quantity};}
function createWorldPurchaseLedger(raw,kind){
  ok(kinds.includes(kind),'複製元の区分が不正です。');const original=readWorldSource(raw),world=clone(original);
  world.ufoResources={...world.ufoResources,...resources(world)};
  const state={schemaVersion:1,scope:LINK_SCOPE,revision:0,worldWrites:0,source:{kind,fingerprint:fingerprint(original),world:clone(original)},world,
    materials:Object.fromEntries(MATERIAL_IDS.map(k=>[k,0])),events:[],pending:null};
  validateWorldPurchaseLedger(state);return state;
}
function validateOrder(event,statuses){
  keys(event,['kind','id','offerId','quantity','cost','amount','status']);checkId(event.id);ok(event.kind==='order'&&statuses.includes(event.status),'注文状態が不正です。');
  const quote=quoteLinkedOrder(event.offerId,event.quantity);ok(quote.cost===event.cost&&quote.amount===event.amount,'保存した価格・数量が不正です。');
}
function validateWorldPurchaseLedger(s){
  keys(s,['schemaVersion','scope','revision','worldWrites','source','world','materials','events','pending']);
  ok(s.schemaVersion===1&&s.scope===LINK_SCOPE,'接続保存の版・区分が不正です。');
  keys(s.source,['kind','fingerprint','world']);ok(kinds.includes(s.source.kind),'複製元の区分が不正です。');
  validateWorld(s.source.world);validateWorld(s.world);ok(fingerprint(s.source.world)===s.source.fingerprint,'複製元の記録が変わっています。');
  keys(s.materials,MATERIAL_IDS);ok(Array.isArray(s.events)&&s.events.length<=LIMIT,'取引記録が不正または上限です。');
  ok(int(s.worldWrites)&&int(s.revision),'保存番号が不正です。');
  const totals=Object.fromEntries(MATERIAL_IDS.map(k=>[k,0])),received=Object.fromEntries(MATERIAL_IDS.map(k=>[k,0])),funds=resources(s.source.world),seen=new Set();let revisions=s.worldWrites;
  for(const e of s.events){
    checkId(e.id);ok(!seen.has(e.id),'取引番号が重複しています。');seen.add(e.id);
    if(e.kind==='reward'){
      keys(e,['kind','id','resource','amount']);ok(RESOURCE_KEYS.includes(e.resource)&&int(e.amount,100)&&e.amount>0,'航行報酬が不正です。');funds[e.resource]+=e.amount;ok(int(funds[e.resource]),'資源の整数上限です。');revisions++;
    }else if(e.kind==='delivery'){
      keys(e,['kind','id','offerId','quantity','amount']);
      const q=quoteLinkedOrder(e.offerId,e.quantity);ok(e.amount===q.amount,'受取量が不正です。');
      received[e.offerId]+=e.amount;ok(received[e.offerId]<=totals[e.offerId],'購入量を超える受取記録です。');revisions++;
    }else{
      validateOrder(e,['paid','cancelled']);ok(funds.spaceCoins>=e.cost,'当時の金貨が足りない注文です。');
      if(e.status==='paid'){funds.spaceCoins-=e.cost;totals[e.offerId]+=e.amount;}revisions+=2;
    }
  }
  if(s.pending){validateOrder(s.pending,['pending']);ok(s.events.length<LIMIT&&!seen.has(s.pending.id)&&funds.spaceCoins>=s.pending.cost,'保留中の注文が不正です。');revisions++;}
  ok(s.revision===revisions,'取引と保存番号が一致しません。');
  ok(canonical(resources(s.world))===canonical(funds)&&canonical(s.materials)===canonical(totals),'資源・購入素材が記録と一致しません。');
  if(s.world.constructionWater!==undefined)validateWorldWater(s.world.constructionWater,received['mars-water']);
  if(s.world.constructionSoil!==undefined)validateWorldSoil(s.world.constructionSoil,received['mars-soil']);
  if(s.world.constructionTimber!==undefined)validateWorldTimber(s.world.constructionTimber,received['mars-timber']);
  return true;
}
function existing(s,id){return s.events.find(e=>e.id===id)||(s.pending?.id===id?s.pending:null);}
function prepareLinkedOrder(s,offerId,quantity,id){
  validateWorldPurchaseLedger(s);checkId(id);const q=quoteLinkedOrder(offerId,quantity),old=existing(s,id);
  if(old){ok(old.kind==='order'&&old.offerId===offerId&&old.quantity===quantity,'同じ取引番号の内容が違います。');return s;}
  ok(!s.pending,'先に保留注文を完了または取り消してください。');ok(s.events.length<LIMIT,'取引記録の上限です。');ok(s.world.ufoResources.spaceCoins>=q.cost,'宇宙金貨が足りません。');
  const n=clone(s);n.pending={kind:'order',id,...q,status:'pending'};n.revision++;validateWorldPurchaseLedger(n);return n;
}
function settleLinkedOrder(s,id,{cancel=false}={}){
  validateWorldPurchaseLedger(s);checkId(id);const old=s.events.find(e=>e.id===id);
  if(old){ok(old.kind==='order'&&old.status===(cancel?'cancelled':'paid'),'この取引は別の状態で完了しています。');return s;}
  ok(s.pending?.id===id,'保留注文が見つかりません。');const n=clone(s),event={...n.pending,status:cancel?'cancelled':'paid'};
  if(!cancel){n.world.ufoResources.spaceCoins-=event.cost;n.materials[event.offerId]+=event.amount;}
  n.events.push(event);n.pending=null;n.revision++;validateWorldPurchaseLedger(n);return n;
}
function awardLinkedFlightReward(s,resource,amount,id){
  validateWorldPurchaseLedger(s);checkId(id);ok(RESOURCE_KEYS.includes(resource)&&int(amount,100)&&amount>0,'航行報酬が不正です。');const old=existing(s,id);
  if(old){ok(old.kind==='reward'&&old.resource===resource&&old.amount===amount,'同じ取引番号の内容が違います。');return s;}
  ok(s.events.length+(s.pending?1:0)<LIMIT,'取引記録の上限です。');const n=clone(s);
  n.world.ufoResources[resource]+=amount;n.events.push({kind:'reward',id,resource,amount});n.revision++;validateWorldPurchaseLedger(n);return n;
}
function saveLinkedWorldDraft(s,draft){
  validateWorldPurchaseLedger(s);validateWorld(draft);const n=clone(s);
  // The wallet/resource authority is never taken from a stale scene snapshot.
  // Other scene data is committed under the store's generation check.
  n.world={...n.world,...clone(draft)};n.world.ufoResources=clone(s.world.ufoResources);
  // Work is checkpointed only by its dedicated generation-checked path.
  if(s.world.constructionWater!==undefined)n.world.constructionWater=clone(s.world.constructionWater);
  else delete n.world.constructionWater;
  if(s.world.constructionSoil!==undefined)n.world.constructionSoil=clone(s.world.constructionSoil);
  else delete n.world.constructionSoil;
  if(s.world.constructionTimber!==undefined)n.world.constructionTimber=clone(s.world.constructionTimber);
  else delete n.world.constructionTimber;
  if(s.world.ufoEquipment&&draft.ufoEquipment)n.world.ufoEquipment={...s.world.ufoEquipment,...clone(draft.ufoEquipment)};
  n.worldWrites++;n.revision++;validateWorldPurchaseLedger(n);return n;
}
function projectLinkedShop(s){
  if(!s)return null;return{balance:s.world.ufoResources.spaceCoins,materials:clone(s.materials),pending:s.pending?clone(s.pending):null,orders:s.events.filter(e=>e.kind==='order').map(clone)};
}
function projectConstructionStock(s){
  if(!s)return null;
  const stored=Object.fromEntries(MATERIAL_IDS.map(k=>[k,0]));
  const receipts=s.events.filter(e=>e.kind==='delivery');
  for(const e of receipts)stored[e.offerId]+=e.amount;
  const unreceived=Object.fromEntries(MATERIAL_IDS.map(k=>[k,s.materials[k]-stored[k]]));
  const inUse=s.world.constructionWater?.allocated*250||0;stored['mars-water']-=inUse;
  const soilUse=s.world.constructionSoil?worldSoilTotals(s.world.constructionSoil).inUse:0;stored['mars-soil']-=soilUse;
  const timberUse=s.world.constructionTimber?worldTimberTotals(s.world.constructionTimber).inUse:0;stored['mars-timber']-=timberUse;
  return {purchased:clone(s.materials),stored,unreceived,receipts:receipts.map(clone),...((s.world.constructionWater||s.world.constructionSoil||s.world.constructionTimber)?{inUse:{...(s.world.constructionWater?{'mars-water':inUse}:{}),...(s.world.constructionSoil?{'mars-soil':soilUse}:{}),...(s.world.constructionTimber?{'mars-timber':timberUse}:{})}}:{})};
}
function saveConstructionWaterDraft(s,work,draft,expectedRevision){
  validateWorldPurchaseLedger(s);
  const old=s.world.constructionWater;
  ok((old?.revision??null)===expectedRevision,'別の作業状態で更新されています。上書きしません。');
  const received=s.events.filter(e=>e.kind==='delivery'&&e.offerId==='mars-water').reduce((n,e)=>n+e.amount,0);
  validateWorldWater(work,received);validateWaterContinuation(old,work);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionWater=waterCheckpoint(work);validateWorldPurchaseLedger(n);return n;
}
function saveConstructionSoilDraft(s,work,draft,expectedRevision){
  validateWorldPurchaseLedger(s);const old=s.world.constructionSoil;
  ok((old?.revision??null)===expectedRevision,'別の土作業状態で更新されています。上書きしません。');
  const received=s.events.filter(e=>e.kind==='delivery'&&e.offerId==='mars-soil').reduce((n,e)=>n+e.amount,0);
  validateWorldSoil(work,received);validateSoilContinuation(old,work);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionSoil=soilCheckpoint(work);validateWorldPurchaseLedger(n);return n;
}
function saveConstructionTimberDraft(s,work,draft,expectedRevision){
  validateWorldPurchaseLedger(s);const old=s.world.constructionTimber;
  ok((old?.revision??null)===expectedRevision,'別の木材作業状態で更新されています。上書きしません。');
  const received=s.events.filter(e=>e.kind==='delivery'&&e.offerId==='mars-timber').reduce((n,e)=>n+e.amount,0);
  validateWorldTimber(work,received);validateTimberContinuation(old,work);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionTimber=timberCheckpoint(work);validateWorldPurchaseLedger(n);return n;
}
function receiveConstructionMaterial(s,offerId,quantity,id,context){
  validateWorldPurchaseLedger(s);checkId(id);const q=quoteLinkedOrder(offerId,quantity),old=existing(s,id);
  // A saved receipt remains idempotent even after leaving the receiving dock.
  if(old){ok(old.kind==='delivery'&&old.offerId===offerId&&old.quantity===quantity,'同じ受取番号の内容が違います。');return s;}
  ok(deliveryAccess(context),'工事現場の建材受取所の前へ、徒歩で来てください。');
  ok(!s.pending,'先にショップの保留注文を確認してください。');
  ok(s.events.length<LIMIT,'取引記録の上限です。');
  ok(projectConstructionStock(s).unreceived[offerId]>=q.amount,'まだ受け取っていない購入品が足りません。');
  const n=clone(s);n.events.push({kind:'delivery',id,offerId,quantity,amount:q.amount});n.revision++;
  validateWorldPurchaseLedger(n);return n;
}
function packWorldPurchaseLedger(s){validateWorldPurchaseLedger(s);return JSON.stringify({format:LINK_SCOPE,checksum:fingerprint(s),state:s});}
function unpackWorldPurchaseLedger(raw){ok(typeof raw==='string'&&raw.length<=20000000,'接続保存が不正です。');const p=JSON.parse(raw);keys(p,['format','checksum','state']);ok(p.format===LINK_SCOPE&&p.checksum===fingerprint(p.state),'接続保存の整合性を確認できません。');validateWorldPurchaseLedger(p.state);return p.state;}
return {LINK_SCOPE,LINK_PRICES,LINK_OFFERS,fingerprint,readWorldSource,quoteLinkedOrder,createWorldPurchaseLedger,validateWorldPurchaseLedger,prepareLinkedOrder,settleLinkedOrder,awardLinkedFlightReward,saveLinkedWorldDraft,saveConstructionWaterDraft,saveConstructionSoilDraft,saveConstructionTimberDraft,projectLinkedShop,projectConstructionStock,receiveConstructionMaterial,packWorldPurchaseLedger,unpackWorldPurchaseLedger};
}
