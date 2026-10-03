import {foundationWalkHeight,foundationAccessProblem,assertRaisedPaintSupport} from './free-foundation-access.mjs';
import {createFoundationAccessMotion} from './free-foundation-access-motion.mjs';
import {foundationContains} from './free-foundation-state.mjs';
import {footingAt,footingSegment} from './free-footing.mjs';
import {walkFactor} from '../imasora-construction-travel-input.mjs';
import {rotateFreeWork} from './free-work-rotation.mjs';
import {freeWorkMask,freeWorkCells} from './free-work-parts.mjs';
import {SUPPORTED_WORK_MOVE,newSupportedWorkMoveReceipt,supportedWorkMoveEnvironmentProblem} from './free-supported-work-move.mjs';
import {constructionBase,assertFoundationSupport} from './free-supported-build.mjs';
import * as T from '../three.module.min.js';
import {createMonsterCamera} from './monster-camera.mjs';
import {viewRelativeTravel} from './monster-travel-input.mjs';
import {createFreePaintLayer,surfaceMaterial,surfaceMesh} from './free-paint-layer.mjs';
import {freeCell,freeFramePanels} from './free-build-state.mjs';
import {FLOOR_COLORS} from './floor-parts.mjs';
import {createConcreteVehicle} from './vehicle-models.mjs';
import {FREE_CONTACT_ACTIONS,walkingBlocked,walkingSurface} from './free-contact.mjs';
import {concreteDoor,freeBoardProblem,freeBoardStatus,freeEntryPose,freeLeaveProblem} from './free-boarding.mjs';
import {walkingGroundAt,walkingGroundSegment,walkingGroundRotation,WALK_GROUND_MESSAGE} from './free-walking-ground.mjs';
import {createFreeContactMotion} from './free-contact-motion.mjs';
import {FREE_CAST_ACTIONS,CAST_PORTS,castPoint} from './free-casting.mjs';
import {createFreeCastingMotion} from './free-casting-motion.mjs';
import {FREE_FRAME_ACTIONS,FRAME_RACK} from './free-frames.mjs';
import {createFreeFrameMotion,frameRackPose} from './free-frame-motion.mjs';
import {FREE_VEHICLE_ACTIONS,vehicleActionProblem} from './free-vehicle-contact.mjs';
import {createFreeVehicleMotion} from './free-vehicle-motion.mjs';
import {vehicleGroundPose,applyVehicleGround,placeVehicleDriver} from './free-vehicle-ground.mjs';
import {PIPE_ACTIONS,pipeRoute,pipeProblem,pipeContactPath,pipeWalkingBlocked,retainInstalledPipe,supplyHoseMotion,advanceSupplyHose} from './free-boom-contact.mjs';
import {hoseBlocks} from './free-hose-shape.mjs';
import {FOUNDATION_ACTIONS,foundationParts} from './free-foundation-state.mjs';
import {createFoundationHandMotion,createDeferredFoundationHandMotion} from './free-foundation-hand-motion.mjs';
import {safeReturnPlan,assertSafeReturn} from './free-safe-return.mjs';
import {vehicleRescuePlan,assertVehicleRescue,newVehicleRescueReceipt} from './free-vehicle-rescue.mjs';
import {soleClearance,assertLandingSoles} from './free-walking-ground.mjs';
import {createPipeMotion} from './free-boom-motion.mjs';
import {HOSE_TRANSFER_ACTIONS,createHoseTransferMotion} from './free-hose-meter.mjs?v=120d';
import {createWorkPlatformSession} from './free-work-session.mjs?v=119bd';


