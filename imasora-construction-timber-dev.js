import * as THREE from './assets/three.module.min.js';
import {officialCharacter} from './assets/imasora-construction-layout.js';
import {actorPose,localToWorld,loaderDrivingInput} from './assets/imasora-construction-loader-physics.js';
import {hook,placement,pickOption,craneBoardOption,craneExitOption} from './assets/imasora-construction-crane.js';
import {initialTimber as initialCrane,actTimber as actCrane,stepTimber as stepCrane,packTimber as packCrane,TIMBER_PARTS,TIMBER_MATERIALS,RETURN_PAD,returnOption,issueOption} from './assets/imasora-construction-timber.js?v=446';
import {createCrane,updateCraneModel} from './assets/imasora-construction-crane-model.js';
import {createTimberPart as createPart} from './assets/imasora-construction-timber-model.js?v=446';
import {TimberSession as CraneSession} from './assets/imasora-construction-timber-storage.js?v=446';
import {createCraneFloor} from './assets/imasora-construction-crane-floor.js?v=435';
import {craneWorkInput,cranePlacementReadout} from './assets/imasora-construction-crane-controls.js?v=437';
const $=id=>document.getElementById(id),local=['localhost','127.0.0.1','[::1]'].includes(location.hostname),testMode=new URLSearchParams(location.search).get('timberTest')==='1';
let state=initialCrane(),ready=false,roof=false,view=0,orbit=-2.6,pitch=.75,distance=285,time=0,walkPhase=0,dirtySince=0,loading=false,headContact='',headContactUntil=0,precision=false;
const session=new CraneSession(),held=new Map(),keys=new Set(),scene=new THREE.Scene();scene.background=new THREE.Color(0xc6d8d2);scene.fog=new THREE.Fog(0xc6d8d2,800,1800);
const camera=new THREE.PerspectiveCamera(46,1,.5,2200),renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
scene.add(new THREE.HemisphereLight(0xf9fff2,0x71867a,2.3));const sun=new THREE.DirectionalLight(0xffe3b1,3.2);sun.position.set(-190,330,-140);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-330,right:330,top:300,bottom:-300,near:1,far:800});sun.shadow.normalBias=.18;scene.add(sun);const fill=new THREE.DirectionalLight(0xd2ebee,1.1);fill.position.set(220,180,100);scene.add(fill);
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function box(x,y,z,w,h,d,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.receiveShadow=m.castShadow=true;scene.add(m);return m;}
const white=mat(0xf3ead3),green=mat(0x71998b),dark=mat(0x3c5b58),paint=mat(0xcfb766);
scene.add(createCraneFloor());
const outside=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),mat(0x9fb4a1));outside.rotation.x=-Math.PI/2;outside.position.y=-8.5;scene.add(outside);
for(const z of[-251,251])box(0,8,z,644,16,2,dark);for(const x of[-321,321])box(x,8,0,2,16,500,dark);
for(let x=-312;x<320;x+=25)for(const z of[-251,251])box(x,13,z,8,5,2.2,paint);
box(-260,.12,-190,110,.24,110,green);for(const x of[-315,-205])box(x,.25,-190,1,.2,110,white);for(const z of[-245,-135])box(-260,.25,z,110,.2,1,white);
for(const x of[-50,50])box(x,.13,-80,1,.12,130,white);for(const z of[-145,-15])box(0,.13,z,100,.12,1,white);
function label(text,x,z,width,depth,color){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.font='bold 52px "Yu Gothic",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,64);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.3,z);scene.add(m);}
label('02 クレーン',0,-135,84,21,'#fff5d9');label('自由組立エリア',-145,163,144,26,'#faf1d9');label('歩行エリア',-260,-190,91,22,'#eff6dd');
// Painted material bays; they add no invisible collision boxes.
for(const p of TIMBER_PARTS){const ink=mat(p.materialId==='earth-iron'?0x7e98a2:0xccab6c);for(const side of[-1,1]){box(p.x+side*(p.w/2+2),.19,p.z,.65,.12,p.d+4,ink);box(p.x,.19,p.z+side*(p.d/2+2),p.w+4,.12,.65,ink);}}
const returnInk=mat(0x419fac);for(const side of[-1,1]){box(RETURN_PAD.x+side*RETURN_PAD.w/2,.24,RETURN_PAD.z,.8,.12,RETURN_PAD.d,returnInk);box(RETURN_PAD.x,.24,RETURN_PAD.z+side*RETURN_PAD.d/2,RETURN_PAD.w,.12,.8,returnInk);}
label('回収枠',0,-5,39,9,'#24667b');
// Flat painted work area: it is not an elevated floor / invisible collision box.
for(const x of[-218,-40])box(x,.17,112,.6,.1,128,white);for(const z of[48,176])box(-129,.17,z,178,.1,.6,white);
const crane=createCrane();scene.add(crane);const ren=officialCharacter();scene.add(ren);const footBottom=crane.userData.measurement.footBottom,feet=ren.userData.feet.map(o=>({o,y:o.position.y})),hands=ren.userData.hands.map(o=>({o,y:o.position.y}));
const partMeshes=new Map();for(const p of TIMBER_PARTS){const m=createPart(p);m.visible=false;partMeshes.set(p.id,m);scene.add(m);}
const targetRing=new THREE.Mesh(new THREE.RingGeometry(9,10.5,48),new THREE.MeshBasicMaterial({color:0xffcc6b,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false}));targetRing.rotation.x=-Math.PI/2;scene.add(targetRing);
const entryRing=new THREE.Mesh(new THREE.RingGeometry(13,15,48),new THREE.MeshBasicMaterial({color:0xffd970,side:THREE.DoubleSide}));entryRing.rotation.x=-Math.PI/2;scene.add(entryRing);
const ghost=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0x5befad,transparent:true,opacity:.28,depthWrite:false}));scene.add(ghost);
const ghostEdges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0x9cffc5}));ghost.add(ghostEdges);
function clearInput(){held.clear();keys.clear();for(const b of document.querySelectorAll('.held'))b.classList.remove('held');}
function action(name){if(!ready||loading)return;clearInput();state=actCrane(state,name);refresh();}
for(const [id,name] of[['interact','interact'],['mode-toggle','mode'],['pick','pick'],['rotate','rotate'],['place','place'],['release','release'],['snap','snap'],['home','home']])$(id).onclick=()=>action(name);
$('roof').onclick=()=>{roof=!roof;$('roof').textContent=roof?'屋根を戻す':'屋根を透かす';};
$('precision').onclick=()=>{clearInput();precision=!precision;refresh();};
const cameraNames=['作業','側面','俯瞰'];$('camera').onclick=()=>{view=(view+1)%3;$('camera').textContent=`視点：${cameraNames[view]}`;};
$('help-open').onclick=()=>{clearInput();$('help').showModal();};$('help-close').onclick=()=>$('help').close();
const unit=n=>(n/1000).toLocaleString('ja-JP',{maximumFractionDigits:3});
function refreshStock(){
  $('material-ledger').replaceChildren();
  for(const [id,row]of Object.entries(state.ledger)){
    const line=document.createElement('tr');
    for(const text of[TIMBER_MATERIALS[id],...['stored','loose','held','fixed','total'].map(k=>unit(row[k]))]){const cell=document.createElement('td');cell.textContent=text;line.append(cell);}
    $('material-ledger').append(line);
  }
  $('stock-list').replaceChildren();
  for(const p of TIMBER_PARTS){
    const row=document.createElement('div'),name=document.createElement('strong'),text=document.createElement('span'),button=document.createElement('button'),o=issueOption(state,p.id);row.className='stock-item';
    name.textContent=p.name;text.textContent=`材積 ${unit(p.w*p.h*p.d)} ｜ ${state.stock.includes(p.id)?'保管中':state.held===p.id?'吊り荷':state.parts.find(q=>q.id===p.id)?.fixed?'設置済み':'置場にあります'}`;
    button.textContent='置場に出す';button.disabled=!o.ok||session.blocked||!ready;button.title=o.reason;
    button.onclick=()=>{action('issue:'+p.id);$('stock-message').textContent=state.message;refreshStock();};
    row.append(name,text,button);if(state.stock.includes(p.id)&&!o.ok){const reason=document.createElement('small');reason.textContent=o.reason;row.append(reason);}$('stock-list').append(row);
  }
}
$('stock-open').onclick=()=>{clearInput();refreshStock();$('stock-message').textContent='部材を選んで、色枠の置場へ出してください。';$('stock-dialog').showModal();};$('stock-close').onclick=()=>$('stock-dialog').close();
$('return-stock').onclick=()=>action('return-stock');
$('export').onclick=()=>{try{$('export-data').textContent=JSON.stringify(session.blocked?session.raw:packCrane(state),null,2);$('export-data').hidden=false;}catch(e){state.message=e.message;refresh();}};
async function save(){clearInput();if(testMode){$('save-status').textContent='操作確認用：保存しません';return true;}if(!ready||loading||session.busy||session.blocked||state.rig.transition)return false;let saved=false;try{await session.save(state);$('save-status').textContent='保存済み（普通素材の開発専用）';dirtySince=0;saved=true;}catch(e){$('save-status').textContent='保存停止：'+e.message;state.message=e.message;}refresh();return saved;}
$('save').onclick=save;
for(const link of document.querySelectorAll('[data-example]'))link.onclick=async e=>{
  e.preventDefault();clearInput();
  // Help pauses simulation. A failed/busy save never navigates away. Examples
  // run without storage, so returning cannot write their arranged parts back.
  if(!testMode&&!await save())return;
  location.assign(link.href);
};
function controls(){const actions=new Set([...held.values()].map(v=>v.action)),has=(a,...codes)=>actions.has(a)||codes.some(k=>keys.has(k));
  if(state.work&&state.rig.mode==='driving')return craneWorkInput(actions,keys,precision);
  if(state.rig.mode==='driving')return loaderDrivingInput(actions,keys);
  const f=Number(has('forward','KeyW','ArrowUp'))-Number(has('back','KeyS','ArrowDown')),s=Number(has('right','KeyD','ArrowRight'))-Number(has('left','KeyA','ArrowLeft')),yaw=view===1?-Math.PI/2:orbit;
  return{x:s*Math.cos(yaw)-f*Math.sin(yaw),z:-s*Math.sin(yaw)-f*Math.cos(yaw),jump:has('jump','Space')};
}
for(const b of document.querySelectorAll('[data-action]')){
  b.onpointerdown=e=>{if(!ready)return;e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,{action:b.dataset.action,start:performance.now()});b.classList.add('held');};
  b.onpointerup=e=>{const press=held.get(e.pointerId);if(press&&performance.now()-press.start<100&&(state.work||state.rig.mode==='foot')){const input=controls();for(let i=0;i<10;i++)state=stepCrane(state,input,1/120);}held.delete(e.pointerId);b.classList.remove('held');refresh();};
  for(const event of['pointercancel','lostpointercapture'])b.addEventListener(event,e=>{held.delete(e.pointerId);b.classList.remove('held');});
}
window.addEventListener('keydown',e=>{if($('help').open||$('stock-dialog').open||!ready)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)action('interact');}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
let drag=null;$('scene').onpointerdown=e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,orbit,pitch};$('scene').setPointerCapture(e.pointerId);};
$('scene').onpointermove=e=>{if(drag?.id!==e.pointerId)return;view=0;$('camera').textContent='視点：作業';orbit=drag.orbit-(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.004,.22,1.45);};
for(const type of['pointerup','pointercancel','lostpointercapture'])$('scene').addEventListener(type,()=>drag=null);
$('scene').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.12,170,460);},{passive:false});
new ResizeObserver(()=>{const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe($('scene'));
new ResizeObserver(([entry])=>document.documentElement.style.setProperty('--crane-controls-height',`${entry.target.getBoundingClientRect().height}px`)).observe(document.querySelector('footer'));
function refresh(){
  const aboard=state.rig.mode==='driving',transition=!!state.rig.transition,work=state.work,p=state.parts.find(p=>p.id===state.held),candidate=pickOption(state),preview=placement(state),blocked=!ready||session.blocked||loading;
  $('mode').textContent=aboard?(work?'クレーン作業':'運転中'):transition?'乗り降り中':'徒歩';$('message').textContent=state.rig.mode==='foot'?(time<headContactUntil?`頭上に接触：${headContact}`:state.rig.hit?`接触：${state.rig.hit}`:'床板には歩いて上がれます。ジャンプで頭上も確認できます。'):state.message||state.rig.message;
  $('cargo').textContent=p?`吊り荷：${p.name}`:candidate?`フック下：${candidate.name}`:'吊り荷なし';$('count').textContent=`置場 ${state.parts.filter(p=>!p.fixed&&p.id!==state.held).length} ・吊り荷 ${p?1:0} ・設置 ${state.parts.filter(p=>p.fixed).length} ・保管 ${state.stock.length}`;
  $('material-summary').textContent=`貸出材積：木材 ${unit(state.ledger['earth-timber'].total)} ／ 鉄 ${unit(state.ledger['earth-iron'].total)}`;
  const recovery=returnOption(state);$('return-stock').disabled=blocked||!recovery.ok;$('return-stock').title=recovery.reason;$('return-hint').hidden=!p;$('return-hint').textContent=recovery.reason;$('stock-open').disabled=blocked||transition;
  $('height').textContent=state.rig.mode==='foot'?`足元の高さ ${state.rig.player.y.toFixed(1)} / ${state.rig.player.grounded?'接地':'空中'}`:work?`フック高さ ${hook(state).y.toFixed(1)} / 腕 ${state.boom.reach.toFixed(1)}`:Math.abs(state.rig.vehicle.speed)<.5?'停車中':`走行 ${Math.round(Math.abs(state.rig.vehicle.speed))}`;
  $('position').textContent=state.rig.mode==='foot'?`レン X ${state.rig.player.x.toFixed(1)} / Y ${state.rig.player.y.toFixed(1)} / Z ${state.rig.player.z.toFixed(1)}`:`車体 X ${state.rig.vehicle.x.toFixed(1)} / Z ${state.rig.vehicle.z.toFixed(1)}`;
  $('interact').textContent=aboard?'停車して降りる':transition?'乗り降り中…':'運転席に乗る';$('interact').disabled=blocked||transition||(aboard&&(work||state.deployment>0))||(aboard?!craneExitOption(state):!craneBoardOption(state));
  $('jump').hidden=state.rig.mode!=='foot';
  $('mode-toggle').disabled=blocked||!aboard||!!p||Math.abs(state.rig.vehicle.speed)>.8||state.deployment>0&&state.deployment<1;$('mode-toggle').textContent=work?'走行へ戻る':'クレーン作業へ';
  $('work-controls').hidden=!work||!aboard;$('drive-controls').hidden=work&&aboard;$('pedals').hidden=!aboard;$('move-label').textContent=aboard?'ハンドル':'歩く';document.querySelector('[data-action="forward"]').hidden=aboard;document.querySelector('[data-action="back"]').hidden=aboard;
  for(const b of document.querySelectorAll('[data-action]'))b.disabled=blocked||transition||work&&state.deployment<1;
  $('pick').disabled=blocked||!!p||!candidate;$('pick').textContent=candidate?.fixed?'設置部材を吊り直す':'吊り索を掛ける';$('rotate').disabled=$('release').disabled=blocked||!p||!!state.rotation;$('place').disabled=blocked||!preview?.ok;
  $('rotate').textContent=state.rotation?`回転中 ${Math.round((p.angle-state.rotation.start)*180/Math.PI)}° / 90°`:'部材を90°回す';
  $('snap').textContent=state.snap?'面合わせ ON':'面合わせ OFF';$('snap').setAttribute('aria-pressed',String(state.snap));
  $('precision').textContent=precision?'微調整 ON（¼速）':'微調整 OFF';$('precision').setAttribute('aria-pressed',String(precision));$('precision').disabled=blocked||!work||!aboard||state.deployment<1;
  const h=hook(state);$('hook-position').hidden=!work||!aboard;$('hook-position').textContent=`フック X ${h.x.toFixed(1)} / Z ${h.z.toFixed(1)}${p?`｜部材底 ${p.y.toFixed(1)}`:''}`;
  $('placement-detail').textContent=cranePlacementReadout(state,preview);$('placement-detail').hidden=!p;
  $('placement').hidden=!p;$('placement').textContent=preview?.reason||'';$('placement').classList.toggle('bad',!preview?.ok);$('save').disabled=blocked||session.busy||transition||testMode;
}
async function boot(){
  if(!local){state.message='ローカル開発専用です。';refresh();return;}
  try{if(!testMode){const saved=await session.load();if(saved)state=saved;}ready=true;$('save-status').textContent=testMode?'操作確認用：保存しません':session.savedRevision<0?'新しい普通素材の開発データ':'保存を読み込みました';}catch(e){state.message=e.message;$('save-status').textContent='保存を保護して停止';}refresh();
}
const focus=new THREE.Vector3(0,18,-30);let last=0,accumulator=0,ui=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;time+=dt;
  if(ready&&!session.blocked&&!$('help').open&&!$('stock-dialog').open&&!loading){accumulator+=dt;while(accumulator>=1/120){const before=actorPose(state.rig);state=stepCrane(state,controls(),1/120);if(state.rig.mode==='foot'&&state.rig.player.ceilingHit){headContact=state.rig.hit.replace('（頭上）','');headContactUntil=time+1.2;}const after=actorPose(state.rig);walkPhase+=Math.hypot(before.x-after.x,before.z-after.z)*.2;accumulator-=1/120;}}else accumulator=0;
  updateCraneModel(crane,state,{roofTransparent:roof,steps:state.rig.mode==='driving'?0:1});
  const seated=state.rig.mode==='driving',pose=actorPose(state.rig);if(seated){if(ren.parent!==crane.userData.pilotSocket)crane.userData.pilotSocket.add(ren);ren.position.set(0,0,0);ren.rotation.set(0,0,0);}else{if(ren.parent!==scene)scene.add(ren);ren.position.set(pose.x,pose.y-footBottom,pose.z);ren.rotation.set(0,pose.heading,0);}
  const walking=!seated&&(held.size||keys.size||state.rig.transition);feet.forEach(({o,y},i)=>o.position.y=y+(walking?Math.max(0,Math.sin(walkPhase+i*Math.PI))*1.4:0));hands.forEach(({o,y},i)=>o.position.y=y+(!seated?Math.sin((walking?walkPhase:time*1.8)+i*Math.PI)*.6:0));
  const selected=pickOption(state);for(const m of partMeshes.values())m.visible=false;for(const p of state.parts){const m=partMeshes.get(p.id);m.visible=true;m.position.set(p.x,p.y,p.z);m.rotation.y=p.angle;m.userData.edges.visible=p.id===selected?.id||p.id===state.held;m.userData.edges.material.color.setHex(p.id===state.held?0xa6f8e1:0xffd86e);}
  const h=hook(state);targetRing.visible=state.work;targetRing.position.set(h.x,.25,h.z);const entry=localToWorld(state.rig.vehicle,-58,-8);entryRing.visible=state.rig.mode==='foot';entryRing.position.set(entry.x,.2,entry.z);
  const preview=placement(state);ghost.visible=!!preview;if(preview){const p=preview.candidate;ghost.position.set(p.x,p.y+p.h/2,p.z);ghost.rotation.y=p.angle;ghost.scale.set(p.w,p.h,p.d);ghost.material.color.setHex(preview.ok?0x5befad:0xeb9258);ghostEdges.material.color.setHex(preview.ok?0x74ffa9:0xffb18a);}
  const near=Math.hypot(pose.x-state.rig.vehicle.x,pose.z-state.rig.vehicle.z)<150;
  const v=state.rig.vehicle,target=state.rig.mode==='foot'?new THREE.Vector3(pose.x,pose.y+17,pose.z):state.work?new THREE.Vector3(v.x+(h.x-v.x)*.35,15+Math.max(0,h.y-20)*.3,v.z+(h.z-v.z)*.35):new THREE.Vector3(near?v.x:pose.x,17,near?v.z+20:pose.z);
  focus.lerp(target,1-Math.exp(-dt*6));const yaw=view===1?-Math.PI/2:orbit,angle=view===2?1.4:pitch,dist=(view===2?350:distance)*Math.max(1,.9/camera.aspect);
  camera.position.copy(focus).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(angle),Math.sin(angle),Math.cos(yaw)*Math.cos(angle)).multiplyScalar(dist));camera.lookAt(focus);renderer.render(scene,camera);
  ui+=dt;if(ui>.12){ui=0;refresh();if(ready&&!testMode&&!session.blocked&&state.revision!==session.savedRevision){if(!dirtySince)dirtySince=time;if(!session.busy)$('save-status').textContent='変更あり（自動保存待ち）';if(time-dirtySince>15&&!held.size&&!keys.size&&!state.rig.transition&&Math.abs(state.rig.vehicle.speed)<.01)save();}}
}
window.addEventListener('error',e=>{state.message='表示エラー：'+e.message;refresh();});window.addEventListener('unhandledrejection',e=>{state.message='処理エラー：'+(e.reason?.message||e.reason);refresh();});
await boot();requestAnimationFrame(frame);
