import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {createExcavationLedger,checkpointExcavationLedger,packExcavationLedger,unpackExcavationLedger,excavationLedgerWork,excavationLedgerSummary} from './imasora-construction-excavation-ledger.js';

export const EXCAVATION_INTEGRATION_DB='imasora-world-excavation-integration-v1';
export const excavationLedgerPreview=(search,host)=>['127.0.0.1','localhost'].includes(host)&&new URLSearchParams(search).get('constructionExcavationLedgerPreview')==='1';
export class ExcavationIntegrationStore extends IndexedConstructionStore{
  constructor(indexedDB=globalThis.indexedDB){super(indexedDB);this.name=EXCAVATION_INTEGRATION_DB;}
}
function checkRaw(raw,origin){
  if(raw===null)return null;
  if(!raw||!Number.isSafeInteger(raw.generation)||raw.generation<1||!Array.isArray(raw.backups)||raw.backups.length>5)throw Error('掘削の保存管理情報が不正です。上書きせず停止しました。');
  const record=unpackExcavationLedger(raw.current);
  if(record.origin!==origin)throw Error('掘削の保存元URLが一致しません。');
  for(const packet of raw.backups){const old=unpackExcavationLedger(packet);if(old.origin!==origin)throw Error('掘削の履歴の保存元URLが一致しません。');}
  return record;
}
export class ExcavationLedgerSession{
  constructor({store=new ExcavationIntegrationStore(),origin=globalThis.location?.origin,onChange=()=>{}}={}){
    this.store=store;this.origin=origin;this.onChange=onChange;this.raw=null;this.record=null;this.world=null;this.busy=false;this.blocked=false;this.message='接続確認用の土です。通常の所持品には加算しません。';this.pending=null;this.baseline=null;this.initialized=false;
  }
  async initialize(world){
    this.initialized=false;
    try{this.world=structuredClone(world);const raw=await this.store.read();this.raw=raw;const record=checkRaw(raw,this.origin);this.record=record;
      if(this.record){this.baseline=this.signature(excavationLedgerWork(this.record));this.message=`保存 ${this.raw.generation} を一時停止で読み込みました。`;}
      this.initialized=true;this.blocked=false;return this.record?excavationLedgerWork(this.record):null;
    }catch(e){this.blocked=true;this.message=e.message;throw e;}
  }
  seed(site){if(!this.initialized||this.blocked)throw Error('保存の読み込み確認が終わるまで作業を開始できません。');if(!this.record){this.record=createExcavationLedger(this.world,site,this.origin);this.baseline=this.signature(excavationLedgerWork(this.record));}}
  signature(snapshot){return packExcavationLedger({...checkpointExcavationLedger(this.record,snapshot),revision:0});}
  dirty(snapshot){return !this.raw||this.pending!==null||this.signature(snapshot)!==this.baseline;}
  get initial(){return this.record?excavationLedgerWork(this.record):null;}
  get summary(){return this.record?excavationLedgerSummary(this.record):null;}
  async save(snapshot){
    if(this.busy)return false;
    this.busy=true;this.message='姿勢と土の移動途中を保存しています…';this.onChange();
    try{
      if(!this.pending){
        const record=checkpointExcavationLedger(this.record,snapshot);
        this.pending={record,packet:packExcavationLedger(record),expected:this.raw?.generation??null,signature:this.signature(snapshot)};
      }
      const pending=this.pending,head=await this.store.read();checkRaw(head,this.origin);
      let next;
      // A lost acknowledgement may follow a successful transaction. Accept only
      // its exact generation AND packet, never silently replay the work.
      if(head?.generation===(pending.expected??0)+1&&head.current===pending.packet)next=head;
      else{
        if((head?.generation??null)!==pending.expected||head?.current!==this.raw?.current)throw Error('別タブで保存が更新されました。現在の作業を書き出してから、最新の画面で確認してください。');
        next=await this.store.commit(pending.expected,pending.packet);
        checkRaw(next,this.origin);
        if(next.generation!==(pending.expected??0)+1||next.current!==pending.packet)throw Error('保存の応答が一致しません。再試行で確認してください。');
      }
      this.raw=next;this.record=pending.record;this.pending=null;this.blocked=false;
      this.baseline=pending.signature;this.message=`保存 ${next.generation} 完了。再読込しても、一時停止した続きから再開できます。`;return true;
    }catch(e){this.blocked=true;this.message=e.message;return false;}
    finally{this.busy=false;this.onChange();}
  }
  export(snapshot){return packExcavationLedger(checkpointExcavationLedger(this.record,snapshot));}
}
