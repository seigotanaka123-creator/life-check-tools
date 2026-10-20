import{isKitCargo}from'./imasora-construction-kit-cargo.mjs?v=120gm';
import{kitPickupOption,kitTransferOption,kitHandlingObstacles}from'./imasora-construction-kit-transfer.mjs?v=120gn';
import{createPresentationCache}from'./imasora-construction-presentation-cache.mjs?v=120gi';
import{bindJumpButton,createJumpIntent}from'./imasora-construction-locomotion.mjs?v=120gf';
import{boardLiftChoices,startBoardLift,advanceBoardLift}from'./imasora-construction-board-lift.mjs?v=120gn';
import{createBoardLiftView,boardLiftContactGeometry}from'./imasora-construction-board-lift-view.mjs?v=120gn';
import{liftState}from'./imasora-construction-board-lift-state.mjs?v=120gd';
import {createConstructionWalkGait} from './imasora-construction-walk-gait.mjs?v=120fb';
import {constructionWorkAutoSaveKey} from './imasora-construction-autosave-key.mjs?v=120es';
import {createFrameHeightSampler} from './imasora-construction-frame-height.mjs?v=120ey';
import {craneGroundContext,craneChassisFrame,craneGroundObstacles} from './imasora-construction-crane-ground.mjs?v=120gf';
import {fieldWorkOverlaps,fieldGroundTravelAllowed,fieldGroundPose,fieldActorPose,fieldWorkGroundProblem,fieldGroundBounds} from './imasora-construction-field-contact.mjs?v=120gn';
import {nativeDoorTarget,nativeSavedWorkPending} from './imasora-construction-native-door.mjs?v=120gm';
import {constructionOverlayOpen,openConstructionGuide} from './imasora-construction-overlays.mjs?v=120gm';
import {bindTravelBoost} from './imasora-construction-travel-input.mjs';
import {setBoardPrompt} from './imasora-construction-boarding.js';
import {createOrbitLook} from './imasora-world-look-controls.js?v=492';
import {createVehiclePlayView} from './imasora-construction-vehicle-play-view.js?v=120gm';
import {VehicleRestoreSession} from './imasora-construction-vehicle-restore-session.js?v=120gn';
import {createVehicleRestoreView} from './imasora-construction-vehicle-restore-view.js?v=502';
import * as THREE from './three.module.min.js';
import {overlapsWorldYardBuild} from './imasora-construction-world-yard-reservation.js?v=512';
import {actorPose,loaderDrivingInput} from './imasora-construction-loader-physics.js?v=120gf';
import {hook,pickOption,craneBoardOption,craneExitOption} from './imasora-construction-crane.js?v=120gn';
import {craneWorkInput} from './imasora-construction-crane-controls.js';
import{BEAM_ISSUE,isBeamBundle}from'./imasora-construction-timber-cargo.mjs?v=120gl';
import {issueOption,returnOption,timberPhysicsState} from './imasora-construction-purchased-timber.js?v=120gn';
import {assemblyState,floatReadout,floatingPlacement,joinOption,detachOption,component} from './imasora-construction-world-timber-assembly.js?v=120gn';
import {TIMBER_YARDS,FLOOR_VOLUME,initialWorldTimber,enterWorldTimber,syncWorldTimber,worldTimberAction,advanceWorldTimber,idleWorldTimber,worldTimberTotals,worldTimberGeometry,timberEdges,worldTimberVehicleVolumes,worldTimberMaterialObstacles} from './imasora-construction-world-timber.js?v=120gn';
import {constructionMaterialContactVolumes} from './imasora-construction-world-contact.js?v=523';
import {createWorldTimberModel,updateWorldTimberModel,TIMBER_FENCES} from './imasora-construction-world-timber-model.js?v=120gn';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js?v=120ds';
import {worldTimberJoinPractice} from './imasora-construction-world-timber-practice.js?v=120gn';
import {timberCheckpoint} from './imasora-construction-world-timber.js?v=120gn';
import {craneUpperTargets,cranePointRequest,cranePointTarget,startUpperDelivery,stepUpperDelivery,upperDeliveryProjectKey,upperLandingFits,recoverUpperLanding} from './imasora-construction-high-crane.mjs?v=120gn';
import {bindCranePointInput} from './imasora-construction-crane-point-input.mjs?v=120gj';
import {highProjects} from './imasora-construction-high-world.mjs?v=120gn';
import{highWorldPoint,highLocalPoint}from'./imasora-construction-high-world.mjs?v=120gn';
import{createActiveWorkClock}from'./imasora-construction-concrete/active-work-clock.mjs';
import{boardBayChoices,startBoardBay,advanceBoardBay,boardBayTerrain,boardBayQuietInput}from'./imasora-construction-board-bay.mjs?v=120gn';

