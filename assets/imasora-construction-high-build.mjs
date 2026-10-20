import{assertStairConstruction}from'./imasora-construction-stair-guard.mjs?v=120gn';
import{stairPlacement,stairPoint,stairBox,stairEntry,stairExit,stairGround,stairDoor,stairApproach}from'./imasora-construction-stair-placement.mjs?v=120gn';
import{ROOM_JUMP_RISE}from'./imasora-construction-room-motion.mjs?v=120gn';
import{assertRoomWalking}from'./imasora-construction-room-walk.mjs?v=120gn';
import{boardBayLevels,boardBaySupports,boardBayUndoReady,boardBayRetrofitAfter,boardBayRetrofitStep,boardBayRetrofitJobs,boardBayRetrofitPlan,validateBoardBayRetrofit,boardBayDecks,boardLiftBridges}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{roomDeliveryMotion}from'./imasora-construction-room-door-delivery.mjs?v=120gn';
import{ROOM_KIT_PICKUP_SECONDS}from'./imasora-construction-room-kit.mjs?v=120gn';
import{wallDoorHost}from'./imasora-construction-wall-door-shape.mjs?v=120gn';
import{roomLayoutPlan,beginRoomLayoutEdit,assertRoomLayout,assertRoomUndoSafe}from'./imasora-construction-room-layout.mjs?v=120gn';
import{roomLayoutParts,validateRoomLayout}from'./imasora-construction-room-layout-shape.mjs?v=120gn';
import {roomPaintRoute,roomGraphRoute} from './imasora-construction-building-room.mjs?v=120gn';
import {doorJob,doorStepAllowed,validateEntranceDoor,entranceDoorWaits} from './imasora-construction-building-door.mjs?v=120gn';
import {validatePaintSurface,buildingPaintStance} from './imasora-construction-building-paint-path.mjs?v=120gn';
import{highPlanScale,highInnerStairs,highInnerRoute,highStairSpine,highInsideActor}from'./imasora-construction-high-interior.mjs?v=120gn';
import {highAccessLandings,validateHighStation,highWorkTarget,highWorkVisitPlan,highWorkReturnPlan} from './imasora-construction-high-work-position.mjs?v=120gn';
import {highBlueprintFloors,highRemainingStock,validateHighShape,highFloors,highRecipe,shapedHighParts,highShapeKey,highFloorPieces,highRoofPoint,highRoofBridge} from './imasora-construction-high-shape.mjs?v=120gn';
// Shared building core; historical identifiers remain for existing saves.
// Normal play stores it through the world material/terrain authority.
export const HIGH_FORMAT='imasora-high-build-prototype-v1';
export const HIGH_SCOPE='imasora-high-build-isolated-120fc';
export const HIGH={floors:3,storey:40,half:32,deckHalf:56,deckWidth:28,runSpeed:100};
const cost={timber:8,panels:4},stockStart={timber:24,panels:12};
const bench={x:-94,y:0,z:124,heading:Math.PI};
const assert=(v,m)=>{if(!v)throw Error(m);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const routeSpeeds=new WeakMap(),fastRoute=route=>{routeSpeeds.set(route,200);return route;};
const point=(x,y,z)=>({x,y,z,heading:0});
export function highBuildingParts(level,state){
 if(state?.version>=2)return shapedHighParts(level,state);
 assert(Number.isInteger(level)&&level>=1&&level<=3,'階をえらび直してね。');
 const base=(level-1)*40,top=level*40,parts=[];
 for(const x of[-28,28])for(const z of[-28,28])parts.push({kind:'column',x,y:base+18,z,w:5,h:36,d:5});
 for(const z of[-28,28])parts.push({kind:'beam',x:0,y:top-3,z,w:61,h:4,d:5});
 for(const x of[-28,28])parts.push({kind:'beam',x,y:top-3,z:0,w:5,h:4,d:51});
 for(const x of[-16,16])for(const z of[-16,16])parts.push({kind:'floor',x,y:top-1,z,w:32,h:2,d:32});
 return parts;
}
export function highPlatform(state){
 const decks=[],stairs=[],posts=[];
 for(let level=0;level<=highFloors(state);level++){
  const y=level*40;
  for(const x of[-56,56])decks.push({x,y,z:0,w:28,d:140});
  for(const z of[-56,56])decks.push({x:0,y,z,w:84,d:28});
  if(level)decks.push({x:94,y,z:level%2?-80:80,w:96,d:32});
  if(level)decks.push({x:56,y,z:level%2?-64:64,w:28,d:32});
 }
 // Permanent switchback stair tower outside the building and work decks.
 for(let flight=0;flight<highFloors(state);flight++){
  const x=flight%2?126:90,dir=flight%2?1:-1;
  for(let i=1;i<=16;i++)stairs.push({x,y:flight*40+i*2.5,z:-dir*80+dir*(i-.5)*10,w:32,d:10});
 }
 for(const x of[-69,-43,43,69])for(const z of[-69,69])posts.push({x,z});
 for(const x of[74,106,110,142])for(const z of[-94,94])posts.push({x,z});
 const scale=highPlanScale(state),scaled=p=>({...p,x:p.x*scale,z:p.z*scale,...(p.w?{w:p.w*scale,d:p.d*scale}:{})});return {decks:[...decks.map(scaled),...boardBayDecks(state),...boardLiftBridges(state)],stairs:stairs.map(scaled),posts:posts.map(scaled)};
}
// Same geometry feeds render and support checks. No invisible shortcut floor.
export function highSurface(x,z,nearY=0,levels=0,state){
 const p=highPlatform(state),surfaces=[...p.decks,...p.stairs,...highAccessLandings(state??{}),...roomLayoutParts(state??{}).filter(b=>b.kind==='landing').map(b=>({...b,y:b.y+b.h/2}))].filter(b=>Math.abs(x-b.x)<=b.w/2+.001&&Math.abs(z-b.z)<=b.d/2+.001);
 if(Math.abs(x)<=190*highPlanScale(state)&&Math.abs(z)<=150*highPlanScale(state))surfaces.push({y:0});
 for(let i=1;i<=levels;i++)for(const b of highFloorPieces(state,i))if(Math.abs(x-b.x)<=b.w/2&&Math.abs(z-b.z)<=b.d/2)surfaces.push({y:b.y});
 if(highPlanScale(state)===2)for(let i=1;i<=levels;i++)for(const b of highInnerStairs(i,state))if(Math.abs(x-b.x)<=b.w/2+.001&&Math.abs(z-b.z)<=b.d/2+.001)surfaces.push({y:b.y+b.h/2});
 const bridge=levels===highFloors(state)?highRoofBridge(state):null;if(bridge&&Math.abs(x-bridge.x)<=bridge.w/2&&Math.abs(z-bridge.z)<=bridge.d/2)surfaces.push({y:bridge.y});
 return surfaces.reduce((best,b)=>Math.abs(b.y-nearY)<Math.abs(best-nearY)?b.y:best,Infinity);
}
function stairRoute(level,up=true){
 const path=[point(90,0,85)];
 for(let f=0;f<level;f++){
  const x=f%2?126:90,dir=f%2?1:-1;
  path.push(point(x,f*40,-dir*80));
  for(let i=1;i<=16;i++)path.push(point(x,f*40+i*2.5,-dir*80+dir*(i-.5)*10));
  path.push(point(x,(f+1)*40,dir*80));
 }
 if(level)path.push(point(56,level*40,level%2?-80:80),point(56,level*40,level%2?-56:56));
 return up?path:path.reverse();
}
const groundBench=()=>[point(90,0,124),point(-94,0,124)];
function descend(actor){
 const level=Math.round(actor.y/40);if(!level)return[actor,point(actor.x,0,124),{...bench}];
 const z=level%2?-56:56;
 const entry=point(56,actor.y,z);
 return[...ringRoute(actor,entry),...stairRoute(level,false),...groundBench()];
}
function jobPlanBase(s,type){
 const floor=s.levels+1,base=s.levels*40;
 if(type==='RETURN'&&s.version>=2)return {route:Math.abs(s.actor.x)<42&&Math.abs(s.actor.z)<42?[s.actor,point(56,s.actor.y,s.actor.z),...descend(point(56,s.actor.y,s.actor.z))]:descend(s.actor),work:0,end:{...bench},label:'地上へもどる'};
 if(type==='RETURN')return {route:[s.actor,point(56,s.actor.y,0),...descend(point(56,s.actor.y,0))],work:0,end:{...bench},label:'地上へもどる'};
 if(type==='MAKE')return {route:descend(s.actor),work:3,end:{...bench},label:s.version===4?'地上で柱・梁・壁・床をつくる':'地上で柱・梁・床をつくる'};
 if(type==='LIFT')return {route:descend(s.actor),work:2+base/30,end:{...bench},label:base?'リフトで部材を上げる':'リフトに部材をのせる'};
 if(type==='BUILD'){
  const route=[...descend(s.actor),...groundBench().reverse(),...stairRoute(s.levels),point(56,base,56),point(56,base,28)];
  const steps=highAssembly(floor,s);return {route,work:steps.reduce((n,p)=>n+p.walk+p.place,0),end:steps.at(-1).stance,label:floor+(s.version===4?'階の柱・梁・壁・床を組む':'階の柱・梁・床を組む')};
 }
 if(type==='DISMANTLE'){
  assert(s.levels>0&&!s.kit,'地上の部材を先にもどしてから片付けよう。');
  const level=s.levels,base=(level-1)*40,steps=highDisassembly(level,s),take=steps.reduce((n,p)=>n+p.walk+p.place,0),returnRoute=descend(steps.at(-1).stance),lower=2+base/30;
  const route=[...(s.actor.y?highJobPlan(s,'RETURN').route:descend(s.actor)),...groundBench().reverse(),...stairRoute(level-1),point(56,base,56),point(56,base,28)];
  return{route,work:take+highRouteSeconds(returnRoute)+lower,end:{...bench},take,returnRoute,lower,label:level+'階を片付けて、木材を地上へおろす'};
 }
 if(type==='VISIT'&&s.version>=2){const end=highRoofPoint(s);assert(end,'屋上へ登るには2×2マス以上の足場が必要だよ。');return{route:[...descend(s.actor),...groundBench().reverse(),...stairRoute(highFloors(s)),point(56,end.y,end.z),end],work:0,end,label:'完成した建物へ登る'};}
 if(type==='VISIT'){
  const from=s.actor.y===80?[s.actor,point(56,80,56),point(56,80,80),point(90,80,80),...stairRoute(3).filter(p=>p.y>80)]:[s.actor,...groundBench().reverse(),...stairRoute(3)];
  return {route:[...from,point(56,120,0),point(0,120,0)],work:0,end:point(0,120,0),label:'完成した見晴らし台へ登る'};
 }
 throw Error('その作業は見つからないよ。');
}
const scaledPoint=(p,k)=>({...p,x:p.x*k,z:p.z*k});
function unitState(s){const blueprint={...s.blueprint};delete blueprint.interiorStairs;delete blueprint.stairPlacement;delete blueprint.boardBay;delete blueprint.upperBoardBay;return{...s,version:blueprint.walls?4:3,blueprint,actor:scaledPoint(s.actor,.5)};}
const workPlans=new Map();function workPlan(s,type){const key=JSON.stringify([type,s.version,s.levels,s.blueprint,s.boardBayRetrofit,s.roomLayout,s.actor,s.station,s.job?.station]);if(workPlans.has(key))return workPlans.get(key);let p;if(type==='WORK_VISIT'&&s.actor.y>0&&(Math.abs(s.actor.x)>64||Math.abs(s.actor.z)>64)){const down=highJobPlan({...s,station:undefined,accessVersion:undefined},'RETURN'),up=highWorkVisitPlan({...s,actor:down.end});p={...up,route:[...down.route,...up.route.slice(1)]};}else p=type==='WORK_VISIT'?highWorkVisitPlan(s):highWorkReturnPlan(s);p.route.forEach(Object.freeze);Object.freeze(p.route);Object.freeze(p.end);Object.freeze(p);if(workPlans.size>=64)workPlans.clear();workPlans.set(key,p);return p;}
export function highExteriorPaintRoute(s,stance){const bench={x:-188,y:0,z:248,heading:Math.PI},corner={x:112,y:s.actor.y,z:112,heading:0};if(!stance)return fastRoute([...ringRoute(s.actor,corner,2),...descend(scaledPoint(corner,.5)).slice(1).map(p=>scaledPoint(p,2))]);if(s.paintStation){const from=Math.round(s.actor.y/40),to=Math.round(stance.y/40);if(from===to)return fastRoute(ringRoute(s.actor,stance,2));const steps=stairRoute(Math.max(from,to)),sg=f=>f%2?-1:1,at=f=>f?steps.findIndex(p=>p.y===f*40&&p.z===sg(f)*80&&p.x===(f%2?90:126)):0,a=at(from),b=at(to),spine=(a<=b?steps.slice(a,b+1):steps.slice(b,a+1).reverse()).map(p=>scaledPoint(p,2)),start=from?{x:112,y:from*40,z:sg(from)*112}:{x:112,y:0,z:112},finish=to?{x:112,y:to*40,z:sg(to)*112}:{x:112,y:0,z:112},route=[...ringRoute(s.actor,start,2)];if(from)route.push({x:112,y:from*40,z:sg(from)*160});route.push(...spine);if(to)route.push({x:112,y:to*40,z:sg(to)*160});route.push(finish,...ringRoute(finish,stance,2).slice(1));return fastRoute(route);}
 const down=s.actor.y>0?highJobPlan(s,'RETURN').route:[s.actor,bench],level=Math.round(stance.y/40),up=[...groundBench().reverse(),...stairRoute(level)].map(p=>scaledPoint(p,2));if(!level)up.push({x:112,y:0,z:112});return fastRoute([...down,...up,...ringRoute(up.at(-1),stance,2).slice(1)]);}
const bayPlanCache=new Map(),bayWalkCache=new WeakMap();
export function highJobPlan(s,type){const plan=highJobPlanRaw(s,type);if(!(s.boardBayRetrofit?.version>=2||boardBayRetrofitJobs.has(type)&&Object.hasOwn(s.job??{},'bayLevel'))||!boardBaySupports(s).length&&!boardBayLevels(s).length)return plan;if(bayWalkCache.has(plan))return bayWalkCache.get(plan);const route=[];for(const p of plan.route){const a=route.at(-1);if(a&&a.y===0&&p.y===0&&a.z===248&&p.z===248&&Math.abs(a.x-p.x)>1&&Math.min(a.x,p.x)<=80&&Math.max(a.x,p.x)>=-16)route.push({...a,z:s.boardBayRetrofit?.version===3||s.job?.bayVersion===3?256:258},{...p,z:s.boardBayRetrofit?.version===3||s.job?.bayVersion===3?256:258});route.push(p);}if(route.length===plan.route.length)return plan;const next=Object.freeze({...plan,route:Object.freeze(fastRoute(route.map(p=>Object.freeze({...p}))))});bayWalkCache.set(plan,next);return next;}
function highJobPlanRaw(s,type){
 if(boardBayRetrofitJobs.has(type)){const p=boardBayRetrofitPlan(s,type);if(!Object.hasOwn(s.job??{},'bayLevel'))return{...p,route:fastRoute(p.route)};const key=JSON.stringify([type,s.actor,s.blueprint,s.boardBayRetrofit,s.roomLayout,s.job.bayLevel,s.job.bayVersion]);if(bayPlanCache.has(key))return bayPlanCache.get(key);const route=s.job.bayLevel?highExteriorPaintRoute(s.actor.y>0?{...s,paintStation:true}:s,p.end):p.route,plan=Object.freeze({...p,end:Object.freeze({...p.end}),target:Object.freeze({...p.target}),route:Object.freeze(fastRoute(route.map(p=>Object.freeze({...p}))))});if(bayPlanCache.size>=64)bayPlanCache.clear();bayPlanCache.set(key,plan);return plan;}
 if(type==='ROOM_LAYOUT_EDIT'){const p=roomLayoutPlan(s,s.job.edit);return{...p,route:fastRoute(p.route)};}
 if(type==='RETURN'&&s.interiorLayoutStation)return{route:fastRoute(roomPaintRoute(s)),work:0,end:point(-188,0,248,Math.PI),label:'内階段で地上へもどる'};
 if(doorJob(type))return{route:[s.actor],work:['DOOR_OPEN','DOOR_CLOSE'].includes(type)?.6:1.5,end:{...s.actor},label:type==='DOOR_INSTALL'?'入口に引き戸をつける':type==='DOOR_REMOVE'?'引き戸を片付ける':type==='DOOR_OPEN'?'とびらをあける':'とびらをしめる'};
 if(type==='DOOR_VISIT'&&stairPlacement(s)){const end=stairDoor(s),route=stairApproach(s,s.actor);return{route:fastRoute([...route.slice(0,-1),end]),work:0,end,label:'入口のとびらへ歩く'};}
 if(type==='DOOR_VISIT')return{route:fastRoute([s.actor,point(s.actor.x,0,248),point(-48,0,248),point(-48,0,104,Math.PI)]),work:0,end:point(-48,0,104,Math.PI),label:'入口のとびらへ歩く'};
 if(type==='ROOM_PAINT_VISIT')return{route:fastRoute(roomPaintRoute(s,s.job.surface)),work:0,end:buildingPaintStance(s,s.job.surface),label:s.job.surface.decor?(s.job.surface.target.floor===s.levels?'屋上のぬる場所へ歩く':s.job.surface.level+'階のぬる場所へ歩く'):s.job.surface.level+'階の室内へ歩く'};
 if(type==='RETURN'&&s.interiorPaintStation)return{route:fastRoute(roomPaintRoute(s)),work:0,end:point(-188,0,248,Math.PI),label:'内階段で地上へもどる'};
 if(type==='PAINT_VISIT'){const end=buildingPaintStance(s,s.job.surface);return{route:highExteriorPaintRoute(s,end),work:0,end,label:s.job.surface.level+'階の塗る場所へ歩く'};}
 if(type==='RETURN'&&s.paintStation)return{route:highExteriorPaintRoute(s),work:0,end:{x:-188,y:0,z:248,heading:Math.PI},label:'同じ足場で地上へもどる'};
 if(type==='WORK_VISIT'){const plan=workPlan(s,type);return{...plan,route:fastRoute(plan.route)};}
 if(type==='RETURN'&&s.accessVersion===1&&s.station&&s.actor.y>0){const plan=workPlan(s,type);return{...plan,route:fastRoute(plan.route)};}
 if(highPlanScale(s)!==2)return jobPlanBase(s,type);
 const end=scaledPoint(bench,2),inside=highInsideActor(s),level=Math.round(s.actor.y/40),unit=unitState(s);
 if(stairPlacement(s)&&type==='RETURN'&&inside){const e=stairExit(s,s.actor.y),entry=stairEntry(s,s.actor.y),walk=roomGraphRoute(s,s.actor,entry);assert(walk,'階段への通り道をあけよう。');return{route:fastRoute([...walk,e,...highStairSpine(s,level,0).slice(1),...stairApproach(s,end).reverse().slice(1)]),work:0,end,label:'内階段で地上へもどる'};}
 if(stairPlacement(s)&&type==='VISIT'){const down=s.actor.y?highJobPlan(s,'RETURN').route:[],start=down.length?down.at(-1):s.actor,roof=highRoofPoint(s),e=stairExit(s,highFloors(s)*40),entry=stairEntry(s,highFloors(s)*40),walk=roomGraphRoute(s,entry,roof);assert(walk,'階段から屋上へ出る床をあけよう。');return{route:fastRoute([...down,...stairApproach(s,start),...highStairSpine(s,0,highFloors(s)).slice(1),entry,...walk.slice(1)]),work:0,end:roof,label:'自分で置いた内階段を登る'};}
 if(type==='RETURN'&&inside)return{route:fastRoute([s.actor,point(32,s.actor.y,56),point(-14,s.actor.y,56),...highInnerRoute(level).reverse(),point(-48,0,248),end]),work:0,end,label:'内階段で地上へもどる'};
 if(type==='VISIT'){const route=s.actor.y?highJobPlan(s,'RETURN').route:[s.actor,point(s.actor.x,0,248),end];const roof=highRoofPoint(s);return{route:fastRoute([...route,point(-48,0,248),...highInnerRoute(highFloors(s)),point(32,roof.y,56),roof]),work:0,end:roof,label:'内階段で建物へ登る'};}
 const approach=inside?highJobPlan(s,'RETURN').route:[],base=jobPlanBase(inside?{...unit,actor:{...bench}}:unit,type),route=fastRoute([...approach,...base.route.map(p=>scaledPoint(p,2))]);
 if(type==='BUILD'){const steps=highAssembly(s.levels+1,s);return{...base,route,work:steps.reduce((n,p)=>n+p.walk+p.place,0),end:steps.at(-1).stance,label:(s.levels+1)+'階の柱・内階段・壁・床を組む'};}
 if(type==='DISMANTLE'){const steps=highDisassembly(s.levels,s),take=steps.reduce((n,p)=>n+p.walk+p.place,0),returnRoute=fastRoute(jobPlanBase({...unit,actor:scaledPoint(steps.at(-1).stance,.5)},'RETURN').route.map(p=>scaledPoint(p,2)));return{...base,route,take,returnRoute,work:take+highRouteSeconds(returnRoute)+base.lower,end};}
 return{...base,route,end:scaledPoint(base.end,2)};
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const perimeter=p=>p.z===-56?p.x+56:p.x===56?112+p.z+56:p.z===56?224+56-p.x:336+56-p.z;
const onRing=(t,y)=>{t=(t%448+448)%448;return t<=112?point(t-56,y,-56):t<=224?point(56,y,t-168):t<=336?point(280-t,y,56):point(-56,y,392-t);};
function ringRoute(a,b,scale=1){
 if(scale!==1)return fastRoute(ringRoute(scaledPoint(a,1/scale),scaledPoint(b,1/scale)).map(p=>scaledPoint(p,scale)));
 const start=perimeter(a),end=perimeter(b),forward=(end-start+448)%448,delta=forward<=224?forward:forward-448,route=[a],steps=Math.max(1,Math.ceil(Math.abs(delta)/4));
 for(let i=1;i<=steps;i++)route.push(onRing(start+delta*i/steps,a.y));return route;
}
const assemblyByLevel=new Map();
export function highAssembly(level,state){
 const key=highShapeKey(state)+level;if(assemblyByLevel.has(key))return assemblyByLevel.get(key);
 const scale=highPlanScale(state);let from=point(56*scale,(level-1)*40,28*scale);const steps=[];
 const stanceFor=part=>state?.version>=2?(Math.abs(part.x)>=Math.abs(part.z)?point(Math.sign(part.x||1)*56*scale,from.y,part.z):point(part.x,from.y,Math.sign(part.z||1)*56*scale)):(part.x?point(Math.sign(part.x)*56,from.y,part.z):point(0,from.y,Math.sign(part.z)*56));
 const parts=[...highBuildingParts(level,state)];
 // Walk once around each group of posts/beams/floors instead of crossing the site.
 if(state?.version>=2)parts.sort((a,b)=>({column:0,beam:1,stair:2,wall:3,floor:4}[a.kind]-{column:0,beam:1,stair:2,wall:3,floor:4}[b.kind])||perimeter(scaledPoint(stanceFor(a),1/scale))-perimeter(scaledPoint(stanceFor(b),1/scale)));
 for(const part of parts){
  const stance=stanceFor(part);
  const route=ringRoute(from,stance,scale);steps.push({part,stance,route,walk:highRouteSeconds(route),place:state?.version>=2?.18:.7});from=stance;
 }
 // Layouts are immutable. Reuse their supported walk paths per frame.
 for(const step of steps){Object.freeze(step.part);Object.freeze(step.stance);step.route.forEach(Object.freeze);Object.freeze(step.route);Object.freeze(step);}
 Object.freeze(steps);if(assemblyByLevel.size>=48)assemblyByLevel.clear();assemblyByLevel.set(key,steps);return steps;
}
const disassemblyByLevel=new Map();
export function highDisassembly(level,state){
 const key=highShapeKey(state)+'/'+level;if(disassemblyByLevel.has(key))return disassemblyByLevel.get(key);
 const scale=highPlanScale(state);let from=point(56*scale,(level-1)*40,28*scale);const steps=[];
 for(const original of [...highAssembly(level,state)].reverse()){
  const stance={...original.stance},route=ringRoute(from,stance,scale),step={part:original.part,stance,route,walk:highRouteSeconds(route),place:state?.version>=2?.18:.7};
  Object.freeze(stance);route.forEach(Object.freeze);Object.freeze(route);steps.push(Object.freeze(step));from=stance;
 }
 Object.freeze(steps);if(disassemblyByLevel.size>=48)disassemblyByLevel.clear();disassemblyByLevel.set(key,steps);return steps;
}
export function highDisassemblyAt(level,time,state){return stepsAt(highDisassembly(level,state),time);}
export function highAssemblyAt(level,time,state){return stepsAt(highAssembly(level,state),time);}
function stepsAt(steps,time){
 let completed=0;
 for(const step of steps){if(time<=step.walk+step.place)return{...step,completed,moving:time<step.walk,actor:routeAt(step.route,Math.min(time,step.walk)),progress:Math.max(0,(time-step.walk)/step.place)};time-=step.walk+step.place;completed++;}
 return {...steps.at(-1),completed:steps.length,moving:false,actor:steps.at(-1).stance,progress:1};
}
export function highRouteSeconds(route){return route.reduce((n,b,i)=>n+(i?distance(route[i-1],b)/(routeSpeeds.get(route)??HIGH.runSpeed):0),0);}
function routeAt(route,time){
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],seconds=distance(a,b)/(routeSpeeds.get(route)??HIGH.runSpeed);if(time<=seconds){const f=seconds?time/seconds:1;return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,heading:b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z)};}time-=seconds;}return{...route.at(-1)};
}
export function highActorAt(s){
 if(!s.job)return s.actor;
 let t=s.job.elapsed;const plan=highJobPlan(s,s.job.type),route=plan.route;
 if(plan.delivery?.version===2){const motion=roomDeliveryMotion(s,plan);if(motion.stop)return{...route[motion.stop.index],heading:motion.stop.heading};t=motion.time;}
 else if(plan.delivery&&t>=plan.delivery.pickupTime){if(t<plan.delivery.pickupTime+ROOM_KIT_PICKUP_SECONDS)return{...route[plan.delivery.pickupIndex]};t-=ROOM_KIT_PICKUP_SECONDS;}
 for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],seconds=distance(a,b)/(routeSpeeds.get(route)??HIGH.runSpeed);if(t<=seconds){const f=seconds?t/seconds:1;return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,heading:b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z)};}t-=seconds;}
 if(s.job.type==='DISMANTLE'){
  if(t<=plan.take){const step=highDisassemblyAt(s.levels,t,s),a=step.actor;return{...a,heading:step.moving?a.heading:Math.atan2(step.part.x-a.x,step.part.z-a.z)};}
  return routeAt(plan.returnRoute,Math.min(t-plan.take,highRouteSeconds(plan.returnRoute)));
 }
 if(s.job.type==='BUILD'){const step=highAssemblyAt(s.levels+1,t,s),a=step.actor;return{...a,heading:step.moving?a.heading:Math.atan2(step.part.x-a.x,step.part.z-a.z)};}
 return {...plan.end,heading:plan.end.heading??0};
}
const core=s=>({...(s.boardBayRetrofit?{boardBayRetrofit:structuredClone(s.boardBayRetrofit)}:{}),levels:s.levels,kit:s.kit,stock:{...s.stock},...(s.roomLayout?{layout:structuredClone(s.roomLayout)}:{}),...(s.entranceDoor?{door:structuredClone(s.entranceDoor)}:{})});
export function newHighBuild(blueprint){if(blueprint){validateHighShape(blueprint);assertStairConstruction(blueprint);const version=blueprint.interiorStairs?5:blueprint.walls?4:blueprint.storeys?3:2;return{format:HIGH_FORMAT,scope:HIGH_SCOPE,version,revision:0,blueprint:structuredClone(blueprint),stock:highRemainingStock({version,blueprint}),levels:0,kit:null,actor:{...bench},job:null,history:[]};}return {format:HIGH_FORMAT,scope:HIGH_SCOPE,version:1,revision:0,stock:{...stockStart},levels:0,kit:null,actor:{...bench},job:null,history:[]};}
function validCore(s,owner=s){
 validateBoardBayRetrofit({...owner,levels:s.levels,kit:s.kit},s.boardBayRetrofit??null);
 if(s.layout!==undefined&&s.layout!==null){validateRoomLayout(s.layout,highFloors(owner),owner);for(const i of s.layout.items)if(i.kind==='wallDoor')wallDoorHost({...owner,levels:s.levels,roomLayout:s.layout,boardBayRetrofit:s.boardBayRetrofit??undefined},i);assert(s.levels===highFloors(owner)&&!s.kit,'内装を先に片付けよう。');}if(s.door!==undefined&&s.door!==null)validateEntranceDoor(s.door);const total=highFloors(owner),remaining=highRemainingStock(owner,s.levels,s.kit);
 assert(Number.isInteger(s.levels)&&s.levels>=0&&s.levels<=total,'建物の段階が読めないよ。');
 assert([null,'made','raised'].includes(s.kit)&&!(s.levels===total&&s.kit),'部材の記録が読めないよ。');
 for(const k of Object.keys(cost))assert(s.stock[k]===remaining[k],'材料の数が合わないため、そのまま保護したよ。');
}
export function highNextAction(s){return s.interiorLayoutStation||s.paintStation||s.interiorPaintStation?'RETURN':s.accessVersion===1&&s.actor.y>0?'RETURN':s.levels===highFloors(s)?(s.actor.y===highFloors(s)*40?'RETURN':highRoofPoint(s)?'VISIT':s.actor.y>0?'RETURN':'DONE'):s.kit==='raised'?'BUILD':s.kit==='made'?'LIFT':'MAKE';}
export function highIsRecovering(s){return !!s&&(s.job?s.job.type==='DISMANTLE':!s.kit&&(s.history.at(-1)?.levels??s.levels)>s.levels);}
function allowed(s,type){if(s.craneKit)return false;if(boardBayRetrofitJobs.has(type)){try{boardBayRetrofitPlan(s,type);return true;}catch{return false;}}if(type==='DISMANTLE'&&s.boardBayRetrofit)return false;if(type==='ROOM_LAYOUT_EDIT')return s.version===5&&s.levels===highFloors(s)&&!s.kit;if(type==='DISMANTLE'&&s.roomLayout?.items.length)return false;if(doorJob(type))return doorStepAllowed({...s,job:null},type);if(type==='DOOR_VISIT')return s.version===5&&s.levels===highFloors(s)&&!s.kit&&s.actor.y===0;if(type==='DISMANTLE'&&s.entranceDoor)return false;if(type==='ROOM_PAINT_VISIT')return s.version===5&&s.levels===highFloors(s)&&!s.kit;return type==='PAINT_VISIT'&&s.version===5&&s.levels===highFloors(s)&&!s.kit||type==='WORK_VISIT'&&s.version===5&&s.levels===highFloors(s)&&!s.kit||type!=='DONE'&&type===highNextAction(s)||(type==='RETURN'&&(s.actor.y>0||s.paintStation))||(type==='DISMANTLE'&&s.levels>0&&!s.kit);}
export function validateHighBuild(s){
 assert(s?.format===HIGH_FORMAT&&s.scope===HIGH_SCOPE&&[1,2,3,4,5].includes(s.version),'この見晴らし台の保存ではないよ。');
 assert(Number.isSafeInteger(s.revision)&&s.revision>=0,'保存の番号が読めないよ。');if(s.version>=2){validateHighShape(s.blueprint);assertStairConstruction(s.blueprint);assert(s.version===(s.blueprint.interiorStairs?5:s.blueprint.walls?4:s.blueprint.storeys?3:2),'建物の形の記録を保護したよ。');}validCore(s);if(Object.hasOwn(s,'kitModelVersion'))assert(s.kitModelVersion===1,'建築キットの形を保護したよ。');if(Object.hasOwn(s,'craneKit'))assert(s.kit==='made'&&!s.job&&s.actor.y===0&&s.kitModelVersion===1&&s.craneKit?.version===1&&Object.keys(s.craneKit).sort().join('|')==='partId|version'&&/^building-kit-[\w-]{8,96}$/.test(s.craneKit.partId),'クレーンで運んでいるキットを残そう。');if(Object.hasOwn(s,'boardBayRetrofit'))assert(s.boardBayRetrofit!==null,'搬入口の記録をたしかめよう。');validateBoardBayRetrofit(s);assertRoomLayout(s);if('interiorLayoutStation'in s)assert(s.interiorLayoutStation===true&&s.version===5,'おへやの場所をたしかめよう。');if(s.job?.type==='ROOM_LAYOUT_EDIT'){assert(Object.keys(s.job).sort().join('|')==='edit|elapsed|type|walkSeconds','おへやの途中記録を保護したよ。');const p=roomLayoutPlan(s,s.job.edit);assert(Math.abs(highRouteSeconds(fastRoute(p.route))-s.job.walkSeconds)<1e-8,'歩く道の時間をたしかめよう。');}
 if('entranceDoor'in s){validateEntranceDoor(s.entranceDoor);assert(s.version===5&&s.levels===highFloors(s),'とびらを先に片付けよう。');}if('interiorPaintStation'in s){validatePaintSurface(s,s.interiorPaintStation);assert(s.interiorPaintStation.interior===true,'室内の場所をたしかめよう。');}if(s.job?.type==='ROOM_PAINT_VISIT'){assert(Object.keys(s.job).sort().join('|')==='elapsed|surface|type'&&s.job.surface.interior===true,'室内の場所をえらび直そう。');validatePaintSurface(s,s.job.surface);}
 if('paintStation'in s){assert(!s.paintStation.interior,'外側の塗装位置をたしかめよう。');validatePaintSurface(s,s.paintStation);assert(s.paintStation.level<=s.levels,'塗る階をたしかめよう。');}if(s.job?.type==='PAINT_VISIT'){assert(Object.keys(s.job).sort().join('|')==='elapsed|surface|type','塗る場所をえらび直そう。');validatePaintSurface(s,s.job.surface);}
 if('roomMotion'in s)assert(s.roomWalkVersion===1,'ジャンプの記録を保護したよ。');if('roomWalkVersion'in s)assertRoomWalking(s);
 if('accessVersion'in s)assert(s.version===5&&s.accessVersion===1,'階の通り道の記録を保護したよ。');if('station'in s){validateHighStation(s,s.station);assert(s.accessVersion===1&&s.station.floor<=s.levels,'作業する階をたしかめよう。');}if(s.job?.type==='WORK_VISIT'){assert(Object.keys(s.job).sort().join('|')==='elapsed|station|type'&&s.accessVersion===1,'移動先の記録を保護したよ。');highWorkTarget(s,s.job.station);}
 assert(s.actor&&['x','y','z','heading'].every(k=>Number.isFinite(s.actor[k]))&&Math.abs(s.actor.x)<=190*highPlanScale(s)&&Math.abs(s.actor.z)<=150*highPlanScale(s)&&(s.roomWalkVersion===1||Number.isInteger(s.actor.y/40))&&s.actor.y>=0&&s.actor.y<=highFloors(s)*40+(s.roomMotion?ROOM_JUMP_RISE:0)&&(s.roomWalkVersion===1||Math.abs(highSurface(s.actor.x,s.actor.z,s.actor.y,s.levels,s)-s.actor.y)<.01),'モンスターの足場が読めないよ。');
 assert(Array.isArray(s.history)&&s.history.length<=10,'もどす記録が読めないよ。');s.history.forEach(c=>validCore(c,s));
 const chain=[...s.history,core(s)];for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i];assert(equal(a.boardBayRetrofit??null,b.boardBayRetrofit??null)||a.levels===b.levels&&a.kit===b.kit&&equal(a.stock,b.stock)&&equal(a.layout??null,b.layout??null)&&equal(a.door??null,b.door??null)&&boardBayRetrofitStep(a.boardBayRetrofit,b.boardBayRetrofit),'搬入口の作業の順番をたしかめよう。');assert(
  a.kit===null&&a.levels<highFloors(s)&&b.levels===a.levels&&b.kit==='made'||
  a.kit==='made'&&b.levels===a.levels&&b.kit==='raised'||
  a.kit==='raised'&&b.levels===a.levels+1&&b.kit===null||
  a.kit===null&&a.levels>0&&b.levels===a.levels-1&&b.kit===null||a.levels===b.levels&&a.kit===b.kit&&equal(a.stock,b.stock)&&(!!a.door!==!!b.door||!equal(a.layout??null,b.layout??null)||!equal(a.boardBayRetrofit??null,b.boardBayRetrofit??null)),'作業の順番が合わないよ。');}
 if(s.job){if(boardBayRetrofitJobs.has(s.job.type))assert(Object.keys(s.job).sort().join('|')===(s.job.bayVersion===3?'bayLevel|bayVersion|elapsed|type':Object.hasOwn(s.job,'bayLevel')?'bayLevel|elapsed|type':'elapsed|type'),'搬入口の途中記録を保護したよ。');assert(allowed(s,s.job.type),'途中の作業が合わないよ。');const p=highJobPlan(s,s.job.type),d=highRouteSeconds(p.route)+p.work;assert(Number.isFinite(s.job.elapsed)&&s.job.elapsed>=0&&s.job.elapsed<=d,'途中の時間が読めないよ。');}
 return s;
}
export function beginTallBoardBayRetrofit(s,type,level){validateHighBuild(s);assert(boardBayRetrofitJobs.has(type)&&Number.isInteger(level)&&level>=0&&level<Math.min(6,s.levels)&&!s.job&&!s.roomWalkVersion&&!s.interiorLayoutStation&&!s.interiorPaintStation&&!s.paintStation&&(s.actor.y===0||s.actor.y===level*40&&s.actor.z===112&&[32,96].includes(s.actor.x)),'作業を終え、改造する階をえらぼう。');const n={...s,revision:s.revision+1,job:{type,elapsed:0,bayLevel:level,bayVersion:3}};boardBayRetrofitPlan(n,type);return validateHighBuild(n);}
export function beginBoardBayRetrofit(s,type,level){validateHighBuild(s);assert(boardBayRetrofitJobs.has(type)&&[0,1].includes(level)&&!s.job&&!s.roomWalkVersion&&!s.interiorLayoutStation&&!s.interiorPaintStation&&!s.paintStation&&(s.actor.y===0||s.actor.y===level*40&&s.actor.z===112&&[32,96].includes(s.actor.x)),'先に作業を終え、地上へ戻ってから改造する階をえらぼう。');const n={...s,revision:s.revision+1,job:{type,elapsed:0,bayLevel:level}};boardBayRetrofitPlan(n,type);return validateHighBuild(n);}
export function beginHighRoomLayout(s,edit){assert(!s.roomWalkVersion,'広い床で「道具をひらく」を押してから作業しよう。');validateHighBuild(s);return validateHighBuild(beginRoomLayoutEdit(s,edit));}
export function beginHighJob(s,type=highNextAction(s)){assert(!s.roomWalkVersion,'広い床で「道具をひらく」を押してから作業しよう。');assert(!['ROOM_LAYOUT_EDIT','WORK_VISIT','PAINT_VISIT','ROOM_PAINT_VISIT'].includes(type),'作業する場所をえらんでから歩こう。');validateHighBuild(s);assert(!s.interiorLayoutStation||type==='RETURN','先に室内から地上へもどろう。');assert(!s.interiorPaintStation||type==='RETURN','先に室内から地上へもどろう。');assert(!s.paintStation||type==='RETURN','先に足場から地上の作業台へもどろう。');assert(!s.job&&allowed(s,type),'今の作業を終えてから進もう。');assert(!entranceDoorWaits(s)||doorJob(type)||type==='DOOR_VISIT','先に入口のとびらをあけよう。');return {...s,revision:s.revision+1,job:{type,elapsed:0}};}
export function beginHighWorkVisit(s,station){assert(!s.roomWalkVersion,'広い床で「道具をひらく」を押してから作業しよう。');validateHighBuild(s);assert(!s.interiorLayoutStation||s.actor.y>0,'先に室内の通り道で入口へもどろう。');assert(!s.job&&allowed(s,'WORK_VISIT'),'建物を完成させてから、つくる場所をえらぼう。');assert(!s.interiorPaintStation,'先に室内の塗装を終えて地上へもどろう。');assert(!entranceDoorWaits(s),'先に入口のとびらをあけよう。');highWorkTarget(s,station);const n={...s,accessVersion:1,revision:s.revision+1,job:{type:'WORK_VISIT',elapsed:0,station:structuredClone(station)}};highJobPlan(n,'WORK_VISIT');return validateHighBuild(n);}
export function beginHighPaintVisit(s,surface){assert(!s.roomWalkVersion,'広い床で「道具をひらく」を押してから作業しよう。');validateHighBuild(s);assert(!s.interiorLayoutStation,'先に室内の通り道で入口へもどろう。');assert(!s.job&&allowed(s,'PAINT_VISIT'),'建物を完成させてから色をぬろう。');validatePaintSurface(s,surface);assert(!surface.interior,'室内をぬる入口から歩こう。');assert(!s.interiorPaintStation,'先に室内の塗装を終えて地上へもどろう。');const n={...s,revision:s.revision+1,job:{type:'PAINT_VISIT',elapsed:0,surface:structuredClone(surface)}};highJobPlan(n,'PAINT_VISIT');return validateHighBuild(n);}
export function beginRoomPaintVisit(s,surface){assert(!s.roomWalkVersion,'広い床で「道具をひらく」を押してから作業しよう。');validateHighBuild(s);assert(!s.job&&allowed(s,'ROOM_PAINT_VISIT')&&surface.interior===true,'建物を完成させてから室内をぬろう。');assert(!s.paintStation,'先に外の足場から地上へもどろう。');assert(!entranceDoorWaits(s),'先に入口のとびらをあけよう。');validatePaintSurface(s,surface);const n={...s,accessVersion:1,revision:s.revision+1,job:{type:'ROOM_PAINT_VISIT',elapsed:0,surface:structuredClone(surface)}};highJobPlan(n,'ROOM_PAINT_VISIT');return validateHighBuild(n);}
export function advanceHighJob(s,dt){
 assert(s.job&&Number.isFinite(dt)&&dt>=0&&dt<=.1,'作業の時間が不正です。');
 const p=highJobPlan(s,s.job.type),duration=highRouteSeconds(p.route)+p.work;
 return {...s,job:{...s.job,elapsed:Math.min(duration,s.job.elapsed+dt)}};
}
export function highJobReady(s){if(!s.job)return false;const p=highJobPlan(s,s.job.type);return s.job.elapsed>=highRouteSeconds(p.route)+p.work;}
export function finishHighJob(s){
 validateHighBuild(s);assert(highJobReady(s),'作業中だよ。');const type=s.job.type,n=structuredClone(s);
 if(!['VISIT','RETURN','WORK_VISIT','PAINT_VISIT','ROOM_PAINT_VISIT','DOOR_VISIT','DOOR_OPEN','DOOR_CLOSE'].includes(type))n.history=[...s.history,{...core(s),...(boardBayRetrofitJobs.has(type)&&!s.boardBayRetrofit?{boardBayRetrofit:null}:{}),...(type==='DOOR_INSTALL'?{door:null}:{}),...(type==='ROOM_LAYOUT_EDIT'&&!s.roomLayout?{layout:null}:{})}].slice(-10);
 if(type==='ROOM_LAYOUT_EDIT'){n.roomLayout=roomLayoutPlan(s,s.job.edit).layout;n.interiorLayoutStation=true;delete n.paintStation;delete n.interiorPaintStation;delete n.station;}
 if(type==='DOOR_INSTALL')n.entranceDoor={version:1,open:true};if(type==='DOOR_REMOVE')delete n.entranceDoor;if(type==='DOOR_OPEN')n.entranceDoor.open=true;if(type==='DOOR_CLOSE')n.entranceDoor.open=false;
 if(type==='ROOM_PAINT_VISIT'){delete n.interiorLayoutStation;n.interiorPaintStation=structuredClone(s.job.surface);delete n.paintStation;delete n.station;}
 if(type==='WORK_VISIT'){delete n.interiorLayoutStation;n.station=structuredClone(s.job.station);delete n.paintStation;}if(type==='PAINT_VISIT'){delete n.interiorLayoutStation;n.paintStation=structuredClone(s.job.surface);delete n.station;}if(type==='RETURN'){delete n.interiorLayoutStation;delete n.paintStation;delete n.interiorPaintStation;}
 if(boardBayRetrofitJobs.has(type)){const next=boardBayRetrofitAfter(s,type);if(next)n.boardBayRetrofit=next;else delete n.boardBayRetrofit;}
 if(type==='MAKE'){n.kit='made';for(const k of Object.keys(cost))n.stock[k]-=highRecipe(s)[k];}
 if(type==='LIFT')n.kit='raised';
 if(type==='BUILD'){n.levels++;n.kit=null;}
 if(type==='DISMANTLE'){const recipe=highRecipe(s,s.levels);n.levels--;if(n.station?.floor>n.levels)delete n.station;for(const k of Object.keys(cost))n.stock[k]+=recipe[k];}
 n.actor=highJobPlan(s,type).end;n.job=null;n.revision++;return validateHighBuild(n);
}
export function undoHighBuild(s){assert(!s.roomWalkVersion,'広い床で「道具をひらく」を押してから作業しよう。');
 validateHighBuild(s);assert(!s.craneKit,'先にキットを建物か元の作業台へ渡そう。');assert(!s.job&&s.history.length,'いまは戻せる作業がないよ。');const layoutUndo=Object.hasOwn(s.history.at(-1),'layout')&&s.history.at(-1).levels===s.levels&&s.history.at(-1).kit===s.kit&&!equal(s.history.at(-1).layout??null,s.roomLayout??null);assert(layoutUndo||boardBayUndoReady(s)||!(s.accessVersion===1&&s.actor.y>0)&&!(s.actor.y===highFloors(s)*40&&Math.abs(s.actor.x)<42*highPlanScale(s)&&Math.abs(s.actor.z)<42*highPlanScale(s)),'地上へもどってから、建物をもどそう。');
 const n={...s,...structuredClone(s.history.at(-1)),history:s.history.slice(0,-1),revision:s.revision+1};if(s.history.at(-1).door)n.entranceDoor=structuredClone(s.history.at(-1).door);else delete n.entranceDoor;delete n.door;if(s.history.at(-1).layout)n.roomLayout=structuredClone(s.history.at(-1).layout);else delete n.roomLayout;delete n.layout;if(!s.history.at(-1).boardBayRetrofit)delete n.boardBayRetrofit;assertRoomUndoSafe(n);if(n.station?.floor>n.levels)delete n.station;return validateHighBuild(n);
}
export const packHighBuild=s=>JSON.stringify(validateHighBuild(s));
export function unpackHighBuild(text){assert(typeof text==='string'&&text.length<=32768,'保存が大きすぎるよ。');return validateHighBuild(JSON.parse(text));}
