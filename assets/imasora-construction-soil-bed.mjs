// A received batch always occupies 32*32*2 = 2048 volume. The saved profile
// describes material, never a saved vehicle pose. Legacy beds remain flat.
export const BED_CELLS=16,BED_CELL=2,BED_VOLUME=2048;
const own=(p,k)=>Object.hasOwn(p,k);
export function soilBedBaseAt(p,x,z){
 const dx=x-p.x,dz=z-p.z;if(Math.abs(dx)>16||Math.abs(dz)>16)return null;
 if(!p.heights)return p.baseY??0;
 const ix=Math.max(0,Math.min(15,Math.floor((dx+16)/2))),iz=Math.max(0,Math.min(15,Math.floor((dz+16)/2)));
 return p.heights[iz*16+ix];
}
export function soilBedColumns(p){return p.heights?p.heights.map((y,i)=>({x:p.x-15+(i%16)*2,z:p.z-15+Math.floor(i/16)*2,y,width:2,depth:2})): [{x:p.x,z:p.z,y:p.baseY??0,width:32,depth:32}];}
// Merge equal neighbouring cells into rectangles. Typical voxel slopes need
// only a few strips, rather than hundreds of floors, walls and draw calls.
const rectCache=new WeakMap();
export function soilBedRects(p){
 if(!p.heights)return soilBedColumns(p);
 let cached=rectCache.get(p);if(cached)return cached;
 const used=new Uint8Array(256),out=[];
 for(let z=0;z<16;z++)for(let x=0;x<16;x++){
  const i=z*16+x;if(used[i])continue;const y=p.heights[i];let w=1,d=1;
  while(x+w<16&&!used[i+w]&&p.heights[i+w]===y)w++;
  rows:while(z+d<16){for(let a=0;a<w;a++)if(used[(z+d)*16+x+a]||p.heights[(z+d)*16+x+a]!==y)break rows;d++;}
  for(let b=0;b<d;b++)for(let a=0;a<w;a++)used[(z+b)*16+x+a]=1;
  out.push({x:p.x-16+x*2+w,z:p.z-16+z*2+d,y,width:w*2,depth:d*2});
 }
 rectCache.set(p,out);return out;
}
export function soilBedShape(p){return p&&[p.id,p.x,p.z,p.baseY??0,p.heights??null];}
export function validSoilBed(p,field){
 if(!p||Object.getPrototypeOf(p)!==Object.prototype)return false;
 const expected=['id','x','z',...(own(p,'baseY')?['baseY']:[]),...(own(p,'heights')?['heights']:[])];
 if(Object.keys(p).sort().join('|')!==expected.sort().join('|'))return false;
 if(own(p,'baseY')&&(!field||!Number.isFinite(p.baseY)||p.baseY< -32||p.baseY>48))return false;
 if(!own(p,'heights'))return true;
 if(!field||own(p,'baseY')||!Array.isArray(p.heights)||p.heights.length!==256||Array.from(p.heights).some(y=>!Number.isFinite(y)||y< -32||y>48))return false;
 // No hidden cliffs or one-cell spikes. Native 2-unit voxels may form a step.
 if(Math.max(...p.heights)-Math.min(...p.heights)>8.001)return false;
 for(let z=0;z<16;z++)for(let x=0;x<16;x++){
  const h=p.heights[z*16+x];
  for(const [dx,dz] of [[1,0],[0,1]])if(x+dx<16&&z+dz<16&&Math.abs(h-p.heights[(z+dz)*16+x+dx])>2.001)return false;
 }
 return true;
}
// Probe each complete 2-unit terrain cell. Small smooth slopes are supported;
// a hole, cliff through a cell, or an unsupported tall lip rejects the batch.
export function soilBedProfile(p,heightAt){
 const heights=[];
 for(let z=0;z<16;z++)for(let x=0;x<16;x++){
  const cx=p.x-15+x*2,cz=p.z-15+z*2;let lo=Infinity,hi=-Infinity;
  for(const dx of[-.999,0,.999])for(const dz of[-.999,0,.999]){const y=heightAt(cx+dx,cz+dz);if(!Number.isFinite(y)||y< -32||y>48)return null;lo=Math.min(lo,y);hi=Math.max(hi,y);}
  if(hi-lo>.41)return null;heights.push(hi);
 }
 const h0=Math.min(...heights),h1=Math.max(...heights);
 if(h1-h0<=.12)return {baseY:h1};
 const shape={id:1,x:p.x,z:p.z,heights};return validSoilBed(shape,true)?{heights}:null;
}
