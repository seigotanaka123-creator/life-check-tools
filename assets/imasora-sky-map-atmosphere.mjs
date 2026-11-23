import * as T from './three.module.min.js';
import {coastLighting} from './imasora-coast-layout.mjs?v=120mx';
import {createScenicSky} from './imasora-scenic-sky.mjs?v=120kw';
import {eveningLight,createLightHalos,WARM_LIGHT} from './imasora-evening-light.mjs?v=120mx';

const colourKeys=['top','horizon','sun'];
const lookoutPoint=Object.freeze({x:-10,z:-177});

function createDriftingClouds() {
 const canvas=document.createElement('canvas');
 canvas.width=384;
 canvas.height=112;
 const brush=canvas.getContext('2d');
 // Bake wisps once. Broad shapes set the form, fine noise breaks the edges.
 const {width,height}=canvas;
 const image=brush.createImageData(width,height);
 const density=new Float32Array(width*height);
 const {lerp,smoothstep}=T.MathUtils;
 const hash=(x,y)=>{
  let n=Math.imul(x+4,374761393)^Math.imul(y+7,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
 };
 function noise(x,y) {
  const i=Math.floor(x),j=Math.floor(y);
  const u=smoothstep(x-i,0,1),v=smoothstep(y-j,0,1);
  return lerp(lerp(hash(i,j),hash(i+1,j),u),lerp(hash(i,j+1),hash(i+1,j+1),u),v);
 }
 for(let x=0;x<width;x++){
  const u=x/width;
  const taper=smoothstep(u,0,.17)*(1-smoothstep(u,.8,1));
  const ridge=.52+.1*Math.sin(u*7)+.055*Math.cos(u*19);
  for(let y=0;y<height;y++){
   const v=y/height;
   const turbulence=noise(u*8,v*5)*.58+noise(u*16,v*12)*.28+noise(u*39,v*31)*.14;
   const outline=Math.abs(v-ridge)/(.32+.07*Math.sin(u*13));
   const edge=turbulence-outline*.53;
   density[y*width+x]=taper*smoothstep(edge,.13,.64);
  }
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=y*width+x;
  const d=density[i],above=density[Math.max(0,y-7)*width+x];
  const light=Math.min(1,.47+Math.max(0,d-above)*1.4+.18*(1-y/height));
  image.data.set([lerp(122,252,light),lerp(161,254,light),lerp(196,255,light),d*250],4*i);
 }
 brush.putImageData(image,0,0);
 const texture=new T.CanvasTexture(canvas);
 texture.colorSpace=T.SRGBColorSpace;
 const group=new T.Group();
 group.name='観測台から見える雲';
 const puffs=[0,235,432].map((offset,i)=>{
  const material=new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,fog:false,toneMapped:false});
  const sprite=new T.Sprite(material);
  sprite.scale.set(150+i*18,44+i*5,1);
  group.add(sprite);
  return {offset,sprite,material};
 });
 let travel=0,previousTime=null;
 return {
  group,
  update(t,night,changedWind) {
   const elapsed=previousTime===null?0:Math.min(.25,Math.max(0,t-previousTime));
   previousTime=t;
   travel=(travel+(changedWind?39:-39)*elapsed+690)%690;
   for (const [i,{sprite,material,offset}] of puffs.entries()) {
    const x=(travel+offset)%690-345;
    sprite.position.set(x,116+i*8+2*Math.sin(t*.7+i),325+i*34);
    material.opacity=(1-T.MathUtils.smoothstep(Math.abs(x),245,338))*.89;
    material.color.setScalar(1-night*.43);
   }
  },
  dispose() {texture.dispose();for (const {material} of puffs)material.dispose();}
 };
}

