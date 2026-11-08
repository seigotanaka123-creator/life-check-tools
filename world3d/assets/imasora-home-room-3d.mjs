// The home is a single real scene. Its display receives IDs/colours/medals
// from the home UI and never opens or writes a game save.
import {homeJapanTime,homeClockSky} from './imasora-home-time.mjs';
import {homeSpeechInk} from './imasora-home-speech.mjs';
import './imasora-home-decor.js';
import {createHomeCapsuleRooms} from './imasora-home-capsule-3d.mjs';
export const HOME_NEIGHBORHOOD_LAYOUT=Object.freeze({
 road:Object.freeze({z:-10,width:6.4,length:100,top:-1.895}),
 walkway:Object.freeze({nearZ:-5.5,farZ:-14.5,width:2.2,top:-1.735}),
 trees:Object.freeze({z:-16.8,spacing:3.4}),
 factory:Object.freeze({x:6,y:-.532,z:-32,scale:.72}),
 hills:Object.freeze({z:-90})
});
export function homeWindowEventPhase(now){
 const hour=homeJapanTime(now).hour;
 return hour>=6&&hour<10?'morning':hour>=10&&hour<16?'day':hour>=16&&hour<19?'evening':'night';
}
export function createHomeWindowEvents(THREE,exterior,clouds){
 const root=new THREE.Group();root.name='home-window-events';exterior.add(root);
 const ufo=new THREE.Group();ufo.name='window-ufo';root.add(ufo);
 const metal=new THREE.MeshStandardMaterial({color:'#a4bdc6',roughness:.3,metalness:.75});
 const cyan=new THREE.MeshBasicMaterial({color:'#8ef5e9',toneMapped:false}),gold=new THREE.MeshBasicMaterial({color:'#ffe49b',toneMapped:false});cyan.userData.homeNeon=gold.userData.homeNeon=true;
 const glass=new THREE.MeshStandardMaterial({color:'#8ed6e2',emissive:'#397f91',emissiveIntensity:.5,metalness:.15,roughness:.22});
 function sphere(parent,material,x,y,z,sx,sy,sz){const part=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),material);part.position.set(x,y,z);part.scale.set(sx,sy,sz);parent.add(part);return part;}
 sphere(ufo,metal,0,0,0,1.65,.24,1.65);sphere(ufo,metal,0,-.14,0,1.05,.3,1.05);sphere(ufo,glass,0,.28,0,.78,.5,.78);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(1.5,.055,6,32),cyan);rim.rotation.x=Math.PI/2;ufo.add(rim);
 const lamps=new THREE.Group();ufo.add(lamps);for(let i=0;i<8;i++){const angle=i/8*Math.PI*2;sphere(lamps,i%2?gold:cyan,Math.cos(angle)*1.23,-.2,Math.sin(angle)*1.23,.11,.07,.11);}
 const flocks={};
 for(const[kind,colour]of[['morning','#f2f4e7'],['evening','#27343b']]){
  const flock=new THREE.Group();flock.name=kind==='morning'?'window-seagulls':'window-crows';root.add(flock);const material=new THREE.MeshStandardMaterial({color:colour,roughness:.85}),tip=new THREE.MeshStandardMaterial({color:kind==='morning'?'#526875':'#1e2b34',roughness:.85}),beak=new THREE.MeshStandardMaterial({color:kind==='morning'?'#d3a254':'#3d4241',roughness:.8});const wings=[];
  for(let i=0;i<3;i++){
   const bird=new THREE.Group();bird.position.set(i*.8,-i*.16,(i%2?-1:1)*i*.7);flock.add(bird);
   sphere(bird,material,0,0,0,.35,.14,.17);sphere(bird,material,-.25,.12,0,.15,.14,.13);
   const bill=new THREE.Mesh(new THREE.ConeGeometry(.055,.19,8),beak);bill.position.set(-.43,.12,0);bill.rotation.z=Math.PI/2;bird.add(bill);
   sphere(bird,tip,.31,.015,0,.22,.035,.14);
   for(const side of[-1,1]){const wing=new THREE.Group();wing.position.set(0,.06,side*.08);bird.add(wing);sphere(wing,material,.04,0,side*.32,.26,.045,.38);sphere(wing,tip,.12,0,side*.63,.17,.035,.2);wings.push({wing,side,index:i});}
  }
  flocks[kind]={flock,wings};
 }
 // Use the final window framing: a fixed world-space start made narrow screens
 // wait several seconds before the visitor reached the visible sky.
 const viewCamera=new THREE.PerspectiveCamera(48,1,.1,200),frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),tracks={};let cloudShift=0;
 function setView(position,target,aspect){
  viewCamera.position.copy(position);viewCamera.aspect=aspect;viewCamera.lookAt(target);viewCamera.updateProjectionMatrix();viewCamera.updateMatrixWorld(true);frustum.setFromProjectionMatrix(projection.multiplyMatrices(viewCamera.projectionMatrix,viewCamera.matrixWorldInverse));
  const edge=(plane,y,z)=>-(plane.normal.y*y+plane.normal.z*z+plane.constant)/plane.normal.x;
  for(const [kind,y] of [['morning',9.2],['evening',9.2],['night',8.7]])tracks[kind]={start:edge(frustum.planes[0],y,-33)+(kind==='night'?1.8:.6),end:edge(frustum.planes[1],y,-33)-3.5};
  const leading=clouds.at(-1);cloudShift=leading?edge(frustum.planes[0],leading.cloud.position.y,leading.cloud.position.z)+2.5-leading.x:0;
 }
 let since=null,phase=null,wasActive=false;
 function frameAt(time,{now,active=false,reducedMotion=false}={}){
  const next=homeWindowEventPhase(now);if(!active||!wasActive||phase!==next)since=time;
  phase=next;wasActive=active;root.visible=active;
  ufo.visible=active&&phase==='night';for(const[key,row]of Object.entries(flocks))row.flock.visible=active&&phase===key;
  const elapsed=Math.max(0,(time-since)/1000),speed=reducedMotion?.65:1;
  for(const row of clouds)row.cloud.position.x=phase==='day'&&active?((row.x+cloudShift+54-elapsed*.45*speed)%108+108)%108-54:row.x;
  const duration=phase==='night'?17:13,cycle=(duration+2.5)/speed,progress=(elapsed%cycle)*speed/duration;
  const moving=phase==='night'?ufo:flocks[phase]?.flock;
  if(moving){const track=tracks[phase]??{start:27,end:-27};moving.visible=active&&progress<=1;moving.position.set(track.start+(track.end-track.start)*Math.min(progress,1),phase==='night'?8.7:9.2,-33);if(!reducedMotion)moving.position.y+=Math.sin(elapsed*1.8)*.16;}
  lamps.rotation.y=reducedMotion?0:elapsed*.65;
  for(const row of Object.values(flocks))for(const{wing,side,index}of row.wings)wing.rotation.x=reducedMotion?side*.12:side*(.1+Math.sin(elapsed*7+index*.6)*.55);
  root.userData.windowEvent={phase,kind:phase==='night'?'ufo':phase==='day'?'clouds':phase==='morning'?'seagulls':'crows',active,direction:'right-to-left',elapsed};
 }
 return{root,frameAt,setView};
}

