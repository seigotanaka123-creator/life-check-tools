import {createConstructionWalkGait} from './imasora-construction-walk-gait.mjs?v=120fb';
import {constructionWorkAutoSaveKey} from './imasora-construction-autosave-key.mjs?v=120es';
import {soilBedBaseAt} from './imasora-construction-soil-bed.mjs?v=120eo';
import {soilStartupPositionMatches} from './imasora-construction-soil-startup.mjs?v=120fw';
import {createFrameHeightSampler} from './imasora-construction-frame-height.mjs?v=120ey';
import {fieldWorkOverlaps,fieldGroundTravelAllowed,fieldGroundPose,fieldActorPose,fieldWorkGroundProblem,fieldGroundBounds} from './imasora-construction-field-contact.mjs?v=120fw';
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
import {actorPose,loaderDrivingInput,boardOption,exitOption} from './imasora-construction-loader-physics.js?v=120ey';
import {soilCopyOptions,soilCopySurface} from './imasora-construction-purchased-soil.js?v=120fw';
import {initialWorldSoil,SOIL_YARDS,SOIL_SITE_SOLIDS,enterWorldSoil,syncWorldSoil,worldSoilAction,advanceWorldSoil,worldSoilTotals,worldSoilSurface,worldSoilFloors,worldSoilContactGeometry,worldSoilMaterialObstacles} from './imasora-construction-world-soil.js?v=120fw';
import {constructionMaterialContactVolumes} from './imasora-construction-world-contact.js?v=521';
import {createWorldSoilModel,updateWorldSoilModel,SOIL_FENCES} from './imasora-construction-world-soil-model.js?v=120fw';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js?v=120ds';
import {soilSiteSolids,soilSiteBoxes} from './imasora-construction-purchased-soil.js?v=120fw';
import {soilCheckpoint} from './imasora-construction-world-soil.js?v=120fw';

