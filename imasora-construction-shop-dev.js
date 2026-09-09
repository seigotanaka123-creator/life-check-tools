import {SHOP_OFFERS as TRIAL_OFFERS,quoteOrder as quoteTrialOrder,formatMaterial} from './assets/imasora-mars-construction-shop.js';
import {ShopSession} from './assets/imasora-mars-construction-shop-storage.js';
import {materialArtwork} from './assets/imasora-material-ui-art.js?v=450';
import {createSpaceMaterialGuide} from './assets/imasora-space-material-guide.js?v=450';
const $=id=>document.getElementById(id);
const previewMode=new URLSearchParams(location.search).get('walletPreview');
const walletUI=new URLSearchParams(location.search).get('worldShop')==='1'
  ?(await import('./assets/imasora-world-shop-client.js?v=452')).createWorldShopClient()
  :previewMode?(await import('./assets/imasora-world-purchase-preview-ui.js?v=451')).makeWalletPreview(previewMode):null;
const session=walletUI?.session||new ShopSession(),SHOP_OFFERS=walletUI?.offers||TRIAL_OFFERS,quoteOrder=walletUI?.quote||quoteTrialOrder;
let working=false,selection=null,browsing=SHOP_OFFERS[0];
const buttons=new Map();
function tell(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').scrollIntoView({block:'nearest',behavior:'instant'});}
for(const offer of SHOP_OFFERS){
  const button=document.createElement('button');button.className='product-choice';button.type='button';
  // Trusted local catalog, not remotely supplied text.
  button.innerHTML=`<span class="item-icon" aria-hidden="true">${materialArtwork(offer.look)}</span><span><strong class="item-name">${offer.name}</strong><span class="item-pack">${offer.pack}</span></span><span class="item-price">${offer.price}<small> 枚</small></span>`;
  button.setAttribute('aria-label',`${offer.name}を選ぶ`);button.onclick=()=>{browsing=offer;renderBrowse();};buttons.set(offer.id,button);$('products').append(button);
}
function renderBrowse(){
  for(const [id,b]of buttons)b.setAttribute('aria-pressed',String(id===browsing.id));
  $('detail-art').innerHTML=materialArtwork(browsing.look);$('detail-name').textContent=browsing.name;$('detail-description').textContent=browsing.description;$('detail-vehicle').textContent=browsing.vehicle;
  $('detail-pack').textContent=`1セット ／ ${browsing.price}枚`;
  $('buy-selected').disabled=working||session.blocked||!session.state||!!session.state.pending||session.state.balance<browsing.price;
}
$('buy-selected').onclick=()=>choose(browsing);
const guide=createSpaceMaterialGuide();
$('open-guide').onclick=()=>guide.show('火星素材ショップ · 建設の説明書');
$('open-bag').onclick=()=>$('bag').showModal();$('open-dev').onclick=()=>$('development').showModal();
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
function render(){
  const s=session.state,locked=working||session.blocked||!s;
  $('balance').textContent=s?s.balance:'—';
  $('save-status').textContent=working?'保存を確認中…':session.blocked?'確認が必要：購入は停止中':s?'保存済み・開発専用':'未開始';
  for(const o of SHOP_OFFERS)buttons.get(o.id).disabled=working;
  renderBrowse();
  $('reload').disabled=working;$('export').disabled=working||!session.raw;
  $('pending').hidden=!s?.pending;
  $('pending-title').textContent=session.blocked?'注文結果の確認が必要です':'未完了の注文があります';
  $('pending-money').textContent=session.blocked?'支払い結果が未確認です。残高・建材は確認前の表示です。「保存を読み直す」で確認してください。':'まだ金貨は引かれていません。商品も未受取です。';
  if(s?.pending){const p=s.pending,o=SHOP_OFFERS.find(o=>o.id===p.offerId);$('pending-text').textContent=`${o.name} ${p.quantity}セット ／ 宇宙金貨 ${p.cost}枚 ／ 注文 ${p.id.slice(0,8)}`;}
  $('resume').disabled=locked;$('cancel-pending').disabled=locked;
  $('inventory').replaceChildren(...SHOP_OFFERS.map(o=>{const row=document.createElement('div'),name=document.createElement('strong'),amount=document.createElement('span');name.textContent=o.name;amount.textContent=s?formatMaterial(o.id,s.materials[o.id]):'—';row.append(name,amount);return row;}));
  const orders=s?.orders||[];
  $('receipts').replaceChildren(...orders.slice(-30).reverse().map(p=>{const li=document.createElement('li'),o=SHOP_OFFERS.find(o=>o.id===p.offerId),text=document.createElement('div'),id=document.createElement('code');text.textContent=p.status==='paid'?`${o.name} ${p.quantity}セット受取 ／ −${p.cost}枚`:`${o.name} ${p.quantity}セットを取消 ／ 支払いなし`;id.textContent=`注文 ${p.id}`;li.append(text,id);return li;}));
  if(!orders.length){const li=document.createElement('li');li.textContent='まだ注文はありません。';$('receipts').append(li);}
  $('fault').disabled=working;
  walletUI?.refresh();
}
async function perform(fn){
  if(working)return;working=true;$('export-data').hidden=true;render();
  try{await fn();}catch(e){if($('confirm').open)$('confirm').close();tell(e.message,true);}finally{working=false;render();if($('confirm').open)updateQuote();}
}
async function read(){
  await session.load();if(!session.state){if(walletUI){walletUI.showImport();tell('本体と分離した接続確認です。データの用意方法を確認してください。');return;}await session.initialize();}
  tell(session.state.pending?'支払い前の注文が残っています。再開または取り消しを選べます。':'保存を確認しました。購入済みの建材と残高を読み込んでいます。');
}
function choose(offer){
  if(working||session.blocked||session.state?.pending)return;
  selection={offer,id:crypto.randomUUID()};$('quantity').value='1';$('confirm-name').textContent=offer.name;$('confirm-art').innerHTML=materialArtwork(offer.look);updateQuote();$('confirm').showModal();
}
function updateQuote(){
  if(!selection)return;const q=quoteOrder(selection.offer.id,Number($('quantity').value)),balance=session.state.balance;
  $('quote').innerHTML=`<p>受取：${formatMaterial(q.offerId,q.amount)}</p><p>支払い：<strong>${q.cost}枚</strong></p><p>残高 ${balance}枚 → ${balance>=q.cost?balance-q.cost+'枚':'不足'}</p>${balance<q.cost?'<p class="insufficient">金貨が足りません。セット数を減らしてください。</p>':''}`;
  $('confirm-buy').disabled=working||session.blocked||q.cost>balance;
}
$('quantity').onchange=updateQuote;
$('confirm-close').onclick=()=>{if(!working)$('confirm').close();};
$('confirm').addEventListener('cancel',e=>{if(working)e.preventDefault();});
$('confirm-buy').onclick=()=>{
  if(!selection||working)return;const {offer,id}=selection,quantity=Number($('quantity').value),fault=$('fault').value;
  perform(async()=>{
    $('confirm-buy').disabled=true;$('confirm-close').disabled=true;$('quantity').disabled=true;
    try{
      await session.prepare(offer.id,quantity,id);$('fault').value='normal';$('confirm').close();selection=null;
      if(fault==='pause'){tell('支払い直前で中断しました。再読み込みしてから、同じ注文を再開してみてください。');return;}
      if(fault==='abort')session.store.failNext=true;
      await session.settle(id,{loseReply:fault==='lost'});
      tell(`${offer.name}を受け取りました！ ${formatMaterial(offer.id,offer.amount*quantity)}を保存しました。`);
    }finally{$('confirm-close').disabled=false;$('quantity').disabled=false;if($('confirm').open)updateQuote();}
  });
};
$('resume').onclick=()=>perform(async()=>{const id=session.state.pending.id;await session.settle(id);tell('保留中の注文を完了しました。金貨の支払いと建材の受取は一度だけです。');});
$('cancel-pending').onclick=()=>perform(async()=>{await session.settle(session.state.pending.id,{cancel:true});tell('注文を取り消しました。金貨と建材は変わりません。');});
$('reload').onclick=()=>{$('development').close();perform(read);};
$('export').onclick=()=>{try{$('export-data').textContent=session.blocked?session.exportRaw():session.export();$('export-data').hidden=false;}catch(e){tell(e.message,true);}};
walletUI?.bind({perform,tell,render});
await perform(read);

// Use the approved 360-degree shopkeeper, not a replacement character.
// This small preview is decorative; loss of WebGL must not disable purchasing.
try{
  const [THREE,{buildMarsShopkeeper360}]=await Promise.all([import('./assets/three.module.min.js'),import('./assets/imasora-mars-shopkeeper-360.js')]);
  const host=$('merchant'),renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,5000),model=buildMarsShopkeeper360(undefined,{castShadow:false});scene.add(model);
  scene.add(new THREE.HemisphereLight(0xfff4e5,0x6b527c,2.2));const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(70,160,100);scene.add(light);
  const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  camera.position.set(center.x+size.y*.13,center.y+size.y*.1,center.z+size.y*1.9);camera.lookAt(center);
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
  let active=true;const observer=new IntersectionObserver(([entry])=>active=entry.isIntersecting);observer.observe(host);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let frame,last=0;
  function animate(time){frame=requestAnimationFrame(animate);if(document.hidden||!active||time-last<33)return;last=time;model.userData.updateAnimation?.(time/1000,!reduced.matches);renderer.render(scene,camera);}frame=requestAnimationFrame(animate);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.dispose();},{once:true});
}catch{const label=document.createElement('span');label.textContent='火星素材ショップの店主';$('merchant').append(label);}
