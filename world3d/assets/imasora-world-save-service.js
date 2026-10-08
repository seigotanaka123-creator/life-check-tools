import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=119bd';
import {EARTH_AUTHORITY_SCOPE,EARTH_LIVE_SCOPE} from './imasora-construction-earth-authority.js?v=496';
import {canonical} from './imasora-construction-state.js';
import {commitEarthRestore,readEarthRestore,readEarthRestoreState,validateEarthRestoreBefore,validateEarthRestoreJournal,createEarthRestoreLedger} from './imasora-construction-earth-restore-store.js?v=497';
import {commitMapReset,readMapResetState,validateMapResetJournal,createMapResetLedger,validateMapResetBefore,mapBuildings,keptMapBuildings,removeOneMapBuilding,moveOneMapBuilding,mapResetKey} from './imasora-world-map-reset-store.js?v=511';
import {WorldDraftGuard} from './imasora-world-draft-guard.js';
import {commitVehicleRestore,readVehicleRestoreState,validateVehicleRestoreJournal} from './imasora-construction-vehicle-restore-store.js?v=502';
import {vehicleRestoreSpec,vehicleRestoreUndoCandidate,vehicleRestoreUndoMatches,validateVehicleRestoreBefore,createVehicleRestoreLedger} from './imasora-construction-vehicle-restore.js?v=502';
import {withWorkshopWriteLock,createEquipmentCraft,validateEquipmentCraft,equipmentCraftWasPaid} from './imasora-workshop-write-guard.js';
import {assertConstructionToolReceipt} from './imasora-construction-profile-site-controller.js?v=119b';
import {FREE_CONTACT_ACTIONS,assertFreeReceipt} from './imasora-construction-concrete/free-contact.mjs';
import {FREE_VEHICLE_ACTIONS,assertVehicleReceipt} from './imasora-construction-concrete/free-vehicle-contact.mjs';
import {PIPE_ACTIONS,assertPipeReceipt} from './imasora-construction-concrete/free-boom-contact.mjs';
import {SUPPORTED_WORK_MOVE,assertSupportedWorkMoveReceipt} from './imasora-construction-concrete/free-supported-work-move.mjs';
import {FOUNDATION_ACTIONS} from './imasora-construction-concrete/free-foundation-state.mjs';
import {assertFoundationReceipt} from './imasora-construction-concrete/free-foundation-operation.mjs';
import {projectStarterToolkit,assertStarterTool,requiredStarterTool} from './imasora-construction-toolkit.mjs?v=120e';
import {worldTransportTotals} from './imasora-construction-transport-authority.mjs';
import {prepareTransportRestorePlan,snapshotTransportRestoreRecord,sameTransportRestoreValue,validateTransportRestoreJournal} from './imasora-construction-transport-restore.mjs';
import {runTransportRecoveryTask} from './imasora-construction-recovery-client.mjs';
import {runWorldSaveTask} from './imasora-world-save-client.mjs';
import {commitTransportRestore,readTransportRestoreState} from './imasora-construction-transport-restore-store.mjs';
import {assertWorldTransportWorkReceipt} from './imasora-construction-transport-work-flow.mjs';
import {createTransportMigrationPlan,validateTransportMigrationJournal} from './imasora-construction-transport-migration.mjs';
import {commitTransportMigration,readTransportMigrationState} from './imasora-construction-transport-migration-store.mjs';

