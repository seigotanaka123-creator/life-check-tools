import {DUMP_SOIL} from './imasora-construction-dump-soil.js?v=526';
import * as THREE from './three.module.min.js';
import {measureCharacter} from './imasora-construction-layout.js';
import {DUMP} from './imasora-construction-dump-truck.js?v=526';
import {LOADER} from './imasora-construction-loader-physics.js';
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
function box(parent,name,w,h,d,x,y,z,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
export function createDumpModel(){
 const root=new THREE.Group();root.name='dump-truck';
 const yellow=material(0xf2b840),dark=material(0x243d41),metal=material(0xc1d3d2,{metalness:.7,roughness:.3}),rubber=material(0x233334),soil=material(0xa16e46);
 box(root,'シャーシ',48,5,82,0,7,0,dark);box(root,'キャビン床',56,1.2,36,0,8.5,18,yellow);
 const measurement=measureCharacter(),seatTop=LOADER.floor+measurement.bodyBottom-measurement.footBottom;
 for(const x of[-14,14]){box(root,'座面',24,2,7,x,seatTop-1,10.5,dark);box(root,'背もたれ',24,15,2,x,seatTop+7.5,4.3,dark);}
 const roofMat=material(0xf2b840),roof=box(root,'屋根',58,3,36,0,41.5,18,roofMat);
 for(const x of[-27.5,27.5])for(const z of[2,34])box(root,'キャビン柱',1.6,31,1.6,x,24.5,z,yellow);
 const glass=material(0xa5e2e3,{transparent:true,opacity:.17,depthWrite:false});
 box(root,'前窓',53,22,.3,0,28,34.8,glass);box(root,'後窓',53,19,.3,0,29,1.2,glass);
 box(root,'計器台',53,4,2,0,16,35.5,dark);box(root,'フロント',54,11,5,0,13,38,yellow);
 for(const x of[-21,21])box(root,'ライト',7,3,1,x,18,41,material(0xfff2c8,{emissive:0xffe6a1,emissiveIntensity:.6}));
 const wheel=new THREE.Mesh(new THREE.TorusGeometry(4.3,.55,8,24),dark);wheel.position.set(-14,22,34);wheel.rotation.x=-.4;root.add(wheel);
 const wheels=[];for(const z of[-31,18])for(const side of[-1,1]){
  const pivot=new THREE.Group();pivot.position.set(side*25.5,8.9,z);root.add(pivot);const spin=new THREE.Group();pivot.add(spin);
  const tyre=new THREE.Mesh(new THREE.CylinderGeometry(8.65,8.65,9,24),rubber);tyre.rotation.z=Math.PI/2;tyre.castShadow=true;spin.add(tyre);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(4.6,4.6,9.1,16),metal);hub.rotation.z=Math.PI/2;spin.add(hub);box(spin,'車輪目印',.3,1.4,6,side*4.6,0,0,dark);wheels.push({pivot,spin,front:z>0});
 }
 const steps=[];for(const side of[-1,1]){const group=new THREE.Group();group.position.set(side*25,0,18);root.add(group);for(let i=0;i<3;i++)box(group,'乗降ステップ',8,3,26,side*(11-i*4),1.5+i*3,0,dark);steps.push(group);}
 const pilotSocket=new THREE.Group();pilotSocket.position.set(-14,LOADER.floor-measurement.footBottom,18);root.add(pilotSocket);
 // Local +Z is the cab/front. The bed rises about its rear hinge at Z=-40.
 const bed=new THREE.Group();bed.position.set(0,16,-40);root.add(bed);
 box(bed,'荷台床',54,2,36,0,0,18,yellow);box(bed,'荷台前壁',54,12,2,0,6,36,yellow);
 for(const x of[-27,27])box(bed,'荷台側壁',2,12,38,x,6,18,yellow);
 const gate=new THREE.Group();gate.position.set(0,12,0);bed.add(gate);box(gate,'後部あおり',52,12,1.4,0,-6,0,yellow);
 const cargo=box(bed,'積荷の土',DUMP_SOIL.width,DUMP_SOIL.height,DUMP_SOIL.depth,0,5,18,soil);
 const ram=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,1,12),metal);ram.castShadow=true;root.add(ram);
 const ramBase=new THREE.Vector3(0,8,-15),ramTop=new THREE.Vector3();
 root.userData={wheels,steps,measurement,pilotSocket,roof,roofMat,bed,gate,cargo,ram,ramBase,ramTop,wheel};return root;
}
export function updateDumpModel(root,w,{roofTransparent=false}={}){
 const d=root.userData,v=w.rig.vehicle;root.position.set(v.x,0,v.z);root.rotation.y=v.heading;
 for(const a of d.wheels){a.pivot.rotation.y=v.steering*(a.front?1:-1);a.spin.rotation.x=v.wheelTravel/8.9;}
 for(const a of d.steps)a.visible=w.rig.mode!=='driving';
 if(d.roofMat.transparent!==roofTransparent){d.roofMat.transparent=roofTransparent;d.roofMat.needsUpdate=true;}d.roofMat.opacity=roofTransparent?.13:1;d.roofMat.depthWrite=!roofTransparent;d.roof.castShadow=!roofTransparent;
 d.bed.rotation.x=-w.bed;d.gate.rotation.x=w.bed+Math.min(1.45,w.bed*2);d.cargo.visible=w.load>0;d.cargo.scale.y=w.load/DUMP.capacity;d.cargo.position.y=1+4*w.load/DUMP.capacity;d.wheel.rotation.z=-v.steering*2.8;
 d.ramTop.set(0,16+Math.sin(w.bed)*26,-40+Math.cos(w.bed)*26);d.ram.position.copy(d.ramBase).add(d.ramTop).multiplyScalar(.5);d.ram.scale.y=d.ramBase.distanceTo(d.ramTop);d.ram.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.ramTop.clone().sub(d.ramBase).normalize());
}
