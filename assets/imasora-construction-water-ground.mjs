import {vehicleGroundFrame,groundPoint,groundVector} from './imasora-construction-vehicle-ground-frame.mjs?v=120el';
import {bucketWorldPoint} from './imasora-construction-loader-work.js?v=120ey';
import {inWorkArea} from './imasora-construction-field-area.mjs?v=120ey';

// Ground poses are derived from the current terrain, never copied into saves.
export function waterWorkFrame(s,heightAt){
 if(!s.loader.vehicle.field||typeof heightAt!=='function')return null;
 const g=typeof heightAt.groundFrame==='function'?heightAt.groundFrame(s.loader.vehicle):vehicleGroundFrame(s.loader.vehicle,heightAt);
 if(g.position[1]<-32||g.position[1]>48)throw Error('水を使うときは、低い地面へ車を移そう。');
 for(const bucket of [s.bucket,{lift:0,tilt:0},{lift:.8,tilt:.7}]){const p=waterBucketPoint(s,bucket,g);if(!inWorkArea(p,s.loader.vehicle)||p.y< -32||p.y>=70)throw Error('注ぎ口を現場の中へ向けてね。');}
 return g;
}
export function waterBucketPoint(s,bucket,g){
 if(s.loader.vehicle.waterTruck){const v=s.loader.vehicle;if(g){const q=groundPoint(g,0,21,39);return{x:q[0],y:q[1],z:q[2]};}return{x:v.x+Math.sin(v.heading)*39,y:21,z:v.z+Math.cos(v.heading)*39};}
 if(!g)return bucketWorldPoint(s.loader.vehicle,bucket,0,-4,13);
 const p=bucketWorldPoint({x:0,z:0,heading:0},bucket,0,-4,13),q=groundPoint(g,p.x,p.y,p.z);
 return{x:q[0],y:q[1],z:q[2]};
}
export function waterFallTime(fromY,toY,vy=0){return(vy+Math.sqrt(vy*vy+140*Math.max(0,fromY-toY)))/70;}
export function waterFallPrediction(s,g,heightAt){
 const from=waterBucketPoint(s,{lift:.8,tilt:.7},g),v=s.loader.vehicle;
 const speed=v.waterTruck?20:12,velocity=g?groundVector(g,[0,0,speed]):[Math.sin(v.heading)*speed,0,Math.cos(v.heading)*speed];
 const point=t=>({x:from.x+velocity[0]*t,y:from.y+velocity[1]*t-35*t*t,z:from.z+velocity[2]*t});
 if(!v.field||typeof heightAt!=='function'){
  const duration=waterFallTime(from.y,1,velocity[1]),to=point(duration);to.y=1;return{from,to,duration,vy:velocity[1]};
 }
 // Find the first surface hit, including a ledge in front of a tilted vehicle.
 for(let t=1/120;t<2;t+=1/120){const p=point(t),h=heightAt(p.x,p.z);if(!Number.isFinite(h))throw Error('水が届く地面をたしかめられないよ。');if(p.y<=h){let lo=t-1/120,hi=t;for(let i=0;i<14;i++){const m=(lo+hi)/2,q=point(m),y=heightAt(q.x,q.z);if(!Number.isFinite(y))throw Error('水が届く地面をたしかめられないよ。');if(q.y>y)lo=m;else hi=m;}const to=point(hi);to.y=heightAt(to.x,to.z);return{from,to,duration:hi,vy:velocity[1]};}}
 throw Error('ここからは水が遠すぎるよ。注ぐ場所へ近づこう。');
}
export function waterParcelPoint(p,t){
 const f=Math.max(0,Math.min(1,t)),q={x:p.from.x+(p.to.x-p.from.x)*f,y:p.from.y+(p.to.y-p.from.y)*f,z:p.from.z+(p.to.z-p.from.z)*f};
 q.y+=['pour','field'].includes(p.type)?35*p.duration*p.duration*f*(1-f):6*Math.sin(f*Math.PI);return q;
}
export function waterTransferPathClear(p,external,heightAt){
 if(!p||!Number.isFinite(p.duration)||p.duration<=0||p.duration>=2)return false;
 const steps=Math.max(16,Math.ceil((Math.hypot(p.to.x-p.from.x,p.to.z-p.from.z)+Math.abs(p.from.y-p.to.y))/.75));
 for(let i=0;i<=steps;i++){
  const q=waterParcelPoint(p,i/steps),h=heightAt(q.x,q.z);
  if(!Number.isFinite(h)||q.y<h-.001)return false;
  for(const b of external){if(q.y+1.1<=b.y||q.y-1.1>=b.y+b.h||b.y+b.h<=h+.05&&q.y>=h-.001)continue;const c=Math.cos(b.angle??0),sn=Math.sin(b.angle??0),x=q.x-b.x,z=q.z-b.z;
   const dx=Math.max(0,Math.abs(c*x-sn*z)-b.w/2),dz=Math.max(0,Math.abs(sn*x+c*z)-b.d/2);if(Math.hypot(dx,dz)<1.1)return false;
  }
 }
 return true;
}
export const fieldWaterPathClear=(p,external,heightAt)=>p.from.y>p.to.y+.15&&waterTransferPathClear({...p,type:'field'},external,heightAt);
