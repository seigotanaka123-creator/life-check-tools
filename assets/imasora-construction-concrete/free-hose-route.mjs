// Bounded, deterministic fallback. Edges, including shortcuts, must clear the
// whole hose; a free destination alone never permits crossing a thin wall.
export const HOSE_ROUTE_LIMITS=Object.freeze({step:8,visited:384,checks:6000});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const directions=[];for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)if(x||y||z)directions.push({x,y,z});
class Heap{
 items=[];
 push(value){const a=this.items;let i=a.length;a.push(value);while(i){const j=(i-1)>>1;if(a[j].score<=value.score)break;a[i]=a[j];i=j;}a[i]=value;}
 pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].score<a[j].score)j++;if(a[j].score>=last.score)break;a[i]=a[j];i=j;}a[i]=last;}return first;}
}
export function findSupplyHoseRoute(start,end,segmentClear,{maxLength=240,step=HOSE_ROUTE_LIMITS.step,maxVisited=HOSE_ROUTE_LIMITS.visited,maxChecks=HOSE_ROUTE_LIMITS.checks}={}){
 if(![start,end].every(p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k])))||!(step>0)||!Number.isFinite(maxLength)||maxLength<=0||distance(start,end)>maxLength)throw Error('配管が長すぎます。両車の後部を近づけてください。');
 let checks=0,visited=0;const edges=new Map(),heap=new Heap(),nodes=new Map();
 const clear=(a,b)=>{const keys=[`${a.x},${a.y},${a.z}`,`${b.x},${b.y},${b.z}`].sort(),key=keys.join('|');if(!edges.has(key)){if(++checks>maxChecks)throw Error('配管の通路を調べる範囲を超えました。両車を近づけて通路を空けてください。');edges.set(key,segmentClear(a,b));}return edges.get(key);};
 const seed={x:start.x,y:start.y,z:start.z,ix:0,iy:0,iz:0,key:'0,0,0',g:0,prev:null};nodes.set(seed.key,seed);heap.push({node:seed,g:0,score:distance(start,end)});
 while(heap.items.length){const entry=heap.pop(),n=entry.node;if(n.done||entry.g!==n.g)continue;if(++visited>maxVisited)throw Error('配管の通路を調べる範囲を超えました。両車を近づけて通路を空けてください。');n.done=true;
  if(n.g+distance(n,end)<=maxLength&&clear(n,end)){
   const raw=[{...end}];for(let p=n;p;p=p.prev)raw.unshift({x:p.x,y:p.y,z:p.z});
   // Only remove bends if the replacement also clears the complete segment.
   const path=[raw[0]];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!clear(raw[i],raw[j]))j--;path.push(raw[j]);i=j;}
   return{path,visited,checks};
  }
  for(const d of directions){const ix=n.ix+d.x,iy=n.iy+d.y,iz=n.iz+d.z,key=`${ix},${iy},${iz}`;let next=nodes.get(key);if(next?.done)continue;
   const p=next??{ix,iy,iz,key,x:start.x+ix*step,y:start.y+iy*step,z:start.z+iz*step},g=n.g+distance(n,p),h=distance(p,end);
   if(p.y<1.3||g+h>maxLength||g>=(next?.g??Infinity)||!clear(n,p))continue;
   if(!next){next=p;nodes.set(key,next);}next.g=g;next.prev=n;heap.push({node:next,g,score:g+h+Math.abs(p.y-start.y)*.12});
  }
 }
 throw Error('車体や障害物を避ける配管経路がありません。両車の後部に通路を空けてください。');
}
