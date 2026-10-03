import {MAX_VEHICLE_RESTORE_INPUT} from './imasora-construction-vehicle-restore-session.js?v=502';

// This is an extra screen inside the existing vehicle dialog. The original
// save/leave handlers, focus trap and explicit resume control remain in place.
export function createVehicleRestoreView({menu,session,isMenuOpen,refresh}){
  const body=menu.querySelector('.gv-menu-body'),footer=menu.querySelector('.gv-menu-footer'),heading=menu.querySelector('h2');
  const open=document.createElement('button');open.type='button';open.dataset.vehicleRestore='open';open.textContent='この車両の作業を復元';menu.querySelector('.gv-menu-actions').append(open);
  const section=document.createElement('section');section.className='gv-restore';section.hidden=true;
  section.innerHTML=`<div data-vehicle-restore-screen="choose"><p>戻したい保存を選んで内容を確認してください。確認だけでは作業は変わりません。</p>
    <div class="gv-restore-choice"><h3>この端末の保存履歴</h3><label>戻したい保存<select data-vehicle-history aria-label="車両作業の保存履歴"></select></label><p data-vehicle-empty hidden>使用中の素材量が一致する履歴はありません。</p><button type="button" data-vehicle-restore="history">選んだ保存の内容を確認</button></div>
    <details><summary>一括控えのファイルから選ぶ</summary><label>一括控え（64 MiBまで）<input type="file" accept=".json,application/json" data-vehicle-file aria-label="車両作業を戻す一括控え"></label><p data-vehicle-filename>ファイルは選択されていません。</p><button type="button" data-vehicle-restore="file">ファイルの内容を確認</button></details>
    <details><summary>一括控えの文字列を貼り付ける</summary><label>一括控えの文字列<textarea data-vehicle-text rows="4" spellcheck="false" aria-label="車両作業を戻す一括控えの文字列"></textarea></label><button type="button" data-vehicle-restore="inspect">文字列の内容を確認</button></details>
    <div class="gv-restore-choice"><button type="button" data-vehicle-restore="undo">直前の復元を取り消す内容を確認</button><p>復元後に作業を進める前なら、未保存だった作業を含めて復元直前の状態へ戻せます。</p></div></div>
    <div data-vehicle-restore-screen="review" hidden><p data-vehicle-review-intro></p><div class="gv-restore-comparison"><table><caption>現在と復元後の素材の状態</caption><thead><tr><th scope="col">場所</th><th scope="col">現在</th><th scope="col">復元後</th></tr></thead><tbody data-vehicle-comparison></tbody></table></div><p data-vehicle-source></p><p>この車両の位置・姿勢と、区画内の作業を戻します。現在の未保存作業も、復元直前の控えに残します。</p></div>
    <p class="gv-restore-preserve">掘った地形・他の車両・建物・UFO・財布・購入／受取素材・他マップは保持します。使用中と保管中の素材量が一致する控えだけを使えます。</p>`;
  body.append(section);
  const status=document.createElement('p');status.className='gv-restore-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  const controls=document.createElement('div');controls.className='gv-restore-footer';controls.innerHTML='<button type="button" data-vehicle-restore="back" hidden>メニューに戻る</button><button type="button" data-vehicle-restore="apply" hidden>この内容で作業を復元する</button><button type="button" data-vehicle-restore="retry" hidden>復元結果を再確認する</button>';footer.prepend(controls);
  const q=s=>menu.querySelector(s),button=name=>q(`[data-vehicle-restore="${name}"]`),area=q('[data-vehicle-text]'),file=q('[data-vehicle-file]'),history=q('[data-vehicle-history]');
  area.maxLength=MAX_VEHICLE_RESTORE_INPUT;
  let screen='home',token=0,reading=false,readToken=null,applying=false,reviewed=false,rows=[],fileText='',comparison=null,notice='';
  function invalidate(){token++;reviewed=false;comparison=null;session.clearRestore();}
  function focus(){heading.focus({preventScroll:true});body.scrollTop=0;}
  function change(next){screen=next;update();refresh();focus();}
  function message(text){notice=String(text||'内容を確認できませんでした。');update();refresh();}
  function loadHistory(){
    rows=[];history.replaceChildren(new Option('保存を選ぶ',''));
    try{rows=session.history();rows.forEach((row,i)=>history.add(new Option(row.label,String(i))));}catch(e){notice=e.message;}
    q('[data-vehicle-empty]').hidden=rows.length>0;
  }
  function update(){
    const active=screen!=='home',pending=session.restorePending,locked=session.locked,busy=session.busy||reading||applying,reason=session.reason();
    section.hidden=!active;
    for(const element of menu.querySelectorAll('.gv-menu-intro,.gv-menu-actions,.gv-details,.gv-menu-emergency'))element.hidden=active;
    heading.textContent=screen==='home'?'ゲームメニュー':screen==='choose'?'車両の作業を復元':'この内容で復元しますか？';
    for(const element of section.querySelectorAll('[data-vehicle-restore-screen]'))element.hidden=element.dataset.vehicleRestoreScreen!==screen;
    open.disabled=busy||!!reason;open.title=reason;
    for(const name of ['file','inspect','history','undo'])button(name).disabled=busy||!!reason;
    button('file').disabled ||= !fileText;button('inspect').disabled ||= !area.value.trim();button('history').disabled ||= history.value==='';
    area.disabled=file.disabled=history.disabled=busy||!!reason;
    button('back').hidden=!active||pending;button('back').disabled=session.busy||applying||locked;button('back').textContent=screen==='review'?'選び直す':'メニューに戻る';
    button('apply').hidden=screen!=='review'||!reviewed||pending;button('apply').disabled=busy||!!reason||!reviewed;
    button('apply').textContent=comparison?.operation==='undo'?'復元前の作業へ戻す':'この内容で作業を復元する';
    button('retry').hidden=!pending;button('retry').disabled=session.busy||applying||session.invalid;
    status.textContent=reading?'一括控えの内容と照合値を確認しています…':session.localBusy?session.message:session.invalid||pending?session.message:notice||reason;status.hidden=!status.textContent;
    // Controllers refresh all buttons as a group. Reapply this screen's gates
    // last so an async read cannot enable the original save/exit controls.
    if(active||reading||locked)for(const element of menu.querySelectorAll('[data-action=save],[data-action=leave],#emergencyEscapeButton'))element.disabled=true;
  }
  function paint(result){
    comparison=result;reviewed=true;const current=result.current,next=result.next,tbody=q('[data-vehicle-comparison]');tbody.replaceChildren();
    const labels={source:'給水槽',bucket:'車載',transit:'移送中',course:'水路',returnTank:'回収槽',moving:'移送中の素材',stock:'区画の保管',stored:'区画の保管',loose:'地面の床板',ground:'設置済み',fixed:'固定済み',held:'吊り上げ中',floating:'浮遊中',total:'合計'};
    const values=[['使用中の合計',current.inUse,next.inUse],['保管庫',current.warehouse,next.warehouse]];
    for(const key of Object.keys(next.counts||{}))if(labels[key]&&Number.isFinite(current.counts?.[key])&&Number.isFinite(next.counts[key]))values.push([labels[key],current.counts[key],next.counts[key]]);
    for(const [label,a,b]of values){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const value of[a,b]){const td=document.createElement('td');td.textContent=`${value} ${next.unit}`;tr.append(td);}tbody.append(tr);}
    q('[data-vehicle-review-intro]').textContent=result.operation==='undo'?'直前の復元を取り消し、復元前の作業へ戻します。':`選んだ控えから「${next.label}」だけを復元します。`;
    q('[data-vehicle-source]').textContent=result.source?.capturedAt?`一括控えの取得日時：${new Date(result.source.capturedAt).toLocaleString('ja-JP')}`:result.operation==='undo'?'復元直前の控えから戻します。':'この端末の保存履歴から戻します。';
    notice='まだ変更していません。内容を確認して、下の確定ボタンを押してください。';change('review');
  }
  open.onclick=()=>{if(open.disabled||!isMenuOpen())return;invalidate();notice='戻す内容を選んでください。';loadHistory();change('choose');};
  function back(){if(session.locked||session.busy||applying)return false;invalidate();notice='まだ復元していません。現在の作業を保持しています。';if(screen==='review'){loadHistory();change('choose');}else change('home');return true;}
  button('back').onclick=back;
  area.oninput=()=>{invalidate();message('文字列が変わりました。もう一度内容を確認してください。');};
  history.onchange=()=>{invalidate();message('選んだ保存の内容を確認してください。');};
  file.onchange=async()=>{
    invalidate();const id=token,selected=file.files?.[0];fileText='';q('[data-vehicle-filename]').textContent=selected?selected.name:'ファイルは選択されていません。';
    if(!selected){update();return;}if(selected.size>MAX_VEHICLE_RESTORE_INPUT){message('64 MiB以下の一括控えを選んでください。');return;}
    reading=true;readToken=id;update();refresh();
    try{const value=await selected.text();if(id!==token||!isMenuOpen()||screen!=='choose')return;if(new TextEncoder().encode(value).byteLength>MAX_VEHICLE_RESTORE_INPUT)throw Error('64 MiB以下の一括控えを選んでください。');fileText=value;notice='ファイルを読み取りました。内容を確認してください。';}
    catch(e){if(id===token)notice=e.message;}
    finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
  };
  async function inspect(operation){
    if(reading||applying||session.busy)return;invalidate();const id=token;reading=true;readToken=id;update();refresh();
    try{const signature=session.signature(),isCurrent=()=>id===token&&isMenuOpen()&&screen==='choose'&&session.signature()===signature,result=await operation(isCurrent);if(isCurrent())paint(result);}
    catch(e){if(id===token)notice=e.message;}
    finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
  }
  button('inspect').onclick=()=>{if(!button('inspect').disabled)void inspect(isCurrent=>session.inspectInput(area.value,{isCurrent}));};
  button('file').onclick=()=>{if(!button('file').disabled)void inspect(isCurrent=>session.inspectInput(fileText,{isCurrent}));};
  button('history').onclick=()=>{if(button('history').disabled)return;const row=rows[Number(history.value)];if(row)void inspect(()=>session.inspectHistory(row.packet));};
  button('undo').onclick=()=>{if(!button('undo').disabled)void inspect(isCurrent=>session.inspectUndo({isCurrent}));};
  async function apply(){
    if(applying||reading||session.busy||(!reviewed&&!session.restorePending))return;applying=true;update();refresh();
    try{const success=await session.apply();notice=session.message;if(success){invalidate();screen='home';}else if(!session.restorePending&&!session.invalid){invalidate();screen='choose';loadHistory();}}
    catch(e){notice=e.message;invalidate();if(!session.restorePending)screen='choose';}
    finally{applying=false;reviewed=false;update();refresh();focus();}
  }
  button('apply').onclick=()=>{if(!button('apply').disabled)void apply();};button('retry').onclick=()=>{if(!button('retry').disabled)void apply();};
  return {update,get active(){return screen!=='home';},get busy(){return reading||applying;},get locked(){return session.locked;},
    close(){if(session.locked||session.busy||applying)return false;invalidate();screen='home';update();return true;},
    handleEscape(){if(screen==='home')return false;back();return true;},
  };
}
