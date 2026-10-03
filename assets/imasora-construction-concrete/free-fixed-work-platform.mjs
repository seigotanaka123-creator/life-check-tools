import {scaffoldSupport,SCAFFOLD_RADIUS} from './free-frame-scaffold.mjs';
import {frameWorkBoxes,frameWorkspaceBlocked} from './free-frame-workspace.mjs';
const key=p=>[p.x,p.z,p.y,p.base,p.halfX,p.halfZ].join(',');
const unique=items=>[...new Map(items.map(p=>[key(p),p])).values()];
function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}

// Make one non-overlapping floor from ALL already validated work routes.
// One-unit squares enclose the original deck, then merge into rectangles.
// Rendering and sole support use these same pieces; no invisible walkway.
export function fixedWorkPlatform(plans,f,heightAt,external){
 if(!plans.length)return null;const height=plans[0].height;
 if(plans.some(p=>p.height!==height))throw Error('同じ高さの作業台を確認してください。');
 const paths=plans.map(p=>p.path),topStairs=unique(plans.flatMap(p=>p.stairs)).filter(s=>Math.abs(s.y-height)<1e-8),points=paths.flat().concat(topStairs);
 const minX=Math.floor(Math.min(...points.map(p=>p.x))-SCAFFOLD_RADIUS),maxX=Math.ceil(Math.max(...points.map(p=>p.x))+SCAFFOLD_RADIUS),minZ=Math.floor(Math.min(...points.map(p=>p.z))-SCAFFOLD_RADIUS),maxZ=Math.ceil(Math.max(...points.map(p=>p.z))+SCAFFOLD_RADIUS);
 if((maxX-minX)*(maxZ-minZ)>100000)throw Error('一つの作業台で届く範囲を超えています。');
 const pieces=[],open=new Map(),workBoxes=frameWorkBoxes(f);
 for(let z=minZ;z<maxZ;z++){
  const runs=[];let start=null;
  for(let x=minX;x<=maxX;x++){const p={x:x+.5,z:z+.5},inside=x<maxX&&!frameWorkspaceBlocked(workBoxes,p,Math.SQRT1_2)&&(topStairs.some(s=>Math.abs(p.x-s.x)<=s.halfX&&Math.abs(p.z-s.z)<=s.halfZ)||paths.some((path,n)=>(!plans[n].allowed||plans[n].allowed(p))&&path.some((b,i)=>segmentDistance(p,i?path[i-1]:b,b)<=SCAFFOLD_RADIUS+Math.SQRT1_2)));if(inside&&start===null)start=x;if(!inside&&start!==null){runs.push([start,x]);start=null;}}
  const next=new Map();for(const[a,b]of runs){const id=a+','+b,old=open.get(id);if(old){old.depth++;old.z+=.5;next.set(id,old);}else{const piece={x:(a+b)/2,z:z+.5,width:b-a,depth:1};pieces.push(piece);next.set(id,piece);}}open.clear();for(const[id,p]of next)open.set(id,p);
 }
 const plan={kind:'fixed-frame-work',height,thickness:Math.min(...plans.map(p=>p.thickness??.6)),pieces,stairs:unique(plans.flatMap(p=>p.stairs)),legs:unique(plans.flatMap(p=>p.legs)),panels:unique(plans.flatMap(p=>p.panels)),entry:plans[0].entry,path:plans[0].path,direction:plans[0].direction};
 scaffoldSupport(f,plan,heightAt,external);return plan;
}
