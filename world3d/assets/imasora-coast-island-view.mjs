import {createIslandLandscapes} from './imasora-coast-island-landscape.mjs?v=120ne';
import {batchCoastScenery} from './imasora-coast-static-batches.mjs?v=120id';
import {coastTree,coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs?v=120mt';
import {ISLAND_PORT_SOLIDS,ISLAND_PORT_DECKS,COAST_ISLAND_PORTS} from './imasora-coast-island-harbors.mjs?v=120lr';
import {ISLAND_PATH,ISLAND_PATH_SOLIDS} from './imasora-coast-island-path.mjs?v=120li';
import * as T from './three.module.min.js';
import {COAST_ISLANDS} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastHeight} from './imasora-coast-layout.mjs?v=120mx';
export function createCoastIslandView({collider=()=>{},surface=()=>{},pebbleState}={}){
 const root=new T.Group();root.name='沖の島';const geometries=new Set(),materials=new Set();
 const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.85,...extra});materials.add(m);return m;};
 const sand=material(0xffffff,{vertexColors:true}),ivory=material(0xf5e6c6),wood=material(0xb78a61),leaves=material(0x78ae8c),rock=material(0x9caeaa);
 const foliage=coastSurfaceTexture('foliage'),bark=coastSurfaceTexture('wood');leaves.color.setHex(0x67895b);leaves.map=foliage;leaves.bumpMap=foliage;leaves.bumpScale=.8;wood.map=bark;wood.bumpMap=bark;wood.bumpScale=.2;
 const add=(geometry,mat,x,y,z)=>{geometries.add(geometry);const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.receiveShadow=true;root.add(m);return m;};
 const solid=(m,id)=>{m.updateWorldMatrix(true,true);const b=new T.Box3().setFromObject(m),s=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());collider(c.x,c.z,[s.x,s.z],0,'coast-island-'+id,0,{minY:b.min.y,maxY:b.max.y,obstacleHeight:b.max.y});};
 const landscapes=createIslandLandscapes({collider,pebbleState});root.add(landscapes.root);
 // Five real supports, a visible opening, and an open side route. Instancing
 // keeps the small playable extension at two draw calls before scenery batching.
 const natural=ISLAND_PORT_SOLIDS.filter(d=>d.id.startsWith('island-port-uncharted-')),built=ISLAND_PORT_SOLIDS.filter(d=>!natural.includes(d));
 const pathGeo=new T.BoxGeometry(1,1,1),planks=new T.InstancedMesh(pathGeo,wood,(ISLAND_PATH_SOLIDS.length+built.length)),pose=new T.Object3D();geometries.add(pathGeo);
 for(const [i,d]of [...ISLAND_PATH_SOLIDS,...built].entries()){pose.position.set(d.x,(d.minY+d.maxY)/2,d.z);pose.scale.set(d.halfX*2,d.maxY-d.minY,d.halfZ*2);pose.updateMatrix();planks.setMatrixAt(i,pose.matrix);collider(d.x,d.z,[d.halfX*2,d.halfZ*2],0,d.id,0,{minY:d.minY,maxY:d.maxY,obstacleHeight:d.maxY});}
 for(const d of natural){const o=add(pathGeo,rock,d.x,(d.minY+d.maxY)/2,d.z);o.scale.set(d.halfX*2,d.maxY-d.minY,d.halfZ*2);collider(d.x,d.z,[d.halfX*2,d.halfZ*2],0,d.id,0,{minY:d.minY,maxY:d.maxY,obstacleHeight:d.maxY});}
 planks.name=ISLAND_PATH.name;planks.receiveShadow=true;root.add(planks);
 for(const d of [...ISLAND_PATH.decks,...ISLAND_PORT_DECKS])surface({id:d.id,buildingId:'coast-island-path',x:d.x,z:d.z,halfX:d.halfX,halfZ:d.halfZ,height:d.maxY});
 for(const p of COAST_ISLAND_PORTS){const title=new T.Group();title.name=p.name+(p.natural?'の岩場':'の船着き場');title.position.set(p.x,p.y,p.edge+20);title.userData.nearbyName={id:'coast:port:'+p.id,name:title.name,hx:64,hz:40,height:20};root.add(title);}
 // Warm end marks expose the gap without a screen-covering instruction.
 const edge=new T.InstancedMesh(pathGeo,ivory,4);for(const [i,[x,z]]of[[-491,1203],[-491,1237],[-529,1203],[-529,1237]].entries()){pose.position.set(x+COAST_ISLANDS[0].shiftX,10.25,z+COAST_ISLANDS[0].shiftZ);pose.scale.set(2,.5,8);pose.updateMatrix();edge.setMatrixAt(i,pose.matrix);}edge.name='橋の両岸の目印';root.add(edge);
 batchCoastScenery(root,[...root.children],{geometries});
 return{root,update:landscapes.update,prepare:landscapes.prepare,pebbles:landscapes.pebbles,trees:landscapes.trees,dispose(){landscapes.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());foliage.dispose();bark.dispose();root.removeFromParent();}};
}
