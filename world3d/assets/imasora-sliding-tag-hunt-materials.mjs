// Capture the character's own translucency before any gameplay effect. These
// materials belong to one cached actor; scenery and held props are untouched.
export function createHuntMaterialState(materials){
 const base=[...new Set(materials)].map(material=>({material,transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite,side:material.side}));
 let cloaked=false,cameraFade=1,writes=0,transitions=0;
 function apply(hidden){for(const row of base){const m=row.material,t=hidden||cameraFade<1?true:row.transparent,o=(hidden?Math.min(row.opacity,.32):row.opacity)*cameraFade,d=cameraFade<1?false:row.depthWrite,side=cameraFade<1?0:row.side;if(m.transparent!==t){m.transparent=t;m.needsUpdate=true;writes++;}if(m.opacity!==o){m.opacity=o;writes++;}if(m.depthWrite!==d){m.depthWrite=d;writes++;}if(m.side!==side){m.side=side;m.needsUpdate=true;writes++;}}}
 return{setCloaked(value){value=!!value;if(value===cloaked)return false;apply(value);cloaked=value;transitions++;return true;},setCameraFade(value){value=Number.isFinite(value)?Math.max(0,Math.min(1,value)):1;if(value===cameraFade)return false;cameraFade=value;apply(cloaked);return true;},reset(){cameraFade=1;apply(false);cloaked=false;},stats:()=>({materials:base.length,writes,transitions,cloaked})};
}

// A wall may safely shorten the camera arm into a body. Keep that collision
// and the player's heading; fade only the body covering the lens for this draw.
// Restore before mirrors / other views, without touching scenery or perception.
export function huntCameraBodyOpacity(actor,position){
 const radius=Number.isFinite(actor.radius)?Math.max(2,Math.min(6,actor.radius)):2.7;
 const distance=Math.hypot(position.x-actor.x,position.y-actor.y-2.7,position.z-actor.z);
 const inner=radius*1.05+3,t=Math.max(0,Math.min(1,(distance-inner)/7)),smooth=t*t*(3-2*t);
 return smooth*smooth;
}
export function withHuntCameraClearance(actors,models,position,draw){
 const changed=[];let minOpacity=1;
 try{
  for(let i=0;i<actors.length;i++){
   const m=models[i];if(!m?.root.visible)continue;
   const alpha=huntCameraBodyOpacity(actors[i],position);if(alpha>=1)continue;
   m.materialState.setCameraFade(alpha);changed.push(m);minOpacity=Math.min(minOpacity,alpha);
  }
  draw();return{fadedActors:changed.length,minOpacity};
 }finally{for(const m of changed)m.materialState.setCameraFade(1);}
}
