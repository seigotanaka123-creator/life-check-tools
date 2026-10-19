import {shapedHighParts} from './imasora-construction-high-shape.mjs';
const point=(x,y,z)=>({x,y,z});
function hit(a,b,box,r=1.11){let lo=0,hi=1;for(const [k,dim]of[['x','w'],['y','h'],['z','d']]){const start=a[k]-box[k],d=b[k]-a[k],half=box[dim]/2+r;if(Math.abs(d)<1e-9){if(Math.abs(start)>=half)return false;continue;}const l=(-half-start)/d,h=(half-start)/d;lo=Math.max(lo,Math.min(l,h));hi=Math.min(hi,Math.max(l,h));if(hi<lo)return false;}return true;}
// The delivery arm stays below the ceiling and above the full-size worker.
// A fixed post on the reusable deck supports it; columns are routed around.
function workPipe(s,q,tile={x:0,z:0},height=8){
 const y=q.floor*40,sg=q.floor%2?-1:1,target=point(q.x+tile.x,y+32,q.z+tile.z),solids=Array.from({length:s.levels},(_,i)=>shapedHighParts(i+1,s)).flat(),nodes=[];
 for(let z=-56;z<=56;z+=4)for(let x=8;x<=56;x+=4)nodes.push(point(x,y+32,z));
 const start=point(48,y+32,16),key=p=>p.x+','+p.z,by=new Map(nodes.map(p=>[key(p),p])),prev=new Map([[key(start),null]]),queue=[start];let found=null;
 for(const a of queue){if(Math.hypot(a.x-target.x,a.z-target.z)<=6&&!solids.some(b=>hit(a,target,b))){found=key(a);break;}for(const [dx,dz]of[[4,0],[-4,0],[0,4],[0,-4]]){const b=by.get((a.x+dx)+','+(a.z+dz));if(!b||prev.has(key(b))||solids.some(v=>hit(a,b,v)))continue;prev.set(key(b),key(a));queue.push(b);}}
 if(!found)throw Error('柱から少し離れた場所をえらぼう。ホースを通せないよ。');
 const route=[];for(let k=found;k!==null;k=prev.get(k))route.unshift(by.get(k));route.push(target,point(target.x,y+height+4,target.z));
 const prefix=[[300,1.3,sg*188],[300,y+9,sg*188],[300,y+9,sg*160],[252,y+9,sg*160],[252,y+1.3,sg*160],[112,y+1.3,sg*160],[112,y+1.3,16],[68,y+1.3,16],[68,y+32,16]].map(v=>point(...v));
 return [...prefix,...route].filter((p,i,all)=>!i||Math.hypot(p.x-all[i-1].x,p.y-all[i-1].y,p.z-all[i-1].z)>1e-6);
}
export function highWorkPipeBrackets(s,q){const y=q.floor*40,sg=q.floor%2?-1:1,parts=[];for(let h=8;h<=y+5;h+=20)parts.push({a:point(284,h,sg*188),b:point(300,h,sg*188),radius:.75});parts.push({a:point(68,y,16),b:point(68,y+32,16),radius:1.5},{a:point(68,y+23,16),b:point(48,y+32,16),radius:.75});if(q.floor<s.levels)parts.push({a:point(48,y+32,16),b:point(48,y+38,16),radius:.5});return parts;}

const pipes=new Map();export function highWorkPipe(s,q,tile={x:0,z:0},height=8){const key=JSON.stringify([s.version,s.levels,s.blueprint,q,tile,height]);if(pipes.has(key))return pipes.get(key);const p=workPipe(s,q,tile,height);p.forEach(Object.freeze);Object.freeze(p);if(pipes.size>=128)pipes.clear();pipes.set(key,p);return p;}
