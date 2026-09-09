import * as THREE from './assets/three.module.min.js';
import { officialCharacter, measureCharacter } from './assets/imasora-construction-layout.js';
import { ConstructionSession, unpackConstruction } from './assets/imasora-construction-state.js?v=428';
import { IndexedConstructionStore, CONSTRUCTION_TERRAIN_DEV_DB } from './assets/imasora-construction-storage.js?v=428';
import { CELL, PILOT, SPAWN, FIXED, surfaceFaces, stepPlayer, previewEdit, planEdit, validatePlot } from './assets/imasora-construction-terrain.js?v=428';
const $ = id => document.getElementById(id);
const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
const session = new ConstructionSession(new IndexedConstructionStore(globalThis.indexedDB, { profile: 'terrain' }), { profile: 'terrain' });
let busy = false, mode = 'dig', width = 6, selected = null, plan = null, player = { ...SPAWN }, yaw = -Math.PI / 2, pitch = .93, distance = 180;
let jumpQueued = false, surface = null, selectionStamp = '', clock = 0, walkPhase = 0, lastHit = 0;
const keys = new Set(), touches = new Map();
function message(text, warning = false) { $('status').textContent = text; $('status').classList.toggle('warning', warning); }
window.addEventListener('error', e => message(`表示エラー：${e.message}`, true));
window.addEventListener('unhandledrejection', e => message(`処理エラー：${e.reason?.message ?? e.reason}`, true));

