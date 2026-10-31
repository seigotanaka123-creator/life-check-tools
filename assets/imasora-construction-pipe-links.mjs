import{furniturePoint,tankCapacity}from'./imasora-construction-reel-furniture.mjs?v=120pl';
import{floorParts}from'./imasora-construction-reel-stairs.mjs';
import{pipePoints}from'./imasora-construction-reel-pipes.mjs?v=120pl';
const keys=(o,k)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===k;
const point=p=>keys(p,'x|y|z')&&[p.x,p.y,p.z].every(Number.isFinite),same=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001;
const tank=(r,id)=>r?.structure?.items.find(i=>i.id===id&&i.kind==='furniture'&&i.shape==='cistern');
export const risers=r=>(r?.structure?.items??[]).filter(i=>i.kind==='riser'||i.kind==='branch');
function directPipe(rooms,roomId,id){for(const r of rooms)for(const i of r.structure?.items??[]){if(i.kind==='pipe'&&r.id===roomId&&[i.a,i.b].includes(id)){const other=tank(r,i.a===id?i.b:i.a);return{room:r,item:i,otherRoom:r,other,reverse:i.b===id};}if(i.kind==='riser'&&(r.id===roomId&&i.a===id||i.roomB===roomId&&i.b===id)){const reverse=i.roomB===roomId;const otherRoom=reverse?r:rooms.find(b=>b.id===i.roomB);return{room:r,item:i,otherRoom,other:tank(otherRoom,reverse?i.a:i.b),reverse};}}return null;}
function covered(r,x,z){return floorParts(r).reduce((s,f)=>s+Math.max(0,Math.min(x+1.5,f.x+f.w/2)-Math.max(x-1.5,f.x-f.w/2))*Math.max(0,Math.min(z+1.5,f.z+f.d/2)-Math.max(z-1.5,f.z-f.d/2)),0)>=9-.001;}
export function makePipeLink(rooms,roomId,a,roomB,b,side=0){const r=rooms.find(r=>r.id===roomId),s=rooms.find(r=>r.id===roomB),A=tank(r,a),B=tank(s,b);if(!A||!B||r===s||!Number.isInteger(side)||side<0||side>3)throw Error('別の床の給水タンクを押そう。');
 const port=(r,t)=>furniturePoint(r,t,0,13,t.depth/2+8),stub=(r,t)=>furniturePoint(r,t,0,13,t.depth/2+20),P=port(r,A),Q=port(s,B),S=stub(r,A),E=stub(s,B);if(Math.hypot(P.x-Q.x,P.z-Q.z)>320||Math.abs(P.y-Q.y)>128)throw Error('近くの階のタンクへつなごう。');let path;
 if(P.y===Q.y){const C=side%2?{x:S.x,y:S.y,z:E.z}:{x:E.x,y:S.y,z:S.z};path=[P,S,C,E,Q];}
 else{const x=side===1?Math.max(r.x1,s.x1)+10:Math.min(r.x0,s.x0)-10,z=side===2?Math.max(r.z1,s.z1)+10:Math.min(r.z0,s.z0)-10,outer=p=>side%2?{x,y:p.y,z:p.z}:{x:p.x,y:p.y,z};const F=outer(S),G=outer(E);path=[P,S,F,{...F,y:Q.y},G,E,Q];}
 const points=path.filter((p,n)=>!n||!same(p,path[n-1])),mounts=[];
 for(let n=1;n<points.length;n++){const p=points[n-1],q=points[n];if(p.y!==q.y)continue;const length=Math.hypot(q.x-p.x,q.z-p.z),steps=Math.max(1,Math.ceil(length/32));for(let k=0;k<=steps;k++){if(n===1&&k===0||n===points.length-1&&k===steps)continue;const x=p.x+(q.x-p.x)*k/steps,z=p.z+(q.z-p.z)*k/steps;const choices=[r,s].filter(r=>Math.abs((r.y??0)+16-p.y)<.001).map(r=>({r,x:Math.max(r.x0+4,Math.min(r.x1-4,x)),z:Math.max(r.z0+4,Math.min(r.z1-4,z))})).filter(c=>Math.hypot(c.x-x,c.z-z)<=20&&(!(Math.abs(c.x-x)>.001&&Math.abs(c.z-z)>.001))&&covered(c.r,c.x,c.z));const c=choices.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];if(!c)throw Error('配管を固定する床の端を残そう。');const m={roomId:c.r.id,x,z,y:p.y,footX:c.x,footZ:c.z};if(!mounts.some(a=>same(a,m)))mounts.push(m);}}
 if(mounts.length>48)throw Error('タンクをもう少し近くへ置こう。');return{id:0,kind:'riser',a,b,roomB,side,points,mounts};
}
export function pipeLinkShapeProblem(i){if(!keys(i,'a|b|id|kind|mounts|points|roomB|side')||![i.a,i.b,i.roomB].every(n=>Number.isSafeInteger(n)&&n>0)||!Number.isInteger(i.side)||i.side<0||i.side>3||!Array.isArray(i.points)||i.points.length<2||i.points.length>7||!i.points.every(point)||!Array.isArray(i.mounts)||!i.mounts.length||i.mounts.length>48||!i.mounts.every(m=>keys(m,'footX|footZ|roomId|x|y|z')&&Number.isSafeInteger(m.roomId)&&[m.x,m.y,m.z,m.footX,m.footZ].every(Number.isFinite)))return'階をつなぐ配管の記録をたしかめよう。';return'';}
export function pipeLinksProblem(rooms){const branches=branchesProblem(rooms);if(branches)return branches;const used=new Set();for(const r of rooms)for(const i of r.structure?.items??[]){if(!['pipe','riser','branch'].includes(i.kind))continue;for(const key of(i.kind==='branch'?[i.roomB+'/'+i.b]:[r.id+'/'+i.a,(i.kind==='riser'?i.roomB:r.id)+'/'+i.b])){if(used.has(key))return'この出口には配管があるよ。先に外そう。';used.add(key);}if(i.kind==='riser'){const problem=pipeLinkShapeProblem(i);if(problem)return problem;try{const expected=makePipeLink(rooms,r.id,i.a,i.roomB,i.b,i.side);if(JSON.stringify(i.points.map(p=>[p.x,p.y,p.z]))!==JSON.stringify(expected.points.map(p=>[p.x,p.y,p.z]))||JSON.stringify(i.mounts.map(m=>[m.roomId,m.x,m.y,m.z,m.footX,m.footZ]))!==JSON.stringify(expected.mounts.map(m=>[m.roomId,m.x,m.y,m.z,m.footX,m.footZ])))return'先に配管を外してから、床やタンクを動かそう。';}catch(e){return e.message;}}}return'';}
export function pipeLinkParts(r,i){const parts=[],make=(key,p)=>{const m=i.mounts.reduce((best,m)=>!best||Math.hypot(m.x-p.x,m.y-p.y,m.z-p.z)<Math.hypot(best.x-p.x,best.y-p.y,best.z-p.z)?m:best,null);return{id:r.id,detailId:i.id,key:'detail-'+i.id+'-riser-'+key,kind:'riser',structuralMaterial:'steel',...(i.kind==='branch'?{branchParentRoom:r.id,branchParentId:i.parentId,branchJoin:i.points[0]}:{}),loadRoomId:m?.roomId,loadX:m?.footX,loadZ:m?.footZ,...p};};
 for(let n=1;n<i.points.length;n++){const a=i.points[n-1],b=i.points[n],axis=Math.abs(b.y-a.y)>.001?'y':Math.abs(b.x-a.x)>.001?'x':'z',length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);parts.push(make('tube'+n,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2,w:axis==='x'?length:3,h:axis==='y'?length:3,d:axis==='z'?length:3,primitive:'pipe',axis,materialVolume:Math.PI*1.25*length}));}
 for(const[n,m]of i.mounts.entries()){parts.push(make('post'+n,{x:m.footX,z:m.footZ,y:m.y-7.25,w:3,h:11.5,d:3}));if(Math.hypot(m.x-m.footX,m.z-m.footZ)>.001)parts.push(make('bracket'+n,{x:(m.x+m.footX)/2,z:(m.z+m.footZ)/2,y:m.y-2.5,w:Math.max(3,Math.abs(m.x-m.footX)+3),h:2,d:Math.max(3,Math.abs(m.z-m.footZ)+3)}));}
 for(let n=i.kind==='branch'?0:1;n<i.points.length-1;n++)parts.push(make('joint'+n,{...i.points[n],w:4,h:4,d:4}));return parts;
}
export const pipeLinksRebar=rooms=>(rooms??[]).reduce((n,r)=>n+risers(r).reduce((n,i)=>n+Math.ceil(pipeLinkParts(r,i).reduce((s,p)=>s+(p.materialVolume??p.w*p.h*p.d),0)/768),0),0);
export function transferPipeLink(rooms,r,a){const i=risers(r).find(i=>i.id===a.detailId),s=rooms.find(r=>r.id===i?.roomB),A=tank(r,i?.a),B=tank(s,i?.b);if(!A||!B||typeof a.reverse!=='boolean'||!Number.isInteger(a.amountQ)||a.amountQ<1||a.amountQ>16)throw Error('つながったタンクから送ろう。');const from=a.reverse?B:A,to=a.reverse?A:B,q=Math.min(a.amountQ,from.waterQ,tankCapacity(to)-to.waterQ);if(!q)throw Error(from.waterQ?'送り先がいっぱいだよ。':'送る水がないよ。');from.waterQ-=q;to.waterQ+=q;}

