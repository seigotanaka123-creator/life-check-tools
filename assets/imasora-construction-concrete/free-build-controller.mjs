import{createPresentationCache}from'../imasora-construction-presentation-cache.mjs?v=120gi';
import {sameConstructionRecordValue} from '../imasora-construction-record-equality.mjs';
import {createUpperPumpControls} from './high-pump-controls.mjs?v=120ft';
import {highCastings} from './high-casting-state.mjs?v=120ft';
import {upperFeedPath,sampleUpperPath,upperWorkViewAngle} from '../imasora-construction-high-casting.mjs?v=120gn';
import {bindJumpButton} from '../imasora-construction-locomotion.mjs?v=120gf';
import {commitConcreteDoorEntry} from './native-door.mjs?v=120gn';
import {createVehicleSelector} from '../imasora-construction-vehicle-select.mjs?v=120gn';
import {openConstructionGuide,constructionOverlayOpen} from '../imasora-construction-overlays.mjs?v=120gm';
import {createStencilPlacement,placedStencilGuide,stencilPlacementLabel} from './stencil-placement.mjs?v=120dp';
import {workshopGuide} from './workshop-guide.mjs?v=120dq';
import {installColorStudios} from './color-studio.mjs?v=120ds';
import {refreshPaintDeck} from './paint-deck.mjs?v=120ds';
import {refreshPopMenus,renderToolInventory} from '../imasora-pop-menu.mjs?v=120dm';
import {createHeldDashButton} from '../imasora-hold-dash.mjs?v=119bf';
import {createPaintMaskSelection,unmaskedPaintPixels} from './free-paint-mask.mjs?v=120dk';
import {maskingPlan,assertMaskingPlan} from './free-masking-operation.mjs?v=120gn';
import {createPaintDrawing,paintLinePixels} from './free-drawing.mjs?v=120dh';
import {PAINT_REMOVE_COLOR,paintRemovalPixels} from './free-paint-removal.mjs?v=120dm';
import {paintColor,paintName,validPaintColor} from './paint-colors.mjs?v=120ds';
import {createFreeProgressClock} from './free-progress-clock.mjs?v=119bn';
import {HOSE_TRANSFER_ACTIONS,createHoseTransferFeedback} from './free-hose-meter.mjs?v=120d';
import {chooseSteeredVehicleTravel} from './free-vehicle-travel.mjs?v=120dq';
import {FREE_STEP_ACTIONS,freeStepUndoTarget} from './free-step-undo.mjs?v=120ft';
import {assertFreeStepUndoEnvironment} from './free-step-undo-environment.mjs?v=120gn';
import {assertWorkPlatformRecord} from './free-platform-record.mjs?v=120gn';
import {lastProjectOperation} from './project-history.mjs';
import {projectHistoryStatus,historyActionAllowed} from './free-history-status.mjs?v=120gn';
import {assertRaisedPaintSupport,paintNeedsGroundAccess,foundationPaintUsesLanding} from './free-foundation-access.mjs?v=120gn';
import {constructionBase,RAISED_FRAME_ACTION,RAISED_BASE_MAX,foundationSurfaceAt,assertFoundationSupport,supportedToolBlocked} from './free-supported-build.mjs?v=120gn';
import {inspectFormGround,requireFormGround} from './free-foundation-check.mjs?v=120gn';
import {FOUNDATION_ACTIONS,foundationBoardCount,foundationAvailableBoards,foundationContains,foundationGeometry} from './free-foundation-state.mjs?v=120gn';
import {foundationActionFromPlan,assertFoundationEnvironment} from './free-foundation-operation.mjs?v=120gn';
import {createMonsterTravelInput,constructionTravelAllowed} from './monster-travel-input.mjs?v=119bf';
import {createConstructionMovePad} from './move-pad.mjs?v=119bf';
import {FREE_PLAY_MODES,FREE_PLAY_LABELS,nextFreePlayMode,freePlayActions,freePlayTemplate,freeModeNavigationKey,freeStageGuide,freeConfirmation,freeMenuBlocked} from './free-play-ui.mjs?v=120gn';
import {createFreeBuildView} from './free-build-view.mjs?v=120gn';
import {CONCRETE_CAMERA_MODES} from './monster-camera.mjs';
import {freeLocationProblem,emptySiteProblem,freePourProblem,freePaintCost,freeGeometry,freeFrameBoards,freeTruckLoad} from './free-build-state.mjs?v=120gn';
import {transitionProfileProject,profileWorkUndoHistory} from '../imasora-construction-profile-project.js?v=120gn';
import {createWorkUndoCursor} from './free-undo-cursor.mjs?v=120ft';
import {availableMixCells} from './mixing.mjs';
import {FREE_CONTACT_ACTIONS} from './free-contact.mjs?v=120gn';
import {castingProblem} from './free-casting.mjs?v=120gn';
import {FREE_VEHICLE_ACTIONS,concreteVehicleGeometry,overlaps} from './free-vehicle-contact.mjs?v=120gn';
import {PIPE_ACTIONS,pipeContactGeometry} from './free-boom-contact.mjs?v=120gn';
import {assertStarterTool,requiredStarterTool} from '../imasora-construction-toolkit.mjs?v=120fs';

import {createFreeWorkEditor} from './free-work-editor.mjs?v=120gn';
import {freeWorkMask,freePlacedFill} from './free-work-parts.mjs';
import {designFromWork,designBookEntries,designReuseProblem,DESIGN_HEIGHT_NAMES} from './design-book.mjs?v=120gn';
import {shapePicture} from '../imasora-pop-menu.mjs?v=120dm';
import {SUPPORTED_WORK_MOVE,supportedWorkMoveEnvironmentProblem} from './free-supported-work-move.mjs?v=120gn';
import {freeWorkMoveEnvironmentProblem} from './free-work-move.mjs?v=120gn';
import {freeWorkEnvironmentProblem} from './free-work-edit.mjs?v=120gn';

