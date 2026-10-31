// Shape v1 uses 4×4×8 blocks: one selected cell owns one existing quarter cup.
// Legacy castings have no shape and remain the original 16×16×2 flat slab.
import {levelDesign} from './design-levels.mjs?v=120hb';
const ok=(v,m)=>{if(!v)throw Error(m);};
export function validateUpperMask(mask){
 ok(Number.isInteger(mask)&&mask>0&&mask<=65535,'つくるマスを一つ以上えらぼう。');
 const cells=Array.from({length:16},(_,i)=>i).filter(i=>mask&(1<<i)),seen=new Set([cells[0]]),todo=[cells[0]];
 while(todo.length){const n=todo.pop(),x=n%4,z=Math.floor(n/4);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=b*4+a;if(a>=0&&a<4&&b>=0&&b<4&&(mask&(1<<k))&&!seen.has(k)){seen.add(k);todo.push(k);}}}
 ok(seen.size===cells.length,'マスを辺でつなげると、生コンをいっしょに注げるよ。');return mask;
}
export function upperShapeTiles(shape){
 if(!shape)return[{cell:0,x:0,z:0,w:16,d:16}];
 if(shape.version===3){const p=upperSizedShape(shape.levels,shape.width,shape.depth);ok(Object.keys(shape).sort().join('|')==='depth|levels|mask|version|width'&&p.version===3&&p.mask===shape.mask,'大きさと形をえらび直そう。');const {columns,rows}=upperGridSize(shape.width,shape.depth,shape.levels);return p.levels.flatMap((h,i)=>h?[{cell:i,x:-shape.width/2+columns.slice(0,i%4).reduce((a,b)=>a+b,0)+columns[i%4]/2,z:-shape.depth/2+rows.slice(0,Math.floor(i/4)).reduce((a,b)=>a+b,0)+rows[Math.floor(i/4)]/2,w:columns[i%4],d:rows[Math.floor(i/4)],height:h}]:[]);}
 if(shape.version===2){ok(Object.keys(shape).sort().join('|')==='levels|mask|version','屋上の形をえらび直そう。');const p=levelDesign(shape.levels);ok(p.mask===shape.mask,'形と高さをえらび直そう。');validateUpperMask(shape.mask);return p.levels.flatMap((h,i)=>h?[{cell:i,x:(i%4)*4-6,z:Math.floor(i/4)*4-6,w:4,d:4,height:h}]:[]);}
 ok(shape.version===1&&Object.keys(shape).sort().join('|')==='mask|version','屋上の形をえらび直そう。');validateUpperMask(shape.mask);
 return Array.from({length:16},(_,i)=>i).filter(i=>shape.mask&(1<<i)).map(i=>({cell:i,x:(i%4)*4-6,z:Math.floor(i/4)*4-6,w:4,d:4}));
}
// v2 counts 32-volume marks (1/16 cup); legacy fills remain 128-volume quarters.
export const upperLevelCasting=c=>c?.shape?.version>=2;
export const upperCastingCapacity=c=>upperLevelCasting(c)?upperShapeTiles(c.shape).reduce((n,t)=>n+t.w*t.d*t.height/32,0):c?.shape?upperShapeTiles(c.shape).length:4;
export const upperCastingHeight=c=>upperLevelCasting(c)?Math.max(...upperShapeTiles(c.shape).map(t=>t.height)):c?.shape?8:2;
export const upperTileHeight=(c,t)=>upperLevelCasting(c)?t.height:upperCastingHeight(c);
export const upperUnitVolume=c=>upperLevelCasting(c)?32:128;
export const upperFillCups=c=>(c.fill??0)/(upperLevelCasting(c)?16:4);
export const upperCapacityCups=c=>upperCastingCapacity(c)/(upperLevelCasting(c)?16:4);
export const upperPendingUnits=c=>c.pending?(upperLevelCasting(c)?c.pending.units:1):0;
export function upperCupText(c,units=null){let n=units??upperCastingCapacity(c),den=upperLevelCasting(c)?16:4;for(const f of[2,2,2,2])if(n%f===0&&den%f===0){n/=f;den/=f;}return den===1?String(n):n===0?'0':n+'/'+den;}
export const upperAmountText=(c,units=upperCastingCapacity(c))=>upperLevelCasting(c)?units+'目盛':upperCupText(c,units)+'杯';
export function upperLevelShape(levels){const p=levelDesign(levels);validateUpperMask(p.mask);return{version:2,mask:p.mask,levels:p.levels};}
export function upperDistributionSegments(c){if(!upperLevelCasting(c))return[];const h=upperCastingHeight(c),p=upperPourTile(c),hub={x:0,y:h+3.5,z:0},out=[[{x:p.x,y:h+4,z:p.z},hub]];for(const t of upperShapeTiles(c.shape))out.push([hub,{x:t.x,y:h+3,z:t.z}]);return out;}

