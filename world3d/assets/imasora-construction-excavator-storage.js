import {IndexedConstructionStore,CONSTRUCTION_STORE} from './imasora-construction-storage.js';
import {EXCAVATION_FORMAT,packExcavation,unpackExcavation} from './imasora-construction-excavator-save.js';
export const EXCAVATION_DB='imasora-construction-excavation-development-v1';
export const EXCAVATION_RESTORE_TEST_DB='imasora-construction-excavation-restore-test-v1';
export const EXCAVATION_RESTORE_POINT='imasora-excavation-before-restore-v1';
export class ExcavationStore extends IndexedConstructionStore{
  constructor(idb=globalThis.indexedDB,{restoreTest=false}={}){super(idb);this.name=restoreTest?EXCAVATION_RESTORE_TEST_DB:EXCAVATION_DB;}
  async readRestorePoint(){
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(CONSTRUCTION_STORE,'readonly'),r=tx.objectStore(CONSTRUCTION_STORE).get('before-file-restore');
      tx.oncomplete=()=>resolve(r.result??null);tx.onabort=()=>reject(tx.error??Error('復元前の控えを読み込めませんでした。'));tx.onerror=()=>{};
    });
  }
  async commitRestore(expected,packet,{restoreId,beforeWork}){
    // Current record AND the unsaved visible work are archived in the SAME
    // transaction as replacement. Ordinary autosaves never erase this key.
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(CONSTRUCTION_STORE,'readwrite',{durability:'strict'}),os=tx.objectStore(CONSTRUCTION_STORE),r=os.get('construction');let next,error;
      r.onsuccess=()=>{
        const prior=r.result??null;
        if((prior?.generation??null)!==expected){error=Error('別タブで更新されています。最新の保存を読み直してから、復元内容をもう一度確認してください。');tx.abort();return;}
        if(prior&&(!validRecord(prior)||prior.current?.kind!==EXCAVATION_FORMAT)){error=Error('保存管理情報または保存形式が不明です。元データを保護して復元を中止しました。');tx.abort();return;}
        next={generation:(prior?.generation??0)+1,current:packet,backups:prior?[prior.current,...prior.backups].slice(0,5):[],restoreId};
        os.put({kind:EXCAVATION_RESTORE_POINT,restoreId,previousRecord:prior,work:beforeWork},'before-file-restore');
        const write=os.put(next,'construction');
        write.onsuccess=()=>{if(this.failNext){this.failNext=false;error=Error('確認用に復元保存を中断しました。');tx.abort();}};
      };
      tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(error??tx.error??Error('復元保存を中断しました。以前の記録は保持されています。'));tx.onerror=()=>{};
    });
  }
}
const validRecord=r=>r&&Number.isSafeInteger(r.generation)&&r.generation>=1&&r.generation<Number.MAX_SAFE_INTEGER-1&&Array.isArray(r.backups)&&r.backups.length<=5;
const same=(a,b)=>a?.kind===b?.kind&&a?.payload===b?.payload&&a?.checksum===b?.checksum;
export class ExcavationSession{
  constructor(store=new ExcavationStore()){Object.assign(this,{store,generation:null,raw:null,loaded:false,busy:false,blocked:false,pending:null,recovery:null,lastPacket:null});}
  accept(record){this.raw=record;this.generation=record.generation;this.lastPacket=record.current;this.pending=null;this.blocked=false;this.recovery=null;}
  async load(){
    if(this.busy)throw Error('保存処理中です。');this.busy=true;this.recovery=null;
    try{
      const r=await this.store.read();this.raw=r;this.loaded=true;
      if(!r){this.generation=null;this.lastPacket=null;this.pending=null;this.blocked=false;return null;}
      if(!validRecord(r))throw Error('保存管理情報が不正です。元データを保護して停止しました。');this.generation=r.generation;
      try{const s=unpackExcavation(r.current);this.accept(r);return s;}
      catch(e){
        // A future format is never silently downgraded using an older backup.
        if(r.current?.kind===EXCAVATION_FORMAT)for(const packet of r.backups){try{this.recovery=unpackExcavation(packet);break;}catch{}}
        throw e;
      }
    }catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
  }
  async save(state){
    if(!this.loaded||this.busy||this.blocked)throw Error('保存状態を確認してください。');
    let packet;try{packet=packExcavation(state);}catch(error){this.blocked=true;throw error;}if(same(packet,this.lastPacket))return this.raw;
    this.pending={expected:this.generation,packet};return this.commitPending();
  }
  async commitPending(){
    if(this.busy||!this.pending)throw Error('再試行できる保存がありません。');this.busy=true;
    try{const p=this.pending,r=await (p.restoreId?this.store.commitRestore(p.expected,p.packet,p):this.store.commit(p.expected,p.packet));this.accept(r);return r;}
    catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
  }
  async retry(){
    if(this.busy||!this.pending)throw Error('再試行できる保存がありません。');this.busy=true;
    try{
      const r=await this.store.read(),p=this.pending;
      if(validRecord(r)&&r.generation===(p.expected??0)+1&&same(r.current,p.packet)&&(!p.restoreId||r.restoreId===p.restoreId)){this.accept(r);return r;}
      if((r?.generation??null)!==p.expected)throw Error('別タブで更新されています。未保存分を書き出してから最新の保存を読み直してください。');
    }catch(e){this.blocked=true;throw e;}finally{this.busy=false;}
    return this.commitPending();
  }
  async recover(){
    if(this.busy||this.pending||!this.recovery||!validRecord(this.raw))throw Error('復旧できる正常な控えがないか、再試行待ちの保存があります。');
    const state=this.recovery;this.pending={expected:this.generation,packet:packExcavation(state)};
    await this.commitPending();return state;
  }
  async restore(packet,expected,beforeState=null){
    if(!this.loaded||this.busy||this.pending)throw Error('保存処理を完了してから復元してください。');
    if(expected!==this.generation)throw Error('確認後に保存が変わりました。復元内容をもう一度確認してください。');
    if(this.raw&&(!validRecord(this.raw)||this.raw.current?.kind!==EXCAVATION_FORMAT))throw Error('不明な保存形式は上書きできません。原本を書き出して保管してください。');
    const validated=packExcavation(unpackExcavation(packet)),beforeWork=beforeState?packExcavation(beforeState):null;
    this.pending={expected,packet:validated,beforeWork,restoreId:globalThis.crypto.randomUUID()};
    return this.commitPending();
  }
  async checkHead(){
    if(!this.loaded||this.busy||this.blocked)return false;
    const expected=this.generation,r=await this.store.read();if(this.busy||expected!==this.generation)return false;
    if((r?.generation??null)!==expected){this.blocked=true;throw Error('別タブで保存が更新されました。上書きを防ぐため一時停止しています。');}return true;
  }
}
