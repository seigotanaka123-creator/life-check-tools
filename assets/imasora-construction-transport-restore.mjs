import {capturedJsonInfo,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=120fw';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs?v=120fw';
import {soilTransportTotals} from './imasora-construction-soil-transport.mjs?v=120fw';
import {validateScoopDumpContinuation} from './imasora-construction-fragment-scoop.mjs?v=120fw';
import {unpackRecoveryBundle,RECOVERY_KIND,RECOVERY_LEGACY_KIND,MAX_RECOVERY_FILE} from './imasora-world-recovery-bundle.js?v=120fw';

const checkedJournalSoils=new WeakMap();
export const TRANSPORT_RECOVERY_KIND='imasora-world-transport-recovery-v1';
export const MAX_TRANSPORT_RECOVERY_BYTES=32*1024*1024;
export const MAX_TRANSPORT_RESTORE_FILE_BYTES=MAX_RECOVERY_FILE;
const check=(yes,t)=>{if(!yes)throw Error('現場の控え：'+t);};
// Only used after descriptor/domain checks or a ledger JSON parse. Compare
// exact values without allocating two multi-megabyte canonical strings.
// Key order remains irrelevant; field presence, array order and types do not.
function eq(a,b){
 if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const keys=Object.keys(a);if(keys.length!==Object.keys(b).length)return false;
 if(Array.isArray(a)&&a.length!==b.length)return false;
 // Both trees passed the plain/domain checks. Finite coordinate triples
 // still compare every value and key, without three recursive calls.
 if(Array.isArray(a)&&a.length===3&&keys.length===3&&typeof a[0]==='number'&&typeof a[1]==='number'&&typeof a[2]==='number'&&typeof b[0]==='number'&&typeof b[1]==='number'&&typeof b[2]==='number')return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
 for(const k of keys)if(!Object.hasOwn(b,k)||!eq(a[k],b[k]))return false;return true;
}
const bytes=v=>new TextEncoder().encode(v).length;
// Check descriptors before serialization: never execute getters or toJSON in an
// imported object. The file size and walk budget bound malformed input work.
// A recovery/undo record contains independently valid full scenes. Keep the
// same structural budget for EACH scene, rather than charging copies to one
// scene. Fully checked finite numeric triples count as one coordinate unit,
// not four: a legal 2048-operation soil history may contain 300k coordinates.
// This still bounds traversal to at most four values per budget unit. File,
// soil-byte/history, depth, descriptor and domain limits remain independent.
function plain(v,depth=0,seen=new Set(),budget={nodes:0},parts=null){
 check(++budget.nodes<=500000&&depth<=100,'記録が大きすぎるか、階層が深すぎます。');
 const proof=v&&typeof v==='object'?capturedJsonInfo(v):null;
 if(proof&&!parts){check(depth+proof.height<=100&&(budget.nodes+=proof.nodes-1)<=500000,'記録が大きすぎるか、階層が深すぎます。');return;}
 if(v===null||typeof v==='string'||typeof v==='boolean')return;
 if(typeof v==='number'){check(Number.isFinite(v),'数値が不正です。');return;}
 const a=Array.isArray(v);check(v&&Object.getPrototypeOf(v)===(a?Array.prototype:Object.prototype),'形式が不正です。');
 const keys=Object.keys(v);check(Reflect.ownKeys(v).length===keys.length+(a?1:0),'隠れた項目があります。');
 if(a&&v.length===3&&depth<100&&keys.length===3&&keys[0]==='0'&&keys[1]==='1'&&keys[2]==='2'){
  const x=Object.getOwnPropertyDescriptor(v,'0'),y=Object.getOwnPropertyDescriptor(v,'1'),z=Object.getOwnPropertyDescriptor(v,'2');
  // Exact own finite data triples cannot be cyclic. Keep the same coordinate
  // budget, descriptor, hidden-key and depth limits without Set/callback churn.
  if(Object.hasOwn(x,'value')&&Object.hasOwn(y,'value')&&Object.hasOwn(z,'value')&&typeof x.value==='number'&&typeof y.value==='number'&&typeof z.value==='number'&&Number.isFinite(x.value)&&Number.isFinite(y.value)&&Number.isFinite(z.value))return;
 }
 check(!seen.has(v),'循環した記録です。');seen.add(v);if(a)check(keys.length===v.length&&keys.every((k,i)=>k===String(i)),'配列が不正です。');
 for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);check(Object.hasOwn(d,'value'),'動的な項目は使えません。');const part=parts&&Object.hasOwn(parts,k)?parts[k]:null;plain(d.value,depth+1,seen,part===true?{nodes:0}:budget,part===true?null:part);}seen.delete(v);
}
function work(r,earth,profile){validateWorldTransport(r,earth,profile);check(r.version===2,'人物と車両を一緒に保存した記録を選んでください。');return r;}
function sameCheckedSoilSource(a,b){
 check(eq(worldTransportSoil(a).initial,worldTransportSoil(b).initial),'元の土・車両・区画が一致しません。');
 check(soilTransportTotals(worldTransportSoil(a))['earth-soil'].total===soilTransportTotals(worldTransportSoil(b))['earth-soil'].total,'土の総量が違います。');
}
export function sameTransportRestoreSource(a,b,earth,profile){
 work(a,earth,profile);if(b!==a)work(b,earth,profile);
 // Both complete scenes were checked above in this synchronous call.
 sameCheckedSoilSource(a,b);return true;
}
export function validateTransportRestoreBefore(saved,before,earth,profile){sameTransportRestoreSource(saved,before,earth,profile);if(!eq(saved,before))validateScoopDumpContinuation(saved.work,before.work);return before;}
export function transportRestoreSummary(r,earth,profile){
 work(r,earth,profile);return checkedTransportSummary(r);
}
function checkedTransportSummary(r){
 const s=r.work,f=s.frame,t=soilTransportTotals(f.soil)['earth-soil'];
 const task=f.job?({dig:'土をすくう',drop:'土を置く',load:'荷台へ入れる',store:'土を預ける',take:'土を取り出す'}[f.job.kind]??'シャベル作業'):s.scoop?'ショベルですくう':s.link?'バケットから土を移す':s.unload?'荷下ろし':f.access||s.access?'乗り降り':null;
 const active=f.job??s.scoop??s.link??s.unload??f.access??s.access;
 return {quantities:t,mode:s.mode,player:{...f.player},dump:{...f.dump},arm:structuredClone(f.machineArm),task,elapsed:active?.elapsed??0,workRevision:s.revision,soilRevision:f.soil.revision};
}
export function createTransportRecovery({saved,current=saved,earth,profile,origin,generation,createdAt=new Date().toISOString()}){
 check(origin===earth.origin,'保存元のアドレスが違います。');check(Number.isSafeInteger(generation)&&generation>0,'保存番号が不正です。');check(typeof createdAt==='string'&&Number.isFinite(Date.parse(createdAt)),'日時が不正です。');
 validateTransportRestoreBefore(saved,current,earth,profile);
 const payload=structuredClone({kind:TRANSPORT_RECOVERY_KIND,version:1,origin,profile,createdAt,generation,saved,current});plain(payload,0,new Set(),{nodes:0},{saved:true,current:true});
 const text=JSON.stringify({payload,checksum:L.fingerprint(canonical(payload))});check(bytes(text)<=MAX_TRANSPORT_RECOVERY_BYTES,'控えが32 MiBを超えています。');return text;
}
export function inspectTransportRecovery(input,{current,earth,profile,origin}){
 work(current,earth,profile);check(origin===earth.origin,'保存元のアドレスが違います。');let v=input;
 if(typeof v==='string'){check(v.length<=MAX_TRANSPORT_RECOVERY_BYTES&&bytes(v)<=MAX_TRANSPORT_RECOVERY_BYTES,'ファイルが32 MiBを超えています。');try{v=JSON.parse(v);}catch{throw Error('控えを読み取れませんでした。現在の現場は変更していません。');}}
 plain(v,0,new Set(),{nodes:0},{payload:{saved:true,current:true}});check(bytes(JSON.stringify(v))<=MAX_TRANSPORT_RECOVERY_BYTES,'記録が32 MiBを超えています。');let record,createdAt=null,generation=null,unsaved=false;
 if(v?.payload?.kind===TRANSPORT_RECOVERY_KIND){
  check(Object.keys(v).sort().join('|')==='checksum|payload'&&typeof v.checksum==='string'&&v.checksum===L.fingerprint(canonical(v.payload)),'控えが壊れているか、書き換えられています。');const p=v.payload;
  check(Object.keys(p).sort().join('|')===['kind','version','origin','profile','createdAt','generation','saved','current'].sort().join('|')&&p.version===1,'控えの形式が違います。');
  check(p.origin===origin&&p.profile===profile,'別の保存元・プレイヤーの控えは使えません。');check(typeof p.createdAt==='string'&&Number.isFinite(Date.parse(p.createdAt))&&Number.isSafeInteger(p.generation)&&p.generation>0,'日時・保存番号が不正です。');
  validateTransportRestoreBefore(p.saved,p.current,earth,profile);record=p.current;createdAt=p.createdAt;generation=p.generation;unsaved=!eq(p.saved,p.current);
 }else if(v?.format===L.LINK_SCOPE){
  const ledger=L.unpackWorldPurchaseLedger(JSON.stringify(v));check(ledger.schemaVersion>=3&&!ledger.pending&&!ledger.world.equipmentCraftPending,'土の運搬を保存した、購入・装備作成中ではない記録を選んでください。');check(ledger.source.fingerprint===profile&&ledger.world.constructionExcavation?.origin===origin,'別の保存元・プレイヤーの控えです。');record=ledger.world.constructionTransport;
 }else throw Error('土の運搬を保存した現場の控えを選んでください。旧地形・貸出・練習用の控えとは別です。');
 sameTransportRestoreSource(current,record,earth,profile);const candidate=structuredClone(record);
 return {record:candidate,summary:transportRestoreSummary(candidate,earth,profile),createdAt,generation,unsaved};
}
// A whole-game backup is an input source, never a permission to replace the
// whole ledger. Select only its committed live head after checking the bundle's
// SHA-256; do not substitute preview databases, legacy keys or older history.
export async function inspectTransportRestoreFile(text,context){
 check(typeof text==='string'&&text.length<=MAX_TRANSPORT_RESTORE_FILE_BYTES&&bytes(text)<=MAX_TRANSPORT_RESTORE_FILE_BYTES,'64 MiB以下の控えを選んでください。');
 plain(context);const reference=structuredClone(context);
 work(reference.current,reference.earth,reference.profile);check(reference.origin===reference.earth.origin,'保存元のアドレスが違います。');
 let envelope;try{envelope=JSON.parse(text);}catch{throw Error('控えを読み取れませんでした。現在の現場は変更していません。');}
 if(![RECOVERY_KIND,RECOVERY_LEGACY_KIND].includes(envelope?.kind))return inspectTransportRecovery(text,reference);
 check(envelope&&Object.getPrototypeOf(envelope)===Object.prototype&&Object.keys(envelope).sort().join('|')==='checksum|kind|payload','一括控えの項目が不正です。');
 const payload=await unpackRecoveryBundle(text);
 check(payload.origin===reference.origin,'一括控えの保存元が違います。現在の現場は変更していません。');
 const database=payload.domains.databases.find(d=>d.name==='imasora-world-authority-v1');
 check(database?.version===1,'一括控えに対応する通常の保存がありません。');
 const head=database.stores.find(s=>s.name==='snapshots')?.entries.find(e=>e.key==='construction')?.value;
 check(head&&Object.getPrototypeOf(head)===Object.prototype&&Object.keys(head).sort().join('|')==='backups|current|generation','一括控えに通常保存の最新記録がありません。');
 check(Number.isSafeInteger(head.generation)&&head.generation>0&&head.generation<Number.MAX_SAFE_INTEGER&&typeof head.current==='string'&&Array.isArray(head.backups)&&head.backups.length<=5&&head.backups.every(v=>typeof v==='string'),'一括控えの保存管理情報が不正です。');
 // An invalid current head or history is reported, never silently replaced.
 for(const raw of head.backups)L.unpackWorldPurchaseLedger(raw);
 const inspected=inspectTransportRecovery(head.current,reference);
 return {...inspected,createdAt:payload.capturedAt,generation:head.generation,unsaved:false,sourceKind:'recovery-bundle',bundleVersion:payload.version};
}
// Game-owned history is already a ledger packet, not a user-selected file.
// Decode and fully validate it once; never parse/stringify through import formats.
export function inspectSavedTransportRecord(text,context,{includeCurrentSummary=false}={}){
 plain(context);const r=isCapturedConstructionJson(worldTransportSoil(context.current))?context:structuredClone(context);
 work(r.current,r.earth,r.profile);check(r.origin===r.earth.origin,'保存元のアドレスが違います。');
 const ledger=L.unpackWorldPurchaseLedger(text);
 check(ledger.schemaVersion>=3&&!ledger.pending&&!ledger.world.equipmentCraftPending,'作業を保存した記録を選んでください。');
 check(ledger.source.fingerprint===r.profile&&ledger.world.constructionExcavation?.origin===r.origin,'別のプレイヤーの記録は使えません。');
 const record=ledger.world.constructionTransport;
 check(record?.version===2,'人物と車両を一緒に保存した記録を選んでください。');
 // Both scenes already passed their complete domain checks above. The source
 // and conserved amount must still agree before exposing the selected scene.
 sameCheckedSoilSource(r.current,record);
 return {record,summary:checkedTransportSummary(record),...(includeCurrentSummary?{currentSummary:checkedTransportSummary(r.current)}:{}),createdAt:null,generation:null,unsaved:false};
}
function checkRestoreBase(current){
 check(current.schemaVersion>=3&&!current.pending&&!current.world.equipmentCraftPending,'購入・装備作成を終えてから復元してください。');
 check(current.revision<Number.MAX_SAFE_INTEGER-1&&current.worldWrites<Number.MAX_SAFE_INTEGER-1,'保存番号が上限です。');
}
export function createTransportRestoreLedger(current,candidate){
 plain(candidate);L.validateWorldPurchaseLedger(current);checkRestoreBase(current);
 sameTransportRestoreSource(current.world.constructionTransport,candidate,current.world.constructionExcavation,current.source.fingerprint);
 // Clone the final scene once, without first copying the terrain being replaced.
 const next=structuredClone({...current,world:{...current.world,constructionTransport:candidate},revision:current.revision+1,worldWrites:current.worldWrites+1});
 L.validateWorldPurchaseLedger(next);return next;
}
// Capture imported objects without executing getters during structuredClone.
// These are structural checks only; the complete domain checks still run.
export function snapshotTransportRestoreRecord(record){plain(record);return structuredClone(record);}
export function snapshotTransportRestoreJournal(journal){plain(journal,0,new Set(),{nodes:0},{beforeSaved:true,beforeUnsaved:true,applied:true});return structuredClone(journal);}
// Exact, descriptor-safe comparison against a checked snapshot. Used inside
// the write transaction; no giant canonical strings or asynchronous work.
export function sameTransportRestoreValue(a,b){
 if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const array=Array.isArray(a),proto=array?Array.prototype:Object.prototype;if(Object.getPrototypeOf(a)!==proto||Object.getPrototypeOf(b)!==proto)return false;
 const keys=Reflect.ownKeys(a),other=Reflect.ownKeys(b);if(keys.length!==other.length)return false;
 for(const k of keys){if(typeof k==='symbol'||!Object.hasOwn(b,k))return false;const x=Object.getOwnPropertyDescriptor(a,k),y=Object.getOwnPropertyDescriptor(b,k);if(!Object.hasOwn(x,'value')||!Object.hasOwn(y,'value')||x.enumerable!==y.enumerable||!sameTransportRestoreValue(x.value,y.value))return false;}return true;
}
export function prepareTransportRestorePlan({ledger,candidate,before,generation,raw,id,priorRestoreId=null}){
 // Decode the authoritative packet once, then validate the proposed ledger
 // once while packing. These objects stay private throughout this synchronous
 // operation. Re-importing our own packet would repeat every soil operation.
 plain(ledger);plain(candidate);plain(before);
 const saved=L.unpackWorldPurchaseLedger(raw);
 check(eq(saved,ledger),'保存内容と復元元が一致しません。');checkRestoreBase(saved);
 const next={...saved,world:{...saved.world,constructionTransport:candidate},revision:saved.revision+1,worldWrites:saved.worldWrites+1};
 const point={version:1,scope:'imasora-transport-restore-point-v1',id,kind:priorRestoreId===null?'restore':'undo',priorRestoreId,expectedGeneration:generation,expectedRaw:raw,appliedGeneration:generation+1,appliedRaw:L.packWorldPurchaseLedger(next),beforeSaved:saved.world.constructionTransport,beforeUnsaved:before,applied:candidate};
 checkRestorePointMetadata(point);checkRestorePointLedgers(point,saved,next);
 // One clone preserves equal-reference sharing without lending mutable inputs
 // to the caller. The public validator still checks arbitrary imported points.
 const scene=r=>{const soil=worldTransportSoil(r);if(r?.version===2&&isCapturedConstructionJson(soil)){const copy=structuredClone({...r,work:{...r.work,frame:{...r.work.frame,soil:null}}});copy.work.frame.soil=soil;return copy;}return structuredClone(r);};
 const applied=scene(point.applied),beforeSaved=scene(point.beforeSaved),beforeUnsaved=scene(point.beforeUnsaved);
 const detached=structuredClone({...next,world:{...next.world,constructionTransport:null}});detached.world.constructionTransport=applied;
 return {next:detached,point:{...point,beforeSaved,beforeUnsaved,applied}};
}
// Share equal, fully checked soil values across copies sent between threads.
// Actors and tasks retain their own objects; no domain check is skipped.
export function compactCheckedRestorePoints(points){
 const soils=[];
 const compact=r=>{const soil=worldTransportSoil(r);let shared=soils.find(s=>eq(s,soil));if(!shared){shared=soil;soils.push(soil);}
  return {...r,work:{...r.work,frame:{...r.work.frame,soil:shared}}};};
 return points.map(p=>{if(p===null)return null;for(const soil of checkedJournalSoils.get(p)??[])if(!soils.includes(soil))soils.push(soil);return {...p,beforeSaved:compact(p.beforeSaved),beforeUnsaved:compact(p.beforeUnsaved),applied:compact(p.applied)};});
}
export function prepareTransportRestoreCommit({journal,priorPoint}){
 return linkCheckedTransportRestorePoints(validateTransportRestoreJournal(journal),priorPoint===null?null:validateTransportRestoreJournal(priorPoint));
}
// Pure linking only. The store may use this path exclusively for certificates
// granted after full validation and immutable capture by the save client.
export function linkCheckedTransportRestorePoints(checked,old){
 if(checked.kind==='undo'){
  check(old?.kind==='restore'&&old.id===checked.priorRestoreId,'復元前の控えが変わりました。');
  check(eq(checked.beforeSaved,old.applied)&&eq(checked.beforeUnsaved,old.applied),'復元後に作業が変わったため戻せません。');
  check(eq(checked.applied,old.beforeUnsaved),'復元前の作業と戻す内容が違います。');
 }
 return {journal:checked,priorPoint:old};
}
function checkRestorePointMetadata(j){check(j&&Object.keys(j).sort().join('|')===['version','scope','id','kind','priorRestoreId','expectedGeneration','expectedRaw','appliedGeneration','appliedRaw','beforeSaved','beforeUnsaved','applied'].sort().join('|'),'復元前控えの項目が不正です。');
 check(j.version===1&&j.scope==='imasora-transport-restore-point-v1'&&typeof j.id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(j.id),'復元の確認番号が不正です。');check(['restore','undo'].includes(j.kind),'復元の区分が不正です。');check(j.kind==='restore'?j.priorRestoreId===null:typeof j.priorRestoreId==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(j.priorRestoreId),'復元元の番号が不正です。');
 check(Number.isSafeInteger(j.expectedGeneration)&&j.expectedGeneration>0&&j.expectedGeneration<Number.MAX_SAFE_INTEGER-1&&j.appliedGeneration===j.expectedGeneration+1,'保存番号が不正です。');
}
function checkRestorePointLedgers(j,before,after){
 check(eq(before.world.constructionTransport,j.beforeSaved),'保存済みの土と作業が一致しません。');const sameUnsaved=eq(j.beforeSaved,j.beforeUnsaved);if(!sameUnsaved)validateTransportRestoreBefore(j.beforeSaved,j.beforeUnsaved,before.world.constructionExcavation,before.source.fingerprint);
 // Both packets were fully checked by unpack above. Match the imported scene
 // to the checked applied packet, then compare the exact permitted change.
 // Rebuilding a second candidate here repeated cloning and all domain checks.
 checkRestoreBase(before);
 const applied=after.world.constructionTransport;
 check(eq(applied,j.applied),'土の運搬以外を変更する復元はできません。');
 check(applied?.version===2,'人物と車両を一緒に保存した記録を選んでください。');
 sameCheckedSoilSource(before.world.constructionTransport,applied);
 const expected={...before,world:{...before.world,constructionTransport:applied},revision:before.revision+1,worldWrites:before.worldWrites+1};
 check(eq(after,expected),'土の運搬以外を変更する復元はできません。');return sameUnsaved;}
