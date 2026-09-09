import * as THREE from './three.module.min.js';
import {SHOP_OFFERS} from './imasora-mars-construction-shop.js';
import {deliveryAccess} from './imasora-construction-delivery.js';

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
    <p class="delivery-intro">おかえりなさい！<br>火星で買った建材を、ここで大切に保管します。</p>
    <p class="delivery-mode"></p><div class="delivery-stock-list"></div>
    <p class="delivery-message" role="status" aria-live="polite"></p>
    <footer>購入済みの分だけを保管します。金貨は使いません。<br>火星水は給水ローダー区画で出庫・運搬できます。土・木材の本体施工は接続予定です。</footer>`;
  document.body.append(dialog);
  let working=false,opening=false,success='';
  const closeButton=dialog.querySelector('.delivery-close'),message=dialog.querySelector('.delivery-message');
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
    closeButton.disabled=working||opening||service.busy;
    for(const {o,row,button}of rows){
      row.querySelector('.delivery-unreceived').textContent=amountText(o.id,stock?.unreceived[o.id]??0);
      row.querySelector('.delivery-stored').textContent=amountText(o.id,stock?.stored[o.id]??0);
      if(o.id==='mars-water'&&stock?.inUse?.['mars-water'])row.querySelector('.delivery-stored').textContent+=`（ほか作業中 ${amountText(o.id,stock.inUse['mars-water'])}）`;
      button.disabled=opening||working||service.busy||service.blocked||service.mode==='readonly'||!near||!!service.shopState?.pending||(stock?.unreceived[o.id]??0)<o.amount;
    }
    dialog.querySelector('.delivery-mode').textContent=service.mode==='integration'?'接続確認用の保存です。本体の素材とは別です。':service.mode==='readonly'?'表示確認中：素材の受取・保存は行いません。':'本体と共通の購入品・保管記録';
    message.textContent=service.blocked?'保存が停止しています。保存確認画面で記録を確認してください。':working||opening?'保管記録を確認中…':success||(!near?'建材受取所の正面へ、徒歩で来てください。':service.shopState?.pending?'先に火星ショップの保留注文を確認してください。':rows.some(({o})=>(stock?.unreceived[o.id]??0)>=o.amount)?'保管したい建材を選んでください。':'未受取の購入品はありません。購入した建材はここに表示されます。');
  }
  function close(){if(working||opening||service.busy)return false;if(dialog.open){dialog.close();onClose();}return true;}
  closeButton.addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  return {get open(){return dialog.open;},refresh,close,async show(){
    if(dialog.open)return;success='';opening=true;onOpen();dialog.showModal();refresh();
    try{await service.flush();}catch(e){success=e.message;}finally{opening=false;refresh();closeButton.focus();}
  }};
}
