import {createConstructionWalkGait} from './imasora-construction-walk-gait.mjs?v=120fb';
import {constructionWorkAutoSaveKey} from './imasora-construction-autosave-key.mjs?v=120es';
import {waterEditInfo} from './imasora-construction-water-undo.mjs?v=120fb';
import {fieldWorkOverlaps,fieldGroundTravelAllowed,fieldGroundPose,fieldActorPose,fieldGroundBounds} from './imasora-construction-field-contact.mjs?v=120fw';
import {createFrameHeightSampler} from './imasora-construction-frame-height.mjs?v=120ey';
import {createContactReadCache} from './imasora-construction-contact-cache.mjs?v=120ex';
import {nativeDoorTarget,nativeSavedWorkPending} from './imasora-construction-native-door.mjs?v=120fw';
import {constructionOverlayOpen,openConstructionGuide} from './imasora-construction-overlays.mjs?v=120ea';
import {bindTravelBoost} from './imasora-construction-travel-input.mjs';
import {setBoardPrompt} from './imasora-construction-boarding.js';
import {createOrbitLook} from './imasora-world-look-controls.js?v=492';
import {createVehiclePlayView} from './imasora-construction-vehicle-play-view.js?v=120ea';
import {VehicleRestoreSession} from './imasora-construction-vehicle-restore-session.js?v=120fw';
import {createVehicleRestoreView} from './imasora-construction-vehicle-restore-view.js?v=502';
import * as THREE from './three.module.min.js';
import {overlapsWorldYardBuild} from './imasora-construction-world-yard-reservation.js?v=512';
import {createWaterTransportView,updateWaterTransportView} from './imasora-construction-water-transport-view.js?v=120fb';
import {actorPose,boardOption,exitOption,loaderDrivingInput} from './imasora-construction-loader-physics.js?v=120ey';
import {upgradeWaterTruck,transportAvailability,TRANSPORT_OBSTACLES,waterTransportObstacles,transportMaterialObstacles} from './imasora-construction-water-transport.js?v=120fb';
import {constructionMaterialContactVolumes} from './imasora-construction-world-contact.js?v=520';
import {initialWorldWater,WATER_YARDS,worldWaterTotals,waterWarehouseAccess,enterWorldWater,worldWaterAction,advanceWorldWater,flowWorldFieldWater,validateWorldWater} from './imasora-construction-world-water.js?v=120fb';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js?v=120ds';
import {waterCheckpoint} from './imasora-construction-world-water.js?v=120fb';