// A bounded tee network: one original pipe plus up to two supported branches.
// Junctions are on real straight runs; no invisible tank teleport connections.
const branches=r=>(r?.structure?.items??[]).filter(i=>i.kind==='branch');
const rootPipe=(r,id)=>r?.structure?.items.find(i=>i.id===id&&['pipe','riser'].includes(i.kind));
export function pipeNetwork(rooms,roomId,id){
 let direct=directPipe(rooms,roomId,id),r=direct?.room,p=direct?.item;
 if(!p)for(const a of rooms){const b=branches(a).find(b=>b.roomB===roomId&&b.b===id);if(b){r=a;p=rootPipe(a,b.parentId);break;}}
 if(!p)return null;
 const forks=branches(r).filter(b=>b.parentId===p.id),ends=[{room:r,id:p.a},{room:rooms.find(a=>a.id===(p.kind==='pipe'?r.id:p.roomB)),id:p.b},...forks.map(b=>({room:rooms.find(a=>a.id===b.roomB),id:b.b,branch:b}))];
 if(ends.some(e=>!tank(e.room,e.id)))return null;
 return{room:r,item:p,branches:forks,ends:ends.map(e=>({...e,tank:tank(e.room,e.id)})),from:ends.find(e=>e.room.id===roomId&&e.id===id)};
}
export function connectedPipe(rooms,roomId,id){const d=directPipe(rooms,roomId,id);if(d)return d;const n=pipeNetwork(rooms,roomId,id);if(!n)return null;const e=n.ends[0],b=n.branches.find(b=>b.roomB===roomId&&b.b===id);return{room:n.room,item:b,otherRoom:e.room,other:e.tank,reverse:true};}
export function branchSegments(r,p){const points=p.kind==='pipe'?pipePoints(r,p):p.points;return points.slice(1).flatMap((q,n)=>{const a=points[n];return a.y===q.y&&Math.hypot(q.x-a.x,q.z-a.z)>=16?[n+1]:[];});}
export function makePipeBranch(rooms,roomId,parentId,segment,side,roomB,b){
 const r=rooms.find(r=>r.id===roomId),parent=rootPipe(r,parentId),s=rooms.find(r=>r.id===roomB),B=tank(s,b);
 if(!parent||!B||!branchSegments(r,parent).includes(segment)||![0,1].includes(side))throw Error('長い配管から、近くのタンクへ分けよう。');
 const line=parent.kind==='pipe'?pipePoints(r,parent):parent.points,A=line[segment-1],Z=line[segment],J={x:(A.x+Z.x)/2,y:A.y,z:(A.z+Z.z)/2},Q=furniturePoint(s,B,0,13,B.depth/2+8),E=furniturePoint(s,B,0,13,B.depth/2+20);
 if(Q.y!==J.y||Math.hypot(Q.x-J.x,Q.z-J.z)>320)throw Error('配管と同じ高さのタンクを選ぼう。');
 const across=A.x!==Z.x,sign=side?1:-1,S={x:J.x+(across?0:12*sign),y:J.y,z:J.z+(across?12*sign:0)},C=across?{x:E.x,y:J.y,z:S.z}:{x:S.x,y:J.y,z:E.z};
 const path=[J,S,C,E,Q],points=path.filter((p,n)=>!n||!same(p,path[n-1])),mounts=[];
 for(let n=1;n<points.length-1;n++){const a=points[n-1],p=points[n],b=points[n+1];if((p.x-a.x)*(b.x-p.x)+(p.z-a.z)*(b.z-p.z)<0)throw Error('配管が折り返して重なるよ。別の向きへ分けよう。');}
 for(let n=1;n<points.length;n++){const p=points[n-1],q=points[n],steps=Math.max(1,Math.ceil(Math.hypot(q.x-p.x,q.z-p.z)/32));for(let k=0;k<=steps;k++){
  if(n===1&&k===0||n===points.length-1&&k===steps)continue;
  const x=p.x+(q.x-p.x)*k/steps,z=p.z+(q.z-p.z)*k/steps;
  const choices=rooms.filter(a=>Math.abs((a.y??0)+16-p.y)<.001).map(a=>({r:a,x:Math.max(a.x0+4,Math.min(a.x1-4,x)),z:Math.max(a.z0+4,Math.min(a.z1-4,z))})).filter(c=>Math.hypot(c.x-x,c.z-z)<=20&&(!(Math.abs(c.x-x)>.001&&Math.abs(c.z-z)>.001))&&covered(c.r,c.x,c.z)).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z)||a.r.id-b.r.id);
  const c=choices[0];if(!c)throw Error('分岐の下に、配管を支える床を作ろう。');const m={roomId:c.r.id,x,z,y:p.y,footX:c.x,footZ:c.z};if(!mounts.some(a=>same(a,m)))mounts.push(m);
 }}
 if(mounts.length>48)throw Error('近くのタンクへ分けよう。');return{id:0,kind:'branch',parentId,segment,side,roomB,b,points,mounts};
}
export function branchShapeProblem(i){
 if(!keys(i,'b|id|kind|mounts|parentId|points|roomB|segment|side')||![i.parentId,i.segment,i.roomB,i.b].every(n=>Number.isSafeInteger(n)&&n>0)||![0,1].includes(i.side))return'分岐の記録をたしかめよう。';
 return pipeLinkShapeProblem({id:i.id,kind:'riser',a:1,b:i.b,roomB:i.roomB,side:i.side,points:i.points,mounts:i.mounts});
}
function branchesProblem(rooms){for(const r of rooms){const counts=new Map();for(const b of branches(r)){
 const malformed=branchShapeProblem(b);if(malformed)return malformed;
 const count=(counts.get(b.parentId)??0)+1;counts.set(b.parentId,count);if(count>2)return'1本から分ける配管は2本までだよ。';
 try{const expected=makePipeBranch(rooms,r.id,b.parentId,b.segment,b.side,b.roomB,b.b);
 if(JSON.stringify(b.points.map(p=>[p.x,p.y,p.z]))!==JSON.stringify(expected.points.map(p=>[p.x,p.y,p.z]))||JSON.stringify(b.mounts.map(m=>[m.roomId,m.x,m.y,m.z,m.footX,m.footZ]))!==JSON.stringify(expected.mounts.map(m=>[m.roomId,m.x,m.y,m.z,m.footX,m.footZ])))return'先に分岐を外してから、床やタンクを動かそう。';
 if(branches(r).some(other=>other!==b&&other.parentId===b.parentId&&Math.hypot(other.points[0].x-b.points[0].x,other.points[0].y-b.points[0].y,other.points[0].z-b.points[0].z)<12))return'分岐のつなぎ目を離そう。';
 }catch(e){return e.message;}
 }}return'';}
