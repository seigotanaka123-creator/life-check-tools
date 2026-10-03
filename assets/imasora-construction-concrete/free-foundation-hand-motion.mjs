import * as T from '../three.module.min.js';
import {foundationGrip,foundationHandPlan,foundationHandPlanSteps,FOUNDATION_HAND_REACH} from './free-foundation-hand-plan.mjs';
import {assertFoundationEnvironment,newFoundationReceipt,assertFoundationReceipt} from './free-foundation-operation.mjs';
import {newFootingReceipt,newToolWalkingReceipt} from './free-footing.mjs';
import {createFootingGuard} from './free-footing-motion.mjs';
import {frameBlocked,frameSegmentBlocked,frameLocal} from './free-frames.mjs';
import {createScaffoldMotion} from './free-scaffold-motion.mjs';
import {newScaffoldReceipt} from './free-frame-scaffold.mjs';
import {foundationWorkSurface,foundationWorkSupport} from './free-foundation-work-scaffold.mjs';
const vec=p=>new T.Vector3(p.x,p.y??0,p.z);
export function createFoundationHandMotion({p,a,root,actor,model,hands,feet,tools,mats,line,environment,installedFoundation,preparedPlan=null}){
 const env={heightAt:(...q)=>environment().heightAt(...q),blockedAt:(...q)=>environment().blockedAt(...q)},start={...actor.position,heading:actor.rotation.y};root.updateMatrixWorld(true);
 const bases=hands.map(h=>actor.worldToLocal(h.o.getWorldPosition(new T.Vector3()))),plan=preparedPlan??foundationHandPlan(p,a,start,bases,env),f=p.freeBuild,remove=a.type==='FREE_FOUNDATION_REMOVE';assertFoundationEnvironment(p,a,{...env,foot:start});
 const receipt=newFoundationReceipt(p,a);receipt.manual={version:1,ground:newToolWalkingReceipt(),maxGripError:0,maxHandReach:0,maxHitError:0,items:plan.order.map(q=>({id:q.id,pickup:0,carry:0,placed:0,hits:[false,false]}))};
 const r=receipt.manual;if(plan.scaffoldPlans.length){r.version=2;r.scaffold=newScaffoldReceipt();r.scaffoldParts=plan.scaffoldPlans;}
 const savedHands=hands.map(h=>h.o.position.clone()),initial={position:model.position.clone(),scale:model.scale.clone(),rotation:model.quaternion.clone()},staged=new T.Group();staged.name='foundation-operation';root.add(staged);
 const unit=new T.BoxGeometry(1,1,1),meshes=new Map(),visible=installedFoundation.visible;installedFoundation.visible=false;
 function box(parent,x,y,z,w,h,d,mat,name=''){const m=new T.Mesh(unit,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.name=name;parent.add(m);return m;}
 const rackY=plan.endPose.y;
 function rackPose(part,index){return{x:0,y:rackY+2+part.height/2+(part.id.startsWith('plank')?index*.025:0),z:140,heading:0};}
 for(const [i,part]of plan.order.entries()){const group=new T.Group();group.name='working-foundation:'+part.id;staged.add(group);box(group,0,0,0,part.width,part.height,part.depth,mats.wood,'material');for(let h=0;h<2;h++){const grip=foundationGrip(part,h);box(group,grip.x,part.height/2+.08,grip.z,.4,.16,.4,mats.metal,'clamp-'+h).visible=remove;}group.position.copy(vec(remove?part:rackPose(part,i)));meshes.set(part.id,group);}
 let footing=createFootingGuard({f,root,actor,feet,record:{...newFootingReceipt(),walking:r.ground},heightAt:env.heightAt,includeCured:true});
 const platform=plan.scaffoldPlans.length?createScaffoldMotion({f,root,actor,feet,record:r.scaffold,footing:newFootingReceipt(),heightAt:env.heightAt,external:env.blockedAt,parent:staged,box,mats,name:'foundation-work-scaffold',surfaceAt:foundationWorkSurface,supportAt:foundationWorkSupport}):null;
 let index=0,t=0,started=false,done=false,cleaned=false,phase=0;
 const reset=()=>{feet.forEach(e=>e.o.position.copy(e.position));hands.forEach((h,i)=>h.o.position.copy(savedHands[i]));};
 const pose=(o,q)=>{o.position.copy(vec(q));o.rotation.set(0,q.heading??0,0);};
 function local(o,q){root.updateMatrixWorld(true);return root.worldToLocal(o.localToWorld(vec(q)));}
 function hold(i,q){root.updateMatrixWorld(true);const desired=root.localToWorld(vec(q)),base=actor.localToWorld(bases[i].clone());r.maxHandReach=Math.max(r.maxHandReach,base.distanceTo(desired));if(r.maxHandReach>FOUNDATION_HAND_REACH+1e-5)throw Error('板や固定部に手が届かないため土台の作業を止めました。');const h=hands[i].o;h.position.copy(h.parent.worldToLocal(desired.clone()));root.updateMatrixWorld(true);r.maxGripError=Math.max(r.maxGripError,h.getWorldPosition(new T.Vector3()).distanceTo(desired));}
 const holdPart=(part,o)=>{for(let i=0;i<2;i++)hold(i,local(o,foundationGrip(part,i)));};
 function carryPose(part){const grip=foundationGrip(part,0);return{...frameLocal({...actor.position,heading:actor.rotation.y},{x:0,y:13-grip.y,z:13-grip.z}),heading:actor.rotation.y};}
 function transfer(part,o,from,to,u){const position=vec(from),high=Math.max(from.y,to.y)+4;
  if(u<.25)position.y=from.y+(high-from.y)*u*4;else if(u<=.75){position.lerp(vec(to),(u-.25)*2);position.y=high;}else{position.copy(vec(to));position.y=high+(to.y-high)*(u-.75)*4;}
  o.position.copy(position);const q1=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),from.heading??0),q2=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),to.heading??0);o.quaternion.copy(q1).slerp(q2,Math.max(0,Math.min(1,(u-.25)*2)));holdPart(part,o);
 }
 function clearMaterial(o){if(!platform||!o)return;root.updateMatrixWorld(true);const material=new T.Box3().setFromObject(o.getObjectByName('material'));staged.getObjectByName('foundation-work-scaffold').traverse(q=>{if(!q.isMesh)return;const b=new T.Box3().setFromObject(q);if(Math.min(material.max.x,b.max.x)-Math.max(material.min.x,b.min.x)>1e-5&&Math.min(material.max.y,b.max.y)-Math.max(material.min.y,b.min.y)>1e-5&&Math.min(material.max.z,b.max.z)-Math.max(material.min.z,b.min.z)>1e-5)throw Error('運ぶ部材と作業足場が重なるため止めました。',{cause:{part:o.name,obstacle:q.name,material:material.toArray?.()}});});}
 const carryOnStep=(s,o,item)=>{if(s.carrying){pose(o,carryPose(s.part));holdPart(s.part,o);item.carry++;clearMaterial(o);}};
 function render(s,u){reset();tools.clear();assertFoundationEnvironment(p,a,{...environment(),foot:start});
  if(frameBlocked(f,[],actor.position,env.blockedAt,20))throw Error('土台の作業通路に障害物があるため止めました。');
  const part=s.part,o=part&&meshes.get(part.id),item=part&&r.items.find(q=>q.id===part.id);
  if(s.kind==='climb'){platform.climb(s,u);carryOnStep(s,o,item);return;}
  if(s.kind==='open'||s.kind==='close'){actor.position.copy(vec(s.stance));actor.rotation.set(0,s.stance.heading,0);footing=createFootingGuard({f,root,actor,feet,record:{...newFootingReceipt(),walking:r.ground},heightAt:env.heightAt,includeCured:true});footing.walk(0);platform[s.kind](s.scaffold,u);carryOnStep(s,o,item);return;}
  if(s.kind==='walk'){const from={x:actor.position.x,z:actor.position.z};actor.position.copy(vec(s.from).lerp(vec(s.to),u));const d=vec(s.to).sub(vec(s.from));actor.rotation.set(0,Math.atan2(d.x,d.z),0);
   if(frameSegmentBlocked(f,s.scaffold?[part]:[],from,actor.position,s.scaffold?env.blockedAt:(x,z,m)=>env.blockedAt(x,z,m)||plan.groundBlocked(x,z,m),20))throw Error('土台の板を運ぶ通路がふさがりました。');
   if(s.scaffold)platform.walk(s.scaffold,phase);else footing.walk(phase);
   carryOnStep(s,o,item);return;
  }
  actor.position.copy(vec(s.stance));actor.rotation.set(0,s.stance.heading,0);
  if(s.scaffold)platform.stand(s.scaffold);else{footing=createFootingGuard({f,root,actor,feet,record:{...newFootingReceipt(),walking:r.ground},heightAt:env.heightAt,includeCured:true});footing.walk(0);}
  const target={...part,heading:0},carry=carryPose(part),rack=rackPose(part,s.index);
  if(s.kind==='pickup'||s.kind==='lift'){transfer(part,o,s.kind==='pickup'?rack:target,carry,u);item.pickup++;}
  else if(s.kind==='place'||s.kind==='putaway'){const to=s.kind==='place'?target:rack;transfer(part,o,carry,to,u);item.placed++;if(u===1)receipt.maxPlacementError=Math.max(receipt.maxPlacementError,o.position.distanceTo(vec(to)),Math.abs(o.quaternion.angleTo(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),to.heading))));}
  else{pose(o,target);const g=foundationGrip(part,s.hit),hit=local(o,{...g,y:part.height/2+.16}),lift=4*(1-u),head=box(tools,hit.x,hit.y+.5+lift,hit.z,1,1,1,mats.metal,'foundation-mallet');const distance=Math.hypot(actor.position.x-hit.x,actor.position.z-hit.z)||1,grip={x:hit.x+(actor.position.x-hit.x)*3/distance,y:hit.y+3+lift,z:hit.z+(actor.position.z-hit.z)*3/distance};hold(s.hit,grip);hold(1-s.hit,local(o,foundationGrip(part,1-s.hit)));line(tools,grip,{x:hit.x,y:hit.y+1+lift,z:hit.z},.2,mats.wood);if(u===1){r.maxHitError=Math.max(r.maxHitError,local(head,{x:0,y:-.5,z:0}).distanceTo(hit));item.hits[s.hit]=true;o.getObjectByName('clamp-'+s.hit).visible=!remove;}}
  clearMaterial(o);receipt.samples++;receipt.min=0;receipt.terrainSamples+=a.type==='FREE_FOUNDATION_BUILD'?plan.s.bottoms.length:0;
 }
 function cleanup(){if(cleaned)return;cleaned=true;reset();platform?.dispose();root.remove(staged);tools.clear();unit.dispose();installedFoundation.visible=visible;}
 return{endPose:plan.endPose,receipt,get phase(){const s=plan.steps[index];return s?`土台 ${plan.order.findIndex(q=>q.id===s.part?.id)+1}/${plan.order.length}部材｜${({walk:s.carrying?'板を運んでいます':'次の位置へ歩いています',climb:s.ascending?'足場に上っています':'地面へ降りています',open:'作業足場を広げています',close:'作業足場を片付けています',pickup:'部材を持ち上げています',place:'部材を据え付けています',hammer:'木槌で固定しています',unlock:'固定を外しています',lift:'部材を取り外しています',putaway:'部材を資材置き場へ戻しています'})[s.kind]}。`:'土台の作業を保存しています。';},
  verifyFooting(){assertFoundationEnvironment(p,a,{...environment(),foot:{...actor.position}});footing.walk(0);},
  tick(dt){if(done)return true;if(!Number.isFinite(dt)||dt<=0)throw Error('土台の動作時間を確認できません。');if(model.position.distanceTo(initial.position)>1e-5||model.scale.distanceTo(initial.scale)>1e-5||model.quaternion.angleTo(initial.rotation)>1e-5)throw Error('キャラクターの位置が変わったため土台の作業を止めました。');const delta=Math.min(.05,dt),s=plan.steps[index];phase+=delta*10;if(!started){started=true;t=0;render(s,0);return false;}t=Math.min(1,t+delta/s.duration);render(s,t);if(t===1){index++;started=false;if(index===plan.steps.length){reset();receipt.parts=plan.parts.length;receipt.max=1;assertFoundationReceipt(p,a,p.revision,receipt,true);done=true;return true;}}return false;},cancel(){done=true;cleanup();},settle(){cleanup();}};
}
export function createDeferredFoundationHandMotion(args){
 const {p,a,root,actor,hands,environment}=args,start={...actor.position,heading:actor.rotation.y},env={heightAt:(...q)=>environment().heightAt(...q),blockedAt:(...q)=>environment().blockedAt(...q)};root.updateMatrixWorld(true);assertFoundationEnvironment(p,a,{...env,foot:start});
 const bases=hands.map(h=>actor.worldToLocal(h.o.getWorldPosition(new T.Vector3()))),iterator=foundationHandPlanSteps(p,a,start,bases,env);let motion=null,progress={part:0,total:0},cancelled=false;
 return{get phase(){return motion?.phase??`土台の通路と足場を確認しています ${progress.part}${progress.total?'/'+progress.total:''}。`;},get endPose(){return motion?.endPose??null;},get receipt(){return motion?.receipt??null;},verifyFooting(){if(!motion)throw Error('土台の準備が終わっていません。');motion.verifyFooting();},tick(dt){if(cancelled)return false;if(motion)return motion.tick(dt);const step=iterator.next();if(step.done)motion=createFoundationHandMotion({...args,preparedPlan:step.value});else progress=step.value;return false;},cancel(){cancelled=true;iterator.return();motion?.cancel();},settle(){motion?.settle();}};
}
