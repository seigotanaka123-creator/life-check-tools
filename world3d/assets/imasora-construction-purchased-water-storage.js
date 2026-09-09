import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {WorldPurchaseStore} from './imasora-world-purchase-storage.js';
import {WorldAuthorityStore} from './imasora-world-save-service.js';
import {initialPurchasedWater,packPurchasedWater,unpackPurchasedWater} from './imasora-construction-purchased-water.js';
export const PURCHASED_WATER_DB='imasora-construction-purchased-water-copy-development-v1';
export class PurchasedWaterStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=PURCHASED_WATER_DB;}}
// Sources expose READ only. There is no purchase, award, debit, or source writer here.
export function purchasedSourceReader(kind){
  if(!['v451-copy','v452-integration'].includes(kind))throw Error('開発用の購入済み保存を選んでください。');
  const store=kind==='v451-copy'?new WorldPurchaseStore('copy'):new WorldAuthorityStore('integration');
  return {async read(){try{return await store.read();}finally{store.close();}}};
}
export class PurchasedWaterSession{
  constructor(store=new PurchasedWaterStore()){this.store=store;this.raw=null;this.generation=null;this.savedRevision=-1;this.busy=false;this.blocked=true;this.loaded=null;}
  async load(){if(this.busy)throw Error('保存中です。');this.busy=true;this.blocked=true;
    try{const r=await this.store.read();this.raw=r;this.generation=r?.generation??null;this.loaded=null;
      if(r){if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('保存管理情報が不正です。');this.loaded=unpackPurchasedWater(r.current);this.savedRevision=this.loaded.revision;}
      this.blocked=false;return this.loaded;
    }finally{this.busy=false;}
  }
  async importSource(reader,kind){
    if(this.blocked||this.busy||this.raw||this.loaded||this.generation!==null)throw Error('複製済みです。再読込で素材は補充しません。');
    this.busy=true;
    try{const r=await reader.read();if(!r)throw Error('購入済みの保存がありません。素材は追加しません。');
      if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('購入元の保存情報が不正です。');
      const s=initialPurchasedWater(r.current,kind);const packet=packPurchasedWater(s);this.raw=await this.store.commit(null,packet);this.generation=this.raw.generation;this.loaded=s;this.savedRevision=s.revision;return s;
    }catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
  }
  async save(s){if(this.blocked||this.busy||!this.loaded)throw Error('保存を確認してから作業してください。');
    if(s.source.packet!==this.loaded.source.packet||s.source.kind!==this.loaded.source.kind)throw Error('購入元の差し替えはできません。');
    const packet=packPurchasedWater(s);this.busy=true;
    try{this.raw=await this.store.commit(this.generation,packet);this.generation=this.raw.generation;this.savedRevision=s.revision;this.loaded=structuredClone(s);}
    catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
  }
}
