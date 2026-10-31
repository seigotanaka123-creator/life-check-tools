import {createCoastVoyageRetryTools,validateCoastNavigation} from './imasora-coast-voyage-retry.mjs?v=120nz';
import {legacyCoastHeight} from './imasora-coast-geography.mjs?v=120li';
import {rigProfile,rigWaterResponse,rigOarResponse} from './imasora-coast-fitting.mjs?v=120js';
import {coastAdventureStart} from './imasora-coast-beach-start.mjs?v=120nz';
import {coastPort,COAST_HOME_PORT,COAST_ISLAND_PORTS,COAST_BERTH_CLEATS,coastBerthLineId,coastHomeBerthAnchor,COAST_HOME_MOOR_POSTS,validIslandPortLine,ISLAND_PORT_SOLIDS,islandPortSurface} from './imasora-coast-island-harbors.mjs?v=120lr';
import {createCoastIslandPathTools,coastIslandProps,coastIslandPropSolids,ISLAND_PATH_SOLIDS,islandPathSurface} from './imasora-coast-island-path.mjs?v=120li';
export {coastIslandProps,coastIslandPropSolids};
import {createCoastCrewTools,COAST_CREW_SEATS} from './imasora-coast-crew.mjs?v=120nz';
export {COAST_CREW_SEATS};
import {coastHeight,coastPierContains,COAST_WATER_Y,COAST_WORLD,COAST_DOCK_FENDERS} from './imasora-coast-layout.mjs?v=120mx';
import {advanceCoastSailing,validateCoastSailing,coastPushForce} from './imasora-coast-sailing.mjs?v=120jf';
import {coastWave} from './imasora-coast-waves.mjs?v=120mx';
import {COAST_VOYAGE,COAST_VOYAGE_SOLIDS,coastVoyageSolids,newCoastVoyage,validateCoastVoyage,advanceCoastVoyage} from './imasora-coast-voyage.mjs?v=120ju';
import {createCoastHarborTools,coastHarborSolids,coastHarborGeometry,coastHarborTimber} from './imasora-coast-harbor.mjs?v=120ny';
export {coastHarborSolids,coastHarborGeometry,coastHarborTimber};
import {createCoastWorkMooringTools,COAST_WORK_MOOR} from './imasora-coast-work-mooring.mjs?v=120mx';
import {createCoastSalvageTools,coastSalvageProps,coastSalvageSolids} from './imasora-coast-salvage.mjs?v=120ny';
export {coastSalvageProps,coastSalvageSolids};
import {createCoastUnloadingTools} from './imasora-coast-unloading.mjs?v=120ju';
import {createCoastBoatBookTools} from './imasora-coast-boat-book.mjs?v=120ny';
// Both the visible ring and the solver use this exact target. Existing earned
// stars stay earned; no checkpoint schema or construction stock changes.
export const COAST_SHORE_GOAL=Object.freeze({x:12,z:272,radius:43.2,minCenterY:COAST_WATER_Y+7});
export function coastShoreReached(cargo){if(!cargo)return false;const dx=cargo.p[0]-COAST_SHORE_GOAL.x,dz=cargo.p[2]-COAST_SHORE_GOAL.z;return dx*dx+dz*dz<=COAST_SHORE_GOAL.radius**2&&cargo.p[1]>COAST_SHORE_GOAL.minCenterY;}
export function coastShoreProgress(s){const cargo=s.parts.find(p=>p.id==='sea-1');if(!cargo)return null;const distance=Math.hypot(cargo.p[0]-COAST_SHORE_GOAL.x,cargo.p[2]-COAST_SHORE_GOAL.z),inside=distance<=COAST_SHORE_GOAL.radius,done=s.goals.shore;return{inside,done,progress:done?1:Math.max(0,Math.min(1,1-Math.max(0,distance-COAST_SHORE_GOAL.radius)/(158-COAST_SHORE_GOAL.radius))),text:done?'★ 浜まで運べた！ 浮きをはずしたり、別の形もためしてみよう。':inside?'箱は輪の中！ 浮きをつけて、水から引き上げよう。':distance<COAST_SHORE_GOAL.radius+35?'あと少し！ 箱の中心を黄色い輪へ入れよう。':'「つかんで引く」で引っぱろう。箱の中心を浜の黄色い輪に入れたらゴール！'};}
export const COAST_HELM_MARGIN=6;
// New loads sit over the hull centre. Saved cargo keeps its exact placement;
// the solver still uses the real weight and centre of gravity of every part.
export const COAST_CARGO_FORWARD=0;
export const SEA_PLAY=Object.freeze({dt:1/120,gravity:95,density:.01,personMass:65,maxParts:13,maxLinks:18,maxHistory:10});
// These are the actual two deck slabs and supporting posts drawn by the coast.
// Keeping the underside solid lets floating equipment drift beneath an open
// span without being teleported up onto an invisible horizontal seabed.
export const SEA_PIER_SOLIDS=Object.freeze([
 {x:340,z:342.5,halfX:25,halfZ:157.5,minY:-3,maxY:0},
 {x:340,z:551,halfX:64,halfZ:51,minY:-3,maxY:0},
 ...Array.from({length:13},(_,i)=>[317,363].map(x=>({x,z:210+i*30,halfX:1.8,halfZ:1.8,minY:-15,maxY:i>=10?0:5}))).flat(),...COAST_DOCK_FENDERS,...COAST_HOME_MOOR_POSTS
]);
export const SEA_PARTS=Object.freeze({
 board:Object.freeze({name:'いかだの板',size:[64,6,54],mass:65,limit:3,color:0xd9a65d}),
 float:Object.freeze({name:'うき',size:[16,16,54],mass:16,limit:8,color:0x66c9d6}),
 cargo:Object.freeze({name:'重い資材箱',size:[26,22,26],mass:190,limit:2,color:0xf3ae59})
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ok=(v,m)=>{if(!v)throw Error(m);};
export const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a);
const norm=a=>mul(a,1/(length(a)||1));
export const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]],conj=q=>[-q[0],-q[1],-q[2],q[3]];
export function rotate(q,v){const x=q[0],y=q[1],z=q[2],w=q[3],tx=(y*v[2]-z*v[1])*2,ty=(z*v[0]-x*v[2])*2,tz=(x*v[1]-y*v[0])*2;return[v[0]+(tx*w+(y*tz-z*ty)),v[1]+(ty*w+(z*tx-x*tz)),v[2]+(tz*w+(x*ty-y*tx))];}
export const worldPoint=(p,v)=>add(p.p,rotate(p.q,v));
export const localPoint=(p,v)=>rotate(conj(p.q),sub(v,p.p));
const axes=q=>[[1,0,0],[0,1,0],[0,0,1]].map(a=>rotate(q,a));
export const seaFloor=(x,z)=>Math.max(coastHeight(x,z),coastPierContains(x,z)?0:-Infinity,islandPathSurface(x,z),islandPortSurface(x,z));
const newPart=(type,id,p,q=[0,0,0,1])=>({id,type,p:[...p],q:[...q],v:[0,0,0],w:[0,0,0]});
export function initialCoastPlay(){
 const s={version:1,geography:2,tick:0,edit:0,serial:8,parts:[newPart('cargo','sea-1',[12,7,430]),newPart('board','sea-2',[72,seaFloor(72,287)+3,287]),newPart('float','sea-3',[-35,seaFloor(-35,297)+8,297]),newPart('float','sea-4',[-60,seaFloor(-60,297)+8,297]),newPart('board','sea-5',[340,-1,642]),newPart('float','sea-6',[299.4,-11.5,642]),newPart('float','sea-7',[380.6,-11.5,642])],links:[],history:[],goals:{shore:false,sail:false,sailTicks:0}};
 for(const id of ['sea-6','sea-7'])s.links.push({id:'join-'+id,kind:'weld',a:'sea-5',b:id});
 for(const side of[-1,1])s.links.push({id:'pier-line-'+side,kind:'moor',a:'sea-5',anchor:[340+side*24,4,598],localA:[side*24,3,-27],length:17});return s;
}
// Rebuilding a welded frame must not square tiny quaternion-length errors
// after every work undo/save edit. Leave existing unit frames bit-identical.
const unitFrameQ=q=>{const n=Math.hypot(...q);return Math.abs(n-1)>1e-12?q.map(v=>v/n):q;};
const caches=new WeakMap();
function components(s){
 let cached=caches.get(s);if(cached?.edit===s.edit)return cached.groups;
 const map=new Map(s.parts.map(p=>[p.id,p])),seen=new Set(),groups=[];
 for(const part of s.parts){if(seen.has(part.id))continue;const ids=new Set([part.id]);let more=true;while(more){more=false;for(const j of s.links)if(j.kind==='weld'&&ids.has(j.a)!==ids.has(j.b)){ids.add(j.a);ids.add(j.b);more=true;}}
 const members=[...ids].map(id=>map.get(id));members.forEach(p=>seen.add(p.id));const root=members.find(p=>p.type==='board')??members[0],qi=conj(unitFrameQ(root.q)),mass=members.reduce((n,p)=>n+SEA_PARTS[p.type].mass,0);
 const rows=members.map(p=>({id:p.id,offset:rotate(qi,sub(p.p,root.p)),q:unitFrameQ(qmul(qi,unitFrameQ(p.q))),mass:SEA_PARTS[p.type].mass}));const center=mul(rows.reduce((n,p)=>add(n,mul(p.offset,p.mass)),[0,0,0]),1/mass),inertia=[0,0,0];
 for(const r of rows){const p=map.get(r.id),[w,h,d]=SEA_PARTS[p.type].size,I=[r.mass*(h*h+d*d)/12,r.mass*(w*w+d*d)/12,r.mass*(w*w+h*h)/12],R=axes(r.q),v=sub(r.offset,center);
 for(let a=0;a<3;a++)inertia[a]+=I.reduce((n,k,i)=>n+k*R[i][a]*R[i][a],0)+r.mass*(dot(v,v)-v[a]*v[a]);}
 groups.push({rootId:root.id,ids,rows,center,mass,inertia});}
 caches.set(s,{edit:s.edit,groups});return groups;
}
export function coastAssembly(s,id){return components(s).find(g=>g.ids.has(id))??null;}
export const COAST_WINCH=Object.freeze({min:10,max:152,speed:10,pull:8500,loadingSpeed:3.8,loadingPull:22000});
// Use the existing cleat and actual rope: winding changes its rest length,
// never the position of a load or the mass/buoyancy of either assembly.
const loadingArrivalBrakes=new WeakMap();
const loadingWindOrigins=new WeakMap();
export const coastReleaseWinchBrake=s=>loadingArrivalBrakes.delete(s);
export function coastWinchLines(s,id){
 const g=coastAssembly(s,id);if(!g)return[];const lines=[];
 for(const j of s.links){if(j.kind!=='rope'||j.id.startsWith('unload-brake-')||g.ids.has(j.a)===g.ids.has(j.b))continue;const first=g.ids.has(j.a),board=s.parts.find(p=>p.id===(first?j.a:j.b)),load=s.parts.find(p=>p.id===(first?j.b:j.a));if(board?.type!=='board'||!load)continue;
  const la=first?j.localA:j.localB,lb=first?j.localB:j.localA,pa=worldPoint(board,la),pb=worldPoint(load,lb),delta=sub(pb,pa),distance=length(delta),va=add(board.v,cross(board.w,rotate(board.q,la))),vb=add(load.v,cross(load.w,rotate(load.q,lb))),separating=distance?dot(sub(vb,va),mul(delta,1/distance)):0,tension=distance>j.length?Math.max(0,Math.min(j.id.startsWith('loading-line-')&&coastWorkMoored(s,board.id)?workMoor.forceLimit(s,j):24000,(distance-j.length)*1800+separating*600)):0;
  const loading=j.id.startsWith('loading-line-'),work=loading&&coastWorkMoored(s,board.id),support=loading?loadDeck(s,load):null,arrived=loading&&(support?.id===board.id&&Math.abs(support.local[0])<=18&&Math.abs(support.local[2])<=13||loadingArrivalBrakes.get(s)?.edit===s.edit&&loadingArrivalBrakes.get(s).links.has(j.id));lines.push({id:j.id,board:board.id,load:load.id,type:load.type,mass:coastAssembly(s,load.id).mass,length:j.length,distance,tension,slack:Math.max(0,j.length-distance),point:pa,target:pb,pull:work?COAST_WORK_MOOR.loadingPull:loading?COAST_WINCH.loadingPull:COAST_WINCH.pull,speed:work?COAST_WORK_MOOR.loadingSpeed:loading?COAST_WINCH.loadingSpeed:COAST_WINCH.speed,loading,arrived,slipping:work&&rotate(board.q,[0,1,0])[1]<Math.cos(20*Math.PI/180),canWind:!arrived&&j.length>COAST_WINCH.min+.001&&(!work||rotate(board.q,[0,1,0])[1]>=Math.cos(20*Math.PI/180)),canPay:j.length<COAST_WINCH.max-.001});
 }return [...lines,...unloading.lines(s,id)];
}
export function coastWinchStep(s,input,dt=SEA_PLAY.dt){
 if(!input||![-1,1].includes(input.direction)||!Number.isFinite(dt)||dt<=0||dt>SEA_PLAY.dt)return false;
 const line=coastWinchLines(s,input.board).find(j=>j.id===input.link);if(line?.loading&&input.direction<0&&line.arrived){let brake=loadingArrivalBrakes.get(s);if(brake?.edit!==s.edit){brake={edit:s.edit,links:new Set()};loadingArrivalBrakes.set(s,brake);}if(!brake.links.has(line.id)){const rope=s.links.find(j=>j.id===line.id);rope.length=Math.min(COAST_WINCH.max,Math.max(rope.length,line.distance+1));brake.links.add(line.id);}return false;}if(input.direction>0)loadingArrivalBrakes.delete(s);if(!line||input.direction<0&&!line.canWind)return false;
 const rope=s.links.find(j=>j.id===line.id),speed=input.direction<0?line.speed*Math.max(0,1-line.tension/line.pull):line.speed;let next=clamp(rope.length+input.direction*speed*dt,COAST_WINCH.min,COAST_WINCH.max);if(line.shore){const brake=s.links.find(j=>j.id==='unload-brake-'+line.board+'-'+line.load);if(!brake)return false;const end=clamp(brake.length-(next-rope.length),COAST_WINCH.min,COAST_WINCH.max);next=rope.length-(end-brake.length);brake.length=end;}if(next===rope.length)return false;rope.length=next;return true;
}
export function coastIsLoadingRamp(s,id){return s.links.some(j=>j.kind==='weld'&&j.b===id&&(j.id==='loading-ramp-'+id||j.id.startsWith('unload-ramp-')));}
export function coastLoadingRamp(s,id){const g=coastAssembly(s,id);if(!g)return null;const j=s.links.find(j=>j.id==='loading-ramp-'+j.b&&g.ids.has(j.a));return j?{board:j.a,id:j.b,side:j.side}:null;}
export function coastLoadingRampPose(board,side){const sign=side===0?1:-1,a=42*Math.PI/180,c=Math.cos(a),sn=Math.sin(a);return {point:worldPoint(board,[0,3*(1-c)-32*sn,sign*(27+32*c+3*sn+.2)]),rotation:qmul(board.q,qmul([sign*Math.sin(a/2),0,0,Math.cos(a/2)],[0,-sign*Math.SQRT1_2,0,Math.SQRT1_2]))};}
export function coastLoadingPlan(s,id,side,{source=null,obstacles=[],actor=null,riderId=null}={}){
 const board=s.parts.find(p=>p.id===id&&p.type==='board'),bad=message=>({valid:false,message,point:null,rotation:null,board:id,side,source});if(!board||coastIsLoadingRamp(s,id)||![0,1].includes(side))return bad('船の板を選ぼう。');if(coastLoadingRamp(s,id)||coastUnloadingRamp(s,id))return bad('荷役板は、もう渡してあるよ。');
 const pose=coastLoadingRampPose(board,side),plan={...pose,board:id,side,source,valid:false},refuse=message=>({...plan,message});if(coastReadout(s,id,null,false).floats<4)return refuse('箱を積む船には、左右に浮きを4つつけよう。');if(rotate(board.q,[0,1,0])[1]<Math.cos(12*Math.PI/180))return refuse('船を安定させてから、荷役板を渡そう。');
 if(actor&&(Math.hypot(board.p[0]-actor.x,board.p[2]-actor.z)>130||Math.abs(board.p[1]-actor.y)>60))return refuse('船のそばで、荷役板を渡そう。');if(s.links.length>=SEA_PLAY.maxLinks)return refuse('ロープを1つ片付けてから使おう。');
 if(source!==null?source===riderId||!coastLooseParts(s,id,'board').some(p=>p.id===source):s.parts.filter(p=>p.type==='board').length>=SEA_PARTS.board.limit||s.parts.length>=SEA_PLAY.maxParts)return refuse('近くの空いている板を使うか、板を1枚返そう。');
 const ramp=newPart('board','preview',pose.point,pose.rotation),box=obb(ramp);if(Math.abs(ramp.p[0])>COAST_WORLD.width/2-100||ramp.p[2]<205||ramp.p[2]>COAST_WORLD.depth/2-35)return refuse('海岸の中へ船を戻そう。');
 if(s.parts.some(p=>p.id!==board.id&&p.id!==source&&overlap(box,obb(p))))return refuse('板が道具に重なるよ。反対側を試そう。');if(actor&&overlap(box,{p:[actor.x,actor.y+20,actor.z],axes:[[1,0,0],[0,1,0],[0,0,1]],half:[9,19,9]}))return refuse('モンスターから少し離して渡そう。');
 if([...SEA_PIER_SOLIDS,...ISLAND_PATH_SOLIDS,...ISLAND_PORT_SOLIDS,...coastVoyageSolids(s),...coastIslandPropSolids(s),...coastSalvageSolids(s),...coastHarborSolids(s),...obstacles].some(o=>overlap(box,obstacleBox(o))))return refuse('桟橋や建物に重なるよ。反対側を試そう。');for(const x of[-32,32])for(const y of[-3,3])for(const z of[-27,27]){const p=worldPoint(ramp,[x,y,z]);if(coastHeight(p[0],p[2])>p[1]+.1)return refuse('海に向いている側へ渡そう。');}
 return{...plan,valid:true,message:'黄色い板が渡す場所。実際の板を1枚使うよ。'};
}
export function coastLoadingOffer(s,id){
 const g=coastAssembly(s,id),board=g&&s.parts.find(p=>p.type==='board'&&g.ids.has(p.id)&&!coastIsLoadingRamp(s,p.id));if(!board)return null;const ramp=coastLoadingRamp(s,board.id),candidates=s.parts.filter(p=>p.type==='cargo'&&(g.ids.has(p.id)||(!s.parts.some(b=>b.type==='board'&&coastAssembly(s,p.id).ids.has(b.id))&&(length(sub(p.p,board.p))<155||length(sub(p.p,board.p))<210&&s.links.some(j=>j.kind==='rope'&&[j.a,j.b].includes(p.id)&&[j.a,j.b].includes(board.id)))))).sort((a,b)=>Number(g.ids.has(b.id))-Number(g.ids.has(a.id))||Number(s.links.some(j=>j.kind==='rope'&&[j.a,j.b].includes(b.id)&&[j.a,j.b].includes(board.id)))-Number(s.links.some(j=>j.kind==='rope'&&[j.a,j.b].includes(a.id)&&[j.a,j.b].includes(board.id)))||length(sub(a.p,board.p))-length(sub(b.p,board.p))),cargo=candidates[0];if(!ramp&&!cargo)return null;
 const secured=!!cargo&&s.links.some(j=>j.id.startsWith('cargo-strap-')&&j.a===board.id&&j.b===cargo.id),support=cargo&&loadDeck(s,cargo),ready=support?.id===board.id&&Math.abs(support.local[0])<=18&&Math.abs(support.local[2])<=13,rigged=!!cargo&&s.links.some(j=>j.id.startsWith('loading-line-')&&j.a===board.id&&j.b===cargo.id);if(secured&&!ramp)return null;return{board:board.id,ramp,cargo:cargo?.id,secured,ready,rigged,side:ramp?.side??(cargo&&localPoint(board,cargo.p)[2]>=0?0:1)};
}
// The field winch catches a box only after the real deck supports it. The
// controller commits this ordinary belt action before the next physical step.
export function coastLoadingCatch(s,input){
 const origin=loadingWindOrigins.get(s);if(input&&input.direction!==-1||!input&&!origin)return null;const command=input??origin,lines=s.links.filter(j=>j.id.startsWith('loading-line-')&&j.id===command.link&&j.a===command.board);
 for(const j of lines){const offer=coastLoadingOffer(s,j.a);if(offer?.cargo===j.b&&offer.ready&&!offer.secured)return {type:'secure',id:j.b};}return null;
}
const oarReaches=new WeakMap();
export function coastOarReach(s,id){let c=oarReaches.get(s);if(c?.edit!==s.edit){c={edit:s.edit,rows:new Map()};oarReaches.set(s,c);}if(c.rows.has(id))return c.rows.get(id);const deck=s.parts.find(p=>p.id===id),g=coastAssembly(s,id);if(!deck||!g)return[-48,48];let lo=-32,hi=32;for(const p of s.parts.filter(p=>g.ids.has(p.id))){const[w,h,d]=SEA_PARTS[p.type].size;for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2]){const px=localPoint(deck,worldPoint(p,[x,y,z]))[0];lo=Math.min(lo,px);hi=Math.max(hi,px);}}const value=[lo-12,hi+12];c.rows.set(id,value);return value;}
function rigid(s,g,rider,portion=1){const root=s.parts.find(p=>p.id===g.rootId),members=g.rows.map(r=>({part:s.parts.find(p=>p.id===r.id),...r})),q=[...unitFrameQ(root.q)],center=add(root.p,rotate(q,g.center)),v=mul(members.reduce((n,r)=>add(n,mul(r.part.v,r.mass)),[0,0,0]),1/g.mass),b={g,root,members,q,center,v,w:[...root.w],force:[0,-g.mass*SEA_PLAY.gravity,0],torque:[0,0,0]};
 // A rider contributes inertia as well as weight. Treating the extra 65 kg
 // only as a downward force made a light raft respond far too abruptly.
 if(rider&&g.ids.has(rider.id)&&portion>0){const person=SEA_PLAY.personMass*portion,mass=g.mass+person,local=localPoint(root,rider.point),next=mul(add(mul(g.center,g.mass),mul(local,person)),1/mass),a=sub(g.center,next),r=sub(local,next),inertia=g.inertia.map((n,i)=>n+g.mass*(dot(a,a)-a[i]*a[i])+person*(dot(r,r)-r[i]*r[i]+54));b.g={...g,mass,center:next,inertia};b.center=add(root.p,rotate(q,next));b.v=add(v,cross(b.w,sub(b.center,center)));b.force=[0,0,0];force(b,[0,-g.mass*SEA_PLAY.gravity,0],center);}return b;}
