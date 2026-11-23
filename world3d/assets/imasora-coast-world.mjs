import {createTideCaveView} from './imasora-coast-tide-cave-view.mjs?v=121il-story-guide';
import {createCoastWildlife} from './imasora-coast-wildlife-view.mjs?v=120oe';
import {coastSurfaceTexture,coastTree,coastRidgeGeometry,coastTownHouse} from './imasora-coast-scenery-detail.mjs?v=120mt';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
import {coastOceanTime} from './imasora-coast-tidal-finds.mjs?v=120mx';
import {createCoastIslandView} from './imasora-coast-island-view.mjs?v=121gf';
import {SNORKEL} from './imasora-coast-snorkeling.mjs?v=120ob';
import {createTownBridge} from './imasora-town-bridge.mjs?v=120mt';
import {batchCoastScenery,splitCoastSurface} from './imasora-coast-static-batches.mjs?v=120id';
import{eveningLight,createLightHalos,createLightPools,WARM_LIGHT}from'./imasora-evening-light.mjs?v=120mx';
import{createCoastForageView}from'./imasora-coast-forage-view.mjs?v=120ps';
import {createScenicSky} from './imasora-scenic-sky.mjs?v=120kw';
import * as T from './three.module.min.js';
import {createTownDetails}from './imasora-town-detail.mjs?v=120pr';
import {COAST_WAVE_GLSL,coastSeaState,WAVE} from './imasora-coast-waves.mjs?v=120mx';
import {COAST_PLACES,COAST_WATER_Y,COAST_DOCK_FENDERS,COAST_TOWN_CANAL,coastHeight,coastMainlandHeight,coastShore,coastLighting,coastPierContains} from './imasora-coast-layout.mjs?v=120mx';
import {COAST_HOME_MOOR_POSTS} from './imasora-coast-island-harbors.mjs?v=120lr';
import {UNCHARTED_ISLAND} from './imasora-coast-geography.mjs?v=120mx';
import {buildFloweringHeroCharacter360, disposeFloweringCharacterModel} from './imasora-character-360.js';

const coastRumors = [
 {id:'shore', name:'海を眺める住民', art:'hero-young-seed-leaf-walk-cute', x:-223, z:155,
  line:'地図に載ってない島があるって、聞いたことある？'},
 {id:'sailor', name:'航海に詳しい住民', art:'hero-young-seed-river-walk-cute', x:113, z:255,
  line:'よく晴れた日は、風に乗った雲の下に、沖の島影が見えるよ。'},
 {id:'elder', name:'昔の話に詳しい住民', art:'hero-young-seed-walk-walk-cool-b', x:241, z:182,
  line:'あの島の洞窟には、空の図が残っているそうだよ。'}
];

function createCoastRumorResidents(parent) {
 const residents = coastRumors.map(info => {
  const model = buildFloweringHeroCharacter360(info.art);
  const bounds = new T.Box3().setFromObject(model);
  const scale = 33 / (bounds.max.y - bounds.min.y);
  const ground = coastMainlandHeight(info.x, info.z);
  model.scale.multiplyScalar(scale);
  model.position.set(info.x, ground - bounds.min.y * scale, info.z);
  const seaHeading = Math.atan2(UNCHARTED_ISLAND.x - info.x, UNCHARTED_ISLAND.z - info.z);
  model.rotation.y = seaHeading + (info.id === 'shore' ? .8 : 1.65);
  model.name = info.name;
  parent.add(model);
  return {...info, model, ground, seaHeading};
 });
 function dispose() {
  for (const {model} of residents) {
   disposeFloweringCharacterModel(model);
   model.removeFromParent();
  }
 }
 return {residents,dispose};
}

