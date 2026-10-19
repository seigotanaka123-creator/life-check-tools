import {updateWaterTruck} from './imasora-construction-water-truck-model.mjs?v=120ey';
import * as T from './three.module.min.js';
import {blend} from './imasora-construction-guide-data.mjs?v=120ey';
import {officialCharacter} from './imasora-construction-layout.js?v=120ds';
const lerp=(a,b,p)=>a+(b-a)*blend(p),rad=d=>d*Math.PI/180;
export function disposeTree(root){const g=new Set(),m=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){m.add(mat);for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);}});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}
function box(root,w,h,d,x,y,z,color){const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.8}));o.position.set(x,y,z);root.add(o);return o;}
function bar(root,a,b,r,color){const o=new T.Mesh(new T.CylinderGeometry(r,r,1,10),new T.MeshStandardMaterial({color}));root.add(o);o.userData.ends=(a,b)=>{const v=new T.Vector3(...b).sub(new T.Vector3(...a));o.position.fromArray(a).addScaledVector(v,.5);o.scale.y=v.length();o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());};o.userData.ends(a,b);return o;}
const vehicle=()=>({x:0,z:0,heading:0,steering:0,wheelTravel:0,speed:0});

// Lesson actors use the same formal model and seat sockets as play.
function performer(parent,name='lesson-worker'){
 const actor=new T.Group(),model=officialCharacter();actor.name=name;actor.add(model);parent.add(actor);const shadow=new T.Mesh(new T.CircleGeometry(1,24),new T.MeshBasicMaterial({color:0x587559,transparent:true,opacity:.17,depthWrite:false}));shadow.name='feet-contact-shadow';shadow.rotation.x=-Math.PI/2;shadow.scale.set(11,8,1);shadow.position.y=.03;actor.add(shadow);model.updateMatrixWorld(true);
 const footBottom=Math.min(...model.userData.feet.map(o=>new T.Box3().setFromObject(o).min.y));model.position.y=-footBottom;
 const feet=model.userData.feet.map(o=>({o,p:o.position.clone()})),hands=model.userData.hands.map(o=>({o,p:o.position.clone()}));
 const pose=(x,z,yaw=0,phase=null)=>{actor.position.set(x,0,z);actor.rotation.y=yaw;feet.forEach(({o,p},n)=>{o.position.copy(p);if(phase!==null){const s=Math.sin(phase+n*Math.PI);o.position.z+=s*7;o.position.y+=Math.max(0,s)*3;}});hands.forEach(({o,p})=>o.position.copy(p));actor.updateMatrixWorld(true);};
 const hand=(point,index=1)=>{actor.updateMatrixWorld(true);const h=hands[index].o;h.position.copy(h.parent.worldToLocal(new T.Vector3(...point)));actor.updateMatrixWorld(true);};
 return{actor,model,footBottom,pose,hand};
}
function driver(model,concrete=false){
 const ren=officialCharacter();ren.name='lesson-driver';if(concrete){ren.updateMatrixWorld(true);const bottom=Math.min(...ren.userData.feet.map(o=>new T.Box3().setFromObject(o).min.y));ren.position.set(-15,19-bottom,21);model.add(ren);}else{const socket=model.userData.pilotSocket;if(!socket)throw Error('Lesson driver needs a real seat');socket.add(ren);}
 return ren;
}
function manualLesson(root,id){
 const a=performer(root),tool=new T.Group();tool.name='lesson-hand-tool';root.add(tool);const shaft=bar(tool,[0,10,0],[0,0,0],.7,0xa47c50);shaft.name='hand-to-tool';const blade=box(tool,7,6,1,0,0,0,0x718f9b);let update;
 if(id==='shovel'){
  return import('./imasora-construction-dump-model.js?v=120ey').then(({createDumpModel})=>{
   const dump=createDumpModel();dump.position.set(-65,0,-10);dump.userData.cargo.visible=false;root.add(dump);const source=Array.from({length:8},(_,n)=>box(root,8,8,8,6+n%2*8,4+Math.floor(n/4)*8,32+Math.floor(n/2)%2*8,0xa97545));const held=box(tool,8,8,8,0,0,0,0xa97545),placed=box(root,8,8,8,30,4,32,0xa97545),inBed=box(root,8,8,8,-43,23,-34,0xa97545);
   const frame=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(18,.3,18)),new T.LineBasicMaterial({color:0xe0a91e}));frame.position.set(30,.25,32);root.add(frame);
   update=(i,p)=>{a.pose(i===3?lerp(0,2,Math.min(1,p*2)):0,i===3?lerp(0,-34,Math.min(1,p*2)):0,i===3?-Math.PI/2:0,i===3&&p<.5?p*24:null);let grip=new T.Vector3(10,12,10).applyMatrix4(a.actor.matrixWorld).toArray(),tip;
    if(i===0)tip=[10,lerp(2,12,p),lerp(35,24,p)];else if(i===1)tip=[10,12,24];else if(i===2)tip=[lerp(10,30,p),lerp(12,5,p),lerp(24,32,p)];else{const k=Math.max(0,p*2-1);tip=[lerp(grip[0]-12,-43,k),lerp(12,25,k),lerp(grip[2]-2,-34,k)];}
    a.hand(grip);shaft.userData.ends(grip,tip);blade.position.fromArray(tip);blade.rotation.x=i===0?-.35:i===2?p*.5:0;held.position.fromArray(tip).add(new T.Vector3(0,4,0));held.visible=i===0?p>.35:i===2?p<.85:i===3?p<.85:true;placed.visible=i===2&&p>=.85;inBed.visible=i===3&&p>=.85;frame.visible=i===1||i===2;frame.position.x=i===1?lerp(22,30,p):30;source.forEach((o,n)=>o.visible=n>0||i===0&&p<.35);};
   return{update,radius:65,target:new T.Vector3(-19,16,2),cameraOffset:[1.25,.9,1.6]};
  });
 }
 const isPaint=id==='paint',slab=box(root,24,4,24,0,2,22,0xc2c7c0),boards=[[-13,22,2,28],[13,22,2,28],[0,9,28,2],[0,35,28,2]].map(([x,z,w,d])=>box(root,w,6,d,x,3,z,0xe5bc83));a.pose(-30,14,Math.PI/2);blade.visible=false;
 const roller=bar(tool,[-4,0,0],[4,0,0],1.5,0x84c7df),trowel=box(tool,8,.7,5,0,0,0,0x86a1ad),brush=box(tool,3,1,4,0,0,0,0xf6c597),bucket=new T.Group();tool.add(bucket);box(bucket,7,6,7,0,0,0,0xa6bbc7);bar(bucket,[-3,3,0],[0,6,0],.35,0x778b96);bar(bucket,[0,6,0],[3,3,0],.35,0x778b96);const pour=bar(tool,[-6,10,22],[-2,4,22],1.8,0xafbbb7),boardInHand=box(tool,24,6,2,0,0,0,0xe5bc83);
 const patches=Array.from({length:16},(_,n)=>box(root,5.9,.12,5.9,-9+n%4*6,4.14,13+Math.floor(n/4)*6,0x8acde1));
 update=(i,p)=>{
  const working=isPaint&&(i===1||i===2),z=working?lerp(8,30,p):14;a.pose(-30,z,Math.PI/2,working?p*15:null);const grip=[-16,11,z];a.hand(grip);const head=[lerp(-9,9,p),4.8,isPaint?z:22];shaft.userData.ends(grip,head);tool.visible=true;roller.visible=isPaint&&i===1;roller.userData.ends([head[0]-4,head[1],head[2]],[head[0]+4,head[1],head[2]]);brush.visible=isPaint&&i===2;brush.position.fromArray(head);trowel.visible=!isPaint&&i===2;trowel.position.fromArray(head);shaft.visible=roller.visible||brush.visible||trowel.visible;
  bucket.visible=!isPaint&&i===1;bucket.position.set(-12,11,22);bucket.rotation.z=i===1?lerp(0,-.65,p):0;pour.visible=bucket.visible&&p>.2&&p<.9;boardInHand.visible=!isPaint&&i===0&&p<.82;const k=Math.min(1,p/.82);boardInHand.position.set(lerp(-15,-13,k),lerp(11,3,k),22);boardInHand.rotation.y=Math.PI/2;
  if(!isPaint){if(i===0)a.hand([boardInHand.position.x,boardInHand.position.y+1,22]);if(i===1){bucket.updateMatrixWorld(true);const handle=bucket.localToWorld(new T.Vector3(0,6,0)),lip=bucket.localToWorld(new T.Vector3(3,3,0));a.hand(handle.toArray());pour.userData.ends(lip.toArray(),[-3,Math.max(.3,4*blend(p)),22]);}boards.forEach((b,n)=>b.visible=i===0?n!==0||p>=.82:i<3||p<(n+1)/4);slab.visible=i>0;slab.scale.y=i===1?Math.max(.02,blend(p)):1;slab.position.y=2*slab.scale.y;slab.material.color.set(i===3?0xd1d7cd:0xb4bfba);}else{boards.forEach(b=>b.visible=false);slab.visible=true;}
  patches.forEach((o,n)=>{o.visible=isPaint&&(i===1?n/16<p:i===2?n!==5||p>.35:i===3?(Math.floor(n/4)+n%4)%2===0&&n/16<p:false);o.material.color.set(i===2&&n===5?0xf3bbce:0x8acde1);});
 };
 return Promise.resolve({update,radius:46,target:new T.Vector3(-8,13,19),cameraOffset:[1.05,1.0,1.5]});
}

