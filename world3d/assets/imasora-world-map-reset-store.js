// Clearing player buildings and its undo share one strict IndexedDB transaction.
// Terrain, vehicles, inventory and every other map remain in the current ledger.
import {CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=496';

export const MAP_RESET_MAPS=Object.freeze(['sky','mars','coast','construction']);
export const MAP_RESET_PREFIX='world-map-reset:';
const RESETTABLE=Object.freeze({sky:['sky-garden'],mars:[],coast:['coast-house','coast-deck'],construction:['workshop','storage']});
export function isResettableBuilding(map,item){return MAP_RESET_MAPS.includes(map)&&!!item&&item.fixed!==true&&RESETTABLE[map].includes(item.catalogId);}
const HEAD_KEY='construction',LIVE_DB='imasora-world-authority-v1';
const check=(yes,message)=>{if(!yes)throw Error(`建造物の片付け：${message}`);};
const equal=(a,b)=>canonical(a)===canonical(b),object=v=>v&&Object.getPrototypeOf(v)===Object.prototype;
export function mapResetKey(map){check(MAP_RESET_MAPS.includes(map),'このマップは対象外です。');return MAP_RESET_PREFIX+map;}
function nativeStore(store){check(store?.name===LIVE_DB,'通常保存以外では利用できません。');}
function json(value,max=64000000){
  const seen=new Set(),walk=value=>{
    if(value===null||typeof value==='string'||typeof value==='boolean')return;
    if(typeof value==='number'){check(Number.isFinite(value),'有限でない座標があります。');return;}
    check(Array.isArray(value)||object(value),'保存できない建造物の情報です。');check(!seen.has(value),'循環または共有参照のある記録です。');seen.add(value);
    const names=Reflect.ownKeys(value),isArray=Array.isArray(value),keys=Object.keys(value);
    check(names.length===keys.length+(isArray?1:0),'非対応の属性があります。');
    if(isArray){check(Object.getPrototypeOf(value)===Array.prototype,'非対応の配列形式です。');check(keys.length===value.length&&keys.every((key,i)=>key===String(i)),'建造物の配列が不正です。');}
    for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);check(descriptor&&Object.hasOwn(descriptor,'value'),'計算される属性は保存できません。');walk(descriptor.value);}
  };walk(value);check(JSON.stringify(value).length<=max,'建造物の記録が大きすぎます。');return value;
}
export function validateMapBuildings(built){
  json(built,8000000);check(Array.isArray(built)&&built.every(item=>object(item)&&typeof item.id==='string'&&item.id.length>0),'建造物の一覧が不正です。');
  check(new Set(built.map(item=>item.id)).size===built.length,'建造物の識別番号が重複しています。');return built;
}
export function mapBuildings(world,map){mapResetKey(map);const built=world?.builtByMap?.[map]??[];return validateMapBuildings(built);}
export function keptMapBuildings(map,before){mapResetKey(map);validateMapBuildings(before);return structuredClone(before.filter(item=>!isResettableBuilding(map,item)));}
export function removeOneMapBuilding(map,before,targetId){
  mapResetKey(map);validateMapBuildings(before);
  check(typeof targetId==='string'&&targetId.length>0,'片付ける建造物を選んでください。');
  const target=before.find(item=>item.id===targetId);
  check(target&&isResettableBuilding(map,target),'選んだ建造物は片付け対象ではありません。');
  return structuredClone(before.filter(item=>item.id!==targetId));
}
export function moveOneMapBuilding(map,before,targetId,position){
  mapResetKey(map);validateMapBuildings(before);
  check(map==='construction','個別移動は工事現場の建物だけが対象です。');
  check(typeof targetId==='string'&&targetId.length>0,'移動する建物を選んでください。');
  check(Array.isArray(position)&&position.length===2&&position.every(Number.isFinite),'移動先のX/Z座標を確認してください。');
  const index=before.findIndex(item=>item.id===targetId),target=before[index];
  check(index>=0&&isResettableBuilding(map,target),'選んだ建物は移動対象ではありません。');
  check(Array.isArray(target.position)&&target.position.length>=3&&target.position.every(Number.isFinite),'建物の現在位置が不正です。');
  const next=structuredClone(before);next[index].position[0]=position[0];next[index].position[2]=position[1];return next;
}
function validateBuildingMoveDelta(map,before,after,targetId){
  validateMapBuildings(before);validateMapBuildings(after);
  check(before.length===after.length&&before.every((item,index)=>item.id===after[index]?.id),'ほかの建物の順序や数は変更できません。');
  const index=before.findIndex(item=>item.id===targetId),from=before[index],to=after[index];
  check(index>=0&&isResettableBuilding(map,from),'移動対象の建物が不正です。');
  check(Array.isArray(from.position)&&Array.isArray(to.position)&&from.position.length===to.position.length&&from.position.length>=3,'建物の位置記録が不正です。');
  const expected=structuredClone(from),changed=Number.isFinite(to.position[0])&&Number.isFinite(to.position[2])&&(from.position[0]!==to.position[0]||from.position[2]!==to.position[2]);
  check(changed&&from.position[1]===to.position[1]&&from.position.slice(3).every((v,i)=>v===to.position[i+3]),'高さや状態は変更できません。');
  expected.position[0]=to.position[0];expected.position[2]=to.position[2];check(equal(expected,to),'建物の座標以外は変更できません。');
  for(let i=0;i<before.length;i++)if(i!==index)check(equal(before[i],after[i]),'選んだ建物以外は変更できません。');
}
export function validateMapResetBefore(map,saved,before){
  validateMapBuildings(saved);validateMapBuildings(before);
  check(equal(keptMapBuildings(map,saved),keptMapBuildings(map,before)),'保護対象の建造物の変更を先に保存してから、もう一度内容を確認してください。');return before;
}
export function createMapResetLedger(current,map,buildings){
  mapResetKey(map);L.validateWorldPurchaseLedger(current);validateMapBuildings(buildings);
  check(!current.pending&&!current.world.equipmentCraftPending,'保留中の購入・装備作成を先に確認してください。');
  const next=structuredClone(current);next.world.builtByMap={...(next.world.builtByMap??{}),[map]:structuredClone(buildings)};
  next.worldWrites++;next.revision++;L.validateWorldPurchaseLedger(next);return next;
}
export function validateMapResetJournal(journal){
  json(journal);
  const single=journal?.version===2||journal?.version===3;
  const names=['version','scope','id','kind','map','priorResetId','expectedGeneration','expectedRaw','appliedGeneration','appliedRaw','beforeSaved','beforeUnsaved','applied',...(single?['targetId']:[])];
  check(object(journal)&&Object.keys(journal).sort().join('|')===names.sort().join('|'),'直前控えの項目が不正です。');
  check((journal.version===2&&journal.scope==='imasora-map-reset-point-v2')||(journal.version===3&&journal.scope==='imasora-map-building-move-v3')||(journal.version===1&&journal.scope==='imasora-map-reset-point-v1'),'直前控えの形式が不正です。');mapResetKey(journal.map);
  check(typeof journal.id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(journal.id),'確認番号が不正です。');
  check((journal.version===3?['move','move-undo']:single?['remove','undo']:['reset','undo']).includes(journal.kind),'操作の区分が不正です。');
  if(single)check(typeof journal.targetId==='string'&&journal.targetId.length>0,'片付け対象の識別番号が不正です。');
  const undo=journal.kind==='undo'||journal.kind==='move-undo';
  check(!undo?journal.priorResetId===null:typeof journal.priorResetId==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(journal.priorResetId),'元の確認番号が不正です。');
  check(Number.isSafeInteger(journal.expectedGeneration)&&journal.expectedGeneration>0&&journal.expectedGeneration<Number.MAX_SAFE_INTEGER-1&&journal.appliedGeneration===journal.expectedGeneration+1,'保存番号が不正です。');
  const before=L.unpackWorldPurchaseLedger(journal.expectedRaw),after=L.unpackWorldPurchaseLedger(journal.appliedRaw);
  check(equal(mapBuildings(before.world,journal.map),journal.beforeSaved),'保存済み建造物と控えが一致しません。');
  validateMapResetBefore(journal.map,journal.beforeSaved,journal.beforeUnsaved);validateMapBuildings(journal.applied);
  check(equal(mapBuildings(after.world,journal.map),journal.applied),'操作後の建造物と控えが一致しません。');
  check(equal(keptMapBuildings(journal.map,journal.beforeUnsaved),keptMapBuildings(journal.map,journal.applied)),'UFO・固定・未知の建造物は変更できません。');
  if(journal.kind==='reset'){check(journal.beforeUnsaved.some(item=>isResettableBuilding(journal.map,item)),'片付ける建造物がありません。');check(equal(journal.applied,keptMapBuildings(journal.map,journal.beforeUnsaved)),'片付ける建造物の範囲が不正です。');}
  else if(journal.kind==='remove')check(equal(journal.applied,removeOneMapBuilding(journal.map,journal.beforeUnsaved,journal.targetId)),'選んだ建造物以外は片付け・変更できません。');
  else if(journal.kind==='move'){
    const moved=journal.applied.find(item=>item.id===journal.targetId);
    check(moved&&equal(journal.applied,moveOneMapBuilding(journal.map,journal.beforeUnsaved,journal.targetId,[moved.position?.[0],moved.position?.[2]])),'選んだ建物以外は移動・変更できません。');
    validateBuildingMoveDelta(journal.map,journal.beforeUnsaved,journal.applied,journal.targetId);
  }
  else if(journal.kind==='move-undo'){
    check(equal(journal.beforeSaved,journal.beforeUnsaved),'移動後に未保存の建物が変更されています。');
    validateBuildingMoveDelta(journal.map,journal.beforeUnsaved,journal.applied,journal.targetId);
  }
  else {
    check(equal(journal.beforeSaved,journal.beforeUnsaved),'片付け後に未保存の建造物が変更されています。');
    if(single)check(equal(removeOneMapBuilding(journal.map,journal.applied,journal.targetId),journal.beforeUnsaved),'選んだ建造物以外は復元・変更できません。');
  }
  check(equal(createMapResetLedger(before,journal.map,journal.applied),after),'対象マップの建造物以外は変更できません。');return journal;
}
export async function readMapResetState(store,map){
  nativeStore(store);const key=mapResetKey(map),db=await store.open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get(HEAD_KEY),point=os.get(key);
    tx.oncomplete=()=>resolve({record:head.result??null,journal:point.result??null});
    tx.onabort=()=>reject(tx.error??Error('建造物の直前控えを読み込めませんでした。'));tx.onerror=()=>{};
  });
}
export async function commitMapReset(store,journal){
  nativeStore(store);const frozen=structuredClone(validateMapResetJournal(journal)),key=mapResetKey(frozen.map),db=await store.open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE),head=os.get(HEAD_KEY),point=os.get(key);let gotHead=false,gotPoint=false,next,error;
    const stop=e=>{error=e;tx.abort();};
    const write=()=>{
      if(!gotHead||!gotPoint)return;
      try{
        const prior=head.result;
        check(prior?.generation===frozen.expectedGeneration&&prior.current===frozen.expectedRaw,'別の画面で保存が変更されています。上書きせず停止しました。');
        check(Array.isArray(prior.backups)&&prior.backups.every(raw=>typeof raw==='string'),'保存管理情報が不正です。');
        const before=L.unpackWorldPurchaseLedger(frozen.expectedRaw);let old=null;
        if(point.result!==undefined&&point.result!==null){old=validateMapResetJournal(point.result);check(old.map===frozen.map,'別マップの直前控えです。');check(equal(L.unpackWorldPurchaseLedger(old.appliedRaw).source,before.source),'別の保存元の直前控えです。');}
        if(frozen.kind==='undo'||frozen.kind==='move-undo'){
          const previousKinds=frozen.kind==='move-undo'?['move']:['reset','remove'];
          check(old&&previousKinds.includes(old.kind)&&old.id===frozen.priorResetId,'戻せる直前控えが変更されています。');
          check(old.version===frozen.version&&(old.version===1||old.targetId===frozen.targetId),'片付け対象の控えが変更されています。');
          check(equal(frozen.beforeSaved,old.applied)&&equal(frozen.beforeUnsaved,old.applied),'片付け後に建造物が変更されています。');
          check(equal(frozen.applied,old.beforeUnsaved),'直前の建造物と戻す内容が一致しません。');
        }
        next={generation:frozen.appliedGeneration,current:frozen.appliedRaw,backups:[prior.current,...prior.backups].slice(0,5)};
        os.put(frozen,key);const request=os.put(next,HEAD_KEY);
        request.onsuccess=()=>{if(store.failNext){store.failNext=false;stop(Error('確認用に建造物の保存を中断しました。'));}};
      }catch(e){stop(e);}
    };
    head.onsuccess=()=>{gotHead=true;write();};point.onsuccess=()=>{gotPoint=true;write();};
    tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error??tx.error??Error('建造物の保存を中断しました。元の記録を保持しています。'));tx.onerror=()=>{};
  });
}
