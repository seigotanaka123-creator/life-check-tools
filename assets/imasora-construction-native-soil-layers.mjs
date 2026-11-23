import {earthBaseReader,patchColumns} from './imasora-construction-field-earth.mjs?v=120ov';
import {HAND_EARTH_SHAPES,handEarthSoilDelta,scoopTerrainDelta,soilTransportGeometry} from './imasora-construction-soil-transport.mjs?v=120pv';
import {isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
// A column may contain earth below the yard and a separate pile on a floor.
// Keep the void between them. A highest-top-only map turns that void into land.
const cache=new WeakMap(),immutable=new WeakSet();
function stable(v){if(!v||typeof v!=='object')return true;if(isCapturedConstructionJson(v)||immutable.has(v))return true;if(!Object.isFrozen(v)||!Object.values(v).every(stable))return false;immutable.add(v);return true;}
function build(soil,extra){
 const columns=new Map(),insertionOrder=[],baseAt=earthBaseReader(soil);
 function add(x,z,lo,hi){
  let row=columns.get(x);if(!row){row=new Map();columns.set(x,row);}
  let intervals=row.get(z);
  if(!intervals){intervals=[];row.set(z,intervals);insertionOrder.push({x,z,row,intervals});}
  intervals.push([lo,hi]);
 }
 for(const b of soilTransportGeometry({blocks:soil.blocks,loose:{}})){const r=b.size/2;for(let x=Math.floor((b.position[0]-r)/2);x<Math.ceil((b.position[0]+r)/2);x++)for(let z=Math.floor((b.position[2]-r)/2);z<Math.ceil((b.position[2]+r)/2);z++)add(x,z,b.position[1]-r,b.position[1]+r);}
 for(const [x,y,z] of extra)add(x,z,y*2,y*2+2);
 const floating=[];
 for(const {x,z,row,intervals:a} of insertionOrder){a.sort((p,q)=>p[0]-q[0]);const merged=[];for(const p of a){const last=merged.at(-1);if(last&&p[0]<=last[1]+.001)last[1]=Math.max(last[1],p[1]);else merged.push([...p]);}const base=baseAt(x*2+1,z*2+1);let ground=base;
  for(const [lo,hi] of merged){if(lo<=ground+.001)ground=Math.max(ground,hi);else floating.push({key:x+','+z+'/'+lo,x:x*2+1,z:z*2+1,lo,hi,w:2,d:2});}
  row.set(z,Object.freeze({ground,intervals:Object.freeze(merged.map(Object.freeze))}));
 }
 const columnAt=(x,z)=>columns.get(Math.floor(x/2))?.get(Math.floor(z/2));
 const bed=baseAt.surface??baseAt;
 const read=columns.size===0?bed:(x,z,reference=null,rise=8)=>{
  const c=columnAt(x,z);if(!c)return bed(x,z);
  let h=c.ground;
  if(Number.isFinite(reference))for(const [,top] of c.intervals)if(top<=reference+rise+.001)h=Math.max(h,top);
  return baseAt.soilHeight?.(x,z,h)??h;
 };
 const isEmptyArea=(minX,maxX,minZ,maxZ)=>{
  const firstZ=Math.floor(minZ/2),lastZ=Math.floor(maxZ/2);
  for(let x=Math.floor(minX/2);x<=Math.floor(maxX/2);x++){
   const row=columns.get(x);
   if(row)for(let z=firstZ;z<=lastZ;z++)if(row.has(z))return false;
  }
  return true;
 };
 return Object.freeze({read,floating:Object.freeze(floating.map(Object.freeze)),columnAt,isEmptyArea});
}
function handEditLayers(soil,old,base){
 const baseAt=earthBaseReader(soil),columns=new Map(),[x,y,z]=base;
 const command=soil.journal.at(-1),low=y*2,high=low+HAND_EARTH_SHAPES[command.shape].height,placing=command.action==='place';
 const newFloating=[];
 for(let dx=0;dx<4;dx++)for(let dz=0;dz<4;dz++){
  const ix=x+dx,iz=z+dz,cx=ix*2+1,cz=iz*2+1,key=ix+','+iz;
  const source=old.columnAt(cx,cz)?.intervals??[];
  let intervals;
  if(placing){
   const sorted=[...source,[low,high]].sort((a,b)=>a[0]-b[0]);intervals=[];
   for(const [lo,hi] of sorted){const last=intervals.at(-1);if(last&&lo<=last[1]+.001)last[1]=Math.max(last[1],hi);else intervals.push([lo,hi]);}
  }else{
   intervals=source.flatMap(([lo,hi])=>hi<=low||lo>=high?[[lo,hi]]:[...(lo<low?[[lo,low]]:[]),...(hi>high?[[high,hi]]:[])]);
  }
  let ground=baseAt(cx,cz);
  for(const [lo,hi] of intervals){if(lo<=ground+.001)ground=Math.max(ground,hi);else newFloating.push({key:key+'/'+lo,x:cx,z:cz,lo,hi,w:2,d:2});}
  columns.set(key,intervals.length?Object.freeze({ground,intervals:Object.freeze(intervals.map(Object.freeze))}):null);
 }
 return overlayLayers(baseAt,old,columns,newFloating);
}
function overlayLayers(baseAt,old,columns,newFloating){
 const columnAt=(x,z)=>{
  const key=Math.floor(x/2)+','+Math.floor(z/2);
  return columns.has(key)?columns.get(key)??undefined:old.columnAt(x,z);
 };
 const read=(x,z,reference=null,rise=8)=>{
  const column=columnAt(x,z);if(!column)return (baseAt.surface??baseAt)(x,z);
  let h=column.ground;
  if(Number.isFinite(reference))for(const [,top] of column.intervals)if(top<=reference+rise+.001)h=Math.max(h,top);
  return baseAt.soilHeight?.(x,z,h)??h;
 };
 const floating=old.floating.filter(part=>!columns.has(Math.floor(part.x/2)+','+Math.floor(part.z/2))).concat(newFloating.map(Object.freeze));
 let left=Infinity,right=-Infinity,near=Infinity,far=-Infinity;
 for(const key of columns.keys()){
  const [x,z]=key.split(',').map(Number);
  left=Math.min(left,x*2);right=Math.max(right,x*2+2);
  near=Math.min(near,z*2);far=Math.max(far,z*2+2);
 }
 const isEmptyArea=(minX,maxX,minZ,maxZ)=>(maxX<left||minX>=right||maxZ<near||minZ>=far)&&old.isEmptyArea?.(minX,maxX,minZ,maxZ);
 return Object.freeze({read,columnAt,isEmptyArea,floating:Object.freeze(floating)});
}
function scoopLayers(soil,old,command){
 if(command.type==='release'||command.type==='reserve')return old;
 const intervals=new Map(),baseAt=earthBaseReader(soil);
 function update(x,z,edit){
  const key=x+','+z,prior=intervals.get(key);
  const before=prior?.ranges??old.columnAt(x*2+1,z*2+1)?.intervals??[];
  intervals.set(key,{x,z,ranges:edit(before)});
 }
 if(command.type==='open-ground'){
  for(const patch of command.patches)for(const [x,z] of patchColumns(soil,patch)){
   for(let dx=0;dx<4;dx++)for(let dz=0;dz<4;dz++)update(x*4+dx,z*4+dz,before=>[[-32,0],...before]);
  }
 }else{
  for(const part of soil.pending.segments)if(part.from==='terrain')for(const [x,y,z] of part.positions){
   const bottom=y*2,top=bottom+2;
   update(x,z,before=>before.flatMap(([lo,hi])=>hi<=bottom||lo>=top?[[lo,hi]]:[
    ...(lo<bottom?[[lo,bottom]]:[]),...(hi>top?[[top,hi]]:[]),
   ]));
  }
 }
 if(!intervals.size)return old;
 const changed=new Map(),newFloating=[];
 for(const [key,{x,z,ranges}] of intervals){
  const merged=[];
  for(const [lo,hi] of ranges.slice().sort((a,b)=>a[0]-b[0])){
   const last=merged.at(-1);
   if(last&&lo<=last[1]+.001)last[1]=Math.max(last[1],hi);else merged.push([lo,hi]);
  }
  const cx=x*2+1,cz=z*2+1;
  let ground=baseAt(cx,cz);
  for(const [lo,hi] of merged){
   if(lo<=ground+.001)ground=Math.max(ground,hi);else newFloating.push({key:key+'/'+lo,x:cx,z:cz,lo,hi,w:2,d:2});
  }
  changed.set(key,merged.length?Object.freeze({ground,intervals:Object.freeze(merged.map(Object.freeze))}):null);
 }
 return overlayLayers(baseAt,old,changed,newFloating);
}
export function nativeSoilLayers(soil,extra=[]){
 const scoop=scoopTerrainDelta(soil);
 if(extra.length||!scoop&&!stable(soil))return build(soil,extra);
 let c=cache.get(soil);if(c?.revision===soil.revision)return c.value;
 const hand=handEarthSoilDelta(soil);
 let link=hand??scoop;
 let old=link&&cache.get(link.previous);
 const steps=[{soil,hand,command:scoop?.command}];
 // A save can check the final bucket against a surveyed, reserved and
 // released layer before it has ever asked for the intermediate layers.
 // Follow this short proven chain back to an already-built surface.
 while(!old&&link&&!hand&&steps.length<3){
  const parent=link.previous;
  link=scoopTerrainDelta(parent);
  if(!link)break;
  steps.push({soil:parent,command:link.command});
  old=cache.get(link.previous);
 }
 if(old&&(old.depth??0)+steps.filter(step=>step.command?.type!=='release').length<=24){
  for(const step of steps.reverse()){
   const value=step.hand?handEditLayers(step.soil,old.value,step.hand.base)
    :scoopLayers(step.soil,old.value,step.command);
   old={revision:step.soil.revision,depth:value===old.value?old.depth:(old.depth??0)+1,value};
   cache.set(step.soil,old);
  }
  return old.value;
 }
 c={revision:soil.revision,value:build(soil,[])};
 cache.set(soil,c);
 return c.value;
}
export function nativeFloatingSoilBoxes(frame){if(!frame?.decks)return[];const o=frame.soil.field.origin;return nativeSoilLayers(frame.soil).floating.map(p=>({x:p.x+o[0],z:p.z+o[1],y:(p.lo+p.hi)/2,w:2,d:2,h:p.hi-p.lo,angle:0}));}
export function nativeSoilBearingHeight(frame,x,z,height){if(!frame?.decks)return height;const c=nativeSoilLayers(frame.soil).columnAt(x,z),pile=c?.intervals.find(([lo,hi])=>lo>c.ground+.01&&Math.abs(hi-height)<.15);return pile?.[0]??height;}
