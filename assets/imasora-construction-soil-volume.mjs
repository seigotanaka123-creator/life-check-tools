import {validateAuthorityExcavation} from './imasora-construction-earth-authority.js';
import {unpackDumpWorld} from './imasora-construction-dump-truck.js';
import {SOIL_Q,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs';
const check=(ok,msg)=>{if(!ok)throw Error(`土の体積照合：${msg}`);};
export function excavationUnitsToQ(units){check(Number.isSafeInteger(units)&&units>=0&&units%1000===0,'旧掘削の単位は1000の倍数で照合してください。');const q=units/1000*64;check(Number.isSafeInteger(q),'体積が大きすぎます。');return q;}
export function dumpUnitsToQ(units){check(Number.isSafeInteger(units)&&units>=0,'ダンプの個数が不正です。');const q=units*29;check(Number.isSafeInteger(q),'体積が大きすぎます。');return q;}
export function authorityVolumeAudit(record){validateAuthorityExcavation(record);return{scope:record.scope,grantId:record.source.grantId,site:record.site,materialId:record.source.materialId,q:Object.fromEntries(Object.entries(record.volume).map(([k,v])=>[k,excavationUnitsToQ(v)]))};}
export function dumpVolumeAudit(text){const envelope=JSON.parse(text),world=unpackDumpWorld(text);
 check(envelope.version===3&&!world.ground.some(c=>c.grain===4)&&!world.air.some(c=>c.grain===4),'旧サイズの土を含む控えは自動変換しません。元の形式で保管してください。');
 const n={source:world.source,load:world.load,air:world.air.length,ground:world.ground.reduce((n,c)=>n+c.n,0)};return{format:envelope.format,version:3,q:Object.fromEntries(Object.entries(n).map(([k,v])=>[k,dumpUnitsToQ(v)])),totalQ:48*29};
}
export function dumpCargoSize(q){check(Number.isSafeInteger(q)&&q>=0&&q<=SOIL_CAPACITY.dump,'荷台の体積が不正です。');return{width:48,depth:29,height:8*q/SOIL_CAPACITY.dump,volume:q*SOIL_Q};}
