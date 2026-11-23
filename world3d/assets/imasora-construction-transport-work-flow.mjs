import {summitFaceDeposit} from './imasora-construction-field-earth.mjs?v=120ov';
import {nativeDumpHeightAt,nativeDumpSupport} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {excavatorGroundFrame} from './imasora-construction-native-excavator-ground.mjs?v=120pv';
import {dumpDriverSeat} from './imasora-construction-dump-work.mjs?v=120pv';
import {linkedArmClear,linkedExcavatorSeat} from './imasora-construction-bucket-dump.mjs?v=120pv';
import {dropQuarryTransport} from './imasora-construction-transport-drive.mjs?v=121gf';
import {withNativeDecks} from './imasora-construction-native-decks.mjs?v=120ps';
import * as m from './imasora-construction-fragment-scoop.mjs?v=120pv';
import {arriveTransportDoor} from './imasora-construction-transport-door.mjs?v=120pv';
import {returnTransportToParking} from './imasora-construction-transport-parking.mjs?v=120pv';
import {soilTransportCommand} from './imasora-construction-soil-transport.mjs?v=120pv';
import {sameConstructionRecordValue as same,sameValidatedConstructionRecordValue as sameChecked} from './imasora-construction-record-equality.mjs';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs?v=120pv';
import {assertTransportShovel,transportNeedsShovel} from './imasora-construction-transport-hand.mjs';
import {captureConstructionJson,isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {validateSoilTransportAsync} from './imasora-construction-soil-transport.mjs?v=120pv';
import {arriveHandEarth,editHandEarth} from './imasora-construction-hand-area.mjs?v=120pv';
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
 #base;#record;#toolkit;#movementGuard=()=>true;#deckContext=()=>null;#soilGuard=()=>true;#usedShovel=false;
 constructor(record,{toolkit=()=>null}={},capture=null){check(record?.version===2,'人物と車両に対応した保存が必要です。');check(typeof toolkit==='function','道具の取得記録を確認してください。');if(capture!==flowCapture||!isCapturedConstructionJson(record))validateWorldTransport(record,worldTransportSoil(record).initial.source,record.profileId);this.#base=this.#record=freeze(capture===flowCapture&&isCapturedConstructionJson(record)?record:structuredClone(record));ownedSnapshots.add(this.#record);this.#toolkit=toolkit;}
 static async open(record,{checkedRestorePoint=null,...options}={}){
  const captured=await captureConstructionJson(record);check(captured?.version===2,'人物と車両に対応した保存が必要です。');
  if(checkedRestorePoint!==null){const {isCheckedTransportRestorePoint}=await import('./imasora-world-save-client.mjs?v=120pv');
   if(isCheckedTransportRestorePoint(checkedRestorePoint)&&same(captured,checkedRestorePoint.applied)&&sameExact(captured,checkedRestorePoint.applied)){const applied=checkedRestorePoint.applied;await validateSoilTransportAsync(worldTransportSoil(applied),{record:applied,checkedPoint:checkedRestorePoint});return new WorldTransportWorkFlow(applied,options,flowCapture);}
  }
  await validateSoilTransportAsync(worldTransportSoil(captured),{record:captured});return new WorldTransportWorkFlow(captured,options,flowCapture);
 }
 // A confirmed save with identical values can retain the already owned scene.
 // Do not reuse it across JSON's -0/0 normalization or a changed actor/task.
 acceptConfirmed(record){if(!same(record,this.#record)||!sameExact(record,this.#record))return false;this.#base=this.#record;this.#usedShovel=false;receipts.delete(this.#record);return true;}
 get record(){return this.#record;}get state(){return this.#record.work;}get base(){return this.#base;}
 discardUnsaved(){
  this.#record=this.#base;
  this.#usedShovel=false;
  return this.state;
 }
 setMovementGuard(guard){check(typeof guard==='function','移動先の確認が不正です。');this.#movementGuard=guard;}
 setSoilGuard(guard){check(typeof guard==='function','土の支持の確認方法が不正です。');this.#soilGuard=guard;}
 setDeckContext(read){check(typeof read==='function','床の確認方法が不正です。');this.#deckContext=read;}
 move(name,...args){
  let next,s=this.state,flight=null;const frame=withNativeDecks(s.frame,this.#deckContext());if(frame!==s.frame)s={...s,frame};
  const hand=['startBucketSiteHand','progressDumpHandWork','finishDumpHandWork','returnDumpHandWork'].includes(name);
  if(hand)assertTransportShovel(this.#toolkit(),this.#record.profileId);
  if(name==='openScoopGround'){arity(args,0);next=m.openScoopGround(s);}
  else if(name==='returnTransportToParking'){arity(args,0);next=returnTransportToParking(s);}
  else if(name==='relocateEarthStorage'){
   arity(args,0);
   check(s.frame.version===2&&s.mode==='foot'&&!s.scoop&&!s.link&&!s.unload&&!s.frame.job,'車を降りてから保管箱を移そう。');
   const current=s.frame.soil;
   const soil=soilTransportCommand(current,{type:'relocate-earth-storage',id:'relocate_earth_storage',expectedRevision:current.revision});
   next={...s,revision:s.revision+1,frame:{...s.frame,revision:s.frame.revision+1,soil}};
  }
  else if(name==='openSummitFace'){
   arity(args,0);
   check(!s.scoop&&!s.link&&!s.unload&&!s.frame.job,'作業を終えてから山頂の採土面を開きます。');
   const current=s.frame.soil,amount=summitFaceDeposit(current).amount;
   const soil=soilTransportCommand(current,{type:'open-summit-face',id:'open_summit_face',expectedRevision:current.revision,amount});
   const f={...s.frame,revision:s.frame.revision+1,soil};
   if(f.decks){
    if(f.dump.groundY!==undefined)check(Math.abs(nativeDumpSupport(f).y-f.dump.groundY)<.05,'ダンプを採土面から離してください。');
    if(f.machineVehicle.groundY!==undefined)check(Math.abs(excavatorGroundFrame(f).position[1]-f.machineVehicle.groundY)<.05,'ショベルカーを採土面から離してください。');
    check(linkedArmClear(f),'アームを採土面から離してください。');
    if(s.mode==='foot')check(nativeDumpHeightAt(f,f.player.x,f.player.z,f.player.y)<=f.player.y+.1,'採土面から少し離れてください。');
   }
   next={...s,revision:s.revision+1,frame:f};
  }
  else if(name==='surfaceQuarrySlopes'){
   arity(args,0);
   check(!s.scoop&&!s.link&&!s.unload&&!s.frame.job,'作業を終えてから走行面を更新します。');
   const current=s.frame.soil,soil=soilTransportCommand(current,{type:'surface-quarry-slopes',id:'surface_quarry_slopes',expectedRevision:current.revision});
   const frame={...s.frame,revision:s.frame.revision+1,soil};
   if(frame.decks){
    if(frame.dump.groundY!==undefined){const g=nativeDumpSupport(frame);check(g.driveReady,'ダンプの停車位置を確認してください。');frame.dump={...frame.dump,groundY:g.y};}
    if(frame.machineVehicle.groundY!==undefined)frame.machineVehicle={...frame.machineVehicle,groundY:excavatorGroundFrame(frame).position[1]};
    if(s.mode==='driving')frame.player=dumpDriverSeat(frame);
    else if(s.mode==='excavating')frame.player=linkedExcavatorSeat(frame);
    else{const p=frame.player,y=nativeDumpHeightAt(frame,p.x,p.z,p.y);if(Number.isFinite(y))frame.player={...p,y};}
   }
   next={...s,revision:s.revision+1,frame};
  }
  else if(['openCutBank','openQuarryMountain','openQuarryRange'].includes(name)){
   arity(args,0);
   check(s.frame.version===2&&!s.scoop&&!s.link&&!s.unload&&!s.frame.job,'作業を終えてから山の採土場をひらこう。');
   const current=s.frame.soil,type=name==='openQuarryRange'?'open-quarry-range':name==='openQuarryMountain'?'open-quarry-mountain':'open-cut-ridge';
   const soil=soilTransportCommand(current,{type,id:type.replaceAll('-','_'),expectedRevision:current.revision,...(name==='openQuarryRange'?{summitOnly:true,gradedFoot:true,slopes:true}:{})});
   const elevated=name!=='openCutBank'&&!s.frame.decks?withNativeDecks(s.frame,{version:1,rooms:[]}):s.frame;
   next={...s,revision:s.revision+1,frame:{...elevated,revision:s.frame.revision+1,soil}};
  }
  else if(name==='arriveTransportDoor'){check(args.length===2||args.length===3&&args[2]===true,'乗車位置を確認してください。');next=arriveTransportDoor(s,...args);}
  else if(name==='arriveHandEarth'){
   arity(args,1);
   const pose=args[0];
   check(pose&&Object.keys(pose).sort().join(',')==='heading,x,y,z'&&Object.values(pose).every(number),'足元を確認してください。');
   next=arriveHandEarth(s,pose);
  }
  else if(name==='editHandEarth'){
   arity(args,4);
   next=editHandEarth(s,...args);
  }
  else if(name==='startBucketSiteHand'){check(args.length===2||args.length===3&&args[0]==='drop'&&Array.isArray(args[2])&&args[2].length===2&&args[2].every(number),'置き先の入力が不正です。');check(['dig','load','drop','store','take'].includes(args[0])&&typeof args[1]==='string','手作業の入力が不正です。');next=m[name](s,...args);}
  else if(name==='progressDumpHandWork'){arity(args,1);check(number(args[0]),'進行時間が不正です。');next=m[name](s,args[0]);}
  else if(['finishDumpHandWork','returnDumpHandWork'].includes(name)){arity(args,0);next=m[name](s);}
  else if(['startBucketStorage','startBucketStorageDeposit','startScoopDump','startAimedScoop','startBasinScoop','startBucketPour','startBucketGroundPour','startBucketSiteUnload','startBucketSiteStorage'].includes(name)){arity(args,1);check(typeof args[0]==='string','操作番号が不正です。');next=m[name](s,args[0]);}
  else if(name==='startBucketAccess'){arity(args,1);check(typeof args[0]==='boolean','乗降の操作が不正です。');next=m[name](s,args[0]);}
  else if(['progressScoopDump','confirmScoopApproach','progressBucketLink','progressDumpUnload'].includes(name)){arity(args,1);check(number(args[0]),'進行時間が不正です。');next=m[name](s,args[0]);}
  else if(name==='turnBucketWalker'){arity(args,1);check(number(args[0]),'向きが不正です。');next=m[name](s,args[0]);}
  else if(name==='adjustBucketArmWork'){arity(args,3);next=m.adjustBucketArmWork(s,...args);}
  else if(name==='slewBucketWork'){arity(args,2);check(args.every(number),'旋回の入力が不正です。');next=m[name](s,...args);}
  else if(name==='dropQuarryTransport'){
   arity(args,1);
   next=dropQuarryTransport(s,args[0],(candidate,path)=>{
    if(!this.#movementGuard(s,candidate,name,path))return false;
    flight=path;return true;
   });
  }
  else if(['walkBucketSite','driveBucketSite','driveTransportExcavator'].includes(name)){check(args.length===3||args.length===4,'移動の項目が不正です。');check(args.slice(0,3).every(number)&&args.slice(0,2).every(v=>Math.abs(v)<=1),'移動の入力が不正です。');check(args.length===3||typeof args[3]==='boolean','走行速度の入力が不正です。');const pivot=name==='driveTransportExcavator'&&!args[0]&&!!args[1];next=m[name](s,...args.slice(0,3),{fast:args[3]??false,...(pivot?{canMove:candidate=>this.#movementGuard(s,candidate,name)}:{})});}
  else if(['finishScoopDump','cancelScoopDump','finishBucketLink','cancelBucketPour','boardBucketSiteDump','leaveBucketSiteDump','finishDumpUnload','cancelDumpUnload'].includes(name)){arity(args,0);next=m[name](s);}
  else throw Error('現場の保存：その操作は使えません。');
  // The isolated adapters wrap even an unchanged reducer result. Preserve
  // identity when nothing advanced so blocked walking/steering can stop.
  let clear=next!==s&&(next.revision!==s.revision||next.frame.revision!==s.frame.revision);
  if(clear&&!flight)clear=this.#movementGuard(s,next,name);
  if(!clear&&name==='walkBucketSite'&&args[0]&&args[1]){
   const [x,z,dt,fast=false]=args,axes=Math.abs(x)>=Math.abs(z)?[[x,0],[0,z]]:[[0,z],[x,0]];
   for(const axis of axes){
    const candidate=m.walkBucketSite(s,...axis,dt,{fast});
    if(candidate.revision===s.revision||!this.#movementGuard(s,candidate,name))continue;
    next=candidate;clear=true;break;
   }
  }
  if(!clear&&['driveTransportExcavator','driveBucketSite'].includes(name)&&args[0]&&args[1]){
   next=m[name](s,...args.slice(0,3),{fast:args[3]??false,contactTurn:true,canMove:candidate=>this.#movementGuard(s,candidate,name)});
   clear=next!==s;
  }
  if(!clear&&(next===s||next.revision===s.revision&&next.frame.revision===s.frame.revision))return this.state;
  this.#soilGuard(s,next,name);
  if(!clear){if(['walkBucketSite','driveBucketSite','driveTransportExcavator'].includes(name))return this.state;throw Error('車や作品に重なるため、作業場所を変えよう。');}
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
