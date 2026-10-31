import {COAST_ISLANDS,UNCHARTED_ISLAND as I} from './imasora-coast-geography.mjs?v=120li';
import {coastWalkingHeight,coastPierContains} from './imasora-coast-layout.mjs?v=120mx';
import {coastReturnBoat} from './imasora-coast-wayfinding.mjs?v=120mx';
import {islandAtLanding} from './imasora-coast-rewards.mjs?v=120nd';
import {COAST_HOME_PORT,coastPort,islandPortSurface} from './imasora-coast-island-harbors.mjs?v=120lr';
import {coastAssembly,coastVoyageRetryPlan,coastVoyageReboard,localPoint,SEA_PARTS} from './imasora-coast-physics.mjs?v=120nz';
// Proximity is not arrival. Only an actual recorded landing permits its berth.
export function coastRescuePort(x,z,navigation){
 const land=navigation?.land,i=land&&COAST_ISLANDS.find(i=>i.id===land.island);
 return i&&Math.abs(x-i.x)<i.rx*1.9&&Math.abs(z-i.z)<i.rz*2?coastPort(i.port):COAST_HOME_PORT;
}
// A stranded walker must not need to reach the lost boat to open recovery.
// Offer the existing confirmed recovery only at the shore they really reached,
// for their recorded boat. An intact boarding plank needs no rescue prompt.
export function coastShoreBoatRecovery(s,{map,x,y,z,grounded=false,aboard=false,groundContact=null}={},gangways=[]){
 if(!grounded||!Number.isFinite(y))return null;
 const own=coastReturnBoat(s,{map,x,z,aboard});if(!own)return null;
 const port=coastRescuePort(x,z,s.navigation);if(port.id==='home'||Math.hypot(x-port.shore.x,z-port.shore.z)>240)return null;
 const group=coastAssembly(s,own.id);
 if(!group||!s.parts.some(p=>p.type==='float'&&group.ids.has(p.id))||gangways.some(p=>group.ids.has(p.id)))return null;
 const pier=islandPortSurface(x,z),onPier=Number.isFinite(pier)&&Math.abs(y-pier)<.4;
 if(!onPier){const actor={map,position:{x,y,z}},island=islandAtLanding(actor)??islandAtLanding(actor,typeof groundContact==='function'?groundContact():groundContact);if(island?.id!==s.navigation.land.island)return null;}
 return {board:own.id,port:port.id,name:port.name};
}
// Search only land the player actually reached. A blocked recorded point is
// not a reason to strand them or to invent an arrival at another island.
function rescueGroundNear(x,z,island,clear,{cave=false}={}){
 const height=(px,pz)=>Math.max(coastWalkingHeight(px,pz),islandPortSurface(px,pz),coastPierContains(px,pz,8)?0:-Infinity);
 for(const radius of[0,24,48,80,120,180,260])for(let n=0;n<(radius?12:1);n++){
  const px=x+Math.sin(n*Math.PI/6)*radius,pz=z+Math.cos(n*Math.PI/6)*radius;
  if(island?Math.abs(px-island.x)>island.rx*1.5||Math.abs(pz-island.z)>island.rz*1.7:Math.abs(px)>1100||pz< -220||pz>602)continue;
  // Stay outside the actual cave: its floor is not the terrain's roof.
  if(cave&&(Math.abs(px-I.x)>180||pz>I.landingZ+170))continue;
  const y=height(px,pz);if(!Number.isFinite(y)||y<(island?.hidden?5:island?0.5:0))continue;
  if([[-12,0],[12,0],[0,-12],[0,12]].some(([dx,dz])=>Math.abs(height(px+dx,pz+dz)-y)>5))continue;
  const shore={x:px,y,z:pz};if(clear(shore))return shore;
 }
 return null;
}
export function coastFallRescuePlan(s,{x,z,lastBoat,obstacles=[],canStand=()=>true,retry=null,choice=null,seaTime}={}){
 const boats=s.parts.filter(p=>p.type==='board'&&s.parts.some(q=>q.type==='float'&&coastAssembly(s,p.id).ids.has(q.id)));
 // Never choose an unrelated boat just because it is nearer.
 const board=boats.find(b=>b.id===lastBoat)??boats.find(b=>b.id===s.navigation?.board)??boats.find(b=>b.id===s.sailing?.board);
 const clear=p=>canStand(p.x,p.y+.05,p.z)&&!s.parts.some(part=>{const h=SEA_PARTS[part.type].size.map(n=>n/2),q=localPoint(part,[p.x,p.y+20,p.z]);return Math.abs(q[0])<h[0]+12&&Math.abs(q[1])<h[1]+21&&Math.abs(q[2])<h[2]+12;});
 const land=s.navigation?.ashore?s.navigation.land:null,i=land&&COAST_ISLANDS.find(i=>i.id===land.island);
 const localLand=land&&(i?Math.abs(x-i.x)<i.rx*1.9&&Math.abs(z-i.z)<i.rz*2:Math.abs(x)<1100&&z<900);
 if(localLand&&(!retry||['ground','cave'].includes(retry))){
  const inCave=land.island===I.id&&Math.abs(x-I.x)<=60&&z>=I.landingZ+180&&z<=I.landingZ+540;
  if(inCave||retry==='cave'){
   for(const dz of[160,148,136])for(const dx of[0,-28,28]){const px=I.x+dx,pz=I.landingZ+dz,y=coastWalkingHeight(px,pz),shore={x:px,y,z:pz};if(y>=5&&clear(shore))return{shore,name:'潮の洞窟の入口',board:null,retry:'cave',keepBoat:true};}
   const entrance=rescueGroundNear(I.x,I.landingZ+148,I,clear,{cave:true});
   if(entrance)return{shore:entrance,name:'潮の洞窟の入口の安全な場所',board:null,retry:'cave',keepBoat:true,rerouted:true};
  }
  const [px,py,pz]=land.p,shore={x:px,y:py,z:pz};
  if(clear(shore))return{shore,name:i?i.name+'で最後に立った場所':'最後に立った浜',board:null,retry:'ground',keepBoat:true};
  const nearby=rescueGroundNear(px,pz,i,clear)??(i&&rescueGroundNear(i.x,i.landingZ+120,i,clear));
  if(nearby)return{shore:nearby,name:i?i.name+'の安全な場所':'浜の安全な場所',board:null,retry:'ground',keepBoat:true,rerouted:true};
 }
 if(['ground','cave'].includes(retry))throw Error('戻る足場をもう一度たしかめてね。');
 if(board){
  const deck=(!retry||retry==='reboard')&&coastVoyageReboard(s,board.id,{canStand});
  if(deck)return{shore:deck,name:'自分のいかだ',board:board.id,retry:'reboard',keepBoat:true};
  if(retry==='reboard')throw Error('いかだの足元が変わったよ。もう一度たしかめてね。');
  try{const plan=coastVoyageRetryPlan(s,board.id,{choice,obstacles,canStand,seaTime});
   return{...plan,name:plan.legacy?'この近くの海上':'進んできた航路',retry:'voyage',keepBoat:false};
  }catch(e){if(retry==='voyage')throw e;}
 }
 if(clear(COAST_HOME_PORT.shore))return{shore:COAST_HOME_PORT.shore,name:COAST_HOME_PORT.name,board:null,retry:'home',keepBoat:true,rerouted:!!localLand};
 for(const [px,pz]of[[340,480],[340,160],[0,80],[-480,40],[720,40]]){const shore=rescueGroundNear(px,pz,null,clear);if(shore)return{shore,name:'浜の安全な場所',board:null,retry:'home',keepBoat:true,rerouted:true};}
 throw Error('安全な救助先を探しています。もう一度、救助先を探してね。');
}
