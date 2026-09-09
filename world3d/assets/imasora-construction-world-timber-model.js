import * as THREE from './three.module.min.js';
import {createCrane,updateCraneModel} from './imasora-construction-crane-model.js';
import {createFloatingPart,animateFloatingPart} from './imasora-construction-floating-model.js';
import {hook,pickOption} from './imasora-construction-crane.js';
import {assemblyState,floatingPlacement,joinOption} from './imasora-construction-world-timber-assembly.js';
import {jointPose} from './imasora-construction-floating-joints.js';
import {timberPhysicsState,RETURN_PAD} from './imasora-construction-purchased-timber.js';
import {disposeSpaceMaterialBook} from './imasora-space-material-book.js';
export const TIMBER_FENCES=Object.freeze([
  {x:0,z:251,width:644,depth:2,height:18},{x:-321,z:0,width:2,depth:500,height:18},{x:321,z:0,width:2,depth:500,height:18},
  {x:-312,z:-251,width:18,depth:2,height:18},{x:52,z:-251,width:538,depth:2,height:18},
]);
export function createWorldTimberModel(){
  const root=new THREE.Group();root.name='construction-world-timber-yard';
  const cube=new THREE.BoxGeometry(1,1,1),mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.68}),teal=mat(0x32685e),gold=mat(0xe1c57f),blue=mat(0x5bbdc7);
  const box=(name,x,y,z,w,h,d,m)=>{const o=new THREE.Mesh(cube,m);o.name=name;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;root.add(o);};
  // Paint only: preserve the unified construction ground, without a second floor.
  for(const b of TIMBER_FENCES)box('クレーン区画の柵',b.x,b.height/2,b.z,b.width,b.height,b.depth,teal);
  for(const side of[-1,1]){box('回収枠',RETURN_PAD.x+side*RETURN_PAD.w/2,.11,RETURN_PAD.z,.8,.08,RETURN_PAD.d,blue);box('回収枠',RETURN_PAD.x,.11,RETURN_PAD.z+side*RETURN_PAD.d/2,RETURN_PAD.w,.08,.8,blue);box('駐車線',side*52,.11,-80,.6,.08,120,gold);}
  const c=document.createElement('canvas');c.width=768;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#23463f';ctx.fillRect(0,0,768,128);ctx.strokeStyle='#e1c57f';ctx.lineWidth=6;ctx.strokeRect(3,3,762,122);ctx.fillStyle='#fff5dc';ctx.font='bold 50px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('火星木材 ・ 出庫 / 回収枠',384,64,736);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(160,160/6),new THREE.MeshBasicMaterial({map:texture,transparent:false,side:THREE.DoubleSide}));label.rotation.x=-Math.PI/2;label.position.set(0,.16,104);root.add(label);
  const crane=createCrane();root.add(crane);
  const ghost=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0x77efb6,wireframe:true,transparent:true,opacity:.75,depthWrite:false}));root.add(ghost);
  const ring=new THREE.Mesh(new THREE.RingGeometry(9,10,32),new THREE.MeshBasicMaterial({color:0xffda70,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;root.add(ring);
  const jointMetal=new THREE.MeshStandardMaterial({color:0xd9ad59,metalness:.65,roughness:.35}),boltMetal=mat(0x314849);
  const joints=Array.from({length:7},()=>{
    const g=new THREE.Group();g.name='浮遊床の接合金具';
    for(const side of [-1,1]){const strip=new THREE.Mesh(new THREE.BoxGeometry(8,.28,3),jointMetal);strip.position.z=side*16;g.add(strip);for(const x of [-2.6,2.6]){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.6,.6,.45,8),boltMetal);bolt.position.set(x,.14,side*16);g.add(bolt);}}
    root.add(g);return g;
  });
  root.userData={crane,parts:new Map(),ghost,ring,joints};return root;
}
export function updateWorldTimberModel(root,s,{active=false,time=0}={}){
  s=assemblyState(s);
  const d=root.userData;updateCraneModel(d.crane,s,{roofTransparent:true,steps:s.rig.mode==='driving'?0:1});
  const ids=new Set(s.parts.map(p=>p.id));for(const[id,m]of d.parts)if(!ids.has(id)){disposeSpaceMaterialBook(m);d.parts.delete(id);}
  const target=pickOption(s);for(const p of s.parts){let m=d.parts.get(p.id);if(!m){m=createFloatingPart(p);d.parts.set(p.id,m);root.add(m);}m.position.set(p.x,p.y,p.z);m.rotation.y=p.angle;animateFloatingPart(m,p,time);m.userData.edges.visible=active&&(p.id===s.held||p.id===target?.id);}
  const h=hook(s);d.ring.visible=active&&s.work;d.ring.position.set(h.x,.22,h.z);
  const join=active?joinOption(s):null,preview=active&&!s.joining?(join?.ok?join:floatingPlacement(timberPhysicsState(s))):null;d.ghost.visible=!!preview;
  if(preview){const p=preview.candidate;d.ghost.position.set(p.x,p.y+p.h/2,p.z);d.ghost.rotation.y=p.angle;d.ghost.scale.set(p.w,p.h,p.d);d.ghost.material.color.setHex(preview.ok?0x77efb6:0xf09c66);}
  d.joints.forEach(m=>m.visible=false);
  const links=s.joining?[...s.joints,{a:s.joining.targetId,b:s.joining.partId,pending:true}]:s.joints;
  links.forEach((j,i)=>{const a=s.parts.find(p=>p.id===j.a),raw=s.parts.find(p=>p.id===j.b),b=j.pending?{...raw,...s.joining.end}:raw,m=d.joints[i],seam=jointPose(a,b);if(!m)return;
    const span=p=>Math.abs(Math.round(p.angle/(Math.PI/2)))%2?(seam.angle?p.d:p.w):(seam.angle?p.w:p.d),axis=seam.angle?'x':'z';
    const overlap=Math.min(a[axis]+span(a)/2,b[axis]+span(b)/2)-Math.max(a[axis]-span(a)/2,b[axis]-span(b)/2);
    m.children.forEach((o,k)=>o.position.z=(k<3?-1:1)*Math.min(16,overlap/4));m.visible=true;m.position.set(seam.x,a.y+a.h+.18,seam.z);m.rotation.y=seam.angle;m.scale.x=j.pending?.4+.6*s.joining.elapsed/1.2:1;
  });
}
