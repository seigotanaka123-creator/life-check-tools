// Authoritative received timber; reuses the approved finite crane/float solver.
import {initialWorldTimberPhysics,validatePurchasedTimber,refreshTimberLedger,timberCopyTotals,timberPhysicsState,FLOOR_VOLUME} from './imasora-construction-purchased-timber.js';
import {cranePlayer,cranePersonBlocked,craneWalkVolumes} from './imasora-construction-crane-walk.js';
import {assemblyState,worldAssemblyAction,advanceWorldAssembly,validateWorldAssembly,floatingView,stepFloating} from './imasora-construction-world-timber-assembly.js';
import {polygon} from './imasora-construction-loader-physics.js';
export {FLOOR_VOLUME};
export const TIMBER_YARDS=Object.freeze([[760,650],[-760,650],[760,-1000],[-760,-1000]].map(Object.freeze));
export const WORLD_TIMBER_SCOPE='construction-world-timber-v1';
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);},int=v=>Number.isSafeInteger(v)&&v>=0;
export function initialWorldTimber(siteIndex=0,received=0){return validateWorldTimber({schema:1,scope:WORLD_TIMBER_SCOPE,siteIndex,revision:0,work:assemblyState(initialWorldTimberPhysics(received/FLOOR_VOLUME))},received);}
export function worldTimberTotals(s){const t=timberCopyTotals(s.work);return{...t,inUse:s.work.parts.length*FLOOR_VOLUME};}
export function validateWorldTimber(s,received){
  ok(s&&Object.keys(s).sort().join('|')==='revision|schema|scope|siteIndex|work','木材作業の項目が不正です。');
  ok(s.schema===1&&s.scope===WORLD_TIMBER_SCOPE&&int(s.siteIndex)&&!!TIMBER_YARDS[s.siteIndex]&&int(s.revision),'木材作業の区画・版が不正です。');
  ok(int(received)&&received%FLOOR_VOLUME===0&&s.work?.source?.mode==='world'&&s.work.source.total*FLOOR_VOLUME<=received,'受取済みの火星木材だけを使えます。');
  validatePurchasedTimber(s.work);validateWorldAssembly(s.work);return s;
}
export function syncWorldTimber(s,received){validateWorldTimber(s,received);const delta=received/FLOOR_VOLUME-s.work.source.total;if(!delta)return s;const n=copy(s);n.work.source.total+=delta;n.work.stock+=delta;refreshTimberLedger(n.work);n.revision++;return validateWorldTimber(n,received);}
export function enterWorldTimber(s,position,received){
  const n=copy(syncWorldTimber(s,received)),[x,z]=TIMBER_YARDS[n.siteIndex],p=cranePlayer({...position,x:position.x-x,z:position.z-z,heading:position.heading||0,vy:0,grounded:true});
  ok([p.x,p.y,p.z,p.heading].every(Number.isFinite)&&p.y>=0&&p.y<=220,'着地してから木材作業を始めてください。');
  ok(Math.hypot(p.x-n.work.rig.vehicle.x,p.z-n.work.rig.vehicle.z)<=112,'クレーンに近づいてください。');
  if(n.work.rig.mode==='foot'){ok(!cranePersonBlocked(floatingView(timberPhysicsState(n.work)),p),'足元や車体から離れてください。');n.work.rig.player=p;}
  n.work=assemblyState(n.work);n.work.paused=false;n.revision++;return validateWorldTimber(n,received);
}
export function worldTimberAction(s,action,id,received){s=syncWorldTimber(s,received);const w=worldAssemblyAction(s.work,action,id);if(w===s.work)return s;const n={...s,revision:s.revision+1,work:w};return w.rig.transition?n:validateWorldTimber(n,received);}
export function advanceWorldTimber(s,input,dt){const w=advanceWorldAssembly(s.work,input,dt);return w===s.work?s:{...s,revision:s.revision+1,work:w};}
export function timberCheckpoint(s){validateWorldTimber(s,s.work.source.total*FLOOR_VOLUME);const n=copy(s);n.work.paused=true;n.work.rig.vehicle.speed=0;return n;}
export function validateTimberContinuation(old,next){if(!old)return;
  ok(old.siteIndex===next.siteIndex&&next.revision>=old.revision&&next.work.revision>=old.work.revision&&next.work.source.total>=old.work.source.total,'古い木材作業や別の区画へ戻せません。');
  ok(next.work.events.length>=old.work.events.length,'木材の履歴を消せません。');
  old.work.events.forEach((e,i)=>ok(JSON.stringify(e)===JSON.stringify(next.work.events[i]),'木材の履歴を変更できません。'));
  if(old.work.rotation&&next.work.rotation?.partId===old.work.rotation.partId&&next.work.rotation.start===old.work.rotation.start)ok(next.work.rotation.elapsed>=old.work.rotation.elapsed,'回転途中の時間を戻せません。');
  ok((next.work.assemblyRevision??0)>=(old.work.assemblyRevision??0),'接合・分離の作業番号を戻せません。');
  const a=old.work.joining,b=next.work.joining;
  if(a&&b&&a.operation===b.operation){ok(a.partId===b.partId&&a.targetId===b.targetId&&JSON.stringify(a.start)===JSON.stringify(b.start)&&JSON.stringify(a.end)===JSON.stringify(b.end)&&b.elapsed>=a.elapsed,'接合途中の経路や時間を戻せません。');}
}
// When main-world walking owns input, only the existing spring solver runs here.
// It returns the rider displacement; it never drives/walks the main character twice.
export function idleWorldTimber(s,actor,dt){
  if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error('木材の更新刻みが不正です。');
  if(s.work.rig.mode!=='foot'||s.work.held||s.work.rotation||s.work.rig.transition||!s.work.parts.some(p=>p.hover))return{state:s,carry:{x:0,y:0,z:0}};
  const w={...assemblyState(s.work),phase:s.work.phase+dt},physics=copy(timberPhysicsState(w)),[x,z]=TIMBER_YARDS[s.siteIndex];
  const p=actor?cranePlayer({...actor,x:actor.x-x,z:actor.z-z}):{x:-260,y:0,z:-190,heading:0,vy:0,grounded:true};
  physics.rig={...physics.rig,player:p};const before={...p},revision=physics.revision;
  while(w.phase>=1/120-1e-9){stepFloating(physics,1/120);w.phase=Math.max(0,w.phase-1/120);}if(w.phase<1e-9)w.phase=0;
  w.parts=physics.parts;w.revision=physics.revision;
  // Saved actor follows a moving floor too, so re-entry/saves cannot keep buried feet.
  const safeActor=actor&&Math.abs(p.x)<=304&&Math.abs(p.z)<=234&&p.y>=0&&p.y<=220&&!cranePersonBlocked(floatingView(physics),p);
  w.rig={...w.rig,player:safeActor?{...p}:cranePlayer({x:-260,y:0,z:-190,heading:0})};
  const carry={x:p.x-before.x,y:p.y-before.y,z:p.z-before.z};
  return{state:{...s,revision:s.revision+(physics.revision!==revision?1:0),work:w},carry};
}
export function worldTimberGeometry(s){const [x,z]=TIMBER_YARDS[s.siteIndex];return s.work.parts.map(p=>({
  id:`construction-timber-${p.id}`,buildingId:'construction-timber',x:x+p.x,z:z+p.z,rotation:p.angle,
  halfX:p.w/2,halfZ:p.d/2,localHalfX:p.w/2,localHalfZ:p.d/2,height:p.y+p.h,underside:p.y,
  minY:p.y,maxY:p.y+p.h,obstacleHeight:p.y+p.h,physicsSource:'authored-physics-mesh',polygon:polygon({x:x+p.x,z:z+p.z,heading:p.angle},p.w,p.d),
}));}
export function worldTimberVehicleVolumes(s){const[x,z]=TIMBER_YARDS[s.siteIndex];return craneWalkVolumes({...s.work,parts:[]}).map(b=>({...b,x:x+b.x,z:z+b.z}));}
// Thin finite edges, not a wall extending from floating wood to the ground.
export function timberEdges(g){return g.polygon.map((a,i)=>{const b=g.polygon[(i+1)%4],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l*.09,nz=dx/l*.09;return{
  id:`${g.id}-edge-${i}`,buildingId:g.buildingId,surfaceId:g.id,x:(a.x+b.x)/2,z:(a.z+b.z)/2,rotation:Math.atan2(-dz,dx),localHalfX:l/2,localHalfZ:.09,halfX:l/2,halfZ:.09,
  minY:g.minY,maxY:g.maxY,obstacleHeight:g.height,stepAdjacent:true,surfaceEdge:true,physicsSource:g.physicsSource,
  polygon:[{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}],
};});}
