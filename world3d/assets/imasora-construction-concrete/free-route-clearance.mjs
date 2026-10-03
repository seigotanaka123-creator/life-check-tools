// Continuous 2D clearance for the complete displacement, independent of frame dt.
// EPS only absorbs roundoff at an exact tangent; it is not a gameplay clearance.
import {SUPPLY_HOSE_RADIUS,HOSE_CLEARANCE} from './free-hose-shape.mjs';
export const ROUTE_EPS=1e-7;
export const clearanceBlocked=(distance,radius)=>!Number.isFinite(distance)||!Number.isFinite(radius)||radius<0||distance<radius-ROUTE_EPS;
const pointSegment=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
function local(p,o){const c=Math.cos(o.heading??0),s=Math.sin(o.heading??0),dx=p.x-o.x,dz=p.z-o.z;return{x:c*dx-s*dz,z:s*dx+c*dz};}
export function pointBoxDistance(p,o){const q=local(p,o);return Math.hypot(Math.max(0,Math.abs(q.x)-o.hx),Math.max(0,Math.abs(q.z)-o.hz));}
export function segmentBoxDistance(from,to,o){
 const a=local(from,o),b=local(to,o);let lo=0,hi=1;
 for(const [axis,half]of [['x',o.hx],['z',o.hz]]){const d=b[axis]-a[axis];if(Math.abs(d)<1e-12){if(Math.abs(a[axis])>half){hi=-1;break;}}else{const u=(-half-a[axis])/d,v=(half-a[axis])/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));}}
 if(lo<=hi)return 0;
 const rect=p=>Math.hypot(Math.max(0,Math.abs(p.x)-o.hx),Math.max(0,Math.abs(p.z)-o.hz));let distance=Math.min(rect(a),rect(b));
 for(const x of [-o.hx,o.hx])for(const z of [-o.hz,o.hz])distance=Math.min(distance,pointSegment({x,z},a,b));return distance;
}
export function segmentSegmentDistance(a,b,c,d){
 const u={x:b.x-a.x,z:b.z-a.z},v={x:d.x-c.x,z:d.z-c.z},w={x:c.x-a.x,z:c.z-a.z},cross=(p,q)=>p.x*q.z-p.z*q.x,den=cross(u,v);
 if(Math.abs(den)>1e-12){const t=cross(w,v)/den,s=cross(w,u)/den;if(t>=0&&t<=1&&s>=0&&s<=1)return 0;}
 return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
export function hoseSegmentBlocked(path,a,b,radius){for(let i=1;i<path.length;i++)if(clearanceBlocked(segmentSegmentDistance(a,b,path[i-1],path[i]),radius+SUPPLY_HOSE_RADIUS+HOSE_CLEARANCE))return true;return false;}
export function externalSegmentBlocked(location,a,b,radius,external){
 const length=Math.hypot(b.x-a.x,b.z-a.z);if(external(location.x+a.x,location.z+a.z,radius-ROUTE_EPS)||external(location.x+b.x,location.z+b.z,radius-ROUTE_EPS))return true;
 // Inflated probes cover complete intervals. An overlap of the inflated probe
 // alone may be beside the path: subdivide it instead of treating it as a hit.
 // The callback must describe an occupied radius neighbourhood. Budget exhaustion
 // fails closed; neither planning nor runtime can start an unbounded search.
 const n=Math.max(1,Math.ceil(length/2));let budget=n+256;
 const query=(t,r)=>external(location.x+a.x+(b.x-a.x)*t,location.z+a.z+(b.z-a.z)*t,r);
 for(let i=0;i<n;i++){
  const stack=[{lo:i/n,hi:(i+1)/n,depth:0}];
  while(stack.length){if(--budget<0)return true;const q=stack.pop(),t=(q.lo+q.hi)/2,guard=radius+length*(q.hi-q.lo)/2-ROUTE_EPS;
   if(!query(t,guard))continue;if(query(t,radius-ROUTE_EPS)||q.depth>=32)return true;
   stack.push({lo:q.lo,hi:t,depth:q.depth+1},{lo:t,hi:q.hi,depth:q.depth+1});
  }
 }return false;
}
