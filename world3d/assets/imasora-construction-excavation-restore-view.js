import {packExcavation} from './imasora-construction-excavator-save.js';
import {ContactPreviewRestore,PREVIEW_IMPORT_LIMIT} from './imasora-construction-excavation-compatibility.js';

// Lives inside the existing preview controls. Opening or inspecting never
// replaces work; only the explicit apply button does. No persistent storage.
export function createContactRestoreView({panel,current,site,pause,replace,onClose}){
  const session=new ContactPreviewRestore();let open=false,readToken=0;
  const box=document.createElement('section');box.className='we-restore';box.hidden=true;
  box.setAttribute('role','dialog');box.setAttribute('aria-label','掘削作業のバックアップ');
  box.innerHTML=`<h3>掘削作業のバックアップ</h3>
    <p>v3の接触掘削を、この練習区画へ戻します。通常セーブ・旧v1/v2とは別です。一連の操作の予約はJSONに含めず、現在の姿勢・土・すくい込み／排土の途中を保存します。復元後、必要なら「すくう」で一連の操作を始め直してください。タブを閉じる・再読込後はこの画面の控えも消えるため、必要な作業はJSONで保管してください。</p>
    <div class="we-backup-actions"><button data-restore="export">今の作業を文字列で表示</button><button data-restore="undo">復元前の作業を確認</button><button data-restore="before-export">復元前の控えを文字列で表示</button></div>
    <label>作業JSONファイル（2 MiBまで）<input type="file" accept=".json,application/json"></label>
    <label>作業JSON文字列<textarea rows="4" spellcheck="false"></textarea></label>
    <div class="we-backup-actions"><button data-restore="inspect">内容を確認</button><button data-restore="download">表示中のJSONをダウンロード</button></div>
    <p class="we-restore-status" role="status"></p><pre class="we-restore-comparison"></pre>
    <div class="we-backup-actions"><button data-restore="apply" disabled>この練習区画へ復元する</button><button data-restore="close">閉じる（作業は一時停止のまま）</button></div>`;
  panel.append(box);const q=s=>box.querySelector(s),button=a=>q(`[data-restore="${a}"]`),text=q('textarea'),status=q('.we-restore-status'),comparison=q('.we-restore-comparison');
  text.setAttribute('aria-label','作業JSON文字列');text.maxLength=PREVIEW_IMPORT_LIMIT;
  const message=s=>{status.textContent=s;};
  function clear(){readToken++;session.clear();button('apply').disabled=true;comparison.textContent='';}
  function controls(){button('undo').disabled=!session.hasBefore;button('before-export').disabled=!session.hasBefore;}
  function showText(value){clear();text.value=value;message('文字列を表示しました。ダウンロードまたはコピーして保管できます。表示だけでは復元しません。');}
  const describe=t=>`地形 ${t.terrain}／積載 ${t.bucket}／落下中 ${t.inFlight}／地面の排土 ${t.ground}／受け箱 ${t.bin}／合計 ${t.total}`;
  function inspect(){
    clear();try{const r=session.prepare(text.value,current(),site());comparison.textContent=`現在：${describe(r.current)}\n復元先：${describe(r.next)}\n区画原点 X ${r.origin[0]} / Z ${r.origin[2]}（位置を丸めません）\n乗降：${r.transition?'途中から再開':'途中動作なし'}／車両：${({foot:'徒歩',boarding:'乗車中',driving:'着席・走行',working:'掘削作業',exiting:'降車中'})[r.mode]??r.mode}／機械動作：${({scoop:'すくい込み途中',dump:'排土途中'})[r.action]??'停止'}\n確認後、下の復元ボタンで入れ替えます。`;
      message('内容を確認しました。現在の作業をこの画面内に控えてから復元します。通常保存には追加しません。');button('apply').disabled=false;
    }catch(e){message(e.message);}
  }
  text.addEventListener('input',()=>{clear();message('文字列が変わりました。「内容を確認」を押してください。');});
  q('input').addEventListener('change',async()=>{
    clear();const id=readToken,file=q('input').files?.[0];if(!file)return;
    if(file.size>PREVIEW_IMPORT_LIMIT){message('作業JSONは2 MiB以下で読み込んでください。');return;}
    try{const value=await file.text();if(!open||id!==readToken)return;text.value=value;message('ファイルを読み取りました。「内容を確認」を押してください。');}
    catch{if(open&&id===readToken)message('ファイルを読めませんでした。現在の作業は保持しています。');}
  });
  button('export').onclick=()=>{try{showText(JSON.stringify(packExcavation(current()),null,2));}catch(e){message(e.message);}};
  button('before-export').onclick=()=>{try{showText(session.beforeText());}catch(e){message(e.message);}};
  button('undo').onclick=()=>{try{text.value=session.beforeText();inspect();}catch(e){message(e.message);}};
  button('inspect').onclick=inspect;
  button('apply').onclick=()=>{
    try{const next=session.apply(current(),site());replace(next);clear();controls();message('この練習区画へ復元しました。一時停止中です。直前の作業は「復元前の作業を確認」から戻せます。再読込前に必要な控えを書き出してください。');}
    catch(e){clear();message(e.message);}
  };
  button('download').onclick=()=>{
    try{
      // Validate without disturbing the selected candidate or applying it.
      const check=new ContactPreviewRestore();check.prepare(text.value,current(),site());
      const url=URL.createObjectURL(new Blob([text.value],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-contact-excavation-v3.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
      message('JSONのダウンロードを要求しました。端末の保存先を確認してください。通常保存済みではありません。');
    }catch(e){message(e.message);}
  };
  function close(){clear();open=false;box.hidden=true;onClose();}
  button('close').onclick=close;
  return {get open(){return open;},get hasBefore(){return session.hasBefore;},close,show({exportCurrent=false}={}){pause();clear();open=true;box.hidden=false;controls();message('現在の作業を一時停止しました。復元する作業JSONの内容を確認してください。');if(exportCurrent)button('export').onclick();text.focus();}};
}
