import {outdoorSignObstacles,outdoorBoxesHit} from './imasora-construction-outdoor-sign-guard.mjs?v=120pv';
import {reuseScoopSoilTransition,soilTransportCommand,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs?v=120pv';
import {dumpStoragePlan} from './imasora-construction-dump-work.mjs?v=120pv';
import{reelWaterUsed}from'./imasora-construction-reel-furniture.mjs?v=120pl';
import {SHOP_OFFERS} from './imasora-mars-construction-shop.js?v=503';
import{assertStructuralChange}from'./imasora-construction-structure-performance.mjs?v=120pv';
import {pebbleFindOffer,validatePebbleFind,assertPebbleFindAccess} from './imasora-coast-pebble-crabs.mjs?v=120nd';
import {validateSnorkel,assertSnorkelContinuation} from './imasora-coast-snorkeling.mjs?v=120ob';
import {FRUITS,coastFruitTrees,fruitLanding,fruitState,validateFruitReceipts,assertFruitAccess} from './imasora-coast-tree-fruits.mjs?v=120ne';
import {validateCoastExploration,nextCaveRecord,caveFinish} from './imasora-coast-cave-crossing.mjs?v=120mx';
import {validateCoastRewards,emptyCoastRewards,replayCoastRewards,islandAtLanding,validateSailingAward,sailingReceiptId} from './imasora-coast-rewards.mjs?v=120nd';
import {validateCoastVisits,replayCoastVisits,coastVisitOffer,applyCoastVisitMaterials} from './imasora-coast-visit-rewards.mjs?v=120mx';
import {validateCoastRig,coastRigTimber,coastRigAccess,nextCoastRig} from './imasora-coast-rig.mjs?v=120mx';
import {rigPart,nextFitting} from './imasora-coast-fitting.mjs?v=120js';
import {coastHarborTimber} from './imasora-coast-harbor.mjs?v=120ny';
import {validateCoastToys} from './imasora-coast-landmark-play.mjs?v=120il';
import{gardenHarvestEvent}from'./imasora-construction-garden-harvest.mjs?v=120ps';
import{validateCoastPlay}from'./imasora-coast-physics.mjs?v=120nz';
import{emptyCoastForage,applyCoastEvent,projectCoastForage as replayCoastForage,assertCoastAccess}from'./imasora-coast-forage.mjs?v=120ps';
import{assertBoardLiftWorld,assertBoardLiftContinuation}from'./imasora-construction-board-lift-guard.mjs?v=120pv';
import{assertBoardBayRetrofitWorld}from'./imasora-construction-board-bay-retrofit-guard.mjs?v=120pv';
import{assertBoardBaySupportChange}from'./imasora-construction-board-bay-guard.mjs?v=120pv';
import{assertRoomWalkWorld,assertAllRoomWalkingWorld}from'./imasora-construction-room-walk-guard.mjs?v=120pv';
import{assertRoomLayoutWorld,assertAllRoomLayoutsWorld}from'./imasora-construction-room-layout-guard.mjs?v=120pv';
import {assertEntranceDoorClear} from './imasora-construction-building-door-guard.mjs?v=120pv';
import {assertUpperCastWorld,assertUpperAction,assertHighWorkAccess} from './imasora-construction-high-casting.mjs?v=120pv';
import {transportGroundHeightAt,transportGroundHeightReader} from './imasora-construction-transport-site.mjs?v=120pv';
import {highMaterialCost,highWorldTimber,validateHighWorld,transitionHighWorld,assertHighFoundation} from './imasora-construction-high-world.mjs?v=120pv';
import {prepareTransportParking} from './imasora-construction-transport-parking.mjs?v=120pv';
import {serializedSaveSnapshot} from './imasora-save-wire.mjs';
import {sameConstructionRecordValue} from './imasora-construction-record-equality.mjs';
import {parseCapturedConstructionJson,capturedJsonInfo,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {assertWorkPlatformRecord,platformMatchesProject} from './imasora-construction-concrete/free-platform-record.mjs?v=120pv';
// Shared transaction rules. Live and preview ledgers have incompatible formats.
import {canonical} from './imasora-construction-state.js';
import {IMASORA_WORLD_SCHEMA_VERSION} from './imasora-world-map-schema.js?v=120mx';
import{transferReelGirder}from'./imasora-construction-girder-transfer.mjs?v=120pv';
import{assertBuildingKitWorld,transferBuildingKit,assertKitSupportChange}from'./imasora-construction-kit-transfer.mjs?v=120pv';
import {deliveryAccess} from './imasora-construction-delivery.js';
import {interplanetaryRoute} from './imasora-ufo-interplanetary-route.js';
import {constructionCourse,constructionMission,CONSTRUCTION_MISSIONS,advanceConstructionCourse,courseChapterStep,timedMissionComplete,validRainWorksPose,validRainWorksResult,constructionWorkshopJob,validPumpCheckpoints} from './imasora-construction-guide-data.mjs?v=121gv';
import {completeSummitMission,RAIN_WORKS_JOBS,RAIN_WORKS_KIT,RAIN_WORKS_WATER_TESTS,RAIN_WORKS_CUT_CELLS,advanceRainWorksExcavation,completeRainConstructionTrial,rainWorksCutOrder,rainWorksWater,rainWorksDumpCompleted,RAIN_WORKS_HAUL_STEP,RAIN_WORKS_FOUNDATION_STEP,RAIN_WORKS_MIXER_STEP} from './imasora-construction-guide-data.mjs?v=121ew';

// Story scenes record these checkpoints after their actions complete.
const RAIN_STORY_V1 = Object.freeze([
  'first-visit-return',
  'water-delivery-return',
  'cloud-rescue-complete',
  'amane-water-restored',
  'repair-trip-return',
  'earth-rain-restored',
  'credits-finished',
]);
const RAIN_SKY_STAGES = Object.freeze(['baseline', 'amane-visited', 'changed-wind', 'diagram-matched']);
const RAIN_AMANE_STAGES = Object.freeze([
  'outer-soil-cleared', 'archive-entry-open', 'records-compared',
  'parents-visited', 'shortage-seen', 'sky-landed', 'baltia-reported',
]);
const RAIN_DELIVERY_STAGES = Object.freeze([
  'water-loaded', 'water-landed', 'one-crate', 'crates-unloaded', 'water-delivered', 'source-matched', 'sky-returned',
]);
const RAIN_REPAIR_STAGES = Object.freeze([
  'landed','surveyed','upstream-dug','dug','carrying-upstream','upstream-fitted','carrying-downstream','fitted',
  'flowing','measured','reservoir-filled','supply-checked','parcel-received',
]);

function isRainStoryCleared(world) {
  const progress = world?.rainStoryV1;
  return Array.isArray(progress) && progress.length === RAIN_STORY_V1.length
    && RAIN_STORY_V1.every((milestone, index) => progress[index] === milestone);
}
import {initialWorldWater,WATER_YARDS,validateWorldWater,validateWaterContinuation,waterCheckpoint} from './imasora-construction-world-water.js?v=120ov';
import {initialWorldSoil,SOIL_YARDS,validateWorldSoil,validateSoilContinuation,soilCheckpoint,worldSoilTotals,worldSoilFloors,rainLoaderPlan} from './imasora-construction-world-soil.js?v=120pv';
import {initialWorldTimber,TIMBER_YARDS,validateWorldTimber,validateTimberContinuation,timberCheckpoint,worldTimberTotals} from './imasora-construction-world-timber.js?v=120pv';
import {EARTH_LIVE_SCOPE,createAuthorityExcavation,validateAuthorityExcavation,validateAuthorityExcavationContinuation,authorityExcavationWork,checkpointAuthorityExcavation} from './imasora-construction-earth-authority.js?v=120ov';
import {stepWorldExcavation} from './imasora-construction-world-excavation.js?v=120ov';
import './imasora-construction-pack-transfer.js?v=120ho';
const PACK_TRANSFER=globalThis.ImasoraConstructionPackTransfer;
import {createProfileProject,assertProfileProject,transitionProfileProject,availablePackConcreteCredits} from './imasora-construction-profile-project.js?v=120pv';
import {createWorldTransport,createWorldTransportWork,validateWorldTransport,commandWorldTransport} from './imasora-construction-transport-authority.mjs?v=120pv';
import {validateScoopDumpContinuation} from './imasora-construction-fragment-scoop.mjs?v=120pv';
import {assertWorldTransportWorkReceipt,snapshotWorldTransportWork} from './imasora-construction-transport-work-flow.mjs?v=120pv';
import {projectStarterToolkit} from './imasora-construction-toolkit.mjs?v=120ho';
import {assertTransportShovel,transportNeedsShovel} from './imasora-construction-transport-hand.mjs';
import {concreteParkingProblem} from './imasora-construction-concrete/free-parking.mjs?v=120ey';
import {vehiclePoseProblem} from './imasora-construction-concrete/free-vehicle-contact.mjs?v=120pv';
import {PARKING_ADAPTERS,prepareParkingMigration,validateParkingRecord} from './imasora-construction-parking-migration.mjs?v=120ov';
import{gardenCost,assertGardenMaterials,gardenWaterUsed,assertGardenWater,assertGardenEarthStock}from'./imasora-construction-garden.mjs?v=120ps';
import{assertOutdoorPaintBudget}from'./imasora-construction-outdoor-paint.mjs?v=120hh';
import{assertOutdoorSignsWorld,assertOutdoorSignAction}from'./imasora-construction-outdoor-sign-guard.mjs?v=120pv';
import{assertGardenWorld,assertGardenAction}from'./imasora-construction-garden-guard.mjs?v=120pv';
import {assertReelWorld,assertReelAction} from './imasora-construction-reel-guard.mjs?v=120pv';
import{assertLightsWorld,assertLightAction}from'./imasora-construction-lights-guard.mjs?v=120pv';
import{gardenEarthTransition}from'./imasora-construction-garden-earth.mjs?v=120pv';
import{assertConcreteVehicleMove}from'./imasora-construction-concrete-elevation.mjs?v=121e6';
import {assertNativeElevationWorld} from './imasora-construction-native-elevation.mjs?v=121if';
import{assertTankGardenAction}from'./imasora-construction-tank-garden-guard.mjs?v=120pv';
export function createWorldLedgerAPI({scope,kinds,verifiedPacketCacheBytes=0,immutablePackets=false}) {
// Cache only exact immutable packet strings that completed every check.
// Worker packets keep checked immutable values. Mutable caller objects are never trusted.
const checkedTransportSources=new WeakMap();
function hasCheckedTransport(record,earth,profileId){
 const proof=record&&checkedTransportSources.get(record);
 return !!proof&&proof.earth===earth&&proof.profileId===profileId;
}
kinds=Object.freeze([...kinds]);
// An immutable, fully checked packet can serve as the parent of a new cut.
// A cloned or newly supplied ledger still takes the complete validation path.
const verifiedLedgerSnapshots=new WeakSet();
const verifiedPackets=new Map(),packetCacheLimit=Math.max(0,Math.min(20*1024*1024,Number(verifiedPacketCacheBytes)||0));let packetCacheBytes=0;
function rememberPacket(raw,state=true){
 if(!packetCacheLimit||raw.length*2>packetCacheLimit)return;
 if(verifiedPackets.has(raw)){verifiedPackets.delete(raw);packetCacheBytes-=raw.length*2;}
 if(immutablePackets&&state&&typeof state==='object'&&Object.isFrozen(state))verifiedLedgerSnapshots.add(state);
 if(immutablePackets&&state?.world?.constructionTransport&&state.world.constructionExcavation){
  checkedTransportSources.set(state.world.constructionTransport,{earth:state.world.constructionExcavation,profileId:state.source.fingerprint});
 }
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
  validateSnorkel(world?.coastSnorkel);
  ok(object(world)&&world.version===3&&world.mapSchemaVersion===IMASORA_WORLD_SCHEMA_VERSION,'本体セーブの版が対応外です。元のデータは変更しません。');
  ok(world.builtByMap===undefined||object(world.builtByMap),'建築データが不正です。');
  ok(world.ufoResources===undefined||object(world.ufoResources),'資源データが不正です。');
  if(world.rainStoryV1!==undefined){
    const progress=world.rainStoryV1;
    ok(Array.isArray(progress)&&progress.length<=RAIN_STORY_V1.length
      &&RAIN_STORY_V1.slice(0,progress.length).every((milestone,index)=>progress[index]===milestone),'物語の進行記録が不正です。');
  }
  if(world.rainSkyV1!==undefined){
    const stage=RAIN_SKY_STAGES.indexOf(world.rainSkyV1);
    ok(stage>=0&&(stage<2||world.rainStoryV1?.includes('first-visit-return')),'雲の観測記録が不正です。');
  }
  if(world.rainAmaneV1!==undefined){
    const stage=RAIN_AMANE_STAGES.indexOf(world.rainAmaneV1);
    ok(stage>=0&&RAIN_SKY_STAGES.indexOf(world.rainSkyV1)>=1
      &&(stage<5||world.rainStoryV1?.includes('first-visit-return')),'アマネ星の訪問記録が不正です。');
  }
  if(world.rainDeliveryV1!==undefined){
    const stage=RAIN_DELIVERY_STAGES.indexOf(world.rainDeliveryV1);
    ok(stage>=0&&world.rainSkyV1==='diagram-matched'&&world.rainStoryV1?.includes('first-visit-return')&&
      (stage<6||world.rainStoryV1?.includes('water-delivery-return')),'水を運んだ記録が不正です。');
  }
  if(world.constructionCourseV1!==undefined){
    const course=world.constructionCourseV1;
    ok(object(course)&&Number.isInteger(course.index)&&course.index>=0&&course.index<=CONSTRUCTION_MISSIONS.length&&typeof course.started==='boolean'&&(!course.started||CONSTRUCTION_MISSIONS[course.index]?.kind==='boarding'),'重機ミッションの記録が不正です。');
    const mission=CONSTRUCTION_MISSIONS[course.index];
    ok(validPumpCheckpoints(course,world.rainWorksV1?.step),'ポンプ車の作業記録が不正です。');
    if(course.workshop!==undefined)ok(mission?.kind==='works'&&validRainWorksPose(mission.vehicle,course.workshop),'作業場の車両の記録が不正です。');
  }
  if(world.rainWorksV1!==undefined){
    const job=world.rainWorksV1;
    ok(world.rainStoryV1?.includes('cloud-rescue-complete')&&object(job)&&Number.isInteger(job.step)&&
      job.step>=0&&job.step<=RAIN_WORKS_JOBS.length,'水路の作業記録が不正です。');
    if(job.dumpArrival!==undefined)ok(job.dumpArrival===true,'採土場への到着記録が不正です。');
    if(job.quarryArrival!==undefined)ok(job.quarryArrival===true&&job.dumpArrival,'山頂の採土場への到着記録が不正です。');
    if(job.dumpAtStorage!==undefined)ok(job.dumpAtStorage===true&&job.excavatorTrial&&job.step===RAIN_WORKS_HAUL_STEP,'保管庫への運搬記録が不正です。');
    if(job.excavatorScoop!==undefined){
      keys(job.excavatorScoop,['id','cell']);
      checkId(job.excavatorScoop.id);
      ok(job.dumpArrival&&job.step<RAIN_WORKS_HAUL_STEP&&Number.isInteger(job.excavatorScoop.cell)&&
        job.excavatorScoop.cell>=0&&job.excavatorScoop.cell<RAIN_WORKS_CUT_CELLS.length,'採土ミッションの記録が不正です。');
    }
    if(job.excavatorTrial!==undefined){
      keys(job.excavatorTrial,['cell']);
      ok(job.step>=RAIN_WORKS_HAUL_STEP&&Number.isInteger(job.excavatorTrial.cell)&&
        job.excavatorTrial.cell>=0&&job.excavatorTrial.cell<RAIN_WORKS_CUT_CELLS.length,'ショベルカーのミッション記録が不正です。');
    }
    if(job.excavationOrder!==undefined){
      const cells=job.excavationOrder,expected=rainWorksCutOrder({step:job.step}).length;
      ok(Array.isArray(cells)&&(job.excavatorTrial?cells.length<=expected:cells.length===expected)&&new Set(cells).size===cells.length&&
        cells.every(index=>Number.isInteger(index)&&index>=0&&index<RAIN_WORKS_CUT_CELLS.length),'掘った場所の記録が不正です。');
    }
    if(job.cargo){
      ok(job.step===RAIN_WORKS_JOBS.length&&['ready','loaded'].includes(job.cargo.status)&&
        canonical(job.cargo.kit)===canonical(RAIN_WORKS_KIT)&&
        canonical(job.cargo.tests)===canonical(RAIN_WORKS_WATER_TESTS),'水路の積み荷の記録が不正です。');
    }
  }
  if(world.rainRepairV1!==undefined){
    const stage=RAIN_REPAIR_STAGES.indexOf(world.rainRepairV1);
    ok(stage>=0&&world.rainWorksV1?.cargo?.status==='loaded'&&
      (stage===RAIN_REPAIR_STAGES.length-1)===world.rainStoryV1?.includes('amane-water-restored'),'取水路の復旧記録が不正です。');
  }
  if(world.coastPhysics!==undefined)validateCoastPlay(world.coastPhysics);validateCoastRig(world.coastRig);validateCoastRewards(world.coastRewards);validateCoastExploration(world.coastExploration);validateCoastVisits(world.coastVisits);
  if(world.coastToys!==undefined)validateCoastToys(world.coastToys);
  for(const key of RESOURCE_KEYS){const v=world.ufoResources?.[key];ok(v===undefined||int(v),`${key}が不正です。数値を丸めたり残高を補充したりせず停止します。`);}
  // Reject NaN/Infinity and unserializable values before any structured clone/write.
  const seen=new Set(),stack=capturedJsonInfo(world)?[]:[world];while(stack.length){const v=stack.pop();if(v===null||typeof v==='string'||typeof v==='boolean')continue;if(typeof v==='number'){ok(Number.isFinite(v),'座標等に有限でない数があります。');continue;}ok(Array.isArray(v)||object(v),'保存できない値があります。');ok(!seen.has(v),'循環・共有参照を含む保存は使えません。');seen.add(v);for(const child of Object.values(v))stack.push(child);}
  const json=JSON.stringify(world);ok(json.length<=8000000,'本体セーブのサイズが大きすぎます。');
  return world;
}
function resources(world){return Object.fromEntries(RESOURCE_KEYS.map(k=>[k,world.ufoResources?.[k]??0]));}
function readWorldSource(raw){ok(typeof raw==='string'&&raw.length<=8000000,'この区画の保存が見つかりません。ほかの区画の記録は読み込みません。');const world=JSON.parse(raw);validateWorld(world);return world;}
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
function validateWorldPurchaseLedger(s){return validateLedger(s,null);}
function validateLedger(s,priorTransportWorld,checkedTransport=null){
  keys(s,['schemaVersion','scope','revision','worldWrites','source','world','materials','events','pending']);
  ok([1,2,3,4].includes(s.schemaVersion)&&s.scope===LINK_SCOPE,'接続保存の版・区分が不正です。');
  keys(s.source,['kind','fingerprint','world']);ok(kinds.includes(s.source.kind),'複製元の区分が不正です。');
  validateWorld(s.source.world);validateWorld(s.world);ok(fingerprint(s.source.world)===s.source.fingerprint,'複製元の記録が変わっています。');
  ok(s.source.world.constructionPackTrialLedger===undefined,'複製元の材料の受取記録は新しい保存へ持ち込めません。');
  if(s.world.constructionPackTrialLedger!==undefined)PACK_TRANSFER.validateTrialLedger(s.world.constructionPackTrialLedger,s.source.fingerprint);
  if(s.world.constructionProfileProject!==undefined)assertProfileProject(s.world.constructionProfileProject,s.world.constructionPackTrialLedger);
  if(s.world.constructionWorkPlatform!==undefined)assertWorkPlatformRecord(s.world.constructionWorkPlatform,s.world.constructionProfileProject);
  ok(s.source.world.constructionExcavation===undefined,'複製元から掘削地形の取得権を持ち込むことはできません。');
  ok(s.source.world.constructionTransport===undefined,'複製元から共有土の取得権を持ち込むことはできません。');
  keys(s.materials,MATERIAL_IDS);ok(Array.isArray(s.events)&&s.events.length<=LIMIT,'取引記録が不正または上限です。');
  ok(int(s.worldWrites)&&int(s.revision),'保存番号が不正です。');
  const totals=Object.fromEntries(MATERIAL_IDS.map(k=>[k,0])),received=Object.fromEntries(MATERIAL_IDS.map(k=>[k,0])),funds=resources(s.source.world),seen=new Set();let revisions=s.worldWrites;
  ok(s.source.world.coastRewards===undefined,'島の賞品は冒険の受取記録から再開してね。');
  const rewards=replayCoastRewards(s.events);if(s.world.coastRewards!==undefined)ok(canonical(s.world.coastRewards)===canonical(rewards),'島の賞品と受取記録が一致しません。');else ok(!s.events.some(e=>['coast-arrival','coast-supply','coast-pebble-find','reward-voyage'].includes(e.kind)),'冒険の賞品が欠けています。');
  ok(s.source.world.coastVisits===undefined,'島の冒険は受取記録から再開してね。');const visits=replayCoastVisits(s.events);if(s.world.coastVisits!==undefined)ok(canonical(s.world.coastVisits)===canonical(visits),'島の上陸回数とごほうびが一致しません。');else ok(!s.events.some(e=>e.kind==='coast-visit'),'島の冒険の記録が欠けています。');
  ok(s.source.world.coastRig?.version!==2,'新しい部品は、作成記録と一緒に読み込もう。');
  validateFruitReceipts(s.events,s.source.fingerprint);
  const forage=emptyCoastForage(),rigParts=[];let rigOwned=s.source.world.coastRig?.oars??0;
  for(const e of s.events){
    checkId(e.id);ok(!seen.has(e.id),'取引番号が重複しています。');seen.add(e.id);
    if(e.kind==='coast'){ok(LINK_SCOPE==='imasora-world-ledger-v1','海辺の素材はいつもの冒険で受け取ろう。');applyCoastEvent(forage,e,s.source.fingerprint);revisions++;
    }else if(e.kind==='coast-pebble-find'){
      ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの島で小石を探そう。');validatePebbleFind(e,s.source.fingerprint);revisions++;
    }else if(e.kind==='coast-fruit'){
      ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの島で木の実をひろおう。');revisions+=e.picked?2:1;
    }else if(e.kind==='coast-visit'){
      ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険でごほうびを受け取ろう。');applyCoastVisitMaterials(forage,e);revisions++;
    }else if(e.kind==='coast-arrival'||e.kind==='coast-supply'){
      ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険で賞品を受け取ろう。');revisions++;
    }else if(e.kind==='coast-rig'){
      keys(e,['kind','id','level']);ok(Number.isInteger(e.level)&&e.level===rigOwned+1&&e.level<=3,'オールの作成順が違います。');rigOwned=e.level;revisions++;
    }else if(e.kind==='coast-part'){
      keys(e,['kind','id','part']);rigPart(e.part);ok(LINK_SCOPE==='imasora-world-ledger-v1'&&e.id==='coast-part-'+e.part&&!rigParts.includes(e.part),'部品の作成記録が重なっているよ。');rigParts.push(e.part);revisions++;
    }else if(e.kind==='reward'||e.kind==='reward-voyage'){
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
  ok((s.world.coastRig?.oars??0)===rigOwned,'オールと作成記録が一致しません。');
  ok(canonical(s.world.coastRig?.owned??[])===canonical(rigParts.sort()),'持っている部品と作成記録が一致しません。');
  const nativePackets=(s.world.constructionPackTrialLedger?.transfers??[]).filter(p=>p.version===2||p.version===3);
  ok(canonical(nativePackets)===canonical(forage.transfers),'海辺で開けたセットと建材が一致しません。');
  for(const key of MATERIAL_IDS)received[key]+=forage.materials[key];
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
  assertGardenWater(s.world,received['mars-water']);
  if(s.world.constructionWater!==undefined)validateWorldWater(s.world.constructionWater,received['mars-water']);
  if(s.world.constructionSoil!==undefined)validateWorldSoil(s.world.constructionSoil,received['mars-soil']);
  if(s.world.constructionTimber!==undefined)validateWorldTimber(s.world.constructionTimber,received['mars-timber']);
  if(s.schemaVersion===4){
    ok(LINK_SCOPE==='imasora-world-ledger-v1'&&Object.hasOwn(s.world,'constructionHighBuild'),'高い建物の保存が欠けています。');
    if(s.world.constructionHighBuild!==null)validateHighWorld(s.world.constructionHighBuild);
  }else ok(s.world.constructionHighBuild===undefined,'高い建物は新版の保存で記録してください。');
  ok((s.world.constructionTimber?worldTimberTotals(s.world.constructionTimber).inUse:0)+highWorldTimber(s.world.constructionHighBuild)+coastHarborTimber(s.world.coastPhysics)+coastRigTimber(s.world.coastRig)<=received['mars-timber'],'木材を同時に使いすぎています。元の材料を残して止めました。');
  ok((s.world.constructionSoil?worldSoilTotals(s.world.constructionSoil).inUse:0)+gardenCost(s.world.constructionHighBuild).soil<=received['mars-soil'],'土が足りないよ。花壇とローダーの土をたしかめよう。');assertGardenMaterials(s.world);assertGardenEarthStock(s.world);
  assertBoardLiftWorld(s.world);assertBuildingKitWorld(s.world);
  if(s.world.constructionExcavation!==undefined)validateAuthorityExcavation(s.world.constructionExcavation);
  // Live excavation makes the complete ledger unreadable to pre-v496 clients,
  // including clients that do not recognize an excavation field at all.
  if(s.schemaVersion>=2)ok(LINK_SCOPE==='imasora-world-ledger-v1'&&s.world.constructionExcavation?.version===2&&s.world.constructionExcavation?.scope===EARTH_LIVE_SCOPE,'通常の掘削取得記録が欠けた新版保存は使用できません。');
  else ok(s.world.constructionExcavation?.scope!==EARTH_LIVE_SCOPE,'通常の掘削地形は新版保存で一度だけ取得してください。');
  if(s.schemaVersion>=3){ok(s.world.constructionTransport!==undefined,'共有土の記録が欠けた保存は使用できません。');if((!checkedTransport||s.world.constructionTransport!==checkedTransport)&&!hasCheckedTransport(s.world.constructionTransport,s.world.constructionExcavation,s.source.fingerprint))validateWorldTransport(s.world.constructionTransport,s.world.constructionExcavation,s.source.fingerprint);}
  else ok(s.world.constructionTransport===undefined,'共有土は対応した新版保存へ一度だけ切り替えてください。');
  assertAllRoomWalkingWorld(s.world);assertAllRoomLayoutsWorld(s.world);assertHighWorkAccess(s.world);{const earthRead=transportGroundHeightReader(s.world.constructionTransport);assertUpperCastWorld(s.world,{heightAt:(x,z)=>earthRead(x,z)??0});}
  if(s.world.constructionHighBuild)assertHighFoundation(s.world.constructionHighBuild,s.world.constructionTransport);assertOutdoorSignsWorld(s.world);assertOutdoorPaintBudget(s.world);assertGardenWorld(s.world);assertLightsWorld(s.world);assertReelWorld(s.world);
  assertNativeElevationWorld(s.world,priorTransportWorld,{match:priorTransportWorld!==null});
  if(transportNeedsShovel(s.world.constructionTransport))assertTransportShovel(projectStarterToolkit(s.world.constructionPackTrialLedger,s.source.fingerprint),s.source.fingerprint);
  return true;
}
function projectCoastForage(s){return s?replayCoastForage(s.events,s.source.fingerprint):null;}
function applyCoastForage(s,action,draft,expectedRevision,id){
 validateWorldPurchaseLedger(s);checkId(id);ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険で海辺へ行こう。');
 const event={kind:'coast',id,action:clone(action)},prior=existing(s,id);
 if(prior){ok(canonical(prior)===canonical(event),'同じ受取番号の中身が違うよ。');return s;}
 ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');ok(s.events.length+(s.pending?1:0)<LIMIT,'海辺の記録がいっぱいだよ。いまの素材は残っているよ。');assertCoastAccess(draft,action);
 const forage=applyCoastEvent(projectCoastForage(s),event,s.source.fingerprint),n=buildLinkedWorldDraft(s,draft);n.events.push(event);n.revision++;
 if(action.type==='open'||action.type==='craft'&&action.recipe!=='dye')n.world.constructionPackTrialLedger=PACK_TRANSFER.receiveTransfer(n.world.constructionPackTrialLedger,forage.transfers.at(-1),n.source.fingerprint);
 validateWorldPurchaseLedger(n);return n;
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
  if(old){ok(['reward','reward-voyage'].includes(old.kind)&&old.resource===resource&&old.amount===amount,'同じ取引番号の内容が違います。');return s;}
  ok(s.events.length+(s.pending?1:0)<LIMIT,'取引記録の上限です。');const n=clone(s);
  n.world.ufoResources[resource]+=amount;n.events.push({kind:resource==='starMaterials'?'reward-voyage':'reward',id,resource,amount});if(resource==='starMaterials')n.world.coastRewards=replayCoastRewards(n.events);n.revision++;validateWorldPurchaseLedger(n);return n;
}
function saveLinkedWorldDraft(s,draft,{craft=false}={}){
  validateWorldPurchaseLedger(s);const n=buildLinkedWorldDraft(s,draft,craft);validateWorldPurchaseLedger(n);return n;
}
function recordRainStoryMilestone(s,milestone,draft=s.world){
  const progress=s.world.rainStoryV1??[];
  if(progress.includes(milestone))return s;
  ok(milestone&&milestone===RAIN_STORY_V1[progress.length],'前の物語を終えてから進めてね。');
  if(milestone==='amane-water-restored'&&s.world.rainWorksV1)throw Error('水路を直して、両親から包みを預かってね。');
  if(milestone==='repair-trip-return'&&s.world.rainRepairV1)
    ok(s.world.rainRepairV1==='parcel-received'&&draft.map==='sky','包みを持って空駅へ戻ろう。');
  const next=saveLinkedWorldDraft(s,draft);
  next.world.rainStoryV1=[...progress,milestone];
  validateWorldPurchaseLedger(next);
  return next;
}

function recordRainRepairStage(s,stage,draft){
  const index=RAIN_REPAIR_STAGES.indexOf(stage),current=RAIN_REPAIR_STAGES.indexOf(s.world.rainRepairV1);
  ok(index>=0,'取水路の復旧記録が不正です。');
  if(index<=current)return s;
  ok(draft.map==='mars'&&index===current+1&&s.world.rainStoryV1?.at(-1)==='cloud-rescue-complete'&&
    s.world.rainWorksV1?.cargo?.status==='loaded','接続部をアマネ星に運び、現地で作業を順に進めてね。');
  const next=saveLinkedWorldDraft(s,draft);
  next.world.rainRepairV1=stage;
  if(stage==='parcel-received')next.world.rainStoryV1=[...s.world.rainStoryV1,'amane-water-restored'];
  validateWorldPurchaseLedger(next);
  return next;
}
function recordRainWorks(s,action,draft=s.world){
  const current=s.world.rainWorksV1;
  if(action.type==='resume-course'){
    ok(draft.map==='construction','工事現場で再開してください。');
    if(s.world.constructionCourseV1)return s;
    const course=constructionCourse(s.world);
    ok(course.index>0,'乗車ミッションを開始してください。');
    const n=saveLinkedWorldDraft(s,draft);n.world.constructionCourseV1=course;
    validateWorldPurchaseLedger(n);return n;
  }
  if(['activate-boarding','finish-boarding','finish-works'].includes(action.type)){
    const mission=constructionMission(s.world),course=constructionCourse(s.world);
    ok(draft.map==='construction'&&mission?.id===action.id,'現在の工事現場ミッションを確認してください。');
    const n=saveLinkedWorldDraft(s,draft);
    if(action.type==='activate-boarding'){
      ok(mission.kind==='boarding','乗車ミッションを確認してください。');
      n.world.constructionCourseV1={index:course.index,started:true};
    }else{
      const boarding=action.type==='finish-boarding';
      const job=constructionWorkshopJob(mission);
      ok(boarding?action.vehicle===mission.vehicle:timedMissionComplete(mission,action.elapsedMs)&&job?.id===action.operation&&validRainWorksResult(job,action.result),'作業の完了を確認できません。');
      if(job?.id==='receive'||job?.id==='retract')ok(current?.step===mission.step&&!current.cargo,'ポンプ車の前の工程を確認してください。');
      const next=advanceConstructionCourse(s.world,action.id,boarding?'boarding':'works');
      const nextMission=CONSTRUCTION_MISSIONS[next.index];
      if(!boarding&&nextMission?.kind==='works'&&nextMission.vehicle===mission.vehicle)next.workshop=clone(action.result.pose);
      n.world.constructionCourseV1=next;
      if(!boarding&&current&&!current.cargo)n.world.rainWorksV1={...current,step:courseChapterStep(next)};
    }
    validateWorldPurchaseLedger(n);return n;
  }
  const map=action.type==='accept'||action.type==='load'?'sky':'construction';
  ok(draft.map===map&&s.world.rainStoryV1?.includes('cloud-rescue-complete'),'先に空駅で水路の依頼を確かめよう。');
  let next;
  if(action.type==='accept'){
    if(current)return s;
    ok(s.world.rainStoryV1.at(-1)==='cloud-rescue-complete','この依頼は終了しています。');
    next={step:courseChapterStep(constructionCourse(s.world))};
  }else if(action.type==='scoop-marked-soil'||action.type==='load-marked-soil'){
    const job=RAIN_WORKS_JOBS[action.step];
    ok(current&&job?.vehicle==='excavator','ショベルカーの作業を確認しよう。');
    if(current.step>action.step)return s;
    ok(current.step===action.step,'最新の工事の進み具合を確認しよう。');
    next=advanceRainWorksExcavation(current,action);
  }else if(action.type==='work'){
    ok(!s.world.constructionCourseV1&&!current?.dumpArrival&&!current?.excavatorTrial,'現場のタイムアタックで次の工程へ進もう。');
    const job=RAIN_WORKS_JOBS[action.step];
    ok(job&&current,'現場で次の作業を確かめよう。');
    if(current.step>action.step)return s;
    ok(current.step===action.step&&action.operation===job.id,'現場の案内に沿って順番に作業しよう。');
    if(job.vehicle==='water'&&job.id==='pour'){
      const water=rainWorksWater(job.batch,'pour',1,2);
      ok(water.catchTank===RAIN_WORKS_WATER_TESTS[job.batch]&&water.spill===0,'受け槽に水が届いていません。');
    }
    next={...current,step:current.step+1};
    if(job.vehicle==='excavator'&&job.id==='scoop'&&current.excavationOrder){
      const remaining=RAIN_WORKS_CUT_CELLS.findIndex((_,index)=>!current.excavationOrder.includes(index));
      next.excavationOrder=[...current.excavationOrder,remaining];
    }
  }else if(action.type==='handover'){
    if(current?.cargo)return s;
    ok(current?.step===RAIN_WORKS_JOBS.length&&(!s.world.constructionCourseV1||!constructionMission(s.world)),'通水と回収を済ませてから部材を渡そう。');
    next={...current,cargo:{status:'ready',kit:clone(RAIN_WORKS_KIT),tests:[...RAIN_WORKS_WATER_TESTS]}};
  }else{
    ok(action.type==='load'&&current?.cargo,'工事現場で部材を受け渡してから積み込もう。');
    if(current.cargo.status==='loaded')return s;
    next={...current,cargo:{...current.cargo,status:'loaded'}};
  }
  const n=saveLinkedWorldDraft(s,draft);n.world.rainWorksV1=next;
  validateWorldPurchaseLedger(n);return n;
}
function recordRainAmaneStage(s,stage,draft){
  const current=RAIN_AMANE_STAGES.indexOf(s.world.rainAmaneV1);
  const index=RAIN_AMANE_STAGES.indexOf(stage);
  ok(index>=0,'アマネ星の訪問記録が不正です。');
  if(index<=current)return s;
  ok(s.world.rainSkyV1==='amane-visited'&&index===current+1
    &&draft.map===(index<5?'mars':'sky'),'現地で手掛かりを順に調べてね。');
  const next=stage==='sky-landed'
    ? recordRainStoryMilestone(s,'first-visit-return',draft)
    : saveLinkedWorldDraft(s,draft);
  // Older visits may already have recorded the return. Still save today's arrival and its position.
  const saved=next===s?saveLinkedWorldDraft(s,draft):next;
  saved.world.rainAmaneV1=stage;
  validateWorldPurchaseLedger(saved);
  return saved;
}
function recordRainDeliveryStage(s,stage,draft){
  const index=RAIN_DELIVERY_STAGES.indexOf(stage);
  const current=RAIN_DELIVERY_STAGES.indexOf(s.world.rainDeliveryV1);
  ok(index>=0,'水を運んだ記録が不正です。');
  if(index<=current)return s;
  const map=index===0||stage==='sky-returned'?'sky':'mars';
  ok(index===current+1&&draft.map===map&&s.world.rainSkyV1==='diagram-matched'&&
    s.world.rainStoryV1?.at(-1)==='first-visit-return','水運びの手順を現地で順に進めてね。');
  const next=stage==='sky-returned'
    ? recordRainStoryMilestone(s,'water-delivery-return',draft)
    : saveLinkedWorldDraft(s,draft);
  next.world.rainDeliveryV1=stage;
  validateWorldPurchaseLedger(next);
  return next;
}
function recordRainSkyStage(s,stage,draft){
  const current=RAIN_SKY_STAGES.indexOf(s.world.rainSkyV1);
  const nextIndex=RAIN_SKY_STAGES.indexOf(stage);
  ok(nextIndex>=0,'雲の観測記録が不正です。');
  if(nextIndex<=current)return s;
  ok(draft.map===(stage==='amane-visited'?'mars':'sky'),'現地で調べてから進めてね。');
  // Returned saves from earlier versions can still record the missing baseline.
  const returned=s.world.rainAmaneV1==='baltia-reported'
    || (s.world.rainStoryV1?.length??0)>1;
  // One completed lookout scene both reveals the reversal and matches the cave mark.
  const canContinue=nextIndex===current+1||(returned&&((stage==='changed-wind'&&current===0)||(stage==='diagram-matched'&&current>=0)));
  ok(canContinue&&(nextIndex<2||returned),'先にアマネ星から戻り、バルティアに報告してね。');
  if(stage==='diagram-matched')ok(s.world.coastSkyDiagramRead===true,'先に洞窟で空の図を調べてね。');
  const next=saveLinkedWorldDraft(s,draft);
  next.world.rainSkyV1=stage;
  validateWorldPurchaseLedger(next);
  return next;
}
function savePostStoryUfoArrival(s,origin,draft){
  ok(isRainStoryCleared(s.world),'本編をクリアすると、UFOの操縦を省略できます。');
  ok((origin==='sky'||origin==='mars')&&draft.map===interplanetaryRoute(origin).destinationMap,'UFOの行き先を確認してね。');
  return saveLinkedWorldDraft(s,draft);
}
// Private assembly only. Callers validate the original ledger first and the
// finished ledger afterwards; no intermediate version is published or saved.
function buildLinkedWorldDraft(s,draft,craft=false,transportRecord=undefined){
  validateWorld(draft);
  // Physical saves replace this field with the checked flow snapshot below.
  // Do not first duplicate the old and scene copies only to discard both.
  // Dynamic/nonordinary top-level properties retain the original clone path.
  const plainData=v=>object(v)&&Reflect.ownKeys(v).length===Object.keys(v).length&&Object.values(Object.getOwnPropertyDescriptors(v)).every(d=>Object.hasOwn(d,'value')&&d.enumerable);
  const sourceTransport=s.world.constructionTransport;
  // Worker-owned, certified earth is immutable. Keep exactly that subtree while
  // cloning its editable shell; ordinary mutable domain calls retain deep copies.
  const stableEarth=immutablePackets&&isCapturedConstructionJson(sourceTransport?.work?.frame?.soil)&&plainData(sourceTransport)&&plainData(sourceTransport.work)&&plainData(sourceTransport.work.frame);
  const lean=(transportRecord!==undefined||stableEarth)&&plainData(s)&&plainData(s.world)&&plainData(draft);
  const sceneWithTransportPlaceholder=v=>Object.hasOwn(v,'constructionTransport')?{...v,constructionTransport:null}:{...v};
  const n=clone(lean?{...s,world:sceneWithTransportPlaceholder(s.world)}:s);
  // The wallet/resource authority is never taken from a stale scene snapshot.
  // Other scene data is committed under the store's generation check.
  n.world={...n.world,...clone(lean?sceneWithTransportPlaceholder(draft):draft)};n.world.ufoResources=clone(s.world.ufoResources);
  if(s.world.rainStoryV1!==undefined)n.world.rainStoryV1=clone(s.world.rainStoryV1);
  else delete n.world.rainStoryV1;
  if(s.world.rainSkyV1!==undefined)n.world.rainSkyV1=s.world.rainSkyV1;
  else delete n.world.rainSkyV1;
  if(s.world.rainAmaneV1!==undefined)n.world.rainAmaneV1=s.world.rainAmaneV1;
  else delete n.world.rainAmaneV1;
  if(s.world.rainDeliveryV1!==undefined)n.world.rainDeliveryV1=s.world.rainDeliveryV1;
  else delete n.world.rainDeliveryV1;
  if(s.world.constructionCourseV1)n.world.constructionCourseV1=clone(s.world.constructionCourseV1);
  else delete n.world.constructionCourseV1;
  if(s.world.rainWorksV1!==undefined)n.world.rainWorksV1=clone(s.world.rainWorksV1);
  else delete n.world.rainWorksV1;
  if(s.world.rainRepairV1!==undefined)n.world.rainRepairV1=s.world.rainRepairV1;
  else delete n.world.rainRepairV1;
  if(draft.coastSnorkel!==undefined)assertSnorkelContinuation(s.world.coastSnorkel,draft.coastSnorkel);
  if(s.world.coastToys&&draft.coastToys){
    ok(draft.coastToys.edit>=s.world.coastToys.edit,'古い海辺の仕掛けで上書きせず停止しました。');
    ok(draft.coastToys.tick>=s.world.coastToys.tick||draft.coastToys.edit>s.world.coastToys.edit,'海辺の動きを古い保存へ戻さず停止しました。');
  }
  if(s.world.coastPhysics&&draft.coastPhysics){
    ok(s.world.coastPhysics.cargoRetired!==1||draft.coastPhysics.cargoRetired===1,'海辺の新しい画面で開きなおしてください。荷物を戻さず、記録を残して止めました。');
    ok(s.world.coastPhysics.geography!==2||draft.coastPhysics.geography===2,'新しい海図を開きなおしてください。前の記録は残しています。');
    ok(draft.coastPhysics.edit>=s.world.coastPhysics.edit,'古い海辺の道具で上書きせず停止しました。');
    ok(draft.coastPhysics.tick>=s.world.coastPhysics.tick||draft.coastPhysics.edit>s.world.coastPhysics.edit,'海辺の動きを古い保存へ戻さず停止しました。');
    const oldNav=s.world.coastPhysics.navigation,newNav=draft.coastPhysics.navigation;
    if(oldNav)ok(newNav&&newNav.clock>=oldNav.clock,'航路の記録を消さずに停止しました。');
    if(draft.coastPhysics.edit===s.world.coastPhysics.edit)ok(JSON.stringify(oldNav?{...oldNav,clock:newNav?.clock}:oldNav)===JSON.stringify(newNav),'古い航路で上書きせず停止しました。');
    const oldSailing=s.world.coastPhysics.sailing,newSailing=draft.coastPhysics.sailing;
    if(draft.coastPhysics.edit===s.world.coastPhysics.edit&&oldSailing)ok(newSailing&&newSailing.board===oldSailing.board&&newSailing.phase===oldSailing.phase,'古い航海で上書きせず停止しました。');
    const book=s.world.coastPhysics.boatBook,next=draft.coastPhysics.boatBook;
    if(book)ok(next&&book.pages.every((page,i)=>!page||next.pages[i]),'船の設計帳を消さずに停止しました。');
    if(draft.coastPhysics.edit===s.world.coastPhysics.edit)ok(JSON.stringify(book)===JSON.stringify(next),'古い船の設計帳で上書きせず停止しました。');
    if(draft.coastPhysics.edit===s.world.coastPhysics.edit)ok(JSON.stringify(s.world.coastPhysics.harbor)===JSON.stringify(draft.coastPhysics.harbor),'古い港の設備で上書きせず停止しました。');
    if(draft.coastPhysics.edit===s.world.coastPhysics.edit)ok(JSON.stringify(s.world.coastPhysics.islandBoard)===JSON.stringify(draft.coastPhysics.islandBoard),'島の板の記録を消さずに停止しました。');
    if(draft.coastPhysics.edit===s.world.coastPhysics.edit)ok(JSON.stringify(s.world.coastPhysics.salvage)===JSON.stringify(draft.coastPhysics.salvage),'海で見つけた部品の記録を消さずに停止しました。');
  }
  if(s.world.coastRewards!==undefined)n.world.coastRewards=clone(s.world.coastRewards);else delete n.world.coastRewards;
  if(s.world.coastVisits!==undefined)n.world.coastVisits=clone(s.world.coastVisits);else delete n.world.coastVisits;
  if(s.world.coastRig!==undefined)n.world.coastRig=clone(s.world.coastRig);else delete n.world.coastRig;
  if(s.world.coastExploration!==undefined)n.world.coastExploration=clone(s.world.coastExploration);else delete n.world.coastExploration;
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
  // Reuse an unchanged transport and its exact, already checked source only
  // inside the immutable packet workflow. New earth or mutable saves still
  // take the complete validation path.
  const keepCheckedTransport=immutablePackets&&transportRecord===sourceTransport&&hasCheckedTransport(sourceTransport,s.world.constructionExcavation,s.source.fingerprint);
  if(s.world.constructionExcavation!==undefined)n.world.constructionExcavation=keepCheckedTransport?s.world.constructionExcavation:clone(s.world.constructionExcavation);
  else delete n.world.constructionExcavation;
  if(keepCheckedTransport)n.world.constructionTransport=sourceTransport;
  else if(transportRecord!==undefined){
    const soil=transportRecord?.work?.frame?.soil;
    if(isCapturedConstructionJson(soil)){
      const work=transportRecord.work,scoop=work.scoop,plan=scoop?.plan;
      // The worker already audited this cut and froze its exact path. A
      // second copy would discard the plan's certificate and replay it again.
      const keepPlan=immutablePackets&&plan&&Object.isFrozen(plan);
      const shell=clone({...transportRecord,work:{...work,scoop:keepPlan?{...scoop,plan:null}:scoop,frame:{...work.frame,soil:null}}});
      shell.work.frame.soil=soil;
      if(keepPlan)shell.work.scoop.plan=plan;
      n.world.constructionTransport=shell;
    }
    else n.world.constructionTransport=snapshotWorldTransportWork(transportRecord);
  }
  else if(s.world.constructionTransport!==undefined){
    if(lean&&stableEarth){const t=sourceTransport,soil=t.work.frame.soil,shell=clone({...t,work:{...t.work,frame:{...t.work.frame,soil:null}}});shell.work.frame.soil=soil;n.world.constructionTransport=shell;}
    else n.world.constructionTransport=clone(s.world.constructionTransport);
  }
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
function applyCoastRig(s,action,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');coastRigAccess(draft,action);
 if(action?.type==='part'||action?.type==='fit'){
  ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険で部品を選ぼう。');
  const rig=nextFitting(s.world.coastRig,action,s.world.coastRewards?.nauticalParts??0),n=saveLinkedWorldDraft(s,draft);n.world.coastRig=rig;
  if(action.type==='part'){ok(n.events.length+(n.pending?1:0)<LIMIT,'作成記録がいっぱいだよ。');n.events.push({kind:'coast-part',id:'coast-part-'+action.part,part:action.part});n.revision++;n.world.coastRewards=replayCoastRewards(n.events);}
  validateWorldPurchaseLedger(n);return n;
 }
 const rig=nextCoastRig(s.world.coastRig,action,action.level===3?(s.world.coastRewards?.nauticalParts??0):projectConstructionStock(s).stored['mars-timber']),n=saveLinkedWorldDraft(s,draft);n.world.coastRig=rig;if(action.type==='buy'){ok(n.events.length+(n.pending?1:0)<LIMIT,'作成記録がいっぱいです。');n.events.push({kind:'coast-rig',id:'coast-rig-oars-'+rig.oars,level:rig.oars});if(rig.oars===3)n.world.coastRewards=replayCoastRewards(n.events);n.revision++;}validateWorldPurchaseLedger(n);return n;
}
function recordCoastExploration(s,value,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険で記録しよう。');
 keys(value,Object.hasOwn(value??{},'splitsMs')?['milliseconds','finish','splitsMs']:['milliseconds','finish']);ok(caveFinish(value.finish),'洞窟の奥まで渡ってから記録しよう。');
 if(Object.hasOwn(value,'splitsMs'))ok(Array.isArray(value.splitsMs),'浮き石の記録をたしかめよう。');
 const record=nextCaveRecord(s.world.coastExploration,value.milliseconds,value.splitsMs);if(record===s.world.coastExploration)return s;
 ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');
 const n=buildLinkedWorldDraft(s,draft);n.world.coastExploration=record;validateWorldPurchaseLedger(n);return n;
}
function applyCoastArrival(s,island,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険で島へ行こう。');let contact;
 if(typeof island!=='string'){keys(island,['island','contact']);contact=island.contact;island=island.island;}
 ok(typeof island==='string','島の記録をたしかめよう。');const id='coast-arrival-'+island,prior=existing(s,id);if(prior){ok(prior.kind==='coast-arrival'&&prior.island===island,'島の記録が違うよ。');return s;}
 ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');ok(islandAtLanding(draft,contact)?.id===island,'島の砂浜に足を着けてから受け取ろう。');ok(s.events.length+(s.pending?1:0)<LIMIT,'冒険の記録がいっぱいだよ。');const n=buildLinkedWorldDraft(s,draft);n.events.push({kind:'coast-arrival',id,island});n.revision++;n.world.coastRewards=replayCoastRewards(n.events);validateWorldPurchaseLedger(n);return n;
}
function receiveSailingAwards(s,awards,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1'&&Array.isArray(awards)&&awards.length<=10000,'冒険の賞品をたしかめよう。');const unseen=[];for(const award of awards){validateSailingAward(award);const e={kind:'coast-supply',id:sailingReceiptId(award),award},prior=existing(s,e.id);if(prior)ok(canonical(prior)===canonical(e),'同じ賞品の中身が違うよ。');else if(!unseen.some(v=>v.id===e.id))unseen.push(e);}
 if(!unseen.length)return s;ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');ok(s.events.length+unseen.length+(s.pending?1:0)<=LIMIT,'冒険の記録がいっぱいだよ。');const n=buildLinkedWorldDraft(s,draft);n.events.push(...clone(unseen));n.revision+=unseen.length;n.world.coastRewards=replayCoastRewards(n.events);validateWorldPurchaseLedger(n);return n;
}
function applyCoastVisit(s,value,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの冒険で島へ行こう。');keys(value,['island','count','contact']);const {island,count,contact}=value,id='coast-visit-'+island+'-'+count,prior=existing(s,id);
 if(prior){ok(prior.kind==='coast-visit'&&prior.island===island&&prior.count===count,'島のごほうびの記録が違うよ。');return s;}
 ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');ok(islandAtLanding(draft,contact)?.id===island,'島の砂浜に足を着けてから受け取ろう。');const offer=coastVisitOffer(s.world,island,draft.position,draft.coastPhysics?.navigation);ok(offer&&offer.count===count,'沖へ冒険して、もう一度島へ上陸しよう。');
 const first=!existing(s,'coast-arrival-'+island);ok(s.events.length+(s.pending?1:0)+(first?2:1)<=LIMIT,'冒険の記録がいっぱいだよ。');const n=buildLinkedWorldDraft(s,draft);
 if(first){n.events.push({kind:'coast-arrival',id:'coast-arrival-'+island,island});n.revision++;}
 n.events.push({kind:'coast-visit',id,island,count,clock:draft.coastPhysics?.navigation?.clock??0,x:draft.position.x,z:draft.position.z});n.revision++;n.world.coastRewards=replayCoastRewards(n.events);n.world.coastVisits=replayCoastVisits(n.events);validateWorldPurchaseLedger(n);return n;
}
function applyCoastPebbleFind(s,action,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの島で小石を探そう。');keys(action,['stone','cycle']);const event=pebbleFindOffer(s.source.fingerprint,action.stone,action.cycle);ok(event,'この石の下にはパーツがないよ。');const prior=existing(s,event.id);if(prior){ok(canonical(prior)===canonical(event),'見つけたパーツの記録が違うよ。');return s;}ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');assertPebbleFindAccess(draft,action.stone);const latest=s.events.filter(e=>e.kind==='coast-pebble-find'&&e.stone===action.stone).at(-1);ok(!latest||action.cycle>latest.cycle,'この石のパーツはもう受け取ったよ。');ok(s.events.length+(s.pending?1:0)<LIMIT,'冒険の記録がいっぱいだよ。');const n=buildLinkedWorldDraft(s,draft);n.events.push(event);n.revision++;n.world.coastRewards=replayCoastRewards(n.events);validateWorldPurchaseLedger(n);return n;
}
function applyCoastFruit(s,action,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(LINK_SCOPE==='imasora-world-ledger-v1','いつもの島で木を揺らそう。');
 if(action?.type==='shake'){
  keys(action,['type','tree','cycle']);const tree=coastFruitTrees().get(action.tree);ok(tree&&int(action.cycle,1e9),'木をたしかめよう。');const id=FRUITS.receiptId(tree.id,action.cycle),prior=existing(s,id);if(prior){ok(prior.kind==='coast-fruit','木の記録が違います。');return s;}
  ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');assertFruitAccess(draft,tree);ok(fruitLanding(tree),'実の落ちる場所がないよ。');const previous=fruitState(s.events).get(tree.id);ok(!previous||(action.cycle>previous.cycle&&(!previous.fruit||previous.picked)),'落ちた実を先にひろおう。また実るまで少し待ってね。');ok(s.events.length+(s.pending?1:0)<LIMIT,'冒険の記録がいっぱいだよ。');
  const n=buildLinkedWorldDraft(s,draft);n.events.push({kind:'coast-fruit',id,tree:tree.id,cycle:action.cycle,rule:3,fruit:FRUITS.harvest(s.source.fingerprint,tree.id,action.cycle),picked:false});n.revision++;validateWorldPurchaseLedger(n);return n;
 }
 keys(action,['type','id']);ok(action.type==='pick','木の実の操作をたしかめよう。');const prior=existing(s,action.id);ok(prior?.kind==='coast-fruit'&&prior.fruit,'落ちた実をたしかめよう。');if(prior.picked)return s;
 ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度ためそう。');const tree=coastFruitTrees().get(prior.tree),landing=fruitLanding(tree);assertFruitAccess(draft,tree,landing);ok(Math.hypot(draft.position.x-landing.x,draft.position.z-landing.z)<=28,'落ちた木の実に近づこう。');
 const n=buildLinkedWorldDraft(s,draft);n.events[n.events.findIndex(e=>e.id===prior.id)]={...prior,picked:true};n.revision++;validateWorldPurchaseLedger(n);return n;
}
function projectLinkedShop(s){
  if(!s)return null;return{balance:s.world.ufoResources.spaceCoins,materials:clone(s.materials),pending:s.pending?clone(s.pending):null,orders:s.events.filter(e=>e.kind==='order').map(clone)};
}
function projectConstructionStock(s){
  if(!s)return null;
  const stored=Object.fromEntries(MATERIAL_IDS.map(k=>[k,0]));
  const receipts=s.events.filter(e=>e.kind==='delivery');
  for(const e of receipts)stored[e.offerId]+=e.amount;
  const unreceived=Object.fromEntries(MATERIAL_IDS.map(k=>[k,s.materials[k]-stored[k]])),coast=replayCoastForage(s.events,s.source.fingerprint);
  for(const key of MATERIAL_IDS)stored[key]+=coast.materials[key];receipts.push(...coast.receipts);
  const inUse=s.world.constructionWater?.allocated*250||0;stored['mars-water']-=inUse+gardenWaterUsed(s.world.constructionHighBuild)+reelWaterUsed(s.world.constructionHighBuild);
  const soilUse=(s.world.constructionSoil?worldSoilTotals(s.world.constructionSoil).inUse:0)+gardenCost(s.world.constructionHighBuild).soil;stored['mars-soil']-=soilUse;
  const timberUse=(s.world.constructionTimber?worldTimberTotals(s.world.constructionTimber).inUse:0)+highWorldTimber(s.world.constructionHighBuild)+coastHarborTimber(s.world.coastPhysics)+coastRigTimber(s.world.coastRig);stored['mars-timber']-=timberUse;
  return {purchased:clone(s.materials),stored,unreceived,receipts:receipts.map(clone),...(gardenWaterUsed(s.world.constructionHighBuild)?{gardenWaterUsedML:gardenWaterUsed(s.world.constructionHighBuild)}:{}),...((s.world.constructionWater||s.world.constructionSoil||s.world.constructionTimber||s.world.constructionHighBuild||coastHarborTimber(s.world.coastPhysics)||coastRigTimber(s.world.coastRig))?{inUse:{...((s.world.constructionWater||reelWaterUsed(s.world.constructionHighBuild))?{'mars-water':inUse+reelWaterUsed(s.world.constructionHighBuild)}:{}),...((s.world.constructionSoil||gardenCost(s.world.constructionHighBuild).soil)?{'mars-soil':soilUse}:{}),...((s.world.constructionTimber||s.world.constructionHighBuild||coastHarborTimber(s.world.coastPhysics)||coastRigTimber(s.world.coastRig))?{'mars-timber':timberUse}:{})}}:{})};
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
 const received=Object.fromEntries(MATERIAL_IDS.map(k=>[k,receivedConstructionMaterial(s,k)]));
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
function receivedConstructionMaterial(s,offerId){return s.events.filter(e=>e.kind==='delivery'&&e.offerId===offerId).reduce((n,e)=>n+e.amount,0)+(projectCoastForage(s).materials[offerId]??0);}
function saveConstructionWaterDraft(s,work,draft,expectedRevision){
  validateWorldPurchaseLedger(s);
  const old=s.world.constructionWater;
  ok((old?.revision??null)===expectedRevision,'別の作業状態で更新されています。上書きしません。');
  const received=receivedConstructionMaterial(s,'mars-water');
  validateWorldWater(work,received);validateWaterContinuation(old,work);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionWater=waterCheckpoint(work);assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
}
function saveConstructionSoilDraft(s,work,draft,expectedRevision,rainAction=null){
  validateWorldPurchaseLedger(s);const old=s.world.constructionSoil;
  ok((old?.revision??null)===expectedRevision,'別の土作業状態で更新されています。上書きしません。');
  const received=receivedConstructionMaterial(s,'mars-soil');
  validateWorldSoil(work,received);validateSoilContinuation(old,work);
  const record=s.world.constructionTransport;
  let transport, story;
  if(rainAction){
    const plan=rainLoaderPlan(s.world,work),before=record?.work,earth=before?.frame.soil;
    ok(LINK_SCOPE==='imasora-world-ledger-v1'&&draft.map==='construction'&&plan&&
      plan.step===rainAction.step&&earth.revision===rainAction.earthRevision&&
      rainAction.type===plan.operation,'作業が更新されたよ。もう一度、次の作業を確認しよう。');
    ok(!plan.reason,plan.reason);
    const placing=rainAction.type==='place',target=plan.pad;
    const structures=outdoorSignObstacles({...s.world,constructionSoil:null});
    for(const b of worldSoilFloors(work))structures.push({x:b.x,z:b.z,y:(b.height+b.underside)/2,w:b.size[0],d:b.size[1],h:b.height-b.underside,angle:0});
    const clearance=placing?[plan.path,{x:target.x,z:target.z,y:1,w:16,h:2,d:8,angle:0}]:[plan.path];
    ok(!clearance.some(shape=>structures.some(b=>outdoorBoxesHit(shape,b))), 'バケットの前や台座の上に物があるよ。作業場所を空けよう。');
    const soil=soilTransportCommand(earth,{type:placing?'rain-foundation-place':'rain-foundation-load',
      id:rainAction.id,expectedRevision:earth.revision,...(placing?{batch:plan.batch}:{})});
    transport={...record,work:{...before,revision:before.revision+1,frame:{...before.frame,revision:before.frame.revision+1,soil}}};
    validateScoopDumpContinuation(before,transport.work);
    const nextStep=placing?Math.min(RAIN_WORKS_MIXER_STEP,RAIN_WORKS_FOUNDATION_STEP+(plan.batch+1)*4):plan.step;
    story={...s.world.rainWorksV1,step:nextStep};
  }
  const n=rainAction?buildLinkedWorldDraft(s,draft,false,transport):saveLinkedWorldDraft(s,draft);
  n.world.constructionSoil=soilCheckpoint(work);
  if(story){
    if(s.world.rainWorksV1)n.world.rainWorksV1=story;
    if(s.world.constructionCourseV1){
      const mission=constructionMission(s.world);
      ok(mission?.kind==='foundation'&&mission.id===rainAction.mission&&mission.op===rainAction.type&&timedMissionComplete(mission,rainAction.elapsedMs),'タイムアタックを開始してから作業してください。');
      n.world.constructionCourseV1=advanceConstructionCourse(s.world,mission.id,'foundation');
    }
  }
  assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
}
function applyConstructionHighBuild(s,action,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(s.revision===expectedRevision,'別のセーブが進んだよ。古い内容では上書きしません。');
 ok(LINK_SCOPE==='imasora-world-ledger-v1'&&s.schemaVersion>=3&&s.world.constructionParking?.version===3&&draft.map==='construction','みんなの駐車場を準備してから、高い建物をつくろう。');
 if(['REEL_GIRDER_PICK','REEL_GIRDER_INSTALL','REEL_GIRDER_RETURN'].includes(action.type)){const result=transferReelGirder(s.world,action),n=saveLinkedWorldDraft(s,draft);n.schemaVersion=4;n.world.constructionHighBuild=result.high;n.world.constructionTimber=timberCheckpoint(result.timber);assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;}
 if(action.type==='PLACE')ok(projectConstructionStock(s).stored['mars-timber']>=highMaterialCost(action.blueprint),'この形をつくる木材が足りないよ。受取所で受け取ろう。');
 assertTankGardenAction(s.world,action,draft);const roomContext=assertRoomWalkWorld(s.world,action);assertRoomLayoutWorld(s.world,action);assertEntranceDoorClear(s.world,action,draft);const project=transitionHighWorld(s.world.constructionHighBuild??null,action,roomContext),n=saveLinkedWorldDraft(s,draft);assertOutdoorSignAction(s.world,action,draft,project);assertGardenAction(s.world,action,draft,project);assertLightAction(s.world,action,draft,project);
 assertReelAction(s.world,action,draft,project);assertKitSupportChange(s.world,project);assertBoardBayRetrofitWorld(s.world,action,project);const timber=s.world.constructionTimber,yard=TIMBER_YARDS[timber?.siteIndex];assertBoardBaySupportChange(s.world.constructionHighBuild,project,timber,yard?{x:yard[0],z:yard[1]}:null);
 n.schemaVersion=4;n.world.constructionHighBuild=project;assertStructuralChange(s.world,n.world);const gardenWorld=gardenEarthTransition(s.world,action,draft,project);if(gardenWorld.constructionTransport!==s.world.constructionTransport)n.world.constructionTransport=gardenWorld.constructionTransport;const harvest=gardenHarvestEvent(s,action,project);if(harvest){ok(s.events.length+(s.pending?1:0)<LIMIT,'素材の記録がいっぱいだよ。いまの花は残っているよ。');n.events.push(harvest);n.revision++;}validateWorldPurchaseLedger(n);return n;
}
function transferConstructionKit(s,action,draft,expectedRevision){
 validateWorldPurchaseLedger(s);ok(s.revision===expectedRevision,'別のセーブが進んだよ。もう一度えらぼう。');ok(s.schemaVersion===4&&s.world.constructionParking?.version===3&&draft.map==='construction','みんなの駐車場でキットを運ぼう。');
 const result=transferBuildingKit(s.world,action),n=saveLinkedWorldDraft(s,draft);n.world.constructionHighBuild=result.high;n.world.constructionTimber=timberCheckpoint(result.timber);assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
}
function saveConstructionTimberDraft(s,work,draft,expectedRevision){
  validateWorldPurchaseLedger(s);const old=s.world.constructionTimber;
  ok((old?.revision??null)===expectedRevision,'別の木材作業状態で更新されています。上書きしません。');
  const received=receivedConstructionMaterial(s,'mars-timber');
  validateWorldTimber(work,received);validateTimberContinuation(old,work,s.world);assertBoardLiftContinuation(s.world,work);
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionTimber=timberCheckpoint(work);assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
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
  n.schemaVersion=Math.max(3,n.schemaVersion);n.world.constructionTransport=record;assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
}
function applyConstructionTransportCommand(s,command,draft){
  validateWorldPurchaseLedger(s);ok(s.schemaVersion>=3,'先に土の共有保存へ切り替えてください。');
  const record=commandWorldTransport(s.world.constructionTransport,s.world.constructionExcavation,s.source.fingerprint,command);
  if(record===s.world.constructionTransport)return s;
  const n=saveLinkedWorldDraft(s,draft);n.world.constructionTransport=record;assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
}
function enableConstructionTransportWork(s,draft,expectedEarthRevision){
  validateWorldPurchaseLedger(s);const earth=s.world.constructionExcavation;
  ok(LINK_SCOPE==='imasora-world-ledger-v1'&&earth?.scope===EARTH_LIVE_SCOPE,'取得済みの通常地形が必要です。');
  ok(earth.revision===expectedEarthRevision,'切替確認後に掘削作業が変わりました。もう一度確認してください。');
  ok(!s.pending&&!s.world.equipmentCraftPending,'購入・装備作成を完了してから切り替えてください。');
  const record=createWorldTransportWork(earth,s.source.fingerprint,s.world.constructionTransport);
  if(record===s.world.constructionTransport)return s;
  const n=saveLinkedWorldDraft(s,draft);n.schemaVersion=Math.max(3,n.schemaVersion);n.world.constructionTransport=record;assertStructuralChange(s.world,n.world);validateWorldPurchaseLedger(n);return n;
}
function buildConstructionTransportDraft(s,record,draft,rainTrial=null,checkedScoop=false){
  const n=buildLinkedWorldDraft(s,draft,false,record),current=s.world.rainWorksV1,before=s.world.constructionTransport.work;
  const chapter=LINK_SCOPE==='imasora-world-ledger-v1'&&n.world.map==='construction'&&
    s.world.rainStoryV1?.at(-1)==='cloud-rescue-complete'&&
    n.world.constructionParking?.corner===record.work.frame.soil.field?.corner;
  if(rainTrial){
    if(rainTrial.course){
      const mission=constructionMission(s.world);
      ok(n.world.map==='construction'&&mission?.kind==='transport'&&mission.id===rainTrial.type,'現在の工程を確認しよう。');
      const step=courseChapterStep(constructionCourse(s.world));
      const progress={step,...(step>=RAIN_WORKS_HAUL_STEP?{excavatorTrial:{cell:0}}:{}),...(mission.id!=='dump-arrival'?{dumpArrival:true,quarryArrival:true}:{}),...(mission.id==='dump-unload'?{dumpAtStorage:true}:{}),...current};
      const result=completeSummitMission(mission.id,progress,before,record.work,rainTrial,SOIL_CAPACITY.dump,dumpStoragePlan);
      ok(result,'山頂の作業と荷台の土量を確認してください。');
      n.world.constructionCourseV1=advanceConstructionCourse(s.world,mission.id,'transport');
      if(chapter&&current)n.world.rainWorksV1=result;
    }else{
      const result=chapter&&completeRainConstructionTrial(current,before,record.work,rainTrial,SOIL_CAPACITY.dump,dumpStoragePlan);
      ok(result,'制限時間内の作業完了を確認できませんでした。');
      n.world.rainWorksV1=result;
    }
  }else if(chapter&&!s.world.constructionCourseV1&&!current?.excavatorTrial&&rainWorksDumpCompleted(current,before,record.work)){
    n.world.rainWorksV1={...current,step:RAIN_WORKS_FOUNDATION_STEP};
  }
  assertStructuralChange(s.world,n.world);
  // A worker has already checked the reserved stroke and its source.
  // Reuse that check only for this byte-equivalent physical record, while
  // still auditing the floor, vehicle transition and rest of the draft.
  const t=n.world.constructionTransport;
  const checked=checkedScoop&&n.source.fingerprint===s.source.fingerprint&&
    sameConstructionRecordValue(record,t)&&
    sameConstructionRecordValue(s.world.constructionExcavation,n.world.constructionExcavation)?t:null;
  validateLedger(n,s.world,checked);
  return n;
}
// Pure candidate assembly for the save worker. It grants no physical receipt
// and cannot commit. The service checks the private receipt before dispatch.
function prepareConstructionTransportCandidate(s,record,draft,expectedRevision,rainTrial=null){
 if(!verifiedLedgerSnapshots.has(s))validateWorldPurchaseLedger(s);
 ok(s.world.constructionTransport?.version===2&&s.world.constructionTransport.work.revision===expectedRevision,'別の作業が保存されました。');
 reuseScoopSoilTransition(s.world.constructionTransport.work.frame.soil,record?.work?.frame?.soil);
 validateWorldTransport(record,s.world.constructionExcavation,s.source.fingerprint,{continuation:s.world.constructionTransport.work});
 if(transportNeedsShovel(record))assertTransportShovel(projectStarterToolkit(s.world.constructionPackTrialLedger,s.source.fingerprint),s.source.fingerprint);
 const checkedScoop=immutablePackets&&!!record.work.scoop&&isCapturedConstructionJson(record.work.frame.soil);
 return buildConstructionTransportDraft(s,record,draft,rainTrial,checkedScoop);
}
function prepareConstructionTransportWork(s,record,draft,expectedRevision,rainTrial=null){
  validateWorldPurchaseLedger(s);assertWorldTransportWorkReceipt(s.world.constructionTransport,record,expectedRevision,projectStarterToolkit(s.world.constructionPackTrialLedger,s.source.fingerprint));
  return buildConstructionTransportDraft(s,record,draft,rainTrial);
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
  validateWorldPurchaseLedger(s);ok(packet?.version===1,'海辺のセットは海辺の工房でひらこう。');
  ok(LINK_SCOPE==='imasora-world-ledger-v1','建築ポイントは通常の工事現場プロフィールだけで受け取れます。');
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
  const n=buildLinkedWorldDraft(s,draft,false,s.world.constructionTransport);n.world.constructionProfileProject=next.state;assertConcreteVehicleMove(s.world,n.world,action);assertStructuralChange(s.world,n.world);
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
function encodeCheckedLedger(s){
 const raw=JSON.stringify({format:LINK_SCOPE,checksum:fingerprint(s),state:s});
 if(immutablePackets)rememberPacket(raw,serializedSaveSnapshot(s));
 return raw;
}
function packWorldPurchaseLedger(s){validateWorldPurchaseLedger(s);return encodeCheckedLedger(s);}
function packConstructionTransportCandidate(s,record,draft,expectedRevision,rainTrial=null){
 // The candidate builder fully validates its result. Encoding privately here
 // preserves the same packet without running the same world audit twice.
 return encodeCheckedLedger(prepareConstructionTransportCandidate(s,record,draft,expectedRevision,rainTrial));
}
function unpackWorldPurchaseLedger(raw){ok(typeof raw==='string'&&raw.length<=20000000,'接続保存が不正です。');if(immutablePackets&&verifiedPackets.has(raw)){const state=verifiedPackets.get(raw);rememberPacket(raw,state);return state;}const p=immutablePackets?parseCapturedConstructionJson(raw):JSON.parse(raw);if(verifiedPackets.has(raw)){rememberPacket(raw);return p.state;}keys(p,['format','checksum','state']);ok(p.format===LINK_SCOPE&&p.checksum===fingerprint(p.state),'接続保存の整合性を確認できません。');validateWorldPurchaseLedger(p.state);rememberPacket(raw,immutablePackets?p.state:true);return p.state;}
return {isRainStoryCleared,recordRainStoryMilestone,recordRainSkyStage,recordRainAmaneStage,recordRainDeliveryStage,recordRainWorks,recordRainRepairStage,savePostStoryUfoArrival,applyCoastPebbleFind,applyCoastFruit,applyCoastVisit,recordCoastExploration,applyCoastArrival,receiveSailingAwards,applyCoastRig,projectCoastForage,applyCoastForage,transferConstructionKit,applyConstructionHighBuild,prepareSharedConstruction,migrateTransportParking,migrateConcreteParking,migrateConstructionParking,LINK_SCOPE,LINK_PRICES,LINK_OFFERS,fingerprint,readWorldSource,quoteLinkedOrder,createWorldPurchaseLedger,validateWorldPurchaseLedger,prepareLinkedOrder,settleLinkedOrder,awardLinkedFlightReward,saveLinkedWorldDraft,saveConstructionWaterDraft,saveConstructionSoilDraft,saveConstructionTimberDraft,allocateConstructionExcavation,saveConstructionExcavationDraft,enableConstructionTransport,applyConstructionTransportCommand,enableConstructionTransportWork,saveConstructionTransportWork,prepareConstructionTransportWork,prepareConstructionTransportCandidate,packConstructionTransportCandidate,projectLinkedShop,projectConstructionStock,projectConstructionPackTrial,receiveConstructionMaterial,receiveConstructionPackTrial,projectConstructionProfileProject,projectConstructionProfileStock,applyConstructionProfileProject,saveConstructionWorkPlatform,packWorldPurchaseLedger,unpackWorldPurchaseLedger};
}
