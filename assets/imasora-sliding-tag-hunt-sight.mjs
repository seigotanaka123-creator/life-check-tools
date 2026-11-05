import{HUNT_FIELDS,ITEM_DEFS}from'./imasora-sliding-tag-hunt-items.mjs';
import{worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
export function huntHasClearSight(s,a){return(a?.effects?.sunglasses??0)>s.time;}
export function huntOpticalHidden(s,viewer,a){return a?.owner!==viewer?.owner&&(a?.effects?.cloak??0)>s.time&&!huntHasClearSight(s,viewer);}
export function huntCanObserve(s,a,b,range=140){
 if(huntOpticalHidden(s,a,b)||Math.hypot(a.x-b.x,a.z-b.z)>=range)return false;
 const start={...a,y:a.y+3},end={...b,y:b.y+3};if(!worldSight(start,end))return false;if(huntHasClearSight(s,a))return true;
 const dx=end.x-start.x,dz=end.z-start.z,dy=end.y-start.y,len=dx*dx+dz*dz;
 return!(s.gadgets??[]).some(g=>{
  if(g.kind!=='curtain')return false;const ox=start.x-g.x,oz=start.z-g.z,c=ox*ox+oz*oz-g.radius*g.radius;let enter=0,exit=1;
  if(len<1e-8){if(c>=0)return false;}else{const dot=ox*dx+oz*dz,disc=dot*dot-len*c;if(disc<=0)return false;const root=Math.sqrt(disc);enter=Math.max(0,(-dot-root)/len);exit=Math.min(1,(-dot+root)/len);if(enter>=exit)return false;}
  // Test the whole volume, including a target inside its near edge, but not
  // foam above/below the actual sight line. Only lenses bypass this volume.
  const y0=start.y+dy*enter,y1=start.y+dy*exit;return Math.max(y0,y1)>=g.y&&Math.min(y0,y1)<=g.y+HUNT_FIELDS.curtainHeight;
 });
}
export function huntPermanentToolUseful(s,a,type){
 if(type==='mirror')return a===s.player&&s.config?.mode!=='hunt'&&(a.effects?.mirror??0)<=s.time;
 if(type==='radar')return (a.effects?.radar??0)<=s.time;
 return !!ITEM_DEFS[type]&&(type==='sunglasses'?!huntHasClearSight(s,a):type==='ink'?!((s.inkUntil??0)>s.time):true);}
