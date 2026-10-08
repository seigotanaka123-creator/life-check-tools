import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js';
import {canonical} from './imasora-construction-state.js';
import {worldTransportTotals,recoverLegacyWorldTransportWork} from './imasora-construction-transport-authority.mjs';
import {shovelMachineState} from './imasora-construction-shovel-work.mjs';
import {localToWorld} from './imasora-construction-loader-physics.js';
const check=(v,t)=>{if(!v)throw Error('現場の引継ぎ：'+t);};
export const TRANSPORT_MIGRATION_SCOPE='imasora-transport-migration-point-v1';
export const TRANSPORT_RECOVERY_SCOPE='imasora-transport-migration-recovery-v2';
export const TRANSPORT_RESTART_SCOPE='imasora-transport-migration-restart-v3';
// Recompute the complete result from the committed source. No user-supplied
// coordinates, quantities, ledger draft or destination packet are trusted.
export function createTransportMigrationLedger(before){
 L.validateWorldPurchaseLedger(before);
 check(before.world.constructionTransport?.version!==2,'この現場は既に新しい操作に対応しています。');
 let next;try{next=L.enableConstructionTransportWork(before,before.world,before.world.constructionExcavation?.revision);}catch(error){if(/土が既に動いて/.test(error.message))throw Error('この旧保存は土を移動した後の位置や積荷が元に戻っていないため、今は引き継げません。控えを保存して、対応を待ってください。',{cause:error});throw error;}
 check(next!==before&&next.world.constructionTransport?.version===2,'引き継げる現場の記録がありません。');
 return next;
}
// An old quantity-only save has no physical animation clock. The reviewed
// recovery cancels a still-reserved transfer, or completes an already released
// transfer to its recorded destination. Archive its exact before packet first.
export function createTransportRecoveryLedger(before,relocate=false){
 L.validateWorldPurchaseLedger(before);const record=before.world.constructionTransport;
 check(record?.version===1,'旧形式の現場だけを確認して引き継げます。');
 check(!before.pending&&!before.world.equipmentCraftPending,'購入・装備作成を完了してから引き継いでください。');
 let source=before;const p=record.soil.pending;
 if(p){const command={type:p.phase==='reserved'?'cancel':'complete',id:'legacy_recovery_'+record.profileId+'_'+record.soil.revision,expectedRevision:record.soil.revision,transferId:p.id};source=L.applyConstructionTransportCommand(before,command,before.world);}
 const work=recoverLegacyWorldTransportWork(source.world.constructionExcavation,source.source.fingerprint,source.world.constructionTransport,relocate),next=L.saveLinkedWorldDraft(source,source.world);
 next.schemaVersion=3;next.world.constructionTransport=work;L.validateWorldPurchaseLedger(next);return next;
}
export function createTransportMigrationPlan(raw,generation,id,recoverLegacy=false,relocate=false){
 check(typeof raw==='string','保存内容が不正です。');
 check(typeof recoverLegacy==='boolean','引継ぎ方法が不正です。');
 check(typeof relocate==='boolean','再開位置の確認方法が不正です。');
 const before=L.unpackWorldPurchaseLedger(raw),recovery=recoverLegacy&&before.world.constructionTransport?.version===1;
 check(!relocate||recovery,'再開位置を確認する引継ぎは旧形式だけに対応しています。');
 const after=recovery?createTransportRecoveryLedger(before,relocate):createTransportMigrationLedger(before);
 const point={version:relocate?3:recovery?2:1,scope:relocate?TRANSPORT_RESTART_SCOPE:recovery?TRANSPORT_RECOVERY_SCOPE:TRANSPORT_MIGRATION_SCOPE,id,expectedGeneration:generation,expectedRaw:raw,appliedGeneration:generation+1,appliedRaw:L.packWorldPurchaseLedger(after)};
 validateTransportMigrationJournal(point);return point;
}
export function validateTransportMigrationJournal(point){
 check(point&&Object.getPrototypeOf(point)===Object.prototype,'控えの形式が不正です。');
 const keys=['version','scope','id','expectedGeneration','expectedRaw','appliedGeneration','appliedRaw'];
 check(Reflect.ownKeys(point).length===keys.length&&keys.every(k=>Object.hasOwn(point,k)&&Object.hasOwn(Object.getOwnPropertyDescriptor(point,k),'value')),'控えの項目が不正です。');
 check((point.version===1&&point.scope===TRANSPORT_MIGRATION_SCOPE||point.version===2&&point.scope===TRANSPORT_RECOVERY_SCOPE||point.version===3&&point.scope===TRANSPORT_RESTART_SCOPE)&&typeof point.id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(point.id),'控えの確認番号が不正です。');
 check(Number.isSafeInteger(point.expectedGeneration)&&point.expectedGeneration>0&&point.expectedGeneration<Number.MAX_SAFE_INTEGER-1&&point.appliedGeneration===point.expectedGeneration+1,'保存番号が不正です。');
 check(typeof point.expectedRaw==='string'&&typeof point.appliedRaw==='string','保存内容が不正です。');
 const before=L.unpackWorldPurchaseLedger(point.expectedRaw),after=L.unpackWorldPurchaseLedger(point.appliedRaw);
 check(canonical(after)===canonical(point.version>=2?createTransportRecoveryLedger(before,point.version===3):createTransportMigrationLedger(before)),'確認した現場以外を変更する引継ぎはできません。');return point;
}
export function transportMigrationSummary(point){
 validateTransportMigrationJournal(point);const before=L.unpackWorldPurchaseLedger(point.expectedRaw),after=L.unpackWorldPurchaseLedger(point.appliedRaw),r=after.world.constructionTransport;
 const retainedOperations=r.work.frame.soil.journal.length;
 const old=before.world.constructionTransport,pending=old?.soil?.pending;
 const relocations=[];
 if(point.version===3){const native=shovelMachineState(r.work.frame),p=native.loader.player,d=localToWorld(native.loader.vehicle,80,13),fromPlayer={x:p.x,y:p.y,z:p.z,heading:p.heading},fromDump={x:d.x,z:d.z,heading:native.loader.vehicle.heading},toPlayer=Object.fromEntries(Object.keys(fromPlayer).map(k=>[k,r.work.frame.player[k]]));
  if(r.work.mode==='foot'&&canonical(fromPlayer)!==canonical(toPlayer))relocations.push({kind:'player',label:'モンスターの再開位置',from:fromPlayer,to:toPlayer});
  if(canonical(fromDump)!==canonical(r.work.frame.dump))relocations.push({kind:'dump',label:'ダンプの駐車位置',from:fromDump,to:structuredClone(r.work.frame.dump)});
 }
 return {source:point.version>=2?'土を移動した旧現場':old?(retainedOperations?'土を元の場所へ戻した現場':'共有土の初期記録'):'ショベルの保存記録',retainedOperations,recovery:point.version>=2,relocations,originalQuantities:old?worldTransportTotals(old,before.world.constructionExcavation,before.source.fingerprint)['earth-soil']:null,resolution:point.version>=2&&pending?{kind:pending.phase==='reserved'?'cancel':'complete',amount:pending.amount,from:pending.from,to:pending.to}:null,quantities:worldTransportTotals(r,after.world.constructionExcavation,after.source.fingerprint)['earth-soil'],mode:r.work.mode,player:structuredClone(r.work.frame.player),generation:point.expectedGeneration};
}