export function createCoastRumorScene({host, canvas, context, clearInput}) {
 const button = document.createElement('button');
 button.type = 'button';
 button.className = 'coast-rumor-action';
 button.textContent = '話を聞く';
 button.hidden = true;
 button.setAttribute('aria-haspopup','dialog');
 host.append(button);
 const dialog = document.createElement('dialog');
 dialog.className = 'coast-rumor-dialog';
 dialog.setAttribute('aria-labelledby', 'coast-rumor-speaker');
 dialog.innerHTML = '<div id="coast-rumor-speaker"></div><p></p><footer><button type="button" data-listen>沖を眺める</button><button type="button" data-close>閉じる</button></footer>';
 document.body.append(dialog);
 const speaker = dialog.querySelector('div'), line = dialog.querySelector('p');
 const listen = dialog.querySelector('[data-listen]'), close = dialog.querySelector('[data-close]');
 const projection = new T.Vector3(), eye = new T.Vector3(), target = new T.Vector3();
 const cameraPose = new T.PerspectiveCamera();
 let nearby, active, origin, time = 0, phase = 'talk', heading = 0;
 let returnPose;
 const duration = 5.4;
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

 function update(dt=0) {
  const c = context();
  if (active) {
   if (!dialog.open || c.map !== 'coast' || c.blocked || !c.residents?.includes(active)) {
    finish();
    return;
   }
   time += dt;
   if (phase === 'view' && time >= duration) finish();
   return;
  }
  nearby = null;
  if (c.map === 'coast' && !c.blocked && !c.airborne && c.camera) {
   let best = 73;
   for (const resident of c.residents) {
    const distance = Math.hypot(resident.x - c.x, resident.z - c.z);
    if (distance < best && Math.abs(resident.ground - c.y) < 18) {
     best = distance;
     nearby = resident;
    }
   }
  }
  if (nearby) {
   projection.set(nearby.x, nearby.ground+41, nearby.z).project(c.camera);
   if (projection.z < -1 || projection.z > 1 || Math.abs(projection.x)> .92 || Math.abs(projection.y) > .91) nearby = null;
  }
  button.hidden = !nearby;
  if (nearby) {
   button.style.left = ((projection.x + 1) * 50) + '%';
   button.style.top = ((1 - projection.y) * 50) + '%';
   button.setAttribute('aria-label', nearby.name + 'の話を聞く');
  }
 }

 function open() {
  update();
  if (!nearby || active) return;
  const c = context();
  active = nearby;
  origin = {eye:c.camera.position.clone(), rotation:c.camera.quaternion.clone(), modelYaw:active.model.rotation.y};
  returnPose = {eye:origin.eye.clone(), rotation:origin.rotation.clone()};
  heading = Math.atan2(c.x-active.x,c.z-active.z);
  active.model.rotation.y = heading;
  time = 0;
  phase = 'talk';
  dialog.dataset.phase = phase;
  speaker.textContent = active.name;
  line.textContent = active.line;
  listen.hidden = false;
  close.textContent = '閉じる';
  button.hidden = true;
  clearInput();
  dialog.showModal();
  document.body.classList.add('coast-rumor-active');
  listen.focus();
 }

 function lookOut() {
  if (!active) return;
  clearInput();
  const {camera} = context();
  origin.eye.copy(camera.position);
  origin.rotation.copy(camera.quaternion);
  time = 0;
  phase = 'view';
  dialog.dataset.phase = phase;
  listen.hidden = true;
  close.textContent = '戻る';
  active.model.rotation.y = active.seaHeading;
  close.focus();
 }

 function finish() {
  if (!active) return;
  active.model.rotation.y = origin.modelYaw;
  const {camera} = context();
  camera.position.copy(returnPose.eye);
  camera.quaternion.copy(returnPose.rotation);
  active = null;
  origin = null;
  returnPose = null;
  document.body.classList.remove('coast-rumor-active');
  if (dialog.open) dialog.close();
  clearInput();
  canvas.focus({preventScroll:true});
 }

 function cameraFrame(camera) {
  if (!active) return false;
  const {x,z,ground,seaHeading} = active;
  const portrait = camera.aspect < .9;
  const distance = portrait ? 108 : 83;
  if (phase === 'talk') {
   eye.set(x+Math.sin(heading+.42)*distance,ground+32,z+Math.cos(heading+.42)*distance);
   target.set(x,ground+22,z);
  } else {
   // The offshore bearing comes from the existing island coordinates. Keep the
   // real horizon and its normal visibility distance throughout the shot.
   const fx = Math.sin(seaHeading), fz = Math.cos(seaHeading);
   eye.set(x-fx*92+fz*38,ground+42,z-fz*92-fx*38);
   target.set(x+fx*500,ground+39,z+fz*500);
  }
  cameraPose.position.copy(eye);
  cameraPose.lookAt(target);
  const blend = reducedMotion.matches ? 1 : T.MathUtils.smoothstep(time,0,phase==='talk'? .6 : 1.25);
  camera.position.lerpVectors(origin.eye,eye,blend);
  camera.quaternion.slerpQuaternions(origin.rotation,cameraPose.quaternion,blend);
  return true;
 }
 button.addEventListener('click',open);
 listen.addEventListener('click',lookOut);
 close.addEventListener('click',finish);
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
 dialog.addEventListener('close',finish);
 return {update,cameraFrame,get open(){return !!active;}};
}

