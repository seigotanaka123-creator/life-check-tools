import * as THREE from './three.module.min.js';
import { measureCharacter } from './imasora-construction-layout.js';
import { LOADER } from './imasora-construction-loader-physics.js';

const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.62,...extra});
function mesh(parent,geometry,material,name,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
function box(parent,w,h,d,x,y,z,material,name){return mesh(parent,new THREE.BoxGeometry(w,h,d),material,name,x,y,z);}
function rounded(parent,w,d,h,x,y,z,material,name,r=3){
  const s=new THREE.Shape(),a=-w/2,b=-d/2;
  s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+d-r);s.quadraticCurveTo(a+w,b+d,a+w-r,b+d);s.lineTo(a+r,b+d);s.quadraticCurveTo(a,b+d,a,b+d-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
  const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:6});g.rotateX(Math.PI/2);g.translate(0,h/2,0);return mesh(parent,g,material,name,x,y,z);
}
function rod(parent,a,b,r,material,name){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),direction=vb.clone().sub(va);const m=mesh(parent,new THREE.CylinderGeometry(r,r,direction.length(),12),material,name);m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return m;}
function beam(parent,a,b,w,d,material,name){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),direction=vb.clone().sub(va);const m=mesh(parent,new THREE.BoxGeometry(w,direction.length(),d),material,name);m.position.copy(va.add(vb).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return m;}

