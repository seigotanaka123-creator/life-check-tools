import * as THREE from './three.module.min.js';
import {createGroundMark} from './imasora-construction-ground-mark.js?v=120ds';
import {createWaterTruck,updateWaterTruck} from './imasora-construction-water-truck-model.mjs?v=120ey';
import {createWaterBuildView,updateWaterBuildView} from './imasora-construction-water-build-view.mjs?v=120fb';
import {waterBuildLevel} from './imasora-construction-water-build.mjs?v=120fb';
import {createWaterLab,updateWaterLab} from './imasora-construction-water-view.js?v=120ds';
import {SOURCE_PORT,RETURN_PORT,TRANSPORT_OBSTACLES,CATCHER,waterSourcePort,parcelPosition,transportAvailability,waterBuildHoseTarget} from './imasora-construction-water-transport.js?v=120fb';
import {createFieldWaterView,updateFieldWaterView} from './imasora-construction-field-water-view.mjs?v=120ex';
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
function box(root,x,y,z,w,h,d,m,name=''){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.name=name;root.add(o);return o;}
function tube(root,points,r,m){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),o=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,8,false),m);root.add(o);return o;}
export function createWaterTransportView({embedded=false,work=null}={}){
  const root=new THREE.Group(),sand=mat(0xc9c7a9),dark=mat(0x254e52),yellow=mat(0xe8ae38),blue=mat(0x239bb6),cream=mat(0xe8e5c9),glass=mat(0x89d9e3,{transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
  if(!embedded){box(root,0,-4.1,0,646,8,506,sand);const ground=new THREE.Mesh(new THREE.PlaneGeometry(640,500),sand);ground.rotation.x=-Math.PI/2;root.add(ground);}
  for(const z of work?.loader.vehicle.field?[]:embedded?[251]:[-251,251])box(root,0,9,z,644,18,2,dark);for(const x of work?.loader.vehicle.field?[]:[-321,321])box(root,x,9,0,2,18,500,dark);
  if(embedded&&!work?.loader.vehicle.field){box(root,-312,9,-251,18,18,2,dark);box(root,52,9,-251,538,18,2,dark);}
  if(!work?.loader.vehicle.field)for(let x=-290;x<300;x+=30)createGroundMark(root,{name:'給水区画の駐車線',x,z:-170,width:12,depth:.8,color:0xe8e5c9});for(const x of work?.loader.vehicle.field?[]:[-185,-75])createGroundMark(root,{name:'給水区画の駐車線',x,z:-112,width:.8,depth:100,color:0xe8e5c9});
  if(!work?.loader.vehicle.field)createGroundMark(root,{name:'給水区画の待機床',x:-260,z:-190,width:110,depth:110,color:0x93bdb0,y:.13});
  const tank=new THREE.Group();const supply=work?waterSourcePort(work):SOURCE_PORT;tank.position.set(supply.x,0,supply.z+32);root.add(tank);
  box(tank,0,29,0,72,58,54,glass,'source-tank');for(const x of[-35,35])for(const z of[-26,26])box(tank,x,29,z,2,58,2,dark);
  box(tank,0,2,0,72,4,54,dark);box(tank,0,56,0,74,4,56,yellow);
  const sourceWater=box(tank,0,28,0,67,50,49,mat(0x22b4d3,{transparent:true,opacity:.7,emissive:0x12647d,emissiveIntensity:.2}));
  tube(root,[[supply.x,9,supply.z+5],[supply.x,9,supply.z]],2,blue);
  const lab=createWaterLab();lab.position.set(168,0,120);root.add(lab);
  // The catch basin is flush with the ground; marked pipe feeds the existing lab reservoir.
  box(root,57,.14,-3,60,.2,30,mat(0x207e9b));
  for(const x of[26,88])box(root,x,1,-3,1,2,32,blue);box(root,57,1,-19,62,2,1,blue);
  tube(root,[[57,2,13],[57,2,42],[57,3,90],[57,15,102]],1.4,blue);
  const loader=createWaterTruck();root.add(loader);const loadWater=loader.userData.loadWater;
  const gauge=box(loader,26,32,38,2,3,1,mat(0x1fc3d6,{emissive:0x1fc3d6,emissiveIntensity:.7}));
  const builtWater=createWaterBuildView(),buildPreview=createWaterBuildView({preview:true});root.add(builtWater,buildPreview);
  const stream=new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1,1.1,1,8),mat(0x40c9e4),12);stream.visible=false;root.add(stream);
   const hose=new THREE.InstancedMesh(new THREE.CylinderGeometry(.9,.9,1,8),mat(0x265c66),12);hose.count=0;root.add(hose);
  const drops=new THREE.InstancedMesh(new THREE.SphereGeometry(1.1,8,6),new THREE.MeshBasicMaterial({color:0x67ddf5}),128);drops.count=0;root.add(drops);
  const preview=new THREE.Mesh(new THREE.RingGeometry(4.4,5.5,32),new THREE.MeshBasicMaterial({color:0xffc168,side:THREE.DoubleSide}));preview.rotation.x=-Math.PI/2;root.add(preview);
  const aim=new THREE.ArrowHelper(new THREE.Vector3(0,1,0),new THREE.Vector3(57,4,0),20,0x23bfd7,7,5);root.add(aim);
  root.userData={loader,lab,sourceWater,loadWater,gauge,builtWater,buildPreview,stream,hose,drops,preview,aim,dummy:new THREE.Object3D()};return root;
}
export function updateWaterTransportView(root,s,dt,{external=[],heightAt=()=>0,ground=null,terrainRevision}={}){
  const d=root.userData;updateWaterTruck(d.loader,s.loader.vehicle,{steps:s.loader.mode==='driving'?0:1,load:s.load,ground});
  const f=s.source/768;d.sourceWater.visible=f>0;d.sourceWater.scale.y=f;d.sourceWater.position.y=3+25*f;
  d.gauge.material.emissiveIntensity=s.task?1.1:.25;
  if(d.labState!==s.water||s.water.running||d.labAnimating){updateWaterLab(d.lab,s.water,{selected:'rise',dt,time:s.time});d.labState=s.water;d.labAnimating=Math.abs(d.lab.userData.gate.position.y-(s.water.gate?78:93))>.01||[...d.lab.userData.visual].some(([k,v])=>Math.abs(v.q-(s.water.cells[k]?.q??0))>.03);}
  d.drops.count=s.air.length;s.air.forEach((p,i)=>{const v=parcelPosition(p);d.dummy.position.set(v.x,v.y,v.z);d.dummy.quaternion.identity();d.dummy.scale.setScalar(1);d.dummy.updateMatrix();d.drops.setMatrixAt(i,d.dummy.matrix);});if(s.air.length){d.drops.instanceMatrix.clearUpdateRanges();d.drops.instanceMatrix.addUpdateRange(0,s.air.length*16);d.drops.instanceMatrix.needsUpdate=true;}
  const a=transportAvailability(s,external,heightAt),filling=['source','returned','unload','field-return'].includes(s.task?.type)?s.task.type:s.air.find(p=>!['pour','field'].includes(p.type))?.type;d.hose.count=filling&&!a.workIssue?12:0;
  if(filling&&!a.workIssue){const from=['source','unload'].includes(filling)?waterSourcePort(s):filling==='field-return'?(s.pools?.[s.task?.pool]??s.air.find(p=>p.type==='field-return')?.from??a.nozzle):RETURN_PORT,to=a.nozzle;const point=t=>new THREE.Vector3(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t+6*Math.sin(t*Math.PI),from.z+(to.z-from.z)*t);
    for(let i=0;i<12;i++){const a=point(i/12),b=point((i+1)/12),v=b.clone().sub(a);d.dummy.position.copy(a).add(b).multiplyScalar(.5);d.dummy.scale.set(1,v.length(),1);d.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());d.dummy.updateMatrix();d.hose.setMatrixAt(i,d.dummy.matrix);}d.hose.instanceMatrix.needsUpdate=true;}
  updateWaterBuildView(d.builtWater,s.waterBuilds);
  const plan=a.plan,building=['build','build-return'].includes(s.task?.type),b=building?s.waterBuilds?.find(b=>b.id===s.task.build):null;
  d.buildPreview.visible=!!(plan?.ok&&!building&&s.loader.mode==='driving');
  if(d.buildPreview.visible){if(d.previewPlan!==plan.build){d.previewPlan=plan.build;updateWaterBuildView(d.buildPreview,[{...plan.build,q:plan.build.capacity}]);}}
  d.stream.visible=!!b;if(b){const cell=waterBuildHoseTarget(b,a.nozzle,external,heightAt)??b.cells[0],from=new THREE.Vector3(a.nozzle.x,a.nozzle.y,a.nozzle.z),to=new THREE.Vector3(cell.x,cell.y,cell.z);const point=t=>from.clone().lerp(to,t).add(new THREE.Vector3(0,6*Math.sin(t*Math.PI),0));
   for(let i=0;i<12;i++){const p=point(i/12),q=point((i+1)/12),v=q.clone().sub(p);d.dummy.position.copy(p).add(q).multiplyScalar(.5);d.dummy.scale.set(1,v.length(),1);d.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());d.dummy.updateMatrix();d.stream.setMatrixAt(i,d.dummy.matrix);}d.stream.instanceMatrix.needsUpdate=true;
  }
  d.preview.visible=!a.plan&&s.loader.mode==='driving'&&s.load>0&&!a.workIssue&&!a.pourIssue;d.preview.position.set(a.pour.to.x,(a.fieldTarget?.y??0)+.4,a.pour.to.z);d.preview.material.color.set(a.pourable?0x17f4db:0xf49b55);
  d.aim.visible=s.loader.mode==='driving'&&(!s.load||!a.workIssue&&!a.pourIssue);const p=s.load?a.pour.to:a.pool?.[1]??waterSourcePort(s);d.aim.position.set(p.x,4,p.z);d.aim.setDirection(new THREE.Vector3(0,-1,0));d.aim.position.y=(p.y??0)+24+Math.sin(s.time*2)*2;
  if(d.fieldWater||Object.keys(s.pools??{}).length){d.fieldWater??=createFieldWaterView();if(!d.fieldWater.parent)root.add(d.fieldWater);updateFieldWaterView(d.fieldWater,s.pools,heightAt,dt,terrainRevision);}
}
