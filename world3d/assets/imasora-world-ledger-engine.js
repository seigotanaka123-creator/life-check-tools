import{assertRoomLayoutWorld,assertAllRoomLayoutsWorld}from'./imasora-construction-room-layout-guard.mjs?v=120fw';
import {assertEntranceDoorClear} from './imasora-construction-building-door-guard.mjs?v=120fw';
import {assertUpperCastWorld,assertUpperAction,assertHighWorkAccess} from './imasora-construction-high-casting.mjs?v=120fw';
import {transportGroundHeightAt} from './imasora-construction-transport-site.mjs?v=120fw';
import {highMaterialCost,highWorldTimber,validateHighWorld,transitionHighWorld,assertHighFoundation} from './imasora-construction-high-world.mjs?v=120fw';
import {prepareTransportParking} from './imasora-construction-transport-parking.mjs?v=120fw';
import {serializedSaveSnapshot} from './imasora-save-wire.mjs';
import {parseCapturedConstructionJson,capturedJsonInfo,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {assertWorkPlatformRecord,platformMatchesProject} from './imasora-construction-concrete/free-platform-record.mjs?v=120fw';
// Shared transaction rules. Live and preview ledgers have incompatible formats.
import {canonical} from './imasora-construction-state.js';
import {IMASORA_WORLD_SCHEMA_VERSION} from './imasora-world-map-schema.js?v=120ds';
import {SHOP_OFFERS} from './imasora-mars-construction-shop.js?v=503';
import {deliveryAccess} from './imasora-construction-delivery.js';
import {initialWorldWater,WATER_YARDS,validateWorldWater,validateWaterContinuation,waterCheckpoint} from './imasora-construction-world-water.js?v=120fb';
import {initialWorldSoil,SOIL_YARDS,validateWorldSoil,validateSoilContinuation,soilCheckpoint,worldSoilTotals} from './imasora-construction-world-soil.js?v=120fw';
import {initialWorldTimber,TIMBER_YARDS,validateWorldTimber,validateTimberContinuation,timberCheckpoint,worldTimberTotals} from './imasora-construction-world-timber.js?v=120fw';
import {EARTH_LIVE_SCOPE,createAuthorityExcavation,validateAuthorityExcavation,validateAuthorityExcavationContinuation,authorityExcavationWork,checkpointAuthorityExcavation} from './imasora-construction-earth-authority.js?v=120fc';
import {stepWorldExcavation} from './imasora-construction-world-excavation.js?v=120fc';
import './imasora-construction-pack-transfer.js?v=530';
const PACK_TRANSFER=globalThis.ImasoraConstructionPackTransfer;
import {createProfileProject,assertProfileProject,transitionProfileProject,availablePackConcreteCredits} from './imasora-construction-profile-project.js?v=120fw';
import {createWorldTransport,createWorldTransportWork,validateWorldTransport,commandWorldTransport} from './imasora-construction-transport-authority.mjs?v=120fw';
import {validateScoopDumpContinuation} from './imasora-construction-fragment-scoop.mjs?v=120fw';
import {assertWorldTransportWorkReceipt,snapshotWorldTransportWork} from './imasora-construction-transport-work-flow.mjs?v=120fw';
import {projectStarterToolkit} from './imasora-construction-toolkit.mjs?v=120fs';
import {assertTransportShovel,transportNeedsShovel} from './imasora-construction-transport-hand.mjs';
import {concreteParkingProblem} from './imasora-construction-concrete/free-parking.mjs?v=120ey';
import {vehiclePoseProblem} from './imasora-construction-concrete/free-vehicle-contact.mjs?v=120fw';
import {PARKING_ADAPTERS,prepareParkingMigration,validateParkingRecord} from './imasora-construction-parking-migration.mjs?v=120fc';
export function createWorldLedgerAPI({scope,kinds,verifiedPacketCacheBytes=0,immutablePackets=false}) {
// Cache only exact immutable packet strings that completed every check.
// Every read still parses a fresh object; mutable caller objects are never trusted.
kinds=Object.freeze([...kinds]);
const verifiedPackets=new Map(),packetCacheLimit=Math.max(0,Math.min(20*1024*1024,Number(verifiedPacketCacheBytes)||0));let packetCacheBytes=0;
function rememberPacket(raw,state=true){
 if(!packetCacheLimit||raw.length*2>packetCacheLimit)return;
 if(verifiedPackets.has(raw)){verifiedPackets.delete(raw);packetCacheBytes-=raw.length*2;}
 verifiedPackets.set(raw,state);packetCacheBytes+=raw.length*2;
 while(verifiedPackets.size>2||packetCacheBytes>packetCacheLimit){const oldest=verifiedPackets.keys().next().value;verifiedPackets.delete(oldest);packetCacheBytes-=oldest.length*2;}
}
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
  const seen=new Set(),stack=capturedJsonInfo(world)?[]:[world];while(stack.length){const v=stack.pop();if(v===null||typeof v==='string'||typeof v==='boolean')continue;if(typeof v==='number'){ok(Number.isFinite(v),'座標等に有限でない数があります。');continue;}ok(Array.isArray(v)||object(v),'保存できない値があります。');ok(!seen.has(v),'循環・共有参照を含む保存は使えません。');seen.add(v);stack.push(...Object.values(v));}
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
function parkingAdapters(){return PARKING_ADAPTERS.map((a,i)=>({...a,yards:[WATER_YARDS,SOIL_YARDS,TIMBER_YARDS][i],initial:[initialWorldWater,initialWorldSoil,initialWorldTimber][i],validate:[validateWorldWater,validateWorldSoil,validateWorldTimber][i]}));}
function validateWorldPurchaseLedger(s){
  keys(s,['schemaVersion','scope','revision','worldWrites','source','world','materials','events','pending']);
  ok([1,2,3,4].includes(s.schemaVersion)&&s.scope===LINK_SCOPE,'接続保存の版・区分が不正です。');
  keys(s.source,['kind','fingerprint','world']);ok(kinds.includes(s.source.kind),'複製元の区分が不正です。');
  validateWorld(s.source.world);validateWorld(s.world);ok(fingerprint(s.source.world)===s.source.fingerprint,'複製元の記録が変わっています。');
  ok(s.source.world.constructionPackTrialLedger===undefined,'複製元の試作受取台帳は新しい保存へ持ち込めません。');
  if(s.world.constructionPackTrialLedger!==undefined)PACK_TRANSFER.validateTrialLedger(s.world.constructionPackTrialLedger,s.source.fingerprint);
  if(s.world.constructionProfileProject!==undefined)assertProfileProject(s.world.constructionProfileProject,s.world.constructionPackTrialLedger);
  if(s.world.constructionWorkPlatform!==undefined)assertWorkPlatformRecord(s.world.constructionWorkPlatform,s.world.constructionProfileProject);
  ok(s.source.world.constructionExcavation===undefined,'複製元から掘削地形の取得権を持ち込むことはできません。');
  ok(s.source.world.constructionTransport===undefined,'複製元から共有土の取得権を持ち込むことはできません。');
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
  validateParkingRecord(s.world,received,parkingAdapters());
  if(s.world.constructionParking?.version>=2){
   // The journal already retains every pre-migration operation. Keep a small
   // anchor, rather than copying/replaying an entire large project on each save.
   const before=s.world.constructionParking.before.constructionProfileProject,p=s.world.constructionProfileProject;keys(before,['revision','operationId']);ok(int(before.revision)&&before.revision<p.revision,'移設前の記録が不正です。');checkId(before.operationId);
   let index=before.revision,op=null;for(const page of [...(p.archivedOperations??[]),p.operations]){if(index<page.length){op=page[index];break;}index-=page.length;}
   ok(op?.type==='FREE_PARK_VEHICLES'&&op.operationId===before.operationId&&op.corner===s.world.constructionParking.corner,'車両の移設履歴が一致しません。');
  }
  if(s.world.constructionWater!==undefined)validateWorldWater(s.world.constructionWater,received['mars-water']);
  if(s.world.constructionSoil!==undefined)validateWorldSoil(s.world.constructionSoil,received['mars-soil']);
  if(s.world.constructionTimber!==undefined)validateWorldTimber(s.world.constructionTimber,received['mars-timber']);
  if(s.schemaVersion===4){
    ok(LINK_SCOPE==='imasora-world-ledger-v1'&&Object.hasOwn(s.world,'constructionHighBuild'),'高い建物の保存が欠けています。');
    if(s.world.constructionHighBuild!==null)validateHighWorld(s.world.constructionHighBuild);
  }else ok(s.world.constructionHighBuild===undefined,'高い建物は新版の保存で記録してください。');
  ok((s.world.constructionTimber?worldTimberTotals(s.world.constructionTimber).inUse:0)+highWorldTimber(s.world.constructionHighBuild)<=received['mars-timber'],'木材を同時に使いすぎています。元の材料を残して止めました。');
  if(s.world.constructionExcavation!==undefined)validateAuthorityExcavation(s.world.constructionExcavation);
  // Live excavation makes the complete ledger unreadable to pre-v496 clients,
  // including clients that do not recognize an excavation field at all.
  if(s.schemaVersion>=2)ok(LINK_SCOPE==='imasora-world-ledger-v1'&&s.world.constructionExcavation?.version===2&&s.world.constructionExcavation?.scope===EARTH_LIVE_SCOPE,'通常の掘削取得記録が欠けた新版保存は使用できません。');
  else ok(s.world.constructionExcavation?.scope!==EARTH_LIVE_SCOPE,'通常の掘削地形は新版保存で一度だけ取得してください。');
  if(s.schemaVersion>=3){ok(s.world.constructionTransport!==undefined,'共有土の記録が欠けた保存は使用できません。');validateWorldTransport(s.world.constructionTransport,s.world.constructionExcavation,s.source.fingerprint);}
  else ok(s.world.constructionTransport===undefined,'共有土は対応した新版保存へ一度だけ切り替えてください。');
  assertAllRoomLayoutsWorld(s.world);assertHighWorkAccess(s.world);assertUpperCastWorld(s.world,{heightAt:(x,z)=>transportGroundHeightAt(s.world.constructionTransport,x,z)??0});
  if(s.world.constructionHighBuild)assertHighFoundation(s.world.constructionHighBuild,s.world.constructionTransport);
  if(transportNeedsShovel(s.world.constructionTransport))assertTransportShovel(projectStarterToolkit(s.world.constructionPackTrialLedger,s.source.fingerprint),s.source.fingerprint);
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
function saveLinkedWorldDraft(s,draft,{craft=false}={}){
  validateWorldPurchaseLedger(s);const n=buildLinkedWorldDraft(s,draft,craft);validateWorldPurchaseLedger(n);return n;
}
// Private assembly only. Callers validate the original ledger first and the
// finished ledger afterwards; no intermediate version is published or saved.
function buildLinkedWorldDraft(s,draft,craft=false,transportRecord=undefined){
  validateWorld(draft);
  // Physical saves replace this field with the checked flow snapshot below.
  // Do not first duplicate the old and scene copies only to discard both.
  // Dynamic/nonordinary top-level properties retain the original clone path.
  const plainData=v=>object(v)&&Reflect.ownKeys(v).length===Object.keys(v).length&&Object.values(Object.getOwnPropertyDescriptors(v)).every(d=>Object.hasOwn(d,'value')&&d.enumerable);
  const lean=transportRecord!==undefined&&plainData(s)&&plainData(s.world)&&plainData(draft);
  const sceneWithTransportPlaceholder=v=>Object.hasOwn(v,'constructionTransport')?{...v,constructionTransport:null}:{...v};
  const n=clone(lean?{...s,world:sceneWithTransportPlaceholder(s.world)}:s);
  // The wallet/resource authority is never taken from a stale scene snapshot.
  // Other scene data is committed under the store's generation check.
  n.world={...n.world,...clone(lean?sceneWithTransportPlaceholder(draft):draft)};n.world.ufoResources=clone(s.world.ufoResources);
  if(!craft){
    if(s.world.equipmentCraftPending!==undefined)n.world.equipmentCraftPending=clone(s.world.equipmentCraftPending);
    else delete n.world.equipmentCraftPending;
  }
  if(s.world.constructionParking!==undefined)n.world.constructionParking=clone(s.world.constructionParking);else delete n.world.constructionParking;
  if(Object.hasOwn(s.world,'constructionHighBuild'))n.world.constructionHighBuild=clone(s.world.constructionHighBuild);else delete n.world.constructionHighBuild;
  // Work is checkpointed only by its dedicated generation-checked path.
  if(s.world.constructionWater!==undefined)n.world.constructionWater=clone(s.world.constructionWater);
  else delete n.world.constructionWater;
  if(s.world.constructionSoil!==undefined)n.world.constructionSoil=clone(s.world.constructionSoil);
  else delete n.world.constructionSoil;
  if(s.world.constructionTimber!==undefined)n.world.constructionTimber=clone(s.world.constructionTimber);
  else delete n.world.constructionTimber;
  if(s.world.constructionExcavation!==undefined)n.world.constructionExcavation=clone(s.world.constructionExcavation);
  else delete n.world.constructionExcavation;
  if(transportRecord!==undefined){
    const soil=transportRecord?.work?.frame?.soil;
    if(isCapturedConstructionJson(soil)){const shell=clone({...transportRecord,work:{...transportRecord.work,frame:{...transportRecord.work.frame,soil:null}}});shell.work.frame.soil=soil;n.world.constructionTransport=shell;}
    else n.world.constructionTransport=snapshotWorldTransportWork(transportRecord);
  }
  else if(s.world.constructionTransport!==undefined)n.world.constructionTransport=clone(s.world.constructionTransport);
  else delete n.world.constructionTransport;
  if(s.world.constructionPackTrialLedger!==undefined)n.world.constructionPackTrialLedger=clone(s.world.constructionPackTrialLedger);
  else delete n.world.constructionPackTrialLedger;
  if(s.world.constructionProfileProject!==undefined)n.world.constructionProfileProject=clone(s.world.constructionProfileProject);
  else delete n.world.constructionProfileProject;
  if(s.world.constructionWorkPlatform!==undefined)n.world.constructionWorkPlatform=clone(s.world.constructionWorkPlatform);
  else delete n.world.constructionWorkPlatform;
  if(s.world.ufoEquipment&&draft.ufoEquipment)n.world.ufoEquipment={...s.world.ufoEquipment,...clone(draft.ufoEquipment)};
  n.worldWrites++;n.revision++;return n;
}
// The ordinary domain API keeps returning an independent, editable snapshot.
// Only the service's captured save preparation retains the immutable receipt.
function saveConstructionTransportWork(s,record,draft,expectedRevision){
 return clone(prepareConstructionTransportWork(s,record,draft,expectedRevision));
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
  const timberUse=(s.world.constructionTimber?worldTimberTotals(s.world.constructionTimber).inUse:0)+highWorldTimber(s.world.constructionHighBuild);stored['mars-timber']-=timberUse;
  return {purchased:clone(s.materials),stored,unreceived,receipts:receipts.map(clone),...((s.world.constructionWater||s.world.constructionSoil||s.world.constructionTimber||s.world.constructionHighBuild)?{inUse:{...(s.world.constructionWater?{'mars-water':inUse}:{}),...(s.world.constructionSoil?{'mars-soil':soilUse}:{}),...((s.world.constructionTimber||s.world.constructionHighBuild)?{'mars-timber':timberUse}:{})}}:{})};
}
// Compose all migrations in memory; the service commits exactly one packet.
// Any invalid or busy old vehicle leaves the complete previous world intact.
function prepareSharedConstruction(s,options,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(s.revision===expectedRevision,'別の保存が変わりました。もう一度ひらいてね。');ok(LINK_SCOPE==='imasora-world-ledger-v1'&&draft.map==='construction','工事現場で準備しよう。');
 if(s.world.constructionParking?.version===3)return s;
 let n=s;const {corner,sites,earthSite,origin,freeLocation}=options;
 if(!n.world.constructionParking)n=migrateConstructionParking(n,corner,sites,draft,n.revision);
 else ok(n.world.constructionParking.corner===corner,'駐車場の場所を変更できません。');
 if(n.world.constructionParking.version===1){
  const p=projectConstructionProfileProject(n);
  if(!p.freeBuild?.location){ok(freeLocation&&Number.isSafeInteger(freeLocation.x)&&Number.isSafeInteger(freeLocation.z),'つくる場所を確認してね。');n=applyConstructionProfileProject(n,{type:'FREE_PLACE',operationId:'parking-site-'+n.revision,...freeLocation},p.revision,draft);}
  // An empty material ledger gives no tools or supplies. It is required only
  // to validate the existing project and its vehicle placement history.
  if(!n.world.constructionPackTrialLedger){n=clone(n);n.world.constructionPackTrialLedger=PACK_TRANSFER.emptyTrialLedger(n.source.fingerprint);}
  n=migrateConcreteParking(n,draft,n.revision);
 }
 if(!n.world.constructionExcavation){
  n=allocateConstructionExcavation(n,earthSite,origin,'shared-ground-'+n.source.fingerprint,draft,{live:true});
 }
 const earth=n.world.constructionExcavation;
 // The normal scene may have allocated the untouched yard during startup,
 // before its first physical frame. Settle only this exact pristine record;
 // never rewrite an old moving player, carried load or partial operation.
 if(!n.world.constructionTransport&&earth.revision===0&&canonical(earth)===canonical(createAuthorityExcavation(earth.site,earth.origin,earth.source.grantId,{live:true}))){
  const snapshot=authorityExcavationWork(earth);snapshot.work=stepWorldExcavation(snapshot.work,{},1/120);
  n=saveConstructionExcavationDraft(n,checkpointAuthorityExcavation(earth,snapshot),draft,earth.revision);
 }
 if(n.world.constructionTransport?.version!==2)n=enableConstructionTransportWork(n,draft,n.world.constructionExcavation.revision);
 if(n.world.constructionParking.version===2)n=migrateTransportParking(n,draft,n.revision);
 validateWorldPurchaseLedger(n);return n;
}
function migrateConstructionParking(s,corner,sites,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1'&&draft.map==='construction','通常の工事現場で準備してください。');ok(s.revision===expectedRevision,'移設中に別の保存が変わりました。元の作業は保持しています。');
 const received=Object.fromEntries(MATERIAL_IDS.map(k=>[k,s.events.filter(e=>e.kind==='delivery'&&e.offerId===k).reduce((n,e)=>n+e.amount,0)]));
 const moved=prepareParkingMigration(s.world,corner,sites,received,parkingAdapters()),n=saveLinkedWorldDraft(s,draft);Object.assign(n.world,moved.records);n.world.constructionParking=moved.parking;validateWorldPurchaseLedger(n);return n;
}
function migrateTransportParking(s,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1'&&draft.map==='construction','工事現場で準備してください。');ok(s.revision===expectedRevision,'別の保存が変わりました。元の作業は保持しています。');
 const parking=s.world.constructionParking,record=s.world.constructionTransport;ok(parking?.version===2&&record?.version===2,'先に駐車場と土の作業を準備してください。');
 const old=record.work,work=prepareTransportParking(old,parking.corner),n=saveLinkedWorldDraft(s,draft);
 n.world.constructionTransport={...record,work};n.world.constructionParking={...clone(parking),version:3,vehicles:[...parking.vehicles,'excavator','dump'],before:{...clone(parking.before),constructionTransport:{revision:old.revision,frameRevision:old.frame.revision,soilRevision:old.frame.soil.revision,player:clone(old.frame.player),dump:clone(old.frame.dump),machineArm:clone(old.frame.machineArm)}}};
 validateWorldPurchaseLedger(n);return n;
}
function migrateConcreteParking(s,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1'&&draft.map==='construction','通常の工事現場で準備してください。');ok(s.revision===expectedRevision,'別の保存が変わりました。元の作業は保持しています。');
 const parking=s.world.constructionParking;ok(parking?.version===1,'先に共通駐車場を準備してください。');
 const p=s.world.constructionProfileProject,issue=concreteParkingProblem(p?.freeBuild);ok(!issue,issue);
 const next=transitionProfileProject(p,{type:'FREE_PARK_VEHICLES',corner:parking.corner,operationId:'parking-concrete-'+s.revision},p.revision,s.world.constructionPackTrialLedger).state;
 for(const name of ['truck','pump']){const problem=vehiclePoseProblem(next.freeBuild,name,next.freeBuild[name]);ok(!problem,problem);}
 const n=saveLinkedWorldDraft(s,draft);n.world.constructionProfileProject=next;n.world.constructionParking={...clone(parking),version:2,vehicles:[...parking.vehicles,'truck','pump'],before:{...clone(parking.before),constructionProfileProject:{revision:p.revision,operationId:'parking-concrete-'+s.revision}}};
 validateWorldPurchaseLedger(n);return n;
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
function applyConstructionHighBuild(s,action,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(s.revision===expectedRevision,'別のセーブが進んだよ。古い内容では上書きしません。');
 ok(LINK_SCOPE==='imasora-world-ledger-v1'&&s.schemaVersion>=3&&s.world.constructionParking?.version===3&&draft.map==='construction','みんなの駐車場を準備してから、高い建物をつくろう。');
 if(action.type==='PLACE')ok(projectConstructionStock(s).stored['mars-timber']>=highMaterialCost(action.blueprint),'この形をつくる木材が足りないよ。受取所で受け取ろう。');
 assertRoomLayoutWorld(s.world,action);assertEntranceDoorClear(s.world,action,draft);const project=transitionHighWorld(s.world.constructionHighBuild??null,action),n=saveLinkedWorldDraft(s,draft);
 n.schemaVersion=4;n.world.constructionHighBuild=project;validateWorldPurchaseLedger(n);return n;
}
function saveConstructionTimberDraft(s,work,draft,expectedRevision){
  validateWorldPurchaseLedger(s);const old=s.world.constructionTimber;
  ok((old?.revision??null)===expectedRevision,'別の木材作業状態で更新されています。上書きしません。');
  const received=s.events.filter(e=>e.kind==='delivery'&&e.offerId==='mars-timber').reduce((n,e)=>n+e.amount,0);
  validateWorldTimber(work,received);validateTimberContinuation(old,work);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionTimber=timberCheckpoint(work);validateWorldPurchaseLedger(n);return n;
}
function allocateConstructionExcavation(s,site,origin,grantId,draft,{live=false}={}){
  validateWorldPurchaseLedger(s);checkId(grantId);ok(typeof live==='boolean','地形の保存区分が不正です。');
  ok(!live||LINK_SCOPE==='imasora-world-ledger-v1','試験用の台帳へ通常の掘削地形は取得できません。');
  const old=s.world.constructionExcavation;
  if(old){ok((old.scope===EARTH_LIVE_SCOPE)===live&&old.site===site&&old.origin===origin&&old.source.grantId===grantId,'すでに別の保存区分・取得番号・区画で地形を確保しています。');return s;}
  const work=createAuthorityExcavation(site,origin,grantId,{live}),n=saveLinkedWorldDraft(s,draft);
  // Upgrade and first allocation are serialized in the SAME resulting packet.
  // Never write a schema-2 ledger without its finite native earth allocation.
  if(live)n.schemaVersion=2;
  n.world.constructionExcavation=work;validateWorldPurchaseLedger(n);return n;
}
function saveConstructionExcavationDraft(s,record,draft,expectedRevision){
  validateWorldPurchaseLedger(s);const old=s.world.constructionExcavation;
  ok(s.world.constructionTransport===undefined,'土の共有保存へ切り替え済みです。旧ショベルからは変更できません。');
  ok(old!==undefined,'先に本体で掘削する地形を確保してください。');
  ok(old.revision===expectedRevision,'別の掘削状態で更新されています。上書きしません。');
  validateAuthorityExcavationContinuation(old,record);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionExcavation=clone(record);validateWorldPurchaseLedger(n);return n;
}
function enableConstructionTransport(s,draft,expectedEarthRevision){
  validateWorldPurchaseLedger(s);const earth=s.world.constructionExcavation;
  ok(LINK_SCOPE==='imasora-world-ledger-v1'&&earth?.scope===EARTH_LIVE_SCOPE,'取得済みの通常地形が必要です。');
  ok(earth.revision===expectedEarthRevision,'切替確認後に掘削作業が変わりました。もう一度確認してください。');
  ok(!s.pending&&!s.world.equipmentCraftPending,'購入・装備作成を完了してから切り替えてください。');
  if(s.world.constructionTransport!==undefined)return s;
  const record=createWorldTransport(earth,s.source.fingerprint),n=saveLinkedWorldDraft(s,draft);
  n.schemaVersion=Math.max(3,n.schemaVersion);n.world.constructionTransport=record;validateWorldPurchaseLedger(n);return n;
}
function applyConstructionTransportCommand(s,command,draft){
  validateWorldPurchaseLedger(s);ok(s.schemaVersion>=3,'先に土の共有保存へ切り替えてください。');
  const record=commandWorldTransport(s.world.constructionTransport,s.world.constructionExcavation,s.source.fingerprint,command);
  if(record===s.world.constructionTransport)return s;
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionTransport=record;validateWorldPurchaseLedger(n);return n;
}
function enableConstructionTransportWork(s,draft,expectedEarthRevision){
  validateWorldPurchaseLedger(s);const earth=s.world.constructionExcavation;
  ok(LINK_SCOPE==='imasora-world-ledger-v1'&&earth?.scope===EARTH_LIVE_SCOPE,'取得済みの通常地形が必要です。');
  ok(earth.revision===expectedEarthRevision,'切替確認後に掘削作業が変わりました。もう一度確認してください。');
  ok(!s.pending&&!s.world.equipmentCraftPending,'購入・装備作成を完了してから切り替えてください。');
  const record=createWorldTransportWork(earth,s.source.fingerprint,s.world.constructionTransport);
  if(record===s.world.constructionTransport)return s;
  const n=saveLinkedWorldDraft(s,draft);n.schemaVersion=Math.max(3,n.schemaVersion);n.world.constructionTransport=record;validateWorldPurchaseLedger(n);return n;
}
// Pure candidate assembly for the save worker. It grants no physical receipt
// and cannot commit. The service checks the private receipt before dispatch.
function prepareConstructionTransportCandidate(s,record,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(s.world.constructionTransport?.version===2&&s.world.constructionTransport.work.revision===expectedRevision,'別の作業が保存されました。');
 validateWorldTransport(record,s.world.constructionExcavation,s.source.fingerprint);validateScoopDumpContinuation(s.world.constructionTransport.work,record.work);
 if(transportNeedsShovel(record))assertTransportShovel(projectStarterToolkit(s.world.constructionPackTrialLedger,s.source.fingerprint),s.source.fingerprint);
 const n=buildLinkedWorldDraft(s,draft,false,record);validateWorldPurchaseLedger(n);return n;
}
function prepareConstructionTransportWork(s,record,draft,expectedRevision){
  validateWorldPurchaseLedger(s);assertWorldTransportWorkReceipt(s.world.constructionTransport,record,expectedRevision,projectStarterToolkit(s.world.constructionPackTrialLedger,s.source.fingerprint));
  const n=buildLinkedWorldDraft(s,draft,false,record);validateWorldPurchaseLedger(n);return n;
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
function receiveConstructionPackTrial(s,packet,context){
  validateWorldPurchaseLedger(s);
  ok(LINK_SCOPE==='imasora-world-ledger-v1','試作ポイントは通常の工事現場プロフィールだけで受け取れます。');
  const profileId=s.source.fingerprint,old=s.world.constructionPackTrialLedger;
  const nextTrial=PACK_TRANSFER.receiveTransfer(old,packet,profileId);
  if(nextTrial===old)return s; // A committed receipt is idempotent even away from the dock.
  ok(deliveryAccess(context),'工事現場の建材受取所の前へ、徒歩で来てください。');
  ok(!s.pending,'先にショップの保留注文を確認してください。');
  const n=saveLinkedWorldDraft(s,s.world);n.world.constructionPackTrialLedger=nextTrial;validateWorldPurchaseLedger(n);return n;
}
function projectConstructionPackTrial(s){
  if(!s)return null;
  return clone(s.world.constructionPackTrialLedger??PACK_TRANSFER.emptyTrialLedger(s.source.fingerprint));
}
function projectConstructionProfileProject(s){
  if(!s)return null;
  const profileId=s.source.fingerprint,ledger=s.world.constructionPackTrialLedger??PACK_TRANSFER.emptyTrialLedger(profileId);
  const project=s.world.constructionProfileProject??createProfileProject(profileId);assertProfileProject(project,ledger);return clone(project);
}
function projectConstructionProfileStock(s){
  if(!s)return null;
  const profileId=s.source.fingerprint,ledger=s.world.constructionPackTrialLedger??PACK_TRANSFER.emptyTrialLedger(profileId),project=projectConstructionProfileProject(s);
  return {availablePackConcreteCredits:availablePackConcreteCredits(ledger,project,profileId),packConcreteCredits:ledger.quantities.concreteBlockCredits,
    site:clone(project.site),profileId,revision:project.revision};
}
function applyConstructionProfileProject(s,action,expectedRevision,draft,platform=undefined){
  ok(action?.type!=='FREE_PARK_VEHICLES','車両の移設は駐車場と一緒に保存してください。');
  validateWorldPurchaseLedger(s);checkId(action?.operationId);
  const profileId=s.source.fingerprint,ledger=s.world.constructionPackTrialLedger??PACK_TRANSFER.emptyTrialLedger(profileId);
  const current=s.world.constructionProfileProject??createProfileProject(profileId);
  assertUpperAction(s.world,action);
  const next=transitionProfileProject(current,action,expectedRevision,ledger);if(!next.changed)return s;
  // Validate the original and the final transaction, without validating an
  // unpublished duplicate with the old project in between. Preserve the exact
  // checked immutable terrain, as the physical-save path already does.
  const n=buildLinkedWorldDraft(s,draft,false,s.world.constructionTransport);n.world.constructionProfileProject=next.state;
  if(platform!==undefined){if(platform===null)delete n.world.constructionWorkPlatform;else{assertWorkPlatformRecord(platform,next.state);n.world.constructionWorkPlatform=clone(platform);}}
  else if(n.world.constructionWorkPlatform&&!platformMatchesProject(n.world.constructionWorkPlatform,next.state))delete n.world.constructionWorkPlatform;
  validateWorldPurchaseLedger(n);return n;
}
function saveConstructionWorkPlatform(s,record,draft,expectedRevision){
  validateWorldPurchaseLedger(s);const p=projectConstructionProfileProject(s);ok(p.revision===expectedRevision,'別の施工状態で更新されています。作業台を上書きしません。');
  assertWorkPlatformRecord(record,p);const n=saveLinkedWorldDraft(s,draft);
  if(record===null)delete n.world.constructionWorkPlatform;else n.world.constructionWorkPlatform=clone(record);
  validateWorldPurchaseLedger(n);return n;
}
function packWorldPurchaseLedger(s){validateWorldPurchaseLedger(s);const raw=JSON.stringify({format:LINK_SCOPE,checksum:fingerprint(s),state:s});if(immutablePackets)rememberPacket(raw,serializedSaveSnapshot(s));return raw;}
function unpackWorldPurchaseLedger(raw){ok(typeof raw==='string'&&raw.length<=20000000,'接続保存が不正です。');if(immutablePackets&&verifiedPackets.has(raw)){const state=verifiedPackets.get(raw);rememberPacket(raw,state);return state;}const p=immutablePackets?parseCapturedConstructionJson(raw):JSON.parse(raw);if(verifiedPackets.has(raw)){rememberPacket(raw);return p.state;}keys(p,['format','checksum','state']);ok(p.format===LINK_SCOPE&&p.checksum===fingerprint(p.state),'接続保存の整合性を確認できません。');validateWorldPurchaseLedger(p.state);rememberPacket(raw,immutablePackets?p.state:true);return p.state;}
return {applyConstructionHighBuild,prepareSharedConstruction,migrateTransportParking,migrateConcreteParking,migrateConstructionParking,LINK_SCOPE,LINK_PRICES,LINK_OFFERS,fingerprint,readWorldSource,quoteLinkedOrder,createWorldPurchaseLedger,validateWorldPurchaseLedger,prepareLinkedOrder,settleLinkedOrder,awardLinkedFlightReward,saveLinkedWorldDraft,saveConstructionWaterDraft,saveConstructionSoilDraft,saveConstructionTimberDraft,allocateConstructionExcavation,saveConstructionExcavationDraft,enableConstructionTransport,applyConstructionTransportCommand,enableConstructionTransportWork,saveConstructionTransportWork,prepareConstructionTransportWork,prepareConstructionTransportCandidate,projectLinkedShop,projectConstructionStock,projectConstructionPackTrial,receiveConstructionMaterial,receiveConstructionPackTrial,projectConstructionProfileProject,projectConstructionProfileStock,applyConstructionProfileProject,saveConstructionWorkPlatform,packWorldPurchaseLedger,unpackWorldPurchaseLedger};
}
