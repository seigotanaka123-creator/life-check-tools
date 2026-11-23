import * as THREE from './three.module.min.js';

// Floor paint is a single upward-facing surface, not a solid slab. Avoid
// self-shadow and depth competition while retaining occlusion by real objects.
export function createGroundMark(parent,{name,x=0,z=0,width,depth,color=0xffffff,y=.12,map=null}){
  const material=new THREE.MeshBasicMaterial({color,map,transparent:!!map,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),material);
  mark.name=name;mark.rotation.x=-Math.PI/2;mark.position.set(x,y,z);
  mark.castShadow=mark.receiveShadow=false;mark.renderOrder=20;
  mark.userData.groundMark=true;mark.userData.nonCollidable=true;
  parent.add(mark);return mark;
}

// Original, deterministic surface maps; no downloaded textures or new assets.
export function createIndustrialMaterial(color,kind='metal'){
  const size=128,pixels=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,grain=((x*37+y*71+x*y*13)%101)/100,brush=Math.sin(y*2.7)*.035;
    const soil=kind==='soil',concrete=kind==='concrete',v=soil?.62+grain*.32:concrete?.86+grain*.1:.965+grain*.03+brush*.1;
    const r=soil?.9:concrete?.93:kind==='paint'?.67:.43+grain*.035;
    pixels[i]=pixels[i+1]=pixels[i+2]=Math.round(255*v);pixels[i+3]=255;
    rough[i]=rough[i+1]=rough[i+2]=Math.round(255*r);rough[i+3]=255;
  }
  const map=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat),roughnessMap=new THREE.DataTexture(rough,size,size,THREE.RGBAFormat);
  map.colorSpace=THREE.SRGBColorSpace;for(const t of[map,roughnessMap]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);t.needsUpdate=true;}
  const material=new THREE.MeshStandardMaterial({color,map,roughnessMap,bumpMap:map,bumpScale:kind==='soil'?.16:kind==='concrete'?.035:.006,roughness:1,metalness:kind==='metal'?.6:kind==='paint'?.32:0});
  material.name='original-industrial-'+kind;return material;
}

export function createParkingPaintMap(){const w=32,h=128,pixels=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,n=(x*31+y*17+x*y*3)%97,edge=Math.min(x,w-1-x);pixels[i]=pixels[i+1]=pixels[i+2]=235+n%20;pixels[i+3]=edge<2&&n<34?0:edge<3?215:255;}const map=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;return map;}

const unitBox=new THREE.BoxGeometry(1,1,1);
function industrialBox(parent,name,x,y,z,w,h,d,material){const mesh=new THREE.Mesh(unitBox,material);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,name,x,y,z,r,h,material,axis='y',segments=16){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),material);mesh.name=name;mesh.position.set(x,y,z);if(axis==='z')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.z=Math.PI/2;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function boltFace(parent,points,material,r=.24){const bolts=new THREE.InstancedMesh(new THREE.CylinderGeometry(r,r,.16,6),material,points.length),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,0));points.forEach((p,i)=>{matrix.compose(new THREE.Vector3(...p),rotation,new THREE.Vector3(1,1,1));bolts.setMatrixAt(i,matrix);});bolts.name='六角ボルト';bolts.castShadow=true;parent.add(bolts);return bolts;}
function pressedPanel(parent,x,y,w,h,material){const shape=new THREE.Shape(),r=1;shape.moveTo(-w/2+r,-h/2);for(const p of[[w/2-r,-h/2],[w/2,-h/2+r],[w/2,h/2-r],[w/2-r,h/2],[-w/2+r,h/2],[-w/2,h/2-r],[-w/2,-h/2+r]])shape.lineTo(...p);shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:.28,bevelEnabled:true,bevelSize:.55,bevelThickness:.25,bevelSegments:2,curveSegments:1});const mesh=new THREE.Mesh(geometry,material);mesh.name='プレス補強パネル';mesh.position.set(x,y,-26.15);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function valveWheel(parent,name,x,y,z,r,material,axis='y'){const wheel=new THREE.Mesh(new THREE.TorusGeometry(r,.2,8,24),material);wheel.name=name;wheel.position.set(x,y,z);if(axis==='y')wheel.rotation.x=Math.PI/2;else if(axis==='x')wheel.rotation.y=Math.PI/2;wheel.castShadow=wheel.receiveShadow=true;parent.add(wheel);for(const angle of[0,Math.PI/3,Math.PI*2/3]){const spoke=industrialBox(wheel,'ハンドルのスポーク',0,0,0,r*1.9,.22,.22,material);spoke.rotation.z=angle;}return wheel;}
function taperedPanel(parent,name,upper,lower,material){const vertices=[],indices=[];for(const p of[...lower,...upper])vertices.push(...p);for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j+4,j,i,i+4,j+4);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}

