import {COAST_ISLANDS,LEGACY_ISLANDS,UNCHARTED_ISLAND as H} from './imasora-coast-geography.mjs?v=120li';
// Fixed, visible landing places. Existing saved coordinates remain anchored.
export const COAST_HOME_PORT=Object.freeze({id:'home',name:'星待ちの桟橋',x:340,edge:602,y:0,out:1,shore:Object.freeze({x:340,y:0,z:555})});
// Real deck cleats on all four edges. Old side-on berths remain readable;
// newly tied boats use the edge actually facing the shore, without rotating.
export const COAST_BERTH_CLEATS=Object.freeze([-1,1].flatMap(side=>[-1,1].flatMap(end=>[[side*32,3,end*24],[side*24,3,end*27]])).map(Object.freeze));
export const coastBerthLineId=(port,board,side,point)=>(port==='home'?'berth-line-':'island-berth-'+port+'-')+board+'-'+side+'-cleat-'+point[0]+'-'+point[2];
export const coastHomeBerthAnchor=side=>[340+side*48,23,598];
export const LEGACY_PORTS=Object.freeze(LEGACY_ISLANDS.map(p=>Object.freeze({id:p.port,name:p.name,x:p.x,edge:p.edge,y:5,out:-1,shore:{x:p.x,y:5,z:p.edge+28}})));
export const COAST_ISLAND_PORTS=Object.freeze(COAST_ISLANDS.map(p=>p.hidden?Object.freeze({id:p.port,name:p.name,x:p.x,edge:p.edge,y:5,out:-1,walk:100,span:60,natural:true,shore:Object.freeze({x:p.x,y:5,z:p.edge+28})}):Object.freeze({id:p.port,name:p.name,x:p.x,edge:p.legacy.edge+p.shiftZ,y:5,out:-1,walk:p.legacy.edge>2000?100:68,span:p.legacy.edge>2000?60:28,shore:Object.freeze({x:p.x,y:5,z:p.legacy.edge+p.shiftZ+28})})));
const slab=(id,x,z,halfX,halfZ,minY,maxY)=>Object.freeze({id,x,z,halfX,halfZ,minY,maxY});
export const COAST_HOME_MOOR_POSTS=Object.freeze([-1,1].map(side=>slab('coast-pier-moor-'+side,340+side*48,598,2.5,2.5,-55,23)));
export const ISLAND_PORT_DECKS=Object.freeze(COAST_ISLAND_PORTS.flatMap(p=>[
 slab('island-port-'+p.id+'-head',p.x,p.edge+20,64,20,p.y-4,p.y),
 slab('island-port-'+p.id+'-walk',p.x,p.edge+p.walk,22,p.span,p.y-4,p.y)
]));
export const ISLAND_PORT_SOLIDS=Object.freeze([
 ...ISLAND_PORT_DECKS,
 ...COAST_ISLAND_PORTS.flatMap(p=>[-1,1].map(side=>slab('island-port-'+p.id+'-post-'+side,p.x+side*24,p.edge+4,2.5,2.5,-55,p.y+18)))
]);
export const coastPort=id=>id==='home'?COAST_HOME_PORT:COAST_ISLAND_PORTS.find(p=>p.id===id);
export function coastNearbyPort(x,z){
 let best=COAST_HOME_PORT,d=Infinity;
 for(const p of COAST_ISLAND_PORTS){const n=Math.hypot(x-p.x,z-(p.edge+100));if(n<380&&n<d){best=p;d=n;}}
 return best;
}
export function islandPortSurface(x,z){
 for(const p of ISLAND_PORT_DECKS)if(Math.abs(x-p.x)<=p.halfX&&Math.abs(z-p.z)<=p.halfZ)return p.maxY;
 return -Infinity;
}
export function islandPortWalkHeight(x,z,reference,terrain){
 // Only the level pier's join to the natural sand. Raised edges elsewhere
 // still require a jump; existing floor stacking is never treated as a ramp.
 for(const p of COAST_ISLAND_PORTS)if(Math.abs(x-p.x)<=22&&z>=p.edge+40&&z<=p.edge+130&&reference>=p.y-.6){
  const y=Math.max(terrain,islandPortSurface(x,z));if(Number.isFinite(y)&&Math.abs(y-reference)<=4)return y;
 }
 return undefined;
}
export function islandPortStep(from,to,groundY,terrain){
 if(![from,to].some(p=>Number.isFinite(islandPortSurface(p.x,p.z))))return false;
 const a=Math.max(terrain(from.x,from.z),islandPortSurface(from.x,from.z)),b=Math.max(terrain(to.x,to.z),islandPortSurface(to.x,to.z)),d=Math.hypot(to.x-from.x,to.z-from.z);
 return d>0&&Math.abs(a-groundY)<.6&&Math.abs(b-a)<=d*.5+.01;
}
export function islandPortRecovery(x,z,clear=()=>true){
 const p=coastNearbyPort(x,z);if(p.id==='home')return null;
 for(const dz of[28,20,32])for(const dx of[0,-24,24,-40,40]){const q={x:p.x+dx,y:p.y,z:p.edge+dz};if(clear(q))return q;}
 return null;
}
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
// Short-wave shelter around the landing, fading continuously into the open sea.
// Tide height is unchanged. CPU and shader use the same authored centers/radii.
export function coastPortExposure(x,z){
 let result=1;for(const p of COAST_ISLAND_PORTS){const dx=x-p.x,dz=z-p.edge;result=Math.min(result,smooth((dx*dx+dz*dz-12100)/45500));}const dx=x-H.x,dz=z-(H.landingZ+340);return Math.min(result,smooth((dx*dx+dz*dz-202500)/220000));
}
export const COAST_PORT_WAVE_GLSL=`float seaShelter(vec2 p){float e=1.;${COAST_ISLAND_PORTS.map(p=>`{float dx=p.x-(${p.x}.),dz=p.y-(${p.edge}.);e=min(e,smoothstep(12100.,57600.,dx*dx+dz*dz));}`).join('')}{float dx=p.x-(${H.x}.),dz=p.y-(${H.landingZ+340}.);e=min(e,smoothstep(202500.,422500.,dx*dx+dz*dz));}return e;}`;
export function validIslandPortLine(s,j){
 if(!s.parts.some(p=>p.id===j.a&&p.type==='board')||!Number.isFinite(j.length)||j.length<10||j.length>260)return false;
 return (s.geography===2?COAST_ISLAND_PORTS:[...LEGACY_PORTS,...COAST_ISLAND_PORTS]).some(p=>[-1,1].some(side=>JSON.stringify(j.anchor)===JSON.stringify([p.x+p.out*side*24,p.y+18,p.edge-p.out*4])&&(
  j.id==='island-berth-'+p.id+'-'+j.a+'-'+side&&JSON.stringify(j.localA)===JSON.stringify([32,3,side*24])||COAST_BERTH_CLEATS.some(c=>j.id===coastBerthLineId(p.id,j.a,side,c)&&JSON.stringify(j.localA)===JSON.stringify(c))
 )));
}
