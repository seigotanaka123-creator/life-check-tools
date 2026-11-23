import * as THREE from './three.module.min.js';
import {buildMatureStarCharacter360,disposeMatureCharacterModel,WHITE_MICHI_ROAD_SABER_REN_ID} from './imasora-character-360.js?v=120ob';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs';

export const PARCEL_SCENE_SECONDS = 20;
const BALTIA = 'star-hero-young-seed-walk-walk-cool-a-comet';
const invitation = '一緒に来てくれる？';
const ease = (a,b,t) => THREE.MathUtils.smoothstep(t,a,b);
const mix = THREE.MathUtils.lerp;
const v = (x,y,z) => new THREE.Vector3(x,y,z);
const random = n => {const x=Math.sin(n*127.17+4.1)*43758.5453;return x-Math.floor(x);};

export function parcelSceneFrame(seconds) {
  const time = Math.min(PARCEL_SCENE_SECONDS,Math.max(0,seconds));
  return {
    time,
    shot: time<3.45?'handoff':time<8.8?'wrapping':time<13.15?'baltia':time<15.15?'workbench':'invitation',
    dialogue:time>=16.82&&time<19.68?invitation:'',
    curtain:Math.max(1-ease(0,.62,time),ease(19.25,20,time)),
    finished:time>=PARCEL_SCENE_SECONDS,
  };
}

function texture(width,height,paint) {
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  paint(canvas.getContext('2d'),width,height);
  const result=new THREE.CanvasTexture(canvas);
  result.colorSpace=THREE.SRGBColorSpace;
  return result;
}

function skyTexture() {
  return texture(1280,640,(ctx,w,h)=>{
    const base=ctx.createLinearGradient(0,0,0,h);
    for(const [stop,color] of [[0,'#537b9b'],[.41,'#80a4bd'],[.69,'#b7ccd3'],[1,'#d8ddd5']])base.addColorStop(stop,color);
    ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
  });
}

function castActor(scene,id,height) {
  const root=new THREE.Group();scene.add(root);
  const model=buildMatureStarCharacter360(id,{baseExpression:false,bodyEmissiveIntensity:.028});
  const bounds=new THREE.Box3().setFromObject(model);
  const body=model.userData.body;
  const center=new THREE.Box3().setFromObject(body).getCenter(v(0,0,0));
  const ray=new THREE.Raycaster(),direction=v(0,0,0);
  const hands=model.userData.hands.map((mesh,index)=>{
    const side=index===0?-1:1;
    const origin=v(center.x,mesh.position.y,center.z);
    // A palm follows its side of the belly, at the original hand height.
    // Each sample overlaps the actual torso by part of the palm's radius.
    const rim=[];
    for(let degree=10;degree<=90;degree+=2){
      const angle=THREE.MathUtils.degToRad(degree);
      direction.set(side*Math.sin(angle),0,Math.cos(angle));
      ray.ray.origin.copy(origin).addScaledVector(direction,120);
      ray.ray.direction.copy(direction).negate();
      const [{point}]=ray.intersectObject(body,false);
      rim.push(point.addScaledVector(direction,Math.min(mesh.scale.x,mesh.scale.z)*.69));
    }
    const restAngle=THREE.MathUtils.radToDeg(Math.atan2(Math.abs(mesh.position.x-center.x),mesh.position.z-center.z));
    return {mesh,rim,restAngle};
  });
  const scale=height/(bounds.max.y-bounds.min.y);
  model.scale.multiplyScalar(scale);
  model.position.y=-bounds.min.y*scale;
  root.add(model);
  model.traverse(object=>{
    if(object.isMesh){object.castShadow=true;object.receiveShadow=true;}
  });
  return {
    root,model,ground:model.position.y,
    hands,
    feet:model.userData.feet.map(mesh=>({mesh,height:mesh.position.y,rotation:mesh.rotation.x})),
    eyes:model.userData.faceFeatures.slice(0,2).map(mesh=>({mesh,rest:mesh.scale.clone(),position:mesh.position.clone()})),
  };
}

