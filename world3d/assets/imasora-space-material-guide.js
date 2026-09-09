import {SPACE_MATERIALS,MATERIAL_GROUPS,findSpaceMaterials} from './imasora-space-material-catalog.js?v=441';
import {ORDINARY_MATERIALS,ORDINARY_MATERIAL_GROUPS,findOrdinaryMaterials} from './imasora-ordinary-material-catalog.js?v=445';
import {materialArtwork} from './imasora-material-ui-art.js?v=450';
// A read-only manual; neither possession nor crafting is inferred from adoption.
export function createSpaceMaterialGuide({onOpen=()=>{},onClose=()=>{}}={}){
  const dialog=document.createElement('dialog');dialog.className='space-material-guide';dialog.setAttribute('aria-labelledby','material-guide-title');
  dialog.innerHTML=`<header class="smg-heading"><span class="smg-emblem" aria-hidden="true">✦</span><div><small>イマソラウォーカーズ · 建設の説明書</small><h2 id="material-guide-title">宇宙素材図鑑</h2><p id="material-guide-place"></p></div><button type="button" data-book-close aria-label="宇宙素材図鑑を閉じる">とじる ×</button></header>
  <div class="smg-sources" role="group" aria-label="素材の入手先"><button type="button" id="material-guide-space" aria-pressed="true">火星素材 33種</button><button type="button" id="material-guide-earth" aria-pressed="false">普通素材 14種</button></div>
  <p class="smg-note" id="material-guide-note">採用素材 33種類の設計図鑑です。特殊な性質の実装・購入は順次追加予定です。</p>
  <div class="smg-filters"><label>素材を探す<input type="search" id="material-guide-search" placeholder="素材名・番号・遊び方で検索" autocomplete="off"></label><label>種類<select id="material-guide-group"><option value="all">すべて</option></select></label></div>
  <div class="smg-body"><nav class="smg-index" aria-label="採用素材一覧"><div class="smg-index-title"><b>もくじ</b><p id="material-guide-count" role="status"></p></div><div id="material-guide-list"></div></nav><article class="smg-page" id="material-guide-page" aria-labelledby="material-guide-name"><div class="smg-page-top"><span id="material-guide-number"></span><span id="material-guide-category"></span></div><div class="smg-specimen"><div class="smg-hero" aria-hidden="true"><div id="material-guide-art"></div><i id="material-guide-symbol"></i></div><div><span class="smg-specimen-label">素材の手引き</span><h3 id="material-guide-name"></h3><span class="smg-sketch-note">イメージ標本</span></div></div><section><h4>特殊な性質</h4><p id="material-guide-property"></p></section><section><h4>作れるもの・遊び方</h4><p id="material-guide-play"></p></section><small>全33種類を01〜33の図鑑番号で掲載しています。</small></article><p class="smg-empty" id="material-guide-empty" hidden>その素材は見つかりませんでした。<br>名前や種類を変えて探してみてね。</p></div>
  <footer class="smg-footer"><button type="button" id="material-guide-prev">‹ 前の素材</button><span id="material-guide-position" aria-live="polite"></span><button type="button" id="material-guide-next">次の素材 ›</button></footer>`;
  document.body.append(dialog);const el=id=>dialog.querySelector('#material-guide-'+id),list=el('list'),page=el('page'),search=el('search'),group=el('group');
  let items=SPACE_MATERIALS,selected=items[0].id,opener=null,source='space';
  const groups=()=>source==='earth'?ORDINARY_MATERIAL_GROUPS:MATERIAL_GROUPS;
  const all=()=>source==='earth'?ORDINARY_MATERIALS:SPACE_MATERIALS;
  const details=document.createElement('section');details.id='material-guide-acquisition';page.insertBefore(details,page.querySelector(':scope > small'));
  function populateGroups(){group.replaceChildren();const a=document.createElement('option');a.value='all';a.textContent='すべて';group.append(a);for(const g of groups()){const o=document.createElement('option');o.value=g.id;o.textContent=g.name;group.append(o);}}
  populateGroups();
  function render(){
    items=(source==='earth'?findOrdinaryMaterials:findSpaceMaterials)(search.value,group.value);if(!items.some(m=>m.id===selected))selected=items[0]?.id;
    el('count').textContent=`${items.length} / ${all().length}種類`;list.replaceChildren();
    for(const m of items){const b=document.createElement('button');b.type='button';const n=document.createElement('span'),name=document.createElement('span');n.className='smg-entry-number';n.textContent=String(m.number).padStart(2,'0');name.textContent=m.name;b.append(n,name);b.setAttribute('aria-current',String(m.id===selected));b.onclick=()=>{selected=m.id;renderPage();for(const c of list.children)c.setAttribute('aria-current',String(c===b));};list.append(b);}renderPage();
  }
  function renderPage(){
    const index=items.findIndex(m=>m.id===selected),m=items[index];page.hidden=!m;el('empty').hidden=!!m;
    el('prev').disabled=index<=0;el('next').disabled=index<0||index>=items.length-1;el('position').textContent=m?`${index+1} / ${items.length}`:'該当する素材はありません';
    if(!m)return;const g=groups().find(g=>g.id===m.group);page.style.setProperty('--material-color',g.color);
    for(const [id,text] of Object.entries({number:`${source==='earth'?'普通素材 ':''}No. ${String(m.number).padStart(2,'0')}`,category:g.name,symbol:g.symbol,name:m.name,property:m.property,play:m.play}))el(id).textContent=text;
    page.querySelector('h4').textContent=source==='earth'?'普通の性質':'特殊な性質';
    el('art').innerHTML=materialArtwork(source==='earth'?(m.id==='earth-timber'?'earth-timber':g.id==='liquid'?'earth-water':g.id==='ground'?'earth-ground':g.id):g.id);
    dialog.dataset.source=source;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)page.animate([{opacity:.65,transform:'translateX(5px)'},{opacity:1,transform:'translateX(0)'}],{duration:150});
    page.querySelector(':scope > small').textContent=source==='earth'?'普通素材は火星素材と別の01〜14番です。通常の散歩報酬・建設への接続は段階的に追加します。':'全33種類を01〜33の図鑑番号で掲載しています。';
    details.replaceChildren();for(const [title,text] of source==='earth'?[['入手先',m.source],['使う車・作業',m.vehicles],['対応状況',m.status]]:[]){const h=document.createElement('h4'),p=document.createElement('p');h.textContent=title;p.textContent=text;details.append(h,p);}
    details.hidden=source!=='earth';
    page.scrollTop=0;
  }
  function turn(step){const i=items.findIndex(m=>m.id===selected),next=items[i+step];if(!next)return;selected=next.id;render();list.querySelector('[aria-current="true"]')?.scrollIntoView({block:'nearest'});}
  el('prev').onclick=()=>turn(-1);el('next').onclick=()=>turn(1);search.oninput=render;group.onchange=render;
  function switchSource(next){source=next;search.value='';populateGroups();selected=all()[0].id;el('earth').setAttribute('aria-pressed',String(source==='earth'));el('space').setAttribute('aria-pressed',String(source==='space'));el('note').textContent=source==='earth'?'普通素材は散歩などで集め、工事現場で使う設計です。既存の散歩報酬は維持し、獲得・施工は順次対応します。火星ショップの販売品ではありません。':'採用素材33種類の設計図鑑です。特殊な性質の実装・購入は順次追加予定です。';render();list.scrollTop=0;}
  el('earth').onclick=()=>switchSource('earth');el('space').onclick=()=>switchSource('space');
  dialog.querySelector('[data-book-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{onClose();if(opener?.isConnected&&!opener.hidden)opener.focus({preventScroll:true});});
  // Leave text entry/Tab/Enter to the dialog, but never send keys to the game.
  const stopGameKeys=e=>{if(!dialog.open)return;if(e.type==='keydown'&&e.key==='Escape'){e.preventDefault();dialog.close();}e.stopImmediatePropagation();};
  window.addEventListener('keydown',stopGameKeys,true);window.addEventListener('keyup',stopGameKeys,true);
  // Do not put a held movement key into the search field after touching the book.
  render();return{get open(){return dialog.open;},show(place){if(dialog.open)return;opener=document.activeElement;el('place').textContent=place;onOpen();dialog.showModal();dialog.querySelector('[data-book-close]').focus({preventScroll:true});},close(){if(dialog.open)dialog.close();}};
}
