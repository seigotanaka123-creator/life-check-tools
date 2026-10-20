import * as THREE from './three.module.min.js';
import {measureCharacter} from './imasora-construction-layout.js?v=120ds';
import {applyLoaderGround} from './imasora-construction-loader-model.js?v=120gf';
export const WATER_CAB={floor:20,seatZ:20,seatX:-14,roof:52};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.55,...extra});
export function createWaterTruck(){
 const root=new THREE.Group();root.name='water-tanker-truck';
 const blue=mat(0x05a8cb,{metalness:.2}),cream=mat(0xe5eddd),dark=mat(0x254e52),rubber=mat(0x202b2c),steel=mat(0xb8c7bd,{metalness:.7}),glass=mat(0x89d9e3,{transparent:true,opacity:.22,depthWrite:false}),yellow=mat(0xfead03),light=mat(0xfff8cb,{emissive:0xffe49d,emissiveIntensity:.7});
 const add=(g,m,name,x,y,z)=>{const o=new THREE.Mesh(g,m);o.name=name;o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
 const box=(w,h,d,x,y,z,m,name)=>add(new THREE.BoxGeometry(w,h,d),m,name,x,y,z);
 box(48,5,78,0,6.5,0,dark,'truck-chassis');
 box(56,1.5,34,0,19.25,20,blue,'cabin-floor');
 box(55,10,3,0,24,38,blue,'truck-front');box(40,5,1,0,24,40,dark,'radiator-grille');
 for(let i=0;i<7;i++)box(1,4,.4,(i-3)*5,24,40.7,steel,'grille-slat');
 box(59,3,3,0,12,40,cream,'front-bumper');
 for(const x of[-23,23])box(8,4,1,x,28,40,light,'headlight');
 for(const x of[-27,27])for(const z of[4,36])box(1.6,31,1.6,x,35,z,blue,'cab-pillar');
 box(53,18,.3,0,40,36.8,glass,'front-windscreen');box(53,18,.3,0,40,3.2,glass,'rear-windscreen');
 const roof=box(58,3,36,0,52,20,cream,'cab-roof');
 for(const side of[-1,1]){box(1.6,6,28,side*27.4,23.5,20,blue,'cab-door-sill');box(1,2,4,side*28.3,29,9,steel,'door-handle');}
 box(53,4,3,0,28,34,dark,'dashboard');
 for(const side of[-1,1]){box(1.8,7,4,side*31,40,33,dark,'mirror');box(2,1,8,side*28.5,40,30,steel,'mirror-arm');}
 const m=measureCharacter(),seatTop=WATER_CAB.floor+m.bodyBottom-m.footBottom;
 for(const x of[-14,14]){box(24,2,7,x,seatTop-1,12.5,dark,x<0?'driver-seat':'passenger-seat');box(24,15,2,x,seatTop+7.5,6.3,dark,'seat-back');}
 const steering=new THREE.Group();steering.position.set(-14,33,34);steering.rotation.x=-.4;root.add(steering);const ring=new THREE.Mesh(new THREE.TorusGeometry(4.3,.55,8,24),dark);ring.name='steering-wheel';steering.add(ring);
 const pilotSocket=new THREE.Group(),passengerSocket=new THREE.Group();pilotSocket.name='driver-socket';passengerSocket.name='passenger-socket';pilotSocket.position.set(-14,20-m.footBottom,20);passengerSocket.position.set(14,20-m.footBottom,20);root.add(pilotSocket,passengerSocket);
 // Full-size rear cylindrical tank, with saddle mounts, bands and service hatch.
 const tank=add(new THREE.CylinderGeometry(18,18,36,24),blue,'water-tank',0,27,-23);tank.rotation.x=Math.PI/2;
 for(const z of[-40,-6]){const band=add(new THREE.TorusGeometry(18.2,1.15,6,24),cream,'tank-band',0,27,z);band.rotation.z=0;box(39,3,5,0,11,z,steel,'tank-saddle');}
 const hatch=add(new THREE.CylinderGeometry(5,5,2,16),cream,'tank-hatch',0,46,-23);
 for(const z of[-40,-6])box(40,1,2,0,46,z,steel,'tank-top-rail');
 for(const x of[-20,20])box(1,2,36,x,46,-23,steel,'tank-side-rail');
 const reel=add(new THREE.CylinderGeometry(7,7,5,20),dark,'hose-reel',24,26,-22);reel.rotation.z=Math.PI/2;
 for(const x of[21,27]){const r=add(new THREE.CylinderGeometry(8,8,1,20),yellow,'hose-reel-rim',x,26,-22);r.rotation.z=Math.PI/2;}
 const pump=box(13,12,6,0,16,-42,cream,'rear-pump');box(5,5,2,0,17,-46,blue,'pump-outlet');
 // Outlet runs along the frame and rises in front of the cab; it never pours
 // through the roof or passenger space. The same point is used by physics.
 box(2,2,73,30,12,-1,blue,'water-pipe');box(2,14,2,30,18,36,blue,'water-pipe-rise');box(30,2,2,15,25,39,blue,'water-pipe-front');
 const nozzle=add(new THREE.CylinderGeometry(1.5,1.5,4,12),steel,'water-nozzle',0,23,39);
 const wheels=[];
 for(const z of[-31,18])for(const side of[-1,1]){const pivot=new THREE.Group(),spin=new THREE.Group();pivot.position.set(side*25.5,8.9,z);pivot.add(spin);root.add(pivot);
  for(const [r,w,m,name]of[[8.65,9,rubber,'tyre'],[5,9.1,cream,'wheel-hub']]){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,24),m);o.name=name;o.rotation.z=Math.PI/2;spin.add(o);}
  box(11,1,21,side*25,19,z,blue,'wheel-guard');wheels.push({pivot,spin,front:z>0});
 }
 const steps=[];for(const side of[-1,1]){const group=new THREE.Group();group.position.set(side*25,0,20);root.add(group);for(let i=0;i<4;i++){const o=new THREE.Mesh(new THREE.BoxGeometry(8,2,23),dark);o.name='boarding-step';o.position.set(side*(27-i*7),4+i*5,0);group.add(o);}steps.push(group);}
 const loadWater=box(1,28,3,0,27,-41.5,mat(0x31bddb,{emissive:0x087397,emissiveIntensity:.25}),'tank-level-gauge');
 root.userData={wheels,roof,roofMat:cream,steering,steps,pilotSocket,passengerSocket,measurement:m,loadWater};return root;
}
export function updateWaterTruck(root,v,{steps=1,ground=null,load=0}={}){
 root.position.set(v.x,0,v.z);root.rotation.set(0,v.heading,0);root.userData.wheels.forEach(w=>w.pivot.position.y=8.9);applyLoaderGround(root,ground);
 for(const w of root.userData.wheels){w.pivot.rotation.y=v.steering*(w.front?1:-1);w.spin.rotation.x=v.wheelTravel/8.9;}
 for(const s of root.userData.steps){s.scale.x=Math.max(.01,steps);s.visible=steps>.02;}
 root.userData.steering.rotation.z=-v.steering*2.8;const f=load/128,g=root.userData.loadWater;g.visible=f>0;g.scale.y=Math.max(.001,f);g.position.y=13+14*f;
}
