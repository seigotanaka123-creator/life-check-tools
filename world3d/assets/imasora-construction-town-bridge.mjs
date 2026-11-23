import {createTownDetails}from './imasora-town-detail.mjs?v=121cz';
import * as T from './three.module.min.js';
import {createTownBridge} from './imasora-town-bridge.mjs?v=120mt';
import {eveningLight,WARM_LIGHT} from './imasora-evening-light.mjs?v=120mx';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs';

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

function shadeCreek(water){
 water.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
    varying vec2 creekPoint;`).replace('#include <project_vertex>',`
    creekPoint=(modelMatrix*vec4(transformed,1.)).xz;
    #include <project_vertex>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
    varying vec2 creekPoint;`).replace('#include <color_fragment>',`#include <color_fragment>
    float bank=smoothstep(16.,25.,abs(creekPoint.y+1825.));
    float wave=sin(creekPoint.x*.11+creekPoint.y*.43+sin(creekPoint.x*.033)*1.7);
    float runnel=sin(creekPoint.x*.03-creekPoint.y*.92+sin(creekPoint.x*.057)*2.2);
    float glint=smoothstep(.96,1.72,wave+runnel);
    float shallow=.87+bank*.20;
    diffuseColor.rgb=diffuseColor.rgb*shallow+vec3(.045,.075,.076)*glint;
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 creekRipple=mat3(viewMatrix)*vec3(wave*.045,0.,runnel*.091);
    normal=normalize(normal+creekRipple);
    `);
 };
 water.customProgramCacheKey=()=> 'construction-creek-water';
}

export function createConstructionTownBridge({collider=()=>{},surface=()=>{}}={}){
 const b=CONSTRUCTION_BRIDGE,group=new T.Group();group.name='construction-town-connection';
 const bridge=createTownBridge({x:b.x,z:b.z,id:'construction-town-bridge',collider,surface});group.add(bridge.group);
 const geometries=new Set(),materials=new Set(),textures=new Set(),mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.88,...extra});materials.add(m);return m;};
 const road=mat(0xd7c1a0),walkway=mat(0xb2ac96),stone=mat(0xa39988),grass=mat(0x839a70),water=mat(0x6fa4ad,{metalness:.13,roughness:.31});
 const windows=mat(0x536b79,{metalness:.28,roughness:.19,emissive:WARM_LIGHT.halo,emissiveIntensity:0});
 const frame=mat(0xdad1be),foundation=mat(0x8e8778),joinery=mat(0x52636c,{metalness:.24,roughness:.58}),door=mat(0x584632),clay=mat(0x9a795c);
 const foliage=mat(0x76905a),tallFoliage=mat(0x56764e),bark=mat(0x786044),bench=mat(0x9a7753);
 const box=(w,h,d,x,y,z,m)=>{const g=new T.BoxGeometry(w,h,d);geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;group.add(o);return o;};
 // The creek is outside playable land. Neither the excavation ground nor any
 // existing works are cut out or flattened to draw this scenery.
 const bank=box(1110,3,650,b.x,-1.52,-2175,grass);
 box(1600,1,50,b.x,-.8,-1825,water);
 shadeCreek(water);
 const bankDetail=coastSurfaceTexture('foliage');bankDetail.repeat.set(9,5);
 for(let i=0;i<bankDetail.image.data.length;i+=4){
  const tone=.52*bankDetail.image.data[i]+117;
  bankDetail.image.data[i]=bankDetail.image.data[i+1]=bankDetail.image.data[i+2]=tone;
 }
 grass.map=bankDetail;grass.bumpMap=bankDetail;grass.bumpScale=.12;textures.add(bankDetail);
 const rockDetail=coastSurfaceTexture('stone');rockDetail.repeat.set(5,2);
 stone.map=rockDetail;stone.bumpMap=rockDetail;stone.bumpScale=.28;textures.add(rockDetail);
 bank.name='town-riverside-gardens';
 box(66,.2,150,b.x,.05,-1925,road);box(66,.2,45,b.x,.05,-1567.5,road);
 for(const x of[b.x-43,b.x+43])box(12,10,50,x,-5,-1825,stone);

 const paints=[0xdfd4bb,0xb9c1a5,0xc09371,0xaab9bd,0xd2b9a0].map(c=>mat(c));
 const roofs=[0x455e68,0x8a5749,0x54605b,0x6d6660,0x656f83].map(c=>mat(c));
 const stucco=new Uint8Array(64*64*4),siding=new Uint8Array(64*64*4);
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const noise=((Math.imul(x+19,7141)^Math.imul(y+29,3187))>>>0)%23;
  const pos=(y*64+x)*4;
  stucco.set([226+noise,226+noise,226+noise,255],pos);
  const shade=y%8===0?133:y%8===1?190:217+noise;
  siding.set([shade,shade,shade,255],pos);
 }
 for(const [data,weatherboards] of [[stucco,false],[siding,true]]){
  const tex=new T.DataTexture(data,64,64,T.RGBAFormat);
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(2,3);
  tex.colorSpace=T.SRGBColorSpace;tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;
  tex.generateMipmaps=true;tex.needsUpdate=true;textures.add(tex);
  for(const [i,m] of paints.entries())if((i===1||i===3)===weatherboards){m.map=tex;m.bumpMap=tex;m.bumpScale=weatherboards?.23:.085;}
 }
 const cube=new T.BoxGeometry(1,1,1),trunk=new T.CylinderGeometry(.35,.56,1,8),crown=new T.IcosahedronGeometry(1,2);
 for(const g of [cube,trunk,crown])geometries.add(g);
 const crownSkin=crown.attributes.position;
 for(let i=0;i<crownSkin.count;i++){
  const x=crownSkin.getX(i),y=crownSkin.getY(i),z=crownSkin.getZ(i);
  const scale=1+.12*Math.sin(x*11+y*7)*Math.cos(z*10-y*6);
  crownSkin.setXYZ(i,x*scale,y*scale,z*scale);
 }
 const batches=new Map(),row=(m,p,g=cube)=>{const key=m.id+'/'+g.id;if(!batches.has(key))batches.set(key,{m,g,rows:[]});batches.get(key).rows.push(p);};
 const houses=[];
 for(let i=0;i<20;i++){
  const side=i<10?-1:1,n=i%10,style=(i*3+Math.floor(i/5))%5;
  const x=b.x+side*(95+(n%5)*98)+(n%3-1)*3,z=-1990-Math.floor(n/5)*165;
  const h=[30,48,35,56,42][style],w=[59,71,77,64,68][style],d=[55,58,66,61,59][style],front=z+d/2;
  const paint=paints[style],roof=roofs[style],roofPitch=[.55,.35,.43,.29,.48][style];
  row(paint,{x,y:h/2,z,w,h,d});houses.push({x,z,h,w,d,roofMaterial:roof,roofPitch});
  row(foundation,{x,y:1.7,z,w:w+1,h:3.4,d:d+1});
  for(const dx of[-w*.28,0,w*.28])for(let y=11;y<h-6;y+=15){
   if(dx===0&&(y===11||style===4))continue;
   row(joinery,{x:x+dx,y,z:front+.24,w:11.7,h:12.4,d:.42});
   row(windows,{x:x+dx,y,z:front+.53,w:9.1,h:10.1,d:.22});
   row(frame,{x:x+dx,y:y-5.9,z:front+1.1,w:13.8,h:1.07,d:2.4});
   row(frame,{x:x+dx,y,z:front+.72,w:.48,h:10.7,d:.36});
   if(style!==4)row(frame,{x:x+dx,y:y+1.6,z:front+.72,w:9.55,h:.48,d:.36});
   if((style===0||style===2)&&dx!==0)for(const slot of[-1,1])row(paint,{x:x+dx+slot*6.55,y,z:front+.55,w:2.6,h:10.3,d:.55});
  }
  row(door,{x,y:7,z:front+.66,w:8.3,h:13.4,d:.55});
  for(const dx of [-4.9,4.9])row(frame,{x:x+dx,y:7,z:front+.7,w:.9,h:14.4,d:.7});
  row(frame,{x,y:14.2,z:front+.7,w:10.7,h:.9,d:.7});
  row(foundation,{x,y:.65,z:front+2.9,w:16,h:1.3,d:6});
  row(walkway,{x,y:.13,z:front+8,w:9,h:.24,d:12});
  if(style===1||style===2){
   row(roof,{x,y:15.9,z:front+4,w:21,h:1.2,d:9});
   for(const dx of [-9,9])row(joinery,{x:x+dx,y:7.9,z:front+7.4,w:1,h:15.8,d:1});
  }
  row(windows,{x,y:10.7,z:front+1,w:5.8,h:4.2,d:.15});row(joinery,{x:x+2.4,y:6,z:front+1.25,w:.5,h:1.8,d:.6});
  if(style===0||style===3)for(const dx of[-w/2+.5,w/2-.5])row(frame,{x:x+dx,y:h/2,z:front+.8,w:1.2,h:h-1,d:1.1});
  if(style===3)for(let y=18;y<h-6;y+=15)row(frame,{x,y,z:front+.85,w:w-1,h:.72,d:.9});
  for(const dx of[-w*.33,w*.33]){
   row(clay,{x:x+dx,y:1.42,z:front+4,w:14.4,h:2.8,d:4});
   row(foliage,{x:x+dx,y:2.8,z:front+4,w:6.2,h:2.1,d:1.8},crown);
  }
 }

 // Riverfront gardens face the bridge. Narrow footpaths, low walls and
 // terraces connect entries without suggesting a continuation for machines.
 for(const side of [-1,1]){
  const x=b.x+side*282;
  for(const z of [-1939,-2103])row(walkway,{x,y:.11,z,w:468,h:.19,d:9});
  for(const z of [-1914,-2115]){
   row(walkway,{x:b.x+side*67,y:.17,z,w:59,h:.32,d:19});
   row(bench,{x:b.x+side*75,y:2.3,z:z+6,w:18,h:1.55,d:4.1});
   for(const dx of [-6,6])row(joinery,{x:b.x+side*75+dx,y:1.1,z:z+6,w:.85,h:2.2,d:2.9});
  }
  row(stone,{x,y:1.2,z:-1852,w:463,h:2.35,d:6.5});
  row(frame,{x,y:2.6,z:-1852,w:460,h:.58,d:7.4});
  for(let i=0;i<11;i++){
   const tx=b.x+side*(64+i*43),tz=i%2===0?-1880-((i*17)%28):-2035-((i*11)%26),h=15+(i*7%16);
   row(bark,{x:tx,y:h*.47,z:tz,w:3.2,h:h*.95,d:3.2},trunk);
   for(let j=0;j<5;j++){
    const a=i*2.4+j*2.4,r=j?4.8+(j%3)*1.3:0;
    row((i+j)%3===0?foliage:tallFoliage,{x:tx+Math.sin(a)*r,y:h+(j%3)*3,z:tz+Math.cos(a)*r,w:7.5+j%2*2,h:6.2+j%3,d:7.4+j%3},crown);
   }
  }
 }

 const matrix=new T.Matrix4();
 for(const{m,g,rows}of batches.values()){
  const mesh=new T.InstancedMesh(g,m,rows.length);
  mesh.name=m===windows?'construction-town-front-windows':m===foliage||m===tallFoliage?'construction-town-gardens':'construction-town-architecture';
  rows.forEach((r,i)=>{matrix.makeScale(r.w,r.h,r.d);matrix.setPosition(r.x,r.y,r.z);mesh.setMatrixAt(i,matrix);});
  mesh.computeBoundingSphere();group.add(mesh);
 }
 // Original staggered slate, rather than wooden roof grain. The texture is
 // local to this construction backdrop and cannot change other maps' homes.
 const tilePixels=new Uint8Array(128*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const rowIndex=Math.floor(y/16),edge=y%16<1||(x+(rowIndex%2)*16)%32<1;
  const noise=((Math.imul(x+17,1973)^Math.imul(y+31,9277))>>>0)%17;
  const n=edge?95:195+noise+(y%16)*1.5;tilePixels.set([n,n,n,255],(y*128+x)*4);
 }
 const tileMap=new T.DataTexture(tilePixels,128,128);tileMap.wrapS=tileMap.wrapT=T.RepeatWrapping;tileMap.repeat.set(3,3);tileMap.minFilter=T.LinearMipmapLinearFilter;tileMap.magFilter=T.LinearFilter;tileMap.generateMipmaps=true;tileMap.colorSpace=T.SRGBColorSpace;tileMap.needsUpdate=true;textures.add(tileMap);
 for(const roof of roofs){roof.map=roof.bumpMap=tileMap;roof.bumpScale=.16;roof.roughness=.84;}
 const townDetails=createTownDetails({houses,roofMaterial:roofs[0],roofs:true});group.add(townDetails.group);
 let last=-Infinity,disposed=false;
 return {group,bridge,update(date=new Date()){if(disposed||Math.abs(+date-last)<10000)return;last=+date;townDetails.update(date);windows.emissiveIntensity=eveningLight(date).strength*1.35;},dispose(){if(disposed)return;disposed=true;townDetails.dispose();bridge.dispose();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}};
}
