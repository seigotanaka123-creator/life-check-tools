import * as THREE from './three.module.min.js';
import {WATER,DIRECTIONS,waterDirection} from './imasora-construction-water.js?v=442';
import {BODY_SOLIDS,BODY_SOURCE,bodyWaterBox,bodyWaterCenter} from './imasora-construction-water-body.js?v=442';

// All visible guards use the same bounds as the collision model.
export function createWaterBodyLab(){
  const root=new THREE.Group();root.name='water-body-contact-lab';
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
  const box=(bounds,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY,bounds.maxZ-bounds.minZ),material);mesh.position.set((bounds.minX+bounds.maxX)/2,(bounds.minY+bounds.maxY)/2,(bounds.minZ+bounds.maxZ)/2);root.add(mesh);return mesh;};
  box({minX:-476,maxX:476,minY:0,maxY:42,minZ:-361,maxZ:361},mat(0xd3d9c7));
  const grid=new THREE.GridHelper(714,17,0xb9c4ad,0xb9c4ad);grid.position.set(0,42.07,0);root.add(grid);
  const guard=mat(0x81bac2,{transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide}),roof=mat(0xeaba72,{transparent:true,opacity:.26,depthWrite:false}),tank=mat(0x355c64,{transparent:true,opacity:.25,depthWrite:false});
  for(const bounds of BODY_SOLIDS){const isRoof=bounds.name==='固い天井',m=box(bounds,isRoof?roof:bounds.id==='tank'?tank:guard);m.name=bounds.id;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:isRoof?0xa2692c:0x547f85,transparent:true,opacity:.65})));}
  const rails=mat(0x698074);
  for(const x of[-480,480])box({minX:x-4,maxX:x+4,minY:42,maxY:53,minZ:-365,maxZ:365},rails);
  for(const z of[-365,365])box({minX:-484,maxX:484,minY:42,maxY:53,minZ:z-4,maxZ:z+4},rails);
  const source=new THREE.Mesh(new THREE.RingGeometry(25,29,48),new THREE.MeshBasicMaterial({color:0x0e97ae,side:THREE.DoubleSide}));source.rotation.x=-Math.PI/2;source.position.set(BODY_SOURCE.x,42.2,0);root.add(source);
  const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(BODY_SOURCE.x,42.4,70),32,0x0e8296,9,9);root.add(arrow);
  const fluid=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat(0x37c9e8,{emissive:0x086c91,emissiveIntensity:.28,transparent:true,opacity:.36,depthWrite:false}),WATER.total);fluid.count=0;fluid.frustumCulled=false;root.add(fluid);
  const motes=new THREE.InstancedMesh(new THREE.ConeGeometry(2.2,7,6),new THREE.MeshBasicMaterial({color:0xffffff}),WATER.total);motes.count=0;motes.frustumCulled=false;root.add(motes);
  const liquid=box({minX:-450,maxX:-327,minY:43,maxY:195,minZ:-61,maxZ:61},mat(0x2fa7bf,{transparent:true,opacity:.5,depthWrite:false}));
  const direction=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(-285,70,65),52,0x007b9c,13,10);root.add(direction);
  root.userData={fluid,motes,liquid,direction,dummy:new THREE.Object3D()};return root;
}
export function updateWaterBodyLab(root,s,time){
  const {fluid,motes,liquid,direction,dummy}=root.userData;let i=0;
  for(const [k,c] of Object.entries(s.cells)){
    const b=bodyWaterBox(k,c,s);dummy.quaternion.identity();dummy.position.set((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2);dummy.scale.set(b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ);dummy.updateMatrix();fluid.setMatrixAt(i,dummy.matrix);
    const p=bodyWaterCenter(k),dir=DIRECTIONS.find((_,j)=>waterDirection(s,k)&(1<<j))?.v||[0,1,0],vector=new THREE.Vector3(...dir);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector);dummy.position.set(p.x,p.y,p.z).addScaledVector(vector,((time*2.5+i*.19)%1-.5)*32);dummy.scale.setScalar(1);dummy.updateMatrix();motes.setMatrixAt(i++,dummy.matrix);
  }
  fluid.count=i;fluid.instanceMatrix.needsUpdate=true;motes.count=s.running?i:0;motes.instanceMatrix.needsUpdate=true;
  const fill=s.reservoir/WATER.total;liquid.scale.y=fill;liquid.position.y=43+76*fill;liquid.visible=fill>0;
  const v=DIRECTIONS.find((_,j)=>s.directions.rise&(1<<j))?.v||[0,1,0];direction.setDirection(new THREE.Vector3(...v));
}
