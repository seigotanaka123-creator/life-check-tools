import {constructionBase} from './free-supported-build.mjs';
import {pipeWalkingBlocked} from './free-boom-contact.mjs';
import {footSurface,FOOT_LEVEL_EPS} from './free-footing.mjs';
import {accessDeckContains} from './free-access-deck.mjs';

// The 26-unit deck fits the measured shoes beside, rather than above, the work.
export const SCAFFOLD_RADIUS=13,SCAFFOLD_TREAD=12;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
function stairDistance(p,s){return Math.hypot(Math.max(0,Math.abs(p.x-s.x)-s.halfX),Math.max(0,Math.abs(p.z-s.z)-s.halfZ));}
function baseAt(f,x,z,heightAt){return footSurface(f,x,z,heightAt,true);}
function legBlocked(f,p,panels,external){
 if(pipeWalkingBlocked(f,p.x,p.z,1))return true;
 if(Math.abs(f.location.x+p.x)>2580||Math.abs(f.location.z+p.z)>1680||external(f.location.x+p.x,f.location.z+p.z,1))return true;
 if(Math.abs(p.x)<12&&Math.abs(p.z-140)<7)return true;
 for(const v of [f.truck,f.pump]){const dx=p.x-v.x,dz=p.z-v.z,c=Math.cos(v.heading),s=Math.sin(v.heading);if(Math.abs(c*dx-s*dz)<(v.legs?40:33)+1&&Math.abs(s*dx+c*dz)<45)return true;}
 return panels.some(b=>Math.abs(p.x-b.x)<b.width/2+.8&&Math.abs(p.z-b.z)<b.depth/2+.8);
}
export function scaffoldSupport(f,plan,heightAt=()=>0,external=()=>false){
 let error=0;
 for(const leg of plan.legs){if(legBlocked(f,leg,plan.panels,external))throw Error('足場の支柱が車両・型枠・建物と重なっています。通路を空けてください。');
  for(const dx of [-.6,0,.6])for(const dz of [-.6,0,.6]){const h=baseAt(f,leg.x+dx,leg.z+dz,heightAt);if(!Number.isFinite(h)||Math.abs(h-leg.base)>FOOT_LEVEL_EPS)throw Error('足場の支柱を支える地面や床がありません。足元を整えてください。');error=Math.max(error,Math.abs(h-leg.base));}
 }
 return error;
}
export function scaffoldSurface(f,plan,x,z,heightAt=()=>0){
 let height=baseAt(f,x,z,heightAt);if(!Number.isFinite(height))return null;
 if(!plan)return height;
 for(const s of plan.stairs)if(stairDistance({x,z},s)<1e-7)height=Math.max(height,s.y);
 if(plan.kind==='fixed-frame-work')return plan.pieces.some(p=>Math.abs(x-p.x)<=p.width/2+1e-8&&Math.abs(z-p.z)<=p.depth/2+1e-8)?Math.max(height,plan.height):height;
 if(plan.kind==='foundation-access')return accessDeckContains(plan,x,z)?Math.max(height,plan.height):height;
 for(let i=1;i<plan.path.length;i++)if(segmentDistance({x,z},plan.path[i-1],plan.path[i])<=SCAFFOLD_RADIUS)height=Math.max(height,plan.height);
 return height;
}
export function makeFrameScaffold(f,stance,panels,heightAt,external,groundRoute,raisedRoute,{height=constructionBase(f)+f.height+2,origins=[{x:0,z:116,dz:-1}],deckExternal=external}={}){
 const count=Math.ceil(height/2.5);let last;
 for(const origin of origins)try{
  const entryBase=baseAt(f,origin.x,origin.z,heightAt);if(!Number.isFinite(entryBase)||height-entryBase<.6)throw Error('足場の階段を支える地面がありません。');
  const thickness=Math.min(.6,(height-entryBase)/count/2);
  const stairs=Array.from({length:count},(_,i)=>({x:origin.x,z:origin.z+origin.dz*(20+i*12),y:entryBase+(height-entryBase)*(i+1)/count,halfX:13,halfZ:6}));
  // Validate the whole tread and shoe overhang, not only four post feet.
  // A hillside can otherwise rise between the posts and intersect a planted
  // shoe. Try another entrance before deploying any boards or stairs.
  for(const stair of stairs)for(let dx=-stair.halfX-1;dx<=stair.halfX+1;dx+=2)for(let dz=-stair.halfZ-2;dz<=stair.halfZ+2;dz+=2){
   const ground=baseAt(f,stair.x+dx,stair.z+dz,heightAt);
   if(!Number.isFinite(ground)||ground>stair.y+FOOT_LEVEL_EPS)throw Error('階段と地面・土台が重なります。別の入口に足場を置いてください。');
  }
  const landing={x:origin.x,z:origin.z+origin.dz*(20+count*12),y:height};
  const entry={x:origin.x,z:origin.z,y:entryBase,heading:0},ground=groundRoute(entry);
  const blocked=(x,z,margin)=>{const point={x:x-f.location.x,z:z-f.location.z};return deckExternal(x,z,margin)||dist(point,entry)<26||ground.slice(1).some((p,i)=>segmentDistance(point,ground[i],p)<26)||stairs.some(s=>s.y<height&&stairDistance(point,s)<SCAFFOLD_RADIUS-1e-6);};
  const path=raisedRoute(landing,stance,blocked).map(p=>({...p,y:height}));
  const legs=[],seen=new Set();
  function leg(x,z,y){const key=x.toFixed(4)+','+z.toFixed(4)+','+y;if(seen.has(key))return;seen.add(key);
   for(const [dx,dz]of [[0,0],[-2,0],[2,0],[0,-2],[0,2],[-2,-2],[-2,2],[2,-2],[2,2]]){const candidate={x:x+dx,z:z+dz,y,base:baseAt(f,x+dx,z+dz,heightAt)};if(!Number.isFinite(candidate.base)||candidate.base<-.15||candidate.base>y-thickness-.04)continue;try{scaffoldSupport(f,{legs:[candidate],panels},heightAt,external);legs.push(candidate);return;}catch{}}
   throw Error('足場の支柱を置く場所がありません。通路を空けてください。');
  }
  for(const s of stairs)for(const dx of [-10,10])for(const dz of [-3,3])leg(s.x+dx,s.z+dz,s.y);
  for(let i=0;i<path.length;i++)for(const [dx,dz]of [[-9,0],[9,0],[0,-9],[0,9]])leg(path[i].x+dx,path[i].z+dz,height);
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=dist(a,b),n=Math.max(1,Math.ceil(length/16)),nx=-(b.z-a.z)/(length||1),nz=(b.x-a.x)/(length||1);for(let j=1;j<n;j++)for(const side of [-1,1])leg(a.x+(b.x-a.x)*j/n+nx*9*side,a.z+(b.z-a.z)*j/n+nz*9*side,height);}
  const plan={height,thickness,stairs,path,ground,entry,legs,panels:[...panels],direction:origin.dz};scaffoldSupport(f,plan,heightAt,external);return plan;
 }catch(e){last=e;}
 throw last??Error('階段と作業足場を置く通路がありません。');
}
export const newScaffoldReceipt=()=>({deployments:0,recoveries:0,ascents:0,descents:0,samples:0,minimumPlanted:2,maxSoleError:0,maxSupportError:0});
export function assertScaffoldReceipt(r,panels,height,{deckHeight=height+2}={}){
 const keys=Object.keys(newScaffoldReceipt()).sort(),steps=panels*(Math.ceil(deckHeight/2.5)+1);
 if(!r||JSON.stringify(Object.keys(r).sort())!==JSON.stringify(keys)||r.deployments!==panels||r.recoveries!==panels||r.ascents!==steps||r.descents!==steps||!Number.isSafeInteger(r.samples)||r.samples<steps*6||!Number.isSafeInteger(r.minimumPlanted)||r.minimumPlanted<1||r.minimumPlanted>2||!Number.isFinite(r.maxSoleError)||r.maxSoleError<0||r.maxSoleError>FOOT_LEVEL_EPS+1e-5||!Number.isFinite(r.maxSupportError)||r.maxSupportError<0||r.maxSupportError>FOOT_LEVEL_EPS)throw Error('足場・階段・靴底の支持を確認できません。');
}
