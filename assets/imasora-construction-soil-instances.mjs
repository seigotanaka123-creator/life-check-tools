import * as THREE from './three.module.min.js';
import {shovelNearbySoil,shovelSoilBoxes} from './imasora-construction-shovel-work.mjs?v=120fw';

// Every camera ray lies inside this horizontal rectangle, even while its
// height is raised to avoid obstruction. This is a conservative broad phase;
// the view still performs the original exact segment test on every candidate.
export function soilCameraCandidates(soil,from,focusPoints,padding=1){
 const points=[from,...focusPoints];
 if(!Number.isFinite(padding)||padding<0||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))return shovelSoilBoxes(soil);
 const margin=padding+1e-6,minX=Math.min(...points.map(p=>p[0]))-margin,maxX=Math.max(...points.map(p=>p[0]))+margin,minZ=Math.min(...points.map(p=>p[2]))-margin,maxZ=Math.max(...points.map(p=>p[2]))+margin;
 const x=(minX+maxX)/2,z=(minZ+maxZ)/2,r=Math.max(maxX-minX,maxZ-minZ)/2;
 const boxes=r<=640&&Math.abs(x)<=2048&&Math.abs(z)<=2048?shovelNearbySoil(soil,x,z,r):shovelSoilBoxes(soil);
 return boxes.filter(b=>b.position[0]+b.size/2>=minX&&b.position[0]-b.size/2<=maxX&&b.position[2]+b.size/2>=minZ&&b.position[2]-b.size/2<=maxZ);
}

// The geometry/material belong to the enclosing view. Only instance buffers
// belong to this layer; dispose them without disposing the shared cube.
export function createSoilInstanceLayer(parent,geometry,material){
 const matrix=new THREE.Matrix4();
 let mesh=null,capacity=0,disposed=false,reallocations=0,uploads=0,writtenInstances=0;
 return {
  sync(boxes){
   if(disposed)throw Error('土の表示は終了しています。');
   const count=boxes.length;
   if(count>capacity){
    let next=Math.max(1,capacity);while(next<count)next*=2;
    const replacement=new THREE.InstancedMesh(geometry,material,next);
    replacement.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if(mesh){mesh.removeFromParent();mesh.dispose();}
    mesh=replacement;capacity=next;reallocations++;parent.add(mesh);
   }
   if(!mesh)return;
   mesh.count=count;mesh.visible=count>0;
   if(!count)return;
   for(let i=0;i<count;i++){
    const box=boxes[i];matrix.makeScale(box.size,box.size,box.size);matrix.setPosition(...box.position);
    mesh.setMatrixAt(i,matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
   uploads++;writtenInstances+=count;
  },
  get proof(){return {count:mesh?.count??0,capacity,reallocations,uploads,writtenInstances};},
  dispose(){if(disposed)return;disposed=true;if(mesh){mesh.removeFromParent();mesh.dispose();mesh=null;}capacity=0;},
 };
}

// A pending hand/bucket source can appear or disappear without changing any
// terrain. Keep its small upload independent of the full field of soil.
export function createSoilRenderLayers(parent,geometry,material,{terrainBoxes,sourceBoxes}){
 const terrain=createSoilInstanceLayer(parent,geometry,material),source=createSoilInstanceLayer(parent,geometry,material);
 let lastSoil=null,sourceKey=null;
 return {
  sync(frame,extra=[]){
   if(lastSoil!==frame.soil){terrain.sync(terrainBoxes(frame.soil));lastSoil=frame.soil;}
   const visible=sourceBoxes(frame,extra),key=visible.map(b=>b.position.join(',')+'/'+b.size).join('|');
   if(key!==sourceKey){source.sync(visible);sourceKey=key;}
  },
  get proof(){return {terrain:terrain.proof,source:source.proof};},
  dispose(){terrain.dispose();source.dispose();lastSoil=null;sourceKey=null;},
 };
}
