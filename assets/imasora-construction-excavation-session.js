import {IndexedConstructionStore,CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {canonical} from './imasora-construction-state.js';
import {LEDGER_RESTORE_POINT,prepareLedgerReplacement,inspectLedgerRestorePoint} from './imasora-construction-excavation-ledger-recovery.js';
import {createExcavationLedger,checkpointExcavationLedger,packExcavationLedger,unpackExcavationLedger,excavationLedgerWork,excavationLedgerSummary} from './imasora-construction-excavation-ledger.js';

export const EXCAVATION_INTEGRATION_DB='imasora-world-excavation-integration-v1';
export const excavationLedgerPreview=(search,host)=>['127.0.0.1','localhost'].includes(host)&&new URLSearchParams(search).get('constructionExcavationLedgerPreview')==='1';
export class ExcavationIntegrationStore extends IndexedConstructionStore{
  constructor(indexedDB=globalThis.indexedDB){super(indexedDB);this.name=EXCAVATION_INTEGRATION_DB;}
  async readRestorePoint(){
    const db=await this.open();return new Promise((resolve,reject)=>{
      const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),request=tx.objectStore(CONSTRUCTION_STORE).get('before-ledger-restore');
      tx.oncomplete=()=>resolve(request.result??null);tx.onabort=()=>reject(tx.error??Error('復元前の控えを読めませんでした。'));tx.onerror=()=>{};
    });
  }
  async commitRestore(expectedRaw,packet,{restoreId,beforeWork,expectedPoint=null}){
    const db=await this.open();return new Promise((resolve,reject)=>{
      const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE);
      const request=os.get('construction'),pointRequest=os.get('before-ledger-restore');let next,error;
      pointRequest.onsuccess=()=>{
        try{
          const prior=request.result??null;
          if(canonical(prior)!==canonical(expectedRaw))throw Error('別タブで保存が更新されました。現在の作業を保管して、最新の記録で確認してください。');
          if(expectedPoint&&canonical(pointRequest.result??null)!==canonical(expectedPoint))throw Error('復元前の控えが別タブで変わりました。もう一度確認してください。');
          checkRaw(prior,unpackExcavationLedger(packet).origin);
          if(prior?.generation>=Number.MAX_SAFE_INTEGER-1)throw Error('保存番号が上限です。');
          next={generation:(prior?.generation??0)+1,current:packet,backups:prior?[prior.current,...prior.backups].slice(0,5):[],restoreId};
          const point={kind:LEDGER_RESTORE_POINT,restoreId,previousRecord:prior,work:beforeWork};
          inspectLedgerRestorePoint(point,unpackExcavationLedger(packet));
          os.put(point,'before-ledger-restore');
          const write=os.put(next,'construction');write.onsuccess=()=>{if(this.failNext){this.failNext=false;error=Error('復元保存が中断されました。以前の記録は保持しています。');tx.abort();}};
        }catch(e){error=e;tx.abort();}
      };
      tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error??tx.error??Error('復元保存が中断されました。'));tx.onerror=()=>{};
    });
  }
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
    this.store=store;this.origin=origin;this.onChange=onChange;this.raw=null;this.record=null;this.world=null;this.busy=false;this.blocked=false;this.message='接続確認用の土です。通常の所持品には加算しません。';this.pending=null;this.baseline=null;this.initialized=false;this.restoreCandidate=null;this.pendingRestore=null;
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
  dirty(snapshot){return !this.raw||this.pending!==null||this.pendingRestore!==null||this.signature(snapshot)!==this.baseline;}
  get initial(){return this.record?excavationLedgerWork(this.record):null;}
  get summary(){return this.record?excavationLedgerSummary(this.record):null;}
  async save(snapshot){
    if(this.pendingRestore)throw Error('復元の結果を先に再確認してください。');
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
  clearRestore(){this.restoreCandidate=null;}
  prepareRestore(text,snapshot,{point=null}={}){
    this.clearRestore();
    if(!this.initialized||!this.record||this.busy||this.blocked||this.pending||this.pendingRestore)throw Error('保存の結果を確認してから復元してください。');
    const beforeWork=this.export(snapshot),current=unpackExcavationLedger(beforeWork);
    if(point)inspectLedgerRestorePoint(point,current);
    const next=prepareLedgerReplacement(text,current);
    this.restoreCandidate={...next,beforeWork,signature:this.signature(snapshot),expectedRaw:structuredClone(this.raw),expectedPoint:point?structuredClone(point):null};
    return {current:excavationLedgerSummary(current),next:next.summary};
  }
  async prepareUndo(snapshot){
    this.clearRestore();const signature=this.signature(snapshot),point=await this.store.readRestorePoint();
    inspectLedgerRestorePoint(point,this.record);
    // The UI is paused while reading. Re-check at apply as well.
    if(signature!==this.signature(snapshot))throw Error('確認中に作業が変わりました。');
    return this.prepareRestore(point.work,snapshot,{point});
  }
  async applyRestore(snapshot){
    const candidate=this.restoreCandidate;
    if(this.busy||this.blocked||this.pending||this.pendingRestore||!candidate)throw Error('先に復元する内容を確認してください。');
    if(candidate.signature!==this.signature(snapshot)||canonical(candidate.expectedRaw)!==canonical(this.raw)){
      this.clearRestore();throw Error('内容確認後に作業が変わりました。もう一度内容を確認してください。');
    }
    this.pendingRestore={...candidate,restoreId:globalThis.crypto.randomUUID()};this.clearRestore();
    return this.retryRestore();
  }
  async retryRestore(){
    if(this.busy||!this.pendingRestore)throw Error('再確認する復元処理がありません。');
    this.busy=true;this.message='復元前の作業を控えてから、地形と姿勢を一緒に保存しています…';this.onChange();
    try{
      const p=this.pendingRestore,head=await this.store.read();checkRaw(head,this.origin);let next;
      if(head?.generation===(p.expectedRaw?.generation??0)+1&&head.current===p.packet&&head.restoreId===p.restoreId){
        const point=await this.store.readRestorePoint();inspectLedgerRestorePoint(point,p.record);
        if(point.restoreId!==p.restoreId||point.work!==p.beforeWork||canonical(point.previousRecord)!==canonical(p.expectedRaw))throw Error('復元前の控えが一致しません。上書きせず停止しました。');
        next=head;
      }else{
        if(canonical(head)!==canonical(p.expectedRaw))throw Error('別タブで保存が更新されました。現在の作業を書き出し、最新の記録で確認してください。');
        next=await this.store.commitRestore(p.expectedRaw,p.packet,p);checkRaw(next,this.origin);
        if(next.generation!==(p.expectedRaw?.generation??0)+1||next.current!==p.packet||next.restoreId!==p.restoreId)throw Error('復元の応答が一致しません。結果を再確認してください。');
      }
      this.raw=next;this.record=p.record;this.pendingRestore=null;this.blocked=false;
      const restored=excavationLedgerWork(this.record);this.baseline=this.signature(restored);
      this.message=`保存 ${next.generation} に復元しました。一時停止中です。「復元前の作業を確認」から戻せます。`;return restored;
    }catch(e){this.blocked=true;this.message=e.message;throw e;}
    finally{this.busy=false;this.onChange();}
  }
}
