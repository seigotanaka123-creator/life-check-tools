import {canonical} from './imasora-construction-state.js';
import {MAX_TRANSPORT_RESTORE_FILE_BYTES} from './imasora-construction-transport-restore.mjs';
import {runTransportRecoveryTask} from './imasora-construction-recovery-client.mjs';
const amount=q=>(q/8).toLocaleString('ja-JP',{maximumFractionDigits:3})+'すくい';
const mode=s=>({foot:'徒歩',driving:'ダンプに乗車',excavating:'ショベルに乗車'}[s]??s);
const places=[['terrain','地形'],['loose','置いた土'],['shovel','手元'],['bucket','バケット'],['dump','荷台'],['storage','保管箱'],['inFlight','作業途中'],['total','合計']];
export function createTransportRestoreView({panel,service,session,pause,onApplied,onClose}){
 let disposed=false,pendingPaint=null;
 const box=document.createElement('dialog');box.className='transport-sheet transport-recovery';box.innerHTML=`<h2>現場の控え</h2><p role="status" data-recovery="status"></p><p>土・人物・車両・途中の作業をまとめて確認します。財布・道具・建物・ほかのマップは現在のまま残します。</p><label>保存した控え<select data-recovery="history"><option value="">控えを選ぶ</option></select></label><button data-recovery="history-check">選んだ控えと比べる</button><label>ファイルから選ぶ<input data-recovery="file" type="file" accept=".json,application/json"></label><details data-recovery="text-details"><summary>文字列で読み込む</summary><textarea data-recovery="text" aria-label="控えの文字列" rows="4" spellcheck="false"></textarea><button data-recovery="text-check">内容を比べる</button></details><button data-recovery="export">今の作業の控えを保存</button><button data-recovery="undo-check" hidden>復元前の作業を確認</button><section data-recovery="compare" hidden><h3>復元する内容を確認</h3><p data-recovery="source"></p><table><thead><tr><th>土の場所</th><th>現在</th><th>控え</th></tr></thead><tbody data-recovery="amounts"></tbody></table><p data-recovery="work"></p><p>復元後は一時停止します。「現場へ戻る」で続きを始めます。現在の作業は、復元前の控えとして同時に保存します。</p><button data-recovery="apply" class="primary">確認して復元</button></section><button data-recovery="retry" hidden>復元の保存結果を再確認</button><button data-recovery="close">メニューへ戻る</button>`;
 panel.append(box);const e=id=>box.querySelector(`[data-recovery="${id}"]`),msg=t=>{if(!disposed)e('status').textContent=t;};
 const fileHelp=document.createElement('p');fileHelp.textContent='現場だけの控え、またはゲーム全体の控えを選べます。全体の控えからも、この現場の土と作業だけを読み取ります。';e('file').parentElement.after(fileHelp);
 const download=document.createElement('a');download.textContent='控えファイルを保存';download.hidden=true;download.className='transport-download';e('export').after(download);let downloadURL=null;
 const activity=document.createElement('div');activity.hidden=true;activity.innerHTML='<progress aria-label="控えの確認中" style="width:100%;accent-color:#f4ce67"></progress><button data-recovery="cancel">確認を中止</button>';e('status').after(activity);const cancelButton=activity.querySelector('[data-recovery="cancel"]');
 let busy=false,ticket=0,choice=null,point=null,history=[],capture=null,retryPending=false,controller=null,cancellable=false;
 const ctx=()=>({current:session.record,earth:service.ledger?.world.constructionExcavation??service.world.constructionExcavation,profile:service.constructionTransferProfileId,origin:service.excavationOrigin});
 const snap=()=>({gen:service.generation,raw:service.raw.current,record:session.record});
 function loadHistory(){if(disposed)return;e('history').replaceChildren(new Option('控えを選ぶ',''));history=[service.raw.current,...service.raw.backups];for(let i=0;i<history.length;i++){let available=false;try{available=JSON.parse(history[i]).state?.world?.constructionTransport?.version===2;}catch{}const o=new Option(i===0?'現在の保存':i+'回前の保存',String(i));o.disabled=!available;if(!available)o.textContent+='（土の運搬を始める前）';e('history').append(o);}}
 function unchanged(c){if(disposed)throw Error('現場の控えを閉じました。');if(!c||service.generation!==c.gen||service.raw.current!==c.raw||canonical(session.record)!==canonical(c.record))throw Error('比較後に現場が変わりました。もう一度内容を比べてください。');}
 function controls(){if(disposed)return;for(const id of ['history','history-check','file','text','text-check','export','undo-check','close'])e(id).disabled=busy||retryPending;download.hidden=!downloadURL||busy||retryPending;e('apply').disabled=busy||retryPending||!choice;e('retry').hidden=!retryPending;e('retry').disabled=busy;activity.hidden=!busy;cancelButton.hidden=!busy||!cancellable;cancelButton.disabled=!busy||!cancellable;}
 function clear(){ticket++;if(disposed)return;choice=null;capture=null;e('compare').hidden=true;e('amounts').replaceChildren();e('file').value='';controls();}
 function paint(){
  if(disposed||document.hidden)return Promise.resolve();
  return new Promise(resolve=>{let first=0,second=0,timer=0,settled=false;
   const done=()=>{if(settled)return;settled=true;cancelAnimationFrame(first);cancelAnimationFrame(second);clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);pendingPaint=null;resolve();};
   const hidden=()=>{if(document.hidden)done();};pendingPaint=done;document.addEventListener('visibilitychange',hidden);
   first=requestAnimationFrame(()=>{first=0;second=requestAnimationFrame(done);});timer=setTimeout(done,80);
  });
 }
 const checkCancelled=signal=>{if(signal?.aborted)throw Object.assign(Error('確認を中止しました。現場は変更していません。'),{name:'AbortError'});};
 // File.text() and an IndexedDB read can finish after cancellation. Stop
 // waiting immediately; each continuation checks the signal before adoption.
 function waitForCheck(task,signal){return new Promise((resolve,reject)=>{let settled=false;const finish=(error,value)=>{if(settled)return;settled=true;signal.removeEventListener('abort',stop);error?reject(error):resolve(value);};const stop=()=>finish(Object.assign(Error('確認を中止しました。現場は変更していません。'),{name:'AbortError'}));signal.addEventListener('abort',stop,{once:true});Promise.resolve(task).then(value=>finish(null,value),error=>finish(error));if(signal.aborted)stop();});}
 cancelButton.onclick=()=>{if(busy&&cancellable)controller?.abort();};
 async function job(fn,{write=false,message='控えを確認しています…'}={}){if(disposed||busy||retryPending)return;const active=new AbortController();controller=active;cancellable=!write;busy=true;controls();msg(message);try{await paint();checkCancelled(active.signal);if(!disposed){const task=fn(active.signal);await(write?task:waitForCheck(task,active.signal));}}catch(err){if(!disposed)msg(err.name==='AbortError'?'確認を中止しました。現場は変更していません。':err.message);}finally{controller=null;cancellable=false;busy=false;controls();}}
 function compare(result,kind='restore'){if(disposed)return;
  clear();capture=snap();choice={...result,kind};const now=result.currentSummary,then=result.summary;
  for(const [key,label]of places){const tr=document.createElement('tr');for(const value of[label,amount(now.quantities[key]),amount(then.quantities[key])]){const td=document.createElement('td');td.textContent=value;tr.append(td);}if(now.quantities[key]!==then.quantities[key])tr.className='transport-changed';e('amounts').append(tr);}
  e('source').textContent=kind==='undo'?'復元する直前の作業です。':(result.sourceKind==='recovery-bundle'?'ゲーム全体の控えにある、保存済みの現場です。':'')+(result.createdAt?new Date(result.createdAt).toLocaleString('ja-JP')+(result.unsaved?'・保存前の途中作業を含む':''):'選んだ保存履歴です。')+(result.generation?'／保存番号 '+result.generation:'');
  const describe=s=>mode(s.mode)+'／人物 '+[s.player.x,s.player.y,s.player.z].map(n=>Number(n.toFixed(2))).join(', ')+(s.task?'／'+s.task+' '+s.elapsed.toFixed(2)+'秒':'／作業なし');
  const vehicle=s=>'ダンプ '+[s.dump.x,s.dump.z].map(n=>Number(n.toFixed(2))).join(', ')+'／向き '+Math.round(s.dump.heading*180/Math.PI)+'°／ショベル 根元 '+Math.round(s.arm.boom*180/Math.PI)+'°・アーム '+Math.round(s.arm.stick*180/Math.PI)+'°・バケット '+Math.round(s.arm.curl*180/Math.PI)+'°・旋回 '+Math.round(s.arm.slew*180/Math.PI)+'°';
  e('work').textContent='現在：'+describe(now)+'。'+vehicle(now)+'。\n控え：'+describe(then)+'。'+vehicle(then)+'。';e('apply').textContent=kind==='undo'?'確認して復元前へ戻す':'確認して復元';e('compare').hidden=false;msg('土量と人物・車両・作業途中を比べてから、確認ボタンを押してください。');
 }
 async function inspect(text,signal){const c=snap(),t=ticket,result=await runTransportRecoveryTask('inspect',{text,context:ctx()},{signal});checkCancelled(signal);if(t!==ticket||!box.open)return;unchanged(c);compare(result);}
 e('history-check').onclick=()=>{clear();void job(signal=>{const v=history[Number(e('history').value)];if(!v||e('history').value==='')throw Error('控えを選んでください。');return inspect(v,signal);});};
 e('text-check').onclick=()=>{clear();void job(signal=>inspect(e('text').value,signal));};
 e('text').addEventListener('input',()=>clear());e('history').onchange=()=>clear();
 e('file').onchange=()=>{const file=e('file').files[0];clear();const t=ticket;if(!file)return;void job(async signal=>{if(file.size>MAX_TRANSPORT_RESTORE_FILE_BYTES)throw Error('64 MiB以下の控えを選んでください。');const c=snap(),text=await file.text();checkCancelled(signal);if(t!==ticket||!box.open)return;unchanged(c);await inspect(text,signal);});};
 e('export').onclick=()=>void job(async signal=>{
  const capture=snap(),c=ctx(),text=await runTransportRecoveryTask('export',{saved:service.constructionTransport,current:session.record,earth:c.earth,profile:c.profile,origin:c.origin,generation:service.generation},{signal});checkCancelled(signal);unchanged(capture);
  // Keep large export data in the file, not in the text-import control.
  if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(new Blob([text],{type:'application/json'}));download.href=downloadURL;download.download='imasora-construction-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';msg('控えを用意しました。「控えファイルを保存」を押して、保存先をご確認ください。');
 },{message:'控えファイルを作っています…'});
 e('undo-check').onclick=()=>{clear();void job(async signal=>{const c=snap(),p=await service.readConstructionTransportRestore({signal});checkCancelled(signal);unchanged(c);if(!p||p.kind!=='restore'||canonical(p.applied)!==canonical(session.record))throw Error('復元後に作業が変わったため、復元前へ戻せません。');const x=ctx(),summaries=await runTransportRecoveryTask('summaries',{record:p.beforeUnsaved,...x},{signal});checkCancelled(signal);unchanged(c);point=p;compare({record:p.beforeUnsaved,...summaries},'undo');});};
 async function applied(){session.rebaseAfterRestore();if(disposed)return;pause();choice=null;capture=null;e('compare').hidden=true;point=structuredClone(service.transportRestorePoint);loadHistory();e('undo-check').hidden=point?.kind!=='restore';onApplied();msg('復元しました。動きは一時停止しています。メニューから現場へ戻れます。');}
 e('apply').onclick=()=>void job(async()=>{unchanged(capture);const c=choice;if(!c)throw Error('もう一度内容を比べてください。');try{
  if(c.kind==='undo')await service.undoConstructionTransportRestore(session.record,capture.gen,capture.raw,point.id);else await service.restoreConstructionTransport(c.record,session.record,capture.gen,capture.raw);
  await applied();
 }catch(err){if(!disposed&&service.blocked&&service.restoringTransport){retryPending=true;choice=null;e('compare').hidden=true;}throw err;}},{write:true,message:'現場を復元しています。完了までこの画面でお待ちください…'});
 e('retry').onclick=async()=>{if(disposed||busy)return;busy=true;controls();msg('保存の結果を確認しています…');try{await paint();if(disposed)return;await service.retry();retryPending=false;await applied();}catch(err){msg(err.message+'　元の現場と復元前の控えを保持しています。');}finally{busy=false;controls();}};
 function close(){if(disposed||busy||retryPending)return;clear();box.close();onClose();}e('close').onclick=close;box.addEventListener('cancel',ev=>{ev.preventDefault();close();});
 return {get open(){return !disposed&&box.open;},get busy(){return !disposed&&(busy||retryPending);},show(){if(disposed)return;pause();if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;clear();e('text').value='';e('text-details').open=false;loadHistory();box.showModal();e('undo-check').hidden=true;void job(async signal=>{const c=snap(),candidate=await service.readConstructionTransportRestore({signal});checkCancelled(signal);unchanged(c);point=candidate;e('undo-check').hidden=point?.kind!=='restore'||canonical(point.applied)!==canonical(session.record);msg('控えを選ぶか、今の作業をファイルに保存できます。');});},dispose(){if(disposed)return;disposed=true;ticket++;if(cancellable)controller?.abort();pendingPaint?.();if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;box.remove();}};
}
