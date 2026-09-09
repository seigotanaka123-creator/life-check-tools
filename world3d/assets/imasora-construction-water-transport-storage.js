import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {packTransport,unpackTransport} from './imasora-construction-water-transport.js';
export const TRANSPORT_DB='imasora-construction-water-transport-development-v1';
export class TransportStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=TRANSPORT_DB;}}
export class TransportSession{
  constructor(store=new TransportStore()){this.store=store;this.generation=null;this.savedRevision=-1;this.blocked=false;this.busy=false;this.raw=null;}
  async load(){this.busy=true;try{const r=await this.store.read();this.raw=r;this.generation=r?.generation??null;if(!r)return null;if(!Number.isSafeInteger(r.generation)||r.generation<1||!Array.isArray(r.backups))throw Error('保存管理情報が不正です。');const s=unpackTransport(r.current);this.savedRevision=s.revision;return s;}catch(e){this.blocked=true;throw e;}finally{this.busy=false;}}
  async save(s){if(this.busy||this.blocked)throw Error('保存を停止しています。');const p=packTransport(s);this.busy=true;try{const r=await this.store.commit(this.generation,p);this.raw=r;this.generation=r.generation;this.savedRevision=s.revision;return r;}catch(e){this.blocked=true;throw e;}finally{this.busy=false;}}
}
