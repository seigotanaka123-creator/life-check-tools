import {setConstructionNoticeTone} from './imasora-construction-vehicle-play-view.js?v=121gg';
import {EX} from './imasora-construction-excavator.js?v=120ov';
import {createParkingReturn,createDumpArrivalMarkers} from './imasora-construction-parking-view.mjs?v=121gg';
import{createVehicleLoadGuard}from'./imasora-construction-structure-performance.mjs?v=120pv';
import{gardenEarthReserved}from'./imasora-construction-garden.mjs?v=120ps';
import {unopenedGround,hasQuarryRange,hasContinuousQuarry,hasSummitFace} from './imasora-construction-field-earth.mjs?v=120ov';
import {transportSiteHoles} from './imasora-construction-transport-site.mjs?v=120pv';
import {nativeQuarryWorldHeight} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {quarryDropPose} from './imasora-construction-transport-drive.mjs?v=121gf';
import {CONSTRUCTION_STEERING_FACTOR} from './imasora-construction-shared-field.mjs?v=120ey';
import {transportSceneActionAllowed,transportSceneScoopTargetAllowed} from './imasora-construction-transport-scene-contact.mjs?v=121ea';
import {clusteredStorageBin,nativeStorageBin,transportFences} from './imasora-construction-transport-field.mjs?v=120ov';
import {shovelMachines,shovelDumpObstacles,shovelSegmentHits,shovelNearbySoil} from './imasora-construction-shovel-work.mjs?v=120pv';
import {createThreeJump,bindJumpButton,SKY_RUN_SPEED,jumpClearance,createTravelAcceleration} from './imasora-construction-locomotion.mjs?v=121d1';
import {constructionVehicleLock} from './imasora-construction-shared-field.mjs?v=120ey';
import {EXCAVATOR_KEYS,rainWorksCutZones,rainExcavatorRoute,rainExcavatorPoint,rainExcavatorParked,rainConstructionTrialLimit,rainExcavatorTrialCut,rainDumpArrivalRoute,rainDumpHaulRoute,rainDumpWorldPoint,rainDumpRouteStart,rainDumpRoutePosition,rainDumpParked,rainDumpOutsideGarage,rainDumpGuidancePoints,CONSTRUCTION_MISSION_INTRO_MS,constructionMissionIntroText,advanceConstructionMissionIntro,showConstructionIntroCue} from './imasora-construction-guide-data.mjs?v=121id';
import {openConstructionGuide,constructionOverlayOpen} from './imasora-construction-overlays.mjs?v=120gm';
import {createWorldExcavationModel,disposeWorldExcavationModel,EXCAVATION_FENCES} from './imasora-construction-world-excavation-model.js?v=121cy';
import {createShovelWorkView} from './imasora-construction-shovel-work-view.mjs?v=121fx';
import {WorldTransportWorkSession} from './imasora-construction-transport-work-session.mjs?v=121e8';
import {TransportPlaySession,transportWorkMoving,deferShortScoopAutosave} from './imasora-construction-transport-play-session.mjs?v=121ci';
import {transportSiteOrigin,transportWorldPose,transportSiteOpening,transportSiteReserved,transportGroundHeightReader,transportGroundUpperBound,createTransportVehicleProbe,createTransportWalkingColliders} from './imasora-construction-transport-site.mjs?v=121gz';
import * as m from './imasora-construction-fragment-scoop.mjs?v=120pv';
import {bucketPlanPose,linkedExcavatorSeat} from './imasora-construction-bucket-dump.mjs?v=120pv';
import {dumpUnloadReady,dumpUnloadVisual,dumpStorageContact} from './imasora-construction-dump-work.mjs?v=121gf';
import {shovelJobReady,shovelDigTargets,shovelLoadTarget,shovelDropTarget,shovelStorageTarget,shovelStorageContact,shovelVisibleSource,shovelToolPose,shovelDumpPoint} from './imasora-construction-shovel-work.mjs?v=120pv';
import {transportWorkProgress} from './imasora-construction-transport-play-progress.mjs?v=120pv';
import {storageDisplay,storageAmountText} from './imasora-construction-storage-display.mjs?v=120pv';
import {soilTransportTotals,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs?v=120pv';
import {createMonsterTravelInput,viewRelativeTravel} from './imasora-construction-concrete/monster-travel-input.mjs?v=121cw';
import {travelDirection} from './imasora-construction-travel-input.mjs?v=121cw';
import {constructionMovePadTemplate,createConstructionMovePad} from './imasora-construction-concrete/move-pad.mjs';
import {holdDashButtonTemplate,createHeldDashButton} from './imasora-hold-dash.mjs?v=120od';
import {nativeDumpSupport} from './imasora-construction-native-dump-support.mjs?v=120pv';
import {createTransportRestoreView} from './imasora-construction-transport-restore-view.mjs?v=120pv';
import {placementTap,travelHeading} from './imasora-construction-hand-placement.mjs?v=120pv';
import {planHandArea,handAreaEnvironment,planHandEarth} from './imasora-construction-hand-area.mjs?v=120pv';
import {HAND_EARTH_SHAPES,SOIL_LIMITS} from './imasora-construction-soil-transport.mjs?v=120pv';
import {transportDoorSpots} from './imasora-construction-transport-door.mjs?v=120pv';
import {createConstructionAutoSaveGate,constructionLifecycleSave} from './imasora-construction-autosave-key.mjs?v=121ed';

// A held key owns its visual until release; availability is a separate state.
export function constructionTravelDirection(code,mode){return ['KeyX','x'].includes(code)&&['excavating','driving'].includes(mode)?'south':travelDirection(code);}
const SCOOP_APPROACH_RATE=9;
const SCOOP_WORK_RATE=3;
const scoopApproachRate=plan=>plan.kind?.startsWith('basin')?4.5:SCOOP_APPROACH_RATE;
const driveDirections=[['forward','前進'],['back','後進'],['secondary','後進']];
const transportDirections={
 foot:[['forward','前'],['back','後ろ'],['left','左'],['right','右']],
 driving:[...driveDirections,['left','左折'],['right','右折']],
 excavating:driveDirections,
};
const excavatorArmControls=[
 ['boomRaise','ブーム上げ','boom',1],['boomLower','ブーム下げ','boom',-1],
 ['stickExtend','アーム伸ばす','stick',1],['stickRetract','アーム折る','stick',-1],
].map(([id,...control])=>[id,'Key'+EXCAVATOR_KEYS[id],...control]);
const excavatorActions={
 ['Key'+EXCAVATOR_KEYS.scoop]:'scoop',
 ['Key'+EXCAVATOR_KEYS.pour]:'pour',
 ['Key'+EXCAVATOR_KEYS.pourDump]:'pourDump',
 KeyQ:'leaveExc',
};
export function constructionPressedActions(keys,mode){
 const actions=new Set(),has=(...codes)=>codes.some(code=>keys.has(code));
 if(mode==='excavating'){
  for(const code of keys){const action=excavatorActions[code];if(action&&action!=='leaveExc')actions.add(action);}
  if(has('KeyA','ArrowLeft'))actions.add('steerLeft');
  if(has('KeyD','ArrowRight'))actions.add('steerRight');
  if(has('KeyJ'))actions.add('left');
  if(has('KeyL'))actions.add('right');
  for(const [id,code] of excavatorArmControls)if(has(code))actions.add(id);
 }else if(mode==='driving'){
  if(has('KeyH'))actions.add('storeDump');
 }else if(mode==='foot'){
  if(has('KeyG'))actions.add('earthPlace');
  if(has('KeyR'))actions.add('earthRemove');
 }
 if(has('KeyK'))actions.add('dash');
 if(mode==='foot'&&has('Space','KeyE','KeyB','KeyJ'))actions.add('jump');
 return actions;
}

export function constructionCameraBaseYaw(work){const f=work.frame;return work.mode==='excavating'?(f.machineVehicle?.heading??f.player.heading-(f.machineArm?.slew??0)):f.player.heading;}

export function createWorldTransportPlayController({service,session,state,scene,camera,character,shadow,canvas,snapshot,clearInput,readout,onExit=()=>{},onFleet=null,onBlockedSave=null,onSaveRecovered=()=>{},contactRevision=()=>undefined,chapterHint=()=>'',chapterTrialKind=()=>null,verification=false,resumeAtSavedPose=true,progressiveQuarry=false}){
 const loadGuard=createVehicleLoadGuard(()=>service.ledger?.world);let vehicleLoadNotice='';
 session??=new WorldTransportWorkSession({service,snapshot});
 if(!session.state)throw Error('保存した現場を読み取ってから開いてください。');
 storageDisplay(session.state.frame.soil,gardenEarthReserved(service.ledger.world.constructionHighBuild)); // Check before acquiring input or scene ownership.
 let root=null,view=null,input=null,pad=null,dash=null,targets={},scanKey='',previewKey='',previewBoxes=null,previewPlan=null,previewBusy=false,planning=false,ending=false,failed=false,acc=0,held=new Map(),blocked=false,verifyRoute=null,verifyPause=false,storageFocus=false,initialLanding=resumeAtSavedPose,dropSelection=null,tapStart=null,dropApproach=null,dropPlanning=false,dropToken=0;
 let excavatorDriving=true,basinDig=false,quietBoarding=false;let disposed=false,pendingPaint=null,saveFailed=false,saveNoticeShown=false;const jump=createThreeJump();
 let handEarthMode=false,handEarthShape='step',handEarthPoint=null,handEarthPreview=null,lastHandEarthEdit=-Infinity;
 const travelAcceleration=createTravelAcceleration();
 const feedbackKeys=new Set(),feedbackPointers=new Map(),feedbackIds=['steerLeft','steerRight','left','right','scoop','pour','pourDump','storeDump','dash','jump','earthPlace','earthRemove',...excavatorArmControls.map(([id])=>id)];
 let lastGuideChange=-Infinity;
 let previewSoil=null,previewDecks=null,previewScene=null,readSceneContact=null,previewRetryAt=0,previewRequest=0,previewAbort=null,savingApproach=null;
 const play=new TransportPlaySession(session,{clearInput:reset,savedLanding:resumeAtSavedPose}),host=canvas.parentElement;canvas.tabIndex=0;let keyCount=0,lastKey=null;
 const style=document.createElement('style');style.textContent=`
 .world-excavation-viewport-operating,.world-excavation-viewport-operating canvas{touch-action:none;-webkit-user-select:none;-webkit-touch-callout:none}
 .world-transport-playing #viewport{display:block!important;grid-template-columns:none!important;grid-template-rows:none!important}.world-transport-playing #worldCanvas{width:100%!important;height:100%!important}
 .transport-play{--transport-bottom:max(12px,env(safe-area-inset-bottom));--transport-right:max(12px,env(safe-area-inset-right));position:absolute;inset:0;pointer-events:none;z-index:36;color:#fff;font-family:inherit;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
 .world-excavation-viewport-operating #touchPad,.world-excavation-viewport-operating #cameraDistanceButton,.world-excavation-viewport-operating #emergencyEscapeButton,.world-excavation-viewport-operating #buildMenuButton{display:none!important}
 .world-transport-playing #walkDashButton{display:none!important}
 .high-live-active .transport-play{display:none!important;pointer-events:none!important}
 .transport-play button[data-work-blocked=true]:not([data-key-held=true]){opacity:.72}
 .transport-play button{pointer-events:auto;min-height:44px;border:1px solid #708f93;border-radius:12px;padding:9px 13px;background:#213d49;color:#fff;font-weight:700;font-size:14px;touch-action:none;-webkit-user-select:none;-webkit-touch-callout:none}
 .transport-play button.primary{background:#ffe398;color:#26342e;border-color:#ffe398}.transport-play button:disabled{opacity:.48}.transport-play [hidden]{display:none!important}
 /* Preview readiness must not imitate a key press while the vehicle turns. */
 body.world-player-game .transport-play .transport-actions button[data-id=scoop]:not(:disabled){background:#cceede!important;color:#244d47!important;border-color:#73ae98!important;box-shadow:0 3px 0 #91b9a9!important;opacity:1!important;transform:none!important;transition:none!important}
 body.world-player-game .transport-play :is(.transport-actions,.transport-dash,.transport-exc-aux) button[data-key-held=true]:not(:disabled){background:#a5d8c0!important;color:#173c32!important;border-color:#659b83!important;box-shadow:inset 0 2px 3px #527e6b88!important;transform:translateY(2px)!important;opacity:1!important;transition:none!important}
 .transport-header{position:absolute;top:12px;right:12px;left:12px;display:grid;justify-items:end;gap:8px}.transport-top{display:flex;flex-wrap:wrap;justify-content:flex-end;max-width:100%;gap:8px}.transport-note{max-width:min(310px,88%);padding:9px 12px;background:#17313dde;border-radius:12px;font-size:13px}.transport-note p{font-size:15px;line-height:1.42;margin:5px 0}
 .transport-actions{position:absolute;right:var(--transport-right);bottom:var(--transport-bottom);display:flex;flex-wrap:wrap;gap:7px;max-width:min(350px,calc(100% - 32px));justify-content:flex-end}.transport-actions>div{display:flex;flex-wrap:wrap;gap:7px;justify-content:flex-end}
 .transport-play [data-id=excActions]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.transport-play [data-id=excActions]>button{min-width:0}
 @media(max-width:740px){.transport-header{top:52px}}
 .transport-pad{position:absolute;left:max(16px,env(safe-area-inset-left));bottom:16px;pointer-events:auto}
 .transport-play .construction-move-pad{width:116px;height:116px;border:2px solid #accbc8;border-radius:50%;background:#1c3e4ccc;position:relative;touch-action:none}.transport-play .construction-move-stick{position:absolute;left:50%;top:50%;width:49px;height:49px;border-radius:50%;background:#e9c983;transform:translate(-50%,-50%)}
 .transport-thumbs>.construction-jump-button{border-radius:50%;background:#d9f0ff;color:#27546d;padding:6px}.transport-dash{position:absolute;right:var(--transport-right);bottom:var(--transport-bottom);width:76px;height:76px}.transport-play .transport-dash>.hold-dash-button{inset:0;width:76px;height:76px;min-width:76px;padding:6px;border-radius:50%}.transport-sheet{pointer-events:auto;color:#e9f3f4;background:#17313d;border:1px solid #86a29f;border-radius:18px;max-width:min(380px,calc(100% - 32px));max-height:80dvh;overflow:auto;padding:20px}.storage-section{border:1px solid #86a29f;border-radius:12px;padding:12px;margin:12px 0}.storage-section h3{margin:0 0 8px}.storage-section button{display:block;width:calc(100% - 8px)}.transport-sheet::backdrop{background:#00131b77}.transport-sheet button{margin:4px}.transport-sheet pre{white-space:pre-wrap;font-size:11px;max-height:26vh;overflow:auto;user-select:text;-webkit-user-select:text}
 .transport-recovery{width:min(380px,calc(100vw - 64px));box-sizing:border-box}.transport-recovery[open]{display:flex;flex-direction:column;overflow:hidden}.transport-recovery-content{min-height:0;overflow:auto;overscroll-behavior:contain}.transport-recovery .transport-return{flex-shrink:0}.transport-recovery h2{margin:0 0 12px;font-size:22px}.transport-recovery button{width:100%;box-sizing:border-box;margin:5px 0;min-height:48px}.transport-history{display:grid;grid-template-columns:1fr 1fr;gap:7px}.transport-history button:first-child,.transport-history button:nth-child(2){grid-column:1/-1}.transport-history button:nth-child(2){background:#ffe398;color:#26342e;border-color:#ffe398}.transport-recovery .transport-undo{border-color:#adc3eb;background:#25446a}.transport-recovery .transport-return{margin-top:16px;background:#36584c;border-color:#9fcbb6}.transport-record-name{padding:12px;background:#304b57;border-radius:12px;font-size:20px;font-weight:700}.transport-recovery small{display:block;color:#d0dedb}.transport-recovery details{margin:14px 0}.transport-recovery summary{min-height:36px}
 .transport-recovery label{display:block;margin:12px 0}.transport-recovery select,.transport-recovery input,.transport-recovery textarea{max-width:100%;width:100%;box-sizing:border-box;background:#f4f6f4;color:#17313d;border-radius:8px;padding:9px;font-size:14px}.transport-recovery textarea{touch-action:pan-y;user-select:text;-webkit-user-select:text}.transport-recovery table{width:100%;border-collapse:collapse;font-size:13px}.transport-recovery td,.transport-recovery th{padding:7px 3px;border-bottom:1px solid #647a81;text-align:right}.transport-recovery th:first-child,.transport-recovery td:first-child{text-align:left}.transport-changed{color:#ffe398}.transport-download{display:block;box-sizing:border-box;min-height:44px;padding:12px;margin:8px 0;background:#ffe398;color:#17313d;border-radius:10px;text-align:center;text-decoration:none;font-weight:bold;pointer-events:auto}
 @media(pointer:fine){.transport-thumbs>.construction-jump-button{display:none}.transport-play .construction-move-pad{display:none}.transport-play .transport-dash{display:block}.transport-play .transport-actions{bottom:calc(var(--transport-bottom) + 88px)}}@media(pointer:coarse){.transport-play .transport-pad{bottom:var(--transport-bottom)}.transport-play:has(>.transport-dash:not([hidden])) .transport-actions{bottom:calc(var(--transport-bottom) + 128px)}}@media(max-width:520px){.transport-actions{max-width:min(220px,calc(100% - 32px))}.transport-note{max-width:270px;font-size:12px}.transport-actions button{font-size:12px;padding:8px 10px}}
 @media(pointer:coarse) and (max-height:500px){.transport-play .construction-move-pad{width:92px;height:92px}.transport-play:has(>.transport-dash:not([hidden])) .transport-actions{bottom:calc(var(--transport-bottom) + 104px);max-width:calc(100% - max(16px,env(safe-area-inset-left)) - 132px)}}
 @media(pointer:fine) and (max-width:520px) and (min-height:500px){.transport-play:not(.transport-on-foot) .transport-actions{bottom:calc(var(--transport-bottom) + 130px)}}

 /* Player-facing pause and save screens. */
 .transport-sheet{box-sizing:border-box;width:min(430px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);padding:20px;color:#234451;background:#fffbee;border:3px solid #fff;border-radius:26px;box-shadow:0 16px 50px #102f4c55;font-size:15px;line-height:1.55}
 .transport-sheet::backdrop{background:#204c6b5e;backdrop-filter:blur(3px)}
 .transport-sheet h2{font-size:24px;margin:0;color:#174d68;letter-spacing:.03em}.transport-sheet h3{font-size:19px;color:#174d68}
 .transport-menu-head{position:relative;padding:15px 18px 17px;margin:-20px -20px 16px;background:linear-gradient(145deg,#bceafb,#dcf7f4);border-radius:22px 22px 0 0;overflow:hidden}
 .transport-menu-head::after{content:'☀';position:absolute;right:16px;top:2px;color:#ffb52f;font-size:52px;line-height:1;transform:rotate(12deg)}
 .transport-menu-head p{margin:4px 0 0;font-size:13px;color:#28617a}.transport-menu-head .menu-kicker{display:block;font-size:11px;font-weight:800;letter-spacing:.16em;margin-bottom:4px;color:#337287}
 .transport-sheet [role=status]:empty{display:none}.transport-sheet [role=status]{background:#e7f5e6;border-radius:12px;padding:10px 12px;font-size:13px;color:#265739;margin:10px 0}
 .transport-sheet button{position:relative;width:100%;box-sizing:border-box;min-height:52px;border:2px solid #bfdce6;background:#edf7fc;color:#234b63;border-radius:15px;margin:5px 0;padding:12px 14px;box-shadow:0 3px 0 #c2dce5;text-align:left;font-size:16px;line-height:1.35;font-family:inherit;font-weight:800;touch-action:manipulation}
 .transport-sheet button:active:not(:disabled){transform:translateY(2px);box-shadow:0 1px 0 #bfdce6}.transport-sheet button:focus-visible{outline:3px solid #226ba7;outline-offset:3px}.transport-sheet button:disabled{opacity:.55;box-shadow:none}
 .transport-sheet button.primary,.transport-sheet [data-id=resume],.transport-sheet .transport-return{background:#d7f193;border-color:#99c34b;color:#304c1b;box-shadow:0 3px 0 #9dbb65;text-align:center;font-size:18px}
 .transport-sheet [data-id=save]{background:#ffdf76;border-color:#edbd44;color:#664510;box-shadow:0 3px 0 #d9ac49}.transport-sheet [data-id=recovery]{background:#dff1ff;border-color:#9bcee9}.transport-sheet [data-id=exit]{background:#fff1df;border-color:#e5c39a;color:#6c5133;font-size:14px}
 .transport-menu-icon{display:inline-grid;place-items:center;vertical-align:middle;width:34px;height:34px;margin-right:10px;border-radius:11px;background:#ffffffa8;font-size:22px}.transport-menu-sub{display:block;padding-left:45px;margin-top:3px;font-size:12px;font-weight:500}
 .transport-menu-pair{display:grid;gap:10px;grid-template-columns:1fr 1fr}.transport-menu-pair button{text-align:center;padding:12px 6px;font-size:15px}.transport-menu-pair .transport-menu-icon{display:block;margin:0 auto 6px}.transport-menu-pair .transport-menu-sub{padding:0;font-size:11px}
 .transport-sheet [data-id=storageStatus]{font-size:12px;margin:14px 0 6px;text-align:center;color:#576c61}.transport-sheet .storage-section{border:2px dashed #dcc682;background:#fff4ca}.transport-menu-foot{font-size:11px;color:#698072;text-align:center;margin:12px 0 0}
 .transport-recovery{width:min(430px,calc(100vw - 24px))}.transport-recovery .transport-menu-head{margin:0 0 12px;padding:15px;border-radius:16px;flex-shrink:0}.transport-recovery .transport-menu-head::after{font-size:40px}.transport-recovery .transport-menu-head h2{font-size:21px}
 .transport-history{grid-template-columns:1fr 1fr;gap:7px}.transport-history button{margin:0;min-height:58px;text-align:center}.transport-history button:first-child,.transport-history button:nth-child(2){grid-column:1/-1}.transport-history button:nth-child(2){background:#ffdf76;border-color:#edbd44;color:#664510}
 .transport-recovery .transport-undo{margin-top:16px;background:#f1e7ff;border-color:#d0b4ed;color:#5b4380}.transport-recovery small{color:#627080;font-size:12px}.transport-record-name{background:#dff1ff;color:#245975;padding:12px;border-radius:12px;font-size:20px}.transport-recovery td,.transport-recovery th{border-color:#c7d9d7}.transport-changed{color:#1764a0}.transport-recovery details{font-size:13px}.transport-recovery progress{accent-color:#51ae9b}
 .transport-recovery .transport-return{margin-top:14px;flex-shrink:0}.transport-recovery-content>p{font-size:14px}.transport-recovery [data-recovery=work]{background:#fff0c9;padding:10px;border-radius:10px}
 .transport-confirm-actions{display:grid;grid-template-columns:1.4fr 1fr;gap:8px;flex-shrink:0;margin-top:8px}.transport-confirm-actions[hidden]{display:none}.transport-recovery .transport-confirm-actions button{margin:0;min-height:52px}.transport-recovery .transport-confirm-actions+.transport-return{margin-top:8px}
 @media(max-height:520px){.transport-recovery .transport-menu-head{padding:8px 12px;margin-bottom:5px}.transport-recovery .transport-menu-head p{display:none}.transport-recovery .transport-menu-head h2{margin:0}.transport-recovery h3{margin:8px 0}.transport-recovery .transport-record-name{margin:6px 0;padding:8px}.transport-sheet{padding:14px;width:min(600px,calc(100vw - 32px));max-height:calc(100dvh - 16px)}.transport-menu-head{margin:-14px -14px 10px;padding:10px 14px}.transport-sheet button{min-height:46px;padding:8px 12px}.transport-sheet [role=status]{margin:6px 0}.transport-menu-pair{gap:8px}.transport-menu-pair .transport-menu-icon{display:inline-grid;margin:0 6px 0 0}.transport-menu-pair .transport-menu-sub{display:none}}

 /* A fixed reading area for position and work status; drive and work stay apart. */
 body.world-player-game .transport-play .transport-header{top:14px;left:14px;right:14px;grid-template-columns:minmax(0,345px) 1fr;grid-template-areas:'notice tools';align-items:start;justify-items:start;gap:12px}
 body.world-player-game .transport-play .transport-note{grid-area:notice;max-width:100%;box-sizing:border-box;background:#102936f2;border:1px solid #699aaf;border-left:4px solid #eeb963;border-radius:12px;box-shadow:0 4px 10px #122f4855;color:#f1f9fb;padding:11px 14px}
 body.world-player-game .transport-play .transport-note strong{font-size:16px;color:#fff0c9;line-height:1.4}
 body.world-player-game .transport-play .transport-note p{font-size:15px;line-height:1.45;margin:6px 0 0;color:#f6fbfc}
 body.world-player-game .transport-play .transport-note .transport-chapter-hint{font-weight:750;color:#ffeabe!important;background:#19414f;border-radius:8px;padding:6px 8px}
 .transport-play .transport-note :is(p,strong):empty,.transport-play .transport-note .transport-repeated-message{display:none}.transport-play .transport-note:has(strong:empty):has(p[data-id=status]:empty) {visibility:hidden}
 body.world-player-game .transport-play .transport-top{grid-area:tools;justify-self:end}
 body.world-player-game .transport-play .transport-actions{box-sizing:border-box;width:min(300px,calc(100% - 32px));padding:9px;border:1px solid #688c9b;background:#132e3ddf;border-radius:15px;gap:7px}
 body.world-player-game .transport-play .transport-actions button{min-height:45px;border-radius:9px;padding:7px 9px;font-size:15px;line-height:1.3;font-weight:750}
 body.world-player-game .transport-play .transport-actions .transport-work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:7px;align-items:stretch}
 body.world-player-game .transport-play .transport-actions [data-id=scoop]{grid-column:1/-1;grid-row:1;min-height:51px;font-size:18px}
 body.world-player-game .transport-play .transport-actions button:is([data-id=scoop],[data-id=dig],[data-id=drop],[data-id=earthPlace]):disabled{background:#414c51!important;color:#b2bec3!important;border-color:#68757a!important;box-shadow:none!important;transform:none!important;opacity:1!important;cursor:not-allowed}
 body.world-player-game .transport-play .transport-actions [data-id=leave]{grid-column:1/-1;background:#294653;color:#f4f9ff}
 body.world-player-game .transport-play .transport-actions [data-id=footActions]{width:100%}
 .transport-play .transport-trial-start{display:grid;gap:5px;align-self:stretch;margin:4px 0;padding:10px 13px;font-weight:800;text-align:left;line-height:1.35}
 .transport-play .transport-trial-start[hidden]{display:none}
 .transport-play [data-id=trialStartLabel]{font-size:.9em;color:#ffe49b;display:flex;align-items:center;gap:.45em}
 .transport-play [data-id=trialStartLabel]::before{content:"▶";font-size:.76em}
 .transport-play .transport-trial-time{position:absolute;top:max(56px,calc(env(safe-area-inset-top) + 48px));left:50%;transform:translateX(-50%);width:max-content;padding:5px 13px;border-radius:9px;background:#132638f2;color:#fff4d2;box-shadow:0 2px 9px #07172480;font-size:clamp(20px,2.8vw,32px);font-weight:900;font-variant-numeric:tabular-nums;z-index:2}
 @media(max-width:740px) and (min-height:481px){
  body.world-player-game .transport-play.transport-active.transport-timed{padding-top:max(101px,calc(env(safe-area-inset-top) + 91px))}
 }
 .transport-play [data-id=storageNearby]{font-size:14px;color:inherit}
 body.world-player-game .transport-play output.transport-trial-time{color:#fff4d2!important}
 body.world-player-game .transport-play output.transport-trial-time.urgent{background:#801e37;color:#fff!important}
 .transport-play .transport-trial-time[hidden]{display:none}
 .transport-play .hand-earth-tools{display:grid;grid-template-columns:1fr 1fr;gap:7px;width:100%}
 .transport-play .hand-earth-tools [data-id=earthShape],.transport-play .hand-earth-tools p{grid-column:1/-1}
 body.world-player-game .transport-play .hand-earth-tools p{color:#f9f4e6!important;font-size:14px;margin:2px 0;text-align:left}
 body.world-player-game .transport-play .transport-actions:has([data-id=footActions]:not([hidden])):not(:has([data-id=footActions]>button:not([hidden],:disabled))){padding:0;border:0;background:none}
 body.world-player-game .transport-sheet :is(.transport-menu-foot,.transport-menu-sub,.transport-menu-head p,[data-id=storageStatus],[role=status]){font-size:14px;color:#2c4c54}
 body.world-player-game .transport-sheet .transport-menu-head .menu-kicker{font-size:13px}
 body.world-player-game .transport-sheet .transport-menu-pair button{font-size:17px}
 @media(max-width:740px){
  body.world-player-game .transport-play .transport-header{top:48px;left:10px;right:10px;grid-template-columns:minmax(0,1fr);grid-template-areas:'tools' 'notice';gap:7px}
  body.world-player-game .transport-play .transport-note{max-width:min(86%,330px)}
  body.world-player-game .transport-play .transport-actions{width:min(255px,calc(100% - 40px))}
  body.world-player-game .transport-play .transport-actions button{font-size:14px}
 }
 @media(max-height:480px){
  body.world-player-game .transport-play .transport-header{top:9px;grid-template-columns:minmax(0,265px) 1fr;grid-template-areas:'notice tools'}
  body.world-player-game .transport-play .transport-actions{right:calc(var(--transport-right) + 84px);bottom:var(--transport-bottom)!important;width:min(240px,calc(100% - 245px));padding:5px}
  body.world-player-game .transport-play .transport-actions button{min-height:36px;padding:4px}
  body.world-player-game .transport-play .transport-actions [data-id=scoop]{min-height:40px;font-size:16px}
 }
 /* Keep the notice, work controls and movement in separate rows. */
 body.world-player-game .transport-play.transport-active{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  grid-template-rows:auto minmax(0,1fr) auto;gap:8px;box-sizing:border-box;
  padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right))
    max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));
 }
 body.world-player-game .transport-play.transport-active .transport-header{
  position:static;grid-row:1;grid-column:1/-1;width:100%;min-width:0;
 }
 body.world-player-game .transport-play.transport-active .transport-actions{
  position:static;grid-row:2;grid-column:1/-1;justify-self:end;align-self:end;
  max-width:100%;max-height:100%;overflow:auto;overscroll-behavior:contain;pointer-events:auto;
 }
 .transport-play.transport-active .transport-pad{position:static;grid-row:3;grid-column:1;justify-self:start;align-self:end}
 .transport-thumbs{grid-row:3;grid-column:2;justify-self:end;align-self:end;display:flex;align-items:end;gap:8px}
 .transport-thumbs .transport-dash{position:relative;inset:auto;flex:none}
 .transport-play .transport-thumbs>.construction-jump-button{
  position:static;flex:none;transform:none;width:var(--transport-thumb-size,76px);
  height:var(--transport-thumb-size,76px);min-height:0;min-width:0;
 }
 .transport-play .transport-actions button:not([data-id=left],[data-id=right],[data-arm-joint],[data-steer]){touch-action:pan-y}
 .transport-play .transport-actions :is([data-id=left],[data-id=right],[data-arm-joint]){touch-action:none}
 .transport-play .transport-exc-aux [data-id=aimMode][aria-pressed=true]{background:#b4ded3!important;color:#173d3a!important}
 @media(max-width:740px) and (min-height:481px){
  body.world-player-game .transport-play.transport-active{padding-top:max(52px,calc(env(safe-area-inset-top) + 42px))}
 }
 @media(max-width:520px),(max-height:480px){
  .transport-thumbs{--transport-thumb-size:58px}
  .transport-play .transport-dash,.transport-play .transport-dash>.hold-dash-button{
   width:var(--transport-thumb-size);height:var(--transport-thumb-size);min-width:var(--transport-thumb-size);min-height:0;
  }
  .transport-play .construction-move-pad{width:92px;height:92px}
 }
 @media(max-width:560px),(max-height:480px){
  body.world-player-game .transport-play.transport-active .transport-actions{width:min(390px,100%);gap:5px}
  body.world-player-game .transport-play .transport-actions .transport-work-grid{gap:5px}
 }
 @media(max-width:560px) and (min-height:481px){
  body.world-player-game .transport-play.transport-active .transport-note{max-width:100%;padding:6px 9px}
  body.world-player-game .transport-play.transport-active .transport-note strong{font-size:15px}
  body.world-player-game .transport-play.transport-active .transport-note p{font-size:14px;line-height:1.35;margin-top:4px}
  body.world-player-game .transport-play.transport-active .transport-note .transport-chapter-hint{padding:4px 6px}
 }
 @media(min-width:561px) and (max-height:480px){
  body.world-player-game .transport-play.transport-active{grid-template-columns:minmax(0,35%) minmax(0,1fr)}
  body.world-player-game .transport-play.transport-active .transport-header{display:contents}
  body.world-player-game .transport-play.transport-active .transport-top{grid-row:1;grid-column:2;align-self:start}
  body.world-player-game .transport-play.transport-active .transport-note{grid-row:1/3;grid-column:1;align-self:start}
  body.world-player-game .transport-play.transport-active .transport-actions{grid-column:2}
 }

 /* Pair the left/right hydraulic controls around the unobstructed view. */
 body.world-player-game .transport-play.transport-active.transport-excavator{
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
 }
 body.world-player-game .transport-play.transport-active.transport-excavator .transport-actions{
  grid-column:2;align-self:end;width:min(230px,100%);
 }
 .transport-play .transport-exc-aux{
  grid-row:2;grid-column:1;justify-self:start;align-self:end;
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;
  width:min(208px,100%);box-sizing:border-box;
 }
 .transport-play .transport-exc-aux button{min-width:0;padding:6px;line-height:1.2}
 .transport-play :is([data-steer],[data-arm-joint],[data-id=left],[data-id=right]){touch-action:none}
 @media(max-width:740px),(max-height:480px){
  body.world-player-game .transport-play.transport-active.transport-excavator .transport-actions{
   width:min(41vw,180px);padding:5px;
  }
  .transport-play.transport-excavator .transport-exc-aux{width:min(39vw,165px);gap:5px}
  .transport-play.transport-excavator .construction-move-pad{
   box-sizing:border-box;width:clamp(66px,21vw,90px);height:clamp(66px,21vw,90px);
  }
  .transport-play.transport-excavator .construction-move-stick{width:36px;height:36px}
  body.world-player-game .transport-play.transport-excavator .transport-actions button,
  .transport-play.transport-excavator .transport-exc-aux button{
   min-height:44px;font-size:13px;line-height:1.22;padding:4px 2px;text-wrap:balance;overflow-wrap:anywhere;
  }
  body.world-player-game .transport-play.transport-excavator .transport-actions [data-id=scoop]{
   min-height:44px;font-size:15px;
  }
 }
 @media(max-height:480px) and (min-width:561px){
  body.world-player-game .transport-play.transport-active.transport-excavator .transport-header{
   display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  }
  body.world-player-game .transport-play.transport-active.transport-excavator :is(.transport-top,.transport-note){
   grid-row:1;
  }
  body.world-player-game .transport-play.transport-active.transport-excavator .transport-top{grid-column:2}
  body.world-player-game .transport-play.transport-excavator .transport-note{grid-column:1;max-width:300px;padding:4px 8px}
  body.world-player-game .transport-play.transport-excavator .transport-note p{
   margin-top:3px;font-size:13px;line-height:1.28;
  }
 }
 @media(max-height:420px) and (min-width:561px){
  body.world-player-game .transport-play.transport-active.transport-excavator .transport-actions{
   width:min(37vw,276px);
  }
  body.world-player-game .transport-play.transport-excavator .transport-actions [data-id=excActions],
  .transport-play.transport-excavator .transport-exc-aux{
   grid-template-columns:repeat(4,minmax(0,1fr));
  }
  .transport-play.transport-excavator .transport-exc-aux{width:min(36vw,268px)}
  body.world-player-game .transport-play.transport-excavator .transport-actions [data-id=scoop]{
   grid-column:1/span 2;
  }
 }
 html[data-control-display=touch] body.world-player-game .transport-exc-aux button{
  border-width:1px;min-height:44px;line-height:1.17;font-weight:800;
 }
 html[data-control-display=touch] body.world-player-game .transport-exc-aux :is([data-arm-joint],[data-steer],[data-id=left]){
  border-bottom-width:3px;
 }
 `;document.head.append(style);
 const panel=document.createElement('section');panel.className='transport-play';panel.hidden=true;
 panel.innerHTML=`<div class="transport-header"><div class="transport-top"><button data-id="view" data-game-action="camera">視点</button><button data-id="face" hidden>正面に戻す</button><button data-id="menu" data-game-action="menu" aria-keyshortcuts="F8">メニュー</button><button data-id="begin" class="primary">保存した現場を再開</button></div><div class="transport-note"><strong data-id="amount"></strong><dl class="transport-stock" aria-label="土の積み荷"><div data-id="toolStock"><dt data-id="toolStockLabel">バケットの土</dt><dd data-id="toolStockAmount"></dd></div><div><dt>ダンプ荷台の土</dt><dd data-id="dumpStockAmount"></dd></div></dl><p data-id="chapterHint" class="transport-chapter-hint"></p><button type="button" data-id="startTrial" class="primary transport-trial-start" aria-keyshortcuts="1" hidden><span data-id="trialTitle"></span><span data-id="trialStartLabel"></span></button><p data-id="storageNearby" hidden></p><p data-id="status" role="status"></p><p data-id="toolHelp" hidden>手作業にはシャベルが必要です。</p><p data-id="aimHelp" hidden>地面をタップして置き先を選び、「ここに置く」を押します。近くも遠くも選べます。必要なときは自動で近づいて置きます。スライドで向きを変えられます。</p><div data-id="stroke" hidden><progress data-id="progress" max="100"></progress><span data-id="stage"></span></div></div></div><output data-id="trialTime" role="timer" class="transport-trial-time" hidden></output><div data-id="trialSignal" class="transport-trial-signal" role="status" hidden></div><div class="transport-pad" data-id="movement">${constructionMovePadTemplate()}</div><div class="transport-actions" data-id="actions"><div data-id="footActions"><button data-id="dig" class="primary">土をすくう</button><button data-id="load" class="primary">荷台へ入れる</button><button data-id="drop">土を置く</button><button data-id="stopPlace" hidden>移動をやめる</button><button data-id="storage" hidden>保管箱を使う</button><button data-id="boardExc" aria-keyshortcuts="F" class="primary" hidden>ショベルに乗る</button><button data-id="board" aria-keyshortcuts="F" class="primary" hidden>ダンプに乗る</button></div><button data-id="excMode" hidden>走行に切りかえる</button><button data-id="driveExcLeave" hidden>ショベルを降りる</button><button data-id="digKind" hidden>掘り方：土をすくう</button><div data-id="excActions" class="transport-work-grid" hidden><button data-id="left" title="上部旋回体を左へ旋回">上部 左［J］</button><button data-id="right" title="上部旋回体を右へ旋回">上部 右［L］</button><button data-id="scoop" aria-keyshortcuts="${EXCAVATOR_KEYS.scoop}" class="primary">すくう</button><button data-id="pour" aria-keyshortcuts="${EXCAVATOR_KEYS.pour}" class="primary">保管庫へ預ける</button><button data-id="pourDump" aria-keyshortcuts="${EXCAVATOR_KEYS.pourDump}" class="primary">ダンプへ積む</button><button data-id="leaveExc">降りる［Q］</button></div><div data-id="driveActions" class="transport-work-grid" hidden><button data-id="storeDump" class="primary" hidden>保管庫へ下ろす［H］</button><button data-id="leave">降りる［O］</button></div></div><div class="transport-dash" data-id="dash">${holdDashButtonTemplate()}</div><dialog class="transport-sheet" data-id="sheet"><header class="transport-menu-head"><span class="menu-kicker">イマソラーズウォーク</span><h2>こうじの休けい所</h2><p>ひと休みして、つづきをつくろう！</p></header><p data-id="menuStatus" role="status"></p><button type="button" data-id="cancelTrial" hidden>ミッションを中止する</button><section data-id="storageSection" hidden class="storage-section"><h3>土の保管箱</h3><p data-id="storageHelp"></p><button data-id="store" class="primary">土を預ける（1すくい）</button><button data-id="take" class="primary">土を取り出す（1すくい）</button></section><button data-id="resume" class="primary" data-game-action="menu" aria-keyshortcuts="F8"><span aria-hidden="true">▶ </span>あそびにもどる</button><button data-id="fleet" hidden>重機を選ぶ</button><button data-id="help">動きで使い方を見る</button><div class="transport-menu-pair"><button data-id="save" data-confirm-handler aria-keyshortcuts="S"><span class="transport-menu-icon" aria-hidden="true">✓</span>セーブする<span class="transport-menu-sub">いまの作業をのこす</span></button><button data-id="recovery" aria-keyshortcuts="R"><span class="transport-menu-icon" aria-hidden="true">↶</span>前にもどす<span class="transport-menu-sub">前のセーブをえらぶ</span></button></div><button data-id="exit" data-confirm-handler aria-keyshortcuts="F9"><span aria-hidden="true">⚑ </span>セーブして工事現場へ戻る</button><p class="transport-menu-foot">重機を降りると、作業をセーブして工事現場へ戻れます。</p><p data-id="storageStatus"></p><p class="transport-menu-foot">ここでは作業が止まるから、ゆっくりえらんでね。</p><button data-id="retry" class="primary" hidden>セーブをやり直す</button><details data-id="diagnostics"><summary>現場の記録</summary><pre data-id="proof"></pre></details></dialog>`;
 const armPanel=panel.querySelector('[data-id=excActions]');
 armPanel.setAttribute('role','group');
 armPanel.setAttribute('aria-label','上部旋回と掘削操作');
 armPanel.querySelector('[data-id=right]').insertAdjacentHTML('afterend',
  excavatorArmControls.map(([id,code,label,joint])=>'<button type="button" data-id="'+id+'" data-arm-joint="'+joint+'" aria-keyshortcuts="'+code.slice(3)+'">'+label+'</button>').join(''));
 const movement=panel.querySelector('[data-id=movement]');
 movement.querySelector('.construction-keyboard-hint').remove();
 const directions=globalThis.IMASORA_BUTTON_FEEDBACK?.createDirections(movement,'transport-drive-keys');
 let directionMode=null;
 const aux=document.createElement('div');
 aux.className='transport-exc-aux';aux.hidden=true;
 aux.setAttribute('role','group');aux.setAttribute('aria-label','ショベルカーの左側の操作');
 const actions=panel.querySelector('.transport-actions');
 actions.before(aux);
 aux.append(actions.querySelector('[data-id=excMode]'),actions.querySelector('[data-id=digKind]'));
 aux.insertAdjacentHTML('beforeend','<button type="button" data-id="aimMode" aria-keyshortcuts="R" aria-pressed="false">自動で狙う</button>');
 aux.append(armPanel.querySelector('[data-id=leaveExc]'));
 const holdButton=(id,direction,label)=>'<button type="button" data-id="'+id+'" data-steer="'+direction+'" title="車体を'+label+'へ旋回">車体 '+label+(direction<0?'［A］':'［D］')+'</button>';
 aux.append(armPanel.querySelector('[data-id=stickExtend]'),armPanel.querySelector('[data-id=boomRaise]'));
 aux.insertAdjacentHTML('beforeend',holdButton('steerLeft',-1,'左'));
 aux.append(armPanel.querySelector('[data-id=left]'));
 armPanel.querySelector('[data-id=right]').insertAdjacentHTML('beforebegin',holdButton('steerRight',1,'右'));
 const rightButtons=['scoop','pour','pourDump','boomLower','stickRetract','right','steerRight'];
 armPanel.append(...rightButtons.map(id=>armPanel.querySelector('[data-id='+id+']')));
 const thumbs=document.createElement('div');thumbs.className='transport-thumbs';panel.querySelector('.transport-dash').before(thumbs);thumbs.append(panel.querySelector('.transport-dash'));
 const jumpButton=document.createElement('button');jumpButton.className='construction-jump-button';jumpButton.dataset.id='jump';jumpButton.textContent='ジャンプ';jumpButton.setAttribute('aria-label','ジャンプ（3段まで）');jumpButton.hidden=true;thumbs.append(jumpButton);
 host.append(panel);const elements=new Map([...panel.querySelectorAll('[data-id]')].map(e=>[e.dataset.id,e]));
 const el=id=>elements.get(id)??panel.querySelector(`[data-id="${id}"]`),status=(text,tone='')=>{
  if(disposed)return;
  for(const id of ['status','menuStatus']){
   const message=el(id);
   setConstructionNoticeTone(message,text?tone:'');
   setButtonText(message,text);
  }
 };
 el('footActions').insertAdjacentHTML('afterbegin','<button type="button" data-id="handEarthMode" aria-keyshortcuts="V">土でつくる</button><section data-id="handEarthTools" class="hand-earth-tools" hidden aria-label="土でつくる"><p data-id="earthStock"></p><button type="button" data-id="earthShape" aria-keyshortcuts="C"></button><button type="button" data-id="earthPlace" class="primary" aria-keyshortcuts="G">ここに置く</button><button type="button" data-id="earthRemove" aria-keyshortcuts="R">上の土を回収</button></section>');
 function clearActionFeedback(){feedbackKeys.clear();feedbackPointers.clear();syncActionFeedback();}
 function syncActionFeedback(){
  if(!play.active||play.paused&&!ending||document.hidden||el('sheet').open){feedbackKeys.clear();feedbackPointers.clear();}
  const pressed=constructionPressedActions(feedbackKeys,session.state.mode);
  for(const id of feedbackPointers.values())pressed.add(id);
  if(dash?.active)pressed.add('dash');
  for(const id of feedbackIds){const b=id==='dash'?el('dash').firstElementChild:el(id),value=String(pressed.has(id));if(b.dataset.keyHeld!==value)b.dataset.keyHeld=value;}
 }
 el("diagnostics").hidden=!verification;
 let excavatorBlockedNotice=false,slewBlocked=false,armBlocked=false,aimedScoop=false,workNoticeUntil=0;
 const armControlHeld=([id,code])=>feedbackKeys.has(code)||[...feedbackPointers.values()].includes(id);
 const armInMotion=()=>excavatorArmControls.some(armControlHeld);
 const autoSaveGate=createConstructionAutoSaveGate();
 let trial=null,pendingTrialResult=null,trialFailed=false,arrivalMarkers=null,summitExitYaw=null;
 function refuseWork(message){workNoticeUntil=performance.now()+3000;status(message,'warning');}
 // The exact same rejected input at the same stationary pose and scene
 // cannot become valid before one of those inputs changes.
 let blockedDrive=null,quarryFlight=null;
 function moveVehicle(name,...args){
  const prior=session.state,revision=contactRevision();
  const key=[name,...args].join('/');
  if(revision===undefined||blockedDrive?.prior!==prior||blockedDrive.revision!==revision){
   blockedDrive=revision===undefined?null:{prior,revision,inputs:new Set()};
  }
  if(blockedDrive?.inputs.has(key))return prior;
  const next=play.move(name,...args);
  if(next!==prior){blockedDrive=null;return next;}
  blockedDrive?.inputs.add(key);
  const vehicleKey=name==='driveBucketSite'?'dump':'machineVehicle',from=prior.frame[vehicleKey];
  const direction=Math.sign(args[0]);
  const dropKey='drop/'+direction;
  if(!direction||!Number.isFinite(from?.groundY)||blockedDrive?.inputs.has(dropKey))return prior;
  blockedDrive?.inputs.add(dropKey);
  const landed=play.move('dropQuarryTransport',direction);
  if(landed===prior)return prior;
  const to=landed.frame[vehicleKey],duration=Math.max(.16,Math.sqrt(2*(from.groundY-to.groundY)/225),Math.hypot(to.x-from.x,to.z-from.z)/205);
  quarryFlight={from,to,duration,time:0};
  blockedDrive=null;status('斜面を下っています。');
  return landed;
 }
 function reset(){summitExitYaw=null;blockedDrive=null;jumpControl?.cancel();jump.release();travelAcceleration.reset();excavatorBlockedNotice=slewBlocked=armBlocked=false;tapStart=null;verifyRoute=null;dropApproach=null;dropPlanning=false;dropToken++;clearInput();input?.reset();pad?.cancel();dash?.cancel();held.clear();acc=0;}
 function owns(on){reset();panel.classList.toggle('transport-active',on);document.body.classList.toggle('world-excavation-playing',on);document.body.classList.toggle('world-transport-playing',on);host.classList.toggle('world-excavation-viewport-operating',on);for(const e of document.querySelectorAll('.toolbar,.control-card'))e.inert=on;el('begin').hidden=on;el('menu').hidden=el('view').hidden=el('face').hidden=!on;el('actions').hidden=el('movement').hidden=el('dash').hidden=!on;if(!on){aux.hidden=true;jumpButton.hidden=true;bankButton.hidden=true;view?.releaseActor();character.visible=true;shadow.visible=true;}}
 let walkingFrame=null,readWalkingColliders=null,probeFrame=null,vehicleProbe=null;
 let groundFrame=null,readGround=null,autoQuarryTried=false,autoSlopePose=null,deferredFace=null,slopeCheckedSoil=null,autoStorageTried=false,storageCollider=null,moveStorageCollider=null;
 function prepareQuarry(){
  const s=session.state;
  if(service.mode!=='live'||s.frame.version!==2||transportWorkMoving(s)||session.busy||session.blocked||session.intent||service.busy)return;
  const soil=s.frame.soil;
  slopeCheckedSoil=soil;
  let changed=false;
  if(!autoQuarryTried&&!hasQuarryRange(soil)){
   autoQuarryTried=true;
   try{session.move('openQuarryRange');changed=true;}catch(error){if(play.active)status(error.message,'error');}
  }
  if(!changed&&!hasContinuousQuarry(soil)&&hasQuarryRange(soil)&&autoSlopePose!==s.frame){
   autoSlopePose=s.frame;
   try{session.move('surfaceQuarrySlopes');changed=true;}catch(error){if(play.active)status(error.message,'error');}
  }
  if(!changed&&hasContinuousQuarry(soil)&&!hasSummitFace(soil)&&deferredFace!==s.frame){
   try{session.move('openSummitFace');deferredFace=null;changed=true;}
   catch(error){deferredFace=s.frame;if(play.active)status(error.message,'error');}
  }
  if(!autoStorageTried&&s.mode==='foot'&&!nativeStorageBin(soil).clustered){
   const bin=clusteredStorageBin(soil),[x,z]=soil.field.origin;
   if(Math.abs(state.position.x-x-bin.x)>bin.width/2+17||Math.abs(state.position.z-z-bin.z)>bin.depth/2+17){
    autoStorageTried=true;
    try{session.move('relocateEarthStorage');changed=true;}catch{/* Keep the existing working bay if its new location is occupied. */}
   }
  }
  if(changed){
   const bin=nativeStorageBin(session.state.frame),[x,z]=soil.field.origin;
   if(storageCollider&&moveStorageCollider)moveStorageCollider(storageCollider,x+bin.x,z+bin.z);
   renderWork();void session.save().then(()=>autoSaveGate.checked()).catch(error=>status(error.message,'error'));
  }
 }
 function groundHeightAt(x,z,reference){
  if(!root)return undefined;
  const frame=session.state.frame;
  if(!groundFrame||frame.soil!==groundFrame.soil||frame.decks!==groundFrame.decks||frame.job!==groundFrame.job){
   groundFrame=frame;readGround=transportGroundHeightReader(play.record);
  }
  return readGround(x,z,reference);
 }
 function setHostPose(p){state.position.set(p.x,0,p.z);state.groundY=p.y;state.heading=p.heading;state.jumpY=state.jumpVelocity=0;state.falling=state.moving=false;}
 function syncEntry(){const can=play.canBegin({x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z});setDisabled(el('begin'),!can);setHidden(el('begin'),play.active||(!resumeAtSavedPose&&!can));setHidden(el('amount').parentElement,!play.active&&!resumeAtSavedPose&&!can);}
 function proof(){if(disposed||!verification)return;const world=service.ledger.world;el('proof').textContent=JSON.stringify({保存世代:service.generation,保存待ち:!!session.intent,作業中:play.active,一時停止:play.paused,キー入力回数:keyCount,最後のキー:lastKey,モード:session.state.mode,人物:session.state.frame.player,車両:session.state.frame.dump,接地:nativeDumpSupport(session.state.frame),腕:session.state.frame.machineArm,土予約:session.state.frame.soil.pending,受取:world.constructionPackTrialLedger,手作業:session.state.frame.job,掘削:session.state.scoop?{id:session.state.scoop.id,elapsed:session.state.scoop.elapsed}:null,積込み:session.state.link?{kind:session.state.link.kind,elapsed:session.state.link.elapsed}:null,荷下ろし:session.state.unload,道具:service.constructionToolkit,土量:soilTransportTotals(session.state.frame.soil)['earth-soil'],金貨:world.ufoResources.spaceCoins,置き先:dropSelection?{point:dropSelection.point,target:dropSelection.target,valid:!!targets.drop,issue:dropSelection.plan?.issue??null}:null,置き先への移動:dropApproach?{remaining:dropApproach.points.length,point:dropApproach.point}:null,保管箱表示:view?.storage??null,運搬視点:view?.cameraProof??null,描画:'本体3Dのscene・正式モンスター',旧地形描画:!!root?.userData.terrain?.visible,建築:world.builtByMap},null,2);}
 let groundPreviewKey='',groundPreviewSoil=null;function preparedGround(s){const patches=unopenedGround(s);if(!patches.length)return s;const key=JSON.stringify([s.frame.soil.revision,patches]);if(key!==groundPreviewKey){try{groundPreviewSoil=m.openScoopGround(s).frame.soil;groundPreviewKey=key;}catch{return s;}}return {...s,frame:{...s.frame,soil:groundPreviewSoil}};}
 function selectedShovelDrop(frame){
  if(!dropSelection)return shovelDropTarget(frame);
  const plan=dropSelection.plan;
  if(!plan?.points)return null;
  return plan.environment===handAreaEnvironment(frame)?plan:shovelDropTarget(frame,dropSelection.point);
 }
 function scan(){
  if(disposed)return;
  const s=session.state,f=s.frame;
  if(handEarthMode&&s.mode==='foot'){targets={};scanKey='';return;}
  if(!f.soil.containers.shovel.amount&&f.soil.pending?.from!=='shovel')dropSelection=null;
  if(s.mode==='excavating'){
   if(scanKey!==s.mode){scanKey=s.mode;targets={};}
   return;
  }
  const k=[s.mode,JSON.stringify(f.machineVehicle),f.soil.revision,f.dump.x,f.dump.z,f.dump.heading,f.player.x.toFixed(1),f.player.z.toFixed(1),f.player.heading.toFixed(2),JSON.stringify(dropSelection?.point??dropSelection),!!s.link,!!s.unload].join(',');
  if(k===scanKey)return;
  scanKey=k;
  targets=s.mode==='foot'?{exc:m.linkedAccessTarget(s),dump:m.dumpBoardTarget(s),dig:shovelDigTargets(preparedGround(s).frame)[0]??null,load:shovelLoadTarget(f),drop:selectedShovelDrop(f),storage:shovelStorageContact(f),store:shovelStorageTarget(f,'store'),take:shovelStorageTarget(f,'take')}:s.mode==='driving'?{storeDump:m.dumpStoragePlan(s),storageCamera:dumpStorageContact(f)}:{};
 }
 function tryJump(){if(!enabled()||session.state.mode!=='foot'||jump.count>=3)return false;if(!jump.start())return false;status(jump.count+'段ジャンプ！');buttons();return true;}
 const jumpControl=bindJumpButton({element:jumpButton,enabled:()=>enabled()&&session.state.mode==='foot'&&jump.count<3,canHold:()=>enabled()&&session.state.mode==='foot',activate:tryJump,release:()=>jump.release()});
 const trialTitles={
  'dump-arrival':'制限時間内にダンプカーで採土場を目指そう',
  'excavator-arrival':'ショベルカーで山の頂上を目指そう',
  'summit-load':'ショベルカーで山の頂上の土を掘り、ダンプカー満杯になるまで土を乗せよう',
  'dump-haul':'満載のダンプカーを保管庫へ運べ！',
  'dump-unload':'制限時間内に土を下ろせ！',
  'excavator-scoop':'黄色い区画で土をすくえ！','excavator-load':'ダンプカーに土を積め！',
 };
 const enabled=()=>!disposed&&!quarryFlight&&!(trial?.countdownMs>0)&&play.canOperate&&!planning&&!ending&&!failed&&!saveFailed&&!verifyRoute&&!dropPlanning&&!dropApproach;
 const travelInputEnabled=()=>enabled()||!!quarryFlight&&play.active&&!play.paused&&!disposed||play.savingAutomatically&&!disposed&&!ending&&!failed;
 const gardenReserved=()=>gardenEarthReserved(service.ledger.world.constructionHighBuild);
 const parkingReturn=createParkingReturn({panel,dock:panel.querySelector('.transport-top'),clear:reset,
  vehicle:()=>!play.active||session.state.frame.version!==2?null:session.state.mode==='excavating'?{id:'excavator',name:'ショベルカー'}:session.state.mode==='driving'?{id:'dump',name:'ダンプカー'}:null,
  available:()=>trial?'ミッションを終えてから駐車枠へ戻そう。':enabled()&&!transportWorkMoving(session.state)?'':'作業や保存が終わってから戻ろう。',notice:status,
  async returnVehicle(){play.move('returnTransportToParking');view.setYaw(constructionCameraBaseYaw(session.state));setHostPose(transportWorldPose(play.record));renderWork();buttons();return await write('駐車枠に戻しました。',{continueWork:true});}});
 const bankButton=document.createElement('button');
 bankButton.type='button';bankButton.hidden=true;bankButton.textContent='山の採土場をひらく';bankButton.dataset.cutBank='';
 panel.querySelector('.transport-top').append(bankButton);
 bankButton.onclick=async()=>{
  if(!enabled()||transportWorkMoving(session.state))return;
  reset();
  try{
   play.move('openQuarryRange');
   renderWork();
   await write('山の採土場が開きました。駐車場側の外周道路から、山へ続く坂道を登れます。',{continueWork:true});
  }catch(error){status(error.message,'error');}
 };
 const syncBankButton=()=>{
  const f=session.state.frame;
  bankButton.hidden=!play.active||f.version!==2||hasQuarryRange(f.soil);
  bankButton.disabled=!enabled()||transportWorkMoving(session.state);
 };
 const setButtonText=(button,text)=>{if(button.textContent!==text)button.textContent=text;};
 // Reflected attributes emit mutations even when set to their current value.
 const setHidden=(element,hidden)=>{if(element.hidden!==hidden)element.hidden=hidden;};
 const setDisabled=(element,disabled)=>{if(element.disabled!==disabled)element.disabled=disabled;};
 function setHandEarthMode(next){
  if(disposed||session.state.mode!=='foot'||!enabled()||jump.airborne){refuseWork('地面に立ち、作業を終えてから始めてください。');return false;}
  if(next&&session.state.frame.soil.containers.shovel.amount){refuseWork('シャベルの土を先に荷台や保管箱に入れてください。');return false;}
  handEarthMode=next;handEarthPoint=null;handEarthPreview=null;scanKey='';
  if(next)status('手でならべる場所を選ぼう。地面をタップするか、置きたい方を向いてください。');
  else status('');
  scan();buttons();return true;
 }
 function currentHandEarth(s){
  if(!handEarthMode||handEarthPoint===false||s.mode!=='foot'||jump.airborne)return null;
  const f=s.frame,p=f.player;
  if(f.soil.containers.storage.amount-gardenReserved()<HAND_EARTH_SHAPES[handEarthShape].amount)return null;
  const key=[p.x.toFixed(1),p.y,p.z.toFixed(1),p.heading.toFixed(2),handEarthShape,...handEarthPoint??[]].join(':');
  if(handEarthPreview?.key===key&&handEarthPreview.soil===f.soil&&handEarthPreview.car===f.machineVehicle&&handEarthPreview.dump===f.dump&&handEarthPreview.decks===f.decks)return handEarthPreview.plan;
  const plan=planHandEarth(s,'place',handEarthShape,handEarthPoint);
  handEarthPreview={key,soil:f.soil,car:f.machineVehicle,dump:f.dump,decks:f.decks,plan};
  return plan;
 }
 function canPlaceHandEarth(s){
  if(!enabled()||jump.airborne)return false;
  const plan=currentHandEarth(s);
  return !!plan?.positions?.length&&!plan.reason;
 }
 function commitHandEarth(action){
  if(handEarthPoint===false||action==='place'&&!canPlaceHandEarth(session.state))return;
  if(!handEarthMode||!enabled()||jump.airborne){refuseWork('着地して作業を終えてから操作してください。');return;}
  try{
   const next=play.move('editHandEarth',action,handEarthShape,handEarthPoint,crypto.randomUUID());
   const shape=HAND_EARTH_SHAPES[next.frame.soil.journal.at(-1).shape].label;
   handEarthPreview=null;scanKey='';
   status(action==='place'?`${shape}を置きました。`:`${shape}を片づけ、土を保管箱に戻しました。`);
   buttons();
  }catch(error){refuseWork(error.message);}
 }
 el('handEarthMode').onclick=()=>setHandEarthMode(!handEarthMode);
 el('earthShape').onclick=()=>{handEarthShape=handEarthShape==='step'?'block':'step';handEarthPreview=null;buttons();};
 el('earthPlace').onclick=()=>commitHandEarth('place');
 el('earthRemove').onclick=()=>commitHandEarth('remove');
 function syncHandEarth(s){
  const foot=play.active&&s.mode==='foot'&&s.frame.soil.schema===3;
  if(!foot){handEarthMode=false;handEarthPoint=null;handEarthPreview=null;}
  const mode=el('handEarthMode'),tools=el('handEarthTools'),shape=HAND_EARTH_SHAPES[handEarthShape];
  const toolsHidden=!foot||!handEarthMode,pressed=String(handEarthMode);
  if(mode.hidden===foot)mode.hidden=!foot;
  if(tools.hidden!==toolsHidden)tools.hidden=toolsHidden;
  if(mode.getAttribute('aria-pressed')!==pressed)mode.setAttribute('aria-pressed',pressed);
  setButtonText(mode,handEarthMode?'手作業を終える':'土でつくる');
  el('load').hidden=el('drop').hidden=handEarthMode;
  if(tools.hidden)return;
  for(const id of ['dig','stopPlace','storage','board','boardExc','aimHelp','toolHelp'])el(id).hidden=true;
  const available=Math.max(0,s.frame.soil.containers.storage.amount-gardenReserved());
  setDisabled(el('earthPlace'),!canPlaceHandEarth(s));
  setDisabled(el('earthRemove'),handEarthPoint===false);
  setButtonText(el('earthShape'),'形　'+shape.label);
  setButtonText(el('earthStock'),`保管箱の土　${shape.label}${Math.floor(available/shape.amount)}個分`);
 }
 function buttons(){const offer=syncTrialControls(),instruction=trial?trialInstruction(trial):!offer&&play.active&&['excavating','driving'].includes(session.state.mode)?chapterHint():'';setButtonText(el('chapterHint'),instruction);const statusLine=el('status'),repeated=!!instruction&&statusLine.textContent===instruction,hasNotice=!!statusLine.dataset.constructionNotice;statusLine.classList.toggle('transport-repeated-message',repeated&&!hasNotice);el('chapterHint').classList.toggle('transport-repeated-message',repeated&&hasNotice);parkingReturn.sync();syncBankButton();if(disposed)return;const s=session.state,ok=enabled()&&!jump.airborne;setHidden(el('jump'),!play.active||s.mode!=='foot'||play.paused);setDisabled(el('jump'),!enabled()||jump.count>=3);const aboard=s.mode==='excavating',exc=aboard,dr=s.mode==='driving'||aboard&&excavatorDriving;setHidden(el('excMode'),!aboard||s.frame.version!==2);el('excMode').dataset.workBlocked=String(!ok);setButtonText(el('excMode'),excavatorDriving?'作業視点［N］':'走行視点［N］');setHidden(el('driveExcLeave'),true);setDisabled(el('driveExcLeave'),!ok);
  const showExcavator=play.active&&aboard;
  panel.classList.toggle('transport-excavator',showExcavator);
  setHidden(aux,!showExcavator);
  const movementMode=play.active?s.mode:null;
  if(directions&&directionMode!==movementMode){
   directionMode=movementMode;
   directions.show(transportDirections[movementMode]??null);
   const alternate=directions.element.querySelector(':scope > [data-game-action=secondary]');
   if(alternate)directions.element.querySelector('[data-game-action=back]').append(alternate);
  }
  setHidden(el('footActions'),s.mode!=='foot');setHidden(el('excActions'),!exc);setHidden(el('driveActions'),s.mode!=='driving');
  const keyLabel=document.documentElement.dataset.controlDisplay!=='touch',manualArm=s.frame.version===2;
  for(const [id,code,label] of excavatorArmControls){const b=el(id);setHidden(b,!manualArm);setDisabled(b,!ok);setButtonText(b,label+(keyLabel?'［'+code.slice(3)+'］':''));}
  setHidden(el('aimMode'),basinDig||!manualArm);setDisabled(el('aimMode'),!ok);
  setButtonText(el('aimMode'),(aimedScoop?'手動照準':'自動照準')+(keyLabel?'［R］':''));
  el('aimMode').setAttribute('aria-pressed',String(aimedScoop));
  const owned=!!service.constructionToolkit?.tools.find(t=>t.id==='shovel')?.owned;
  for(const id of ['dig','load','drop'])setDisabled(el(id),!ok||!targets[id]||!owned);
  setHidden(el('boardExc'),!targets.exc||s.mode!=='foot');setHidden(el('board'),!targets.dump||s.mode!=='foot');for(const id of ['boardExc','board','steerLeft','steerRight','left','right','leave','leaveExc'])setDisabled(el(id),!ok);
  setHidden(el('stopPlace'),!dropApproach);setDisabled(el('stopPlace'),!play.canAdvance);setHidden(el('storage'),s.mode!=='foot'||!targets.storage);setDisabled(el('storage'),!ok);
  setHidden(el("toolHelp"),s.mode!=="foot"||owned);
  const storageJob=['store','take'].includes(s.frame.job?.kind),storageReady=play.active&&!play.busy&&!session.blocked&&!session.intent&&!planning&&!ending&&!failed&&!saveFailed&&!transportWorkMoving(s);
  setHidden(el('storageSection'),s.mode!=='foot'||!targets.storage&&!storageJob);
  for(const kind of ['store','take']){setDisabled(el(kind),!storageReady||!owned||!targets[kind]||kind==='take'&&targets[kind].amount>s.frame.soil.containers.storage.amount-gardenReserved());setButtonText(el(kind),(kind==='store'?'土を預ける':'土を取り出す')+'（'+storageAmountText(targets[kind]?.amount??8)+'）');}
  setButtonText(el('storageHelp'),storageJob?'土を移しています。現場へ戻ると作業の様子が見られます。':!owned?'シャベルを受け取ると土を移せます。':'手元：'+storageAmountText(s.frame.soil.containers.shovel.amount)+'。箱のふちで、シャベルを使って土を移します。');
  setHidden(el('digKind'),s.mode!=='excavating');el('digKind').dataset.workBlocked=String(!ok);setButtonText(el('digKind'),'掘り方 '+(basinDig?'穴':'土')+'［M］');setButtonText(el('scoop'),(basinDig?'穴を掘る':'すくう')+(keyLabel?'［'+EXCAVATOR_KEYS.scoop+'］':''));
  setButtonText(el('pour'),'保管庫へ預ける'+(keyLabel?'［'+EXCAVATOR_KEYS.pour+'］':''));
  setButtonText(el('pourDump'),'ダンプへ積む'+(keyLabel?'［'+EXCAVATOR_KEYS.pourDump+'］':''));setDisabled(el('scoop'),!scoopAim(s));el('pour').dataset.workBlocked=String(!ok||!s.frame.soil.containers.bucket.amount);el('pourDump').dataset.workBlocked=String(!ok||!s.frame.soil.containers.bucket.amount);setHidden(el('storeDump'),false);el('storeDump').dataset.workBlocked=String(!ok||!targets.storeDump);
  setHidden(el('fleet'),!onFleet||s.mode!=='foot');setDisabled(el('fleet'),!play.canExit||ending||planning||jump.airborne||saveFailed);setDisabled(el('resume'),ending||play.busy||session.blocked||!!session.intent||failed||saveFailed);setHidden(el('save'),saveFailed||!!trial);setDisabled(el('save'),!!trial||ending||play.busy||session.blocked||!!session.intent||planning||saveFailed);setDisabled(el('exit'),!!trial||ending||!play.canExit||planning||saveFailed);setHidden(el('retry'),!saveFailed);setDisabled(el('retry'),ending||play.busy);setHidden(el('recovery'),!!trial);setDisabled(el('recovery'),!!trial||ending||play.busy||session.blocked||!!session.intent||planning||failed||saveFailed);syncEntry();
  const v=m.linkedPourVisual(s),g=m.scoopVisual(s),d=dumpUnloadVisual(s),hand=shovelToolPose(s.frame);const bin=nativeStorageBin(s.frame),storageText='保管庫の土　'+storageAmountText(s.frame.soil.containers.storage.amount-gardenReserved());
  setButtonText(el('storageStatus'),storageText);
  setHidden(el('storageNearby'),!play.active||Math.hypot(bin.x-s.frame.player.x,bin.z-s.frame.player.z)>220);
  setButtonText(el('storageNearby'),storageText);
  setButtonText(el('amount'),aboard?'ショベルカー操縦中':dr?'ダンプカー運転中':'工事現場');
  setHidden(el('toolStock'),dr);
  setButtonText(el('toolStockLabel'),aboard?'バケットの土':'手持ちの土');
  const toolSoil=aboard?(s.link?.kind==='storage'?m.linkedStorageVisual(s).bucket:s.scoop?g.bucket:v.bucket):hand.soil;
  const dumpSoil=s.unload?d.cargo:v.cargo;
  setButtonText(el('toolStockAmount'),toolSoil?storageAmountText(toolSoil):'空');
  setButtonText(el('dumpStockAmount'),dumpSoil?storageAmountText(dumpSoil):'空');
  const cameraButton=el('view');
  setButtonText(cameraButton,'視点：'+({chase:'後方',high:'上方',eye:'目線'}[view?.mode]??'後方'));
  if(view?.mode==='eye')delete cameraButton.dataset.gameAction;
  else if(cameraButton.dataset.gameAction!=='camera')cameraButton.dataset.gameAction='camera';
  setHidden(el('face'),!play.active||s.mode!=='foot');setDisabled(el('face'),!ok);setHidden(el('aimHelp'),s.mode!=='foot'||!s.frame.soil.containers.shovel.amount||!!s.frame.job);setHidden(el('dig'),s.mode==='foot'&&!!s.frame.soil.containers.shovel.amount);setButtonText(el('drop'),s.frame.soil.containers.shovel.amount?'ここに置く':'土を置く');const moving=transportWorkMoving(s),visibleSave=ending||play.busy&&!play.savingAutomatically;setHidden(el('stroke'),quietBoarding||!visibleSave&&!moving&&!planning&&!dropPlanning&&!dropApproach);if(!el('stroke').hidden)el('progress').value=dropApproach?Math.min(99,Math.max(0,(s.frame.player.travel-dropApproach.startTravel)/dropApproach.distance*100)):planning||previewBusy||dropPlanning?0:transportWorkProgress(s);if(visibleSave)el('progress').removeAttribute('value');setButtonText(el('stage'),session.blocked?'保存待ち':visibleSave?'保存中…':dropPlanning?'置き先への道を確認中…':dropApproach?'置き先へ移動中':planning||previewBusy?'土の動きを確認中…':play.paused&&moving?'途中で一時停止中':s.frame.job?(s.frame.job.kind==='store'?'保管箱へ土を預けています':s.frame.job.kind==='take'?'保管箱から土を取り出しています':'シャベルで作業中'):s.scoop?({aim:'穴を掘る向きへ旋回',prepare:'基本姿勢',lower:'ブームを下げる',draw:'土へアームを寄せる',cut:'すくい込み',close:'バケットを閉じる',lift:'ブームを上げる',done:'完了'}[g.phase]):s.unload?(s.unload.destination==='storage'?'保管箱へ土を預けています':'荷下ろし中'):s.link?.kind==='storage'?'保管箱から土をすくっています':s.link?.kind==='pour'?(s.link.plan?.kind==='ground-pour-v1'?'地面へ土をこぼしています':s.link.plan?.kind==='storage-drop-v1'?'保管庫へ土を預けています':'荷台へ積込み中'):moving?'乗り降り中':'');
  panel.classList.toggle('transport-on-foot',play.active&&s.mode==='foot');
  syncHandEarth(s);setHidden(el('dash'),!play.active);const p=panel.querySelector('[data-construction-pad]');setHidden(p,exc&&document.documentElement.dataset.controlDisplay!=='touch');pad?.sync();dash?.sync();syncActionFeedback();
 }
 const recovery=createTransportRestoreView({panel,service,session,pause:()=>play.pause(),onApplied:()=>{dropSelection=null;scanKey=previewKey=groundPreviewKey='';groundPreviewSoil=previewBoxes=previewPlan=null;storageFocus=false;view.setYaw(constructionCameraBaseYaw(session.state));renderWork();proof();buttons();status('土・人物・車両を復元しました。一時停止しています。');},onClose:goPlay=>{if(goPlay){try{play.resume();canvas.focus({preventScroll:true});status('作業の続きを進めよう。');}catch(error){status(error.message,'error');menu();}buttons();}else menu();}});
 el('recovery').onclick=()=>{if(jump.airborne){refuseWork('あそびにもどって、着地してから戻そう。');return;}if(play.busy||session.blocked||session.intent||planning||ending||failed)return;el('sheet').close();recovery.show();};
 async function chooseDrop(point,target){
  const token=++dropToken,frame=session.state.frame;dropPlanning=true;dropSelection={point:[...point],target,plan:null};scanKey='';scan();buttons();status('置き先への道を確認しています。');
  try{const plan=await planHandArea(frame,point,{yieldNow:()=>new Promise(r=>requestAnimationFrame(r)),cancelled:()=>token!==dropToken||!play.canAdvance||document.hidden});if(token!==dropToken||session.state.frame!==frame||!play.canAdvance)return;dropSelection.plan=plan;dropSelection.target=plan.target??target;status(plan.points?'黄色い枠に置けます。「ここに置く」で、必要な分だけ近づいて置きます。':'');}
  catch(e){if(token===dropToken)refuseWork('置き先を確認できませんでした。土は手元に残ります。');}
  finally{if(token===dropToken){dropPlanning=false;scanKey='';scan();buttons();}}
 }
 async function selectedDrop(id){
  const selection=dropSelection,token=++dropToken,frame=session.state.frame;dropPlanning=true;buttons();
  try{const plan=await planHandArea(frame,selection.point,{yieldNow:()=>new Promise(r=>requestAnimationFrame(r)),cancelled:()=>token!==dropToken||!play.canAdvance||document.hidden});if(token!==dropToken||session.state.frame!==frame||!play.canAdvance)return;dropPlanning=false;selection.plan=plan;selection.target=plan.target??selection.target;scanKey='';if(!plan.points){status('');return;}if(plan.points.length){dropApproach={id,point:[...plan.point],points:plan.points.map(p=>[...p]),heading:plan.heading,startTravel:frame.player.travel,distance:plan.points.reduce((d,p,i)=>d+Math.hypot(p[0]-(i?plan.points[i-1][0]:frame.player.x),p[1]-(i?plan.points[i-1][1]:frame.player.z)),0)};status('土を持って置き先へ近づいています。「移動をやめる」かメニューで止まります。');}else{play.move('turnBucketWalker',plan.heading);play.move('startBucketSiteHand','drop',id,plan.point);await write('選んだ場所へ土を置きます。',{continueWork:true});}}
  finally{if(!disposed){if(token===dropToken)dropPlanning=false;scanKey='';scan();buttons();}}
 }
 el('stopPlace').onclick=()=>{if(!dropApproach)return;reset();status('移動をやめました。土は手元に残っています。');buttons();};
 function menu(){if(disposed||!play.active||recovery.open)return;tickTrialClock();if(trial)trial.lastAt=null;stopPreviewPlan();play.pause();el('sheet').showModal();proof();buttons();}
 // Give the saving notice a painted frame before synchronous validation. A
 // hidden page may stop animation frames, so visibility/fallback also release
 // the wait. One owner cancels all pending callbacks on completion/disposal.
 function savePaint(){
  if(disposed||document.hidden)return Promise.resolve();
  return new Promise(resolve=>{let first=0,second=0,timer=0,settled=false;
   const done=()=>{if(settled)return;settled=true;cancelAnimationFrame(first);cancelAnimationFrame(second);clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);pendingPaint=null;resolve();};
   const hidden=()=>{if(document.hidden)done();};pendingPaint=done;document.addEventListener('visibilitychange',hidden);
   first=requestAnimationFrame(()=>{first=0;second=requestAnimationFrame(done);});timer=setTimeout(done,80);
  });
 }
 function markSaveFailed(){
  saveFailed=true;
  play.pause();
  status('セーブできませんでした。作業内容は残っています。「セーブをやり直す」で続けられます。','error');
 }
 function reportBlockedSave(error){
  if(!session.blocked||!onBlockedSave)return false;
  saveNoticeShown=true;
  onBlockedSave(error);
  return true;
 }
 function showSaveFailure(error){
  markSaveFailed();
  if(!reportBlockedSave(error)&&!el('sheet').open)el('sheet').showModal();
 }
 async function retrySave(){
  if(disposed||!saveFailed||ending||play.busy)throw Error('保存を確認しています。少し待ってからお試しください。');
  ending=true;status('セーブをやり直しています…');buttons();
  try{
   await savePaint();if(disposed)return;
   if(session.intent)await play.retry();else await play.save({rainTrial:pendingTrialResult});
   pendingTrialResult=null;
   autoSaveGate.checked();
   if(disposed)return;
   saveFailed=saveNoticeShown=false;scanKey='';
   status('セーブしました。「あそびにもどる」で続けられます。');
   if(!el('sheet').open)el('sheet').showModal();
  }catch(error){if(!disposed)markSaveFailed();throw error;}
  finally{ending=false;proof();buttons();}
 }
 function advanceSavingApproach(){
  const approach=savingApproach;
  if(!approach)return;
  const now=performance.now(),seconds=(now-approach.updatedAt)/1000;
  approach.updatedAt=now;
  // Show only the checked path before contact or release. Use real elapsed
  // time so the frame-limited driving clock cannot stall the first motion.
  if(!document.hidden&&!el('sheet').open&&!recovery.open)
   approach.elapsed=Math.min(approach.limit,approach.elapsed+seconds*approach.rate);
 }
 async function write(message,{continueWork=false,quiet=false,approachKind,paint=true}={}){
  if(jump.airborne){refuseWork('着地してからセーブしよう。');return;}
  if(trial||quarryFlight||disposed||ending||play.busy||session.blocked||session.intent||saveFailed)return false;
  ending=true;
  const work=session.state;
  const scoop=approachKind==='scoop'?work.scoop:null;
  const pour=approachKind==='pourDump'&&work.link?.kind==='pour'&&work.frame.soil.pending?.to==='dump'?work.link:null;
  if(scoop){
   const limit=Math.max(0,scoop.plan.cuts[0].time-.035);
   savingApproach={kind:'scoop',id:scoop.id,elapsed:scoop.elapsed,limit,rate:scoopApproachRate(scoop.plan),updatedAt:performance.now()};
  }else if(pour){
   const limit=Math.max(0,pour.plan.flowStart-.05);
   savingApproach={kind:'pourDump',id:pour.id,elapsed:pour.elapsed,limit,rate:3,updatedAt:performance.now()};
  }
  if(!quiet)status(savingApproach?'バケットを動かしています…':'現場を保存しています…');buttons();
  try{
   if(!savingApproach&&paint)await savePaint();
   if(disposed)return false;
   await play.save({rainTrial:pendingTrialResult});pendingTrialResult=null;autoSaveGate.checked();if(disposed)return true;scanKey='';
   if(!quiet)status(message);
   if(continueWork&&!document.hidden&&!el('sheet').open&&!recovery.open){
    play.resume();
    advanceSavingApproach();
    if(savingApproach?.elapsed>0){
     const {kind,id,elapsed}=savingApproach;
     if(kind==='scoop'&&session.state.scoop?.id===id)play.move('confirmScoopApproach',elapsed);
     if(kind==='pourDump'&&session.state.link?.id===id){
      let remaining=elapsed-session.state.link.elapsed;
      while(remaining>1e-9){
       const step=Math.min(.05,remaining);
       play.move('progressBucketLink',step);
       remaining-=step;
      }
     }
    }
   }
   return true;
  }
  catch(e){if(!disposed)showSaveFailure(e);return false;}
  finally{savingApproach=null;ending=false;proof();buttons();}
 }
 function offeredTrial(){
  if(!play.active||pendingTrialResult)return null;
  const kind=chapterTrialKind(),mode=session.state.mode;
  return kind&&(kind.startsWith('dump-')?mode==='driving':mode==='excavating')?kind:null;
 }
 function trialInstruction(run){
  if(run.route){
   if(run.parkedAt!==null)return 'その位置で停車。駐車を確認しています。';
   const p=run.kind==='excavator-arrival'?rainExcavatorPoint(session.state):rainDumpWorldPoint(session.state),nearBay=Math.hypot(p.x-run.route.bay.x,p.z-run.route.bay.z)<240;
   const {route,waypoint,progress}=run,outside=rainDumpOutsideGarage(route,p.x,p.z);
   if(run.kind==='dump-haul'&&nearBay)return '保管庫に荷台を向け、後退で黄色い枠まで寄せよう。';
   if(run.kind==='dump-haul'&&!outside)return '横通路を通り、駐車場の'+(route.exitSide==='西'?'東':'西')+'側にある保管庫へ。';
   if(run.kind.endsWith('-arrival')&&waypoint<route.hillStart){
    if(waypoint===0)return '駐車枠から前進。正面の横通路で'+route.garageTurn+'へ曲がろう。';
    if(waypoint<=2)return '横通路を'+route.exitSide+'へ。最後の重機を過ぎたら、山道の入口へ進もう。';
    return '駐車場の外へ出て、斜め前の坂道の中央に車体を合わせよう。';
   }
   if(run.kind==='excavator-arrival'&&waypoint>=route.summitStart){
    return waypoint<route.path.length-2?'矢印に沿って、停めたダンプカーを回り込もう。':'山肌の手前にある黄色い枠で停車しよう。';
   }
   if(run.kind==='dump-arrival'&&waypoint>=route.summitStart){
    return waypoint+2<route.path.length?'山頂の広場で折り返し、黄色い枠に向かおう。':'来た道を向いて、ドアの前に足場がある枠の中央で停車しよう。';
   }
   if(progress?.distance>54)return '矢印の並ぶ道へ、ゆるい斜面から合流しよう。';
   const leg=route.path[waypoint],next=route.path.find((s,i)=>i>waypoint&&s.start>=leg.start+126);
   if(next){
    const angle=Math.atan2(next.dx,next.dz)-Math.atan2(leg.dx,leg.dz),bend=Math.atan2(Math.sin(angle),Math.cos(angle));
    if(Math.abs(bend)>.24)return 'この先は'+(bend>0?'左':'右')+'へ曲がります。矢印に沿って曲がろう。';
   }
   return run.kind==='dump-haul'?'山道を道なりに下り、保管庫へ。':'坂道を道なりに上り、山頂の採土場へ。';
  }
  if(run.kind==='dump-unload')return document.documentElement.dataset.controlDisplay==='touch'?'「保管庫へ下ろす」で荷台を空にしよう。':'Hで土を下ろし、荷台が戻るまで待とう。';
  const touch=document.documentElement.dataset.controlDisplay==='touch';
  if(run.kind==='summit-load'){
   const s=session.state,{bucket,dump}=s.frame.soil.containers,meter='荷台 '+dump.amount+' / '+SOIL_CAPACITY.dump+'　';
   if(run.returnYaw!=null)return meter+'アームを採土方向へ戻しています。';
   if(s.mode!=='excavating')return meter+'採土できる山肌の近くへダンプを動かし、降りてショベルカーへ戻ろう。';
   return meter+(bucket.amount?(touch?'荷台の横で「ダンプへ積む」':`荷台の横で ${EXCAVATOR_KEYS.pourDump} を押して積もう。`):
    (touch?'黄色い区画の山肌に向けて「すくう」を押そう。':`黄色い区画の山肌に向けて ${EXCAVATOR_KEYS.scoop} ですくおう。`));
  }
  return run.kind==='excavator-load'?(touch?'「ダンプへ積む」で荷台に土を入れよう。':`${EXCAVATOR_KEYS.pourDump}でバケットの土を荷台へ積もう。`):
   (touch?'山頂の黄色い区画にある山肌に向けて「すくう」を押そう。':`山頂の黄色い区画にある山肌にバケットを向けて、${EXCAVATOR_KEYS.scoop}ですくおう。`);
 }
 function syncTrialControls(){
  const button=el('startTrial'),clock=el('trialTime'),signal=el('trialSignal');
  const offer=offeredTrial();
  const scoopOffer=!trial&&['excavator-scoop','summit-load'].includes(offer)?offer:null;
  setHidden(el('scoop'),!!scoopOffer);
  setHidden(button,!offer||!!trial);
  setDisabled(button,!enabled()||!!session.state.frame.soil.pending);
  const keyHint=document.documentElement.dataset.controlDisplay==='touch'?'':'［1］';
  setButtonText(el('trialTitle'),trialTitles[offer]??'');
  setButtonText(el('trialStartLabel'),(trialFailed?'再挑戦':'ミッション開始')+keyHint);
  setHidden(clock,!trial||trial.countdownMs>0);
  panel.classList.toggle('transport-timed',!!trial);
  setHidden(signal,!trial||trial.countdownMs<=0);
  setHidden(el('cancelTrial'),!trial);
  if(!trial)return offer;
  showConstructionIntroCue(signal,signal.hidden?'':constructionMissionIntroText(trial.countdownMs));
  if(!clock.hidden){
   const remaining=Math.ceil((trial.limitMs-trial.elapsedMs)/1000);
   const minutes=String(Math.floor(remaining/60)).padStart(2,'0'),seconds=String(remaining%60).padStart(2,'0');
   setButtonText(clock,'残り '+minutes+':'+seconds);
   clock.classList.toggle('urgent',remaining<=10);
  }
 }
 async function startTrial(){
  const kind=offeredTrial();
  if(trial||!enabled()||!kind)return;
  const {bucket,dump}=session.state.frame.soil.containers;
  if(kind==='dump-arrival'&&!hasQuarryRange(session.state.frame.soil)){refuseWork('山道の準備が完了してから作業を始めよう。');return;}
  if(kind==='dump-arrival'&&dump.amount&&!service.ledger.world.rainWorksV1?.dumpArrival){refuseWork('空のダンプカーで挑戦しよう。');return;}
  if((kind==='dump-haul'||kind==='dump-unload')&&dump.amount!==SOIL_CAPACITY.dump){refuseWork('ダンプカーの荷台を満載にしてから挑戦しよう。');return;}
  if(kind==='dump-unload'&&m.dumpStoragePlan(session.state)?.amount!==dump.amount){refuseWork('荷台の後ろを保管庫に合わせ、満載の土を下ろせる空きを確保しよう。');return;}
  if(kind==='excavator-scoop'&&bucket.amount){refuseWork('バケットの土を先に下ろしてから挑戦しよう。');return;}
  stopPreviewPlan();
  // The accepted starting pose and earlier works remain the saved baseline.
  if(play.dirty&&!await write('',{continueWork:true,quiet:true}))return;
  if(!enabled()||offeredTrial()!==kind)return;
  const route=kind==='excavator-arrival'?rainExcavatorRoute(session.state):kind==='dump-arrival'?rainDumpArrivalRoute(session.state):kind==='dump-haul'?rainDumpHaulRoute(session.state):null;
  const waypoint=kind==='excavator-arrival'?rainDumpRoutePosition(route,rainExcavatorPoint(session.state)).index:route?rainDumpRouteStart(session.state,route):0;
  trial={kind,countdownMs:CONSTRUCTION_MISSION_INTRO_MS,limitMs:rainConstructionTrialLimit(kind),
   elapsedMs:0,lastAt:performance.now(),look:view.captureLook(),driving:excavatorDriving,basin:basinDig,
   cell:null,scoopYaw:null,returnYaw:null,route,waypoint,target:route?.waypoints[waypoint]??route?.bay,parkedAt:null,startTravel:kind==='excavator-arrival'?session.state.frame.machineVehicle.wheelTravel:session.state.vehicleTravel,startPosition:kind==='excavator-arrival'?rainExcavatorPoint(session.state):null};
  reset();
  basinDig=false;trialFailed=false;previewKey='';previewBoxes=previewPlan=null;
  status('');
  buttons();
 }
 function endTrial(expired){
  const before=trial;if(!before)return;
  try{session.discardUnsaved();}
  catch(error){play.pause();status(error.message,'error');buttons();return;}
  trial=null;quarryFlight=null;trialFailed=expired;
  arrivalMarkers?.update();
  stopPreviewPlan();
  reset();scanKey=previewKey=groundPreviewKey='';
  groundPreviewSoil=previewBoxes=previewPlan=null;
  excavatorDriving=before.driving;basinDig=before.basin;excavatorPivotTravel=0;
  view.restoreLook(before.look);
  setHostPose(transportWorldPose(play.record));renderWork();proof();
  status(expired?'時間切れ。開始時点に戻りました。':'ミッションを中止し、開始時点に戻りました。',expired?'warning':'');
  buttons();
 }
 function tickTrialClock(){
  if(!trial)return;
  if(!play.canAdvance||document.hidden||constructionOverlayOpen()){trial.lastAt=null;return;}
  const now=performance.now();
  const delta=trial.lastAt===null?0:Math.max(0,now-trial.lastAt);
  trial.lastAt=now;
  if(trial.countdownMs>0){trial.countdownMs=advanceConstructionMissionIntro(trial.countdownMs,delta);return;}
  trial.elapsedMs+=delta;
  if(trial.elapsedMs>=trial.limitMs){endTrial(true);return;}
  if(trial.route&&!quarryFlight)advanceArrival();
 }
 function advanceArrival(){
  const run=trial,s=session.state,p=run.kind==='excavator-arrival'?rainExcavatorPoint(s):rainDumpWorldPoint(s);
  run.progress=rainDumpRoutePosition(run.route,p,run.waypoint);
  run.waypoint=run.progress.index;
  run.target=run.route.waypoints[run.waypoint]??run.route.bay;
  const isArrival=run.kind.endsWith('-arrival');
  const aligned=run.kind==='excavator-arrival'?rainExcavatorParked(s,run.route):isArrival?rainDumpParked(s,run.route,!!service.ledger.world.constructionCourseV1):m.dumpStoragePlan(s)?.amount===SOIL_CAPACITY.dump;
  const excavatorTravel=run.startPosition?Math.max(Math.hypot(p.x-run.startPosition.x,p.z-run.startPosition.z),Math.abs(s.frame.machineVehicle.wheelTravel-run.startTravel)):0;
  if(!aligned||input.vector.x||input.vector.z||run.kind==='dump-arrival'&&s.vehicleTravel-run.startTravel<40||run.kind==='excavator-arrival'&&excavatorTravel<40){
   run.parkedAt=null;return;
  }
  run.parkedAt??=run.elapsedMs;
  if(run.elapsedMs-run.parkedAt>=700)clearTrial(isArrival?(run.kind==='excavator-arrival'?'山頂に到着！ 次は土を掘って積もう。':'山頂に駐車できたよ。次はショベルカーに乗ってみよう。'):'運搬完了！ 次は保管庫に土を下ろそう。');
 }
 function clearTrial(message){
  pendingTrialResult={course:!!service.ledger.world.constructionCourseV1,type:trial.kind,cell:trial.cell,elapsedMs:trial.elapsedMs};
  basinDig=trial.basin;trial=null;
  arrivalMarkers?.update();
  void write(message,{continueWork:true,paint:false});
 }
 el('startTrial').onclick=()=>void startTrial();
 el('cancelTrial').onclick=()=>globalThis.IMASORA_CONFIRM_ACTION('今回の作業を開始時点に戻して、ミッションを中止しますか？',()=>endTrial(false));
 function workProblem(kind){
  const s=session.state,{bucket,storage,dump,shovel}=s.frame.soil.containers;
  if(kind==='board'||kind==='boardExc'){const lock=constructionVehicleLock(kind==='board'?'dump':'excavator');if(lock)return lock;}
  if(!trial&&service.ledger.world.constructionCourseV1&&offeredTrial()&&['scoop','pourDump','storeDump','unload'].includes(kind))return 'ミッションを開始してから作業しよう。';
  if(trial&&(['pour','digKind','dig','drop','load','store','take','unload'].includes(kind)||['leaveExc','leave'].includes(kind)&&trial.kind!=='summit-load'||kind==='storeDump'&&trial.kind!=='dump-unload'||kind==='pourDump'&&!['excavator-load','summit-load'].includes(trial.kind)||kind==='scoop'&&!['excavator-scoop','summit-load'].includes(trial.kind)))return 'ミッション中です。案内に沿って作業しよう。';
  if(jump.airborne)return 'まだ空中です。着地してから操作してください。';
  if(session.blocked)return '保存を確認できませんでした。メニューから保存をやり直してください。';
  if(play.paused)return '一時停止中です。「あそびにもどる」で再開してください。';
  if(ending||play.busy||session.intent)return '保存中です。保存が終わると操作できます。';
  if(transportWorkMoving(s)||planning||summitExitYaw!==null||kind==='scoop'&&trial?.returnYaw!=null)return '作業中です。今の動きが終わってから操作してください。';
  if(!enabled())return '移動やほかの操作が終わってから押してください。';
  if(kind==='scoop'&&bucket.amount)return 'バケットに土が入っています。先に土を下ろしてください。';
  if(kind==='scoop'&&s.frame.soil.journal.length>SOIL_LIMITS.history-3)return '土の作業記録が上限に達しました。';
  if(['pour','pourDump'].includes(kind)&&!bucket.amount)return 'バケットに土が入っていません。先に土をすくってください。';
  if(kind==='pour'&&storage.amount>=SOIL_CAPACITY.storage)return '保管庫がいっぱいです。手で土を使うと空きができます。';
  if(kind==='storeDump'){
   if(!dump.amount)return 'ダンプの荷台に土がありません。';
   if(!targets.storeDump)return storage.amount>=SOIL_CAPACITY.storage?'保管庫がいっぱいです。手で土を使うと空きができます。':'荷台の後ろを土の保管庫に合わせてください。';
  }
  if(kind==='drop'&&!shovel.amount)return 'シャベルに土を持っていません。先に土をすくってください。';
  return '';
 }
 function exitFacesDump(s,exit){
  const {dump,machineVehicle}=s.frame,p=exit.path.at(-1);
  return Math.hypot(p.x-dump.x,p.z-dump.z)<Math.hypot(machineVehicle.x-dump.x,machineVehicle.z-dump.z);
 }
 async function findSummitExitYaw(s,exit){
  const options=[{state:s,direction:1},{state:s,direction:-1}];
  let fallback=exit?s.frame.machineArm.slew:null;
  // Keep the first safe exit as a fallback, but look for one on the dump side.
  while(options.some(option=>option.state)){
   for(const option of options){
    if(!option.state)continue;
    for(let j=0;j<3;j++){
     const next=m.slewBucketWork(option.state,option.direction,.05);
     if(next.frame.machineArm.slew===option.state.frame.machineArm.slew){option.state=null;break;}
     option.state=next;
     const exit=m.linkedAccessTarget(next,false);
     if(exit){
      const yaw=next.frame.machineArm.slew;
      if(exitFacesDump(next,exit))return yaw;
      fallback??=yaw;
     }
    }
   }
   await new Promise(resolve=>requestAnimationFrame(resolve));
   if(disposed||!play.canOperate)return null;
  }
  return fallback;
 }
 async function work(kind){
  if(kind==='scoop'&&!scoopAim(session.state))return;
  if((kind==='dig'||kind==='drop')&&el(kind).disabled)return;
  const problem=kind==='scoop'?'':workProblem(kind);
  if(problem){refuseWork(problem);return;}
  workNoticeUntil=0;
  const attempt=trial;
  let cut=null;
  const checkedScoop=kind==='scoop'?previewPlan:null;
  reset();
  const boarding=kind==='boardExc'||kind==='board';
  if(boarding){quietBoarding=true;status('');}
  try{
   if(['scoop','dig'].includes(kind))play.move('openScoopGround');
   const s=session.state,id=crypto.randomUUID().replaceAll('-','');
   if(kind==='drop'&&dropSelection?.point){await selectedDrop(id);return;}
   if(kind==='leaveExc'&&chapterTrialKind()==='dump-haul'){
    const exit=m.linkedAccessTarget(s,false);
    if(!exit||!exitFacesDump(s,exit)){
     planning=true;buttons();
     const yaw=await findSummitExitYaw(s,exit);
     if(disposed||!play.canOperate)return;
     if(yaw===null)throw Error('降り口がふさがっています。車体を広い場所へ動かしてから降りよう。');
     if(yaw!==s.frame.machineArm.slew){
      summitExitYaw=yaw;
      status('ダンプカーへ向かって降りられるように旋回しています。');
      return;
     }
    }
   }
   if(['scoop','pour','pourDump'].includes(kind)){
    const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    planning=true;buttons();
    const plan=kind==='pour'?await m.bucketStorageDepositPlanAsync(s,nextFrame)
      :kind==='pourDump'?await m.bucketDumpPlanAsync(s,nextFrame)
      :checkedScoop;
    if(disposed||attempt&&trial!==attempt)return;
    if(!play.canOperate)throw Error('作業を一時停止しました。現場へ戻ってから押してください。');
    if(kind==='scoop'&&['excavator-scoop','summit-load'].includes(attempt?.kind)&&plan){
     cut=rainExcavatorTrialCut(s,plan);
     if(!cut)throw Error('山頂の黄色い区画にある山肌にバケットを向けよう。');
    }
    // The scoop plan was already checked for this pose. Reserve the soil
    // immediately and play its opening motion during the save.
    if(!plan)throw Error(kind==='scoop'?(basinDig?'この場所からは水をためる穴を掘れません。舗装の外の平らな地面にバケットを向けてください。':(aimedScoop?'この位置から刃が届く土がありません。バケットの高さやアームの伸びを調整しよう。':'爪が届く土へ向きを変えてください。')):kind==='pourDump'?'アームが荷台まで動けません。荷台側に向き直し、車体が近すぎるときはショベルカーを少し離してください。':'アームの届く位置へ移動し、保管庫の空きと通り道を確認してください。');
   }
  planning=false;if(kind==='pour')storageFocus=true;if(kind==='pourDump'||kind==='leaveExc'||kind==='scoop')storageFocus=false;['dig','load','drop','store','take'].includes(kind)?(kind==='drop'&&dropSelection?.point?play.move('startBucketSiteHand',kind,id,[...dropSelection.point]):play.move('startBucketSiteHand',kind,id)):kind==='scoop'?play.move(basinDig?'startBasinScoop':aimedScoop?'startAimedScoop':'startScoopDump',id):kind==='pour'?play.move('startBucketStorageDeposit',id):kind==='pourDump'?play.move('startBucketPour',id):kind==='boardExc'?play.move('startBucketAccess',true):kind==='leaveExc'?play.move('startBucketAccess',false):kind==='board'?play.move('boardBucketSiteDump'):kind==='leave'?play.move('leaveBucketSiteDump'):kind==='storeDump'?play.move('startBucketSiteStorage',id):play.move('startBucketSiteUnload',id);
  if(attempt){
   attempt.returnYaw=null;
   if(kind==='leaveExc'||kind==='leave')attempt.scoopYaw=null;
   if(cut){
    attempt.cell=cut.cell;
    if(attempt.kind==='summit-load')attempt.scoopYaw=s.frame.machineArm.slew;
   }
   if(!boarding&&kind!=='leaveExc'&&kind!=='leave')status(attempt.kind==='dump-unload'?'保管庫へ土を下ろしています。':kind==='pourDump'?'荷台に土を積んでいます。':'黄色い区画の土をすくっています。');
   return;
  }
  if(kind==='boardExc')view.setYaw(constructionCameraBaseYaw(session.state));
  if(boarding||kind==='leaveExc'||kind==='leave'){if(kind==='board'||kind==='leave')quietBoarding=false;if(kind==='board')view.setYaw(session.state.frame.dump.heading);}else await write('作業を始めました。メニューで一時停止できます。',{continueWork:true,approachKind:kind});
  }catch(e){
   if(boarding)quietBoarding=false;
   if(attempt&&trial!==attempt)return;
   if(!disposed&&(!attempt||trial===attempt))refuseWork(e.message);
  }finally{planning=false;if(!disposed)buttons();}
 }
 if(verification){const tools=document.createElement('details');tools.innerHTML='<summary>専用試験の操作</summary><p>この確認用アドレスだけの補助です。同じ接触・歩行処理で移動します。</p><button data-route="handDig">シャベルで掘れる位置へ歩く試験</button><button data-route="handPlace">土を置く向きに変える試験</button><button data-route="dump">荷台横へ歩く試験</button><button data-route="handLoad">荷台へ手積みする位置へ歩く試験</button><button data-route="gate">入口へ歩く試験</button><button data-route="storage">保管箱へ歩く試験</button><button data-pause>次の作業を途中で止める試験</button><button data-failure>次の保存を中断する試験</button>';el('sheet').append(tools);for(const button of tools.querySelectorAll('[data-route]'))button.onclick=()=>{if(!play.active||play.busy||session.blocked||session.intent||planning||transportWorkMoving(session.state)||session.state.mode!=='foot')return;play.resume();reset();const p=session.state.frame.player,door=shovelDumpPoint(session.state.frame,52,0,button.dataset.route==='handLoad'?-22:18);const around=p.x<0&&p.z>-80?[[p.x,40],[-160,40],[-160,-150]]:[[p.x,-150]];verifyRoute={points:button.dataset.route==='handDig'?(Math.hypot(p.x-14,p.z-26)<.1?[[p.x,p.z]]:[...(p.x>60&&p.z>-83?[[170,p.z],[170,-150]]:around),[-42,-150],[-42,26],[14,26]]):button.dataset.route==='handPlace'?[[p.x,p.z]]:button.dataset.route==='storage'?[...around,[-160,-150],[-160,40],[-150,40],[-150,-12]]:button.dataset.route==='gate'?[...around,[-230,-150],[-230,-226]]:[...around,[door[0],-150],[door[0],door[2]]],face:button.dataset.route==='handDig'?Math.PI/2:button.dataset.route==='handPlace'?-Math.PI/2:button.dataset.route==='storage'?Math.PI/2:button.dataset.route==='handLoad'?Math.atan2(Math.sin(session.state.frame.dump.heading-Math.PI/2),Math.cos(session.state.frame.dump.heading-Math.PI/2)):null};el('sheet').close();status('同じ接触判定で歩いています。メニューで止められます。');};tools.querySelector('[data-pause]').onclick=()=>{verifyPause=true;status('次の作業を0.8秒で一時停止する試験を準備しました。');};tools.querySelector('[data-failure]').onclick=()=>{service.store.failNext=true;status('次の保存だけを中断する試験を準備しました。');};}
 el('storage').onclick=menu;
 for(const kind of ['store','take'])el(kind).onclick=()=>{if(el(kind).disabled)return;scanKey='';scan();if(!targets[kind]){status('箱へ近づき、土と空きを確認してください。');buttons();return;}try{play.resume();el('sheet').close();canvas.focus({preventScroll:true});void work(kind);}catch(e){status(e.message);buttons();}};
 el('fleet').onclick=()=>void leave({then:onFleet});
 el('help').onclick=()=>{reset();openConstructionGuide(session.state.mode==='excavating'?'excavator':session.state.mode==='driving'?'dump':'shovel');};
 el('menu').onclick=menu;el('resume').onclick=()=>{try{play.resume();el('sheet').close();canvas.focus({preventScroll:true});status('');}catch(e){status(e.message);}buttons();};el('sheet').addEventListener('cancel',e=>e.preventDefault());
 const sheet=el('sheet');
 const onMap=(e)=>{const r=sheet.getBoundingClientRect();return e.target===sheet&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);};
 let outsideStart=false;sheet.addEventListener('pointerdown',e=>{outsideStart=onMap(e);});
 sheet.addEventListener('click',e=>{if(outsideStart&&onMap(e)&&!el('resume').disabled)el('resume').click();outsideStart=false;});
 el('save').onclick=()=>globalThis.IMASORA_CONFIRM_ACTION('今の状態をセーブしますか？',()=>void write('セーブできたよ！'));el('retry').onclick=async()=>{
  if(el('retry').disabled||!saveFailed)return;
  const hadNotice=saveNoticeShown;
  try{await retrySave();if(!disposed&&hadNotice)onSaveRecovered();}
  catch(error){if(!disposed)reportBlockedSave(error);}
 };el('view').onclick=()=>{status('視点：'+view.cycle());buttons();};el('face').onclick=()=>{if(!enabled()||session.state.mode!=='foot')return;view.setYaw(constructionCameraBaseYaw(session.state));view.resetPitch();status('モンスターの正面へ視点をそろえました。');};
 el('begin').onclick=()=>{try{play.begin({x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z});initialLanding=false;owns(true);view.attachActor();view.setYaw(constructionCameraBaseYaw(session.state));menu();status('準備できたよ！「あそびにもどる」でスタート。');}catch(e){refuseWork(e.message);}};
 async function leave({force=false,then}={}){if(trial){refuseWork('メニューでミッションを中止してから戻ろう。');return false;}if(jump.airborne){refuseWork('あそびにもどって、着地してから戻ろう。');return false;}
  if(disposed||ending||!play.active||play.busy||session.blocked||session.intent||saveFailed||(!play.canExit&&!force))return false;ending=true;play.pause();status('現場を保存して戻っています…');buttons();
  try{await savePaint();if(disposed)return false;const p=await play.exit({force});autoSaveGate.checked();if(disposed)return true;el('sheet').close();owns(false);setHostPose(p);onExit();then?.();status('現場を保存しました。入口から再開できます。');proof();return true;}
  catch(e){if(!disposed){showSaveFailure(e);proof();}return false;}
  finally{ending=false;buttons();}
 }
 el('aimMode').onclick=()=>{
  if(!enabled()||basinDig||transportWorkMoving(session.state))return;
  aimedScoop=!aimedScoop;
  stopPreviewPlan();
  workNoticeUntil=performance.now()+3000;
  status(aimedScoop?'高さとアームの伸びを合わせ、すくう場所を狙おう。':'すくうときはアームが基本位置から土に向かいます。');
  buttons();
 };
 el('digKind').onclick=()=>{const problem=workProblem('digKind');if(problem){refuseWork(problem);return;}reset();stopPreviewPlan();basinDig=!basinDig;previewKey='';previewBoxes=previewPlan=null;buttons();status(basinDig?'水をためる穴を掘るよ。枠の土はすべてバケットに入り、ダンプへ運べるよ。':'爪が触れる土をすくうよ。');};el('excMode').onclick=()=>{const problem=workProblem('view');if(problem){refuseWork(problem);return;}reset();excavatorDriving=!excavatorDriving;previewKey='';previewBoxes=previewPlan=null;buttons();status(excavatorDriving?'走行の視点。車体のまわりを見ながら移動できます。':'作業の視点。A・Dで車体、J・Lで上部旋回体の向きを変えられます。');};el('driveExcLeave').onclick=()=>work('leaveExc');el('exit').onclick=()=>globalThis.IMASORA_CONFIRM_ACTION('今の状態をセーブして工事現場へ戻りますか？',()=>void leave());for(const id of ['dig','load','drop','scoop','pour','pourDump','boardExc','leaveExc','board','leave','storeDump'])el(id).onclick=()=>work(id);
 for(const [id,axis] of [['left',-1],['right',1]]){const b=el(id);b.addEventListener('pointerdown',e=>{const problem=workProblem('slew');if(problem){refuseWork(problem);return;}e.preventDefault();held.set(e.pointerId,axis);b.setPointerCapture(e.pointerId);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>held.delete(e.pointerId));}
 for(const id of feedbackIds){const b=id==='dash'?el('dash').firstElementChild:el(id);b.addEventListener('pointerdown',e=>{if(!enabled()||b.disabled)return;if(b.dataset.armJoint||b.dataset.steer){e.preventDefault();b.setPointerCapture(e.pointerId);play.cancelAutomaticSave();}feedbackPointers.set(e.pointerId,id);syncActionFeedback();});b.addEventListener('lostpointercapture',e=>{feedbackPointers.delete(e.pointerId);syncActionFeedback();});}
 const releaseActionPointer=e=>{feedbackPointers.delete(e.pointerId);syncActionFeedback();};
 for(const type of ['pointerup','pointercancel'])window.addEventListener(type,releaseActionPointer,true);
 dash=createHeldDashButton({element:el('dash').firstElementChild,enabled,context:()=>session.state.mode});input=createMonsterTravelInput({enabled:travelInputEnabled,context:()=>session.state.mode,keyDirection:constructionTravelDirection,fastHeld:()=>dash.active||feedbackKeys.has('KeyK'),clearFast:()=>dash.cancel()});
 pad=createConstructionMovePad({element:panel.querySelector('[data-construction-pad]'),input,enabled:travelInputEnabled,onChange:()=>{if(input.vector.x||input.vector.z)play.cancelAutomaticSave();}});
 const keyEvent=e=>{
 if(!play.active||e.target?.closest?.('.world-save-error[open]'))return;
  if(el('sheet').open&&!recovery.open&&!document.querySelector('.imasora-action-confirm[open]')&&e.type==='keydown'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.target?.closest?.('input,textarea,select')&&['KeyS','KeyR','F9'].includes(e.code)){
   e.preventDefault();e.stopImmediatePropagation();
   const button=el(e.code==='KeyS'?'save':e.code==='KeyR'?'recovery':'exit');
   if(button.disabled){
    if(!saveFailed)status(e.code==='F9'&&session.state.mode!=='foot'?'重機を降りてから工事現場へ戻れます。':session.blocked?'前のセーブ結果をたしかめてから続けよう。':'作業の保存中です。完了してから押してください。');
   }else button.click();
   return;
  }
  const jumpKey=e.code==='KeyE'||e.code==='KeyB'||e.code==='KeyJ'||session.state.mode==='foot'&&e.code==='Space';
  const vehicleKey=['KeyF','KeyQ','KeyR','KeyI','KeyN','KeyM','KeyO'].includes(e.code);
  const mode=session.state.mode;
  const dumpActions={KeyH:'storeDump',KeyO:'leave'};
  const action=(mode==='excavating'?excavatorActions:mode==='driving'?dumpActions:{})[e.code];
  const slewKey=mode==='excavating'&&['KeyJ','KeyL'].includes(e.code);
  const armKey=mode==='excavating'&&session.state.frame.version===2&&excavatorArmControls.some(([,code])=>code===e.code);
  const earthKey=mode==='foot'&&(e.code==='KeyV'||handEarthMode&&['KeyC','KeyG','KeyR'].includes(e.code));
  const trialKey=e.code==='Digit1'&&!!offeredTrial();
  const workKey=!!action||slewKey||armKey||trialKey;
  const ownedRelease=e.type==='keyup'&&feedbackKeys.has(e.code);
  if(!ownedRelease&&!vehicleKey&&!workKey&&!earthKey&&!['KeyW','KeyA','KeyS','KeyD','F8','KeyE','Space','KeyK','KeyB','KeyJ','KeyX','KeyF','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))return;
  // Releases always reach their owners, even if a menu or text field took focus.
  if(e.type==='keyup'){
   feedbackKeys.delete(e.code);held.delete('key:'+e.code);
   if(jumpKey)jumpControl.key(e);
   input.key(e);syncActionFeedback();
   if(ownedRelease&&session.state.mode==='excavating')preview();
   e.stopImmediatePropagation();return;
  }
  if(recovery.open||document.querySelector('.imasora-action-confirm[open]')||panel.querySelector('dialog[data-parking-confirm][open]')){e.stopImmediatePropagation();return;}
  if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.target?.isContentEditable||e.target?.closest?.('input,select,textarea,[contenteditable=true],[role=textbox]'))return;
  keyCount++;lastKey={type:e.type,code:e.code};e.stopImmediatePropagation();e.preventDefault();
  if(earthKey){
   if(el('sheet').open)return;
   if(e.code==='KeyV'){if(!e.repeat)setHandEarthMode(!handEarthMode);return;}
   if(e.code==='KeyC'){if(!e.repeat)el('earthShape').click();return;}
   if(el(e.code==='KeyG'?'earthPlace':'earthRemove').disabled)return;
   feedbackKeys.add(e.code);
   syncActionFeedback();
   const now=performance.now();
   if(!e.repeat||now-lastHandEarthEdit>=145){lastHandEarthEdit=now;commitHandEarth(e.code==='KeyG'?'place':'remove');}
   return;
  }
  if(e.code==='F8'){if(!e.repeat){if(el('sheet').open){if(!el('resume').disabled)el('resume').click();}else menu();}return;}
  if(trialKey){if(!e.repeat&&!el('sheet').open&&!trial)void startTrial();return;}
  if(action){if(action==='scoop'&&!scoopAim(session.state))return;feedbackKeys.add(e.code);if(!e.repeat)void work(action);return;}
  if(mode==='excavating'&&e.code==='KeyR'){if(!e.repeat&&!el('aimMode').hidden)el('aimMode').click();return;}
  if(mode==='excavating'&&e.code==='KeyM'){if(!e.repeat)el('digKind').click();return;}
  if(mode==='excavating'&&e.code==='KeyN'){if(!e.repeat)el('excMode').click();return;}
  if(!enabled()){
   if(play.savingAutomatically){
    if(slewKey||armKey){feedbackKeys.add(e.code);play.cancelAutomaticSave();}
    else if((e.code==='KeyK'||constructionTravelDirection(e.code,mode))&&input.key(e))play.cancelAutomaticSave();
   }else if((slewKey||armKey)&&!e.repeat){const problem=workProblem('slew');if(problem)refuseWork(problem);}
   return;
  }
  feedbackKeys.add(e.code);
  if(slewKey||armKey)return;
  if(vehicleKey){
    if(e.repeat)return;
    if(e.code==='KeyF'&&mode==='foot'){
      const door=!el('boardExc').hidden?'boardExc':!el('board').hidden?'board':null;
      if(door)void work(door);
      else refuseWork('車のドアの目印まで近づいてから乗ろう。');
    }
    if(e.code==='KeyN'&&mode!=='excavating'&&!el('view').disabled)el('view').click();
    return;
  }
  if(jumpKey){if(session.state.mode==='foot')jumpControl.key(e);return;}
  input.key(e);
 };window.addEventListener('keydown',keyEvent,true);window.addEventListener('keyup',keyEvent,true);
 const onBlur=()=>{clearActionFeedback();if(!disposed&&play.active)menu();};
 const onVisibility=()=>{if(savingApproach)savingApproach.updatedAt=performance.now();if(document.hidden)clearActionFeedback();if(!disposed&&document.hidden&&play.active&&!recovery.open){menu();if(!ending&&!play.busy&&!session.blocked&&!session.intent&&!planning&&play.dirty)void write('セーブできたよ！');}};
 window.addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVisibility);
 for(const type of ['contextmenu','selectstart','dragstart','gesturestart','gesturechange'])panel.addEventListener(type,e=>e.preventDefault(),{passive:false});
 const down=e=>{if(!enabled()||session.state.mode!=='foot'||!handEarthMode&&!session.state.frame.soil.containers.shovel.amount||e.button!==0)return;if(tapStart){tapStart=null;return;}tapStart={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};};
 const move=e=>{if(tapStart?.id===e.pointerId&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>8)tapStart.dragged=true;};
 const up=e=>{
  const start=tapStart;if(start?.id!==e.pointerId)return;
  tapStart=null;
  if(!enabled()||!placementTap(start,e)||session.state.mode!=='foot'||!handEarthMode&&!session.state.frame.soil.containers.shovel.amount)return;
  const f=session.state.frame,hit=view.pick(e.clientX,e.clientY,f,handEarthMode);
  if(handEarthMode){
   handEarthPoint=hit?[hit[0],hit[2]]:false;
   handEarthPreview=null;buttons();return;
  }
  if(!hit){dropSelection={point:null,target:null};scanKey='';scan();buttons();status('');return;}
  const point=[hit[0],hit[2]],centre=[Math.floor(hit[0]/4)*4+2,hit[1]+2,Math.floor(hit[2]/4)*4+2],heading=travelHeading(centre[0]-f.player.x,centre[2]-f.player.z);
  if(heading!==null)play.move('turnBucketWalker',heading);
  void chooseDrop(point,centre);
 };
 const cancelTap=()=>{tapStart=null;};for(const[type,fn]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancelTap],['lostpointercapture',cancelTap]])canvas.addEventListener(type,fn,true);window.addEventListener('blur',cancelTap);
 const workGuideCache=new WeakMap();
 function exactWorkGuide(plan,kind,boxes){let entry=workGuideCache.get(plan);if(!entry||entry.kind!==kind){entry={kind,boxes,exact:true,validSurface:true,projected:true,basin:plan.kind?.startsWith('basin')===true};workGuideCache.set(plan,entry);}return entry;}
 function currentWorkGuide(){const s=session.state;if(s.mode!=='excavating')return null;
  if(s.link?.kind==='storage'||s.link?.plan?.kind==='storage-drop-v1')return m.liveBucketWorkGuide(s);
  if(s.scoop){
   const plan=s.scoop.plan;
   return plan.kind?.startsWith('basin')?(workGuideCache.get(plan)??exactWorkGuide(plan,'scoop',plan.cuts.flatMap(c=>c.boxes))):null;
  }
  const ground=s.link?.plan?.kind==='ground-pour-v1'?s.link.plan:null;
  if(ground?.positions)return workGuideCache.get(ground)??exactWorkGuide(ground,'ground',ground.positions.map(p=>({position:p.map(n=>n*2+1),size:2})));
  return scoopAim(s);
 }
 function scoopAim(s){
  // The label and the action share the same fully checked cut at this pose.
  // A surface contact alone cannot certify the reach of the whole bucket.
  if(!digPreviewIdle(s))return null;
  const verified=readDigPreview();
  if(!verified?.length)return null;
  const cached=workGuideCache.get(previewPlan);
  if(cached)return cached;
  if(basinDig)return exactWorkGuide(previewPlan,'scoop',verified);
  const contacts=previewPlan.cuts[0].boxes;
  const restricted=trial?.kind==='summit-load'||trial?.kind==='excavator-scoop';
  const field=s.frame.soil.field;
  const zone=restricted&&field?rainWorksCutZones(field.corner).find(({minX,maxX,minZ,maxZ})=>{
   const [ox,oz]=field.origin;
   return contacts.every(({position:[x,,z]})=>x+ox>=minX&&x+ox<maxX&&z+oz>=minZ&&z+oz<maxZ);
  }):null;
  const footprint=!restricted||zone?m.bucketAimFootprint(s,contacts,zone):[];
  return exactWorkGuide(previewPlan,'scoop',footprint.length?footprint:contacts);
 }
 // Allow the rear camera to use the real space between the current HUD
 // groups. Layout measurements are invalidated by UI changes, not driving.
 const rearHud=[panel.querySelector('.transport-top'),el('amount').parentElement,aux,
  el('movement'),el('actions'),thumbs,el('trialTime')];
 let rearRegions=null,rearToggle=null;
 const invalidateRearView=()=>{rearRegions=null;};
 const rearResize=new ResizeObserver(invalidateRearView);
 for(const item of [canvas,...rearHud])rearResize.observe(item);
 const rearToggleObserver=new MutationObserver(invalidateRearView);
 function rearViewRegions(){
  const toggle=document.querySelector('.imasora-control-display-toggle');
  if(toggle!==rearToggle){
   if(rearToggle)rearResize.unobserve(rearToggle);
   rearToggleObserver.disconnect();rearToggle=toggle;invalidateRearView();
   if(toggle){
    rearResize.observe(toggle);
    rearToggleObserver.observe(toggle,{attributes:true,attributeFilter:['style','hidden']});
   }
  }
  if(rearRegions)return rearRegions;
  const viewport=canvas.getBoundingClientRect();
  if(viewport.width<1||viewport.height<1)return [];
  const clamp=n=>Math.max(0,Math.min(1,n)),gap=9;
  const obstacles=[...rearHud,toggle].filter(item=>item?.getClientRects().length&&
   getComputedStyle(item).visibility==='visible').map(item=>{
   const rect=item.getBoundingClientRect();
   return {left:clamp((rect.left-viewport.left-gap)/viewport.width),
    right:clamp((rect.right-viewport.left+gap)/viewport.width),
    top:clamp((rect.top-viewport.top-gap)/viewport.height),
    bottom:clamp((rect.bottom-viewport.top+gap)/viewport.height)};
  }).sort((a,b)=>a.top-b.top);
  const edges=[...new Set([gap/viewport.width,1-gap/viewport.width,
   ...obstacles.flatMap(o=>[o.left,o.right]).filter(x=>x>gap/viewport.width&&x<1-gap/viewport.width)])].sort((a,b)=>a-b);
  const regions=[];
  for(const [i,left] of edges.entries())for(const right of edges.slice(i+1)){
   if(right-left<.12)continue;
   let top=gap/viewport.height;
   for(const o of obstacles){
    if(o.left>=right||o.right<=left)continue;
    if(o.top-top>=.12)regions.push({left,right,top,bottom:o.top});
    top=Math.max(top,o.bottom);
   }
   const bottom=1-gap/viewport.height;
   if(bottom-top>=.12)regions.push({left,right,top,bottom});
  }
  rearRegions=regions.filter((r,i)=>!regions.some((other,j)=>i!==j&&other.left<=r.left&&
   other.right>=r.right&&other.top<=r.top&&other.bottom>=r.bottom&&
   (j<i||other.left<r.left||other.right>r.right||other.top<r.top||other.bottom>r.bottom)));
  return rearRegions;
 }
 let excavatorPivotTravel=0;
 function renderWork(){
  const q=quarryFlight?quarryDropPose(quarryFlight.from,quarryFlight.to,quarryFlight.time/quarryFlight.duration):null;
  const quarryOffset=q?{x:q.x-quarryFlight.to.x,y:q.groundY-quarryFlight.to.groundY,z:q.z-quarryFlight.to.z}:null;
  if(trial?.route&&trial.countdownMs<=0){
   arrivalMarkers??=createDumpArrivalMarkers(scene,groundHeightAt);
   const position=trial.kind==='excavator-arrival'?rainExcavatorPoint(session.state):rainDumpWorldPoint(session.state);
   arrivalMarkers.update({bay:trial.route.bay,arrowsAt:trial.parkedAt===null?rainDumpGuidancePoints(trial.route,position,trial.progress??trial.waypoint):[],parked:trial.parkedAt!==null});
  }else arrivalMarkers?.update();
  const s=session.state,v=m.linkedPourVisual(s),groundPositions=v.groundSettledPositions??[],groundSoil=groundPositions.map(p=>({position:p.map(n=>n*2+1),half:[1,1,1]})),storage=m.linkedStorageVisual(s),g=m.scoopVisual(s),d=dumpUnloadVisual(s),access=s.link&&['board','leave'].includes(s.link.kind)?s.link:null,handPlan=currentHandEarth(s);
  // The reservation remains at the starting pose until the write settles.
  let frame=s.frame;
  if(savingApproach?.elapsed>0){
   const {kind,id,elapsed}=savingApproach;
   if(kind==='scoop'&&s.scoop?.id===id)frame=m.scoopApproachFrame(frame,s.scoop.plan,elapsed);
   if(kind==='pourDump'&&s.link?.id===id){
    frame={...frame,machineArm:bucketPlanPose(s.link.plan,elapsed)};
    frame.player=linkedExcavatorSeat(frame);
   }
  }
  view.draw(jump.airborne?{...frame,player:{...frame.player,y:frame.player.y+jump.height}}:frame,(handEarthMode?handPlan?.target:targets.drop?.previewTarget??targets.drop?.target??(dropSelection?null:targets.load?.target??targets.dig?.target))??null,{airborne:jump.airborne,quarryOffset,rearRegions:play.active&&s.mode==='excavating'&&view.mode==='chase'?rearViewRegions():null,handEarth:handEarthMode,placementPositions:(handEarthMode?handPlan?.positions:targets.drop?.positions)??null,placementValid:handEarthMode?!!handPlan?.positions?.length&&!handPlan.reason:!dropSelection||!!targets.drop,showPlacementRing:!!targets.drop,toolOwned:s.mode==='foot'&&!handEarthMode&&(service.constructionToolkit?.tools.some(t=>t.id==='shovel'&&t.owned)??false),driving:s.mode==='driving',aboardExcavator:s.mode==='excavating'&&!access,excavatorPivotTravel,accessLink:access,workCamera:s.mode==='excavating'&&(!excavatorDriving||!!s.scoop),scooping:!!s.scoop,bucketStorageCamera:s.mode==='excavating'&&(storageFocus||s.link?.kind==='storage'||s.link?.plan?.kind==='storage-drop-v1'),storageSourceVisible:storage.sourceVisible,storageCameraTarget:s.mode==='driving'?targets.storageCamera:null,extraSoil:groundSoil.length?[...(s.frame.job?shovelVisibleSource(s.frame):g.source),...groundSoil]:s.frame.job?shovelVisibleSource(s.frame):g.source,workGuide:currentWorkGuide(),bucketAmount:s.link?.kind==='storage'?storage.bucket:s.scoop?g.bucket:v.bucket,bucketMouth:v.mouth,bucketPortion:v.portion,bucketGroundParticles:v.groundParticles,bucketGroundPlan:v.groundPlan,bucketDestinationAmount:s.frame.soil.containers.dump.amount+(s.frame.soil.pending?.to==='dump'?s.frame.soil.pending.amount:0),doorMarks:s.mode==='foot',bed:d.bed,cargo:s.unload?d.cargo:v.cargo,wheelTravel:s.wheelTravel,steering:s.mode==='driving'?-input.vector.x*.35*CONSTRUCTION_STEERING_FACTOR:0,preview:v.groundPositions??s.unload?.positions,unload:s.unload,portion:d.portion});}
 function digPreviewKey(s){
  const f=s.frame,a=f.machineArm??{},v=f.machineVehicle??{},d=f.dump;
  return[trial?.kind,basinDig,aimedScoop,f.soil.revision,a.boom,a.stick,a.curl,a.slew,v.x,v.z,v.heading,v.groundY,d.x,d.z,d.heading].join('|');
 }
 function scoopInputMoving(){
  const move=input?.vector;
  if(move?.x||move?.z||held.size||armInMotion()||feedbackKeys.has('KeyJ')||feedbackKeys.has('KeyL'))return true;
  for(const id of feedbackPointers.values())if(id==='steerLeft'||id==='steerRight')return true;
  return false;
 }
 function digPreviewIdle(s){
  return s.mode==='excavating'&&state.map==='construction'&&!document.hidden&&!workProblem('scoop')&&
   !scoopInputMoving()&&!s.frame.soil.pending;
 }
 function digPreviewMatches(s){
  return previewKey===digPreviewKey(s)&&previewSoil===s.frame.soil&&previewDecks===s.frame.decks&&previewScene===contactRevision();
 }
 function readDigPreview(){
  const s=session.state;
  return digPreviewMatches(s)?previewBoxes:null;
 }

 function stopPreviewPlan(){
  if(!previewAbort)return;
  previewRequest++;
  previewAbort.abort();
  previewAbort=null;
  previewBusy=false;
 }
 let warmedScoopSave=false;
 function preview(){
  const s=session.state,now=performance.now();
  if(!digPreviewIdle(s)){
   if(!planning&&scoopInputMoving())stopPreviewPlan();
   return;
  }
  const key=digPreviewKey(s),soil=s.frame.soil,decks=s.frame.decks;
  if(digPreviewMatches(s))return;
  if(previewBusy||planning||now<previewRetryAt)return;
  if(!warmedScoopSave){
   warmedScoopSave=true;
   service.warmConstructionScoopBase?.({predictSummit:!basinDig&&!aimedScoop&&m.summitForwardScoopPoses(s).length>0});
  }
  const request=++previewRequest,basin=basinDig,aimed=aimedScoop,abort=new AbortController();
  previewAbort=abort;
  previewBusy=true;
  const restricted=['summit-load','excavator-scoop'].includes(trial?.kind);
  let surveyed;
  Promise.resolve().then(()=>{
   if(abort.signal.aborted)return null;
   surveyed=preparedGround(s);
   return (basin?m.basinScoopPlanAsync:m.scoopDumpPlanAsync)(
    surveyed,()=>new Promise(r=>requestAnimationFrame(r)),{signal:abort.signal,aimed}
   );
  }).then(plan=>{
    if(disposed||request!==previewRequest)return;
    const current=session.state;
    if(digPreviewKey(current)!==key||current.frame.soil!==soil||current.frame.decks!==decks||!digPreviewIdle(current))return;
    lastGuideChange=performance.now();
    const cut=restricted?rainExcavatorTrialCut(current,plan):null;
    let sceneAllowsCut=!!surveyed&&surveyed.frame.soil.journal.length<=SOIL_LIMITS.history-3;
    if(sceneAllowsCut&&plan&&(!restricted||cut)&&readSceneContact){
     // Basin work can turn the arm before cutting. Its scene guard covers
     // that extra motion using the exact tentative reservation.
     if(basin){
      const draft=m.startBasinScoop(surveyed,crypto.randomUUID().replaceAll('-',''));
      sceneAllowsCut=transportSceneActionAllowed(surveyed,draft,'startBasinScoop',readSceneContact);
     }else sceneAllowsCut=transportSceneScoopTargetAllowed(surveyed.frame,plan,readSceneContact());
    }
    const eligible=plan&&(!restricted||cut)&&sceneAllowsCut;
    previewKey=key;previewSoil=soil;previewDecks=decks;previewScene=contactRevision();
    previewPlan=eligible?plan:null;
    previewBoxes=eligible?plan.cuts.flatMap(c=>c.boxes):null;
    if(performance.now()<workNoticeUntil)return;
    if(!eligible){status('');return;}
    if(basin)status('この枠を掘るよ。土'+(plan.amount/64).toLocaleString('ja-JP',{maximumFractionDigits:2})+'ブロック分をすべて採るよ。');
    else if(trial?.kind==='summit-load'){
     const remaining=SOIL_CAPACITY.dump-current.frame.soil.containers.dump.amount;
     status('この向きで採れる土 '+cut.amount+'。'+(cut.amount<Math.min(24,remaining)?
      '少量です。隣の山肌に向けると効率よく進められます。':'水色の枠がいま狙っている範囲です。'));
    }else status('水色の範囲の土をすくえます。');
  }).catch(error=>{
    if(disposed||request!==previewRequest)return;
    previewRetryAt=performance.now()+500;
    if(error?.name!=='AbortError')status(error.message,'error');
  }).finally(()=>{if(request===previewRequest){previewAbort=null;previewBusy=false;}});
 }

 const idleAutosave=reason=>!document.hidden&&!constructionLifecycleSave(reason);
 function autoSaveReady(reason){
  if(trial||quarryFlight||disposed||ending||failed||saveFailed||play.busy||session.blocked||session.intent||planning||recovery.open||!play.active||jump.airborne)return false;
  if(!idleAutosave(reason))return true;
  // A visible menu or a key release is not a checkpoint.
  if(play.paused||reason==='release'||reason==='blur')return false;
  if(!play.dirty)return true;
  const occupied=input.engaged||feedbackKeys.size||feedbackPointers.size||held.size||verifyRoute||dropApproach||summitExitYaw!==null||transportWorkMoving(session.state);
  autoSaveGate.noteActivity(occupied);
  return !occupied&&autoSaveGate.ready(reason);
 }
 async function autosave(reason){
  if(!autoSaveReady(reason))return false;
  if(!play.dirty)return true;
  const idle=idleAutosave(reason);
  if(deferShortScoopAutosave(session.state,{paused:play.paused,hidden:document.hidden}))return false;
  // A stale scoop preview must release the shared worker before a checkpoint.
  stopPreviewPlan();
  autoSaveGate.checked();
  try{await play.save({automatic:true,interruptible:idle});autoSaveGate.checked();return true;}
  catch(e){
   if(e?.name==='AbortError'&&!session.blocked&&!session.intent)return false;
   if(!disposed)showSaveFailure(e);buttons();return false;
  }
 }
 return {autosave,autoSaveReady,retrySave,get saveNeedsRetry(){return saveFailed;},get autosaving(){return play.savingAutomatically;},
  get groundRevision(){return session.state.frame.soil;},
  openKeyboardMenu(){if(disposed||!play.active)return false;if(el('sheet').open){if(!el('resume').disabled)el('resume').click();}else menu();return true;},
  get renderQualityIdle(){
   return !jump.airborne&&!input.vector.x&&!input.vector.z&&!held.size&&!feedbackKeys.has('KeyJ')&&!feedbackKeys.has('KeyL')&&!armInMotion()&&!previewBusy&&!planning&&!ending&&performance.now()-lastGuideChange>=150&&
     !verifyRoute&&!dropApproach&&!transportWorkMoving(session.state);
  },
  switchCamera(){
  if(!play.active||play.paused||!view||el('view').disabled)return;
  const framing=view.cycle({externalOnly:true});
  if(framing){status('視点：'+framing);buttons();}
 },
 get resumePoint(){return play.active?{kind:'transport',revision:session.state.revision,view:0}:null;},resumeSaved(point){if(!point||point.kind!=='transport'||point.revision!==session.state.revision||play.active||play.busy)return false;const p=transportWorldPose(play.record);setHostPose(p);play.begin(p);initialLanding=false;owns(true);view.attachActor();view.setYaw(constructionCameraBaseYaw(session.state));play.resume();buttons();return true;},get jumpMotion(){return play.active&&session.state.mode==='foot'?{owner:'transport',stage:jump.count,velocity:jump.velocity,height:jump.height,airborne:jump.airborne,handsFree:!session.state.frame.soil.containers.shovel.amount}:null;},get active(){return !disposed&&play.active;},get aboard(){return !disposed&&play.active&&session.state.mode!=='foot';},get dirty(){return !disposed&&play.dirty;},begin:()=>el('begin').click(),save:()=>write('セーブできたよ！'),leave,look(dx,dy,sensitivity){if(!enabled())return;const yaw=view.look(dx,dy,sensitivity);if(session.state.mode==='foot')play.move('turnBucketWalker',yaw);},
 doorSpots(id){
  if(disposed||!root||blocked||state.map!=='construction')return [];
  const o=transportSiteOrigin(play.record);
  return transportDoorSpots(session.state.frame,id).map(p=>({...p,x:p.x+o[0],z:p.z+o[2]}));
 },
 get handEarthActive(){return play.active&&handEarthMode;},
 doorTargets(id){return !disposed&&root&&!blocked&&!ending&&!failed&&!planning&&state.map==='construction'?play.doorTargets(id):[];},
 doorTarget(id){return !disposed&&root&&!blocked&&!ending&&!failed&&!planning&&state.map==='construction'?play.doorTarget(id,state.position):null;},
  enterFromOverview(id){
  const door=this.doorTarget(id);
  return door?this.enterAtDoor(id,{board:true,quick:true,entry:door}):false;
 },
 enterAtDoor(id,{board=false,near=false,quick=false,entry=null}={}){
  if(board&&constructionVehicleLock(id))return false;
   if(disposed||!root||blocked||ending||failed||planning||state.map!=='construction'||state.jumpY||state.falling)return false;
   try{
    play.beginAtDoor(id,entry??{x:state.position.x,y:state.groundY,z:state.position.z},{near});
    initialLanding=false;owns(true);view.attachActor();
    view.setYaw(constructionCameraBaseYaw(session.state));play.resume();scanKey='';
    setHostPose(transportWorldPose(play.record));
    if(board&&!quick){
     // The operation advances on the next normal update. Do not scan, lay out
     // and draw a separate on-foot frame that can never reach the display.
     void work(id==='excavator'?'boardExc':'board');
     return true;
    }
    scan();renderWork();buttons();status(board?'':'ドアに着いたよ！運転席に乗ってはじめよう。');
    if(quick){
     if(id==='excavator'){play.move('startBucketAccess',true);while(!m.bucketLinkReady(session.state))play.move('progressBucketLink',.05);play.move('finishBucketLink');}
     else play.move('boardBucketSiteDump');
     view.setYaw(constructionCameraBaseYaw(session.state));setHostPose(transportWorldPose(play.record));scanKey='';scan();renderWork();buttons();
    }
    return true;
   }catch(e){refuseWork(e.message);return false;}
  },
  beginHandEarth(){
   if(disposed||!root||blocked||ending||failed||planning||state.map!=='construction'||state.jumpY||state.falling)return false;
   try{
    if(!play.active){
     const yaw=state.viewHeading;
     play.beginHandEarth({x:state.position.x,y:state.groundY,z:state.position.z,heading:state.heading});
     initialLanding=false;owns(true);view.attachActor();view.setYaw(yaw);play.resume();
    }
    return setHandEarthMode(true);
   }catch(error){refuseWork(error.message);return false;}
  },
  install({group,blockedAt,reserved,collider,fieldSolids=()=>[],fieldBlocked=()=>false,fieldHeightAt=null,moveCollider=null}){if(disposed)return null;view?.dispose();disposeWorldExcavationModel(root);root=null;view=null;panel.hidden=true;if(state.map!=='construction')return null;const record=play.record,o=transportSiteOrigin(record);if(transportFences(record.work.frame)&&(blockedAt(o[0],o[2],425)||reserved([o[0],0,o[2]],[720,0,600]))){blocked=true;status('作品に重なるため、現場を開けません。保存は保持しています。');panel.hidden=false;return null;}blocked=false;readSceneContact=()=>({
   solids:fieldSolids({x:o[0],z:o[2]}).map(b=>({position:[b.x,b.y+b.h/2,b.z],half:[b.w/2,b.h/2,b.d/2],heading:b.angle??0,supportSurface:b.supportSurface})),
   blocked:fieldBlocked,heightAt:fieldHeightAt
  });session.setMovementGuard?.((before,next,name,flight)=>{if(next.frame.soil.containers.storage.amount<gardenReserved())throw Error('花壇で使っている土は取り出せないよ。先に花壇を片付けよう。');vehicleLoadNotice=loadGuard('constructionTransport',{...session.record,work:before},{...session.record,work:next},{heightAt:fieldHeightAt});if(vehicleLoadNotice){status(vehicleLoadNotice);return false;}return transportSceneActionAllowed(before,next,name,readSceneContact,flight);});root=createWorldExcavationModel({shared:!transportFences(record.work.frame)});root.name='construction-transport-yard';root.position.fromArray(o);group.add(root);const d=root.userData;d.particles.visible=d.pile.visible=d.machine.visible=false;const bin=nativeStorageBin(session.state.frame);storageCollider=collider(o[0]+bin.x,o[2]+bin.z,[bin.width,bin.depth],0,"construction-excavation-storage",0,{minY:0,maxY:bin.height,obstacleHeight:bin.height});moveStorageCollider=moveCollider;view=createShovelWorkView(canvas,session.state.frame,{group:root,scene,camera,character,gardenReserved,progressiveQuarry});view.setYaw(constructionCameraBaseYaw(session.state));renderWork();if(!initialLanding)view.releaseActor();character.visible=true;for(const b of transportFences(record.work.frame)?EXCAVATION_FENCES:[])collider(o[0]+b.x,o[2]+b.z,[b.w,b.d],0,'construction-excavation-fence',0,{minY:0,maxY:40,obstacleHeight:40});panel.hidden=false;owns(play.active);proof();syncEntry();status(play.active?'':'「保存した現場を再開」で作業を続けられます。');return transportSiteOpening(record);},
  async syncGardenCommit(){if(play.active)throw Error('土の作業を終えてから庭を開こう。');await session.synchronizeCommitted();initialLanding=false;renderWork();buttons();},
  get earthStorageWorld(){
   if(!root)return null;
   const f=session.state.frame,bin=nativeStorageBin(f),[x,,z]=transportSiteOrigin(play.record);
   return {...bin,x:bin.x+x,z:bin.z+z};
  },
  walkingColliders(fromX,fromZ,toX,toZ){
   if(!root||disposed||play.active)return [];
   const frame=session.state.frame;
   if(frame!==walkingFrame){
    readWalkingColliders=createTransportWalkingColliders(play.record);
    walkingFrame=frame;
   }
   return readWalkingColliders(fromX,fromZ,toX,toZ);
  },
  groundUpperBound:b=>root?transportGroundUpperBound(play.record,b):undefined,quarryHeightAt(x,z){
   return root?nativeQuarryWorldHeight(session.state.frame,x,z):undefined;
  },groundHoles:()=>transportSiteHoles(play.record),overlapsBuild:(p,size,options)=>!!root&&transportSiteReserved(play.record,p,size,options),groundHeightAt,vehicleBlockedAt(x,z,r){
   if(!root)return false;
   const frame=session.state.frame;
   if(!Object.isFrozen(frame))return createTransportVehicleProbe(play.record)(x,z,r);
   if(probeFrame!==frame){vehicleProbe=createTransportVehicleProbe(play.record);probeFrame=frame;}
   return vehicleProbe(x,z,r);
  },previewSpawn:()=>transportWorldPose(play.record),
  update(dt){if(disposed)return false;tickTrialClock();if(constructionOverlayOpen())return play.active;setHidden(panel,state.map!=='construction'||!root||!!blocked);if(panel.hidden)return false;if(!play.active||(slopeCheckedSoil!==session.state.frame.soil||deferredFace&&deferredFace!==session.state.frame)&&!trial&&!input.engaged&&!held.size&&!feedbackKeys.size&&!feedbackPointers.size&&!quarryFlight&&!play.dirty)prepareQuarry();if(!play.active){view.prepareQuarryView({x:state.position.x-root.position.x,z:state.position.z-root.position.z});if(initialLanding){view.attachActor();setHostPose(transportWorldPose(play.record));shadow.visible=false;renderWork();readout();buttons();return true;}syncEntry();return false;}try{acc=Math.min(.066,acc+Math.min(.066,Math.max(0,dt)));while(acc>=1/60){acc-=1/60;if(!play.canAdvance||planning||ending||failed||document.hidden)continue;
   if(quarryFlight){
    quarryFlight.time+=1/60;
    if(quarryFlight.time>=quarryFlight.duration){quarryFlight=null;status('着地しました。');}
    continue;
   }
   const s=session.state,f=s.frame;
   if(f.job){if(shovelJobReady(f)){const message=f.job.kind==='store'?'土を預けました。':f.job.kind==='take'?'土を取り出しました。':f.job.kind==='dig'?'土をすくいました。黄色い枠に土を置けます。':f.job.kind==='drop'?'土を置きました。上面にも土を重ねられます。':'手作業が終わりました。';play.move('finishDumpHandWork');void write(message,{continueWork:true});}else play.move('progressDumpHandWork',1/24);}
   else if(s.scoop){if(m.scoopDumpReady(s)){play.move('finishScoopDump');
    if(trial?.kind==='summit-load'){status(trialInstruction(trial));buttons();}else if(trial)clearTrial('採土完了！ 次はバケットの土をダンプカーに積もう。');
    else void write((s.scoop.plan.kind?.startsWith('basin')?'穴ができたよ！ ':'すくったよ！ ')+(s.scoop.plan.amount/64).toLocaleString('ja-JP',{maximumFractionDigits:2})+'ブロック分の土をバケットに採ったよ。',{continueWork:true,paint:![m.SURFACE_SWEEP_PLAN,m.SUMMIT_SWEEP_PLAN,m.AIMED_SWEEP_PLAN].includes(s.scoop.plan.kind)});}else{
    const scoop=s.scoop,rate=scoopApproachRate(scoop.plan);
    const approachTime=Math.min(1/60,Math.max(0,scoop.plan.cuts[0].time-scoop.elapsed)/rate);
    let step=scoop.returning ? .05 : approachTime*rate+(1/60-approachTime)*SCOOP_WORK_RATE;
    let advanced=s;
    // Reach the soil promptly, then give the cut, curl and lift time to read.
    // Keep every motion step within the checked reducer bound.
    while(step>1e-9&&!m.scoopDumpReady(advanced)){
     const slice=Math.min(step,.05);
     advanced=play.move('progressScoopDump',slice);step-=slice;
    }
   }}
   else if(s.link){if(m.bucketLinkReady(s)){const boarding=s.link.kind==='board',ground=s.link.plan?.kind==='ground-pour-v1',dump=s.link.kind==='pour'&&f.soil.pending?.to==='dump';play.move('finishBucketLink');if(boarding||s.link.kind==='leave'){
      quietBoarding=false;
      if(!boarding&&chapterTrialKind()==='dump-haul')
       status(document.documentElement.dataset.controlDisplay==='touch'?'ダンプカーの乗り場へ進み、「ダンプに乗る」を押そう。':'ダンプカーのドア横まで歩き、Fで乗り換えよう。');
      buttons();
     }else if(trial?.kind==='summit-load'){if(session.state.frame.soil.containers.dump.amount===SOIL_CAPACITY.dump)clearTrial('満載！ ダンプカーで保管庫へ運ぼう。');else{trial.returnYaw=aimedScoop?null:trial.scoopYaw;status(trialInstruction(trial));buttons();}}else if(trial?.kind==='excavator-load'){clearTrial(session.state.frame.soil.containers.dump.amount===SOIL_CAPACITY.dump?'満載になったよ！ 採土と積み込み完了。':'積み込み完了！ 次の土をすくおう。');}else void write(ground?'土を地面に置いたよ。':s.link.plan?.kind==='storage-drop-v1'?'土を保管庫に預けました。':'積み込みが終わりました。',{continueWork:true,paint:!dump});}else play.move('progressBucketLink',.05);}
   else if(s.unload){if(dumpUnloadReady(s)){play.move('finishDumpUnload');if(trial?.kind==='dump-unload'){if(!session.state.unload)clearTrial('荷下ろし完了！ 保管庫に土が入りました。');}else void write(s.unload.destination==='storage'?(session.state.unload?'保管箱へ土を預けています。':'保管箱へ土を預けました。'):'荷下ろしを保存しました。',{continueWork:true});}else play.move('progressDumpUnload',.05);}
   else if(dropApproach){const route=dropApproach,[x,z]=route.points[0],dx=x-f.player.x,dz=z-f.player.z,d=Math.hypot(dx,dz);if(d<.05){route.points.shift();if(!route.points.length){dropApproach=null;play.move('turnBucketWalker',route.heading);if(!shovelDropTarget(session.state.frame,route.point)){refuseWork('置き先か通り道が変わったため止めました。土は手元に残ります。');}else{play.move('startBucketSiteHand','drop',route.id,route.point);void write('選んだ場所へ土を置きます。',{continueWork:true});}}}else{const next=play.move('walkBucketSite',dx/d,dz/d,Math.min(1/60,d/SKY_RUN_SPEED),true);if(next===s){dropApproach=null;refuseWork('通り道がふさがったため止めました。土は手元に残ります。');}else play.move('turnBucketWalker',Math.atan2(dx,dz));}}
   else if(verifyRoute){const [x,z]=verifyRoute.points[0],dx=x-f.player.x,dz=z-f.player.z,d=Math.hypot(dx,dz);if(d<.1){verifyRoute.points.shift();if(!verifyRoute.points.length){const face=verifyRoute.face;verifyRoute=null;if(face!==null){play.move('turnBucketWalker',face);view.setYaw(face);}menu();status('実際に歩いて到着しました。土と動きを保存できます。');}}else{const next=play.move('walkBucketSite',dx/d,dz/d,Math.min(1/60,d/SKY_RUN_SPEED),true);if(next===s){verifyRoute=null;menu();status('通り道がふさがっているので止めました。');}else play.move('turnBucketWalker',Math.atan2(dx,dz));}}
   else if(enabled()){
    const movement=input.vector,fast=input.fast;
    let touchSteering=0;
    if(s.mode==='excavating')for(const id of feedbackPointers.values()){
     if(id==='steerLeft')touchSteering--;
     else if(id==='steerRight')touchSteering++;
    }
    const v=touchSteering?{x:Math.sign(touchSteering),z:movement.z}:movement;
    autoSaveGate.noteActivity(v.x||v.z||held.size||armInMotion()||feedbackKeys.has('KeyJ')||feedbackKeys.has('KeyL'));
    const gain=travelAcceleration.step(s.mode==='foot'?v.x:0,v.z,1/60,fast)/(fast?2.5:1);
    if(s.mode==='excavating'){
    if(v.z||v.x){
      const next=moveVehicle('driveTransportExcavator',v.z?-v.z*gain:0,v.x,1/60,fast);
      if(next!==s){
        if(trial)trial.scoopYaw=null;
        const delta=next.frame.machineVehicle.heading-f.machineVehicle.heading;
        const turn=Math.atan2(Math.sin(delta),Math.cos(delta));
        if(!v.z)excavatorPivotTravel+=turn*28;
        view.setYaw(view.yaw+turn);excavatorBlockedNotice=false;
      }else if(!excavatorBlockedNotice){
        excavatorBlockedNotice=true;
        if(vehicleLoadNotice)refuseWork(vehicleLoadNotice);
        else if(!v.z)refuseWork('車体やアームが周囲に当たるため、その場では旋回できません。');
      }
    }else excavatorBlockedNotice=false;
    if(quarryFlight)continue;
    const direct=Number(feedbackKeys.has('KeyL'))-Number(feedbackKeys.has('KeyJ'))+[...held.values()].reduce((a,b)=>a+b,0);
    const axis=Math.max(-1,Math.min(1,direct));
    const armMoving=armInMotion();
    if(summitExitYaw!==null){
     if(axis||v.x||v.z||armMoving)summitExitYaw=null;
     else{
      const current=session.state,difference=current.frame.machineArm.slew-summitExitYaw;
      if(Math.abs(difference)>.001){
       const next=play.move('slewBucketWork',Math.sign(difference),Math.min(.05,Math.abs(difference)/.62));
       if(next===current){summitExitYaw=null;refuseWork('降り口を確保できません。開けた場所へ移動してから降りよう。');}
      }else{
       summitExitYaw=null;
       play.move('startBucketAccess',false);
       status('ショベルカーのステップから降りています。');
      }
     }
    }
    if(trial?.returnYaw!=null){
      if(axis||v.x||v.z||armMoving)trial.returnYaw=null;
      else{
        const current=session.state,difference=current.frame.machineArm.slew-trial.returnYaw;
        if(Math.abs(difference)>.001){
          const next=play.move('slewBucketWork',Math.sign(difference),Math.min(.05,Math.abs(difference)/.62));
          if(next===current)trial.returnYaw=null;
        }else trial.returnYaw=null;
      }
      if(trial.returnYaw==null)status(trialInstruction(trial));
    }
    if(armMoving){
     let changed=false;
     for(const joint of ['boom','stick']){
      const amount=excavatorArmControls.reduce((n,control)=>control[3]===joint&&armControlHeld(control)?n+control[4]:n,0);
      if(!amount)continue;
      const current=session.state,next=play.move('adjustBucketArmWork',joint,amount,1/60);
      changed ||= next!==current;
     }
     if(changed){
      if(!aimedScoop)status('手動で照準を調整中。バケットをすくいたい土に合わせよう。');
      aimedScoop=true;basinDig=false;armBlocked=false;
     }else if(!armBlocked){
      armBlocked=true;
      refuseWork('可動範囲の端か、地面・車両が近いため、ここからは動かせません。');
     }
    }else armBlocked=false;
    if(axis){
      const current=session.state,next=play.move('slewBucketWork',axis,1/60);
      if(next===current&&!slewBlocked){
        const limit=-axis*current.frame.machineArm.slew>=EX.slewLimit-1e-8;
        refuseWork(limit?'上部旋回体が旋回できる端まで来ています。反対へ回してください。':'この向きには旋回できません。アームと車体の周りの障害物や地面を確認してください。');
      }
      slewBlocked=next===current;
    }else slewBlocked=false;
   }else if(s.mode==='driving'){const next=moveVehicle('driveBucketSite',-v.z*gain,v.x,1/60,fast);if(next!==s)view.setYaw(view.yaw+next.frame.dump.heading-f.dump.heading);}else{const len=Math.max(1,Math.hypot(v.x,v.z)),move=viewRelativeTravel({x:Math.sin(view.yaw),z:Math.cos(view.yaw)},v.x/len,v.z/len);if(move.x||move.z){if(handEarthMode)handEarthPoint=null;const walked=play.move('walkBucketSite',move.x*gain,move.z*gain,1/60,fast),descent=f.player.y-walked.frame.player.y;
    if(descent>2.01||jump.airborne&&descent>0)jump.descend(descent);play.move('turnBucketWalker',view.mode==='eye'?view.yaw:travelHeading(move.x,move.z));}}}
   if(verification&&verifyPause){const job=session.state.frame.job??session.state.scoop??session.state.link??session.state.unload;if(job?.elapsed>=.8){verifyPause=false;menu();status('途中で停止しました。保存して読み直し、現場へ戻ると続きます。');}}
  }
   advanceSavingApproach();
   if(play.canAdvance&&session.state.mode==='foot'&&!transportWorkMoving(session.state))jump.tick(dt,jumpClearance(session.state.frame.player,[...shovelMachines(session.state.frame),...shovelDumpObstacles(session.state.frame),...shovelNearbySoil(session.state.frame.soil,session.state.frame.player.x,session.state.frame.player.z,16)],shovelSegmentHits,Math.max(64,jump.height+2)));jumpControl.sync();scan();preview();setHostPose(transportWorldPose(play.record));state.jumpY=jump.height;state.jumpVelocity=jump.velocity;state.jumpCount=jump.count;shadow.visible=false;renderWork();readout();buttons();return true;}catch(e){failed=true;play.pause();status('作業を止め、土を保持しました：'+e.message,'error');menu();return true;}},
  dispose(){if(disposed)return;arrivalMarkers?.dispose();stopPreviewPlan();play.pause();if(play.active)owns(false);disposed=true;pendingPaint?.();window.removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVisibility);reset();for(const[type,fn]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancelTap],['lostpointercapture',cancelTap]])canvas.removeEventListener(type,fn,true);window.removeEventListener('blur',cancelTap);for(const type of ['pointerup','pointercancel'])window.removeEventListener(type,releaseActionPointer,true);clearActionFeedback();rearResize.disconnect();rearToggleObserver.disconnect();recovery.dispose();view?.dispose();disposeWorldExcavationModel(root);root=null;panel.remove();style.remove();jumpControl.dispose();input.dispose();pad.dispose();dash.dispose();window.removeEventListener('keydown',keyEvent,true);window.removeEventListener('keyup',keyEvent,true);}
 };
}
