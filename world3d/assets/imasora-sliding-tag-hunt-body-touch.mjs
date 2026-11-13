import{HUNT_TOUCH_SHAPES}from'./imasora-sliding-tag-hunt-touch-shapes.mjs';
import{usesRenderedContact}from'./imasora-sliding-tag-hunt-contact-rules.mjs';
import{HUNT_RENDERED_TOUCH_UPDATES}from'./imasora-sliding-tag-hunt-rendered-touch-shapes.mjs';
import{trampolineSurface}from'./imasora-sliding-tag-hunt-trampoline.mjs';
import{worldHeight,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntDiveTilt,huntTerrainTilt}from'./imasora-sliding-tag-hunt-dive.mjs';
export const DEFAULT_TOUCH_SHAPE='white-michi-road-saber-ren';
export function huntTouchShapeKey(companion){return companion?['seed','sprout','young'].includes(companion.stage)?'companion-'+companion.stage:companion.artId:DEFAULT_TOUCH_SHAPE;}
export function validHuntTouchShape(key){return typeof key==='string'&&Object.hasOwn(HUNT_TOUCH_SHAPES,key);}
const cache=new WeakMap();
const xyzPairs=[[0,0],[0,1],[0,2],[1,1],[1,2],[2,2]];
function rotate([x,y,z],yaw,pitch,roll){
 if(roll){const c=Math.cos(roll),s=Math.sin(roll);[x,y]=[x*c-y*s,x*s+y*c];}
 const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const py=y*cp-z*sp,pz=y*sp+z*cp;
 return [x*cy+pz*sy,py,-x*sy+pz*cy];
}
// A conservative solid-body proxy, not the broad navigation/cape/hand radius.
// The air sphere is inside the rotating body at every flip angle; no enlarged
// upright catch volume remains around an airborne or somersaulting monster.
export function huntSolidBody(a,match){
 if(!a||![a.x,a.y,a.z,a.yaw??0].every(Number.isFinite))return null;
 const key=a.contactKey??(validHuntTouchShape(a.id)?a.id:DEFAULT_TOUCH_SHAPE);
 const rendered=usesRenderedContact(match?.rules);
 const b=(rendered?HUNT_RENDERED_TOUCH_UPDATES[key]:undefined)??HUNT_TOUCH_SHAPES[key];
 if(!b)return null;
 const speed=Math.hypot(a.vx??0,a.vz??0),dive=!!a.dive&&Number.isFinite(a.dive.age);
 const pose=dive?a.dive.age:a.grounded?Math.min(.07,speed*.0035)*.5:-1;
 const trampoline=rendered&&dive?match.trampoline:null;
 const signature=[a.x,a.y,a.z,a.yaw??0,pose,key,rendered,trampoline,trampoline?.used,a.grounded];
 const old=cache.get(a);
 if(old&&signature.every((n,i)=>n===old.signature[i]))return old.body;
 let pitch=0,roll=0,position=[a.x,a.y,a.z],centre=b.c,axes;
 if(dive){
  const angle=huntDiveTilt(a.dive),sine=Math.sin(angle),pivot=2.7,back=-pivot*sine;
  const terrain=rendered?huntTerrainTilt(a):null;
  pitch=angle+(terrain?.pitch??0);roll=terrain?.roll??0;
  position=[a.x+Math.sin(a.yaw)*back,a.y+(b.diveLift-pivot)*sine*sine+pivot*(1-Math.cos(angle)),a.z+Math.cos(a.yaw)*back];
  let correction=0;
  for(const x of[b.bounds[0],b.bounds[3]])for(const y of[b.bounds[1],b.bounds[4]])for(const z of[b.bounds[2],b.bounds[5]]){
   const p=rotate([x,y,z],a.yaw,pitch,roll),floorX=position[0]+p[0],floorZ=position[2]+p[2];
   const floor=rendered?trampolineSurface(match,floorX,floorZ):worldHeight(floorX,floorZ);
   correction=Math.max(correction,floor+.03-position[1]-p[1]);
  }
  position[1]+=correction;
  axes=b.axes.map(v=>Math.max(.08,v-.04));
 }else if(!a.grounded){axes=[b.inner-.06,b.inner-.06,b.inner-.06];}
 else{pitch=pose;centre=[b.c[0],b.c[1]-b.originY,b.c[2]];position[1]+=b.originY-.03;axes=b.axes.map(v=>Math.max(.08,v-.24));}
 const u=rotate([1,0,0],a.yaw??0,pitch,roll),v=rotate([0,1,0],a.yaw??0,pitch,roll),w=rotate([0,0,1],a.yaw??0,pitch,roll);
 function solid(centre,axes){
  const c=rotate(centre,a.yaw??0,pitch,roll).map((value,i)=>value+position[i]);
  const q=xyzPairs.map(([i,j])=>axes[0]**2*u[i]*u[j]+axes[1]**2*v[i]*v[j]+axes[2]**2*w[i]*w[j]);
  return {c,q,axes};
 }
 const body={...solid(centre,axes),key};
 if(dive)body.diveParts=[b.head,...b.hands].map(part=>solid(part.c,part.axes));cache.set(a,{signature,body});return body;
}
function potential(a,b,d,t){const c=a.map((v,i)=>v+(b[i]-v)*t),[xx,xy,xz,yy,yz,zz]=c,aa=yy*zz-yz*yz,bb=xz*yz-xy*zz,cc=xy*yz-xz*yy,dd=xx*zz-xz*xz,ee=xy*xz-xx*yz,ff=xx*yy-xy*xy,det=xx*aa+xy*bb+xz*cc;if(!(det>0))return{f:Infinity,slope:0};const x=(aa*d[0]+bb*d[1]+cc*d[2])/det,y=(bb*d[0]+dd*d[1]+ee*d[2])/det,z=(cc*d[0]+ee*d[1]+ff*d[2])/det,g=d[0]*x+d[1]*y+d[2]*z,delta=b.map((v,i)=>v-a[i]),h=delta[0]*x*x+2*delta[1]*x*y+2*delta[2]*x*z+delta[3]*y*y+2*delta[4]*y*z+delta[5]*z*z,k=t*(1-t);return{f:k*g,slope:(1-2*t)*g-k*h};}
// Perram–Wertheim ellipsoid contact potential. A concavity upper bound is
// required for overlap, so an unfinished search cannot manufacture a touch.
export function solidBodiesOverlap(a,b){if(!a||!b)return false;const d=a.c.map((v,i)=>b.c[i]-v);for(const[i,j]of[[0,0],[1,3],[2,5]])if(Math.abs(d[i])>=Math.sqrt(a.q[j])+Math.sqrt(b.q[j]))return false;
 let lo=0,hi=1,left=potential(a.q,b.q,d,0),right=potential(a.q,b.q,d,1);for(let i=0;i<22;i++){const mid=(lo+hi)/2,p=potential(a.q,b.q,d,mid);if(p.f>=.99999)return false;if(p.slope>0){lo=mid;left=p;}else{hi=mid;right=p;}}
 const upper=Math.min(left.f+Math.max(0,left.slope)*(hi-lo),right.f+Math.max(0,-right.slope)*(hi-lo));return upper<.99999;
}
function contact(a,b){
 return solidBodiesOverlap(a,b)&&worldSight({x:a.c[0],y:a.c[1],z:a.c[2]},{x:b.c[0],y:b.c[1],z:b.c[2]},.01);
}
export function huntBodiesTouch(a,b,match){
 if(!a||!b||Math.abs(a.x-b.x)>20||Math.abs(a.z-b.z)>20)return false;
 const x=huntSolidBody(a,match),y=huntSolidBody(b,match);
 if(contact(x,y))return true;
 // Only the diving actor gets extra contact shapes, all in the actual pose.
 return !!(x?.diveParts?.some(part=>contact(part,y))||y?.diveParts?.some(part=>contact(x,part)));
}
