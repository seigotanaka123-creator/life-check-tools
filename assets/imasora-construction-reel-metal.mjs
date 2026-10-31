import{stairParts}from'./imasora-construction-reel-stairs.mjs?v=120pi';
import{railParts}from'./imasora-construction-reel-rails.mjs?v=120pi';
// Reserve actual metal volume. Adjacent matching rails share their corner post.
export function metalFrameRebar(rooms=[]){let total=0;for(const r of rooms){const posts=new Set();for(const i of r.structure?.items??[]){if(i.material!=='steel'||!['column','stair','rail'].includes(i.kind))continue;const parts=i.kind==='column'?[{w:8,h:i.height,d:8}]:i.kind==='stair'?stairParts(r,i):railParts(r,i);let volume=0;for(const p of parts){if(p.kind==='rail-post'){const key=[p.x,p.y,p.z,p.h].join('/');if(posts.has(key))continue;posts.add(key);}volume+=p.w*p.h*p.d;}total+=Math.ceil(volume/768-1e-8);}}return total;}
