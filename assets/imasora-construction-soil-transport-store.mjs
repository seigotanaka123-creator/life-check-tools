import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {canonical} from './imasora-construction-state.js';
import {SOIL_TRANSPORT_SCOPE,SOIL_NATIVE_TRANSPORT_SCOPE,validateSoilTransport,soilTransportCommand,validateSoilTransportContinuation,packSoilTransport,unpackSoilTransport} from './imasora-construction-soil-transport.mjs';
export const SOIL_TRANSPORT_DB='imasora-shared-soil-transport-isolated-v1';
export class SoilTransportStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=SOIL_TRANSPORT_DB;}}
export const SOIL_NATIVE_TRANSPORT_DB='imasora-shared-soil-native-copy-isolated-v2';
export class NativeSoilTransportStore extends IndexedConstructionStore{constructor(idb=globalThis.indexedDB){super(idb);this.name=SOIL_NATIVE_TRANSPORT_DB;}}
// One whole snapshot, one compare/read/write transaction. The existing normal
// world writer does not recognize this scope and is intentionally not changed.
export class SoilTransportSession{
 constructor(initial,{store}={}){validateSoilTransport(initial);const native=initial.scope===SOIL_NATIVE_TRANSPORT_SCOPE;if((!native&&initial.scope!==SOIL_TRANSPORT_SCOPE)||initial.revision!==0)throw Error('土の移送：初期の隔離地形が必要です。');store??=native?new NativeSoilTransportStore():new SoilTransportStore();if(store.name!==(native?SOIL_NATIVE_TRANSPORT_DB:SOIL_TRANSPORT_DB))throw Error('土の移送：通常・別形式の保存先は使用できません。');this.initial=structuredClone(initial);this.store=store;this.state=null;this.generation=null;this.pendingCommand=null;this.busy=false;this.blocked=false;}
 accept(record){if(!record||!Number.isSafeInteger(record.generation)||record.generation<1||record.generation>=Number.MAX_SAFE_INTEGER-1||!Array.isArray(record.backups)||record.backups.some(p=>typeof p!=='string')||this.generation!==null&&record.generation<this.generation)throw Error('土の移送：保存管理情報が不正です。');const state=unpackSoilTransport(record.current);validateSoilTransportContinuation(this.initial,state);if(this.state)validateSoilTransportContinuation(this.state,state);this.state=state;this.generation=record.generation;return this.state;}
 async open(){if(this.busy)throw Error('土の移送：保存中です。');this.busy=true;try{let record=await this.store.read();if(!record){try{record=await this.store.commit(null,packSoilTransport(this.initial));}catch(e){record=await this.store.read();if(!record)throw e;}}return this.accept(record);}finally{this.busy=false;}}
 async perform(command){if(this.busy||this.pendingCommand||this.blocked||!this.state)throw Error('土の移送：保存を確認してから操作してください。');const next=soilTransportCommand(this.state,command);if(next===this.state)return this.state;this.pendingCommand=structuredClone(command);return this.commit(next);}
 async commit(next){this.busy=true;const packet=packSoilTransport(next),prior=this.state;
  try{const saved=await this.store.commit(this.generation,packet);const accepted=this.accept(saved);validateSoilTransportContinuation(prior,accepted);this.pendingCommand=null;return accepted;}
  catch(e){try{const latest=await this.store.read();if(latest?.current===packet){const accepted=this.accept(latest);validateSoilTransportContinuation(prior,accepted);this.pendingCommand=null;return accepted;}}catch{}
   this.blocked=true;throw e;
  }finally{this.busy=false;}
 }
 async retry(){if(this.busy||!this.pendingCommand)throw Error('土の移送：保存待ちの操作がありません。');this.busy=true;try{const command=this.pendingCommand,prior=this.state,latest=await this.store.read();
  if(!latest)throw Error('土の移送：保存を読み取れません。');const state=unpackSoilTransport(latest.current);validateSoilTransportContinuation(prior,state);const found=state.journal.find(c=>c.id===command.id);
  if(found){if(canonical(found)!==canonical(command))throw Error('土の移送：操作番号の内容が一致しません。');this.accept(latest);this.pendingCommand=null;this.blocked=false;return this.state;}
  if(state.revision!==command.expectedRevision){this.blocked=true;throw Error('土の移送：別タブで更新されています。保存を読み直してください。');}
  this.accept(latest);const next=soilTransportCommand(this.state,command);const result=await this.commit(next);this.blocked=false;return result;}finally{this.busy=false;}
 }
 async readLatest(){if(this.busy)throw Error('土の移送：保存中です。');this.busy=true;try{const record=await this.store.read(),candidate=unpackSoilTransport(record?.current);if(this.pendingCommand){const found=candidate.journal.find(c=>c.id===this.pendingCommand.id);if(found&&canonical(found)!==canonical(this.pendingCommand))throw Error('土の移送：保存待ちの操作が一致しません。');}const next=this.accept(record);this.pendingCommand=null;this.blocked=false;return next;}finally{this.busy=false;}}
}