export function createFreeBuildController({service,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onLayoutChange,onError,launcher,canEnter}){
 const open=document.createElement('button');open.textContent='自由建築をはじめる';open.title='型枠・塗装・ミキサー車・ポンプ車で自由につくる';launcher.append(open);
 const panel=document.createElement('section');panel.className='concrete-controls free-concrete';panel.hidden=true;panel.setAttribute('aria-label','自由建築');
 panel.innerHTML=freePlayTemplate();
 canvas.parentElement.append(panel);panel.addEventListener('pointerdown',e=>e.stopPropagation());
 const q=s=>panel.querySelector(s),button=id=>q(`[data-free="${id}"]`),view=createFreeBuildView({scene,camera,model:character,host:canvas.parentElement});
 // Reserve the actual notice/header height, including wrapped text on small screens.
 if(typeof ResizeObserver!=='undefined'){const hudSize=new ResizeObserver(()=>{const h=Math.ceil(q('.free-hud-top').getBoundingClientRect().height);if(h>0)panel.style.setProperty('--free-hud-size',h+'px');const b=Math.ceil(q('.free-basics').getBoundingClientRect().height);if(b>0)panel.style.setProperty('--free-basics-size',b+'px');});hudSize.observe(q('.free-hud-top'));hudSize.observe(q('.free-basics'));}
 const doorActions=button('truck').parentElement,travel=q('.concrete-travel');
 const writeText=(selector,value)=>{const element=q(selector);if(element.textContent!==value)element.textContent=value;};
 let travelBoost=null,dashControl=null,driving=false,progressSaving=false,groundPreview=false,workWatching=false;
 let paintTool='roller',vehicleJob='truck',moreActions=false,colorStudios=null;
 let bookKey='';let buildPage='shape';let deckFolded=false;let mode='move',sheet=null,restoreFocus=null,swipe=null,suppressModeClick=false;
 let doorWalk=null,doorSearch=null;
 function stopDoorWalk(){doorSearch?.abort();doorSearch=null;doorWalk=null;view.stopWalking();}
 function clearFoot(){jumpControl?.cancel();view.releaseJump();stopDoorWalk();travelBoost?.reset();view.stopWalking();}
 async function walkToVehicle(name){if(!ready()||free().aboard||view.onAccess)return;clearFoot();sheet=null;mode='move';deckFolded=true;const search=new AbortController();doorSearch=search;const version=project().revision;note='ドアまでの道をたしかめているよ。';refresh();try{const path=await view.planDoorWalk(name,{signal:search.signal});if(search.signal.aborted||doorSearch!==search)return;if(!ready()||project().revision!==version)throw Error('現場が変わったよ。もう一度、行きたい車をえらぼう。');doorWalk={name,path,stuck:0};note=(name==='truck'?'ミキサー車':'ポンプ車')+'のドアへ走っているよ。';}catch(e){if(!search.signal.aborted)note=e.message;}finally{if(doorSearch===search)doorSearch=null;refresh();}}
 function advanceDoorWalk(dt){if(!doorWalk)return;const run=doorWalk,p=view.footPosition;while(run.path.length&&Math.hypot(run.path[0].x-p.x,run.path[0].z-p.z)<.08)run.path.shift();if(!run.path.length){stopDoorWalk();note='ドアに着いたよ！「'+(run.name==='truck'?'ミキサー車':'ポンプ車')+'に乗る」を押そう。';refresh();return;}view.walkDoorStep(run.path[0],dt);const q=view.footPosition;run.stuck=Math.hypot(q.x-p.x,q.z-p.z)<.01?run.stuck+dt:0;if(run.stuck>.35){stopDoorWalk();note='通り道がふさがったので止まったよ。もう一度ドアをえらぼう。';refresh();}}
 document.addEventListener('imasora-menu-peek-start',clearFoot);
 const paintMasks=createPaintMaskSelection(),drawing=createPaintDrawing(),stencilPlacement=createStencilPlacement();let stencilPointer=null;let drawingPointer=null,drawingWidth=1,brushLast=null;
 function placedPixels(){stencilPlacement.select(q('[data-stencil]').value,Number(q('[data-stencil-turn]').value),JSON.stringify(paintTarget()));return stencilPlacement.pixels;}
 function placedGuide(){placedPixels();return placedStencilGuide(q('[data-stencil]').value,Number(q('[data-stencil-turn]').value),stencilPlacement.offset);}
 const removal=new Set();let removalKey='';
 const progress=createFreeProgressClock(),hoseFeedback=createHoseTransferFeedback();let interruption=0;
 let pendingPlatformClear=false,pendingUndo=null,undoingMask=false;const maskUndos=[],undoCursor=createWorkUndoCursor();let undoProject=null,undoHistory=[];
 function coreUndoHistory(){const p=project();if(p!==undoProject){undoProject=p;undoHistory=profileWorkUndoHistory(p,service.constructionPackTrialStock);}return undoHistory;}
 function workUndoTarget(){currentMaskUndo();return undoCursor.select(coreUndoHistory(),maskUndos);}
 let nativeEntry=false,nativeVehicle=null,doorEnvironmentKey=null;
 let active=false,entering=false,busy=false,paused=false,note='',draftMask=0,draftHeight=2,cell=0,confirm=null,paintPointer=null,stroke=new Set(),cached=null,ledger=null,paintKey='',lastUI=0;
 let supportHeightAt=()=>null,placementHeightAt=()=>null,blockedAt=()=>true;const inert=new Map();
 const backgroundPresentation=createPresentationCache({sameSource:sameConstructionRecordValue});let readPresentationRevision=null;
 const project=()=>{if(ledger!==service.ledger){ledger=service.ledger;cached=service.constructionConcreteProject;}return cached;};
 const free=()=>project().freeBuild;
 const ready=()=>active&&!busy&&!paused&&!service.blocked&&!service.busy&&!confirm;
 const menuBlocked=()=>freeMenuBlocked({busy,progressSaving,confirm});
 const focusHigh=(anchor,detail=null)=>view.focusUpper(anchor,detail,anchor?upperWorkViewAngle(service.constructionHighBuild,anchor):null); const upperHost=document.createElement('div');q('.free-primary-actions').after(upperHost);
 const upperPump=createUpperPumpControls({host:upperHost,service,project,ready,run,show:()=>active&&mode==='vehicle'&&free().aboard==='pump'&&!sheet&&!confirm&&!deckFolded,paused:()=>!active||paused||!!sheet||!!confirm,onView:focusHigh,notice:text=>{note=text;}});
 let upperPipeBlockedAt=()=>true;
 const movementReady=()=>ready()&&!sheet;
 const vehicleSelector=createVehicleSelector({ids:['truck','pump'],onOpen:clearFoot,onClose:clearFoot,canWalk:()=>ready()&&!free().aboard&&!view.onAccess?true:'作業を終えて車を降りてから、ドアへ向かおう。',onWalk:walkToVehicle});
 const travelReady=()=>!(free()?.aboard&&projectHistoryStatus(project()).full)&&constructionTravelAllowed({active,paused,blocked:service.blocked,confirm,sheet,busy,serviceBusy:service.busy,driving,progressSaving});
 travelBoost=createMonsterTravelInput({enabled:travelReady,context:()=>free()?.aboard??'foot',onStop:()=>view.stopWalking(),fastHeld:()=>dashControl?.active===true,clearFast:()=>dashControl?.cancel()});
 function tryJump(){if(!movementReady()||free().aboard)return false;stopDoorWalk();if(!view.jump())return false;note=view.jumpCount+'段ジャンプ！';refresh();return true;}
 const jumpControl=bindJumpButton({element:q('[data-free-jump]'),enabled:()=>movementReady()&&!free().aboard&&view.jumpCount<3,canHold:()=>movementReady()&&!free().aboard,activate:tryJump,release:()=>view.releaseJump()});
 const padAllowed=()=>travelReady()&&(!free()?.aboard||!free().connected&&!free().hose&&!free()[free().aboard]?.legs);
 dashControl=createHeldDashButton({element:q('[data-hold-dash]'),enabled:padAllowed,context:()=>free()?.aboard??'foot'});
 const movePad=createConstructionMovePad({element:q('[data-construction-pad]'),input:travelBoost,enabled:padAllowed,onChange:()=>refresh()});
 function ownInput(yes){clearInput();for(const e of document.querySelectorAll('.world-toolbar,.control-card')){if(yes){inert.set(e,e.inert);e.inert=true;}else if(inert.has(e))e.inert=inert.get(e);}if(!yes)inert.clear();document.body.classList.toggle('world-concrete-playing',yes);document.body.classList.toggle('world-free-playing',yes);canvas.parentElement.classList.toggle('world-concrete-operating',yes);panel.hidden=!yes;shadow.visible=!yes;}
 function position(type='FREE_PLACE'){const p=project(),loc=free()?.location??p.location;for(const [dx,dz]of [[0,-360],[360,0],[-360,0],[0,360],[720,0],[-720,0]]){const pos={x:loc.x+dx,z:loc.z+dz,...(type==='FREE_PLACE'?{}:{retainVehicles:true})};if(freeLocationProblem(p,pos)||blockedAt(pos.x,pos.z,150))continue;try{const proposed=transitionProfileProject(p,{type,operationId:'candidate-site-check',...pos},p.revision,service.constructionPackTrialStock).state;view.siteEntryPose(proposed);return pos;}catch{}}return null;}
 const toolHeightAt=(x,z)=>foundationSurfaceAt(project().foundation,x,z)??supportHeightAt(x,z);
 function workEditProblem(work,mask){const p=project(),w=p.freeBuild.completed[work];if(p.schemaVersion>=13&&constructionBase(w)&&(mask&~freeWorkMask(w)))try{assertFoundationSupport(p,{heightAt:placementHeightAt,blockedAt});}catch(e){return e.message;}return freeWorkEnvironmentProblem(p,work,mask,{foot:view.footPosition,blockedAt,supportHeightAt:toolHeightAt});}
 function workMoveProblem(work,position,quarterTurns=0){return (constructionBase(free()?.completed[work])?supportedWorkMoveEnvironmentProblem:freeWorkMoveEnvironmentProblem)(project(),work,position,{foot:view.footPosition,blockedAt,supportHeightAt:placementHeightAt},quarterTurns);}
 function checkPlacement(a,handTool=null){if(a.type==='FREE_HIGH_CONNECT'||a.type==='FREE_HIGH_BEGIN'){
 const f=free(),c=highCastings(f).find(c=>c.id===a.castingId);if(!c)throw Error('屋上の型枠をえらび直そう。');const next={...f,highPipe:f.highPipe??{castingId:c.id,pump:f.pump}},path=upperFeedPath(service.constructionHighBuild,next,c,supportHeightAt);sampleUpperPath(path.slice(0,4),p=>{if(upperPipeBlockedAt(p.x,p.z,1.3,p.y))throw Error('上階ホースの通り道がふさがっているよ。車を少し動かそう。');});}
 if(a.type==='FREE_UNDO_STEP'){const next=transitionProfileProject(project(),a,project().revision,service.constructionPackTrialStock).state;assertFreeStepUndoEnvironment(project(),next,{foot:free().aboard?null:view.footPosition,blockedAt,heightAt:placementHeightAt,step:coreUndoHistory().at(-1)});if(view.onAccess&&coreUndoHistory().at(-1)?.type!=='FREE_PAINT')throw Error('階段で地上へ降りてから戻そう。');const platform=view.exportWorkPlatform();if(platform)try{assertWorkPlatformRecord(platform,next);}catch{throw Error('作業台を片付けてから、この作業を戻そう。');}const issue=view.stepUndoProblem(next);if(issue)throw Error(issue);return;}if(handTool==='stencil'&&!service.constructionProjectPreview)assertStarterTool(service.constructionToolkit,{type:'STENCIL_PAINT'});if(!service.constructionProjectPreview&&requiredStarterTool(a))assertStarterTool(service.constructionToolkit,a);if(view.onAccess&&!['FREE_PAINT','FREE_UNDO_PAINT','FREE_MIX_TICK','FREE_CURE_TICK'].includes(a.type))throw Error('階段で地上へ降りてから作業してください。');if(a.type==='FREE_PAINT')assertRaisedPaintSupport(project(),a,placementHeightAt,blockedAt);if(project().foundation&&(['FREE_FRAME',RAISED_FRAME_ACTION].includes(a.type)||constructionBase(free())&&['FREE_POUR','FREE_FINISH','FREE_DEMOLD','FREE_UNFRAME','FREE_CURE','FREE_CURE_TICK'].includes(a.type)))assertFoundationSupport(project(),{heightAt:placementHeightAt,blockedAt});if(FOUNDATION_ACTIONS.has(a.type))assertFoundationEnvironment(project(),a,{heightAt:placementHeightAt,blockedAt,foot:view.footPosition});if(a.type==='FREE_DESIGN')requireFormGround(free(),a.mask,a.height,supportHeightAt,blockedAt);if(['FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(a.type)){const issue=workMoveProblem(a.work,a,a.quarterTurns??0);if(issue)throw Error(issue);}if(a.type==='FREE_SET_WORK_PARTS'){const issue=workEditProblem(a.work,a.mask);if(issue)throw Error(issue);}if(['FREE_PLACE','FREE_NEXT','FREE_CHANGE_EMPTY_SITE'].includes(a.type)&&(blockedAt(a.x,a.z,150)||freeLocationProblem(project(),a)))throw Error('施工区画が建物・作品と重なります。');if(['FREE_NEXT','FREE_CHANGE_EMPTY_SITE'].includes(a.type))view.siteEntryPose(transitionProfileProject(project(),a,project().revision,service.constructionPackTrialStock).state);}
 async function run(type,extra={},animate=true,rescuePlan=null,handTool=null){
  if(view.airborne&&!['FREE_MIX_TICK','FREE_CURE_TICK'].includes(type)){note='着地してから作業しよう。';refresh();return false;}
  if(busy||paused||document.hidden||service.blocked||service.busy)return false;const started=interruption;if(projectHistoryStatus(project()).full){clearFoot();note=projectHistoryStatus(project()).message;refresh();return false;}if(type==='FREE_PAINT'&&!await prepareSurfaceWork(extra))return false;if(paused||document.hidden||started!==interruption)return false;const fromDialog=!!document.activeElement?.closest('[data-confirm],[data-play-sheet]');progressSaving=['FREE_MIX_TICK','FREE_CURE_TICK','FREE_HIGH_TICK'].includes(type)&&!animate;if(type!=='FREE_MOVE'&&!progressSaving)clearFoot();const fast=travelBoost.fast;driving=type==='FREE_MOVE';workWatching=animate&&!driving;if(!progressSaving)sheet=null;const a={type,operationId:crypto.randomUUID(),...extra,...(FREE_STEP_ACTIONS.has(type)?{recordStep:'ten'}:{})},p=project(),undoSource=type==='FREE_UNDO_STEP'?coreUndoHistory().at(-1)?.type:null;busy=true;if(type==='FREE_BOARD')note='目の前のドアを開けて乗り込みます。';else if(type==='FREE_LEAVE')note=rescuePlan?'救助先を確認し、降車を保存しています。':'ドアを開けて降り、ドア前に立ちます。';else if(type==='FREE_PAINT')note='施工面へ近づき、選んだ部分を塗っています。';refresh();
  let saved=false;
  try{if(animate&&!driving){await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));if(started!==interruption||paused||document.hidden)throw Error('作業を中止しました。材料は変更していません。');}if(!progressSaving){hoseFeedback.reset();if(HOSE_TRANSFER_ACTIONS.has(type))hoseFeedback.begin(a,p.freeBuild);}checkPlacement(a,handTool);const proposed=transitionProfileProject(p,a,p.revision,service.constructionPackTrialStock).state;const priorPlatform=['FREE_DESIGN','FREE_FRAME','FREE_FRAME_RAISED','FREE_FOUNDATION_BUILD'].includes(type)?view.exportWorkPlatform():null;if(priorPlatform&&(type==='FREE_FOUNDATION_BUILD'||proposed.freeBuild.mask!==priorPlatform.anchor.mask||proposed.freeBuild.height!==priorPlatform.anchor.height))throw Error('型枠の形や高さ・土台を変える前に、メニューから作業台を片付けてください。');const preflight=rescuePlan?(view.verifyVehicleRescue(rescuePlan),''):view.vehicleProblem(a);if(preflight)throw Error(preflight);const result=rescuePlan?view.prepareVehicleRescue(a,rescuePlan):animate?await view.perform(a,{fast,deferredFoundation:true}):null;if(started!==interruption||paused||document.hidden)throw Error('作業を中止しました。材料は変更していません。');checkPlacement(a,handTool);const finalCheck=rescuePlan?(view.verifyVehicleRescue(rescuePlan),''):view.vehicleProblem(a);if(finalCheck)throw Error(finalCheck);view.verifyFooting();if(HOSE_TRANSFER_ACTIONS.has(type)){hoseFeedback.saving();refresh();}await service.saveConstructionConcreteProject(a,p.revision,snapshot(),a.type===SUPPORTED_WORK_MOVE||FOUNDATION_ACTIONS.has(a.type)||FREE_CONTACT_ACTIONS.has(a.type)||FREE_VEHICLE_ACTIONS.has(a.type)||PIPE_ACTIONS.has(a.type)?result:null,['FREE_NEXT','FREE_CHANGE_EMPTY_SITE','FREE_FOUNDATION_REMOVE'].includes(type)?null:view.exportWorkPlatform());saved=true;if(['FREE_HIGH_CONNECT','FREE_HIGH_BEGIN'].includes(type))focusHigh(highCastings(free()).find(c=>c.id===extra.castingId).anchor);if(type==='FREE_HIGH_DISCONNECT')focusHigh(null);if(type==='FREE_UNDO_STEP')undoCursor.consume(a.operationId);else if(FREE_STEP_ACTIONS.has(type))undoCursor.newWork();progress.sync(free());if(!progressSaving)note=rescuePlan?'車をその場に残し、安全な地面へ戻りました。作品と材料は保持しています。':({FREE_FRAME:'型枠ができました！ 生コンを注ぎましょう。',FREE_FRAME_RAISED:'型枠ができました！ 生コンを注ぎましょう。',FREE_POUR:'生コンを注ぎました。続けて注ぐ場所を選べます。',FREE_FINISH:'なめらかになりました！ 次は固めましょう。',FREE_CURE:'固めています。完成までもう少し！',FREE_DEMOLD:'完成！ 好きな色で仕上げましょう。',FREE_PAINT:'塗れました！ 次の場所も同じ道具で塗れます。',FREE_UNDO_STEP:'1つ前の作業に戻したよ。材料も戻っているよ。',FREE_UNDO_PAINT:'さっきの塗装を戻したよ。ペンキも戻っているよ。',FREE_BUCKET_LOAD:'バケツに生コンを汲みました。',FREE_SUPPLY:'原料を積みました。ドラムで練りましょう。',FREE_MIX_START:'ドラムで生コンを練っています。'})[type]??'作業ができました。';if(type==='FREE_PAINT'&&a.color===PAINT_REMOVE_COLOR)note='もとの色に戻ったよ！ ぬり直しても、そのままでも遊べるよ。';if(type==='FREE_BOARD'){mode='vehicle';if(nativeEntry)nativeVehicle=extra.vehicle;}if(type==='FREE_CURE_TICK'&&free().stage==='cured')note='固まりました！ 型枠を外すと完成です。';if(type==='FREE_MIX_TICK'&&!free().mixer.pending)note='生コンができました。注ぐ場所へ運びましょう。';
   if(type==='FREE_UNDO_STEP'){draftMask=free().mask||0x0770;draftHeight=free().height;drawing.clear();groundPreview=false;view.setFoundationPreview(null);if(['FREE_FRAME','FREE_FRAME_RAISED','FREE_UNFRAME','FREE_FINISH','FREE_CURE','FREE_DEMOLD'].includes(undoSource))mode='build';}
   if(FOUNDATION_ACTIONS.has(type)){groundPreview=false;view.setFoundationPreview(null);q('[data-ground-status]').textContent='選んだ場所の地面・穴・障害物を確認できます。';note=type==='FREE_FOUNDATION_BUILD'?'土台ができました。型枠を組めます。':'土台を片付け、板を戻しました。';}
   if(['FREE_HIGH_CONNECT','FREE_HIGH_DISCONNECT','FREE_HIGH_FLOW_FINISH'].includes(type)||type==='FREE_UNDO_STEP'||FOUNDATION_ACTIONS.has(type)||['FREE_CONNECT','FREE_PLACE','FREE_NEXT','FREE_CHANGE_EMPTY_SITE','FREE_DEMOLD','FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(type))onLayoutChange();return true;
  }catch(e){clearFoot();note=e.message;if(service.blocked){if(type==='FREE_UNDO_STEP')pendingUndo=a.operationId;paused=true;onError(e);}return false;}finally{if(HOSE_TRANSFER_ACTIONS.has(type))hoseFeedback.finish({saved,blocked:service.blocked,f:free(),operationId:lastProjectOperation(project())?.operationId});busy=false;driving=false;progressSaving=false;workWatching=false;view.complete(saved,service.blocked);view.sync(project());refresh();if(!paused&&!sheet&&!confirm&&fromDialog)q(`[data-mode="${mode}"]`).focus();}
 }
 function ask(type,extra,text,handTool=null){if(projectHistoryStatus(project()).full&&type!=='CLEAR_PLATFORM'&&type!=='MASK_UNDO'&&!(type==='SAFE_RETURN'&&!extra.vehicle)){note=projectHistoryStatus(project()).message;refresh();return;}clearFoot();sheet=null;confirm={type,extra,handTool};q('[data-confirm] p').textContent=text;const copy=handTool==='stencil'?{title:'型紙で塗る前に確認',label:'型紙で塗る',tone:'primary'}:freeConfirmation(type);writeText('[data-confirm-title]',copy.title);button('confirm').textContent=copy.label;button('confirm').dataset.tone=copy.tone;q('[data-confirm]').setAttribute('aria-label',copy.title);refresh();button('confirm').focus();}
 function syncDoorEnvironment(){view.sync(project());const key=String(project().revision)+':'+JSON.stringify(service.constructionWorkPlatform);if(key!==doorEnvironmentKey){view.restoreWorkPlatform(service.constructionWorkPlatform);doorEnvironmentKey=key;}}
 function canStartDoor(){return !active&&!busy&&!service.busy&&canEnter()&&state.map==='construction'&&!state.ufoBoarded&&!state.jumpY&&!state.falling&&!service.blocked&&!document.hidden;}
 function doorTarget(name){if(entering||!canStartDoor()||!free()?.location||free().aboard)return null;try{syncDoorEnvironment();return view.nativeDoor(name);}catch{return null;}}
 function hostPose(){return{x:state.position.x,y:state.groundY,z:state.position.z,heading:state.heading};}
 function copyFootToHost(){const p=view.worldFootPose;if(!p)return;state.position.set(p.x,0,p.z);state.groundY=p.y;state.heading=state.viewHeading=p.heading;state.jumpY=state.jumpVelocity=0;state.falling=false;state.supportSurfaceId=null;state.moving=state.fastWalking=false;}
 function openView(arrival=null){upperPump.pause();
  confirm=null;sheet=paused?'menu':null;deckFolded=!!arrival;progress.reset();paintMasks.reset();maskUndos.length=0;undoCursor.newWork();undoProject=null;pendingUndo=null;removal.clear();removalKey='';mode=arrival?'move':free().aboard?'vehicle':free().stage==='complete'?'paint':'build';groundPreview=false;view.setFoundationPreview(null);q('[data-ground-status]').textContent='選んだ場所の地面・穴・障害物を確認できます。';draftMask=project().foundation?.mask||free().mask||0x0770;draftHeight=free().height;q('[data-foundation-height]').value='auto';view.sync(project());
  // Restore the real obstacle layout before accepting a native arrival. Never
  // relocate an arrived pedestrian to the old workshop spawn as a fallback.
  const platformIssue=view.restoreWorkPlatform(service.constructionWorkPlatform);view.enter(arrival);nativeEntry=!!arrival;nativeVehicle=arrival?.name??null;
  note=arrival?'ドアに着いたよ！ 乗るボタンで乗りこもう。':platformIssue||(view.hasWorkPlatform?'保存した作業台と階段を再開しました。':'');active=true;ownInput(true);refresh();
 }
 async function enter(){if(active||entering||!canEnter()||state.map!=='construction'||state.ufoBoarded||state.jumpY||state.falling||service.blocked)return false;entering=true;const started=interruption;refresh();try{
  if(!free()?.location){const pos=position();if(!pos){note='建物を避けてつくれる場所が見つからないよ。';open.textContent=note;return false;}if(!await run('FREE_PLACE',pos,false))return false;}
  if(blockedAt(free().location.x,free().location.z,150)){open.textContent='つくる場所がほかの作品と重なっているよ。';return false;}
  await service.saveWorld(snapshot());paused=started!==interruption||document.hidden;openView();return true;
  }finally{entering=false;refresh();}
 }
 async function enterAtDoor(name){if(!doorTarget(name))return false;entering=true;clearInput();refresh();try{
  return await commitConcreteDoorEntry(name,{allowed:canStartDoor,read:()=>({revision:project().revision,token:interruption,pose:hostPose()}),validate:pose=>view.nativeArrival(name,pose),save:()=>service.saveWorld(snapshot()),activate:pose=>{paused=false;openView({name,pose});}});
 }catch(e){note=e.message;if(service.blocked)onError(e);return false;}finally{entering=false;refresh();}}
 async function useStairs(up,target=null){
  if(view.airborne){note='着地してから階段を使おう。';refresh();return false;}
  if(!active||busy||service.busy||service.blocked||confirm)return false;clearFoot();sheet=null;paused=false;busy=true;workWatching=true;refresh();try{await view.access(up,target);view.verifyFooting();view.complete(true);view.sync(project());note=up?'土台に上がりました。スマホは丸いパッド、PCはWASDで歩けます。降りる時は階段ボタンを使います。':'地上へ戻り、階段と踊り場を片付けました。';return true;}catch(e){view.complete(false);view.sync(project());note=e.message;return false;}finally{busy=false;workWatching=false;refresh();}
 }
 async function savePlatform({automatic=false}={}){
  if(busy||service.busy||service.blocked)return false;if(view.airborne){note='着地してからセーブしよう。';refresh();return false;}if(!automatic)clearFoot();busy=true;refresh();
  try{if(!free().aboard)copyFootToHost();await service.saveConstructionWorkPlatform(view.exportWorkPlatform(),project().revision,snapshot());note='保存しました。';return true;}
  catch(e){note=e.message;if(service.blocked){paused=true;sheet='menu';onError(e);}return false;}
  finally{busy=false;refresh();}
 }
 async function clearDoorStep(){
  if(!nativeEntry||!nativeVehicle)return true;
  const goal=view.nativeDoor(nativeVehicle),from=view.worldFootPose;
  // After dismounting, walk the remaining few units away from the step before
  // the world's larger walking collider takes ownership. Never snap outwards.
  if(!goal||!from||Math.hypot(goal.x-from.x,goal.z-from.z)>24)return true;
  const local={x:goal.x-free().location.x,z:goal.z-free().location.z};busy=true;const started=interruption;let last=performance.now();note='ドアの足掛けから離れているよ。';refresh();
  try{for(let i=0;i<150;i++){if(started!==interruption||document.hidden||service.blocked)throw Error('移動を止めたよ。もう一度ためしてね。');const p=view.worldFootPose;if(Math.hypot(goal.x-p.x,goal.z-p.z)<.08)return true;await new Promise(requestAnimationFrame);const now=performance.now(),dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;if(!view.walkDoorStep(local,dt))throw Error('足掛けの横の通り道を空けてね。');}throw Error('通り道をたしかめてから、もう一度ためしてね。');}
  catch(e){note=e.message;return false;}finally{view.stopWalking();busy=false;refresh();}
 }
 async function leave({then=null}={}){if(view.airborne){note='着地してから現場へ戻ろう。';refresh();return false;}clearFoot();if(!active){then?.();return true;}if(busy||service.busy||service.blocked){note='作業停止または保存の再確認をしてください。';refresh();return false;}if(nativeEntry&&free().aboard){note='車を降りてから、現場へ戻ろう。';refresh();return false;}if(view.onAccess&&!await useStairs(false))return false;if(!await clearDoorStep())return false;if(!await savePlatform())return false;view.setFoundationPreview(null);groundPreview=false;view.exit();doorEnvironmentKey=null;nativeEntry=false;paintMasks.reset();maskUndos.length=0;undoCursor.newWork();undoProject=null;pendingUndo=null;removal.clear();removalKey='';active=false;confirm=null;sheet=null;progress.reset();ownInput(false);onLayoutChange();onExit();then?.();return true;}
 async function prepareSurfaceWork(extra){if(view.hasWorkPlatform&&view.onAccess&&!await useStairs(false))return false;if(!view.hasWorkPlatform&&foundationPaintUsesLanding(project(),extra)){if(view.onAccess&&paintNeedsGroundAccess(project(),extra,view.accessRecord.plan)&&!await useStairs(false))return false;if(!view.onAccess&&!await useStairs(true,extra))return false;}if(view.onAccess&&paintNeedsGroundAccess(project(),extra,view.accessRecord.plan)&&!await useStairs(false))return false;return true;}
 function currentMaskUndo(){if(undoingMask)return maskUndos.at(-1)??null;while(maskUndos.length){const u=maskUndos.at(-1);try{assertMaskingPlan(free(),u.plan);if(paintMasks.applied(free(),u)!==u.applied)throw Error();return u;}catch{maskUndos.pop();}}return null;}
 async function workMask(toMask=paintMasks.get(free(),paintTarget()),target=paintTarget(),remember=true){
  if(!ready())return false;const started=interruption;let success=false;
  try{let plan=maskingPlan(free(),target,paintMasks.applied(free(),target),toMask);if(!plan.pixels.length){setSheet(null);return true;}if(!await prepareSurfaceWork(target)||started!==interruption||!ready())return false;const revision=project().revision;assertMaskingPlan(free(),plan);clearFoot();sheet=null;busy=true;workWatching=true;note=toMask?'テープを貼っています。':'テープをはがしています。';refresh();await view.performMasking(plan);if(started!==interruption||paused||document.hidden||project().revision!==revision)throw Error('テープの作業を止めたよ。前の状態のままだよ。');assertMaskingPlan(free(),plan);view.verifyFooting();paintMasks.accept(free(),target,toMask);if(remember){maskUndos.push({...target,id:crypto.randomUUID(),fromMask:toMask,toMask:plan.fromMask,applied:toMask,revision,plan:maskingPlan(free(),target,toMask,plan.fromMask)});if(maskUndos.length>10)maskUndos.shift();undoCursor.newWork();}success=true;note=toMask?'テープを貼ったよ！ 守った場所はぬらないよ。':'テープをはがしたよ！ ぬった色はそのままだよ。';return true;}
  catch(e){note=e.message;return false;}finally{view.complete(success);view.sync(project());busy=false;workWatching=false;refresh();}
 }
 function paintTarget(){return{work:Number(q('[data-work]').value),cell:Number(q('[data-paint-cell]').value),face:q('[data-face]').value};}
 function paintAction(tool,pixels,color=q('[data-color]').value){const target=paintTarget();return{...target,color,tool,pixels:paintMasks.appliedPixels(free(),target,pixels)};}
 async function paintRequest(tool,pixels,handTool=null){if(!ready()||!pixels.length)return;try{if(paintMasks.get(free(),paintTarget())!==paintMasks.applied(free(),paintTarget()))throw Error('先にテープを貼るか、下描きを消してね。');if(handTool==='stencil'&&!service.constructionProjectPreview)assertStarterTool(service.constructionToolkit,{type:'STENCIL_PAINT'});const a=paintAction(tool,pixels);if(!a.pixels.length){note='選んだ場所はテープで守られています。塗らない場所を選び直してね。';refresh();return;}const result=freePaintCost(free().completed[a.work],a.cell,a.face,a.pixels,a.color);if(!result.changed.length){note='選んだ部分は同じ色です。';refresh();return;}await run('FREE_PAINT',a,true,null,handTool);}catch(e){note=e.message;refresh();}}
 function useDesignDraft(plan){draftMask=plan.mask;draftHeight=plan.height;q('[data-height]').value=String(draftHeight);groundPreview=false;view.setFoundationPreview(null);mode='build';buildPage='shape';sheet='build';note='同じ形の下描きができたよ。現場を見て、型枠を組もう！';refresh();}
 function chooseBookDesign(index){if(!ready())return;const issue=designReuseProblem(free(),project().foundation);if(issue){note=issue;refresh();return;}try{const plan=designFromWork(free().completed[index]);if(free().stage==='complete'){if(button('next').disabled)throw Error(button('next').title||'次の場所へ移れる状態にしてから、えらぼう。');const pos=position('FREE_NEXT');if(!pos)throw Error('同じ形をつくれる空き場所が見つからないよ。');ask('FREE_NEXT',pos,'作品 '+(index+1)+' を残し、新しい空き場所で同じ形をつくるよ。型枠の板 '+plan.boards+'枚、生コン '+plan.cups+'杯が必要だよ。まずは下描きだけを用意するよ。');if(confirm?.type==='FREE_NEXT')confirm.designReuse={mask:plan.mask,height:plan.height};}else useDesignDraft(plan);}catch(e){note=e.message;refresh();}}
 function refreshDesignBook(can){const entries=designBookEntries(free().completed),issue=designReuseProblem(free(),project().foundation),root=q('[data-design-book]'),key=JSON.stringify(entries);if(key!==bookKey){bookKey=key;root.replaceChildren();for(const entry of entries){const b=document.createElement('button');b.type='button';b.className='pop-shape-preset';b.dataset.bookWork=String(entry.index);b.innerHTML=(entry.plan?shapePicture(entry.plan.mask):'')+'<strong>作品 '+(entry.index+1)+'</strong><small></small><small></small>';const copies=b.querySelectorAll('small');copies[0].textContent=entry.plan?DESIGN_HEIGHT_NAMES[entry.plan.height]+'・'+entry.plan.cells+'マス':entry.issue;copies[1].textContent=entry.plan?'型枠 '+entry.plan.boards+'枚・生コン '+entry.plan.cups+'杯':'';b.onclick=()=>chooseBookDesign(entry.index);root.append(b);}}for(const b of root.children){const entry=entries[Number(b.dataset.bookWork)];b.disabled=!can||!!issue||!entry.plan;b.title=entry.issue||issue;}writeText('[data-design-book-status]',!entries.length?'作品ができたら、このノートから同じ形をつくれるよ。':issue||'作品をえらんだら、下描きと必要な材料を見よう。');}
 function inspectDraft(){const value=q('[data-foundation-height]').value,requested=value==='auto'?null:Number(value),result=inspectFormGround(free(),draftMask,draftHeight,placementHeightAt,blockedAt,requested);groundPreview=true;view.setFoundationPreview(result);q('[data-ground-status]').textContent=result.issue+(result.deckY>0?` 水平な土台の予定位置を青い線で表示します。土台の板 ${foundationBoardCount(foundationActionFromPlan(result))}枚／利用できる板 ${foundationAvailableBoards(project(),service.constructionPackTrialStock)}枚。`:'');note=result.issue;return result;}
 function refresh(){
  const f=free();open.disabled=!canEnter()||active||entering||state.ufoBoarded||service.blocked;open.hidden=state.map!=='construction';if(!active||!f)return;
  const can=ready(),p=project();if(pendingUndo&&!service.blocked&&lastProjectOperation(p)?.operationId===pendingUndo){undoCursor.consume(pendingUndo);pendingUndo=null;}panel.dataset.stage=f.stage;
  if(sheet==='menu'){const toolkit=service.constructionToolkit;writeText('[data-toolkit-summary]',toolkit?.received?'道具は何度でも使えるよ！':'建材受取所で、最初の道具をもらおう。');renderToolInventory(q('[data-toolkit-detail]'),toolkit);}
  const foundation=p.foundation;
  if(f.mask&&!(f.mask&(1<<cell))){cell=Array.from({length:16},(_,i)=>i).find(i=>f.mask&(1<<i));view.select(cell);}
  for(const b of panel.querySelectorAll('button,select'))b.disabled=!can;
  button('help').disabled=false;
  button('foundation').hidden=!!foundation;button('unfoundation').hidden=!foundation;button('foundation').disabled=!can||!(p.schemaVersion>=11?['design','complete']:['design']).includes(f.stage)||!!f.aboard;button('unfoundation').disabled=!can||!['design','complete'].includes(f.stage)||!!f.aboard;
  q('[data-foundation-height]').disabled=!can||!!foundation||!(['design','complete'].includes(f.stage));q('[data-ui=ground]').disabled=!can||!!foundation;if(foundation){q('[data-ground-status]').textContent=`仮設土台を設置済み。型枠の板 ${foundationBoardCount(foundation)}枚を使用中。回収すると板が戻ります。`;for(const b of q('[data-shape]').children)b.disabled=true;q('[data-height]').disabled=!can||f.stage!=='design'||foundation.deckY>RAISED_BASE_MAX;}
  q('[data-height]').value=String(draftHeight);
  q('[data-height] option[value="8"]').disabled=false;button('frame').textContent=foundation?'足場で型枠を組む':'型枠を組む';button('evacuate').disabled=busy||service.busy||service.blocked||!!confirm;for(const id of ['pause','leave','save'])button(id).disabled=busy||service.busy||service.blocked||!!confirm;
  button('stop').disabled=!view.busy;button('retry').disabled=!service.blocked||busy;button('retry').hidden=!service.blocked;button('pause').textContent=paused?'再開する':'一時停止';
  button('pause').disabled=menuBlocked()||service.blocked;
  q('[data-ui=clear-platform]').hidden=!view.hasWorkPlatform;q('[data-ui=clear-platform]').disabled=!can||view.onAccess;
  q('[data-confirm]').hidden=!confirm;button('confirm').disabled=button('dismiss').disabled=busy;
  const notice=projectHistoryStatus(p).full?projectHistoryStatus(p).message:paused?'一時停止中です。メニューの「再開する」で続けられます。':view.phase||note||'';writeText('[data-note]',notice);q('[data-note]').hidden=!notice;q('[data-history-status]').textContent=projectHistoryStatus(p).remaining<=32?projectHistoryStatus(p).message:'';
  const guide=freeStageGuide(f),dismountProblem=f.aboard?view.vehicleProblem({type:'FREE_LEAVE'}):'';
  writeText('[data-status]',paused?'一時停止中':guide.status+(f.stage==='curing'?'・あと'+Math.max(0,Math.ceil((30000-f.elapsedMs)/1000))+'秒':''));
  writeText('[data-material-status]','生コン：車 '+f.wet/4+'杯'+(f.bucket?'・バケツ '+f.bucket/4+'杯':'')+(f.hose?'・ホース '+f.hose/4+'杯':''));
  writeText('[data-actor-status]',f.aboard==='truck'?'ミキサー車':f.aboard==='pump'?'ポンプ車':'徒歩');
  writeText('[data-stock-detail]','生コン：車 '+f.wet/4+'杯／バケツ '+f.bucket/4+'杯／ホース '+f.hose/4+'杯'+(foundation?'。土台に板'+foundationBoardCount(foundation)+'枚を使用中。':''));
  for(const item of q('[data-build-progress]').children){const n=Number(item.dataset.step);item.dataset.done=String(n<guide.step||f.stage==='complete');if(n===guide.step&&f.stage!=='complete')item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');}
  q('[data-design]').hidden=f.stage!=='design'&&!(p.schemaVersion>=11&&f.stage==='complete');q('[data-placing]').hidden=['design','complete'].includes(f.stage);
  for(const b of q('[data-shape]').children)b.setAttribute('aria-pressed',String(!!(draftMask&(1<<Number(b.dataset.cell)))));
  for(const b of q('[data-cells]').children){const i=Number(b.dataset.cell);b.disabled=!can||!(f.mask&(1<<i));b.textContent=(f.mask&(1<<i))?`${f.fill[i]/4}/${f.height/2}`:'—';b.setAttribute('aria-pressed',String(i===cell));}
  button('pour').disabled=!can||!!castingProblem(f,f.aboard??'bucket',cell);button('pour').title=castingProblem(f,f.aboard??'bucket',cell);
  button('finish').disabled=!can||f.stage!=='wet'||!!f.aboard;button('finish').title=f.aboard?'車を降りてからコテを使ってください。':'';button('cure').disabled=!can||f.stage!=='finished';button('demold').disabled=!can||f.stage!=='cured'||!!f.aboard;button('demold').title=f.aboard?'車を降りてから板を回収してください。':'';
  q('[data-door-routes]').hidden=!!f.aboard||view.onAccess||!['move','vehicle'].includes(mode);for(const id of ['walk-truck','walk-pump','choose-car'])button(id).disabled=!can||!!f.aboard||view.onAccess;const walkingDoor=doorWalk?.name;q('[data-door-run]').hidden=!(doorWalk||doorSearch);writeText('[data-door-run-label]',doorSearch?'道をたしかめているよ':walkingDoor?(walkingDoor==='truck'?'ミキサー車':'ポンプ車')+'へ走っているよ':'');
  const boardingIssues=[];for(const name of ['truck','pump']){const {near,problem}=view.boardStatus(name);button(name).hidden=!!f.aboard||!near;button(name).disabled=!can||!!problem;button(name).title=problem;button(name).textContent=name==='truck'?'ミキサー車に乗る':'ポンプ車に乗る';if(near&&problem)boardingIssues.push(problem);}
  writeText('[data-boarding-help]',dismountProblem||boardingIssues[0]||'');q('[data-boarding-help]').hidden=!(dismountProblem||boardingIssues.length)||view.onAccess;
  button('dismount').hidden=!f.aboard;button('dismount').disabled=!can||!f.aboard||!!dismountProblem;button('dismount').title=dismountProblem;doorActions.hidden=!!f.aboard?false:button('truck').hidden&&button('pump').hidden;
  movePad.sync();
  q('[data-dash-label]').textContent=f.aboard?'加速':'ダッシュ';q('[data-hold-dash]').setAttribute('aria-label',f.aboard?'加速（押している間）':'ダッシュ（押している間）');
  q('[data-travel-label]').textContent=f.aboard?(travelBoost.fast?'高速走行':'走行'):(travelBoost.fast?'走る':'徒歩');
  button('legs').textContent=f.pump.legs?'支持脚を収納する':'支持脚を展開する';button('legs').disabled=!can||f.aboard!=='pump';
  button('access').textContent=view.onAccess?'階段で地上に下りる':'階段で土台に上がる';button('access').disabled=!can||!!f.aboard||!!view.accessProblem;button('access').title=view.accessProblem;
  if(view.onAccess){for(const id of ['truck','pump','dismount'])button(id).hidden=true;doorActions.hidden=true;}
  button('connect').textContent=f.connected?'ホースの接続を外す':'ミキサー車とホースをつなぐ';
  button('mix').disabled=!can||f.aboard!=='truck'||!!f.mixer.pending;button('load').disabled=!can||!!f.aboard||f.bucket>0||f.wet<4;button('return').disabled=!can||!f.bucket;
  button('next').textContent=f.stage==='design'?'つくる場所を変える':'次の場所でつくる';button('next').disabled=!can||(f.stage!=='complete'&&!!emptySiteProblem(p));button('recover').disabled=!can||!['wet','finished'].includes(f.stage);
  const amount=Number(q('[data-amount]').value);button('supply').disabled=!can||availableMixCells(p.mixer)<amount;
  const nextKey=JSON.stringify(f.completed.map(w=>[w.fill,freeWorkMask(w)]));if(nextKey!==paintKey){paintKey=nextKey;const value=q('[data-work]').value;q('[data-work]').replaceChildren(...f.completed.map((w,i)=>new Option(`作品 ${i+1}`,String(i))));q('[data-work]').value=value!==''&&f.completed[Number(value)]?value:(f.completed.length?'0':'');}
  const w=f.completed[Number(q('[data-work]').value)];for(const o of q('[data-paint-cell]').options)o.disabled=!freePlacedFill(w,Number(o.value));if(w&&!freePlacedFill(w,Number(q('[data-paint-cell]').value)))q('[data-paint-cell]').value=String(w.fill.findIndex((_,i)=>freePlacedFill(w,i)));
  const draftTape=paintMasks.get(f,paintTarget()),mask=paintMasks.applied(f,paintTarget()),pendingTape=draftTape!==mask;
  for(const b of q('[data-brush]').children){const protectedPixel=!!(mask&(1<<Number(b.dataset.cell)));b.disabled=!can||!freeWorkMask(w)||!!f.aboard||protectedPixel||pendingTape;b.dataset.masked=String(protectedPixel);b.title=protectedPixel?'テープで守られています。':'';}
  refreshMask(can,w,draftTape,mask);if(sheet==='paint')refreshDrawing(can&&!pendingTape,w,mask);refreshRemoval(can&&!pendingTape,w,mask,pendingTape);
  for(const b of panel.querySelectorAll('[data-paint-color]')){b.setAttribute('aria-pressed',String(b.dataset.paintColor===q('[data-color]').value));b.disabled=!can;}
  if(sheet==='paint'){refreshStencil(can&&!pendingTape,w);refreshStencilPosition(can&&!pendingTape,w);}q('[data-ui=stencil-paint]').disabled=!can||!freeWorkMask(w)||!!f.aboard||!paintAction('brush',placedPixels()).pixels.length;
  q('[data-paint-cost]').textContent=`ペンキ残量 ${(service.constructionPackTrialStock.quantities.paintSurfaceCredits??0)-p.paintUsed}面分`;
  button('roller').disabled=!can||!freeWorkMask(w)||!!f.aboard||mask===65535||pendingTape;button('tape').textContent=mask?'テープを貼りかえる':'テープを貼る';button('tape').hidden=mode!=='paint'||!pendingTape;button('tape').disabled=!can||!freeWorkMask(w)||!!f.aboard;button('untape').hidden=mode!=='paint'||!mask;button('untape').disabled=!can||!mask||!!f.aboard;button('roller').title='工具が届く面へ、安全な通路・足場を使って塗ります。';const undoTarget=workUndoTarget();button('step-undo').disabled=!can||!undoTarget;writeText('[data-step-target]',undoTarget?'さっき：'+undoTarget.label+' ・あと'+undoTarget.count+'回戻せるよ':undoCursor.remaining?'まだ戻す作業はないよ':'10回戻ったよ。新しく作業すると、また戻せるよ');button('undo').disabled=!can||undoTarget?.sourceType!=='FREE_PAINT';button('undo').textContent='1つ前の塗装を戻す';
  button('connect').disabled=!can||(!f.connected&&(!f.pump.legs||Math.hypot(f.truck.x-f.pump.x,f.truck.z-f.pump.z)>110))||!!f.hose;
  button('prime').disabled=!can||!f.connected||!f.pump.legs||!!f.hose||!f.wet;button('drain').disabled=!can||!f.hose;
  const raisedUnavailable=foundation&&foundation.deckY>RAISED_BASE_MAX;
  button('frame').disabled=!can||!!f.aboard||!!raisedUnavailable||!draftMask||freeFrameBoards(foundation?.mask??draftMask)+(foundation?foundationBoardCount(foundation):0)>(service.constructionPackTrialStock.quantities.auxiliaryUnits.formwork??0)-(p.site.formworkPanelsInUse??0);button('unframe').disabled=!can||!!f.aboard||!!f.connected||!!f.hose;button('frame').title=f.aboard?'車を降りてから型枠を組んでください。':raisedUnavailable?'高所施工は土台の高さ16までです。':'';
  q('[data-design]>p').textContent=foundation?`仮設土台の上面の高さ ${foundation.deckY}。使用中の板 ${foundationBoardCount(foundation)}枚／残り ${foundationAvailableBoards(p,service.constructionPackTrialStock)-foundationBoardCount(foundation)}枚。`:`4×4マスで形を選びます。必要な型枠 ${freeFrameBoards(draftMask)}枚／所持 ${service.constructionPackTrialStock.quantities.auxiliaryUnits.formwork??0}枚。空けたマスには流れません。`;
  q('[data-build-help]').textContent=!foundation&&f.stage==='complete'?'同じ高さの土台を設置し、メニューの「作品を移動・保管」で位置を合わせると、保管作品を復元できます。':foundation&&f.stage==='complete'?'メニューの「作品を移動・保管」で土台上の作品を移動・回転できます。土台の回収前には作品を保管してください。':foundation?'「つくる」モードから、この土台の上に施工できます。片付ける場合は「仮設土台を回収する」を押し、内容を確認して実行してください。':'形を選んだら現場へ戻り、手もとの道具でつくりましょう。';
  button('mix').textContent=f.mixer.pending?`練っています・あと${Math.ceil((5000-f.mixer.pending.elapsedMs)/1000)}秒`:'生コンを練る（5秒）';
  button('supply').disabled=!can||availableMixCells(p.mixer)<amount||freeTruckLoad(f)+amount>8;
  if(groundPreview&&f.stage!=='design'){groundPreview=false;view.setFoundationPreview(null);}q('[data-ui=ground]').hidden=f.stage!=='design';if(!busy)view.setDraft(f.stage==='design'?{mask:draftMask,height:draftHeight}:null);
  workEditor.refresh(can&&!view.onAccess,sheet==='works'||['FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(confirm?.type));
  button('load').title=f.aboard?'車を降りるとバケツに汲めます。':f.bucket>0?'バケツに生コンが入っています。先に注ぐか、車へ戻してください。':f.wet<4?'まずミキサー車で生コンを1杯以上用意してください。':'';
  button('mix').disabled=!can||f.aboard!=='truck'||!!f.mixer.pending||availableMixCells(f.mixer)<amount;button('mix').title=f.aboard!=='truck'?'ミキサー車に乗って操作します。':f.mixer.pending?'練り終わるまでお待ちください。':availableMixCells(f.mixer)<amount?'先に原料を積むか、練る量を少なくしてください。':'';button('supply').title=freeTruckLoad(f)+amount>8?'車がいっぱいです。先に生コンを使うか、練る量を少なくしてください。':availableMixCells(p.mixer)<amount?'工房の原料が足りません。材料を補充してください。':'';button('connect').title=f.hose?'先にホースの残りを回収してください。':!f.connected&&!f.pump.legs?'先に支持脚を展開してください。':!f.connected&&Math.hypot(f.truck.x-f.pump.x,f.truck.z-f.pump.z)>110?'ミキサー車をホースが届く場所へ停めてください。':'';
  button('legs').title=f.aboard!=='pump'?'ポンプ車に乗って操作します。':'';
  // Explain the same terrain/contact guard before asking the player to press.
  // Only inspect the visible work action while idle; movement still has its own
  // full preflight and commit checks, including any change of the ground.
  if(can&&mode==='vehicle'&&f.aboard){const id=f.aboard==='pump'?'legs':'mix',a=id==='legs'?{type:'FREE_LEGS',deployed:!f.pump.legs}:{type:'FREE_MIX_START'};if(!button(id).disabled){const issue=view.vehicleProblem(a);if(issue){button(id).disabled=true;button(id).title=issue;}}}
  button('roller').title=mask===65535?'全部テープで守られています。塗らない場所を選び直してね。':!freeWorkMask(w)?'完成した作品を選ぶと塗れます。':f.aboard?'車を降りてからローラーを使ってください。':'';
  if(button('frame').disabled&&can&&!button('frame').title)button('frame').title=!draftMask?'「かたち」で、つくりたい板をタッチしてね。':'型枠の板が足りません。建材受取所で板を受け取ってください。';
  button('next').title=button('next').disabled&&can?'型枠・土台・作業台を片付けてから場所を変えられます。':'';
  refreshQuickTools(f,can);refreshChrome(f);
  if(projectHistoryStatus(p).full){for(const b of panel.querySelectorAll('[data-free]'))if(!historyActionAllowed(b.dataset.free,confirm))b.disabled=true;for(const b of q('[data-brush]').children)b.disabled=true;workEditor.refresh(false,sheet==='works');}
  button('export').disabled=busy||service.busy||service.blocked;refreshTaskGuide(f);colorStudios?.refresh();refreshPopMenus();upperPump.refresh();q('.free-primary-actions').hidden=upperPump.visible;if(upperPump.visible)q('[data-task-card]').hidden=true;
 }
 function refreshQuickTools(f,can){
  const building=mode==='build',painting=mode==='paint',design=building&&f.stage==='design',target=building&&['framed','wet'].includes(f.stage)||painting;
  q('[data-quick-design]').hidden=!design;q('[data-quick-target]').hidden=!target;q('[data-quick-paint]').hidden=!painting;q('[data-quick-vehicle]').hidden=mode!=='vehicle'||f.aboard!=='truck';
  q('[data-quick-height]').value=String(draftHeight);q('[data-quick-height]').disabled=!can||!!project().foundation&&project().foundation.deckY>RAISED_BASE_MAX;
  const shapes=[32,1632,240,1568];q('[data-quick-shape]').value=shapes.includes(draftMask)?String(draftMask):'custom';q('[data-quick-shape]').disabled=!can||!!project().foundation;
  q('[data-quick-color]').value=q('[data-color]').value;q('[data-quick-face]').value=q('[data-face]').value;q('[data-quick-amount]').value=q('[data-amount]').value;
  const w=f.completed[Number(q('[data-work]').value)],pc=Number(q('[data-paint-cell]').value),count=painting?f.completed.reduce((n,v)=>n+v.fill.filter((_,i)=>!!freePlacedFill(v,i)).length,0):Array.from({length:16},(_,i)=>!!(f.mask&(1<<i))).filter(Boolean).length;
  for(const selector of ['[data-quick-prev]','[data-quick-next]'])q(selector).disabled=!can||count<2;
  writeText('[data-quick-target-label]',painting?(w?'作品 '+(Number(q('[data-work]').value)+1)+'・マス '+(pc+1):'完成作品はまだありません'):'マス '+(cell+1)+'・'+f.fill[cell]/4+'/'+f.height/2+'杯');
  let cost='';if(design)cost='型枠の板 '+freeFrameBoards(project().foundation?.mask??draftMask)+'枚（外すと戻ります）';
  if(painting&&w){try{const a=paintAction('roller',Array.from({length:16},(_,i)=>i)),c=freePaintCost(w,pc,a.face,a.pixels,a.color),pattern=freePaintCost(w,pc,a.face,paintMasks.appliedPixels(f,paintTarget(),placedPixels()),a.color);cost='ペンキ：ローラー '+c.cost+'面／型紙 '+pattern.cost+'面（残り '+((service.constructionPackTrialStock.quantities.paintSurfaceCredits??0)-project().paintUsed)+'面）';}catch(e){cost=e.message;}}
  if(painting){const protectedCount=16-unmaskedPaintPixels(Array.from({length:16},(_,i)=>i),paintMasks.applied(f,paintTarget())).length;if(protectedCount)cost+='・テープ '+protectedCount+'マス';}
  refreshPaintDeck(panel,{tool:paintTool,visible:painting,enabled:can,color:q('[data-color]').value,pattern:q('[data-stencil]').value,turn:Number(q('[data-stencil-turn]').value),offset:stencilPlacement.offset,target:painting&&w?'ぬるところ：作品 '+(Number(q('[data-work]').value)+1)+'・マス '+(pc+1)+'・'+q('[data-face]').selectedOptions[0].textContent:'完成した作品をえらぼう'});view.setWorkTarget({mode:paused?null:mode,mask:draftMask,height:draftHeight,cell,paint:paintTarget(),pixels:painting?paintMasks.appliedPixels(f,paintTarget(),paintTool==='stencil'?placedPixels():paintTool==='brush'&&drawing.pixels.length?drawing.pixels:Array.from({length:16},(_,i)=>i)):[]});q('[data-ui=show-target]').hidden=!view.hasTarget;q('[data-ui=show-target]').disabled=busy; q('[data-ui=quick-drawing]').hidden=!painting||paintTool!=='brush';q('[data-ui=quick-drawing]').disabled=!can||!freeWorkMask(w)||!!f.aboard;writeText('[data-quick-cost]',cost);q('[data-quick-cost]').hidden=!cost;
  q('[data-paint-position]').disabled=!can||!freeWorkMask(w)||!!f.aboard;writeText('[data-paint-position]',stencilPlacementLabel(stencilPlacement.offset)==='中央'?'型紙を動かす':'型紙：'+stencilPlacementLabel(stencilPlacement.offset));
  const stencil=q('[data-ui=quick-stencil]');const maskButton=q('[data-ui=quick-mask]');maskButton.hidden=!painting;maskButton.disabled=!can||!freeWorkMask(w)||!!f.aboard;
  stencil.hidden=!painting||paintTool!=='stencil';stencil.disabled=!can||projectHistoryStatus(project()).full||!freeWorkMask(w)||!!f.aboard||!paintAction('brush',placedPixels()).pixels.length;stencil.textContent='型紙で塗る';stencil.title=placedGuide();
 }

 function stepQuickTarget(delta){if(!ready())return;if(mode==='paint'){const choices=[];free().completed.forEach((w,work)=>w.fill.forEach((_,cell)=>{if(freePlacedFill(w,cell))choices.push({work,cell});}));if(!choices.length)return;const i=choices.findIndex(x=>x.work===Number(q('[data-work]').value)&&x.cell===Number(q('[data-paint-cell]').value)),next=choices[(Math.max(0,i)+delta+choices.length)%choices.length];q('[data-work]').value=String(next.work);q('[data-paint-cell]').value=String(next.cell);}else{const choices=Array.from({length:16},(_,i)=>i).filter(i=>free().mask&(1<<i));if(!choices.length)return;cell=choices[(Math.max(0,choices.indexOf(cell))+delta+choices.length)%choices.length];view.select(cell);}refresh();}
 function refreshRemoval(can,w,mask,pendingTape){
  const target=paintTarget(),values=w?.paint?.[`${target.cell}:${target.face}`]??Array(16).fill(null),key=JSON.stringify([target,w&&[w.x,w.z,w.baseY,w.fill,w.placedMask],values]);
  if(key!==removalKey){removalKey=key;removal.clear();}
  const available=paintRemovalPixels(w,target.cell,target.face,Array.from({length:16},(_,i)=>i),mask),chosen=new Set(paintRemovalPixels(w,target.cell,target.face,[...removal],mask));
  for(const i of [...removal])if(!chosen.has(i))removal.delete(i);
  const usable=can&&!!freeWorkMask(w)&&!free().aboard,blocked=projectHistoryStatus(project()).full;
  for(const b of q('[data-removal-board]').children){const i=Number(b.dataset.removalPixel);b.disabled=!usable||!available.includes(i);b.dataset.protected=String(!!(mask&(1<<i)));b.setAttribute('aria-pressed',String(chosen.has(i)));b.style.setProperty('--removal-color',paintColor(values[i])??'#d4d9d8');}
  writeText('[data-removal-status]',pendingTape?'先にテープを貼るか、下描きを消してね。':!available.length?'落とせる色がないよ。ぬった場所と面を選んでね。':chosen.size?`${chosen.size}マスの色を落とすよ。ペンキは減らないよ。`:'落としたい色をえらぼう！');
  q('[data-ui=removal-run]').disabled=!usable||!chosen.size||blocked;q('[data-ui=removal-all]').disabled=!usable||!available.length;q('[data-ui=removal-clear]').disabled=!can||!removal.size;q('[data-ui=removal-done]').disabled=!can;
  const quick=q('[data-ui=quick-removal]');quick.hidden=mode!=='paint';quick.disabled=!usable||!available.length||blocked;quick.textContent=chosen.size?'選んだ色を落とす':'色を落とす';
 }
 async function removePaint(){if(!ready()||free().aboard)return;try{const target=paintTarget();if(paintMasks.get(free(),target)!==paintMasks.applied(free(),target))throw Error('先にテープを貼るか、下描きを消してね。');const pixels=paintRemovalPixels(free().completed[target.work],target.cell,target.face,[...removal],paintMasks.applied(free(),target));if(!pixels.length)throw Error('落としたい色をえらぼう！');await run('FREE_PAINT',paintAction('brush',pixels,PAINT_REMOVE_COLOR));}catch(e){note=e.message;refresh();}}
 function endStencilPosition(cancel=false){if(!stencilPointer)return;const held=stencilPointer;stencilPointer=null;if(cancel)stencilPlacement.set(held.offset);const board=q('[data-stencil-position-board]');if(board.hasPointerCapture(held.id))board.releasePointerCapture(held.id);}
 function clearBrush(){colorStudios?.cancel();endStencilPosition(true);const id=paintPointer;paintPointer=null;brushLast=null;stroke.clear();const b=q('[data-brush]');if(id!=null&&b.hasPointerCapture(id))b.releasePointerCapture(id);for(const node of b.children)node.setAttribute('aria-pressed','false');endDrawing(true);drawing.clear();}
 function refreshDrawing(can,w,mask){
  const target=paintTarget(),color=q('[data-color]').value,usable=can&&!!freePlacedFill(w,target.cell)&&!free().aboard;
  drawing.target(JSON.stringify([target,color,w&&[w.x,w.z,w.baseY,w.mask,w.fill,w.placedMask,w.paint],mask]));const pixels=drawing.pixels,selected=new Set(pixels),values=w?.paint[`${target.cell}:${target.face}`]??[];
  for(const b of q('[data-drawing-board]').children){const i=Number(b.dataset.drawingPixel),protectedPixel=!!(mask&(1<<i)),paint=selected.has(i)?color:values[i],swatch=paintColor(paint)??'#e3e7e4';b.disabled=!usable||protectedPixel;b.dataset.protected=String(protectedPixel);b.setAttribute('aria-pressed',String(selected.has(i)));if(b.style.getPropertyValue('--drawing-color')!==swatch)b.style.setProperty('--drawing-color',swatch);}
  for(const b of panel.querySelectorAll('[data-drawing-width]')){b.disabled=!usable;b.setAttribute('aria-pressed',String(Number(b.dataset.drawingWidth)===drawingWidth));}
  let message=!usable?'完成した作品を選び、車を降りて描こう。':'なぞって線を描こう。下描きだけならペンキは減らないよ。',cost=0,changed=0;
  if(usable&&pixels.length){try{const result=freePaintCost(w,target.cell,target.face,pixels,color);cost=result.cost;changed=result.changed.length;message=changed?`ぬる場所 ${changed}マス・ペンキ ${cost}面分。`:'もう同じ色だよ。ペンキは減らないよ。';}catch(e){message=e.message;}}
  const stock=(service.constructionPackTrialStock.quantities.paintSurfaceCredits??0)-project().paintUsed;if(cost>stock)message='ペンキが足りないよ。受取所で受け取ろう。';
  q('[data-ui=drawing-clear]').disabled=!usable||!pixels.length;q('[data-ui=drawing-paint]').disabled=!usable||!changed||cost>stock||projectHistoryStatus(project()).full;writeText('[data-drawing-cost]',message);
 }
 function endDrawing(cancel=false){const id=drawingPointer;drawingPointer=null;drawing.finish(cancel);const board=q('[data-drawing-board]');if(id!=null&&board.hasPointerCapture(id))board.releasePointerCapture(id);}
 function selectMode(next){if(busy||confirm||paused||service.blocked||!FREE_PLAY_MODES.includes(next))return;clearFoot();clearBrush();mode=next;moreActions=false;sheet=null;deckFolded=false;refresh();}
 function setSheet(next){if(menuBlocked())return;clearFoot();clearBrush();if(next){restoreFocus=document.activeElement;sheet=next;refresh();q('[data-ui="close"]').focus();}else{sheet=null;refresh();if(restoreFocus?.isConnected&&restoreFocus.offsetWidth)restoreFocus.focus();else q(`[data-mode="${mode}"]`).focus();}}
 function refreshChrome(f){
  panel.dataset.workPeek=String(active&&(!busy||progressSaving)&&!paused&&!service.blocked&&!confirm&&(!sheet||FREE_PLAY_MODES.includes(sheet)));
  panel.dataset.busy=String(busy||view.busy);
  const watching=workWatching&&busy&&!paused&&!sheet&&!confirm&&!service.blocked;panel.dataset.watching=String(watching);const hose=hoseFeedback.display,showHose=!!hose&&!sheet&&!confirm&&(watching||mode==='vehicle');q('[data-work-watch]').hidden=!watching&&!showHose;q('[data-work-description]').hidden=showHose;q('[data-hose-meter]').hidden=!showHose;if(showHose){q('[data-hose-meter]').dataset.status=hose.status;writeText('[data-hose-title]',hose.title);writeText('[data-hose-percent]',hose.percent+'%');q('[data-hose-progress]').value=hose.progress;writeText('[data-hose-amount]',hose.amountText);writeText('[data-hose-stock]',hose.stockText);}writeText('[data-work-phase]',view.phase||(service.busy?'作業を保存しています。':'作業の準備をしています。'));
  const allowed=new Set(freePlayActions(f,mode));if(mode==='paint'){if(paintTool!=='roller')allowed.delete('roller');const target=paintTarget(),applied=paintMasks.applied(f,target);if(paintMasks.get(f,target)!==applied)allowed.add('tape');if(applied)allowed.add('untape');}if(mode==='move'&&project().foundation||mode==='paint'&&view.onAccess)allowed.add('access');for(const b of q('.free-primary-actions').querySelectorAll('[data-free]'))b.hidden=!allowed.has(b.dataset.free);
  for(const b of panel.querySelectorAll('[data-mode]')){b.disabled=busy||!!confirm||paused||service.blocked;b.setAttribute('aria-selected',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode?0:-1;}
  const modal=!!sheet||!!confirm;for(const el of panel.querySelectorAll('[data-hud]'))el.inert=modal;
  refreshDesignBook(ready());q('.free-deck').hidden=deckFolded;q('[data-ui=unfold]').hidden=!deckFolded;q('[data-ui=unfold]').disabled=false;q('[data-ui=fold]').disabled=false;panel.dataset.deckFolded=String(deckFolded);q('[data-quick-tools]').hidden=true;q('[data-pop-quick]').hidden=mode!=='build'||f.stage==='complete'||f.stage==='design'&&!draftMask;writeText('[data-quick-summary]',({build:'形・高さ・注ぐ場所',vehicle:'作業する量',paint:'色・塗る場所'})[mode]??'道具の設定');panel.dataset.playMode=mode;q('#free-mode-controls').setAttribute('aria-labelledby','free-mode-'+mode);
  const settings=q('[data-ui="settings"]');settings.hidden=mode==='move';settings.disabled=busy||paused||service.blocked||!!confirm;settings.textContent=({build:'型枠の道具箱',vehicle:'車の道具箱',paint:'塗る場所・道具'})[mode]??'';
  q('[data-build-progress]').hidden=true;
  const buildHint=({design:project().foundation?'土台の上に型枠を組みます。':'形と高さを選んで、型枠を組もう。',framed:'注ぐマスを選び、生コンを流し込みます。',wet:'好きな高さまで注ぎ、コテでならします。',finished:'形がよければ、生コンを固めましょう。',curing:'固まるまであと'+Math.max(0,Math.ceil((30000-f.elapsedMs)/1000))+'秒。',cured:'型枠を外すと作品の完成です。',complete:'完成！「塗る」で色をつけられます。'})[f.stage];
  writeText('[data-mode-note]',mode==='move'?(view.onAccess?'左パッド／WASDで土台の上を歩けます。':f.aboard?'上／W：アクセル　下／S：バック　左右／A・D：ハンドル。走りながら曲がるよ。':'左パッド／WASDで移動。ダッシュで走る。ジャンプ／Spaceを押し直すと3段まで跳べるよ。'):mode==='build'?buildHint:mode==='vehicle'?(f.aboard==='truck'?'原料を積み、生コンを練ります。':f.aboard==='pump'?'支持脚を出して、ホースで生コンを送ります。':'バケツに汲むか、車に乗って作業します。'):(f.completed.length?'場所と色を選んで、そのまま塗ろう。':'作品が完成すると、色を塗れるようになります。'));
  const blockedAction=[...q('.free-primary-actions').querySelectorAll('[data-free]')].find(b=>!b.hidden&&b.disabled&&b.title);
  const hint=paused?'一時停止中です。メニューから再開できます。':service.blocked?'保存を確認しています。メニューから保存を再確認してください。':!busy&&blockedAction?blockedAction.title:'';
  writeText('[data-pour-reason]',hint);q('[data-pour-reason]').hidden=!hint;
  for(const b of q('.free-primary-actions').querySelectorAll('[data-free]')){if(!b.hidden&&b.disabled&&b.title)b.setAttribute('aria-describedby','free-action-help');else b.removeAttribute('aria-describedby');}
  button('stop').hidden=!view.busy;button('stop').disabled=!view.busy;
  q('[data-ui="menu"]').disabled=menuBlocked();q('[data-ui="menu"]').setAttribute('aria-expanded',String(sheet==='menu'));q('[data-ui="close"]').disabled=menuBlocked();
  button('camera').disabled=busy||!!confirm;button('camera').setAttribute('aria-expanded',String(sheet==='camera'));button('camera').title='視点：'+CONCRETE_CAMERA_MODES[view.cameraMode];for(const b of panel.querySelectorAll('[data-camera-mode]'))b.setAttribute('aria-pressed',String(b.dataset.cameraMode===view.cameraMode));
  q('[data-overlay]').hidden=!sheet||!!confirm;q('.free-toolbox-tabs').hidden=!['build','vehicle','paint'].includes(sheet);for(const b of panel.querySelectorAll('[data-toolbox]')){b.setAttribute('aria-pressed',String(b.dataset.toolbox===sheet));b.disabled=busy;}
  const titles={camera:'どこから見よう？',works:'作品のおひっこし',menu:'ひとやすみ',build:'つくるノート',vehicle:'くるまの道具箱',paint:'おえかきの道具箱'};q('[data-sheet-title]').textContent=titles[sheet]??'';q('[data-play-sheet]').setAttribute('aria-label',titles[sheet]??'施工メニュー');
  for(const el of panel.querySelectorAll('[data-sheet-content]'))el.hidden=el.dataset.sheetContent!==sheet;
  const designing=['design','complete'].includes(f.stage);if(designing&&buildPage==='pour')buildPage='shape';if(!designing&&buildPage!=='pour'&&buildPage!=='book')buildPage='pour';
  for(const el of panel.querySelectorAll('[data-build-pane]'))el.hidden=el.dataset.buildPane!==buildPage;
  for(const b of panel.querySelectorAll('[data-build-tab],[data-build-open]')){const name=b.dataset.buildTab||b.dataset.buildOpen;b.disabled=!ready()||(name==='book'?false:name==='pour'?designing:!designing);b.setAttribute('aria-pressed',String(name===buildPage));}
  for(const b of panel.querySelectorAll('[data-shape-preset]')){b.disabled=!ready()||!!project().foundation;b.setAttribute('aria-pressed',String(Number(b.dataset.shapePreset)===draftMask));}
  q('[data-build-help]').hidden=buildPage==='book';q('[data-ui=build-done]').textContent=buildPage==='book'?'現場へ戻る':buildPage==='pour'?'ここへ注ぐ！ 現場へ':buildPage==='base'?'現場でたしかめる':'この形で現場へ！';
 }
 function dismissConfirmation(){const edit=['FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(confirm?.type);confirm=null;if(edit)setSheet('works');else{refresh();q(`[data-mode="${mode}"]`).focus();}}
 function handleMenuKey(e){
  if(e.key==='Escape'){e.preventDefault();if(busy&&!progressSaving)return true;if(confirm)dismissConfirmation();else setSheet(sheet?null:'menu');return true;}
  if(e.key==='Tab'&&(sheet||confirm)){const modal=q(confirm?'[data-confirm]':'[data-play-sheet]'),items=[...modal.querySelectorAll('button,select,input,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.offsetWidth),i=items.indexOf(document.activeElement);if(items.length&&(i<0||(!e.shiftKey&&i===items.length-1)||(e.shiftKey&&i===0))){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}return true;}
  if(e.target.closest?.('[data-mode]')&&freeModeNavigationKey(e)){e.preventDefault();selectMode(e.key==='Home'?'move':e.key==='End'?'paint':nextFreePlayMode(mode,e.key==='ArrowRight'?1:-1));q(`[data-mode="${mode}"]`).focus();return true;}
  return !!sheet||!!confirm;
 }
 function refreshMask(can,w,mask,applied){
  const count=16-unmaskedPaintPixels(Array.from({length:16},(_,i)=>i),mask).length;
  for(const b of q('[data-paint-mask]').children){const protectedPixel=!!(mask&(1<<Number(b.dataset.pixel)));b.setAttribute('aria-pressed',String(protectedPixel));b.textContent=protectedPixel?'テープ':'塗る';b.disabled=!can||!freeWorkMask(w)||!!free().aboard;}
  writeText('[data-mask-status]',mask!==applied?'下描き '+count+'マス。「テープを貼る」で守ろう！':count?'テープ '+count+'マス。ここは元の色のままだよ。':'テープなし。この面はどこでも塗れるよ。');
  q('[data-ui=clear-mask]').disabled=!can||!(mask||applied);q('[data-ui=clear-mask]').textContent=applied?'この面のテープをはがす':'下描きを消す';q('[data-ui=mask-done]').disabled=!can||!freeWorkMask(w)||!!free().aboard;q('[data-ui=mask-done]').textContent=mask===applied?'現場へ戻る':applied?'テープを貼りかえる':'テープを貼る';
  view.setPaintMaskPreview({...(mode==='paint'&&w?{...paintTarget(),mask:applied,draft:mask}:{}),appliedFaces:paintMasks.appliedSelections(free())});
 }
 q('[data-ui=quick-removal]').onclick=()=>{if(!ready())return;if(removal.size){void removePaint();return;}setSheet('paint');q('[data-removal-controls]').open=true;q('[data-removal-controls] summary').focus();};
 q('[data-ui=removal-run]').onclick=()=>void removePaint();q('[data-ui=removal-clear]').onclick=()=>{if(!ready())return;removal.clear();refresh();};q('[data-ui=removal-all]').onclick=()=>{if(!ready())return;const t=paintTarget();removal.clear();for(const i of paintRemovalPixels(free().completed[t.work],t.cell,t.face,Array.from({length:16},(_,i)=>i),paintMasks.applied(free(),t)))removal.add(i);refresh();};q('[data-ui=removal-done]').onclick=()=>{if(ready())setSheet(null);};
 for(const b of q('[data-removal-board]').children)b.onclick=()=>{if(!ready()||b.disabled)return;const i=Number(b.dataset.removalPixel);if(removal.has(i))removal.delete(i);else removal.add(i);refresh();};
 q('[data-ui=quick-drawing]').onclick=()=>{if(!ready())return;setSheet('paint');q('[data-drawing-controls]').open=true;q('[data-drawing-controls] summary').focus();};
 for(const b of panel.querySelectorAll('[data-paint-pattern]'))b.onclick=()=>{if(!ready())return;q('[data-stencil]').value=b.dataset.paintPattern;refresh();};
 q('[data-paint-position]').onclick=()=>{if(!ready())return;setSheet('paint');q('[data-stencil-position-controls]').open=true;q('[data-stencil-position-controls] summary').focus();};
 q('[data-paint-turn]').onclick=()=>{if(!ready())return;q('[data-stencil-turn]').value=String((Number(q('[data-stencil-turn]').value)+1)%4);refresh();};
 q('[data-ui=quick-mask]').onclick=()=>{setSheet('paint');q('[data-mask-controls]').open=true;q('[data-mask-controls]').scrollIntoView({block:'nearest'});q('[data-mask-controls] summary').focus();};
 q('[data-ui=clear-mask]').onclick=()=>{if(!ready())return;if(paintMasks.applied(free(),paintTarget()))void workMask(0);else{paintMasks.clear(free(),paintTarget());refresh();}};
 q('[data-ui=mask-done]').onclick=()=>{if(paintMasks.get(free(),paintTarget())===paintMasks.applied(free(),paintTarget()))setSheet(null);else void workMask();};
 function refreshStencilPosition(can,w){
  const pixels=placedPixels(),selected=new Set(pixels),target=paintTarget(),mask=paintMasks.applied(free(),target),color=q('[data-color]').value,prior=w?.paint?.[target.cell+':'+target.face]??[];
  const usable=can&&!!freeWorkMask(w)&&!free().aboard;
  for(const b of q('[data-stencil-position-board]').children){const i=Number(b.dataset.stencilPositionPixel);b.disabled=!usable;b.dataset.masked=String(!!(mask&(1<<i)));b.dataset.filled=String(selected.has(i));b.style.setProperty('--stencil-position-color',paintColor(selected.has(i)?color:prior[i])??'#ebe5d9');}
  for(const b of panel.querySelectorAll('[data-stencil-shift]')){const [x,y]=b.dataset.stencilShift.split(',').map(Number),o=stencilPlacement.offset;b.disabled=!usable||!stencilPlacement.canSet({x:o.x+x,y:o.y+y});}
  q('[data-ui=stencil-center]').disabled=!usable;q('[data-ui=stencil-position-turn]').disabled=!usable;q('[data-ui=stencil-position-paint]').disabled=!usable||!paintAction('brush',pixels).pixels.length;q('[data-ui=stencil-position-done]').disabled=!can;
  let message=placedGuide();try{if(w){const a=paintAction('brush',pixels),cost=freePaintCost(w,a.cell,a.face,a.pixels,a.color);message+=' '+(!a.pixels.length?'テープで守られているよ。':cost.changed.length?'ペンキ '+cost.cost+'面分を使うよ。':'同じ色なので、ペンキは使わないよ。');}}catch(e){message=e.message;}writeText('[data-stencil-position-status]',message);
 }
 for(const b of panel.querySelectorAll('[data-stencil-shift]'))b.onclick=()=>{if(!ready())return;placedPixels();const [x,y]=b.dataset.stencilShift.split(',').map(Number),o=stencilPlacement.offset;stencilPlacement.set({x:o.x+x,y:o.y+y});refresh();};
 q('[data-ui=stencil-center]').onclick=()=>{if(ready()){stencilPlacement.reset();refresh();}};q('[data-ui=stencil-position-turn]').onclick=()=>{if(ready()){q('[data-stencil-turn]').value=String((Number(q('[data-stencil-turn]').value)+1)%4);refresh();}};
 q('[data-ui=stencil-position-done]').onclick=()=>{endStencilPosition();setSheet(null);};q('[data-ui=stencil-position-paint]').onclick=()=>{endStencilPosition();void paintRequest('brush',placedPixels(),'stencil');};
 const positionBoard=q('[data-stencil-position-board]');
 function dragStencil(e){if(!stencilPointer||stencilPointer.id!==e.pointerId)return;const r=positionBoard.getBoundingClientRect();const x=stencilPointer.offset.x+Math.round((e.clientX-stencilPointer.x)/(r.width/4)),y=stencilPointer.offset.y+Math.round((e.clientY-stencilPointer.y)/(r.height/4));stencilPlacement.set({x,y});refresh();}
 positionBoard.addEventListener('pointerdown',e=>{if(e.button!==0||stencilPointer||!ready()||free().aboard||!freeWorkMask(free().completed[Number(q('[data-work]').value)]))return;e.preventDefault();placedPixels();stencilPointer={id:e.pointerId,x:e.clientX,y:e.clientY,offset:stencilPlacement.offset};positionBoard.setPointerCapture(e.pointerId);});
 positionBoard.addEventListener('pointermove',e=>{if(stencilPointer?.id===e.pointerId){e.preventDefault();dragStencil(e);}});positionBoard.addEventListener('pointerup',e=>{if(stencilPointer?.id===e.pointerId){dragStencil(e);endStencilPosition();refresh();}});for(const event of ['pointercancel','lostpointercapture'])positionBoard.addEventListener(event,e=>{if(stencilPointer?.id===e.pointerId){endStencilPosition(true);refresh();}});
 function refreshStencil(can,w){try{const id=q('[data-stencil]').value,turn=Number(q('[data-stencil-turn]').value),pixels=placedPixels(),color=q('[data-color]').value;for(const tile of q('[data-stencil-preview]').children){tile.dataset.filled=String(pixels.includes(Number(tile.dataset.stencilPixel)));tile.dataset.color=color;tile.style.background=pixels.includes(Number(tile.dataset.stencilPixel))?paintColor(color):'';}const guide=placedGuide();writeText('[data-stencil-guide]',guide);q('[data-stencil-preview]').setAttribute('aria-label',guide);if(!w){writeText('[data-stencil-cost]','完成した作品を選ぶと塗れます。');return;}const a=paintAction('brush',pixels),cost=freePaintCost(w,a.cell,a.face,a.pixels,a.color);for(const tile of q('[data-stencil-preview]').children)tile.dataset.masked=String(!!(paintMasks.applied(free(),paintTarget())&(1<<Number(tile.dataset.stencilPixel))));writeText('[data-stencil-cost]',!a.pixels.length?'模様を塗る場所がテープで守られています。':cost.changed.length?'ペンキ '+cost.cost+'面分を使います。':'同じ色です。ペンキは使いません。');q('[data-ui=stencil-paint]').title='';}catch(e){writeText('[data-stencil-cost]',e.message);}}
 for(const s of ['[data-stencil]','[data-stencil-turn]'])q(s).onchange=()=>refresh();q('[data-ui=stencil-paint]').onclick=q('[data-ui=quick-stencil]').onclick=()=>{try{paintRequest('brush',placedPixels(),'stencil');}catch(e){note=e.message;refresh();}};
 q('[data-ui=fold]').onclick=()=>{clearFoot();deckFolded=true;refresh();q('[data-ui=unfold]').focus();};q('[data-ui=unfold]').onclick=()=>{clearFoot();deckFolded=false;refresh();q('[data-ui=fold]').focus();};
 for(const b of panel.querySelectorAll('[data-build-open],[data-build-tab]'))b.onclick=()=>{if(!ready())return;buildPage=b.dataset.buildOpen||b.dataset.buildTab;setSheet('build');};
 for(const b of panel.querySelectorAll('[data-shape-preset]'))b.onclick=()=>{if(!ready()||project().foundation)return;draftMask=Number(b.dataset.shapePreset);groundPreview=false;view.setFoundationPreview(null);refresh();};
 q('[data-ui=build-done]').onclick=()=>setSheet(null);
 q('[data-ui=ground]').onclick=()=>{if(!ready()||project().foundation)return;inspectDraft();setSheet(null);};
 const workEditor=createFreeWorkEditor({panel,getProject:project,problem:workEditProblem,moveProblem:workMoveProblem,ask,preview:value=>view.setWorkPreview(value)});
 q('[data-ui="works"]').onclick=()=>{workEditor.open();setSheet('works');};
 q('[data-ui="menu"]').onclick=()=>setSheet('menu');q('[data-ui="close"]').onclick=()=>setSheet(null);q('[data-ui="settings"]').onclick=()=>setSheet(mode);
 for(const b of panel.querySelectorAll('[data-camera-mode]'))b.onclick=()=>{view.setCameraMode(b.dataset.cameraMode);note=CONCRETE_CAMERA_MODES[view.cameraMode]+'に切り替えました。';setSheet(null);};
 q('[data-ui="camera-reset"]').onclick=()=>{view.resetCamera();setSheet(null);};
 for(const b of panel.querySelectorAll('[data-mode]'))b.onclick=()=>{if(suppressModeClick){suppressModeClick=false;return;}selectMode(b.dataset.mode);};
 for(const b of panel.querySelectorAll('[data-toolbox]'))b.onclick=()=>{mode=b.dataset.toolbox;setSheet(mode);};
 q('[data-quick-prev]').onclick=()=>stepQuickTarget(-1);q('[data-quick-next]').onclick=()=>stepQuickTarget(1);
 q('[data-quick-shape]').onchange=()=>{if(ready()&&!project().foundation&&q('[data-quick-shape]').value!=='custom'){draftMask=Number(q('[data-quick-shape]').value);groundPreview=false;view.setFoundationPreview(null);refresh();}};
 q('[data-quick-height]').onchange=()=>{if(ready()){draftHeight=Number(q('[data-quick-height]').value);q('[data-height]').value=String(draftHeight);refresh();}};
 for(const key of ['color','face','amount'])q('[data-quick-'+key+']').onchange=()=>{if(ready()){q('[data-'+key+']').value=q('[data-quick-'+key+']').value;refresh();}};
 const modeBar=q('.free-mode-tabs');modeBar.addEventListener('pointerdown',e=>{if(e.button!==0||busy||sheet||confirm)return;suppressModeClick=false;clearFoot();swipe={id:e.pointerId,x:e.clientX,y:e.clientY};});
 modeBar.addEventListener('pointerup',e=>{if(!swipe||swipe.id!==e.pointerId)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>=35&&Math.abs(dx)>Math.abs(dy)*1.5){suppressModeClick=true;selectMode(nextFreePlayMode(mode,dx<0?1:-1));}});
 for(const event of ['pointercancel','pointerleave'])modeBar.addEventListener(event,()=>{swipe=null;});
 for(let i=0;i<16;i++){
  const maskButton=document.createElement('button');maskButton.dataset.pixel=String(i);maskButton.type='button';maskButton.setAttribute('aria-label','マス '+(i+1)+' をテープで守る');maskButton.onclick=()=>{if(!ready()||free().aboard)return;try{paintMasks.toggle(free(),paintTarget(),i);refresh();}catch(e){note=e.message;refresh();}};q('[data-paint-mask]').append(maskButton);
  for(const name of ['shape','cells','brush']){const b=document.createElement('button');b.dataset.cell=String(i);b.textContent=String(i+1);b.setAttribute('aria-label',`${name==='brush'?'塗装':name==='shape'?'型枠':'注ぎ先'} ${i+1}`);q(`[data-${name}]`).append(b);
   if(name==='shape')b.onclick=()=>{if(!ready())return;draftMask^=1<<i;if(groundPreview)inspectDraft();refresh();};if(name==='cells')b.onclick=()=>{cell=i;view.select(i);refresh();};
   if(name==='brush')b.onclick=e=>{if(e.detail===0)paintRequest('brush',[i]);};
  }
  q('[data-paint-cell]').append(new Option(`マス ${i+1}`,String(i)));
 }
 const drawingBoard=q('[data-drawing-board]');
 function drawSample(e){const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drawing-pixel]'),i=b&&drawingBoard.contains(b)&&!b.disabled?Number(b.dataset.drawingPixel):null;drawing.sample(i,drawingWidth,paintMasks.applied(free(),paintTarget()));refresh();}
 drawingBoard.addEventListener('pointerdown',e=>{if(e.button!==0||drawingPointer!==null||!ready()||free().aboard)return;const b=e.target.closest('[data-drawing-pixel]');if(!b||b.disabled)return;e.preventDefault();drawingPointer=e.pointerId;drawing.begin();drawingBoard.setPointerCapture(e.pointerId);drawSample(e);});
 drawingBoard.addEventListener('pointermove',e=>{if(e.pointerId===drawingPointer){e.preventDefault();drawSample(e);}});
 drawingBoard.addEventListener('pointerup',e=>{if(e.pointerId===drawingPointer){drawSample(e);endDrawing();refresh();}});
 for(const event of ['pointercancel','lostpointercapture'])drawingBoard.addEventListener(event,e=>{if(e.pointerId===drawingPointer){endDrawing(true);refresh();}});
 for(const b of drawingBoard.children)b.onclick=e=>{if(e.detail!==0||b.disabled||!ready())return;drawing.begin();drawing.sample(Number(b.dataset.drawingPixel),drawingWidth,paintMasks.applied(free(),paintTarget()));drawing.finish();refresh();};
 for(const b of panel.querySelectorAll('[data-drawing-width]'))b.onclick=()=>{if(!ready())return;endDrawing(true);drawingWidth=Number(b.dataset.drawingWidth);refresh();};
 q('[data-ui=drawing-clear]').onclick=()=>{endDrawing(true);drawing.clear();refresh();};q('[data-ui=drawing-paint]').onclick=()=>{endDrawing();void paintRequest('brush',drawing.pixels);};
 const brush=q('[data-brush]');function addPaint(e){const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-brush] button');if(!b||!brush.contains(b)||b.disabled){brushLast=null;return;}const i=Number(b.dataset.cell);for(const p of paintLinePixels(brushLast??i,i,1,paintMasks.applied(free(),paintTarget()))){stroke.add(p);brush.children[p].setAttribute('aria-pressed','true');}brushLast=i;}
 brush.addEventListener('pointerdown',e=>{if(e.button!==0||paintPointer!==null||!ready()||free().aboard||!free().completed.length)return;e.preventDefault();paintPointer=e.pointerId;brushLast=null;stroke=new Set();brush.setPointerCapture(e.pointerId);addPaint(e);});
 brush.addEventListener('pointermove',e=>{if(e.pointerId===paintPointer)addPaint(e);});
 function finishStroke(e,cancel=false){if(e.pointerId!==paintPointer)return;paintPointer=null;brushLast=null;const pixels=[...stroke];stroke.clear();for(const b of brush.children)b.setAttribute('aria-pressed','false');if(!cancel)paintRequest('brush',pixels);}
 brush.addEventListener('pointerup',e=>finishStroke(e));for(const event of ['pointercancel','lostpointercapture'])brush.addEventListener(event,e=>finishStroke(e,true));
 q('[data-foundation-height]').onchange=()=>{if(groundPreview)inspectDraft();refresh();};q('[data-height]').onchange=()=>{draftHeight=Number(q('[data-height]').value);if(groundPreview)inspectDraft();refresh();};for(const selector of ['[data-work]','[data-paint-cell]','[data-face]','[data-color]'])q(selector).onchange=()=>{clearBrush();refresh();};for(const b of panel.querySelectorAll('[data-paint-color]'))b.onclick=()=>{if(!ready())return;choosePaintColor(b.dataset.paintColor);refresh();};

 function choosePaintColor(color){if(!validPaintColor(color))return;for(const selector of ['[data-color]','[data-quick-color]']){const el=q(selector);let option=[...el.options].find(o=>o.value===color);if(!option){option=new Option(paintName(color),color);option.dataset.custom='true';el.append(option);}el.value=color;for(const old of [...el.options])if(old.dataset.custom&&old!==option)old.remove();}}
 function refreshTaskGuide(f){
  const g=workshopGuide(f,mode,{vehicle:vehicleJob,paintTool,designReady:draftMask!==0,hasWork:f.completed.some(w=>freeWorkMask(w))}),card=q('[data-task-card]');card.hidden=!g;q('[data-mode-note]').hidden=!!g;
  q('[data-task-next]').hidden=mode!=='build'||f.stage!=='complete';q('[data-task-next]').disabled=!ready()||button('next').disabled;
  q('[data-vehicle-jobs]').hidden=mode!=='vehicle'||!!f.aboard;
  for(const b of panel.querySelectorAll('[data-vehicle-job]')){b.disabled=!ready();b.setAttribute('aria-pressed',String(b.dataset.vehicleJob===vehicleJob));}
  const link=q('[data-task-link]');for(const b of panel.querySelectorAll('[data-next-action]'))b.removeAttribute('data-next-action');
  if(g){writeText('[data-task-title]',g.title);writeText('[data-task-body]',g.body);writeText('[data-task-symbol]',({build:'▰',vehicle:'◉',paint:'✿'})[mode]);
   const list=q('[data-task-steps]'),key=JSON.stringify([g.steps,g.index]);if(list.dataset.key!==key){list.dataset.key=key;list.replaceChildren(...g.steps.map((text,i)=>{const li=document.createElement('li');li.textContent=(i<g.index?'✓ ':String(i+1)+' ')+text;li.dataset.current=String(i===g.index);li.dataset.done=String(i<g.index);return li;}));}
   let action=g.action;if(action==='prepare-mix')action=availableMixCells(f.mixer)>=Number(q('[data-amount]').value)?'mix':'supply';
   const source=action?button(action):null;link.hidden=!action||!!source;link.dataset.action=action??'';link.textContent=g.label;link.disabled=!ready();
   if(!moreActions&&(mode==='build'||mode==='vehicle'&&f.aboard))for(const b of q('.free-primary-actions').querySelectorAll('[data-free]'))if(b!==source)b.hidden=true;
   if(source){source.dataset.nextAction='true';if(['build','vehicle'].includes(mode))source.hidden=false;}
   const reason=source?.disabled?source.title:'';writeText('[data-task-blocked]',reason);q('[data-task-blocked]').hidden=!reason;
  }else link.hidden=true;
  if(g&&ready()&&mode!=='paint'){q('[data-pour-reason]').hidden=true;}
  q('[data-task-more]').hidden=mode==='move';q('[data-task-more]').setAttribute('aria-expanded',String(moreActions));q('[data-task-more]').textContent=moreActions?'道具を少なく表示':({build:'回収・細かな設定',vehicle:'量の変更・ホースの片付け',paint:'テープ・塗り直し'})[mode]??'';
  q('[data-ui=settings]').hidden=mode==='move'||!moreActions;
  if(mode==='paint')for(const id of ['quick-mask','quick-removal'])q('[data-ui='+id+']').hidden=!moreActions;
  if(mode==='vehicle'&&!moreActions)for(const id of ['legs','connect','drain','return']){const b=button(id);if(!b.hasAttribute('data-next-action'))b.hidden=true;}
  if(mode==='build'&&!moreActions)button('unframe').hidden=true;
 }
 q('[data-task-next]').onclick=()=>actions.next();
 q('[data-task-more]').onclick=()=>{moreActions=!moreActions;clearFoot();refresh();};
 q('[data-task-link]').onclick=()=>{const a=q('[data-task-link]').dataset.action;if(!ready())return;if(a==='shape'){buildPage='shape';setSheet('build');}else if(['build','vehicle','paint','move'].includes(a)){selectMode(a);if(a==='build'&&['framed','wet'].includes(free().stage)){buildPage='pour';setSheet('build');}}};
 for(const b of panel.querySelectorAll('[data-vehicle-job]'))b.onclick=()=>{if(ready()){vehicleJob=b.dataset.vehicleJob;refresh();}};
 for(const b of panel.querySelectorAll('[data-paint-tool]'))b.onclick=()=>{if(ready()){paintTool=b.dataset.paintTool;clearBrush();refresh();}};
 q('[data-ui=show-target]').onclick=()=>{if(!busy){clearFoot();view.focusTarget();deckFolded=true;sheet=null;refresh();}};
 q('[data-paint-target-open]').onclick=()=>setSheet('paint');
 colorStudios=installColorStudios(panel,{getColor:()=>q('[data-color]').value,choose:choosePaintColor,enabled:()=>ready(),changed:()=>refresh()});
 choosePaintColor('#64b5ff');

 q('[data-ui=design-book]').onclick=()=>{buildPage='book';setSheet('build');};
 const actions={evacuate:()=>{if(busy||service.blocked||confirm)return;try{const plan=view.evacuationPlan();ask('SAFE_RETURN',plan,free().aboard?'救助を呼び、車をその場に残して降り、安全な地面へ移動します。積み荷・配管・支持脚・作品・材料を保持し、降車を保存します。':'救助を呼び、確認済みの安全な地面へ移動します。今の作品と材料を保持します。')}catch(e){note=e.message;refresh();}},access:()=>useStairs(!view.onAccess),foundation:()=>{if(!ready())return;try{const a=foundationActionFromPlan(inspectDraft()),cost=foundationBoardCount(a);if(cost>foundationAvailableBoards(project(),service.constructionPackTrialStock))throw Error('土台の板が不足しています。形を小さくするか板を受け取ってください。');ask('FREE_FOUNDATION_BUILD',a,`選んだ場所に高さ${a.deckY}の仮設土台を設置します。型枠の板 ${cost}枚を使用し、回収すると戻ります。`);}catch(e){note=e.message;refresh();}},unfoundation:()=>{if(!ready())return;ask('FREE_FOUNDATION_REMOVE',{},`土台を回収して型枠の板 ${foundationBoardCount(project().foundation)}枚を戻します。上に人・車両・資材がある場合は回収できません。`);},unframe:()=>{if(ready())ask('FREE_UNFRAME',{},'空の型枠を片付けて、板を手もとへ戻します。作った床や材料はそのままです。');},frame:async()=>{if(!ready())return;if(project().foundation)return run(RAISED_FRAME_ACTION,{height:draftHeight});const ground=inspectDraft();if(!ground.ready){sheet=null;refresh();return;}if(await run('FREE_DESIGN',{mask:draftMask,height:draftHeight})&&ready()&&!document.hidden)await run('FREE_FRAME');},
  export:()=>{if(busy||service.busy||service.blocked)return;clearFoot();const text=service.export(),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-construction-record-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);note='作品・材料・車両を含む作業の控えを保存しました。';refresh();},
  pause:()=>{clearFoot();paused=!paused;sheet=paused?'menu':null;refresh();if(!paused)q(`[data-mode="${mode}"]`).focus();},leave:()=>leave(),save:savePlatform,camera:()=>setSheet('camera'),stop:()=>{clearFoot();view.cancel();},
  supply:()=>run('FREE_SUPPLY',{cells:Number(q('[data-amount]').value)}),mix:()=>run('FREE_MIX_START',{cells:Number(q('[data-amount]').value)}),load:()=>run('FREE_BUCKET_LOAD'),return:()=>run('FREE_BUCKET_RETURN'),
  'choose-car':()=>vehicleSelector.show(vehicleJob),'help':()=>{clearFoot();clearInput();openConstructionGuide(free().aboard==='truck'?'mixer':free().aboard==='pump'?'pump':mode==='paint'?'paint':'concrete');},
  'walk-truck':()=>walkToVehicle('truck'),'walk-pump':()=>walkToVehicle('pump'),'walk-stop':()=>{clearFoot();note='ここで止まったよ。';refresh();},
  truck:()=>run('FREE_BOARD',{vehicle:'truck'}),pump:()=>run('FREE_BOARD',{vehicle:'pump'}),dismount:()=>run('FREE_LEAVE'),
  legs:()=>run('FREE_LEGS',{deployed:!free().pump.legs}),connect:()=>run('FREE_CONNECT',{connected:!free().connected}),prime:()=>run('FREE_PRIME'),drain:()=>run('FREE_DRAIN'),
  pour:()=>run('FREE_POUR',{source:free().aboard??'bucket',cell}),finish:()=>run('FREE_FINISH'),cure:()=>run('FREE_CURE'),demold:()=>run('FREE_DEMOLD'),
  recover:()=>ask('FREE_RECOVER',{},'まだ固めていない生コンを車のタンクへ回収します。'),next:()=>{const type=free().stage==='design'?'FREE_CHANGE_EMPTY_SITE':'FREE_NEXT',pos=position(type);if(!pos){note='つくれる空き場所が見つからないよ。周りの地面や建物をたしかめよう。';refresh();return;}ask(type,pos,type==='FREE_NEXT'?'今の作品と車はその場所に残し、次につくる場所を選ぶよ。':'つくる場所を選び直すよ。モンスターと車は今いる場所に残るよ。');},
  tape:()=>workMask(),untape:()=>workMask(0),roller:()=>paintRequest('roller',Array.from({length:16},(_,i)=>i)),'step-undo':()=>{if(!ready())return;const target=workUndoTarget();if(target?.sourceType==='MASK_UNDO'){ask('MASK_UNDO',target,'さっきのテープ作業を戻す？ ペンキと作品はそのままだよ。');return;}if(target)ask(target.type,target.extra,'「'+target.label+'」を戻す？ この作業で使った材料も元どおりになるよ。歩いた場所はそのままだよ。');},undo:()=>actions['step-undo'](),
  dismiss:dismissConfirmation,confirm:async()=>{const c=confirm;confirm=null;if(c?.type==='MASK_UNDO'){if(currentMaskUndo()?.id!==c.extra.id){note='戻すテープが変わったよ。もう一度たしかめてね。';refresh();return;}undoingMask=true;try{if(await workMask(c.extra.toMask,c.extra,false)){maskUndos.pop();undoCursor.consume(c.extra.id);}}finally{undoingMask=false;refresh();}return;}if(c?.type==='CLEAR_PLATFORM'){try{clearFoot();busy=true;pendingPlatformClear=true;refresh();await service.saveConstructionWorkPlatform(null,project().revision,snapshot());view.clearWorkPlatform();pendingPlatformClear=false;sheet=null;note='作業台を片付けて保存しました。作品と材料はそのままです。';}catch(e){note=e.message;if(!service.blocked)pendingPlatformClear=false;}finally{busy=false;refresh();}return;}if(c?.type==='SAFE_RETURN'){if(c.extra.vehicle){paused=false;await run('FREE_LEAVE',{},true,c.extra);return;}try{clearFoot();view.evacuate(c.extra);sheet=null;paused=false;note='安全な地面へ戻りました。作品と材料は変更していません。';refresh();q(`[data-mode="${mode}"]`).focus();}catch(e){note=e.message;refresh();}return;}if(c){const succeeded=await run(c.type,c.extra,!['FREE_UNDO_STEP','FREE_UNDO_PAINT'].includes(c.type),null,c.handTool);if(succeeded&&c.type==='FREE_NEXT'&&c.designReuse&&ready()&&!document.hidden)useDesignDraft(c.designReuse);if(succeeded&&c.type==='FREE_DESIGN'&&ready()&&!document.hidden)await run('FREE_FRAME');}},retry:async()=>{try{await service.retry();if(pendingUndo&&lastProjectOperation(project())?.operationId===pendingUndo){undoCursor.consume(pendingUndo);pendingUndo=null;}if(pendingPlatformClear&&!service.constructionWorkPlatform){view.clearWorkPlatform();pendingPlatformClear=false;}hoseFeedback.reconcile(free(),lastProjectOperation(project())?.operationId);note='保存結果を確認しました。再開してください。';view.sync(project());refresh();}catch(e){onError(e);}}
 };
 q('[data-ui=clear-platform]').onclick=()=>ask('CLEAR_PLATFORM',{},'作業台と階段を片付けます。作品・型枠・材料はそのままです。次の作業で必要な足場を用意します。');
 for(const b of panel.querySelectorAll('[data-free]'))b.onclick=()=>Promise.resolve(actions[b.dataset.free]()).catch(e=>{note=e.message;refresh();});
 function move(dx,dz,dt=.05){
  if(!movementReady())return;
  if(free().aboard){if(projectHistoryStatus(project()).full){clearFoot();return;}const name=free().aboard,action=chooseSteeredVehicleTravel(free()[name],name,-dz,dx,a=>view.vehicleProblem(a));if(action){const {type,...extra}=action;void run(type,extra);}return;}
  const world=view.travelVector(dx,dz);dx=world.x;dz=world.z;
  const strength=Math.min(1,Math.hypot(dx,dz));if(!strength)return;
  view.walkFoot(dx,dz,dt*strength,travelBoost.fast);
 }
 open.onclick=()=>void enter().catch(e=>{note=e.message;open.textContent='入場できません：'+note;refresh();});
 function suspend(){upperPump.pause();interruption++;clearFoot();if(!active)return;paused=true;confirm=null;sheet='menu';clearBrush();view.cancel();refresh();}
 // Focusing the embedded lesson blurs this window. The overlay already stops
 // the simulation; do not turn that internal focus change into a saved pause.
 // Actual background/page departure still suspends via visibility/pagehide.
 window.addEventListener('blur',()=>{if(constructionOverlayOpen()&&!document.hidden){clearFoot();return;}suspend();});document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
 function contactGeometry(){return{floors:[],walls:[...concreteVehicleGeometry(free(),supportHeightAt).walls,...pipeContactGeometry(free(),supportHeightAt).walls,...foundationGeometry(project()).walls]};}
 return{get resumePoint(){return active?{kind:'concrete',revision:project().revision,view:0,foot:view.worldFootPose}:null;},resumeSaved(point){if(point?.kind!=='concrete'||active||entering||busy||service.busy||service.blocked||state.map!=='construction'||!free()?.location||point.revision>project().revision)return false;paused=false;if(point.foot)view.setResumeFoot(point.foot);openView();return true;},autosave:()=>active&&!busy&&!view.busy?savePlatform({automatic:true}):false,contactGeometry,doorTarget,enterAtDoor,get busy(){return busy||entering;},pedestrianBlockedAt:(x,z)=>view.pedestrianBlockedAt(x,z),overlapsVehicle:(p,size)=>contactGeometry().walls.some(w=>overlaps({x:w.x,z:w.z,hx:w.localHalfX,hz:w.localHalfZ,heading:w.rotation},{x:p[0],z:p[2],hx:size[0]/2,hz:size[2]/2,heading:0})),get active(){return active;},leave,save:savePlatform,look:(...args)=>{if(!sheet&&!confirm&&!paused)view.look(...args);},handleKey:e=>{if(e.type!=='keyup'&&e.code==='Space'&&!e.target?.closest?.('input,select,textarea,[contenteditable=true]')){if(sheet||confirm||paused)return;e.preventDefault();jumpControl.key(e);return;}if(e.type==='keyup'){if(e.code==='Space')jumpControl.key(e);travelBoost.key(e);return;}if(handleMenuKey(e))return;if(travelBoost.key(e)){e.preventDefault();const v=travelBoost.vector;move(v.x,v.z);refresh();}},
  install(options){readPresentationRevision=options.presentationRevision??null;backgroundPresentation.reset();upperPipeBlockedAt=options.upperPipeBlockedAt??(()=>true);blockedAt=options.blockedAt;const travelBlocked=options.travelBlockedAt??blockedAt;view.setBlockedAt(travelBlocked);supportHeightAt=options.supportHeightAt??(()=>null);placementHeightAt=options.placementHeightAt??supportHeightAt;view.setSupportHeightAt(supportHeightAt);view.setJumpCeilingAt(options.jumpCeilingAt??(()=>Infinity));view.setToolEnvironment({heightAt:toolHeightAt,blockedAt:(...args)=>supportedToolBlocked(project(),travelBlocked)(...args)});view.setFoundationEnvironment(()=>({heightAt:placementHeightAt,blockedAt}));view.root.visible=state.map==='construction';view.sync(project());if(!active&&!entering&&free()?.location)syncDoorEnvironment();const f=free();if(state.map==='construction'&&f?.location){// Pedestrians use the actual vehicles, wet forms, rack, hose and platform.
for(const w of contactGeometry().walls)options.collider(w.x,w.z,[w.localHalfX*2,w.localHalfZ*2],w.rotation,w.id,0,{...w,buildingId:'construction-concrete'});}},
  update(dt){jumpControl.sync();if(!active&&!entering&&state.map!=='construction')return false;q('[data-free-jump]').hidden=!!free()?.aboard||!!sheet||!!confirm||paused||busy&&!progressSaving;if(constructionOverlayOpen()){upperPump.pause();return active||entering;}dashControl.sync();movePad.sync();upperPump.tick(dt);if(active&&!paused&&!document.hidden){
   progress.sync(free(),service.blocked?0:dt);
   if(!busy&&!service.busy&&!service.blocked&&!confirm&&!projectHistoryStatus(project()).full){const next=progress.next(free());if(next)void run(next.type,{elapsedMs:next.elapsedMs},false);}
   const v=travelBoost.vector;if(movementReady()){if(v.x||v.z){if(doorWalk||doorSearch)note='自分で歩く操作に切り替えたよ。';stopDoorWalk();move(v.x,v.z,dt);}else if(doorWalk)advanceDoorWalk(dt);else view.stopWalking();}view.tick(dt);if(HOSE_TRANSFER_ACTIONS.has(view.hoseTransferType))hoseFeedback.advance(view.hoseTransferProgress);
  }lastUI+=dt;if(lastUI>.15){lastUI=0;const p=project();backgroundPresentation.draw({project:p,stock:service.constructionPackTrialStock},readPresentationRevision?.(),()=>{view.sync(p);refresh();},{live:active||entering});}return active||entering;}
 };
}
