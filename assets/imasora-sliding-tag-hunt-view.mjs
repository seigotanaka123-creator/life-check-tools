import{huntInkTrailSuppressed}from'./imasora-sliding-tag-hunt-cloak-ink.mjs';
import{createHuntRearMirror,huntRearMirrorActive}from'./imasora-sliding-tag-hunt-rear-mirror.mjs';
import{createHuntGrowth}from'./imasora-sliding-tag-hunt-growth.mjs';
import{createHuntUpdateNotice,huntHomeUrl}from'./imasora-sliding-tag-hunt-update-notice.mjs';
import{createHuntReplayCamera}from'./imasora-sliding-tag-hunt-replay-camera.mjs';
import{createHuntSettingsMenu}from'./imasora-sliding-tag-hunt-settings-menu.mjs';
import{installHuntMenu,rollHuntOpponents}from'./imasora-sliding-tag-hunt-menu.mjs';
import{createHuntSunglasses}from'./imasora-sliding-tag-hunt-sunglasses.mjs';
import{createHuntDizzyView}from'./imasora-sliding-tag-hunt-dizzy-view.mjs';
import{huntTouchShapeKey}from'./imasora-sliding-tag-hunt-body-touch.mjs';
import{MATCH_SECONDS}from'./imasora-sliding-tag-hunt-match.mjs';
import{createHuntInkView}from'./imasora-sliding-tag-hunt-ink-view.mjs';
import{createHuntInkFeet}from'./imasora-sliding-tag-hunt-ink-display.mjs';
import{createHuntItemNotice}from'./imasora-sliding-tag-hunt-item-notice.mjs';
import{createHuntProofClient}from'./imasora-sliding-tag-hunt-proof-client.mjs';
import{createHuntItemStatus,huntItemFailureHint,huntItemUseAcknowledged}from'./imasora-sliding-tag-hunt-item-status.mjs';
import{createHuntRenderQuality}from'./imasora-sliding-tag-hunt-render-quality.mjs';
import{createHuntRenderRecovery}from'./imasora-sliding-tag-hunt-render-recovery.mjs';
import{createLiveBroadcastUI}from'./imasora-live-broadcast-ui.mjs';
import{createHuntBroadcastViews}from'./imasora-sliding-tag-hunt-broadcast-views.mjs';
import{huntJumpRestRemaining}from'./imasora-sliding-tag-hunt-jump-rest.mjs';
import{huntFacingCameraYaw,holdHuntCameraView}from'./imasora-sliding-tag-hunt-follow-camera.mjs';
import{huntKeyboardMovement}from'./imasora-sliding-tag-hunt-pad-steering.mjs';
import{createHuntSmoothCamera}from'./imasora-sliding-tag-hunt-smooth-camera.mjs';
import{createHuntRoleMarkers}from'./imasora-sliding-tag-hunt-role-markers.mjs';
import{withHuntFoamOcclusion}from'./imasora-sliding-tag-hunt-foam-visibility.mjs';
import{createHuntItemGuide}from'./imasora-sliding-tag-hunt-item-guide.mjs';
import{recordReadyHunt,recordFreshHunt}from'./imasora-sliding-tag-hunt-start.mjs';
import{createHuntReplay,createHuntReplaySound,huntResultAudioCues,updateHuntReplayView}from'./imasora-sliding-tag-hunt-replay.mjs';
import{createHuntReplayAudio,createHuntReplayVideo}from'./imasora-sliding-tag-hunt-video.mjs';
import{createHuntScopedVideoShare}from'./imasora-sliding-tag-hunt-video-scopes.mjs';
import{applyHuntActorVisibility,huntActorConcealed}from'./imasora-sliding-tag-hunt-visibility.mjs';
import{createHuntCompassView}from'./imasora-sliding-tag-hunt-compass-view.mjs';
import{createHuntRadarHud}from'./imasora-sliding-tag-hunt-radar-hud.mjs';
import{createHuntFrameBudget,startHuntFrameDriver}from'./imasora-sliding-tag-hunt-frame.mjs';
import{createHuntMaterialState,withHuntCameraClearance}from'./imasora-sliding-tag-hunt-materials.mjs';
import*as T from'./three.module.min.js';
import{buildMatureStarCharacter360,buildFloweringHeroCharacter360,getFloweringHeroCharacter}from'./imasora-character-360.js';
import{buildTagCompanion}from'./imasora-sliding-tag-companion.mjs';
import{createHuntModelCache,disposeHuntModel,resetHuntModel}from'./imasora-sliding-tag-hunt-model-cache.mjs';
import{renderHuntActorPoses,createHuntHandAttachments}from'./imasora-sliding-tag-hunt-pose.mjs';
import{createHuntGait}from'./imasora-sliding-tag-hunt-gait.mjs';
import{trampolineSurface}from'./imasora-sliding-tag-hunt-trampoline.mjs';
import{createCharacterJumpAction}from'./imasora-character-jump-action.mjs?v=120yo';
import{TOUCH_LAYOUT_KEY}from'./imasora-touch-layout.mjs';
import{createHuntTouchSettings}from'./imasora-sliding-tag-hunt-touch.mjs';
import{TAG_CHARACTERS,worldSurface,HUNT_CHARACTER_HEIGHT}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntTerrainTilt}from'./imasora-sliding-tag-hunt-dive.mjs';
import{STEP,BALLOON_DESCENT_TURN_RULES,CLOAK_INK_RULES,TEAM_PRESSURE_RULES,STABLE_BALLOON_RULES,TERRITORY_SEARCH_RULES,JUMP_RECOVERY_RULES,recordHunt,controlledHuntActor}from'./imasora-sliding-tag-hunt.mjs';
import{readHuntDashMode,saveHuntDashMode,huntMenuCommand,HUNT_DIVE_KEY,huntDiveShortcutAvailable,huntItemShortcutAvailable,huntItemKeyCodes,createHuntJumpOwners,createHuntKeyboardTimeline,createHuntButtonOwners,releaseHuntPointerCaptures,bindHuntLifecycle,captureHuntPointer,createHuntActionInput,huntKeyboardContext,bindHuntTouchGuard}from'./imasora-sliding-tag-hunt-input.mjs';
import{huntCompass}from'./imasora-sliding-tag-hunt-radar.mjs';
import{ITEM_DEFS,PLAYER_ITEMS,HUNTER_ITEMS,itemIcon}from'./imasora-sliding-tag-hunt-items.mjs';
import{createHuntScenery}from'./imasora-sliding-tag-hunt-scenery.mjs';
import{createHuntFeedback}from'./imasora-sliding-tag-hunt-feedback.mjs';
import{createHuntMotionTrails}from'./imasora-sliding-tag-hunt-motion-trails.mjs';
import{createHuntResults,huntResultSummary}from'./imasora-sliding-tag-hunt-results.mjs';
import{createHuntProps}from'./imasora-sliding-tag-hunt-props.mjs';
import{createTagCharacterSelect}from'./imasora-sliding-tag-hunt-select.mjs';
import{createHuntSound,huntSoundPreference,saveHuntSound,huntDiveAudioCue}from'./imasora-sliding-tag-hunt-audio.mjs';
const $=s=>document.querySelector(s),canvas=$('#rink'),scene=new T.Scene(),camera=new T.PerspectiveCamera(56,1,.15,900),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;scene.background=new T.Color(0xc9e6f1);scene.fog=new T.Fog(0xc9e6f1,210,620);
installHuntMenu(document);
const hemi=new T.HemisphereLight(0xf7fcff,0x8eb5b0,1.8),sun=new T.DirectionalLight(0xfff0d7,1.9);scene.add(hemi,sun);sun.position.set(-100,160,60);const scenery=createHuntScenery({scene,camera,canvas,hemi,sun});
const rearMirror=createHuntRearMirror(renderer,scene,{withoutLabels:draw=>roleMarkers.withoutLabels(draw)});
const PREF_KEY='imasora-tag-three-settings-v3',roster=new Map(TAG_CHARACTERS.map(c=>[c.id,c]));let storage,session;try{storage=localStorage;session=sessionStorage;}catch{}

