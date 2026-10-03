import {SUPPLY_HOSE_RADIUS,HOSE_CLEARANCE} from './free-hose-shape.mjs';
const clearance=SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE,spacing=.5;
export const HOSE_TERRAIN_QUERY_LIMIT=16000;
// Probe the whole width, including the segment interior, before lifting it.
// The endpoints remain the actual couplers; terrain never moves a vehicle.
function segmentGround(a,b,location,heightAt){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));let floor=-Infinity;
 for(let i=0;i<=n;i++){const t=i/n,x=location.x+a.x+(b.x-a.x)*t,z=location.z+a.z+(b.z-a.z)*t;
  for(const[dx,dz]of [[0,0],[-clearance,0],[clearance,0],[0,-clearance],[0,clearance]]){const h=heightAt(x+dx,z+dz);if(!Number.isFinite(h))throw Error('配管経路の地面を確認できません。');floor=Math.max(floor,h+clearance);}
 }
 return floor;
}
export function hoseTerrainClear(path,location,heightAt){
 for(let i=1;i<path.length;i++)if(segmentGround(path[i-1],path[i],location,heightAt)>Math.min(path[i-1].y,path[i].y)+1e-8)return false;
 return true;
}
export function drapeSupplyHose(path,location,heightAt){
 if(path.length<2||path.length>300)throw Error('配管経路の長さを確認できません。');
 const floor=path.map(()=>-Infinity),distance=[0];
 for(let i=1;i<path.length;i++){const h=segmentGround(path[i-1],path[i],location,heightAt);floor[i-1]=Math.max(floor[i-1],h);floor[i]=Math.max(floor[i],h);distance[i]=distance[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);}
 // A slope envelope rounds the approach to a bank instead of creating a kink.
 for(let i=1;i<floor.length;i++)floor[i]=Math.max(floor[i],floor[i-1]-.65*(distance[i]-distance[i-1]));
 for(let i=floor.length-2;i>=0;i--)floor[i]=Math.max(floor[i],floor[i+1]-.65*(distance[i+1]-distance[i]));
 if(floor[0]>path[0].y+1e-8||floor.at(-1)>path.at(-1).y+1e-8)throw Error('配管経路の地面や盛土が接続口に近すぎます。平らな通路を確保してください。');
 return path.map((p,i)=>({...p,y:i===0||i===path.length-1?p.y:Math.max(p.y,floor[i])}));
}
