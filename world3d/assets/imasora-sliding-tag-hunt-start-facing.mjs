import{worldHeight,worldValid,worldTraversable,worldSight,worldCameraPose}from'./imasora-sliding-tag-hunt-world.mjs';
// Round layout only. Initial positions constrain the starting camera, just as
// they constrain spawn spacing. Never called by CPU perception or during play.
// Bounded work at round creation; no camera or steering updates during play.
const cache=new Map(),distances=Object.freeze([8,16,28,44]);
function coveredCamera(a,yaw,others){
 for(const [distance,minDistance]of[[33,17],[39,30]]){const pose=worldCameraPose({...a,y:worldHeight(a.x,a.z)+4},{yaw:yaw+Math.PI,pitch:.28,distance,minDistance});if(Math.cos(pose.yaw-yaw-Math.PI)<.98)return false;for(const p of others)if(worldSight(pose.position,{...p,y:p.y+5.4}))return false;}
 return true;
}
export function huntStartFacing(a,others=[]){
 const radius=a.radius??2.7,key=a.x+':'+a.z+':'+radius+':'+others.map(p=>p.x+','+p.z).sort().join(';');
 if(cache.has(key))return cache.get(key);
 const inward=Math.hypot(a.x,a.z)>1?Math.atan2(-a.x,-a.z):0;
 let best={yaw:inward,score:-Infinity};
 for(let i=0;i<32;i++){
  const yaw=inward+i*Math.PI/16;let clear=0;
  for(const d of distances){const x=a.x+Math.sin(yaw)*d,z=a.z+Math.cos(yaw)*d,p={x,z,y:worldHeight(x,z)};if(!worldValid(p,radius+.2)||!worldTraversable(a,p,radius+.2))break;clear=d;}
  const score=clear+Math.cos(yaw-inward)*14;
  if(clear>=8&&score>best.score&&coveredCamera(a,yaw,others))best={yaw,score};
 }
 if(cache.size>=64)cache.delete(cache.keys().next().value);
 const yaw=Math.atan2(Math.sin(best.yaw),Math.cos(best.yaw));
 cache.set(key,yaw);return yaw;
}
