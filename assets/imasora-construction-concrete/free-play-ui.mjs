import {holdDashButtonTemplate} from '../imasora-hold-dash.mjs?v=119bf';
import {freeWorkEditorTemplate} from './free-work-editor.mjs';
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
 const actions={FREE_DESIGN:['型枠を組む'],FREE_FRAME:['型枠を組む'],FREE_FRAME_RAISED:['足場で型枠を組む'],FREE_FINISH:['コテでならす'],FREE_PAINT:['選んだ色で塗る'],FREE_CURE:['生コンを固める'],FREE_UNDO_PAINT:['塗装を取り消す','caution'],FREE_RECOVER:['生コンを回収する','caution'],FREE_UNFRAME:['空の型枠を回収する','caution'],FREE_FOUNDATION_BUILD:['土台を設置する'],FREE_FOUNDATION_REMOVE:['土台を回収する','caution'],CLEAR_PLATFORM:['作業台を片付ける','caution'],SAFE_RETURN:['救助を呼ぶ'],FREE_NEXT:['次の場所へ移る'],FREE_CHANGE_EMPTY_SITE:['施工場所を変える'],FREE_SET_WORK_PARTS:['作品の配置を変える','caution'],FREE_MOVE_WORK:['作品を移動する'],FREE_TRANSFORM_WORK:['作品を回転する']};
 const [label,tone='primary']=actions[type]??['この内容で実行する'];return{label,title:label+'前に確認',tone};
}
export function nextFreePlayMode(mode,delta){const i=FREE_PLAY_MODES.indexOf(mode);return FREE_PLAY_MODES[((i<0?0:i)+Math.sign(delta)+FREE_PLAY_MODES.length)%FREE_PLAY_MODES.length];}
export function freePlayActions(f,mode){
 if(mode==='build'){
  const actions=({design:['frame'],framed:['pour'],wet:['pour','finish'],finished:['cure'],curing:[],cured:['demold'],complete:[]})[f.stage]??[];
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
  <p class="free-hud-notice" role="status" data-note data-hud></p>
 </div>
 
 <div class="free-basics" data-hud>
  <div class="concrete-actions free-seat-actions"><button data-free="truck">ミキサー車に乗る</button><button data-free="pump">ポンプ車に乗る</button><button data-free="dismount">車を降りる</button></div>
  <p class="free-boarding-help" data-boarding-help role="status" hidden></p>
  <div class="concrete-travel" aria-label="徒歩・走行操作"><span data-travel-label>徒歩</span>${constructionMovePadTemplate()}</div>
 </div>
 ${holdDashButtonTemplate()}
 <section class="free-deck" aria-label="作業モード" data-hud>
  <div class="free-mode-tabs" role="tablist" aria-label="操作モード・左右にスライドで切替">${FREE_PLAY_MODES.map((id,i)=>`<button role="tab" id="free-mode-${id}" data-mode="${id}" aria-selected="${i===0}" aria-controls="free-mode-controls" tabindex="${i===0?0:-1}">${FREE_PLAY_LABELS[id]}</button>`).join('')}</div>
  <p class="free-tools-title">手もとの道具</p><div id="free-mode-controls" role="tabpanel" aria-labelledby="free-mode-move"><ol class="free-progress" data-build-progress aria-label="つくる手順" hidden>${FREE_BUILD_STEPS.map((label,i)=>`<li data-step="${i}"><span>${i+1}</span>${label}</li>`).join('')}</ol><p data-mode-note></p>
   <div class="free-quick-tools" data-quick-tools>
    <div class="free-quick-row" data-quick-design><label>形<select data-quick-shape><option value="custom">選んだ形</option><option value="32">1マス</option><option value="1632">小さな床</option><option value="240">横一列</option><option value="1568">L字</option></select></label><label>高さ<select data-quick-height><option value="2">低めの床</option><option value="4">段差・縁どり</option><option value="8">花壇・低い壁</option></select></label></div>
    <div class="free-target-stepper" data-quick-target><button data-quick-prev aria-label="前の作業場所">‹</button><span data-quick-target-label></span><button data-quick-next aria-label="次の作業場所">›</button></div>
    <div class="free-quick-row" data-quick-paint><label>色<select data-quick-color><option value="blue">青</option><option value="white">白</option><option value="red">赤</option><option value="yellow">黄</option><option value="green">緑</option><option value="black">黒</option></select></label><label>塗る面<select data-quick-face><option value="top">上面</option><option value="north">北面</option><option value="south">南面</option><option value="west">西面</option><option value="east">東面</option></select></label></div>
    <label class="free-quick-amount" data-quick-vehicle>練る量<select data-quick-amount><option value="1">1杯</option><option value="4" selected>4杯</option><option value="8">8杯</option></select></label>
    <p data-quick-cost></p>
   </div><div class="free-primary-actions">
   <button data-free="access">階段で土台に上がる</button><button data-free="frame">型枠を組む</button><button data-free="unframe">空の型枠を回収</button><button data-free="pour">生コンを注ぐ（1/4杯）</button><button data-free="finish">コテでならす</button><button data-free="cure">生コンを固める</button><button data-free="demold">型枠を外して完成</button><button data-free="mix">ドラムで練る（5秒）</button><button data-free="load">バケツに1杯汲む</button><button data-free="legs">支持脚を展開する</button><button data-free="prime">ホースに送る（1/4杯）</button><button data-free="roller">ローラーで塗る</button>
   <button data-free="supply">工房の原料を車へ積む</button><button data-free="return">バケツの残りを車へ戻す</button><button data-free="connect">ミキサーとの接続を切り替える</button><button data-free="drain">ホースの残りを回収</button><button data-ui="quick-stencil">型紙で塗る</button><button data-ui="settings" aria-haspopup="dialog">道具を選ぶ</button>
  </div><p id="free-action-help" data-pour-reason role="status"></p></div>
 </section>
 <div class="free-work-watch" data-work-watch hidden><div data-work-description role="status"><strong>作業中</strong><span data-work-phase></span></div><section class="free-hose-meter" data-hose-meter aria-label="ホースの生コン移動" hidden><div class="free-hose-heading"><strong data-hose-title role="status"></strong><span data-hose-percent aria-hidden="true"></span></div><progress data-hose-progress max="1" value="0" aria-label="生コン移動の進み具合"></progress><span data-hose-amount></span><small data-hose-stock></small></section></div>
 <button class="free-stop" data-free="stop" hidden>作業を止める</button>
 <div class="free-sheet-overlay" data-overlay hidden><section class="free-sheet" data-play-sheet role="dialog" aria-modal="true" aria-label="施工メニュー" tabindex="-1">
  <header><h2 data-sheet-title>道具箱</h2><button data-ui="close" aria-label="メニューを閉じて現場へ戻る">現場へ戻る</button></header>
  <nav class="free-toolbox-tabs" aria-label="道具箱の中身"><button data-toolbox="build">型枠</button><button data-toolbox="vehicle">車と材料</button><button data-toolbox="paint">ペンキ</button></nav><div class="free-sheet-scroll">
   <section data-sheet-content="camera"><p>目線、モンスターを上から見る視点、施工全体の視点を選べます。画面をドラッグ・スライドして見回せます。</p>${Object.entries(CONCRETE_CAMERA_MODES).map(([id,label])=>'<button data-camera-mode="'+id+'" aria-pressed="false">'+label+'</button>').join('')}<button data-ui="camera-reset">今の視点の向きを戻す</button><p>目線と上からの視点は移動に追従します。施工全体の視点は、自動作業中も構図を保ちます。</p></section>
   <section data-sheet-content="build"><div data-design><p></p><div class="free-grid" data-shape></div><label>高さ <select data-height><option value="2">低めの床</option><option value="4">段差・縁どり</option><option value="8">花壇・低い壁</option></select></label><label>土台の高さ <select data-foundation-height><option value="auto">地面に合わせる</option><option value="2">高さ2</option><option value="4">高さ4</option><option value="8">高さ8</option></select></label><button data-ui="ground">地面と土台を確認する</button><p data-ground-status role="status">選んだ場所の地面・穴・障害物を確認できます。</p><button data-free="foundation">仮設土台を設置する</button><button data-free="unfoundation" data-tone="caution" hidden>仮設土台を回収する</button></div>
    <div data-placing><p>注ぐマスを選びます。数字は現在量／満杯の量（杯）です。</p><div class="free-grid" data-cells></div></div><p data-build-help>形を選んだら現場へ戻り、手もとの道具でつくりましょう。</p>
   </section>
   <section data-sheet-content="vehicle"><h3>材料の準備</h3><label>用意する量 <select data-amount><option value="1">1杯</option><option value="4" selected>4杯</option><option value="8">8杯</option></select></label>
    <h3>ポンプのホース</h3><p>ポンプ車は支持脚を出し、近くのミキサー車と接続します。接続・送液・回収は、現場の「車両」からすぐ操作できます。徒歩ではホースの外側へ回り込んでください。通路を空ける時は残りを回収してから接続を外します。</p>
    <h3>広い型枠へ注ぐには</h3><p>車は作業台と階段の外側に停め、届くマスから注ぎましょう。遠いマスへは反対側へ停め直して注げます。移動前にホースの残りを回収し、接続を外して支持脚をしまいます。仕上げの前には、車を離して歩く通路を空けましょう。</p>
    <h3>坂道から現場へ</h3><p>緩やかな坂は走れます。急坂や段差で止まったら、来た方向へ戻りましょう。練る・注ぐ・支持脚を出す操作は、6輪すべてが平らな地面に乗ってから。坂の途中では停めず、階段と帰り道も空けてください。</p>
   </section>
   <section data-sheet-content="paint" data-paint-menu><label>完成作品 <select data-work></select></label><label>マス <select data-paint-cell></select></label><label>面 <select data-face><option value="top">上面</option><option value="north">北面</option><option value="south">南面</option><option value="west">西面</option><option value="east">東面</option></select></label><label>色 <select data-color><option value="blue">青</option><option value="white">白</option><option value="red">赤</option><option value="yellow">黄</option><option value="green">緑</option><option value="black">黒</option></select></label><div class="free-paint-palette" role="group" aria-label="ペンキの色">${[['blue','青','#4a9bea'],['white','白','#fffaf0'],['red','赤','#df6262'],['yellow','黄','#f5cf5a'],['green','緑','#6ac79a'],['black','黒','#263441']].map(([id,label,color])=>`<button data-paint-color="${id}" aria-pressed="false" style="--paint-color:${color}"><i aria-hidden="true"></i>${label}</button>`).join('')}</div>
    <details class="free-menu-group free-stencil-controls"><summary>型紙で模様を塗る</summary><label>模様 <select data-stencil>${STENCIL_TEMPLATES.map(t=>`<option value="${t.id}">${t.label}</option>`).join('')}</select></label><label>向き <select data-stencil-turn><option value="0">0°</option><option value="1">90°</option><option value="2">180°</option><option value="3">270°</option></select></label><div class="free-stencil-preview" data-stencil-preview role="img" aria-label="型紙の塗る範囲">${Array.from({length:16},(_,i)=>`<i data-stencil-pixel="${i}" aria-hidden="true"></i>`).join('')}</div><p data-stencil-guide></p><p data-stencil-cost></p><button data-ui="stencil-paint">型紙で塗る</button></details>
    <p>ローラーはこの面全体を塗ります。刷毛は下のマスをなぞり、指を離すと塗りはじめます。共通の作業台があれば、同じ床と階段で塗ります。足場はメニューから片付けられます。作品の周りに通路を空けてください。</p><div class="free-grid free-brush" data-brush aria-label="刷毛で塗る範囲"></div><p data-paint-cost></p><button data-free="undo" data-tone="caution">直前の塗装を取り消す</button>
   </section>
   ${freeWorkEditorTemplate()}
   <section data-sheet-content="menu">
    <details class="free-menu-group"><summary>道具箱</summary><p data-toolkit-summary></p><p data-toolkit-detail style="white-space:pre-line"></p><p>道具は再利用できます。塗料や生コンは、使った分だけ減ります。</p></details>
    <p class="free-menu-intro">メニューを開くと移動は止まります。生コンを練る・固める時間も止めたい時は「一時停止」を押してください。</p>
    <div class="free-menu-grid"><button data-free="pause">一時停止</button><button data-free="leave">保存して工事現場へ</button></div>
    <h3>作品と現場</h3><div class="free-menu-grid"><button data-ui="works" aria-haspopup="dialog">作品を移動・保管</button><button data-free="next">次の場所でつくる</button></div>
    <h3>保存</h3><p>作品と材料は自動保存されます。</p><div class="free-menu-grid"><button data-free="save">今の作業を保存</button><button data-free="export">バックアップを保存</button></div><p data-stock-detail></p><p data-history-status role="status"></p><button data-free="retry" hidden>保存をもう一度確認</button>
    <details class="free-menu-group"><summary>片付け・回収</summary><p>作品を変える操作は、内容を確認してから実行します。</p><button data-ui="clear-platform" data-tone="caution" hidden>作業台と階段を片付ける</button><button data-free="recover" data-tone="caution">固める前の生コンを回収</button></details>
    <details class="free-menu-group"><summary>動けなくなったら</summary><p>救助を呼ぶと安全な地面へ戻れます。作品・材料・車両は残ります。車に乗っている時は、その場に車を残して降ります。</p><button data-free="evacuate">救助を呼ぶ</button></details>
    <details class="free-menu-group"><summary>操作のヒント</summary><p>スマホは左の丸いパッドで移動、右のダッシュを押しながら走ります。車では加速になります。指を離すと止まります。</p><p>PCはWASD。移動キーを素早く2回押し、2回目を押し続けると速く移動します。</p><p>「視点」でカメラを選び、画面をドラッグ・スライドして見回せます。上／Wが見ている方向です。作業モードはタップか左右スライドで切り替えます。PCはモード上でShift＋左右キー。</p><p>運転席横の目印に立つと、乗車ボタンが出ます。</p></details>
   </section>
  </div>
 </section></div>
 <div class="free-confirm-overlay" data-confirm hidden role="alertdialog" aria-modal="true" aria-label="作業内容の確認"><section class="free-confirm-card"><h2 data-confirm-title>作業内容の確認</h2><p></p><button data-free="confirm">この内容で実行する</button><button data-free="dismiss">やめる</button></section></div>
`;}
