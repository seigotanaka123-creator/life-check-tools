import * as THREE from './assets/three.module.min.js';
import {officialCharacter,measureCharacter} from './assets/imasora-construction-layout.js';
import {initialWaterBody,waterBodyAction,advanceWaterBody,waterBodyReadout} from './assets/imasora-construction-water-body.js?v=442';
import {createWaterBodyLab,updateWaterBodyLab} from './assets/imasora-construction-water-body-view.js?v=442';
const $=id=>document.getElementById(id);
let state=initialWaterBody(),last=0,ui=0,view=0,yaw=0,pitch=.28,distance=235,drag=null,hitUntil=0,ready=false,focused=true;
const keys=new Set(),pointers=new Map(),taps=new Map(),scene=new THREE.Scene();scene.background=new THREE.Color(0xd7e2d6);scene.fog=new THREE.Fog(0xd7e2d6,1300,2500);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
const camera=new THREE.PerspectiveCamera(44,1,.4,3000);scene.add(new THREE.HemisphereLight(0xf7ffee,0x8c9f91,2.4));const sun=new THREE.DirectionalLight(0xffedca,2.8);sun.position.set(-280,700,370);scene.add(sun);const fill=new THREE.DirectionalLight(0xc6f1ff,1);fill.position.set(300,80,-200);scene.add(fill);
const outside=new THREE.Mesh(new THREE.PlaneGeometry(5000,5000),new THREE.MeshStandardMaterial({color:0xc8d2bd,roughness:1}));outside.rotation.x=-Math.PI/2;outside.position.y=-1;scene.add(outside);
const lab=createWaterBodyLab();scene.add(lab);const ren=officialCharacter(),measure=measureCharacter();scene.add(ren);
const hands=ren.userData.hands.map(o=>({o,y:o.position.y})),feet=ren.userData.feet.map(o=>({o,y:o.position.y}));
function clearInput(){keys.clear();pointers.clear();taps.clear();drag=null;for(const b of document.querySelectorAll('[data-move]'))b.setAttribute('aria-pressed','false');}
function act(action,dir){if(!ready)return;clearInput();try{state=waterBodyAction(state,action,dir);}catch(e){state.message=e.message;}refresh();}
for(const id of['feed','recover','pause','home'])$(id).onclick=()=>act(id);
for(const b of document.querySelectorAll('[data-dir]'))b.onclick=()=>act('direction',Number(b.dataset.dir));
for(const b of document.querySelectorAll('[data-move]')){
  b.onpointerdown=e=>{if(!ready||state.paused||$('help').open)return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.move);taps.set(b.dataset.move,state.time+.12);b.setAttribute('aria-pressed','true');};
  const release=e=>{pointers.delete(e.pointerId);b.setAttribute('aria-pressed','false');};for(const type of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,release);
}
const supported=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
window.addEventListener('keydown',e=>{if(!supported.includes(e.code)||$('help').open||state.paused||e.target instanceof HTMLInputElement)return;e.preventDefault();if(!keys.has(e.code))taps.set(e.code,state.time+.12);keys.add(e.code);});
window.addEventListener('keyup',e=>{if(supported.includes(e.code)){e.preventDefault();keys.delete(e.code);}});
window.addEventListener('blur',()=>{focused=false;clearInput();});window.addEventListener('focus',()=>{focused=true;last=performance.now();});document.addEventListener('visibilitychange',()=>{clearInput();last=performance.now();});
$('view').onclick=()=>{view=(view+1)%2;clearInput();yaw=view?.55:0;pitch=view?.5:.28;$('view').textContent=view?'視点：区画全体':'視点：レンを追う';};
$('help-open').onclick=()=>{clearInput();$('help').showModal();};$('help-close').onclick=()=>$('help').close();$('help').addEventListener('close',()=>{clearInput();last=performance.now();});
$('scene').onpointerdown=e=>{if(drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch};$('scene').setPointerCapture(e.pointerId);};
$('scene').onpointermove=e=>{if(drag?.id!==e.pointerId)return;yaw=drag.yaw-(e.clientX-drag.x)*.007;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.006,-.08,1.3);};
for(const e of['pointerup','pointercancel','lostpointercapture'])$('scene').addEventListener(e,()=>drag=null);
$('scene').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.1,150,650);},{passive:false});
new ResizeObserver(()=>{const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe($('scene'));
function refresh(){const r=waterBodyReadout(state);for(const id of['height','head','total'])$(id).textContent=r[id].toFixed(1);$('wet').textContent=r.wet;$('head-contacts').textContent=r.headContacts;$('tank').textContent=(state.water.reservoir*.25).toFixed(1);$('position').textContent=`X ${state.player.x.toFixed(1)} / Z ${state.player.z.toFixed(1)}`;
  $('contact').textContent=state.paused?'一時停止中':state.player.ceilingHit?`${state.player.hit}に頭が接触`:state.wet>.05?'水流が身体を押しています':state.player.grounded?'地面・足場に立っています':'重力で落下中';
  $('feed').textContent=state.water.feeding?'注水を止める':'注水を始める';$('pause').textContent=state.paused?'再開する':'一時停止';$('message').textContent=state.message;
  for(const b of document.querySelectorAll('[data-dir]'))b.setAttribute('aria-pressed',String(Number(b.dataset.dir)===state.water.directions.rise));
}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;
  // A short tap lasts at least .12 s; repeated taps replace, never queue, the pulse.
  const on=name=>keys.has(name)||[...pointers.values()].includes(name)||(taps.get(name)||0)>state.time,f=Number(on('KeyW')||on('ArrowUp')||on('forward'))-Number(on('KeyS')||on('ArrowDown')||on('back')),side=Number(on('KeyD')||on('ArrowRight')||on('right'))-Number(on('KeyA')||on('ArrowLeft')||on('left'));
  const input={x:side*Math.cos(yaw)-f*Math.sin(yaw),z:-side*Math.sin(yaw)-f*Math.cos(yaw),jump:on('Space')||on('jump')};
  if(ready&&focused&&!$('help').open){const contacts=state.headContacts;state=advanceWaterBody(state,input,dt);if(state.headContacts>contacts)hitUntil=now+650;}
  updateWaterBodyLab(lab,state.water,state.time);ren.position.set(state.player.x,state.player.y-measure.footBottom,state.player.z);ren.rotation.y=state.player.heading;
  const walking=state.player.grounded?Math.min(1,Math.hypot(state.player.vx,state.player.vz)/48):0;
  hands.forEach(({o,y},i)=>o.position.y=y+Math.sin(state.time*(walking?8:1.5)+i*Math.PI)*(.4+walking*1.6));feet.forEach(({o,y},i)=>o.position.y=y+Math.max(0,Math.sin(state.time*8+i*Math.PI))*walking*1.8);
  $('impact').classList.toggle('show',now<hitUntil);
  const target=view?new THREE.Vector3(-40,140,0):new THREE.Vector3(state.player.x,state.player.y+20,state.player.z-5),dist=(view?1150:distance)*Math.max(1,.65/camera.aspect);
  camera.position.copy(target).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist));camera.lookAt(target);renderer.render(scene,camera);
  ui+=dt;if(ui>.1){ui=0;refresh();}
}
window.addEventListener('error',e=>{state.message='表示エラー：'+e.message;refresh();});window.addEventListener('unhandledrejection',e=>{state.message='処理エラー：'+(e.reason?.message||e.reason);refresh();});
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname))ready=true;else state.message='ローカル開発専用です。';refresh();requestAnimationFrame(frame);
