import {nativeSoilLayers} from './imasora-construction-native-soil-layers.mjs?v=120pv';
// Rectangles are clipped and subtracted, so adjacent panels share the load
// without multiplying it and stair holes never count as supporting material.
function cut(a,b){const x0=Math.max(a.x0,b.x-b.w/2),x1=Math.min(a.x1,b.x+b.w/2),z0=Math.max(a.z0,b.z-b.d/2),z1=Math.min(a.z1,b.z+b.d/2);if(x1<=x0||z1<=z0)return{rest:[a],area:0};const rest=[];if(a.x0<x0)rest.push({...a,x1:x0});if(x1<a.x1)rest.push({...a,x0:x1});if(a.z0<z0)rest.push({x0,x1,z0:a.z0,z1:z0});if(z1<a.z1)rest.push({x0,x1,z0:z1,z1:a.z1});return{rest,area:(x1-x0)*(z1-z0),x:(x0+x1)/2,z:(z0+z1)/2};}
export function nativeSoilLoads(frame,decks,extra=[]){
 const loads=[],unsupported=[];if(!frame?.decks)return{loads,unsupported,volume:0};const o=frame.soil.field.origin;let volume=0;
 for(const c of nativeSoilLayers(frame.soil,extra).floating){const x=c.x+o[0],z=c.z+o[1],density=(c.hi-c.lo)*1.6/768;let rest=[{x0:x-1,x1:x+1,z0:z-1,z1:z+1}];volume+=4*(c.hi-c.lo);
  for(const d of decks){if(Math.abs(d.top-c.lo)>.02)continue;for(const p of d.panels){const next=[];let load=0,mx=0,mz=0;for(const r of rest){const q=cut(r,p);next.push(...q.rest);load+=q.area*density;mx+=(q.x??0)*q.area*density;mz+=(q.z??0)*q.area*density;}rest=next;if(load)loads.push({deckId:d.id,x:mx/load,z:mz/load,load,source:'soil/'+c.key});if(!rest.length)break;}if(!rest.length)break;}
  if(rest.length)unsupported.push({key:c.key,volume:rest.reduce((a,r)=>a+(r.x1-r.x0)*(r.z1-r.z0)*(c.hi-c.lo),0)});
 }
 return{loads,unsupported,volume};
}
