import {constructionMission,RAIN_WORKS_FOUNDATION_STEP,RAIN_WORKS_JOBS,rainWorksDepositRecorded,rainFoundationPad,RAIN_FOUNDATION_LOAD,RAIN_FOUNDATION_NAMES} from './imasora-construction-guide-data.mjs?v=121fc';
import {nativeStorageBin} from './imasora-construction-transport-field.mjs?v=120ov';
import {gardenEarthReserved} from './imasora-construction-garden.mjs?v=120ps';

import {assertWorkField,inWorkArea} from './imasora-construction-field-area.mjs?v=120ov';
// Received soil in the authoritative world. No purchase-copy import or storage API.
import {initialWorldSoilPhysics,purchasedSoilAction,advancePurchasedSoil,validatePurchasedSoil,soilCopyTotals,soilCopySurface,SOIL_SITE_SOLIDS} from './imasora-construction-purchased-soil.js?v=120pv';
import {polygon} from './imasora-construction-loader-physics.js?v=120ov';
import {soilBedRects,soilBedShape} from './imasora-construction-soil-bed.mjs?v=120eo';
import{SOIL_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
export{SOIL_YARDS};
export const WORLD_SOIL_SCOPE='construction-world-soil-v1';
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);},int=v=>Number.isSafeInteger(v)&&v>=0;
export function initialWorldSoil(siteIndex=0,received=0){const s={schema:1,scope:WORLD_SOIL_SCOPE,siteIndex,revision:0,work:initialWorldSoilPhysics(received/1000)};return validateWorldSoil(s,received);}
export function worldSoilTotals(s){const t=soilCopyTotals(s.work);return{...t,inUse:(t.bucket+t.ground+t.moving)*1000};}
export function validateWorldSoil(s,received){
  ok(s&&Object.keys(s).sort().join('|')==='revision|schema|scope|siteIndex|work','土作業の項目が不正です。');
  ok([1,2].includes(s.schema)&&s.scope===WORLD_SOIL_SCOPE&&int(s.revision)&&int(s.siteIndex)&&!!SOIL_YARDS[s.siteIndex],'土作業の区画・版が不正です。');
  assertWorkField(s,SOIL_YARDS[s.siteIndex]);
  ok(int(received)&&received%1000===0&&s.work.source.mode==='world'&&s.work.source.total*1000<=received,'受取済みのアマネ星土だけを使えます。');
  validatePurchasedSoil(s.work);
  let reserved=0,laid=0;
  for(const o of s.work.operations){if(o.kind==='load')reserved+=4;if(o.kind==='store'&&s.work.task?.id!==o.id)reserved-=4;if(o.kind==='lay')laid++;ok(reserved>=0&&reserved<=s.work.source.total,'土の出庫履歴が不正です。');}
  ok(reserved*1000===worldSoilTotals(s).inUse&&s.work.nextId===laid+1,'保管量と作業履歴が一致しません。');return s;
}
export function syncWorldSoil(s,received){validateWorldSoil(s,received);const delta=received/1000-s.work.source.total;if(!delta)return s;const n=copy(s);n.work.source.total+=delta;n.work.stock+=delta;n.revision++;return validateWorldSoil(n,received);}
export function enterWorldSoil(s,position,received){
  let n=copy(syncWorldSoil(s,received));const [x,z]=SOIL_YARDS[n.siteIndex],p={x:position.x-x,z:position.z-z,y:position.y,heading:position.heading||0};
  ok(Number.isFinite(p.y)&&p.y>=0&&p.y<=2.01,'地面に着地してから作業してください。');
  ok(Math.hypot(p.x-n.work.loader.vehicle.x,p.z-n.work.loader.vehicle.z)<=112,'土のローダーへ近づいてください。');
  // Preserve an interrupted transfer or boarding path; never cancel its material.
  if(n.work.loader.mode==='foot'&&!n.work.task){n.work.loader.player=p;n.work.body={...n.work.body,vy:0,grounded:true,flight:null,jumpHeld:false};}
  n.work.paused=false;n.revision++;return validateWorldSoil(n,received);
}
export function worldSoilMaterialObstacles(loader,external=[],heightAt=null){
  const v=loader?.vehicle;if(!v||!Array.isArray(external))return[];
  const base=v.field&&loader.mode==='foot'&&typeof heightAt==='function'?(heightAt(loader.player.x,loader.player.z)??0):0;
  return external.filter(b=>b&&!(v.field&&typeof heightAt==='function'&&b.y+b.h<=(heightAt(b.x,b.z)??-Infinity)+.05)&&b&&[b.x,b.y,b.z,b.w,b.h,b.d,b.angle??0].every(Number.isFinite)&&b.w>0&&b.h>0&&b.d>0&&(v.field?b.y+b.h>0:b.y<44&&b.y+b.h>8)&&[v,...(v.field?[loader.player]:[])].some(p=>Math.abs(b.x-p.x)<175+Math.hypot(b.w,b.d)/2&&Math.abs(b.z-p.z)<175+Math.hypot(b.w,b.d)/2))
    .map(b=>({id:b.name||b.id||'建材',supportSurface:!!b.supportSurface,heightOffset:base,actorGround:loader.mode==='foot'?base:v.groundY??0,x:b.x,z:b.z,width:b.w,depth:b.d,height:b.y+b.h-base,minY:b.y-base,angle:b.angle||0}));
}
export function worldSoilAction(s,action,id,received,external=[],heightAt=null){s=syncWorldSoil(s,received);const obstacles=worldSoilMaterialObstacles(s.work.loader,external,heightAt),w=purchasedSoilAction(s.work,action,id,obstacles,heightAt);if(w===s.work)return s;return validateWorldSoil({...s,revision:s.revision+1,work:w},received);}
export function advanceWorldSoil(s,input,dt,external=[],heightAt=null){const obstacles=worldSoilMaterialObstacles(s.work.loader,external,heightAt),w=advancePurchasedSoil(s.work,input,dt,obstacles);return w===s.work?s:{...s,revision:s.revision+1,work:w};}
export function soilCheckpoint(s){const n=copy(s);n.work.paused=true;n.work.loader.vehicle.speed=0;return n;}
export function validateSoilContinuation(old,next){if(old&&(old.schema!==next.schema||JSON.stringify((old.work.loader??old.work.rig).vehicle.field)!==JSON.stringify((next.work.loader??next.work.rig).vehicle.field)))throw Error('駐車場の移設は専用の保存で行ってください。');if(!old)return;
  ok(old.siteIndex===next.siteIndex&&next.revision>=old.revision&&next.work.revision>=old.work.revision&&next.work.source.total>=old.work.source.total,'古い土作業・別の区画へ戻せません。');
  ok(next.work.operations.length>=old.work.operations.length,'土作業の履歴を消去できません。');
  old.work.operations.forEach((o,i)=>ok(o.id===next.work.operations[i].id&&o.kind===next.work.operations[i].kind,'土作業の履歴を変更できません。'));
  if(next.work.task?.id===old.work.task?.id&&old.work.task){ok(next.work.task.elapsed>=old.work.task.elapsed,'移送中の時刻を戻せません。');ok(JSON.stringify(soilBedShape(next.work.task.patch))===JSON.stringify(soilBedShape(old.work.task.patch)),'移送中の土の形を変更できません。');}
  for(const p of [...old.work.patches,...(old.work.task?.patch?[old.work.task.patch]:[])]){const q=next.work.patches.find(q=>q.id===p.id)??(next.work.task?.patch?.id===p.id?next.work.task.patch:null);if(q)ok(JSON.stringify(soilBedShape(p))===JSON.stringify(soilBedShape(q)),'敷いた土の形を変更できません。');}
}
export function worldSoilSurface(s,p){const [x,z]=SOIL_YARDS[s.siteIndex];return soilCopySurface(s.work,{...p,x:p.x-x,z:p.z-z},s.schema===2);}
export function worldSoilFloors(s){const [x,z]=SOIL_YARDS[s.siteIndex];return s.work.patches.flatMap(p=>soilBedRects(p).map((r,i)=>({id:`construction-soil-${p.id}${p.heights?'-'+i:''}`,buildingId:'construction-soil',x:x+r.x,z:z+r.z,rotation:0,size:[r.width,r.depth],halfX:r.width/2,halfZ:r.depth/2,underside:r.y,height:r.y+2})));}
export function worldSoilContactGeometry(s){
  const floors=worldSoilFloors(s),walls=[];
  for(const floor of floors){
    if(!Array.isArray(floor.size)||floor.size.length!==2||![floor.x,floor.z,floor.rotation,floor.size[0],floor.size[1],floor.height].every(Number.isFinite)||floor.size.some(v=>v<=0)||floor.height<=(floor.underside??0))continue;
    const points=polygon({x:floor.x,z:floor.z,heading:floor.rotation},floor.size[0],floor.size[1]);
    points.forEach((a,index)=>{const b=points[(index+1)%points.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(length<=.05)return;
      walls.push({id:`${floor.id}-edge-${index}`,surfaceId:floor.id,buildingId:'construction-soil',x:(a.x+b.x)/2,z:(a.z+b.z)/2,rotation:Math.atan2(-dz,dx),localHalfX:length/2,localHalfZ:.09,minY:floor.underside??0,maxY:floor.height,obstacleHeight:floor.height,stepAdjacent:true,surfaceEdge:true});
    });
  }
  return{floors,walls};
}
export {SOIL_SITE_SOLIDS};

export function rainLoaderPlan(world,work){
 const mission=world?.constructionCourseV1&&constructionMission(world);
 if(world?.constructionCourseV1&&mission?.kind!=='foundation')return null;
 const story=mission?{step:mission.step}:world?.rainWorksV1,job=RAIN_WORKS_JOBS[story?.step],transport=world?.constructionTransport?.work,soil=transport?.frame.soil;
 if(world?.map!=='construction'||!mission&&world.rainStoryV1?.at(-1)!=='cloud-rescue-complete'||story?.cargo||soil?.schema!==3||
    !(job?.vehicle==='soil'||job?.vehicle==='dump'&&!story.excavatorTrial&&rainWorksDepositRecorded(soil)))return null;
 const rig=work?.work.loader,v=rig?.vehicle,field=soil.field,cargo=soil.containers.rainLoader?.amount??0;
 // Let a player finish unloading any purple soil already in the bucket.
 if(work?.work.load||work?.work.task)return null;
 const batch=job.vehicle==='soil'?job.batch:0,operation=cargo?'place':'load';
 const pad=rainFoundationPad(field,batch),name=RAIN_FOUNDATION_NAMES[batch],bin=nativeStorageBin(soil),[ox,oz]=field.origin;
 const binX=ox+bin.x,binZ=oz+bin.z;
 const sign=bin.approachSign??1,east=field.corner.endsWith('west')?1:-1;
 const x=v?.field?v.x+v.field.origin[0]:null,z=v?.field?v.z+v.field.origin[1]:null;
 const front={x:binX,z:binZ-sign*(bin.depth/2+60),heading:sign>0?0:Math.PI};
 const side={x:binX-east*(bin.width/2+66),z:binZ-sign*12};
 side.heading=Math.atan2(binX-side.x,binZ-side.z);
 // Keep the original approach usable while guiding new drivers to the open aisle.
 const atFront=v?.field&&Math.hypot(x-front.x,z-front.z)<38&&Math.cos(v.heading-front.heading)>.87;
 const target=cargo?pad:bin.clustered&&!atFront?side:front;
 const stored=Math.max(0,soil.containers.storage.amount-gardenEarthReserved(world.constructionHighBuild));
 const plan={batch,operation,name,target,pad,cargo,stored,step:Math.max(story.step,RAIN_WORKS_FOUNDATION_STEP)};
 let reason='';
 if(work?.schema!==2||v?.field?.corner!==field.corner||rig.mode!=='driving')reason='土ローダーの運転席に乗ろう。';
 else if(transport.mode!=='foot'||transport.link||transport.scoop||transport.unload||soil.pending)reason='ショベルカーとダンプの作業を終えてから土を運ぼう。';
 else if(work.work.paused||Math.abs(v.speed)>=.01)reason='停車してから土を扱おう。';
 else if(Math.abs(v.groundY??0)>.1)reason='地面の作業位置へ戻ろう。';
 else if(!cargo&&stored<RAIN_FOUNDATION_LOAD)reason='台座3つ分の土が足りないよ。ダンプで保管庫に土を運ぼう。';
 else{
  const s=Math.sin(v.heading),c=Math.cos(v.heading);
  const dx=(cargo?target.x:binX)-x,dz=(cargo?target.z:binZ)-z;
  const forward=dx*s+dz*c,lateral=dx*c-dz*s;
  if(cargo){
   if(forward<54||forward>75||Math.abs(lateral)>17)reason=name+'の枠をバケットの正面に合わせよう。';
   else plan.path={x:x+dx*.83,z:z+dz*.83,y:7,w:28,h:14,d:forward*.34+5,angle:v.heading};
  }else{
   const isSide=target===side,halfDepth=(isSide?bin.width:bin.depth)/2;
   const across=isSide?Math.abs(z-binZ):Math.abs(x-binX);
   if(!bin.clustered||forward<halfDepth+(isSide?46:52)||forward>halfDepth+(isSide?73:68)||
      across>(isSide?bin.depth:bin.width)/2-8||Math.abs(lateral)>16||Math.cos(v.heading-target.heading)<.94)
    reason='保管庫の青い枠に停車し、バケットを保管庫に向けよう。';
   else plan.path={x:x+s*47,z:z+c*47,y:11,w:28,h:20,d:14,angle:v.heading};
  }
 }
 return {...plan,reason};
}
