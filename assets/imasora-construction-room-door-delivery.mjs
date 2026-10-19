import {ROOM_KINDS,roomItemParts} from './imasora-construction-room-layout-shape.mjs';
import {highFloorPieces} from './imasora-construction-high-shape.mjs';
import {highWorkSolids,highWorkBodyHits} from './imasora-construction-high-work-position.mjs';
import {overlaps} from './imasora-construction-concrete/free-vehicle-shape.mjs';
import {upperSegmentHitsBox} from './imasora-construction-high-casting.mjs?v=120fw';
import {assertRoomKitRoute,roomKitPhase,roomKitBox,ROOM_KIT_PICKUP_SECONDS} from './imasora-construction-room-kit.mjs?v=120fw';

const fail=message=>{throw Error(message);},p=(x,y,z,heading=0)=>({x,y,z,heading});
export const ROOM_DOOR_UNLOAD_SECONDS=.8;
export const ROOM_DOOR_ASSEMBLY_SECONDS=3.2;
export const roomDoorDelivery=plan=>plan?.delivery?.version===2;
const travel=(a,b)=>b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z);
const dist=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
const boxHit=(a,b)=>a.y+a.h/2>b.y-b.h/2+.01&&a.y-a.h/2<b.y+b.h/2-.01&&overlaps(
  {x:a.x,z:a.z,hx:a.w/2,hz:a.d/2,heading:a.angle??0},
  {x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,heading:b.angle??0});
