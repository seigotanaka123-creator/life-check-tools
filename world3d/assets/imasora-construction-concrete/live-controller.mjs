import {toolkitSummary,toolkitDetails} from '../imasora-construction-toolkit.mjs?v=120e';
import {holdDashButtonTemplate} from '../imasora-hold-dash.mjs?v=119bf';
import {createFreeBuildController} from './free-build-controller.mjs?v=120e';
import {createEmbeddedSiteView} from './site-view.mjs?v=119bf';
import {installWorkshopFence} from './workshop-fence.mjs';
import {constructionMovePadTemplate} from './move-pad.mjs?v=119bf';
import {onFinishedSurface} from './c2-3d-physics.mjs';
import {concreteLocation,nextFloorProblem,moveConcreteFloorProblem,concreteBuildOverlap,completedConcreteGeometry,MAX_CONCRETE_FLOORS} from './projects.mjs';
import {floorMask,floorPanels,floorPanelsProblem,partCount} from './floor-parts.mjs';
import {createFloorEditor} from './floor-editor.mjs';
import {createCompletedFloors} from './completed-floors.mjs';
import {createProfileSiteController} from '../imasora-construction-profile-site-controller.js';
import {LIVE_WORLD_DB} from '../imasora-world-save-service.js?v=120e';
import {availableMixCells,MIX_DURATION_MS,CURE_DURATION_MS} from './mixing.mjs';

