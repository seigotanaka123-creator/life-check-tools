import * as THREE from './assets/three.module.min.js';
import {officialCharacter} from './assets/imasora-construction-layout.js';
import {createDumpModel,updateDumpModel} from './assets/imasora-construction-dump-model.js';
import {createDumpGait} from './assets/imasora-construction-dump-gait.js';
import {createConstructionMovePad} from './assets/imasora-construction-concrete/move-pad.mjs';
import {bindTravelBoost} from './assets/imasora-construction-travel-input.mjs';
import {GRADE_COURSES,gradeHeightAt,gradeSupport,createGradeWorld,gradeStockAction,gradeDepotReady,stepGradeWorld,packGradeWorld,unpackGradeWorld} from './assets/imasora-construction-dump-grade.mjs';
const $=id=>document.getElementById(id),key='imasora-dump-grade-practice-v1',canvas=$('scene'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.5,2000);
scene.background=new THREE.Color(0xcbded8);const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
scene.add(new THREE.HemisphereLight(0xfff9e4,0x617e63,2.8));const sun=new THREE.DirectionalLight(0xffe6bb,3);sun.position.set(-120,250,-100);scene.add(sun);
const truck=createDumpModel(),ren=officialCharacter(),updateGait=createDumpGait(ren);truck.userData.pilotSocket.add(ren);scene.add(truck);const courseRoot=new THREE.Group();scene.add(courseRoot);
let state=createGradeWorld(),paused=false,pending=null,last=performance.now(),uiClock=0,cameraMode=0,yaw=Math.PI+.15,pitch=.45,drag=null,fast=false,brake=false,stick={x:0,z:0},stickSource=null;
const keys=new Set(),heldBoost=new Set(),heldBrake=new Set();
const travelBoost=bindTravelBoost({panel:document.body,enabled:()=>!paused,context:()=> 'driving',show:false});
function terrain(){for(const o of [...courseRoot.children]){o.geometry?.dispose();o.material?.dispose();courseRoot.remove(o);}const points=[],indices=[],colors=[];
 for(let zi=0;zi<=242;zi++)for(let xi=0;xi<=61;xi++){const x=-122+xi*4,z=-242+zi*2,y=gradeHeightAt(state.course,x,z);points.push(x,y,z);const ramp=Math.abs(x)<=72,c=new THREE.Color(ramp?0x8d968b:0xb8af8e);colors.push(c.r,c.g,c.b);}
 for(let zi=0;zi<242;zi++)for(let xi=0;xi<61;xi++){const a=zi*62+xi;indices.push(a,a+62,a+1,a+1,a+62,a+63);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();const road=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9}));courseRoot.add(road);
 // Markings follow the same sampled surface, with a small physical separation.
 for(const x of[-65,65]){const path=[];for(let z=-230;z<=230;z+=2)path.push(new THREE.Vector3(x,gradeHeightAt(state.course,x,z)+.35,z));courseRoot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(path),new THREE.LineBasicMaterial({color:0xffeabb})));}
 const stock=new THREE.Mesh(new THREE.BoxGeometry(32,12,28),new THREE.MeshStandardMaterial({color:0xa16e46}));stock.position.set(-92,6,-180);stock.name='stock';courseRoot.add(stock);
}
function clear(){keys.clear();travelBoost.reset();heldBoost.clear();heldBrake.clear();fast=false;brake=false;stick={x:0,z:0};pad.cancel();drag=null;}
const inputAdapter={beginStick(source){if(stickSource)return false;stickSource=source;return true;},hasStick(source){return source===stickSource;},setStick(source,x,z){if(source!==stickSource)return false;stick={x,z};return true;},release(source){if(source===stickSource){stickSource=null;stick={x:0,z:0};}}};
const pad=createConstructionMovePad({element:$('pad'),input:inputAdapter,enabled:()=>!paused});
function hold(button,set){button.addEventListener('pointerdown',e=>{if(paused||e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);set.add(e.pointerId);});for(const t of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(t,e=>set.delete(e.pointerId));}
hold($('dash'),heldBoost);hold($('brake'),heldBrake);
function save(){try{localStorage.setItem(key,packGradeWorld(state));state={...state,message:'保存しました。次回も同じ場所・積荷から再開できます。'};$('status').textContent=state.message;$('menu-status').textContent='作業を保存しました。';}catch(e){state={...state,message:'保存できませんでした。メニューから控えを作れます。'};$('status').textContent=state.message;$('menu-status').textContent=e.message;}}
$('save').onclick=()=>{clear();state={...state,vehicle:{...state.vehicle,speed:0}};save();};
$('stock').onclick=()=>{try{clear();state=gradeStockAction(state,state.load?'return':'load');refresh();}catch(e){$('status').textContent=e.message;}};
$('camera').onclick=()=>{cameraMode=(cameraMode+1)%3;$('camera').textContent='視点：'+['後方','側方','上方'][cameraMode];};
$('menu-open').onclick=()=>{clear();state={...state,vehicle:{...state.vehicle,speed:0},message:'停車中。現場へ戻って走行を再開できます。'};paused=true;pending=null;$('confirm').hidden=true;$('menu').showModal();};
$('menu').addEventListener('close',()=>{clear();paused=false;last=performance.now();});
function review(value,text){clear();pending=value;$('compare').textContent=text;$('confirm').hidden=false;}
for(const name of Object.keys(GRADE_COURSES))$(name).onclick=()=>review(createGradeWorld(name),'いまの作業を控えてから、土48個で新しい坂の練習を始めます。通常の素材は使いません。');
$('read').onclick=()=>{try{const text=localStorage.getItem(key);if(!text)throw Error('保存した作業はありません。');const s=unpackGradeWorld(text);review(s,`荷台 ${state.load} → ${s.load}個、積込所 ${state.source} → ${s.source}個。合計48個です。`);}catch(e){$('menu-status').textContent=e.message;}};
$('undo').onclick=()=>{try{const text=localStorage.getItem(key+'-before-restore');if(!text)throw Error('復元前の控えはありません。');const s=unpackGradeWorld(text);review(s,`復元前の作業へ戻します。荷台 ${state.load} → ${s.load}個、合計48個です。`);}catch(e){$('menu-status').textContent=e.message;}};
try{$('undo').disabled=!localStorage.getItem(key+'-before-restore');}catch{}
$('export').onclick=()=>{try{$('backup').value=packGradeWorld(state);$('menu-status').textContent='坂道練習の控えを作りました。';}catch(e){$('menu-status').textContent=e.message;}};
$('restore').onclick=()=>{try{const s=unpackGradeWorld($('backup').value);review(s,`荷台 ${state.load} → ${s.load}個、合計48個。現在の作業も控えます。`);}catch(e){pending=null;$('confirm').hidden=true;$('menu-status').textContent=e.message;}};
$('confirm-no').onclick=()=>{pending=null;$('confirm').hidden=true;$('menu-status').textContent='いまの作業を続けます。';};
$('confirm-yes').onclick=()=>{if(!pending)return;try{localStorage.setItem(key+'-before-restore',packGradeWorld(state));state=pending;pending=null;$('undo').disabled=false;$('confirm').hidden=true;terrain();refresh();$('menu-status').textContent='復元しました。現場へ戻って再開できます。';}catch(e){$('menu-status').textContent='復元せず、いまの作業を保持しました。'+e.message;}};
const allowed=['KeyW','KeyA','KeyS','KeyD','Space'];window.addEventListener('keydown',e=>{if(paused||!allowed.includes(e.code)||e.target.closest?.('textarea'))return;e.preventDefault();keys.add(e.code);});window.addEventListener('keyup',e=>keys.delete(e.code));
function suspend(){clear();state={...state,vehicle:{...state.vehicle,speed:0}};if(!$('menu').open){paused=true;$('menu').showModal();}}
window.addEventListener('blur',suspend);window.addEventListener('pagehide',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
canvas.addEventListener('pointerdown',e=>{if(paused||drag||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;yaw=drag.yaw-(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.005,.18,1.3);cameraMode=0;});for(const t of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(t,()=>drag=null);
function refresh(){const p=gradeSupport(state.course,state.vehicle,state.load);$('cargo').textContent=`荷台${state.load}個 / 積込所${state.source}個`;$('speed').textContent=Math.abs(state.vehicle.speed)<.01?'停車中':(state.vehicle.speed>0?'前進 ':'後退 ')+Math.abs(state.vehicle.speed).toFixed(0);$('grade').textContent=`坂${(p.pitch*180/Math.PI).toFixed(1)}° / 横傾き${(p.roll*180/Math.PI).toFixed(1)}°`;$('load-bar').value=state.load;$('stock').disabled=!gradeDepotReady(state);$('stock').textContent=state.load?'土を積込所へ戻す':'土48個を積む';$('status').textContent=state.message;courseRoot.getObjectByName('stock').visible=state.source>0;pad.sync();}
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}).observe(canvas);
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(.001,(now-last)/1000));last=now;
 if(!paused&&!document.hidden){const throttle=keys.has('KeyW')?1:keys.has('KeyS')?-1:-stick.z,steer=keys.has('KeyD')?1:keys.has('KeyA')?-1:stick.x;state=stepGradeWorld(state,{throttle,steer,fast:heldBoost.size>0||travelBoost.fast,brake:keys.has('Space')||heldBrake.size>0},dt);}
 const p=gradeSupport(state.course,state.vehicle,state.load),v=state.vehicle;updateGait(0,{seated:true,paused,sampled:true});updateDumpModel(truck,{rig:{mode:'driving',vehicle:v},load:state.load,bed:0},{roofTransparent:true});truck.position.y=p.y;truck.rotation.set(-p.pitch,v.heading,p.roll,'YXZ');
 const focus=new THREE.Vector3(v.x,p.y+24,v.z),angle=cameraMode===2?1.15:pitch,rot=v.heading+(cameraMode===1?Math.PI/2:yaw),dist=Math.max(180,195/camera.aspect);camera.position.copy(focus).add(new THREE.Vector3(Math.sin(rot)*Math.cos(angle),Math.sin(angle),Math.cos(rot)*Math.cos(angle)).multiplyScalar(dist));camera.lookAt(focus);renderer.render(scene,camera);
 uiClock+=dt;if(uiClock>.12){uiClock=0;refresh();}
}
terrain();refresh();requestAnimationFrame(frame);