export function createHomeNeighborhoodFinishes(THREE,exterior,{textures,windows,poolTexture,townLamps}){
 const root=new THREE.Group();root.name='neighbourhood-finishes';exterior.add(root);
 const batches=new Map(),dummy=new THREE.Object3D(),boxGeometry=new THREE.BoxGeometry(1,1,1),quadGeometry=new THREE.PlaneGeometry(1,1),paneGeometry=new THREE.BoxGeometry(.64,.66,.025);
 const windowLights=[],nightMaterials=[],localLights=[];
 const hash=(x,y,seed=0)=>{const a=Math.sin(x*127.1+y*311.7+seed*17.3)*43758.5453;return a-Math.floor(a);};
 function texture(name,size,pixel,{repeat=true,color=true}={}){
  const pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const c=pixel(x,y),at=(y*size+x)*4;pixels[at]=c[0];pixels[at+1]=c[1];pixels[at+2]=c[2];pixels[at+3]=c[3]??255;}
  const map=new THREE.DataTexture(pixels,size,size);map.name=name;map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  map.wrapS=map.wrapT=repeat?THREE.RepeatWrapping:THREE.ClampToEdgeWrapping;map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;textures.push(map);return map;
 }
 const masonry=texture('home-painted-brick',128,(x,y)=>{const row=Math.floor(y/16),joint=y%16<1||(x+(row%2)*24)%48<1,n=hash(x,y);const v=joint?183:226+n*22;return[v,v*.99,v*.96];});
 const plaster=texture('home-fine-plaster',128,(x,y)=>{const v=222+hash(x,y)*25+Math.sin(x*.18)*2;return[v,v,v*.98];});
 const slate=texture('home-roof-slates',128,(x,y)=>{const row=Math.floor(y/24),seam=y%24<2||(x+(row%2)*16)%32<1,v=seam?105:183+hash(x,y)*20-(y%24)*.5;return[v*.96,v,v*1.02];});
 const asphalt=texture('home-road-grain',128,(x,y)=>{const n=hash(x,y),v=176+n*10+Math.sin(x*.24+y*.18)*2;return[v*.98,v,v*1.02];});
 const paving=texture('home-cut-stone',128,(x,y)=>{const joint=x%64<2||y%32<2,v=joint?160:224+hash(x,y)*20;return[v,v*.99,v*.97];});
 const grass=texture('home-grass-fibres',128,(x,y)=>{const v=219+hash(x,y)*9+Math.sin(x*.11)*Math.sin(y*.15)*4;return[v*.98,v,v*.96];});
 const foliage=texture('home-leaf-grain',64,(x,y)=>{const v=228+hash(x,y)*16+Math.sin(x*.6+y*.45)*4;return[v,v,v];});
 const interiors=Array.from({length:3},(_,variant)=>texture('home-curtain-interior-'+variant,64,(x,y)=>{
  const edge=x<3||x>60||y<3||y>60,curtain=Math.sin(x*(.45+variant*.07))**2;
  let v=edge?40:205+curtain*30-y*.18;
  if(variant===1&&y>44&&x>18&&x<42)v*=.55;
  if(variant===2&&x>27&&x<30)v*=.4;
  return[v,v,v];
 },{repeat:false}));
 const trim=new THREE.MeshStandardMaterial({color:'#c1bdac',roughness:.74,map:plaster});
 const stone=new THREE.MeshStandardMaterial({color:'#999f99',roughness:.86,map:paving,bumpMap:paving,bumpScale:.018});
 const iron=new THREE.MeshStandardMaterial({color:'#293f4c',roughness:.48,metalness:.45});
 const wood=new THREE.MeshStandardMaterial({color:'#7e6b55',roughness:.78,map:plaster});
 const roadMarks=new THREE.MeshStandardMaterial({color:'#c7c9b8',roughness:.93});
 const warmGlow=new THREE.MeshBasicMaterial({map:poolTexture,color:'#ffffff',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});warmGlow.userData.homeNeon=true;
 nightMaterials.push({material:warmGlow,opacity:.45});
 const porchBulb=new THREE.MeshBasicMaterial({color:'#ffd493',toneMapped:false});porchBulb.userData.homeNeon=true;nightMaterials.push({material:porchBulb,dayColor:'#938f7f',nightColor:'#ffe1a3'});
 function add(geometry,material,position,scale,rotation=[0,0,0],color){
  const key=geometry.uuid+material.uuid;if(!batches.has(key))batches.set(key,{geometry,material,items:[]});batches.get(key).items.push({position,scale,rotation,color});
 }
 const detail=(material,x,y,z,w,h,d,rotation)=>add(boxGeometry,material,[x,y,z],[w,h,d],rotation);
 const glow=(x,y,z,w,h,color,power=1,rotation)=>add(quadGeometry,warmGlow,[x,y,z],[w,h,1],rotation,new THREE.Color(color).multiplyScalar(power));
 const road=exterior.getObjectByName('residential-road'),sidewalk=exterior.getObjectByName('residential-sidewalk'),farSidewalk=exterior.getObjectByName('residential-far-sidewalk'),lawn=exterior.getObjectByName('residential-lawn');
 for(const [surface,map,roughness,bumpScale]of[[road,asphalt,.56,.007],[sidewalk,paving,.82,.018],[farSidewalk,paving,.82,.018],[lawn,grass,.98,.008]]){
  surface.material=surface.material.clone();surface.material.map=map;surface.material.bumpMap=map;surface.material.bumpScale=bumpScale;surface.material.roughness=roughness;
  const p=surface.geometry.getAttribute('position'),uv=surface.geometry.getAttribute('uv');for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*.5,p.getZ(i)*.5);uv.needsUpdate=true;
 }
 const roadSurfaceY=new THREE.Box3().setFromObject(road).max.y;for(let x=-35;x<=35;x+=3.5)detail(roadMarks,x,roadSurfaceY+.005,HOME_NEIGHBORHOOD_LAYOUT.road.z,.95,.009,.07);
 for(let x=-35;x<=35;x+=1)for(const side of[-1,1])detail(stone,x,HOME_NEIGHBORHOOD_LAYOUT.walkway.top-.08,HOME_NEIGHBORHOOD_LAYOUT.road.z+side*(HOME_NEIGHBORHOOD_LAYOUT.road.width/2+.1),.94,.16,.2);
 const palette=['#ffc78a','#ffdfa9','#ffd39a','#f8d8b1','#e2e9f3'];
 function finishWindow(glass,house,index,{replaceGeometry=false}={}){
  const houseIndex=Number(house.name.split('-').at(-1)),lit=(houseIndex*7+index*3)%9!==0;
  if(replaceGeometry){glass.geometry.dispose();glass.geometry=paneGeometry;}
  const warmth=palette[(houseIndex+index)%palette.length],power=.62+hash(houseIndex,index)*.55;
  glass.name='residential-window';glass.material=new THREE.MeshStandardMaterial({color:'#8da9b6',roughness:.3,metalness:.12,map:interiors[(houseIndex+index)%3],emissiveMap:interiors[(houseIndex+index)%3],emissive:warmth,emissiveIntensity:0});
  glass.material.userData.residentialWindow={house:house.name,lit,warmth,power};windowLights.push({material:glass.material,lit,power});
  if(lit){const p=house.position.clone().add(glass.position);if(Math.abs(glass.rotation.y)<.1)glow(p.x,p.y,p.z+.025,1.25,1.25,warmth,power*.6);}
 }
 const houses=exterior.children.filter(o=>o.name.startsWith('neighbourhood-house-'));
 for(const [i,house]of houses.entries()){
  const w=2.7+(i%2)*.6,h=4.2+(i%3)*.65,d=3.1,x=house.position.x,y=house.position.y,z=house.position.z;
  const wall=house.getObjectByName('residential-wall'),roof=house.getObjectByName('residential-roof');
  wall.material=wall.material.clone();wall.material.map=i%3===0?masonry:plaster;wall.material.bumpMap=wall.material.map;wall.material.bumpScale=i%3===0?.028:.013;wall.material.roughness=.87;
  wall.material.userData.residentialFinish=i%3===0?'painted-brick':'plaster';
  roof.material=roof.material.clone();roof.material.map=slate;roof.material.bumpMap=slate;roof.material.bumpScale=.025;roof.material.roughness=.71;roof.material.metalness=.07;roof.material.userData.residentialFinish='slate';
  const originalWindows=windows.filter(glass=>glass.parent===house);originalWindows.forEach((glass,index)=>finishWindow(glass,house,index,{replaceGeometry:true}));
  // Keep each original building envelope, adding recessed frames and daily-life detail.
  detail(trim,x,y+h-.08,z+d/2+.04,w+.14,.11,.14);
  detail(iron,x,y+h+.8,z,.07,.08,d+.32);
  for(const dx of[-w/2-.06,w/2+.06])detail(iron,x+dx,y+h,z,.07,.07,d+.3);
  detail(trim,x,y+2.0,z+d/2+.045,w+.06,.07,.1);
  detail(iron,x+w/2-.12,y+h/2,z+d/2+.1,.045,h-.12,.045);
  detail(stone,x+.6,y+.1,z+d/2+.4,1.0,.18,.65);
  detail(stone,x+.6,y+.035,z+d/2+1.65,.85,.06,2.0);
  detail(wood,x+.6,y+1.48,z+d/2+.24,1.0,.1,.48);
  detail(iron,x-.03,y+1.5,z+d/2+.1,.12,.22,.12);
  detail(porchBulb,x-.03,y+1.46,z+d/2+.18,.075,.15,.035);
  glow(x-.03,y+1.45,z+d/2+.2,1.1,1.35,'#ffc475',.45);
  glow(x+.25,y+1.0,z+d/2+.018,1.7,2.6,'#edb473',.07);
  glow(x+.6,y+.028,z+d/2+1.0,3.3,3.5,'#e8b56f',.22,[-Math.PI/2,0,0]);
  if(h>4.7){
   for(const [j,dx]of[-.7,.55].entries()){
    const glass=new THREE.Mesh(paneGeometry,new THREE.MeshStandardMaterial());glass.position.set(dx,3.65,d/2+.045);house.add(glass);glass.material.dispose();finishWindow(glass,house,j+4);windows.push(glass);
    for(const edge of[-.35,.35])detail(trim,x+dx+edge,y+3.65,z+d/2+.07,.045,.75,.07);
    detail(trim,x+dx,y+3.27,z+d/2+.09,.75,.065,.13);
   }
  }
  for(const side of[-1,1]){
   const glass=new THREE.Mesh(paneGeometry,new THREE.MeshStandardMaterial());glass.position.set(side*(w/2+.025),2.4,.35);glass.rotation.y=side*Math.PI/2;house.add(glass);glass.material.dispose();finishWindow(glass,house,side<0?6:7);windows.push(glass);
  }
  if(i%3===1){
   detail(stone,x-.55,y+2.02,z+d/2+.26,1.2,.07,.44);
   detail(iron,x-.55,y+2.38,z+d/2+.48,1.2,.035,.035);
   for(let j=0;j<6;j++)detail(iron,x-1.1+j*.22,y+2.2,z+d/2+.48,.023,.36,.023);
  }
  if(i===2||i===4){const light=new THREE.PointLight(0xffca8b,0,7,2);light.name='residential-porch-light';light.position.set(x-.03,y+1.6,z+d/2+.5);light.layers.set(1);light.castShadow=false;root.add(light);localLights.push({light,power:6});}
 }
 for(const [i,tree]of exterior.children.filter(o=>o.name==='outdoor-tree').entries())for(const crown of tree.children.filter(o=>o.geometry?.type==='SphereGeometry')){
  crown.material=crown.material.clone();crown.material.color.set(i%2?'#668270':'#5b7866');crown.material.map=foliage;crown.material.bumpMap=foliage;crown.material.bumpScale=.008;crown.material.roughness=.92;
 }
 // Three real soft lights near the window illuminate the road, trunks and leaves.
 // The remaining lamp pools and porch glows share the same small textures.
 for(const pole of townLamps.children.filter(o=>Math.abs(o.position.x)<=6)){
  const light=new THREE.PointLight(0xffc477,0,11,2);light.name='residential-street-light';light.position.set(0,3.16,1.45);light.layers.set(1);light.castShadow=false;pole.add(light);localLights.push({light,power:30});
 }
 for(const {geometry,material,items}of batches.values()){
  const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name=material===warmGlow?'residential-soft-light':'residential-building-detail';
  items.forEach((item,i)=>{dummy.position.fromArray(item.position);dummy.scale.fromArray(item.scale);dummy.rotation.set(...item.rotation);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(item.color)mesh.setColorAt(i,item.color);});
  mesh.computeBoundingSphere();mesh.castShadow=mesh.receiveShadow=material.isMeshStandardMaterial;root.add(mesh);
 }
 return{updateNight(night,resolve=material=>material){
  for(const row of windowLights)resolve(row.material).emissiveIntensity=night*(row.lit?row.power:.018);
  for(const row of nightMaterials){const material=resolve(row.material);if(row.opacity!==undefined)material.opacity=night*row.opacity;else material.color.set(row.dayColor).lerp(new THREE.Color(row.nightColor),night);}
  for(const row of localLights)row.light.intensity=night*row.power;
 }};
}

