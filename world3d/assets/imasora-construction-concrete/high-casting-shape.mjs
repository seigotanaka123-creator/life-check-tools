// Shape v1 uses 4×4×8 blocks: one selected cell owns one existing quarter cup.
// Legacy castings have no shape and remain the original 16×16×2 flat slab.
const ok=(v,m)=>{if(!v)throw Error(m);};
export function validateUpperMask(mask){
 ok(Number.isInteger(mask)&&mask>0&&mask<=65535,'つくるマスを一つ以上えらぼう。');
 const cells=Array.from({length:16},(_,i)=>i).filter(i=>mask&(1<<i)),seen=new Set([cells[0]]),todo=[cells[0]];
 while(todo.length){const n=todo.pop(),x=n%4,z=Math.floor(n/4);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=b*4+a;if(a>=0&&a<4&&b>=0&&b<4&&(mask&(1<<k))&&!seen.has(k)){seen.add(k);todo.push(k);}}}
 ok(seen.size===cells.length,'マスを辺でつなげると、生コンをいっしょに注げるよ。');return mask;
}
export function upperShapeTiles(shape){
 if(!shape)return[{cell:0,x:0,z:0,w:16,d:16}];
 ok(shape.version===1&&Object.keys(shape).sort().join('|')==='mask|version','屋上の形をえらび直そう。');validateUpperMask(shape.mask);
 return Array.from({length:16},(_,i)=>i).filter(i=>shape.mask&(1<<i)).map(i=>({cell:i,x:(i%4)*4-6,z:Math.floor(i/4)*4-6,w:4,d:4}));
}
export const upperCastingCapacity=c=>c?.shape?upperShapeTiles(c.shape).length:4;
export const upperCastingHeight=c=>c?.shape?8:2;
// Each straight exposed run uses one finite board, cut to fit (length ≤16).
// Adjacent cells share concrete; they do not retain an internal wooden wall.
export function upperShapeBoundary(shape){
 if(!shape)return[{x:0,z:-8,w:16,d:.4},{x:0,z:8,w:16,d:.4},{x:-8,z:0,w:.4,d:16},{x:8,z:0,w:.4,d:16}];
 const tiles=upperShapeTiles(shape),mask=shape.mask,groups=new Map();
 for(const p of tiles){const i=p.cell,x=i%4,z=Math.floor(i/4);for(const [axis,line,start,present]of[['x',z,x,z>0&&(mask&(1<<(i-4)))],['x',z+1,x,z<3&&(mask&(1<<(i+4)))],['z',x,z,x>0&&(mask&(1<<(i-1)))],['z',x+1,z,x<3&&(mask&(1<<(i+1)))]])if(!present){const k=axis+':'+line;if(!groups.has(k))groups.set(k,{axis,line,values:[]});groups.get(k).values.push(start);}}
 const walls=[];for(const {axis,line,values}of groups.values()){values.sort((a,b)=>a-b);for(let a=0;a<values.length;){let b=a;while(b+1<values.length&&values[b+1]===values[b]+1)b++;const center=(values[a]+values[b]+1)*2-8,length=(b-a+1)*4;walls.push(axis==='x'?{x:center,z:line*4-8,w:length,d:.4}:{x:line*4-8,z:center,w:.4,d:length});a=b+1;}}
 return walls;
}
export const upperCastingBoards=c=>upperShapeBoundary(c?.shape).length;
export const upperCastingCupText=c=>String(upperCastingCapacity(c)/4);
export function upperPourTile(c){const tiles=upperShapeTiles(c?.shape);return tiles.reduce((a,b)=>a.z>b.z||a.z===b.z&&Math.abs(a.x)<=Math.abs(b.x)?a:b);}
