import * as THREE from './three.module.min.js';
import {SOIL_PADS,SOIL_SOLIDS,SOIL_MODES,NORMAL_HEIGHT,supportSoil} from './imasora-construction-mars-soil.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
function soilTexture(){const size=64,data=new Uint8Array(size*size*4);let seed=444;for(let i=0;i<size*size;i++){seed=Math.imul(seed,1664525)+1013904223|0;const grain=(seed>>>24),v=grain<12?140:grain>241?245:185+grain*.17;data[i*4]=data[i*4+1]=data[i*4+2]=v;data[i*4+3]=255;}const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);t.magFilter=THREE.LinearFilter;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;}
function box(parent,name,w,h,d,x,y,z,m){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function label(parent,text,x,y,z,width=84){const g=new THREE.Group();g.name='札：'+text;g.position.set(x,y,z);parent.add(g);if(typeof document==='undefined')return g;const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#f6f6e9';ctx.fillRect(0,0,768,128);ctx.strokeStyle='#9ea995';ctx.lineWidth=6;ctx.strokeRect(3,3,762,122);ctx.fillStyle='#324e4a';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 50px system-ui,sans-serif';ctx.fillText(text,384,64,730);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(width,width/6),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));g.add(plane);return g;}
export function createMarsSoilLab(){
  const root=new THREE.Group(),texture=soilTexture(),earth=mat(0xc9a879,{map:texture}),mars=mat(0x985781,{map:texture}),side=mat(0xc2b998),metal=mat(0x476665,{metalness:.3}),yellow=mat(0xe4b443),floorMat=mat(0xddd5ba,{map:texture}),green=mat(0x7fada0);
  const xs=[-240,-170,-160,-50,-40,40,160,240],zs=[-190,-150,-60,-10,110,170];
  for(let xi=0;xi<xs.length-1;xi++)for(let zi=0;zi<zs.length-1;zi++){const x=(xs[xi]+xs[xi+1])/2,z=(zs[zi]+zs[zi+1])/2;if(SOIL_PADS.some(p=>x>p.minX&&x<p.maxX&&z>p.minZ&&z<p.maxZ))continue;box(root,'実験場の地面',xs[xi+1]-xs[xi],36,zs[zi+1]-zs[zi],x,-18,z,floorMat);}
  const layers={};for(const p of SOIL_PADS){layers[p.id]=[];for(let i=0;i<3;i++)layers[p.id].push(box(root,`${p.id}-layer-${i}`,p.maxX-p.minX,12,p.maxZ-p.minZ,(p.minX+p.maxX)/2,-30+i*12,(p.minZ+p.maxZ)/2,p.id==='earth'?earth:i===2?mars:earth));
    for(const x of[p.minX,p.maxX])box(root,'区画の縁',.8,.07,p.maxZ-p.minZ,x,.035,(p.minZ+p.maxZ)/2,side);
    for(const z of[p.minZ,p.maxZ])box(root,'区画の縁',p.maxX-p.minX,.07,.8,(p.minX+p.maxX)/2,.035,z,side);
  }
  for(const b of SOIL_SOLIDS)box(root,b.id,b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ,(b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2,b.id==='ceiling'?yellow:b.id==='balcony'||b.id.startsWith('step')?green:metal);
  label(root,'普通の土',-100,9,114,84);label(root,'火星土',100,9,114,84);label(root,'頭が当たる天井',-110,58,-100,110);label(root,'跳んで乗れる足場',125,39,-81,114);
  box(root,'踏切ライン',72,.08,1,100,.04,5,yellow);label(root,'ここで奥へジャンプ',100,5,8,75);
  // These signs are fixed in the scene; they never follow the camera.
  for(const [x,z] of[[-28,48],[170,48]]){box(root,'高さのものさし',1.2,66,1.2,x,33,z,metal);for(const h of[NORMAL_HEIGHT,NORMAL_HEIGHT*3]){box(root,'足の高さの目盛',14,.8,1.5,x,h,z,h===NORMAL_HEIGHT?yellow:mars);label(root,h.toFixed(1),x+16,h,z+1,21);}}
  const positions=[];for(let x=-240;x<=240;x+=40)positions.push([x,-190],[x,170]);for(let z=-150;z<170;z+=40)positions.push([-240,z],[240,z]);for(const [x,z] of positions)box(root,'境界柱',2,36,2,x,18,z,metal);
  for(const y of[12,28]){for(const z of[-190,170])box(root,'境界ロープ',480,.7,.7,0,y,z,yellow);for(const x of[-240,240])box(root,'境界ロープ',.7,.7,360,x,y,-10,yellow);}
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(15,40),new THREE.MeshBasicMaterial({color:0x344d47,transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;root.add(shadow);
  const glow=new THREE.Mesh(new THREE.RingGeometry(10,17,48),new THREE.MeshBasicMaterial({color:0xf9b4e4,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide}));glow.rotation.x=-Math.PI/2;root.add(glow);
  const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(.6,5,4),new THREE.MeshBasicMaterial({color:0xf2bfea,transparent:true,opacity:.85}),24);particles.frustumCulled=false;root.add(particles);
  root.userData={layers,earth,mars,shadow,glow,particles,dummy:new THREE.Object3D()};return root;
}
export function updateMarsSoilLab(root,s){const d=root.userData,p=s.player;for(let i=0;i<3;i++)d.layers.mars[i].material=SOIL_MODES[s.mode][i]==='mars-soil'?d.mars:d.earth;
  let floor=0;for(const b of SOIL_SOLIDS)if(p.x>=b.minX&&p.x<=b.maxX&&p.z>=b.minZ&&p.z<=b.maxZ&&b.maxY<=p.y+.01)floor=Math.max(floor,b.maxY);
  d.shadow.position.set(p.x,floor+.12,p.z);d.shadow.material.opacity=.2/(1+Math.max(0,p.y-floor)/70);const active=p.grounded&&supportSoil(s).material==='mars-soil';d.glow.visible=active;d.glow.position.set(p.x,p.y+.14,p.z);d.glow.material.opacity=.45+.15*Math.sin(s.time*3);d.particles.count=active?24:0;
  for(let i=0;i<d.particles.count;i++){const a=i*2.4,r=10+(i%5)*1.7,height=(s.time*7+i*.42)%12;d.dummy.position.set(p.x+Math.cos(a)*r,p.y+height,p.z+Math.sin(a)*r);d.dummy.scale.setScalar((1-height/15)*.8);d.dummy.updateMatrix();d.particles.setMatrixAt(i,d.dummy.matrix);}d.particles.instanceMatrix.needsUpdate=true;
}
