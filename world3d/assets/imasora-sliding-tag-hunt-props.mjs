import*as T from'./three.module.min.js';
import{ITEM_DEFS,ITEM_TYPES,HOOK_POLES}from'./imasora-sliding-tag-hunt-items.mjs';
import{worldHeight}from'./imasora-sliding-tag-hunt-world.mjs';
// Geometry and materials are shared. Static pieces of each item are baked by
// colour, rather than giving every little ornament its own draw call.
export function createHuntProps({scene,makeClone}){
 const sphere=new T.SphereGeometry(1,10,7),box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,12),torus=new T.TorusGeometry(.7,.16,5,16),mats=new Map();
 function material(color,alpha=1){const key=color+':'+alpha;if(!mats.has(key))mats.set(key,alpha<1?new T.MeshBasicMaterial({color,transparent:true,opacity:alpha,depthWrite:false,toneMapped:false}):new T.MeshStandardMaterial({color,roughness:.48,emissive:color,emissiveIntensity:.13}));return mats.get(key);}
 function part(root,geo,color,p=[0,0,0],scale=[1,1,1],r=[0,0,0],alpha=1){const m=new T.Mesh(geo,material(color,alpha));m.position.set(...p);m.scale.set(...scale);m.rotation.set(...r);root.add(m);return m;}
 function bake(root){root.updateMatrixWorld(true);const buckets=new Map();root.traverse(m=>{if(!m.isMesh)return;let b=buckets.get(m.material);if(!b)buckets.set(m.material,b=[]);b.push(m.geometry.clone().applyMatrix4(m.matrixWorld).toNonIndexed());});const out=new T.Group();for(const [mat,geos]of buckets){const positions=[],normals=[];for(const g of geos){positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.computeBoundingSphere();out.add(new T.Mesh(geo,mat));}return out;}
 function design(type){const root=new T.Group(),c=ITEM_DEFS[type].color,white='#fff8e8';
  if(type==='speed'){for(const sign of[-1,1]){part(root,new T.ConeGeometry(.6,1.1,3),c,[sign*.7,.4,0],[1,1,.45],[0,0,sign*Math.PI/2]);part(root,box,c,[sign*.4,-.45,0],[.4,1.2,.17],[0,0,sign*.3]);}part(root,sphere,white,[0,.4,0],[.3,.3,.3]);}
  else if(type==='scarf'){part(root,torus,c,[0,.45,0],[1.2,.65,.65]);part(root,box,c,[.55,-.45,0],[.6,1.6,.2],[0,0,-.15]);part(root,box,white,[.64,-1.1,.02],[.62,.14,.22]);}
  else if(type==='grip'){for(const sign of[-1,1]){part(root,box,c,[sign*.58,0,0],[.9,.5,1.6],[0,sign*.15,0]);part(root,box,white,[sign*.58,-.28,0],[.95,.15,1.65]);}}
  else if(type==='gloves'){for(const sign of[-1,1]){part(root,sphere,c,[sign*.65,.1,0],[.5,.8,.35]);part(root,sphere,c,[sign*1.1,.05,0],[.25,.45,.3],[0,0,sign*.5]);part(root,box,white,[sign*.65,-.65,0],[.8,.28,.5]);}}
  else if(type==='landing'){const points=Array.from({length:42},(_,i)=>new T.Vector3(Math.cos(i*.65)*.7,-.9+i*.043,Math.sin(i*.65)*.7));part(root,new T.TubeGeometry(new T.CatmullRomCurve3(points),42,.12,5,false),c);part(root,cylinder,white,[0,-1,0],[1,.15,1]);part(root,cylinder,c,[0,1,0],[1,.15,1]);}
  else if(type==='cloak'){part(root,new T.ConeGeometry(1,2.1,8,1,true),c,[0,0,0],[1,1,.55]);part(root,sphere,white,[0,1,0],[.22,.22,.22]);}
  else if(type==='clone'){part(root,sphere,c,[0,.15,0],[1,1,1],[0,0,0],.45);part(root,sphere,white,[-.8,-.35,.4],[.65,.65,.65],[0,0,0],.55);part(root,sphere,c,[.85,.5,-.25],[.6,.6,.6],[0,0,0],.45);}
  else if(type==='curtain'){for(const x of[-.85,0,.85])for(const y of[0,.8])part(root,sphere,x===0?white:c,[x,y,0],[.6,.6,.6],[0,0,0],.42);}
  else if(type==='stamp'){part(root,cylinder,c,[0,-.3,0],[.65,1.5,.65],[0,0,Math.PI/2]);part(root,box,white,[0,.5,0],[.3,1.2,.3]);part(root,box,c,[0,1.1,0],[1,.25,.4]);}
  else if(type==='cushion'||type==='sticky'){part(root,sphere,c,[0,0,0],[1,1,type==='cushion'?.85:1]);part(root,torus,white,[0,0,0],[1.25,1.25,1.25]);}
  else if(type==='fan'){part(root,cylinder,white,[0,-1,0],[.7,.2,.7]);part(root,box,c,[0,-.4,0],[.25,1.2,.25]);part(root,torus,c,[0,.7,0],[1.3,1.3,1]);for(let i=0;i<3;i++)part(root,box,c,[Math.sin(i*2.094)*.45,.7+Math.cos(i*2.094)*.45,0],[.35,.9,.15],[0,0,-i*2.094]);}
  else if(type==='sheet'){part(root,box,c,[0,0,0],[1.9,.25,1.5],[0,0,.15]);part(root,box,white,[.4,.05,0],[.12,.3,1.5]);}
  else if(type==='bell'){part(root,new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI/2),c,[0,-.5,0]);part(root,torus,c,[0,.7,0],[.45,.6,.45]);part(root,sphere,white,[0,-.6,0],[.25,.3,.25]);}
  else if(type==='hook'){part(root,new T.TorusGeometry(.75,.15,6,18,Math.PI*1.55),c,[0,.1,0],[1,1,1],[0,0,-.5]);part(root,box,white,[.4,-.7,0],[.2,.9,.2]);}
  else if(type==='magnet'){part(root,new T.TorusGeometry(.7,.25,6,16,Math.PI),c);part(root,box,'#a8d8ff',[-.7,-.35,0],[.5,.8,.5]);part(root,box,white,[.7,-.35,0],[.5,.8,.5]);}
  else if(type==='guard'){part(root,sphere,c,[0,0,0],[1.2,1.2,1.2],[0,0,0],.45);part(root,torus,white,[0,0,.4],[.8,.8,.8]);}
  else if(type==='flag'){part(root,box,white,[-.55,0,0],[.12,2.5,.12]);part(root,box,c,[.05,.6,0],[1.2,.9,.1],[0,.12,0]);}
  else if(type==='ink'){part(root,cylinder,c,[0,-.2,0],[.8,1.2,.8]);part(root,torus,white,[0,.55,0],[1.2,1.2,1.2],[Math.PI/2,0,0]);part(root,torus,c,[0,.9,0],[.7,.9,.7]);}
  else if(type==='balloon'){part(root,sphere,c,[0,.6,0],[.85,1.1,.85]);part(root,box,white,[0,-.9,0],[.06,1,.06]);}
  return bake(root);
 }
 const templates=Object.fromEntries(ITEM_TYPES.map(type=>[type,design(type)]));
 const badgeCanvas=document.createElement('canvas');badgeCanvas.width=96;badgeCanvas.height=48;const badgeContext=badgeCanvas.getContext('2d');badgeContext.fillStyle='#ffddb7';badgeContext.beginPath();badgeContext.roundRect(2,2,92,44,16);badgeContext.fill();badgeContext.fillStyle='#506d7c';badgeContext.font='bold 28px system-ui';badgeContext.textAlign='center';badgeContext.textBaseline='middle';badgeContext.fillText('鬼用',48,25);const badgeTexture=new T.CanvasTexture(badgeCanvas);badgeTexture.colorSpace=T.SRGBColorSpace;const badgeMaterial=new T.SpriteMaterial({map:badgeTexture,toneMapped:false,transparent:true});
 const pickups=[],held=[],gadgets=Array.from({length:12},()=>{const r=new T.Group();scene.add(r);return r;}),guards=[],ropes=[],winds=[];
 for(let i=0;i<12;i++){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(72),3));const line=new T.LineSegments(geo,new T.LineBasicMaterial({color:0xb1f5e8,transparent:true,opacity:.7,depthWrite:false}));line.frustumCulled=false;scene.add(line);winds.push(line);}
 function apply(root,type){if(root.userData.kind===type)return;root.clear();root.userData.kind=type;root.userData.badge=null;root.add(templates[type].clone(true));}
 function line(color){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));const m=new T.Line(geo,new T.LineBasicMaterial({color}));m.frustumCulled=false;scene.add(m);return m;}
 for(let i=0;i<20;i++){const r=new T.Group();scene.add(r);pickups.push(r);}
 for(let i=0;i<4;i++){const r=new T.Group();scene.add(r);held.push(r);const shield=new T.Mesh(sphere,material('#b6eed8',.22));shield.scale.set(4,3.8,4);scene.add(shield);guards.push(shield);ropes.push(line('#efd49e'));}
 for(const p of HOOK_POLES){const pole=new T.Group();part(pole,cylinder,'#799aab',[0,2,0],[.65,4,.65]);part(pole,torus,'#ffe29b',[0,4.2,0],[.7,.7,.7],[Math.PI/2,0,0]);pole.position.set(p.x,worldHeight(p.x,p.z),p.z);scene.add(pole);}
 const clones=[makeClone(),makeClone()];for(const a of clones){a.root.visible=false;a.model.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.opacity=.55;}});}
 const sheetGeo=new T.CylinderGeometry(1,1,.04,24),sheetMat=material('#91d6f4',.72),hand=new T.Vector3();
 const landingRing=new T.Mesh(new T.RingGeometry(.9,1,32),new T.MeshBasicMaterial({color:0xffd888,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));landingRing.rotation.x=-Math.PI/2;scene.add(landingRing);
 return{update(s,models,now){
  const actors=[s.player,...s.hunters],view=s.player,flyer=s.hunters.find(a=>a.flight);landingRing.visible=!!flyer;
  if(flyer){const p=flyer.flight.target;landingRing.position.set(p.x,p.y+.16,p.z);landingRing.scale.setScalar(flyer.radius+view.radius+3);landingRing.material.opacity=.6+Math.sin(s.time*4)*.12;}
  for(let i=0;i<pickups.length;i++){const p=s.pickups[i],root=pickups[i],distance=p?Math.hypot(p.x-view.x,p.z-view.z):Infinity;root.visible=!!p&&p.readyAt<=s.time&&distance<100;if(!root.visible)continue;apply(root,p.type);if(p.audience==='hunters'){if(!root.userData.badge){const badge=new T.Sprite(badgeMaterial);badge.position.y=2;badge.scale.set(2.4,1.2,1);root.userData.badge=badge;root.add(badge);}root.userData.badge.visible=distance<28;}root.position.set(p.x,p.y+1.8+Math.sin(now/650+i)*.15,p.z);root.rotation.y=now/1800+i;root.scale.setScalar(1.35);}
  for(let i=0;i<actors.length;i++){const a=actors[i],root=held[i],type=a.pendingItem?.type??a.item;root.visible=!!type&&!a.flight;if(root.visible){apply(root,type);models[i].root.updateMatrixWorld(true);const part=models[i].model.userData.hands?.[1];if(part)part.getWorldPosition(hand);else hand.set(a.x+.6,a.y+3,a.z);root.position.copy(hand);root.position.y+=.25;root.scale.setScalar(a.pendingItem ? .55 : .34);root.rotation.set(0,a.yaw,0);}
   const shield=guards[i];shield.visible=(a.effects.guard??0)>s.time;shield.position.set(a.x,a.y+2.6,a.z);const rope=ropes[i];rope.visible=!!a.hook;if(a.hook){const part=models[i].model.userData.hands?.[0];if(part)part.getWorldPosition(hand);else hand.set(a.x,a.y+3,a.z);rope.geometry.attributes.position.array.set([hand.x,hand.y,hand.z,a.hook.x,a.hook.y,a.hook.z]);rope.geometry.attributes.position.needsUpdate=true;}
  }
  for(const a of clones)a.root.visible=false;let cloneIndex=0;
  for(let i=0;i<gadgets.length;i++){const g=s.gadgets[i],root=gadgets[i],wind=winds[i];root.visible=!!g&&Math.hypot(g.x-view.x,g.z-view.z)<125;wind.visible=root.visible&&g.kind==='fan';if(!root.visible)continue;
   apply(root,g.kind);root.position.set(g.x,g.y+1,g.z);root.rotation.set(0,g.yaw,0);root.scale.setScalar(g.kind==='cushion'?g.radius:g.kind==='curtain'?6:1);
   if(g.kind==='clone'&&cloneIndex<clones.length){const a=clones[cloneIndex++];a.root.visible=true;a.root.position.set(g.x,g.y,g.z);a.root.rotation.y=g.yaw;root.position.y=g.y+3;root.scale.setScalar(3.5);}
   if(g.kind==='curtain'){root.position.y=g.y+3;root.scale.set(6,3,6);}
   if(g.kind==='cushion')root.position.y=g.y+g.radius;
   if(g.kind==='fan'){root.rotation.y=g.yaw+Math.PI/2;const p=wind.geometry.attributes.position.array,dx=Math.cos(g.yaw),dz=-Math.sin(g.yaw);for(let j=0;j<12;j++){const across=(j%3-1)*4,along=1+(s.time*7+Math.floor(j/3)*3)%12;for(let k=0;k<2;k++){const z=along+k*1.4,at=(j*2+k)*3;p[at]=g.x+dx*z+Math.sin(g.yaw)*across;p[at+1]=g.y+1.5+(j%2)*.6;p[at+2]=g.z+dz*z+Math.cos(g.yaw)*across;}}wind.geometry.attributes.position.needsUpdate=true;}
   if(g.kind==='sheet'){if(!root.userData.sheet){root.clear();root.add(new T.Mesh(sheetGeo,sheetMat));root.userData.sheet=true;}root.position.y=g.y+.09;root.scale.set(g.radius,1,g.radius);}
   else root.userData.sheet=false;
   if(g.kind==='bell')root.rotation.z=s.time<(g.ringingUntil??0)?Math.sin(s.time*24)*.35:0;
   if(g.kind==='cushion'||g.kind==='sticky')root.rotation.x=s.time*5;
  }
 }};
}
