// One bounded gesture produces one atomic edit. Existing floors, openings and
// differently sized columns are never silently replaced by a repeated pattern.
import{details}from'./imasora-construction-reel-structure.mjs?v=120pm';
export const REPEAT_TYPES=['FLOOR_REPEAT','WALL_REPEAT','COLUMN_ARRAY'];
const sides=['north','east','south','west'],copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);},sameRect=(a,b)=>['x0','x1','z0','z1'].every(k=>a[k]===b[k])&&(a.y??0)===(b.y??0),empty=r=>({...r,walls:Object.fromEntries(sides.map(s=>[s,0])),structure:undefined});
const signature=items=>items.map(i=>JSON.stringify([i.kind,i.side,i.u,i.width,i.height,i.bottom,i.kind==='door'?i.open:null])).sort().join('/');
export function repeatRooms(rooms,a,nextId){const r=rooms.find(r=>r.id===a.id),previewRooms=[];try{
 ok(r,'ならべる元の床をえらぼう。');ok(Number.isInteger(a.count)&&a.count>=1&&a.count<=15,'引く長さを変えて、1〜15こをならべよう。');
 const original=copy(r),w=r.x1-r.x0,d=r.z1-r.z0;
 if(a.type==='FLOOR_REPEAT'){
  ok(sides.includes(a.side),'床の辺から外へ引こう。');const dx=a.side==='east'?w:a.side==='west'?-w:0,dz=a.side==='south'?d:a.side==='north'?-d:0;
  for(let n=1;n<=a.count;n++){const target={id:nextId,...(r.floorMaterial?{floorMaterial:r.floorMaterial}:{}),x0:r.x0+dx*n,x1:r.x1+dx*n,z0:r.z0+dz*n,z1:r.z1+dz*n,...(r.y!==undefined?{y:r.y}:{}),walls:Object.fromEntries(sides.map(s=>[s,0]))};if(rooms.some(b=>sameRect(b,target)))continue;ok(rooms.length<16,'床は16枚までだよ。');target.id=nextId++;rooms.push(target);previewRooms.push(copy(target));}
 }else if(a.type==='WALL_REPEAT'){
  ok(sides.includes(a.side)&&[-1,1].includes(a.direction),'壁の端から横へ引こう。');ok(r.walls[a.side]>0,'ならべる壁を先に起こそう。');
  const across=a.side==='north'||a.side==='south',holes=details(original).filter(i=>['door','window'].includes(i.kind)&&i.side===a.side);
  for(let n=1;n<=a.count;n++){const dx=across?w*a.direction*n:0,dz=across?0:d*a.direction*n,rect={...original,x0:r.x0+dx,x1:r.x1+dx,z0:r.z0+dz,z1:r.z1+dz},target=rooms.find(b=>sameRect(b,rect));ok(target,'先に、となりへ同じ大きさの床をならべよう。');
   const existing=details(target).filter(i=>['door','window'].includes(i.kind)&&i.side===a.side);if(target.walls[a.side]===original.walls[a.side]&&signature(existing)===signature(holes))continue;
   ok(target.walls[a.side]===0&&!existing.length,'となりの壁はそのまま残すよ。別の場所へつなごう。');target.walls[a.side]=original.walls[a.side];const added=[];
   if(holes.length){target.structure??={version:1,nextId:1,items:[]};for(const h of holes){const item={...copy(h),id:target.structure.nextId++};target.structure.items.push(item);added.push(copy(item));}}
   const p=empty(copy(target));delete p.structure;p.walls[a.side]=target.walls[a.side];if(added.length)p.structure={version:1,nextId:target.structure.nextId,items:added};previewRooms.push(p);
  }
 }else if(a.type==='COLUMN_ARRAY'){
  const c=details(original).find(i=>i.id===a.detailId);ok(c?.kind==='column','ならべたい柱を押してえらぼう。');ok(['x','z'].includes(a.axis)&&[-1,1].includes(a.direction)&&Number.isInteger(a.spacing)&&a.spacing>=16&&a.spacing<=128&&a.spacing%8===0,'柱の間隔をえらび直そう。');
  const previews=new Map();for(let n=1;n<=a.count;n++){const x=c.x+(a.axis==='x'?n*a.spacing*a.direction:0),z=c.z+(a.axis==='z'?n*a.spacing*a.direction:0),target=rooms.find(b=>(b.y??0)===(r.y??0)&&x-4>=b.x0&&x+4<=b.x1&&z-4>=b.z0&&z+4<=b.z1);ok(target,'柱の足元まで、先に床をならべよう。');const found=details(target).find(i=>i.kind==='column'&&i.x===x&&i.z===z);if(found){ok(found.height===c.height&&found.material===c.material,'高さや材料の違う柱はそのまま残すよ。');continue;}
   target.structure??={version:1,nextId:1,items:[]};target.structure.version=Math.max(target.structure.version,c.material==='steel'?12:1);const item={id:target.structure.nextId++,kind:'column',...(c.material?{material:c.material}:{}),x,z,height:c.height};target.structure.items.push(item);let p=previews.get(target.id);if(!p){p=empty(copy(target));p.structure={version:target.structure.version,nextId:target.structure.nextId,items:[]};previews.set(target.id,p);previewRooms.push(p);}p.structure.nextId=target.structure.nextId;p.structure.items.push(copy(item));
  }
 }else ok(false,'ならべる道具をえらび直そう。');
 return{rooms,room:r,selected:r.id,nextId,previewRooms,addedCount:a.type==='COLUMN_ARRAY'?previewRooms.reduce((n,p)=>n+details(p).length,0):previewRooms.length,problem:''};
 }catch(e){return{room:r,previewRooms,problem:e.message};}}
