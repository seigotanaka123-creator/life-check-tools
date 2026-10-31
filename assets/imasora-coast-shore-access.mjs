import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {coastShore,coastHeight,coastPierContains,COAST_WATER_Y,COAST_WORLD,COAST_WADE_DEPTH} from './imasora-coast-layout.mjs?v=120mx';

// The same depth is used by walking and recovery. A walkable patch of wet
// sand must never also be treated as a fall into deep water.
export const COAST_PULL_REACH=220;
export const COAST_PULL_RELEASE=280;
export function coastInDeepWater(x,y,z){
 return Number.isFinite(y)&&y<COAST_WATER_Y-COAST_WADE_DEPTH-.5&&coastHeight(x,z)<COAST_WATER_Y-COAST_WADE_DEPTH&&!coastPierContains(x,z);
}
// Search nearby mainland sand, not the starting pier. Collision checks belong
// to the caller and include both scenery and the current physical assemblies.
export function coastShoreRecovery(x,z,clear=()=>true){
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>COAST_WORLD.width/2+30)return null;
 const candidates=[];
 // An enlarged island beach recovers locally; it must not send a walker home.
 if(COAST_ISLANDS.some(i=>Math.abs(x-i.x)<i.rx*1.6&&Math.abs(z-i.z)<i.rz*1.8))for(let r=12;r<=240;r+=12)for(let n=0;n<24;n++){
  const a=n*Math.PI/12,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,y=coastHeight(px,pz);if(y<COAST_WATER_Y||y>40)continue;
  if([[-5,0],[5,0],[0,-5],[0,5]].some(([dx,dz])=>Math.abs(coastHeight(px+dx,pz+dz)-y)>4))continue;
  candidates.push({x:px,y,z:pz,distance:r});
 }
 for(const dx of [0,-24,24,-48,48,-80,80,-120,120]){
  const px=Math.max(-COAST_WORLD.width/2+24,Math.min(COAST_WORLD.width/2-24,x+dx));
  for(const inset of [12,36,64,96]){
   const pz=Math.min(z,coastShore(px)-inset),y=coastHeight(px,pz),distance=Math.hypot(px-x,pz-z);
   if(distance>240||y<COAST_WATER_Y||coastPierContains(px,pz, -12))continue;
   candidates.push({x:px,y,z:pz,distance});
  }
 }
 candidates.sort((a,b)=>a.distance-b.distance);
 const point=candidates.find(clear);return point?{x:point.x,y:point.y,z:point.z}:null;
}
