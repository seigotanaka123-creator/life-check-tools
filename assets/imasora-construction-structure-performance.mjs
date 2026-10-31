import{risers,pipeLinkParts}from'./imasora-construction-pipe-links.mjs?v=120pl';
import {vehicleAccessSurfaces,vehicleAccessProblem} from './imasora-construction-vehicle-access.mjs?v=120oz';
import {nativeSoilBearingHeight} from './imasora-construction-native-soil-layers.mjs?v=120pv';
import {nativeSoilLoads} from './imasora-construction-native-soil-loads.mjs?v=120pv';
import {assertNativeElevationWorld} from './imasora-construction-native-elevation.mjs?v=120pv';
import{chooseVehicleHeight}from'./imasora-construction-vehicle-elevation.mjs?v=120ov';
import{vehicleGroundFrame}from'./imasora-construction-vehicle-ground-frame.mjs?v=120ou';
import{rampItems,rampParts}from'./imasora-construction-reel-ramp.mjs?v=120oz';
import{roomLayoutParts}from'./imasora-construction-room-layout-shape.mjs';
import{evaluateLoadPaths,panelLoads}from'./imasora-construction-load-paths.mjs?v=120os';
import{furnitureParts,holdsWater}from'./imasora-construction-reel-furniture.mjs?v=120pl';
import{curedConcreteDecks}from'./imasora-construction-concrete-decks.mjs?v=120pv';
import{GIRDER_MATERIALS}from'./imasora-construction-girder-shape.mjs?v=120pl';
import{floorParts}from'./imasora-construction-reel-stairs.mjs?v=120pi';
import{levelParts}from'./imasora-construction-reel-levels.mjs?v=120pm';
import{highProjects,highWorldPoint,highLocalPoint}from'./imasora-construction-high-world.mjs?v=120pv';
import{highBuildingParts}from'./imasora-construction-high-build.mjs?v=120pv';
import{vehicleGroundPose as concreteGroundPose}from'./imasora-construction-concrete/free-vehicle-ground.mjs?v=120ov';
import{highFloorPieces}from'./imasora-construction-high-shape.mjs?v=120gn';
import{TIMBER_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
import{isCapturedConstructionJson}from'./imasora-construction-json-capture.mjs';
import{fleetVehicles,vehicleContactLoads,sameVehicle,sweptFleet}from'./imasora-construction-vehicle-loads.mjs?v=120oy';
import{nativeEarthHeightReader}from'./imasora-construction-native-dump-support.mjs?v=120pv';
import{worldSoilFloors}from'./imasora-construction-world-soil.js?v=120pv';
// Bounded game balance, not an engineering safety calculation. Performance is
// derived from the visible plate thickness and bearing layout; no tool bonus.
const EPS=.02,quarter=a=>Math.abs(a/(Math.PI/2)-Math.round(a/(Math.PI/2)))<.001;
const area=p=>p.w*p.d,deckCache=new WeakMap();
export function deckPerformance(panels,supports,{grounded=false,material='wood'}={}){
 const bearing=supports.filter(p=>['wall','column','beam'].includes(p.kind)),A=panels.reduce((n,p)=>n+area(p),0);let radius=0;
 for(const p of panels){const nx=Math.max(1,Math.ceil(p.w/16)),nz=Math.max(1,Math.ceil(p.d/16));for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++){const x=p.x-p.w/2+p.w*ix/nx,z=p.z-p.d/2+p.d*iz/nz;let distance=Infinity;for(const b of bearing)distance=Math.min(distance,Math.hypot(Math.max(0,Math.abs(x-b.x)-b.w/2),Math.max(0,Math.abs(z-b.z)-b.d/2)));radius=Math.max(radius,distance);}}
 const thickness=panels.length?Math.min(...panels.map(p=>p.h)):0,span=Math.max(8,radius*2),capacity=grounded?Infinity:Number.isFinite(span)?Math.floor(2*A*thickness*thickness*(material==='concrete'?2.1:material==='steel'?3:1)/(span*span)*100)/100:0;
 const actualGirders=[...new Map(bearing.filter(b=>b.girder).map(b=>[b.id+'/'+b.detailId,b])).values()],beamCapacity=actualGirders.length?actualGirders.reduce((n,b)=>n+600*12*16*16*GIRDER_MATERIALS[b.structuralMaterial].strength/(b.girderLength*b.girderLength),0):Infinity,usable=Math.min(capacity,beamCapacity);return{capacity:usable,span,thickness,material,selfLoad:A*thickness/768*(material==='concrete'?2.4:material==='steel'?7.8:1),area:A,bearings:bearing.length,grounded,label:grounded?'地面で支える床':usable>=35?'建材を置ける床':'軽いもの向きの床'};
}
export function reelDeck(r,rooms){const top=(r.y??0)+3,panels=floorParts(r),supports=rooms.filter(b=>b.id!==r.id&&(b.y??0)<(r.y??0)).flatMap(levelParts).filter(p=>Math.abs(p.y+p.h/2-(r.y??0))<EPS),grounded=!rooms.some(b=>b.id!==r.id&&(b.y??0)<(r.y??0)&&r.x0<b.x1&&r.x1>b.x0&&r.z0<b.z1&&r.z1>b.z0)&&(r.y??0)<=48;
 return{id:'reel-'+r.id,roomId:r.id,label:'リールの床 '+r.id,top,panels,supports,site:null,report:deckPerformance(panels,supports,{grounded,material:r.floorMaterial??'wood'})};}
