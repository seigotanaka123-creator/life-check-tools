// Shared visible chassis geometry. This module has no state or rendering dependencies.
export const VEHICLE_CONTACT={halfX:42,halfZ:44,radius:61,step:.5,clearance:.3,groundTolerance:.12};
export const VEHICLE_PADS=Object.freeze([-35,35].flatMap(x=>[-20,20].map(z=>Object.freeze({x,z}))));
export const headingDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
// Reverse out of an obstruction without sweeping the cab through it in a U-turn.
export function vehicleTravelHeading(v,dx,dz){const heading=Math.atan2(dx,dz);return Math.abs(headingDelta(v.heading,heading))>=Math.PI*11/12?v.heading:heading;}
export function vehicleContactPoint(v,p){const c=Math.cos(v.heading),s=Math.sin(v.heading);return{x:v.x+c*p.x+s*p.z,z:v.z-s*p.x+c*p.z};}
export function vehiclePoseAt(from,to,t){return{x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t,heading:from.heading+headingDelta(from.heading,to.heading)*t,legs:to.legs};}
export function vehicleSweepSteps(from,to){return Math.max(1,Math.ceil((Math.hypot(to.x-from.x,to.z-from.z)+Math.abs(headingDelta(from.heading,to.heading))*VEHICLE_CONTACT.radius)/VEHICLE_CONTACT.step));}
const rect=(v,hx,hz)=>({...v,hx,hz});
export function vehicleFootprints(v,ground=null){
 const parts=[{x:0,z:0,hx:33,hz:43.5},{x:0,z:-40,hx:12,hz:8},...[-37,37].map(x=>({x,z:21,hx:5,hz:6}))];
 if(v.legs){for(const p of VEHICLE_PADS)parts.push({...p,hx:4.5,hz:4.5});for(const z of [-20,20])parts.push({x:0,z,hx:35,hz:1.5});}
 return parts.map(p=>rect({...vehicleContactPoint(v,p),heading:v.heading},p.hx+(ground?.padX??0),p.hz+(ground?.padZ??0)));
}
export function overlaps(a,b){
 const axes=[a.heading,b.heading].flatMap(h=>[{x:Math.cos(h),z:-Math.sin(h)},{x:Math.sin(h),z:Math.cos(h)}]);
 const span=(r,n)=>r.hx*Math.abs(n.x*Math.cos(r.heading)-n.z*Math.sin(r.heading))+r.hz*Math.abs(n.x*Math.sin(r.heading)+n.z*Math.cos(r.heading));
 return axes.every(n=>Math.abs((a.x-b.x)*n.x+(a.z-b.z)*n.z)<span(a,n)+span(b,n)+VEHICLE_CONTACT.clearance);
}

// Compare the full oriented chassis at every swept pose, including rotation-only moves.
// The 0.3 clearance covers the nearest sample's <=0.25 travel along the 0.5 sweep.
export function foundationVehicleSweepBlocked(foundation,location,from,to){
 if(!foundation)return false;
 const radius=VEHICLE_CONTACT.radius+VEHICLE_CONTACT.clearance;
 const minX=Math.min(from.x,to.x)-radius,maxX=Math.max(from.x,to.x)+radius,minZ=Math.min(from.z,to.z)-radius,maxZ=Math.max(from.z,to.z)+radius;
 const tiles=Array.from({length:16},(_,i)=>i).filter(i=>foundation.mask&(1<<i)).map(i=>({x:foundation.x-location.x+(i%4-1.5)*16,z:foundation.z-location.z+(Math.floor(i/4)-1.5)*16,heading:0,hx:8.3,hz:8.3})).filter(t=>t.x+t.hx>=minX&&t.x-t.hx<=maxX&&t.z+t.hz>=minZ&&t.z-t.hz<=maxZ);
 // This bound encloses every rotated chassis part, so far-away history replay
 // avoids the detailed sweep without skipping collisions between the endpoints.
 if(!tiles.length)return false;
 const steps=vehicleSweepSteps(from,to);
 for(let i=0;i<=steps;i++)if(vehicleFootprints(vehiclePoseAt(from,to,i/steps)).some(body=>tiles.some(tile=>overlaps(body,tile))))return true;
 return false;
}
