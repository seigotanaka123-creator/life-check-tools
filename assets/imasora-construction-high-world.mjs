import{roomDoorVisualBoxes,roomDoorDelivery}from'./imasora-construction-room-door-delivery.mjs?v=120fw';
import{wallDoorCutPart}from'./imasora-construction-wall-door-shape.mjs?v=120fr';
import{roomLayoutParts,roomLayoutWood}from'./imasora-construction-room-layout-shape.mjs?v=120fr';
import {entranceDoorParts,ENTRANCE_DOOR_TIMBER} from './imasora-construction-building-door.mjs?v=120fp';
import{highPlanScale,highInnerStairs}from'./imasora-construction-high-interior.mjs?v=120fi';
import {highAccessLandings} from './imasora-construction-high-work-position.mjs?v=120fr';
import {highFloors,highFloorPieces,highRoofBridge,highMaterialCost,validateHighShape} from './imasora-construction-high-shape.mjs?v=120fi';
export {highMaterialCost} from './imasora-construction-high-shape.mjs?v=120fi';
import {newHighBuild,validateHighBuild,beginHighJob,beginHighRoomLayout,beginHighWorkVisit,beginHighPaintVisit,beginRoomPaintVisit,finishHighJob,undoHighBuild,highJobPlan,highRouteSeconds,highPlatform,highBuildingParts,highActorAt} from './imasora-construction-high-build.mjs?v=120fw';
import {transportGroundHeightAt} from './imasora-construction-transport-site.mjs?v=120fw';
import {isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
import {inspectBuildingGround} from './imasora-construction-building-ground.mjs';
export const HIGH_WORLD_SCOPE='imasora-world-high-build-v1';
// Three received timber bundles become the three floor kits. Scaffold and lift
// are reusable tools, never a source of timber or credits.
export const HIGH_TIMBER=3*26880;
export const HIGH_SITE={minX:-118,maxX:150,minZ:-100,maxZ:150};
const ok=(v,m)=>{if(!v)throw Error(m);};
export function highWorldPoint(site,p){const a=site.turn*Math.PI/2,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));return{x:site.x+p.x*c+p.z*s,y:site.y+p.y,z:site.z-p.x*s+p.z*c,heading:(p.heading||0)+a};}
export function highLocalPoint(site,p){const q=highWorldPoint({x:0,y:0,z:0,turn:(4-site.turn)%4},{x:p.x-site.x,y:p.y-site.y,z:p.z-site.z,heading:0});return {...q,heading:(p.heading||0)-site.turn*Math.PI/2};}
export function highSiteBounds(site,work){const scale=highPlanScale(work),ps=[[-118,-100],[150,-100],[150,150],[-118,150]].map(([x,z])=>highWorldPoint(site,{x:x*scale,y:0,z:z*scale}));const xs=ps.map(p=>p.x),zs=ps.map(p=>p.z);return {x:(Math.min(...xs)+Math.max(...xs))/2,y:site.y,z:(Math.min(...zs)+Math.max(...zs))/2,w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs),h:work?highFloors(work)*40+20:260};}
export function validateHighSite(site){ok(site&&Object.keys(site).sort().join('|')==='turn|x|y|z'&&[site.x,site.y,site.z].every(Number.isFinite)&&Number.isInteger(site.turn)&&site.turn>=0&&site.turn<4&&site.x%8===0&&site.z%8===0&&Math.abs(site.x)<=2600&&Math.abs(site.z)<=1700&&site.y>=-32&&site.y<=48,'建てる場所をえらび直してね。');return site;}
export function inspectHighSite(site,{heightAt,bounds,blocked,actor,work}={}){
 try{validateHighSite(site);}catch(e){return{valid:false,issue:e.message};}
 const b=highSiteBounds(site,work),p=[b.x,site.y,b.z],size=[b.w,b.h,b.d],g=inspectBuildingGround(p,size,{heightAt,bounds});
 if(!g.valid)return g;
 if(actor&&Math.abs(actor.x-b.x)<b.w/2+18&&Math.abs(actor.z-b.z)<b.d/2+18)return{valid:false,issue:'モンスターより少し先に置こう。'};
 if(blocked?.([b.x,g.y,b.z],size))return{valid:false,issue:'車・建物・材料から離して置こう。'};
 return{valid:true,site:{...site,y:g.y},issue:'ここに建物・作業台・階段を置けるよ。',samples:g.samples};
}
export function validateHighWorld(r){
 if(r?.version===2)return validateCollection(r);
 ok(r&&Object.keys(r).sort().join('|')==='revision|scope|site|version|work'&&r.scope===HIGH_WORLD_SCOPE&&r.version===1&&Number.isSafeInteger(r.revision)&&r.revision>=0,'高い建物の記録を保護したよ。');
 validateHighSite(r.site);validateHighBuild(r.work);return r;
}
function transitionSingle(old,a){
 if(a.type==='PLACE'){ok(!old,'いまの建物を大切に残しているよ。');return validateHighWorld({scope:HIGH_WORLD_SCOPE,version:1,revision:0,site:structuredClone(validateHighSite(a.site)),work:newHighBuild(a.blueprint)});}
 validateHighWorld(old);let w=old.work;
 if(a.type==='ROOM_LAYOUT'){ok(Object.keys(a).every(k=>['type','edit','projectId','operationId'].includes(k)),'道具をえらび直そう。');w=beginHighRoomLayout(w,a.edit);}
 else if(a.type==='START')w=beginHighJob(w,a.jobType);
 else if(a.type==='VISIT_ROOM_PAINT'){ok(Object.keys(a).every(k=>['type','surface','projectId','operationId'].includes(k)),'室内の場所をえらび直そう。');w=beginRoomPaintVisit(w,a.surface);}
 else if(a.type==='VISIT_PAINT'){ok(Object.keys(a).every(k=>['type','surface','projectId','operationId'].includes(k)),'ぬる場所をえらび直そう。');w=beginHighPaintVisit(w,a.surface);}
 else if(a.type==='VISIT_WORK'){ok(Object.keys(a).every(k=>['type','station','projectId','operationId'].includes(k)),'作業場所をえらび直そう。');w=beginHighWorkVisit(w,a.station);}
 else if(a.type==='PROGRESS'){ok(w.job&&Number.isFinite(a.elapsed)&&a.elapsed>=w.job.elapsed,'古い作業で上書きできないよ。');const p=highJobPlan(w,w.job.type);ok(a.elapsed<=highRouteSeconds(p.route)+p.work,'作業の時間が合わないよ。');w={...w,job:{...w.job,elapsed:a.elapsed}};}
 else if(a.type==='FINISH')w=finishHighJob(w);
 else if(a.type==='UNDO')w=undoHighBuild(w);
 else if(a.type==='REMOVE'){ok(!w.job&&w.levels===0&&!w.kit&&w.actor.y===0&&(w.history.length===0||a.confirmed===true),'建物を上から片付けて地上へ戻ろう。木材の回収は確認してから進もう。');return null;}
 else throw Error('その作業は見つからないよ。');
 return validateHighWorld({...old,revision:old.revision+1,work:w});
}
export function highWorldGeometry(record){
 if(record?.version===2){const all=record.projects.map(p=>{const g=highWorldGeometry(p.record);return{surfaces:g.surfaces.map(b=>({...b,id:p.id+'-'+b.id,angle:g.angle})),boxes:g.boxes.map(b=>({...b,id:p.id+'-'+b.id,angle:g.angle}))};});return{surfaces:all.flatMap(g=>g.surfaces),boxes:all.flatMap(g=>g.boxes),angle:0};}
 validateHighWorld(record);const {site,work}=record,p=highPlatform(work);
 const surfaces=[...roomLayoutParts(work).filter(b=>b.kind==='landing').map(b=>({...b,y:b.y+b.h/2})),...p.decks.filter(b=>b.y),...p.stairs,...highAccessLandings(work),...(highPlanScale(work)===2?Array.from({length:work.levels},(_,i)=>highInnerStairs(i+1).map(b=>({...b,y:b.y+b.h/2}))).flat():[]),...Array.from({length:work.levels},(_,i)=>highFloorPieces(work,i+1)).flat()];
 const bridge=work.levels===highFloors(work)?highRoofBridge(work):null;if(bridge)surfaces.push(bridge);
 const boxes=[...roomLayoutParts(work),...entranceDoorParts(work),...p.posts.map(b=>({...b,y:highFloors(work)*20,w:2*highPlanScale(work),h:highFloors(work)*40+6,d:2*highPlanScale(work)})),...Array.from({length:work.levels},(_,i)=>highBuildingParts(i+1,work)).flat().flatMap(p=>wallDoorCutPart(work,p)).filter(b=>b.kind!=='floor'&&b.kind!=='stair'),{x:-94*highPlanScale(work),y:5,z:85*highPlanScale(work),w:40*highPlanScale(work),h:10,d:25*highPlanScale(work)}];
 if(work.job?.edit?.deliveryVersion===2){const plan=highJobPlan(work,work.job.type),materials=roomDoorVisualBoxes(work,plan,highActorAt(work));for(const b of materials){const c=Math.abs(Math.cos(b.angle)),s=Math.abs(Math.sin(b.angle));boxes.push({...b,w:b.w*c+b.d*s,d:b.w*s+b.d*c,angle:0,kind:'room-material'});if(b.tilt===Math.PI/2)surfaces.push({...boxes.at(-1),y:b.y+b.h/2});}}
 return {surfaces:surfaces.map((b,i)=>({...b,...highWorldPoint(site,b),id:'high-floor-'+i})),boxes:boxes.map((b,i)=>({...b,...highWorldPoint(site,b),id:'high-solid-'+i})),angle:site.turn*Math.PI/2};
}

