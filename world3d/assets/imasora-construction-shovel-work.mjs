import {nativeDumpPoint,nativeDumpLocal,nativeDumpBox,nativeDumpPose,boxLocal,boxExtent,boxesOverlap3D,nativeDumpWheelOffsets} from './imasora-construction-native-dump-pose.mjs';
import {canonical} from './imasora-construction-state.js';
import {createNativeSoilTransport,validateSoilTransport,soilTransportCommand,soilVoxel,soilLooseVoxel,soilTransportGeometry,SOIL_LIMITS,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs';
import {unpackExcavation} from './imasora-construction-excavator-save.js';
import {armPose,PLOT,BIN} from './imasora-construction-excavator.js';
import {WALKER,SITE} from './imasora-construction-loader-physics.js';

export const SHOVEL_WORK_SCOPE='imasora-shared-soil-hand-work-isolated-v1';
export const SHOVEL_WORK_FORMAT='imasora-shared-soil-hand-work-checkpoint-v1';
export const SHOVEL_REACH=32,SHOVEL_STROKE=1.4;
// Ground placement has a wider working area. Digging, loading and storage
// retain their original reach; the full blade/shaft sweep is still checked.
export const SHOVEL_PLACE_REACH=48;
const toolReach=kind=>kind==='drop'?SHOVEL_PLACE_REACH:SHOVEL_REACH;
const withinReach=(kind,hand,tip)=>Math.hypot(...tip.map((v,j)=>v-hand[j]))<=toolReach(kind)&&(kind!=='drop'||Math.abs(tip[1]-hand[1])<=SHOVEL_REACH);
const check=(ok,msg)=>{if(!ok)throw Error('シャベル作業：'+msg);},copy=structuredClone;
const exact=(v,names)=>check(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...names].sort().join('|'),'保存の項目が不正です。');
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(v);
const boxesCache=new WeakMap(),machineCache=new WeakMap(),certifiedSoil=new WeakMap();
const machineSourceCache=new WeakMap();
export function shovelMachineState(s){const source=s.soil.initial.source;let w=machineSourceCache.get(source);if(!w){w=freeze(unpackExcavation(source.excavation.packet));machineSourceCache.set(source,w);}return s.machineArm?{...w,arm:s.machineArm,load:s.soil.containers.bucket.amount/64}:w;}
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;}
function certify(soil){if(!certifiedSoil.has(soil)){validateSoilTransport(soil);freeze(soil);certifiedSoil.set(soil,{site:canonical(soil.site),initial:canonical(soil.initial)});}return certifiedSoil.get(soil);}
export const shovelForward=p=>({x:Math.sin(p.heading),z:Math.cos(p.heading)});
export const shovelHand=p=>{const f=shovelForward(p);return[p.x+f.x*14,p.y+18,p.z+f.z*14];};
export function createShovelWork(source){return validateShovelWork({format:SHOVEL_WORK_FORMAT,scope:SHOVEL_WORK_SCOPE,version:1,revision:0,soil:createNativeSoilTransport(source),player:{x:83,y:0,z:26,heading:-Math.PI/2,travel:0},dump:{x:135,z:0,heading:0},job:null});}
export function shovelSoilBoxes(soil){let b=boxesCache.get(soil);if(!b){b=freeze(soilTransportGeometry(soil));boxesCache.set(soil,b);}return b;}
export function shovelMachines(s){const key=s.machineArm??s.soil.initial.source;const source=s.soil.initial.source;let entry=machineCache.get(key),m=entry?.source===source?entry.boxes:null;if(!m){const w=shovelMachineState(s),v=w.loader.vehicle,pose=armPose(w);m=[{position:[v.x,22,v.z],half:[35,22,44],heading:v.heading},{position:[BIN.x,5,BIN.z],half:[BIN.width/2,5,BIN.depth/2],heading:0}];for(let k=0;k<2;k++){const a=pose.world[k],b=pose.world[k+1],n=Math.ceil(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)/4);for(let i=0;i<=n;i++){const t=i/n;m.push({position:[a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t],half:[5,5,5],heading:0});}}m.push({position:[pose.bucket.x,pose.bucket.y,pose.bucket.z],half:[12,8,13],heading:pose.heading});machineCache.set(key,{source,boxes:m});}return m;}
const dumpBody=s=>{const p=nativeDumpPose(s),tilted=p.enabled;return nativeDumpBox(s,[0,tilted?24.5:23,0],[34,tilted?20:23,43]);};
function local(point,b){return boxLocal(point,b);}
export function shovelSegmentHits(a,b,box,padding=.25){const aa=local(a,box),bb=local(b,box),h=box.half??Array(3).fill(box.size/2);let lo=0,hi=1;for(let j=0;j<3;j++){const d=bb[j]-aa[j],min=-h[j]-padding,max=h[j]+padding;if(Math.abs(d)<1e-9){if(aa[j]<min||aa[j]>max)return false;}else{let u=(min-aa[j])/d,v=(max-aa[j])/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}if(box.kind==='wheel'){const dy=bb[1]-aa[1],dz=bb[2]-aa[2],den=dy*dy+dz*dz,t=den?Math.max(lo,Math.min(hi,-(aa[1]*dy+aa[2]*dz)/den)):lo;return Math.hypot(aa[1]+dy*t,aa[2]+dz*t)<=h[1]+padding;}return true;}
function circleHits(p,r,b){if(b.axes)return boxesOverlap3D({position:[p.x,p.y+WALKER.height/2,p.z],half:[r,WALKER.height/2,r]},b,.05);const l=local([p.x,p.y,p.z],b),h=b.half??Array(3).fill(b.size/2);if(p.y+WALKER.height<=b.position[1]-h[1]+.05||p.y>=b.position[1]+h[1]-.05)return false;return Math.hypot(Math.max(0,Math.abs(l[0])-h[0]),Math.max(0,Math.abs(l[2])-h[2]))<r;}
const groundColumns=new WeakMap();
function soilColumns(soil){let index=groundColumns.get(soil);if(!index){index=new Map();for(const b of shovelSoilBoxes(soil)){const r=b.size/2;for(let i=Math.floor((b.position[0]-r)/8);i<=Math.floor((b.position[0]+r)/8);i++)for(let k=Math.floor((b.position[2]-r)/8);k<=Math.floor((b.position[2]+r)/8);k++){const key=i+","+k;if(!index.has(key))index.set(key,[]);index.get(key).push(b);}}groundColumns.set(soil,index);}return index;}
function groundColumn(soil,x,z){return soilColumns(soil).get(Math.floor(x/8)+","+Math.floor(z/8))??[];}
// This is only a conservative broad phase. Keep the real cube faces, heights
// and exact narrow-phase tests, including boxes spanning a column boundary.
// The immutable soil reference changes with every reservation/completion, so
// a new shape always gets a new index; old worlds are weakly held.
export function shovelNearbySoil(soil,x,z,r){check(finite(x,-2048,2048)&&finite(z,-2048,2048)&&finite(r,0,640),'接触範囲が不正です。');const index=soilColumns(soil),found=new Set();for(let i=Math.floor((x-r)/8);i<=Math.floor((x+r)/8);i++)for(let k=Math.floor((z-r)/8);k<=Math.floor((z+r)/8);k++)for(const b of index.get(i+','+k)??[])found.add(b);return [...found];}
function floorAt(s,x,z,y){let h=x>=PLOT.minX&&x<PLOT.maxX&&z>=PLOT.minZ&&z<PLOT.maxZ?PLOT.bottom:0;for(const b of groundColumn(s.soil,x,z)){const r=b.size/2,top=b.position[1]+r;if(top<=y+2.01&&x>=b.position[0]-r&&x<b.position[0]+r&&z>=b.position[2]-r&&z<b.position[2]+r)h=Math.max(h,top);}return h;}
function standing(s,p){if(!finite(p.x,SITE.minX+WALKER.radius,SITE.maxX-WALKER.radius)||!finite(p.z,SITE.minZ+WALKER.radius,SITE.maxZ-WALKER.radius))return false;for(const b of [...shovelMachines(s),dumpBody(s),...shovelNearbySoil(s.soil,p.x,p.z,WALKER.radius)])if(circleHits(p,WALKER.radius,b))return false;const h=floorAt(s,p.x,p.z,p.y);if(Math.abs(h-p.y)>.05)return false;for(const [dx,dz]of [[-8,0],[8,0],[0,-8],[0,8]])if(Math.abs(floorAt(s,p.x+dx,p.z+dz,p.y)-p.y)>2.01)return false;return true;}
export function walkShovelWork(s,dx,dz,dt,{fast=false}={}){check(!s.job,'作業を終えるか戻してから歩いてください。');check([dx,dz,dt].every(Number.isFinite)&&dt>0&&dt<=.05,'移動の時間が不正です。');const len=Math.max(1,Math.hypot(dx,dz)),travel=WALKER.speed*(fast?2.5:1)*dt,n=Math.max(1,Math.ceil(travel/.5));let p={...s.player},distance=0;for(let i=0;i<n;i++){const x=p.x+dx/len*travel/n,z=p.z+dz/len*travel/n,y=floorAt(s,x,z,p.y),next={...p,x,y,z};if(Math.abs(y-p.y)>2.01||!standing(s,next))break;distance+=Math.hypot(next.x-p.x,next.z-p.z);p=next;}return distance?{...s,revision:s.revision+1,player:{...p,travel:p.travel+distance}}:s;}
export function turnShovelWork(s,heading){check(finite(heading,-Math.PI,Math.PI),'向きが不正です。');check(!s.job,'作業中は向きを保持します。');return heading===s.player.heading?s:{...s,revision:s.revision+1,player:{...s.player,heading}};}
function cubePositions(base){const p=[];for(let x=0;x<2;x++)for(let y=0;y<2;y++)for(let z=0;z<2;z++)p.push([base[0]+x,base[1]+y,base[2]+z]);return p;}
function near(s,target,kind){const hand=shovelHand(s.player),f=shovelForward(s.player),dx=target[0]-s.player.x,dz=target[2]-s.player.z,d=Math.hypot(dx,dz);return withinReach(kind,hand,target)&&d>WALKER.radius&&d>0&&(dx*f.x+dz*f.z)/d>=.65;}
function omittedBoxes(s,t){const hand=shovelHand(s.player),source=t.from==='loose'?s.soil.loose[t.looseId]:null,removedWorld=t.positions.map(p=>source?p.map((n,j)=>source.position[j]-4+n*2+1):p.map(n=>n*2+1)),removed=new Set(removedWorld.map(p=>p.join(','))),out=[];
 // Every tip is checked against SHOVEL_REACH. The blade extends two units
 // horizontally and the shaft's padding is .55, hence this three-unit margin.
 for(const b of shovelNearbySoil(s.soil,hand[0],hand[2],SHOVEL_REACH+3)){
  if(b.size===2){if(!removed.has(b.position.join(',')))out.push(b);continue;}
  if(!removedWorld.some(p=>p.every((v,j)=>Math.abs(v-b.position[j])<b.size/2))){out.push(b);continue;}
  const cells=Array.from({length:64},(_,i)=>({position:[i%4,Math.floor(i/4)%4,Math.floor(i/16)].map((n,j)=>b.position[j]-4+n*2+1),size:2}));
  if(!cells.some(v=>removed.has(v.position.join(','))))out.push(b);else for(const v of cells)if(!removed.has(v.position.join(',')))out.push(v);
 }return out;}
export function shovelDigTargets(s){if(s.job||s.soil.containers.shovel.amount||s.soil.pending)return[];const targets=[],hand=shovelHand(s.player);for(const[k,b]of Object.entries(s.soil.loose)){if(Math.hypot(...b.position.map((v,j)=>v-hand[j]))>SHOVEL_REACH+7)continue;for(let x=0;x<4;x+=2)for(let y=0;y<4;y+=2)for(let z=0;z<4;z+=2){const positions=cubePositions([x,y,z]);if(positions.every(p=>soilLooseVoxel(s.soil,k,p)))targets.push({from:'loose',looseId:k,positions,materialId:b.materialId,target:[x,y,z].map((n,j)=>b.position[j]-4+n*2+2)});}}
 for(const[k,b]of Object.entries(s.soil.blocks)){const c=k.split(',').map(Number),centre=c.map(n=>n*8+4);if(Math.hypot(...centre.map((v,j)=>v-hand[j]))>SHOVEL_REACH+7)continue;for(let x=0;x<4;x+=2)for(let y=0;y<4;y+=2)for(let z=0;z<4;z+=2){const base=[x,y,z].map((v,j)=>c[j]*4+v),positions=cubePositions(base);if(positions.every(p=>soilVoxel(s.soil,p)))targets.push({from:'terrain',parent:k,positions,materialId:b.materialId,target:base.map(n=>n*2+2)});}}
 const candidates=targets.filter(t=>near(s,t.target)).sort((a,b)=>Math.hypot(...a.target.map((v,j)=>v-hand[j]))-Math.hypot(...b.target.map((v,j)=>v-hand[j])));
 for(const t of candidates){const obstacles=[...shovelMachines(s),dumpBody(s),...omittedBoxes(s,t)];if(!obstacles.some(b=>shovelSegmentHits(hand,t.target,b))&&strokeClear(s,'dig',t.target,obstacles))return[t];}return[];}
function dumpLocal(s,x,y,z){return nativeDumpPoint(s,x,y,z);}
export function shovelBladeHits(tip,b){if(b.kind==='wheel'){const p=local(tip,b);return Math.abs(p[0])<=4.5+2&&Math.hypot(Math.max(0,Math.abs(p[1])-.35),Math.max(0,Math.abs(p[2])-2))<=8.65;}return shovelSegmentHits(tip,tip,{...b,half:(b.half??Array(3).fill(b.size/2)).map((v,j)=>v+(j===1?.35:2)-1e-6)},0);}
export function shovelDumpObstacles(s){const offsets=nativeDumpWheelOffsets(s);return[nativeDumpBox(s,[0,26,18],[29,18,18]),nativeDumpBox(s,[0,16,-22],[27,1,18]),...[-27,27].map(x=>nativeDumpBox(s,[x,22,-22],[1,6,19])),...[-40,-4].map(z=>nativeDumpBox(s,[0,22,z],[27,6,1])),...[-31,18].flatMap((z,j)=>[-25.5,25.5].map((x,i)=>nativeDumpBox(s,[x,8.9+offsets[j*2+i],z],[4.5,8.65,8.65],{kind:'wheel'})))];}
function strokeClear(s,kind,target,boxes){const hand=shovelHand(s.player),test={...s,soil:{...s.soil,pending:{amount:8}},job:{kind,target,elapsed:0}},poses=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<=512;i++){test.job.elapsed=SHOVEL_STROKE*i/512;const pose=shovelToolPose(test);if(!withinReach(kind,pose.hand,pose.tip))return false;poses.push(pose);for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],pose.hand[j],pose.tip[j]);hi[j]=Math.max(hi[j],pose.hand[j],pose.tip[j]);}}
 // The sweep bounds include every sample, both ends of the handle, and the
 // rotated blade (2*sqrt(2) horizontally). They discard only unreachable
 // obstacles; the same 513 exact segment/blade checks decide actual contact.
 const margin=[3,.55,3],obstacles=boxes.filter(b=>{const h=b.half??Array(3).fill(b.size/2),extent=boxExtent(b);return b.position.every((v,j)=>v+extent[j]>=lo[j]-margin[j]&&v-extent[j]<=hi[j]+margin[j])&&Math.hypot(...b.position.map((v,j)=>v-hand[j]))<=toolReach(kind)+Math.hypot(...h);});
 for(const pose of poses)for(const b of obstacles)if(shovelSegmentHits(pose.hand,pose.tip,b,.55)||shovelBladeHits(pose.tip,b))return false;return true;}
