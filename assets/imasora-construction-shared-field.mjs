// Shared-field planning primitives. No game save, inventory, or legacy origin is
// changed here. Existing works must keep their world coordinates on migration.
export const FIELD = Object.freeze({minX:-2700,maxX:2700,minZ:-1800,maxZ:1800});
export const FIELD_RUN_SPEED=68*2.5;
export const PARKING = Object.freeze({minX:-2650,maxX:-1730,minZ:-1740,maxZ:-980});
export const FLEET = Object.freeze([
 ['excavator','ショベルカー','🚜','土を掘る・ダンプへ積む',-2460,-1540,0,-58,-8,18.12],
 ['dump','ダンプカー','🚚','たくさん運ぶ・土を下ろす',-2260,-1540,0,-58,18,23.5],
 ['soil','火星土ローダー','🟣','火星土を敷く・回収する',-2060,-1540,0,-58,-8,9.12],
 ['water','給水車','💧','水を運ぶ・池をつくる',-1860,-1540,0,-58,20,20],
 ['crane','クレーン車','🏗️','部材を吊る・組み立てる',-2460,-1170,Math.PI,-58,-8,9.12],
 ['truck','ミキサー車','🟡','材料を練る・生コンを運ぶ',-2260,-1170,Math.PI,-50,21,19],
 ['pump','ポンプ車','🩵','ホースで生コンを注ぐ',-2060,-1170,Math.PI,-50,21,19]
].map(([id,name,icon,purpose,x,z,heading,doorX,doorZ,floor])=>Object.freeze({id,name,icon,purpose,x,z,heading,doorX,doorZ,floor})));
export const FACILITIES=Object.freeze([
 {id:'water-supply',name:'給水・回収ステーション',x:-1550,z:-1570,hx:70,hz:66},
 {id:'material-store',name:'土・木材の保管所',x:-1550,z:-1340,hx:70,hz:66},
 {id:'mix-supply',name:'生コンの材料・型枠',x:-1550,z:-1110,hx:70,hz:66}
].map(Object.freeze));
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
export function fieldContains(p,radius=0){return finite(p)&&Number.isFinite(radius)&&radius>=0&&p.x-radius>=FIELD.minX&&p.x+radius<=FIELD.maxX&&p.z-radius>=FIELD.minZ&&p.z+radius<=FIELD.maxZ;}
export function fieldPoint(v,x,z){const c=Math.cos(v.heading),s=Math.sin(v.heading);return{x:v.x+x*c+z*s,z:v.z-x*s+z*c};}
export function fleetDoor(v){const spec=FLEET.find(t=>t.id===v.id);if(!spec||!finite(v)||!Number.isFinite(v.heading))throw Error('車の位置を確認できません。');return{...fieldPoint(v,spec.doorX,spec.doorZ),y:0,heading:v.heading};}
export function initialFleet(){return FLEET.map(v=>({id:v.id,x:v.x,z:v.z,heading:v.heading,speed:0,steering:0,travel:0}));}
export function fieldCircleHits(p,r,o){const c=Math.cos(o.heading??0),s=Math.sin(o.heading??0),dx=p.x-o.x,dz=p.z-o.z,x=c*dx-s*dz,z=s*dx+c*dz;return Math.hypot(Math.max(0,Math.abs(x)-o.hx),Math.max(0,Math.abs(z)-o.hz))<r;}
export function fleetObstacles(vehicles,except=null,facilities=FACILITIES){return [...vehicles.filter(v=>v.id!==except).map(v=>({...v,hx:['truck','pump'].includes(v.id)?33:35,hz:v.id==='excavator'?62:47})),...facilities];}
export function fieldStandable(p,obstacles,radius=15.6){return fieldContains(p,radius)&&!obstacles.some(o=>fieldCircleHits(p,radius,o));}
export function fieldSegmentClear(a,b,canStand,step=2){if(!finite(a)||!finite(b)||!Number.isFinite(step)||step<=0)return false;const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/step));for(let i=0;i<=n;i++)if(!canStand({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n}))return false;return true;}

