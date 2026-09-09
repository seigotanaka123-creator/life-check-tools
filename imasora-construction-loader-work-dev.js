import * as THREE from './assets/three.module.min.js';
import {officialCharacter} from './assets/imasora-construction-layout.js';
import {createLoader,updateLoaderModel} from './assets/imasora-construction-loader-work-model.js?v=431';
import {createWorkState,stepWork,workAction,workTotals,soilColumns,packWork} from './assets/imasora-construction-loader-work.js?v=432';
import {startDump,stepDump} from './assets/imasora-construction-loader-dump.js?v=432';
import {LoaderWorkSession,WORK_DB} from './assets/imasora-construction-loader-work-storage.js?v=431';
import {initialLoaderState,stepLoader,actLoader,actorPose,boardOption,exitOption,localToWorld,SITE,OBSTACLES,SAFE_ZONE,approach,loaderDrivingInput} from './assets/imasora-construction-loader-physics.js?v=430';
const $=id=>document.getElementById(id),local=['127.0.0.1','localhost','[::1]'].includes(location.hostname);
// Explicit, non-saving UI regression fixture; never loads or alters the user's work DB.
const dumpCheck=local&&['low','raised'].includes(new URLSearchParams(location.search).get('dumpCheck'))?new URLSearchParams(location.search).get('dumpCheck'):null;
let state=initialLoaderState(),roofTransparent=false,cameraMode=0,orbit=-2.55,pitch=.58,distance=185,stepAmount=1,walkPhase=0;
const workSession=new LoaderWorkSession();let workWorld=createWorkState(),saveText='未保存',workReady=false;
if(dumpCheck){
  workWorld=workAction(workWorld,'interact');
  for(let i=0;i<252;i++)workWorld=stepWork(workWorld,{},1/120);
  for(let i=0;i<960;i++)workWorld=stepWork(workWorld,{throttle:1},1/120);
  for(let i=0;i<204;i++)workWorld=stepWork(workWorld,{throttle:-1},1/120);
  for(let i=0;i<120;i++)workWorld=stepWork(workWorld,{brake:true},1/120);
  if(dumpCheck==='raised')for(let i=0;i<240;i++)workWorld=stepWork(workWorld,{raise:true,curl:true},1/120);
  state=workWorld.loader;workReady=true;saveText='保存しない操作テスト';workWorld.message='保存しない操作テストです。「こぼす」を1回押してください。';
  document.querySelector('header span').textContent='荷下ろし操作テスト・保存なし';
}else if(local){try{workWorld=await workSession.load()||workWorld;state=workWorld.loader;workReady=true;saveText=workSession.generation?'保存を復元しました':'新しい貸出土32で開始';}catch(e){saveText=`保存を保護して停止：${e.message}`;}}
const held=new Map(),keys=new Set(),scene=new THREE.Scene();scene.background=new THREE.Color(0xd6e5df);scene.fog=new THREE.Fog(0xd6e5df,800,1600);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.PerspectiveCamera(46,1,.5,2000);
scene.add(new THREE.HemisphereLight(0xf4faf4,0x748d78,2.35));const sun=new THREE.DirectionalLight(0xfff2cf,3.5);sun.position.set(-210,350,160);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-380,right:380,top:320,bottom:-320,near:1,far:900});sun.shadow.normalBias=.15;scene.add(sun);
const fill=new THREE.DirectionalLight(0xd5eeee,1);fill.position.set(160,100,-160);scene.add(fill);
const boxGeo=new THREE.BoxGeometry(1,1,1),obstacleMeshes=[];
function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.9,...extra});}
function box(x,y,z,w,h,d,mat,name=''){const o=new THREE.Mesh(boxGeo,mat);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;o.name=name;scene.add(o);return o;}
const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#c4b790';ctx.fillRect(0,0,256,256);let seed=429;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
for(let i=0;i<3600;i++){ctx.fillStyle=rnd()>.5?'#7166471c':'#fffcdf25';ctx.fillRect(rnd()*256,rnd()*256,1+rnd()*2,1+rnd()*2);}ctx.strokeStyle='#8d886123';ctx.strokeRect(.5,.5,255,255);
const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(16,12.5);texture.anisotropy=4;
const ground=new THREE.Mesh(new THREE.PlaneGeometry(640,500),material(0xffffff,{map:texture}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
box(0,-4.1,0,644,8,504,material(0x899784),'site-foundation');
const outside=new THREE.Mesh(new THREE.PlaneGeometry(2400,2400),material(0xaabfaf));outside.rotation.x=-Math.PI/2;outside.position.y=-9;scene.add(outside);
const concrete=material(0xa9b3a4),dark=material(0x536b5f),gold=material(0xe2ae42),white=material(0xffefd0);
for(const o of OBSTACLES){const m=box(o.x,o.height/2,o.z,o.width,o.height,o.depth,concrete,o.id);obstacleMeshes.push(m);for(let i=-1;i<=1;i++)box(o.x+i*o.width/3,o.height+.15,o.z,o.width/3-.7,.3,o.depth-.5,material(i%2?0x819780:0xc4c8ab),'concrete-cap');}
for(const z of[-251,251]){obstacleMeshes.push(box(0,9,z,644,18,2,dark,'外周の柵'));for(let x=-310;x<320;x+=26)box(x,19,z,2,2,3,gold);}
for(const x of[-321,321]){obstacleMeshes.push(box(x,9,0,2,18,500,dark,'外周の柵'));for(let z=-238;z<250;z+=26)box(x,19,z,3,2,2,gold);}
const safe=box(SAFE_ZONE.x,.07,SAFE_ZONE.z,SAFE_ZONE.width,.14,SAFE_ZONE.depth,material(0x83aaa0),'歩行者退避エリア');safe.castShadow=false;
for(const x of[-315,-205])for(let z=-243;z<=-135;z+=27)box(x,5,z,3,10,3,white,'歩行エリア標柱');
for(const z of[-245,-135])for(let x=-288;x<=-207;x+=27)box(x,5,z,3,10,3,white,'歩行エリア標柱');
// Parking paint / route dashes are flat markings, not raised invisible road colliders.
for(const x of[-50,50])box(x,.11,-80,.7,.12,130,white);
for(const z of[-145,-15])box(0,.11,z,100,.12,.7,white);
for(let z=-210;z<210;z+=30)for(const x of[-190,195])box(x,.1,z,.7,.1,13,white);
for(let x=-180;x<190;x+=30)for(const z of[-170,170])box(x,.1,z,13,.1,.7,white);
function groundText(text,x,z,w,d,color){const c=document.createElement('canvas');c.width=512;c.height=128;const k=c.getContext('2d');k.fillStyle=color;k.font='bold 58px "Yu Gothic",sans-serif';k.textAlign='center';k.textBaseline='middle';k.fillText(text,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));o.rotation.x=-Math.PI/2;o.position.set(x,.18,z);scene.add(o);}
groundText('01  ローダー',0,-134,77,19,'#fff2d0');groundText('歩行エリア',-260,-190,83,21,'#fcffe7');
for(const x of[-90,90])box(x,.12,18,.8,.1,120,white);
groundText('普通の土',0,78,65,16,'#ffe8b0');groundText('荷下ろしは 空いている地面へ',-80,-200,170,16,'#fff4d3');
const soilMaterial=material(0xa26a39),soilMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(4,4,4),soilMaterial,256),fallMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(3.9,3.9,3.9),soilMaterial,256);
soilMesh.name='土の山';fallMesh.name='落下中の土';for(const m of[soilMesh,fallMesh]){m.castShadow=m.receiveShadow=true;m.frustumCulled=false;scene.add(m);}const soilMatrix=new THREE.Matrix4();let soilStamp='';
function renderSoil(){
  const stamp=JSON.stringify(workWorld.ground);if(stamp!==soilStamp){soilStamp=stamp;let i=0;for(const o of soilColumns(workWorld))for(let y=0;y<o.n;y++){soilMesh.setMatrixAt(i,soilMatrix.makeTranslation(o.x,(y+.5)*4,o.z));soilMesh.setColorAt(i,new THREE.Color().setHSL(.082,.40,.31+((o.gx*17+o.gz*7+y*3)%7+7)%7*.013));i++;}soilMesh.count=i;soilMesh.instanceMatrix.needsUpdate=true;if(soilMesh.instanceColor)soilMesh.instanceColor.needsUpdate=true;}
  fallMesh.count=workWorld.air.length;workWorld.air.forEach((p,i)=>fallMesh.setMatrixAt(i,soilMatrix.makeTranslation(p.x,p.y,p.z)));fallMesh.instanceMatrix.needsUpdate=true;
}
const loader=createLoader();scene.add(loader);const ren=officialCharacter();scene.add(ren);const footBottom=loader.userData.measurement.footBottom;
const feet=ren.userData.feet.map(o=>({o,y:o.position.y})),hands=ren.userData.hands.map(o=>({o,y:o.position.y}));
const ring=new THREE.Mesh(new THREE.RingGeometry(13,15,40),new THREE.MeshBasicMaterial({color:0xffd970,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;scene.add(ring);
const entryArrow=new THREE.Mesh(new THREE.ConeGeometry(2.8,7,3),new THREE.MeshBasicMaterial({color:0xffd066}));scene.add(entryArrow);
let prepareBucket=false,dumpTask=null;
function cancelDump(){if(dumpTask){dumpTask=null;workWorld.message='荷下ろしを中断しました。残りの土はバケットに保持しています。';}}
function clearInput(){held.clear();keys.clear();prepareBucket=false;cancelDump();document.querySelectorAll('.held').forEach(o=>o.classList.remove('held'));}
function toggleDump(){if(!workReady||workSession.blocked||workSession.busy)return;const stopping=!!dumpTask;clearInput();if(!stopping){dumpTask=startDump(workWorld);workWorld.message=dumpTask?'荷下ろしを始めます。「止める」で中断できます。':'バケットに土がありません。先に土をすくってください。';}refresh();}
function interact(){clearInput();workWorld=workAction(workWorld,'interact');state=workWorld.loader;refresh();}
$('interact').onclick=interact;$('home').onclick=()=>{clearInput();workWorld=workAction(workWorld,'home');state=workWorld.loader;refresh();};
async function saveWork(){if(dumpCheck||!workReady||workSession.busy||workSession.blocked||state.transition||dumpTask)return;clearInput();state.vehicle.speed=0;workWorld.loader=state;saveText='保存中…';refresh();try{await workSession.save(workWorld);saveText='保存済み';}catch(e){saveText=`保存停止：${e.message}`;}refresh();}
$('work-save').onclick=saveWork;$('work-export').onclick=()=>{try{if(!workReady&&!workSession.raw)throw new Error('読み出せた保存原本がありません。');$('work-backup').value=workReady?packWork(workWorld):JSON.stringify({database:WORK_DB,protectedRecord:workSession.raw});$('work-backup').hidden=false;}catch(e){saveText=e.message;refresh();}};
$('bucket-ready').onclick=()=>{clearInput();prepareBucket=true;};
$('roof').onclick=()=>{roofTransparent=!roofTransparent;$('roof').setAttribute('aria-pressed',String(roofTransparent));$('roof').textContent=roofTransparent?'屋根を戻す':'屋根を透かす';};
const cameraNames=['追従','左側','正面','俯瞰'];$('camera').onclick=()=>{cameraMode=(cameraMode+1)%4;$('camera').textContent=`視点：${cameraNames[cameraMode]}`;};
function help(show){clearInput();$('help').hidden=!show;}$('help-open').onclick=()=>help(true);$('help-close').onclick=()=>help(false);
for(const b of document.querySelectorAll('[data-action]')){
  if(b.dataset.action==='tip'){b.onclick=toggleDump;continue;}
  b.addEventListener('pointerdown',e=>{e.preventDefault();cancelDump();prepareBucket=false;b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.action);b.classList.add('held');});
  for(const event of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{held.delete(e.pointerId);b.classList.remove('held');});
}
window.addEventListener('keydown',e=>{if(!$('help').hidden)return;if(e.code==='KeyT'){e.preventDefault();if(!e.repeat)toggleDump();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyR','KeyF','KeyQ'].includes(e.code)){e.preventDefault();cancelDump();prepareBucket=false;keys.add(e.code);if(e.code==='KeyE'&&!e.repeat)interact();}});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
const down=(action,...codes)=>[...held.values()].includes(action)||codes.some(c=>keys.has(c));
function controls(){
  const left=down('left','KeyA','ArrowLeft'),right=down('right','KeyD','ArrowRight');
  if(state.mode==='driving'){
    const work={raise:down('raise','KeyR'),lower:down('lower','KeyF'),curl:down('curl','KeyQ'),tip:false,release:false};
    if(work.raise||work.lower||work.curl)prepareBucket=false;
    if(prepareBucket){if(Math.abs(workWorld.bucket.tilt)>.009){work.curl=workWorld.bucket.tilt>0;work.tip=workWorld.bucket.tilt<0;}else if(workWorld.bucket.lift>.005)work.lower=true;else prepareBucket=false;}
    return{...loaderDrivingInput(held.values(),keys),...work};
  }
  const f=Number(down('forward','KeyW','ArrowUp'))-Number(down('back','KeyS','ArrowDown')),s=Number(right)-Number(left);
  const yaw=viewYaw();return{x:s*Math.cos(yaw)-f*Math.sin(yaw),z:-s*Math.sin(yaw)-f*Math.cos(yaw)};
}
function viewYaw(){return state.vehicle.heading+(cameraMode===1?-Math.PI/2:cameraMode===2?0:orbit);}
let drag=null;
$('scene').onpointerdown=e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,orbit,pitch};$('scene').setPointerCapture(e.pointerId);};
$('scene').onpointermove=e=>{if(drag?.id!==e.pointerId)return;cameraMode=0;$('camera').textContent='視点：追従';orbit=drag.orbit-(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.005,.18,1.35);};
for(const type of['pointerup','pointercancel','lostpointercapture'])$('scene').addEventListener(type,()=>drag=null);
$('scene').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.09,105,300);},{passive:false});
new ResizeObserver(()=>{const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}).observe($('scene'));
const modes={foot:'徒歩',boarding:'乗車中',driving:'運転中',exiting:'降車中'};
function refresh(){
  const driving=state.mode==='driving',transition=!!state.transition;
  document.body.classList.toggle('driving',driving);document.querySelector('.pedals').hidden=!driving;$('pad-label').textContent=driving?'ハンドル':'歩く';
  $('mode').textContent=modes[state.mode];$('speed').textContent=Math.abs(state.vehicle.speed)<.8?'停車中':`走行 ${Math.round(Math.abs(state.vehicle.speed))}`;$('gear').textContent=driving?(state.vehicle.speed<-.8?'後退':state.vehicle.speed>.8?'前進':'停止'):'';
  $('status').textContent=workReady?workWorld.message:saveText;$('interact').textContent=state.mode==='foot'?'運転席に乗る':driving?'停車して降りる':state.mode==='boarding'?'乗り込んでいます…':'降りています…';
  const soilObstacles=[...OBSTACLES,...soilColumns(workWorld)];
  $('interact').disabled=!workReady||workSession.blocked||transition||(state.mode==='foot'?!boardOption(state,soilObstacles):Math.abs(state.vehicle.speed)>.8);
  $('action-hint').textContent=transition?'乗り降りの間は車両を止めています':driving?(Math.abs(state.vehicle.speed)>.8?'ブレーキを押して停車してください':exitOption(state,soilObstacles)?'降りる経路の空きを確認済み':'両側が塞がっています。開いた場所へ移動してください'):boardOption(state,soilObstacles)?'運転席側のステップから乗れます':'車体左側の黄色い目印へ近づいてください';
  const a=actorPose(state);$('vehicle-position').textContent=`X ${state.vehicle.x.toFixed(1)} / Z ${state.vehicle.z.toFixed(1)} / 向き ${(state.vehicle.heading*180/Math.PI).toFixed(1)}°`;$('actor-position').textContent=`X ${a.x.toFixed(1)} / Y ${a.y.toFixed(1)} / Z ${a.z.toFixed(1)}`;$('contact').textContent=state.hit||'なし';
  const totals=workTotals(workWorld);$('load-amount').textContent=`積載 ${(totals.bucket/1000).toFixed(2)} / 6`;$('load-bar').value=workWorld.load;$('soil-total').textContent=`地面 ${(totals.ground/1000).toFixed(2)} ＋ 落下中 ${(totals.air/1000).toFixed(2)} ＋ 積載 ${(totals.bucket/1000).toFixed(2)} ＝ ${(totals.total/1000).toFixed(2)}`;
  $('bucket-pose').textContent=`アーム ${Math.round(workWorld.bucket.lift*100)}% ／ 傾き ${Math.round(workWorld.bucket.tilt*180/Math.PI)}°`;$('save-status').textContent=dumpCheck?'保存しない操作テスト':workSession.blocked||!workReady?saveText:workSession.busy?'保存中…':workSession.savedRevision===workWorld.revision?'保存済み':'未保存（停車後に自動保存）';
  $('work-controls').hidden=!driving;$('work-save').disabled=!!dumpCheck||!workReady||workSession.blocked||workSession.busy||transition||!!dumpTask;
  const dumpButton=document.querySelector('[data-action="tip"]');dumpButton.textContent=dumpTask?'■ 止める':'↷ こぼす';dumpButton.setAttribute('aria-pressed',String(!!dumpTask));dumpButton.disabled=!workReady||workSession.blocked||workSession.busy||(!dumpTask&&!workWorld.load);
}
const ray=new THREE.Raycaster(),focus=new THREE.Vector3(-22,16,-80);let last=0,accumulator=0,ui=0,time=0;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;time+=dt;
  if(workReady&&!workSession.blocked&&!workSession.busy&&$('help').hidden){accumulator+=dt;while(accumulator>=1/120){const before=actorPose(state),was=state.mode;if(dumpTask){const result=stepDump(workWorld,dumpTask,1/120);workWorld=result.world;dumpTask=result.task;}else workWorld=stepWork(workWorld,controls(),1/120);state=workWorld.loader;const after=actorPose(state);if(state.mode!=='driving')walkPhase+=Math.hypot(after.x-before.x,after.z-before.z)*.2;if(was!==state.mode){clearInput();refresh();}accumulator-=1/120;}}else accumulator=0;
  const foldSteps=state.mode==='driving'||(state.mode==='boarding'&&state.transition.elapsed/state.transition.duration>.75);
  stepAmount=approach(stepAmount,foldSteps?0:1,dt*3);updateLoaderModel(loader,state.vehicle,{steps:stepAmount,roofTransparent,bucket:workWorld.bucket,load:workWorld.load});renderSoil();
  loader.visible=soilMesh.visible=fallMesh.visible=ren.visible=workReady;
  const seated=state.mode==='driving',pose=actorPose(state);
  if(seated){if(ren.parent!==loader.userData.pilotSocket)loader.userData.pilotSocket.add(ren);ren.position.set(0,0,0);ren.rotation.set(0,0,0);}
  else{if(ren.parent!==scene)scene.add(ren);ren.position.set(pose.x,pose.y-footBottom,pose.z);ren.rotation.set(0,pose.heading,0);}
  const walking=!seated&&(state.transition||held.size||keys.size);feet.forEach(({o,y},i)=>o.position.y=y+(walking?Math.max(0,Math.sin(walkPhase+i*Math.PI))*1.4:0));hands.forEach(({o,y},i)=>o.position.y=y+(!seated?Math.sin((walking?walkPhase:time*1.8)+i*Math.PI)*.6:0));
  const entry=localToWorld(state.vehicle,-58,-8);ring.position.set(entry.x,.2,entry.z);ring.visible=entryArrow.visible=workReady&&state.mode==='foot';entryArrow.position.set(entry.x,9+Math.sin(time*2)*1.1,entry.z);entryArrow.rotation.z=Math.PI;
  const near=Math.hypot(pose.x-state.vehicle.x,pose.z-state.vehicle.z)<110;
  const target=new THREE.Vector3(seated||state.transition?state.vehicle.x:near?(pose.x+state.vehicle.x)/2:pose.x,seated?17:16,seated||state.transition?state.vehicle.z:near?(pose.z+state.vehicle.z)/2:pose.z);focus.lerp(target,1-Math.exp(-dt*9));
  const yaw=viewYaw(),angle=cameraMode===3?1.4:pitch,dist=(cameraMode===3?230:distance)*Math.max(1,.82/camera.aspect);
  const desired=focus.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(angle),Math.sin(angle),Math.cos(yaw)*Math.cos(angle)).multiplyScalar(dist));
  const direction=desired.clone().sub(focus);ray.set(focus,direction.clone().normalize());ray.far=direction.length();const hit=ray.intersectObjects(obstacleMeshes,false)[0];if(hit)desired.copy(focus).addScaledVector(direction.normalize(),Math.max(20,hit.distance-4));camera.position.copy(desired);camera.lookAt(focus);renderer.render(scene,camera);
  ui+=dt;if(ui>.12){ui=0;refresh();}
}
function stopOnError(message){clearInput();workSession.blocked=true;saveText=message;workWorld.message=message;refresh();}
window.addEventListener('error',e=>stopOnError(`表示エラー：${e.message}`));window.addEventListener('unhandledrejection',e=>stopOnError(`処理エラー：${e.reason?.message??e.reason}`));
if(!local)saveText='ローカル開発専用の確認画面です。';refresh();requestAnimationFrame(frame);
setInterval(()=>{if(!dumpCheck&&workReady&&!workSession.blocked&&!workSession.busy&&workSession.savedRevision!==workWorld.revision&&!state.transition&&Math.abs(state.vehicle.speed)<.01&&!workWorld.air.length&&!held.size&&!keys.size&&!prepareBucket&&!dumpTask)saveWork();},2500);
window.addEventListener('beforeunload',e=>{if(!dumpCheck&&workReady&&workSession.savedRevision!==workWorld.revision){e.preventDefault();e.returnValue='';}});
