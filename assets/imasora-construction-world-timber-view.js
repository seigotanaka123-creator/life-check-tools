import {createOrbitLook} from './imasora-world-look-controls.js?v=492';
import {createVehiclePlayView} from './imasora-construction-vehicle-play-view.js?v=491-verified';
import * as THREE from './three.module.min.js';
import {actorPose,loaderDrivingInput} from './imasora-construction-loader-physics.js';
import {hook,pickOption,craneBoardOption,craneExitOption} from './imasora-construction-crane.js';
import {craneWorkInput} from './imasora-construction-crane-controls.js';
import {issueOption,returnOption,timberPhysicsState} from './imasora-construction-purchased-timber.js';
import {assemblyState,floatReadout,floatingPlacement,joinOption,detachOption,component} from './imasora-construction-world-timber-assembly.js';
import {TIMBER_YARDS,FLOOR_VOLUME,initialWorldTimber,enterWorldTimber,worldTimberAction,advanceWorldTimber,idleWorldTimber,worldTimberTotals,worldTimberGeometry,timberEdges,worldTimberVehicleVolumes} from './imasora-construction-world-timber.js';
import {createWorldTimberModel,updateWorldTimberModel,TIMBER_FENCES} from './imasora-construction-world-timber-model.js';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js';
import {worldTimberJoinPractice} from './imasora-construction-world-timber-practice.js';
import {timberCheckpoint} from './imasora-construction-world-timber.js';

