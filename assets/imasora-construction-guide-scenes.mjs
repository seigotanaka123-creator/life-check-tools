import {updateWaterTruck} from './imasora-construction-water-truck-model.mjs?v=120ov';
import * as T from './three.module.min.js';
import {blend} from './imasora-construction-guide-data.mjs?v=120gm';
import {officialCharacter} from './imasora-construction-layout.js?v=120ob';
import {createFleetModel} from './imasora-construction-fleet-model.mjs?v=121cc';
import {RAIN_WORKS_JOBS,RAIN_WORKS_STAGES,RAIN_WORKS_CUT_CELLS,advanceRainWorksExcavation,rainWorksCutOrder,rainWorksWater,captureRainWorksPose,validRainWorksPose,constructionWorkshopJob,RAIN_WORKS_CONCRETE_BATCHES} from './imasora-construction-guide-data.mjs?v=121gv';
import {armPose, solveBucketPose} from './imasora-construction-excavator.js?v=120ov';
import {bucketContactGeometry,prismTouchesBox} from './imasora-construction-excavator-contact.js?v=120fc';
import {DIG_READY} from './imasora-construction-excavator-one-touch.js?v=120ov';
import {excavatorAccessPath} from './imasora-construction-excavator-access.js?v=120ov';
import {localToWorld,samplePath,transitionPoints} from './imasora-construction-loader-physics.js?v=120ov';
import {DUMP_CAB} from './imasora-construction-dump-cab.mjs?v=120ov';
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
 return{actor,model,footBottom,pose,hand,shadow};
}
function driver(model,concrete=false){
 const ren=officialCharacter();ren.name='lesson-driver';if(concrete){ren.updateMatrixWorld(true);const bottom=Math.min(...ren.userData.feet.map(o=>new T.Box3().setFromObject(o).min.y));ren.position.set(-15,19-bottom,21);model.add(ren);}else{const socket=model.userData.pilotSocket;if(!socket)throw Error('Lesson driver needs a real seat');socket.add(ren);}
 return ren;
}
function manualLesson(root,id){
 const a=performer(root),tool=new T.Group();tool.name='lesson-hand-tool';root.add(tool);const shaft=bar(tool,[0,10,0],[0,0,0],.7,0xa47c50);shaft.name='hand-to-tool';const blade=box(tool,7,6,1,0,0,0,0x718f9b);let update;
 if(id==='shovel'){
  return import('./imasora-construction-dump-model.js?v=120ov').then(({createDumpModel})=>{
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
 const soilBin=(x,z)=>{
  const width=54,length=54,wall=3,rim=10,color=0x83715e;
  box(root,width,2,length,x,1,z,0x655545);
  for(const a of [-1,1]){
   box(root,wall,rim,length,x+a*(width-wall)/2,rim/2,z,color);
   box(root,width-wall*2,rim,wall,x,rim/2,z+a*(length-wall)/2,color);
  }
 };
 if(id==='excavator'){
  const [{createExcavator,updateExcavatorModel},{initialExcavator}]=await Promise.all([import('./imasora-construction-excavator-model.js?v=120ov'),import('./imasora-construction-excavator.js?v=120ov')]);
  const model=createExcavator(),s=initialExcavator();root.add(model);driver(model);s.loader.vehicle=vehicle();s.bucketStyle='backhoe-v2';s.digMode='tooth-contact-v1';s.loader.mode='driving';const soil=cubes(30,80);soilBin(79,66);radius=95;target.set(22,30,39);
  update=(i,p)=>{s.arm={boom:rad(74),stick:rad(-30),curl:rad(-72),slew:0};s.load=0;if(i===0)s.arm.slew=lerp(-.22,0,p);if(i===1){s.arm.boom=lerp(rad(74),rad(33),Math.min(1,p*2));s.arm.stick=lerp(rad(-30),rad(-90),Math.max(0,p*2-1));}if(i===2){s.load=6;s.arm.stick=rad(-90);s.arm.curl=lerp(rad(-72),rad(24),Math.min(1,p*2));s.arm.boom=lerp(rad(33),rad(74),Math.max(0,p*2-1));}if(i===3){s.arm.slew=lerp(0,.88,Math.min(1,p*1.9));s.arm.stick=rad(-90);s.arm.curl=lerp(rad(24),rad(-72),Math.max(0,p*2-1));s.load=p<.66?6:0;}soil.forEach((o,n)=>{o.visible=i<2||i===3&&p>.66;o.position.set(i===3?71+n%3*8:30+n%3*8,4+Math.floor(n/6)*8,i===3?62+Math.floor(n/3)%2*8:80+Math.floor(n/3)%2*8);});updateExcavatorModel(model,s,{});};
 }else if(id==='dump'){
  const {createDumpModel,updateDumpModel}=await import('./imasora-construction-dump-model.js?v=120ov');const model=createDumpModel();root.add(model);driver(model);const w={rig:{vehicle:vehicle(),mode:'driving'},bed:0,load:0},soil=cubes(-8,-90);soilBin(0,-86);target.set(0,20,-26);radius=92;
  update=(i,p)=>{w.rig.vehicle.z=i===0?24:i===1?lerp(24,-16,p):-16;w.rig.vehicle.wheelTravel=i===1?-p*40:0;w.bed=i===3?lerp(0,Math.PI/3,p):0;w.load=i===0?48*blend(p):i===3?48*(1-blend(p)):48;soil.forEach(o=>{o.visible=i===3;o.scale.y=Math.max(.01,blend(p));o.position.y=4*blend(p);});updateDumpModel(model,w,{});};
  }else if(id==='water'){
  const {createWaterTruck}=await import('./imasora-construction-water-truck-model.mjs?v=120ov'),{createWaterBuildView,updateWaterBuildView}=await import('./imasora-construction-water-build-view.mjs?v=120ov');const model=createWaterTruck();root.add(model);driver(model);const v=vehicle(),surface=createWaterBuildView(),cells=[{x:-4,y:0,z:64},{x:4,y:0,z:64}];root.add(surface);const stream=bar(root,[0,21,39],[0,8,64],1.1,0x40c9e4);radius=84;target.set(0,20,16);
  update=(i,p)=>{v.z=i===0?-15:i===1?lerp(-15,0,p):0;v.wheelTravel=i===1?p*15:0;const q=i<2?0:i===2?Math.floor(p*32):Math.floor((1-p)*32);updateWaterTruck(model,v,{steps:0,load:i===0?Math.floor(p*128):128-q});updateWaterBuildView(surface,cells.map((c,n)=>({kind:'block',cells:[c],top:8,capacity:16,q:Math.min(16,Math.max(0,q-n*16))})));stream.visible=i>=2;stream.userData.ends([0,21,39],[q>16?4:-4,Math.max(.2,(q%16)/2),64]);};
 }else if(id==='soil'){
  const {createLoader,updateLoaderModel}=await import('./imasora-construction-loader-work-model.js?v=120ov');let model,water;
  if(id==='water'){const {createWaterTransportView}=await import('./imasora-construction-water-transport-view.js?v=120ov');const yard=createWaterTransportView({embedded:true});model=yard.userData.loader;water=yard.userData.loadWater;yard.remove(model);extras.push(yard);}else model=createLoader();root.add(model);driver(model);const v=vehicle(),patch=box(root,45,2,35,0,1,64,id==='water'?0x28b6d7:0xa66096);if(id==='soil')model.userData.work.soil.material.color.set(0xa66096);const stream=bar(root,[0,12,53],[0,2,65],id==='water'?1.5:3,id==='water'?0x40c9e4:0xa66096);radius=76;target.set(0,20,15);
  update=(i,p)=>{v.z=i===0?-15:i===1?lerp(-15,8,p):8;v.wheelTravel=i===1?p*23:0;const load=i===0?Math.ceil(p*4):i===2?Math.ceil((1-p)*4):i===3?Math.ceil(p*4):4;(id==='water'?updateWaterTruck:updateLoaderModel)(model,v,{bucket:{lift:i===2?.4:0,tilt:i===2?lerp(0,.6,p):0},load:id==='water'?0:load});if(water){water.visible=load>0;water.scale.y=Math.max(.01,load/4);}patch.visible=i>=2;patch.scale.y=Math.max(.01,i===2?blend(p):1-blend(p));stream.visible=i===2;};
 }else if(id==='crane'){
  const [{createCrane,updateCraneModel,createPart},{initialCrane,tip}]=await Promise.all([import('./imasora-construction-crane-model.js?v=120pv'),import('./imasora-construction-crane.js?v=120pv')]);const model=createCrane(),s=initialCrane();driver(model);s.rig.vehicle=vehicle();s.rig.mode='driving';s.parts=[{...s.parts[0],x:0,z:96,y:0}];const part=createPart(s.parts[0]);root.add(model,part);radius=98;target.set(15,40,65);
  update=(i,p)=>{s.deployment=i===0?blend(p):1;s.boom={yaw:i===2?lerp(0,.6,p):i===3?.6:0,reach:70,cable:65};const t=tip(s);s.parts[0].x=t.x;s.parts[0].z=t.z;s.parts[0].y=i===2?lerp(0,28,p):i===3?lerp(28,0,p):0;s.held=i===2||i===3?s.parts[0].id:null;part.position.set(s.parts[0].x,s.parts[0].y,s.parts[0].z);updateCraneModel(model,s,{});};
 }else if(id==='crane-kit'){
  const [{createCrane,updateCraneModel},{initialCrane,tip},{createTimberPart},{kitTemplate}]=await Promise.all([import('./imasora-construction-crane-model.js?v=120pv'),import('./imasora-construction-crane.js?v=120pv'),import('./imasora-construction-timber-model.js?v=120pv'),import('./imasora-construction-kit-cargo.mjs?v=120pl')]);
  const model=createCrane(),s=initialCrane(),cargo={...kitTemplate({version:1,partId:'building-kit-lesson-0001',projectId:'building-1',level:1,scale:1}),x:0,y:10,z:96,angle:0,hover:null,fixed:false,vx:0,vy:0,vz:0},part=createTimberPart(cargo);driver(model);s.rig.vehicle=vehicle();s.rig.mode='driving';s.parts=[cargo];root.add(model,part);box(root,40,10,25,0,5,96,0xc99a61);const dx=Math.sin(.6)*95,dz=26+Math.cos(.6)*95;box(root,38,2,36,dx,-1,dz,0xffdb90);for(const x of[-19,19])box(root,2,76,2,dx+x,36,dz+16,0x839ca8);radius=112;target.set(24,35,66);
  update=(i,p)=>{s.deployment=i===0?blend(p):1;s.boom={yaw:i<2?0:i===2?lerp(0,.6,p):.6,reach:i<2?70:i===2?lerp(70,95,p):95,cable:46.5};const t=tip(s);s.boom.cable=i===0?46.5:i===1?lerp(46.5,10,p):i===2?10:lerp(10,t.y-10,p);cargo.x=t.x;cargo.z=t.z;cargo.y=Math.max(0,t.y-s.boom.cable-10);s.held=i===0||i===3&&p>.98?null:cargo.id;part.position.set(cargo.x,cargo.y,cargo.z);updateCraneModel(model,s,{});};
 }else if(id==='mixer'||id==='pump'){
  const {createConcreteVehicle}=await import('./imasora-construction-concrete/vehicle-models.mjs?v=120pv');const mixer=createConcreteVehicle('truck'),pump=createConcreteVehicle('pump');mixer.root.position.set(-58,0,0);pump.root.position.set(58,0,0);root.add(mixer.root,pump.root);driver(mixer.root,true);driver(pump.root,true);radius=100;target.set(5,30,-10);if(id==='pump'){target.set(28,30,-22);cameraOffset=[1.7,1.25,1.1];}
  const hose=bar(root,[-58,10,-45],[58,10,-45],2.1,0x324953),joints=[[58,36,-5],[70,78,-23],[100,80,-65],[118,55,-80],[118,8,-80]],arms=joints.slice(1).map((b,i)=>bar(root,joints[i],b,i<3?3.8:1.7,i<3?0x05adc6:0x344752)),stream=bar(root,[118,8,-80],[118,2,-80],2,0xb8b9ae),floor=box(root,32,2,32,118,1,-80,0xb5b7a9);const fill=box(root,12,1,12,-58,45,-36,0xb8b9ae);const flow=Array.from({length:7},()=>{const bead=new T.Mesh(new T.SphereGeometry(2.4,8,6),new T.MeshStandardMaterial({color:0xcfd1b9}));root.add(bead);return bead;});
  update=(i,p)=>{mixer.drum.rotation.z=(i*5+p*5)*1.8;hose.visible=id==='mixer'?i>=2:true;pump.legs.visible=id==='pump'?i>0||p>.2:i>=2;const open=id==='pump'?(i===0?0:i===1?blend(p):i===2?1:1-blend(p)):0;pump.boom.visible=open===0;arms.forEach((o,n)=>{o.visible=open>0;const a=joints[n].map((v,k)=>k===1?lerp(36,v,open):lerp(k===0?58:-5,v,open)),b=joints[n+1].map((v,k)=>k===1?lerp(36,v,open):lerp(k===0?58:-5,v,open));o.userData.ends(a,b);});stream.visible=id==='pump'&&i===2;floor.scale.y=id==='pump'&&i===2?Math.max(.05,blend(p)):1;fill.visible=id==='mixer'&&i<2;fill.scale.y=Math.max(.01,blend(p)*6);flow.forEach((bead,n)=>{bead.visible=id==='mixer'?i===3:i===2;const t=(p*2+n/7)%1;bead.position.set(lerp(-58,58,t),10,-45);});};
 }else if(id==='controls'){
  const {createDumpModel,updateDumpModel}=await import('./imasora-construction-dump-model.js?v=120ov');const car=createDumpModel(),a=performer(root);root.add(car);const w={rig:{vehicle:vehicle(),mode:'driving'},bed:0,load:0};const socket=car.userData.pilotSocket;const mark=box(root,23,.2,20,-49,.2,18,0xffdb90);radius=71;target.set(-8,20,8);
  update=(i,p)=>{w.rig.vehicle.z=i===2?lerp(0,32,p):0;w.rig.vehicle.wheelTravel=i===2?p*32:0;updateDumpModel(car,w,{});mark.visible=i<2;a.actor.getObjectByName('feet-contact-shadow').visible=i===0;const seat=socket.getWorldPosition(new T.Vector3());a.pose(i===0?lerp(-83,-49,p):i===1?lerp(-49,seat.x,p):seat.x,i===2?seat.z:18,i===0?Math.PI/2:lerp(Math.PI/2,0,i===1?p:1),i===0?p*20:null);a.actor.position.y=i===0?0:i===1?lerp(0,seat.y+a.footBottom,p):seat.y+a.footBottom;};
 }else{
  const manual=await manualLesson(root,id);update=manual.update;radius=manual.radius;target=manual.target;cameraOffset=manual.cameraOffset;
 }

 update(0,0);return{root,radius,target,cameraOffset,update,dispose(){disposeTree(root);extras.forEach(disposeTree);}};
}

const mix=T.MathUtils.lerp;
const dumpLoadZ=-42;
const workPositions=[[-66,-67],[106,dumpLoadZ],[-126,-72],[-151,-99],[58,-79],[7,-117],[-154,122]];
const cutCells=RAIN_WORKS_CUT_CELLS;
const dumpBed={x:-119,z:2};
const dumpDock={x:dumpBed.x+22,z:dumpBed.z,heading:Math.PI/2};
const channel=[[-57,12.43,30],[-33,11.15,30],[0,9.4,30],[33,7.65,30],[56,6.43,30]];
const supportX=[-28,0,28];
const kitPlaces=[[-16.5,10.28,30],[16.5,8.53,30]];
const kitRack=[[-71,1,-26],[64,1,-22]];
const rainWorksDoorRadius=11;
const set=(m,x,y,z)=>m.position.set(x,y,z);
const fraction=(job,op,batch,p)=>job?.batch===batch&&job.id===op?p:0;

export async function createRainWorksYard(){
 const results=await Promise.allSettled(RAIN_WORKS_STAGES.map(stage=>createFleetModel(stage.vehicle)));
 if(results.some(r=>r.status==='rejected')){
  for(const r of results)if(r.status==='fulfilled')r.value.dispose();
  throw results.find(r=>r.status==='rejected').reason;
 }
 const fleet=results.map(r=>r.value);
 const scene=new T.Scene();scene.background=new T.Color(0xc2d4d5);
 scene.fog=new T.Fog(0xc2d4d5,650,1400);
 const works=new T.Group();scene.add(works);
 const worker=performer(scene,'rain-works-seharune');
 const doorMark=new T.Mesh(new T.RingGeometry(rainWorksDoorRadius-2,rainWorksDoorRadius,32),
  new T.MeshBasicMaterial({color:0xffd768,side:T.DoubleSide}));
 doorMark.rotation.x=-Math.PI/2;works.add(doorMark);
 const doorArrow=new T.Mesh(new T.ConeGeometry(4.2,8,4),doorMark.material);
 doorArrow.rotation.z=Math.PI;works.add(doorArrow);
 for(const character of [worker.model,...fleet.map(machine=>machine.driver)]){
  character.traverse(node=>{if(node.isMesh)node.userData.rainWorksCharacter=true;});
 }
 const camera=new T.PerspectiveCamera(42,1,.5,1600);
 const daylight=new T.DirectionalLight(0xffefd7,2.05);daylight.position.set(-210,430,145);
 scene.add(daylight,new T.HemisphereLight(0xecf6ff,0xa79a75,1.71));
 const colors={ground:0xad9e82,earth:0x936b49,loam:0xac956f,rail:0x4e6469,concrete:0xbfc4b9,
  form:0xaf793e,yellow:0xf5c967,cream:0xf8eac8,slab:0x839ba1,water:0x238aae};
 const slab=(w,h,d,x,y,z,c,parent=works)=>box(parent,w,h,d,x,y,z,colors[c]??c);
 function frame(parent,w,d,x,y,z){
  const geometry=new T.EdgesGeometry(new T.BoxGeometry(w,1.6,d));
  const mesh=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0xffca56,transparent:true,opacity:.94}));
  set(mesh,x,y,z);parent.add(mesh);return mesh;
 }
 slab(840,6,610,0,-13,0,'ground');
 for(const [w,d,x,z] of [[840,243,0,-185],[840,221,0,185],[369,75,-235,26],[369,75,235,26]])slab(w,10,d,x,-5,z,'ground');
 // The ground on the north side provides a walkway to the parked machines.
 slab(102,10,51,0,-5,-38.5,'ground');
 slab(720,.25,88,0,.05,150,0x8e9490);
 for(let x=-310;x<310;x+=34)slab(16,.06,.95,x,.22,150,0xd4d1a1);
 for(const z of [-283,238]){
  for(let x=-354;x<=354;x+=47)slab(2,16,2,x,8,z,'rail');
  for(const y of [5,12])slab(708,1.25,1.15,0,y,z,'rail');
 }
 for(const x of [-309,-267,263,305])for(const z of [-264,224]){
  slab(19,17,18,x,7,z,x<0?0x83999b:0x829181);
  slab(17,1.3,16,x,15,z,'cream');
 }
 const excavated=cutCells.map(([x,z])=>slab(27,10,27,x,-4.98,z,'earth'));
 const cutForecast=cutCells.map(([x,z])=>{
  const mesh=new T.Mesh(new T.BoxGeometry(27,.15,27),new T.MeshBasicMaterial({
   color:0x64eaff,transparent:true,opacity:.62,depthWrite:false}));
  set(mesh,x,.23,z);works.add(mesh);return mesh;
 });
 const spoils=Array.from({length:4},(_,i)=>slab(21,12,21,106+i*29,6,63,'earth'));
 const pads=Array.from({length:3},(_,i)=>slab(19,10,31,supportX[i],-5,30,'loam'));
 const forms=supportX.map((x,i)=>{
  const y=9.4-x*1.75/33-1.80;
  const group=new T.Group();set(group,x,y,30);works.add(group);
  const lining=slab(18,Math.max(3,y),25,0,-Math.max(3,y)/2,0,'concrete',group);
  const saddle=slab(18,.70,24,0,.18,0,'rail',group);saddle.rotation.z=Math.atan2(-1.75,33);
  const edges=[];
  for(const z of [-13,13])edges.push(slab(20,5,1,0,-1.8,z,'form',group));
  for(const x of [-10,10])edges.push(slab(1,5,27,x,-1.8,0,'form',group));
  return {lining,saddle,edges};
 });
 function bed(points,parent,width=20){
  const [a,b]=points,d=new T.Vector3(...b).sub(new T.Vector3(...a)),angle=Math.atan2(d.y,d.x);
  const center=new T.Vector3(...a).addScaledVector(d,.5);
  const trough=slab(d.length(),1.25,width,center.x,center.y-.63,center.z,'slab',parent);trough.rotation.z=angle;
  for(const z of [-width/2,width/2]){
   const lip=slab(d.length(),4,1.35,center.x,center.y+1.6,center.z+z,'slab',parent);
   lip.rotation.z=angle;
  }
 }
 bed(channel.slice(0,2),works);bed(channel.slice(3,5),works);
 const parts=kitPlaces.map((point,i)=>{
  const root=new T.Group();works.add(root);
  bed([[-16.5,.875,0],[16.5,-.875,0]],root);
  for(const x of [-15,15])for(const z of [-9.4,9.4])slab(3.1,1,.8,x,3,z,'yellow',root);
  return root;
 });
 const placement=kitPlaces.map(([x,y,z])=>frame(works,33,21,x,y,z));
 const taskMark=frame(works,39,43,0,1,0);
 const toolMark=new T.Mesh(new T.RingGeometry(3.7,4.7,20),new T.MeshBasicMaterial({color:0xf5dfaa,side:T.DoubleSide}));
 toolMark.rotation.x=-Math.PI/2;works.add(toolMark);
 const sump=new T.Group();set(sump,66,0,30);works.add(sump);
 slab(22,1,24,0,0,0,'slab',sump);
 slab(1.2,7.4,24,11,3.5,0,'slab',sump);
 // Leave the upstream wall open where the channel drops into the tank.
 for(const z of [-10.4,10.4])slab(1.2,7.4,3.2,-11,3.5,z,'slab',sump);
 for(const z of [-12,12])slab(23,7.4,1.2,0,3.5,z,'slab',sump);
 const collected=slab(20,1,22,0,0,0,'water',sump);
 const waterStrips=channel.slice(1).map((b,i)=>{
  const a=channel[i],s=slab(Math.hypot(b[0]-a[0],b[1]-a[1]),.30,16,(a[0]+b[0])/2,(a[1]+b[1])/2+.15,30,'water');
  s.rotation.z=Math.atan2(b[1]-a[1],b[0]-a[0]);return s;
 });
 const waterJet=bar(works,[-67,16,30],channel[0],1.1,0x33acd5),concreteJet=bar(works,[58,31,-2],[0,10,18],1.6,0xb2bdad);
 const outlet=bar(works,[56,6.45,30],[59,.5,30],1.05,0x369db8);
 const waterHose=bar(works,[-146,7,58],[-67,16,30],1.55,0x374c52);
 const recoveryHose=[bar(works,[-146,7,58],[-116,1,85],1.45,0x374c52),bar(works,[-116,1,85],[65,1,85],1.45,0x374c52),bar(works,[65,1,85],[66,3,33],1.45,0x374c52)];
 const mixerChute=bar(works,[-151,17,-145],[-63,15,-138],2,0x8fa2a3);
 const mixerLoad=Array.from({length:10},(_,i)=>slab(2.1,1.1,2.1,-151,16,-143,0xcdd1bf));
 const hopperConcrete=slab(15,.9,4,58,26,-117,'concrete');
 const crates=kitRack.map(([x,y,z])=>{
  const bundle=new T.Group();set(bundle,x,y,z);works.add(bundle);
  slab(37,12,26,0,6,0,'form',bundle);slab(37,1.1,26,0,12.6,0,'cream',bundle);
  for(const side of [-11,11])slab(2,13,26,side,6.4,0,'rail',bundle);
  return bundle;
 });
 const hoseEnds=[[58,32,-52],[61,86,-23],[23,83,3],[0,36,30],[0,13,30]];
 const foldedHoseEnds=[[58,32,-52],[53,40,-115],[61,48,-77],[70,54,-109],[76,39,-111]];
 const hose=hoseEnds.slice(1).map((b,i)=>bar(works,hoseEnds[i],b,i<3?2.6:1.15,i<3?0x2997a5:0x4a5a55));
 const supply=slab(28,12,36,-150,6,178,'slab'),feed=slab(36,1,30,-212,1,-125,'cream');
 for(const entry of fleet)scene.add(entry.root);
 const parked=fleet.map(()=>false);
 const stageDone=(step,stage,id,batch)=>RAIN_WORKS_JOBS.some((job,i)=>i<step&&job.stage===stage&&job.id===id&&job.batch===batch);
 const cameraTarget=new T.Vector3(),cameraEye=new T.Vector3(),screenPoint=new T.Vector3();
 function render(renderer,{step,job=RAIN_WORKS_JOBS[step],progress=0,machineState,mounted=false,handed=false,access,workBand,cutOrder=[],aim}){
  const p=progress;
  const stage=job?.stage??6, batch=job?.batch??0, id=job?.id;
  for(const [i,machine] of fleet.entries()){
   const atWork=stage===i&&!!job;
   machine.driver.visible=atWork&&mounted;
   // Inactive machines stay in the site's parking bays visible from the yard.
   if(!atWork){
    if(!parked[i])machine.pose({x:-238+i*78,z:-215,heading:.03});
    parked[i]=true;continue;
   }
   parked[i]=false;
   const phase=machineState??createRainWorksMachine(job);
   if(i===6)phase.load=Math.round(rainWorksWater(batch,id,p).truck*4);
   if(i===5){
    const hook=rainWorksHook(phase);
    phase.boom={yaw:phase.slew,reach:phase.reach,cable:42+phase.reach*.35-hook.y};
    if(phase.holding){
     const part=parts[batch];set(part,hook.x,hook.y-6,hook.z);
     phase.held={id:'waterway-'+batch,x:hook.x,y:hook.y-6,z:hook.z,h:2,w:32,d:20,angle:0};
    }else phase.held=null;
   }
   machine.pose({...phase,externalHose:i===4&&['aim','pour','finish','retract'].includes(id)&&!(id==='retract'&&p===1),boarding:!!access,doorAngle:access?.doorAngle??0});
  }
  // A receiving vehicle only appears at the transfer point while it receives.
  if(stage===0&&mounted){
   const delivered=batch*6+(machineState?.excavation?.kind==='load-marked-soil'?6-machineState.load:0);
   fleet[1].pose({...dumpDock,load:delivered});
   parked[1]=false;
  }
  if(stage===3&&mounted){fleet[4].pose({x:-63,z:-99});parked[4]=false;}
  excavated.forEach((cell,i)=>{
   const motion=machineState?.excavation;
   const done=cutOrder.includes(i)||motion?.cell===i&&motion.effectApplied;
   cell.scale.y=done?.01:1;
   cell.position.y=-10+5*cell.scale.y;
   cutForecast[i].visible=stage===0&&mounted&&aim?.cell===i&&!done;
  });
  spoils.forEach((pile,i)=>{
   const fill=stageDone(step,1,'tip',i)?1:stage===1?fraction(job,'tip',i,p):0;
   pile.visible=fill>.001;pile.scale.y=Math.max(.01,fill);pile.position.y=6*fill;
  });
  pads.forEach((pad,i)=>{
   const fill=stageDone(step,2,'spread',i)?1:stage===2?fraction(job,'spread',i,p):0;
   pad.visible=fill>.001;pad.scale.y=Math.max(.01,fill);pad.position.y=-9+5*fill;
  });
  const concreteHose=stage===4&&mounted;
  hopperConcrete.visible=concreteHose&&(['deploy','receive'].includes(id))&&(id!=='receive'||p<1);
  if(hopperConcrete.visible)hopperConcrete.scale.z=Math.max(.05,id==='receive'?1-p:1);
  forms.forEach(({lining,saddle,edges},i)=>{
   const done=stageDone(step,4,'finish',i);
   const base=stageDone(step,4,'pour',i)?.8:0;
   const fill=done?1:base+(stage===4?.8*fraction(job,'pour',i,p)+.2*fraction(job,'finish',i,p):0);
   lining.visible=fill>.001;lining.scale.y=Math.max(.01,fill);
   lining.material.color.setHex(stage>=5?colors.concrete:0xa6ada4);
   lining.position.y=-lining.geometry.parameters.height*(1-fill/2);
   saddle.visible=stage>=5&&done;
   for(const edge of edges)edge.visible=stage>=3&&stage<5;
  });
  const foldingHose=id==='retract',showHose=concreteHose&&(['aim','pour','finish'].includes(id)||foldingHose&&p<1);
  const nozzle=machineState?.nozzle??supportX[batch]??0;
  const hosePoint=j=>{
   const start=j<2?hoseEnds[j]:[nozzle,j===4?(machineState?.nozzleY??13):hoseEnds[j][1],hoseEnds[j][2]];
   if(!foldingHose)return start;
   // Lift free of the frames before folding back towards the vehicle.
   const raised=j===4?[start[0],36,start[2]]:start;
   if(p<.3)return start.map((n,k)=>mix(n,raised[k],p/.3));
   return raised.map((n,k)=>mix(n,foldedHoseEnds[j][k],(p-.3)/.7));
  };
  hose.forEach((pipe,i)=>{
   pipe.visible=showHose;
   if(showHose)pipe.userData.ends(hosePoint(i),hosePoint(i+1));
  });
  concreteJet.visible=concreteHose&&['pour','finish'].includes(id)&&machineState?.gate>.08&&pumpNozzleAligned(machineState,batch);
  if(concreteJet.visible){
   const x=machineState?.nozzle??supportX[batch];
   concreteJet.userData.ends([x,machineState?.nozzleY??13,30],[x,4+4*p,30]);
  }
  const readyCount=parts.reduce((n,part,i)=>{
   const mountedPart=stageDone(step,5,'lower',i)||(stage===5&&batch===i&&id==='lower'&&p===1);
   const activePart=stage===5&&batch===i&&mounted&&machineState?.holding;
   if(!activePart)part.position.fromArray(mountedPart?kitPlaces[i]:kitRack[i]);
   part.visible=stage>=5&&!handed;placement[i].visible=stage===5&&!mountedPart;
   crates[i].visible=handed;
   return n+Number(mountedPart);
  },0);
  const water=stage===6&&job?rainWorksWater(batch,id,p,readyCount):null;
  waterStrips.forEach((line,i)=>{line.visible=!!water&&water.sections[i]>.005;line.scale.z=.52+Math.min(.48,(water?.sections[i]??0)/3);});
  collected.visible=!!water&&water.catchTank>.004;
  if(collected.visible){collected.scale.y=Math.min(5,water.catchTank/10);collected.position.y=.5+collected.scale.y/2;}
  outlet.visible=!!water&&id==='pour'&&water.sections[3]>.005;
  if(outlet.visible)outlet.userData.ends([56,6.45,30],[59,.6+collected.scale.y,30]);
  waterJet.visible=!!water&&id==='pour'&&p>0&&p<.8;
  waterHose.visible=!!water&&mounted&&id==='pour';
  for(const pipe of recoveryHose)pipe.visible=!!water&&mounted&&id==='recover';
  mixerChute.visible=stage===3&&mounted&&(machineState?.chute??0)>.02;
  if(mixerChute.visible)mixerChute.userData.ends([-151,17,-145],[mix(-151,-63,machineState.chute),15,-138]);
  mixerLoad.forEach((part,i)=>{
   part.visible=mixerChute.visible&&id==='transfer'&&p>0;
   const t=(i/mixerLoad.length+p*2.2)%1;
   set(part,mix(-151,-63,t),mix(17,15,t)+1.5,mix(-145,-138,t));
  });
  worker.actor.visible=!!access;
  doorMark.visible=!!access&&access.elapsed===null;
  doorArrow.visible=doorMark.visible;
  if(access){
   const {pose,door,near,gait,moving}=access;
   worker.pose(pose.x,pose.z,pose.heading,moving?gait:null);
   worker.actor.position.y=pose.y;
   worker.shadow.visible=pose.y<.05;
   doorMark.position.set(door.x,.20,door.z);
   doorArrow.position.set(door.x,30,door.z);
   doorMark.material.color.setHex(near?0xaaf5a4:0xffd768);
  }
  const marker=mounted&&job?(stage===0?(Number.isInteger(aim?.cell)?soilTarget(aim.cell):
   machineState?.load>0?[dumpBed.x,29,dumpBed.z]:null):rainWorksTarget(job)):null;
  taskMark.visible=!!marker&&(stage!==0||machineState?.load>0);
  taskMark.scale.set(stage===0?36/39:1,1,stage===0?54/43:1);
  taskMark.material.color.setHex(stage===0?(aim?.kind==='load-marked-soil'?0xffd27a:0xffa152):0xffca56);
  if(marker)taskMark.position.fromArray(marker);
  const projectedTool=mounted&&machineState&&stage===5?rainWorksHook(machineState):null;
  toolMark.visible=!!projectedTool;
  if(projectedTool){
   toolMark.position.set(projectedTool.x,marker[1]+1,projectedTool.z);
   toolMark.material.color.setHex(centered(projectedTool,marker,12)?0x99efaa:0xffecd1);
  }
  supply.visible=stage===6;feed.scale.y=stage===3&&mounted?1+4*p:1;
  const center=stage===1?[115,24,56]:stage===2?[-97,19,-28]:stage===3?[-102,24,-80]:
    stage===4?id==='receive'?[58,28,-113]:[18,30,-17]:stage===6?[-53,17,60]:stage===5?[0,26,-40]:[-50,24,-21];
  if(marker&&machineState&&[1,2,6].includes(stage)){
   center[0]=mix(machineState.x,marker[0],.44);
   center[2]=mix(machineState.z,marker[2],.44);
  }
  if(access){
   const {door,outward}=access;
   cameraTarget.set(door.x-outward.x*13,17,door.z-outward.z*13);
   cameraEye.set(door.x+outward.x*154-outward.z*55,109,door.z+outward.z*154+outward.x*55);
  }else{
   cameraTarget.fromArray(center);cameraEye.set(center[0]+191,center[1]+151,center[2]+216);
  }
  if(camera.aspect<1)cameraEye.lerp(cameraTarget,-.35*(1-camera.aspect));
  camera.position.copy(cameraEye);camera.lookAt(cameraTarget);
  camera.zoom=1;
  camera.clearViewOffset();
  const workPoint=marker??(stage===0&&mounted?[-24,0,16]:null);
  if(workBand&&workPoint&&machineState){
   // Keep both the machine and the destination in the clear space above the keys.
   const {width,height,top,bottom}=workBand;
   const marginX=Math.max(.35,1-76/width);
   const marginY=Math.max(.16,(bottom-top-54)/height);
   camera.updateMatrixWorld();
   for(const point of [workPoint,[machineState.x,0,machineState.z],[machineState.x,stage===0?105:55,machineState.z]]){
    screenPoint.fromArray(point).project(camera);
    camera.zoom=Math.min(camera.zoom,marginX/Math.max(.001,Math.abs(screenPoint.x)),
     marginY/Math.max(.001,Math.abs(screenPoint.y)));
   }
   camera.setViewOffset(width,height,0,(height-top-bottom)/2,width,height);
  }
  renderer.render(scene,camera);
  return water;
 }
 function dispose(){for(const {root,dispose} of fleet){root.removeFromParent();dispose();}disposeTree(scene);}
 return {camera,render,dispose};
}

