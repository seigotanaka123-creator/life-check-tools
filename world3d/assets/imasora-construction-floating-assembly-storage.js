import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {packTimber,unpackTimber} from './imasora-construction-floating-assembly.js';
export const TIMBER_DB='imasora-construction-floating-assembly-development-v1';
export class TimberStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=TIMBER_DB;}}
export class TimberSession{
  constructor(store=new TimberStore()){this.store=store;this.generation=null;this.savedRevision=-1;this.busy=false;this.blocked=false;this.raw=null;}
  async load(){this.busy=true;try{const r=await this.store.read();this.raw=r;this.generation=r?.generation??null;if(!r)return null;if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('保存管理情報が不正です。');const s=unpackTimber(r.current);this.savedRevision=s.revision;return s;}catch(e){this.blocked=true;throw e;}finally{this.busy=false;}}
  async save(s){if(this.busy||this.blocked)throw Error('保存状態を確認してください。');const p=packTimber(s);this.busy=true;try{const r=await this.store.commit(this.generation,p);this.raw=r;this.generation=r.generation;this.savedRevision=s.revision;return r;}catch(e){this.blocked=true;throw e;}finally{this.busy=false;}}
}
