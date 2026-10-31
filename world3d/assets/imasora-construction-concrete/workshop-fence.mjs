// Shared by the visible hand-workshop rails and the surrounding world. Keep
// this ID separate from free-build's own vehicles, floors and reserved areas.
export const WORKSHOP_FENCE_ID='construction-workshop-fence';
export const WORKSHOP_FENCE_PARTS=Object.freeze([
 ...[-106,106].map((z,i)=>({id:'rail-z-'+i,x:0,y:7,z,width:212,height:2,depth:2})),
 ...[-106,106].map((x,i)=>({id:'rail-x-'+i,x,y:7,z:0,width:2,height:2,depth:212})),
 ...[-106,0,106].flatMap((x,i)=>[-106,106].map((z,j)=>({id:'post-'+i+'-'+j,x,y:7,z,width:2,height:14,depth:2}))),
].map(Object.freeze));
export function workshopFenceGeometry(origin){
 if(!origin||![origin.x,origin.z].every(Number.isFinite))throw Error('工房の柵の位置を確認できません。');
 return WORKSHOP_FENCE_PARTS.map(p=>({id:WORKSHOP_FENCE_ID+'-'+p.id,buildingId:WORKSHOP_FENCE_ID,x:origin.x+p.x,z:origin.z+p.z,rotation:0,localHalfX:p.width/2,localHalfZ:p.depth/2,minY:p.y-p.height/2,maxY:p.y+p.height/2,obstacleHeight:p.y+p.height/2}));
}
export function installWorkshopFence(origin,collider){for(const p of workshopFenceGeometry(origin))collider(p.x,p.z,[p.localHalfX*2,p.localHalfZ*2],p.rotation,p.id,0,p);}
// A chassis uses a vertical interval. Low columns and its supporting deck are
// not walls on the current storey; an overhead slab still blocks the roof.
export function concreteVehicleColliderBlocks(c,x,z,margin,y,height,pointInside){
 if(String(c.id??c.buildingId??'').startsWith('concrete-')||c.buildingId==='construction-concrete')return false;
 const top=c.maxY??c.obstacleHeight??Infinity,bottom=c.minY??-Infinity;
 if(top<=y+.2||bottom>=y+height+.2)return false;
 if(/ramp-tread|ramp-.*-deck-/.test(String(c.id??''))&&top<=y+8)return false;
 if((c.supportSurface||/reel-.*floor/.test(String(c.id??'')))&&top<=y+2.1)return false;
 return pointInside(x,z,c,margin);
}
// Bound the search to nearby physical boxes; wide authored shapes stay in a
// separate list so a map-sized object cannot expand the fine grid unboundedly.
export function createConcreteVehicleProbe(boxes,pointInside){
 const size=64,cells=new Map(),wide=[];
 for(const b of boxes){const hx=b.localHalfX??b.halfX,hz=b.localHalfZ??b.halfZ,c=Math.abs(Math.cos(b.rotation??0)),s=Math.abs(Math.sin(b.rotation??0)),ex=hx*c+hz*s,ez=hx*s+hz*c;if(![b.x,b.z,ex,ez].every(Number.isFinite)){wide.push(b);continue;}const x0=Math.floor((b.x-ex)/size),x1=Math.floor((b.x+ex)/size),z0=Math.floor((b.z-ez)/size),z1=Math.floor((b.z+ez)/size);if((x1-x0+1)*(z1-z0+1)>128){wide.push(b);continue;}for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const key=x+','+z,list=cells.get(key)??[];list.push(b);cells.set(key,list);}}
 const probe=(x,z,r,y,h)=>{const x0=Math.floor((x-r)/size),x1=Math.floor((x+r)/size),z0=Math.floor((z-r)/size),z1=Math.floor((z+r)/size);if((x1-x0+1)*(z1-z0+1)>256)return boxes.some(b=>concreteVehicleColliderBlocks(b,x,z,r,y,h,pointInside));const near=new Set(wide);for(let ix=x0;ix<=x1;ix++)for(let iz=z0;iz<=z1;iz++)for(const b of cells.get(ix+','+iz)??[])near.add(b);for(const b of near)if(concreteVehicleColliderBlocks(b,x,z,r,y,h,pointInside))return true;return false;};
 probe.cells=cells.size;probe.wide=wide.length;return probe;
}
export function concreteWorldColliderBlocks(c,x,z,margin,y,pointInside){
 // Free-build tests its own solid objects separately; reserved areas are not
 // physical boxes. The other workshop's visible fence must remain an obstacle.
 if(String(c.id??c.buildingId??'').startsWith('concrete-')||c.buildingId==='construction-concrete')return false;
 if(c.buildingId===WORKSHOP_FENCE_ID&&Number.isFinite(y)&&(y+margin<c.minY||y-margin>c.maxY))return false;
 if(Number.isFinite(y)&&((c.maxY??c.obstacleHeight??Infinity)<=y+.15||(c.minY??-Infinity)>=y+30))return false;
 return pointInside(x,z,c,margin);
}
