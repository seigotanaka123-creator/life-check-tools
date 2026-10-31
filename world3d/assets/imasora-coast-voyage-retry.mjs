import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {coastWalkingHeight,coastPierContains,COAST_WATER_Y,COAST_WORLD} from './imasora-coast-layout.mjs?v=120mx';
import {islandAtLanding} from './imasora-coast-rewards.mjs?v=120nd';

export const COAST_RETRY=Object.freeze({interval:600,rewind:3000,limit:12});
// Shared with the cargo retirement: only the removed cargo changes the boat's
// identity, not the real offshore positions the player has already reached.
export function coastNavigationShape(s,memberIds){
 let ids=memberIds;
 if(typeof ids==='string'){
  if(!s.parts.some(p=>p.id===ids))return null;
  ids=new Set([ids]);for(let more=true;more;){more=false;for(const j of s.links)if(j.kind==='weld'&&ids.has(j.a)!==ids.has(j.b)){ids.add(j.a);ids.add(j.b);more=true;}}
 }
 const text=s.parts.filter(p=>ids.has(p.id)).map(p=>p.id+':'+p.type).sort().join('|')+';'+s.links.filter(j=>j.kind==='weld'&&ids.has(j.a)).map(j=>j.id+':'+j.a+':'+j.b).sort().join('|');let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0).toString(16).padStart(8,'0');
}
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===keys;
const bounded=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.abs(p[0])<COAST_WORLD.width/2&&Math.abs(p[2])<COAST_WORLD.depth/2&&Math.abs(p[1])<10000;
const ok=(v,m='航路の記録をたしかめてね。')=>{if(!v)throw Error(m);};
export function validateCoastNavigation(s){
 const n=s.navigation;if(n===undefined)return;
 ok(exact(n,Object.hasOwn(n,'waters')?'ashore|board|clock|land|points|shape|version|waters':'ashore|board|clock|land|points|shape|version')&&n.version===1&&typeof n.ashore==='boolean'&&Number.isSafeInteger(n.clock)&&n.clock>=0&&n.clock<1e12);
 ok(n.board===null||s.parts.some(p=>p.type==='board'&&p.id===n.board));
 ok(n.shape===null||typeof n.shape==='string'&&/^[a-f0-9]{8}$/.test(n.shape));
 ok(Array.isArray(n.points)&&n.points.length<=COAST_RETRY.limit&&(!n.points.length||n.board&&n.shape));
 let last=-1;for(const p of n.points){ok(exact(p,'p|tick|yaw')&&bounded(p.p)&&Number.isSafeInteger(p.tick)&&p.tick>=0&&p.tick<=n.clock&&p.tick>last&&Number.isFinite(p.yaw)&&Math.abs(p.yaw)<=Math.PI+.001);last=p.tick;}
 if(n.waters!==undefined){ok(Array.isArray(n.waters)&&n.waters.length<=COAST_ISLANDS.length&&(!n.waters.length||n.board&&n.shape));for(const p of n.waters)ok(exact(p,'p|tick|yaw')&&bounded(p.p)&&Number.isSafeInteger(p.tick)&&p.tick>=0&&p.tick<=n.clock&&Number.isFinite(p.yaw)&&Math.abs(p.yaw)<=Math.PI+.001);}
 if(n.land!==null)ok(exact(n.land,'island|p|tick')&&bounded(n.land.p)&&Number.isSafeInteger(n.land.tick)&&n.land.tick>=0&&n.land.tick<=n.clock&&(n.land.island==='home'||COAST_ISLANDS.some(i=>i.id===n.land.island)));
 ok(!n.ashore||n.land!==null);
}
export function createCoastVoyageRetryTools({coastAssembly,coastCrewSeats,rotate,worldPoint,localPoint,SEA_PARTS,SEA_PLAY,seaFloor,coastWave,qmul,conj,obb,overlap,obstacleBox,solids,relatedLinks}){
 const ensure=s=>s.navigation??={version:1,clock:0,board:null,shape:null,points:[],land:null,ashore:false};
 const assembly=(s,id)=>{const b=s.parts.find(p=>p.id===id&&p.type==='board'),g=b&&coastAssembly(s,id);return b&&g&&s.parts.some(p=>g.ids.has(p.id)&&p.type==='float')?{b,g}:null;};
 const shape=(s,g)=>coastNavigationShape(s,g.ids);
 function clear(s){const n=s.navigation;if(n){n.board=null;n.shape=null;n.points=[];if(n.waters)n.waters=[];}}
 function prune(s){const n=s.navigation;if(!n)return;const a=assembly(s,n.board);if(!a||n.shape!==shape(s,a.g)){n.board=null;n.shape=null;n.points=[];if(n.waters)n.waters=[];}}
 function record(s,input={},visits){
  if(s.navigation)s.navigation.clock++;
  if(!input.helm||!input.rider||s.sailing?.phase==='capsized')return false;
  const a=assembly(s,input.rider.id);if(!a||rotate(a.b.q,[0,1,0])[1]<.78||seaFloor(a.b.p[0],a.b.p[2])>=COAST_WATER_Y-12)return false;
  const n=ensure(s);let changed=false;
  if(n.ashore||n.board!==a.b.id){n.board=a.b.id;n.shape=shape(s,a.g);n.points=[];n.waters=[];n.ashore=false;changed=true;}
  const last=n.points.at(-1);
  if(!last||n.clock-last.tick>=COAST_RETRY.interval&&Math.hypot(a.b.p[0]-last.p[0],a.b.p[2]-last.p[2])>=12){
   const f=rotate(a.b.q,[0,0,1]),point={tick:n.clock,p:[...a.b.p],yaw:Math.atan2(f[0],f[2])};n.points.push(point);if(n.points.length>COAST_RETRY.limit)n.points.shift();
   // Keep at most one real offshore witness per visited island. Filter out
   // pre-award points even when a rounded slope did not set n.ashore. The
   // farthest valid point survives a slow beach approach without a long log.
   if(seaFloor(point.p[0],point.p[2])<-16){const candidates=[...(n.waters??[]),point],chosen=[];for(const i of COAST_ISLANDS){const origin=visits?.[i.id];if(!origin)continue;const fresh=candidates.filter(p=>p.tick>origin.clock);if(!fresh.length)continue;const distance=p=>Math.hypot(p.p[0]-origin.x,p.p[2]-origin.z),p=fresh.reduce((a,b)=>distance(b)>distance(a)?b:a);if(!chosen.some(q=>q.tick===p.tick))chosen.push({tick:p.tick,p:[...p.p],yaw:p.yaw});}n.waters=chosen;}
   changed=true;
  }
  if(changed)s.edit++;return changed;
 }
 function land(s,{x,y,z,grounded=false,riding=false,groundContact=null}={}){
  if(!grounded||riding||![x,y,z].every(Number.isFinite)||s.sailing?.phase==='capsized')return false;
  const nearby=COAST_ISLANDS.find(i=>Math.abs(x-i.x)<i.rx*1.5&&Math.abs(z-i.z)<i.rz*1.7),previous=s.navigation;
  // A retained safe spot needs neither another save nor another body query.
  if(previous?.ashore&&previous.land?.island===(nearby?.id??'home')&&(previous.clock-previous.land.tick<600||Math.hypot(x-previous.land.p[0],z-previous.land.p[2])<12))return false;
  const h=coastWalkingHeight(x,z),pier=coastPierContains(x,z,8)&&Math.abs(y)<.24;
  if(!pier&&h<.5)return false;
  if(!pier&&[[-9,0],[9,0],[0,-9],[0,9]].some(([dx,dz])=>Math.abs(coastWalkingHeight(x+dx,z+dz)-h)>5))return false;
  // The real rounded body can rest on a dry bank while its centre is higher
  // than that one terrain sample. Share arrival's nearby-contact validation,
  // but retain the dry centre and gentle-footing rules for a safe rescue spot.
  let reached=null;
  if(!pier&&Math.abs(h-y)>.4){reached=islandAtLanding({map:'coast',position:{x,y,z}},typeof groundContact==='function'?groundContact():groundContact);if(!reached)return false;}
  const island=reached?.id??nearby?.id??'home';
  if(island==='home'&&!pier&&z>500)return false;
  const n=ensure(s);if(n.ashore&&n.land?.island===island&&(n.clock-n.land.tick<600||Math.hypot(x-n.land.p[0],z-n.land.p[2])<12))return false;
  n.land={island,p:[x,y,z],tick:n.clock};n.ashore=true;s.edit++;return true;
 }
 function helm(s,id,{canStand=()=>true,parts=s.parts}={}){
  const a=assembly(s,id),b=parts.find(p=>p.id===id);if(!a||!b||rotate(b.q,[0,1,0])[1]<.78)return null;
  const f=rotate(b.q,[0,0,1]),yaw=Math.atan2(f[0],f[2]);
  // Prefer the unobstructed centre. Current boats use their compact seats
  // as fallbacks, never the rear positions reserved for former cargo.
  const alternatives=s.cargoRetired===1?coastCrewSeats(s,id).map(s=>s.point):[[-16,3,-20],[16,3,-20]];
  for(const point of[[0,3,0],...alternatives]){
   const at=worldPoint(b,point);if(!canStand(at[0],at[1],at[2],yaw))continue;
   const body={p:[at[0],at[1]+14.5,at[2]],half:[13,14.25,12],axes:[[Math.cos(yaw),0,-Math.sin(yaw)],[0,1,0],[Math.sin(yaw),0,Math.cos(yaw)]]};
   if(parts.some(p=>p.id!==id&&overlap(body,obb(p))))continue;
   return {x:at[0],y:at[1],z:at[2],yaw,...(point[0]||point[2]?{walking:true}:{})};
  }
  return null;
 }
 function reboard(s,id,options={}){const a=assembly(s,id);return a&&s.sailing?.phase!=='capsized'&&seaFloor(a.b.p[0],a.b.p[2])<COAST_WATER_Y-6?helm(s,id,options):null;}
 function plan(s,id,{choice=null,obstacles=[],canStand=()=>true,seaTime=s.tick*SEA_PLAY.dt}={}){
  const a=assembly(s,id);ok(a,'自分のいかだをたしかめてね。');const {b,g}=a,n=s.navigation;
  const recorded=n?.board===id&&n.shape===shape(s,g)?n.points:[],cutoff=(n?.clock??0)-COAST_RETRY.rewind;
  let candidates=recorded.filter(p=>p.tick<=cutoff).reverse();if(!candidates.length&&recorded.length)candidates=[recorded[0]];
  candidates=candidates.map(p=>({...p,choice:'t:'+p.tick}));
  // Old saves have no historic route. Right that same boat on the sea, never
  // invent a visit to a nearby island. A short retreat behind its bow is only
  // used to clear an old submerged rock or grounding contact.
  if(!recorded.length){const f=rotate(b.q,[0,0,1]),yaw=Math.atan2(f[0],f[2]);candidates=[0,40,80].map(back=>({tick:n?.clock??0,p:[b.p[0]-Math.sin(yaw)*back,b.p[1],b.p[2]-Math.cos(yaw)*back],yaw,choice:'legacy:'+back}));}
  if(choice!==null)candidates=candidates.filter(p=>p.choice===choice);
  const own=s.parts.filter(p=>g.ids.has(p.id)),other=s.parts.filter(p=>!g.ids.has(p.id)),walls=[...solids(s),...obstacles];
  for(const point of candidates){
   const yawQ=[0,Math.sin(point.yaw/2),0,Math.cos(point.yaw/2)],height=coastWave(point.p[0],point.p[2],seaTime).height+6,origin=[point.p[0],height,point.p[2]];
   const parts=own.map(p=>{const local=localPoint(b,p.p),offset=rotate(yawQ,local),q=qmul(yawQ,qmul(conj(b.q),p.q)),length=Math.hypot(...q);return{...p,p:origin.map((v,i)=>v+offset[i]),q:q.map(v=>v/length),v:[0,0,0],w:[0,0,0]};});
   if(parts.some(p=>Math.abs(p.p[0])>COAST_WORLD.width/2-80||Math.abs(p.p[2])>COAST_WORLD.depth/2-80))continue;
   if(seaFloor(origin[0],origin[2])>=COAST_WATER_Y-12)continue;
   if(parts.some(p=>{const box=obb(p),[w,h,d]=SEA_PARTS[p.type].size;for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2]){const v=worldPoint(p,[x,y,z]);if(seaFloor(v[0],v[2])>v[1]-.5)return true;}return other.some(p=>overlap(box,obb(p)))||walls.some(o=>overlap(box,obstacleBox(o)));}))continue;
   const target=helm(s,id,{canStand,parts:[...other,...parts]});if(!target)continue;
   const paired=relatedLinks(s,g.ids),removeLinks=s.links.filter(j=>j.kind!=='weld'&&(g.ids.has(j.a)||g.ids.has(j.b)||paired.includes(j.id))).map(j=>j.id);
   return{board:id,parts,shore:target,choice:point.choice,seconds:Math.max(0,Math.round(((n?.clock??0)-point.tick)*SEA_PLAY.dt)),legacy:point.choice.startsWith('legacy:'),removeLinks};
  }
  throw Error('再挑戦する海面に物が重なっているよ。もう一度たしかめてね。');
 }
 function apply(s,id,options){const p=plan(s,id,options),map=new Map(p.parts.map(p=>[p.id,p]));s.parts=s.parts.map(p=>map.get(p.id)??p);s.links=s.links.filter(j=>!p.removeLinks.includes(j.id));delete s.crew;delete s.sailing;
  if(s.voyage&&map.has(s.voyage.board)&&!s.voyage.done)s.voyage.hold=0;
  const n=ensure(s),b=s.parts.find(p=>p.id===id),f=rotate(b.q,[0,0,1]);n.board=id;n.shape=shape(s,coastAssembly(s,id));n.ashore=false;n.points=[{tick:n.clock,p:[...b.p],yaw:Math.atan2(f[0],f[2])}];return p;
 }
 return{record,land,prune,clear,plan,apply,reboard};
}
