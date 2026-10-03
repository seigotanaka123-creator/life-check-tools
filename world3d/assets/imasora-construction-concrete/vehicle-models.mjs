import * as T from '../three.module.min.js';
import {CAST_PORTS} from './free-casting.mjs';
import {VEHICLE_WHEELS,VEHICLE_PADS} from './free-vehicle-contact.mjs';

// Both vehicles retain the existing seat centres, passenger clearance and saved poses.
// +Z is the front. The drum rotates in its own tilted cradle, not with the cabin.
export function createConcreteVehicle(kind) {
 if (!['truck', 'pump'].includes(kind)) throw Error('Unknown concrete vehicle');
 const root = new T.Group(); root.name = `concrete-${kind}`;
 const cab = new T.Group(); cab.name = 'cab'; root.add(cab);
 const equipment = new T.Group(); equipment.name = 'rear-equipment'; root.add(equipment);
 const color = kind === 'truck' ? '#efb536' : '#27a6b7';
 const mat = (c, opts = {}) => new T.MeshStandardMaterial({color:c, roughness:.62, ...opts});
 const m = {
  color:mat(color), white:mat('#f0ede0'), frame:mat('#293c47'), rubber:mat('#192932'),
  silver:mat('#afc0c2',{metalness:.35}), hub:mat('#dddccf',{metalness:.25}),
  seat:mat('#315562'), glass:mat('#85c5d1',{transparent:true, opacity:.18, depthWrite:false, side:T.DoubleSide}),
  light:mat('#fff3b3',{emissive:'#ffdf82',emissiveIntensity:.28}), red:mat('#dc5c41'),
  orange:mat('#f6a62a'), hose:mat('#26363b'), black:mat('#172a33')
 };
 const cube = new T.BoxGeometry(1,1,1), cyl = new T.CylinderGeometry(1,1,1,16);
 const shapes = new Map();
 function mesh(parent, geo, material, x=0,y=0,z=0) {
  const o=new T.Mesh(geo,material); o.position.set(x,y,z); o.castShadow=o.receiveShadow=true; parent.add(o); return o;
 }
 function box(parent,x,y,z,w,h,d,material,bevel=0) {
  if(!bevel){const o=mesh(parent,cube,material,x,y,z);o.scale.set(w,h,d);return o;}
  const key=[w,h,d,bevel].join(':');let geo=shapes.get(key);
  if(!geo){
   const b=Math.min(bevel,w/3,h/3,d/3),s=new T.Shape();
   s.moveTo(-w/2+b,-h/2+b);s.lineTo(w/2-b,-h/2+b);s.lineTo(w/2-b,h/2-b);s.lineTo(-w/2+b,h/2-b);s.closePath();
   geo=new T.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,steps:1});
   geo.translate(0,0,-d/2+b);shapes.set(key,geo);
  }
  return mesh(parent,geo,material,x,y,z);
 }
 function strut(parent,a,b,r,material) {
  const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),o=mesh(parent,cyl,material);
  o.position.copy(new T.Vector3(...a).add(new T.Vector3(...b)).multiplyScalar(.5));
  o.scale.set(r,delta.length(),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
 }
 function panel(parent, points, material) {
  const geo=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
  geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return mesh(parent,geo,material);
 }
 function torus(parent,x,y,z,r,tube,material) {
  return mesh(parent,new T.TorusGeometry(r,tube,6,24),material,x,y,z);
 }
 function roof() {
  const s=new T.Shape(),x=32,z=18,r=4;
  s.moveTo(-x+r,-z);s.lineTo(x-r,-z);s.quadraticCurveTo(x,-z,x,-z+r);
  s.lineTo(x,z-r);s.quadraticCurveTo(x,z,x-r,z);s.lineTo(-x+r,z);
  s.quadraticCurveTo(-x,z,-x,z-r);s.lineTo(-x,-z+r);s.quadraticCurveTo(-x,-z,-x+r,-z);
  const geo=new T.ExtrudeGeometry(s,{depth:2.4,bevelEnabled:true,bevelThickness:.6,bevelSize:.4,bevelSegments:1,curveSegments:3});
  geo.rotateX(Math.PI/2);geo.translate(0,1.2,0);mesh(cab,geo,m.white,0,49.8,21);
 }
 // A six-wheel chassis gives the rear load the same visual weight as the cab.
 box(root,0,10,-1,53,5,77,m.frame,1.4);
 box(root,0,15,-16,57,4,48,m.color,1.5);
 box(root,0,11,39,58,5,5,m.frame,1.3);
 box(root,0,11,-40,56,4,3,m.frame,.8);
 for(const [i,{x,z}]of VEHICLE_WHEELS.entries()){
  const assembly=new T.Group();assembly.name='wheel-assembly-'+i;root.add(assembly);
  const tire=mesh(assembly,cyl,m.rubber,x,8,z);tire.name='contact-wheel-'+i;tire.scale.set(8,6,8);tire.rotation.z=Math.PI/2;
  const rim=mesh(assembly,cyl,m.hub,x+Math.sign(x)*3.05,8,z);rim.scale.set(4.6,.35,4.6);rim.rotation.z=Math.PI/2;
  const hub=mesh(assembly,cyl,m.frame,x+Math.sign(x)*3.3,8,z);hub.scale.set(2,.55,2);hub.rotation.z=Math.PI/2;
 }
 for(const x of [-27,27]){
  box(root,x,17,-21,9,3,36,m.color,1.2);
  box(root,Math.sign(x)*37,9,21,10,2,12,m.silver,.6);
  box(root,Math.sign(x)*33,14,21,8,2,12,m.frame,.6);
 }
 // Rounded bodywork, an inclined windshield, low doors and slim window pillars.
 box(cab,0,14,21,63,3,35,m.color,1);
 box(cab,0,21,39,60,13,4,m.white,1.3);
 box(cab,0,17.5,39.5,58,5,4,m.color,.9);
 roof();
 box(cab,0,23,3.8,62,17,1.7,m.white,.55);
 box(cab,0,47,3.8,62,3,1.7,m.white,.55);
 panel(cab,[[-29,31.5,3.8],[29,31.5,3.8],[29,45.5,3.8],[-29,45.5,3.8]],m.glass);
 let driverDoor;
 for(const x of [-31,31]){
  const door=new T.Group();door.name=x<0?'driver-door':'passenger-door';cab.add(door);if(x<0)driverDoor=door;
  box(door,x,21,21,1.8,13,34,m.white,.55);
  box(door,x*1.002,17,21,1.9,4,32,m.color,.5);
  strut(cab,[x,26,38],[x,48,34],1.05,m.white);
  strut(cab,[x,26,4],[x,48,4],1.05,m.white);
  strut(door,[x,27,5],[x,27,37],.6,m.frame);
  panel(door,[[x,28,5],[x,28,37],[x,47,33.5],[x,47,5]],m.glass);
  box(door,x,26,9,2.05,1.1,5,m.frame,.25);
  door.position.set(x,0,37);for(const child of door.children)child.position.sub(door.position);
 }
 panel(cab,[[-29,28,38],[29,28,38],[29,47.5,34.45],[-29,47.5,34.45]],m.glass);
 strut(cab,[-29,27.5,38.2],[29,27.5,38.2],.65,m.frame);
 strut(cab,[-18,28.3,38.2],[-5,31,37.8],.3,m.frame);
 strut(cab,[8,28.3,38.2],[21,31,37.8],.3,m.frame);
 for(const x of [-15,15]){
  box(cab,x,17,21,27,4,26,m.seat,1);
  box(cab,x,24,6,27,14,3,m.seat,1);
 }
 // The wheel remains in front of the passenger envelope (the official model is not shrunk).
 box(cab,0,26,36.7,55,2.8,2,m.frame,.5);
 const wheel=torus(cab,-15,29.5,35.7,3.4,.45,m.frame);wheel.rotation.x=-.5;
 box(cab,0,21.5,41.1,23,4,.4,m.frame,.1);
 for(const y of [20.6,22.3])box(cab,0,y,41.4,19,.35,.2,m.silver);
 for(const x of [-22,22]){
  box(cab,x,21.6,41.1,9,4,.7,m.light,.3);
  box(cab,x,17,-42,5,2,.6,m.red,.2);
 }
 box(cab,0,51.9,21,16,1.2,6,m.frame,.35);
 for(const x of [-5,5])box(cab,x,53.1,21,4,1.6,4,m.orange,.4);

 const drum=new T.Group();drum.name='mixing-drum';
 const boom=new T.Group();boom.name='folded-boom';equipment.add(boom);
 if(kind==='truck'){
  const cradle=new T.Group();cradle.position.set(0,34,-16);cradle.rotation.x=-.12;equipment.add(cradle);cradle.add(drum);
  const profile=[[0,-20],[11,-20],[20,-13],[24,-5],[25,3],[22,11],[12,19],[8,22],[0,22]];
  const geo=new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),28);geo.rotateX(Math.PI/2);
  mesh(drum,geo,m.white);
  // Broad coloured rings rotate with the drum and stay visible in the normal game camera.
  for(const [z,radius]of [[-8,24], [7,23]]){
   const band=mesh(drum,new T.CylinderGeometry(radius,radius,4,28),m.color,0,0,z);band.rotation.x=Math.PI/2;
  }
  torus(drum,0,0,-2,25.15,.6,m.silver);
  const rear=mesh(equipment,new T.CylinderGeometry(10,5,8,8,true),m.silver,0,39,-36);
  rear.rotation.x=-.15;
  for(const x of [-18,18])strut(equipment,[x,17,-28],[x,28,-20],2,m.frame);
  box(equipment,0,22,-37,12,3,11,m.color,.7);
  box(equipment,0,24,-39,10,1.8,7,m.silver,.5);
 }else{
  // Low, full-width equipment body and a recognisable folded multi-section placing boom.
  box(equipment,0,23,-17,54,14,43,m.white,2);
  for(const x of [-26.8,26.8]){
   box(equipment,x,24,-19,1.6,9,34,m.color,.5);
   for(const z of [-28,-23,-18])box(equipment,x*1.04,24,z,.5,5,1,m.frame);
  }
  const turntable=mesh(equipment,cyl,m.frame,0,34,-5);turntable.scale.set(11,5,11);
  box(boom,-6,40,-18,8,8,43,m.color,1).name='boom-section-0';
  box(boom,4,48,-17,8,7,40,m.white,1).name='boom-section-1';
  box(boom,13,55,-20,7,6,34,m.color,.8).name='boom-section-2';
  for(const [x,y,z]of [[-1,44,-35],[8.5,51,-1]]){
   const pin=mesh(boom,cyl,m.silver,x,y,z);pin.scale.set(3.5,17,3.5);pin.rotation.z=Math.PI/2;
  }
  strut(boom,[-11,33,-1],[-11,39,-28],1.1,m.silver);
  strut(boom,[-11,33,-1],[-11,37,-17],1.65,m.frame);
  strut(boom,[18,57,-4],[18,57,-33],.85,m.hose);
  strut(boom,[18,57,-33],[18,36,-33],.85,m.hose);
  box(equipment,0,24,-38,20,4,8,m.frame,1);
  for(const x of [-27,27])box(equipment,x,18,-16,5,3,41,m.silver,.7);
 }
 const port=kind==='truck'?CAST_PORTS.truck:CAST_PORTS.supplyInlet;
 torus(equipment,port.x,port.y,port.z,1.65,.45,m.silver).name='supply-hose-coupler';
 const legs=new T.Group();legs.name='deployed-supports';root.add(legs);
 for(const [i,{x,z}]of VEHICLE_PADS.entries()){
  box(legs,x/2,10,z,35,3,3,m.silver,.5);
  const jack=box(legs,x,5,z,3,10,3,m.silver,.5),pad=box(legs,x,.8,z,9,1.6,9,m.frame,.5);jack.name='support-jack-'+i;pad.name='support-pad-'+i;
 }
 legs.visible=false;
 root.userData.vehicleDesign='119g';
 return {root,drum,legs,boom,cab,equipment,driverDoor};
}
