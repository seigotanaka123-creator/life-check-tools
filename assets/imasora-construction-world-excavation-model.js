import * as THREE from './three.module.min.js';
import {createExcavator,updateExcavatorModel} from './imasora-construction-excavator-model.js?v=487';
import {FACES} from './imasora-construction-terrain.js';
import {BIN,CELL} from './imasora-construction-excavator.js';
const FACE_TRIANGLES=[0,1,2,0,2,3],SOIL_COLORS=[new THREE.Color(0xaa7847),new THREE.Color(0xbe9159)];
// A walk-through gateway on the south edge; all other edges are fenced.
export const EXCAVATION_FENCES=Object.freeze([
  {x:0,z:250,w:642,d:2},{x:-320,z:0,w:2,d:500},{x:320,z:0,w:2,d:500},
  {x:-296,z:-250,w:48,d:2},{x:66,z:-250,w:508,d:2}
]);
export function createWorldExcavationModel(){
  const root=new THREE.Group();root.name='construction-excavation-yard';
  const soil=new THREE.MeshStandardMaterial({color:0xbe9159,roughness:1}),metal=new THREE.MeshStandardMaterial({color:0x478b92,roughness:.7}),dark=new THREE.MeshStandardMaterial({color:0x465c51,roughness:1}),yellow=new THREE.MeshStandardMaterial({color:0xe7bd55});
  const cube=new THREE.BoxGeometry(1,1,1),box=(x,y,z,w,h,d,m,name)=>{const o=new THREE.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.name=name;o.castShadow=o.receiveShadow=true;root.add(o);return o;};
  box(32,-36,112,128,8,128,dark,'岩盤');
  for(const f of EXCAVATION_FENCES){box(f.x,20,f.z,f.w,40,f.d,dark,'掘削外柵');box(f.x,40,f.z,f.w,2,f.d+1,yellow,'柵の上端');}
  box(BIN.x,1.5,BIN.z,BIN.width,3,BIN.depth,metal,'受け箱底');
  for(const x of[-1,1])box(BIN.x+x*(BIN.width/2-1.5),5,BIN.z,3,10,BIN.depth,metal,'受け箱の縁');
  for(const z of[-1,1])box(BIN.x,5,BIN.z+z*(BIN.depth/2-1.5),BIN.width,10,3,metal,'受け箱の縁');
  // Entry markings lie outside the editable soil: no plane across the tunnel.
  const entry=box(-230,.07,-232,72,.12,34,yellow,'作業区画の出入口');
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle='#264b44';ctx.fillRect(0,0,768,160);ctx.fillStyle='#fff2ca';ctx.font='bold 55px sans-serif';ctx.textAlign='center';ctx.fillText('ショベルカー作業区画',384,98);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(116,24),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(-140,44,-248);sign.rotation.y=Math.PI;root.add(sign);
  const machine=createExcavator();root.add(machine);
  const particles=new THREE.InstancedMesh(new THREE.BoxGeometry(7.8,7.8,7.8),soil,1792),pile=new THREE.InstancedMesh(new THREE.BoxGeometry(6.5,5,6.5),soil,200);
  for(const o of[particles,pile]){o.frustumCulled=false;o.castShadow=o.receiveShadow=true;root.add(o);}
  // Keep the bucket unobstructed: the old floating ring was a debug guide,
  // not a machine part or a collider. Digging remains in the physics module.
  root.userData={machine,particles,pile,entry,texture,terrain:null,terrainSource:null,terrainRevision:-1,binCount:-1,machinePose:null,spoilSource:null,fallingSource:null,matrix:new THREE.Matrix4()};return root;
}
export function updateWorldExcavationModel(root,s,active,roof=false){
  const d=root.userData,v=s.loader.vehicle,a=s.arm,pose=[v.x,v.z,v.heading,v.wheelTravel,a.boom,a.stick,a.slew,a.curl,s.load,!!s.loader.transition,roof,s.bucketStyle,s.digMode];
  if(!d.machinePose||pose.some((v,i)=>v!==d.machinePose[i])){updateExcavatorModel(d.machine,s,{roofTransparent:roof});d.machinePose=pose;}
  // Terrain is copy-on-write in the simulator. A falling particle entering
  // the bin increments revision too, but must NOT rebuild unchanged terrain.
  if(d.terrainSource!==s.terrain){
    d.terrainSource=s.terrain;d.terrainRevision=s.revision;const vertices=[],normals=[],colors=[];
    for(const [x,y,z] of Object.values(s.terrain))for(const f of FACES){const [nx,ny,nz]=f.normal;if(s.terrain[`${x+nx},${y+ny},${z+nz}`])continue;
      const c=SOIL_COLORS[y>=0?1:0],shade=.97+.03*((x*7+z*3+40)%4),r=c.r*shade,g=c.g*shade,b=c.b*shade;
      for(const i of FACE_TRIANGLES){const p=f.vertices[i];vertices.push((x+p[0])*CELL,(y+p[1])*CELL,(z+p[2])*CELL);normals.push(nx,ny,nz);colors.push(r,g,b);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
    if(d.terrain){d.terrain.geometry.dispose();d.terrain.geometry=g;}else{d.terrain=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));d.terrain.castShadow=d.terrain.receiveShadow=true;root.add(d.terrain);}
  }
  if(d.binCount!==s.bin){d.binCount=s.bin;d.pile.count=Math.min(200,s.bin);for(let i=0;i<d.pile.count;i++)d.pile.setMatrixAt(i,d.matrix.makeTranslation(BIN.x+(i%7-3)*7,5+Math.floor(i/35)*5,BIN.z+(Math.floor(i/7)%5-2)*7));d.pile.instanceMatrix.needsUpdate=true;}
  if(d.spoilSource!==s.spoil||d.fallingSource!==s.falling){d.spoilSource=s.spoil;d.fallingSource=s.falling;const pieces=[...s.spoil,...s.falling];d.particles.count=pieces.length;pieces.forEach((p,i)=>d.particles.setMatrixAt(i,d.matrix.makeTranslation(p.x,p.y,p.z)));d.particles.instanceMatrix.needsUpdate=true;}
}
export function disposeWorldExcavationModel(root){
  // Cabin material singletons are shared with other excavators: dispose only
  // this instance's geometry and private terrain/label/particle materials.
  if(!root)return;const geometries=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());root.userData.texture.dispose();
  const materials=new Set();for(const o of root.children)if(o.material)materials.add(o.material);materials.forEach(m=>m.dispose());root.removeFromParent();
}
