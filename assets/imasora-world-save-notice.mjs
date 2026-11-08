import{createWorldSaveNoticeFlow}from'./imasora-world-save-notice-flow.mjs?v=120pw';
export function createWorldSaveErrorUI({retry,reopen=()=>location.reload(),exportRecord,developer=false,pause=()=>{}}){
 const d=document.createElement('dialog');d.className='world-save-error';d.setAttribute('aria-labelledby','world-save-error-title');
 d.innerHTML='<button type="button" data-save-close aria-label="保存確認を閉じる">×</button><div class="save-notice-star" aria-hidden="true">✦</div><small>イマソラーズウォーク</small><h2 id="world-save-error-title"></h2><p data-save-message role="alert"></p><p data-save-safe>セーブした作品と持ちものは消さないよ。</p><div data-save-progress hidden><progress aria-label="セーブを確認中"></progress><p>ちょっと待ってね。セーブをたしかめているよ。</p></div><div data-save-choices><button type="button" data-save-retry>もう一度ためす</button><button type="button" data-save-reopen></button></div><section data-save-confirm hidden><h3>セーブしたところから開きなおす？</h3><p>最後にセーブできた続きから遊べるよ。<strong>まだセーブできていない操作は戻るよ。</strong></p><button type="button" data-save-continue>開きなおしてつづける</button><button type="button" data-save-back>いまの画面に戻る</button></section><button type="button" data-save-dismiss>画面をとじる</button><div data-save-details><button type="button" data-save-info aria-expanded="false">お知らせのくわしい内容</button><section data-save-info-box hidden><p data-save-detail></p><button type="button" data-save-info-close>くわしい内容をとじる</button></section></div>';
 const reminder=document.createElement('button');reminder.type='button';reminder.className='world-save-reminder';reminder.textContent='セーブの確認';reminder.hidden=true;reminder.setAttribute('aria-haspopup','dialog');document.body.append(d,reminder);let previousFocus=null;
 const q=s=>d.querySelector(s);let previousOpen=false,previousConfirm=false;
 const flow=createWorldSaveNoticeFlow({retry,reopen,changed:s=>{
  if(s.opened!==previousOpen){pause();if(s.opened)previousFocus=document.activeElement;}
  const issue=s.issue;q('h2').textContent=s.working?'セーブをたしかめているよ':issue?.title??'セーブをたしかめよう';q('[data-save-message]').textContent=s.working?'作品と材料を大切にしまっているよ。':issue?.message??'';
  q('[data-save-safe]').hidden=s.working;q('[data-save-progress]').hidden=!s.busy;
  q('[data-save-choices]').hidden=s.working||s.confirming;q('[data-save-confirm]').hidden=!s.confirming;
  q('[data-save-reopen]').textContent=issue?.reopen??'セーブから開きなおす';q('[data-save-detail]').textContent=issue?.detail??'';q('[data-save-details]').hidden=s.working||s.confirming;
  for(const b of d.querySelectorAll('button'))b.disabled=s.busy&&!b.matches('[data-save-close],[data-save-dismiss]');
  reminder.hidden=s.opened||!s.pending;reminder.setAttribute('aria-expanded',String(s.opened));
  if(s.opened&&!d.open)d.showModal();else if(!s.opened&&d.open)d.close();
  if(s.opened&&!s.busy&&(!previousOpen||s.confirming!==previousConfirm))q(s.confirming?'[data-save-continue]':issue?.kind==='newer'?'[data-save-reopen]':'[data-save-retry]').focus({preventScroll:true});
  if(previousOpen&&!s.opened){const target=s.pending?reminder:previousFocus;if(target?.isConnected)target.focus({preventScroll:true});}previousOpen=s.opened;previousConfirm=s.confirming;
 }});
 q('[data-save-close]').onclick=()=>flow.dismiss();q('[data-save-dismiss]').onclick=()=>flow.dismiss();reminder.onclick=()=>flow.present();
 q('[data-save-retry]').onclick=()=>void flow.tryAgain();q('[data-save-reopen]').onclick=()=>flow.askReopen();q('[data-save-back]').onclick=()=>flow.cancelReopen();q('[data-save-continue]').onclick=()=>void flow.confirmReopen();
 const info=open=>{if(flow.state.busy)return;q('[data-save-info-box]').hidden=!open;q('[data-save-info]').setAttribute('aria-expanded',String(open));};q('[data-save-info]').onclick=()=>info(q('[data-save-info-box]').hidden);q('[data-save-info-close]').onclick=()=>info(false);
 d.addEventListener('cancel',e=>{e.preventDefault();if(flow.state.confirming)flow.cancelReopen();else flow.dismiss();});
 // Read-only technical output remains available only to an explicit developer
 // view. Normal players are never asked to handle a file or raw save text.
 if(developer&&typeof exportRecord==='function'){
  const tools=document.createElement('details'),summary=document.createElement('summary'),button=document.createElement('button'),pre=document.createElement('pre');summary.textContent='保存エラーの詳しい記録';button.type='button';button.textContent='保護した記録を表示';pre.hidden=true;button.onclick=()=>{if(flow.state.busy)return;try{pre.textContent=exportRecord();pre.hidden=false;}catch(error){pre.textContent=error.message;pre.hidden=false;}};tools.append(summary,button,pre);d.append(tools);
 }
 return{show:flow.show,startWork:flow.startWork,endWork:flow.endWork};
}