const homeMode=new URLSearchParams(location.search).get('from')==='home';function readCompanion(){try{return globalThis.ImasoraSlidingTagEntry.read({session:sessionStorage,storage,required:true});}catch{return{status:'unavailable'};}}
const entry=homeMode?readCompanion():null,companion=entry?.status==='ready'?entry.companion:null;
const updateNotice=createHuntUpdateNotice({container:$('#panel .tm-scroll'),pageUrl:location.href,homePath:companion?.homePath,version:new URL(import.meta.url).searchParams.get('v'),visible:()=>!$('#panel').hidden});void updateNotice.check();
const growth=createHuntGrowth({api:globalThis.ImasoraTagGrowth,entryApi:globalThis.ImasoraSlidingTagEntry,companion,storage,session,onStartNotice:showStartNotice,onNotice:text=>{document.querySelector('.practice-note').textContent=text;if(started&&s.phase==='finished'){growthStatus.hidden=false;growthStatus.textContent=text;}}});document.querySelector('.practice-note').textContent=growth.status();
let preferences={};try{preferences=JSON.parse(storage?.getItem(PREF_KEY)||'{}')||{};}catch{}
let opponents=Array.isArray(preferences.opponents)&&preferences.opponents.length===3&&preferences.opponents.every(id=>roster.has(id))?[...preferences.opponents]:['walkBrave','rioSaber','walkCute'].map(p=>TAG_CHARACTERS.find(c=>c.profileKey===p).id),startKey='random';
let mode=preferences.mode==='hunt'?'hunt':'escape';
function saveChoices(){try{storage?.setItem(PREF_KEY,JSON.stringify({version:4,opponents,mode}));}catch{}}
const soleShadowGeometry=new T.CircleGeometry(1,24),soleShadows=Array.from({length:4},()=>{const m=new T.Mesh(soleShadowGeometry,new T.MeshBasicMaterial({color:0x375363,transparent:true,opacity:.22,depthWrite:false}));m.rotation.x=-Math.PI/2;scene.add(m);return m;});
const models=[],balloons=[],handAttachments=createHuntHandAttachments(),roles={pursuit:'追跡',intercept:'先回り',patrol:'巡回'},roleNames=['追跡役','先回り役','巡回役'];
function avatar(id,player=false){const m=player&&companion?buildTagCompanion(companion):getFloweringHeroCharacter(id)?buildFloweringHeroCharacter360(id):buildMatureStarCharacter360(id),b=new T.Box3().setFromObject(m),scale=HUNT_CHARACTER_HEIGHT/(b.max.y-b.min.y);m.scale.multiplyScalar(scale);m.position.y=-b.min.y*scale;const root=new T.Group();root.add(m);root.rotation.order='YXZ';scene.add(root);return{root,model:m,contactKey:player?huntTouchShapeKey(companion):id,controlled:player,gait:createHuntGait(m),action:createCharacterJumpAction(m),diveLift:Math.max(1,(b.max.z-b.min.z)*scale/2+.1),diveBounds:{minX:b.min.x*scale,maxX:b.max.x*scale,minY:0,maxY:HUNT_CHARACTER_HEIGHT,minZ:b.min.z*scale,maxZ:b.max.z*scale},radius:Math.max(2,Math.min(6,Math.max(b.max.x-b.min.x,b.max.z-b.min.z)*scale/2)),materials:new Set(),feet:(m.userData.feet??[]).map(f=>({part:f,x:f.rotation.x}))};}
function balloon(){const root=new T.Group(),body=new T.Mesh(new T.SphereGeometry(1,12,9),new T.MeshStandardMaterial({color:0xffa9c7,roughness:.5}));body.scale.set(1.7,2.1,1.7);root.add(body);const knot=new T.Mesh(new T.ConeGeometry(.22,.5,8),new T.MeshStandardMaterial({color:0xf9df98}));knot.position.y=-2.15;root.add(knot);scene.add(root);const ropeGeo=new T.BufferGeometry(),ends=new Float32Array(6);ropeGeo.setAttribute('position',new T.BufferAttribute(ends,3));const rope=new T.Line(ropeGeo,new T.LineBasicMaterial({color:0xcba465}));rope.frustumCulled=false;scene.add(rope);root.visible=rope.visible=false;return{root,rope,ends};}
const inkView=createHuntInkView(scene),inkNotice=createHuntItemNotice(),smoothCamera=createHuntSmoothCamera(),replayCamera=createHuntReplayCamera();
const recordPlayableHunt=config=>recordHunt(config,{rules:BALLOON_DESCENT_TURN_RULES});
let round=recordReadyHunt({opponents,startKey,mode},recordPlayableHunt),s=round.state,paused=true,started=false,last=0,hudAt=0,yaw=0,renderYaw=0,pitch=.28,drag=null,padGesture=null,axis={x:0,z:0},dirty=true,paintAt=0,lastCount=-1,lastItem='',lastItemCue='',lastPhase='';
let padCamera=false;
let liveWasPlaying=false;
const jumpCaption=document.createTextNode('ジャンプ'),jumpRestLabel=document.createElement('small');jumpRestLabel.hidden=true;jumpRestLabel.style.cssText='display:block;font-size:11px;line-height:1.1;white-space:nowrap';$('#jump').style.padding='3px';$('#jump').replaceChildren(jumpCaption,jumpRestLabel);
const frameBudget=createHuntFrameBudget(STEP),replay=createHuntReplay(),replaySound=createHuntReplaySound();let replayQueued=false;
const renderQuality=createHuntRenderQuality({maxRatio:renderer.getPixelRatio(),onChange(ratio){renderer.setPixelRatio(ratio);rearMirror.invalidate();dirty=true;canvas.dataset.renderQuality=JSON.stringify(renderQuality.stats());}});canvas.dataset.renderQuality=JSON.stringify(renderQuality.stats());
const keys=new Set(),keyboardTimeline=createHuntKeyboardTimeline(),jumpOwners=createHuntJumpOwners(),touchButtons=createHuntButtonOwners(jumpOwners,{dashMode:readHuntDashMode(storage),onDashChange:paintTouchDash}),holds=touchButtons.held,thumbPresses=touchButtons.presses,inputMemory={},soundPreference=huntSoundPreference(storage),audio=createHuntSound(soundPreference);
const footGround=(x,z)=>trampolineSurface(s,x,z),stepSound=()=>playMatchCue({type:'step'});
const actorModels=createHuntModelCache({create(spec){const m=avatar(spec.id,spec.controlled);m.inkFeet=createHuntInkFeet(m.model);m.sunglasses=createHuntSunglasses(m.model);m.dizzy=createHuntDizzyView({model:m.model,root:m.root,eyeFit:m.sunglasses.fit,eyes:m.sunglasses.eyes});m.model.traverse(o=>{if(o.isMesh)for(const v of Array.isArray(o.material)?o.material:[o.material])if(v)m.materials.add(v);});m.materialState=createHuntMaterialState(m.materials);return m;},release:disposeHuntModel,reset:resetHuntModel});
const liveViews=createHuntBroadcastViews({renderer,scene,source:canvas});
const liveBroadcast=createLiveBroadcastUI({canvas,audio,captureCanvas:liveViews.captureCanvas,onLayout(layout){liveViews.setLayout(layout);dirty=true;},onScreenViews(enabled){dirty=true;return liveViews.setScreen(enabled);},onOutput(){liveViews.reset();updateLiveInterruption(renderRecovery.lost);dirty=true;},onOpen(){liveWasPlaying=started&&!paused&&s.phase!=='finished';pause();},onClose(){if(liveWasPlaying)resumeRound();liveWasPlaying=false;}});$('#pause').before(liveBroadcast.button);$('#keys').before(liveBroadcast.settings);
function rebuild(){const humanIndex=s.config.mode==='hunt'?1:0,specs=[s.player,...s.hunters].map((a,i)=>{const id=a.id==='player'?'white-michi-road-saber-ren':a.id,controlled=i===humanIndex;return{id,controlled,key:controlled&&companion?'companion:'+companion.id:'roster:'+id};}),next=actorModels.reconcile(specs);models.length=0;models.push(...next);while(balloons.length<3)balloons.push(balloon());for(const b of balloons)b.root.visible=b.rope.visible=false;dirty=true;}
rebuild();const props=createHuntProps({scene,camera,handAttachments,makeClone:()=>avatar(s.player.id==='player'?'white-michi-road-saber-ren':s.player.id,s.config.mode!=='hunt')}),feedback=createHuntFeedback({scene}),motionTrails=createHuntMotionTrails({scene});props.prepare(models[0],{needed:s.player.item==='clone'});
const itemStatus=createHuntItemStatus(),itemCueStyle=document.createElement('style');itemCueStyle.textContent='#use{transition:box-shadow .14s,border-color .14s}#use[data-item-cue="pickup"]{box-shadow:inset 0 0 0 3px #73dca9,0 0 14px #73dca955}#use[data-item-cue="full"]{box-shadow:inset 0 0 0 3px #e3a844,0 0 14px #e3a84455}#notice{white-space:pre-line}body.hunt:has(.tag-ink-paint:not([hidden])) #notice{display:none}@media(prefers-reduced-motion:reduce){#use{transition:none}}';document.head.append(itemCueStyle);$('#notice').setAttribute('role','status');$('#notice').setAttribute('aria-live','polite');
const proofClient=createHuntProofClient({createWorker:()=>new Worker(new URL('./imasora-sliding-tag-hunt-worker.mjs',import.meta.url),{type:'module'}),onReply:receiveProof});let receiptId=0;
let replayTicket=0,recordingReplay=false,recordingScope='finish';
const recordShare=createHuntScopedVideoShare({onChange:syncReplayShare});
function syncReplayShare(info){
 const currentResult=results.setShareState(info);
 if(typeof videoScopeChoices!=='undefined')refreshVideoScopeChoices(info);
 if(currentResult&&recordingReplay&&info.status==='failed'&&info.ticket===replayTicket&&info.scope===recordingScope){
  finishReplay(false,{recordingFailed:true});
 }
}
function saveReplayFile(url,name){const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();}
const results=createHuntResults({onSaveVideo:()=>recordShare.activate(saveReplayFile,{save:true}),onRetry:()=>begin(),onConfigure:()=>openResultConfig(),onShare:()=>{if(recordShare.snapshot().status!=='ready'){startReplay(undefined,recordShare.scope,{record:true});return;}return recordShare.activate(saveReplayFile);}}),resultBack=document.createElement('button');resultBack.id='result-back';resultBack.textContent='結果へ戻る';resultBack.hidden=true;$('#begin').insertAdjacentElement('afterend',resultBack);resultBack.onclick=showResult;

