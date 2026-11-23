import * as T from './three.module.min.js';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs';
import {eveningLight,createLightHalos,createLightPools} from './imasora-evening-light.mjs';
import {buildMatureStarCharacter360,disposeMatureCharacterModel,WHITE_MICHI_ROAD_SABER_REN_ID} from './imasora-character-360.js?v=120ob';
// Detail stays on the existing house envelope; it never changes bridge, ground,
// body collisions, saved buildings or the map connection.
export function createTownDetails({houses,wallMaterials=[],roofMaterial,roofs=false,front=false,streets=[]}){
 const group=new T.Group();group.name='town-architectural-detail';group.userData.nonCollidable=true;
 const geometry=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4(),rows=new Map(),gableMatrices=[],materials=[],textures=[],lamps=[],pools=[];
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.8,...extra});materials.push(m);return m;};
 const masonry=coastSurfaceTexture('stone');masonry.repeat.set(3,2);textures.push(masonry);for(const m of wallMaterials){m.map=masonry;m.bumpMap=masonry;m.bumpScale=.09;m.roughness=.92;}
 const roofTexture=coastSurfaceTexture('wood');roofTexture.repeat.set(4,3);textures.push(roofTexture);if(roofMaterial&&!roofMaterial.map){roofMaterial.map=roofTexture;roofMaterial.bumpMap=roofTexture;roofMaterial.bumpScale=.12;}
 const asphalt=mat(0x64747a),sill=mat(0xe4ddd0),metal=mat(0x576773,{metalness:.35,roughness:.52}),stone=mat(0xa8a498),dark=mat(0x45606a,{metalness:.18,roughness:.24}),warm=mat(0xbcd0cb,{emissive:0xffbe72,emissiveIntensity:0}),cream=mat(0xbcd0cb,{emissive:0xffe2ac,emissiveIntensity:0}),cool=mat(0xbcd0cb,{emissive:0xafd8ed,emissiveIntensity:0});const glow=[warm,cream,cool];
 const put=(m,x,y,z,w,h,d,angle=0)=>{if(!rows.has(m))rows.set(m,[]);matrix.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),angle),new T.Vector3(w,h,d));rows.get(m).push(matrix.clone());};
 houses.forEach((a,n)=>{const{x,z,h,w=68,d=62}=a;
  // Recessed side windows, projecting sills, narrow frames and floor bands.
  for(const side of[-1,1])for(let floor=0;floor<(h>45?3:2);floor++)for(const col of[-1,1]){
   const wx=x+side*(w/2+.55),wz=z+col*d*.24,y=10+floor*14,lit=(n*7+floor*5+col+9)%5!==0,m=lit?glow[(n+floor)%7===0?2:(n+floor)%2]:dark;
   put(sill,wx,y,wz,1.4,12,10);put(m,wx+side*.8,y,wz,.3,9.8,7.8);put(metal,wx+side*1.1,y,wz,.35,.65,8);put(metal,wx+side*1.1,y,wz,.35,10,.6);put(stone,wx+side*1.6,y-6,wz,3,1.3,12);
   if(lit)lamps.push({x:wx+side*1.3,y,z:wz,size:13,color:m===cool?0xbbe1ff:m===warm?0xffbd72:0xffdfab});
  }
  if(front){for(const dx of[-20,0,20])for(const y of[11,27]){if(dx===0&&y===11)continue;put(sill,x+dx,y,z+d/2+.1,12,13,.4);put(metal,x+dx,y,z+d/2+.6,.6,11,.4);put(metal,x+dx,y,z+d/2+.6,10,.6,.4);put(stone,x+dx,y-6.5,z+d/2+1,14,1.3,3);}put(metal,x,7,z+d/2+.6,9,14,.8);}
  put(stone,x,.05,z+d/2+7,w+8,.1,14);for(const y of[3,h-2])put(sill,x,y,z,w+1.8,1.2,d+1.8);
  for(const side of[-1,1]){put(metal,x+side*(w/2+3),h+1,z,1.2,1.3,d+9);put(metal,x+side*(w/2+2),h/2,z-d/2-1.4,1.2,h,1.2);}
  // Modest entrance canopy, real chimney cap and practical roof fittings.
  put(metal,x,19,z+d/2+3,13,1,7);put(warm,x,18,z+d/2+3,5,.4,3);lamps.push({x,y:18,z:z+d/2+4,size:18,color:0xffc888});pools.push({x,z:z+d/2+5,radius:17});
  put(stone,x+w*.22,h+7,z-d*.18,5,14,6);put(metal,x+w*.22,h+14.5,z-d*.18,7,1.2,8);put(metal,x-w*.2,h+2,z+d*.14,9,2,7);
  if(roofs){
   const pitch=a.roofPitch??.38,half=w/2+4,span=Math.tan(pitch)*half,wallRise=Math.tan(pitch)*w/2,len=half/Math.cos(pitch);
   for(const side of[-1,1]){
    matrix.compose(new T.Vector3(x,h,z+side*d/2),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),side<0?Math.PI:0),new T.Vector3(w,wallRise,1));
    gableMatrices.push(matrix.clone());
    put(a.roofMaterial??roofMaterial,x+side*half/2,h+wallRise-span/2,z,len,2,d+8,-side*pitch);
   }
   put(metal,x,h+wallRise+.7,z,2,1.4,d+10);
  }
 });
 for(const street of streets){if(street.connector){const c=street.connector;put(asphalt,c.x,.035,c.z,c.w,.07,c.d);}put(asphalt,street.x,.035,street.z,street.w,.07,street.d);for(const side of[-1,1])put(stone,street.x,.09,street.z+side*(street.d/2+2),street.w,.16,4);for(let x=street.x-street.w/2+28;x<street.x+street.w/2;x+=110){const z=street.z+street.d/2+5;put(metal,x,12,z,1,24,1);put(metal,x+2,24,z,6,1.2,3);put(warm,x+2,23,z,4,.4,2);lamps.push({x:x+2,y:23,z,size:20,color:0xffd19a});pools.push({x:x+2,z:street.z,radius:24});}}
 for(const[m,list]of rows){const mesh=new T.InstancedMesh(geometry,m,list.length);list.forEach((v,i)=>mesh.setMatrixAt(i,v));mesh.name='town-detail-'+(glow.includes(m)?'lit-windows':'solid');mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 let gableGeometry=null;if(gableMatrices.length){gableGeometry=new T.BufferGeometry();gableGeometry.setAttribute('position',new T.Float32BufferAttribute([-.5,0,0,.5,0,0,0,1,0],3));gableGeometry.computeVertexNormals();const mesh=new T.InstancedMesh(gableGeometry,sill,gableMatrices.length);gableMatrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.name='town-roof-gables';mesh.computeBoundingSphere();group.add(mesh);}
 const halos=createLightHalos(group,lamps.length);halos.set(lamps);const lightPools=createLightPools(group,pools,()=>.05);let last=-Infinity,disposed=false;
 function update(date=new Date()){if(disposed||Math.abs(+date-last)<10000)return;last=+date;const n=eveningLight(date).strength;warm.emissiveIntensity=n*2.4;cream.emissiveIntensity=n*2.1;cool.emissiveIntensity=n*1.7;halos.strength(n*1.1);lightPools.strength(n*.8);}
 update();return{group,update,stats:{houses:houses.length,draws:rows.size+2+(gableMatrices.length?1:0),realLights:0,windows:lamps.length-houses.length},dispose(){if(disposed)return;disposed=true;halos.dispose();lightPools.dispose();for(const o of group.children)if(o.isInstancedMesh)o.dispose();geometry.dispose();gableGeometry?.dispose();materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}};
}

// Chapter 18. The clock is advanced by the viewer only while the scene is
// playing; a hidden tab or a closed page cannot complete the credits.
export const RAIN_STORY_END_SECONDS = 62;
const firstDropAt = 12.4;
const rainbowAt = 29.5;
const ease = (a,b,t) => T.MathUtils.smoothstep(t,a,b);
const mix = T.MathUtils.lerp;
const fract = n => n-Math.floor(n);
const sample = n => fract(Math.sin(n*87.19+11.7)*43758.5453);
const shots = [
  {at:0, key:'station', from:[13,5.6,17], to:[9,4.6,15], aim:[0,2,-5]},
  {at:4.8, key:'reunion', from:[3.8,2.8,8.6], to:[2.9,2.35,7.9], aim:[-.1,1.23,-.45]},
  {at:13.9, key:'rain', from:[2.75,1.35,5.5], to:[3,2.2,7.2], aim:[-.28,1.15,.1]},
  {at:17.8, key:'shelter', from:[19,2.82,10.1], to:[17.7,2.54,9.6], aim:[11.18,1.55,2.35]},
  {at:28.3, key:'coast', from:[37,22,34], to:[34,24,40], aim:[1,19,-82], credit:['イマソラーズウォーク','雨の物語']},
  {at:36.1, key:'blue-door', from:[-25,3,13], to:[-25,3.4,10], aim:[-21,1.6,5.1], credit:['セハルネとバルティア','街で出会った親子']},
  {at:43, key:'amane', from:[11,3.0,13], to:[8.5,2.9,11.6], aim:[-.2,1.45,-3.8], credit:['アマネ星','バルティアの母と父']},
  {at:49.8, key:'sky', from:[9,3.7,11.6], to:[7,3.3,10.6], aim:[-.7,1.6,-2.9], credit:['空駅','街と空を結ぶ運転士']},
  {at:56.7, key:'return', from:[-17,5.4,18], to:[-17,6.3,19.5], aim:[-14,4.1,-13], credit:['イマソラーズウォーク','雨の物語　おわり']},
];

export function rainStoryEndingFrame(time) {
  const t = Math.min(RAIN_STORY_END_SECONDS, Math.max(0,time));
  const index = shots.findLastIndex(shot => shot.at <= t);
  const shot = shots[index];
  const next = shots[index+1]?.at ?? RAIN_STORY_END_SECONDS;
  return {
    shot, t, travel: ease(shot.at,next,t),
    rain: ease(firstDropAt,18,t)*(1-.85*ease(27.5,34,t))*(1-ease(34,38,t)),
    sun: ease(25,33,t), rainbow: ease(rainbowAt,33,t)*(1-ease(35.4,36.1,t)),
    creditOpacity: shot.credit ? ease(shot.at+.6,shot.at+1.6,t)*(1-ease(next-1,next-.15,t)) : 0,
    curtain: 1-ease(0,1.0,t)+ease(60.7,RAIN_STORY_END_SECONDS,t),
    finished: t>=RAIN_STORY_END_SECONDS,
  };
}

