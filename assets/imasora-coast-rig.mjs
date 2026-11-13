import {validateFitting} from './imasora-coast-fitting.mjs?v=120js';
import {coastWalkingHeight,coastPierContains} from './imasora-coast-layout.mjs?v=120mx';
export const COAST_RIG_SHOP=Object.freeze({x:420,z:240,radius:92});
export const COAST_OARS=Object.freeze([
 Object.freeze({level:0,name:'いつものオール',good:'軽くて曲がりやすい',bad:'向かい波では進む力が弱い',cost:0,total:0,force:1,width:1,height:1,color:0x69cedc}),
 Object.freeze({level:1,name:'幅広オール',good:'水を受け止め、止まりやすい',bad:'ひとこぎがゆっくり',cost:6720,total:6720,force:1.34,width:1.4,height:1,color:0x58b9ec}),
 Object.freeze({level:2,name:'翼のオール',good:'軽快にこいで速度をつける',bad:'ブレーキは弱め',cost:13440,total:20160,force:1.58,width:1.55,height:1.2,color:0xf19ac0}),
 Object.freeze({level:3,name:'海渡りオール',good:'力強く水を押して進む',bad:'重くて小回りが苦手',cost:6,total:20160,force:1.83,width:1.72,height:1.3,color:0x76e1c6})
]);
export function validateCoastRig(r){
 if(r===undefined)return;
 if(!r||Object.getPrototypeOf(r)!==Object.prototype||Object.keys(r).sort().join('|')!==(r.version===2?'equipped|fitting|oars|owned|version':'equipped|oars|version')||![1,2].includes(r.version)||!Number.isInteger(r.oars)||r.oars<0||r.oars>3||!Number.isInteger(r.equipped)||r.equipped<0||r.equipped>r.oars)throw Error('いかだの装備をたしかめてね。');validateFitting(r);
}
export function coastRigSpec(level=0){if(!Number.isInteger(level)||!COAST_OARS[level])throw Error('オールの種類が違います。');return COAST_OARS[level];}
export const coastRigTimber=r=>{validateCoastRig(r);return COAST_OARS[r?.oars??0].total;};
// The workshop stands on sloping sand, not a height-zero plane. Use the same
// nearby real walking floor for the toolbar and authoritative purchases.
export function coastRigAvailable(world){const p=world?.position;if(world?.map!=='coast'||!p||![p.x,p.y,p.z].every(Number.isFinite)||Math.hypot(p.x-COAST_RIG_SHOP.x,p.z-COAST_RIG_SHOP.z)>COAST_RIG_SHOP.radius)return false;const floor=Math.max(coastWalkingHeight(p.x,p.z),coastPierContains(p.x,p.z)?0:-Infinity);return Math.abs(p.y-floor)<=3;}
// Making parts requires the actual workshop floor. Owned equipment can be
// changed throughout the coast; ownership is still checked by the ledger.
export function coastRigAccess(world,action){
 if(action?.type==='fit'||action?.type==='equip'){const p=world?.position;if(world?.map!=='coast'||!p||![p.x,p.y,p.z].every(Number.isFinite))throw Error('海岸で、持っているパーツを選ぼう。');return;}
 if(!coastRigAvailable(world))throw Error('パーツをつくるときは、浜のいかだ工房へ行こう。');
}
export function nextCoastRig(old,action,available){
 validateCoastRig(old);const r=old??{version:1,oars:0,equipped:0};
 if(!action||Object.keys(action).sort().join('|')!=='level|type'||!Number.isInteger(action.level))throw Error('装備の操作が違います。');
 if(action.type==='buy'){if(action.level!==r.oars+1||!COAST_OARS[action.level])throw Error('作成済みのオールです。');if(!Number.isSafeInteger(available)||available<COAST_OARS[action.level].cost)throw Error(action.level===3?'航海パーツが足りないよ。鬼ごっこ・散歩・大会・ゲームセンター・宇宙で集めよう。':'木材が足りないよ。火星の素材ショップで集めよう。');return{...r,oars:action.level,equipped:action.level};}
 if(action.type==='equip'&&action.level>=0&&action.level<=r.oars)return{...r,equipped:action.level};
 throw Error('まだ持っていないオールです。');
}
