import * as THREE from './three.module.min.js';

export const MAX_EXCAVATION_PREVIEW_ITEMS=1792;
const EDGE_PAIRS=[0,1,1,3,3,2,2,0,4,5,5,7,7,6,6,4,0,4,1,5,2,6,3,7];
const CORNERS=[[-1,-1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]];
const ignoreRaycast=()=>{};
const finitePosition=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=100000);
const validId=id=>Number.isSafeInteger(id)||(typeof id==='string'&&id.length>0&&id.length<=160);

function makeLayer(root,geometry,name,color,outlineColor,opacity){
 const fill=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,toneMapped:false}),MAX_EXCAVATION_PREVIEW_ITEMS);
 fill.name=`excavation-preview-${name}-volume`;fill.count=0;fill.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 const outlineGeometry=new THREE.BufferGeometry(),positions=new THREE.BufferAttribute(new Float32Array(MAX_EXCAVATION_PREVIEW_ITEMS*EDGE_PAIRS.length*3),3);
 positions.setUsage(THREE.DynamicDrawUsage);outlineGeometry.setAttribute('position',positions);outlineGeometry.setDrawRange(0,0);
 const outline=new THREE.LineSegments(outlineGeometry,new THREE.LineBasicMaterial({color:outlineColor,transparent:true,opacity:.95,depthWrite:false,depthTest:true,toneMapped:false}));
 outline.name=`excavation-preview-${name}-outline`;
 for(const object of[fill,outline]){object.frustumCulled=false;object.castShadow=object.receiveShadow=false;object.raycast=ignoreRaycast;root.add(object);}
 fill.renderOrder=20;outline.renderOrder=21;
 return {fill,outline,positions};
}

export function createExcavationPreviewModel(){
 const root=new THREE.Group();root.name='excavation-soil-shape-preview';root.visible=false;
 const geometry=new THREE.BoxGeometry(1,1,1);
 root.userData={removed:makeLayer(root,geometry,'removed',0x19cdeb,0x70ecff,.27),deposited:makeLayer(root,geometry,'deposited',0xff8a24,0xffc477,.30),geometry,matrix:new THREE.Matrix4(),lastResult:null,snapshot:null,itemCount:0,status:null,disposed:false};
 return root;
}

function collect(list,removed,limit){
 const items=[],seen=new Set();
 if(!Array.isArray(list))return items;
 // Both memory and malformed-input work are bounded, even before filtering.
 for(let i=0;i<Math.min(list.length,MAX_EXCAVATION_PREVIEW_ITEMS)&&items.length<limit;i++){
  const entry=list[i];if(!entry||!validId(entry.id)||!finitePosition(entry.position))continue;
  let size;
  if(removed&&entry.kind==='terrain')size={x:8,y:8,z:8};
  else if(entry.kind==='spoil')size={x:7.8,y:7.8,z:7.8};
  else if(!removed&&entry.kind==='bin'&&entry.size&&['x','y','z'].every(k=>Number.isFinite(entry.size[k])&&entry.size[k]>0&&entry.size[k]<=1024))size=entry.size;
  else continue;
  const key=`${entry.kind}:${entry.id}`;if(seen.has(key))continue;seen.add(key);
  const p=entry.position;items.push([key,p.x,p.y,p.z,size.x,size.y,size.z]);
 }return items;
}
const equalItems=(a,b)=>a?.length===b.length&&a.every((item,i)=>item.every((v,k)=>v===b[i][k]));
function markRange(attribute,count){
 attribute.clearUpdateRanges();attribute.addUpdateRange(0,count);attribute.needsUpdate=true;
}
function updateLayer(layer,items,matrix){
 layer.fill.count=items.length;layer.outline.geometry.setDrawRange(0,items.length*EDGE_PAIRS.length);
 if(!items.length)return;
 let offset=0;
 for(let i=0;i<items.length;i++){
  const[,x,y,z,sx,sy,sz]=items[i];layer.fill.setMatrixAt(i,matrix.makeScale(sx,sy,sz).setPosition(x,y,z));
  // A small outward edge offset avoids fighting the real terrain surface.
  // The translucent volume itself retains the exact predicted dimensions.
  const skin=Math.min(.035,Math.max(.014,Math.min(sx,sy,sz)*.003));
  for(const index of EDGE_PAIRS){const c=CORNERS[index];layer.positions.array[offset++]=x+c[0]*(sx/2+skin);layer.positions.array[offset++]=y+c[1]*(sy/2+skin);layer.positions.array[offset++]=z+c[2]*(sz/2+skin);}
 }
 markRange(layer.fill.instanceMatrix,items.length*16);markRange(layer.positions,offset);
}

export function updateExcavationPreviewModel(root,result){
 if(!root||root.userData.disposed)return;
 const d=root.userData;
 // Worker results are immutable snapshots. Identical snapshots need no buffer
 // writes, geometry allocation, collision query, or per-frame scene rebuild.
 if(d.lastResult===result)return;
 d.lastResult=result;d.status=result?.status??null;
 if(!result||!['ready','partial'].includes(result.status)){
  root.visible=false;d.itemCount=0;d.snapshot=null;
  for(const layer of[d.removed,d.deposited]){layer.fill.count=0;layer.outline.geometry.setDrawRange(0,0);}return;
 }
 const removed=collect(result.removed,true,MAX_EXCAVATION_PREVIEW_ITEMS),deposited=collect(result.deposited,false,MAX_EXCAVATION_PREVIEW_ITEMS-removed.length);
 if(!equalItems(d.snapshot?.removed,removed))updateLayer(d.removed,removed,d.matrix);
 if(!equalItems(d.snapshot?.deposited,deposited))updateLayer(d.deposited,deposited,d.matrix);
 d.snapshot={removed,deposited};d.itemCount=removed.length+deposited.length;root.visible=d.itemCount>0;
}

export function disposeExcavationPreviewModel(root){
 if(!root||root.userData.disposed)return;
 const d=root.userData;
 for(const layer of[d.removed,d.deposited]){layer.fill.dispose();layer.fill.material.dispose();layer.outline.geometry.dispose();layer.outline.material.dispose();}
 d.geometry.dispose();root.removeFromParent();root.clear();root.visible=false;root.userData={disposed:true,itemCount:0};
}
