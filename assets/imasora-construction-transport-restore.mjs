import {canonical} from './imasora-construction-state.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs';
import {soilTransportTotals} from './imasora-construction-soil-transport.mjs';
import {validateScoopDumpContinuation} from './imasora-construction-fragment-scoop.mjs';
import {unpackRecoveryBundle,RECOVERY_KIND,RECOVERY_LEGACY_KIND,MAX_RECOVERY_FILE} from './imasora-world-recovery-bundle.js';

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
 if(v===null||typeof v==='string'||typeof v==='boolean')return;
 if(typeof v==='number'){check(Number.isFinite(v),'数値が不正です。');return;}
 const a=Array.isArray(v);check(v&&Object.getPrototypeOf(v)===(a?Array.prototype:Object.prototype),'形式が不正です。');check(!seen.has(v),'循環した記録です。');seen.add(v);
 const keys=Object.keys(v);check(Reflect.ownKeys(v).length===keys.length+(a?1:0),'隠れた項目があります。');if(a)check(keys.length===v.length&&keys.every((k,i)=>k===String(i)),'配列が不正です。');
 if(a&&v.length===3&&depth<100){
  const coordinate=keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return Object.hasOwn(d,'value')&&typeof d.value==='number'&&Number.isFinite(d.value);});
  if(coordinate){seen.delete(v);return;}
 }
 for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);check(Object.hasOwn(d,'value'),'動的な項目は使えません。');const part=parts&&Object.hasOwn(parts,k)?parts[k]:null;plain(d.value,depth+1,seen,part===true?{nodes:0}:budget,part===true?null:part);}seen.delete(v);
}
function work(r,earth,profile){validateWorldTransport(r,earth,profile);check(r.version===2,'人物と車両を一緒に保存した記録を選んでください。');return r;}
export function sameTransportRestoreSource(a,b,earth,profile){
 work(a,earth,profile);if(b!==a)work(b,earth,profile);check(eq(worldTransportSoil(a).initial,worldTransportSoil(b).initial),'元の土・車両・区画が一致しません。');
 // Both complete scenes were checked above in this synchronous call.
 check(soilTransportTotals(worldTransportSoil(a))['earth-soil'].total===soilTransportTotals(worldTransportSoil(b))['earth-soil'].total,'土の総量が違います。');return true;
}
export function validateTransportRestoreBefore(saved,before,earth,profile){sameTransportRestoreSource(saved,before,earth,profile);if(!eq(saved,before))validateScoopDumpContinuation(saved.work,before.work);return before;}
export function transportRestoreSummary(r,earth,profile){
 work(r,earth,profile);const s=r.work,f=s.frame,t=soilTransportTotals(f.soil)['earth-soil'];
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
  const ledger=L.unpackWorldPurchaseLedger(JSON.stringify(v));check(ledger.schemaVersion===3&&!ledger.pending&&!ledger.world.equipmentCraftPending,'土の運搬を保存した、購入・装備作成中ではない記録を選んでください。');check(ledger.source.fingerprint===profile&&ledger.world.constructionExcavation?.origin===origin,'別の保存元・プレイヤーの控えです。');record=ledger.world.constructionTransport;
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
export function createTransportRestoreLedger(current,candidate){
 plain(candidate);L.validateWorldPurchaseLedger(current);check(current.schemaVersion===3&&!current.pending&&!current.world.equipmentCraftPending,'購入・装備作成を終えてから復元してください。');
 sameTransportRestoreSource(current.world.constructionTransport,candidate,current.world.constructionExcavation,current.source.fingerprint);
 check(current.revision<Number.MAX_SAFE_INTEGER-1&&current.worldWrites<Number.MAX_SAFE_INTEGER-1,'保存番号が上限です。');
 const next=structuredClone(current);next.world.constructionTransport=structuredClone(candidate);next.revision++;next.worldWrites++;L.validateWorldPurchaseLedger(next);return next;
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
 const next=createTransportRestoreLedger(ledger,candidate);
 const point={version:1,scope:'imasora-transport-restore-point-v1',id,kind:priorRestoreId===null?'restore':'undo',priorRestoreId,expectedGeneration:generation,expectedRaw:raw,appliedGeneration:generation+1,appliedRaw:L.packWorldPurchaseLedger(next),beforeSaved:structuredClone(ledger.world.constructionTransport),beforeUnsaved:structuredClone(before),applied:structuredClone(candidate)};
 validateTransportRestoreJournal(point);return {next,point};
}
export function prepareTransportRestoreCommit({journal,priorPoint}){
 const checked=validateTransportRestoreJournal(journal),old=priorPoint===null?null:validateTransportRestoreJournal(priorPoint);
 if(checked.kind==='undo'){
  check(old?.kind==='restore'&&old.id===checked.priorRestoreId,'復元前の控えが変わりました。');
  check(eq(checked.beforeSaved,old.applied)&&eq(checked.beforeUnsaved,old.applied),'復元後に作業が変わったため戻せません。');
  check(eq(checked.applied,old.beforeUnsaved),'復元前の作業と戻す内容が違います。');
 }
 return {journal:checked,priorPoint:old};
}
export function validateTransportRestoreJournal(j){
 plain(j,0,new Set(),{nodes:0},{beforeSaved:true,beforeUnsaved:true,applied:true});check(j&&Object.keys(j).sort().join('|')===['version','scope','id','kind','priorRestoreId','expectedGeneration','expectedRaw','appliedGeneration','appliedRaw','beforeSaved','beforeUnsaved','applied'].sort().join('|'),'復元前控えの項目が不正です。');
 check(j.version===1&&j.scope==='imasora-transport-restore-point-v1'&&typeof j.id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(j.id),'復元の確認番号が不正です。');check(['restore','undo'].includes(j.kind),'復元の区分が不正です。');check(j.kind==='restore'?j.priorRestoreId===null:typeof j.priorRestoreId==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(j.priorRestoreId),'復元元の番号が不正です。');
 check(Number.isSafeInteger(j.expectedGeneration)&&j.expectedGeneration>0&&j.expectedGeneration<Number.MAX_SAFE_INTEGER-1&&j.appliedGeneration===j.expectedGeneration+1,'保存番号が不正です。');
 const before=L.unpackWorldPurchaseLedger(j.expectedRaw),after=L.unpackWorldPurchaseLedger(j.appliedRaw);
 check(eq(before.world.constructionTransport,j.beforeSaved),'保存済みの土と作業が一致しません。');validateTransportRestoreBefore(j.beforeSaved,j.beforeUnsaved,before.world.constructionExcavation,before.source.fingerprint);
 check(eq(after.world.constructionTransport,j.applied)&&eq(after,createTransportRestoreLedger(before,j.applied)),'土の運搬以外を変更する復元はできません。');return j;
}
