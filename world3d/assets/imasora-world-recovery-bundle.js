// 9-1c2b2b1: preserve saved records, without migrating or replaying them.
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=496';
import {validateEquipmentCraft,equipmentCraftWasPaid} from './imasora-workshop-write-guard.js?v=495';

export const RECOVERY_DATABASES_V1=Object.freeze([
  'imasora-world-authority-v1',
  'imasora-world-shop-integration-development-v1',
  'imasora-construction-development-v1',
  'imasora-construction-terrain-development-v1',
  'imasora-construction-excavation-development-v1',
  'imasora-construction-excavation-restore-test-v1',
]);
export const RECOVERY_DATABASES=Object.freeze([
  ...RECOVERY_DATABASES_V1,
  'imasora-world-excavation-integration-v1',
  'imasora-world-excavation-authority-development-v1',
]);
export const RECOVERY_LOCAL_KEYS_V1=Object.freeze(['imasora-world-foundation-v3','imasora-ufo-workshop-materials-v1']);
export const RECOVERY_LOCAL_KEYS=Object.freeze([
  ...RECOVERY_LOCAL_KEYS_V1,
  'imasoraUfoArcadeDailyRewardsV1',
  'imasoraPachicoinDailyHeldCoinsV1',
  'imasoraUfoArcadeRewardPendingV1',
  'imasoraPachicoinPrizeExchangePendingV1',
]);
export const RECOVERY_LEGACY_KIND='imasora-world-recovery-bundle-v1';
export const RECOVERY_KIND='imasora-world-recovery-bundle-v2';
export const MAX_RECOVERY_PAYLOAD=32*1024*1024;
export const MAX_RECOVERY_FILE=64*1024*1024;
const encoder=new TextEncoder();
const check=(ok,message)=>{if(!ok)throw Error(message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const sameNames=(items,names)=>Array.isArray(items)&&items.length===names.length&&items.every(x=>typeof x==='string')&&[...items].sort().join('\n')===[...names].sort().join('\n');

// Never silently coerce an unexpected future IDB value (Date, undefined, NaN, etc.).
export function checkRecoveryJSON(value,depth=0,seen=new Set(),budget={nodes:0}){
  check(++budget.nodes<=100000,'記録の項目数が多すぎるため、内容を省略せず停止しました。');
  check(depth<=80,'記録の階層が深すぎるため、内容を省略せず停止しました。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){check(Number.isFinite(value)&&!Object.is(value,-0),'そのまま保管できない数値が含まれています。');return;}
  check(Array.isArray(value)||object(value),'そのまま保管できない型が含まれています。');
  check(!Array.isArray(value)||value.length<=100000-budget.nodes,'配列の項目数が多すぎるため、内容を省略せず停止しました。');
  check(!seen.has(value),'循環した記録は保管できません。');seen.add(value);
  check(Reflect.ownKeys(value).length===Object.keys(value).length+(Array.isArray(value)?1:0),'非対応の属性を含む記録です。');
  if(Array.isArray(value))check(Object.keys(value).length===value.length&&Object.keys(value).every((k,i)=>k===String(i)),'非対応の配列を含む記録です。');
  for(const v of Object.values(value))checkRecoveryJSON(v,depth+1,seen,budget);
  seen.delete(value);
}
export function validateRecoveryDomains(domains,version=2){
  check(version===1||version===2,'対応していない控えの版です。');
  const databases=version===1?RECOVERY_DATABASES_V1:RECOVERY_DATABASES,localKeys=version===1?RECOVERY_LOCAL_KEYS_V1:RECOVERY_LOCAL_KEYS;
  checkRecoveryJSON(domains);
  check(object(domains)&&sameNames(domains.local?.map(x=>x?.key),localKeys)&&sameNames(domains.databases?.map(x=>x?.name),databases),'保存領域の一覧が控えの版と一致しません。');
  for(const entry of domains.local)check(entry.raw===null||typeof entry.raw==='string','旧保存・装備素材の原文が不正です。');
  let entries=0;
  for(const db of domains.databases){
    check(Array.isArray(db.stores)&&db.stores.length<=64,'保存ストアの一覧が不正です。');
    check(db.version===null||(Number.isSafeInteger(db.version)&&db.version>0),'データベースの版が不正です。');
    check(db.version!==null||db.stores.length===0,'未作成の保存に記録が混入しています。');
    const names=new Set();
    for(const store of db.stores){
      check(typeof store.name==='string'&&!names.has(store.name)&&Array.isArray(store.entries),'保存ストアが重複、または不正です。');names.add(store.name);
      const keys=new Set();
      for(const item of store.entries){
        check(object(item)&&Object.hasOwn(item,'key')&&Object.hasOwn(item,'value'),'保存記録のキーまたは値がありません。');
        const key=canonical(item.key);check(!keys.has(key),'保存記録のキーが重複しています。');keys.add(key);
        check(++entries<=20000,'記録数が上限を超えています。内容を省略せず停止しました。');
      }
    }
  }
  const raw=canonical(domains);check(encoder.encode(raw).length<=MAX_RECOVERY_PAYLOAD,'記録が32 MiBを超えています。内容を省略せず停止しました。');return domains;
}
function validatePayload(p){
  check(object(p)&&(p.version===1||p.version===2)&&p.scope==='saved-records-only'&&p.consistency==='double-read-unchanged','対応していない控えの形式です。');
  let url;try{url=new URL(p.origin);}catch{}
  check(url&&['http:','https:'].includes(url.protocol)&&url.origin===p.origin,'保存元のアドレスが不正です。');
  check(typeof p.capturedAt==='string'&&Number.isFinite(Date.parse(p.capturedAt)),'取得日時が不正です。');validateRecoveryDomains(p.domains,p.version);
}
async function sha256(raw){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function packRecoveryBundle(payload){
  checkRecoveryJSON(payload);validatePayload(payload);
  const raw=canonical(payload);check(encoder.encode(raw).length<=MAX_RECOVERY_PAYLOAD,'控えが32 MiBを超えています。');
  const text=JSON.stringify({kind:payload.version===1?RECOVERY_LEGACY_KIND:RECOVERY_KIND,payload:raw,checksum:await sha256(raw)},null,2);
  check(encoder.encode(text).length<=MAX_RECOVERY_FILE,'書出ファイルが64 MiBを超えています。');return text;
}
export async function unpackRecoveryBundle(text){
  check(typeof text==='string'&&text.length<=MAX_RECOVERY_FILE&&encoder.encode(text).length<=MAX_RECOVERY_FILE,'控えのファイルが大きすぎるか、文字列ではありません。');
  const envelope=JSON.parse(text);
  check([RECOVERY_LEGACY_KIND,RECOVERY_KIND].includes(envelope?.kind)&&typeof envelope.payload==='string','保存済み記録の控えを選んでください。掘削作業JSON・旧復元ファイルとは別の形式です。');
  check(encoder.encode(envelope.payload).length<=MAX_RECOVERY_PAYLOAD,'控えの内容が大きすぎます。');
  check(/^[a-f0-9]{64}$/.test(envelope.checksum)&&await sha256(envelope.payload)===envelope.checksum,'控えの照合値が一致しません。内容が欠けたか、変更されています。');
  const payload=JSON.parse(envelope.payload);validatePayload(payload);
  check(envelope.kind===(payload.version===1?RECOVERY_LEGACY_KIND:RECOVERY_KIND),'控えの外側と内容の版が一致しません。');return payload;
}
export async function collectRecoveryBundle({readDomains,origin,watchChanges=()=>()=>{}}){
  let changed=false;const stop=watchChanges(()=>{changed=true;});
  try{
    // Copy each read before the next one; an adapter must not mutate the first snapshot.
    const first=canonical(validateRecoveryDomains(await readDomains()));
    const second=canonical(validateRecoveryDomains(await readDomains()));
    check(!changed&&first===second,'取得中に保存が更新されました。作業を一時停止して、もう一度「保存済み記録を控える」を押してください。');
    const text=await packRecoveryBundle({version:2,scope:'saved-records-only',origin,capturedAt:new Date().toISOString(),consistency:'double-read-unchanged',domains:JSON.parse(first)});
    check(!changed,'照合中に保存が更新されました。作業を一時停止して、もう一度取得してください。');return text;
  }finally{stop();}
}
export function inspectRecoveryBundle(payload){
  validatePayload(payload);
  const {domains}=payload, warnings=[];
  const notCaptured=payload.version===1?RECOVERY_DATABASES.filter(name=>!RECOVERY_DATABASES_V1.includes(name)):[];
  const notCapturedLocalKeys=payload.version===1?RECOVERY_LOCAL_KEYS.filter(key=>!RECOVERY_LOCAL_KEYS_V1.includes(key)):[];
  if(notCaptured.length)warnings.push('旧形式の控えには、新しい掘削記録と世界・掘削の同時保存記録が含まれていません。これらの保存が未作成という意味ではありません。');
  if(notCapturedLocalKeys.length)warnings.push('旧形式の控えには、ゲームセンターの日次獲得数・もちコイン・未処理の獲得と交換記録が含まれていません。未収録の記録を空とは判定していません。');
  const raw=domains.databases.find(d=>d.name===RECOVERY_DATABASES[0]).stores.find(s=>s.name==='snapshots')?.entries.find(e=>e.key==='construction')?.value;
  const authority={status:raw===undefined?'absent':'invalid'},equipment={status:'none'};
  if(raw!==undefined){
    try{
      check(object(raw)&&Number.isSafeInteger(raw.generation)&&raw.generation>0&&Array.isArray(raw.backups),'正本の管理情報が不正です。');
      const ledger=L.unpackWorldPurchaseLedger(raw.current);
      Object.assign(authority,{status:'valid',generation:raw.generation,balance:ledger.world.ufoResources?.spaceCoins,backups:raw.backups.length});
      for(const backup of raw.backups){try{L.unpackWorldPurchaseLedger(backup);}catch{warnings.push('正本の履歴に確認が必要な記録があります。原文を保持しています。');break;}}
      const pending=ledger.world.equipmentCraftPending;
      if(pending){
        const materials=domains.local.find(e=>e.key===RECOVERY_LOCAL_KEYS[1]).raw;
        let valid=false;
        try{validateEquipmentCraft(pending);valid=true;}catch{}
        if(!valid)equipment.status='invalid';
        else {try{equipment.status=equipmentCraftWasPaid(pending,materials)?'after':'before';}catch{equipment.status='conflict';}}
        warnings.push(equipment.status==='invalid'?'装備作成途中の記録に不正な項目があります。原文を保持しています。':equipment.status==='conflict'?'作成途中の装備と現在の素材が食い違っています。両方を保持し、解決処理はしていません。':'作成途中の装備記録があります。素材と一緒に保持し、作成処理は進めていません。');
      }
      if(ledger.pending)warnings.push('未確定の購入記録があります。取引を進めず保持しています。');
    }catch{warnings.push('通常正本に確認が必要です。壊れた記録や未対応の版も、原文のまま保持しています。');}
  }
  for(const local of domains.local){if(local.raw!==null){try{JSON.parse(local.raw);}catch{warnings.push(`${local.key} に確認が必要です。原文を保持しています。`);}}}
  if(domains.local.some(entry=>['imasoraUfoArcadeRewardPendingV1','imasoraPachicoinPrizeExchangePendingV1'].includes(entry.key)&&entry.raw!==null))
    warnings.push('ゲームセンターの獲得・交換処理が未完了の記録があります。素材・日次記録と一緒に原文を保持し、獲得や交換の処理は進めていません。');
  return {version:payload.version,origin:payload.origin,capturedAt:payload.capturedAt,authority,equipment,warnings,notCaptured,notCapturedLocalKeys,
    databases:domains.databases.map(d=>({name:d.name,exists:d.version!==null,stores:d.stores.length,records:d.stores.reduce((n,s)=>n+s.entries.length,0)})),
    local:domains.local.map(e=>({key:e.key,exists:e.raw!==null}))};
}
