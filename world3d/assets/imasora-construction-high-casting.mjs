import{assertRoomDeliveryRoute as assertRoomKitRoute}from'./imasora-construction-room-door-delivery.mjs?v=120gn';
import{decorItem,decorPaintPlan}from'./imasora-construction-decor-paint.mjs?v=120gn';
import{decorPainterReady,decorPaintToolPaths}from'./imasora-construction-decor-paint-path.mjs?v=120gn';
import {entranceDoorParts} from './imasora-construction-building-door.mjs?v=120gn';
import {buildingPaintPlan} from './imasora-construction-building-paint.mjs?v=120gn';
import {buildingPainterReady,buildingPaintToolPaths} from './imasora-construction-building-paint-path.mjs?v=120gn';
import {upperPaintToolPaths} from './imasora-construction-high-paint-path.mjs?v=120gn';
import {highProjects,highWorldPoint,highLocalPoint,highWorldGeometry} from './imasora-construction-high-world.mjs?v=120gn';
import {highFloors,highFloorPieces,highRoofPoint} from './imasora-construction-high-shape.mjs?v=120gn';
import {highCastings,UPPER_PUMP_PORT} from './imasora-construction-concrete/high-casting-state.mjs?v=120ft';
import {vehicleContactPoint,overlaps} from './imasora-construction-concrete/free-vehicle-shape.mjs';
import {TIMBER_YARDS} from './imasora-construction-yard-origins.mjs?v=120gb';
import {vehicleGroundPose} from './imasora-construction-concrete/free-vehicle-ground.mjs?v=120ek';
import * as T from './three.module.min.js';
import {hoseGeometry} from './imasora-construction-concrete/free-hose-shape.mjs';
import {upperShapeTiles,upperCastingHeight,upperPourTile} from './imasora-construction-concrete/high-casting-shape.mjs?v=120fl';
import {highJobPlan} from './imasora-construction-high-build.mjs?v=120gn';
import {highWorkTarget,highWorkSolids,highWorkBodyHits} from './imasora-construction-high-work-position.mjs?v=120gn';
import {highWorkPipe,highWorkPipeBrackets} from './imasora-construction-high-work-pipe.mjs?v=120gn';
import{assertUpperCollection,upperCollectionPreview,upperPieceBoxes,assertUpperCollectionTool}from'./imasora-construction-upper-collection.mjs?v=120gn';
const ok=(v,m)=>{if(!v)throw Error(m);};
const same=(a,b)=>!!a&&!!b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
export {UPPER_PUMP_PORT} from './imasora-construction-concrete/high-casting-state.mjs?v=120ft';
export function upperCastingAnchor(collection,id,station=null){
 const r=highProjects(collection).find(p=>p.id===id)?.record,w=r?.work;
 // Start with the spacious interior-stair building. Its real roof has room for
 // both the full-size worker and the form, away from the opening and stair route.
 ok(w?.version===5&&w.levels===highFloors(w)&&!w.kit,'内階段つきの広い建物を完成させてから、屋上につくろう。');
 if(station){highWorkTarget(w,station);const p=highWorldPoint(r.site,{x:station.x,y:station.floor*40,z:station.z});return{version:2,buildingId:id,floor:station.floor,x:p.x,y:p.y,z:p.z,turn:r.site.turn};}
 const floor=highFloors(w),pieces=highFloorPieces(w,floor),area=pieces.reduce((n,p)=>n+Math.max(0,Math.min(40,p.x+p.w/2)-Math.max(24,p.x-p.w/2))*Math.max(0,Math.min(-24,p.z+p.d/2)-Math.max(-40,p.z-p.d/2)),0);
 ok(Math.abs(area-256)<1e-6,'型枠を支える屋上の床が足りないよ。');
 const p=highWorldPoint(r.site,{x:32,y:floor*40,z:-32});return{buildingId:id,floor,x:p.x,y:p.y,z:p.z,turn:r.site.turn};
}
export function upperCastingLocal(collection,anchor){const r=highProjects(collection).find(p=>p.id===anchor.buildingId)?.record;ok(r,'建物が見つからないよ。');return highLocalPoint(r.site,anchor);}
export function upperWorkViewAngle(collection,anchor){if(anchor?.version!==2)return .84+(anchor?.turn??0)*Math.PI/2;const r=highProjects(collection).find(p=>p.id===anchor.buildingId)?.record;ok(r,'建物が見つからないよ。');const q=upperCastingLocal(collection,anchor),a={x:q.x,y:q.y+5,z:q.z},cut=q.y+32,boxes=highWorkSolids(r.work).filter(b=>b.y-b.h/2<cut).map(b=>b.y+b.h/2>cut?{...b,h:cut-b.y+b.h/2,y:(cut+b.y-b.h/2)/2}:b);const stance=highWorkTarget(r.work,upperAnchorStation(collection,anchor)).stance,front=Math.atan2(q.x-stance.x,q.z-stance.z);let best=null;for(const angle of[front,front+.45,front-.45,0,Math.PI/2,Math.PI,-Math.PI/2,.4,-.4,1.1,-1.1,2.1,-2.1,2.7,-2.7]){const b={x:a.x+Math.sin(angle)*100,y:a.y+80,z:a.z+Math.cos(angle)*100},hits=boxes.filter(v=>upperSegmentHitsBox(a,b,v,2)).length;if(!best||hits<best.hits)best={angle,hits};if(!hits)break;}return best.angle+r.site.turn*Math.PI/2;}
export function upperAnchorStation(collection,anchor){const p=upperCastingLocal(collection,anchor);return{version:1,floor:anchor.floor,x:p.x,z:p.z};}
function expectedAnchor(collection,anchor){return upperCastingAnchor(collection,anchor.buildingId,anchor.version===2?upperAnchorStation(collection,anchor):null);}
export function upperWorkerReady(collection,anchor){
 const r=highProjects(collection).find(p=>p.id===anchor.buildingId)?.record,w=r?.work,p=w&&highRoofPoint(w);
 if(anchor.version===2){try{const q=upperAnchorStation(collection,anchor),t=highWorkTarget(w,q);return w.accessVersion===1&&!w.job&&same(q,w.station)&&Math.hypot(w.actor.x-t.stance.x,w.actor.y-t.stance.y,w.actor.z-t.stance.z)<.1;}catch{return false;}}
 return !!w&&!w.job&&!!p&&Math.hypot(w.actor.x-p.x,w.actor.z-p.z)<.1&&Math.abs(w.actor.y-p.y)<.1;
}
export function upperRigPath(collection,anchor,casting=null){
 const r=highProjects(collection).find(p=>p.id===anchor.buildingId)?.record;ok(r,'建物が見つからないよ。');
 if(anchor.version===2)return highWorkPipe(r.work,upperAnchorStation(collection,anchor),upperPourTile(casting),upperCastingHeight(casting)).map(p=>highWorldPoint(r.site,p));
 const y=anchor.floor*40,s=anchor.floor%2?-1:1;
 const target=upperPourTile(casting),outlet=upperCastingHeight(casting)+4,z=-32+target.z;
 return [[300,1.3,s*188],[300,y+9,s*188],[252,y+9,s*188],[252,y+9,s*160],[252,y+1.3,s*160],[112,y+1.3,s*160],[112,y+1.3,-16],[56,y+1.3,-16],[56,y+1.3,z],[56,y+outlet,z],[32+target.x,y+outlet,z]].map(([x,y,z])=>highWorldPoint(r.site,{x,y,z}));
}
export function upperRigBrackets(collection,anchor){const r=highProjects(collection).find(p=>p.id===anchor.buildingId)?.record;ok(r,'建物が見つからないよ。');const s=anchor.floor%2?-1:1,world=p=>highWorldPoint(r.site,p),parts=[];if(anchor.version===2)return highWorkPipeBrackets(r.work,upperAnchorStation(collection,anchor)).map(b=>({...b,a:world(b.a),b:world(b.b)}));for(let y=8;y<=anchor.floor*40+5;y+=20)parts.push({a:world({x:284,y,z:s*188}),b:world({x:300,y,z:s*188}),radius:.75});for(const x of [300,252])parts.push({a:world({x:284,y:anchor.floor*40+4,z:s*188}),b:world({x,y:anchor.floor*40+9,z:s*188}),radius:.8});return parts;}
function pointBox(p,b,r=1.11){const c=Math.cos(b.angle??0),s=Math.sin(b.angle??0),dx=p.x-b.x,dz=p.z-b.z,x=dx*c-dz*s,z=dx*s+dz*c;return Math.abs(x)<b.w/2+r&&Math.abs(z)<b.d/2+r&&Math.abs(p.y-b.y)<b.h/2+r;}
// Continuous segment against an expanded oriented box. A fast coin-sized step
// or a long pipe cannot jump over a thin post between samples.
export function upperSegmentHitsBox(a,z,b,r=1.11){const co=Math.cos(b.angle??0),si=Math.sin(b.angle??0),local=p=>[(p.x-b.x)*co-(p.z-b.z)*si,p.y-b.y,(p.x-b.x)*si+(p.z-b.z)*co],p=local(a),q=local(z),half=[b.w/2+r,b.h/2+r,b.d/2+r];let low=0,high=1;for(let i=0;i<3;i++){const d=q[i]-p[i];if(Math.abs(d)<1e-10){if(Math.abs(p[i])>=half[i])return false;continue;}const x=(-half[i]-p[i])/d,y=(half[i]-p[i])/d;low=Math.max(low,Math.min(x,y));high=Math.min(high,Math.max(x,y));if(high<low)return false;}return true;}
export function sampleUpperPath(path,visit){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/1.5));for(let k=0;k<=n;k++){const t=k/n;visit({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},i,t);}}}
export function upperFeedPath(collection,f,c,heightAt=()=>0){
 ok(f.highPipe?.castingId===c.id&&same(f.pump,f.highPipe.pump),'ポンプ車の位置が変わったよ。上階のホースをつなぎ直そう。');
 const ground=vehicleGroundPose(f,f.pump,heightAt);vehicleGroundPose(f,f.truck,heightAt);ok(ground.slope<.001,'上階への送液は平らな地面で準備しよう。');
 const port=p=>{const v=new T.Vector3(p.x,p.y,p.z).applyQuaternion(ground.rotation).add(ground.position);return{x:v.x+f.location.x,y:v.y,z:v.z+f.location.z};};
 const start=port(UPPER_PUMP_PORT),rear=port({x:UPPER_PUMP_PORT.x,y:24,z:-62}),foot={x:rear.x,y:ground.position.y+1.3,z:rear.z},rig=upperRigPath(collection,c.anchor,c),end=rig[0];
 ok(Math.hypot(foot.x-end.x,foot.z-end.z)<=160&&Math.abs(foot.y-end.y)<.05,'ポンプ車を作業塔の配管の近くの平らな地面へ停めよう。黄色のつなぎ口が目印だよ。');
 const path=[start,rear,foot,end],high=highWorldGeometry(collection),other={...vehicleContactPoint(f.truck,{x:0,z:0}),heading:f.truck.heading};
 for(let i=1;i<path.length;i++)ok(!high.boxes.some(b=>upperSegmentHitsBox(path[i-1],path[i],b)), 'ホースが建物に当たるよ。ポンプ車を少し動かそう。');
 sampleUpperPath(path,(p,i)=>{
  const local={x:p.x-f.location.x-other.x,z:p.z-f.location.z-other.z},co=Math.cos(other.heading),si=Math.sin(other.heading);ok(!(Math.abs(local.x*co-local.z*si)<35&&Math.abs(local.x*si+local.z*co)<50),'ホースがミキサー車に当たるよ。車の後ろをあけよう。');
  if(i===3){const h=heightAt(p.x,p.z);ok(Number.isFinite(h)&&Math.abs(p.y-h-1.3)<.15,'ホースの下の段差や穴を避けて停めよう。');}
 });return [...path,...rig.slice(1)];
}
export function assertUpperCastWorld(world,{heightAt=()=>0}={}){
 const f=world.constructionProfileProject?.freeBuild,list=highCastings(f),collection=world.constructionHighBuild;if(!list.length){ok(!f?.highPipe,'上階のつなぎ先が見つからないよ。');return true;}
 assertUpperCollection(world);const timber=world.constructionTimber,origin=TIMBER_YARDS[timber?.siteIndex],materials=origin?(timber.work?.parts??[]).map(p=>({...p,x:origin[0]+p.x,y:p.y+p.h/2,z:origin[1]+p.z,angle:p.angle??0})):[];
 for(const c of list)if(!c.stored){ok(same(expectedAnchor(collection,c.anchor),c.anchor),'作品をしまってから建物を片付けよう。');
  const r=highProjects(collection).find(p=>p.id===c.anchor.buildingId).record,local=upperCastingLocal(collection,c.anchor);if(c.anchor.version===2)ok(r.work.accessVersion===1,'階の通り道を準備してからつくろう。');ok(!['MAKE','LIFT','BUILD','DISMANTLE'].includes(r.work.job?.type),'屋上の型枠や作品を片付けてから、建物を変えよう。');
  for(const tile of upperShapeTiles(c.shape)){const p=highWorldPoint(r.site,{x:local.x+tile.x,y:c.anchor.floor*40,z:local.z+tile.z}),h=upperCastingHeight(c);for(const m of materials)if(m.y+m.h/2>p.y+.01&&m.y-m.h/2<p.y+h)ok(!overlaps({x:p.x,z:p.z,hx:tile.w/2,hz:tile.d/2,heading:r.site.turn*Math.PI/2},{x:m.x,z:m.z,hx:m.w/2,hz:m.d/2,heading:m.angle}),'型枠や作品の場所に木材があるよ。先に移動しよう。');}
  const otherWorks=f?.upperLayoutVersion===1?list.filter(p=>!p.stored&&p.id!==c.id).flatMap(p=>upperPieceBoxes(collection,p)):[];const path=upperRigPath(collection,c.anchor,c),g=highWorldGeometry(collection),solidFloors=c.anchor.version===2?highWorkSolids(r.work).filter(b=>['floor','stair'].includes(b.kind)).map(b=>({...b,...highWorldPoint(r.site,b),angle:r.site.turn*Math.PI/2})):[];for(let i=1;i<path.length;i++)ok(![...g.boxes,...solidFloors,...materials,...otherWorks].some(b=>upperSegmentHitsBox(path[i-1],path[i],b)),'屋上の配管と建物・木材が重なっているよ。先に木材を動かそう。');const surfaces=g.surfaces.map(b=>({...b,...highLocalPoint(r.site,b)})).filter(b=>Math.abs(b.y-c.anchor.floor*40)<.01);sampleUpperPath(path,(p,i)=>{if(i>=5&&i<=(c.anchor.version===2?7:8)){const q=highLocalPoint(r.site,p);ok(surfaces.some(b=>Math.abs(q.x-b.x)<=b.w/2+.01&&Math.abs(q.z-b.z)<=b.d/2+.01),'屋上のホースを支える作業台が必要だよ。');}});
  const stance=c.anchor.version===2?highWorkTarget(r.work,upperAnchorStation(collection,c.anchor)).stance:{x:32,y:c.anchor.floor*40,z:-4},worker=highWorldPoint(r.site,stance),shape={x:worker.x,z:worker.z,hx:16,hz:18,heading:r.site.turn*Math.PI/2};for(const p of materials)if(p.y+p.h/2>worker.y+.01&&p.y-p.h/2<worker.y+28)ok(!overlaps(shape,{x:p.x,z:p.z,hx:p.w/2,hz:p.d/2,heading:p.angle}),'屋上の通り道に木材があるよ。先に木材を移動してから作業しよう。');
 }
 if(list.some(c=>c.pending))ok(f.highPipe&&f.aboard==='pump','ポンプ車で送液を止めてから車を降りよう。');
 if(f.highPipe){const c=list.find(c=>c.id===f.highPipe.castingId&&!c.stored);ok(c&&f.pump.legs&&f.connected,'上階ホースを外してから支持脚・接続を片付けよう。');const path=upperFeedPath(collection,f,c,heightAt);for(let i=1;i<4;i++)ok(!materials.some(b=>upperSegmentHitsBox(path[i-1],path[i],b)),'地上のホースに木材が当たるよ。先に木材を移動しよう。');}
 return true;
}
export function assertUpperAction(world,a){
 if(a.type==='FREE_DECOR_PAINT'){const r=highProjects(world.constructionHighBuild).find(p=>p.id===a.buildingId)?.record;ok(r?.work.version===5&&r.work.levels===highFloors(r.work)&&!r.work.job,'建物を完成させてからぬろう。');const f=world.constructionProfileProject?.freeBuild??{},plan=decorPaintPlan(f,a);ok(JSON.stringify(plan.plan)===JSON.stringify(r.work.blueprint),'建物の形をえらび直そう。');if(a.item){const actual=r.work.roomLayout?.items.find(i=>i.id===a.item.id);ok(actual&&JSON.stringify(decorItem(actual))===JSON.stringify(a.item)&&!actual.open,'家具をえらび直そう。とびらは先にしめよう。');}ok(decorPainterReady(r.work,a.target),'先にぬる場所へ歩こう。');const t=world.constructionTimber,o=TIMBER_YARDS[t?.siteIndex],extras=(o?(t.work?.parts??[]).map(p=>({...p,...highLocalPoint(r.site,{x:o[0]+p.x,y:p.y+p.h/2,z:o[1]+p.z}),angle:(p.angle??0)-r.site.turn*Math.PI/2})):[]).concat(upperCastingGeometry(world).map(b=>({...b,...highLocalPoint(r.site,b),angle:(b.angle??0)-r.site.turn*Math.PI/2})));decorPaintToolPaths(r,a,plan.patches,null,extras.concat(entranceDoorParts(r.work)));return;}

 if(a.type==='FREE_BUILDING_PAINT'){const r=highProjects(world.constructionHighBuild).find(p=>p.id===a.buildingId)?.record;ok(r?.work.version===5&&r.work.levels===highFloors(r.work)&&!r.work.job,'建物を完成させてから色をぬろう。');const f=world.constructionProfileProject?.freeBuild??{},groups=f.buildingPaint?.groups??[],activeIds=highProjects(world.constructionHighBuild).map(p=>p.id);ok((a.retire??[]).every(id=>!activeIds.includes(id)&&groups.some(g=>g.buildingId===id)),'いまある建物の色は残しているよ。');const plan=buildingPaintPlan(f,a);ok(JSON.stringify(plan.plan)===JSON.stringify(r.work.blueprint),'建物の形が変わったよ。色は残しているよ。');ok(buildingPainterReady(r.work,{level:a.level,part:a.part,face:a.face,...(a.interior?{interior:true}:{})}),'先に「ぬる場所へ歩く」で足場へ向かおう。');const t=world.constructionTimber,o=TIMBER_YARDS[t?.siteIndex],extras=o?(t.work?.parts??[]).map(p=>({...p,...highLocalPoint(r.site,{x:o[0]+p.x,y:p.y+p.h/2,z:o[1]+p.z}),angle:(p.angle??0)-r.site.turn*Math.PI/2})):[];const casts=upperCastingGeometry(world).map(b=>({...b,...highLocalPoint(r.site,b),angle:(b.angle??0)-r.site.turn*Math.PI/2}));buildingPaintToolPaths(r,a,plan.patches,null,extras.concat(casts,entranceDoorParts(r.work)));return;}
 if(!a.type.startsWith('FREE_HIGH_'))return;if(a.type.startsWith('FREE_HIGH_ADD_')){const existing=world.constructionProfileProject?.freeBuild?.highCastings?.find(c=>c.id===a.castingId);upperCollectionPreview(world,a.anchor,a.type==='FREE_HIGH_ADD_SHAPED_FRAME'?{version:1,mask:a.mask}:existing?.shape??null);}
 const f=world.constructionProfileProject?.freeBuild,c=highCastings(f).find(c=>c.id===a.castingId),anchor=a.anchor??c?.anchor;
 if(a.type==='FREE_HIGH_PAINT'){ok(anchor&&upperWorkerReady(world.constructionHighBuild,anchor),'作品のある階へ登ってから色をぬろう。');const r=highProjects(world.constructionHighBuild).find(p=>p.id===anchor.buildingId).record,t=world.constructionTimber,origin=TIMBER_YARDS[t?.siteIndex];const extras=origin?(t.work?.parts??[]).map(p=>({...p,...highLocalPoint(r.site,{x:origin[0]+p.x,y:p.y+p.h/2,z:origin[1]+p.z}),angle:(p.angle??0)-r.site.turn*Math.PI/2})):[];if(f?.upperLayoutVersion===1)extras.push(...highCastings(f).filter(p=>!p.stored&&p.id!==c.id).flatMap(p=>upperPieceBoxes(world.constructionHighBuild,p)).map(b=>({...b,...highLocalPoint(r.site,b),angle:b.angle-r.site.turn*Math.PI/2})));upperPaintToolPaths(r,c,a,null,extras);}
 if(['FREE_HIGH_ADD_FRAME','FREE_HIGH_ADD_SHAPED_FRAME','FREE_HIGH_ADD_REPLACE','FREE_HIGH_FRAME','FREE_HIGH_SHAPED_FRAME','FREE_HIGH_UNFRAME','FREE_HIGH_FINISH','FREE_HIGH_CURE','FREE_HIGH_DEMOLD','FREE_HIGH_STORE','FREE_HIGH_REPLACE','FREE_HIGH_RECOVER'].includes(a.type)){ok(anchor&&upperWorkerReady(world.constructionHighBuild,anchor),'建物の屋上へ登ってから作業しよう。');if(a.anchor)ok(same(a.anchor,expectedAnchor(world.constructionHighBuild,a.anchor)),'型枠は黄色い印の場所に置こう。');assertUpperCollectionTool(world,anchor,a.type==='FREE_HIGH_ADD_SHAPED_FRAME'?{version:1,mask:a.mask}:c?.shape??null,c?.id??null,a.type.startsWith('FREE_HIGH_ADD_'));}
}
export function upperCastingGeometry(world,heightAt=()=>0){
 const f=world.constructionProfileProject?.freeBuild,boxes=[];for(const c of highCastings(f))if(!c.stored){const a=c.anchor,angle=a.turn*Math.PI/2;
  const record=highProjects(world.constructionHighBuild).find(p=>p.id===a.buildingId).record,h=upperCastingHeight(c),local=upperCastingLocal(world.constructionHighBuild,a);for(const tile of upperShapeTiles(c.shape)){const p=highWorldPoint(record.site,{x:local.x+tile.x,y:a.floor*40+h/2,z:local.z+tile.z}),margin=c.stage==='complete'?0:c.shape?.4:1;boxes.push({x:p.x,y:p.y,z:p.z,w:tile.w+margin,h,d:tile.d+margin,angle});}
  if(c.stage!=='complete'){const g=hoseGeometry(upperRigPath(world.constructionHighBuild,a,c),{x:0,z:0});boxes.push(...g.walls.map(w=>({x:w.x,z:w.z,y:(w.minY+w.maxY)/2,w:w.localHalfX*2,h:w.maxY-w.minY,d:w.localHalfZ*2,angle:w.rotation})));for(const bracket of upperRigBrackets(world.constructionHighBuild,a)){const g=hoseGeometry([bracket.a,bracket.b],{x:0,z:0});boxes.push(...g.walls.map(w=>({x:w.x,z:w.z,y:(w.minY+w.maxY)/2,w:w.localHalfX*2,h:w.maxY-w.minY,d:w.localHalfZ*2,angle:w.rotation})));}}
 }
 if(f?.highPipe){const c=highCastings(f).find(c=>c.id===f.highPipe.castingId);const g=hoseGeometry(upperFeedPath(world.constructionHighBuild,f,c,heightAt).slice(0,4),{x:0,z:0});boxes.push(...g.walls.map(w=>({x:w.x,z:w.z,y:(w.minY+w.maxY)/2,w:w.localHalfX*2,h:w.maxY-w.minY,d:w.localHalfZ*2,angle:w.rotation})));}
 return boxes.map((b,i)=>({...b,id:'upper-concrete-'+i}));
}

