import {canonical} from './imasora-construction-state.js';
import {vehicleRestoreCheckpoint,vehicleRestoreSummary,validateVehicleRestoreBefore,createVehicleRestoreLedger,inspectVehicleRestoreBundle,inspectVehicleRestoreHistory,vehicleRestoreUndoMatches,vehicleRestoreUndoCandidate} from './imasora-construction-vehicle-restore.js?v=502';

const fields={water:'constructionWater',soil:'constructionSoil',timber:'constructionTimber'};
const clone=structuredClone;
export const MAX_VEHICLE_RESTORE_INPUT=64*1024*1024;

// The controller owns the running solver; this adapter owns only an explicit
// restore transaction. It never submits a normal save or a whole-world import.
export class VehicleRestoreSession{
  constructor({service,kind,origin,getWork,getExpectedRevision,available=()=>'',onRestored=()=>{},onChange=()=>{}}){
    if(!fields[kind])throw Error('復元する車両が不正です。');
    Object.assign(this,{service,kind,origin,getWork,getExpectedRevision,available,onRestored,onChange});
    this.plan=null;this.pending=null;this.epoch=0;this.localBusy=false;this.invalid=false;this.message='';
  }
  get enabled(){return this.service.mode==='live'&&this.service.store?.name==='imasora-world-authority-v1';}
  get saved(){return this.service.world?.[fields[this.kind]]??null;}
  get busy(){return this.localBusy||this.service.busy;}
  get restorePending(){return !!this.pending;}
  get locked(){return this.localBusy||this.restorePending||this.invalid;}
  get blocked(){return this.invalid||this.service.blocked||this.restorePending;}
  clearRestore(){this.plan=null;this.epoch++;}
  signature(){return canonical(vehicleRestoreCheckpoint(this.kind,this.getWork()));}
  reason(){
    if(!this.enabled)return '通常の工事現場だけで復元できます。';
    if(this.invalid)return '復元は保存済みですが画面への反映に失敗しました。再読み込みしてから続けてください。';
    if(this.busy||this.blocked)return '保存の結果を確認してから復元してください。';
    if(!this.saved)return '先に現在の作業を保存してください。';
    const reason=this.available();if(reason)return reason;
    if(this.getExpectedRevision()!==this.saved.revision)return '保存と現在の作業が一致しません。再読み込みして確認してください。';
    return '';
  }
  ready(){const reason=this.reason();if(reason)throw Error(reason);validateVehicleRestoreBefore(this.service.ledger,this.kind,this.getWork());}
  capture(){this.ready();return {epoch:this.epoch,generation:this.service.generation,raw:this.service.raw.current,signature:this.signature()};}
  current(capture,isCurrent=()=>true){
    if(capture.epoch!==this.epoch||!isCurrent())throw Error('内容の確認を取り消しました。もう一度確認してください。');
    this.ready();
    if(capture.generation!==this.service.generation||capture.raw!==this.service.raw.current||capture.signature!==this.signature())throw Error('確認中に保存か作業が変わりました。もう一度内容を確認してください。');
  }
  prepare(parsed,{operation='restore',restoreId=null}={}){
    const before=vehicleRestoreCheckpoint(this.kind,this.getWork());
    const expected=createVehicleRestoreLedger(this.service.ledger,this.kind,parsed.candidate,before).world[fields[this.kind]];
    const comparison={current:vehicleRestoreSummary(this.kind,before,this.service.ledger),next:vehicleRestoreSummary(this.kind,expected,this.service.ledger),source:clone(parsed.source??null),operation};
    this.plan={operation,restoreId,candidate:clone(parsed.candidate),before,expected:clone(expected),signature:this.signature(),generation:this.service.generation,raw:this.service.raw.current,comparison};
    this.message='内容を確認しました。確定するまで現在の作業は変わりません。';
    return clone(comparison);
  }
  async inspectInput(text,{isCurrent=()=>true}={}){
    this.clearRestore();const capture=this.capture();
    if(typeof text!=='string'||text.length>MAX_VEHICLE_RESTORE_INPUT||new TextEncoder().encode(text).byteLength>MAX_VEHICLE_RESTORE_INPUT)throw Error('64 MiB以下の一括控えを選んでください。');
    const parsed=await inspectVehicleRestoreBundle(text,{kind:this.kind,currentLedger:clone(this.service.ledger),beforeUnsaved:vehicleRestoreCheckpoint(this.kind,this.getWork()),origin:this.origin});
    this.current(capture,isCurrent);return this.prepare(parsed);
  }
  history(){
    this.ready();const rows=[];
    for(const [index,packet] of (this.service.raw.backups||[]).entries()){
      try{const parsed=inspectVehicleRestoreHistory(packet,{kind:this.kind,currentLedger:this.service.ledger,beforeUnsaved:this.getWork()}),s=parsed.summary;
        rows.push({packet,label:`${index+1}つ前の保存｜使用中 ${s.inUse}${s.unit}・保管 ${s.warehouse}${s.unit}`});
      }catch{}
    }
    return rows;
  }
  inspectHistory(packet){
    this.clearRestore();this.ready();
    if(typeof packet!=='string'||!this.service.raw.backups?.includes(packet))throw Error('現在の端末の保存履歴から選び直してください。');
    return this.prepare(inspectVehicleRestoreHistory(packet,{kind:this.kind,currentLedger:this.service.ledger,beforeUnsaved:this.getWork()}));
  }
  async inspectUndo({isCurrent=()=>true}={}){
    this.clearRestore();const capture=this.capture();
    if(!vehicleRestoreUndoMatches(this.kind,this.getWork(),this.saved))throw Error('復元後の作業が進んでいます。現在の作業を保護するため、直前の状態へは戻せません。');
    const point=await this.service.readConstructionVehicleRestore(this.kind);this.current(capture,isCurrent);
    if(!point||point.kind!=='restore'||!vehicleRestoreUndoMatches(this.kind,this.saved,point.applied))throw Error('取り消せる直前の復元がありません。');
    const parsed={candidate:vehicleRestoreUndoCandidate(point),source:{kind:'before-restore'}};
    return this.prepare(parsed,{operation:'undo',restoreId:point.id});
  }
  async apply(){
    if(this.restorePending)return this.retry();
    this.ready();const plan=this.plan;if(!plan)throw Error('先に戻す内容を確認してください。');
    if(plan.generation!==this.service.generation||plan.raw!==this.service.raw.current||plan.signature!==this.signature()){this.clearRestore();throw Error('確認後に保存か作業が変わりました。もう一度内容を確認してください。');}
    this.pending=clone(plan);this.clearRestore();return this.retry();
  }
  async retry(){
    if(this.localBusy||this.invalid||!this.pending)return false;
    this.localBusy=true;this.message='今の作業の控えと復元する内容を一緒に保存しています…';this.onChange();
    try{
      const plan=this.pending;let saved;
      if(this.service.blocked)await this.service.retry();
      if(this.service.busy)await this.service.flush();
      if(plan.submitted){
        const point=await this.service.readConstructionVehicleRestore(this.kind);
        if(point&&point.kind===plan.operation&&point.expectedGeneration===plan.generation&&point.expectedRaw===plan.raw&&canonical(point.applied)===canonical(plan.expected)&&canonical(this.saved)===canonical(plan.expected))saved=this.saved;
        else if(this.service.generation!==plan.generation||this.service.raw.current!==plan.raw)throw Error('復元結果を確認できません。現在の作業を保持して停止しています。');
      }
      if(!saved){
        plan.submitted=true;
        saved=plan.operation==='undo'
          ?await this.service.undoConstructionVehicleRestore(this.kind,plan.before,plan.generation,plan.raw,plan.restoreId)
          :await this.service.restoreConstructionVehicle(this.kind,plan.candidate,plan.before,plan.generation,plan.raw);
      }
      if(canonical(saved)!==canonical(plan.expected))throw Error('復元結果が一致しません。作業を保持して停止しています。');
      try{await this.onRestored(clone(saved));}
      catch(e){this.invalid=true;throw Error(`復元は保存済みですが、画面への反映に失敗しました。再読み込みしてください。${e.message||e}`);}
      this.pending=null;this.message=plan.operation==='undo'?'復元前の作業へ戻しました。一時停止中です。':'作業を復元しました。一時停止中です。作業を進める前なら直前の復元を取り消せます。';return true;
    }catch(e){
      this.message=e.message||'復元を確認できませんでした。';
      // A pre-transaction refusal has no uncertain write to retry. Transaction
      // failures stay locked until the exact journal/head can be proved.
      if(!this.invalid&&!this.service.blocked&&!this.service.busy&&!this.service.restoringVehicle&&this.pending?.generation===this.service.generation&&this.pending?.raw===this.service.raw.current)this.pending=null;
      return false;
    }finally{this.localBusy=false;this.onChange();}
  }
}