export function structuralDecks(collection,world=null){if(world){const decks=structuralDecks(collection).map(d=>({...d,report:{...d.report}})),raw=[...decks],concrete=curedConcreteDecks(world).map(c=>({...c})).sort((a,b)=>a.base-b.base),weights=new Map();for(const c of concrete){const bases=c.grounded?[]:decks.filter(d=>c.panels.every(p=>deckFits(d,{...p,y:c.base})));c.baseDeck=bases.sort((a,b)=>b.report.capacity-a.report.capacity)[0];const root=rootDeck(c.baseDeck),mass=c.panels.reduce((n,p)=>n+p.w*p.h*p.d*2.4/768,0);c.selfLoad=mass;if(root)weights.set(root.id,(weights.get(root.id)??0)+mass);const supports=c.baseDeck?c.baseDeck.panels.map(p=>({...p,kind:'beam'})):[];decks.push(Object.assign(c,{supports,report:deckPerformance(c.panels,supports,{grounded:c.grounded,material:'concrete'})}));}for(const d of raw){d.report.capacity=Math.max(0,d.report.capacity-(weights.get(d.id)??0));d.report.concreteLoad=weights.get(d.id)??0;d.report.label=d.report.grounded?'地面で支える床':d.report.capacity>=35?'建材を置ける床':'軽いもの向きの床';}for(const c of concrete)if(!c.grounded)c.report.capacity=Math.min(c.report.capacity,c.baseDeck?.report.capacity??0);return decks;}const trusted=isCapturedConstructionJson(collection),cached=trusted?deckCache.get(collection):null;if(cached)return cached;const rooms=collection?.version===6?collection.reel?.rooms??[]:[],decks=rooms.map(r=>reelDeck(r,rooms));for(const project of highProjects(collection)){const r=project.record;for(let level=1;level<=r.work.levels;level++){const panels=highFloorPieces(r.work,level).map(p=>({...p,y:p.y-1,h:2})),supports=highBuildingParts(level,r.work).filter(p=>['beam','column','wall'].includes(p.kind)&&p.y+p.h/2>=level*40-2-EPS&&p.y+p.h/2<=level*40+EPS);decks.push({id:project.id+':'+level,projectId:project.id,level,label:'建物 '+project.id.slice(9)+'・'+level+'階',top:r.site.y+level*40,site:r.site,panels,supports,report:deckPerformance(panels,supports)});}}if(trusted)deckCache.set(collection,decks);return decks;}
function localLoad(deck,p,origin){const world={x:p.x+origin.x,y:p.y,z:p.z+origin.z},q=deck.site?highLocalPoint(deck.site,world):world,angle=(p.angle??0)-(deck.site?.turn??0)*Math.PI/2;if(!quarter(angle))return null;const swap=Math.abs(Math.round(angle/(Math.PI/2)))%2;return{...p,x:q.x,z:q.z,w:swap?p.d:p.w,d:swap?p.w:p.d};}
// Exact rectangle union coverage retains stair openings, including narrow gaps.
export function deckFits(deck,p,origin={x:0,z:0}){if(Math.abs(p.y-deck.top)>EPS)return false;const q=localLoad(deck,p,origin);if(!q)return false;const x0=q.x-q.w/2,x1=q.x+q.w/2,z0=q.z-q.d/2,z1=q.z+q.d/2,xs=[x0,x1,...deck.panels.flatMap(b=>[b.x-b.w/2,b.x+b.w/2]).filter(x=>x>x0&&x<x1)].sort((a,b)=>a-b);let covered=0;for(let i=1;i<xs.length;i++){const x=(xs[i-1]+xs[i])/2,spans=deck.panels.filter(b=>Math.abs(x-b.x)<b.w/2).map(b=>[Math.max(z0,b.z-b.d/2),Math.min(z1,b.z+b.d/2)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);let end=z0,length=0;for(const[a,b]of spans){length+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}covered+=(xs[i]-xs[i-1])*length;}return Math.abs(covered-q.w*q.d)<.001;}
export const cargoLoad=p=>p.w*p.h*p.d/768*(p.materialId==='earth-iron'?(p.id?.startsWith('structural-kit-')?72/192:1)*7.8:1);
function rootDeck(d){const seen=new Set();while(d?.baseDeck&&!seen.has(d)){seen.add(d);d=d.baseDeck;}return d;}
function carryingDeck(decks,s,p,origin,seen=new Set()){
 if(seen.has(p.id)||seen.size>s.parts.length)return null;seen.add(p.id);const direct=decks.find(d=>deckFits(d,p,origin));if(direct)return direct;
 for(const b of s.parts){if(b.id===p.id||!b.fixed||b.hover||Math.abs(b.y+b.h-p.y)>EPS)continue;const swap=Math.abs(Math.round((b.angle??0)/(Math.PI/2)))%2,platform={top:p.y,site:null,panels:[{x:b.x+origin.x,z:b.z+origin.z,w:swap?b.d:b.w,d:swap?b.w:b.d}]};if(!quarter(b.angle??0)||!deckFits(platform,p,origin))continue;const d=carryingDeck(decks,s,b,origin,new Set(seen));if(d)return d;}return null;
}

const boxWorld=(d,p)=>{if(!d.site)return{...p};const q=highWorldPoint(d.site,p),swap=d.site.turn%2;return{...p,x:q.x,y:q.y,z:q.z,w:swap?p.d:p.w,d:swap?p.w:p.d};};
const inside=(p,panels)=>panels.some(b=>Math.abs(p.x-b.x)<(p.w+b.w)/2-EPS&&Math.abs(p.z-b.z)<(p.d+b.d)/2-EPS);
const loadNodeCache=new WeakMap();
function loadNodes(collection,world){
 if(world&&isCapturedConstructionJson(world)&&loadNodeCache.has(world))return loadNodeCache.get(world);
 const projects=new Map(highProjects(collection).map(p=>[p.id,p.record])),rooms=collection?.version===6?collection.reel?.rooms??[]:[],decks=structuralDecks(collection,world),localCapacities=new Map(structuralDecks(collection).map(d=>[d.id,d.report.capacity])),byRoom=new Map(rooms.map(r=>[r.id,r])),nodes=[];
 const pipeLoads=rooms.flatMap(r=>risers(r).flatMap(i=>pipeLinkParts(r,i)));
 for(const d of decks){const panels=d.panels.map(p=>boxWorld(d,p)),dead=panelLoads(panels,d.report.selfLoad),bearings=[];
  if(d.material==='concrete'){
   if(d.baseDeck)for(const p of panels)bearings.push({key:d.id+'-base-'+bearings.length,to:d.baseDeck.id,x:p.x,z:p.z,w:p.w,d:p.d,area:p.w*p.d,capacity:Infinity});
  }else for(const raw of d.supports){const p=boxWorld(d,raw);if(!inside(p,panels))continue;
   const owner=byRoom.get(raw.id),to=owner?'reel-'+owner.id:d.projectId&&d.level>1?d.projectId+':'+(d.level-1):null;
   let feet=[raw];
   if(owner&&raw.kind==='beam'){const i=owner.structure?.items.find(i=>i.id===raw.detailId);if(i)feet=[i.a,i.b].map(id=>owner.structure.items.find(p=>p.id===id)).filter(Boolean).map(c=>({kind:'column',...(c.material==='steel'?{structuralMaterial:'steel'}:{}),detailId:c.id,x:c.x,z:c.z,y:owner.y+3+c.height/2,w:8,d:8,h:c.height}));}
   if(!owner&&d.projectId&&raw.kind==='beam'){const columns=highBuildingParts(d.level,projects.get(d.projectId).work).filter(c=>c.kind==='column'&&Math.abs(c.x-raw.x)<=(c.w+raw.w)/2+EPS&&Math.abs(c.z-raw.z)<=(c.d+raw.d)/2+EPS&&Math.abs(c.y+c.h/2-(raw.y-raw.h/2))<=4);if(columns.length)feet=columns;}
   for(const f of feet){const b=boxWorld(d,f),key=(to??d.projectId??d.id)+'/'+(f.kind==='column'?'post-'+(f.detailId??[f.x,f.z,f.y].join(',')):(f.key??f.side??[f.x,f.z].join(','))),capacity=f.kind==='column'?f.w*f.d*12*Math.min(1,48/f.h)*(f.structuralMaterial==='steel'?GIRDER_MATERIALS.steel.strength:1):f.kind==='wall'?f.w*f.d*8:Infinity;
    if(!bearings.some(a=>a.key===key))bearings.push({key,to,x:b.x,z:b.z,w:b.w,d:b.d,area:b.w*b.d,capacity});
   }
  }
  // Posts and walls belong to the floor on which their feet actually stand.
  // Their weight joins the same downward network as the upper floors.
  let fixtures=[];for(const p of pipeLoads)if(p.loadRoomId===d.roomId)dead.push({x:p.loadX,z:p.loadZ,load:(p.materialVolume??p.w*p.h*p.d)/768*7.8});if(d.roomId){const r=byRoom.get(d.roomId);for(const p of levelParts(r)){if(p.kind==='furniture'||p.kind==='glass'||p.kind==='riser')continue;const mass=(p.materialVolume??p.w*p.h*p.d)/768*(p.structuralMaterial==='steel'?7.8:1);dead.push({x:p.x,z:p.z,load:mass});}
   for(const i of r.structure?.items??[])if(i.kind==='furniture'){const mass=furnitureParts(r,i).reduce((m,p)=>m+(p.materialVolume??p.w*p.h*p.d)/768*(p.structuralMaterial==='steel'?7.8:p.kind==='glass'?2.5:1),0)+(holdsWater(i)?i.waterQ*32/768:0);fixtures.push({deckId:d.id,x:i.x,z:i.z,load:mass,source:'furniture-'+r.id+'/'+i.id});}
  }
  const girders=[...new Map(d.supports.filter(p=>p.girder).map(p=>[p.id+'/'+p.detailId,p])).values()],girderCapacity=girders.length?girders.reduce((n,p)=>n+600*12*16*16*GIRDER_MATERIALS[p.structuralMaterial].strength/p.girderLength**2,0):Infinity;
  if(d.projectId){const work=projects.get(d.projectId).work;if(d.level<work.levels)for(const p of highBuildingParts(d.level+1,work).filter(p=>p.kind!=='floor')){const b=boxWorld(d,p);dead.push({x:b.x,z:b.z,load:p.w*p.h*p.d/768});}for(const p of roomLayoutParts(work).filter(p=>p.y>=d.level*40&&p.y<(d.level+1)*40)){const b=boxWorld(d,p);fixtures.push({deckId:d.id,x:b.x,z:b.z,load:p.w*p.h*p.d/768,source:p.fixtureId});}}
  nodes.push({girderCapacity,id:d.id,top:d.top,deck:d,grounded:d.report.grounded,capacity:localCapacities.get(d.id)??deckPerformance(d.panels,d.supports,{grounded:d.grounded,material:'concrete'}).capacity,bearings,dead,fixtures});
 }
 const vehicleDecks=decks.map(d=>({id:d.id,top:d.top,grounded:d.report.grounded,supported:nodes.find(n=>n.id===d.id)?.bearings.length>0,panels:d.panels.map(p=>boxWorld(d,p))}));const result={decks,nodes,vehicleDecks,access:vehicleAccessSurfaces(rooms,vehicleDecks)};if(world&&isCapturedConstructionJson(world))loadNodeCache.set(world,result);return result;
}
function vehicleTerrain(world,measured=false){const f=world?.constructionTransport?.work?.frame,origin=f?.soil?.field?.origin??(f?.soil?.initial?.source?.yardOrigin?[f.soil.initial.source.yardOrigin[0],f.soil.initial.source.yardOrigin[2]]:[0,0]),floors=Array.isArray(world?.constructionSoil?.work?.patches)?worldSoilFloors(world.constructionSoil):[];return(x,z,v)=>{if(v?.terrainFrame){const o=v.terrainFrame.soil?.field?.origin??origin;return nativeEarthHeightReader(v.terrainFrame)(x-o[0],z-o[1],measured?v.groundY:null);}let h=f?nativeEarthHeightReader(f)(x-origin[0],z-origin[1],measured?v?.groundY:null)??0:0;for(const p of floors)if(Math.abs(x-p.x)<p.size[0]/2&&Math.abs(z-p.z)<p.size[1]/2)h=Math.max(h,p.height);return h;};}
export function buildingLoadReport(world,s=null,origin=null,{fleet=null,heightAt=null,soilAdditions=[]}={}){
 const isCollection=world?.scope==='imasora-world-high-build-v1'||Array.isArray(world?.projects),collection=isCollection?world:world?.constructionHighBuild??null,{decks,nodes,vehicleDecks}=loadNodes(collection,isCollection?null:world),placedState=s?{s,origin:origin??{x:0,z:0}}:placed(world),loads=nodes.flatMap(n=>n.fixtures);
 for(const p of placedState.s.parts.filter(p=>p.fixed&&!p.hover)){const deck=carryingDeck(decks,placedState.s,p,placedState.origin);if(deck)loads.push({deckId:deck.id,x:p.x+placedState.origin.x,z:p.z+placedState.origin.z,load:cargoLoad(p),source:p.id});}
 const loadHeight=heightAt?((x,z,v)=>{const h=heightAt(x,z,v),f=v?.terrainFrame??world?.constructionTransport?.work?.frame,o=f?.soil?.field?.origin??[0,0];return nativeSoilBearingHeight(f,x-o[0],z-o[1],h);}):vehicleTerrain(world),vehicles=vehicleContactLoads(fleet??fleetVehicles(world),vehicleDecks,loadHeight,!!heightAt);const soil=nativeSoilLoads(world?.constructionTransport?.work?.frame,vehicleDecks,soilAdditions);loads.push(...vehicles.loads,...soil.loads);const report=evaluateLoadPaths(nodes,loads);return{...report,surfaces:decks,vehicleContacts:vehicles.contacts,soil};
}
function accessHeight(world,read=null){return(x,z,v)=>{const height=read?read(x,z,v):v.groundY,f=v.terrainFrame??world?.constructionTransport?.work?.frame;if(!f?.decks)return read?height:null;const o=f.soil.field.origin,bearing=nativeSoilBearingHeight(f,x-o[0],z-o[1],height);return read||bearing!==height?bearing:null;};}
const worsened=(old,next)=>{const prior=new Map(old.issues.map(i=>[i.kind+'/'+i.id,i]));return next.issues.find(i=>{const p=prior.get(i.kind+'/'+i.id);return !p||i.excess>p.excess+.001||i.capacity<p.capacity-.001;});};
const vehicleReason='この先の床には車が重すぎるよ。手前で止まって、梁や柱で補強しよう。';
// Called on each short physical update, never a straight line between distant
// saved checkpoints. A cached immutable world supplies the static load network.
export function createVehicleLoadGuard(readWorld){return(family,before,after,{heightAt=null}={})=>{
 const rawHeight=heightAt;heightAt=rawHeight?((x,z,v)=>rawHeight(x,z,v?.groundY??0)):null;const world=readWorld();if(!world||!before||!after||before===after)return '';
 const a=fleetVehicles({...world,[family]:before}),b=fleetVehicles({...world,[family]:after}),changed=b.filter(v=>!sameVehicle(a.find(q=>q.id===v.id),v));if(!changed.length)return '';
 const {vehicleDecks,access}=loadNodes(world.constructionHighBuild??null,world);if(!vehicleDecks.length&&!access.length)return '';
 const accessBefore={...world,[family]:before},accessAfter={...world,[family]:after},accessOptions={beforeSurfaces:access,beforeGround:vehicleTerrain(accessBefore),afterGround:vehicleTerrain(accessAfter),beforeHeight:accessHeight(accessBefore,heightAt),afterHeight:accessHeight(accessAfter,heightAt)};
 if(!changed.some(v=>{const old=a.find(q=>q.id===v.id)??v;return vehicleDecks.flatMap(d=>d.panels).concat(access).some(p=>Math.max(v.x,old.x)+100>p.x-p.w/2&&Math.min(v.x,old.x)-100<p.x+p.w/2&&Math.max(v.z,old.z)+100>p.z-p.d/2&&Math.min(v.z,old.z)-100<p.z+p.d/2);}))return '';
 const timber=family==='constructionTimber',o=timber?{x:TIMBER_YARDS[after.siteIndex][0],z:TIMBER_YARDS[after.siteIndex][1]}:null,oldParts=timber?before.work:null,nextParts=timber?after.work:null;
 let baseline=buildingLoadReport(world,oldParts,o,{fleet:a,heightAt});if(baseline.issues.length)baseline=buildingLoadReport(world,oldParts,o,{fleet:a.map(v=>({...v,speed:b.find(q=>q.id===v.id)?.speed??v.speed})),heightAt});const issue=sweptFleet(a,b,fleet=>vehicleAccessProblem(a,fleet,accessOptions)||(worsened(baseline,buildingLoadReport(world,nextParts,o,{fleet,heightAt}))?vehicleReason:''));return issue;
};}
function ancestorIds(report,id){const result=new Set([id]),queue=[id];for(const key of queue)for(const b of report.decks.get(key)?.bearings??[])if(b.to&&!result.has(b.to)){result.add(b.to);queue.push(b.to);}return result;}
const structuralReason=i=>i.kind==='support'?'この柱に重さが集まりすぎるよ。下の階にも柱や壁を足そう。':'この床には重すぎるよ。下に梁や支柱を足すか、骨組みのある床をえらぼう。';
export function structuralPlacement(collection,s,candidate,origin={x:0,z:0}){
 const world=collection&&(['constructionHighBuild','constructionProfileProject','map'].some(k=>Object.hasOwn(collection,k)))?collection:null;if(world)collection=world.constructionHighBuild;
 const decks=structuralDecks(collection,world),parts=s.parts.filter(p=>p.id!==candidate.id).concat({...candidate,fixed:true,hover:false}),state={parts},deck=carryingDeck(decks,state,candidate,origin);
 if(!deck){const near=decks.some(d=>Math.abs(d.top-candidate.y)<EPS&&d.panels.some(b=>{const q=d.site?highLocalPoint(d.site,{x:candidate.x+origin.x,y:candidate.y,z:candidate.z+origin.z}):{x:candidate.x+origin.x,z:candidate.z+origin.z};return Math.abs(q.x-b.x)<(Math.hypot(candidate.w,candidate.d)+b.w)/2&&Math.abs(q.z-b.z)<(Math.hypot(candidate.w,candidate.d)+b.d)/2;}));return near?{known:true,ok:false,report:{capacity:0,load:cargoLoad(candidate)},reason:'木材が床からはみ出すよ。向きや階段の穴をたしかめよう。'}:{known:false,ok:true,reason:''};}
 const report=buildingLoadReport(world??collection,state,origin),ids=ancestorIds(report,deck.id),issue=report.issues.find(i=>ids.has(i.id)||i.deckIds?.some(id=>ids.has(id))),local=report.decks.get(deck.id),critical=issue?.kind==='floor'?report.decks.get(issue.id):local;
 return{known:true,ok:!issue,deckId:deck.id,criticalDeckId:issue?.id??deck.id,report:{...deck.report,capacity:issue?.capacity??critical.capacity,load:issue?.load??critical.load,totalLoad:local.total,fromAbove:local.fromAbove},reason:issue?structuralReason(issue):deck.report.label+' · この建材を置けるよ'};
}
function placed(world){const t=world?.constructionTimber,origin=t?{x:TIMBER_YARDS[t.siteIndex][0],z:TIMBER_YARDS[t.siteIndex][1]}:{x:0,z:0};return{origin,s:t?.work??{parts:[]}};}
// New loads and worsened support are checked against the entire old network.
// Reading an older overloaded building never destroys or rewrites it.
export function assertStructuralChange(before,after){
 assertNativeElevationWorld(after,before);
 const accessIssue=vehicleAccessProblem(fleetVehicles(before),fleetVehicles(after),{beforeSurfaces:loadNodes(before.constructionHighBuild??null,before).access,afterSurfaces:loadNodes(after.constructionHighBuild??null,after).access,beforeGround:vehicleTerrain(before),afterGround:vehicleTerrain(after),beforeHeight:accessHeight(before),afterHeight:accessHeight(after)});if(accessIssue)throw Error(accessIssue);
 const old=buildingLoadReport(before),next=buildingLoadReport(after),previous=new Map(old.issues.map(i=>[i.kind+'/'+i.id,i]));
 assertSoilProjection(before,after,old,next);
 const a=placed(before),b=placed(after);for(const p of b.s.parts.filter(p=>p.fixed&&!p.hover)){const prior=a.s.parts.find(q=>q.id===p.id);if(prior&&['x','y','z','w','h','d','angle'].every(k=>prior[k]===p[k])&&carryingDeck(old.surfaces,a.s,prior,a.origin)&&!carryingDeck(next.surfaces,b.s,p,b.origin))throw Error('上の建材を移してから、支える床を変えよう。');}
 const beforeFleet=fleetVehicles(before),afterFleet=fleetVehicles(after);for(const v of afterFleet){const prior=beforeFleet.find(p=>p.id===v.id);if(!Number.isFinite(v.groundY))continue;if(v.groundY< -64||v.groundY>516)throw Error('車の高さを確認できません。');if(prior&&!v.terrainFrame&&Number.isFinite(prior.groundY)&&Math.abs(v.groundY-prior.groundY)>8+Math.hypot(v.x-prior.x,v.z-prior.z)*Math.tan(8*Math.PI/180))throw Error('車は坂を通って同じ階へ進もう。');}const rampDecks=(after.constructionHighBuild?.reel?.rooms??[]).flatMap(r=>rampItems(r).flatMap(i=>rampParts(r,i).filter(p=>p.kind==='ramp-tread'))),panels=next.surfaces.flatMap(d=>d.panels.map(p=>({...boxWorld(d,p),top:d.top}))).concat(rampDecks.map(p=>({...p,top:p.y+p.h/2}))),earth=vehicleTerrain(after,true);for(const v of afterFleet.filter(v=>Number.isFinite(v.groundY)&&!v.terrainFrame)){const near=panels.filter(p=>Math.abs(p.x-v.x)<p.w/2+100&&Math.abs(p.z-v.z)<p.d/2+100),read=(x,z,reference)=>chooseVehicleHeight(earth(x,z,v),near.filter(p=>Math.abs(x-p.x)<=p.w/2+.001&&Math.abs(z-p.z)<=p.d/2+.001).map(p=>p.top+(p.supportSlopeX??0)*(x-p.x)+(p.supportSlopeZ??0)*(z-p.z)),reference),g=['truck','pump'].includes(v.id)?{position:concreteGroundPose({location:{x:0,z:0}},v,read).position.toArray()}:vehicleGroundFrame(v,read);if(Math.abs(g.position[1]-v.groundY)>.01)throw Error('車を支える床と、停車した高さが合わないよ。');}const remaining=vehicleContactLoads(beforeFleet,next.surfaces.map(d=>({id:d.id,top:d.top,panels:d.panels.map(p=>boxWorld(d,p))})),vehicleTerrain(after)).contacts;for(const v of afterFleet){const prior=beforeFleet.find(p=>p.id===v.id);if(!prior||!['x','z','heading'].every(k=>prior[k]===v[k]))continue;for(const c of old.vehicleContacts.filter(p=>p.vehicleId===v.id&&p.covered>.99)){const q=remaining.find(p=>p.vehicleId===v.id&&Math.hypot(p.x-c.x,p.z-c.z)<.02);if(!q||q.top<c.top-.15)throw Error('先に車を移してから、支える床を変えよう。');}}
 for(const i of next.issues){const p=previous.get(i.kind+'/'+i.id);if(!p||i.excess>p.excess+.001||i.capacity<p.capacity-.001)throw Error(structuralReason(i));}
 return true;
}

// Soil is inspected only when ownership/terrain changes, not on every elapsed
// animation frame. Check the complete drop before its first finite reservation.
function projectedSoilReport(world,fallback=null){
 const work=world?.constructionTransport?.work,pending=work?.frame.soil.pending,unload=work?.unload,extra=unload&&!unload.returning&&unload.destination!=='storage'?unload.positions.slice(unload.done):pending?.to==='terrain'&&!unload?.returning?pending.positions:[];
 if(!extra.length)return fallback??buildingLoadReport(world);const fleet=fleetVehicles(world),from=unload?'dump':pending.from,v=fleet.find(v=>v.id===(from==='bucket'?'excavator':from));
 if(v){v.mass-=extra.length*8*1.6/768;if(from==='dump')v.cgZ=-Math.max(0,work.frame.soil.containers.dump.amount+(pending?.from==='dump'?pending.amount:0)-extra.length)/1392*10;}
 return buildingLoadReport(world,null,null,{fleet,soilAdditions:extra});
}
function assertSoilProjection(before,after,oldActual=null,nextActual=null){
 if(!before?.constructionTransport?.work?.frame.decks&&!after?.constructionTransport?.work?.frame.decks)return true;
 const old=projectedSoilReport(before,oldActual),next=projectedSoilReport(after,nextActual),prior=new Map(old.soil.unsupported.map(p=>[p.key,p.volume]));
 if(next.soil.unsupported.some(p=>p.volume>(prior.get(p.key)??0)+.001))throw Error('土を受け止める床が足りないよ。床の穴や端をさけよう。');const issue=worsened(old,next);if(issue)throw Error(structuralReason(issue));return true;
}
export function createTransportSoilGuard(readWorld){return(before,after)=>{
 if(before.frame.soil===after.frame.soil)return true;const world=readWorld();if(!world||!after.frame.decks)return true;
 return assertSoilProjection({...world,constructionTransport:{...world.constructionTransport,work:before}},{...world,constructionTransport:{...world.constructionTransport,work:after}});
};}
