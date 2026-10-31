import {FRUITS,islandTreeRecords,fruitLanding} from './imasora-coast-tree-fruits.mjs?v=120ne';
import {buildIslandTerrain,finishIslandTerrain} from './imasora-coast-island-terrain.mjs?v=120mu';
import {islandRockRecords,readCoastPebbles} from './imasora-coast-pebble-crabs.mjs?v=120nd';
import * as T from './three.module.min.js';
import {COAST_ISLANDS,islandRelief} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs?v=120mt';
// Alpha-tested leaf sprays keep the crown open, with visible branches and sky gaps.
function leafSpray(){const size=128,data=new Uint8Array(size*size*4);for(let n=0;n<160;n++){const a=n*2.399,r=Math.sqrt(rnd(n+34))*.43,cx=.5+Math.cos(a)*r,cy=.5+Math.sin(a)*r,rx=.022+rnd(n+20)*.025,ry=.018+rnd(n+90)*.025;for(let y=Math.max(0,Math.floor((cy-ry)*size));y<Math.min(size,(cy+ry)*size);y++)for(let x=Math.max(0,Math.floor((cx-rx)*size));x<Math.min(size,(cx+rx)*size);x++){const d=((x/size-cx)/rx)**2+((y/size-cy)/ry)**2;if(d>1)continue;const k=(y*size+x)*4,v=150+rnd(n+99)*90;data[k]=v*.85;data[k+1]=v;data[k+2]=v*.71;data[k+3]=255;}}const t=new T.DataTexture(data,size,size,T.RGBAFormat);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;}
const fract=x=>x-Math.floor(x),rnd=n=>fract(Math.sin(n*127.13+43.91)*43758.5453);
export const ISLAND_SIGHT=Object.freeze({full:9000,hidden:17000,detailNear:4300,detailFar:5200});
export function coastIslandVisibility(i,point,detail){
 const gap=Math.hypot(point.x-i.x,point.z-i.z)-Math.max(i.rx,i.rz);
 return {sight:1-T.MathUtils.smoothstep(gap,ISLAND_SIGHT.full,ISLAND_SIGHT.hidden),detail:detail?1-T.MathUtils.smoothstep(gap,ISLAND_SIGHT.detailNear,ISLAND_SIGHT.detailFar):0};
}
// Fixed pixel coverage fades opaque land without transparency sorting or
// depth fighting. Both LODs use complementary masks, not two blended floors.
// The mask is spatial only: a stationary camera never animates or blinks it.
function islandHaze(material,sight,detail,far=false){
 material.onBeforeCompile=shader=>{
  shader.uniforms.islandSight=sight;shader.uniforms.islandDetail=detail;shader.uniforms.islandFar={value:far?1:0};
  shader.fragmentShader='uniform float islandSight,islandDetail,islandFar;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float islandPixel=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));
   if(islandPixel>=islandSight)discard;
   if(islandFar>.5 ? islandPixel<islandDetail : islandPixel>=islandDetail)discard;`);
  // Keep the existing real-time sky/fog colour. Only the islands' haze range
  // changes; the shore, water and close depth precision remain untouched.
  shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',T.ShaderChunk.fog_fragment.replace('fogNear, fogFar','(fogFar <= 600.0 ? fogNear : 1800.0), (fogFar <= 600.0 ? fogFar : 10500.0)'));
 };
 material.customProgramCacheKey=()=> 'coast-island-haze-120nc';
 return material;
}
export function createIslandLandscapes({collider=()=>{},now=()=>performance.now(),budgetMs=1.5,pebbleState}={}){
 const root=new T.Group(),geometries=new Set(),materials=new Set(),textures=new Set(),islands=[];
 const texture=coastSurfaceTexture('foliage');textures.add(texture);
 const grit=new Uint8Array(128*128*4);for(let k=0;k<128*128;k++){const v=235+rnd(k)*20;grit[k*4]=grit[k*4+1]=grit[k*4+2]=v;grit[k*4+3]=255;}const grain=new T.DataTexture(grit,128,128);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.colorSpace=T.SRGBColorSpace;grain.needsUpdate=true;textures.add(grain);
 const terrainMaterial=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.98,map:grain,bumpMap:texture,bumpScale:.65});materials.add(terrainMaterial);
 const bark=coastSurfaceTexture('wood');textures.add(bark);
 const trunkMat=new T.MeshStandardMaterial({color:0x745c43,map:bark,roughness:1});materials.add(trunkMat);
 const spray=leafSpray();textures.add(spray);const leafMat=new T.MeshStandardMaterial({color:0xffffff,map:spray,roughness:.94,alphaTest:.45,side:T.DoubleSide});materials.add(leafMat);
 const fruitGeo=new T.SphereGeometry(4.5,8,6),fruitMat=new T.MeshStandardMaterial({color:0xffffff,roughness:.6});geometries.add(fruitGeo);materials.add(fruitMat);islandHaze(fruitMat,{value:1},{value:1});
 const stoneMat=new T.MeshStandardMaterial({color:0xb5b8ad,map:texture,roughness:.96});materials.add(stoneMat);
 for(const m of[terrainMaterial,trunkMat,leafMat,stoneMat])islandHaze(m,{value:1},{value:1});
 const treeGeo=new T.CylinderGeometry(.7,2.5,1,7),leafGeo=new T.PlaneGeometry(1,1),stoneGeo=new T.SphereGeometry(1,10,7);
 for(const [g,k]of[[stoneGeo,9]]){const a=g.attributes.position;for(let n=0;n<a.count;n++){const x=a.getX(n),y=a.getY(n),z=a.getZ(n),r=1+.16*Math.sin(x*7+k)*Math.cos(y*9-k)+.1*Math.sin(z*13+y*8);a.setXYZ(n,x*r,y*r,z*r);}g.computeVertexNormals();}for(const g of[treeGeo,leafGeo,stoneGeo])geometries.add(g);
 // The existing initial renderer.compile traverses hidden objects too. Keep
 // tiny instances of the three shader variants so arrival does not compile a
 // new tree/leaf/rock program while the player is steering. They never render.
 const warmup=new T.Group();warmup.name='island-shader-warmup';warmup.visible=false;
 for(const [g,m,colored]of[[treeGeo,trunkMat,false],[leafGeo,leafMat,true],[fruitGeo,fruitMat,true],[stoneGeo,stoneMat,false]]){const o=new T.InstancedMesh(g,m,1);if(colored)o.setColorAt(0,new T.Color(0xffffff));warmup.add(o);}root.add(warmup);
 for(const i of COAST_ISLANDS){
  const group=new T.Group();group.position.set(i.x,0,i.z);group.name=i.name;root.add(group);
  const sight={value:0},blend={value:0},farMat=islandHaze(terrainMaterial.clone(),sight,blend,true);materials.add(farMat);
  const close=new T.Group(),farGeo=finishIslandTerrain(i,28),far=new T.Mesh(farGeo,farMat);geometries.add(farGeo);group.add(close,far);
  const title=new T.Group();title.name=i.name;title.position.set(0,islandRelief(i,i.x,i.landingZ),i.landingZ-i.z);title.userData.nearbyName={id:'coast:'+i.id,name:i.name,hx:150,hz:150,height:42};group.add(title);
  const trees=islandTreeRecords(i);
  // Boulder fields follow the coast, not a row of identical polygonal stones.
  const stones=islandRockRecords(i);
  // Physics is registered once, before the first playable frame, independently
  // of rendering detail or its cache. Unloading a tree can never remove a wall.
  for(const [n,t]of trees.entries())collider(i.x+t.x,i.z+t.z,[5,5],0,'coast-tree-'+i.id+'-'+n,0,{minY:t.y,maxY:t.y+t.h,obstacleHeight:t.y+t.h});
  for(const p of stones){p.solid=collider(p.worldX,p.worldZ,[p.w*1.6,p.w*1.3],0,p.id,0,{minY:p.y,maxY:p.y+p.h*1.4,obstacleHeight:p.y+p.h*1.4});p.home={x:p.x,y:p.y,z:p.z};}
  islands.push({i,close,far,group,trees,stones,sight,blend,detail:null,lastUsed:0});
 }

 let pending=null,disposed=false,stamp=0,fruitSource=null,fruitCycle=0,fruitSeasonKey='';const pickedTrees=new Set(),treeBases=new Map();
 const radius=e=>Math.max(e.i.rx,e.i.rz);
 const distance=(e,p)=>Math.hypot(p.x-e.i.x,p.z-e.i.z);
 const release=e=>{if(!e.detail)return;for(const t of e.trees)treeBases.delete(t.id);for(const o of e.detail.meshes)o.dispose?.();e.detail.geometry.dispose();for(const m of e.detail.materials){m.dispose();materials.delete(m);}e.close.clear();e.detail=null;};
 function* detail(e){
  const {i,trees,stones}=e,close=new T.Group(),meshes=[],detailMaterials=[];let geometry,complete=false;
  const own=base=>{const m=islandHaze(base.clone(),e.sight,e.blend);detailMaterials.push(m);materials.add(m);return m;};
  try{
   geometry=yield* buildIslandTerrain(i,112);const land=new T.Mesh(geometry,own(terrainMaterial));land.receiveShadow=true;close.add(land);yield;
  const trunks=new T.InstancedMesh(treeGeo,own(trunkMat),trees.length*5),leaves=new T.InstancedMesh(leafGeo,own(leafMat),trees.length*28),pose=new T.Object3D(),col=new T.Color();
  meshes.push(trunks,leaves);yield;
  for(const [n,t]of trees.entries()){
   pose.position.set(t.x,t.y+t.h*.5,t.z);pose.scale.set(1,t.h,1);pose.rotation.set(0,0,(rnd(n)-.5)*.08);pose.updateMatrix();trunks.setMatrixAt(n*5,pose.matrix);
   for(let branch=0;branch<4;branch++){
    const a=branch*2.399+n*.41,base=new T.Vector3(t.x,t.y+t.h*(.42+branch*.09),t.z),tip=new T.Vector3(t.x+Math.cos(a)*20,t.y+t.h*(.74+branch*.06),t.z+Math.sin(a)*20),delta=tip.clone().sub(base);
    pose.position.copy(base).addScaledVector(delta,.5);pose.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());pose.scale.set(.35,delta.length(),.35);pose.updateMatrix();trunks.setMatrixAt(n*5+branch+1,pose.matrix);
    for(let j=0;j<7;j++){const r=9+rnd(n*19+j)*9,b=j*2.399+branch;
     pose.position.set(tip.x+Math.cos(b)*r,tip.y+(rnd(n*17+j+branch)-.35)*18,tip.z+Math.sin(b)*r);pose.scale.set(26+rnd(n*8+j)*14,25+rnd(n*4+j)*15,1);pose.rotation.set((rnd(n+j+branch)-.5)*2.4,b,(rnd(n+j)-.5)*.8);pose.updateMatrix();const k=n*28+branch*7+j;leaves.setMatrixAt(k,pose.matrix);col.setHSL(.23+rnd(n*2+j)*.055,.28+rnd(n+j)*.2,.4+rnd(n*7+j)*.16);leaves.setColorAt(k,col);
    }
   }
   if(n%4===3)yield;
  }close.add(trunks,leaves);trunks.computeBoundingSphere();leaves.computeBoundingSphere();

   const fruits=new T.InstancedMesh(fruitGeo,own(fruitMat),trees.length),fruitRest=new T.Sphere(),fruitBound=new T.Sphere();fruits.name='island-tree-fruits';meshes.push(fruits);if(!fruitGeo.boundingSphere)fruitGeo.computeBoundingSphere();
   for(const t of trees){const landing=fruitLanding(t);for(let j=0;j<1;j++){const a=j*2.1+t.index,dx=j===0&&landing?landing.x-t.worldX:Math.cos(a)*20,dz=j===0&&landing?landing.z-t.worldZ:Math.sin(a)*20;pose.position.set(t.x+dx,t.y+t.h*(.68+j*.065)+4,t.z+dz);pose.rotation.set(0,0,0);pose.scale.setScalar(1);pose.updateMatrix();fruitRest.union(fruitBound.copy(fruitGeo.boundingSphere).applyMatrix4(pose.matrix));pose.scale.setScalar(landing&&fruitSource&&FRUITS.bearing(fruitSource,t.id,fruitCycle)&&!pickedTrees.has(t.id)?1:0);pose.updateMatrix();fruits.setMatrixAt(t.index+j,pose.matrix);fruits.setColorAt(t.index+j,col.set(FRUITS.species(t.id).color));}if(t.index%8===7)yield;}
   fruits.boundingSphere=fruitRest.clone();close.add(fruits);yield;
  const rocks=new T.InstancedMesh(stoneGeo,own(stoneMat),stones.length);meshes.push(rocks);yield;for(const [n,p]of stones.entries()){const w=9+rnd(p.n*4)*19,h=5+rnd(p.n*2)*14;pose.position.set(p.x,p.y+h*.4,p.z);pose.scale.set(w,h,w*.8);pose.rotation.set(.2,p.n,.1);pose.updateMatrix();rocks.setMatrixAt(n,pose.matrix);if(n%8===7)yield;}rocks.computeBoundingSphere();close.add(rocks);

   e.close.add(...close.children.slice());e.detail={geometry,meshes,materials:detailMaterials,rocks,trunks,leaves,fruits,treeBounds:new Map([trunks,leaves,fruits].map(m=>[m,m.boundingSphere.clone()]))};for(const t of trees)setTreeFruit(e,t);complete=true;
  }finally{if(!complete){geometry?.dispose();for(const m of meshes)m.dispose?.();for(const m of detailMaterials){m.dispose();materials.delete(m);}close.clear();}}
 }
 function cancel(){pending?.job.return();pending=null;}
 function request(point){
  if(disposed)return null;
  let wanted=null,best=Infinity;
  for(const e of islands){const d=distance(e,point);if(d<radius(e)+10000&&d<best){best=d;wanted=e;}if(e.detail&&d<radius(e)+ISLAND_SIGHT.detailFar)e.lastUsed=++stamp;}
  if(pending&&pending.entry!==wanted)cancel();
  if(wanted&&!wanted.detail&&!pending){
   // At most two detailed islands, including the in-progress one. Old geometry
   // is dropped only when already outside its near view (a third island is far).
   const loaded=islands.filter(e=>e.detail).sort((a,b)=>a.lastUsed-b.lastUsed);
   while(loaded.length>=2)release(loaded.shift());
   pending={entry:wanted,job:detail(wanted)};
  }
  return wanted;
 }
 function visibility(point){for(const e of islands){const v=coastIslandVisibility(e.i,point,!!e.detail);e.sight.value=v.sight;e.blend.value=v.detail;e.group.visible=v.sight>0;e.close.visible=!!e.detail&&v.detail>0;e.far.visible=v.detail<1;}}
 function update(point){
  if(disposed||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return;
  request(point);const start=now();let slices=0;
  while(pending&&slices++<32){const result=pending.job.next();if(result.done){pending.entry.lastUsed=++stamp;pending=null;break;}if(now()-start>=budgetMs)break;}
  visibility(point);
 }
 // Existing cooperative scene loading drains only the island being resumed.
 // No low-detail floor is shown underneath a player resuming on a high ridge.
 function* prepare(point){
  if(disposed||!point||!Number.isFinite(point.x)||!Number.isFinite(point.z))return;
  const wanted=request(point);if(!wanted||distance(wanted,point)>=radius(wanted)+4300){visibility(point);return;}
  while(!disposed&&pending?.entry===wanted){const result=pending.job.next();if(result.done){wanted.lastUsed=++stamp;pending=null;break;}yield;}
  visibility(point);
 }
 const pebblePose=new T.Object3D();
 function slideStone(id,delta){
  for(const e of islands){const p=e.stones.find(p=>p.id===id);if(!p)continue;
   const x=p.home.x+delta.x,y=p.home.y+delta.y,z=p.home.z+delta.z,dx=x-p.x,dy=y-p.y,dz=z-p.z;p.x=x;p.y=y;p.z=z;p.worldX=e.i.x+x;p.worldZ=e.i.z+z;
   if(p.solid){const c=p.solid;c.x+=dx;c.z+=dz;c.minY+=dy;c.maxY+=dy;c.obstacleHeight+=dy;for(const v of c.polygon??[]){v.x+=dx;v.z+=dz;}}
   if(e.detail){pebblePose.position.set(x,y+p.h*.4,z);pebblePose.scale.set(p.w,p.h,p.w*.8);pebblePose.rotation.set(.2,p.n,.1);pebblePose.updateMatrix();e.detail.rocks.setMatrixAt(p.index,pebblePose.matrix);e.detail.rocks.instanceMatrix.needsUpdate=true;e.detail.rocks.boundingSphere=null;}
   return true;
  }return false;
 }
 const pebbles={nearby(point){return islands.flatMap(e=>e.detail&&distance(e,point)<radius(e)+600?e.stones.filter(p=>p.w<=22&&p.h<=18&&Math.hypot(point.x-p.worldX,point.z-p.worldZ)<90):[]);},slide:slideStone};
 // Static forest bounds remain valid for every resting tree. Union only the
 // actual moving instances, rather than making the renderer rescan thousands
 // of leaves after each frame. Include hidden fruit in its resting bound so a
 // later harvest cycle cannot reveal fruit outside a stale culling sphere.
 const shakePivot=new T.Matrix4(),shakeRotation=new T.Matrix4(),shakeBack=new T.Matrix4(),shakeMatrix=new T.Matrix4(),instanceBound=new T.Sphere(),zeroScale=new T.Vector3(0,0,0);
 function refreshTreeBounds(detail,mesh){mesh.boundingSphere.copy(detail.treeBounds.get(mesh));for(const base of treeBases.values())if(base.detail===detail){const set=base.sets.find(s=>s.mesh===mesh);mesh.boundingSphere.union(set.bounds);}}
 function shakeTree(id,angle){const e=islands.find(e=>e.trees.some(t=>t.id===id)),t=e?.trees.find(t=>t.id===id);if(!e?.detail||!t)return;let base=treeBases.get(id);if(!base||base.detail!==e.detail){base={detail:e.detail,sets:[[e.detail.trunks,5],[e.detail.leaves,28],[e.detail.fruits,1]].map(([mesh,count])=>({mesh,count,bounds:new T.Sphere(),matrices:Array.from({length:count},(_,n)=>{const m=new T.Matrix4();mesh.getMatrixAt(t.index*count+n,m);return m;})}))};treeBases.set(id,base);}
  const rotate=shakePivot.makeTranslation(t.x,t.y,t.z).multiply(shakeRotation.makeRotationZ(angle)).multiply(shakeBack.makeTranslation(-t.x,-t.y,-t.z));for(const s of base.sets){s.bounds.makeEmpty();for(let n=0;n<s.count;n++){if(angle===0)shakeMatrix.copy(s.matrices[n]);else shakeMatrix.multiplyMatrices(rotate,s.matrices[n]);if(s.mesh===e.detail.fruits&&pickedTrees.has(id))shakeMatrix.scale(zeroScale);s.mesh.setMatrixAt(t.index*s.count+n,shakeMatrix);s.bounds.union(instanceBound.copy(s.mesh.geometry.boundingSphere).applyMatrix4(shakeMatrix));}s.mesh.instanceMatrix.needsUpdate=true;refreshTreeBounds(e.detail,s.mesh);}if(angle===0)treeBases.delete(id);
 }
 function setTreeFruit(e,t){if(!e.detail)return;const p=fruitLanding(t),mesh=e.detail.fruits;pebblePose.position.set(p?p.x-e.i.x:t.x,t.y+t.h*.68+4,p?p.z-e.i.z:t.z);pebblePose.rotation.set(0,0,0);pebblePose.scale.setScalar(p&&fruitSource&&FRUITS.bearing(fruitSource,t.id,fruitCycle)&&!pickedTrees.has(t.id)?1:0);pebblePose.updateMatrix();mesh.setMatrixAt(t.index,pebblePose.matrix);mesh.instanceMatrix.needsUpdate=true;if(e.detail.treeBounds)mesh.boundingSphere.copy(e.detail.treeBounds.get(mesh));else mesh.boundingSphere=null;}
 function fruitSeason(source,cycle){const key=(source??'')+'|'+FRUITS.seasonAt(cycle);if(key===fruitSeasonKey)return;fruitSeasonKey=key;fruitSource=source??null;fruitCycle=cycle;for(const e of islands)if(e.detail)for(const t of e.trees)setTreeFruit(e,t);}
 const treesAPI={nearby(point,range=70){return islands.flatMap(e=>e.detail&&distance(e,point)<radius(e)+600?e.trees.filter(t=>Math.hypot(point.x-t.worldX,point.z-t.worldZ)<range):[]);},shake:shakeTree,fruitSeason,fruitTaken(id,value){if(pickedTrees.has(id)===value)return;if(value)pickedTrees.add(id);else pickedTrees.delete(id);const e=islands.find(e=>e.trees.some(t=>t.id===id)),t=e?.trees.find(t=>t.id===id);if(e&&t)setTreeFruit(e,t);} };
 for(const p of readCoastPebbles(pebbleState)?.stones??[])slideStone(p.id,p);
 visibility({x:0,z:0});for(const e of islands)e.group.visible=false;
 return{root,update,prepare,pebbles,trees:treesAPI,get detailState(){return{loaded:islands.filter(e=>e.detail).map(e=>e.i.id),pending:pending?.entry.i.id??null,disposed};},dispose(){if(disposed)return;disposed=true;cancel();for(const e of islands)release(e);for(const o of warmup.children)o.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.removeFromParent();}};
}
