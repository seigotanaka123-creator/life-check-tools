import {SNORKEL_NET,snorkelNetPose,snorkelFishSize} from './imasora-coast-snorkel-net.mjs?v=120ob';
import * as T from './three.module.min.js';
import {SNORKEL,REEF_FISH,reefFish} from './imasora-coast-snorkeling.mjs?v=120ob';
import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
// Each tuft is rooted to the existing seabed. Two static instance batches
// give the water depth without adding collision shapes or extra fish.
function eelgrassGeometry(){
 const positions=[];
 for(let leaf=0;leaf<6;leaf++){
  const angle=leaf*2.399,h=.48+(leaf*31%13)*.043,bend=.26+leaf*.027;
  const pt=(t,side)=>{
   const w=.043*Math.sin(Math.PI*t)*side;
   return [Math.sin(angle)*bend*t*t+Math.cos(angle)*w,h*t,Math.cos(angle)*bend*t*t-Math.sin(angle)*w];
  };
  for(let row=0;row<5;row++){
   const a=row/5,b=(row+1)/5;
   positions.push(...pt(a,-1),...pt(a,1),...pt(b,-1),...pt(a,1),...pt(b,1),...pt(b,-1));
  }
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();return geo;
}
function fanCoralGeometry(){
 const points=[],normals=[];
 function branch(x,y,z,endX,endY,endZ,r){
  const curve=new T.CatmullRomCurve3([new T.Vector3(x,y,z),new T.Vector3((x+endX)*.39,(y+endY)*.52,(z+endZ)*.46),new T.Vector3(endX,endY,endZ)]);
  const indexed=new T.TubeGeometry(curve,5,r,5),shape=indexed.toNonIndexed();
  indexed.dispose();
  points.push(...shape.attributes.position.array);
  normals.push(...shape.attributes.normal.array);
  shape.dispose();
 }
 branch(0,0,0,0,.76,0,.043);
 for(let arm=0;arm<6;arm++){
  const side=arm%2?-1:1,y=.20+(arm>>1)*.12,x=side*(.29-(arm>>1)*.039),z=Math.sin(arm*2.399)*.14;
  branch(0,y,0,x,y+.39,z,.024);
  branch(x*.56,y+.18,z*.62,x*1.17,y+.26,z+.07,.014);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));return geo;
}
export function createSnorkelView(){
 const root=new T.Group();root.name='潮音の島のシュノーケリング';root.position.set(SNORKEL.x,0,SNORKEL.z);root.visible=false;const materials=[],geometries=[],batches=[],pose=new T.Object3D(),color=new T.Color(),fishFields=['slot','generation','species','size','x','y','z','heading','vy'],fishPose=new Float64Array(16*9);let fishCount=-1,fishClock=NaN,disposed=false;
 const mat=(c,extra={})=>{const m=new T.MeshStandardMaterial({color:c,roughness:.55,...extra});materials.push(m);return m;};
 const geo=g=>(geometries.push(g),g),bodyMat=mat(0xffffff,{emissive:0x34757b,emissiveIntensity:.28}),dark=mat(0x19394f),mint=mat(0x53d4ca),yellow=mat(0xffd76c),glass=mat(0xd6fbff,{transparent:true,opacity:.45,depthWrite:false});
 const batch=(g,m,n)=>{const o=new T.InstancedMesh(geo(g),m,n);o.instanceMatrix.setUsage(T.DynamicDrawUsage);o.frustumCulled=false;batches.push(o);root.add(o);return o;};
 const bodies=batch(new T.SphereGeometry(1,12,8),bodyMat,16),tails=batch(new T.ConeGeometry(1,1,3),bodyMat,16),eyes=batch(new T.SphereGeometry(1,6,4),dark,32),fins=batch(new T.ConeGeometry(1,1,3),bodyMat,16),stripes=batch(new T.TorusGeometry(1,.14,4,12),dark,32);
 function stamp(mesh,n,x,y,z,sx,sy,sz,h=0,rx=0){pose.position.set(x-SNORKEL.x,y,z-SNORKEL.z);pose.scale.set(sx,sy,sz);pose.rotation.set(rx,h,0);pose.updateMatrix();mesh.setMatrixAt(n,pose.matrix);}
 const sway={value:0},grassMat=mat(0xffffff,{side:T.DoubleSide,emissive:0x213d37,emissiveIntensity:.34}),fanMat=mat(0xffffff,{roughness:.82,emissive:0x4b394a,emissiveIntensity:.3});
 grassMat.onBeforeCompile=shader=>{
  shader.uniforms.reefSway=sway;
  shader.vertexShader='uniform float reefSway;\n'+shader.vertexShader.replace('#include <begin_vertex>',
   '#include <begin_vertex>\ntransformed.x+=transformed.y*transformed.y*.18*sin(reefSway*1.12+instanceMatrix[3].x*.024+instanceMatrix[3].z*.013);');
 };
 const grass=batch(eelgrassGeometry(),grassMat,160),fans=batch(fanCoralGeometry(),fanMat,104);
 grass.name='流れに揺れる海草';fans.name='岩礁の扇形サンゴ';
 let grassCount=0,fanCount=0;
 const grassColours=[0x68b698,0x82bd91,0x5b968c,0x539685],fanColours=[0xf4a88a,0xd88797,0x9e96d6,0xe7b38c];
 for(let col=0;col<11;col++)for(let row=0;row<9;row++){
  const seed=col*9+row,x=SNORKEL.x-328+col*84+Math.sin(seed*29)*31,z=SNORKEL.z-258+row*65+Math.cos(seed*13)*29,y=coastWalkingHeight(x,z);
  if(y>-45||y< -514)continue;
  const cluster=.5+.5*Math.sin(col*1.1+row*.75),scale=20+cluster*22;
  stamp(grass,grassCount,x,y+.35,z,scale,scale,scale,seed*2.399);
  grass.setColorAt(grassCount++,color.setHex(grassColours[seed%grassColours.length]));
  if(cluster>.63&&grassCount<grass.instanceMatrix.count){
   const gx=x-16,gz=z+11,gy=coastWalkingHeight(gx,gz);
   stamp(grass,grassCount,gx,gy+.3,gz,scale*.81,scale*.81,scale*.81,seed*.53);
   grass.setColorAt(grassCount++,color.setHex(grassColours[(seed+2)%grassColours.length]));
  }
  if(seed%3===0||cluster>.7&&seed%2===0){
   const fx=x+13,fz=z-9,fy=coastWalkingHeight(fx,fz),size=19+cluster*21;
   if(fy< -45&&fanCount+1<fans.instanceMatrix.count){
    stamp(fans,fanCount,fx,fy+.45,fz,size,size,size,seed*1.13);
    fans.setColorAt(fanCount++,color.setHex(fanColours[seed%fanColours.length]));
    const nx=fx+8,nz=fz+8,ny=coastWalkingHeight(nx,nz),small=size*.67;
    stamp(fans,fanCount,nx,ny+.45,nz,small,small,small,seed*1.13+1.6);
    fans.setColorAt(fanCount++,color.setHex(fanColours[(seed+1)%fanColours.length]));
   }
  }
 }
 grass.count=grassCount;fans.count=fanCount;
 for(const p of [grass,fans]){
  p.instanceMatrix.setUsage(T.StaticDrawUsage);p.instanceMatrix.needsUpdate=true;p.instanceColor.needsUpdate=true;
  p.computeBoundingSphere();p.frustumCulled=true;
 }
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
 const marker=mesh(new T.TorusGeometry(11,.8,6,20),mat(0xffe78d,{emissive:0xffcb60,emissiveIntensity:.5}));marker.visible=false;
 const handPoint=new T.Vector3(),facePoint=new T.Vector3(),handScale=new T.Vector3();let hiddenCharacter=null,hiddenCharacterVisible=true;
 const handViews=[0,1].map(n=>{const m=mesh(new T.SphereGeometry(1,12,8),mint);m.name=n?'手元の右手':'手元の左手';m.visible=false;return m;});
 function ownBody(character,hide){if(hiddenCharacter&&(hiddenCharacter!==character||!hide)){hiddenCharacter.visible=hiddenCharacterVisible;hiddenCharacter=null;}if(hide&&character){if(!hiddenCharacter){hiddenCharacter=character;hiddenCharacterVisible=character.visible;}character.visible=false;}}

 function highlight(target,character){if(disposed)return;marker.visible=!!target;if(target){marker.position.set(target.x-SNORKEL.x,target.y,target.z-SNORKEL.z);marker.quaternion.copy(character?.quaternion??new T.Quaternion());}}
 function update({visible,fish=[],target=null,active=false,character=null,time=0,waveTime=0,swing=0,aim=null,swimming=false,firstPerson=false}){
  if(disposed)return;ownBody(character,visible&&active&&firstPerson);for(const h of handViews)h.visible=false;root.visible=visible;if(!visible)return;stand.visible=!active;grass.visible=fans.visible=active;boundary.visible=true;sway.value=waveTime;
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
  net.visible=active&&!!character;mask.visible=net.visible&&!firstPerson;bubbles.visible=false;if(!character||!active)return;character.updateMatrixWorld(true);if(firstPerson)for(const[n,h]of (character.userData.walkRig?.hands??[]).entries()){const m=handViews[n];if(!m)continue;m.visible=true;m.geometry=h.part.geometry;m.material=h.part.material;h.part.getWorldPosition(handPoint);m.position.set(handPoint.x-SNORKEL.x,handPoint.y,handPoint.z-SNORKEL.z);h.part.getWorldQuaternion(m.quaternion);h.part.getWorldScale(handScale);m.scale.copy(handScale);}const rig=character.userData.walkRig,hand=rig?.hands?.[1]?.part;
  let tool=null;if(hand){hand.getWorldPosition(handPoint);tool=snorkelNetPose(handPoint,character.rotation.y,swing,aim);net.position.set(handPoint.x-SNORKEL.x,handPoint.y,handPoint.z-SNORKEL.z);net.rotation.set(tool.pitch,tool.yaw,0,'YXZ');}else net.visible=false;
  const b=character.userData.snorkelNeutralBody??character.userData.collisionFootprint,scale=character.scale.y,offset=character.userData.grounding?.verticalOffset??0;
  const faceEyes=character.userData.faceFeatures??[];if(faceEyes.length){facePoint.set(0,0,0);for(const eye of faceEyes)facePoint.add(eye.getWorldPosition(handPoint));facePoint.multiplyScalar(1/faceEyes.length);}else{facePoint.set(0,((b?.maxY??40)*.72-offset)/scale,((b?.halfZ??12)*.92)/scale);character.localToWorld(facePoint);}mask.position.set(facePoint.x-SNORKEL.x,facePoint.y,facePoint.z-SNORKEL.z);mask.quaternion.copy(character.quaternion);
  bubbles.visible=swimming&&facePoint.y<coastWave(facePoint.x,facePoint.z,waveTime).height-6;if(bubbles.visible){for(let n=0;n<18;n++){const age=(time*.7+n/18)%1,size=.5+age*.8;stamp(bubbles,n,facePoint.x+Math.sin(n*4+age*5)*age*9,facePoint.y+age*36,facePoint.z-9+Math.cos(n*3)*age*9,size,size,size);}bubbles.instanceMatrix.needsUpdate=true;}if(tool)tool.face={x:facePoint.x,y:facePoint.y,z:facePoint.z};return tool;
 }
 return{root,update,highlight,dispose(){if(disposed)return;disposed=true;ownBody(null,false);root.removeFromParent();batches.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
