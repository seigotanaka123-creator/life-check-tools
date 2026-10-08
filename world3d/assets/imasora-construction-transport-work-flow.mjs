import * as m from './imasora-construction-fragment-scoop.mjs';
import {sameConstructionRecordValue as same,sameValidatedConstructionRecordValue as sameChecked} from './imasora-construction-record-equality.mjs';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs';
import {assertTransportShovel,transportNeedsShovel} from './imasora-construction-transport-hand.mjs';
const receipts=new WeakMap();
const check=(v,t)=>{if(!v)throw Error('現場の保存：'+t);};
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const number=n=>typeof n==='number'&&Number.isFinite(n);
const arity=(args,n)=>check(args.length===n,'操作の項目が不正です。');
// A receipt is created only by these physical reducers. Raw snapshots, clones
// and imported isolated saves cannot mint it. This is a write-boundary guard,
// not a remote anti-cheat credential. No arbitrary quantity command is exposed.
export class WorldTransportWorkFlow{
 #base;#record;#toolkit;#usedShovel=false;
 constructor(record,{toolkit=()=>null}={}){check(record?.version===2,'人物と車両に対応した保存が必要です。');check(typeof toolkit==='function','道具の取得記録を確認してください。');validateWorldTransport(record,worldTransportSoil(record).initial.source,record.profileId);this.#base=this.#record=freeze(structuredClone(record));this.#toolkit=toolkit;}
 get record(){return this.#record;}get state(){return this.#record.work;}get base(){return this.#base;}
 move(name,...args){
  let next,s=this.state;
  const hand=['startBucketSiteHand','progressDumpHandWork','finishDumpHandWork','returnDumpHandWork'].includes(name);
  if(hand)assertTransportShovel(this.#toolkit(),this.#record.profileId);
  if(name==='startBucketSiteHand'){check(args.length===2||args.length===3&&args[0]==='drop'&&Array.isArray(args[2])&&args[2].length===2&&args[2].every(number),'置き先の入力が不正です。');check(['dig','load','drop','store','take'].includes(args[0])&&typeof args[1]==='string','手作業の入力が不正です。');next=m[name](s,...args);}
  else if(name==='progressDumpHandWork'){arity(args,1);check(number(args[0]),'進行時間が不正です。');next=m[name](s,args[0]);}
  else if(['finishDumpHandWork','returnDumpHandWork'].includes(name)){arity(args,0);next=m[name](s);}
  else if(['startBucketStorage','startScoopDump','startBucketPour','startBucketSiteUnload','startBucketSiteStorage'].includes(name)){arity(args,1);check(typeof args[0]==='string','操作番号が不正です。');next=m[name](s,args[0]);}
  else if(name==='startBucketAccess'){arity(args,1);check(typeof args[0]==='boolean','乗降の操作が不正です。');next=m[name](s,args[0]);}
  else if(['progressScoopDump','progressBucketLink','progressDumpUnload'].includes(name)){arity(args,1);check(number(args[0]),'進行時間が不正です。');next=m[name](s,args[0]);}
  else if(name==='turnBucketWalker'){arity(args,1);check(number(args[0]),'向きが不正です。');next=m[name](s,args[0]);}
  else if(name==='slewBucketWork'){arity(args,2);check(args.every(number),'旋回の入力が不正です。');next=m[name](s,...args);}
  else if(['walkBucketSite','driveBucketSite'].includes(name)){check(args.length===3||args.length===4,'移動の項目が不正です。');check(args.slice(0,3).every(number)&&args.slice(0,2).every(v=>Math.abs(v)<=1),'移動の入力が不正です。');check(args.length===3||typeof args[3]==='boolean','走行速度の入力が不正です。');next=m[name](s,...args.slice(0,3),{fast:args[3]??false});}
  else if(['finishScoopDump','cancelScoopDump','finishBucketLink','cancelBucketPour','boardBucketSiteDump','leaveBucketSiteDump','finishDumpUnload','cancelDumpUnload'].includes(name)){arity(args,0);next=m[name](s);}
  else throw Error('現場の保存：その操作は使えません。');
  // The isolated adapters wrap even an unchanged reducer result. Preserve
  // identity when nothing advanced so blocked walking/steering can stop.
  if(next===s||next.revision===s.revision&&next.frame.revision===s.frame.revision)return s;
  if(hand)this.#usedShovel=true;
  this.#record=freeze({...this.#record,work:next});receipts.set(this.#record,{base:this.#base,usedShovel:this.#usedShovel});return this.state;
 }
}
export function assertWorldTransportWorkReceipt(current,next,expectedRevision,toolkit=null){
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
 m.validateScoopDumpContinuation(current.work,next.work);return next;
}