export function createWorldTimberController({service,practice=false,preview=false,state,scene,camera,character,shadow,canvas,snapshot,clearInput,onExit,onError,readout}){
  const orbit=createOrbitLook();
  let work=null,root=null,active=false,busy=false,blocked=false,retryPending=false,expected=null,auto=0,ui=0,time=0,view=0,precision=false,issue='',pendingExit=null,bindings=[];
  const held=new Map(),taps=new Map(),keys=new Set(),inert=new Map();
  const panel=document.createElement('section');panel.className='world-timber-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場の火星木材クレーン');
  panel.innerHTML=`<header><strong>火星木材クレーン v492</strong><span class="wt-mode"></span><button data-action="begin">木材の作業を始める</button></header>
    <p class="wt-message" role="status"></p><div class="wt-stats"></div><div class="wt-active" hidden>
    <div class="wt-drive wt-pad"><button data-hold="left">左へ</button><button data-hold="accelerate">前へ</button><button data-hold="right">右へ</button><button data-hold="reverse">後ろへ</button><button data-hold="brake">ブレーキ</button><button data-hold="jump">ジャンプ</button></div>
    <div class="wt-crane wt-pad" hidden><button data-hold="slew-left">左旋回</button><button data-hold="slew-right">右旋回</button><button data-hold="extend">アームを伸ばす</button><button data-hold="retract">アームを縮める</button><button data-hold="raise">巻き上げる</button><button data-hold="lower">巻き下げる</button></div>
    <div class="wt-work"><button data-action="issue">床板を1枚出す</button><button data-action="interact">運転席に乗る</button><button data-action="mode">クレーン作業へ</button><button data-action="pick">吊り索を掛ける</button><button data-action="rotate">部材を90°回す</button><button data-action="release">浮遊を開始</button><button data-action="place">地面・支持面に設置</button><button data-action="return-stock">回収枠から保管へ</button><button data-action="precision">微調整 OFF</button><button data-action="snap">面合わせ ON</button></div>
    <div class="wt-detail"></div><footer><button data-action="camera">視点：作業</button><button data-action="save">木材作業を保存</button><button data-action="leave">作業を終えて徒歩に戻る</button></footer></div>`;
  panel.querySelector('[data-action="release"]').insertAdjacentHTML('afterend','<button data-action="join">床に接合</button><button data-action="detach">接合を外して吊る</button>');
  if(practice&&service.mode==='readonly')panel.querySelector('header').insertAdjacentHTML('beforeend','<button data-action="join-practice">接合から試す（貸出2枚）</button>');
  canvas.parentElement.append(panel);for(const type of ['pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  const button=a=>panel.querySelector(`[data-action="${a}"]`),message=panel.querySelector('.wt-message');
  const received=()=>practice?2*FLOOR_VOLUME:service.constructionStock?.receipts.filter(e=>e.offerId==='mars-timber').reduce((n,e)=>n+e.amount,0)||0;
  function clear(){held.clear();taps.clear();keys.clear();clearInput();panel.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
  const game=createVehiclePlayView({panel,canvas,clearInput:clear,refresh,prefix:"wt",groups:[{"id":"move","label":"移動","selectors":[".wt-drive"],"hint":"WASD／矢印で移動。停車してクレーン作業へ。"},{"id":"arm","label":"アーム","selectors":[".wt-crane"],"hint":"クレーン作業へ切り替えると操作できます。"},{"id":"load","label":"荷物","selectors":["[data-action=\"pick\"]","[data-action=\"rotate\"]","[data-action=\"release\"]","[data-action=\"place\"]","[data-action=\"join\"]","[data-action=\"detach\"]"]},{"id":"stock","label":"保管・調整","selectors":["[data-action=\"issue\"]","[data-action=\"return-stock\"]","[data-action=\"precision\"]","[data-action=\"snap\"]"]}],quick:["interact","mode","camera"]});
  function owns(value){orbit.reset();if(value){for(const el of document.querySelectorAll('.world-toolbar,.control-card')){inert.set(el,el.inert);el.inert=true;}}else{for(const[el,was]of inert)el.inert=was;inert.clear();}canvas.parentElement.classList.toggle('world-timber-operating',value);game.setActive(value);}
  function fail(e){clear();blocked=true;retryPending=service.blocked;issue=`停止しました：${e.message||e}`;if(service.blocked)onError(e);refresh();}
  function near(){if(!root||state.map!=='construction'||state.ufoBoarded||state.jumpY>0||state.falling)return false;const v=work.work.rig.vehicle;return Math.hypot(state.position.x-root.position.x-v.x,state.position.z-root.position.z-v.z)<=112;}
  function fresh(){const saved=service.world?.constructionTimber;if(saved&&!practice){work=structuredClone(saved);expected=saved.revision;}}
  function begin(joinPractice=false){if(!near()||busy||blocked||active)return;clear();try{if(joinPractice){if(work.work.parts.length)throw Error('貸出床を回収してから接合練習を始めてください。');work=worldTimberJoinPractice(work.siteIndex,{practice,saveMode:service.mode});}else work=enterWorldTimber(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading},received());active=true;issue='';auto=0;owns(true);render(0);refresh();}catch(e){issue=e.message;refresh();}}
  async function save(){if(!work||busy||blocked)return false;if(work.work.rig.transition){issue='乗り降りが終わってから保存できます。';refresh();return false;}if(practice||service.mode==='readonly')return true;
    busy=true;clear();refresh();try{await service.flush();const saved=await service.saveConstructionTimber(work,snapshot(),expected);expected=saved.revision;auto=0;return true;}catch(e){fail(e);return false;}finally{busy=false;refresh();}}
  async function leave({force=false,then=null}={}){
    if(!active){if(work&&work.revision!==expected&&state.map==='construction'&&!await save())return false;then?.();return true;}if(busy||blocked)return false;clear();const w=work.work;
    if(w.rig.transition){if(force){pendingExit={force,then};issue='乗降が完了してから安全に移動します。';}else issue='乗り降りの完了を待ってください。';refresh();return false;}
    if(!force&&(w.rig.mode!=='foot'||!w.rig.player.grounded||w.held||w.rotation)){issue='荷を置いて降車・着地してから徒歩へ戻ってください。';refresh();return false;}
    render(0);if(!await save())return false;work=timberCheckpoint(work);active=false;owns(false);scene.add(character);shadow.visible=true;
    const p=force?{x:-260,y:0,z:-190,heading:0}:actorPose(w.rig);state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.jumpCount=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;onExit();refresh();then?.();return true;
  }
  async function action(a){if(a==='begin'||a==='join-practice'){begin(a==='join-practice');return;}if(!active||busy||blocked||!game.allows(a))return;clear();issue='';
    if(a==='camera'){orbit.reset();view=(view+1)%3;button(a).textContent=['視点：作業','視点：横から','視点：区画全体'][view];return;}
    if(a==='precision'){precision=!precision;refresh();return;}if(a==='leave'){await leave();return;}if(a==='save'){await save();return;}
    try{work=worldTimberAction(work,a,crypto.randomUUID(),received());if(['issue','return-stock','release','place','join','detach'].includes(a))await save();}catch(e){issue=e.message;}refresh();
  }
  panel.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>void action(b.dataset.action)));
  for(const b of panel.querySelectorAll('[data-hold]')){
    b.addEventListener('pointerdown',e=>{if(!active||busy||blocked||game.paused)return;e.preventDefault();held.set(e.pointerId,b.dataset.hold);taps.set(b.dataset.hold,time+.1);b.setPointerCapture(e.pointerId);b.classList.add('held');});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{held.delete(e.pointerId);b.classList.remove('held');});
    b.addEventListener('click',e=>{if(e.detail===0&&active&&!busy&&!blocked&&!game.paused)taps.set(b.dataset.hold,time+.1);});
  }
  const codes=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
  addEventListener('keydown',e=>{if(!active)return;if(game.paused){if(codes.includes(e.code)||e.code==='KeyE'){if(e.code!=='Space'||!e.target.closest('button,summary,select'))e.preventDefault();e.stopImmediatePropagation();}return;}if(codes.includes(e.code)){e.preventDefault();e.stopImmediatePropagation();if(!keys.has(e.code)&&!busy&&!blocked)taps.set(e.code,time+.1);keys.add(e.code);}else if(e.code==='KeyE'){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)void action('interact');}},true);
  addEventListener('keyup',e=>{keys.delete(e.code);if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  document.addEventListener('pointerdown',e=>{if(active&&!service.blocked&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  const yaw=()=>orbit.yaw(view===1?-Math.PI/2:view===2?Math.PI:-2.6);
  function input(){const actions=[...held.values()],pressed=[...keys];for(const[k,t]of taps)if(t>time)(codes.includes(k)?pressed:actions).push(k);
    if(work.work.rig.mode==='driving')return work.work.work?craneWorkInput(actions,pressed,precision):loaderDrivingInput(actions,pressed);
    const on=(a,...k)=>actions.includes(a)||k.some(x=>pressed.includes(x)),f=Number(on('accelerate','KeyW','ArrowUp'))-Number(on('reverse','KeyS','ArrowDown')),r=Number(on('right','KeyD','ArrowRight'))-Number(on('left','KeyA','ArrowLeft')),a=yaw();
    return{x:r*Math.cos(a)-f*Math.sin(a),z:-r*Math.sin(a)-f*Math.cos(a),jump:on('jump','Space')};
  }
  function refresh(){const close=!!root&&state.map==='construction'&&Math.abs(state.position.x-root.position.x)<380&&Math.abs(state.position.z-root.position.z)<320;panel.hidden=!close&&!active;canvas.parentElement.classList.toggle('world-timber-near',!panel.hidden);if(panel.hidden)return;
    button('begin').hidden=active;button('begin').disabled=!near()||busy||blocked;panel.querySelector('.wt-active').hidden=!active;
    if(button('join-practice')){button('join-practice').hidden=active;button('join-practice').disabled=!near()||busy||blocked||work.work.parts.length>0;}
    panel.querySelector('.wt-mode').textContent=practice?'貸出2枚・保存しません':service.mode==='readonly'?'表示確認・保存なし':service.mode==='integration'?'本体とは別の接続確認保存':'本体と共通保存';
    const w=assemblyState(work.work),t=worldTimberTotals(work),rig=w.rig,aboard=rig.mode==='driving',moving=!!rig.transition,crane=aboard&&w.work,p=w.parts.find(p=>p.id===w.held),candidate=pickOption(w),preview=floatingPlacement(timberPhysicsState(w)),join=joinOption(w),detach=detachOption(w);
    panel.querySelector('.wt-stats').textContent=`保管 ${received()/FLOOR_VOLUME-w.parts.length} ｜置場 ${t.loose} ｜吊り荷 ${t.held} ｜浮遊 ${t.floating} ｜設置 ${t.fixed} 枚`;
    message.textContent=blocked?issue:busy?'本体保存へ記録中…':issue||(active?(w.message||rig.message):near()?'クレーンの左側から作業を始められます。':`火星木材区画 X ${root.position.x} / Z ${root.position.z}`);
    const off=busy||blocked||moving||!!w.joining;for(const b of panel.querySelectorAll('.wt-active button'))b.disabled=off;
    panel.querySelector('.wt-drive').hidden=crane;panel.querySelector('.wt-crane').hidden=!crane;panel.querySelector('[data-hold="jump"]').hidden=rig.mode!=='foot';
    button('interact').textContent=aboard?'降りる':moving?'乗降中…':'乗る';button('interact').disabled=off||!(aboard?!w.work&&w.deployment===0&&craneExitOption(w):craneBoardOption(w));
    button('mode').textContent=w.work?'走行へ戻る':'クレーン作業へ';button('mode').disabled=off||!aboard||!!p||Math.abs(rig.vehicle.speed)>.8||w.deployment>0&&w.deployment<1;
    button('issue').disabled=off||!issueOption(w).ok;button('pick').disabled=off||!candidate||!crane||candidate?.hover&&component(w,candidate.id).length>1;button('rotate').disabled=button('release').disabled=off||!p||!!w.rotation;
    button('join').disabled=off||!join.ok;button('join').title=join.reason;button('join').textContent=w.joining?`接合中 ${Math.round(w.joining.elapsed/1.2*100)}%`:'床に接合';
    button('detach').disabled=off||!detach.ok;button('detach').title=detach.reason;
    button('rotate').textContent=w.rotation?`回転中 ${Math.round((p.angle-w.rotation.start)*180/Math.PI)}° / 90°`:'部材を90°回す';
    button('place').disabled=off||!preview?.ok;button('return-stock').disabled=off||!returnOption(w).ok;
    button('precision').textContent=precision?'微調整 ON（¼速）':'微調整 OFF';button('precision').setAttribute('aria-pressed',String(precision));button('precision').disabled=off||!crane;
    button('snap').textContent=w.snap?'面合わせ ON':'面合わせ OFF';button('leave').disabled=off||aboard||!rig.player.grounded;
    button('save').disabled=busy||blocked||moving||practice||service.mode==='readonly';button('save').textContent=practice?'貸出：保存なし':'木材作業を保存';button('camera').disabled=busy||blocked;
    for(const b of panel.querySelectorAll('.wt-crane button'))b.disabled=off||w.deployment<1;
    const floating=w.parts.find(p=>p.hover),f=floatReadout(w,floating?.id),h=hook(w);
    panel.querySelector('.wt-detail').textContent=(rig.mode==='foot'?`足元 ${rig.player.y.toFixed(1)} ｜ `:`フック高さ ${h.y.toFixed(1)} ｜ `)+(f.active?`浮遊床 ${f.count}枚：基準 ${f.target.toFixed(1)} / 現在 ${f.height.toFixed(1)} ｜荷重 ${f.load.toFixed(2)} / 支持力 ${f.capacity} ｜ `:'')+`接合 ${w.joints.length}組 ｜ `+(w.joining?'接合金具で引き寄せ中。次の操作は予約しません。':p?`${join.reason} ／ ${returnOption(w).reason}`:detach.ok?detach.reason:'浮遊床の辺へもう1枚を寄せて「床に接合」。外すときは床中央へフックを下ろします。');
    game.refresh({busy,blocked,context:crane?'working':rig.mode,loadText:'吊り荷 '+t.held+' 枚'});
  }
  function render(dt){if(!root)return;updateWorldTimberModel(root,work.work,{active,time});if(!active)return;
    const w=work.work,l=w.rig,p=actorPose(l),d=root.userData;
    if(l.mode==='driving'){d.crane.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+p.x,p.y-d.crane.userData.measurement.footBottom,root.position.z+p.z);character.rotation.set(0,p.heading,0);}
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.heading=p.heading;state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;shadow.visible=false;
    for(const[i,f]of(character.userData.walkRig?.feet||[]).entries())f.part.position.copy(f.basePosition).y+=l.mode==='foot'&&(held.size||keys.size)?Math.max(0,Math.sin(time*7+i*Math.PI))*1.2:0;
    const h=hook(w),v=l.vehicle,target=view===2?new THREE.Vector3(root.position.x,18,root.position.z):l.mode==='foot'?new THREE.Vector3(root.position.x+p.x,p.y+17,root.position.z+p.z):new THREE.Vector3(root.position.x+v.x+(h.x-v.x)*.35,18+Math.max(0,h.y-20)*.3,root.position.z+v.z+(h.z-v.z)*.35);
    const a=yaw(),pitch=orbit.pitch(view===2?1.1:.75),dist=(view===2?710:285)*Math.max(1,1.1/camera.aspect);camera.position.copy(target).addScaledVector(new THREE.Vector3(Math.sin(a)*Math.cos(pitch),Math.sin(pitch),Math.cos(a)*Math.cos(pitch)),dist);camera.lookAt(target);readout();
  }
  function install({group,blockedAt,collider,physics}){
    if(active)throw Error('木材作業中は区画を再構築できません。');if(root){disposeSpaceMaterialBook(root);root=null;}bindings=[];panel.hidden=true;canvas.parentElement.classList.remove('world-timber-near');if(state.map!=='construction')return;
    if(!work){fresh();if(!work){const site=TIMBER_YARDS.findIndex(([x,z])=>!blockedAt(x,z,390));if(site<0)return;work=initialWorldTimber(site,received());}}
    const[x,z]=TIMBER_YARDS[work.siteIndex];if(blockedAt(x,z,390)){issue='保存済み建物と木材区画が重なっています。建物を動かさず停止しました。';return;}
    root=createWorldTimberModel();root.position.set(x,0,z);group.add(root);
    for(const b of TIMBER_FENCES)collider(x+b.x,z+b.z,[b.width,b.depth],0,'construction-timber-fence',0,{minY:0,maxY:b.height,obstacleHeight:b.height});
    for(const b of worldTimberVehicleVolumes(work))collider(b.x,b.z,[b.w,b.d],b.angle,`construction-timber-${b.id}`,0,{minY:b.y,maxY:b.y+b.h,obstacleHeight:b.y+b.h});
    for(const g of worldTimberGeometry(work)){const floor=physics.floor({...g}),ceiling=physics.ceiling({...g}),edges=timberEdges(g).map(e=>physics.collider(e));bindings.push({id:g.id,floor,ceiling,edges});}
    render(0);refresh();
  }
  function syncPhysics(){const all=worldTimberGeometry(work);for(const b of bindings){const g=all.find(p=>p.id===b.id);if(!g)continue;Object.assign(b.floor,g);Object.assign(b.ceiling,g);timberEdges(g).forEach((e,i)=>Object.assign(b.edges[i],e));}}
  return{look(dx,dy,sensitivity){if(active)orbit.drag(dx,dy,sensitivity);},get active(){return active;},get dirty(){return !!work&&work.revision!==expected;},install,save,leave,begin,
    overlapsBuild(p,size){return !!root&&Math.abs(p[0]-root.position.x)<350+size[0]/2&&Math.abs(p[2]-root.position.z)<280+size[2]/2;},
    previewSpawn(){return preview&&root?{x:root.position.x-58,z:root.position.z-88,heading:0}:null;},
    update(dt){if(state.map!=='construction'||!root)return false;if(!game.paused)time+=dt;
      if(blocked&&retryPending&&service.blocked===false){fresh();blocked=false;retryPending=false;issue='';if(active)work={...work,revision:work.revision+1,work:{...work.work,paused:false}};}
      if(!busy&&!blocked&&!game.paused&&!document.hidden){try{
        if(active){const mode=work.work.rig.mode,joining=work.work.joining;work=advanceWorldTimber(work,input(),dt);if(work.work.rig.mode!==mode)clear();if(joining&&!work.work.joining){clear();auto=9;}}
        else{const r=idleWorldTimber(work,{x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading,grounded:!state.falling&&state.jumpY===0,vy:state.jumpVelocity},dt);work=r.state;if(r.carry.y||r.carry.x||r.carry.z){state.position.x+=r.carry.x;state.position.z+=r.carry.z;state.groundY+=r.carry.y;}syncPhysics();}
        auto+=dt;
      }catch(e){fail(e);}}
      render(game.paused?0:dt);ui+=dt;if(ui>.15){ui=0;refresh();}
      if(pendingExit&&!work.work.rig.transition&&!busy&&!blocked){const next=pendingExit;pendingExit=null;void leave(next);}
      if(auto>8&&work.revision!==expected&&!busy&&!blocked&&!practice&&service.mode!=='readonly'&&!work.work.rig.transition&&Math.abs(work.work.rig.vehicle.speed)<.01&&!held.size&&!keys.size)void save();return active;
    },
  };
}
