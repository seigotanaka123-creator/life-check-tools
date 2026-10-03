import {bindTravelBoost} from './assets/imasora-construction-travel-input.mjs';
import {setBoardPrompt} from './assets/imasora-construction-boarding.js';
import {soilSize} from './assets/imasora-construction-dump-soil.js?v=526';
import {createDumpGait} from './assets/imasora-construction-dump-gait.js?v=526';
import * as THREE from './assets/three.module.min.js';
import {officialCharacter} from './assets/imasora-construction-layout.js';
import {createDumpModel,updateDumpModel} from './assets/imasora-construction-dump-model.js?v=526';
import {createDumpWorld,dumpAction,stepDumpWorld,dumpTotals,dumpActorPose,dumpBoardOption,dumpGroundObstacles,loadingReady,planDump,DUMP,packDumpWorld,unpackDumpWorld,DUMP_WALLS,LOAD_BAY} from './assets/imasora-construction-dump-truck.js?v=526';
import {localToWorld} from './assets/imasora-construction-loader-physics.js';
const $=id=>document.getElementById(id),scene=new THREE.Scene(),canvas=$('scene');
scene.background=new THREE.Color(0xcbded8);scene.fog=new THREE.Fog(0xcbded8,750,1500);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
const camera=new THREE.PerspectiveCamera(46,1,.5,1800);
scene.add(new THREE.HemisphereLight(0xf6fff7,0x667962,2.5));const sun=new THREE.DirectionalLight(0xffedc8,3.2);sun.position.set(-180,350,80);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-350,right:350,top:300,bottom:-300,near:1,far:850});sun.shadow.normalBias=.15;scene.add(sun);
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.9}),unit=new THREE.BoxGeometry(1,1,1);
function box(x,y,z,w,h,d,color){const o=new THREE.Mesh(unit,mat(color));o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;scene.add(o);return o;}
box(0,-3,0,640,6,500,0xb8af8e);box(0,-10,0,2200,8,2000,0x99b9a0);
for(const z of[-251,251])box(0,8,z,644,16,2,0x688879);for(const x of[-321,321])box(x,8,0,2,16,500,0x688879);
for(const o of DUMP_WALLS)if(o.id!=='積込用の土置場')box(o.x,o.height/2,o.z,o.width,o.height,o.depth,0xa4b4ac);
function marking(o,color){const {x,z,width:w,depth:d}=o;for(const side of[-1,1]){box(x+side*w/2,.15,z,1,.2,d,color);box(x,.15,z+side*d/2,w,.2,1,color);}}
marking(LOAD_BAY,0xfdf5d0);box(-260,.1,-190,110,.1,110,0x799f98);
function label(text,x,z,width){const c=document.createElement('canvas');c.width=768;c.height=128;const g=c.getContext('2d');g.fillStyle='#526c5d';g.font='bold 58px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,384,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.3,z);scene.add(m);}
label('積込所',0,-174,90);
const sourcePile=box(70,9,-110,28,18,48,0xa16e46);box(70,2,-110,34,4,56,0x697c68);
let world=createDumpWorld(),cameraMode=0,orbit=2.7,pitch=.65,distance=205,roofTransparent=false,paused=false,pendingRestore=null,undo=null,fatal=false;
const truck=createDumpModel(),ren=officialCharacter();scene.add(truck,ren);const updateGait=createDumpGait(ren);
const soil=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(0xa16e46),48);soil.castShadow=soil.receiveShadow=true;soil.frustumCulled=false;scene.add(soil);const matrix=new THREE.Matrix4();
const ghostMaterial=new THREE.MeshBasicMaterial({color:0x43c890,transparent:true,opacity:.35,depthWrite:false});
const ghosts=new THREE.InstancedMesh(new THREE.BoxGeometry(DUMP.grain,DUMP.grain,DUMP.grain),ghostMaterial,48);ghosts.frustumCulled=false;scene.add(ghosts);
const outlineGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-25.1,0,-21.1),new THREE.Vector3(25.1,0,-21.1),new THREE.Vector3(25.1,0,21.1),new THREE.Vector3(-25.1,0,21.1),new THREE.Vector3(-25.1,0,-21.1)]);
const outline=new THREE.Line(outlineGeometry,new THREE.LineBasicMaterial({color:0x25a56b}));scene.add(outline);
const dropArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(),18,0x25a56b,5,4);scene.add(dropArrow);
let preview=null,previewKey='';const quantity=()=>Number($('quantity').value)||world.load;
function previewUpdate(){
 const v=world.rig.vehicle,key=[Math.round(v.x),Math.round(v.z),Math.round(v.heading*80),Math.round(v.speed),world.load,world.serial,world.ground.reduce((n,c)=>n+c.n,0),world.pending?.length,world.job,$('quantity').value].join('/');
 if(key===previewKey)return;previewKey=key;
 preview=planDump(world,{amount:quantity(),kind:world.pattern==='spread'&&world.job?'spread':'pile'});
 if(world.job==='unloading'&&world.pending.length)preview={...preview,ok:true,targets:world.pending};
 const visible=world.load>0&&world.rig.mode==='driving',color=preview.ok?0x25a56b:0xdc6447;
 ghosts.visible=outline.visible=dropArrow.visible=visible;ghosts.count=preview.ok?preview.targets.length:0;
 preview.targets.forEach((p,i)=>ghosts.setMatrixAt(i,matrix.makeTranslation(p.x,p.y,p.z)));ghosts.instanceMatrix.needsUpdate=true;
 outline.position.set(preview.center.x,.5,preview.center.z);outline.rotation.y=v.heading;outline.material.color.setHex(color);
 const rear=localToWorld(v,0,-43);dropArrow.position.set(rear.x,1,rear.z);const direction=new THREE.Vector3(preview.center.x-rear.x,0,preview.center.z-rear.z);dropArrow.setDirection(direction.clone().normalize());dropArrow.setLength(Math.max(6,direction.length()-10),5,4);dropArrow.setColor(color);
}
const entry=new THREE.Mesh(new THREE.RingGeometry(12,14,32),new THREE.MeshBasicMaterial({color:0xffdc68,side:THREE.DoubleSide,transparent:true,opacity:.8}));entry.rotation.x=-Math.PI/2;scene.add(entry);
const held=new Map(),keys=new Set();function clearInput(){travelBoost.reset();held.clear();keys.clear();for(const el of document.querySelectorAll('.held'))el.classList.remove('held');}
function action(name){if(paused||fatal)return;clearInput();world=dumpAction(world,name,DUMP_WALLS,quantity());previewKey='';refresh();}
for(const name of['load','dump','spread','stop','interact'])$(name).onclick=()=>action(name);
for(const button of document.querySelectorAll('[data-hold]')){
 button.addEventListener('pointerdown',e=>{if(paused||fatal)return;e.preventDefault();button.setPointerCapture(e.pointerId);held.set(e.pointerId,button.dataset.hold);button.classList.add('held');});
 for(const event of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{held.delete(e.pointerId);button.classList.remove('held');});
}
$('quantity').onchange=()=>{previewKey='';refresh();};
const travelBoost=bindTravelBoost({panel:document.body,enabled:()=>!paused&&!fatal&&!world.job,context:()=>world.rig.mode,show:false});
const codes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space','KeyE'];
window.addEventListener('keydown',e=>{if(paused||fatal||!codes.includes(e.code))return;e.preventDefault();if(e.code==='KeyE'){if(!e.repeat)action('interact');}else keys.add(e.code);});
window.addEventListener('keyup',e=>keys.delete(e.code));
function openMenu(){clearInput();paused=true;pendingRestore=null;$('confirm').hidden=true;if(!$('menu').open)$('menu').showModal();}
function pauseForFocus(){if(fatal)return;clearInput();world=dumpAction(world,'stop');openMenu();}
window.addEventListener('blur',pauseForFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForFocus();});
$('menu-open').onclick=openMenu;$('menu').addEventListener('close',()=>{clearInput();pendingRestore=null;$('confirm').hidden=true;paused=fatal;last=performance.now();});
$('roof').onclick=()=>{roofTransparent=!roofTransparent;$('roof').textContent=roofTransparent?'屋根を戻す':'屋根を透かす';};
$('export').onclick=()=>{try{$('backup').value=packDumpWorld(world);$('backup').select();$('menu-status').textContent='この控えをコピーして保管してください。通常の素材は含みません。';}catch(e){$('menu-status').textContent=e.message;}};
$('restore-open').onclick=()=>{try{pendingRestore=unpackDumpWorld($('backup').value);packDumpWorld(world);const a=dumpTotals(world),b=dumpTotals(pendingRestore);$('compare').textContent=`荷台 ${a.load} → ${b.load}、積込所 ${a.source} → ${b.source}、地面 ${a.ground} → ${b.ground}。合計48個。現在の作業も戻せるよう控えます。`;$('confirm').hidden=false;$('menu-status').textContent='内容を確認し、復元する場合だけ確定してください。';}catch(e){pendingRestore=null;$('confirm').hidden=true;$('menu-status').textContent=e.message;}};
$('restore-cancel').onclick=()=>{pendingRestore=null;$('confirm').hidden=true;$('menu-status').textContent='復元を取り消しました。';};
$('restore-confirm').onclick=()=>{if(!pendingRestore)return;undo=packDumpWorld(world);world=pendingRestore;pendingRestore=null;$('confirm').hidden=true;$('undo').disabled=false;$('menu-status').textContent='復元しました。現在は一時停止中です。';refresh();};
$('undo').onclick=()=>{if(!undo)return;pendingRestore=unpackDumpWorld(undo);$('compare').textContent='復元前の作業に戻します。土の合計は48個です。';$('confirm').hidden=false;};
const down=(name,...cs)=>[...held.values()].includes(name)||cs.some(k=>keys.has(k));
function input(){return travelBoost.input(rawInput());}
function rawInput(){const f=Number(down('forward','KeyW','ArrowUp'))-Number(down('back','KeyS','ArrowDown')),s=Number(down('right','KeyD','ArrowRight'))-Number(down('left','KeyA','ArrowLeft'));if(world.rig.mode==='driving')return{throttle:f,steer:s,brake:down('brake','Space')};const yaw=world.rig.vehicle.heading+orbit;return{x:s*Math.cos(yaw)-f*Math.sin(yaw),z:-s*Math.sin(yaw)-f*Math.cos(yaw)};}
const names=['追従','後方','俯瞰'];$('camera').onclick=()=>{cameraMode=(cameraMode+1)%3;$('camera').textContent='視点：'+names[cameraMode];};
let drag=null;canvas.addEventListener('pointerdown',e=>{if(paused||drag||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,orbit,pitch};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;orbit=drag.orbit-(e.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.005,.22,1.4);cameraMode=0;$('camera').textContent='視点：追従';});
for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.1,130,420);},{passive:false});
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}).observe(canvas);
function refresh(){
 previewUpdate();const t=dumpTotals(world),driving=world.rig.mode==='driving',busy=!!world.job,spreading=world.job==='spread',stopped=Math.abs(world.rig.vehicle.speed)<.01;
 $('mode').textContent=({foot:'徒歩',boarding:'乗車中',driving:'運転中',exiting:'降車中'})[world.rig.mode];$('load-count').textContent='荷台 '+t.load+' / '+DUMP.capacity;$('load-bar').value=t.load;$('soil-count').textContent='積込所'+t.source+' / 地面'+t.ground+' / 落下中'+t.air+' / 合計'+t.total;$('speed').textContent=travelBoost.fast?(driving?'高速走行 2倍':'速歩 2.5倍'):stopped?'停車中':(world.rig.vehicle.speed>0?'前進':'後退')+' '+Math.abs(world.rig.vehicle.speed).toFixed(0);
 $('status').textContent=world.message;$('menu-message').textContent=world.message;
 $('load').disabled=fatal||!loadingReady(world)||!world.source||world.load===DUMP.capacity;
 $('dump').textContent=world.job==='unloading'?'土を降ろしています…':'ここに'+Math.min(quantity(),world.load)+'個降ろす';
 $('dump').disabled=$('spread').disabled=fatal||!driving||busy||!world.load||world.air.length>0;
 $('quantity').disabled=busy;
 const help=$('drop-feedback');help.dataset.ready=String(!!preview.ok);
 help.textContent=!driving?'①乗車 → ②土を積む → 緑の位置へ降ろす':busy?world.message:!world.load?'最大48個を積み、一度の運搬で山や道の下地を作れます。':preview.ok?(stopped?preview.reason:'押すと停車して、緑の位置へ降ろします。'):preview.reason;
 $('interact').textContent=driving?'停車して降りる':world.rig.transition?'乗り降り中…':'運転席に乗る';$('interact').disabled=fatal||!!world.rig.transition||busy||world.bed>0||world.air.length>0||!stopped||(world.rig.mode==='foot'&&!dumpBoardOption(world.rig,[...DUMP_WALLS,...dumpGroundObstacles(world)]));
  setBoardPrompt($('interact'),world.rig.mode,!$('interact').disabled);
 for(const b of document.querySelectorAll('[data-hold]'))b.disabled=fatal||!!world.rig.transition||(driving&&((busy&&!spreading)||(!spreading&&(world.bed>0||world.air.length>0))));
}

