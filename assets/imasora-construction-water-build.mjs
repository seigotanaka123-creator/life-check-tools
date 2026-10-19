import {inWorkArea} from './imasora-construction-field-area.mjs?v=120ey';

// One 8 x 8 x 8 earth block uses 4 L in the game's water scale.
// Quantities remain integer 250 mL units, including partial fills and recovery.
export const WATER_BLOCK=8, WATER_VOLUME_PER_Q=32, WATER_BLOCK_Q=16;
const valid=y=>Number.isFinite(y)&&y>=-32&&y<=48;
export const waterBuildTotal=s=>(s.waterBuilds??[]).reduce((n,b)=>n+b.q,0);
export const waterBuildCellSize=b=>b.kind==='block'?8:2;
const levelProfiles=new WeakMap();
function levelProfile(cells){
 let p=levelProfiles.get(cells);
 // Imported/caller-owned arrays can be mutable. Never trust identity alone.
 if(p&&p.ys.length===cells.length&&cells.every((c,i)=>c.y===p.ys[i]))return p;
 const ys=cells.map(c=>c.y),sorted=[...ys].sort((a,b)=>a-b),bands=[];let sum=0;
 for(let i=0;i<sorted.length;i++){sum+=sorted[i];if(i+1===sorted.length||sorted[i+1]!==sorted[i])bands.push({y:sorted[i],count:i+1,sum,volume:sorted[i]*(i+1)-sum});}
 p={ys,bands};levelProfiles.set(cells,p);return p;
}
export function waterBuildLevel(b){
 if(!b.q)return Math.min(...b.cells.map(c=>c.y));
 if(b.q>=b.capacity)return b.top;
 const bands=levelProfile(b.cells).bands,volume=b.q*WATER_VOLUME_PER_Q/waterBuildCellSize(b)**2;let lo=0,hi=bands.length;
 while(lo+1<hi){const i=(lo+hi)>>1;if(bands[i].volume<=volume)lo=i;else hi=i;}
 const band=bands[lo];return Math.min(b.top,(volume+band.sum)/band.count);
}
export function waterBuildAt(s,p){return(s.waterBuilds??[]).find(b=>b.cells.some(c=>Math.abs(c.x-p.x)<waterBuildCellSize(b)/2+.01&&Math.abs(c.z-p.z)<waterBuildCellSize(b)/2+.01));}
export function waterBuildNearest(s,p){let result=null,best=56**2;for(const b of s.waterBuilds??[]){if(!b.q)continue;for(const c of b.cells){const d=(c.x-p.x)**2+(c.z-p.z)**2;if(d<=best&&(!result||d<best)){best=d;result={b,c};}}}return result;}
function blocked(x,z,bottom,top,external,half){
 for(const b of external){if(b.y+b.h<=bottom+.05||b.y>=top+.05)continue;const c=Math.cos(b.angle??0),s=Math.sin(b.angle??0),dx=x-b.x,dz=z-b.z;if(Math.abs(c*dx-s*dz)<b.w/2+half-.01&&Math.abs(s*dx+c*dz)<b.d/2+half-.01)return true;}return false;
}
const issue=message=>({ok:false,message});
export function planWaterBuild(s,p,external=[],heightAt=()=>0){
 if(!s.loader.vehicle.field)return issue('現場へ移動してから水を置こう。');
 const kind=s.waterMode??'block',existing=waterBuildAt(s,p);
 if(existing)return existing.kind===kind?{ok:existing.q<existing.capacity,build:existing,remaining:existing.capacity-existing.q,message:existing.q===existing.capacity?'ここは満水だよ。隣にも水を置けるよ。':''}:issue('ここには別の置き方の水があるよ。回収してから置こう。');
 const x=Math.round(p.x/8)*8,z=Math.round(p.z/8)*8,y=heightAt(x,z);
 if(!valid(y))return issue('水が置ける地面へ向けてね。');
 let cells,top;
 if(kind==='block'){
  if(!inWorkArea({x,z},s.loader.vehicle,4))return issue('現場の内側へ向けてね。');
  for(let dx=-3.9;dx<=4;dx+=1.95)for(let dz=-3.9;dz<=4;dz+=1.95)if(Math.abs(heightAt(x+dx,z+dz)-y)>.1||!valid(heightAt(x+dx,z+dz)))return issue('ブロックは平らな地面へ。穴には「形に合わせて満たす」を選ぼう。');
  cells=[{x,y,z}];top=y+8;
 }else if(kind==='basin'){
  // Priority flood: the first route out determines the lowest spill rim.
  // 2-unit columns match the excavated terrain. Bounded search runs only when
  // the aim or terrain changes, never once per animation/physics substep.
  const cx=Math.floor(p.x/2)*2+1,cz=Math.floor(p.z/2)*2+1,r=24,n=r*2+1,heights=new Float64Array(n*n),seen=new Uint8Array(n*n),heap=[];
  const push=o=>{heap.push(o);let i=heap.length-1;while(i){const a=(i-1)>>1;if(heap[a].h<=o.h)break;heap[i]=heap[a];i=a;}heap[i]=o;};
  const pop=()=>{const a=heap[0],b=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].h<heap[j].h)j++;if(heap[j].h>=b.h)break;heap[i]=heap[j];i=j;}heap[i]=b;}return a;};
  const walls=external.map(b=>{const c=Math.cos(b.angle??0),sn=Math.sin(b.angle??0);return{...b,c,sn,ex:Math.abs(c)*b.w/2+Math.abs(sn)*b.d/2+2,ez:Math.abs(sn)*b.w/2+Math.abs(c)*b.d/2+2};}).filter(b=>Math.abs(b.x-cx)<=r*2+b.ex&&Math.abs(b.z-cz)<=r*2+b.ez);
  for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){const xx=cx+(ix-r)*2,zz=cz+(iz-r)*2;let h=heightAt(xx,zz);if(!valid(h)||!inWorkArea({x:xx,z:zz},s.loader.vehicle,1))return issue('この穴の縁をたしかめられないよ。別の穴へ向けてね。');
   // Real solid walls can retain water; narrow walls are sampled at cell edges.
   for(const b of walls){const {c,sn}=b,dx=xx-b.x,dz=zz-b.z;if(b.y<=h+.1&&Math.abs(c*dx-sn*dz)<b.w/2+1&&Math.abs(sn*dx+c*dz)<b.d/2+1)h=Math.max(h,b.y+b.h);}
   heights[iz*n+ix]=h;
  }
  const start=r*n+r;seen[start]=1;push({i:start,h:heights[start]});const region=[];
  while(heap.length){const o=pop(),ix=o.i%n,iz=Math.floor(o.i/n);if(ix===0||iz===0||ix===n-1||iz===n-1){top=o.h;break;}region.push(o.i);for(const k of[o.i-1,o.i+1,o.i-n,o.i+n])if(!seen[k]){seen[k]=1;push({i:k,h:Math.max(o.h,heights[k])});}}
  if(!Number.isFinite(top)||top<=heights[start]+.1||top>48)return issue('ここは水をためる穴ではないよ。平地は「水ブロック」で作ろう。');
  // Include the entire connected space strictly below the rim, not only the
  // priority-queue prefix, so equal-height branches are not omitted.
  const queue=[start],visited=new Set(queue);cells=[];
  for(let at=0;at<queue.length;at++){const i=queue[at],ix=i%n,iz=Math.floor(i/n);if(ix===0||iz===0||ix===n-1||iz===n-1)return issue('穴が広すぎるよ。土で仕切ると少ない水で作れるよ。');
   cells.push({x:cx+(ix-r)*2,y:heights[i],z:cz+(iz-r)*2});
   for(const k of[i-1,i+1,i-n,i+n])if(!visited.has(k)&&heights[k]<top-.01){visited.add(k);queue.push(k);}
  }
 }else return issue('水の置き方を選ぼう。');
 const size=kind==='block'?8:2,area=size**2;
 if(cells.length>1024)return issue('穴を土で仕切って、小さくすると作れるよ。');
 const capacity=Math.ceil((cells.reduce((v,c)=>v+(top-c.y)*area,0)-1e-7)/WATER_VOLUME_PER_Q);
 if(capacity<1||capacity>768)return issue('この穴は水が多く必要だよ。土で少し浅くしてから注ごう。');
 for(const c of cells){
  const v=s.loader.vehicle,cs=Math.cos(v.heading),sn=Math.sin(v.heading),dx=c.x-v.x,dz=c.z-v.z;
  if(top>heightAt(v.x,v.z)+.1&&Math.abs(cs*dx-sn*dz)<34+size/2&&Math.abs(sn*dx+cs*dz)<47+size/2)return issue('車の真下には置けないよ。注ぎ口を少し先へ向けよう。');
  if(Object.values(s.pools??{}).some(d=>d.q>0&&Math.abs(d.x-c.x)<6+size/2&&Math.abs(d.z-c.z)<6+size/2))return issue('前に注いだ水があるよ。一度回収してから置こう。');
  if(blocked(c.x,c.z,c.y,top,external,size/2))return issue('車や建物に重なるよ。少し場所を変えよう。');
  if((s.waterBuilds??[]).some(b=>b.cells.some(d=>Math.abs(d.x-c.x)<(size+waterBuildCellSize(b))/2-.01&&Math.abs(d.z-c.z)<(size+waterBuildCellSize(b))/2-.01)))return issue('すでにある水の上だよ。空いている所へ向けよう。');
 }
 const build={id:kind+':'+cells[0].x+','+cells[0].y+','+cells[0].z,kind,cells,top,capacity,q:0};
 return{ok:true,build,remaining:capacity,message:''};
}
const terrainChecks=new WeakMap();
export function waterBuildTerrainFits(b,heightAt,external=[]){
 const old=terrainChecks.get(b.cells),revision=heightAt.revision;if(revision!==undefined&&old?.sampler===heightAt&&old.revision===revision&&old.external===external)return old.ok;
 const size=waterBuildCellSize(b),ok=b.cells.every(c=>{const h=heightAt(c.x,c.z);return valid(h)&&Math.abs(h-c.y)<.11&&!blocked(c.x,c.z,c.y,b.top,external,size/2);});
 if(revision!==undefined)terrainChecks.set(b.cells,{sampler:heightAt,revision,external,ok});return ok;
}
export function validateWaterBuilds(s){
 if(s.waterMode!==undefined&&!['block','basin'].includes(s.waterMode))throw Error('水の置き方が不正です。');
 if(s.waterBuilds===undefined)return;
 if(!s.loader.vehicle.field||!Array.isArray(s.waterBuilds)||s.waterBuilds.length>192)throw Error('水の形の記録が不正です。');
 const ids=new Set(),occupied=new Set();let count=0;
 for(const b of s.waterBuilds){
  if(!b||Object.keys(b).sort().join(',')!=='capacity,cells,id,kind,q,top'||typeof b.id!=='string'||b.id.length>100||ids.has(b.id)||!['block','basin'].includes(b.kind)||!Array.isArray(b.cells)||!b.cells.length||b.cells.length>1024||!Number.isFinite(b.top)||b.top< -32||b.top>56||!Number.isSafeInteger(b.capacity)||b.capacity<1||b.capacity>768||!Number.isSafeInteger(b.q)||b.q<0||b.q>b.capacity)throw Error('水の形・量が不正です。');ids.add(b.id);count+=b.cells.length;
  const seen=new Set(),size=waterBuildCellSize(b);for(const c of b.cells){const k=c.x+','+c.z;if(Object.keys(c).sort().join(',')!=='x,y,z'||![c.x,c.y,c.z].every(Number.isFinite)||!valid(c.y)||c.y>=b.top||!inWorkArea(c,s.loader.vehicle,size/2)||seen.has(k)|| (b.kind==='block'?(c.x%8||c.z%8):(c.x%2===0||c.z%2===0||!Number.isInteger(c.x)||!Number.isInteger(c.z))))throw Error('水の底の形が不正です。');seen.add(k);}
  for(const c of b.cells)for(let x=c.x-size/2+1;x<c.x+size/2;x+=2)for(let z=c.z-size/2+1;z<c.z+size/2;z+=2){const k=x+','+z;if(occupied.has(k))throw Error('水の形が重複しています。');occupied.add(k);}
  const q=Math.ceil((b.cells.reduce((v,c)=>v+(b.top-c.y)*size*size,0)-1e-7)/WATER_VOLUME_PER_Q);if(q!==b.capacity||b.kind==='block'&&(b.cells.length!==1||b.top-b.cells[0].y!==8))throw Error('水の必要量が一致しません。');
 }
 if(count>4096)throw Error('水の形の記録が多すぎます。');
}