export function createWorldTimberController({service,practice=false,preview=false,canResume=()=>true,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,readout,onRestoreRebuild,onKitChange=()=>{}}){
  const presentation=createPresentationCache();let readPresentationRevision=null;
  let jumpControl;const jumpInput=createJumpIntent();
  const gait=createConstructionWalkGait(),liftView=createBoardLiftView(scene);
  const bayClock=createActiveWorkClock(),orbit=createOrbitLook();let menuSaveNote='',restoreSession=null,savedWorkAwaitingResume=false;
  const restoreLocked=()=>!!restoreSession?.locked;
  let work=null,root=null,contactGeometry=null,readFieldSolids=null,fieldHeightAt=null,active=false,busy=false,saving=false,pendingSave=null,lastAutomaticKey='',blocked=false,retryPending=false,expected=null,auto=0,ui=0,time=0,view=0,precision=false,issue='',pendingExit=null,bindings=[];
  let fieldUpperBound=null;
  let upper=null,upperChoices=[],upperOpen=false,upperPlace=null,upperPlaced=null,upperSuspended=false;
  let upperChoice=null,upperPoint=null,upperPreview=null,upperPreviewStamp='',pointInput=null,pointCameraOffset=false;
  let checkpointGeneration=0;
  let bay=null,bayChoices=[],bayOpen=false,bayView=null,bayProgress=0;
  let bayTerrainWorld=null,bayGround=null;const bayHeight=()=>{if(bayTerrainWorld!==service.ledger.world){bayTerrainWorld=service.ledger.world;bayGround=boardBayTerrain(bayTerrainWorld,root.position);}return bayGround;};
  const upperMarker=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xffd34e,transparent:true,opacity:.2,depthTest:false,depthWrite:false}));upperMarker.name='上階の床板の置き先';upperMarker.renderOrder=30;upperMarker.visible=false;
  const upperOutline=new THREE.LineSegments(new THREE.EdgesGeometry(upperMarker.geometry),new THREE.LineBasicMaterial({color:0xffbf27,depthTest:false,depthWrite:false}));upperOutline.renderOrder=31;upperMarker.add(upperOutline);scene.add(upperMarker);
  const heightCache=createFrameHeightSampler((x,z)=>typeof fieldHeightAt==='function'?fieldHeightAt(x,z):0),localHeight=(x,z)=>heightCache.heightAt(root.position.x+x,root.position.z+z);
  localHeight.upperBound=b=>fieldUpperBound?.({minX:b.minX+root.position.x,maxX:b.maxX+root.position.x,minZ:b.minZ+root.position.z,maxZ:b.maxZ+root.position.z});
  const held=new Map(),taps=new Map(),keys=new Set(),inert=new Map();
  const panel=document.createElement('section');panel.className='world-timber-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場の火星木材クレーン');
  panel.innerHTML=`<header><strong>火星木材クレーン</strong><span class="wt-mode"></span><button data-action="begin">木材の作業を始める</button></header>
    <p class="wt-message" role="status"></p><div class="wt-stats"></div><div class="wt-active" hidden>
    <div class="wt-drive wt-pad"><button data-hold="left">左へ</button><button data-hold="accelerate">前へ</button><button data-hold="right">右へ</button><button data-hold="reverse">後ろへ</button><button data-hold="brake">ブレーキ</button><button data-hold="jump">ジャンプ</button></div>
    <div class="wt-crane wt-pad" hidden><button data-hold="slew-left">左旋回</button><button data-hold="slew-right">右旋回</button><button data-hold="extend">アームを伸ばす</button><button data-hold="retract">アームを縮める</button><button data-hold="raise">巻き上げる</button><button data-hold="lower">巻き下げる</button></div>
    <div class="wt-work"><button data-action="issue">床板を1枚出す</button><button data-action="issue-beams-v1">📦 角材4本の束を出す</button><small class="wt-stock-help">どちらも木材1組分。角材の束は吊って運び、床や地面に置こう。回収枠で保管にもどせるよ。</small><button data-action="interact">運転席に乗る</button><button data-action="mode">クレーン作業へ</button><button data-action="pick">吊り索を掛ける</button><button data-action="rotate">部材を90°回す</button><button data-action="release">浮遊を開始</button><button data-action="place">地面・支持面に設置</button><button data-action="return-stock">回収枠から保管へ</button><button data-action="precision">微調整 OFF</button><button data-action="snap">面合わせ ON</button></div>
    <div class="wt-detail"></div><footer><button data-action="camera">視点：作業</button><button data-action="save">木材作業を保存</button><button data-action="leave">作業を終えて徒歩に戻る</button></footer></div>`;
  panel.querySelector('[data-action="release"]').insertAdjacentHTML('afterend','<button data-action="join">床に接合</button><button data-action="detach">接合を外して吊る</button>');
  panel.querySelector('[data-action="place"]').insertAdjacentHTML('afterend','<button data-action="upper">上の階へ運ぶ</button><div class="wt-upper" hidden><strong>どこへ運ぶ？</strong><small>吊った木材を黄色い枠へ運ぶよ。途中で止めても荷は残るよ。</small><div class="wt-upper-choices"></div><button data-action="upper-close">とじる</button></div><button data-action="upper-stop" hidden>運ぶのを止める</button>');
  panel.querySelector('.wt-upper-choices').insertAdjacentHTML('afterend','<div class="wt-point" hidden><strong class="wt-point-title"></strong><small>床をタップして置き先をえらぼう。画面をなぞると見回せるよ。</small><div class="wt-point-steps" aria-label="木材の置き先を動かす"><button data-point-step="0,-2" aria-label="置き先を建物の奥へ">奥へ ↑</button><button data-point-step="-2,0" aria-label="置き先を建物の左へ">← 左へ</button><button data-point-step="2,0" aria-label="置き先を建物の右へ">右へ →</button><button data-point-step="0,2" aria-label="置き先を建物の手前へ">↓ 手前へ</button></div><p class="wt-point-note" role="status"></p><button data-action="upper-go">📦 ここへ運ぶ</button><button data-action="upper-back">別の階・受取台をえらぶ</button></div>');
  panel.querySelector('[data-action="pick"]').insertAdjacentHTML('afterend','<button data-action="kit-pickup">🏗 建築キットを吊る</button><div class="wt-kit" hidden><strong>どの建物のキットを運ぶ？</strong><button data-action="kit-help">動きで運び方を見る</button><small>地上で部材をつくり、作業台の上へフックを近づけよう。建物の木材を使うので追加消費はないよ。</small><div class="wt-kit-choices"></div><button data-action="kit-close">現場へ戻る</button></div><button data-action="kit-give">📦 建物にキットを渡す</button><button data-action="kit-return">キットを元の作業台へ戻す</button>');
  if(practice&&service.mode==='readonly')panel.querySelector('header').insertAdjacentHTML('beforeend','<button data-action="join-practice">接合から試す（貸出2枚）</button>');
  panel.querySelector('[data-action="upper"]').insertAdjacentHTML('afterend','<button data-action="bay">📦 ローラーで部屋へ運ぶ</button><div class="wt-bay" hidden><strong>大きな板を運ぼう</strong><small>①クレーンで受取台へ → ②ローラーで部屋へ。3階から上は、荷物リフトにのせて運ぼう。</small><div class="wt-bay-choices"></div><button data-action="bay-close">現場へ戻る</button></div>');
  panel.querySelector('footer').insertAdjacentHTML('beforeend','<button data-action="bay-resume" hidden>運ぶのをつづける</button>');
  canvas.parentElement.append(panel);for(const type of ['pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  const button=a=>panel.querySelector(`[data-action="${a}"]`),message=panel.querySelector('.wt-message');
  const liftMeter=document.createElement('progress');liftMeter.className='wt-lift-meter';liftMeter.max=1;liftMeter.hidden=true;liftMeter.setAttribute('aria-label','荷物リフトの進み具合');message.after(liftMeter);
  const received=()=>practice?2*FLOOR_VOLUME:service.constructionStock?.receipts.filter(e=>e.offerId==='mars-timber').reduce((n,e)=>n+e.amount,0)||0;
  let travelBoost=null;
  function stopUpper(){if(upper||bay)issue='運ぶのを止めたよ。木材はその場に残っているよ。';if(bay){work={...work,work:{...work.work,message:'木材はその場にあるよ。「荷物」から運び先をえらぼう。'}};checkpointGeneration++;auto=9;}upper=null;bay=null;upperPlace=null;upperPlaced=null;upperSuspended=false;upperChoice=null;upperPoint=null;upperPreview=null;upperPreviewStamp='';}
  function suspendUpper(){bayClock.pause();if(upper||bay){upperSuspended=true;issue='ひと休み中。「運ぶのをつづける」で再開できるよ。';}clear();}
  // Clearing held input (for a menu or checkpoint) is not cancelling a job.
  function clear(){pointInput?.cancel();jumpControl?.cancel();jumpInput.reset();travelBoost?.reset();held.clear();taps.clear();keys.clear();clearInput();panel.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  const game=createVehiclePlayView({panel,canvas,clearInput:clear,refresh,prefix:"wt",groups:[{"id":"move","label":"移動","selectors":[".wt-drive"],"hint":"WASD／矢印で移動。同方向を素早く2回で加速（離すと解除）。停車してクレーン作業へ。"},{"id":"arm","label":"アーム","selectors":[".wt-crane"],"hint":"クレーン作業へ切り替えると操作できます。"},{"id":"load","label":"荷物","selectors":["[data-action=\"pick\"]","[data-action=\"rotate\"]","[data-action=\"release\"]","[data-action=\"place\"]","[data-action=\"join\"]","[data-action=\"detach\"]","[data-action=\"upper\"]",".wt-upper","[data-action=\"kit-pickup\"]",".wt-kit","[data-action=\"kit-give\"]","[data-action=\"kit-return\"]","[data-action=\"bay\"]",".wt-bay"]},{"id":"stock","label":"保管・調整","selectors":["[data-action=\"issue\"]","[data-action=\"issue-beams-v1\"]",".wt-stock-help","[data-action=\"return-stock\"]","[data-action=\"precision\"]","[data-action=\"snap\"]"]}],quick:["interact","mode","camera","upper-stop","bay-resume"]});
  if(!practice&&!preview&&service.mode==='live'){
    restoreSession=new VehicleRestoreSession({service,kind:'timber',origin:globalThis.location?.origin,getWork:()=>work,getExpectedRevision:()=>expected,
      available:()=>{if(!active||state.map!=='construction')return 'この車両の作業を始めてから復元してください。';if(busy||saving||blocked)return '先に保存の結果を確認してください。';if(work?.work.rig.transition)return 'ゲームへ戻って再開し、乗り降りが終わってから復元してください。';return '';},
      onChange:refresh,onRestored:saved=>{
        if(typeof onRestoreRebuild!=='function')throw Error('区画の再構築が接続されていません。');
        stopUpper();clear();game.pause();scene.add(character);work=structuredClone(saved);expected=saved.revision;auto=0;savedWorkAwaitingResume=true;retryPending=false;blocked=false;issue='';pendingExit=null;bindings=[];
        // Keep the input gate paused while rebuilding floors, edges and solids.
        const wasActive=active;active=false;
        try{onRestoreRebuild();if(!root)throw Error('復元した区画を安全に表示できません。');}
        finally{active=wasActive;}
        if(active)work={...work,work:{...work.work,paused:false}};
        orbit.reset();render(0);menuSaveNote='作業を復元しました。一時停止中です。';
      }});
    game.attachRestore(createVehicleRestoreView({menu:game.menu,session:restoreSession,isMenuOpen:()=>game.menuOpen,refresh}));
  }
  function owns(value){orbit.reset();if(value){for(const el of document.querySelectorAll('.world-toolbar,.control-card')){inert.set(el,el.inert);el.inert=true;}}else{if(pointCameraOffset){camera.clearViewOffset();pointCameraOffset=false;}for(const[el,was]of inert)el.inert=was;inert.clear();}canvas.parentElement.classList.toggle('world-timber-operating',value);game.setActive(value);}
  function fail(e){stopUpper();clear();blocked=true;retryPending=service.blocked;issue=`停止しました：${e.message||e}`;if(service.blocked)onError(e);refresh();}
  function resumeAvailable(){return !!root&&!active&&savedWorkAwaitingResume&&!practice&&!preview&&service.mode==='live'&&state.map==='construction'&&canResume()&&nativeSavedWorkPending(work);}
  function near(){if(!root||state.map!=='construction'||state.ufoBoarded||state.jumpY>0||state.falling)return false;const v=work.work.rig.vehicle;return Math.hypot(state.position.x-root.position.x-v.x,state.position.z-root.position.z-v.z)<=112;}
  function fresh(){const saved=service.readConstructionVehicleWork('timber');if(saved&&!practice){work=structuredClone(saved);expected=saved.revision;savedWorkAwaitingResume=!practice&&!preview&&service.mode==='live';}}
  let kitGeometryHigh=null,kitGeometry=[],kitGeometryOrigin='';
  function externalVolumes(){const high=service.ledger?.world.constructionHighBuild,at=root?root.position.x+'/'+root.position.z:'';if(root&&(kitGeometryHigh!==high||kitGeometryOrigin!==at)){kitGeometryHigh=high;kitGeometryOrigin=at;kitGeometry=kitHandlingObstacles(high,root.position);}return root?[...kitGeometry,...(contactGeometry?constructionMaterialContactVolumes([root.position.x,root.position.z],contactGeometry()):[]),...(work.schema===2&&readFieldSolids?readFieldSolids(root.position):[])]:[];}
  function begin(joinPractice=false,{automatic=false}={}){if((!automatic&&!near()&&!resumeAvailable())||busy||saving||blocked||restoreLocked()||active)return;clear();try{
    const resumeSaved=!practice&&!preview&&service.mode==='live'&&service.hasConstructionVehicleWork('timber');
    const resumed=resumeSaved?syncWorldTimber(work,received()):null;
    if(joinPractice){if(work.work.parts.length)throw Error('貸出床を回収してから接合練習を始めてください。');work=worldTimberJoinPractice(work.siteIndex,{practice,saveMode:service.mode});}
    else work=resumeSaved?{...resumed,revision:resumed.revision+1,work:{...resumed.work,paused:false}}:enterWorldTimber(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading},received());
    active=true;upperPlaced=recoverUpperLanding(service.constructionHighBuild,posedWork(),root.position);const waiting=[...boardBayChoices(service.ledger?.world.constructionHighBuild,posedWork(),{origin:root.position}),...boardLiftChoices(service.constructionHighBuild,posedWork(),{origin:root.position})];bayView=waiting[0]??null;issue=waiting.length?'木材はその場にあるよ。「荷物」から運び先をえらぼう。':'';if(waiting.length)work={...work,work:{...work.work,message:issue}};auto=0;owns(true);if(resumeSaved&&!automatic){savedWorkAwaitingResume=true;game.pause();menuSaveNote='保存した作業を一時停止で開きました。「再開」で続けられます。';}render(0);refresh();
  }catch(e){issue=e.message;refresh();}}
  async function save({automatic=false}={}){
    if(saving){if(automatic)return false;await pendingSave;if(blocked)return false;return save({automatic});}
    if(!work||busy||blocked||restoreLocked())return false;if(work.work.rig.transition){if(!automatic){issue='乗り降りが終わると保存できるよ。';refresh();}return false;}if(practice||service.mode==='readonly')return true;
    let draft,world,revision,key,checkpoint;try{checkpoint=checkpointGeneration;draft=structuredClone(work);world=snapshot();revision=expected;key=constructionWorkAutoSaveKey(draft,view);}catch(e){fail(e);return false;}
    menuSaveNote='';saving=true;busy=!automatic;if(!automatic)clear();refresh();
    pendingSave=(async()=>{try{await service.flush();const saved=await service.saveConstructionTimber(draft,world,revision);expected=saved.revision;lastAutomaticKey=key;auto=checkpointGeneration===checkpoint?0:9;menuSaveNote='作業を保存しました。';return true;}catch(e){fail(e);return false;}finally{busy=false;saving=false;pendingSave=null;refresh();}})();return pendingSave;
  }
  async function leave({force=false,then=null}={}){
    if(restoreLocked())return false;
    if(!active){if(work&&work.revision!==expected&&state.map==='construction'&&!await save())return false;then?.();return true;}if(busy||blocked||restoreLocked())return false;stopUpper();upperOpen=false;clear();const w=work.work;
    if(w.rig.transition){if(force){pendingExit={force,then};issue='乗降が完了してから安全に移動します。';}else issue='乗り降りの完了を待ってください。';refresh();return false;}
    if(!force&&(w.rig.mode!=='foot'||!w.rig.player.grounded||w.held||w.rotation)){issue='荷を置いて降車・着地してから徒歩へ戻ってください。';refresh();return false;}
    render(0);if(!await save())return false;work=timberCheckpoint(work);active=false;owns(false);scene.add(character);shadow.visible=true;
    const p=force?{x:-260,y:0,z:-190,heading:0}:(work.schema===2?fieldActorPose(w.rig,root.position,fieldHeightAt):actorPose(w.rig));state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.jumpCount=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;if(work.schema===2)onRestoreRebuild?.();onExit();refresh();then?.();return true;
  }
  const kitWorld=()=>({...service.ledger.world,constructionTimber:work});
  async function runKit(type,projectId){
    if(!active||busy||blocked||restoreLocked()||!game.allows('kit-pickup')||practice||preview||service.mode!=='live'||upper||bay)return;clear();
    if(!await save())return;busy=true;refresh();
    try{const saved=await service.transferConstructionKit({type,projectId,id:crypto.randomUUID()},snapshot(),service.ledger.revision);work=structuredClone(saved);expected=saved.revision;work.revision++;work.work.paused=false;posed=null;posedSource=null;presentation.reset();panel.querySelector('.wt-kit').hidden=true;issue=work.work.message;checkpointGeneration++;auto=9;onKitChange();}
    catch(e){issue=e.message;if(service.blocked)fail(e);}
    finally{busy=false;refresh();}
  }
  async function action(a){if(a==='bay-resume')a='bay';if(a==='begin'||a==='join-practice'){begin(a==='join-practice');return;}if(!active||busy||blocked||restoreLocked()||!game.allows(a))return;clear();issue='';
    if(a==='kit-help'){panel.querySelector('.wt-kit').hidden=true;game.pause();openConstructionGuide('crane-kit');refresh();return;}
    if(a==='kit-close'){panel.querySelector('.wt-kit').hidden=true;refresh();return;}
    if(a==='kit-pickup'){
      upperOpen=false;bayOpen=false;const host=panel.querySelector('.wt-kit-choices');host.replaceChildren();
      for(const p of highProjects(service.constructionHighBuild)){const q=kitPickupOption(kitWorld(),p.id),row=document.createElement('div'),b=document.createElement('button'),note=document.createElement('small');b.textContent='建物 '+p.id.slice(9)+' のキットを吊る';b.dataset.kitChoice=p.id;b.disabled=!q.ok;note.textContent=q.reason;b.onclick=()=>void runKit('PICK',p.id);row.append(b,note);host.append(row);}
      if(!host.children.length)host.textContent='先に建物の作業台を置き、部材をつくろう。';panel.querySelector('.wt-kit').hidden=false;refresh();return;
    }
    if(a==='kit-give'||a==='kit-return'){const b=work.work.buildingKits?.[0];if(b)await runKit(a==='kit-give'?'GIVE':'RETURN',b.projectId);return;}
    if(a==='bay-close'){bayOpen=false;refresh();return;}
    if(a==='bay'){
      if(bay&&upperSuspended){upperSuspended=false;refresh();return;}
      bayChoices=[...boardBayChoices(service.constructionHighBuild,posedWork(),{origin:root.position}),...boardLiftChoices(service.constructionHighBuild,posedWork(),{origin:root.position})];bayOpen=true;upperOpen=false;bayView=bayChoices[0]??null;
      const host=panel.querySelector('.wt-bay-choices');host.replaceChildren();
      for(const choice of bayChoices){const btn=document.createElement('button');btn.textContent=choice.label;btn.dataset.bayChoice=choice.id;btn.onclick=()=>{if(busy||blocked||!game.allows('bay')||bay)return;clear();try{bay=choice.kind==='lift'?startBoardLift(service.constructionHighBuild,posedWork(),choice):startBoardBay(service.constructionHighBuild,posedWork(),choice);bayView=bay;bayProgress=0;bayOpen=false;upperSuspended=false;issue=choice.kind==='lift'?'荷物リフトで運ぶよ。':'ローラーで木材を運ぶよ。';}catch(e){issue=e.message;}refresh();};host.append(btn);}
      if(!bayChoices.length)host.textContent='入口つきの建物を完成させて、受取台へ板を下ろそう。板が横向きの時は90°回してね。';refresh();return;
    }
    if(!['upper-stop','bay','bay-close','camera'].includes(a)&&!bay)bayView=null;
    if(!upper)upperPlaced=null;
    if(a==='upper-stop'){stopUpper();upperOpen=false;bayOpen=false;issue='運ぶのを止めたよ。木材はその場に残っているよ。';checkpointGeneration++;auto=9;refresh();return;}
    if(a==='upper-close'){upperOpen=false;upperChoice=null;upperPoint=null;upperPreview=null;refresh();return;}
    if(a==='upper-back'){upperChoice=null;upperPoint=null;upperPreview=null;refresh();return;}
    if(a==='upper-go'){
      const selected=upperChoice,point=upperPoint?structuredClone(upperPoint):null;
      if(!selected||upper||bay)return;readUpperPreview(true);if(!upperPreview?.ok){refresh();return;}
      const key=upperPreview.key;
      if(!await save()){issue='セーブが終わってから、もう一度えらぼう。';refresh();return;}
      if(!active||blocked||restoreLocked()||!game.allows('upper')||upperChoice!==selected||JSON.stringify(upperPoint)!==JSON.stringify(point)){refresh();return;}
      readUpperPreview(true);const current=upperPreview;
      if(!current?.ok||current.key!==key){issue='現場が変わったよ。置き先をもう一度えらぼう。';refresh();return;}
      try{upper=startUpperDelivery(posedWork(),current);upperOpen=false;upperChoice=null;upperPoint=null;upperPreview=null;upperSuspended=false;issue='えらんだ場所へ木材を運ぶよ。';}catch(e){issue=e.message;}refresh();return;
    }
    if(a==='upper'){
      if(upper&&upperSuspended){upperSuspended=false;issue='運ぶのをつづけるよ。';refresh();return;}
      upperChoices=craneUpperTargets(service.constructionHighBuild,posedWork(),{origin:root.position,includePlatforms:true}).sort((a,b)=>Number(b.ok)-Number(a.ok));upperOpen=true;upperChoice=null;upperPoint=null;upperPreview=null;
      const host=panel.querySelector('.wt-upper-choices');host.replaceChildren();
      for(const choice of upperChoices){const row=document.createElement('div'),btn=document.createElement('button'),note=document.createElement('small');btn.textContent=choice.label+(['bay','lift','kit'].includes(choice.surface)?'を確認':'の位置をえらぶ');btn.disabled=!choice.ok&&['bay','lift','kit'].includes(choice.surface);btn.dataset.upperChoice=choice.id;note.textContent=choice.reason;row.append(btn,note);host.append(row);btn.onclick=()=>{
        if(!active||busy||blocked||restoreLocked()||!game.allows('upper')||upper||bay)return;clear();upperChoice=choice;upperPoint=cranePointRequest(service.constructionHighBuild,choice,root.position);
        if(!upperPoint&&!['bay','lift','kit'].includes(choice.surface))upperPoint={projectId:choice.projectId??choice.id,level:choice.level,surface:choice.surface??'floor',x:choice.surface==='platform'?0:32,z:choice.surface==='platform'?112:0};
        upperPreviewStamp='';issue='';readUpperPreview(true);refresh();
      };}
      if(!upperChoices.length)host.textContent='先に高い建物の床を完成させよう。';refresh();return;
    }
    if(a==='camera'){orbit.reset();view=(view+1)%3;button(a).textContent=['視点：作業','視点：横から','視点：区画全体'][view];return;}
    if(a==='precision'){precision=!precision;refresh();return;}if(a==='leave'){await leave();return;}if(a==='save'){await save();return;}
    heightCache.reset();posed=null;posedSource=null;
    try{if((a==='issue'||a===BEAM_ISSUE)&&!practice&&(service.constructionStock?.stored['mars-timber']??0)<FLOOR_VOLUME)throw Error('残りの木材は高い建物に使っているよ。建材受取所で受け取ろう。');if(a==='interact'&&await save({automatic:true})===false)return;work=worldTimberAction(work,a,crypto.randomUUID(),received(),externalVolumes(),localHeight);if(['issue',BEAM_ISSUE,'return-stock','release','place','join','detach'].includes(a))await save();}catch(e){issue=e.message;}refresh();
  }
  function readUpperPreview(force=false,obstacles=null){if(!upperOpen||!upperChoice)return null;const w=posedWork(),ext=obstacles??craneGroundObstacles(w,worldTimberMaterialObstacles(w.rig,externalVolumes()),localHeight),stamp=JSON.stringify([upperPoint,upperDeliveryProjectKey(service.constructionHighBuild,upperChoice),w.held,w.rig,w.groundPose,w.boom,w.rotation,w.joining,w.work,w.deployment,w.parts.map(p=>[p.id,p.x,p.y,p.z,p.w,p.h,p.d,p.angle,p.fixed]),ext]);if(!force&&stamp===upperPreviewStamp)return upperPreview;upperPreviewStamp=stamp;
    try{upperPreview=upperPoint?cranePointTarget(service.constructionHighBuild,w,upperPoint,{origin:root.position,external:ext}):craneUpperTargets(service.constructionHighBuild,w,{origin:root.position,includePlatforms:true}).find(t=>t.id===upperChoice.id)??null;}catch(e){upperPreview=null;issue=e.message;}return upperPreview;
  }
  for(const btn of panel.querySelectorAll('[data-point-step]'))btn.onclick=()=>{if(!upperPoint||busy||blocked||restoreLocked()||!game.allows('upper')||!upperOpen)return;const[x,z]=btn.dataset.pointStep.split(',').map(Number);upperPoint={...upperPoint,x:Math.max(-400,Math.min(400,upperPoint.x+x)),z:Math.max(-400,Math.min(400,upperPoint.z+z))};issue='';readUpperPreview(true);refresh();};
  const pickRay=new THREE.Raycaster(),pickPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),pickHit=new THREE.Vector3();
  pointInput=bindCranePointInput({canvas,ready:()=>active&&upperOpen&&!!upperPoint&&!busy&&!blocked&&!restoreLocked()&&game.allows('upper')&&!panel.querySelector('.wt-upper').closest('.gv-page')?.hidden,
    pick(x,y){const rect=canvas.getBoundingClientRect();if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return;const project=highProjects(service.constructionHighBuild).find(p=>p.id===upperPoint.projectId);if(!project)return;pickPlane.constant=-(project.record.site.y+upperPoint.level*40);camera.updateMatrixWorld();pickRay.setFromCamera({x:(x-rect.left)/rect.width*2-1,y:1-(y-rect.top)/rect.height*2},camera);if(!pickRay.ray.intersectPlane(pickPlane,pickHit))return;const q=highLocalPoint(project.record.site,pickHit);upperPoint={...upperPoint,x:Math.max(-400,Math.min(400,Math.round(q.x/2)*2)),z:Math.max(-400,Math.min(400,Math.round(q.z/2)*2))};issue='';readUpperPreview(true);refresh();}
  });
  travelBoost=bindTravelBoost({panel,enabled:()=>active&&!busy&&!blocked&&!restoreLocked()&&!game.paused&&!game.menuOpen,context:()=>work?.work?.work?'working':work?.work?.rig.mode});
  panel.querySelectorAll('[data-action]:not([data-action=jump])').forEach(b=>b.addEventListener('click',()=>void action(b.dataset.action)));
  for(const b of panel.querySelectorAll('[data-hold]:not([data-hold=jump])')){
    b.addEventListener('pointerdown',e=>{if(!active||busy||blocked||restoreLocked()||game.paused)return;e.preventDefault();held.set(e.pointerId,b.dataset.hold);taps.set(b.dataset.hold,time+.1);b.setPointerCapture(e.pointerId);b.classList.add('held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{held.delete(e.pointerId);b.classList.remove('held');});
    b.addEventListener('click',e=>{if(e.detail===0&&active&&!busy&&!blocked&&!restoreLocked()&&!game.paused)taps.set(b.dataset.hold,time+.1);});
  }
  const jumpReady=()=>active&&!busy&&!blocked&&!restoreLocked()&&!game.paused&&!game.menuOpen&&work.work.rig.mode==='foot';
  jumpControl=bindJumpButton({element:panel.querySelector('[data-hold=jump]'),enabled:()=>jumpReady()&&(work.work.rig.player.grounded||(work.work.rig.player.jumpCount??0)<3),canHold:jumpReady,activate:()=>jumpInput.press(),release:()=>jumpInput.release()});
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  addEventListener('keydown',e=>{if(!active||e.target.closest?.('dialog[open]'))return;if(game.menuOpen){game.handleKeyDown(e);e.stopImmediatePropagation();return;}if(restoreLocked()){e.preventDefault();e.stopImmediatePropagation();return;}if(game.paused){if(codes.includes(e.code)||e.code==='KeyE'){if(e.code!=='Space'||!e.target.closest('button,summary,select'))e.preventDefault();e.stopImmediatePropagation();}return;}if(e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();jumpControl.key(e);return;}if(codes.includes(e.code)){if(upper||bay){stopUpper();clear();}e.preventDefault();e.stopImmediatePropagation();if(!keys.has(e.code)&&!busy&&!blocked&&!restoreLocked())taps.set(e.code,time+.1);keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void action('interact');}},true);
  addEventListener('keyup',e=>{if(e.code==='Space')jumpControl.key(e);keys.delete(e.code);if(e.target.closest?.('dialog[open]'))return;if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  document.addEventListener('pointerdown',e=>{if(!constructionOverlayOpen()&&active&&!service.blocked&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',suspendUpper);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendUpper();else clear();});
  const yaw=()=>orbit.yaw(view===1?-Math.PI/2:view===2?Math.PI:-2.6);
  function input(consumeJump=true){
    if(bay)return{brake:true};
    if(upperOpen&&!panel.querySelector('.wt-upper').closest('.gv-page')?.hidden)return{brake:true};
    if(!upper)return travelBoost.input(rawInput(consumeJump));if(upperSuspended)return{brake:true};
    const key=upperDeliveryProjectKey(service.ledger?.world.constructionHighBuild,upper.target);
    const step=stepUpperDelivery(upper,posedWork(),Math.min(.1,Math.max(.001,currentStep)),key);upper=step.job;issue=step.reason||step.message||'';
    if(step.place){upperPlace=upper.target.target;upperPlaced=upper.target;upper=null;}
    return step.input;
  }
  let currentStep=.016;
  function finishUpper(){
    if(!upperPlace)return;const target=upperPlace;upperPlace=null;posed=null;posedSource=null;
    try{
    const w=posedWork(),landing={x:target.x,z:target.z},preview=floatingPlacement(timberPhysicsState(w),craneGroundObstacles(w,worldTimberMaterialObstacles(w.rig,externalVolumes()),localHeight),landing);
    if(preview?.ok&&upperLandingFits(service.ledger?.world.constructionHighBuild,upperPlaced,preview.candidate,root.position)&&Math.hypot(preview.candidate.x-target.x,preview.candidate.z-target.z)<1.5&&Math.abs(preview.candidate.y-target.y)<.01){work=worldTimberAction(work,'place',crypto.randomUUID(),received(),externalVolumes(),localHeight,landing);issue=work.work.held?'荷を吊ったまま止めたよ。手動で置き先をたしかめよう。':upperPlaced.surface==='kit'?(upperPlaced.kitSource?'元の作業台へ置いたよ！「キットを元の作業台へ戻す」を押そう。':'キットを置いたよ！「建物にキットを渡す」を押そう。'):upperPlaced.surface==='lift'?'リフトに置いたよ！「荷物」から行き先をえらぼう。':upperPlaced.surface==='bay'?'受取台へ木材を置いたよ！ ローラーで部屋へ運ぼう。':upperPlaced.surface==='platform'?'作業台へ木材を置いたよ！':'上の階へ木材を置いたよ！';if(!work.work.held&&upperPlaced.surface==='lift')bayView=boardLiftChoices(service.constructionHighBuild,posedWork(),{origin:root.position}).find(c=>c.partId===w.held)??null;if(!work.work.held&&upperPlaced.surface==='bay')bayView=boardBayChoices(service.constructionHighBuild,posedWork(),{origin:root.position}).find(c=>c.partId===w.held)??null;checkpointGeneration++;auto=9;}
    else issue='ここには置けなかったよ。荷を吊ったまま止めたよ。手動で置き先をたしかめよう。';
    }catch(e){issue='荷は吊ったまま止めたよ。'+(e.message||'置き先をもう一度たしかめよう。');}
  }
  function rawInput(consumeJump=true){const actions=[...held.values()],pressed=[...keys];for(const[k,t]of taps)if(t>time)(codes.includes(k)?pressed:actions).push(k);
    if(work.work.rig.mode==='driving')return work.work.work?craneWorkInput(actions,pressed,precision):loaderDrivingInput(actions,pressed);
    const on=(a,...k)=>actions.includes(a)||k.some(x=>pressed.includes(x)),f=Number(on('accelerate','KeyW','ArrowUp'))-Number(on('reverse','KeyS','ArrowDown')),r=Number(on('right','KeyD','ArrowRight'))-Number(on('left','KeyA','ArrowLeft')),a=yaw();
    return{x:r*Math.cos(a)-f*Math.sin(a),z:-r*Math.sin(a)-f*Math.cos(a),jump:jumpInput.read(consumeJump)};
  }
  function refresh(){if(!root){panel.hidden=!(active&&restoreLocked());if(!panel.hidden){message.textContent=restoreSession.message;game.refresh({busy:true,blocked:true,context:'stopped',loadText:'停止中',menuHint:restoreSession.message});}return;}const close=!!root&&state.map==='construction'&&(work.schema===2?near():Math.abs(state.position.x-root.position.x)<380&&Math.abs(state.position.z-root.position.z)<320);panel.hidden=!close&&!active&&!resumeAvailable();canvas.parentElement.classList.toggle('world-timber-near',!panel.hidden);if(panel.hidden)return;
    button('begin').hidden=active;button('begin').disabled=(!near()&&!resumeAvailable())||busy||blocked||restoreLocked();button('begin').textContent=resumeAvailable()?'保存したクレーンを再開':'作業を始める';panel.querySelector('.wt-active').hidden=!active;
    if(button('join-practice')){button('join-practice').hidden=active;button('join-practice').disabled=!near()||busy||blocked||restoreLocked()||work.work.parts.length>0;}
    panel.querySelector('.wt-mode').textContent=practice?'貸出2枚・保存しません':service.mode==='readonly'?'表示確認・保存なし':service.mode==='integration'?'本体とは別の接続確認保存':'作業を保存できます';
    // The inactive card only offers resume. Its hidden work pages must not
    // recompute full placement/support plans while the player walks or jumps.
    if(!active){const nextMessage=blocked?issue:busy?'セーブしているよ…':issue||(resumeAvailable()?'保存した作業の続きから再開できるよ。':near()?'クレーンの左側から作業を始められます。':'');if(message.textContent!==nextMessage)message.textContent=nextMessage;game.refresh({busy:busy||restoreLocked(),blocked:blocked||!!restoreSession?.invalid,context:work.work.rig.mode,loadText:'',menuHint:menuSaveNote});return;}
    const w=assemblyState(posedWork()),t=worldTimberTotals(work),rig=w.rig,aboard=rig.mode==='driving',moving=!!rig.transition,crane=aboard&&w.work,p=w.parts.find(p=>p.id===w.held),materialObstacles=craneGroundObstacles(w,worldTimberMaterialObstacles(rig,externalVolumes()),localHeight),candidate=pickOption(w),preview=floatingPlacement(timberPhysicsState(w),materialObstacles),join=joinOption(w),detach=detachOption(w);
    panel.querySelector('.wt-stats').textContent=`保管 ${practice?received()/FLOOR_VOLUME-w.parts.length:(service.constructionStock?.stored['mars-timber']??0)/FLOOR_VOLUME}組 ｜置場 ${w.parts.filter(p=>!p.fixed&&!p.hover&&p.id!==w.held).length}個 ｜吊り荷 ${Number(!!w.held)}個 ｜浮遊 ${t.floating}枚 ｜設置 ${w.parts.filter(p=>p.fixed).length}個`;
    message.textContent=blocked?issue:busy?'セーブしているよ…':issue||(active?(w.message||rig.message):resumeAvailable()?'保存した作業の続きから再開できるよ。':near()?'クレーンの左側から作業を始められます。':`火星木材区画 X ${root.position.x} / Z ${root.position.z}`);
    const off=busy||blocked||restoreLocked()||moving||!!w.joining;for(const b of panel.querySelectorAll('.wt-active button'))b.disabled=off;
    panel.querySelector('.wt-drive').hidden=crane;panel.querySelector('.wt-crane').hidden=!crane;panel.querySelector('[data-hold="jump"]').hidden=rig.mode!=='foot';

    button('interact').textContent=aboard?'降りる':moving?'乗降中…':'乗る';button('interact').disabled=off||!(aboard?!w.work&&w.deployment===0&&craneExitOption(w,materialObstacles):craneBoardOption(w,materialObstacles));
  setBoardPrompt(button('interact'),w.rig.mode,!button('interact').disabled);
    button('mode').textContent=w.work?'走行へ戻る':'クレーン作業へ';button('mode').disabled=off||!aboard||!!p||Math.abs(rig.vehicle.speed)>.8||w.deployment>0&&w.deployment<1;
    // A hidden stock page must not rescan every point below a new full board at
    // every HUD refresh. Opening that page runs the same complete check again.
    button('issue').disabled=off||button('issue').closest('.gv-page')?.hidden||!issueOption(w,materialObstacles).ok||!practice&&(service.constructionStock?.stored['mars-timber']??0)<FLOOR_VOLUME;button(BEAM_ISSUE).disabled=off||button(BEAM_ISSUE).closest('.gv-page')?.hidden||!issueOption(w,materialObstacles,BEAM_ISSUE).ok||!practice&&(service.constructionStock?.stored['mars-timber']??0)<FLOOR_VOLUME;button('pick').disabled=off||!candidate||!crane||candidate?.hover&&component(w,candidate.id).length>1;button('rotate').disabled=off||!p||!!w.rotation;button('release').disabled=button('rotate').disabled||isBeamBundle(p)||isKitCargo(p);button('release').title=isBeamBundle(p)?'角材の束は床や地面に置こう。':'';
    button('join').disabled=off||!join.ok;button('join').title=join.reason;button('join').textContent=w.joining?`接合中 ${Math.round(w.joining.elapsed/1.2*100)}%`:'床に接合';
    button('detach').disabled=off||!detach.ok;button('detach').title=detach.reason;
    button('rotate').textContent=w.rotation?`回転中 ${Math.round((p.angle-w.rotation.start)*180/Math.PI)}° / 90°`:'部材を90°回す';
    button('place').disabled=off||!preview?.ok;button('return-stock').disabled=off||!returnOption(w).ok;
    button('upper').textContent=upper&&upperSuspended?'運ぶのをつづける':'建物へ運ぶ（クレーン）';button('upper').disabled=off||!crane||!p||!!w.rotation||!!upper&&!upperSuspended;
    button('bay').textContent=bay&&upperSuspended?'運ぶのをつづける':'📦 ローラー・荷物リフト';button('bay').disabled=off||!crane||!!p||!!bay&&!upperSuspended;
    panel.querySelector('.wt-bay').hidden=!bayOpen;panel.dataset.bayChoosing=String(bayOpen);panel.dataset.bayMoving=String(!!bay);liftMeter.hidden=!bay||bay.kind!=='lift';liftMeter.value=bayProgress;
    button('upper-stop').hidden=!upper&&!bay;button('upper-stop').disabled=off;
    button('bay-resume').hidden=!bay||!upperSuspended;button('bay-resume').disabled=off||!bay||!upperSuspended;panel.dataset.bayPaused=String(!!bay&&upperSuspended);
    panel.querySelector('.wt-upper').hidden=!upperOpen;
    if(upperOpen&&panel.querySelector('.wt-upper').closest('.gv-page')?.hidden){upperOpen=false;upperChoice=null;upperPoint=null;upperPreview=null;panel.querySelector('.wt-upper').hidden=true;}
    panel.dataset.upperChoosing=String(upperOpen);panel.dataset.pointSelecting=String(upperOpen&&!!upperChoice);panel.querySelector('.wt-upper-choices').hidden=!!upperChoice;panel.querySelector('.wt-point').hidden=!upperChoice;
    if(upperChoice){readUpperPreview(false,materialObstacles);panel.querySelector('.wt-point-title').textContent=upperPreview?.label??upperChoice.label;panel.querySelector('.wt-point-note').textContent=upperPreview?.reason||issue||'置き先をえらび直そう。';panel.querySelector('.wt-point').dataset.valid=String(!!upperPreview?.ok);panel.querySelector('.wt-point-steps').hidden=!upperPoint;panel.querySelector('.wt-point>small').hidden=!upperPoint;button('upper-go').disabled=off||!upperPreview?.ok;button('upper-back').disabled=off;for(const btn of panel.querySelectorAll('[data-point-step]'))btn.disabled=off||!upperPoint;}
    for(const b of panel.querySelectorAll('[data-upper-choice]')){const t=upperChoices.find(v=>v.id===b.dataset.upperChoice);b.disabled=off||!t||!t.ok&&['bay','lift','kit'].includes(t.surface);}
    if(!panel.querySelector('.wt-kit').hidden)for(const b of panel.querySelectorAll('[data-kit-choice]')){const q=off?null:kitPickupOption(kitWorld(),b.dataset.kitChoice);b.disabled=off||!q?.ok;if(q)b.nextElementSibling.textContent=q.reason;}
    const kb=w.buildingKits?.[0],kw=kb?kitWorld():null;button('kit-pickup').disabled=off||!crane||!!p||!!kb||practice||preview||service.mode!=='live';
    for(const [action,source]of[['kit-give',false],['kit-return',true]]){const q=kb?kitTransferOption(kw,kb.projectId,source):{ok:false,reason:'先に建築キットを吊ろう。'};button(action).hidden=!kb;button(action).disabled=off||!q.ok;button(action).title=q.reason;}
    if(!crane||upperOpen||bayOpen)panel.querySelector('.wt-kit').hidden=true;
    button('precision').textContent=precision?'微調整 ON（¼速）':'微調整 OFF';button('precision').setAttribute('aria-pressed',String(precision));button('precision').disabled=off||!crane;
    button('snap').textContent=w.snap?'面合わせ ON':'面合わせ OFF';button('leave').disabled=off||aboard||!rig.player.grounded;
    button('save').disabled=busy||blocked||restoreLocked()||moving||practice||service.mode==='readonly';button('save').textContent=practice?'貸出：保存なし':'木材作業を保存';button('camera').disabled=busy||blocked||restoreLocked();
    for(const b of panel.querySelectorAll('.wt-crane button'))b.disabled=off||w.deployment<1;
    const floating=w.parts.find(p=>p.hover),f=floatReadout(w,floating?.id),h=hook(w);
    panel.querySelector('.wt-detail').textContent=(rig.mode==='foot'?`足元 ${rig.player.y.toFixed(1)} ｜ `:`フック高さ ${h.y.toFixed(1)} ｜ `)+(f.active?`浮遊床 ${f.count}枚：基準 ${f.target.toFixed(1)} / 現在 ${f.height.toFixed(1)} ｜荷重 ${f.load.toFixed(2)} / 支持力 ${f.capacity} ｜ `:'')+`接合 ${w.joints.length}組 ｜ `+(w.joining?'接合金具で引き寄せ中。次の操作は予約しません。':p?`${join.reason} ／ ${returnOption(w).reason}`:detach.ok?detach.reason:'浮遊床の辺へもう1枚を寄せて「床に接合」。外すときは床中央へフックを下ろします。');
    if(upper||bay)for(const b of panel.querySelectorAll('[data-hold],[data-action]'))if(!['upper-stop','camera',...(upperSuspended?[bay?'bay':'upper',...(bay?['bay-resume']:[])]:[])].includes(b.dataset.action))b.disabled=true;
    game.refresh({busy:busy||restoreLocked(),blocked:blocked||!!restoreSession?.invalid,context:crane?'working':rig.mode,loadText:'吊り荷 '+Number(!!w.held)+' 個',menuHint:moving?'乗り降りの途中です。ゲームに戻って再開し、乗り降りが終わると保存できます。':menuSaveNote});
  }
  let lastContext=null,posed=null,posedSource=null;
  function posedWork(){if(work?.schema!==2||!root)return work.work;if(posedSource===work&&posed)return posed;try{lastContext=craneGroundContext(work.work,localHeight);}catch(e){issue=e.message;}posedSource=work;posed={...work.work,groundPose:lastContext};return posed;}
  function groundPose(){if(work?.schema!==2||!root)return null;try{return craneChassisFrame(posedWork());}catch{return null;}}
  function render(dt){upperMarker.visible=false;if(!root)return;const mark=upper?.target??(upperOpen?(upperPreview??upperChoices.find(v=>v.ok)):upperPlaced),part=work.work.parts.find(p=>p.id===work.work.held);if(active&&mark?.target&&part){upperMarker.visible=true;const invalid=upperOpen&&upperPreview&&!upperPreview.ok;upperMarker.material.color.setHex(invalid?0xf17475:0xffd34e);upperOutline.material.color.setHex(invalid?0xd8374e:0xd28c00);upperMarker.position.set(root.position.x+mark.target.x,mark.target.y+.6,root.position.z+mark.target.z);upperMarker.rotation.y=part.angle;upperMarker.scale.set(part.w,1,part.d);}presentation.draw(work.work,readPresentationRevision?.(),()=>{liftView.sync(service.constructionHighBuild,work.work);updateWorldTimberModel(root,posedWork(),{active,time,ground:groundPose(),heightAt:localHeight,external:worldTimberMaterialObstacles(work.work.rig,externalVolumes())});},{live:active});if(!active)return;
    const w=work.work,l=w.rig,p=work.schema===2?fieldActorPose(l,root.position,fieldHeightAt,groundPose()):actorPose(l),d=root.userData;
    if(l.mode==='driving'){d.crane.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+p.x,p.y-d.crane.userData.measurement.footBottom,root.position.z+p.z);character.rotation.set(0,p.heading,0);}
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.heading=p.heading;state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;shadow.visible=false;
    if(bayView){const r=highProjects(service.constructionHighBuild).find(p=>p.id===bayView.projectId)?.record;let part=w.parts.find(p=>p.id===bayView.partId);if(r&&bayView.kind==='lift'){const h=liftState(w,bayView.projectId).height;bayView={...bayView,level:h/40};if(!part){const p=highWorldPoint(r.site,{x:32,y:h,z:308});part={x:p.x-root.position.x,y:p.y,z:p.z-root.position.z,w:80,d:56,angle:r.site.turn*Math.PI/2+Math.PI/2};}}if(r&&part){const pos=highWorldPoint(r.site,bayView.kind==='lift'?(view===0?{x:200,y:130+(bayView.level??0)*40,z:610}:view===1?{x:-190,y:110+(bayView.level??0)*40,z:550}:{x:280,y:300+(bayView.level??0)*40,z:620}):view===0?{x:100,y:35+(bayView.level??0)*40,z:300}:view===1?{x:-120,y:32+(bayView.level??0)*40,z:230}:{x:180,y:240+(bayView.level??0)*40,z:320}),look={x:root.position.x+part.x,y:part.y+4,z:root.position.z+part.z},dx=pos.x-look.x,dz=pos.z-look.z,dy=pos.y-look.y,d=Math.hypot(dx,dy,dz)*Math.max(1,.72/camera.aspect),a=orbit.yaw(Math.atan2(dx,dz)),pitch=orbit.pitch(Math.atan2(dy,Math.hypot(dx,dz)));camera.position.set(look.x+Math.sin(a)*Math.cos(pitch)*d,look.y+Math.sin(pitch)*d,look.z+Math.cos(a)*Math.cos(pitch)*d);camera.lookAt(look.x,look.y,look.z);upperMarker.visible=true;upperMarker.position.set(look.x,part.y+.2,look.z);upperMarker.rotation.y=part.angle;upperMarker.scale.set(part.w,1,part.d);readout();return;}}
    const strides=gait.update(p,l.mode==='foot'&&l.player.grounded!==false&&!busy&&!blocked&&!game.paused&&!document.hidden,dt);for(const[i,f]of(character.userData.walkRig?.feet||[]).entries())f.part.position.copy(f.basePosition).y+=strides[i%2];
    const h=hook(posedWork()),v=l.vehicle,target=view===2?new THREE.Vector3(root.position.x+(work.schema===2?p.x:0),18,root.position.z+(work.schema===2?p.z:0)):l.mode==='foot'?new THREE.Vector3(root.position.x+p.x,p.y+17,root.position.z+p.z):new THREE.Vector3(root.position.x+v.x+(h.x-v.x)*.35,18+Math.max(0,h.y-20)*.3,root.position.z+v.z+(h.z-v.z)*.35);
    const a=mark?.surface==='platform'&&view===0?orbit.yaw(Math.atan2(v.x-mark.target.x,v.z-mark.target.z)+.4):yaw(),pitch=orbit.pitch(view===2?1.1:mark?.surface==='platform'?.24:.75);let dist=(view===2?710:285)*Math.max(1,1.1/camera.aspect);if(l.mode!=='foot')target.y+=groundPose()?.position[1]??0;
    if((upperOpen&&upperChoice||upper||upperPlaced)&&!game.menuOpen){const rect=canvas.getBoundingClientRect(),box=panel.getBoundingClientRect(),side=box.height>rect.height*.7&&box.width<rect.width*.6,sx=side?box.width*.5:0,sy=side?0:box.height*.5;if(!pointCameraOffset||camera.view?.offsetX!==sx||camera.view?.offsetY!==sy||camera.view?.fullWidth!==rect.width||camera.view?.fullHeight!==rect.height)camera.setViewOffset(rect.width,rect.height,sx,sy,rect.width,rect.height);pointCameraOffset=true;dist=Math.max(dist,360*Math.max(1,.85/camera.aspect));}else if(pointCameraOffset){camera.clearViewOffset();pointCameraOffset=false;}
    if(mark?.target){const selected=upperOpen&&upperPoint?highProjects(service.constructionHighBuild).find(p=>p.id===upperPoint.projectId)?.record:null,focus=selected?{x:selected.site.x-root.position.x,y:selected.site.y+upperPoint.level*40,z:selected.site.z-root.position.z}:mark.target;target.set(root.position.x+(v.x+focus.x)/2,Math.max(34,focus.y+12),root.position.z+(v.z+focus.z)/2);dist=Math.max(dist,Math.hypot(v.x-focus.x,v.z-focus.z)*1.55);}
    camera.position.copy(target).addScaledVector(new THREE.Vector3(Math.sin(a)*Math.cos(pitch),Math.sin(pitch),Math.cos(a)*Math.cos(pitch)),dist);camera.lookAt(target);readout();
  }
  function install({group,presentationRevision=null,blockedAt,collider,physics,contactGeometry:readContactGeometry=null,fieldSolids=null,groundHeightAt=null,groundUpperBound=null}){readPresentationRevision=presentationRevision;presentation.reset();
    if(active)throw Error('木材作業中は区画を再構築できません。');stopUpper();upperOpen=false;if(root){disposeSpaceMaterialBook(root);root=null;}bindings=[];panel.hidden=true;canvas.parentElement.classList.remove('world-timber-near');if(state.map!=='construction')return;
    contactGeometry=typeof readContactGeometry==='function'?readContactGeometry:null;readFieldSolids=fieldSolids;fieldHeightAt=groundHeightAt;fieldUpperBound=groundUpperBound;heightCache.reset();lastContext=null;posed=null;posedSource=null;
    if(!work){fresh();if(!work){const site=TIMBER_YARDS.findIndex(([x,z])=>!blockedAt(x,z,390));if(site<0)return;work=initialWorldTimber(site,received());}}
    const[x,z]=TIMBER_YARDS[work.siteIndex];if(work.schema!==2&&blockedAt(x,z,390)){issue='保存済み建物と木材区画が重なっています。建物を動かさず停止しました。';return;}
    root=createWorldTimberModel(work.work);root.position.set(x,0,z);group.add(root);
    for(const b of work.schema===2?[]:TIMBER_FENCES)collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-timber-fence',0,{minY:0,maxY:b.height,obstacleHeight:b.height});
    const ground=groundPose();if(ground){const b=fieldGroundBounds(ground);collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-timber-ground-body',0,{minY:b.minY,maxY:b.maxY,obstacleHeight:b.maxY});}
    for(const b of worldTimberVehicleVolumes({...work,work:posedWork()}))collider(b.x,b.z,[b.w,b.d],b.angle,`construction-timber-${b.id}`,0,{minY:b.y,maxY:b.y+b.h,obstacleHeight:b.y+b.h});
    for(const g of worldTimberGeometry(work)){const floor=physics.floor({...g}),ceiling=physics.ceiling({...g}),edges=timberEdges(g).map(e=>physics.collider(e));bindings.push({id:g.id,floor,ceiling,edges});}
    render(0);refresh();
  }
  function syncPhysics(){const all=worldTimberGeometry(work);for(const b of bindings){const g=all.find(p=>p.id===b.id);if(!g)continue;Object.assign(b.floor,g);Object.assign(b.ceiling,g);timberEdges(g).forEach((e,i)=>Object.assign(b.edges[i],e));}}
  return{look(dx,dy,sensitivity){if(active&&!game.menuOpen&&!restoreLocked())orbit.drag(dx,dy,sensitivity);},get active(){return active;},get movingGround(){const w=work?.work;return !!w&&(!!w.held||!!w.rotation||!!w.joining||!!w.rig.transition||Math.abs(w.rig.vehicle.speed)>.001||w.parts.some(p=>!p.fixed));},get autoSaveKey(){return active?constructionWorkAutoSaveKey(work,view):null;},get resumePoint(){return active?{kind:'timber',revision:work.revision,view}:null;},resumeSaved(point){if(!point||point.kind!=='timber'||point.revision!==expected||!Number.isInteger(point.view)||point.view<0||point.view>2||active||!root||busy||blocked||restoreLocked()||practice||preview||service.mode!=='live'||state.map!=='construction'||!canResume({kind:'timber',savedDriver:work.work.rig.mode==='driving'}))return false;view=point.view;begin(false,{automatic:true});return active;},get busy(){return busy||saving||restoreLocked();},get dirty(){return !!work&&work.revision!==expected;},install,save,autosave:()=>work&&!restoreLocked()?save({automatic:true}):false,leave,begin,get parkingSite(){return work?.siteIndex??null;},reloadSaved(){if(active||busy||saving)throw Error('作業を終えてから移設してください。');work=null;fresh();},
    overlapsBuild(p,size){return !!root&&(work.schema===2?fieldWorkOverlaps(root.position,p,size,[{...work.work.rig.vehicle,width:88,depth:90},...work.work.parts]):overlapsWorldYardBuild([root.position.x,root.position.z],p,size));},
    contactGeometry(){const floors=work?[...worldTimberGeometry(work),...boardLiftContactGeometry(service.constructionHighBuild,work.work)]:[];return{floors,walls:floors.flatMap(timberEdges)};},
    doorTarget(){return state.map==='construction'?nativeDoorTarget(work,root?.position,{busy:busy||blocked||restoreLocked(),active,groundHeightAt:fieldHeightAt}):null;},
    enterAtDoor(){
      const door=nativeDoorTarget(work,root?.position,{busy:busy||blocked||restoreLocked(),active,groundHeightAt:fieldHeightAt});
      if(!door||Math.hypot(state.position.x-door.x,state.position.z-door.z)>.6||state.jumpY||state.falling)return false;
      clear();
      try{
        work=enterWorldTimber(work,{x:state.position.x,y:work.schema===2?0:state.groundY,z:state.position.z,heading:door.heading},received());
        active=true;auto=0;savedWorkAwaitingResume=false;issue='';
        owns(true);render(0);refresh();return true;
      }catch(e){issue=e.message;refresh();return false;}
    },
    previewSpawn(){return preview&&root?{x:root.position.x-58,z:root.position.z-88,heading:0}:null;},
    update(dt){jumpControl.sync();liftView.root.visible=state.map==='construction'&&!!root;const baySeconds=bayClock.step(active&&state.map==='construction'&&!!root&&!!bay&&!upperSuspended&&!busy&&!blocked&&!restoreLocked()&&!game.paused&&!document.hidden)/1000;currentStep=dt;heightCache.reset();posed=null;posedSource=null;if(active&&restoreLocked()&&!root){refresh();return true;}if(state.map!=='construction'||!root)return false;if(!game.paused)time+=dt;
      if(!restoreLocked()&&blocked&&retryPending&&service.blocked===false){fresh();onKitChange();blocked=false;retryPending=false;issue='';if(active)work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      if(!busy&&!blocked&&!restoreLocked()&&!game.paused&&!document.hidden&&(!savedWorkAwaitingResume||active)){if(active)savedWorkAwaitingResume=false;menuSaveNote='';try{
        if(active){const mode=work.work.rig.mode,joining=work.work.joining;const controls=input(work.work.phase+dt>=1/120-1e-9),quiet=(bay||bayOpen||bayView)&&!upper&&boardBayQuietInput(work.work,controls);if(!quiet){const next=advanceWorldTimber(work,controls,dt,externalVolumes(),localHeight);if(work.schema===2&&!fieldGroundTravelAllowed(work.work,next.work,root.position,fieldHeightAt,externalVolumes())){const oldRig=work.work.loader??work.work.rig,newRig=next.work.loader??next.work.rig;newRig.vehicle={...oldRig.vehicle,speed:0};newRig.player={...oldRig.player};next.work.message='ここは急な坂や穴があるよ。ゆるやかな道を通ろう。';work=next;}else work=next;}if(work.work.rig.mode!==mode)clear();if(joining&&!work.work.joining){clear();checkpointGeneration++;auto=9;}}
        else{const r=idleWorldTimber(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading,grounded:!state.falling&&state.jumpY===0,vy:state.jumpVelocity},dt);work=r.state;if(r.carry.y||r.carry.x||r.carry.z){state.position.x+=r.carry.x;state.position.z+=r.carry.z;state.groundY+=r.carry.y;}syncPhysics();}
        finishUpper();if(active&&bay&&!upperSuspended){const operation=bay,out=bay.direction==='outside',r=(bay.kind==='lift'?advanceBoardLift:advanceBoardBay)(bay,work,baySeconds,{collection:service.ledger.world.constructionHighBuild,external:externalVolumes(),heightAt:bayHeight()});work=r.state;bay=r.job;bayProgress=r.progress??bayProgress;issue=r.reason||(operation.kind==='lift'?r.arrived?operation.mode==='vertical'?operation.target===0?'リフトが地上に着いたよ！':(operation.target/40+1)+'階に着いたよ！「受取台へ運ぶ」で渡そう。':operation.mode==='unload'?'受取台へ運んだよ！ 次はローラーで部屋へ。':'リフトにのせたよ！ 行き先をえらぼう。':'荷物リフト｜'+(operation.mode==='vertical'?(operation.target/40+1)+'階へ':'受け渡し')+' '+Math.round(bayProgress*100)+'％':r.arrived?out?'外の受取台へ床板を戻したよ！':'部屋へ床板を運び終わったよ！':'床板を運んでいるよ '+Math.round(bayProgress*100)+'％');if(!bay){checkpointGeneration++;auto=9;}}auto+=dt;
      }catch(e){fail(e);}}
      render(game.paused?0:dt);ui+=dt;if(ui>.15){ui=0;refresh();}
      if(pendingExit&&!work.work.rig.transition&&!busy&&!blocked&&!restoreLocked()){const next=pendingExit;pendingExit=null;void leave(next);}
      if(!game.menuOpen&&auto>8&&!saving&&constructionWorkAutoSaveKey(work,view)!==lastAutomaticKey&&!busy&&!blocked&&!restoreLocked()&&!practice&&service.mode!=='readonly'&&!work.work.rig.transition&&Math.abs(work.work.rig.vehicle.speed)<.01&&!held.size&&!keys.size)void save({automatic:true});return active;
    },
  };
}