// Ballast is actual carried mass: it changes the centre of gravity and
// inertia as well as gravity. Nothing snaps the raft upright or toward an island.
function addRigMass(b,rig){
 const point=worldPoint(b.root,[0,rig.y,rig.z]),local=localPoint(b.root,point),mass=b.g.mass+rig.mass,next=mul(add(mul(b.g.center,b.g.mass),mul(local,rig.mass)),1/mass),a=sub(b.g.center,next),r=sub(local,next),inertia=b.g.inertia.map((n,i)=>n+b.g.mass*(dot(a,a)-a[i]*a[i])+rig.mass*(dot(r,r)-r[i]*r[i]+(i===0?24:i===1?24+rig.spread**2:rig.spread**2+8))),old=b.center;
 b.center=add(b.root.p,rotate(b.q,next));const delta=sub(b.center,old);b.torque=sub(b.torque,cross(delta,b.force));b.v=add(b.v,cross(b.w,delta));b.g={...b.g,mass,center:next,inertia};force(b,[0,-rig.mass*SEA_PLAY.gravity,0],point);
}
function inverseI(b,v){const local=rotate(conj(b.q),v);return rotate(b.q,local.map((n,i)=>n/b.g.inertia[i]));}
function force(b,f,p){const x=p[0]-b.center[0],y=p[1]-b.center[1],z=p[2]-b.center[2];b.force[0]+=f[0];b.force[1]+=f[1];b.force[2]+=f[2];b.torque[0]+=y*f[2]-z*f[1];b.torque[1]+=z*f[0]-x*f[2];b.torque[2]+=x*f[1]-y*f[0];}
function impulse(b,j,p){b.v=add(b.v,mul(j,1/b.g.mass));b.w=add(b.w,inverseI(b,cross(sub(p,b.center),j)));}
function pointVelocity(b,p){const x=p[0]-b.center[0],y=p[1]-b.center[1],z=p[2]-b.center[2];return[b.v[0]+(b.w[1]*z-b.w[2]*y),b.v[1]+(b.w[2]*x-b.w[0]*z),b.v[2]+(b.w[0]*y-b.w[1]*x)];}
function sync(b){const rootP=sub(b.center,rotate(b.q,b.g.center));for(const r of b.members){const p=r.part;p.p=add(rootP,rotate(b.q,r.offset));p.q=qmul(b.q,r.q);p.v=pointVelocity(b,p.p);p.w=[...b.w];}}
function denominator(b,p,n){const r=sub(p,b.center);return 1/b.g.mass+dot(n,cross(inverseI(b,cross(r,n)),r));}
function contact(a,b,n,depth,p){
 const invA=1/a.g.mass,invB=b?1/b.g.mass:0,correction=mul(n,Math.max(0,depth-.012)*.75/(invA+invB));a.center=sub(a.center,mul(correction,invA));if(b)b.center=add(b.center,mul(correction,invB));
 let rv=sub(b?pointVelocity(b,p):[0,0,0],pointVelocity(a,p)),vn=dot(rv,n);if(vn<0){const j=-(1.03)*vn/(denominator(a,p,n)+(b?denominator(b,p,n):0));impulse(a,mul(n,-j),p);if(b)impulse(b,mul(n,j),p);
 rv=sub(b?pointVelocity(b,p):[0,0,0],pointVelocity(a,p));const tv=sub(rv,mul(n,dot(rv,n))),tl=length(tv);if(tl>.001){const t=mul(tv,1/tl),jt=Math.min(j*.55,tl/(denominator(a,p,t)+(b?denominator(b,p,t):0)));impulse(a,mul(t,jt),p);if(b)impulse(b,mul(t,-jt),p);}}
 sync(a);if(b)sync(b);
}
const movingShapes=new WeakMap();
function obb(p){
 const old=movingShapes.get(p);if(old&&old.position===p.p&&old.rotation===p.q&&old.type===p.type&&old.qx===p.q[0]&&old.qy===p.q[1]&&old.qz===p.q[2]&&old.qw===p.q[3])return old.box;
 const half=SEA_PARTS[p.type].size.map(v=>v/2),box={p:p.p,axes:axes(p.q),half};box.extent=[0,1,2].map(i=>half.reduce((n,h,j)=>n+h*Math.abs(box.axes[j][i]),0));
 movingShapes.set(p,{position:p.p,rotation:p.q,type:p.type,qx:p.q[0],qy:p.q[1],qz:p.q[2],qw:p.q[3],box});return box;
}
const staticShapes=new WeakMap();
function obstacleBox(o){
 const x=o.x,z=o.z,lo=o.minY??0,hi=o.maxY??o.obstacleHeight??30,a=o.rotation??0,hx=o.localHalfX??o.halfX,hz=o.localHalfZ??o.halfZ,old=staticShapes.get(o);
 if(old&&old.x===x&&old.z===z&&old.lo===lo&&old.hi===hi&&old.a===a&&old.hx===hx&&old.hz===hz)return old.box;
 const c=Math.cos(a),sn=Math.sin(a),box={p:[x,(lo+hi)/2,z],axes:[[c,0,-sn],[0,1,0],[sn,0,c]],half:[hx,(hi-lo)/2,hz],extent:[Math.abs(c)*hx+Math.abs(sn)*hz,(hi-lo)/2,Math.abs(sn)*hx+Math.abs(c)*hz]};staticShapes.set(o,{x,z,lo,hi,a,hx,hz,box});return box;
}
// A tilted crate meets a real pier floor at its lowest supporting corners.
// A normal under the centre of a tilted box would leave it balancing in air.
function pierCargoPoint(p,o,hit){if(p.type!=='cargo'||(o!==SEA_PIER_SOLIDS[0]&&o!==SEA_PIER_SOLIDS[1])||hit.n[1]>-.99)return null;let low=Infinity,points=[];for(const x of[-13,13])for(const y of[-11,11])for(const z of[-13,13]){const v=worldPoint(p,[x,y,z]);if(Math.abs(v[0]-o.x)>o.halfX+.01||Math.abs(v[2]-o.z)>o.halfZ+.01)continue;if(v[1]<low-.03){low=v[1];points=[v];}else if(v[1]<=low+.03)points.push(v);}return points.length?mul(points.reduce((sum,p)=>add(sum,p),[0,0,0]),1/points.length):null;}
// A bridge has two separate bearing faces. Resolve its weight at the real
// underside on each bank, not at the broad SAT box's representative corner.
function islandBoardContact(p,o,hit){
 if(p.type!=='board'||!o.id?.startsWith('island-path-')||hit.n[1]>-.99)return null;
 let low=Infinity,points=[];for(const x of[-32,32])for(const z of[-27,27]){const v=worldPoint(p,[x,-3,z]);
  if(Math.abs(v[0]-o.x)>o.halfX+.01||Math.abs(v[2]-o.z)>o.halfZ+.01)continue;
  if(v[1]<low-.03){low=v[1];points=[v];}else if(v[1]<=low+.03)points.push(v);
 }return points.length?mul(points.reduce((sum,p)=>add(sum,p),[0,0,0]),1/points.length):null;
}
function overlap(a,b){
 const delta=sub(b.p,a.p),extent=(o,n)=>o.half[0]*Math.abs(dot(o.axes[0],n))+o.half[1]*Math.abs(dot(o.axes[1],n))+o.half[2]*Math.abs(dot(o.axes[2],n));let depth=Infinity,normal=null;
 // Conservative world-axis rejection precedes the full 15-axis test. A tiny
 // margin retains near-touching rotated contacts despite rounding at an edge.
 if(a.extent&&b.extent)for(let i=0;i<3;i++)if(Math.abs(delta[i])>a.extent[i]+b.extent[i]+1e-9)return null;
 for(let i=0;i<15;i++){const axis=i<3?a.axes[i]:i<6?b.axes[i-3]:cross(a.axes[Math.floor((i-6)/3)],b.axes[(i-6)%3]);const len=length(axis);if(len<1e-7)continue;const n=mul(axis,1/len),gap=extent(a,n)+extent(b,n)-Math.abs(dot(delta,n));if(gap<=0)return null;if(gap<depth){depth=gap;normal=dot(delta,n)>=0?n:mul(n,-1);}}
 const support=(o,n,sign)=>add(o.p,o.axes.reduce((v,a,i)=>add(v,mul(a,o.half[i]*clamp(dot(a,n)*sign*20,-1,1))),[0,0,0]));
 let p=mul(add(support(a,normal,1),support(b,normal,-1)),.5);
 // Face contact should act under the overlapping load, not midway between two
 // unrelated box centres (which produces artificial torque on a stacked crate).
 if(Math.abs(normal[1])>.7){const ax=extent(a,[1,0,0]),az=extent(a,[0,0,1]),bx=extent(b,[1,0,0]),bz=extent(b,[0,0,1]),small=ax*az<=bx*bz?a:b;p=[clamp(small.p[0],Math.max(a.p[0]-ax,b.p[0]-bx),Math.min(a.p[0]+ax,b.p[0]+bx)),p[1],clamp(small.p[2],Math.max(a.p[2]-az,b.p[2]-bz),Math.min(a.p[2]+az,b.p[2]+bz))];}
 return {n:normal,depth,p};
}
// Walking on a boarding plank must see the same tilted part as the buoyancy
// solver. Flattening a rolled float to yaw alone creates an invisible wall.
// The body is the official measured footprint, including its real offsets.
export function coastBodyPartContact(part,body,actor,heading,skin=.35){
 if(!part||!body||!actor||!Number.isFinite(skin)||skin<0||![actor.x,actor.y,actor.z,heading,body.offsetX,body.offsetZ,body.halfX,body.halfZ,body.minY,body.maxY].every(Number.isFinite)||body.halfX<=0||body.halfZ<=0||body.maxY<=body.minY)return null;
 const c=Math.cos(heading),s=Math.sin(heading),half=[body.halfX+skin,(body.maxY-body.minY)/2,body.halfZ+skin],box={p:[actor.x+body.offsetX*c+body.offsetZ*s,actor.y+(body.minY+body.maxY)/2,actor.z-body.offsetX*s+body.offsetZ*c],axes:[[c,0,-s],[0,1,0],[s,0,c]],half};
 box.extent=[Math.abs(c)*half[0]+Math.abs(s)*half[2],half[1],Math.abs(s)*half[0]+Math.abs(c)*half[2]];
 const hit=overlap(box,obb(part));return hit?{intersects:true,penetration:hit.depth}:{intersects:false,penetration:0};
}
// The old socket is offset=turn=0. New layouts are stored as the existing real
// part poses, so old checkpoints and ten-step undo need no migration.
export function coastMountRotation(parent,turn=0){return turn===0?[...parent.q]:qmul(parent.q,[0,Math.sin(turn*Math.PI/4),0,Math.cos(turn*Math.PI/4)]);}
export function coastMountRange(parent,type,side,turn=0){const a=SEA_PARTS[parent.type].size,b=SEA_PARTS[type].size,index=side<2?2:0;return (a[index]+b[turn%2?2-index:index])/2-8;}
export function coastMountPoint(parent,type,side,offset=0,turn=0){const [w,h,d]=SEA_PARTS[parent.type].size,spec=SEA_PARTS[type],[sw,,sd]=turn%2?[spec.size[2],spec.size[1],spec.size[0]]:spec.size,off=side<2?[Math.sign(side-.5)*(w/2+sw/2+.6),type==='float'?(parent.type==='board'?-h/2-spec.size[1]/2+.5:parent.type==='float'?0:-h/2):parent.type==='float'?h/2+spec.size[1]/2-.5:0,offset]:[offset,type==='float'?(parent.type==='board'?-h/2-spec.size[1]/2+.5:parent.type==='float'?0:-h/2):parent.type==='float'?h/2+spec.size[1]/2-.5:0,Math.sign(side-2.5)*(d/2+sd/2+.6)];return worldPoint(parent,off);}
const workMoor=createCoastWorkMooringTools({SEA_PLAY,coastAssembly,coastReadout,coastIsLoadingRamp,coastLoadingOffer,worldPoint,rotate,length,sub,ok});
export const coastStopWorkAlignment=(s,id)=>workMoor.stop(s,id);
export const coastWorkAlignPlan=(...a)=>workMoor.alignPlan(...a);
export const coastWorkMoorPlan=(...a)=>workMoor.plan(...a),coastWorkMoored=(...a)=>workMoor.active(...a);
const islandPath=createCoastIslandPathTools({ok,newPart,obb,overlap});
const salvage=createCoastSalvageTools({SEA_PLAY,SEA_PARTS,ok,coastAssembly,coastReadout,length,sub,worldPoint,newPart,obb,overlap});
export const coastSalvagePlan=(...a)=>salvage.plan(...a);
const unloading=createCoastUnloadingTools({SEA_PARTS,SEA_PLAY,worldPoint,localPoint,rotate,qmul,sub,length,dot,mul,add,cross,coastAssembly,coastReadout,coastLooseParts,seaFloor,coastHeight,obb,overlap,obstacleBox,newPart,loadDeck,SEA_PIER_SOLIDS,coastVoyageSolids,COAST_WINCH,ok});
export const coastUnloadingLanded=(...a)=>unloading.landed(...a);
export const coastUnloadingPlan=(s,id,side,o={})=>unloading.plan(s,id,side,{...o,obstacles:[...coastHarborSolids(s),...o.obstacles??[]]}),coastUnloadingOffer=(...a)=>unloading.offer(...a),coastUnloadingRamp=(...a)=>unloading.ramp(...a),coastUnloadOwner=(...a)=>unloading.owner(...a);
const harbor=createCoastHarborTools({SEA_PLAY,SEA_PARTS,SEA_PIER_SOLIDS,coastVoyageSolids,coastSalvageSolids,worldPoint,coastAssembly,coastReadout,coastIsLoadingRamp,obb,overlap,obstacleBox,length,sub});
export const coastHarborPlan=(...a)=>harbor.plan(...a),coastHarborMoorPlan=(...a)=>harbor.moorPlan(...a);
const crew=createCoastCrewTools({SEA_PIER_SOLIDS,coastVoyageSolids,coastHarborSolids,coastSalvageSolids,loadDeck,worldPoint,localPoint,rotate,coastAssembly,coastReadout,coastSupport,coastIsLoadingRamp,obb,overlap,obstacleBox,seaFloor,COAST_WATER_Y});
export const coastCrewSeats=(...a)=>crew.seats(...a);
export const coastCrewPlan=(...a)=>crew.plan(...a),coastCrewClear=(...a)=>crew.clear(...a),coastCrewAvailable=(...a)=>crew.available(...a);
const boatBook=createCoastBoatBookTools({SEA_PARTS,coastAssembly,worldPoint,localPoint,qmul,conj,coastMountPoint,coastMountRotation,coastMountRange});
export const coastBoatBookGeometry=page=>boatBook.geometry(page),coastBoatBookProgress=(s,active)=>boatBook.progress(s,active),captureCoastBoatDesign=(s,id,name)=>boatBook.capture(s,id,name);
// Only loose, nearby loan parts may be moved to a socket. Never take a part
// out of another build, move the rider's deck, or fetch equipment across the sea.
export function coastLooseParts(s,id,type){
 const parent=s.parts.find(p=>p.id===id);if(!parent||!['float','board'].includes(type))return [];
 return s.parts.filter(p=>p.id!==id&&p.type===type&&!s.links.some(j=>j.a===p.id||j.b===p.id)&&(!s.voyage||s.voyage.done||![s.voyage.board,s.voyage.cargo].includes(p.id))&&Math.hypot(p.p[0]-parent.p[0],p.p[2]-parent.p[2])<=180&&Math.abs(p.p[1]-parent.p[1])<=50).sort((a,b)=>length(sub(a.p,parent.p))-length(sub(b.p,parent.p))||a.id.localeCompare(b.id));
}
export function coastMountFocus(s,id,type,source=null){
 const parent=s.parts.find(p=>p.id===id);if(!parent)return null;
 const group=coastAssembly(s,id),parts=[...s.parts.filter(p=>group.ids.has(p.id)||p.id===source)];for(const turn of[0,1])for(const side of[0,1,2,3])for(const offset of[-coastMountRange(parent,type,side,turn),coastMountRange(parent,type,side,turn)])parts.push(newPart(type,'preview',coastMountPoint(parent,type,side,offset,turn),coastMountRotation(parent,turn)));const points=[];
 for(const p of parts){const size=SEA_PARTS[p.type].size;for(const x of[-1,1])for(const y of[-1,1])for(const z of[-1,1])points.push(worldPoint(p,[x*size[0]/2,y*size[1]/2,z*size[2]/2]));}
 const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))),center=lo.map((v,i)=>(v+hi[i])/2);center[1]+=8;
 return {center,radius:Math.max(85,...points.map(p=>length(sub(p,center))+25))};
}
export function canCoastMount(s,id,type,side,{obstacles=[],source=null,actor=null,riderId=null,offset=0,turn=0}={}){
 const parent=s.parts.find(p=>p.id===id),reuse=source!==null;
 if(!parent||coastIsLoadingRamp(s,id)||!['float','board'].includes(type)||!Number.isInteger(side)||side<0||side>3||!Number.isInteger(turn)||turn<0||turn>3||!Number.isFinite(offset)||Math.abs(offset)>coastMountRange(parent,type,side,turn)+1e-7||s.links.length>=SEA_PLAY.maxLinks)return false;
 if(reuse?source===riderId||!coastLooseParts(s,id,type).some(p=>p.id===source):s.parts.filter(p=>p.type===type).length>=SEA_PARTS[type].limit||s.parts.length>=SEA_PLAY.maxParts)return false;
 const p=newPart(type,'preview',coastMountPoint(parent,type,side,offset,turn),coastMountRotation(parent,turn)),box=obb(p);
 if(Math.abs(p.p[0])>COAST_WORLD.width/2-80||p.p[2]<205||p.p[2]>COAST_WORLD.depth/2-35||s.parts.some(b=>{if(b.id===id||b.id===source)return false;const hit=overlap(box,obb(b));return !!hit&&!(type==='board'&&b.type==='float'&&coastAssembly(s,id)?.ids.has(b.id)&&hit.depth<=.7&&Math.abs(hit.n[1])>.9);}))return false;
 if(actor&&overlap(box,{p:[actor.x,actor.y+20,actor.z],axes:[[1,0,0],[0,1,0],[0,0,1]],half:[9,19,9]}))return false;
 return ![...SEA_PIER_SOLIDS,...coastSalvageSolids(s),...coastHarborSolids(s),...obstacles].some(o=>{if(Math.abs(p.p[0]-o.x)>90+(o.halfX??0)||Math.abs(p.p[2]-o.z)>90+(o.halfZ??0))return false;const a=o.rotation??0,c=Math.cos(a),sn=Math.sin(a),lo=o.minY??0,hi=o.maxY??o.obstacleHeight??30;return overlap(box,{p:[o.x,(lo+hi)/2,o.z],axes:[[c,0,-sn],[0,1,0],[sn,0,c]],half:[o.localHalfX??o.halfX,(hi-lo)/2,o.localHalfZ??o.halfZ]});});
}
export function coastSupport(s,x,z,reference=Infinity){
 let result=null;for(const p of s.parts){if(p.type!=='board')continue;
  // The full 64×54 board top, including the existing 1-unit walking margin,
  // fits in a radius-44 sphere at every rotation. Faraway ground probes do not
  // need quaternion transforms; nearby probes use the identical plane test.
  const dx=x-p.p[0],dz=z-p.p[2];if(dx*dx+dz*dz>44*44)continue;
  const n=rotate(p.q,[0,1,0]);if(n[1]<.6)continue;const top=worldPoint(p,[0,SEA_PARTS.board.size[1]/2,0]),y=top[1]-(n[0]*(x-top[0])+n[2]*(z-top[2]))/n[1];if(y>reference+2.5)continue;const local=localPoint(p,[x,y,z]),[w,,d]=SEA_PARTS.board.size;if(Math.abs(local[0])>w/2+1||Math.abs(local[2])>d/2+1)continue;if(!result||result.y<y)result={id:p.id,y,local,normal:n};}return result;
}
export function loadDeck(s,p){if(p.type!=='cargo')return null;const bottom=worldPoint(p,[0,-SEA_PARTS.cargo.size[1]/2,0]),f=coastSupport(s,bottom[0],bottom[2],bottom[1]+2);if(f&&Math.abs(f.y-bottom[1])<4)return f;if(!s.links.some(j=>j.id.startsWith('loading-line-')&&j.b===p.id))return null;const g=coastAssembly(s,p.id);for(const member of s.parts.filter(m=>m.type==='float'&&g.ids.has(m.id)))for(const x of[-8,0,8])for(const z of[-27,0,27]){const foot=worldPoint(member,[x,-8,z]),deck=coastSupport(s,foot[0],foot[2],foot[1]+2);if(deck&&!g.ids.has(deck.id)&&Math.abs(deck.y-foot[1])<2){const center=localPoint(s.parts.find(b=>b.id===deck.id),p.p);return {...deck,local:[center[0],deck.local[1],center[2]]};}}
 // Recovered boxes may settle on another face. Inspect real low vertices;
 // never rotate the crate, pretend it is upright, or count a high corner.
 for(const member of s.parts.filter(m=>(m.type==='float'||m.id===p.id)&&g.ids.has(m.id))){const half=SEA_PARTS[member.type].size.map(v=>v/2),vertices=[];for(const x of[-half[0],half[0]])for(const y of[-half[1],half[1]])for(const z of[-half[2],half[2]])vertices.push(worldPoint(member,[x,y,z]));const low=Math.min(...vertices.map(v=>v[1]));for(const foot of vertices){if(foot[1]>low+.5)continue;const deck=coastSupport(s,foot[0],foot[2],foot[1]+.5);if(deck&&!g.ids.has(deck.id)&&Math.abs(deck.y-foot[1])<.75){const center=localPoint(s.parts.find(b=>b.id===deck.id),p.p);return {...deck,local:[center[0],deck.local[1],center[2]]};}}}return null;}
