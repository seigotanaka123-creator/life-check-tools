import{stairPlacement,stairPoint,stairEntry,stairEntranceColumn,validateStairPlacement,stairConflictsBay}from'./imasora-construction-stair-placement.mjs?v=120gn';
import {highPlanScale,highCutOpening,highInnerStairs} from './imasora-construction-high-interior.mjs?v=120gn';
import{hasBoardBay,boardBayStructure,boardBayLevels}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
const ok=(v,m)=>{if(!v)throw Error(m);};
export const HIGH_GRID=4;
export const DEFAULT_HIGH_SHAPE={cells:Array.from({length:16},(_,i)=>i),floors:3};
export const HIGH_STOREY_LIMIT=6;
export const DEFAULT_HIGH_STOREYS={storeys:Array.from({length:3},()=>Array.from({length:16},(_,i)=>i))};
function validCells(cells){
 ok(Array.isArray(cells)&&cells.length>=1&&cells.length<=16&&cells.every((n,i)=>Number.isInteger(n)&&n>=0&&n<16&&(!i||n>cells[i-1])),'マスをえらんで形をつくろう。');
 const seen=new Set([cells[0]]),queue=[cells[0]],all=new Set(cells);
 for(const n of queue)for(const d of[-4,4,-1,1]){const m=n+d;if(m<0||m>=16||Math.abs(d)===1&&Math.floor(n/4)!==Math.floor(m/4)||!all.has(m)||seen.has(m))continue;seen.add(m);queue.push(m);}
 ok(seen.size===all.size,'となり同士のマスをつないでね。離れた建物は「新しく建てる」でつくれるよ。');
}
export const highBlueprintFloors=b=>Array.isArray(b?.storeys)?b.storeys.length:b.floors;
export const highBlueprintCells=(b,level=1)=>Array.isArray(b?.storeys)?b.storeys[level-1]:b.cells;
export const HIGH_WALL_SIDES=['back','right','front','left'];
export function highWallBoundary(cells,cell,side){
 if(!cells.includes(cell)||!HIGH_WALL_SIDES.includes(side))return false;
 const col=cell%4,row=Math.floor(cell/4),other=side==='back'?row?cell-4:-1:side==='front'?row<3?cell+4:-1:side==='left'?col?cell-1:-1:col<3?cell+1:-1;
 return other<0||!cells.includes(other);
}
export const highBlueprintWalls=(b,level=1)=>b?.walls?.[level-1]??[];
// A change to floor shape cannot leave walls standing in an opening or across
// a newly joined floor. Preserve all other floors and explicitly chosen walls.
export function cleanHighWalls(b){if(!b.walls)return b;return{...b,walls:b.storeys.map((cells,i)=>(b.walls[i]??[]).filter(w=>highWallBoundary(cells,w.cell,w.side)))};}
export function validateHighShape(shape){
 if(shape&&['storeys','storeys|walls','interiorStairs|storeys','interiorStairs|storeys|walls','boardBay|interiorStairs|storeys','boardBay|interiorStairs|storeys|walls','boardBay|interiorStairs|storeys|upperBoardBay','boardBay|interiorStairs|storeys|upperBoardBay|walls'].includes(Object.keys(shape).filter(k=>k!=='stairPlacement').sort().join('|'))){
  ok(Array.isArray(shape.storeys)&&shape.storeys.length>=1&&shape.storeys.length<=HIGH_STOREY_LIMIT,'高さは1〜6階からえらぼう。');
  shape.storeys.forEach((cells,i)=>{validCells(cells);if(i)ok(cells.every(v=>shape.storeys[i-1].includes(v)),(i+1)+'階の下に床が必要だよ。下の階にも同じマスを置こう。');});
  if('walls'in shape){ok(Array.isArray(shape.walls)&&shape.walls.length===shape.storeys.length,'階ごとの壁をえらび直そう。');shape.walls.forEach((walls,i)=>{ok(Array.isArray(walls)&&walls.length<=64,'壁の数をたしかめよう。');let previous=-1;for(const w of walls){ok(w&&Object.keys(w).sort().join('|')==='cell|kind|side'&&Number.isInteger(w.cell)&&['solid','window'].includes(w.kind)&&highWallBoundary(shape.storeys[i],w.cell,w.side),'壁は床の外側に置こう。');const key=w.cell*4+HIGH_WALL_SIDES.indexOf(w.side);ok(key>previous,'同じ場所の壁はひとつだよ。');previous=key;}});}
  if('stairPlacement'in shape){ok(shape.interiorStairs===true,'階段つきの広い建物をえらぼう。');validateStairPlacement(shape.stairPlacement);}
  if('interiorStairs'in shape){ok(shape.interiorStairs===true&&shape.storeys.every(c=>c.length===16),'内階段は広い四角い床でつくろう。');ok(stairPlacement(shape)||(shape.walls??[]).every(a=>!a.some(w=>w.cell===12&&w.side==='front')),'内階段の入口をあけよう。1階から一番上まで、マス13の手前は壁を置かずに残してね。');}
  if(shape.boardBay&&stairPlacement(shape))ok(!stairConflictsBay(shape),'大きな板の通り道と階段が重なるよ。階段を別の場所へ置こう。');
  if('boardBay'in shape){ok(shape.boardBay===true&&shape.interiorStairs===true,'荷物の入口は内階段つきの建物でえらぼう。');ok(!(shape.walls?.[0]??[]).some(w=>[14,15].includes(w.cell)&&w.side==='front'),'大きな板の入口をあけてね。手前の右2マスは壁を置かずに残そう。');}
  if('upperBoardBay'in shape){ok(shape.upperBoardBay===true&&shape.boardBay===true&&shape.storeys.length>=2,'上の搬入口は、2段以上の内階段つき建物でえらぼう。');ok(!(shape.walls?.[1]??[]).some(w=>[14,15].includes(w.cell)&&w.side==='front'),'上の搬入口をあけてね。上の手前右2マスは壁を置かずに残そう。');}
  return shape;
 }

 ok(shape&&Object.keys(shape).sort().join('|')==='cells|floors'&&Number.isInteger(shape.floors)&&shape.floors>=1&&shape.floors<=3,'高さは1〜3階からえらぼう。');
 ok(Array.isArray(shape.cells)&&shape.cells.length>=1&&shape.cells.length<=16&&shape.cells.every((n,i)=>Number.isInteger(n)&&n>=0&&n<16&&(!i||n>shape.cells[i-1])),'マスをえらんで形をつくろう。');
 const seen=new Set([shape.cells[0]]),queue=[shape.cells[0]],all=new Set(shape.cells);
 for(const n of queue)for(const d of[-4,4,-1,1]){const m=n+d;if(m<0||m>=16||Math.abs(d)===1&&Math.floor(n/4)!==Math.floor(m/4)||!all.has(m)||seen.has(m))continue;seen.add(m);queue.push(m);}
 ok(seen.size===all.size,'となり同士のマスをつないでね。離れた建物は「新しく建てる」でつくれるよ。');return shape;
}
export const highFloors=s=>s?.version>=2?highBlueprintFloors(s.blueprint):3;
export const highShapeKey=s=>s?.version>=2?JSON.stringify(s.blueprint)+(s.boardBayRetrofit?'|retrofit:'+(s.boardBayRetrofit.version===1?s.boardBayRetrofit.phase:JSON.stringify(s.boardBayRetrofit)):''):'legacy';
export const highCell=i=>({x:(i%4)*16-24,z:Math.floor(i/4)*16-24});
export const highRecipe=(s,level=(s?.levels??0)+1)=>{if(!(s?.version>=2))return{timber:8,panels:4};const scale=highPlanScale(s),cells=highBlueprintCells(s.blueprint,level).length,walls=highBlueprintWalls(s.blueprint,level).length;return{timber:cells*2*scale*scale+walls*scale+(scale===2?8:0)+(s?.blueprint?.boardBay&&level===1?8:0)+(s?.blueprint?.upperBoardBay&&level===2?16:0),panels:cells*scale*scale+walls*scale+(scale===2?4:0)+(s?.blueprint?.boardBay&&level===1?4:0)+(s?.blueprint?.upperBoardBay&&level===2?8:0)};};
export function highRemainingStock(s,levels=0,kit=null){const stock={timber:0,panels:0};for(let f=levels+(kit?2:1);f<=highFloors(s);f++){const r=highRecipe(s,f);stock.timber+=r.timber;stock.panels+=r.panels;}return stock;}
export const highMaterialCost=shape=>{if(!shape)return 80640;validateHighShape(shape);let n=0;for(let f=1;f<=highBlueprintFloors(shape);f++)n+=(highBlueprintCells(shape,f).length*1680*(shape.interiorStairs?4:1)+highBlueprintWalls(shape,f).length*840*(shape.interiorStairs?2:1)+(shape.interiorStairs?6720:0)+(shape.boardBay&&f===1?6720:0)+(shape.upperBoardBay&&f===2?13440:0));return n;};
export function highRoofPoint(s){
 // A supported patch across the hole can be unreachable from this stairwell.
 // New layouts finish at their checked, turn-safe exit rather than crossing it.
 if(highPlanScale(s)===2){if(stairPlacement(s))return stairEntry(s,highFloors(s)*40);return{x:32,y:highFloors(s)*40,z:0,heading:0};}
 if(!(s?.version>=2))return{x:0,y:120,z:0,heading:0};
 const a=new Set(highBlueprintCells(s.blueprint,highFloors(s))),choices=[];
 for(let z=0;z<3;z++)for(let x=0;x<3;x++){const i=z*4+x;if([i,i+1,i+4,i+5].every(v=>a.has(v)))choices.push({x:x*16-16,z:z*16-16});}
 choices.sort((a,b)=>b.x-a.x||Math.abs(a.z)-Math.abs(b.z));return choices.length?{...choices[0],y:highFloors(s)*40,heading:0}:null;
}
const cache=new Map();
export function shapedHighParts(level,s){
 validateHighShape(s.blueprint);const key=highShapeKey(s)+'/'+level;if(cache.has(key))return cache.get(key);
 const posts=new Map(),beams=new Map(),floors=[],top=level*40;
 for(const i of highBlueprintCells(s.blueprint,level)){const {x,z}=highCell(i);floors.push({kind:'floor',x,y:top-1,z,w:16,h:2,d:16});
  for(const dx of[-8,8])for(const dz of[-8,8])posts.set((x+dx)+','+(z+dz),{kind:'column',x:x+dx,y:top-22,z:z+dz,w:3,h:36,d:3});
  for(const dz of[-8,8])beams.set('x'+x+','+(z+dz),{kind:'beam',x,y:top-3,z:z+dz,w:16,h:4,d:3});
  for(const dx of[-8,8])beams.set('z'+(x+dx)+','+z,{kind:'beam',x:x+dx,y:top-3,z,w:3,h:4,d:16});
 }
 const walls=highBlueprintWalls(s.blueprint,level).flatMap(w=>highWallParts(w,level));
 let pieces=[...posts.values(),...beams.values(),...walls,...floors];if(highPlanScale(s)===2){pieces=pieces.map(p=>({...p,x:p.x*2,z:p.z*2,w:p.w*2,d:p.d*2})).flatMap(p=>p.kind==='column'?stairEntranceColumn(s,p)?[]:highCutOpening(p,s).length===1&&highCutOpening(p,s)[0].w===p.w&&highCutOpening(p,s)[0].d===p.d?[p]:[]:p.kind==='wall'?[p]:highCutOpening(p,s));pieces.push(...highInnerStairs(level,s));}
 if(level===1&&s.blueprint.boardBay||level===2&&s.blueprint.upperBoardBay)pieces=boardBayStructure(pieces,level);
 const result=pieces.map(Object.freeze);Object.freeze(result);if(cache.size>=48)cache.clear();cache.set(key,result);return result;
}
export function highWallParts(w,level){
 const cell=highCell(w.cell),alongX=w.side==='back'||w.side==='front',x=cell.x+(w.side==='left'?-8:w.side==='right'?8:0),z=cell.z+(w.side==='back'?-8:w.side==='front'?8:0),base=(level-1)*40;
 const part=(offset,y,width,height)=>({kind:'wall',x:x+(alongX?offset:0),y:base+y,z:z+(alongX?0:offset),w:alongX?width:2,h:height,d:alongX?2:width});
 // The opening is actual empty space, not a texture painted over a solid wall.
 return w.kind==='solid'?[part(0,18,13,36)]:[part(0,6,13,12),part(0,31,13,10),part(-5,19,3,14),part(5,19,3,14)];
}
export function highFloorPieces(s,level){const pieces=s?.version>=2?highBlueprintCells(s.blueprint,level).map(i=>({...highCell(i),y:level*40,w:16,d:16})):[{x:0,y:level*40,z:0,w:64,d:64}];const scaled=highPlanScale(s)===2?pieces.map(p=>({...p,x:p.x*2,z:p.z*2,w:p.w*2,d:p.d*2})).flatMap(p=>highCutOpening(p,s)):pieces;return scaled;}
export function highRoofBridge(s){if(highPlanScale(s)===2)return{x:88,y:highFloors(s)*40,z:0,w:48,d:48};const p=highRoofPoint(s);if(!p)return null;const edge=p.x+(s?.version>=2?16:32);return{x:(56+edge)/2,y:p.y,z:p.z,w:56-edge,d:32};}