function loadPathClear(s,target){return strokeClear(s,'load',target,[...shovelDumpObstacles(s),...shovelMachines(s),...shovelSoilBoxes(s.soil)]);}
// The walker still collides with the whole bin. A shovel reaches over its
// actual rims and bottom; it must not pass through the walls or another hull.
export function shovelStorageObstacles(s){return[
 ...shovelMachines(s).filter(b=>!(b.position[0]===BIN.x&&b.position[1]===5&&b.position[2]===BIN.z)),
 ...shovelDumpObstacles(s),...shovelSoilBoxes(s.soil),
 {position:[BIN.x,1.5,BIN.z],half:[BIN.width/2,1.5,BIN.depth/2]},
 ...[-1,1].flatMap(side=>[
  {position:[BIN.x+side*(BIN.width/2-1.5),5,BIN.z],half:[1.5,5,BIN.depth/2]},
  {position:[BIN.x,5,BIN.z+side*(BIN.depth/2-1.5)],half:[BIN.width/2,5,1.5]}
 ])];}
function storageContact(s,kind){
 if(!['store','take'].includes(kind)||Math.abs(s.player.y)>.05||!standing(s,s.player))return null;
 const p=s.player,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),x=clamp(p.x,BIN.x-BIN.width/2+8,BIN.x+BIN.width/2-8),z=clamp(p.z,BIN.z-BIN.depth/2+8,BIN.z+BIN.depth/2-8);
 const targets=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dz])=>[dx?BIN.x+dx*(BIN.width/2-8):x,5.5,dz?BIN.z+dz*(BIN.depth/2-8):z]);
 const obstacles=shovelStorageObstacles(s),hand=shovelHand(p);
 for(const target of targets.filter(t=>near(s,t)).sort((a,b)=>Math.hypot(...a.map((v,i)=>v-hand[i]))-Math.hypot(...b.map((v,i)=>v-hand[i]))))if(strokeClear(s,kind,target,obstacles))return{target};
 return null;
}
export function shovelStorageTarget(s,kind){
 if(s.job||s.soil.pending||!['store','take'].includes(kind))return null;
 const from=s.soil.containers[kind==='store'?'shovel':'storage'],to=s.soil.containers[kind==='store'?'storage':'shovel'];
 if(!from.amount||(kind==='take'&&to.amount)||to.amount>=SOIL_CAPACITY[kind==='store'?'storage':'shovel']||to.materialId&&to.materialId!==from.materialId)return null;
 const contact=storageContact(s,kind);return contact?{...contact,amount:Math.min(from.amount,SOIL_CAPACITY[kind==='store'?'storage':'shovel']-to.amount,8)}:null;
}
export const shovelStorageContact=s=>!s.job&&!s.soil.pending?storageContact(s,'take'):null;
export function shovelLoadTarget(s){if(s.job||s.soil.pending||!s.soil.containers.shovel.amount||s.soil.containers.dump.amount>=1392)return null;const p=nativeDumpLocal(s,[s.player.x,s.player.y,s.player.z]),side=p[0]<0?-1:1;if(Math.abs(p[0])<49||Math.abs(p[0])>60||p[2]<-38||p[2]>-6||Math.abs(p[1])>2.01)return null;const target=dumpLocal(s,side*22,38,Math.max(-34,Math.min(-10,p[2]))),hand=shovelHand(s.player);if(!near(s,target)||[...shovelMachines(s),...shovelSoilBoxes(s.soil)].some(b=>shovelSegmentHits(hand,target,b))||!loadPathClear(s,target))return null;return{target,side};}
export function shovelDropTarget(s,point=null){
 if(s.job||s.soil.pending||!s.soil.containers.shovel.amount)return null;
 if(point!==null&&(!Array.isArray(point)||point.length!==2||!finite(point[0],SITE.minX,SITE.maxX)||!finite(point[1],SITE.minZ,SITE.maxZ)))return null;
 const f=shovelForward(s.player),x=point?Math.floor(point[0]/4)*4:Math.round((s.player.x+f.x*26)/4)*4,z=point?Math.floor(point[1]/4)*4:Math.round((s.player.z+f.z*26)/4)*4;
 if(x<SITE.minX||x+4>SITE.maxX||z<SITE.minZ||z+4>SITE.maxZ)return null;
 // Placement uses the top of the whole footprint, independently of the
 // walker's step height. Existing soil supports the next layer.
 const support=[0,1].flatMap(dx=>[0,1].map(dz=>floorAt(s,x+dx*2+1,z+dz*2+1,s.player.y+SHOVEL_REACH))),y=Math.max(...support);
 const base=[x/2,Math.round(y/2),z/2],positions=cubePositions(base),target=[x+2,y+2,z+2];
 if(circleHits(s.player,WALKER.radius,{position:target,half:[2,2,2]}))return null;
 if(support.some(h=>Math.abs(h-y)>.05)||Math.abs(base[1]*2-y)>.05||!near(s,target,'drop')||positions.some(p=>{const b=s.soil.blocks[p.map(n=>Math.floor(n/4)).join(',')];return soilVoxel(s.soil,p)||b&&b.materialId!==s.soil.containers.shovel.materialId;}))return null;
 const obstacles=[...shovelMachines(s),dumpBody(s),...shovelSoilBoxes(s.soil)];
 if(obstacles.some(o=>{const h=o.half??Array(3).fill(o.size/2);return (o.axes||o.heading)?shovelSegmentHits(target,target,o,2):target.every((v,j)=>Math.abs(v-o.position[j])<2+h[j]-.01);})||!strokeClear(s,'drop',target,obstacles))return null;
 return{positions,target};
}
const command=(s,type,job,extra={})=>soilTransportCommand(s.soil,{type,id:job.id+'_'+type,expectedRevision:s.soil.revision,transferId:job.id,...extra});
export function startShovelWork(s,kind,operationId,point=null){check(point===null||kind==='drop','置き先の指定は土を置く操作だけで使えます。');check(id(operationId),'操作番号が不正です。');check(!s.job&&!s.soil.pending,'前の作業を終えてください。');check(s.soil.journal.length<=SOIL_LIMITS.history-3,'保存の作業数が上限です。土を保持して止めます。');check(standing(s,s.player),'足元か通り道がふさがっています。');let t,soil;if(kind==='dig'){t=shovelDigTargets(s)[0];check(t,'土の前へ近づき、土の方を向いてください。');soil=command(s,t.from==='loose'?'reserve-loose':'reserve',{id:operationId},{from:t.from,to:'shovel',materialId:t.materialId,amount:8,positions:t.positions,...(t.from==='loose'?{looseId:t.looseId}:{})});}
 else if(kind==='load'||kind==='drop'){t=kind==='load'?shovelLoadTarget(s):shovelDropTarget(s,point);check(t,kind==='load'?'荷台の横へ近づき、荷台の方を向いてください。満杯なら土は手元に残ります。':'平らでシャベルが届く上面を選んでください。土は手元に残っています。');soil=command(s,'reserve',{id:operationId},{from:'shovel',to:kind==='load'?'dump':'terrain',materialId:s.soil.containers.shovel.materialId,amount:s.soil.containers.shovel.amount,positions:kind==='drop'?t.positions.slice(0,s.soil.containers.shovel.amount):[]});}else if(kind==='store'||kind==='take'){
 t=shovelStorageTarget(s,kind);check(t,'保管箱へ近づき、箱の方を向いてください。土と空きを確認してください。');
 const from=kind==='store'?'shovel':'storage',to=kind==='store'?'storage':'shovel';
 soil=command(s,'reserve',{id:operationId},{from,to,materialId:s.soil.containers[from].materialId,amount:t.amount,positions:[]});
 }else throw Error('シャベル作業：未対応の作業です。');
 return{...s,revision:s.revision+1,soil,job:{id:operationId,kind,elapsed:0,returning:false,target:[...t.target]}};}
