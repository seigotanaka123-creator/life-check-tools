import {coastHeight} from './imasora-coast-layout.mjs?v=120mx';
import {COAST_ISLANDS,legacyIslandAt} from './imasora-coast-geography.mjs?v=120li';
const islandAt=(x,z)=>z>=1030?legacyIslandAt(x,z):null;
// Migrate connected components rigidly. Do not scale hulls, velocities, joints,
// quantities or rewards. Every undo frame moves too; migration uses no undo slot.
export function migrateCoastChart(play,position=null){
 if(play.geography===2)return {play,position,changed:false};
 const next=structuredClone(play);let actorIsland=null,actorWithBoat=false;
 const frame=(s,actor)=>{
  const seen=new Set();
  for(const first of s.parts){if(seen.has(first.id))continue;const ids=new Set([first.id]);
   for(let more=true;more;){more=false;for(const j of s.links)if(j.b&&(ids.has(j.a)!==ids.has(j.b))){ids.add(j.a);ids.add(j.b);more=true;}}
   const members=s.parts.filter(p=>ids.has(p.id));members.forEach(p=>seen.add(p.id));
   const dock=s.links.find(j=>ids.has(j.a)&&j.id.startsWith('island-berth-'));
   const center=members.find(p=>p.type==='board')??first;
   const island=dock?COAST_ISLANDS.find(i=>i.legacy&&dock.id.startsWith('island-berth-'+i.port+'-')):islandAt(center.p[0],center.p[2]);
   if(actor&&members.some(p=>p.type==='board'&&Math.hypot(actor.x-p.p[0],actor.z-p.p[2])<110)){actorWithBoat=true;actorIsland=island;}
   if(!island)continue;
   for(const p of members){p.p[0]+=island.shiftX;p.p[2]+=island.shiftZ;}
   for(const j of s.links)if(ids.has(j.a)&&j.kind==='moor'){j.anchor[0]+=island.shiftX;j.anchor[2]+=island.shiftZ;}
  }
  for(const p of s.harbor?.items??[]){const i=islandAt(...p.point);if(i){p.point[0]+=i.shiftX;p.point[1]+=i.shiftZ;}}
  // The sea floor changes outside the preserved landing. Keep the boat fixed,
  // lower its bottom anchors to the new floor and preserve the rope's slack.
  for(const j of s.links)if(j.kind==='moor'&&/^(sea-anchor-|work-moor-|align-moor-)/.test(j.id)){
   const body=s.parts.find(p=>p.id===j.a),old=j.anchor[1],nextY=coastHeight(j.anchor[0],j.anchor[2]);if(Math.abs(nextY-old)<.001)continue;
   const d0=Math.hypot(body.p[0]-j.anchor[0],body.p[1]-old,body.p[2]-j.anchor[2]),d1=Math.hypot(body.p[0]-j.anchor[0],body.p[1]-nextY,body.p[2]-j.anchor[2]);
   j.anchor[1]=nextY;j.length=Math.max(6,Math.min(j.id.startsWith('align-')?260:j.id.startsWith('work-')?184.5:187,j.length+d1-d0));
  }
  s.geography=2;
 };
 frame(next,position);for(const h of next.history)frame(h,null);next.edit++;
 const island=actorWithBoat?actorIsland:(position&&islandAt(position.x,position.z));
 const moved=island?{...position,x:position.x+island.shiftX,z:position.z+island.shiftZ}:position;
 return {play:next,position:moved,changed:true};
}
