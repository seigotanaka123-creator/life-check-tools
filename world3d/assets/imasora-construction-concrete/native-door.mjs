import {resolveBoardingAccess,freeBoardProblem} from './free-boarding.mjs?v=120gn';
import {walkingGroundAt} from './free-walking-ground.mjs?v=120gn';

const valid=(f,name)=>f?.location&&!f.aboard&&['truck','pump'].includes(name);
export function concreteWorldDoor(f,name,{blockedAt=()=>false,heightAt=()=>0}={}){
 if(!valid(f,name))return null;
 const access=resolveBoardingAccess(f,name,blockedAt,heightAt),v=f[name];
 // The ordinary world's whole-body collider includes the arms. Stop 7.75 units
 // outside the marker, still inside its existing eight-unit boarding zone.
 const door={...access.door,x:access.door.x-7.75*Math.cos(v.heading),z:access.door.z+7.75*Math.sin(v.heading)};
 const support=walkingGroundAt(f,door.x,door.z,heightAt);if(!support)throw Error('ドア前の足元をたしかめてね。');door.y=support.height;
 const issue=freeBoardProblem(f,door,name,blockedAt,heightAt);if(issue)throw Error(issue);
 return{...door,x:door.x+f.location.x,z:door.z+f.location.z,heading:f[name].heading+Math.PI/2};
}
// Accept only the actual arrived pedestrian. No placement action, material edit,
// fallback spawn, or implicit boarding is part of this coordinate handoff.
export function concreteDoorArrival(f,name,pose,{blockedAt=()=>false,heightAt=()=>0}={}){
 if(!valid(f,name)||!pose||!['x','y','z','heading'].every(k=>Number.isFinite(pose[k])))throw Error('運転席のドア前に立ってね。');
 const local={...pose,x:pose.x-f.location.x,z:pose.z-f.location.z};
 const issue=freeBoardProblem(f,local,name,blockedAt,heightAt);if(issue)throw Error(issue);
 const support=walkingGroundAt(f,local.x,local.z,heightAt);
 if(!support||Math.abs(local.y-support.height)>.15)throw Error('ドア前の足元をたしかめてね。');
 return local;
}
export async function commitConcreteDoorEntry(name,{allowed,read,validate,save,activate}){
 if(!allowed())return false;
 const before=read(),pose={...before.pose};validate(pose);await save();
 const after=read();
 if(!allowed()||before.token!==after.token||before.revision!==after.revision||['x','y','z','heading'].some(k=>Math.abs(pose[k]-after.pose[k])>1e-8))return false;
 validate(after.pose);activate({...after.pose});return true;
}