const limit=T.MathUtils.clamp;
const turnAngle=n=>Math.atan2(Math.sin(n),Math.cos(n));
export const RAIN_WORKS_BUCKET_CLOSE_STOP=.30;
const bucketOpen=-1.12;
const soilSupply=[106,0,20];
const waterSupply=[-154,0,122];
const waterInlet=[-154,0,45];
const truckRear=22;
const dumpGoal=batch=>106+batch*29;
const loaderGoal=batch=>[supportX[batch],0,-11];
const pointDistance=(object,[x,,z])=>Math.hypot(object.x-x,object.z-z);
const centered=(object,point,radius=8)=>pointDistance(object,point)<=radius;
const soilTarget=batch=>[cutCells[batch][0],0,cutCells[batch][1]];
const excavatorPhysics=m=>({loader:{vehicle:m},arm:m.arm,bucketStyle:'backhoe-v2',digMode:'tooth-contact-v1'});

function bucketAt(m,point,curl=-.65){
 const [x,y,z]=point;
 return solveBucketPose(excavatorPhysics(m),{x,y,z},curl);
}

export function rainWorksTarget(job){
 const {stage,id,batch=0}=job;
 if(stage===0)return ['swing','load'].includes(id)?[dumpBed.x,20,dumpBed.z]:soilTarget(batch);
 if(stage===1)return [dumpGoal(batch),.7,id==='drive'?142:id==='return'?dumpLoadZ:103];
 if(stage===2)return ['scoop','return'].includes(id)?soilSupply:loaderGoal(batch);
 if(stage===3)return id==='transfer'?[-63,15,-138]:[-151,17,-145];
 if(stage===4)return id==='receive'?[58,24,-117]:['stow','retract'].includes(id)?[58,12,-79]:[supportX[batch]??0,10,30];
 if(stage===5)return ['aim','hook','lift'].includes(id)?kitRack[batch]:kitPlaces[batch];
 return ['fill','return','drain'].includes(id)?waterSupply:waterInlet;
}

