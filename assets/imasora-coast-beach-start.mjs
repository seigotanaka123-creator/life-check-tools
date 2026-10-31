import {coastBerthLineId,coastHomeBerthAnchor} from './imasora-coast-island-harbors.mjs?v=120lr';
import {coastNavigationShape} from './imasora-coast-voyage-retry.mjs?v=120nz';
// Retire the old beach demonstration only in an untouched save. A player's
// assemblies, moved equipment, history and the ready-to-sail pier boat remain.
const starters={
 'sea-1':{type:'cargo',x:12,z:430},'sea-2':{type:'board',x:72,z:287},
 'sea-3':{type:'float',x:-35,z:297},'sea-4':{type:'float',x:-60,z:297}
};
function retireDemonstration(play){
 if(play.edit!==0||play.history.length||play.voyage||play.salvage||play.islandBoard||play.boatBook||play.harbor)return play;
 const ids=new Set(play.parts.filter(p=>{
  const a=starters[p.id];return a&&a.type===p.type&&Math.hypot(p.p[0]-a.x,p.p[2]-a.z)<25&&!play.links.some(j=>j.a===p.id||j.b===p.id);
 }).map(p=>p.id));
 if(!ids.size)return play;
 const next=structuredClone(play);next.parts=next.parts.filter(p=>!ids.has(p.id));
 // Only the never-simulated starter boat receives the wider boarding gap.
 // An existing drifting/edited boat, including every old mooring save, keeps
 // its exact pose and momentum. Confirmed recovery uses the new berth too.
 const stock=[['sea-5','board',340,-1,642],['sea-6','float',299.4,-11.5,642],['sea-7','float',380.6,-11.5,642]],pristine=play.tick===0&&stock.every(([id,type,x,y,z])=>{const p=play.parts.find(p=>p.id===id);return p?.type===type&&JSON.stringify(p.p)===JSON.stringify([x,y,z])&&JSON.stringify(p.q)==='[0,0,0,1]'&&p.v.every(v=>v===0)&&p.w.every(v=>v===0);})&&[-1,1].every(side=>play.links.some(j=>j.id==='pier-line-'+side&&j.length===17));
 if(pristine){for(const [id] of stock)next.parts.find(p=>p.id===id).p[2]+=19;const deck=next.parts.find(p=>p.id==='sea-5');for(const j of next.links)if(j.kind==='moor'&&j.a==='sea-5'&&j.id.startsWith('pier-line-')){const side=j.localA[0]<0?-1:1;j.anchor=coastHomeBerthAnchor(side);j.id=coastBerthLineId('home',j.a,side,j.localA);j.length=Math.max(10,Math.ceil(Math.hypot(...deck.p.map((v,i)=>v+j.localA[i]-j.anchor[i]))));}}
 next.edit++;
 return next;
}

// The cargo game was explicitly withdrawn. Retain the real boat, its motion,
// seats, fittings, earned stock and the remaining ten reversible work steps.
// Historical receipt/source records are validated separately, not rewritten.
export const coastCargoOnlyLink=j=>/^(?:cargo-strap-|loading-(?:ramp|line)-|unload-(?:ramp|line|brake)-|work-moor-|align-moor-)/.test(j.id);
export function retireCoastCargo(play){
 const frames=[play,...play.history],dirty=f=>f.parts.some(p=>p.type==='cargo')||f.links.some(coastCargoOnlyLink)||!!f.voyage||!!f.salvage;
 if(play.cargoRetired===1&&!frames.some(dirty))return play;
 const next=structuredClone(play);
 const route=play.navigation,keepRoute=route?.board&&route.shape===coastNavigationShape(play,route.board);
 for(const f of[next,...next.history]){const ids=new Set(f.parts.filter(p=>p.type==='cargo').map(p=>p.id));f.parts=f.parts.filter(p=>!ids.has(p.id));f.links=f.links.filter(j=>!ids.has(j.a)&&!ids.has(j.b)&&!coastCargoOnlyLink(j));delete f.voyage;delete f.salvage;}
 if(keepRoute)next.navigation.shape=coastNavigationShape(next,route.board);
 next.cargoRetired=1;next.edit++;return next;
}
export function coastAdventureStart(play){return retireCoastCargo(retireDemonstration(play));}
