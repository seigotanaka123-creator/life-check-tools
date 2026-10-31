import {earthBaseReader} from './imasora-construction-field-earth.mjs?v=120ow';
import {soilTransportGeometry} from './imasora-construction-soil-transport.mjs?v=120pv';
import {isCapturedConstructionJson} from './imasora-construction-json-capture.mjs';
// A column may contain earth below the yard and a separate pile on a floor.
// Keep the void between them. A highest-top-only map turns that void into land.
const cache=new WeakMap(),immutable=new WeakSet();
function stable(v){if(!v||typeof v!=='object')return true;if(isCapturedConstructionJson(v)||immutable.has(v))return true;if(!Object.isFrozen(v)||!Object.values(v).every(stable))return false;immutable.add(v);return true;}
function build(soil,extra){
 const columns=new Map(),baseAt=earthBaseReader(soil),add=(x,z,lo,hi)=>{const k=x+','+z,a=columns.get(k)??[];a.push([lo,hi]);columns.set(k,a);};
 for(const b of soilTransportGeometry({blocks:soil.blocks,loose:{}})){const r=b.size/2;for(let x=Math.floor((b.position[0]-r)/2);x<Math.ceil((b.position[0]+r)/2);x++)for(let z=Math.floor((b.position[2]-r)/2);z<Math.ceil((b.position[2]+r)/2);z++)add(x,z,b.position[1]-r,b.position[1]+r);}
 for(const [x,y,z] of extra)add(x,z,y*2,y*2+2);
 const floating=[];
 for(const [key,a] of columns){a.sort((p,q)=>p[0]-q[0]);const merged=[];for(const p of a){const last=merged.at(-1);if(last&&p[0]<=last[1]+.001)last[1]=Math.max(last[1],p[1]);else merged.push([...p]);}const [x,z]=key.split(',').map(Number),base=baseAt(x*2+1,z*2+1);let ground=base;
  for(const [lo,hi] of merged){if(lo<=ground+.001)ground=Math.max(ground,hi);else floating.push({key:key+'/'+lo,x:x*2+1,z:z*2+1,lo,hi,w:2,d:2});}
  columns.set(key,Object.freeze({ground,intervals:Object.freeze(merged.map(Object.freeze))}));
 }
 const read=(x,z,reference=null,rise=8)=>{const c=columns.get(Math.floor(x/2)+','+Math.floor(z/2)),ground=c?.ground??baseAt(x,z);if(!Number.isFinite(reference)||!c)return ground;let h=ground;for(const [,top] of c.intervals)if(top<=reference+rise+.001)h=Math.max(h,top);return h;};
 return Object.freeze({read,floating:Object.freeze(floating.map(Object.freeze)),columnAt:(x,z)=>columns.get(Math.floor(x/2)+','+Math.floor(z/2))});
}
export function nativeSoilLayers(soil,extra=[]){if(extra.length||!stable(soil))return build(soil,extra);let c=cache.get(soil);if(!c||c.revision!==soil.revision){c={revision:soil.revision,value:build(soil,[])};cache.set(soil,c);}return c.value;}
export function nativeFloatingSoilBoxes(frame){if(!frame?.decks)return[];const o=frame.soil.field.origin;return nativeSoilLayers(frame.soil).floating.map(p=>({x:p.x+o[0],z:p.z+o[1],y:(p.lo+p.hi)/2,w:2,d:2,h:p.hi-p.lo,angle:0}));}
export function nativeSoilBearingHeight(frame,x,z,height){if(!frame?.decks)return height;const c=nativeSoilLayers(frame.soil).columnAt(x,z),pile=c?.intervals.find(([lo,hi])=>lo>c.ground+.01&&Math.abs(hi-height)<.15);return pile?.[0]??height;}
