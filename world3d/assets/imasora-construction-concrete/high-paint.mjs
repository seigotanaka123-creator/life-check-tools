import {upperShapeTiles,upperCastingHeight,upperTileHeight} from './high-casting-shape.mjs?v=120hb';
import {validPaintColor} from './paint-colors.mjs';
import {PAINT_REMOVE_COLOR,paintResultColor} from './free-paint-removal.mjs';
export const UPPER_PAINT_FACES=['top','north','south','west','east'];
const ok=(v,m)=>{if(!v)throw Error(m);};
export function upperPaintFaces(c,cell){
 const tiles=upperShapeTiles(c.shape),p=tiles.find(t=>t.cell===cell);if(!p)return[];
 return UPPER_PAINT_FACES.filter(face=>face==='top'||upperPaintRange(c,p,face).height>0);
}
export function upperPaintRange(c,p,face){const x=p.cell%4,z=Math.floor(p.cell/4),cell=face==='north'&&z>0?p.cell-4:face==='south'&&z<3?p.cell+4:face==='west'&&x>0?p.cell-1:face==='east'&&x<3?p.cell+1:-1,neighbor=upperShapeTiles(c.shape).find(t=>t.cell===cell),top=upperTileHeight(c,p),bottom=neighbor?upperTileHeight(c,neighbor):0;return{bottom,height:Math.max(0,top-bottom)};
}
export function validateUpperPaintAction(a){
 ok(UPPER_PAINT_FACES.includes(a.face)&&['roller','brush'].includes(a.tool),'ぬる面と道具をえらぼう。');
 for(const key of ['tiles','pixels']){const list=a[key];ok(Array.isArray(list)&&list.length>0&&list.length<=16&&new Set(list).size===list.length&&list.every(i=>Number.isInteger(i)&&i>=0&&i<16),'ぬるマスをえらび直そう。');a[key]=[...list].sort((x,y)=>x-y);}
 ok(validPaintColor(a.color)||a.color===PAINT_REMOVE_COLOR,'ペンキの色をえらび直そう。');
 ok(a.tool!=='roller'||a.pixels.length===16,'ローラーは面いっぱいにぬる道具だよ。');
 ok(a.color!==PAINT_REMOVE_COLOR||a.tool==='brush','色を落とすときは刷毛を使おう。');
 return a;
}
export function upperPaintPlan(c,a){
 validateUpperPaintAction(a);ok(c&&!c.stored&&c.stage==='complete'&&!c.pending,'型枠を外してから色をぬろう。');
 const tiles=upperShapeTiles(c.shape),changes=[];let cost=0;
 for(const cell of a.tiles){const p=tiles.find(t=>t.cell===cell);ok(p&&upperPaintFaces(c,cell).includes(a.face),'その面は隣のコンクリートにつながっているよ。見える面をえらぼう。');
  const key=cell+':'+a.face,values=c.paint?.faces[key]??[],color=paintResultColor(a.color),area=a.face==='top'?p.w*p.d:(a.face==='north'||a.face==='south'?p.w:p.d)*upperPaintRange(c,p,a.face).height;
  for(const pixel of a.pixels)if((values[pixel]??null)!==color){changes.push({cell,face:a.face,pixel,color});if(color!==null)cost+=area/1024;}
 }
 return{changes,cost};
}
export function applyUpperPaint(c,a){const plan=upperPaintPlan(c,a);if(!plan.changes.length)return plan;c.paint??={version:1,faces:{}};for(const p of plan.changes){const key=p.cell+':'+p.face;c.paint.faces[key]??=Array(16).fill(null);c.paint.faces[key][p.pixel]=p.color;if(c.paint.faces[key].every(v=>v===null))delete c.paint.faces[key];}return plan;}
// Physical surface coordinates, shared by the preview, finished paint and tool.
export function upperPaintPatch(c,cell,face,pixel){
 const tile=upperShapeTiles(c.shape).find(p=>p.cell===cell);ok(tile&&upperPaintFaces(c,cell).includes(face),'ぬる面が見つからないよ。');
 const h=upperTileHeight(c,tile),range=upperPaintRange(c,tile,face),col=pixel%4,row=Math.floor(pixel/4),u=(col+.5)/4-.5,v=(row+.5)/4-.5;
 let center,normal,right,up,width,height;
 if(face==='top'){center={x:tile.x+u*tile.w,y:h+.035,z:tile.z+v*tile.d};normal={x:0,y:1,z:0};right={x:1,y:0,z:0};up={x:0,y:0,z:1};width=tile.w/4;height=tile.d/4;}
 else{const north=face==='north',south=face==='south',horizontal=north||south;normal={x:face==='east'?1:face==='west'?-1:0,y:0,z:south?1:north?-1:0};right=horizontal?{x:north?-1:1,y:0,z:0}:{x:0,y:0,z:face==='east'?-1:1};up={x:0,y:1,z:0};width=(horizontal?tile.w:tile.d)/4;height=range.height/4;center={x:tile.x+normal.x*(tile.w/2+.035)+right.x*u*(horizontal?tile.w:tile.d),y:range.bottom+(row+.5)*range.height/4+.015,z:tile.z+normal.z*(tile.d/2+.035)+right.z*u*(horizontal?tile.w:tile.d)};}
 return{center,normal,right,up,width,height};
}