// All solid detail remains inside the existing material-store collider.
export function createIndustrialSoilStore(parent,bounds){
  const root=new THREE.Group();root.name='アマネ星土・鋼製ホッパー';root.position.set((bounds.minX+bounds.maxX)/2,bounds.minY,(bounds.minZ+bounds.maxZ)/2);parent.add(root);
  const w=bounds.maxX-bounds.minX,d=bounds.maxZ-bounds.minZ,h=bounds.maxY-bounds.minY,s=w/20,steel=createIndustrialMaterial(0x89999b),paint=createIndustrialMaterial(0x557d79,'paint'),dark=createIndustrialMaterial(0x314747,'paint'),concrete=createIndustrialMaterial(0xa8aaa0,'concrete'),soil=createIndustrialMaterial(0x705067,'soil'),trim=createIndustrialMaterial(0xc6b071,'paint');
  industrialBox(root,'既設コンクリート基礎',0,.7,0,w,1.4,d,concrete);
  for(const x of[-w/2+1.2,w/2-1.2])for(const z of[-d/2+1.2,d/2-1.2]){industrialBox(root,'ホッパー支柱',x,h/2,z,1.1,h-1.6,1.1,steel);industrialBox(root,'支柱のベースプレート',x,1.5,z,2.2,.3,2.2,dark);}
  taperedPanel(root,'折り曲げ鋼板の漏斗',[[ -w/2+1,h-2,-d/2+1],[w/2-1,h-2,-d/2+1],[w/2-1,h-2,d/2-1],[-w/2+1,h-2,d/2-1]],[[ -w*.29,6,-d*.29],[w*.29,6,-d*.29],[w*.29,6,d*.29],[-w*.29,6,d*.29]],paint);
  for(const z of[-d/2+1,d/2-1]){industrialBox(root,'上縁の補強鋼材',0,h-1,z,w-1,1.6,1.25,steel);industrialBox(root,'側板の折り返し',0,h*.63,z*.76,w*.78,.5,.6,dark);}
  for(const x of[-w/2+1,w/2-1])industrialBox(root,'上縁の補強鋼材',x,h-1,0,1.25,1.6,d-1,steel);
  const surface=industrialBox(root,'保管されたアマネ星土',0,h-3.05,0,w-3,.6,d-3,soil);surface.receiveShadow=true;
  const loose=new THREE.Group();loose.name='保管土の粒';root.add(loose);for(let i=0;i<8;i++){const pebble=new THREE.Mesh(new THREE.IcosahedronGeometry(.35+(i%3)*.16,0),soil);pebble.position.set(((i*7)%13-6)*s,h-2.65,((i*11)%17-8)*s);pebble.rotation.set(i*.4,i*.7,i);loose.add(pebble);}
  industrialBox(root,'排出口のスライドゲート',0,6.5,-d*.3,w*.57,4,.6,steel);industrialBox(root,'排出口の安全色',0,8.6,-d*.3-.1,w*.57,.35,.45,trim);
  industrialBox(root,'排出シュートの底',0,4,-d*.35,w*.5,.5,d*.2,dark);for(const x of[-w*.25,w*.25])industrialBox(root,'排出シュートの側板',x,4.8,-d*.35,.4,1.8,d*.2,paint);
  cylinder(root,'ゲート調整軸',w*.31,6.5,-d*.3,.35,2.2,steel,'x');valveWheel(root,'ゲートのハンドル',w*.39,6.5,-d*.3,1,trim,'x');
  const bolts=[];for(const x of[-w*.4,0,w*.4])for(const y of[h-1,h*.64])for(const sign of[-1,1])bolts.push([x,y,sign*(d/2-.8)]);boltFace(root,bolts,steel,.22*s);
  root.userData.visualBounds={...bounds};root.userData.setStock=value=>{surface.visible=loose.visible=Number.isFinite(value)&&value>0;};return root;
}