function render(travel=0,sampled=true){
 updateGait(travel,{seated:world.rig.mode==='driving',paused:paused||fatal,sampled});
 updateDumpModel(truck,world,{roofTransparent});const pose=dumpActorPose(world.rig);
 if(world.rig.mode==='driving'){if(ren.parent!==truck.userData.pilotSocket)truck.userData.pilotSocket.add(ren);ren.position.set(0,0,0);ren.rotation.set(0,0,0);}
 else{if(ren.parent!==scene)scene.add(ren);ren.position.set(pose.x,pose.y-truck.userData.measurement.footBottom,pose.z);ren.rotation.set(0,pose.heading,0);}
 let n=0;const put=(p,g)=>soil.setMatrixAt(n++,matrix.makeScale(g,g,g).setPosition(p.x,p.y,p.z));for(const cell of world.ground)for(let j=0;j<cell.n;j++){const g=soilSize(cell);put({x:cell.x,y:(j+.5)*g,z:cell.z},g);}for(const p of world.air)put(p,soilSize(p));soil.count=n;soil.instanceMatrix.needsUpdate=true;
 sourcePile.scale.y=Math.max(.01,18*world.source/48);sourcePile.position.y=2+9*world.source/48;sourcePile.visible=world.source>0;
 const marker=localToWorld(world.rig.vehicle,-58,18);entry.position.set(marker.x,.2,marker.z);entry.visible=world.rig.mode==='foot';
 const v=world.rig.vehicle,rearFocus=localToWorld(v,0,world.load||world.air.length||world.job?-18:0),focus=new THREE.Vector3(world.rig.mode==='foot'?(pose.x+v.x)/2:rearFocus.x,18,world.rig.mode==='foot'?(pose.z+v.z)/2:rearFocus.z),yaw=v.heading+(cameraMode===1?Math.PI:orbit),angle=cameraMode===2?1.38:pitch,dist=distance*Math.max(1,.95/camera.aspect);
 camera.position.copy(focus).add(new THREE.Vector3(Math.sin(yaw)*Math.cos(angle),Math.sin(angle),Math.cos(yaw)*Math.cos(angle)).multiplyScalar(dist));camera.lookAt(focus);renderer.render(scene,camera);
}
let last=performance.now(),accumulator=0,ui=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;let travel=0,sampled=false;if(!paused&&!fatal){accumulator+=dt;const controls=input();while(accumulator>=1/120){sampled=true;const before=dumpActorPose(world.rig);world=stepDumpWorld(world,controls,1/120);const after=dumpActorPose(world.rig);if(world.rig.mode!=='driving')travel+=Math.hypot(after.x-before.x,after.z-before.z);accumulator-=1/120;}}else accumulator=0;render(travel,sampled);ui+=dt;if(ui>.12){ui=0;refresh();}}
function fail(message){fatal=true;clearInput();world.message='処理を停止しました：'+message;openMenu();$('menu-status').textContent=world.message;refresh();}
window.addEventListener('error',e=>fail(e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason?.message||String(e.reason)));
window.addEventListener('beforeunload',e=>{if(world.source!==48){e.preventDefault();e.returnValue='';}});
refresh();requestAnimationFrame(frame);