function aimCrane(machine,point,y){
 const [x,,z]=point,dx=x-machine.x,dz=z-machine.z-26;
 machine.slew=Math.atan2(dx,dz);machine.reach=Math.hypot(dx,dz);machine.hookY=y;
}

export function rainWorksHook(machine){
 return {x:machine.x+Math.sin(machine.slew)*machine.reach,y:machine.hookY,
   z:machine.z+26+Math.cos(machine.slew)*machine.reach};
}

// Positions are recovered from the last finished operation when the yard is reopened.
export function createRainWorksMachine(job,savedPose){
 const {stage,id,batch=0}=job;
 const [x,z]=workPositions[stage];
 const machine={x,z,heading:0,steering:0,travel:0,load:0,progress:0};
 if(stage===0){
  const loaded=['lift','swing','load'].includes(id);
  machine.contactDig=true;
  machine.arm={...DIG_READY,curl:loaded?RAIN_WORKS_BUCKET_CLOSE_STOP:bucketOpen,slew:-.44};
  machine.load=loaded?6:0;
  return machine;
 }
 if(stage===1){
  machine.x=dumpGoal(batch)-(id==='park'?13:0);
  machine.z=id==='drive'?dumpLoadZ:id==='park'?142:103;
  machine.load=['reset','return'].includes(id)?0:32;
  machine.bed=id==='reset'?.72:0;
 }else if(stage===2){
  const start=['scoop','drive'].includes(id)?soilSupply:loaderGoal(batch);
  [machine.x,,machine.z]=start;
  // Angle the parked loader so its step opens onto the dry bank by the soil pile.
  if(start===soilSupply)machine.heading=-.55;
  machine.bucket={lift:id==='spread'?.59:.22,tilt:id==='return'?.65:-.16};
  machine.load=id==='drive'||id==='spread'?14:0;
 }else if(stage===3){
  machine.drum=0;machine.gate=0;machine.chute=0;
 }else if(stage===4){
  machine.deployment=id==='deploy'?0:1;
  machine.nozzle=id==='aim'?(supportX[batch]??0)-16:supportX[batch]??0;
  machine.nozzleY=18;machine.gate=0;machine.sweep=new Set();
 }else if(stage===5){
  machine.deployment=id==='deploy'?0:1;
  const from=kitRack[batch],to=kitPlaces[batch];
  const point=id==='lower'||id==='stow'?to:from;
  aimCrane(machine,point,id==='lift'?from[1]+6:id==='swing'||id==='lower'?47:43);
  if(id==='deploy'||id==='aim')aimCrane(machine,[machine.x,0,machine.z+82],43);
  machine.holding=['lift','swing','lower'].includes(id);
 }else{
  [machine.x,,machine.z]=['fill','drive','drain'].includes(id)?waterSupply:waterInlet;
  machine.heading=Math.PI;machine.gate=0;
 }
 if(validRainWorksPose(job.vehicle,savedPose))Object.assign(machine,savedPose);
 return machine;
}

