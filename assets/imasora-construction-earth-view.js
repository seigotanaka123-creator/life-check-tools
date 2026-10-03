import {MAX_EARTH_RESTORE_INPUT} from './imasora-construction-earth-restore.js?v=497';
import {MAX_EARTH_BUNDLE_RESTORE_INPUT} from './imasora-construction-earth-bundle-restore.js?v=501';

export function createExcavationAuthorityView({panel,session,snapshot,pause,replace,refresh}){
  if(session.live)return createPlayerEarthMenu({panel,session,snapshot,pause,replace,refresh});
  let opened=false,reading=false,readToken=null,applying=false,token=0,reviewed=false,historyRows=[];
  const box=document.createElement('section');box.className='we-ledger';box.setAttribute('aria-label','世界と掘削の同時保存');
  box.innerHTML='<p class="we-earth-description">世界と掘削をまとめて保存する接続確認です。通常の所持品とは別の試験世界（土1792個・金貨12枚）です。</p><div class="we-backup-actions"><button data-earth-save>世界と掘削を一緒に保存</button><button data-earth-export>確認用の世界と作業を書き出す</button></div><p class="we-ledger-status" role="status"></p><pre class="we-ledger-detail" style="white-space:pre-wrap;font-size:11px"></pre>';
  if(session.live){
    box.querySelector('p').textContent='掘った地形・積載・盛土・車両の状態を、世界と一緒に保存します。土はこの区画で有限です。';box.querySelector('[data-earth-export]').textContent='世界と作業の控えを書き出す';
    const restoreButton=document.createElement('button');restoreButton.dataset.earthRestore='open';restoreButton.textContent='地形と作業を復元';box.querySelector('.we-backup-actions').append(restoreButton);
    const restorePanel=document.createElement('section');restorePanel.className='we-restore we-earth-restore';restorePanel.hidden=true;restorePanel.setAttribute('aria-label','地形と作業の復元');
    restorePanel.innerHTML=`<h3 tabindex="-1">地形と作業を復元</h3>
      <p>同じ保存元・同じ区画の地形と車両の作業だけを戻します。財布・建物・装備・現在の素材数は変えません。</p>
      <p>復元前の未保存作業も控えます。復元後に地形や車両の作業を変更するまでは、画面を開き直しても復元前へ戻せます。</p>
      <label>控えのファイル（32 MiBまで）<input data-earth-file type="file" accept=".json,application/json" aria-label="地形と作業の控えファイル"></label>
      <p class="we-earth-filename">ファイルは選択されていません。</p>
      <label>控えの文字列<textarea data-earth-text aria-label="地形と作業の控え文字列" rows="4" spellcheck="false"></textarea></label>
      <div class="we-backup-actions"><button data-earth-restore="inspect">ファイル・文字列を確認</button></div>
      <label>この端末の保存履歴<select data-earth-history aria-label="地形と作業の保存履歴"><option value="">履歴を選ぶ</option></select></label>
      <div class="we-backup-actions"><button data-earth-restore="history">選んだ履歴を確認</button><button data-earth-restore="undo">復元前の地形と作業を確認</button></div>
      <p class="we-earth-restore-status" role="status"></p><pre class="we-restore-comparison"></pre>
      <div class="we-backup-actions"><button data-earth-restore="apply" disabled>この地形と作業へ復元する</button><button data-earth-restore="retry" hidden>復元結果を再確認する</button><button data-earth-restore="close">閉じる（作業は一時停止のまま）</button></div>`;
    box.append(restorePanel);
  }
  panel.append(box);
  const q=s=>box.querySelector(s),save=q('[data-earth-save]'),exportButton=q('[data-earth-export]'),button=name=>q(`[data-earth-restore="${name}"]`),restorePanel=q('.we-earth-restore'),area=q('[data-earth-text]'),file=q('[data-earth-file]'),history=q('[data-earth-history]');
  if(area)area.maxLength=MAX_EARTH_RESTORE_INPUT;
  function invalidate(){token++;reviewed=false;if(session.live)session.clearRestore();if(restorePanel)q('.we-restore-comparison').textContent='';}
  function message(text){session.message=text;update();refresh();}
  function update(){
    const busy=session.busy||reading||applying,pending=!!session.restorePending,blocked=!!session.blocked;
    save.disabled=busy||opened||pending;exportButton.disabled=busy||pending;save.textContent=blocked?'保存の結果を再確認する':'世界と掘削を一緒に保存';q('.we-ledger-status').textContent=session.message;
    const s=session.summary;if(s){const c=s.counts;q('.we-ledger-detail').textContent=`世界の保存番号 ${session.raw?.generation??'準備中'}｜掘削の保存番号 ${s.revision}\n地形 ${c.terrain}・積載 ${c.bucket}・落下中 ${c.inFlight}・盛土 ${c.ground}・受け箱 ${c.bin}｜合計 ${c.total}\n原点 ${s.yardOrigin.join(', ')}｜一連の操作 ${s.sequence??'なし'}`;}
    if(!session.live)return;
    button('open').disabled=busy||!session.record||(blocked&&!pending)||opened;
    for(const name of ['inspect','undo'])button(name).disabled=busy||blocked||pending;
    button('history').disabled=busy||blocked||pending||history.value==='';
    button('apply').hidden=pending;button('apply').disabled=busy||blocked||pending||!reviewed;
    button('retry').hidden=!pending;button('retry').disabled=busy;
    button('close').disabled=session.busy||applying;
    area.disabled=file.disabled=history.disabled=busy||blocked||pending;
    q('.we-earth-restore-status').textContent=reading?'控えを確認しています…':session.message;
  }
  function describe(summary){const c=summary.counts;return `地形 ${c.terrain}／積載 ${c.bucket}／落下中 ${c.inFlight}／盛土 ${c.ground}／受け箱 ${c.bin}／合計 ${c.total}`;}
  function showComparison(result){
    reviewed=true;q('.we-restore-comparison').textContent=`現在：${describe(result.current)}\n復元後：${describe(result.next)}\n区画 ${result.next.site}｜原点 ${result.next.yardOrigin.join(', ')}\n一連の操作：${result.next.sequence?'途中の状態あり':'なし'}\n財布・建物・装備・現在の素材数はそのままです。`;
    message('内容を確認しました。「この地形と作業へ復元する」を押すまで変更しません。');
  }
  function close(){
    if(session.busy||applying)return;
    invalidate();opened=false;if(restorePanel)restorePanel.hidden=true;update();refresh();
  }
  save.onclick=async()=>{if(save.disabled)return;pause();invalidate();try{await session.save(snapshot());}catch(e){session.message=e.message;}update();refresh();};
  exportButton.onclick=()=>{
    if(exportButton.disabled)return;pause();
    try{const text=session.export(snapshot()),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=session.live?'imasora-world-earth-v497.json':'imasora-world-earth-check-v497.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);session.message=session.live?'世界の保存済み記録と未保存作業のダウンロードを要求しました。この画面で地形と作業を復元できます。端末の保存先を確認してください。':'世界の保存済み記録と未保存作業のダウンロードを要求しました。通常保存への読込みには使いません。';}
    catch(e){session.message=e.message;}update();refresh();
  };
  if(session.live){
    session.onRestored=next=>{replace(next);invalidate();};
    button('open').onclick=()=>{
      if(button('open').disabled)return;pause();invalidate();opened=true;restorePanel.hidden=false;historyRows=[];history.replaceChildren(new Option('履歴を選ぶ',''));
      let historyError='';try{historyRows=session.history();for(const [i,row]of historyRows.entries())history.add(new Option(row.label,String(i)));}
      catch(e){historyError=e.message;}
      if(session.restorePending)message('復元結果が未確認です。「復元結果を再確認する」を押してください。作業は一時停止しています。');
      else message(historyError||'控えのファイル・文字列・履歴から内容を確認してください。確認だけでは変更しません。作業は一時停止しています。');
      q('h3').focus({preventScroll:true});restorePanel.scrollIntoView({block:'nearest'});
    };
    area.oninput=()=>{invalidate();history.value='';message('文字列が変わりました。もう一度内容を確認してください。');};
    history.onchange=()=>{invalidate();message('選んだ履歴を確認してください。まだ復元していません。');};
    file.onchange=async()=>{
      invalidate();const id=token,selected=file.files?.[0];area.value='';history.value='';q('.we-earth-filename').textContent=selected?selected.name:'ファイルは選択されていません。';
      if(!selected){message('控えのファイルを選んでください。');return;}
      if(selected.size>MAX_EARTH_RESTORE_INPUT){message('32 MiB以下の控えを選んでください。現在の作業は保持しています。');return;}
      reading=true;readToken=id;update();
      try{const text=await selected.text();if(id!==token||!opened)return;if(new TextEncoder().encode(text).byteLength>MAX_EARTH_RESTORE_INPUT)throw Error('32 MiB以下の控えを選んでください。');area.value=text;session.message='ファイルを読み取りました。「ファイル・文字列を確認」を押してください。';}
      catch(e){if(id===token)session.message=e.message||'ファイルを読み取れませんでした。現在の作業は保持しています。';}
      finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
    };
    function inspect(text){invalidate();try{showComparison(session.inspectRestore(text,snapshot()));}catch(e){message(e.message);}}
    button('inspect').onclick=()=>{if(!button('inspect').disabled)inspect(area.value);};
    button('history').onclick=()=>{if(button('history').disabled)return;const row=historyRows[Number(history.value)];if(row)inspect(row.packet);};
    button('undo').onclick=async()=>{
      if(button('undo').disabled)return;invalidate();const id=token;reading=true;readToken=id;update();
      try{const result=await session.inspectUndo(snapshot());if(id!==token||!opened){session.clearRestore();return;}showComparison(result);}
      catch(e){if(id===token)session.message=e.message;}
      finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
    };
    async function applyRestore(){
      if(applying||session.busy||reading||(!reviewed&&!session.restorePending))return;
      pause();applying=true;update();
      try{await session.restorePrepared(snapshot());}
      catch(e){reviewed=false;session.message=e.message;}
      finally{applying=false;reviewed=false;update();refresh();}
    }
    button('apply').onclick=()=>{if(!button('apply').disabled)void applyRestore();};button('retry').onclick=()=>{if(!button('retry').disabled)void applyRestore();};button('close').onclick=close;
  }
  session.onChange=()=>{update();refresh();};update();return {update,close,get open(){return opened;}};
}

// Player-facing live save menu. The validation-world panel above stays separate.
function createPlayerEarthMenu({panel,session,snapshot,pause,replace,refresh}){
  let opened=false,screen='home',reading=false,readToken=null,applying=false,token=0,reviewed=false,historyRows=[],comparison=null;
  const menuButton=document.createElement('button');menuButton.className='we-game-menu-button';menuButton.dataset.earthMenu='open';menuButton.type='button';menuButton.textContent='メニュー';menuButton.setAttribute('aria-haspopup','dialog');menuButton.setAttribute('aria-expanded','false');
  panel.querySelector('header').append(menuButton);
  const box=document.createElement('section');box.className='we-ledger we-player-menu';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','we-player-menu-title');box.setAttribute('aria-describedby','we-player-menu-paused');
  box.innerHTML=`<div class="we-player-menu-card">
    <header class="we-player-menu-header"><div><p class="we-player-menu-eyebrow">ショベルカー</p><h2 id="we-player-menu-title" tabindex="-1">ゲームメニュー</h2></div><span class="we-player-pause-badge">一時停止中</span></header>
    <div class="we-player-menu-body">
      <section data-earth-screen="home" aria-label="保存と復元">
        <p class="we-player-menu-intro">地形とショベルの作業を保存して、続きから遊べます。</p>
        <div class="we-player-save-state"><strong data-earth-save-state></strong><p data-earth-saved-counts></p></div>
        <div class="we-player-menu-actions"><button data-earth-save type="button">作業を保存する</button><button data-earth-restore="open" type="button">地形と作業を復元</button><button data-earth-export type="button">控えをダウンロード</button></div>
        <p class="we-player-menu-note">復元は、戻す内容を確認してから行います。財布・建物・装備・購入した素材は現在のままです。</p>
      </section>
      <section data-earth-screen="choose" aria-label="戻したい保存を選ぶ" hidden>
        <p class="we-player-menu-intro">戻したい保存を選んで、内容を確認してください。この画面ではまだ復元しません。</p>
        <div class="we-player-choice"><h3>この端末の保存履歴から選ぶ</h3><label>戻したい保存<select data-earth-history aria-label="地形と作業の保存履歴"><option value="">履歴を選ぶ</option></select></label><p data-earth-history-empty hidden>まだ過去の保存はありません。以前ダウンロードした控えがあれば、下から選べます。</p><button data-earth-restore="history" type="button">選んだ保存の内容を確認</button></div>
        <details class="we-player-file-choice"><summary>控えのファイルから選ぶ</summary><label>地形の控え（32 MiBまで）・一括控え（64 MiBまで）<input data-earth-file type="file" accept=".json,application/json" aria-label="地形と作業の控えファイル"></label><p class="we-earth-filename">ファイルは選択されていません。</p><button data-earth-restore="file" type="button">ファイルの内容を確認</button></details>
        <details class="we-player-advanced"><summary>控えの文字列を貼り付ける</summary><label>控えの文字列<textarea data-earth-text aria-label="地形と作業の控え文字列" rows="4" spellcheck="false"></textarea></label><button data-earth-restore="inspect" type="button">文字列の内容を確認</button></details>
        <div class="we-player-undo"><button data-earth-restore="undo" type="button">直前の復元を取り消す内容を確認</button><p>復元後に作業を進める前なら、復元直前の状態へ戻せます。</p></div>
      </section>
      <section data-earth-screen="review" aria-label="復元する内容の確認" hidden>
        <p class="we-player-menu-intro" data-earth-review-intro>下の内容へ地形とショベルの作業を戻します。</p>
        <div class="we-player-comparison"><table><caption>土の状態</caption><thead><tr><th scope="col">場所</th><th scope="col">現在</th><th scope="col">復元後</th></tr></thead><tbody data-earth-comparison></tbody></table></div>
        <p data-earth-bundle-source hidden></p><p data-earth-sequence></p><p class="we-player-preserve">財布・建物・UFO装備・素材・ゲームセンターの記録・他の車両は変更しません。</p>
        <p class="we-player-menu-note">今の未保存作業も、復元直前の控えとして残します。復元後に作業を進める前なら、取り消すことができます。</p>
      </section>
      <p class="we-ledger-status we-earth-restore-status" role="status" aria-live="polite"></p>
    </div>
    <footer class="we-player-menu-footer"><div class="we-player-menu-footer-actions"><button data-earth-menu="back" type="button" hidden>メニューに戻る</button><button data-earth-restore="apply" class="we-player-confirm" type="button" hidden>復元する</button><button data-earth-restore="retry" type="button" hidden>復元結果を再確認する</button><button data-earth-menu="close" type="button">ゲームに戻る</button></div><p id="we-player-menu-paused">画面へ戻っても一時停止のままです。「再開」で作業を続けます。</p></footer>
  </div>`;
  panel.append(box);
  const q=selector=>box.querySelector(selector),button=name=>q(`[data-earth-restore="${name}"]`),save=q('[data-earth-save]'),exportButton=q('[data-earth-export]'),area=q('[data-earth-text]'),file=q('[data-earth-file]'),history=q('[data-earth-history]'),back=q('[data-earth-menu="back"]'),closeButton=q('[data-earth-menu="close"]'),heading=q('h2');
  area.maxLength=MAX_EARTH_BUNDLE_RESTORE_INPUT;
  let fileText='',notice='';
  function invalidate(){token++;reviewed=false;comparison=null;session.clearRestore();}
  // Keep the read barrier until the canceled promise settles: a late undo
  // inspection must not replace or clear a newer restore plan.
  function cancelRead(){token++;}
  function friendlyMessage(text){return String(text||'').replace(/^世界と掘削を保存 \d+ に同時保存しました。/,'地形とショベルの作業を保存しました。').replace(/^世界の保存 \d+ から掘削作業を一時停止で読み込みました。/,'前回保存した地形とショベルの作業を読み込みました。');}
  function message(text){notice=friendlyMessage(text);update();refresh();}
  function focusHeading(){heading.focus({preventScroll:true});q('.we-player-menu-body').scrollTop=0;}
  function transition(next){screen=next;update();refresh();focusHeading();}
  function update(){
    const busy=session.busy||reading||applying,pending=!!session.restorePending,blocked=!!session.blocked,lockedNavigation=session.busy||applying||pending;
    menuButton.setAttribute('aria-expanded',String(opened));box.hidden=!opened;
    for(const section of box.querySelectorAll('[data-earth-screen]'))section.hidden=section.dataset.earthScreen!==screen;
    heading.textContent=screen==='home'?'ゲームメニュー':screen==='choose'?'地形と作業を復元':'この内容で復元しますか？';
    save.disabled=busy||pending;save.textContent=blocked?'保存の結果を再確認する':'作業を保存する';exportButton.disabled=busy||pending;
    button('open').disabled=busy||!session.record||blocked||pending;
    for(const name of ['inspect','file','undo'])button(name).disabled=busy||blocked||pending;
    button('inspect').disabled ||= !area.value.trim();button('file').disabled ||= !fileText;
    button('history').disabled=busy||blocked||pending||history.value==='';
    button('apply').hidden=screen!=='review'||pending||!reviewed;button('apply').disabled=busy||blocked||pending||!reviewed;
    button('apply').textContent=comparison?.sourceKind==='before-restore'?'復元前に戻す':'復元する';
    button('retry').hidden=!pending;button('retry').disabled=busy;
    back.hidden=screen==='home'||pending;back.disabled=lockedNavigation;back.textContent=screen==='review'?'選び直す':'メニューに戻る';closeButton.disabled=lockedNavigation;
    area.disabled=file.disabled=history.disabled=busy||blocked||pending;
    q('.we-ledger-status').textContent=reading?'控えの内容と照合値を確認しています…':applying||session.busy?friendlyMessage(session.message):notice;
    if(opened){
      let dirty=false;try{dirty=!!session.record&&session.dirty(snapshot());}catch{dirty=true;}
      q('[data-earth-save-state]').textContent=session.busy?'保存を確認しています…':pending?'復元結果の確認が必要です':blocked?'保存結果の確認が必要です':!session.record?'地形を準備しています':dirty?'未保存の作業があります':'作業は保存されています';
      const counts=session.summary?.counts;q('[data-earth-saved-counts]').textContent=counts?`保存した土：地形 ${counts.terrain}個・バケット ${counts.bucket}個・盛土 ${counts.ground}個`:'地形の準備が終わると、保存と復元を使えます。';
    }
  }
  function paintComparison(result){
    const rows=[['terrain','地形の土'],['bucket','バケット'],['ground','盛土'],['bin','受け箱'],['inFlight','落下中'],['total','土の合計']];
    const tbody=q('[data-earth-comparison]');tbody.replaceChildren();
    for(const [key,label]of rows){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const value of[result.current.counts[key],result.next.counts[key]]){const td=document.createElement('td');td.textContent=`${value}個`;tr.append(td);}tbody.append(tr);}
    q('[data-earth-sequence]').textContent=result.next.sequence?'ショベルの一連の動作も、途中の状態から再開できます。':'ショベルの位置・姿勢も、選んだ保存の状態へ戻ります。';
    q('[data-earth-review-intro]').textContent=result.sourceKind==='before-restore'?'直前の復元を取り消し、復元前の地形とショベルの作業へ戻します。':result.sourceKind==='recovery-bundle'?'一括控えから地形とショベルのみを復元します。':'下の内容へ地形とショベルの作業を戻します。';
    const source=q('[data-earth-bundle-source]');source.hidden=result.sourceKind!=='recovery-bundle';source.textContent=result.sourceKind==='recovery-bundle'&&result.source?.capturedAt?`一括控えの取得日時：${new Date(result.source.capturedAt).toLocaleString('ja-JP')}`:'';
  }
  function showComparison(result){comparison=result;reviewed=true;paintComparison(result);notice='内容を確認し、よければ下のボタンで復元してください。まだ変更していません。';transition('review');}
  function loadHistory(){
    historyRows=[];history.replaceChildren(new Option('履歴を選ぶ',''));
    try{historyRows=session.history();for(const [i,row]of historyRows.entries())history.add(new Option(row.label,String(i)));}
    catch(e){notice=friendlyMessage(e.message);}
    q('[data-earth-history-empty]').hidden=historyRows.length>0;
  }
  function close(){
    if(session.busy||applying||session.restorePending)return false;
    cancelRead();invalidate();opened=false;screen='home';update();refresh();menuButton.focus({preventScroll:true});return true;
  }
  function goBack(){
    if(session.busy||applying||session.restorePending)return;
    cancelRead();invalidate();notice='まだ復元していません。現在の作業を保持しています。';
    if(screen==='review'){loadHistory();transition('choose');}else transition('home');
  }
  menuButton.onclick=()=>{
    if(opened)return;pause();invalidate();opened=true;notice='作業を一時停止しています。保存や復元が終わったら、ゲームに戻れます。';
    screen=session.restorePending?'review':'home';
    if(session.restorePending){notice='復元結果が未確認です。「復元結果を再確認する」を押してください。現在の作業を保持して停止しています。';const p=session.pending;if(p?.before?.counts&&p.expected?.counts)paintComparison({current:p.before,next:p.expected,sourceKind:p.sourceKind,source:p.source});}
    update();refresh();focusHeading();
  };
  save.onclick=async()=>{if(save.disabled)return;pause();invalidate();try{await session.save(snapshot());notice=friendlyMessage(session.message);}catch(e){notice=friendlyMessage(e.message);}update();refresh();};
  exportButton.onclick=()=>{
    if(exportButton.disabled)return;pause();
    try{const text=session.export(snapshot()),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-world-earth-v501.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);notice='控えのダウンロードを開始しました。端末の保存先を確認してください。このメニューから地形と作業を復元できます。';}
    catch(e){notice=friendlyMessage(e.message);}update();refresh();
  };
  button('open').onclick=()=>{if(button('open').disabled)return;invalidate();notice='戻したい保存を選んでください。内容の確認だけでは復元しません。';loadHistory();transition('choose');};
  area.oninput=()=>{invalidate();message('文字列が変わりました。内容を確認してください。まだ復元していません。');};
  history.onchange=()=>{invalidate();message('選んだ保存の内容を確認してください。まだ復元していません。');};
  file.onchange=async()=>{
    invalidate();const id=token,selected=file.files?.[0];fileText='';q('.we-earth-filename').textContent=selected?selected.name:'ファイルは選択されていません。';
    if(!selected){message('控えのファイルを選んでください。');return;}
    if(selected.size>MAX_EARTH_BUNDLE_RESTORE_INPUT){message('64 MiB以下の控えを選んでください。現在の作業は保持しています。');return;}
    reading=true;readToken=id;update();
    try{const text=await selected.text();if(id!==token||!opened||screen!=='choose')return;if(new TextEncoder().encode(text).byteLength>MAX_EARTH_BUNDLE_RESTORE_INPUT)throw Error('64 MiB以下の控えを選んでください。');fileText=text;notice='ファイルを読み取りました。「ファイルの内容を確認」を押してください。';}
    catch(e){if(id===token)notice=friendlyMessage(e.message||'ファイルを読み取れませんでした。現在の作業は保持しています。');}
    finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
  };
  async function inspect(text){
    if(reading||session.busy||applying)return;invalidate();const id=token;reading=true;readToken=id;update();
    try{const current=snapshot(),signature=session.signature(current),result=await session.inspectRestoreInput(text,current,{isCurrent:()=>id===token&&opened&&screen==='choose'&&session.signature(snapshot())===signature});if(id!==token||!opened||screen!=='choose')return;showComparison(result);}
    catch(e){if(id===token)notice=friendlyMessage(e.message);}
    finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
  }
  button('inspect').onclick=()=>{if(!button('inspect').disabled)inspect(area.value);};button('file').onclick=()=>{if(!button('file').disabled)inspect(fileText);};
  button('history').onclick=()=>{if(button('history').disabled)return;const row=historyRows[Number(history.value)];if(row)inspect(row.packet);};
  button('undo').onclick=async()=>{
    if(button('undo').disabled)return;invalidate();const id=token;reading=true;readToken=id;update();
    try{const result=await session.inspectUndo(snapshot());if(id!==token||!opened||screen!=='choose')return;showComparison(result);}
    catch(e){if(id===token)notice=friendlyMessage(e.message);}
    finally{if(readToken===id){reading=false;readToken=null;update();refresh();}}
  };
  async function applyRestore(){
    if(applying||session.busy||reading||(!reviewed&&!session.restorePending))return;
    pause();applying=true;update();
    try{const restored=await session.restorePrepared(snapshot());notice=friendlyMessage(session.message);if(restored)screen='home';else if(!session.restorePending)screen='choose';}
    catch(e){notice=friendlyMessage(e.message);if(!session.restorePending)screen='choose';}
    finally{applying=false;reviewed=false;update();refresh();focusHeading();}
  }
  button('apply').onclick=()=>{if(!button('apply').disabled)void applyRestore();};button('retry').onclick=()=>{if(!button('retry').disabled)void applyRestore();};back.onclick=goBack;closeButton.onclick=close;
  session.onRestored=next=>{replace(next);invalidate();};
  session.onChange=()=>{if(opened&&session.message)notice=friendlyMessage(session.message);update();refresh();};
  function handleKeyDown(event){
    if(!opened)return false;
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();if(screen==='home')close();else goBack();return true;}
    if(event.key==='Tab'){
      const focusable=[...box.querySelectorAll('button,input,textarea,select,summary,[tabindex]')].filter(element=>!element.disabled&&element.tabIndex>=0&&element.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1),current=document.activeElement;
      if(!first){event.preventDefault();heading.focus({preventScroll:true});}
      else if(event.shiftKey&&(current===first||!focusable.includes(current))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(current===last||!focusable.includes(current))){event.preventDefault();first.focus();}
    }
    return true;
  }
  update();return {detached:true,update,close,handleKeyDown,get open(){return opened;}};
}
