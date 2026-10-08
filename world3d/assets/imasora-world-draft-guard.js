// Capture order belongs to the save session, not to a field supplied by a save
// file. Scene commits invalidate only unsubmitted drafts; already accepted
// queue entries retain their order through intervening wallet transactions.
export class WorldDraftGuardError extends Error{
  constructor(code,message){super(message);this.name='WorldDraftGuardError';this.code=code;}
}
const fail=(code,message)=>{throw new WorldDraftGuardError(code,message);};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
export class WorldDraftGuard{
  #drafts=new WeakMap();
  #tokens=new WeakMap();
  #pending=new Map();
  #sequence=0;
  #accepted=0;
  #epoch=0;
  #advance(){
    if(this.#epoch>=Number.MAX_SAFE_INTEGER)fail('limit','保存確認番号の上限です。画面を開き直してください。');
    return ++this.#epoch;
  }
  #entry(draft){
    const entry=object(draft)?this.#drafts.get(draft):null;
    if(!entry)fail('unissued','この画面で作成した保存内容ではありません。現在の状態から保存し直してください。');
    return entry;
  }
  #fresh(entry){
    if(entry.state!=='issued')fail('consumed','この保存内容はすでに受理されています。現在の状態から保存し直してください。');
    if(entry.sequence<=this.#accepted)fail('superseded','新しい保存内容を先に受理したため、古い状態で上書きしません。');
    if(entry.epoch!==this.#epoch)fail('stale','保存内容を作成した後に状態が保存されています。現在の状態から保存し直してください。');
  }
  issue(draft){
    if(!object(draft))fail('draft','保存内容は通常のオブジェクトで作成してください。');
    // Reissuing the same object must never make an obsolete draft fresh.
    if(this.#drafts.has(draft))return draft;
    if(this.#sequence>=Number.MAX_SAFE_INTEGER)fail('limit','保存作成番号の上限です。画面を開き直してください。');
    this.#drafts.set(draft,{sequence:++this.#sequence,epoch:this.#epoch,state:'issued',token:null,committedEpoch:null});
    return draft;
  }
  derive(draft,overrides={}){
    const entry=this.#entry(draft);this.#fresh(entry);
    if(!object(overrides))fail('draft','保存内容への追加項目が不正です。');
    const next={...structuredClone(draft),...structuredClone(overrides)};
    this.#fresh(entry);this.#drafts.set(next,entry);return next;
  }
  consume(draft,prepare){
    const entry=this.#entry(draft);this.#fresh(entry);
    // Complete cloning before mutating the queue guard. Recheck after getters
    // encountered by structuredClone, which can synchronously run caller code.
    const snapshot=structuredClone(draft);this.#fresh(entry);
    // Validate and prepare the captured snapshot before accepting it. Failed
    // preparation must leave this draft usable and not supersede older drafts.
    const prepared=prepare?.(snapshot);this.#fresh(entry);
    const token=Object.freeze({});entry.state='accepted';entry.token=token;
    this.#accepted=entry.sequence;this.#tokens.set(token,entry);this.#pending.set(token,entry);
    return prepare?{snapshot,token,prepared}:{snapshot,token};
  }
  committed(token){
    const entry=token&&typeof token==='object'?this.#tokens.get(token):null;
    if(!entry)fail('token','この保存処理の受理記録がありません。');
    // A lost IndexedDB acknowledgement can be confirmed on retry more than
    // once. Confirmation must not invalidate fresh drafts a second time.
    if(entry.state==='committed')return entry.committedEpoch;
    if(entry.state!=='accepted')fail('discarded','取り消した保存処理を完了扱いにできません。');
    if(this.#pending.keys().next().value!==token)fail('order','保存の受理順が一致しません。後の状態で先の処理を追い越しません。');
    const epoch=this.#advance();entry.state='committed';entry.committedEpoch=epoch;this.#pending.delete(token);return epoch;
  }
  discard(token){
    const entry=token&&typeof token==='object'?this.#tokens.get(token):null;
    if(!entry)fail('token','この保存処理の受理記録がありません。');
    if(entry.state==='discarded')return false;
    if(entry.state!=='accepted')fail('committed','完了済みの保存処理は取り消せません。');
    entry.state='discarded';this.#pending.delete(token);return true;
  }
  invalidate(){return this.#advance();}
}
