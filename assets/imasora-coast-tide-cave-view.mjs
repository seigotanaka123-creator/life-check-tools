import * as T from './three.module.min.js';
import {UNCHARTED_ISLAND as I} from './imasora-coast-geography.mjs?v=120li';
import {createTideCave,CAVE_TOP,onCaveStone} from './imasora-coast-tide-cave.mjs?v=120mx';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs?v=120mt';
export function createTideCaveView({surface=()=>{},collider=()=>{},ceiling=()=>{}}={}){
 const root=new T.Group();root.name='潮の洞窟';root.position.set(I.x,0,I.landingZ);const model=createTideCave(),geometries=new Set(),materials=new Set(),texture=coastSurfaceTexture('foliage');
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,map:texture,bumpMap:texture,bumpScale:.8,roughness:.94,...extra});materials.add(m);return m;},stone=mat(0x8b9fa4),pumice=mat(0xc8cbc0),crystal=mat(0x8ee6de,{emissive:0x67cfc8,emissiveIntensity:.5}),gold=mat(0xf5cd89,{emissive:0xe9a84d,emissiveIntensity:.32});
 const add=(g,m,x,y,z)=>{geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;root.add(o);return o;};
 // Broad side galleries stay dry; the center is a real tidal channel. The roof
 // has openings, so the current camera can see the jumping route from above.
 const rockGeo=new T.SphereGeometry(1,12,8);const pos=rockGeo.attributes.position;for(let n=0;n<pos.count;n++){const x=pos.getX(n),y=pos.getY(n),z=pos.getZ(n),r=1+.09*Math.sin(x*11+y*7)*Math.cos(z*13);pos.setXYZ(n,x*r,y*r,z*r);}rockGeo.computeVertexNormals();
 for(let n=0;n<7;n++)for(const sign of[-1,1]){const z=184+n*58+sign*Math.sin(n*2.1)*10,x=sign*(136+Math.cos(n*3.1+sign)*5),h=56+(n%3)*8,o=add(rockGeo,stone,x,h,z);o.scale.set(36,h+4,42);collider(I.x+x,I.landingZ+z,[60,70],0,'tide-cave-wall-'+n+'-'+sign,0,{minY:5,maxY:h*2,obstacleHeight:h*2});}
 const roofs=[],outline=[[-137,-18],[-112,-40],[101,-34],[137,-14],[129,23],[88,38],[-105,31],[-137,17]],shape=new T.Shape();outline.forEach(([x,z],n)=>n?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const roofGeo=new T.ExtrudeGeometry(shape,{depth:56,bevelEnabled:false,steps:1});roofGeo.rotateX(-Math.PI/2);for(const [n,z]of[208,380,550].entries()){const roof=add(roofGeo,stone,0,102,z);roof.name='洞窟の天井 '+n;roofs.push(roof);const polygon=outline.map(([x,dz])=>({x:I.x+x,z:I.landingZ+z+dz}));ceiling(I.x,I.landingZ+z,[274,80],0,102,'tide-cave-roof-'+n,{polygon});for(const [dx,w,d]of[[0,206,60],[-121,30,30],[121,30,28]])collider(I.x+dx,I.landingZ+z,[w,d],0,'tide-cave-roof-'+n+'-'+dx,0,{minY:102,maxY:158,obstacleHeight:158});surface({id:'tide-cave-roof-'+n,x:I.x,z:I.landingZ+z,halfX:137,halfZ:40,height:158,supportFromAbove:102,polygon});}
 function cutaway(actor,thirdPerson){
  const inside=thirdPerson&&root.visible&&actor&&Math.abs(actor.x-I.x)<110&&actor.z>I.landingZ+125&&actor.z<I.landingZ+700&&actor.y<102;
  // The open section includes the route ahead, not only a pinhole to the actor.
  // No ray casts, transparent overdraw, camera shift or physical roof removal.
  for(const roof of roofs)roof.visible=!inside;
 }
 // Beveled, flat-topped stones: the walkable octagon is the actual mesh top.
 const vertices=[],indices=[];for(const y of[0,-30])for(const [x,z]of CAVE_TOP)vertices.push(x,y,z);vertices.push(0,0,0,0,-30,0);for(let n=0;n<8;n++){const j=(n+1)%8;indices.push(16,j,n,17,n+8,j+8,n,j,j+8,n,j+8,n+8);}const floatingGeo=new T.BufferGeometry();floatingGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));floatingGeo.setIndex(indices);floatingGeo.setAttribute('uv',new T.Float32BufferAttribute(vertices.flatMap((v,n)=>n%3===0?[v/48+.5,vertices[n+2]/46+.5]:[]),2));floatingGeo.computeVertexNormals();
 const floats=model.stones.map(s=>{const mesh=add(floatingGeo,pumice,s.x-I.x,s.y,s.z-I.landingZ),floor={id:s.id,buildingId:'tide-cave',x:s.x,z:s.z,halfX:24,halfZ:23,height:s.y,polygon:CAVE_TOP.map(([x,z])=>({x:s.x+x,z:s.z+z}))};surface(floor);return{mesh,floor,s};});
 // A thin mineral seam is part of each stone, rather than a floating HUD pin.
 // Six instances share one draw call and follow the actual supporting surface.
 const seamVertices=[],seamIndices=[];for(const [x,z]of CAVE_TOP){seamVertices.push(x*.76,.12,z*.76,x*.86,.12,z*.86);}for(let n=0;n<8;n++){const a=n*2,b=((n+1)%8)*2;seamIndices.push(a,b,a+1,a+1,b,b+1);}
 const seamGeo=new T.BufferGeometry();seamGeo.setAttribute('position',new T.Float32BufferAttribute(seamVertices,3));seamGeo.setIndex(seamIndices);seamGeo.computeVertexNormals();geometries.add(seamGeo);
 const seamMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});materials.add(seamMat);const seams=new T.InstancedMesh(seamGeo,seamMat,floats.length);seams.name='浮き石の鉱脈';seams.instanceMatrix.setUsage(T.DynamicDrawUsage);seams.frustumCulled=false;root.add(seams);
 const seamMatrix=new T.Matrix4(),seamColor=new T.Color();let cue={visited:0,running:false,armed:false,complete:false},lastCue='',cueTime=-Infinity;
 const crossing=value=>{const visited=Math.max(0,Math.min(floats.length,Math.trunc(value?.visited)||0));cue={visited,running:!!value?.running,armed:!!value?.armed,complete:!!value?.complete};};
 function updateSeams(time){
  const key=[cue.visited,cue.running,cue.armed,cue.complete].join(':');
  for(let n=0;n<floats.length;n++){const s=floats[n].s;seamMatrix.makeTranslation(s.x-I.x,s.y,s.z-I.landingZ);seams.setMatrixAt(n,seamMatrix);}seams.instanceMatrix.needsUpdate=true;
  // Colour updates are bounded to 10 Hz; only the next stone breathes gently.
  if(key===lastCue&&time>=cueTime&&time-cueTime<.1)return;lastCue=key;cueTime=time;
  for(let n=0;n<floats.length;n++){
   const reached=cue.complete||cue.running&&n<cue.visited,next=!cue.complete&&(cue.running?n===cue.visited:cue.armed&&n===0);
   seamColor.setHex(reached?0xffd48c:0x82d8ce).multiplyScalar(reached?.96:next?.7+.15*Math.sin(time*2.4):.24);seams.setColorAt(n,seamColor);
  }seams.instanceColor.needsUpdate=true;
  crystal.emissiveIntensity=cue.complete?.95:cue.running&&cue.visited===floats.length?.7:.5;gold.emissiveIntensity=cue.complete?.7:.32;
 }
 const crystalGeo=new T.CylinderGeometry(0,5,25,5);for(let n=0;n<18;n++){const a=n*2.399,r=22+n%4*6,x=Math.cos(a)*r,z=612+Math.sin(a)*r;const o=add(crystalGeo,n%3===0?gold:crystal,x,26+n%3*4,z);o.rotation.z=Math.sin(a)*.35;o.scale.setScalar(.7+(n%5)*.14);}
 const title=new T.Group();title.position.set(0,30,132);title.userData.nearbyName={id:'coast:tide-cave',name:'潮の洞窟',hx:90,hz:55,height:38};root.add(title);
 let disposed=false;root.visible=false;
 return{root,model,crossing,cutaway,surfaceAt:(x,z)=>model.surfaceAt(x,z),update(time,actor){if(disposed)return 0;const standing=actor&&actor.grounded!==false?model.stones.find(s=>onCaveStone(s,actor.x,actor.z)&&Math.abs(actor.groundY-s.y)<3):null,before=standing?.y;model.update(time,actor?[actor]:[]);root.visible=!!actor&&Math.hypot(actor.x-I.x,actor.z-(I.landingZ+340))<2600;for(const f of floats){f.mesh.position.y=f.s.y;f.floor.height=f.s.y;}if(root.visible)updateSeams(time);return standing?standing.y-before:0;},dispose(){if(disposed)return;disposed=true;seams.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());texture.dispose();root.removeFromParent();}};
}
