import{huntFanExposure}from'./imasora-sliding-tag-hunt-fan.mjs';
import{movingItemContactRadius}from'./imasora-sliding-tag-hunt-contact.mjs';
// A short prediction, not an enlarged collision volume. Height and spherical
// caps are shared with actual impacts; visible bodies retain their real speed.
export function incomingHuntImpact(a,g,now){
 if(g.kind==='fan')return huntFanExposure(a,g,now)>0;
 if(!['cushion'].includes(g.kind)||g.attached||g.owner===a.owner||(g.until??Infinity)<=now||g.ignore===a.owner&&now<(g.ignoreUntil??0))return false;
 const dx=g.x-a.x,dz=g.z-a.z,d2=dx*dx+dz*dz;if(d2>=23*23)return false;
 const radius=movingItemContactRadius(a,g);if(radius<0)return false;
 const remaining=(g.until??Infinity)-now,c=d2-radius*radius;if(c<=0)return true;
 const vx=(g.vx??0)-(a.vx??0),vz=(g.vz??0)-(a.vz??0),speed2=vx*vx+vz*vz,b=dx*vx+dz*vz;if(speed2<1e-6||b>=0)return false;
 const discriminant=b*b-speed2*c;if(discriminant<0)return false;
 const entry=(-b-Math.sqrt(discriminant))/speed2;return entry>=0&&entry<=.8&&entry<remaining;
}
