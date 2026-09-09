import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {packWater,unpackWater} from './imasora-construction-water.js';
export const WATER_DB='imasora-construction-water-development-v1';
export class WaterStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=WATER_DB;}}
export class WaterSession{
  constructor(store=new WaterStore()){this.store=store;this.generation=null;this.savedRevision=-1;this.blocked=false;this.busy=false;this.raw=null;}
  async load(){this.busy=true;try{const r=await this.store.read();this.raw=r;this.generation=r?.generation??null;if(!r)return null;if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('火星水の保存管理情報が不正です。');const s=unpackWater(r.current);this.savedRevision=s.revision;return s;}catch(e){this.blocked=true;throw e;}finally{this.busy=false;}}
  async save(s){if(this.busy||this.blocked)throw Error('保存状態を確認してください。');const packet=packWater(s);this.busy=true;try{const r=await this.store.commit(this.generation,packet);this.raw=r;this.generation=r.generation;this.savedRevision=s.revision;return r;}catch(e){this.blocked=true;throw e;}finally{this.busy=false;}}
}
