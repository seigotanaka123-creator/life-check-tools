import {createHeldDashButton} from '../imasora-hold-dash.mjs?v=119bf';
import {stencilPixels,stencilGuide} from './free-stencil.mjs?v=120e';
import {createFreeProgressClock} from './free-progress-clock.mjs?v=119bn';
import {HOSE_TRANSFER_ACTIONS,createHoseTransferFeedback} from './free-hose-meter.mjs?v=120d';
import {lastProjectOperation} from './project-history.mjs';
import {projectHistoryStatus,historyActionAllowed} from './free-history-status.mjs';
import {assertRaisedPaintSupport,paintNeedsGroundAccess,foundationPaintUsesLanding} from './free-foundation-access.mjs';
import {constructionBase,RAISED_FRAME_ACTION,RAISED_BASE_MAX,foundationSurfaceAt,assertFoundationSupport,supportedToolBlocked} from './free-supported-build.mjs';
import {inspectFormGround,requireFormGround} from './free-foundation-check.mjs';
import {FOUNDATION_ACTIONS,foundationBoardCount,foundationAvailableBoards,foundationContains,foundationGeometry} from './free-foundation-state.mjs';
import {foundationActionFromPlan,assertFoundationEnvironment} from './free-foundation-operation.mjs';
import {createMonsterTravelInput,constructionTravelAllowed} from './monster-travel-input.mjs?v=119bf';
import {createConstructionMovePad} from './move-pad.mjs?v=119bf';
import {FREE_PLAY_MODES,FREE_PLAY_LABELS,nextFreePlayMode,freePlayActions,freePlayTemplate,freeModeNavigationKey,freeStageGuide,freeConfirmation} from './free-play-ui.mjs?v=120e';
import {createFreeBuildView} from './free-build-view.mjs?v=120d';
import {CONCRETE_CAMERA_MODES} from './monster-camera.mjs';
import {freeLocationProblem,emptySiteProblem,freePourProblem,freePaintCost,freeGeometry,freeFrameBoards,freeTruckLoad} from './free-build-state.mjs';
import {transitionProfileProject} from '../imasora-construction-profile-project.js';
import {availableMixCells} from './mixing.mjs';
import {FREE_CONTACT_ACTIONS} from './free-contact.mjs';
import {castingProblem} from './free-casting.mjs';
import {FREE_VEHICLE_ACTIONS,vehicleTravelHeading,concreteVehicleGeometry,overlaps} from './free-vehicle-contact.mjs';
import {PIPE_ACTIONS,pipeContactGeometry} from './free-boom-contact.mjs';
import {assertStarterTool,requiredStarterTool,toolkitSummary,toolkitDetails} from '../imasora-construction-toolkit.mjs?v=120e';

import {createFreeWorkEditor} from './free-work-editor.mjs';
import {freeWorkMask,freePlacedFill} from './free-work-parts.mjs';
import {SUPPORTED_WORK_MOVE,supportedWorkMoveEnvironmentProblem} from './free-supported-work-move.mjs';
import {freeWorkMoveEnvironmentProblem} from './free-work-move.mjs';
import {freeWorkEnvironmentProblem} from './free-work-edit.mjs';

