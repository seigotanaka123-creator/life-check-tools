import {foundationContains} from './free-foundation-state.mjs';
import {foundationSurfaceAt,assertFoundationSupport,constructionBase,supportedWorkMatches} from './free-supported-build.mjs';
import {freeCell} from './free-build-state.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import {footSurface,footingAt} from './free-footing.mjs';
import {walkPath,walkingBlocked} from './free-contact.mjs';
import {scaffoldSupport,scaffoldSurface} from './free-frame-scaffold.mjs';
import {frameRoute} from './free-frames.mjs';

export const ACCESS_MAX_RISER=2.5,ACCESS_MAX_TREADS=16;
// Bound the search, measure the actual stair entry, and retain the first legal
// rise. A high plateau beneath the foundation is not the stair entry datum.
function entryLayout(f,cell,height,axis,direction,heightAt){
 for(let count=1;count<=ACCESS_MAX_TREADS;count++){
  const heading=Math.atan2(axis==='x'?direction:0,axis==='z'?direction:0),entry={x:cell.x,z:cell.z,heading};entry[axis]-=direction*(40+count*12);
  const support=footingAt(f,entry.x,entry.z,heightAt);if(!support)continue;
  const rise=height-support.height;if(rise<=.15||rise/count>ACCESS_MAX_RISER+1e-8)continue;entry.y=support.height;
  const stairs=Array.from({length:count},(_,i)=>{const tread={x:cell.x,z:cell.z,y:entry.y+rise*(i+1)/count,halfX:axis==='x'?6:13,halfZ:axis==='x'?13:6};tread[axis]=entry[axis]+direction*(20+i*12);return tread;});
  const landing={x:cell.x,y:height,z:cell.z};landing[axis]=entry[axis]+direction*(20+count*12);return{entry,stairs,landing};
 }
 throw Error('階段の入口に平らな地面と一段2.5以下の通路を確保してください。');
}