export function createWorldSoilController({service,practice=false,preview=false,canResume=()=>true,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,readout,onRestoreRebuild}){
  const gait=createConstructionWalkGait();
  const orbit=createOrbitLook();let menuSaveNote='',restoreSession=null,savedWorkAwaitingResume=false,ending=false;
  const restoreLocked=()=>!!restoreSession?.locked;
  let work=null,root=null,contactGeometry=null,readFieldSolids=null,fieldHeightAt=null,active=false,busy=false,saving=false,pendingSave=null,lastAutomaticKey='',blocked=false,retryPending=false,expected=null,auto=0,ui=0,view=0,issue='',walk=0;
  let sourceHeightAt=null,fieldUpperBound=null,previewOptions=null;const heightCache=createFrameHeightSampler((x,z)=>typeof sourceHeightAt==='function'?sourceHeightAt(x,z):0);
  const localHeight=(x,z)=>typeof fieldHeightAt==='function'?fieldHeightAt(root.position.x+x,root.position.z+z):0,baseHeight=(x,z)=>heightCache.heightAt(root.position.x+x,root.position.z+z);
  baseHeight.upperBound=b=>fieldUpperBound?.({minX:b.minX+root.position.x,maxX:b.maxX+root.position.x,minZ:b.minZ+root.position.z,maxZ:b.maxZ+root.position.z});
  const held=new Map(),taps=new Map(),keys=new Set(),inert=new Map();
  const panel=document.createElement('section');panel.className='world-soil-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場の火星土ローダー');
  panel.innerHTML=`<header><strong>火星土ローダー</strong><span class="ws-mode"></span><button data-action="begin">土の作業を始める</button></header>
    <p class="ws-message" role="status"></p><div class="ws-stats"></div>
    <div class="ws-active" hidden><div class="ws-pad" aria-label="土ローダーの操作"><button data-hold="left">左へ</button><button data-hold="accelerate">前へ</button><button data-hold="right">右へ</button><button data-hold="reverse">後ろへ</button><button data-hold="brake">ブレーキ</button></div>
    <div class="ws-work"><button data-action="interact">運転席に乗る</button><button data-action="load">① 土を積む（4）</button><button data-action="lay">② 土を敷く</button><button data-action="recover">土を回収</button><button data-action="store">保管口へ戻す</button><button data-action="jump">ジャンプ</button></div>
    <div class="ws-surface"></div><footer><button data-action="camera">視点：追従</button><button data-action="save">土作業を保存</button><button data-action="leave">作業を終えて徒歩に戻る</button></footer></div>`;
  canvas.parentElement.append(panel);
  for(const type of ['pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  const button=a=>panel.querySelector(`[data-action="${a}"]`),message=panel.querySelector('.ws-message');
  const received=()=>practice?8000:service.constructionStock?.receipts.filter(e=>e.offerId==='mars-soil').reduce((n,e)=>n+e.amount,0)||0;
  let travelBoost=null;
  function clear(){travelBoost?.reset();held.clear();taps.clear();keys.clear();clearInput();panel.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  const game=createVehiclePlayView({panel,canvas,clearInput:clear,refresh,prefix:"ws",groups:[{"id":"move","label":"移動","selectors":[".ws-pad button","[data-action=\"jump\"]"],"hint":"WASD／矢印で移動。同方向を素早く2回で加速（離すと解除）。停車して土を扱います。"},{"id":"work","label":"土の作業","selectors":["[data-action=\"load\"]","[data-action=\"lay\"]","[data-action=\"recover\"]","[data-action=\"store\"]"]}],quick:["interact","camera"]});
  if(!practice&&!preview&&service.mode==='live'){
    restoreSession=new VehicleRestoreSession({service,kind:'soil',origin:globalThis.location?.origin,getWork:()=>work,getExpectedRevision:()=>expected,
      available:()=>{if(!active||state.map!=='construction')return 'この車両の作業を始めてから復元してください。';if(busy||saving||blocked)return '先に保存の結果を確認してください。';return '';},
      onChange:refresh,onRestored:saved=>{
        if(typeof onRestoreRebuild!=='function')throw Error('区画の再構築が接続されていません。');
        clear();game.pause();scene.add(character);work=structuredClone(saved);expected=saved.revision;auto=0;savedWorkAwaitingResume=true;retryPending=false;blocked=false;issue='';
        // Keep the input gate paused while rebuilding floors, edges and solids.
        const wasActive=active;active=false;
        try{onRestoreRebuild();if(!root)throw Error('復元した区画を安全に表示できません。');}
        finally{active=wasActive;}
        if(active)work={...work,work:{...work.work,paused:false}};
        orbit.reset();render(0);menuSaveNote='作業を復元しました。一時停止中です。';
      }});
    game.attachRestore(createVehicleRestoreView({menu:game.menu,session:restoreSession,isMenuOpen:()=>game.menuOpen,refresh}));
  }
  function owns(value){orbit.reset();if(value){for(const el of document.querySelectorAll('.world-toolbar,.control-card')){inert.set(el,el.inert);el.inert=true;}}else{for(const[el,was]of inert)el.inert=was;inert.clear();}canvas.parentElement.classList.toggle('world-soil-operating',value);game.setActive(value);}
  function fail(e){clear();blocked=true;retryPending=service.blocked;issue=`停止しました：${e.message||e}`;if(service.blocked)onError(e);refresh();}
  function resumeAvailable(){return !!root&&!active&&savedWorkAwaitingResume&&!practice&&!preview&&service.mode==='live'&&state.map==='construction'&&canResume()&&nativeSavedWorkPending(work);}
  function near(){if(!root||state.map!=='construction'||state.ufoBoarded||state.jumpY>0||state.falling)return false;const v=work.work.loader.vehicle;return Math.hypot(state.position.x-root.position.x-v.x,state.position.z-root.position.z-v.z)<=112;}
  function fresh(){const saved=service.readConstructionVehicleWork('soil');if(saved&&!practice){work=structuredClone(saved);expected=saved.revision;savedWorkAwaitingResume=!practice&&!preview&&service.mode==='live';}}
  function externalVolumes(){return root?[...(contactGeometry?constructionMaterialContactVolumes([root.position.x,root.position.z],contactGeometry()):[]),...(work.schema===2&&readFieldSolids?readFieldSolids(root.position):[])]:[];}
  function begin({automatic=false,viewIndex=0}={}){if((!automatic&&!near()&&!resumeAvailable())||!root||busy||saving||blocked||restoreLocked()||active)return false;clear();try{
    const resumeSaved=!practice&&!preview&&service.mode==='live'&&service.hasConstructionVehicleWork('soil');
    const resumed=resumeSaved?syncWorldSoil(work,received()):null;
    work=resumeSaved?{...resumed,revision:resumed.revision+1,work:{...resumed.work,paused:false}}:enterWorldSoil(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading},received());
    active=true;issue='';auto=0;owns(true);if(automatic){view=viewIndex;button('camera').textContent=['視点：追従','視点：横から','視点：区画全体'][view];menuSaveNote='保存した土の作業から始めたよ。';}else if(resumeSaved){savedWorkAwaitingResume=true;game.pause();menuSaveNote='保存した作業を一時停止で開きました。「再開」で続けられます。';}render(0);refresh();return true;
  }catch(e){issue=e.message;refresh();return false;}}
  async function save({automatic=false}={}){
    if(saving){if(automatic)return false;await pendingSave;if(blocked)return false;return save({automatic});}
    if(!work||busy||blocked||restoreLocked())return false;if(practice||service.mode==='readonly')return true;
    let draft,world,revision,key;try{draft=structuredClone(work);world=snapshot();revision=expected;key=constructionWorkAutoSaveKey(draft,view);}catch(e){fail(e);return false;}
    menuSaveNote='';saving=true;busy=!automatic;if(!automatic)clear();refresh();
    pendingSave=(async()=>{try{await service.flush();const saved=await service.saveConstructionSoil(draft,world,revision);expected=saved.revision;lastAutomaticKey=key;auto=0;menuSaveNote='作業を保存しました。';return true;}catch(e){fail(e);return false;}finally{busy=false;saving=false;pendingSave=null;refresh();}})();return pendingSave;
  }
  async function leave({force=false,then=null}={}){
    if(restoreLocked())return false;
    if(!active){then?.();return true;}if(busy||blocked||restoreLocked())return false;clear();const w=work.work;
    if(!force&&(w.loader.mode!=='foot'||w.task||!w.body.grounded)){issue='作業を終え、停車・降車・着地してから徒歩へ戻ってください。';refresh();return false;}
    render(0);ending=true;let saved;try{saved=await save();}finally{ending=false;}if(!saved)return false;
    work=soilCheckpoint(work);active=false;owns(false);scene.add(character);shadow.visible=true;
    const p=force?{x:-260,y:0,z:-190,heading:0}:(work.schema===2?fieldActorPose(w.loader,root.position,fieldHeightAt):actorPose(w.loader));state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.jumpCount=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;
    if(work.schema===2)onRestoreRebuild?.();onExit();refresh();then?.();return true;
  }
  async function action(a){if(a==='begin'){begin();return;}if(!active||busy||blocked||restoreLocked()||!game.allows(a))return;clear();issue='';
    if(a==='camera'){orbit.reset();view=(view+1)%3;button(a).textContent=['視点：追従','視点：横から','視点：区画全体'][view];return;}
    if(a==='leave'){await leave();return;}if(a==='save'){await save();return;}
    heightCache.reset();
    try{work=worldSoilAction(work,a,crypto.randomUUID(),received(),externalVolumes(),baseHeight);if(['load','lay','recover','store'].includes(a))await save();}catch(e){issue=e.message;}refresh();
  }
  travelBoost=bindTravelBoost({panel,enabled:()=>active&&!busy&&!blocked&&!restoreLocked()&&!game.paused&&!game.menuOpen,context:()=>work?.work?.loader.mode});
  panel.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>void action(b.dataset.action)));
  for(const b of panel.querySelectorAll('[data-hold]')){
    b.addEventListener('pointerdown',e=>{if(!active||busy||blocked||restoreLocked()||game.paused)return;e.preventDefault();held.set(e.pointerId,b.dataset.hold);taps.set(b.dataset.hold,work.work.time+.15);b.setPointerCapture(e.pointerId);b.classList.add('held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{held.delete(e.pointerId);b.classList.remove('held');});
    b.addEventListener('click',e=>{if(e.detail===0&&active&&!busy&&!blocked&&!restoreLocked()&&!game.paused)taps.set(b.dataset.hold,work.work.time+.15);});
  }
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  addEventListener('keydown',e=>{if(!active||e.target.closest?.('dialog[open]'))return;if(game.menuOpen){game.handleKeyDown(e);e.stopImmediatePropagation();return;}if(restoreLocked()){e.preventDefault();e.stopImmediatePropagation();return;}if(game.paused){if(codes.includes(e.code)||e.code==='KeyE'){if(e.code!=='Space'||!e.target.closest('button,summary,select'))e.preventDefault();e.stopImmediatePropagation();}return;}if(codes.includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!keys.has(e.code)&&!busy&&!blocked&&!restoreLocked())taps.set(e.code,work.work.time+.15);keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void action('interact');}},true);
  addEventListener('keyup',e=>{keys.delete(e.code);if(e.target.closest?.('dialog[open]'))return;if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  document.addEventListener('pointerdown',e=>{if(!constructionOverlayOpen()&&active&&!service.blocked&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  function input(){return travelBoost.input(rawInput());}
  function rawInput(){const actions=[...held.values()],pressed=[...keys];for(const[k,t]of taps)if(t>work.work.time)(codes.includes(k)?pressed:actions).push(k);
    if(work.work.loader.mode==='driving')return loaderDrivingInput(actions,pressed);
    const on=(a,...k)=>actions.includes(a)||k.some(x=>pressed.includes(x)),f=Number(on('accelerate','KeyW','ArrowUp'))-Number(on('reverse','KeyS','ArrowDown')),r=Number(on('right','KeyD','ArrowRight'))-Number(on('left','KeyA','ArrowLeft'));
    const angle=orbit.yaw(view===2?Math.PI+.15:work.work.loader.vehicle.heading+(view===1?Math.PI/2:Math.PI));return{x:r*Math.cos(angle)-f*Math.sin(angle),z:-r*Math.sin(angle)-f*Math.cos(angle),jump:pressed.includes('Space')};
  }
  function refresh(){if(!root){panel.hidden=!(active&&restoreLocked());if(!panel.hidden){message.textContent=restoreSession.message;game.refresh({busy:true,blocked:true,context:'stopped',loadText:'停止中',menuHint:restoreSession.message});}return;}
    const close=!!root&&state.map==='construction'&&(work.schema===2?near():Math.abs(state.position.x-root.position.x)<400&&Math.abs(state.position.z-root.position.z)<340);
    panel.hidden=!close&&!active&&!resumeAvailable();canvas.parentElement.classList.toggle('world-soil-near',!panel.hidden);if(panel.hidden)return;
    button('begin').hidden=active;button('begin').disabled=(!near()&&!resumeAvailable())||busy||blocked||restoreLocked();button('begin').textContent=resumeAvailable()?'保存した土の作業を再開':'作業を始める';panel.querySelector('.ws-active').hidden=!active;
    panel.querySelector('.ws-mode').textContent=practice?'貸出8ブロック・保存しません':service.mode==='readonly'?'表示確認・保存なし':service.mode==='integration'?'本体とは別の接続確認保存':'作業を保存できます';
    const w=work.work,l=w.loader,t=worldSoilTotals(work),a=soilCopyOptions(w,worldSoilMaterialObstacles(l,externalVolumes(),localHeight),baseHeight);
    previewOptions=a;
    panel.querySelector('.ws-stats').textContent=`保管 ${received()/1000-t.inUse/1000} ｜車載 ${t.bucket} ｜移送中 ${t.moving} ｜敷いた土 ${t.ground} ブロック`;
    message.textContent=blocked?issue:busy?'本体保存へ記録中…':issue|| (active?(a.workIssue||w.message):resumeAvailable()?'保存した作業の続きから再開できるよ。':near()?'ローダーに近づきました。土の作業を始められます。':`土作業区画 X ${root.position.x} / Z ${root.position.z}。車の左側へどうぞ。`);
    const off=busy||blocked||restoreLocked();for(const b of panel.querySelectorAll('.ws-active button'))b.disabled=off;
    const solids=soilSiteSolids(w).map(b=>({x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,width:b.maxX-b.minX,depth:b.maxZ-b.minZ})).concat(w.patches.map(p=>({...p,width:32,depth:32})),worldSoilMaterialObstacles(l,externalVolumes(),localHeight));
    button('interact').textContent=l.mode==='foot'?'乗る':l.mode==='driving'?'降りる':'乗降中…';button('interact').disabled=off||!!w.task||!!l.transition||!(l.mode==='foot'?w.body.grounded&&l.player.y===0&&boardOption(l,solids):exitOption(l,solids));
  setBoardPrompt(button('interact'),l.mode,!button('interact').disabled);
    for(const k of ['load','lay','recover','store'])button(k).disabled=off||!a[k];
    button('jump').disabled=off||!!w.task||l.mode!=='foot'||(!w.body.grounded&&(w.body.jumpCount??0)>=3);
    button('leave').disabled=off||!!w.task||l.mode!=='foot'||!w.body.grounded;
    button('save').disabled=off||practice||service.mode==='readonly';button('save').textContent=practice?'貸出：保存なし':'土作業を保存';
    panel.querySelector('.ws-surface').textContent=l.mode==='foot'?`足元：${soilCopySurface(w,l.player)==='mars'?'火星土（3倍ジャンプ）':'普通の土'} ｜上昇 ${w.body.flight?w.body.flight.peak.toFixed(2):'0.00'} ｜記録 普通 ${w.body.normal?.height.toFixed(2)??'—'} / 火星土 ${w.body.mars?.height.toFixed(2)??'—'}`:'緑の枠に敷けます。停車して作業してください。';
    game.refresh({busy:busy||restoreLocked(),blocked:blocked||!!restoreSession?.invalid,context:l.mode,loadText:'車載 '+t.bucket+' 個',menuHint:menuSaveNote});
  }
  function groundPose(){if(work?.schema!==2||!root)return null;try{return fieldGroundPose(work.work,root.position,fieldHeightAt);}catch{return null;}}
  function render(dt){if(!root)return;updateWorldSoilModel(root,work.work,active,active?worldSoilMaterialObstacles(work.work.loader,externalVolumes(),localHeight):[],groundPose(),baseHeight,previewOptions);if(!active)return;
    const w=work.work,l=w.loader,p=work.schema===2?fieldActorPose(l,root.position,fieldHeightAt):actorPose(l),d=root.userData;
    if(l.mode==='driving'){d.loader.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+p.x,p.y-d.loader.userData.measurement.footBottom,root.position.z+p.z);character.rotation.set(0,p.heading,0);}
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.heading=p.heading;state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;shadow.visible=false;
    const strides=gait.update(p,l.mode==='foot'&&w.body.grounded&&!busy&&!blocked&&!game.paused&&!document.hidden,dt);for(const[i,f]of(character.userData.walkRig?.feet||[]).entries())f.part.position.copy(f.basePosition).y+=strides[i%2];
    const target=view===2?new THREE.Vector3(root.position.x+(work.schema===2?p.x:0),18,root.position.z+(work.schema===2?p.z:0)):new THREE.Vector3(root.position.x+p.x,18+p.y*.25,root.position.z+p.z);
    const a=orbit.yaw(view===2?Math.PI+.15:l.vehicle.heading+(view===1?Math.PI/2:Math.PI)),pitch=orbit.pitch(view===2?1.1:.65),dist=(view===2?720:250)*Math.max(1,.72/camera.aspect);
    target.y=l.mode==='foot'?p.y+18:target.y+(groundPose()?.position[1]??0);camera.position.copy(target).addScaledVector(new THREE.Vector3(Math.sin(a)*Math.cos(pitch),Math.sin(pitch),Math.cos(a)*Math.cos(pitch)),dist);camera.lookAt(target);readout();
  }
  function install({group,blockedAt,collider,surface,ceiling,contactGeometry:readContactGeometry=null,fieldSolids=null,groundHeightAt=null,groundUpperBound=null}){
    if(active)throw Error('土作業中は区画を再構築できません。');previewOptions=null;if(root){root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});disposeSpaceMaterialBook(root);root=null;}panel.hidden=true;canvas.parentElement.classList.remove('world-soil-near');if(state.map!=='construction')return;
    contactGeometry=typeof readContactGeometry==='function'?readContactGeometry:null;readFieldSolids=fieldSolids;sourceHeightAt=groundHeightAt;fieldUpperBound=groundUpperBound;heightCache.reset();fieldHeightAt=(x,z)=>{let y=heightCache.heightAt(x,z);if(root&&work?.schema===2)for(const p of work.work.patches){const base=soilBedBaseAt(p,x-root.position.x,z-root.position.z);if(base!==null)y=Number.isFinite(y)?Math.max(y,base+2):base+2;}return y;};
    if(!work){fresh();if(!work){const site=SOIL_YARDS.findIndex(([x,z])=>!blockedAt(x,z,390));if(site<0)return;work=initialWorldSoil(site,received());}}
    const [x,z]=SOIL_YARDS[work.siteIndex];if(work.schema!==2&&blockedAt(x,z,390)){issue='土作業区画が保存済み建物と重なっています。建物を動かさず停止しました。';return;}
    root=createWorldSoilModel(work.work);root.position.set(x,0,z);group.add(root);
    for(const b of soilSiteSolids(work.work)){const cx=x+(b.minX+b.maxX)/2,cz=z+(b.minZ+b.maxZ)/2,size=[b.maxX-b.minX,b.maxZ-b.minZ];collider(cx,cz,size,0,'construction-soil-fixed',0,{minY:b.minY,maxY:b.maxY,obstacleHeight:b.maxY});if(b.minY>0)ceiling(cx,cz,size,0,b.minY,'construction-soil-ceiling');}
    for(const b of work.schema===2?[]:SOIL_FENCES)collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-soil-fence',0,{minY:0,maxY:b.height,obstacleHeight:b.height});
    const v=work.work.loader.vehicle,g=groundPose(),b=g?fieldGroundBounds(g):null;if(b)collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-soil-loader',0,{minY:b.minY,maxY:b.maxY,obstacleHeight:b.maxY});else collider(x+v.x,z+v.z,[88,90],v.heading,'construction-soil-loader',0,{minY:0,maxY:44,obstacleHeight:44});
    for(const f of worldSoilFloors(work))surface(f);render(0);refresh();
  }
  return {look(dx,dy,sensitivity){if(active&&!game.menuOpen&&!restoreLocked())orbit.drag(dx,dy,sensitivity);},get active(){return active;},get autoSaveKey(){return active?constructionWorkAutoSaveKey(work,view):null;},get busy(){return busy||saving||restoreLocked();},get dirty(){return !!work&&work.revision!==expected;},
    get resumePoint(){return active&&!ending?{kind:'soil',revision:work.revision,view}:null;},
    resumeSaved(point){if(!point||point.revision!==expected||work?.revision!==expected||!root||active||busy||blocked||restoreLocked()||practice||preview||service.mode!=='live'||state.map!=='construction'||!canResume()||!Number.isInteger(point.view)||point.view<0||point.view>2)return false;heightCache.reset();const p=work.schema===2?fieldActorPose(work.work.loader,root.position,fieldHeightAt):actorPose(work.work.loader);if(!soilStartupPositionMatches(point,{x:root.position.x+p.x,z:root.position.z+p.z}))return false;return begin({automatic:true,viewIndex:point.view});},
    install,save,autosave:()=>work&&!restoreLocked()?save({automatic:true}):false,leave,begin,get parkingSite(){return work?.siteIndex??null;},reloadSaved(){if(active||busy||saving)throw Error('作業を終えてから移設してください。');work=null;fresh();},
    overlapsBuild(p,size){return !!root&&(work.schema===2?fieldWorkOverlaps(root.position,p,size,[...soilSiteBoxes(work.work),{...work.work.loader.vehicle,width:88,depth:90},...work.work.patches.map(p=>({...p,width:32,depth:32}))]):overlapsWorldYardBuild([root.position.x,root.position.z],p,size));},
    contactGeometry(){return work?worldSoilContactGeometry(work):{floors:[],walls:[]};},
    jumpMultiplier(p){return state.map==='construction'&&work&&worldSoilSurface(work,p)==='mars'?Math.sqrt(3):1;},
    doorTarget(){return state.map==='construction'?nativeDoorTarget(work,root?.position,{busy:busy||blocked||restoreLocked(),active,groundHeightAt:fieldHeightAt}):null;},
    enterAtDoor(){
      const door=nativeDoorTarget(work,root?.position,{busy:busy||blocked||restoreLocked(),active,groundHeightAt:fieldHeightAt});
      if(!door||Math.hypot(state.position.x-door.x,state.position.z-door.z)>.6||state.jumpY||state.falling)return false;
      clear();
      try{
        work=enterWorldSoil(work,{x:state.position.x,y:work.schema===2?0:state.groundY,z:state.position.z,heading:door.heading},received());
        active=true;auto=0;savedWorkAwaitingResume=false;issue='';
        owns(true);render(0);refresh();return true;
      }catch(e){issue=e.message;refresh();return false;}
    },
    previewSpawn(){return preview&&root?{x:root.position.x-58,z:root.position.z-88,heading:0}:null;},
    update(dt){heightCache.reset();if(active&&restoreLocked()&&!root){refresh();return true;}if(state.map!=='construction'||!root)return false;
      if(!restoreLocked()&&blocked&&retryPending&&service.blocked===false){fresh();blocked=false;retryPending=false;issue='';if(active)work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      if(active&&!busy&&!blocked&&!restoreLocked()&&!game.paused&&!document.hidden){savedWorkAwaitingResume=false;menuSaveNote='';try{const mode=work.work.loader.mode;{const next=advanceWorldSoil(work,input(),dt,externalVolumes(),localHeight);if(work.schema===2&&!fieldGroundTravelAllowed(work.work,next.work,root.position,fieldHeightAt,externalVolumes())){const oldRig=work.work.loader??work.work.rig,newRig=next.work.loader??next.work.rig;newRig.vehicle={...oldRig.vehicle,speed:0};newRig.player={...oldRig.player};next.work.message='ここは急な坂や穴があるよ。ゆるやかな道を通ろう。';work=next;}else work=next;}if(work.work.loader.mode!==mode)clear();auto+=dt;}catch(e){fail(e);}}
      render(game.paused?0:dt);ui+=dt;if(ui>.15){ui=0;refresh();}
      if(active&&!game.menuOpen&&auto>8&&!saving&&constructionWorkAutoSaveKey(work,view)!==lastAutomaticKey&&!busy&&!blocked&&!restoreLocked()&&!practice&&service.mode!=='readonly'&&Math.abs(work.work.loader.vehicle.speed)<.01&&!held.size&&!keys.size)void save({automatic:true});return active;
    },
  };
}