const foundations=new WeakMap();
export function assertHighFoundation(record,transport){
 if(!record)return true;validateHighWorld(record);if(record.version===2){for(const p of record.projects)assertHighFoundation(p.record,transport);return true;}
 const soil=transport?.work?.frame?.soil;ok(soil,'建物を支える地面の記録が見つからないよ。');
 const key=JSON.stringify(record.site),trusted=isCapturedConstructionJson(soil),cache=trusted?foundations.get(soil):null;
 if(cache?.has(key))return true;
 // Mutable inputs never share the terrain reader's WeakMap measurements.
 const checked=trusted?transport:structuredClone(transport),terrain={...checked,work:{...checked.work,frame:{...checked.work.frame,job:null}}},b=highSiteBounds(record.site,record.work);
 const g=inspectBuildingGround([b.x,record.site.y,b.z],[b.w,b.h,b.d],{heightAt:(x,z)=>transportGroundHeightAt(terrain,x,z)??0});
 ok(g.valid&&Math.abs(g.y-record.site.y)<.001,'建物の下の地面が変わるため、その作業はできないよ。建物と材料を残して止めたよ。');
 if(trusted){const set=cache??new Set();if(set.size>=32)set.clear();set.add(key);foundations.set(soil,set);}return true;
}

// Keep animation that advanced while an identical checkpoint was being written.
// Only the in-memory elapsed time is merged; committed materials/site remain authoritative.
export function acceptHighProgress(saved,local){
 if(saved?.version===2||local?.version===2){if(saved?.version!==2||local?.version!==2||saved.selected!==local.selected||saved.revision!==local.revision+1)return saved;const a=highSelected(saved),b=highSelected(local);if(!a||!b)return saved;const merged=acceptHighProgress(a,b);return {...saved,projects:saved.projects.map(p=>p.id===saved.selected?{...p,record:merged}:p)};}
 if(!saved?.work.job||!local?.work.job||saved.revision!==local.revision+1||JSON.stringify(saved.site)!==JSON.stringify(local.site)||saved.work.revision!==local.work.revision||saved.work.job.type!==local.work.job.type||JSON.stringify(saved.work.job.station)!==JSON.stringify(local.work.job.station))return saved;
 return validateHighWorld({...saved,work:{...saved.work,job:{...saved.work.job,elapsed:Math.max(saved.work.job.elapsed,local.work.job.elapsed)}}});
}

