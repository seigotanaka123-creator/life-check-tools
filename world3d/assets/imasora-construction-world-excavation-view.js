import * as THREE from './three.module.min.js';
import {loaderDrivingInput} from './imasora-construction-loader-physics.js';
import {totals,excavatorActorPose,armPose,scoopTargets} from './imasora-construction-excavator.js';
import {buildProgress} from './imasora-construction-excavator-build.js';
import {packExcavation} from './imasora-construction-excavator-save.js';
import {EXCAVATION_YARDS,EXCAVATION_GATE,chooseExcavationYard,excavationOpening,excavationReserved,excavationEntry,excavationCanLeave,enterExcavation,leaveExcavation,initialContactWorldExcavation,stepWorldExcavation,actWorldExcavation} from './imasora-construction-world-excavation.js';
import {createWorldExcavationModel,updateWorldExcavationModel,disposeWorldExcavationModel,EXCAVATION_FENCES} from './imasora-construction-world-excavation-model.js';

export function createWorldExcavationController({state,scene,camera,character,shadow,canvas,clearInput,onExit,readout}){
  let work=initialContactWorldExcavation(),site=-1,root=null,active=false,paused=false,planning=null,token=0,acc=0,ui=0,phase=0,view=0,roof=false,slow=false,issue='',exportedRevision=-1;
  let planTimer=null,pauseReason='一時停止中。';
  const held=new Map(),keys=new Set(),taps=new Map(),inert=new Map(),ray=new THREE.Raycaster();
  const panel=document.createElement('section');panel.className='world-excavation-controls';panel.hidden=true;panel.setAttribute('aria-label','工事現場のショベルカー');
  panel.innerHTML=`<header><strong>ショベルカー</strong><span>本体接続の練習・保存なし</span><button data-action="begin">ショベル作業に入る</button></header>
    <p class="we-message" role="status"></p><div class="we-stats"></div>
    <div class="we-active" hidden>
      <div class="we-move"><button data-hold="left">左へ</button><button data-hold="forward">前へ</button><button data-hold="right">右へ</button><button data-hold="back">後ろへ</button><button data-hold="brake">停止</button></div>
      <div class="we-arm" hidden><button data-hold="boom-up" title="車体側の関節を上げる（R）">ブーム上げ</button><button data-hold="boom-down" title="車体側の関節を下げる（F）">ブーム下げ</button><button data-hold="stick-out" title="ブーム先端の関節を伸ばす（T）">アーム伸ばす</button><button data-hold="stick-in" title="ブーム先端の関節を寄せる（G）">アーム寄せる</button><button data-hold="bucket-open" title="バケットだけを開く（Z）">バケット開く</button><button data-hold="bucket-close" title="バケットだけを閉じる（C）">バケット閉じる</button><button data-hold="slew-left">左旋回</button><button data-hold="slew-right">右旋回</button><button data-action="scoop">すくう</button><button data-action="dump">こぼす</button></div>
      <div class="we-actions"><button data-action="interact">運転席に乗る</button><button data-action="work">作業モード</button><button data-action="jump">ジャンプ</button><button data-action="cycle">この位置をすくって排土</button><button data-action="stop">補助を止める</button></div>
      <footer><button data-action="camera">視点：斜め後ろ</button><button data-action="entry-view">入口方向を見る</button><button data-action="bucket-view">バケットを横から見る</button><button data-action="slow">動作：通常</button><button data-action="roof">屋根を透かす</button><button data-action="pause">一時停止</button><button data-action="export">作業を書き出す</button><button data-action="leave">工事現場の徒歩へ戻る</button></footer>
    </div>`;
  canvas.parentElement.append(panel);const b=a=>panel.querySelector(`[data-action="${a}"]`),q=s=>panel.querySelector(s);
  // Keep the world's viewport drag handler from stealing button pointerup/click.
  for(const type of['pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  function clear(){held.clear();keys.clear();taps.clear();clearInput();panel.querySelectorAll('.held').forEach(e=>e.classList.remove('held'));}
  function cancelPlan(){token++;clearTimeout(planTimer);planTimer=null;planning?.terminate();planning=null;work={...work,guide:null};}
  function owns(yes){if(yes){for(const e of document.querySelectorAll('.world-toolbar,.control-card')){inert.set(e,e.inert);e.inert=true;}}else{for(const[e,v]of inert)e.inert=v;inert.clear();}canvas.parentElement.classList.toggle('world-excavation-operating',yes);}
  const position=()=>({x:state.position.x,y:state.groundY+state.jumpY,z:state.position.z,heading:state.heading});
  function eligible(){return root&&state.map==='construction'&&!state.ufoBoarded&&!state.falling&&excavationEntry(site,position());}
  function begin(){if(active||!eligible())return;try{work=enterExcavation(work,site,position());active=true;paused=false;issue='';clear();owns(true);render(0);refresh();}catch(e){issue=e.message;refresh();}}
  function leave({force=false,then=null}={}){
    if(!active){then?.();return true;}try{
      const result=leaveExcavation(work,{force});cancelPlan();work=result.work;active=false;paused=true;clear();owns(false);scene.add(character);character.visible=true;shadow.visible=true;
      const [x,z]=EXCAVATION_YARDS[site],p=result.position;state.position.set(x+p.x,0,z+p.z);state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;state.moving=false;state.heading=p.heading;state.viewHeading=p.heading;
      for(const f of character.userData.walkRig?.feet||[])f.part.position.copy(f.basePosition);
      onExit();refresh();then?.();return true;
    }catch(e){issue=e.message;refresh();return false;}
  }
  function requestPlan(action='build-cycle'){
    if(planning||!active||paused||work.action||work.loader.mode!=='working')return;clear();const worker=new Worker(new URL('./imasora-construction-excavator-planner-worker.js',import.meta.url),{type:'module'}),id=++token;planning=worker;
    worker.onmessage=({data})=>{worker.terminate();if(id!==token||!active)return;clearTimeout(planTimer);planTimer=null;planning=null;work={...work,guide:data.guide,message:data.message};refresh();};
    worker.onerror=()=>{if(id!==token||planning!==worker)return;cancelPlan();issue='経路計算を中止しました。手動操作は使えます。';refresh();};
    planTimer=setTimeout(()=>{if(id!==token)return;cancelPlan();issue='安全な経路の計算を時間内に終えられませんでした。土は保持しています。ブームを上げるなど姿勢を変えて再度お試しください。手動操作は使えます。';refresh();},8000);
    worker.postMessage({state:work,action});refresh();
  }
  function exportWork(){cancelPlan();clear();paused=true;const packet=packExcavation(work),url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='imasora-world-excavation-practice.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);exportedRevision=work.revision;issue='書き出しを要求しました。通常保存には追加していません。';}
  function action(a){
    if(a==='begin'){begin();return;}if(!active)return;clear();issue='';
    if(a==='camera'){view=(view+1)%4;refresh();return;}if(a==='entry-view'){view=2;refresh();return;}if(a==='bucket-view'){view=4;refresh();return;}if(a==='slow'){slow=!slow;refresh();return;}if(a==='roof'){roof=!roof;refresh();return;}
    if(a==='pause'){cancelPlan();paused=!paused;pauseReason='一時停止中。';refresh();return;}if(a==='export'){exportWork();refresh();return;}if(a==='leave'){leave();return;}
    if(a==='stop'){cancelPlan();refresh();return;}if(paused)return;if(a==='cycle'){if(work.load)requestPlan();else{cancelPlan();work=actWorldExcavation(work,'build-cycle');refresh();}return;}
    cancelPlan();if(a==='jump')taps.set('jump',.16);else work=actWorldExcavation(work,a);refresh();
  }
  panel.querySelectorAll('[data-action]').forEach(e=>e.onclick=()=>action(e.dataset.action));
  for(const e of panel.querySelectorAll('[data-hold]')){
    e.onpointerdown=event=>{if(!active||paused)return;event.preventDefault();cancelPlan();held.set(event.pointerId,e.dataset.hold);e.setPointerCapture(event.pointerId);taps.set(e.dataset.hold,.15);e.classList.add('held');};
    for(const type of['pointerup','pointercancel','lostpointercapture'])e.addEventListener(type,event=>{held.delete(event.pointerId);e.classList.remove('held');});
    e.onclick=event=>{if(event.detail===0&&active&&!paused){cancelPlan();taps.set(e.dataset.hold,.16);}};
  }
  const codes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyR','KeyF','KeyT','KeyG','KeyQ','KeyE','KeyZ','KeyC'];
  addEventListener('keydown',e=>{if(!active||!codes.includes(e.code))return;e.preventDefault();e.stopImmediatePropagation();if(!paused){if(!keys.has(e.code))cancelPlan();keys.add(e.code);}},true);
  addEventListener('keyup',e=>{keys.delete(e.code);if(active&&codes.includes(e.code))e.stopImmediatePropagation();},true);
  document.addEventListener('pointerdown',e=>{if(active&&!panel.contains(e.target)&&e.target!==canvas&&!e.target.closest?.('#emergencyEscapeButton')){e.preventDefault();e.stopImmediatePropagation();}},true);
  addEventListener('blur',()=>{clear();if(active){cancelPlan();paused=true;pauseReason='画面からフォーカスが外れたため、安全のため一時停止しています。';refresh();}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();cancelPlan();if(active){paused=true;pauseReason='別の画面へ切り替えたため、安全のため一時停止しています。';refresh();}}});
  addEventListener('pagehide',()=>{clear();cancelPlan();});
  addEventListener('beforeunload',e=>{if(work.revision>0&&work.revision!==exportedRevision){e.preventDefault();e.returnValue='';}});
  function input(){
    const actions=[...held.values(),...taps.keys()],on=(a,...k)=>actions.includes(a)||k.some(c=>keys.has(c)),axis=(a,b,...k)=>Number(on(a,k[0],k[2]))-Number(on(b,k[1],k[3]));
    if(work.loader.mode==='working')return{boom:axis('boom-up','boom-down','KeyR','KeyF'),stick:axis('stick-out','stick-in','KeyT','KeyG'),curl:axis('bucket-close','bucket-open','KeyC','KeyZ'),slew:axis('slew-right','slew-left','KeyE','KeyQ')};
    if(work.loader.mode==='driving')return loaderDrivingInput(actions.map(a=>a==='forward'?'accelerate':a==='back'?'reverse':a),keys);
    const f=axis('forward','back','KeyW','KeyS','ArrowUp','ArrowDown'),r=axis('right','left','KeyD','KeyA','ArrowRight','ArrowLeft'),yaw=walkYaw();return{x:r*Math.cos(yaw)-f*Math.sin(yaw),z:-r*Math.sin(yaw)-f*Math.cos(yaw),jump:on('jump','Space')};
  }
  const walkYaw=()=>view===2?Math.PI:work.loader.vehicle.heading+(view===1?1.5:-2.4);
  function refresh(){
    const nearby=root&&state.map==='construction'&&Math.abs(state.position.x-root.position.x)<430&&Math.abs(state.position.z-root.position.z)<360;
    panel.hidden=!active&&!nearby;canvas.parentElement.classList.toggle('world-excavation-near',!panel.hidden);if(panel.hidden)return;
    b('begin').hidden=active;b('begin').disabled=!eligible();b('begin').textContent=work.loader.mode==='foot'?'ショベル作業に入る':'中断した車両作業へ戻る';q('.we-active').hidden=!active;
    const s=work,l=s.loader,t=totals(s),p=buildProgress(s),working=l.mode==='working';
    q('.we-message').textContent=issue||(!active?(paused?'作業はこの画面内に保持しています。黄色い入口で上のボタンから続きを行えます。':'黄色い入口から作業区画へどうぞ。掘削した土はこの確認画面内だけで扱います。'):paused?pauseReason+'「再開」で作業を続けます。':planning?'接触しない経路を確認中…（補助を止めて手動操作にも戻せます）':s.message);
    q('.we-stats').textContent=`地形 ${t.terrain} ｜積載 ${t.bucket} ｜受け箱 ${t.bin} ｜土の合計 ${t.total} / 1792 ｜掘削 ${p.removed}個`+(working?` ｜根元 ${(s.arm.boom*180/Math.PI).toFixed(0)}°・アーム ${(s.arm.stick*180/Math.PI).toFixed(0)}°・バケット ${(s.arm.curl*180/Math.PI).toFixed(0)}° ｜爪：${scoopTargets(s).length?'土に接触':'未接触'}`:` ｜足元 ${excavatorActorPose(s).y.toFixed(1)}`);
    q('.we-move').hidden=working;q('.we-arm').hidden=!working;
    for(const e of panel.querySelectorAll('[data-hold]'))e.disabled=paused||!!l.transition||(working&&!!s.action);
    b('pause').textContent=paused?'再開':'一時停止';b('camera').textContent=['視点：斜め後ろ','視点：アーム側','視点：入口方向','視点：区画全体','視点：バケット横'][view];b('slow').textContent=slow?'動作：4倍スロー':'動作：通常';b('roof').textContent=roof?'屋根を戻す':'屋根を透かす';
    b('interact').textContent=l.mode==='foot'?'運転席に乗る':l.transition?'乗り降り中…':'降りる';b('interact').disabled=paused||!!l.transition||working||Math.abs(l.vehicle.speed)>.8;
    b('work').textContent=working?'走行モード':'作業モード';b('work').disabled=paused||!['working','driving'].includes(l.mode)||!!s.action||Math.abs(l.vehicle.speed)>.8;
    b('scoop').disabled=paused||!!s.action||s.load>0;b('dump').disabled=paused||!!s.action||!s.load;
    b('cycle').hidden=!working;b('cycle').disabled=paused||!!planning||!!s.guide||!!s.action;b('stop').hidden=!working;b('stop').disabled=!planning&&!s.guide;
    b('jump').hidden=l.mode!=='foot';b('jump').disabled=paused||!l.player.grounded;b('leave').disabled=!excavationCanLeave(s);
  }
  function render(dt){if(!root)return;updateWorldExcavationModel(root,work,active,roof);if(!active)return;
    const d=root.userData,p=excavatorActorPose(work),seated=['driving','working'].includes(work.loader.mode),onFoot=work.loader.mode==='foot';
    if(seated){d.machine.userData.pilotSocket.add(character);character.position.set(0,0,0);character.rotation.set(0,0,0);}
    else{scene.add(character);character.position.set(root.position.x+p.x,p.y-d.machine.userData.measurement.footBottom,root.position.z+p.z);character.rotation.set(0,p.heading,0);}
    state.position.set(root.position.x+p.x,0,root.position.z+p.z);state.heading=p.heading;state.groundY=p.y;state.jumpY=0;state.jumpVelocity=0;state.falling=false;shadow.visible=false;character.visible=true;
    phase+=dt*9;for(const[i,f]of(character.userData.walkRig?.feet||[]).entries()){f.part.position.copy(f.basePosition);if(!seated&&!paused&&(held.size||keys.size||work.loader.transition))f.part.position.y+=Math.max(0,Math.sin(phase+i*Math.PI))*1.2;}
    if(view===4){const bp=armPose(work),yaw=bp.heading,focus=new THREE.Vector3(root.position.x+bp.wrist.x,bp.wrist.y-22,root.position.z+bp.wrist.z);camera.position.copy(focus).add(new THREE.Vector3(Math.cos(yaw)*100,25,-Math.sin(yaw)*100));camera.lookAt(focus);readout();return;}
    const v=work.loader.vehicle,wide=view===3,focus=new THREE.Vector3(root.position.x+(wide?0:onFoot?p.x:v.x),onFoot?p.y+22:22,root.position.z+(wide?10:onFoot?p.z:v.z+30));
    const yaw=walkYaw(),pitch=wide?1.15:.6,dist=wide?650:onFoot?92:295*Math.max(1,.8/camera.aspect),offset=new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));let allowed=dist;
    root.updateMatrixWorld(true);if(onFoot){ray.set(focus,offset);ray.far=dist;const hits=ray.intersectObject(d.terrain);if(hits.length)allowed=Math.max(.5,hits[0].distance-2);}
    if(onFoot&&allowed<20){camera.position.copy(focus);camera.lookAt(focus.clone().add(new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw))));character.visible=false;}
    else{camera.position.copy(focus).addScaledVector(offset,allowed);camera.lookAt(focus);}readout();
  }
  return{get active(){return active;},get dirty(){return work.revision>0;},begin,leave,
    install({group,blockedAt,reserved,collider}){
      if(active)throw Error('掘削作業を中断してから再構築してください。');disposeWorldExcavationModel(root);root=null;panel.hidden=true;canvas.parentElement.classList.remove('world-excavation-near');if(state.map!=='construction')return null;
      if(site<0)site=chooseExcavationYard(blockedAt,reserved);if(site<0){issue='既存作品と重ならない空き区画がありません。';return null;}
      const [x,z]=EXCAVATION_YARDS[site];if(blockedAt(x,z,425)||reserved([x,0,z],[720,0,600])){issue='掘削区画が既存作品と重なります。作品を移動せず停止しました。';return null;}
      root=createWorldExcavationModel();root.position.set(x,0,z);group.add(root);
      for(const f of EXCAVATION_FENCES)collider(x+f.x,z+f.z,[f.w,f.d],0,'construction-excavation-fence',0,{minY:0,maxY:40,obstacleHeight:40});
      render(0);refresh();return excavationOpening(site);
    },
    overlapsBuild(p,size){return root&&excavationReserved(site,p,size);},
    previewSpawn(){return root?{x:root.position.x+EXCAVATION_GATE.x,z:root.position.z+EXCAVATION_GATE.z,heading:0}:null;},
    update(dt){if(!root||state.map!=='construction')return false;
      // Transfer walking before the user can reach any excavated floor. The
      // original world's infinite y=0 floor never handles the tunnel interior.
      if(!active&&eligible()&&position().z-root.position.z>-218)begin();
      if(active&&!paused&&!document.hidden){try{acc+=dt*(slow?.25:1);while(acc>=1/120){
        if(!planning){if(work.guide?.phase==='plan-haul')requestPlan('plan-haul');else{const mode=work.loader.mode;work=stepWorldExcavation(work,input(),1/120);if(mode!==work.loader.mode)clear();}}
        for(const[k,t]of taps){if(t<=1/120)taps.delete(k);else taps.set(k,t-1/120);}acc-=1/120;
      }}catch(e){cancelPlan();clear();paused=true;issue=`安全のため停止：${e.message}`;}}
      else acc=0;render(dt);ui+=dt;if(ui>.12){ui=0;refresh();}return active;
    }
  };
}