export function progressShovelWork(s,dt){check(s.job&&finite(dt,0,.05),'作業の時間が不正です。');const j=s.job,elapsed=j.returning?Math.max(0,j.elapsed-dt):Math.min(SHOVEL_STROKE,j.elapsed+dt);return{...s,revision:s.revision+1,job:{...j,elapsed}};}
export const shovelJobReady=s=>!!s.job&&(s.job.returning?s.job.elapsed===0:s.job.elapsed===SHOVEL_STROKE);
export function returnShovelWork(s){check(s.job,'進行中の作業がありません。');return{...s,revision:s.revision+1,job:{...s.job,returning:true}};}
export function finishShovelWork(s){check(shovelJobReady(s),'道具が戻るまでお待ちください。');let soil;if(s.job.returning)soil=command(s,'cancel',s.job);else{soil=command(s,'release',s.job);soil=soilTransportCommand(soil,{type:'complete',id:s.job.id+'_complete',expectedRevision:soil.revision,transferId:s.job.id});}return{...s,revision:s.revision+1,soil,job:null};}
export function shovelToolPose(s){const h=shovelHand(s.player),f=shovelForward(s.player),rest=[h[0]-f.x*.5,h[1]-9,h[2]-f.z*.5];if(!s.job)return{hand:h,tip:rest,soil:s.soil.containers.shovel.amount,contact:false};const j=s.job,u=j.elapsed/SHOVEL_STROKE,t=u<.45?u/.45:u<.6?1:1-(u-.6)/.4,tip=rest.map((v,i)=>v+(j.target[i]-v)*Math.max(0,t));if(['load','store','take'].includes(j.kind))tip[1]+=Math.sin(Math.PI*t)*22;else if(j.kind==='dig')tip[1]+=Math.sin(Math.PI*t)*8;if(['store','take'].includes(j.kind))h[1]+=9*Math.max(0,t);const picked=u>=.55;return{hand:h,tip,soil:['dig','take'].includes(j.kind)?(picked?s.soil.pending.amount:0):(picked?s.soil.containers.shovel.amount:s.soil.containers.shovel.amount+s.soil.pending.amount),contact:t>=.95};}
export function shovelVisibleSource(s){if(!s.job||s.job.kind!=='dig'||s.job.elapsed/SHOVEL_STROKE>=.55)return[];const p=s.soil.pending;if(p.from==='loose'){const b=s.soil.loose[p.looseId];return p.positions.map(q=>({position:q.map((n,j)=>b.position[j]-4+n*2+1),size:2,materialId:p.materialId}));}return p.positions.map(q=>({position:q.map(n=>n*2+1),size:2,materialId:p.materialId}));}
export function validateShovelWork(s,{mobileDump=false,aboardDump=false,unloading=false,liveArm=false,aboardExcavator=false,bucketTransfer=false,storageTransfer=false}={}){exact(s,['format','scope','version','revision','soil','player','dump','job',...(liveArm?['machineArm']:[])]);check(s.format===SHOVEL_WORK_FORMAT&&s.scope===SHOVEL_WORK_SCOPE&&s.version===1,'通常保存・練習用ダンプは読み込めません。');check(Number.isSafeInteger(s.revision)&&s.revision>=0&&s.revision<Number.MAX_SAFE_INTEGER-1000,'保存番号が不正です。');certify(s.soil);check(s.soil.schema===2,'由来付き地形が必要です。');exact(s.player,['x','y','z','heading','travel']);check(finite(s.player.x,SITE.minX,SITE.maxX)&&finite(s.player.z,SITE.minZ,SITE.maxZ)&&finite(s.player.y,-32,256)&&finite(s.player.heading,-Math.PI,Math.PI)&&finite(s.player.travel,0,1e12),'人物の位置が不正です。');exact(s.dump,['x','z','heading']);check(mobileDump?finite(s.dump.x,SITE.minX,SITE.maxX)&&finite(s.dump.z,SITE.minZ,SITE.maxZ)&&finite(s.dump.heading,-Math.PI,Math.PI):canonical(s.dump)===canonical({x:135,z:0,heading:0}),'車両の位置が不正です。');if(!aboardDump&&!aboardExcavator)check(standing(s,s.player),'人物が土や車体と重なっています。');if(s.job){exact(s.job,['id','kind','elapsed','returning','target']);const j=s.job,p=s.soil.pending;check(id(j.id)&&['dig','load','drop','store','take'].includes(j.kind)&&finite(j.elapsed,0,SHOVEL_STROKE)&&typeof j.returning==='boolean'&&Array.isArray(j.target)&&j.target.length===3&&j.target.every(n=>finite(n,-650,650)),'作業の途中状態が不正です。');check(p?.id===j.id&&p.phase==='reserved'&&near(s,j.target,j.kind),'移送と道具の動きが一致しません。');check(j.kind==='dig'?['loose','terrain'].includes(p.from)&&p.to==='shovel':j.kind==='take'?p.from==='storage'&&p.to==='shovel':p.from==='shovel'&&p.to===(j.kind==='load'?'dump':j.kind==='store'?'storage':'terrain'),'移送先が不正です。');const reserve=s.soil.journal.at(-1);check(reserve.transferId===j.id&&['reserve','reserve-loose'].includes(reserve.type),'作業開始の履歴が不正です。');if(j.kind==='dig'){const positions=p.positions.map(q=>p.from==='loose'?q.map((v,i)=>s.soil.loose[p.looseId].position[i]-4+v*2+1):q.map(v=>v*2+1));const centre=[0,1,2].map(i=>positions.reduce((a,b)=>a+b[i],0)/positions.length);check(centre.every((v,i)=>Math.abs(v-j.target[i])<1e-9),'掘る場所と土が一致しません。');}else if(j.kind==='load'){const p=nativeDumpLocal(s,j.target);check(Math.abs(Math.abs(p[0])-22)<1e-8&&Math.abs(p[1]-38)<1e-8&&p[2]>=-34&&p[2]<=-10,'荷台の受取口が不正です。');}else if(j.kind==='store'||j.kind==='take'){
 const t=storageContact(s,j.kind),from=s.soil.containers[p.from],to=s.soil.containers[p.to];
 check(t&&canonical(t.target)===canonical(j.target)&&p.positions.length===0&&reserve.type==='reserve'&&reserve.id===j.id+'_reserve'&&p.amount===Math.min(from.amount+p.amount,SOIL_CAPACITY[p.to]-to.amount,8)&&(j.kind!=='take'||to.amount===0),'保管箱の接触・量・予約が一致しません。');
 }else{check(p.positions.length===p.amount&&p.positions.every(q=>q.every((v,i)=>Math.abs(v*2+1-j.target[i])<=1.01)),'置く土と道具が一致しません。');}}
 else check(s.soil.pending===null||unloading&&s.soil.pending.from==='dump'&&['terrain','storage'].includes(s.soil.pending.to)&&s.soil.pending.phase==='reserved'||bucketTransfer&&s.soil.pending.from==='bucket'&&s.soil.pending.to==='dump'&&s.soil.pending.phase==='reserved'||storageTransfer&&s.soil.pending.from==='storage'&&s.soil.pending.to==='bucket'&&s.soil.pending.phase==='reserved','途中の土に道具がありません。');if(s.job?.kind==='dig'){const p=s.soil.pending,t={from:p.from,looseId:p.looseId,positions:p.positions,parent:p.from==='terrain'?p.positions[0].map(n=>Math.floor(n/4)).join(','):null};check(strokeClear(s,'dig',s.job.target,[...shovelMachines(s),dumpBody(s),...omittedBoxes(s,t)]),'掘削の通り道がふさがっています。');}if(s.job?.kind==='load')check(loadPathClear(s,s.job.target),'積込の通り道がふさがっています。');return s;}
