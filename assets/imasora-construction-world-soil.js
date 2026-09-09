// Received soil in the authoritative world. No purchase-copy import or storage API.
import {initialWorldSoilPhysics,purchasedSoilAction,advancePurchasedSoil,validatePurchasedSoil,soilCopyTotals,soilCopySurface,SOIL_SITE_SOLIDS} from './imasora-construction-purchased-soil.js';
export const SOIL_YARDS=Object.freeze([[1520,-750],[1520,750],[-1520,-750],[-1520,750]].map(Object.freeze));
export const WORLD_SOIL_SCOPE='construction-world-soil-v1';
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);},int=v=>Number.isSafeInteger(v)&&v>=0;
export function initialWorldSoil(siteIndex=0,received=0){const s={schema:1,scope:WORLD_SOIL_SCOPE,siteIndex,revision:0,work:initialWorldSoilPhysics(received/1000)};return validateWorldSoil(s,received);}
export function worldSoilTotals(s){const t=soilCopyTotals(s.work);return{...t,inUse:(t.bucket+t.ground+t.moving)*1000};}
export function validateWorldSoil(s,received){
  ok(s&&Object.keys(s).sort().join('|')==='revision|schema|scope|siteIndex|work','土作業の項目が不正です。');
  ok(s.schema===1&&s.scope===WORLD_SOIL_SCOPE&&int(s.revision)&&int(s.siteIndex)&&!!SOIL_YARDS[s.siteIndex],'土作業の区画・版が不正です。');
  ok(int(received)&&received%1000===0&&s.work.source.mode==='world'&&s.work.source.total*1000<=received,'受取済みの火星土だけを使えます。');
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
export function worldSoilAction(s,action,id,received){s=syncWorldSoil(s,received);const w=purchasedSoilAction(s.work,action,id);if(w===s.work)return s;return validateWorldSoil({...s,revision:s.revision+1,work:w},received);}
export function advanceWorldSoil(s,input,dt){const w=advancePurchasedSoil(s.work,input,dt);return w===s.work?s:{...s,revision:s.revision+1,work:w};}
export function soilCheckpoint(s){const n=copy(s);n.work.paused=true;n.work.loader.vehicle.speed=0;return n;}
export function validateSoilContinuation(old,next){if(!old)return;
  ok(old.siteIndex===next.siteIndex&&next.revision>=old.revision&&next.work.revision>=old.work.revision&&next.work.source.total>=old.work.source.total,'古い土作業・別の区画へ戻せません。');
  ok(next.work.operations.length>=old.work.operations.length,'土作業の履歴を消去できません。');
  old.work.operations.forEach((o,i)=>ok(o.id===next.work.operations[i].id&&o.kind===next.work.operations[i].kind,'土作業の履歴を変更できません。'));
  if(next.work.task?.id===old.work.task?.id&&old.work.task)ok(next.work.task.elapsed>=old.work.task.elapsed,'移送中の時刻を戻せません。');
}
export function worldSoilSurface(s,p){const [x,z]=SOIL_YARDS[s.siteIndex];return soilCopySurface(s.work,{...p,x:p.x-x,z:p.z-z});}
export function worldSoilFloors(s){const [x,z]=SOIL_YARDS[s.siteIndex];return s.work.patches.map(p=>({id:`construction-soil-${p.id}`,buildingId:'construction-soil',x:x+p.x,z:z+p.z,rotation:0,size:[32,32],height:2}));}
export {SOIL_SITE_SOLIDS};