// Each straight exposed run uses one finite board, cut to fit (length ≤16).
// Adjacent cells share concrete; they do not retain an internal wooden wall.
export function upperShapeBoundary(shape){
 if(!shape)return[{x:0,z:-8,w:16,d:.4},{x:0,z:8,w:16,d:.4},{x:-8,z:0,w:.4,d:16},{x:8,z:0,w:.4,d:16}];
 if(shape.version===3)return sizedBoundary(shape);
 const tiles=upperShapeTiles(shape),mask=shape.mask,groups=new Map();
 for(const p of tiles){const i=p.cell,x=i%4,z=Math.floor(i/4);for(const [axis,line,start,present]of[['x',z,x,z>0&&(mask&(1<<(i-4)))],['x',z+1,x,z<3&&(mask&(1<<(i+4)))],['z',x,z,x>0&&(mask&(1<<(i-1)))],['z',x+1,z,x<3&&(mask&(1<<(i+1)))]])if(!present){const k=axis+':'+line;if(!groups.has(k))groups.set(k,{axis,line,values:[]});groups.get(k).values.push(start);}}
 const walls=[];for(const {axis,line,values}of groups.values()){values.sort((a,b)=>a-b);for(let a=0;a<values.length;){let b=a;while(b+1<values.length&&values[b+1]===values[b]+1)b++;const center=(values[a]+values[b]+1)*2-8,length=(b-a+1)*4;walls.push(axis==='x'?{x:center,z:line*4-8,w:length,d:.4}:{x:line*4-8,z:center,w:.4,d:length});a=b+1;}}
 return walls;
}
export const upperCastingBoards=c=>upperShapeBoundary(c?.shape).length;
export const upperCastingCupText=c=>upperCupText(c);
export function upperPourTile(c){const tiles=upperShapeTiles(c?.shape);return tiles.reduce((a,b)=>a.z>b.z||a.z===b.z&&Math.abs(a.x)<=Math.abs(b.x)?a:b);}

export function upperSizeMinimum(levels){const cells=levels.flatMap((h,i)=>h?[i]:[]);ok(cells.length,'つくるマスを一つ以上えらぼう。');const xs=cells.map(i=>i%4),zs=cells.map(i=>Math.floor(i/4)),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);return{width:(maxX-minX+1)*4,depth:(maxZ-minZ+1)*4,minX,maxX,minZ,maxZ};}
export function upperGridSize(width=16,depth=16,levels=Array(16).fill(2)){const b=upperSizeMinimum(levels);ok([[width,b.width],[depth,b.depth]].every(([n,min])=>Number.isInteger(n)&&n>=min&&n<=64&&n%4===0),'形のマスが入る大きさから64まで、4ずつえらぼう。');const split=(n,lo,hi)=>Array.from({length:4},(_,i)=>i<lo||i>hi?0:(Math.floor(n/(4*(hi-lo+1)))+(i-lo<n/4%(hi-lo+1)?1:0))*4);return{columns:split(width,b.minX,b.maxX),rows:split(depth,b.minZ,b.maxZ)};}
export function upperSizedShape(levels,width,depth){const p=upperLevelShape(levels);upperGridSize(width,depth,p.levels);return{version:3,mask:p.mask,levels:p.levels,width,depth};}
export const upperDesignShape=d=>Object.hasOwn(d,'width')||Object.hasOwn(d,'depth')?upperSizedShape(d.levels,d.width,d.depth):upperLevelShape(d.levels);
export function upperShapeSize(shape){const tiles=upperShapeTiles(shape);return{width:Math.max(...tiles.map(t=>t.x+t.w/2))-Math.min(...tiles.map(t=>t.x-t.w/2)),depth:Math.max(...tiles.map(t=>t.z+t.d/2))-Math.min(...tiles.map(t=>t.z-t.d/2))};}
export const upperDesignGeometry=shape=>({levels:[...shape.levels],...(shape.version===3?{width:shape.width,depth:shape.depth}:{})});
export function sameUpperDesign(a,b){return JSON.stringify(upperDesignGeometry(upperDesignShape(a)))===JSON.stringify(upperDesignGeometry(upperDesignShape(b)));}
function sizedBoundary(shape){const tiles=upperShapeTiles(shape),groups=new Map();for(const p of tiles){const i=p.cell,x=i%4,z=Math.floor(i/4);for(const [axis,line,start,end,neighbor]of[['x',p.z-p.d/2,p.x-p.w/2,p.x+p.w/2,z>0?i-4:-1],['x',p.z+p.d/2,p.x-p.w/2,p.x+p.w/2,z<3?i+4:-1],['z',p.x-p.w/2,p.z-p.d/2,p.z+p.d/2,x>0?i-1:-1],['z',p.x+p.w/2,p.z-p.d/2,p.z+p.d/2,x<3?i+1:-1]])if(neighbor<0||!(shape.mask&(1<<neighbor))){const key=axis+':'+line;if(!groups.has(key))groups.set(key,{axis,line,ranges:[]});groups.get(key).ranges.push([start,end]);}}const result=[];for(const{axis,line,ranges}of groups.values()){ranges.sort((a,b)=>a[0]-b[0]);const runs=[];for(const r of ranges){const last=runs.at(-1);if(last&&last[1]===r[0])last[1]=r[1];else runs.push([...r]);}for(const[a,b]of runs)for(let start=a;start<b;start+=16){const end=Math.min(b,start+16),center=(start+end)/2,length=end-start;result.push(axis==='x'?{x:center,z:line,w:length,d:.4}:{x:line,z:center,w:.4,d:length});}}return result;}

export const upperActionShape=a=>Object.hasOwn(a,'width')||Object.hasOwn(a,'depth')?upperSizedShape(a.levels,a.width,a.depth):upperLevelShape(a.levels);
