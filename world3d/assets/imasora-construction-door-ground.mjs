import {doorSpatialIndex} from './imasora-construction-door-spatial.mjs?v=120eq';

// Broad phase for floors, with rotated bounds; the final test is still the
// world's exact surface test. No building roof is invented from its mesh box.
export function createDoorSurfaceReader({groundAt,surfaces,containsPoint,referenceHeight=()=>0,atRoot=()=>false,rampAt=()=>null}){
 const items=surfaces.map(surface=>{const c=Math.abs(Math.cos(surface.rotation??0)),s=Math.abs(Math.sin(surface.rotation??0));return{...surface,surface,halfX:c*surface.halfX+s*surface.halfZ,halfZ:s*surface.halfX+c*surface.halfZ};});
 const nearby=doorSpatialIndex(items,.03);
 return(x,z)=>{
  const ground=groundAt(x,z),heights=ground===null?[]:[ground??0];
  for(const {surface:f}of nearby({x,z}))if(f.physicsSource!=='ufo-opening-ramp'&&f.physicsSource!=='ufo-interior-entry'&&containsPoint(x,z,f))heights.push(f.height);
  const ramp=rampAt(x,z);if(Number.isFinite(ramp))heights.push(ramp);
  const candidates=[...new Set(heights.filter(Number.isFinite))].sort((a,b)=>a-b),reference=referenceHeight();
  if(atRoot(x,z)){if(Number.isFinite(ramp)&&ramp>reference+.24)return ramp;const same=candidates.find(y=>Math.abs(y-reference)<=.24);if(same!==undefined)return same;}
  return candidates.find(y=>y>reference+.24)??candidates.filter(y=>y<=reference+.24).at(-1)??null;
 };
}

// A route and the actual walker use the same measured support. This only
// authorises small steps on a gentle earth grade, never a jump or a new floor.
export function createDoorGroundProbe({heightAt,blockedAt=()=>false,contains=()=>true}){
 const heights=new Map(),places=new Map(),key=(x,z)=>x.toFixed(5)+','+z.toFixed(5);
 const height=(x,z)=>{const k=key(x,z);if(!heights.has(k)){if(heights.size>=120000)heights.clear();heights.set(k,heightAt(x,z));}return heights.get(k);};
 const support=p=>{
  if(!p||![p.x,p.z].every(Number.isFinite)||!contains(p))return null;
  const k=key(p.x,p.z);if(places.has(k))return places.get(k);
  const y=height(p.x,p.z);let valid=Number.isFinite(y);
  // A real patch beneath the feet, including small holes between cardinal
  // probes. A two-unit soil cell must not become a floor by interpolation.
  if(valid)for(let dx=-6;dx<=6&&valid;dx+=2)for(let dz=-6;dz<=6;dz+=2){
   if(dx*dx+dz*dz>36)continue;
   const q={x:p.x+dx,z:p.z+dz},h=height(q.x,q.z);
   if(!contains(q)||!Number.isFinite(h)||Math.abs(h-y)>2.1){valid=false;break;}
  }
  const result=valid?y:null;if(places.size>=120000)places.clear();places.set(k,result);return result;
 };
 const stand=p=>{const y=support(p);return y!==null&&!blockedAt(p,y);};
 function step(a,b,{contact=true}={}){
  if(!a||!b||![a.x,a.z,b.x,b.z].every(Number.isFinite))return false;
  const distance=Math.hypot(b.x-a.x,b.z-a.z),heading=b.heading??Math.atan2(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(distance/2));
  let last=support(a);if(last===null)return false;
  // Turning toward the next segment can widen the real body's footprint.
  // Check that orientation at the departure point too: sampling only after
  // travelling up to two units let the planner approve a turn that the first,
  // shorter animation step correctly refused beside a vehicle.
  if(contact&&blockedAt({...a,heading},last))return false;
  for(let i=1;i<=n;i++){
   const p={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n,heading},h=support(p);
   if(h===null||Math.abs(h-last)>2.1||contact&&blockedAt(p,h))return false;
   if(distance>1e-6){
    const ux=(b.x-a.x)/distance,uz=(b.z-a.z)/distance;
    const lo=height(p.x-ux*12,p.z-uz*12),hi=height(p.x+ux*12,p.z+uz*12);
    // Quantised soil has two-unit risers. Check its surrounding grade too,
    // rather than approving a steep staircase one small riser at a time.
    if(!Number.isFinite(lo)||!Number.isFinite(hi)||Math.abs(hi-lo)>24*Math.tan(Math.PI/15)+2.1)return false;
   }
   last=h;
  }
  return true;
 }
 return{stand,step,support,reset(){heights.clear();places.clear();}};
}