const growthStatus=document.createElement('output');growthStatus.id='round-growth-status';growthStatus.hidden=true;growthStatus.setAttribute('aria-live','polite');growthStatus.style.cssText='white-space:pre-line;font-size:13px;line-height:1.5;margin:8px 0;color:#325c53';document.querySelector('#round-result .tr-actions').before(growthStatus);
const startNotice=growthStatus.cloneNode(false);startNotice.id='round-start-notice';growthStatus.after(startNotice);
function showStartNotice(text){
 document.querySelector('.practice-note').textContent=text;
 startNotice.textContent=text;
 // The result panel already controls visibility when closed.
 startNotice.hidden=!text;
}
let lastGrowthReply=null;
function showGrowthResult(id,reply){if(!results.isCurrent(id))return;lastGrowthReply={id,reply};const r=growth.describe(id,reply);if(!r)return;growthStatus.hidden=false;growthHome.textContent=r.status==='received'?'ホームへ戻る':'ホームで成果を受け取る';growthStatus.textContent=r.status==='received'?'この試合の成果は受取済みです。':r.status==='pending'?'今回の育成時間 +'+globalThis.ImasoraTagGrowth.formatSeconds(r.activeSeconds)+(r.victory?.points?'\n勝利ポイント +'+r.victory.points+'pt（ホームで確定）':r.victory?.reason==='participation'?'\n勝利ポイントは、自分で操作して移動した時間が試合の30%以上ある勝利でもらえます（180秒の試合なら54秒以上）。':'')+'\n'+(!r.durable?'この画面を閉じず、ホームで受け取ってね。':r.activeSeconds?'ホームでまとめて受け取れます。':'操作した時間が育成に貯まります。'):r.durable===false?'この画面を閉じず、ホームで成果を受け取ってね。':r.status==='checking'?'育成時間を確認中…':'育成時間はホームで再確認できます。';}
const growthHome=document.createElement('button');growthHome.id='growth-home-return';growthHome.textContent='ホームへ戻る';growthHome.hidden=!companion;growthHome.style.cssText='min-height:44px;width:100%;margin-top:8px;background:#ffe3a1;color:#294556;font-weight:bold';document.querySelector('#round-result .tr-actions').before(growthHome);growthHome.onclick=returnHuntHome;
function returnHuntHome(event){
 // Session storage and the emergency handoff belong to this tab.
 event?.preventDefault();
 let previousName,transferName;
 try{
  if(companion)try{growth.flush();}catch{
   previousName=window.name;
   transferName=growth.handoff(previousName);
   window.name=transferName;
   if(window.name!==transferName)throw Error('TAG_HANDOFF_UNAVAILABLE');
  }
  location.assign(huntHomeUrl(location.href,companion?.homePath).href);
 }catch{
  if(transferName!==undefined)try{
   if(window.name===transferName)window.name=previousName;
  }catch{}
  showStartNotice('ホームへ戻れませんでした。この画面を残して、もう一度試してね。');
 }
}
function refreshGrowthResult(){if(lastGrowthReply)showGrowthResult(lastGrowthReply.id,lastGrowthReply.reply);}
addEventListener('storage',event=>{if(event.key===null||event.key===globalThis.ImasoraSlidingTagEntry?.HOME_KEY)refreshGrowthResult();});
addEventListener('pageshow',refreshGrowthResult);
const replayLabel=document.createElement('output');replayLabel.id='touch-replay-label';replayLabel.textContent='▶ リプレイ';replayLabel.hidden=true;replayLabel.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);padding:9px 15px;background:#244b65d9;color:#fff7d9;border:2px solid #fff9;border-radius:24px;font:bold 15px system-ui;pointer-events:none;z-index:7';document.body.append(replayLabel);
const replayChoices=document.createElement('div');
replayChoices.hidden=true;
replayChoices.setAttribute('role','group');
replayChoices.setAttribute('aria-label','見るリプレイを選ぶ');
replayChoices.className='tr-replays';
function replayButton(id,label,scope){
 const button=document.createElement('button');
 button.id=id;button.textContent=label;

 button.onclick=()=>startReplay(undefined,scope);
 replayChoices.append(button);
}
replayButton('touch-replay-again','▶ 決着シーン','finish');
replayButton('touch-replay-full','▶ 試合全体','full');
$('#round-result .tr-actions').before(replayChoices);
const videoScopeChoices=document.createElement('div');videoScopeChoices.className='tag-video-scope';videoScopeChoices.setAttribute('role','group');videoScopeChoices.setAttribute('aria-labelledby','tag-video-scope-title');videoScopeChoices.innerHTML='<h3 id="tag-video-scope-title">動画にする範囲</h3><div class="tag-video-scope-buttons"><button type="button" data-video-scope="finish" aria-pressed="true">決着シーン</button><button type="button" data-video-scope="full" aria-pressed="false">試合全体</button></div><p data-video-scope-note>決着の少し前からの短い動画です。</p>';
$('#round-result .tr-video-actions').before(videoScopeChoices);
function refreshVideoScopeChoices(info){
 for(const button of videoScopeChoices.querySelectorAll('[data-video-scope]')){button.setAttribute('aria-pressed',String(button.dataset.videoScope===info.scope));button.disabled=info.blocked;}
 videoScopeChoices.querySelector('[data-video-scope-note]').textContent=info.scope==='full'?'試合の長さと同じ時間をかけて動画を作ります。画面を開いたまま待ってね。途中で中止できます。':'決着の少し前からの短い動画です。';
}
for(const button of videoScopeChoices.querySelectorAll('[data-video-scope]'))button.onclick=()=>recordShare.select(button.dataset.videoScope);

