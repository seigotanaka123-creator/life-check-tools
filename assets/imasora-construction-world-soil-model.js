import {soilBedRects} from './imasora-construction-soil-bed.mjs?v=120eo';
import {sharedSupply} from './imasora-construction-field-area.mjs?v=120ov';
import * as THREE from './three.module.min.js';
import {createGroundMark,createIndustrialMaterial,createIndustrialSoilStore} from './imasora-construction-ground-mark.js?v=121cv';
import {createLoader,updateLoaderModel} from './imasora-construction-loader-work-model.js?v=120ov';
import {soilTransferVisual,soilCopyOptions,SOIL_SITE_SOLIDS,soilSiteSolids,soilReceiver} from './imasora-construction-purchased-soil.js?v=120pv';
export const SOIL_FENCES=Object.freeze([
  {x:0,z:251,width:644,depth:2,height:18},{x:-321,z:0,width:2,depth:500,height:18},{x:321,z:0,width:2,depth:500,height:18},
  {x:-312,z:-251,width:18,depth:2,height:18},{x:52,z:-251,width:538,depth:2,height:18},
]);
export function createWorldSoilModel(state=null){
  const root=new THREE.Group();root.name='construction-world-soil-yard';
  const cube=new THREE.BoxGeometry(1,1,1),mat=color=>new THREE.MeshStandardMaterial({color,roughness:.86});
  const purple=createIndustrialMaterial(0x705067,'soil'),metal=createIndustrialMaterial(0x4b6864,'paint'),gold=mat(0xdaba68),rake=mat(0xa98c9f);
  function box(parent,name,x,y,z,w,h,d,m){const o=new THREE.Mesh(cube,m);o.name=name;o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
  let store=null;
  // Use the main world's unified ground. No overlapping floor or distant terrain.
  for(const b of state?soilSiteSolids(state):SOIL_SITE_SOLIDS){if(b.id==='資材容器'){store=createIndustrialSoilStore(root,b);store.userData.setStock(state?.stock);}else box(root,b.id,(b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2,b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ,b.id==='試し跳びの屋根'?gold:metal);}
  for(const b of state?.loader.vehicle.field?[]:SOIL_FENCES)box(root,'土作業区画の柵',b.x,b.height/2,b.z,b.width,b.height,b.depth,metal);
  for(const x of state?.loader.vehicle.field?[]:[-52,52])createGroundMark(root,{name:'ローダー駐車線',x,z:-80,width:.6,depth:120,color:0xdaba68,y:.1});
  function sign(text,x,y,z,w,rotation=0){const c=document.createElement('canvas');c.width=768;c.height=128;const g=c.getContext('2d');g.fillStyle='#342b3d';g.fillRect(0,0,768,128);g.strokeStyle='#ddc17c';g.lineWidth=5;g.strokeRect(3,3,762,122);g.font='bold 52px system-ui';g.fillStyle='#fff0d0';g.textAlign='center';g.textBaseline='middle';g.fillText(text,384,64,735);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const geom=new THREE.PlaneGeometry(w,w/6),m=new THREE.MeshBasicMaterial({map:t});for(const side of[-1,1]){const p=new THREE.Mesh(geom,m);p.position.set(x+side*.04*Math.sin(rotation),y,z+side*.04*Math.cos(rotation));p.rotation.y=rotation+(side<0?Math.PI:0);root.add(p);}}
  const supply=state?sharedSupply(state.loader.vehicle,'material-store'):null;
  if(supply){
    const loading=soilReceiver(state);
    for(const side of [-1,1]){
      createGroundMark(root,{name:'土の積込枠',x:loading.x+side*23,z:loading.z,width:2,depth:52,color:0xf0c36d,y:.16});
      createGroundMark(root,{name:'土の積込枠',x:loading.x,z:loading.z+side*26,width:48,depth:2,color:0xf0c36d,y:.16});
    }
  }else{
    sign('アマネ星土 ・ 保管口',68,14,-65.8,18);
    sign('アマネ星土を敷いて 高くジャンプ',0,12,150,164);
    sign('頭上注意',-155,54,179,66);
  }
  const loader=createLoader();loader.userData.work.soil.material.color.set(0x705067);root.add(loader);
  const patches=new THREE.Group();root.add(patches);
  const ghost=new THREE.Mesh(new THREE.BoxGeometry(32,.18,32),new THREE.MeshBasicMaterial({color:0x44c8a7,wireframe:true,transparent:true,opacity:.9,depthWrite:false}));root.add(ghost);
  const air=new THREE.InstancedMesh(cube,purple,256);air.name='移送中のアマネ星土';air.count=0;air.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(air);const tileMatrix=new THREE.Matrix4();
  root.userData={loader,store,patches,ghost,air,tileMatrix,cube,stamp:null,ghostStamp:null,box,purple,rake};return root;
}
function bedMesh(d,p,material=d.purple){
  const rects=soilBedRects(p),mesh=new THREE.InstancedMesh(d.cube,material,rects.length),m=new THREE.Matrix4();
  mesh.name='敷いたアマネ星土';mesh.castShadow=mesh.receiveShadow=true;
  rects.forEach((r,i)=>{m.makeScale(r.width,2,r.depth);m.setPosition(r.x,r.y+1,r.z);mesh.setMatrixAt(i,m);});mesh.computeBoundingSphere();return mesh;
}
// A transfer owns its accepted patch even after load/recovery changes the live inventory.
export function soilPlacementPreview(s,options){
 const kind=s.task?.kind,patch=['lay','recover'].includes(kind)?s.task.patch:null;
 const candidate=patch??(options.recover&&!options.lay?s.patches.find(p=>p.id===options.recoverId):options.target);
 return{candidate,color:kind==='lay'||options.lay?0x44c8a7:kind==='recover'||options.recover?0xe0ba68:0xb78bb0};
}
export function updateWorldSoilModel(root,s,active,external=[],ground=null,heightAt=null,preview=null,nativeCargo=0){const d=root.userData,stamp=s.patches;
  d.store?.userData.setStock(s.stock);
  if(stamp!==d.stamp){d.stamp=stamp;for(const m of [...d.patches.children]){d.patches.remove(m);m.dispose?.();}for(const p of s.patches){if(p.heights)d.patches.add(bedMesh(d,p));else{d.box(d.patches,'敷いたアマネ星土',p.x,(p.baseY??0)+1,p.z,32,2,32,d.purple);for(let i=-1;i<=1;i++)d.box(d.patches,'ならした土の筋',p.x+i*8,(p.baseY??0)+2.025,p.z,.3,.05,31,d.rake);}}}
  const transfer=soilTransferVisual(s,ground),ease=s.task?Math.sin(Math.PI*s.task.elapsed/2):0;
  d.loader.userData.work.soil.material.color.set(nativeCargo?0x8e6846:0x705067);
  updateLoaderModel(d.loader,s.loader.vehicle,{steps:s.loader.mode==='driving'?0:1,bucket:{lift:ease*.45,tilt:ease*.62},load:nativeCargo?Math.ceil(nativeCargo/4):transfer.bucket,ground});
  d.air.visible=transfer.tiles.length>0;d.air.count=transfer.tiles.length;transfer.tiles.forEach((p,i)=>{d.tileMatrix.makeScale(p.width,p.height,p.depth);d.tileMatrix.setPosition(p.x,p.y,p.z);d.air.setMatrixAt(i,d.tileMatrix);});if(d.air.count){d.air.instanceMatrix.needsUpdate=true;d.air.computeBoundingSphere();}
  if(!active||s.loader.mode!=='driving'||nativeCargo||preview?.rain){d.ghost.visible=false;return;}
  const a=preview??soilCopyOptions(s,external,heightAt),placement=soilPlacementPreview(s,a),candidate=placement.candidate;if(!candidate){d.ghost.visible=false;return;}const ghostStamp=JSON.stringify(candidate);
  if(ghostStamp!==d.ghostStamp){d.ghostStamp=ghostStamp;const old=d.ghost;root.remove(old);if(old.isInstancedMesh)old.dispose();else old.geometry.dispose();const material=old.material;
    d.ghost=candidate.heights?bedMesh(d,candidate,material):new THREE.Mesh(new THREE.BoxGeometry(32,.18,32),material);d.ghost.name='土を敷く場所';root.add(d.ghost);
    d.ghost.castShadow=d.ghost.receiveShadow=false;
    if(!candidate.heights)d.ghost.position.set(candidate.x,(candidate.baseY??0)+2.2,candidate.z);
    else d.ghost.position.y=.2;
  }
  d.ghost.visible=true;d.ghost.material.color.set(placement.color);

}
