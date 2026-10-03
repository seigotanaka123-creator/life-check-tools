import * as T from '../three.module.min.js';
import {foundationParts,foundationContains} from './free-foundation-state.mjs';
import {assertFoundationEnvironment} from './free-foundation-operation.mjs';
import {frameRoute,frameBlocked,FRAME_RACK_STANCE} from './free-frames.mjs';
import {walkingGroundAt,walkingGroundRotation} from './free-walking-ground.mjs';
import {ROUTE_EPS} from './free-route-clearance.mjs';
import {footingAt} from './free-footing.mjs';
import {foundationScaffoldBase,foundationScaffoldFor,foundationWorkSurface} from './free-foundation-work-scaffold.mjs';
import {paintScaffoldSteps} from './free-paint-access.mjs';
export const FOUNDATION_HAND_REACH=24;
export const foundationGrip=(part,i)=>part.id.startsWith('post-')?{x:i?.2:-.2,y:part.height/2-.1,z:-.3}:{x:i?6:-6,y:0,z:-1};
export function* foundationHandPlanSteps(p,a,start,bases,env){
 const s=assertFoundationEnvironment(p,a,{...env,foot:start}),f=p.freeBuild,remove=a.type==='FREE_FOUNDATION_REMOVE',parts=foundationParts(s);
 // One part is planned per frame in the live HUD. Caches belong to that
 // synchronous step; animation and final saving sample current providers.
 const caches=[],cached=fn=>{const m=new Map();caches.push(m);return(...q)=>{const k=q.join(',');if(m.has(k))return m.get(k);const v=fn(...q);if(m.size<50000)m.set(k,v);return v;};},terrain=cached(env.heightAt),external=cached(env.blockedAt);
 // Vehicles retain the 20-unit payload clearance. At this operation's target,
 // the body keeps 14 units; the handled material may enter its intended seat.
 const groundBlocked=(x,z,m)=>external(x,z,m)||(m>=14-ROUTE_EPS&&foundationContains(s,x-s.x,z-s.z,m-6));
 const route=(from,to)=>frameRoute(f,[],from,to,groundBlocked,20,terrain,undefined,true,{minX:-360,maxX:360,minZ:-360,maxZ:360});
 const support=walkingGroundAt(f,0,116,terrain);if(!support)throw Error('資材置き場の地面を整えてから土台を作ってください。');
 const rack={...FRAME_RACK_STANCE,y:support.height},order=remove?[...parts].reverse():parts,steps=[];
 const pushWalk=(path,carrying,part,scaffold=null)=>{for(let i=1;i<path.length;i++)steps.push({kind:'walk',from:path[i-1],to:path[i],carrying,part,scaffold,duration:Math.max(.12,Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z)/85)});};
 let from=start,base=null;const scaffoldPlans=[];
 for(const [index,part]of order.entries()){
  caches.forEach(m=>m.clear());assertFoundationEnvironment(p,a,{...env,foot:start});
  let stance=null,path=null,scaffold=null;const candidates=[];
  for(const heading of [0,Math.PI,Math.PI/2,-Math.PI/2])for(const gap of [16,20,24,28,32])for(const offset of [0,-4,4,-8,8]){
   const q={x:part.x-Math.sin(heading)*gap+Math.cos(heading)*offset,z:part.z-Math.cos(heading)*gap-Math.sin(heading)*offset,heading};
   const h=walkingGroundAt(f,q.x,q.z,terrain,true);if(!h||frameBlocked(f,[],q,groundBlocked,20))continue;q.y=h.height;
   const rot=walkingGroundRotation(h,heading),reach=(i,point)=>new T.Vector3(bases[i].x,bases[i].y,bases[i].z).applyQuaternion(rot).add(new T.Vector3(q.x,q.y,q.z)).distanceTo(new T.Vector3(point.x,point.y,point.z));let max=0;
   for(let i=0;i<2;i++){const g=foundationGrip(part,i),hit={x:part.x+g.x,y:part.y+part.height/2+.16,z:part.z+g.z},d=Math.hypot(q.x-hit.x,q.z-hit.z)||1;max=Math.max(max,reach(i,{x:part.x+g.x,y:part.y+g.y,z:part.z+g.z}),reach(i,{x:hit.x+(q.x-hit.x)*3/d,y:hit.y+7,z:hit.z+(q.z-hit.z)*3/d}));}
   if(max<=FOUNDATION_HAND_REACH-1e-5)candidates.push(q);
  }
  candidates.sort((a,b)=>Math.hypot(a.x-rack.x,a.z-rack.z)-Math.hypot(b.x-rack.x,b.z-rack.z));
  for(const q of candidates)try{path=route(rack,q);stance=q;break;}catch(e){if(e.code==='FRAME_ROUTE_BUDGET')throw e;}
  if(!stance){
   base??=foundationScaffoldBase(f,s,terrain,external);const raised=[];
   for(const heading of [0,Math.PI,Math.PI/2,-Math.PI/2])for(const gap of [16,20,24,28,32])for(const offset of [0,-4,4,-8,8]){
    const q={x:part.x-Math.sin(heading)*gap+Math.cos(heading)*offset,z:part.z-Math.cos(heading)*gap-Math.sin(heading)*offset,heading,y:base.height};
    if(frameBlocked(f,[part],q,external,20))continue;const rot=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading),reach=(i,point)=>new T.Vector3(bases[i].x,bases[i].y,bases[i].z).applyQuaternion(rot).add(new T.Vector3(q.x,q.y,q.z)).distanceTo(new T.Vector3(point.x,point.y,point.z));let max=0;
    for(let i=0;i<2;i++){const g=foundationGrip(part,i),hit={x:part.x+g.x,y:part.y+part.height/2+.16,z:part.z+g.z},d=Math.hypot(q.x-hit.x,q.z-hit.z)||1;max=Math.max(max,reach(i,{x:part.x+g.x,y:part.y+g.y,z:part.z+g.z}),reach(i,{x:hit.x+(q.x-hit.x)*3/d,y:hit.y+7,z:hit.z+(q.z-hit.z)*3/d}));}
    if(max<=FOUNDATION_HAND_REACH-1e-5)raised.push(q);
   }
   raised.sort((a,b)=>Math.hypot(a.x-base.landing.x,a.z-base.landing.z)-Math.hypot(b.x-base.landing.x,b.z-base.landing.z));let last;
   for(const q of raised)try{const candidate=foundationScaffoldFor(f,base,part,q,rack,terrain,external,groundBlocked),height=(x,z)=>foundationWorkSurface(f,candidate,x-f.location.x,z-f.location.z,terrain),h=footingAt(f,q.x,q.z,height,true);if(!h||Math.abs(h.height-base.height)>.01)continue;scaffold=candidate;stance=q;path=candidate.path;break;}catch(e){last=e;if(e.code==='FRAME_ROUTE_BUDGET')throw e;}
   if(!stance)throw Error('土台の固定部へ安全な作業足場が届きません。近くの車両を離して通路を空けてください。',{cause:last??{part:part.id}});
   scaffoldPlans.push({id:part.id,height:scaffold.height,base:scaffold.entry.y,treads:scaffold.stairs.length});
  }
  pushWalk(route(from,rack),false,part);if(!remove)steps.push({kind:'pickup',part,stance:rack,duration:.65,index});
  if(scaffold){pushWalk(scaffold.ground,!remove,part);steps.push({kind:'open',part,index,stance:scaffold.entry,scaffold,carrying:!remove,duration:.65});const {up}=paintScaffoldSteps({scaffold});steps.push(...up.map(s=>({...s,part,index,carrying:!remove})));}
  pushWalk(path,!remove,part,scaffold);
  const common={part,index,stance,scaffold};if(remove){for(let hit=0;hit<2;hit++)steps.push({...common,kind:'unlock',hit,duration:.4});steps.push({...common,kind:'lift',duration:.65});}
  else{steps.push({...common,kind:'place',duration:.65});for(let hit=0;hit<2;hit++)steps.push({...common,kind:'hammer',hit,duration:.4});}
  pushWalk([...path].reverse(),remove,part,scaffold);
  if(scaffold){const {down}=paintScaffoldSteps({scaffold});steps.push(...down.map(s=>({...s,part,index,carrying:remove})));steps.push({kind:'close',part,index,stance:{...scaffold.entry,heading:Math.PI},scaffold,carrying:remove,duration:.55});pushWalk([...scaffold.ground].reverse(),remove,part);}
  if(remove)steps.push({kind:'putaway',part,stance:rack,duration:.65,index});from=rack;yield{part:index+1,total:order.length};
 }
 return{s,parts,order,steps,endPose:rack,groundBlocked,scaffoldPlans};
}
export function foundationHandPlan(...args){const iterator=foundationHandPlanSteps(...args);for(;;){const result=iterator.next();if(result.done)return result.value;}}