export const FREE_WALK_SPEED=84;
export function createFreeBuildView({scene,camera,model}){
 const root=new T.Group(),actor=new T.Group(),forms=new T.Group(),preview=new T.Group(),tools=new T.Group();/* Keep yaw independent of terrain pitch when hand motions later change rotation.y. */actor.rotation.order='YXZ';root.name='free-concrete-workshop';root.add(forms,preview,actor,tools);const paintLayer=createFreePaintLayer(root);scene.add(root);root.visible=false;actor.visible=false;
 const unit=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,16);
 const mats={wood:material('#a6855d'),wet:material('#899995'),dry:material('#bcc2bd'),truck:material('#ecb74d'),pump:material('#63a9c3'),dark:material('#36494a'),metal:material('#a5c6c4'),black:material('#263737'),preview:new T.MeshBasicMaterial({color:'#95e2bb',wireframe:true})};
 const foundationGroup=new T.Group();foundationGroup.name='foundation-planning-preview';root.add(foundationGroup);const foundationMats={ready:new T.MeshBasicMaterial({color:'#95e2bb',wireframe:true,transparent:true,depthWrite:false}),preparation:new T.MeshBasicMaterial({color:'#8ecdf8',wireframe:true,transparent:true,depthWrite:false}),unsafe:new T.MeshBasicMaterial({color:'#ff8b83',wireframe:true,transparent:true,depthWrite:false})};
 const installedFoundation=new T.Group();installedFoundation.name='installed-foundation';root.add(installedFoundation);let foundationKey='',foundationEnvironment=()=>({heightAt:()=>null,blockedAt:()=>true});
 const storePreview=new T.MeshBasicMaterial({color:'#f48279',wireframe:true});
 const colors=Object.fromEntries(Object.entries(FLOOR_COLORS).map(([k,c])=>[k,material(c)]));
 function material(color){return new T.MeshStandardMaterial({color,roughness:.8});}
 function box(parent,x,y,z,w,h,d,mat,name=''){const m=new T.Mesh(unit,mat);m.name=name;m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function line(parent,a,b,r,mat){const m=new T.Mesh(cylinder,mat),v=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);m.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);m.scale.set(r,v.length(),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());parent.add(m);return m;}
 const vehicles={truck:createConcreteVehicle('truck'),pump:createConcreteVehicle('pump')};
 for(const v of Object.values(vehicles))root.add(v.root);
 let supportedPipeRoute=null,pipeMotion=null;const pipes=new T.Group();pipes.name='concrete-supply-hose';root.add(pipes);
 const doorMarks=new T.Group();doorMarks.name='driver-door-markers';root.add(doorMarks);const doorReady=surfaceMaterial('#92deb3',true),doorWaiting=surfaceMaterial('#e4bc59',true),doorPlane=new T.PlaneGeometry(16,20);
 const doorTiles=Object.fromEntries(['truck','pump'].map(name=>{const tile=surfaceMesh(doorPlane,doorWaiting);tile.rotation.x=-Math.PI/2;const group=new T.Group();group.name='driver-door-'+name;group.add(tile);doorMarks.add(group);return[name,{group,tile}];}));
 function restPosition(o,kind){const rig=model.userData.walkRig,entry=rig?.[kind]?.find(e=>e.part===o),p=(entry?.basePosition??o.position).clone();if(kind==='feet'&&Number.isFinite(rig?.neutralFootZ))p.z=rig.neutralFootZ;return p;}
 const hands=model.userData.hands.map(o=>({o,position:restPosition(o,'hands')})),feet=model.userData.feet.map(o=>({o,position:restPosition(o,'feet')}));
 const saved={position:model.position.clone(),rotation:model.rotation.clone()},baseY=model.userData.grounding.verticalOffset;
 const monsterCamera=createMonsterCamera({camera,model,actor});
 let foundationPlan=null,workDraft=null,current=null,project=null,key='',active=false,work=null,angle=2.6,height=190,selected=0,draft=null;
 let footNote='',external=()=>false,supportHeightAt=()=>0,toolHeightAt=(...args)=>supportHeightAt(...args),toolBlocked=(...args)=>external(...args),settling=null,cameraHold=null,lastCamera=null,walkPhase=0,walking=false,footPose={x:0,y:0,z:116,heading:Math.PI};
 let accessState=null,rescuePending=null;
 const workPlatform=createWorkPlatformSession({root,actor,feet,box,mats,heightAt:(...args)=>toolHeightAt(...args),external:(...args)=>toolBlocked(...args)});
 const walkHeight=(x,z)=>accessState?foundationWalkHeight(project,x,z,supportHeightAt,accessState.plan):supportHeightAt(x,z);
 const groundExternal=(x,z,m)=>external(x,z,m)||workPlatform.blocked(x,z,m)||(!accessState&&!!project?.foundation&&foundationContains(project.foundation,x-project.foundation.x,z-project.foundation.z,m));
 const pipeExternal=(...args)=>external(...args)||workPlatform.blocked3D(...args);
 const environment={blockedAt:(...args)=>external(...args)||workPlatform.blocked(...args),supportHeightAt:(...args)=>supportHeightAt(...args)};
 function siteEntryPose(p){
  const f=p.freeBuild,preferred={x:0,y:0,z:116,heading:Math.PI};
  for(const vehicle of ['truck','pump']){const issue=vehicleActionProblem(f,{type:'FREE_BOARD',vehicle},environment);if(issue)throw Error(issue);}
  const blocked=(x,z,m)=>external(x,z,m)||!!p.foundation&&foundationContains(p.foundation,x-p.foundation.x,z-p.foundation.z,m);
  if(!active)return freeEntryPose(f,preferred,blocked,supportHeightAt);
  if(work||settling||accessState)throw Error('作業を終え、地上へ降りてから次の場所へ進んでください。');
  const origin=root.position.clone(),position=actor.position.clone(),rotation=actor.quaternion.clone();restoreLimbs();const clearance=soleClearance(root,actor,feet);
  try{
   root.position.set(f.location.x,0,f.location.z);
   return freeEntryPose(f,preferred,blocked,supportHeightAt,(pose,s)=>{try{actor.position.set(pose.x,pose.y,pose.z);actor.quaternion.copy(walkingGroundRotation(s,pose.heading));assertLandingSoles(f,root,actor,feet,s,supportHeightAt,clearance);return true;}catch{return false;}});
  }finally{root.position.copy(origin);actor.position.copy(position);actor.quaternion.copy(rotation);root.updateMatrixWorld(true);}
 }
 function sync(p){
  if(current?.location&&p.freeBuild?.location&&(current.location.x!==p.freeBuild.location.x||current.location.z!==p.freeBuild.location.z)){
   if(active)try{footPose=siteEntryPose(p);footNote='';}catch(e){
    // A late terrain change must not create a safe arrival. Keep the actor at
    // its previous world position; the saved site/materials remain recoverable.
    footPose={...footPose,x:footPose.x+current.location.x-p.freeBuild.location.x,z:footPose.z+current.location.z-p.freeBuild.location.z};footNote=e.message+' メニューから安全な地面へ戻れます。';
   }else footPose={x:0,y:0,z:116,heading:Math.PI};cameraHold=lastCamera=null;
  }
  if(current?.location&&p.freeBuild?.location&&(current.location.x!==p.freeBuild.location.x||current.location.z!==p.freeBuild.location.z)||project?.foundation&&!p.foundation)workPlatform.clear();
  retainInstalledPipe(current,p.freeBuild,supportHeightAt);project=p;current=p.freeBuild;if(!current?.location){workPlatform.clear();root.visible=false;return;}const f=current;root.position.set(f.location.x,0,f.location.z);
  const fk=JSON.stringify(p.foundation??null);if(fk!==foundationKey){foundationKey=fk;installedFoundation.clear();for(const part of foundationParts(p.foundation))box(installedFoundation,part.x,part.y,part.z,part.width,part.height,part.depth,mats.wood).name='foundation-'+part.id;}
  paintLayer.sync(f);
  const next=JSON.stringify([f.location,f.mask,f.height,constructionBase(f),f.fill,f.stage,f.truck,f.pump,f.connected,f.hose,f.connected?['truck','pump'].map(name=>supportHeightAt(f.location.x+f[name].x,f.location.z+f[name].z)):null,f.completed]);if(next!==key){key=next;forms.clear();
   if(!['design','complete'].includes(f.stage))for(let i=0;i<16;i++)if(f.mask&(1<<i)){
    const c=freeCell(i),h=f.fill[i]/2;if(h)box(forms,c.x,constructionBase(f)+h/2,c.z,16,h,16,['cured'].includes(f.stage)?mats.dry:mats.wet);
   }
   if(!['design','complete'].includes(f.stage))for(const panel of freeFramePanels(f.mask)){const group=new T.Group();group.name='free-frame:'+panel.id;group.position.set(panel.x,constructionBase(f)+f.height/2,panel.z);group.rotation.y=panel.depth>panel.width?Math.PI/2:0;forms.add(group);box(group,0,0,0,16,f.height,.35,mats.wood);for(const x of [-6,6])box(group,x,f.height/2+.2,-.4,1.2,.4,1.2,mats.metal);}
   const rack=new T.Group();rack.name='free-frame-rack';rack.position.y=supportHeightAt(f.location.x,f.location.z+116)??0;forms.add(rack);box(rack,0,1,FRAME_RACK.z,22,2,12,mats.dark);
   if(['design','complete'].includes(f.stage))for(let i=0;i<freeFramePanels(f.mask).length;i++){const p=frameRackPose(i),m=box(rack,p.x,p.y,p.z,16,f.height,.35,mats.wood);m.rotation.set(p.tilt,p.heading,0,'YXZ');}
   for(const [name,v]of Object.entries(vehicles)){v.legs.visible=f[name].legs;}
   pipes.clear();if(f.connected){try{for(const name of ['truck','pump'])vehicleGroundPose(f,f[name],supportHeightAt);supportedPipeRoute=pipeContactPath(f,supportHeightAt,pipeExternal);}catch{}const route=supportedPipeRoute??pipeContactPath(f,supportHeightAt,pipeExternal);try{pipeMotion=supplyHoseMotion(f,pipeExternal,supportHeightAt,!pipeMotion);}catch{pipeMotion=null;}for(let i=1;i<route.length;i++)line(pipes,route[i-1],route[i],1.1,mats.dark).name='supply-hose-segment-'+i;}
  }
  if(!f.connected){supportedPipeRoute=null;pipeMotion=null;}
  if(!work&&!settling)for(const [name,v]of Object.entries(vehicles)){try{applyVehicleGround(v,vehicleGroundPose(f,f[name],supportHeightAt));}catch{v.root.position.x=f[name].x;v.root.position.z=f[name].z;}}
  if(rescuePending&&!f.aboard&&p.operations.some(a=>a.operationId===rescuePending.action.operationId)){
   const plan=rescuePending.plan;
   try{verifyLanding(plan.landing,true);footPose={...plan.landing.pose};footNote='安全な地面へ戻りました。';}
   catch{footPose={...rescuePending.seat};footNote='降車は保存済みです。救助先の地面が変わったため、もう一度救助を確認してください。';}
   rescuePending=null;cameraHold=lastCamera=null;
  }
  drawPreview();if(active&&!work&&!settling)placeActor();updateDoorMarks();
 }
 function drawPreview(){foundationGroup.clear();preview.position.y=0;preview.visible=foundationGroup.visible=!work&&!settling;if(project?.foundation&&current?.stage==='design'){preview.clear();return;}if(foundationPlan&&foundationPlan.location?.x===current?.location.x&&foundationPlan.location?.z===current?.location.z&&current.stage==='design'){for(const c of foundationPlan.cells){const y=foundationPlan.deckY??0,m=box(foundationGroup,c.x,y+foundationPlan.height/2,c.z,16,foundationPlan.height,16,foundationMats[foundationPlan.kind==='unsafe'?'unsafe':foundationPlan.ready?'ready':'preparation']);m.name='foundation-cell-'+c.index;}for(const p of foundationPlan.supports){const m=box(foundationGroup,p.x,(p.top+p.bottom)/2,p.z,.6,p.top-p.bottom,.6,foundationMats.preparation);m.name='foundation-support';}preview.clear();return;}preview.clear();if(!current?.location)return;const f=current,mask=draft?.mask??(f.stage==='design'?f.mask:0),h=draft?.height??f.height;
  for(let i=0;i<16;i++)if(mask&(1<<i)){const c=freeCell(i);box(preview,c.x,h/2,c.z,16,h,16,mats.preview);}
  if(workDraft){const w=f.completed[workDraft.work];if(w){if(workDraft.position){for(const [shape,mat]of [[w,storePreview],[{...rotateFreeWork(w,workDraft.quarterTurns??0),...workDraft.position},workDraft.invalid?storePreview:mats.preview]])for(const c of freeWorkCells(shape))box(preview,c.x-f.location.x,(c.baseY??0)+c.height/2,c.z-f.location.z,16.2,c.height+.1,16.2,mat);}else for(const c of freeWorkCells(w,freeWorkMask(w)^workDraft.mask))box(preview,c.x-f.location.x,(c.baseY??0)+c.height/2,c.z-f.location.z,16.2,c.height+.1,16.2,workDraft.mask&(1<<c.index)?mats.preview:storePreview);}}
  const c=freeCell(selected);box(preview,c.x,constructionBase(f)+f.fill[selected]/2+.09,c.z,15.8,.08,15.8,mats.preview);
 }
 function restoreLimbs(){for(const e of [...hands,...feet])e.o.position.copy(e.position);}
 function stopWalking(){walking=false;restoreLimbs();}
 function walkingPose(){
  if(!walking||work||settling||current.aboard)return;
  if(accessState)accessState.scaffold.walk(accessState.plan,walkPhase);
  else for(const [i,e] of feet.entries()){const s=Math.sin(walkPhase+i*Math.PI);e.o.position.y=e.position.y+Math.max(0,s)*2.6;e.o.position.z=e.position.z+s*7.2;}
  for(const [i,e] of hands.entries())e.o.position.z=e.position.z-Math.sin(walkPhase+i*Math.PI)*3;
 }
 function placeActor(){
  // The main scene may update its character while an asynchronous save finishes.
  // While this controller owns input, keep the actor in this local coordinate frame.
  if(active){if(model.parent!==actor)actor.add(model);model.visible=true;model.position.set(0,baseY,0);model.rotation.set(0,0,0);}
  restoreLimbs();const f=current;if(f.aboard){const v=vehicles[f.aboard];try{applyVehicleGround(v,vehicleGroundPose(f,f[f.aboard],supportHeightAt));}catch{}placeVehicleDriver(root,actor,v);}
  else{actor.position.set(footPose.x,footPose.y,footPose.z);const support=walkingGroundAt(current,footPose.x,footPose.z,walkHeight);if(support)actor.quaternion.copy(walkingGroundRotation(support,footPose.heading));else actor.rotation.set(0,footPose.heading,0);walkingPose();}
 }
 function resetTool(){tools.clear();restoreLimbs();}
 function updateDoorMarks(){if(!current)return;doorMarks.visible=active&&!current.aboard;for(const name of ['truck','pump']){const {group,tile}=doorTiles[name];try{const door=concreteDoor(current[name],current,supportHeightAt),support=walkingGroundAt(current,door.x,door.z,supportHeightAt);group.visible=true;group.position.set(door.x,door.y+.08,door.z);group.quaternion.copy(walkingGroundRotation(support,current[name].heading));tile.material=freeBoardProblem(current,actor.position,name,groundExternal,supportHeightAt)?doorWaiting:doorReady;}catch{group.visible=false;}}}
 function walkFoot(dx,dz,dt,fast=false){
  if(!active||work||settling||current.aboard||!Number.isFinite(dt)||dt<=0)return false;
  const length=Math.hypot(dx,dz);if(!Number.isFinite(length)||!length){stopWalking();return false;}
  footNote='';if(accessState)try{assertFoundationSupport(project,foundationEnvironment());}catch(e){stopWalking();footNote=e.message;return false;}const initialSupport=walkingGroundAt(current,footPose.x,footPose.z,walkHeight);if(!initialSupport||Math.abs(initialSupport.height-footPose.y)>.15){stopWalking();footNote=WALK_GROUND_MESSAGE;return false;}
  const step=FREE_WALK_SPEED*walkFactor({fast})*Math.min(.05,dt),nx=dx/length,nz=dz/length,start={...footPose},count=Math.max(1,Math.ceil(step/.5));
  for(let i=0;i<count;i++){let x=footPose.x+nx*step/count,z=footPose.z+nz*step/count;if(!walkingBlocked(current,x,footPose.z,groundExternal,null,supportHeightAt)){if((accessState?footingSegment:walkingGroundSegment)(current,footPose,{x,z:footPose.z},walkHeight))footPose.x=x;else footNote=accessState?'土台の端や穴には進めません。階段で地上へ戻ってください。':WALK_GROUND_MESSAGE;}if(!walkingBlocked(current,footPose.x,z,groundExternal,null,supportHeightAt)){if((accessState?footingSegment:walkingGroundSegment)(current,footPose,{x:footPose.x,z},walkHeight))footPose.z=z;else footNote=accessState?'土台の端や穴には進めません。階段で地上へ戻ってください。':WALK_GROUND_MESSAGE;}footPose.y=walkingGroundAt(current,footPose.x,footPose.z,walkHeight)?.height??footPose.y;}
  const moved=Math.hypot(footPose.x-start.x,footPose.z-start.z);walking=moved>1e-7;
  if(walking){footPose.heading=Math.atan2(footPose.x-start.x,footPose.z-start.z);walkPhase=(walkPhase+moved*.24/(fast?1.5:1))%(Math.PI*2);cameraHold=null;}
  placeActor();if(moved<step*.9&&pipeWalkingBlocked(current,start.x+nx*step,start.z+nz*step,14,supportHeightAt))footNote="ホースが通っています。外側へ回り込むか、残りを回収して接続を外してください。";updateDoorMarks();return walking;
 }
 function cameraTick(dt=0){
  const f=current;if(!f)return;
  const pose=cameraHold??{focus:work?.focus??{x:0,y:30,z:12},distance:work?.motion?.cameraDistance??(work?110:250),viewAngle:work?.motion?.cameraAngle??angle,elevation:work?.motion?.cameraHeight??(work?85:height)};
  // Follow distant travel continuously; nearby construction keeps its fixed framing.
  if((current.aboard&&(!work||work.a.type==='FREE_MOVE')&&(!settling||settling.action.type==='FREE_MOVE'))||(!current.aboard&&!cameraHold&&!work&&!settling)){const v=current.aboard?vehicles[current.aboard].root.position:actor.position,d=Math.hypot(v.x,v.z-12),u=T.MathUtils.clamp((d-120)/140,0,1),ratio=u*u*(3-2*u);pose.focus={x:v.x*ratio,y:30+v.y,z:12+(v.z-12)*ratio};}
  lastCamera={...pose,focus:{...pose.focus}};
  if(monsterCamera.tick(dt,{aboard:!!current.aboard}))return;
  // Keep both driver-door approaches inside the narrower phone scene as well.
  const {focus,distance,viewAngle,elevation}=pose,fit=Math.max(1,1.4/camera.aspect);
  camera.position.set(f.location.x+focus.x+Math.sin(viewAngle)*distance*fit,focus.y+elevation*fit,f.location.z+focus.z+Math.cos(viewAngle)*distance*fit);camera.lookAt(f.location.x+focus.x,focus.y,f.location.z+focus.z);
 }
 function pendingPipeProblem(a){const pending=work??settling,action=pending?.a??pending?.action;if(a.type==='FREE_CONNECT'&&a.connected&&action?.type==='FREE_CONNECT'&&action.connected){try{pending.motion?.verifyFooting?.();}catch(e){return e.message;}}return '';}
 function connectionFootProblem(a){return a.type==='FREE_CONNECT'&&a.connected&&!current.aboard&&hoseBlocks(pipeRoute(current,pipeExternal,supportHeightAt),actor.position.x,actor.position.z)?'ホースを接続する通り道から離れてください。':'';}
 function access(up,target=null){
  if(work||settling)throw Error('作業中です。');stopWalking();if(up===!!accessState)throw Error(up?'すでに土台にいます。':'すでに地上にいます。');placeActor();const motion=createFoundationAccessMotion({up,target,p:project,prior:accessState,root,actor,feet,heightAt:supportHeightAt,external,box,mats});if(!lastCamera)cameraTick();cameraHold={...lastCamera,focus:{...lastCamera.focus}};return new Promise((resolve,reject)=>{work={a:{type:up?'FOUNDATION_ACCESS_UP':'FOUNDATION_ACCESS_DOWN'},motion,resolve,reject};});
 }
 function perform(a,{fast=false,deferredFoundation=false}={}){
  if(work||settling)throw Error('作業中です。');stopWalking();footNote='';
  if(a.type===SUPPORTED_WORK_MOVE){placeActor();const env=()=>({foot:{x:actor.position.x,y:actor.position.y,z:actor.position.z},blockedAt:external,supportHeightAt:foundationEnvironment().heightAt}),receipt=newSupportedWorkMoveReceipt(project,a,env());settling={action:a,motion:{verifyFooting(){const issue=supportedWorkMoveEnvironmentProblem(project,a.work,a,env(),a.quarterTurns);if(issue)throw Error(issue);}}};return Promise.resolve(receipt);}
  if(FOUNDATION_ACTIONS.has(a.type)){
   placeActor();const motion=(deferredFoundation?createDeferredFoundationHandMotion:createFoundationHandMotion)({p:project,a,root,actor,model,hands,feet,tools,mats,line,environment:()=>foundationEnvironment(),installedFoundation});
   if(!lastCamera)cameraTick();cameraHold={...lastCamera,focus:{...lastCamera.focus}};
   return new Promise((resolve,reject)=>{work={a,motion,focus:cameraHold.focus,resolve,reject};});
  }
  const vehicleProblem=vehicleActionProblem(current,a,environment)||(a.type==='FREE_LEAVE'?freeLeaveProblem(current,groundExternal,supportHeightAt):'');if(vehicleProblem)throw Error(vehicleProblem);
  const hoseProblem=pipeProblem(current,a,pipeExternal,supportHeightAt)||connectionFootProblem(a);if(hoseProblem)throw Error(hoseProblem);
  if(HOSE_TRANSFER_ACTIONS.has(a.type)){
   const motion=createHoseTransferMotion(a,current,()=>{const check={type:'FREE_PRIME'},issue=vehicleActionProblem(current,check,environment)||pipeProblem(current,check,pipeExternal,supportHeightAt);if(issue)throw Error(issue);});if(!lastCamera)cameraTick();cameraHold={...lastCamera,focus:{...lastCamera.focus}};
   return new Promise((resolve,reject)=>{work={a,motion,focus:cameraHold.focus,resolve,reject};});
  }
  if(PIPE_ACTIONS.has(a.type)){
   // Rebind both real couplers after recovery or an environment update.
   if(a.connected)for(const name of ['truck','pump'])applyVehicleGround(vehicles[name],vehicleGroundPose(current,current[name],supportHeightAt));
   placeActor();const motion=createPipeMotion({a,p:project,root,tools,pipes,line,mats,vehicles,external:pipeExternal,supportHeightAt:(...args)=>supportHeightAt(...args)});if(!lastCamera)cameraTick();cameraHold={...lastCamera,focus:{...lastCamera.focus}};
   return new Promise((resolve,reject)=>{work={a,motion,focus:motion.focus,resolve,reject};});
  }
  if(FREE_VEHICLE_ACTIONS.has(a.type)){
   placeActor();const motion=createFreeVehicleMotion({a,p:project,root,actor,vehicles,environment,fast});
   if(!lastCamera)cameraTick();cameraHold={...lastCamera,focus:{...lastCamera.focus}};
   return new Promise((resolve,reject)=>{work={a,motion,focus:motion.focus,resolve,reject};});
  }
  if(a.type==='FREE_PAINT')assertRaisedPaintSupport(project,a,foundationEnvironment().heightAt,foundationEnvironment().blockedAt);
  if(FREE_CONTACT_ACTIONS.has(a.type)){if(project.foundation&&(['FREE_FRAME','FREE_FRAME_RAISED'].includes(a.type)||constructionBase(current)&&[...FREE_FRAME_ACTIONS,...FREE_CAST_ACTIONS].includes(a.type)))assertFoundationSupport(project,foundationEnvironment());
   placeActor();const createMotion=FREE_FRAME_ACTIONS.has(a.type)?createFreeFrameMotion:FREE_CAST_ACTIONS.has(a.type)?createFreeCastingMotion:createFreeContactMotion;const motion=createMotion({a,p:project,root,actor,model,hand:hands[1].o,hands,feet,vehicles,tools,colors,mats,line,external:a.type==='FREE_PAINT'&&project.schemaVersion>=13&&project.foundation?external:FREE_FRAME_ACTIONS.has(a.type)||FREE_CAST_ACTIONS.has(a.type)||a.type==='FREE_PAINT'&&!accessState?toolBlocked:groundExternal,paintGroundExternal:a.type==='FREE_PAINT'&&project.schemaVersion>=13&&project.foundation?groundExternal:undefined,supportHeightAt:(...args)=>(FREE_FRAME_ACTIONS.has(a.type)||FREE_CAST_ACTIONS.has(a.type)?toolHeightAt:a.type==='FREE_PAINT'?(project.schemaVersion>=13&&project.foundation&&!accessState?toolHeightAt:walkHeight):supportHeightAt)(...args),
    vehicleHeightAt:supportHeightAt,boomExternal:pipeExternal,sharedPlatform:accessState?null:workPlatform,drawPaint:pixels=>paintLayer.draw(current,a,pixels)});
   // Casting keeps the player's current framing through walking, work, save and rest.
   // In particular, individual trowel strokes must never drag or jump the camera.
   if(FREE_CAST_ACTIONS.has(a.type)||FREE_FRAME_ACTIONS.has(a.type)||a.type==='FREE_PAINT'||a.type==='FREE_BOARD'||a.type==='FREE_LEAVE'){if(!lastCamera)cameraTick();cameraHold={...lastCamera,focus:{...lastCamera.focus}};}else cameraHold=null;
   return new Promise((resolve,reject)=>{work={a,motion,focus:motion.focus,resolve,reject};});
  }
  return Promise.resolve();
 }
 function cancel(error=null){if(!work)return;const w=work;work=null;w.motion?.cancel();if(!workPlatform.visible)workPlatform.clear();paintLayer.finish(false);resetTool();sync(project);w.reject(error??Error('作業を中止しました。材料は変更していません。'));}
 function evacuationPlan(){
  if(!active||work||settling)throw Error('作業を止め、保存の確認を終えてから戻ってください。');
  restoreLimbs();const position=actor.position.clone(),rotation=actor.quaternion.clone(),clearance=soleClearance(root,actor,feet);
  return (current.aboard?vehicleRescuePlan:safeReturnPlan)(project,groundExternal,supportHeightAt,(pose,s)=>{try{actor.position.set(pose.x,pose.y,pose.z);actor.quaternion.copy(walkingGroundRotation(s,pose.heading));assertLandingSoles(current,root,actor,feet,s,supportHeightAt,clearance);return true;}catch{return false;}finally{actor.position.copy(position);actor.quaternion.copy(rotation);}});
 }
 function verifyLanding(landing,rebase=false){
  if(rebase)landing={...landing,context:JSON.stringify({revision:project.revision,freeBuild:{...current,aboard:null},foundation:project.foundation??null})};
  const s=assertSafeReturn({...project,freeBuild:{...current,aboard:null}},landing,groundExternal,supportHeightAt),position=actor.position.clone(),rotation=actor.quaternion.clone();
  restoreLimbs();const clearance=soleClearance(root,actor,feet);
  try{actor.position.set(landing.pose.x,landing.pose.y,landing.pose.z);actor.quaternion.copy(walkingGroundRotation(s,landing.pose.heading));return assertLandingSoles(current,root,actor,feet,s,supportHeightAt,clearance);}
  finally{actor.position.copy(position);actor.quaternion.copy(rotation);}
 }
 function verifyVehicleRescue(plan){assertVehicleRescue(project,plan,groundExternal,supportHeightAt);return verifyLanding(plan.landing);}
 function prepareVehicleRescue(a,plan){
  if(!active||work||settling)throw Error('作業を止め、保存の確認を終えてから戻ってください。');
  const receipt=newVehicleRescueReceipt(project,a,plan);
  for(let i=0;i<3;i++){receipt.rescue.maxSoleError=Math.max(receipt.rescue.maxSoleError,verifyVehicleRescue(plan));receipt.rescue.samples++;}
  rescuePending={action:a,plan:structuredClone(plan),seat:{x:actor.position.x,y:actor.position.y,z:actor.position.z,heading:current[current.aboard].heading}};
  settling={action:a,pose:plan.landing.pose,rescue:true};return receipt;
 }
 function evacuate(plan){
  if(!active||work||settling)throw Error('作業を止め、保存の確認を終えてから戻ってください。');
  const s=assertSafeReturn(project,plan,groundExternal,supportHeightAt),position=actor.position.clone(),rotation=actor.quaternion.clone();restoreLimbs();const clearance=soleClearance(root,actor,feet);
  try{actor.position.set(plan.pose.x,plan.pose.y,plan.pose.z);actor.quaternion.copy(walkingGroundRotation(s,plan.pose.heading));assertLandingSoles(current,root,actor,feet,s,supportHeightAt,clearance);}catch(e){actor.position.copy(position);actor.quaternion.copy(rotation);throw e;}
  if(accessState){accessState.scaffold.dispose();root.remove(accessState.group);accessState=null;}
  footPose={...plan.pose};footNote='';cameraHold=lastCamera=null;placeActor();updateDoorMarks();cameraTick();
 }
 function tick(dt){if(!active)return;
  if(current.connected&&pipeMotion&&!PIPE_ACTIONS.has(work?.a?.type)){const route=advanceSupplyHose(current,dt,work?.a?.type==='FREE_POUR'&&work.a.source==='pump'||work?.a?.type==='FREE_PRIME');if(route&&pipes.children.length===route.length-1)for(let i=1;i<route.length;i++){const mesh=pipes.children[i-1],a=route[i-1],b=route[i],delta=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);mesh.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}}
 preview.visible=foundationGroup.visible=!work&&!settling;if(current.mixer.pending)vehicles.truck.drum.rotation.z+=dt*2;
  if(work?.motion){const w=work;try{if(project.foundation&&(['FREE_FRAME','FREE_FRAME_RAISED'].includes(w.a.type)||constructionBase(current)&&[...FREE_FRAME_ACTIONS,...FREE_CAST_ACTIONS].includes(w.a.type)))assertFoundationSupport(project,foundationEnvironment());if(!FREE_VEHICLE_ACTIONS.has(w.a.type)&&!HOSE_TRANSFER_ACTIONS.has(w.a.type)){const problem=vehicleActionProblem(current,w.a,environment)||pipeProblem(current,w.a,pipeExternal,supportHeightAt);if(problem)throw Error(problem);}if(w.a.type==='FREE_PAINT')assertRaisedPaintSupport(project,w.a,foundationEnvironment().heightAt,foundationEnvironment().blockedAt);if(w.motion.tick(dt)){settling={action:w.a,pose:w.motion.endPose,motion:w.motion};work=null;resetTool();w.resolve(w.motion.receipt);}}catch(e){cancel(e);}cameraTick(dt);return;}
  cameraTick(dt);
 }
 return{root,vehicles,perform,access,cancel,tick,sync,exportWorkPlatform:()=>workPlatform.exportRecord(project),restoreWorkPlatform(record){if(work||settling||accessState)throw Error('作業中です。');const issue=workPlatform.restore(record,project);footNote=issue;if(active&&!current.aboard){footPose=freeEntryPose(current,footPose,groundExternal,supportHeightAt);placeActor();}return issue;},get hasWorkPlatform(){return workPlatform.visible;},get workPlatformPlan(){return workPlatform.plan;},clearWorkPlatform(){if(work||settling||accessState)throw Error('作業を終えて地上へ降りてから片付けてください。');workPlatform.clear();},siteEntryPose,walkFoot,evacuationPlan,evacuate,prepareVehicleRescue,verifyVehicleRescue,get onAccess(){return !!accessState;},get accessProblem(){return accessState?'':foundationAccessProblem(project);},get accessRecord(){return accessState?{plan:accessState.plan,record:accessState.record,footing:accessState.footing}:null;},verifyFooting(){settling?.motion?.verifyFooting?.();workPlatform.verify(current,toolHeightAt,toolBlocked);},stopWalking,travelVector:(dx,dz)=>viewRelativeTravel(camera.getWorldDirection(new T.Vector3()),dx,dz),get footPosition(){return{x:actor.position.x,y:actor.position.y,z:actor.position.z};},boardStatus:name=>{const status=freeBoardStatus(current,actor.position,name,groundExternal,supportHeightAt);return {...status,problem:status.problem||vehicleActionProblem(current,{type:'FREE_BOARD',vehicle:name},environment)};},boardProblem:name=>freeBoardProblem(current,actor.position,name,groundExternal,supportHeightAt)||vehicleActionProblem(current,{type:'FREE_BOARD',vehicle:name},environment),vehicleProblem:a=>vehicleActionProblem(current,a,environment)||(a.type==='FREE_LEAVE'?freeLeaveProblem(current,groundExternal,supportHeightAt):'')||pendingPipeProblem(a)||pipeProblem(current,a,pipeExternal,supportHeightAt)||connectionFootProblem(a),get phase(){return work?.motion?.phase??footNote;},setToolEnvironment:({heightAt,blockedAt})=>{toolHeightAt=heightAt;toolBlocked=blockedAt;},get hoseTransferType(){return work?.a?.type??settling?.action.type;},get hoseTransferProgress(){return work?.motion?.progress??settling?.motion?.progress??0;},get hoseMotion(){return pipeMotion?.dynamics.stats??null;},setBlockedAt:fn=>{external=fn;pipeMotion=null;key="";},setSupportHeightAt:fn=>{supportHeightAt=fn;},complete(success,retainRescue=false){paintLayer.finish(success);if(settling?.rescue&&!success&&!retainRescue)rescuePending=null;if(success&&settling?.action.type==='FOUNDATION_ACCESS_UP')accessState=settling.motion.access;if(success&&settling?.action.type==='FOUNDATION_ACCESS_DOWN')accessState=null;if(success&&settling?.pose&&!settling.rescue&&settling.action.type!=='FREE_BOARD'&&(!current.aboard||settling.action.type==='FREE_LEAVE'))footPose={...settling.pose};settling?.motion?.settle?.(success);settling=null;},setFoundationPreview:value=>{foundationPlan=value;drawPreview();},setWorkPreview:value=>{workDraft=value;drawPreview();},setDraft:value=>{draft=value;drawPreview();},select:i=>{selected=i;drawPreview();},get busy(){return!!work;},
  setFoundationEnvironment:fn=>{foundationEnvironment=fn;},
  enter(){stopWalking();if(!current.aboard)footPose=freeEntryPose(current,footPose,external,supportHeightAt);active=true;cameraHold=lastCamera=null;actor.visible=true;saved.position.copy(model.position);saved.rotation.copy(model.rotation);actor.add(model);model.position.set(0,baseY,0);model.rotation.set(0,0,0);placeActor();monsterCamera.enter();},
  exit(){cancel();stopWalking();workPlatform.clear();paintLayer.finish(false);if(accessState){accessState.scaffold.dispose();root.remove(accessState.group);accessState=null;}monsterCamera.exit();active=false;cameraHold=lastCamera=null;actor.visible=false;scene.add(model);model.position.copy(saved.position);model.rotation.copy(saved.rotation);resetTool();draft=workDraft=null;},
  get cameraMode(){return monsterCamera.mode;},setCameraMode(mode){if(work||settling)throw Error('作業が終わってから視点を選んでください。');monsterCamera.select(mode);cameraHold=lastCamera=null;if(active)cameraTick();},
  look(dx,dy,sensitivity){if(monsterCamera.look(dx,dy,sensitivity))return;angle-=dx*sensitivity;height=T.MathUtils.clamp(height+dy*.25,85,230);if(cameraHold){cameraHold.viewAngle-=dx*sensitivity;cameraHold.elevation=T.MathUtils.clamp(cameraHold.elevation+dy*.25,85,230);}},resetCamera(){cameraHold=lastCamera=null;angle=2.6;height=190;monsterCamera.reset();if(active)cameraTick();}
 };
}
