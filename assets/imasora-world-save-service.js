import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js';

export const LIVE_WORLD_DB='imasora-world-authority-v1';
export const WORLD_SHOP_TEST_DB='imasora-world-shop-integration-development-v1';
export const LEGACY_WORLD_KEY='imasora-world-foundation-v3';
export const WORKSHOP_MATERIAL_KEY='imasora-ufo-workshop-materials-v1';
export function worldSaveMode(search,hostname){
  const p=new URLSearchParams(search),local=['127.0.0.1','localhost'].includes(hostname);
  if(p.get('constructionWaterPractice')==='1'||p.get('constructionSoilPractice')==='1'||p.get('constructionTimberPractice')==='1')return 'readonly';
  if(local&&p.get('worldShopPreview')==='1')return 'integration';
  if([...p.keys()].some(k=>/Test|Preview/.test(k)))return 'readonly';
  return 'live';
}
export class WorldAuthorityStore extends IndexedConstructionStore{
  constructor(mode,idb=globalThis.indexedDB){super(idb);if(!['live','integration'].includes(mode))throw Error('保存先が不正です。');this.name=mode==='live'?LIVE_WORLD_DB:WORLD_SHOP_TEST_DB;}
}
export class WorldSaveService{
  constructor({mode='live',store,readLegacy=()=>null,materialsIO=null,onChange=()=>{},onError=()=>{}}={}){
    if(!['live','integration','readonly'].includes(mode))throw Error('保存区分が不正です。');
    Object.assign(this,{mode,store:store||(mode==='readonly'?null:new WorldAuthorityStore(mode)),readLegacy,materialsIO,onChange,onError});
    this.ledger=null;this.raw=null;this.generation=null;this.blocked=false;this.jobs=[];this.running=false;this.ready=false;this.imported=false;
  }
  get busy(){return this.running||this.jobs.length>0||!!this.crafting;}
  get world(){return this.ledger?structuredClone(this.ledger.world):null;}
  get shopState(){return L.projectLinkedShop(this.ledger);}
  get constructionStock(){return L.projectConstructionStock(this.ledger);}
  accept(record){
    if(!record||!Number.isSafeInteger(record.generation)||record.generation<1||!Array.isArray(record.backups))throw Error('保存管理情報が不正です。');
    const next=L.unpackWorldPurchaseLedger(record.current);
    this.raw=record;this.generation=record.generation;this.ledger=next;
  }
  async initialize(defaultWorld){
    if(this.ready)throw Error('保存は初期化済みです。');
    try{
      if(this.mode==='readonly'){
        this.ledger=L.createWorldPurchaseLedger(this.readLegacy()??JSON.stringify(defaultWorld),'new-world');this.ready=true;return this.world;
      }
      const record=await this.store.read();
      if(record)this.accept(record);
      else{
        const legacy=this.mode==='live'?this.readLegacy():null;
        const seed=structuredClone(defaultWorld);
        if(this.mode==='integration')seed.ufoResources={...seed.ufoResources,spaceCoins:12};
        const next=L.createWorldPurchaseLedger(legacy??JSON.stringify(seed),legacy===null?'new-world':'legacy-world');
        const packet=L.packWorldPurchaseLedger(next);
        // First read/compare/write is atomic; another first importer wins, never gets overwritten.
        try{this.accept(await this.store.commit(null,packet));this.imported=legacy!==null;}
        catch(e){const winner=await this.store.read();if(!winner)throw e;this.accept(winner);}
        if(legacy!==null&&this.readLegacy()!==legacy)throw Error('移行中に旧画面が保存を変更しました。両方の保存を保護して停止します。旧画面を閉じて内容を確認してください。');
      }
      this.ready=true;
      if(this.ledger.world.equipmentCraftPending)await this.resumeEquipmentCraft();
      this.onChange(this);return this.world;
    }catch(e){this.blocked=true;this.onError(e);throw e;}
  }
  enqueue(fn){
    if(!this.ready||this.blocked)return Promise.reject(Error('保存を確認するまで操作できません。'));
    if(this.mode==='readonly')return Promise.resolve(null);
    const promise=new Promise((resolve,reject)=>this.jobs.push({fn,resolve,reject,packet:null,next:null,expected:null}));
    this.onChange(this);void this.drain();return promise;
  }
  async commitHead(job){
    if(!job.packet){job.next=job.fn(this.ledger);job.expected=this.generation;job.packet=L.packWorldPurchaseLedger(job.next);}
    if(job.next===this.ledger)return;
    this.accept(await this.store.commit(job.expected,job.packet));
  }
  async drain(){
    if(this.running||this.blocked)return;this.running=true;
    try{
      while(this.jobs.length&&!this.blocked){
        const job=this.jobs[0];
        try{await this.commitHead(job);this.jobs.shift();job.resolve(this.shopState);}
        catch(e){this.blocked=true;for(const waiting of this.jobs)waiting.reject(e);this.onError(e);}
        this.onChange(this);
      }
    }finally{this.running=false;this.onChange(this);}
  }
  async flush(){
    if(this.blocked)throw Error('保存が停止しています。保存の再試行または記録確認が必要です。');
    if(this.jobs.length)await this.enqueue(s=>s);
    if(this.blocked)throw Error('保存が停止しています。');
  }
  async retry(){
    if(this.running)throw Error('保存処理中です。');
    const job=this.jobs[0];
    if(this.blocked&&!job&&this.ledger?.world.equipmentCraftPending){this.blocked=false;await this.resumeEquipmentCraft();return this.flush();}
    if(!this.blocked||!job)return this.flush();
    const record=await this.store.read();
    if(job.packet&&record?.current===job.packet){this.accept(record);this.jobs.shift();job.resolve(this.shopState);}
    else if((record?.generation??null)!==job.expected)throw Error('別の画面で保存が更新されています。古い建築や残高で上書きはしません。記録を確認後、この画面を再読み込みしてください。');
    this.blocked=false;await this.drain();await this.flush();
    if(this.ledger.world.equipmentCraftPending)await this.resumeEquipmentCraft();
  }
  async craftEquipment(draft,equipment,beforeRaw,afterRaw,id){
    if(this.mode!=='live')throw Error('接続確認モードでは実際の装備素材を消費しません。');
    if(this.crafting||this.ledger?.world.equipmentCraftPending)throw Error('前の装備作成を先に確認してください。');
    this.crafting=true;this.onChange(this);
    try{
      await this.flush();
      const pending={version:1,id,beforeRaw,afterRaw,equipment:structuredClone(equipment)};
      this.validateCraft(pending);
      if(this.materialsIO.read()!==beforeRaw)throw Error('装備素材が別の画面で更新されています。消費せず停止しました。');
      await this.saveWorld({...draft,equipmentCraftPending:pending});
      await this.resumeEquipmentCraft();return this.world;
    }catch(e){this.blocked=true;this.onError(e);throw e;}
    finally{this.crafting=false;this.onChange(this);}
  }
  validateCraft(p){
    if(!p||p.version!==1||typeof p.id!=='string'||!/^[\w-]{8,96}$/.test(p.id)||!(p.beforeRaw===null||typeof p.beforeRaw==='string')||typeof p.afterRaw!=='string'||p.afterRaw.length>100000||!p.equipment||typeof p.equipment!=='object'||Array.isArray(p.equipment))throw Error('装備作成の復旧記録が不正です。');
    const after=JSON.parse(p.afterRaw);if(after?.version!==2||!['cloudFiber','skySightCrystal','arcadeParts'].every(k=>Number.isSafeInteger(after[k])&&after[k]>=0))throw Error('装備素材の復旧記録が不正です。');
  }
  async resumeEquipmentCraft(){
    const p=this.ledger?.world.equipmentCraftPending;if(!p)return;
    try{
      this.validateCraft(p);if(!this.materialsIO)throw Error('装備素材の保存へ接続できません。');
      const current=this.materialsIO.read();
      if(current===p.beforeRaw)this.materialsIO.write(p.afterRaw);
      else if(current!==p.afterRaw)throw Error('作成途中に装備素材が別の画面で更新されました。両方の記録を保護して停止しています。');
      if(this.materialsIO.read()!==p.afterRaw)throw Error('装備素材の保存を確認できません。');
      await this.saveWorld({...this.world,ufoEquipment:structuredClone(p.equipment),equipmentCraftPending:null});
    }catch(e){this.blocked=true;this.onError(e);throw e;}
  }
  saveWorld(draft,reward=null){
    const snapshot=structuredClone(draft),event=reward?structuredClone(reward):null;
    return this.enqueue(s=>{let next=s;if(event)next=L.awardLinkedFlightReward(next,event.resource,event.amount,event.id);return L.saveLinkedWorldDraft(next,snapshot);});
  }
  prepare(offer,q,id){return this.enqueue(s=>L.prepareLinkedOrder(s,offer,q,id));}
  async saveConstructionWater(work,draft,expectedRevision){
    if(this.mode==='readonly')throw Error('貸出・表示確認の水を本体へ保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから作業を保存してください。');
    const next=structuredClone(work),snapshot=structuredClone(draft);
    if(snapshot.map!=='construction')throw Error('工事現場の作業として保存してください。');
    L.saveConstructionWaterDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueue(s=>L.saveConstructionWaterDraft(s,next,snapshot,expectedRevision));
    return structuredClone(this.ledger.world.constructionWater);
  }
  async saveConstructionSoil(work,draft,expectedRevision){
    if(this.mode==='readonly')throw Error('貸出・表示確認の土を本体へ保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから土作業を保存してください。');
    const next=structuredClone(work),snapshot=structuredClone(draft);
    if(snapshot.map!=='construction')throw Error('工事現場の作業として保存してください。');
    L.saveConstructionSoilDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueue(s=>L.saveConstructionSoilDraft(s,next,snapshot,expectedRevision));
    return structuredClone(this.ledger.world.constructionSoil);
  }
  async saveConstructionTimber(work,draft,expectedRevision){
    if(this.mode==='readonly')throw Error('貸出・表示確認の木材を本体へ保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから木材作業を保存してください。');
    const next=structuredClone(work),snapshot=structuredClone(draft);
    if(snapshot.map!=='construction')throw Error('工事現場の作業として保存してください。');
    L.saveConstructionTimberDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueue(s=>L.saveConstructionTimberDraft(s,next,snapshot,expectedRevision));
    return structuredClone(this.ledger.world.constructionTimber);
  }
  async receiveConstruction(offer,quantity,id,context,draft){
    if(this.mode==='readonly')throw Error('この確認画面では受取保存を行いません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理が終わってから受け取ってください。');
    const place=structuredClone(context),snapshot=structuredClone(draft);
    if(snapshot.map!==place?.map||snapshot.position?.x!==place?.position?.x||snapshot.position?.z!==place?.position?.z)throw Error('現在地が一致しません。');
    // Expected refusals (empty stock / wrong location) do not block all world saves.
    const checked=L.receiveConstructionMaterial(this.ledger,offer,quantity,id,place);
    if(checked===this.ledger)return this.constructionStock;
    L.saveLinkedWorldDraft(checked,snapshot);
    await this.enqueue(s=>L.saveLinkedWorldDraft(L.receiveConstructionMaterial(s,offer,quantity,id,place),snapshot));
    return this.constructionStock;
  }
  settle(id,{cancel=false}={}){return this.enqueue(s=>L.settleLinkedOrder(s,id,{cancel}));}
  export(){return L.packWorldPurchaseLedger(this.ledger);}
  exportRecovery(){return JSON.stringify({scope:'world-save-recovery-readonly',committed:this.raw,pending:this.jobs.map(j=>({expected:j.expected,packet:j.packet})),legacy:this.mode==='live'?this.readLegacy():null},null,2);}
}
