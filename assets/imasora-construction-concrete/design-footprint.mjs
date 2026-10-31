import {groundCovered,groundTile} from './ground-grid.mjs?v=120hb';
import {designLevels,levelDesign,designGeometry} from './design-levels.mjs?v=120hb';
// Ground designs retain their real 16-unit cells and existing volume units.
// Resize the drawing itself; never stretch a saved mesh or invent material.
export function designFootprint(plan){
 const levels=designLevels(plan),cells=levels.flatMap((h,i)=>h?[{x:i%4,z:Math.floor(i/4)}]:[]),left=Math.min(...cells.map(c=>c.x)),right=Math.max(...cells.map(c=>c.x)),top=Math.min(...cells.map(c=>c.z)),bottom=Math.max(...cells.map(c=>c.z));
 return{left,right,top,bottom,columns:right-left+1,rows:bottom-top+1,width:plan.layout?plan.layout.columns.reduce((a,b)=>a+b,0):(right-left+1)*16,depth:plan.layout?plan.layout.rows.reduce((a,b)=>a+b,0):(bottom-top+1)*16,cells:cells.length};
}
export function resizeDesign(plan,columns,rows){
 if(!Number.isInteger(columns)||columns<1||columns>4||!Number.isInteger(rows)||rows<1||rows>4)throw Error('幅と奥行きは1〜4マスからえらぼう。');
 const old=designLevels(plan),b=designFootprint(plan),left=Math.min(b.left,4-columns),top=Math.min(b.top,4-rows),levels=Array(16).fill(0);
 for(let z=0;z<rows;z++)for(let x=0;x<columns;x++){const ox=b.left+Math.min(b.columns-1,Math.floor((x+.5)*b.columns/columns)),oz=b.top+Math.min(b.rows-1,Math.floor((z+.5)*b.rows/rows));levels[(top+z)*4+left+x]=old[oz*4+ox];}
 if(!levels.some(Boolean))throw Error('この大きさでは形がなくなるよ。板をタッチして形をえらび直そう。');
 return designGeometry(levelDesign(levels));
}
export function shiftDesign(plan,dx,dz){
 if(!Number.isInteger(dx)||!Number.isInteger(dz)||Math.abs(dx)+Math.abs(dz)!==1)throw Error('1マスずつ動かそう。');
 const old=designLevels(plan),levels=Array(16).fill(0);
 for(let i=0;i<16;i++)if(old[i]){const x=i%4+dx,z=Math.floor(i/4)+dz;if(x<0||x>3||z<0||z>3)throw Error('これ以上は外へ動かせないよ。');levels[z*4+x]=old[i];}
 return designGeometry(levelDesign(levels));
}
export function foundationDesignProblem(f,s,plan,{occupied=true}={}){
 if(!s)return '';
 if(!plan?.mask||!groundCovered({...f.location,...plan},plan.mask,s))return '土台の上に全部のマスがおさまる形・位置をえらぼう。';
 const collision=occupied&&(f?.completed??[]).some(w=>{const mask=w.placedMask??w.fill.reduce((m,q,i)=>q?m|(1<<i):m,0);for(let i=0;i<16;i++)if(plan.mask&(1<<i)){const a=groundTile(i,plan);for(let j=0;j<16;j++)if(mask&(1<<j)){const b=groundTile(j,w);if(Math.abs(f.location.x+a.x-w.x-b.x)<(a.w+b.w)/2-1e-7&&Math.abs(f.location.z+a.z-w.z-b.z)<(a.d+b.d)/2-1e-7)return true;}}return false;});
 return collision?'ここには完成した作品があるよ。形をずらすか、作品を保管してね。':'';
}