function createWindLookout() {
 const root=new T.Group();
 root.name='雲の観測台';
 root.position.set(lookoutPoint.x,0,lookoutPoint.z);
 const geometries=new Set(),materials=new Set();
 const material=parameters=>{const m=new T.MeshStandardMaterial(parameters);materials.add(m);return m;};
 const stone=material({color:0x697f9c,roughness:.82});
 const inset=material({color:0xb4c6d3,roughness:.76});
 const bronze=material({color:0xa9733d,metalness:.36,roughness:.38});
 const gold=material({color:0xffcc70,metalness:.14,roughness:.54,emissive:0xa15f20,emissiveIntensity:.2});
 const cloth=material({color:0xc66231,roughness:.94,side:T.DoubleSide});
 const add=(geometry,m,x,y,z)=>{
  const mesh=new T.Mesh(geometry,m);
  mesh.position.set(x,y,z);
  root.add(mesh);
  geometries.add(geometry);
  return mesh;
 };
 const base=add(new T.CylinderGeometry(31,33,.65,12),stone,0,.32,0);
 base.receiveShadow=true;
 base.userData.walkableSurface=true;
 const insetFloor=add(new T.CylinderGeometry(28,28,.22,12),inset,0,.72,0);
 insetFloor.userData.walkableSurface=true;
 add(new T.CylinderGeometry(6,9,5,10),stone,9,2.5,0);
 add(new T.CylinderGeometry(1.3,2.4,47,10),bronze,9,25.5,0);
 add(new T.SphereGeometry(2.8,12,8),gold,9,50,0);
 // The pennant keeps its direction so the player can compare the cloud against it.
 add(new T.CylinderGeometry(.85,.85,21,8),bronze,1,49,0).rotation.z=Math.PI/2;
 const sleeve=add(new T.TorusGeometry(3.7,.65,8,18),gold,8.6,42.5,0);
 sleeve.rotation.y=Math.PI/2;
 const flag=new T.PlaneGeometry(1,1,20,5);
 const uv=flag.attributes.uv,vertices=flag.attributes.position;
 const flagMesh=add(flag,cloth,8.3,42.5,0);
 flagMesh.frustumCulled=false;
 flagMesh.userData.nonCollidable=true;

 add(new T.BoxGeometry(10,12,2),stone,9,32,-1);
 // Same three-pronged outline as the mark below the cloud on the cave slate.
 const notch=[[[0,3],[0,-3]],[[-3,0],[0,-3]],[[3,0],[0,-3]]];
 for(const [[x1,y1],[x2,y2]] of notch) {
  const line=add(new T.BoxGeometry(.54,Math.hypot(x2-x1,y2-y1),.25),gold,9+(x1+x2)/2,32+(y1+y2)/2,-2.1);
  line.rotation.z=-Math.atan2(x2-x1,y2-y1);
 }
 const name=new T.Group();
 name.userData.nearbyName={id:'sky:wind-lookout',name:'雲の観測台',hx:45,hz:40,height:59};
 root.add(name);
 const clouds=createDriftingClouds();
 root.add(clouds.group);
 function update(time,night,actor,changedWind,observingWind) {
  const near=observingWind||actor&&Math.hypot(actor.x-lookoutPoint.x,actor.z-lookoutPoint.z)<360;
  clouds.group.visible=!!near;
  if(!near)return;
  const t=time*.001;
  for(let i=0;i<vertices.count;i++){
   const u=uv.getX(i),v=uv.getY(i)-.5;
   const wave=Math.sin(t*7-u*8)*u;
   vertices.setXYZ(i,-30*u,v*7*(1-u*.63)+wave*1.4,wave*3.5+v*1.4);
  }
  vertices.needsUpdate=true;
  flag.computeVertexNormals();
  clouds.update(t,night,changedWind);
 }
 return {
  root,clouds:clouds.group,flag:flagMesh,
  update,
  dispose(){
   root.removeFromParent();
   clouds.dispose();
   geometries.forEach(g=>g.dispose());
   materials.forEach(m=>m.dispose());
  }
 };
}

