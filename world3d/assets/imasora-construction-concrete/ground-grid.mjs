// Measured ground cells keep the original 128-volume quarter cup.
// Eight-unit edges make every allowed 2/4/8-height target an integer dose.
const fail=()=>{throw Error('大きさと位置をえらび直そう。8ずつ、つくる場所におさまるように動かせるよ。');};
export function groundLayout(mask,layout){
 if(!layout||Object.getPrototypeOf(layout)!==Object.prototype||Object.keys(layout).sort().join('|')!=='columns|rows|version|x|z'||layout.version!==1||!Number.isInteger(mask)||mask<1||mask>65535)fail();
 const cells=Array.from({length:16},(_,i)=>i).filter(i=>mask&(1<<i)),xs=cells.map(i=>i%4),zs=cells.map(i=>Math.floor(i/4));
 for(const [list,indices]of [[layout.columns,xs],[layout.rows,zs]]){if(!Array.isArray(list)||list.length!==4||Object.keys(list).join('|')!=='0|1|2|3')fail();const lo=Math.min(...indices),hi=Math.max(...indices);if(list.some((n,i)=>i<lo||i>hi?n!==0:![8,16].includes(n)))fail();}
 for(const [offset,list]of [[layout.x,layout.columns],[layout.z,layout.rows]])if(!Number.isInteger(offset)||offset%4||Math.abs(offset)+list.reduce((n,v)=>n+v,0)/2>32)fail();
 return{version:1,columns:[...layout.columns],rows:[...layout.rows],x:layout.x,z:layout.z};
}
export function groundTile(i,w){
 const l=w?.layout;if(!l)return{x:(i%4-1.5)*16,z:(Math.floor(i/4)-1.5)*16,w:16,d:16};
 const col=i%4,row=Math.floor(i/4),width=l.columns.reduce((a,b)=>a+b,0),depth=l.rows.reduce((a,b)=>a+b,0);
 return{x:l.x-width/2+l.columns.slice(0,col).reduce((a,b)=>a+b,0)+l.columns[col]/2,z:l.z-depth/2+l.rows.slice(0,row).reduce((a,b)=>a+b,0)+l.rows[row]/2,w:l.columns[col],d:l.rows[row]};
}
export const groundHeight=(w,i,q=w?.fill?.[i]??0)=>{const t=groundTile(i,w);return q?(q*128/(t.w*t.d)):0;};
export const groundLimit=(w,i,height=w.height)=>{const t=groundTile(i,w);return t.w*t.d*height/128;};
export function groundLevels(f){return Array.from({length:16},(_,i)=>f.mask&(1<<i)?f.pourTargets?groundHeight(f,i,f.pourTargets[i]):f.height:0);}
export const groundCups=d=>Array.from({length:16},(_,i)=>d.mask&(1<<i)?groundLimit(d,i,d.levels?.[i]??d.height)/4:0).reduce((a,b)=>a+b,0);
export function assignGroundLayout(f,levels,layout){const mask=levels.reduce((m,h,i)=>h?m|(1<<i):m,0);f.layout=groundLayout(mask,layout);f.mask=mask;f.height=Math.max(...levels);f.pourTargets=levels.map((h,i)=>h?groundLimit(f,i,h):0);return f;}
export function sizedGroundLayout(plan,width,depth,x=null,z=null){
 const cells=Array.from({length:16},(_,i)=>i).filter(i=>plan.mask&(1<<i));if(!cells.length)fail();
 const span=axis=>{const a=cells.map(i=>axis==='x'?i%4:Math.floor(i/4));return[Math.min(...a),Math.max(...a)];},[a,b]=span('x'),[c,d]=span('z');
 const split=(n,lo,hi)=>{const count=hi-lo+1;if(!Number.isInteger(n)||n%8||n<count*8||n>count*16)fail();return Array.from({length:4},(_,i)=>i<lo||i>hi?0:8+(i-lo<(n-count*8)/8?8:0));};
 return groundLayout(plan.mask,{version:1,columns:split(width,a,b),rows:split(depth,c,d),x:x??plan.layout?.x??(a+b-3)*8,z:z??plan.layout?.z??(c+d-3)*8});
}
export function groundCovered(w,mask,s){
 if(!s)return false;const cover=Array.from({length:16},(_,i)=>i).filter(i=>s.mask&(1<<i)).map(i=>{const t=groundTile(i,s);return{x:s.x+t.x,z:s.z+t.z,w:t.w,d:t.d};});
 for(let i=0;i<16;i++)if(mask&(1<<i)){const t=groundTile(i,w),x=w.x+t.x,z=w.z+t.z;let area=0;for(const r of cover)area+=Math.max(0,Math.min(x+t.w/2,r.x+r.w/2)-Math.max(x-t.w/2,r.x-r.w/2))*Math.max(0,Math.min(z+t.d/2,r.z+r.d/2)-Math.max(z-t.d/2,r.z-r.d/2));if(Math.abs(area-t.w*t.d)>1e-7)return false;}return true;
}
export const frameLength=p=>Math.max(p.width,p.depth);
export const frameGrip=p=>Math.min(4,frameLength(p)/2-.5);
export const frameFastener=p=>Math.min(6,frameLength(p)/2-1);

export function trimGroundLayout(w,mask){const cells=Array.from({length:16},(_,i)=>i).filter(i=>mask&(1<<i)),xs=cells.map(i=>i%4),zs=cells.map(i=>Math.floor(i/4)),a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...zs),d=Math.max(...zs),lo=groundTile(c*4+a,w),hi=groundTile(d*4+b,w);return groundLayout(mask,{version:1,columns:w.layout.columns.map((n,i)=>i<a||i>b?0:n),rows:w.layout.rows.map((n,i)=>i<c||i>d?0:n),x:(lo.x-lo.w/2+hi.x+hi.w/2)/2,z:(lo.z-lo.d/2+hi.z+hi.d/2)/2});}

// Equal square queries tile the entire rectangle, including narrow-cell interiors.
export function groundQueries(c){const w=c.w??16,d=c.d??16,r=Math.min(w,d)/4,out=[];for(let x=-w/2+r;x<w/2;x+=r*2)for(let z=-d/2+r;z<d/2;z+=r*2)out.push({x,z,r});return out;}
