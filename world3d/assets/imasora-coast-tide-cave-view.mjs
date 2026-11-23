import * as T from './three.module.min.js';
import {UNCHARTED_ISLAND as I} from './imasora-coast-geography.mjs?v=120li';
import {createTideCave,CAVE_TOP,onCaveStone} from './imasora-coast-tide-cave.mjs?v=120mx';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs?v=120mt';

const observation = Object.freeze({x:I.x+48, y:16, z:I.landingZ+598});
export const tideCaveObservationPoint = observation;

export function createCaveDiagramCanvas() {
 const canvas=globalThis.document?.createElement('canvas');
 const brush=canvas?.getContext?.('2d');
 if(!brush)return null;
 canvas.width=540;
 canvas.height=330;
 paintSkyDiagram(brush);
 return canvas;
}

function paintSkyDiagram(g) {
 const stone=g.createRadialGradient(255,122,25,270,165,328);
 stone.addColorStop(0,'#23414b');
 stone.addColorStop(1,'#0a1924');
 g.fillStyle=stone;
 g.fillRect(0,0,540,330);
 g.lineWidth=2;
 g.strokeStyle='#7b8f80';
 g.strokeRect(12,12,516,306);
 g.strokeRect(19,19,502,292);

 // The trail is continuous from the sea to the cloud mark, then the red star.
 // Its final, worn branch goes below the planet instead of ending at its surface.
 g.lineCap='round';
 g.lineJoin='round';
 g.setLineDash([2,10]);
 g.strokeStyle='#ecd389';
 g.lineWidth=4;
 g.beginPath();
 g.moveTo(92,216);g.bezierCurveTo(163,222,191,163,247,146);
 g.bezierCurveTo(312,129,365,79,425,86);g.stroke();
 g.setLineDash([2,8]);
 g.strokeStyle='#e1a888';
 g.lineWidth=2;
 g.beginPath();g.moveTo(446,122);g.bezierCurveTo(463,164,437,193,448,250);g.stroke();
 g.setLineDash([]);

 g.lineWidth=4;
 g.strokeStyle='#a6e6e4';
 for (const y of [196,212,228]) {
  g.beginPath();g.moveTo(58,y);
  for (const x of [58,83,108]) {
   g.quadraticCurveTo(x+6,y-9,x+12,y);
   g.quadraticCurveTo(x+18,y+9,x+25,y);
  }
  g.stroke();
 }
 g.strokeStyle='#f6e4ab';
 g.beginPath();g.moveTo(222,143);g.bezierCurveTo(200,143,202,114,225,114);
 g.bezierCurveTo(222,86,259,83,266,109);g.bezierCurveTo(291,98,307,117,294,136);
 g.quadraticCurveTo(285,146,270,143);g.closePath();g.stroke();
 // The fork under the cloud is the mark that can recur in the sky chapter.
 g.beginPath();g.moveTo(254,149);g.lineTo(254,173);
 g.moveTo(239,159);g.lineTo(254,173);g.lineTo(269,159);g.stroke();

 g.strokeStyle='#ffb191';
 g.beginPath();g.arc(446,87,33,0,2*Math.PI);g.stroke();
 g.beginPath();g.moveTo(417,93);g.bezierCurveTo(437,103,454,74,471,71);g.stroke();
 g.beginPath();g.ellipse(445,256,15,5,0,0,2*Math.PI);g.stroke();
}

