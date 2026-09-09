import * as THREE from './three.module.min.js';
import {createTimberPart} from './imasora-construction-timber-model.js';
export function createFloatingPart(p){
  const root=createTimberPart(p);if(p.materialId!=='mars-timber')return root;
  const ink=new THREE.MeshStandardMaterial({color:0xd6fff0,emissive:0x4ba697,emissiveIntensity:.65,roughness:.45});
  // Small upward inlays on both long sides; real wood outline remains unchanged.
  for(const z of[-1,1])for(const x of[-24,0,24]){
    const stem=new THREE.Mesh(new THREE.BoxGeometry(.65,2,.12),ink);stem.position.set(x,2.5,z*(p.d/2+.08));root.add(stem);
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(1.3,1.3,3),ink);arrow.position.set(x,4,z*(p.d/2+.1));arrow.scale.z=.12;root.add(arrow);
  }
  const glow=new THREE.Group();glow.name='floating-grains';root.add(glow);
  const geometry=new THREE.SphereGeometry(.35,6,4),material=new THREE.MeshBasicMaterial({color:0xc1ffee,transparent:true,opacity:.7,depthWrite:false});
  for(let i=0;i<14;i++){const bead=new THREE.Mesh(geometry,material);bead.position.set(Math.cos(i*2.399)*p.w*.43,-1,Math.sin(i*2.399)*p.d*.4);bead.userData.phase=i*.77;glow.add(bead);}
  return root;
}
export function animateFloatingPart(root,p,time){
  const glow=root.getObjectByName('floating-grains');if(!glow)return;glow.visible=!!p.hover;
  if(p.hover)for(const bead of glow.children)bead.position.y=-.6-(1+Math.sin(time*1.6+bead.userData.phase))*.7;
}
