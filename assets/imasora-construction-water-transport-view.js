import * as THREE from './three.module.min.js';
import {createLoader,updateLoaderModel} from './imasora-construction-loader-work-model.js';
import {createWaterLab,updateWaterLab} from './imasora-construction-water-view.js';
import {SOURCE_PORT,RETURN_PORT,TRANSPORT_OBSTACLES,CATCHER,waterNozzle,parcelPosition,transportAvailability} from './imasora-construction-water-transport.js';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
function box(root,x,y,z,w,h,d,m,name=''){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.name=name;root.add(o);return o;}
function tube(root,points,r,m){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),o=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,8,false),m);root.add(o);return o;}
export function createWaterTransportView({embedded=false}={}){
  const root=new THREE.Group(),sand=mat(0xc9c7a9),dark=mat(0x254e52),yellow=mat(0xe8ae38),blue=mat(0x239bb6),cream=mat(0xe8e5c9),glass=mat(0x89d9e3,{transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  if(!embedded){box(root,0,-4.1,0,646,8,506,sand);const ground=new THREE.Mesh(new THREE.PlaneGeometry(640,500),sand);ground.rotation.x=-Math.PI/2;root.add(ground);}
  for(const z of embedded?[251]:[-251,251])box(root,0,9,z,644,18,2,dark);for(const x of[-321,321])box(root,x,9,0,2,18,500,dark);
  if(embedded){box(root,-312,9,-251,18,18,2,dark);box(root,52,9,-251,538,18,2,dark);}
  for(let x=-290;x<300;x+=30)box(root,x,.08,-170,12,.08,.8,cream);for(const x of[-185,-75])box(root,x,.08,-112,.8,.08,100,cream);
  box(root,-260,.08,-190,110,.1,110,mat(0x93bdb0));
  const tank=new THREE.Group();tank.position.set(-130,0,20);root.add(tank);
  box(tank,0,29,0,72,58,54,glass,'source-tank');for(const x of[-35,35])for(const z of[-26,26])box(tank,x,29,z,2,58,2,dark);
  box(tank,0,2,0,72,4,54,dark);box(tank,0,56,0,74,4,56,yellow);
  const sourceWater=box(tank,0,28,0,67,50,49,mat(0x22b4d3,{transparent:true,opacity:.7,emissive:0x12647d,emissiveIntensity:.2}));
  tube(root,[[-130,9,-7],[-130,9,-12]],2,blue);
  const lab=createWaterLab();lab.position.set(168,0,120);root.add(lab);
  // The catch basin is flush with the ground; marked pipe feeds the existing lab reservoir.
  box(root,57,.14,-3,60,.2,30,mat(0x207e9b));
  for(const x of[26,88])box(root,x,1,-3,1,2,32,blue);box(root,57,1,-19,62,2,1,blue);
  tube(root,[[57,2,13],[57,2,42],[57,3,90],[57,15,102]],1.4,blue);
  const loader=createLoader();root.add(loader);const pivot=loader.userData.work.bucketPivot,liner=new THREE.Group();pivot.add(liner);
  const shell=mat(0x448e9e,{metalness:.28}),cap=mat(0xe5eddd,{metalness:.25});
  box(liner,0,-7,5,48,1,11,shell,'sealed-water-base');box(liner,0,3,5,48,1,11,cap,'sealed-water-lid');
  for(const x of[-24,24])box(liner,x,-2,5,1,10,11,shell);for(const z of[0,10])box(liner,0,-2,z,48,10,.6,glass);
  for(const x of[-17,17])box(liner,x,3.6,5,3,.5,10,blue);
  tube(liner,[[0,-4,10],[0,-4,13]],1.6,blue);
  const loadWater=box(liner,0,-2,5,45,9,8,mat(0x31bddb,{transparent:true,opacity:.85,emissive:0x087397,emissiveIntensity:.28}));
  const gauge=box(loader,25,26,8,3,3,1,mat(0x1fc3d6,{emissive:0x1fc3d6,emissiveIntensity:.7}));
  const hose=new THREE.InstancedMesh(new THREE.CylinderGeometry(.9,.9,1,8),mat(0x265c66),12);hose.count=0;root.add(hose);
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1.1,8,6),new THREE.MeshBasicMaterial({color:0x67ddf5}),128);drops.count=0;root.add(drops);
  const preview=new THREE.Mesh(new THREE.RingGeometry(4.4,5.5,32),new THREE.MeshBasicMaterial({color:0xffc168,side:THREE.DoubleSide}));preview.rotation.x=-Math.PI/2;root.add(preview);
  const aim=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(57,4,0),20,0x23bfd7,7,5);root.add(aim);
  root.userData={loader,lab,sourceWater,loadWater,gauge,hose,drops,preview,aim,dummy:new THREE.Object3D()};return root;
}
export function updateWaterTransportView(root,s,dt){
  const d=root.userData;updateLoaderModel(d.loader,s.loader.vehicle,{steps:s.loader.mode==='driving'?0:1,roofTransparent:true,bucket:s.bucket,load:0});
  const f=s.source/768;d.sourceWater.visible=f>0;d.sourceWater.scale.y=f;d.sourceWater.position.y=3+25*f;
  const l=s.load/128;d.loadWater.visible=l>0;d.loadWater.scale.y=l;d.loadWater.position.y=-6.5+4.5*l;d.gauge.material.emissiveIntensity=s.task?1.1:.25;
  updateWaterLab(d.lab,s.water,{selected:'rise',dt,time:s.time});
  d.drops.count=s.air.length;s.air.forEach((p,i)=>{const v=parcelPosition(p);d.dummy.position.set(v.x,v.y,v.z);d.dummy.quaternion.identity();d.dummy.scale.setScalar(1);d.dummy.updateMatrix();d.drops.setMatrixAt(i,d.dummy.matrix);});d.drops.instanceMatrix.needsUpdate=true;
  const filling=['source','returned','unload'].includes(s.task?.type)?s.task.type:s.air.find(p=>p.type!=='pour')?.type;d.hose.count=filling?12:0;
  if(filling){const from=['source','unload'].includes(filling)?SOURCE_PORT:RETURN_PORT,to=waterNozzle(s);const point=t=>new THREE.Vector3(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t+6*Math.sin(t*Math.PI),from.z+(to.z-from.z)*t);
    for(let i=0;i<12;i++){const a=point(i/12),b=point((i+1)/12),v=b.clone().sub(a);d.dummy.position.copy(a).add(b).multiplyScalar(.5);d.dummy.scale.set(1,v.length(),1);d.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());d.dummy.updateMatrix();d.hose.setMatrixAt(i,d.dummy.matrix);}d.hose.instanceMatrix.needsUpdate=true;}
  const a=transportAvailability(s);d.preview.visible=s.loader.mode==='driving'&&s.load>0;d.preview.position.set(a.pour.to.x,.4,a.pour.to.z);d.preview.material.color.set(a.pourable?0x17f4db:0xf49b55);
  d.aim.visible=s.loader.mode==='driving';const p=s.load?RETURN_PORT:SOURCE_PORT;d.aim.position.set(p.x,4,p.z);d.aim.setDirection(new THREE.Vector3(0,-1,0));d.aim.position.y=24+Math.sin(s.time*2)*2;
}
