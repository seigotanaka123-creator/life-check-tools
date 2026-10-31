import {SNORKEL_NET,snorkelNetPose,snorkelFishSize} from './imasora-coast-snorkel-net.mjs?v=120ob';
import * as T from './three.module.min.js';
import {SNORKEL,REEF_FISH,reefFish} from './imasora-coast-snorkeling.mjs?v=120ob';
import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
export function createSnorkelView(){
 const root=new T.Group();root.name='潮音の島のシュノーケリング';root.position.set(SNORKEL.x,0,SNORKEL.z);root.visible=false;const materials=[],geometries=[],batches=[],pose=new T.Object3D(),color=new T.Color(),fishFields=['slot','generation','species','size','x','y','z','heading','vy'],fishPose=new Float64Array(16*9);let fishCount=-1,fishClock=NaN,disposed=false;
 const mat=(c,extra={})=>{const m=new T.MeshStandardMaterial({color:c,roughness:.55,...extra});materials.push(m);return m;};
 const geo=g=>(geometries.push(g),g),bodyMat=mat(0xffffff,{emissive:0x34757b,emissiveIntensity:.28}),dark=mat(0x19394f),mint=mat(0x53d4ca),yellow=mat(0xffd76c),glass=mat(0xd6fbff,{transparent:true,opacity:.45,depthWrite:false});
 const batch=(g,m,n)=>{const o=new T.InstancedMesh(geo(g),m,n);o.instanceMatrix.setUsage(T.DynamicDrawUsage);o.frustumCulled=false;batches.push(o);root.add(o);return o;};
 const bodies=batch(new T.SphereGeometry(1,12,8),bodyMat,16),tails=batch(new T.ConeGeometry(1,1,3),bodyMat,16),eyes=batch(new T.SphereGeometry(1,6,4),dark,32),fins=batch(new T.ConeGeometry(1,1,3),bodyMat,16),stripes=batch(new T.TorusGeometry(1,.14,4,12),dark,32);
 function stamp(mesh,n,x,y,z,sx,sy,sz,h=0,rx=0){pose.position.set(x-SNORKEL.x,y,z-SNORKEL.z);pose.scale.set(sx,sy,sz);pose.rotation.set(rx,h,0);pose.updateMatrix();mesh.setMatrixAt(n,pose.matrix);}
 const garden=batch(new T.IcosahedronGeometry(1,0),mat(0x8bd2b5),30);for(let n=0;n<30;n++){const f=reefFish(n%16,Math.floor(n/16)),x=f.x+(n%3)*9,z=f.z-14;stamp(garden,n,x,coastWalkingHeight(x,z)+2,z,3+n%3,2,5,n);garden.setColorAt(n,color.setHex([0x77bca4,0xf4b49d,0xb4a9dc][n%3]));}garden.instanceMatrix.needsUpdate=true;
 const mesh=(g,m,parent=root)=>{const o=new T.Mesh(geo(g),m);parent.add(o);return o;};
 const stand=new T.Group();stand.position.set(SNORKEL.entry.x-SNORKEL.x,coastWalkingHeight(SNORKEL.entry.x,SNORKEL.entry.z),SNORKEL.entry.z-SNORKEL.z);root.add(stand);
 mesh(new T.CylinderGeometry(13,15,1,12),mint,stand).position.y=.5;
 const sign=mesh(new T.TorusGeometry(7,1.5,6,16),yellow,stand);sign.position.set(0,3,0);sign.rotation.x=-Math.PI/2;const tube=mesh(new T.CylinderGeometry(1.2,1.2,17,8),yellow,stand);tube.position.set(10,3,0);tube.rotation.x=Math.PI/2;stand.name='シュノーケルと魚とり網';stand.userData.nearbyName={id:'coast:snorkel',name:'シュノーケリングの入り江',hx:22,hz:22,height:25};
 const boundary=batch(new T.SphereGeometry(1,8,6),yellow,9);for(let n=0;n<9;n++){const a=-Math.PI/2+n*Math.PI/8,x=SNORKEL.x+Math.cos(a)*(SNORKEL.rx-12),z=SNORKEL.z+Math.sin(a)*(SNORKEL.rz-12);stamp(boundary,n,x,-3,z,4,4,4);}boundary.instanceMatrix.needsUpdate=true;
 const bubbles=batch(new T.SphereGeometry(1,6,4),mat(0xc6f5ff,{emissive:0x9ae5ef,emissiveIntensity:.3}),18);bubbles.visible=false;
 const net=new T.Group();net.name='魚とり網';root.add(net);net.visible=false;
 const shaftMat=mat(0xb9874c),netRim=mat(0x17667d,{emissive:0x19596c,emissiveIntensity:.24}),netCloth=mat(0x398a9d,{transparent:true,opacity:.58,side:T.DoubleSide,depthWrite:false});
 const handle=mesh(new T.CylinderGeometry(.85,.85,20,8),shaftMat,net);handle.name='木の網の柄';handle.rotation.x=Math.PI/2;handle.position.z=10;
 const grip=mesh(new T.CylinderGeometry(1.15,1.15,4.5,8),netRim,net);grip.rotation.x=Math.PI/2;grip.position.z=1.5;
 const hoop=mesh(new T.TorusGeometry(SNORKEL_NET.radius,1.1,6,24),netRim,net);hoop.name='網のふち';hoop.position.z=SNORKEL_NET.reach;hoop.rotation.x=Math.PI/2;
 const web=mesh(new T.ConeGeometry(SNORKEL_NET.radius-.7,11,16,3,true),netCloth,net);web.name='濃い色の網袋';web.position.set(0,-5.5,SNORKEL_NET.reach);web.rotation.z=Math.PI;
 const cordMaterial=new T.LineBasicMaterial({color:0x164d65,transparent:true,opacity:.92});materials.push(cordMaterial);const cord=new T.LineSegments(geo(new T.WireframeGeometry(web.geometry)),cordMaterial);cord.position.copy(web.position);cord.rotation.copy(web.rotation);net.add(cord);
 const mask=new T.Group();mask.name='マスクと曲がった呼吸管';mask.visible=false;const rim=mesh(new T.TorusGeometry(6,1,6,16),mint,mask);rim.scale.x=1.45;mesh(new T.CircleGeometry(5.8,16),glass,mask).scale.x=1.45;
 const pipeMat=mat(0xf08a69,{emissive:0x713b2c,emissiveIntensity:.18}),mouthMat=mat(0x31526c),pipeCurve=new T.CatmullRomCurve3([new T.Vector3(-7,-2,0),new T.Vector3(-10,-1,-1),new T.Vector3(-12,3,-2),new T.Vector3(-12,13,-2),new T.Vector3(-11,16,-2),new T.Vector3(-8,16,-2)]);
 const pipe=mesh(new T.TubeGeometry(pipeCurve,20,1.15,8,false),pipeMat,mask);pipe.name='サンゴ色の呼吸管';const mouth=mesh(new T.BoxGeometry(4,2.5,3),mouthMat,mask);mouth.position.set(-7,-2,0);const cap=mesh(new T.CylinderGeometry(1.65,1.65,2.5,8),mint,mask);cap.position.set(-8,16,-2);cap.rotation.z=Math.PI/2;root.add(mask);
 // A lightweight two-piece arm joins each authored shoulder to its real hand.
 const arms=[0,1].map(n=>{const g=new T.Group();g.name=n?'右腕（シュノーケリング）':'左腕（シュノーケリング）';root.add(g);return{group:g,upper:mesh(new T.CylinderGeometry(1,1,1,8),mint,g),lower:mesh(new T.CylinderGeometry(1,1,1,8),mint,g),joint:mesh(new T.SphereGeometry(1,8,6),mint,g),source:null};});
 const shoulder=new T.Vector3(),elbow=new T.Vector3(),wrist=new T.Vector3(),armDirection=new T.Vector3(),armUp=new T.Vector3(0,1,0),armBend=new T.Vector3();
 function joinArm(part,a,b,radius){part.position.copy(a).add(b).multiplyScalar(.5);part.position.x-=SNORKEL.x;part.position.z-=SNORKEL.z;armDirection.subVectors(b,a);part.scale.set(radius,Math.max(.01,armDirection.length()),radius);part.quaternion.setFromUnitVectors(armUp,armDirection.normalize());}
 function updateArms(character,firstPerson){const rig=character?.userData.walkRig;for(const[n,a]of arms.entries()){const h=rig?.hands?.[n];a.group.visible=!!h&&firstPerson;if(!h||!firstPerson)continue;const source=Array.isArray(h.part.material)?h.part.material[0]:h.part.material;if(a.source!==source){// Borrow the actual skin without owning or disposing it. Recolouring and
 // character swaps now stay consistent, with no accumulating material clones.
 for(const p of[a.upper,a.lower,a.joint])p.material=source;a.source=source;}const base=h.basePosition??h.part.position,sign=n?1:-1;shoulder.copy(base);shoulder.x-=sign*2/character.scale.x;shoulder.y+=2/character.scale.y;shoulder.z-=.5/character.scale.z;character.localToWorld(shoulder);h.part.getWorldPosition(wrist);elbow.copy(shoulder).add(wrist).multiplyScalar(.5).add(armBend.set(sign*1.4,-.6,0).applyQuaternion(character.quaternion));const radius=Math.max(.7,h.part.scale.x*character.scale.x*.48);joinArm(a.upper,shoulder,elbow,radius);joinArm(a.lower,elbow,wrist,radius*.9);a.joint.position.set(elbow.x-SNORKEL.x,elbow.y,elbow.z-SNORKEL.z);a.joint.scale.setScalar(radius);}}
 const marker=mesh(new T.TorusGeometry(11,.8,6,20),mat(0xffe78d,{emissive:0xffcb60,emissiveIntensity:.5}));marker.visible=false;
 const handPoint=new T.Vector3(),facePoint=new T.Vector3(),handScale=new T.Vector3();let hiddenCharacter=null,hiddenCharacterVisible=true;
 const handViews=[0,1].map(n=>{const m=mesh(new T.SphereGeometry(1,12,8),mint);m.name=n?'手元の右手':'手元の左手';m.visible=false;return m;});
 function ownBody(character,hide){if(hiddenCharacter&&(hiddenCharacter!==character||!hide)){hiddenCharacter.visible=hiddenCharacterVisible;hiddenCharacter=null;}if(hide&&character){if(!hiddenCharacter){hiddenCharacter=character;hiddenCharacterVisible=character.visible;}character.visible=false;}}

 function highlight(target,character){if(disposed)return;marker.visible=!!target;if(target){marker.position.set(target.x-SNORKEL.x,target.y,target.z-SNORKEL.z);marker.quaternion.copy(character?.quaternion??new T.Quaternion());}}
 function update({visible,fish=[],target=null,active=false,character=null,time=0,waveTime=0,swing=0,aim=null,swimming=false,firstPerson=false}){
  if(disposed)return;ownBody(character,visible&&active&&firstPerson);for(const h of handViews)h.visible=false;root.visible=visible;if(!visible)return;stand.visible=!active;garden.visible=boundary.visible=true;
  // A paused swimmer (or an unused beach rack) must not upload identical fish
  // batches every frame. Compare real poses too: catches and restored fish can
  // change at the same clock. Live waves and the hand-held net stay independent.
  let fishChanged=fishCount!==fish.length||fish.length>0&&fishClock!==time;
  if(!fishChanged)for(let n=0;n<fish.length&&!fishChanged;n++)for(let k=0;k<fishFields.length;k++)if(fishPose[n*9+k]!== (fish[n][fishFields[k]]??0)){fishChanged=true;break;}
  if(fishChanged){let stripeCount=0;for(const [n,f]of fish.entries()){const size=snorkelFishSize(f.size)*.28,c=REEF_FISH[f.species].color,pitch=f.vy?-Math.atan2(f.vy,Math.hypot(f.vx??0,f.vz??0)+12):0;stamp(bodies,n,f.x,f.y,f.z,size*.46,size*.65,size,f.heading,pitch);bodies.setColorAt(n,color.setHex(c));const tail=Math.sin(time*(9+Math.min(8,Math.hypot(f.vx??0,f.vz??0)*.12))+f.slot)*.25;stamp(tails,n,f.x-Math.sin(f.heading)*size,f.y,f.z-Math.cos(f.heading)*size,size*.6,size*.8,size*.55,f.heading+tail,Math.PI/2+pitch);tails.setColorAt(n,color);
   if(f.species===1)for(const offset of[-.25,.25])stamp(stripes,stripeCount++,f.x+Math.sin(f.heading)*size*offset,f.y,f.z+Math.cos(f.heading)*size*offset,size*.44,size*.62,size*.3,f.heading);
   stamp(fins,n,f.x,f.y+size*.57,f.z,size*.25,size*.6,size*.6,f.heading);fins.setColorAt(n,color);
   for(let s=-1;s<=1;s+=2){const side=size*.4*s;stamp(eyes,n*2+(s===1?1:0),f.x+Math.cos(f.heading)*side+Math.sin(f.heading)*size*.5,f.y+size*.17,f.z-Math.sin(f.heading)*side+Math.cos(f.heading)*size*.5,.8,.8,.8);}}
  stripes.count=stripeCount;bodies.count=tails.count=fins.count=fish.length;eyes.count=fish.length*2;for(const m of[bodies,tails,eyes,fins,stripes]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}fishCount=fish.length;fishClock=time;for(let n=0;n<fish.length;n++)for(let k=0;k<fishFields.length;k++)fishPose[n*9+k]=fish[n][fishFields[k]]??0;}
  for(let n=0;n<9;n++){const a=-Math.PI/2+n*Math.PI/8,x=SNORKEL.x+Math.cos(a)*(SNORKEL.rx-12),z=SNORKEL.z+Math.sin(a)*(SNORKEL.rz-12);stamp(boundary,n,x,coastWave(x,z,waveTime).height+1,z,4,4,4);}boundary.instanceMatrix.needsUpdate=true;
  highlight(target,character);
  net.visible=active&&!!character;mask.visible=net.visible&&!firstPerson;for(const a of arms)a.group.visible=net.visible;bubbles.visible=false;if(!character||!active)return;character.updateMatrixWorld(true);updateArms(character,firstPerson);if(firstPerson)for(const[n,h]of (character.userData.walkRig?.hands??[]).entries()){const m=handViews[n];if(!m)continue;m.visible=true;m.geometry=h.part.geometry;m.material=h.part.material;h.part.getWorldPosition(handPoint);m.position.set(handPoint.x-SNORKEL.x,handPoint.y,handPoint.z-SNORKEL.z);h.part.getWorldQuaternion(m.quaternion);h.part.getWorldScale(handScale);m.scale.copy(handScale);}const rig=character.userData.walkRig,hand=rig?.hands?.[1]?.part;
  let tool=null;if(hand){hand.getWorldPosition(handPoint);tool=snorkelNetPose(handPoint,character.rotation.y,swing,aim);net.position.set(handPoint.x-SNORKEL.x,handPoint.y,handPoint.z-SNORKEL.z);net.rotation.set(tool.pitch,tool.yaw,0,'YXZ');}else net.visible=false;
  const b=character.userData.snorkelNeutralBody??character.userData.collisionFootprint,scale=character.scale.y,offset=character.userData.grounding?.verticalOffset??0;
  const faceEyes=character.userData.faceFeatures??[];if(faceEyes.length){facePoint.set(0,0,0);for(const eye of faceEyes)facePoint.add(eye.getWorldPosition(handPoint));facePoint.multiplyScalar(1/faceEyes.length);}else{facePoint.set(0,((b?.maxY??40)*.72-offset)/scale,((b?.halfZ??12)*.92)/scale);character.localToWorld(facePoint);}mask.position.set(facePoint.x-SNORKEL.x,facePoint.y,facePoint.z-SNORKEL.z);mask.quaternion.copy(character.quaternion);
  bubbles.visible=swimming&&facePoint.y<coastWave(facePoint.x,facePoint.z,waveTime).height-6;if(bubbles.visible){for(let n=0;n<18;n++){const age=(time*.7+n/18)%1,size=.5+age*.8;stamp(bubbles,n,facePoint.x+Math.sin(n*4+age*5)*age*9,facePoint.y+age*36,facePoint.z-9+Math.cos(n*3)*age*9,size,size,size);}bubbles.instanceMatrix.needsUpdate=true;}if(tool)tool.face={x:facePoint.x,y:facePoint.y,z:facePoint.z};return tool;
 }
 return{root,update,highlight,dispose(){if(disposed)return;disposed=true;ownBody(null,false);root.removeFromParent();batches.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
