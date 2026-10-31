// Small static load network, evaluated on edits, never on animation frames.
// Units are game balance units, not a real building safety calculation.
const EPS=.02;
const distance=(p,b)=>Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.w/2),Math.max(0,Math.abs(p.z-b.z)-b.d/2));
export function distributeLoad(point,bearings){
 if(!bearings.length)return[];
 const touching=bearings.filter(b=>distance(point,b)<EPS),chosen=touching.length?touching:bearings;
 const weights=chosen.map(b=>Math.max(1,b.area??b.w*b.d)/(16+distance(point,b)**2)),sum=weights.reduce((a,b)=>a+b,0);
 return chosen.map((bearing,i)=>({bearing,weight:weights[i]/sum}));
}
export function panelLoads(panels,mass){
 const volume=panels.reduce((n,p)=>n+p.w*p.d*p.h,0);if(!volume||!mass)return[];
 return panels.flatMap(p=>{const nx=Math.max(1,Math.ceil(p.w/32)),nz=Math.max(1,Math.ceil(p.d/32)),load=mass*p.w*p.d*p.h/volume/(nx*nz);return Array.from({length:nx*nz},(_,n)=>({x:p.x-p.w/2+p.w*((n%nx)+.5)/nx,z:p.z-p.d/2+p.d*(Math.floor(n/nx)+.5)/nz,load}));});
}
export function evaluateLoadPaths(nodes,loads=[]){
 const byId=new Map(nodes.map(n=>[n.id,{...n,incoming:[],direct:[],reactions:new Map(),load:0,total:0,fromAbove:0}]));
 for(const p of loads){const n=byId.get(p.deckId);if(n)n.direct.push(p);}
 const issues=[];
 for(const n of [...byId.values()].sort((a,b)=>b.top-a.top)){
  n.fromAbove=n.incoming.reduce((sum,p)=>sum+p.load,0);
  // Aligned posts carry reactions through the joint, instead of pretending
  // that every upper post bends the entire lower wooden floor.
  const bending=n.incoming.filter(p=>!n.bearings.some(b=>distance(p,b)<EPS));
  n.load=n.direct.reduce((s,p)=>s+p.load,0)+bending.reduce((s,p)=>s+p.load,0);
  const points=[...n.direct,...n.incoming,...n.dead];n.total=points.reduce((s,p)=>s+p.load,0);
  if(!n.grounded&&!n.bearings.length&&n.total>.001)issues.push({id:n.id,kind:'support',load:n.total,capacity:0,excess:n.total});
  if(n.load>n.capacity+.001)issues.push({id:n.id,kind:'floor',load:n.load,capacity:n.capacity,excess:n.load-n.capacity});
  if(n.total>(n.girderCapacity??Infinity)+.001)issues.push({id:n.id,kind:'beam',load:n.total,capacity:n.girderCapacity,excess:n.total-n.girderCapacity});
  if(n.grounded)continue;
  for(const p of points)for(const {bearing:b,weight}of distributeLoad(p,n.bearings)){
   const load=p.load*weight,previous=n.reactions.get(b.key);n.reactions.set(b.key,{...b,load:(previous?.load??0)+load});
   const parent=byId.get(b.to);if(parent&&parent.top<n.top-EPS)parent.incoming.push({x:Math.max(b.x-b.w/2,Math.min(b.x+b.w/2,p.x)),z:Math.max(b.z-b.d/2,Math.min(b.z+b.d/2,p.z)),load,from:n.id});
  }
  // A shared post receives reactions from every connected floor/beam.
 }
 const reactions=new Map();for(const n of byId.values())for(const b of n.reactions.values()){const key=b.to+'/'+b.key,old=reactions.get(key);reactions.set(key,{...b,load:(old?.load??0)+b.load,deckIds:[...(old?.deckIds??[]),n.id]});}
 for(const b of reactions.values())if(b.load>b.capacity+.001)issues.push({id:b.to+'/'+b.key,kind:'support',load:b.load,capacity:b.capacity,excess:b.load-b.capacity,deckIds:b.deckIds});
 return{decks:byId,reactions,issues};
}
