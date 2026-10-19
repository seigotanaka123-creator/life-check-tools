import {validateHighShape,highFloors,shapedHighParts} from './imasora-construction-high-shape.mjs';
import {highBuildingParts,highAssembly,highAssemblyAt,highDisassemblyAt,highJobPlan,highRouteSeconds} from './imasora-construction-high-build.mjs?v=120fw';
import {validateUpperPaintAction} from './imasora-construction-concrete/high-paint.mjs';
import {paintResultColor} from './imasora-construction-concrete/free-paint-removal.mjs';
const ok=(v,m)=>{if(!v)throw Error(m);};
export const BUILDING_PAINT_FACES=['south','east','north','west'];
export const buildingPaintWork=plan=>({version:5,blueprint:plan,levels:plan.storeys.length});
export const buildingPaintKey=a=>(a.interior?['inside',a.level,a.part,a.face]:[a.level,a.part,a.face]).join(':');
export function validateBuildingPaintAction(a){
 ok(/^building-[1-9][0-9]*$/.test(a.buildingId)&&a.buildingId.length<=24&&Number.isInteger(a.level)&&a.level>=1&&a.level<=6&&Number.isInteger(a.part)&&a.part>=0&&a.part<1024&&BUILDING_PAINT_FACES.includes(a.face),'ぬる建物と場所をえらび直そう。');
 ok(Object.hasOwn(a,'plan'),'建物の形をたしかめよう。');if(a.plan!==null){validateHighShape(a.plan);ok(a.plan.interiorStairs===true,'広い内階段の建物をえらぼう。');}
 if(Object.hasOwn(a,'retire')){ok(Array.isArray(a.retire)&&a.retire.length<=128&&new Set(a.retire).size===a.retire.length&&a.retire.every(id=>typeof id==='string'&&/^building-[1-9][0-9]*$/.test(id)&&id.length<=24&&id!==a.buildingId),'片付ける色の記録をたしかめよう。');a.retire=[...a.retire].sort();}
 if(Object.hasOwn(a,'interior'))ok(a.interior===true,'室内か外側かをえらぼう。');validateUpperPaintAction({...a,tiles:[0]});a.pixels=[...a.pixels].sort((x,y)=>x-y);return a;
}
function subtract(r,b){const x0=Math.max(r.x0,b.x0),x1=Math.min(r.x1,b.x1),y0=Math.max(r.y0,b.y0),y1=Math.min(r.y1,b.y1);if(x1<=x0||y1<=y0)return[r];return[{x0:r.x0,x1:x0,y0:r.y0,y1:r.y1},{x0:x1,x1:r.x1,y0:r.y0,y1:r.y1},{x0,y0:r.y0,x1,y1:y0},{x0,y0:y1,x1,y1:r.y1}].filter(p=>p.x1-p.x0>1e-6&&p.y1-p.y0>1e-6);}
const allPartsCache=new WeakMap();function allParts(plan){const key=JSON.stringify(plan),prior=allPartsCache.get(plan);if(prior?.key===key)return prior.parts;const w=buildingPaintWork(plan),p=Array.from({length:highFloors(w)},(_,i)=>shapedHighParts(i+1,w)).flat();allPartsCache.set(plan,{key,parts:p});return p;}
export function buildingPaintPart(plan,level,index){const w=buildingPaintWork(plan);ok(level<=highFloors(w),'その階はまだないよ。');const p=highBuildingParts(level,w)[index];ok(p&&['wall','column'].includes(p.kind),'壁か柱をえらぼう。');return p;}
// Visible rectangles from the chosen outside direction, including real window
// openings and partial beam/column overlaps. Covered areas never get a decal.
const patchCache=new Map();
export function buildingPaintPatches(plan,level,index,face,interior=false){
 const cacheKey=JSON.stringify([plan,level,index,face,...(interior?[true]:[])]);if(patchCache.has(cacheKey))return patchCache.get(cacheKey);
 const p=buildingPaintPart(plan,level,index),along=face==='north'||face==='south',sign=face==='south'||face==='east'?1:-1,axis=along?'z':'x',tan=along?'x':'z',dim=along?'d':'w',wide=along?'w':'d',plane=p[axis]+sign*p[dim]/2,width=p[wide],left=p[tan]-width/2,bottom=p.y-p.h/2;
 const outside=p.kind==='column'?p[axis]*sign>=60:(p.w>p.d?along&&!((face==='south')!==(p.z>0)):!along&&!((face==='east')!==(p.x>0)));
 const outward=interior?(p.kind==='column'?plane*sign<=63.001:(p.w>p.d?along:!along)&&!outside):outside;
 const blockers=allParts(plan).filter(b=>!['x','y','z','w','h','d'].every(k=>b[k]===p[k])&&(interior?b[axis]-b[dim]/2<=plane+.001&&b[axis]+b[dim]/2>=plane-.001:(b[axis]+sign*b[dim]/2-plane)*sign>=-1e-6&&((b[axis]+sign*b[dim]/2-plane)*sign>.001||b[axis]*sign>p[axis]*sign+.001))).map(b=>({x0:b[tan]-b[wide]/2,x1:b[tan]+b[wide]/2,y0:b.y-b.h/2,y1:b.y+b.h/2}));
 // A coplanar beam or wall owns its visible intersection with a column.
 if(!interior&&p.kind==='column')for(const b of allParts(plan))if(b!==p&&b.kind!=='column'&&Math.abs(b[axis]+sign*b[dim]/2-plane)<.001)blockers.push({x0:b[tan]-b[wide]/2,x1:b[tan]+b[wide]/2,y0:b.y-b.h/2,y1:b.y+b.h/2});
 const result=Array.from({length:16},(_,pixel)=>{let rects=outward?[{x0:left+(pixel%4)*width/4,x1:left+(pixel%4+1)*width/4,y0:bottom+Math.floor(pixel/4)*p.h/4,y1:bottom+(Math.floor(pixel/4)+1)*p.h/4}]:[];for(const b of blockers){rects=rects.flatMap(r=>subtract(r,b));if(!rects.length)break;}return{pixel,rects,axis,tan,plane:plane+sign*.04,sign,area:rects.reduce((n,r)=>n+(r.x1-r.x0)*(r.y1-r.y0),0)};});for(const p of result){p.rects.forEach(Object.freeze);Object.freeze(p.rects);Object.freeze(p);}Object.freeze(result);if(patchCache.size>=2048)patchCache.clear();patchCache.set(cacheKey,result);return result;
}
export function buildingPaintPlan(f,a){
 validateBuildingPaintAction(a);const groups=f.buildingPaint?.groups??[],group=groups.find(g=>g.buildingId===a.buildingId),plan=group?.plan??a.plan;ok(plan,'建物の形を読み直そう。');ok(!group||a.plan===null||JSON.stringify(a.plan)===JSON.stringify(group.plan),'建物の形が変わったよ。色は残しているよ。');
 const patches=buildingPaintPatches(plan,a.level,a.part,a.face,a.interior===true),key=buildingPaintKey(a),values=group?.faces[key]??[],color=paintResultColor(a.color),changes=[];let cost=0;
 for(const pixel of a.pixels){const patch=patches[pixel];if(!patch.area)continue;if((values[pixel]??null)!==color){changes.push({pixel,color,patch});if(color!==null)cost+=patch.area/64;}}
 ok(a.pixels.some(pixel=>patches[pixel].area>0),'この面は壁や梁のうしろだよ。見える場所をえらぼう。');return{group,plan,key,patches,changes,cost};
}
export function applyBuildingPaint(p,a,ledger){const f=p.freeBuild,q=buildingPaintPlan(f,a);ok(q.cost<=(ledger.quantities.paintSurfaceCredits-(p.paintUsed??0))+1e-9,'ペンキが足りないよ。建材受取所で受け取ろう。');if(!q.changes.length)return;if(f.buildingPaint&&a.retire?.length)f.buildingPaint.groups=f.buildingPaint.groups.filter(g=>!a.retire.includes(g.buildingId));f.buildingPaint??={version:1,groups:[]};let g=f.buildingPaint.groups.find(g=>g.buildingId===a.buildingId);if(!g){ok(f.buildingPaint.groups.length<128,'先に古い建物の塗装を片付けよう。');g={buildingId:a.buildingId,plan:structuredClone(q.plan),faces:{}};f.buildingPaint.groups.push(g);}g.faces[q.key]??=Array(16).fill(null);for(const x of q.changes)g.faces[q.key][x.pixel]=x.color;if(g.faces[q.key].every(v=>v===null))delete g.faces[q.key];p.paintUsed=(p.paintUsed??0)+q.cost;}
export function buildingPaintCandidates(work,level,kind,face,interior=false){if(work.version!==5||level>work.levels)return[];return highBuildingParts(level,work).map((p,part)=>({p,part})).filter(({p,part})=>p.kind===kind&&buildingPaintPatches(work.blueprint,level,part,face,interior).some(p=>p.area>0));}
export function buildingPaintFixedParts(work){let count=Array.from({length:work.levels},(_,i)=>highAssembly(i+1,work).length).reduce((a,b)=>a+b,0);if(work.job?.type==='DISMANTLE'){const q=highJobPlan(work,'DISMANTLE'),t=work.job.elapsed-highRouteSeconds(q.route);if(t>=0){const a=highDisassemblyAt(work.levels,Math.min(t,q.take),work);count-=Math.min(highAssembly(work.levels,work).length,a.completed+(a.moving?0:1));}}else if(work.job?.type==='BUILD'){const q=highJobPlan(work,'BUILD'),t=work.job.elapsed-highRouteSeconds(q.route);if(t>=0)count+=highAssemblyAt(work.levels+1,t,work).completed;}return count;}
export function buildingPaintPartVisible(work,level,index){const target=highBuildingParts(level,work)[index];let count=highAssembly(level,work).findIndex(s=>JSON.stringify(s.part)===JSON.stringify(target));for(let i=1;i<level;i++)count+=highAssembly(i,work).length;return count<buildingPaintFixedParts(work);}

