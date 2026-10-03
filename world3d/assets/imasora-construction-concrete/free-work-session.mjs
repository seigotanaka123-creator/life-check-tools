import {createWorkPlatformRecord,assertWorkPlatformRecord} from './free-platform-record.mjs';
import {fixedWorkPlatform} from './free-fixed-work-platform.mjs';
import {frameBlocked,frameRoute,frameGroundRoute,frameSegmentBlocked,FRAME_RACK_STANCE} from './free-frames.mjs';
import {frameWorkBoxes,frameWorkspaceBlocked} from './free-frame-workspace.mjs';
import {scaffoldSupport} from './free-frame-scaffold.mjs';
import {footSurface} from './free-footing.mjs';
import {createScaffoldMotion} from './free-scaffold-motion.mjs';
import {vehicleFootprints} from './free-vehicle-contact.mjs';
import {pointBoxDistance} from './free-route-clearance.mjs';
import {boardingAccess} from './free-boarding.mjs';

const inside=(plan,x,z)=>plan.pieces.some(p=>Math.abs(x-p.x)<=p.width/2+1e-8&&Math.abs(z-p.z)<=p.depth/2+1e-8);
const pointSegment=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
// A vehicle on invalid ground cannot be boarded. Still reserve its nominal horizontal door path; actual boarding always revalidates the real ground.
const boardingCorridors=(f,at)=>[f.truck,f.pump].map(v=>{try{return boardingAccess(f,v,at).steps;}catch{return boardingAccess(f,v,()=>0).steps;}});
const corridorClear=(paths,p,r)=>paths.every(path=>path.slice(1).every((b,i)=>pointSegment(p,path[i],b)>=r));
// The measured shoes' axis-aligned bounds reach 12.555 units while turning.
// Keep a full 12.6-unit disk supported, including concave corners and small gaps;
// checking a handful of rim points can miss an opening between those points.
const deckEdges=new WeakMap();
function workDeckBoundary(plan){
 if(deckEdges.has(plan))return deckEdges.get(plan);
 const bounds=plan.pieces.map(p=>({x0:p.x-p.width/2,x1:p.x+p.width/2,z0:p.z-p.depth/2,z1:p.z+p.depth/2})),edges=[];
 const exposed=(lo,hi,covered)=>{let runs=[[lo,hi]];for(const[a,b]of covered){const next=[];for(const[c,d]of runs){if(b<=c||a>=d)next.push([c,d]);else{if(a>c)next.push([c,a]);if(b<d)next.push([b,d]);}}runs=next;}return runs;};
 for(const p of bounds){
  for(const [axis,other]of [['x','z'],['z','x']])for(const side of [0,1]){const value=p[axis+side],adjacent=bounds.filter(q=>q!==p&&(side?q[axis+'0']<=value&&q[axis+'1']>value:q[axis+'1']>=value&&q[axis+'0']<value));
   for(const[a,b]of exposed(p[other+'0'],p[other+'1'],adjacent.map(q=>[q[other+'0'],q[other+'1']])))edges.push([{[axis]:value,[other]:a},{[axis]:value,[other]:b}]);
  }
 }
 deckEdges.set(plan,edges);return edges;
}
export const workDeckContains=(plan,x,z,pad=12.6)=>Number.isFinite(pad)&&pad>=0&&inside(plan,x,z)&&workDeckBoundary(plan).every(([a,b])=>pointSegment({x,z},a,b)>=pad-1e-7);
export function workPlatformSphereBlocked(plan,x,y,z,r){
 const hit=(cx,cz,hx,hz,lo,hi)=>Math.hypot(Math.max(0,Math.abs(x-cx)-hx),Math.max(0,Math.abs(z-cz)-hz),Math.max(0,lo-y,y-hi))<r-1e-7;
 const thickness=plan.thickness??.6;
 return plan.pieces.some(p=>hit(p.x,p.z,p.width/2,p.depth/2,plan.height-thickness,plan.height))||plan.stairs.some(s=>hit(s.x,s.z,s.halfX,s.halfZ,s.y-thickness,s.y))||plan.legs.some(p=>hit(p.x,p.z,.3,.3,p.base,p.y-thickness)||hit(p.x,p.z,.6,.6,p.base,p.base+.05));
}
// Reserve the side deck at the start of the job, including later tool stances.
// Added floor squares avoid vehicles and never cover the concrete footprint.
export function reserveWorkPlatform(plans,f,heightAt,external){
 if(!plans.length)return null;
 const boxes=frameWorkBoxes(f),xs=boxes.map(b=>b.x),zs=boxes.map(b=>b.z),height=plans[0].height;
 if(!boxes.length)return fixedWorkPlatform(plans,f,heightAt,external);
 const x0=Math.min(...xs)-32,x1=Math.max(...xs)+32,z0=Math.min(...zs)-32,z1=Math.max(...zs)+32;
 const vehicles=[...vehicleFootprints(f.truck),...vehicleFootprints({...f.pump,legs:true})],corridors=boardingCorridors(f,heightAt);
 const ring={...plans[0],stairs:[],legs:[],path:[{x:x0,z:z0,y:height},{x:x1,z:z0,y:height},{x:x1,z:z1,y:height},{x:x0,z:z1,y:height},{x:x0,z:z0,y:height}],allowed:q=>vehicles.every(v=>pointBoxDistance(q,v)>=7)&&corridorClear(corridors,q,15)&&!frameBlocked(f,[],q,(x,z,m)=>external(x,z,m,height),2)};
 const plan=fixedWorkPlatform([...plans,ring],f,heightAt,external);plan.primaryStairs=plans[0].stairs;const seen=new Set(plan.legs.map(p=>p.x+','+p.z));
 for(const piece of plan.pieces)for(let x=piece.x-piece.width/2+1;x<piece.x+piece.width/2;x+=8)for(let z=piece.z-piece.depth/2+1;z<piece.z+piece.depth/2;z+=8){
  const key=x+','+z;if(seen.has(key))continue;let leg;
  for(const[dx,dz]of[[0,0],[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[-2,2],[2,-2],[2,2]]){const q={x:x+dx,z:z+dz,y:height,base:footSurface(f,x+dx,z+dz,heightAt,true)};if(!inside(plan,q.x,q.z)||!Number.isFinite(q.base)||q.base<-.15||q.base>height-plan.thickness-.04)continue;try{scaffoldSupport(f,{...plan,legs:[q]},heightAt,external);leg=q;break;}catch{}}
  if(!leg)throw Error('共通作業台を支える地面がありません。施工物の周りを整えてください。');plan.legs.push(leg);seen.add(key);
 }
 scaffoldSupport(f,plan,heightAt,external);return plan;
}
export function workPlatformAccess(plan,f,from,center,reach,external,heightAt,{face='top',stance:exact=null,margin=14}={}){
 let checks=0;const cache=fn=>{const values=new Map();return(...args)=>{const key=args.join(',');if(values.has(key))return values.get(key);if(++checks>250000){const e=Error('共通作業台の経路が複雑です。周囲の車やホースを離してください。');e.code='SHARED_PLATFORM_BUDGET';throw e;}const value=fn(...args);values.set(key,value);return value;};};external=cache(external);heightAt=cache(heightAt);
 scaffoldSupport(f,plan,heightAt,external);
 const boxes=frameWorkBoxes(f),geometry=new Map(),allowed=(x,z,m)=>{if(external(x,z,m,plan.height))return true;const key=x+','+z+','+m;if(!geometry.has(key)){const extra=Math.max(0,m-margin);geometry.set(key,!workDeckContains(plan,x-f.location.x,z-f.location.z,12.6+extra)||frameWorkspaceBlocked(boxes,{x:x-f.location.x,z:z-f.location.z},(exact?13:14.5)+extra));}return geometry.get(key);};
 const candidates=[];
 const minX=Math.min(...plan.pieces.map(p=>p.x-p.width/2)),maxX=Math.max(...plan.pieces.map(p=>p.x+p.width/2)),minZ=Math.min(...plan.pieces.map(p=>p.z-p.depth/2)),maxZ=Math.max(...plan.pieces.map(p=>p.z+p.depth/2));
 const points=exact?[exact]:Array.from({length:Math.max(0,Math.floor((maxX-minX-12)/6)+1)},(_,i)=>minX+6+i*6).flatMap(x=>Array.from({length:Math.max(0,Math.floor((maxZ-minZ-12)/6)+1)},(_,i)=>({x,z:minZ+6+i*6})));
 for(const{x,z}of points){
  if(face==='north'&&z>=center.z-8||face==='south'&&z<=center.z+8||face==='west'&&x>=center.x-8||face==='east'&&x<=center.x+8)continue;
  const stance={x,z,y:plan.height,heading:exact?.heading??Math.atan2(center.x-x,center.z-z)};
  if(!workDeckContains(plan,x,z)||frameBlocked(f,exact?[]:plan.panels,stance,allowed,margin)||!reach(stance))continue;
  candidates.push(stance);
 }
 candidates.sort((a,b)=>Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z));
 const ground=frameGroundRoute(f,plan.panels,from,plan.entry,external,margin,heightAt);
 const landing=plan.path[0];let last;
 for(const stance of candidates.slice(0,80))try{const path=frameRoute(f,exact?[]:plan.panels,landing,stance,allowed,margin,heightAt,()=>({height:plan.height}),false,{minX:-220,maxX:220,minZ:-220,maxZ:220}).map(p=>({...p,y:plan.height}));return{stance,ground,scaffold:{...plan,stairs:plan.primaryStairs??plan.stairs,path,ground}};}catch(e){if(e.code==='SHARED_PLATFORM_BUDGET')throw e;last=e;}
 throw Error('共通作業台から施工面へ届く通路がありません。車やホースを離すか、作業台を片付けて配置を見直してください。',{cause:last});
}
export function createWorkPlatformSession({root,actor,feet,box,mats,heightAt,external}){
 let plan=null,reference=null,renderer=null,shown=false,frameChoices=new Map(),contactBounds=null,contactCache=new Map(),groundCache=new Map();
 const compatible=f=>reference&&f.location.x===reference.location.x&&f.location.z===reference.location.z;
 const current=f=>({...reference,...f,mask:reference.mask,baseY:reference.baseY,height:reference.height});
 function clear(){renderer?.dispose();if(renderer)root.remove(renderer.group);renderer=null;plan=reference=null;shown=false;frameChoices.clear();contactBounds=null;contactCache.clear();groundCache.clear();}
 return{
  routeExternal(f,at,blocked){const corridors=boardingCorridors(f,at);return(x,z,m,y)=>blocked(x,z,m,y)||Number.isFinite(y)&&!corridorClear(corridors,{x:x-f.location.x,z:z-f.location.z},13+m);},
  prepare(plans,f,at,blocked,steps=[]){if(plan){if(!compatible(f)||plan.height!==plans[0]?.height||f.mask!==reference.mask)throw Error('前の作業台をメニューから片付けてください。');scaffoldSupport(current(f),plan,at,blocked);return plan;}plan=reserveWorkPlatform(plans,f,at,blocked);reference=structuredClone(f);for(const s of steps)if(['place','hammer','unlock','lift'].includes(s.kind)&&s.scaffold&&s.stance&&s.target&&!frameChoices.has(s.panel.id))frameChoices.set(s.panel.id,{stance:s.stance,target:s.target,useTool:s.useTool,scaffold:s.scaffold});return plan;},
  show(){if(!plan||shown)return;renderer=createScaffoldMotion({f:reference,root,actor,feet,record:{maxSupportError:0},footing:{},heightAt:(...args)=>heightAt(...args),external:(...args)=>external(...args),parent:root,box,mats,name:'shared-construction-platform',fixedPlan:plan});try{renderer.open(plan,0);}finally{shown=true;}},
  access(f,from,center,reach,blocked,at,options){if(!plan||!shown)return null;if(!compatible(f))throw Error('別の施工場所の作業台です。片付けてください。');return workPlatformAccess(plan,current(f),from,center,reach,blocked,at,options);},
  frameChoice(f,panel,blocked,at){if(!compatible(f)||f.mask!==reference.mask||f.height!==reference.height||(f.baseY??0)!==(reference.baseY??0))throw Error('型枠の形や高さが変わりました。前の作業台を片付けてください。');const old=frameChoices.get(panel.id);if(!old)throw Error('型枠の形が変わりました。前の作業台を片付けてください。');scaffoldSupport(current(f),plan,at,blocked);const ground=frameGroundRoute(f,plan.panels,{...FRAME_RACK_STANCE,y:footSurface(f,0,116,at,true)},old.scaffold.entry,blocked,20,at),path=old.scaffold.path,deckBlocked=(x,z,m)=>blocked(x,z,m,plan.height)||frameWorkspaceBlocked(frameWorkBoxes(f),{x:x-f.location.x,z:z-f.location.z});for(let i=1;i<path.length;i++)if(frameSegmentBlocked(f,[panel],path[i-1],path[i],deckBlocked,20))throw Error('作業台の通路がふさがりました。車やホースを離してください。');return{...old,scaffold:{...old.scaffold,ground}};},
  verify(f,at,blocked){if(plan&&shown)scaffoldSupport(current(f),plan,at,blocked);},
  exportRecord(p){return shown?createWorkPlatformRecord(reference,plan,frameChoices,p):null;},
  restore(record,p){clear();if(!record)return '';assertWorkPlatformRecord(record,p);plan=structuredClone(record.plan);reference={...structuredClone(p.freeBuild),...structuredClone(record.anchor),location:structuredClone(record.anchor.location)};frameChoices=new Map(record.choices.map(({id,...c})=>[id,structuredClone(c)]));try{this.show();this.verify(p.freeBuild,heightAt,external);return '';}catch(e){return e.message+' メニューから作業台を片付けてください。';}},
  get plan(){return plan;},get visible(){return shown;},
  blocked(x,z,margin){if(!shown)return false;const key=[x,z,margin].join(',');if(groundCache.has(key))return groundCache.get(key);const hit=plan.pieces.some(p=>Math.hypot(Math.max(0,Math.abs(x-reference.location.x-p.x)-p.width/2),Math.max(0,Math.abs(z-reference.location.z-p.z)-p.depth/2))<margin)||plan.stairs.some(s=>Math.hypot(Math.max(0,Math.abs(x-reference.location.x-s.x)-s.halfX),Math.max(0,Math.abs(z-reference.location.z-s.z)-s.halfZ))<margin);if(groundCache.size>=20000)groundCache.clear();groundCache.set(key,hit);return hit;},
  blocked3D(x,z,r,y){if(!shown||!Number.isFinite(y))return false;x-=reference.location.x;z-=reference.location.z;if(!contactBounds){const boxes=[...plan.pieces.map(p=>[p.x-p.width/2,p.x+p.width/2,p.z-p.depth/2,p.z+p.depth/2]),...plan.stairs.map(p=>[p.x-p.halfX,p.x+p.halfX,p.z-p.halfZ,p.z+p.halfZ]),...plan.legs.map(p=>[p.x-.6,p.x+.6,p.z-.6,p.z+.6])];contactBounds={minX:Math.min(...boxes.map(p=>p[0])),maxX:Math.max(...boxes.map(p=>p[1])),minZ:Math.min(...boxes.map(p=>p[2])),maxZ:Math.max(...boxes.map(p=>p[3])),minY:Math.min(...plan.legs.map(p=>p.base),plan.height),maxY:plan.height};}const b=contactBounds;if(x+r<b.minX||x-r>b.maxX||z+r<b.minZ||z-r>b.maxZ||y+r<b.minY||y-r>b.maxY)return false;const key=[x,y,z,r].join(',');if(contactCache.has(key))return contactCache.get(key);const hit=workPlatformSphereBlocked(plan,x,y,z,r);if(contactCache.size>=20000)contactCache.clear();contactCache.set(key,hit);return hit;},
  clear
 };
}