// Only the small tee intersection with its actual parent is exempted. A pipe
// crossing elsewhere, furniture, walls and supports still collide normally.
export function pipeJointContact(a,b){for(const[p,q]of[[a,b],[b,a]]){
 if(!p.branchJoin||q.id!==p.branchParentRoom||q.detailId!==p.branchParentId)continue;
 const j=p.branchJoin,axes=[['x','w'],['y','h'],['z','d']];
 if(axes.every(([k,size])=>Math.max(p[k]-p[size]/2,q[k]-q[size]/2)>=j[k]-2.01&&Math.min(p[k]+p[size]/2,q[k]+q[size]/2)<=j[k]+2.01))return true;
 }return false;}
export function transferPipeNetwork(rooms,a){
 const n=pipeNetwork(rooms,a.id,a.from),from=n?.ends.find(e=>e.room.id===a.id&&e.id===a.from)?.tank,to=n?.ends.find(e=>e.room.id===a.toRoom&&e.id===a.to)?.tank;
 if(!from||!to||from===to||!Number.isInteger(a.amountQ)||a.amountQ<1||a.amountQ>16)throw Error('配管につながった別のタンクへ送ろう。');
 const q=Math.min(a.amountQ,from.waterQ,tankCapacity(to)-to.waterQ);if(!q)throw Error(from.waterQ?'送り先がいっぱいだよ。':'送る水がないよ。');from.waterQ-=q;to.waterQ+=q;
}