function driveMachine(m,input,dt,{speed=24,minX=-360,maxX=360,minZ=-198,maxZ=208}={}){
 const amount=input.travel;
 // As with the other construction machines, the driver's right is local -X.
 m.steering=-input.turn*.46;
 if(!amount)return;
 const heading=turnAngle(m.heading-input.turn*Math.sign(amount)*dt*1.02);
 const dist=amount*speed*dt;
 const x=limit(m.x+Math.sin(heading)*dist,minX,maxX);
 const z=limit(m.z+Math.cos(heading)*dist,minZ,maxZ);
 m.travel+=Math.sign(dist)*Math.hypot(x-m.x,z-m.z);
 m.x=x;m.z=z;m.heading=heading;
}

const sweepAxes=['boom','stick','curl'];
const blendArm=(from,to,t)=>({...from,...Object.fromEntries(sweepAxes.map(axis=>[axis,mix(from[axis],to[axis],t)]))});
function armGeometry(machine,arm){
 const physics={...excavatorPhysics(machine),arm};
 return bucketContactGeometry(physics,armPose(physics));
}
function workYardArmClear(geometry){
 return geometry.all.every(solid=>solid.vertices.every(([x,y,z])=>{
  const inCut=Math.abs(x)<50.5&&z>-63.5&&z<74.5;
  const overTruck=Math.abs(x-dumpBed.x)<18&&Math.abs(z-dumpBed.z)<27;
  return y>=(overTruck?17:inCut?-8:0);
 }));
}

function planWorkYardMotion(machine,steps,contact){
 let from=machine.arm,effectTime=null,duration=0;
 const phases=[];
 for(const {arm:to,effect} of steps){
  if(!to)return null;
  const angle=Math.max(...sweepAxes.map(axis=>Math.abs(to[axis]-from[axis])));
  const seconds=Math.max(.22,angle/1.15),samples=Math.max(4,Math.ceil(angle/.045));
  for(let i=1;i<=samples;i++){
   const geometry=armGeometry(machine,blendArm(from,to,i/samples));
   if(!workYardArmClear(geometry))return null;
   if(effect&&effectTime===null&&contact(geometry))effectTime=duration+seconds*i/samples;
  }
  phases.push({from,to,start:duration,seconds});
  from=to;duration+=seconds;
 }
 return effectTime===null?null:{phases,effectTime,duration};
}

export function rainWorksExcavatorAim(machine,cutOrder){
 const slew=machine.arm.slew;
 if(machine.load){
  const [x,y,z]=[dumpBed.x,39,dumpBed.z];
  const overBed=bucketAt(machine,[x,y,z],RAIN_WORKS_BUCKET_CLOSE_STOP);
  if(!overBed||Math.abs(slew-overBed.slew)>.15)return null;
  overBed.slew=slew;
  const opened={...overBed,curl:bucketOpen};
  const plan=planWorkYardMotion(machine,[
   {arm:overBed},{arm:opened,effect:true},{arm:{...DIG_READY,curl:bucketOpen,slew}},
  ],geometry=>geometry.teeth.some(tooth=>prismTouchesBox(tooth,[x-16,18,z-24],[x+16,45,z+24])));
  return plan&&{...plan,kind:'load-marked-soil'};
 }
 const candidates=cutCells.map(([x,z],cell)=>{
  const arm=bucketAt(machine,[x,3,z],bucketOpen);
  return {x,z,cell,arm,gap:arm?Math.abs(slew-arm.slew):Infinity};
 }).filter(({cell,gap})=>!cutOrder.includes(cell)&&gap<.15).sort((a,b)=>a.gap-b.gap);
 for(const {x,z,cell,arm} of candidates){
  const poses=[arm,bucketAt(machine,[x,5,z],bucketOpen),bucketAt(machine,[x,3,z-6],bucketOpen),
   bucketAt(machine,[x,3,z+6],bucketOpen),bucketAt(machine,[x-6,4,z-10],bucketOpen),
   bucketAt(machine,[x+6,4,z+10],bucketOpen)];
  for(const pose of poses){
   if(!pose)continue;
   const lowered={...pose,slew},curled={...lowered,curl:-.86};
   const plan=planWorkYardMotion(machine,[
    {arm:lowered},{arm:curled,effect:true},{arm:{...curled,boom:DIG_READY.boom}},
    {arm:{...DIG_READY,curl:RAIN_WORKS_BUCKET_CLOSE_STOP,slew}},
   ],geometry=>geometry.teeth.some(tooth=>prismTouchesBox(tooth,[x-13.5,-8,z-13.5],[x+13.5,.05,z+13.5])));
   if(plan)return {...plan,kind:'scoop-marked-soil',cell};
  }
 }
 return null;
}

