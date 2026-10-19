// Retrofit doors are optional room fixtures. The original wall and paint IDs
// stay immutable; drawing and collision both use these exact cut pieces.
const ok=(v,m)=>{if(!v)throw Error(m);};
const sides=['front','right','back','left'];
export function wallDoorLocation(floor,wall){
 ok(wall&&Object.keys(wall).sort().join('|')==='cell|side'&&Number.isInteger(wall.cell)&&wall.cell>=0&&wall.cell<16&&sides.includes(wall.side),'とびらを付ける壁をえらぼう。');
 const x=(wall.cell%4)*32-48,z=Math.floor(wall.cell/4)*32-48,turn=sides.indexOf(wall.side);
 return{floor,x:x+(turn===1?16:turn===3?-16:0),z:z+(turn===0?16:turn===2?-16:0),turn};
}
export function wallDoorHost(w,i){
 const q=wallDoorLocation(i.floor,i.wall),host=w.blueprint?.walls?.[i.floor]?.find(v=>v.cell===i.wall.cell&&v.side===i.wall.side);
 ok(w.version===5&&w.levels===w.blueprint.storeys.length&&host?.kind==='solid','完成した建物の、窓のない壁をえらぼう。');
 ok(['x','z','turn','floor'].every(k=>i[k]===q[k]),'とびらの場所と壁が合わないよ。');
 return{kind:'wall',x:q.x,y:i.floor*40+18,z:q.z,w:i.turn%2?4:26,h:36,d:i.turn%2?26:4};
}
export function isWallDoorHost(i,p){return i.kind==='wallDoor'&&p.kind==='wall'&&p.h===36&&Math.abs(p.y-(i.floor*40+18))<1e-8&&p.x===i.x&&p.z===i.z&&Math.max(p.w,p.d)===26;}
export function wallDoorForPart(w,p){return(w.roomLayout?.items??[]).find(i=>isWallDoorHost(i,p));}
export function wallDoorCutPart(w,p){
 const i=wallDoorForPart(w,p);if(!i)return[p];const tan=i.turn%2?'z':'x',dim=tan==='x'?'w':'d',base=i.floor*40;
 return[-1,1].map(sign=>({...p,[tan]:p[tan]+sign*12.75,[dim]:.5,y:base+15,h:30,wallDoorId:i.id})).concat({...p,y:base+33,h:6,wallDoorId:i.id});
}
export function wallDoorParts(i,{sweep=false,open=i.open,progress=null}={}){
 const local=[{kind:'landing',x:0,y:-1,z:14,w:25,h:2,d:28},{kind:'frame',x:0,y:30.8,z:3.3,w:25,h:1.2,d:2}, {kind:'track',x:-14,y:32.7,z:4.5,w:56,h:1.4,d:1.5},sweep?{kind:'leaf',x:-14,y:15,z:4.5,w:53,h:29.6,d:1}:{kind:'leaf',x:-28*(progress??(open?1:0)),y:15,z:4.5,w:25,h:29.6,d:1}],a=i.turn*Math.PI/2,c=Math.round(Math.cos(a)),s=Math.round(Math.sin(a));
 return local.map(p=>({...p,x:i.x+p.x*c+p.z*s,y:i.floor*40+p.y,z:i.z-p.x*s+p.z*c,w:i.turn%2?p.d:p.w,d:i.turn%2?p.w:p.d,fixtureId:i.id}));
}
export function wallDoorCandidates(w,floor){return(w.blueprint?.walls?.[floor]??[]).filter(v=>v.kind==='solid').map(wall=>({kind:'wallDoor',...wallDoorLocation(floor,{cell:wall.cell,side:wall.side}),wall:{cell:wall.cell,side:wall.side}}));}
function subtract(r,b){const x0=Math.max(r.x0,b.x0),x1=Math.min(r.x1,b.x1),y0=Math.max(r.y0,b.y0),y1=Math.min(r.y1,b.y1);if(x1<=x0||y1<=y0)return[r];return[{x0:r.x0,x1:x0,y0:r.y0,y1:r.y1},{x0:x1,x1:r.x1,y0:r.y0,y1:r.y1},{x0,y0:r.y0,x1,y1:y0},{x0,y0:y1,x1,y1:r.y1}].filter(p=>p.x1-p.x0>1e-6&&p.y1-p.y0>1e-6);}
export function wallDoorPaintPatches(w,p,patches){const i=wallDoorForPart(w,p);if(!i)return patches;const tan=i.turn%2?'z':'x',hole={x0:i[tan]-12.5,x1:i[tan]+12.5,y0:i.floor*40,y1:i.floor*40+30};return patches.map(q=>{const rects=q.tan===tan?q.rects.flatMap(r=>subtract(r,hole)):q.rects;return{...q,rects,area:rects.reduce((n,r)=>n+(r.x1-r.x0)*(r.y1-r.y0),0)};});}