// Keep the playable character on its original spot. Only the film's pose and
// expression are overridden, and the same model resumes play when it ends.
function createLookoutPerformance(model) {
 const eyes=(model.userData.faceFeatures??[]).slice(0,2);
 const regularMouth=model.getObjectByName('base-expression-mouth');
 const original={position:model.position.clone(),rotation:model.rotation.clone(),visible:model.visible,
  eyeScales:eyes.map(eye=>eye.scale.y),mouthVisible:regularMouth?.visible};
 const lookPoint=new T.Vector3(),face=new T.Vector3(),limbFoot=model.userData.feet??[];
 let mouth=null;

 if(regularMouth&&model.userData.body){
  model.updateWorldMatrix(true,true);
  regularMouth.geometry.computeBoundingBox();
  const box=regularMouth.geometry.boundingBox,center=box.getCenter(new T.Vector3());
  const probe=new T.Raycaster(),front=new T.Vector3(0,0,-1).transformDirection(model.matrixWorld);
  const points=[];
  for(let i=0;i<=8;i++){
   const u=(i-4)/4,x=center.x+u*(box.max.x-box.min.x)*.36,y=center.y+(1-u*u)*.36;
   const origin=model.localToWorld(new T.Vector3(x,y,box.max.z+30));
   probe.set(origin,front);
   const hit=probe.intersectObject(model.userData.body,false)[0];
   points.push(hit?model.worldToLocal(hit.point).add(new T.Vector3(0,0,.32)):new T.Vector3(x,y,center.z));
  }
  mouth=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,.37,7,false),regularMouth.material);
  mouth.name='lookout-concentrated-mouth';
  mouth.visible=false;
  model.add(mouth);
 }
 function restorePose(){
  model.position.copy(original.position);
  model.rotation.copy(original.rotation);
  model.visible=original.visible;
  if(regularMouth)regularMouth.visible=original.mouthVisible;
  if(mouth)mouth.visible=false;
  eyes.forEach((eye,i)=>{eye.scale.y=original.eyeScales[i];});
  model.updateMatrixWorld(true);
 }
 function soleHeight(){
  model.updateMatrixWorld(true);
  let bottom=Infinity;
  for(const foot of limbFoot){
   const m=foot.matrixWorld.elements,r=foot.geometry?.parameters?.radius;
   if(Number.isFinite(r))bottom=Math.min(bottom,m[13]-Math.hypot(m[1],m[5],m[9])*r);
  }
  return bottom;
 }
 const ground=soleHeight();
 return {
  pose(target,focused) {
   model.visible=true;
   model.position.copy(original.position);
   if(regularMouth)regularMouth.visible=false;
   if(mouth)mouth.visible=true;
   eyes.forEach((eye,i)=>{eye.scale.y=original.eyeScales[i]*(focused ? .91 : 1);});
   lookPoint.copy(target).sub(original.position);
   const yaw=Math.atan2(lookPoint.x,lookPoint.z);
   const eyeHeight=eyes.length?(eyes[0].position.y+eyes.at(-1).position.y)*.5*model.scale.y:18;
   const pitch=-T.MathUtils.clamp(Math.atan2(lookPoint.y-eyeHeight,Math.hypot(lookPoint.x,lookPoint.z)),-.18,.21);
   model.rotation.set(pitch,yaw,0,'YXZ');
   const bottom=soleHeight();
   if(Number.isFinite(bottom)&&Number.isFinite(ground))model.position.y+=ground-bottom;
   model.updateMatrixWorld(true);
   face.copy(model.position);
   face.y+=eyeHeight*.96;
   return {face,yaw};
  },
  restorePose,
  dispose(){restorePose();if(mouth){mouth.removeFromParent();mouth.geometry.dispose();}}
 };
}