export function stepRainWorksExcavator(machine,input,dt,cutOrder){
 if(!machine.excavation){
  if(machine.aimYaw!==machine.arm.slew){
   machine.aimYaw=machine.arm.slew;
   machine.aim=rainWorksExcavatorAim(machine,cutOrder);
  }
  if(machine.aim&&input.excavation===machine.aim.kind){
   machine.excavation={...machine.aim,elapsed:0,effectApplied:false};
  }else{
   const slew=limit(machine.arm.slew+input.turn*.52*Math.min(dt,.05),-1.64,1.64);
   if(slew!==machine.arm.slew){
    machine.arm={...machine.arm,slew};
    machine.aimYaw=slew;
    machine.aim=rainWorksExcavatorAim(machine,cutOrder);
   }
   return null;
  }
 }
 const motion=machine.excavation;
 motion.elapsed=Math.min(motion.duration,motion.elapsed+dt);
 machine.progress=motion.elapsed/motion.duration;
 const phase=motion.phases.find(({start,seconds})=>motion.elapsed<start+seconds)??motion.phases.at(-1);
 machine.arm=motion.elapsed===motion.duration?{...phase.to}:
  blendArm(phase.from,phase.to,limit((motion.elapsed-phase.start)/phase.seconds,0,1));
 if(!motion.effectApplied&&motion.elapsed>=motion.effectTime){
  motion.effectApplied=true;
  machine.load=motion.kind==='scoop-marked-soil'?6:0;
 }
 if(motion.elapsed<motion.duration)return null;
 return {type:motion.kind,...(Number.isInteger(motion.cell)?{cell:motion.cell}:{})};
}

const pumpNozzleAligned=(m,batch)=>Math.abs(m.nozzle-supportX[batch])<=9&&m.nozzleY<=18;
export function stepRainWorksMachine(m,job,input,dt){
 const {stage,id,batch=0}=job;
 const progress=delta=>{m.progress=limit(m.progress+Math.max(0,delta),0,1);return m.progress>=1;};
 if(stage===0)return !!stepRainWorksExcavator(m,input,dt,input.cutOrder??[]);
 if(stage===1){
  if(m.bed<.18)driveMachine(m,input,dt,{speed:25,minX:62,maxX:277,minZ:-46,maxZ:167});
  m.bed=limit(m.bed+input.lift*dt*.44,0,.83);
  const rear={x:m.x-Math.sin(m.heading)*40,z:m.z-Math.cos(m.heading)*40};
  const docked=centered(rear,[dumpGoal(batch),0,63],13)&&Math.abs(turnAngle(m.heading))<.36;
  if(id==='drive')return centered(m,[dumpGoal(batch),0,142],17)&&!input.travel;
  if(id==='park')return docked&&!input.travel;
  if(id==='tip'&&docked&&m.bed>=.39){const done=progress(dt*1.15);m.load=Math.ceil(32*(1-m.progress));return done;}
  if(id==='reset')return m.bed<.04;
  return id==='return'&&m.bed<.06&&centered(m,[dumpGoal(batch),0,dumpLoadZ],15)&&!input.travel;
 }
 if(stage===2){
  driveMachine(m,input,dt,{speed:28,minX:-153,maxX:164,minZ:-165,maxZ:62});
  m.bucket.lift=limit(m.bucket.lift+input.lift*dt*.52,0,.80);
  m.bucket.tilt=limit(m.bucket.tilt-input.tool*dt*.68,-.42,.72);
  const facing=Math.abs(turnAngle(m.heading))<.64;
  if(id==='scoop'&&centered(m,soilSupply,16)&&facing&&m.bucket.lift<.28&&input.tool>0){
   const done=progress(dt*1.6);m.load=Math.round(14*m.progress);return done;
  }
  const atPad=centered(m,loaderGoal(batch),13)&&facing&&!input.travel;
  if(id==='drive')return atPad&&m.bucket.lift>=.35;
  if(id==='spread'&&atPad&&m.bucket.lift<.40&&m.bucket.tilt>.38){const done=progress(dt*.56);m.load=Math.ceil(14*(1-m.progress));return done;}
  return id==='return'&&centered(m,soilSupply,16)&&!input.travel;
 }
 if(stage===3){
  m.drum+=input.tool*dt*1.75;m.gate=limit(m.gate+input.travel*dt*.95,0,1);
  m.chute=limit(m.chute-input.lift*dt*.62,0,1);
  if(id==='sand'||id==='cement')return progress(m.gate*dt/(id==='sand'?4.4:4));
  if(id==='mix')return progress(Math.max(0,input.tool)*dt/7.5);
  return m.chute>.84&&progress(Math.max(0,-input.tool)*dt/6);
 }
 if(stage===4){
  if(id==='retract'){
   if(m.deployment<.95)return false;
   m.progress=limit(m.progress+input.lift*dt/2.4,0,1);
   return m.progress===1;
  }
  m.deployment=limit(m.deployment+input.travel*dt*.57,0,1);
  if(id==='deploy')return m.deployment>.98;
  if(id==='stow'){
   if(m.deployment>=.025)return false;
   m.deployment=0;return true;
  }
  if(m.deployment<.95)return false;
  if(id==='receive'){
   if(m.deployment<.98)return false;
   m.gate=limit(m.gate+input.tool*dt,0,1);
   return progress(m.gate*dt/5);
  }
  m.nozzle=limit(m.nozzle+input.turn*dt*22,-51,51);
  m.nozzleY=limit(m.nozzleY+input.lift*dt*12,12,30);
  m.gate=limit(m.gate+input.tool*dt,0,1);
  const offset=m.nozzle-supportX[batch];
  if(id==='aim')return Math.abs(offset)<3.2&&m.nozzleY<=16;
  if(!pumpNozzleAligned(m,batch))return false;
  if(id==='pour')return progress(m.gate*dt/6.5);
  if(m.gate>.08){m.sweep.add(offset< -4?'left':offset>4?'right':'middle');progress(m.gate*dt/4.6);}
  return m.progress>=1&&m.sweep.size===3;
 }
 if(stage===5){
  m.deployment=limit(m.deployment+input.travel*dt*.60,0,1);
  if(id==='deploy')return m.deployment>=.98;
  if(id==='stow'){
   m.hookY=limit(m.hookY+input.lift*dt*19,10,70);
   return m.deployment<.03&&m.hookY>37;
  }
  if(m.deployment<.95)return false;
  const canSwing=!m.holding||m.hookY>=31;
  if(canSwing){m.slew=limit(m.slew+input.turn*dt*.5,-1.57,1.57);m.reach=limit(m.reach+input.tool*dt*22,42,152);}
  const overRestingPart=centered(rainWorksHook(m),kitRack[batch],8);
  const overPlacement=centered(rainWorksHook(m),kitPlaces[batch],7);
  const floor=m.holding?(overRestingPart?7:overPlacement?kitPlaces[batch][1]+6:31):5;
  m.hookY=limit(m.hookY+input.lift*dt*19,floor,70);
  const hook=rainWorksHook(m),rack=kitRack[batch],target=kitPlaces[batch];
  if(id==='aim')return centered(hook,rack,8);
  if(id==='hook'){
   if(!input.action||!centered(hook,rack,8)||Math.abs(hook.y-(rack[1]+6))>3)return false;
   m.holding=true;return true;
  }
  if(id==='lift')return hook.y>=44;
  if(id==='swing')return hook.y>=32&&centered(hook,target,5.5);
  if(!input.action||!centered(hook,target,5.5)||Math.abs(hook.y-(target[1]+6))>2.5)return false;
  m.holding=false;return true;
 }
 driveMachine(m,input,dt,{speed:22,minX:-190,maxX:-114,minZ:15,maxZ:156});
 m.gate=limit(m.gate+input.tool*dt,0,1);
 const atSupply=centered(m,waterSupply,12)&&!input.travel;
 const atInlet=centered(m,waterInlet,10)&&!input.travel;
 if(id==='drive')return atInlet;
 if(id==='return')return atSupply;
 if(id==='fill'||id==='drain')return atSupply&&progress(m.gate*dt/4.7);
 return atInlet&&progress(m.gate*dt/(id==='pour'?9:6));
}

const axis = (index, sign, positive, negative) => ({index, sign, positive, negative});
const side = (codes, key, pad) => ({codes, key, pad});

const axes = {
  travel: axis(1, -1, side(['KeyW', 'ArrowUp'], 'W / ↑', '左↑'), side(['KeyS', 'ArrowDown'], 'S / ↓', '左↓')),
  turn: axis(0, 1, side(['KeyD', 'ArrowRight'], 'D / →', '左→'), side(['KeyA', 'ArrowLeft'], 'A / ←', '左←')),
  lift: axis(3, -1, side(['KeyR'], 'R', '右↑'), side(['KeyF'], 'F', '右↓')),
  tool: axis(2, 1, side(['KeyE'], 'E', '右→'), side(['KeyQ'], 'Q', '右←')),
};
const hook = side(['Space'], 'Space', 'X / □');
export const RAIN_WORKS_MACHINE_KEYS = Object.values(axes)
  .flatMap(({positive, negative}) => [...positive.codes, ...negative.codes]).concat(hook.codes);

export const rainWorksStick = value => Math.abs(value ?? 0) >= .19 ? value : 0;
const keyHeld = (held, {codes}) => codes.some(code => held.has(code));
export function readRainWorksAxes(held, sticks) {
  return Object.fromEntries(Object.entries(axes).map(([name, {index, sign, positive, negative}]) => {
    const analog = sign * rainWorksStick(sticks[index]);
    const digital = Number(keyHeld(held, positive)) - Number(keyHeld(held, negative));
    return [name, Math.max(-1, Math.min(1, digital + analog))];
  }));
}

const group = (name, channel, positive, negative, jobs) => ({name, channel, positive, negative, jobs});
const drive = group('走行', 'travel', '前進', '後退', ['drive', 'park', 'return']);
const steer = group('ハンドル', 'turn', '右に切る', '左に切る', ['drive', 'park', 'return']);
const legs = group('車体の支え', 'travel', '広げる', 'しまう', ['deploy', 'stow']);
const controls = [
  [
    group('旋回', 'turn', '右に向ける', '左に向ける', ['aim','dig','scoop','lift','swing','load']),
    group('バケット', 'travel', 'すくう', '荷台へこぼす', ['aim','dig','scoop','lift','swing','load']),
  ],
  [drive, steer, group('荷台', 'lift', '上げる', '下げる', ['tip', 'reset'])],
  [
    drive, steer,
    group('バケットの高さ', 'lift', '上げる', '下げる', ['scoop', 'drive', 'spread']),
    group('バケットの角度', 'tool', '起こしてすくう', '前へ傾ける', ['scoop', 'spread']),
  ],
  [
    group('投入口', 'travel', '開ける', '閉める', ['sand', 'cement']),
    group('ドラム', 'tool', '練る方向へ', '排出方向へ', ['mix', 'transfer']),
    group('排出シュート', 'lift', '戻す', '伸ばす', ['transfer']),
  ],
  [
    legs,
    group('ホースの左右', 'turn', '右へ', '左へ', ['aim', 'pour', 'finish']),
    group('ホースの高さ', 'lift', '上げる', '下げる', ['aim', 'pour', 'finish']),
    group('ホースの収納', 'lift', 'たたむ', '開く', ['retract']),
    group('ポンプ', 'tool', '流量を増やす', '流量を絞る', ['receive', 'pour', 'finish']),
  ],
  [
    legs,
    group('ブームの旋回', 'turn', '右へ', '左へ', ['aim', 'hook', 'swing', 'lower']),
    group('ブームの長さ', 'tool', '伸ばす', '縮める', ['aim', 'hook', 'swing', 'lower']),
    group('フックの高さ', 'lift', '巻き上げる', '下ろす', ['hook', 'lift', 'lower', 'stow']),
    group('フックの固定', 'action', '掛ける / 外す', null, ['hook', 'lower']),
  ],
  [drive, steer, group('給水バルブ', 'tool', '開ける', '閉める', ['fill', 'pour', 'recover', 'drain'])],
];
const gauges = {3: ['投入口', 'gate'], 4: ['ポンプ', 'gate'], 6: ['給水バルブ', 'gate']};

