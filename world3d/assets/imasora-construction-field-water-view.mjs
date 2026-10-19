import * as THREE from './three.module.min.js';

// Shared, preallocated surface mesh. The 2-unit samples match the earth voxels;
// no flat disk cuts through a bank or hangs above a newly dug depression.
export function createFieldWaterView(){
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(768*25*3),indices=new Uint32Array(768*96);
 for(let n=0;n<768;n++)for(let z=0;z<4;z++)for(let x=0;x<4;x++){
  const v=n*25+z*5+x,i=n*96+(z*4+x)*6;indices.set([v,v+5,v+1,v+1,v+5,v+6],i);
 }
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(positions.length),3).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.setDrawRange(0,0);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x25b9e0,roughness:.65,transparent:true,opacity:.78,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));
 mesh.name='field-water-surface';mesh.frustumCulled=false;mesh.userData={pools:null,elapsed:1,count:0};return mesh;
}
export function updateFieldWaterView(mesh,pools,heightAt,dt=0,terrainRevision){
 const d=mesh.userData;d.elapsed+=Math.max(0,dt);
 if(d.pools===pools&&(terrainRevision!==undefined?d.terrainRevision===terrainRevision:d.elapsed<.1))return false;d.elapsed=0;d.pools=pools;d.terrainRevision=terrainRevision;
 const list=Object.values(pools??{}),a=mesh.geometry.attributes.position;let index=0;
 for(const p of list)for(let z=-4;z<=4;z+=2)for(let x=-4;x<=4;x+=2){
  const h=heightAt(p.x+x,p.z+z);a.setXYZ(index++,p.x+x,(Number.isFinite(h)&&h>=-32&&h<=48?h:p.y)+.12+p.q/128,p.z+z);
 }
 const normals=mesh.geometry.attributes.normal;
 for(let n=0;n<list.length;n++)for(let z=0;z<5;z++)for(let x=0;x<5;x++){
  const at=(i,j)=>a.getY(n*25+j*5+i),dx=(at(Math.max(0,x-1),z)-at(Math.min(4,x+1),z))/(x===0||x===4?2:4),dz=(at(x,Math.max(0,z-1))-at(x,Math.min(4,z+1)))/(z===0||z===4?2:4),length=Math.hypot(dx,1,dz);
  normals.setXYZ(n*25+z*5+x,dx/length,1/length,dz/length);
 }
 d.count=list.length;mesh.visible=!!list.length;mesh.geometry.setDrawRange(0,list.length*96);
 if(index){for(const attribute of[a,normals]){attribute.clearUpdateRanges();attribute.addUpdateRange(0,index*3);attribute.needsUpdate=true;}}return true;
}