function createObservationView(root,mat,geometries,materials,diagram) {
 const assembly=new T.Group();
 assembly.name='潮の洞窟の観測盤';
 assembly.position.set(observation.x-I.x,observation.y,observation.z-I.landingZ);
 root.add(assembly);
 const mesh=(parent,geometry,material,x,y,z)=>{
  geometries.add(geometry);
  const object=new T.Mesh(geometry,material);
  object.position.set(x,y,z);
  parent.add(object);
  return object;
 };
 const slab=mat(0x41565a),rim=mat(0x9b7b4a,{metalness:.4,roughness:.52});
 const glass=mat(0xa8d4cf,{metalness:.46,roughness:.23,emissive:0x255858,emissiveIntensity:.5});
 mesh(assembly,new T.BoxGeometry(43,7,24),slab,22,3.5,0);
 mesh(assembly,new T.BoxGeometry(43,33,5),rim,22,22,4);
 const texture=new T.CanvasTexture(diagram);
 texture.colorSpace=T.SRGBColorSpace;
 const glyphs=new T.MeshBasicMaterial({map:texture,color:0x53636b,toneMapped:false});
 materials.add(glyphs);
 const face=mesh(assembly,new T.PlaneGeometry(40,29),glyphs,22,22,1.4);
 face.rotation.y=Math.PI;

 mesh(assembly,new T.CylinderGeometry(7,11,5,8),slab,-18,2.5,-19);
 const hinge=new T.Group();
 hinge.position.set(-18,5,-19);
 assembly.add(hinge);
 mesh(hinge,new T.CylinderGeometry(2,2,11,10),rim,0,5.5,0);
 mesh(hinge,new T.CylinderGeometry(9.5,9.5,3,24),rim,0,15,0).rotation.x=Math.PI/2;
 mesh(hinge,new T.CylinderGeometry(8.1,8.1,3.3,24),glass,0,15,0).rotation.x=Math.PI/2;
 const ray=new T.MeshBasicMaterial({color:0xa1ffe5,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 materials.add(ray);
 const beam=mesh(assembly,new T.CylinderGeometry(8,1.2,1,12,1,true),ray,0,0,0);
 const beamOrigin=new T.Vector3(-18,20,-18),beamEnd=new T.Vector3(22,22,1);
 const beamAxis=beamEnd.clone().sub(beamOrigin);
 beam.position.copy(beamOrigin).lerp(beamEnd,.5);
 beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),beamAxis.clone().normalize());
 beam.scale.y=beamAxis.length();
 const faint=new T.Color(0x53636b),bright=new T.Color(0xffffff);
 function setReveal(progress) {
  hinge.rotation.x=T.MathUtils.lerp(-1.38,0,T.MathUtils.smoothstep(progress,0,.52));
  const light=T.MathUtils.smoothstep(progress,.43,1);
  beam.visible=light>0;
  ray.opacity=light*.14;
  glyphs.color.copy(faint).lerp(bright,light);
  glass.emissiveIntensity=.5+light*1.7;
 }
 setReveal(0);
 return {assembly,diagram,setReveal,dispose:()=>texture.dispose()};
}