export function createSkyWindObservation({host,view,actor,context,clearInput,knowsDiagram,progress,record,onError}) {
 const film=document.createElement('dialog');
 film.className='sky-wind-film';
 film.setAttribute('aria-label','雲の観測台');
 const subtitle=document.createElement('p');
 subtitle.setAttribute('role','status');
 subtitle.hidden=true;
 const fade=document.createElement('div');
 fade.className='sky-wind-fade';
 fade.setAttribute('aria-hidden','true');
 film.append(subtitle,fade);
 host.append(film);
 film.addEventListener('cancel',event=>event.preventDefault());
 const frameEye=new T.Vector3(),frameTarget=new T.Vector3(),lookTarget=new T.Vector3();
 let scene=null,cameraHome=null,saving=false,failed=false;

 function start(changed,replayEnd=null) {
  const lookout=view();
  if(scene||!lookout)return false;
  clearInput();
  subtitle.hidden=true;
  film.style.setProperty('--lookout-matte',0);
  fade.style.opacity=0;
  const model=actor();
  const performance=model?createLookoutPerformance(model):null;
  const cloud=lookout.clouds.children.reduce((nearest,puff)=>Math.abs(puff.position.x)<Math.abs(nearest.position.x)?puff:nearest);
  scene={lookout,cloud,performance,changed,replayEnd,elapsed:0,duration:changed?7.7:4.25};
  film.showModal();
  return true;
 }

 function finish(completed) {
  const current=scene;
  scene=null;
  current.performance?.dispose();
  if(cameraHome) {
   const {camera,eye,rotation,fov}=cameraHome;
   camera.position.copy(eye);
   camera.quaternion.copy(rotation);
   camera.fov=fov;
   camera.updateProjectionMatrix();
   cameraHome=null;
  }
  clearInput();
  film.close();
  if(current.replayEnd)current.replayEnd();
  else if(completed){
   saving=true;
   record(current.changed?'diagram-matched':'baseline').catch(error=>{
    failed=true;
    onError(error);
   }).finally(()=>{saving=false;});
  }
 }

 return {
  showReplay:onEnd=>start(true,onEnd),
  get open(){return scene!==null;},
  get changedWind(){return scene?.changed===true||(!progress().restored&&progress().observed);},
  update(delta) {
   const c=context();
   if(scene){
    if(c.map!=='sky'||scene.lookout!==view()){finish(false);return;}
    if(document.hidden)return;
    scene.elapsed+=delta;
    const {elapsed,duration,changed,replayEnd}=scene;
    if(elapsed>=duration){finish(true);return;}
    const compare=changed&&elapsed>=4.65&&elapsed<7.22&&(!replayEnd||progress().matched);
    const line=compare?'この印……洞窟で見た図と同じだ。':
     changed&&elapsed>=2.3&&elapsed<4.25?'風は同じ向きなのに……雲だけ、逆に流れてる。':'';
    if(subtitle.textContent!==line)subtitle.textContent=line;
    subtitle.hidden=!line;
    return;
   }
   if(c.map!=='sky'){failed=false;return;}
   if(c.blocked||c.airborne||!knowsDiagram()||saving||failed||document.hidden)return;
   const current=progress();
   if(!current.baseline)start(false);
   else if(current.returned&&!current.matched&&!current.restored)start(true);
  },
  cameraFrame(camera) {
   if(!scene)return false;
   cameraHome??={camera,eye:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov};
   const {elapsed,duration,changed,replayEnd}=scene;
   const portrait=camera.aspect<1.1;
   const {smoothstep,lerp}=T.MathUtils;
   const cut=elapsed>=.28&&elapsed<duration-.28;
   const matched=changed&&(!replayEnd||progress().matched);
   const showingMark=matched&&elapsed>=4.3;
   const actorShot=!!scene.performance&&(elapsed<1.55||showingMark&&elapsed>=5.28);
   const closer=showingMark?1:0;
   const obscured=elapsed<.6
    ? Math.min(smoothstep(elapsed,0,.28),1-smoothstep(elapsed,.28,.6))
    : Math.min(smoothstep(elapsed,duration-.6,duration-.28),1-smoothstep(elapsed,duration-.28,duration));
   fade.style.opacity=obscured;
   if(cut){
    if(showingMark)lookTarget.set(lookoutPoint.x+9,32,lookoutPoint.z-2.1);
    else scene.cloud.getWorldPosition(lookTarget);
    const pose=scene.performance?.pose(lookTarget,changed&&elapsed>=.95);
    if(actorShot){
     const angle=pose.yaw-.96,distance=portrait?74:67;
     frameTarget.copy(pose.face);
     frameEye.copy(pose.face).add(new T.Vector3(Math.sin(angle)*distance,5,Math.cos(angle)*distance));
    }else{
     frameEye.set(lookoutPoint.x+lerp(-12,8,closer),lerp(36,33,closer),lookoutPoint.z-lerp(portrait?95:73,43,closer));
     frameTarget.set(lookoutPoint.x+lerp(-12,9,closer),lerp(56,32,closer),lookoutPoint.z);
    }
    camera.position.copy(frameEye);
    camera.lookAt(frameTarget);
   }else{
    scene.performance?.restorePose();
    camera.position.copy(cameraHome.eye);
    camera.quaternion.copy(cameraHome.rotation);
   }
   const fov=cut?(actorShot?(portrait?54:41):lerp(portrait?62:47,portrait?52:40,closer)):cameraHome.fov;
   if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
   film.style.setProperty('--lookout-matte',cut?1:0);
   return true;
  }
 };
}

