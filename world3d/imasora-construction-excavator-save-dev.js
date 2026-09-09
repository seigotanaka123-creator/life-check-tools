import {startExcavatorBuildView} from './imasora-construction-excavator-build-dev.js?v=468';
import {initialExcavatorBuild} from './assets/imasora-construction-excavator-build.js';
import {packExcavation,unpackExcavation,resumeExcavation} from './assets/imasora-construction-excavator-save.js';
import {ExcavationSession,ExcavationStore} from './assets/imasora-construction-excavator-storage.js';
import {readExcavationImport,excavationImportSummary,EXCAVATION_IMPORT_LIMIT} from './assets/imasora-construction-excavator-import.js';
const $=id=>document.getElementById(id),local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const restoreTest=new URLSearchParams(location.search).has('excavationRestoreTest');
const session=new ExcavationSession(new ExcavationStore(undefined,{restoreTest}));let initial=initialExcavatorBuild(),paused=false,writing=false,ready=false,saveText='未保存・保存ボタンで開始',api,guide;
let restorePoint=null,pendingRestore=false,importCandidates=[],importGeneration=null,importReadId=0;
if(local){try{const saved=await session.load();if(saved){initial=saved;paused=true;saveText='保存を読み込みました。一時停止中です。';}ready=true;}catch(error){paused=true;initial=session.recovery||initial;saveText=error.message+(session.recovery?' 正常な控えを表示しています。復旧は確認後に行います。':' 作業データは未読込です。');}}
else {paused=true;saveText='ローカル開発専用です。通常ゲームには保存しません。';}
if(local)try{restorePoint=await session.store.readRestorePoint();}catch{saveText+=' 復元前の控えは読み込めていません。';}
if(restoreTest){document.querySelector('header small').textContent='工事現場 · 9-1c2a · 復元確認専用';document.querySelector('header p').textContent='通常の開発保存にも書き込まない復元テスト区画';}
const editable=()=>local&&ready&&!paused&&!writing&&!session.blocked;
const disabledBeforePause=new Map();
function restoreButtons(){for(const [button,disabled] of disabledBeforePause)button.disabled=disabled;disabledBeforePause.clear();}
function pause(){paused=true;guide?.suspend();api?.clear();}
function failed(error){session.blocked=true;pause();saveText=`保存を保護して停止：${error.message}`;renderSave();}
async function save(stop=true){
  if(!ready||writing||session.busy||session.blocked)return;
  if(stop)pause();writing=true;api.clear();saveText='保存中…';renderSave();
  try{await session.save(api.getState());saveText=paused?'保存して一時停止しました。':'自動保存済み';}
  catch(error){failed(error);}finally{writing=false;renderSave();}
}
function renderSave(){
  if(!api)return;
  $('save-status').textContent=saveText;$('save-status').classList.toggle('warning',session.blocked);
  $('save-number').textContent=`保存番号 ${session.generation??'—'} · ${session.store.name}`;
  $('save-pause').disabled=!ready||writing||session.busy||session.blocked;
  $('save-resume').hidden=!paused;$('save-resume').disabled=!ready||writing||session.blocked;
  $('save-retry').hidden=!session.pending;$('save-retry').disabled=writing||session.busy;
  $('save-recover').hidden=!session.recovery;$('save-recover').disabled=writing||session.busy||!!session.pending;
  $('save-reload').disabled=writing||session.busy;$('save-export').disabled=writing||(!ready&&!session.recovery);
  $('save-raw').hidden=!session.raw;$('save-raw').disabled=writing;
  $('save-import-open').disabled=!local||!session.loaded||writing||session.busy||!!session.pending;
  $('save-import-before').hidden=!restorePoint;$('save-import-before').disabled=writing||session.busy||!!session.pending;
  $('save-import-before-export').hidden=!restorePoint;$('save-import-before-export').disabled=writing;
  if(!editable())document.querySelectorAll('.controls button').forEach(b=>{if(!disabledBeforePause.has(b))disabledBeforePause.set(b,b.disabled);b.disabled=true;});else restoreButtons();
  $('save-state').textContent=writing?'保存中':session.blocked?'保護停止':paused?'一時停止':'作業中';
  $('debug').textContent=$('debug').textContent.replace('保存：なし（貸出区画）',`保存：専用の開発用区画 / 番号 ${session.generation??'未保存'} / ${paused?'一時停止':'作業中'}`);
  const state=api.getState(),action=state.action||state.loader.transition;
  if(!$('debug').textContent.includes('\n中断点：'))$('debug').textContent+=`\n中断点：${state.action?.kind||state.loader.mode} ${action?`${action.elapsed.toFixed(3)}秒 / ${action.duration??'旋回'}秒`:''}`;
}
startExcavatorBuildView({initial:()=>initial,canEdit:editable,decorate(view,construction){api=view;guide=construction;return {
  ...construction,
  beforeRefresh:restoreButtons,
  onAction(action){if(!editable())return true;return construction.onAction(action);},
  step(s,input,dt){return editable()?construction.step(s,input,dt):s;},
  refresh(s){construction.refresh(s);renderSave();}
};}});
$('save-pause').onclick=()=>save(true);
$('save-resume').onclick=()=>{if(!ready||writing||session.blocked)return;api.clear();const state=resumeExcavation(api.getState());state.message=state.action||state.loader.transition?'保存した機械動作を途中から再開します。':'作業を再開しました。施工補助はボタンを押すと再開します。';api.setState(state);paused=false;saveText='作業を再開しました。5秒ごとに自動保存します。';renderSave();};
$('save-retry').onclick=async()=>{if(writing||session.busy)return;writing=true;renderSave();try{await session.retry();if(pendingRestore)await finishRestore();else{ready=true;saveText='保存を確認しました。一時停止のままです。';}}catch(e){failed(e);}finally{writing=false;renderSave();}};
let confirmation=null;
function confirm(message,action){pause();$('save-confirm-text').textContent=message;confirmation=action;$('save-confirm').showModal();}
$('save-confirm-cancel').onclick=()=>{confirmation=null;$('save-confirm').close();};
$('save-confirm').addEventListener('cancel',()=>confirmation=null);
$('save-confirm-ok').onclick=()=>{const action=confirmation;confirmation=null;$('save-confirm').close();action?.();};
$('save-recover').onclick=()=>confirm('正常な控えで、この開発用区画を復旧します。破損した原本は保存履歴にも残します。必要なら先に原本を書き出してください。',async()=>{
  writing=true;renderSave();try{const state=await session.recover();api.setState(state);ready=true;saveText='正常な控えから復旧しました。一時停止中です。';}catch(e){failed(e);}finally{writing=false;renderSave();}
});
$('save-reload').onclick=()=>confirm('画面上の未保存の作業を離れ、最新の保存を読み込み直します。残したい作業は先に「作業を書き出す」で保管してください。',()=>location.reload());
function download(value,name){const text=JSON.stringify(value,null,2);$('save-backup').value=text;$('save-backup-panel').hidden=false;const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('save-export').onclick=()=>{pause();try{download(packExcavation(api.getState()),'imasora-excavation-checkpoint.json');saveText='作業の書き出しを要求しました。下の文字列でも保管できます。';}catch(e){saveText=e.message;}renderSave();};
$('save-raw').onclick=()=>{pause();download({database:session.store.name,protectedRecord:session.raw},'imasora-excavation-protected-record.json');};
$('save-backup-close').onclick=()=>$('save-backup-panel').hidden=true;
async function finishRestore(){
  api.setState(unpackExcavation(session.lastPacket));paused=true;ready=true;pendingRestore=false;
  saveText='バックアップから復元しました。一時停止中です。「作業を再開」で続けられます。';
  try{restorePoint=await session.store.readRestorePoint();}catch{saveText+=' 復元前の控えの再読込に失敗しました。';}
}
function clearImport(){importCandidates=[];importReadId++;$('save-import-choices').replaceChildren();$('save-import-summary').textContent='';$('save-import-apply').disabled=true;}
function showCandidates(candidates){
  importCandidates=candidates;importGeneration=session.generation;const select=$('save-import-choices');select.replaceChildren();
  candidates.forEach((c,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=c.label+(c.error?'（破損・選択不可）':'');option.disabled=!!c.error;select.append(option);});
  select.value=String(candidates.findIndex(c=>c.packet));showImportSummary();
}
function showImportSummary(){
  const c=importCandidates[Number($('save-import-choices').value)];$('save-import-summary').textContent=c?.summary||'';
  $('save-import-apply').disabled=!c?.packet;$('save-import-status').textContent='内容を検査しました。まだ作業・保存は変更していません。';
}
function openImport(){pause();clearImport();$('save-import-text').value='';$('save-import-file').value='';$('save-import-status').textContent='ファイルまたはバックアップ文字列を指定してください。';$('save-import-current').textContent=ready?excavationImportSummary(api.getState()):'現在の作業は未読込です。保存原本を保護します。';$('save-import-panel').showModal();}
$('save-import-open').onclick=openImport;
$('save-import-close').onclick=()=>{importReadId++;$('save-import-panel').close();};
$('save-import-panel').addEventListener('cancel',()=>{importReadId++;});
$('save-import-text').addEventListener('input',()=>{clearImport();$('save-import-status').textContent='入力が変わりました。「内容を確認」を押してください。';});
$('save-import-check').onclick=()=>{clearImport();try{showCandidates(readExcavationImport($('save-import-text').value));}catch(e){$('save-import-status').textContent=e.message;}};
$('save-import-choices').onchange=showImportSummary;
$('save-import-file').onchange=async()=>{
  clearImport();const file=$('save-import-file').files[0],token=importReadId;if(!file)return;
  if(file.size>EXCAVATION_IMPORT_LIMIT){$('save-import-status').textContent='8 MB以下のバックアップを選んでください。';return;}
  try{const text=await file.text();if(token!==importReadId||!$('save-import-panel').open)return;$('save-import-text').value=text;showCandidates(readExcavationImport(text));}
  catch(e){if(token===importReadId)$('save-import-status').textContent=e.message;}
};
$('save-import-apply').onclick=()=>{
  const choice=importCandidates[Number($('save-import-choices').value)];if(!choice?.packet)return;
  const packet=structuredClone(choice.packet),expected=importGeneration;
  confirm(`「${choice.label}」へ復元します。今の作業は未保存分も含めて、復元前の控えに別保管します。通常ゲームの所持品や土地は変更しません。`,async()=>{
    writing=true;renderSave();
    try{const pending=session.restore(packet,expected,ready?api.getState():null);pendingRestore=!!session.pending?.restoreId;await pending;$('save-import-panel').close();await finishRestore();}
    catch(e){if(pendingRestore){$('save-import-panel').close();failed(e);}else $('save-import-status').textContent=e.message;}
    finally{writing=false;renderSave();}
  });
};
$('save-import-before').onclick=()=>{openImport();try{showCandidates(readExcavationImport(JSON.stringify(restorePoint)));}catch(e){$('save-import-status').textContent=e.message;}};
$('save-import-before-export').onclick=()=>{pause();download(restorePoint,'imasora-excavation-before-restore.json');};
const timer=setInterval(()=>{if(editable()&&session.generation!==null)save(false);},5000);
window.addEventListener('pagehide',()=>{clearInterval(timer);guide.suspend();session.store.close();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){pause();if(ready&&session.generation!==null&&!writing&&!session.blocked&&!$('save-import-panel').open&&!$('save-confirm').open)save(true);}
  else if(ready&&!writing&&!session.blocked)session.checkHead().then(renderSave).catch(failed);
});
window.addEventListener('beforeunload',event=>{
  if(!api||session.busy)return;
  try{if(session.pending||packExcavation(api.getState()).checksum!==session.lastPacket?.checksum){event.preventDefault();event.returnValue='';}}catch{}
});
renderSave();