export function createTideCaveObservation({host,view,context,clearInput,onRead,known,nextHint=()=>''}) {
 const action=document.createElement('button');
 action.type='button';
 action.className='coast-observation-action';
 action.hidden=true;
 const dialog=document.createElement('dialog');
 dialog.className='coast-observation-dialog';
 dialog.setAttribute('aria-labelledby','coast-observation-title');
 dialog.innerHTML=`
  <h2 id="coast-observation-title">潮の洞窟の観測盤</h2>
  <p data-observation-lead role="status"></p>
  <div data-observation-reading hidden>
   <div data-observation-image></div>
   <div class="coast-observation-marks" aria-label="図のしるし">
    <button type="button" data-mark="cloud" aria-pressed="false">雲のしるし</button>
    <button type="button" data-mark="mars" aria-pressed="false">赤い星のしるし</button>
   </div>
   <p data-observation-clue aria-live="polite" aria-atomic="true">光ったしるしを調べよう。</p>
   <p data-observation-found role="status" hidden>海から延びる線が、雲を通ってアマネ星の地面の下まで続いている。</p>
   <p data-observation-next hidden></p>
  </div>
  <footer>
   <button type="button" data-observation-read hidden>空の図を読む</button>
   <button type="button" data-observation-close>探索に戻る</button>
  </footer>`;
 const lead=dialog.querySelector('[data-observation-lead]');
 const reading=dialog.querySelector('[data-observation-reading]');
 const read=dialog.querySelector('[data-observation-read]');
 const close=dialog.querySelector('[data-observation-close]');
 const marks=Array.from(dialog.querySelectorAll('[data-mark]'));
 const clue=dialog.querySelector('[data-observation-clue]');
 const found=dialog.querySelector('[data-observation-found]');
 const next=dialog.querySelector('[data-observation-next]');
 const examined=new Set();
 let reviewingArchive=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let elapsed=0,apparatus=null,cameraHome=null,restoredView=null,restoredKnown=false;
 const available=()=>{
  const c=context();
  return c.map==='coast'&&!c.blocked&&!c.airborne&&c.z>=I.landingZ+550&&
   Math.abs(c.y-observation.y)<12&&Math.hypot(c.x-observation.x,c.z-observation.z)<63&&
   view()?.assembly.parent?.visible&&!document.querySelector('dialog[open]');
 };
 function finishReveal() {
  apparatus.setReveal(1);
  lead.textContent='光を受けて、すり減った線が浮かび上がった。';
  read.hidden=false;
 }
 function show(replay=false){
  if(dialog.open||(replay?!view():!available()))return false;
  apparatus=view();
  reviewingArchive=replay;
  elapsed=(!replay&&known())||reduced.matches ? 1.2:0;
  examined.clear();
  for(const mark of marks)mark.setAttribute('aria-pressed','false');
  found.hidden=true;
  next.hidden=true;
  clue.textContent='光ったしるしを調べよう。';
  lead.textContent='反射板が起き、光が石の上を走る。';
  lead.hidden=false;
  read.hidden=true;
  reading.hidden=true;
  dialog.classList.remove('is-reading');
  clearInput();
  dialog.showModal();
  action.hidden=true;
  if(elapsed===1.2)finishReveal();
  close.focus();
  return true;
 }
 action.addEventListener('click',()=>show());
 read.addEventListener('click',()=>{
  const image=dialog.querySelector('[data-observation-image]');
  const copy=apparatus.diagram.cloneNode();
  copy.getContext('2d').drawImage(apparatus.diagram,0,0);
  copy.setAttribute('role','img');
  copy.setAttribute('aria-label','波から雲へ、雲から赤い星へ続く図。赤い星から細い線が下に伸びている。');
  image.replaceChildren(copy);
  read.hidden=true;
  reading.hidden=false;
  lead.hidden=true;
  dialog.classList.add('is-reading');
  marks[0].focus();
 });
 for(const mark of marks)mark.addEventListener('click',()=>{
  const id=mark.dataset.mark;
  mark.setAttribute('aria-pressed','true');
  clue.textContent=id==='cloud'
   ? '海から伸びた線が、雲のしるしにつながっている。雲の下には三つに分かれた刻みがある。'
   : '赤い丸はアマネ星だろうか。細い線はその表面を越え、地面の下まで伸びている。';
  examined.add(id);
  if(examined.size===marks.length&&found.hidden) {
   found.hidden=false;
   next.textContent=reviewingArchive?'':nextHint();
   next.hidden=!next.textContent;
   if(!known())onRead();
  }
 });
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{
  clearInput();
  if(cameraHome) {
   cameraHome.camera.position.copy(cameraHome.position);
   cameraHome.camera.quaternion.copy(cameraHome.rotation);
   cameraHome=null;
  }
  apparatus?.setReveal(known()?1:0);
  apparatus=null;
  action.hidden=!available();
  if(!action.hidden)action.focus({preventScroll:true});
 });
 host.append(action,dialog);
 return {
  showReplay:()=>show(true),
  get open(){return dialog.open;},
  update(delta) {
   if(!dialog.open){
    const current=view(),recorded=known();
    if(current&&(current!==restoredView||recorded!==restoredKnown))current.setReveal(recorded?1:0);
    restoredView=current;
    restoredKnown=recorded;
    action.hidden=!available();
    if(!action.hidden){
     const label=recorded?'空の図をもう一度読む':'反射板を起こす';
     if(action.textContent!==label)action.textContent=label;
    }
    return;
   }
   if(context().map!=='coast'||apparatus!==view()){dialog.close();return;}
   if(elapsed<1.2){
    elapsed=Math.min(1.2,elapsed+delta);
    apparatus.setReveal(elapsed/1.2);
    if(elapsed===1.2)finishReveal();
   }
  },
  cameraFrame(camera) {
   if(!dialog.open)return false;
   cameraHome??={camera,position:camera.position.clone(),rotation:camera.quaternion.clone()};
   const depth=camera.aspect<1?105:81;
   camera.position.set(observation.x+9,observation.y+49,observation.z-depth);
   camera.lookAt(observation.x+6,observation.y+15,observation.z);
   return true;
  }
 };
}

