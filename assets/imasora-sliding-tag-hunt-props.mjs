import{createHuntWindCulling,createHuntWindGeometry}from'./imasora-sliding-tag-hunt-wind-culling.mjs';
import{createHuntPickupNameView}from'./imasora-sliding-tag-hunt-pickup-names.mjs';
import{huntHasClearSight}from'./imasora-sliding-tag-hunt-sight.mjs';
import{huntPickupHeight}from'./imasora-sliding-tag-hunt-contact.mjs';
import{pickupAudience,pickupVisible,pickupNameIndices}from'./imasora-sliding-tag-hunt-pickup-view.mjs';
import{huntActorConcealed}from'./imasora-sliding-tag-hunt-visibility.mjs';
import{createHuntDecoys}from'./imasora-sliding-tag-hunt-decoys.mjs';
import{disposeHuntModel}from'./imasora-sliding-tag-hunt-model-cache.mjs';
import*as T from'./three.module.min.js';
import{createHuntHandAttachments}from'./imasora-sliding-tag-hunt-pose.mjs';
import{ITEM_DEFS,ITEM_TYPES,HOOK_POLES,SUPPLY_COUNT}from'./imasora-sliding-tag-hunt-items.mjs';
import{TRAMPOLINE}from'./imasora-sliding-tag-hunt-trampoline.mjs';
import{worldHeight,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
// Geometry and materials are shared. Static pieces of each item are baked by
// colour, rather than giving every little ornament its own draw call.
// Only visible ground rings occupy instance slots. Keep their matrices
// until a pickup is replaced, changes visibility, or a replay rewinds it.
export function createHuntSupplyRings(mesh){
 const positions=new Float64Array(mesh.instanceMatrix.count*3).fill(NaN);
 const matrix=new T.Matrix4(),point=new T.Vector3(),scale=new T.Vector3(2.5,2.5,2.5);
 const rotation=new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2,0,0));
 let count=0,changed=false;
 return{
  begin(){count=0;changed=false;},
  add(pickup){
   const index=count++,offset=index*3,x=pickup.x,y=pickup.y+.06,z=pickup.z;
   if(positions[offset]===x&&positions[offset+1]===y&&positions[offset+2]===z)return;
   positions[offset]=x;positions[offset+1]=y;positions[offset+2]=z;
   point.set(x,y,z);
   matrix.compose(point,rotation,scale);
   mesh.setMatrixAt(index,matrix);
   changed=true;
  },
  end(){
   mesh.count=count;
   mesh.visible=count>0;
   if(changed)mesh.instanceMatrix.needsUpdate=true;
  },
 };
}
export function createHuntProps({scene,makeClone,camera=null,handAttachments=createHuntHandAttachments()}){
 const nameView=camera?createHuntPickupNameView(camera):null,windCulling=createHuntWindCulling(camera);
 const updateWind=createHuntWindGeometry({sight:worldSight,onRay:windCulling.ray});
 const propDocument=document;
 const sphere=new T.SphereGeometry(1,10,7),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,12),torus=new T.TorusGeometry(.7,.16,5,16),mats=new Map(),curtainMaterials=new Map();
 function material(color,alpha=1){const key=color+':'+alpha;if(!mats.has(key))mats.set(key,alpha<1?new T.MeshBasicMaterial({color,transparent:true,opacity:alpha,depthWrite:false,toneMapped:false}):new T.MeshStandardMaterial({color,roughness:.48,emissive:color,emissiveIntensity:.13}));return mats.get(key);}
 function part(root,geo,color,p=[0,0,0],scale=[1,1,1],r=[0,0,0],alpha=1){const m=new T.Mesh(geo,material(color,alpha));m.position.set(...p);m.scale.set(...scale);m.rotation.set(...r);root.add(m);return m;}
 function bake(root){root.updateMatrixWorld(true);const buckets=new Map();root.traverse(m=>{if(!m.isMesh)return;let b=buckets.get(m.material);if(!b)buckets.set(m.material,b=[]);b.push(m.geometry.clone().applyMatrix4(m.matrixWorld).toNonIndexed());});const out=new T.Group();for(const [mat,geos]of buckets){const positions=[],normals=[];for(const g of geos){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();out.add(new T.Mesh(geo,mat));}return out;}
 function design(type){const root=new T.Group(),c=ITEM_DEFS[type].color,white='#fff8e8';
  if(type==='speed'){for(const sign of[-1,1]){part(root,new T.ConeGeometry(.6,1.1,3),c,[sign*.7,.4,0],[1,1,.45],[0,0,sign*Math.PI/2]);part(root,box,c,[sign*.4,-.45,0],[.4,1.2,.17],[0,0,sign*.3]);}part(root,sphere,white,[0,.4,0],[.3,.3,.3]);}
  else if(type==='radar'){part(root,box,c,[0,0,0],[1.7,1.9,.5]);part(root,box,'#153d50',[0,.1,.3],[1.4,1.4,.12]);part(root,torus,white,[0,.1,.4],[.8,.8,.5]);part(root,box,white,[.26,.36,.42],[.12,.8,.08],[0,0,-.7]);part(root,box,white,[-.5,1.3,0],[.12,.8,.12]);part(root,sphere,white,[.4,-.7,.35],[.16,.16,.16]);}
  else if(type==='scarf'){part(root,torus,c,[0,.45,0],[1.2,.65,.65]);part(root,box,c,[.55,-.45,0],[.6,1.6,.2],[0,0,-.15]);part(root,box,white,[.64,-1.1,.02],[.62,.14,.22]);}
  else if(type==='cloak'){part(root,new T.ConeGeometry(1,2.1,8,1,true),c,[0,0,0],[1,1,.55]);part(root,sphere,white,[0,1,0],[.22,.22,.22]);}
  else if(type==='clone'){part(root,sphere,c,[0,.15,0],[1,1,1],[0,0,0],.45);part(root,sphere,white,[-.8,-.35,.4],[.65,.65,.65],[0,0,0],.55);part(root,sphere,c,[.85,.5,-.25],[.6,.6,.6],[0,0,0],.45);}
  else if(type==='curtain'){for(let i=0;i<6;i++){const a=i*Math.PI/3;part(root,sphere,i%2?white:c,[Math.sin(a)*.85,0,Math.cos(a)*.85],[.6,.6,.6],[0,0,0],.42);}for(let i=0;i<3;i++){const a=i*Math.PI*2/3;part(root,sphere,c,[Math.sin(a)*.45,.8,Math.cos(a)*.45],[.6,.6,.6],[0,0,0],.38);}}
  else if(type==='cushion'){part(root,sphere,c);part(root,torus,white,[0,0,0],[1.16,1.16,1.16]);}
  else if(type==='fan'){part(root,cylinder,white,[0,-1,0],[.9,.2,.8]);part(root,box,c,[0,-.4,0],[.3,1.2,.3]);part(root,new T.TorusGeometry(1.35,.07,6,24),c,[0,.7,0]);for(let i=0;i<6;i++){const a=i*Math.PI/3;part(root,box,white,[0,.7,.17],[.045,2.6,.04],[0,0,a]);}part(root,sphere,white,[0,.7,.24],[.2,.2,.16]);}
  else if(type==='sheet'){part(root,box,c,[0,0,0],[1.9,.25,1.5],[0,0,.15]);part(root,box,white,[.4,.05,0],[.12,.3,1.5]);}
  else if(type==='hook'){part(root,new T.TorusGeometry(.75,.15,6,18,Math.PI*1.55),c,[0,.1,0],[1,1,1],[0,0,-.5]);part(root,box,white,[.4,-.7,0],[.2,.9,.2]);}
  else if(type==='mirror'){
   part(root,box,'#254456',[0,.12,0],[2.25,1.08,.26]);
   part(root,box,c,[0,.12,.16],[1.97,.82,.11]);
   part(root,box,'#eefaff',[-.38,.1,.23],[.10,.54,.03],[0,0,-.7]);
   part(root,box,'#254456',[0,.78,0],[.22,.35,.2]);
  }
  else if(type==='sunglasses'){for(const side of[-1,1]){part(root,box,'#173548',[side*.55,0,.1],[.92,.65,.2]);part(root,torus,c,[side*.55,0,.25],[.65,.48,.2]);part(root,box,c,[side*.95,0,-.45],[.12,.12,1.2]);}part(root,box,c,[0,.05,.15],[.4,.12,.16]);}
  else if(type==='ink'){part(root,cylinder,c,[0,-.2,0],[.8,1.2,.8]);part(root,torus,white,[0,.55,0],[1.2,1.2,1.2],[Math.PI/2,0,0]);part(root,torus,c,[0,.9,0],[.7,.9,.7]);}
  else if(type==='balloon'){part(root,sphere,c,[0,.6,0],[.85,1.1,.85]);part(root,box,white,[0,-.9,0],[.06,1,.06]);}
  if(type==='curtain')root.traverse(o=>{if(o.isMesh)curtainMaterials.set(o.material,o.material.opacity);});return bake(root);
 }
 const templates=Object.fromEntries(ITEM_TYPES.map(type=>[type,design(type)]));
 // Cache each real model's lowest point once. Ground supplies neither hover
 // nor bob/spin, and their meshes rest on the same surface used for collection.
 const groundOffsets=Object.fromEntries(ITEM_TYPES.map(type=>[type,-new T.Box3().setFromObject(templates[type]).min.y*1.35]));
 const nameMaterials=new Map();let nameIndices=new Set(),nameAt=-Infinity,nameSeed,nameAudience;const labelPoint={x:0,y:0,z:0};
 function nameLabel(type){if(!nameMaterials.has(type)){const c=propDocument.createElement('canvas');c.width=320;c.height=64;const x=c.getContext('2d');x.fillStyle=ITEM_DEFS[type].color;x.beginPath();x.roundRect(0,0,320,64,20);x.fill();x.fillStyle='#244757';x.beginPath();x.roundRect(3,3,314,58,17);x.fill();x.fillStyle='#fffdf2';x.font='bold 28px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText(ITEM_DEFS[type].name,160,33);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;nameMaterials.set(type,new T.SpriteMaterial({map:t,toneMapped:false,transparent:true}));}const label=new T.Sprite(nameMaterials.get(type));label.name='pickup-name';label.userData.item=type;label.position.y=2.7;label.scale.set(9,1.8,1);return label;}
 const trampolineDesign=new T.Group(),deckY=TRAMPOLINE.top;
 part(trampolineDesign,new T.CylinderGeometry(TRAMPOLINE.matRadius,TRAMPOLINE.matRadius,.16,48),'#ee9dbb',[0,deckY-.08,0]);
 part(trampolineDesign,new T.TorusGeometry(8.6,.25,7,48),'#43bfb7',[0,deckY-.1,0],[1,1,1],[Math.PI/2,0,0]);
 const metal='#688aa0';for(let i=0;i<4;i++){const angle=i*Math.PI/2,ends=[angle-.24,angle+.24],points=[new T.Vector3(Math.sin(ends[0])*8.4,deckY-.2,Math.cos(ends[0])*8.4),new T.Vector3(Math.sin(ends[0])*8.1,.5,Math.cos(ends[0])*8.1),new T.Vector3(Math.sin(ends[1])*8.1,.5,Math.cos(ends[1])*8.1),new T.Vector3(Math.sin(ends[1])*8.4,deckY-.2,Math.cos(ends[1])*8.4)];part(trampolineDesign,new T.TubeGeometry(new T.CatmullRomCurve3(points,false,'catmullrom',.2),24,.17,6,false),metal);for(const a of ends)part(trampolineDesign,box,'#48677b',[Math.sin(a)*8.1,.18,Math.cos(a)*8.1],[.65,.36,.65]);}
 for(let i=0;i<20;i++){const angle=i*Math.PI/10,points=Array.from({length:29},(_,j)=>{const t=j/28,r=7.75+t*.85,side=Math.cos(t*Math.PI*10)*.105;return new T.Vector3(Math.sin(angle)*r+Math.cos(angle)*side,deckY-.08+Math.sin(t*Math.PI*10)*.105,Math.cos(angle)*r-Math.sin(angle)*side);});part(trampolineDesign,new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.04,4,false),'#ffe7a1');}
 for(let offset=-6;offset<=6;offset+=2){const length=2*Math.sqrt(TRAMPOLINE.matRadius**2-offset**2);part(trampolineDesign,box,'#fbdce7',[offset,deckY+.012,0],[.045,.018,length]);part(trampolineDesign,box,'#fbdce7',[0,deckY+.012,offset],[length,.018,.045]);}
 part(trampolineDesign,cylinder,'#375a72',[0,.015,0],[9.1,.02,9.1],[0,0,0],.16);
 const trampoline=bake(trampolineDesign);trampoline.name='runner-trampoline';trampoline.position.set(TRAMPOLINE.x,worldHeight(TRAMPOLINE.x,TRAMPOLINE.z),TRAMPOLINE.z);scene.add(trampoline);
 const pickups=[],held=[],gadgets=Array.from({length:12},()=>{const r=new T.Group();scene.add(r);return r;}),ropes=[],winds=[];
 const supplyRings=new T.InstancedMesh(new T.RingGeometry(.85,1,20),new T.MeshBasicMaterial({color:'#e1f7ce',transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false}),SUPPLY_COUNT);supplyRings.frustumCulled=false;scene.add(supplyRings);const rings=createHuntSupplyRings(supplyRings);
 for(let i=0;i<12;i++){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(72),3));const line=new T.LineSegments(geo,new T.LineBasicMaterial({color:0xb1f5e8,transparent:true,opacity:.65,depthWrite:false}));line.frustumCulled=false;scene.add(line);winds.push(line);}
 function apply(root,type){if(root.userData.kind===type)return;root.clear();root.userData.kind=type;root.userData.label=null;root.userData.fanRotor=null;root.add(templates[type].clone(true));if(type==='fan'){const rotor=new T.Group();rotor.position.set(0,.7,0);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;part(rotor,box,ITEM_DEFS.fan.color,[Math.sin(a)*.6,Math.cos(a)*.6,0],[.45,1.1,.13],[0,0,-a]);}root.add(rotor);root.userData.fanRotor=rotor;}}
 function line(color){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));const m=new T.Line(geo,new T.LineBasicMaterial({color}));m.frustumCulled=false;scene.add(m);return m;}
 for(let i=0;i<SUPPLY_COUNT;i++){const r=new T.Group();r.name='hunt-pickup-'+i;scene.add(r);pickups.push(r);}
 for(let i=0;i<4;i++){const r=new T.Group();r.name='hunt-held-'+i;scene.add(r);held.push(r);const rope=line('#efd49e');rope.name='hunt-hook-'+i;ropes.push(rope);}
 for(const p of HOOK_POLES){const pole=new T.Group();part(pole,cylinder,'#799aab',[0,2,0],[.65,4,.65]);part(pole,torus,'#ffe29b',[0,4.2,0],[.7,.7,.7],[Math.PI/2,0,0]);pole.position.set(p.x,worldHeight(p.x,p.z),p.z);scene.add(pole);}
 const decoys=createHuntDecoys({create:makeClone,release:disposeHuntModel});
 const sheetGeo=new T.CylinderGeometry(1,1,.04,24),sheetMat=material('#91d6f4',.72),hand=new T.Vector3();
 const landingRing=new T.Mesh(new T.RingGeometry(.9,1,32),new T.MeshBasicMaterial({color:0xffd888,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));landingRing.rotation.x=-Math.PI/2;scene.add(landingRing);
 // Warm the two rigs while the runner holds a clone, before it is activated.
 // Otherwise skip their construction. Retain a warm pair for the same body,
 // but release it when a different runner is selected without this tool.
 let decoySource=null,landingRingActor=null;
 function prepare(runner,{needed=false}={}){if(runner!==decoySource){if(needed)decoys.prepare(runner);else decoys.dispose();decoySource=runner;}else if(needed)decoys.prepare(runner);decoys.reset();}
 function attachedNodes(index,actor){
  const nodes=[held[index],ropes[index]];
  if(actor===landingRingActor)nodes.push(landingRing);
  return nodes;
 }
 return{prepare,attachedNodes,windStats:()=>windCulling.stats(),render:draw=>decoys.render(draw),stats:()=>decoys.stats(),pickupStats:()=>({audience:nameAudience,visible:pickups.filter(r=>r.visible).map(r=>r.userData.kind),names:pickups.filter(r=>r.visible&&r.userData.label?.visible).map(r=>ITEM_DEFS[r.userData.kind].name),cachedNames:nameMaterials.size,visibility:nameView?.stats()??null}),update(s,models,now,{dt=0,paused=false,groundAt=worldHeight,isIce=()=>false,nameVisible=nameView?.visible??(()=>true),includePickupNames=true}={}){const needed=s.player.item==='clone'||s.gadgets.some(g=>g.kind==='clone');if(models[0]!==decoySource)prepare(models[0],{needed});else if(needed)decoys.prepare(models[0]);
  trampoline.visible=!!s.trampoline&&!s.trampoline.used;const viewer=s.config?.mode==='hunt'?s.hunters[0]:s.player,clearSight=huntHasClearSight(s,viewer);for(const [m,opacity]of curtainMaterials)m.opacity=clearSight?.08:opacity;
  const actors=[s.player,...s.hunters],view=s.config?.mode==='hunt'?s.hunters[0]:s.player,flyer=s.hunters.find(a=>a.flight&&!huntActorConcealed(s,a));landingRingActor=flyer;landingRing.visible=!!flyer;
  const audience=pickupAudience(s.config?.mode);if(includePickupNames&&(nameSeed!==s.config?.seed||nameAudience!==audience||now-nameAt>=200||now<nameAt)){nameIndices=new Set(pickupNameIndices(s,view,{visible:p=>{labelPoint.x=p.x;labelPoint.y=(p.audience==='hunters'?p.y+groundOffsets[p.type]:huntPickupHeight(p,s.time))+2.7*1.35;labelPoint.z=p.z;return nameVisible(labelPoint,p);}}));nameAt=now;nameSeed=s.config?.seed;nameAudience=audience;}
  if(flyer){const p=flyer.flight.target;landingRing.position.set(p.x,p.y+.16,p.z);landingRing.scale.setScalar(flyer.radius+view.radius+3);landingRing.material.opacity=.6+Math.sin(s.time*4)*.12;}
  rings.begin();
  for(let i=0;i<pickups.length;i++){const p=s.pickups[i],root=pickups[i],visible=pickupVisible(p,s,view);if(visible&&p.lift)rings.add(p);root.visible=!!ITEM_DEFS[p?.type]&&visible;if(!root.visible)continue;apply(root,p.type);const grounded=p.audience==='hunters';if(includePickupNames&&nameIndices.has(i)&&!root.userData.label){root.userData.label=nameLabel(p.type);root.add(root.userData.label);}if(root.userData.label)root.userData.label.visible=includePickupNames&&nameIndices.has(i);root.position.set(p.x,grounded?p.y+groundOffsets[p.type]:huntPickupHeight(p,s.time),p.z);root.rotation.y=grounded?i:now/1800+i;root.scale.setScalar(1.35);}
  rings.end();
  for(let i=0;i<actors.length;i++){const a=actors[i],root=held[i],type=a.pendingItem?.type??a.item,concealed=huntActorConcealed(s,a);root.visible=!!ITEM_DEFS[type]&&!a.flight&&!concealed;if(root.visible){apply(root,type);handAttachments.held(root,a,models[i].model.userData.hands?.[1],!!a.pendingItem);}
   const rope=ropes[i];rope.visible=!!a.hook&&!concealed;if(rope.visible){const part=models[i].model.userData.hands?.[0];if(part)part.getWorldPosition(hand);else hand.set(a.x,a.y+3,a.z);rope.geometry.attributes.position.array.set([hand.x,hand.y,hand.z,a.hook.x,a.hook.y,a.hook.z]);rope.geometry.attributes.position.needsUpdate=true;}
  }
  decoys.hide();windCulling.beginFrame();let cloneIndex=0;
  for(let i=0;i<gadgets.length;i++){const g=s.gadgets[i],root=gadgets[i],wind=winds[i];root.visible=!!ITEM_DEFS[g?.kind]&&Math.hypot(g.x-view.x,g.z-view.z)<125;wind.visible=root.visible&&g.kind==='fan';if(!root.visible)continue;
   apply(root,g.kind);root.position.set(g.x,g.y+1,g.z);root.rotation.set(0,g.yaw,0);root.scale.setScalar(g.kind==='cushion'?g.radius:g.kind==='curtain'?6:1);
   if(g.kind==='clone'){root.visible=false;decoys.place(cloneIndex++,g,{self:s.config?.mode!=='hunt',dt,paused,groundAt,isIce,radius:s.player.radius});}
   if(g.kind==='curtain'){root.position.y=g.y+3.6;root.scale.set(g.radius/1.45,6,g.radius/1.45);}
   if(g.kind==='cushion')root.position.y=g.y+g.radius;
   if(g.kind==='fan'){root.scale.setScalar(3);root.position.y=g.y+3.3;root.rotation.y=g.yaw;if(root.userData.fanRotor)root.userData.fanRotor.rotation.z=-s.time*18;wind.visible=windCulling.visible(g);if(wind.visible)updateWind(wind.geometry.attributes.position,g,s.time);}
   if(g.kind==='sheet'){if(!root.userData.sheet){root.clear();root.add(new T.Mesh(sheetGeo,sheetMat));root.userData.sheet=true;}root.position.y=g.y+.09;root.scale.set(g.radius,1,g.radius);}
   else root.userData.sheet=false;
   if(g.kind==='cushion')root.rotation.x=s.time*5;
  }
 }};
}
