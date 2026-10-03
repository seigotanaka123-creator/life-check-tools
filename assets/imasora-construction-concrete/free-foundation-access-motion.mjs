import * as T from '../three.module.min.js';
import {planFoundationAccess,foundationWalkHeight} from './free-foundation-access.mjs';
import {assertFoundationSupport,foundationSurfaceAt} from './free-supported-build.mjs';
import {walkPath,walkingBlocked} from './free-contact.mjs';
import {newFootingReceipt} from './free-footing.mjs';
import {createFootingGuard} from './free-footing-motion.mjs';
import {newScaffoldReceipt} from './free-frame-scaffold.mjs';
import {paintScaffoldSteps} from './free-paint-access.mjs';
import {createScaffoldMotion} from './free-scaffold-motion.mjs';
const vec=p=>new T.Vector3(p.x,p.y,p.z),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function createFoundationAccessMotion({up,p,prior,root,actor,feet,heightAt,external,box,mats,target=null}){
 const f=p.freeBuild,from={x:actor.position.x,y:actor.position.y,z:actor.position.z};
 const plan=up?planFoundationAccess(p,from,heightAt,external,target):prior.plan,stages=[],record=up?newScaffoldReceipt():prior.record,footing=up?newFootingReceipt():prior.footing;
 const base=(x,z)=>foundationSurfaceAt(p.foundation,x,z)??heightAt(x,z);
 const group=up?new T.Group():prior.group;if(up){group.name='foundation-access-operation';root.add(group);}
 const scaffold=up?createScaffoldMotion({f,root,actor,feet,record,footing,heightAt:base,external,parent:group,box,mats,name:'foundation-access-stairs'}):prior.scaffold;
 const guard=createFootingGuard({f,root,actor,feet,record:footing,heightAt});
 const walk=(route,deck=false)=>{for(let i=1;i<route.length;i++)stages.push({kind:deck?'deck':'ground',from:route[i-1],to:route[i],duration:Math.max(.12,distance(route[i-1],route[i])/48)});};
 const {up:ascent,down:descent}=paintScaffoldSteps({scaffold:plan});
 if(up){walk(plan.ground);stages.push({kind:'open',duration:.65});stages.push(...ascent);walk(plan.path,true);}
 else{walk(walkPath(f,from,plan.stance,external,(x,z)=>foundationWalkHeight(p,x,z,heightAt,plan)),true);walk([...plan.path].reverse(),true);stages.push(...descent);stages.push({kind:'close',duration:.55});}
 let index=0,t=0,started=false,done=false;const endPose=up?plan.stance:plan.entry,access={plan,record,footing,group,scaffold};
 const dispose=()=>{scaffold.dispose();root.remove(group);};
 function validate(){if(JSON.stringify(p.foundation)!==plan.foundationKey)throw Error('階段の土台が変わりました。');assertFoundationSupport(p,{heightAt,blockedAt:external});}
 function render(s,u){
  feet.forEach(e=>e.o.position.copy(e.position));
  if(s.kind==='open'){actor.position.copy(vec(plan.entry));scaffold.open(plan,u);guard.stand();return;}
  if(s.kind==='close'){actor.position.copy(vec(plan.entry));scaffold.close(plan,u);guard.stand();return;}
  if(s.kind==='climb'){scaffold.climb(s,u);return;}
  actor.position.copy(vec(s.from).lerp(vec(s.to),u));actor.rotation.set(0,Math.atan2(s.to.x-s.from.x,s.to.z-s.from.z),0);
  if(s.kind==='deck'){scaffold.walk(plan,u*Math.PI*4);if(walkingBlocked(f,actor.position.x,actor.position.z,external))throw Error('土台の通路がふさがりました。');}
  else{guard.walk();feet.forEach((e,i)=>e.o.position.y+=Math.max(0,Math.sin(u*Math.PI*4+i*Math.PI))*2.6);}
 }
 return{access,endPose,focus:{x:from.x,y:from.y+24,z:from.z},get phase(){return stages[index]?.kind==='climb'?(up?'土台の階段を上っています。':'土台の階段を下りています。'):up?'階段と踊り場を用意し、土台へ向かっています。':'階段で地上へ戻り、足場を片付けています。';},
  tick(dt){if(done)return true;validate();const s=stages[index];if(!started){t=0;started=true;render(s,0);return false;}t=Math.min(1,t+Math.min(.05,Math.max(0,dt))/s.duration);render(s,t);if(t===1){index++;started=false;if(index===stages.length){feet.forEach(e=>e.o.position.copy(e.position));actor.rotation.set(0,endPose.heading,0);if(up)scaffold.stand(plan);else guard.stand();done=true;return true;}}return false;},
  verifyFooting(){validate();if(up)scaffold.stand(plan);else guard.stand();},
  settle(success){if(!up&&success)dispose();else if(up&&!success)dispose();},cancel(){if(up)dispose();feet.forEach(e=>e.o.position.copy(e.position));done=true;}
 };
}