export function createTideCaveView({surface=()=>{},collider=()=>{},ceiling=()=>{}}={}){
 const root=new T.Group();root.name='潮の洞窟';root.position.set(I.x,0,I.landingZ);const model=createTideCave(),geometries=new Set(),materials=new Set(),texture=coastSurfaceTexture('foliage');
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,map:texture,bumpMap:texture,bumpScale:.8,roughness:.94,...extra});materials.add(m);return m;},stone=mat(0x8b9fa4),pumice=mat(0xc8cbc0),crystal=mat(0x8ee6de,{emissive:0x67cfc8,emissiveIntensity:.5}),gold=mat(0xf5cd89,{emissive:0xe9a84d,emissiveIntensity:.32});
 const add=(g,m,x,y,z)=>{geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;};
 // Broad side galleries stay dry; the center is a real tidal channel. The roof
 // has openings, so the current camera can see the jumping route from above.
 const rockGeo=new T.SphereGeometry(1,12,8);const pos=rockGeo.attributes.position;for(let n=0;n<pos.count;n++){const x=pos.getX(n),y=pos.getY(n),z=pos.getZ(n),r=1+.09*Math.sin(x*11+y*7)*Math.cos(z*13);pos.setXYZ(n,x*r,y*r,z*r);}rockGeo.computeVertexNormals();
 for(let n=0;n<7;n++)for(const sign of[-1,1]){const z=184+n*58+sign*Math.sin(n*2.1)*10,x=sign*(136+Math.cos(n*3.1+sign)*5),h=56+(n%3)*8,o=add(rockGeo,stone,x,h,z);o.scale.set(36,h+4,42);collider(I.x+x,I.landingZ+z,[60,70],0,'tide-cave-wall-'+n+'-'+sign,0,{minY:5,maxY:h*2,obstacleHeight:h*2});}
 const roofs=[],outline=[[-137,-18],[-112,-40],[101,-34],[137,-14],[129,23],[88,38],[-105,31],[-137,17]],shape=new T.Shape();outline.forEach(([x,z],n)=>n?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const roofGeo=new T.ExtrudeGeometry(shape,{depth:56,bevelEnabled:false,steps:1});roofGeo.rotateX(-Math.PI/2);for(const [n,z]of[208,380,550].entries()){const roof=add(roofGeo,stone,0,102,z);roof.name='洞窟の天井 '+n;roofs.push(roof);const polygon=outline.map(([x,dz])=>({x:I.x+x,z:I.landingZ+z+dz}));ceiling(I.x,I.landingZ+z,[274,80],0,102,'tide-cave-roof-'+n,{polygon});for(const [dx,w,d]of[[0,206,60],[-121,30,30],[121,30,28]])collider(I.x+dx,I.landingZ+z,[w,d],0,'tide-cave-roof-'+n+'-'+dx,0,{minY:102,maxY:158,obstacleHeight:158});surface({id:'tide-cave-roof-'+n,x:I.x,z:I.landingZ+z,halfX:137,halfZ:40,height:158,supportFromAbove:102,polygon});}
 function cutaway(actor,thirdPerson){
  const inside=thirdPerson&&root.visible&&actor&&Math.abs(actor.x-I.x)<110&&actor.z>I.landingZ+125&&actor.z<I.landingZ+700&&actor.y<102;
  // The open section includes the route ahead, not only a pinhole to the actor.
  // No ray casts, transparent overdraw, camera shift or physical roof removal.
  for(const roof of roofs)roof.visible=!inside;
 }
 // Beveled, flat-topped stones: the walkable octagon is the actual mesh top.
 const vertices=[],indices=[];for(const y of[0,-30])for(const [x,z]of CAVE_TOP)vertices.push(x,y,z);vertices.push(0,0,0,0,-30,0);for(let n=0;n<8;n++){const j=(n+1)%8;indices.push(16,j,n,17,n+8,j+8,n,j,j+8,n,j+8,n+8);}const floatingGeo=new T.BufferGeometry();floatingGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));floatingGeo.setIndex(indices);floatingGeo.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap((v,n)=>n%3===0?[v/48+.5,vertices[n+2]/46+.5]:[]),2));floatingGeo.computeVertexNormals();
 const floats=model.stones.map(s=>{const mesh=add(floatingGeo,pumice,s.x-I.x,s.y,s.z-I.landingZ),floor={id:s.id,buildingId:'tide-cave',x:s.x,z:s.z,halfX:24,halfZ:23,height:s.y,polygon:CAVE_TOP.map(([x,z])=>({x:s.x+x,z:s.z+z}))};surface(floor);return{mesh,floor,s};});
 // A thin mineral seam is part of each stone, rather than a floating HUD pin.
 // Six instances share one draw call and follow the actual supporting surface.
 const seamVertices=[],seamIndices=[];for(const [x,z]of CAVE_TOP){seamVertices.push(x*.76,.12,z*.76,x*.86,.12,z*.86);}for(let n=0;n<8;n++){const a=n*2,b=((n+1)%8)*2;seamIndices.push(a,b,a+1,a+1,b,b+1);}
 const seamGeo=new T.BufferGeometry();seamGeo.setAttribute('position',new T.Float32BufferAttribute(seamVertices,3));seamGeo.setIndex(seamIndices);seamGeo.computeVertexNormals();geometries.add(seamGeo);
 const seamMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});materials.add(seamMat);const seams=new T.InstancedMesh(seamGeo,seamMat,floats.length);seams.name='浮き石の鉱脈';seams.instanceMatrix.setUsage(T.DynamicDrawUsage);seams.frustumCulled=false;root.add(seams);
 const seamMatrix=new T.Matrix4(),seamColor=new T.Color();let cue={visited:0,running:false,armed:false,complete:false},lastCue='',cueTime=-Infinity;
 const crossing=value=>{const visited=Math.max(0,Math.min(floats.length,Math.trunc(value?.visited)||0));cue={visited,running:!!value?.running,armed:!!value?.armed,complete:!!value?.complete};};
 function updateSeams(time){
  const key=[cue.visited,cue.running,cue.armed,cue.complete].join(':');
  for(let n=0;n<floats.length;n++){const s=floats[n].s;seamMatrix.makeTranslation(s.x-I.x,s.y,s.z-I.landingZ);seams.setMatrixAt(n,seamMatrix);}seams.instanceMatrix.needsUpdate=true;
  // Colour updates are bounded to 10 Hz; only the next stone breathes gently.
  if(key===lastCue&&time>=cueTime&&time-cueTime<.1)return;lastCue=key;cueTime=time;
  for(let n=0;n<floats.length;n++){
   const reached=cue.complete||cue.running&&n<cue.visited,next=!cue.complete&&(cue.running?n===cue.visited:cue.armed&&n===0);
   seamColor.setHex(reached?0xffd48c:0x82d8ce).multiplyScalar(reached?.96:next?.7+.15*Math.sin(time*2.4):.24);seams.setColorAt(n,seamColor);
  }seams.instanceColor.needsUpdate=true;
  crystal.emissiveIntensity=cue.complete?.95:cue.running&&cue.visited===floats.length?.7:.5;gold.emissiveIntensity=cue.complete?.7:.32;
 }
 const crystalGeo=new T.CylinderGeometry(0,5,25,5);for(let n=0;n<18;n++){const a=n*2.399,r=22+n%4*6,x=Math.cos(a)*r,z=612+Math.sin(a)*r;const o=add(crystalGeo,n%3===0?gold:crystal,x,26+n%3*4,z);o.rotation.z=Math.sin(a)*.35;o.scale.setScalar(.7+(n%5)*.14);}
 const title=new T.Group();title.position.set(0,30,132);title.userData.nearbyName={id:'coast:tide-cave',name:'潮の洞窟',hx:90,hz:55,height:38};root.add(title);
 let disposed=false,skyDiagram=null,diagramPrepared=false;
 root.visible=false;
 return {
  root,model,crossing,cutaway,
  get skyDiagram(){return skyDiagram;},
  surfaceAt:(x,z)=>model.surfaceAt(x,z),
  update(time,actor) {
   if(disposed)return 0;
   const standing=actor&&actor.grounded!==false?model.stones.find(s=>onCaveStone(s,actor.x,actor.z)&&Math.abs(actor.groundY-s.y)<3):null;
   const before=standing?.y;
   model.update(time,actor?[actor]:[]);
   root.visible=!!actor&&Math.hypot(actor.x-I.x,actor.z-(I.landingZ+340))<2600;
   for(const f of floats){f.mesh.position.y=f.s.y;f.floor.height=f.s.y;}
   if(root.visible) {
    updateSeams(time);
    // Only prepare the diagram once the far bank enters the player's view.
    if(!diagramPrepared&&Math.hypot(actor.x-observation.x,actor.z-observation.z)<210) {
     diagramPrepared=true;
     const diagram=createCaveDiagramCanvas();
     if(diagram)skyDiagram=createObservationView(root,mat,geometries,materials,diagram);
    }
   }
   return standing?standing.y-before:0;
  },
  dispose() {
   if(disposed)return;
   disposed=true;
   skyDiagram?.dispose();
   seams.dispose();
   geometries.forEach(g=>g.dispose());
   materials.forEach(m=>m.dispose());
   texture.dispose();
   root.removeFromParent();
  }
 };
}