export function createHomeFactoryExterior(THREE){
 const root=new THREE.Group();root.name='distant-industrial-waterfront';
 const batches=new Map(),lights=[],dummy=new THREE.Object3D();
 const steel=new THREE.MeshStandardMaterial({color:'#466072',metalness:.62,roughness:.45});
 const silver=new THREE.MeshStandardMaterial({color:'#aabec7',metalness:.62,roughness:.38});
 const dark=new THREE.MeshStandardMaterial({color:'#203344',metalness:.35,roughness:.64});
 const red=new THREE.MeshStandardMaterial({color:'#a55e54',metalness:.3,roughness:.65});
 const cyan=new THREE.MeshBasicMaterial({color:'#78ffe3',toneMapped:false});
 const warm=new THREE.MeshBasicMaterial({color:'#ffd69a',toneMapped:false});
 const white=new THREE.MeshBasicMaterial({color:'#d3edff',toneMapped:false});
 const rose=new THREE.MeshBasicMaterial({color:'#ff8486',toneMapped:false});
 for(const material of[cyan,warm,white,rose]){
  material.userData.homeNeon=true;lights.push({material,base:material.color.clone()});
 }
 const box=new THREE.BoxGeometry(1,1,1),tube=new THREE.CylinderGeometry(1,1,1,16);
 const ring=new THREE.TorusGeometry(1,.045,5,24),sphere=new THREE.SphereGeometry(1,16,10);
 const quad=new THREE.PlaneGeometry(1,1);
 const pixels=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const dx=(x-31.5)/31.5,dy=(y-31.5)/31.5,r=Math.hypot(dx,dy);
  const halo=Math.exp(-r*r*12)*.8;
  const star=Math.max(Math.max(0,1-Math.abs(dx)*24)*Math.max(0,1-Math.abs(dy)),Math.max(0,1-Math.abs(dy)*24)*Math.max(0,1-Math.abs(dx)))*.4;
  const at=(y*64+x)*4;pixels[at]=pixels[at+1]=pixels[at+2]=255;
  pixels[at+3]=Math.round(Math.min(1,halo+star)*255);
 }
 const glowTexture=new THREE.DataTexture(pixels,64,64);glowTexture.needsUpdate=true;
 const glow=new THREE.MeshBasicMaterial({map:glowTexture,color:'#b7e8fa',transparent:true,
  depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 glow.userData.homeNeon=true;lights.push({material:glow,base:glow.color.clone()});
 function add(geometry,material,position,scale,rotation=[0,0,0]){
  const key=geometry.uuid+material.uuid;
  if(!batches.has(key))batches.set(key,{geometry,material,items:[]});
  batches.get(key).items.push({position,scale,rotation});
 }
 function beam(a,b,width,material=steel){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
  const direction=to.clone().sub(from),mid=from.clone().add(to).multiplyScalar(.5);
  const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
  const key=box.uuid+material.uuid;
  if(!batches.has(key))batches.set(key,{geometry:box,material,items:[]});
  batches.get(key).items.push({position:mid.toArray(),scale:[width,direction.length(),width],quaternion});
 }
 function lamp(x,y,z,material=warm,size=1){
  add(box,material,[x,y,z],[.12*size,.12*size,.12*size]);
  add(quad,glow,[x,y,z+.12],[1.7*size,1.7*size,1]);
 }
 function platform(x,y,z,width=3.1,depth=2.5){
  add(box,steel,[x,y,z],[width,.13,depth]);
  for(const dx of[-width/2,width/2]){
   add(box,silver,[x+dx,y+.4,z+depth/2],[.045,.8,.045]);
   lamp(x+dx,y+.8,z+depth/2,white,.65);
  }
  add(box,silver,[x,y+.8,z+depth/2],[width,.055,.055]);
 }
 const base=-1.9;
 // Two staggered process trains fill the skyline with different silhouettes.
 for(let i=0;i<16;i++){
  const row=Math.floor(i/8),x=(i%8-3.5)*4.4+row*2,z=-39-row*10-(i%3)*1.3;
  const height=6.4+(i*7%13)*.54;
  add(tube,silver,[x,base+height/2,z],[.62+(i%3)*.16,height,.62+(i%3)*.16]);
  add(sphere,silver,[x,base+height,z],[.68,.36,.68]);
  for(const dx of[-1.2,1.2])for(const dz of[-1,1])add(box,steel,[x+dx,base+height/2,z+dz],[.085,height,.085]);
  for(let level=1.6;level<height-.3;level+=1.9){
   platform(x,base+level,z);
   add(ring,i%3?warm:cyan,[x,base+level+.16,z],[.89,.89,.89],[Math.PI/2,0,0]);
   beam([x-1.2,base+level,z+1],[x+1.2,base+Math.min(level+1.9,height),z+1],.06);
  }
  for(let y=1;y<height;y+=.33)add(box,silver,[x+.92,base+y,z+1.1],[.4,.032,.05]);
  lamp(x,base+height+.55,z,white,1.35);
 }
 // Large spherical and cylindrical tanks make the low foreground recognisable.
 for(let i=0;i<5;i++){
  const x=-21+i*10,z=-41-(i%2)*4;
  add(tube,silver,[x,base+1.6,z],[2.25,3.2,2.25]);
  add(sphere,silver,[x,base+3.15,z],[2.25,.35,2.25]);
  add(ring,warm,[x,base+3.25,z],[2.1,2.1,2.1],[Math.PI/2,0,0]);
  lamp(x,base+3.8,z+2.2,warm,1.15);
 }
 for(const x of[-24,24]){
  add(sphere,silver,[x,2.9,-49],[3.2,3.2,3.2]);
  for(const dx of[-1.9,1.9])add(box,steel,[x+dx,-.1,-49],[.2,3.6,.2]);
  lamp(x,6.3,-49,white,1.4);
 }
 // Red/white chimneys, pipe bridges and practical work lights create depth.
 for(let i=0;i<3;i++){
  const x=-13+i*13,z=-57-i*2,height=14+i*1.5;
  for(let section=0;section<6;section++){
   add(tube,section%2?red:silver,[x,base+(section+.5)*height/6,z],[.49,height/6,.49]);
  }
  lamp(x,base+height+.3,z,rose,1.2);
 }
 for(let row=0;row<3;row++){
  const z=-35-row*7,y=base+2.2+row*.8;
  add(box,dark,[0,y,z],[48,.22,1.6]);
  for(let line=0;line<4;line++)add(tube,silver,[0,y+.25+line*.18,z],[.1,48,.1],[0,0,Math.PI/2]);
  for(let x=-23;x<=23;x+=3.8){
   add(box,steel,[x,base+(y-base)/2,z],[.14,y-base,.14]);
   lamp(x,y+.7,z+.85,row%2?cyan:warm,.85);
  }
 }
 // Distant city windows remain individual lights rather than glowing building faces.
 for(let i=0;i<28;i++){
  const x=(i-13.5)*3.3,z=-78-(i%4)*4,height=3.3+(i*11%9)*.65,width=1.7+(i%3)*.2;
  add(box,dark,[x,base+height/2,z],[width,height,1.7]);
  for(let floor=0;floor<Math.floor(height/.48);floor++)for(let col=0;col<3;col++){
   if((floor*7+col*3+i)%5===0)continue;
   add(box,(i+floor)%4?warm:white,[x+(col-1)*width*.28,base+.35+floor*.48,z+.88],[.18,.19,.018]);
  }
 }
 // Quay, breakwater and a low illuminated bridge separate land from the bay.
 add(box,dark,[0,base+.25,-34],[92,.5,2]);
 for(let x=-42;x<=42;x+=3){
  lamp(x,base+.75,-32.9,x%2?warm:white,.65);
  add(box,steel,[x,base+1,-33],[.05,1.8,.05]);
 }
 for(let i=0;i<11;i++){
  const x=-32+i*6.5;
  add(box,steel,[x,base+4.9,-65],[6.6,.18,.8]);
  add(box,dark,[x,base+2.4,-65],[.25,4.8,.25]);
  lamp(x,base+5.2,-64.5,cyan,.9);
 }
 for(const{geometry,material,items}of batches.values()){
  const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name='factory-structure';
  items.forEach((item,i)=>{
   dummy.position.fromArray(item.position);dummy.scale.fromArray(item.scale);
   if(item.quaternion)dummy.quaternion.copy(item.quaternion);else dummy.rotation.set(...item.rotation);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.computeBoundingSphere();root.add(mesh);
 }
 const uniforms={time:{value:0},night:{value:0}};
 const waterMaterial=new THREE.ShaderMaterial({uniforms,transparent:false,depthWrite:true,
  vertexShader:`varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:`varying vec3 world;uniform float time;uniform float night;
  float random(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(random(i),random(i+vec2(1.,0.)),f.x),mix(random(i+vec2(0.,1.)),random(i+vec2(1.,1.)),f.x),f.y);}
  void main(){
   float ripple=sin(world.z*4.+time*.65+sin(world.x*1.2))*.5+sin(world.z*11.-time*.9+world.x*3.1)*.25;
   float depth=clamp((-world.z-9.)/25.,0.,1.);
   vec3 color=mix(vec3(.19,.36,.41),vec3(.008,.027,.055),night);
   color+=vec3(.025,.06,.085)*(ripple*.16+.17);
   float broken=pow(noise(vec2(world.x*2.,world.z*7.-time*.4))*.65+noise(vec2(world.x*8.,world.z*19.+time*.5))*.35,2.4);
   for(int i=0;i<12;i++){
    float fi=float(i),x=(fi-5.5)*3.8;
    float dx=world.x-x+sin(world.z*1.2+time*.35+fi)*(.08+(1.-depth)*.5);
    float beam=exp(-dx*dx/(.035+pow(1.-depth,2.)*.85));
    float fade=sin(clamp(depth,0.,1.)*3.14159);
    vec3 light=mod(fi,3.)<.5?vec3(.22,.92,.83):vec3(1.,.66,.29);
    color+=light*beam*broken*fade*night*1.0;
   }
   gl_FragColor=vec4(color,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const water=new THREE.Mesh(new THREE.PlaneGeometry(120,25),waterMaterial);
 water.rotation.x=-Math.PI/2;water.position.set(0,base+.06,-21.5);water.name='harbor-reflections';root.add(water);
 return{root,glowTexture,updateNight(night,resolve=material=>material){
  for(const row of lights){
   const material=resolve(row.material);material.color.copy(row.base).multiplyScalar(.12+night*1.4);
   if(material===resolve(glow))material.opacity=night*.65;
  }
  for(const material of[steel,silver,dark]){const surface=resolve(material);surface.emissive.set('#365968');surface.emissiveIntensity=night*.17;}
  resolve(waterMaterial).uniforms.night.value=night;
 },frameAt(time,resolve=material=>material){resolve(waterMaterial).uniforms.time.value=time/1000;}};
}

export function createHomeRoomScene(THREE,Characters,buildCharacter,{documentTarget=document,onAction=()=>{},onFeedback=()=>{},clock:readClock=()=>Date.now(),random:readRandom=Math.random}={}){
 const doc=documentTarget,scene=new THREE.Scene();scene.background=new THREE.Color('#ececdb');
 const camera=new THREE.PerspectiveCamera(36,1,.1,200);const target=new THREE.Vector3(0,1.35,0),lookTarget=target.clone(),cameraGoal=new THREE.Vector3(),lookGoal=target.clone();let yaw=.16,focusName='',cameraTransition=false,viewWidth=1,viewHeight=1,interiorSequence=null;
 const materials=new Map(),props=[],actors=[],textures=[];let disposed=false;
 const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.76,metalness:0,...extra}));return materials.get(key);};
 const group=(name,action)=>{const g=new THREE.Group();g.name=name;if(action)g.userData.homeAction=action;scene.add(g);props.push(g);return g;};
 const mesh=(geo,material,parent,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;(parent||scene).add(o);return o;};
 const rounded=(w,h,d,r=.08)=>{r=Math.min(r,w/3,h/3,d/3);const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:3,curveSegments:5});g.translate(0,0,-(d-2*r)/2);return g;};
 const box=(p,c,w,h,d,x,y,z,r=.05)=>mesh(rounded(w,h,d,r),mat(c),p,x,y,z);
 const ball=(p,c,x,y,z,sx,sy=sx,sz=sx)=>{const o=mesh(new THREE.SphereGeometry(1,20,14),mat(c),p,x,y,z);o.scale.set(sx,sy,sz);return o;};
 const cylinder=(p,c,rt,rb,h,x,y,z)=>mesh(new THREE.CylinderGeometry(rt,rb,h,20),mat(c),p,x,y,z);
 const wood='#a77b4c',trim='#6e5638',cream='#f2edcf',green='#78a98a',darkGreen='#467e68',gold='#d4b25b';
 const floor=group('wooden-floor');box(floor,trim,8.8,.25,6.3,0,-.2,.15,.08);
 const boards=new THREE.InstancedMesh(new THREE.BoxGeometry(.827,.055,1.19),mat('#ffffff'),50),dummy=new THREE.Object3D();let b=0;
 for(let z=0;z<5;z++)for(let x=0;x<10;x++){dummy.position.set((x-4.5)*.84,.02,(z-2)*1.205+.1);dummy.updateMatrix();boards.setMatrixAt(b,dummy.matrix);boards.setColorAt(b,new THREE.Color().setHSL(.1,.28,.69+.025*((x+z*2)%4)));b++;}boards.receiveShadow=true;floor.add(boards);
 const walls=group('room-walls');
 // Four wall sections leave an actual opening. The outdoor scene is visible
 // through it, instead of placing a blue picture over a solid wall.
 for(const[w,h,x,y]of[[8.65,1.475,0,.6625],[8.65,.775,0,3.4875],[.775,1.7,-3.9375,2.25],[5.475,1.7,1.5875,2.25]])box(walls,'#e1e8d8',w,h,.16,x,y,-2.65,.025);
 box(walls,'#e9e6ce',.16,3.95,5.65,-4.25,1.9,.12,.03);
 for(const x of[-4.16,4.16])box(walls,wood,.12,3.9,.24,x,1.9,-2.53,.025);
 box(walls,wood,8.5,.14,.19,0,3.8,-2.52,.025);box(walls,wood,8.5,.16,.18,0,.13,-2.52,.025);box(walls,wood,.18,.16,5.5,-4.12,.13,.1,.02);
 const windowGroup=group('window-to-the-town','window');windowGroup.position.set(-2.35,2.25,-2.5);
 const aperture=mesh(new THREE.PlaneGeometry(2.38,1.66),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilZPass:THREE.ReplaceStencilOp}),windowGroup,0,0,.18);aperture.name='open-window-aperture';aperture.renderOrder=1;aperture.castShadow=aperture.receiveShadow=false;
 const exterior=group('window-outdoor-landscape'),outdoorWindows=[],clouds=[];
 const lawn=box(exterior,'#7c916c',120,.3,100,0,-2.1,-50,.02);lawn.name='residential-lawn';const road=box(exterior,'#738481',HOME_NEIGHBORHOOD_LAYOUT.road.length,.05,HOME_NEIGHBORHOOD_LAYOUT.road.width,0,-1.92,HOME_NEIGHBORHOOD_LAYOUT.road.z,.01);road.name='residential-road';const sidewalk=box(exterior,'#a9ae9e',100,.18,HOME_NEIGHBORHOOD_LAYOUT.walkway.width,0,HOME_NEIGHBORHOOD_LAYOUT.walkway.top-.09,HOME_NEIGHBORHOOD_LAYOUT.walkway.nearZ,.01);sidewalk.name='residential-sidewalk';const farSidewalk=box(exterior,'#a9ae9e',100,.18,HOME_NEIGHBORHOOD_LAYOUT.walkway.width,0,HOME_NEIGHBORHOOD_LAYOUT.walkway.top-.09,HOME_NEIGHBORHOOD_LAYOUT.walkway.farZ,.01);farSidewalk.name='residential-far-sidewalk';const pavementTop=new THREE.Box3().setFromObject(farSidewalk).max.y,roadSurfaceY=new THREE.Box3().setFromObject(road).max.y,groundSurfaceY=new THREE.Box3().setFromObject(lawn).max.y;
 for(let i=0;i<5;i++){const x=(i-2)*18,hill=ball(exterior,['#758d84','#8d9f98','#6b8880'][i%3],x,-1.9,HOME_NEIGHBORHOOD_LAYOUT.hills.z-i%2*8,18,5+i%3*2,12);hill.name='distant-hill';}
 const houseColours=['#d8d0ba','#c5c7bf','#d7d5c6','#bdc6bc','#d7c9b9'];
 for(let i=0;i<9;i++){
  const house=new THREE.Group();house.name='neighbourhood-house-'+i;house.position.set((i-4)*4.8,-1.9,-37-(i%3)*6);exterior.add(house);const w=2.7+(i%2)*.6,h=4.2+(i%3)*.65,d=3.1;
  const wall=box(house,houseColours[i%5],w,h,d,0,h/2,0,.035);wall.name='residential-wall';box(house,'#777f78',w+.1,.15,d+.1,0,.1,0,.02);
  const roofShape=new THREE.Shape();roofShape.moveTo(-w/2-.18,0);roofShape.lineTo(0,.8);roofShape.lineTo(w/2+.18,0);roofShape.closePath();const roofGeo=new THREE.ExtrudeGeometry(roofShape,{depth:d+.36,bevelEnabled:false});roofGeo.translate(0,0,-(d+.36)/2);const roof=mesh(roofGeo,mat(['#65747a','#766b63','#5e7372'][i%3]),house,0,h,0);roof.name='residential-roof';
  box(house,'#8a8374',.62,1.25,.06,.6,.63,d/2+.04,.01);
  for(let row=0;row<2;row++)for(const x of[-.7,.55]){const glass=box(house,'#8fa9aa',.64,.66,.025,x,1.15+row*1.25,d/2+.04,.005);outdoorWindows.push(glass);for(const dx of[-.34,.34])box(house,'#e4e2d6',.04,.74,.08,x+dx,glass.position.y,d/2+.065,.005);box(house,'#e4e2d6',.7,.05,.1,x,glass.position.y-.36,d/2+.1,.005);}
  box(house,'#7d8983',.8,.26,.75,-.6,h+.16,-.7,.015);
 }
 for(let i=0;i<14;i++){const tree=new THREE.Group();tree.name='outdoor-tree';tree.position.set((i-6.5)*HOME_NEIGHBORHOOD_LAYOUT.trees.spacing,groundSurfaceY,HOME_NEIGHBORHOOD_LAYOUT.trees.z-(i%2)*.3);exterior.add(tree);cylinder(tree,'#716750',.08,.12,3.5,0,1.75,0);for(let k=0;k<3;k++)ball(tree,['#638369','#749178','#547461'][k],(k-1)*.27,3.8+k*.12,0,.56,.72,.52);}
 for(let i=0;i<4;i++){const cloud=new THREE.Group();cloud.position.set(-25+i*18,8+i%2*3,-55-i%2*7);for(let k=0;k<4;k++)ball(cloud,'#f2f4ee',(k-1.5)*1.1,k%2*.4,0,1.5,.7,1);exterior.add(cloud);clouds.push({cloud,x:cloud.position.x});}
 const windowEvents=createHomeWindowEvents(THREE,exterior,clouds);
 const factory=createHomeFactoryExterior(THREE);factory.root.scale.setScalar(HOME_NEIGHBORHOOD_LAYOUT.factory.scale);factory.root.position.set(HOME_NEIGHBORHOOD_LAYOUT.factory.x,HOME_NEIGHBORHOOD_LAYOUT.factory.y,HOME_NEIGHBORHOOD_LAYOUT.factory.z);factory.root.getObjectByName('harbor-reflections').visible=false;exterior.add(factory.root);textures.push(factory.glowTexture);
 // Keep the original residential view. Night lighting belongs to the houses
 // and the near road too; the industrial skyline is a distant part of it.
 const townGlow=new THREE.MeshBasicMaterial({color:'#ffd493',map:factory.glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});townGlow.userData.homeNeon=true;
 const poolPixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const at=(y*32+x)*4,r2=((x-15.5)/15.5)**2+((y-15.5)/15.5)**2;poolPixels[at]=poolPixels[at+1]=poolPixels[at+2]=255;poolPixels[at+3]=Math.round(Math.max(0,Math.exp(-r2*4.5)-.011)*255);}
 const poolTexture=new THREE.DataTexture(poolPixels,32,32);poolTexture.needsUpdate=true;textures.push(poolTexture);
 const roadGlow=townGlow.clone();roadGlow.map=poolTexture;roadGlow.userData.homeNeon=true;
 const streetBulb=new THREE.MeshBasicMaterial({color:'#ffe2ac',toneMapped:false});streetBulb.userData.homeNeon=true;
 const townLamps=new THREE.Group();townLamps.name='neighbourhood-streetlights';exterior.add(townLamps);
 const haloGeometry=new THREE.PlaneGeometry(1,1);
 for(let i=0;i<9;i++){
  const pole=new THREE.Group();pole.name='neighbourhood-streetlight';pole.position.set((i-4)*6,pavementTop,HOME_NEIGHBORHOOD_LAYOUT.walkway.farZ);townLamps.add(pole);
  cylinder(pole,'#48565b',.045,.065,3.5,0,1.75,0);box(pole,'#48565b',.08,.06,1.5,0,3.48,.75,.02);box(pole,'#e9d7ae',.46,.12,.3,0,3.42,1.45,.02);
  mesh(new THREE.SphereGeometry(.1,8,6),streetBulb,pole,0,3.35,1.48);
  const halo=mesh(haloGeometry,townGlow,pole,0,3.35,1.5);halo.scale.set(1.6,1.6,1);halo.castShadow=halo.receiveShadow=false;
  const pool=mesh(haloGeometry,roadGlow,pole,0,roadSurfaceY+.008-pavementTop,2.9);pool.rotation.x=-Math.PI/2;pool.scale.set(6.5,6.5,1);pool.castShadow=pool.receiveShadow=false;
 }
 const residential=createHomeNeighborhoodFinishes(THREE,exterior,{textures,windows:outdoorWindows,poolTexture,townLamps});

 const skyUniforms={top:{value:new THREE.Color('#79b8d6')},horizon:{value:new THREE.Color('#d7e5dc')}};
 const skyDome=mesh(new THREE.SphereGeometry(125,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 direction;void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 direction;uniform vec3 top;uniform vec3 horizon;void main(){gl_FragColor=vec4(mix(horizon,top,pow(max(0.,direction.y),.55)),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}),exterior);skyDome.name='outdoor-sky';skyDome.frustumCulled=false;
 const sun=mesh(new THREE.SphereGeometry(1.1,20,12),new THREE.MeshBasicMaterial({color:'#ffe7b0'}),exterior),moon=mesh(new THREE.SphereGeometry(.85,24,16),new THREE.MeshBasicMaterial({color:'#e2e8dc'}),exterior);sun.name='outdoor-sun';moon.name='outdoor-moon';
 const portalMaterials=new Map(),outdoorTint=[];
 exterior.traverse(o=>{if(!o.isMesh&&!o.isSprite)return;const original=o.material;if(!portalMaterials.has(original)){const material=original.clone();Object.assign(material,{stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilFail:THREE.KeepStencilOp,stencilZFail:THREE.KeepStencilOp,stencilZPass:THREE.KeepStencilOp});portalMaterials.set(original,material);if(material.color&&!material.userData.homeNeon)outdoorTint.push({material,base:material.color.clone()});}o.material=portalMaterials.get(original);o.layers.set(1);o.renderOrder=2;o.castShadow=o.receiveShadow=o.material.isMeshStandardMaterial;});
 camera.layers.enable(1);
 const exteriorMaterial=material=>portalMaterials.get(material)??material;
 const outsideHemi=new THREE.HemisphereLight(0xdceeff,0x717e63,1.3),outsideSun=new THREE.DirectionalLight(0xffe6bf,2.5);outsideHemi.layers.set(1);outsideSun.layers.set(1);outsideSun.target.position.set(0,-1,-25);outsideSun.castShadow=true;outsideSun.shadow.mapSize.set(512,512);outsideSun.shadow.camera.layers.set(1);Object.assign(outsideSun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:.1,far:125});outsideSun.shadow.camera.updateProjectionMatrix();outsideSun.shadow.normalBias=.035;outsideSun.shadow.autoUpdate=false;scene.add(outsideHemi,outsideSun,outsideSun.target);
 // Cloning the ShaderMaterial copies its uniforms; update the live values.
 const liveSky=skyDome.material.uniforms,outdoorFog=new THREE.FogExp2('#203249',.006);
 const outsideBounds=exterior.children.filter(o=>![skyDome,sun,moon,windowEvents.root,...clouds.map(row=>row.cloud)].includes(o)).map(object=>({object,bounds:new THREE.Box3().setFromObject(object).expandByScalar(clouds.some(c=>c.cloud===object)?3:0)}));
 function cullOutside(){
  scene.updateMatrixWorld(true);const corners=[[-1.19,-.83],[1.19,-.83],[1.19,.83],[-1.19,.83]].map(([x,y])=>aperture.localToWorld(new THREE.Vector3(x,y,0))),center=aperture.getWorldPosition(new THREE.Vector3()),inside=center.clone().add(center.clone().sub(camera.position).normalize().multiplyScalar(10));
  const planes=corners.map((p,i)=>{const plane=new THREE.Plane().setFromCoplanarPoints(camera.position,p,corners[(i+1)%4]);if(plane.distanceToPoint(inside)<0)plane.negate();return plane;});
  planes.push(new THREE.Plane(new THREE.Vector3(0,0,-1),corners[0].z),new THREE.Plane(new THREE.Vector3(0,0,1),150));const throughWindow=new THREE.Frustum(...planes);
  for(const row of outsideBounds)row.object.visible=throughWindow.intersectsBox(row.bounds);
 }
 for(const x of[-1.27,1.27])box(windowGroup,cream,.12,1.92,.21,x,0,.21,.02);
 for(const y of[-.92,.92])box(windowGroup,cream,2.66,.12,.21,0,y,.21,.02);
 const sash=new THREE.Group();sash.name='sliding-window-sash';windowGroup.add(sash);box(sash,cream,.06,1.75,.16,0,0,.27,.01);box(sash,cream,2.5,.06,.16,0,-.05,.27,.01);box(windowGroup,wood,2.9,.12,.55,0,-1.01,.37,.03);
 const curtain=group('soft-curtains');curtain.position.copy(windowGroup.position);
 for(const side of[-1,1]){for(let i=0;i<5;i++)cylinder(curtain,i%2?'#c3d0ad':'#e2e5c5',.075,.095,1.96,side*(1.37+i*.055),-.01,.35);box(curtain,gold,.35,.11,.19,side*1.48,-.3,.41,.025);}
 const rod=cylinder(curtain,trim,.035,.035,3.6,0,1.08,.37);rod.rotation.z=Math.PI/2;ball(curtain,gold,-1.85,1.08,.37,.09);ball(curtain,gold,1.85,1.08,.37,.09);
 const door=group('front-door','walk');door.position.set(2.95,1.43,-2.48);
 box(door,trim,1.6,2.94,.2,0,0,0,.045);box(door,'#c79962',1.35,2.7,.23,0,-.035,.13,.05);
 for(const y of[-.55,.5])box(door,'#bf8f57',1.05,.9,.07,0,y,.28,.04);
 const knob=ball(door,gold,.47,-.02,.35,.075);knob.material=mat(gold,{metalness:.7,roughness:.3});box(door,'#e5d6a6',.46,.24,.045,0,.7,.34,.03);
 const couch=group('companion-sofa');couch.position.set(0,0,-.35);
 for(const x of[-2.2,2.2])for(const z of[-.63,.57])box(couch,trim,.14,.43,.14,x,.19,z,.025);
 box(couch,darkGreen,5.1,.47,1.7,0,.52,0,.13);box(couch,green,4.9,1.34,.4,0,1.15,-.68,.15);
 for(const x of[-1.17,1.17]){box(couch,'#a4c5a2',2.22,.28,1.34,x,.86,.08,.12);box(couch,'#83b096',2.12,.87,.26,x,1.33,-.42,.12);}
 for(const x of[-2.55,2.55])box(couch,darkGreen,.34,.77,1.72,x,.85,.02,.14);
 const rug=group('woven-rug');box(rug,'#a45c49',5.25,.035,2.8,0,.025,1.2,.1);box(rug,'#ead5ad',4.92,.025,2.47,0,.05,1.2,.08);box(rug,'#6f9c8b',4.53,.018,2.08,0,.068,1.2,.07);
 for(let i=0;i<22;i++)for(const side of[-1,1])box(rug,'#dfc28d',.02,.02,.12,(i-10.5)*.23,.06,1.2+side*1.45,.004);
 const table=group('tea-table');table.position.set(0,0,1.55);
 box(table,'#b98a54',2.35,.16,1.08,0,.61,0,.12);for(const x of[-.9,.9])for(const z of[-.31,.31])box(table,trim,.1,.55,.1,x,.28,z,.025);
 const coffees=[];for(const x of[-.55,.55]){const coffee=new THREE.Group();coffee.name=x<0?'companion-coffee':'guide-coffee';coffee.userData.homeAction='coffee';coffee.position.x=x;table.add(coffee);cylinder(coffee,'#ece4c4',.17,.14,.19,0,.79,0);cylinder(coffee,'#805638',.137,.137,.007,0,.893,0);const handle=mesh(new THREE.TorusGeometry(.085,.026,8,16),mat('#ece4c4'),coffee,.18,.8,0);handle.rotation.y=Math.PI/2;const art=new THREE.Group();art.name='latte-art';art.position.y=.899;art.rotation.x=-Math.PI/2;art.visible=false;coffee.add(art);coffees.push({coffee,art,pattern:-1,start:null,nextChangeAt:null});}
 box(table,'#718f84',.35,.045,.47,0,.72,.1,.02);box(table,'#e9dfb5',.3,.03,.42,0,.75,.1,.01);
 const side=group('keepsake-cabinet','cabinet');side.position.set(3.12,0,.28);box(side,wood,1.05,.84,.9,0,.43,0,.045);box(side,'#dfc49a',1.15,.1,1,0,.9,0,.05);for(const x of[-.26,.26]){box(side,'#c09260',.43,.53,.06,x,.46,.48,.02);ball(side,gold,x,.45,.53,.035);}
 const lamp=group('warm-reading-lamp','lamp');lamp.position.set(3.12,0,.28);cylinder(lamp,trim,.21,.24,.055,0,1,0);cylinder(lamp,gold,.027,.027,.65,0,1.3,0);const lampShade=cylinder(lamp,'#8796aa',.22,.38,.39,0,1.71,0);lampShade.material=new THREE.MeshBasicMaterial({color:'#8796aa',toneMapped:false});const bulb=ball(lamp,'#ffe1a3',0,1.63,0,.1);bulb.material=new THREE.MeshBasicMaterial({color:'#687482',toneMapped:false});const lampLight=new THREE.PointLight(0xffb449,2.8,4);scene.add(lampLight);lampLight.position.set(3.1,1.6,.3);
 const glowPixels=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,r=Math.hypot((x-31.5)/31.5,(y-31.5)/31.5);glowPixels[i]=glowPixels[i+1]=glowPixels[i+2]=255;glowPixels[i+3]=Math.round(Math.max(0,1-r)**2*255);}const lampGlowTexture=new THREE.DataTexture(glowPixels,64,64);lampGlowTexture.needsUpdate=true;textures.push(lampGlowTexture);
 const lampGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:lampGlowTexture,color:'#ffb33e',transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));lampGlow.name='lamp-warm-glow';lampGlow.position.set(0,1.7,0);lampGlow.scale.set(1.4,1.3,1);lampGlow.raycast=()=>{};lamp.add(lampGlow);
 const tableGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.4),new THREE.MeshBasicMaterial({map:lampGlowTexture,color:'#ffb13c',transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));tableGlow.name='lamp-table-light';tableGlow.position.set(0,.96,.04);tableGlow.rotation.x=-Math.PI/2;tableGlow.raycast=()=>{};lamp.add(tableGlow);
 function setLampLit(lit){lamp.userData.lit=lit;lampShade.material.color.set(lit?'#ffc45b':'#8796aa');bulb.material.color.set(lit?'#fff1a8':'#687482');lampLight.intensity=lit?2.8:0;lampGlow.visible=tableGlow.visible=lit;}setLampLit(false);
 function plant(x,z,scale=1){const p=group('leafy-houseplant');p.position.set(x,0,z);p.scale.setScalar(scale);cylinder(p,'#c18a63',.26,.2,.45,0,.24,0);cylinder(p,'#604e38',.235,.235,.03,0,.47,0);for(let i=0;i<8;i++){const a=i*2.4,stem=cylinder(p,'#6c9662',.012,.016,.55,Math.cos(a)*.08,.7,Math.sin(a)*.08);stem.rotation.z=Math.sin(a)*.2;const leaf=ball(p,i%2?'#739e64':'#93b47b',Math.cos(a)*.24,.75+(i%3)*.13,Math.sin(a)*.18,.12,.26,.07);leaf.rotation.z=Math.cos(a)*.6;leaf.rotation.y=a;}return p;}
 const plants=[plant(-3.34,1.4,1.25),plant(-3.35,-1.25,.85)];for(const p of plants){p.userData.homeAction='plant';p.userData.swayStart=null;}
 const shelf=group('tournament-medal-shelves','trophies');shelf.position.set(.35,2.72,-2.42);const trophies=[];let trophyFlash=null;
 for(const y of[-.33,.3])box(shelf,wood,2.2,.08,.5,0,y-.16,.25,.025);
 const cupIds=['rookie','green','city','sky','river','grand'];for(let i=0;i<6;i++){const g=new THREE.Group();g.position.set((i%3-1)*.66,i<3?-.25:.38,.25);shelf.add(g);const m=mat('#d9c789',{metalness:.55,roughness:.35}).clone();cylinder(g,'#655d45',.13,.16,.08,0,-.03,0);const stem=mesh(new THREE.CylinderGeometry(.035,.05,.13,12),m,g,0,.055,0),cup=mesh(new THREE.CylinderGeometry(.13,.06,.16,18),m,g,0,.17,0);for(const side of[-1,1]){const handle=mesh(new THREE.TorusGeometry(.07,.018,6,12),m,g,side*.13,.17,0);handle.rotation.y=Math.PI/2;}trophies.push({g,material:m,id:cupIds[i]});}
 const glintShape=new THREE.Shape();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?.023:.16,x=Math.sin(a)*r,y=Math.cos(a)*r;if(!i)glintShape.moveTo(x,y);else glintShape.lineTo(x,y);}glintShape.closePath();const glintGeometry=new THREE.ShapeGeometry(glintShape),glintMaterial=new THREE.MeshBasicMaterial({color:'#fff6b7',transparent:true,opacity:.95,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}),medalGlints=[];for(const row of trophies){const glint=new THREE.Mesh(glintGeometry,glintMaterial);glint.name='medal-glint-'+row.id;glint.position.copy(row.g.position).add(new THREE.Vector3(.08,.24,.16));glint.visible=false;glint.raycast=()=>{};shelf.add(glint);medalGlints.push(glint);}
 const clock=group('wall-clock','clock');clock.position.set(-4.08,2.85,.1);clock.rotation.y=Math.PI/2;
 const ring=cylinder(clock,wood,.36,.36,.1,0,0,0);ring.rotation.x=Math.PI/2;const dial=cylinder(clock,cream,.31,.31,.018,0,0,.065);dial.rotation.x=Math.PI/2;
 for(let i=0;i<12;i++)ball(clock,i%3?'#8c876a':gold,Math.sin(i*Math.PI/6)*.25,Math.cos(i*Math.PI/6)*.25,.09,i%3?.012:.022);
 const hourHand=new THREE.Group(),minuteHand=new THREE.Group(),secondHand=new THREE.Group();hourHand.name='home-clock-hour';minuteHand.name='home-clock-minute';secondHand.name='home-clock-second';clock.add(hourHand,minuteHand,secondHand);box(hourHand,trim,.025,.18,.025,0,.065,.105,.004);box(minuteHand,trim,.017,.25,.02,0,.1,.12,.004);box(secondHand,'#ad674b',.009,.28,.013,0,.1,.135,.002);ball(clock,gold,0,0,.15,.028);
 const frame=group('adventure-noticeboard','sideQuest');frame.position.set(-1.85,1,-2.32);box(frame,wood,.75,.6,.09,0,0,0,.03);box(frame,'#f3e9ba',.62,.46,.04,0,0,.07,.015);for(let i=0;i<3;i++)box(frame,'#9d9e74',.35,.015,.01,0,.12-i*.095,.1,.002);
 const hemi=new THREE.HemisphereLight(0xfff8e9,0xc0b291,1.6);scene.add(hemi);const key=new THREE.DirectionalLight(0xffefd3,2.6);key.position.set(-3,7,6);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:24});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.0004;key.shadow.normalBias=.025;scene.add(key);
 const faceLight=new THREE.DirectionalLight(0xfffbef,1.65);faceLight.position.set(3,3.5,8);scene.add(faceLight);
 let actorKey='',lastSkyTime=-Infinity,lastFrameTime=null,reactionActor=null;
 const reactionEffect=group('home-touch-sparkles');reactionEffect.visible=false;
 const sparkShape=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,r=i%2?.028:.065,x=Math.sin(a)*r,y=Math.cos(a)*r;if(i===0)sparkShape.moveTo(x,y);else sparkShape.lineTo(x,y);}sparkShape.closePath();
 const heartShape=new THREE.Shape();heartShape.moveTo(0,-.055);heartShape.bezierCurveTo(-.13,.015,-.065,.105,0,.045);heartShape.bezierCurveTo(.065,.105,.13,.015,0,-.055);
 const sparkGeometry=new THREE.ExtrudeGeometry(sparkShape,{depth:.012,bevelEnabled:false}),heartGeometry=new THREE.ExtrudeGeometry(heartShape,{depth:.015,bevelEnabled:false}),sparkMaterial=new THREE.MeshBasicMaterial({color:'#ffe194',transparent:true,depthWrite:false}),heartMaterial=new THREE.MeshBasicMaterial({color:'#ffa5be',transparent:true,depthWrite:false});
 for(let i=0;i<6;i++)mesh(sparkGeometry,sparkMaterial,reactionEffect);
 for(const row of coffees){const patterns=[];for(const name of['seharune','heart','star']){const g=new THREE.Group();g.name=name;g.visible=false;row.art.add(g);patterns.push(g);}const cream=mat('#fff0cc',{emissive:'#fff0cc',emissiveIntensity:.12}),cocoa=mat('#68412e'),rose=mat('#a95e40');const disk=(p,m,x,y,r,sx=1,sy=1,z=0)=>{const o=mesh(new THREE.CircleGeometry(r,24),m,p,x,y,z);o.scale.set(sx,sy,1);return o;};
  const face=patterns[0];disk(face,cream,0,.004,.092,1,.96);for(const side of[-1,1]){disk(face,cocoa,side*.033,.016,.012,1,1,.001);disk(face,rose,side*.054,-.012,.008,1,.55,.001);}disk(face,cocoa,0,-.022,.014,1,.5,.002);const scarf=mesh(new THREE.PlaneGeometry(.13,.013),rose,face,0,-.063,.002);scarf.rotation.z=-.08;disk(face,cream,-.025,.068,.026,1,.6,.001);
  const heart=mesh(new THREE.ShapeGeometry(heartShape),cream,patterns[1]);heart.scale.setScalar(1.5);const star=mesh(new THREE.ShapeGeometry(sparkShape),cream,patterns[2]);star.scale.setScalar(1.5);row.art.userData.designs=patterns.map(g=>g.name);row.art.userData.patterns=patterns;changeLatteDesign(row,null);
 }
 function randomUnit(){return Math.max(0,Math.min(.999999999,Number(readRandom())||0));}
 function changeLatteDesign(row,time){
  const designs=row.art.userData.designs;let pick=Math.floor(randomUnit()*(row.pattern<0?designs.length:designs.length-1));if(row.pattern>=0&&pick>=row.pattern)pick++;
  row.pattern=pick;row.art.visible=true;row.art.userData.patterns.forEach((g,i)=>g.visible=i===pick);row.art.userData.design=designs[pick];row.start=time;row.art.scale.setScalar(time===null?1:.05);
 }
 function focus(name,point,offset){focusName=name;lookGoal.copy(point);cameraGoal.copy(point).add(offset);cameraTransition=true;if(name==='window')windowEvents.setView(cameraGoal,lookGoal,camera.aspect);cullOutside();}
 function feedback(text,kind){onFeedback({text,kind,focus:focusName});}
 function interact(object){const action=object.userData.homeAction;if(action==='cabinet')return true;let point,offset,hold=1500;
  if(action==='window'){interiorSequence=null;focus('window',new THREE.Vector3(-4,-1.7,-40),new THREE.Vector3(1.65,4.35,38.6));feedback('窓の外を眺めています。','window');return true;}
  if(action==='lamp'){point=[3.12,1.55,.28];offset=[-.55,.4,2.1];}
  else if(action==='coffee'){point=[object.position.x,.90,1.55];offset=[.18,.90,.92];hold=1700;}
  else if(action==='clock'){point=[-4.08,2.85,.1];offset=[1.65,.12,1.15];hold=1900;}
  else if(action==='trophies'){point=[.35,2.85,-2.1];offset=[.25,.3,2.3];hold=1800;}
  else if(action==='plant'){point=object.position.clone().add(new THREE.Vector3(0,.75,0)).toArray();offset=[.3,.3,2.2];hold=1600;}
  else return false;
  interiorSequence={object,action,phase:'approach',at:lastFrameTime,hold};focus(action,new THREE.Vector3(...point),new THREE.Vector3(...offset));feedback({lamp:'ランプ',coffee:'コーヒー',clock:'時計',trophies:'トロフィー',plant:'観葉植物'}[action],action+'-focus');return true;
 }
 function performInterior(sequence){const{action,object}=sequence;
  if(action==='lamp'){setLampLit(!lamp.userData.lit);feedback(lamp.userData.lit?'ランプをつけたよ':'ランプを消したよ','lamp');}
  else if(action==='coffee'){const row=coffees.find(r=>r.coffee===object);feedback(['セハルネのラテアート！','ハートのラテアート！','星のラテアート！'][row.pattern],'coffee');}
  else if(action==='clock')feedback('いまの日本時間だよ','clock');
  else if(action==='trophies'){trophyFlash=lastFrameTime;feedback(trophies.some(row=>row.g.userData.earned)?'キラン！ 大会の思い出だね':'大会で勝ったトロフィーを飾れるよ','trophies');}
  else if(action==='plant'){object.userData.swayStart=lastFrameTime;feedback('葉っぱがゆらゆら♪','plant');}
 }
 function disposeModel(model){Characters.disposeMatureCharacterModel(model);}
 // Sitting belongs to this room only. Keep the canonical running model intact.
 function sit(model){
  const body=model.userData.body,feet=model.userData.feet||[];
  if(!feet.length)return;
  const bounds=new THREE.Box3().setFromObject(body),size=bounds.getSize(new THREE.Vector3()),probe=new THREE.Raycaster();
  for(const foot of feet){
   foot.geometry.computeBoundingBox();const dimensions=foot.geometry.boundingBox.getSize(new THREE.Vector3()).multiply(foot.scale);let contact;
   // Attach the original oval foot to the actual low front surface, not the
   // body's widest bounding plane. Its rear stays inside the body: no new limbs.
   for(let i=0;i<5&&!contact;i++){
    const y=bounds.min.y+Math.max(dimensions.y*.8,size.y*.07)+size.y*.035*i;
    probe.set(new THREE.Vector3(foot.position.x,y,bounds.max.z+size.z+1),new THREE.Vector3(0,0,-1));contact=probe.intersectObject(body,false)[0]?.point;
   }
   if(!contact)throw Error('Cannot attach seated foot to body: '+model.userData.characterId);
   foot.rotation.x=-.25;foot.position.y=contact.y;foot.position.z=contact.z+dimensions.z*.08;
   foot.userData.homeBodyContact=contact.toArray();
  }
  model.userData.homePose='seated';
 }
 function updateActors(data){const k=JSON.stringify([data.id,data.handColor,data.footColor]);if(actorKey===k)return;actorKey=k;reactionActor=null;reactionEffect.visible=false;for(const row of actors){scene.remove(row.model);disposeModel(row.model);}actors.length=0;
  for(const spec of[{id:data.id,x:-1.18,action:'character',custom:true},{id:Characters.WHITE_MICHI_ROAD_SABER_REN_ID,x:1.18,action:'character'}]){
   const model=buildCharacter(THREE,Characters,spec.id,spec.custom?{handColor:data.handColor,footColor:data.footColor}:{});model.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
   sit(model);model.updateMatrixWorld(true);bounds.setFromObject(model);bounds.getCenter(center);
   const stage=model.userData.growthStage,desired=stage==='タネ期'?.96:stage==='新芽期'?1.28:stage==='青葉期'?1.48:1.7,scale=Math.min(desired/size.y,1.95/size.x);model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);model.updateMatrixWorld(true);
   const bodyBounds=new THREE.Box3().setFromObject(model.userData.body);model.position.x+=spec.x;model.position.y+=1.05-bodyBounds.min.y;model.position.z+=.06;const facing=.16+(spec.custom?.30:-.30);model.rotation.y=facing;
   model.userData.homeAction=spec.action;model.userData.homeReaction={active:false,count:0,kind:null};scene.add(model);const eyes=(model.userData.faceFeatures||[]).map(part=>({part,y:part.scale.y})),hands=(model.userData.hands||[]).map(part=>({part,position:part.position.clone(),rotation:part.rotation.clone()}));actors.push({model,eyes,hands,facing,baseScale:model.scale.clone(),baseY:model.position.y,bodyHeight:size.y,reaction:null,owner:spec.custom?'companion':'guide',head:new THREE.Vector3(center.x,bounds.max.y+size.y*.05,center.z),feet:new THREE.Vector3(center.x,bounds.min.y-size.y*.065,center.z)});
  }
 }
 function updateTime(now){
  const japan=homeJapanTime(now);hourHand.rotation.z=japan.hourAngle;minuteHand.rotation.z=japan.minuteAngle;secondHand.rotation.z=japan.secondAngle;clock.userData.japanTime={hour:japan.hour,minute:japan.minute,second:japan.second};
  if(Math.abs(now-lastSkyTime)<30000)return;lastSkyTime=now;
  const sky=homeClockSky(now),night=1-sky.daylight;scene.userData.skyReference='東京基準';scene.userData.skyTimestamp=now;
  liveSky.top.value.set('#77b4d4').lerp(new THREE.Color('#030b1c'),night).lerp(new THREE.Color('#9b8290'),sky.dusk*.35);liveSky.horizon.value.set('#dae6dc').lerp(new THREE.Color('#243a4d'),night).lerp(new THREE.Color('#edbd9e'),sky.dusk*.75);
  for(const row of outdoorTint)row.material.color.copy(row.base).multiplyScalar(1-night*.22);
  residential.updateNight(night,exteriorMaterial);outdoorFog.color.set('#c7d7dd').lerp(new THREE.Color('#203249'),night);outdoorFog.density=.0025+night*.0035;
  factory.updateNight(night,exteriorMaterial);exteriorMaterial(townGlow).opacity=night*.32;exteriorMaterial(roadGlow).opacity=night*.28;exteriorMaterial(streetBulb).color.set('#ffe2ac').multiplyScalar(.25+night*1.2);
  for(const[orb,position]of[[sun,sky.sun],[moon,sky.moon]]){orb.position.set(position.x*95,3+position.y*95,position.z*95);orb.visible=position.altitude>-.8;orb.userData.altitude=position.altitude;orb.userData.azimuth=position.azimuth;}
  sun.material.color.set('#ffe3a6');moon.material.color.set('#e1e8df').multiplyScalar(.4+.6*sky.moonFraction);hemi.intensity=1.18+sky.daylight*.42;faceLight.intensity=1.8-sky.daylight*.15;
  outsideHemi.color.set('#dceeff').lerp(new THREE.Color('#a5c6ef'),night);outsideHemi.groundColor.set('#717e63').lerp(new THREE.Color('#243b58'),night);outsideHemi.intensity=1.5-sky.daylight*.2;outsideSun.intensity=sky.daylight*2.5;outsideSun.position.copy(outsideSun.target.position).add(new THREE.Vector3(sky.sun.x,Math.max(.05,sky.sun.y),sky.sun.z).multiplyScalar(55));outsideSun.shadow.needsUpdate=true;
  for(const row of clouds){row.cloud.traverse(part=>{if(part.isMesh)part.material.color.set('#f2f4ee').lerp(new THREE.Color('#58738b'),night);});}
 }
 const capsuleRooms=createHomeCapsuleRooms(THREE,Characters,buildCharacter,{scene,slots:globalThis.ImasoraHomeDecor.SLOTS,onAction,documentTarget:doc});
 let decorRoom='home',decorTab='';
 function decorView(){const gacha=decorTab==='gacha',point=new THREE.Vector3(0,gacha?1.9:1.35,gacha?12:9.4),distance=gacha?Math.max(5.4,4.8/(2*Math.tan(THREE.MathUtils.degToRad(18))*camera.aspect)):Math.max(10.5,9/(2*Math.tan(THREE.MathUtils.degToRad(18))*camera.aspect));focus('decor-extra',point,new THREE.Vector3(0,gacha?1:3.7,-distance));}
 function update(data){if(disposed)return;updateActors(data);capsuleRooms.update(data);const roomChanged=decorRoom!==(data.room||'home');if(roomChanged||decorTab!==(data.decorTab||'')){decorRoom=data.room||'home';decorTab=data.decorTab||'';interiorSequence=null;if(decorRoom==='extra')decorView();else if(focusName==='decor-extra')reset(viewWidth,viewHeight);if(roomChanged){camera.position.copy(cameraGoal);lookTarget.copy(lookGoal);camera.lookAt(lookTarget);cameraTransition=false;}}for(const row of trophies){const has=data.medals.includes(row.id);row.material.color.set(has?'#d8ad45':'#a7ada0');row.material.metalness=has?.65:.08;row.g.userData.earned=has;row.g.children.forEach((part,index)=>part.visible=index===0||has);}updateTime(readClock());}
 function react(row){const info=row.model.userData.homeReaction,kind=['wave','nod','wiggle','happy'][info.count%4];info.count++;info.kind=kind;info.active=true;row.reaction={kind,start:lastFrameTime,duration:1500};reactionActor=row;reactionEffect.visible=true;feedback([row.hands.length?'手を振ってくれたよ！':'楽しそうにゆれたよ！','うなずいてくれたよ！','ごきげんにゆらゆら♪','うれしそう！'][info.count%4===0?3:info.count%4-1],'monster');for(let i=0;i<reactionEffect.children.length;i++){const heart=kind==='happy'&&i%2===0;reactionEffect.children[i].geometry=heart?heartGeometry:sparkGeometry;reactionEffect.children[i].material=heart?heartMaterial:sparkMaterial;}}
 function frameAt(time,reducedMotion=false){capsuleRooms.frameAt(time,reducedMotion);
  const dt=lastFrameTime===null?16:Math.max(0,Math.min(60,time-lastFrameTime));lastFrameTime=time;updateTime(readClock());factory.frameAt(time,exteriorMaterial);windowEvents.frameAt(time,{now:readClock(),active:focusName==='window',reducedMotion});sash.position.x+=((focusName==='window'?-2.7:0)-sash.position.x)*(reducedMotion?1:1-Math.exp(-dt/180));const close=(reducedMotion?900:time)%5200<125;
  if(cameraTransition){const alpha=reducedMotion?1:1-Math.exp(-dt/155);camera.position.lerp(cameraGoal,alpha);lookTarget.lerp(lookGoal,alpha);camera.fov+=((focusName==='window'?48:36)-camera.fov)*alpha;camera.updateProjectionMatrix();camera.lookAt(lookTarget);cullOutside();if(camera.position.distanceToSquared(cameraGoal)+lookTarget.distanceToSquared(lookGoal)<.000001)cameraTransition=false;}
  if(interiorSequence){const seq=interiorSequence;if(seq.at===null)seq.at=time;const elapsed=time-seq.at;if(seq.phase==='approach'&&elapsed>=600&&(!cameraTransition||camera.position.distanceToSquared(cameraGoal)<.02||elapsed>=1200)){seq.phase='display';seq.at=time;performInterior(seq);}else if(seq.phase==='display'&&elapsed>=seq.hold){seq.phase='return';seq.at=time;focusName='';cameraGoal.copy(homeView(viewWidth,viewHeight));lookGoal.copy(target);cameraTransition=true;}else if(seq.phase==='return'&&!cameraTransition)interiorSequence=null;}
  for(const row of coffees){if(row.nextChangeAt===null)row.nextChangeAt=time+20000+randomUnit()*15000;else if(time>=row.nextChangeAt&&interiorSequence?.action!=='coffee'){changeLatteDesign(row,time);row.nextChangeAt=time+20000+randomUnit()*15000;}}
  for(const row of coffees)if(row.start!==null){const p=Math.min(1,Math.max(0,(time-row.start)/650));row.art.scale.setScalar(reducedMotion?1:.05+.95*Math.sin(p*Math.PI/2));if(p===1)row.start=null;}
  for(const plant of plants)if(plant.userData.swayStart!==null){const p=Math.min(1,Math.max(0,(time-plant.userData.swayStart)/1600));plant.rotation.z=reducedMotion||p===1?0:Math.sin(p*Math.PI*6)*Math.sin(p*Math.PI)*.07;if(p===1)plant.userData.swayStart=null;}
  if(trophyFlash!==null){const p=Math.min(1,Math.max(0,(time-trophyFlash)/1800));for(const[index,row]of trophies.entries()){row.material.emissive.set('#f4ce72');row.material.emissiveIntensity=p===1?0:(row.g.userData.earned?1:.16)*Math.sin(p*Math.PI)*.65;const glint=medalGlints[index],t=(time-trophyFlash-index*120)/720;glint.visible=!!row.g.userData.earned&&t>0&&t<1;glint.scale.setScalar(.2+Math.max(0,Math.sin(t*Math.PI))*1.2);glint.quaternion.copy(camera.quaternion);glint.rotateZ(t*.5);}if(p===1){trophyFlash=null;for(const g of medalGlints)g.visible=false;}}
  for(const row of actors){const model=row.model;model.rotation.x=0;model.rotation.z=0;model.rotation.y=row.facing+(reducedMotion?0:Math.sin(time/4000)*.012);model.scale.copy(row.baseScale);model.position.y=row.baseY;for(const hand of row.hands){hand.part.position.copy(hand.position);hand.part.rotation.copy(hand.rotation);}
   let happy=false;if(row.reaction){if(row.reaction.start===null)row.reaction.start=time;const p=Math.max(0,Math.min(1,(time-row.reaction.start)/row.reaction.duration)),fade=Math.sin(p*Math.PI),wiggle=Math.sin(p*Math.PI*6)*fade;
    happy=row.reaction.kind==='happy'&&p<.8;if(!reducedMotion){switch(row.reaction.kind){case'wave':if(row.hands.length){const hand=row.hands.at(-1);hand.part.position.y+=row.bodyHeight*.10*fade;hand.part.rotation.z+=wiggle*.5;}else{model.rotation.z=wiggle*.055;}break;case'nod':model.rotation.x=Math.sin(p*Math.PI*4)*fade*.075;break;case'wiggle':model.rotation.z=wiggle*.065;model.rotation.y+=wiggle*.07;break;case'happy':model.scale.set(row.baseScale.x*(1+fade*.035),row.baseScale.y*(1-fade*.04),row.baseScale.z*(1+fade*.035));break;}}
    if(p>=1){row.reaction=null;model.userData.homeReaction.active=false;}
   }for(const eye of row.eyes)eye.part.scale.y=eye.y*(close?.2:happy?.45:1);
  }
  if(reactionActor?.reaction){const p=Math.max(0,Math.min(1,(time-reactionActor.reaction.start)/reactionActor.reaction.duration)),head=reactionActor.model.localToWorld(reactionActor.head.clone());reactionEffect.position.copy(head);sparkMaterial.opacity=heartMaterial.opacity=(1-p)*.95;for(let i=0;i<reactionEffect.children.length;i++){const part=reactionEffect.children[i],a=i*Math.PI/3+(reducedMotion?0:p*.6),r=.12+(reducedMotion?0:p*.12);part.position.set(Math.cos(a)*r,.03+(reducedMotion?0:p*.22)+Math.sin(a)*.055,.08);part.rotation.set(0,-.15,reducedMotion?0:p*.4+i);part.scale.setScalar(.7+Math.sin(p*Math.PI)*.25);}}else reactionEffect.visible=false;
 }
 function homeView(width,height){const distance=Math.max(9.3,8.8/(2*Math.tan(THREE.MathUtils.degToRad(18))*(width/height)));return new THREE.Vector3(Math.sin(yaw)*distance,target.y+2.35,Math.cos(yaw)*distance);}
 function fit(width,height){viewWidth=width;viewHeight=height;camera.aspect=width/height;if(decorRoom==='extra')decorView();if(!focusName){cameraGoal.copy(homeView(width,height));lookGoal.copy(target);if(!cameraTransition){camera.fov=36;camera.position.copy(cameraGoal);lookTarget.copy(target);camera.lookAt(target);}}camera.updateProjectionMatrix();if(focusName==='window')windowEvents.setView(cameraGoal,lookGoal,camera.aspect);cullOutside();}
 function orbit(delta,width,height){if(focusName==='window'||decorRoom==='extra')return;interiorSequence=null;focusName='';cameraTransition=false;yaw=Math.max(-.36,Math.min(.48,yaw+delta));fit(width,height);}
 function reset(width,height){if(decorRoom==='extra'){decorView();return;}interiorSequence=null;focusName='';yaw=.16;cameraGoal.copy(homeView(width,height));lookGoal.copy(target);cameraTransition=true;feedback('モンスターや家具にタッチ ✨','reset');}
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const actionParent=object=>{let o=object;while(o&&!o.userData.homeAction)o=o.parent;return o;};
 const visibleSurface=hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return hit.object===aperture||hit.object.material?.colorWrite!==false;};
 function activate(object){const actor=actors.find(row=>row.model===object);if(actor)react(actor);else if(!interact(object))onAction(object.userData.homeAction);return true;}
 function select(x,y){if(interiorSequence)return true;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);pointer.set(x,y);ray.layers.set(decorRoom==='extra'?2:0);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(scene.children,true).find(visibleSurface),direct=hit&&actionParent(hit.object);if(direct)return activate(direct);
  // Small visible props receive a 44px target. Verify visibility at its centre
  // so tapping a wall cannot operate a lamp hidden behind a monster or furniture.
  const candidates=[...coffees.map(row=>({object:row.coffee,point:new THREE.Vector3(row.coffee.position.x,.83,1.55)})),{object:lamp,point:new THREE.Vector3(3.12,1.55,.28)},{object:clock,point:new THREE.Vector3(-4.08,2.85,.15)},...plants.map(p=>({object:p,point:p.position.clone().add(new THREE.Vector3(0,.8,0))}))].map(c=>{const p=c.point.clone().project(camera);return{...c,p,d:Math.hypot((p.x-x)*viewWidth/2,(p.y-y)*viewHeight/2)};}).filter(c=>c.p.z>=-1&&c.p.z<=1&&Math.abs(c.p.x)<1&&Math.abs(c.p.y)<1&&c.d<=22).sort((a,b)=>a.d-b.d);
  for(const c of candidates){ray.setFromCamera(new THREE.Vector2(c.p.x,c.p.y),camera);const front=ray.intersectObjects(scene.children,true).find(visibleSurface);if(front&&actionParent(front.object)===c.object)return activate(c.object);}return false;
 }
 function render(renderer){
  // Camera layers select lights too. Rendering both layers together lets the
  // bright room lighting and furniture shadows spill into the night outside.
  const mask=camera.layers.mask,background=scene.background,fog=scene.fog,autoClear=renderer.autoClear;
  try{renderer.autoClear=false;renderer.clear(true,true,true);camera.layers.set(decorRoom==='extra'?2:0);renderer.render(scene,camera);if(decorRoom!=='extra'){scene.background=null;scene.fog=outdoorFog;camera.layers.set(1);renderer.render(scene,camera);}}
  finally{camera.layers.mask=mask;scene.background=background;scene.fog=fog;renderer.autoClear=autoClear;}
 }
 function dispose(){if(disposed)return;disposed=true;capsuleRooms.dispose();const geos=new Set([sparkGeometry,heartGeometry]),mats=new Set([...materials.values(),...portalMaterials.keys(),sparkMaterial,heartMaterial]);scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m);});for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();key.shadow.dispose();outsideSun.shadow.dispose();scene.clear();actors.length=0;}
 function actorAnchors(width,height){return actors.map(row=>{const point=p=>{const v=p.clone().applyMatrix4(row.model.matrixWorld).project(camera);return{x:(v.x*.5+.5)*width,y:(.5-v.y*.5)*height};};return{owner:row.owner,head:point(row.head),feet:point(row.feet)};});}
 return{scene,camera,update,fit,orbit,reset,select,frameAt,actorAnchors,render,dispose,get actorIds(){return actors.map(a=>a.model.userData.characterId);},get focusedName(){return focusName;}};
}

