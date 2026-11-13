import{Mesh,CircleGeometry,MeshBasicMaterial}from'./three.module.min.js';
// Two owned render bodies at most. Build on roster changes, never per frame or
// per bubble. Character builders provide independent limb rigs and materials.
export function createHuntDecoys({create,release}){
 let source=null,slots=[],created=0,released=0;
 function destroy(row){release(row.actor);released++;}
 function prepare(next){if(next===source)return false;const pending=[];try{for(let i=0;i<2;i++){const actor=create(),materials=new Set();actor.model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});const shadow=new Mesh(new CircleGeometry(1,24),new MeshBasicMaterial({color:0x375363,transparent:true,opacity:.23,depthWrite:false}));shadow.name='hunt-decoy-shadow';shadow.rotation.x=-Math.PI/2;actor.root.add(shadow);actor.root.visible=false;pending.push({actor,shadow,base:[...materials].map(material=>({material,transparent:material.transparent,opacity:material.opacity})),ghost:null,owner:null});created++;}}catch(error){for(const row of pending)destroy(row);throw error;}for(const row of slots)destroy(row);slots=pending;source=next;return true;}
 function hide(){for(const row of slots)row.actor.root.visible=false;}
 function place(index,g,{self=false,paused=false,dt=0,groundAt=()=>0,isIce=()=>false,radius=2.7}={}){
  const row=slots[index];if(!row)return false;const a=row.actor,owner='decoy:'+g.id;if(row.owner!==owner){a.gait?.reset();a.action?.reset();row.owner=owner;}
  if(row.ghost!==self){for(const b of row.base){const m=b.material,t=self?true:b.transparent,o=self?Math.min(.55,b.opacity):b.opacity;if(m.transparent!==t){m.transparent=t;m.needsUpdate=true;}if(m.opacity!==o)m.opacity=o;}row.ghost=self;}
  row.gadget=g;a.root.visible=true;a.root.position.set(g.x,g.y,g.z);a.root.rotation.set(0,g.yaw,0);const ground=groundAt(g.x,g.z),height=Math.max(0,g.y-ground);row.shadow.position.y=ground-g.y+.035;row.shadow.scale.set(radius*.78,Math.max(.6,radius*.58),1);row.shadow.material.opacity=.23/(1+height*.18)*(self?.55:1);
  // Gait is applied temporarily by render(), so restore only after the scene
  // has been rendered, just as with the four real actors.
  row.motion={owner,grounded:g.grounded,x:g.x,z:g.z,speed:Math.hypot(g.vx,g.vz),ice:isIce(g),groundAt,frozen:paused};row.jump={owner,airborne:!g.grounded,stage:g.jumps,velocity:g.vy,height:g.y,handsFree:true};row.dt=paused?0:dt;return true;
 }
 function render(draw){function next(i){if(i===slots.length)return draw();const row=slots[i];if(!row.actor.root.visible||!row.actor.gait||!row.motion)return next(i+1);return row.actor.gait.render(row.motion,row.dt,()=>row.actor.action?row.actor.action.render(row.jump,row.dt,()=>next(i+1)):next(i+1));}return next(0);}
 function reset(){hide();for(const row of slots){row.owner=null;row.motion=null;row.actor.gait?.reset();row.actor.action?.reset();}}
 return{prepare,reset,hide,place,render,occlusionEntries:()=>slots.filter(row=>row.actor.root.visible&&row.gadget).map(row=>({actor:row.gadget,nodes:[row.actor.root]})),dispose(){for(const row of slots)destroy(row);slots=[];source=null;},stats:()=>({live:slots.length,created,released,visible:slots.filter(r=>r.actor.root.visible).length})};
}
