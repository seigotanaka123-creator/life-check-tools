import {workVehicleState} from './work-vehicle-height.mjs';
import {constructionBase} from './free-supported-build.mjs';
import {curveSupplyHose,hangingHose,hoseLength,hoseBlocks,hoseCorners,hoseGeometry,SUPPLY_HOSE_RADIUS,HOSE_CLEARANCE} from './free-hose-shape.mjs';
import {drapeSupplyHose,hoseTerrainClear,HOSE_TERRAIN_QUERY_LIMIT} from './free-hose-terrain.mjs';
import {findSupplyHoseRoute} from './free-hose-route.mjs';
import {settleSupplyHose} from './free-hose-gravity.mjs';
import {hoseSelfClear,hoseSegmentDistance} from './free-hose-self-contact.mjs';
import {createHoseDynamics,HOSE_MOTION_LIMITS,hangingHoseResponse} from './free-hose-dynamics.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import * as T from '../three.module.min.js';
import {freeCell,freeFramePanels,canonicalFreeAction} from './free-build-state.mjs';
import {castPoint,CAST_PORTS} from './free-casting.mjs';
const v=p=>new T.Vector3(p.x,p.y??0,p.z),mix=(a,b,t)=>a+(b-a)*t;
export const BOOM_SIZES=[[8,8,43],[8,7,40],[7,6,34]];
export const BOOM_PHASES=['lift','raise','swing','reach','hose','pour','hose-up','fold','swing-back','lower','stow'];
export const PIPE_ACTIONS=new Set(['FREE_CONNECT']);
const NO_PIPE_OBSTACLE=()=>false;
const pipeKey=f=>JSON.stringify([f.location,f.truck,f.pump,f.mask,f.height,constructionBase(f),f.stage,f.completed.map(w=>[w.x,w.z,w.fill,w.placedMask,constructionBase(w)])]);
function obb(center,half,axes=[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)]){return{center:v(center),half,axes};}
function beamBox(a,b,w,h,guide=null){const z=v(a).sub(v(b)).normalize(),x=guide?.clone()??new T.Vector3(z.z,0,-z.x);if(x.length()<.00001)x.set(1,0,0);x.normalize();const y=new T.Vector3().crossVectors(z,x).normalize();return obb(v(a).add(v(b)).multiplyScalar(.5),[w/2,h/2,v(a).distanceTo(v(b))/2],[x,y,z]);}
function carBox(car,x,y,z,hx,hy,hz){const c=Math.cos(car.heading),s=Math.sin(car.heading);return obb(castPoint(car,{x,y,z}),[hx,hy,hz],[new T.Vector3(c,0,-s),new T.Vector3(0,1,0),new T.Vector3(s,0,c)]);}
export function boxesOverlap(a,b,pad=.3){
 const delta=b.center.clone().sub(a.center),axes=[...a.axes,...b.axes];for(const x of a.axes)for(const y of b.axes){const n=new T.Vector3().crossVectors(x,y);if(n.lengthSq()>1e-12)axes.push(n.normalize());}
 const span=(r,n)=>r.half.reduce((sum,h,i)=>sum+h*Math.abs(r.axes[i].dot(n)),0);
 return axes.every(n=>Math.abs(delta.dot(n))<span(a,n)+span(b,n)+pad);
}
export function boomObstacles(f){
 const result=[];
 for(const name of ['truck','pump']){const c=f[name];result.push(carBox(c,0,32.5,23,32,18.5,19),carBox(c,0,10,-1,33,10,42));result.push(carBox(c,0,name==='truck'?38:23,-19,27,name==='truck'?22:8,22));}
 if(!['design','complete'].includes(f.stage))for(const p of freeFramePanels(f.mask))result.push(obb({x:p.x,y:constructionBase(f)+f.height/2,z:p.z},[p.width/2,f.height/2,p.depth/2]));
 for(const w of f.completed)for(let i=0;i<16;i++)if(freePlacedFill(w,i)){const c=freeCell(i),height=w.fill[i]/2;result.push(obb({x:w.x-f.location.x+c.x,y:constructionBase(w)+height/2,z:w.z-f.location.z+c.z},[8,height/2,8]));}
 result.push(obb({x:0,y:3,z:140},[11,3,6]));return result;
}
function externalBox(f,box,external){
 const count=Math.max(1,Math.ceil(box.half[2]*2/4)),step=box.half[2]*2/count,r=Math.hypot(box.half[0],box.half[1],step/2)+.35;
 for(let i=0;i<count;i++){const p=box.center.clone().addScaledVector(box.axes[2],-box.half[2]+(i+.5)*step);if(external(f.location.x+p.x,f.location.z+p.z,r,p.y))return true;}return false;
}
function pipeGuideRoute(f,external=()=>false){
 const a=castPoint(f.truck,CAST_PORTS.truck),b=castPoint(f.pump,CAST_PORTS.supplyInlet),obstacles=boomObstacles(f);
 const safe=(a,b)=>{const box=beamBox(a,b,2.2,2.2);return !obstacles.some(o=>boxesOverlap(box,o,.15))&&!externalBox(f,box,external);};
 const exit=car=>castPoint(car,{x:0,y:24,z:-55}),nodes=[a,b,exit(f.truck),exit(f.pump)];
 for(const car of [f.truck,f.pump])for(const x of [-42,42])for(const z of [-53,54])nodes.push(castPoint(car,{x,y:24,z}));
 const dist=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set();dist[0]=0;
 for(let k=0;k<nodes.length;k++){let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||dist[i]<dist[u]))u=i;if(u<0||!Number.isFinite(dist[u]))break;
  if(u===1){const result=[];for(let j=1;j!==-1;j=prev[j])result.unshift(nodes[j]);if(dist[1]>240)throw Error('配管が長すぎます。両車の後部を近づけてください。');return result;}
  done.add(u);for(let j=0;j<nodes.length;j++)if(!done.has(j)){const d=dist[u]+v(nodes[u]).distanceTo(v(nodes[j]));if(d<dist[j]&&safe(nodes[u],nodes[j])){dist[j]=d;prev[j]=u;}}
 }
 throw Error('車体や障害物を避ける配管経路がありません。両車の後部に通路を空けてください。');
}