const scene = new THREE.Scene(); scene.background = new THREE.Color(0xc8dadb); scene.fog = new THREE.Fog(0xc8dadb, 400, 850);
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.03;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(48, 1, .3, 1100);
scene.add(new THREE.HemisphereLight(0xf4faf5, 0x79715a, 2.4));
const sun = new THREE.DirectionalLight(0xffefd3, 3.3); sun.position.set(-110, 190, 100); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 160, bottom: -160, near: 1, far: 500 }); sun.shadow.normalBias = .12; scene.add(sun);
const fill = new THREE.DirectionalLight(0xcfe5ed, 1.1); fill.position.set(90, 50, -120); scene.add(fill);
const mat = (color, extras = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, ...extras });
const cube = new THREE.BoxGeometry(1, 1, 1), fixedMeshes = [];
function addBox(bounds, material) {
  const m = new THREE.Mesh(cube, material);
  m.position.set((bounds.minX+bounds.maxX)/2, (bounds.minY+bounds.maxY)/2, (bounds.minZ+bounds.maxZ)/2);
  m.scale.set(bounds.maxX-bounds.minX, bounds.maxY-bounds.minY, bounds.maxZ-bounds.minZ);
  m.castShadow = m.receiveShadow = true; scene.add(m); return m;
}
for (const [i, bounds] of FIXED.entries()) {
  const m = addBox(bounds, mat(i === 0 ? 0x757d77 : i < 5 ? 0xabb3a1 : 0x7e928a));
  m.name = bounds.name; fixedMeshes.push(m);
}
// Low wooden rails match the full physical boundary; there are no hidden map walls.
for (const z of [-89, 89]) for (let x = -112; x <= 112; x += 16) addBox({ minX:x-.8,maxX:x+.8,minY:0,maxY:37,minZ:z-1.3,maxZ:z+1.3 }, mat(0x586f62));
for (const x of [-113,113]) for (let z = -80; z <= 80; z += 16) addBox({ minX:x-1.3,maxX:x+1.3,minY:0,maxY:37,minZ:z-.8,maxZ:z+.8 }, mat(0x586f62));
for (const z of [-48,48]) addBox({minX:-64,maxX:64,minY:.03,maxY:.16,minZ:z-.3,maxZ:z+.3},mat(0xe4b452));
for (const x of [-64,64]) addBox({minX:x-.3,maxX:x+.3,minY:.03,maxY:.16,minZ:-48,maxZ:48},mat(0xe4b452));
const background = new THREE.Mesh(new THREE.PlaneGeometry(1600,1600), mat(0xb6c9bc)); background.rotation.x=-Math.PI/2; background.position.y=-49; background.receiveShadow=true; scene.add(background);
// This plane is below the solid bedrock and outside the playable surface, never y=0.
const textureCanvas = document.createElement('canvas'); textureCanvas.width=textureCanvas.height=128;
const ctx=textureCanvas.getContext('2d'); ctx.fillStyle='#d1ac78'; ctx.fillRect(0,0,128,128);
let seed=428; const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
for(let i=0;i<900;i++){ctx.fillStyle=rand()>.5?'#80633b25':'#fff6df45';const s=1+rand()*2.5;ctx.fillRect(rand()*128,rand()*128,s,s);}
ctx.strokeStyle='#76532e55';ctx.lineWidth=2;ctx.strokeRect(1,1,126,126);
const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
const dirt = mat(0xffffff,{map:texture});
function rebuild() {
  if(surface){scene.remove(surface);surface.geometry.dispose();}
  const positions=[],normals=[],uvs=[];
  for(const face of surfaceFaces(session.state)) for(const i of [0,1,2,0,2,3]){
    const p=face.vertices[i];positions.push(...p.map((v,j)=>(v+face.position[j])*CELL));normals.push(...face.normal);uvs.push(...[[0,0],[0,1],[1,1],[1,0]][i]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();
  surface=new THREE.Mesh(geometry,dirt);surface.name='保存された立体地形';surface.castShadow=surface.receiveShadow=true;scene.add(surface);selectionStamp='';
}
const character=officialCharacter(), measurement=measureCharacter();scene.add(character);
const feet=character.userData.feet.map(node=>({node,y:node.position.y})), hands=character.userData.hands.map(node=>({node,y:node.position.y}));
const selectMaterial = new THREE.MeshBasicMaterial({color:0xe5b951,transparent:true,opacity:.30,depthWrite:false});
const highlights=new THREE.InstancedMesh(new THREE.BoxGeometry(8.08,8.08,8.08),selectMaterial,36);highlights.count=0;highlights.frustumCulled=false;scene.add(highlights);
const matrix=new THREE.Matrix4();
function updateSelection() {
  if(!session.state)return;
  plan=planEdit(session.state,selected,mode,width,player);
  const stamp=JSON.stringify([plan.positions,!!plan.reason]);
  if(stamp!==selectionStamp){
    selectionStamp=stamp;highlights.count=plan.positions.length;selectMaterial.color.set(plan.reason?0xc95640:mode==='dig'?0xe6b643:0x71bc9a);
    plan.positions.forEach((p,i)=>highlights.setMatrixAt(i,matrix.makeTranslation((p[0]+.5)*CELL,(p[1]+.5)*CELL,(p[2]+.5)*CELL)));highlights.instanceMatrix.needsUpdate=true;
  }
  $('apply').disabled=busy||session.readOnly||!plan.command;
  $('selection').textContent=selected?`${selected.position.join(' / ')} · ${plan.positions.length}マス${plan.reason?' · '+plan.reason:''}`:plan.reason;
}
function refresh() {
  const state=session.state;
  $('stock').textContent=state?state.materials['earth-soil'].accounts.storage/1000:'—';
  $('terrain-count').textContent=state?state.materials['earth-soil'].accounts.terrain/1000:'—';
  $('save-state').textContent=busy?'保存中…':state?`保存 ${state.revision}${session.readOnly?' · 保護中':' · 済'}`:'未読込';
  $('undo').disabled=busy||session.readOnly||!state?.history.past.length;$('redo').disabled=busy||session.readOnly||!state?.history.future.length;
  for(const id of ['read-save','export','restore'])$(id).disabled=busy;
  $('recover').hidden=!(state&&session.readOnly);$('recover').disabled=busy;
  $('total').textContent=state?`${Object.values(state.materials['earth-soil'].accounts).reduce((a,b)=>a+b,0)/1000}個（初期地形960＋貸出32）`:'—';
  $('database').textContent=CONSTRUCTION_TERRAIN_DEV_DB;
  $('dig-mode').setAttribute('aria-pressed',String(mode==='dig'));$('place-mode').setAttribute('aria-pressed',String(mode==='place'));
  $('apply').textContent=mode==='dig'?'選んだ土を掘る':'選んだ面に置く';$('brush').textContent=width===6?'幅広 6×6':'1マス';updateSelection();
}
async function run(action,success){
  if(busy||!local)return;busy=true;clearInput();refresh();
  try{await action();if(session.state){validatePlot(session.state);rebuild();}message(session.warning||success,session.readOnly);}
  catch(error){
    if(session.state){try{validatePlot(session.state);}catch{session.readOnly=true;}}
    message(error.message,true);
  }
  finally{busy=false;refresh();}
}
async function edit(command){
  const id=crypto.randomUUID();previewEdit(session.state,command,id,player);
  await session.dispatch(command,id);
}
$('dig-mode').onclick=()=>{mode='dig';refresh();};$('place-mode').onclick=()=>{mode='place';refresh();};$('brush').onclick=()=>{width=width===6?1:6;refresh();};
$('apply').onclick=()=>{
  updateSelection();if(!plan?.command)return;
  const command=plan.command,hit=selected;
  run(async()=>{await edit(command);if(mode==='dig'&&hit)selected={position:hit.position.map((v,i)=>v-hit.normal[i]),normal:[...hit.normal]};},`${command.positions.length}マス${mode==='dig'?'掘って回収':'配置'}し、保存しました。`);
};
$('undo').onclick=()=>run(()=>edit({type:'undo'}),'地形と土をひとつ前に戻しました。');$('redo').onclick=()=>run(()=>edit({type:'redo'}),'取り消した地形操作をやり直しました。');
function home(){player={...SPAWN};clearInput();selected=null;selectionStamp='';message('安全な入口へ戻りました。地形と手持ちの土はそのままです。');refresh();}
$('home').onclick=home;
$('camera').onclick=()=>{const overhead=pitch<1.4;pitch=overhead?1.51:.93;distance=overhead?215:180;$('camera').textContent=overhead?'斜めから':'見下ろす';};
function clearInput(){keys.clear();touches.clear();jumpQueued=false;}
function showHelp(show){$('help').hidden=!show;$('tools').setAttribute('aria-expanded',String(show));clearInput();}
$('tools').onclick=()=>showHelp($('help').hidden);$('close-help').onclick=()=>showHelp(false);
$('read-save').onclick=()=>run(async()=>{await session.load();if(session.state)validatePlot(session.state);home();},'保存を読み直しました。安全な入口から再開します。');
$('export').onclick=()=>{if(session.state){$('backup').value=session.export();message('バックアップ文字列を表示しました。別の場所にコピーして保管できます。');}};
let restoringRecovery=false;
$('restore').onclick=()=>{restoringRecovery=false;clearInput();$('confirm').showModal();};
$('recover').onclick=()=>{restoringRecovery=true;clearInput();$('confirm').showModal();};
$('cancel-restore').onclick=()=>$('confirm').close();
$('accept-restore').onclick=()=>{
  $('confirm').close();run(async()=>{if(session.state)$('backup').value=session.export();if(restoringRecovery)await session.confirmRecovery();else{const text=$('restore-text').value.trim();validatePlot(unpackConstruction(text));await session.restore(text);}home();},'地形バックアップを復元しました。');
};
for(const button of document.querySelectorAll('[data-direction]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touches.set(e.pointerId,button.dataset.direction);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>touches.delete(e.pointerId));
}
$('jump').onpointerdown=e=>{e.preventDefault();jumpQueued=true;};
window.addEventListener('keydown',e=>{
  if(!$('help').hidden||$('confirm').open||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpQueued=true;}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
function pick(e){
  if(!surface||busy)return;const r=$('scene').getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);
  const hit=raycaster.intersectObjects([surface,...fixedMeshes],false)[0];
  if(!hit){selected=null;updateSelection();return;}
  const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);const n=normal.toArray().map(v=>Math.round(v));
  selected={position:hit.point.toArray().map((v,i)=>Math.floor((v-n[i]*.001)/CELL)),normal:n};updateSelection();
}
let drag=null;
$('scene').addEventListener('pointerdown',e=>{if(drag)return;$('scene').setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,moved:false};});
$('scene').addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)drag.moved=true;if(drag.moved){yaw=drag.yaw-dx*.006;pitch=THREE.MathUtils.clamp(drag.pitch+dy*.006,.35,1.51);}});
$('scene').addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;const click=!drag.moved;drag=null;if(click)pick(e);});
$('scene').addEventListener('pointercancel',()=>{drag=null;});$('scene').addEventListener('lostpointercapture',()=>{drag=null;});
$('scene').addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.08,85,280);},{passive:false});
new ResizeObserver(()=>{const r=$('scene').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/Math.max(1,r.height);camera.updateProjectionMatrix();}).observe($('scene'));
// A narrow phone can wrap the toolbar to two rows; keep the selection hint above it.
function positionSelectionHint(){const r=document.querySelector('.editbar').getBoundingClientRect();$('selection').style.bottom=`${innerHeight-r.top+8}px`;}
new ResizeObserver(positionSelectionHint).observe(document.querySelector('.editbar'));
window.addEventListener('resize',positionSelectionHint);
function movement(){
  const down=direction=>[...touches.values()].includes(direction);
  const side=Number(keys.has('KeyD')||keys.has('ArrowRight')||down('right'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')||down('left'));
  const forward=Number(keys.has('KeyW')||keys.has('ArrowUp')||down('forward'))-Number(keys.has('KeyS')||keys.has('ArrowDown')||down('back'));
  return{x:side*Math.cos(yaw)-forward*Math.sin(yaw),z:-side*Math.sin(yaw)-forward*Math.cos(yaw)};
}
let last=0,accumulator=0,uiTime=0;
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;if(document.hidden)return;clock+=dt;
  const movable=session.state&&!session.readOnly&&!busy&&$('help').hidden&&!$('confirm').open;
  const input=movable?movement():{x:0,z:0};
  if(movable){accumulator+=dt;while(accumulator>=1/120){const before=player;player=stepPlayer(session.state,player,{...input,jump:jumpQueued},1/120);jumpQueued=false;walkPhase+=Math.hypot(player.x-before.x,player.z-before.z)*.21;if(player.ceilingHit){lastHit=clock;message('頭が天井に当たりました。上方向の移動を止めています。');}accumulator-=1/120;}}else accumulator=0;
  character.position.set(player.x,player.y-measurement.footBottom,player.z);character.rotation.y=player.heading;
  const walking=Math.hypot(input.x,input.z)>.05&&player.grounded;
  feet.forEach(({node,y},i)=>node.position.y=y+(walking?Math.max(0,Math.sin(walkPhase+i*Math.PI))*1.8:0));
  hands.forEach(({node,y},i)=>node.position.y=y+Math.sin(walking?walkPhase+i*Math.PI:clock*1.8+i*Math.PI)*(walking?1.4:.35));
  const target=new THREE.Vector3(player.x,player.y+13,player.z),desired=target.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance));
  if(surface){const direction=desired.clone().sub(target);raycaster.set(target,direction.clone().normalize());raycaster.far=direction.length();const obstruction=raycaster.intersectObjects([surface,...fixedMeshes],false)[0];if(obstruction)desired.copy(target).addScaledVector(direction.normalize(),Math.max(3,obstruction.distance-2));raycaster.far=Infinity;}
  camera.position.copy(desired);camera.lookAt(target);renderer.render(scene,camera);
  uiTime+=dt;if(uiTime>.12){uiTime=0;$('coordinates').textContent=`X ${player.x.toFixed(1)} / Y ${player.y.toFixed(1)} / Z ${player.z.toFixed(1)}`;$('contact').textContent=clock-lastHit<.8?'天井に接触':player.grounded?'足元の床に接地':'落下・ジャンプ中';updateSelection();}
}
requestAnimationFrame(frame);
if(!local){message('ローカル開発専用です。通常ゲームには保存しません。',true);refresh();}
else await run(async()=>{await session.load();if(!session.state&&!session.readOnly)await session.initialize();if(session.state)validatePlot(session.state);},'土の面をタップして選び、「掘る」を押してください。左下のパッドで歩けます。');