export function roomDoorDepotBox(plan,index){const d=plan.delivery.depot;return {...d,y:d.y+1+index*2,w:21,h:2,d:20};}
export function roomDoorPickupBox(plan,index,progress){
  const stop=plan.delivery.stops.find(s=>s.kind==='pickup'&&s.trip===index),end=roomKitBox(plan.item,plan.route[stop.index],Math.PI,1),t=Math.max(0,Math.min(1,progress)),z=192-index*3;
  return {...end,z:t<.5?z+(end.z-z)*t*2:end.z,y:t<.5?23.8:23.8+(end.y-23.8)*(t-.5)*2,tilt:0};
}
export function roomDoorUnloadBox(plan,index,progress){
  const stop=plan.delivery.stops.find(s=>s.kind==='unload'&&s.trip===index),pose=plan.route[stop.index],h=plan.delivery.depot.angle,t=Math.max(0,Math.min(1,progress)),u=Math.max(0,(t-.4)/.6),tilt=u*Math.PI/2,f=12.3+18.2*Math.min(1,t/.4),height=20*Math.cos(tilt)+2*Math.sin(tilt),depth=20*Math.sin(tilt)+2*Math.cos(tilt),top=pose.y+index*2;
  return {x:pose.x+Math.sin(h)*f,y:Math.max(pose.y+17+(top+1-pose.y-17)*u,top+height/2+.3*(1-u)),z:pose.z+Math.cos(h)*f,w:21,h:height,d:depth,angle:h,tilt};
}
export function roomDoorGrip(box,side=1){const x=side*7.02,y=-6.49*Math.cos(box.tilt)+1.4*Math.sin(box.tilt),z=-6.49*Math.sin(box.tilt)-1.4*Math.cos(box.tilt),h=box.angle;return{x:box.x+Math.cos(h)*x+Math.sin(h)*z,y:box.y+y,z:box.z-Math.sin(h)*x+Math.cos(h)*z};}
function hand(pose,side){const h=pose.heading;return{x:pose.x+Math.cos(h)*side*7.02+Math.sin(h)*8.67,y:pose.y+10.51,z:pose.z-Math.sin(h)*side*7.02+Math.cos(h)*8.67};}
function bodyRoute(route,boxes){
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],h=travel(a,b),n=Math.max(1,Math.ceil(dist(a,b)*2));
    const prev=i===1?a.heading:travel(route[i-2],a),delta=Math.atan2(Math.sin(h-prev),Math.cos(h-prev));
    for(let k=0;k<=24;k++)if(highWorkBodyHits(a,prev+delta*k/24,boxes))fail('材料を置く場所と、歩く道をあけよう。');
    for(let k=0;k<=n;k++)if(highWorkBodyHits({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n,z:a.z+(b.z-a.z)*k/n},h,boxes))fail('材料を置く場所と、歩く道をあけよう。');
  }
}
export function assertRoomDeliveryRoute(plan,boxes,{walkBoxes=boxes}={}){
  if(!roomDoorDelivery(plan))return assertRoomKitRoute(plan,boxes);
  const d=plan.delivery,table={x:-188,y:12,z:170,w:80,h:3,d:50},all=boxes.concat(table);
  // Reserve the entire staging stack, including later trips, before starting.
  for(let j=0;j<d.count;j++)if(boxes.some(b=>boxHit(roomDoorDepotBox(plan,j),b)))fail('材料を置ける床をあけよう。');
  for(const trip of d.trips){const staged=Array.from({length:trip.trip},(_,i)=>roomDoorDepotBox(plan,i)),pickup=d.stops.find(s=>s.kind==='pickup'&&s.trip===trip.trip),unload=d.stops.find(s=>s.kind==='unload'&&s.trip===trip.trip),pose={...plan.route[unload.index],heading:d.depot.angle};
    const source=Array.from({length:d.count-trip.trip-1},(_,j)=>roomDoorPickupBox(plan,trip.trip+j+1,0)),receive=all.concat(source),carried=boxes.concat(staged),placing=all.concat(staged);
    for(let n=0;n<=80;n++)if(receive.some(b=>boxHit(roomDoorPickupBox(plan,trip.trip,n/80),b)))fail('材料を受け取る台の前をあけよう。');
    const loaded=plan.route.slice(pickup.index,unload.index+1);
    const one={...plan,item:{kind:'bench'},route:loaded,end:pose,delivery:{pickupIndex:0}};
    // The single-set carry sweep is shared with version 1; it never carries a double-height door.
    assertRoomKitRoute(one,carried);
    for(let n=0;n<=100;n++){const k=roomDoorUnloadBox(plan,trip.trip,n/100);if(placing.some(b=>boxHit(k,b)))fail('材料をそっと置ける場所をあけよう。');
      for(const side of[-1,1])if(carried.some(b=>upperSegmentHitsBox(hand(pose,side),roomDoorGrip(k,side),b,.3)))fail('材料を置く道具の前をあけよう。');
    }
    bodyRoute(plan.route.slice(trip.startIndex,pickup.index+1),staged.concat(walkBoxes));
    bodyRoute(loaded,staged.concat(walkBoxes));
  }
  const stack=Array.from({length:d.count},(_,i)=>roomDoorDepotBox(plan,i));
  for(let k=0;k<24;k++)if(highWorkBodyHits(plan.end,k*Math.PI/12,stack))fail('組み立てる場所をあけよう。');
  for(let i=1;i<plan.toolPath.length;i++)if(stack.some(b=>upperSegmentHitsBox(plan.toolPath[i-1],plan.toolPath[i],b,.3)))fail('材料から道具を動かせる場所をえらぼう。');
  return true;
}
export function makeRoomDoorDelivery(w,item,stance,{fetch,loaded,toolPath}){
  const count=ROOM_KINDS[item.kind].wood/840,own=highWorkSolids(w),future=roomItemParts(item,{sweep:true}),floor=item.floor?highFloorPieces(w,item.floor):[{x:32,z:0,w:64,d:128}];
  let lastError;for(const heading of[0,Math.PI/2,Math.PI,-Math.PI/2])try{
    const depot={x:stance.x+Math.sin(heading)*30.5,y:stance.y,z:stance.z+Math.cos(heading)*30.5,angle:heading},flat={...depot,w:heading%(Math.PI)===0?21:20,d:heading%(Math.PI)===0?20:21};
    const area=floor.reduce((n,b)=>n+Math.max(0,Math.min(flat.x+flat.w/2,b.x+b.w/2)-Math.max(flat.x-flat.w/2,b.x-b.w/2))*Math.max(0,Math.min(flat.z+flat.d/2,b.z+b.d/2)-Math.max(flat.z-flat.d/2,b.z-b.d/2)),0);
    if(Math.abs(area-420)>1e-6)continue;
    const preview={delivery:{depot}},stack=Array.from({length:count},(_,i)=>roomDoorDepotBox(preview,i));
    if(stack.some(a=>own.concat(future).some(b=>boxHit(a,b))))continue;
    const destination={...stance,heading},route=[],stops=[],trips=[];let walk=0,wait=0;
    const append=points=>{for(const q of points){if(route.length&&dist(route.at(-1),q)<1e-9)continue;if(route.length)walk+=dist(route.at(-1),q)/200;route.push({...q});}};
    for(let trip=0;trip<count;trip++){
      const startIndex=Math.max(0,route.length-1);append(trip?fetch({...w,actor:destination,interiorLayoutStation:true,interiorPaintStation:undefined,paintStation:undefined},stack):fetch(w,[]));
      stops.push({kind:'pickup',trip,index:route.length-1,at:walk,duration:ROOM_KIT_PICKUP_SECONDS,heading:Math.PI});wait+=ROOM_KIT_PICKUP_SECONDS;
      append(loaded(destination,stack));
      stops.push({kind:'unload',trip,index:route.length-1,at:walk,duration:ROOM_DOOR_UNLOAD_SECONDS,heading});wait+=ROOM_DOOR_UNLOAD_SECONDS;trips.push({trip,startIndex});
    }
    const plan={item,route,end:stance,toolPath,work:wait+ROOM_DOOR_ASSEMBLY_SECONDS,delivery:{version:2,count,depot,stops,trips,walkSeconds:walk,waitSeconds:wait}};
    assertRoomDeliveryRoute(plan,own,{walkBoxes:[]});return plan;
  }catch(e){lastError=e;}
  if(lastError)throw lastError;fail('材料を置く床と、階段までの通り道がある場所をえらぼう。');
}
export function roomDeliveryMotion(work,plan){
  if(!roomDoorDelivery(plan))return null;let wait=0;const t=work.job.elapsed;
  for(const stop of plan.delivery.stops){const start=stop.at+wait;if(t<start)return{time:t-wait,stop:null};if(t<start+stop.duration)return{time:stop.at,stop,progress:(t-start)/stop.duration};wait+=stop.duration;}
  return {time:t-wait,stop:null};
}
export function roomDeliveryPhase(work,plan){
  if(!roomDoorDelivery(plan))return roomKitPhase(work,plan);
  const motion=roomDeliveryMotion(work,plan),d=plan.delivery;
  if(motion.stop)return{kind:motion.stop.kind,trip:motion.stop.trip,total:d.count,progress:motion.progress};
  let prior=null,wait=0;for(const stop of d.stops){if(work.job.elapsed<stop.at+wait)break;wait+=stop.duration;prior=stop;}
  if(!prior)return{kind:'fetch',trip:0,total:d.count,progress:0};
  if(prior.kind==='pickup')return{kind:'carry',trip:prior.trip,total:d.count,progress:0};
  if(prior.trip<d.count-1)return{kind:'fetch',trip:prior.trip+1,total:d.count,progress:0};
  return{kind:'assemble',trip:d.count,total:d.count,progress:Math.min(1,Math.max(0,(work.job.elapsed-d.walkSeconds-d.waitSeconds)/ROOM_DOOR_ASSEMBLY_SECONDS))};
}
export function roomDeliveryLabel(work,plan){
  const phase=roomDeliveryPhase(work,plan);if(!phase)return 'そばまで歩いて作業中…';
  const prefix=roomDoorDelivery(plan)?'材料 '+(phase.kind==='assemble'?phase.total:phase.trip+1)+' / '+phase.total+'：':'';
  return prefix+({fetch:phase.trip?'つぎの材料を取りにいくよ':'材料を取りにいくよ',pickup:'材料を持ち上げるよ',carry:'材料を運んでいるよ',unload:'材料をそっと置くよ',assemble:'組み立てているよ'}[phase.kind]);
}
export function roomDoorVisualBoxes(work,plan,actor){
  if(!roomDoorDelivery(plan))return[];const phase=roomDeliveryPhase(work,plan),d=plan.delivery,result=[];
  for(let i=0;i<d.count;i++){
    let b;if(phase.kind==='assemble'){const h=2*(1-phase.progress);b={...roomDoorDepotBox(plan,i),y:d.depot.y+(i+.5)*h,h,tilt:Math.PI/2};}
    else if(i<phase.trip)b={...roomDoorDepotBox(plan,i),tilt:Math.PI/2};
    else if(i>phase.trip||phase.kind==='fetch')b=roomDoorPickupBox(plan,i,0);
    else if(phase.kind==='pickup')b=roomDoorPickupBox(plan,i,phase.progress);
    else if(phase.kind==='unload')b=roomDoorUnloadBox(plan,i,phase.progress);
    else b={...roomKitBox(plan.item,actor,actor.heading,1),tilt:0};
    if(b.h>1e-6)result.push({...b,index:i,remaining:phase.kind==='assemble'?1-phase.progress:1});
  }return result;
}
