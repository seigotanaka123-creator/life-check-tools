// One geometry definition for the visible telescoping supports and every collider.
import {localToWorld,worldToLocal,polygon,polygonsOverlap} from './imasora-construction-loader-physics.js';
export function outriggerLocalVolumes(deployment){
  const k=Math.max(0,Math.min(1,deployment)),span=5+27*k,legHeight=4+7*k,out=[];
  for(const z of[-32,24])for(const side of[-1,1]){
    const x=side*23,id=`outrigger-${z}-${side}`;
    out.push({id:`${id}-beam`,kind:'beam',side,station:z,x:x+side*span/2,y:5.5,z,w:span,h:5,d:7});
    out.push({id:`${id}-leg`,kind:'leg',side,station:z,x:x+side*span,y:8-legHeight,z,w:4,h:legHeight,d:4});
    out.push({id:`${id}-foot`,kind:'foot',side,station:z,x:x+side*span,y:5-5*k,z,w:12,h:2,d:12});
  }
  return out;
}
export function craneOutriggerVolumes(s){
  return outriggerLocalVolumes(s.deployment).map(b=>({...b,...localToWorld(s.rig.vehicle,b.x,b.z),angle:s.rig.vehicle.heading,name:'支持脚',step:false}));
}
export function overlapsOutrigger(p,b,epsilon=1e-6){
  return p.y<b.y+b.h-epsilon&&p.y+p.h>b.y+epsilon&&polygonsOverlap(
    polygon({x:p.x,z:p.z,heading:p.angle||0},p.w,p.d),polygon({x:b.x,z:b.z,heading:b.angle||0},b.w,b.d));
}
export const HOOK_BODY=Object.freeze({radius:4.2,bottom:-2.7,top:5.6});
// The cylinder encloses the yellow block, stripes AND the bottom of the curved
// hook at every heading. It is not merely the cable's endpoint.
export function hookSupportDepth(h,b){
  const q=worldToLocal({x:b.x,z:b.z,heading:b.angle||0},h.x,h.z);
  const dx=Math.abs(q.x)-b.w/2,dz=Math.abs(q.z)-b.d/2;
  const horizontal=dx<=0&&dz<=0?HOOK_BODY.radius-Math.max(dx,dz):HOOK_BODY.radius-Math.hypot(Math.max(0,dx),Math.max(0,dz));
  return Math.max(0,Math.min(horizontal,h.y+HOOK_BODY.top-b.y,b.y+b.h-h.y-HOOK_BODY.bottom));
}
export const hookOutriggerHit=(s,h)=>craneOutriggerVolumes(s).some(b=>hookSupportDepth(h,b)>1e-6)?'支持脚':'';