export async function createLessonScene(id){
 const root=new T.Group(),extras=[];let cameraOffset=null;let update=()=>{},radius=100,target=new T.Vector3(0,22,20);
 const cubes=(x,z,color=0x98643a)=>Array.from({length:12},(_,i)=>box(root,8,8,8,x+(i%3)*8,4+Math.floor(i/6)*8,z+Math.floor(i/3)%2*8,color));
 const ground=box(root,470,2,420,0,-1.2,15,0xc4d6a5);
 if(id==='excavator'){
  const [{createExcavator,updateExcavatorModel},{initialExcavator}]=await Promise.all([import('./imasora-construction-excavator-model.js?v=120fc'),import('./imasora-construction-excavator.js?v=120fc')]);
  const model=createExcavator(),s=initialExcavator();root.add(model);driver(model);s.loader.vehicle=vehicle();s.bucketStyle='backhoe-v2';s.digMode='tooth-contact-v1';s.loader.mode='driving';const soil=cubes(30,80);radius=82;target.set(12,30,40);
  update=(i,p)=>{s.arm={boom:rad(74),stick:rad(-30),curl:rad(-72),slew:0};s.load=0;if(i===0)s.arm.slew=lerp(-.22,0,p);if(i===1){s.arm.boom=lerp(rad(74),rad(33),Math.min(1,p*2));s.arm.stick=lerp(rad(-30),rad(-90),Math.max(0,p*2-1));}if(i===2){s.load=6;s.arm.stick=rad(-90);s.arm.curl=lerp(rad(-72),rad(24),Math.min(1,p*2));s.arm.boom=lerp(rad(33),rad(74),Math.max(0,p*2-1));}if(i===3){s.arm.slew=lerp(0,.6,p);s.arm.stick=rad(-90);s.arm.curl=lerp(rad(24),rad(-72),p);s.load=p<.55?6:0;}soil.forEach((o,n)=>{o.visible=i<2||i===3&&p>.55;o.position.set(i===3?72+n%3*8:30+n%3*8,4+Math.floor(n/6)*8,80+Math.floor(n/3)%2*8);});updateExcavatorModel(model,s,{});};
 }else if(id==='dump'){
  const {createDumpModel,updateDumpModel}=await import('./imasora-construction-dump-model.js?v=120ey');const model=createDumpModel();root.add(model);driver(model);const w={rig:{vehicle:vehicle(),mode:'driving'},bed:0,load:0},soil=cubes(-8,-90);target.set(0,20,-20);radius=84;
  update=(i,p)=>{w.rig.vehicle.z=i===0?-20:i===1?lerp(-20,20,p):20;w.rig.vehicle.wheelTravel=i===1?p*40:0;w.bed=i===3?lerp(0,Math.PI/3,p):0;w.load=i===0?48*blend(p):i===3?48*(1-blend(p)):48;soil.forEach(o=>{o.visible=i===3;o.scale.y=Math.max(.01,blend(p));o.position.y=4*blend(p);});updateDumpModel(model,w,{});};
  }else if(id==='water'){
  const {createWaterTruck}=await import('./imasora-construction-water-truck-model.mjs?v=120ey'),{createWaterBuildView,updateWaterBuildView}=await import('./imasora-construction-water-build-view.mjs?v=120fb');const model=createWaterTruck();root.add(model);driver(model);const v=vehicle(),surface=createWaterBuildView(),cells=[{x:-4,y:0,z:64},{x:4,y:0,z:64}];root.add(surface);const stream=bar(root,[0,21,39],[0,8,64],1.1,0x40c9e4);radius=84;target.set(0,20,16);
  update=(i,p)=>{v.z=i===0?-15:i===1?lerp(-15,0,p):0;v.wheelTravel=i===1?p*15:0;const q=i<2?0:i===2?Math.floor(p*32):Math.floor((1-p)*32);updateWaterTruck(model,v,{steps:0,load:i===0?Math.floor(p*128):128-q});updateWaterBuildView(surface,cells.map((c,n)=>({kind:'block',cells:[c],top:8,capacity:16,q:Math.min(16,Math.max(0,q-n*16))})));stream.visible=i>=2;stream.userData.ends([0,21,39],[q>16?4:-4,Math.max(.2,(q%16)/2),64]);};
 }else if(id==='soil'){
  const {createLoader,updateLoaderModel}=await import('./imasora-construction-loader-work-model.js?v=120ey');let model,water;
  if(id==='water'){const {createWaterTransportView}=await import('./imasora-construction-water-transport-view.js?v=120fb');const yard=createWaterTransportView({embedded:true});model=yard.userData.loader;water=yard.userData.loadWater;yard.remove(model);extras.push(yard);}else model=createLoader();root.add(model);driver(model);const v=vehicle(),patch=box(root,45,2,35,0,1,64,id==='water'?0x28b6d7:0xa66096);if(id==='soil')model.userData.work.soil.material.color.set(0xa66096);const stream=bar(root,[0,12,53],[0,2,65],id==='water'?1.5:3,id==='water'?0x40c9e4:0xa66096);radius=76;target.set(0,20,15);
  update=(i,p)=>{v.z=i===0?-15:i===1?lerp(-15,8,p):8;v.wheelTravel=i===1?p*23:0;const load=i===0?Math.ceil(p*4):i===2?Math.ceil((1-p)*4):i===3?Math.ceil(p*4):4;(id==='water'?updateWaterTruck:updateLoaderModel)(model,v,{bucket:{lift:i===2?.4:0,tilt:i===2?lerp(0,.6,p):0},load:id==='water'?0:load});if(water){water.visible=load>0;water.scale.y=Math.max(.01,load/4);}patch.visible=i>=2;patch.scale.y=Math.max(.01,i===2?blend(p):1-blend(p));stream.visible=i===2;};
 }else if(id==='crane'){
  const [{createCrane,updateCraneModel,createPart},{initialCrane,tip}]=await Promise.all([import('./imasora-construction-crane-model.js?v=120fw'),import('./imasora-construction-crane.js?v=120fw')]);const model=createCrane(),s=initialCrane();driver(model);s.rig.vehicle=vehicle();s.rig.mode='driving';s.parts=[{...s.parts[0],x:0,z:96,y:0}];const part=createPart(s.parts[0]);root.add(model,part);radius=98;target.set(15,40,65);
  update=(i,p)=>{s.deployment=i===0?blend(p):1;s.boom={yaw:i===2?lerp(0,.6,p):i===3?.6:0,reach:70,cable:65};const t=tip(s);s.parts[0].x=t.x;s.parts[0].z=t.z;s.parts[0].y=i===2?lerp(0,28,p):i===3?lerp(28,0,p):0;s.held=i===2||i===3?s.parts[0].id:null;part.position.set(s.parts[0].x,s.parts[0].y,s.parts[0].z);updateCraneModel(model,s,{});};
 }else if(id==='mixer'||id==='pump'){
  const {createConcreteVehicle}=await import('./imasora-construction-concrete/vehicle-models.mjs?v=120fw');const mixer=createConcreteVehicle('truck'),pump=createConcreteVehicle('pump');mixer.root.position.set(-58,0,0);pump.root.position.set(58,0,0);root.add(mixer.root,pump.root);driver(mixer.root,true);driver(pump.root,true);radius=100;target.set(5,30,-10);if(id==='pump'){target.set(28,30,-22);cameraOffset=[1.7,1.25,1.1];}
  const hose=bar(root,[-58,10,-45],[58,10,-45],2.1,0x324953),joints=[[58,36,-5],[70,78,-23],[100,80,-65],[118,55,-80],[118,8,-80]],arms=joints.slice(1).map((b,i)=>bar(root,joints[i],b,i<3?3.8:1.7,i<3?0x05adc6:0x344752)),stream=bar(root,[118,8,-80],[118,2,-80],2,0xb8b9ae),floor=box(root,32,2,32,118,1,-80,0xb5b7a9);const fill=box(root,12,1,12,-58,45,-36,0xb8b9ae);const flow=Array.from({length:7},()=>{const bead=new T.Mesh(new T.SphereGeometry(2.4,8,6),new T.MeshStandardMaterial({color:0xcfd1b9}));root.add(bead);return bead;});
  update=(i,p)=>{mixer.drum.rotation.z=(i*5+p*5)*1.8;hose.visible=id==='mixer'?i>=2:true;pump.legs.visible=id==='pump'?i>0||p>.2:i>=2;const open=id==='pump'?(i===0?0:i===1?blend(p):i===2?1:1-blend(p)):0;pump.boom.visible=open===0;arms.forEach((o,n)=>{o.visible=open>0;const a=joints[n].map((v,k)=>k===1?lerp(36,v,open):lerp(k===0?58:-5,v,open)),b=joints[n+1].map((v,k)=>k===1?lerp(36,v,open):lerp(k===0?58:-5,v,open));o.userData.ends(a,b);});stream.visible=id==='pump'&&i===2;floor.scale.y=id==='pump'&&i===2?Math.max(.05,blend(p)):1;fill.visible=id==='mixer'&&i<2;fill.scale.y=Math.max(.01,blend(p)*6);flow.forEach((bead,n)=>{bead.visible=id==='mixer'?i===3:i===2;const t=(p*2+n/7)%1;bead.position.set(lerp(-58,58,t),10,-45);});};
 }else if(id==='controls'){
  const {createDumpModel,updateDumpModel}=await import('./imasora-construction-dump-model.js?v=120ey');const car=createDumpModel(),a=performer(root);root.add(car);const w={rig:{vehicle:vehicle(),mode:'driving'},bed:0,load:0};const socket=car.userData.pilotSocket;const mark=box(root,23,.2,20,-49,.2,18,0xffdb90);radius=71;target.set(-8,20,8);
  update=(i,p)=>{w.rig.vehicle.z=i===2?lerp(0,32,p):0;w.rig.vehicle.wheelTravel=i===2?p*32:0;updateDumpModel(car,w,{});mark.visible=i<2;a.actor.getObjectByName('feet-contact-shadow').visible=i===0;const seat=socket.getWorldPosition(new T.Vector3());a.pose(i===0?lerp(-83,-49,p):i===1?lerp(-49,seat.x,p):seat.x,i===2?seat.z:18,i===0?Math.PI/2:lerp(Math.PI/2,0,i===1?p:1),i===0?p*20:null);a.actor.position.y=i===0?0:i===1?lerp(0,seat.y+a.footBottom,p):seat.y+a.footBottom;};
 }else{
  const manual=await manualLesson(root,id);update=manual.update;radius=manual.radius;target=manual.target;cameraOffset=manual.cameraOffset;
 }

 update(0,0);return{root,radius,target,cameraOffset,update,dispose(){disposeTree(root);extras.forEach(disposeTree);}};
}
