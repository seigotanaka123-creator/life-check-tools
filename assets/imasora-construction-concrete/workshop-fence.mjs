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
export function concreteWorldColliderBlocks(c,x,z,margin,y,pointInside){
 // Free-build tests its own solid objects separately; reserved areas are not
 // physical boxes. The other workshop's visible fence must remain an obstacle.
 if(String(c.id??c.buildingId??'').startsWith('concrete-')||c.buildingId==='construction-concrete')return false;
 if(c.buildingId===WORKSHOP_FENCE_ID&&Number.isFinite(y)&&(y+margin<c.minY||y-margin>c.maxY))return false;
 return pointInside(x,z,c,margin);
}