// Validate physical access independently of whether a concrete form exists.
// External material changes invalidate this check; route caches never bypass it.
export function assertHighWorkAccess(world){assertRoomPaintAccess(world);const collection=world.constructionHighBuild,timber=world.constructionTimber,origin=TIMBER_YARDS[timber?.siteIndex];if(!collection||!origin)return true;const parts=(timber.work?.parts??[]).map(p=>({...p,x:origin[0]+p.x,y:p.y+p.h/2,z:origin[1]+p.z,angle:p.angle??0}));if(!parts.length)return true;for(const {record:r}of highProjects(collection)){const w=r.work;if(!['ROOM_LAYOUT_EDIT','WORK_VISIT','PAINT_VISIT','ROOM_PAINT_VISIT','DOOR_VISIT'].includes(w.job?.type)&&!(w.job?.type==='RETURN'&&(w.interiorLayoutStation||w.paintStation||w.interiorPaintStation||w.accessVersion===1&&w.station)))continue;const plan=highJobPlan(w,w.job.type),local=parts.map(b=>({...b,...highLocalPoint(r.site,b),angle:b.angle-r.site.turn*Math.PI/2}));for(let i=1;i<plan.route.length;i++){const a=plan.route[i-1],b=plan.route[i],near=local.filter(v=>v.x+Math.hypot(v.w,v.d)/2+20>=Math.min(a.x,b.x)&&v.x-Math.hypot(v.w,v.d)/2-20<=Math.max(a.x,b.x)&&v.z+Math.hypot(v.w,v.d)/2+20>=Math.min(a.z,b.z)&&v.z-Math.hypot(v.w,v.d)/2-20<=Math.max(a.z,b.z));if(!near.length)continue;const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)));for(let k=0;k<=n;k++)ok(!highWorkBodyHits({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n,z:a.z+(b.z-a.z)*k/n},b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z),near),'歩く場所に木材があるよ。先に木材を動かそう。');}}return true;}