// New loans leave the stern clear for a passenger. Existing cargo keeps its
// saved position and weld offset; this plan only places a newly borrowed box.
// This read-only plan is checked again by the edit, never trusted from a ghost.
export function coastCargoDeckPlan(s,id,{actor=null,obstacles=[]}={}){
 const board=s.parts.find(p=>p.id===id&&p.type==='board');
 if(!board||coastIsLoadingRamp(s,id))return{board:id,valid:false,message:'箱を載せたい船の板をタップしてね。',point:null,rotation:null};
 const point=worldPoint(board,[0,SEA_PARTS.board.size[1]/2+SEA_PARTS.cargo.size[1]/2+1.2,COAST_CARGO_FORWARD]),rotation=[...board.q],plan={board:id,point,rotation,valid:false,message:''};
 const refuse=message=>({...plan,message});
 if(s.links.length>=SEA_PLAY.maxLinks)return refuse('つなぎ目がいっぱいだよ。ロープを1つほどいてから載せよう。');
 if(s.parts.filter(p=>p.type==='cargo').length>=SEA_PARTS.cargo.limit||s.parts.length>=SEA_PLAY.maxParts)return refuse('箱は全部、海岸に出ているよ。道具箱へ返してから使おう。');
 if(actor&&(Math.hypot(point[0]-actor.x,point[2]-actor.z)>135||Math.abs(point[1]-actor.y)>80))return refuse('いかだの近くで、板をえらぼう。');
 if(rotate(board.q,[0,1,0])[1]<Math.cos(35*Math.PI/180))return refuse('板が大きく傾いているよ。浮きを左右につけて安定させよう。');
 if(Math.abs(point[0])>COAST_WORLD.width/2-100||point[2]<205||point[2]>COAST_WORLD.depth/2-35)return refuse('岸に近い、別の板をえらぼう。');
 const cargo=newPart('cargo','preview',point,rotation),box=obb(cargo);
 if(actor&&overlap(box,{p:[actor.x,actor.y+20,actor.z],axes:[[1,0,0],[0,1,0],[0,0,1]],half:[9,19,9]}))return refuse('そこにモンスターがいるよ。板を降りてから載せよう。');
 if(s.parts.some(p=>p.id!==id&&overlap(box,obb(p))))return refuse('板の中央に道具があるよ。空いている板をえらぼう。');
 if([...SEA_PIER_SOLIDS,...coastVoyageSolids(s),...coastSalvageSolids(s),...coastHarborSolids(s),...obstacles].some(o=>overlap(box,obstacleBox(o))))return refuse('箱が桟橋や建物に重なるよ。別の板をえらぼう。');
 for(const x of[-13,13])for(const z of[-13,13]){const p=worldPoint(cargo,[x,-11,z]);if(coastHeight(p[0],p[2])>p[1]-.25)return refuse('箱が砂に重なるよ。別の板をえらぼう。');}
 return{...plan,valid:true,message:'黄色い箱が積む場所だよ。「載せてしばる」で積み込もう。'};
}
// Recovery is a confirmed game action, not a towing force or a voyage shortcut.
// Preserve the built assembly, find an empty berth, then let normal physics run.
const voyageRetry=createCoastVoyageRetryTools({coastAssembly,coastCrewSeats,rotate,worldPoint,localPoint,SEA_PARTS,SEA_PLAY,seaFloor,coastWave,qmul,conj,obb,overlap,obstacleBox,relatedLinks:(s,ids)=>unloading.related(s,ids),solids:s=>[...SEA_PIER_SOLIDS,...ISLAND_PORT_SOLIDS,...ISLAND_PATH_SOLIDS,...coastVoyageSolids(s),...coastSalvageSolids(s),...coastHarborSolids(s)]});
export const coastVoyageRetryPlan=voyageRetry.plan,coastVoyageReboard=voyageRetry.reboard,recordCoastDryLand=voyageRetry.land;
export function coastRecovery(s,id,{obstacles=[],riderId=null,actor=null,port="home"}={}){
 const berth=coastPort(port);ok(berth,"船着き場を選びなおそう。");const sign=berth.out;
 const chosen=s.parts.find(p=>p.id===id),g=chosen&&coastAssembly(s,id),board=g&&s.parts.find(p=>p.type==='board'&&g.ids.has(p.id));
 ok(board&&s.parts.some(p=>p.type==='float'&&g.ids.has(p.id)),'浮きをつないだ、いかだを選んでね。');
 ok(!riderId||!g.ids.has(riderId),'いかだから降りてから、助けよう。');
 const portQ=sign<0?[0,1,0,0]:[0,0,0,1],members=s.parts.filter(p=>g.ids.has(p.id)),local=members.map(p=>{const q=qmul(conj(board.q),p.q),n=Math.hypot(...q);return{p,offset:rotate(portQ,localPoint(board,p.p)),q:qmul(portQ,q.map(v=>v/n))};});
 // Face out to sea, leaving the centre aisle between the pontoons clear.
 // Extra separation gives a high-tide plank room to descend to the pier
 // without crossing the raised shore-side float of a side-on berth.
 let minZ=Infinity;for(const r of local){const[w,h,d]=SEA_PARTS[r.p.type].size;for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2])minZ=Math.min(minZ,sign*add(r.offset,rotate(r.q,[x,y,z]))[2]);}
 const paired=unloading.related(s,g.ids),removed=s.links.filter(j=>j.kind!=='weld'&&(g.ids.has(j.a)||g.ids.has(j.b)||paired.includes(j.id))),kept=s.links.filter(j=>!removed.includes(j)),room=SEA_PLAY.maxLinks-kept.length;
 ok(room>0,'結び目がいっぱいだよ。ロープを1つほどいてから、もう一度ためそう。');
 const solids=[...SEA_PIER_SOLIDS,...ISLAND_PORT_SOLIDS,...ISLAND_PATH_SOLIDS,...coastVoyageSolids(s),...coastSalvageSolids(s),...coastHarborSolids(s),...obstacles];
 if(actor)solids.push({x:actor.x,z:actor.z,halfX:9,halfZ:9,minY:actor.y+1,maxY:actor.y+40});
 const other=s.parts.filter(p=>!g.ids.has(p.id));
 for(const dz of[0,12,24,36])for(const dx of[0,-140,140,-70,70]){
  const centralCargo=local.some(r=>r.p.type==='cargo'&&Math.abs(r.offset[0])<.5&&Math.abs(r.offset[2])<2),origin=[berth.x+dx,3.5,berth.edge+sign*((centralCargo?32:24)-minZ+dz)],parts=local.map(r=>({...r.p,p:add(origin,r.offset),q:[...r.q],v:[0,0,0],w:[0,0,0]}));
  if(parts.some(p=>Math.abs(p.p[0])>COAST_WORLD.width/2-80||p.p[2]>COAST_WORLD.depth/2-35))continue;
  // Keep an actual deck within jumping distance of the pier head.
  const reachable=parts.some(p=>{const box=obb(p);return p.type==='board'&&Math.hypot(Math.max(0,Math.abs(p.p[0]-berth.x)-64-box.extent[0]),Math.max(0,sign*(p.p[2]-berth.edge)-box.extent[2]))<95;});
  if(!reachable)continue;
  const blocked=parts.some(p=>{const box=obb(p),[w,h,d]=SEA_PARTS[p.type].size;
   for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2]){const v=worldPoint(p,[x,y,z]);if(coastHeight(v[0],v[2])>v[1]-.5)return true;}
   return other.some(p=>overlap(box,obb(p)))||solids.some(o=>overlap(box,obstacleBox(o)));
  });if(blocked)continue;
  const front=parts.filter(p=>p.type==='board'&&!coastIsLoadingRamp(s,p.id)).sort((a,b)=>sign*(a.p[2]-b.p[2])||Math.abs(a.p[0]-berth.x)-Math.abs(b.p[0]-berth.x))[0],moorings=[];
  // A snug line supports the shore-side end before a slow crossing can
  // tip it below the walkable angle. The ordinary rope solver still lets
  // the hull move with waves; recovery never pins its pose to the pier.
  const cleats=shoreCleats(front,berth);for(const side of[-1,1].slice(0,Math.min(2,room))){const anchor=port==="home"?coastHomeBerthAnchor(side):[berth.x+sign*side*24,berth.y+18,berth.edge-sign*4],localA=cleats[side===-1?0:1],distance=length(sub(worldPoint(front,localA),anchor));if(distance>258)continue;moorings.push({id:coastBerthLineId(port,front.id,side,localA),kind:'moor',a:front.id,anchor,localA,length:Math.max(10,Math.ceil(distance+(port==="home"?2.5:-3.5)))});}
  if(moorings.length)return{port,shore:berth.shore,board:board.id,parts,removeLinks:removed.map(j=>j.id),moorings,ropeCount:removed.filter(j=>j.kind==='rope').length};
 }
 throw Error('桟橋の前がいっぱいだよ。近くの道具を少し移動してから、もう一度ためそう。');
}
export function coastReadout(s,id,rider=null,includeLoads=true){let g=coastAssembly(s,id);if(!g)return null;const selected=s.parts.find(p=>p.id===id),support=includeLoads&&loadDeck(s,selected);if(support)g=coastAssembly(s,support.id);const parts=s.parts.filter(p=>g.ids.has(p.id)),loads=includeLoads?s.parts.filter(p=>p.type==='cargo'&&!g.ids.has(p.id)&&g.ids.has(loadDeck(s,p)?.id)):[],mass=g.mass+loads.reduce((n,p)=>n+SEA_PARTS[p.type].mass,0)+(rider&&g.ids.has(rider.id)?SEA_PLAY.personMass:0),capacity=parts.reduce((n,p)=>n+SEA_PARTS[p.type].size.reduce((a,b)=>a*b)*SEA_PLAY.density,0),root=parts.find(p=>p.id===g.rootId),up=rotate(root.q,[0,1,0]);return {mass,capacity,margin:capacity-mass,tilt:Math.acos(clamp(up[1],-1,1))*180/Math.PI,floats:parts.filter(p=>p.type==='float').length,count:parts.length+loads.length,supported:!!support,loads:loads.length};}