/** Same device-local clock as home/town/coast; no new save fields or fixed game clock. */
export function skyMapLighting(date=new Date()){
 const l=coastLighting(date),mix=k=>T.MathUtils.lerp(l.from[k],l.to[k],l.blend);
 const result={phase:l.phase,night:mix('night'),ambient:mix('ambient'),power:mix('power')};
 for(const k of colourKeys)result[k]=new T.Color(l.from[k]).lerp(new T.Color(l.to[k]),l.blend);
 const a=mix('azimuth'),e=mix('elevation');
 result.direction=new T.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
 return result;
}

export function createSkyMapAtmosphere({cloudSea=true,lightWorld=false}={}){
 const group=new T.Group();group.name='sky-map-atmosphere';
 const uniforms=Object.fromEntries(colourKeys.map(k=>[k,{value:new T.Color()}]));
 Object.assign(uniforms,{time:{value:0},night:{value:0},sunDir:{value:new T.Vector3()}});
 const backdrop=createScenicSky({uniforms,cloudSea,infinite:lightWorld});group.add(backdrop.sky);
 const stations=[];
 function addStation(station){
  const panes=(station.userData.warmWindows??[]).map(mesh=>{const material=mesh.material.clone(),original=material.emissive.clone(),intensity=material.emissiveIntensity;mesh.material=material;return {material,original,intensity};});
  const halos=createLightHalos(station,2);halos.set([-13,13].map(x=>({x,y:24,z:31.6,size:18})));halos.strength(0);
  stations.push({panes,halos});lastDate=-Infinity;
 }
 let lastDate=-Infinity,phase='',disposed=false,lookout=null;
 function addWindLookout() {
  lookout??=createWindLookout();
  group.add(lookout.root);
  return lookout;
 }
 function update({scene,camera,sun,hemi,actor,changedWind=false,observingWind=false,time=performance.now(),date=new Date()}){
  if(disposed)return;
  backdrop.update(camera,time);
  lookout?.update(time,uniforms.night.value,actor,changedWind,observingWind);
  // Clouds move cheaply every frame. Lighting only changes when the actual clock does.
  // Absolute difference also catches clock adjustments and a resumed background tab.
  if(Math.abs(+date-lastDate)<10000)return;
  lastDate=+date;
  const l=skyMapLighting(date),mood=eveningLight(date);phase=l.phase;
  for(const k of colourKeys)uniforms[k].value.copy(l[k]);
  uniforms.night.value=l.night;uniforms.sunDir.value.copy(l.direction);
  uniforms.dusk.value=mood.dusk;
  for(const s of stations){s.halos.strength(mood.strength);for(const p of s.panes){p.material.emissive.copy(p.original).lerp(new T.Color(WARM_LIGHT.halo),mood.strength);p.material.emissiveIntensity=T.MathUtils.lerp(p.intensity,1.7,mood.strength);}}
  // This is scenery behind the original cloud world. Keep the established
  // white cloud floor, station/UFO lighting and distance fog at every hour.
  scene.background?.copy(l.horizon);
  if(lightWorld&&sun&&hemi){
   // Only the construction world adopts time-of-day light. Sky's white cloud
   // floor, UFO, authentication and original lighting deliberately stay intact.
   scene.fog?.color.copy(l.horizon);if(scene.fog){scene.fog.near=2300;scene.fog.far=5800;}hemi.intensity=2.2-l.night*.6-mood.dusk*.25;
   hemi.color.set(0xd9f4ff);hemi.groundColor.set(0x37506b);
   sun.intensity=3.4*(1-l.night*.69-mood.dusk*.24);
   sun.color.set(0xffffff).lerp(new T.Color(0xffc183),mood.dusk*.65).lerp(new T.Color(0xc2dcff),l.night*.55);
   sun.position.copy(l.direction).multiplyScalar(500);sun.position.y=Math.max(70,sun.position.y);
  }
 }
 function dispose(){if(disposed)return;disposed=true;lookout?.dispose();for(const s of stations){s.halos.dispose();s.panes.forEach(p=>p.material.dispose());}backdrop.dispose();group.removeFromParent();}
 return {group,update,dispose,addStation,addWindLookout,get lookout(){return lookout;},get phase(){return phase;}};
}
