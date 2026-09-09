// Stage 5-2a: finite water + a measured character body; no saves or inventory.
import {WATER,WATER_SOLIDS,WATER_REGIONS,DIRECTIONS,waterCoord,initialWater,waterAction,advanceWater,waterDirection,waterTotal} from './imasora-construction-water.js?v=442';
export const WATER_BODY=Object.freeze({scale:3.5,cell:42,radius:18,height:26.6,gravity:90,speed:48,jump:44,dt:1/120,maxSpeed:92,ceilingY:336,minX:-476,maxX:476,minZ:-361,maxZ:361,floor:42});
export const BODY_SOURCE=Object.freeze({x:-231,z:0});
export const BODY_SPAWN=Object.freeze({x:-231,y:42,z:84,heading:Math.PI});
export const BODY_ROOF_CELLS=new Set();
for(let x=2;x<=4;x++)for(let z=5;z<=7;z++)BODY_ROOF_CELLS.add(`${x},8,${z}`);
const EPS=1e-6,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// This independent body lab has an open lift mouth; the approved 5-1 guards stay unchanged.
export const BODY_WATER_SOLIDS=new Set([...WATER_SOLIDS].filter(k=>!['3,6,5','3,6,7'].includes(k)));
export const bodyWaterCenter=k=>{const [x,y,z]=waterCoord(k);return{x:(x+.5-WATER.nx/2)*42,y:(y+.5)*42,z:(z+.5-WATER.nz/2)*42};};
export function bodyWaterBox(k,c,s){
  const p=bodyWaterCenter(k),dir=waterDirection(s,k),w=40.25*Math.sqrt(c.q/WATER.capacity),size=[w,w,w];
  size[dir&3?0:dir&12?1:dir&48?2:1]=41.475;
  return{minX:p.x-size[0]/2,maxX:p.x+size[0]/2,minY:p.y-size[1]/2,maxY:p.y+size[1]/2,minZ:p.z-size[2]/2,maxZ:p.z+size[2]/2};
}
const cellBox=(k,name)=>{const p=bodyWaterCenter(k);return{id:k,name,minX:p.x-21,maxX:p.x+21,minY:p.y-21,maxY:p.y+21,minZ:p.z-21,maxZ:p.z+21};};
export const BODY_SOLIDS=Object.freeze([
  ...[...BODY_WATER_SOLIDS].filter(k=>waterCoord(k)[1]>0).map(k=>cellBox(k,'水路のガード')),
  ...[...BODY_ROOF_CELLS].map(k=>cellBox(k,'固い天井')),
  {id:'tank',name:'貯水槽',minX:-455,maxX:-322,minY:42,maxY:200,minZ:-66,maxZ:66},
].map(Object.freeze));
export function initialWaterBody(){
  const water=initialWater();water.directions.elbow=4;
  return{water,player:{...BODY_SPAWN,vx:0,vy:0,vz:0,grounded:true,jumpHeld:false,ceilingHit:false,hit:''},phase:0,time:0,paused:false,wet:0,force:[0,0,0],maxHeight:42,headContacts:0,message:'① 注水を始める → ② レンを奥へ歩かせて、水流に入ってみてください。'};
}
export function waterBodyAction(state,action,dir){
  if(action==='home')return{...state,player:{...initialWaterBody().player},wet:0,force:[0,0,0],message:'安全な場所へ戻りました。水量・水路の状態は変わりません。'};
  if(action==='pause')return{...state,paused:!state.paused,message:state.paused?'実験を再開しました。':'実験を一時停止しました。'};
  if(action==='direction'){
    if(![1,2,4,8,16,32].includes(dir))throw Error('水の向きを選んでください。');
    const water=structuredClone(state.water);for(const r of WATER_REGIONS)water.directions[r.id]=dir;
    for(const c of Object.values(water.cells))c.dir=dir;water.revision++;
    return{...state,water,message:`水を「${DIRECTIONS[Math.log2(dir)].name}」へ向けました。水のある場所だけで、その向きの力が働きます。`};
  }
  if(action==='feed')return{...state,water:waterAction(state.water,'feed'),message:state.water.feeding?'注水を止めました。残った水が流れ終わると水流の力もなくなります。':'注水中。奥へ歩いて水に入ると、水流で身体が持ち上がります。'};
  if(action==='recover')return{...state,water:waterAction(state.water,'recover'),message:'水を192 Lすべて回収しました。身体には通常の重力がかかります。'};
  throw Error('不明な操作です。');
}
const playerBox=p=>({minX:p.x-18,maxX:p.x+18,minY:p.y,maxY:p.y+26.6,minZ:p.z-18,maxZ:p.z+18});
const overlap=(a,b)=>['X','Y','Z'].every(axis=>a['max'+axis]>b['min'+axis]+EPS&&a['min'+axis]<b['max'+axis]-EPS);
export const bodyIntersectsSolid=p=>BODY_SOLIDS.some(b=>overlap(playerBox(p),b));
export function sampleBodyWater(water,p){
  const body=playerBox(p),volume=36*36*26.6,force=[0,0,0];let wet=0;
  for(const [k,c] of Object.entries(water.cells)){
    const b=bodyWaterBox(k,c,water);let fraction=1;
    for(const axis of['X','Y','Z'])fraction*=Math.max(0,Math.min(body['max'+axis],b['max'+axis])-Math.max(body['min'+axis],b['min'+axis]));
    fraction/=volume;if(fraction<=0)continue;wet+=fraction;
    const dirs=DIRECTIONS.filter((_,i)=>waterDirection(water,k)&(1<<i)),v=[0,0,0];
    for(const d of dirs)for(let i=0;i<3;i++)v[i]+=d.v[i];const n=Math.max(1,Math.hypot(...v));
    for(let i=0;i<3;i++)force[i]+=fraction*v[i]/n;
  }
  return{wet:Math.min(1,wet),force};
}
function moveAxis(p,axis,distance){
  if(!distance)return'';const lower=axis==='y'?WATER_BODY.floor:WATER_BODY['min'+axis.toUpperCase()]+18,upper=axis==='y'?Infinity:WATER_BODY['max'+axis.toUpperCase()]-18;
  const start=p[axis],target=clamp(start+distance,lower,upper);let amount=target-start,hit=target!==start+distance?(axis==='y'?'地面':'安全柵'):'';
  const body=playerBox(p),A=axis.toUpperCase(),others=['X','Y','Z'].filter(a=>a!==A);
  for(const b of BODY_SOLIDS){
    if(!others.every(a=>body['max'+a]>b['min'+a]+EPS&&body['min'+a]<b['max'+a]-EPS))continue;
    if(amount>0&&body['max'+A]<=b['min'+A]+EPS){const gap=Math.max(0,b['min'+A]-body['max'+A]);if(gap<amount){amount=gap;hit=b.name;}}
    if(amount<0&&body['min'+A]>=b['max'+A]-EPS){const gap=Math.min(0,b['max'+A]-body['min'+A]);if(gap>amount){amount=gap;hit=b.name;}}
  }
  p[axis]+=amount;return hit;
}
export function stepWaterBody(state,input={},dt=WATER_BODY.dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('身体の更新刻みが不正です。');
  if(state.paused)return state;
  const water=advanceWater(state.water,dt,{extraSolids:BODY_ROOF_CELLS,solids:BODY_WATER_SOLIDS}),p={...state.player};
  const contact=sampleBodyWater(water,p),n=Math.max(1,Math.hypot(input.x||0,input.z||0));
  if(input.jump&&!p.jumpHeld&&p.grounded){p.vy=WATER_BODY.jump;p.grounded=false;}p.jumpHeld=!!input.jump;
  // Contact-volume-weighted fantasy thrust, with drag and a bounded speed.
  p.vx+=(((input.x||0)/n*48-p.vx)*5+contact.force[0]*260-contact.wet*p.vx*2)*dt;
  p.vz+=(((input.z||0)/n*48-p.vz)*5+contact.force[2]*260-contact.wet*p.vz*2)*dt;
  p.vy+=(contact.force[1]*500-90-contact.wet*p.vy*5)*dt;
  for(const k of['vx','vy','vz'])p[k]=clamp(p[k],-92,92);
  p.hit='';p.ceilingHit=false;p.grounded=false;
  // Sweep each axis in substeps, including fast diagonal and falling motion.
  const steps=Math.max(1,Math.ceil(Math.hypot(p.vx,p.vy,p.vz)*dt/.35));
  for(let i=0;i<steps;i++)for(const axis of['y','x','z']){
    const velocity='v'+axis,wanted=p[velocity]*dt/steps,hit=moveAxis(p,axis,wanted);
    if(hit){p.hit=hit;if(axis==='y'){if(wanted>0)p.ceilingHit=true;if(wanted<0)p.grounded=true;}p[velocity]=0;}
  }
  if(Math.hypot(input.x||0,input.z||0)>.01)p.heading=Math.atan2(input.x||0,input.z||0);
  return{...state,water,player:p,time:state.time+dt,wet:contact.wet,force:contact.force,maxHeight:Math.max(state.maxHeight,p.y),headContacts:state.headContacts+Number(p.ceilingHit&&!state.player.ceilingHit)};
}
export function advanceWaterBody(state,input,dt){
  if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error('実験の更新刻みが不正です。');
  if(state.paused||!dt)return state;let s={...state,phase:state.phase+dt};
  while(s.phase>=WATER_BODY.dt-1e-9){s={...s,phase:Math.max(0,s.phase-WATER_BODY.dt)};s=stepWaterBody(s,input);}if(s.phase<1e-9)s.phase=0;return s;
}
export function waterBodyReadout(s){return{height:s.player.y-42,head:s.player.y+26.6,ceiling:336,wet:Math.round(s.wet*100),total:waterTotal(s.water)*.25,headContacts:s.headContacts};}