export function createRainWorksControlGuide(root,{touch=false}={}) {
  const device = root.querySelector('[data-works-device]');
  const list = root.querySelector('[data-works-keys]');
  const gauge = root.querySelector('[data-works-gauge]');
  const make = (tag, value) => {
    const node = root.ownerDocument.createElement(tag);
    if (value) node.textContent = value;
    return node;
  };
  let lastLayout = '', lastJob = '', groups = [];

  return function paint(job, usingPad, held, input, machine) {
    root.hidden = !job;
    if (!job) return;
    const {stage, id} = job;
    const touchKeys=touch&&!usingPad;
    const layout = stage + ':' + usingPad;
    if (layout !== lastLayout) {
      lastLayout = layout;
      lastJob = '';
      device.textContent = usingPad ? 'ゲームパッド' : touchKeys?'タッチ操作':'キーボード';
      groups = controls[stage].map(({name, channel, positive, negative, jobs}) => {
        const row = make('div');
        row.append(make('dt', name));
        const bindings = (channel === 'action' ? [[hook, positive, 1]]
          : [[axes[channel].positive, positive, 1], [axes[channel].negative, negative, -1]])
          .map(([binding, description, direction]) => {
            const line=make('dd'),cap=make(touchKeys?'button':'kbd',touchKeys?description:usingPad?binding.pad:binding.key);
            if(touchKeys){cap.type='button';cap.dataset.worksKey=binding.codes[0];cap.setAttribute('aria-label',name+'を'+description);line.append(cap);}
            else line.append(cap,make('span',description));
            row.append(line);
            return {binding, cap, direction};
          });
        return {channel, row, jobs, bindings};
      });
      list.replaceChildren(...groups.map(({row}) => row));
    }
    if (lastJob !== id) {
      lastJob = id;
      for(const {row,jobs} of groups){row.classList.toggle('is-relevant',jobs.includes(id));row.hidden=touchKeys&&!jobs.includes(id);}
    }
    for (const {channel, bindings} of groups) {
      for (const {binding, cap, direction} of bindings) {
        const active = usingPad ? channel === 'action' ? input.actionHeld : input[channel] * direction > 0
          : keyHeld(held, binding);
        cap.classList.toggle('is-pressed', active);
      }
    }
    gauge.hidden = !gauges[stage];
    if (gauges[stage]) {
      const [label, field] = gauges[stage], percent = Math.round(machine[field] * 100);
      const reading = label + ' ' + percent + '％';
      if (gauge.textContent !== reading) gauge.textContent = reading;
    }
  };
}

const workKeyCodes=new Set([...RAIN_WORKS_MACHINE_KEYS,'Enter','F8']);
const isWorkConfirm=event=>['Enter','NumpadEnter'].includes(event.code)||event.key==='Enter';
function worksGamepad(win){
 const pads=win.navigator.getGamepads?.()??[];
 return Array.from(pads).find(pad=>pad?.connected&&pad.mapping==='standard');
}

function createRainWorksAccess(job,machine){
 let path;
 if(job.vehicle==='excavator'){
  path=excavatorAccessPath(machine,machine.arm.slew,-1);
 }else if(job.vehicle==='dump'||job.vehicle==='truck'||job.vehicle==='pump'){
  const dump=job.vehicle==='dump';
  const {driverX,driverZ,floor}=dump?DUMP_CAB:{driverX:-15,driverZ:21,floor:19};
  const steps=dump?[[-60,0],[-54,floor/3],[-48,2*floor/3],[-41,floor]]:
   [[-55,0],[-42,10],[-34,19]];
  path=[...steps,[driverX,floor]].map(([x,y])=>({...localToWorld(machine,x,driverZ),y,heading:machine.heading}));
 }else path=transitionPoints({...machine,waterTruck:job.vehicle==='water'},-1);
 const door=path[0],seat=path.at(-1);
 const outward=new T.Vector2(door.x-seat.x,door.z-seat.z).normalize();
 const reach=job.vehicle==='water'&&machine.z<80?22:34;
 const heading=Math.atan2(-outward.x,-outward.y);
 const pose={x:door.x+outward.x*reach,y:0,z:door.z+outward.y*reach,heading:heading+2.30};
 return {path,door,outward:{x:outward.x,z:outward.y},pose,reach,
  distance:reach,offset:0,gait:0,moving:false,near:false,elapsed:null,doorAngle:0};
}

function walkToRainWorksDoor(access,input,delta){
 const {door,outward,pose}=access;
 const strength=Math.max(1,Math.hypot(input.travel,input.turn));
 const distance=limit(access.distance-input.travel*34*delta/strength,0,access.reach+8);
 const offset=limit(access.offset+input.turn*34*delta/strength,-8,8);
 const forward=access.distance-distance,side=offset-access.offset;
 const dx=-outward.x*forward+outward.z*side,dz=-outward.z*forward-outward.x*side;
 const length=Math.hypot(dx,dz);
 access.distance=distance;access.offset=offset;access.moving=length>.001;
 if(access.moving){
  const yaw=Math.atan2(dx,dz);
  pose.heading+=limit(turnAngle(yaw-pose.heading),-12*delta,12*delta);
  access.gait+=length*.42;
 }
 pose.x=door.x+outward.x*distance+outward.z*offset;
 pose.z=door.z+outward.z*distance-outward.x*offset;
 access.near=Math.hypot(distance,offset)<=rainWorksDoorRadius;
}

function stepRainWorksBoarding(access,delta){
 const openTime=.32,climbTime=1.36,closeTime=.32;
 access.elapsed+=delta;
 const phase=limit((access.elapsed-openTime)/climbTime,0,1);
 const close=limit((access.elapsed-openTime-climbTime)/closeTime,0,1);
 access.doorAngle=Math.PI/2*limit(access.elapsed/openTime,0,1)*(1-close);
 access.pose=samplePath(access.path,phase);
 access.pose.heading=access.startHeading+turnAngle(access.path.at(-1).heading-access.startHeading)*limit(access.elapsed/.9,0,1);
 access.moving=phase>0&&phase<.87;
 access.gait+=delta*14;
 return close===1;
}

function rainWorksMaterialStatus(job,machine,water){
 const {stage,id,batch=0}=job,p=machine.progress;
 if(water){
  const format=litres=>litres.toFixed(1)+' L';
  if(water.spill)return '漏れ '+format(water.spill);
  return ['給水槽 '+format(water.source+water.returned),'車載 '+format(water.truck),'受け槽 '+format(water.catchTank)].join('　');
 }
 if(stage===3){
  const delivered=batch+Number(id==='transfer'&&p===1),percent=Math.floor(p*100);
  return 'ポンプ車に送った生コン '+delivered+' / 3　'+(id==='transfer'?'送出 ':id==='mix'?'練り上がり ':'充填 ')+percent+'％';
 }
 if(stage===4){
  const total=RAIN_WORKS_CONCRETE_BATCHES;
  if(id==='receive')return 'ミキサー車から届いた生コン '+total+'型枠分　受け取り '+Math.floor(p*100)+'％';
  if(id==='retract')return 'ホースの収納 '+Math.floor(p*100)+'％';
  if(id==='stow')return 'ホース収納済み　支持脚の収納 '+Math.floor((1-machine.deployment)*100)+'％';
  const filled=batch+Number(id==='finish'&&p===1);
  const form= id==='pour'?Math.floor(p*80):id==='finish'?80+Math.floor(p*20):0;
  return '型枠 '+filled+' / '+total+' 施工済み'+(id==='pour'||id==='finish'?'　この型枠 '+form+'％':'')+(id==='finish'?'　ならした範囲 '+machine.sweep.size+' / 3':'');
 }
 if(stage===5){
  if(id==='stow')return '接続部 2 / 2 据え付け済み';
  return machine.holding?'吊り上げ中　フックの高さ '+Math.round(machine.hookY):'接続部 '+(batch+Number(id==='lower'&&p===1))+' / 2 据え付け済み';
 }
 return '';
}