// Same scene and same Ren as the main world. Only the input/physics owner changes.
export function createWorldWaterController({service,practice=false,preview=false,canResume=()=>true,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,readout,onRestoreRebuild}){
  const gait=createConstructionWalkGait();
  const orbit=createOrbitLook();let menuSaveNote='',restoreSession=null,savedWorkAwaitingResume=false,undoConfirm=false;
  const restoreLocked=()=>!!restoreSession?.locked;
  let work=null,root=null,contactGeometry=null,readFieldSolids=null,fieldHeightAt=null,readContactRevision=null,readGroundRevision=null,contactEpoch=0,renderedWork=null,renderContactKey=null,active=false,busy=false,saving=false,pendingSave=null,lastAutomaticKey='',blocked=false,retryPending=false,expected=null,auto=0,runoffClock=0,ui=0,yaw=Math.PI,view=0,walk=0,idleIssue='';
  const inertState=new Map();
  function ownInput(owns){orbit.reset();
    if(owns){for(const el of document.querySelectorAll('.world-toolbar,.control-card')){inertState.set(el,el.inert);el.inert=true;}}
    else{for(const [el,was]of inertState)el.inert=was;inertState.clear();}
    canvas.parentElement.classList.toggle('world-water-operating',owns);game.setActive(owns);
  }
  const held=new Map(),taps=new Map(),keys=new Set();
  const panel=document.createElement('section');panel.className='world-water-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場の給水車');
  panel.innerHTML=`<header><strong>給水車</strong><span class="ww-mode"></span><button data-action="begin">作業を始める</button></header>
    <p class="ww-message" role="status"></p><div class="ww-stats"></div>
    <div class="ww-active" hidden><div class="ww-pad" aria-label="給水車の操作"><button data-hold="left">左へ</button><button data-hold="accelerate">前へ</button><button data-hold="right">右へ</button><button data-hold="reverse">後ろへ</button><button data-hold="brake">ブレーキ</button><button data-hold="jump">ジャンプ</button></div>
    <div class="ww-work"><div class="ww-water-shape" role="group" aria-label="水の置き方"><button data-action="water-mode" data-mode="block">▣ 水ブロック<small>土1個と同じ大きさ・4L</small></button><button data-action="water-mode" data-mode="basin">◡ 形に合わせて満たす<small>穴の縁まで水をためる</small></button><output class="ww-water-plan" aria-live="polite"></output><progress class="ww-water-progress" max="1" value="0" aria-label="水のたまり具合"></progress></div><button data-action="interact">運転席に乗る</button><button data-action="dispatch">保管庫から32 L出庫</button><button data-action="store">給水槽の32 Lを保管</button><button data-action="source">給水槽から汲む</button><button data-action="pour">受け口へ注ぐ</button><button data-action="returned">回収槽から汲む</button><button data-action="recover">水路の水を回収</button><button data-action="flow">流れを切り替える</button><label>次に注ぐ向き <select aria-label="火星水を注ぐ向き"><option value="4">上 ↑</option><option value="8">下 ↓</option><option value="1">右 →</option><option value="2">左 ←</option><option value="16">奥</option><option value="32">手前</option></select></label></div>
    <footer><button data-action="stop">移送を止める</button><button data-action="camera">視点：追従</button><button data-action="save">作業を保存</button><button data-action="leave">降車して徒歩に戻る</button></footer></div>`;
  canvas.parentElement.append(panel);
  const unloadButton=document.createElement('button');unloadButton.dataset.action='unload';unloadButton.textContent='車載水を給水槽へ戻す';panel.querySelector('[data-action="source"]').after(unloadButton);
  const undoButton=document.createElement('button');undoButton.dataset.action='undo-review';undoButton.textContent='↶ 1つ前にもどす';panel.querySelector('footer').before(undoButton);
  // Do not let the world's drag camera capture pointers intended for work buttons.
  panel.addEventListener('pointerdown',e=>e.stopPropagation());
  panel.addEventListener('pointerup',e=>e.stopPropagation());
  const button=a=>panel.querySelector(`[data-action="${a}"]`),message=panel.querySelector('.ww-message');
  const received=()=>practice?32000:service.constructionStock?.receipts.filter(e=>e.offerId==='mars-water').reduce((n,e)=>n+e.amount,0)||0;
  let travelBoost=null;
  function clear(){travelBoost?.reset();held.clear();taps.clear();keys.clear();clearInput();panel.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  const game=createVehiclePlayView({panel,canvas,clearInput:clear,refresh,prefix:"ww",groups:[{"id":"move","label":"移動","selectors":[".ww-pad"],"hint":"WASD／矢印で移動。同方向を素早く2回で加速（離すと解除）。停車して給水します。"},{"id":"work","label":"給水","selectors":[".ww-water-shape","[data-action=\"source\"]","[data-action=\"pour\"]","[data-action=\"unload\"]","[data-action=\"returned\"]",".ww-work label"]},{"id":"stock","label":"水路・保管","selectors":["[data-action=\"dispatch\"]","[data-action=\"store\"]","[data-action=\"recover\"]","[data-action=\"flow\"]","[data-action=\"stop\"]"]}],quick:["interact","camera","undo-review"]});
  const undoCard=document.createElement('div');undoCard.className='ww-undo-confirm';undoCard.hidden=true;undoCard.setAttribute('role','group');undoCard.setAttribute('aria-label','水の作業をもどす');undoCard.innerHTML='<p></p><button data-action="undo-water">1つ前にもどす</button><button data-action="undo-cancel">やめる</button>';panel.querySelector('.gv-active').append(undoCard);
  const undoStyle=document.createElement('style');undoStyle.textContent='.ww-undo-confirm{grid-row:2;align-self:start;padding:12px;background:#fff5da;color:#304452;border:2px solid #e6c46e;border-radius:16px;pointer-events:auto}.ww-undo-confirm[hidden]{display:none!important}.ww-undo-confirm p{margin:0 0 8px}.ww-undo-confirm button{min-height:44px;margin:3px}.world-water-controls:has(.ww-undo-confirm:not([hidden])) :is(.gv-pages,.gv-quick){display:none}';panel.append(undoStyle);
  if(!practice&&!preview&&service.mode==='live'){
    restoreSession=new VehicleRestoreSession({service,kind:'water',origin:globalThis.location?.origin,getWork:()=>work,getExpectedRevision:()=>expected,
      available:()=>{if(!active||state.map!=='construction')return 'この車両の作業を始めてから復元してください。';if(busy||saving||blocked)return '先に保存の結果を確認してください。';return '';},
      onChange:refresh,onRestored:saved=>{
        if(typeof onRestoreRebuild!=='function')throw Error('区画の再構築が接続されていません。');
        clear();game.pause();scene.add(character);work=structuredClone(saved);work.work=upgradeWaterTruck(work.work);expected=saved.revision;auto=0;savedWorkAwaitingResume=true;retryPending=false;blocked=false;idleIssue='';
        // Keep the input gate paused while rebuilding floors, edges and solids.
        const wasActive=active;active=false;
        try{onRestoreRebuild();if(!root)throw Error('復元した区画を安全に表示できません。');}
        finally{active=wasActive;}
        if(active)work={...work,work:{...work.work,paused:false}};
        orbit.reset();render(0);menuSaveNote='作業を復元しました。一時停止中です。';
      }});
    game.attachRestore(createVehicleRestoreView({menu:game.menu,session:restoreSession,isMenuOpen:()=>game.menuOpen,refresh}));
  }
  function failure(e){clear();blocked=true;retryPending=service.blocked;message.textContent=`停止しました：${e.message||e}`;if(service.blocked)onError(e);refresh();}
  function resumeAvailable(){return !!root&&!active&&savedWorkAwaitingResume&&!practice&&!preview&&service.mode==='live'&&state.map==='construction'&&canResume()&&nativeSavedWorkPending(work);}
  function near(){if(!root||state.map!=='construction'||state.ufoBoarded||Math.abs(state.groundY+state.jumpY)>.5)return false;
    const v=work.work.loader.vehicle;return Math.hypot(state.position.x-root.position.x-v.x,state.position.z-root.position.z-v.z)<=112;}
  function fresh(){
    const saved=service.readConstructionVehicleWork('water');
    if(saved&&!practice){work=structuredClone(saved);expected=saved.revision;lastAutomaticKey=constructionWorkAutoSaveKey(work,view);savedWorkAwaitingResume=!practice&&!preview&&service.mode==='live';}
  }
  const terrainSamples=createFrameHeightSampler((x,z)=>root&&fieldHeightAt?fieldHeightAt(root.position.x+x,root.position.z+z):0),waterGround=terrainSamples.heightAt;
  const contacts=createContactReadCache();
  function externalVolumes(){return contacts.read(readContactRevision?.()??contactEpoch,()=>root?[...(contactGeometry?constructionMaterialContactVolumes([root.position.x,root.position.z],contactGeometry()):[]),...(work.schema===2&&readFieldSolids?readFieldSolids(root.position):[])]:[]);}
  function begin({automatic=false}={}){terrainSamples.reset();contactEpoch++;
    if((!automatic&&!near()&&!resumeAvailable())||busy||saving||blocked||restoreLocked()||active)return;clear();idleIssue='';
    try{
      const resumeSaved=!practice&&!preview&&service.mode==='live'&&service.hasConstructionVehicleWork('water');
      // A saved position/path is not rewritten on entry. Time starts only after
      // the player chooses Resume, leaving time to inspect or undo a restore.
      if(resumeSaved||work.work.loader.mode!=='foot'||work.work.task){work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      else work=enterWorldWater(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading});
      active=true;auto=0;ownInput(true);if(resumeSaved&&!automatic){savedWorkAwaitingResume=true;game.pause();menuSaveNote='保存した作業を一時停止で開きました。「再開」で続けられます。';}render(0);refresh();
    }catch(e){idleIssue=e.message;message.textContent=e.message;}
  }
  async function save({automatic=false}={}){
    if(saving){if(automatic)return false;await pendingSave;if(blocked)return false;return save({automatic});}
    if(!work||busy||blocked||restoreLocked())return false;if(practice)return true;
    if(service.mode==='readonly'){message.textContent='この表示確認では保存しません。';return true;}
    // Capture the physical work and the matching scene together before awaiting.
    // New progress belongs to the next save; an acknowledgement never rewinds it.
    let draft,world,revision,key;
    try{draft=structuredClone(work);world=snapshot();revision=expected;key=constructionWorkAutoSaveKey(draft,view);}
    catch(e){failure(e);return false;}
    menuSaveNote='';saving=true;busy=!automatic;if(!automatic)clear();refresh();
    pendingSave=(async()=>{
      try{await service.flush();const saved=await service.saveConstructionWater(draft,world,revision);expected=saved.revision;lastAutomaticKey=key;auto=0;menuSaveNote='作業を保存しました。';return true;}
      catch(e){failure(e);return false;}finally{busy=false;saving=false;pendingSave=null;refresh();}
    })();return pendingSave;
  }
  async function leave({force=false,then=null}={}){
    if(restoreLocked())return false;
    if(!active){then?.();return true;}if(busy||blocked||restoreLocked())return false;clear();
    const w=work.work;
    if(!force&&(w.loader.mode!=='foot'||w.task||w.air.length||work.delivery)){message.textContent='移送を終え、停車して降車してから徒歩へ戻ってください。';return false;}
    // Checkpoint the operation, not a fabricated dismounted vehicle state.
    // Only the main-world walker returns to safety; the hose, suspended water,
    // loading progress and boarding path resume at the worksite, as soil/timber do.
    render(0);const saved=await save();if(!saved&&!practice)return false;
    work=waterCheckpoint(work);active=false;ownInput(false);scene.add(character);shadow.visible=true;
    const p=force?{x:-260,y:0,z:-190,heading:0}:(work.schema===2?fieldActorPose(work.work.loader,{x:0,z:0},waterGround):actorPose(work.work.loader));
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.jumpCount=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;
    if(work.schema===2)onRestoreRebuild?.();onExit();refresh();then?.();return true;
  }
  async function action(a,value){terrainSamples.reset();contactEpoch++;
    if(a==='begin'){begin();return;}if(!active||busy||blocked||restoreLocked()||!game.allows(a))return;clear();
    if(a==='undo-review'){if(saving||work.work.task||work.work.air.length||work.delivery||!waterEditInfo(work).count)return;undoConfirm=true;refresh();return;}
    if(a==='undo-cancel'){undoConfirm=false;refresh();return;}
    if(undoConfirm&&a!=='undo-water')return;
    if(a==='camera'){orbit.reset();view=(view+1)%3;button('camera').textContent=['視点：追従','視点：横から','視点：上から'][view];return;}
    if(a==='leave'){await leave();return;}if(a==='save'){await save();return;}
    try{const old=work;work=worldWaterAction(work,a,value??(['dispatch','store'].includes(a)?crypto.randomUUID():undefined),received(),externalVolumes(),waterGround);
      if(a==='undo-water'){undoConfirm=false;render(0);await save();}
      if(['dispatch','store'].includes(a)&&old!==work)await save();
    }catch(e){message.textContent=e.message;work={...work,work:{...work.work,message:e.message}};}
    refresh();
  }
  travelBoost=bindTravelBoost({panel,enabled:()=>active&&!busy&&!blocked&&!undoConfirm&&!restoreLocked()&&!game.paused&&!game.menuOpen,context:()=>work?.work?.loader.mode});
  panel.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>void action(b.dataset.action,b.dataset.mode)));
  panel.querySelector('select').addEventListener('change',e=>void action('direction',Number(e.target.value)));
  for(const b of panel.querySelectorAll('[data-hold]')){
    b.addEventListener('pointerdown',e=>{if(!active||busy||blocked||restoreLocked()||game.paused)return;e.preventDefault();held.set(e.pointerId,b.dataset.hold);taps.set(b.dataset.hold,work.work.time+.15);b.setPointerCapture(e.pointerId);b.classList.add('held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{held.delete(e.pointerId);b.classList.remove('held');});
    b.addEventListener('click',e=>{if(e.detail===0&&active&&!busy&&!blocked&&!restoreLocked()&&!game.paused)taps.set(b.dataset.hold,work.work.time+.15);});
  }
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  addEventListener('keydown',e=>{if(!active||e.target.closest?.('dialog[open]'))return;if(game.menuOpen){game.handleKeyDown(e);e.stopImmediatePropagation();return;}if(restoreLocked()){e.preventDefault();e.stopImmediatePropagation();return;}if(game.paused){if(codes.includes(e.code)||e.code==='KeyE'){if(e.code!=='Space'||!e.target.closest('button,summary,select'))e.preventDefault();e.stopImmediatePropagation();}return;}if(codes.includes(e.code)){if(e.target.tagName==='SELECT')return;e.preventDefault();e.stopImmediatePropagation();if(!keys.has(e.code)&&!busy&&!blocked&&!restoreLocked())taps.set(e.code,work.work.time+.15);keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void action('interact');}},true);
  addEventListener('keyup',e=>{keys.delete(e.code);if(e.target.closest?.('dialog[open]'))return;if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  // While this controller owns Ren, unrelated build/camera buttons cannot mutate the scene.
  document.addEventListener('pointerdown',e=>{if(!constructionOverlayOpen()&&active&&!service.blocked&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  function input(){return travelBoost.input(rawInput());}
  function rawInput(){const actions=[...held.values()],pressed=[...keys];for(const [k,t]of taps)if(t>work.work.time)(codes.includes(k)?pressed:actions).push(k);
    if(work.work.loader.mode==='driving')return loaderDrivingInput(actions,pressed);
    const on=(a,...k)=>actions.includes(a)||k.some(x=>pressed.includes(x)),forward=Number(on('accelerate','KeyW','ArrowUp'))-Number(on('reverse','KeyS','ArrowDown')),right=Number(on('right','KeyD','ArrowRight'))-Number(on('left','KeyA','ArrowLeft'));
    const a=orbit.yaw(view===2?Math.PI+.2:work.work.loader.vehicle.heading+(view===1?Math.PI/2:yaw));return{x:right*Math.cos(a)-forward*Math.sin(a),z:-right*Math.sin(a)-forward*Math.cos(a),jump:on('jump','Space')};
  }
  function refresh(){if(!root){panel.hidden=!(active&&restoreLocked());if(!panel.hidden){message.textContent=restoreSession.message;game.refresh({busy:true,blocked:true,context:'stopped',loadText:'停止中',menuHint:restoreSession.message});}return;}
    panel.hidden=!root||state.map!=='construction'||work.schema===2&&!active&&!near()&&!resumeAvailable();if(panel.hidden)return;
    button('begin').hidden=active;button('begin').disabled=(!near()&&!resumeAvailable())||busy||blocked||restoreLocked();button('begin').textContent=resumeAvailable()?'保存した給水を再開':'作業を始める';panel.querySelector('.ww-active').hidden=!active;
    panel.querySelector('.ww-mode').textContent=practice?'貸出32 L・保存しません':service.mode==='readonly'?'表示確認・保存なし':service.mode==='integration'?'本体とは別の接続確認保存':'作業を保存できます';
    button('camera').textContent=['視点：追従','視点：横から','視点：上から'][view];
    const t=worldWaterTotals(work),w=work.work,l=w.loader,a=transportAvailability(w,externalVolumes(),waterGround),lit=n=>(n*.25).toFixed(2);
    panel.querySelector('.ww-stats').textContent=`保管 ${lit(received()/250-work.allocated)} L ｜給水槽 ${lit(t.source)} L ｜車載 ${lit(t.bucket)} L ｜移送 ${lit(t.transit+t.moving)} L ｜現場 ${lit(t.field??0)} L ｜水路・回収 ${lit(t.course+t.returnTank)} L`;
    if(!blocked)message.textContent=busy?'セーブしています…':active?(a.workIssue||w.message):resumeAvailable()?'保存した水と車の位置から続けられるよ。':idleIssue|| (near()?'給水車が近くにいるよ。ドアから乗ってみよう。':work.schema===2?'給水車は駐車場にいるよ。「どの車に乗る？」でドアへ行こう。':'給水車の近くへ行ってみよう。');
    const plan=a.plan,b=w.task?.build?w.waterBuilds?.find(b=>b.id===w.task.build):plan?.build;
    panel.querySelector('.ww-water-plan').textContent=b?(w.task?.type==='build-return'?'回収中':w.task?.type==='build'?'注水中':b.q===b.capacity?'満水！':'できあがりの目安')+' ｜ '+lit(b.q)+' / '+lit(b.capacity)+' L'+(!w.task&&b.q<b.capacity?'（あと '+lit(b.capacity-b.q)+' L）':''):plan?.message||'水の置き方を選んで、注ぐ場所へ向けよう。';
    const meter=panel.querySelector('.ww-water-progress');meter.hidden=!b;meter.value=b?b.q/b.capacity:0;
    for(const el of panel.querySelectorAll('[data-mode]')){el.setAttribute('aria-pressed',String(el.dataset.mode===(w.waterMode??'block')));}
    const off=busy||blocked||restoreLocked()||!!work.delivery;const jumpButton=panel.querySelector('[data-hold=jump]');jumpButton.hidden=l.mode!=='foot';jumpButton.disabled=off||(!l.player.grounded&&(l.player.jumpCount??0)>=3);
    for(const b of panel.querySelectorAll('.ww-active button'))b.disabled=off;
    const obstacles=[...waterTransportObstacles(w),...transportMaterialObstacles(l,externalVolumes())];
    button('interact').textContent=l.mode==='foot'?'乗る':l.mode==='driving'?'降りる':'乗降中…';button('interact').disabled=off||!!w.task||!!w.air.length||!!l.transition||!(l.mode==='foot'?boardOption(l,obstacles):exitOption(l,obstacles));
  setBoardPrompt(button('interact'),l.mode,!button('interact').disabled);
    button('dispatch').disabled=off||!waterWarehouseAccess(work)||received()/250-work.allocated<128||work.allocated+128>768;
    button('store').disabled=off||!waterWarehouseAccess(work)||w.source<128;
    button('source').disabled=off||!a.source;button('returned').disabled=off||!a.returned;button('pour').disabled=off||!a.pourable;
    button('unload').disabled=off||!a.unload;button('pour').textContent=a.plan?(w.waterMode==='basin'?'この穴に注ぐ':'水ブロックを作る'):(a.fieldTarget?'ここへ水を注ぐ':'受け口へ注ぐ');for(const el of panel.querySelectorAll('[data-mode]'))el.disabled=off||!!w.task||!!w.air.length;panel.querySelector('.ww-water-shape').hidden=work.schema!==2;button('returned').textContent=(a.pool||a.buildPool||work.schema===2&&!a.nearReturn)?'近くの水を回収':'回収槽から汲む';
    for(const k of ['flow','recover'])button(k).disabled=off||!a.nearReturn||!a.stopped||!a.idle;
    button('stop').disabled=busy||blocked||restoreLocked()||!w.task;button('save').disabled=busy||blocked||restoreLocked()||practice||service.mode==='readonly';button('save').textContent=practice?'貸出：保存なし':'作業を保存';
    button('leave').disabled=busy||blocked||restoreLocked()||l.player.y>.05||l.mode!=='foot'||!!work.delivery||!!w.task||!!w.air.length;
    const select=panel.querySelector('select');select.value=String(w.direction);select.disabled=off||!!w.task||!!w.air.length;
    const undo=waterEditInfo(work);button('undo-review').textContent='↶ 1つ前にもどす'+(undo.count?'（あと'+undo.count+'回）':'');button('undo-review').disabled=off||saving||!undo.count||undo.pending||!!w.task||!!w.air.length||!!l.transition||Math.abs(l.vehicle.speed)>=.8;
    undoCard.hidden=!undoConfirm;undoCard.querySelector('p').textContent='「'+undo.label+'」の前にもどす？ 水の量と形がもどるよ。';button('undo-water').disabled=off||saving||!undo.count;button('undo-cancel').disabled=busy||blocked;
    game.refresh({busy:busy||restoreLocked(),blocked:blocked||!!restoreSession?.invalid,context:l.mode,loadText:'車載 '+lit(t.bucket)+' L'+(work.schema===2?' ｜地面 '+lit(t.field??0)+' L':''),menuHint:menuSaveNote});
    if(undoConfirm)for(const el of panel.querySelectorAll('button,select'))if(!undoCard.contains(el))el.disabled=true;
    select.closest('label').hidden=work.schema===2&&!a.nearReturn;
  }
  function groundPose(){if(work?.schema!==2||!root)return null;try{return waterGround.groundFrame(work.work.loader.vehicle);}catch{return null;}}
  function render(dt){
    if(!root)return;const key=readContactRevision?.()??contactEpoch;if(!active&&renderedWork===work.work&&renderContactKey===key&&!work.work.water.running&&!root.userData.labAnimating)return;
    const g=groundPose();updateWaterTransportView(root,work.work,dt,{external:externalVolumes(),heightAt:waterGround,ground:g,terrainRevision:readContactRevision?.()});renderedWork=work.work;renderContactKey=key;if(!active)return;
    const l=work.work.loader,pose=work.schema===2?fieldActorPose(l,{x:0,z:0},waterGround,g):actorPose(l),footBottom=root.userData.loader.userData.measurement.footBottom;
    if(l.mode==='driving'){const seat=root.userData.loader.userData.pilotSocket;if(character.parent!==seat)seat.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+pose.x,pose.y-footBottom,root.position.z+pose.z);character.rotation.set(0,pose.heading,0);}
    shadow.visible=false;state.position.set(root.position.x+pose.x,0,root.position.z+pose.z);state.heading=pose.heading;state.groundY=pose.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;
    const strides=gait.update(pose,l.mode==='foot'&&l.player.grounded!==false&&!busy&&!blocked&&!game.paused&&!document.hidden,dt);for(const[i,f]of(character.userData.walkRig?.feet||[]).entries())f.part.position.copy(f.basePosition).y+=strides[i%2];
    const v=l.mode==='foot'?{...l.vehicle,x:pose.x,z:pose.z}:l.vehicle,focus=view===2?new THREE.Vector3(root.position.x+(work.schema===2?v.x:0),25,root.position.z+(work.schema===2?v.z:20)):new THREE.Vector3(root.position.x+v.x,24,root.position.z+v.z),angle=orbit.yaw(view===2?Math.PI+.2:v.heading+(view===1?Math.PI/2:yaw)),pitch=orbit.pitch(view===2?1.1:.48),dist=(view===2?740:245)*Math.max(1,.72/camera.aspect);
    focus.y+=l.mode==='foot'?pose.y:(g?.position[1]??0);camera.position.copy(focus).addScaledVector(new THREE.Vector3(Math.sin(angle)*Math.cos(pitch),Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)),dist);camera.lookAt(focus);readout();
  }
  function install({group,blockedAt,collider,contactGeometry:readContactGeometry=null,fieldSolids=null,groundHeightAt=null,contactRevision=null,groundReadRevision=null}){
    terrainSamples.reset();contactEpoch++;if(active)throw Error('乗車中の作業区画を再構築できません。');if(root){disposeSpaceMaterialBook(root);root=null;}panel.hidden=true;
    contactGeometry=typeof readContactGeometry==='function'?readContactGeometry:null;readFieldSolids=fieldSolids;fieldHeightAt=groundHeightAt;readContactRevision=typeof contactRevision==='function'?contactRevision:null;readGroundRevision=typeof groundReadRevision==='function'?groundReadRevision:null;contacts.reset();renderedWork=null;
    if(state.map!=='construction')return;
    if(!work){fresh();if(!work){const site=WATER_YARDS.findIndex(([x,z])=>!blockedAt(x,z,375));if(site<0)return;work=initialWorldWater(site);}}
    const [x,z]=WATER_YARDS[work.siteIndex];if(work.schema!==2&&blockedAt(x,z,375)){message.textContent='保存済みの作業区画が建物と重なっています。移動・上書きせず停止しました。';return;}
    work.work=upgradeWaterTruck(work.work);root=createWaterTransportView({embedded:true,work:work.work});root.name='construction-world-water-yard';root.position.set(x,0,z);group.add(root);
    const solids=[...TRANSPORT_OBSTACLES,{x:0,z:251,width:644,depth:2,height:18},{x:-321,z:0,width:2,depth:500,height:18},{x:321,z:0,width:2,depth:500,height:18},{x:-312,z:-251,width:18,depth:2,height:18},{x:52,z:-251,width:538,depth:2,height:18}];
    for(const o of work.schema===2?waterTransportObstacles(work.work):solids)collider(x+o.x,z+o.z,[o.width,o.depth],0,'construction-water-fixed',0,{minY:0,maxY:o.height,obstacleHeight:o.height});
    const v=work.work.loader.vehicle,g=groundPose(),b=g?fieldGroundBounds(g,work.work.loader.vehicle.waterTruck?[44,28,46]:undefined):null;if(b)collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-water-loader',0,{minY:b.minY,maxY:b.maxY,obstacleHeight:b.maxY});else collider(x+v.x,z+v.z,[88,90],v.heading,'construction-water-loader',0,{minY:0,maxY:44,obstacleHeight:44});render(0);refresh();
  }
  return {look(dx,dy,sensitivity){if(active&&!game.menuOpen&&!restoreLocked())orbit.drag(dx,dy,sensitivity);},get active(){return active;},get autoSaveKey(){return active?constructionWorkAutoSaveKey(work,view):null;},get resumePoint(){return active?{kind:'water',revision:work.revision,view}:null;},resumeSaved(point){if(!point||point.kind!=='water'||point.revision!==expected||!Number.isInteger(point.view)||point.view<0||point.view>2||active||!root||busy||blocked||restoreLocked()||practice||preview||service.mode!=='live'||state.map!=='construction'||!canResume())return false;view=point.view;begin({automatic:true});return active;},get busy(){return busy||saving||restoreLocked();},get dirty(){return !!work&&work.revision!==expected;},install,save,autosave:()=>work&&!restoreLocked()?save({automatic:true}):false,leave,begin,get parkingSite(){return work?.siteIndex??null;},reloadSaved(){if(active||busy||saving)throw Error('作業を終えてから移設してください。');work=null;fresh();},
    overlapsBuild(position,size){return !!root&&(work.schema===2?fieldWorkOverlaps(root.position,position,size,[...waterTransportObstacles(work.work),{...work.work.loader.vehicle,width:88,depth:90},...Object.values(work.work.pools??{}).filter(p=>p.q>0).map(p=>({x:p.x,z:p.z,width:12,depth:12})),...(work.work.waterBuilds??[]).filter(b=>b.q>0).flatMap(b=>b.cells.map(c=>({x:c.x,z:c.z,width:b.kind==='block'?8:4,depth:b.kind==='block'?8:4})))]):overlapsWorldYardBuild([root.position.x,root.position.z],position,size));},
    waterVolumes(origin){return root?(work.work.waterBuilds??[]).filter(b=>b.q>0).flatMap(b=>b.cells.map(c=>({name:'水を回収してから変更しよう',x:root.position.x+c.x-origin.x,z:root.position.z+c.z-origin.z,y:c.y,w:b.kind==='block'?8:4,d:b.kind==='block'?8:4,h:b.top-c.y+.15}))):[];},
    doorTarget(){return state.map==='construction'?nativeDoorTarget(work,root?.position,{busy:busy||blocked||restoreLocked(),active,groundHeightAt:fieldHeightAt}):null;},
    enterAtDoor(){terrainSamples.reset();contactEpoch++;
      const door=nativeDoorTarget(work,root?.position,{busy:busy||blocked||restoreLocked(),active,groundHeightAt:fieldHeightAt});
      if(!door||Math.hypot(state.position.x-door.x,state.position.z-door.z)>.6||state.jumpY||state.falling)return false;
      clear();
      try{
        work=enterWorldWater(work,{x:state.position.x,y:work.schema===2?0:state.groundY,z:state.position.z,heading:door.heading});
        active=true;auto=0;savedWorkAwaitingResume=false;idleIssue='';
        ownInput(true);render(0);refresh();return true;
      }catch(e){idleIssue=e.message;refresh();return false;}
    },
    previewSpawn(){if(!preview||!root)return null;return{x:root.position.x-188,z:root.position.z-118,heading:0};},
    update(dt){terrainSamples.reset(readGroundRevision?.());contactEpoch++;if(active&&restoreLocked()&&!root){refresh();return true;}if(state.map!=='construction'||!root)return false;
      if(!restoreLocked()&&blocked&&retryPending&&service.blocked===false){fresh();blocked=false;retryPending=false;if(active)work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      if(active&&!busy&&!blocked&&!undoConfirm&&!restoreLocked()&&!game.paused&&!document.hidden){savedWorkAwaitingResume=false;menuSaveNote='';try{const mode=work.work.loader.mode;{const next=advanceWorldWater(work,input(),dt,externalVolumes(),waterGround);if(work.schema===2&&!fieldGroundTravelAllowed(work.work,next.work,{x:0,z:0},waterGround,externalVolumes())){const oldRig=work.work.loader??work.work.rig,newRig=next.work.loader??next.work.rig;newRig.vehicle={...oldRig.vehicle,speed:0};newRig.player={...oldRig.player};next.work.message='ここは急な坂や穴があるよ。ゆるやかな道を通ろう。';work=next;}else work=next;}if(work.work.loader.mode!==mode)clear();auto+=dt;}catch(e){failure(e);}}
      if(!active&&!busy&&!blocked&&!restoreLocked()&&!document.hidden&&work.schema===2&&Object.keys(work.work.pools??{}).length){
        runoffClock+=dt;auto+=dt;if(runoffClock>=.1){runoffClock%=.1;try{work=flowWorldFieldWater(work,externalVolumes(),waterGround);}catch(e){failure(e);}}
        if(auto>8&&!saving&&constructionWorkAutoSaveKey(work,view)!==lastAutomaticKey&&!practice&&service.mode!=='readonly')void save({automatic:true});
      }
      render(game.paused?0:dt);ui+=dt;if(ui>.15){ui=0;refresh();}
      if(active&&!game.menuOpen&&auto>8&&!saving&&!busy&&!blocked&&!restoreLocked()&&!practice&&service.mode!=='readonly'&&Math.abs(work.work.loader.vehicle.speed)<.01&&!held.size&&!keys.size&&constructionWorkAutoSaveKey(work,view)!==lastAutomaticKey)void save({automatic:true});
      return active;
    },
  };
}
