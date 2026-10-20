import {ROOM_KINDS} from './imasora-construction-room-layout-shape.mjs?v=120gn';
import {overlaps} from './imasora-construction-concrete/free-vehicle-shape.mjs';

// One compact stack contains exactly the wood reserved by the room edit.
// These are furniture components, never a resized ordinary crane floorboard.
export const ROOM_KIT_PICKUP_SECONDS = .45;
export const ROOM_KIT_ASSEMBLY_SECONDS = 2.4;
export function roomKitLayers(item) { return ROOM_KINDS[item.kind].wood / 840; }
export function roomKitBox(item, pose, heading = pose.heading ?? 0, units = roomKitLayers(item)) {
  return {x:pose.x + Math.sin(heading)*12.3, y:pose.y + 7 + units*10,
    z:pose.z + Math.cos(heading)*12.3, w:21, h:units*20, d:2, angle:heading};
}
export function roomKitHits(item, pose, heading, boxes) {
  const k = roomKitBox(item, pose, heading);
  return boxes.some(b => b.y+b.h/2 > k.y-k.h/2+.01 && b.y-b.h/2 < k.y+k.h/2-.01 &&
    overlaps({x:k.x,z:k.z,hx:k.w/2,hz:k.d/2,heading:k.angle},
      {x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,heading:b.angle??0}));
}
export function roomKitPickupBox(plan, progress) {
  const end=roomKitBox(plan.item,plan.route[plan.delivery.pickupIndex],Math.PI), t=Math.max(0,Math.min(1,progress));
  // Lift above the real table, move clear of its edge, then lower into the grip.
  return {...end,z:t<.5?192+(end.z-192)*t*2:end.z,y:t<.5?23.8:23.8+(end.y-23.8)*(t-.5)*2};
}
export function assertRoomKitRoute(plan, boxes) {
  if (!plan.delivery) return true;
  const route=plan.route, item=plan.item;
  const table={x:-188,y:12,z:170,w:80,h:3,d:50}, pickup=boxes.concat(table);
  for(let n=0;n<=80;n++) {
    const k=roomKitPickupBox(plan,n/80);
    if(pickup.some(b=>b.y+b.h/2>k.y-k.h/2+.01&&b.y-b.h/2<k.y+k.h/2-.01&&overlaps(
      {x:k.x,z:k.z,hx:k.w/2,hz:k.d/2,heading:k.angle},
      {x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,heading:b.angle??0}))) throw Error('材料を受け取る台の前をあけよう。');
  }
  boxes=pickup;
  for(let i=plan.delivery.pickupIndex+1;i<route.length;i++) {
    const a=route[i-1], b=route[i], h=b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z);
    // The set also clears each real turn, rather than teleporting through a column.
    const prev=i===plan.delivery.pickupIndex+1?a.heading:(a.travelHeading??Math.atan2(a.x-route[i-2].x,a.z-route[i-2].z));
    let delta=((h-prev+Math.PI*3)%(Math.PI*2))-Math.PI;
    for(let n=0;n<=24;n++) if(roomKitHits(item,a,prev+delta*n/24,boxes))
      throw Error('材料を持って曲がる場所をあけよう。');
    const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)*2));
    for(let n=0;n<=count;n++) if(roomKitHits(item,{x:a.x+(b.x-a.x)*n/count,y:a.y+(b.y-a.y)*n/count,z:a.z+(b.z-a.z)*n/count},h,boxes))
      throw Error('材料を運ぶ道をあけよう。');
  }
  const end=route.at(-1), from=route.at(-2)??end, h=end.travelHeading??Math.atan2(end.x-from.x,end.z-from.z);
  let delta=((plan.end.heading-h+Math.PI*3)%(Math.PI*2))-Math.PI;
  for(let n=0;n<=24;n++) if(roomKitHits(item,end,h+delta*n/24,boxes)) throw Error('材料を持って作業する場所をあけよう。');
  return true;
}
export function roomKitPhase(work, plan) {
  if(!plan?.delivery) return null;
  const t=work.job.elapsed, d=plan.delivery, start=d.pickupTime,
    assembly=work.job.walkSeconds+ROOM_KIT_PICKUP_SECONDS;
  if(t<start) return {kind:'fetch',progress:0};
  if(t<start+ROOM_KIT_PICKUP_SECONDS) return {kind:'pickup',progress:(t-start)/ROOM_KIT_PICKUP_SECONDS};
  if(t<assembly) return {kind:'carry',progress:0};
  return {kind:'assemble',progress:Math.min(1,(t-assembly)/ROOM_KIT_ASSEMBLY_SECONDS)};
}
