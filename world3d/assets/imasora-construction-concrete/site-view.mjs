import {createHeldDashButton} from '../imasora-hold-dash.mjs?v=119bf';
import {walkFactor} from '../imasora-construction-travel-input.mjs';
import * as T from '../three.module.min.js';
import {createMonsterCamera} from './monster-camera.mjs';
import {createMonsterTravelInput,viewRelativeTravel} from './monster-travel-input.mjs?v=119bf';
import {createConstructionMovePad} from './move-pad.mjs?v=119bf';
import {WORKSHOP_FENCE_PARTS} from './workshop-fence.mjs';

import {SITE,BUCKET,createSiteCollider,stepCharacter,onFinishedSurface,contactAtFinishedEdge} from './c2-3d-physics.mjs';
import {TOOL,toolPlan,pourPose,trowelPose,worldToLocal,assertToolReceipt,hammerPose,fillPose} from './c2-tool-contact.mjs';
import {createHandTools} from './c2-hand-tools.mjs';
import {createAssemblyFixtures} from './c2-assembly-fixtures.mjs';

export function createEmbeddedSiteView({hostScene,hostCamera,model,offset,onMove,onNotice,canMove,controls}){
 const scene=new T.Group();scene.name='profile-concrete-worksite';scene.position.set(offset.x,0,offset.z);hostScene.add(scene);let active=false;
 const mat=color=>new T.MeshStandardMaterial({color,roughness:.85}),wood=mat('#af8152'),wet=mat('#899995'),dry=mat('#b8beba'),metal=mat('#93acaa'),dark=mat('#607567'),groundMat=mat('#819477');
 const unit=new T.BoxGeometry(1,1,1);
 const previewMaterial=new T.LineBasicMaterial({color:'#8fffac',depthTest:false});
 const preview=new T.Group();preview.visible=false;hostScene.add(preview);let placement=null;
 const previewLines=[];for(const width of [32,212]){const line=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(width,.1,width)),previewMaterial);line.position.y=.25;line.renderOrder=1000;preview.add(line);previewLines.push(line);}
 function setPlacementPreview(value){placement=value;preview.visible=!!value;previewLines[1].visible=value?.mode==='next';if(value){preview.position.set(value.x,0,value.z);previewMaterial.color.set(value.allowed?'#8fffac':'#ff677d');}}
 function box(group,x,y,z,w,h,d,m){const mesh=new T.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;}
 // Existing map terrain remains the only ground.
 for(const p of WORKSHOP_FENCE_PARTS)box(scene,p.x,p.y,p.z,p.width,p.height,p.depth,wood).name='workshop-fence-'+p.id;
 const grid=new T.GridHelper(208,26,'#697f60','#92a486');grid.position.y=.02;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
 const outline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(32,.06,32)),new T.LineBasicMaterial({color:'#fff2bc'}));outline.position.y=.06;scene.add(outline);
 const fixtures=createAssemblyFixtures({unit,wood,wet,metal});scene.add(fixtures.root);
 const agitator=new T.Group();agitator.position.set(54,18,0);scene.add(agitator);
 box(agitator,0,0,0,.7,15,.7,metal);box(agitator,0,-5,0,12,.8,1.2,wood);box(agitator,0,-2,0,1.2,.8,12,wood);
 let mixing=false;agitator.visible=false;
 const slab=box(scene,0,1,0,32,2,32,wet);slab.visible=false;

 // Temporary scaffold, outside concrete volume: top runs from (z=28,y=0) to (z=16,y=2).
 const rampGeometry=new T.BufferGeometry();const p=[-12,0,28,12,0,28,12,2,16,-12,0,28,12,2,16,-12,2,16,-12,0,16,-12,0,28,-12,2,16,12,0,16,12,2,16,12,0,28];rampGeometry.setAttribute('position',new T.Float32BufferAttribute(p,3));rampGeometry.computeVertexNormals();const ramp=new T.Mesh(rampGeometry,new T.MeshStandardMaterial({color:'#a99169',roughness:1,side:T.DoubleSide}));ramp.receiveShadow=true;ramp.visible=false;scene.add(ramp);
 const actorGroup=new T.Group();scene.add(actorGroup);actorGroup.visible=false;
 const modelOffset=model.userData.grounding.verticalOffset;
 const feet=model.userData.feet.map(o=>({o,y:o.position.y,z:o.position.z})),hands=model.userData.hands.map(o=>({o,base:o.position.clone()}));
 const tools=createHandTools({unit,wood,metal,wet,dark});actorGroup.add(tools.root);scene.add(tools.working,tools.stream,tools.mark);
 function grip(local,index=1){const hand=model.userData.hands[index];hand.position.set(local.x/.36,(local.y-model.position.y)/.36,local.z/.36);if(index===1)tools.root.position.set(local.x,local.y,local.z);}
 const camera=hostCamera;let angle=.35,orbit=.35,height=105,distance=145;
 const monsterCamera=createMonsterCamera({camera,model,actor:actorGroup});
 const target=new T.Vector3(18,7,7);let collider=null,actor={x:32,y:0,z:32,vy:0,grounded:true},route=[],phase=0,tool='hands',last=performance.now(),lastUI=0,pointer=null;
 let checkedTop=false,checkedEdge=false,currentState=null,work=null,lastReceipt=null;
 function clearWork(){tools.clear();if(currentState)sync(currentState);}
 function failAction(error){if(!work)return;const reject=work.reject;work=null;clearWork();cancel();reject(error);} function cancelAction(){failAction(Error('ACTION_CANCELLED'));}
 function performAction(type,state){if(!['PLACE_FORMWORK','LOAD_BUCKET','POUR','FINISH_SURFACE'].includes(type))return Promise.resolve();if(work)throw Error('ACTION_ALREADY_RUNNING');const steps=toolPlan(type,state,actor);cancel();return new Promise((resolve,reject)=>{work={type,cameraHeading:type==='PLACE_FORMWORK'?-Math.PI/2:type==='LOAD_BUCKET'?Math.PI/2:0,steps,index:0,elapsed:0,before:structuredClone(state),resolve,reject,completed:new Set(),receipt:{type,streamSamples:0,contactSamples:0,maxGripError:0,maxLipError:0,maxBladeError:0,maxPoleLength:0,completedBands:[],completedPanels:[],hammerHits:[],maxHitError:0,fillSamples:0,maxFillError:0,maxVolumeError:0}};});}
 function finishAction(){const done=work;lastReceipt={...done.receipt,completedBands:done.type==='FINISH_SURFACE'?[...done.completed]:[],completedPanels:done.type==='PLACE_FORMWORK'?[...done.completed]:[]};assertToolReceipt(lastReceipt);work=null;tools.clear();done.resolve(lastReceipt);}
 function recordContact(pose,kind){const handPoint=model.userData.hands[1].getWorldPosition(new T.Vector3()),toolPoint=kind==='trowel'?tools.measureWorkingGrip():tools.root.getWorldPosition(new T.Vector3());work.receipt.maxGripError=Math.max(work.receipt.maxGripError,handPoint.distanceTo(toolPoint));
  if(kind==='pour'&&pose.flow){const actual=tools.measureLip();work.receipt.streamSamples++;work.receipt.maxLipError=Math.max(work.receipt.maxLipError,actual.distanceTo(new T.Vector3(pose.source.x+offset.x,pose.source.y,pose.source.z+offset.z)));}
  if(kind==='trowel'&&pose.contact){work.receipt.contactSamples++;work.receipt.maxBladeError=Math.max(work.receipt.maxBladeError,Math.abs(tools.bladeBottom()-2));work.receipt.maxPoleLength=Math.max(work.receipt.maxPoleLength,pose.poleLength);}
 }
 function updateWork(dt){if(!work)return 0;const step=work.steps[work.index];let moved=0;
  if(step.kind==='walk'){work.phase=work.type==='PLACE_FORMWORK'?'次の型枠へ歩いています':'反対側へ移動中';tools.clear();tools.select(tool);const dx=step.point.x-actor.x,dz=step.point.z-actor.z,len=Math.hypot(dx,dz);if(len<.35){work.index++;work.elapsed=0;}else{const amount=Math.min(len,18*dt),result=stepCharacter(collider,actor,{x:dx/len*amount,z:dz/len*amount},dt);if(result.blocked.length){cancelAction();onNotice('通路がふさがれたため作業を中止しました。材料は変更していません。');return 0;}actor=result.actor;actorGroup.rotation.y=Math.atan2(dx,dz);moved=result.distance;}}
  else{work.elapsed=Math.min(step.duration,work.elapsed+dt*1000);const t=work.elapsed/step.duration;
   if(step.kind==='pour'){const pose=pourPose(t,work.before,actor);work.phase=pose.flow?'流し込み中':pose.q===1?'バケツを戻しています':'バケツを傾けています';actorGroup.rotation.y=pose.heading;grip(pose.grip);tools.posePour(pose);slab.visible=pose.height>0;slab.scale.y=Math.max(.001,pose.height);slab.position.y=pose.height/2;actorGroup.updateMatrixWorld(true);recordContact(pose,'pour');}
   else if(step.kind==='hammer'){
    const pose=hammerPose(t,step.panel,actor);work.phase=pose.contact?'固定部を木槌で打っています':pose.settled?'木槌を振り上げています':'型枠を据えています';actorGroup.rotation.y=pose.heading;
    work.cameraHeading=pose.heading;grip(worldToLocal(pose.grip,actor,pose.heading));grip(worldToLocal(pose.brace,actor,pose.heading),0);fixtures.previewFrame(step.panel,pose,work.completed);tools.poseHammer(pose);actorGroup.updateMatrixWorld(true);fixtures.root.updateMatrixWorld(true);recordContact(pose,'hammer');
    if(pose.contact){const error=tools.hammerFace().distanceTo(fixtures.stakeTop(step.panel));work.receipt.maxHitError=Math.max(work.receipt.maxHitError,error);if(!work.receipt.hammerHits.includes(pose.hitId))work.receipt.hammerHits.push(pose.hitId);}
   }
   else if(step.kind==='fill'){
    const pose=fillPose(t,work.before,actor);work.phase=pose.flow?'バケツへ生コンを汲んでいます':pose.q===1?'注ぎ口を閉じて持ち上げています':'注ぎ口へバケツを差し出しています';actorGroup.rotation.y=pose.heading;
    grip(pose.grip);fixtures.supply(Math.min(8,work.before.availableConcreteCells)-pose.q,pose.lever);fixtures.root.updateMatrixWorld(true);
    if(t>=.22&&t<=.8)grip(worldToLocal(fixtures.leverGrip().sub(scene.position),actor,pose.heading),0);
    tools.poseFill(pose);actorGroup.updateMatrixWorld(true);recordContact(pose,'fill');
    if(pose.flow){work.receipt.fillSamples++;work.receipt.maxFillError=Math.max(work.receipt.maxFillError,tools.fillCenter().distanceTo(new T.Vector3(pose.target.x+offset.x,pose.target.y,pose.target.z+offset.z)));const rendered=(fixtures.fillSurface()-10)*256+tools.fillVolume();work.receipt.maxVolumeError=Math.max(work.receipt.maxVolumeError,Math.abs(rendered-Math.min(8,work.before.availableConcreteCells)*512));}
   }
   else{const pose=trowelPose(t,step,actor);work.phase=step.kind==='trowel-shift'?'コテを持ち上げて次の列へ':'コテの底面で仕上げ中';actorGroup.rotation.y=pose.heading;grip(worldToLocal(pose.grip,actor,pose.heading));const brace={x:pose.grip.x+(pose.joint.x-pose.grip.x)*.18,y:pose.grip.y+(pose.joint.y-pose.grip.y)*.18,z:pose.grip.z+(pose.joint.z-pose.grip.z)*.18};grip(worldToLocal(brace,actor,pose.heading),0);tools.poseTrowel(pose,work.completed);actorGroup.updateMatrixWorld(true);recordContact(pose,'trowel');}
   if(work.elapsed>=step.duration){if(step.kind==='trowel')work.completed.add((step.side===1?0:4)+step.row);if(step.kind==='hammer')work.completed.add(step.panel);work.index++;work.elapsed=0;}
  }
  if(work&&work.index>=work.steps.length)finishAction();return moved;
 }
 function cancel(){route=[];travelBoost.reset();movePad?.cancel();}
 function setTool(kind){tool=kind;tools.select(kind);}
 function sync(state){currentState=state;collider=createSiteCollider(state);fixtures.sync(state);slab.visible=state.pouredCells>0;slab.scale.y=collider.height||.001;slab.position.y=collider.height/2;slab.material=['cured','demolded'].includes(state.stage)?dry:wet;tools.amount(state.bucketCells);tools.select(tool);ramp.visible=collider.ready;}
 function walkTo(kind){cancel();let path=[];
  if(onFinishedSurface(collider,actor)||Math.abs(actor.x)<=12&&actor.z>=16&&actor.z<28)path.push({x:0,z:actor.z},{x:0,z:38});
  else if(actor.x<0)path.push({x:-32,z:38});
  path.push({x:32,z:38});
  if(kind==='site')path.push({x:32,z:0},{x:TOOL.stationX,z:0});
  if(kind==='stock')path.push({x:54,z:38},{x:54,z:31});
  if(kind==='floor')path.push({x:0,z:38},{x:0,z:24},{x:0,z:0});
  route=path;onNotice('歩いて移動します。途中で止めることもできます。');
 }
 let dashControl=null;
 const travelBoost=createMonsterTravelInput({enabled:()=>active&&canMove()&&!work,context:()=> 'foot',fastHeld:()=>dashControl?.active===true,clearFast:()=>dashControl?.cancel()});
 dashControl=createHeldDashButton({element:controls.querySelector?.('[data-hold-dash]'),enabled:()=>active&&canMove()&&!work});
 function handleKey(e){if(e.type==='keyup'){travelBoost.key(e);return;}if(document.querySelector?.('dialog[open]'))return;if(travelBoost.key(e)){route=[];e.preventDefault();}}
 const padElement=controls.querySelector?.('[data-construction-pad]');const movePad=padElement?createConstructionMovePad({element:padElement,input:travelBoost,enabled:()=>active&&canMove()&&!work,onChange:()=>{if(travelBoost.held)route=[];}}):null;
 function syncTravelControls(){dashControl.sync();movePad?.sync();}
 function tick(delta){syncTravelControls();if(!active)return;const now=performance.now(),dt=Math.min(.04,Math.max(.001,delta));
  if(mixing)agitator.rotation.y+=dt*5;
  let distanceMoved=0;
  if(collider){const input=travelBoost.vector,held=travelBoost.held,relative=viewRelativeTravel(camera.getWorldDirection(new T.Vector3()),input.x,input.z);let dx=relative.x,dz=relative.z;if(!held&&route.length){dx=route[0].x-actor.x;dz=route[0].z-actor.z;if(Math.hypot(dx,dz)<.5){route.shift();dx=dz=0;if(!route.length)onNotice('目的地に到着しました。');}}
   let step=Math.min(held?Infinity:Math.hypot(dx,dz),18*dt*(held?walkFactor({fast:travelBoost.fast})*Math.min(1,Math.hypot(input.x,input.z)):1));if(!canMove()||work)step=0;const len=Math.hypot(dx,dz)||1;
   const result=stepCharacter(collider,actor,{x:dx/len*step,z:dz/len*step},dt);actor=result.actor;distanceMoved=result.distance;
   if(route.length&&result.blocked.length){cancel();onNotice('障害物の手前で止まりました。外周か坂道から回り込んでください。');}
   if(distanceMoved>.001)actorGroup.rotation.y=Math.atan2(dx,dz);actorGroup.position.set(actor.x,actor.y,actor.z);
   hands.forEach(({o,base})=>o.position.copy(base));
   if(tool==='bucket')grip(TOOL.carry);else if(tool==='hammer')grip({x:12,y:15,z:4});else grip({x:hands[1].base.x*.36,y:hands[1].base.y*.36+model.position.y,z:hands[1].base.z*.36});
   if(work){try{distanceMoved=updateWork(dt);}catch(error){failAction(error);}}
   actorGroup.position.set(actor.x,actor.y,actor.z);
   phase+=distanceMoved*.24;feet.forEach(({o,y,z},i)=>{const a=phase+i*Math.PI;o.position.y=y+(distanceMoved>.001?Math.max(0,Math.sin(a))*3.6:0);o.position.z=z+(distanceMoved>.001?Math.cos(a)*2.2:0);});
   if(onFinishedSurface(collider,actor)&&Math.abs(actor.x)<4&&Math.abs(actor.z)<4)checkedTop=true;if(contactAtFinishedEdge(collider,actor))checkedEdge=true;
  }
  // Portrait views zoom out, rather than cutting off the actor and the material stock.
  if(monsterCamera.mode==='overview'){const desiredAngle=angle+(work?.cameraHeading??0);orbit+=Math.atan2(Math.sin(desiredAngle-orbit),Math.cos(desiredAngle-orbit))*Math.min(1,dt*5);
  const fit=Math.max(1,1.3/camera.aspect),focus=work?(work.type==='LOAD_BUCKET'?new T.Vector3(54,10,5):new T.Vector3(actor.x*.35,7,0)):target,d=work?90:distance,h=work?65:height;camera.position.set(offset.x+focus.x+Math.sin(orbit)*d*fit,focus.y+h*fit,offset.z+focus.z+Math.cos(orbit)*d*fit);camera.lookAt(focus.clone().add(scene.position));}
  if(placement){const close=placement.mode==='edit',scale=close?Math.max(1,.75/camera.aspect):Math.max(1,1.3/camera.aspect);camera.position.set(placement.x,(close?72:310)*scale,placement.z+(close?54:230)*scale);camera.lookAt(placement.x,0,placement.z);}
  else monsterCamera.tick(dt);
  if(now-lastUI>120){lastUI=now;onMove({actor:{...actor},moving:!!route.length||!!travelBoost.held||work?.steps[work.index]?.kind==='walk',checkedTop,checkedEdge,collider,work:work?{type:work.type,step:work.index+1,total:work.steps.length,phase:work.phase}:null,lastReceipt});}
 }
 function enter(){cancel();active=true;actor={x:32,y:0,z:32,vy:0,grounded:true};model.position.set(0,modelOffset,0);model.rotation.set(0,0,0);actorGroup.add(model);actorGroup.position.set(actor.x,actor.y,actor.z);actorGroup.visible=true;tools.select(tool);monsterCamera.enter();}
 function exit(){if(work)throw Error('ACTION_ALREADY_RUNNING');cancel();monsterCamera.exit();active=false;actorGroup.visible=false;tools.clear();for(const {o,base}of hands)o.position.copy(base);for(const {o,y,z}of feet){o.position.y=y;o.position.z=z;}hostScene.add(model);}
 return{root:scene,sync,syncTravelControls,setTool,cancel,walkTo,performAction,cancelAction,enter,exit,tick,handleKey,setPlacementPreview,setOrigin:value=>{if(active)throw Error('施工中は移設できません。');offset.x=value.x;offset.z=value.z;scene.position.set(value.x,0,value.z);},setMixing:value=>{mixing=!!value;agitator.visible=mixing;},get working(){return !!work;},look:(dx,dy,sensitivity)=>{if(monsterCamera.look(dx,dy,sensitivity))return;angle-=dx*sensitivity;height=T.MathUtils.clamp(height+dy*.25,55,165);},resetCamera:()=>{angle=orbit=.35;height=105;monsterCamera.reset();},get cameraMode(){return monsterCamera.mode;},setCameraMode(mode){if(work)throw Error('作業が終わってから視点を選んでください。');monsterCamera.select(mode);},getActor:()=>({...actor}),getReceipt:()=>lastReceipt};
}
