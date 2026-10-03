// 9-1c2b2b3: native earth allocation, separate from v484/v3 import formats.
// The enclosing world ledger is the sole authority for allocation and commits.
import {canonical,SOIL_UNIT} from './imasora-construction-state.js';
import {contactTerrainProjection} from './imasora-construction-excavation-compatibility.js';
import {initialContactWorldExcavation,EXCAVATION_YARDS} from './imasora-construction-world-excavation.js';
import {readyExcavation,oneTouchCheckpoint} from './imasora-construction-excavator-one-touch.js';
import {CONTACT_EXCAVATION_FORMAT,packExcavation,unpackExcavation,resumeExcavation} from './imasora-construction-excavator-save.js';

export const EARTH_AUTHORITY_SCOPE='imasora-earth-excavation-authority-v1';
export const EARTH_LIVE_SCOPE='imasora-earth-excavation-live-v1';
const MAX_BYTES=2*1024*1024,encoder=new TextEncoder();
// Ordinary world rewards repeatedly validate identical earth. Cache complete,
// validated JSON text only; never trust an object identity or a short hash.
const validatedRecords=[],VALIDATION_CACHE_LIMIT=2;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const check=(ok,message)=>{if(!ok)throw Error(`本体の掘削保存：${message}`);};
const keys=(value,names)=>check(object(value)&&Object.keys(value).sort().join('|')===[...names].sort().join('|'),'保存の項目が一致しません。');
function fingerprint(value){const text=canonical(value);let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
const INITIAL_TERRAIN=initialContactWorldExcavation().terrain;
const INITIAL=Object.freeze({materialId:'earth-soil',terrainFingerprint:fingerprint(INITIAL_TERRAIN),initialCount:Object.keys(INITIAL_TERRAIN).length,initialVolume:Object.keys(INITIAL_TERRAIN).length*SOIL_UNIT});
function json(value,depth=0,seen=new Set()){
  check(depth<=100,'保存の階層が深すぎます。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){check(Number.isFinite(value),'保存できない数値です。');return;}
  check((Array.isArray(value)&&Object.getPrototypeOf(value)===Array.prototype)||object(value),'保存できない型が含まれています。');check(!seen.has(value),'循環した保存は使えません。');seen.add(value);
  const names=Object.keys(value);
  if(Array.isArray(value))check(names.length===value.length&&names.every((name,i)=>name===String(i)),'省略された配列要素・配列の独自属性は保存できません。');
  check(Reflect.ownKeys(value).length===names.length+(Array.isArray(value)?1:0),'保存できない属性です。');
  for(const name of names){const descriptor=Object.getOwnPropertyDescriptor(value,name);check(Object.hasOwn(descriptor,'value'),'動的な属性は保存できません。');json(descriptor.value,depth+1,seen);}seen.delete(value);
}
function yardOrigin(site){check(Number.isInteger(site)&&EXCAVATION_YARDS[site],'区画が不正です。');const [x,z]=EXCAVATION_YARDS[site];return [x,0,z];}
function origin(value){let url;try{url=new URL(value);}catch{}check(url&&['http:','https:'].includes(url.protocol)&&url.origin===value,'保存元のアドレスが不正です。');return value;}
function source(site,browserOrigin,grantId,{live=false}={}){
  check(typeof live==='boolean','地形の保存区分が不正です。');
  check(typeof grantId==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(grantId),'地形の取得番号が不正です。');
  return {kind:live?'native-earth-yard-live':'native-earth-yard',grantId,site,origin:origin(browserOrigin),yardOrigin:yardOrigin(site),...INITIAL};
}
function projected(work,site){
  const p=contactTerrainProjection(work,site);
  return {terrain:{origin:p.origin,cellSize:p.cellSize,chunkSize:p.chunkSize,chunks:p.chunks},counts:p.counts,volume:p.volume};
}
function physical(work,sequence){
  check(work?.guide===null&&sequence?.haul!==true,'運搬補助の経路は保存対象ではありません。単独のすくう・こぼすを使ってください。');
  const saved=oneTouchCheckpoint(work,sequence),packet=packExcavation(saved.work);
  check(packet.kind===CONTACT_EXCAVATION_FORMAT,'接触掘削の内部状態ではありません。');return {saved,excavation:{packet,sequence:saved.sequence}};
}
export function createAuthorityExcavation(site,browserOrigin,grantId,{live=false}={}){
  const provenance=source(site,browserOrigin,grantId,{live}),{saved,excavation}=physical(readyExcavation(initialContactWorldExcavation()),null);
  const record={version:live?2:1,scope:live?EARTH_LIVE_SCOPE:EARTH_AUTHORITY_SCOPE,origin:browserOrigin,site,yardOrigin:yardOrigin(site),revision:0,source:provenance,excavation,...projected(saved.work,site)};
  return validateAuthorityExcavation(record);
}
export function validateAuthorityExcavation(record){
  json(record);keys(record,['version','scope','origin','site','yardOrigin','revision','source','excavation','terrain','counts','volume']);
  // JSON checks must run before lookup: canonical alone hides NaN, symbols,
  // non-enumerable fields and invalid array attributes. In-place edits produce
  // a different complete text and must pass every physical check again.
  const recordText=canonical(record),cached=validatedRecords.indexOf(recordText);
  if(cached!==-1){validatedRecords.push(...validatedRecords.splice(cached,1));return record;}
  const live=record.version===2&&record.scope===EARTH_LIVE_SCOPE;
  check(live||(record.version===1&&record.scope===EARTH_AUTHORITY_SCOPE),'貸出v3・v484検証記録は本体の地形として読み込めません。');origin(record.origin);
  check(Number.isSafeInteger(record.revision)&&record.revision>=0&&record.revision<Number.MAX_SAFE_INTEGER,'保存番号が不正です。');
  check(canonical(record.yardOrigin)===canonical(yardOrigin(record.site)),'区画の原点が一致しません。');
  check(canonical(record.source)===canonical(source(record.site,record.origin,record.source?.grantId,{live})),'地形の由来・取得量が一致しません。');
  keys(record.excavation,['packet','sequence']);check(record.excavation.packet?.kind===CONTACT_EXCAVATION_FORMAT,'物理保存の形式が一致しません。');
  const work=unpackExcavation(record.excavation.packet),{saved,excavation}=physical(work,record.excavation.sequence);
  check(canonical(excavation)===canonical(record.excavation),'物理状態と一連の操作予約が一致しません。');
  const projection=projected(saved.work,record.site);
  for(const name of ['terrain','counts','volume'])check(canonical(record[name])===canonical(projection[name]),'疎地形・物理状態・土の量が一致しません。');
  check(record.counts.total===INITIAL.initialCount&&record.volume.total===INITIAL.initialVolume,'取得した土の総量が一致しません。');
  check(encoder.encode(recordText).length<=MAX_BYTES,'保存内容が大きすぎます。');
  validatedRecords.push(recordText);if(validatedRecords.length>VALIDATION_CACHE_LIMIT)validatedRecords.shift();return record;
}
export function validateAuthorityExcavationContinuation(old,next){
  validateAuthorityExcavation(old);validateAuthorityExcavation(next);
  for(const name of ['version','scope','origin','site','yardOrigin','source'])check(canonical(old[name])===canonical(next[name]),'地形の取得番号・保存元・区画を変更できません。');
  check(next.revision===old.revision+1,'掘削の保存番号が連続していません。');
  const prior=unpackExcavation(old.excavation.packet),work=unpackExcavation(next.excavation.packet);
  check(work.revision>=prior.revision&&work.serial>=prior.serial&&work.bin>=prior.bin,'古い掘削状態へ戻すことはできません。');
  check(Object.keys(work.terrain).every(id=>Object.hasOwn(prior.terrain,id)),'削った地形を別の作業状態で復活させることはできません。');
  return next;
}
export function checkpointAuthorityExcavation(record,{work,sequence,site}){
  validateAuthorityExcavation(record);check(site===record.site,'作業途中で区画を変更できません。');
  check(record.revision<Number.MAX_SAFE_INTEGER-1,'保存番号が上限に達しています。');
  const {saved,excavation}=physical(work,sequence),next={...structuredClone(record),revision:record.revision+1,excavation,...projected(saved.work,site)};
  return validateAuthorityExcavationContinuation(record,next);
}
export function authorityExcavationWork(record){
  validateAuthorityExcavation(record);
  const saved=oneTouchCheckpoint(resumeExcavation(unpackExcavation(record.excavation.packet)),record.excavation.sequence);
  return {...saved,site:record.site};
}
export function authorityExcavationSummary(record){
  validateAuthorityExcavation(record);
  return {counts:structuredClone(record.counts),volume:structuredClone(record.volume),site:record.site,yardOrigin:[...record.yardOrigin],revision:record.revision,sequence:record.excavation.sequence?.phase??null,origin:record.origin};
}
