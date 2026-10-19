// Presentation only. No save, position, collision or inventory mutations.
export function nameTargetDistance(actor, target) {
 const dx=actor.x-target.x,dz=actor.z-target.z,c=Math.cos(target.heading||0),s=Math.sin(target.heading||0);
 const x=c*dx-s*dz,z=s*dx+c*dz;
 const dy=Math.max(0,(target.minY??target.y??0)-(actor.y+24),actor.y-(target.maxY??target.y??0)-12);
 return Math.hypot(Math.max(0,Math.abs(x)-(target.hx||0)),Math.max(0,Math.abs(z)-(target.hz||0)),dy);
}
export function createNearbyNames({duration=3000,enter=48,leave=96}={}) {
 if(!(duration>0&&enter>=0&&leave>enter))throw Error('Invalid nearby-name settings');
 let map=null,active=null;const shown=new Set();
 return {update({map:key,actor,targets,now,enabled=true}) {
  if(map!==key){map=key;shown.clear();active=null;}
  const candidates=targets.filter(t=>t.id&&t.name&&[t.x,t.z].every(Number.isFinite)).map(t=>{const reach=Number.isFinite(t.enterDistance)?Math.max(enter,t.enterDistance):enter;return {...t,distance:nameTargetDistance(actor,t),enterDistance:reach,leaveDistance:reach+leave-enter};});
  for(const t of candidates)if(t.distance>t.leaveDistance)shown.delete(t.id);
  const current=active&&candidates.find(t=>t.id===active.id);
  if(active&&(!current||current.distance>current.leaveDistance||now>=active.until))active=null;
  if(!enabled)return null;
  if(!active){const next=candidates.filter(t=>t.displayable!==false&&t.distance<=t.enterDistance&&!shown.has(t.id)).sort((a,b)=>a.distance-b.distance||String(a.id).localeCompare(String(b.id)))[0];if(next){shown.add(next.id);active={id:next.id,until:now+duration};}}
  return active?{...candidates.find(t=>t.id===active.id),until:active.until}:null;
 },get shown(){return [...shown];}};
}
