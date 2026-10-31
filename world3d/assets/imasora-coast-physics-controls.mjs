import {coastFallRescuePlan,coastRescuePort,coastShoreBoatRecovery} from './imasora-coast-fall-rescue.mjs?v=120nz';
import {coastReturnBoat} from './imasora-coast-wayfinding.mjs?v=120mx';
import {migrateCoastChart} from './imasora-coast-chart-migration.mjs?v=120mx';
import {coastOceanTime} from './imasora-coast-tidal-finds.mjs?v=120mx';
import {coastRowingHands,coastFloatingRescuePose} from './imasora-coast-crew-character.mjs?v=120oc';
import {rigProfile} from './imasora-coast-fitting.mjs?v=120js';
import {coastAdventureStart} from './imasora-coast-beach-start.mjs?v=120nz';
import {COAST_PULL_REACH,COAST_PULL_RELEASE,coastInDeepWater,coastShoreRecovery} from './imasora-coast-shore-access.mjs?v=120mx';
import {COAST_HOME_PORT,coastNearbyPort,islandPortSurface,islandPortRecovery,islandPortWalkHeight,islandPortStep} from './imasora-coast-island-harbors.mjs?v=120lr';
import {createCoastRaftDanger} from './imasora-coast-sea-reading.mjs?v=120kv';
import {coastPushForce} from './imasora-coast-sailing.mjs?v=120jf';
import {coastIslandProps,coastIslandPropSolids,islandPathSurface,islandPathRecovery} from './imasora-coast-island-path.mjs?v=120li';
import {createCoastObjectTouch,coastHandTarget} from './imasora-coast-touch-object.mjs?v=120mx';
import {createCoastCrewHUD} from './imasora-coast-crew-ui.mjs?v=120nz';
import {createCoastHarborHUD} from './imasora-coast-harbor-ui.mjs?v=120nz';
import {createCoastGangways,coastGangwaySupport,coastGangwayStep,coastGangwayLoad,coastGangwayCarry,coastGangwayFloorPassage,coastGangwayWalkContact} from './imasora-coast-gangway.mjs?v=120pt';
import {createCoastGangwayView} from './imasora-coast-gangway-view.mjs?v=120nz';
import {coastMountChoice,coastMountPreview} from './imasora-coast-boat-fit.mjs?v=120nz';
import {createCoastBoatBookHUD} from './imasora-coast-boat-book-ui.mjs?v=120nz';
import {createCoastWinchHUD} from './imasora-coast-winch.mjs?v=120od';
import {coastIslandStep,coastSteeringOars,coastNearbyPart,coastBoatInWater,coastRaftAground,coastCanHelm,coastSavedPilot,coastSavedCrew,coastSavedDeck,createCoastDirectHUD} from './imasora-coast-direct-play.mjs?v=120nz';
import * as T from './three.module.min.js';
import {createCoastActivityEntry,coastActivityApproach} from './imasora-coast-activity-entry.mjs?v=120ny';
import {coastHarborTimber,coastHarborSolids,coastStopWorkAlignment,coastIsLoadingRamp,coastSalvageSolids,coastUnloadOwner,coastWinchLines,COAST_SHORE_GOAL,initialCoastPlay,validateCoastPlay,editCoastPlay,stepCoastPlay,coastSupport,coastReadout,coastBodyPartContact,coastAssembly,coastConnections,coastConnectionFocus,coastOarsForTurns,coastPlayGuide,createCoastContactField,coastShoreMooring,coastRecovery,coastVoyageRetryPlan,coastVoyageReboard,recordCoastDryLand,coastLooseParts,coastMountFocus,coastMountRange,loadDeck,coastCrewSeats,canCoastMount,coastMountPoint,seaFloor,SEA_PARTS,SEA_PLAY,worldPoint,localPoint,rotate,add,mul,sub,length} from './imasora-coast-physics.mjs?v=120nz';
import {createCoastPlayView} from './imasora-coast-physics-view.mjs?v=120oc';
import {coastHeight,COAST_WATER_Y,COAST_WORLD}from'./imasora-coast-layout.mjs?v=120mx';
import {COAST_VOYAGE,coastVoyageSolids} from './imasora-coast-voyage.mjs?v=120ju';
import {createHeldDashButton} from './imasora-hold-dash.mjs?v=120od';
const set=(e,t)=>{if(e.textContent!==t)e.textContent=t;};
const partIcon=type=>type==='float'?'<svg viewBox="0 0 80 60"><rect x="9" y="12" width="62" height="36" rx="16" fill="#6aceda" stroke="#398b9e" stroke-width="3"/><path d="M24 13v34M56 13v34" stroke="#fff9e8" stroke-width="7"/><path d="M35 10h10v6H35z" fill="#e5ad5d"/></svg>':type==='board'?'<svg viewBox="0 0 80 60"><path d="M5 19L51 6l25 29-47 18z" fill="#deb16e" stroke="#9f7548" stroke-width="2"/><path d="M14 17l25 30M25 14l25 30M37 10l25 30" stroke="#bc8b50" stroke-width="2"/><path d="M12 27l48-14M22 40l48-14" stroke="#e7cb97" stroke-width="3"/></svg>':'<svg viewBox="0 0 80 60"><path d="M12 15l37-7 20 13v31l-37 5-20-12z" fill="#f1b66a" stroke="#a67946" stroke-width="2"/><path d="M12 15l20 13 37-7M32 28v29M21 13l20 13v29M52 10l-32 11v28" fill="none" stroke="#559db3" stroke-width="4"/></svg>';
export function createCoastPlayController({host,getScene,getCharacter,camera:cameraOf,canvas,state,service,saved,clearInput,persist,snapshot=null,showPouch=()=>{},obstacles,canCarry,prepareCarry=null,toast,showMap=()=>{},extraSurface=()=>undefined,swimming=()=>false,suspended=()=>false,watchingWhale=()=>false,groundContact=()=>null,readDrive=()=>({x:0,y:0,blocked:false})}){
 let s=coastAdventureStart(saved?structuredClone(validateCoastPlay(saved)):initialCoastPlay()),started=!!saved,view=null,enabled=false,selected=null,mounting=false,detaching=false,mountType='float',mountSource=null,mountUi='',ropeFrom=null,grab=null,paddling=false,placement=null,rider=null,accumulator=0,down=null,saveTimer=null,lastUi='',disposed=false,notifiedSail=s.goals.sail,toolsExpanded=false;
 let fallRescue=null,lastBoat=s.crew?.board??s.sailing?.board??null,fallElapsed=0,fallDelta=0;
 const chart=migrateCoastChart(s,state.map==='coast'?{x:state.position.x,y:state.groundY,z:state.position.z}:null);s=chart.play;
 if(chart.position){state.position.x=chart.position.x;state.position.z=chart.position.z;}
 for(const part of s.parts)if(part.type==='board')coastStopWorkAlignment(s,part.id);
 let pushInput=null,pushing=false;let objectTouch=null;let direct=null,deckWalking=false,driveAxes={x:0,y:0},helmReady=false,dismissed=null,uiOverlay=false,lastDirect=-Infinity,noteUntil=0;const markerPosition=new T.Vector3();
 let gangwayView=null,book=null,winch=null,loading=null,unloading=null,salvageHUD=null,harborHUD=null,crewHUD=null;let harborLedger=null,harborPool=0,plankGrounded=false,deckGrounded=false;
 let mountFit=null,fitPreview=null,fitKey='',fitAt=-Infinity;
 const gangways=createCoastGangways({getBody:()=>getCharacter?.()?.userData?.collisionFootprint,prepareClear:prepareCarry,clear:(x,y,z,heading,floors)=>canCarry(x,y,z,heading,floors),actor:()=>state.map==='coast'&&!swimming()&&!state.falling&&!state.jumpY&&!state.jumpVelocity?{x:state.position.x,y:state.groundY,z:state.position.z,board:rider?.id}:null});
 const surface=(x,z)=>{const y=Math.max(extraSurface(x,z)??-Infinity,islandPathSurface(x,z),islandPortSurface(x,z),coastSupport(s,x,z)?.y??-Infinity,coastGangwaySupport(gangways.plans,x,z)?.y??-Infinity);return Number.isFinite(y)?y:undefined;};
 const gangwayGround=(x,z)=>Math.max(seaFloor(x,z),coastSupport(s,x,z)?.y??-Infinity);
 let savedPilot=saved&&(coastSavedCrew(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,airborne:!!state.jumpY||!!state.jumpVelocity||!!state.falling})??coastSavedPilot(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,airborne:!!state.jumpY||!!state.jumpVelocity||!!state.falling})??coastSavedDeck(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,heading:state.heading,footprint:getCharacter?.()?.userData?.collisionFootprint,airborne:!!state.jumpY||!!state.jumpVelocity||!!state.falling}));
 function resumeSavedPilot(){
  // Save protection can be temporary. Do not consume the saved attachment
  // while waiting for Retry; its real pose/clearance is rechecked afterwards.
  if(!savedPilot||!getScene()||service.blocked)return;
  const expected=savedPilot;
  const current=(coastSavedCrew(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,airborne:!!state.jumpY||!!state.jumpVelocity||!!state.falling})??coastSavedPilot(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,airborne:!!state.jumpY||!!state.jumpVelocity||!!state.falling})??coastSavedDeck(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,heading:state.heading,footprint:getCharacter?.()?.userData?.collisionFootprint,airborne:!!state.jumpY||!!state.jumpVelocity||!!state.falling}));
  if(!current||current.id!==expected.id||current.seat!==expected.seat||current.walking!==expected.walking||current.walking&&Math.hypot(...current.point.map((v,i)=>v-expected.point[i]))>.001){savedPilot=null;return;}
  if(service.blocked||!canCarry(...current.point,current.yaw))return;
  savedPilot=null;
  if(current.reposition){state.position.x=current.point[0];state.position.z=current.point[2];state.groundY=current.point[1];state.heading=current.yaw;scheduleSave();}
  rider={id:current.id,y:current.point[1]};lastBoat=selected=current.id;deckWalking=!!current.walking;helmReady=false;enabled=true;dismissed=null;
  clearInput();release();
 }
 const steering=()=>s.sailing?.phase!=='capsized'&&state.map==='coast'&&!!rider&&coastBoatInWater(s,rider.id)&&coastCanHelm(s,rider.id,{x:state.position.x,y:state.groundY,z:state.position.z})&&!crewHUD?.walking&&crewHUD?.role!=='mate'&&!deckWalking&&!mounting&&!detaching&&!placement&&!unloading?.working;
 const helmLocal=id=>s.crew?.board===id&&s.crew.seat==='helm'?coastCrewSeats(s,id).find(p=>p.id==='helm').point:[0,3,0];
 // A visible plank below an already occupied deck cannot replace that floor.
 // New arrivals still need exact real deck contact, rather than proximity.
 const gangwayDeckSupport=(plank,x,z,reference,attached=false)=>{if(!plank||state.jumpY||state.jumpVelocity||state.falling||swimming())return null;const floor=coastSupport(s,x,z,reference);return floor?.id===plank.id&&floor.y>plank.y+1e-6&&Math.abs(floor.y-reference)<=(attached?2.5:.001)?floor:null;};
 const contactField=createCoastContactField();let lastRefresh=-Infinity,lastHeld='',socketPreview=null,detachLink=null,coastPresent=state.map==='coast';
 const button=document.createElement('button');button.type='button';button.className='sea-shore-recovery';button.hidden=true;button.textContent='🛟 いかだを岸へ戻す';
 const dock=document.createElement('section');dock.className='sea-play-dock';dock.hidden=true;dock.setAttribute('aria-label','波と浮きの道具');
 dock.innerHTML='<header><div><small>波でうごく、つないであそぶ</small><strong data-sea-title>いかだと道具</strong></div><button type="button" data-sea-close aria-label="波と浮きの道具をとじる">✕</button></header><p data-sea-status role="status">桟橋のいかだで、島々へ出航しよう。</p><button type="button" data-mount-cancel hidden>つなぐのをやめる</button><div class="sea-trip"><span data-route-status role="status"></span></div><div class="sea-play-meter"><span data-sea-load></span><span data-sea-tilt></span></div><div class="sea-sail-actions"><button type="button" data-sail-edit>板・浮きをつなぐ</button><button type="button" data-sail-kit>道具箱</button><button type="button" data-sail-help>あそび方</button></div><button type="button" data-tools-back>こぐ操作へ戻る</button><div class="sea-play-actions"><button type="button" data-sea-act="grab">つかんで引く</button><button type="button" data-sea-act="float">浮きをつける</button><button type="button" data-sea-act="board">板をつなぐ</button><button type="button" data-sea-act="rope">ロープ</button><button type="button" data-sea-act="detach">はずす</button><button type="button" data-sea-act="kit">道具</button><button type="button" data-sea-act="undo">1つ前へ</button><button type="button" data-sea-act="help">あそび方</button></div><div class="sea-placement" hidden><button type="button" data-place-ok>ここに出す</button><button type="button" data-place-cancel>やめる</button></div><div class="sea-helm" hidden><button type="button" data-oar="left" aria-label="左に曲がる（押している間）">↶<small>左へ</small></button><button type="button" data-oar="both" data-paddle aria-label="まっすぐこぐ（押している間）">こぐ<small>押して進む</small></button><button type="button" data-oar="right" aria-label="右に曲がる（押している間）">↷<small>右へ</small></button><button type="button" data-oar="brake" aria-label="オールで止まる（押している間）"><b aria-hidden="true">Ⅱ</b><span>止まる</span><small>押して減速</small></button></div>';
 const dialog=document.createElement('dialog');dialog.className='sea-toybox';dialog.setAttribute('aria-label','海辺の道具箱');
 dialog.innerHTML='<header><div><small>海辺で、何度でも使える</small><h2>海辺の道具箱</h2></div><button type="button" data-toy-close>とじる ✕</button></header><p>出している道具は海岸に残るよ。つなぎ目をはずして返すと、また使えるよ。</p><div class="sea-toys">'+Object.entries(SEA_PARTS).filter(([id])=>id!=='cargo').map(([id,p])=>'<button type="button" data-toy="'+id+'">'+partIcon(id)+'<strong>'+p.name+'</strong><small>'+p.mass+' kg · '+(id==='float'?'軽くて、よく浮く':id==='board'?'乗れる板。浮きを足すと安定': '板だけでは重い。浮きで運ぼう')+'</small><b data-toy-left="'+id+'"></b></button>').join('')+'</div><button type="button" data-return-part>選んだ道具を返す</button><button type="button" data-toy-reset>道具を元の場所へ</button><div data-toy-reset-confirm hidden><p>つないだ道具を、浜と桟橋に並べなおすよ。集めた素材はそのまま。1つ前へ戻すこともできるよ。</p><button type="button" data-toy-reset-yes>並べなおす</button><button type="button" data-toy-reset-no>やめる</button></div><p data-toy-note role="status"></p>';
 const help=document.createElement('dialog');help.className='sea-toybox sea-help';help.setAttribute('aria-label','波と浮きのあそび方');help.innerHTML='<header><h2>いかだと道具の操作</h2><button type="button" data-help-close>とじる ✕</button></header><div class="sea-help-steps"><article>'+partIcon('board')+'<h3>つかんで動かす</h3><p>「つかんで引く」で引っぱり、「押す」を長押しすると前へ押せるよ。重い物はゆっくり動くよ。</p></article><article>'+partIcon('board')+'<h3>いかだに乗る</h3><p>桟橋の先のいかだに乗って「出発する」。パッドで進む・曲がる。「止まる」で減速できるよ。</p></article><article>'+partIcon('float')+'<h3>何度でもためせる</h3><p>「1つ前へ」で10回前まで戻せるよ。つないで作りたくなったら道具棚をひらこう。</p></article></div>';
 const rescueIcon='<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" fill="#fff9ed" stroke="#eeab66" stroke-width="6"/><path d="M8 8l3 3m10 10 3 3M8 24l3-3m10-10 3-3" stroke="#fff9ed" stroke-width="5"/></svg>';
 button.innerHTML=rescueIcon+'<span>いかだを岸へ戻す</span>';
 const rescueButton=document.createElement('button');rescueButton.type='button';rescueButton.dataset.seaRecover='';rescueButton.innerHTML=rescueIcon+'<span>いかだを助ける</span>';dock.querySelector('.sea-trip').insertBefore(rescueButton,dock.querySelector('[data-route-status]'));
 const castOffButton=document.createElement('button');castOffButton.type='button';castOffButton.dataset.seaCastOff='';castOffButton.textContent='ロープをほどいて出発';castOffButton.hidden=true;dock.querySelector('.sea-trip').prepend(castOffButton);
 const rescue=document.createElement('dialog');rescue.className='sea-toybox sea-rescue';rescue.setAttribute('aria-label','いかだを助ける');
 rescue.innerHTML='<header><h2>🛟 いかだを助ける</h2><button type="button" data-rescue-close>やめる ✕</button></header><p>沖へ流されたときや、乗れなくなったときに使おう。戻す船と岸をたしかめてね。</p><div data-rescue-boats></div><div class="sea-rescue-note"><strong>つくった形は、そのまま！</strong><p>板・浮き・装備はそのまま。ふつうのロープはほどき、岸に結びなおすよ。</p></div><p data-rescue-message role="status"></p><button type="button" data-rescue-go>このいかだをもどす</button><small>「1つ前へ」で、もどす前にもどせるよ。</small>';
 rescue.querySelector('h2').innerHTML=rescueIcon+'<span>いかだを助ける</span>';
 rescue.lastElementChild.textContent='「1つ前へ」で、船を戻す前の状態に取り消せるよ。';
 help.querySelector('.sea-help-steps').insertAdjacentHTML('beforeend','<article>'+partIcon('board')+'<h3>流されても、大丈夫！</h3><p>海へ落ちたら、自分のいかだへ救助するよ。転覆しても、進んだ航路の少し前から再挑戦できるよ。素材や装備はなくならないよ。</p></article>');
 host.append(dock);document.body.append(dialog,help,rescue);const q=sel=>dock.querySelector(sel),status=q('[data-sea-status]');let recoveryPlan=null,recoveryId=null,recoveryShore=null;
 const mountPicker=document.createElement('section');mountPicker.className='sea-mount-picker';mountPicker.hidden=true;mountPicker.setAttribute('aria-label','つなぐ道具を選ぶ');mountPicker.innerHTML='<strong>① つかう道具をえらぶ</strong><div data-mount-choices></div><small>② 現場の黄色い丸をタップしてつなごう</small>';status.after(mountPicker);
 const fitTools=document.createElement('div');fitTools.className='sea-fit-tools';fitTools.hidden=true;fitTools.innerHTML='<div class="sea-fit-shape" role="status" data-fit-shape></div><div class="sea-fit-adjust"><button type="button" data-fit-move="-1" aria-label="見本を左へずらす">← ずらす</button><button type="button" data-fit-turn>↻ 向きをかえる</button><button type="button" data-fit-move="1" aria-label="見本を右へずらす">ずらす →</button></div><div class="sea-fit-commit"><button type="button" data-fit-part>部品をかえる</button><button type="button" data-fit-join>ここにつなぐ</button></div>';mountPicker.after(fitTools);
 function refreshFit(){
  fitTools.hidden=!mounting||!mountFit;dock.classList.toggle('is-fitting',!fitTools.hidden);if(fitTools.hidden){fitPreview=null;fitKey='';return;}
  const key=[selected,mountType,mountSource,mountFit.side,mountFit.offset,mountFit.turn,s.edit,s.tick,state.position.x,state.position.z,state.groundY,state.jumpY,rider?.id].join('|');
  const now=performance.now();if(key===fitKey&&now-fitAt<100)return;fitKey=key;fitAt=now;fitPreview=coastMountPreview(s,selected,mountType,mountFit,mountOptions());
  const plan=fitPreview,join=fitTools.querySelector('[data-fit-join]');join.disabled=!plan?.valid;
  set(join,plan?.valid?'ここにつなぐ':'重なるよ · 見本をずらそう');
  set(fitTools.querySelector('[data-fit-shape]'),plan?.valid?(plan.after?'🛶 板 '+plan.after.boards+'枚・浮き '+plan.after.floats+'個　横幅 '+(plan.after.width/plan.before.width).toFixed(1)+'倍':'黄色い見本がつなぐ場所だよ'):'別の辺をタップするか、向きをかえてみよう');
 }
 fitTools.querySelector('[data-fit-part]').onclick=()=>{mountFit=null;refresh(true);};
 for(const b of fitTools.querySelectorAll('[data-fit-move]'))b.onclick=()=>{if(!mountFit)return;const p=s.parts.find(p=>p.id===selected),range=coastMountRange(p,mountType,mountFit.side,mountFit.turn);mountFit.offset=Math.max(-range,Math.min(range,mountFit.offset+Number(b.dataset.fitMove)*8));refresh(true);};
 fitTools.querySelector('[data-fit-turn]').onclick=()=>{if(!mountFit)return;mountFit.turn=(mountFit.turn+1)%4;const p=s.parts.find(p=>p.id===selected),range=coastMountRange(p,mountType,mountFit.side,mountFit.turn);mountFit.offset=Math.max(-range,Math.min(range,mountFit.offset));refresh(true);};
 fitTools.querySelector('[data-fit-join]').onclick=()=>{if(!mounting||!mountFit)return;const reused=mountSource!==null;if(edit({type:'attach',id:selected,part:mountType,source:mountSource,...mountFit})){mountFit=null;fitPreview=null;say(reused?'組みかえたよ！ 部品は同じ数のまま。浮かべて、こいでためそう。':'つながったよ！ 浮かべて、こいでためそう。');refresh(true);}};
 const tiltBar=document.createElement('meter');tiltBar.className='sea-balance-meter';tiltBar.min=0;tiltBar.max=60;tiltBar.low=20;tiltBar.high=35;tiltBar.optimum=0;tiltBar.setAttribute('aria-label','いかだの傾き');q('.sea-play-meter').append(tiltBar);
 function say(text){set(status,text);noteUntil=performance.now()+3500;}
 const detachConfirm=document.createElement('button');detachConfirm.type='button';detachConfirm.dataset.detachConfirm='';detachConfirm.hidden=true;detachConfirm.textContent='このつなぎ目をはずす';status.after(detachConfirm);
 const unlinkChoices=document.createElement('div');unlinkChoices.className='sea-unlink-choices';unlinkChoices.hidden=true;unlinkChoices.setAttribute('aria-label','はずす相手を選ぶ');status.after(unlinkChoices);let unlinkUi='';
 function refreshDetachChoices(){unlinkChoices.hidden=!detaching;if(!detaching){unlinkUi='';return;}const key=[selected,s.edit,detachLink].join('|');if(key===unlinkUi)return;unlinkUi=key;unlinkChoices.replaceChildren();for(const [i,row]of coastConnections(s,selected).entries()){const other=s.parts.find(p=>p.id===(row.a===selected?row.b:row.a)),b=document.createElement('button');b.type='button';b.dataset.detachChoice=row.id;b.setAttribute('aria-pressed',String(detachLink===row.id));b.innerHTML=partIcon(other.type);const text=document.createElement('span');text.textContent=row.kind==='rope'?'ロープ':SEA_PARTS[other.type].name+(i+1);b.append(text);b.onclick=()=>{if(!coastConnections(s,selected).some(j=>j.id===row.id))return;detachLink=row.id;say('水色の道具と、その先につながる道具が離れるよ。たしかめてから、はずそう。');refresh(true);};unlinkChoices.append(b);}}
 detachConfirm.onclick=()=>{if(!detaching||!detachLink)return;const p=s.parts.find(p=>p.id===selected);if(tooFar(p,140)){say('道具の近くで選びなおそう。');return;}if(edit({type:'detach',id:selected,link:detachLink}))say('選んだつなぎ目をはずしたよ！ 組みかえて、またためしてみよう。');};
 const mountOptions=(source=mountSource)=>({...recoveryOptions(),source});
 const mountAllowed=(id,type,side,source=mountSource)=>canCoastMount(s,id,type,side,mountOptions(source));
 function anyMount(id,type,source,side=null){const p=s.parts.find(p=>p.id===id);if(!p)return false;for(const turn of[0,1])for(const edge of side===null?[0,1,2,3]:[side]){const range=coastMountRange(p,type,edge,turn);for(const offset of[0,-range,range])if(canCoastMount(s,id,type,edge,{...mountOptions(source),turn,offset}))return true;}return false;}
 function beginMount(id,type){detaching=false;mountFit=null;fitPreview=null;
  const g=coastAssembly(s,id),parents=[s.parts.find(p=>p.id===id),...s.parts.filter(p=>p.id!==id&&g?.ids.has(p.id))].filter(Boolean);
  for(const p of parents){const nearby=coastLooseParts(s,p.id,type),choices=[...nearby.map(p=>p.id),null];for(const source of choices){if(!anyMount(p.id,type,source))continue;selected=p.id;mountType=type;mountSource=source;mounting=true;ropeFrom=null;clearInput();release();say('つなぎたい辺をタップ！ 黄色い見本をずらし、向きをかえて組もう。');refresh(true);return;}}
  say('つなげる場所がないよ。道具を少し離すか、つなぎ目をはずしてみよう。');
 }
 function refreshMountPicker(){
  mountPicker.hidden=!mounting;if(!mounting){mountUi='';return;}
  const key=[selected,mountType,mountSource,s.edit].join('|');if(key===mountUi)return;mountUi=key;
  const typeName=mountType==='float'?'浮き':'板',choices=mountPicker.querySelector('[data-mount-choices]');choices.replaceChildren();
  const addChoice=(id,label)=>{const b=document.createElement('button');b.type='button';b.dataset.mountSource=id??'new';b.setAttribute('aria-pressed',String(id===mountSource));b.innerHTML=partIcon(mountType);const name=document.createElement('span');name.textContent=label;b.append(name);b.disabled=!anyMount(selected,mountType,id);b.onclick=()=>{mountSource=id;say('つなぎたい辺をタップ！ 見本をたしかめてから、つなごう。');refresh(true);};choices.append(b);};
  coastLooseParts(s,selected,mountType).forEach((p,i)=>addChoice(p.id,'近くの'+typeName+(i+1)));
  const left=SEA_PARTS[mountType].limit-s.parts.filter(p=>p.type===mountType).length;addChoice(null,'借りる（あと'+left+'）');
 }
 function setOpen(value){value=!!value&&state.map==='coast';enabled=value;toolsExpanded=false;if(value&&rider)selected=rider.id;if(value)noteUntil=0;dock.hidden=!value;document.body.classList.toggle('coast-physics-active',value&&state.map==='coast');if(!value){harborHUD?.cancel();unloading?.cancel();loading?.cancel();dismissed=selected??'salvage';down=null;grab=null;mounting=false;detaching=false;ropeFrom=null;placement=null;release();}else dismissed=null;clearInput();refresh(true);}
 const activityContext=()=>({map:state.map,x:state.position.x,z:state.position.z,y:state.groundY+state.jumpY,heading:state.viewHeading,airborne:state.jumpY>.001||state.jumpVelocity!==0,blocked:service.blocked,rider,play:s});
 function arriveAtActivity(id,target){if(target.partId){selected=target.partId;enabled=true;dismissed=null;}say(target.partId?'乗り口から、いかだへジャンプ！ まずは中央に乗ってみよう。':'ここが乗り口だよ。いかだが遠いときは「いかだを助ける」で戻そう。');toast('星待ちの桟橋に着いたよ！');}
 const activityEntry=createCoastActivityEntry({host,canvas,camera:cameraOf,context:activityContext,onArrive:arriveAtActivity,clearInput,icons:{board:partIcon('board')}});activityEntry.setMapAction(showMap);
 function beginActivity(id){if(id!=='pier')return false;if(service.blocked){toast('セーブをたしかめてから、もう一度えらんでね。');return false;}setOpen(false);return activityEntry.start(id);}
 button.onclick=()=>{if(uiOverlay||document.hidden||service.blocked||document.querySelector('dialog[open]'))return;const offer=shoreBoatRecovery();if(offer)openRecovery(offer);};q('[data-sea-close]').onclick=()=>setOpen(false);
 const open=d=>{grab=null;release();clearInput();if(!d.open)d.showModal();};
 dialog.querySelector('[data-toy-close]').onclick=()=>dialog.close();help.querySelector('[data-help-close]').onclick=()=>help.close();for(const d of[dialog,help,rescue]){d.addEventListener('close',clearInput);d.addEventListener('cancel',clearInput);}
 function workBoat(){const id=rider?.id??selected,g=coastAssembly(s,id);if(!g)return id;const board=s.parts.find(p=>p.type==='board'&&g.ids.has(p.id));if(board)return board.id;const shoreOwner=coastUnloadOwner(s,id);if(shoreOwner)return shoreOwner;for(const j of s.links){if(j.kind!=='rope'||g.ids.has(j.a)===g.ids.has(j.b))continue;const b=s.parts.find(p=>p.id===(g.ids.has(j.a)?j.b:j.a)&&p.type==='board');if(b)return b.id;}return id;}
 function nearRope(){const id=workBoat(),actor=[state.position.x,state.groundY,state.position.z];return !tooFar(s.parts.find(p=>p.id===id),100)||coastWinchLines(s,id).some(j=>j.shore&&length(sub(actor,j.point))<100);}
 function harborTimberAvailable(){if(!service.ledger)return 0;if(harborLedger!==service.ledger){harborPool=(service.constructionStock?.stored?.['mars-timber']??0)+coastHarborTimber(service.ledger.world.coastPhysics);harborLedger=service.ledger;}return Math.max(0,harborPool-coastHarborTimber(s));}
 const recoveryOptions=()=>({seaTime:coastOceanTime(),canStand:canCarry,footprint:getCharacter?.()?.userData?.collisionFootprint,obstacles:obstacles(),riderId:rider?.id,actor:{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z}});
 function nearestBoat(){const id=workBoat();if(s.parts.some(p=>p.id===id&&p.type==='board'))return id;return s.parts.filter(p=>p.type==='board'&&Math.hypot(p.p[0]-state.position.x,p.p[2]-state.position.z)<=150).sort((a,b)=>Math.hypot(a.p[0]-state.position.x,a.p[2]-state.position.z)-Math.hypot(b.p[0]-state.position.x,b.p[2]-state.position.z))[0]?.id;}
 function recoveryBoats(){const seen=new Set(),boats=[];for(const b of s.parts.filter(p=>p.type==='board')){const g=coastAssembly(s,b.id);if(seen.has(g.rootId))continue;seen.add(g.rootId);const parts=s.parts.filter(p=>g.ids.has(p.id));if(parts.some(p=>p.type==='float'))boats.push({id:b.id,parts,main:g.ids.has('sea-5')});}boats.sort((a,b)=>Number(b.id===s.voyage?.board)-Number(a.id===s.voyage?.board)||Number(b.main)-Number(a.main));return boats;}
 function shoreBoatRecovery(){if(mounting||detaching||placement||ropeFrom||grab||book?.open||loading?.pending||unloading?.pending||harborHUD?.pending||harborHUD?.busy||fallRescue)return null;return coastShoreBoatRecovery(s,{map:state.map,x:state.position.x,y:state.groundY,z:state.position.z,grounded:!state.falling&&!state.jumpY&&!state.jumpVelocity,aboard:!!rider||crewHUD?.seated||crewHUD?.walking,groundContact},gangways.plans);}
 function recoveryDestination(){if(!recoveryShore)return coastRescuePort(state.position.x,state.position.z,s.navigation);const current=shoreBoatRecovery();if(!current||current.board!==recoveryShore.board||current.port!==recoveryShore.port)throw Error('足場やいかだの状態が変わったよ。いったん閉じて、岸でたしかめよう。');return{id:current.port,name:current.name};}
 function previewRecovery(){recoveryPlan=null;const note=rescue.querySelector('[data-rescue-message]'),go=rescue.querySelector('[data-rescue-go]');try{const port=recoveryDestination();recoveryPlan=coastRecovery(s,recoveryId,{...recoveryOptions(),port:port.id});set(note,port.name+'の岸に、自分のいかだを戻すよ。');go.disabled=false;}catch(e){set(note,e.message);go.disabled=true;}for(const b of rescue.querySelectorAll('[data-recovery-boat]'))b.setAttribute('aria-pressed',String(b.dataset.recoveryBoat===recoveryId));}
 function openRecovery(shore=null){if(rider){say('いかだから降りてから、助けよう。');return;}recoveryShore=shore;const boats=recoveryBoats().filter(b=>!shore||b.id===shore.board);recoveryId=shore?.board??(boats.some(b=>b.id===recoveryId)?recoveryId:boats[0]?.id);const choices=rescue.querySelector('[data-rescue-boats]');choices.replaceChildren();for(const [i,b]of boats.entries()){const card=document.createElement('button');card.type='button';card.dataset.recoveryBoat=b.id;card.innerHTML=partIcon('board')+'<span><strong>'+(shore?'自分のいかだ':b.main?'星待ちのいかだ':'つくったいかだ '+(i+1))+'</strong><small>板 '+b.parts.filter(p=>p.type==='board').length+' ・ 浮き '+b.parts.filter(p=>p.type==='float').length+'</small></span>';card.onclick=()=>{recoveryId=b.id;previewRecovery();};choices.append(card);}previewRecovery();open(rescue);}
 rescueButton.onclick=()=>openRecovery();
 rescue.querySelector('[data-rescue-close]').onclick=()=>rescue.close();rescue.addEventListener('close',()=>{recoveryPlan=null;recoveryId=null;recoveryShore=null;});
 rescue.querySelector('[data-rescue-go]').onclick=()=>{if(!recoveryPlan||service.blocked)return;try{recoveryDestination();}catch(e){set(rescue.querySelector('[data-rescue-message]'),e.message);return;}const id=recoveryPlan.board,port=recoveryPlan.port;if(edit({type:'recover',id,port})){selected=id;rescue.close();setOpen(true);say('いかだを岸へ戻したよ。渡り板で乗り、パッドを前へ倒すと出発できるよ。');toast('自分のいかだを、岸へ戻したよ！');}else set(rescue.querySelector('[data-rescue-message]'),status.textContent);};
 castOffButton.onclick=()=>{if(rider&&edit({type:'unmoor',id:rider.id})){release();say('ロープをほどいたよ！「こぐ」で進み、パッドの前後で進む・バック、左右で曲がろう。');}};
 function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(disposed||service.blocked)return;if(service.busy){scheduleSave();return;}void persist().catch(()=>{});},450);}
 // Loan assembly edits only change this controller. A pending checkpoint owns
 // its earlier snapshot; autosave/retry will write the newer edit afterwards.
 function edit(action,{automatic=false}={}){if(state.map!=='coast')return false;if(!['reel','work-align'].includes(action.type)){winch?.cancel();unloading?.cancel();loading?.cancel();}const crossing=state.position&&coastGangwaySupport(gangways.plans,state.position.x,state.position.z);if(crossing&&!rider&&!(automatic&&action.type==='secure')&&!['book-save','book-guide','book-hide'].includes(action.type)&&Math.abs(state.groundY+(state.jumpY??0)-crossing.y)<1){say('先に岸か船へ渡りきってから、道具を使おう。');return false;}if(service.blocked){say('セーブをたしかめてから、もう一度ためしてね。');return false;}try{const next=editCoastPlay(s,action,{...recoveryOptions(),availableTimber:action.type==='harbor-build'?harborTimberAvailable():0,loadingCatch:automatic&&action.type==='secure'});if(next.harbor?.items.length&&coastHarborTimber(next)>harborTimberAvailable()+coastHarborTimber(s))throw Error('木材をほかの作業で使ったので、ポールを戻せないよ。木材を集めてから、もう一度ためそう。');s=next;started=true;if(['undo','reset'].includes(action.type)){notifiedSail=s.goals.sail;}mounting=false;detaching=false;ropeFrom=null;grab=null;scheduleSave();refresh(true);return true;}catch(e){say(e.message);return false;}}
 function tooFar(p,reach=100){return !p||Math.hypot(p.p[0]-state.position.x,p.p[2]-state.position.z)>reach;}
 function choose(id){unloading?.cancel();loading?.cancel();winch?.cancel();grab=null;selected=id;mounting=false;detaching=false;if(ropeFrom){if(id!==ropeFrom){if(edit({type:'rope',a:ropeFrom,b:id}))say('ロープでつながったよ。船のそばで「まく」を押すと、引っぱれるよ！');}return;}refresh(true);}
 for(const b of dock.querySelectorAll('[data-sea-act]'))b.onclick=()=>{
  const act=b.dataset.seaAct,p=s.parts.find(p=>p.id===selected);
  if(act==='kit'){refreshBox();open(dialog);return;}if(act==='help'){open(help);return;}
  if(act==='undo'){if(rider){say('いかだから降りてから、1つ前へ戻そう。');return;}if(edit({type:'undo'})){selected=s.parts.find(p=>p.id===selected)?.id??null;say('ひとつ前の作業に戻したよ。');}return;}
  if(tooFar(p,act==='grab'?COAST_PULL_REACH:125)){say('届くところで道具を選ぼう。');return;}
  if(act==='grab'){mounting=false;ropeFrom=null;if(grab){grab=null;say('はなしたよ。波や重さで動くところを見てみよう。');}else if(rider&&coastAssembly(s,p.id)?.ids.has(rider.id)){say('自分が乗っている道具はつかめないよ。こいで動かそう。');}else{if(!edit({type:'handle',id:p.id}))return;grab={id:p.id,local:[0,4,0]};say('歩いて引っぱる · もう一度押すとはなす');}refresh(true);return;}
  grab=null;if(act==='float'||act==='board'){const g=coastAssembly(s,p.id),deck=act==='board'&&p.type!=='board'&&s.parts.find(b=>b.type==='board'&&g?.ids.has(b.id));beginMount(deck?.id??p.id,act);return;}
  if(act==='rope'){ropeFrom=p.id;say('次に、ロープをつなぎたい別の道具をタップ！');}
  if(act==='detach'){const moored=s.links.some(j=>j.kind==='moor'&&coastAssembly(s,p.id)?.ids.has(j.a));if(moored){if(edit({type:'unmoor',id:p.id}))say('桟橋のロープをほどいたよ。');return;}if(rider){say('いかだから降りてから、つなぎ目をはずそう。');return;}if(!coastConnections(s,p.id).length){say('この道具は、まだつながっていないよ。');return;}detaching=true;mounting=false;ropeFrom=null;clearInput();release();say('はずしたい黄色いつなぎ目をタップ！ 1つ前へ戻すこともできるよ。');refresh(true);}

 };
 dialog.querySelector('[data-toy-reset]').onclick=()=>{dialog.querySelector('[data-toy-reset-confirm]').hidden=false;};dialog.querySelector('[data-toy-reset-no]').onclick=()=>{dialog.querySelector('[data-toy-reset-confirm]').hidden=true;};dialog.querySelector('[data-toy-reset-yes]').onclick=()=>{if(rider){set(dialog.querySelector('[data-toy-note]'),'いかだから降りてから、並べなおそう。');return;}if(edit({type:'reset'})){selected=null;dialog.querySelector('[data-toy-reset-confirm]').hidden=true;set(dialog.querySelector('[data-toy-note]'),'浜と桟橋に、道具を並べなおしたよ。');refreshBox();}};
 function refreshBox(){for(const [type,spec]of Object.entries(SEA_PARTS).filter(([id])=>id!=='cargo')){const left=spec.limit-s.parts.filter(p=>p.type===type).length;dialog.querySelector('[data-toy="'+type+'"]').disabled=left<=0;dialog.querySelector('[data-toy-left="'+type+'"]').textContent='残り '+left+' / '+spec.limit;}dialog.querySelector('[data-return-part]').disabled=!selected||!!rider;dialog.querySelector('[data-toy-reset]').disabled=!!rider;}
 function freePlacement(type){const d=[Math.sin(state.viewHeading),0,Math.cos(state.viewHeading)],p=add([state.position.x,state.groundY,state.position.z],mul(d,75));p[1]=Math.max(seaFloor(p[0],p[2]),COAST_WATER_Y,coastSupport(s,p[0],p[2])?.y??-Infinity)+SEA_PARTS[type].size[1]/2+3;placement={type,point:p,valid:placeOK(p,type)};say('置きたい場所を画面でタップ。黄色い見本をたしかめて「ここに出す」！');}
 function beginBorrow(type){
  if(type==='cargo'||state.map!=='coast'||uiOverlay||document.hidden||service.blocked)return;
  if(s.parts.filter(p=>p.type===type).length>=SEA_PARTS[type].limit||s.parts.length>=SEA_PLAY.maxParts){say('この道具は全部、海岸に出ているよ。戻してから、また使おう。');return;}
  if(dialog.open)dialog.close();mounting=false;detaching=false;grab=null;ropeFrom=null;clearInput();release();
  freePlacement(type);refresh(true);
 }
 for(const b of dialog.querySelectorAll('[data-toy]'))b.onclick=()=>beginBorrow(b.dataset.toy);
 function placeOK(p,type){if(!p||Math.hypot(p[0]-state.position.x,p[2]-state.position.z)>135||Math.abs(p[0])>COAST_WORLD.width/2-100||p[2]<205||p[2]>COAST_WORLD.depth/2-35)return false;const [w,h,d]=SEA_PARTS[type].size;if(Math.abs(p[0]-state.position.x)<w/2+10&&Math.abs(p[2]-state.position.z)<d/2+10&&p[1]+h/2>state.groundY&&p[1]-h/2<state.groundY+40)return false;
  if(s.parts.some(b=>Math.abs(b.p[0]-p[0])<(w+SEA_PARTS[b.type].size[0])/2+1&&Math.abs(b.p[2]-p[2])<(d+SEA_PARTS[b.type].size[2])/2+1&&Math.abs(b.p[1]-p[1])<(h+SEA_PARTS[b.type].size[1])/2+1))return false;
  return ![...obstacles(),...coastHarborSolids(s),...coastSalvageSolids(s)].some(o=>p[1]-h/2<(o.maxY??30)&&p[1]+h/2>(o.minY??0)&&Math.abs(p[0]-o.x)<w/2+o.halfX&&Math.abs(p[2]-o.z)<d/2+o.halfZ);
 }
 q('[data-place-cancel]').onclick=()=>{placement=null;refresh(true);};
 q('[data-place-ok]').onclick=()=>{if(!placement)return;placement.valid=placeOK(placement.point,placement.type);if(!placement.valid){say('そこには置けないよ。別の場所をタップしてね。');refresh(true);return;}if(edit({type:'borrow',part:placement.type,point:placement.point})){selected=s.parts.at(-1).id;placement=null;say('道具を出したよ。浮きや板をつなげて遊ぼう。');refresh(true);}};
 q('[data-sail-edit]').onclick=()=>{toolsExpanded=true;refresh(true);};q('[data-sail-kit]').onclick=()=>q('[data-sea-act="kit"]').click();q('[data-sail-help]').onclick=()=>q('[data-sea-act="help"]').click();q('[data-tools-back]').onclick=()=>{toolsExpanded=false;mounting=false;placement=null;ropeFrom=null;grab=null;release();refresh(true);};
 q('[data-mount-cancel]').onclick=()=>{mounting=false;detaching=false;ropeFrom=null;say('道具の操作にもどったよ。');refresh(true);};
 const paddle=q('.sea-helm'),held=new Map(),oarHolds=[...paddle.querySelectorAll('[data-oar]')].map(element=>({element,turn:element.dataset.oar,input:createHeldDashButton({element,enabled:()=>steering()&&enabled&&!dock.hidden&&!readDrive().blocked&&state.map==='coast'&&!paddle.hidden&&!service.blocked&&!document.querySelector('dialog[open]'),context:()=>rider?.id??'land'})}));
 const turns=()=>[...held.values(),...oarHolds.filter(h=>h.input.active).map(h=>h.turn)];
 const oars=()=>coastSteeringOars(driveAxes,turns());
 function paintHeld(){const v=turns(),o=oars();paddling=!!(o.brake||o.left||o.right);const key=v.slice().sort().join('|');if(key===lastHeld)return;lastHeld=key;for(const h of oarHolds){h.element.classList.toggle('is-held',v.includes(h.turn));if(h.turn==='brake')set(h.element.querySelector('small'),v.includes('brake')?'減速中':'押して減速');}}
 function release(){driveAxes={x:0,y:0};if(!paddling&&!held.size&&!oarHolds.some(h=>h.input.active))return;held.clear();oarHolds.forEach(h=>h.input.cancel());paintHeld();}
 const keyOars={KeyJ:'left',KeyK:'both',KeyL:'right',KeyI:'brake'};
 function keyDown(e){if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;if(e.repeat||dock.hidden||!keyOars[e.code]||!steering()||!enabled||readDrive().blocked||state.map!=='coast'||paddle.hidden||service.blocked||document.querySelector('dialog[open]')||e.target?.closest?.('input,textarea,select,[contenteditable]'))return;e.preventDefault();held.set(e.code,keyOars[e.code]);paintHeld();}
 function keyUp(e){if(held.delete(e.code)){e.preventDefault();paintHeld();}}
 window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
 const lost=()=>{objectTouch?.cancel();crewHUD?.cancel();unloading?.cancel();loading?.cancel();winch?.cancel();release();grab=null;down=null;};window.addEventListener('blur',lost);document.addEventListener('visibilitychange',lost);window.addEventListener('pagehide',lost);
 function tapDown(e){if(state.map!=='coast'||loading?.pending||unloading?.pending||uiOverlay||document.querySelector('dialog[open]'))return;down={id:e.pointerId,x:e.clientX,y:e.clientY,direct:!enabled};}
 function tapUp(e){if((!enabled&&!down?.direct)||state.map!=='coast'){down=null;return;}if(!down||down.id!==e.pointerId)return;const start=down;down=null;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>9||!view||dialog.open||help.open)return;
  if(crewHUD?.walking)return;
  if(harborHUD?.pending){let p=view.groundPick(cameraOf(),canvas,e.clientX,e.clientY,state.groundY);if(p)p=view.groundPick(cameraOf(),canvas,e.clientX,e.clientY,seaFloor(p[0],p[2]))??p;if(p)harborHUD.pick(p);return;}
  if(placement){const hit=view.pick(cameraOf(),canvas,e.clientX,e.clientY);const p=hit?.point??view.groundPick(cameraOf(),canvas,e.clientX,e.clientY,COAST_WATER_Y);if(p){delete placement.board;delete placement.rotation;p[1]=Math.max(seaFloor(p[0],p[2]),COAST_WATER_Y,coastSupport(s,p[0],p[2])?.y??-Infinity)+SEA_PARTS[placement.type].size[1]/2+3;placement.point=p;placement.valid=placeOK(p,placement.type);refresh(true);}return;}
  const hit=view.pick(cameraOf(),canvas,e.clientX,e.clientY);
  if(hit?.seat&&!mounting&&!detaching){crewHUD?.choose(hit.seat);return;}
  if(hit?.id?.startsWith('harbor-')&&!mounting&&!detaching){harborHUD?.select(hit.id);return;}
  if(hit?.designIndex!==undefined&&!mounting&&!detaching){if(!book?.pick(hit.designIndex))say('見本の、船につながる部品から順につけよう。');return;}
  if(mounting&&hit?.mount===undefined){const group=coastAssembly(s,selected),parent=s.parts.find(p=>p.id===(group?.ids.has(hit?.id)?hit.id:selected)),point=hit?.point??view.groundPick(cameraOf(),canvas,e.clientX,e.clientY,parent?.p[1]??COAST_WATER_Y);if(!tooFar(parent,140)&&point&&Math.hypot(point[0]-parent.p[0],point[2]-parent.p[2])<=180){selected=parent.id;mountFit=coastMountChoice(parent,mountType,point,mountFit?.turn??0);say('見本の場所が変わったよ。「ここにつなぐ」で完成！');refresh(true);}return;}
  if(!hit)return;if(hit.salvage){const plan=coastSalvagePlan(s,recoveryOptions());if(plan){enabled=true;dismissed=null;selected=null;say(plan.message);refresh(true);}return;}const p=s.parts.find(p=>p.id===hit.id);if(tooFar(p,COAST_PULL_REACH)){say('岸から届くところで道具を選ぼう。');return;}
  if(hit.link!==undefined){const connection=coastConnections(s,selected).find(j=>j.id===hit.link);if(!detaching||hit.id!==selected||!connection){say('つなぎ目を選びなおそう。');return;}detachLink=hit.link;const other=s.parts.find(p=>p.id===(connection.a===selected?connection.b:connection.a));say(SEA_PARTS[p.type].name+'と'+SEA_PARTS[other.type].name+'のつなぎ目だよ。水色の道具と、その先につながる道具が離れるよ。');refresh(true);return;}
  if(detaching)return;
  if(hit.mount!==undefined){if(!mounting||hit.id!==selected)return;mountFit={side:hit.mount,offset:0,turn:mountFit?.turn??0};say('見本をタップしてずらせるよ。「ここにつなぐ」で完成！');refresh(true);return;}
  if(!enabled){enabled=true;dismissed=null;dock.hidden=false;}choose(hit.id);
 }
 canvas.addEventListener('pointerdown',tapDown);canvas.addEventListener('pointerup',tapUp);canvas.addEventListener('pointercancel',tapCancel);function tapCancel(){down=null;}
 // Capture object gestures before the camera's bubble listeners. Empty sea
 // still rotates the camera; the pad remains a separate, simultaneous input.
 objectTouch=createCoastObjectTouch({canvas,
  allowed:()=>state.map==='coast'&&!uiOverlay&&!document.hidden&&!service.blocked&&!readDrive().blocked&&!state.jumpY&&!state.jumpVelocity&&!rider&&!mounting&&!detaching&&!placement&&!ropeFrom&&!book?.open&&!loading?.pending&&!unloading?.pending&&!harborHUD?.pending&&!document.querySelector('dialog[open]'),
  pick:e=>{if(!view)return null;const hit=view.pick(cameraOf(),canvas,e.clientX,e.clientY),p=s.parts.find(p=>p.id===hit?.id)??coastIslandProps(s).find(p=>p.id===hit?.id);if(!p||hit.seat||hit.link!==undefined||hit.mount!==undefined||tooFar(p,COAST_PULL_REACH)||Math.abs(p.p[1]-state.groundY)>55)return null;return {...hit,local:localPoint(p,hit.point)};},
  begin:hit=>{if(!edit(hit.islandBoard?{type:'island-board'}:{type:'handle',id:hit.id}))return false;if(hit.islandBoard)hit.id=s.islandBoard.id;selected=hit.id;enabled=true;dismissed=null;const p=s.parts.find(p=>p.id===hit.id),lift=p.id===s.islandBoard?.id&&Math.hypot(p.p[0]+510,p.p[2]-1230)<180?10:0;grab={id:hit.id,local:lift?[0,3,0]:hit.local,target:[...hit.point],lift,upright:lift>0,offset:lift?sub(worldPoint(p,[0,3,0]),hit.point):[0,0,0]};noteUntil=0;release();refresh(true);return true;},
  project:(e,hit)=>view.groundPick(cameraOf(),canvas,e.clientX,e.clientY,hit.point[1]),
  move:point=>{if(grab)grab.target=coastHandTarget(add(add(point,grab.offset??[0,0,0]),[0,grab.lift??0,0]),{x:state.position.x,y:state.groundY,z:state.position.z});},
  end:()=>{grab=null;noteUntil=0;scheduleSave();refresh(true);},
  tap:hit=>{if(hit.islandBoard){if(!edit({type:'island-board'}))return;hit.id=s.islandBoard.id;}enabled=true;dismissed=null;choose(hit.id);}
 });
 direct=createCoastDirectHUD({dock,host,icon:partIcon,onDismiss:()=>{objectTouch?.cancel();winch?.cancel();loading?.cancel();unloading?.cancel();harborHUD?.cancel();if(book?.open)book.close();mounting=false;detaching=false;placement=null;ropeFrom=null;grab=null;noteUntil=0;release();clearInput();refresh(true);},onAnchor:()=>{if(!rider)return;const g=coastAssembly(s,rider.id),anchored=s.links.some(j=>j.kind==='moor'&&g.ids.has(j.a));if(edit({type:anchored?'unmoor':'anchor',id:rider.id})){release();say(anchored?'船を自由にしたよ。出発しよう！':s.links.some(j=>j.id.startsWith('island-berth-')||j.id.startsWith('berth-line-'))?'岸のロープにつないだよ。「船の上を歩く」で渡り板から上陸しよう。':'いかりで船を停めたよ。岸が近いときは、渡り板で上陸できるよ。');}},onWalk:()=>{if(crewHUD?.seated||crewHUD?.walking){if(!crewHUD.leave())return;deckWalking=true;}else deckWalking=!deckWalking;if(!deckWalking&&rider){const f=rotate(s.parts.find(p=>p.id===rider.id).q,[0,0,1]);state.viewHeading=Math.atan2(f[0],f[2]);state.viewPitch=0;}helmReady=false;clearInput();release();noteUntil=0;refresh(true);},onLook:()=>{if(crewHUD?.focused){crewHUD.releaseFocus();refresh(true);}winch?.follow(false);const p=s.parts.find(p=>p.id===rider?.id);if(!p)return;const f=rotate(p.q,[0,0,1]);state.viewHeading=Math.atan2(f[0],f[2]);state.viewPitch=0;clearInput();release();}});
 book=createCoastBoatBookHUD({dock,getPlay:()=>s,getSelected:()=>rider?.id??selected,edit,onNext:beginBookPart,clearInput,getNote:()=>status.textContent,onOpenChange:()=>{unloading?.cancel();loading?.cancel();winch?.cancel();clearInput();release();mounting=false;detaching=false;placement=null;grab=null;ropeFrom=null;refresh(true);}});
 winch=createCoastWinchHUD({canvas,dock,getPlay:()=>s,getContext:()=>({board:workBoat(),aboard:!!rider,allowed:!s.links.some(j=>j.id==='salvage-moor-'+s.salvage?.cargo)&&nearRope()&&enabled&&state.map==='coast'&&!uiOverlay&&!document.hidden&&!service.blocked&&!state.jumpY&&!state.jumpVelocity&&!mounting&&!detaching&&!placement&&!loading?.pending&&!unloading?.pending&&!grab&&!ropeFrom&&!book?.open&&!document.querySelector('dialog[open]')}),begin:action=>{release();clearInput();return edit(action);},finish:scheduleSave});
 const dangerReading=createCoastRaftDanger();let dangerAt=-Infinity,dangerBoat=null,dangerValue=null;
 function raftDanger(){
  const boat=state.map==='coast'&&!fallRescue&&s.sailing?.phase!=='capsized'&&rider&&s.parts.find(p=>p.id===rider.id);
  if(!boat){dangerAt=-Infinity;dangerBoat=null;dangerValue=null;return dangerReading.reset();}
  const now=performance.now();if(dangerBoat===boat&&now-dangerAt<100)return dangerValue;
  dangerAt=now;dangerBoat=boat;
  const info=coastReadout(s,boat.id,rider);
  dangerValue=dangerReading.update(info?{id:boat.id,tilt:info.tilt,load:info.mass/info.capacity,rollRate:Math.hypot(boat.w[0],boat.w[2])}:null,now);
  return dangerValue;
 }
 const sailingEnd=document.createElement('section');sailingEnd.className='sea-sailing-end';sailingEnd.hidden=true;sailingEnd.innerHTML='<strong>落水からの救助</strong><span>浮き輪で無事を確認！<br>救助先を探しています。</span><button type="button" data-retry-sail>少し前から再挑戦</button>';host.append(sailingEnd);
 let retryOffer=null,retryOfferEdit=-1;
 const rescueSafety=()=> '浮き輪で無事を確認！';
 function rescueDestination(p){return p.retry==='voyage'?(p.legacy?'近くの海上から再開します。':'約'+p.seconds+'秒前から再開します。'):p.retry==='reboard'?'自分のいかだに戻ります。':p.retry==='cave'?'洞窟の入口から再開します。':p.name+'へ戻ります。';}
 function rescueBrief(p){return rescueSafety()+'\n救助後、'+rescueDestination(p)+(p.rerouted?'\n空いている安全な場所へ戻ります。':'')+'\n素材・装備はそのまま。';}
 function rescueComplete(p){return '救助されました！\n'+rescueDestination(p);}
 // A queued release or keyboard activation can outlive the visible prompt.
 // Keep the offered route intact until this scene can accept play input.
 function rescueActionAllowed(){return !disposed&&state.map==='coast'&&!uiOverlay&&!document.hidden&&!service.blocked&&!readDrive().blocked&&!document.querySelector('dialog[open]');}
 function describeSailingRetry(){
  retryOfferEdit=s.edit;try{retryOffer=coastVoyageRetryPlan(s,s.sailing.board,recoveryOptions());set(sailingEnd.querySelector('span'),rescueBrief({...retryOffer,retry:'voyage'}));set(sailingEnd.querySelector('[data-retry-sail]'),retryOffer.legacy?'この海上から再挑戦':'少し前から再挑戦');}catch(e){retryOffer=null;set(sailingEnd.querySelector('span'),rescueSafety()+'\n'+e.message);}
 }
 function returnToBoat(p){
  const previous=s;
  if(p.retry==='voyage'&&!edit({type:'retry-voyage',id:p.board,choice:p.choice}))return false;
  const at=coastVoyageReboard(s,p.board,{canStand:canCarry});
  if(!at){s=previous;say('いかだの足元が変わったよ。もう一度たしかめてね。');return false;}
  if(at.walking&&s.crew&&!edit({type:'crew-leave'})){s=previous;return false;}
  crewHUD?.cancel();if(at.walking)crewHUD?.releaseFocus?.();state.position.set(at.x,at.y,at.z);state.groundY=at.y;state.jumpY=state.jumpVelocity=state.jumpCount=0;state.falling=false;
  state.heading=state.viewHeading=at.yaw;rider={id:p.board,y:at.y};lastBoat=selected=p.board;deckWalking=!!at.walking;helmReady=false;enabled=true;dismissed=null;clearInput();release();gangways.update(s);scheduleSave();return true;
 }
 const fallNotice=document.createElement('section');fallNotice.className='sea-sailing-end sea-fall-rescue';fallNotice.hidden=true;fallNotice.setAttribute('role','alertdialog');fallNotice.setAttribute('aria-label','海からの救助');fallNotice.innerHTML='<strong>落水からの救助</strong><span data-fall-message></span><button type="button" data-fall-return>戻る場所をたしかめる</button>';host.append(fallNotice);
 function describeFall(){
  if(!fallRescue)return;
  const label=fallNotice.querySelector('[data-fall-message]'),go=fallNotice.querySelector('[data-fall-return]');
  try{fallRescue.plan=coastFallRescuePlan(s,{...recoveryOptions(),x:fallRescue.x,z:fallRescue.z,lastBoat:fallRescue.board});
   const p=fallRescue.plan;
   set(label,rescueBrief(p));
   set(go,p.retry==='reboard'?'いかだに戻る':p.retry==='voyage'?(p.legacy?'この海上から再挑戦':'少し前から再挑戦'):p.name+'へ戻る');
  }catch(e){fallRescue.plan=null;set(label,rescueSafety()+'\n'+e.message);set(go,'救助先を探しなおす');}
 }
 function beginFallRescue(){
  fallRescue={x:state.position.x,z:state.position.z,board:lastBoat??s.sailing?.board,plan:null};
  clearInput();release();objectTouch?.cancel();pushInput?.cancel();crewHUD?.cancel();loading?.cancel();unloading?.cancel();winch?.cancel();grab=null;helmReady=false;accumulator=0;
  describeFall();fallNotice.hidden=false;
 }
 fallNotice.querySelector('[data-fall-return]').onclick=()=>{
  if(!fallRescue||!rescueActionAllowed())return;if(!fallRescue.plan){describeFall();return;}
  const offered=fallRescue.plan;let p;
  try{p=coastFallRescuePlan(s,{...recoveryOptions(),x:fallRescue.x,z:fallRescue.z,lastBoat:fallRescue.board});}
  catch(e){describeFall();return;}
  if(p.retry!==offered.retry||p.choice!==offered.choice||Math.hypot(p.shore.x-offered.shore.x,p.shore.z-offered.shore.z)>.01){describeFall();return;}
  if(['reboard','voyage'].includes(p.retry)){if(!returnToBoat(p)){describeFall();return;}}
  else{state.position.set(p.shore.x,p.shore.y,p.shore.z);state.groundY=p.shore.y;state.jumpY=state.jumpVelocity=state.jumpCount=0;state.falling=false;rider=null;deckWalking=false;clearInput();release();scheduleSave();}
  fallRescue=null;fallNotice.hidden=true;toast(rescueComplete(p),8000,'coast-rescue');
 };
 const retrySail=()=>{
  if(!rescueActionAllowed()||s.sailing?.phase!=='capsized')return;
  if(!retryOffer){describeSailingRetry();return;}
  let p;try{p=coastVoyageRetryPlan(s,s.sailing.board,{...recoveryOptions(),choice:retryOffer.choice});}catch(e){describeSailingRetry();return;}
  if(!returnToBoat({...p,retry:'voyage'})){set(sailingEnd.querySelector('span'),status.textContent);return;}
  sailingEnd.hidden=true;retryOffer=null;retryOfferEdit=-1;toast(rescueComplete({...p,retry:'voyage'}),8000,'coast-rescue');
 };
 sailingEnd.querySelector('[data-retry-sail]').onclick=retrySail;
 pushInput=createHeldDashButton({element:direct.push,enabled:()=>state.map==='coast'&&!rider&&!grab&&!mounting&&!detaching&&!placement&&!book?.open&&!winch?.holding&&!loading?.pending&&!unloading?.pending&&!harborHUD?.pending&&!harborHUD?.busy&&!uiOverlay&&!document.hidden&&!service.blocked&&!readDrive().blocked&&!document.querySelector('dialog[open]')&&!!coastPushForce(s.parts.find(p=>p.id===selected),{x:state.position.x,y:state.groundY,z:state.position.z}),context:()=>selected??'none'});
 harborHUD=createCoastHarborHUD({dock,canvas,getPlay:()=>s,getContext:()=>({...recoveryOptions(),map:state.map,heading:state.viewHeading,board:nearestBoat(),busy:service.busy,blocked:service.blocked,allowed:enabled&&state.map==='coast'&&!uiOverlay&&!document.hidden&&!service.blocked&&!state.jumpY&&!state.jumpVelocity&&!mounting&&!detaching&&!placement&&!loading?.pending&&!unloading?.pending&&!grab&&!ropeFrom&&!book?.open&&!document.querySelector('dialog[open]')}),getStock:harborTimberAvailable,apply:async action=>{if(service.busy||service.blocked)throw Error('セーブが終わってから、もう一度ためそう。');if(!edit(action))throw Error(status.textContent);clearTimeout(saveTimer);await persist();},prepare:()=>{clearInput();release();winch?.cancel();loading?.cancel();unloading?.cancel();if(book?.open)book.close();mounting=false;detaching=false;placement=null;grab=null;ropeFrom=null;},onOpen:()=>{setOpen(true);direct.openMore();},note:say});
 harborHUD.button.classList.add('sea-legacy-hud-entry');const harborShortcut=document.createElement('button');harborShortcut.type='button';harborShortcut.textContent='⚓ 港の道具';harborShortcut.onclick=()=>harborHUD.button.click();dock.querySelector('.sea-direct-more').append(harborShortcut);
 crewHUD=createCoastCrewHUD({dock,canvas,getPlay:()=>s,getContext:()=>({...recoveryOptions(),map:state.map,heading:state.heading,allowed:!savedPilot&&enabled&&state.map==='coast'&&!uiOverlay&&!document.hidden&&!service.blocked&&!state.jumpY&&!state.jumpVelocity&&!mounting&&!detaching&&!placement&&!loading?.pending&&!unloading?.pending&&!grab&&!ropeFrom&&!book?.open&&!document.querySelector('dialog[open]'),busy:service.busy,blocked:service.blocked,canCarry,move:(p,heading)=>{state.position.x=p[0];state.position.z=p[2];state.groundY=p[1];state.heading=heading;}}),edit:action=>{const result=edit(action);if(result&&action.type==='crew-sit'){deckWalking=false;helmReady=false;if(action.seat==='helm'){const f=rotate(s.parts.find(p=>p.id===action.board).q,[0,0,1]);state.viewHeading=Math.atan2(f[0],f[2]);state.viewPitch=0;}}return result;},prepare:()=>{clearInput();release();winch?.cancel();harborHUD?.releaseFocus();helmReady=false;},note:say});
 function beginBookPart(next){
  if(!next||state.map!=='coast'||uiOverlay||document.hidden||service.blocked||state.jumpY>.01||state.jumpVelocity!==0)return;
  const crossing=coastGangwaySupport(gangways.plans,state.position.x,state.position.z);if(crossing&&!rider&&Math.abs(state.groundY-crossing.y)<1){say('先に岸か船へ渡りきってから、見本の部品をつけよう。');return;}
  const parent=s.parts.find(p=>p.id===next.id);if(tooFar(parent,140)){say('見本をかさねた船のそばへ行こう。');return;}
  if(book?.open)book.close();const sources=[...coastLooseParts(s,next.id,next.type).map(p=>p.id),null],source=sources.find(source=>canCoastMount(s,next.id,next.type,next.side,{...mountOptions(source),offset:next.offset,turn:next.turn}));
  selected=next.id;mountType=next.type;mountSource=source===undefined?sources[0]:source;mountFit={side:next.side,offset:next.offset,turn:next.turn};mounting=true;detaching=false;placement=null;grab=null;ropeFrom=null;clearInput();release();say('設計帳のつぎの部品だよ。見本をたしかめて、ここにつなごう！');refresh(true);
 }
 function updateDirect(force=false){
  const now=performance.now();if(!force&&now-lastDirect<100)return;lastDirect=now;
  direct.workspace({active:state.map==='coast',dialog:[dialog,help,rescue].some(d=>d.open)});
  button.hidden=state.map!=='coast'||uiOverlay||document.hidden||service.blocked||!!fallRescue||!!document.querySelector('dialog[open]')||!shoreBoatRecovery();
  if(state.map!=='coast'){direct.show({visible:false,helm:false});return;}
  const actor={x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z};
  if(!mounting&&!detaching&&!placement&&!loading?.pending&&!unloading?.pending&&!ropeFrom&&!grab){const near=rider?s.parts.find(p=>p.id===rider.id):coastNearbyPart(s,actor,selected);if(near){selected=near.id;if(rider||dismissed!==near.id)enabled=true;}else{selected=null;enabled=false;dismissed=null;}}
  if(harborHUD?.pending||harborHUD?.nearby)enabled=true;
  const visible=enabled&&!uiOverlay&&!document.hidden&&!document.querySelector('dialog[open]');
  direct.show({visible,helm:visible&&steering()});if(!visible)return;
  crewHUD?.update();unloading?.update();loading?.update();winch?.update();salvageHUD?.update();harborHUD?.update();const p=s.parts.find(p=>p.id===selected),g=rider&&coastAssembly(s,rider.id),moored=!!g&&s.links.some(j=>j.kind==='moor'&&g.ids.has(j.a));
  direct.update({crewFocused:crewHUD?.focused,crewRole:crewHUD?.role,crewWalking:crewHUD?.walking,rider:rider&&coastBoatInWater(s,rider.id)?rider:null,aboard:!!rider,aground:!!rider&&coastRaftAground(s,rider.id),waterBoard:!!p&&coastBoatInWater(s,p.id),anchored:!!rider&&s.links.some(j=>(j.id.startsWith('sea-anchor-')||j.id.startsWith('island-berth-')||j.id.startsWith('berth-line-'))&&coastAssembly(s,rider.id)?.ids.has(j.a)),shoreTied:!!rider&&s.links.some(j=>(j.id.startsWith('island-berth-')||j.id.startsWith('berth-line-'))&&coastAssembly(s,rider.id)?.ids.has(j.a)),nearShore:!!rider&&!!coastShoreMooring(s,rider.id),bookOpen:book?.open,guiding:book?.guiding,bookHint:book?.hint,gangway:gangways.plans.some(p=>coastAssembly(s,rider?.id??selected)?.ids.has(p.id)),walking:deckWalking,boarding:!!rider&&!crewHUD?.seated&&!crewHUD?.walking&&!deckWalking&&!steering(),moored,grab,selected:p,mounting,detaching,placement,rope:ropeFrom,blocked:service.blocked||harborHUD?.busy||state.jumpY>.01||state.jumpVelocity!==0,speed:rider&&p?Math.hypot(p.v[0],p.v[2]):0,note:now<noteUntil?status.textContent:''});
  if(p&&!harborHUD?.pending&&!loading?.active&&!unloading?.working&&(!rider||deckWalking)&&!mounting&&!detaching&&!placement){const gangway=gangways.plans.find(g=>coastAssembly(s,p.id)?.ids.has(g.id)),camera=cameraOf(),rect=canvas.getBoundingClientRect(),base=host.getBoundingClientRect(),goal=false;
   if(goal)markerPosition.set(COAST_SHORE_GOAL.x,seaFloor(COAST_SHORE_GOAL.x,COAST_SHORE_GOAL.z)+6,COAST_SHORE_GOAL.z);else if(gangway){markerPosition.fromArray(gangway.from.map((v,i)=>v+(gangway.to[i]-v)*.65));markerPosition.y+=7;}else{markerPosition.fromArray(p.p);markerPosition.y+=SEA_PARTS[p.type].size[1]/2+10;}markerPosition.project(camera);
   let x=rect.left-base.left+(markerPosition.x+1)*rect.width/2,y=rect.top-base.top+(1-markerPosition.y)*rect.height/2;const bottom=rect.top-base.top+rect.height-165;
   if(goal){x=Math.max(55,Math.min(rect.width-55,x));y=Math.max(120,Math.min(bottom,y));}
   direct.mark(!coastGangwaySupport(gangways.plans,state.position.x,state.position.z)&&markerPosition.z>=-1&&markerPosition.z<=1&&x>45&&x<rect.width-45&&y>=110&&y<=bottom?{x,y}:null,goal?'◎ ここへ！':gangway?'🚶 渡り板':p.type==='board'?(coastBoatInWater(s,p.id)?'⤒ のってこぐ':'✋ 引いて動かせる'):grab?'✋ はこぶ':'✋ つかんで引く');}

 }
 function refresh(force=false){const now=performance.now();if(!force&&now-lastRefresh<100)return;lastRefresh=now;refreshFit();dock.classList.toggle('is-aboard',!!rider);dock.classList.toggle('is-sailing',!!rider&&!toolsExpanded&&!mounting&&!placement);dock.classList.toggle('is-mounting',mounting);dock.classList.toggle('is-detaching',detaching);if(!detaching)detachLink=null;detachConfirm.hidden=!detaching||!detachLink;refreshMountPicker();refreshDetachChoices();set(q('[data-mount-cancel]'),detaching?'はずすのをやめる':'つなぐのをやめる');
  rescueButton.hidden=!!rider||!!placement||mounting||detaching;
  castOffButton.hidden=!rider||!!placement||mounting||detaching||!s.links.some(j=>j.kind==='moor'&&coastAssembly(s,rider.id)?.ids.has(j.a));
  const p=s.parts.find(p=>p.id===selected),info=p?coastReadout(s,p.id,rider):null,key=[selected,s.edit,!!rider,!!grab,!!ropeFrom,mounting,detaching,mountType,!!placement,placement?.board,placement?.valid,service.busy,service.blocked,s.goals.shore,s.goals.sail].join('|');
  const guide=coastPlayGuide(s,selected,rider);dock.classList.toggle('is-placing',!!placement);set(q('[data-route-status]'),guide.text);
  if(force||key!==lastUi){lastUi=key;set(q('[data-sea-title]'),placement?SEA_PARTS[placement.type].name+'を出す':p?SEA_PARTS[p.type].name:'いかだと道具');q('[data-sea-act="grab"]').disabled=!p;for(const name of['float','board','rope','detach'])q('[data-sea-act="'+name+'"]').disabled=!p;q('[data-sea-act="undo"]').disabled=!s.history.length;q('[data-mount-cancel]').hidden=!mounting&&!detaching&&!ropeFrom;dock.querySelector('.sea-placement').hidden=!placement;dock.querySelector('.sea-play-actions').hidden=!!placement;q('[data-place-ok]').disabled=!placement?.valid;set(q('[data-place-ok]'),'ここに出す');paddle.hidden=!rider||!!placement||mounting||detaching;}
  tiltBar.hidden=!info||!!placement; if(info){tiltBar.value=Math.min(60,Math.round(info.tilt));tiltBar.title=info.tilt>=35?'大きく傾いているよ！ 中央へもどろう':info.tilt>=20?'中央に乗ると安定するよ':'バランスがいいよ';}
   if(p)set(q('[data-sea-act="detach"]'),s.links.some(j=>j.kind==='moor'&&coastAssembly(s,p.id)?.ids.has(j.a))?'桟橋のロープをほどく':'はずす');if(placement){set(q('[data-sea-load]'),SEA_PARTS[placement.type].mass+' kg · 重さをのせてためそう');set(q('[data-sea-tilt]'),'');}else if(info){set(q('[data-sea-load]'),Math.round(info.mass)+' kg · '+(info.supported?'板と浮きが支えているよ':info.margin<0?'沈みそう！':info.margin<60?'浮く力が少ないよ':'浮く力に余裕あり'));set(q('[data-sea-tilt]'),'傾き '+Math.round(info.tilt)+'°');}else{set(q('[data-sea-load]'),'重さで沈み、片側に乗ると傾くよ');set(q('[data-sea-tilt]'),'');}
  if(!rider)release();updateDirect(true);
 }
 function announceVoyageStep(previous){const next=s.voyage?.stage;if(!Number.isInteger(previous)||!Number.isInteger(next)||next<=previous||next>=3)return;toast(next===1?'①の旗を通ったよ！ 次は②へ。':'②も通ったよ！ ③の輪で止まって届けよう。');scheduleSave();}
 // Map changes end only unconfirmed gestures. Real parts, links, delivery,
 // undo and any pending save remain owned by the same protected world.
 function syncMap(){
  const coast=state.map==='coast';if(coast===coastPresent)return coast;coastPresent=coast;if(coast)return true;
  fallRescue=null;fallNotice.hidden=true;objectTouch?.cancel();crewHUD?.cancel();if(s.crew){s=editCoastPlay(s,{type:'crew-leave'});scheduleSave();}harborHUD?.cancel();salvageHUD?.cancel();unloading?.cancel();loading?.cancel();winch?.cancel();if(book?.open)book.close();deckWalking=false;helmReady=false;driveAxes={x:0,y:0};dismissed=null;direct?.show({visible:false,helm:false});enabled=false;toolsExpanded=false;selected=null;mounting=false;detaching=false;mountSource=null;mountFit=null;fitPreview=null;fitKey='';ropeFrom=null;grab=null;placement=null;rider=null;down=null;socketPreview=null;detachLink=null;recoveryPlan=null;recoveryId=null;accumulator=0;lastUi='';mountUi='';unlinkUi='';
  release();clearInput();activityEntry.update({map:state.map});for(const d of[dialog,help,rescue])if(d.open)d.close();
  dock.hidden=true;document.body.classList.remove('coast-physics-active');return false;
 }
 function beforeWalk(delta){
  // The fitting screen holds the real hull and its rider, not just input.
  if(state.map==='coast'&&suspended()){accumulator=0;fallDelta=fallElapsed=0;helmReady=false;driveAxes={x:0,y:0};release();return;}
  plankGrounded=false;
  fallDelta=0;
  resumeSavedPilot();
  const savedFloor=rider&&state.map==='coast'&&!state.jumpY&&!state.jumpVelocity&&!state.falling?coastSupport(s,state.position.x,state.position.z,state.groundY):null;deckGrounded=!!savedFloor&&savedFloor.id===rider.id&&Math.abs(savedFloor.y-state.groundY)<.001;
  const coast=syncMap();if(!coast)button.hidden=true;dock.hidden=!coast||!enabled||rescue.open;document.body.classList.toggle('coast-physics-active',coast&&enabled);
  if(view)view.root.visible=coast;if(gangwayView)gangwayView.root.visible=coast;if(!coast)return;
  started=true;if(!view&&getScene())view=createCoastPlayView(getScene());if(!view)return;
  const input=readDrive();if(Math.hypot(input.x||0,input.y||0)>.12){harborHUD?.releaseFocus();}const paused=swimming()||!!fallRescue||mounting||detaching||!!placement||loading?.pending||unloading?.pending||book?.open||harborHUD?.pending||harborHUD?.busy||service.blocked||input.blocked||document.hidden||!!document.querySelector('dialog[open]');if(paused||s.sailing?.phase==='capsized'){pushInput?.cancel();pushing=false;objectTouch?.cancel();crewHUD?.cancel();loading?.cancel();winch?.cancel();gangways.update(s);grab=null;helmReady=false;release();return;}
  fallDelta=Math.max(0,Math.min(Number.isFinite(delta)?delta:0,.05));
  const align=loading?.sampleAlignment()??null,aligning=!!align||loading?.aligning;if(aligning){winch?.releaseInput();helmReady=false;release();}
  const reel=aligning?null:winch?.sample()??null;if(winch?.holding||crewHUD?.walking){helmReady=false;release();}
  if(steering()&&!winch?.holding&&!aligning){if(Math.hypot(input.x||0,input.y||0)>.12)winch?.follow(false);if(Math.hypot(input.x||0,input.y||0)<.12)helmReady=true;driveAxes=helmReady?input:{x:0,y:0};}else driveAxes={x:0,y:0};
  const intent=oars();if(steering()&&(intent.left||intent.right)&&s.links.some(j=>j.kind==='moor'&&coastAssembly(s,rider.id)?.ids.has(j.a))){if(!edit({type:'unmoor',id:rider.id})){release();return;}noteUntil=0;}
  if(grab&&tooFar(s.parts.find(p=>p.id===grab.id),COAST_PULL_RELEASE)){grab=null;say('道具が遠くなったので、ロープをはなしたよ。');}
  const fixedHelm=steering()&&!state.jumpY&&!state.jumpVelocity;
  // Reconstruct a cold save's real support before the first wave step.
  if(!gangways.plans.length)gangways.update(s);
  const previousPlanks=gangways.plans,plankFoot=!rider&&!state.falling&&!state.jumpY&&!state.jumpVelocity?{x:state.position.x,y:state.groundY,z:state.position.z}:null;
  const previousSupport=plankFoot&&coastGangwaySupport(previousPlanks,plankFoot.x,plankFoot.z);plankGrounded=!!previousSupport&&Math.abs(previousSupport.y-plankFoot.y)<.6;
  const oldRider=rider,oldPart=rider&&s.parts.find(p=>p.id===rider.id),ownDeck=!!oldPart&&!!gangwayDeckSupport(coastGangwaySupport(gangways.plans,state.position.x,state.position.z),state.position.x,state.position.z,state.groundY),oldLocal=oldPart?(fixedHelm?helmLocal(oldPart.id):localPoint(oldPart,[state.position.x,state.groundY,state.position.z])):null;
  const oldForward=oldPart&&rotate(oldPart.q,[0,0,1]),oldYaw=oldForward?Math.atan2(oldForward[0],oldForward[2]):0;
   contactField.update(obstacles(),s);const contactObstacles=[],excludeIds=oldRider?[...coastAssembly(s,oldRider.id).ids]:[];
   // The low bridge edge is stepped over, not pushed sideways by the shin.
   // Retain contact with tall/tilted boards and all unrelated objects.
   const stepBoard=s.islandBoard&&s.parts.find(p=>p.id===s.islandBoard.id);
   if(stepBoard&&!state.jumpY&&Math.abs(islandPathSurface(state.position.x,state.position.z)-state.groundY)<.6&&rotate(stepBoard.q,[0,1,0])[1]>.98){const top=worldPoint(stepBoard,[0,3,0])[1],rise=top-state.groundY;if(rise>=-.5&&rise<=6.5)excludeIds.push(stepBoard.id);}
   contactObstacles.push({excludeIds,x:state.position.x,z:state.position.z,halfX:8,halfZ:8,minY:state.groundY+state.jumpY+1,maxY:state.groundY+state.jumpY+39});
  accumulator=Math.min(accumulator+delta,.12);let count=0;
  const pushActive=!!pushInput?.active;if(pushActive&&!pushing){if(edit({type:'handle',id:selected}))pushing=true;else pushInput.cancel();}if(!pushActive&&pushing){pushing=false;scheduleSave();}
  // Sample the recent interval once, then advance waves at the fixed physics rate.
  // A slow draw must not repeat one late crest through every substep.
  paintHeld();const rowing=oars(),previousVoyageStage=s.voyage?.stage,frameSeaTime=coastOceanTime();while(accumulator+1e-10>=SEA_PLAY.dt&&count++<14){const part=oldRider&&s.parts.find(p=>p.id===oldRider.id),crossingLoad=!ownDeck&&!fixedHelm&&!state.jumpY&&!state.jumpVelocity?coastGangwayLoad(gangways.plans,{x:state.position.x,y:state.groundY,z:state.position.z}):null,load=part&&!crossingLoad&&state.jumpY<.01&&state.jumpVelocity===0?{id:part.id,point:worldPoint(part,oldLocal)}:null,hand=[state.position.x+Math.sin(state.viewHeading)*22,state.groundY+16,state.position.z+Math.cos(state.viewHeading)*22];
   stepCoastPlay(s,{helm:fixedHelm,push:pushing?{id:selected,actor:{x:state.position.x,y:state.groundY,z:state.position.z}}:null,rider:load,gangwayLoad:crossingLoad??(!load&&!state.jumpY&&!state.jumpVelocity?coastGangwayLoad(gangways.plans,{x:state.position.x,y:state.groundY,z:state.position.z}):null),grab:grab?{...grab,target:grab.target??hand}:null,winch:reel,workAlign:align,oars:paddling?rowing:null},{seaTime:frameSeaTime-accumulator,coastVisits:service.ledger?.world.coastVisits,rig:service.ledger?.world.coastRig,rigLevel:service.ledger?.world.coastRig?.equipped??0,contactField,obstacles:contactObstacles});accumulator=Math.max(0,accumulator-SEA_PLAY.dt);
  }
  gangways.update(s);
  const carried=plankFoot&&s.sailing?.phase!=='capsized'&&coastGangwayCarry(previousPlanks,gangways.plans,plankFoot);
  if(carried){const distance=Math.hypot(carried.x-plankFoot.x,carried.y-plankFoot.y,carried.z-plankFoot.z),steps=Math.max(1,Math.ceil(distance/2));let clear=true;for(let i=1;i<=steps;i++){const t=i/steps;if(!canCarry(plankFoot.x+(carried.x-plankFoot.x)*t,plankFoot.y+(carried.y-plankFoot.y)*t,plankFoot.z+(carried.z-plankFoot.z)*t,state.heading,carried.floors)){clear=false;break;}}if(clear){state.position.x=carried.x;state.position.z=carried.z;state.groundY=carried.y;}}
  announceVoyageStep(previousVoyageStage);
  if(oldPart&&oldLocal&&state.jumpY<.01&&state.jumpVelocity===0){const next=worldPoint(s.parts.find(p=>p.id===oldRider.id),oldLocal);if(canCarry(next[0],next[1],next[2])){state.position.x=next[0];state.position.z=next[2];state.groundY=next[1];const forward=rotate(s.parts.find(p=>p.id===oldRider.id).q,[0,0,1]),yaw=Math.atan2(forward[0],forward[2]),deltaYaw=Math.atan2(Math.sin(yaw-oldYaw),Math.cos(yaw-oldYaw));state.heading=fixedHelm?yaw:Math.atan2(Math.sin(state.heading+deltaYaw),Math.cos(state.heading+deltaYaw));if(fixedHelm||paddling)state.viewHeading=Math.atan2(Math.sin(state.viewHeading+deltaYaw),Math.cos(state.viewHeading+deltaYaw));}}
  if(!fixedHelm)crewHUD?.advance(delta);
  if(s.sailing?.phase==='capsized'){clearInput();release();rider=null;grab=null;pushInput?.cancel();pushing=false;state.jumpY=0;state.jumpVelocity=0;scheduleSave();}
if(s.goals.sail&&!notifiedSail){notifiedSail=true;toast('★ はじめての船長！ いかだに乗れたよ！');scheduleSave();}
 }
 let floatingFrame=null;
 function floatingRescuePose(){
  if(state.map!=='coast'||(!fallRescue&&s.sailing?.phase!=='capsized')){floatingFrame=null;return null;}
  // Changing maps resets the walking spawn. An interrupted capsize still
  // belongs to its own saved boat, never to that unrelated dry-land spawn.
  const boat=!fallRescue&&s.parts.find(p=>p.id===s.sailing?.board&&p.type==='board');if(!fallRescue&&!boat){floatingFrame=null;return null;}
  const heading=state.viewHeading??state.heading??0,point=fallRescue??{x:boat.p[0],z:boat.p[2]},offset=fallRescue?0:105;
  const x=point.x+Math.cos(heading)*offset,z=point.z-Math.sin(heading)*offset,frame=Math.floor(coastOceanTime()*60),actor=getCharacter?.();
  if(floatingFrame?.actor===actor&&floatingFrame.frame===frame&&floatingFrame.x===x&&floatingFrame.z===z&&floatingFrame.heading===heading)return floatingFrame.pose;
  const pose=coastFloatingRescuePose(actor,{x,z,heading},frame/60);floatingFrame={actor,frame,x,z,heading,pose};return pose;
 }
 function draw(){if(!view)return;
  fallNotice.hidden=state.map!=='coast'||!fallRescue||uiOverlay;
  const ended=state.map==='coast'&&s.sailing?.phase==='capsized';if(ended&&retryOfferEdit!==s.edit)describeSailingRetry();sailingEnd.hidden=!ended||!!fallRescue||uiOverlay;
  if(fallRescue||ended){const disabled=!rescueActionAllowed();fallNotice.querySelector('[data-fall-return]').disabled=disabled;sailingEnd.querySelector('[data-retry-sail]').disabled=disabled;}
  if(ended)direct.show({visible:false,helm:false});
 if(mounting)refreshFit();if(!gangwayView&&getScene())gangwayView=createCoastGangwayView(getScene());if(gangwayView){gangwayView.root.visible=state.map==='coast';gangwayView.update(s,gangways.plans);}let sockets=[];if(mounting){const key=[selected,mountType,mountSource,s.edit,s.tick,state.position.x,state.position.z,state.groundY,state.jumpY,rider?.id].join('|'),now=performance.now();if(!socketPreview||socketPreview.state!==s||socketPreview.key!==key||now-socketPreview.time>=100)socketPreview={state:s,key,time:now,values:[0,1,2,3].map(side=>mountAllowed(selected,mountType,side))};sockets=socketPreview.values;}else socketPreview=null;
  // Socket colors are advisory. tapUp and edit still run a fresh full check.
  view.update(s,{floatingRescue:floatingRescuePose(),rowingHands:!state.jumpY&&!state.jumpVelocity&&(steering()||crewHUD?.role==='helm'&&!crewHUD?.walking)?coastRowingHands(getCharacter?.()):null,seaTime:coastOceanTime(),rig:service.ledger?.world.coastRig,rigLevel:service.ledger?.world.coastRig?.equipped??0,crewRole:crewHUD?.role,crewWalking:crewHUD?.walking,crewBoard:rider?.id,harborPreview:harborHUD?.preview,winch:winch?.target,selection:selected,detachments:detaching?coastConnections(s,selected):null,detachLink:detaching?detachLink:null,mounting:mounting?selected:null,mountType,mountSource:mounting?mountSource:null,mountAllowed:side=>sockets[side],preview:unloading?.preview??loading?.preview??(mounting?fitPreview:placement?{part:placement.type,point:placement.point,rotation:placement.rotation,valid:placement.valid}:null),recovery:rescue.open?recoveryPlan:null,design:rescue.open||mounting||detaching||placement?null:book?.preview,hand:grab?[state.position.x,state.groundY+16,state.position.z]:null,handLocal:grab?.local,paddling,oars:oars(),rider,actor:{x:state.position.x,y:state.groundY,z:state.position.z,heading:state.viewHeading}});}
 function afterWalk(){if(state.map==='coast'&&suspended()){fallDelta=fallElapsed=0;return;}if(swimming()){fallElapsed=0;fallDelta=0;return;}if(fallRescue||state.map!=='coast'||s.sailing?.phase==='capsized'){fallElapsed=0;fallDelta=0;return;}const wasRiding=!!rider,wasWalking=deckWalking,pilot=wasRiding&&!state.jumpY&&!state.jumpVelocity&&(steering()||crewHUD?.seated||crewHUD?.walking)?rider:null,seatLocal=crewHUD?.pose?.local;rider=null;
  // A fixed pilot follows the moving hull, rather than standing freely on a
  // walkable horizontal floor. Keep that attachment through a wave's roll;
  // the sailing physics still releases it when the boat actually capsizes.
  // The visible plank owns its contact until the hinge. Its overlap with
  // the board's walking margin is not a request to turn into the helm.
  const boarding=coastGangwaySupport(gangways.plans,state.position.x,state.position.z),onPlank=boarding&&boarding.t>.05&&Math.abs(boarding.y-state.groundY)<.6&&!gangwayDeckSupport(boarding,state.position.x,state.position.z,state.groundY);
  if(pilot&&(seatLocal||!onPlank)){const board=s.parts.find(p=>p.id===pilot.id);rider={id:pilot.id,y:worldPoint(board,seatLocal??helmLocal(pilot.id))[1]};}
  else if(!onPlank&&state.jumpY<.1&&state.jumpVelocity===0){const floor=coastSupport(s,state.position.x,state.position.z,state.groundY);if(floor&&Math.abs(floor.y-state.groundY)<2)rider=floor;}
  if(rider&&coastBoatInWater(s,rider.id))lastBoat=rider.id;
  if(recordCoastDryLand(s,{x:state.position.x,y:state.groundY,z:state.position.z,grounded:state.jumpY<.01&&state.jumpVelocity===0&&!state.falling,riding:!!rider,groundContact}))scheduleSave();
  if(wasRiding&&!rider){deckWalking=wasWalking&&!!onPlank;helmReady=false;if(!wasWalking)clearInput();release();}
  if(!wasRiding&&rider){deckWalking=wasWalking||!coastBoatInWater(s,rider.id);helmReady=false;selected=rider.id;enabled=true;dismissed=null;if(!deckWalking){const forward=rotate(s.parts.find(p=>p.id===rider.id).q,[0,0,1]);state.viewHeading=Math.atan2(forward[0],forward[2]);state.viewPitch=0;clearInput();}release();noteUntil=0;refresh(true);}
  const capsizing=s.sailing&&rotate(s.parts.find(p=>p.id===s.sailing.board).q,[0,1,0])[1]<.2;
  if(s.sailing&&!rider&&!capsizing&&!state.jumpY&&!state.jumpVelocity&&state.groundY>=COAST_WATER_Y-1&&Math.abs(seaFloor(state.position.x,state.position.z)-state.groundY)<1){delete s.sailing;s.edit++;scheduleSave();}
  // Wet sand is walkable on every coast. A passing wave alone cannot be a
  if(!rider&&!onPlank)deckWalking=false;
  // fall: use the same stable wading depth as movement, not the wave crest.
  // A deck above the person is not support (e.g. a fall beneath a pier).
  const feet=state.groundY+state.jumpY,belowWading=!capsizing&&!rider&&!state.jumpVelocity&&coastInDeepWater(state.position.x,feet,state.position.z);
  const supportY=belowWading?surface(state.position.x,state.position.z):undefined;
  const supported=Number.isFinite(supportY)&&Math.abs(supportY-feet)<=2;
  const deep=belowWading&&!supported;
  fallElapsed=deep&&fallDelta>0?fallElapsed+fallDelta:0;fallDelta=0;
  // Active game time only: a brief edge slip, menu, or background pause
  // never turns into an immediate rescue on the next frame.
  if(fallElapsed>=.8){fallElapsed=0;beginFallRescue();}
 }
 return {button,get watchingWhale(){return watchingWhale();},get gangwayGrounded(){return state.map==='coast'&&plankGrounded;},leaveSeat(){const left=crewHUD?.leave();if(left){deckWalking=true;helmReady=false;}return left;},get crewPose(){resumeSavedPilot();const fixed=steering()&&!state.jumpY&&!state.jumpVelocity,board=fixed&&s.parts.find(p=>p.id===rider.id),pose=fixed?{board,point:worldPoint(board,helmLocal(board.id)),seat:s.crew?.board===board.id?s.crew.seat:undefined,walking:false}:crewHUD?.pose;if(pose&&!pose.walking&&(fixed||pose.seat==='helm'))return{...pose,rowing:{play:s,rig:service.ledger?.world.coastRig,time:coastOceanTime(),rate:rigProfile(service.ledger?.world.coastRig).rate,oars:fixed?oars():{}}};return pose??null;},get rescuePose(){return floatingRescuePose();},get rescuing(){return state.map==='coast'&&(!!fallRescue||s.sailing?.phase==='capsized');},get seated(){return crewHUD?.seated??false;},get crewWalking(){return crewHUD?.walking??false;},get harborButton(){return harborHUD.button;},beginActivity,beforeWalk,afterWalk,render({overlay=false}={}){resumeSavedPilot();uiOverlay=overlay;const coast=syncMap();activityEntry.update({overlay,map:state.map});if(overlay){objectTouch?.cancel();unloading?.cancel();loading?.cancel();winch?.cancel();release();}if(!view&&coast&&getScene())view=createCoastPlayView(getScene());if(view)view.root.visible=coast;if(!coast)button.hidden=true;dock.hidden=swimming()||!coast||!enabled||overlay||rescue.open;document.body.classList.toggle('coast-physics-active',coast&&enabled&&!overlay);if(coast){book?.update();draw();if(!dock.hidden)refresh();updateDirect();if(swimming()||fallRescue||s.sailing?.phase==='capsized')direct.show({visible:false,helm:false});}else direct.show({visible:false,helm:false});},get steering(){return steering();},get raftDanger(){return raftDanger();},get hauling(){return state.map==='coast'&&!!grab&&!grab.target;},get riding(){return state.map==='coast'&&!!rider&&coastBoatInWater(s,rider.id);},get walkScale(){return state.map==='coast'&&rider&&coastBoatInWater(s,rider.id)?.55:1;},get open(){return state.map==='coast'&&enabled;},get modalOpen(){return state.map==='coast'&&(!!fallRescue||s.sailing?.phase==='capsized'||activityEntry.open||dialog.open||help.open||rescue.open||book?.open||loading?.pending||unloading?.pending||harborHUD?.pending||harborHUD?.busy||mounting||detaching||!!placement);},get editFocus(){if(state.map!=='coast')return null;if(harborHUD?.focus)return harborHUD.focus;if(unloading?.focus)return unloading.focus;if(salvageHUD?.focus)return salvageHUD.focus;if(loading?.focus)return loading.focus;if(winch?.focus)return winch.focus;if(crewHUD?.focus&&!book?.open&&!mounting&&!detaching&&!placement)return crewHUD.focus;if(book?.open&&book.preview){const guide=book.preview,root=s.parts.find(p=>p.id===guide.boat);if(root&&guide.parts.length){const points=[root.p,...guide.parts.map(p=>worldPoint(root,p.p))],lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));return{center:[(lo[0]+hi[0])/2,hi[1]+12,(lo[2]+hi[2])/2],radius:Math.max(105,Math.hypot(hi[0]-lo[0],hi[2]-lo[2])/2+65),label:'船の見本'};}}if(rescue.open&&recoveryPlan){const points=recoveryPlan.parts.map(p=>p.p),lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));return{center:[(lo[0]+hi[0])/2,14,(lo[2]+hi[2])/2],radius:Math.max(100,Math.hypot(hi[0]-lo[0],hi[2]-lo[2])/2+45)};}if(detaching){const focus=coastConnectionFocus(s,selected);return focus?{...focus,label:'つなぎ目'}:null;}if(!enabled||(!mounting&&!placement))return null;if(mounting)return coastMountFocus(s,selected,mountType,mountSource);const p=s.parts.find(p=>p.id===selected),points=placement?[placement.point,[state.position.x,state.groundY,state.position.z]]:p?[p.p,...(mountSource?[s.parts.find(p=>p.id===mountSource)?.p].filter(Boolean):[]),...[0,1,2,3].map(side=>coastMountPoint(p,mountType,side))]:[];if(!points.length)return null;const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));return{center:[(lo[0]+hi[0])/2,hi[1]+22,(lo[2]+hi[2])/2],radius:Math.max(70,Math.hypot(hi[0]-lo[0],hi[2]-lo[2])/2+20)};},get lanternPose(){return state.map==='coast'?(s.parts.find(p=>p.id===rider?.id)??s.parts.find(p=>p.id==='sea-5')):null;},get returnBoat(){return coastReturnBoat(s,{map:state.map,x:state.position.x,z:state.position.z,aboard:!!rider||crewHUD?.seated||crewHUD?.walking});},get navigation(){return s.navigation;},get waveTime(){return coastOceanTime();},get autoSaveKey(){return started?s.edit+':'+Math.floor(s.tick/480):'';},snapshot:()=>started?structuredClone(s):undefined,rampAt:(x,z,reference)=>{if(rider&&!state.jumpY&&!state.jumpVelocity&&Math.hypot(x-state.position.x,z-state.position.z)<.01){const seat=crewHUD?.pose;if(seat&&(seat.seat||seat.walking))return seat.point[1];if(steering()){const board=s.parts.find(p=>p.id===rider.id);return worldPoint(board,helmLocal(board.id))[1];}}const join=islandPortWalkHeight(x,z,reference,coastHeight(x,z));if(Number.isFinite(join))return join;const p=coastGangwaySupport(gangways.plans,x,z);if(p&&Math.abs(p.y-reference)<=4)return gangwayDeckSupport(p,x,z,reference,deckGrounded)?.y??p.y;if(coastIslandStep(s,{x,z},{x,z},reference)){const f=coastSupport(s,x,z);if(f?.id===s.islandBoard?.id)return f.y;}return undefined;},surfaceAt:surface,hasSupport:(x,z)=>Number.isFinite(surface(x,z)),
  deckWalk(fromX,fromZ,x,z){if(state.map!=='coast')return false;if(islandPortStep({x:fromX,z:fromZ},{x,z},state.groundY,coastHeight))return true;if(coastIslandStep(s,{x:fromX,z:fromZ},{x,z},state.groundY))return true;if(coastGangwayStep(gangways.plans,{x:fromX,z:fromZ},{x,z},gangwayGround))return true;const a=coastSupport(s,fromX,fromZ,state.groundY),b=coastSupport(s,x,z,state.groundY);return !!a&&!!b&&coastAssembly(s,a.id)?.ids.has(b.id)&&Math.abs(a.y-b.y)<=Math.hypot(x-fromX,z-fromZ)*1.4+.03;},
  floorPassageAt(item,fromX,fromZ,x,z){return state.map==='coast'&&!swimming()&&!state.falling&&!state.jumpY&&!state.jumpVelocity&&coastGangwayFloorPassage(gangways.plans,item,{x:fromX,z:fromZ},{x,z},state.groundY,gangwayGround);},
  blockedAt(x,z,fromX,fromZ,actorY,contact,body=null,heading=0){const plank=coastGangwayWalkContact(gangways.plans,{x:fromX,z:fromZ},{x,z},gangwayGround,body&&state.map==='coast'&&!state.falling&&!state.jumpY&&!state.jumpVelocity&&!swimming()?body:null,heading,actorY),crossing=plank&&(plank.approach||coastGangwayStep(gangways.plans,{x:fromX,z:fromZ},{x,z},gangwayGround));for(const o of [...coastVoyageSolids(s),...coastHarborSolids(s),...coastSalvageSolids(s),...coastIslandPropSolids(s)]){if(actorY>=o.maxY)continue;const a=contact(fromX,fromZ,o),b=contact(x,z,o);if(b.intersects&&(!a.intersects||b.penetration>a.penetration+.001))return true;}for(const p of s.parts){if(crossing&&plank.id===p.id&&actorY>=plank.y-4)continue;if(Math.hypot(x-p.p[0],z-p.p[2])>85)continue;const [w,h,d]=SEA_PARTS[p.type].size,up=rotate(p.q,[0,1,0]),top=p.type==='board'?coastSupport(s,x,z)?.y:undefined;if(top!==undefined&&actorY>=top-.5)continue;if(p.id===s.islandBoard?.id&&up[1]>.98&&Number.isFinite(islandPathSurface(fromX,fromZ))&&actorY>=worldPoint(p,[0,3,0])[1]-6.5)continue;if(body){const a=coastBodyPartContact(p,body,{x:fromX,y:actorY,z:fromZ},heading),b=coastBodyPartContact(p,body,{x,y:actorY,z},heading);if(a&&b){if(b.intersects&&(!a.intersects||b.penetration>a.penetration+.001))return true;continue;}}const yaw=Math.atan2(rotate(p.q,[0,0,1])[0],rotate(p.q,[0,0,1])[2]),c={x:p.p[0],z:p.p[2],rotation:yaw,localHalfX:w/2,localHalfZ:d/2,halfX:(w+d)/2,halfZ:(w+d)/2,minY:p.p[1]-h/2,maxY:p.p[1]+h/2,obstacleHeight:p.p[1]+h/2};const a=contact(fromX,fromZ,c),b=contact(x,z,c);if(b.intersects&&(!a.intersects||b.penetration>a.penetration+.001))return true;}return false;},
  dispose(){if(disposed)return;disposed=true;clearTimeout(saveTimer);pushInput?.dispose();dangerReading.reset();sailingEnd.remove();fallNotice.remove();objectTouch?.dispose();lost();crewHUD?.dispose();harborHUD?.dispose();salvageHUD?.dispose();unloading?.dispose();loading?.dispose();winch?.dispose();book?.dispose();direct.dispose();activityEntry.dispose();gangways.dispose();gangwayView?.dispose();view?.dispose();dock.remove();dialog.remove();help.remove();rescue.remove();button.remove();canvas.removeEventListener('pointerdown',tapDown);canvas.removeEventListener('pointerup',tapUp);canvas.removeEventListener('pointercancel',tapCancel);oarHolds.forEach(h=>h.input.dispose());window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',lost);document.removeEventListener('visibilitychange',lost);window.removeEventListener('pagehide',lost);document.body.classList.remove('coast-physics-active');}};
}