export const LIVE_WORLD_DB='imasora-world-authority-v1';
export const WORLD_SHOP_TEST_DB='imasora-world-shop-integration-development-v1';
export const LEGACY_WORLD_KEY='imasora-world-foundation-v3';
export const WORKSHOP_MATERIAL_KEY='imasora-ufo-workshop-materials-v1';
export const EXCAVATION_AUTHORITY_DB='imasora-world-excavation-authority-development-v1';
export const CONSTRUCTION_PROFILE_PROJECT_TEST_DB='imasora-construction-profile-project-development-v1';
export class ExcavationAuthorityStore extends IndexedConstructionStore{
  constructor(idb=globalThis.indexedDB){super(idb);this.name=EXCAVATION_AUTHORITY_DB;}
}
// Separate, explicit browser fixture for profile-funded C2 UI checks. This
// store is never the live world authority or the earlier C1/C2 trial database.
export class ConstructionProfileProjectPreviewStore extends IndexedConstructionStore{
  constructor(idb=globalThis.indexedDB){super(idb);this.name=CONSTRUCTION_PROFILE_PROJECT_TEST_DB;}
}
export function worldSaveMode(search,hostname){
  const p=new URLSearchParams(search),local=['127.0.0.1','localhost'].includes(hostname);
  if(p.get('constructionWaterPractice')==='1'||p.get('constructionSoilPractice')==='1'||p.get('constructionTimberPractice')==='1')return 'readonly';
  if(local&&p.get('worldShopPreview')==='1')return 'integration';
  if([...p.keys()].some(k=>/Test|Preview/.test(k)))return 'readonly';
  return 'live';
}
export class WorldAuthorityStore extends IndexedConstructionStore{
  constructor(mode,idb=globalThis.indexedDB){super(idb);if(!['live','integration'].includes(mode))throw Error('保存先が不正です。');this.name=mode==='live'?LIVE_WORLD_DB:WORLD_SHOP_TEST_DB;}
  commitTransportRestore(journal){return commitTransportRestore(this,journal);}
  readTransportRestoreState(){return readTransportRestoreState(this);}
  commitTransportMigration(journal){return commitTransportMigration(this,journal);}
  readTransportMigrationState(){return readTransportMigrationState(this);}
  commitEarthRestore(journal){return commitEarthRestore(this,journal);}
  readEarthRestore(){return readEarthRestore(this);}
  readEarthRestoreState(){return readEarthRestoreState(this);}
  commitMapReset(journal){return commitMapReset(this,journal);}
  readMapResetState(map){return readMapResetState(this,map);}
  commitVehicleRestore(journal){return commitVehicleRestore(this,journal);}
  readVehicleRestoreState(kind){return readVehicleRestoreState(this,kind);}
}
export class WorldSaveService{
  constructor({mode='live',store,readLegacy=()=>null,materialsIO=null,onChange=()=>{},onError=()=>{},excavationPreview=false,excavationLive=false,constructionProjectPreview=false,excavationOrigin=null,transportAuthority=false,transportWork=false,guardedDrafts=false,workshopLock=withWorkshopWriteLock,backgroundSaveMinimumChars=2*1024*1024}={}){
    if(!['live','integration','readonly'].includes(mode))throw Error('保存区分が不正です。');
    if(!Number.isSafeInteger(backgroundSaveMinimumChars)||backgroundSaveMinimumChars<0)throw Error('セーブの処理設定が不正です。');
    this.backgroundSaveMinimumChars=backgroundSaveMinimumChars;
    Object.assign(this,{mode,store:store||(mode==='readonly'?null:new WorldAuthorityStore(mode)),readLegacy,materialsIO,onChange,onError});
    if(excavationPreview&&(mode!=='integration'||this.store?.name!==EXCAVATION_AUTHORITY_DB))throw Error('掘削の同時保存確認は専用の保存領域で行ってください。');
    if(excavationLive&&(excavationPreview||mode!=='live'||this.store?.name!==LIVE_WORLD_DB))throw Error('通常の地形は本体の保存領域だけで利用できます。');
    if(transportAuthority&&(!excavationLive||mode!=='live'||this.store?.name!==LIVE_WORLD_DB))throw Error('共有土は対応した通常保存の画面だけで利用できます。');
    this.transportAuthority=transportAuthority;
    if(transportWork&&!transportAuthority)throw Error('人物と車両の保存には共有土への対応が必要です。');
    this.transportWork=transportWork;
    if(constructionProjectPreview&&(mode!=='integration'||this.store?.name!==CONSTRUCTION_PROFILE_PROJECT_TEST_DB))throw Error('施工プロフィール試作は専用の隔離保存領域で行ってください。');
    if(this.store?.name===CONSTRUCTION_PROFILE_PROJECT_TEST_DB&&!constructionProjectPreview)throw Error('施工プロフィール試作の保存先には専用確認画面が必要です。');
    this.constructionProjectPreview=constructionProjectPreview;
    this.excavationPreview=excavationPreview;this.excavationLive=excavationLive;this.excavationOrigin=excavationOrigin;
    this.draftGuard=guardedDrafts?new WorldDraftGuard():null;this.workshopLock=workshopLock;
    this.mapResetPoints={};this.ledger=null;this.raw=null;this.generation=null;this.blocked=false;this.jobs=[];this.running=false;this.ready=false;this.imported=false;
  }
  // A failed job stays queued for reconciliation, but is no longer running.
  // Keep `blocked` true to prohibit new work while allowing the retry UI.
  get busy(){return this.running||(!this.blocked&&this.jobs.length>0)||!!this.crafting||!!this.reconciling||!!this.preparingTransportRestore;}
  get world(){return this.ledger?this.issueDraft(structuredClone(this.ledger.world)):null;}
  issueDraft(draft){return this.draftGuard?.issue(draft)??draft;}
  deriveDraft(draft,overrides){return this.draftGuard?this.draftGuard.derive(draft,overrides):{...structuredClone(draft),...structuredClone(overrides)};}
  enqueueDraft(draft,fn,{craft=false,prepare}={}){
    if(this.preparingTransportRestore)return Promise.reject(Error('現場を戻す準備が終わるまでお待ちください。'));
    if(this.migratingTransport)return Promise.reject(Error('現場の引継ぎ結果を確認してから保存してください。'));
    if(this.restoringTransport)return Promise.reject(Error('現場の復元結果を確認してから保存してください。'));
    if(this.mode==='readonly')return Promise.resolve(null);
    if(this.restoringVehicle)return Promise.reject(Error('車両の復元結果を確認してから保存してください。'));
    if(this.restoringMapReset)return Promise.reject(Error('建造物の片付け結果を確認してから保存してください。'));
    if(this.restoringEarth)return Promise.reject(Error('地形の復元を確認してから保存してください。'));
    if(!this.ready||this.blocked||(!craft&&this.crafting))return Promise.reject(Error('保存を確認するまで操作できません。'));
    try{
      let captured;
      if(this.draftGuard)captured=this.draftGuard.consume(draft,prepare);
      else{const snapshot=structuredClone(draft);captured={snapshot,token:null,prepared:prepare?.(snapshot)};}
      const {snapshot,token,prepared}=captured;
      return this.enqueue(s=>fn(s,snapshot,prepared),{draftToken:token,craft});
    }catch(e){return Promise.reject(e);}
  }
  get shopState(){return L.projectLinkedShop(this.ledger);}
  get constructionStock(){return L.projectConstructionStock(this.ledger);}
  get constructionPackTrialStock(){return L.projectConstructionPackTrial(this.ledger);}
  get constructionToolkit(){
    if(!this.ledger)return null;
    if(this.toolkitLedger!==this.ledger){this.toolkitValue=projectStarterToolkit(this.constructionPackTrialStock,this.constructionTransferProfileId);this.toolkitLedger=this.ledger;}
    return structuredClone(this.toolkitValue);
  }
  get constructionWorkPlatform(){return structuredClone(this.ledger?.world.constructionWorkPlatform??null);}
  get constructionTransport(){return structuredClone(this.ledger?.world.constructionTransport??null);}
  get constructionTransportTotals(){const s=this.ledger;return s?.world.constructionTransport?worldTransportTotals(s.world.constructionTransport,s.world.constructionExcavation,s.source.fingerprint):null;}
  get constructionConcreteProject(){return L.projectConstructionProfileProject(this.ledger);}
  get constructionConcreteStock(){return L.projectConstructionProfileStock(this.ledger);}
  canWriteConstructionProfileProject(){return(this.mode==='live'&&this.excavationLive&&this.store?.name===LIVE_WORLD_DB)||(this.constructionProjectPreview&&this.mode==='integration'&&this.store?.name===CONSTRUCTION_PROFILE_PROJECT_TEST_DB);}
  canReceiveConstructionPackTrial(){return(this.mode==='live'&&this.store?.name===LIVE_WORLD_DB)||(this.constructionProjectPreview&&this.mode==='integration'&&this.store?.name===CONSTRUCTION_PROFILE_PROJECT_TEST_DB);}
  get constructionTransferProfileId(){return this.ledger?.source?.fingerprint??null;}
  accept(record){
    if(!record||!Number.isSafeInteger(record.generation)||record.generation<1||!Array.isArray(record.backups))throw Error('保存管理情報が不正です。');
    const next=L.unpackWorldPurchaseLedger(record.current);
    this.#adoptCheckedRecord(record,next);
  }
  #backgroundSave(raw=this.raw?.current){return this.transportWork&&typeof raw==='string'&&raw.length>=this.backgroundSaveMinimumChars;}
  async acceptStored(record){
    // Small saves retain the original path: starting a new worker can cost
    // more than the work saved. Large shared-earth saves use the same checks
    // in a worker. No blocking fallback is used if that worker fails.
    if(!this.#backgroundSave(record?.current)){this.accept(record);return;}
    if(!record||!Number.isSafeInteger(record.generation)||record.generation<1||!Array.isArray(record.backups))throw Error('保存管理情報が不正です。');
    const frozen=structuredClone(record),ledger=this.ledger,gen=this.generation,raw=this.raw?.current;
    const next=await runWorldSaveTask('unpack',{raw:frozen.current});
    if(this.ledger!==ledger||this.generation!==gen||this.raw?.current!==raw)throw Error('読込み中に保存が変わりました。古い内容で置き換えず停止しました。');
    this.#adoptCheckedRecord(frozen,next);
  }
  async #acceptCommitted(record,job){
    if(!job.checkedLedger){await this.acceptStored(record);return;}
    // The worker fully validated the snapshot used to make this exact packet.
    // Adopt it only after the atomic store confirms both bytes and generation.
    if(!record||!Number.isSafeInteger(record.generation)||record.generation<1||record.generation!==job.expected+1||record.current!==job.packet||!Array.isArray(record.backups))throw Error('保存結果が準備した内容と一致しません。作業を保持して停止しました。');
    this.#adoptCheckedRecord(structuredClone(record),job.checkedLedger);
  }
  #adoptCheckedRecord(record,next){
    if(next.world.constructionTransport&&!this.transportAuthority)throw Error('共有土に対応した画面で保存を開いてください。古い地形で上書きせず停止しました。');
    if(next.world.constructionTransport?.version===2&&!this.transportWork)throw Error('人物・車両・作業途中に対応した画面で保存を開いてください。');
    const earth=next.world.constructionExcavation;
    if(earth){
      const live=this.mode==='live',scope=live?EARTH_LIVE_SCOPE:EARTH_AUTHORITY_SCOPE;
      if(earth.scope!==scope)throw Error('通常の地形と試験用の地形は相互に読み込めません。元の記録を保持して停止しました。');
      if(earth.origin!==this.excavationOrigin)throw Error('掘削の保存元が一致しません。別のアドレスへ移行せず停止しました。');
      if(live&&(!this.excavationLive||this.store?.name!==LIVE_WORLD_DB))throw Error('通常の掘削に対応した画面で保存を開いてください。');
      if(!live&&(!this.excavationPreview||this.store?.name!==EXCAVATION_AUTHORITY_DB))throw Error('試験地形は専用の確認画面で開いてください。');
    }
    this.raw=record;this.generation=record.generation;this.ledger=next;
  }
  async initialize(defaultWorld){
    if(this.ready)throw Error('保存は初期化済みです。');
    try{
      if(this.mode==='readonly'){
        this.ledger=L.createWorldPurchaseLedger(this.readLegacy()??JSON.stringify(defaultWorld),'new-world');this.ready=true;return this.world;
      }
      const record=await this.store.read();
      if(record)await this.acceptStored(record);
      else{
        const legacy=this.mode==='live'?this.readLegacy():null;
        const seed=structuredClone(defaultWorld);
        if(this.mode==='integration')seed.ufoResources={...seed.ufoResources,spaceCoins:12};
        const next=L.createWorldPurchaseLedger(legacy??JSON.stringify(seed),legacy===null?'new-world':'legacy-world');
        const packet=L.packWorldPurchaseLedger(next);
        // First read/compare/write is atomic; another first importer wins, never gets overwritten.
        try{await this.acceptStored(await this.store.commit(null,packet));this.imported=legacy!==null;}
        catch(e){const winner=await this.store.read();if(!winner)throw e;await this.acceptStored(winner);}
        if(legacy!==null&&this.readLegacy()!==legacy)throw Error('移行中に旧画面が保存を変更しました。両方の保存を保護して停止します。旧画面を閉じて内容を確認してください。');
      }
      this.ready=true;
      this.draftGuard?.invalidate();
      if(this.ledger.world.equipmentCraftPending)await this.resumeEquipmentCraft();
      this.onChange(this);return this.world;
    }catch(e){this.blocked=true;this.onError(e);throw e;}
  }
  enqueue(fn,{draftToken=null,craft=false,earthRestore=null,mapReset=null,vehicleRestore=null,transportRestore=null,transportMigration=null}={}){
    if(this.preparingTransportRestore)return Promise.reject(Error('現場を戻す準備が終わるまでお待ちください。'));
    if(!this.ready||this.blocked||(!craft&&this.crafting))return Promise.reject(Error('保存を確認するまで操作できません。'));
    if(this.migratingTransport&&!transportMigration)return Promise.reject(Error('現場の引継ぎ結果を確認してから保存してください。'));
    if(this.restoringTransport&&!transportRestore)return Promise.reject(Error('現場の復元結果を確認してから保存してください。'));
    if(this.restoringVehicle&&!vehicleRestore)return Promise.reject(Error('車両の復元結果を確認してから保存してください。'));
    if(this.restoringMapReset&&!mapReset)return Promise.reject(Error('建造物の片付け結果を確認してから保存してください。'));
    if(this.restoringEarth&&!earthRestore)return Promise.reject(Error('地形の復元を確認してから保存してください。'));
    if(this.mode==='readonly')return Promise.resolve(null);
    const promise=new Promise((resolve,reject)=>this.jobs.push({fn,resolve,reject,packet:null,next:null,expected:null,draftToken,earthRestore,mapReset,vehicleRestore,transportRestore,transportMigration}));
    this.onChange(this);void this.drain();return promise;
  }
  async commitHead(job){
    if(!job.packet){
      const base=this.ledger,raw=this.raw?.current;job.next=job.fn(base);job.expected=this.generation;
      const prepared=this.#backgroundSave()?await runWorldSaveTask('pack-checked',{ledger:job.next}):null;
      const packet=prepared?prepared.packet:L.packWorldPurchaseLedger(job.next);
      if(this.ledger!==base||this.generation!==job.expected||this.raw?.current!==raw)throw Error('保存の準備中に現場が変わりました。上書きせず停止しました。');
      job.packet=packet;if(prepared)job.checkedLedger=prepared.ledger;
    }
    if(job.next===this.ledger){if(job.draftToken)this.draftGuard.discard(job.draftToken);return;}
    if(job.transportMigration){
      if(job.expected!==job.transportMigration.expectedGeneration||job.packet!==job.transportMigration.appliedRaw)throw Error('引継ぎ確認後に保存が変わりました。');
      await this.#acceptCommitted(await this.store.commitTransportMigration(job.transportMigration),job);
      this.draftGuard?.invalidate();this.migratingTransport=false;
    }else if(job.transportRestore){
      if(job.expected!==job.transportRestore.expectedGeneration||job.packet!==job.transportRestore.appliedRaw)throw Error('現場の復元確認後に保存が変わりました。');
      await this.#acceptCommitted(await this.store.commitTransportRestore(job.transportRestore),job);this.transportRestorePoint=structuredClone(job.transportRestore);
      this.draftGuard?.invalidate();this.restoringTransport=false;
    }else if(job.vehicleRestore){
      if(job.expected!==job.vehicleRestore.expectedGeneration||job.packet!==job.vehicleRestore.appliedRaw)throw Error('車両復元の確認後に保存が変わりました。');
      await this.#acceptCommitted(await this.store.commitVehicleRestore(job.vehicleRestore),job);
      this.draftGuard?.invalidate();this.restoringVehicle=false;
    }else if(job.mapReset){
      if(job.expected!==job.mapReset.expectedGeneration||job.packet!==job.mapReset.appliedRaw)throw Error('片付けの確認後に保存内容が変わりました。');
      await this.#acceptCommitted(await this.store.commitMapReset(job.mapReset),job);
      this.mapResetPoints[job.mapReset.map]=structuredClone(job.mapReset);
      this.draftGuard?.invalidate();this.restoringMapReset=false;
    }else if(job.earthRestore){
      if(job.expected!==job.earthRestore.expectedGeneration||job.packet!==job.earthRestore.appliedRaw)throw Error('復元確認後に保存内容が変わりました。');
      await this.#acceptCommitted(await this.store.commitEarthRestore(job.earthRestore),job);
      this.draftGuard?.invalidate();this.restoringEarth=false;
    }else await this.#acceptCommitted(await this.store.commit(job.expected,job.packet),job);
    if(job.draftToken)this.draftGuard.committed(job.draftToken);
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
    if(this.jobs.length)await this.enqueue(s=>s,{craft:true});
    if(this.blocked)throw Error('保存が停止しています。');
  }
  async retry(){
    if(this.running||this.reconciling)throw Error('保存処理中です。');
    this.reconciling=true;this.onChange(this);
    try{return await this.#reconcileRetry();}
    finally{this.reconciling=false;this.onChange(this);}
  }
  async #reconcileRetry(){
    const job=this.jobs[0];
    if(this.blocked&&!job&&this.ledger?.world.equipmentCraftPending){this.blocked=false;await this.resumeEquipmentCraft();return this.flush();}
    if(!this.blocked||!job)return this.flush();
    const state=job.transportMigration?await this.store.readTransportMigrationState():job.transportRestore?await this.store.readTransportRestoreState():job.vehicleRestore?await this.store.readVehicleRestoreState(job.vehicleRestore.vehicleKind):job.mapReset?await this.store.readMapResetState(job.mapReset.map):job.earthRestore?await this.store.readEarthRestoreState():{record:await this.store.read()},record=state.record;
    if(job.packet&&record?.generation===(job.expected??0)+1&&record?.current===job.packet){
      if(job.transportMigration){validateTransportMigrationJournal(state.journal);if(canonical(state.journal)!==canonical(job.transportMigration))throw Error('引継ぎ前の控えと保存結果が一致しません。記録を保持して停止します。');}
      if(job.transportRestore){validateTransportRestoreJournal(state.journal);if(canonical(state.journal)!==canonical(job.transportRestore))throw Error('現場の控えと復元結果が一致しません。停止して保持します。');}
      if(job.vehicleRestore){validateVehicleRestoreJournal(state.journal);if(canonical(state.journal)!==canonical(job.vehicleRestore))throw Error('車両の直前控えと復元結果が一致しません。記録を保持して停止します。');}
      if(job.mapReset){validateMapResetJournal(state.journal);if(canonical(state.journal)!==canonical(job.mapReset))throw Error('建造物の直前控えと保存の結果が一致しません。記録を保持して停止します。');}
      if(job.earthRestore){validateEarthRestoreJournal(state.journal);if(canonical(state.journal)!==canonical(job.earthRestore))throw Error('復元前控えと保存の結果が一致しません。記録を保持して停止します。');}
      await this.#acceptCommitted(record,job);if(job.draftToken)this.draftGuard.committed(job.draftToken);
      if(job.transportMigration){this.draftGuard?.invalidate();this.migratingTransport=false;}
      if(job.transportRestore){this.draftGuard?.invalidate();this.restoringTransport=false;this.transportRestorePoint=structuredClone(job.transportRestore);}
      if(job.vehicleRestore){this.draftGuard?.invalidate();this.restoringVehicle=false;}
      if(job.mapReset){this.mapResetPoints[job.mapReset.map]=structuredClone(job.mapReset);this.draftGuard?.invalidate();this.restoringMapReset=false;}
      if(job.earthRestore){this.draftGuard?.invalidate();this.restoringEarth=false;}this.jobs.shift();job.resolve(this.shopState);
    }
    else if((record?.generation??null)!==job.expected)throw Error('別の画面で保存が更新されています。古い建築や残高で上書きはしません。記録を確認後、この画面を再読み込みしてください。');
    else if(job.transportMigration&&record?.current!==job.transportMigration.expectedRaw)throw Error('同じ保存番号の内容が変わりました。現場を引き継がず停止します。');
    else if(job.transportRestore&&record?.current!==job.transportRestore.expectedRaw)throw Error('同じ保存番号の内容が変わりました。現場を復元せず停止します。');
    else if(job.vehicleRestore&&record?.current!==job.vehicleRestore.expectedRaw)throw Error('同じ保存番号の内容が変更されています。車両を復元せず停止します。');
    else if(job.mapReset&&record?.current!==job.mapReset.expectedRaw)throw Error('同じ保存番号の内容が変更されています。片付けず停止します。');
    else if(job.earthRestore&&record?.current!==job.earthRestore.expectedRaw)throw Error('同じ保存番号の内容が変更されています。復元せず停止します。');
    this.blocked=false;await this.drain();await this.flush();
    if(this.ledger.world.equipmentCraftPending)await this.resumeEquipmentCraft();
  }
  async craftEquipment(draft,equipment,beforeRaw,afterRaw,id){
    if(this.mode!=='live')throw Error('接続確認モードでは実際の装備素材を消費しません。');
    if(this.restoringTransport)throw Error('現場の復元結果を確認してから装備を作成してください。');
    if(this.restoringVehicle)throw Error('車両の復元結果を確認してから装備を作成してください。');
    if(this.restoringMapReset)throw Error('建造物の片付け結果を確認してから装備を作成してください。');
    if(this.restoringEarth)throw Error('地形の復元を確認してから装備を作成してください。');
    if(this.crafting||this.ledger?.world.equipmentCraftPending)throw Error('前の装備作成を先に確認してください。');
    this.crafting=true;this.onChange(this);
    try{
      await this.flush();
      return await this.workshopLock(async()=>{
        const pending=createEquipmentCraft({id,beforeRaw,afterRaw,equipment});
        this.validateCraft(pending);
        if(!this.materialsIO||this.materialsIO.read()!==beforeRaw)throw Error('装備素材が別の画面で更新されています。消費せず停止しました。');
        await this.saveCraftWorld(this.deriveDraft(draft,{equipmentCraftPending:pending}));
        await this.resumeEquipmentCraftLocked();return this.world;
      });
    }catch(e){this.blocked=true;this.onError(e);throw e;}
    finally{this.crafting=false;this.onChange(this);}
  }
  validateCraft(p){
    validateEquipmentCraft(p);
  }
  async resumeEquipmentCraft(){
    if(!this.ledger?.world.equipmentCraftPending)return;
    if(this.crafting)throw Error('装備作成の保存処理中です。');
    this.crafting=true;this.onChange(this);
    try{await this.flush();return await this.workshopLock(()=>this.resumeEquipmentCraftLocked());}
    catch(e){if(!this.blocked){this.blocked=true;this.onError(e);}throw e;}
    finally{this.crafting=false;this.onChange(this);}
  }
  async resumeEquipmentCraftLocked(){
    let p=this.ledger?.world.equipmentCraftPending;if(!p)return;
    try{
      this.validateCraft(p);if(!this.materialsIO)throw Error('装備素材の保存へ接続できません。');
      const record=await this.store.read();
      if(record?.generation!==this.generation||record?.current!==this.raw?.current)throw Error('別の画面で保存が更新されています。素材を消費せず停止しました。');
      const current=this.materialsIO.read();
      if(!equipmentCraftWasPaid(p,current)){
        if(p.version===2){
          p={...p,debitPhase:'attempted'};
          await this.saveCraftWorld(this.deriveDraft(this.world,{equipmentCraftPending:p}));
          if(this.materialsIO.read()!==current)throw Error('素材の変更を検出したため消費せず停止しました。');
        }
        this.materialsIO.write(p.afterRaw);
      }
      if(!equipmentCraftWasPaid(p,this.materialsIO.read()))throw Error('装備素材の保存を確認できません。');
      await this.saveCraftWorld(this.deriveDraft(this.world,{ufoEquipment:structuredClone(p.equipment),equipmentCraftPending:null}));
    }catch(e){this.blocked=true;this.onError(e);throw e;}
  }
  saveWorld(draft,reward=null){
    const event=reward?structuredClone(reward):null;
    return this.enqueueDraft(draft,(s,snapshot)=>{let next=s;if(event)next=L.awardLinkedFlightReward(next,event.resource,event.amount,event.id);return L.saveLinkedWorldDraft(next,snapshot);});
  }
  saveCraftWorld(draft){return this.enqueueDraft(draft,(s,snapshot)=>L.saveLinkedWorldDraft(s,snapshot,{craft:true}),{craft:true});}
  prepare(offer,q,id){return this.enqueue(s=>L.prepareLinkedOrder(s,offer,q,id));}
  checkExcavationWrite(origin,draft){
    const live=this.excavationLive&&this.mode==='live'&&this.store?.name===LIVE_WORLD_DB;
    const preview=this.excavationPreview&&this.mode==='integration'&&this.store?.name===EXCAVATION_AUTHORITY_DB;
    if(!live&&!preview)throw Error('この画面では掘削地形を保存できません。通常作業か専用の接続確認を開いてください。');
    if(origin!==this.excavationOrigin)throw Error('掘削の保存元が一致しません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから掘削作業を保存してください。');
    if(draft?.map!=='construction')throw Error('工事現場の作業として保存してください。');
  }
  async allocateConstructionExcavation(site,origin,grantId,draft){
    this.checkExcavationWrite(origin,draft);const snapshot=structuredClone(draft);
    const checked=L.allocateConstructionExcavation(this.ledger,site,origin,grantId,snapshot,{live:this.excavationLive});
    if(checked!==this.ledger)await this.enqueueDraft(draft,(s,current)=>L.allocateConstructionExcavation(s,site,origin,grantId,current,{live:this.excavationLive}));
    return structuredClone(this.ledger.world.constructionExcavation);
  }
  async saveConstructionExcavation(record,draft,expectedRevision){
    this.checkExcavationWrite(record?.origin,draft);const next=structuredClone(record),snapshot=structuredClone(draft);
    L.saveConstructionExcavationDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueueDraft(draft,(s,current)=>L.saveConstructionExcavationDraft(s,next,current,expectedRevision));
    return structuredClone(this.ledger.world.constructionExcavation);
  }
  // This is the single quantity writer. Scene controllers must still provide
  // physical work/actor checkpoints before enabling this mode in normal play.
  checkTransportWrite(draft){
    if(!this.transportAuthority||this.mode!=='live'||!this.excavationLive||this.store?.name!==LIVE_WORLD_DB)throw Error('共有土に対応した通常保存の画面で操作してください。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから土を動かしてください。');
    if(this.ledger?.world.constructionExcavation?.origin!==this.excavationOrigin)throw Error('土の保存元が一致しません。');
    if(draft?.map!=='construction')throw Error('工事現場の作業として保存してください。');
  }
  async enableConstructionTransport(draft,expectedEarthRevision){
    this.checkTransportWrite(draft);
    const checked=L.enableConstructionTransport(this.ledger,structuredClone(draft),expectedEarthRevision);
    if(checked!==this.ledger)await this.enqueueDraft(draft,(s,current)=>L.enableConstructionTransport(s,current,expectedEarthRevision));
    return this.constructionTransport;
  }
  async applyConstructionTransportCommand(command,draft){
    this.checkTransportWrite(draft);const frozen=structuredClone(command);
    const checked=L.applyConstructionTransportCommand(this.ledger,frozen,structuredClone(draft));
    if(checked!==this.ledger)await this.enqueueDraft(draft,(s,current)=>L.applyConstructionTransportCommand(s,frozen,current));
    return this.constructionTransport;
  }
  async enableConstructionTransportWork(draft,expectedEarthRevision){
    this.checkTransportWrite(draft);if(!this.transportWork)throw Error('人物と車両に対応した画面で操作してください。');
    const checked=L.enableConstructionTransportWork(this.ledger,structuredClone(draft),expectedEarthRevision);
    if(checked!==this.ledger)await this.enqueueDraft(draft,(s,current)=>L.enableConstructionTransportWork(s,current,expectedEarthRevision));
    return this.constructionTransport;
  }
  checkTransportMigration(gen,raw){
    if(!this.transportWork||!this.transportAuthority||this.mode!=='live'||!this.excavationLive||this.store?.name!==LIVE_WORLD_DB)throw Error('通常保存に対応した画面で引き継いでください。');
    if(!this.ready||this.blocked||this.busy||this.migratingTransport||this.restoringTransport||this.restoringEarth||this.restoringMapReset||this.restoringVehicle)throw Error('保存処理を確認してから引き継いでください。');
    if(this.ledger?.world.constructionExcavation?.origin!==this.excavationOrigin)throw Error('土の保存元が一致しません。');
    if(gen!==this.generation||raw!==this.raw?.current)throw Error('確認後に保存が変わりました。内容を確認し直してください。');
    if(typeof this.store.commitTransportMigration!=='function'||typeof this.store.readTransportMigrationState!=='function')throw Error('引継ぎ前の控えを同時保存できません。');
  }
  prepareConstructionTransportMigration(recoverLegacy=false,relocate=false){
    this.checkTransportMigration(this.generation,this.raw?.current);
    return createTransportMigrationPlan(this.raw.current,this.generation,crypto.randomUUID(),recoverLegacy,relocate);
  }
  async migrateConstructionTransport(point){
    validateTransportMigrationJournal(point);this.checkTransportMigration(point.expectedGeneration,point.expectedRaw);
    const frozen=structuredClone(point),next=L.unpackWorldPurchaseLedger(frozen.appliedRaw);this.migratingTransport=true;
    await this.enqueue(()=>next,{transportMigration:frozen});return this.constructionTransport;
  }
  async readConstructionTransportMigration(){
    if(this.mode!=='live'||!this.ready||this.blocked||this.busy||this.store?.name!==LIVE_WORLD_DB||!this.transportWork)throw Error('保存を確認してから引継ぎ前の控えを読んでください。');
    const gen=this.generation,raw=this.raw.current,state=await this.store.readTransportMigrationState();
    if(this.generation!==gen||this.raw.current!==raw||state.record?.generation!==gen||state.record?.current!==raw)throw Error('別の画面で保存が変わりました。');
    if(state.journal===null)return null;const point=validateTransportMigrationJournal(state.journal),before=L.unpackWorldPurchaseLedger(point.expectedRaw);
    if(before.source.fingerprint!==this.ledger.source.fingerprint||before.world.constructionExcavation.origin!==this.excavationOrigin)throw Error('引継ぎ前の控えの保存元が違います。');
    return structuredClone(point);
  }
  async saveConstructionTransportWork(record,draft,expectedRevision){
    this.checkTransportWrite(draft);if(!this.transportWork)throw Error('人物と車両に対応した画面で操作してください。');
    // Keep the physical receipt's object identity through the write boundary.
    const base=this.ledger,generation=this.generation,raw=this.raw.current;
    const unchanged=()=>this.ledger===base&&this.generation===generation&&this.raw.current===raw;
    const changed=()=>{if(!unchanged())throw Error('保存の準備中に状態が変わりました。現在の現場から保存し直してください。');};
    await this.enqueueDraft(draft,(s,_snapshot,next)=>{
      // This candidate was fully checked before accepting the draft. It is
      // private to this queued save; no cache is reused by a different save.
      changed();if(s!==base)throw Error('保存の準備中に状態が変わりました。');return next;
    },{prepare:snapshot=>{
      changed();this.checkTransportWrite(snapshot);
      const next=L.saveConstructionTransportWork(base,record,snapshot,expectedRevision);
      changed();this.checkTransportWrite(snapshot);return next;
    }});
    return this.constructionTransport;
  }
  checkTransportRestore(gen,raw){
    if(!this.transportWork||!this.transportAuthority||this.mode!=='live'||!this.excavationLive||this.store?.name!==LIVE_WORLD_DB)throw Error('人物と車両に対応した通常保存で確認してください。');
    if(!this.ready||this.blocked||this.busy||this.restoringTransport||this.restoringEarth||this.restoringMapReset||this.restoringVehicle)throw Error('保存を停止してから現場を確認してください。');
    if(this.ledger?.pending||this.ledger?.world.equipmentCraftPending)throw Error('購入・装備作成を先に確認してください。');
    if(this.ledger?.world.constructionTransport?.version!==2||this.ledger.world.constructionExcavation?.origin!==this.excavationOrigin)throw Error('対応する現場の記録がありません。');
    if(this.generation!==gen||this.raw?.current!==raw)throw Error('比較後に保存が変わりました。もう一度内容を確認してください。');
    if(typeof this.store.commitTransportRestore!=='function'||typeof this.store.readTransportRestoreState!=='function')throw Error('復元前控えを同時保存できない保存先です。');
  }
  async readConstructionTransportRestore({signal}={}){
    const gen=this.generation,raw=this.raw?.current;this.checkTransportRestore(gen,raw);const state=await this.store.readTransportRestoreState();this.checkTransportRestore(gen,raw);
    if(state.record?.generation!==gen||state.record?.current!==raw)throw Error('別の画面で保存が変わりました。比較を止めました。');
    if(signal?.aborted)throw Error('控えの確認を中止しました。');
    if(state.journal===null)return null;
    const point=await runTransportRecoveryTask('journal',{journal:state.journal},{signal});
    this.checkTransportRestore(gen,raw);
    return structuredClone(point);
  }
  async restoreConstructionTransport(candidate,before,gen,raw,{priorRestoreId=null}={}){
    this.checkTransportRestore(gen,raw);
    assertWorldTransportWorkReceipt(this.ledger.world.constructionTransport,before,this.ledger.world.constructionTransport.work.revision,this.constructionToolkit);
    // Receipt authority stays on this thread. Capture descriptor-checked plain
    // values before awaiting; the worker never receives mutable caller objects.
    const base=this.ledger,args={ledger:base,candidate:snapshotTransportRestoreRecord(candidate),before:snapshotTransportRestoreRecord(before),generation:gen,raw,id:crypto.randomUUID(),priorRestoreId};
    this.preparingTransportRestore=true;
    try{
      this.onChange(this);
      const {next,point}=this.#backgroundSave()?await runWorldSaveTask('restore-plan',args):prepareTransportRestorePlan(args);
      if(this.ledger!==base||this.generation!==gen||this.raw?.current!==raw)throw Error('現場を戻す準備中に保存が変わりました。上書きせず停止しました。');
      // No await between releasing the preparation lock and taking the atomic
      // restore queue lock. Ordinary saves cannot enter either interval.
      this.preparingTransportRestore=false;this.checkTransportRestore(gen,raw);this.restoringTransport=true;
      await this.enqueue(()=>next,{transportRestore:point});return this.constructionTransport;
    }finally{this.preparingTransportRestore=false;this.onChange(this);}
  }
  async undoConstructionTransportRestore(before,gen,raw,id){
    this.checkTransportRestore(gen,raw);const p=await this.readConstructionTransportRestore();this.checkTransportRestore(gen,raw);
    if(!p||p.kind!=='restore'||p.id!==id||!sameTransportRestoreValue(this.ledger.world.constructionTransport,p.applied)||!sameTransportRestoreValue(before,p.applied))throw Error('復元後に作業が変わったため、復元前へ戻せません。');
    return this.restoreConstructionTransport(p.beforeUnsaved,before,gen,raw,{priorRestoreId:p.id});
  }
  checkEarthRestore(expectedGeneration,expectedRaw){
    if(this.ledger?.world.constructionTransport)throw Error('共有土の作業では地形だけを復元できません。荷台・手元・移送中の土も一緒に確認してください。');
    if(this.restoringVehicle)throw Error('車両の復元結果を確認してください。');
    if(this.mode!=='live'||!this.excavationLive||this.store?.name!==LIVE_WORLD_DB)throw Error('通常保存の地形だけを復元できます。');
    if(!this.ready||this.blocked||this.busy||this.restoringEarth||this.restoringMapReset)throw Error('保存や作業を停止してから地形を復元してください。');
    if(this.ledger?.pending||this.ledger?.world.equipmentCraftPending)throw Error('保留中の購入・装備作成を先に確認してください。');
    if(!this.ledger?.world.constructionExcavation)throw Error('取得済みの通常地形がありません。');
    if(this.ledger.world.constructionExcavation.origin!==this.excavationOrigin)throw Error('通常地形の保存元が一致しません。');
    if(this.generation!==expectedGeneration||this.raw?.current!==expectedRaw)throw Error('復元確認後に保存が変わりました。もう一度内容を確認してください。');
    if(typeof this.store.commitEarthRestore!=='function'||typeof this.store.readEarthRestoreState!=='function')throw Error('復元前控えを同時保存できない保存先です。');
  }
  async readConstructionExcavationRestore(){
    this.checkEarthRestore(this.generation,this.raw?.current);
    const state=await this.store.readEarthRestoreState();
    this.checkEarthRestore(this.generation,this.raw?.current);
    if(state.record?.generation!==this.generation||state.record?.current!==this.raw?.current)throw Error('別の画面で保存が変わりました。再読込みして確認してください。');
    if(state.journal===null)return null;
    const journal=validateEarthRestoreJournal(state.journal);
    if(journal.beforeSaved.origin!==this.excavationOrigin||canonical(journal.beforeSaved.source)!==canonical(this.ledger.world.constructionExcavation.source))throw Error('別の地形の復元前控えは使えません。');
    return structuredClone(journal);
  }
  async commitConstructionEarthRestore(candidate,beforeRecord,expectedGeneration,expectedRaw,{priorRestoreId=null}={}){
    this.checkEarthRestore(expectedGeneration,expectedRaw);
    validateEarthRestoreBefore(this.ledger.world.constructionExcavation,beforeRecord);
    const next=createEarthRestoreLedger(this.ledger,candidate),appliedRaw=L.packWorldPurchaseLedger(next);
    const journal={version:1,scope:'imasora-earth-restore-point-v1',id:globalThis.crypto.randomUUID(),kind:priorRestoreId===null?'restore':'undo',priorRestoreId,
      expectedGeneration,expectedRaw,appliedGeneration:expectedGeneration+1,appliedRaw,
      beforeSaved:structuredClone(this.ledger.world.constructionExcavation),beforeUnsaved:structuredClone(beforeRecord),applied:structuredClone(next.world.constructionExcavation)};
    validateEarthRestoreJournal(journal);this.checkEarthRestore(expectedGeneration,expectedRaw);
    this.restoringEarth=true;
    await this.enqueue(()=>next,{earthRestore:journal});
    return structuredClone(this.ledger.world.constructionExcavation);
  }
  async restoreConstructionExcavation(candidate,beforeRecord,expectedGeneration,expectedRaw){
    return this.commitConstructionEarthRestore(candidate,beforeRecord,expectedGeneration,expectedRaw);
  }
  async undoConstructionExcavationRestore(beforeRecord,expectedGeneration,expectedRaw,expectedRestoreId){
    this.checkEarthRestore(expectedGeneration,expectedRaw);
    const before=structuredClone(beforeRecord),journal=await this.readConstructionExcavationRestore();
    this.checkEarthRestore(expectedGeneration,expectedRaw);
    if(!journal||journal.kind!=='restore'||journal.id!==expectedRestoreId)throw Error('戻せる復元前控えがありません。');
    if(canonical(this.ledger.world.constructionExcavation)!==canonical(journal.applied))throw Error('復元後に地形が変更されているため戻せません。現在の作業を保存してください。');
    return this.commitConstructionEarthRestore(journal.beforeUnsaved,before,expectedGeneration,expectedRaw,{priorRestoreId:journal.id});
  }
  checkMapReset(map,expectedGeneration,expectedRaw){
    if(this.restoringVehicle)throw Error('車両の復元結果を確認してください。');
    mapResetKey(map);
    if(this.mode!=='live'||this.store?.name!==LIVE_WORLD_DB)throw Error('通常保存のマップだけで建造物を片付けられます。');
    if(!this.ready||this.blocked||this.busy||this.restoringEarth||this.restoringMapReset)throw Error('保存や作業を停止してから建造物を片付けてください。');
    if(this.ledger?.pending||this.ledger?.world.equipmentCraftPending)throw Error('保留中の購入・装備作成を先に確認してください。');
    if(this.generation!==expectedGeneration||this.raw?.current!==expectedRaw)throw Error('確認後に保存が変わりました。もう一度内容を確認してください。');
    if(typeof this.store.commitMapReset!=='function'||typeof this.store.readMapResetState!=='function')throw Error('直前控えを同時保存できない保存先です。');
  }
  async readMapReset(map){
    const generation=this.generation,raw=this.raw?.current;this.checkMapReset(map,generation,raw);
    const state=await this.store.readMapResetState(map);this.checkMapReset(map,generation,raw);
    if(state.record?.generation!==generation||state.record?.current!==raw)throw Error('別の画面で保存が変わりました。再読込みして確認してください。');
    if(state.journal===null){this.mapResetPoints[map]=null;return null;}
    const journal=validateMapResetJournal(state.journal);
    if(journal.map!==map||canonical(L.unpackWorldPurchaseLedger(journal.appliedRaw).source)!==canonical(this.ledger.source))throw Error('別マップ・別の保存元の直前控えは使えません。');
    this.mapResetPoints[map]=structuredClone(journal);return structuredClone(journal);
  }
  async commitMapBuildings(map,beforeBuilt,candidate,expectedGeneration,expectedRaw,{priorResetId=null,targetId=null,operation=null}={}){
    this.checkMapReset(map,expectedGeneration,expectedRaw);
    const before=structuredClone(validateMapResetBefore(map,mapBuildings(this.ledger.world,map),beforeBuilt));
    const next=createMapResetLedger(this.ledger,map,candidate),appliedRaw=L.packWorldPurchaseLedger(next);
    const moving=operation==='move'||operation==='move-undo',single=targetId!==null,version=moving?3:single?2:1;
    const journal={version,scope:version===3?'imasora-map-building-move-v3':version===2?'imasora-map-reset-point-v2':'imasora-map-reset-point-v1',id:globalThis.crypto.randomUUID(),kind:priorResetId===null?(operation??(single?'remove':'reset')):operation==='move-undo'?'move-undo':'undo',map,priorResetId,...(single?{targetId}:{}),
      expectedGeneration,expectedRaw,appliedGeneration:expectedGeneration+1,appliedRaw,
      beforeSaved:structuredClone(mapBuildings(this.ledger.world,map)),beforeUnsaved:before,applied:structuredClone(mapBuildings(next.world,map))};
    validateMapResetJournal(journal);this.checkMapReset(map,expectedGeneration,expectedRaw);this.restoringMapReset=true;
    await this.enqueue(()=>next,{mapReset:journal});return structuredClone(mapBuildings(this.ledger.world,map));
  }
  async resetMapBuildings(map,beforeBuilt,expectedGeneration,expectedRaw){
    this.checkMapReset(map,expectedGeneration,expectedRaw);
    return this.commitMapBuildings(map,beforeBuilt,keptMapBuildings(map,beforeBuilt),expectedGeneration,expectedRaw);
  }
  async removeMapBuilding(map,targetId,beforeBuilt,expectedGeneration,expectedRaw){
    this.checkMapReset(map,expectedGeneration,expectedRaw);
    return this.commitMapBuildings(map,beforeBuilt,removeOneMapBuilding(map,beforeBuilt,targetId),expectedGeneration,expectedRaw,{targetId});
  }
  async moveMapBuilding(map,targetId,position,beforeBuilt,expectedGeneration,expectedRaw){
    this.checkMapReset(map,expectedGeneration,expectedRaw);
    return this.commitMapBuildings(map,beforeBuilt,moveOneMapBuilding(map,beforeBuilt,targetId,position),expectedGeneration,expectedRaw,{targetId,operation:'move'});
  }
  async undoMapReset(map,beforeBuilt,expectedGeneration,expectedRaw,expectedResetId){
    this.checkMapReset(map,expectedGeneration,expectedRaw);
    validateMapResetBefore(map,mapBuildings(this.ledger.world,map),beforeBuilt);const before=structuredClone(beforeBuilt),journal=await this.readMapReset(map);
    this.checkMapReset(map,expectedGeneration,expectedRaw);
    if(!journal||!['reset','remove','move'].includes(journal.kind)||journal.id!==expectedResetId)throw Error('戻せる建物操作の控えがありません。');
    if(canonical(mapBuildings(this.ledger.world,map))!==canonical(journal.applied)||canonical(before)!==canonical(journal.applied))throw Error('片付け後に建造物が変更されています。現在の作業を保護して停止しました。');
    const operation=journal.kind==='move'?'move-undo':null;
    return this.commitMapBuildings(map,before,journal.beforeUnsaved,expectedGeneration,expectedRaw,{priorResetId:journal.id,targetId:journal.version>=2?journal.targetId:null,operation});
  }
  checkVehicleRestore(kind,expectedGeneration,expectedRaw){
    const spec=vehicleRestoreSpec(kind);
    if(this.mode!=='live'||this.store?.name!==LIVE_WORLD_DB)throw Error('通常保存の車両作業だけを復元できます。');
    if(!this.ready||this.blocked||this.busy||this.restoringEarth||this.restoringMapReset||this.restoringVehicle)throw Error('保存結果を確認してから車両を復元してください。');
    if(this.ledger?.pending||this.ledger?.world.equipmentCraftPending)throw Error('購入・装備作成を先に確認してください。');
    if(!this.ledger?.world[spec.key])throw Error('保存済みの車両作業がありません。');
    if(this.generation!==expectedGeneration||this.raw?.current!==expectedRaw)throw Error('復元確認後に保存が変わりました。もう一度確認してください。');
    if(typeof this.store.commitVehicleRestore!=='function'||typeof this.store.readVehicleRestoreState!=='function')throw Error('直前控えを同時保存できない保存先です。');
    return spec;
  }
  async readConstructionVehicleRestore(kind){
    const gen=this.generation,raw=this.raw?.current;this.checkVehicleRestore(kind,gen,raw);
    const state=await this.store.readVehicleRestoreState(kind);this.checkVehicleRestore(kind,gen,raw);
    if(state.record?.generation!==gen||state.record?.current!==raw)throw Error('別の画面で保存が更新されました。再読込みして確認してください。');
    if(state.journal===null)return null;
    const point=validateVehicleRestoreJournal(state.journal);
    if(point.vehicleKind!==kind||canonical(L.unpackWorldPurchaseLedger(point.appliedRaw).source)!==canonical(this.ledger.source))throw Error('別の車両・保存元の控えは使えません。');
    return structuredClone(point);
  }
  async commitConstructionVehicleRestore(kind,candidate,beforeRecord,gen,raw,{priorRestoreId=null}={}){
    const spec=this.checkVehicleRestore(kind,gen,raw),before=structuredClone(validateVehicleRestoreBefore(this.ledger,kind,beforeRecord));
    const frozen=structuredClone(candidate),next=createVehicleRestoreLedger(this.ledger,kind,frozen,before),appliedRaw=L.packWorldPurchaseLedger(next);
    const point={version:1,scope:'imasora-vehicle-restore-point-v1',id:globalThis.crypto.randomUUID(),kind:priorRestoreId===null?'restore':'undo',vehicleKind:kind,priorRestoreId,
      expectedGeneration:gen,expectedRaw:raw,appliedGeneration:gen+1,appliedRaw,beforeSaved:structuredClone(this.ledger.world[spec.key]),beforeUnsaved:before,candidate:frozen,applied:structuredClone(next.world[spec.key])};
    validateVehicleRestoreJournal(point);this.checkVehicleRestore(kind,gen,raw);this.restoringVehicle=true;
    await this.enqueue(()=>next,{vehicleRestore:point});return structuredClone(this.ledger.world[spec.key]);
  }
  async restoreConstructionVehicle(kind,candidate,beforeRecord,gen,raw){return this.commitConstructionVehicleRestore(kind,candidate,beforeRecord,gen,raw);}
  async undoConstructionVehicleRestore(kind,beforeRecord,gen,raw,restoreId){
    const spec=this.checkVehicleRestore(kind,gen,raw),before=structuredClone(beforeRecord),point=await this.readConstructionVehicleRestore(kind);this.checkVehicleRestore(kind,gen,raw);
    if(!point||point.kind!=='restore'||point.id!==restoreId)throw Error('戻せる車両の直前控えがありません。');
    if(!vehicleRestoreUndoMatches(kind,this.ledger.world[spec.key],point.applied)||!vehicleRestoreUndoMatches(kind,before,point.applied))throw Error('復元後に作業が変わったため戻せません。');
    return this.commitConstructionVehicleRestore(kind,vehicleRestoreUndoCandidate(point),before,gen,raw,{priorRestoreId:point.id});
  }
  async saveConstructionWater(work,draft,expectedRevision){
    if(this.mode==='readonly')throw Error('貸出・表示確認の水を本体へ保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから作業を保存してください。');
    const next=structuredClone(work),snapshot=structuredClone(draft);
    if(snapshot.map!=='construction')throw Error('工事現場の作業として保存してください。');
    L.saveConstructionWaterDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueueDraft(draft,(s,current)=>L.saveConstructionWaterDraft(s,next,current,expectedRevision));
    return structuredClone(this.ledger.world.constructionWater);
  }
  async saveConstructionSoil(work,draft,expectedRevision){
    if(this.mode==='readonly')throw Error('貸出・表示確認の土を本体へ保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから土作業を保存してください。');
    const next=structuredClone(work),snapshot=structuredClone(draft);
    if(snapshot.map!=='construction')throw Error('工事現場の作業として保存してください。');
    L.saveConstructionSoilDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueueDraft(draft,(s,current)=>L.saveConstructionSoilDraft(s,next,current,expectedRevision));
    return structuredClone(this.ledger.world.constructionSoil);
  }
  async saveConstructionTimber(work,draft,expectedRevision){
    if(this.mode==='readonly')throw Error('貸出・表示確認の木材を本体へ保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存処理を確認してから木材作業を保存してください。');
    const next=structuredClone(work),snapshot=structuredClone(draft);
    if(snapshot.map!=='construction')throw Error('工事現場の作業として保存してください。');
    L.saveConstructionTimberDraft(this.ledger,next,snapshot,expectedRevision);
    await this.enqueueDraft(draft,(s,current)=>L.saveConstructionTimberDraft(s,next,current,expectedRevision));
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
    await this.enqueueDraft(draft,(s,current)=>L.saveLinkedWorldDraft(L.receiveConstructionMaterial(s,offer,quantity,id,place),current));
    return this.constructionStock;
  }
  async receiveConstructionPackTrial(packet,context){
    if(!this.canReceiveConstructionPackTrial())throw Error('通常の工事現場保存でだけ試作ポイントを受け取れます。');
    if(!this.ready||this.blocked)throw Error('保存を確認するまで受取できません。');
    const payload=structuredClone(packet),place=structuredClone(context);
    // Reject invalid files and wrong-place attempts before they can enter the
    // shared persistence queue and block unrelated world saves.
    const checked=L.receiveConstructionPackTrial(this.ledger,payload,place);
    if(checked===this.ledger)return this.constructionPackTrialStock;
    return this.enqueue(s=>L.receiveConstructionPackTrial(s,payload,place));
  }
  async saveConstructionConcreteProject(action,expectedRevision,draft,toolReceipt=null,workPlatform=undefined){
    if(!this.canWriteConstructionProfileProject())throw Error('通常プロフィールまたは隔離施工プロフィールでだけ施工状態を保存できます。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存や作業を確認してから施工状態を更新してください。');
    const payload=structuredClone(action),snapshot=structuredClone(draft),platform=workPlatform===undefined?undefined:structuredClone(workPlatform);
    if(snapshot?.map!=='construction')throw Error('工事現場でだけ施工状態を保存できます。');
    // Borrowed preview tools stay in their explicit preview. Normal play needs
    // received tools before animation receipts can authorize a hand operation.
    if(!this.constructionProjectPreview&&requiredStarterTool(payload))assertStarterTool(this.constructionToolkit,payload);
    if(['PLACE_FORMWORK','LOAD_BUCKET','POUR','FINISH_SURFACE'].includes(payload.type))assertConstructionToolReceipt(payload.type,toolReceipt);
    else if(payload.type===SUPPORTED_WORK_MOVE)assertSupportedWorkMoveReceipt(this.constructionConcreteProject,payload,expectedRevision,toolReceipt);
    else if(FOUNDATION_ACTIONS.has(payload.type))assertFoundationReceipt(this.constructionConcreteProject,payload,expectedRevision,toolReceipt,true);
    else if(FREE_CONTACT_ACTIONS.has(payload.type))assertFreeReceipt(payload,this.constructionConcreteProject,expectedRevision,toolReceipt);
    else if(FREE_VEHICLE_ACTIONS.has(payload.type))assertVehicleReceipt(payload,this.constructionConcreteProject,expectedRevision,toolReceipt);
    else if(PIPE_ACTIONS.has(payload.type))assertPipeReceipt(payload,this.constructionConcreteProject,expectedRevision,toolReceipt);
    else if(toolReceipt!==null)throw Error('施工操作に不要な道具接触記録を受け取りました。');
    L.applyConstructionProfileProject(this.ledger,payload,expectedRevision,snapshot,platform);
    await this.enqueueDraft(draft,(s,current)=>L.applyConstructionProfileProject(s,payload,expectedRevision,current,platform));
    return this.constructionConcreteProject;
  }
  async saveConstructionWorkPlatform(record,expectedRevision,draft){
    if(!this.canWriteConstructionProfileProject())throw Error('この画面では作業台を保存できません。');
    if(!this.ready||this.blocked||this.busy)throw Error('保存を確認してから作業台を更新してください。');
    if(draft?.map!=='construction')throw Error('工事現場でだけ作業台を保存できます。');
    const platform=structuredClone(record),snapshot=structuredClone(draft);
    L.saveConstructionWorkPlatform(this.ledger,platform,snapshot,expectedRevision);
    await this.enqueueDraft(draft,(s,current)=>L.saveConstructionWorkPlatform(s,platform,current,expectedRevision));
    return this.constructionWorkPlatform;
  }
  settle(id,{cancel=false}={}){return this.enqueue(s=>L.settleLinkedOrder(s,id,{cancel}));}
  export(){return L.packWorldPurchaseLedger(this.ledger);}
  exportRecovery(){return JSON.stringify({scope:'world-save-recovery-readonly',committed:this.raw,pending:this.jobs.map(j=>({expected:j.expected,packet:j.packet})),legacy:this.mode==='live'?this.readLegacy():null,mapResetPoints:structuredClone(this.mapResetPoints)},null,2);}
}