export async function openRainWorksControls({panel,renderer,read,save,leave,alreadyMounted=false,touch=false,startNext=()=>false}){
 const yard=await createRainWorksYard();
 const doc=panel.ownerDocument,win=doc.defaultView;
 const prompt=panel.querySelector('#rainWorksPrompt'),vehicleLabel=panel.querySelector('.rain-works-vehicle');
 const vehicleName=vehicleLabel.querySelector('[data-works-vehicle]'),stageCount=vehicleLabel.querySelector('[data-works-stage-count]');
 const controlsHint=panel.querySelector('#rainWorksControlsHint');
 const header=panel.querySelector('header'),controlGuide=panel.querySelector('.rain-works-controls');
 const paintGuide=createRainWorksControlGuide(controlGuide,{touch});
 const waterText=panel.querySelector('#rainWorksWater'),status=panel.querySelector('#rainWorksStatus');
 const meter=panel.querySelector('progress'),command=panel.querySelector('[data-works-command]');
 const boardButton=panel.querySelector('[data-works-board]'),boardKey=boardButton.querySelector('kbd');
 const legend=panel.querySelector('[data-works-legend]'),retry=panel.querySelector('[data-works-retry]');
 const held=new Set(),listeners=new AbortController(),options={capture:true,signal:listeners.signal};
 let mounted=false,busy=false,closed=false,next=read().step,error='',machine,access,done=false;
 let leaveRequested=false,completedAction=null;
 let padButtons=worksGamepad(win)?.buttons.map(b=>b.pressed)??[],usingPad=false,pressedAction=false;
 let excavationCommand=null,padTravel=0,pendingExcavation=null;
 function prepareVehicle(job){
  mounted=false;held.clear();pressedAction=false;excavationCommand=null;
  machine=job?createRainWorksMachine(job,read().workshop):null;
  access=job?createRainWorksAccess(job,machine):null;
 }
 const currentJob=()=>constructionWorkshopJob(read().mission??{step:next});
 prepareVehicle(currentJob());
 if(alreadyMounted){mounted=true;access=null;}
 const write=(element,value)=>{if(element.textContent!==value)element.textContent=value;};
 function paintControls(){
  const record=read(),job=currentJob(),finished=!!record.cargo;
  const excavation=mounted&&job?.vehicle==='excavator'?machine:null;
  const loading=excavation&&['lift','swing','load'].includes(job.id);
  vehicleLabel.hidden=!job;
  if(job){
   write(vehicleName,job.name);
   write(stageCount,`${job.stage+1} / ${RAIN_WORKS_STAGES.length}`);
  }
  const line=finished?'接続部二つを引き渡したよ。空駅のUFO乗り場へ向かおう。':
   !job?'通水試験が済んだ接続部を引き渡そう。':
   access?.elapsed!=null?job.name+'に乗り込んでいます。':
   access?(job.stage===5&&job.index===0?'コンクリートが固まったよ。':'')+job.name+'に乗ろう。':
   excavation?.excavation?(loading?'荷台へ土をこぼしています。':'土をすくっています。'):
   excavation?(loading?'ダンプカーの荷台に向けよう。':'旋回して、すくいたい土に向けよう。'):
   job.label+'。';
  write(prompt,line);
  controlsHint.hidden=(!access||access.elapsed!==null)&&(!excavation||!!excavation.excavation);
  if(access&&access.elapsed===null)write(controlsHint,access.near?
   '乗降口に着いたよ。':
   `運転席の横にある黄色い輪まで歩こう。　${usingPad?'左スティック':'WASD / 方向キー'}で歩く`);
  if(excavation&&!excavation.excavation){
   const direction=usingPad?'左スティックを左右に':'A / D';
   const button=usingPad?(loading?'左スティックを下に':'左スティックを上に'):(loading?'S':'W');
   write(controlsHint,excavation.aim?(loading?`${button}で荷台へこぼす`:`水色の土を ${button}ですくう`):
    (loading?`${direction}で橙色の荷台に向ける`:`${direction}で旋回すると、すくえる土が水色に光る`));
  }
  if(!mounted||!job)controlGuide.hidden=true;
  status.hidden=!busy&&!error;
  write(status,busy?(leaveRequested?'保存が終わったら現場入口へ戻ります。':'作業を保存しています…'):error);
  const confirm=usingPad?'A':'Enter';
  boardButton.hidden=!access?.near||access.elapsed!==null||busy;
  write(boardKey,confirm);
  if(retry)retry.hidden=!error||!completedAction||busy;
  write(command,finished?'':error&&!retry?`${confirm}で保存をやり直す`:!error&&!job?`${confirm}で部材を引き渡す`:'');
  write(legend,`${usingPad?'B':'F8'}　現場入口へ`);
  const amounts={scoop:1,load:1,tip:1,spread:1,sand:1,cement:1,mix:1,transfer:1,pour:1,finish:1,fill:1,recover:1,drain:1};
  meter.hidden=!mounted||!job||(!amounts[job.id]&&!excavation?.excavation);
  meter.value=machine?.progress??0;
 }
 async function commit(action){
  if(busy||closed)return;
  busy=true;error='';paintControls();
  try{
   const previous=currentJob();
   await save(action);
   if(closed)return;
   next=read().step;done=false;completedAction=null;clearHeld();
   pendingExcavation=null;
   const nextJob=currentJob();
   if(nextJob?.stage!==previous?.stage)prepareVehicle(nextJob);
   else if(nextJob&&machine){
    if(previous?.vehicle==='excavator'){
     machine.excavation=null;machine.aim=null;machine.aimYaw=undefined;
    }
    machine.progress=0;
    if(machine.gate!==undefined)machine.gate=0;
    if(nextJob.id==='drive'&&nextJob.stage===1)machine.load=32;
    machine.sweep?.clear();
   }
  }catch(err){error=err?.message||'作業を保存できませんでした。もう一度ためしてね。';}
  finally{
   busy=false;
   const shouldLeave=leaveRequested&&!error;
   leaveRequested=false;
   if(shouldLeave)leave();
   else paintControls();
  }
 }
 function confirm(){
  if(closed||busy||startNext())return;
  const job=currentJob();
  if(!job){if(!read().cargo)void commit({type:'handover'});return;}
  if(access?.near&&access.elapsed===null){
   access.startHeading=access.pose.heading;
   access.path=[{...access.pose},...access.path];
   access.elapsed=0;access.moving=false;held.clear();pressedAction=false;error='';
   panel.focus({preventScroll:true});
   paintControls();
  }else if(mounted&&error&&completedAction)void commit(completedAction);
 }
 boardButton.addEventListener('click',()=>{if(!boardButton.hidden)confirm();},{signal:listeners.signal});
 retry?.addEventListener('click',confirm,{signal:listeners.signal});
 const pointers=new Map();
 if(touch){
  controlGuide.addEventListener('pointerdown',event=>{
   const button=event.target.closest('[data-works-key]');
   if(busy||!button||event.button!==0)return;
   event.preventDefault();controlGuide.setPointerCapture(event.pointerId);usingPad=false;
   const key=button.dataset.worksKey;pointers.set(event.pointerId,key);
   if(key==='Space')pressedAction=true;
  },{signal:listeners.signal});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])controlGuide.addEventListener(type,event=>pointers.delete(event.pointerId),{signal:listeners.signal});
 }
 function down(event){
  const code=isWorkConfirm(event)?'Enter':event.code;
  if(closed||event.isComposing||!workKeyCodes.has(code)||event.altKey||event.ctrlKey||event.metaKey)return;
  event.preventDefault();event.stopImmediatePropagation();
  usingPad=false;
  if(event.repeat)return;
  if(code==='F8'){exitSite();return;}
  if(code==='Enter'||code==='Space'&&event.target===boardButton&&!boardButton.hidden){confirm();return;}
  if(code==='Space')pressedAction=true;
  if(mounted&&currentJob()?.vehicle==='excavator'){
   if(code==='KeyW'||code==='ArrowUp')excavationCommand='scoop-marked-soil';
   if(code==='KeyS'||code==='ArrowDown')excavationCommand='load-marked-soil';
  }
  held.add(code);
 }
 function exitSite(){
  if(busy){leaveRequested=true;paintControls();}
  else leave();
 }
 win.addEventListener('keydown',down,options);
 win.addEventListener('keyup',e=>held.delete(e.code),options);
 function clearHeld(){held.clear();pointers.clear();pressedAction=false;excavationCommand=null;}
 win.addEventListener('blur',clearHeld,options);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clearHeld();},options);
 function readControls(){
  const pad=!doc.hidden&&doc.hasFocus()?worksGamepad(win):null;
  const axes=pad?.axes??[],buttons=pad?.buttons.map(b=>b.pressed)??[];
  const edge=i=>buttons[i]&&!padButtons[i];
  if(axes.some(rainWorksStick)||buttons.some(Boolean))usingPad=true;
  if(edge(1))exitSite();
  if(edge(0))confirm();
  const action=pressedAction||!!edge(2);pressedAction=false;padButtons=buttons;
  const vertical=Math.sign(-rainWorksStick(axes[1]));
  if(vertical&&vertical!==padTravel)excavationCommand=vertical>0?'scoop-marked-soil':'load-marked-soil';
  padTravel=vertical;
  const excavation=excavationCommand;excavationCommand=null;
  const activeKeys=pointers.size?new Set([...held,...pointers.values()]):held;
  return {...readRainWorksAxes(activeKeys,axes),action,actionHeld:!!buttons[2],excavation,activeKeys};
 }
 function draw(delta,enableWork=true){
  if(closed)return;
  const input=readControls();if(closed)return;
  const job=currentJob();
  const cutOrder=rainWorksCutOrder(read());
  const dt=Math.min(.075,delta);
  if(access?.elapsed!=null){
   if(stepRainWorksBoarding(access,dt)){access=null;mounted=true;}
  }else if(access)walkToRainWorksDoor(access,input,dt);
  else if(job&&machine&&mounted&&enableWork&&!busy&&!error&&!doc.hidden){
   if(job.vehicle==='excavator'){
    const result=stepRainWorksExcavator(machine,input,dt,cutOrder);
    done=!!result;
    if(result)pendingExcavation={...result,step:next};
   }else done=stepRainWorksMachine(machine,job,input,dt);
   if(done)machine.progress=1;
  }
  paintControls();
  if(mounted&&job)paintGuide(job,usingPad,input.activeKeys,input,machine);
  const canvas=renderer.domElement;
  const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight);
  const workBand=mounted&&job?{width,height,top:header.offsetTop+header.offsetHeight,bottom:controlGuide.offsetTop}:null;
  yard.camera.aspect=width/height;
  const samples=yard.render(renderer,{step:next,job,progress:machine?.progress??0,machineState:machine,mounted,handed:!!read().cargo,access,workBand,cutOrder,aim:machine?.aim});
 const text=!job?'24 Lと48 Lの通水を確認。試験に使った水は給水槽へ返却しました。':mounted?
   rainWorksMaterialStatus(job,machine,samples):'';
  waterText.hidden=!text;
  write(waterText,text);
  if(job&&done&&!busy&&!error){
   if(job.vehicle==='water'&&job.id==='pour'&&(samples.spill||samples.catchTank<=0)){
     error='受け槽に水が届きませんでした。';machine.progress=0;done=false;paintControls();return;
   }
   const pose=captureRainWorksPose(job.vehicle,machine);
   const result=pose?{pose,progress:machine.progress,coverage:machine.sweep?[...machine.sweep]:undefined,
     water:samples?{catchTank:samples.catchTank,spill:samples.spill}:undefined}:undefined;
   if(job.id==='receive')result.received=RAIN_WORKS_CONCRETE_BATCHES;
   if(job.id==='retract')result.hoseStowed=true;
   completedAction=pendingExcavation??{type:'work',step:next,operation:job.id,result};
   void commit(completedAction);
  }
 }
 panel.hidden=false;paintControls();panel.focus({preventScroll:true});
 return {draw,get busy(){return busy;},get awaitingSave(){return !!completedAction;},rewind(){
  if(busy||closed)return false;
  const job=currentJob();
  if(!job)return false;
  machine=createRainWorksMachine(job,read().workshop);done=false;error='';completedAction=null;
  pendingExcavation=null;clearHeld();paintControls();return true;
 },dispose(){
  if(closed)return;closed=true;listeners.abort();held.clear();panel.hidden=true;yard.dispose();
 }};
}

