// Player menu relocates existing controls; saves and game rules remain owned by the game.
export function createWorldPlayerUI({clearInput=()=>{}}={}){
 if(new URLSearchParams(location.search).get('developer')==='1'){document.body.classList.remove('world-player-game');return{get open(){return false;}};}
 const q=s=>document.querySelector(s),header=q('.world-header'),toolbar=q('.world-toolbar'),card=q('.control-card');
 card.querySelector('.panel-section')?.setAttribute('data-player-debug','');
 const menu=document.createElement('dialog');menu.className='world-player-menu';menu.setAttribute('aria-labelledby','world-player-menu-title');
 menu.innerHTML='<header><div><small>一時停止中</small><h2 id="world-player-menu-title">冒険メニュー</h2></div><button type="button" data-player-close>ゲームに戻る</button></header><div class="world-player-menu-scroll"><section><h3>行き先を選ぶ</h3><div data-player-maps></div></section><section><h3>持ちもの・建物・保存</h3><div data-player-tools></div></section><details class="world-player-facilities"><summary>この場所の施設・遊び方</summary><div data-player-facilities></div></details><section class="world-player-help"><h3>操作のヒント</h3><p>スマホ：左の丸いパッドで移動し、右のダッシュを押しながら走ります。画面をスライドすると見回せます。</p><p>PC：WASDで移動。同じキーを素早く2回押し、2回目を押し続けると走ります。左ドラッグで見回し、Spaceでジャンプします。</p><p>メニューを閉じるとゲームに戻ります。車には運転席横の目印から乗れます。</p></section></div>';
 const bar=document.createElement('div');bar.className='world-player-bar';bar.innerHTML='<div class="world-player-brand"><strong>イマソラーズウォーク</strong><div data-player-status></div></div><button type="button" data-player-menu aria-haspopup="dialog" aria-expanded="false">メニュー</button>';
 const status=bar.querySelector('[data-player-status]');status.append(q('#sceneTitle'),q('#saveState'));
 const camera=q('#cameraModeButton');bar.insertBefore(camera,bar.querySelector('[data-player-menu]'));
 menu.querySelector('[data-player-maps]').append(q('#mapTabs'));
 const tools=menu.querySelector('[data-player-tools]');for(const id of ['materialGuideButton','constructionDeliveryButton','saveButton','resetButton','labelsButton'])tools.append(q('#'+id));
 const backup=q('.status-stack a');if(backup){backup.textContent='バックアップ・復元の案内';tools.append(backup);}
 menu.querySelector('[data-player-facilities]').append(card);header.append(bar);document.body.append(menu);toolbar.hidden=true;
 const openButton=bar.querySelector('[data-player-menu]'),closeButton=menu.querySelector('[data-player-close]');
 const close=()=>{clearInput();if(menu.open)menu.close();openButton.setAttribute('aria-expanded','false');};
 openButton.onclick=()=>{clearInput();menu.showModal();openButton.setAttribute('aria-expanded','true');closeButton.focus();};
 closeButton.onclick=close;menu.addEventListener('close',()=>{clearInput();openButton.setAttribute('aria-expanded','false');});
 menu.addEventListener('cancel',clearInput);
 // Close before an existing control opens a second dialog or enters a vehicle.
 menu.addEventListener('click',e=>{if(e.target.closest('button:not([data-player-close])'))close();},true);
 menu.addEventListener('keydown',e=>e.stopPropagation());menu.addEventListener('keyup',e=>e.stopPropagation());
 return{get open(){return menu.open;},close};
}
