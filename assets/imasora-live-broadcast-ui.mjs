import{createLiveBroadcast,LIVE_WINDOW_TITLE}from'./imasora-live-broadcast-obs.mjs';
import{createLiveOutput,createLiveOutputAudio}from'./imasora-live-broadcast-output.mjs';
export function createLiveBroadcastUI({canvas,audio,captureCanvas,onLayout,onScreenViews,onOpen=()=>{},onClose=()=>{},onOutput=()=>{},documentTarget=document,windowTarget=window,makeSocket}={}){
 const doc=documentTarget,style=doc.createElement('style');style.textContent=`.game-hud{z-index:11}.imasora-live-open,.imasora-live-settings{padding:9px 14px;border:1px solid #c8e4e7;border-radius:15px;background:#e3f4ee;color:#184955;font:700 14px system-ui;min-height:44px}.imasora-live-open{margin-left:auto;margin-right:8px}.imasora-live-open[data-state=live]{background:#a72d4e;color:white}.imasora-live-open[data-state=unknown],.imasora-live-open[data-state=reconnecting]{background:#ffeab0}.imasora-live-panel{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;border:0;place-items:center;background:transparent;padding:14px;box-sizing:border-box}.imasora-live-panel[open]{display:grid}.imasora-live-panel::backdrop{background:#142b4055}.imasora-live-card{width:min(100%,480px);max-height:calc(100dvh - 28px);overflow:auto;box-sizing:border-box;background:linear-gradient(145deg,#f8fcf1,#d8eeef);border:2px solid #fff;border-radius:24px;padding:20px;color:#173e4d;box-shadow:0 12px 40px #172b4966;font:15px system-ui}.imasora-live-card h2{margin:0 0 12px;font-size:22px}.imasora-live-card p{line-height:1.6;margin:10px 0}.imasora-live-card button{font:700 15px system-ui;padding:11px 16px;margin:4px;border:1px solid #c0dbda;border-radius:14px;background:#fff7d7;color:#234552;min-height:44px}.imasora-live-card button:disabled{opacity:.5}.imasora-live-card label{display:block;margin:12px 0}.imasora-live-card input,.imasora-live-card select{display:block;width:100%;box-sizing:border-box;padding:10px;font:16px system-ui;border:1px solid #a3c7c9;border-radius:10px}.imasora-live-card summary{cursor:pointer;padding:10px 0}.imasora-live-card ol{padding-left:22px;line-height:1.7}.imasora-live-card a{color:#185879}.imasora-live-status{padding:10px;border-radius:12px;background:#ffffffb8}.imasora-live-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.imasora-live-hero{background:#236d79!important;color:white!important;width:100%;margin:4px 0!important}`;doc.head.append(style);
 const button=doc.createElement('button');button.className='imasora-live-open';button.textContent='配信';button.id='live-open';button.title='ゲームをライブ配信';button.dataset.state='disconnected';button.dataset.owned='false';canvas.dataset.liveState='disconnected';const settings=doc.createElement('button');settings.textContent='配信の設定';settings.className='imasora-live-settings';settings.id='live-settings';
 const panel=doc.createElement('dialog');panel.className='imasora-live-panel';panel.setAttribute('aria-labelledby','live-title');panel.innerHTML=`<section class="imasora-live-card"><div class="imasora-live-top"><h2 id="live-title">ゲームを配信</h2><button data-close>閉じる</button></div><p class="imasora-live-status" role="status" data-status>配信はまだ始まっていません</p><p class="sharing-inline-notice">公開前に、音楽の権利・顔や居場所の映り込み・公開範囲・年齢条件を確認。<a href="./life-quest-walk.html?from=sharing-guidelines&revision=1210s#sharing-guidelines" target="_blank" rel="noopener noreferrer">配信・投稿のルール</a></p><button class="imasora-live-hero" data-action disabled>OBSに接続してください</button><details open><summary>PC：初回の準備</summary><ol><li>${onLayout?'<label>配信の映像<select data-layout><option value="multi">3視点を同時に映す</option><option value="single">操作中の視点だけ映す</option></select></label>':''}<button data-output>ゲーム配信用画面を開く</button></li><li>OBSで専用シーンを作り、「ウィンドウキャプチャ」に<br><b>イマソラーズウォーク｜ゲーム配信用画面</b>を選ぶ。</li><li>OBSにYouTube・Twitchなどの配信先を設定。<br>「ツール → WebSocketサーバー設定」で認証付き接続を有効にする。</li></ol><label>OBSの接続ポート<input data-port type="number" min="1" max="65535" value="4455" inputmode="numeric"></label><label>OBSの接続パスワード<input data-password type="password" autocomplete="off" placeholder="OBSに表示された接続用パスワード"></label><button data-connect>OBSに接続</button><p>パスワードは保存しません。接続後は画面上の「配信」から開始・停止できます。</p><a href="https://obsproject.com/kb/window-capture-sources" target="_blank" rel="noopener noreferrer">OBS公式の画面設定</a></details><details><summary>iPhone・Androidで配信する</summary><ol><li>Streamlabsなどの配信アプリで配信先を連携。</li><li>アプリの「画面共有」から配信開始。</li><li>このゲームへ戻り、そのまま遊ぶ。${onScreenViews?'<br><button data-screen-views aria-pressed="false">補助映像を表示</button><br>操作中の画面に、相手側と引きの映像を追加します。':''}</li></ol><p>スマホの開始・停止は配信アプリ側で行います。ゲームから配信状態を取得できないため、LIVE表示は出しません。</p><a href="https://support.streamlabs.com/hc/en-us/articles/360012057413-Mobile-Streaming-FAQ" target="_blank" rel="noopener noreferrer">スマホ配信の公式手順</a></details><p>ゲーム配信用画面には操作ボタンや設定欄を映しません。ゲーム音・マイクの音量はOBSで最後に確認してください。スマホの画面共有では通知や他アプリも映る場合があります。通知を非表示にし、空を撮影する前に配信を一時停止してください。</p></section>`;doc.body.append(panel);if(windowTarget.matchMedia?.('(pointer: coarse)').matches){const details=panel.querySelectorAll('details');details[0].open=false;details[1].open=true;}const q=s=>panel.querySelector(s);let current={state:'disconnected',busy:false,owned:false},opener=null,panelGeneration=0,screenViews=false;
 const labels={disconnected:'配信はまだ始まっていません',connecting:'OBSへ接続中',ready:'準備完了：開始するまで配信されません',starting:'配信を開始しています',live:'LIVE：OBSで配信中',stopping:'配信を停止しています',reconnecting:'OBSで再接続中',unknown:'配信状態が不明です。OBSで確認してください',external:'OBSで別の配信が進行中です'};
 let output;const controller=createLiveBroadcast({makeSocket,outputReady:()=>output.ready,onChange:info=>{current=info;button.dataset.state=info.state;button.dataset.owned=String(!!info.owned);button.textContent=info.owned&&info.connected?'■ 停止':info.state==='ready'?'配信':info.state==='unknown'||info.state==='reconnecting'?'状態確認':'配信';button.disabled=info.busy;q('[data-status]').textContent=info.notice||labels[info.state]||'OBSで状態を確認してください';q('[data-action]').textContent=info.owned?'配信を停止する':info.state==='ready'?'配信を始める':'OBSに接続してください';q('[data-action]').disabled=info.busy||(!info.owned&&info.state!=='ready')||!info.connected;q('[data-connect]').disabled=info.busy;canvas.dataset.liveState=info.state;}});
 output=createLiveOutput({canvas,captureCanvas,windowTarget,makeAudio:()=>createLiveOutputAudio(audio),onLost:()=>controller.outputLost()});
 function open(trigger){
  if(panel.open)return;
  panelGeneration++;
  opener=trigger;
  onOpen();
  panel.showModal();
  q('[data-close]').focus({preventScroll:true});
 }
 function close(){
  if(!panel.open)return;
  panelGeneration++;
  q('[data-password]').value='';
  panel.close();
  const trigger=opener;
  opener=null;
  trigger?.focus({preventScroll:true});
  onClose();
 }
 async function action(trigger){
  const generation=panelGeneration;
  const ok=current.owned?await controller.stop():await controller.start();
  if(generation!==panelGeneration)return;
  if(ok)close();
  else open(trigger);
 }
 button.onclick=()=>{if(current.owned||current.state==='ready')void action(button);else open(button);};
 settings.onclick=()=>open(settings);
 q('[data-close]').onclick=close;
 q('[data-action]').onclick=()=>void action(opener);
 panel.addEventListener('cancel',e=>{e.preventDefault();close();});
 if(onLayout)q('[data-layout]').onchange=e=>onLayout(e.target.value);
 if(onScreenViews){
  const toggle=q('[data-screen-views]');
  toggle.onclick=()=>{
   try{
    screenViews=onScreenViews(!screenViews);
    toggle.setAttribute('aria-pressed',String(screenViews));
    toggle.textContent=screenViews?'補助映像を隠す':'補助映像を表示';
    close();
   }catch(e){q('[data-status]').textContent=e.message;}
  };
 }
 q('[data-output]').onclick=()=>{try{audio.activate();output.open();onOutput();q('[data-status]').textContent='配信用画面を開きました。OBSのウィンドウキャプチャで選んでください。';}catch(e){q('[data-status]').textContent=e.message;}};
 q('[data-connect]').onclick=async()=>{const password=q('[data-password]').value;q('[data-password]').value='';await controller.connect({port:q('[data-port]').value,password});};for(const type of['keydown','keyup'])panel.addEventListener(type,e=>e.stopPropagation());
 const warnClose=e=>{if(current.owned){e.preventDefault();e.returnValue='';}};windowTarget.addEventListener('beforeunload',warnClose);const cleanup=e=>{if(e?.persisted)return;output.close();controller.disconnect();};windowTarget.addEventListener('pagehide',cleanup);
 return{button,settings,update(text){output.update(text);canvas.dataset.liveOutput=output.opened?(output.ready?'ready':'waiting'):'closed';},dispose(){panelGeneration++;cleanup();windowTarget.removeEventListener('pagehide',cleanup);windowTarget.removeEventListener('beforeunload',warnClose);panel.remove();button.remove();settings.remove();style.remove();},controller,output};
}
