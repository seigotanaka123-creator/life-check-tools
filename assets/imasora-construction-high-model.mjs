import{stairPlacement,stairPoint,stairBox,stairEntry,stairExit,stairGround,stairDoor,stairApproach}from'./imasora-construction-stair-placement.mjs?v=120gn';
import{kitPieceBoxes}from'./imasora-construction-kit-cargo.mjs?v=120gm';
import{createRoomDoorDeliveryView}from'./imasora-construction-room-door-delivery-view.mjs?v=120gn';
import{boardBayRetrofitJobs,boardBayBraceParts,hasBoardBay,boardBayLevels,boardBaySupports,boardLiftStructure,boardLiftBridges}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{roomDoorDelivery,roomDeliveryPhase as roomKitPhase}from'./imasora-construction-room-door-delivery.mjs?v=120gn';
import{roomKitBox,roomKitPickupBox,ROOM_KIT_PICKUP_SECONDS}from'./imasora-construction-room-kit.mjs?v=120gn';
import{roomItemParts}from'./imasora-construction-room-layout-shape.mjs?v=120gn';
import{wallDoorCutPart}from'./imasora-construction-wall-door-shape.mjs?v=120gn';
import{createRoomLayoutView,ROOM_PART_COLORS}from'./imasora-construction-room-layout-view.mjs?v=120gn';
import{roomLayoutPlan}from'./imasora-construction-room-layout.mjs?v=120gn';
import {roomPaintVisiblePart} from './imasora-construction-building-room.mjs?v=120gn';
import {entranceDoorParts} from './imasora-construction-building-door.mjs?v=120gn';
import {highAccessLandings} from './imasora-construction-high-work-position.mjs?v=120gn';
import{highPlanScale}from'./imasora-construction-high-interior.mjs?v=120gn';
import {highShapeKey,highFloors,highFloorPieces,highRoofBridge} from './imasora-construction-high-shape.mjs?v=120gn';
import * as T from './three.module.min.js';
import {highIsRecovering,highDisassemblyAt,highPlatform,highBuildingParts,highActorAt,highJobPlan,highRouteSeconds,highAssemblyAt,highAssembly} from './imasora-construction-high-build.mjs?v=120gn';
export function createHighModel(scene,initial,handPoint=null){
const roomView=createRoomLayoutView(scene);
const layoutKey=highShapeKey(initial),scale=highPlanScale(initial);
const unit=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,8);
const material=color=>new T.MeshStandardMaterial({color,roughness:.8});
const mats={wood:material('#c99a61'),beam:material('#b77b45'),floor:material('#e2be84'),wall:material('#f4d7a6'),stair:material('#d4ae77'),steel:material('#839ca8'),deck:material('#c6d8de'),lift:material('#efbd44'),green:material('#6cba97'),tool:material('#eeaf3f'),assembly:material('#ffffff')};
const ghostMat=new T.MeshBasicMaterial({color:'#e6b933',wireframe:true,transparent:true,opacity:.48,depthWrite:false});
function box(parent,p,mat,actual=false){if(!actual)p={...p,x:p.x*scale,z:p.z*scale,w:p.w*scale,d:p.d*scale};const m=new T.Mesh(unit,mat);m.position.set(p.x,p.y,p.z);m.scale.set(p.w,p.h,p.d);parent.add(m);return m;}
function line(parent,a,b,r,mat){const m=new T.Mesh(cylinder,mat),d=new T.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);m.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);m.scale.set(r,d.length(),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(m);return m;}
const site=new T.Group();site.name='high-build-persistent-platform';scene.add(site);
const platform=highPlatform(initial),towerHeight=highFloors(initial)*40;
function instances(items,mat,name){const m=new T.InstancedMesh(unit,mat,items.length),o=new T.Object3D();items.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.w,p.h,p.d);o.updateMatrix();m.setMatrixAt(i,o.matrix);});m.name=name;m.userData.roomParts=items;site.add(m);return m;}
instances(platform.decks.filter(p=>p.y).map(p=>({...p,y:p.y-1,h:2})),mats.deck,'same-working-decks');
instances(boardBayBraceParts(initial),mats.beam,'retrofit-continuous-load-bearing-beams');
instances(boardBaySupports(initial),mats.steel,'board-bay-load-bearing-supports');
instances(boardLiftStructure(initial),mats.steel,'board-lift-guide-tower');
instances(boardLiftBridges(initial).map(b=>({...b,y:b.y-1,h:2})),mats.deck,'board-lift-dock-bridges');
if(hasBoardBay(initial)){
 for(const level of boardBayLevels(initial)){const bayY=level*40;
 const rail=[];for(const x of[2.5,61.5])rail.push({x,y:bayY+.4,z:114,w:1,h:.8,d:260});
 instances(rail,mats.lift,'board-bay-side-frames');
 const rollers=new T.InstancedMesh(cylinder,mats.steel,32),o=new T.Object3D();for(let i=0;i<32;i++){o.position.set(32,bayY-.7,-10+i*8);o.rotation.z=Math.PI/2;o.scale.set(.8,56,.8);o.updateMatrix();rollers.setMatrixAt(i,o.matrix);}rollers.name='board-bay-flush-rollers';site.add(rollers);
 for(const z of[174,194,214]){const arrow=new T.Shape();arrow.moveTo(-4,6);arrow.lineTo(0,1);arrow.lineTo(4,6);arrow.lineTo(4,2);arrow.lineTo(0,-4);arrow.lineTo(-4,2);arrow.closePath();const mesh=new T.Mesh(new T.ShapeGeometry(arrow),mats.lift);mesh.rotation.x=-Math.PI/2;mesh.position.set(32,bayY+.06,z);site.add(mesh);}
}
}
instances(platform.stairs.map(p=>({...p,y:p.y-1.25,h:2.5})),mats.deck,'same-stairs');
instances(platform.posts.map(p=>({...p,y:towerHeight/2,w:2*scale,h:towerHeight+6,d:2*scale})),mats.steel,'same-support-posts');
const access=instances(highAccessLandings(initial).map(p=>({...p,y:p.y-1,h:2})),mats.deck,'room-and-pipe-landings');
const rails=[];for(const y of Array.from({length:highFloors(initial)},(_,i)=>(i+1)*40))for(const x of[-70,70])rails.push({x,y:y+10,z:0,w:1.2,h:1.2,d:140});
instances(rails.map(p=>({...p,x:p.x*scale,z:p.z*scale,w:p.w*scale,d:p.d*scale})),mats.steel,'outer-guardrails');
const lift=new T.Group();lift.position.set(-91*scale,0,56*scale);scene.add(lift);
box(lift,{x:0,y:-1,z:0,w:38,h:2,d:36},mats.lift);
for(const x of[-110,-72])box(scene,{x,y:(towerHeight+10)/2,z:72,w:2,h:towerHeight+14,d:2},mats.steel);
const cable=line(scene,{x:-91*scale,y:towerHeight+10,z:72*scale},{x:-91*scale,y:0,z:72*scale},.5,mats.steel);
const packageGroup=new T.Group();scene.add(packageGroup);
for(let i=0;i<4;i++)box(packageGroup,{x:(i%2?8:-8),y:2+Math.floor(i/2)*3,z:0,w:28,h:3,d:10},mats.wood);
const crate=new T.Group();scene.add(crate);for(const p of kitPieceBoxes(scale))box(crate,p,mats.wood,true);crate.name='reserved-building-kit-crate';crate.visible=false;
const crateBands=Array.from({length:2},(_,i)=>box(scene,{x:0,y:4,z:0,w:1,h:6.08,d:20*scale+.08},mats.lift,true));crateBands.forEach(m=>m.visible=false);
const bench=new T.Group();scene.add(bench);box(bench,{x:-94,y:6,z:85,w:40,h:3,d:25},mats.wood);
for(const x of[-110,-78])for(const z of[78,92])box(bench,{x,y:2.5,z,w:3,h:5,d:3},mats.steel);
const doorRoot=new T.Group();doorRoot.name='building-entrance-sliding-door';scene.add(doorRoot);const doorGlass=material('#b1e7ff'),doorWindow=box(doorRoot,{x:0,y:25,z:76.65,w:22,h:9,d:.2},doorGlass,true),doorHandle=box(doorRoot,{x:0,y:16,z:77,w:1.2,h:6,d:1},mats.lift,true);const doorMeshes=Array.from({length:5},(_,i)=>box(doorRoot,{x:0,y:0,z:0,w:1,h:1,d:1},i===4?mats.green:mats.wood,true));
 const building=new T.Group();building.name='high-build-actual-building';scene.add(building);