export function foundationWalkHeight(p,x,z,heightAt,plan=null){
 const base=foundationSurfaceAt(p.foundation,x,z)??heightAt(x,z);
 return plan?scaffoldSurface(p.freeBuild,plan,x-p.freeBuild.location.x,z-p.freeBuild.location.z,()=>base):base;
}
export function foundationAccessProblem(p){
 if(!p.foundation)return '仮設土台を設置すると、階段で上がれます。';
 if(!['design','complete'].includes(p.freeBuild.stage))return '型枠と生コンの作業を片付けてから、土台に上がってください。';
 if(p.freeBuild.aboard||p.freeBuild.connected||p.freeBuild.hose)return '車を降り、ホースを片付けてから階段を使ってください。';
 return '';
}
// Reusable metal stairs/landing, like the existing temporary tool scaffolds.
// They neither create concrete nor spend/refund the reserved foundation boards.
export function planFoundationAccess(p,from,heightAt,external,target=null){
 const issue=foundationAccessProblem(p);if(issue)throw Error(issue);assertFoundationSupport(p,{heightAt,blockedAt:external});
 const f=p.freeBuild,s=p.foundation,base=(x,z)=>foundationSurfaceAt(s,x,z)??heightAt(x,z),groundBlocked=(x,z,m)=>external(x,z,m)||foundationContains(s,x-s.x,z-s.z,m);
 let desiredHeight=null,near=from;if(target){const w=f.completed[target.work];if(p.schemaVersion<13||target.face!=='top'||!w||!Number.isInteger(target.cell)||target.cell<0||target.cell>15||!w.fill[target.cell]||!supportedWorkMatches(p,w,1<<target.cell))throw Error('階段を接続する施工面を確認してください。');desiredHeight=constructionBase(w)+w.fill[target.cell]/2;const c=freeCell(target.cell);near={x:w.x-f.location.x+c.x,z:w.z-f.location.z+c.z};}
 const gap=c=>desiredHeight===null?0:desiredHeight-footSurface(f,c.x,c.z,base);
 const score=c=>Math.abs(gap(c))<1e-8?0:1;
 const distance=c=>{const to=score(c)?from:near;return Math.hypot(c.x-to.x,c.z-to.z);};
 const cells=Array.from({length:16},(_,i)=>i).filter(i=>s.mask&(1<<i)).map(i=>({...freeCell(i),i})).filter(c=>gap(c)>=-1e-8&&gap(c)<=.5+1e-8).sort((a,b)=>score(a)-score(b)||distance(a)-distance(b));
 let last;const causes=[];
 for(const cell of cells)for(const axis of ['z','x'])for(const direction of [-1,1])try{
  const height=footSurface(f,cell.x,cell.z,base),{entry,stairs,landing}=entryLayout(f,cell,height,axis,direction,heightAt);
  let ground;try{ground=walkPath(f,from,entry,groundBlocked,heightAt);}catch{ground=frameRoute(f,[],from,entry,groundBlocked,14,heightAt);}
  // The measured travel envelope needs room to step inward from a corner,
  // as well as to turn with a paint tool. This is a visible supported plate.
  const turning={halfX:19,halfZ:19};
  const stance={x:cell.x,y:height,z:cell.z,heading:entry.heading,...turning},path=[landing,stance],legs=[];
  for(const tread of [...stairs,...path])for(const dx of tread.halfX===19?[-16,16]:axis==='x'&&stairs.includes(tread)?[-3,3]:[-10,10])for(const dz of tread.halfZ===19?[-16,16]:axis==='x'&&stairs.includes(tread)?[-10,10]:[-3,3]){
   const x=tread.x+dx,z=tread.z+dz,bottom=footSurface(f,x,z,base);if(!Number.isFinite(bottom)||bottom>tread.y+.15||external(f.location.x+x,f.location.z+z,.6))throw Error('階段・踊り場の支柱と通路を空けてください。');
   legs.push({x,z,y:tread.y,base:bottom});
  }
  const cutouts=cells.map(c=>({x:c.x,z:c.z,width:16,depth:16})).filter(c=>Math.abs(footSurface(f,c.x,c.z,base)-height)<1e-8);
  const plan={kind:'foundation-access',thickness:.2,height,stairs,path,stance,entry,ground,legs,panels:[],axis,direction,cutouts,foundationKey:JSON.stringify(s)};
  scaffoldSupport(f,plan,base,external);
  const walkHeight=(x,z)=>foundationWalkHeight(p,x,z,heightAt,plan);
  for(let i=0;i<=32;i++){const t=i/32,pos={x:landing.x+(stance.x-landing.x)*t,z:landing.z+(stance.z-landing.z)*t};if(!footingAt(f,pos.x,pos.z,walkHeight)||walkingBlocked(f,pos.x,pos.z,external))throw Error('踊り場に両足を支える通路を確保してください。');}
  return plan;
 }catch(e){last=e;causes.push(e.message+": "+(e.cause?.message??""));}
 throw Error('土台へ上がる階段の通路を確保できません。車両・ホースを避け、入口の周りを空けてください。',{cause:{last,attempts:causes}});
}
export function assertRaisedPaintSupport(p,a,heightAt,blockedAt){
 const w=p.freeBuild.completed[a.work];if(!constructionBase(w??{}))return;
 if(!supportedWorkMatches(p,w,1<<a.cell))throw Error('作品を支える元の土台を設置してから塗ってください。');
 assertFoundationSupport(p,{heightAt,blockedAt});
}
// Quarter-cup top patches can use the supported turning landing. Higher
// patches use a separate paint scaffold, avoiding a forced unusable landing.
export function foundationPaintUsesLanding(p,a){
 const w=p.freeBuild.completed[a.work];
 return p.schemaVersion>=13&&a.face==='top'&&!!constructionBase(w)&&freePlacedFill(w,a.cell)===1&&supportedWorkMatches(p,w,1<<a.cell);
}
export function paintNeedsGroundAccess(p,a,plan){
 const w=p.freeBuild.completed[a.work];
 const gap=w?constructionBase(w)+w.fill[a.cell]/2-plan.height:Infinity;
 // A checked same-deck landing may feed a quarter-cup surface just above it.
 // Taller differences require their own stair height; the tool still validates
 // every actual route, sole and contact rather than assuming this grants reach.
 if(p.schemaVersion>=13&&a.face==='top'&&w&&supportedWorkMatches(p,w,1<<a.cell)&&plan.foundationKey===JSON.stringify(p.foundation)&&gap>=-1e-8&&gap<=.5+1e-8)return false;
 return a.face!=='top'||!w||!supportedWorkMatches(p,w,1<<a.cell)||Math.abs(constructionBase(w)+w.fill[a.cell]/2-plan.height)>1e-8;
}
// Rectangle subtraction keeps the metal landing around, rather than on top of,
// the wooden deck / painted concrete at the same elevation.
export function accessPlatePieces(rect,cutouts){
 let pieces=[rect];for(const c of cutouts){const next=[];for(const r of pieces){const x0=Math.max(r.x-r.width/2,c.x-c.width/2),x1=Math.min(r.x+r.width/2,c.x+c.width/2),z0=Math.max(r.z-r.depth/2,c.z-c.depth/2),z1=Math.min(r.z+r.depth/2,c.z+c.depth/2);if(x1<=x0||z1<=z0){next.push(r);continue;}const add=(a,b,d,e)=>{if(b-a>1e-8&&e-d>1e-8)next.push({x:(a+b)/2,z:(d+e)/2,width:b-a,depth:e-d});};add(r.x-r.width/2,x0,r.z-r.depth/2,r.z+r.depth/2);add(x1,r.x+r.width/2,r.z-r.depth/2,r.z+r.depth/2);add(x0,x1,r.z-r.depth/2,z0);add(x0,x1,z1,r.z+r.depth/2);}pieces=next;}return pieces;
}