// Mark the real adjoining faces, not the midpoint buried inside a wide deck.
export function coastConnections(s,id){
 const p=s.parts.find(p=>p.id===id);if(!p)return[];
 const edge=(a,b)=>{const v=localPoint(a,b),half=SEA_PARTS[a.type].size.map(n=>n/2);return worldPoint(a,v.map((n,i)=>clamp(n,-half[i],half[i])));};
 return s.links.filter(j=>j.kind!=='moor'&&(j.a===id||j.b===id)).map(j=>{const a=s.parts.find(p=>p.id===j.a),b=s.parts.find(p=>p.id===j.b);let point;
  if(j.kind==='rope'){const pa=worldPoint(a,j.localA),pb=worldPoint(b,j.localB),slack=Math.min(10,Math.max(0,j.length-length(sub(pa,pb)))*.4);point=mul(add(pa,pb),.5);point[1]-=slack;}
  else if(j.id.startsWith('cargo-strap-')){const cargo=a.type==='cargo'?a:b;point=worldPoint(cargo,[0,SEA_PARTS.cargo.size[1]/2+1,0]);}
  else point=mul(add(edge(a,b.p),edge(b,a.p)),.5);
  return{id:j.id,kind:j.kind,point,marker:[point[0],Math.max(point[1]+8,a.p[1]+SEA_PARTS[a.type].size[1]/2+10,b.p[1]+SEA_PARTS[b.type].size[1]/2+10),point[2]],a:a.id,b:b.id};
 });
}
export function coastConnectionFocus(s,id){const rows=coastConnections(s,id);if(!rows.length)return null;const ids=new Set(rows.flatMap(r=>[r.a,r.b])),points=rows.map(r=>r.marker);for(const p of s.parts.filter(p=>ids.has(p.id))){const[w,h,d]=SEA_PARTS[p.type].size;for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2])points.push(worldPoint(p,[x,y,z]));}const lo=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))),center=lo.map((v,i)=>(v+hi[i])/2);center[1]+=8;return{center,radius:Math.max(85,...points.map(p=>length(sub(p,center))+25))};}

