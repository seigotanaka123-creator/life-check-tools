// Read the simulator's immutable terrain/spoil objects; never create or move soil.
import {CELL,PLOT,BIN,armPose} from './imasora-construction-excavator.js';
import {EXCAVATION_YARDS} from './imasora-construction-world-excavation.js';

export function createEarthSurface(readWork,readSite){
 let terrain=null,spoil=null,columns=new Map(),loose=new Map();
 function prepare(work){
  if(!work?.terrain||!Array.isArray(work.spoil))throw Error('地形を確認できません。');
  if(terrain!==work.terrain){const next=new Map();for(const p of Object.values(work.terrain)){if(!Array.isArray(p)||p.length!==3||!p.every(Number.isSafeInteger))throw Error('地形の座標が不正です。');const key=p[0]+','+p[2];next.set(key,Math.max(next.get(key)??-Infinity,(p[1]+1)*CELL));}columns=next;terrain=work.terrain;}
  if(spoil!==work.spoil){const next=new Map();for(const p of work.spoil){if(![p.x,p.y,p.z].every(Number.isFinite))throw Error('盛土の座標が不正です。');for(let x=Math.floor((p.x-CELL/2)/CELL);x<=Math.floor((p.x+CELL/2)/CELL);x++)for(let z=Math.floor((p.z-CELL/2)/CELL);z<=Math.floor((p.z+CELL/2)/CELL);z++){const key=x+','+z,list=next.get(key)??[];list.push(p);next.set(key,list);}}loose=next;spoil=work.spoil;}
 }
 function local(x,z){const site=readSite(),origin=EXCAVATION_YARDS[site];return origin&&Number.isFinite(x)&&Number.isFinite(z)?{x:x-origin[0],z:z-origin[1]}:null;}
 return{
  heightAt(x,z){const p=local(x,z);if(!p)return undefined;try{
   prepare(readWork());const inside=p.x>=PLOT.minX&&p.x<PLOT.maxX&&p.z>=PLOT.minZ&&p.z<PLOT.maxZ;
   let height=inside?columns.get(Math.floor(p.x/CELL)+','+Math.floor(p.z/CELL))??PLOT.bottom:undefined;
   for(const s of loose.get(Math.floor(p.x/CELL)+','+Math.floor(p.z/CELL))??[])if(Math.abs(s.x-p.x)<=CELL/2&&Math.abs(s.z-p.z)<=CELL/2)height=Math.max(height??0,s.y+CELL/2);
   return height;
  }catch{return null;}},
  // Soil is resolved by height/contact checks. Machinery and loose falling soil
  // are obstacles, not terrain supports. Buildings and fences stay in the world.
  blockedAt(x,z,r=0){const p=local(x,z);if(!p)return false;const s=readWork();if(!s?.loader?.vehicle||!Number.isFinite(r)||r<0)return true;
   const touches=(x,z,w,d,heading=0)=>{const dx=p.x-x,dz=p.z-z,c=Math.cos(heading),sn=Math.sin(heading),a=Math.max(0,Math.abs(c*dx-sn*dz)-w/2),b=Math.max(0,Math.abs(sn*dx+c*dz)-d/2);return Math.hypot(a,b)<=r;};
   const v=s.loader.vehicle;if(touches(BIN.x,BIN.z,BIN.width,BIN.depth)||touches(v.x,v.z,70,88,v.heading))return true;
   const pose=armPose(s);for(let i=0;i<2;i++){const a=pose.world[i],b=pose.world[i+1],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3));for(let j=0;j<=n;j++){const t=j/n,y=a.y+(b.y-a.y)*t;if(y<72&&Math.hypot(p.x-a.x-(b.x-a.x)*t,p.z-a.z-(b.z-a.z)*t)<=r+5)return true;}}
   if(pose.bucket.y<80&&touches(pose.bucket.x,pose.bucket.z,24,26,pose.heading))return true;
   return (s.falling??[]).some(o=>Math.hypot(o.x-p.x,o.z-p.z)<=r+6);
  }
 };
}
