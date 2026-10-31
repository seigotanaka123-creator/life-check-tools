import {createTownDetails}from './imasora-town-detail.mjs?v=120pr';
import * as T from './three.module.min.js';
import {createTownBridge} from './imasora-town-bridge.mjs?v=120mt';
import {eveningLight,WARM_LIGHT} from './imasora-evening-light.mjs?v=120mx';

// North boundary, east of every possible north-west parking/facility footprint.
// Saved works and saved player positions remain in their existing coordinates.
export const CONSTRUCTION_BRIDGE=Object.freeze({x:-1150,z:-1720,halfX:33,halfZ:130,endZ:-1750,startZ:-1560});
export function constructionTownArrival(){return{x:CONSTRUCTION_BRIDGE.x,y:0,z:CONSTRUCTION_BRIDGE.startZ,heading:0};}
export function constructionBridgeEdge(x,z,margin=0){const b=CONSTRUCTION_BRIDGE;return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x-b.x)<=29+margin&&z<=b.endZ+margin&&z>=b.z-b.halfZ-28-margin;}
export function createConstructionBridgeGate(){
 let latched=false,initialized=false;
 return {latch(){latched=true;},update({map,x,z,blocked=false,airborne=false}){
  if(map!=='construction'){initialized=latched=false;return false;}
  if(!initialized){initialized=true;latched=constructionBridgeEdge(x,z);return false;}
  if(latched){if(!constructionBridgeEdge(x,z,44))latched=false;return false;}
  if(blocked||airborne||!constructionBridgeEdge(x,z))return false;
  latched=true;return true;
 }};
}

export function createConstructionTownBridge({collider=()=>{},surface=()=>{}}={}){
 const b=CONSTRUCTION_BRIDGE,group=new T.Group();group.name='construction-town-connection';
 const bridge=createTownBridge({x:b.x,z:b.z,id:'construction-town-bridge',collider,surface});group.add(bridge.group);
 const geometries=new Set(),materials=new Set(),mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.88,...extra});materials.add(m);return m;};
 const road=mat(0xe9dbbd),stone=mat(0xc7c1ae),grass=mat(0x8fae8e),roof=mat(0x567c8c),water=mat(0x87bac4,{metalness:.18,roughness:.34});
 const windows=mat(0xc6dce1,{emissive:WARM_LIGHT.halo,emissiveIntensity:0});
 const box=(w,h,d,x,y,z,m)=>{const g=new T.BoxGeometry(w,h,d);geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;group.add(o);return o;};
 // The creek is outside playable land. Neither the excavation ground nor any
 // existing works are cut out or flattened to draw this scenery.
 box(1600,1,50,b.x,-.8,-1825,water);
 box(1000,3,640,b.x,-2,-2180,grass);
 box(66,.2,150,b.x,.05,-1925,road);box(66,.2,45,b.x,.05,-1567.5,road);
 for(const x of[b.x-43,b.x+43])box(12,10,50,x,-5,-1825,stone);
 const paints=[0xeee1cf,0xd9e4d3,0xf2d7c7,0xc2d7df,0xe6dfe9].map(c=>mat(c));
 const batches=new Map(),row=(m,p)=>{if(!batches.has(m))batches.set(m,[]);batches.get(m).push(p);};
 const houses=[];
 for(let i=0;i<20;i++){
  const side=i<10?-1:1,n=i%10,x=b.x+side*(95+(n%5)*98),z=-1990-Math.floor(n/5)*165,h=38+(i%4)*12;
  row(paints[i%paints.length],{x,y:h/2,z,w:68,h,d:62});houses.push({x,z,h});
  for(const dx of[-20,0,20])for(const y of[11,27]){if(dx===0&&y===11)continue;row(windows,{x:x+dx,y,z:z+31.3,w:10,h:11,d:.4});}
 }
 const matrix=new T.Matrix4();
 for(const[m,rows]of batches){const g=new T.BoxGeometry(1,1,1);geometries.add(g);const mesh=new T.InstancedMesh(g,m,rows.length);if(m===windows)mesh.name="construction-town-front-windows";rows.forEach((r,i)=>{matrix.makeScale(r.w,r.h,r.d);matrix.setPosition(r.x,r.y,r.z);mesh.setMatrixAt(i,matrix);});group.add(mesh);}
 const townDetails=createTownDetails({houses,wallMaterials:paints,roofMaterial:roof,roofs:true,front:true,streets:[{x:b.x,z:-1940,w:1040,d:25},{x:b.x,z:-2105,w:1040,d:25}]});group.add(townDetails.group);
 let last=-Infinity,disposed=false;
 return {group,bridge,update(date=new Date()){if(disposed||Math.abs(+date-last)<10000)return;last=+date;townDetails.update(date);windows.emissiveIntensity=eveningLight(date).strength*1.65;},dispose(){if(disposed)return;disposed=true;townDetails.dispose();bridge.dispose();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
