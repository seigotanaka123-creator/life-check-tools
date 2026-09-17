// A UI adapter for the separate persistence rehearsal. No ordinary save writes.
export function createExcavationLedgerView({panel,session,snapshot,pause,refresh}){
  const box=document.createElement('section');box.className='we-ledger';box.setAttribute('aria-label','掘削の接続確認用保存');
  box.innerHTML=`<p>土の保存・再開の接続確認。検証用の地形から始め、通常の所持品は変わりません。</p><div><button data-ledger="save">一時停止して保存</button><button data-ledger="export">接続確認の記録を書き出す</button></div><p class="we-ledger-status" role="status"></p><pre class="we-ledger-detail" style="white-space:pre-wrap;font-size:11px"></pre>`;
  panel.append(box);const button=k=>box.querySelector(`[data-ledger="${k}"]`);
  function update(){
    button('save').disabled=session.busy||!session.record;button('export').disabled=session.busy||!session.record;
    button('save').textContent=session.blocked?'保存の結果を再確認する':'一時停止して保存';
    box.querySelector('.we-ledger-status').textContent=session.message;
    const s=session.summary;if(s){const t=s.counts;box.querySelector('.we-ledger-detail').textContent=`最後の記録｜地形 ${t.terrain}・積載 ${t.bucket}・落下中 ${t.inFlight}・盛土 ${t.ground}・受け箱 ${t.bin}｜合計 ${t.total}\n取得元：検証用地形 fixturecontact-v1｜区画 ${session.record.site}｜原点 ${session.record.yardOrigin.join(', ')}\n保存番号 ${session.raw?.generation??'未保存'}｜一連の操作 ${session.record.excavation.sequence?.phase??'なし'}`;}
  }
  session.onChange=()=>{update();refresh();};
  button('save').onclick=async()=>{pause();try{await session.save(snapshot());}catch(e){session.blocked=true;session.message=e.message;}update();refresh();};
  button('export').onclick=()=>{
    pause();try{const text=session.export(snapshot()),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-excavation-validation-v485.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);session.message='接続確認用の記録のダウンロードを要求しました。端末の保存先を確認してください。通常セーブ・旧v3とは別形式です。';}
    catch(e){session.message=e.message;}update();refresh();
  };
  return {update};
}
