import {COAST_ISLANDS,islandRelief} from './imasora-coast-sea-regions.mjs?v=120mu';

// Rendering and foot contact must use the same Float32 vertices and diagonal.
// Keep the analytic relief for waves/buoyancy; this is the visible walking face.
export const COAST_ISLAND_DETAIL_SEGMENTS=112;
export function islandTerrainAxes(i,segments=COAST_ISLAND_DETAIL_SEGMENTS){
 const axis=(span,focus)=>{const xs=Array.from({length:segments+1},(_,n)=>-span/2+n*span/segments);if(segments>30)for(let d=-260;d<=260;d+=8)xs.push(focus+d);return [...new Set(xs)].filter(x=>Math.abs(x)<=span/2).sort((a,b)=>a-b);};
 const xs=axis(i.rx*3,0),zs=axis(i.rz*3.4,i.landingZ-i.z);
 if(i.id==='tide-island'&&segments>30){for(let d=280;d<=1440;d+=40)xs.push(d);for(let d=-440;d<=440;d+=40)zs.push(i.landingZ-i.z+d);for(const a of[xs,zs]){a.sort((a,b)=>a-b);for(let n=a.length-1;n>0;n--)if(a[n]===a[n-1])a.splice(n,1);}}
 if(i.hidden&&segments>30){xs.push(-180,-95,-68,-52,52,68,95,180);zs.push(...[-900,-700,-300,-180,-120,0,160,170,190,540,560,680,900].map(v=>i.landingZ-i.z+v));xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);for(const a of[xs,zs])for(let n=a.length-1;n>0;n--)if(a[n]===a[n-1])a.splice(n,1);}
 return {xs,zs};
}
const grids=new Map();
function grid(i){let g=grids.get(i);if(!g){const {xs,zs}=islandTerrainAxes(i);g={xs:Float32Array.from(xs),zs:Float32Array.from(zs),ys:new Float32Array(xs.length*zs.length).fill(NaN)};grids.set(i,g);}return g;}
function cell(axis,p){let lo=0,hi=axis.length-1;if(p<axis[lo]||p>axis[hi])return -1;while(hi-lo>1){const mid=(hi+lo)>>1;if(p<axis[mid])hi=mid;else lo=mid;}return Math.min(lo,axis.length-2);}
function sample(g,i,col,row){const k=row*g.xs.length+col;let y=g.ys[k];if(Number.isNaN(y))g.ys[k]=y=Math.fround(islandRelief(i,g.xs[col]+i.x,g.zs[row]+i.z));return y;}
export function islandTriangleHeight(i,x,z){
 if(Math.abs(x-i.x)>i.rx*1.5||Math.abs(z-i.z)>i.rz*1.7)return -Infinity;
 const g=grid(i),lx=x-i.x,lz=z-i.z,c=cell(g.xs,lx),r=cell(g.zs,lz);if(c<0||r<0)return -Infinity;
 const u=(lx-g.xs[c])/(g.xs[c+1]-g.xs[c]),v=(lz-g.zs[r])/(g.zs[r+1]-g.zs[r]);
 return u+v<=1?sample(g,i,c,r)*(1-u-v)+sample(g,i,c+1,r)*u+sample(g,i,c,r+1)*v:sample(g,i,c+1,r+1)*(u+v-1)+sample(g,i,c,r+1)*(1-u)+sample(g,i,c+1,r)*(1-v);
}
export function coastIslandGroundHeight(x,z){let y=-Infinity;for(const i of COAST_ISLANDS)y=Math.max(y,islandTriangleHeight(i,x,z));return y;}
export function coastOnIsland(x,z,margin=0){return COAST_ISLANDS.some(i=>Math.abs(x-i.x)<=i.rx*1.5+margin&&Math.abs(z-i.z)<=i.rz*1.7+margin);}
