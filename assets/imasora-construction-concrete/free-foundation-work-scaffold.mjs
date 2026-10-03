import {foundationCorners,foundationContains} from './free-foundation-state.mjs';
import {footSurface,footingAt,FOOT_LEVEL_EPS} from './free-footing.mjs';
import {frameBlocked,frameRoute} from './free-frames.mjs';
import {accessPlatePieces} from './free-foundation-access.mjs';
export const FOUNDATION_WORK_OFFSET=.7,FOUNDATION_WORK_THICKNESS=.25;
const inside=(r,x,z)=>Math.abs(x-r.x)<=r.width/2+1e-8&&Math.abs(z-r.z)<=r.depth/2+1e-8;
export function foundationWorkSurface(f,plan,x,z,heightAt){
 let h=footSurface(f,x,z,heightAt,true);if(!Number.isFinite(h))return null;
 for(const t of plan.stairs)if(Math.abs(x-t.x)<=t.halfX+1e-8&&Math.abs(z-t.z)<=t.halfZ+1e-8)h=Math.max(h,t.y);
 for(const r of plan.pieces)if(inside(r,x,z))h=Math.max(h,plan.height);return h;
}
export function foundationWorkSupport(f,plan,heightAt,external){
 let error=0;for(const leg of plan.legs){
  if(foundationContains(plan.foundation,leg.x,leg.z,1)||frameBlocked(f,[],leg,external,.6))throw Error('土台の作業足場の支柱を置く場所を空けてください。');
  for(const dx of [-.6,0,.6])for(const dz of [-.6,0,.6]){const h=footSurface(f,leg.x+dx,leg.z+dz,heightAt,true);if(!Number.isFinite(h)||Math.abs(h-leg.base)>FOOT_LEVEL_EPS)throw Error('土台の作業足場を支える地面が変わりました。');error=Math.max(error,Math.abs(h-leg.base));}
 }return error;
}
export function foundationScaffoldBase(f,s,heightAt,external){
 const corners=foundationCorners(s.mask),minX=Math.min(...corners.map(p=>p.x))-36,maxX=Math.max(...corners.map(p=>p.x))+36,minZ=Math.min(...corners.map(p=>p.z))-36,maxZ=Math.max(...corners.map(p=>p.z))+36,height=s.deckY+FOUNDATION_WORK_OFFSET,rect={x:(minX+maxX)/2,z:(minZ+maxZ)/2,width:maxX-minX,depth:maxZ-minZ};
 if(Math.max(rect.width,rect.depth)>144)throw Error('作業足場の届く範囲を超えています。');
 // The whole reusable work table must clear parked vehicles and buildings.
 const nx=Math.ceil(rect.width/4),nz=Math.ceil(rect.depth/4);for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++)if(frameBlocked(f,[],{x:minX+rect.width*i/nx,z:minZ+rect.depth*j/nz},external,3))throw Error('土台の作業足場と車両・建物が重なります。周りの車両を離してください。');
 let entry,stairs,landing;for(let n=1;n<=8;n++){const q={x:rect.x,z:minZ+13-(20+n*12),heading:0},h=footingAt(f,q.x,q.z,heightAt,true);if(!h||height-h.height<.35||Math.ceil((height-h.height)/2.5)!==n)continue;
  entry={...q,y:h.height};stairs=Array.from({length:n},(_,i)=>({x:q.x,z:q.z+20+i*12,y:h.height+(height-h.height)*(i+1)/n,halfX:13,halfZ:6}));landing={x:q.x,z:q.z+20+n*12,y:height,heading:0};break;}
 if(!entry)throw Error('土台の作業足場の入口に平らな地面を確保してください。');
 const legs=[];const add=(x,z,y)=>{const base=footSurface(f,x,z,heightAt,true);if(!Number.isFinite(base)||y-FOUNDATION_WORK_THICKNESS-base<.05)throw Error('作業足場を支える支柱の高さが足りません。');legs.push({x,z,y,base});};
 for(const x of [minX+1,maxX-1])for(const z of [minZ+1,maxZ-1])add(x,z,height);
 for(const t of stairs)for(const dx of [-10,10])for(const dz of [-3,3])add(t.x+dx,t.z+dz,t.y);
 const plan={kind:'foundation-work',thickness:FOUNDATION_WORK_THICKNESS,height,plates:[rect],stairs,entry,landing,legs,foundation:s,direction:1,panels:[],pieces:[]};foundationWorkSupport(f,plan,heightAt,external);return plan;
}
export function foundationScaffoldFor(f,base,part,stance,rack,heightAt,external,groundBlocked){
 const cutouts=[{x:part.x,z:part.z,width:part.width+2,depth:part.depth+2}],pieces=base.plates.flatMap(r=>accessPlatePieces(r,cutouts)),plan={...base,cutouts,pieces};
 const surface=(x,z)=>foundationWorkSurface(f,plan,x-f.location.x,z-f.location.z,heightAt);
 const ground=frameRoute(f,[],rack,base.entry,groundBlocked,20,heightAt,undefined,true,{minX:-360,maxX:360,minZ:-360,maxZ:360});
 const path=frameRoute(f,[part],base.landing,stance,external,20,surface,undefined,true,{minX:-100,maxX:100,minZ:-100,maxZ:100});
 if(path.some(q=>Math.abs(q.y-base.height)>.01))throw Error('施工部の開口を避けて両足を支える足場を確保してください。');plan.ground=ground;plan.path=path;return plan;
}
