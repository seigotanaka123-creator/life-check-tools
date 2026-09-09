import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {createWorldPurchaseLedger,prepareLinkedOrder,settleLinkedOrder,awardLinkedFlightReward,saveLinkedWorldDraft,projectLinkedShop,packWorldPurchaseLedger,unpackWorldPurchaseLedger} from './imasora-world-purchase-ledger.js';
export const WORLD_LINK_DBS=Object.freeze({copy:'imasora-world-purchase-copy-development-v1',fixture:'imasora-world-purchase-fixture-development-v1'});
export class WorldPurchaseStore extends IndexedConstructionStore{
  constructor(mode='copy',idb=globalThis.indexedDB){super(idb);if(!Object.hasOwn(WORLD_LINK_DBS,mode))throw Error('不明な接続テストです。');this.name=WORLD_LINK_DBS[mode];this.mode=mode;}
}
export class WorldPurchaseSession{
  constructor(store=new WorldPurchaseStore()){this.store=store;this.ledger=null;this.generation=null;this.raw=null;this.busy=false;this.blocked=true;}
  get state(){return projectLinkedShop(this.ledger);}
  async load(){
    if(this.busy)throw Error('保存処理中です。');this.busy=true;this.blocked=true;this.ledger=null;
    try{const r=await this.store.read();this.raw=r;this.generation=r?.generation??null;this.ledger=null;
      if(r){if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('保存管理情報が不正です。');const candidate=unpackWorldPurchaseLedger(r.current);this.checkKind(candidate);this.ledger=candidate;}
      this.blocked=false;return this.state;
    }finally{this.busy=false;}
  }
  checkKind(s){const wanted=this.store.mode==='copy'?'copied-world':'fixture-world';if(s.source.kind!==wanted)throw Error('複製と検証用データを混ぜることはできません。');}
  async importSource(raw,kind){
    if(this.ledger||this.raw||this.generation!==null||this.blocked||this.busy)throw Error('複製済みの保存は再取り込みできません。');
    const s=createWorldPurchaseLedger(raw,kind);this.checkKind(s);return this.write(s);
  }
  async write(next,{loseReply=false}={}){
    if(this.busy||this.blocked)throw Error('保存を読み直してから操作してください。');this.checkKind(next);const packet=packWorldPurchaseLedger(next);this.busy=true;
    try{const r=await this.store.commit(this.generation,packet);if(loseReply)throw Error('保存完了直後に応答を中断しました。');this.ledger=structuredClone(next);this.raw=r;this.generation=r.generation;return this.state;}
    catch(e){this.blocked=true;throw Error('結果を確定できません。「保存を読み直す」で確認してください。 '+e.message,{cause:e});}finally{this.busy=false;}
  }
  async apply(fn,options={}){if(this.busy||this.blocked||!this.ledger)throw Error('保存・注文の状態を確認してください。');const n=fn(this.ledger);return n===this.ledger?this.state:this.write(n,options);}
  prepare(offer,q,id){return this.apply(s=>prepareLinkedOrder(s,offer,q,id));}
  settle(id,options={}){return this.apply(s=>settleLinkedOrder(s,id,options),options);}
  award(resource,amount,id){return this.apply(s=>awardLinkedFlightReward(s,resource,amount,id));}
  saveDraft(draft){return this.apply(s=>saveLinkedWorldDraft(s,draft));}
  export(){if(!this.ledger)throw Error('書き出せる保存がありません。');return packWorldPurchaseLedger(this.ledger);}
  exportRaw(){return JSON.stringify(this.raw,null,2);}
}
