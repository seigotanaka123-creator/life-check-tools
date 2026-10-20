import{highPlatform}from'./imasora-construction-high-build.mjs?v=120gn';
import{stairPlacement,stairRoomBound}from'./imasora-construction-stair-placement.mjs?v=120gn';
import {highFloorPieces} from './imasora-construction-high-shape.mjs?v=120gn';
import {highInnerStairs} from './imasora-construction-high-interior.mjs?v=120gn';
import {highAccessLandings,highWorkSolids} from './imasora-construction-high-work-position.mjs?v=120gn';
import {entranceDoorParts} from './imasora-construction-building-door.mjs?v=120gn';
import {ROOM_WALK_BODY} from './imasora-construction-room-walk-body.mjs?v=120fx';
const bodyBounds=(()=>{let l=Infinity,r=-Infinity,b=Infinity,t=-Infinity;for(const[,,points]of ROOM_WALK_BODY)for(const[x,z]of points){l=Math.min(l,x);r=Math.max(r,x);b=Math.min(b,z);t=Math.max(t,z);}return{cx:(l+r)/2,cz:(b+t)/2,hx:(r-l)/2,hz:(t-b)/2};})();
const cache=new Map();
export function roomWalkGeometry(w){
 const key=JSON.stringify([w.version,w.levels,w.blueprint,w.boardBayRetrofit,w.roomLayout,w.entranceDoor]);if(cache.has(key))return cache.get(key);
 const ground=stairPlacement(w)?{x:0,y:0,z:0,w:232,d:232}:{x:0,y:0,z:20,w:136,d:192},surfaces=[ground,...Array.from({length:w.levels},(_,i)=>highFloorPieces(w,i+1)).flat(),...Array.from({length:w.levels},(_,i)=>highInnerStairs(i+1,w).map(b=>({...b,y:b.y+b.h/2}))).flat(),...highAccessLandings({...w,accessVersion:1})],solids=highWorkSolids(w).concat(entranceDoorParts(w));
 if(stairPlacement(w)){const p=highPlatform(w);surfaces.push(...p.decks.filter(b=>b.y),...p.stairs);solids.push(...p.decks.filter(b=>b.y).map(b=>({...b,y:b.y-1,h:2,kind:'floor'})),...p.stairs.map(b=>({...b,y:b.y-1.25,h:2.5,kind:'stair'})),...p.posts.map(b=>({...b,y:w.blueprint.storeys.length*20,w:4,h:w.blueprint.storeys.length*40+6,d:4,kind:'scaffold-post'})));}const g={surfaces,solids};for(const a of[surfaces,solids]){a.forEach(Object.freeze);Object.freeze(a);}Object.freeze(g);if(cache.size>=64)cache.clear();cache.set(key,g);return g;
}
export const roomSurfaceAt=(g,x,z,near)=>g.surfaces.filter(b=>Math.abs(x-b.x)<=b.w/2+.0001&&Math.abs(z-b.z)<=b.d/2+.0001).map(b=>b.y).filter(y=>Math.abs(y-near)<=2.5001).sort((a,b)=>b-a)[0];
export function roomSupport(g,p,near){const c=Math.cos(p.heading),s=Math.sin(p.heading),heights=[roomSurfaceAt(g,p.x,p.z,near)];for(const foot of[-5.4936,5.4936])for(const dx of[-1.5,1.5])for(const z of[.55,3.55]){const x=foot+dx,y=roomSurfaceAt(g,p.x+c*x+s*z,p.z-s*x+c*z,near);if(y===undefined)return undefined;heights.push(y);}return Math.max(...heights.filter(y=>y!==undefined));}
const hullAxes=new WeakMap();
export function roomWalkHullHit(points,heading,dx,dz,hx,hz){
 const c=Math.cos(heading),s=Math.sin(heading);let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 for(const[x,z]of points){const a=dx+c*x+s*z,b=dz-s*x+c*z;minX=Math.min(minX,a);maxX=Math.max(maxX,a);minZ=Math.min(minZ,b);maxZ=Math.max(maxZ,b);}if(minX>=hx-.01||maxX<=-hx+.01||minZ>=hz-.01||maxZ<=-hz+.01)return false;
 let axes=hullAxes.get(points);if(!axes){axes=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],d=Math.hypot(b[1]-a[1],b[0]-a[0]);if(d<1e-8)continue;const nx=(b[1]-a[1])/d,nz=(a[0]-b[0])/d;let low=Infinity,high=-Infinity;for(const v of points){const t=v[0]*nx+v[1]*nz;low=Math.min(low,t);high=Math.max(high,t);}axes.push([nx,nz,low,high]);}if(Object.isFrozen(points))hullAxes.set(points,axes);}
 const ox=-c*dx+s*dz,oz=-s*dx-c*dz;for(const[nx,nz,low,high]of axes){const center=nx*ox+nz*oz,r=hx*Math.abs(nx*c+nz*s)+hz*Math.abs(-nx*s+nz*c);if(low>=center+r-.01||high<=center-r+.01)return false;}return true;
}
export function roomBodyClear(w,p,extra=[],geometry=roomWalkGeometry(w),stepHeight=0){
 if(!p||Object.keys(p).sort().join('|')!=='heading|x|y|z'||!Object.values(p).every(Number.isFinite)||!stairRoomBound(w,p)||p.y<0||Math.abs(p.heading)>Math.PI*8)return false;
 const boxes=geometry.solids.filter(b=>!((b.kind==='floor'||b.kind==='stair')&&b.y+b.h/2<=p.y+stepHeight+.0001)).concat(extra);
 const c=Math.cos(p.heading),n=Math.sin(p.heading),x=p.x+bodyBounds.cx*c+bodyBounds.cz*n,z=p.z-bodyBounds.cx*n+bodyBounds.cz*c,hx=bodyBounds.hx*Math.abs(c)+bodyBounds.hz*Math.abs(n),hz=bodyBounds.hx*Math.abs(n)+bodyBounds.hz*Math.abs(c);
 const near=boxes.filter(b=>{if(b.y+b.h/2<=p.y+.1||b.y-b.h/2>=p.y+32)return false;const h=b.angle??0,c=Math.abs(Math.cos(h)),n=Math.abs(Math.sin(h)),bx=b.w*c/2+b.d*n/2,bz=b.w*n/2+b.d*c/2;return Math.abs(b.x-x)<bx+hx+.01&&Math.abs(b.z-z)<bz+hz+.01;});
 return !ROOM_WALK_BODY.some(([low,high,poly])=>near.some(b=>{if(p.y+high<=b.y-b.h/2+.01||p.y+low>=b.y+b.h/2-.01)return false;const h=b.angle??0,c=Math.cos(h),s=Math.sin(h),dx=p.x-b.x,dz=p.z-b.z;return roomWalkHullHit(poly,p.heading-h,c*dx-s*dz,s*dx+c*dz,b.w/2,b.d/2);}));
}
