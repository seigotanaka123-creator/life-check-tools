import {rampItems,rampPoint,rampFrames} from './imasora-construction-reel-ramp.mjs?v=120oz';
import {contactArea,contactPolygon,vehicleReactions} from './imasora-construction-vehicle-loads.mjs?v=120oy';

// Game access follows actual geometry and the common downward load network.
// Old foot ramps remain foot ramps. No construction-tool bonus or save flag
// grants access to an unsupported floor. This is not engineering certification.
export const VEHICLE_ACCESS_REASON='ここは歩行用だよ。車には支えのある床と、骨組みのある車用の坂をつなごう。';
const EPS=.001;

function rampHeight(r,i,x,z){
 const a=rampPoint(r,i,0),b=rampPoint(r,i,1),axis=i.side==='east'||i.side==='west'?'x':'z',cross=axis==='x'?'z':'x';
 if(Math.abs((cross==='x'?x:z)-i.center)>i.width/2+.001)return null;
 const t=((axis==='x'?x:z)-a[axis])/(b[axis]-a[axis]);if(t<0||t>1)return null;
 const step=i.step??4,n=i.run/step,k=Math.min(n-1,Math.floor(t*n));
 if(i.step!==1)return rampPoint(r,i,(k+.5)/n).y;
 const lo=rampPoint(r,i,k/n).y,hi=rampPoint(r,i,(k+1)/n).y;return lo+(hi-lo)*(t*n-k);
}

export function vehicleAccessSurfaces(rooms,decks){
 const surfaces=decks.flatMap(d=>d.panels.map(p=>({id:d.id,...p,top:d.top,grounded:!!d.grounded,supported:!!d.supported,thickness:p.h??3})));
 for(const r of rooms)for(const i of rampItems(r)){
  const a=rampPoint(r,i,0),b=rampPoint(r,i,1),axis=i.side==='east'||i.side==='west';
  surfaces.push({id:'ramp-'+r.id+'/'+i.id,x:(a.x+b.x)/2,z:(a.z+b.z)/2,w:axis?i.run:i.width,d:axis?i.width:i.run,heightAt:(x,z)=>rampHeight(r,i,x,z),...(i.road?{road:{room:r,item:i,start:a,end:b,axis:axis?'x':'z'}}:{})});
 }
 return surfaces;
}

function contactState(v,surfaces,groundAt,heightAt){
 let restricted=false,level=0;
 for(const p of vehicleReactions(v)){
  const near=surfaces.filter(s=>Math.abs(s.x-p.x)<(s.w+Math.hypot(p.w,p.d))/2&&Math.abs(s.z-p.z)<(s.d+Math.hypot(p.w,p.d))/2);if(!near.length)continue;
  const polygon=contactPolygon(p);
  for(const s of near){if(contactArea(polygon,s)<=EPS)continue;
   // Clamp the query to the contacted patch, including the first wheel crossing
   // a lip. Never classify an overhead floor from XY overlap alone.
   const x=Math.max(s.x-s.w/2,Math.min(s.x+s.w/2,p.x)),z=Math.max(s.z-s.d/2,Math.min(s.z+s.d/2,p.z)),top=s.heightAt?s.heightAt(x,z):s.top;
   const earth=groundAt(x,z,v);if(!Number.isFinite(top)||!Number.isFinite(earth)||top<=earth+.15||(s.grounded&&top<=earth+s.thickness+.15))continue;
   const physical=heightAt?.(x,z,v),reference=Number.isFinite(physical)?physical:Number.isFinite(v.groundY)?v.groundY:earth;
   if(Math.abs(top-reference)>8)continue;
   // A supplied surface sample is exact (individual wheels on a slope). A
   // saved chassis is its average; the existing physical support sweep still
   // checks actual wheels, holes, roof, grade and step height independently.
   if(Number.isFinite(physical)&&Math.abs(physical-top)>.2)continue;
   level=Math.max(level,top);if(s.supported||s.road)continue;restricted=true;
  }
 }
 return{restricted,level};
}