function assertRoomPaintAccess(world){
 const t=world.constructionTimber,o=TIMBER_YARDS[t?.siteIndex],external=(o?(t.work?.parts??[]).map(p=>({...p,x:o[0]+p.x,y:p.y+p.h/2,z:o[1]+p.z,angle:p.angle??0})):[]).concat(upperCastingGeometry(world));
 for(const {record:r}of highProjects(world.constructionHighBuild)){const w=r.work;if(!['ROOM_LAYOUT_EDIT','ROOM_PAINT_VISIT',...(world.constructionProfileProject?.freeBuild?.upperLayoutVersion===1?['WORK_VISIT']:[])].includes(w.job?.type)&&!(w.job?.type==='RETURN'&&(w.interiorPaintStation||w.interiorLayoutStation||world.constructionProfileProject?.freeBuild?.upperLayoutVersion===1&&w.station)))continue;const route=highJobPlan(w,w.job.type).route,boxes=external.map(b=>({...b,...highLocalPoint(r.site,b),angle:(b.angle??0)-r.site.turn*Math.PI/2}));assertRoomKitRoute(highJobPlan(w,w.job.type),boxes);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)));for(let k=0;k<=n;k++)ok(!highWorkBodyHits({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n,z:a.z+(b.z-a.z)*k/n},b.travelHeading??Math.atan2(b.x-a.x,b.z-a.z),boxes),'室内への道に作品や材料があるよ。先に通り道をあけよう。');}}
}