const levels=Array.from({length:highFloors(initial)},(_,i)=>{const group=new T.Group();building.add(group);return highAssembly(i+1,initial).map(({part:p})=>({p,mesh:box(group,p,mats[p.kind==='column'?'wood':p.kind==='beam'?'beam':p.kind==='wall'?'wall':p.kind==='stair'?'stair':'floor'],true)}));});
const bridgeShape=highRoofBridge(initial);const bridge=box(scene,bridgeShape?{...bridgeShape,y:bridgeShape.y-1,h:2}:{x:0,y:0,z:0,w:1,h:1,d:1},mats.deck,true);
const preview=new T.Group();scene.add(preview);
const roomKit=box(scene,{x:0,y:0,z:0,w:21,h:20,d:2},mats.wood,true);roomKit.name='room-material-kit';roomKit.visible=false;
const kitGrips=Array.from({length:2},()=>box(scene,{x:0,y:0,z:0,w:.6,h:.6,d:2},mats.steel,true));kitGrips.forEach(m=>m.visible=false);
const assembling=new T.InstancedMesh(unit,mats.assembly,16);assembling.name='room-furniture-assembly';assembling.count=0;scene.add(assembling);
const doorDeliveryView=createRoomDoorDeliveryView(scene,{unit,cylinder,mats,handPoint});
const selectedCellMat=new T.MeshBasicMaterial({color:'#1b9e8d',wireframe:true,transparent:true,opacity:1,depthWrite:false}),selectedCell=box(scene,{x:0,y:0,z:0,w:16,h:36,d:16},selectedCellMat);selectedCell.visible=false;
const orderedLevels=levels.flat(),orderedParts=orderedLevels.map(v=>v.p),offsets=[0],completedGroups={};for(const level of levels)offsets.push(offsets.at(-1)+level.length);
for(const [kind,mat]of [['column',mats.wood],['beam',mats.beam],['floor',mats.floor],['wall',mats.wall],['stair',mats.stair]].filter(([kind])=>kind!=='stair'||scale===2)){const mesh=new T.InstancedMesh(unit,mat,orderedParts.length+24);mesh.count=0;building.add(mesh);completedGroups[kind]=mesh;}
const previewMesh=new T.InstancedMesh(unit,ghostMat,orderedParts.length);preview.add(previewMesh);const focusMat=new T.MeshBasicMaterial({color:0x239b91,wireframe:true,transparent:true,opacity:.95,depthWrite:false}),focusMesh=new T.InstancedMesh(unit,focusMat,orderedParts.length);preview.add(focusMesh);let renderedKey='',scaffoldCutKey='';const transform=new T.Object3D();
function copyPart(mesh,i,p){transform.position.set(p.x,p.y,p.z);transform.scale.set(p.w,p.h,p.d);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);}

