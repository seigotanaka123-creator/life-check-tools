import {craneChassisFrame} from './imasora-construction-crane-ground.mjs?v=120ey';
import {groundPoint} from './imasora-construction-vehicle-ground-frame.mjs';
import {boxesOverlap3D} from './imasora-construction-native-dump-pose.mjs?v=120fw';
// One geometry definition for the visible telescoping supports and every collider.
import {localToWorld,worldToLocal,polygon,polygonsOverlap} from './imasora-construction-loader-physics.js?v=120ey';
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
  const g=craneChassisFrame(s),v=s.rig.vehicle,k=s.deployment;
if(!g)return outriggerLocalVolumes(k).map(b=>({...b,...localToWorld(v,b.x,b.z),angle:v.heading,name:'支持脚',step:false}));
const cs=Math.cos(v.heading),sn=Math.sin(v.heading),axes=[[cs,0,-sn],[0,1,0],[sn,0,cs]],out=[];
for(const b of outriggerLocalVolumes(k)){
const q=groundPoint(g,b.x,b.y+b.h/2,b.z),f=s.groundPose.feet.find(f=>f.side===b.side&&f.station===b.station);
if(f&&b.kind!=='beam'){
const base=groundPoint(g,b.x,5,b.z),bottom=base[1]*(1-k)+f.height*k,top=groundPoint(g,b.x,8,b.z)[1];
if(b.kind==='foot'){q[1]=bottom+1;b.h=2;}
else{b.h=Math.max(1,top-(bottom+2));q[1]=bottom+2+b.h/2;}
}
const a=b.kind==='beam'?g.axes:axes;
out.push({...b,x:q[0],y:q[1]-b.h/2,z:q[2],position:q,half:[b.w/2,b.h/2,b.d/2],axes:a,angle:v.heading,name:'支持脚',step:false});
}return out;
}
export function overlapsOutrigger(p,b,epsilon=1e-6){
  if(b.axes)return boxesOverlap3D({position:[p.x,p.y+p.h/2,p.z],half:[p.w/2,p.h/2,p.d/2],heading:p.angle||0},b);
  return p.y<b.y+b.h-epsilon&&p.y+p.h>b.y+epsilon&&polygonsOverlap(
    polygon({x:p.x,z:p.z,heading:p.angle||0},p.w,p.d),polygon({x:b.x,z:b.z,heading:b.angle||0},b.w,b.d));
}
export const HOOK_BODY=Object.freeze({radius:4.2,bottom:-2.7,top:5.6});
// The cylinder encloses the yellow block, stripes AND the bottom of the curved
// hook at every heading. It is not merely the cable's endpoint.
export function hookSupportDepth(h,b){
  if(b.axes){const d=[h.x-b.position[0],h.y-b.position[1],h.z-b.position[2]],q=b.axes.map(a=>a.reduce((n,v,i)=>n+v*d[i],0));return Math.max(0,Math.min(b.h/2+HOOK_BODY.top-q[1],b.h/2+q[1]-HOOK_BODY.bottom,b.w/2+HOOK_BODY.radius-Math.abs(q[0]),b.d/2+HOOK_BODY.radius-Math.abs(q[2])));}
  const q=worldToLocal({x:b.x,z:b.z,heading:b.angle||0},h.x,h.z);
  const dx=Math.abs(q.x)-b.w/2,dz=Math.abs(q.z)-b.d/2;
  const horizontal=dx<=0&&dz<=0?HOOK_BODY.radius-Math.max(dx,dz):HOOK_BODY.radius-Math.hypot(Math.max(0,dx),Math.max(0,dz));
  return Math.max(0,Math.min(horizontal,h.y+HOOK_BODY.top-b.y,b.y+b.h-h.y-HOOK_BODY.bottom));
}
export const hookOutriggerHit=(s,h)=>craneOutriggerVolumes(s).some(b=>hookSupportDepth(h,b)>1e-6)?'支持脚':'';