// The soles are ellipsoids. Use the posed transform, including pitch and the
// current stride, to put the lowest sole on or above its supporting surface.
export function keepFeetAbove(actor, surfaceY) {
  let lift=0;
  for(const {mesh} of actor.feet){
    mesh.updateWorldMatrix(true,false);
    const m=mesh.matrixWorld.elements;
    const bottom=m[13]-Math.hypot(m[1],m[5],m[9])*mesh.geometry.parameters.radius;
    const footDepth=Math.hypot(m[2],m[6],m[10])*mesh.geometry.parameters.radius;
    const floor=typeof surfaceY==='function'?surfaceY(m[12],m[14],footDepth):surfaceY;
    lift=Math.max(lift,floor-bottom);
  }
  actor.root.position.y+=lift;
  actor.root.updateWorldMatrix(true,true);
}

export function createRainStoryParcel() {
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1280/544,.05,250);
  scene.fog=new THREE.FogExp2(0xb8c1c1,0);
  const textures=new Set(), materials=new Set(), geometries=new Set();
  const register=item=>{textures.add(item);return item;};
  const geometry=item=>{geometries.add(item);return item;};
  const material=(color,extra={})=>{
    const item=new THREE.MeshStandardMaterial({color,roughness:.78,...extra});
    materials.add(item);return item;
  };
  const background=new THREE.MeshBasicMaterial({map:register(skyTexture()),fog:false,toneMapped:false});
  materials.add(background);
  const sky=new THREE.Mesh(geometry(new THREE.PlaneGeometry(204,102)),background);
  sky.position.set(0,-9,-104);scene.add(sky);
  const fill=new THREE.HemisphereLight(0xe6f4ff,0x998373,1.73);
  const key=new THREE.DirectionalLight(0xffdfb5,2.7);
  key.position.set(-5.5,8.5,-4.2);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-9,right:9,top:7,bottom:-7,near:.5,far:27});
  key.shadow.normalBias=.023;key.shadow.bias=-.0001;key.shadow.intensity=.77;
  const faceLight=new THREE.DirectionalLight(0xdbeeff,.71);
  faceLight.position.set(2.5,4,6);
  scene.add(fill,key,faceLight);

  const unit=geometry(new THREE.BoxGeometry(1,1,1));
  const sphere=geometry(new THREE.SphereGeometry(1,22,14));
  const cylinder=geometry(new THREE.CylinderGeometry(1,1,1,24));
  function mesh(parent,shape,ink,x,y,z,w,h,d,casts=false) {
    const item=new THREE.Mesh(shape,ink);
    item.position.set(x,y,z);item.scale.set(w,h,d);
    item.castShadow=casts;item.receiveShadow=true;
    parent.add(item);return item;
  }
  const box=(parent,ink,x,y,z,w,h,d,casts=true)=>mesh(parent,unit,ink,x,y,z,w,h,d,casts);
  const orb=(parent,ink,x,y,z,w,h,d,casts=false)=>mesh(parent,sphere,ink,x,y,z,w,h,d,casts);
  const rod=(parent,ink,a,b,r)=>{
    const direction=b.clone().sub(a);
    const middle=a.clone().lerp(b,.5);
    const bar=mesh(parent,cylinder,ink,...middle.toArray(),r,direction.length(),r,true);
    bar.quaternion.setFromUnitVectors(v(0,1,0),direction.normalize());
    return bar;
  };

  const stone=register(coastSurfaceTexture('stone')),wood=register(coastSurfaceTexture('wood'));
  const floor=material(0x9ba5a0,{map:stone,bumpMap:stone,bumpScale:.029});
  const mortar=material(0x707b7c);
  const iron=material(0x43545e,{metalness:.48,roughness:.43});
  const brown=material(0x866e50,{map:wood,bumpMap:wood,bumpScale:.035});
  const ash=material(0xa58762,{map:wood,bumpMap:wood,bumpScale:.026});
  const brass=material(0xa98e63,{metalness:.54,roughness:.45});
  const dark=material(0x3b4445);
  const stonework=[];
  for(let i=0;i<7;i++)stonework.push(floor.clone());
  for(const [i,ink] of stonework.entries()){ink.color.multiplyScalar(.81+i*.055);materials.add(ink);}
  box(scene,mortar,0,-.25,-1,25,.43,14,false);
  for(let row=0;row<7;row++)for(let column=-5;column<=5;column++){
    const x=column*1.57+(row%2)*.79, z=row*1.13-4.58;
    box(scene,stonework[Math.floor(random(17*row+3*column)*7)],x,-.064,z,1.554,.11,1.114,false);
  }
  box(scene,iron,0,.99,-4.55,19,.070,.095);
  box(scene,iron,0,.42,-4.55,19,.037,.051);
  for(let i=-9;i<=9;i++){
    const x=i*1.07;
    box(scene,iron,x,.51,-4.55,.049,1.06,.055);
    box(scene,brass,x,1.031,-4.55,.084,.035,.093);
  }
  const stationWall=material(0xb5b2a1,{map:stone,bumpMap:stone,bumpScale:.047});
  box(scene,stationWall,-6.83,1.88,-4.32,4.7,3.91,.59);
  box(scene,iron,-6.58,3.86,-3.25,5.48,.18,3.23);
  box(scene,iron,-4.09,1.78,-2.22,.14,3.59,.15);
  const amber=material(0xe4bd80,{emissive:0xe2a958,emissiveIntensity:.44});
  for(const y of [1.48,1.94,2.40]){
    box(scene,iron,-4.72,y,-4.005,.79,.4,.14);
    box(scene,amber,-4.72,y,-3.921,.68,.32,.033);
  }

  const bench=new THREE.Group();bench.name='parcel-workbench';bench.position.set(3.37,0,1.53);scene.add(bench);
  for(const x of [-.62,.62])for(const z of [-.27,.27]){
    box(bench,iron,x,.44,z,.071,.88,.068);
    box(bench,brass,x,.041,z,.132,.073,.107);
  }
  box(bench,brown,0,.23,0,1.27,.062,.53);
  box(bench,brown,0,.901,0,1.49,.115,.73);
  for(const z of [-.243,0,.243])box(bench,ash,0,.959,z,1.47,.021,.232);
  const mallet=box(bench,dark,.36,1.018,-.202,.28,.09,.1);mallet.rotation.y=-.3;
  rod(bench,ash,v(.28,1,-.195),v(.54,1,.106),.025);
  const tool=rod(bench,iron,v(.03,.991,-.23),v(.31,.991,-.055),.017);
  tool.name='切替台の工具';
  const strap=material(0x8e684c);
  const tag=new THREE.Mesh(geometry(new THREE.TorusGeometry(.060,.018,8,22)),strap);
  tag.rotation.y=Math.PI/2;tag.position.set(.557,1.027,.19);bench.add(tag);

  const hero=castActor(scene,WHITE_MICHI_ROAD_SABER_REN_ID,2.18);
  const baltia=castActor(scene,BALTIA,2.10);
  if(baltia.model.userData.soraDama)baltia.model.userData.soraDama.visible=false;
  const mouthTone=material(0x68382b,{roughness:.87});
  const [leftEye,rightEye]=baltia.eyes;
  const mouthX=(leftEye.position.x+rightEye.position.x)*.5;
  const {eyeLift,mouthDrop}=globalThis.ImasoraMonsterExpressions.facePlacement;
  const mouthY=(leftEye.position.y+rightEye.position.y)*.5-8.4-eyeLift-mouthDrop;
  baltia.model.updateWorldMatrix(true,true);
  const surfaceRay=new THREE.Raycaster(baltia.model.localToWorld(v(mouthX,mouthY,220)),v(0,0,-1));
  const faceSurface=surfaceRay.intersectObject(baltia.model.userData.body,false)[0];
  const mouthZ=faceSurface?baltia.model.worldToLocal(faceSurface.point).z:(leftEye.position.z+rightEye.position.z)*.5;
  const mouthGroup=new THREE.Group();
  mouthGroup.position.set(mouthX,mouthY,mouthZ+.31);baltia.model.add(mouthGroup);
  const stillMouth=new THREE.CatmullRomCurve3([v(-3.4,.20,-.18),v(-1.5,.02,0),v(.7,-.11,.07),v(3.0,.08,-.1)]);
  mesh(mouthGroup,geometry(new THREE.TubeGeometry(stillMouth,16,.24,8,false)),mouthTone,0,0,0,1,1,1);
  const voiceMouth=orb(mouthGroup,mouthTone,0,0,-.07,3.37,1.7,.53);
  for(const side of [-1,1])orb(mouthGroup,mouthTone,side*3.15,.1,-.12,.26,.24,.27);
  const parcel=new THREE.Group();parcel.name='バルティアへの包み';scene.add(parcel);
  const paperTexture=register(texture(512,256,(ctx,w,h)=>{
    ctx.fillStyle='#c3a276';ctx.fillRect(0,0,w,h);
    for(let i=0;i<31000;i++){
      ctx.fillStyle=random(i+163)>.57?'rgba(255,233,191,.11)':'rgba(68,41,24,.085)';
      ctx.fillRect(random(i+19)*w,random(i+930)*h,1+random(i+480)*2.4,.6+random(i+800));
    }
  }));
  const paper=material(0xd6b58d,{map:paperTexture,bumpMap:paperTexture,bumpScale:.012});
  const foldedPaper=material(0xc6a377,{map:paperTexture,side:THREE.DoubleSide});
  const crease=material(0xa18766);
  const cord=material(0x94654c,{roughness:.98});
  const pack=geometry(new THREE.BoxGeometry(.65,.178,.425,1,1,1));
  const packPosition=pack.attributes.position;
  const center=new THREE.Vector3();
  for(let i=0;i<packPosition.count;i++){
    const point=v(packPosition.getX(i),packPosition.getY(i),packPosition.getZ(i));
    center.set(THREE.MathUtils.clamp(point.x,-.304,.304),THREE.MathUtils.clamp(point.y,-.067,.067),THREE.MathUtils.clamp(point.z,-.19,.19));
    point.sub(center).normalize().multiplyScalar(.027).add(center);
    packPosition.setXYZ(i,...point.toArray());
  }
  pack.computeVertexNormals();
  mesh(parcel,pack,paper,0,0,0,1,1,1,true);
  function flap(vertices) {
    const g=geometry(new THREE.BufferGeometry());
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.computeVertexNormals();
    mesh(parcel,g,foldedPaper,0,0,0,1,1,1);
  }
  flap([[-.307,.087,-.195],[.307,.087,-.195],[.107,.093,.12]]);
  flap([[-.306,-.077,.203],[-.306,.077,.203],[-.069,.007,.208]]);
  flap([[.308,-.077,.203],[.308,.077,.203],[.069,.007,.208]]);
  rod(parcel,crease,v(-.302,.087,-.174),v(.106,.092,.120),.0021);
  rod(parcel,crease,v(.106,.092,.120),v(.299,.086,-.177),.0017);
  const labelMap=register(texture(560,168,(ctx,w,h)=>{
    ctx.fillStyle='#eee0be';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#b4916a';ctx.lineWidth=2;ctx.strokeRect(12,14,w-24,h-28);
    ctx.font='64px "Yu Mincho", "Hiragino Mincho ProN", serif';
    ctx.fillStyle='#47352a';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('バルティアへ',w/2,h/2+3);
  }));
  const label=mesh(parcel,geometry(new THREE.PlaneGeometry(.408,.123)),material(0xffffff,{map:labelMap}),-.074,.097,.009,1,1,1);
  label.rotation.x=-Math.PI/2;label.rotation.z=.02;
  for(const z of [-.195,.195])rod(parcel,cord,v(.179,.091,z),v(.179,-.092,z),.0072);
  rod(parcel,cord,v(.179,.094,-.196),v(.179,.094,.199),.0072);
  rod(parcel,cord,v(.179,-.091,-.196),v(.179,-.091,.199),.0072);
  for(const side of [-1,1]){
    const loop=new THREE.CatmullRomCurve3([v(.178,.1,.02),v(.18+side*.069,.122,-.002),v(.179+side*.102,.115,.041),v(.178,.1,.024)]);
    mesh(parcel,geometry(new THREE.TubeGeometry(loop,14,.006,6,false)),cord,0,0,0,1,1,1);
    rod(parcel,cord,v(.178,.1,.022),v(.179+side*.062,.097,.091),.0055);
  }
  orb(parcel,cord,.179,.101,.02,.015,.011,.016);

  const face=v(0,0,0),eyeWorld=v(0,0,0),cameraAim=v(0,0,0);
  const offer=v(0,0,0),catchAt=v(0,0,0),carry=v(0,0,0),rightPalm=v(0,0,0);
  const offerOffset=v(.17,.248,.235),catchOffset=v(-.19,.246,.255);
  const benchRest=v(3.00,1.057,1.42);
  function pose(actor,x,z,yaw,pitch,tilt,breathing,blink,glance,sideGlance=0) {
    actor.root.position.set(x,0,z);
    actor.model.position.y=actor.ground+breathing;
    actor.model.rotation.set(pitch,yaw,tilt,'YXZ');
    for(const {mesh,rest,position} of actor.eyes) {
      mesh.scale.set(rest.x,rest.y*blink,rest.z);
      mesh.position.copy(position);mesh.position.y-=glance*1.22;
      mesh.position.x+=sideGlance*1.26;
      mesh.position.z-=glance*.17;
    }
    actor.model.updateWorldMatrix(true,false);
  }
  function palmAt(actor,index,angle) {
    const {mesh,rim,restAngle}=actor.hands[index];
    const cursor=(THREE.MathUtils.clamp(angle??restAngle,10,90)-10)/2;
    const from=Math.floor(cursor);
    mesh.position.copy(rim[from]).lerp(rim[Math.min(from+1,rim.length-1)],cursor-from);
  }
  function takeSteps(actor,progress) {
    const lift=Math.sin(progress*Math.PI*4) * Math.sin(progress*Math.PI);
    actor.feet.forEach(({mesh,height,rotation},index)=>{
      const step=lift*(index===0?-1:1);
      mesh.position.y=height+Math.max(0,step)*2.4;
      mesh.rotation.x=rotation+step*.16;
    });
  }
  function eyesAt(actor) {
    face.set(0,0,0);
    for(const {mesh} of actor.eyes)face.add(mesh.getWorldPosition(eyeWorld));
    return face.multiplyScalar(.5);
  }
  const keyframes={
    handoff:{from:[.22,2.03,5.94],to:[.41,2.05,5.67],look:[.11,1.19,.25],fov:34,a:0,b:3.45},
    wrapping:{from:[.45,3.03,3.18],to:[.59,2.93,3.05],look:[.87,.92,1.33],fov:27,a:3.45,b:8.8},
    baltia:{from:[1.1,1.82,4.40],to:[.99,1.8,4.23],look:[.89,1.13,.45],fov:29,a:8.8,b:13.15},
    workbench:{from:[3.93,2.46,3.23],to:[3.85,2.44,3.18],look:[2.90,1.03,1.27],fov:31,a:13.15,b:15.15},
    invitation:{from:[.80,1.85,5.16],to:[.76,1.80,4.80],look:[.32,1.31,.14],fov:31,a:15.15,b:20},
  };
  const first=v(0,0,0),last=v(0,0,0);
  function render(renderer,frame,{reducedMotion=false}={}) {
    const {time:t,shot}=frame;
    const offerStep=ease(.62,1.83,t),transfer=ease(1.84,2.22,t),cradle=ease(2.23,3.35,t);
    const read=ease(3.45,5.05,t),fold=ease(6.18,7.64,t);
    const lower=ease(11.9,14.24,t),release=ease(14.23,14.85,t);
    const lookUp=ease(15.32,16.76,t),speak=ease(16.62,17.03,t)*(1-ease(18.13,18.7,t));
    const breath=t=>Math.sin(t*2.01)*.016;
    const blink=(a,b)=>1-.91*ease(a-.09,a,t)*(1-ease(a,b,t));
    const shoulder=ease(12.12,14.06,t)*(1-ease(14.7,16.32,t));
    const down=read*(1-lookUp);
    const offering=offerStep*(1-ease(2.22,3.23,t));
    const passing=ease(.86,1.62,t)*(1-ease(2.36,3.04,t));
    const facing=mix(-.58,-.15,Math.max(cradle,read))-lookUp*.36+shoulder*1.22;
    pose(hero,-1.47+offering*.12-.20*passing,.04+offering*.08,.74,.018+.076*(1-lookUp),-.022,breath(t),
      blink(6.24,6.42)*blink(15.6,15.79),.41*(1-lookUp),.64);
    pose(baltia,1.19+shoulder*.33+.23*passing,-.06+offering*.10+shoulder*.23,facing,
      .018+down*.203*(1-shoulder)-shoulder*.05-lookUp*.045,
      -.012-fold*.058*(1-lower)+speak*.025,
      breath(t+.6)+speak*.019-.034*ease(8.9,10.84,t),
      (1-down*.12)*blink(4.41,4.62)*blink(11.1,11.25)*blink(15.34,15.52),down,-lookUp*.93-fold*.43*(1-lower));
    takeSteps(hero,offering);
    takeSteps(baltia,shoulder);
    keepFeetAbove(hero,-.003);
    keepFeetAbove(baltia,-.003);
    voiceMouth.scale.y=.14+speak*(.72+.54*Math.sin((t-16.62)*12)**2);

    palmAt(hero,0);
    palmAt(hero,1,mix(38,hero.hands[1].restAngle,ease(2.24,3.22,t)));
    const reach=ease(1.54,2.14,t);
    palmAt(baltia,0,mix(mix(66,46,reach),mix(23,mix(57,45,lookUp),release),cradle));
    palmAt(baltia,1,mix(65,mix(23,65,release),cradle));
    hero.hands[1].mesh.getWorldPosition(offer).add(offerOffset);
    baltia.hands[0].mesh.getWorldPosition(catchAt);
    baltia.hands[1].mesh.getWorldPosition(rightPalm);
    carry.copy(catchAt).lerp(rightPalm,.5);
    carry.x+=Math.sin(facing)*.197;
    carry.y+=.192;
    carry.z+=Math.cos(facing)*.197+.265;
    catchAt.add(catchOffset);
    parcel.position.copy(offer.lerp(catchAt,transfer).lerp(carry,cradle));
    parcel.position.z+=.28*ease(1.60,1.96,t)*(1-ease(2.30,3.03,t));
    parcel.position.lerp(benchRest,ease(13.33,14.24,t));
    if(t>13.33&&t<15.18){
      // Step in with the parcel until it rests on the bench, then move back.
      const stay=1-ease(14.24,15.18,t);
      baltia.root.position.x+=(parcel.position.x-carry.x)*stay*.63;
      baltia.root.position.z+=(parcel.position.z-carry.z)*stay*.32;
    }
    parcel.rotation.set(mix(-.021+read*.19-fold*.068,0,lower),
      mix(-.16+cradle*.21-fold*.31,-.13,lower),mix(.03+fold*.07,0,lower));

    const cut=keyframes[shot],move=reducedMotion?.46:ease(cut.a,cut.b,t);
    camera.position.copy(first.fromArray(cut.from).lerp(last.fromArray(cut.to),move));
    cameraAim.fromArray(cut.look);
    if(shot==='baltia')cameraAim.y=mix(cameraAim.y,eyesAt(baltia).y,.47);
    camera.lookAt(cameraAim);
    camera.fov=cut.fov;camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  }
  function dispose(){
    for(const actor of [hero,baltia])disposeMatureCharacterModel(actor.model);
    for(const item of geometries)item.dispose();
    for(const item of materials)item.dispose();
    for(const item of textures)item.dispose();
    key.dispose();
  }
  return {render,dispose};
}