const tool=new T.Group();scene.add(tool);const rod=line(tool,{x:0,y:0,z:0},{x:0,y:1,z:0},.55,mats.tool);
const roomRods=Array.from({length:4},()=>line(tool,{x:0,y:0,z:0},{x:0,y:1,z:0},.3,mats.tool));
const jaw=box(tool,{x:0,y:0,z:0,w:7,h:2,d:4},mats.steel);
function targetLabel(text){const c=document.createElement('canvas');c.width=384;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#fff5c9';ctx.beginPath();ctx.roundRect(2,2,380,92,32);ctx.fill();ctx.fillStyle='#5b4c22';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText(text,192,59);const tex=new T.CanvasTexture(c),m=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:true,transparent:true}));m.scale.set(69,17,1);scene.add(m);return m;}
const target=targetLabel('ここにつないでいくよ'),recoverTarget=targetLabel('ここを片付けるよ');

function update(state,paused=false,previewLevel=null,wallCell=null,focusFloor=null){
 if(!state)return;const scaffoldKey=focusFloor?.inside?String(focusFloor.height??focusFloor.floor):'all';if(scaffoldKey!==scaffoldCutKey){scaffoldCutKey=scaffoldKey;for(const m of site.children){const original=m.userData.roomParts;if(!original)continue;m.count=0;for(let p of original){if(focusFloor?.inside){const top=focusFloor.height??focusFloor.floor*40+32,low=p.y-p.h/2;if(low>=top)continue;if(p.y+p.h/2>top)p={...p,y:(top+low)/2,h:top-low};}copyPart(m,m.count++,p);}m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}}roomView.sync(state,focusFloor?.inside?focusFloor.floor:null);const door=entranceDoorParts(state);doorRoot.visible=door.length>0;if(door.length){const t=state.entranceDoor.open?1:0,leaf=stairPoint(state,door.at(-1),true),glass=stairPoint(state,{x:leaf.x,y:25,z:76.65}),handle=stairPoint(state,{x:leaf.x+10,y:16,z:77});doorWindow.position.set(glass.x,glass.y,glass.z);doorHandle.position.set(handle.x,handle.y,handle.z);doorWindow.rotation.y=doorHandle.rotation.y=(stairPlacement(state)?.turn??0)*Math.PI/2;}for(let i=0;i<door.length;i++){const m=doorMeshes[i],p=door[i];m.position.set(p.x,p.y,p.z);m.scale.set(p.w,p.h,p.d);}
 if(highShapeKey(state)!==layoutKey)return false;const indoor=focusFloor?.inside===true&&!focusFloor.moving,floor=indoor?focusFloor.floor:focusFloor,total=highFloors(state),partCount=levels[state.levels]?.length??0;let done=offsets[state.levels],current=null,pending=null;const taking=state.job?.type==='DISMANTLE',recovering=highIsRecovering(state);let takeTime=-1,takePlan=null;
 selectedCell.visible=previewLevel!==null&&wallCell!==null;if(selectedCell.visible)selectedCell.position.set(((wallCell%4)*16-24)*scale,(previewLevel-1)*40+18,(Math.floor(wallCell/4)*16-24)*scale);
 if(state.job?.type==='BUILD'){const plan=highJobPlan(state,'BUILD'),workTime=state.job.elapsed-highRouteSeconds(plan.route);
  if(workTime>=0){current=highAssemblyAt(state.levels+1,workTime,state);done+=current.completed;if(!current.moving&&current.completed<partCount)pending={index:done,progress:current.progress,part:current.part};}
 }
 if(taking){
  takePlan=highJobPlan(state,'DISMANTLE');takeTime=state.job.elapsed-highRouteSeconds(takePlan.route);
  if(takeTime>=0){
   const count=levels[state.levels-1].length;current=highDisassemblyAt(state.levels,Math.min(takeTime,takePlan.take),state);done-=takeTime>=takePlan.take?count:current.completed;
   if(takeTime<takePlan.take&&!current.moving&&current.completed<count)pending={index:done-1,progress:current.progress,part:current.part,reverse:true};
  }
 }
 const visibleDone=done-(pending?.reverse?1:0);
 for(let f=0;f<total;f++)for(let i=0;i<levels[f].length;i++){const v=levels[f][i],index=offsets[f]+i;v.mesh.visible=index===pending?.index;
  v.mesh.position.set(v.p.x,v.p.y,v.p.z);if(index===pending?.index){const t=pending.progress;const liftPoint=new T.Vector3(-91*scale,(taking?state.levels-1:state.levels)*40+6,56*scale),partPoint=new T.Vector3(v.p.x,v.p.y,v.p.z);v.mesh.position.lerpVectors(pending.reverse?partPoint:liftPoint,pending.reverse?liftPoint:partPoint,t);v.mesh.position.y+=Math.sin(t*Math.PI)*10;}
 }
 const key=visibleDone+'/'+state.levels+'/'+previewLevel+'/'+recovering+'/'+JSON.stringify(focusFloor)+'/'+JSON.stringify(state.roomLayout)+'/'+JSON.stringify(state.boardBayRetrofit);if(key!==renderedKey){renderedKey=key;for(const m of Object.values(completedGroups))m.count=0;previewMesh.count=0;focusMesh.count=0;
  orderedParts.forEach((source,i)=>{for(const original of wallDoorCutPart(state,source)){let p=original;if(indoor){p=roomPaintVisiblePart(p,floor,focusFloor.ceiling);if(!p)continue;}else if(focusFloor!==null){const top=focusFloor?.height??floor*40+32,low=p.y-p.h/2;if(low>=top)continue;if(p.y+p.h/2>top)p={...p,h:top-low,y:(top+low)/2};}if(previewLevel!==null){const mesh=i>=offsets[previewLevel-1]&&i<offsets[previewLevel]?focusMesh:previewMesh;copyPart(mesh,mesh.count++,p);}else if(i<visibleDone){const m=completedGroups[p.kind];copyPart(m,m.count++,p);}else if(!recovering&&i<offsets[state.levels+1]&&state.levels<total)copyPart(previewMesh,previewMesh.count++,p);}});
  for(const m of [...Object.values(completedGroups),previewMesh,focusMesh]){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}
 }bridge.visible=!!bridgeShape&&state.levels===total&&(!taking||takeTime<0)&&(floor===null||floor===total);
 const pos=highActorAt(state);
 const making=state.job?.type==='MAKE'&&state.job.elapsed>=highRouteSeconds(highJobPlan(state,'MAKE').route);
 const roomPlan=state.job?.type==='ROOM_LAYOUT_EDIT'?highJobPlan(state,state.job.type):null,kitPhase=roomKitPhase(state,roomPlan),roomWorking=roomPlan&&(roomDoorDelivery(roomPlan)?kitPhase.kind==='assemble':state.job.elapsed>=highRouteSeconds(roomPlan.route)+(roomPlan.delivery?ROOM_KIT_PICKUP_SECONDS:0));doorDeliveryView.update(state,roomPlan,pos,paused);
 roomKit.visible=!!kitPhase&&!roomDoorDelivery(roomPlan);assembling.count=0;kitGrips.forEach(m=>m.visible=false);
 if(kitPhase&&!roomDoorDelivery(roomPlan)){let k=kitPhase.kind==='fetch'?roomKitPickupBox(roomPlan,0):kitPhase.kind==='pickup'?roomKitPickupBox(roomPlan,kitPhase.progress):roomKitBox(roomPlan.item,pos);
 const remaining=kitPhase.kind==='assemble'?1-kitPhase.progress:1;roomKit.visible=remaining>1e-6;roomKit.position.set(k.x,k.y-(1-remaining)*k.h/2,k.z);roomKit.scale.set(k.w,k.h*Math.max(remaining,.0001),k.d);roomKit.rotation.y=k.angle;
 if(kitPhase.kind==='carry'||kitPhase.kind==='assemble'&&remaining>0)kitGrips.forEach((m,i)=>{const x=i?7:-7,h=pos.heading,z=10.5;m.visible=true;m.position.set(pos.x+Math.cos(h)*x+Math.sin(h)*z,pos.y+10.51,pos.z-Math.sin(h)*x+Math.cos(h)*z);m.rotation.y=h;});
 }
 if(kitPhase?.kind==='assemble'){const parts=roomItemParts(roomPlan.item),n=kitPhase.progress*parts.length;for(let i=0;i<parts.length;i++){const f=Math.min(1,Math.max(0,n-i));if(!f)continue;const p=parts[i];assembling.setColorAt(assembling.count,new T.Color(ROOM_PART_COLORS[p.kind]));copyPart(assembling,assembling.count++,{...p,y:p.y-p.h*(1-f)/2,h:p.h*f});}assembling.instanceMatrix.needsUpdate=true;if(assembling.instanceColor)assembling.instanceColor.needsUpdate=true;assembling.computeBoundingSphere();}
 tool.visible=(!!pending||making||!!roomWorking||boardBayRetrofitJobs.has(state.job?.type)&&state.job.elapsed>=highRouteSeconds(highJobPlan(state,state.job.type).route))&&!paused;
 roomRods.forEach(m=>m.visible=!!roomWorking);rod.visible=!roomWorking;
 if(tool.visible&&roomWorking){const ps=roomPlan.toolPath.map(p=>new T.Vector3(p.x,p.y,p.z)),hand=handPoint?.();if(hand)ps[0]=scene.worldToLocal(hand);roomRods.forEach((m,i)=>{const a=ps[i],b=ps[i+1],delta=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(.3,delta.length(),.3);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());});jaw.position.copy(ps.at(-1));jaw.rotation.y=Math.sin(state.job.elapsed*22)*.18;}
 else if(tool.visible){const retrofit=boardBayRetrofitJobs.has(state.job?.type)?highJobPlan(state,state.job.type).target:null;const p=retrofit?new T.Vector3(retrofit.x,retrofit.y,retrofit.z):pending?orderedLevels[pending.index].mesh.position:new T.Vector3(-94*scale,10+Math.abs(Math.sin(state.job.elapsed*12))*5,85*scale),a=new T.Vector3(pos.x,pos.y+18,pos.z),b=p.clone(),delta=b.clone().sub(a);
  rod.position.copy(a).add(b).multiplyScalar(.5);rod.scale.set(.55,delta.length(),.55);rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());jaw.position.copy(b);}
 const base=state.levels*40;
 let liftY=state.kit==='raised'?base:0,loading=0;
 if(state.job?.type==='LIFT'){const p=highJobPlan(state,'LIFT'),t=Math.max(0,state.job.elapsed-highRouteSeconds(p.route));loading=Math.min(1,t/.7);liftY=base*Math.max(0,Math.min(1,(t-.7)/(p.work-.7)));}
 if(taking){const top=(state.levels-1)*40,routeTime=highRouteSeconds(takePlan.route),downTime=takeTime-takePlan.take-highRouteSeconds(takePlan.returnRoute);liftY=takeTime<0?top*Math.min(1,state.job.elapsed/(2+top/30)):top*Math.max(0,1-Math.max(0,downTime)/takePlan.lower);}
 lift.position.y=liftY;packageGroup.visible=!!state.kit||making||(taking&&visibleDone<offsets[state.levels])||(!state.job&&recovering&&state.stock.panels>0);packageGroup.scale.setScalar(state.job?.type==='BUILD'?Math.max(.1,1-(done-offsets[state.levels])/partCount):1);
 packageGroup.position.set(-91*scale,liftY,56*scale);if(!state.job&&recovering)packageGroup.position.set(-94*scale,8,85*scale);
 if(state.kit==='made'||making)packageGroup.position.lerpVectors(new T.Vector3(-94*scale,8,85*scale),new T.Vector3(-91*scale,liftY,56*scale),loading);
 if(state.kitModelVersion===1){
  bench.children[0].position.y=8.5;for(const leg of bench.children.slice(1)){leg.scale.y=7;leg.position.y=3.5;}
  const visible=!!state.kit&&!state.craneKit&&!state.job;if(!state.job||state.craneKit)packageGroup.visible=false;crate.visible=visible;crateBands.forEach(m=>m.visible=visible);
  const made=state.kit==='made',x=made?-94*scale:-91*scale,z=made?85*scale:56*scale,y=made?10:base;crate.position.set(x,y,z);crateBands.forEach((m,i)=>m.position.set(x+(i?1:-1)*28*scale*.3,y+3,z));
 }else{crate.visible=false;crateBands.forEach(m=>m.visible=false);}
 cable.position.y=(towerHeight+10+liftY)/2;cable.scale.y=towerHeight+10-liftY;
 recoverTarget.visible=taking&&takeTime<(takePlan?.take??0);if(recoverTarget.visible){const aim=current?.part??highFloorPieces(state,state.levels)[0];recoverTarget.position.set(aim.x,state.levels*40+18,aim.z);}
 target.visible=state.levels<total&&!recovering;const nextFloor=previewLevel??Math.min(total,state.levels+1),aim=current?.part??highFloorPieces(state,nextFloor)[0];target.position.set(aim.x,nextFloor*40+18,aim.z);
}

return{update,dispose(){doorDeliveryView.dispose();roomView.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==unit&&o.geometry!==cylinder)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();});unit.dispose();cylinder.dispose();Object.values(mats).forEach(m=>m.dispose());doorGlass.dispose();ghostMat.dispose();focusMat.dispose();selectedCellMat.dispose();target.material.dispose();recoverTarget.material.dispose();}};
}

