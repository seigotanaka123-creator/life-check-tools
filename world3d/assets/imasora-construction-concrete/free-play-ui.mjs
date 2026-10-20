import {vehiclePicture} from './workshop-pictures.mjs?v=120dq';
import {paintDeckTemplate,paintPalette} from './paint-deck.mjs?v=120ds';
import {shapePicture,toolPicture,heightPicture} from '../imasora-pop-menu.mjs?v=120dg';
import {holdDashButtonTemplate} from '../imasora-hold-dash.mjs?v=119bf';
import {freeWorkEditorTemplate} from './free-work-editor.mjs?v=120gn';
import {CONCRETE_CAMERA_MODES} from './monster-camera.mjs';
import {constructionMovePadTemplate} from './move-pad.mjs?v=119bf';
import {STENCIL_TEMPLATES} from './free-stencil.mjs?v=120e';
export const FREE_PLAY_MODES=Object.freeze(['move','build','vehicle','paint']);
// A clock checkpoint must not prevent the player from opening/pause-closing
// menus. Construction mutations and exit/save still wait for the checkpoint.
export const freeMenuBlocked=s=>!!(s.confirm||s.busy&&!s.progressSaving);
export const freeModeNavigationKey=e=>e.type!=='keyup'&&(e.key==='Home'||e.key==='End'||e.shiftKey===true&&['ArrowLeft','ArrowRight'].includes(e.key));
export const FREE_PLAY_LABELS=Object.freeze({move:'移動',build:'つくる',vehicle:'車両',paint:'塗る'});
export const FREE_BUILD_STEPS=Object.freeze(['型枠','注ぐ','ならす','固める','型枠外し']);
export function freeStageGuide(f){
 const step=({design:0,framed:1,wet:2,finished:3,curing:3,cured:4,complete:4})[f.stage]??0;
 const status=({design:'型枠をつくる',framed:'生コンを注ぐ',wet:'生コンを注ぐ・ならす',finished:'固める準備',curing:'固まるまで待つ',cured:'型枠を外す',complete:'作品が完成！'})[f.stage]??'つくる準備';
 return{step,status};
}
export function freeConfirmation(type){
 if(['FREE_UNDO_STEP','FREE_UNDO_PAINT'].includes(type))return{label:'1つ前へ戻す',title:'さっきの作業を戻す？',tone:'caution'};
 if(type==='MASK_UNDO')return{label:'1つ前へ戻す',title:'さっきのテープを戻す？',tone:'caution'};
 const actions={FREE_DESIGN:['型枠を組む'],FREE_FRAME:['型枠を組む'],FREE_FRAME_RAISED:['足場で型枠を組む'],FREE_FINISH:['コテでならす'],FREE_PAINT:['選んだ色で塗る'],FREE_CURE:['生コンを固める'],FREE_UNDO_PAINT:['塗装を取り消す','caution'],FREE_RECOVER:['生コンを回収する','caution'],FREE_UNFRAME:['空の型枠を回収する','caution'],FREE_FOUNDATION_BUILD:['土台を設置する'],FREE_FOUNDATION_REMOVE:['土台を回収する','caution'],CLEAR_PLATFORM:['作業台を片付ける','caution'],SAFE_RETURN:['救助を呼ぶ'],FREE_NEXT:['つくる場所を変える'],FREE_CHANGE_EMPTY_SITE:['つくる場所を変える'],FREE_SET_WORK_PARTS:['作品の配置を変える','caution'],FREE_MOVE_WORK:['作品を移動する'],FREE_TRANSFORM_WORK:['作品を回転する']};
 const [label,tone='primary']=actions[type]??['この内容で実行する'];return{label,title:label+'前に確認',tone};
}
export function nextFreePlayMode(mode,delta){const i=FREE_PLAY_MODES.indexOf(mode);return FREE_PLAY_MODES[((i<0?0:i)+Math.sign(delta)+FREE_PLAY_MODES.length)%FREE_PLAY_MODES.length];}
export function freePlayActions(f,mode){
 if(mode==='build'){
  const actions=({design:['frame'],framed:['pour'],wet:['pour','finish'],finished:['cure'],curing:[],cured:['demold'],complete:[]})[f.stage]??[];
  // Empty frames can be reused on the ground as well as on a foundation.
  // The recovery button opens the existing confirmation and physical sequence.
  if(f.stage==='framed'&&Array.isArray(f.fill)&&f.fill.length===16&&f.fill.every(amount=>amount===0)&&!f.aboard&&!f.connected&&!f.hose)actions.push('unframe');
  // Keep the next refill beside pouring, without another trip through menus.
  const needsConcrete=f.fill?.some((amount,i)=>(f.mask&(1<<i))&&amount<f.height*2)??true;
  return ['framed','wet'].includes(f.stage)&&needsConcrete&&!f.aboard&&f.bucket===0?['load',...actions]:actions;
 }
 if(mode==='vehicle')return f.aboard==='truck'?['supply','mix']:f.aboard==='pump'?['legs','connect',...(f.hose?['drain']:f.connected?['prime']:[])]:[f.bucket?'return':'load'];
 if(mode==='paint')return ['roller'];
 return [];
}
export function freePlayTemplate(){return `
 <div class="free-hud-top" data-hud>
  <div class="free-hud-info"><strong>自由建築</strong><p data-status></p><p class="free-stock-strip"><span data-material-status></span><span data-actor-status></span></p></div>
  <button data-free="camera" aria-label="視点を選ぶ" title="視点を選ぶ" aria-haspopup="dialog" aria-expanded="false">視点</button><button data-ui="menu" aria-haspopup="dialog" aria-expanded="false">メニュー</button>
  <p class="free-hud-notice" role="status" data-note data-hud></p><div data-door-run hidden><span data-door-run-label></span><button type="button" data-free="walk-stop">止まる</button></div>
  <div class="free-step-undo"><button type="button" data-free="step-undo" aria-describedby="free-step-target" disabled><span aria-hidden="true">↶</span> 1つ前へ戻す</button><span id="free-step-target" data-step-target>まだ戻す作業はないよ</span></div>
 </div>
 
 <div class="free-basics" data-hud>
  <div class="concrete-actions free-seat-actions"><button data-free="truck">ミキサー車に乗る</button><button data-free="pump">ポンプ車に乗る</button><button data-free="dismount">車を降りる</button></div>
  <p class="free-boarding-help" data-boarding-help role="status" hidden></p>
  <div class="concrete-travel" aria-label="徒歩・走行操作"><span data-travel-label>徒歩</span>${constructionMovePadTemplate()}</div>
 </div>
 ${holdDashButtonTemplate()}<button type="button" class="construction-jump-button" data-free-jump data-hud aria-label="ジャンプ（3段まで）"><span aria-hidden="true">↑</span><b>ジャンプ</b></button>
 <button class="free-deck-open" data-ui="unfold" data-hud aria-expanded="false" aria-controls="free-tool-deck" hidden>道具をひらく</button>
 <section id="free-tool-deck" class="free-deck" aria-label="作業モード" data-hud><header class="free-deck-heading"><strong>手もとの道具</strong><button data-ui="fold" aria-label="道具をしまって現場を広く見る">道具をしまう ×</button></header>
  <div class="free-mode-tabs" role="tablist" aria-label="操作モード・左右にスライドで切替">${FREE_PLAY_MODES.map((id,i)=>`<button role="tab" id="free-mode-${id}" data-mode="${id}" aria-selected="${i===0}" aria-controls="free-mode-controls" tabindex="${i===0?0:-1}"><span aria-hidden="true">${id==='vehicle'?vehiclePicture('truck'):id==='build'?heightPicture(8):toolPicture(id==='paint'?'roller':'pad')}</span><strong>${FREE_PLAY_LABELS[id]}</strong><small>${({move:"歩く・運転",build:"床・壁をつくる",vehicle:"材料を用意",paint:"色・模様をつける"})[id]}</small></button>`).join('')}</div>
  <div id="free-mode-controls" role="tabpanel" aria-labelledby="free-mode-move"><section class="workshop-task" data-task-card hidden><div class="task-heading"><span data-task-symbol aria-hidden="true"></span><strong data-task-title></strong></div><p data-task-body></p><ol data-task-steps aria-label="作業のながれ"></ol><button type="button" data-task-link hidden></button><button type="button" data-task-next hidden>もうひとつつくる</button><p data-task-blocked role="status" hidden></p></section><div class="vehicle-job-choices" data-vehicle-jobs hidden><button type="button" data-vehicle-job="truck">${vehiclePicture('truck')}<strong>ミキサー車</strong><small>材料をまぜる</small></button><button type="button" data-vehicle-job="pump">${vehiclePicture('pump')}<strong>ポンプ車</strong><small>遠くへ注ぐ</small></button></div><ol class="free-progress" data-build-progress aria-label="つくる手順" hidden>${FREE_BUILD_STEPS.map((label,i)=>`<li data-step="${i}"><span>${i+1}</span>${label}</li>`).join('')}</ol><p data-mode-note></p><div class="free-door-routes" data-door-routes hidden><button type="button" data-free="choose-car" style="grid-column:1/-1">車を3Dでえらぶ</button><button type="button" data-free="walk-truck">ミキサー車のドアへ歩く</button><button type="button" data-free="walk-pump">ポンプ車のドアへ歩く</button><small>一番速く走って向かうよ。ドアに着いてから乗ろう！</small></div>
   ${paintDeckTemplate()}<div class="pop-quick-buttons" data-pop-quick><button data-build-open="shape">${shapePicture(1632)}かたち</button><button data-build-open="height">${heightPicture(4)}高さ</button><button data-build-open="pour">${toolPicture('bucket')}注ぎ先</button></div><div data-quick-tools data-pop-skip hidden><span data-quick-summary hidden></span>
    <div class="free-quick-row" data-quick-design><label>形<select data-quick-shape><option value="custom">選んだ形</option><option value="32">1マス</option><option value="1632">小さな床</option><option value="240">横一列</option><option value="1568">L字</option></select></label><label>高さ<select data-quick-height><option value="2">低めの床</option><option value="4">段差・縁どり</option><option value="8">花壇・低い壁</option></select></label></div>
    <div class="free-target-stepper" data-quick-target><button data-quick-prev aria-label="前の作業場所">‹</button><span data-quick-target-label></span><button data-quick-next aria-label="次の作業場所">›</button></div>
    <div class="free-quick-row" data-quick-paint><label>色<select data-quick-color><option value="blue">青</option><option value="white">白</option><option value="red">赤</option><option value="yellow">黄</option><option value="green">緑</option><option value="black">黒</option></select></label><label>塗る面<select data-quick-face><option value="top">上面</option><option value="north">北面</option><option value="south">南面</option><option value="west">西面</option><option value="east">東面</option></select></label></div>
    <label class="free-quick-amount" data-quick-vehicle>練る量<select data-quick-amount><option value="1">1杯</option><option value="4" selected>4杯</option><option value="8">8杯</option></select></label>
    <p data-quick-cost></p>
   </div><button type="button" class="free-show-target" data-ui="show-target">◎ 作業する場所を見る</button><div class="free-primary-actions">
   <button data-free="access">階段で土台に上がる</button><button data-free="frame">型枠を組む</button><button data-free="unframe">空の型枠を回収</button><button data-free="pour">生コンを注ぐ（1/4杯）</button><button data-free="finish">コテでならす</button><button data-free="cure">生コンを固める</button><button data-free="demold">型枠を外して完成</button><button data-free="mix">ドラムで練る（5秒）</button><button data-free="load">バケツに1杯汲む</button><button data-free="legs">支持脚を展開する</button><button data-free="prime">ホースに送る（1/4杯）</button><button data-free="roller">ローラーで塗る</button><button data-free="tape">テープを貼る</button><button data-free="untape">テープをはがす</button>
   <button data-free="supply">工房の原料を車へ積む</button><button data-free="return">バケツの残りを車へ戻す</button><button data-free="connect">ミキサーとの接続を切り替える</button><button data-free="drain">ホースの残りを回収</button><button data-ui="quick-stencil">型紙で塗る</button><button data-ui="quick-drawing">刷毛で描く</button><button data-ui="quick-mask" aria-haspopup="dialog">塗らない場所</button><button data-ui="quick-removal">色を落とす</button><button data-ui="settings" aria-haspopup="dialog">道具を選ぶ</button>
  </div><button type="button" class="task-more" data-task-more aria-expanded="false">ほかの道具</button><p id="free-action-help" data-pour-reason role="status"></p></div>
 </section>
 <div class="free-work-watch" data-work-watch hidden><div data-work-description role="status"><strong>作業中</strong><span data-work-phase></span></div><section class="free-hose-meter" data-hose-meter aria-label="ホースの生コン移動" hidden><div class="free-hose-heading"><strong data-hose-title role="status"></strong><span data-hose-percent aria-hidden="true"></span></div><progress data-hose-progress max="1" value="0" aria-label="生コン移動の進み具合"></progress><span data-hose-amount></span><small data-hose-stock></small></section></div>
 <button class="free-stop" data-free="stop" hidden>作業を止める</button>
 <div class="free-sheet-overlay" data-overlay hidden><section class="free-sheet" data-play-sheet role="dialog" aria-modal="true" aria-label="施工メニュー" tabindex="-1">
  <header><h2 data-sheet-title>道具箱</h2><button data-ui="close" aria-label="メニューを閉じて現場へ戻る">現場へ戻る</button></header>
  <nav class="free-toolbox-tabs" aria-label="道具箱の中身"><button data-toolbox="build">型枠</button><button data-toolbox="vehicle">車と材料</button><button data-toolbox="paint">ペンキ</button></nav><div class="free-sheet-scroll">
   <section data-sheet-content="camera"><p>目線、モンスターを上から見る視点、施工全体の視点を選べます。画面をドラッグ・スライドして見回せます。</p>${Object.entries(CONCRETE_CAMERA_MODES).map(([id,label])=>'<button data-camera-mode="'+id+'" aria-pressed="false">'+label+'</button>').join('')}<button data-ui="camera-reset">今の視点の向きを戻す</button><p>目線と上からの視点は移動に追従します。施工全体の視点は、自動作業中も構図を保ちます。</p></section>
   <section data-sheet-content="build">
    <nav class="pop-build-tabs" aria-label="つくるノートのページ"><button data-build-tab="shape">かたち</button><button data-build-tab="height">高さ</button><button data-build-tab="pour">注ぎ先</button><button data-build-tab="base">土台</button><button data-build-tab="book">設計帳</button></nav>
    <div data-design><p></p>
     <section data-build-pane="shape"><h3 class="pop-build-prompt">どんな形にしよう？</h3><div class="pop-presets"><button class="pop-shape-preset" data-shape-preset="32" aria-pressed="false">${shapePicture(32)}<strong>ひとマス</strong></button><button class="pop-shape-preset" data-shape-preset="1632" aria-pressed="false">${shapePicture(1632)}<strong>ちいさな床</strong></button><button class="pop-shape-preset" data-shape-preset="240" aria-pressed="false">${shapePicture(240)}<strong>よこにながく</strong></button><button class="pop-shape-preset" data-shape-preset="1568" aria-pressed="false">${shapePicture(1568)}<strong>Lのかたち</strong></button></div><p class="pop-canvas-caption">下の板をタッチして、自分だけの形にもできるよ！</p><div class="free-grid" data-shape aria-label="つくる形の板"></div></section>
     <section data-build-pane="height" hidden><h3 class="pop-build-prompt">どの高さにしよう？</h3><label>高さ<select data-height><option value="2">低めの床</option><option value="4">段差・縁どり</option><option value="8">花壇・低い壁</option></select></label><p>絵をタッチすると、現場の下描きも変わるよ。</p></section>
     <section data-build-pane="base" hidden><h3 class="pop-build-prompt">でこぼこな地面には、土台！</h3><label>土台の高さ<select data-foundation-height><option value="auto">地面に合わせる</option><option value="2">低い土台</option><option value="4">ひとつ高く</option><option value="8">もっと高く</option></select></label><button data-ui="ground">土台を置けるかな？</button><p data-ground-status role="status">地面と下描きを見ながら、置ける場所をたしかめよう。</p><button data-free="foundation">土台をつくる</button><button data-free="unfoundation" data-tone="caution" hidden>土台を片付ける</button></section>
    </div>
    <section data-build-pane="book" hidden><h3 class="pop-build-prompt">作品の設計帳</h3><p>作品の絵をタッチして、同じ形・高さを使おう！ 色は新しい作品でえらべるよ。</p><p data-design-book-status role="status"></p><div class="pop-presets" style="grid-template-columns:repeat(2,minmax(0,1fr))" data-design-book aria-label="作品からつくる形をえらぶ"></div><p>選ぶだけでは材料は減らないよ。現場で「型枠を組む」を押すと、板を使って組み立てるよ。</p></section>
    <div data-placing><section data-build-pane="pour" hidden><h3 class="pop-build-prompt">どこに注ごう？</h3><p>注ぎたい場所をタッチ！ 数字は入っている生コンだよ。</p><div class="free-grid" data-cells></div></section></div><p data-build-help></p><button class="pop-build-done" data-ui="build-done">この形で現場へ！</button>
   </section>
   <section data-sheet-content="vehicle"><h3>材料の準備</h3><label>用意する量 <select data-amount><option value="1">1杯</option><option value="4" selected>4杯</option><option value="8">8杯</option></select></label>
    <h3>ポンプのホース</h3><p>ポンプ車は支持脚を出し、近くのミキサー車と接続します。接続・送液・回収は、現場の「車両」からすぐ操作できます。徒歩ではホースの外側へ回り込んでください。通路を空ける時は残りを回収してから接続を外します。</p>
    <h3>広い型枠へ注ぐには</h3><p>車は作業台と階段の外側に停め、届くマスから注ぎましょう。遠いマスへは反対側へ停め直して注げます。移動前にホースの残りを回収し、接続を外して支持脚をしまいます。仕上げの前には、車を離して歩く通路を空けましょう。</p>
    <h3>坂道から現場へ</h3><p>緩やかな坂は走れます。急坂や段差で止まったら、来た方向へ戻りましょう。練る・注ぐ・支持脚を出す操作は、6輪すべてが平らな地面に乗ってから。坂の途中では停めず、階段と帰り道も空けてください。</p>
   </section>
   <section data-sheet-content="paint" data-paint-menu><label>完成作品 <select data-work></select></label><label>マス <select data-paint-cell></select></label><label>面 <select data-face><option value="top">上面</option><option value="north">北面</option><option value="south">南面</option><option value="west">西面</option><option value="east">東面</option></select></label><label data-pop-skip hidden>色 <select data-color><option value="blue">青</option><option value="white">白</option><option value="red">赤</option><option value="yellow">黄</option><option value="green">緑</option><option value="black">黒</option></select></label>${paintPalette()}
    <details class="free-menu-group" data-drawing-controls><summary>自由に線を描く</summary><p>指やマウスで絵の上をなぞってね。何本でも描けるよ。「この線をぬる」で、モンスターが作品にぬり始めるよ。</p><div class="pop-drawing-width" role="group" aria-label="線の太さ"><button type="button" data-drawing-width="1" aria-pressed="true"><span class="drawing-thin" aria-hidden="true"></span>ほそい線</button><button type="button" data-drawing-width="3" aria-pressed="false"><span class="drawing-thick" aria-hidden="true"></span>ふとい線</button></div><div class="pop-drawing-board" data-drawing-board role="group" aria-label="自由に線を描くボード">${Array.from({length:16},(_,i)=>`<button type="button" data-drawing-pixel="${i}" aria-label="おえかき ${i+1}" aria-pressed="false"></button>`).join('')}</div><p data-drawing-cost role="status"></p><div class="free-menu-grid"><button type="button" data-ui="drawing-clear">下描きを消す</button><button type="button" data-ui="drawing-paint" class="primary">この線をぬる</button></div><p>色を変えたいときは「もどる」で色を選び、重ねてぬろう。下描きだけならペンキは減らないよ。テープの場所はぬらないよ。</p></details>
    <details class="free-menu-group" data-removal-controls><summary>色を落とす</summary><p>落としたい色をタッチ！ 選んだところだけ、モンスターが道具でこすって、もとのコンクリート色に戻すよ。</p><div class="pop-removal-board" data-removal-board role="group" aria-label="色を落とす場所">${Array.from({length:16},(_,i)=>`<button type="button" data-removal-pixel="${i}" aria-label="色を落とす ${i+1}" aria-pressed="false"></button>`).join('')}</div><p data-removal-status role="status"></p><div class="free-menu-grid"><button type="button" data-ui="removal-all">ぬった色を全部えらぶ</button><button type="button" data-ui="removal-clear">選びなおす</button><button type="button" data-ui="removal-done">現場へ戻る</button><button type="button" data-ui="removal-run" class="primary">この色を落とす</button></div><p>テープで守った場所は落とさないよ。コンクリートの形は変わらないよ。使ったペンキは戻らないけれど、「1つ前へ戻す」で、さっきの色に戻せるよ。</p></details>
    <details class="free-menu-group free-mask-controls" data-mask-controls><summary>塗らない場所を選ぶ</summary><p>残したい場所を押して、「テープを貼る」！ モンスターが現場で貼って守るよ。はがしても、ぬった色はそのままだよ。</p><div class="free-grid free-mask-grid" data-paint-mask role="group" aria-label="塗らないマス"></div><p data-mask-status role="status"></p><button data-ui="clear-mask">下描きを消す</button><p class="free-mask-hint">テープはこの現場にいる間の道具だよ。ペンキは使わないよ。塗った模様はセーブされるよ。</p><button data-ui="mask-done">テープを貼る</button></details>
    <details class="free-menu-group" data-stencil-position-controls><summary>型紙を動かす</summary><p>絵をスライドして、塗るところをずらそう！ 下の矢印でも動かせるよ。</p><div class="stencil-position-board" data-stencil-position-board role="group" aria-label="型紙の位置を調整する絵">${Array.from({length:16},(_,i)=>`<button type="button" data-stencil-position-pixel="${i}" aria-label="型紙の絵 ${i+1}" tabindex="-1"></button>`).join("")}</div><div class="stencil-position-arrows" role="group" aria-label="型紙を動かす方向"><button type="button" data-stencil-shift="0,-1" aria-label="型紙を上へ">↑</button><button type="button" data-stencil-shift="-1,0" aria-label="型紙を左へ">←</button><button type="button" data-ui="stencil-center">中央へ</button><button type="button" data-stencil-shift="1,0" aria-label="型紙を右へ">→</button><button type="button" data-stencil-shift="0,1" aria-label="型紙を下へ">↓</button></div><p data-stencil-position-status role="status"></p><div class="free-menu-grid stencil-position-actions"><button type="button" data-ui="stencil-position-turn">型紙を回す ↻</button><button type="button" data-ui="stencil-position-done">現場へ戻る</button><button type="button" data-ui="stencil-position-paint" class="primary">型紙で塗る</button></div><p>模様や塗る面を選び直すと、型紙は中央に戻るよ。位置を決めるだけなら、ペンキは減らないよ。</p></details>
    <details class="free-menu-group free-stencil-controls"><summary>型紙で模様を塗る</summary><label>模様 <select data-stencil>${STENCIL_TEMPLATES.map(t=>`<option value="${t.id}">${t.label}</option>`).join('')}</select></label><label>向き <select data-stencil-turn><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label><div class="free-stencil-preview" data-stencil-preview role="img" aria-label="型紙の塗る範囲">${Array.from({length:16},(_,i)=>`<i data-stencil-pixel="${i}" aria-hidden="true"></i>`).join('')}</div><p data-stencil-guide></p><p data-stencil-cost></p><button data-ui="stencil-paint">型紙で塗る</button></details>
    <p>ローラーはテープ以外の面を塗るよ。刷毛は下のマスをなぞり、指を離すと塗りはじめるよ。テープを選ぶだけではペンキは減らないよ。共通の作業台があれば、同じ床と階段で塗ります。足場はメニューから片付けられます。作品の周りに通路を空けてください。</p><div class="free-grid free-brush" data-brush aria-label="刷毛で塗る範囲"></div><p data-paint-cost></p><button data-free="undo" data-tone="caution">直前の塗装を取り消す</button>
   </section>
   ${freeWorkEditorTemplate()}
   <section data-sheet-content="menu">
    <details class="free-menu-group"><summary>道具箱</summary><p data-toolkit-summary></p><div data-toolkit-detail></div><p>ペンキと生コンは、使った分だけ減るよ。</p></details>
    <p class="free-menu-intro">メニューを開くと移動は止まります。生コンを練る・固める時間も止めたい時は「一時停止」を押してください。</p>
    <div class="free-menu-grid"><button data-free="pause">一時停止</button><button data-free="leave">保存して工事現場へ</button></div>
    <button data-free="help">動きで使い方を見る</button><h3>作品と現場</h3><div class="free-menu-grid"><button data-ui="works" aria-haspopup="dialog">作品を移動・保管</button><button data-ui="design-book">作品の設計帳</button><button data-free="next">次の場所でつくる</button></div>
    <h3>セーブ</h3><p>作品と材料は自動でセーブされるよ。</p><button data-free="save">今の作業をセーブ</button><details class="free-menu-group"><summary>セーブの控え</summary><p>別の場所に控えを残したいときに使えます。いつものセーブには必要ありません。</p><button data-free="export">控えを書き出す</button></details><p data-stock-detail></p><p data-history-status role="status"></p><button data-free="retry" hidden>保存をもう一度確認</button>
    <details class="free-menu-group"><summary>片付け・回収</summary><p>作品を変える操作は、内容を確認してから実行します。</p><button data-ui="clear-platform" data-tone="caution" hidden>作業台と階段を片付ける</button><button data-free="recover" data-tone="caution">固める前の生コンを回収</button></details>
    <details class="free-menu-group"><summary>動けなくなったら</summary><p>救助を呼ぶと安全な地面へ戻れます。作品・材料・車両は残ります。車に乗っている時は、その場に車を残して降ります。</p><button data-free="evacuate">救助を呼ぶ</button></details>
    <details class="free-menu-group"><summary>操作のヒント</summary><p>スマホは左の丸いパッドで移動、右のダッシュを押しながら走ります。車では加速になります。指を離すと止まります。</p><p>PCはWASD。移動キーを素早く2回押し、2回目を押し続けると速く移動します。</p><p>「視点」でカメラを選び、画面をドラッグ・スライドして見回せます。歩く時は上／Wが見ている方向です。車は上／Wがアクセル、下／Sがバック、左右／A・Dがハンドル。進むかバックしながら曲がります。作業モードはタップか左右スライドで切り替えます。PCはモード上でShift＋左右キー。</p><p>運転席横の目印に立つと、乗車ボタンが出ます。</p></details>
   </section>
  </div>
 </section></div>
 <div class="free-confirm-overlay" data-confirm hidden role="alertdialog" aria-modal="true" aria-label="作業内容の確認"><section class="free-confirm-card"><h2 data-confirm-title>作業内容の確認</h2><p></p><button data-free="confirm">この内容で実行する</button><button data-free="dismiss">やめる</button></section></div>
`;}
