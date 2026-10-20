import {createScenicSky} from './imasora-scenic-sky.mjs?v=120gp';
import * as T from './three.module.min.js';
import {COAST_PLACES,COAST_WATER_Y,coastHeight,coastShore,coastLighting} from './imasora-coast-layout.mjs?v=120go';

const vertex=`
varying vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const hash=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}`;
const colors=['top','horizon','sea','deep','sun'];
function lightUniforms(){return Object.fromEntries(colors.map(k=>[k,{value:new T.Color()}]));}
export function createCoastWorld({collider=()=>{},surface=()=>{},reserved=[]}={}){
 const group=new T.Group();group.name='imasora-coast-open-world';
 const materials=new Set(),geometries=new Set(),textures=new Set();
 const mat=(c,extra={})=>{const m=new T.MeshStandardMaterial({color:c,roughness:.82,...extra});materials.add(m);return m;};
 const sand=mat(0xe9d8b6),ivory=mat(0xf7f1dd),wood=mat(0xb88e66),mint=mat(0x9bd0c5),roof=mat(0x567c8c),rock=mat(0xa0b2ae),gold=mat(0xeac685);
 const lamp=mat(0xffe8b4,{emissive:0xffcb7b,emissiveIntensity:0}),windowMat=mat(0xbfdbe4,{emissive:0xffce83,emissiveIntensity:0});
 const add=(geo,m,x,y,z,parent=group)=>{geometries.add(geo);const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,x,y,z,m=wood,parent=group)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cyl=(r1,r2,h,x,y,z,m,parent=group)=>add(new T.CylinderGeometry(r1,r2,h,16),m,x,y,z,parent);
 const solid=(o,id)=>{const b=new T.Box3().setFromObject(o),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());collider(c.x,c.z,[s.x,s.z],0,'coast-'+id,0,{minY:b.min.y,maxY:b.max.y,obstacleHeight:b.max.y});};
 const named=(id,name,x,z,height=40)=>{const g=new T.Group();g.position.set(x,coastHeight(x,z),z);g.name=name;g.userData.nearbyName={id:'coast:'+id,name,hx:25,hz:25,height};group.add(g);return g;};
 const free=(x,z,r=30)=>!reserved.some(b=>Math.abs(x-b.position[0])<r+130&&Math.abs(z-b.position[2])<r+130);

 // One continuous mesh, shared with the walking sampler. Existing plot area is flat.
 const land=new T.PlaneGeometry(4200,3000,210,150);land.rotateX(-Math.PI/2);land.translate(0,0,-300);
 const p=land.attributes.position,colour=[];
 for(let i=0;i<p.count;i++){
  const ox=p.getX(i),oz=p.getZ(i),x=Math.abs(ox)>1600?Math.sign(ox)*(1600+(Math.abs(ox)-1600)*12):ox,z=oz<-1000?-1000+(oz+1000)*4:oz,y=coastHeight(x,z);p.setXYZ(i,x,y,z);
  const inland=1-T.MathUtils.smoothstep(z,60,195),wet=T.MathUtils.smoothstep(z,coastShore(x)-75,coastShore(x)+12);
  const c=new T.Color(0xeedebe).lerp(new T.Color(0x94bca0),inland*.77).lerp(new T.Color(0xb7b89e),wet*.62);
  c.multiplyScalar(.96+.04*Math.sin(x*.07)*Math.cos(z*.06));colour.push(c.r,c.g,c.b);
 }
 land.setAttribute('color',new T.Float32BufferAttribute(colour,3));land.computeVertexNormals();
 const landMat=mat(0xffffff,{vertexColors:true});add(land,landMat,0,0,0);
 const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=256;
 const grainContext=grainCanvas.getContext('2d'),grain=grainContext.createImageData(256,256);
 let grainSeed=47;for(let i=0;i<grain.data.length;i+=4){grainSeed=(Math.imul(grainSeed,1664525)+1013904223)>>>0;const g=223+(grainSeed%31);grain.data[i]=grain.data[i+1]=grain.data[i+2]=g;grain.data[i+3]=255;}
 grainContext.putImageData(grain,0,0);const grainTexture=new T.CanvasTexture(grainCanvas);grainTexture.wrapS=grainTexture.wrapT=T.RepeatWrapping;grainTexture.repeat.set(84,60);grainTexture.colorSpace=T.SRGBColorSpace;textures.add(grainTexture);landMat.map=grainTexture;landMat.needsUpdate=true;

 const uniforms={...lightUniforms(),time:{value:0},night:{value:0},sunDir:{value:new T.Vector3()}};
 const atmosphere=createScenicSky({uniforms,radius:8500});
 group.add(atmosphere.sky);
 const waterMat=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:`
 precision highp float;varying vec3 vWorld;uniform float time,night;uniform vec3 top,horizon,sea,deep,sun,sunDir;
 ${hash}
 void main(){
  vec2 p=vWorld.xz;float shore=325.+28.*cos(p.x/235.)+16.*sin(p.x/120.);
  float offshore=vWorld.z-shore;
  vec2 drift=vec2(time*.5,-time*.8);
  float a=noise(p*.08+drift),b=noise(p*.17-drift*.7),c=noise(p*.035+drift*.2);
  vec3 n=normalize(vec3((a-.5)*.17+(b-.5)*.07,1.,(c-.5)*.16+(a-b)*.06));
  vec3 v=normalize(cameraPosition-vWorld);float fres=pow(1.-max(0.,dot(v,n)),3.);
  vec3 col=mix(sea,deep,smoothstep(20.,650.,offshore));
  col=mix(col,mix(horizon,top,.15),fres*.65);
  float spec=pow(max(0.,dot(reflect(-sunDir,n),v)),180.);
  col+=sun*spec*(2.-night);
  float edge=sin(offshore*.16-time*.9+sin(p.x*.017)*.8+c);
  float foam=smoothstep(.92,1.,edge)*(1.-smoothstep(2.,70.,offshore))*smoothstep(-7.,3.,offshore);
  col=mix(col,mix(vec3(.93,.98,.96),vec3(.35,.52,.66),night),foam*(.3+.7*b));
  col+=(a+b-1.)*.018;
  float haze=smoothstep(1700.,7000.,length(cameraPosition.xz-p));col=mix(col,horizon,haze*.85);
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 materials.add(waterMat);const water=add(new T.PlaneGeometry(22000,18000),waterMat,0,COAST_WATER_Y,7500);water.rotation.x=-Math.PI/2;

 // Promenade, bridge and the town are on the same inland side.
 box(1400,.7,42,0,.08,110,ivory);
 box(52,.7,560,-192,.08,-170,ivory);
 for(const x of [-220,-164])for(let z=-485;z<=-250;z+=24){
  const post=box(3,14,3,x,7,z,ivory);solid(post,'bridge-post');
 }
 for(const x of [-220,-164]){const rail=box(2,2,260,x,14,-370,wood);solid(rail,'bridge-rail');}
 const bridge=named('town','街へ続く橋',-192,-410,20);
 box(28,17,2,0,25,0,mint,bridge);
 for(const x of [-13,13])box(2,24,2,x,12,0,wood,bridge);
 // Broad bridges are continuous walkable ground, not remote teleport buttons.
 const townColours=[0xeee1cf,0xd9e4d3,0xf2d7c7,0xc2d7df,0xe6dfe9];
 for(let i=0;i<22;i++){
  const x=-900+i*88,z=-620-(i%3)*65,h=26+(i%5)*11;
  const b=box(55,h,54,x,h/2,z,mat(townColours[i%5]));solid(b,'town-house-'+i);
  const r=add(new T.ConeGeometry(43,21,4),roof,x,h+10,z);r.rotation.y=Math.PI/4;
  for(let col=-1;col<=1;col++)for(let row=0;row<2;row++)box(7,8,.3,x+col*14,10+row*18,z+27.2,windowMat);
 }
 // Soft hills beyond town join the terrestrial skyline.
 const hillMat=mat(0x86ac9c);
 for(let i=0;i<12;i++){const h=add(new T.SphereGeometry(1,20,12),hillMat,-2400+i*440,-35,-1350-(i%3)*210);h.scale.set(530,190+(i%4)*55,420);}

 // The star pier is a real continuous floor over the water.
 box(50,3,397,340,-1.5,383.5,wood);box(128,3,62,340,-1.5,571,wood);
 surface({id:'coast-pier',buildingId:'coast-pier',x:340,z:383.5,halfX:25,halfZ:198.5,height:0});
 surface({id:'coast-pier-head',buildingId:'coast-pier',x:340,z:571,halfX:64,halfZ:31,height:0});
 for(let z=210;z<600;z+=30)for(const x of [317,363]){
  cyl(1.8,1.8,20,x,-5,z,wood);
 }
 for(const x of [315,365]){const r=box(2,2,310,x,15,385,ivory);solid(r,'pier-rail');}
 const head=named('pier','星待ちの桟橋',340,571,25);head.position.y=0;
 for(const x of [-57,57]){const r=box(2,14,60,x,7,0,ivory,head);solid(r,'head-rail');}
 const end=box(128,14,2,0,7,30,ivory,head);solid(end,'head-end');
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const star=add(new T.OctahedronGeometry(3),gold,340+Math.sin(a)*39,2,571+Math.cos(a)*20);star.rotation.z=.2;}

 // Original landmark: a shell spiral carrying a little sky-blue beacon.
 const lightHouse=named('lighthouse','空貝の灯台',-650,185,125);
 const base=cyl(18,26,75,0,37.5,0,ivory,lightHouse);solid(base,'lighthouse');
 for(let i=0;i<5;i++){const y=18+i*14,ring=add(new T.TorusGeometry(26-8*y/75+.4,2.6,8,36),mint,0,y,0,lightHouse);ring.rotation.x=Math.PI/2;}
 cyl(21,21,6,0,77,0,wood,lightHouse);
 cyl(14,14,20,0,89,0,windowMat,lightHouse);
 const cap=add(new T.ConeGeometry(24,24,12),roof,0,111,0,lightHouse);
 const beacon=add(new T.OctahedronGeometry(7),lamp,0,91,0,lightHouse);
 const orbit=add(new T.TorusGeometry(32,1.1,8,60),gold,0,93,0,lightHouse);orbit.rotation.x=.8;
 box(60,.5,72,-650,.2,260,ivory);
 const shoreName=named('shore','ひかりの浜',0,285,12);
 // Tide pools: embedded, large smooth stones, a shallow reflective pool.
 const pool=named('rocks','潮だまりの入り江',-465,280,18);
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11,r=52+7*Math.sin(i*3),x=-465+Math.sin(a)*r,z=280+Math.cos(a)*r*.55;
  const stone=add(new T.SphereGeometry(1,10,7),rock,x,coastHeight(x,z)+3,z);stone.scale.set(9+i%4,5+i%3,8);solid(stone,'pool-rock-'+i);
 }
 const poolWater=add(new T.CircleGeometry(40,40),waterMat,-465,coastHeight(-465,280)+1.2,280);poolWater.rotation.x=-Math.PI/2;poolWater.scale.y=.55;
 // Garden with a wind-chime pavilion; open sides preserve sight lines.
 const garden=named('garden','潮風の庭',590,75,68);
 for(const x of [-35,35])for(const z of [-27,27]){const post=box(3,43,3,x,21.5,z,ivory,garden);solid(post,'garden-post');}
 const top=add(new T.ConeGeometry(57,19,4),mint,0,51,0,garden);top.rotation.y=Math.PI/4;
 const chimes=[];
 for(let i=0;i<5;i++){const ch=cyl(.65,.65,7+i,(-2+i)*5,36-i%2*3,0,gold,garden);chimes.push(ch);}
 const trunkMat=mat(0xad957a),leafMat=mat(0x78ad8c);
 for(let i=0;i<36;i++){
  const x=-800+(i*227)%1610,z=-60-((i*89)%310);if(Math.abs(x+192)<65||!free(x,z,38))continue;
  const y=coastHeight(x,z),trunk=cyl(1.7,2.5,28,x,y+14,z,trunkMat);solid(trunk,'tree-'+i);
  const leaf=add(new T.IcosahedronGeometry(20,1),leafMat,x,y+34,z);leaf.scale.set(1,1.15,1);
 }
 const flowers=[mat(0xffdec4),mat(0xf5d7e5),mat(0xc6d9f2)];
 // Instanced flowers and beach shells: bounded draws and no per-frame geometry.
 const matrix=new T.Matrix4(),pos=new T.Vector3(),quat=new T.Quaternion(),scale=new T.Vector3();
 for(let c=0;c<3;c++){
  const geo=new T.OctahedronGeometry(1.3),mesh=new T.InstancedMesh(geo,flowers[c],70);geometries.add(geo);
  for(let i=0;i<70;i++){const a=i*2.399963,x=590+Math.sin(a)*(48+i*.7),z=75+Math.cos(a)*(42+i*.5);pos.set(x,coastHeight(x,z)+1.5,z);scale.set(1,.55,1);matrix.compose(pos,quat,scale);mesh.setMatrixAt(i,matrix);}group.add(mesh);
 }
 const shellGeo=new T.SphereGeometry(1.4,7,5),shells=new T.InstancedMesh(shellGeo,ivory,100);geometries.add(shellGeo);
 for(let i=0;i<100;i++){const x=-780+(i*137)%1500,z=210+(i*73)%90;pos.set(x,coastHeight(x,z)+.45,z);scale.set(1,.25,.8);matrix.compose(pos,quat,scale);shells.setMatrixAt(i,matrix);}group.add(shells);
 // Warm pools under lamps are transparent disks, not costly extra shadow lights.
 const glows=[];
 const glowTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,216,132,.65)');g.addColorStop(1,'rgba(255,216,132,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const t=new T.CanvasTexture(c);textures.add(t);return t;})();
 const glowMat=new T.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,opacity:0});materials.add(glowMat);
 for(const [x,z] of [...Array.from({length:12},(_,i)=>[-715+i*130,88]),[-222,-320],[-222,-430],[340,550],[340,400],[340,240],[-650,260]]){
  if(!free(x,z,5))continue;
  const y=coastHeight(x,z),post=cyl(1,1.5,30,x,y+15,z,roof);solid(post,'lamp');
  add(new T.SphereGeometry(3,10,8),lamp,x,y+31,z);const g=add(new T.PlaneGeometry(50,50),glowMat,x,y+.12,z);g.rotation.x=-Math.PI/2;glows.push(g);
 }
 // Buoys visibly identify the boundary of safe paddling; the sand is still real.
 const buoyMat=mat(0xf6d091);
 for(let x=-820;x<=820;x+=82){if(Math.abs(x-340)<72)continue;const z=coastShore(x)+132;add(new T.SphereGeometry(2.4,10,7),buoyMat,x,COAST_WATER_Y+1,z);}

 let lastDate=-Infinity,lastPhase='',disposed=false;
 const mixColour=(k,a,b,t)=>uniforms[k].value.set(a[k]).lerp(new T.Color(b[k]),t);
 function update({camera,scene,sun,hemi,time=performance.now(),date=new Date()}){
  if(disposed)return;atmosphere.update(camera,time);
  chimes.forEach((m,i)=>m.rotation.z=Math.sin(time*.001+i)*.06);beacon.rotation.y=time*.0003;
  if(Math.abs(+date-lastDate)>=10000){
   lastDate=+date;const l=coastLighting(date);lastPhase=l.phase;
   for(const k of colors)mixColour(k,l.from,l.to,l.blend);
   const blend=k=>T.MathUtils.lerp(l.from[k],l.to[k],l.blend),a=blend('azimuth'),e=blend('elevation');
   uniforms.sunDir.value.set(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
   uniforms.night.value=blend('night');lamp.emissiveIntensity=uniforms.night.value*2;windowMat.emissiveIntensity=uniforms.night.value*1.2;glowMat.opacity=uniforms.night.value*.8;
   hemi.intensity=blend('ambient');hemi.color.copy(uniforms.horizon.value);hemi.groundColor.set(0x8c9f9a);
   sun.intensity=blend('power');sun.color.copy(uniforms.sun.value);sun.position.copy(uniforms.sunDir.value).multiplyScalar(500);sun.position.y=Math.max(70,sun.position.y);
   scene.background.copy(uniforms.horizon.value);scene.fog.color.copy(uniforms.horizon.value);
  }
 }
 function dispose(){disposed=true;atmosphere.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}
 return {group,update,dispose,get phase(){return lastPhase;},places:COAST_PLACES};
}