export function createLoader(){
  const root=new THREE.Group();root.name='wheel-loader-01';
  const yellow=mat(0xf1b22e,{metalness:.18}),trim=mat(0x233638),rubber=mat(0x202b2c),treadMat=mat(0x303b3a),steel=mat(0xb8c7bd,{metalness:.76,roughness:.3}),seatMat=mat(0x263734),hubMat=mat(0xe8a323,{metalness:.3});
  const glass=mat(0x9edbdb,{transparent:true,opacity:.18,depthWrite:false,roughness:.18,side:THREE.DoubleSide});
  rounded(root,48,75,4.8,0,6.4,-4,trim,'chassis');
  rounded(root,55,35,1,0,8.5,-8,yellow,'cabin-floor',2);
  rounded(root,48,18,13,0,12.5,-33,yellow,'rounded-engine-cover',4);
  rounded(root,39,12,1.5,0,19.4,-34,trim,'engine-service-panel',2);
  box(root,44,6,1,0,12,-42,trim,'rear-grille');
  for(let i=0;i<11;i++)box(root,1.2,5,.5,(i-5)*3.5,12,-42.6,steel,'grille-slat');
  box(root,50,3,2,0,5.5,-42,trim,'rear-bumper');
  const tail=mat(0xb93627,{emissive:0xb62413,emissiveIntensity:.4});
  for(const x of[-20,20])box(root,5,3,.8,x,16,-42.3,tail,'rear-lamp');
  rod(root,[22,19,-35],[22,32,-35],1.05,trim,'exhaust-stack');
  box(root,3.5,1,3.5,22,32.5,-35,trim,'exhaust-cap');

  const wheels=[];
  for(const z of[-31,18])for(const side of[-1,1]){
    const pivot=new THREE.Group();pivot.position.set(side*25.5,LOADER.wheelRadius,z);root.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);
    const tire=mesh(spin,new THREE.CylinderGeometry(8.65,8.65,9,32),rubber,'tyre');tire.rotation.z=Math.PI/2;
    const hub=mesh(spin,new THREE.CylinderGeometry(4.8,4.8,9.02,24),hubMat,'wheel-hub');hub.rotation.z=Math.PI/2;
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const t=box(spin,8.8,.9,1.9,0,8.45*Math.cos(a),8.45*Math.sin(a),treadMat,'tyre-tread');t.rotation.x=a;}
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const bolt=mesh(spin,new THREE.CylinderGeometry(.48,.48,.5,6),steel,'hub-bolt',side*4.25,2.9*Math.cos(a),2.9*Math.sin(a));bolt.rotation.z=Math.PI/2;}
    wheels.push({pivot,spin,front:z>0});
    rounded(root,10,21,1.2,side*24.5,19.1,z,yellow,'wheel-guard',2);
  }
  const roofMat=mat(0xf0ba42,{metalness:.2}),roof=rounded(root,58,36,3,0,41.5,-8,roofMat,'cab-roof',5);
  for(const x of[-27.5,27.5])for(const z of[-24,8])box(root,1.6,31,1.6,x,24.5,z,trim,'cab-pillar');
  box(root,53,22,.25,0,28,8.8,glass,'front-windscreen');
  box(root,53,19,.25,0,29,-24.8,glass,'rear-windscreen');
  box(root,53,4,2,0,16,9.5,trim,'dashboard');
  for(const x of[-22,22]){
    const lamp=mat(0xfff8cb,{emissive:0xffe49d,emissiveIntensity:1});
    box(root,7,3,2,x,38.5,9,trim,'worklight-case');box(root,5.5,2,1,x,38.5,10,lamp,'worklight');
  }
  const m=measureCharacter(),seatTop=LOADER.floor+m.bodyBottom-m.footBottom;
  for(const x of[-14,14]){
    // Cushion behind the feet; the official boots are not sunk inside it.
    rounded(root,24,7,2,x,seatTop-1,-15.5,seatMat,x<0?'driver-seat':'passenger-seat',2);
    rounded(root,24,2,15,x,seatTop+7.5,-21.7,seatMat,'seat-back',.7);
  }
  const steering=new THREE.Group();steering.position.set(-14,22,8);steering.rotation.x=-.4;root.add(steering);
  mesh(steering,new THREE.TorusGeometry(4.3,.55,8,32),trim,'steering-wheel');
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;rod(steering,[0,0,0],[Math.cos(a)*3.9,Math.sin(a)*3.9,0],.35,steel,'steering-spoke');}
  rod(root,[-14,19,10],[-14,22,8],.65,trim,'steering-column');
  const screen=mat(0x448f82,{emissive:0x216e5d,emissiveIntensity:.5});box(root,9,3,.4,1,19,8.2,screen,'instrument-screen');
  for(let i=0;i<3;i++)box(root,1.8,.7,.5,9+i*3,18.5,8,hubMat,'control-switch');

  for(const side of[-1,1]){
    const x=side*20.5;
    beam(root,[x,11,11],[x,20,24],3.5,4,yellow,'lift-arm');
    beam(root,[x,20,24],[x,10,31],3.5,4,yellow,'bucket-link');
    rod(root,[x,10,13],[x,16,23],1.5,trim,'hydraulic-cylinder');rod(root,[x,16,23],[x,19,26],.85,steel,'hydraulic-piston');
    mesh(root,new THREE.SphereGeometry(2,12,8),steel,'arm-pivot',x,20,24);
  }
  const bucket=new THREE.Group();bucket.name='loader-bucket';root.add(bucket);
  const floor=box(bucket,55,1.3,12,0,3.5,36,trim,'bucket-floor');floor.rotation.x=.12;
  box(bucket,56,12,1.4,0,9.5,29.8,yellow,'bucket-back');
  box(bucket,53,10,.3,0,9.5,30.65,trim,'bucket-inner-back');
  box(bucket,57,1.4,2,0,2.6,42,yellow,'bucket-cutting-edge');
  for(const x of[-22,-11,0,11,22])box(bucket,4,1,2,x,2,42,steel,'bucket-tooth');
  const shape=new THREE.Shape();shape.moveTo(29,3);shape.lineTo(43,2);shape.lineTo(41,5);shape.lineTo(31,16);shape.lineTo(29,16);shape.closePath();
  // 2D coordinates are (z,y); map extrusion depth to x.
  const sideGeometry=new THREE.ExtrudeGeometry(shape,{depth:1.5,bevelEnabled:false});
  const pos=sideGeometry.attributes.position;for(let i=0;i<pos.count;i++){const a=pos.getX(i),b=pos.getY(i),c=pos.getZ(i);pos.setXYZ(i,c,b,a);}sideGeometry.computeVertexNormals();
  // Reflecting the coordinate axes changes winding: render both sides of the cheeks.
  const cheekMat=mat(0xe9a62d,{side:THREE.DoubleSide,metalness:.2});
  mesh(bucket,sideGeometry,cheekMat,'bucket-cheek',-28.5,0,0);mesh(bucket,sideGeometry.clone(),cheekMat,'bucket-cheek',27,0,0);
  const steps=[];
  for(const side of[-1,1]){
    const group=new THREE.Group();group.position.set(side*25,0,-8);root.add(group);
    for(let i=0;i<3;i++){
      box(group,8,3,26,side*(11-i*4),1.5+i*3,0,trim,'boarding-step');
      for(let j=0;j<4;j++)box(group,7,.2,.8,side*(11-i*4),3.1+i*3,-9+j*6,steel,'step-grip');
    }steps.push(group);
  }
  const pilotSocket=new THREE.Group();pilotSocket.name='driver-socket';pilotSocket.position.set(-14,LOADER.floor-m.footBottom,-8);root.add(pilotSocket);
  root.userData={wheels,roof,roofMat,steering,steps,pilotSocket,measurement:m,bucket};return root;
}
export function updateLoaderModel(root,vehicle,{steps=1,roofTransparent=false}={}){
  root.position.set(vehicle.x,0,vehicle.z);root.rotation.y=vehicle.heading;
  for(const wheel of root.userData.wheels){wheel.pivot.rotation.y=vehicle.steering*(wheel.front?1:-1);wheel.spin.rotation.x=vehicle.wheelTravel/LOADER.wheelRadius;}
  for(const group of root.userData.steps){group.scale.x=Math.max(.01,steps);group.visible=steps>.02;}
  if(root.userData.roofMat.transparent!==roofTransparent){root.userData.roofMat.transparent=roofTransparent;root.userData.roofMat.needsUpdate=true;}
  root.userData.roofMat.opacity=roofTransparent?.14:1;root.userData.roofMat.depthWrite=!roofTransparent;root.userData.roof.castShadow=!roofTransparent;
  root.userData.steering.rotation.z=-vehicle.steering*2.8;
}
export function disposeLoader(root){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
