import * as T from './three.module.min.js';
import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {coastOnIsland} from './imasora-coast-island-ground.mjs?v=120mu';

// Measure the real belly once, rather than treating the walker as a point or
// inventing an island-sized invisible wall. Keep every unique lower mesh vertex; the profile remains in world units
// and rotates with the visible body. No per-frame scene raycasts or copies.
export function coastTerrainBodySamples(model,grounding){
 const body=model.getObjectByName('body-seamless');if(!body?.geometry?.attributes?.position)return [];
 model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(body),mid=(box.min.y+box.max.y)/2,p=new T.Vector3(),cells=new Map();
 const root=model.position,offset=grounding?.verticalOffset??0;
 const a=body.geometry.attributes.position;
 for(let n=0;n<a.count;n++){p.fromBufferAttribute(a,n).applyMatrix4(body.matrixWorld);if(p.y>mid)continue;const x=p.x-root.x,z=p.z-root.z,y=p.y-root.y+offset,key=x+','+z,old=cells.get(key);if(!old||y<old.y)cells.set(key,{x,y,z});}
 return [...cells.values()];
}
// Island terrain is immutable. Reuse a bounded handful of contact queries
// across the step/turn/landing checks; custom/dynamic test samplers are uncached.
const floorCache=new WeakMap();
export function coastTerrainBodyContact(x,z,heading,samples,heightAt=coastWalkingHeight){
 if(!samples?.length||!coastOnIsland(x,z,24))return null;
 let cache;if(heightAt===coastWalkingHeight){cache=floorCache.get(samples);if(!cache){cache={entries:[],next:0};floorCache.set(samples,cache);}for(const e of cache.entries)if(e.x===x&&e.z===z&&e.heading===heading)return e.contact;}
 const c=Math.cos(heading),s=Math.sin(heading);let floor=-Infinity,px0,py0,pz0;
 for(const p of samples){const px=x+p.x*c+p.z*s,pz=z-p.x*s+p.z*c,y=heightAt(px,pz),root=y-p.y;if(root>floor){floor=root;px0=px;py0=y;pz0=pz;}}
 const contact=Number.isFinite(floor)?{x:px0,y:py0,z:pz0,floor}:null;
 // Keep the actual touching point alongside the same eight cached heights.
 // A rounded body can land on a bank before its centre reaches that bank.
 if(cache){let e=cache.entries[cache.next];if(!e)cache.entries[cache.next]=e={};e.x=x;e.z=z;e.heading=heading;e.contact=contact;cache.next=(cache.next+1)%8;}
 return contact;
}
export const coastTerrainBodyFloor=(x,z,heading,samples,heightAt=coastWalkingHeight)=>coastTerrainBodyContact(x,z,heading,samples,heightAt)?.floor??-Infinity;
export function coastTerrainBodyBlocked(from,to,heading,samples,heightAt=coastWalkingHeight,{grounded=false}={}){
 const targetFloor=coastTerrainBodyFloor(to.x,to.z,heading,samples,heightAt);
 let targetY=to.y,originFloor;
 if(grounded&&Number.isFinite(targetFloor)){
  originFloor=coastTerrainBodyFloor(from.x,from.z,heading,samples,heightAt);
  // A rounded belly can touch a gentle hill before its centre/feet. Follow
  // that real contact at the same walkable grade; never lift up a cliff merely
  // because the centre is still on flat ground beside it.
  const reference=Math.max(from.y,originFloor),rise=Math.hypot(to.x-from.x,to.z-from.z)*.55+.001;
  targetY=Math.max(targetY,Math.min(targetFloor,reference+rise));
 }
 const target=targetFloor-targetY;
 if(target<=.24)return false;
 // A legacy embedded save can move outward or along contact, never deeper.
 const origin=(originFloor??coastTerrainBodyFloor(from.x,from.z,heading,samples,heightAt))-from.y;
 return target>Math.max(.24,origin+.001);
}
