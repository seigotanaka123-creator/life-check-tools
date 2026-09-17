import {createOrbitLook} from './imasora-world-look-controls.js?v=492';
import {readyExcavation,beginOneTouch,stepOneTouch,stopOneTouch,allowedDigGuide} from './imasora-construction-excavator-one-touch.js?v=486';
import {createExcavationKeyboard,EXCAVATION_KEYS} from './imasora-construction-excavation-keyboard.js?v=488';
import {createExcavationLedgerView} from './imasora-construction-excavation-ledger-view.js';
import {excavationFrameBudget} from './imasora-construction-excavation-frame.js';
import {createExcavationPreviewController} from './imasora-construction-excavation-preview-controller.js?v=482';
import {createExcavationPreviewModel,updateExcavationPreviewModel,disposeExcavationPreviewModel} from './imasora-construction-excavation-preview-model.js';
import * as THREE from './three.module.min.js';
import {loaderDrivingInput} from './imasora-construction-loader-physics.js';
import {totals,excavatorActorPose,armPose,scoopTargets} from './imasora-construction-excavator.js';
import {buildProgress} from './imasora-construction-excavator-build.js';
import {createContactRestoreView} from './imasora-construction-excavation-restore-view.js';
import {EXCAVATION_YARDS,EXCAVATION_GATE,chooseExcavationYard,excavationOpening,excavationReserved,excavationEntry,excavationCanLeave,enterExcavation,leaveExcavation,initialContactWorldExcavation,stepWorldExcavation,actWorldExcavation} from './imasora-construction-world-excavation.js';
import {createWorldExcavationModel,updateWorldExcavationModel,disposeWorldExcavationModel,EXCAVATION_FENCES} from './imasora-construction-world-excavation-model.js?v=487';