export const HIGH_PROJECT_LIMIT=8;
export function highProjects(r){return !r?[]:r.version===2?r.projects:[{id:'building-1',record:r}];}
export function highSelected(r){return r?.version===2?r.projects.find(p=>p.id===r.selected)?.record??null:r??null;}
export function highSelectedId(r){return r?.version===2?r.selected:r?'building-1':null;}
export function highWorldTimber(r){return highProjects(r).reduce((n,p)=>n+highMaterialCost(p.record.work.version>=2?p.record.work.blueprint:null)+roomLayoutWood(p.record.work)+((p.record.work.entranceDoor||p.record.work.job?.type==='DOOR_INSTALL')?ENTRANCE_DOOR_TIMBER:0),0);}
export function withHighWork(r,work){if(r.version!==2)return{...r,work};return{...r,projects:r.projects.map(p=>p.id===r.selected?{...p,record:{...p.record,work}}:p)};}
const overlaps=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+8&&Math.abs(a.z-b.z)<(a.d+b.d)/2+8;
function validateCollection(r){
 ok(Object.keys(r).sort().join('|')==='nextId|projects|revision|scope|selected|version'&&r.scope===HIGH_WORLD_SCOPE&&Number.isSafeInteger(r.revision)&&r.revision>=0&&Number.isSafeInteger(r.nextId)&&r.nextId>=1,'建物の一覧を保護したよ。');
 ok(Array.isArray(r.projects)&&r.projects.length<=HIGH_PROJECT_LIMIT,'建物の数をたしかめよう。');const ids=new Set();let jobs=0;
 for(const p of r.projects){ok(p&&Object.keys(p).sort().join('|')==='id|record'&&/^building-[1-9][0-9]*$/.test(p.id)&&Number(p.id.slice(9))<r.nextId&&!ids.has(p.id),'建物の番号が重なっているよ。');ids.add(p.id);ok(p.record?.version===1,'建物の形が読めないよ。');validateHighWorld(p.record);if(p.record.work.job){jobs++;ok(r.selected===p.id,'途中の建物を残してから切り替えよう。');}}
 ok(jobs<=1&&(r.projects.length?ids.has(r.selected):r.selected===null),'選んだ建物をたしかめよう。');
 for(let i=0;i<r.projects.length;i++)for(let j=0;j<i;j++)ok(!overlaps(highSiteBounds(r.projects[i].record.site,r.projects[i].record.work),highSiteBounds(r.projects[j].record.site,r.projects[j].record.work)),'作業台や階段が重なるよ。少し離して置こう。');return r;
}
export function transitionHighWorld(old,a){
 if(old?.version!==2&&!(a.type==='PLACE'&&a.blueprint))return transitionSingle(old,a);
 if(old)validateHighWorld(old);
 let r=old?.version===2?structuredClone(old):{scope:HIGH_WORLD_SCOPE,version:2,revision:old?.revision??0,nextId:old?2:1,selected:old?'building-1':null,projects:highProjects(old).map(p=>structuredClone(p))};
 if(a.type==='PLACE'){
  validateHighShape(a.blueprint);ok(!r.projects.some(p=>p.record.work.job),'いまの作業を終えてから建てよう。');ok(r.projects.length<HIGH_PROJECT_LIMIT,'高い建物は8棟まで置けるよ。');
  const id='building-'+r.nextId++,record=transitionSingle(null,a);r.projects.push({id,record});r.selected=id;
 }else if(a.type==='SELECT'){
  ok(!r.projects.some(p=>p.record.work.job),'いまの作業を終えてから切り替えよう。');ok(r.projects.some(p=>p.id===a.id),'その建物は見つからないよ。');r.selected=a.id;
 }else{
  ok(a.projectId===r.selected,'別の建物を変えないように止めたよ。');const p=r.projects.find(p=>p.id===r.selected);ok(p,'建物をえらぼう。');const next=transitionSingle(p.record,a);
  if(next)p.record=next;else{r.projects=r.projects.filter(v=>v!==p);r.selected=r.projects[0]?.id??null;}
 }
 r.revision++;return validateHighWorld(r);
}