// The boat faces local +Z. In that frame +X is the helmsman's left;
// the negative-X oar pushes forward to turn left (positive yaw).
export function coastOarsForTurns(turns){if(turns.includes('brake'))return{left:0,right:0,brake:true};const left=turns.includes('left'),right=turns.includes('right');if(turns.includes('both')||left&&right)return{left:1,right:1};return left?{left:1,right:-.8}:right?{left:-.8,right:1}:{left:0,right:0};}

export function coastPlayGuide(s,id,rider=null){
 if(s.cargoRetired===1)return{text:rider?'パッドで進む・曲がる。「止まる」で減速。岸の近くで上陸しよう。':'いかだに乗って、島々へ出航しよう。板と浮きは組みかえられるよ。'};
 const trip=s.voyage,selected=s.parts.find(p=>p.id===id),g=coastAssembly(s,rider?.id??(selected?.type==='cargo'?loadDeck(s,selected)?.id:null)??id),board=s.parts.find(p=>p.type==='board'&&g?.ids.has(p.id));
 if(trip){const target=COAST_VOYAGE[trip.stage],boat=s.parts.find(p=>p.id===trip.board),crew=coastAssembly(s,trip.board),aboard=!!rider&&crew?.ids.has(rider.id),loaded=crew?.ids.has(trip.cargo)&&s.links.some(j=>j.id.startsWith('cargo-strap-')&&[j.a,j.b].includes(trip.cargo));let text;
  if(trip.done)text='★ お届けできた！ 組みかえて、もう一度挑戦しよう。';
  else if(!loaded)text='箱を板の中央に置き、「荷物をしばる」。続きから届けられるよ。';
  else if(!aboard)text='荷物を積んだいかだに乗ろう。';
  else if(s.links.some(j=>j.kind==='moor'&&crew.ids.has(j.a)))text='「ロープをほどいて出発」で海へ！';
  else if(trip.stage===2&&boat&&Math.hypot(boat.p[0]-target.x,boat.p[2]-target.z)<=target.radius)text=coastReadout(s,boat.id,rider).tilt>=22?'板の中央へもどって、傾きをおさえよう。':Math.hypot(boat.v[0],boat.v[2])>=8?'「止まる」で減速。輪の中で止まろう。':'そのまま3秒！ 荷物を受け取っているよ。';
  else text=target.name+'へ。船の前から見た矢印の方向にこごう。';
  const forward=boat&&rotate(boat.q,[0,0,1]),angle=target&&boat?-Math.atan2(Math.sin(Math.atan2(target.x-boat.p[0],target.z-boat.p[2])-Math.atan2(forward[0],forward[2])),Math.cos(Math.atan2(target.x-boat.p[0],target.z-boat.p[2])-Math.atan2(forward[0],forward[2])))*180/Math.PI:0;
  return{text,stage:trip.stage,progress:trip.hold/360,angle:Math.round(angle)||0,steer:!!target&&aboard&&loaded&&!s.links.some(j=>j.kind==='moor'&&crew.ids.has(j.a)),done:trip.done};
 }
 if(board&&s.salvage&&s.links.some(j=>j.kind==='rope'&&[j.a,j.b].includes(s.salvage.cargo)&&[j.a,j.b].includes(board.id)))return{text:'浮いた箱を曳いて、母港へ帰ろう。船に乗り、いかりを上げると出発できるよ。'};
 if(board){const info=coastReadout(s,board.id,rider),cargo=s.parts.find(p=>p.type==='cargo'&&(g.ids.has(p.id)||g.ids.has(loadDeck(s,p)?.id))),secured=cargo&&s.links.some(j=>j.id.startsWith('cargo-strap-')&&[j.a,j.b].includes(cargo.id));return{text:info.tilt>=22?'端から中央へもどろう。浮きを左右に増やすと、傾きにくくなるよ。':info.floats<4?'荷物を運ぶなら、浮きの外側にも浮きをつけて4つにしよう。':!cargo?'準備できた！「道具箱」で箱を借り、「載せてしばる」で積もう。':!secured?'板の箱をタップ →「荷物をしばる」で固定しよう。':'準備できた！「荷物を届ける」で①②③の旗へ。'};}
 if(selected?.type==='cargo'&&coastPierContains(selected.p[0],selected.p[2]))return{text:'岸へ下ろした箱だよ。つかんで動かしたり、別の船へ載せ直せるよ。'};
 if(selected&&g?.ids.has('sea-1')){const goal=coastShoreProgress(s);return{text:!goal.done&&!goal.inside&&coastReadout(s,selected.id).floats<2?'箱を選んで、浮きを左右につけよう。重い箱が浮くかな？':goal.text,shoreProgress:goal.progress,shoreDone:goal.done};}
 return{text:'②は箱運び、③は自分のいかだ！ 実物をタップしてはじめよう。'};
}

// Broad-phase candidates retain their original solver order. Recheck geometry
// once per display frame, and reuse cell membership in the 120 Hz substeps.
// Dynamic actor contacts remain separate and are never cached in the field.
export function createCoastContactField(){
 let rows=[],snapshot=[],cells=new Map();const size=128;
 return{update(obstacles=[],play){const next=[...SEA_PIER_SOLIDS,...ISLAND_PORT_SOLIDS,...coastVoyageSolids(play),...obstacles];let changed=next.length!==rows.length;
  for(let i=0;i<next.length;i++){const o=next[i],k=i*5;if(rows[i]!==o||snapshot[k]!==o.x||snapshot[k+1]!==o.z||snapshot[k+2]!==o.halfX||snapshot[k+3]!==o.halfZ||snapshot[k+4]!==o.rotation)changed=true;}
  if(changed){rows=next;snapshot=rows.flatMap(o=>[o.x,o.z,o.halfX,o.halfZ,o.rotation]);cells.clear();}return this;
 },nearby(p){const cx=Math.floor(p.p[0]/size),cz=Math.floor(p.p[2]/size),key=cx+':'+cz;let bucket=cells.get(key);if(!bucket){bucket=rows.filter(o=>o.x+90+(o.halfX??0)>=cx*size&&o.x-90-(o.halfX??0)<(cx+1)*size&&o.z+90+(o.halfZ??0)>=cz*size&&o.z-90-(o.halfZ??0)<(cz+1)*size);if(cells.size>=256)cells.clear();cells.set(key,bucket);}return bucket.filter(o=>Math.abs(p.p[0]-o.x)<=90+(o.halfX??0)&&Math.abs(p.p[2]-o.z)<=90+(o.halfZ??0));}};
}

function brakeOars(s,b,deck,t,options){for(const reach of coastOarReach(s,deck.id)){const tip=worldPoint(deck,[reach,3,0]),water=options.wave?.(tip[0],tip[2],t)??coastWave(tip[0],tip[2],t),p=[tip[0],water.height-1,tip[2]];if(Math.abs(tip[1]-water.height)>=40||(options.groundAt??coastHeight)(p[0],p[2])>=water.height-2)continue;const velocity=pointVelocity(b,p),gainRig=rigProfile(options.rig??{equipped:options.rigLevel??0}).brake,fx=(water.vx-velocity[0])*650*gainRig,fz=(water.vz-velocity[2])*650*gainRig,gain=Math.min(1,4500*Math.min(1.8,gainRig)/(Math.hypot(fx,fz)||1));force(b,[fx*gain,0,fz*gain],p);}}

// Tie to existing visible shore posts when the seabed is too deep for an
// anchor. Only rope rest lengths change; hull pose and momentum are retained.
function shoreCleats(board,port){
 const shore=localPoint(board,[port.x,board.p[1],port.edge]),xEdge=Math.abs(shore[0])/32>=Math.abs(shore[2])/27;
 const points=xEdge?[-1,1].map(side=>[Math.sign(shore[0]||1)*32,3,side*24]):[-1,1].map(side=>[side*24,3,Math.sign(shore[2]||1)*27]);
 const anchor=side=>port.id==='home'?coastHomeBerthAnchor(side):[port.x+port.out*side*24,port.y+18,port.edge-port.out*4],cost=rows=>rows.reduce((n,p,i)=>n+length(sub(worldPoint(board,p),anchor(i===0?-1:1))),0);
 return cost(points)<=cost([...points].reverse())?points:[...points].reverse();
}
export function coastShoreMooring(s,id){
 const board=s.parts.find(p=>p.id===id&&p.type==='board');if(!board||s.links.length>=SEA_PLAY.maxLinks)return null;
 let best=null;
 for(const port of [COAST_HOME_PORT,...COAST_ISLAND_PORTS]){
  const d=Math.hypot(board.p[0]-port.x,board.p[2]-port.edge);
  if(d>132||Math.abs(board.p[0]-port.x)>96||port.out*(board.p[2]-port.edge)<24||best&&d>=best.distance)continue;
  const moorings=[],cleats=shoreCleats(board,port);
  for(const side of[-1,1].slice(0,SEA_PLAY.maxLinks-s.links.length)){
   const localA=cleats[side===-1?0:1],anchor=port.id==='home'?coastHomeBerthAnchor(side):[port.x+port.out*side*24,port.y+18,port.edge-port.out*4],distance=length(sub(worldPoint(board,localA),anchor));
   if(distance>258)continue;
   moorings.push({id:coastBerthLineId(port.id,id,side,localA),kind:'moor',a:id,anchor,localA,length:Math.max(10,Math.ceil(distance-3.5))});
  }
  if(moorings.length)best={port:port.id,name:port.name,distance:d,moorings};
 }
 return best;
}

