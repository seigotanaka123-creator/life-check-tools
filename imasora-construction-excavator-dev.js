import * as THREE from './assets/three.module.min.js';
import {officialCharacter,measureCharacter} from './assets/imasora-construction-layout.js';
import {createConstructionGround} from './assets/imasora-construction-ground.js';
import {FACES} from './assets/imasora-construction-terrain.js';
import {loaderDrivingInput} from './assets/imasora-construction-loader-physics.js';
import {initialExcavator,actExcavator,stepExcavator,armPose,scoopTargets,totals,excavatorActorPose,PLOT,BIN,CELL,EX} from './assets/imasora-construction-excavator.js?v=465';
import {createExcavator,updateExcavatorModel} from './assets/imasora-construction-excavator-model.js?v=465';
export function startExcavatorView({initial=initialExcavator,actState=actExcavator,stepState=stepExcavator,walking=false,example='dig',setup=null}={}){
const $=id=>document.getElementById(id),local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
let state=initial(),orbit=walking&&example!=='dig'?Math.PI:-2.4,pitch=.6,distance=275,cameraMode=0,roofTransparent=false,revision=-1,ui=0,phase=0,eyeView=false,extension=null;
let boardingRate=1;
if(local&&new URLSearchParams(location.search).has('boardingInspection')){
  const button=document.createElement('button');button.id='boarding-inspection';button.textContent='乗降確認：通常';document.querySelector('.views').append(button);
  button.onclick=()=>{boardingRate=boardingRate===1?.25:boardingRate===.25?0:1;button.textContent=`乗降確認：${boardingRate===1?'通常':boardingRate===.25?'4倍スロー':'停止中'}`;};
}
const held=new Map(),keys=new Set(),pulses=new Map(),pressStarts=new Map(),scene=new THREE.Scene();scene.background=new THREE.Color(0xd5e1df);scene.fog=new THREE.Fog(0xd5e1df,700,1600);
const renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.PerspectiveCamera(46,1,.5,1900);scene.add(new THREE.HemisphereLight(0xf6fbf6,0x797358,2.4));
const sun=new THREE.DirectionalLight(0xffefc8,3.1);sun.position.set(-170,290,130);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-340,right:340,top:290,bottom:-290,far:900});sun.shadow.normalBias=.2;scene.add(sun);
const fill=new THREE.DirectionalLight(0xe5f4fa,1.2);fill.position.set(150,100,-150);scene.add(fill);
const materials={soil:new THREE.MeshStandardMaterial({color:0xbe9159,roughness:1}),dark:new THREE.MeshStandardMaterial({color:0x455d57,roughness:.8}),rim:new THREE.MeshStandardMaterial({color:0xd3a143,metalness:.25,roughness:.6}),bin:new THREE.MeshStandardMaterial({color:0x478b92,metalness:.2,roughness:.65})};
const cube=new THREE.BoxGeometry(1,1,1);function box(x,y,z,w,h,d,m,name=''){const o=new THREE.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;o.name=name;scene.add(o);return o;}
// Reuse the approved soil appearance, but leave the editable plot open down to bedrock.
const ground=createConstructionGround({world:{width:640,depth:500,layoutWidth:640,layoutDepth:500},palette:{edge:0x967649}}),groundMat=ground.children[0].material;
for(const [x0,x1,z0,z1]of [[-320,PLOT.minX,-250,250],[PLOT.maxX,320,-250,250],[PLOT.minX,PLOT.maxX,-250,PLOT.minZ],[PLOT.minX,PLOT.maxX,PLOT.maxZ,250]]){
  const geo=new THREE.PlaneGeometry(x1-x0,z1-z0);geo.rotateX(-Math.PI/2);geo.translate((x0+x1)/2,0,(z0+z1)/2);const uv=geo.attributes.uv,p=geo.attributes.position,colors=[],color=new THREE.Color(0xbe9159);
  for(let i=0;i<p.count;i++){uv.setXY(i,p.getX(i)/48,p.getZ(i)/48);colors.push(color.r,color.g,color.b);}geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const m=new THREE.Mesh(geo,groundMat);m.receiveShadow=true;scene.add(m);
}
ground.children.forEach(o=>o.geometry.dispose());
box(32,-36,112,128,8,128,materials.dark,'掘削区画の岩盤');
const background=new THREE.Mesh(new THREE.PlaneGeometry(2600,2600),materials.dark);background.rotation.x=-Math.PI/2;background.position.y=-44;scene.add(background);
for(const z of[-250,250]){box(0,10,z,640,20,2,materials.dark,'柵');for(let x=-310;x<=310;x+=32)box(x,21,z,3,3,3,materials.rim);}
for(const x of[-320,320]){box(x,10,0,2,20,500,materials.dark,'柵');for(let z=-240;z<=240;z+=32)box(x,21,z,3,3,3,materials.rim);}
box(BIN.x,1.5,BIN.z,BIN.width,3,BIN.depth,materials.bin,'受け箱底');for(const x of[-1,1])box(BIN.x+x*(BIN.width/2-1.5),5,BIN.z,3,10,BIN.depth,materials.bin,'受け箱の縁');for(const z of[-1,1])box(BIN.x,5,BIN.z+z*(BIN.depth/2-1.5),BIN.width,10,3,materials.bin,'受け箱の縁');
function label(text,x,y,z,w){const c=document.createElement('canvas');c.width=512;c.height=128;const k=c.getContext('2d');k.fillStyle='#f6efd1';k.fillRect(0,0,512,128);k.fillStyle='#364f47';k.font='bold 44px sans-serif';k.textAlign='center';k.textBaseline='middle';k.fillText(text,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w/4),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,y,z);scene.add(m);return m;}
label('普通の土',32,31,176.5,56).rotation.y=Math.PI;label('土の受け箱',BIN.x,6,BIN.z-BIN.depth/2-.2,45).rotation.y=Math.PI;
if(walking&&example!=='dig')label(example==='gallery'?'横穴の徒歩確認例':'深掘りの徒歩確認例',32,37,175.5,75).rotation.y=Math.PI;
const excavator=createExcavator(),ren=officialCharacter(),footBottom=measureCharacter().footBottom;scene.add(excavator,ren);
const feet=ren.userData.feet.map(o=>({o,y:o.position.y})),hands=ren.userData.hands.map(o=>({o,y:o.position.y}));
let terrain=null;const particles=new THREE.InstancedMesh(new THREE.BoxGeometry(7.8,7.8,7.8),materials.soil,1792);particles.frustumCulled=false;particles.castShadow=particles.receiveShadow=true;scene.add(particles);
const binPile=new THREE.InstancedMesh(new THREE.BoxGeometry(6.5,5,6.5),materials.soil,200);binPile.frustumCulled=false;binPile.castShadow=true;scene.add(binPile);
const selection=new THREE.InstancedMesh(new THREE.BoxGeometry(8.2,8.2,8.2),new THREE.MeshBasicMaterial({color:0x63edb0,transparent:true,opacity:.35,depthWrite:false}),EX.capacity);selection.frustumCulled=false;scene.add(selection);
const cursor=new THREE.Mesh(new THREE.TorusGeometry(7,.5,6,28),new THREE.MeshBasicMaterial({color:0x8ef7c3,depthTest:false}));cursor.rotation.x=Math.PI/2;cursor.renderOrder=4;scene.add(cursor);
const mat4=new THREE.Matrix4();
function rebuild(){
  if(revision===state.revision)return;revision=state.revision;
  const vertices=[],normals=[],colors=[];
  for(const p of Object.values(state.terrain))for(const f of FACES){if(state.terrain[p.map((n,i)=>n+f.normal[i]).join(',')])continue;const c=new THREE.Color(p[1]>=0?0xbe9159:0xaa7847).multiplyScalar(.97+.03*((p[0]*7+p[2]*3+40)%4));
    for(const index of [0,1,2,0,2,3]){vertices.push(...f.vertices[index].map((v,i)=>(p[i]+v)*CELL));normals.push(...f.normal);colors.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
  if(terrain){terrain.geometry.dispose();terrain.geometry=g;}else{terrain=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));terrain.castShadow=terrain.receiveShadow=true;scene.add(terrain);}
  binPile.count=Math.min(state.bin,200);for(let i=0;i<binPile.count;i++)binPile.setMatrixAt(i,mat4.makeTranslation(BIN.x+(i%7-3)*7,5+Math.floor(i/35)*5,BIN.z+(Math.floor(i/7)%5-2)*7));binPile.instanceMatrix.needsUpdate=true;
}
function clear(){held.clear();keys.clear();pulses.clear();pressStarts.clear();document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function act(action){clear();if(local){if(extension?.onAction?.(action))return;state=actState(state,action);refresh();}}
for(const id of['interact','work','scoop','dump','home'])$(id).onclick=()=>act(id);
for(const b of document.querySelectorAll('[data-hold]')){
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.hold);pressStarts.set(e.pointerId,performance.now());pulses.delete(b.dataset.hold);b.classList.add('held');};
  b.onpointerup=e=>{const elapsed=(performance.now()-(pressStarts.get(e.pointerId)??-Infinity))/1000;if(elapsed<.16)pulses.set(b.dataset.hold,.16-elapsed);};
  // A brief tap is a small immediate nudge; a hold remains continuous. No action queue.
  b.onclick=e=>{if(e.detail===0)pulses.set(b.dataset.hold,.16);};
  b.onpointercancel=()=>pulses.delete(b.dataset.hold);
  for(const event of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{held.delete(e.pointerId);pressStarts.delete(e.pointerId);b.classList.remove('held');});
}
window.addEventListener('keydown',e=>{if(!$('help').hidden)return;if(['KeyW','KeyA','KeyS','KeyD','Space','KeyR','KeyF','KeyT','KeyG','KeyQ','KeyE'].includes(e.code)){e.preventDefault();keys.add(e.code);}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
const down=(a,k)=>[...held.values()].includes(a)||pulses.has(a)||keys.has(k),axis=(a,b,k,l)=>Number(down(a,k))-Number(down(b,l));
function controls(){if(state.loader.mode==='working')return{boom:axis('boom-up','boom-down','KeyR','KeyF'),stick:axis('stick-out','stick-in','KeyT','KeyG'),slew:axis('slew-right','slew-left','KeyE','KeyQ')};
  if(state.loader.mode==='driving')return loaderDrivingInput([...held.values(),...pulses.keys()].map(a=>a==='forward'?'accelerate':a==='back'?'reverse':a),keys);
  const f=axis('forward','back','KeyW','KeyS'),r=axis('right','left','KeyD','KeyA'),yaw=state.loader.vehicle.heading+orbit;return{x:r*Math.cos(yaw)-f*Math.sin(yaw),z:-r*Math.sin(yaw)-f*Math.cos(yaw),jump:walking&&down('jump','Space')};}
$('roof').onclick=()=>{roofTransparent=!roofTransparent;$('roof').textContent=roofTransparent?'屋根を戻す':'屋根を透かす';};
const cameraNames=['斜め後ろ','アーム側','正面','俯瞰'];$('camera').onclick=()=>{cameraMode=(cameraMode+1)%4;$('camera').textContent=`視点：${cameraNames[cameraMode]}`;};
$('help-open').onclick=()=>{clear();$('help').hidden=false;};$('help-close').onclick=()=>$('help').hidden=true;
if(walking)$('walk-view').onclick=()=>{eyeView=!eyeView;$('walk-view').textContent=eyeView?'徒歩視点：目線':'徒歩視点：追従';};
let drag;const canvas=$('scene');canvas.onpointerdown=e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,orbit,pitch};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(drag?.id!==e.pointerId)return;cameraMode=0;orbit=drag.orbit-(e.clientX-drag.x)*.007;pitch=THREE.MathUtils.clamp(drag.pitch+(e.clientY-drag.y)*.006,.15,1.4);$('camera').textContent='視点：斜め後ろ';};for(const event of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.15,140,420);},{passive:false});
new ResizeObserver(()=>{const b=canvas.getBoundingClientRect();renderer.setSize(b.width,b.height,false);camera.aspect=b.width/Math.max(1,b.height);camera.updateProjectionMatrix();}).observe(canvas);
function refresh(){extension?.beforeRefresh?.();const t=totals(state),m=state.loader.mode,working=m==='working',busy=!!state.action,transition=!!state.loader.transition;
  $('mode').textContent=({foot:'徒歩',boarding:'乗車中',exiting:'降車中',driving:'走行',working:'掘削作業'})[m];$('load').textContent=`バケット ${state.load} / ${EX.capacity}`;$('bin').textContent=`受け箱 ${state.bin}`;$('total').textContent=`土の合計 ${t.total} / ${state.total}`;$('status').textContent=state.message;
  document.querySelector('.working').hidden=!working;document.querySelector('.moving').hidden=working;
  $('interact').textContent=m==='foot'?'運転席に乗る':transition?'乗り降り中…':'降りる';$('interact').disabled=!local||transition||working||Math.abs(state.loader.vehicle.speed)>.8;
  $('work').textContent=working?'走行モード':'作業モード';$('work').disabled=!local||!['working','driving'].includes(m)||Math.abs(state.loader.vehicle.speed)>.8||busy;
  $('scoop').disabled=!working||busy||state.load>0;$('dump').disabled=!working||busy||!state.load;
  document.querySelectorAll('.working [data-hold]').forEach(b=>b.disabled=busy);$('operation').textContent=working?`旋回 ${(state.arm.slew*180/Math.PI).toFixed(0)}° · ${busy?'油圧作動中':'受け箱は右旋回−90°付近'}`:'停車して作業へ切替';
  const targets=scoopTargets(state),p=armPose(state).bucket;$('aim').textContent=state.load?'土を積載中':targets.length?`すくえる土：${targets.length}個`:'アーム先端を土へ近づけてください';
  selection.count=working&&!state.load?targets.length:0;targets.forEach((v,i)=>selection.setMatrixAt(i,mat4.makeTranslation(v.position.x,v.position.y,v.position.z)));selection.instanceMatrix.needsUpdate=true;
  $('debug').textContent=`先端 X ${p.x.toFixed(1)} / Y ${p.y.toFixed(1)} / Z ${p.z.toFixed(1)}\nブーム ${state.arm.boom.toFixed(2)} / アーム ${state.arm.stick.toFixed(2)}\n旋回 ${(state.arm.slew*180/Math.PI).toFixed(1)}°\n${JSON.stringify(t)}\n接触：${state.hit||'なし'}\n保存：なし（貸出区画）`;
  if(walking){const player=state.loader.player;$('jump').hidden=m!=='foot';$('walk-view').hidden=m!=='foot';$('camera').disabled=m==='foot';$('roof').disabled=m==='foot';$('feet').textContent=`足元 ${player.y.toFixed(1)} · ${player.grounded?'着地':m==='foot'?'空中':'乗車中'}`;$('debug').textContent+=`\n歩行 X ${player.x.toFixed(1)} / Y ${player.y.toFixed(2)} / Z ${player.z.toFixed(1)}\n頭上接触 ${!!player.ceilingHit} / 接触 ${state.loader.hit||'なし'}`;}
  extension?.refresh?.(state);
}
const focus=new THREE.Vector3(state.loader.player.x,15,state.loader.player.z),raycaster=new THREE.Raycaster();let last=0,acc=0;function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;phase+=dt;
  if(local&&$('help').hidden){acc+=dt*(state.loader.transition?boardingRate:extension?.rate?.()||1);while(acc>=1/120){const mode=state.loader.mode;state=extension?.step?extension.step(state,controls(),1/120):stepState(state,controls(),1/120);for(const [a,left]of pulses){if(left<=1/120)pulses.delete(a);else pulses.set(a,left-1/120);}if(mode!==state.loader.mode){clear();if(!extension)state.message=state.loader.message;}acc-=1/120;}}else acc=0;
  updateExcavatorModel(excavator,state,{roofTransparent});rebuild();const seated=['driving','working'].includes(state.loader.mode),pose=excavatorActorPose(state);
  if(seated){if(ren.parent!==excavator.userData.pilotSocket)excavator.userData.pilotSocket.add(ren);ren.position.set(0,0,0);ren.rotation.set(0,0,0);}else{if(ren.parent!==scene)scene.add(ren);ren.position.set(pose.x,pose.y-footBottom,pose.z);ren.rotation.set(0,pose.heading,0);}
  const boarding=state.loader.transition,gait=boarding?boarding.elapsed*12:phase*9;
  feet.forEach(({o,y},i)=>o.position.y=y+(!seated&&(held.size||keys.size||boarding)?Math.max(0,Math.sin(gait+i*Math.PI))*(boarding?2.4:1.2):0));hands.forEach(({o,y},i)=>o.position.y=y+(boarding?1.5+Math.sin(gait+i*Math.PI)*.5:!seated?Math.sin(phase*2+i*Math.PI)*.5:0));
  const pieces=[...state.spoil,...state.falling];particles.count=pieces.length;pieces.forEach((p,i)=>particles.setMatrixAt(i,mat4.makeTranslation(p.x,p.y,p.z)));particles.instanceMatrix.needsUpdate=true;
  const p=armPose(state).bucket;cursor.position.set(p.x,p.y-7,p.z);cursor.material.color.set(state.load?0xffd679:scoopTargets(state).length?0x74efb0:0xdfbc71);
  const onFoot=walking&&state.loader.mode==='foot',near=!onFoot&&Math.hypot(pose.x-state.loader.vehicle.x,pose.z-state.loader.vehicle.z)<140;
  focus.lerp(new THREE.Vector3(near?state.loader.vehicle.x:pose.x,near?18:pose.y+17,near?state.loader.vehicle.z+30:pose.z),1-Math.exp(-dt*8));
  const yaw=state.loader.vehicle.heading+(onFoot?orbit:cameraMode===1?1.5:cameraMode===2?.15:orbit),angle=cameraMode===3&&!onFoot?1.35:pitch,dist=onFoot?85:distance*Math.max(1,.9/camera.aspect);
  const offset=new THREE.Vector3(Math.sin(yaw)*Math.cos(angle),Math.sin(angle),Math.cos(yaw)*Math.cos(angle)).multiplyScalar(dist);
  ren.visible=true;
  if(onFoot){
    // Aim from the character's actual height. The camera may not cross the roof.
    focus.set(pose.x,pose.y+22,pose.z);
    let allowed=dist;if(terrain){raycaster.set(focus,offset.clone().normalize());raycaster.far=dist;const hits=raycaster.intersectObject(terrain);if(hits.length)allowed=Math.max(.5,hits[0].distance-2);}
    if(eyeView||allowed<20){camera.position.copy(focus);camera.lookAt(focus.clone().add(new THREE.Vector3(-Math.sin(yaw),Math.sin((pitch-.6)*.8),-Math.cos(yaw))));ren.visible=false;}
    else{camera.position.copy(focus).add(offset.normalize().multiplyScalar(allowed));camera.lookAt(focus);}
  }else{camera.position.copy(focus).add(offset);camera.lookAt(focus);}
  renderer.render(scene,camera);
  ui+=dt;if(ui>.12){ui=0;refresh();}}
extension=setup?.({getState:()=>state,setState:n=>{state=n;refresh();},act,clear,scene,THREE,lookToEntry:()=>{orbit=Math.PI;pitch=.6;cameraMode=0;}});
window.addEventListener('error',e=>{$('status').textContent=`表示エラー：${e.message}`;});window.addEventListener('unhandledrejection',e=>{$('status').textContent=`処理エラー：${e.reason?.message||e.reason}`;});refresh();requestAnimationFrame(frame);
}
if(!document.body.hasAttribute('data-excavation-walk'))startExcavatorView();
