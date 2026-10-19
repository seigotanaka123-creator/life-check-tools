import {inWorkArea} from './imasora-construction-field-area.mjs?v=120ey';
import {poolKey} from './imasora-construction-field-water.mjs?v=120fb';

export const FIELD_WATER_TICK=.1,FIELD_WATER_CELL=8;
const directions=[[0,-8],[-8,0],[8,0],[0,8]];
const validHeight=y=>Number.isFinite(y)&&y>=-32&&y<=48;
const depth=q=>q/128;
function sampler(heightAt){const cache=new Map();return(x,z)=>{const k=x+','+z;if(!cache.has(k))cache.set(k,heightAt(x,z));return cache.get(k);};}
function obstacleSamples(external,pools){
 const list=Object.values(pools),minX=Math.min(...list.map(p=>p.x))-16,maxX=Math.max(...list.map(p=>p.x))+16,minZ=Math.min(...list.map(p=>p.z))-16,maxZ=Math.max(...list.map(p=>p.z))+16,grid=new Map(),wide=[];
 for(const b of external){
  const c=Math.abs(Math.cos(b.angle??0)),sn=Math.abs(Math.sin(b.angle??0)),w=c*b.w/2+sn*b.d/2+4,d=sn*b.w/2+c*b.d/2+4;
  if(b.x+w<minX||b.x-w>maxX||b.z+d<minZ||b.z-d>maxZ)continue;
  const x0=Math.floor(Math.max(minX,b.x-w)/64),x1=Math.floor(Math.min(maxX,b.x+w)/64),z0=Math.floor(Math.max(minZ,b.z-d)/64),z1=Math.floor(Math.min(maxZ,b.z+d)/64);
  if((x1-x0+1)*(z1-z0+1)>1024){wide.push(b);continue;}
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z,a=grid.get(key)??[];a.push(b);grid.set(key,a);}
 }
 return(x,z)=>{const local=grid.get(Math.floor(x/64)+','+Math.floor(z/64))??[];return wide.length?[...wide,...local]:local;};
}
function blocked(x,z,y,external,clearance=1){
 for(const b of external(x,z)){
  if(b.y+b.h<=y+.05||b.y>y+clearance)continue;
  const c=Math.cos(b.angle??0),sn=Math.sin(b.angle??0),dx=x-b.x,dz=z-b.z;
  if(Math.abs(c*dx-sn*dz)<b.w/2+4&&Math.abs(sn*dx+c*dz)<b.d/2+4)return true;
 }
 return false;
}
function routeClear(p,to,external,heightAt){
 // Sample every terrain voxel: a thin ridge/wall between centres is not an inlet.
 for(let i=0;i<=4;i++){
  const x=p.x+(to.x-p.x)*i/4,z=p.z+(to.z-p.z)*i/4,y=heightAt(x,z);
  if(!validHeight(y)||y>p.y+depth(p.q)+.05||blocked(x,z,y,external,.12+depth(p.q)))return false;
 }
 return true;
}

// Each quantum is still 250 mL. The existing pool save schema remains valid.
// No offline catch-up, drain at the field edge, random motion or source grant.
export function flowFieldWater(state,external=[],heightAt=()=>0,{flow=true}={}){
 if(!state.loader.vehicle.field||!Object.keys(state.pools??{}).length)return state;
 const h=sampler(heightAt),pools={},byCell=new Map();let changed=false;
 for(const [key,p]of Object.entries(state.pools)){
  const y=h(p.x,p.z),q={...p,y:validHeight(y)?y:p.y},k=poolKey(q),old=pools[k];
  pools[k]=old?{...old,q:old.q+p.q}:q;byCell.set(q.x+','+q.z,k);
  if(key!==k||old)changed=true;
 }
 if(flow){
  const delta=new Map(),incoming=new Map(),obstacles=obstacleSamples(external,pools);
  // Snapshot proposals are applied together. Newly arrived water cannot move
  // twice in a tick, and object insertion order cannot change the answer.
  for(const [key,p]of Object.entries(pools).sort(([a],[b])=>a.localeCompare(b))){
   if(!validHeight(h(p.x,p.z))||blocked(p.x,p.z,p.y,obstacles,.12+depth(p.q)))continue;
   const choices=[];
   for(const [dx,dz]of directions){
    const to={x:p.x+dx,z:p.z+dz,y:0};if(!inWorkArea(to,state.loader.vehicle,4))continue;
    to.y=h(to.x,to.z);if(!validHeight(to.y)||to.y>p.y+.05)continue;
    const k=byCell.get(to.x+','+to.z),there=k?pools[k].q:0;
    const difference=p.y+depth(p.q)-to.y-depth(there);
    // On a level tread, enough water spreads toward the next lower step.
    // A small wet film rests instead of flickering between integer quanta.
    const threshold=Math.abs(to.y-p.y)<.05?.125:1/128;
    if(difference<=threshold||!routeClear(p,to,obstacles,h))continue;
    choices.push({to,k:k??poolKey(to),difference,head:to.y+depth(there)});
   }
   choices.sort((a,b)=>a.head-b.head||a.to.x-b.to.x||a.to.z-b.to.z);
   const next=choices[0];if(!next)continue;
   const threshold=Math.abs(next.to.y-p.y)<.05?.125:1/128,q=Math.min(p.q,8,Math.max(1,Math.floor((next.difference-threshold)*64)));
   delta.set(key,(delta.get(key)??0)-q);delta.set(next.k,(delta.get(next.k)??0)+q);
   incoming.set(next.k,{...next.to,dir:p.dir});changed=true;
  }
  for(const [key,d]of delta){const old=pools[key],q=(old?.q??0)+d;if(q)pools[key]={...(old??incoming.get(key)),q};else delete pools[key];}
 }
 if(!changed)return state;
 let task=state.task;
 if(task?.type==='field-return'){
  const old=state.pools[task.pool],same=old&&Object.entries(pools).find(([,p])=>p.x===old.x&&p.z===old.z);
  // A changed terrain height changes the key, not the ownership of the water.
  if(same)task={...task,pool:same[0]};
 }
 return {...state,pools,task};
}
