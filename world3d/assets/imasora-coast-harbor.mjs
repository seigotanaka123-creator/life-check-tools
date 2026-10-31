import {legacyCoastHeight} from './imasora-coast-geography.mjs?v=120li';
import {coastHeight,coastPierContains,COAST_WORLD} from './imasora-coast-layout.mjs?v=120mx';
export const COAST_HARBOR=Object.freeze({timber:6720,max:4,reach:110});
const empty=Object.freeze([]),floor=(x,z)=>Math.max(coastHeight(x,z),coastPierContains(x,z)?0:-Infinity),ok=(v,m)=>{if(!v)throw Error(m);},exact=(o,ks)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...ks].sort().join('|');
const offsets=[[1,0],[0,1],[-1,0],[0,-1]];
export const coastHarborTimber=s=>(s?.harbor?.items.length??0)*COAST_HARBOR.timber;
export function coastHarborFeet(p,legacy=false){const [dx,dz]=offsets[p.turn];return[-1,1].map(side=>{const x=p.point[0]+dx*24*side,z=p.point[1]+dz*24*side;return {x,z,y:legacy?Math.max(legacyCoastHeight(x,z),coastPierContains(x,z)?0:-Infinity):floor(x,z),side};});}
const geometryCache=new WeakMap();
export function coastHarborGeometry(p){let rows=geometryCache.get(p);if(rows)return rows;rows=coastHarborFeet(p).flatMap(f=>[{id:p.id,p:[f.x,f.y+15,f.z],size:[8,30,8],turn:p.turn},{id:p.id,p:[f.x,f.y+33,f.z],size:p.turn%2?[15,6,16]:[16,6,15],turn:0}]);geometryCache.set(p,rows);return rows;}
const collisionCache=new WeakMap();
export function coastHarborSolids(s){const h=s.harbor;if(!h?.items.length)return empty;let rows=collisionCache.get(h);if(!rows){rows=h.items.flatMap(p=>coastHarborGeometry(p).map(g=>({id:p.id,x:g.p[0],z:g.p[2],halfX:g.size[0]/2,halfZ:g.size[2]/2,minY:g.p[1]-g.size[1]/2,maxY:g.p[1]+g.size[1]/2})));collisionCache.set(h,rows);}return rows;}
export function validateCoastHarbor(h,legacy=false){if(h===undefined)return;ok(exact(h,['version','serial','items'])&&h.version===1&&Number.isSafeInteger(h.serial)&&h.serial>=1&&h.serial<1e9&&Array.isArray(h.items)&&h.items.length<=COAST_HARBOR.max,'港の設備の記録が違います。');const ids=new Set();for(const p of h.items){ok(exact(p,['id','point','turn'])&&/^harbor-[1-9]\d{0,8}$/.test(p.id)&&Number(p.id.slice(7))<h.serial&&!ids.has(p.id),'係留ポールの番号が違います。');ids.add(p.id);ok(Array.isArray(p.point)&&p.point.length===2&&p.point.every(v=>Number.isSafeInteger(v)&&v%2===0)&&Math.abs(p.point[0])<=COAST_WORLD.width/2-80&&p.point[1]>=185&&p.point[1]<=COAST_WORLD.depth/2-40&&Number.isInteger(p.turn)&&p.turn>=0&&p.turn<4,'係留ポールの場所が違います。');for(const f of coastHarborFeet(p,legacy))for(const dx of[-8,0,8])for(const dz of[-8,0,8])ok(f.y>=0&&Math.abs((legacy?Math.max(legacyCoastHeight(f.x+dx,f.z+dz),coastPierContains(f.x+dx,f.z+dz)?0:-Infinity):floor(f.x+dx,f.z+dz))-f.y)<.6,'係留ポールを支える岸がありません。');}for(let i=0;i<h.items.length;i++)for(let j=i+1;j<h.items.length;j++)for(const a of coastHarborFeet(h.items[i],legacy))for(const b of coastHarborFeet(h.items[j],legacy))ok(Math.hypot(a.x-b.x,a.z-b.z)>23,'港の設備が重なっています。');}
export function createCoastHarborTools(P){
 const {SEA_PLAY,SEA_PARTS,SEA_PIER_SOLIDS,coastVoyageSolids,coastSalvageSolids,worldPoint,coastAssembly,coastReadout,coastIsLoadingRamp,obb,overlap,obstacleBox,length,sub}=P;
 const parsed=j=>j.id?.match(/^harbor-line-(harbor-\d+)-(sea-\d+)-(-?1)$/),find=(s,id)=>s.parts.find(p=>p.id===id),anchors=(p,legacy=false)=>coastHarborFeet(p,legacy).map(f=>[f.x,f.y+33,f.z]);
 function plan(s,point,turn=0,{actor=null,riderId=null,obstacles=[],availableTimber=0}={}){
  const p={id:'harbor-preview',point:Array.isArray(point)?point.map(v=>Math.round(v/2)*2):null,turn},bad=message=>({...p,valid:false,message});
  if(!actor||riderId||!p.point||p.point.length!==2||!p.point.every(Number.isFinite)||Math.hypot(actor.x-p.point[0],actor.z-p.point[1])>COAST_HARBOR.reach||Math.abs(actor.y-floor(actor.x,actor.z))>1.5)return bad('岸に立って、近くにつくろう。');
  if((s.harbor?.items.length??0)>=COAST_HARBOR.max)return bad('ポールは4組まで。使わないポールを片付けて置き直せるよ。');
  if(!Number.isSafeInteger(availableTimber)||availableTimber<COAST_HARBOR.timber)return bad('木材が足りないよ。建築セットを工房でひらこう。');
  try{validateCoastHarbor({version:1,serial:2,items:[{...p,id:'harbor-1'}]});}catch{return bad('2本とも岸の平らな場所へ置こう。水の上にはつくれないよ。');}
  const person={p:[actor.x,actor.y+20,actor.z],half:[9,19,9],axes:[[1,0,0],[0,1,0],[0,0,1]]},solids=[...SEA_PIER_SOLIDS,...coastVoyageSolids(s),...coastSalvageSolids(s),...coastHarborSolids(s),...obstacles];
  for(const g of coastHarborGeometry(p)){const b={p:g.p,half:g.size.map(v=>v/2),axes:[[1,0,0],[0,1,0],[0,0,1]]};if(overlap(b,person)||s.parts.some(q=>overlap(b,obb(q)))||solids.some(o=>overlap(b,obstacleBox(o))))return bad('人・船・道具・建物に重なるよ。見本を動かそう。');}
  if(s.harbor?.items.some(q=>coastHarborFeet(q).some(a=>coastHarborFeet(p).some(b=>Math.hypot(a.x-b.x,a.z-b.z)<=23))))return bad('ほかのポールから少し離そう。');
  return {...p,valid:true,message:'ここに2本の係留ポールをつくるよ。木材1/4枚。船をロープで停められる！'};
 }
 function moorPlan(s,portId,boardId,{actor=null}={}){
  const port=s.harbor?.items.find(p=>p.id===portId),board=find(s,boardId),g=board&&coastAssembly(s,boardId),bad=message=>({valid:false,message,port:portId,board:boardId});
  if(!port||board?.type!=='board'||coastIsLoadingRamp(s,boardId)||coastReadout(s,boardId,null,false).floats<2)return bad('停めたい船をポールのそばへ寄せよう。');
  const points=anchors(port),local=[[-24,3,-27],[24,3,-27]],existing=s.links.filter(j=>j.kind==='moor'&&g.ids.has(j.a));
  if(!actor||Math.hypot(actor.x-port.point[0],actor.z-port.point[1])>140||Math.abs(actor.y-floor(...port.point))>65||length(sub(board.p,[port.point[0],floor(...port.point),port.point[1]]))>170)return bad('船といっしょにポールのそばへ行こう。');
  if(s.links.some(j=>/^(loading-|unload-|work-moor-|align-moor-)/.test(j.id)&&(g.ids.has(j.a)||g.ids.has(j.b))))return bad('荷役板や作業ロープを片付けてから、停め直そう。');
  if(Math.hypot(board.v[0],board.v[2])>8||coastReadout(s,boardId,null,false).tilt>18)return bad('船の速度を落としてから、つなごう。');
  if(s.links.length-existing.length+2>SEA_PLAY.maxLinks)return bad('使わないロープを片付けよう。');
  if(s.links.some(j=>parsed(j)?.[1]===portId&&j.a!==boardId))return bad('別の船のロープを先に外そう。');const total=(a,b)=>length(sub(points[0],worldPoint(board,a)))+length(sub(points[1],worldPoint(board,b)));if(total(local[1],local[0])<total(local[0],local[1]))local.reverse();const lengths=points.map((p,i)=>length(sub(p,worldPoint(board,local[i])))+2);if(lengths.some(n=>n>220))return bad('船をもう少し近づけよう。');
  return {valid:true,port:portId,board:boardId,points,local,lengths,remove:existing.map(j=>j.id),message:'2本のロープで停めるよ。波の力をロープで支えられる！'};
 }
 function detach(s,j){const m=parsed(j);if(!m)return false;s.links=s.links.filter(k=>{const a=parsed(k);return !a||a[1]!==m[1]||a[2]!==m[2];});return true;}
 function validateFrame(s){validateCoastHarbor(s.harbor,s.geography!==2);for(const j of s.links??[])if(j.id.startsWith('harbor-line-')){const m=parsed(j),p=s.harbor?.items.find(p=>p.id===m?.[1]),b=find(s,m?.[2]),i=m?.[3]==='-1'?0:1;ok(m&&p&&b?.type==='board'&&j.kind==='moor'&&j.a===b.id&&JSON.stringify(j.anchor)===JSON.stringify(anchors(p,s.geography!==2)[i])&&Array.isArray(j.localA)&&j.localA.length===3&&[-24,24].includes(j.localA[0])&&j.localA[1]===3&&j.localA[2]===-27&&Number.isFinite(j.length)&&j.length>=6&&j.length<=220&&s.links.some(k=>k.id==='harbor-line-'+p.id+'-'+b.id+'-'+(i===0?1:-1)&&k.localA?.[0]===-j.localA[0]),'係留ポールのロープが違います。');} }
 function edit(s,a,options){
  if(a.type==='harbor-build'){const p=plan(s,a.point,a.turn??0,options);ok(p.valid,p.message);const h=s.harbor??{version:1,serial:1,items:[]};s.harbor={version:1,serial:h.serial+1,items:[...h.items,{id:'harbor-'+h.serial,point:p.point,turn:p.turn}]};return;}
  if(a.type==='harbor-remove'){const p=s.harbor?.items.find(p=>p.id===a.id),actor=options.actor;ok(p&&actor&&!options.riderId&&Math.hypot(actor.x-p.point[0],actor.z-p.point[1])<100&&Math.abs(actor.y-floor(...p.point))<1.5,'岸でポールのそばへ行こう。');ok(!s.links.some(j=>parsed(j)?.[1]===p.id),'船のロープを外してから片付けよう。');s.harbor={...s.harbor,items:s.harbor.items.filter(q=>q.id!==p.id)};return;}
  const p=moorPlan(s,a.id,a.board,options);ok(p.valid,p.message);s.links=s.links.filter(j=>!p.remove.includes(j.id));for(const [i,side]of[-1,1].entries())s.links.push({id:'harbor-line-'+p.port+'-'+p.board+'-'+side,kind:'moor',a:p.board,anchor:p.points[i],localA:p.local[i],length:Math.max(6,p.lengths[i])});
 }
 return{plan,moorPlan,edit,detach,validateFrame,validLine:(s,j)=>!!parsed(j),edits:new Set(['harbor-build','harbor-remove','harbor-moor'])};
}
