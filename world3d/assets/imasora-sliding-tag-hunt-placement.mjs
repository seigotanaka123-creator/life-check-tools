import{findHuntZipAnchor}from'./imasora-sliding-tag-hunt-zip.mjs';
import{worldHeight,worldValid,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
import{trampolineSurface,trampolineClear}from'./imasora-sliding-tag-hunt-trampoline.mjs';
import{HOOK_POLES,HUNT_FIELDS}from'./imasora-sliding-tag-hunt-items.mjs';
import{usesEscapeBalanceRestore,LEDGE_PURSUIT_RULES,usesRaisedApproaches}from'./imasora-sliding-tag-hunt-contact-rules.mjs';
const radii=Object.freeze({cushion:3,curtain:HUNT_FIELDS.curtainRadius,sheet:HUNT_FIELDS.sheetRadius,fan:HUNT_FIELDS.fanRadius});
export function huntGadgetRadius(type,a){return type==='clone'?a.radius:radii[type]??null;}
// The same physical footprint is used by human placement and CPU planning.
export function huntGadgetPlacement(s,a,type,yaw=a.yaw){
 const radius=huntGadgetRadius(type,a);
 if(radius===null||s.gadgets.length>=12)return null;
 const rearFan=type==='fan'&&usesRaisedApproaches(s.rules);
 const direction=type==='cushion'||rearFan?yaw+Math.PI:yaw;
 const footprint=['curtain','sheet'].includes(type)?2:radius;
 const distance=a.radius+Math.min(radius,9)+1.5;
 function placeAt(offset,angle=direction){
  const p={x:a.x+Math.sin(angle)*offset,z:a.z+Math.cos(angle)*offset};
  p.y=trampolineSurface(s,p.x,p.z);
  if(type==='fan'&&[s.player,...s.hunters??[]].filter(Boolean).some(b=>
   Math.hypot(b.x-p.x,b.z-p.z)<b.radius+radius&&b.y<p.y+HUNT_FIELDS.fanHeight&&b.y+5.4>p.y))return null;
  return worldValid(p,footprint+.15)&&trampolineClear(s,p,footprint+.15)&&Math.abs(p.y-a.y)<=3?{...p,radius}:null;
 }
 const playerFan=type==='fan'&&s.config?.mode==='escape'&&a===s.player;
 if(rearFan||playerFan&&usesEscapeBalanceRestore(s.rules)){
  const gap=6,fanDistance=a.radius+radius+gap;
  const start={x:a.x,y:a.y+2.5,z:a.z};
  // Try accessible positions to either side if the aimed spot is obstructed.
  const angles=rearFan?[0,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3]:[0,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2];
  for(const angle of angles){
   const point=placeAt(fanDistance,direction+angle);
   if(point&&worldSight(start,{x:point.x,y:point.y+2.5,z:point.z},.15))return rearFan?{...point,yaw:direction}:point;
  }
  return null;
 }
 const original=placeAt(distance);
 if(playerFan&&s.rules===LEDGE_PURSUIT_RULES&&original)return placeAt(distance+1)??original;
 return original;
}
export function huntHookAnchor(a,s,allowed){return findHuntZipAnchor(a,s,allowed);}

// Never put ink under the user or another hunter. Try nearby forward angles;
// a blocked floor fails without consumption, rather than falling back to feet.
