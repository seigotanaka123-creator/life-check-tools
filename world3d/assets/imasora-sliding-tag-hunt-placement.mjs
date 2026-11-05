import{findHuntZipAnchor}from'./imasora-sliding-tag-hunt-zip.mjs';
import{worldHeight,worldValid,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
import{trampolineSurface,trampolineClear}from'./imasora-sliding-tag-hunt-trampoline.mjs';
import{HOOK_POLES,HUNT_FIELDS}from'./imasora-sliding-tag-hunt-items.mjs';
const radii=Object.freeze({cushion:3,curtain:HUNT_FIELDS.curtainRadius,sheet:HUNT_FIELDS.sheetRadius,fan:HUNT_FIELDS.fanRadius});
export function huntGadgetRadius(type,a){return type==='clone'?a.radius:radii[type]??null;}
// The same physical footprint is used by human placement and CPU planning.
export function huntGadgetPlacement(s,a,type,yaw=a.yaw){const radius=huntGadgetRadius(type,a);if(radius===null||s.gadgets.length>=12)return null;const direction=type==='cushion'?yaw+Math.PI:yaw,footprint=['curtain','sheet'].includes(type)?2:radius,distance=a.radius+Math.min(radius,9)+1.5,p={x:a.x+Math.sin(direction)*distance,z:a.z+Math.cos(direction)*distance};p.y=trampolineSurface(s,p.x,p.z);if(type==='fan'&&[s.player,...s.hunters??[]].filter(Boolean).some(b=>Math.hypot(b.x-p.x,b.z-p.z)<b.radius+radius&&b.y<p.y+HUNT_FIELDS.fanHeight&&b.y+5.4>p.y))return null;return worldValid(p,footprint+.15)&&trampolineClear(s,p,footprint+.15)&&Math.abs(p.y-a.y)<=3?{...p,radius}:null;}
export function huntHookAnchor(a,s,allowed){return findHuntZipAnchor(a,s,allowed);}

// Never put ink under the user or another hunter. Try nearby forward angles;
// a blocked floor fails without consumption, rather than falling back to feet.
