import{createHuntVideoPreview}from'./imasora-sliding-tag-hunt-video-preview.mjs';
import{MATCH_SECONDS}from'./imasora-sliding-tag-hunt-match.mjs';
// Result presentation is independent of the simulation and reward settlement.
const validTime=n=>Number.isFinite(n)&&n>=0&&n<=MATCH_SECONDS;
function formatBest(mode,best,temporary){return validTime(best)?(mode==='hunt'?'最速 ':'最高 ')+best.toFixed(1)+'秒'+(temporary?'（このタブのみ）':''):'';}
export function huntResultSummary({result,config,controlledOwner,best,bestTemporary=false,ticket}){
 if(!result||!validTime(result.time)||!['escape','hunt'].includes(config?.mode)||!Number.isSafeInteger(ticket)||ticket<1)return null;
 const hunt=config.mode==='hunt',title=hunt?(result.caught?(result.catcher===controlledOwner?'あなたがタッチ！':'仲間がタッチ！'):'時間切れ'):result.caught?'タッチされた！':'にげきった！';
 return Object.freeze({ticket,title,win:!!result.win,mode:config.mode,time:result.time.toFixed(1),label:hunt?(result.caught?'タッチまで':'経過時間'):'にげた時間',best:formatBest(config.mode,best,bestTemporary),recordNotice:'',verified:false});
}
export function createHuntResultState(){
 let current=null,roundTime,previousBest;
 return{
  show(data){
   const next=huntResultSummary(data??{});
   if(!next)return null;
   if(current?.ticket!==next.ticket){
    current=next;
    roundTime=data.result.time;
    previousBest=data.best;
   }
   return current;
  },
  clear(){current=null;roundTime=previousBest=undefined;},
  isCurrent(ticket){return!!current&&current.ticket===ticket;},
  verify(ticket,best,temporary=false){
   if(!current||current.ticket!==ticket||!validTime(best))return false;
   let recordNotice='';
   if(best===roundTime&&(current.mode==='escape'||current.win)){
    if(!validTime(previousBest))recordNotice='初記録！';
    else{
     const old=Number(previousBest.toFixed(1)),now=Number(current.time);
     const improvement=current.mode==='hunt'?old-now:now-old;
     if(improvement>0)recordNotice='自己ベスト更新！ '+improvement.toFixed(1)+'秒'+(current.mode==='hunt'?'短縮':'長く逃走');
    }
   }
   current=Object.freeze({...current,best:formatBest(current.mode,best,temporary),recordNotice,verified:true});
   return true;
  },
  get current(){return current;},
 };
}

