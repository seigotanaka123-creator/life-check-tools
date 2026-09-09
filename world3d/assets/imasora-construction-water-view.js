import * as THREE from './three.module.min.js';
import {WATER,WATER_REGIONS,WATER_SOLIDS,DIRECTIONS,waterCoord,waterDirection} from './imasora-construction-water.js';
export const waterWorld=k=>{const [x,y,z]=waterCoord(k);return new THREE.Vector3((x+.5-WATER.nx/2)*WATER.cell,(y+.5)*WATER.cell,(z+.5-WATER.nz/2)*WATER.cell);};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.5,...extra});
const box=(parent,w,h,d,x,y,z,m)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
export function createWaterLab(){
  const root=new THREE.Group();root.name='mars-water-finite-volume-lab';
  const dark=mat(0x254d53),trim=mat(0xd5c6a3),steel=mat(0x83a4a4,{metalness:.45}),base=mat(0xd9d9c6);
  box(root,274,12,208,0,6,0,base);box(root,278,3,212,0,-1.5,0,dark);
  for(const x of[-138,138])box(root,2,2,210,x,13,0,trim);for(const z of[-105,105])box(root,278,2,2,0,13,z,trim);
  const glass=new THREE.MeshPhysicalMaterial({color:0xb8eeee,roughness:.28,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide});
  const edges=new THREE.LineBasicMaterial({color:0x639d9c,transparent:true,opacity:.28});
  for(const k of WATER_SOLIDS){const [x,y,z]=waterCoord(k);if(y===0)continue;const p=waterWorld(k),b=box(root,12,12,12,p.x,p.y,p.z,glass);b.castShadow=false;const edge=new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry),edges);b.add(edge);}
  // Mark these as observation guards, not the future water-permeable Mars glass.
  root.userData.guardMaterial=glass;
  for(const x of[-66,42]){box(root,4,59,4,x,41,-13,steel);box(root,4,59,4,x,41,13,steel);}
  const tank=new THREE.Group();tank.position.set(-111,12,0);root.add(tank);
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(18,18,40,48,1,true),new THREE.MeshPhysicalMaterial({color:0xe5faf3,transparent:true,opacity:.18,roughness:.2,depthWrite:false,side:THREE.DoubleSide}));shell.position.y=23;tank.add(shell);
  for(const y of[3,43]){const rim=new THREE.Mesh(new THREE.CylinderGeometry(19,19,4,48),dark);rim.position.y=y;tank.add(rim);}
  const liquid=new THREE.Mesh(new THREE.CylinderGeometry(16.7,16.7,1,48),new THREE.MeshStandardMaterial({color:0x22c1dc,emissive:0x126c83,emissiveIntensity:.35,roughness:.17,transparent:true,opacity:.8}));tank.add(liquid);
  for(const x of[-15,15])box(tank,2,40,2,x,23,9,trim);
  const pipe=new THREE.CatmullRomCurve3([new THREE.Vector3(-94,22,0),new THREE.Vector3(-80,22,0),new THREE.Vector3(-74,18,0),new THREE.Vector3(-67,18,0)]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(pipe,24,2.4,12,false),steel));
  const valve=new THREE.Mesh(new THREE.TorusGeometry(6,.85,8,24),mat(0xf0bf66));valve.position.set(-83,31,0);valve.rotation.x=Math.PI/2;root.add(valve);
  const gate=box(root,1.2,11.8,11.8,-12,78,0,mat(0xefbd65));gate.name='water-gate';
  const gateRail=box(root,3,17,2,-12,82,-8,steel);gateRail.name='gate-guide';
  for(const z of[-60,60]){
    const outlet=new THREE.Mesh(new THREE.CylinderGeometry(10,12,7,32),dark);outlet.position.set(42,14,z);root.add(outlet);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(10,.6,8,32),trim);lip.rotation.x=Math.PI/2;lip.position.set(42,18,z);root.add(lip);
  }
  const pickups=[];
  for(const region of WATER_REGIONS)for(const k of region.cells){const p=waterWorld(k),pick=box(root,11.5,11.5,11.5,p.x,p.y,p.z,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));pick.castShadow=false;pick.userData.region=region.id;pickups.push(pick);}
  const routes=new THREE.Group();root.add(routes);
  const waterMat=new THREE.MeshPhysicalMaterial({color:0x30cbea,emissive:0x0b6684,emissiveIntensity:.32,roughness:.17,metalness:.06,clearcoat:1,transparent:true,opacity:.69,depthWrite:false});
  // A fading cell and its new destination can coexist visually for a few frames.
  const visualCapacity=WATER.nx*WATER.ny*WATER.nz;
  const fluid=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),waterMat,visualCapacity);fluid.count=0;fluid.frustumCulled=false;root.add(fluid);
  const sparkles=new THREE.InstancedMesh(new THREE.SphereGeometry(.45,6,4),new THREE.MeshBasicMaterial({color:0xe3ffff,transparent:true,opacity:.75}),visualCapacity);sparkles.count=0;sparkles.frustumCulled=false;root.add(sparkles);
  root.userData={...root.userData,liquid,gate,valve,routes,pickups,fluid,sparkles,visual:new Map(),routeKey:'',dummy:new THREE.Object3D()};return root;
}
function updateArrows(root,s,selected){
  const d=root.userData,key=JSON.stringify([s.directions,selected]);if(key===d.routeKey)return;d.routeKey=key;
  for(const c of [...d.routes.children]){d.routes.remove(c);c.traverse(o=>{o.geometry?.dispose();if(o.material&&!Array.isArray(o.material))o.material.dispose();});}
  for(const region of WATER_REGIONS){const active=region.id===selected,color=active?0xffac28:0x164c67;
    region.cells.forEach((k,index)=>{if(index%2&&index!==region.cells.length-1)return;const center=waterWorld(k),mask=s.directions[region.id];DIRECTIONS.forEach((direction,i)=>{if(!(mask&(1<<i)))return;const v=new THREE.Vector3(...direction.v),a=new THREE.Group(),m=new THREE.MeshBasicMaterial({color});
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,5,8),m);stem.position.y=-1.2;a.add(stem);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(1.7,2.7,10),m);tip.position.y=2.65;a.add(tip);
      a.position.copy(center);a.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v);d.routes.add(a);});});
    if(active)for(const k of region.cells){const m=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(12.4,12.4,12.4)),new THREE.LineBasicMaterial({color:0xffc568,transparent:true,opacity:.55}));m.position.copy(waterWorld(k));d.routes.add(m);}
  }
}
export function updateWaterLab(root,s,{selected='rise',dt=1/60,time=0}={}){
  const d=root.userData;updateArrows(root,s,selected);d.liquid.scale.y=36*s.reservoir/WATER.total;d.liquid.position.y=5+d.liquid.scale.y/2;d.liquid.visible=s.reservoir>0;
  const target=s.gate?78:93;d.gate.position.y+=(target-d.gate.position.y)*(1-Math.exp(-dt*12));if(s.feeding&&s.running)d.valve.rotation.z+=dt*1.2;
  for(const [k,c] of Object.entries(s.cells))if(!d.visual.has(k))d.visual.set(k,{q:0,dir:c.dir});
  let count=0,shine=0;for(const [k,v] of d.visual){const target=s.cells[k]?.q||0;v.q+=(target-v.q)*(1-Math.exp(-dt*22));v.dir=waterDirection(s,k);if(v.q<.03&&!target){d.visual.delete(k);continue;}
    const fraction=Math.max(.001,v.q/WATER.capacity),width=11.5*Math.sqrt(fraction),axis=v.dir&3?'x':v.dir&12?'y':v.dir&48?'z':'y',p=waterWorld(k);
    d.dummy.position.copy(p);d.dummy.rotation.set(0,0,0);d.dummy.scale.set(width,width,width);d.dummy.scale[axis]=11.85;d.dummy.updateMatrix();d.fluid.setMatrixAt(count++,d.dummy.matrix);
    const bit=DIRECTIONS.findIndex((_,i)=>v.dir&(1<<i));if(bit>=0&&s.running){const offset=((time*2.5+waterCoord(k).reduce((a,b)=>a+b,0)*.19)%1-.5)*9;d.dummy.position.copy(p).addScaledVector(new THREE.Vector3(...DIRECTIONS[bit].v),offset);d.dummy.scale.set(1,1,1);d.dummy.updateMatrix();d.sparkles.setMatrixAt(shine++,d.dummy.matrix);}
  }
  d.fluid.count=count;d.fluid.instanceMatrix.needsUpdate=true;d.sparkles.count=shine;d.sparkles.instanceMatrix.needsUpdate=true;
}
