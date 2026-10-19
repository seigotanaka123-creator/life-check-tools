import{validateHighShape,shapedHighParts}from'./imasora-construction-high-shape.mjs';
import{validateRoomItem,roomItemParts}from'./imasora-construction-room-layout-shape.mjs?v=120fr';
import{validPaintColor}from'./imasora-construction-concrete/paint-colors.mjs';
const ok=(v,m)=>{if(!v)throw Error(m);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),keys=(o,k)=>o&&Object.keys(o).sort().join('|')===k;
export const DECOR_FACES=['top','bottom','north','south','east','west'];
export const decorItem=i=>({...structuredClone(i),...('open'in i?{open:false}:{})});
export const decorKey=t=>t.kind==='fixture'?'item:'+t.itemId+':'+t.face:t.kind+':'+t.floor+':'+t.part+':'+t.face;
export function validateDecorTarget(t,plan){
 ok(t&&['floor','ceiling','fixture'].includes(t.kind)&&Number.isInteger(t.floor)&&t.floor>=0&&t.floor<=plan.storeys.length,'ぬる階と場所をえらぼう。');
 if(t.kind==='fixture')ok(keys(t,'face|floor|itemId|kind')&&/^room-[1-9][0-9]*$/.test(t.itemId)&&t.itemId.length<=24&&t.floor<plan.storeys.length&&DECOR_FACES.includes(t.face),'ぬる家具をえらぼう。');
 else{ok(keys(t,'face|floor|kind|part')&&Number.isInteger(t.part)&&t.part>=0&&t.part<1024&&(t.kind==='floor'?t.floor>0&&t.face==='top':t.floor<plan.storeys.length&&t.face==='bottom'),'床か天井の面をえらぼう。');const p=shapedHighParts(t.kind==='floor'?t.floor:t.floor+1,{version:5,blueprint:plan})[t.part];ok(p&&(t.kind==='floor'?p.kind==='floor':['floor','beam'].includes(p.kind)),'実際にある床か天井をえらぼう。');}
 return t;
}
export function validateDecorAction(a){
 ok(/^building-[1-9][0-9]*$/.test(a.buildingId)&&a.buildingId.length<=24,'ぬる建物をえらぼう。');if(a.plan!==null){validateHighShape(a.plan);ok(a.plan.interiorStairs===true,'内階段のある建物をえらぼう。');validateDecorTarget(a.target,a.plan);}
 ok(['roller','brush'].includes(a.tool)&&(validPaintColor(a.color)||a.color==='bare'&&a.tool==='brush')&&Array.isArray(a.pixels)&&a.pixels.length>0&&a.pixels.length<=16&&new Set(a.pixels).size===a.pixels.length&&a.pixels.every(n=>Number.isInteger(n)&&n>=0&&n<16)&&(a.tool!=='roller'||a.pixels.length===16),'色と道具、ぬる模様をえらぼう。');
 if(a.target?.kind==='fixture'){validateRoomItem(a.item);ok(a.item.id===a.target.itemId&&a.item.floor===a.target.floor&&same(a.item,decorItem(a.item)),'家具の形が変わったよ。えらび直そう。');}else ok(a.item===null,'床・天井の場所をえらび直そう。');a.pixels=[...a.pixels].sort((a,b)=>a-b);return a;
}
const faceAxes=face=>face==='top'||face==='bottom'?{axis:'y',u:'x',v:'z',sign:face==='top'?1:-1}:face==='north'||face==='south'?{axis:'z',u:'x',v:'y',sign:face==='south'?1:-1}:{axis:'x',u:'z',v:'y',sign:face==='east'?1:-1};
const dim={x:'w',y:'h',z:'d'};
function subtract(r,b){const x0=Math.max(r.x0,b.x0),x1=Math.min(r.x1,b.x1),y0=Math.max(r.y0,b.y0),y1=Math.min(r.y1,b.y1);if(x1<=x0||y1<=y0)return[r];return[{x0:r.x0,x1:x0,y0:r.y0,y1:r.y1},{x0:x1,x1:r.x1,y0:r.y0,y1:r.y1},{x0,y0:r.y0,x1,y1:y0},{x0,y0:y1,x1,y1:r.y1}].filter(p=>p.x1-p.x0>1e-6&&p.y1-p.y0>1e-6);}
export function decorParts(plan,t,item){if(t.kind==='fixture')return roomItemParts(item).map((p,part)=>({...p,part})).filter(p=>!['door','wallDoor'].includes(item.kind)||p.kind==='leaf');return[{...shapedHighParts(t.kind==='floor'?t.floor:t.floor+1,{version:5,blueprint:plan})[t.part],part:t.part}];}
const patchCache=new Map();
export function decorPatches(plan,t,item=null){
 validateDecorTarget(t,plan);const key=JSON.stringify([plan,t,item]);if(patchCache.has(key))return patchCache.get(key);const parts=decorParts(plan,t,item),other=t.kind==='fixture'?parts:Array.from({length:plan.storeys.length},(_,n)=>shapedHighParts(n+1,{version:5,blueprint:plan})).flat(),{axis,u,v,sign}=faceAxes(t.face),du=dim[u],dv=dim[v],da=dim[axis],out=[];
 for(const p of parts){const plane=p[axis]+sign*p[da]/2,left=p[u]-p[du]/2,bottom=p[v]-p[dv]/2,blockers=other.filter(b=>!(t.kind==='fixture'?b.part===p.part:['x','y','z','w','h','d'].every(k=>b[k]===p[k]))&&(t.kind==='fixture'||b[axis]-b[da]/2<=plane+.001&&b[axis]+b[da]/2>=plane-.001)&&(b[axis]+sign*b[da]/2-plane)*sign>.001).map(b=>({x0:b[u]-b[du]/2,x1:b[u]+b[du]/2,y0:b[v]-b[dv]/2,y1:b[v]+b[dv]/2}));
  for(let pixel=0;pixel<16;pixel++){let rects=[{x0:left+(pixel%4)*p[du]/4,x1:left+(pixel%4+1)*p[du]/4,y0:bottom+Math.floor(pixel/4)*p[dv]/4,y1:bottom+(Math.floor(pixel/4)+1)*p[dv]/4}];for(const b of blockers)rects=rects.flatMap(r=>subtract(r,b));out.push({pixel,part:p.part,rects,axis,u,v,sign,plane:plane+sign*.045,area:rects.reduce((n,r)=>n+(r.x1-r.x0)*(r.y1-r.y0),0)});}
 }
 for(const p of out){p.rects.forEach(Object.freeze);Object.freeze(p.rects);Object.freeze(p);}Object.freeze(out);if(patchCache.size>=512)patchCache.clear();patchCache.set(key,out);return out;
}
export function decorPoint(p,r){return{[p.axis]:p.plane,[p.u]:(r.x0+r.x1)/2,[p.v]:(r.y0+r.y1)/2};}
export function decorPaintPlan(f,a){
 validateDecorAction(a);const group=f.decorPaint?.groups.find(g=>g.buildingId===a.buildingId),plan=group?.plan??a.plan;ok(plan&&(!group||a.plan===null||same(group.plan,a.plan)),'建物の形をえらび直そう。');validateDecorTarget(a.target,plan);const prior=group?.fixtures.find(i=>i.id===a.target.itemId);ok(!prior||same(prior,a.item),'家具の形が変わったよ。色は残しているよ。');const patches=decorPatches(plan,a.target,a.item),key=decorKey(a.target),values=group?.faces[key]??[],color=a.color==='bare'?null:a.color,changes=[];let cost=0;
 for(const pixel of a.pixels){const area=patches.filter(p=>p.pixel===pixel).reduce((n,p)=>n+p.area,0);if(area>1e-8&&(values[pixel]??null)!==color){changes.push({pixel,color});if(color!==null)cost+=area/64;}}
 ok(patches.some(p=>a.pixels.includes(p.pixel)&&p.area>0),'見える面をえらぼう。');return{group,plan,key,patches,changes,cost};
}
export function applyDecorPaint(p,a,ledger){const q=decorPaintPlan(p.freeBuild,a);ok(q.cost<=(ledger.quantities.paintSurfaceCredits-(p.paintUsed??0))+1e-9,'ペンキが足りないよ。建材受取所で受け取ろう。');if(!q.changes.length)return;p.freeBuild.decorPaint??={version:1,groups:[]};let g=p.freeBuild.decorPaint.groups.find(g=>g.buildingId===a.buildingId);if(!g){ok(p.freeBuild.decorPaint.groups.length<128,'先に今の建物を仕上げよう。');g={buildingId:a.buildingId,plan:structuredClone(q.plan),fixtures:[],faces:{}};p.freeBuild.decorPaint.groups.push(g);}if(a.item&&!g.fixtures.some(i=>i.id===a.item.id)){ok(g.fixtures.length<128,'この建物の家具を仕上げてから進もう。');g.fixtures.push(structuredClone(a.item));}ok(Object.hasOwn(g.faces,q.key)||Object.keys(g.faces).length<2048,'この建物を仕上げてから進もう。');g.faces[q.key]??=Array(16).fill(null);for(const c of q.changes)g.faces[q.key][c.pixel]=c.color;if(g.faces[q.key].every(c=>c===null))delete g.faces[q.key];p.paintUsed=(p.paintUsed??0)+q.cost;}
export function decorTargetFromKey(key,fixtures){const[k,a,b,c]=key.split(':');if(k==='item'){const i=fixtures.find(i=>i.id===a);ok(i,'家具の記録を残して止めたよ。');return{kind:'fixture',floor:i.floor,itemId:a,face:b};}return{kind:k,floor:Number(a),part:Number(b),face:c};}
