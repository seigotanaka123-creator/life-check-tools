import {holdDashButtonTemplate} from '../imasora-hold-dash.mjs?v=119bf';
import {createEmbeddedSiteView} from './site-view.mjs?v=119bf';
import {constructionMovePadTemplate} from './move-pad.mjs?v=119bf';
import {CONCRETE_SITE,concreteEntryAllowed,concreteSiteOverlap} from './world-contract.mjs';
import {createProfileSiteController} from '../imasora-construction-profile-site-controller.js?v=113';
import {CONSTRUCTION_PROFILE_PROJECT_TEST_DB,LIVE_WORLD_DB} from '../imasora-world-save-service.js?v=532';

export function createWorldConcreteController({service,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,profileAuthorityCheck=false}){
 const fixture=service.constructionProjectPreview&&service.mode==='integration'&&service.store?.name===CONSTRUCTION_PROFILE_PROJECT_TEST_DB;
 const liveAuthority=profileAuthorityCheck&&service.mode==='live'&&service.excavationLive&&service.store?.name===LIVE_WORLD_DB;
 if(!fixture&&!liveAuthority)throw Error('施工確認には明示された専用プロフィールが必要です。');
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./world-site.css?v=119bf',import.meta.url).href;document.head.append(style);
 const launcher=document.createElement('section');launcher.className='concrete-launcher';launcher.innerHTML=`<h3>手作業のコンクリート施工</h3><p>${liveAuthority?'localhost:8925 専用のプロフィール保存接続確認です。ゲーム本番の保存先とは別です。':'本体マップの接続試験です。通常の保存・所持素材とは別です。'}</p><button data-action="entrance">区画の入口へ（確認用）</button><button data-action="enter">施工区画に入る</button><p class="entry-status" role="status"></p>`;
 document.querySelector('.control-card').prepend(launcher);
 const panel=document.createElement('section');panel.className='concrete-controls';panel.hidden=true;panel.setAttribute('aria-label','コンクリート手作業');
 panel.innerHTML=`<header><strong>コンクリート施工</strong><button data-action="leave">区画を出る</button></header><p class="concrete-stats"></p><p class="concrete-message" role="status"></p>
 <div class="concrete-scroll"><div class="concrete-tools" aria-label="道具"><button data-tool="hands">手</button><button data-tool="hammer">木槌</button><button data-tool="bucket">バケツ</button><button data-tool="trowel">長柄コテ</button></div>
 <div class="concrete-routes"><button data-action="site">型枠へ歩く</button><button data-action="stock">材料へ歩く</button><button data-action="floor" hidden>完成した床へ歩く</button><button data-action="stop">歩行を止める</button></div>
 <div class="concrete-actions"><button data-action="frame">型枠を組む（8枚）</button><button data-action="load">生コンを汲む（1杯）</button><button data-action="pour">型枠へ流す（1杯）</button><button data-action="finish">全面を仕上げる</button><button data-action="cure">硬化を始める（30秒）</button><button data-action="demold">型枠を外す</button><button data-action="cancel">作業を中止する</button></div>
 <div class="concrete-travel" aria-label="徒歩操作">${constructionMovePadTemplate()}</div>
 <details><summary>施工メニュー</summary><button data-action="save">現場を保存</button><button data-action="seed">試験用8杯を受け取る</button><button data-action="retry">保留中の保存を再確認</button><p>通常の素材・財布は使いません。道具動作の途中は中止してから退出できます。位置は区画の入口で保存し、施工状態とバケツは保持します。</p><output class="concrete-diagnostics"></output></details></div><footer><label>視点 <select data-camera aria-label="施工の視点"><option value="overview">施工全体</option><option value="eye">モンスターの目線</option><option value="above">モンスターの上から</option></select></label><button data-action="camera">向きを戻す</button><span class="concrete-walk-record"></span></footer>`;
 panel.insertAdjacentHTML('beforeend',holdDashButtonTemplate());
 canvas.parentElement.append(panel);panel.addEventListener('pointerdown',e=>e.stopPropagation());
 let active=false,busy=false,installed=false,issue='',tool='hands',moving=false,work=null,note='',lastStage=null,uiElapsed=0;
 const inert=new Map(),button=a=>panel.querySelector(`[data-action="${a}"]`),site=()=>service.constructionConcreteProject.site;
 const entry=()=>concreteEntryAllowed({map:state.map,aboard:state.ufoBoarded,position:state.position,groundY:state.groundY,jumpY:state.jumpY});
 const canMove=()=>active&&!busy&&!service.blocked&&!controller.pending;
 const view=createEmbeddedSiteView({hostScene:scene,hostCamera:camera,model:character,offset:CONCRETE_SITE,controls:panel,canMove,onNotice:text=>{note=text;},onMove:info=>{moving=info.moving;work=info.work;panel.querySelector('.concrete-walk-record').textContent=info.checkedTop?`床の中央に到着${info.checkedEdge?'・端も接地':''}`:'';}});
 const controller=createProfileSiteController({view,service});view.sync(site());
 function ownInput(owns){clearInput();for(const el of document.querySelectorAll('.world-toolbar,.control-card')){if(owns){inert.set(el,el.inert);el.inert=true;}else if(inert.has(el))el.inert=inert.get(el);}if(!owns)inert.clear();document.body.classList.toggle('world-concrete-playing',owns);canvas.parentElement.classList.toggle('world-concrete-operating',owns);panel.hidden=!owns;shadow.visible=!owns;}
 function sync(){view.sync(site());refresh();}
 function refresh(){
  view.syncTravelControls();
  launcher.hidden=state.map!=='construction';launcher.querySelector('[data-action="enter"]').disabled=active||busy||!installed||!entry()||service.blocked;
  launcher.querySelector('.entry-status').textContent=issue||(!installed?'区画を確認中です。':entry()?'入口です。「施工区画に入る」で手作業を始めます。':'工事現場の南東にある施工区画へ向かってください。');
  if(controller.pending&&!service.blocked&&!service.jobs.length&&site().appliedOperations.some(op=>op.operationId===controller.pending.action.operationId))controller.clearPendingAfterReload();
  const s=site(),actor=view.getActor(),atWork=actor.grounded&&Math.hypot(actor.x-27.5,actor.z)<1,atEither=actor.grounded&&Math.hypot(Math.abs(actor.x)-27.5,actor.z)<1,atStock=actor.grounded&&Math.hypot(actor.x-54,actor.z-31)<.8;
  const can=active&&!busy&&!moving&&!service.blocked&&!controller.pending;
  const show=(id,visible,enabled=true)=>{button(id).hidden=!visible;button(id).disabled=!(can&&enabled);};
  show('frame',s.stage==='unframed',tool==='hammer'&&atWork);show('load',['framed','pouring'].includes(s.stage)&&!s.bucketCells&&s.pouredCells<4,tool==='bucket'&&atStock&&s.availableConcreteCells>0);show('pour',s.bucketCells===1,tool==='bucket'&&atWork);show('finish',s.stage==='pouring'&&s.pouredCells===4,tool==='trowel'&&atWork);show('cure',s.stage==='finished',atEither);show('demold',s.stage==='cured',atEither);show('floor',s.stage==='demolded');
  for(const id of ['site','stock','save','seed','leave'])button(id).disabled=!can;
  button('stop').disabled=!active||!moving||busy;button('cancel').hidden=!view.working;button('cancel').disabled=!view.working;
  button('retry').hidden=!service.blocked;button('retry').disabled=busy;
  button('seed').disabled=!can||s.receivedConcreteCells>0;
  for(const b of panel.querySelectorAll('[data-tool]')){b.disabled=!can;b.setAttribute('aria-pressed',String(tool===b.dataset.tool));}
  panel.querySelector('[data-camera]').disabled=busy||view.working;button('camera').disabled=busy||view.working;
  const label={unframed:'型枠を組む',framed:'生コンを運ぶ',pouring:s.pouredCells===4?'長柄コテで仕上げる':'生コンを流す',finished:'硬化を始める',curing:`硬化中 · あと${Math.max(0,Math.ceil((s.cureDueAt-Date.now())/1000))}秒`,cured:'型枠を外す',demolded:'床が完成'}[s.stage];
  panel.querySelector('.concrete-stats').textContent=`${label}｜残り ${s.availableConcreteCells}杯・バケツ ${s.bucketCells}杯・床 ${s.pouredCells}/4杯`;
  panel.querySelector('.concrete-message').textContent=work?`${work.phase} (${work.step}/${work.total})`:note||'型枠や材料へ歩き、道具を選んで作業します。';
  panel.querySelector('.concrete-diagnostics').textContent=JSON.stringify({database:service.store.name,generation:service.generation,projectRevision:service.constructionConcreteProject.revision,stage:s.stage,stock:s.availableConcreteCells,bucket:s.bucketCells,poured:s.pouredCells,panels:s.availableFormworkPanels,active,installed,origin:CONCRETE_SITE,actor:actor,mainWorldPosition:{x:state.position.x,z:state.position.z},usesMainCharacter:character.parent===view.root.children.find(o=>o.children.includes(character)),usesMainScene:view.root.parent===scene,receipt:view.getReceipt()},null,2);
 }
 async function run(type,extra={}){if(!active||busy||service.blocked||controller.pending)return;busy=true;view.cancel();note='道具動作の途中は中止できます。';refresh();try{await controller.run(type,extra);note='工程と材料を保存しました。';}catch(e){note=e.message==='ACTION_CANCELLED'?'作業を中止しました。材料は変わっていません。':e.message;if(service.blocked)onError(e);}finally{busy=false;work=null;sync();}}
 async function save(){if(busy||view.working||service.blocked)return false;busy=true;view.cancel();refresh();try{await service.saveWorld(snapshot());note='現場と施工状態を保存しました。';return true;}catch(e){note=e.message;onError(e);return false;}finally{busy=false;refresh();}}
 async function enter(){if(active||busy||!installed||!entry()||service.blocked)return;clearInput();if(!await save())return;active=true;note='道具を選び、型枠または材料へ歩いて作業してください。';view.sync(site());view.enter();ownInput(true);refresh();}
 async function leave({then=null}={}){if(!active){then?.();return true;}if(busy||view.working||service.blocked){note='作業を中止するか、保存結果を確認してから区画を出てください。';refresh();return false;}if(!await save())return false;view.exit();active=false;ownInput(false);state.position.set(CONCRETE_SITE.entryX,0,CONCRETE_SITE.entryZ);state.groundY=0;state.jumpY=0;state.jumpVelocity=0;state.falling=false;state.supportSurfaceId=null;onExit();refresh();then?.();return true;}
 async function seed(){if(busy||site().receivedConcreteCells||service.blocked)return;busy=true;refresh();try{let packet=service.constructionPackTrialStock.transfers[0];if(!packet){packet=globalThis.ImasoraConstructionPackTransfer.createTransferPacket({id:`pack-transfer-world115-${crypto.randomUUID()}`,targetProfileId:service.constructionTransferProfileId,openingReceipts:[{id:`pack-open:${crypto.randomUUID()}`,boxes:1,auxiliaryKind:'formwork',recipeVersion:'plan90-trial-v1'}]});await service.receiveConstructionPackTrial(packet,{map:'construction',aboard:false,siteIndex:2,position:{x:-300,y:0,z:-75}});}await service.saveConstructionConcreteProject({type:'IMPORT_PACK_CONCRETE',operationId:`site-import-${crypto.randomUUID()}`,transferId:packet.id},service.constructionConcreteProject.revision,service.world);note='隔離保存に試験用8杯を用意しました。';}catch(e){note=e.message;if(service.blocked)onError(e);}finally{busy=false;sync();}}
 function toEntrance(){if(active||busy||!installed||state.map!=='construction')return;clearInput();state.position.set(CONCRETE_SITE.entryX,0,CONCRETE_SITE.entryZ);state.groundY=0;state.jumpY=0;state.jumpVelocity=0;state.falling=false;state.heading=state.viewHeading=Math.PI;state.viewPitch=.1;state.cameraMode='third';onExit();refresh();}
 function install({blockedAt,collider}){view.root.visible=state.map==='construction';if(!view.root.visible){installed=false;refresh();return;}if(blockedAt(CONCRETE_SITE.x,CONCRETE_SITE.z,165)){installed=false;view.root.visible=false;issue='既存の建物・作業区画と重なるため設置しません。既存作品はそのままです。';refresh();return;}issue='';installed=true;collider(CONCRETE_SITE.x,CONCRETE_SITE.z,[212,212],0,'concrete-worksite-reserved',0,{buildingId:'concrete-worksite-reserved'});sync();}
 const handlers={enter,entrance:toEntrance,leave:()=>leave(),save,seed,site:()=>view.walkTo('site'),stock:()=>view.walkTo('stock'),floor:()=>view.walkTo('floor'),stop:()=>view.cancel(),cancel:()=>view.cancelAction(),camera:()=>view.resetCamera(),retry:async()=>{try{if(controller.pending)await controller.retry();else await service.retry();sync();}catch(e){onError(e);}},frame:()=>run('PLACE_FORMWORK'),load:()=>run('LOAD_BUCKET',{cells:1}),pour:()=>run('POUR',{cells:1}),finish:()=>run('FINISH_SURFACE'),cure:()=>run('START_CURE',{now:Date.now()}),demold:()=>run('DEMOLD')};
 for(const root of [panel,launcher])for(const b of root.querySelectorAll('[data-action]'))b.onclick=()=>void handlers[b.dataset.action]();
 panel.querySelector('[data-camera]').onchange=e=>view.setCameraMode(e.target.value);
 for(const b of panel.querySelectorAll('[data-tool]'))b.onclick=()=>{tool=b.dataset.tool;view.setTool(tool);refresh();};
 window.addEventListener('blur',()=>{view.cancel();clearInput();});document.addEventListener('visibilitychange',()=>{view.cancel();clearInput();});
 return{get active(){return active;},leave,save,toEntrance,install,overlapsBuild:(p,size)=>state.map==='construction'&&concreteSiteOverlap(p,size),handleKey:e=>view.handleKey(e),look:(...args)=>view.look(...args),update(delta){if(active)view.tick(delta);uiElapsed+=delta;if(uiElapsed>.12){uiElapsed=0;refresh();}if(active&&!busy&&!service.blocked&&site().stage==='curing'&&Date.now()>=site().cureDueAt)void run('COMPLETE_CURE',{now:Date.now()});return active;}};
}