function checkedRestoreJournal(j,compact){
 plain(j,0,new Set(),{nodes:0},{beforeSaved:true,beforeUnsaved:true,applied:true});checkRestorePointMetadata(j);
 const before=L.unpackWorldPurchaseLedger(j.expectedRaw),after=L.unpackWorldPurchaseLedger(j.appliedRaw);
 const sameUnsaved=checkRestorePointLedgers(j,before,after),savedSoil=worldTransportSoil(before.world.constructionTransport),appliedSoil=worldTransportSoil(after.world.constructionTransport);
 checkedJournalSoils.set(j,[savedSoil,appliedSoil]);if(!compact)return j;
 // The exact scene comparisons above already established these soil matches.
 // Use that evidence only in this synchronous call; never memoize a mutable
 // imported point's verdict for a later call. Differing unsaved work remains.
 const scene=(r,soil)=>({...r,work:{...r.work,frame:{...r.work.frame,soil}}});
 return {...j,beforeSaved:scene(j.beforeSaved,savedSoil),beforeUnsaved:sameUnsaved?scene(j.beforeUnsaved,savedSoil):j.beforeUnsaved,applied:scene(j.applied,appliedSoil)};
}
export function validateTransportRestoreJournal(j){return checkedRestoreJournal(j,false);}
export function validateAndCompactTransportRestoreJournal(j){return checkedRestoreJournal(j,true);}
