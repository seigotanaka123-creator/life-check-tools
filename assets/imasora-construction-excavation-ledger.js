// 9-1c2b2b2: isolated integration fixture. This format cannot be a live wallet
// save, a loan-checkpoint import, or an inventory grant.
import {canonical,SOIL_UNIT} from './imasora-construction-state.js';
import {createWorldLedgerAPI} from './imasora-world-ledger-engine.js';
import {contactTerrainProjection} from './imasora-construction-excavation-compatibility.js';
import {initialContactWorldExcavation,EXCAVATION_YARDS} from './imasora-construction-world-excavation.js';
import {readyExcavation,oneTouchCheckpoint} from './imasora-construction-excavator-one-touch.js';
import {CONTACT_EXCAVATION_FORMAT,packExcavation,unpackExcavation,resumeExcavation} from './imasora-construction-excavator-save.js';

export const EXCAVATION_LEDGER_KIND='imasora-excavation-validation-ledger-v1';
const SCOPE='imasora-excavation-validation-v1',WORLD_SCOPE='imasora-excavation-validation-world-v1';
const WORLD=createWorldLedgerAPI({scope:WORLD_SCOPE,kinds:['excavation-fixture']});
const MAX_BYTES=32*1024*1024,encoder=new TextEncoder();
const INITIAL_TERRAIN=initialContactWorldExcavation().terrain;
const SOURCE=Object.freeze({kind:'generated-test-terrain',id:'fixturecontact-v1',materialId:'earth-soil',terrainFingerprint:WORLD.fingerprint(INITIAL_TERRAIN),initialCount:Object.keys(INITIAL_TERRAIN).length,initialVolume:Object.keys(INITIAL_TERRAIN).length*SOIL_UNIT});
const PROTECTED_WORKS=['constructionWater','constructionSoil','constructionTimber'];
let verifiedWorldPacket=null,verifiedWorld=null;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const check=(ok,message)=>{if(!ok)throw Error(`掘削正本接続：${message}`);};
function json(value,depth=0,seen=new Set()){
  check(depth<=100,'保存の階層が深すぎます。');
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'){check(Number.isFinite(value),'保存できない数値です。');return;}
  check(Array.isArray(value)||object(value),'保存できない型が含まれています。');check(!seen.has(value),'循環した保存は使えません。');seen.add(value);
  if(Array.isArray(value))check(Object.keys(value).length===value.length,'省略された配列要素は保存できません。');
  check(Reflect.ownKeys(value).length===Object.keys(value).length+(Array.isArray(value)?1:0),'保存できない属性です。');
  for(const child of Object.values(value))json(child,depth+1,seen);seen.delete(value);
}
const keys=(value,names)=>check(object(value)&&Object.keys(value).sort().join('|')===[...names].sort().join('|'),'保存の項目が一致しません。');
function yardOrigin(site){check(Number.isInteger(site)&&EXCAVATION_YARDS[site],'区画が不正です。');const [x,z]=EXCAVATION_YARDS[site];return [x,0,z];}
function origin(value){let url;try{url=new URL(value);}catch{}check(url&&['http:','https:'].includes(url.protocol)&&url.origin===value,'保存元のアドレスが不正です。');return value;}
function protectedWorld(source){
  // The immutable source retains every original work. A new purchase ledger
  // has no delivery events, so existing purchased-material works must not be
  // reinterpreted as if they had just been acquired by this fixture.
  json(source);const original=WORLD.readWorldSource(canonical(source)),view=structuredClone(original);
  for(const key of PROTECTED_WORKS)delete view[key];
  const ledger=WORLD.createWorldPurchaseLedger(canonical(view),'excavation-fixture');
  ledger.source={kind:'excavation-fixture',fingerprint:WORLD.fingerprint(original),world:original};
  WORLD.validateWorldPurchaseLedger(ledger);return ledger;
}
function validateWorldPacket(packet){
  check(typeof packet==='string','世界の保護控えがありません。');
  // The protected world never changes during a fixture. Reuse only an exact
  // immutable packet match; keep at most one privately held validation result.
  if(packet===verifiedWorldPacket)return verifiedWorld;
  const ledger=WORLD.unpackWorldPurchaseLedger(packet),expected=protectedWorld(ledger.source.world);
  check(canonical(ledger)===canonical(expected),'世界の保護控えや財布・購入状態を変更できません。');verifiedWorldPacket=packet;verifiedWorld=ledger;return ledger;
}
function projected(work,site){
  const p=contactTerrainProjection(work,site);
  return {terrain:{origin:p.origin,cellSize:p.cellSize,chunkSize:p.chunkSize,chunks:p.chunks},counts:p.counts,volume:p.volume};
}
function physical(work,sequence){
  check(work?.guide===null&&sequence?.haul!==true,'運搬補助の経路はこの形式の保存対象ではありません。単独のすくう・こぼすを使ってください。');
  const saved=oneTouchCheckpoint(work,sequence),packet=packExcavation(saved.work);
  check(packet.kind===CONTACT_EXCAVATION_FORMAT,'接触掘削の内部状態ではありません。');return {saved,excavation:{packet,sequence:saved.sequence}};
}
export function createExcavationLedger(world,site,browserOrigin){
  const yard=yardOrigin(site),worldLedger=WORLD.packWorldPurchaseLedger(protectedWorld(world));
  const {saved,excavation}=physical(readyExcavation(initialContactWorldExcavation()),null);
  const record={version:1,scope:SCOPE,origin:origin(browserOrigin),site,yardOrigin:yard,revision:0,source:structuredClone(SOURCE),worldLedger,excavation,...projected(saved.work,site)};
  validateExcavationLedger(record);return record;
}
export function validateExcavationLedger(record){
  json(record);keys(record,['version','scope','origin','site','yardOrigin','revision','source','worldLedger','excavation','terrain','counts','volume']);
  check(record.version===1&&record.scope===SCOPE,'専用の掘削接続形式ではありません。');origin(record.origin);
  check(Number.isSafeInteger(record.revision)&&record.revision>=0&&record.revision<Number.MAX_SAFE_INTEGER,'保存番号が不正です。');
  check(canonical(record.yardOrigin)===canonical(yardOrigin(record.site)),'保存した区画の原点が一致しません。');
  check(canonical(record.source)===canonical(SOURCE),'生成した試験地形の由来・取得量が一致しません。');validateWorldPacket(record.worldLedger);
  keys(record.excavation,['packet','sequence']);check(record.excavation.packet?.kind===CONTACT_EXCAVATION_FORMAT,'物理保存の形式が一致しません。');
  const work=unpackExcavation(record.excavation.packet),{saved,excavation}=physical(work,record.excavation.sequence);
  check(canonical(excavation)===canonical(record.excavation),'物理状態と一連の操作予約が一致しません。');
  const projection=projected(saved.work,record.site);
  for(const name of ['terrain','counts','volume'])check(canonical(record[name])===canonical(projection[name]),'疎地形・物理状態・土の量が一致しません。');
  check(record.counts.total===SOURCE.initialCount&&record.volume.total===SOURCE.initialVolume,'取得した土の総量が一致しません。');
  check(encoder.encode(canonical(record)).length<=MAX_BYTES,'保存内容が大きすぎます。');return record;
}
export function checkpointExcavationLedger(record,{work,sequence,site}){
  validateExcavationLedger(record);check(site===record.site,'作業途中で区画を変更できません。');
  check(record.revision<Number.MAX_SAFE_INTEGER-1,'保存番号が上限に達しています。');
  const {saved,excavation}=physical(work,sequence),prior=unpackExcavation(record.excavation.packet);
  // This fixture only cuts virgin cells and deposits loose soil. It has no
  // terrain-fill or bin-withdrawal operation, so rollback must not regenerate
  // virgin terrain or silently undo soil already delivered to the bin.
  check(saved.work.revision>=prior.revision&&saved.work.serial>=prior.serial&&saved.work.bin>=prior.bin,'古い掘削状態へ戻すことはできません。');
  check(Object.keys(saved.work.terrain).every(id=>Object.hasOwn(prior.terrain,id)),'削った地形を別の作業状態で復活させることはできません。');
  const next={...structuredClone(record),revision:record.revision+1,excavation,...projected(saved.work,site)};
  validateExcavationLedger(next);return next;
}
export function packExcavationLedger(record){
  validateExcavationLedger(record);const payload=canonical(record);
  // Accidental-corruption check only, not authentication or an anti-cheat seal.
  return JSON.stringify({kind:EXCAVATION_LEDGER_KIND,payload,checksum:WORLD.fingerprint(record)});
}
export function unpackExcavationLedger(text){
  check(typeof text==='string'&&text.length<=MAX_BYTES*2&&encoder.encode(text).length<=MAX_BYTES*2,'保存文字列が大きすぎるか不正です。');
  let packet;try{packet=JSON.parse(text);}catch{throw Error('掘削正本接続：保存JSONを読めません。');}
  keys(packet,['kind','payload','checksum']);check(packet.kind===EXCAVATION_LEDGER_KIND&&typeof packet.payload==='string','貸出v3・通常保存・一括控えはこの形式で復元できません。');
  check(encoder.encode(packet.payload).length<=MAX_BYTES,'保存内容が大きすぎます。');
  const record=JSON.parse(packet.payload);check(packet.checksum===WORLD.fingerprint(record),'保存の照合値が一致しません。');validateExcavationLedger(record);return record;
}
export function excavationLedgerWork(record){
  validateExcavationLedger(record);
  const saved=oneTouchCheckpoint(resumeExcavation(unpackExcavation(record.excavation.packet)),record.excavation.sequence);
  return {...saved,site:record.site};
}
export function excavationLedgerSummary(record){
  validateExcavationLedger(record);const ledger=validateWorldPacket(record.worldLedger);
  return {origin:record.origin,site:record.site,yardOrigin:[...record.yardOrigin],source:structuredClone(record.source),revision:record.revision,counts:structuredClone(record.counts),volume:structuredClone(record.volume),
    worldSourceFingerprint:ledger.source.fingerprint,balance:ledger.world.ufoResources.spaceCoins,sequence:record.excavation.sequence?.phase??null,liveWorldSave:false};
}
