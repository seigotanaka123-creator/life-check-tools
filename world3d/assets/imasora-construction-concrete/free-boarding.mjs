import {atDriverDoor} from '../imasora-construction-boarding.js';
import {vehiclePoint,walkingBlocked} from './free-contact.mjs';
import * as T from '../three.module.min.js';
import {vehicleGroundPose} from './free-vehicle-ground.mjs';
import {walkingGroundAt,walkingGroundSegment,WALK_GROUND_MESSAGE} from './free-walking-ground.mjs';
export const concreteDoor=(v,f=null,heightAt=()=>0)=>f?boardingAccess(f,v,heightAt).door:vehiclePoint(v,{x:v.legs?-56:-50,y:0,z:21});
export function boardingAccess(f,v,heightAt=()=>0){
 const ground=vehicleGroundPose(f,v,heightAt),point=p=>{if(ground.slope<1e-12){const q=vehiclePoint(v,p);return{...q,y:(p.y??0)+ground.position.y};}const q=new T.Vector3(p.x,p.y??0,p.z).applyQuaternion(ground.rotation).add(ground.position);return{x:q.x,y:q.y,z:q.z};};
 const door=point({x:(v.legs?-56:-50)-ground.padX,y:0,z:21}),support=walkingGroundAt(f,door.x,door.z,heightAt);
 if(!support)throw Error(WALK_GROUND_MESSAGE);door.y=support.height;
 return{ground,door,support,point,steps:[door,point({x:-42,y:10,z:21}),point({x:-34,y:19,z:21}),point({x:-15,y:19,z:21})]};
}
const pathIssue=(f,name,access,external,heightAt)=>{
 const {door,steps}=access;if(walkingBlocked(f,door.x,door.z,external,null,heightAt))return 'ドア前の通路を空けてください。';
 for(let i=1;i<steps.length;i++){const n=Math.max(1,Math.ceil(Math.hypot(steps[i].x-steps[i-1].x,steps[i].z-steps[i-1].z)));for(let j=0;j<=n;j++){const t=j/n,x=steps[i-1].x+(steps[i].x-steps[i-1].x)*t,z=steps[i-1].z+(steps[i].z-steps[i-1].z)*t;if(walkingBlocked(f,x,z,external,name,heightAt))return '乗降口がほかの車両や型枠と重なっています。';}}
 return '';
};
// The painted zone may be partly obstructed. Use a supported landing inside
// that same driver-door zone; never expand it or bypass pedestrian clearance.
export function resolveBoardingAccess(f,name,external=()=>false,heightAt=()=>0,preferred=null){
 const v=f[name],base=boardingAccess(f,v,heightAt),issue=pathIssue(f,name,base,external,heightAt);if(!issue)return base;
 const candidates=[];if(preferred&&atDriverDoor(preferred,base.door,v.heading))candidates.push(preferred);
 for(const [x,z]of [[2,0],[-2,0],[0,4],[0,-4],[2,4],[2,-4],[-2,4],[-2,-4]])candidates.push(vehiclePoint({...base.door,heading:v.heading},{x,z}));
 for(const p of candidates){
  const support=walkingGroundAt(f,p.x,p.z,heightAt);if(!support)continue;
  const door={x:p.x,y:support.height,z:p.z};if(!atDriverDoor(door,base.door,v.heading))continue;
  const access={...base,door,support,steps:[door,...base.steps.slice(1)]};if(!pathIssue(f,name,access,external,heightAt))return access;
 }
 throw Error(issue);
}
export function boardingPathProblem(f,name,external=()=>false,heightAt=()=>0,preferred=null){try{resolveBoardingAccess(f,name,external,heightAt,preferred);return '';}catch(e){return e.message;}}
export const freeLeaveProblem=(f,external=()=>false,heightAt=()=>0)=>f.aboard?boardingPathProblem(f,f.aboard,external,heightAt):'';
export function freeBoardProblem(f,player,name,external=()=>false,heightAt=()=>0){
 if(!['truck','pump'].includes(name)||f.aboard)return '車を降りてから乗り換えてください。';
 const v=f[name];let door;try{door=boardingAccess(f,v,heightAt).door;}catch(e){return '足元・車輪の地面を確認してください。'+e.message;}
 if(!atDriverDoor(player,door,v.heading))return '運転席横のドア前に立ってください。';
 try{door=resolveBoardingAccess(f,name,external,heightAt,player).door;}catch(e){return e.message;}
 const count=Math.max(1,Math.ceil(Math.hypot(player.x-door.x,player.z-door.z)));
 if(!walkingGroundSegment(f,player,door,heightAt))return WALK_GROUND_MESSAGE;
 for(let i=0;i<=count;i++){const x=player.x+(door.x-player.x)*i/count,z=player.z+(door.z-player.z)*i/count;if(walkingBlocked(f,x,z,external,null,heightAt))return 'ドア前の通路を空けてください。';}
 return '';
}
export function freeBoardStatus(f,player,name,external=()=>false,heightAt=()=>0){
 let near=false;try{near=!f.aboard&&atDriverDoor(player,boardingAccess(f,f[name],heightAt).door,f[name].heading);}catch{}
 return{near,problem:freeBoardProblem(f,player,name,external,heightAt)};
}

// Entry already changes to the workshop scene. Pick a nearby clear, supported spot
// if a saved parked vehicle or hose now occupies the former entry point.
export function freeEntryPose(f,preferred,external=()=>false,heightAt=()=>0,canStand=()=>true){
 const safe=p=>{if(walkingBlocked(f,p.x,p.z,external,null,heightAt))return null;const s=walkingGroundAt(f,p.x,p.z,heightAt),ground=heightAt(f.location.x+p.x,f.location.z+p.z);return s&&(Math.abs(s.height-preferred.y)<.15||Number.isFinite(ground)&&Math.abs(s.height-ground)<.15)&&canStand({...p,y:s.height},s)?s:null;};
 let support=safe(preferred);if(support)return{...preferred,y:support.height};
 for(let radius=8;radius<=160;radius+=8)for(let i=0;i<16;i++){const angle=i*Math.PI/8,p={...preferred,x:preferred.x+Math.cos(angle)*radius,z:preferred.z+Math.sin(angle)*radius};support=safe(p);if(support)return{...p,y:support.height};}
 throw Error('作業場所の入口に安全な足場がありません。通路を空けてから入ってください。');
}
