import{assertRoomDeliveryRoute as assertRoomKitRoute}from'./imasora-construction-room-door-delivery.mjs?v=120fw';
import{roomLayoutPlan,assertRoomUndoSafe}from'./imasora-construction-room-layout.mjs?v=120fw';
import{roomItemParts}from'./imasora-construction-room-layout-shape.mjs?v=120fr';
import{highWorkBodyHits}from'./imasora-construction-high-work-position.mjs?v=120fr';
import{highSelected,highLocalPoint,highProjects}from'./imasora-construction-high-world.mjs?v=120fw';
import{upperCastingGeometry,upperSegmentHitsBox}from'./imasora-construction-high-casting.mjs?v=120fw';
import{TIMBER_YARDS}from'./imasora-construction-yard-origins.mjs';
const hit=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+.1&&Math.abs(a.y-b.y)<(a.h+b.h)/2+.1&&Math.abs(a.z-b.z)<(a.d+b.d)/2+.1;
export function assertRoomLayoutWorld(world,a,recordOverride=null){
 const r=recordOverride??highSelected(world.constructionHighBuild);if(!r)return;const w=r.work,undo=a.type==='UNDO'&&Object.hasOwn(w.history.at(-1)??{},'layout'),checking=a.type==='CHECK';if(a.type!=='ROOM_LAYOUT'&&!undo&&!checking)return;if(checking&&!w.roomLayout?.items.length&&!w.job?.edit?.deliveryVersion)return;
 const t=world.constructionTimber,o=TIMBER_YARDS[t?.siteIndex],external=(o?(t.work?.parts??[]).map(p=>({...p,x:o[0]+p.x,y:p.y+p.h/2,z:o[1]+p.z,angle:p.angle??0})):[]).concat(upperCastingGeometry(world)),boxes=external.map(b=>{const a=(b.angle??0)-r.site.turn*Math.PI/2,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return{...b,...highLocalPoint(r.site,b),w:b.w*c+b.d*s,d:b.w*s+b.d*c,angle:0};});
 const future=undo?{...w,roomLayout:w.history.at(-1).layout??undefined,job:null}:null;if(undo)assertRoomUndoSafe(future);const plan=undo?null:checking?(w.job?.edit?.deliveryVersion?roomLayoutPlan(w,w.job.edit):null):roomLayoutPlan(w,a.edit),items=checking?(w.roomLayout?.items??[]):undo?(future.roomLayout?.items??[]):[plan.item];
 if(items.flatMap(i=>roomItemParts(i,{sweep:true})).some(p=>boxes.some(b=>hit(p,b))))throw Error('作品や材料から少し離して置こう。');
 if(plan){assertRoomKitRoute(plan,boxes);for(let i=1;i<plan.route.length;i++){const a=plan.route[i-1],b=plan.route[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)));for(let k=0;k<=n;k++)if(highWorkBodyHits({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n,z:a.z+(b.z-a.z)*k/n},b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z),boxes))throw Error('歩く道に作品や材料があるよ。先に動かそう。');}for(let i=1;i<plan.toolPath.length;i++)if(boxes.some(b=>upperSegmentHitsBox(plan.toolPath[i-1],plan.toolPath[i],b,.3)))throw Error('道具の前をあけよう。作品や材料はそのまま残したよ。');}
}
export function assertAllRoomLayoutsWorld(world){for(const {record}of highProjects(world.constructionHighBuild))if(record.work.roomLayout?.items.length||record.work.job?.edit?.deliveryVersion)assertRoomLayoutWorld(world,{type:'CHECK'},record);}