// The water volume and outlet coordinate retain the transport model's datum.
export function createIndustrialWaterTank(parent){
  const root=new THREE.Group();root.name='給水ステーション・鋼板組立水槽';parent.add(root);
  const steel=createIndustrialMaterial(0xb1babc),paint=createIndustrialMaterial(0x507f86,'paint'),dark=createIndustrialMaterial(0x2e454a,'paint'),concrete=createIndustrialMaterial(0xa7aca5,'concrete'),yellow=createIndustrialMaterial(0xd5ae4f,'paint');
  industrialBox(root,'水槽の基礎',0,1.3,0,72,2.6,54,concrete);for(const x of[-29,29])for(const z of[-20,20])industrialBox(root,'鋼製支持脚',x,3.8,z,5,3,5,dark);
  industrialBox(root,'底板',0,5,0,69,1.5,51,steel);industrialBox(root,'背面の鋼板',0,29,25,68,48,1.4,steel);for(const x of[-34,34])industrialBox(root,'側面の鋼板',x,29,0,1.4,48,51,steel);
  // One real sight-glass strip, rather than a whole transparent toy cube.
  industrialBox(root,'前面下部',0,5.3,-25,68,2.6,1.4,steel);industrialBox(root,'前面上部',0,52.4,-25,68,2.6,1.4,steel);industrialBox(root,'前面の主鋼板',-7,29,-25,54,45,1.4,steel);industrialBox(root,'水位窓の外側鋼板',33,29,-25,2,45,1.4,steel);
  const glass=new THREE.MeshPhysicalMaterial({color:0xc7e4df,transparent:true,opacity:.16,roughness:.13,metalness:0,side:THREE.DoubleSide,depthWrite:false});industrialBox(root,'水位確認用の保護窓',26.5,29,-25.1,11,45,.3,glass);
  for(const x of[-34,-11,12,34])industrialBox(root,'パネル継手',x,29,-25.85,.65,48,.25,paint);for(const y of[6.6,29,51.4])industrialBox(root,'パネル継手',-7,y,-25.85,54,.65,.25,paint);
  for(const x of[-22.5,.5])for(const y of[17.8,40.2])pressedPanel(root,x,y,19.8,18.8,steel);
  for(const x of[-34,34])for(const z of[-25,25])industrialBox(root,'角の補強アングル',x,29,z,1.4,49,1.4,dark);
  industrialBox(root,'上蓋',0,54.8,0,70,2,52,paint);for(const z of[-25,25])industrialBox(root,'上蓋の折り返し',0,56,z,70,1,1,steel);
  cylinder(root,'点検口',0,56.2,1,9,1,steel,'y',32);cylinder(root,'点検口の蓋',0,57,1,8.1,.6,paint,'y',32);industrialBox(root,'点検口の取っ手',0,57.6,1,5,.4,.7,steel);
  const water=industrialBox(root,'source-water',0,28,0,67,50,49,new THREE.MeshPhysicalMaterial({color:0x167d99,roughness:.22,metalness:.05,transparent:true,opacity:.76,depthWrite:false}));water.castShadow=false;
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(65,47),new THREE.MeshPhysicalMaterial({color:0x369fb2,roughness:.17,metalness:.16,transparent:true,opacity:.64,depthWrite:false}));surface.name='水面';surface.rotation.x=-Math.PI/2;surface.position.y=53.05;root.add(surface);
  for(let i=0;i<=10;i++){const y=3+i*5;industrialBox(root,'水位目盛',26.5,y,-25.8,i%5===0?8:4,.22,.22,dark);}
  const level=industrialBox(root,'現在の水位',26.5,53,-26,10,.45,.3,yellow);level.castShadow=false;
  const bolts=[];for(const x of[-32,-13,-9,10])for(const y of[8,17,27,31,41,50])bolts.push([x,y,-26.1]);boltFace(root,bolts,dark,.34);
  // Front outlet enters the already existing pipe, which ends at the saved port.
  cylinder(root,'給水口のフランジ',0,9,-25.9,3.9,1.1,steel,'z',24);cylinder(root,'給水口',0,9,-26.5,2.1,.8,paint,'z',20);cylinder(root,'取水バルブの軸',6,14,-25.4,.6,2.2,steel,'z');valveWheel(root,'取水バルブの輪',6,14,-26.6,2.1,yellow,'z');
  return{root,sourceWater:water,sourceSurface:surface,sourceLevel:level};
}