export function createFreeBuildController({service,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onLayoutChange,onError,launcher,canEnter}){
 const open=document.createElement('button');open.textContent='自由建築をはじめる';open.title='型枠・塗装・ミキサー車・ポンプ車で自由につくる';launcher.append(open);
 const panel=document.createElement('section');panel.className='concrete-controls free-concrete';panel.hidden=true;panel.setAttribute('aria-label','自由建築');
 panel.innerHTML=freePlayTemplate();
 canvas.parentElement.append(panel);panel.addEventListener('pointerdown',e=>e.stopPropagation());
 const q=s=>panel.querySelector(s),button=id=>q(`[data-free="${id}"]`),view=createFreeBuildView({scene,camera,model:character});
 // Reserve the actual notice/header height, including wrapped text on small screens.
 if(typeof ResizeObserver!=='undefined'){const hudSize=new ResizeObserver(()=>{const h=Math.ceil(q('.free-hud-top').getBoundingClientRect().height);if(h>0)panel.style.setProperty('--free-hud-size',h+'px');});hudSize.observe(q('.free-hud-top'));}
 const doorActions=button('truck').parentElement,travel=q('.concrete-travel');
 const writeText=(selector,value)=>{const element=q(selector);if(element.textContent!==value)element.textContent=value;};
 let travelBoost=null,dashControl=null,driving=false,progressSaving=false,groundPreview=false,workWatching=false;
 let mode='move',sheet=null,restoreFocus=null,swipe=null,suppressModeClick=false;
 function clearFoot(){travelBoost?.reset();view.stopWalking();}
 const progress=createFreeProgressClock(),hoseFeedback=createHoseTransferFeedback();let interruption=0;
 let pendingPlatformClear=false;
 let active=false,entering=false,busy=false,paused=false,note='',draftMask=0,draftHeight=2,cell=0,confirm=null,paintPointer=null,stroke=new Set(),cached=null,ledger=null,paintKey='',lastUI=0;
 let supportHeightAt=()=>null,placementHeightAt=()=>null,blockedAt=()=>true;const inert=new Map();
 const project=()=>{if(ledger!==service.ledger){ledger=service.ledger;cached=service.constructionConcreteProject;}return cached;};
 const free=()=>project().freeBuild;
 const ready=()=>active&&!busy&&!paused&&!service.blocked&&!service.busy&&!confirm;
 const movementReady=()=>ready()&&!sheet;
 const travelReady=()=>!(free()?.aboard&&projectHistoryStatus(project()).full)&&constructionTravelAllowed({active,paused,blocked:service.blocked,confirm,sheet,busy,serviceBusy:service.busy,driving,progressSaving});
 travelBoost=createMonsterTravelInput({enabled:travelReady,context:()=>free()?.aboard??'foot',onStop:()=>view.stopWalking(),fastHeld:()=>dashControl?.active===true,clearFast:()=>dashControl?.cancel()});
 const padAllowed=()=>travelReady()&&(!free()?.aboard||!free().connected&&!free().hose&&!free()[free().aboard]?.legs);
 dashControl=createHeldDashButton({element:q('[data-hold-dash]'),enabled:padAllowed,context:()=>free()?.aboard??'foot'});
 const movePad=createConstructionMovePad({element:q('[data-construction-pad]'),input:travelBoost,enabled:padAllowed,onChange:()=>refresh()});
 function ownInput(yes){clearInput();for(const e of document.querySelectorAll('.world-toolbar,.control-card')){if(yes){inert.set(e,e.inert);e.inert=true;}else if(inert.has(e))e.inert=inert.get(e);}if(!yes)inert.clear();document.body.classList.toggle('world-concrete-playing',yes);document.body.classList.toggle('world-free-playing',yes);canvas.parentElement.classList.toggle('world-concrete-operating',yes);panel.hidden=!yes;shadow.visible=!yes;}
 function position(type='FREE_PLACE'){const p=project(),loc=free()?.location??p.location;for(const [dx,dz]of [[0,-360],[360,0],[-360,0],[0,360],[720,0],[-720,0]]){const pos={x:loc.x+dx,z:loc.z+dz};if(freeLocationProblem(p,pos)||blockedAt(pos.x,pos.z,150))continue;try{const proposed=transitionProfileProject(p,{type,operationId:'candidate-site-check',...pos},p.revision,service.constructionPackTrialStock).state;view.siteEntryPose(proposed);return pos;}catch{}}return null;}
 const toolHeightAt=(x,z)=>foundationSurfaceAt(project().foundation,x,z)??supportHeightAt(x,z);
 function workEditProblem(work,mask){const p=project(),w=p.freeBuild.completed[work];if(p.schemaVersion>=13&&constructionBase(w)&&(mask&~freeWorkMask(w)))try{assertFoundationSupport(p,{heightAt:placementHeightAt,blockedAt});}catch(e){return e.message;}return freeWorkEnvironmentProblem(p,work,mask,{foot:view.footPosition,blockedAt,supportHeightAt:toolHeightAt});}
 function workMoveProblem(work,position,quarterTurns=0){return (constructionBase(free()?.completed[work])?supportedWorkMoveEnvironmentProblem:freeWorkMoveEnvironmentProblem)(project(),work,position,{foot:view.footPosition,blockedAt,supportHeightAt:placementHeightAt},quarterTurns);}
 function checkPlacement(a,handTool=null){if(handTool==='stencil'&&!service.constructionProjectPreview)assertStarterTool(service.constructionToolkit,{type:'STENCIL_PAINT'});if(!service.constructionProjectPreview&&requiredStarterTool(a))assertStarterTool(service.constructionToolkit,a);if(view.onAccess&&!['FREE_PAINT','FREE_UNDO_PAINT','FREE_MIX_TICK','FREE_CURE_TICK'].includes(a.type))throw Error('階段で地上へ降りてから作業してください。');if(a.type==='FREE_PAINT')assertRaisedPaintSupport(project(),a,placementHeightAt,blockedAt);if(project().foundation&&(['FREE_FRAME',RAISED_FRAME_ACTION].includes(a.type)||constructionBase(free())&&['FREE_POUR','FREE_FINISH','FREE_DEMOLD','FREE_UNFRAME','FREE_CURE','FREE_CURE_TICK'].includes(a.type)))assertFoundationSupport(project(),{heightAt:placementHeightAt,blockedAt});if(FOUNDATION_ACTIONS.has(a.type))assertFoundationEnvironment(project(),a,{heightAt:placementHeightAt,blockedAt,foot:view.footPosition});if(a.type==='FREE_DESIGN')requireFormGround(free(),a.mask,a.height,supportHeightAt,blockedAt);if(['FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(a.type)){const issue=workMoveProblem(a.work,a,a.quarterTurns??0);if(issue)throw Error(issue);}if(a.type==='FREE_SET_WORK_PARTS'){const issue=workEditProblem(a.work,a.mask);if(issue)throw Error(issue);}if(['FREE_PLACE','FREE_NEXT','FREE_CHANGE_EMPTY_SITE'].includes(a.type)&&(blockedAt(a.x,a.z,150)||freeLocationProblem(project(),a)))throw Error('施工区画が建物・作品と重なります。');if(['FREE_NEXT','FREE_CHANGE_EMPTY_SITE'].includes(a.type))view.siteEntryPose(transitionProfileProject(project(),a,project().revision,service.constructionPackTrialStock).state);}
 async function run(type,extra={},animate=true,rescuePlan=null,handTool=null){
  if(busy||paused||document.hidden||service.blocked||service.busy)return false;const started=interruption;if(projectHistoryStatus(project()).full){clearFoot();note=projectHistoryStatus(project()).message;refresh();return false;}if(type==='FREE_PAINT'&&view.hasWorkPlatform&&view.onAccess&&!await useStairs(false))return false;if(type==='FREE_PAINT'&&!view.hasWorkPlatform&&foundationPaintUsesLanding(project(),extra)){if(view.onAccess&&paintNeedsGroundAccess(project(),extra,view.accessRecord.plan)&&!await useStairs(false))return false;if(!view.onAccess&&!await useStairs(true,extra))return false;}if(view.onAccess&&type==='FREE_PAINT'&&paintNeedsGroundAccess(project(),extra,view.accessRecord.plan)&&!await useStairs(false))return false;if(paused||document.hidden||started!==interruption)return false;const fromDialog=!!document.activeElement?.closest('[data-confirm],[data-play-sheet]');progressSaving=['FREE_MIX_TICK','FREE_CURE_TICK'].includes(type)&&!animate;if(type!=='FREE_MOVE'&&!progressSaving)clearFoot();const fast=travelBoost.fast;driving=type==='FREE_MOVE';workWatching=animate&&!driving;if(!progressSaving)sheet=null;const a={type,operationId:crypto.randomUUID(),...extra},p=project();busy=true;if(type==='FREE_BOARD')note='目の前のドアを開けて乗り込みます。';else if(type==='FREE_LEAVE')note=rescuePlan?'救助先を確認し、降車を保存しています。':'ドアを開けて降り、ドア前に立ちます。';else if(type==='FREE_PAINT')note='施工面へ近づき、選んだ部分を塗っています。';refresh();
  let saved=false;
  try{if(!progressSaving){hoseFeedback.reset();if(HOSE_TRANSFER_ACTIONS.has(type))hoseFeedback.begin(a,p.freeBuild);}checkPlacement(a,handTool);const proposed=transitionProfileProject(p,a,p.revision,service.constructionPackTrialStock).state;const priorPlatform=['FREE_DESIGN','FREE_FRAME','FREE_FRAME_RAISED','FREE_FOUNDATION_BUILD'].includes(type)?view.exportWorkPlatform():null;if(priorPlatform&&(type==='FREE_FOUNDATION_BUILD'||proposed.freeBuild.mask!==priorPlatform.anchor.mask||proposed.freeBuild.height!==priorPlatform.anchor.height))throw Error('型枠の形や高さ・土台を変える前に、メニューから作業台を片付けてください。');const preflight=rescuePlan?(view.verifyVehicleRescue(rescuePlan),''):view.vehicleProblem(a);if(preflight)throw Error(preflight);const result=rescuePlan?view.prepareVehicleRescue(a,rescuePlan):animate?await view.perform(a,{fast,deferredFoundation:true}):null;if(started!==interruption||paused||document.hidden)throw Error('作業を中止しました。材料は変更していません。');checkPlacement(a,handTool);const finalCheck=rescuePlan?(view.verifyVehicleRescue(rescuePlan),''):view.vehicleProblem(a);if(finalCheck)throw Error(finalCheck);view.verifyFooting();if(HOSE_TRANSFER_ACTIONS.has(type)){hoseFeedback.saving();refresh();}await service.saveConstructionConcreteProject(a,p.revision,snapshot(),a.type===SUPPORTED_WORK_MOVE||FOUNDATION_ACTIONS.has(a.type)||FREE_CONTACT_ACTIONS.has(a.type)||FREE_VEHICLE_ACTIONS.has(a.type)||PIPE_ACTIONS.has(a.type)?result:null,['FREE_NEXT','FREE_CHANGE_EMPTY_SITE','FREE_FOUNDATION_REMOVE'].includes(type)?null:view.exportWorkPlatform());saved=true;progress.sync(free());if(!progressSaving)note=rescuePlan?'車をその場に残し、安全な地面へ戻りました。作品と材料は保持しています。':'材料と作業を保存しました。';
   if(FOUNDATION_ACTIONS.has(type)){groundPreview=false;view.setFoundationPreview(null);q('[data-ground-status]').textContent='選んだ場所の地面・穴・障害物を確認できます。';note=type==='FREE_FOUNDATION_BUILD'?'土台を設置して保存しました。':'土台を回収し、板を戻して保存しました。';}
   if(FOUNDATION_ACTIONS.has(type)||['FREE_CONNECT','FREE_PLACE','FREE_NEXT','FREE_CHANGE_EMPTY_SITE','FREE_DEMOLD','FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(type))onLayoutChange();return true;
  }catch(e){clearFoot();note=e.message;if(service.blocked){paused=true;onError(e);}return false;}finally{if(HOSE_TRANSFER_ACTIONS.has(type))hoseFeedback.finish({saved,blocked:service.blocked,f:free(),operationId:lastProjectOperation(project())?.operationId});busy=false;driving=false;progressSaving=false;workWatching=false;view.complete(saved,service.blocked);view.sync(project());refresh();if(!paused&&!sheet&&!confirm&&fromDialog)q(`[data-mode="${mode}"]`).focus();}
 }
 function ask(type,extra,text,handTool=null){if(projectHistoryStatus(project()).full&&type!=='CLEAR_PLATFORM'&&!(type==='SAFE_RETURN'&&!extra.vehicle)){note=projectHistoryStatus(project()).message;refresh();return;}clearFoot();sheet=null;confirm={type,extra,handTool};q('[data-confirm] p').textContent=text;const copy=handTool==='stencil'?{title:'型紙で塗る前に確認',label:'型紙で塗る',tone:'primary'}:freeConfirmation(type);writeText('[data-confirm-title]',copy.title);button('confirm').textContent=copy.label;button('confirm').dataset.tone=copy.tone;q('[data-confirm]').setAttribute('aria-label',copy.title);refresh();button('confirm').focus();}
 async function enter(){if(active||entering||!canEnter()||state.map!=='construction'||state.ufoBoarded||service.blocked)return;entering=true;const started=interruption;refresh();try{
  if(!free()?.location){const pos=position();if(!pos){note='既存の建物を避ける作業区画が見つかりません。';open.textContent=note;return;}if(!await run('FREE_PLACE',pos,false))return;}
  if(blockedAt(free().location.x,free().location.z,150)){open.textContent='施工区画が既存作品と重なっています。';return;}
  await service.saveWorld(snapshot());paused=started!==interruption||document.hidden;confirm=null;sheet=paused?'menu':null;progress.reset();mode='move';groundPreview=false;view.setFoundationPreview(null);q('[data-ground-status]').textContent='選んだ場所の地面・穴・障害物を確認できます。';draftMask=project().foundation?.mask||free().mask||0x0770;draftHeight=free().height;view.sync(project());view.enter();const platformIssue=view.restoreWorkPlatform(service.constructionWorkPlatform);note=platformIssue||(view.hasWorkPlatform?'保存した作業台と階段を再開しました。':'');active=true;ownInput(true);refresh();
  }finally{entering=false;refresh();}
 }
 async function useStairs(up,target=null){
  if(!active||busy||service.busy||service.blocked||confirm)return false;clearFoot();sheet=null;paused=false;busy=true;workWatching=true;refresh();try{await view.access(up,target);view.verifyFooting();view.complete(true);view.sync(project());note=up?'土台に上がりました。スマホは丸いパッド、PCはWASDで歩けます。降りる時は階段ボタンを使います。':'地上へ戻り、階段と踊り場を片付けました。';return true;}catch(e){view.complete(false);view.sync(project());note=e.message;return false;}finally{busy=false;workWatching=false;refresh();}
 }
 async function savePlatform(){
  if(busy||service.busy||service.blocked)return false;clearFoot();busy=true;refresh();
  try{await service.saveConstructionWorkPlatform(view.exportWorkPlatform(),project().revision,snapshot());note='保存しました。';return true;}
  catch(e){note=e.message;if(service.blocked){paused=true;sheet='menu';onError(e);}return false;}
  finally{busy=false;refresh();}
 }
 async function leave({then=null}={}){clearFoot();if(!active){then?.();return true;}if(busy||service.busy||service.blocked){note='作業停止または保存の再確認をしてください。';refresh();return false;}if(view.onAccess&&!await useStairs(false))return false;if(!await savePlatform())return false;view.setFoundationPreview(null);groundPreview=false;view.exit();active=false;confirm=null;sheet=null;progress.reset();ownInput(false);onLayoutChange();onExit();then?.();return true;}
 function paintAction(tool,pixels){return{work:Number(q('[data-work]').value),cell:Number(q('[data-paint-cell]').value),face:q('[data-face]').value,color:q('[data-color]').value,tool,pixels};}
 function paintRequest(tool,pixels,handTool=null){if(!ready()||!pixels.length)return;try{if(handTool==='stencil'&&!service.constructionProjectPreview)assertStarterTool(service.constructionToolkit,{type:'STENCIL_PAINT'});const a=paintAction(tool,pixels),result=freePaintCost(free().completed[a.work],a.cell,a.face,a.pixels,a.color);if(!result.changed.length){note='選んだ部分は同じ色です。';refresh();return;}ask('FREE_PAINT',a,`${handTool==='stencil'?'型紙の模様を刷毛':tool==='roller'?'ローラー':'刷毛'}で選んだ${a.face==='top'?'上面':'側面'}を塗ります。ペンキ ${result.cost}面分を使います。${handTool==='stencil'?' 型紙はなくなりません。':''}`,handTool);}catch(e){note=e.message;refresh();}}
 function inspectDraft(){const result=inspectFormGround(free(),draftMask,draftHeight,placementHeightAt,blockedAt);groundPreview=true;view.setFoundationPreview(result);q('[data-ground-status]').textContent=result.issue+(result.deckY>0?` 水平な土台の予定位置を青い線で表示します。土台の板 ${foundationBoardCount(foundationActionFromPlan(result))}枚／利用できる板 ${foundationAvailableBoards(project(),service.constructionPackTrialStock)}枚。`:'');note=result.issue;return result;}
 function refresh(){
  const f=free();open.disabled=!canEnter()||active||entering||state.ufoBoarded||service.blocked;open.hidden=state.map!=='construction';if(!active||!f)return;
  const can=ready(),p=project();panel.dataset.stage=f.stage;
  if(sheet==='menu'){const toolkit=service.constructionToolkit;writeText('[data-toolkit-summary]',toolkitSummary(toolkit));writeText('[data-toolkit-detail]',toolkitDetails(toolkit));}
  const foundation=p.foundation;
  if(f.mask&&!(f.mask&(1<<cell))){cell=Array.from({length:16},(_,i)=>i).find(i=>f.mask&(1<<i));view.select(cell);}
  for(const b of panel.querySelectorAll('button,select'))b.disabled=!can;
  button('foundation').hidden=!!foundation;button('unfoundation').hidden=!foundation;button('foundation').disabled=!can||!(p.schemaVersion>=11?['design','complete']:['design']).includes(f.stage)||!!f.aboard;button('unfoundation').disabled=!can||!['design','complete'].includes(f.stage)||!!f.aboard;
  q('[data-ui=ground]').disabled=!can||!!foundation;if(foundation){q('[data-ground-status]').textContent=`仮設土台を設置済み。型枠の板 ${foundationBoardCount(foundation)}枚を使用中。回収すると板が戻ります。`;for(const b of q('[data-shape]').children)b.disabled=true;q('[data-height]').disabled=!can||f.stage!=='design'||foundation.deckY>RAISED_BASE_MAX;}
  q('[data-height] option[value="8"]').disabled=false;button('frame').textContent=foundation?'足場で型枠を組む':'型枠を組む';button('evacuate').disabled=busy||service.busy||service.blocked||!!confirm;for(const id of ['pause','leave','save'])button(id).disabled=busy||service.busy||service.blocked||!!confirm;
  button('stop').disabled=!view.busy;button('retry').disabled=!service.blocked||busy;button('retry').hidden=!service.blocked;button('pause').textContent=paused?'再開する':'一時停止';
  q('[data-ui=clear-platform]').hidden=!view.hasWorkPlatform;q('[data-ui=clear-platform]').disabled=!can||view.onAccess;
  q('[data-confirm]').hidden=!confirm;button('confirm').disabled=button('dismiss').disabled=busy;
  const notice=projectHistoryStatus(p).full?projectHistoryStatus(p).message:paused?'一時停止中です。メニューの「再開する」で続けられます。':view.phase||note||'';writeText('[data-note]',notice);q('[data-note]').hidden=!notice;q('[data-history-status]').textContent=projectHistoryStatus(p).message;
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
  for(const b of q('[data-brush]').children)b.disabled=!can||!freeWorkMask(w)||!!f.aboard;
  for(const b of panel.querySelectorAll('[data-paint-color]')){b.setAttribute('aria-pressed',String(b.dataset.paintColor===q('[data-color]').value));b.disabled=!can;}
  if(sheet==='paint')refreshStencil(can,w);q('[data-ui=stencil-paint]').disabled=!can||!freeWorkMask(w)||!!f.aboard;
  q('[data-paint-cost]').textContent=`ペンキ残量 ${(service.constructionPackTrialStock.quantities.paintSurfaceCredits??0)-p.paintUsed}面分`;
  button('roller').disabled=!can||!freeWorkMask(w)||!!f.aboard;button('roller').title='工具が届く面へ、安全な通路・足場を使って塗ります。';button('undo').disabled=!can||!f.paintUndo||lastProjectOperation(p)?.operationId!==f.paintUndo.operationId;
  button('connect').disabled=!can||(!f.connected&&(!f.pump.legs||Math.hypot(f.truck.x-f.pump.x,f.truck.z-f.pump.z)>110))||!!f.hose;
  button('prime').disabled=!can||!f.connected||!f.pump.legs||!!f.hose||!f.wet;button('drain').disabled=!can||!f.hose;
  const raisedUnavailable=foundation&&foundation.deckY>RAISED_BASE_MAX;
  button('frame').disabled=!can||!!f.aboard||!!raisedUnavailable||!draftMask||freeFrameBoards(foundation?.mask??draftMask)+(foundation?foundationBoardCount(foundation):0)>(service.constructionPackTrialStock.quantities.auxiliaryUnits.formwork??0)-(p.site.formworkPanelsInUse??0);button('unframe').disabled=!can||!!f.aboard;button('frame').title=f.aboard?'車を降りてから型枠を組んでください。':raisedUnavailable?'高所施工は土台の高さ16までです。':'';
  q('[data-design]>p').textContent=foundation?`仮設土台の上面の高さ ${foundation.deckY}。使用中の板 ${foundationBoardCount(foundation)}枚／残り ${foundationAvailableBoards(p,service.constructionPackTrialStock)-foundationBoardCount(foundation)}枚。`:`4×4マスで形を選びます。必要な型枠 ${freeFrameBoards(draftMask)}枚／所持 ${service.constructionPackTrialStock.quantities.auxiliaryUnits.formwork??0}枚。空けたマスには流れません。`;
  q('[data-build-help]').textContent=!foundation&&f.stage==='complete'?'同じ高さの土台を設置し、メニューの「作品を移動・保管」で位置を合わせると、保管作品を復元できます。':foundation&&f.stage==='complete'?'メニューの「作品を移動・保管」で土台上の作品を移動・回転できます。土台の回収前には作品を保管してください。':foundation?'「つくる」モードから、この土台の上に施工できます。片付ける場合は「仮設土台を回収する」を押し、内容を確認して実行してください。':'選び終えたら「現場へ戻る」を押し、施工ボタンを押してください。';
  button('mix').textContent=f.mixer.pending?`練っています・あと${Math.ceil((5000-f.mixer.pending.elapsedMs)/1000)}秒`:'生コンを練る（5秒）';
  button('supply').disabled=!can||availableMixCells(p.mixer)<amount||freeTruckLoad(f)+amount>8;
  if(groundPreview&&f.stage!=='design'){groundPreview=false;view.setFoundationPreview(null);}q('[data-ui=ground]').hidden=f.stage!=='design';if(!busy)view.setDraft(f.stage==='design'?{mask:draftMask,height:draftHeight}:null);
  workEditor.refresh(can&&!view.onAccess,sheet==='works'||['FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(confirm?.type));
  button('load').title=f.aboard?'車を降りるとバケツに汲めます。':f.bucket>0?'バケツに生コンが入っています。先に注ぐか、車へ戻してください。':f.wet<4?'まずミキサー車で生コンを1杯以上用意してください。':'';
  button('mix').title=f.aboard!=='truck'?'ミキサー車に乗って操作します。':f.mixer.pending?'練り終わるまでお待ちください。':'';
  button('legs').title=f.aboard!=='pump'?'ポンプ車に乗って操作します。':'';
  // Explain the same terrain/contact guard before asking the player to press.
  // Only inspect the visible work action while idle; movement still has its own
  // full preflight and commit checks, including any change of the ground.
  if(can&&mode==='vehicle'&&f.aboard){const id=f.aboard==='pump'?'legs':'mix',a=id==='legs'?{type:'FREE_LEGS',deployed:!f.pump.legs}:{type:'FREE_MIX_START'};if(!button(id).disabled){const issue=view.vehicleProblem(a);if(issue){button(id).disabled=true;button(id).title=issue;}}}
  button('roller').title=!freeWorkMask(w)?'完成した作品を選ぶと塗れます。':f.aboard?'車を降りてからローラーを使ってください。':'';
  if(button('frame').disabled&&can&&!button('frame').title)button('frame').title=!draftMask?'「形と注ぎ先」で、つくるマスを選んでください。':'型枠の板が足りません。建材受取所で板を受け取ってください。';
  button('next').title=button('next').disabled&&can?'型枠・土台・作業台を片付けてから場所を変えられます。':'';
  refreshChrome(f);
  if(projectHistoryStatus(p).full){for(const b of panel.querySelectorAll('[data-free]'))if(!historyActionAllowed(b.dataset.free,confirm))b.disabled=true;for(const b of q('[data-brush]').children)b.disabled=true;workEditor.refresh(false,sheet==='works');}
  button('export').disabled=busy||service.busy||service.blocked;
 }
 function clearBrush(){const id=paintPointer;paintPointer=null;stroke.clear();const b=q('[data-brush]');if(id!=null&&b.hasPointerCapture(id))b.releasePointerCapture(id);for(const node of b.children)node.setAttribute('aria-pressed','false');}
 function selectMode(next){if(busy||confirm||paused||service.blocked||!FREE_PLAY_MODES.includes(next))return;clearFoot();clearBrush();mode=next;sheet=null;refresh();}
 function setSheet(next){if(busy||confirm)return;clearFoot();clearBrush();if(next){restoreFocus=document.activeElement;sheet=next;refresh();q('[data-ui="close"]').focus();}else{sheet=null;refresh();if(restoreFocus?.isConnected&&restoreFocus.offsetWidth)restoreFocus.focus();else q(`[data-mode="${mode}"]`).focus();}}
 function refreshChrome(f){
  panel.dataset.busy=String(busy||view.busy);
  const watching=workWatching&&busy&&!paused&&!sheet&&!confirm&&!service.blocked;panel.dataset.watching=String(watching);const hose=hoseFeedback.display,showHose=!!hose&&!sheet&&!confirm&&(watching||mode==='vehicle');q('[data-work-watch]').hidden=!watching&&!showHose;q('[data-work-description]').hidden=showHose;q('[data-hose-meter]').hidden=!showHose;if(showHose){q('[data-hose-meter]').dataset.status=hose.status;writeText('[data-hose-title]',hose.title);writeText('[data-hose-percent]',hose.percent+'%');q('[data-hose-progress]').value=hose.progress;writeText('[data-hose-amount]',hose.amountText);writeText('[data-hose-stock]',hose.stockText);}writeText('[data-work-phase]',view.phase||(service.busy?'作業を保存しています。':'作業の準備をしています。'));
  const allowed=new Set(freePlayActions(f,mode));if(mode==='move'&&project().foundation||mode==='paint'&&view.onAccess)allowed.add('access');if(mode==='build'&&project().foundation&&f.stage==='framed'&&!f.fill.some(Boolean))allowed.add('unframe');for(const b of q('.free-primary-actions').querySelectorAll('[data-free]'))b.hidden=!allowed.has(b.dataset.free);
  for(const b of panel.querySelectorAll('[data-mode]')){b.disabled=busy||!!confirm||paused||service.blocked;b.setAttribute('aria-selected',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode?0:-1;}
  const modal=!!sheet||!!confirm;for(const el of panel.querySelectorAll('[data-hud]'))el.inert=modal;
  panel.dataset.playMode=mode;q('#free-mode-controls').setAttribute('aria-labelledby','free-mode-'+mode);
  const settings=q('[data-ui="settings"]');settings.hidden=mode==='move';settings.disabled=busy||paused||service.blocked||!!confirm;settings.textContent=({build:'形と注ぎ先',vehicle:'材料とホース',paint:'色・塗る場所'})[mode]??'';
  q('[data-build-progress]').hidden=mode!=='build';
  const buildHint=({design:project().foundation?'土台の上に型枠を組みます。':'「形と注ぎ先」で好きな形を選びます。',framed:'注ぐマスを選び、生コンを流し込みます。',wet:'好きな高さまで注ぎ、コテでならします。',finished:'形がよければ、生コンを固めましょう。',curing:'固まるまであと'+Math.max(0,Math.ceil((30000-f.elapsedMs)/1000))+'秒。',cured:'型枠を外すと作品の完成です。',complete:'完成！「塗る」で色をつけられます。'})[f.stage];
  writeText('[data-mode-note]',mode==='move'?(view.onAccess?'左パッド／WASDで土台の上を歩けます。':f.aboard?'移動は左パッド／WASD。スマホは右の加速、PCは2度押し。':'移動は左パッド／WASD。スマホは右のダッシュ、PCは2度押し。'):mode==='build'?buildHint:mode==='vehicle'?(f.aboard==='truck'?'原料を積み、生コンを練ります。':f.aboard==='pump'?'支持脚を出して、ホースで生コンを送ります。':'バケツに汲むか、車に乗って作業します。'):(f.completed.length?'「色・塗る場所」で選んでから塗ります。':'作品が完成すると、色を塗れるようになります。'));
  const blockedAction=[...q('.free-primary-actions').querySelectorAll('[data-free]')].find(b=>!b.hidden&&b.disabled&&b.title);
  const hint=paused?'一時停止中です。メニューから再開できます。':service.blocked?'保存を確認しています。メニューから保存を再確認してください。':!busy&&blockedAction?blockedAction.title:'';
  writeText('[data-pour-reason]',hint);q('[data-pour-reason]').hidden=!hint;
  for(const b of q('.free-primary-actions').querySelectorAll('[data-free]')){if(!b.hidden&&b.disabled&&b.title)b.setAttribute('aria-describedby','free-action-help');else b.removeAttribute('aria-describedby');}
  button('stop').hidden=!view.busy;button('stop').disabled=!view.busy;
  q('[data-ui="menu"]').disabled=busy||!!confirm;q('[data-ui="menu"]').setAttribute('aria-expanded',String(sheet==='menu'));q('[data-ui="close"]').disabled=busy;
  button('camera').disabled=busy||!!confirm;button('camera').setAttribute('aria-expanded',String(sheet==='camera'));button('camera').title='視点：'+CONCRETE_CAMERA_MODES[view.cameraMode];for(const b of panel.querySelectorAll('[data-camera-mode]'))b.setAttribute('aria-pressed',String(b.dataset.cameraMode===view.cameraMode));
  q('[data-overlay]').hidden=!sheet||!!confirm;
  const titles={camera:'視点を選ぶ',works:'作品の配置・保管',menu:'建築メニュー',build:'形と注ぎ先',vehicle:'材料とホース',paint:'色・塗る場所'};q('[data-sheet-title]').textContent=titles[sheet]??'';q('[data-play-sheet]').setAttribute('aria-label',titles[sheet]??'施工メニュー');
  for(const el of panel.querySelectorAll('[data-sheet-content]'))el.hidden=el.dataset.sheetContent!==sheet;
 }
 function dismissConfirmation(){const edit=['FREE_SET_WORK_PARTS','FREE_MOVE_WORK','FREE_TRANSFORM_WORK',SUPPORTED_WORK_MOVE].includes(confirm?.type);confirm=null;if(edit)setSheet('works');else{refresh();q(`[data-mode="${mode}"]`).focus();}}
 function handleMenuKey(e){
  if(e.key==='Escape'){e.preventDefault();if(busy)return true;if(confirm)dismissConfirmation();else setSheet(sheet?null:'menu');return true;}
  if(e.key==='Tab'&&(sheet||confirm)){const modal=q(confirm?'[data-confirm]':'[data-play-sheet]'),items=[...modal.querySelectorAll('button,select,input,summary,[tabindex="0"]')].filter(el=>!el.disabled&&el.offsetWidth),i=items.indexOf(document.activeElement);if(items.length&&(i<0||(!e.shiftKey&&i===items.length-1)||(e.shiftKey&&i===0))){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}return true;}
  if(e.target.closest?.('[data-mode]')&&freeModeNavigationKey(e)){e.preventDefault();selectMode(e.key==='Home'?'move':e.key==='End'?'paint':nextFreePlayMode(mode,e.key==='ArrowRight'?1:-1));q(`[data-mode="${mode}"]`).focus();return true;}
  return !!sheet||!!confirm;
 }
 function refreshStencil(can,w){try{const id=q('[data-stencil]').value,turn=Number(q('[data-stencil-turn]').value),pixels=stencilPixels(id,turn),color=q('[data-color]').value;for(const tile of q('[data-stencil-preview]').children){tile.dataset.filled=String(pixels.includes(Number(tile.dataset.stencilPixel)));tile.dataset.color=color;}const guide=stencilGuide(id,turn);writeText('[data-stencil-guide]',guide);q('[data-stencil-preview]').setAttribute('aria-label',guide);if(!w){writeText('[data-stencil-cost]','完成した作品を選ぶと塗れます。');return;}const a=paintAction('brush',pixels),cost=freePaintCost(w,a.cell,a.face,pixels,a.color);writeText('[data-stencil-cost]',cost.changed.length?'ペンキ '+cost.cost+'面分を使います。':'同じ色です。ペンキは使いません。');q('[data-ui=stencil-paint]').title='';}catch(e){writeText('[data-stencil-cost]',e.message);}}
 for(const s of ['[data-stencil]','[data-stencil-turn]'])q(s).onchange=()=>refresh();q('[data-ui=stencil-paint]').onclick=()=>{try{paintRequest('brush',stencilPixels(q('[data-stencil]').value,Number(q('[data-stencil-turn]').value)),'stencil');}catch(e){note=e.message;refresh();}};
 q('[data-ui=ground]').onclick=()=>{if(!ready()||project().foundation)return;inspectDraft();setSheet(null);};
 const workEditor=createFreeWorkEditor({panel,getProject:project,problem:workEditProblem,moveProblem:workMoveProblem,ask,preview:value=>view.setWorkPreview(value)});
 q('[data-ui="works"]').onclick=()=>{workEditor.open();setSheet('works');};
 q('[data-ui="menu"]').onclick=()=>setSheet('menu');q('[data-ui="close"]').onclick=()=>setSheet(null);q('[data-ui="settings"]').onclick=()=>setSheet(mode);
 for(const b of panel.querySelectorAll('[data-camera-mode]'))b.onclick=()=>{view.setCameraMode(b.dataset.cameraMode);note=CONCRETE_CAMERA_MODES[view.cameraMode]+'に切り替えました。';setSheet(null);};
 q('[data-ui="camera-reset"]').onclick=()=>{view.resetCamera();setSheet(null);};
 for(const b of panel.querySelectorAll('[data-mode]'))b.onclick=()=>{if(suppressModeClick){suppressModeClick=false;return;}selectMode(b.dataset.mode);};
 const modeBar=q('.free-mode-tabs');modeBar.addEventListener('pointerdown',e=>{if(e.button!==0||busy||sheet||confirm)return;suppressModeClick=false;clearFoot();swipe={id:e.pointerId,x:e.clientX,y:e.clientY};});
 modeBar.addEventListener('pointerup',e=>{if(!swipe||swipe.id!==e.pointerId)return;const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;if(Math.abs(dx)>=35&&Math.abs(dx)>Math.abs(dy)*1.5){suppressModeClick=true;selectMode(nextFreePlayMode(mode,dx<0?1:-1));}});
 for(const event of ['pointercancel','pointerleave'])modeBar.addEventListener(event,()=>{swipe=null;});
 for(let i=0;i<16;i++){
  for(const name of ['shape','cells','brush']){const b=document.createElement('button');b.dataset.cell=String(i);b.textContent=String(i+1);b.setAttribute('aria-label',`${name==='brush'?'塗装':name==='shape'?'型枠':'注ぎ先'} ${i+1}`);q(`[data-${name}]`).append(b);
   if(name==='shape')b.onclick=()=>{if(!ready())return;draftMask^=1<<i;if(groundPreview)inspectDraft();refresh();};if(name==='cells')b.onclick=()=>{cell=i;view.select(i);refresh();};
   if(name==='brush')b.onclick=e=>{if(e.detail===0)paintRequest('brush',[i]);};
  }
  q('[data-paint-cell]').append(new Option(`マス ${i+1}`,String(i)));
 }
 const brush=q('[data-brush]');function addPaint(e){const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-brush] button');if(!b||!brush.contains(b))return;stroke.add(Number(b.dataset.cell));b.setAttribute('aria-pressed','true');}
 brush.addEventListener('pointerdown',e=>{if(!ready()||free().aboard||!free().completed.length)return;e.preventDefault();paintPointer=e.pointerId;stroke=new Set();brush.setPointerCapture(e.pointerId);addPaint(e);});
 brush.addEventListener('pointermove',e=>{if(e.pointerId===paintPointer)addPaint(e);});
 function finishStroke(e,cancel=false){if(e.pointerId!==paintPointer)return;paintPointer=null;const pixels=[...stroke];stroke.clear();for(const b of brush.children)b.setAttribute('aria-pressed','false');if(!cancel)paintRequest('brush',pixels);}
 brush.addEventListener('pointerup',e=>finishStroke(e));for(const event of ['pointercancel','lostpointercapture'])brush.addEventListener(event,e=>finishStroke(e,true));
 q('[data-height]').onchange=()=>{draftHeight=Number(q('[data-height]').value);if(groundPreview)inspectDraft();refresh();};q('[data-work]').onchange=refresh;q('[data-color]').onchange=refresh;for(const b of panel.querySelectorAll('[data-paint-color]'))b.onclick=()=>{if(!ready())return;q('[data-color]').value=b.dataset.paintColor;refresh();};
 const actions={evacuate:()=>{if(busy||service.blocked||confirm)return;try{const plan=view.evacuationPlan();ask('SAFE_RETURN',plan,free().aboard?'救助を呼び、車をその場に残して降り、安全な地面へ移動します。積み荷・配管・支持脚・作品・材料を保持し、降車を保存します。':'救助を呼び、確認済みの安全な地面へ移動します。今の作品と材料を保持します。')}catch(e){note=e.message;refresh();}},access:()=>useStairs(!view.onAccess),foundation:()=>{if(!ready())return;try{const a=foundationActionFromPlan(inspectDraft()),cost=foundationBoardCount(a);if(cost>foundationAvailableBoards(project(),service.constructionPackTrialStock))throw Error('土台の板が不足しています。形を小さくするか板を受け取ってください。');ask('FREE_FOUNDATION_BUILD',a,`選んだ場所に仮設土台を設置します。型枠の板 ${cost}枚を使用し、回収すると戻ります。`);}catch(e){note=e.message;refresh();}},unfoundation:()=>{if(!ready())return;ask('FREE_FOUNDATION_REMOVE',{},`土台を回収して型枠の板 ${foundationBoardCount(project().foundation)}枚を戻します。上に人・車両・資材がある場合は回収できません。`);},unframe:()=>{if(ready())ask('FREE_UNFRAME',{},'生コンが空の型枠を回収します。土台は残り、型枠の板が戻ります。');},frame:()=>{if(!ready())return;if(project().foundation){ask(RAISED_FRAME_ACTION,{height:draftHeight},`高さ${project().foundation.deckY}の土台に、高さ${draftHeight}の型枠を組みます。板を運び、階段で足場へ上がって固定し、地上へ戻ります。`);return;}const ground=inspectDraft();if(!ground.ready){sheet=null;refresh();return;}ask('FREE_DESIGN',{mask:draftMask,height:draftHeight},`選んだ${Array.from({length:16},(_,i)=>!!(draftMask&(1<<i))).filter(Boolean).length}マス、高さ${draftHeight}で型枠を組みます。`);},
  export:()=>{if(busy||service.busy||service.blocked)return;clearFoot();const text=service.export(),url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-construction-record-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);note='作品・材料・車両を含む作業の控えを保存しました。';refresh();},
  pause:()=>{clearFoot();paused=!paused;sheet=paused?'menu':null;refresh();if(!paused)q(`[data-mode="${mode}"]`).focus();},leave:()=>leave(),save:savePlatform,camera:()=>setSheet('camera'),stop:()=>{clearFoot();view.cancel();},
  supply:()=>run('FREE_SUPPLY',{cells:Number(q('[data-amount]').value)}),mix:()=>run('FREE_MIX_START',{cells:Number(q('[data-amount]').value)}),load:()=>run('FREE_BUCKET_LOAD'),return:()=>run('FREE_BUCKET_RETURN'),
  truck:()=>run('FREE_BOARD',{vehicle:'truck'}),pump:()=>run('FREE_BOARD',{vehicle:'pump'}),dismount:()=>run('FREE_LEAVE'),
  legs:()=>run('FREE_LEGS',{deployed:!free().pump.legs}),connect:()=>run('FREE_CONNECT',{connected:!free().connected}),prime:()=>run('FREE_PRIME'),drain:()=>run('FREE_DRAIN'),
  pour:()=>run('FREE_POUR',{source:free().aboard??'bucket',cell}),finish:()=>ask('FREE_FINISH',{},'未打設の穴と途中の高さを保ち、今ある生コンを仕上げます。'),cure:()=>run('FREE_CURE'),demold:()=>run('FREE_DEMOLD'),
  recover:()=>ask('FREE_RECOVER',{},'まだ固めていない生コンを車のタンクへ回収します。'),next:()=>{const type=free().stage==='design'?'FREE_CHANGE_EMPTY_SITE':'FREE_NEXT',pos=position(type);if(!pos){note='車両と両足を支える空き区画が見つかりません。周りの地面や障害物を確認してください。';refresh();return;}ask(type,pos,type==='FREE_NEXT'?'作品を残し、車両と足元を確認した次の空き区画へ移動します。':'まだ施工していない場所を選び直します。車・材料・保管した作品を保持します。');},
  roller:()=>paintRequest('roller',Array.from({length:16},(_,i)=>i)),undo:()=>ask('FREE_UNDO_PAINT',{},'直前の塗装を取り消し、その塗料を戻します。'),
  dismiss:dismissConfirmation,confirm:async()=>{const c=confirm;confirm=null;if(c?.type==='CLEAR_PLATFORM'){try{clearFoot();busy=true;pendingPlatformClear=true;refresh();await service.saveConstructionWorkPlatform(null,project().revision,snapshot());view.clearWorkPlatform();pendingPlatformClear=false;sheet=null;note='作業台を片付けて保存しました。作品と材料はそのままです。';}catch(e){note=e.message;if(!service.blocked)pendingPlatformClear=false;}finally{busy=false;refresh();}return;}if(c?.type==='SAFE_RETURN'){if(c.extra.vehicle){paused=false;await run('FREE_LEAVE',{},true,c.extra);return;}try{clearFoot();view.evacuate(c.extra);sheet=null;paused=false;note='安全な地面へ戻りました。作品と材料は変更していません。';refresh();q(`[data-mode="${mode}"]`).focus();}catch(e){note=e.message;refresh();}return;}if(c&&await run(c.type,c.extra,true,null,c.handTool)&&c.type==='FREE_DESIGN'&&ready()&&!document.hidden)await run('FREE_FRAME');},retry:async()=>{try{await service.retry();if(pendingPlatformClear&&!service.constructionWorkPlatform){view.clearWorkPlatform();pendingPlatformClear=false;}hoseFeedback.reconcile(free(),lastProjectOperation(project())?.operationId);note='保存結果を確認しました。再開してください。';view.sync(project());refresh();}catch(e){onError(e);}}
 };
 q('[data-ui=clear-platform]').onclick=()=>ask('CLEAR_PLATFORM',{},'作業台と階段を片付けます。作品・型枠・材料はそのままです。次の作業で必要な足場を用意します。');
 for(const b of panel.querySelectorAll('[data-free]'))b.onclick=()=>Promise.resolve(actions[b.dataset.free]()).catch(e=>{note=e.message;refresh();});
 function move(dx,dz,dt=.05){
  if(!movementReady())return;
  const world=view.travelVector(dx,dz);dx=world.x;dz=world.z;
  const strength=Math.min(1,Math.hypot(dx,dz));if(!strength)return;
  if(!free().aboard){view.walkFoot(dx,dz,dt*strength,travelBoost.fast);return;}if(projectHistoryStatus(project()).full){clearFoot();return;}
  const name=free().aboard,v=free()[name],len=Math.hypot(dx,dz);if(!len)return;
  const step=8*strength,x=Math.round(v.x+dx/len*step),z=Math.round(v.z+dz/len*step);if(x===v.x&&z===v.z)return;void run('FREE_MOVE',{vehicle:name,x,z,heading:vehicleTravelHeading(v,dx,dz)});
 }
 open.onclick=()=>void enter().catch(e=>{note=e.message;open.textContent='入場できません：'+note;refresh();});
 function suspend(){interruption++;clearFoot();if(!active)return;paused=true;confirm=null;sheet='menu';paintPointer=null;stroke.clear();view.cancel();refresh();}
 window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
 function contactGeometry(){return{floors:[],walls:[...concreteVehicleGeometry(free(),supportHeightAt).walls,...pipeContactGeometry(free(),supportHeightAt).walls,...foundationGeometry(project()).walls]};}
 return{contactGeometry,overlapsVehicle:(p,size)=>contactGeometry().walls.some(w=>overlaps({x:w.x,z:w.z,hx:w.localHalfX,hz:w.localHalfZ,heading:w.rotation},{x:p[0],z:p[2],hx:size[0]/2,hz:size[2]/2,heading:0})),get active(){return active;},leave,save:savePlatform,look:(...args)=>{if(!sheet&&!confirm&&!paused)view.look(...args);},handleKey:e=>{if(e.type==='keyup'){travelBoost.key(e);return;}if(handleMenuKey(e))return;if(travelBoost.key(e)){e.preventDefault();const v=travelBoost.vector;move(v.x,v.z);refresh();}},
  install(options){blockedAt=options.blockedAt;const travelBlocked=options.travelBlockedAt??blockedAt;view.setBlockedAt(travelBlocked);supportHeightAt=options.supportHeightAt??(()=>null);placementHeightAt=options.placementHeightAt??supportHeightAt;view.setSupportHeightAt(supportHeightAt);view.setToolEnvironment({heightAt:toolHeightAt,blockedAt:(...args)=>supportedToolBlocked(project(),travelBlocked)(...args)});view.setFoundationEnvironment(()=>({heightAt:placementHeightAt,blockedAt}));view.root.visible=state.map==='construction';view.sync(project());const f=free();if(state.map==='construction'&&f?.location){options.collider(f.location.x,f.location.z,[296,296],0,'concrete-free-worksite',0,{buildingId:'concrete-free-worksite'});for(const w of contactGeometry().walls)options.collider(w.x,w.z,[w.localHalfX*2,w.localHalfZ*2],w.rotation,w.id,0,{...w,buildingId:'construction-concrete'});}},
  update(dt){dashControl.sync();movePad.sync();if(active&&!paused&&!document.hidden){
   progress.sync(free(),service.blocked?0:dt);
   if(!busy&&!service.busy&&!service.blocked&&!confirm&&!projectHistoryStatus(project()).full){const next=progress.next(free());if(next)void run(next.type,{elapsedMs:next.elapsedMs},false);}
   const v=travelBoost.vector;if(movementReady()){if(v.x||v.z)move(v.x,v.z,dt);else view.stopWalking();}view.tick(dt);if(HOSE_TRANSFER_ACTIONS.has(view.hoseTransferType))hoseFeedback.advance(view.hoseTransferProgress);
  }lastUI+=dt;if(lastUI>.15){lastUI=0;view.sync(project());refresh();}return active;}
 };
}
