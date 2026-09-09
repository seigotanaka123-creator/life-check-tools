import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {createShopState,prepareOrder,settleOrder,packShop,unpackShop} from './imasora-mars-construction-shop.js';
export const SHOP_DB='imasora-mars-construction-shop-development-v1';
export class ShopStore extends IndexedConstructionStore {
  constructor(idb=globalThis.indexedDB){super(idb);this.name=SHOP_DB;}
}
export class ShopSession {
  constructor(store=new ShopStore()){this.store=store;this.state=null;this.generation=null;this.raw=null;this.busy=false;this.blocked=true;}
  async load(){
    if(this.busy)throw Error('保存処理中です。');this.busy=true;this.blocked=true;
    try{
      const r=await this.store.read();this.raw=r;this.state=null;this.generation=r?.generation??null;
      if(r){
        if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('保存管理情報が不正です。');
        // Never silently roll a paid order back to an older balance.
        this.state=unpackShop(r.current);
      }
      this.blocked=false;return this.state;
    }finally{this.busy=false;}
  }
  async write(next,{loseReply=false}={}){
    if(this.busy||this.blocked)throw Error('保存を読み直してから操作してください。');
    const packet=packShop(next);this.busy=true;
    try{
      const r=await this.store.commit(this.generation,packet);
      // Explicit development fault: durable success, then a lost completion response.
      if(loseReply)throw Error('保存完了直後に応答を中断しました。');
      this.state=structuredClone(next);this.raw=r;this.generation=r.generation;return this.state;
    }catch(e){this.blocked=true;throw Error('結果を確定できません。「保存を読み直す」で注文を確認してください。 '+e.message,{cause:e});}
    finally{this.busy=false;}
  }
  async initialize(){
    if(this.state||this.raw||this.generation!==null||this.blocked)throw Error('既存の残高は初期化できません。');
    return this.write(createShopState());
  }
  async prepare(offerId,quantity,id){
    if(this.busy||this.blocked||!this.state)throw Error('保存・注文の状態を確認してください。');
    const n=prepareOrder(this.state,offerId,quantity,id);return n===this.state?this.state:this.write(n);
  }
  async settle(id,options={}){
    if(this.busy||this.blocked||!this.state)throw Error('保存・注文の状態を確認してください。');
    const n=settleOrder(this.state,id,options);return n===this.state?this.state:this.write(n,options);
  }
  export(){if(!this.state)throw Error('書き出せる保存がありません。');return packShop(this.state);}
  exportRaw(){return JSON.stringify(this.raw,null,2);}
}
