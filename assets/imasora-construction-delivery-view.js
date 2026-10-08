import * as THREE from './three.module.min.js';
import {SHOP_OFFERS} from './imasora-mars-construction-shop.js?v=503';
import {deliveryAccess} from './imasora-construction-delivery.js';
import {toolkitSummary,toolkitDetails} from './imasora-construction-toolkit.mjs?v=120c';
import {deliveryConcreteSummary} from './imasora-construction-concrete/delivery-summary.mjs';

export function createConstructionDeliveryDock(){
  const root=new THREE.Group();root.name='construction-delivery-dock';
  const metal=new THREE.MeshStandardMaterial({color:0x254d59,roughness:.72,metalness:.25});
  const rim=new THREE.MeshStandardMaterial({color:0xe4bd68,roughness:.65});
  const wood=new THREE.MeshStandardMaterial({color:0x916349,roughness:.88});
  function box(name,size,pos,material){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
  box('receiving-counter',[38,18,22],[0,9,0],metal);
  box('counter-top',[38,2,22],[0,19,0],rim);
  for(const x of [-17,17])box('sign-post',[1.4,14,1.4],[x,27,-8],metal);
  box('stored-crate',[12,9,11],[-9,24.5,0],wood);
  for(const x of [-13,-5])box('crate-strap',[1,9.2,11.2],[x,24.5,0],rim);
  box('sealed-water-can',[8,10,8],[9,25,0],metal);
  box('water-can-cap',[4,1,4],[9,30.5,0],rim);
  const c=document.createElement('canvas');c.width=768;c.height=192;
  const ctx=c.getContext('2d');ctx.fillStyle='#15383e';ctx.fillRect(0,0,768,192);ctx.strokeStyle='#f5cb76';ctx.lineWidth=8;ctx.strokeRect(4,4,760,184);ctx.fillStyle='#fff2c8';ctx.textAlign='center';ctx.font='bold 72px sans-serif';ctx.fillText('建材受取所',384,86);ctx.font='38px sans-serif';ctx.fillText('購入品を保管 · 触れて開く',384,152);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const signMaterial=new THREE.MeshBasicMaterial({map:texture});
  for(const side of [-1,1]){const sign=new THREE.Mesh(new THREE.PlaneGeometry(36,9),signMaterial);sign.position.set(0,29.5,-8+side*.8);sign.rotation.y=side<0?Math.PI:0;root.add(sign);}
  return root;
}

const amountText=(id,n)=>id==='mars-water'?`${n/1000} L`:id==='mars-soil'?`${n/1000}ブロック`:`${n/26880}枚分`;
export function createConstructionDeliveryMenu({service,context,snapshot,onOpen=()=>{},onClose=()=>{}}){
  const dialog=document.createElement('dialog');dialog.className='construction-delivery-menu';dialog.setAttribute('aria-labelledby','delivery-title');
  dialog.innerHTML=`<header><span class="delivery-crest" aria-hidden="true">▤</span><div><small>工事現場の保管庫</small><h2 id="delivery-title">建材受取所</h2></div><button type="button" class="delivery-close" aria-label="受取所を閉じる">閉じる</button></header>
    <div class="delivery-body">
    <p class="delivery-intro">おかえりなさい！<br>火星で買った建材を、ここで大切に保管します。</p>
    <p class="delivery-mode"></p><div class="delivery-stock-list"></div>
    <section class="delivery-pack-transfer" aria-labelledby="pack-transfer-title">
      <h3 id="pack-transfer-title">開封済み建築セットを受け取る</h3>
      <p>散歩・大会・ゲームで獲得した箱をホームの街づくり工房で開封し、ここに表示する受取IDを移送先に指定して作ったJSONファイルを選んでください。受取記録はこのゲームのセーブデータに保存されます。</p>
      <div class="delivery-pack-profile"><span>このセーブデータの受取ID</span><code data-pack-transfer-profile></code><button type="button" data-pack-transfer-copy>受取IDをコピー</button></div>
      <p class="delivery-pack-stock" data-pack-transfer-stock></p>
      <details><summary>基本道具一式</summary><p data-toolkit-summary></p><p data-toolkit-detail style="white-space:pre-line"></p><p>最初の建築セットと一緒に受け取れます。シャベルで土を運び、型紙で模様を塗れます。道具は繰り返し使えます。同じファイルを選び直しても増えません。</p></details>
      <label class="delivery-pack-file">移送ファイル<input type="file" accept=".json,application/json" data-pack-transfer-file></label>
      <p class="delivery-pack-message" role="status" aria-live="polite" data-pack-transfer-message></p>
    </section>
    <section class="delivery-project" aria-labelledby="concrete-project-title">
      <h3 id="concrete-project-title">受取済みの配合材料を工房へ移す</h3>
      <p>1箱に、生コン8杯分のセメント・砂・砂利・水が入っています。工房へ移した材料をミキサーで練り、バケツで型枠へ運びます。塗装・付属品は別に保管されます。</p>
      <p class="delivery-project-stock" data-concrete-project-stock></p>
      <label class="delivery-project-select">施工台帳へ移す受取分
        <select data-concrete-pack-select aria-label="施工台帳へ移す建築セット"></select>
      </label>
      <button type="button" data-concrete-pack-import>選んだ材料を工房へ移す</button>
      <p class="delivery-project-message" role="status" aria-live="polite" data-concrete-project-message></p>
    </section>
    <p class="delivery-message" role="status" aria-live="polite"></p>
    <p class="delivery-help">保管した火星水は給水ローダー、火星土は土ローダー、火星木材は木材クレーンの区画で使えます。</p>
    </div>
    <footer><p>購入済みの分だけを保管します。<br>ここでは金貨を使いません。</p><button type="button" class="delivery-return">ゲームに戻る</button></footer>`;
  document.body.append(dialog);
  let working=false,opening=false,success='';
  const closeButton=dialog.querySelector('.delivery-close'),returnButton=dialog.querySelector('.delivery-return'),message=dialog.querySelector('.delivery-message');
  const transferInput=dialog.querySelector('[data-pack-transfer-file]'),transferMessage=dialog.querySelector('[data-pack-transfer-message]');
  const projectSelect=dialog.querySelector('[data-concrete-pack-select]'),projectImport=dialog.querySelector('[data-concrete-pack-import]'),projectMessage=dialog.querySelector('[data-concrete-project-message]');
  let projectSuccess='';
  const rows=SHOP_OFFERS.map(o=>{
    const row=document.createElement('article');row.className=`delivery-stock ${o.look}`;
    row.innerHTML=`<span class="delivery-material" aria-hidden="true"><i></i></span><div class="delivery-stock-info"><h3>${o.name}</h3><p>未受取 <b class="delivery-unreceived"></b><span>保管中 <b class="delivery-stored"></b></span></p></div><button type="button">${amountText(o.id,o.amount)}を保管</button>`;
    const button=row.querySelector('button');
    button.addEventListener('click',async()=>{
      if(working||service.busy||service.blocked)return;
      working=true;success='';refresh();
      try{
        await service.receiveConstruction(o.id,1,`delivery-${crypto.randomUUID()}`,context(),snapshot());
        success=`${o.name} ${amountText(o.id,o.amount)}を保管しました！`;
        row.classList.remove('received');void row.offsetWidth;row.classList.add('received');
      }catch(e){success=e.message;}
      finally{working=false;refresh();}
    });
    dialog.querySelector('.delivery-stock-list').append(row);return{o,row,button};
  });
  function refresh(){
    if(!dialog.open)return;
    const stock=service.constructionStock,near=deliveryAccess(context());
    closeButton.disabled=returnButton.disabled=working||opening||service.busy;
    for(const {o,row,button}of rows){
      row.querySelector('.delivery-unreceived').textContent=amountText(o.id,stock?.unreceived[o.id]??0);
      row.querySelector('.delivery-stored').textContent=amountText(o.id,stock?.stored[o.id]??0);
      if(o.id==='mars-water'&&stock?.inUse?.['mars-water'])row.querySelector('.delivery-stored').textContent+=`（ほか作業中 ${amountText(o.id,stock.inUse['mars-water'])}）`;
      button.disabled=opening||working||service.busy||service.blocked||service.mode==='readonly'||!near||!!service.shopState?.pending||(stock?.unreceived[o.id]??0)<o.amount;
    }
    const profileId=service.constructionTransferProfileId;
    dialog.querySelector('[data-pack-transfer-profile]').textContent=profileId??'保存読込後に表示';
    const trial=service.constructionPackTrialStock;
    dialog.querySelector('[data-toolkit-summary]').textContent=toolkitSummary(service.constructionToolkit);
    dialog.querySelector('[data-toolkit-detail]').textContent=toolkitDetails(service.constructionToolkit);
    const q=trial?.quantities;
    dialog.querySelector('[data-pack-transfer-stock]').textContent=q
      ? `受取記録：コンクリート ${q.concreteBlockCredits}杯相当 / 塗装面 ${q.paintSurfaceCredits}面相当 / 型枠 ${q.auxiliaryUnits.formwork} / 鉄筋 ${q.auxiliaryUnits.rebar} / タイル ${q.auxiliaryUnits.tiles} / 装飾材 ${q.auxiliaryUnits.decoration}（${trial.transfers.length}件）`
      : '保存情報を確認できません。';
    const priorSelection=projectSelect.value, concreteStock=service.constructionConcreteStock, project=service.constructionConcreteProject;
    const imported=new Set(project?.importedTransfers?.map(entry=>entry.transferId)??[]);
    projectSelect.replaceChildren();
    const eligible=(trial?.transfers??[]).filter(packet=>packet.quantities?.concreteBlockCredits>0&&!imported.has(packet.id));
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=eligible.length?'移す受取分を選んでください':'移せる受取分はありません';projectSelect.append(placeholder);
    for(const packet of eligible){const option=document.createElement('option');option.value=packet.id;option.textContent=`${packet.id}（コンクリート ${packet.quantities.concreteBlockCredits}杯相当）`;projectSelect.append(option);}
    if(eligible.some(packet=>packet.id===priorSelection))projectSelect.value=priorSelection;
    const site=concreteStock?.site,summary=deliveryConcreteSummary(project,site);
    dialog.querySelector('[data-concrete-project-stock]').textContent=concreteStock&&site
      ? `未移送 ${concreteStock.availablePackConcreteCredits}杯分 / 受取累計 ${concreteStock.packConcreteCredits}杯分　｜　生コン ${summary.concrete}杯・バケツ ${summary.bucket}杯・ホース ${summary.hose}杯・今回の打設 ${summary.poured}杯・完成保存 ${summary.completed}杯・未混練 ${summary.unmixed}杯分`
      : '保存情報を確認できません。';
    transferInput.disabled=opening||working||service.busy||service.blocked||service.mode!=='live'||!near;
    dialog.querySelector('[data-pack-transfer-copy]').disabled=!profileId||service.mode!=='live';
    projectSelect.disabled=opening||working||service.busy||service.blocked||service.mode!=='live'||!near||eligible.length===0;
    projectImport.disabled=projectSelect.disabled||!projectSelect.value||!service.excavationLive;
    transferMessage.textContent=service.mode!=='live'?'接続確認・表示用の保存では受け取れません。':!near?'建材受取所の正面へ徒歩で来てから受け取れます。':working||opening||service.busy?'保存内容を確認しています…':success||'受取IDをホームへ入力し、出力したJSONファイルを選んでください。';
    projectMessage.textContent=service.mode!=='live'?'通常のゲーム保存でのみ移送できます。':!service.excavationLive?'工事現場の通常プレイ画面でのみ施工在庫へ移せます。':!near?'建材受取所の正面へ徒歩で来てください。':working||opening||service.busy?'保存内容を確認しています…':projectSuccess||'受取済み建築セットのコンクリート分が対象です。';
    dialog.querySelector('.delivery-mode').textContent=service.mode==='integration'?'接続確認用の保存です。本体の素材とは別です。':service.mode==='readonly'?'表示確認中：素材の受取・保存は行いません。':'本体と共通の購入品・保管記録';
    message.textContent=service.blocked?'保存が停止しています。保存確認画面で記録を確認してください。':working||opening?'保管記録を確認中…':success||(!near?'建材受取所の正面へ、徒歩で来てください。':service.shopState?.pending?'先に火星ショップの保留注文を確認してください。':rows.some(({o})=>(stock?.unreceived[o.id]??0)>=o.amount)?'保管したい建材を選んでください。':'未受取の購入品はありません。購入した建材はここに表示されます。');
  }
  function close(){if(working||opening||service.busy)return false;if(dialog.open){dialog.close();onClose();}return true;}
  closeButton.addEventListener('click',close);
  returnButton.addEventListener('click',close);
  dialog.querySelector('[data-pack-transfer-copy]').addEventListener('click',async()=>{
    const profileId=service.constructionTransferProfileId;if(!profileId)return;
    try{await navigator.clipboard.writeText(profileId);success='受取IDをコピーしました。';}
    catch{const code=dialog.querySelector('[data-pack-transfer-profile]');const range=document.createRange();range.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);success='受取IDを選択しました。コピーしてください。';}
    refresh();
  });
  transferInput.addEventListener('change',async()=>{
    const file=transferInput.files?.[0];if(!file)return;
    if(file.size>8_000_000){success='ファイルが大きすぎます。受取を保留しました。';transferInput.value='';refresh();return;}
    working=true;success='';refresh();
    try{
      const packet=JSON.parse(await file.text());
      await service.receiveConstructionPackTrial(packet,context());
      success='ゲームのセーブデータに受取記録を保存しました。施工に使うコンクリート分を下で選べます。';
    }catch(error){success=error?.message||'移送ファイルを確認できません。';}
    finally{working=false;transferInput.value='';refresh();}
  });
  projectSelect.addEventListener('change',refresh);
  projectImport.addEventListener('click',async()=>{
    if(working||service.busy||service.blocked||service.mode!=='live'||!service.excavationLive||!deliveryAccess(context()))return;
    const transferId=projectSelect.value;if(!transferId)return;
    const before=service.constructionConcreteProject;
    working=true;projectSuccess='';refresh();
    try{
      const saved=await service.saveConstructionConcreteProject({type:'IMPORT_PACK_INGREDIENTS',operationId:`c2-${crypto.randomUUID()}`,transferId},before.revision,snapshot());
      const receipt=saved.importedTransfers.find(entry=>entry.transferId===transferId);
      projectSuccess=receipt?`生コン ${receipt.cells}杯分の配合材料を工房へ移しました。工房のミキサーで練ってから使えます。`:'この受取分はすでに工房へ移されています。';
    }catch(error){projectSuccess=error?.message||'施工台帳への保存に失敗しました。';}
    finally{working=false;refresh();}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  return {get open(){return dialog.open;},refresh,close,async show(){
    if(dialog.open)return;success='';opening=true;onOpen();dialog.showModal();refresh();
    try{await service.flush();}catch(e){success=e.message;}finally{opening=false;refresh();closeButton.focus();}
  }};
}
