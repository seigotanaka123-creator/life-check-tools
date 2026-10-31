import {polygon,polygonsOverlap} from './imasora-construction-loader-physics.js?v=120ov';
import {hasValidWorldFootprint} from './imasora-construction-world-yard-reservation.js?v=512';
import {vehicleGroundFrame,groundPoint,flatGroundWork} from './imasora-construction-vehicle-ground-frame.mjs?v=120ou';
import {actorPose,worldToLocal,transitionPoints} from './imasora-construction-loader-physics.js?v=120ov';
import {boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120pv';
const travelFrames=new WeakMap();
export function fieldGroundPose(work,origin,heightAt){const v=(work.loader??work.rig).vehicle;if(origin.x===0&&origin.z===0&&typeof heightAt?.groundFrame==='function')return heightAt.groundFrame(v);return vehicleGroundFrame(v,typeof heightAt==='function'?(x,z,reference)=>heightAt(origin.x+x,origin.z+z,reference):()=>0);}
export function fieldActorPose(rig,origin,heightAt,frame=null){
 const p=actorPose(rig);if(typeof heightAt!=='function')return p;
 if(rig.mode==='foot')return{...p,y:p.y+(heightAt(origin.x+p.x,origin.z+p.z)??0)};
 const g=frame??fieldGroundPose({rig},origin,heightAt),q=worldToLocal(rig.vehicle,p.x,p.z),position=groundPoint(g,q.x,p.y,q.z);
 return{...p,x:position[0],y:position[1],z:position[2]};
}
export function fieldWorkGroundProblem(work,origin,heightAt){try{return flatGroundWork(fieldGroundPose(work,origin,heightAt))?'':'作業するときは、平らな地面に車を停めよう。';}catch(e){return e.message;}}
export function fieldGroundBounds(g,half=[44,22,45]){const p=groundPoint(g,0,half[1],0),e=[0,1,2].map(i=>g.axes.reduce((n,a,k)=>n+Math.abs(a[i])*half[k],0));return{x:p[0],z:p[2],width:e[0]*2,depth:e[2]*2,minY:p[1]-e[1],maxY:p[1]+e[1]};}
export function fieldWorkOverlaps(origin,position,size,boxes){if(!hasValidWorldFootprint(position,size))return true;const target=polygon({x:position[0]-origin.x,z:position[2]-origin.z,heading:0},size[0],size[2]);return boxes.some(b=>polygonsOverlap(target,polygon({x:b.x,z:b.z,heading:b.angle??b.heading??0},b.width??b.w,b.depth??b.d)));}
// Authored solids, buildings and other vehicles, already in world coordinates.
// This adapter intentionally does not turn a work origin into a reserved yard.
export function fieldStaticVolumes(origin,colliders,excludePrefix){return colliders.filter(c=>!(c.id??'').startsWith(excludePrefix)&&[c.x,c.z,c.rotation??0,c.localHalfX??c.halfX,c.localHalfZ??c.halfZ].every(Number.isFinite)).map(c=>({id:c.id,name:c.id||'建物',supportSurface:/reel-.*(?:floor|ramp-.*-deck-)/.test(c.id??''),x:c.x-origin.x,z:c.z-origin.z,y:c.minY??0,w:2*(c.localHalfX??c.halfX),d:2*(c.localHalfZ??c.halfZ),h:(c.maxY??c.obstacleHeight??100)-(c.minY??0),angle:c.rotation??0})).filter(b=>b.h>0);}
// The old level-ground vehicles may travel on the unified level field, but may
// not silently float over holes, climb unfinished works, or tunnel into hills.
export function fieldGroundTravelAllowed(before,next,origin,heightAt,solids=[]){
 if(typeof heightAt!=='function')return true;const a=before.loader??before.rig,b=next.loader??next.rig;
 const vehicleMoved=Math.hypot(b.vehicle.x-a.vehicle.x,b.vehicle.z-a.vehicle.z)>1e-6||Math.abs(b.vehicle.heading-a.vehicle.heading)>1e-6||Math.abs((b.vehicle.steering??0)-(a.vehicle.steering??0))>1e-6;
 if(vehicleMoved){
  const delta=Math.atan2(Math.sin(b.vehicle.heading-a.vehicle.heading),Math.cos(b.vehicle.heading-a.vehicle.heading));
  const steps=Math.max(1,Math.ceil(Math.hypot(b.vehicle.x-a.vehicle.x,b.vehicle.z-a.vehicle.z)),Math.ceil(Math.abs(delta)/.01));
  let support=a.vehicle.groundY,lastFrame;try{support??=fieldGroundPose(before,origin,heightAt).position[1];}catch{return false;}for(let i=1;i<=steps;i++){
   const t=i/steps,v={x:a.vehicle.x+(b.vehicle.x-a.vehicle.x)*t,z:a.vehicle.z+(b.vehicle.z-a.vehicle.z)*t,heading:a.vehicle.heading+delta*t,groundY:a.vehicle.groundY??0};
   v.groundY=support;v.steering=(a.vehicle.steering??0)+((b.vehicle.steering??0)-(a.vehicle.steering??0))*t;
   try{const g=fieldGroundPose({rig:{vehicle:v}},origin,heightAt),body={position:groundPoint(g,0,b.vehicle.waterTruck?29:24,0),half:[34,b.vehicle.waterTruck?27:22,b.vehicle.waterTruck?46:43],axes:g.axes};
    if(Math.abs(g.position[1]-support)>2.1||solids.some(o=>o.y+o.h>g.position[1]+.15&&boxesOverlap3D(body,{position:[o.x,o.y+o.h/2,o.z],half:[o.w/2,o.h/2,o.d/2],heading:o.angle??0})))return false;support=g.position[1];lastFrame=g;
   }catch{return false;}
  }
  if(lastFrame)travelFrames.set(next,{heightAt,x:origin.x,z:origin.z,vehicle:JSON.stringify(b.vehicle),frame:lastFrame});
 }
 if(a.mode==='foot'&&b.mode==='foot'&&Math.hypot(a.player.x-b.player.x,a.player.z-b.player.z)>1e-6){const p=b.player,base=heightAt(origin.x+a.player.x,origin.z+a.player.z);for(const [dx,dz] of [[0,0],[-14,0],[14,0],[0,-14],[0,14]]){const h=heightAt(origin.x+p.x+dx,origin.z+p.z+dz);if(!Number.isFinite(h)||!Number.isFinite(base)||Math.abs(h-base)>3.1)return false;}const h=heightAt(origin.x+p.x,origin.z+p.z);if(solids.some(o=>o.y+o.h>h+.1&&boxesOverlap3D({position:[p.x,h+p.y+14,p.z],half:[14,14,14],heading:0},{position:[o.x,o.y+o.h/2,o.z],half:[o.w/2,o.h/2,o.d/2],heading:o.angle??0})))return false;}
 return true;
}

export function fieldRememberGround(work,origin,heightAt,before=null){const key=work.loader?'loader':'rig',rig=work[key];if(!rig?.vehicle.field||typeof heightAt!=='function')return work;const prior=(before?.loader??before?.rig)?.vehicle;if(prior&&Number.isFinite(prior.groundY)&&['x','z','heading','steering','groundY'].every(k=>prior[k]===rig.vehicle[k]))return work;const proof=travelFrames.get(work),g=proof?.heightAt===heightAt&&proof.x===origin.x&&proof.z===origin.z&&proof.vehicle===JSON.stringify(rig.vehicle)?proof.frame:fieldGroundPose(work,origin,heightAt),groundY=g.position[1];if(groundY===rig.vehicle.groundY)return work;return{...work,[key]:{...rig,vehicle:{...rig.vehicle,groundY}}};}

// A narrow driving bridge is not automatically a safe place to disembark.
// Check the actual chosen side, including the monster's whole footing.
export function fieldExitSafe(work,origin,heightAt,side){
 const rig=work.loader??work.rig,v=rig?.vehicle;
 if(!v?.field||typeof heightAt!=='function')return true;
 if(![-1,1].includes(side))return false;
 try{const end=transitionPoints(v,side,false).at(-1),local=worldToLocal(v,end.x,end.z),g=fieldGroundPose(work,origin,heightAt),p=groundPoint(g,local.x,0,local.z);
  return[[0,0],[-14,0],[14,0],[0,-14],[0,14]].every(([dx,dz])=>{const h=heightAt(origin.x+p[0]+dx,origin.z+p[2]+dz,v.groundY??g.position[1]);return Number.isFinite(h)&&Math.abs(h-p[1])<=3.1;});
 }catch{return false;}
}