const replayControls=document.createElement('div');
replayControls.className='tag-replay-controls';
replayControls.hidden=true;
replayControls.setAttribute('role','group');
replayControls.setAttribute('aria-label','試合全体の再生操作');
replayControls.innerHTML='<button type="button">一時停止</button><input type="range" min="0" step="any" aria-label="リプレイの再生位置"><span aria-hidden="true"></span><select data-replay-rate aria-label="リプレイの再生速度"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select><select data-replay-highlights aria-label="リプレイの見どころ"></select>';
document.body.append(replayControls);
const replayToggle=replayControls.querySelector('button'),replayPosition=replayControls.querySelector('input'),replayTime=replayControls.querySelector('span'),replayHighlight=replayControls.querySelector('[data-replay-highlights]'),replayRate=replayControls.querySelector('[data-replay-rate]');
let replayHighlights=[];
function replayTimeText(time){
 const seconds=Math.floor(time+1e-8);
 return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
function updateReplayControls(time){
 const current=replayTimeText(time),total=replayTimeText(Number(replayPosition.max));
 replayPosition.value=String(time);
 const label=current+' / '+total;
 if(replayTime.textContent!==label){
  replayTime.textContent=label;
  replayPosition.setAttribute('aria-valuetext',label);
 }
}
function setReplayPaused(next){
 if(recordingReplay)return false;
 if(!next&&(document.hidden||renderRecovery.lost))return false;
 if(!replay.setPaused(next))return false;
 replayToggle.textContent=replay.paused?'再生':'一時停止';
 if(replay.paused)audio.pause();else audio.activate();
 last=performance.now();dirty=true;
 return true;
}
function suspendReplay(){
 if(!replay.active)return false;
 // Full replay can resume from its existing playhead. End the short replay
 // so the recorder never publishes a clip interrupted by a hidden tab.
 if(recordingReplay||!setReplayPaused(true))finishReplay();
 return true;
}
replayToggle.onclick=()=>setReplayPaused(!replay.paused);
replayPosition.oninput=()=>seekReplayAt(Number(replayPosition.value));
replayPosition.title='矢印で1秒、Page Up・Page Downで10秒移動';
replayPosition.onkeydown=event=>{
 if(event.isComposing||event.keyCode===229||event.altKey||event.ctrlKey||event.metaKey||event.defaultPrevented)return;
 const position=Number(replayPosition.value),end=Number(replayPosition.max);
 let time;
 switch(event.key){
  case 'ArrowLeft':case 'ArrowDown':time=position-1;break;
  case 'ArrowRight':case 'ArrowUp':time=position+1;break;
  case 'PageDown':time=position-10;break;
  case 'PageUp':time=position+10;break;
  case 'Home':time=0;break;
  case 'End':time=end;break;
  case 'Escape':event.preventDefault();finishReplay();return;
  default:return;
 }
 event.preventDefault();
 seekReplayAt(Math.max(0,Math.min(end,time)));
};
replayRate.onchange=()=>{
 if(recordingReplay)return;
 if(!replay.setSpeed(Number(replayRate.value)))return;
 last=performance.now();dirty=true;
};
replayHighlight.onchange=()=>{
 const index=replayHighlight.value;
 replayHighlight.value='';
 const chapter=index===''?null:replayHighlights[Number(index)];
 if(chapter)seekReplayAt(chapter.seek);
};
function seekReplayAt(time){
 if(recordingReplay)return false;
 if(!replay.seek(time))return;
 // A paused seek may paint only once, so the broadcast must take that frame.
 if(liveBroadcast.output.opened)liveViews.reset();
 audio.pause();replayToggle.textContent='再生';
 replayCamera.reset();rearMirror.invalidate();resetReplayPoses();replaySound.reset();
 updateReplayControls(time);
 dirty=true;
}
function openReplayControls(scope){
 replayControls.hidden=scope!=='full';
 if(replayControls.hidden)return;
 replayRate.value='1';
 replayHighlights=replay.highlightList();
 const prompt=new Option('見どころ','');
 replayHighlight.replaceChildren(prompt,...replayHighlights.map((chapter,index)=>new Option(replayTimeText(chapter.time)+' · '+chapter.label,String(index))));
 replayPosition.max=String(s.time);
 replayToggle.textContent='一時停止';
 updateReplayControls(0);
}
const replayVideo=createHuntReplayVideo({makeAudio(){return createHuntReplayAudio(audio);}});
function resetReplayPoses(){for(const m of models){m.gait.reset();m.action.reset();}props.prepare(models[0],{needed:s.player.item==='clone'});feedback.reset();motionTrails.reset();}
function startReplay(state,scope='finish',{record=false}={}){
 if(renderRecovery?.lost||replay.active)return false;
 if(!replay.start(state,{scope}))return false;
 replayCamera.reset();clear();resetReplayPoses();replaySound.reset();audio.pause();audio.activate();audio.setGlide(0);
 // Watching a replay never allocates an encoder. Only the video action records.
 if(record){
  recordShare.prepare(replayTicket,()=>{
   recordingReplay=true;recordingScope=scope;renderQuality.setCapture(true);
   const summary=huntResultSummary({result:s.result,config:s.config,controlledOwner:controlledHuntActor(s).owner,ticket:replayTicket});
   return replayVideo.start(canvas,summary,{scope,seconds:s.time});
  },{scope});
 }
 results.hide();$('#panel').hidden=true;resultBack.hidden=true;
 replayLabel.textContent=recordingReplay?(scope==='full'?'試合全体':'決着シーン')+'の動画を作成中':'▶ '+(scope==='full'?'試合全体':'決着シーン');
 replayLabel.hidden=false;replayChoices.hidden=false;openReplayControls(scope);
 if(recordingReplay)replayControls.hidden=true;
 $('#pause').textContent=recordingReplay?'動画作成を中止':'リプレイをとばす';
 document.body.classList.remove('playing','active');dirty=true;last=performance.now();
 (scope==='full'&&!recordingReplay?replayToggle:canvas).focus({preventScroll:true});return true;
}
function finishReplay(completed=false,{recordingFailed=false}={}){
 if(!replay.active)return;
 const full=replay.scope==='full';
 if(recordingReplay){
  recordingReplay=false;
  if(completed)replayVideo.finish();
  else{
   if(!recordingFailed)recordShare.cancel(replayTicket,recordingScope);
   replayVideo.cancel();
  }
 }
 audio.pause();replay.stop();yaw=renderYaw;clear();resetReplayPoses();replayLabel.hidden=true;replayControls.hidden=true;
 const focusTarget=recordingFailed?$('#round-result [data-share]'):full?$('#touch-replay-full'):null;
 $('#pause').textContent='結果を隠す';results.open({focus:!focusTarget});focusTarget?.focus({preventScroll:true});dirty=true;last=performance.now();
}
function showResult(){
 if(replay.active)finishReplay();
 if(!results.hasResult)return;
 // Returning from setup discards choices that never entered a match.
 if(!$('#panel').hidden&&(mode!==s.config.mode||opponents.some((id,i)=>id!==s.config.opponents[i]))){
  mode=s.config.mode;opponents=[...s.config.opponents];refreshChoiceControls();
 }
 yaw=renderYaw;clear();
 $('#panel').hidden=true;$('#resume').hidden=true;resultBack.hidden=true;
 $('#pause').textContent='結果を隠す';results.open();dirty=true;
}
function hideResult(){results.hide();const button=$('#pause');button.textContent='結果を見る';button.focus({preventScroll:true});dirty=true;}
function openResultConfig(){if(replay.active)finishReplay();if(!results.hasResult)return;yaw=renderYaw;clear();results.hide();$('#panel').hidden=false;$('#resume').hidden=true;resultBack.hidden=false;$('#title').textContent='次の組合せ';$('#note').textContent='相手を選んで、もう一度勝負しよう。';$('#begin').textContent='この組合せであそぶ';$('#pause').textContent='結果を見る';void updateNotice.check();dirty=true;resultBack.focus({preventScroll:true});}
// Proof checking still protects shared growth; times are no longer saved or ranked.
function receiveProof(reply,proof){
 if(results.isCurrent(reply.id)){
  canvas.dataset.proof=reply.unavailable?'unavailable':reply.ok?'checked':'failed';
  showGrowthResult(reply.id,reply);
 }
}

function holdCameraView(){const held=holdHuntCameraView(smoothCamera.stats(),{yaw:renderYaw,pitch});yaw=held.yaw;pitch=held.pitch;}
function clear(){globalThis.IMASORA_BUTTON_FEEDBACK?.release();holdCameraView();frameBudget.reset();renderQuality.reset();const captures=[[canvas,drag?.id],[$('#pad'),padGesture?.id]];for(const id of thumbPresses.keys())for(const name of['dash','jump'])captures.push([$('#'+name),id]);keys.clear();keyboardTimeline.clear();touchButtons.clear();jumpOwners.reset();axis={x:0,z:0};padGesture=null;drag=null;useInput.clear();diveInput.clear();inputMemory.heading=null;inputMemory.reverseCameraUntil=0;$('#pad i').style.transform='';releaseHuntPointerCaptures(captures);}
function newSeed(){try{return crypto.getRandomValues(new Uint32Array(1))[0];}catch{return Date.now()>>>0;}}
const renderStatus=document.createElement('output');renderStatus.id='render-recovery-status';renderStatus.hidden=true;renderStatus.setAttribute('role','status');renderStatus.setAttribute('aria-live','polite');renderStatus.style.cssText='position:fixed;top:16%;left:50%;transform:translateX(-50%);max-width:280px;padding:12px 18px;border:2px solid #d5f8ff;border-radius:18px;background:#244b65ed;color:#fff8df;font:bold 16px/1.5 system-ui;text-align:center;white-space:pre-line;pointer-events:none;z-index:12';renderStatus.textContent='画面を復旧中…\n対戦は止まっています';document.body.append(renderStatus);
const liveRenderRecoveryMessage='ゲーム映像を復旧中…';
function updateLiveInterruption(renderLost){
 if(renderLost)liveBroadcast.update(liveRenderRecoveryMessage);
 else if(document.hidden)liveBroadcast.update('ゲーム画面が非表示 · 映像を一時停止中');
}
const renderRecovery=createHuntRenderRecovery({canvas,isActive:()=>started&&!paused&&s.phase!=='finished',suspend(){rearMirror.hide();liveViews.showScreen(false);yaw=renderYaw;clear();audio.pause();paused=true;frameBudget.reset();last=performance.now();dirty=true;suspendReplay();},restore(wasPlaying){clear();liveViews.reset();frameBudget.reset();last=performance.now();dirty=true;if(wasPlaying&&$('#panel').hidden)resumeRound({focus:false});},onStatus(state){renderStatus.hidden=!state.lost;canvas.dataset.renderRecovery=JSON.stringify(state);updateLiveInterruption(state.lost);}});canvas.dataset.renderRecovery=JSON.stringify(renderRecovery.stats());
function begin(){
 if(renderRecovery.lost||!growth.canStart())return;
 if(!companionGuard())return;
 const player=models.find(actor=>actor.controlled);
 const playerRadius=player?.radius??2.7,playerShape=player?.contactKey??huntTouchShapeKey(companion);
 let nextRound;
 try{
  nextRound=recordFreshHunt({opponents,startKey,playerRadius,playerShape,mode,seed:newSeed()},started?s:null,recordPlayableHunt);
  growth.admit(nextRound.state.config);
 }catch{
  showStartNotice('次の対戦を準備できません。もう一度ためしてね。');
  return;
 }
 // Persist a result-screen edit only after the new match was admitted.
 if(results.hasResult)saveChoices();
 round=nextRound;
 s=round.state;
 document.querySelector('.practice-note').textContent=growth.status();
 startNotice.hidden=true;startNotice.textContent='';
 lastGrowthReply=null;growthStatus.hidden=true;growthStatus.textContent='';
 padCamera=false;clear();inkNotice.reset();itemStatus.reset();lastItemCue='';$('#use').dataset.itemCue='';$('#notice').hidden=true;$('#notice').dataset.kind='';$('#notice').dataset.until='0';roleMarkers.reset();replay.reset();replayQueued=false;replayLabel.hidden=true;replayChoices.hidden=true;feedback.reset();motionTrails.reset();replayVideo.cancel();recordingReplay=false;replayTicket=0;recordShare.reset();results.reset();resultBack.hidden=true;$('#resume').hidden=true;$('#pause').textContent='ひと休み';canvas.dataset.spawnLayout=JSON.stringify(s.spawnLayout);canvas.dataset.startItems=JSON.stringify([s.player,...s.hunters].map(a=>a.item));canvas.dataset.seed=String(s.config.seed);rebuild();props.prepare(models[0],{needed:s.player.item==='clone'});yaw=controlledHuntActor(s).yaw+Math.PI;renderYaw=yaw;smoothCamera.reset({yaw:renderYaw,pitch});paused=false;started=true;frameBudget.restart();last=performance.now();lastCount=-1;$('#panel').hidden=true;document.body.dataset.playingRole=s.config.mode;document.body.classList.add('playing','active');canvas.dataset.proof='recording';canvas.setAttribute('aria-label',mode==='hunt'?'広い氷の街で仲間の鬼と追いかけるフィールド':'広い氷の街で鬼3匹から逃げるフィールド');audio.activate();canvas.focus({preventScroll:true});}
function pause(){
 renderRecovery.cancelResume();
 if(suspendReplay())return;
 yaw=renderYaw;clear();
 audio.pause();dirty=true;
 if(!started||s.phase==='finished')return;
 paused=true;$('#panel').hidden=false;$('#resume').hidden=false;
 void updateNotice.check();
 $('#title').textContent='ひと休み';$('#begin').textContent='新しい勝負';
 $('#note').textContent='同じ勝負をつづける？ 次の組合せも選べるよ。';
 document.body.classList.remove('playing','active');
}
$('#begin').onclick=begin;
$('#pause').onclick=()=>{
 if(replay.active){finishReplay();return;}
 if(results.hasResult){
  if(results.visible)hideResult();
  else showResult();
  return;
 }
 pause();
};
$('#resume').onclick=()=>resumeRound();
function resumeRound({focus=true}={}){
 if(renderRecovery.lost||!started||s.phase==='finished')return false;
 if(document.hidden){pause();return false;}
 if(!companionGuard())return false;
 clear();
 paused=false;last=performance.now();frameBudget.reset();
 $('#panel').hidden=true;document.body.classList.add('playing','active');
 audio.activate();
 if(focus)canvas.focus({preventScroll:true});
 return true;
}
let selectingSlot=0;const select=createTagCharacterSelect({characters:TAG_CHARACTERS,onChoose:id=>{opponents[selectingSlot]=id;refreshSlots();if(!results.hasResult)saveChoices();}});
const opponentSlots = $('#opponent-slots');
const rollButton = $('#roll-opponents');
const rollResult = $('#roll-opponents-result');
const cpuRoleName = index => mode === 'hunt' && index === 0 ? '逃げ役' : roleNames[index];

function refreshSlots({ rolled = false } = {}) {
 rollResult.textContent = '';
 opponentSlots.replaceChildren(...opponents.map((id, index) => {
  const character = roster.get(id);
  const role = cpuRoleName(index);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'opponent-slot';
  button.style.setProperty('--slot-color', ['#ffbd9b', '#a6d5f2', '#a8dfbc'][index]);
  if (rolled) {
   button.dataset.rolled = '';
   button.style.setProperty('--roll-delay', index * 65 + 'ms');
  }
  button.innerHTML = '<b></b><strong></strong><small></small><div class="tm-scores" aria-label="走りの能力"></div><span>選びなおす ›</span>';
  button.querySelector('b').textContent = role;
  button.querySelector('strong').textContent = character.name;
  button.querySelector('small').textContent = character.ability.title;
  button.querySelector('.tm-scores').innerHTML = ['加速', '速さ', '小回り'].map((name, i) => {
   const score = character.ability.scores[i];
   return '<div class="tm-score"><label>' + name + '</label><i style="--score:' + score * 20 + '%" aria-label="' + name + ' ' + score + '/5"></i></div>';
  }).join('');
  button.onclick = () => {
   selectingSlot = index;
   clear();
   select.open(id, role + 'をえらぶ');
  };
  return button;
 }));
}

rollButton.onclick = () => {
 if ($('#panel').hidden) return;
 const next = rollHuntOpponents(roster.keys(), opponents);
 if (!next) return;
 opponents = next;
 refreshSlots({ rolled: true });
 if (!results.hasResult) saveChoices();
 rollResult.textContent = opponents.map((id, index) => cpuRoleName(index) + ' ' + roster.get(id).name).join('、');
};
function refreshRoleCopy(){$('#roles').textContent=mode==='hunt'?'あなた＋先回り役・巡回役':'追跡役・先回り役・巡回役';if(!started)$('#note').textContent=mode==='hunt'?'道具を拾って、仲間の鬼2匹と逃げ役を追おう！':'角の階段では、鬼との間合いを見て2段ジャンプで切り返そう！';}
const itemGuide=createHuntItemGuide({onOpen:clear});if($('#menu-guide-slot'))$('#menu-guide-slot').append(itemGuide.button);else $('#begin').insertAdjacentElement('beforebegin',itemGuide.button);
function refreshChoiceControls(){
 for(const b of document.querySelectorAll('[data-role]'))b.setAttribute('aria-pressed',String(b.dataset.role===mode));
 refreshSlots();itemGuide.setRole(mode);refreshRoleCopy();
}
for(const b of document.querySelectorAll('[data-role]'))b.onclick=()=>{mode=b.dataset.role;refreshChoiceControls();if(!results.hasResult)saveChoices();};
refreshChoiceControls();
const focusField=()=>canvas.focus({preventScroll:true});
bindHuntTouchGuard(document,()=>document.body.classList.contains('playing'));
const useInput=createHuntActionInput($('#use'),()=>!paused,focusField);
const diveInput=createHuntActionInput($('#dive'),()=>!paused&&s.config.mode==='hunt',focusField);
const bindings=()=>globalThis.IMASORA_KEYS.bindings,active=id=>holds.has(id)||bindings()[id].some(k=>keyboardTimeline.has(k));
function buttonKeyHint(id){const names=globalThis.IMASORA_KEYS.bindings[id].filter(Boolean).map(code=>globalThis.IMASORA_KEYS.label(code));return names.join('・')+'キー';}
let itemUseHint='';function refreshItemKeys(){itemUseHint=huntItemKeyCodes(bindings()).map(code=>globalThis.IMASORA_KEYS.label(code)).join('・')+'キー';itemGuide.setShortcut(itemUseHint);paintTouchDash(touchButtons.stats());$('#jump').title=$('#jump').dataset.keyHint='ジャンプ：'+buttonKeyHint('jump');const diveAvailable=huntDiveShortcutAvailable(bindings());$('#dive').title=$('#dive').dataset.keyHint=diveAvailable?'ヘッドスライディング（Hキー）':'ヘッドスライディング（画面のボタン）';const hint=$('#dive-key-hint');if(hint)hint.textContent=diveAvailable?'ダイブ：Hキー（鬼のみ）':'ダイブ：画面のボタン（Hは別の操作に設定中）';lastItem='@keys';dirty=true;}globalThis.IMASORA_KEYS.onChange(refreshItemKeys);refreshItemKeys();
const keyPanel=globalThis.IMASORA_KEYS.createPanel({clearInput:clear});for(const row of keyPanel.querySelectorAll('.keyboard-settings-row'))if(!['forward','back','left','right','jump','dash','tool','menu'].includes(row.querySelector('[data-key-action]')?.dataset.keyAction))row.remove();for(const group of keyPanel.querySelectorAll('.keyboard-settings-group'))if(!group.querySelector('.keyboard-settings-row'))group.remove();const diveKeyHint=document.createElement('p');diveKeyHint.id='dive-key-hint';diveKeyHint.textContent=huntDiveShortcutAvailable(bindings())?'ダイブ：Hキー（鬼のみ）':'ダイブ：画面のボタン（Hは別の操作に設定中）';$('#keys').append(diveKeyHint,keyPanel);const touchSettings=createHuntTouchSettings({storage,clearInput:clear,onOpen:pause,onApply:layout=>{$('#pad').style.left=layout.pad.x+'px';$('#pad').style.top=layout.pad.y+'px';$('#pair').style.left=layout.pair.x+'px';$('#pair').style.top=layout.pair.y+'px';}});$('#keys').parentElement.insertBefore(touchSettings.panel,$('#keys'));globalThis.IMASORA_KEYS.connect({clearInput:clear});
function paintTouchDash({mode,latched}){const button=$('#dash');button.textContent=latched?'ダッシュ中':'ダッシュ';button.dataset.latched=String(latched);if(mode==='toggle')button.setAttribute('aria-pressed',String(latched));else button.removeAttribute('aria-pressed');button.title='ダッシュ：'+buttonKeyHint('dash')+' ／ '+(mode==='toggle'?'タッチは押すたび切替':'押している間ダッシュ');}
const dashSetting=document.createElement('div');dashSetting.className='tag-dash-setting';dashSetting.innerHTML='<label>鬼ごっこのタッチダッシュ <select aria-label="タッチダッシュの押し方"><option value="hold">押している間</option><option value="toggle">押すたび切替</option></select></label><p>切替なら、指を離してジャンプできます。休止で解除。</p><p data-dash-save role="status"></p>';const dashSelect=dashSetting.querySelector('select');dashSelect.value=touchButtons.stats().mode;dashSelect.onchange=()=>{clear();touchButtons.setMode(dashSelect.value);dashSetting.querySelector('[data-dash-save]').textContent=saveHuntDashMode(storage,dashSelect.value)?'':'保存できないため、今回はこの設定で遊べます。';dirty=true;};touchSettings.panel.append(dashSetting);
const dashStyle=document.createElement('style');dashStyle.textContent='.tag-dash-setting{margin-top:12px}.tag-dash-setting label{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:14px;font-weight:bold}.tag-dash-setting select{min-height:44px;padding:6px 10px;border:2px solid #fff;border-radius:12px;background:#d9eee8;color:#234e5f;font:inherit}body.hunt #dash[data-latched=true]{background:linear-gradient(#fff0ad,#f1be5d);box-shadow:0 0 0 3px #fff1aa,0 3px 8px #7d531c55}';document.head.append(dashStyle);
function soundLabel(){$('#sound-toggle').textContent=soundPreference.enabled?'🔊 効果音：オン':'🔇 効果音：オフ';$('#sound-toggle').setAttribute('aria-pressed',String(soundPreference.enabled));}soundLabel();$('#sound-toggle').onclick=()=>{soundPreference.enabled=!soundPreference.enabled;audio.setEnabled(soundPreference.enabled);saveHuntSound(storage,soundPreference);soundLabel();};
const settingsMenu=createHuntSettingsMenu({clearInput:clear,touchPanel:touchSettings.panel,liveButton:liveBroadcast.settings});
const fieldActive=()=>replay.active||started&&!paused&&s.phase!=='finished';
const movementKeys=['forward','back','left','right','dash'];
function keyTime(e){const now=performance.now(),at=e.timeStamp;return Number.isFinite(at)&&at>0&&at<=now?at:now;}
function releaseKeyboard(){
 jumpOwners.releaseKeyboard();
 keys.clear();
 keyboardTimeline.clear();
 useInput.releaseKeyboard();
 diveInput.releaseKeyboard();
}
canvas.addEventListener('blur',releaseKeyboard);
addEventListener('keydown',e=>{
 const context=huntKeyboardContext(e,{canvas,playing:fieldActive(),capturing:globalThis.IMASORA_KEYS.capturing,dialogOpen:!!document.querySelector('dialog[open]')});
 if(!context)return;
 const b=bindings();
 if(replay.active){
  const menu=b.menu.includes(e.code),activation=['Space','Enter'].includes(e.code);
  if(activation&&replayControls.contains(e.target))return;
  if(!e.repeat&&(menu||activation)){e.preventDefault();finishReplay();}
  return;
 }
 if(b.menu.includes(e.code)){
  const command=huntMenuCommand({repeat:e.repeat,hasResult:results.hasResult,configVisible:!$('#panel').hidden,resultVisible:results.visible,paused});
  if(command==='native'||command==='none')return;
  e.preventDefault();
  if(command==='show-result')showResult();
  else if(command==='hide-result')hideResult();
  else if(command==='pause')pause();
  return;
 }
 if(!context.field||paused)return;
 const diveKey=e.code===HUNT_DIVE_KEY&&s.config.mode==='hunt'&&huntDiveShortcutAvailable(b);
 const itemKey=e.code==='KeyL'&&huntItemShortcutAvailable(b);
 if(!diveKey&&!itemKey&&!['forward','back','left','right','jump','dash','tool'].some(id=>b[id].includes(e.code)))return;
 e.preventDefault();
 if(e.repeat)return;
 if(diveKey){diveInput.press();return;}
 if(itemKey){useInput.press();return;}
 if(b.jump.includes(e.code)&&!keys.has(e.code))jumpOwners.set('key:'+e.code,true);
 if(b.tool.includes(e.code))useInput.press();
 if(movementKeys.some(id=>b[id].includes(e.code)))keyboardTimeline.set(e.code,true,keyTime(e));
 keys.add(e.code);
});
addEventListener('keyup',e=>{if(keys.delete(e.code))keyboardTimeline.set(e.code,false,keyTime(e));jumpOwners.set('key:'+e.code,false);});
canvas.onpointerdown=e=>{if(replay.active)return;if(drag||paused&&s.phase!=='finished'||!captureHuntPointer(canvas,e))return;if(fieldActive())canvas.focus({preventScroll:true});yaw=renderYaw;if(e.pointerType==='touch'&&!paused)padCamera=true;drag={id:e.pointerId,x:e.clientX,y:e.clientY};};canvas.onpointermove=e=>{if(drag?.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.006;pitch=Math.max(.15,Math.min(1.15,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;dirty=true;};for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)drag=null;});
function pad(e){
 if(e.pointerId!==padGesture?.id)return;
 const x=e.clientX-padGesture.x,z=e.clientY-padGesture.y;
 const distance=Math.hypot(x,z),strength=Math.min(1,distance/44);
 axis=distance>5?{x:x/distance*strength,z:z/distance*strength}:{x:0,z:0};
 $('#pad i').style.transform=`translate(${axis.x*29}px,${axis.z*29}px)`;
}
const movementPad=$('#pad');
movementPad.onpointerdown=e=>{
 if(paused||padGesture||!captureHuntPointer(movementPad,e))return;
 e.preventDefault();
 const box=movementPad.getBoundingClientRect();
 // A browser-bar resize may move the visible pad during this gesture.
 padGesture={id:e.pointerId,x:box.left+box.width/2,y:box.top+box.height/2};
 pad(e);
};
movementPad.onpointermove=pad;
for(const type of ['pointerup','pointercancel','lostpointercapture']){
 movementPad.addEventListener(type,e=>{
  if(e.pointerId!==padGesture?.id)return;
  padGesture=null;
  axis={x:0,z:0};
  $('#pad i').style.transform='';
 });
}
function readHuntMovement(human){
 const x=(active('right')?1:0)-(active('left')?1:0),z=(active('back')?1:0)-(active('forward')?1:0);
 // Both devices steer one body heading. Never sum vectors produced from two
 // independently accumulated headings (they can cancel or reverse a turn).
 const keyboard=Boolean(x||z);
 const steering=keyboard?{x,z}:padGesture?axis:{x:0,z:0};
 if(s.phase!=='playing'){inputMemory.heading=null;return{x:0,z:0};}
 if(steering.x||steering.z)padCamera=false;
 return huntKeyboardMovement(inputMemory,human.yaw,steering,STEP,{keyboard});
}
for(const id of['dash','jump']){const b=$('#'+id),other=id==='dash'?'jump':'dash';b.onpointerdown=e=>{if(paused||!captureHuntPointer(b,e))return;e.preventDefault();touchButtons.set(e.pointerId,[id]);};b.onpointermove=e=>{if(!thumbPresses.has(e.pointerId))return;const r=$('#'+other).getBoundingClientRect(),inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;touchButtons.set(e.pointerId,inside?[id,other]:[id]);};b.addEventListener('pointerup',e=>touchButtons.release(e.pointerId));for(const type of['pointercancel','lostpointercapture'])b.addEventListener(type,e=>touchButtons.cancel(e.pointerId));}
let companionReadBlocked=false,companionInvalidated=false;
function companionGuard(){
 if(!homeMode)return true;
 if(companionInvalidated)return false;
 const current=readCompanion();
 if(companion&&current.status==='ready'&&current.companion?.id===companion.id){
  if(companionReadBlocked){
   companionReadBlocked=false;
   showStartNotice('');
   document.querySelector('.practice-note').textContent=growth.status();
  }
  return true;
 }
 if(started&&s.phase!=='finished'&&(!paused||$('#panel').hidden)){
  pause();
 }
 if(current.status==='unavailable'&&companion){
  companionReadBlocked=true;
  showStartNotice('相棒の保存を確認できません。「つづける」か「あそぶ」で再確認できます。');
  return false;
 }
 companionInvalidated=true;
 const message='ホームから相棒を連れて入りなおしてね。';
 $('#begin').disabled=true;
 $('#resume').hidden=true;
 $('#note').textContent=message;
 results.setUnavailable(message);
 showStartNotice(message);
 return false;
}
function suspendView(){pause();}
bindHuntLifecycle({windowTarget:window,documentTarget:document,pause:suspendView,worker:proofClient,audio,onRestore:companionGuard});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){updateLiveInterruption(renderRecovery.lost);return;}
 liveViews.reset();
 dirty=true;
});
let viewportWidth=innerWidth,viewportPortrait=innerHeight>innerWidth,viewportSideTools;
function resize(){
 const w=innerWidth,h=innerHeight,portrait=h>w;
 const {sideTools}=touchSettings.apply();
 // Browser bars may resize the field mid-gesture. Release input when the
 // controls reflow, but keep a hold through ordinary height changes.
 const reflowed=viewportSideTools!==undefined&&sideTools!==viewportSideTools;
 if(w!==viewportWidth||portrait!==viewportPortrait||reflowed)clear();
 viewportWidth=w;
 viewportPortrait=portrait;
 viewportSideTools=sideTools;
 rearMirror.invalidate();
 camera.aspect=w/h;
 camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
 dirty=true;
}
addEventListener('resize',resize);
resize();
function showItemNotice(text,duration,kind='pickup'){$('#notice').dataset.kind=kind;$('#notice').textContent=text;$('#notice').hidden=false;$('#notice').dataset.until=String(s.time+duration);}
function failHint(text){if(!text)return;itemStatus.defer(s.time+1.6);$('#notice').dataset.kind='use-error';$('#notice').textContent=text;$('#notice').hidden=false;$('#notice').dataset.until=String(s.time+1.6);}
function playMatchCue(cue){audio.play(cue);replay.recordSound(s.time,cue);}
function frameEvent(e){
 const owner=controlledHuntActor(s).owner,own=e.owner===owner;
 replay.recordHighlight(e,owner);
 inkNotice.event(s,e);
 if(own&&['item-use','hook-released'].includes(e.type)){
  const notice=$('#notice');
  if(['pickup','use-error','full'].includes(notice.dataset.kind)){notice.hidden=true;notice.dataset.kind='';}
 }
 const gained=itemStatus.event(s,e);
 if(gained&&s.phase==='playing')showItemNotice((ITEM_DEFS[gained.item]?.name??'道具')+'をひろった',gained.duration);
 feedback.event(s,e);
 if(e.type==='trampoline-bounce'&&!own)playMatchCue({type:'jump',stage:3});
 if(own&&['pickup','item-use'].includes(e.type))playMatchCue({type:'item'});
}
const roleMarkers=createHuntRoleMarkers({scene,onDiscover:()=>audio.play({type:'detect'})});
const compassView=createHuntCompassView($('#radar'));
const radarTime=document.createElement('output');radarTime.className='tag-radar-time';radarTime.hidden=true;document.body.append(radarTime);
const radarHud=createHuntRadarHud({radar:$('#radar'),time:radarTime,diagnostics:canvas,compass:compassView});
function drawRadar(human,diagnose,replayState=null){
 const state=replayState??s;
 const fieldVisible=replayState!==null||(!replay.active&&started&&!paused);
 const visible=fieldVisible&&state.phase!=='finished'&&(human.effects.radar??0)>state.time;
 const map=visible||diagnose?huntCompass(state,renderYaw):null;
 radarHud.update(map,{visible,diagnose});
}
const countHud=$('#count'),clockHud=$('#hud'),jumpHud=$('#jump'),diveHud=$('#dive');
const dashHud=$('#dash'),useHud=$('#use');
const diveHudStages={prepare:'構え中',slide:'ダイブ中',recover:'復帰中'};
function setHudValue(target,key,value){
 if(target[key]!==value)target[key]=value;
}
function setHudAttribute(target,key,value){
 if(target.getAttribute(key)!==value)target.setAttribute(key,value);
}
function updateControlHud(human,jumpWait,clockTime=s.time){
 const count=s.phase==='countdown'?Math.ceil(s.countdown):s.time<.65?'GO!':'';
 setHudValue(countHud,'textContent',String(count));
 setHudValue(countHud,'hidden',paused||count==='');
 if(count!==lastCount&&count!==''){
  audio.play(typeof count==='number'?{type:'count',count}:{type:'go'});
  lastCount=count;
 }
 const dizzy=(human.effects?.dizzy??0)>s.time,waiting=jumpWait>0;
 const jumpSeconds=waiting?(Math.ceil(jumpWait*10)/10).toFixed(1)+'秒':'';
 setHudValue(jumpRestLabel,'hidden',!waiting&&!dizzy);
 if(waiting||dizzy)setHudValue(jumpRestLabel,'textContent',dizzy?'ピヨピヨ':jumpSeconds);
 setHudAttribute(jumpHud,'aria-label',dizzy?'ジャンプ ピヨピヨ中':waiting?'ジャンプ 待機 '+jumpSeconds:'ジャンプ');
 setHudAttribute(jumpHud,'aria-disabled',String(waiting||dizzy));
 setHudValue(jumpHud.style,'opacity',waiting||dizzy?'0.65':'');
 setHudValue(jumpHud,'title',dizzy?'ピヨピヨ中':waiting?'着地後の待機時間':human.jumpRestRelease?'指を離してからジャンプ':jumpHud.dataset.keyHint??'ジャンプ');
 setHudAttribute(dashHud,'aria-disabled',String(dizzy));
 setHudValue(dashHud.style,'opacity',dizzy?'0.65':'');
 const hunting=s.config.mode==='hunt';
 setHudValue(diveHud,'hidden',!hunting);
 if(hunting){
  const remaining=(human.nextDiveAt??0)-s.time,airborne=!human.grounded||!!human.flight;
  const stage=diveHudStages[human.dive?.stage];
  setHudValue(diveHud,'title',dizzy?'ピヨピヨ中':airborne?'着地してからダイブ':diveHud.dataset.keyHint??(huntDiveShortcutAvailable(bindings())?'ヘッドスライディング（Hキー）':'ヘッドスライディング'));
  setHudValue(diveHud,'disabled',dizzy||airborne||!!human.pendingItem||!!human.dive||remaining>0);
  setHudValue(diveHud,'textContent',stage??(airborne?'着地後':remaining>0?'ダイブ '+Math.ceil(remaining):'ダイブ'));
 }
 setHudValue(clockHud,'textContent',(hunting?'あなた＋鬼2匹　':'鬼3匹　')+Math.max(0,Math.ceil(s.duration-clockTime))+'秒');
 const item=human.item,useKey=human.hook?'release-hook':item;if(useKey!==lastItem){lastItem=useKey;const def=ITEM_DEFS[human.hook?'hook':item],name=human.hook?'フックをはなす':def?.name;$('#use').innerHTML=def?itemIcon(human.hook?'hook':item)+'<small>'+name+'</small>':'<b>◇</b><small>道具なし</small>';$('#use').setAttribute('aria-label',human.hook?'フックをはなす':def?'使う：'+name:'道具なし');}
 const hasTool=!!ITEM_DEFS[human.hook?'hook':item];
 setHudValue(useHud,'disabled',!hasTool||dizzy);
 setHudAttribute(useHud,'aria-disabled',String(!hasTool||dizzy));
 setHudValue(useHud,'title',hasTool?(dizzy?'ピヨピヨ中':itemUseHint+(human.hook?'で放す':'で使う')):'');
 const itemCue=itemStatus.cue(s.time,!paused&&!replay.active);if(itemCue!==lastItemCue){lastItemCue=itemCue;$('#use').dataset.itemCue=itemCue;}
 if(s.phase==='finished'||s.time>=Number($('#notice').dataset.until||0))setHudValue($('#notice'),'hidden',true);
}
function updateBalloons(view,actors){
 for(let i=1;i<actors.length;i++){
  const actor=actors[i],balloon=balloons[i-1];
  if(huntActorConcealed(view,actor))balloon.root.visible=balloon.rope.visible=false;
  else handAttachments.balloon(balloon,actor,models[i].model.userData.hands?.[0],view.time);
 }
}
function screenActorNodes(actors,rivals){
 return rivals?.flatMap(rival=>{
  const i=actors.indexOf(rival),balloon=balloons[i-1];
  const nodes=[models[i].root,soleShadows[i],...props.attachedNodes(i,rival),...motionTrails.attachedNodes(i)];
  if(balloon)nodes.push(balloon.root,balloon.rope);
  return nodes;
 });
}
function foamRender(view,drawCamera,actors,draw){return props.withFoamView(view,drawCamera,()=>withHuntFoamOcclusion(view,drawCamera,actors,actor=>screenActorNodes(actors,[actor]),draw,{extraEntries:()=>props.occlusionEntries()}));}
function draw(now){now=performance.now();const human=controlledHuntActor(s);const dt=Math.max(0,(now-last)/1000||0);last=Math.max(last,now);if(renderRecovery.lost){liveViews.showScreen(false);return;}const frameSteps=frameBudget.consume(dt,{running:!paused,visible:!document.hidden});let physicsTicks=0;if(document.hidden){liveViews.showScreen(false);renderQuality.reset();return;}renderQuality.setCapture(recordingReplay||liveBroadcast.output.opened);renderQuality.sample(dt,started&&!paused&&!replay.active);if(replay.paused&&!dirty)return;let replayFrame=replay.advance(dt);if(replayFrame?.done){finishReplay(true);replayFrame=null;}
 // Keep the final full-replay image until results. A resize, explicit redraw
 // or live output still needs a frame, and the replay clock advances above.
 if(replayFrame?.progress===1&&replayFrame.delta===0&&replay.scope==='full'&&!dirty&&!liveBroadcast.output.opened)return;
 if(paused&&!replay.active&&!dirty&&now-paintAt<1000)return;paintAt=now;dirty=false;
 if(!paused&&frameSteps.steps){const firstInputAt=frameBudget.firstStepAt(now);for(let tick=0;tick<frameSteps.steps;tick++){keyboardTimeline.sample(firstInputAt+tick*STEP*1000);const input=readHuntMovement(human),use=useInput.read(),attempt=use&&!s.useHeld,item=human.item,failureHint=attempt&&item?huntItemFailureHint(s,human):'',grounded=human.grounded,jumps=human.jumps,diveStage=human.dive?.stage;const applied={...input,jump:jumpOwners.read(),dash:active('dash'),use,dive:diveInput.read()};if(use)canvas.dataset.lastUseInput=JSON.stringify(applied);const oldFacing=human.yaw;round.tick(applied);
 // Catch up faster to an actual keyboard U-turn, after the body has turned.
 if(s.phase==='playing'&&active('back')&&!active('forward')&&!human.flight&&!human.dive&&!human.hook&&
    Math.cos(human.yaw-oldFacing)<-.9)inputMemory.reverseCameraUntil=s.time+.95;
 physicsTicks++;const diveCue=huntDiveAudioCue(diveStage,human);if(diveCue)playMatchCue(diveCue);if(attempt&&item&&!huntItemUseAcknowledged(s,human.owner))failHint(failureHint);for(const e of s.events)frameEvent(e);if(itemStatus.sample(s))showItemNotice('道具は1つまで\n手持ちを使うと拾えます',1.6,'full');if(human.jumps>jumps)playMatchCue({type:'jump',stage:human.jumps});if(!grounded&&human.grounded)playMatchCue({type:'land'});motionTrails.sample(s);replay.record(s,{force:s.phase==="finished",lighting:scenery.lighting,feedbackCues:feedback.replayCues,motionCues:motionTrails.cues});
 if(s.phase==='finished'){yaw=renderYaw;paused=true;clear();for(const cue of huntResultAudioCues(s.result))audio.play(cue);audio.setGlide(0);const proof=round.proof(),id=++receiptId;const growthResult=growth.finish(proof,id);growthStatus.hidden=!companion;growthStatus.textContent=growthResult.formal?(growthResult.queued?'育成時間を確認中…':'この画面を閉じず、ホームで成果を受け取ってね。'):companion?'この対戦では育成の報酬はありません。次はホームで今の空を撮ってから始めよう。':'';growthHome.hidden=!companion;growthHome.textContent=growthResult.formal?'ホームで成果を受け取る':'ホームへ戻る';const submitted=proofClient.submit(proof,id);if(!submitted)canvas.dataset.proof='unavailable';$('#panel').hidden=true;$('#resume').hidden=true;resultBack.hidden=true;results.show({result:s.result,config:s.config,controlledOwner:human.owner,ticket:id});if(growthResult.formal)showGrowthResult(id,submitted?null:{ok:false,unavailable:true});replayTicket=id;$('#pause').textContent='結果を隠す';replayQueued=true;document.body.classList.remove('playing','active');break;}}}
 const jumpWait=huntJumpRestRemaining(s,human);
 const visual=replayFrame?.state??s,visualHuman=controlledHuntActor(visual),visualGround=(x,z)=>trampolineSurface(visual,x,z),visualDt=replayFrame?replayFrame.delta:physicsTicks*STEP,visualPaused=replayFrame?visualDt<=0:paused;
 const fullReplay=!!replayFrame&&replay.scope==="full";
 updateControlHud(human,jumpWait,fullReplay?visual.time:s.time);
 if(replayFrame&&!replay.paused)for(const cue of replaySound.sample(replay.soundsAt(visual.time,replayFrame.delta),{atEnd:replayFrame.progress>=1,caught:!!replayFrame.catcher,win:replayFrame.win}))audio.play(cue);const actors=[visual.player,...visual.hunters];for(let i=0;i<actors.length;i++){const a=actors[i],m=models[i];m.root.position.set(a.x,a.y,a.z);m.root.rotation.y=a.yaw;const tilt=huntTerrainTilt(a);m.root.rotation.x=tilt.pitch;m.root.rotation.z=tilt.roll;const shadow=soleShadows[i],floor=visualGround(a.x,a.z),height=Math.max(0,a.y-floor);shadow.position.set(a.x,floor+.035,a.z);shadow.scale.set(a.radius*.78,Math.max(.6,a.radius*.58),1);shadow.material.opacity=.23/(1+height*.18);applyHuntActorVisibility(visual,a,m,shadow);m.sunglasses.setActive((a.effects.sunglasses??0)>visual.time);m.dizzy.update({time:visual.time,until:a.effects.dizzy??0,sunglasses:(a.effects.sunglasses??0)>visual.time,radius:a.radius});m.inkFeet.setInked(a.owner===visual.player.owner&&(a.effects.ink??0)>visual.time&&!huntInkTrailSuppressed(visual));
 }
 feedback.update(visual,replayFrame?visual.feedbackCues??[]:null);inkView.update(visual);inkNotice.update(s,{visible:!paused&&!replay.active});
 const cameraDt=paused&&!drag&&!replayFrame?0:replay.paused?0:dt;
 let target,pose;
 if(replayFrame){
  ({target,pose}=updateHuntReplayView(replayCamera,visual,{catcher:fullReplay?null:replayFrame.catcher,aspect:camera.aspect,focus:fullReplay?visualHuman:visual.player,dt:cameraDt,scope:replay.scope,viewPlan:replay.viewPlan(camera.aspect)}));
 }else{
  target={x:human.x,y:human.y+4,z:human.z};
  pose=smoothCamera.update(target,{yaw:huntFacingCameraYaw(visualHuman,{freeYaw:yaw,paused,dragging:!!drag||padCamera}),pitch,keepAngle:padCamera,following:!paused&&!drag&&!padCamera,reversing:s.time<(inputMemory.reverseCameraUntil??0),distance:innerHeight>innerWidth?39:33,minDistance:innerHeight>innerWidth?30:17,dt:cameraDt});
 }
 renderYaw=pose.yaw;camera.position.set(pose.position.x,pose.position.y,pose.position.z);camera.lookAt(target.x,target.y,target.z);const near=pose.near??.15;if(camera.near!==near){camera.near=near;camera.updateProjectionMatrix();}scenery.update(now,replayFrame?visual.lighting:null);camera.updateMatrixWorld();motionTrails.update(visual,camera,replayFrame?visual.motionCues??[]:undefined);
 const desktop=liveBroadcast.output.opened,screen=liveViews.showScreen(!paused&&!replayFrame&&s.phase==='playing');
 const output=desktop||screen?liveViews.begin(now,visual,visualHuman,{round:s,replaying:replayFrame?replay.scope:null,paused:visualPaused,desktop,screen,mainCamera:camera}):null;
 let curtainChanged=false;
 renderHuntActorPoses({actors,models,dt:visualDt,groundAt:visualGround,isIce:a=>worldSurface(a.x,a.z)==='ice',paused:visualPaused,human:visualHuman,onStep:replayFrame?null:stepSound,replayTime:replayFrame?.state.time},()=>{
  if(output?.opponent){
   const otherView={...visual,config:{...visual.config,mode:visual.config.mode==='hunt'?'escape':'hunt'}};
   actors.forEach((a,i)=>applyHuntActorVisibility(otherView,a,models[i],soleShadows[i]));
   try{
    props.update(otherView,models,now,{paused:true,groundAt:visualGround,includePickupNames:false});motionTrails.setView(otherView);
    updateBalloons(otherView,actors);
    roleMarkers.withoutLabels(()=>props.render(()=>liveViews.capture('opponent',scenery.centerSky,screenActorNodes(actors,output.hiddenRivals),(viewCamera,draw)=>foamRender(otherView,viewCamera,actors,draw))));
   }finally{
    actors.forEach((a,i)=>applyHuntActorVisibility(visual,a,models[i],soleShadows[i]));motionTrails.setView(visual);
   }
  }
  curtainChanged=roleMarkers.update(visual,{camera,models,viewportHeight:innerHeight,now:now/1000,active:!paused&&!replayFrame&&s.phase==='playing'});
  props.update(visual,models,now,{dt:visualDt,paused:visualPaused,groundAt:visualGround,isIce:a=>worldSurface(a.x,a.z)==='ice'});
  updateBalloons(visual,actors);
  props.render(()=>{
   if(output?.multi)roleMarkers.withoutLabels(()=>liveViews.capture('wide',scenery.centerSky,screenActorNodes(actors,output.hiddenRivals),(viewCamera,draw)=>foamRender(visual,viewCamera,actors,draw)));
   if(output?.multi)scenery.centerSky();
   canvas.dataset.cameraClearance=JSON.stringify(foamRender(visual,camera,actors,()=>withHuntCameraClearance(actors,models,camera.position,()=>renderer.render(scene,camera))));
   if((fullReplay||!paused&&!replayFrame)&&huntRearMirrorActive(visual))rearMirror.draw(now,visualHuman,models[0].root,soleShadows[0],{refresh:curtainChanged,renderView:(viewCamera,draw)=>foamRender(visual,viewCamera,actors,draw)});else rearMirror.hide();
   if(output)liveViews.finish();
   if(replayFrame&&recordingReplay)replayVideo.draw(canvas,now);
  });});
 if(replayQueued){
  replayQueued=false;
  if(replay.complete(s)){
   replayChoices.hidden=false;
   if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)startReplay();
  }
 }
 const sampleHud=now-hudAt>100;
 // A paused replay might not draw another frame until the next input.
 if(sampleHud||fullReplay&&(replay.paused||replayFrame.progress===1&&replayFrame.delta>0)){
  if(fullReplay)updateReplayControls(visual.time);
  if(recordingReplay)replayLabel.textContent=(recordingScope==='full'?'試合全体':'決着シーン')+'の動画を作成中 '+replayTimeText(visual.time)+' / '+replayTimeText(s.time);
  canvas.dataset.replay=JSON.stringify({...replay.stats(),time:replayFrame?.state.time??null});
 }
 drawRadar(fullReplay?visualHuman:human,sampleHud,fullReplay?visual:null);

 if(sampleHud){canvas.dataset.jumpRest=JSON.stringify({remaining:jumpWait,readyAt:human.nextJumpAt??0,needsRelease:!!human.jumpRestRelease,jumps:human.jumps,grounded:human.grounded});const item=human.item;
 canvas.dataset.discoveryAudio=String(audio.stats().counts.detect??0);canvas.dataset.roleMarkers=JSON.stringify(roleMarkers.stats());canvas.dataset.cameraSmooth=JSON.stringify((replayFrame?replayCamera:smoothCamera).stats());canvas.dataset.cameraMode=replayFrame?'replay':'normal';canvas.dataset.cameraFollow=JSON.stringify({actorYaw:human.yaw,cameraYaw:renderYaw,following:!paused&&!drag&&!padCamera&&!replayFrame});canvas.dataset.actorVisibility=JSON.stringify(actors.map((a,i)=>({owner:a.owner,visible:models[i].root.visible,shadow:soleShadows[i].visible,cloaked:(a.effects.cloak??0)>visual.time})));canvas.dataset.compassPaint=JSON.stringify({...compassView.stats(),hud:radarHud.stats()});canvas.dataset.decoyResources=JSON.stringify(props.stats());canvas.dataset.windVisibility=JSON.stringify(props.windStats());canvas.dataset.stepBudget=JSON.stringify(frameBudget.stats());canvas.dataset.materialUpdates=JSON.stringify(models.map(m=>m.materialState.stats()));canvas.dataset.modelResources=JSON.stringify({...actorModels.stats(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures});canvas.dataset.inkRender=JSON.stringify(inkView.stats());canvas.dataset.dizzy=JSON.stringify(models.map(m=>m.dizzy.stats()));canvas.dataset.feedback=JSON.stringify(feedback.stats());canvas.dataset.motionTrails=JSON.stringify(motionTrails.stats());canvas.dataset.proofQueue=JSON.stringify(proofClient.stats());canvas.dataset.trampoline=JSON.stringify(s.trampoline);canvas.dataset.mode=s.config.mode;canvas.dataset.controlled=human.owner;canvas.dataset.rules=s.rules;canvas.dataset.surface=worldSurface(human.x,human.z);canvas.dataset.speed=Math.hypot(human.vx,human.vz).toFixed(3);canvas.dataset.gaitPhase=models.find(m=>m.controlled)?.gait.phase.toFixed(3);canvas.dataset.hunterCount=String(s.hunters.length);canvas.dataset.phase=s.phase;canvas.dataset.item=item||'';canvas.dataset.playerPosition=[human.x,human.y,human.z].map(x=>x.toFixed(2)).join(',');canvas.dataset.hunters=JSON.stringify(s.hunters.map(a=>({role:a.role,item:a.item,x:+a.x.toFixed(2),y:+a.y.toFixed(2),z:+a.z.toFixed(2),flight:a.flight?.stage??null,dive:a.dive?.stage??null})));canvas.dataset.frameGap=(dt*1000).toFixed(1);canvas.dataset.drawCalls=String(renderer.info.render.calls);canvas.dataset.gadgets=JSON.stringify(s.gadgets.map(g=>({kind:g.kind,x:+g.x.toFixed(1),z:+g.z.toFixed(1)})));const pickupStats=props.pickupStats();canvas.dataset.pickupDisplay=JSON.stringify(pickupStats);canvas.dataset.pickupNameVisibility=JSON.stringify(pickupStats.visibility);canvas.dataset.pickupTypes=s.pickups.map(p=>p.type).join(',');hudAt=now;}
 if((desktop&&output)||(sampleHud&&!desktop)){
  let status;
  if(replayFrame){
   const label=fullReplay?'試合全体リプレイ':'決着シーン';
   status=label+' · '+visual.time.toFixed(1)+'秒';
  }else if(s.phase==='finished'&&results.summary){
   const {mode,title,time}=results.summary;
   status=(mode==='hunt'?'鬼役':'逃走役')+' · '+title+' · '+time+'秒';
  }else if(s.phase==='countdown'){
   status='スタートまで '+Math.ceil(s.countdown);
  }else{
   const label=paused?'ひと休み':s.config.mode==='hunt'?'鬼で挑戦':'逃走中';
   status=label+' · '+Math.max(0,Math.ceil(s.duration-s.time))+'秒';
  }
  liveBroadcast.update(status);
 }
 if(!paused||replayFrame&&!replay.paused){
  const actor=replayFrame?visualHuman:human;
  audio.setGlide(actor.grounded&&(actor.slippery||worldSurface(actor.x,actor.z)==='ice')?Math.min(1,Math.hypot(actor.vx,actor.vz)/30):0);
 }
}
if(companion){$('#companion-note').textContent=companion.name+' と あそぶ';}else if(homeMode){$('#begin').disabled=true;$('#note').textContent='ホームの「鬼ごっこ」から入りなおしてね。';}
addEventListener('storage',e=>{
 if(e.key===TOUCH_LAYOUT_KEY){clear();touchSettings.apply();dirty=true;}
 if(homeMode&&(e.key===null||e.key===globalThis.ImasoraSlidingTagEntry?.HOME_KEY))companionGuard();
});
$('#home-return').addEventListener('click',returnHuntHome);
$('#home-return').disabled=false;
$('#home-return').addEventListener('auxclick',event=>{
 if(event.button===1)returnHuntHome(event);
});
$('#begin').disabled=homeMode&&!companion;$('#panel').setAttribute('aria-busy','false');
startHuntFrameDriver(draw,{isInteractive:()=>started&&!paused&&!replay.active&&!renderRecovery.lost&&!document.hidden&&document.hasFocus()});