export function validateShovelContinuation(a,b){validateShovelWork(a);validateShovelWork(b);const ac=certify(a.soil),bc=certify(b.soil);check(a.soil.scope===b.soil.scope&&a.soil.format===b.soil.format&&ac.site===bc.site&&ac.initial===bc.initial,'別の現場へ切り替えられません。');check(b.soil.journal.length>=a.soil.journal.length&&a.soil.journal.every((c,i)=>canonical(c)===canonical(b.soil.journal[i])),'古い土の所有へ戻せません。');check(b.revision>=a.revision&&b.player.travel>=a.player.travel,'古い作業状態へ戻せません。');check(b.revision!==a.revision||canonical(a)===canonical(b),'同じ保存番号の内容が不正です。');return b;}
function checksum(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packShovelWork(s){validateShovelWork(s);return JSON.stringify({kind:SHOVEL_WORK_FORMAT,checksum:checksum(canonical(s)),state:s});}
export function unpackShovelWork(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+16384,'保存の大きさが不正です。');let p;try{p=JSON.parse(text);}catch{throw Error('シャベル作業：保存を読み取れません。');}exact(p,['kind','checksum','state']);check(p.kind===SHOVEL_WORK_FORMAT&&p.checksum===checksum(canonical(p.state)),'保存の検査に失敗しました。');return validateShovelWork(p.state);}

// Shared helpers; legacy save validation still requires the stopped dump.
export {floorAt as shovelGroundHeight,standing as shovelStanding,dumpBody as shovelDumpBody,dumpLocal as shovelDumpPoint};
