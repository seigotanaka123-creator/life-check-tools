import * as THREE from './three.module.min.js';
import {createLoader,updateLoaderModel,disposeLoader} from './imasora-construction-loader-model.js';
import {tip,hook} from './imasora-construction-crane.js';
import {worldToLocal} from './imasora-construction-loader-physics.js';
import {outriggerLocalVolumes} from './imasora-construction-crane-outriggers.js';
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.18,...extra});
function box(parent,w,h,d,x,y,z,mat,name){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function segment(mesh,a,b){const d=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=d.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());}
export function createCrane(){
  // Reuse the approved two-seat cab/boarding geometry, not a second operator cabin.
  const root=createLoader();root.name='mini-crane-01';
  const remove=new Set(['lift-arm','bucket-link','hydraulic-cylinder','hydraulic-piston','arm-pivot','loader-bucket']);
  for(const o of [...root.children])if(remove.has(o.name)){root.remove(o);o.traverse(m=>m.geometry?.dispose());}
  delete root.userData.bucket;
  const teal=material(0x268c82),yellow=material(0xefb742),steel=material(0xc0d0ce,{metalness:.8}),dark=material(0x263c42),black=material(0x1b2a30);
  box(root,47,5,32,0,9.5,25,teal,'crane-front-deck');box(root,50,3,3,0,7,41,dark,'front-bumper');
  const mast=box(root,12,1,12,0,21,26,teal,'telescopic-mast');
  const base=new THREE.Mesh(new THREE.CylinderGeometry(11,12,5,32),dark);base.position.set(0,15,26);base.name='slewing-ring';root.add(base);
  const swivel=new THREE.Group();root.add(swivel);swivel.name='crane-swivel';
  const boom=[];for(let i=0;i<3;i++)boom.push(box(root,9-i*2,1,9-i*2,0,0,0,i===2?steel:i===1?yellow:teal,`telescopic-boom-${i}`));
  const ram=box(root,2.2,1,2.2,0,0,0,steel,'boom-hydraulic-ram');
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,1,8),black);root.add(cable);cable.name='hoist-cable';
  const hookGroup=new THREE.Group();root.add(hookGroup);hookGroup.name='lifting-hook';
  box(hookGroup,7,5,4,0,3,0,yellow,'hook-block');for(const x of[-2,2])box(hookGroup,1.2,5.1,4.1,x,3,0,black,'hook-hazard-stripe');
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),new THREE.Vector3(2,-2,0),new THREE.Vector3(3,0,0)]);
  const steelHook=new THREE.Mesh(new THREE.TubeGeometry(curve,16,.6,8,false),steel);hookGroup.add(steelHook);
  const supports=[];
  for(const z of[-32,24])for(const side of[-1,1]){const g=new THREE.Group();g.position.set(side*23,0,z);root.add(g);const beam=box(g,1,5,7,0,8,0,teal,'outrigger-beam'),leg=box(g,4,1,4,0,6,0,steel,'outrigger-leg'),foot=box(g,12,2,12,0,1,0,dark,'outrigger-foot');supports.push({side,g,beam,leg,foot});}
  const sling=new THREE.Group();root.add(sling);sling.name='cargo-sling';const straps=[];
  for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,1,6),steel);sling.add(m);straps.push(m);}
  const tipSocket=new THREE.Object3D();root.add(tipSocket);tipSocket.name='boom-tip-socket';
  root.userData.crane={mast,base,swivel,boom,ram,cable,hookGroup,supports,sling,straps,tipSocket};return root;
}
export function updateCraneModel(root,s,options={}){
  updateLoaderModel(root,s.rig.vehicle,options);
  const d=root.userData.crane,k=s.deployment;
  const worldTip=tip(s),worldHook=hook(s),t=worldToLocal(s.rig.vehicle,worldTip.x,worldTip.z),h=worldToLocal(s.rig.vehicle,worldHook.x,worldHook.z);
  const start=new THREE.Vector3(0,22+20*k,26),end=new THREE.Vector3(t.x*k,30+(worldTip.y-30)*k,34+(t.z-34)*k),bottom=new THREE.Vector3(h.x*k,24+(worldHook.y-24)*k,34+(h.z-34)*k);
  d.mast.position.y=(13+start.y)/2;d.mast.scale.y=start.y-13;
  d.base.rotation.y=s.boom.yaw;d.tipSocket.position.copy(end);
  for(let i=0;i<3;i++){const a=start.clone().lerp(end,i*.29),b=start.clone().lerp(end,Math.min(1,.42+i*.29));segment(d.boom[i],a,b);}
  segment(d.ram,new THREE.Vector3(0,start.y-11,24),start.clone().lerp(end,.34));
  segment(d.cable,end,bottom);d.hookGroup.position.copy(bottom);d.hookGroup.rotation.y=s.rig.vehicle.heading+s.boom.yaw;
  const supportVolumes=outriggerLocalVolumes(k);
  for(const o of d.supports)for(const b of supportVolumes){
    if(b.side!==o.side||b.station!==o.g.position.z)continue;
    const mesh=o[b.kind];mesh.position.set(b.x-o.g.position.x,b.y+b.h/2,0);
    mesh.scale.set(b.kind==='beam'?b.w:1,b.kind==='leg'?b.h:1,1);
  }
  const p=s.parts.find(p=>p.id===s.held);d.sling.visible=!!p;
  if(p){const corners=[[-.35,-.3],[.35,-.3],[-.35,.3],[.35,.3]];for(let i=0;i<4;i++){const [x,z]=corners[i],co=Math.cos(p.angle),si=Math.sin(p.angle);const a=worldToLocal(s.rig.vehicle,p.x+x*p.w*co+z*p.d*si,p.z-x*p.w*si+z*p.d*co);segment(d.straps[i],bottom.clone().add(new THREE.Vector3(0,-1,0)),new THREE.Vector3(a.x,p.y+p.h,a.z));}}
}
export function createPart(p){
  const g=new THREE.Group();g.name=p.id;const mat=material(p.color,{roughness:.85});box(g,p.w,p.h,p.d,0,p.h/2,0,mat,'inert-building-part');
  const trim=material(0x9d713f,{roughness:.85}),metal=material(0x738e90,{metalness:.7});
  for(const x of[-1,1])for(const z of[-1,1])box(g,1,.45,1,x*(p.w/2-2),p.h+.22,z*(p.d/2-2),metal,'connection-bolt');
  for(const x of[-1,1])box(g,1,p.h,Math.max(1,p.d-1),x*(p.w/2-.7),p.h/2,0,trim,'part-edge');
  const eye=new THREE.Mesh(new THREE.TorusGeometry(1.5,.42,6,12),metal);eye.position.y=p.h+1.3;g.add(eye);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(p.w+.1,p.h+.1,p.d+.1)),new THREE.LineBasicMaterial({color:0xffe8a6}));edges.position.y=p.h/2;g.add(edges);g.userData={edges};return g;
}
export {disposeLoader as disposeCrane};