// Old vehicles are not deleted, teleported or locked on load. The maximum
// contacted surface height, not a fitted chassis centre which can rise slightly
// at a convex lip while descending, determines retreat. They can stay,
// turn and retreat on the same/lower level without increasing their load or
// deploying new supports. Once on ordinary ground they cannot re-enter.
export function vehicleAccessProblem(before,after,{beforeSurfaces,afterSurfaces=beforeSurfaces,beforeGround=()=>0,afterGround=beforeGround,beforeHeight=null,afterHeight=beforeHeight}={}){
 if(!afterSurfaces.length)return '';
 const oldRoad=roadLoadReport(before,beforeSurfaces,beforeGround,beforeHeight),nextRoad=roadLoadReport(after,afterSurfaces,afterGround,afterHeight);
 for(const row of nextRoad.issues){const prior=oldRoad.frames.get(row.id);if(!prior||row.load-row.capacity>Math.max(0,prior.load-prior.capacity)+EPS||row.capacity<prior.capacity-EPS)return '坂の骨組みに重さが集中しているよ。車を1台ずつ通そう。';}
 const old=new Map(before.map(v=>[v.id,v]));
 for(const v of after){const next=contactState(v,afterSurfaces,afterGround,afterHeight);if(!next.restricted)continue;
  const p=old.get(v.id),prior=p?contactState(p,beforeSurfaces,beforeGround,beforeHeight):null;
  if(prior?.level>0&&next.level<=prior.level+EPS&&v.mass<=p.mass+EPS&&(v.deployed??0)<=(p.deployed??0)+EPS)continue;
  return VEHICLE_ACCESS_REASON;
 }
 return '';
}

export function roadLoadReport(fleet,surfaces,groundAt=()=>0,heightAt=null){
 const issues=[],frames=new Map();
 for(const s of surfaces.filter(s=>s.road)){
  const {room:r,item:i,start,end,axis}=s.road,stations=rampFrames(i),n=stations.length-1,rows=[];
  for(let k=0;k<=n;k++){const p=rampPoint(r,i,stations[k]/i.run),height=p.y-14-i.baseY,span=(i.width-12)/2;
   const bay=Math.max(stations[k]-(stations[k-1]??stations[k]),(stations[k+1]??stations[k])-stations[k],8),plate=2*i.width*bay*36/(bay*bay),beam=600*12*64/(span*span)*2,posts=3*144*12*Math.min(1,48/Math.max(1,height));
   rows.push({id:s.id+'/'+k,capacity:height<=1?Infinity:Math.min(plate,beam,posts),load:height<=1?0:(i.width*bay*6+i.width*12*8+3*144*height)/768});}
  for(const v of fleet)for(const p of vehicleReactions(v)){
   const overlap=contactArea(contactPolygon(p),s);if(overlap<=EPS)continue;
   const x=Math.max(s.x-s.w/2,Math.min(s.x+s.w/2,p.x)),z=Math.max(s.z-s.d/2,Math.min(s.z+s.d/2,p.z)),h=s.heightAt(x,z),physical=heightAt?.(x,z,v),reference=Number.isFinite(physical)?physical:v.groundY??groundAt(x,z,v);
   if(!Number.isFinite(h)||Math.abs(reference-h)>(Number.isFinite(physical)?.2:8))continue;
   const distance=Math.max(0,Math.min(stations[n],((axis==='x'?x:z)-start[axis])/(end[axis]-start[axis])*i.run)),index=stations.findIndex(q=>q>=distance),k=Math.max(0,Math.min(n-1,index-1)),f=Math.max(0,Math.min(1,(distance-stations[k])/(stations[k+1]-stations[k]))),mass=p.load*overlap/(p.w*p.d);
   rows[k].load+=mass*(1-f);rows[k+1].load+=mass*f;
  }
  for(const row of rows){frames.set(row.id,row);if(row.load>row.capacity+.001)issues.push({...row,excess:row.load-row.capacity});}
 }
 return{frames,issues};
}