// This controller uses only received materials in the world's existing save.
// Loan stock, test seeding and legacy C1/C2 databases have no entry here.
export function createLiveConcreteController({service,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onLayoutChange=()=>{},onError}){
 if(service.mode!=='live'||!service.excavationLive||service.store?.name!==LIVE_WORLD_DB)throw Error('通常の工事現場保存が必要です。');
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./world-site.css?v=120e',import.meta.url).href;document.head.append(style);
 const launcher=document.createElement('section');launcher.className='concrete-launcher';
 launcher.innerHTML='<h3>コンクリート工房</h3><p>建材受取所で受け取った材料を練り、型枠に流して床を作ります。</p><button data-action="entrance">工房の入口へ移動</button><button data-action="enter">工房に入る</button><p class="entry-status" role="status"></p>';
 launcher.insertAdjacentHTML('beforeend','<div data-completed-menu hidden><label>保存した作品 <select aria-label="保存したコンクリート床"></select></label><button data-action="visitfloor">完成した床へ移動</button></div>');
 document.querySelector('.control-card').prepend(launcher);
 const panel=document.createElement('section');panel.className='concrete-controls';panel.hidden=true;panel.setAttribute('aria-label','コンクリート手作業');
 panel.innerHTML=`<header><strong>コンクリート工房</strong><button data-action="pause">一時停止</button><button data-action="leave">工房を出る</button></header>
 <p class="concrete-stats"></p><p class="concrete-message" role="status"></p>
 <div class="concrete-scroll"><div class="concrete-tools" aria-label="道具"><button data-tool="hands">手</button><button data-tool="hammer">木槌</button><button data-tool="bucket">バケツ</button><button data-tool="trowel">長柄コテ</button></div>
 <div class="concrete-routes"><button data-action="site">型枠へ歩く</button><button data-action="stock">ミキサーへ歩く</button><button data-action="floor" hidden>完成した床へ歩く</button><button data-action="stop">歩行を止める</button></div>
 <div class="concrete-mix"><p data-mix-stock></p><label>一度に練る量 <select data-mix-amount aria-label="一度に練る量"><option value="1">1杯</option><option value="4" selected>4杯</option><option value="8">8杯</option></select></label><button data-action="mix">材料を練る</button><p data-mix-progress role="status"></p></div>
 <div class="concrete-actions"><button data-action="frame">型枠を組む（8枚）</button><button data-action="load">生コンを汲む（1杯）</button><button data-action="pour">型枠へ流す（1杯）</button><button data-action="finish">全面を仕上げる</button><button data-action="cure">硬化を始める（30秒）</button><button data-action="demold">型枠を外す</button><button data-action="cancel">作業を中止する</button></div>
 <button data-action="nextfloor" hidden>次の施工場所を選ぶ</button><p data-floor-limit hidden>現在の保存上限は床16枚です。完成作品はそのまま残ります。</p>
 <section class="concrete-planner" hidden aria-label="次の施工場所"><p>小さい枠が床、大きい枠が作業区画です。緑の場所に施工できます。今の床は残ります。</p><div><button data-shift="west">西へ</button><button data-shift="north">北へ</button><button data-shift="south">南へ</button><button data-shift="east">東へ</button></div><label>東西 <input type="number" data-place="x" aria-label="施工場所の東西" min="-2500" max="2500" step="1"></label><label>南北 <input type="number" data-place="z" aria-label="施工場所の南北" min="-1600" max="1600" step="1"></label><p data-placement-status role="status"></p><button data-action="placefloor">この場所で次の床を作る</button><button data-action="cancelplace">場所選びをやめる</button></section>
 <div class="concrete-travel" aria-label="徒歩操作">${constructionMovePadTemplate()}</div>
 <details data-toolkit><summary>道具箱</summary><p data-toolkit-summary></p><p data-toolkit-detail style="white-space:pre-line"></p></details>
 <details data-menu><summary>保存・片付け</summary><button data-action="save">現場を保存</button><button data-action="editfloor" hidden>完成床の部分撤去・復元・塗装</button><button data-action="movefloor" hidden>選択した完成床を移設</button><button data-action="return">バケツの生コンを戻す</button><button data-action="recover">固める前の生コンを回収</button><button data-action="unframe">空の型枠を片付ける</button><button data-action="cancelmix">混練を取り消して原料へ戻す</button><button data-action="retry">保存結果を再確認</button><p>一時停止中・画面を閉じている間は混練と硬化が止まります。工程と材料は自動保存されます。</p></details>
 <section class="concrete-confirm" hidden role="alertdialog" aria-label="片付けの確認"><p></p><button data-action="confirm">確認して実行</button><button data-action="dismiss">戻る</button></section></div>
 <footer><label data-camera-label>視点 <select data-camera aria-label="施工の視点"><option value="overview">施工全体</option><option value="eye">モンスターの目線</option><option value="above">モンスターの上から</option></select></label><button data-action="camera">向きを戻す</button><span class="concrete-walk-record"></span></footer>`;
 panel.insertAdjacentHTML('beforeend',holdDashButtonTemplate());
 canvas.parentElement.append(panel);panel.addEventListener('pointerdown',e=>e.stopPropagation());
 let active=false,busy=false,clockSaving=false,installed=false,paused=false,issue='',tool='hands',moving=false,work=null,note='',uiElapsed=0,confirmation=null;
 let cachedProject=null,cachedLedger=null,mixId=null,cureId=null,mixMs=0,cureMs=0;
 const inert=new Map(),button=id=>panel.querySelector(`[data-action="${id}"]`);
 panel.querySelector('footer').append(button('placefloor'),button('cancelplace'));
 const project=()=>{if(cachedLedger!==service.ledger){cachedProject=service.constructionConcreteProject;cachedLedger=service.ledger;}return cachedProject;};
 const origin={...concreteLocation(project())},completed=createCompletedFloors(scene);let planning=null,checkBlocked=()=>true,layoutKey=JSON.stringify([origin,project().completedFloors??[]]),completedMenuKey='';
 const entry=()=>state.map==='construction'&&!state.ufoBoarded&&Math.abs(state.groundY+state.jumpY)<.5&&Math.hypot(state.position.x-origin.x-32,state.position.z-origin.z-125)<45;
 const canMove=()=>active&&!paused&&!busy&&!clockSaving&&!service.blocked&&!controller.pending&&!confirmation&&!planning;
 const view=createEmbeddedSiteView({hostScene:scene,hostCamera:camera,model:character,offset:origin,controls:panel,canMove,onNotice:text=>{note=text;},onMove:info=>{moving=info.moving;work=info.work;panel.querySelector('.concrete-walk-record').textContent=onFinishedSurface(info.collider,info.actor)?'完成した床に乗っています':'';}});
 const controller=createProfileSiteController({view,service});
 const floorEditor=createFloorEditor({panel,getPlanning:()=>planning,getProject:project,getLedger:()=>service.constructionPackTrialStock,changed:refresh,ask});
 function ownInput(owns){
  clearInput();for(const element of document.querySelectorAll('.world-toolbar,.control-card')){if(owns){inert.set(element,element.inert);element.inert=true;}else if(inert.has(element))element.inert=inert.get(element);}
  if(!owns)inert.clear();document.body.classList.toggle('world-concrete-playing',owns);canvas.parentElement.classList.toggle('world-concrete-operating',owns);panel.hidden=!owns;shadow.visible=!owns;
 }
 function alignClocks(p){
  const nextMix=p.mixer?.pending?.id??null,nextCure=p.site.stage==='curing'?p.site.appliedOperations.findLast(op=>op.type==='START_CURE')?.operationId:null;
  if(nextMix!==mixId){mixId=nextMix;mixMs=0;}if(nextCure!==cureId){cureId=nextCure;cureMs=0;}
 }
 function sync(){const p=project();alignClocks(p);view.sync(p.site);refresh();}
 function alignLayout(p){
  completed.sync(p);const location=concreteLocation(p),key=JSON.stringify([location,p.completedFloors??[]]);if(key===layoutKey)return;layoutKey=key;
  if(active){view.exit();active=false;ownInput(false);}planning=null;completed.showPreview(null);view.setPlacementPreview(null);view.setOrigin(location);placeAtEntrance();moving=false;
  onLayoutChange();onExit();
 }
 function placementProblem(position){
  const p=project(),mode=planning?.mode;
  if(mode==='edit'||mode==='move'){
   const f=p.completedFloors[planning.floorIndex];if(!f)return '完成床を選んでください。';
   const mask=mode==='edit'?planning.mask:floorMask(f);
   const problem=mode==='move'?moveConcreteFloorProblem({...p,schemaVersion:5},planning.floorIndex,position):floorPanelsProblem(p,planning.floorIndex,position,mask);
   if(problem)return problem;
   const changedMask=mode==='edit'?mask&~floorMask(f):mask;
   return floorPanels({...position,panelMask:changedMask}).some(part=>checkBlocked(part.x,part.z,10))?'建物・車両区画と重なります。別の場所を選んでください。':'';
  }
  return nextFloorProblem(p,position)||(checkBlocked(position.x,position.z,165)?'建物・車両区画と重なります。別の場所を選んでください。':'');
 }
 function updatePlanner(){
  panel.classList.toggle('concrete-planning',!!planning);panel.querySelector('.concrete-planner').hidden=!planning;
  button('placefloor').hidden=button('cancelplace').hidden=!planning;button('camera').hidden=!!planning;
  const editing=planning?.mode==='edit',movingFloor=planning?.mode==='move';
  panel.querySelector('.concrete-planner>p').textContent=editing?`${planning.floorIndex+1}枚目の床の形・塗装`:movingFloor?'完成床を移設します。接続先を選ぶと辺同士を合わせられます。':'小さい枠が床、大きい枠が作業区画です。緑の場所に施工できます。今の床は残ります。';
  view.setPlacementPreview(planning&&Number.isFinite(planning.x)&&Number.isFinite(planning.z)?{...planning,allowed:!placementProblem(planning)}:null);
  completed.showPreview(editing?{...project().completedFloors[planning.floorIndex],...planning,panelMask:planning.mask}:null);
  const ready=!busy&&!clockSaving&&!service.blocked&&!controller.pending&&!confirmation&&!paused;
  floorEditor.update(ready);if(!planning)return;
  const problem=placementProblem(planning),unchanged=editing&&planning.mask===floorMask(project().completedFloors[planning.floorIndex]);
  panel.querySelector('[data-placement-status]').textContent=problem||(unchanged?'置く部分を変更するか、上面を塗れます。':'確定するまでは保存を変えません。');
  button('placefloor').textContent=editing?'部分の配置を確認する':movingFloor?'この位置へ移設する':'この場所で次の床を作る';
  button('placefloor').disabled=!ready||!!problem||unchanged;button('cancelplace').disabled=!ready;
  for(const b of panel.querySelectorAll('[data-shift],[data-place]'))b.disabled=!ready;
 }
 function refresh(){
  if(panel.querySelector('[data-toolkit]').open){const toolkit=service.constructionToolkit;panel.querySelector('[data-toolkit-summary]').textContent=toolkitSummary(toolkit);panel.querySelector('[data-toolkit-detail]').textContent=toolkitDetails(toolkit);}
  view.syncTravelControls();
  const p=project(),s=p.site;alignClocks(p);alignLayout(p);
  launcher.hidden=state.map!=='construction';launcher.querySelector('[data-action="enter"]').disabled=active||busy||!installed||!entry()||service.blocked;
  launcher.querySelector('[data-action="entrance"]').disabled=active||busy||!installed||state.ufoBoarded||service.blocked;
  launcher.querySelector('.entry-status').textContent=issue||(!installed?'区画を確認中です。':entry()?'入口です。「工房に入る」で始めます。':`「工房の入口へ移動」で現在の施工場所へ行けます。完成作品 ${(p.completedFloors?.length??0)+(s.stage==='demolded'?1:0)}枚。`);
  const savedFloors=p.completedFloors??[],menu=launcher.querySelector('[data-completed-menu]'),menuKey=JSON.stringify(savedFloors);menu.hidden=!savedFloors.length;
  if(completedMenuKey!==menuKey){completedMenuKey=menuKey;const select=menu.querySelector('select'),selected=select.value;select.replaceChildren(...savedFloors.map((f,i)=>new Option(`${i+1}枚目の床（配置${partCount(floorMask(f))}／保管${4-partCount(floorMask(f))}）`,String(i))));if(selected!==''&&savedFloors[Number(selected)])select.value=selected;}
  for(const c of menu.querySelectorAll('select,button'))c.disabled=active||busy||state.ufoBoarded||service.blocked;
  if(controller.pending&&!service.blocked&&!service.jobs.length&&p.operations.some(op=>op.operationId===controller.pending.action.operationId))controller.clearPendingAfterReload();
  const actor=view.getActor(),atWork=actor.grounded&&Math.hypot(actor.x-27.5,actor.z)<1,atEither=actor.grounded&&Math.hypot(Math.abs(actor.x)-27.5,actor.z)<1,atStock=actor.grounded&&Math.hypot(actor.x-54,actor.z-31)<.8;
  const idle=active&&!busy&&!clockSaving&&!moving&&!service.blocked&&!controller.pending&&!confirmation&&!planning,can=idle&&!paused;
  const show=(id,visible,enabled=true)=>{button(id).hidden=!visible;button(id).disabled=!(can&&enabled);};
  show('frame',s.stage==='unframed',tool==='hammer'&&atWork);show('load',['framed','pouring'].includes(s.stage)&&!s.bucketCells&&s.pouredCells<4,tool==='bucket'&&atStock&&s.availableConcreteCells>0);
  show('pour',s.bucketCells===1,tool==='bucket'&&atWork);show('finish',s.stage==='pouring'&&s.pouredCells===4,tool==='trowel'&&atWork);show('cure',s.stage==='finished',atEither);show('demold',s.stage==='cured',atEither);show('floor',s.stage==='demolded');
  show('nextfloor',s.stage==='demolded',!p.mixer?.pending&&(p.completedFloors?.length??0)+1<MAX_CONCRETE_FLOORS);
  button('editfloor').hidden=!(savedFloors.length&&active);button('editfloor').disabled=!can;
  button('movefloor').hidden=!(savedFloors.length&&active);button('movefloor').disabled=!can||!Number.isInteger(Number(launcher.querySelector('[data-completed-menu] select').value));
  panel.querySelector('[data-floor-limit]').hidden=s.stage!=='demolded'||(p.completedFloors?.length??0)+1<MAX_CONCRETE_FLOORS;
  for(const id of ['site','stock'])button(id).disabled=!can;
  for(const id of ['save','leave'])button(id).disabled=!idle;
  button('pause').disabled=!active||busy||clockSaving||!!confirmation||!!planning;button('pause').textContent=paused?'作業を再開':'一時停止';
  button('stop').disabled=!active||!moving;button('cancel').hidden=!view.working;button('cancel').disabled=!view.working;
  button('retry').hidden=!service.blocked;button('retry').disabled=busy||clockSaving;
  show('return',s.bucketCells>0,atStock);show('recover',['pouring','finished'].includes(s.stage),atEither);show('unframe',s.stage==='framed'&&!s.bucketCells,atEither);show('cancelmix',!!p.mixer?.pending);
  const ingredients=p.mixer?availableMixCells(p.mixer):0,amount=Number(panel.querySelector('[data-mix-amount]').value);
  button('mix').disabled=!can||!atStock||!!p.mixer?.pending||ingredients<amount;
  panel.querySelector('[data-mix-amount]').disabled=!can||!!p.mixer?.pending;
  panel.querySelector('[data-mix-stock]').textContent=`セメント・砂・砂利・水：あと${ingredients}杯分`;
  panel.querySelector('[data-mix-progress]').textContent=p.mixer?.pending?`混練中 ${p.mixer.pending.cells}杯 · あと${Math.max(0,Math.ceil((MIX_DURATION_MS-p.mixer.pending.elapsedMs-mixMs)/1000))}秒${paused?'（一時停止）':''}`:ingredients?'ミキサーの前で練る量を選べます。':'材料は建材受取所から工房へ移せます。';
  for(const b of panel.querySelectorAll('[data-tool]')){b.disabled=!can;b.setAttribute('aria-pressed',String(tool===b.dataset.tool));}
  const cameraSelect=panel.querySelector('[data-camera]');cameraSelect.disabled=busy||clockSaving||view.working||!!confirmation||!!planning;cameraSelect.parentElement.hidden=!!planning;button('camera').disabled=cameraSelect.disabled;
  const label={unframed:'型枠を組む',framed:'生コンを運ぶ',pouring:s.pouredCells===4?'コテで仕上げる':'生コンを流す',finished:'硬化を始める',curing:`硬化中 · あと${Math.max(0,Math.ceil((CURE_DURATION_MS-(p.cureElapsedMs??0)-cureMs)/1000))}秒`,cured:'型枠を外す',demolded:'床が完成'}[s.stage];
  panel.querySelector('.concrete-stats').textContent=`${label}｜生コン ${s.availableConcreteCells}杯・バケツ ${s.bucketCells}杯・床 ${s.pouredCells}/4杯${paused?'｜一時停止中':''}`;
  panel.querySelector('.concrete-message').textContent=work?`${work.phase} (${work.step}/${work.total})`:note||'道具を選び、型枠や材料へ歩いて作業します。';
  const confirmPanel=panel.querySelector('.concrete-confirm');confirmPanel.hidden=!confirmation;if(confirmation)confirmPanel.querySelector('p').textContent=confirmation.message;
  view.setMixing?.(!!p.mixer?.pending&&!paused&&!document.hidden);
  updatePlanner();
 }
 async function run(type,extra={},background=false){
  if(!active||busy||clockSaving||service.blocked||controller.pending)return false;
  if(background)clockSaving=true;else{busy=true;view.cancel();}
  refresh();try{await controller.run(type,extra);if(!background)note='工程と材料を保存しました。';return true;}
  catch(error){note=error.message==='ACTION_CANCELLED'?'作業を中止しました。材料は変わっていません。':error.message;if(service.blocked){planning=null;view.setPlacementPreview(null);paused=true;onError(error);}return false;}
  finally{busy=false;clockSaving=false;work=null;sync();}
 }
 async function flushClocks(all=false){
  if(!active||busy||clockSaving||service.blocked||controller.pending)return false;
  let p=project();alignClocks(p);
  if(p.site.stage==='curing'&&p.cureElapsedMs==null){if(!await run('ADOPT_ACTIVE_CURE',{},true))return false;p=project();}
  if(p.mixer?.pending&&mixMs>0&&(all||mixMs>=1000||mixMs>=MIX_DURATION_MS-p.mixer.pending.elapsedMs)){
   const elapsedMs=Math.min(Math.floor(mixMs),MIX_DURATION_MS-p.mixer.pending.elapsedMs);if(elapsedMs>0){mixMs-=elapsedMs;if(!await run('ADVANCE_MIX',{mixId:p.mixer.pending.id,elapsedMs},true))return false;}
  }
  p=project();if(p.site.stage==='curing'&&p.cureElapsedMs!=null&&cureMs>0&&(all||cureMs>=1000||cureMs>=CURE_DURATION_MS-p.cureElapsedMs)){
   const elapsedMs=Math.min(Math.floor(cureMs),CURE_DURATION_MS-p.cureElapsedMs);if(elapsedMs>0){cureMs-=elapsedMs;if(!await run('ADVANCE_ACTIVE_CURE',{elapsedMs},true))return false;}
  }
  return true;
 }
 async function save(){
  if(busy||clockSaving||view.working||service.blocked)return false;view.cancel();
  if(active&&!await flushClocks(true))return false;
  busy=true;refresh();try{await service.saveWorld(snapshot());note='工程・材料・残り時間を保存しました。';return true;}
  catch(error){note=error.message;onError(error);return false;}finally{busy=false;refresh();}
 }
 async function enter(){if(active||busy||!installed||!entry()||service.blocked)return;clearInput();if(!await save())return;active=true;paused=false;note='材料を練り、型枠へ運んで床を作りましょう。';view.sync(project().site);view.enter();ownInput(true);sync();}
 async function leave({then=null}={}){
  if(!active){then?.();return true;}if(busy||clockSaving||view.working||service.blocked){note='作業を中止するか、保存結果を確認してから退出してください。';refresh();return false;}
  if(!await save())return false;view.exit();active=false;planning=null;confirmation=null;completed.showPreview(null);view.setPlacementPreview(null);ownInput(false);placeAtEntrance();onExit();refresh();then?.();return true;
 }
 function placeAtEntrance(){state.position.set(origin.x+32,0,origin.z+125);state.groundY=0;state.jumpY=0;state.jumpVelocity=0;state.falling=false;state.supportSurfaceId=null;}
 async function toEntrance(){if(active||busy||!installed||state.map!=='construction'||state.ufoBoarded||service.blocked)return;clearInput();if(!await save())return;placeAtEntrance();state.heading=state.viewHeading=Math.PI;state.viewPitch=.1;state.cameraMode='third';onExit();await save();refresh();}
 async function visitFloor(){
  if(active||busy||state.map!=='construction'||state.ufoBoarded||service.blocked)return;
  const index=Number(launcher.querySelector('[data-completed-menu] select').value),f=project().completedFloors?.[index];if(!f)return;
  clearInput();if(!await save())return;const surface=completedConcreteGeometry(project()).find(g=>g.id.startsWith(`construction-concrete-${index+1}-`)&&g.id.endsWith('-floor'));state.position.set(surface?.x??f.x,0,surface?.z??f.z);state.groundY=surface?.height??0;state.jumpY=0;state.jumpVelocity=0;state.falling=false;state.supportSurfaceId=surface?.id??null;state.cameraMode='third';state.viewPitch=.1;onExit();await save();refresh();
 }
 function install({blockedAt,travelBlockedAt,collider,surface,supportHeightAt,placementHeightAt}){
  free.install({blockedAt,travelBlockedAt,collider,surface,supportHeightAt,placementHeightAt});checkBlocked=blockedAt;view.root.visible=completed.root.visible=state.map==='construction';if(!view.root.visible){installed=false;planning=null;completed.showPreview(null);view.setPlacementPreview(null);refresh();return;}
  completed.install(project(),surface);
  if(blockedAt(origin.x,origin.z,165)){installed=false;view.root.visible=false;issue='既存の建物と工房が重なるため、入口を保留しています。';refresh();return;}
  issue='';installed=true;collider(origin.x,origin.z,[212,212],0,'concrete-worksite-reserved',0,{buildingId:'concrete-worksite-reserved'});installWorkshopFence(origin,collider);sync();
 }
 function planNext(){
  view.cancel();moving=false;const p=project(),loc=concreteLocation(p),candidates=[[320,0],[-320,0],[0,-320],[0,320],[640,0],[-640,0]];planning={mode:'next'};
  planning=candidates.map(([x,z])=>({mode:'next',x:loc.x+x,z:loc.z+z})).find(pos=>!placementProblem(pos))??{mode:'next',x:loc.x+320,z:loc.z};
  for(const axis of ['x','z'])panel.querySelector(`[data-place="${axis}"]`).value=planning[axis];refresh();
 }
 function planMoveFloor(){
  view.cancel();moving=false;const floorIndex=Number(launcher.querySelector('[data-completed-menu] select').value),floor=project().completedFloors?.[floorIndex];if(!floor){note='移設する完成床を選んでください。';refresh();return;}
  const candidates=[[320,0],[-320,0],[0,-320],[0,320],[640,0],[-640,0]];planning={mode:'move',floorIndex};
  planning=candidates.map(([x,z])=>({mode:'move',floorIndex,x:floor.x+x,z:floor.z+z})).find(pos=>!placementProblem(pos))??{mode:'move',floorIndex,x:floor.x+320,z:floor.z};
  for(const axis of ['x','z'])panel.querySelector(`[data-place="${axis}"]`).value=planning[axis];refresh();
 }
 function planEditFloor(){
  view.cancel();moving=false;const floorIndex=Number(launcher.querySelector('[data-completed-menu] select').value),f=project().completedFloors?.[floorIndex];if(!f)return;
  planning={mode:'edit',floorIndex,x:f.x,z:f.z,mask:floorMask(f)};refresh();
 }
 function ask(type,message,extra={}){view.cancel();confirmation={type,message,extra};refresh();button('confirm').focus();}
 async function pause(){if(busy||clockSaving)return;if(!paused){view.cancel();paused=true;await flushClocks(true);}else paused=false;refresh();}
 const handlers={enter,entrance:toEntrance,visitfloor:visitFloor,leave:()=>leave(),save,pause,site:()=>view.walkTo('site'),stock:()=>view.walkTo('stock'),floor:()=>view.walkTo('floor'),stop:()=>view.cancel(),cancel:()=>view.cancelAction(),camera:()=>view.resetCamera(),
  nextfloor:planNext,movefloor:planMoveFloor,editfloor:planEditFloor,cancelplace:()=>{planning=null;view.setPlacementPreview(null);refresh();},placefloor:()=>{const problem=placementProblem(planning);if(problem){note=problem;refresh();return;}if(planning.mode==='edit'){ask('SET_FLOOR_PANELS',`${planning.floorIndex+1}枚目の床を配置${partCount(planning.mask)}部分・保管${4-partCount(planning.mask)}部分にします。床の材料と塗装は保持します。`,{floorIndex:planning.floorIndex,mask:planning.mask});}else if(planning.mode==='move'){const from=project().completedFloors[planning.floorIndex];ask('MOVE_COMPLETED_FLOOR',`${planning.floorIndex+1}枚目の完成床を、${from.x}／${from.z} から ${planning.x}／${planning.z} へ移設します。材料とほかの保存内容は変わりません。`,{...planning});}else ask('START_NEXT_FLOOR','完成した床をその場に残し、この場所へ工房と残りの材料を移します。新しい床には4杯分の生コンが必要です。',{...planning});},
  mix:()=>run('START_MIX',{cells:Number(panel.querySelector('[data-mix-amount]').value)}),frame:()=>run('PLACE_FORMWORK'),load:()=>run('LOAD_BUCKET',{cells:1}),pour:()=>run('POUR',{cells:1}),finish:()=>run('FINISH_SURFACE'),cure:()=>run('START_ACTIVE_CURE'),demold:()=>run('DEMOLD'),
  return:()=>ask('RETURN_BUCKET','バケツの生コンを材料槽へ戻します。'),recover:()=>ask('RECOVER_WET',`型枠内の${project().site.pouredCells}杯とバケツの生コンを回収します。型枠は残ります。`),unframe:()=>ask('CANCEL_FORMWORK','空の型枠8枚を片付けます。材料は減りません。'),
  cancelmix:()=>ask('CANCEL_MIX','混練を取り消し、予約中のセメント・砂・砂利・水をすべて戻します。',{mixId:project().mixer.pending.id}),dismiss:()=>{confirmation=null;refresh();},confirm:()=>{const c=confirmation;confirmation=null;if(c?.type==='SET_FLOOR_PANELS'){const f=project().completedFloors[c.extra.floorIndex],savedPlanning=planning;planning={mode:'edit',...c.extra,...f,mask:c.extra.mask};const problem=placementProblem(planning);planning=savedPlanning;if(problem){note=problem;refresh();return;}}if(['START_NEXT_FLOOR','MOVE_COMPLETED_FLOOR'].includes(c?.type)){const target={...c.extra,mode:c.type==='MOVE_COMPLETED_FLOOR'?'move':'next'},savedPlanning=planning;planning=target;const problem=placementProblem(target);planning=savedPlanning;if(problem){note=problem;refresh();return;}}if(c){const{mode,...payload}=c.extra??{};void run(c.type,payload);}},
  retry:async()=>{try{if(controller.pending)await controller.retry();else await service.retry();note='保存結果を確認しました。「作業を再開」で続けられます。';sync();}catch(error){onError(error);}}
 };
 for(const root of [panel,launcher])for(const b of root.querySelectorAll('[data-action]'))b.onclick=()=>void handlers[b.dataset.action]();
 for(const b of panel.querySelectorAll('[data-tool]'))b.onclick=()=>{tool=b.dataset.tool;view.setTool(tool);refresh();};
 panel.querySelector('[data-mix-amount]').onchange=refresh;
 panel.querySelector('[data-camera]').onchange=e=>{view.cancel();view.setCameraMode(e.target.value);};
 for(const input of panel.querySelectorAll('[data-place]'))input.oninput=()=>{if(planning){planning[input.dataset.place]=input.value===''?NaN:Number(input.value);updatePlanner();}};
 const shifts={west:[-64,0],east:[64,0],north:[0,-64],south:[0,64]};
 for(const b of panel.querySelectorAll('[data-shift]'))b.onclick=()=>{if(!planning)return;const [x,z]=shifts[b.dataset.shift];planning={...planning,x:(Number.isFinite(planning.x)?planning.x:origin.x)+x,z:(Number.isFinite(planning.z)?planning.z:origin.z)+z};for(const axis of ['x','z'])panel.querySelector(`[data-place="${axis}"]`).value=planning[axis];updatePlanner();};
 const suspend=()=>{confirmation=null;planning=null;view.setPlacementPreview(null);view.cancel();clearInput();if(active){paused=true;if(view.working)view.cancelAction();void flushClocks(true);refresh();}};
 window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',suspend);
 sync();
 const free=createFreeBuildController({service,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onLayoutChange,onError,launcher,canEnter:()=>!active&&!busy&&!clockSaving&&!service.blocked});
 return{get active(){return active||free.active;},leave:(...args)=>free.active?free.leave(...args):leave(...args),save:()=>free.active?free.save():save(),toEntrance,install,contactGeometry:()=>({floors:completedConcreteGeometry(project()),walls:free.contactGeometry().walls}),overlapsVehicle:(p,size)=>state.map==='construction'&&free.overlapsVehicle(p,size),overlapsBuild:(p,size)=>state.map==='construction'&&concreteBuildOverlap(project(),p,size),handleKey:e=>free.active?free.handleKey(e):view.handleKey(e),look:(...args)=>free.active?free.look(...args):view.look(...args),update(delta){
  if(free.update(delta))return true;
  if(active&&!paused&&!document.hidden){view.tick(delta);if(!busy&&!clockSaving&&!service.blocked&&!controller.pending&&!confirmation){const p=project(),dt=Math.max(0,Math.min(.05,delta))*1000;if(p.mixer?.pending)mixMs=Math.min(MIX_DURATION_MS-p.mixer.pending.elapsedMs,mixMs+dt);if(p.site.stage==='curing'&&p.cureElapsedMs!=null)cureMs=Math.min(CURE_DURATION_MS-p.cureElapsedMs,cureMs+dt);void flushClocks();}}
  uiElapsed+=delta;if(uiElapsed>.12){uiElapsed=0;refresh();}return active;
 }};
}
