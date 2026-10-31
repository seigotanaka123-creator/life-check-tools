import {SEA_PARTS,worldPoint,localPoint,rotate,seaFloor,coastSupport,coastAssembly,loadDeck,coastBodyPartContact} from './imasora-coast-physics.mjs?v=120nz';
import {COAST_WATER_Y,COAST_WORLD,coastPierContains,coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {COAST_HOME_PORT,COAST_ISLAND_PORTS,ISLAND_PORT_DECKS,islandPortSurface} from './imasora-coast-island-harbors.mjs?v=120lr';
import {islandPathSurface} from './imasora-coast-island-path.mjs?v=120li';

// A captive, telescoping boarding plank. It is part of the board's existing
// equipment, never a loan, recoverable resource, new save item or teleport.
export const COAST_GANGWAY=Object.freeze({width:36,maxLength:128,maxGrade:.65,deployedDeckGrade:.70,bodyHeight:42});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function coastGangwaySites(anchor,ground=seaFloor){
 const rows=[],seen=new Set();
 for(let r=0;r<=152;r+=8)for(let n=0;n<(r?24:1);n++){
  const a=n*Math.PI/12,x=Math.round((anchor[0]+Math.sin(a)*r)/4)*4,z=Math.round((anchor[2]+Math.cos(a)*r)/4)*4,key=x+':'+z;
  if(seen.has(key))continue;seen.add(key);if(Math.abs(x)>COAST_WORLD.width/2-12||Math.abs(z)>COAST_WORLD.depth/2-12)continue;const y=ground(x,z);
  if(!Number.isFinite(y)||y<COAST_WATER_Y+1)continue;
  // Both feet arrive on actual dry ground, not a water-height plane.
  if([[-8,-8],[-8,8],[8,-8],[8,8]].some(([dx,dz])=>{const h=ground(x+dx,z+dz);return h<COAST_WATER_Y-.5||Math.abs(h-y)>6;}))continue;
  rows.push({x,y,z,cost:Math.hypot(x-anchor[0],z-anchor[2])});
 }
 // A raised pier must meet the ramp at its seaward edge. A point several
 // steps inland would send the ramp through the slab as the tide falls.
 const edges=[];for(const p of [COAST_HOME_PORT,...COAST_ISLAND_PORTS])for(const dx of[0,-24,24,-40,40,-56,56]){
  const x=p.x+dx,z=p.edge,cost=Math.hypot(x-anchor[0],z-anchor[2]);
  if(cost<=152&&Math.abs(ground(x,z)-p.y)<.1)edges.push({x,y:p.y,z,cost,edgeOffset:Math.abs(dx)});
 }
 const order=(a,b)=>a.cost-b.cost||a.x-b.x||a.z-b.z;
 // Keep the home berth aligned with its visible central entrance. At high
 // tide the hinge is too steep at the slab's edge, so use a longer approach
 // on that same centreline instead of attaching sideways beside a railing.
 const home=[];for(let inset=0;inset<=32;inset+=4){const x=COAST_HOME_PORT.x,z=COAST_HOME_PORT.edge-inset,y=ground(x,z),cost=Math.hypot(x-anchor[0],z-anchor[2]);if(cost<=152&&Math.abs(y-COAST_HOME_PORT.y)<.1)home.push({x,y,z,cost});}
 // Land through the open centre between the existing posts. A nearer side
 // edge can clear a post at one tide height and then cross it as the hull dips.
 // A blocked centre still falls back to the other fully checked shore sites.
 return [...home,...edges.sort((a,b)=>a.edgeOffset-b.edgeOffset||order(a,b)),...rows.sort(order)];
}
export function coastGangwayPlan(play,boardId,site,{clear=()=>true,ground=seaFloor,verify=true,deployed=false,body=null,hingeSide=1,occupied=null}={}){
 const b=play.parts.find(p=>p.id===boardId&&p.type==='board');if(!b||!site)return null;
 const moor=play.links.find(j=>j.kind==='moor'&&j.a===boardId);if(!moor)return null;
 // Deploy below 33 degrees; retract above 35. A small load-transfer tilt
 // must not fold an already walkable plank under the person's feet. This
 // margin applies only to the hull, not to the plank's own slope/clearance.
 // New planks still wait for slow movement. Inverted/steep hulls, unmooring
 // and every blocked sample below still retract a deployed plank immediately.
 const deckGrade=deployed?COAST_GANGWAY.deployedDeckGrade:COAST_GANGWAY.maxGrade;
 const up=rotate(b.q,[0,1,0]);if(up[1]<1/Math.sqrt(1+deckGrade**2)||(!deployed&&Math.hypot(b.v[0],b.v[2])>8))return null;
 if(Math.abs(ground(site.x,site.z)-site.y)>.1)return null;
 const target=localPoint(b,[site.x,b.p[1],site.z]),[w,h,d]=SEA_PARTS.board.size;
 const bowCrossing=Math.abs(target[2])>Math.abs(target[0]);
 const group=coastAssembly(play,boardId),centralCargo=bowCrossing&&play.parts.some(p=>{if(p.type!=='cargo'||!(group.ids.has(p.id)||group.ids.has(loadDeck(play,p)?.id)))return false;const at=localPoint(b,p.p);return Math.abs(at[0])<.5&&Math.abs(at[2])<2;});
 if(centralCargo&&hingeSide!==1&&hingeSide!==-1)return null;
 // Buoyancy uses a coarse seabed. A loaded boat's landing must meet the same
 // real sand/deck used by walking, not a higher coarse island silhouette.
 const walkingGround=centralCargo&&ground===seaFloor?(x,z)=>Math.max(coastWalkingHeight(x,z),coastPierContains(x,z)?0:-Infinity,islandPortSurface(x,z),islandPathSurface(x,z)):ground;
 if(Math.abs(walkingGround(site.x,site.z)-site.y)>.1)return null;
 // A central load leaves the corners clear, not the old inboard hinge.
 // Bolt to a real deck corner so the whole body can turn beside the crate.
 // Every slope, body, obstacle and load check still runs.
 // Empty boats and the legacy forward-load layout keep their old hinge.
 const inset=centralCargo?0:12;
 const k=Math.min((w/2-inset)/Math.max(.0001,Math.abs(target[0])),(d/2-inset)/Math.max(.0001,Math.abs(target[2])));
 if(k>=1)return null;
 // Bolt the hinge inside the deck. Feet reach the real ramp before stepping
 // off the hull, so their weight transfers to shore before tipping the bow.
 // A tiny lift avoids coincident wood faces without creating a raised step.
 // Side crossings retain the raised shoe that clears adjacent pontoons.
 const from=worldPoint(b,[centralCargo?hingeSide*(w/2-2):target[0]*k,h/2+(bowCrossing?.12:3.8),target[2]*k]),to=[site.x,site.y+.2,site.z],dx=to[0]-from[0],dz=to[2]-from[2],distance=Math.hypot(dx,dz);
 if(distance<8||distance>COAST_GANGWAY.maxLength||Math.abs(to[1]-from[1])/distance>COAST_GANGWAY.maxGrade)return null;
 // These are the actual supporting slabs at the shore seam. Their top is
 // already checked below, independently of the full-body obstacle envelope.
 const floors=ISLAND_PORT_DECKS.filter(p=>Math.abs(site.x-p.x)<=p.halfX&&Math.abs(site.z-p.z)<=p.halfZ&&Math.abs(site.y-p.maxY)<.1).map(p=>p.id);
 const landing=floors[0]??(Math.abs(site.y)<.1&&coastPierContains(site.x,site.z)?'coast-home-pier':null),plan={id:boardId,from,to,width:COAST_GANGWAY.width,length:distance,normal:[dz/distance,-dx/distance],floors,landing};
 if(!verify)return plan;
 const person=body??{offsetX:-.6,offsetZ:1.26,halfX:13,halfZ:12.05,minY:.1,maxY:26.9};
 if(![person.offsetX,person.offsetZ,person.halfX,person.halfZ,person.minY,person.maxY].every(Number.isFinite)||person.halfX<=0||person.halfZ<=0||person.maxY<=person.minY)return null;
 // Keep supporting the final steps until the feet actually reach the shore
 // shoe. A percentage cutoff would remove the ramp a body-length too soon.
 const validActor=occupied&&[occupied.x,occupied.y,occupied.z].every(Number.isFinite),foot=deployed&&validActor?coastGangwaySupport([plan],occupied.x,occupied.z):null,walkFrom=foot&&foot.t>0&&foot.t<1&&Math.abs(foot.y-occupied.y)<.6?foot.t:0,deck=validActor?coastSupport(play,occupied.x,occupied.z,occupied.y):null,at=validActor?localPoint(b,[occupied.x,occupied.y,occupied.z]):null,attached=at&&occupied.board===boardId&&Math.abs(at[0])<=w/2+1&&Math.abs(at[2])<=d/2+1&&Math.abs(at[1]-h/2)<2.5,departing=centralCargo&&((deck?.id===boardId&&Math.abs(deck.y-occupied.y)<.6)||attached)&&Math.sign(at[0])===hingeSide;
 // No plank through cargo, another hull, a wall, a post or a rock. World
 // clearance uses the game's formal monster body after a cheap broad phase.
 for(let i=0,n=Math.ceil(distance/4);i<=n;i++){
  const t=i/n,p=from.map((v,j)=>v+(to[j]-v)*t);
  if(walkingGround(p[0],p[2])>p[1]+.3)return null;
  // clear() covers the actual body facing along the plank in both directions. Repeating that
  // envelope at the plank edges incorrectly rejects the pier's real opening.
  // A walkable pier top is a floor transition, not a wall at the forward
  // corner of the body's bounding box. clear() may step only on these real
  // slabs within the normal step height; posts/other obstacles stay solid.
  const heading=Math.atan2(dx,dz);if(!clear(p[0],p[1],p[2],heading,floors)||!clear(p[0],p[1],p[2],heading+Math.PI,floors))return null;
  if(centralCargo)for(const q of play.parts){if(q.id===boardId)continue;const top=q.type==='board'?coastSupport(play,p[0],p[2]):null;if(top?.id===q.id&&p[1]>=top.y-.3)continue;
   // Match the real upright monster against the full rolled part. The old
   // tall box at three plank offsets could count a nearby pontoon as a wall
   // even though the walker cleared it, retracting the only way ashore.
   const actor={x:p[0],y:p[1],z:p[2]};
   // A leaning load may obstruct a walker without touching the timber.
   // Keep that real occupied floor so walking can stop, move aside or wait;
   // the live full-body collision still blocks every step into the load.
   // Folding a sound floor because the space above it narrowed caused falls.
   // New routes still require the full body to clear; real timber contact
   // retracts even an occupied ramp.
   if(walkFrom){const timber={offsetX:0,offsetZ:0,halfX:plan.width/2,halfZ:2,minY:i===0?-4:-2.5,maxY:1.7};const hit=coastBodyPartContact(q,timber,actor,heading,0);if(!hit||hit.intersects)return null;continue;}
   for(const h of(departing?[heading]:[heading,heading+Math.PI])){const hit=coastBodyPartContact(q,person,actor,h);if(!hit||hit.intersects)return null;}
  }
  else for(const side of[-9,0,9]){
   const x=p[0]+plan.normal[0]*side,z=p[2]+plan.normal[1]*side;
   for(const q of play.parts){if(q.id===boardId)continue;const top=q.type==='board'?coastSupport(play,x,z):null;if(top?.id===q.id&&p[1]>=top.y-.3)continue;const local=localPoint(q,[x,p[1]+COAST_GANGWAY.bodyHeight/2,z]),size=SEA_PARTS[q.type].size;
    if(Math.abs(local[0])<size[0]/2+7&&Math.abs(local[2])<size[2]/2+7&&Math.abs(local[1])<size[1]/2+COAST_GANGWAY.bodyHeight/2-.5)return null;
   }
  }
 }
 return plan;
}
export function coastGangwaySupport(plans,x,z){
 for(const p of plans){const dx=x-p.from[0],dz=z-p.from[2],along=(dx*(p.to[0]-p.from[0])+dz*(p.to[2]-p.from[2]))/p.length,side=dx*p.normal[0]+dz*p.normal[1];
  // Rotated endpoints can round just outside [0,length]. Keep the actual
  // seam continuous; this microscopic tolerance never extends the plank.
  if(along<-.000001||along>p.length+.000001||Math.abs(side)>p.width/2)continue;const t=clamp(along/p.length,0,1);
  return{id:p.id,y:p.from[1]+(p.to[1]-p.from[1])*t,t,plan:p};
 }return null;
}
// Collision look-ahead at the shore shoe only. The body can reach the hull
// before the root enters the plank; this never supplies floor height, load,
// carrying or boarding to a person still standing on shore.
export function coastGangwayWalkContact(plans,from,to,ground=seaFloor,body=null,heading=0,footY=null){
 if(!plans.length)return null;
 const direct=coastGangwaySupport(plans,to.x,to.z)??coastGangwaySupport(plans,from.x,from.z);if(direct)return direct;
 const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);if(!(d>0&&d<=2.5+1e-6))return null;
 let ahead=Math.max(.75,d*1.15);
 // A short ramp can meet the real body's toes before its root reaches the
 // shore shoe. Measure only that forward extent; never grant floor/load or
 // a longer move. Unknown or airborne bodies keep the old small look-ahead.
 const measured=body&&[heading,footY,body.offsetX,body.offsetZ,body.halfX,body.halfZ,body.minY,body.maxY].every(Number.isFinite)&&body.halfX>0&&body.halfZ>0&&body.maxY>body.minY;
 if(measured){
  const c=Math.cos(heading),s=Math.sin(heading),ux=dx/d,uz=dz/d;
  const extent=Math.abs(c*ux-s*uz)*body.halfX+Math.abs(s*ux+c*uz)*body.halfZ,offset=(body.offsetX*c+body.offsetZ*s)*ux+(-body.offsetX*s+body.offsetZ*c)*uz;
  ahead=Math.max(ahead,offset+extent+.35);
 }
 for(const p of plans){
  const ux=(p.to[0]-p.from[0])/p.length,uz=(p.to[2]-p.from[2])/p.length,along=v=>(v.x-p.from[0])*ux+(v.z-p.from[2])*uz;
  const a=along(from),b=along(to),toward=-(dx/d*ux+dz/d*uz);if(a<p.length-1e-6||b<p.length-1e-6||toward<=0)continue;
  const reach=Math.max(0,(b-p.length)/toward);if(reach>ahead)continue;
  if(reach>Math.max(.75,d*1.15)&&(!measured||Math.abs(footY+.2-p.to[1])>.3))continue;
  const shoe={x:to.x+dx/d*reach,z:to.z+dz/d*reach};
  if([from,to,shoe].some(v=>Math.abs((v.x-p.from[0])*p.normal[0]+(v.z-p.from[2])*p.normal[1])>p.width/2))continue;
  let dry=true;for(let n=0,steps=Math.max(1,Math.ceil((d+reach)/2));n<=steps;n++){const t=n/steps,x=from.x+(shoe.x-from.x)*t,z=from.z+(shoe.z-from.z)*t,floor=ground(x,z);if(!Number.isFinite(floor)||Math.abs(floor+.2-p.to[1])>.3){dry=false;break;}}
  if(dry)return{id:p.id,y:p.to[1],t:1,plan:p,approach:true};
 }
 return null;
}
export function coastGangwayStep(plans,from,to,ground=seaFloor){
 const a=coastGangwaySupport(plans,from.x,from.z),b=coastGangwaySupport(plans,to.x,to.z);if(!a&&!b)return false;
 const p=(a??b).plan;
 const near=v=>{const dx=v.x-p.from[0],dz=v.z-p.from[2],t=(dx*(p.to[0]-p.from[0])+dz*(p.to[2]-p.from[2]))/(p.length*p.length);return t>=-.2&&t<=1.2&&Math.abs(dx*p.normal[0]+dz*p.normal[1])<=p.width/2+1;};
 if(!near(from)||!near(to))return false;
 const height=v=>coastGangwaySupport(plans,v.x,v.z)?.y??ground(v.x,v.z),distance=Math.hypot(to.x-from.x,to.z-from.z);
 return distance>0&&Math.abs(height(to)-height(from))<=distance*.8+.25;
}
export function coastGangwayLoad(plans,actor){
 const support=coastGangwaySupport(plans,actor.x,actor.z);if(!support||Math.abs(actor.y-support.y)>1)return null;
 return{id:support.id,point:support.plan.from,massFraction:clamp(1-support.t,0,1)};
}
// The forward silhouette reaches a landing before the root leaves the
// slope. Only that exact, unchanged supporting slab continues the plank.
// A toe may reach the exact shore slab one small step before the root reaches
// the hinge. Require real continuous deck support; this is collision clearance
// only and must never grant a plank height, load, carry or early boarding.
function hingeApproach(plans,from,to,footY,ground){
 const dx=to.x-from.x,dz=to.z-from.z,d=Math.hypot(dx,dz);if(!(d>0&&d<=2.5+1e-6))return null;
 for(const p of plans){const ux=(p.to[0]-p.from[0])/p.length,uz=(p.to[2]-p.from[2])/p.length,along=v=>(v.x-p.from[0])*ux+(v.z-p.from[2])*uz,a=along(from),b=along(to);
  if(a>=0||a< -2.5||b<=a||b>0||Math.abs(p.from[1]-footY)>.6)continue;
  if([from,to].some(v=>Math.abs((v.x-p.from[0])*p.normal[0]+(v.z-p.from[2])*p.normal[1])>p.width/2))continue;
  const side=(to.x-p.from[0])*p.normal[0]+(to.z-p.from[2])*p.normal[1],hinge={x:p.from[0]+side*p.normal[0],z:p.from[2]+side*p.normal[1]};let supported=true;
  for(let n=0;n<=4;n++){const t=n/4,y=ground(from.x+(hinge.x-from.x)*t,from.z+(hinge.z-from.z)*t);if(!Number.isFinite(y)||Math.abs(y-footY)>.6){supported=false;break;}}
  if(supported)return{plan:p,y:footY,hinge:true};
 }return null;
}
export function coastGangwayFloorPassage(plans,item,from,to,footY,ground=seaFloor){
 const floor=ISLAND_PORT_DECKS.find(p=>p.id===item?.id),rotation=item?.localRotation??item?.rotation??0;if(!floor||!Number.isFinite(footY)||!Number.isFinite(rotation)||Math.abs(rotation)>1e-8)return false;
 for(const key of['x','z','minY','maxY','halfX','halfZ']){const value=key==='halfX'?item.localHalfX??item.halfX:key==='halfZ'?item.localHalfZ??item.halfZ:item[key];if(!Number.isFinite(value)||Math.abs(value-floor[key])>1e-6)return false;}
 const contact=coastGangwaySupport(plans,from.x,from.z)??coastGangwaySupport(plans,to.x,to.z)??hingeApproach(plans,from,to,footY,ground);
 // Feet follow the continuous ramp, not a free step up to the pier top.
 // A full-body box can overlap that top before its root reaches the shoe.
 if(!contact||Math.abs(contact.y-footY)>.6||!contact.plan.floors?.includes(floor.id)||Math.abs(contact.plan.to[1]-.2-floor.maxY)>.1)return false;
 return contact.hinge===true||coastGangwayStep(plans,from,to,ground);
}
// Keep the same grounded foot on a moving plank, at the same distance along
// and across it. A different landing, retracted plank or discontinuous boat
// relocation is not a moving floor and must never teleport the person.
export function coastGangwayCarry(previous,plans,actor){
 if(!actor||![actor.x,actor.y,actor.z].every(Number.isFinite))return null;
 const old=coastGangwaySupport(previous,actor.x,actor.z);if(!old||old.t<=0||old.t>=1||Math.abs(old.y-actor.y)>.6)return null;
 const p=plans.find(p=>p.id===old.id);if(!p)return null;
 if(p.to.some((v,i)=>Math.abs(v-old.plan.to[i])>=.000001)){
  // The shore shoe can roll a short way on the same real pier as a tide
  // changes the required reach. It cannot cross water, change landings or
  // jump to a different island. Clearance is rechecked by the route planner
  // and the actual person's swept body check before committing any motion.
  const shift=Math.hypot(...p.to.map((v,i)=>v-old.plan.to[i]));if(!p.landing||p.landing!==old.plan.landing||shift>8||Math.abs(p.to[1]-old.plan.to[1])>.000001)return null;
  for(let i=0,n=Math.ceil(shift/2);i<=n;i++){const t=i/(n||1),x=old.plan.to[0]+(p.to[0]-old.plan.to[0])*t,z=old.plan.to[2]+(p.to[2]-old.plan.to[2])*t;if(Math.abs(seaFloor(x,z)+.2-p.to[1])>.1)return null;}
 }
 const side=(actor.x-old.plan.from[0])*old.plan.normal[0]+(actor.z-old.plan.from[2])*old.plan.normal[1],point={x:p.from[0]+(p.to[0]-p.from[0])*old.t+p.normal[0]*side,y:p.from[1]+(p.to[1]-p.from[1])*old.t,z:p.from[2]+(p.to[2]-p.from[2])*old.t+p.normal[1]*side};
 return Math.hypot(point.x-actor.x,point.y-actor.y,point.z-actor.z)<=8?{...point,floors:p.floors??[]}:null;
}
// The coast's topology and mooring endpoints are fixed. Search only when a
// mooring appears/changes; ordinary foot probes never scan the coastline.
export function createCoastGangways({ground=seaFloor,clear=()=>true,prepareClear=null,actor=()=>null,getBody=()=>null}={}){
 const cache=new Map();let plans=[];
 return{get plans(){return plans;},update(play){const live=new Set(),body=getBody(),foot=actor();plans=[];let probe;
  for(const j of play.links){if(j.kind!=='moor'||live.has(j.a))continue;live.add(j.a);const key=j.a+':'+j.anchor.join(',');let row=cache.get(j.a);
   probe??=prepareClear?.()??clear;
   if(row?.key!==key){row={key,sites:coastGangwaySites(j.anchor,ground),chosen:null,side:1,plan:null};cache.set(j.a,row);}
   // Prefer a valid shore end while waves move the boat. A newly blocked
   // route is withheld; it never pushes the person through the obstruction.
   // A cached shore end is not cached clearance: the moving hull changes
   // the ramp's height relative to the pier and posts on every draw.
   const previous=row.chosen,hull=play.parts.find(p=>p.id===j.a),group=coastAssembly(play,j.a),central=hull&&play.parts.some(p=>p.type==='cargo'&&(group.ids.has(p.id)||group.ids.has(loadDeck(play,p)?.id))&&Math.abs(localPoint(hull,p.p)[0])<.5&&Math.abs(localPoint(hull,p.p)[2])<2),validFoot=foot&&[foot.x,foot.y,foot.z].every(Number.isFinite),local=validFoot&&hull?localPoint(hull,[foot.x,foot.y,foot.z]):null,support=validFoot?coastSupport(play,foot.x,foot.z,foot.y):null,onDeck=support?.id===j.a&&Math.abs(support.y-foot.y)<.6||local&&foot.board===j.a&&Math.abs(local[0])<=33&&Math.abs(local[2])<=28&&Math.abs(local[1]-3)<2.5;
   const oldPlan=previous&&coastGangwayPlan(play,j.a,previous,{ground,deployed:true,verify:false,hingeSide:row.side}),carried=validFoot&&row.plan&&oldPlan?coastGangwayCarry([row.plan],[oldPlan],foot):null,walkingFoot=carried??foot,contact=validFoot&&oldPlan&&coastGangwaySupport([oldPlan],walkingFoot.x,walkingFoot.z),crossing=contact&&contact.t>0&&Math.abs(contact.y-walkingFoot.y)<1;
   // One captive plank can use either real corner. Choose the nearby corner
   // while the person is on deck; never switch beneath a crossing walker.
   // A cold mid-plank save also tries its actual side before any alternative.
   const wanted=central&&local&&!crossing&&((onDeck&&Math.abs(local[0])>12)||(!previous&&Math.abs(local[0])>2))?Math.sign(local[0]):row.side,sides=central?[...new Set(crossing?[row.side]:onDeck?[wanted]:[wanted,row.side,-wanted])]:[1];let plan=null,chosen=null,side=row.side;
   for(const hingeSide of sides){plan=previous&&coastGangwayPlan(play,j.a,previous,{ground,clear:probe,deployed:true,body,hingeSide,occupied:walkingFoot});chosen=plan?previous:null;
   // On reopening, a real saved foot contact can reconstruct a deployed
   // plank before choosing some other valid shore end. Prefer the closest
   // saved height; a nearby alternative can overlap in X/Z but not support
   // these feet. All candidates still receive the full live clearance test.
   // Standing on the actual shore is not evidence that a steep boat already
   // had a deployed ramp. Near-shoe saves above its surface still reconstruct.
   if(!plan){const matches=[];if(validFoot&&hull&&Math.abs(ground(foot.x,foot.z)-foot.y)>.01&&Math.hypot(foot.x-hull.p[0],foot.z-hull.p[2])<192)for(const site of row.sites){const candidate=coastGangwayPlan(play,j.a,site,{ground,deployed:true,verify:false,hingeSide});if(!candidate)continue;const contact=coastGangwaySupport([candidate],foot.x,foot.z);if(contact&&contact.t>0&&contact.t<1&&Math.abs(foot.y-contact.y)<=.5)matches.push({site,error:Math.abs(foot.y-contact.y)});}matches.sort((a,b)=>a.error-b.error);for(const {site} of matches){plan=coastGangwayPlan(play,j.a,site,{ground,clear:probe,deployed:true,body,hingeSide,occupied:foot});if(plan){chosen=site;break;}}}
   if(!plan){const sites=previous?[...row.sites].sort((a,b)=>Math.hypot(a.x-previous.x,a.z-previous.z)-Math.hypot(b.x-previous.x,b.z-previous.z)):row.sites;for(const site of sites){plan=coastGangwayPlan(play,j.a,site,{ground,clear:probe,body,hingeSide,occupied:foot});if(plan){chosen=site;break;}}}
   if(plan){side=hingeSide;break;}}
   row.chosen=chosen;row.side=side;row.plan=plan;
   if(plan)plans.push(plan);
  }
  for(const id of cache.keys())if(!live.has(id))cache.delete(id);return plans;
 },dispose(){cache.clear();plans=[];}};
}