// A small CPU renderer for the self-contained work yard only. It does not
// stand in for the adventure map's textured terrain or its flight renderer.
export function workYardCanvasRenderer(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('画面を表示できませんでした。');
 const cache=new WeakMap(),faces=[],clip=new T.Vector3(),mid=new T.Vector3(),light=new T.Vector3(-.4,.9,.33).normalize();
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),ink=new T.Color();
 const corners=[];
 const boxFaces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
 function render(scene,camera){
  const w=Math.max(1,Math.min(1050,canvas.clientWidth)),h=Math.max(1,Math.round(w*canvas.clientHeight/Math.max(1,canvas.clientWidth)));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  scene.updateMatrixWorld();camera.updateMatrixWorld();faces.length=0;
  const ground=scene.background;
  ctx.fillStyle=ground?.isColor?'#'+ground.getHexString():'#ccd8dd';ctx.fillRect(0,0,w,h);
  function project(point){clip.copy(point).project(camera);return [(clip.x+1)*w/2,(1-clip.y)*h/2,clip.z];}
  scene.traverseVisible(mesh=>{
   const geo=mesh.geometry,material=mesh.material;
   if(!geo||Array.isArray(material)||!material?.visible||!material.color)return;
   const color=material.color;
   if(mesh.isLineSegments){
    const points=geo.attributes.position;
    for(let i=0;i<points.count;i+=2){
     const x=project(a.fromBufferAttribute(points,i).applyMatrix4(mesh.matrixWorld));
     const y=project(b.fromBufferAttribute(points,i+1).applyMatrix4(mesh.matrixWorld));
     if(x[2]>=-1&&x[2]<1&&y[2]>=-1&&y[2]<1)faces.push({points:[x,y],z:(x[2]+y[2])/2-.00001,color:'#'+color.getHexString(),line:true});
    }return;
   }
   if(!mesh.isMesh||!geo.attributes.position)return;
   const param=geo.parameters??{};
   const floor=geo.type==='BoxGeometry'&&param.width>=300&&param.depth>=65&&param.height<=15;
   let polygons=cache.get(geo);
   if(!polygons){
    const character=mesh.userData.rainWorksCharacter;
    const lowSphere=character&&geo.type==='SphereGeometry'&&param.widthSegments>14?
     new T.SphereGeometry(param.radius,14,10,param.phiStart,param.phiLength,param.thetaStart,param.thetaLength):null;
    const shape=lowSphere??geo,pos=shape.attributes.position,idx=shape.index;
    const count=(idx?.count??pos.count)/3;
    if(geo.type==='BoxGeometry'||geo.type==='PlaneGeometry'||!character&&count>160){
     geo.computeBoundingBox();const {min,max}=geo.boundingBox;
     corners.length=0;
     for(let i=0;i<8;i++)corners.push([(i&4)?max.x:min.x,(i&2)?max.y:min.y,(i&1)?max.z:min.z]);
     polygons=boxFaces.map(f=>f.map(i=>corners[i]));
     if(floor){
      polygons.splice(3,1); // subdivide the top so near-plane clipping cannot remove the whole yard
      const nx=Math.ceil((max.x-min.x)/58),nz=Math.ceil((max.z-min.z)/58);
      for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
       const x0=mix(min.x,max.x,ix/nx),x1=mix(min.x,max.x,(ix+1)/nx);
       const z0=mix(min.z,max.z,iz/nz),z1=mix(min.z,max.z,(iz+1)/nz),y=max.y;
       polygons.push([[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0]]);
      }
     }
    }else polygons=Array.from({length:Math.floor(count)},(_,i)=>[0,1,2].map(j=>{
     const k=idx?idx.getX(i*3+j):i*3+j;return [pos.getX(k),pos.getY(k),pos.getZ(k)];
    }));
    lowSphere?.dispose();
    cache.set(geo,polygons);
   }
   for(const polygon of polygons){
    a.fromArray(polygon[0]).applyMatrix4(mesh.matrixWorld);b.fromArray(polygon[1]).applyMatrix4(mesh.matrixWorld);c.fromArray(polygon[2]).applyMatrix4(mesh.matrixWorld);
    n.crossVectors(ab.subVectors(b,a),ac.subVectors(c,a)).normalize();
    if(n.dot(mid.subVectors(camera.position,a))<=0&&material.side!==T.DoubleSide)continue;
    const points=[project(a),project(b),project(c)];
    if(polygon.length===4)points.push(project(mid.fromArray(polygon[3]).applyMatrix4(mesh.matrixWorld)));
    if(points.some(p=>!Number.isFinite(p[2])||p[2]<-1||p[2]>1))continue;
    const z=points.reduce((sum,p)=>sum+p[2],0)/points.length;
    const shade=.74+.33*Math.max(0,n.dot(light));
    const alpha=material.transmission>.15?.58:material.transparent?Math.max(.18,material.opacity):1;
    faces.push({points,z,color:'#'+ink.copy(color).multiplyScalar(shade).getHexString(),line:false,alpha,floor,
     avatar:!!mesh.userData.rainWorksCharacter,altitude:mesh.matrixWorld.elements[13]});
   }
  });
  faces.sort((a,b)=>Number(!!b.floor)-Number(!!a.floor)||(a.floor&&b.floor?a.altitude-b.altitude:b.z-a.z));
  for(const face of faces){
   const [first,...rest]=face.points;
   ctx.beginPath();ctx.moveTo(first[0],first[1]);for(const p of rest)ctx.lineTo(p[0],p[1]);
   if(face.line){ctx.strokeStyle=face.color;ctx.lineWidth=1.4;ctx.stroke();}
   else{
    ctx.closePath();ctx.fillStyle=face.color;ctx.globalAlpha=face.alpha;ctx.fill();
    if(face.avatar&&face.alpha===1){ctx.strokeStyle=face.color;ctx.lineWidth=.54;ctx.stroke();}
    ctx.globalAlpha=1;
   }
  }
 }
 return {domElement:canvas,render};
}

export function showRainWorksPreview({panel,brief,canvas}){
 const doc=canvas.ownerDocument,win=doc.defaultView;
 doc.body.classList.add('rain-works-preview');
 doc.body.dataset.rainWorks='';
 brief.querySelector('[data-works-decline]').hidden=true;
 const element=(tag,className,text)=>{
  const node=doc.createElement(tag);
  if(className)node.className=className;
  if(text)node.textContent=text;
  return node;
 };
 const goal=brief.querySelector('.rain-works-brief-goal');
 goal.textContent='重機を選んで、水路の工事に出よう。';
 const startButton=brief.querySelector('[data-works-accept]');
 startButton.textContent='作業を始める';
 const garage=element('div','rain-works-garage');
 const display=element('figure','rain-works-showcase'),picture=element('canvas');
 picture.setAttribute('aria-hidden','true');
 const caption=element('figcaption');
 display.append(picture,caption);
 const choices=element('div','rain-works-choices');
 choices.setAttribute('role','group');choices.setAttribute('aria-label','試す重機');
 garage.append(display,choices);goal.after(garage);
 const note=element('p','rain-works-preview-note','↑↓・十字キーで選択　Enter・Aで開始');
 const info=element('p','rain-works-preview-save','試遊の進行は本編のセーブに反映されません。');
 const feedback=element('p','rain-works-preview-feedback');feedback.setAttribute('role','status');
 startButton.parentElement.before(note,info,feedback);
 const snapshots=new Map();
 const showcaseScene=new T.Scene(),showcaseCamera=new T.PerspectiveCamera(39,1,.1,1200);
 showcaseScene.background=new T.Color(0x17283b);
 let showcaseView;
 try{showcaseView=workYardCanvasRenderer(picture);}
 catch{picture.style.visibility='hidden';}
 const descriptions=['土を掘って荷台へ積む','土を運んで荷下ろし','接続部を支える土台づくり',
  '材料を混ぜて生コンをつくる','型枠に生コンを流し込む','接続部を吊って据え付ける','水を流して通り道を確かめる'];
 let selected=-1;
 const buttons=RAIN_WORKS_STAGES.map(({name},index)=>{
  const button=element('button','rain-works-choice');button.type='button';
  const number=element('span','rain-works-choice-number',String(index+1).padStart(2,'0'));
  number.setAttribute('aria-hidden','true');
  button.append(number,element('span','',name));choices.append(button);
  button.addEventListener('click',()=>select(index));
  button.addEventListener('focus',()=>select(index));
  return button;
 });
 function showSelected(){
  if(!showcaseView)return;
  const stage=selected;
  if(!snapshots.has(stage)){
   snapshots.set(stage,createFleetModel(RAIN_WORKS_STAGES[stage].vehicle).catch(()=>null));
  }
  snapshots.get(stage).then(model=>{
   if(!model||selected!==stage||!brief.open)return;
   model.driver.visible=false;
   const distance=model.radius*2.85/Math.min(1,picture.clientWidth/Math.max(1,picture.clientHeight));
   showcaseCamera.aspect=picture.clientWidth/Math.max(1,picture.clientHeight)||1;
   showcaseCamera.position.copy(model.target).addScaledVector(new T.Vector3(-1,.65,1.3).normalize(),distance);
   showcaseCamera.lookAt(model.target);showcaseCamera.updateProjectionMatrix();
   showcaseScene.add(model.root);
   try{
    showcaseView.render(showcaseScene,showcaseCamera);
    picture.style.visibility='';
   }catch{picture.style.visibility='hidden';}
   finally{showcaseScene.remove(model.root);}
  });
 }
 function select(index){
  if(startButton.disabled)return;
  if(selected!==index){
   selected=index;
   picture.style.visibility='hidden';
   for(const [i,button] of buttons.entries())button.setAttribute('aria-pressed',String(i===index));
   caption.textContent=index?descriptions[index]:'最初から遊ぶ · ショベルカーで土を掘る';
   showSelected();
  }
  buttons[index].focus({preventScroll:true});
 }
 let view,raf,renderer,previous;
 function makeRenderer(){
  const probe=doc.createElement('canvas');
  if(probe.getContext('webgl2')){
   try{
    const output=new T.WebGLRenderer({canvas,antialias:true,alpha:false});
    return {domElement:canvas,render(scene,camera){
     if(canvas.width!==canvas.clientWidth||canvas.height!==canvas.clientHeight)output.setSize(canvas.clientWidth,canvas.clientHeight,false);
     output.render(scene,camera);
    }};
   }catch{const replacement=canvas.cloneNode(false);canvas.replaceWith(replacement);canvas=replacement;}
  }
  return workYardCanvasRenderer(canvas);
 }
 function draw(now){
  if(!view)return;
  const elapsed=previous==null?0:Math.min(.10,(now-previous)/1000);
  if(elapsed>0&&elapsed<.029){raf=win.requestAnimationFrame(draw);return;}
  previous=now;
  try{view.draw(elapsed);raf=win.requestAnimationFrame(draw);}
  catch(error){console.warn(error);leave();feedback.textContent='作業区画を表示できませんでした。';}
 }
 function leave(){
  win.cancelAnimationFrame(raf);view?.dispose();view=null;previous=null;
  brief.showModal();select(selected);showSelected();
 }
 brief.addEventListener('cancel',e=>e.preventDefault());
 async function start(){
  if(startButton.disabled)return;
  startButton.disabled=true;startButton.textContent='作業区画を準備中…';
  feedback.textContent='';
  const stage=selected;
  let state={step:RAIN_WORKS_JOBS.findIndex(job=>job.stage===stage)};
  try{
   renderer??=makeRenderer();
   view=await openRainWorksControls({panel,renderer,read:()=>state,leave,
    save:async action=>{
     if(action.type==='handover')state={...state,cargo:{status:'ready'}};
     else if(action.type==='work')state={...state,step:state.step+1};
     else state=advanceRainWorksExcavation(state,action);
    }});
   brief.close();panel.focus({preventScroll:true});raf=win.requestAnimationFrame(draw);
  }catch(error){console.warn(error);feedback.textContent='作業区画を準備できませんでした。';}
  finally{startButton.disabled=false;startButton.textContent='作業を始める';}
 }
 startButton.addEventListener('click',()=>void start());
 const selectBy=direction=>select(limit(selected+direction,0,buttons.length-1));
 brief.addEventListener('keydown',event=>{
  if(event.isComposing)return;
  if(isWorkConfirm(event)){event.preventDefault();void start();}
  else if(['ArrowUp','ArrowDown'].includes(event.code)){event.preventDefault();selectBy(event.code==='ArrowUp'?-1:1);}
 });
 let prior=[];
 function checkMenuPad(){
  if(brief.open&&doc.hasFocus()&&!doc.hidden){
   const buttons=worksGamepad(win)?.buttons.map(button=>button.pressed)??[];
   if(buttons[12]&&!prior[12])selectBy(-1);
   if(buttons[13]&&!prior[13])selectBy(1);
   if(buttons[0]&&!prior[0])void start();
   prior=buttons;
  }
  win.requestAnimationFrame(checkMenuPad);
 }
 win.addEventListener('resize',()=>{if(brief.open)showSelected();});
 brief.showModal();select(0);win.requestAnimationFrame(checkMenuPad);
}
