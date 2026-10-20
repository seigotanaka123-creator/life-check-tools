import {transportArea} from './imasora-construction-transport-field.mjs?v=120gf';
// Natural ground is finite, 32 deep, and revealed in 32 x 32 patches. Survey
// commands only open previously untouched patches; replay never refills a cut.
// Legacy terrain's original allocation is excluded even when emptied.
const cache=new WeakMap();
export function earthPatches(soil){let map=cache.get(soil);if(!map||map.revision!==soil.revision){map=new Map();for(const c of soil.journal??[])if(c.type==='open-ground')for(const p of c.patches)map.set(p.join(','),p);map.revision=soil.revision;cache.set(soil,map);}return map;}
export function patchColumns(soil,patch){
 if(soil.schema!==3||!Array.isArray(patch)||patch.length!==2||!patch.every(Number.isSafeInteger))throw Error('掘る地面の場所が不正です。');
 const area=transportArea(soil),[px,pz]=patch,out=[];
 if(px< -160||px>159||pz< -160||pz>159)throw Error('現場の外の土は掘れません。');
 for(let x=px*4;x<px*4+4;x++)for(let z=pz*4;z<pz*4+4;z++){
  if(x>=-4&&x<12&&z>=6&&z<22)continue;
  if(x*8<area.minX||(x+1)*8>area.maxX||z*8<area.minZ||(z+1)*8>area.maxZ)continue;
  out.push([x,z]);
 }
 return out;
}
export function earthAllocated(soil){let q=0;for(const p of earthPatches(soil).values())q+=patchColumns(soil,p).length*4*64;return q;}
const baseReaders=new WeakMap();
export function earthBaseReader(soil){
 let entry=baseReaders.get(soil);if(entry&&entry.revision===soil.revision)return entry.read;
 const area=soil.schema===3?transportArea(soil):null,patches=area?earthPatches(soil):null;
 const read=(x,z)=>{if(x>=-32&&x<96&&z>=48&&z<176)return -32;if(!area)return 0;const bx=Math.floor(x/8)*8,bz=Math.floor(z/8)*8;return bx>=area.minX&&bx+8<=area.maxX&&bz>=area.minZ&&bz+8<=area.maxZ&&patches.has([Math.floor(x/32),Math.floor(z/32)].join(','))?-32:0;};
 baseReaders.set(soil,{revision:soil.revision,read});return read;
}
export function earthBase(soil,x,z){return earthBaseReader(soil)(x,z);}
const holesCache=new WeakMap();
export function earthHoles(soil){const patches=earthPatches(soil);let holes=holesCache.get(patches);if(holes)return holes;holes=[];for(const p of patches.values()){const rows=new Map();for(const [x,z] of patchColumns(soil,p)){const row=rows.get(z)??[];row.push(x);rows.set(z,row);}for(const [z,xs] of rows){const minX=Math.min(...xs)*8,maxX=(Math.max(...xs)+1)*8;const prev=holes.find(h=>h.minX===minX&&h.maxX===maxX&&h.maxZ===z*8);if(prev)prev.maxZ=(z+1)*8;else holes.push({minX,maxX,minZ:z*8,maxZ:(z+1)*8});}}holesCache.set(patches,holes);return holes;}
export function unopenedGround(s){
 const f=s.frame,soil=f.soil;if(f.version!==2||soil.pending||f.job||s.scoop||s.link||s.unload||!['foot','excavating'].includes(s.mode))return[];
 const exc=s.mode==='excavating',v=exc?f.machineVehicle:f.player,a=v.heading+(exc?f.machineArm.slew:0),sn=Math.sin(a),c=Math.cos(a),seen=new Set(),out=[];
 for(const d of exc?[32,60,88,116,144]:[20,36])for(const side of exc?[-20,0,20]:[-4,4]){
  const p=[Math.floor((v.x+sn*d+c*side)/32),Math.floor((v.z+c*d-sn*side)/32)],key=p.join(',');
  if(seen.has(key)||earthPatches(soil).has(key))continue;seen.add(key);
  if(patchColumns(soil,p).length)out.push(p);
 }
 return out;
}
