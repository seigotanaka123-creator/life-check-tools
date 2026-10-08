import {WorldTransportWorkFlow} from './imasora-construction-transport-work-flow.mjs';
import {sameConstructionRecordValue as same,sameValidatedConstructionRecordValue as sameChecked} from './imasora-construction-record-equality.mjs';
import {LIVE_WORLD_DB} from './imasora-world-save-service.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=119bd';
import {validateScoopDumpContinuation} from './imasora-construction-fragment-scoop.mjs';
// Normal world transactions, not the isolated work database. The service keeps
// the exact failed packet; this session retains the matching physical intent.
export class WorldTransportWorkSession{
 #flow=null;#intent=null;#busy=false;#opening=false;
 constructor({service,snapshot=()=>service.world}){if(service?.mode!=='live'||service.store?.name!==LIVE_WORLD_DB||!service.transportWork)throw Error('対応した通常保存の画面が必要です。');this.service=service;this.snapshot=snapshot;this.store=service.store;}
 get record(){return this.#flow?.record??null;}
 get state(){return this.#flow?.state??null;}get saved(){return this.#flow?.base.work??null;}get intent(){return this.#intent??(this.#opening?true:null);}get generation(){return this.service.generation;}get busy(){return this.#busy||this.service.busy;}get blocked(){return this.service.blocked;}
 // The flow owns a deeply frozen copy. A real reducer advances its revision
 // and identity; a blocked/no-op move retains both. Only confirmed readback
 // replaces the flow and makes state and saved identical again.
 get dirty(){return !!this.#flow&&this.state!==this.saved;}
 #accept(){const flow=new WorldTransportWorkFlow(this.service.ledger.world.constructionTransport,{toolkit:()=>this.service.constructionToolkit});if(this.#intent&&!sameChecked(flow.record,this.#intent))throw Error('保存待ちの作業と読み取った作業が違います。');this.#flow=flow;this.#intent=null;this.#opening=false;return this.state;}
 async open(){if(this.busy||this.#flow||this.#opening)throw Error('現場は既に開いているか保存中です。');this.#busy=true;try{if(this.service.ledger.world.constructionTransport?.version!==2){this.#opening=true;await this.service.enableConstructionTransportWork(this.snapshot(),this.service.world.constructionExcavation.revision);}return this.#accept();}catch(e){if(!this.service.blocked)this.#opening=false;throw e;}finally{this.#busy=false;}}
 move(name,...args){if(this.busy||this.blocked||this.#intent||!this.#flow)throw Error('保存を確認してから操作してください。');return this.#flow.move(name,...args);}
 advance(next){if(next!==this.state)throw Error('画面の接触操作から作った動きだけを使ってください。');return next;}
 async save(next=this.state){if(this.busy||this.blocked||this.#intent||!this.#flow||next!==this.state)throw Error('画面の途中作業をそのまま保存してください。');this.#busy=true;this.#intent=this.#flow.record;
  try{await this.service.saveConstructionTransportWork(this.#intent,this.snapshot(),this.#flow.base.work.revision);return this.#accept();}
  catch(e){if(!this.service.blocked)this.#intent=null;throw e;}finally{this.#busy=false;}}
 async retry(){if(this.busy||!this.intent||!this.service.blocked)throw Error('保存待ちの作業がありません。');this.#busy=true;try{await this.service.retry();return this.#accept();}finally{this.#busy=false;}}
 rebaseAfterRestore(){
  if(this.busy||this.blocked||this.intent)throw Error('現場の保存結果を先に確認してください。');
  const p=this.service.transportRestorePoint;
  if(!p||this.service.raw?.current!==p.appliedRaw||this.generation!==p.appliedGeneration||!same(this.#flow.base,p.beforeSaved)||!same(this.record,p.beforeUnsaved))throw Error('現場と復元前控えが一致しません。停止して保持します。');
  return this.#accept();
 }
 async readLatest(){if(this.busy||this.blocked||this.intent)throw Error('保存待ちの作業を先に確認してください。');if(this.dirty)throw Error('歩行や作業途中を先に保存してください。');this.#busy=true;try{const record=await this.store.read();if(!record||record.generation<this.generation)throw Error('古い保存は読み込めません。');const next=L.unpackWorldPurchaseLedger(record.current);if(next.world.constructionTransport?.version!==2||!sameChecked(next.source,this.service.ledger.source))throw Error('別の世界や旧形式の作業は読み込めません。');validateScoopDumpContinuation(this.saved,next.world.constructionTransport.work);this.service.accept(record);return this.#accept();}finally{this.#busy=false;}}
}
