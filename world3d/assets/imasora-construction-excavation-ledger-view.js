import {LEDGER_RESTORE_LIMIT} from './imasora-construction-excavation-ledger-recovery.js';
// Same isolated record as v484; never copies a loan or touches ordinary saves.
export function createExcavationLedgerView({panel,session,snapshot,pause,replace,refresh}){
  let open=false,reading=false,token=0,reviewed=false;
  const box=document.createElement('section');box.className='we-ledger';box.setAttribute('aria-label','掘削の接続確認用保存');
  box.innerHTML=`<p>土の保存・再開の接続確認。通常の所持品は変わりません。</p><div><button data-ledger="save">一時停止して保存</button><button data-ledger="export">接続確認の記録を書き出す</button><button data-ledger="restore">保存した作業を読み戻す</button></div><p class="we-ledger-status" role="status"></p><pre class="we-ledger-detail" style="white-space:pre-wrap;font-size:11px"></pre>
    <section class="we-ledger-restore" aria-label="保存した掘削作業の復元" hidden>
      <h3>保存した作業を読み戻す</h3><p>同じ保存元・区画の記録だけを読み戻します。内容確認だけでは作業は変わりません。復元前の未保存作業も控えるので、再読み込み後でも戻せます。</p>
      <label>記録ファイル（64 MiBまで）<input type="file" accept=".json,application/json" aria-label="掘削記録ファイル"></label>
      <label>記録の文字列<textarea aria-label="掘削記録の文字列" rows="4" spellcheck="false" style="width:100%;box-sizing:border-box"></textarea></label>
      <label>保存の履歴<select aria-label="掘削の保存履歴"><option value="">履歴を選ぶ</option></select></label>
      <div><button data-ledger="inspect">内容を確認</button><button data-ledger="undo">復元前の作業を確認</button></div>
      <pre class="we-ledger-comparison" style="white-space:pre-wrap;font-size:12px"></pre>
      <div><button data-ledger="apply" disabled>この内容で復元する</button><button data-ledger="close">閉じる</button></div>
    </section>`;
  panel.append(box);const q=s=>box.querySelector(s),button=k=>q(`[data-ledger="${k}"]`),area=q('textarea'),file=q('input'),history=q('select');area.maxLength=LEDGER_RESTORE_LIMIT;
  function invalidate(){token++;reviewed=false;session.clearRestore();q('.we-ledger-comparison').textContent='';button('apply').disabled=true;}
  function message(text){session.message=text;update();refresh();}
  function update(){
    const busy=session.busy||reading,blocked=session.blocked||!!session.pending||!!session.pendingRestore;
    button('save').disabled=busy||!session.record;button('export').disabled=busy||!session.record;
    button('save').textContent=session.pendingRestore?'復元の結果を再確認する':session.blocked?'保存の結果を再確認する':'一時停止して保存';
    button('restore').disabled=busy||!session.record||blocked;button('apply').disabled=busy||blocked||!reviewed;
    for(const name of ['inspect','undo'])button(name).disabled=busy||blocked;
    button('close').disabled=session.busy;area.disabled=file.disabled=history.disabled=busy||blocked;
    q('.we-ledger-status').textContent=session.message;
    const s=session.summary;if(s){const t=s.counts;q('.we-ledger-detail').textContent=`最後の記録｜地形 ${t.terrain}・積載 ${t.bucket}・落下中 ${t.inFlight}・盛土 ${t.ground}・受け箱 ${t.bin}｜合計 ${t.total}\n区画 ${session.record.site}｜原点 ${session.record.yardOrigin.join(', ')}\n保存番号 ${session.raw?.generation??'未保存'}｜一連の操作 ${session.record.excavation.sequence?.phase??'なし'}`;}
  }
  function describe(s){const t=s.counts;return `地形 ${t.terrain}／積載 ${t.bucket}／落下中 ${t.inFlight}／盛土 ${t.ground}／受け箱 ${t.bin}／合計 ${t.total}`;}
  function showComparison(result){reviewed=true;q('.we-ledger-comparison').textContent=`現在：${describe(result.current)}\n復元後：${describe(result.next)}\n原点 ${result.next.yardOrigin.join(', ')}\n作業途中：${result.next.sequence?'保存あり':'なし'}\n現在の作業も控えてから復元します。`;message('内容を確認しました。「この内容で復元する」で入れ替えます。');}
  function close(){invalidate();open=false;reading=false;q('.we-ledger-restore').hidden=true;update();refresh();}
  session.onChange=()=>{update();refresh();};
  button('save').onclick=async()=>{pause();invalidate();try{if(session.pendingRestore)replace(await session.retryRestore());else await session.save(snapshot());}catch(e){session.message=e.message;}update();refresh();};
  button('export').onclick=()=>{
    pause();try{const text=session.export(snapshot()),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-excavation-validation-v493.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);message('記録のダウンロードを要求しました。端末の保存先を確認してください。通常セーブ・旧v3とは別形式です。');}
    catch(e){message(e.message);}
  };
  button('restore').onclick=()=>{
    pause();invalidate();open=true;q('.we-ledger-restore').hidden=false;
    history.replaceChildren(new Option('履歴を選ぶ',''));for(const [i] of(session.raw?.backups??[]).entries())history.add(new Option(`${i+1}つ前の保存`,String(i)));
    message('復元するファイル・文字列・履歴を選び、内容を確認してください。作業は一時停止しています。');area.focus();
  };
  area.oninput=()=>{invalidate();message('内容が変わりました。もう一度確認してください。');};
  history.onchange=()=>{invalidate();if(history.value!==''){area.value=session.raw.backups[Number(history.value)];message('履歴を表示しました。内容を確認してください。');}};
  file.onchange=async()=>{
    invalidate();const id=token,selected=file.files?.[0];if(!selected)return;
    if(selected.size>LEDGER_RESTORE_LIMIT){message('64 MiB以下の記録を選んでください。');return;}
    reading=true;update();try{const text=await selected.text();if(id!==token||!open)return;area.value=text;message('ファイルを読み取りました。内容を確認してください。');}
    catch(e){if(id===token)message('ファイルを読み取れませんでした。現在の作業は保持しています。');}
    finally{if(id===token){reading=false;update();}}
  };
  button('inspect').onclick=()=>{invalidate();try{showComparison(session.prepareRestore(area.value,snapshot()));}catch(e){message(e.message);}};
  button('undo').onclick=async()=>{
    invalidate();const id=token;reading=true;update();try{const result=await session.prepareUndo(snapshot());if(id!==token||!open){session.clearRestore();return;}showComparison(result);}
    catch(e){if(id===token)message(e.message);}finally{if(id===token){reading=false;update();}}
  };
  button('apply').onclick=async()=>{
    pause();try{const restored=await session.applyRestore(snapshot());replace(restored);invalidate();}
    catch(e){reviewed=false;session.message=e.message;}update();refresh();
  };
  button('close').onclick=close;
  return {update,close,get open(){return open;}};
}
