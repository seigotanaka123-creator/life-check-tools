import {freeCell} from './free-build-state.mjs';
import {frameBlocked} from './free-frames.mjs';
import {FOOT_LEVEL_EPS} from './free-footing.mjs';
import {VEHICLE_GROUND} from './free-vehicle-ground.mjs';

const EMPTY='型枠の形を1マス以上選んでください。';
// Read-only planning. A proposed deck never supplies a surface or owns material.
export function inspectFormGround(f,mask,height,heightAt=()=>null,blockedAt=()=>true){
 if(!f?.location||!Number.isInteger(mask)||mask<1||mask>65535||![2,4,8].includes(height))return{ready:false,kind:'empty',issue:EMPTY,cells:[],supports:[],samples:0};
 const cache=new Map(),cells=[],posts=new Map();let low=Infinity,high=-Infinity,maxSlope=0,maxError=0,missing=false,blocked=false;
 const sample=(x,z)=>{const key=x+','+z;if(!cache.has(key)){const y=heightAt(f.location.x+x,f.location.z+z),obstacle=frameBlocked(f,[],{x,z},blockedAt,.5);cache.set(key,{x,z,y:Number.isFinite(y)?y:null,obstacle});}return cache.get(key);};
 for(let i=0;i<16;i++)if(mask&(1<<i)){
  const centre=freeCell(i),points=[];for(let dx=-8;dx<=8;dx+=2)for(let dz=-8;dz<=8;dz+=2)points.push(sample(centre.x+dx,centre.z+dz));
  const absent=points.some(p=>p.y===null),occupied=points.some(p=>p.obstacle);missing||=absent;blocked||=occupied;
  let min=null,max=null,slope=null,error=null;
  if(!absent){min=Math.min(...points.map(p=>p.y));max=Math.max(...points.map(p=>p.y));low=Math.min(low,min);high=Math.max(high,max);
   const mean=points.reduce((s,p)=>s+p.y,0)/81,denom=points.reduce((s,p)=>s+(p.x-centre.x)**2,0),a=points.reduce((s,p)=>s+(p.x-centre.x)*p.y,0)/denom,b=points.reduce((s,p)=>s+(p.z-centre.z)*p.y,0)/denom;
   slope=Math.hypot(a,b);error=Math.max(...points.map(p=>Math.abs(p.y-mean-a*(p.x-centre.x)-b*(p.z-centre.z))));maxSlope=Math.max(maxSlope,slope);maxError=Math.max(maxError,error);
  }
  const ready=!absent&&!occupied&&Math.max(Math.abs(min),Math.abs(max))<=FOOT_LEVEL_EPS;
  cells.push({index:i,x:centre.x,z:centre.z,min,max,slope,error,ready,kind:absent||occupied?'unsafe':ready?'ready':'preparation'});
  for(const dx of [-8,8])for(const dz of [-8,8]){const p=sample(centre.x+dx,centre.z+dz);posts.set(p.x+','+p.z,p);}
 }
 const ready=cells.every(c=>c.ready),deckY=Number.isFinite(high)?Math.ceil(Math.max(0,high+.25)*4)/4:null;
 const tooHigh=deckY!==null&&Number.isFinite(low)&&deckY-low>12,unsafe=missing||blocked||maxSlope>VEHICLE_GROUND.maxSlope+1e-8||maxError>VEHICLE_GROUND.maxPatchError+1e-8||tooHigh;
 const issue=missing?'地面に穴があります。支える地面を整えてから確認してください。':blocked?'施工場所に車両・作品・ホースなどがあります。重ならない場所を選んでください。':ready?'選んだ全マスを地面が支えています。型枠を組めます。':unsafe?'急な傾きや段差があります。造成して安全な足場を作ってください。':'この場所は造成・水平な土台の準備が必要です。今の地面では型枠を組めません。';
 return{ready,kind:ready?'ready':unsafe?'unsafe':'preparation',issue,location:{...f.location},mask,height,cells,samples:cache.size,groundMin:Number.isFinite(low)?low:null,groundMax:Number.isFinite(high)?high:null,maxSlope,maxError,deckY:ready?0:unsafe?null:deckY,
  supports:ready||unsafe?[]:[...posts.values()].map(p=>({x:p.x,z:p.z,bottom:p.y,top:deckY}))};
}
export function requireFormGround(f,mask,height,heightAt,blockedAt){const result=inspectFormGround(f,mask,height,heightAt,blockedAt);if(!result.ready)throw Error(result.issue);return result;}
