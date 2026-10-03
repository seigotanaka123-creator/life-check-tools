import {constructionBase,preparedFrameBuild,frameAssembly,RAISED_FRAME_ACTION} from './free-supported-build.mjs';
import {footingAt} from './free-footing.mjs';
import * as T from '../three.module.min.js';
import {newFreeReceipt,assertFreeReceipt} from './free-contact.mjs';
import {framePlan,frameLocal,assertFrameFoundation,frameSegmentBlocked,FRAME_HAND_REACH,FRAME_TOOL_REACH,FRAME_GRIP_SPAN,FRAME_RACK} from './free-frames.mjs';

import {createFootingGuard} from './free-footing-motion.mjs';
import {createScaffoldMotion} from './free-scaffold-motion.mjs';
import {fixedWorkPlatform} from './free-fixed-work-platform.mjs';
import {frameWorkBoxes,frameWorkspaceBlocked} from './free-frame-workspace.mjs';

const vec=p=>new T.Vector3(p.x,p.y??0,p.z);
export const frameRackPose=(rank,base=0)=>({x:FRAME_RACK.x,y:base+2+(rank+.5)*.45,z:FRAME_RACK.z,heading:0,tilt:-Math.PI/2});
function rotation(p){return new T.Quaternion().setFromEuler(new T.Euler(p.tilt??0,p.heading??0,0,'YXZ'));}
export function createFreeFrameMotion({a,p,root,actor,model,hands,feet,tools,mats,line,external,supportHeightAt=()=>0,sharedPlatform=null}){
 const f=preparedFrameBuild(p,a),remove=!frameAssembly(a),receipt=newFreeReceipt(a,p),savedHands=hands.map(h=>h.o.position.clone());root.updateMatrixWorld(true);
 assertFrameFoundation(f,supportHeightAt);if(!footingAt(f,0,116,supportHeightAt,true))throw Error('資材置き場の足元を平らにしてください。');
 if(sharedPlatform)external=sharedPlatform.routeExternal(f,supportHeightAt,external);
 const bases=hands.map(h=>actor.worldToLocal(h.o.getWorldPosition(new T.Vector3()))),start={x:actor.position.x,y:actor.position.y,z:actor.position.z,heading:actor.rotation.y};
 // Prove every route before hiding a single existing board or allocating animation objects.
 const plan=framePlan(f,a.type,start,bases,external,supportHeightAt,sharedPlatform?.visible?(panel,blocked,at)=>sharedPlatform.frameChoice(f,panel,blocked,at):null),platforms=[...new Set(plan.steps.map(s=>s.scaffold).filter(Boolean))],fixedPlan=platforms.length?(sharedPlatform?.prepare(platforms,f,supportHeightAt,external,plan.steps)??fixedWorkPlatform(platforms,f,supportHeightAt,external)):null,workBoxes=frameWorkBoxes(f),initial={position:model.position.clone(),scale:model.scale.clone(),rotation:model.quaternion.clone()},staged=new T.Group();staged.name='free-frame-operation';root.add(staged);
 const unit=new T.BoxGeometry(1,1,1),boards=new Map(),originals=[];
 root.traverse(o=>{if(o!==staged&&(o.name.startsWith('free-frame:')||o.name==='free-frame-rack'))originals.push({o,visible:o.visible});});originals.forEach(({o})=>o.visible=false);
 function box(parent,x,y,z,w,h,d,material,name){const m=new T.Mesh(unit,material);m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;parent.add(m);return m;}
 const rackBase=footingAt(f,0,116,supportHeightAt,true).height;box(staged,0,rackBase+1,FRAME_RACK.z,22,2,12,mats.dark,'frame-rack-base');
 function setPose(board,pose){board.position.copy(vec(pose));board.quaternion.copy(rotation(pose));}
 for(let i=0;i<plan.order.length;i++){
  const panel=plan.order[i],board=new T.Group();board.name='working-frame:'+panel.id;staged.add(board);box(board,0,0,0,16,f.height,.35,mats.wood,'frame-board');
  for(let hit=0;hit<2;hit++)box(board,hit?6:-6,f.height/2+.2,-.4,1.2,.4,1.2,mats.metal,'frame-fastener-'+hit).visible=remove;
  setPose(board,remove?{...panel,y:constructionBase(f)+f.height/2,heading:panel.depth>panel.width?Math.PI/2:0}:frameRackPose(plan.order.length-1-i,rackBase));boards.set(panel.id,board);
 }
 const groundGuard=()=>createFootingGuard({f,root,actor,feet,record:receipt.footing,heightAt:supportHeightAt,includeCured:true});
 let footing=groundGuard();
 const scaffold=remove||a.type===RAISED_FRAME_ACTION?createScaffoldMotion({f,root,actor,feet,record:receipt.scaffold,footing:receipt.footing,heightAt:supportHeightAt,external,parent:staged,box,mats,fixedPlan,sharedPlatform}):null;
 let index=0,t=0,started=false,done=false,cleaned=false,phase=0;const focus={x:0,y:12,z:70};
 const reset=()=>{feet.forEach(e=>e.o.position.copy(e.position));hands.forEach((h,i)=>h.o.position.copy(savedHands[i]));};
 function actualLocal(o,point){root.updateMatrixWorld(true);return root.worldToLocal(o.localToWorld(vec(point)));}
 function carryPose(stance){return{...frameLocal(stance,{x:0,y:13,z:13}),heading:stance.heading};}
 function hold(index,point){
  root.updateMatrixWorld(true);const desired=root.localToWorld(vec(point)),base=actor.localToWorld(bases[index].clone());receipt.maxHandReach=Math.max(receipt.maxHandReach,base.distanceTo(desired));
  if(receipt.maxHandReach>FRAME_HAND_REACH+1e-5)throw Error('板や固定部へ手が届かないため作業を止めました。');
  const h=hands[index].o;h.position.copy(h.parent.worldToLocal(desired.clone()));root.updateMatrixWorld(true);receipt.maxGripError=Math.max(receipt.maxGripError,h.getWorldPosition(new T.Vector3()).distanceTo(desired));
 }
 function longTool(end,stance,name){
  const start=frameLocal(stance,{x:0,y:10,z:10}),grips=[-6,6].map(x=>frameLocal(stance,{x,y:10,z:10})),length=vec(start).distanceTo(vec(end));
  if(length>FRAME_TOOL_REACH+1e-6)throw Error('伸縮工具が届かないため作業を止めました。');
  receipt.tool.samples++;receipt.tool.maxLength=Math.max(receipt.tool.maxLength,length);
  for(let i=0;i<2;i++)hold(i,grips[i]);line(tools,grips[0],grips[1],.55,mats.dark);
  const group=new T.Group();group.name=name;tools.add(group);
  for(let i=0;i<3;i++)line(group,vec(start).lerp(vec(end),i/3),vec(start).lerp(vec(end),(i+1)/3),.48-i*.1,mats.metal);
  const tip=box(group,end.x,end.y,end.z,.75,.75,.75,mats.dark,'tool-contact');root.updateMatrixWorld(true);receipt.tool.maxContactError=Math.max(receipt.tool.maxContactError,actualLocal(tip,{x:0,y:0,z:0}).distanceTo(vec(end)));
  return group;
 }
 function holdBoard(board,useTool=false,stance=null){
  if(!useTool){for(let i=0;i<2;i++)hold(i,actualLocal(board,{x:i?FRAME_GRIP_SPAN:-FRAME_GRIP_SPAN,y:0,z:-.2}));return;}
  const end=actualLocal(board,{x:0,y:f.height/2+.8,z:-.4}),group=longTool(end,stance,'frame-placement-clamp');
  for(const x of [-6,6]){const top=actualLocal(board,{x,y:f.height/2+.8,z:-.4}),jaw=actualLocal(board,{x,y:f.height/2-.2,z:-.4});line(group,end,top,.32,mats.metal);line(group,top,jaw,.35,mats.dark);}
 }
 function transfer(board,from,to,progress,useTool=false,stance=null){
  const high=Math.max(from.y+(from.tilt?f.height/2+1:0),to.y+(to.tilt?f.height/2+1:0),f.height*1.5+1,13),position=vec(from);
  if(progress<.25)position.y=from.y+(high-from.y)*progress*4;
  else if(progress<=.75){position.lerp(vec(to),(progress-.25)*2);position.y=high;}
  else{position.copy(vec(to));position.y=high+(to.y-high)*(progress-.75)*4;}
  board.position.copy(position);board.quaternion.copy(rotation(from)).slerp(rotation(to),Math.max(0,Math.min(1,(progress-.25)*2)));holdBoard(board,useTool,stance);
 }
 function verifySeat(board,pose){root.updateMatrixWorld(true);const error=board.position.distanceTo(vec(pose)),q=1-Math.abs(board.quaternion.dot(rotation(pose)));receipt.maxPlacementError=Math.max(receipt.maxPlacementError,error,Math.abs(q));}
 function render(s,progress){
  const record=receipt.panels.find(r=>r.id===s.panel.id),board=boards.get(s.panel.id);tools.clear();reset();assertFrameFoundation(f,supportHeightAt,[s.panel]);scaffold?.verify();
  if(s.kind==='climb'){scaffold.climb(s,progress);if(s.carrying){setPose(board,carryPose({...actor.position,heading:actor.rotation.y}));holdBoard(board);record.carrySamples++;}return;}
  if(s.kind==='walk'){
   const from={x:actor.position.x,z:actor.position.z};actor.position.copy(vec(s.from).lerp(vec(s.to),progress));const d=vec(s.to).sub(vec(s.from));if(d.length()>.001)actor.rotation.y=Math.atan2(d.x,d.z);if(!s.scaffold)footing.walk(phase);
   const pathExternal=s.scaffold?(x,z,margin)=>external(x,z,margin,s.scaffold.height)||frameWorkspaceBlocked(workBoxes,{x:x-f.location.x,z:z-f.location.z}):external;
   if(frameSegmentBlocked(f,s.obstacles,from,actor.position,pathExternal,s.carrying?20:14))throw Error('板を運ぶ通路がふさがったため止めました。',{cause:{from,point:{x:actor.position.x,y:actor.position.y,z:actor.position.z},carrying:s.carrying,obstacles:s.obstacles,external:pathExternal(f.location.x+actor.position.x,f.location.z+actor.position.z,s.carrying?20:14)}});
   if(s.scaffold)scaffold.walk(s.scaffold,phase);
   if(s.carrying){setPose(board,carryPose({...actor.position,heading:actor.rotation.y}));holdBoard(board);record.carrySamples++;}
   Object.assign(focus,{x:actor.position.x,y:12,z:actor.position.z});return;
  }
  actor.position.copy(vec(s.stance));actor.rotation.set(0,s.stance.heading,0);
  if(s.kind==='scaffold-open'||s.kind==='scaffold-close'){
   footing=groundGuard();footing.stand();scaffold[s.kind==='scaffold-open'?'open':'close'](s.scaffold,progress);
   if(s.carrying){setPose(board,carryPose(s.stance));holdBoard(board);}return;
  }
  if(s.scaffold)scaffold.stand(s.scaffold);else footing.stand();Object.assign(focus,{x:board.position.x,y:8,z:board.position.z});
  const carry=carryPose(s.stance),rack=frameRackPose(remove?s.index:s.total-1-s.index,rackBase);
  if(s.kind==='pickup'||s.kind==='lift'){
   transfer(board,s.kind==='pickup'?rack:s.target,carry,progress,s.kind==='lift'&&s.useTool,s.stance);record.graspSamples++;record.min=Math.min(record.min,progress);
  }else if(s.kind==='place'||s.kind==='putaway'){
   const target=s.kind==='place'?s.target:rack;transfer(board,carry,target,progress,s.kind==='place'&&s.useTool,s.stance);record.seatSamples++;record.max=Math.max(record.max,progress);if(s.kind==='putaway')record.returnedSamples++;
   if(progress===1)verifySeat(board,target);
  }else{
   // A measured mallet strike fixes each of the two clamps; removal releases them.
   setPose(board,s.target);const hit=actualLocal(board,{x:s.hit?6:-6,y:f.height/2+.4,z:-.4}),lift=4*(1-progress),head=box(tools,hit.x,hit.y+.5+lift,hit.z,2,1,1.5,mats.wood,'frame-mallet');
   const grip={x:hit.x-Math.sin(s.stance.heading)*4,y:hit.y+4+lift,z:hit.z-Math.cos(s.stance.heading)*4};if(s.useTool)longTool({x:hit.x,y:hit.y+1+lift,z:hit.z},s.stance,'frame-long-fastener-tool');else{hold(1-s.hit,actualLocal(board,{x:s.hit?-FRAME_GRIP_SPAN:FRAME_GRIP_SPAN,y:0,z:-.2}));hold(s.hit,grip);line(tools,grip,{x:hit.x,y:hit.y+1+lift,z:hit.z},.25,mats.wood);}
   if(progress===1){receipt.maxHitError=Math.max(receipt.maxHitError,actualLocal(head,{x:0,y:-.5,z:0}).distanceTo(hit));record.hits[s.hit]=true;board.getObjectByName('frame-fastener-'+s.hit).visible=!remove;}
  }
 }
 function cleanup(){if(cleaned)return;cleaned=true;reset();scaffold?.dispose();originals.forEach(({o,visible})=>o.visible=visible);root.remove(staged);tools.clear();unit.dispose();}
 return{focus,verifyFooting(){assertFrameFoundation(f,supportHeightAt);footing.stand();},cameraDistance:105,cameraHeight:85,endPose:plan.endPose,get receipt(){return receipt;},get phase(){const s=plan.steps[index];if(!s)return'材料と作業を保存しています。';const n=(s.index??plan.order.findIndex(p=>p.id===s.panel.id))+1;const phase={walk:s.carrying?'板を運んでいます':'次の作業位置へ歩いています',climb:s.ascending?'足場の階段を上っています':'足場の階段を下りています','scaffold-open':'作業台の足元を確認しています','scaffold-close':'地上で次の作業を準備しています',pickup:'板を持ち上げています',place:'板を据え付けています',hammer:'固定部を木槌で打っています',unlock:'固定を外しています',lift:'床を残して板を持ち上げています',putaway:'板を資材置き場へ戻しています'}[s.kind];return`型枠 ${n}/${plan.order.length}枚｜${phase}。`;},
  tick(dt){if(done)return true;if(model.position.distanceTo(initial.position)>1e-5||model.scale.distanceTo(initial.scale)>1e-5||model.quaternion.angleTo(initial.rotation)>1e-5)throw Error('キャラクターの位置が変わったため作業を止めました。');const delta=Math.min(.05,Math.max(0,dt));phase+=delta*10;const s=plan.steps[index];if(!started){started=true;t=0;render(s,0);return false;}t=Math.min(1,t+delta/s.duration);render(s,t);if(t===1){index++;started=false;if(index===plan.steps.length){reset();assertFreeReceipt(a,p,p.revision,receipt);done=true;return true;}}return false;},
  settle(){cleanup();},cancel(){done=true;cleanup();}
 };
}