export function createWorldExcavationController({state,scene,camera,character,shadow,canvas,clearInput,onExit,readout,persistence=null}){
  const orbit=createOrbitLook();
  let work=initialContactWorldExcavation(),site=-1,root=null,active=false,paused=false,planning=null,token=0,acc=0,ui=0,phase=0,view=0,roof=false,slow=false,issue='';
  work=readyExcavation(work);
  let sequence=null,forecastModel=null;
  const initial=persistence?.initial;let pendingResume=!!initial;if(initial){({work,site,sequence}=initial);paused=true;}
  let planTimer=null,pauseReason='一時停止中。';
  const keyboard=createExcavationKeyboard(),keys=keyboard.keys,held=new Map(),taps=new Map(),inert=new Map(),ray=new THREE.Raycaster();
  const panel=document.createElement('section');panel.className='world-excavation-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場のショベルカー');
  panel.innerHTML=`<header><strong>ショベルカー v492</strong><span>練習・保存なし</span><output class="we-load" aria-label="バケットの積載"></output><button data-action="begin">ショベル作業に入る</button></header>
    <p class="we-now" role="status"></p>
    <div class="we-active" hidden>

      <div class="we-move"><button data-hold="left">左へ</button><button data-hold="forward">前へ</button><button data-hold="right">右へ</button><button data-hold="back">後ろへ</button><button data-hold="brake">停止</button></div>
      <div class="we-arm" role="group" aria-label="作業操作" hidden><button data-hold="slew-left" aria-label="左旋回" aria-keyshortcuts="A" title="A：押している間、左へ旋回">左旋回 <kbd aria-hidden="true">A</kbd></button><button data-hold="slew-right" aria-label="右旋回" aria-keyshortcuts="D" title="D：押している間、右へ旋回">右旋回 <kbd aria-hidden="true">D</kbd></button><button data-action="scoop" aria-label="すくう" aria-keyshortcuts="W" title="W：1回押すと、すくってブームを上げる">すくう <kbd aria-hidden="true">W</kbd></button><button data-action="dump" aria-label="こぼす" aria-keyshortcuts="S" title="S：1回押すと、こぼして基本姿勢へ戻る">こぼす <kbd aria-hidden="true">S</kbd></button></div>
      <div class="we-quick" role="group" aria-label="モード・視点"><button data-action="work">作業モード</button><button data-action="camera">視点：斜め後ろ</button><button data-action="pause">一時停止</button></div>
      
      <button class="we-stop" data-action="stop" hidden>自動操作を止める</button>
      <div class="we-actions"><button data-action="interact">運転席に乗る</button><button data-action="jump">ジャンプ</button></div>
      <div class="we-forecast"><button data-action="prediction" aria-pressed="true">予測表示：ON</button><span class="we-preview" role="status"></span></div>
      <details class="we-options"><summary>詳細・保存</summary><div class="we-details"><p class="we-message"></p><div class="we-stats"></div><p class="we-preview-detail"></p><p class="we-key-help" hidden>W・S：1回押す　A・D：長押しで旋回</p><footer><button data-action="entry-view">入口方向を見る</button><button data-action="bucket-view">バケットを横から見る</button><button data-action="slow">動作：通常</button><button data-action="roof">屋根を透かす</button><button data-action="export">作業を書き出す</button><button data-action="restore">バックアップを読み込む</button><button data-action="leave">工事現場の徒歩へ戻る</button></footer></div></details>
    </div>`;
  canvas.parentElement.append(panel);const b=a=>panel.querySelector(`[data-action="${a}"]`),q=s=>panel.querySelector(s);
  const forecast=createExcavationPreviewController({
    createWorker:()=>new Worker(new URL('./imasora-construction-excavation-preview-worker.js',import.meta.url),{type:'module'}),
    onChange(s){if(forecastModel)updateExcavationPreviewModel(forecastModel,s.result);refresh();}
  });
  const restoreUI=createContactRestoreView({panel,current:()=>work,site:()=>site,
    pause(){cancelPlan();forecast.release();clear();paused=true;pauseReason='バックアップ操作のため一時停止中。';},
    replace(next){sequence=null;work=next;acc=0;issue='';render(0);},onClose(){refresh();}});
  const snapshot=()=>({work,sequence,site}),locked=()=>!!(persistence?.busy||persistence?.blocked);
  const pauseForSave=()=>{cancelPlan();forecast.release();clear();paused=true;acc=0;pauseReason='保存・書出のため一時停止中。';};
  let ledgerUI=null;if(persistence){panel.querySelector('header strong').textContent='ショベルカー v492';panel.querySelector('header span').textContent='土の保存・再開の接続確認';b('export').hidden=true;b('restore').hidden=true;ledgerUI=createExcavationLedgerView({panel,session:persistence,snapshot,pause:pauseForSave,refresh});q('.we-details').append(q('.we-ledger'));}
  // Keep the world's viewport drag handler from stealing button pointerup/click.
  for(const type of['pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  function clear(){held.clear();keyboard.clear();taps.clear();clearInput();panel.querySelectorAll('.held').forEach(e=>e.classList.remove('held'));}
  function cancelPlan(){token++;clearTimeout(planTimer);planTimer=null;planning?.terminate();planning=null;work={...work,guide:null};}
  const emergency=document.getElementById('emergencyEscapeButton'),emergencyParent=emergency?.parentElement,emergencyNext=emergency?.nextSibling;let pageScroll=0;
  function owns(yes){orbit.reset();if(yes){pageScroll=window.scrollY;if(emergency)q('.we-options footer').append(emergency);}else if(emergency&&emergencyParent){emergencyParent.insertBefore(emergency,emergencyNext?.parentNode===emergencyParent?emergencyNext:null);}
    document.body.classList.toggle('world-excavation-playing',yes);if(!yes)window.scrollTo(0,pageScroll);if(yes){for(const e of document.querySelectorAll('.world-toolbar,.control-card')){inert.set(e,e.inert);e.inert=true;}}else{for(const[e,v]of inert)e.inert=v;inert.clear();}canvas.parentElement.classList.toggle('world-excavation-operating',yes);}
  q('.we-options').addEventListener('toggle',()=>{if(active&&q('.we-options').open){clear();paused=true;pauseReason='詳細を確認するため一時停止中。';refresh();}});
  const position=()=>({x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading});
  function eligible(){return root&&state.map==='construction'&&!state.ufoBoarded&&!state.falling&&excavationEntry(site,position());}
  function begin(){if(active||!eligible()||locked())return;try{if(!pendingResume)work=enterExcavation(work,site,position());pendingResume=false;active=true;paused=!!persistence;issue='';clear();owns(true);render(0);refresh();}catch(e){issue=e.message;refresh();}}
  function leave({force=false,then=null}={}){
    if(!active){then?.();return true;}try{
      const result=leaveExcavation(work,{force});restoreUI.close();cancelPlan();forecast.release();work=result.work;active=false;paused=true;clear();owns(false);scene.add(character);character.visible=true;shadow.visible=true;
      const [x,z]=EXCAVATION_YARDS[site],p=result.position;state.position.set(x+p.x,0,z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;
      for(const f of character.userData.walkRig?.feet||[])f.part.position.copy(f.basePosition);
      onExit();refresh();then?.();return true;
    }catch(e){issue=e.message;refresh();return false;}
  }
  function requestPlan(action='build-cycle'){
    if(planning||sequence||!active||paused||work.action||work.loader.mode!=='working')return;clear();const worker=new Worker(new URL('./imasora-construction-excavator-planner-worker.js',import.meta.url),{type:'module'}),id=++token;planning=worker;
    worker.onmessage=({data})=>{worker.terminate();if(id!==token||!active)return;clearTimeout(planTimer);planTimer=null;planning=null;work=allowedDigGuide(data.guide)?{...work,guide:data.guide,message:data.message}:{...work,guide:null,message:'アーム−30°の制限を越える運搬経路のため停止しました。土は保持しています。位置や姿勢を調整してください。'};refresh();};
    worker.onerror=()=>{if(id!==token||planning!==worker)return;cancelPlan();issue='経路計算を中止しました。手動操作は使えます。';refresh();};
    planTimer=setTimeout(()=>{if(id!==token)return;cancelPlan();issue='安全な経路の計算を時間内に終えられませんでした。土は保持しています。旋回や走行モードで位置・向きを変えて再度お試しください。';refresh();},8000);
    worker.postMessage({state:work,action});refresh();
  }
  function action(a){
    if(a==='begin'){begin();return;}if(!active||locked())return;
    if((a==='scoop'||a==='dump')&&(paused||sequence||planning||work.action||work.loader.transition||work.loader.mode!=='working'||(a==='scoop'?work.load>0:!work.load)))return;
    clear();issue='';
    if(a==='prediction'){forecast.setEnabled(!forecast.enabled);refresh();return;}
    if(a==='camera'){orbit.reset();view=(view+1)%4;refresh();return;}if(a==='entry-view'){orbit.reset();view=2;refresh();return;}if(a==='bucket-view'){orbit.reset();view=4;refresh();return;}if(a==='slow'){slow=!slow;refresh();return;}if(a==='roof'){roof=!roof;refresh();return;}
    if(a==='pause'){cancelPlan();paused=!paused;pauseReason='一時停止中。';refresh();return;}if(a==='export'){restoreUI.show({exportCurrent:true});refresh();return;}if(a==='restore'){restoreUI.show();refresh();return;}if(a==='leave'){leave();return;}
    if(a==='stop'){forecast.invalidate();cancelPlan();sequence=null;work=stopOneTouch(work);refresh();return;}if(paused)return;
    if(sequence)return;forecast.invalidate();cancelPlan();if(a==='jump')taps.set('jump',.16);else if(a==='scoop'||a==='dump')({work,sequence}=beginOneTouch(work,a));else work=actWorldExcavation(work,a);if(a==='work'&&work.loader.mode==='working'&&!work.action)work={...work,message:'「すくう」1回で基本姿勢→ブーム33°→アーム寄せ→すくい込み→バケットを24°まで閉じる→ブーム74°へ持上げ。こぼした後は基本姿勢へ戻ります。'};refresh();
  }
  panel.querySelectorAll('[data-action]').forEach(e=>e.onclick=()=>action(e.dataset.action));
  for(const e of panel.querySelectorAll('[data-hold]')){
    e.onpointerdown=event=>{if(!active||paused||locked()||sequence||work.action||work.loader.transition)return;event.preventDefault();forecast.invalidate();cancelPlan();held.set(event.pointerId,e.dataset.hold);e.setPointerCapture(event.pointerId);taps.set(e.dataset.hold,.15);e.classList.add('held');};
    for(const type of['pointerup','pointercancel','lostpointercapture'])e.addEventListener(type,event=>{held.delete(event.pointerId);e.classList.remove('held');});
    e.onclick=event=>{if(event.detail===0&&active&&!paused&&!locked()&&!sequence&&!work.action&&!work.loader.transition){forecast.invalidate();cancelPlan();taps.set(e.dataset.hold,.16);}};
  }
  const textEntry=e=>!!e.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
  addEventListener('keydown',e=>{
    if(!active)return;
    if(restoreUI.open||textEntry(e)){e.stopImmediatePropagation();return;}
    if(!EXCAVATION_KEYS.includes(e.code))return;e.stopImmediatePropagation();
    const modified=e.ctrlKey||e.altKey||e.metaKey||e.isComposing;
    if(!modified&&!(e.code==='Space'&&e.target.closest?.('button,summary')))e.preventDefault();
    else return;
    const command=keyboard.press(e.code,{mode:work.loader.mode,repeat:e.repeat,blocked:paused||locked()||!!sequence||!!planning||!!work.action||!!work.loader.transition});
    if(command==='hold'){forecast.invalidate();cancelPlan();}
    else if(command)action(command);
  },true);
  addEventListener('keyup',e=>{keyboard.release(e.code);if(active&&EXCAVATION_KEYS.includes(e.code))e.stopImmediatePropagation();},true);
  addEventListener('focusin',e=>{if(active&&textEntry(e))clear();},true);
  document.addEventListener('pointerdown',e=>{if(active&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',()=>{clear();keyboard.reset();if(active){cancelPlan();paused=true;pauseReason='画面からフォーカスが外れたため、安全のため一時停止しています。';refresh();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){forecast.release();clear();keyboard.reset();cancelPlan();if(active){paused=true;pauseReason='別の画面へ切り替えたため、安全のため一時停止しています。';refresh();}}});
  addEventListener('pagehide',()=>{forecast.release();clear();keyboard.reset();cancelPlan();});
  addEventListener('beforeunload',e=>{if(persistence?(persistence.record&&persistence.dirty(snapshot())):(work.revision>0||restoreUI.hasBefore)){e.preventDefault();e.returnValue='';}});
  function input(){
    const actions=[...held.values(),...taps.keys()],on=(a,...k)=>actions.includes(a)||k.some(c=>keys.has(c)),axis=(a,b,...k)=>Number(on(a,k[0],k[2]))-Number(on(b,k[1],k[3]));
    if(work.loader.mode==='working')return{slew:axis('slew-right','slew-left','KeyD','KeyA')};
    if(work.loader.mode==='driving')return loaderDrivingInput(actions.map(a=>a==='forward'?'accelerate':a==='back'?'reverse':a),keys);
    const f=axis('forward','back','KeyW','KeyS','ArrowUp','ArrowDown'),r=axis('right','left','KeyD','KeyA','ArrowRight','ArrowLeft'),yaw=walkYaw();return{x:r*Math.cos(yaw)-f*Math.sin(yaw),z:-r*Math.sin(yaw)-f*Math.cos(yaw),jump:on('jump','Space')};
  }
  const walkYaw=()=>orbit.yaw(view===2?Math.PI:work.loader.vehicle.heading+(view===1?1.5:-2.4));
  function refresh(){
    const nearby=root&&state.map==='construction'&&Math.abs(state.position.x-root.position.x)<430&&Math.abs(state.position.z-root.position.z)<360;
    panel.hidden=!active&&!nearby;canvas.parentElement.classList.toggle('world-excavation-near',!panel.hidden);if(panel.hidden)return;
    if(persistence&&!locked())for(const e of panel.querySelectorAll('[data-action],[data-hold]'))e.disabled=false;
    b('begin').hidden=active;b('begin').disabled=!eligible();b('begin').textContent=work.loader.mode==='foot'?'ショベル作業に入る':'中断した車両作業へ戻る';q('.we-active').hidden=!active||restoreUI.open;
    const s=work,l=s.loader,t=totals(s),p=buildProgress(s),working=l.mode==='working';
    q('.we-load').textContent='積載 '+t.bucket;
    const stage={prepare:'基本姿勢へ',lower:'ブームを下げています',draw:'アームを寄せています',cut:'すくい込み中',close:'バケットを閉じています',lift:'土を持ち上げています',dump:'土をこぼしています',return:'基本姿勢へ戻しています',recover:'接触を避けて姿勢を調整中','dump-clear':'排土姿勢を調整中'};
    q('.we-now').textContent=issue||(!active?'入口からショベル作業を始められます。':paused?'一時停止中｜「再開」で続けられます':sequence?(stage[sequence.phase]||'自動操作中'):planning?'経路を確認中':s.action?'作業中':s.hit||/停止しました|止めました|届きません|すくえなかった/.test(s.message)?'操作を止めています｜詳細で理由を確認':working?(s.load?'積載あり｜旋回して「こぼす」':'作業モード｜旋回して「すくう」'):l.mode==='driving'?'走行モード｜WASDで移動':'徒歩｜車両の横で乗車できます');
    const prediction=forecast.state,result=prediction.result,previewText=q('.we-preview');
    q('.we-forecast').hidden=!working;b('prediction').textContent=forecast.enabled?'予測表示：ON':'予測表示：OFF';b('prediction').setAttribute('aria-pressed',String(forecast.enabled));
    previewText.dataset.kind=result?.kind||'';
    previewText.dataset.elapsedMs=Number.isFinite(prediction.elapsedMs)?String(Math.round(prediction.elapsedMs)):'';
    previewText.textContent=!forecast.enabled?'予測を非表示にしています。':prediction.status==='calculating'?'仕上がりを予測中…（そのまま操作できます）':prediction.status==='error'?'予測を計算できませんでした。姿勢を変えると再計算します。':result?
      `${result.kind==='scoop'?`すくう前の予測｜水色：削れる土 ${result.removed.length}個`:`こぼす前の予測｜橙色：盛土・受け箱 ${result.deposited.length}個`}${result.status==='partial'?'（途中までの予測）':''}。${result.status!=='ready'||(result.kind==='scoop'?!result.removed.length:result.remainingLoad>0)?result.message:''}`:
      sequence||s.action||s.guide?'動作が終わると次の仕上がりを表示します。':s.falling.length?'土が落ち着くと次の仕上がりを表示します。':'操作を止めると、すくう前・こぼす前の仕上がりを表示します。';
    q('.we-preview-detail').textContent=previewText.textContent;previewText.title=previewText.textContent;
    previewText.textContent=!forecast.enabled?'予測は非表示':result?(result.kind==='scoop'?'水色：削れる土 '+result.removed.length+'個':'橙色：盛土・受け箱 '+result.deposited.length+'個')+(result.status==='partial'?'（途中）':''):prediction.status==='calculating'?'予測中…':prediction.status==='error'?'予測エラー（詳細を確認）':'次の仕上がりを予測します';
    q('.we-message').textContent=issue||(!active?(paused?'作業はこの画面内に保持しています。黄色い入口で上のボタンから続きを行えます。':'黄色い入口から作業区画へどうぞ。掘削した土はこの確認画面内だけで扱います。'):paused?pauseReason+'「再開」で作業を続けます。':planning?'接触しない経路を確認中…（補助を止めて手動操作にも戻せます）':s.message);
    q('.we-stats').textContent=`地形 ${t.terrain} ｜積載 ${t.bucket} ｜受け箱 ${t.bin} ｜土の合計 ${t.total} / 1792 ｜掘削 ${p.removed}個`+(working?` ｜根元 ${(s.arm.boom*180/Math.PI).toFixed(0)}°・アーム ${(s.arm.stick*180/Math.PI).toFixed(0)}°・バケット ${(s.arm.curl*180/Math.PI).toFixed(0)}° ｜爪：${scoopTargets(s).length?'土に接触':'未接触'}`:` ｜足元 ${excavatorActorPose(s).y.toFixed(1)}`);
    q('.we-move').hidden=working;q('.we-arm').hidden=!working;q('.we-key-help').hidden=!working;q('.we-actions').hidden=working;
    for(const e of panel.querySelectorAll('[data-hold]'))e.disabled=paused||!!l.transition||(working&&(!!s.action||!!sequence));
    b('pause').textContent=paused?'再開':'一時停止';b('camera').textContent=['視点：斜め後ろ','視点：アーム側','視点：入口方向','視点：区画全体','視点：バケット横'][view];b('slow').textContent=slow?'動作：4倍スロー':'動作：通常';b('roof').textContent=roof?'屋根を戻す':'屋根を透かす';
    b('interact').textContent=l.mode==='foot'?'運転席に乗る':l.transition?'乗り降り中…':'降りる';b('interact').disabled=paused||!!l.transition||working||Math.abs(l.vehicle.speed)>.8;
    b('work').hidden=!['working','driving'].includes(l.mode);b('work').textContent=working?'走行モード':'作業モード';b('work').disabled=paused||!['working','driving'].includes(l.mode)||!!s.action||!!sequence||Math.abs(l.vehicle.speed)>.8;
    b('scoop').disabled=paused||!!s.action||!!sequence||s.load>0;b('dump').disabled=paused||!!s.action||!!sequence||!s.load;
    b('stop').hidden=!working||(!planning&&!s.guide&&!sequence&&!s.action);b('stop').disabled=!planning&&!s.guide&&!sequence&&!s.action;
    b('jump').hidden=l.mode!=='foot';b('jump').disabled=paused||!l.player.grounded;b('leave').disabled=!excavationCanLeave(s);
    if(locked())for(const e of panel.querySelectorAll('[data-action],[data-hold]'))e.disabled=true;
  }
  function render(dt){if(!root)return;updateWorldExcavationModel(root,work,active,roof);if(!active)return;
    const d=root.userData,p=excavatorActorPose(work),seated=['driving','working'].includes(work.loader.mode),onFoot=work.loader.mode==='foot';
    if(seated){d.machine.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+p.x,p.y-d.machine.userData.measurement.footBottom,root.position.z+p.z);character.rotation.set(0,p.heading,0);}
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.heading=p.heading;state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;shadow.visible=false;character.visible=true;
    phase+=dt*9;for(const[i,f]of(character.userData.walkRig?.feet||[]).entries()){f.part.position.copy(f.basePosition);if(!seated&&!paused&&(held.size||keys.size||work.loader.transition))f.part.position.y+=Math.max(0,Math.sin(phase+i*Math.PI))*1.2;}
    if(view===4){const bp=armPose(work),yaw=bp.heading,focus=new THREE.Vector3(root.position.x+bp.wrist.x,bp.wrist.y-22,root.position.z+bp.wrist.z);const angle=orbit.yaw(yaw+Math.PI/2),pitch=orbit.pitch(Math.atan2(25,100));camera.position.copy(focus).addScaledVector(new THREE.Vector3(Math.sin(angle)*Math.cos(pitch),Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)),Math.hypot(100,25));camera.lookAt(focus);readout();return;}
    const v=work.loader.vehicle,wide=view===3,focus=new THREE.Vector3(root.position.x+(wide?0:onFoot?p.x:v.x),onFoot?p.y+22:22,root.position.z+(wide?10:onFoot?p.z:v.z+30));
    const yaw=walkYaw(),pitch=orbit.pitch(wide?1.15:.6),dist=wide?650:onFoot?92:295*Math.max(1,.8/camera.aspect),offset=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));let allowed=dist;
    root.updateMatrixWorld(true);if(onFoot){ray.set(focus,offset);ray.far=dist;const hits=ray.intersectObject(d.terrain);if(hits.length)allowed=Math.max(.5,hits[0].distance-2);}
    if(onFoot&&allowed<20){camera.position.copy(focus);camera.lookAt(focus.clone().add(new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw))));character.visible=false;}
    else{camera.position.copy(focus).addScaledVector(offset,allowed);camera.lookAt(focus);}readout();
  }
  return{look(dx,dy,sensitivity){if(active)orbit.drag(dx,dy,sensitivity);},get active(){return active;},get dirty(){return persistence?(persistence.record&&persistence.dirty(snapshot())):work.revision>0;},begin,leave,
    install({group,blockedAt,reserved,collider}){
      if(active)throw Error('掘削作業を中断してから再構築してください。');forecast.release();disposeExcavationPreviewModel(forecastModel);forecastModel=null;disposeWorldExcavationModel(root);root=null;panel.hidden=true;canvas.parentElement.classList.remove('world-excavation-near');if(state.map!=='construction')return null;
      if(site<0)site=chooseExcavationYard(blockedAt,reserved);if(site<0){issue='既存作品と重ならない空き区画がありません。';return null;}
      const [x,z]=EXCAVATION_YARDS[site];if(blockedAt(x,z,425)||reserved([x,0,z],[720,0,600])){issue='掘削区画が既存作品と重なります。作品を移動せず停止しました。';return null;}
      persistence?.seed(site);ledgerUI?.update();
      root=createWorldExcavationModel();forecastModel=createExcavationPreviewModel();root.add(forecastModel);root.position.set(x,0,z);group.add(root);
      for(const f of EXCAVATION_FENCES)collider(x+f.x,z+f.z,[f.w,f.d],0,'construction-excavation-fence',0,{minY:0,maxY:40,obstacleHeight:40});
      render(0);refresh();return excavationOpening(site);
    },
    overlapsBuild(p,size){return root&&excavationReserved(site,p,size);},
    previewSpawn(){return root?{x:root.position.x+EXCAVATION_GATE.x,z:root.position.z+EXCAVATION_GATE.z,heading:0}:null;},
    update(dt){if(!root||state.map!=='construction')return false;
      // Transfer walking before the user can reach any excavated floor. The
      // original world's infinite y=0 floor never handles the tunnel interior.
      if(!active&&eligible()&&position().z-root.position.z>-218)begin();
      if(active&&!paused&&!locked()&&!document.hidden){try{const frame=excavationFrameBudget(acc,dt,slow);acc=frame.remainder;const frameStarted=performance.now();for(let step=0;step<frame.steps;step++){if(step>0&&performance.now()-frameStarted>8)break;
        if(!planning){if(work.guide?.phase==='plan-haul')requestPlan('plan-haul');else{const mode=work.loader.mode;({work,sequence}=stepOneTouch(work,sequence,input(),1/120));if(mode!==work.loader.mode)clear();}}
        for(const[k,t]of taps){if(t<=1/120)taps.delete(k);else taps.set(k,t-1/120);}
      }}catch(e){cancelPlan();sequence=null;work=stopOneTouch(work);clear();acc=0;paused=true;issue=`安全のため停止：${e.message}`;}}
      else acc=0;
      forecast.update(work,active&&!document.hidden&&!restoreUI.open&&work.loader.mode==='working'&&!work.loader.transition&&!sequence&&!work.action&&!work.guide&&!planning&&!work.falling.length&&!held.size&&!keys.size&&!taps.size);
      render(dt);ui+=dt;if(ui>.12){ui=0;refresh();}return active;
    }
  };
}