function makeEndingWeather(scene, material, geometry) {
  const rain = new T.Group(); scene.add(rain);
  const drops = new Float32Array(520*6);
  const rainGeo = new T.BufferGeometry();
  rainGeo.setAttribute('position',new T.BufferAttribute(drops,3).setUsage(T.DynamicDrawUsage));
  const rainInk = new T.LineBasicMaterial({color:0xc8e2eb,transparent:true,opacity:0,depthWrite:false});
  const streaks = new T.LineSegments(rainGeo,rainInk);
  streaks.frustumCulled = false; rain.add(streaks);
  const ripples = Array.from({length:18},(_,i)=>{
    const ring = new T.Mesh(geometry.ring,new T.MeshBasicMaterial({color:0xcce7e6,transparent:true,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;
    ring.position.set(i===0?-1.4:sample(i+31)*26-13,.027,i===0?1:sample(i+94)*12-3);
    rain.add(ring);
    return ring;
  });
  const wetInk = new T.ShaderMaterial({
    uniforms:{amount:{value:0},sun:{value:0}},
    vertexShader:'varying vec2 tex; void main(){tex=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      varying vec2 tex; uniform float amount,sun;
      void main(){
        vec2 p=tex*2.-1.;
        float edge=length(p)+sin(p.x*14.)*.06+sin(p.y*17.)*.035;
        vec3 color=mix(vec3(.16,.24,.28),vec3(.49,.55,.51),sun);
        gl_FragColor=vec4(color,(1.-smoothstep(.63,1.,edge))*amount);
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,
  });
  const sheen = new T.PlaneGeometry(1,1);
  for(let i=0;i<11;i++){
    const pool=new T.Mesh(sheen,wetInk);
    pool.rotation.x=-Math.PI*.5;
    pool.scale.set(.8+sample(i+38)*3.5,.62+sample(i+75)*2,1);
    pool.position.set(sample(i+230)*28-14,.022,2+sample(i+178)*9);
    rain.add(pool);
  }
  const droplet = new T.Mesh(geometry.ball,material.drop);
  droplet.scale.set(.031,.091,.031); rain.add(droplet);
  const shoulderDrop = droplet.clone();rain.add(shoulderDrop);
  const rainbowInk = new T.ShaderMaterial({
    uniforms:{amount:{value:0}},
    vertexShader:'varying vec2 tex; void main(){tex=uv; gl_Position=projectionMatrix * modelViewMatrix * vec4(position,1.);}',
    fragmentShader:`
      uniform float amount; varying vec2 tex;
      void main(){
        vec2 p=vec2((tex.x-.5)*2.,tex.y-.04);
        float radius=length(p);
        float spectrum=clamp((.925-radius)/.086,0.,1.);
        vec3 hue=.58+.36*cos(6.283*(spectrum*.68+vec3(0.,-.333,.333)));
        float rim=smoothstep(.827,.858,radius)*(1.-smoothstep(.906,.936,radius));
        float air=smoothstep(.05,.28,tex.y)*(.78+.22*sin(tex.x*6.28));
        gl_FragColor=vec4(hue,amount*rim*air*.52);
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,
  });
  const rainbow = new T.Mesh(new T.PlaneGeometry(146,70),rainbowInk);
  rainbow.position.set(0,33,-114); scene.add(rainbow);
  function update(frame) {
    const {t}=frame;
    rain.visible=t>=firstDropAt-.32 && t<38 && frame.shot.key!=='blue-door';
    rainbow.visible=frame.rainbow>0;
    rainbowInk.uniforms.amount.value=frame.rainbow;
    wetInk.uniforms.amount.value=ease(13.3,23,t)*.43;
    wetInk.uniforms.sun.value=frame.sun;
    if(!rain.visible)return;
    droplet.visible=t>=firstDropAt-.32&&t<firstDropAt;
    droplet.position.set(-1.4,Math.max(.02,(firstDropAt-t)*4.2),1);
    shoulderDrop.visible=t>=firstDropAt+.36&&t<firstDropAt+.64;
    shoulderDrop.position.set(-.80,1.62+Math.max(0,(firstDropAt+.64-t)*4.6),.67);
    rainInk.opacity=frame.rain*.48;
    for(let i=0;i<520;i++){
      const fall=fract(sample(i+19)-t*(.48+sample(i+64)*.28)+60);
      const x=sample(i)*58-29+(1-fall)*1.7, y=fall*14, z=sample(i+160)*35-19, j=i*6;
      drops[j]=x;drops[j+1]=y;drops[j+2]=z;
      drops[j+3]=x-.066;drops[j+4]=y+.18+sample(i+100)*.23;drops[j+5]=z+.022;
    }
    rainGeo.attributes.position.needsUpdate=true;
    for(const [i,ring] of ripples.entries()){
      const age=i===0&&t<firstDropAt+1 ? t-firstDropAt : fract(t*.89+sample(i+111));
      const strength=i===0&&t<firstDropAt+1 ? .85 : frame.rain*.55;
      ring.visible=age>=0&&strength>.04;
      ring.scale.setScalar(.048+age*.55);
      ring.material.opacity=(1-age)*strength;
    }
  }
  return {update,rain,rainbow};
}

function createRainStoryCast(){
  const actorRoots=[];
  const shadowMap=document.createElement('canvas');shadowMap.width=shadowMap.height=64;
  const ctx=shadowMap.getContext('2d');
  const falloff=ctx.createRadialGradient(32,32,4,32,32,32);
  falloff.addColorStop(0,'rgba(18,30,35,.58)');falloff.addColorStop(.52,'rgba(18,30,35,.28)');falloff.addColorStop(1,'rgba(18,30,35,0)');
  ctx.fillStyle=falloff;ctx.fillRect(0,0,64,64);
  const softShadow=new T.CanvasTexture(shadowMap);
  const shadowInk=new T.MeshBasicMaterial({map:softShadow,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const shadowGeo=new T.PlaneGeometry(1,1);
  function actor(parent,id,height) {
    const base=new T.Group();parent.add(base);
    const model=buildMatureStarCharacter360(id,{baseExpression:false,bodyEmissiveIntensity:.04});
    const bounds=new T.Box3().setFromObject(model),ratio=height/(bounds.max.y-bounds.min.y);
    model.scale.multiplyScalar(ratio);
    base.add(model);actorRoots.push(model);
    const contact=new T.Mesh(shadowGeo,shadowInk);
    contact.rotation.x=-Math.PI*.5;contact.scale.set(height*1.43,height*1.12,1);
    contact.position.y=.008;base.add(contact);
    return {base,model,height,y:-bounds.min.y*ratio,scaleY:model.scale.y,
      feet:(model.userData.feet??[]).map(part=>({part,x:part.rotation.x})),
      hands:(model.userData.hands??[]).map(part=>({part,x:part.rotation.x,z:part.rotation.z,xPos:part.position.x,yPos:part.position.y,zPos:part.position.z})),
      eyes:(model.userData.faceFeatures??[]).slice(0,2).map(part=>({part,y:part.scale.y})),
    };
  }
  function pose(a,x,z,yaw,{bob=0,pitch=0,tilt=0,steps=0,crouch=0,reach=0,embrace=0,eyes=1,y=0}={}) {
    a.base.position.set(x,y,z);
    a.model.position.y=a.y*(1-crouch)+bob;
    a.model.rotation.set(pitch,yaw,tilt);
    a.model.scale.y=a.scaleY*(1-crouch);
    for(const [i,{part,x:rest}] of a.feet.entries())part.rotation.x=rest+(i%2?-1:1)*steps;
    for(const [i,{part,x:rest,z:rz,xPos,yPos,zPos}] of a.hands.entries()){
      part.rotation.x=rest+reach*.64-(i%2?-1:1)*steps*.43;
      part.rotation.z=rz+(i%2?1:-1)*reach*.32;
      part.position.x=i===0?mix(xPos,-13,embrace):xPos;
      part.position.y=yPos+reach*2.3-2*embrace;
      part.position.z=i===0?mix(zPos+reach*2.8,37,embrace):zPos+reach*2.8;
    }
    for(const row of a.eyes)row.part.scale.y=row.y*eyes;
  }
  function dispose(){
    for(const model of actorRoots){model.parent?.removeFromParent();disposeMatureCharacterModel(model);}
    shadowGeo.dispose();shadowInk.dispose();softShadow.dispose();
  }
  return {actor,pose,dispose};
}

export function createRainStoryPrologue({reducedMotion=false}={}) {
  return createRainStoryEnding({reducedMotion, prologue:true});
}

export function createRainStoryEnding({baltiaId, reducedMotion=false, prologue=false, stationWaiting=false}) {
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(39,1,.05,280);
  const ambient=new T.HemisphereLight(0xdbe9f3,0x796654,2.17);
  const sun=new T.DirectionalLight(0xffdcaf,1.4);
  sun.position.set(-30,38,7);
  const fill=new T.DirectionalLight(0xe6f4ff,.5);
  fill.position.set(14,11,-13);scene.add(ambient,sun,fill);
  const town=new T.Group(),amane=new T.Group(),cloudStation=new T.Group();
  scene.add(town,amane,cloudStation);
  const geo={
    box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,20,12),
    cylinder:new T.CylinderGeometry(1,1,1,18),ring:new T.RingGeometry(.92,1,24),
  };
  const gable=new T.Shape();
  gable.moveTo(-.5,0);gable.lineTo(.5,0);gable.lineTo(0,1);gable.closePath();
  geo.gable=new T.ExtrudeGeometry(gable,{depth:1,bevelEnabled:false});
  const materials=[];
  const mat=(color,opts={})=>{
    const value=new T.MeshStandardMaterial({color,roughness:.84,...opts});
    materials.push(value);return value;
  };
  const stone=coastSurfaceTexture('stone');stone.repeat.set(12,12);
  const woodTexture=coastSurfaceTexture('wood');woodTexture.repeat.set(3,3);
  const m={
    plaza:mat(0x9b9b8b,{map:stone,bumpMap:stone,bumpScale:.03}), grout:mat(0x97968f),
    cream:mat(0xffe2b6), pale:mat(0xd5d4c6), trim:mat(0xddd5c6),
    blue:mat(0x326282), warm:mat(0xc19070), red:mat(0xbd7760), sage:mat(0x849686),
    wood:mat(0x987454,{map:woodTexture}), steel:mat(0x515b5b,{metalness:.46,roughness:.34}),
    chrome:mat(0xa7a8a2,{metalness:.41,roughness:.26}), rail:mat(0x4e4c4c,{metalness:.46,roughness:.38}),
    dark:mat(0x253438), train:mat(0x536b60,{roughness:.41,metalness:.14}),
    window:mat(0x254454,{roughness:.23,metalness:.13}),
    lit:mat(0xe0cfa6,{emissive:0xe8b45e,emissiveIntensity:.34,roughness:.34}),
    lamp:mat(0xffe3a7,{emissive:0xfbbd6a,emissiveIntensity:.7}),
    water:mat(0x5e8c9b,{roughness:.24,metalness:.25}),
    roof:mat(0x6d6358,{map:woodTexture,roughness:.66}), roofWarm:mat(0x805e4f,{map:woodTexture}),
    roofCool:mat(0x587078,{map:woodTexture,roughness:.64}),
    hill:mat(0x749487), tree:mat(0x488070), amane:mat(0x9e7156),
    cliff:mat(0xa89ea0,{flatShading:true}), drop:mat(0xb4e6ff,{roughness:.19,metalness:.1}),
  };
  const mesh=(parent,g,material,x,y,z,sx,sy,sz)=>{
    const o=new T.Mesh(g,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;
  };
  const box=(parent,material,x,y,z,w,h,d)=>mesh(parent,geo.box,material,x,y,z,w,h,d);
  const ball=(parent,material,x,y,z,w,h,d)=>mesh(parent,geo.ball,material,x,y,z,w,h,d);
  const cylinder=(parent,material,x,y,z,w,h)=>mesh(parent,geo.cylinder,material,x,y,z,w,h,w);
  const group=(parent,x=0,y=0,z=0)=>{const g=new T.Group();parent.add(g);g.position.set(x,y,z);return g;};
  function beam(parent,material,a,b,width) {
    const start=new T.Vector3(...a),end=new T.Vector3(...b),mid=start.clone().lerp(end,.5);
    const bar=box(parent,material,...mid.toArray(),width,start.distanceTo(end),width);
    bar.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
    return bar;
  }
  const skyInk=new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,
    uniforms:{light:{value:0},earth:{value:1},mars:{value:0}},
    vertexShader:'varying vec3 ray; void main(){ray=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`
      uniform float light,earth,mars; varying vec3 ray;
      float hash(vec2 p){return fract(sin(dot(p,vec2(128.3,51.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){
        vec3 r=normalize(ray);
        float up=smoothstep(-.10,.72,r.y);
        float cloud=noise(r.xz*5./(max(.13,r.y+.42))) *.63+noise(r.xz*17./(max(.13,r.y+.37)))*.37;
        vec3 grey=mix(vec3(.67,.74,.76),vec3(.23,.33,.39),up);
        vec3 bright=mix(vec3(.95,.81,.63),vec3(.30,.58,.78),up);
        vec3 sky=mix(grey,bright,light);
        float clearing=pow(max(0.,dot(r,normalize(vec3(-.56,.28,-.62)))),16.);
        sky+=vec3(.25,.16,.06)*light*clearing;
        sky=mix(sky,vec3(.84,.85,.82),smoothstep(.45,.83,cloud)*(.38+.30*light));
        sky=mix(sky,vec3(.5,.32,.26)+vec3(.26,.24,.19)*(1.-up),mars*.82);
        sky=mix(sky,vec3(.52,.66,.81)+vec3(.21,.21,.17)*(1.-up),(1.-earth-mars)*.76);
        gl_FragColor=vec4(sky,1.);
        #include <colorspace_fragment>
      }`,
  });
  const sky=new T.Mesh(new T.SphereGeometry(200,28,16),skyInk);sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  function house(parent,x,z,w,h,d,wall,{blueDoor=false,detail=true,roofInk=m.roof}={}) {
    const g=group(parent,x,0,z);
    box(g,wall,0,h*.5,0,w,h,d);
    box(g,m.grout,0,.25,0,w+.18,.5,d+.2);
    const ridge=h+w*.23;
    mesh(g,geo.gable,wall,0,h,-d*.5,w,ridge-h,d);
    beam(g,roofInk,[-w*.575,h-.31,d*.5+.42],[0,ridge+.07,d*.5+.42],.16);
    beam(g,roofInk,[w*.575,h-.31,d*.5+.42],[0,ridge+.07,d*.5+.42],.16);
    for(const side of [-1,1]){
      const roof=box(g,roofInk,side*w*.282,ridge+.12-w*.132,0,w*.628,.18,d+.86);
      roof.rotation.z=side*-.433;
      box(g,m.trim,side*w*.558,h-.17,0,.12,.115,d+.85);
    }
    box(g,m.wood,w*.26,ridge-.19,-d*.18,.55,1.08,.68);
    box(g,roofInk,w*.26,ridge+.37,-d*.18,.64,.12,.76);
    if(detail){
      for(let y=1.25;y<h-.4;y+=1.08)box(g,m.trim,0,y,d*.5,w+.04,.038,.055);
      for(const side of [-1,1]){
        box(g,m.trim,w*side*.28,h*.68,d*.5+.04,1.03,1.39,.16);
        box(g,m.lit,w*side*.28,h*.68,d*.5+.13,.82,1.16,.07);
        box(g,m.wood,w*side*.28,h*.68,d*.5+.19,.04,1.2,.06);
        box(g,m.wood,w*side*.28,h*.68,d*.5+.19,.88,.048,.06);
      }
    }
    const opening=group(g,-.65,0,d*.5+.08);
    box(opening,m.dark,0,1.12,0,1.38,2.24,.13);
    box(opening,m.lit,0,1.1,.08,1.2,2.1,.075);
    const door=group(opening,-.63,0,.19);
    box(door,blueDoor?m.blue:m.wood,.62,1.11,0,1.22,2.15,.1);
    box(door,m.trim,.63,1.56,.06,.72,.56,.045);
    ball(door,m.chrome,1.05,1.1,.09,.058,.058,.058);
    box(g,m.grout,-.65,.09,d*.5+.49,1.72,.18,.98);
    return {group:g,door};
  }
  function vessel(parent,x,y,z) {
    const g=group(parent,x,y,z);
    cylinder(g,m.pale,0,.40,0,.37,.78);
    cylinder(g,m.chrome,0,.81,0,.41,.092);
    cylinder(g,m.steel,0,.883,0,.12,.077);
    beam(g,m.steel,[-.29,.83,0],[-.22,1.06,0],.046);
    beam(g,m.steel,[-.22,1.06,0],[.22,1.06,0],.046);
    beam(g,m.steel,[.22,1.06,0],[.29,.83,0],.046);
    return g;
  }
  const {actor,pose,dispose:disposeCast}=createRainStoryCast();

  box(town,m.plaza,0,-.15,-2,89,.30,74);
  for(let x=-24;x<=24;x+=2.4)box(town,m.grout,x,.005,3,.034,.014,21);
  for(let z=-6;z<13;z+=1.9)box(town,m.grout,0,.006,z,48,.014,.034);
  box(town,m.grout,0,.079,-4.55,61,.13,1.4);
  box(town,m.cream,0,.151,-4.87,57,.037,.13);
  for(const z of [-11.9,-8.6])box(town,m.rail,0,.075,z,118,.145,.13);
  for(let x=-48;x<49;x+=1.9)box(town,m.wood,x,.009,-10.25,.225,.12,4.15);
  const shed=group(town,11.1,0,2.0);
  box(shed,m.pale,0,2.34,-1.32,8.3,4.67,.32);
  box(shed,m.wood,0,4.72,-.14,8.9,.25,4.9);
  box(shed,m.trim,0,4.53,2.26,8.85,.28,.19);
  for(const x of [-4.02,3.98])box(shed,m.wood,x,2.28,1.95,.21,4.55,.24);
  for(const x of [-2.7,.1,2.8]){
    box(shed,m.dark,x,3.1,-1.13,2.0,1.86,.16);
    box(shed,m.lit,x,3.1,-1.02,1.76,1.64,.05);
    box(shed,m.trim,x,3.1,-.98,.07,1.72,.08);
  }
  box(shed,m.wood,2.4,.57,.18,2.55,.13,.58);
  box(shed,m.steel,2.4,.31,.18,2.15,.62,.36);
  const blueDoor=house(town,-21,5,7,5,5.5,m.sage,{blueDoor:true});
  const neighborDoors=[
    house(town,-17,-15,7.1,5.3,6.4,m.cream).door,
    house(town,19,-16,7.4,5.8,6.4,m.warm).door,
  ];
  for(let i=0;i<24;i++){
    const x=(i%8-3.5)*13+sample(i+81)*5,z=-25-Math.floor(i/8)*15-sample(i+5)*7;
    house(town,x,z,6+sample(i+11)*4,3.8+sample(i)*6,5+sample(i+31)*3,[m.pale,m.cream,m.warm,m.sage][i%4],
      {detail:!prologue&&i<16,roofInk:[m.roofWarm,m.roof,m.roofCool][(i*7+Math.floor(i/3))%3]});
  }
  const seaInk=new T.ShaderMaterial({
    uniforms:{uTime:{value:0},light:{value:0}},
    vertexShader:`varying vec3 point; void main(){point=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(point,1.);}`,
    fragmentShader:`
      varying vec3 point;
      uniform float uTime, light;
      void main(){
        float ripples=sin(point.z*2.13+sin(point.x*.41)+uTime*.65)*sin(point.x*.27+point.z*.72);
        float shore=1.-smoothstep(0.,9.,abs(point.z+75.+sin(point.x*.051)*3.));
        float spark=pow(.5+.5*ripples,16.)*light;
        vec3 sea=mix(vec3(.113,.218,.276),vec3(.42,.53,.49),light*.65);
        vec3 horizon=mix(vec3(.56,.65,.67),vec3(.86,.77,.62),light);
        vec3 rgb=mix(sea+vec3(.50,.35,.20)*spark*.48+shore*.13,horizon,smoothstep(60.,204.,-point.z));
        gl_FragColor=vec4(rgb,1.);
        #include <colorspace_fragment>
      }`,
  });
  const sea=new T.Mesh(new T.PlaneGeometry(620,190),seaInk);
  sea.rotation.x=-Math.PI/2;sea.position.set(0,-.65,-164);town.add(sea);
  for(let i=0;i<12;i++){
    ball(town,m.hill,(i-5.5)*21,-.35,-79+sample(i+150)*11,14,1.7+sample(i+29)*7,11);
    const x=(i-5.5)*7;
    if(Math.abs(x)>6){
      cylinder(town,m.wood,x,1.06,-17,.105,2.12);
      ball(town,m.tree,x,2.45,-17,.88,1.36,.88);
    }
  }
  if(prologue){
    const child=actor(town,'star-hero-young-seed-sky-walk-cute-comet',1.37);
    const parent=actor(town,'star-hero-young-seed-sky-walk-cool-b-forest',2.33);
    const hero=actor(town,WHITE_MICHI_ROAD_SABER_REN_ID,2.65);
    const jug=vessel(town,-11.3,0,11.96);
    const lid=jug.children[1];
    const cistern=group(town,-6.2,0,3.8);
    cylinder(cistern,m.grout,0,.49,0,.9,.98);
    const rim=mesh(cistern,geo.ring,m.chrome,0,.99,0,.91,.91,1);
    rim.rotation.x=-Math.PI/2;
    cylinder(cistern,m.steel,0,1.02,0,.88,.07);
    box(cistern,m.wood,0,.62,.92,1.46,.36,.075);
    const washHouse=house(town,-6.1,-2.7,5.2,4.1,4.8,m.cream,{roofInk:m.roofWarm});
    vessel(town,-4.8,0,1.7);
    box(town,m.pale,-8.7,.57,.05,1.8,.16,.66);
    box(town,m.wood,-8.7,.26,.05,1.45,.52,.5);
    washHouse.door.rotation.y=.2;
    skyInk.uniforms.light.value=.64;
    seaInk.uniforms.light.value=.64;
    sun.position.set(-22,27,18);
    const dialogue=[
      [4.0,7.1,'ここまでは、持てたんだけど'],
      [7.5,9.8,'おうちはどこ？'],
      [10.2,14.1,'あの青い戸。お父さん、台所で待ってる'],
      [21.1,23.0,'持って帰れた'],
      [23.3,25.3,'持ってもらった'],
      [25.7,29.3,'うん。あとはお父さんが持つよ。ほら、入ろう'],
      [29.7,33.4,'ねえ、お父さん。ふたはちゃんと押さえたよ'],
    ];
    const shots=[
      {end:3.8,from:[-3.2,4.7,11],to:[-4.5,3.5,10],focus:[-6.6,1.2,3.6]},
      {end:10.2,from:[-10.2,2.67,16.9],to:[-10.5,2.43,16.5],focus:[-10.85,1.1,11.03]},
      {end:16,from:[-11.45,2.60,16.1],to:[-12.6,2.45,15.8],focus:[-11.10,1.08,10.95]},
      {end:21,from:[-12.5,2.5,15.1],to:[-19.3,2.8,14.8],focus:[-17.75,1.2,9.35],startFocus:[-13.0,1.25,10.25]},
      {end:29.5,from:[-18.7,3.03,15.0],to:[-18.5,2.78,14.65],focus:[-20.8,1.25,9.15]},
      {end:35.8,from:[-16.0,3.6,14.7],to:[-14.5,4.6,16.3],focus:[-17.9,1.2,9.4]},
    ];
    const end=35.8, focus=new T.Vector3();
    function render(renderer,time){
      let start=0;
      const shot=shots.find(shot=>{
        if(time<shot.end)return true;
        start=shot.end;
        return false;
      })??shots.at(-1);
      const u=reducedMotion?0:ease(start,shot.end,time);
      camera.position.set(...shot.from.map((value,i)=>mix(value,shot.to[i],u)));
      focus.set(...shot.focus.map((value,i)=>mix(shot.startFocus?.[i]??value,value,u)));
      camera.lookAt(focus);
      const {width,height}=renderer.domElement;
      camera.aspect=width/Math.max(1,height);
      camera.updateProjectionMatrix();
      sky.position.copy(camera.position);
      seaInk.uniforms.uTime.value=time;

      const approach=ease(4.0,7.5,time), lower=ease(6,8.4,time)*(1-ease(13,15.3,time));
      const route=ease(15.6,21,time), settle=ease(24.5,26.0,time), leave=ease(30.3,35.7,time);
      const facing=mix(mix(-1.49,-1.57,ease(14,15.5,time)),1.6,ease(29.0,30.3,time));
      const step=(a,b)=>time>a&&time<b&&!reducedMotion?Math.sin((time-a)*11)*.22:0;
      const heroX=mix(mix(-8.1,-10.0,approach),-18.6,route)+leave*7.9;
      const heroZ=mix(mix(10.9,10.48,approach),9.12,route)+leave*1.45;
      pose(hero,heroX,heroZ,facing,{
        crouch:.09*lower,pitch:.13*lower,
        steps:step(4,7.5)+step(15.6,21)+step(30.3,35.7),
      });
      const childX=mix(-12.28,-20.19,route)-ease(27.1,29.5,time)*1.38;
      const childZ=mix(11.08,10.87,route)-ease(28,29.85,time)*2.72;
      const childDirection=mix(mix(1.8,-1.54,ease(14.5,15.9,time)),-Math.PI,ease(27,29,time));
      pose(child,childX,childZ,childDirection,
        {pitch:.12*(1-ease(6.7,8.6,time)),steps:step(15.6,21)+step(27.1,29.85)});
      blueDoor.door.rotation.y=-1.57*ease(20.7,22.0,time)*(1-ease(30.4,32.5,time));
      const doorStep=ease(20.9,22.0,time);
      parent.base.visible=doorStep>.08;
      pose(parent,-22.4-ease(26.6,27.9,time)*.56,8.95+doorStep*.49,1.03,{steps:step(20.9,22)+step(26.6,27.9)});
      const lift=ease(13.4,15.6,time);
      jug.position.set(
        mix(mix(-11.3,heroX-.62,lift),-21.2,settle)-ease(27,29.5,time)*.24,
        .34*lift*(1-settle),
        mix(mix(11.96,heroZ+1.05,lift),9.94,settle)-ease(27,29.5,time)*1.34,
      );
      jug.visible=time<30.0;
      lid.position.x=.11*ease(13.7,14.4,time)*(1-ease(14.7,15.45,time));
      renderer.render(scene,camera);
      const line=dialogue.find(([from,to])=>time>=from&&time<to)?.[2]??'';
      return {line,curtain:Math.max(1-ease(0,.62,time),ease(34.7,end,time)),finished:time>=end};
    }
    return {render,dispose(){
      disposeCast();
      Object.values(geo).forEach(geometry=>geometry.dispose());
      materials.forEach(material=>material.dispose());
      sky.geometry.dispose();skyInk.dispose();
      sea.geometry.dispose();seaInk.dispose();
      stone.dispose();woodTexture.dispose();
    }};
  }
  const train=group(town,0,0,-10.22);
  box(train,m.rail,0,.58,0,35,.55,3.5);
  box(train,m.train,0,4,0,35,.48,3.6);
  box(train,m.trim,0,1.12,0,35,.45,3.6);
  box(train,m.train,0,2.42,-1.69,35,2.65,.15);
  box(train,m.dark,0,2.5,.03,2.55,2.70,.08);
  box(train,m.lit,0,3.63,.42,2.12,.094,.30);
  box(train,m.wood, .95,1.89,.38,.46,.16,.52);
  box(train,m.trim,0,3.88,1.83,35,.094,.08);
  box(train,m.pale,0,1.28,.9,2.52,.09,1.84);
  for(const x of [-17.45,17.45])box(train,m.train,x,2.53,0,.3,2.71,3.54);
  for(const x of [-9.43,9.43]){
    box(train,m.train,x,2.52,1.72,16.02,2.56,.19);
    box(train,m.cream,x,1.77,1.84,16.02,.13,.08);
  }
  for(const x of [-15.6,-12.5,-9.4,-6.3,-3.2,3.2,6.3,9.4,12.5,15.6]){
    box(train,m.steel,x,2.94,1.848,2.55,1.28,.1);
    box(train,m.window,x,2.94,1.91,2.29,1.03,.04);
    box(train,m.lit,x,3.21,1.937,2.26,.33,.023);
    box(train,m.chrome,x,2.75,1.937,2.28,.034,.025);
    box(train,m.steel,x,2.94,1.96,.07,1.03,.03);
  }
  for(const x of [-14,-11,11,14]){
    const wheel=cylinder(train,m.rail,x,.51,1.76,.49,.18);wheel.rotation.x=Math.PI/2;
    const hub=cylinder(train,m.chrome,x,.51,1.86,.24,.07);hub.rotation.x=Math.PI/2;
  }
  const trainDoors=[-1,1].map(side=>{
    const door=group(train,side*.65,0,1.82);
    box(door,m.train,0,2.57,0,1.26,2.42,.12);
    box(door,m.lit,0,3.08,.078,.77,.83,.038);
    box(door,m.chrome,-side*.46,2.28,.081,.035,.42,.044);
    return door;
  });

  const childId='star-hero-young-seed-sky-walk-cute-comet';
  const parentId='star-hero-young-seed-sky-walk-cool-b-forest';
  const hero=actor(town,WHITE_MICHI_ROAD_SABER_REN_ID,2.65);
  const child=actor(town,childId,1.37),parent=actor(town,parentId,2.33);
  const baltia=actor(town,baltiaId,2.45);
  const neighbor=actor(town,'star-hero-young-seed-leaf-walk-cute-forest',1.95);
  // Trace the original body surface so the small reunion smile stays clear of the cape clasp.
  const smilePoints=[],faceRay=new T.Raycaster(),front=new T.Vector3(0,0,-1);
  const {eyeLift,mouthDrop}=globalThis.ImasoraMonsterExpressions.facePlacement;
  hero.model.updateWorldMatrix(true,true);
  const clasp=hero.model.userData.capeClasp??hero.model.userData.capeFastener?.userData?.clasp;
  const claspTop=clasp?new T.Box3().setFromObject(clasp).applyMatrix4(hero.model.matrixWorld.clone().invert()).max.y:-Infinity;
  const smileY=Math.max(hero.eyes[0].part.position.y-4.28-eyeLift-mouthDrop,claspTop+3.1/4+.42);
  for(let i=0;i<=8;i++){
    const u=i/8,x=mix(-3.8,3.8,u),y=smileY-3.1*u*(1-u);
    faceRay.set(hero.model.localToWorld(new T.Vector3(x,y,70)),front);
    const hit=faceRay.intersectObject(hero.model.userData.body,false)[0];
    if(hit){const point=hero.model.worldToLocal(hit.point);point.z+=.58;smilePoints.push(point);}
  }
  const smile=smilePoints.length===9
    ? new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(smilePoints),12,.32,6,false),new T.MeshStandardMaterial({color:0x263238,roughness:.76}))
    : null;
  if(smile)hero.model.add(smile);
  const jug=vessel(town,5.7,0,3.1);
  const tear=ball(town,m.drop,0,0,0,.027,.05,.027);
  const eyePoint=new T.Vector3();

  box(amane,m.amane,0,-.26,-5,65,.50,58);
  const familyHouse=house(amane,-2.0,-8.1,9,5,7,m.warm);
  familyHouse.door.rotation.y=.58;
  cylinder(amane,m.steel,5.2,1.0,-8,1.42,2.0);
  cylinder(amane,m.chrome,5.2,2.0,-8,1.46,.18);
  beam(amane,m.chrome,[5.2,.43,-6.5],[5.2,.43,-2.9],.15);
  beam(amane,m.chrome,[5.2,.43,-2.9],[.1,.43,-2.9],.15);
  beam(amane,m.chrome,[.1,.43,-2.9],[.1,.43,-4.6],.15);
  const stream=box(amane,m.water,-6.3,.015,-4.3,2.45,.044,29);stream.rotation.y=.13;
  for(let i=0;i<14;i++){
    const x=(i-6.5)*5,z=-22-sample(371+i)*14;
    ball(amane,m.amane,x,1.5,z,4.9,2.4+sample(i+90)*5,6);
  }
  box(amane,m.wood,-1.1,.94,-3.65,2.83,.14,1.32);
  for(const x of [-2.3,.13])for(const z of [-4.15,-3.15])box(amane,m.wood,x,.47,z,.12,.94,.12);
  for(const x of [-1.8,-.45]){
    cylinder(amane,m.cream,x,1.06,-3.65,.34,.054);
    cylinder(amane,m.warm,x,1.090,-3.65,.21,.019);
  }
  const mother=actor(amane,'star-hero-young-seed-walk-walk-cute-forest',2.26);
  const father=actor(amane,'star-hero-young-seed-walk-sky-cool-b-forest',2.36);
  // The family stays beneath the open kitchen eaves, beside the two prepared plates.
  box(amane,m.wood,-1.45,3.30,-3.1,5.8,.15,3.54);
  for(const x of [-4.12,1.27])box(amane,m.wood,x,1.66,-1.53,.15,3.20,.15);
  box(amane,m.grout,-1.45,.012,-3.2,5.8,.05,3.76);
  box(amane,m.grout,-8.9,.011,-14.1,7.3,.028,32).rotation.y=.27;
  const carts=[group(amane,-7,0,-9),group(amane,-9,0,-8)];
  for(const cart of carts){
    box(cart,m.wood,0,.64,0,1.78,.18,1.26);
    for(const z of [-.63,.63]){
      const wheel=cylinder(cart,m.rail,0,.39,z,.39,.11);wheel.rotation.x=Math.PI/2;
      box(cart,m.wood,-1.36,.66,z*.75,1.35,.082,.10);
    }
    vessel(cart,0,.72,0);
  }
  carts[1].rotation.y=Math.PI;
  const haulers=[
    actor(carts[0],'star-hero-young-seed-luck-walk-cool-a-forest',1.68),
    actor(carts[1],'star-hero-young-seed-city-walk-cute-forest',1.72),
  ];
  const pour=new T.Group();
  pour.position.set(.13,.46,-3.40);amane.add(pour);
  box(pour,m.chrome,0,.11,.03,.22,.20,.37);
  const flowingDrops=Array.from({length:6},(_,i)=>ball(pour,m.drop,.04*sample(i),0,.23,.026,.055,.026));

  box(cloudStation,m.grout,0,-.30,-3,28,.58,14);
  box(cloudStation,m.pale,-3.6,2.55,-4.16,7.9,5.1,.68);
  box(cloudStation,m.cream,-3.6,5.2,-3.7,8.7,.26,2.7);
  box(cloudStation,m.dark,-3.55,1.67,-3.77,2.5,3.34,.20);
  box(cloudStation,m.blue,-3.55,1.67,-3.62,2.34,3.22,.13);
  box(cloudStation,m.chrome,-2.62,1.44,-3.51,.15,.5,.105);
  for(const x of [-14,-8,1,6,12])box(cloudStation,m.steel,x,.65,-7.4,.11,1.3,.13);
  box(cloudStation,m.steel,0,1.25,-7.4,27,.13,.125);
  for(let i=0;i<16;i++)ball(cloudStation,i%3?m.pale:m.cliff,(i%8-3.5)*6,-2.0-sample(i)*3,-13-Math.floor(i/8)*5,6.9,2.8,5.2);
  const worker=actor(cloudStation,baltiaId,2.45);
  const driver=actor(cloudStation,'star-hero-young-seed-leaf-walk-cool-b-forest',2.35);
  const weather=makeEndingWeather(scene,m,geo);
  const grayFog=new T.Color(0x8dabb4),goldFog=new T.Color(0xc7d5cb),amaneFog=new T.Color(0xbd8e74);
  scene.fog=new T.FogExp2(grayFog,.013);
  const look=new T.Vector3(),camA=new T.Vector3(),camB=new T.Vector3(),size=new T.Vector2();
  if(stationWaiting){
    const railDriver=actor(town,'star-hero-young-seed-leaf-walk-cool-b-forest',2.05);
    const attendant=actor(town,'star-hero-young-seed-leaf-walk-cool-a-crown',2.12);
    const waiting=actor(town,'star-hero-young-seed-walk-walk-cute-crown',2.02);
    for(const a of [hero,baltia])a.base.visible=false;
    amane.visible=cloudStation.visible=false;
    weather.rain.visible=weather.rainbow.visible=false;
    if(railDriver.model.userData.soraDama)railDriver.model.userData.soraDama.visible=false;
    skyInk.uniforms.light.value=.06;skyInk.uniforms.earth.value=1;skyInk.uniforms.mars.value=0;
    seaInk.uniforms.light.value=.06;
    scene.fog.density=.008;
    const heading=(x,z,toX,toZ)=>Math.atan2(toX-x,toZ-z);
    return {dispose,render(renderer,t,report=false){
      const arrived=ease(0,2.0,t),leaving=report?0:ease(14.1,19.5,t);
      train.position.x=mix(-44,0,arrived)+40*leaving;
      const open=ease(1.28,3.0,t)*(1-ease(12.3,13.5,t));
      for(const [i,door] of trainDoors.entries())door.position.x=(i===0?-1:1)*(.65+open*1.18);
      railDriver.base.visible=t>=1.75;
      const step=ease(1.75,3.2,t),dx=mix(-1.66,-1.50,step),dz=mix(-6.1,-4.55,step);
      pose(railDriver,dx,dz,heading(dx,dz,1.6,-.8),{steps:reducedMotion?0:Math.sin(t*14)*4*step*(1-step)*.30,reach:.35*ease(2.0,3.7,t)});
      pose(attendant,1.02,-4.7,-.57,{reach:report?0:.56*ease(11.5,12.6,t),pitch:.045});
      const worry=report?.48:ease(9.0,16.7,t),childX=1.05,childZ=.35;
      const gaze=mix(heading(childX,childZ,dx,dz),.07,worry);
      pose(child,childX,childZ,gaze,{pitch:-.28*worry,eyes:1-.14*worry,bob:reducedMotion?0:.018*worry*Math.sin(t*4.1)});
      pose(parent,3.21,.45,heading(3.21,.45,1.2,-1.9)-.35*worry,{pitch:.045*worry,eyes:.96});
      pose(neighbor,-4.6,-1.95,heading(-4.6,-1.95,dx,dz),{pitch:.13*worry,crouch:.085*worry});
      const turn=ease(5.7,6.4,t)*(1-ease(8.7,9.6,t));
      pose(waiting,-3.35,-.1,heading(-3.35,-.1,dx,dz),{reach:.48*turn,pitch:.08*turn});
      jug.position.set(4.45,0,.92);
      tear.visible=!report&&t>15.4&&t<20.1;
      if(tear.visible){
        child.model.updateWorldMatrix(true,true);
        child.eyes[0]?.part.getWorldPosition(eyePoint);
        tear.position.copy(eyePoint);tear.position.z+=.1;tear.position.y-=fract(t*.98)*.29;
      }
      const push=report?ease(1.8,6.4,t):ease(10.1,17,t);
      camera.position.set(mix(-5.65,.12,push),mix(2.95,1.92,push),mix(11.5,6.33,push));
      camera.lookAt(mix(.18,1.65,push),mix(1.40,.88,push),mix(-3.92,-.35,push));
      renderer.getSize(size);camera.aspect=Math.max(.35,size.x/Math.max(1,size.y));
      camera.fov=camera.aspect<1?48:39;camera.updateProjectionMatrix();
      sky.position.copy(camera.position);seaInk.uniforms.uTime.value=t;
      renderer.render(scene,camera);
    }};
  }
  function render(renderer,frame) {
    const {shot,t,sun:light}=frame;
    const inAmane=shot.key==='amane',inSky=shot.key==='sky';
    town.visible=!inAmane&&!inSky;amane.visible=inAmane;cloudStation.visible=inSky;
    skyInk.uniforms.light.value=inAmane?.86:light;
    skyInk.uniforms.earth.value=town.visible?1:0;
    skyInk.uniforms.mars.value=inAmane?1:0;
    seaInk.uniforms.light.value=light;seaInk.uniforms.uTime.value=t;
    ambient.intensity=mix(2.12,1.71,light);
    sun.intensity=mix(.87,2.25,light);
    scene.fog.density=inAmane?.017:inSky?.018:.008;
    scene.fog.color.copy(inAmane?amaneFog:grayFog);
    if(!inAmane)scene.fog.color.lerp(goldFog,light);
    m.plaza.roughness=mix(.92,.27,ease(firstDropAt,21,t));
    m.plaza.color.setHex(0xada99c).lerp(m.water.color,ease(firstDropAt,19,t)*.32);
    m.lit.emissiveIntensity=mix(.53,.26,light);
    train.position.x=mix(-33,0,ease(0,3.5,t));
    for(const [i,door] of trainDoors.entries())door.position.x=(i===0?-1:1)*(.65+ease(2.9,4.3,t)*1.18);
    const disembark=ease(4.0,6.9,t), run=ease(5.0,8.65,t), hug=ease(8.25,9.4,t);
    const childRunning=4*run*(1-run), walk=4*disembark*(1-disembark);
    pose(hero,mix(-.05,-.94,disembark),mix(-7.4,.16,disembark),mix(-.12,1.15,hug),
      {bob:Math.sin(t*16)*walk*.053+Math.sin(t*3)*hug*.011,pitch:hug*.23,tilt:-hug*.051,steps:Math.sin(t*16)*walk*.4,crouch:hug*.17,reach:hug*.95,embrace:hug,eyes:mix(1,.68,hug)});
    if(smile)smile.visible=t>=8.05;
    pose(child,mix(6.7,.57,run),mix(4.7,.74,run),mix(-2.2,-.90,hug),
      {bob:Math.abs(Math.sin(t*19))*childRunning*.18,steps:Math.sin(t*19)*childRunning*.55,pitch:childRunning*.22,tilt:hug*.09,reach:hug*.56,eyes:mix(1,.70,hug)});
    const lower=ease(19.2,21.2,t);
    pose(baltia,10.4,2.54,mix(-.56,.1,lower),{pitch:mix(-.16,.25,lower),eyes:1-.42*lower,tilt:-.06*lower,bob:Math.sin(t*3.1)*.015});
    const stand=ease(21.05,25.1,t),stride=4*stand*(1-stand);
    pose(parent,mix(15.55,13.05,stand),mix(4.31,2.54,stand),mix(-1.85,.13,stand),{bob:Math.abs(Math.sin(t*12))*stride*.064,steps:Math.sin(t*12)*stride*.38});
    const seesRain=ease(14.7,17.3,t);
    pose(neighbor,-6.8,2.3,1.16,{pitch:-.28*seesRain,eyes:mix(1,.89,seesRain),bob:.045*seesRain*Math.sin(t*2.8)});
    const wetEye=baltia.eyes[1]?.part;
    tear.visible=t>=20.6&&t<28.3&&!!wetEye;
    if(tear.visible){
      baltia.model.updateWorldMatrix(true,true);
      wetEye.getWorldPosition(eyePoint);
      tear.position.copy(eyePoint);
      tear.position.z+=.072;
      tear.position.y-=fract((t-20.6)*.8)*.48;
    }
    for(const [i,door] of neighborDoors.entries())door.rotation.y=-ease(15+i*.8,18+i*.5,t)*.93;
    if(shot.key==='blue-door'){
      train.visible=false;hero.base.visible=false;baltia.base.visible=false;neighbor.base.visible=false;
      const walkHome=ease(36.1,41.5,t),step=4*walkHome*(1-walkHome);
      const x=mix(-18.45,-21.35,walkHome),z=mix(10.5,8.0,walkHome);
      blueDoor.door.rotation.y=-ease(39,40.7,t)*1.23;
      pose(parent,x,z,-2.71,{bob:Math.abs(Math.sin(t*12))*step*.043,steps:Math.sin(t*12)*step*.41,reach:.6});
      pose(child,x+.74,z+.48,-2.5,{bob:Math.abs(Math.sin(t*15))*step*.055,steps:Math.sin(t*15)*step*.44,reach:.68});
      jug.position.set(x+.40,.3,z-.09);
    }else{
      train.visible=true;hero.base.visible=true;baltia.base.visible=true;neighbor.base.visible=true;
      jug.position.set(5.7,0,3.1);
    }
    pose(mother,-2.42,-4.57,.41,{pitch:.08,bob:Math.sin(t*2.6)*.018});
    pose(father,.18,-4.61,-.42,{pitch:.06,bob:Math.sin(t*2.1)*.015});
    const pass=ease(43,49.8,t);
    carts[0].position.set(mix(-12.5,-5.8,pass),0,mix(-9.4,-12.4,pass));
    carts[1].position.set(mix(-5.2,-12.6,pass),0,mix(-10.5,-7.5,pass));
    for(const [i,hauler] of haulers.entries()){
      const walk=Math.sin(t*10+i*2);
      pose(hauler,-2.47,0,Math.PI/2,{pitch:.12,reach:.88,bob:Math.abs(walk)*.038,steps:walk*.30});
    }
    for(const [i,drop] of flowingDrops.entries())drop.position.y=.06-fract(t*4+i/flowingDrops.length)*.48;
    pose(worker,-2.22,-2.94,-2.23,{pitch:.21,reach:.72+Math.sin(t*7)*.15});
    pose(driver,2.45,-1.9,-.68,{eyes:.94,bob:Math.sin(t*2.5)*.013});
    weather.update(frame);
    renderer.getSize(size);
    const aspect=Math.max(.3,size.x/Math.max(1,size.y));
    camera.aspect=aspect;
    camera.fov=aspect<1.2?mix(53,39,ease(.53,1.2,aspect)):39;
    camera.updateProjectionMatrix();
    look.fromArray(shot.aim);
    const pan=reducedMotion?.54:frame.travel;
    camera.position.copy(camA.fromArray(shot.from).lerp(camB.fromArray(shot.to),pan));
    if(aspect<1.1)camera.position.lerp(look,-(1.1-aspect)*.47);
    camera.lookAt(look);
    sky.position.copy(camera.position);
    renderer.render(scene,camera);
  }
  function dispose(){
    disposeCast();
    const geometries=new Set(Object.values(geo)),inks=new Set(materials);
    scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)inks.add(o.material);});
    for(const item of geometries)item.dispose();
    for(const item of inks)item.dispose();
    for(const tex of [stone,woodTexture])tex.dispose();
  }
  return {render,dispose};
}

const restorationShots=[
  {at:0,key:'landing',from:[8.6,4.3,9.3],to:[6.4,3.65,8.3],aim:[-.4,1.65,-1.95]},
  {at:3.5,key:'return-report',from:[4.1,2.55,6.8],to:[3.2,2.35,6.15],aim:[.05,1.38,-.35]},
  {at:9.1,key:'package',from:[2.6,2.29,4.45],to:[2.01,2.21,4.1],aim:[.22,1.23,.11]},
  {at:15.6,key:'invitation',from:[2.4,2.30,5.6],to:[3.2,2.6,6.8],aim:[.25,1.5,-.2]},
  {at:19.1,key:'upper-walk',from:[14,6.1,10.0],to:[17.2,6.6,9.1],aim:[11.5,2.4,-2]},
  {at:24.1,key:'switch',from:[21.45,5.6,4.55],to:[20.5,5.05,3.7],aim:[17.8,3.2,-1.45]},
  {at:29.1,key:'clouds',from:[17.6,7.3,2.9],to:[19.3,7.7,1.8],aim:[17,7.8,-55]},
];
const trainShots=[
  {at:0,key:'boarding',from:[5.9,3.9,8.1],to:[5.3,3.51,7.5],aim:[0,1.67,-1.8]},
  {at:3.5,key:'train-window',from:[3.25,2.88,6.45],to:[2.68,2.81,5.82],aim:[.85,2.79,-3.2]},
];

function chapter17Frame(seconds,shots,duration,train=false){
  const t=Math.max(0,Math.min(duration,seconds));
  const index=shots.findLastIndex(shot=>shot.at<=t),shot=shots[index];
  const report=t>=4.1&&t<6.8?['セハルネ','家まで出たよ。集落の槽にも入ってる']
    :t>=7.3&&t<8.9?['バルティア','……そっか']
    :t>=16.3&&t<18.7?['バルティア','一緒に来てくれる？']:null;
  return {
    t,shot,travel:ease(shot.at,shots[index+1]?.at??duration,t),
    subtitle:train?null:report,
    wind:train?0:1-.86*ease(16.8,20.2,t), switched:train?1:ease(26.5,30.15,t),
    ambience:train?.26+.34*ease(1,5,t):.62-.44*ease(16.8,20.2,t),
    curtain:1-ease(0,.58,t)+ease(duration-.8,duration,t),
    finished:t>=duration,
  };
}

export const rainStoryRestorationFrame=seconds=>chapter17Frame(seconds,restorationShots,35.7);
export const rainStoryTrainFrame=seconds=>chapter17Frame(seconds,trainShots,8.5,true);

// Station and observation decks are a closed set. Cinematic props cannot
// become construction objects, loot or dynamic collision in the live world.
export function createRainStoryRestoration({baltiaId,reducedMotion=false,train=false}){
  const scene=new T.Scene();scene.background=new T.Color(0xcbdce8);scene.fog=new T.FogExp2(0xc3d5e3,.008);
  const camera=new T.PerspectiveCamera(40,1,.08,510);
  const hemis=new T.HemisphereLight(0xe8f5ff,0x7a807a,1.48);
  const sun=new T.DirectionalLight(0xffe2bf,2.13);sun.position.set(-23,30,7);
  const rim=new T.DirectionalLight(0xc6ddff,.75);rim.position.set(8,8,-19);scene.add(hemis,sun,rim);
  const {actor,pose,dispose:disposeCast}=createRainStoryCast();
  const boxGeo=new T.BoxGeometry(1,1,1),ellipsoid=new T.SphereGeometry(1,32,18);
  const railGeo=new T.CylinderGeometry(.5,.5,1,16);
  const stone=coastSurfaceTexture('stone'),wood=coastSurfaceTexture('wood');
  stone.repeat.set(6,6);wood.repeat.set(2,2);
  const mat=(color,options={})=>new T.MeshStandardMaterial({color,roughness:.77,...options});
  const stoneInk=mat(0xb4c2be,{map:stone,bumpMap:stone,bumpScale:.035});
  const plaster=mat(0xd8ded2),blue=mat(0x476985),steel=mat(0x53646c,{metalness:.26,roughness:.44});
  const bronze=mat(0xaf8d54,{metalness:.25}),cedar=mat(0x9f8266,{map:wood});
  const dark=mat(0x24384d),light=mat(0xf3deb0,{emissive:0xc6a975,emissiveIntensity:.22});
  const dry=mat(0xb89c76),green=mat(0x6b9b85),red=mat(0x9c6955);
  const group=(parent,x=0,y=0,z=0)=>{
    const node=new T.Group();node.position.set(x,y,z);parent.add(node);return node;
  };
  const mesh=(parent,geometry,material,x,y,z,w,h,d)=>{
    const object=new T.Mesh(geometry,material);object.position.set(x,y,z);object.scale.set(w,h,d);parent.add(object);return object;
  };
  const box=(parent,material,x,y,z,w,h,d)=>mesh(parent,boxGeo,material,x,y,z,w,h,d);
  const orb=(parent,material,x,y,z,w,h,d)=>mesh(parent,ellipsoid,material,x,y,z,w,h,d);
  const beam=(parent,material,a,b,width)=>{
    const from=new T.Vector3(...a),to=new T.Vector3(...b),mid=from.clone().lerp(to,.5);
    const rod=mesh(parent,railGeo,material,...mid.toArray(),width,from.distanceTo(to),width);
    rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());
    return rod;
  };
  function writtenTag(text){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
    const g=canvas.getContext('2d');
    g.fillStyle='#f1e4cb';g.fillRect(0,0,256,96);g.strokeStyle='#b7a079';g.strokeRect(7,7,242,82);
    g.fillStyle='#354245';g.font='bold 30px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,128,48);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    return mat(0xffffff,{map:texture,roughness:.89});
  }

  const platform=group(scene),insideTrain=group(scene),stationTrain=group(platform,0,0,-4.4);
  box(platform,stoneInk,8,-.33,1,39,.65,18);
  for(let i=-10;i<=25;i+=2)box(platform,steel,i,.012,2,.027,.016,10);
  box(platform,stoneInk,17.8,1.54,-1.6,10,.48,7.7);
  const ramp=box(platform,stoneInk,11.65,.78,-.5,6.25,.28,2.8);
  ramp.rotation.z=.273;
  for(const y of [-.77,-.44])box(platform,dark,8,y,8.9,39,.2,.26);
  for(const x of [-9,-5,-1,3,7,11,15,19,23,27]){
    box(platform,steel,x,.70,-7.35,.08,1.43,.09);
    box(platform,steel,x,.70,9.87,.08,1.43,.09);
  }
  for(const z of [-7.4,9.9]){
    box(platform,steel,8,1.34,z,39,.084,.1);
    box(platform,steel,8,.66,z,39,.060,.08);
  }
  for(const x of [12.9,15,17.3,19.8,22.7]){
    box(platform,steel,x,2.35,-5.48,.095,1.3,.095);
    box(platform,steel,x,2.35,2.13,.095,1.3,.095);
  }
  for(const z of [-5.48,2.13])box(platform,steel,17.8,2.98,z,10,.10,.09);
  box(platform,plaster,-3.7,1.9,-5.4,12,3.8,.52);
  box(platform,blue,-3.7,3.86,-4.06,13,.24,4);
  for(const x of [-9.7,2.31])box(platform,steel,x,1.88,-2.06,.15,3.76,.15);
  for(const x of [-7.7,-5,-2.3,.4]){
    box(platform,dark,x,2.05,-5.1,2.0,1.83,.08);
    box(platform,light,x,2.11,-5.047,1.77,1.53,.03);
    box(platform,steel,x,2.11,-5.014,.075,1.54,.038);
  }
  box(platform,cedar,2.63,.71,-2.2,1.45,.12,.69);
  for(const x of [2.0,3.26])box(platform,steel,x,.37,-2.2,.14,.73,.55);
  box(platform,dark,2.83,.87,-2.24,.72,.23,.45);
  const slip=orb(platform,dry,2.43,.80,-2.30,.195,.075,.077);
  slip.rotation.z=-.17;
  box(platform,writtenTag('点検路'),3.87,1.05,-2.66,.73,.28,.047);
  beam(platform,steel,[3.87,.04,-2.67],[3.87,1,-2.67],.055);
  const saucer=group(platform,-5.9,.37,-3.35);
  orb(saucer,steel,0,.47,0,3.42,.64,2.43);
  orb(saucer,blue,0,.73,0,2.92,.43,2.24);
  orb(saucer,plaster,0,1.08,0,1.74,.93,1.67);
  orb(saucer,dark,0,1.21,.29,1.49,.66,1.47);
  for(const x of [-1.31,1.31])orb(saucer,light,x,.77,1.48,.25,.11,.18);

  const hero=actor(platform,WHITE_MICHI_ROAD_SABER_REN_ID,2.53);
  const baltia=actor(platform,baltiaId,2.37);
  const parcel=group(platform);
  box(parcel,dry,0,0,0,.73,.20,.48);
  box(parcel,plaster,0,.105,0,.15,.013,.51);
  box(parcel,writtenTag('バルティアへ'),0,.018,.248,.67,.17,.022);
  const packageStart=new T.Vector3(),packageEnd=new T.Vector3(),packageTable=new T.Vector3(2.28,.82,-2.05);
  const mast=group(platform,15.34,1.82,-3.62);
  beam(mast,steel,[0,0,0],[0,3.55,0],.10);
  const flagGeometry=new T.PlaneGeometry(1.58,.72,22,8);
  const flag=mesh(mast,flagGeometry,mat(0xc27855,{side:T.DoubleSide}),.81,3.12,0,1,1,1);
  const rest=Float32Array.from(flagGeometry.attributes.position.array);
  const switchBox=group(platform,18.9,1.82,-2.15);
  box(switchBox,dark,0,.64,0,1.38,1.28,.83);
  box(switchBox,steel,0,1.32,0,1.45,.11,.9);
  box(switchBox,writtenTag('海　　街'),0,1.06,.435,1.01,.26,.038);
  orb(switchBox,green,.38,1.25,.456,.087,.059,.032);
  const handle=group(switchBox,0,1.4,.07);
  beam(handle,steel,[0,0,0],[0,.68,0],.10);
  orb(handle,bronze,0,.71,0,.19,.125,.115);

  const cloudCanvas=document.createElement('canvas');cloudCanvas.width=256;cloudCanvas.height=128;
  const brush=cloudCanvas.getContext('2d');
  for(let i=0;i<25;i++){
    const x=30+sample(i)*196,y=35+sample(i+39)*58,r=15+sample(i+112)*34;
    const grad=brush.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,'rgba(255,255,252,0.25)');grad.addColorStop(.49,'rgba(233,244,250,0.17)');grad.addColorStop(1,'rgba(233,244,250,0)');
    brush.fillStyle=grad;brush.fillRect(x-r,y-r,r*2,r*2);
  }
  const puffTexture=new T.CanvasTexture(cloudCanvas);puffTexture.colorSpace=T.SRGBColorSpace;
  const horizon=group(scene);
  for(let i=0;i<28;i++){
    const cloud=new T.Sprite(new T.SpriteMaterial({map:puffTexture,color:0xecf5fa,opacity:.85,depthWrite:false}));
    cloud.position.set((i%9-4)*25+sample(i+1)*14,-5+sample(i+36)*9,-25-Math.floor(i/9)*27-sample(i+12)*14);
    cloud.scale.set(34+sample(i+14)*29,16+sample(i+49)*9,1);horizon.add(cloud);
  }
  const routeClouds=Array.from({length:7},(_,i)=>{
    const cloud=new T.Sprite(new T.SpriteMaterial({map:puffTexture,color:i%2?0xeaf5ff:0xfffbef,opacity:.95,depthWrite:false}));
    cloud.scale.set(15+i*.75,8+i*.26,1);horizon.add(cloud);return cloud;
  });
  box(horizon,mat(0x80aabe),-39,-9.5,-71,67,.15,58);
  for(let i=0;i<11;i++){
    const x=29+(i%6)*3.2,z=-70-Math.floor(i/6)*7.4,h=1.1+sample(i+93)*3.4;
    box(horizon,i%3?plaster:dry,x,-8.25+h*.5,z,2.6,h,2.4);
    const roof=box(horizon,i%2?red:blue,x,-8.2+h,z,2.85,.25,2.59);
    roof.rotation.z=(i%2?1:-1)*.10;
  }
  const rainMesh=new T.BufferGeometry();
  const rainPositions=new Float32Array(180*6);
  for(let i=0;i<180;i++){
    const x=sample(i+42)*31+28,y=sample(i+261)*21,z=-64-sample(i+71)*23;
    rainPositions.set([x,y,z,x+.9,y-5.4,z],i*6);
  }
  rainMesh.setAttribute('position',new T.BufferAttribute(rainPositions,3));
  const remoteRain=new T.LineSegments(rainMesh,new T.LineBasicMaterial({color:0x7e98b0,transparent:true,opacity:.23,depthWrite:false}));
  horizon.add(remoteRain);

  box(stationTrain,blue,0,.8,0,18,.62,3.4);
  box(stationTrain,blue,0,3.9,0,18,.22,3.55);
  box(stationTrain,plaster,0,2.30,-1.4,18,2.82,.22);
  for(const side of [-1,1]){
    box(stationTrain,blue,side*5.07,2.36,1.7,7.92,2.93,.18);
    for(const j of [2.6,4.75,7.0]){
      box(stationTrain,dark,side*j,2.69,1.806,1.76,1.30,.072);
      box(stationTrain,light,side*j,2.71,1.855,1.52,1.05,.028);
    }
  }
  box(stationTrain,writtenTag('街行き'),0,3.83,1.81,1.1,.29,.05);
  for(const x of [-6,6])orb(stationTrain,dark,x,.38,1.68,.48,.46,.12);
  const cabinDoor=[-1,1].map(side=>box(stationTrain,blue,side*1.65,2.38,1.84,1.17,2.91,.18));
  box(insideTrain,cedar,0,-.14,0,11,.28,11);
  box(insideTrain,cedar,0,.64,-3.95,11,1.28,.30);
  box(insideTrain,plaster,0,4.68,-3.95,11,1.27,.32);
  for(const x of [-4.7,-2.65,2.93,4.8])box(insideTrain,steel,x,2.5,-3.95,.25,2.52,.16);
  for(const y of [1.34,4.03])box(insideTrain,steel,0,y,-3.84,11,.10,.27);
  box(insideTrain,blue,-2.72,.64,-2.6,3.38,.39,1.24);
  box(insideTrain,blue,-2.72,1.29,-3.02,3.38,1.20,.33);
  box(insideTrain,cedar,3.8,.63,-2.67,2.25,.15,1.21);
  box(insideTrain,light,0,4.26,-2.83,5.4,.074,.28);
  const cabinHero=actor(insideTrain,WHITE_MICHI_ROAD_SABER_REN_ID,2.53);
  const cabinBaltia=actor(insideTrain,baltiaId,2.37);

  const camSize=new T.Vector2(),start=new T.Vector3(),end=new T.Vector3(),look=new T.Vector3();
  function render(renderer,frame){
    const {t,shot}=frame;
    const windowView=shot.key==='train-window';
    insideTrain.visible=windowView;platform.visible=!windowView;
    stationTrain.visible=train;saucer.visible=!train;
    parcel.visible=!train;flag.visible=!train;
    if(train){
      const board=ease(.60,2.8,t);
      pose(hero,-.49,mix(.42,-3.30,board),Math.PI,{bob:Math.sin(t*16)*.06,steps:Math.sin(t*16)*.37});
      pose(baltia,.65,mix(1.33,-2.87,ease(1,3.27,t)),Math.PI,{bob:Math.sin(t*15)*.044,steps:Math.sin(t*15)*.32});
      cabinDoor.forEach((door,i)=>{door.position.x=(i?1:-1)*mix(1.65,.59,ease(2.85,3.48,t));});
      pose(cabinHero,-2.24,-1.89,2.75,{y:.61,crouch:.14,pitch:-.04,bob:Math.sin(t*2.1)*.012});
      pose(cabinBaltia,-3.52,-1.93,2.73,{y:.61,crouch:.16,pitch:-.035,bob:Math.sin(t*2.1+.6)*.011});
    }else{
      const arrival=ease(.8,3.35,t),travel=ease(19,25,t);
      const grip=ease(9.35,10.6,t)*(1-ease(14,15.5,t));
      const invite=ease(16,17.4,t),work=ease(25.9,27.55,t);
      const walk=4*travel*(1-travel),breath=Math.sin(t*2.8)*.021;
      pose(hero,mix(mix(-3.65,-1.25,arrival),16.08,travel),mix(.9,.05,travel),mix(1.06,2.68,travel),{
        y:1.78*ease(.69,.86,travel),reach:grip*.76+frame.switched*.37,bob:breath+Math.sin(t*14)*walk*.047,steps:Math.sin(t*14)*walk*.4,pitch:.042,
      });
      pose(baltia,mix(1.28,18.4,travel),mix(-.17,-1.10,travel),mix(-.94,2.60,Math.max(invite*.32,travel)),{
        y:1.78*ease(.61,.81,travel),reach:grip*.8+work*.82,bob:breath+Math.sin(t*13)*walk*.048,steps:Math.sin(t*13)*walk*.39,
        pitch:.19*ease(10,12,t)*(1-invite)+work*(1-frame.switched)*.16,
        eyes:1-.08*grip,
      });
      packageStart.set(hero.base.position.x+.55,1.04,.41);
      packageEnd.set(baltia.base.position.x-.49,1.08,.49);
      parcel.position.copy(packageStart.lerp(packageEnd,ease(9.65,10.74,t)).lerp(packageTable,ease(13.8,15.5,t)));
      parcel.rotation.set(mix(-.07,.11,ease(10.7,13,t)),mix(-.20,.42,ease(10.3,13.8,t)),.05);
      slip.rotation.y=ease(1.4,3.4,t)*.33;
    }
    handle.rotation.z=mix(.66,-.65,frame.switched);
    const pos=flagGeometry.attributes.position;
    if(!windowView)for(let i=0;i<pos.count;i++){
      const x=rest[i*3],y=rest[i*3+1],width=(x+.79)/1.58;
      pos.setXYZ(i,x-width*width*.14*frame.wind,y-width*.19*(1-frame.wind),width*Math.sin(t*8.9-width*10)*(.045+frame.wind*.32));
    }
    pos.needsUpdate=true;
    const course=mix(-.97,.67,frame.switched);
    for(const [i,cloud] of routeClouds.entries()){
      const offset=fract(t*.070+i*.095)*1.05;
      cloud.position.set(9+Math.sin(course)*offset*61,5+i*.51,-16-Math.cos(course)*offset*66);
      cloud.material.opacity=(.33+.65*ease(0,.22,offset))*(1-ease(.78,1.03,offset));
    }
    remoteRain.visible=windowView;
    horizon.position.x=windowView?mix(-26,-35,ease(3.5,8.5,t)):0;
    horizon.position.y=windowView?mix(-2,2.74,ease(3.5,8.5,t)):0;
    renderer.getSize(camSize);
    camera.aspect=Math.max(.33,camSize.x/Math.max(camSize.y,1));
    camera.fov=mix(53,40,ease(.55,1.2,camera.aspect));
    look.fromArray(shot.aim);
    camera.position.copy(start.fromArray(shot.from).lerp(end.fromArray(shot.to),reducedMotion?.5:frame.travel));
    if(camera.aspect<1.12)camera.position.lerp(look,-(1.12-camera.aspect)*.38);
    camera.lookAt(look);camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  }
  function dispose(){
    disposeCast();
    const geos=new Set(),mats=new Set(),textures=new Set([stone,wood,puffTexture]);
    scene.traverse(object=>{
      if(object.geometry)geos.add(object.geometry);
      if(object.material){mats.add(object.material);if(object.material.map)textures.add(object.material.map);}
    });
    for(const item of geos)item.dispose();
    for(const item of mats)item.dispose();
    for(const item of textures)item.dispose();
  }
  return {render,dispose};
}

export function createRainStoryEndingSound({effects,music,part='ending'}) {
  const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;
  if(!Audio||(!effects&&!music))return null;
  const context=new Audio();
  const output=context.createGain();output.gain.value=.74;output.connect(context.destination);
  const rainGain=context.createGain();rainGain.gain.value=0;rainGain.connect(output);
  const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=part==='ending'?1020:part==='train'?146:298;filter.Q.value=.33;filter.connect(rainGain);
  const source=context.createBufferSource();
  const noise=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=noise.getChannelData(0);
  let seed=2921,brown=0;
  for(let i=0;i<data.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed/2147483648-1;
    brown=.984*brown+.016*white;
    data[i]=white*.36+brown*1.3;
  }
  source.buffer=noise;source.loop=true;source.connect(filter);source.start();
  void context.resume().catch(()=>{});
  function tone(hz,level,decay,type='sine'){
    if(level<=0)return;
    const now=context.currentTime,osc=context.createOscillator(),gain=context.createGain();
    osc.type=type;osc.frequency.value=hz;osc.connect(gain);gain.connect(output);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(level,.00015),now+.022);
    gain.gain.exponentialRampToValueAtTime(.0001,now+decay);
    osc.start(now);osc.stop(now+decay+.03);
  }
  const cues=part!=='ending'?(part==='train'
    ? [[2.88,()=>tone(140,effects*.23,.18,'triangle')],[4.3,()=>tone(196,music*.045,2.01)]]
    : [[26.58,()=>tone(136,effects*.22,.18,'triangle')],[26.69,()=>tone(320,effects*.10,.24)],[29.6,()=>tone(293.66,music*.061,2.15)]]):[
    [firstDropAt,()=>{tone(792,effects*.12,.17);tone(1211,effects*.026,.11);}],
    [firstDropAt+.63,()=>tone(523,effects*.07,.14)],
    [14.75,()=>tone(286,effects*.08,.29)],
    [15.26,()=>tone(382,effects*.06,.22)],
    [16.04,()=>tone(322,effects*.068,.2)],
  ];
  const melody=[293.66,440,392,329.63,293.66,246.94,261.63,329.63,392,440,329.63,293.66,261.63,220,246.94,293.66,261.63,196,261.63];
  if(part==='ending')melody.forEach((note,i)=>cues.push([28.5+i*1.67,()=>{
    tone(note,music*.085,1.8,'triangle');
    tone(note*2,music*.018,1.18);
    if(i%4===0)tone(note*.5,music*.047,3.1);
  }]));
  let cue=0;
  const suspend=()=>{if(context.state==='running')void context.suspend().catch(()=>{});};
  return {
    update(frame){
      rainGain.gain.setTargetAtTime((part==='ending'?frame.rain*.57:frame.ambience*.28)*effects,context.currentTime,.12);
      while(cue<cues.length&&frame.t>=cues[cue][0])cues[cue++][1]();
    },
    pause:suspend,
    resume:()=>{if(context.state==='suspended')void context.resume().catch(()=>{});},
    dispose:()=>{source.stop();void context.close().catch(()=>{});},
  };
}
