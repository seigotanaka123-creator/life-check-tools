import * as THREE from './three.module.min.js';

// Floor paint is a single upward-facing surface, not a solid slab. Avoid
// self-shadow and depth competition while retaining occlusion by real objects.
export function createGroundMark(parent,{name,x=0,z=0,width,depth,color=0xffffff,y=.12,map=null}){
  const material=new THREE.MeshBasicMaterial({color,map,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),material);
  mark.name=name;mark.rotation.x=-Math.PI/2;mark.position.set(x,y,z);
  mark.castShadow=mark.receiveShadow=false;mark.renderOrder=20;
  mark.userData.groundMark=true;mark.userData.nonCollidable=true;
  parent.add(mark);return mark;
}
