import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {packWork,unpackWork} from './imasora-construction-loader-work.js';
export const WORK_DB='imasora-construction-loader-work-development-v1';
// Reuse the already-tested atomic CAS store. Override the name before any open/read.
export class LoaderWorkStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=WORK_DB;}}
export class LoaderWorkSession{
  constructor(store=new LoaderWorkStore()){this.store=store;this.generation=null;this.savedRevision=-1;this.busy=false;this.blocked=false;this.raw=null;}
  async load(){
    this.busy=true;try{const r=await this.store.read();this.raw=r;this.generation=r?.generation??null;if(!r)return null;
      if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw new Error('保存管理情報が不正です。');
      const w=unpackWork(r.current);this.savedRevision=w.revision;return w;
    }catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
  }
  async save(w){
    if(this.busy||this.blocked)throw new Error('保存状態を確認してください。');const packet=packWork(w);this.busy=true;
    try{const r=await this.store.commit(this.generation,packet);this.raw=r;this.generation=r.generation;this.savedRevision=w.revision;return r;}
    catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
  }
}
