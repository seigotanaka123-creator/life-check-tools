import {nativeDumpSupport,nativeDumpHeightAt} from './imasora-construction-native-dump-support.mjs';

const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const poseCache=new WeakMap();
// A single orthonormal transform is used by the truck, seat, tools and hulls.
// Height is derived from certified soil; no extra mutable pose is saved.
export function nativeDumpPose(frame){
 const support=nativeDumpSupport(frame),v=frame.dump;let cache=poseCache.get(support);if(cache)return cache;
 const enabled=!!support.driveReady,sx=enabled?Math.tan(support.roll):0,sz=enabled?Math.tan(support.pitch):0;
 const xx=unit([1,sx,0]),yy=unit([-sx,1,-sz]),zz=unit(cross(xx,yy)),c=Math.cos(v.heading),s=Math.sin(v.heading),turn=a=>[c*a[0]+s*a[2],a[1],-s*a[0]+c*a[2]];
 const axes=[xx,yy,zz].map(turn);cache=Object.freeze({position:Object.freeze([v.x,enabled?support.y:0,v.z]),axes:Object.freeze(axes.map(a=>Object.freeze(a))),pitch:enabled?support.pitch:0,roll:enabled?support.roll:0,enabled});poseCache.set(support,cache);return cache;
}
export function nativeDumpPoint(frame,x,y,z){const p=nativeDumpPose(frame);return p.position.map((v,i)=>v+p.axes[0][i]*x+p.axes[1][i]*y+p.axes[2][i]*z);}
export function nativeDumpLocal(frame,point){const p=nativeDumpPose(frame),d=point.map((v,i)=>v-p.position[i]);return p.axes.map(a=>dot(a,d));}
export function nativeDumpBox(frame,centre,half,extra={}){const p=nativeDumpPose(frame);return{position:nativeDumpPoint(frame,...centre),half:[...half],heading:frame.dump.heading,...(Math.abs(p.pitch)+Math.abs(p.roll)>1e-12?{axes:p.axes}:{}),...extra};}
export function boxAxes(b){if(b.axes)return b.axes;const c=Math.cos(b.heading??0),s=Math.sin(b.heading??0);return[[c,0,-s],[0,1,0],[s,0,c]];}
export function boxExtent(b){const h=b.half??Array(3).fill(b.size/2),a=boxAxes(b);return[0,1,2].map(i=>h.reduce((n,v,j)=>n+v*Math.abs(a[j][i]),0));}
export function boxLocal(point,b){const d=point.map((v,i)=>v-b.position[i]);return boxAxes(b).map(a=>dot(a,d));}
export function boxesOverlap3D(a,b,margin=.01){
 // Voxel-to-voxel checks dominate a large unload. With both boxes aligned
 // the four horizontal SAT axes repeat X/Z; keep those exact inequalities
 // without allocating half-size, difference or axis arrays for every pair.
 if(!a.axes&&!b.axes&&(a.heading??0)===0&&(b.heading??0)===0){
  const ax=a.half!=null?a.half[0]:a.size/2,ay=a.half!=null?a.half[1]:a.size/2,az=a.half!=null?a.half[2]:a.size/2;
  const bx=b.half!=null?b.half[0]:b.size/2,by=b.half!=null?b.half[1]:b.size/2,bz=b.half!=null?b.half[2]:b.size/2;
  if(Math.abs(b.position[1]-a.position[1])>=ay+by-margin)return false;
  return Math.abs(b.position[0]-a.position[0])<ax+bx-margin&&Math.abs(b.position[2]-a.position[2])<az+bz-margin;
 }
 const ah=a.half??Array(3).fill(a.size/2),bh=b.half??Array(3).fill(b.size/2),d=b.position.map((v,i)=>v-a.position[i]);
 // Most native terrain boxes are far away and horizontal. Preserve the fast
 // four-axis test there; only tilted neighbours need the full 15-axis SAT.
 if(!a.axes&&!b.axes){
  if(Math.abs(d[1])>=ah[1]+bh[1]-margin)return false;
  // Conservative horizontal envelope: a rotation cannot extend farther
  // than the sum of its two half lengths. Separated boxes need no SAT.
  // Negative margins deliberately expand the original test; keep that path.
  const reach=ah[0]+ah[2]+bh[0]+bh[2];
  if(margin>=0&&(Math.abs(d[0])>reach+1e-9||Math.abs(d[2])>reach+1e-9))return false;
  const ac=Math.cos(a.heading??0),as=Math.sin(a.heading??0),bc=Math.cos(b.heading??0),bs=Math.sin(b.heading??0),ax=[[ac,-as],[as,ac]],bx=[[bc,-bs],[bs,bc]];
  return [...ax,...bx].every(v=>Math.abs(d[0]*v[0]+d[2]*v[1])<ah[0]*Math.abs(ax[0][0]*v[0]+ax[0][1]*v[1])+ah[2]*Math.abs(ax[1][0]*v[0]+ax[1][1]*v[1])+bh[0]*Math.abs(bx[0][0]*v[0]+bx[0][1]*v[1])+bh[2]*Math.abs(bx[1][0]*v[0]+bx[1][1]*v[1])-margin);
 }
 const aa=boxAxes(a),ba=boxAxes(b),separated=v=>Math.abs(dot(d,v))>=ah.reduce((n,h,i)=>n+h*Math.abs(dot(aa[i],v)),0)+bh.reduce((n,h,i)=>n+h*Math.abs(dot(ba[i],v)),0)-margin;
 // Use the full projected extents, including pitch/roll, only to reject
 // distant boxes. All neighbours retain the original 15-axis narrow test.
 if(margin>=0)for(let i=0;i<3;i++){
  const extent=ah[0]*Math.abs(aa[0][i])+ah[1]*Math.abs(aa[1][i])+ah[2]*Math.abs(aa[2][i])+bh[0]*Math.abs(ba[0][i])+bh[1]*Math.abs(ba[1][i])+bh[2]*Math.abs(ba[2][i]);
  if(Math.abs(d[i])>extent+1e-9)return false;
 }
 // Ground below a tilted chassis separates along its up axis. Check that
 // before allocating cross axes; every exact SAT axis remains in the test.
 for(const axis of[aa[1],ba[1],aa[0],aa[2],ba[0],ba[2]])if(separated(axis))return false;
 for(const x of aa)for(const y of ba){const axis=cross(x,y),len=Math.hypot(...axis);if(len>1e-10&&separated(axis.map(n=>n/len)))return false;}
 return true;
}
// A vertical suspension offset lets each round tyre meet the highest step
// within its contact patch without lowering any part through native soil.
export function nativeDumpWheelOffsets(frame){const p=nativeDumpPose(frame),support=nativeDumpSupport(frame);if(!p.enabled)return[0,0,0,0];const radius=8.65*Math.sqrt(Math.max(0,1-p.axes[0][1]**2))+4.5*Math.abs(p.axes[0][1])+.25;return support.wheels.map(w=>{const centre=nativeDumpPoint(frame,w.x,8.9,w.z);return(w.max+radius-centre[1])/p.axes[1][1];});}
export function nativeDumpDoorPoint(frame,side){const p=nativeDumpPoint(frame,side*52,0,18),h=nativeDumpHeightAt(frame,p[0],p[2]);return Number.isFinite(h)&&Math.abs(h-p[1])<=2.01?[p[0],h,p[2]]:null;}