// A* yields regularly, validates every edge, and never teleports to a nearby
// unblocked node. Cancellation covers both the search and the following walk.
class Heap{items=[];push(v){const a=this.items;let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return first;}get length(){return this.items.length;}}
export async function planFieldRoute(start,goal,{canStand,canStep=()=>true,cell=20,signal=null,yieldFrame=()=>new Promise(r=>setTimeout(r,0)),limit=60000,corridors=[]}={}){
 if(typeof canStand!=='function'||!Number.isFinite(cell)||cell<4||cell>64||!Number.isSafeInteger(limit)||limit<1)throw Error('経路の設定を確認してください。');
 const check=()=>{if(signal?.aborted)throw Error('移動をやめました。');};check();
 // Long open routes must yield too, not only the A* search.
 let sampled=0,sliceStart=performance.now();
 const clear=async(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2));let prior=null;for(let i=0;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n};if(!fieldContains(p,15.6)||!canStand(p)||prior&&!canStep(prior,p))return false;prior=p;if(++sampled%64===0||performance.now()-sliceStart>5){check();await yieldFrame();check();sliceStart=performance.now();}}return true;};
 if(!fieldContains(start,15.6)||!fieldContains(goal,15.6)||!canStand(start)||!canStand(goal))throw Error('ドア前か足元がふさがっています。通り道を空けてください。');
 if(await clear(start,goal))return[{...goal}];
 // Authored parking aisles are suggestions only. Sweep every segment at the
 // same body size; a saved building can invalidate any suggested corridor.
 const checked=new Map(),connection=async(a,b)=>{const key=JSON.stringify([a,b]);if(!checked.has(key))checked.set(key,await clear(a,b));return checked.get(key);};
 for(const route of corridors){
  check();let prior=start,free=Array.isArray(route)&&route.length>0;
  if(free)for(const p of[...route,goal]){if(!finite(p)||!await connection(prior,p)){free=false;break;}prior=p;}
  if(free)return[...route.map(p=>({...p})),{...goal}];
 }
 // Most long trips cross open land and only need to go around the last parked
 // car. Check a few fully swept approaches before searching the whole map.
 let approach=null,approachCost=Infinity;
 for(const radius of [48,96,160,240]){for(let i=0;i<12;i++){check();const a=i*Math.PI/6,p={x:goal.x+Math.cos(a)*radius,z:goal.z+Math.sin(a)*radius},length=Math.hypot(p.x-start.x,p.z-start.z)+radius;if(length>=approachCost||!fieldContains(p,15.6)||!await clear(p,goal)||!await clear(start,p))continue;approach=p;approachCost=length;}await yieldFrame();check();if(approach)return[approach,{...goal}];}
 const heap=new Heap(),best=new Map(),closed=new Set(),from=new Map(),points=new Map();
 const k=p=>Math.round(p.x/cell)+','+Math.round(p.z/cell),point=key=>{const [x,z]=key.split(',').map(Number);return{x:x*cell,z:z*cell};};
 const cost=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),target={...goal};let visits=0,found=null;
 const near=p=>{const cx=Math.round(p.x/cell),cz=Math.round(p.z/cell),list=[];for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)list.push({x:(cx+dx)*cell,z:(cz+dz)*cell});return list;};
 for(const p of near(start)){if(!fieldContains(p,15.6)||!await clear(start,p))continue;const key=k(p),g=cost(start,p);best.set(key,g);points.set(key,p);heap.push({key,g,f:g+cost(p,target)});from.set(key,null);}
 const ends=new Set();for(const p of near(goal))if(fieldContains(p,15.6)&&await clear(p,goal))ends.add(k(p));
 if(!ends.size||!heap.length)throw Error('ドアまで歩ける通り道が見つかりません。');
 const standCache=new Map(),stand=p=>{const key=k(p);if(!standCache.has(key))standCache.set(key,fieldContains(p,15.6)&&canStand(p));return standCache.get(key);};
 let slice=performance.now();
 while(heap.length){check();const node=heap.pop();if(closed.has(node.key)||best.get(node.key)!==node.g)continue;closed.add(node.key);if(++visits>limit)throw Error('通り道を見つけられませんでした。少し移動して試してください。');if(ends.has(node.key)){found=node.key;break;}const p=points.get(node.key)??point(node.key);
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){if(!dx&&!dz)continue;const q={x:p.x+dx*cell,z:p.z+dz*cell},key=k(q);if(closed.has(key)||!stand(q)||!await clear(p,q))continue;const g=node.g+cost(p,q);if(g>=(best.get(key)??Infinity))continue;best.set(key,g);points.set(key,q);from.set(key,node.key);heap.push({key,g,f:g+cost(q,target)});}
  if(visits%128===0||performance.now()-slice>5){await yieldFrame();check();slice=performance.now();}
 }
 if(found===null)throw Error('通り道がふさがっています。移動は始めていません。');
 const path=[target];for(let key=found;key!==null;key=from.get(key))path.unshift(points.get(key)??point(key));
 // Greedy line-of-sight simplification is independently checked at body size.
 const result=[];let anchor=start,index=0;while(index<path.length){check();let end=index;while(end+1<path.length&&await clear(anchor,path[end+1]))end++;result.push(path[end]);anchor=path[end];index=end+1;}return result;
}
export function advanceFieldRoute(actor,path,dt,{canStand,speed=FIELD_RUN_SPEED}={}){
 if(!Number.isFinite(dt)||dt<0||dt>.1||!Number.isFinite(speed)||speed<=0||typeof canStand!=='function')throw Error('移動時間を確認してください。');
 let remaining=dt*speed,p={...actor},points=path.map(v=>({...v})),travel=0;
 while(points.length&&remaining>1e-9){const goal=points[0],d=Math.hypot(goal.x-p.x,goal.z-p.z);if(d<1e-7){points.shift();continue;}const step=Math.min(d,remaining),q={...p,x:p.x+(goal.x-p.x)*step/d,z:p.z+(goal.z-p.z)*step/d};if(!fieldSegmentClear(p,q,canStand))return{actor:p,path:[],moving:false,blocked:true,travel};q.heading=Math.atan2(q.x-p.x,q.z-p.z);p=q;remaining-=step;travel+=step;if(step>=d-1e-7)points.shift();}
 return{actor:p,path:points,moving:points.length>0,blocked:false,travel};
}

