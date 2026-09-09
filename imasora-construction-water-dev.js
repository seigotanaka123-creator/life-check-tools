import * as THREE from './assets/three.module.min.js';
import {officialCharacter} from './assets/imasora-construction-layout.js';
import {WATER,WATER_REGIONS,initialWater,waterAction,advanceWater,waterTotal,directionName,packWater} from './assets/imasora-construction-water.js?v=439';
import {WaterSession} from './assets/imasora-construction-water-storage.js?v=439';
import {createWaterLab,updateWaterLab} from './assets/imasora-construction-water-view.js?v=439';
const $=id=>document.getElementById(id),testMode=new URLSearchParams(location.search).get('waterTest')==='1';
let state=initialWater(),ready=false,selected='rise',orbit=.66,pitch=.56,distance=340,view=0,last=0,elapsed=0,autosave=0,ui=0;
const session=new WaterSession(),scene=new THREE.Scene();scene.background=new THREE.Color(0xd3ded1);scene.fog=new THREE.Fog(0xd3ded1,600,1300);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(42,1,.5,1600);scene.add(new THREE.HemisphereLight(0xf5ffed,0x859e91,2.5));const light=new THREE.DirectionalLight(0xffe9bb,3);light.position.set(-140,230,120);scene.add(light);const fill=new THREE.DirectionalLight(0xc5eeff,1.2);fill.position.set(150,70,-100);scene.add(fill);
const outside=new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),new THREE.MeshStandardMaterial({color:0xc8d2bd,roughness:.9}));outside.rotation.x=-Math.PI/2;outside.position.y=-3;scene.add(outside);
const lab=createWaterLab();scene.add(lab);const ren=officialCharacter();ren.updateMatrixWorld(true);const bottom=new THREE.Box3().setFromObject(ren).min.y;ren.position.set(-99,12-bottom,72);ren.rotation.y=.5;scene.add(ren);
const hands=ren.userData.hands.map(o=>({o,y:o.position.y}));
function act(action,options){if(!ready||session.blocked)return;try{state=waterAction(state,action,options);}catch(e){state.message=e.message;}refresh();}
for(const [id,action] of[['feed','feed'],['pause','pause'],['gate','gate'],['recover','recover'],['route','route']])$(id).onclick=()=>act(action);
for(const r of WATER_REGIONS){const b=document.createElement('button');b.textContent=r.name;b.dataset.region=r.id;b.onclick=()=>{selected=r.id;refresh();};$('regions').append(b);}
for(const b of document.querySelectorAll('[data-dir]'))b.onclick=()=>act('direction',{region:selected,dir:Number(b.dataset.dir)});
$('view').onclick=()=>{view=(view+1)%3;$('view').textContent=['視点：全体','視点：正面','視点：上から'][view];};
$('help-open').onclick=()=>$('help').showModal();$('help-close').onclick=()=>$('help').close();
$('export').onclick=()=>{try{$('export-data').textContent=JSON.stringify(session.blocked?session.raw:packWater(state),null,2);$('export-data').hidden=false;}catch(e){state.message=e.message;refresh();}};
async function save(){if(testMode||!ready||session.busy||session.blocked)return;try{await session.save(state);$('save-status').textContent='火星水専用に保存済み';autosave=0;}catch(e){$('save-status').textContent='保存停止：'+e.message;state.message=e.message;}refresh();}
$('save').onclick=save;
function refresh(){
  const q=Object.values(state.cells).reduce((n,c)=>n+c.q,0);$('reservoir').textContent=(state.reservoir*.25).toFixed(1);$('in-course').textContent=(q*.25).toFixed(1);$('total').textContent=(waterTotal(state)*.25).toFixed(1);
  $('feed').textContent=state.feeding?'注水を止める':'注水を始める';$('pause').textContent=state.running?'流れを止める':'流れを動かす';$('gate').textContent=state.gate?'仕切りを開く':'仕切りを閉じる';$('message').textContent=state.message;
  $('selected-name').textContent=WATER_REGIONS.find(r=>r.id===selected).name;$('direction-name').textContent=directionName(state.directions[selected]);
  for(const b of document.querySelectorAll('[data-region]'))b.setAttribute('aria-pressed',String(b.dataset.region===selected));
  for(const b of document.querySelectorAll('[data-dir]'))b.setAttribute('aria-pressed',String(Number(b.dataset.dir)===state.directions[selected]));
  for(const id of['feed','pause','gate','recover','route'])$(id).disabled=!ready||session.blocked;
  for(const b of document.querySelectorAll('[data-dir]'))b.disabled=!ready||session.blocked;
  $('save').disabled=testMode||!ready||session.blocked||session.busy;
}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let drag=null;
$('scene').onpointerdown=e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,orbit,pitch};$('scene').setPointerCapture(e.pointerId);};
$('scene').onpointermove=e=>{if(drag?.id!==e.pointerId||Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7)return;view=0;$('view').textContent='視点：全体';orbit=drag.orbit-(e.clientX-drag.x)*.007;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.006,.16,1.4);};
$('scene').onpointerup=e=>{if(drag?.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<7){const r=$('scene').getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(lab.userData.pickups)[0];if(hit){selected=hit.object.userData.region;refresh();}}drag=null;};
for(const event of['pointercancel','lostpointercapture'])$('scene').addEventListener(event,()=>drag=null);
window.addEventListener('blur',()=>drag=null);document.addEventListener('visibilitychange',()=>drag=null);
$('scene').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.12,220,550);},{passive:false});
new ResizeObserver(()=>{const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe($('scene'));
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;elapsed+=dt;
  if(ready&&!session.blocked&&!$('help').open){state=advanceWater(state,dt);autosave+=dt;}
  updateWaterLab(lab,state,{selected,dt,time:elapsed});hands.forEach(({o,y},i)=>o.position.y=y+Math.sin(elapsed*1.5+i*Math.PI)*.5);
  const yaw=view===1?0:orbit,p=view===2?1.4:pitch,dist=distance*Math.max(1,.95/camera.aspect);camera.position.set(Math.sin(yaw)*Math.cos(p)*dist,35+Math.sin(p)*dist,Math.cos(yaw)*Math.cos(p)*dist);camera.lookAt(-9,40,0);renderer.render(scene,camera);
  ui+=dt;if(ui>.1){ui=0;refresh();if(ready&&!testMode&&!session.blocked&&state.revision!==session.savedRevision){if(!session.busy)$('save-status').textContent='変更あり（自動保存待ち）';if(autosave>15&&!session.busy)save();}}
}
window.addEventListener('error',e=>{state.message='表示エラー：'+e.message;refresh();});window.addEventListener('unhandledrejection',e=>{state.message='処理エラー：'+(e.reason?.message||e.reason);refresh();});
try{if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname))throw Error('ローカル開発専用です。');if(!testMode){const loaded=await session.load();if(loaded)state=loaded;}ready=true;$('save-status').textContent=testMode?'確認用：保存しません':'火星水専用の保存を使用';}catch(e){state.message=e.message;$('save-status').textContent='保存を保護して停止';}refresh();requestAnimationFrame(frame);
