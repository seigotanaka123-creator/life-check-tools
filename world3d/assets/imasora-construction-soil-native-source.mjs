import {validateAuthorityExcavation,EARTH_LIVE_SCOPE} from './imasora-construction-earth-authority.js';
import {unpackExcavation} from './imasora-construction-excavator-save.js';

export const SOIL_NATIVE_TRANSPORT_SCOPE='imasora-shared-soil-native-copy-isolated-v2';
export const SOIL_NATIVE_TRANSPORT_FORMAT='imasora-shared-soil-native-copy-checkpoint-v2';
const check=(ok,msg)=>{if(!ok)throw Error(`土の引継ぎ：${msg}`);};
// Read a fully validated current native allocation. A v3 loan packet alone is
// insufficient provenance. This adapter never writes to the source world.
export function nativeSoilOpening(source){
 validateAuthorityExcavation(source);
 check(source.version===2&&source.scope===EARTH_LIVE_SCOPE,'本体の現行掘削記録が必要です。貸出・旧検証保存は使えません。');
 const work=unpackExcavation(source.excavation.packet),l=work.loader;
 check(source.excavation.sequence===null&&work.action===null&&work.falling.length===0&&l.transition===null&&l.vehicle.speed===0,'作業・落下・乗降・走行を終えて停止してから引き継いでください。');
 check(l.mode!=='foot'||((l.player.vy??0)===0&&l.player.grounded!==false),'着地して停止してから引き継いでください。');
 check(work.spoil.every(p=>p.vy===0),'盛土が着地してから引き継いでください。');
 const blocks={};for(const p of Object.values(work.terrain))blocks[p.join(',')]={materialId:'earth-soil',mask:'ffffffffffffffff'};
 const loose={};for(const p of work.spoil)loose['spoil_'+p.id]={materialId:'earth-soil',position:[p.x,p.y,p.z],legacyId:p.id,mask:'ffffffffffffffff'};
 const empty=()=>({materialId:null,amount:0}),held=n=>n?{materialId:'earth-soil',amount:n*64}:empty();
 return{site:{id:source.source.grantId,origin:[...source.yardOrigin],materials:['earth-soil']},blocks,loose,
  containers:{shovel:empty(),bucket:held(work.load),dump:empty(),storage:held(work.bin)},expectedTotal:source.counts.total*64};
}