const vertex=`
varying vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const hash=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}`;
const colors=['top','horizon','sea','deep','sun'];
function lightUniforms(){return Object.fromEntries(colors.map(k=>[k,{value:new T.Color()}]));}
// One small batch of light volumes. The sources stay over the reef as the lens moves.
function reefLightShafts(uniforms,waterLight){
 const positions=[],profiles=[],order=[[-1,0],[1,0],[-1,1],[1,0],[1,1],[-1,1]];
 let index=0;
 for(const x of [-320,-70,150,335,515]){
  for(const z of [-182,-22,164]){
   const phase=index++*1.618,length=235+55*Math.sin(phase)+Math.max(0,x)*.35;
   for(const [side,down] of order){
    positions.push(SNORKEL.x+x+Math.sin(phase)*59,0,SNORKEL.z+z+Math.cos(phase)*49);
    profiles.push(side,down,phase,length);
   }
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('rayProfile',new T.Float32BufferAttribute(profiles,4));
 const mat=new T.ShaderMaterial({
  transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,blending:T.AdditiveBlending,
  uniforms:{reefTime:waterLight.time,reefSurface:waterLight.surface,reefStrength:waterLight.strength,sunDir:uniforms.sunDir,sun:uniforms.sun},
  vertexShader:`
   uniform float reefSurface;uniform vec3 sunDir;attribute vec4 rayProfile;
   varying vec4 ray;varying float distanceToEye;
   void main(){
    vec3 axis=normalize(vec3(sunDir.x*.47,1.,sunDir.z*.47));
    vec3 top=vec3(position.x,reefSurface-6.,position.z);
    vec3 center=top-axis*rayProfile.y*rayProfile.w;
    vec3 lateral=normalize(cross(axis,normalize(cameraPosition-center))+vec3(.0001,0.,0.));
    vec3 p=center+lateral*rayProfile.x*mix(10.,43.,rayProfile.y);
    ray=rayProfile;distanceToEye=length(cameraPosition-p);
    gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
   }`,
  fragmentShader:`
   uniform float reefTime,reefStrength;uniform vec3 sun;varying vec4 ray;varying float distanceToEye;
   void main(){
    float fade=exp(-ray.x*ray.x*5.)*smoothstep(0.,.12,ray.y)*(1.-smoothstep(.5,1.,ray.y));
    float flicker=.66+.20*sin(reefTime*.97+ray.z+ray.x*2.4)+.14*sin(reefTime*1.41+ray.y*5.-ray.z);
    float range=smoothstep(35.,100.,distanceToEye)*(1.-smoothstep(540.,900.,distanceToEye));
    gl_FragColor=vec4(mix(vec3(.29,.76,.71),sun,.32),fade*flicker*range*reefStrength*.24);
   }`
 });
 const shafts=new T.Mesh(geo,mat);shafts.name='水面から届く光';shafts.visible=false;shafts.frustumCulled=false;
 return shafts;
}
export function createCoastWorld({collider=()=>{},surface=()=>{},ceiling=()=>{},reserved=[],pebbleState}={}){
 const group=new T.Group();group.name='imasora-coast-open-world';
 const forage=createCoastForageView(group,{collider});
 const rumors=createCoastRumorResidents(group);
 const toys=null;
 const waterLight={active:{value:0},time:{value:0},strength:{value:0},surface:{value:COAST_WATER_Y}};
 const islands=createCoastIslandView({collider,surface,pebbleState,waterLight});group.add(islands.root);
 const cave=createTideCaveView({collider,surface,ceiling});group.add(cave.root);
 const materials=new Set(),geometries=new Set(),textures=new Set(),scenery=[];
 const mat=(c,extra={})=>{const m=new T.MeshStandardMaterial({color:c,roughness:.82,...extra});materials.add(m);return m;};
 const sand=mat(0xe9d8b6),ivory=mat(0xf7f1dd),wood=mat(0xb88e66),mint=mat(0x9bd0c5),roof=mat(0x567c8c),rock=mat(0xa0b2ae),gold=mat(0xeac685);
 const lamp=mat(0xffe8b4,{emissive:0xffcb7b,emissiveIntensity:0}),windowMat=mat(0xbfdbe4,{emissive:0xffce83,emissiveIntensity:0});
 const timberTexture=coastSurfaceTexture('wood'),stoneTexture=coastSurfaceTexture('stone');textures.add(timberTexture);textures.add(stoneTexture);wood.map=timberTexture;wood.bumpMap=timberTexture;wood.bumpScale=.22;ivory.map=stoneTexture;roof.map=timberTexture;
 const add=(geo,m,x,y,z,parent=group)=>{geometries.add(geo);const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);scenery.push(o);return o;};
 const box=(w,h,d,x,y,z,m=wood,parent=group)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cyl=(r1,r2,h,x,y,z,m,parent=group)=>add(new T.CylinderGeometry(r1,r2,h,16),m,x,y,z,parent);
 const solid=(o,id)=>{
  // Box3 updates the object itself, but not its ancestors. Named landmarks are
  // positioned groups; refresh that chain before registering world-space walls.
  o.updateWorldMatrix(true,true);
  const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
  collider(c.x,c.z,[s.x,s.z],0,'coast-'+id,0,{minY:b.min.y,maxY:b.max.y,obstacleHeight:b.max.y});
 };
 const named=(id,name,x,z,height=40)=>{const g=new T.Group();g.position.set(x,coastHeight(x,z),z);g.name=name;g.userData.nearbyName={id:'coast:'+id,name,hx:25,hz:25,height};group.add(g);return g;};
 const free=(x,z,r=30)=>!reserved.some(b=>Math.abs(x-b.position[0])<r+130&&Math.abs(z-b.position[2])<r+130);

 // One continuous mesh, shared with the walking sampler. Existing plot area is flat.
 const land=new T.PlaneGeometry(4200,3000,210,150);land.rotateX(-Math.PI/2);land.translate(0,0,-300);
 const p=land.attributes.position,colour=[];
 for(let i=0;i<p.count;i++){
  const ox=p.getX(i),oz=p.getZ(i),x=Math.abs(ox)>1600?Math.sign(ox)*(1600+(Math.abs(ox)-1600)*12):ox,z=oz<-1000?-1000+(oz+1000)*4:oz,y=coastMainlandHeight(x,z);p.setXYZ(i,x,y,z);
  const inland=1-T.MathUtils.smoothstep(z,60,195),wet=T.MathUtils.smoothstep(z,coastShore(x)-75,coastShore(x)+12);
  const c=new T.Color(0xeedebe).lerp(new T.Color(0x94bca0),inland*.77).lerp(new T.Color(0xb7b89e),wet*.62);
  c.multiplyScalar(.88+.07*Math.sin(x*.018)*Math.cos(z*.024)+.05*Math.sin(x*.047+z*.061));colour.push(c.r,c.g,c.b);
 }
 land.setAttribute('color',new T.Float32BufferAttribute(colour,3));land.computeVertexNormals();
 const landMat=mat(0xffffff,{vertexColors:true}),landMesh=add(land,landMat,0,0,0);
 landMesh.name='海岸の地面';
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;
 const grainContext=grainCanvas.getContext('2d'),grain=grainContext.createImageData(256,256);
 let grainSeed=47;for(let i=0;i<grain.data.length;i+=4){grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;const g=223+(grainSeed%31);grain.data[i]=grain.data[i+1]=grain.data[i+2]=g;grain.data[i+3]=255;}
 grainContext.putImageData(grain,0,0);const grainTexture=new T.CanvasTexture(grainCanvas);grainTexture.wrapS=grainTexture.wrapT=T.RepeatWrapping;grainTexture.repeat.set(84,60);grainTexture.colorSpace=T.SRGBColorSpace;textures.add(grainTexture);landMat.map=grainTexture;landMat.needsUpdate=true;

 const uniforms={...lightUniforms(),time:{value:0},waveTime:{value:0},oceanPhase:{value:new T.Vector4()},raftLight:{value:new T.Vector3()},raftForward:{value:new T.Vector2()},raftGlow:{value:0},night:{value:0},lampGlow:{value:0},warmReflection:{value:new T.Color(WARM_LIGHT.reflection)},lampSources:{value:Array.from({length:4},()=>new T.Vector2())},reflectionCount:{value:0},sunDir:{value:new T.Vector3()},snorkelActive:{value:0},snorkelUnderwater:waterLight.active,snorkelPoint:{value:new T.Vector2()},underwaterFog:{value:new T.Color()},underwaterUpper:{value:new T.Color()},underwaterLower:{value:new T.Color()}};
 // The horizon and the suspended water share these colours, so the
 // underwater distance fades continuously instead of ending in a blue wall.
 const waterColours=[0x5bb1ad,0x356f7f,0x2f6178,0x203f60,0xc0ead7,0x90bace,0x468c83,0x284f63].map(c=>new T.Color(c));
 const shafts=reefLightShafts(uniforms,waterLight);group.add(shafts);
 geometries.add(shafts.geometry);materials.add(shafts.material);
 // Keep the sky behind even the distant islands. Its dome radius must not
 // become an opaque wall halfway across the expanded sea.
 const atmosphere=createScenicSky({uniforms,radius:8500,infinite:true});
 // Draw the opaque ground and buildings first. Their depth rejects hidden sky
 // fragments; clouds, stars and the actual sky shader remain unchanged.
 atmosphere.sky.renderOrder=10;
 // Reuse the existing background draw, rather than adding a full-screen pass.
 // The fog horizon joins this gradient, with lighter water above and blue below.
 const skyMat=atmosphere.sky.material;
 skyMat.fragmentShader=skyMat.fragmentShader.replace('uniform sampler2D clouds;', 'uniform sampler2D clouds;uniform float snorkelUnderwater;uniform vec3 underwaterFog,underwaterUpper,underwaterLower;').replace('vec3 d=normalize(vWorld-cameraPosition);', `vec3 d=normalize(vWorld-cameraPosition);
  if(snorkelUnderwater>.5){
   float skyward=smoothstep(-.07,.85,d.y);
   vec3 water=mix(underwaterFog,underwaterUpper,skyward);
   water=mix(water,underwaterLower,smoothstep(0.,.9,-d.y));
   water+=underwaterUpper*pow(max(0.,dot(d,sunDir)),8.)*skyward*.16;
   gl_FragColor=vec4(water,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
   return;
  }`);
 group.add(atmosphere.sky);
 const waterMat=new T.ShaderMaterial({side:T.DoubleSide,forceSinglePass:true,uniforms,vertexShader:vertex,fragmentShader:`
 precision highp float;varying vec3 vWorld;varying vec3 vWaterNormal;uniform float time,night,lampGlow,raftGlow,snorkelActive,snorkelUnderwater;uniform vec4 oceanPhase;uniform vec3 raftLight;uniform vec2 raftForward,snorkelPoint;uniform vec3 top,horizon,sea,deep,sun,sunDir,warmReflection,underwaterFog,underwaterUpper;uniform vec2 lampSources[4];uniform float reflectionCount;
 ${hash}
 void main(){
  // Above clear water, do not paint opaque turquoise undersides through the
  // next transparent crest. Keep the real underside when the lens is under.
  // A uniform avoids switching material sides and compiling while swimming.
  if(snorkelActive>.5&&snorkelUnderwater<.5&&!gl_FrontFacing)discard;
  vec2 p=vWorld.xz;float shore=325.+28.*cos(p.x/235.)+16.*sin(p.x/120.);
  float offshore=vWorld.z-shore+oceanPhase.z/.05;
  vec2 drift=vec2(time*.5,-time*.8);
  float a=noise(p*.08+drift),b=noise(p*.17-drift*.7),c=noise(p*.035+drift*.2);
  vec3 surfaceNormal=normalize(vWaterNormal);
  vec3 n=normalize(surfaceNormal+vec3((a-.5)*.17+(b-.5)*.07,0.,(c-.5)*.16+(a-b)*.06));
  vec3 v=normalize(cameraPosition-vWorld);float fres=pow(1.-max(0.,dot(v,n)),3.);
  vec3 col=mix(sea,deep,smoothstep(20.,650.,offshore));
  col=mix(col,mix(horizon,top,.15),fres*.65);
  float spec=pow(max(0.,dot(reflect(-sunDir,n),v)),180.);
  col+=sun*spec*(2.-night);
  // Four real light positions, reflected toward the viewer on the water only.
  // Long soft streaks follow existing ripples, without a second scene render.
  if(lampGlow>.001)for(int i=0;i<4;i++){if(float(i)>=reflectionCount)continue;vec2 delta=p-lampSources[i],axis=normalize(cameraPosition.xz-lampSources[i]+vec2(.001));float along=dot(delta,axis);
   float across=abs(delta.x*axis.y-delta.y*axis.x);float spread=5.+max(along,0.)*.055;if(along< -30.||along>600.||across>spread*4.)continue;
   float reflected=exp(-across*across/(spread*spread))*exp(-abs(along)/135.)*smoothstep(-16.,8.,along);
   col+=warmReflection*lampGlow*reflected*(.32+.28*b)*smoothstep(0.,12.,offshore);}

  vec2 rd=p-raftLight.xz;float ahead=dot(rd,raftForward),across=abs(rd.x*raftForward.y-rd.y*raftForward.x);
  float beam=smoothstep(0.,18.,ahead)*(1.-smoothstep(110.,260.,ahead))*(1.-smoothstep(10.+ahead*.23,22.+ahead*.42,across));
  col+=vec3(1.,.85,.62)*raftGlow*(beam*(.09+.15*b)+exp(-dot(rd,rd)/1400.)*.18);
  float edge=sin(offshore*.16-time*.9+sin(p.x*.017)*.8+c);
  float foam=smoothstep(.92,1.,edge)*(1.-smoothstep(2.,70.,offshore))*smoothstep(-7.,3.,offshore);
  float crest=smoothstep(.055,.22,1.-surfaceNormal.y)*smoothstep(-2.,11.,vWorld.y);
  col=mix(col,mix(vec3(.93,.98,.96),vec3(.35,.52,.66),night),max(foam*(.3+.7*b),crest*.72));
  col+=(a+b-1.)*.018;
  float haze=smoothstep(1700.,7000.,length(cameraPosition.xz-p));col=mix(col,horizon,haze*.85);
  if(!gl_FrontFacing){
   if(snorkelUnderwater>.5){
    float depth=max(0.,vWorld.y-cameraPosition.y),ripple=.5+.5*sin(p.x*.064+p.y*.034+time*.91+a*2.6);
    float gleam=pow(max(0.,dot(refract(-sunDir,n,.75),v)),8.);
    col=mix(underwaterFog,underwaterUpper,(.40+.34*c)*exp(-depth*.0025));
    col+=sun*(gleam*.12+pow(ripple,5.)*.10)*(1.-night*.62)*exp(-depth*.004);
   }else col=mix(vec3(.27,.65,.69),horizon,.3)+sun*spec*.15;
  }
  // Clear shallow water keeps the swimmer and fish visible when terrain lifts
  // a third-person camera above the surface. The rest of the ocean stays solid.
  float clearWater=gl_FrontFacing?snorkelActive*(1.-smoothstep(130.,240.,distance(p,snorkelPoint))):0.;
  gl_FragColor=vec4(col,mix(1.,.18,clearWater));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 // The visible near-water surface and the rigid bodies use the same waves.
 // Keep the far sea flat; only the small playable ribbon needs subdivisions.
 waterMat.vertexShader=waterMat.vertexShader.replace('varying vec3 vWorld;', 'varying vec3 vWorld;varying vec3 vWaterNormal;').replace('void main(){', 'void main(){vWaterNormal=vec3(0.,1.,0.);');
 materials.add(waterMat);const oceanRoot=new T.Group();group.add(oceanRoot);const flatWater=[];
 for(const [w,d,x,z]of[[4000,18000,0,11000],[4000,18000,0,-11000],[18000,40000,11000,0],[18000,40000,-11000,0]]){const m=add(new T.PlaneGeometry(w,d),waterMat,x,COAST_WATER_Y,z,oceanRoot);m.rotation.x=-Math.PI/2;flatWater.push(m);}
 uniforms.waterCenter={value:new T.Vector2()};
 const waveMat=waterMat.clone();waveMat.uniforms=uniforms;waveMat.vertexShader=`#define COAST_LIVE_CLOCK
uniform float waveTime;uniform vec2 waterCenter;varying vec3 vWorld;varying vec3 vWaterNormal;${COAST_WAVE_GLSL}
 void main(){vec4 w=modelMatrix*vec4(position,1.);float blend=1.-smoothstep(1700.,2000.,max(abs(w.x-waterCenter.x),abs(w.z-waterCenter.y)));float raw=coastWaveHeight(w.xz,waveTime),h=mix(oceanPhase.z,raw,blend);vWaterNormal=normalize(vec3((raw-coastWaveHeight(w.xz+vec2(1.,0.),waveTime))*blend,1.,(raw-coastWaveHeight(w.xz+vec2(0.,1.),waveTime))*blend));w.y+=h;vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
 materials.add(waveMat);const waveWater=add(new T.PlaneGeometry(4000,4000,192,192),waveMat,0,COAST_WATER_Y,0);waveWater.rotation.x=-Math.PI/2;
 waveWater.name='海と水路の水面';

 // Promenade, bridge and the town are on the same inland side.
 box(1400,.7,42,0,.08,110,ivory);
 box(52,.2,350,-192,.02,-65,ivory);
 const townBridge=createTownBridge({x:-192,z:-370,id:'coast-bridge',collider,surface,weathered:true});group.add(townBridge.group);
 // Cut through the actual mainland, not a blue overlay on dry ground. The
 // existing sea surface is now visible here; no overlapping second water mesh.
 const canal=COAST_TOWN_CANAL;
 const bankStone=mat(0xb8af94,{map:stoneTexture,bumpMap:stoneTexture,bumpScale:.22}),bankRail=mat(0x397f78);
 for(const z of[canal.z-canal.halfWidth,canal.z+canal.halfWidth])for(const side of[-1,1]){
  const left=side<0?-canal.halfLength:canal.x+canal.bridgeHalfWidth,right=side<0?canal.x-canal.bridgeHalfWidth:canal.halfLength,w=right-left,x=(left+right)/2;
  const bank=box(w,34,12,x,-15,z,bankStone);solid(bank,'canal-bank');
  const rail=box(w,3,3,x,15,z,bankRail);solid(rail,'canal-rail');
 }
 for(const x of[canal.x-36,canal.x+36])for(const z of[canal.z-65,canal.z+65]){const pier=box(8,30,12,x,-15,z,bankStone);solid(pier,'bridge-pier');}
 // Broad bridges are continuous walkable ground, not remote teleport buttons.
 const townColours=[0xeee1cf,0xd9e4d3,0xf2d7c7,0xc2d7df,0xe6dfe9];
 const townMaterials=townColours.map(c=>mat(c)),townHouses=[];
 for(let i=0;i<24;i++){
  const x=-950+i*83+Math.sin(i*3.17)*12,z=-625-(i%3)*72-Math.sin(i*1.73)*14;
  coastTownHouse({box,add,solid,wall:townMaterials[i%5],roof,trim:ivory,window:windowMat,wood,x,z,index:i});townHouses.push({x,z,w:47+(i%3)*7,d:46+(i%4)*4,h:30+(i%3)*15});
 }
 const townDetails=createTownDetails({houses:townHouses,wallMaterials:townMaterials,roofMaterial:roof,streets:[{x:0,z:-568,w:1990,d:28,connector:{x:-192,z:-526,w:52,d:60}}]});group.add(townDetails.group);
 const ridge=add(coastRidgeGeometry(),mat(0xffffff,{vertexColors:true}),0,0,0);ridge.name='連なる海岸の山並み';
 // The star pier is a real continuous floor over the water.
 box(50,3,315,340,-1.5,342.5,wood);box(128,3,102,340,-1.5,551,wood);
 surface({id:'coast-pier',buildingId:'coast-pier',x:340,z:342.5,halfX:25,halfZ:157.5,height:0});
 surface({id:'coast-pier-head',buildingId:'coast-pier',x:340,z:551,halfX:64,halfZ:51,height:0});
 for(let z=210;z<600;z+=30)for(const x of [317,363]){
  cyl(1.8,1.8,z>=500?15:20,x,z>=500?-7.5:-5,z,wood);
 }
 for(const x of [315,365]){const r=box(2,2,270,x,15,365,ivory);solid(r,'pier-rail');}
 const head=named('pier','星待ちの桟橋',340,571,25);head.position.y=0;
 for(const x of [-57,57]){const r=box(2,14,100,x,7,-20,ivory,head);solid(r,'head-rail');}
 const fenderMat=mat(0x69b7c2);for(const f of COAST_DOCK_FENDERS){const bumper=cyl(8,8,31,f.x,-8.5,f.z,fenderMat);solid(bumper,'pier-fender');}
 // The high tide must not pull the stern down to a rope tied below water.
 // These visible, solid posts share the actual solver's mooring endpoints.
 for(const p of COAST_HOME_MOOR_POSTS){const post=cyl(p.halfX,p.halfX,p.maxY-p.minY,p.x,(p.maxY+p.minY)/2,p.z,wood);solid(post,p.id);}
 // A real boarding opening: do not force the passenger's body through a rail
 // while the floating deck carries their feet away from the pier.
 for(const x of[-51,51]){const end=box(26,14,2,x,7,30,ivory,head);solid(end,'head-end');}
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const star=add(new T.OctahedronGeometry(3),gold,340+Math.sin(a)*39,2,571+Math.cos(a)*20);star.rotation.z=.2;}

 const shoreName=named('shore','ひかりの浜',0,285,12);
 // Retired tide-pool and workshop decorations are completely removed.
 const leafTexture=coastSurfaceTexture('foliage');textures.add(leafTexture);const trunkMat=mat(0x82644c,{map:timberTexture,bumpMap:timberTexture,bumpScale:.3}),leafMat=mat(0x67895b,{map:leafTexture,bumpMap:leafTexture,bumpScale:.8});
 for(let i=0;i<30;i++){
  const x=-800+(i*227)%1610+Math.sin(i*4.3)*12,z=-60-((i*89)%310);if(Math.abs(x+192)<65||Math.abs(z-canal.z)<canal.halfWidth+14||!free(x,z,38))continue;
  coastTree({add,solid,trunk:trunkMat,leaves:leafMat,x,y:coastHeight(x,z),z,index:i});
 }
 // The lamp foot, glow and light pool share the actual land or pier deck height.
 const lampPoints=[];
 const deckHeight=(x,z)=>Math.max(coastHeight(x,z),coastPierContains(x,z)?0:-Infinity,
  Math.abs(x-canal.x)<=33&&Math.abs(z-canal.z)<=130?.15:-Infinity,
  Math.abs(x)<=700&&z>=89&&z<=131?.43:-Infinity,Math.abs(x+192)<=26&&z>=-450&&z<=110?.43:-Infinity,
  Math.abs(x+650)<=30&&Math.abs(z-260)<=36?.45:-Infinity);
 for(const [x,z] of [...Array.from({length:12},(_,i)=>[-715+i*130,88]),[-222,-320],[-222,-430],[397,550],[375,400],[380,212],[-650,260]]){
  if(!free(x,z,5))continue;
  const y=deckHeight(x,z),post=cyl(1,1.5,30,x,y+15,z,roof);solid(post,'lamp');
  add(new T.SphereGeometry(3,10,8),lamp,x,y+31,z);lampPoints.push({x,y:y+31,z,size:25});
 }
 const halos=createLightHalos(group,32);halos.set(lampPoints);halos.strength(0);
 const pools=createLightPools(group,lampPoints,deckHeight);pools.strength(0);
 const reflections=lampPoints.filter(p=>p.z>=200).sort((a,b)=>b.z-a.z).slice(0,4);uniforms.reflectionCount.value=reflections.length;reflections.forEach((p,i)=>uniforms.lampSources.value[i].set(p.x,p.z));
 // Buoys visibly identify the boundary of safe paddling; the sand is still real.
 const buoyMat=mat(0xf6d091);
 for(let x=-820;x<=820;x+=82){if(Math.abs(x-340)<72)continue;const z=coastShore(x)+132;add(new T.SphereGeometry(2.4,10,7),buoyMat,x,COAST_WATER_Y+1,z);}

 // The dedicated raft workshop is on dry sand beside the pier approach.
 const shop=new T.Group();shop.name='いかだ工房';shop.position.set(420,coastHeight(420,240),240);shop.userData.nearbyName={id:'coast:raft-upgrades',name:'いかだ工房',hx:40,hz:30,height:60};group.add(shop);
 const table=add(new T.BoxGeometry(64,8,30),wood,420,coastHeight(420,240)+24,240);solid(table,'raft-workshop');
 for(const dx of[-29,29])for(const dz of[-12,12]){const p=add(new T.BoxGeometry(4,50,4),wood,420+dx,coastHeight(420,240)+25,240+dz);solid(p,'raft-workshop-post');}
 const roofSheet=add(new T.BoxGeometry(76,5,46),mat(0x9ddfe3),420,coastHeight(420,240)+52,240);solid(roofSheet,'raft-workshop-roof');
 for(const dx of[-18,0,18]){add(new T.BoxGeometry(3,20,3),wood,420+dx,coastHeight(420,240)+34,240);add(new T.BoxGeometry(10,12,2),mat(dx===18?0xf19ac0:0x58b9ec),420+dx,coastHeight(420,240)+40,240);}
 batchCoastScenery(group,scenery,{exclude:new Set(),geometries});
 splitCoastSurface(landMesh,210,150,{geometries});
 const wavePatches=splitCoastSurface(waveWater,192,192,{geometries,padding:26});
 // A fixed budget of four non-shadow lights; never one light per decoration.
 const shoreLights=[0,1].map(()=>{const l=new T.PointLight(0xffe4b8,0,180,2);group.add(l);return l;});
 const lantern=new T.Group();lantern.name='いかだの航海灯';group.add(lantern);
 const post=new T.Mesh(new T.CylinderGeometry(.65,.9,26,8),wood);post.position.set(-22,17,20);lantern.add(post);geometries.add(post.geometry);
 const raftLamp=mat(0xffe8b4,{emissive:WARM_LIGHT.core,emissiveIntensity:0});
 const glow=new T.Mesh(new T.CylinderGeometry(2,2,5,10),raftLamp);glow.position.set(-22,31,20);lantern.add(glow);geometries.add(glow.geometry);
 for(const y of[28,34]){const cap=new T.Mesh(new T.CylinderGeometry(3.1,3.1,1,10),roof);cap.position.set(-22,y,20);lantern.add(cap);geometries.add(cap.geometry);}
 const cabinLight=new T.PointLight(0xffe5bc,0,135,2);cabinLight.position.set(-22,30,20);lantern.add(cabinLight);
 const forwardLight=new T.SpotLight(0xffe8c4,0,300,.62,.75,2);forwardLight.position.set(0,29,25);forwardLight.target.position.set(0,-5,190);lantern.add(forwardLight,forwardLight.target);
 const facing=new T.Vector3(),actorPoint=new T.Vector3();let lampStrength=0,raftLampStrength=0;
 const wildlife=createCoastWildlife({uniforms});group.add(wildlife.root);
 let lastDate=-Infinity,lastHour=null,lastPhase='',disposed=false;
 const mixColour=(k,a,b,t)=>uniforms[k].value.set(a[k]).lerp(new T.Color(b[k]),t);
 function update({camera,scene,sun,hemi,time=performance.now(),waveTime=coastOceanTime(),date=new Date(),actor=null,raft=null,snorkeling=false,wildlifePaused=false,watchWhale=true}){
  if(disposed)return;atmosphere.update(camera,time);
  uniforms.waveTime.value=waveTime;
  uniforms.snorkelActive.value=snorkeling?1:0;if(actor)uniforms.snorkelPoint.value.set(actor.x,actor.z);
  for(const material of[waterMat,waveMat])if(material.transparent!==!!snorkeling){material.transparent=!!snorkeling;material.depthWrite=!snorkeling;material.needsUpdate=true;}
  const sea=coastSeaState(0,0,waveTime);uniforms.oceanPhase.value.set((waveTime*WAVE.speed)%(Math.PI*2),(waveTime*WAVE.speed2)%(Math.PI*2),sea.tide,sea.offshoreLevel);
  for(const surface of flatWater)surface.position.y=COAST_WATER_Y+sea.tide;
  actorPoint.copy(actor??camera.position);
  const cx=Math.round(actorPoint.x/80)*80,cz=Math.round(actorPoint.z/80)*80;oceanRoot.position.set(cx,0,cz);uniforms.waterCenter.value.set(cx,cz);
  for(const patch of wavePatches){patch.position.x=cx;patch.position.z=cz;patch.updateMatrix();}islands.update(actorPoint);
  let first=null,second=null,firstD=Infinity,secondD=Infinity;for(const p of lampPoints){const d=(p.x-actorPoint.x)**2+(p.z-actorPoint.z)**2;if(d<firstD){second=first;secondD=firstD;first=p;firstD=d;}else if(d<secondD){second=p;secondD=d;}}
  for(let i=0;i<2;i++){const p=i?second:first,l=shoreLights[i];if(p){l.position.set(p.x,p.y,p.z);l.intensity=lampStrength*1500*(1-T.MathUtils.smoothstep(i?secondD:firstD,180**2,250**2));}}
  lantern.visible=!!raft;if(raft){lantern.position.fromArray(raft.p);lantern.quaternion.fromArray(raft.q);facing.set(0,0,1).applyQuaternion(lantern.quaternion);uniforms.raftLight.value.copy(lantern.position);uniforms.raftForward.value.set(facing.x,facing.z).normalize();}
  const hour=date.getHours();
  if(Math.abs(+date-lastDate)>=10000||hour!==lastHour){
   lastDate=+date;lastHour=hour;townDetails.update(date);const l=coastLighting(date);lastPhase=l.phase;
   // A navigation lamp stays lit throughout morning, evening and night.
   // Keep its switch separate from the softly fading lamps on shore.
   raftLampStrength=l.phase==='day'?0:1;
   raftLamp.emissiveIntensity=raftLampStrength*2.2;
   for(const k of colors)mixColour(k,l.from,l.to,l.blend);
   const blend=k=>T.MathUtils.lerp(l.from[k],l.to[k],l.blend),a=blend('azimuth'),e=blend('elevation');
   uniforms.sunDir.value.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
   uniforms.night.value=blend('night');const mood=eveningLight(date);lampStrength=mood.strength;uniforms.dusk.value=mood.dusk;uniforms.lampGlow.value=mood.strength;
   lamp.emissive.set(WARM_LIGHT.core);lamp.emissiveIntensity=mood.strength*2.2;windowMat.emissive.set(WARM_LIGHT.halo);windowMat.emissiveIntensity=mood.strength*1.65;
   halos.strength(mood.strength);pools.strength(mood.strength);
   hemi.intensity=blend('ambient');hemi.color.set(0xe8f1ff);hemi.groundColor.set(0xb6b0a0);
   sun.intensity=blend('power');sun.color.copy(uniforms.sun.value);sun.position.copy(uniforms.sunDir.value).multiplyScalar(500);sun.position.y=Math.max(70,sun.position.y);
   scene.background.copy(uniforms.horizon.value);scene.fog.color.copy(uniforms.horizon.value);
  }
  cabinLight.intensity=raftLampStrength*1250;forwardLight.intensity=raftLampStrength*10000;uniforms.raftGlow.value=raft?raftLampStrength:0;
  // Only the equipped swimmer uses clear underwater distance fog. Returning
  // to shore or another map restores the existing atmosphere immediately.
  const lensDepth=snorkeling?coastWave(camera.position.x,camera.position.z,waveTime).height-camera.position.y:0;
  const submerged=snorkeling&&lensDepth>1;
  uniforms.snorkelUnderwater.value=submerged?1:0;
  shafts.visible=submerged;
  waterLight.time.value=waveTime;
  waterLight.surface.value=COAST_WATER_Y+sea.tide;
  waterLight.strength.value=1-uniforms.night.value*.61;
  if(submerged){
   if(!scene.userData.snorkelFog)scene.userData.snorkelFog={near:scene.fog.near,far:scene.fog.far};
   const depth=T.MathUtils.smoothstep(lensDepth,10,420),night=uniforms.night.value;
   uniforms.underwaterFog.value.copy(waterColours[0]).lerp(waterColours[1],depth);
   uniforms.underwaterLower.value.copy(waterColours[2]).lerp(waterColours[3],depth);
   // Nearby skin, fish and sand retain their real colours before distance haze.
   // Night remains blue and readable, without the same bright daytime turquoise.
   uniforms.underwaterFog.value.lerp(uniforms.underwaterLower.value,night*.34);
   uniforms.underwaterUpper.value.copy(waterColours[4]).lerp(waterColours[5],night).lerp(waterColours[6],depth*.2);
   uniforms.underwaterLower.value.copy(waterColours[6]).lerp(waterColours[7],depth).multiplyScalar(1.-night*.18);
   scene.fog.near=T.MathUtils.lerp(170,115,depth);
   scene.fog.far=T.MathUtils.lerp(1040,770,depth)*(1-night*.12);
   scene.fog.color.copy(uniforms.underwaterFog.value);scene.background.copy(uniforms.underwaterFog.value);
  }
  else if(scene.userData.snorkelFog){Object.assign(scene.fog,scene.userData.snorkelFog);delete scene.userData.snorkelFog;scene.fog.color.copy(uniforms.horizon.value);scene.background.copy(uniforms.horizon.value);}
  wildlife.update({camera,time,waveTime,date,actor:actorPoint,raft,level:coastSeaState(actorPoint.x,actorPoint.z,waveTime).level,waterY:COAST_WATER_Y+sea.tide,paused:wildlifePaused||(typeof document!=='undefined'&&document.hidden),watchWhale});
 }
 function dispose(){if(disposed)return;disposed=true;rumors.dispose();townDetails.dispose();wildlife.dispose();townBridge.dispose();halos.dispose();pools.dispose();forage.dispose();islands.dispose();cave.dispose();atmosphere.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}
 return {group,forage,toys,cave,wildlife,residents:rumors.residents,pebbles:islands.pebbles,trees:islands.trees,prepare:islands.prepare,update,dispose,get phase(){return lastPhase;},places:COAST_PLACES};
}
