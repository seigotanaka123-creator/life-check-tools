import {planFieldRoute} from '../imasora-construction-shared-field.mjs?v=120ey';
import {resolveBoardingAccess,freeBoardProblem} from './free-boarding.mjs?v=120fw';
import {walkingBlocked} from './free-contact.mjs?v=120fw';
import {walkingGroundAt} from './free-walking-ground.mjs?v=120fw';
import {VEHICLE_GROUND} from './free-vehicle-ground.mjs?v=120ek';

// This plans against the actual saved vehicles, hose, forms, works and terrain.
// The live view still validates every movement step; this is never a teleport.
export async function planConcreteDoorRoute(f,name,foot,{blockedAt=()=>false,heightAt=()=>0,signal,yieldFrame}={}){
 if(!f?.location||f.aboard||!['truck','pump'].includes(name))throw Error('車を降りてから、行きたいドアをえらぼう。');
 const door=resolveBoardingAccess(f,name,blockedAt,heightAt).door;
 const problem=freeBoardProblem(f,door,name,blockedAt,heightAt);if(problem)throw Error(problem);
 const local=p=>({...p,x:p.x-f.location.x,z:p.z-f.location.z}),world=p=>({...p,x:p.x+f.location.x,z:p.z+f.location.z});
 const cache=new Map(),sample=p=>{const key=p.x+','+p.z;if(cache.has(key))return cache.get(key);const q=local(p),support=walkingBlocked(f,q.x,q.z,blockedAt,null,heightAt)?null:walkingGroundAt(f,q.x,q.z,heightAt);if(cache.size<50000)cache.set(key,support);return support;};
 const canStep=(a,b)=>{const sa=sample(a),sb=sample(b);return !!sa&&!!sb&&Math.abs(sa.height-sb.height)<=VEHICLE_GROUND.maxSlope*Math.hypot(b.x-a.x,b.z-a.z)+.15;};
 const path=await planFieldRoute(world(foot),world(door),{canStand:p=>!!sample(p),canStep,signal,...(yieldFrame?{yieldFrame}:{})});
 return path.map(local);
}
