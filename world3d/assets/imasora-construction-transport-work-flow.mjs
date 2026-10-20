import * as m from './imasora-construction-fragment-scoop.mjs?v=120gn';
import {arriveTransportDoor} from './imasora-construction-transport-door.mjs?v=120gn';
import {sameConstructionRecordValue as same,sameValidatedConstructionRecordValue as sameChecked} from './imasora-construction-record-equality.mjs';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs?v=120gn';
import {assertTransportShovel,transportNeedsShovel} from './imasora-construction-transport-hand.mjs';
import {captureConstructionJson,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {validateSoilTransportAsync} from './imasora-construction-soil-transport.mjs?v=120gn';
const flowCapture=Object.freeze({});
const receipts=new WeakMap();
const ownedSnapshots=new WeakSet();
const ownedFrozenValues=new WeakSet();
const check=(v,t)=>{if(!v)throw Error('現場の保存：'+t);};
// Skip only descendants frozen here, rather than any frozen wrapper supplied
// by a reducer. A shallow-frozen wrapper does not prove immutable contents.
const freeze=v=>{if(v&&typeof v==='object'&&!ownedFrozenValues.has(v)){if(!isCapturedConstructionJson(v)){Object.values(v).forEach(freeze);Object.freeze(v);}ownedFrozenValues.add(v);}return v;};
const sameExact=(a,b)=>{if(Object.is(a,b))return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);if(keys.length!==Object.keys(b).length||Array.isArray(a)&&a.length!==b.length)return false;return keys.every(k=>Object.hasOwn(b,k)&&sameExact(a[k],b[k]));};
const number=n=>typeof n==='number'&&Number.isFinite(n);
const arity=(args,n)=>check(args.length===n,'操作の項目が不正です。');
// A receipt is created only by these physical reducers. Raw snapshots, clones
// and imported isolated saves cannot mint it. This is a write-boundary guard,
// not a remote anti-cheat credential. No arbitrary quantity command is exposed.
export class WorldTransportWorkFlow{
 #base;#record;#toolkit;#movementGuard=()=>true;#usedShovel=false;
 constructor(record,{toolkit=()=>null}={},capture=null){check(record?.version===2,'人物と車両に対応した保存が必要です。');check(typeof toolkit==='function','道具の取得記録を確認してください。');if(capture!==flowCapture||!isCapturedConstructionJson(record))validateWorldTransport(record,worldTransportSoil(record).initial.source,record.profileId);this.#base=this.#record=freeze(capture===flowCapture&&isCapturedConstructionJson(record)?record:structuredClone(record));ownedSnapshots.add(this.#record);this.#toolkit=toolkit;}
 static async open(record,{checkedRestorePoint=null,...options}={}){
  const captured=await captureConstructionJson(record);check(captured?.version===2,'人物と車両に対応した保存が必要です。');
  if(checkedRestorePoint!==null){const {isCheckedTransportRestorePoint}=await import('./imasora-world-save-client.mjs?v=120gn');
   if(isCheckedTransportRestorePoint(checkedRestorePoint)&&same(captured,checkedRestorePoint.applied)&&sameExact(captured,checkedRestorePoint.applied)){const applied=checkedRestorePoint.applied;await validateSoilTransportAsync(worldTransportSoil(applied),{record:applied,checkedPoint:checkedRestorePoint});return new WorldTransportWorkFlow(applied,options,flowCapture);}
  }
  await validateSoilTransportAsync(worldTransportSoil(captured),{record:captured});return new WorldTransportWorkFlow(captured,options,flowCapture);
 }
 // A confirmed save with identical values can retain the already owned scene.
 // Do not reuse it across JSON's -0/0 normalization or a changed actor/task.
 acceptConfirmed(record){if(!same(record,this.#record)||!sameExact(record,this.#record))return false;this.#base=this.#record;this.#usedShovel=false;receipts.delete(this.#record);return true;}
 get record(){return this.#record;}get state(){return this.#record.work;}get base(){return this.#base;}
 setMovementGuard(guard){check(typeof guard==='function','移動先の確認が不正です。');this.#movementGuard=guard;}
 move(name,...args){
  let next,s=this.state;
  const hand=['startBucketSiteHand','progressDumpHandWork','finishDumpHandWork','returnDumpHandWork'].includes(name);
  if(hand)assertTransportShovel(this.#toolkit(),this.#record.profileId);
  if(name==='openScoopGround'){arity(args,0);next=m.openScoopGround(s);}
  else if(name==='arriveTransportDoor'){arity(args,2);next=arriveTransportDoor(s,...args);}
  else if(name==='startBucketSiteHand'){check(args.length===2||args.length===3&&args[0]==='drop'&&Array.isArray(args[2])&&args[2].length===2&&args[2].every(number),'置き先の入力が不正です。');check(['dig','load','drop','store','take'].includes(args[0])&&typeof args[1]==='string','手作業の入力が不正です。');next=m[name](s,...args);}
  else if(name==='progressDumpHandWork'){arity(args,1);check(number(args[0]),'進行時間が不正です。');next=m[name](s,args[0]);}
  else if(['finishDumpHandWork','returnDumpHandWork'].includes(name)){arity(args,0);next=m[name](s);}
  else if(['startBucketStorage','startScoopDump','startBasinScoop','startBucketPour','startBucketSiteUnload','startBucketSiteStorage'].includes(name)){arity(args,1);check(typeof args[0]==='string','操作番号が不正です。');next=m[name](s,args[0]);}
  else if(name==='startBucketAccess'){arity(args,1);check(typeof args[0]==='boolean','乗降の操作が不正です。');next=m[name](s,args[0]);}
  else if(['progressScoopDump','progressBucketLink','progressDumpUnload'].includes(name)){arity(args,1);check(number(args[0]),'進行時間が不正です。');next=m[name](s,args[0]);}
  else if(name==='turnBucketWalker'){arity(args,1);check(number(args[0]),'向きが不正です。');next=m[name](s,args[0]);}
  else if(name==='slewBucketWork'){arity(args,2);check(args.every(number),'旋回の入力が不正です。');next=m[name](s,...args);}
  else if(['walkBucketSite','driveBucketSite','driveTransportExcavator'].includes(name)){check(args.length===3||args.length===4,'移動の項目が不正です。');check(args.slice(0,3).every(number)&&args.slice(0,2).every(v=>Math.abs(v)<=1),'移動の入力が不正です。');check(args.length===3||typeof args[3]==='boolean','走行速度の入力が不正です。');next=m[name](s,...args.slice(0,3),{fast:args[3]??false});}
  else if(['finishScoopDump','cancelScoopDump','finishBucketLink','cancelBucketPour','boardBucketSiteDump','leaveBucketSiteDump','finishDumpUnload','cancelDumpUnload'].includes(name)){arity(args,0);next=m[name](s);}
  else throw Error('現場の保存：その操作は使えません。');
  // The isolated adapters wrap even an unchanged reducer result. Preserve
  // identity when nothing advanced so blocked walking/steering can stop.
  if(next===s||next.revision===s.revision&&next.frame.revision===s.frame.revision)return s;
  if(!this.#movementGuard(s,next,name)){if(['walkBucketSite','driveBucketSite','driveTransportExcavator'].includes(name))return s;throw Error('車や作品に重なるため、作業場所を変えよう。');}
  if(hand)this.#usedShovel=true;
  this.#record=freeze({...this.#record,work:next});ownedSnapshots.add(this.#record);receipts.set(this.#record,{base:this.#base,usedShovel:this.#usedShovel});return this.state;
 }
}
// Flow snapshots and every descendant are privately owned and frozen. Keeping
// one in a candidate cannot expose mutable scene data, and preserves the soil
// validator's exact immutable-identity proof. This is NOT a receipt or a check:
// the writer still checks ownership, continuation and the complete candidate.
// Frozen imports, wrappers, copies and ordinary caller records are cloned.
export const isWorldTransportWorkSnapshot=record=>ownedSnapshots.has(record);
export function snapshotWorldTransportWork(record){
 return ownedSnapshots.has(record)?record:structuredClone(record);
}
// For large saves, check private physical ownership on the UI thread, then
// fully validate domain/continuation in the worker before accepting any draft.
export function assertWorldTransportWorkReceiptIdentity(current,next,expectedRevision,toolkit=null){
 return checkReceipt(current,next,expectedRevision,toolkit,false);
}
export function assertWorldTransportWorkReceipt(current,next,expectedRevision,toolkit=null){
 return checkReceipt(current,next,expectedRevision,toolkit,true);
}
function checkReceipt(current,next,expectedRevision,toolkit,continuation){
 check(current?.version===2&&next?.version===2,'人物と車両の保存が必要です。');
 check(current.work.revision===expectedRevision,'別の作業が保存されました。今の記録を確認してください。');
 if(transportNeedsShovel(current)||transportNeedsShovel(next))assertTransportShovel(toolkit,current.profileId);
 if(next===current)return next;
 const receipt=receipts.get(next);
 if(!receipt){check(same(next,current),'画面の接触・移動から作った作業だけを保存できます。');return next;}
 // A previously committed physical receipt may be submitted again. Preserve
 // that exact no-change case; only newer revisions can skip this comparison.
 if(next.work.revision===current.work.revision&&sameChecked(next,current))return next;
 if(receipt.usedShovel)assertTransportShovel(toolkit,current.profileId);
 // The ledger writer checks current before calling this receipt guard. The
 // base and next are private validated frozen flow records. Do not inspect
 // every changed scene again merely to discover that it is different.
 check(sameChecked(receipt.base,current),'別の作業から進めた記録です。上書きせず停止しました。');
 check(next.profileId===current.profileId&&next.scope===current.scope,'別の世界の作業です。');
 if(continuation)m.validateScoopDumpContinuation(current.work,next.work);return next;
}
