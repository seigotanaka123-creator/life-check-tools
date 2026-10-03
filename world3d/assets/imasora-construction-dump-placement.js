import {DUMP_SOIL,soilSize,soilSnap,soilLevel} from './imasora-construction-dump-soil.js?v=526';
const G=DUMP_SOIL.grain;
import {localToWorld,worldToLocal,polygon,polygonsOverlap,SITE,SAFE_ZONE} from './imasora-construction-loader-physics.js';
const rectangle=o=>polygon({...o,heading:o.angle||0},o.width,o.depth);
export const cellKey=(x,z)=>`${x},${z}`;
export function insideSite(p,margin=2){return p.x>=SITE.minX+margin&&p.x<=SITE.maxX-margin&&p.z>=SITE.minZ+margin&&p.z<=SITE.maxZ-margin;}
export function reservedColumns(w){
 const map=new Map(w.ground.filter(c=>soilSize(c)===G).map(c=>[cellKey(c.x,c.z),c.n]));
 for(const p of w.air)if(p.target&&soilSize(p)===G){const k=cellKey(p.target.x,p.target.z);map.set(k,Math.max(map.get(k)||0,soilLevel(p.target.y)+1));}
 return map;
}
export function tailgateBlocker(vehicle,obstacles){
 const sweep=polygon({...localToWorld(vehicle,0,-35),heading:vehicle.heading},60,62);
 return obstacles.some(o=>polygonsOverlap(sweep,rectangle(o)))?'後ろのあおりが障害物に当たります。少し前へ進むか、向きを変えてください。':'';
}
export function targetBlocker(vehicle,target,obstacles){
 const local=worldToLocal(vehicle,target.x,target.z),start={...localToWorld(vehicle,Math.max(-20,Math.min(20,local.x)),-47),y:16};
 return flightBlocker(start,target,obstacles);
}
export function flightBlocker(start,target,obstacles,grain=G){
 // The same segment and landing cells are used by the preview and the particles.
 const steps=Math.max(1,Math.ceil(Math.hypot(target.x-start.x,target.z-start.z)/2));
 for(let i=0;i<=steps;i++){
  const t=i/steps,q={x:start.x+(target.x-start.x)*t,z:start.z+(target.z-start.z)*t,heading:0};
  if(!insideSite(q,grain/2+1))return'後ろが場外です。少し前へ進むと降ろせます。';
  const shape=polygon(q,grain+2,grain+2);
  if(polygonsOverlap(shape,rectangle(SAFE_ZONE)))return'後ろは歩行者エリアです。別の空いた地面へ向けてください。';
  if(obstacles.some(o=>polygonsOverlap(shape,rectangle(o))))return'降ろす先に障害物があります。向きを変えるか、少し移動してください。';
 }
 return'';
}
export function soilPlan(w,{amount=w.load,kind='pile'}={},obstacles=[]){
 const count=Math.min(w.load,Number.isInteger(amount)&&amount>0?amount:w.load),center=localToWorld(w.rig.vehicle,0,kind==='spread'?-68:-83);
 const failure=reason=>({ok:false,reason,targets:[],amount:count,center,kind});
 if(!count)return failure('荷台が空です。「土を積む」で土を受け取ってください。');
 const gate=tailgateBlocker(w.rig.vehicle,obstacles);if(gate)return failure(gate);
 const occupancy=reservedColumns(w),candidates=[];
 // Preserve old placed soil exactly when a v1/v2 practice backup is restored.
 obstacles=[...obstacles,...w.ground.filter(c=>soilSize(c)!==G).map(c=>({...c,width:4,depth:4}))];
 if(kind==='spread'){
  const seen=new Set();for(const x of[-1.5*G,-.5*G,.5*G,1.5*G]){const p=localToWorld(w.rig.vehicle,x,-68),q={x:soilSnap(p.x),z:soilSnap(p.z)},key=cellKey(q.x,q.z);if(!seen.has(key)){seen.add(key);candidates.push({...q,key,distance:0});}}
 }else{
  for(let ix=Math.floor((center.x-30)/G);ix*G<=center.x+30;ix++)for(let iz=Math.floor((center.z-30)/G);iz*G<=center.z+30;iz++){
   const x=ix*G,z=iz*G;
   const local=worldToLocal(w.rig.vehicle,x,z);if(Math.abs(local.x)<=22&&Math.abs(local.z+83)<=18)candidates.push({x,z,key:cellKey(x,z),distance:Math.hypot(local.x,local.z+83)});
  }
 }
 // Fail visibly on a wall or boundary; never silently move the load elsewhere.
 for(const c of candidates){const reason=targetBlocker(w.rig.vehicle,c,obstacles);if(reason)return failure(reason);}
 const targets=[],limit=kind==='spread'?Math.min(count,candidates.length):count;
 for(let i=0;i<limit;i++){
  const available=candidates.filter(c=>(occupancy.get(c.key)||0)<(kind==='spread'?1:3));
  available.sort((a,b)=>((occupancy.get(a.key)||0)*7+a.distance)-((occupancy.get(b.key)||0)*7+b.distance)||a.z-b.z||a.x-b.x);
  const chosen=available[0];if(!chosen)break;
  const level=occupancy.get(chosen.key)||0;targets.push({x:chosen.x,y:level*G+G/2,z:chosen.z});occupancy.set(chosen.key,level+1);
 }
 if(kind==='pile'&&targets.length<count)return failure('ここには土が高く積まれています。少しずらすか、降ろす量を減らしてください。');
 return{ok:true,reason:kind==='spread'?'ゆっくり前進し、左右の操作で土を敷く道筋を変えられます。':`緑の形に${targets.length}個を降ろせます。`,targets,amount:targets.length,center,kind};
}
export function startGrain(vehicle,target){
 const local=worldToLocal(vehicle,target.x,target.z),start={...localToWorld(vehicle,Math.max(-20,Math.min(20,local.x)),-47),y:16};
 return{...start,start,target:{...target},elapsed:0,duration:Math.sqrt((16-target.y)/80)};
}
