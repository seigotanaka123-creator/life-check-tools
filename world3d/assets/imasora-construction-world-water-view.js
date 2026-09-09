import * as THREE from './three.module.min.js';
import {createWaterTransportView,updateWaterTransportView} from './imasora-construction-water-transport-view.js?v=457';
import {actorPose,boardOption,exitOption,loaderDrivingInput} from './imasora-construction-loader-physics.js';
import {transportAvailability,TRANSPORT_OBSTACLES} from './imasora-construction-water-transport.js';
import {initialWorldWater,WATER_YARDS,worldWaterTotals,waterWarehouseAccess,enterWorldWater,worldWaterAction,advanceWorldWater,validateWorldWater} from './imasora-construction-world-water.js';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js';
import {waterCheckpoint} from './imasora-construction-world-water.js';

// Same scene and same Ren as the main world. Only the input/physics owner changes.
export function createWorldWaterController({service,practice=false,preview=false,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,readout}){
  let work=null,root=null,active=false,busy=false,blocked=false,retryPending=false,expected=null,auto=0,ui=0,yaw=Math.PI,view=0,walk=0,idleIssue='';
  const inertState=new Map();
  function ownInput(owns){
    if(owns){for(const el of document.querySelectorAll('.world-toolbar,.control-card')){inertState.set(el,el.inert);el.inert=true;}}
    else{for(const [el,was]of inertState)el.inert=was;inertState.clear();}
    canvas.parentElement.classList.toggle('world-water-operating',owns);
  }
  const held=new Map(),taps=new Map(),keys=new Set();
  const panel=document.createElement('section');panel.className='world-water-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場の給水ローダー');
  panel.innerHTML=`<header><strong>給水ローダー</strong><span class="ww-mode"></span><button data-action="begin">作業を始める</button></header>
    <p class="ww-message" role="status"></p><div class="ww-stats"></div>
    <div class="ww-active" hidden><div class="ww-pad" aria-label="給水ローダーの操作"><button data-hold="left">左へ</button><button data-hold="accelerate">前へ</button><button data-hold="right">右へ</button><button data-hold="reverse">後ろへ</button><button data-hold="brake">ブレーキ</button></div>
    <div class="ww-work"><button data-action="interact">運転席に乗る</button><button data-action="dispatch">保管庫から32 L出庫</button><button data-action="store">給水槽の32 Lを保管</button><button data-action="source">給水槽から汲む</button><button data-action="pour">受け口へ注ぐ</button><button data-action="returned">回収槽から汲む</button><button data-action="recover">水路の水を回収</button><button data-action="flow">流れを切り替える</button><label>次に注ぐ向き <select aria-label="火星水を注ぐ向き"><option value="4">上 ↑</option><option value="8">下 ↓</option><option value="1">右 →</option><option value="2">左 ←</option><option value="16">奥</option><option value="32">手前</option></select></label></div>
    <footer><button data-action="stop">移送を止める</button><button data-action="camera">視点：追従</button><button data-action="save">作業を保存</button><button data-action="leave">降車して徒歩に戻る</button></footer></div>`;
  canvas.parentElement.append(panel);
  const unloadButton=document.createElement('button');unloadButton.dataset.action='unload';unloadButton.textContent='車載水を給水槽へ戻す';panel.querySelector('[data-action="source"]').after(unloadButton);
  // Do not let the world's drag camera capture pointers intended for work buttons.
  panel.addEventListener('pointerdown',e=>e.stopPropagation());
  panel.addEventListener('pointerup',e=>e.stopPropagation());
  const button=a=>panel.querySelector(`[data-action="${a}"]`),message=panel.querySelector('.ww-message');
  const received=()=>practice?32000:service.constructionStock?.receipts.filter(e=>e.offerId==='mars-water').reduce((n,e)=>n+e.amount,0)||0;
  function clear(){held.clear();taps.clear();keys.clear();clearInput();panel.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  function failure(e){clear();blocked=true;retryPending=service.blocked;message.textContent=`停止しました：${e.message||e}`;if(service.blocked)onError(e);refresh();}
  function near(){if(!root||state.map!=='construction'||state.ufoBoarded||Math.abs(state.groundY+state.jumpY)>.5)return false;
    const v=work.work.loader.vehicle;return Math.hypot(state.position.x-root.position.x-v.x,state.position.z-root.position.z-v.z)<=112;}
  function fresh(){
    const saved=service.world?.constructionWater;
    if(saved&&!practice){work=structuredClone(saved);expected=saved.revision;}
  }
  function begin(){
    if(!near()||busy||blocked||active)return;clear();idleIssue='';
    try{
      // Resuming an interrupted operation keeps its seat/path and all in-flight water.
      if(work.work.loader.mode!=='foot'||work.work.task){work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      else work=enterWorldWater(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading});
      active=true;auto=0;ownInput(true);render(0);refresh();
    }catch(e){idleIssue=e.message;message.textContent=e.message;}
  }
  async function save(){
    if(!work||busy||blocked)return false;if(practice)return true;
    if(service.mode==='readonly'){message.textContent='この表示確認では保存しません。';return true;}
    busy=true;clear();refresh();
    try{await service.flush();const saved=await service.saveConstructionWater(work,snapshot(),expected);expected=saved.revision;auto=0;return true;}
    catch(e){failure(e);return false;}finally{busy=false;refresh();}
  }
  async function leave({force=false,then=null}={}){
    if(!active){then?.();return true;}if(busy||blocked)return false;clear();
    const w=work.work;
    if(!force&&(w.loader.mode!=='foot'||w.task||w.air.length||work.delivery)){message.textContent='移送を終え、停車して降車してから徒歩へ戻ってください。';return false;}
    // Checkpoint the operation, not a fabricated dismounted vehicle state.
    // Only the main-world walker returns to safety; the hose, suspended water,
    // loading progress and boarding path resume at the worksite, as soil/timber do.
    render(0);const saved=await save();if(!saved&&!practice)return false;
    work=waterCheckpoint(work);active=false;ownInput(false);scene.add(character);shadow.visible=true;
    const p=force?{x:-260,y:0,z:-190,heading:0}:actorPose(work.work.loader);
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.jumpCount=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;
    onExit();refresh();then?.();return true;
  }
  async function action(a,value){
    if(a==='begin'){begin();return;}if(!active||busy||blocked)return;clear();
    if(a==='camera'){view=(view+1)%3;button('camera').textContent=['視点：追従','視点：横から','視点：区画全体'][view];return;}
    if(a==='leave'){await leave();return;}if(a==='save'){await save();return;}
    try{const old=work;work=worldWaterAction(work,a,value??(['dispatch','store'].includes(a)?crypto.randomUUID():undefined),received());
      if(['dispatch','store'].includes(a)&&old!==work)await save();
    }catch(e){message.textContent=e.message;work={...work,work:{...work.work,message:e.message}};}
    refresh();
  }
  panel.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>void action(b.dataset.action)));
  panel.querySelector('select').addEventListener('change',e=>void action('direction',Number(e.target.value)));
  for(const b of panel.querySelectorAll('[data-hold]')){
    b.addEventListener('pointerdown',e=>{if(!active||busy||blocked)return;e.preventDefault();held.set(e.pointerId,b.dataset.hold);taps.set(b.dataset.hold,work.work.time+.15);b.setPointerCapture(e.pointerId);b.classList.add('held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{held.delete(e.pointerId);b.classList.remove('held');});
    b.addEventListener('click',e=>{if(e.detail===0&&active&&!busy&&!blocked)taps.set(b.dataset.hold,work.work.time+.15);});
  }
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  addEventListener('keydown',e=>{if(!active)return;if(codes.includes(e.code)){if(e.target.tagName==='SELECT')return;e.preventDefault();e.stopImmediatePropagation();if(!keys.has(e.code)&&!busy&&!blocked)taps.set(e.code,work.work.time+.15);keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void action('interact');}},true);
  addEventListener('keyup',e=>{keys.delete(e.code);if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  // While this controller owns Ren, unrelated build/camera buttons cannot mutate the scene.
  document.addEventListener('pointerdown',e=>{if(active&&!service.blocked&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  function input(){const actions=[...held.values()],pressed=[...keys];for(const [k,t]of taps)if(t>work.work.time)(codes.includes(k)?pressed:actions).push(k);
    if(work.work.loader.mode==='driving')return loaderDrivingInput(actions,pressed);
    const on=(a,...k)=>actions.includes(a)||k.some(x=>pressed.includes(x)),forward=Number(on('accelerate','KeyW','ArrowUp'))-Number(on('reverse','KeyS','ArrowDown')),right=Number(on('right','KeyD','ArrowRight'))-Number(on('left','KeyA','ArrowLeft'));
    const a=work.work.loader.vehicle.heading+(view===1?Math.PI/2:yaw);return{x:right*Math.cos(a)-forward*Math.sin(a),z:-right*Math.sin(a)-forward*Math.cos(a)};
  }
  function refresh(){
    panel.hidden=!root||state.map!=='construction';if(panel.hidden)return;
    button('begin').hidden=active;button('begin').disabled=!near()||busy||blocked;panel.querySelector('.ww-active').hidden=!active;
    panel.querySelector('.ww-mode').textContent=practice?'貸出32 L・保存しません':service.mode==='readonly'?'表示確認・保存なし':service.mode==='integration'?'本体とは別の接続確認保存':'本体と共通保存';
    const t=worldWaterTotals(work),w=work.work,l=w.loader,a=transportAvailability(w),lit=n=>(n*.25).toFixed(2);
    panel.querySelector('.ww-stats').textContent=`保管 ${lit(received()/250-work.allocated)} L ｜給水槽 ${lit(t.source)} L ｜車載 ${lit(t.bucket)} L ｜移送 ${lit(t.transit+t.moving)} L ｜水路・回収 ${lit(t.course+t.returnTank)} L`;
    if(!blocked)message.textContent=busy?'同じ本体保存へ記録中…':active?w.message:idleIssue|| (near()?'ローダーの近くです。作業を始められます。':`給水区画 X ${root.position.x} / Z ${root.position.z}。車の近くで作業できます。`);
    const off=busy||blocked||!!work.delivery;
    for(const b of panel.querySelectorAll('.ww-active button'))b.disabled=off;
    button('interact').textContent=l.mode==='foot'?'運転席に乗る':l.mode==='driving'?'停車して降りる':'乗り降り中…';button('interact').disabled=off||!!w.task||!!w.air.length||!!l.transition||!(l.mode==='foot'?boardOption(l,TRANSPORT_OBSTACLES):exitOption(l,TRANSPORT_OBSTACLES));
    button('dispatch').disabled=off||!waterWarehouseAccess(work)||received()/250-work.allocated<128||work.allocated+128>768;
    button('store').disabled=off||!waterWarehouseAccess(work)||w.source<128;
    button('source').disabled=off||!a.source;button('returned').disabled=off||!a.returned;button('pour').disabled=off||!a.pourable;
    button('unload').disabled=off||!a.unload;
    for(const k of ['flow','recover'])button(k).disabled=off||!a.nearReturn||!a.stopped||!a.idle;
    button('stop').disabled=busy||blocked||!w.task;button('save').disabled=busy||blocked||practice||service.mode==='readonly';button('save').textContent=practice?'貸出：保存なし':'作業を保存';
    button('leave').disabled=busy||blocked||l.mode!=='foot'||!!work.delivery||!!w.task||!!w.air.length;
    const select=panel.querySelector('select');select.value=String(w.direction);select.disabled=off||!!w.task||!!w.air.length;
  }
  function render(dt){
    if(!root)return;updateWaterTransportView(root,work.work,dt);if(!active)return;
    const l=work.work.loader,pose=actorPose(l),footBottom=root.userData.loader.userData.measurement.footBottom;
    if(l.mode==='driving'){root.userData.loader.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+pose.x,pose.y-footBottom,root.position.z+pose.z);character.rotation.set(0,pose.heading,0);}
    shadow.visible=false;state.position.set(root.position.x+pose.x,0,root.position.z+pose.z);state.heading=pose.heading;state.groundY=pose.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;
    walk+=dt*(l.mode==='foot'?7:0);for(const [i,f]of (character.userData.walkRig?.feet||[]).entries())f.part.position.copy(f.basePosition).y+=l.mode==='foot'&&held.size?Math.max(0,Math.sin(walk+i*Math.PI))*1.2:0;
    const v=l.vehicle,focus=view===2?new THREE.Vector3(root.position.x,25,root.position.z+20):new THREE.Vector3(root.position.x+v.x,24,root.position.z+v.z),angle=view===2?Math.PI+.2:v.heading+(view===1?Math.PI/2:yaw),pitch=view===2?1.1:.48,dist=(view===2?740:245)*Math.max(1,.72/camera.aspect);
    camera.position.copy(focus).addScaledVector(new THREE.Vector3(Math.sin(angle)*Math.cos(pitch),Math.sin(pitch),Math.cos(angle)*Math.cos(pitch)),dist);camera.lookAt(focus);readout();
  }
  function install({group,blockedAt,collider}){
    if(active)throw Error('乗車中の作業区画を再構築できません。');if(root){disposeSpaceMaterialBook(root);root=null;}panel.hidden=true;
    if(state.map!=='construction')return;
    if(!work){fresh();if(!work){const site=WATER_YARDS.findIndex(([x,z])=>!blockedAt(x,z,375));if(site<0)return;work=initialWorldWater(site);}}
    const [x,z]=WATER_YARDS[work.siteIndex];if(blockedAt(x,z,375)){message.textContent='保存済みの作業区画が建物と重なっています。移動・上書きせず停止しました。';return;}
    root=createWaterTransportView({embedded:true});root.name='construction-world-water-yard';root.position.set(x,0,z);group.add(root);
    const solids=[...TRANSPORT_OBSTACLES,{x:0,z:251,width:644,depth:2,height:18},{x:-321,z:0,width:2,depth:500,height:18},{x:321,z:0,width:2,depth:500,height:18},{x:-312,z:-251,width:18,depth:2,height:18},{x:52,z:-251,width:538,depth:2,height:18}];
    for(const o of solids)collider(x+o.x,z+o.z,[o.width,o.depth],0,'construction-water-fixed',0,{minY:0,maxY:o.height,obstacleHeight:o.height});
    const v=work.work.loader.vehicle;collider(x+v.x,z+v.z,[88,90],v.heading,'construction-water-loader',0,{minY:0,maxY:44,obstacleHeight:44});render(0);refresh();
  }
  return {get active(){return active;},get busy(){return busy;},get dirty(){return !!work&&work.revision!==expected;},install,save,leave,begin,
    overlapsBuild(position,size){return !!root&&Math.abs(position[0]-root.position.x)<350+size[0]/2&&Math.abs(position[2]-root.position.z)<280+size[2]/2;},
    previewSpawn(){if(!preview||!root)return null;return{x:root.position.x-188,z:root.position.z-118,heading:0};},
    update(dt){if(state.map!=='construction'||!root)return false;
      if(blocked&&retryPending&&service.blocked===false){fresh();blocked=false;retryPending=false;if(active)work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      if(active&&!busy&&!blocked&&!document.hidden){try{const mode=work.work.loader.mode;work=advanceWorldWater(work,input(),dt);if(work.work.loader.mode!==mode)clear();auto+=dt;}catch(e){failure(e);}}
      render(dt);ui+=dt;if(ui>.15){ui=0;refresh();}
      if(active&&auto>8&&!busy&&!blocked&&!practice&&service.mode!=='readonly'&&Math.abs(work.work.loader.vehicle.speed)<.01&&!held.size&&!keys.size)void save();
      return active;
    },
  };
}
