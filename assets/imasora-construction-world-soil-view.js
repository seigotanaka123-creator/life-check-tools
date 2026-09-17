import {createOrbitLook} from './imasora-world-look-controls.js?v=492';
import {createVehiclePlayView} from './imasora-construction-vehicle-play-view.js?v=491-verified';
import * as THREE from './three.module.min.js';
import {actorPose,loaderDrivingInput,boardOption,exitOption} from './imasora-construction-loader-physics.js';
import {soilCopyOptions} from './imasora-construction-purchased-soil.js';
import {initialWorldSoil,SOIL_YARDS,SOIL_SITE_SOLIDS,enterWorldSoil,worldSoilAction,advanceWorldSoil,worldSoilTotals,worldSoilSurface,worldSoilFloors} from './imasora-construction-world-soil.js';
import {createWorldSoilModel,updateWorldSoilModel,SOIL_FENCES} from './imasora-construction-world-soil-model.js';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js';
import {soilCheckpoint} from './imasora-construction-world-soil.js';

export function createWorldSoilController({service,practice=false,preview=false,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,readout}){
  const orbit=createOrbitLook();
  let work=null,root=null,active=false,busy=false,blocked=false,retryPending=false,expected=null,auto=0,ui=0,view=0,issue='',walk=0;
  const held=new Map(),taps=new Map(),keys=new Set(),inert=new Map();
  const panel=document.createElement('section');panel.className='world-soil-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場の火星土ローダー');
  panel.innerHTML=`<header><strong>火星土ローダー v492</strong><span class="ws-mode"></span><button data-action="begin">土の作業を始める</button></header>
    <p class="ws-message" role="status"></p><div class="ws-stats"></div>
    <div class="ws-active" hidden><div class="ws-pad" aria-label="土ローダーの操作"><button data-hold="left">左へ</button><button data-hold="accelerate">前へ</button><button data-hold="right">右へ</button><button data-hold="reverse">後ろへ</button><button data-hold="brake">ブレーキ</button></div>
    <div class="ws-work"><button data-action="interact">運転席に乗る</button><button data-action="load">① 土を積む（4）</button><button data-action="lay">② 土を敷く</button><button data-action="recover">土を回収</button><button data-action="store">保管口へ戻す</button><button data-action="jump">ジャンプ</button></div>
    <div class="ws-surface"></div><footer><button data-action="camera">視点：追従</button><button data-action="save">土作業を保存</button><button data-action="leave">作業を終えて徒歩に戻る</button></footer></div>`;
  canvas.parentElement.append(panel);
  for(const type of ['pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  const button=a=>panel.querySelector(`[data-action="${a}"]`),message=panel.querySelector('.ws-message');
  const received=()=>practice?8000:service.constructionStock?.receipts.filter(e=>e.offerId==='mars-soil').reduce((n,e)=>n+e.amount,0)||0;
  function clear(){held.clear();taps.clear();keys.clear();clearInput();panel.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  const game=createVehiclePlayView({panel,canvas,clearInput:clear,refresh,prefix:"ws",groups:[{"id":"move","label":"移動","selectors":[".ws-pad button","[data-action=\"jump\"]"],"hint":"WASD／矢印で移動。停車して土を扱います。"},{"id":"work","label":"土の作業","selectors":["[data-action=\"load\"]","[data-action=\"lay\"]","[data-action=\"recover\"]","[data-action=\"store\"]"]}],quick:["interact","camera"]});
  function owns(value){orbit.reset();if(value){for(const el of document.querySelectorAll('.world-toolbar,.control-card')){inert.set(el,el.inert);el.inert=true;}}else{for(const[el,was]of inert)el.inert=was;inert.clear();}canvas.parentElement.classList.toggle('world-soil-operating',value);game.setActive(value);}
  function fail(e){clear();blocked=true;retryPending=service.blocked;issue=`停止しました：${e.message||e}`;if(service.blocked)onError(e);refresh();}
  function near(){if(!root||state.map!=='construction'||state.ufoBoarded||state.jumpY>0||state.falling)return false;const v=work.work.loader.vehicle;return Math.hypot(state.position.x-root.position.x-v.x,state.position.z-root.position.z-v.z)<=112;}
  function fresh(){const saved=service.world?.constructionSoil;if(saved&&!practice){work=structuredClone(saved);expected=saved.revision;}}
  function begin(){if(!near()||busy||blocked||active)return;clear();try{work=enterWorldSoil(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading},received());active=true;issue='';auto=0;owns(true);render(0);refresh();}catch(e){issue=e.message;refresh();}}
  async function save(){if(!work||busy||blocked)return false;if(practice||service.mode==='readonly')return true;busy=true;clear();refresh();try{await service.flush();const saved=await service.saveConstructionSoil(work,snapshot(),expected);expected=saved.revision;auto=0;return true;}catch(e){fail(e);return false;}finally{busy=false;refresh();}}
  async function leave({force=false,then=null}={}){
    if(!active){then?.();return true;}if(busy||blocked)return false;clear();const w=work.work;
    if(!force&&(w.loader.mode!=='foot'||w.task||!w.body.grounded)){issue='作業を終え、停車・降車・着地してから徒歩へ戻ってください。';refresh();return false;}
    render(0);if(!await save())return false;
    work=soilCheckpoint(work);active=false;owns(false);scene.add(character);shadow.visible=true;
    const p=force?{x:-260,y:0,z:-190,heading:0}:actorPose(w.loader);state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.jumpCount=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;
    onExit();refresh();then?.();return true;
  }
  async function action(a){if(a==='begin'){begin();return;}if(!active||busy||blocked||!game.allows(a))return;clear();issue='';
    if(a==='camera'){orbit.reset();view=(view+1)%3;button(a).textContent=['視点：追従','視点：横から','視点：区画全体'][view];return;}
    if(a==='leave'){await leave();return;}if(a==='save'){await save();return;}
    try{work=worldSoilAction(work,a,crypto.randomUUID(),received());if(['load','lay','recover','store'].includes(a))await save();}catch(e){issue=e.message;}refresh();
  }
  panel.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>void action(b.dataset.action)));
  for(const b of panel.querySelectorAll('[data-hold]')){
    b.addEventListener('pointerdown',e=>{if(!active||busy||blocked||game.paused)return;e.preventDefault();held.set(e.pointerId,b.dataset.hold);taps.set(b.dataset.hold,work.work.time+.15);b.setPointerCapture(e.pointerId);b.classList.add('held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{held.delete(e.pointerId);b.classList.remove('held');});
    b.addEventListener('click',e=>{if(e.detail===0&&active&&!busy&&!blocked&&!game.paused)taps.set(b.dataset.hold,work.work.time+.15);});
  }
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  addEventListener('keydown',e=>{if(!active)return;if(game.paused){if(codes.includes(e.code)||e.code==='KeyE'){if(e.code!=='Space'||!e.target.closest('button,summary,select'))e.preventDefault();e.stopImmediatePropagation();}return;}if(codes.includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!keys.has(e.code)&&!busy&&!blocked)taps.set(e.code,work.work.time+.15);keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void action('interact');}},true);
  addEventListener('keyup',e=>{keys.delete(e.code);if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  document.addEventListener('pointerdown',e=>{if(active&&!service.blocked&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  function input(){const actions=[...held.values()],pressed=[...keys];for(const[k,t]of taps)if(t>work.work.time)(codes.includes(k)?pressed:actions).push(k);
    if(work.work.loader.mode==='driving')return loaderDrivingInput(actions,pressed);
    const on=(a,...k)=>actions.includes(a)||k.some(x=>pressed.includes(x)),f=Number(on('accelerate','KeyW','ArrowUp'))-Number(on('reverse','KeyS','ArrowDown')),r=Number(on('right','KeyD','ArrowRight'))-Number(on('left','KeyA','ArrowLeft'));
    const angle=orbit.yaw(view===2?Math.PI+.15:work.work.loader.vehicle.heading+(view===1?Math.PI/2:Math.PI));return{x:r*Math.cos(angle)-f*Math.sin(angle),z:-r*Math.sin(angle)-f*Math.cos(angle),jump:pressed.includes('Space')};
  }
  function refresh(){
    const close=!!root&&state.map==='construction'&&Math.abs(state.position.x-root.position.x)<400&&Math.abs(state.position.z-root.position.z)<340;
    panel.hidden=!close&&!active;canvas.parentElement.classList.toggle('world-soil-near',!panel.hidden);if(panel.hidden)return;
    button('begin').hidden=active;button('begin').disabled=!near()||busy||blocked;panel.querySelector('.ws-active').hidden=!active;
    panel.querySelector('.ws-mode').textContent=practice?'貸出8ブロック・保存しません':service.mode==='readonly'?'表示確認・保存なし':service.mode==='integration'?'本体とは別の接続確認保存':'本体と共通保存';
    const w=work.work,l=w.loader,t=worldSoilTotals(work),a=soilCopyOptions(w);
    panel.querySelector('.ws-stats').textContent=`保管 ${received()/1000-t.inUse/1000} ｜車載 ${t.bucket} ｜移送中 ${t.moving} ｜敷いた土 ${t.ground} ブロック`;
    message.textContent=blocked?issue:busy?'本体保存へ記録中…':issue|| (active?w.message:near()?'ローダーに近づきました。土の作業を始められます。':`土作業区画 X ${root.position.x} / Z ${root.position.z}。車の左側へどうぞ。`);
    const off=busy||blocked;for(const b of panel.querySelectorAll('.ws-active button'))b.disabled=off;
    const solids=SOIL_SITE_SOLIDS.map(b=>({x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,width:b.maxX-b.minX,depth:b.maxZ-b.minZ})).concat(w.patches.map(p=>({...p,width:32,depth:32})));
    button('interact').textContent=l.mode==='foot'?'乗る':l.mode==='driving'?'降りる':'乗降中…';button('interact').disabled=off||!!w.task||!!l.transition||!(l.mode==='foot'?w.body.grounded&&l.player.y===0&&boardOption(l,solids):exitOption(l,solids));
    for(const k of ['load','lay','recover','store'])button(k).disabled=off||!a[k];
    button('jump').disabled=off||!!w.task||l.mode!=='foot'||!w.body.grounded;
    button('leave').disabled=off||!!w.task||l.mode!=='foot'||!w.body.grounded;
    button('save').disabled=off||practice||service.mode==='readonly';button('save').textContent=practice?'貸出：保存なし':'土作業を保存';
    panel.querySelector('.ws-surface').textContent=l.mode==='foot'?`足元：${worldSoilSurface(work,{x:root.position.x+l.player.x,y:l.player.y,z:root.position.z+l.player.z,heading:l.player.heading})==='mars'?'火星土（3倍ジャンプ）':'普通の土'} ｜上昇 ${w.body.flight?w.body.flight.peak.toFixed(2):'0.00'} ｜記録 普通 ${w.body.normal?.height.toFixed(2)??'—'} / 火星土 ${w.body.mars?.height.toFixed(2)??'—'}`:'緑の枠に敷けます。停車して作業してください。';
    game.refresh({busy,blocked,context:l.mode,loadText:'車載 '+t.bucket+' 個'});
  }
  function render(dt){if(!root)return;updateWorldSoilModel(root,work.work,active);if(!active)return;
    const w=work.work,l=w.loader,p=actorPose(l),d=root.userData;
    if(l.mode==='driving'){d.loader.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+p.x,p.y-d.loader.userData.measurement.footBottom,root.position.z+p.z);character.rotation.set(0,p.heading,0);}
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.heading=p.heading;state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;shadow.visible=false;
    walk+=dt*7;for(const[i,f]of(character.userData.walkRig?.feet||[]).entries())f.part.position.copy(f.basePosition).y+=l.mode==='foot'&&(held.size||keys.size)?Math.max(0,Math.sin(walk+i*Math.PI))*1.2:0;
    const target=view===2?new THREE.Vector3(root.position.x,18,root.position.z):new THREE.Vector3(root.position.x+p.x,18+p.y*.25,root.position.z+p.z);
    const a=orbit.yaw(view===2?Math.PI+.15:l.vehicle.heading+(view===1?Math.PI/2:Math.PI)),pitch=orbit.pitch(view===2?1.1:.65),dist=(view===2?720:250)*Math.max(1,.72/camera.aspect);
    camera.position.copy(target).addScaledVector(new THREE.Vector3(Math.sin(a)*Math.cos(pitch),Math.sin(pitch),Math.cos(a)*Math.cos(pitch)),dist);camera.lookAt(target);readout();
  }
  function install({group,blockedAt,collider,surface,ceiling}){
    if(active)throw Error('土作業中は区画を再構築できません。');if(root){disposeSpaceMaterialBook(root);root=null;}panel.hidden=true;canvas.parentElement.classList.remove('world-soil-near');if(state.map!=='construction')return;
    if(!work){fresh();if(!work){const site=SOIL_YARDS.findIndex(([x,z])=>!blockedAt(x,z,390));if(site<0)return;work=initialWorldSoil(site,received());}}
    const [x,z]=SOIL_YARDS[work.siteIndex];if(blockedAt(x,z,390)){issue='土作業区画が保存済み建物と重なっています。建物を動かさず停止しました。';return;}
    root=createWorldSoilModel();root.position.set(x,0,z);group.add(root);
    for(const b of SOIL_SITE_SOLIDS){const cx=x+(b.minX+b.maxX)/2,cz=z+(b.minZ+b.maxZ)/2,size=[b.maxX-b.minX,b.maxZ-b.minZ];collider(cx,cz,size,0,'construction-soil-fixed',0,{minY:b.minY,maxY:b.maxY,obstacleHeight:b.maxY});if(b.minY>0)ceiling(cx,cz,size,0,b.minY,'construction-soil-ceiling');}
    for(const b of SOIL_FENCES)collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-soil-fence',0,{minY:0,maxY:b.height,obstacleHeight:b.height});
    const v=work.work.loader.vehicle;collider(x+v.x,z+v.z,[88,90],v.heading,'construction-soil-loader',0,{minY:0,maxY:44,obstacleHeight:44});
    for(const f of worldSoilFloors(work))surface(f);render(0);refresh();
  }
  return {look(dx,dy,sensitivity){if(active)orbit.drag(dx,dy,sensitivity);},get active(){return active;},get dirty(){return !!work&&work.revision!==expected;},install,save,leave,begin,
    overlapsBuild(p,size){return !!root&&Math.abs(p[0]-root.position.x)<350+size[0]/2&&Math.abs(p[2]-root.position.z)<280+size[2]/2;},
    jumpMultiplier(p){return state.map==='construction'&&work&&worldSoilSurface(work,p)==='mars'?Math.sqrt(3):1;},
    previewSpawn(){return preview&&root?{x:root.position.x-58,z:root.position.z-88,heading:0}:null;},
    update(dt){if(state.map!=='construction'||!root)return false;
      if(blocked&&retryPending&&service.blocked===false){fresh();blocked=false;retryPending=false;issue='';if(active)work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      if(active&&!busy&&!blocked&&!game.paused&&!document.hidden){try{const mode=work.work.loader.mode;work=advanceWorldSoil(work,input(),dt);if(work.work.loader.mode!==mode)clear();auto+=dt;}catch(e){fail(e);}}
      render(game.paused?0:dt);ui+=dt;if(ui>.15){ui=0;refresh();}
      if(active&&auto>8&&!busy&&!blocked&&!practice&&service.mode!=='readonly'&&Math.abs(work.work.loader.vehicle.speed)<.01&&!held.size&&!keys.size)void save();return active;
    },
  };
}
