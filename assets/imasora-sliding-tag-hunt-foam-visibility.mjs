import{HUNT_FIELDS}from'./imasora-sliding-tag-hunt-items.mjs';
import{HUNT_CHARACTER_HEIGHT,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
import{huntHasClearSight,huntOpticalHidden}from'./imasora-sliding-tag-hunt-sight.mjs';
const active=(s,g)=>g.kind==='curtain'&&(g.until??Infinity)>s.time;
const runnerSide=actor=>actor?.owner==='player'||/^(?:decoy|echo):/.test(actor?.owner??'');
const controlledViewer=s=>s.config?.mode==='hunt'?s.hunters[0]:s.player;
const cameraPosition=camera=>camera?.position??camera;
const actorCenter=actor=>({x:actor.x,y:actor.y+HUNT_CHARACTER_HEIGHT*.55,z:actor.z});
export function huntFoamLineBlocked(s,camera,actor){
 if(!actor||!camera)return false;
 const start=cameraPosition(camera),end=actorCenter(actor);
 if(![start.x,start.y,start.z,end.x,end.y,end.z].every(Number.isFinite))return false;
 const dx=end.x-start.x,dz=end.z-start.z,dy=end.y-start.y,len=dx*dx+dz*dz;
 return(s.gadgets??[]).some(g=>{
  if(!active(s,g))return false;const ox=start.x-g.x,oz=start.z-g.z,c=ox*ox+oz*oz-g.radius*g.radius;let enter=0,exit=1;
  if(len<1e-8){if(c>=0)return false;}else{const dot=ox*dx+oz*dz,disc=dot*dot-len*c;if(disc<=0)return false;const root=Math.sqrt(disc);enter=Math.max(0,(-dot-root)/len);exit=Math.min(1,(-dot+root)/len);if(enter>=exit)return false;}
  const y0=start.y+dy*enter,y1=start.y+dy*exit;return Math.max(y0,y1)>=g.y&&Math.min(y0,y1)<=g.y+HUNT_FIELDS.curtainHeight;
 });
}
export function huntFoamViewHidden(s,camera,actor,viewer=controlledViewer(s)){
 if(!runnerSide(actor)||!viewer?.owner?.startsWith('hunter-')||huntHasClearSight(s,viewer))return false;
 return huntFoamLineBlocked(s,camera,actor);
}

// Presentation sight keeps labels and cues in sync with the body mask.
export function huntVisualActorSight(s,camera,actor,viewer=controlledViewer(s),upperBody){
 if(huntOpticalHidden(s,viewer,actor)||huntFoamViewHidden(s,camera,actor,viewer))return false;
 const from=cameraPosition(camera);
 return worldSight(from,actorCenter(actor))||Boolean(upperBody&&worldSight(from,upperBody));
}
// Per-camera mask for the runner, their shadow, and their owned props.
// The original visibility is restored even when a render pass throws.
export function withHuntFoamOcclusion(s,camera,actors,nodesFor,draw,{viewer,extraEntries=()=>[]}={}){
 if(!(s.gadgets??[]).some(g=>active(s,g)))return draw();
 const changed=[],seen=new Set(),hide=node=>{if(node?.visible&&!seen.has(node)){seen.add(node);changed.push(node);node.visible=false;}};
 try{
  actors.forEach((actor,i)=>{if(huntFoamViewHidden(s,camera,actor,viewer))for(const node of nodesFor(actor,i))hide(node);});
  for(const row of extraEntries())if(huntFoamViewHidden(s,camera,row.actor,viewer))for(const node of row.nodes)hide(node);
  return draw();
 }finally{for(const node of changed)node.visible=true;}
}