export function createHuntResults({onRetry,onRetrySame,onConfigure,onShare,onSaveVideo,document:doc=globalThis.document}){
 const state=createHuntResultState(),style=doc.createElement('style');style.textContent=`
 .tag-rematch{position:fixed;left:12px;bottom:max(16px,env(safe-area-inset-bottom));width:min(360px,calc(100vw - 24px));z-index:8;border:3px solid #fff;border-radius:25px;background:linear-gradient(145deg,#fffdf3f7,#e3f5f4f5);box-shadow:0 5px 0 #73a7ae88,0 9px 28px #234e6740;padding:15px 16px;color:#31566a;overflow:auto;overscroll-behavior:contain;touch-action:pan-y;max-height:calc(100vh - max(16px,env(safe-area-inset-bottom)) - max(64px,env(safe-area-inset-top)));max-height:calc(100dvh - max(16px,env(safe-area-inset-bottom)) - max(64px,env(safe-area-inset-top)));isolation:isolate}
 .tag-rematch::before{content:'';position:absolute;inset:0 0 auto;height:6px;background:linear-gradient(90deg,#f3b3cd,#95d9d4,#f5d47f)}
 .tag-rematch[data-win=true]{box-shadow:0 5px 0 #d6b26b88,0 9px 28px #234e6740}
 .tag-rematch h2{font-size:25px;line-height:1.25;margin:2px 0 4px;font-weight:900;overflow-wrap:anywhere}.tr-metric{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}.tr-metric strong{font-size:38px;font-variant-numeric:tabular-nums;line-height:1.2}.tr-metric span{font-size:15px}.tr-metric small{font-size:12px;color:#557886}.tr-record{margin:7px 0 5px;padding:6px 10px;border-radius:10px;background:#ffe7a3;color:#664510;font-size:14px;font-weight:850}.tr-best{font-size:13px;font-weight:800;color:#876e3f;margin:5px 0}.tr-actions{display:grid;grid-template-columns:1.1fr 1fr;gap:8px;margin-top:10px}.tr-actions button{min-width:0;min-height:50px;padding:8px 6px;border-radius:17px;font-size:16px;line-height:1.3;box-shadow:0 3px 0 #729c9d55}.tr-actions [data-retry]{background:linear-gradient(#ffe5a7,#f8d382);font-size:16px;color:#674e29}.tr-same{min-height:44px;padding:7px 13px;margin-top:8px;border-radius:14px;background:#dceff3;color:#31566a;font-size:14px}.tr-actions [data-configure]{background:#dceff3}.tr-unavailable{font-size:13px;line-height:1.5;margin:7px 0 0}
 .tag-rematch[data-share=true] .tr-actions{grid-template-columns:1fr 1fr 1fr} .tag-rematch[data-save-choice=true] .tr-actions{grid-template-columns:1fr 1fr}.tr-actions [data-share],.tr-actions [data-save-video]{font-size:15px;background:#efe4f8}.tr-actions [data-save-video]{background:#dbeff0}.tr-share-notice{font-size:12px;line-height:1.4;margin:7px 0 0;color:#557886}
 .tag-rematch .tag-video-scope{display:flex;flex-direction:column;gap:10px;min-width:0;margin:12px 0;padding:12px;border:1px solid #91b5ad;border-radius:15px;background:#edf6eb;text-align:left}
 .tag-rematch #tag-video-scope-title{position:static;display:block;inset:auto;transform:none;width:auto;height:auto;margin:0;padding:0;font-size:15px;line-height:1.5;font-weight:850;color:#284e57}
 .tag-rematch .tag-video-scope-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0}
 .tag-rematch .tag-video-scope-buttons button{position:static;inset:auto;transform:none;min-width:0;min-height:46px;height:auto;margin:0;padding:9px 6px;font-size:14px;line-height:1.5;white-space:normal;overflow-wrap:anywhere}
 .tag-rematch .tag-video-scope [data-video-scope-note]{position:static;margin:0;font-size:13px;line-height:1.6;color:#34585d}
 @media(max-width:340px){.tag-rematch .tag-video-scope-buttons{grid-template-columns:minmax(0,1fr)}}
 @media(orientation:landscape){.tag-rematch{width:min(340px,calc(50vw - 24px));max-height:calc(100dvh - 85px);overflow:auto}.tag-rematch h2{font-size:23px}.tr-metric strong{font-size:34px}}
 @media(prefers-reduced-motion:reduce){.tag-rematch{scroll-behavior:auto}}
 `;doc.head.append(style);const el=doc.createElement('section');el.id='round-result';el.className='tag-rematch';el.hidden=true;el.tabIndex=-1;el.setAttribute('aria-labelledby','round-result-title');el.setAttribute('aria-label','ラウンドの結果');el.dataset.share=String(typeof onShare==='function');el.innerHTML='<h2 id="round-result-title"></h2><div class="tr-metric"><strong data-time></strong><span>秒</span><small data-label></small></div><p class="tr-record" data-record role="status" hidden></p><p class="tr-best" data-best hidden></p><div class="tr-actions"><button data-retry>配置を変えて再戦</button><button data-configure>組合せ変更</button><button data-share disabled>リプレイ動画</button><button data-save-video hidden disabled>動画を保存</button></div><button class="tr-same" data-retry-same>↺ 同じ配置で再挑戦</button><details class="tr-video-preview" hidden><summary>動画を確認</summary><video controls playsinline preload="metadata" style="display:block;width:100%;height:min(38vh,280px);object-fit:contain;background:#102932;border-radius:10px;margin-top:8px"></video></details><p class="tr-share-notice" data-share-notice role="status" hidden></p><p class="sharing-inline-notice">公開前に、音楽の権利・顔や居場所の映り込み・公開範囲・年齢条件を確認。<a href="../life-quest-walk.html?from=sharing-guidelines&revision=1210s#sharing-guidelines" target="_blank" rel="noopener noreferrer">配信・投稿のルール</a></p><p class="tr-unavailable" data-unavailable hidden></p>';doc.body.append(el);const q=s=>el.querySelector(s),clipPreview=createHuntVideoPreview({video:q('video'),details:q('.tr-video-preview'),document:doc});q('[data-share]').hidden=typeof onShare!=='function';q('[data-retry-same]').hidden=typeof onRetrySame!=='function';q('[data-retry-same]').onclick=()=>{if(state.current&&!q('[data-retry-same]').disabled)onRetrySame?.();};
 function render(){const m=state.current;if(!m)return;el.dataset.win=String(m.win);q('h2').textContent=m.title;q('[data-time]').textContent=m.time;q('[data-label]').textContent=m.label;q('[data-best]').textContent=m.best;q('[data-best]').hidden=!m.best;const record=q('[data-record]');if(record.textContent!==m.recordNotice)record.textContent=m.recordNotice;record.hidden=!m.recordNotice;}
 function open({focus=true}={}){if(!state.current)return false;render();el.hidden=false;clipPreview.show();if(focus)el.focus({preventScroll:true});return true;}
 q('[data-retry]').onclick=()=>{if(state.current&&!q('[data-retry]').disabled)onRetry();};q('[data-configure]').onclick=()=>{if(state.current)onConfigure();};
 q('[data-share]').onclick=()=>{if(!q('[data-share]').disabled)onShare?.();};
 q('[data-save-video]').onclick=()=>{if(!q('[data-save-video]').hidden&&!q('[data-save-video]').disabled)onSaveVideo?.();};
 function updateShare(info){
  const busy=info.status==='busy',preparing=info.status==='preparing',ready=info.status==='ready',button=q('[data-share]'),save=q('[data-save-video]');
  const showSave=typeof onSaveVideo==='function'&&!!state.current&&!!info.hasSaveChoice&&(ready||busy);
  el.dataset.saveChoice=String(showSave);
  save.hidden=!showSave;
  save.disabled=!showSave||busy;
  button.disabled=!state.current||busy||preparing;
  button.textContent=!state.current?'リプレイ動画':busy?(info.action==='share'?'共有中':showSave?'動画を共有':'保存中'):ready?(info.action==='share'?'動画を共有':'動画を保存'):preparing?'動画準備中':'動画を作る';
  save.textContent=showSave&&busy&&info.action==='download'?'保存中':'動画を保存';
  save.setAttribute('aria-busy',String(showSave&&busy&&info.action==='download'));
  button.setAttribute('aria-busy',String(preparing||busy&&(!showSave||info.action==='share')));
  clipPreview.update(info);
  q('[data-share-notice]').textContent=info.notice??'';
  q('[data-share-notice]').hidden=!info.notice;
  el.dataset.videoMime=info.mime??'';
  el.dataset.shareState=info.status;
 }
 function clearRoundUi(){
  clipPreview.reset();
  el.scrollTop=0;
  q('[data-retry]').disabled=false;
  q('[data-retry-same]').disabled=false;
  q('[data-unavailable]').hidden=true;
  q('[data-unavailable]').textContent='';
  updateShare({status:'idle'});
 }
 return{
  show(data){
   const same=state.isCurrent(data?.ticket);
   if(!state.show(data))return false;
   if(!same)clearRoundUi();
   return open();
  },
  open,
  hide(){clipPreview.hide();el.hidden=true;},
  reset(){state.clear();el.hidden=true;clearRoundUi();},
  setShareState(info){
   if(!state.isCurrent(info.ticket))return false;
   updateShare(info);
   return true;
  },
  setUnavailable(text){q('[data-retry]').disabled=true;q('[data-retry-same]').disabled=true;q('[data-unavailable]').textContent=text;q('[data-unavailable]').hidden=false;},
  verify(ticket,best,temporary){if(!state.verify(ticket,best,temporary))return false;render();return true;},
  isCurrent:ticket=>state.isCurrent(ticket),
  dispose(){clipPreview.dispose();state.clear();el.remove();style.remove();},
  get hasResult(){return!!state.current;},
  get summary(){return state.current;},
  get visible(){return!el.hidden;},
 };
}