const shapeCache=new WeakMap(),contactCache=new WeakMap(),motionCache=new WeakMap();
function pipeShape(f,heightAt=()=>0,external=NO_PIPE_OBSTACLE,worldChecked=false){
 let queries=0,obstacleQueries=0;const samples=new Map(),rawExternal=external;external=(...args)=>{if(++obstacleQueries>26000)throw Error('配管の通路を調べる範囲を超えました。両車を近づけて通路を空けてください。');return rawExternal(...args);};const ground=(x,z)=>{const key=x+','+z;if(!samples.has(key)){if(++queries>HOSE_TERRAIN_QUERY_LIMIT)throw Error('配管経路の地面が複雑です。短く平らな通路を確保してください。');samples.set(key,heightAt(x,z));}return samples.get(key);};
 const key=pipeKey(f),cached=shapeCache.get(f),obstacles=boomObstacles(f),inside=path=>path.slice(1).some((b,i)=>{const box=beamBox(path[i],b,2.2,2.2);return obstacles.some(o=>boxesOverlap(box,o,.2));}),outside=path=>path.slice(1).some((b,i)=>externalBox(f,beamBox(path[i],b,2.2,2.2),external));
 if(cached?.key===key){const terrainOK=hoseTerrainClear(cached.path,f.location,ground),worldOK=!outside(cached.path),bodyOK=cached.bodyChecked||!inside(cached.path),portsOK=v(cached.path[0]).distanceTo(v(castPoint(f.truck,CAST_PORTS.truck)))<1e-7&&v(cached.path.at(-1)).distanceTo(v(castPoint(f.pump,CAST_PORTS.supplyInlet)))<1e-7;if(terrainOK&&worldOK&&bodyOK&&portsOK){cached.worldChecked ||=worldChecked;cached.bodyChecked=true;return cached.path;}
  // A preview has not checked the world's buildings yet. The first real
  // validation may choose a detour. An installed, checked hose stays fixed.
  if(f.connected&&cached.worldChecked)throw Error(terrainOK?'配管経路や車体の位置が変わりました。接続を外して停め直してください。':'配管経路の地面や盛土が変わりました。接続を外して確認してください。');
 }
 const fit=guide=>{for(const round of [4,2,.5,0])for(const sag of [20,12,6,0]){let path;try{path=drapeSupplyHose(curveSupplyHose(guide,sag,round),f.location,ground);}catch(e){if(/接続口/.test(e.message))continue;throw e;}if(hoseLength(path)>240||!hoseSelfClear(path)||inside(path)||outside(path))continue;return path;}return null;};
 let path=null;try{path=fit(pipeGuideRoute(f,external));}catch(e){if(!/配管経路がありません|配管が長すぎます/.test(e.message))throw e;}
 if(!path){
  const start=castPoint(f.truck,CAST_PORTS.truck),end=castPoint(f.pump,CAST_PORTS.supplyInlet);
  // Coarse terrain probes only nominate routes. fit() still samples the full
  // width every .5 units and validates the final curved/draped geometry.
  const safe=(a,b)=>{const segment=[a,b];if(inside(segment)||outside(segment))return false;const r=SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE,n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/4));for(let i=0;i<=n;i++)for(const[dx,dz]of [[0,0],[-r,0],[r,0],[0,-r],[0,r]]){const h=ground(f.location.x+mix(a.x,b.x,i/n)+dx,f.location.z+mix(a.z,b.z,i/n)+dz);if(!Number.isFinite(h)||h+r>Math.min(a.y,b.y))return false;}return true;};
  const route=findSupplyHoseRoute(start,end,safe);path=fit(route.path);
 }
 if(path){
  const floor=drapeSupplyHose(path.map((p,i)=>({...p,y:i===0||i===path.length-1?p.y:-1000000})),f.location,ground).map(p=>p.y);
  const settled=settleSupplyHose(path,floor,(a,b)=>!inside([a,b])&&!outside([a,b]),{canContinue:()=>obstacleQueries<23000});
  // Recheck the shared final geometry, including full-width terrain support.
  if(hoseSelfClear(settled.path)&&hoseTerrainClear(settled.path,f.location,ground)&&!inside(settled.path)&&!outside(settled.path))path=settled.path;
  shapeCache.set(f,{key,path,worldChecked,bodyChecked:true});return path;
 }
 throw Error('曲がる配管経路を確保できません。両車の後部に通路を空けてください。');
}
export function pipeRoute(f,external=NO_PIPE_OBSTACLE,heightAt=()=>0){
 const original=f;f=workVehicleState(f,heightAt);const path=pipeShape(f,heightAt,external,true);contactCache.set(original,{key:pipeKey(original),path,worldChecked:true});
 return path;
}
// Existing invalid saved connections remain removable. Their visible fallback is
// also solid; neither walking nor placement silently ignores the old hose.
export function pipeContactPath(f,heightAt=null,external=null){if(!f?.location||!f.connected)return[];const original=f,cached=contactCache.get(f),retained=cached?.key===pipeKey(f)?cached.path:null;if(!heightAt&&!external&&retained)return retained;try{f=workVehicleState(f,heightAt);const shape=shapeCache.get(f);/* Installed geometry stays fixed. Connection/pour checks revalidate terrain. */const path=shape?.key===pipeKey(f)&&(!external||shape.worldChecked)?shape.path:pipeShape(f,heightAt??(()=>0),external??NO_PIPE_OBSTACLE,!!external);contactCache.set(original,{key:pipeKey(original),path,worldChecked:shapeCache.get(f)?.worldChecked===true});return path;}catch{return retained??[castPoint(f.truck,CAST_PORTS.truck),castPoint(f.pump,CAST_PORTS.supplyInlet)];}}
// A ledger update creates a new project object. Keep the actual installed tube
// across that copy; a preview alone cannot become evidence of an installation.
export function retainInstalledPipe(previous,next,heightAt){
 if(previous===next||!previous?.connected||!next?.connected||JSON.stringify([previous.location,previous.truck,previous.pump])!==JSON.stringify([next.location,next.truck,next.pump]))return;
 const old=contactCache.get(previous);if(!old?.worldChecked||old.key!==pipeKey(previous))return;
 contactCache.set(next,{key:pipeKey(next),path:old.path,worldChecked:true});
 const motion=motionCache.get(previous);if(motion&&pipeKey(previous)===pipeKey(next))motionCache.set(next,motion);
 try{const f=workVehicleState(next,heightAt);shapeCache.set(f,{key:pipeKey(f),path:old.path,worldChecked:true,bodyChecked:false});}catch{/* Keep the old solid tube; missing ground still blocks connection/pouring. */}
}
// Certify a small swept tube once. The frame loop only integrates bounded
// displacement inside it; walls, self-contact and narrow passages cannot be
// crossed even between simulation steps. Ground friction uses the support
// envelope of the entire width, not just the centre point.
export function supplyHoseMotion(f,external=NO_PIPE_OBSTACLE,heightAt=()=>0,refresh=false){
 const path=pipeRoute(f,external,heightAt),prior=motionCache.get(f);if(!refresh&&prior?.base===path)return prior;
 const state=workVehicleState(f,heightAt),obstacles=boomObstacles(state),r=SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE,n=path.length,caps=path.map(()=>HOSE_MOTION_LIMITS.radius),floor=path.map(()=>-Infinity),arc=[0];let checks=0;
 const ground=(a,b,q)=>{const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.5));let y=-Infinity;for(let i=0;i<=count;i++)for(const[dx,dz]of [[0,0],[-r-q,0],[r+q,0],[0,-r-q],[0,r+q],[-r-q,-r-q],[-r-q,r+q],[r+q,-r-q],[r+q,r+q]]){if(++checks>18000)throw Error('motion budget');const h=heightAt(f.location.x+mix(a.x,b.x,i/count)+dx,f.location.z+mix(a.z,b.z,i/count)+dz);if(!Number.isFinite(h))throw Error('motion ground');y=Math.max(y,h+r);}return y;};
 try{for(let i=1;i<n;i++){arc[i]=arc[i-1]+v(path[i-1]).distanceTo(v(path[i]));let chosen=0,y=Math.min(path[i-1].y,path[i].y);for(const q of [.6,.3,.1]){const box=beamBox(path[i-1],path[i],2*(SUPPLY_HOSE_RADIUS+q),2*(SUPPLY_HOSE_RADIUS+q));if(obstacles.some(o=>boxesOverlap(box,o,.2))||externalBox(state,box,external))continue;const h=ground(path[i-1],path[i],q);if(h>Math.min(path[i-1].y,path[i].y)+1e-7)continue;chosen=q;y=h;break;}caps[i-1]=Math.min(caps[i-1],chosen);caps[i]=Math.min(caps[i],chosen);floor[i-1]=Math.max(floor[i-1],y);floor[i]=Math.max(floor[i],y);}
  for(let i=0;i<n-1;i++)for(let j=i+2;j<n-1;j++)if(arc[j]-arc[i+1]>=2.4-1e-7){const limit=Math.max(0,(hoseSegmentDistance(path[i],path[i+1],path[j],path[j+1])-2.4-.02)/2);for(const k of[i,i+1,j,j+1])caps[k]=Math.min(caps[k],limit);}
 }catch{caps.fill(0);for(let i=0;i<n;i++)floor[i]=path[i].y;}
 caps[0]=caps[n-1]=0;for(let i=0;i<n;i++)floor[i]=Math.min(path[i].y,Number.isFinite(floor[i])?floor[i]:path[i].y);
 const dynamics=createHoseDynamics(path,{radii:caps,floor}),motion={base:path,path:dynamics.path,dynamics,floor,radii:caps,checks};motionCache.set(f,motion);return motion;
}
export function advanceSupplyHose(f,dt,pumping=false){const m=motionCache.get(f);if(!m)return null;m.dynamics.setLoad(f.hose?1:0);return m.dynamics.tick(dt,{pumping});}
export const pipeWalkingBlocked=(f,x,z,radius=14,heightAt=null)=>hoseBlocks(motionCache.get(f)?.path??pipeContactPath(f,heightAt),x,z,radius);
export const pipeWalkingCorners=(f,heightAt=null)=>hoseCorners(pipeContactPath(f,heightAt));
export const pipeContactGeometry=(f,heightAt=null)=>hoseGeometry(pipeContactPath(f,heightAt),f?.location,HOSE_MOTION_LIMITS.radius);
export function pipeProblem(f,a,external,heightAt=()=>0){if(a.type==='FREE_CONNECT'&&a.connected||a.type==='FREE_PRIME'||a.type==='FREE_POUR'&&a.source==='pump'){try{pipeRoute(f,external,heightAt);}catch(e){return e.message;}}return '';}
export function createBoomPlan(f,cell,heightAt=null){
 f=workVehicleState(f,heightAt);
 const target=freeCell(cell),base=castPoint(f.pump,{x:-6,y:40,z:3.5}),dx=target.x-base.x,dz=target.z-base.z,horizontal=Math.hypot(dx,dz);
 const q=Math.sqrt(Math.max(0,horizontal*horizontal-19*19)),distance=q-3.5,remaining=distance-34,d=Math.hypot(remaining,15);
 if(horizontal<=19||d>82.5||d<4)throw Error('ブームの長さが届きません。作業台の外側で停車位置・向きを変え、届くマスへ分けて注いでください。');
 const angle=Math.atan2(15,remaining),a1=angle+Math.acos((43*43+d*d-40*40)/(2*43*d)),a2=angle-Math.acos((40*40+d*d-43*43)/(2*40*d));
 const yaw=Math.atan2(Math.sin(Math.atan2(dx,dz)-Math.atan2(19,-q)-f.pump.heading),Math.cos(Math.atan2(dx,dz)-Math.atan2(19,-q)-f.pump.heading));
 const transit=[Math.PI/2,Math.PI*1.5,Math.PI/2],angles=[a1,a2+Math.PI*2,0],bounds=[18,240,150*Math.abs(yaw),150*Math.max(...angles.map((a,i)=>Math.abs(a-transit[i]))),(88+(f.pump.workY??0)-constructionBase(f)-f.height-1)*1.25,0];
 function pose(phase,t){
  let stage=phase,progress=t;if(phase>=6){stage=10-phase;progress=1-t;}
  let aa=[0,Math.PI,0],rotation=0,extension=0;
  if(stage===1)aa=aa.map((a,i)=>mix(a,transit[i],progress));
  else if(stage===2){aa=transit;rotation=yaw*progress;}
  else if(stage===3){aa=angles.map((a,i)=>mix(transit[i],a,progress));rotation=yaw;}
  else if(stage>=4){aa=angles;rotation=yaw;extension=stage===4?progress:1;}
  const rot=p=>v(p).applyAxisAngle(new T.Vector3(0,1,0),rotation),localBase=new T.Vector3(-6,40+18*(stage===0?progress:1),3.5),point=p=>castPoint(f.pump,p),segments=[];let start=new T.Vector3();
  for(let i=0;i<3;i++){if(i===1)start.add(new T.Vector3(10,8,2.5));if(i===2)start.add(new T.Vector3(9,7,-6));const end=start.clone().add(new T.Vector3(0,Math.sin(aa[i])*BOOM_SIZES[i][2],-Math.cos(aa[i])*BOOM_SIZES[i][2]));segments.push({a:point(rot(start).add(localBase)),b:point(rot(end).add(localBase)),size:BOOM_SIZES[i]});start=end;}
  const end=segments[2].b,tip={...end,y:end.y-extension*(88+(f.pump.workY??0)-constructionBase(f)-f.height-1)},boxes=segments.map(s=>beamBox(s.a,s.b,s.size[0],s.size[1],new T.Vector3(Math.cos(rotation+f.pump.heading),0,-Math.sin(rotation+f.pump.heading))));
  for(let i=1;i<3;i++)boxes.push(beamBox(segments[i-1].b,segments[i].a,1,1));
  const hose=extension>0?hangingHose(end,tip,f.pump.heading,hangingHoseResponse(phase,t,f.hose?1:0)):[];for(let i=1;i<hose.length;i++)boxes.push(beamBox(hose[i-1],hose[i],2.7,2.7));
  const mount=beamBox(castPoint(f.pump,CAST_PORTS.pump),segments[0].a,6.6,6.6);return{segments,tip,end,extension,hose,boxes,mount};
 }
 // The pose displacement is bounded by .45; a .3 clearance also covers the
 // nearest-sample gap, including thin surfaces between two sampled poses.
 function* check(phase,from,to,external=()=>false){
  const bound=bounds[phase>=6?10-phase:phase]+([4,5,6].includes(phase)?24:0),n=Math.max(1,Math.ceil(Math.abs(to-from)*bound/.45)),obstacles=boomObstacles(f);
  for(let i=0;i<=n;i++){const state=pose(phase,mix(from,to,i/n));
   for(const box of state.boxes){if(obstacles.some(o=>boxesOverlap(box,o))||externalBox(f,box,external))throw Error('ブームやホースの通り道に車体・型枠・障害物があります。位置を変えてください。');}
   if(obstacles.some((o,j)=>!(j>=3&&j<=5)&&boxesOverlap(state.mount,o))||externalBox(f,state.mount,external))throw Error('ブームの支柱の周囲を空けてください。');
   if(boxesOverlap(state.boxes[0],state.boxes[2]))throw Error('ブーム同士が接触するため止めました。');yield state;
  }
 }
 function sweep(phase,from,to,external=()=>false,visit=()=>{}){for(const state of check(phase,from,to,external))visit(state);}
 return{pose,sweep,check,target,bounds};
}
export function newBoomReceipt(){return{version:119,checkedPoses:0,maxGeometryError:0,phases:BOOM_PHASES.map(name=>({name,min:1,max:0,samples:0}))};}
export function assertBoomReceipt(r){
 const keys=o=>JSON.stringify(Object.keys(o??{}).sort());if(keys(r)!==keys(newBoomReceipt())||r.version!==119||!Number.isSafeInteger(r.checkedPoses)||r.checkedPoses<20||!Number.isFinite(r.maxGeometryError)||r.maxGeometryError<0||r.maxGeometryError>1e-5||!Array.isArray(r.phases)||r.phases.length!==11)throw Error('ブームとホースの接触記録を確認できません。');
 for(let i=0;i<11;i++){const p=r.phases[i];if(keys(p)!==keys(newBoomReceipt().phases[i])||p.name!==BOOM_PHASES[i]||p.min!==0||p.max!==1||!Number.isSafeInteger(p.samples)||p.samples<3)throw Error('ブームの展開・打設・収納が完了していません。');}
}
function pipeContext(a,p){return JSON.stringify({action:canonicalFreeAction(a),profileId:p.profileId,freeBuild:p.freeBuild});}
export function newPipeReceipt(a,p){return{type:a.type,operationId:a.operationId,revision:p.revision,context:pipeContext(a,p),min:1,max:0,samples:0,maxGeometryError:0};}
export function assertPipeReceipt(a,p,revision,r){const e=newPipeReceipt(a,p);if(!PIPE_ACTIONS.has(a.type)||!r||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(Object.keys(e).sort())||r.context!==e.context||r.operationId!==a.operationId||r.type!==a.type||r.revision!==revision||revision!==p.revision||r.min!==0||r.max!==1||!Number.isSafeInteger(r.samples)||r.samples<3||!Number.isFinite(r.maxGeometryError)||r.maxGeometryError<0||r.maxGeometryError>1e-5)throw Error('配管の接続・収納を確認できません。');}