export function sharedVehicleStep(v,input,dt,{obstacles=[],canSupport=()=>true}={}){
 if(!Number.isFinite(dt)||dt<0||dt>.05||![v.x,v.z,v.heading,v.speed,v.steering,v.travel].every(Number.isFinite)||![input.throttle??0,input.steer??0].every(n=>Number.isFinite(n)&&Math.abs(n)<=1))throw Error('車両の入力を確認してください。');
 const approach=(a,b,n)=>a<b?Math.min(b,a+n):Math.max(b,a-n),n={...v},throttle=input.throttle??0,factor=input.fast?2:1;
 n.steering=approach(n.steering,-(input.steer??0)*.47,dt*1.8);n.speed=approach(n.speed,input.brake?0:throttle*(throttle>=0?100:48)*factor,dt*(input.brake?190:throttle?65*factor:35));
 const distance=n.speed*dt,angle=distance*2*Math.tan(n.steering)/49,count=Math.max(1,Math.ceil(Math.abs(distance)/.5),Math.ceil(Math.abs(angle)/.008));let blocked=false;
 for(let i=0;i<count;i++){const mid=n.heading+angle/count/2,q={...n,x:n.x+Math.sin(mid)*distance/count,z:n.z+Math.cos(mid)*distance/count,heading:n.heading+angle/count};
  // Corners and interior wheels, with swept steps. Both seats stay in the cab.
  const samples=[[-35,-48],[35,-48],[-35,48],[35,48],[0,0],[-28,-28],[28,-28],[-28,28],[28,28]];
  if(samples.some(([x,z])=>{const p=fieldPoint(q,x,z);return!fieldContains(p,2)||!canSupport(p)||obstacles.some(o=>fieldCircleHits(p,3,o));})||obstacles.some(o=>fieldCircleHits(o,Math.min(o.hx,o.hz),{...q,hx:35,hz:48}))){n.speed=0;blocked=true;break;}
  Object.assign(n,q);n.travel+=distance/count;
 }n.heading=Math.atan2(Math.sin(n.heading),Math.cos(n.heading));return{vehicle:n,blocked};
}

// A proposal only. It never translates existing works, terrain, characters,
// material receipts or the old local-coordinate origin along with a vehicle.
export function proposeSharedParking(records,{clear=()=>true}={}){
 if(!Array.isArray(records))throw Error('車の記録を確認してください。');const seen=new Set();return records.map(record=>{const spec=FLEET.find(v=>v.id===record.id);if(!spec||seen.has(record.id))throw Error('車の種類が不明か重複しています。');seen.add(record.id);const pending=record.working||record.boarded||record.suspended||record.loaded||record.connected;
 const target={x:spec.x,z:spec.z,heading:spec.heading};return{id:spec.id,status:pending?'finish-work':clear(target,spec)?'ready':'blocked',target,keepWorldGeometry:true};});
}

// Whole parking/facility footprint, including the aisle. Choose another corner
// when an existing authored object occupies it; never delete or move the work.
export function sharedParkingLayouts(){return [0,1,2,3].map(index=>{
 const mirrorX=index%2===1,mirrorZ=index>=2,sx=mirrorX?-1:1,sz=mirrorZ?-1:1;
 const heading=h=>Math.atan2(sx*Math.sin(h),sz*Math.cos(h));
 const vehicles=initialFleet().map(v=>({...v,x:v.x*sx,z:v.z*sz,heading:heading(v.heading)}));
 const facilities=FACILITIES.map(f=>({...f,x:f.x*sx,z:f.z*sz}));
 const bound=(a,b,s)=>[a*s,b*s].sort((a,b)=>a-b),[minX,maxX]=bound(PARKING.minX,PARKING.maxX,sx),[minZ,maxZ]=bound(PARKING.minZ,PARKING.maxZ,sz);
 return{corner:['north-west','north-east','south-west','south-east'][index],parking:{minX,maxX,minZ,maxZ},vehicles,facilities};
});}
export function selectSharedParking({isClear,isGroundSafe}={}){
 if(typeof isClear!=='function'||typeof isGroundSafe!=='function')throw Error('作品と地面をたしかめてから駐車場を置いてください。');
 for(const layout of sharedParkingLayouts()){
  const p=layout.parking,rects=[{x:(p.minX+p.maxX)/2,z:(p.minZ+p.maxZ)/2,hx:(p.maxX-p.minX)/2,hz:(p.maxZ-p.minZ)/2},...layout.facilities];
  if(rects.every(r=>isClear(r))&&rects.every(r=>isGroundSafe(r)))return layout;
 }
 return null;
}
