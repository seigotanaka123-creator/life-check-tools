import * as THREE from './three.module.min.js';
import {createLoader as createBase,updateLoaderModel as updateBase} from './imasora-construction-loader-model.js';
import {CAPACITY} from './imasora-construction-loader-work.js';
export function createLoader(){
  const root=createBase(),arm=new THREE.Group();arm.name='working-arm';arm.position.set(0,11,11);root.add(arm);root.updateMatrixWorld(true);
  const moving=root.children.filter(o=>['lift-arm','bucket-link','arm-pivot'].includes(o.name));for(const o of moving)arm.attach(o);
  const bucketPivot=new THREE.Group();bucketPivot.name='working-bucket-hinge';bucketPivot.position.set(0,-1,20);arm.add(bucketPivot);root.updateMatrixWorld(true);bucketPivot.attach(root.userData.bucket);
  for(const o of [...root.children])if(['hydraulic-cylinder','hydraulic-piston'].includes(o.name)){root.remove(o);o.geometry.dispose();}
  const casing=new THREE.MeshStandardMaterial({color:0x233638,roughness:.55}),chrome=new THREE.MeshStandardMaterial({color:0xb8c7bd,metalness:.8,roughness:.3}),hydraulics=[];
  for(const x of[-20.5,20.5]){
    const pair=[new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,1,12),casing),new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,1,12),chrome)];
    for(const m of pair){m.castShadow=true;root.add(m);}hydraulics.push({x,pair});
  }
  const soil=new THREE.InstancedMesh(new THREE.BoxGeometry(3.8,3.8,3.8),new THREE.MeshStandardMaterial({color:0x986130,roughness:1}),CAPACITY);soil.name='carried-soil';soil.castShadow=soil.receiveShadow=true;soil.frustumCulled=false;soil.count=0;bucketPivot.add(soil);
  root.userData.work={arm,bucketPivot,soil,hydraulics};return root;
}
const up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();
export function updateLoaderModel(root,vehicle,options={}){
  updateBase(root,vehicle,options);const b=options.bucket||{lift:0,tilt:0},w=root.userData.work;
  w.arm.rotation.x=-b.lift*.85;w.bucketPivot.rotation.x=b.lift*.85+b.tilt;
  const c=Math.cos(b.lift*.85),s=Math.sin(b.lift*.85);
  for(const {x,pair} of w.hydraulics){
    const a=new THREE.Vector3(x,10,13),end=new THREE.Vector3(x,11+8*c+15*s,11-8*s+15*c),direction=end.clone().sub(a),split=a.clone().addScaledVector(direction,.58);
    for(const [i,[from,to]] of [[a,split],[split,end]].entries()){const d=to.clone().sub(from);pair[i].position.copy(from).add(to).multiplyScalar(.5);pair[i].scale.y=d.length();pair[i].quaternion.setFromUnitVectors(up,d.normalize());}
  }
  w.soil.count=options.load||0;
  for(let i=0;i<w.soil.count;i++){const layer=Math.floor(i/24),col=i%12,row=Math.floor(i/12)%2;matrix.makeTranslation((col-5.5)*4,-4.2+layer*4,2.5+row*4);w.soil.setMatrixAt(i,matrix);}
  w.soil.instanceMatrix.needsUpdate=true;
}