export function stepCoastPlay(s,input={},options={}){
 if(s.sailing?.phase==='capsized')return;
 if(input.winch&&!input.workAlign)coastWinchStep(s,input.winch);
 if(input.workAlign)workMoor.alignStep(s,input.workAlign,SEA_PLAY.dt);
 // A person crossing the hinged plank shares their weight with shore. The
 // part borne by the raft must also contribute inertia, just like a rider.
 const crossing=input.gangwayLoad,validCrossing=crossing&&Number.isFinite(crossing.massFraction)&&crossing.point?.length===3&&crossing.point.every(Number.isFinite);
 const rig=rigProfile(options.rig??{equipped:options.rigLevel??0}),dt=SEA_PLAY.dt,t=Number.isFinite(options.seaTime)?options.seaTime:s.tick*dt,groups=components(s).map(g=>input.rider&&g.ids.has(input.rider.id)?rigid(s,g,input.rider):rigid(s,g,validCrossing?crossing:null,validCrossing?clamp(crossing.massFraction,0,1):0)),lookup=new Map();for(const b of groups)for(const r of b.members)lookup.set(r.id,b);
 for(const b of groups){
  const outfitted=b.g.ids.has(input.rider?.id??'sea-5');if(outfitted&&rig.mass)addRigMass(b,rig);
  // All water samples share this body's orientation and translational speed.
  // Keep each sample's own wave/point velocity and the original force order.
  const enhanced=outfitted&&(rig.side||rig.forward||rig.vertical||rig.glide||rig.surf),rigInverse=outfitted?conj(b.q):null,rigMotion=enhanced?rotate(rigInverse,b.v):null,forwardResponse=enhanced&&!rig.surf?rigWaterResponse(rig,{speed:rigMotion[2]}).forward:null;
  for(const r of b.members){const p=r.part,spec=SEA_PARTS[p.type],A=obb(p).axes,[w,h,d]=spec.size,vol=w*h*d/9,half=.5*(Math.abs(A[0][1])*w/3+Math.abs(A[1][1])*h+Math.abs(A[2][1])*d/3);let wetSum=0;
   for(const ix of[-1,0,1])for(const iz of[-1,0,1]){const point=worldPoint(p,[ix*w/3,0,iz*d/3]),wave=options.wave?.(point[0],point[2],t)??coastWave(point[0],point[2],t),wet=clamp((wave.height-point[1])/(Math.max(.5,half)*2)+.5,0,1);wetSum+=wet;
    force(b,[0,vol*wet*SEA_PLAY.density*SEA_PLAY.gravity,0],point);
    const pv=pointVelocity(b,point),drag=spec.mass*wet/9;
    force(b,[(wave.vx-pv[0])*drag*.85,(wave.vy-pv[1])*drag*5.2,(wave.vz-pv[2])*drag*.85],point);
    if(enhanced){const rel=rotate(rigInverse,[wave.vx-pv[0],0,wave.vz-pv[2]]),forward=forwardResponse??rigWaterResponse(rig,{speed:rigMotion[2],tailFlow:rotate(rigInverse,[wave.vx,0,wave.vz])[2]}).forward,extra=rotate(b.q,[rel[0]*drag*.85*rig.side,0,rel[2]*drag*.85*(forward-1)]);extra[1]+=(wave.vy-pv[1])*drag*5.2*rig.vertical;force(b,extra,point);}
   }
   if(outfitted&&(rig.pitch||rig.roll)){const local=rotate(rigInverse,b.w),d=wetSum/9*1.1*dt;b.w=rotate(b.q,[local[0]*Math.exp(-d*(1+rig.pitch)),local[1]*Math.exp(-d),local[2]*Math.exp(-d*(1+rig.roll))]);}else b.w=mul(b.w,Math.exp(-(wetSum/9)*1.1*dt));
  }
  const gangway=input.gangwayLoad;if(gangway&&b.g.ids.has(gangway.id)&&Number.isFinite(gangway.massFraction)&&gangway.point?.length===3&&gangway.point.every(Number.isFinite))force(b,[0,-SEA_PLAY.personMass*SEA_PLAY.gravity*clamp(gangway.massFraction,0,1),0],gangway.point);
  const rider=input.rider;if(rider&&b.g.ids.has(rider.id)){force(b,[0,-SEA_PLAY.personMass*SEA_PLAY.gravity,0],rider.point);if(input.paddle){const d=input.paddle;force(b,[d[0]*1600,0,d[2]*1600],rider.point);}if(input.oars?.brake){const deck=b.members.find(r=>r.id===rider.id)?.part;if(deck)brakeOars(s,b,deck,t,options);}else if(input.oars){const deck=b.members.find(r=>r.id===rider.id)?.part;if(deck){const forward=rotate(deck.q,[0,0,1]),h=Math.hypot(forward[0],forward[2])||1,stroke=.35+.65*Math.max(0,Math.sin(t*rig.rate)),effort=rigOarResponse(rig,input.oars);for(const [side,held]of[[-1,effort.left],[1,effort.right]])if(held){const start=worldPoint(deck,[coastOarReach(s,deck.id)[side<0?0:1],3,0]),water=options.wave?.(start[0],start[2],t)??coastWave(start[0],start[2],t),p=[start[0],water.height-1,start[2]],direction=held,motion=rotate(conj(deck.q),b.v),flow=rotate(conj(deck.q),[water.vx,0,water.vz]),drive=rigWaterResponse(rig,{speed:motion[2],headFlow:-flow[2],both:effort.paired}).drive*effort.turn;if(Math.abs(start[1]-water.height)<40&&(options.groundAt??coastHeight)(p[0],p[2])<water.height-2)force(b,[forward[0]/h*1800*rig.force*drive*stroke*direction,0,forward[2]/h*1800*rig.force*drive*stroke*direction],p);}}}}
  if(input.push&&b.g.ids.has(input.push.id)&&!b.g.ids.has(input.rider?.id)){const push=coastPushForce(b.members.find(r=>r.id===input.push.id).part,input.push.actor);if(push)force(b,mul(push.direction,push.strength),push.point);}
  const grab=input.grab;if(grab&&b.g.ids.has(grab.id)){const part=b.members.find(r=>r.id===grab.id).part,point=worldPoint(part,grab.local??[0,0,0]),delta=sub(grab.target,point),v=pointVelocity(b,point),f=sub(mul(delta,grab.upright===true?2400:600),mul(v,800));force(b,mul(f,Math.min(1,(grab.upright===true?18000:12000)/(length(f)||1))),point);
   // A two-handed hold supplies a bounded restoring couple while held. It
   // does not set orientation/position or keep supporting the released plank.
   if(grab.upright===true&&part.type==='board'&&b.g.ids.size===1){const up=rotate(part.q,[0,1,0]),t=sub(mul(cross(up,[0,1,0]),195000),[b.w[0]*39000,0,b.w[2]*39000]);b.torque=add(b.torque,mul(t,Math.min(1,220000/(length(t)||1))));}
  }
 }
 for(const j of s.links){if(!['rope','moor'].includes(j.kind))continue;const a=lookup.get(j.a),b=j.kind==='moor'?null:lookup.get(j.b);if(a===b)continue;const pa=worldPoint(s.parts.find(p=>p.id===j.a),j.localA),pb=b?worldPoint(s.parts.find(p=>p.id===j.b),j.localB):j.anchor,delta=sub(pb,pa),dist=length(delta);if(dist<=j.length)continue;const dir=mul(delta,1/dist),separating=dot(sub(b?pointVelocity(b,pb):[0,0,0],pointVelocity(a,pa)),dir),limit=(j.id.startsWith('loading-line-')||j.id.startsWith('work-moor-')||j.id.startsWith('align-moor-'))&&coastWorkMoored(s,j.a)?workMoor.clutch(s,j,dist,separating):24000,f=Math.max(0,Math.min(limit,(dist-j.length)*1800+separating*600));force(a,mul(dir,f),pa);if(b)force(b,mul(dir,-f),pb);}
 for(const b of groups){b.v=add(b.v,mul(b.force,dt/b.g.mass));b.w=add(b.w,mul(inverseI(b,b.torque),dt));b.v=mul(b.v,Math.exp(-.045*dt));const speed=length(b.v);if(speed>65)b.v=mul(b.v,65/speed);const angular=length(b.w);if(angular>2.2)b.w=mul(b.w,2.2/angular);b.center=add(b.center,mul(b.v,dt));const dq=qmul([...b.w,0],b.q);b.q=b.q.map((v,i)=>v+dq[i]*dt/2);const ql=Math.hypot(...b.q);b.q=b.q.map(v=>v/ql);sync(b);}
 const ground=options.groundAt??coastHeight,obstacles=options.contactField?[...options.obstacles??[],...coastHarborSolids(s),...coastSalvageSolids(s),...coastIslandPropSolids(s)]:[...SEA_PIER_SOLIDS,...ISLAND_PATH_SOLIDS,...ISLAND_PORT_SOLIDS,...coastVoyageSolids(s),...coastIslandPropSolids(s),...coastSalvageSolids(s),...coastHarborSolids(s),...options.obstacles??[]],nearby=new Map(),groundContacts=new Map();
 // A full step moves less than one world unit. Keep a wide conservative margin
 // and scan distant static scenery once, rather than in every solver iteration.
 for(const p of s.parts){const local=obstacles.filter(o=>!o.excludeIds?.includes(p.id)&&Math.abs(p.p[0]-o.x)<=90+(o.halfX??0)&&Math.abs(p.p[2]-o.z)<=90+(o.halfZ??0));nearby.set(p.id,options.contactField?[...options.contactField.nearby(p),...local]:local);}
 for(let iter=0;iter<4;iter++){
  for(const b of groups){let deepest=null;
   for(const r of b.members){const p=r.part,old=groundContacts.get(p);let hit=old?.position===p.p&&old.rotation===p.q?old.hit:undefined;
    if(hit===undefined){hit=null;const[w,h,d]=SEA_PARTS[p.type].size;for(const x of[-w/2,w/2])for(const y of[-h/2,h/2])for(const z of[-d/2,d/2]){const v=worldPoint(p,[x,y,z]),depth=ground(v[0],v[2])-v[1];if(depth>0&&(!hit||depth>hit.depth))hit={p:v,depth};}groundContacts.set(p,{position:p.p,rotation:p.q,hit});}
    if(hit&&(!deepest||hit.depth>deepest.depth))deepest=hit;
   }
   if(deepest)contact(b,null,[0,-1,0],deepest.depth,deepest.p);
   for(const r of b.members){const p=r.part;if(Math.abs(p.p[0])>COAST_WORLD.width/2-50){b.center[0]+=clamp(p.p[0],-COAST_WORLD.width/2+50,COAST_WORLD.width/2-50)-p.p[0];b.v[0]*=-.1;sync(b);}if(p.p[2]>COAST_WORLD.depth/2-22||p.p[2]<185){b.center[2]+=clamp(p.p[2],185,COAST_WORLD.depth/2-22)-p.p[2];b.v[2]*=-.1;sync(b);}}
  }
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)for(const a of groups[i].members)for(const b of groups[j].members){const size=SEA_PARTS[a.part.type].size[0]+SEA_PARTS[b.part.type].size[0];if(length(sub(a.part.p,b.part.p))>size+45)continue;const hit=overlap(obb(a.part),obb(b.part));if(hit)contact(groups[i],groups[j],hit.n,hit.depth,hit.p);}
  for(const b of groups)for(const r of b.members){const p=r.part;for(const o of nearby.get(p.id)){const hit=overlap(obb(p),obstacleBox(o));if(hit)contact(b,null,hit.n,hit.depth,islandBoardContact(p,o,hit)??pierCargoPoint(p,o,hit)??hit.p);}}
 }
 for(const b of groups){const speed=length(b.v),turn=length(b.w);if(speed>90)b.v=mul(b.v,90/speed);if(turn>4.5)b.w=mul(b.w,4.5/turn);sync(b);}
 const cargo=s.parts.find(p=>p.id==='sea-1');if(!s.goals.shore&&coastShoreReached(cargo))s.goals.shore=true;
 const rider=input.rider,info=rider?coastReadout(s,rider.id,rider,false):null;if(info&&info.floats>=2&&info.tilt<20&&rider.point[2]>610)s.goals.sailTicks=Math.min(600,s.goals.sailTicks+1);else s.goals.sailTicks=Math.max(0,s.goals.sailTicks-2);if(s.goals.sailTicks>=600)s.goals.sail=true;
 if(s.voyage&&!s.voyage.done){const trip=s.voyage,g=coastAssembly(s,trip.board),board=s.parts.find(p=>p.id===trip.board),cargo=s.parts.find(p=>p.id===trip.cargo),secured=!!g?.ids.has(trip.cargo)&&s.links.some(j=>j.id.startsWith('cargo-strap-')&&[j.a,j.b].includes(trip.cargo));advanceCoastVoyage(trip,{point:board?[board.p[0],board.p[2]]:null,loaded:secured&&!!cargo,aboard:!!input.rider&&g?.ids.has(input.rider.id),speed:board?Math.hypot(board.v[0],board.v[2]):Infinity,tilt:board?coastReadout(s,board.id,null,false).tilt:180});}
 const sailingBoard=s.parts.find(p=>p.id===(input.helm?input.rider?.id:s.sailing?.board));
 if(sailingBoard)advanceCoastSailing(s,{board:input.helm?input.rider?.id:null,up:rotate(sailingBoard.q,[0,1,0])[1],afloat:seaFloor(sailingBoard.p[0],sailingBoard.p[2])<COAST_WATER_Y-5});
 voyageRetry.record(s,input,options.coastVisits?.islands);
 s.tick++;
}
function currentFrame(s){return structuredClone({...(s.geography?{geography:s.geography}:{}),parts:s.parts,links:s.links,serial:s.serial,goals:s.goals,tick:s.tick,...(s.voyage?{voyage:s.voyage}:{}),...(s.salvage?{salvage:s.salvage}:{}),...(s.harbor?{harbor:s.harbor}:{}),...(s.islandBoard?{islandBoard:s.islandBoard}:{})});}
export function editCoastPlay(s,action,options={}){
 validateCoastPlay(s);if(s.cargoRetired===1)ok(!(action.type==='borrow'&&action.part==='cargo')&&!['load','secure','voyage','loading-ramp','loading-rope','pack-ramp','work-moor','work-align'].includes(action.type)&&!salvage.edits.has(action.type)&&!unloading.edits.has(action.type),'板と浮きで、島への冒険を楽しもう。');if(coastHarborSolids(s).length)options={...options,obstacles:[...coastHarborSolids(s),...options.obstacles??[]]};const n=structuredClone(s);const find=id=>{const p=n.parts.find(p=>p.id===id);ok(p,'道具を選びなおしてね。');return p;};
 if(['crew-sit','crew-leave'].includes(action.type)){crew.edit(n,action,options);n.edit++;validateCoastPlay(n);return n;}
 if(['book-save','book-guide','book-hide'].includes(action.type)){boatBook.edit(n,action);n.edit++;validateCoastPlay(n);return n;}
 if(action.type==='undo'){delete n.sailing;delete n.crew;ok(n.history.length,'まだ戻せる作業がないよ。');delete n.voyage;delete n.salvage;delete n.harbor;delete n.islandBoard;Object.assign(n,n.history.pop());if(n.boatBook?.active&&!n.parts.some(p=>p.id===n.boatBook.active.boat&&p.type==='board'))delete n.boatBook.active;voyageRetry.prune(n);n.edit++;validateCoastPlay(n);return n;}
 const origin=loadingWindOrigins.get(s),mergeCatch=options.loadingCatch===true&&action.type==='secure'&&origin?.load===action.id&&origin.edit===s.edit&&s.history.length>0;
 if(!mergeCatch){n.history.push(currentFrame(s));if(n.history.length>10)n.history.shift();}
 if(action.type==='island-board')islandPath.take(n,options);
 else if(harbor.edits.has(action.type))harbor.edit(n,action,options);
 else if(action.type==='work-align')workMoor.alignEdit(n,action,options);
 else if(action.type==='work-moor')workMoor.edit(n,action,options);
 else if(salvage.edits.has(action.type))salvage.edit(n,action,options);
 else if(unloading.edits.has(action.type))unloading.edit(n,action,options);
 else if(action.type==='loading-ramp'){ok(options.actor,'船のそばで荷役板を渡そう。');const plan=coastLoadingPlan(n,action.id,action.side,{...options,source:action.source??null});ok(plan.valid,plan.message);const board=find(action.id),ramp=action.source!=null?find(action.source):newPart('board','sea-'+n.serial++,plan.point,plan.rotation);ramp.p=plan.point;ramp.q=plan.rotation;ramp.v=add(board.v,cross(board.w,sub(ramp.p,board.p)));ramp.w=[...board.w];if(action.source==null)n.parts.push(ramp);n.links.push({id:'loading-ramp-'+ramp.id,kind:'weld',a:board.id,b:ramp.id,side:action.side});}
 else if(action.type==='loading-rope'){const board=find(action.board),cargo=find(action.cargo),offer=coastLoadingOffer(n,board.id);ok(board.type==='board'&&cargo.type==='cargo'&&offer?.ramp&&offer.cargo===cargo.id&&!offer.secured,'荷役板のそばへ、積みたい箱を運ぼう。');ok(coastReadout(n,cargo.id,null,false).floats>=2,'箱の左右に浮きをつけて、水面へ持ち上げよう。');ok(!n.links.some(j=>j.id.startsWith('loading-line-')&&j.b===cargo.id&&j.a!==board.id),'前の滑車ロープをはずしてから使おう。');const actor=options.actor;ok(actor&&Math.hypot(actor.x-board.p[0],actor.z-board.p[2])<100&&Math.abs(actor.y-board.p[1])<60,'船のそばで滑車ロープをかけよう。');const old=n.links.find(j=>j.kind==='rope'&&[j.a,j.b].includes(board.id)&&[j.a,j.b].includes(cargo.id));ok(old||n.links.length<SEA_PLAY.maxLinks,'ロープを1つ片付けてから使おう。');const localA=[0,4,COAST_CARGO_FORWARD],localB=[0,-7,0],distance=length(sub(worldPoint(board,localA),worldPoint(cargo,localB)));ok(distance<=150,'箱を船のそばへ引き寄せよう。');if(old)n.links=n.links.filter(j=>j!==old);n.links.push({id:'loading-line-'+n.serial++,kind:'rope',a:board.id,b:cargo.id,localA,localB,length:Math.max(10,distance+2)});}
 else if(action.type==='pack-ramp'){const ramp=coastLoadingRamp(n,action.id)??coastUnloadingRamp(n,action.id);ok(ramp,'渡している荷役板を選ぼう。');ok(!ramp.link||!unloading.lines(n,ramp.board).length,'箱を岸へ下ろして、ロープを片付けてから板をしまおう。');const p=find(ramp.id),rampLink=ramp.link??'loading-ramp-'+ramp.id,actor=options.actor;ok(actor&&length(sub([actor.x,actor.y,actor.z],p.p))<160&&options.riderId!==p.id,'荷役板を降りて、船のそばで片付けよう。');const a=localPoint(p,[actor.x,actor.y,actor.z]);ok(Math.abs(a[0])>41||Math.abs(a[2])>36||Math.abs(a[1]-3)>4,'荷役板を降りてから片付けよう。');ok(!n.links.some(j=>j.id!==rampLink&&(j.a===p.id||j.b===p.id))&&!n.parts.some(c=>!coastAssembly(n,p.id).ids.has(c.id)&&overlap({...obb(p),p:worldPoint(p,[0,16,0]),half:[32,16,27]},obb(c))&&!(ramp.link&&c.type==='cargo'&&unloading.landed(n,c.id))),'板の上の荷物とつなぎ目を先に片付けよう。');n.links=n.links.filter(j=>j.id!==rampLink);n.parts=n.parts.filter(b=>b!==p);}
 else if(action.type==='borrow'){const spec=SEA_PARTS[action.part];ok(spec,'この道具は使えないよ。');ok(n.parts.filter(p=>p.type===action.part).length<spec.limit,'その道具は全部、海岸に出ているよ。');ok(n.parts.length<13,'道具置き場へ返してから使おう。');const p=action.point;ok(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite),'置き先を選んでね。');ok(!coastHarborSolids(n).some(o=>overlap(obb(newPart(action.part,'probe',p)),obstacleBox(o))),'ポールに重なるよ。空いている場所へ出そう。');n.parts.push(newPart(action.part,'sea-'+n.serial++,p));}
 else if(action.type==='load'){ok(options.actor,'いかだの近くで、板をえらぼう。');const plan=coastCargoDeckPlan(n,action.board,options);ok(plan.valid,plan.message);const cargo=newPart('cargo','sea-'+n.serial++,plan.point,plan.rotation);n.parts.push(cargo);n.links.push({id:'cargo-strap-'+n.serial++,kind:'weld',a:action.board,b:cargo.id});}
 else if(action.type==='attach'){
  const parent=find(action.id),type=action.part??'float',source=action.source??null;ok(['float','board'].includes(type),'つなぐ道具を選んでね。');
  if(source!==null)ok(coastLooseParts(n,parent.id,type).some(p=>p.id===source),'近くの、まだつながっていない道具を選ぼう。');
  else ok(n.parts.filter(p=>p.type===type).length<SEA_PARTS[type].limit,'その道具は全部、海岸に出ているよ。近くの道具を選んで使おう。');
  const offset=action.offset??0,turn=action.turn??0;
  ok(canCoastMount(n,parent.id,type,action.side,{...options,source,offset,turn}),'そこは道具や桟橋、モンスターに重なるよ。見本をずらすか、別の辺を選ぼう。');
  const point=coastMountPoint(parent,type,action.side,offset,turn),rotation=coastMountRotation(parent,turn),p=source!==null?find(source):newPart(type,'sea-'+n.serial++,point,rotation);
  if(source!==null){p.p=point;p.q=rotation;p.v=add(parent.v,cross(parent.w,sub(point,parent.p)));if(length(p.v)>90)p.v=mul(p.v,90/length(p.v));p.w=[...parent.w];}else n.parts.push(p);
  n.links.push({id:'join-'+p.id,kind:'weld',a:parent.id,b:p.id,side:action.side});
 }
 else if(action.type==='rope'){const a=find(action.a),b=find(action.b);ok(a!==b,'別の道具につなごう。');ok(!n.links.some(j=>[j.a,j.b].includes(a.id)&&[j.a,j.b].includes(b.id)),'この道具は、もうつながっているよ。');const localA=[0,SEA_PARTS[a.type].size[1]/2+1,0],localB=[0,SEA_PARTS[b.type].size[1]/2+1,0],dist=length(sub(worldPoint(a,localA),worldPoint(b,localB)));ok(dist<=150,'道具をもう少し近づけよう。');n.links.push({id:'rope-'+n.serial++,kind:'rope',a:a.id,b:b.id,localA,localB,length:Math.max(10,dist+2)});}
 else if(action.type==='detach'){const p=find(action.id),j=action.link!==undefined?n.links.find(j=>j.id===action.link&&(j.a===p.id||j.b===p.id)):n.links.findLast(j=>j.a===p.id||j.b===p.id);ok(j,'つなぎ目が変わったよ。道具を選びなおそう。');if(!harbor.detach(n,j)&&!workMoor.detach(n,j)&&!unloading.detach(n,j))n.links=n.links.filter(k=>k!==j);}
 else if(action.type==='return'){const p=find(action.id);if(n.sailing?.board===p.id)delete n.sailing;ok(p.id!==n.islandBoard?.id,'島の板は、そのまま橋や船に使えるよ。');ok(p.id!=='sea-1','この資材箱は、浜の旗まで運ぼう。');ok(!n.salvage||![n.salvage.cargo,n.salvage.float].includes(p.id),'海で見つけた部品は、海岸で組みかえて使おう。');ok(!n.links.some(j=>j.a===p.id||j.b===p.id),'つなぎ目をはずしてから返そう。');ok(!n.voyage||n.voyage.done||![n.voyage.board,n.voyage.cargo].includes(p.id),'航路をやめてから道具を返そう。');n.parts=n.parts.filter(k=>k!==p);}
 else if(action.type==='anchor'){
  const board=find(action.id),g=coastAssembly(n,board.id),actor=options.actor;ok(board.type==='board'&&actor&&Math.hypot(actor.x-board.p[0],actor.z-board.p[2])<=85,'船のそばで、いかりを下ろそう。');
  ok(!n.links.some(j=>j.kind==='moor'&&g.ids.has(j.a)),'もう船をつないでいるよ。');ok(n.links.length<SEA_PLAY.maxLinks,'ロープを一つ片付けよう。');ok(Math.hypot(board.v[0],board.v[2])<8,'まず「止まる」で速度を落とそう。');
  const berth=coastShoreMooring(n,board.id);
  if(berth)n.links.push(...berth.moorings);
  else{const floor=coastHeight(board.p[0],board.p[2]);ok(floor<COAST_WATER_Y-4&&floor>COAST_WATER_Y-180,'少し岸に近い、水のある場所で使おう。');
  const anchor=[board.p[0],floor,board.p[2]],localA=[0,-3,0],distance=length(sub(worldPoint(board,localA),anchor));ok(distance<185,'いかりが海底に届く場所へ戻ろう。');
  n.links.push({id:'sea-anchor-'+board.id,kind:'moor',a:board.id,anchor,localA,length:Math.max(6,Math.ceil(distance+2))});}
 }
 else if(action.type==='unmoor'){const g=coastAssembly(n,find(action.id).id);ok(n.links.some(j=>j.kind==='moor'&&g.ids.has(j.a)),'船は、もう自由に動けるよ。');const moors=n.links.filter(j=>j.kind==='moor'&&g.ids.has(j.a));for(const j of moors)if(!harbor.detach(n,j)&&!workMoor.detach(n,j)&&!unloading.detach(n,j))n.links=n.links.filter(k=>k!==j);}
 else if(action.type==='secure'){const cargo=find(action.id);ok(cargo.type==='cargo','荷物の箱をタップして選ぼう。');const prior=n.links.find(j=>j.id.startsWith('cargo-strap-')&&[j.a,j.b].includes(cargo.id));if(prior)n.links=n.links.filter(j=>j!==prior);else{const deck=loadDeck(n,cargo),board=deck&&find(deck.id);ok(board&&!coastIsLoadingRamp(n,board.id)&&Math.abs(deck.local[0])<=18&&Math.abs(deck.local[2])<=13,'板の中央に箱を置いてから、しばろう。');ok(!coastAssembly(n,board.id).ids.has(cargo.id),'この箱は、もう板につながっているよ。');n.links.push({id:'cargo-strap-'+n.serial++,kind:'weld',a:board.id,b:cargo.id});}}
 else if(action.type==='voyage'){const cargo=find(action.cargo),board=find(action.board);ok(cargo.type==='cargo'&&board.type==='board'&&coastAssembly(n,board.id).ids.has(cargo.id)&&n.links.some(j=>j.id.startsWith('cargo-strap-')&&[j.a,j.b].includes(cargo.id)),'板に箱を載せて、荷物をしばろう。');ok(coastReadout(n,board.id,null,false).floats>=4,'荷物を運ぶときは、浮きの外側にも浮きをつなぎ、4つにしよう。');n.voyage=newCoastVoyage(board.id,cargo.id);}
 else if(action.type==='cancel-voyage'){ok(n.voyage,'まだ航路をはじめていないよ。');delete n.voyage;}
 else if(action.type==='retry-voyage'){voyageRetry.apply(n,action.id,{...options,choice:action.choice??null});}
 else if(action.type==='recover'){voyageRetry.clear(n);if(n.sailing?.board===action.id)delete n.sailing;if(n.crew?.board===action.id)delete n.crew;const rescue=coastRecovery(n,action.id,{...options,port:action.port??"home"}),map=new Map(rescue.parts.map(p=>[p.id,p]));n.parts=n.parts.map(p=>map.get(p.id)??p);n.links=n.links.filter(j=>!rescue.removeLinks.includes(j.id));n.links.push(...rescue.moorings);if(n.voyage&&map.has(n.voyage.board)&&!n.voyage.done)n.voyage.hold=0;}
 else if(action.type==='reel'){const line=coastWinchLines(n,action.board).find(j=>j.id===action.link),actor=options.actor;ok(line&&[-1,1].includes(action.direction),'船につないだロープを選ぼう。');if(line.loading&&action.direction<0)loadingWindOrigins.set(n,{board:line.board,load:line.load,link:line.id,edit:s.edit+1});const board=find(line.board),cleat=line.shore?line.point:board.p;ok(!(line.loading&&action.direction<0&&options.riderId&&coastAssembly(n,board.id).ids.has(options.riderId)),'船を降りて箱の通り道を空けよう。岸から巻けるよ。');ok(actor&&Math.hypot(actor.x-cleat[0],actor.z-cleat[2])<=100&&Math.abs(actor.y-cleat[1])<65,'ロープを巻く場所のそばで使おう。');ok(action.direction<0?line.canWind:line.canPay,'ここまでだよ。反対のボタンで長さをかえよう。');}
 else if(action.type==='handle')find(action.id);
 else if(action.type==='reset'){voyageRetry.clear(n);delete n.sailing;ok(!n.islandBoard||!n.links.some(j=>j.a===n.islandBoard.id||j.b===n.islandBoard.id),'島の板のつなぎ目を外してから、道具を並べ直そう。');const kept=n.parts.filter(p=>[n.salvage?.cargo,n.salvage?.float,n.islandBoard?.id].includes(p.id)),ids=new Set(kept.map(p=>p.id)),links=n.links.filter(j=>ids.has(j.a)&&(j.id==='salvage-moor-'+n.salvage?.cargo||j.kind==='weld'&&ids.has(j.b))),fresh=coastAdventureStart(initialCoastPlay());ok(!fresh.parts.some(p=>coastHarborSolids(n).some(o=>overlap(obb(p),obstacleBox(o)))),'港のポールに道具が重なるよ。ポールを片付けるか、道具箱から出そう。');n.parts=[...fresh.parts,...kept];n.links=[...fresh.links,...links];n.goals=fresh.goals;n.serial=Math.max(n.serial,fresh.serial);delete n.voyage;}
 else throw Error('使える道具を選んでね。');
 if(n.boatBook?.active&&!n.parts.some(p=>p.id===n.boatBook.active.boat&&p.type==='board'))delete n.boatBook.active;
 voyageRetry.prune(n);n.edit++;validateCoastPlay(n);return n;
}
export function validateCoastPlay(s){
 ok(s&&Object.getPrototypeOf(s)===Object.prototype&&s.version===1,'海辺の道具の記録が違います。');
 ok(Object.keys(s).filter(k=>!['cargoRetired','voyage','boatBook','salvage','harbor','crew','islandBoard','sailing','geography','navigation'].includes(k)).sort().join('|')==='edit|goals|history|links|parts|serial|tick|version','海辺の記録の項目が違います。');ok(s.cargoRetired===undefined||s.cargoRetired===1,'海辺の遊びの版が違います。');for(const k of ['tick','edit','serial'])ok(Number.isSafeInteger(s[k])&&s[k]>=0&&s[k]<1e12,'海辺の記録の番号が違います。');
 if(s.boatBook!==undefined){boatBook.validate(s.boatBook);if(s.boatBook.active)ok(Array.isArray(s.parts)&&s.parts.some(p=>p.id===s.boatBook.active.boat&&p.type==='board'),'船の見本をかさねる板がありません。');}
 const frame=f=>{ok(f.geography===undefined||f.geography===2,'海図の版が違います。');const frameHeight=f.geography===2?coastHeight:legacyCoastHeight;salvage.validate(f);islandPath.validate(f);if(Object.hasOwn(f,'voyage'))validateCoastVoyage(f.voyage);for(const k of ['tick','serial'])ok(Number.isSafeInteger(f[k])&&f[k]>=0&&f[k]<1e12,'海辺の履歴番号が違います。');ok(Array.isArray(f.parts)&&f.parts.length<=13&&Array.isArray(f.links)&&f.links.length<=18,'海辺の道具が多すぎます。');const ids=new Set();for(const p of f.parts){ok(Object.keys(p).sort().join('|')==='id|p|q|type|v|w'&&/^sea-\d+$/.test(p.id)&&!ids.has(p.id)&&Object.hasOwn(SEA_PARTS,p.type),'海辺の道具が違います。');ids.add(p.id);for(const [k,size,limit]of[['p',3,100000],['q',4,1.001],['v',3,100],['w',3,5]])ok(Array.isArray(p[k])&&p[k].length===size&&p[k].every(v=>Number.isFinite(v)&&Math.abs(v)<=limit),'海辺の道具の位置が違います。');ok(Math.abs(Math.hypot(...p.q)-1)<.001,'海辺の道具の向きが違います。');}
 if(s.cargoRetired===1)ok(!f.parts.some(p=>p.type==='cargo')&&!f.voyage&&!f.salvage,'今の海辺には、荷物の遊びはありません。');if(f.voyage&&!f.voyage.done)ok(f.parts.some(p=>p.id===f.voyage.board&&p.type==='board')&&f.parts.some(p=>p.id===f.voyage.cargo&&p.type==='cargo'),'航路の板と荷物が違います。');
  for(const [type,spec]of Object.entries(SEA_PARTS))ok(f.parts.filter(p=>p.type===type).length<=spec.limit,'借りた道具の数が違います。');const linkIds=new Set();for(const j of f.links){if(j.kind==='moor'){
   const original=j.a==='sea-5'&&((j.id==='pier-line'&&JSON.stringify(j.anchor)==='[340,4,598]'&&JSON.stringify(j.localA)==='[0,3,-27]'&&j.length===26)||[-1,1].some(side=>j.id==='pier-line-'+side&&JSON.stringify(j.anchor)===JSON.stringify([340+side*24,4,598])&&JSON.stringify(j.localA)===JSON.stringify([side*24,3,-27])&&j.length===17));
   const rescued=f.parts.some(p=>p.id===j.a&&p.type==='board')&&Number.isFinite(j.length)&&j.length>=10&&j.length<=260&&[-1,1].some(side=>{const legacy=((j.id==='rescue-line-'+j.a+'-'+side&&JSON.stringify(j.localA)===JSON.stringify([side*24,3,-27]))||(j.id==='berth-line-'+j.a+'-'+side&&JSON.stringify(j.localA)===JSON.stringify([32,3,side*24])))&&JSON.stringify(j.anchor)===JSON.stringify([340+side*24,4,598]),modern=COAST_BERTH_CLEATS.some(p=>j.id===coastBerthLineId('home',j.a,side,p)&&JSON.stringify(j.localA)===JSON.stringify(p))&&JSON.stringify(j.anchor)===JSON.stringify(coastHomeBerthAnchor(side));return legacy||modern;});
   ok(Object.keys(j).sort().join('|')==='a|anchor|id|kind|length|localA'&&ids.has(j.a)&&!linkIds.has(j.id)&&(original||rescued||validIslandPortLine(f,j)||harbor.validLine(f,j)||salvage.validMoor(f,j)||workMoor.validLine(f,j)||unloading.validLine(f,j)||(
   j.id==='sea-anchor-'+j.a&&f.parts.some(p=>p.id===j.a&&p.type==='board')&&Array.isArray(j.anchor)&&j.anchor.length===3&&j.anchor.every(v=>Number.isFinite(v)&&Math.abs(v)<=100000)&&Math.abs(j.anchor[1]-frameHeight(j.anchor[0],j.anchor[2]))<.001&&j.anchor[1]<COAST_WATER_Y-4&&j.anchor[1]>COAST_WATER_Y-180&&JSON.stringify(j.localA)==='[0,-3,0]'&&Number.isFinite(j.length)&&j.length>=6&&j.length<=187)),'桟橋のロープの記録が違います。');linkIds.add(j.id);continue;
  }ok(Object.keys(j).sort().join('|')===(j.kind==='rope'?'a|b|id|kind|length|localA|localB':j.side===undefined?'a|b|id|kind':'a|b|id|kind|side'),'海辺のつなぎ目の項目が違います。');if(j.side!==undefined)ok(Number.isInteger(j.side)&&j.side>=0&&j.side<4,'つなぎ目の向きが違います。');ok(typeof j.id==='string'&&j.id.length<70&&!linkIds.has(j.id)&&['weld','rope'].includes(j.kind)&&ids.has(j.a)&&ids.has(j.b)&&j.a!==j.b,'海辺のつなぎ目が違います。');if(j.id.startsWith('loading-ramp-')){const a=f.parts.find(p=>p.id===j.a),b=f.parts.find(p=>p.id===j.b);ok(j.kind==='weld'&&a?.type==='board'&&b?.type==='board'&&j.id==='loading-ramp-'+j.b&&[0,1].includes(j.side)&&!f.links.some(k=>k!==j&&k.id.startsWith('loading-ramp-')&&(k.a===j.a||k.b===j.a||k.a===j.b)),'荷役板のつなぎ方が違います。');const pose=coastLoadingRampPose(a,j.side);ok(length(sub(pose.point,b.p))<.05&&Math.abs(pose.rotation.reduce((v,x,i)=>v+x*b.q[i],0))/(Math.hypot(...pose.rotation)*Math.hypot(...b.q))>1-1e-6,'荷役板の位置が違います。');}
  unloading.validateRamp(f,j);unloading.validateBrake(f,j);if(j.id.startsWith('loading-line-'))ok(j.kind==='rope'&&f.parts.find(p=>p.id===j.a)?.type==='board'&&f.parts.find(p=>p.id===j.b)?.type==='cargo'&&['[0,4,0]','[0,4,7]'].includes(JSON.stringify(j.localA))&&JSON.stringify(j.localB)==='[0,-7,0]'&&!f.links.some(k=>k!==j&&k.id.startsWith('loading-line-')&&k.b===j.b),'滑車ロープの記録が違います。');if(j.id.startsWith('cargo-strap-'))ok(j.kind==='weld'&&f.parts.find(p=>p.id===j.a)?.type==='board'&&f.parts.find(p=>p.id===j.b)?.type==='cargo'&&!f.links.some(k=>k!==j&&k.id.startsWith('cargo-strap-')&&k.b===j.b),'荷物のベルトの記録が違います。');linkIds.add(j.id);if(j.kind==='rope')ok(Number.isFinite(j.length)&&j.length>=10&&j.length<=152&&[j.localA,j.localB].every(p=>Array.isArray(p)&&p.length===3&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<70)),'ロープの記録が違います。');}
 harbor.validateFrame(f);workMoor.validateFrame(f);ok(f.goals&&Object.keys(f.goals).sort().join('|')==='sail|sailTicks|shore'&&typeof f.goals.shore==='boolean'&&typeof f.goals.sail==='boolean'&&Number.isSafeInteger(f.goals.sailTicks)&&f.goals.sailTicks>=0,'海辺の達成記録が違います。');};frame(s);crew.validate(s);validateCoastSailing(s);validateCoastNavigation(s);ok(Array.isArray(s.history)&&s.history.length<=10,'海辺のもどす記録が多すぎます。');s.history.forEach(f=>{ok(Object.keys(f).filter(k=>!['voyage','salvage','harbor','islandBoard','geography'].includes(k)).sort().join('|')==='goals|links|parts|serial|tick','海辺の履歴項目が違います。');frame(f);});return s;
}