export function installHomeRoom3D({documentTarget=document,windowTarget=window,loadResources,buildCharacter,makeScene=createHomeRoomScene,onNavigate=null}={}){
 const doc=documentTarget,win=windowTarget;let renderer=null,world=null,host=null,resize=null,intersection=null,inView=true,frame=0,last=0,generation=0,loading=false,closed=false,observer=null,pointer=null,viewWidth=0,viewHeight=0;
 const reduce=win.matchMedia('(prefers-reduced-motion: reduce)');
 const current=()=>doc.querySelector('#companionHome [data-home-room-stage]');
 const permitted=target=>target?.isConnected&&!doc.hidden&&!doc.body.classList.contains('new-opening-active')&&!doc.body.classList.contains('loading-screen-active')&&!doc.body.classList.contains('sky-evolution-open')&&!!target.closest('[data-screen="home"].active');
 function stop(){if(frame)win.cancelAnimationFrame(frame);frame=0;last=0;pointer=null;}
 function release(){generation++;loading=false;stop();resize?.disconnect();resize=null;intersection?.disconnect();intersection=null;inView=true;if(renderer){renderer.domElement.removeEventListener('webglcontextlost',contextLost);renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}world?.dispose();world=renderer=host=null;}
 function fail(target){if(!target?.isConnected)return;target.dataset.state='unavailable';const status=target.querySelector('[data-room-status]');if(status){status.hidden=false;status.textContent='部屋を表示できませんでした。下のボタンから遊べます。';}}
 function contextLost(e){e.preventDefault();const target=host;release();fail(target);}
 function data(target){const d=target.dataset,parse=(key,fallback)=>{try{return JSON.parse(d[key]||'null')??fallback;}catch{return fallback;}};return{id:d.characterId,handColor:d.handColor||'#68c694',footColor:d.footColor||'#8b5a34',medals:parse('medals',[]),hour:Number(d.hour),decor:parse('decor',[]),room:d.decorRoom||'home',edit:d.decorEdit==='true',decorTab:d.decorTab||'',selectedSlot:d.decorSlot||'',preview:parse('decorPreview',null),capsuleEvent:parse('capsuleEvent',null)};}
 function fit(){if(!renderer||!host)return;const r=host.getBoundingClientRect();if(!r.width||!r.height)return;viewWidth=r.width;viewHeight=r.height;renderer.setSize(r.width,r.height,false);world.fit(r.width,r.height);}
 const move=(el,x,y)=>{if(!el?.style)return;const left=Math.round(x)+'px',top=Math.round(y)+'px';if(el.style.left!==left)el.style.left=left;if(el.style.top!==top)el.style.top=top;};
 const speechCache=new WeakMap();
 function drawSpeech(anchor,signature){
  const bubble=doc.querySelector('[data-home-talk="'+anchor.owner+'"]'),wrap=bubble?.parentElement,svg=wrap?.querySelector('[data-home-speech-ink]'),path=svg?.querySelector('[data-home-speech-path]');if(!path)return;
  const key=signature+'|'+viewWidth+'|'+viewHeight+'|'+Math.round(anchor.head.x*2)+'|'+Math.round(anchor.head.y*2);if(speechCache.get(wrap)===key)return;speechCache.set(wrap,key);
  if(!bubble.textContent||bubble.classList.contains('is-waiting')){path.setAttribute('d','');return;}
  const box=wrap.getBoundingClientRect(),stage=host.getBoundingClientRect(),range=doc.createRange();range.selectNodeContents(bubble);const lines=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>({x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height})),target={x:stage.left+anchor.head.x-box.left,y:stage.top+anchor.head.y-box.top},ink=homeSpeechInk(lines,target);
  svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);path.setAttribute('d',ink.d);if(ink.tail){svg.dataset.tailBase=JSON.stringify(ink.tail.base);svg.dataset.tailTip=JSON.stringify(ink.tail.tip);svg.dataset.tailTarget=JSON.stringify(target);}wrap.dataset.inkReady='true';
 }
 function positionLabels(){if(!world.actorAnchors)return;const signature=[...doc.querySelectorAll('[data-home-talk]')].map(e=>e.textContent+'|'+e.classList.contains('is-waiting')).join('/');for(const anchor of world.actorAnchors(viewWidth,viewHeight)){const name=host.querySelector('[data-room-name="'+anchor.owner+'"]');move(name,Math.max(45,Math.min(viewWidth-45,anchor.feet.x)),Math.min(viewHeight-30,anchor.feet.y));drawSpeech(anchor,signature);}}
 function paint(time){frame=0;if(!renderer||!permitted(host)||!inView)return;if(!last||time-last>=1000/24){last=time;world.frameAt(time,reduce.matches);if(world.render)world.render(renderer);else renderer.render(world.scene,world.camera);positionLabels();const focus=world.focusedName||'';if(host.dataset.roomFocus!==focus){host.dataset.roomFocus=focus;const button=host.querySelector('[data-reset-room-view]');if(button){button.title=focus?'部屋へ戻る':'視点を戻す';button.setAttribute('aria-label',button.title);}}}frame=win.requestAnimationFrame(paint);}
 function start(){stop();if(renderer&&permitted(host)&&inView)frame=win.requestAnimationFrame(paint);}
 function bindCanvas(canvas){
  canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientX,drag:false};});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(!pointer.drag&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.3){pointer.drag=true;canvas.setPointerCapture(e.pointerId);}if(pointer.drag){e.preventDefault();const r=host.getBoundingClientRect();world.orbit((e.clientX-pointer.last)*.004,r.width,r.height);pointer.last=e.clientX;}});
  const end=e=>{if(!pointer||pointer.id!==e.pointerId)return;const p=pointer;pointer=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(e.type==='pointerup'&&!p.drag&&Math.hypot(e.clientX-p.x,e.clientY-p.y)<8){const r=canvas.getBoundingClientRect();world.select((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);}};
  for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);canvas.addEventListener('contextmenu',e=>e.preventDefault());
 }
 async function reconcile(){
  if(closed)return;const target=current();if(!permitted(target)){if(renderer||loading)release();return;}
  if(renderer){if(host!==target){host=target;host.prepend(renderer.domElement);resize.disconnect();resize.observe(host);intersection?.disconnect();intersection?.observe(host);fit();}world.update(data(host));host.dataset.state='ready';const status=host.querySelector('[data-room-status]');if(status)status.hidden=true;if(!frame)start();return;}
  if(loading||target.dataset.state==='unavailable')return;loading=true;const ticket=++generation;
  try{const[THREE,Characters]=await loadResources();if(ticket!==generation||!permitted(current())){if(ticket===generation)loading=false;return;}host=current();world=makeScene(THREE,Characters,buildCharacter,{documentTarget:doc,onFeedback:({text,kind})=>{const status=doc.querySelector('[data-room-touch-status]');if(status)status.textContent=text;if(host)host.dataset.touchAction=kind;},onAction:action=>{if(onNavigate){onNavigate(action);return;}const button=[...doc.querySelectorAll('#companionHome [data-home-action]')].find(b=>b.dataset.homeAction===action);button?.click();}});world.update(data(host));
   renderer=new THREE.WebGLRenderer({alpha:false,antialias:true,stencil:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(win.devicePixelRatio||1,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   const canvas=renderer.domElement;canvas.className='home-room-canvas';canvas.setAttribute('aria-label','相棒とセハルネが過ごす3Dの部屋。モンスターや家具にタッチすると反応します。');canvas.setAttribute('role','img');canvas.addEventListener('webglcontextlost',contextLost);bindCanvas(canvas);host.prepend(canvas);host.dataset.state='ready';host.querySelector('[data-room-status]').hidden=true;loading=false;resize=new ResizeObserver(fit);resize.observe(host);intersection=new IntersectionObserver(entries=>{inView=entries.at(-1)?.isIntersecting??true;if(inView)start();else stop();},{rootMargin:'100px'});intersection.observe(host);fit();start();
  }catch(error){const target=host||current();release();fail(target);console.warn('3Dの部屋を表示できませんでした',error);}
 }
 let queued=false;const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;void reconcile();});};
 observer=new MutationObserver(schedule);observer.observe(doc.getElementById('companionHome'),{childList:true,subtree:true,attributes:true,attributeFilter:['data-character-id','data-hand-color','data-foot-color','data-medals','data-hour','data-decor','data-decor-room','data-decor-edit','data-decor-tab','data-decor-slot','data-decor-preview','data-capsule-event']});observer.observe(doc.body,{attributes:true,attributeFilter:['class']});const roomPage=doc.querySelector('[data-screen="home"]');if(roomPage)observer.observe(roomPage,{attributes:true,attributeFilter:['class']});
 doc.addEventListener('visibilitychange',schedule);win.addEventListener('pagehide',e=>{release();if(!e.persisted){closed=true;observer.disconnect();doc.removeEventListener('visibilitychange',schedule);}});win.addEventListener('pageshow',schedule);
 doc.addEventListener('click',e=>{if(e.target.closest?.('[data-reset-room-view]')&&world&&host){const r=host.getBoundingClientRect();world.reset(r.width,r.height);}});schedule();
 return{dispose(){closed=true;observer.disconnect();release();doc.removeEventListener('visibilitychange',schedule);}};
}
