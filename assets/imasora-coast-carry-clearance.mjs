import {ISLAND_PORT_DECKS} from './imasora-coast-island-harbors.mjs?v=120lr';

// Only the exact authored landing named by the validated ramp is a floor.
// Its sloped walking surface may reach the body's toes before its root is
// within ordinary step height. This check grants no floor or walking height;
// those still come from the actual ramp. Shifted slabs and posts stay solid.
function rampFloor(item,ids){
 if(!ids.includes(item.id))return false;
 const floor=ISLAND_PORT_DECKS.find(p=>p.id===item.id),angle=item.localRotation??item.rotation??0;
 if(!floor||!Number.isFinite(angle)||Math.abs(angle)>1e-8)return false;
 return ['x','z','halfX','halfZ','minY','maxY'].every(k=>{const value=k==='halfX'?item.localHalfX??item.halfX:k==='halfZ'?item.localHalfZ??item.halfZ:item[k];return Number.isFinite(value)&&Math.abs(value-floor[k])<1e-6;});
}

// Conservative broad phase for repeated boarding/recovery foot probes. Read
// current dimensions every time: moving/resized scenery must not leave a
// stale index. The world's exact body contact remains the final decision.
export function coastPolygonIsFar(polygon,fromX,fromZ,toX,toZ,bodyRadius,skin=.24){
 if(!(polygon?.length>=3)||!(bodyRadius>=0)||!(skin>=0)
  ||!Number.isFinite(bodyRadius+skin+fromX+fromZ+toX+toZ))return false;
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
 // Authored boxes often carry a world-space polygon too. Read its live
 // vertices, not potentially stale box metadata or a cached bounding box.
 for(const p of polygon){
  if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return false;
  minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
  minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
 }
 const reach=bodyRadius+2*skin+1e-7;
 return Math.min(fromX,toX)>maxX+reach||Math.max(fromX,toX)<minX-reach
  ||Math.min(fromZ,toZ)>maxZ+reach||Math.max(fromZ,toZ)<minZ-reach;
}
export function coastCarryClearAt(items,body,x,y,z,heading,contact,skin=.24,stepFloors=[]){
 const values=body&&[body.offsetX,body.offsetZ,body.halfX,body.halfZ];
 const radius=values?.every(Number.isFinite)&&body.halfX>=0&&body.halfZ>=0?values.reduce((sum,v)=>sum+Math.abs(v),0):Infinity;
 for(const item of items){
  // The named, unchanged shore slab continues a validated ramp surface.
  // Ordinary steps keep their normal height limit. A raised ramp landing
  // still checks its real top and full route; posts/walls stay obstacles.
  if(stepFloors.includes(item.id)&&Number.isFinite(item.maxY)&&(item.maxY<=y+6.5||rampFloor(item,stepFloors)))continue;
  if(coastPolygonIsFar(item.polygon,x,z,x,z,radius,skin))continue;
  const hx=item.localHalfX??item.halfX,hz=item.localHalfZ??item.halfZ,reach=radius+hx+hz+2*skin+1e-7;
  if(!item.polygon?.length&&hx>=0&&hz>=0&&Number.isFinite(reach)&&Number.isFinite(item.x)&&Number.isFinite(item.z)
   &&(Math.abs(x-item.x)>reach||Math.abs(z-item.z)>reach))continue;
  if(contact(x,z,item,y,0,heading).intersects)return false;
 }return true;
}

// One synchronous ramp search reads hundreds of unchanged world polygons
// dozens of times. Snapshot only their conservative extents for this search,
// then retain the exact live body/contact for every potentially touching item.
// The next search always rebuilds the snapshot, including shifted pebbles.
export function coastCarryClearanceBatch(items,body,contact,skin=.24){
 const values=body&&[body.offsetX,body.offsetZ,body.halfX,body.halfZ];
 const radius=values?.every(Number.isFinite)&&body.halfX>=0&&body.halfZ>=0?values.reduce((sum,v)=>sum+Math.abs(v),0):Infinity,reach=skin>=0?radius+2*skin+1e-7:Infinity;
 const rows=items.map(item=>{let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  if(item.polygon?.length>=3){for(const p of item.polygon){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return {item};minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}}
  else if(!item.polygon?.length){const hx=item.localHalfX??item.halfX,hz=item.localHalfZ??item.halfZ,r=hx+hz;if(!(hx>=0&&hz>=0&&Number.isFinite(r+item.x+item.z)))return {item};minX=item.x-r;maxX=item.x+r;minZ=item.z-r;maxZ=item.z+r;}
  else return {item};
  return {item,minX:minX-reach,maxX:maxX+reach,minZ:minZ-reach,maxZ:maxZ+reach};
 });
 return(x,y,z,heading,stepFloors=[])=>{for(const row of rows){const {item}=row;
  if(stepFloors.includes(item.id)&&Number.isFinite(item.maxY)&&(item.maxY<=y+6.5||rampFloor(item,stepFloors)))continue;
  if(Number.isFinite(x+z+reach)&&(x<row.minX||x>row.maxX||z<row.minZ||z>row.maxZ))continue;
  if(contact(x,z,item,y,0,heading).intersects)return false;
 }return true;};
}
