import {canonical} from './imasora-construction-state.js';
import {createAuthorityExcavation,checkpointAuthorityExcavation,authorityExcavationWork,authorityExcavationSummary,validateAuthorityExcavation} from './imasora-construction-earth-authority.js?v=496';
import {createExcavationAuthorityView} from './imasora-construction-earth-view.js?v=501';
import {inspectEarthRestore,restoreAuthorityEarth} from './imasora-construction-earth-restore.js?v=497';
import {inspectEarthBundleRestore,MAX_EARTH_BUNDLE_RESTORE_INPUT} from './imasora-construction-earth-bundle-restore.js?v=501';

export const excavationAuthorityPreview=(search,host)=>['127.0.0.1','localhost'].includes(host)&&new URLSearchParams(search).get('constructionExcavationAuthorityPreview')==='1';
// Adapter for the controller: every checkpoint commits through WorldSaveService,
// in its assigned live or validation DB. It never reads the v484 fixture database.
export class ExcavationAuthoritySession{
  constructor({service,origin,snapshot,onChange=()=>{}}){
    Object.assign(this,{service,origin,snapshot,onChange});this.record=null;this.baseline=null;this.pending=null;this.localBusy=false;this.invalid=false;
    this.live=!!service.excavationLive;this.label=this.live?'ショベルカー':'ショベルカー v497';this.caption=this.live?'地形と作業を保存':'世界と掘削の同時保存確認';this.saveOnLeave=true;this.createView=createExcavationAuthorityView;
    this.restorePlan=null;this.restoreInspectionEpoch=0;this.onRestored=()=>{};
    this.message=this.live?'初めて工事現場へ入ると、空いている1区画の土を確保します。削った土は元に戻りません。':'通常セーブと分けた試験世界です。土1792個・試験用金貨12枚から確認します。';
  }
  initialize(){
    const record=this.service.world?.constructionExcavation;
    if(record){validateAuthorityExcavation(record);if(record.origin!==this.origin)throw Error('掘削の保存元URLが一致しません。');this.record=structuredClone(record);this.baseline=this.signature(this.initial);this.message=`世界の保存 ${this.raw.generation} から掘削作業を一時停止で読み込みました。`;}
    return this.initial;
  }
  get busy(){return this.localBusy||this.service.busy;}
  get blocked(){return this.invalid||this.service.blocked||(!this.localBusy&&!!this.pending);}
  get raw(){return this.service.raw;}
  get initial(){return this.record?authorityExcavationWork(this.record):null;}
  get summary(){return this.record?authorityExcavationSummary(this.record):null;}
  signature(snapshot){return canonical({...checkpointAuthorityExcavation(this.record,snapshot),revision:0});}
  dirty(snapshot){return !!this.pending||!this.record||this.signature(snapshot)!==this.baseline;}
  seed(site){
    if(this.record){if(this.record.site!==site)throw Error('保存済みの掘削区画を別の場所へ移せません。');return;}
    if(this.pending||this.invalid)return;
    const id=crypto.randomUUID(),expected=createAuthorityExcavation(site,this.origin,id,{live:this.live});
    this.pending={kind:'allocate',site,id,expected,draft:null};
    void this.retry();
  }
  async save(snapshot){
    if(this.invalid){this.message='保存と画面の状態を確認するため、この画面を再読み込みしてください。';this.onChange();return false;}
    if(this.localBusy)return false;
    if(this.pending)return this.retry();
    if(!this.record){this.message='掘削区画の保存を先に確認してください。';this.onChange();return false;}
    try{
      const next=checkpointAuthorityExcavation(this.record,snapshot);
      this.pending={kind:'save',expected:next,expectedRevision:this.record.revision,draft:null,signature:this.signature(snapshot)};
      return await this.retry();
    }catch(e){this.message=e.message;this.onChange();return false;}
  }
  async retry(){
    if(this.localBusy)return false;if(!this.pending){if(this.service.blocked)await this.service.retry();return true;}
    if(this.restorePending)return this.retryRestore();
    this.localBusy=true;this.message='地形・姿勢・世界の記録を一緒に保存しています…';this.onChange();
    try{
      const p=this.pending;if(this.service.blocked)await this.service.retry();
      if(this.service.busy)await this.service.flush();
      if(!p.draft)p.draft=this.service.deriveDraft(this.snapshot(),{});
      let saved=this.service.world?.constructionExcavation;
      if(canonical(saved??null)!==canonical(p.expected)){
        saved=p.kind==='allocate'?await this.service.allocateConstructionExcavation(p.site,this.origin,p.id,p.draft):await this.service.saveConstructionExcavation(p.expected,p.draft,p.expectedRevision);
      }
      if(canonical(saved)!==canonical(p.expected))throw Error('掘削作業の保存結果が一致しません。');
      this.record=structuredClone(saved);this.baseline=p.signature??this.signature(this.initial);this.pending=null;
      this.message=`世界と掘削を保存 ${this.raw.generation} に同時保存しました。一時停止した続きから再開できます。`;return true;
    }catch(e){this.message=e.message;this.service.onError(e);return false;}
    finally{this.localBusy=false;this.onChange();}
  }
  export(snapshot){
    return JSON.stringify({kind:this.live?'imasora-excavation-live-recovery-v1':'imasora-excavation-authority-check-recovery-v1',origin:this.origin,world:JSON.parse(this.service.exportRecovery()),uncommitted:this.record?checkpointAuthorityExcavation(this.record,snapshot):null,pending:structuredClone(this.pending)},null,2);
  }
  get restorePending(){return ['restore','undo'].includes(this.pending?.kind);}
  clearRestore(){this.restorePlan=null;this.restoreInspectionEpoch++;}
  checkRestoreReady(){
    if(!this.live||!this.record)throw Error('通常の工事現場で取得済みの地形だけ復元できます。');
    if(this.busy||this.blocked||this.pending)throw Error('先に保存の結果を確認してください。');
    if(this.service.ledger.pending||this.service.ledger.world.equipmentCraftPending)throw Error('購入・装備作成を完了してから復元してください。');
  }
  prepareRestore(candidate,snapshot,{kind='restore',restoreId=null,sourceKind='earth-record'}={}){
    this.checkRestoreReady();
    const before=checkpointAuthorityExcavation(this.record,snapshot);
    const expected=restoreAuthorityEarth(this.record,candidate);
    this.restoreInspectionEpoch++;
    this.restorePlan={kind,restoreId,sourceKind,candidate:structuredClone(candidate),expected,before,
      signature:this.signature(snapshot),generation:this.raw.generation,raw:this.raw.current};
    return {current:authorityExcavationSummary(before),next:authorityExcavationSummary(expected),sourceKind};
  }
  inspectRestore(text,snapshot){
    this.clearRestore();this.checkRestoreReady();
    const parsed=inspectEarthRestore(text,{current:this.record,origin:this.origin});
    const result=this.prepareRestore(parsed.record,snapshot,{sourceKind:parsed.sourceKind});
    this.message='内容を確認しました。復元すると、現在の未保存作業を控えに残して地形とショベルの状態を入れ替えます。';
    return result;
  }
  async inspectRestoreInput(text,snapshot,{isCurrent=()=>true}={}){
    this.clearRestore();this.checkRestoreReady();
    const epoch=this.restoreInspectionEpoch,generation=this.raw.generation,raw=this.raw.current,record=canonical(this.record),signature=this.signature(snapshot);
    if(typeof text!=='string'||text.length>MAX_EARTH_BUNDLE_RESTORE_INPUT||new TextEncoder().encode(text).byteLength>MAX_EARTH_BUNDLE_RESTORE_INPUT)throw Error('控えは64 MiB以下の文字列を選んでください。');
    let envelope;try{envelope=JSON.parse(text);}catch{throw Error('控えのJSONを読み取れません。ファイルや文字列を確認してください。');}
    const bundle=['imasora-world-recovery-bundle-v1','imasora-world-recovery-bundle-v2'].includes(envelope?.kind);
    const parsed=bundle?await inspectEarthBundleRestore(text,{current:structuredClone(this.record),origin:this.origin}):inspectEarthRestore(text,{current:this.record,origin:this.origin});
    // A canceled SHA/read must never publish a plan, nor erase a later plan.
    if(this.restoreInspectionEpoch!==epoch||!isCurrent())throw Error('控えの確認を取り消しました。もう一度内容を確認してください。');
    this.checkRestoreReady();
    if(this.raw.generation!==generation||this.raw.current!==raw||canonical(this.record)!==record||this.signature(snapshot)!==signature)throw Error('控えの確認中に保存か作業が変わりました。もう一度確認してください。');
    const result=this.prepareRestore(parsed.record,snapshot,{sourceKind:parsed.sourceKind});
    if(parsed.source){result.source=structuredClone(parsed.source);this.restorePlan.source=structuredClone(parsed.source);}
    this.message=bundle?'一括控えから地形とショベルの作業を確認しました。確定するまで現在の作業は変わりません。':'内容を確認しました。確定するまで現在の作業は変わりません。';
    return result;
  }
  history(){
    this.checkRestoreReady();const rows=[];
    for(const [index,packet] of this.raw.backups.entries()){
      try{const value=inspectEarthRestore(packet,{current:this.record,origin:this.origin});rows.push({label:`${index+1}つ前の保存｜地形 ${value.record.counts.terrain}・積載 ${value.record.counts.bucket}・盛土 ${value.record.counts.ground}`,packet});}catch{}
    }
    return rows;
  }
  async inspectUndo(snapshot){
    this.clearRestore();this.checkRestoreReady();
    if(this.dirty(snapshot))throw Error('復元後の作業が進んでいます。現在の作業を保護するため、この控えへは直接戻せません。');
    const epoch=this.restoreInspectionEpoch,generation=this.raw.generation,raw=this.raw.current,record=canonical(this.record),signature=this.signature(snapshot);
    const point=await this.service.readConstructionExcavationRestore();
    if(this.restoreInspectionEpoch!==epoch)throw Error('控えの確認を取り消しました。もう一度内容を確認してください。');
    this.checkRestoreReady();
    if(this.raw.generation!==generation||this.raw.current!==raw||canonical(this.record)!==record||this.signature(snapshot)!==signature)throw Error('控えの確認中に作業が変わりました。もう一度確認してください。');
    if(!point||point.kind!=='restore')throw Error('戻せる復元前の控えがありません。');
    if(canonical(point.applied)!==canonical(this.record))throw Error('復元後の地形が変わっています。現在の作業を保護するため停止しました。');
    const result=this.prepareRestore(point.beforeUnsaved,snapshot,{kind:'undo',restoreId:point.id,sourceKind:'before-restore'});
    this.message='復元直前の作業を確認しました。確認後のボタンで戻します。';return result;
  }
  async restorePrepared(snapshot){
    if(this.restorePending){return await this.retryRestore()?this.initial:null;}
    this.checkRestoreReady();const plan=this.restorePlan;
    if(!plan)throw Error('先に復元内容を確認してください。');
    if(this.raw.generation!==plan.generation||this.raw.current!==plan.raw||this.signature(snapshot)!==plan.signature){this.clearRestore();throw Error('内容確認後に保存か作業が変わりました。もう一度確認してください。');}
    this.pending=structuredClone(plan);this.clearRestore();
    return await this.retryRestore()?this.initial:null;
  }
  async retryRestore(){
    if(this.localBusy||!this.restorePending)return false;
    this.localBusy=true;this.message='現在の作業の控えと復元する地形を一緒に保存しています…';this.onChange();
    try{
      const plan=this.pending;
      if(this.service.blocked)await this.service.retry();
      let saved=this.service.world?.constructionExcavation;
      if(canonical(saved)!==canonical(plan.expected)){
        saved=plan.kind==='undo'
          ?await this.service.undoConstructionExcavationRestore(plan.before,plan.generation,plan.raw,plan.restoreId)
          :await this.service.restoreConstructionExcavation(plan.candidate,plan.before,plan.generation,plan.raw);
      }
      if(canonical(saved)!==canonical(plan.expected))throw Error('復元結果が一致しません。現在の作業を保持して停止しました。');
      this.record=structuredClone(saved);this.baseline=this.signature(this.initial);this.pending=null;
      try{this.onRestored(this.initial);}
      catch(e){this.invalid=true;throw Error(`地形の復元は保存済みですが、画面への反映に失敗しました。作業を止めて再読み込みしてください。${e.message}`);}
      this.message=plan.kind==='undo'?'復元直前の作業へ戻しました。一時停止から再開できます。':'地形とショベルの状態を復元しました。一時停止中です。作業を進める前なら、再読込後も復元前の控えへ戻せます。';
      return true;
    }catch(e){this.message=e.message;return false;}
    finally{this.localBusy=false;this.onChange();}
  }
}
