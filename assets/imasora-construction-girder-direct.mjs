import {girderPickupOption,girderInstallOption} from './imasora-construction-girder-transfer.mjs?v=120pv';
import {girders,girderSupply,girderTarget} from './imasora-construction-girder-shape.mjs?v=120pl';
import {craneUpperTargets,startUpperDelivery} from './imasora-construction-high-crane.mjs?v=120pv';
import {hook} from './imasora-construction-crane.js?v=120pv';
import {TIMBER_YARDS} from './imasora-construction-yard-origins.mjs?v=120gb';
import {reelWorldParts} from './imasora-construction-reel-world.mjs?v=120ps';
import {VEHICLE_CONTACT} from './imasora-construction-concrete/free-vehicle-shape.mjs?v=120ov';
// The live motor must meet the same actual floor/column geometry as the writer.
// The caller caches this only until the immutable building or origin changes.
export function directReelObstacles(high,origin){const gap=VEHICLE_CONTACT.clearance+.005;return reelWorldParts(high).map(b=>({...b,x:b.x-origin.x,y:b.y-b.h/2,z:b.z-origin.z,w:b.w+gap*2,d:b.d+gap*2,angle:0}));}
// Pure, bounded context for the visible scene. Only the last small docking
// movement may be assisted; travel and lifting remain the player's operation.
export function directGirderAction(world,posed=world?.constructionTimber?.work){
 const t=world?.constructionTimber;if(!t||!posed||posed.rig.mode!=='driving'||!posed.work)return null;
 const origin={x:TIMBER_YARDS[t.siteIndex][0],z:TIMBER_YARDS[t.siteIndex][1]},all=girders(world.constructionHighBuild?.reel?.rooms??[]),binding=posed.buildingKits?.find(b=>b.version===2),p=posed.parts.find(p=>p.id===binding?.partId);
 if(binding&&p){const target=craneUpperTargets(world.constructionHighBuild,posed,{origin}).find(t=>t.surface==='girder'&&!t.girderReturn);if(!target)return null;
  const q=girderInstallOption(world),g=all.find(g=>g.room.id===binding.roomId&&g.item.id===binding.detailId),shape=g?girderTarget(g.room,g.item):null,angle=shape?.axis==='z'?Math.PI/2:0,turn=Math.abs(Math.sin(p.angle-angle))>.001,near=Math.hypot(p.x-target.target.x,p.z-target.target.z)<=10&&p.y>=target.target.y-.15&&p.y<=target.target.y+24;
  return{action:turn?'rotate':q.ok?'install':'dock',enabled:!posed.rotation&&(turn||q.ok||target.ok&&near),label:turn?'梁を90°まわす':'柱の上に置く',note:turn?'光る枠と同じ向きにしよう':q.ok?'柱にそろったよ':near?'最後の位置合わせを手伝うよ':'光る柱の上へ、アームで運ぼう',target,marker:{...target.target,w:shape?.axis==='z'?12:binding.length,d:shape?.axis==='z'?binding.length:12,angle:0},part:p};
 }
 if(posed.held)return null;const h=hook(posed),ready=all.filter(g=>g.item.stage==='ready').map(g=>({...g,s:girderSupply(g.item.corner,g.room)})).sort((a,b)=>Math.hypot(a.s.x-origin.x-h.x,a.s.z-origin.z-h.z)-Math.hypot(b.s.x-origin.x-h.x,b.s.z-origin.z-h.z));if(!ready.length)return null;
 const g=ready[0],q=girderPickupOption(world),shape=girderTarget(g.room,g.item);
 return{action:'pick',enabled:q.ok,label:'梁にフックをつなぐ',note:q.ok?'つないだら、アームで持ち上げよう':'光る梁へフックを下ろそう',marker:{x:g.s.x-origin.x,y:g.s.y+16,z:g.s.z-origin.z,w:shape.length,d:12,angle:0}};
}
export function startGirderDock(world,posed){const q=directGirderAction(world,posed);if(q?.action!=='dock'||!q.enabled)throw Error('柱のすぐ上へ梁を運ぼう。');const job=startUpperDelivery(posed,q.target);return{...job,phase:4,settled:0};}
