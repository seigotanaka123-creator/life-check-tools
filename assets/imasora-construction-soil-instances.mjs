import * as THREE from './three.module.min.js';
import {shovelNearbySoil,shovelSoilBoxes} from './imasora-construction-shovel-work.mjs?v=120pv';
import {scoopTerrainDelta,soilTransportGeometry} from './imasora-construction-soil-transport.mjs?v=120pv';
import {patchColumns,quarryRock} from './imasora-construction-field-earth.mjs?v=120ov';
import {createConstructionEarthMaterial} from './imasora-construction-ground.js?v=120ds';

// Every camera ray lies inside this horizontal rectangle, even while its
// height is raised to avoid obstruction. This is a conservative broad phase;
// the view still performs the original exact segment test on every candidate.
export function soilCameraCandidates(soil,from,focusPoints,padding=1){
 const points=[from,...focusPoints];
 if(!Number.isFinite(padding)||padding<0||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))return shovelSoilBoxes(soil);
 const margin=padding+1e-6,minX=Math.min(...points.map(p=>p[0]))-margin,maxX=Math.max(...points.map(p=>p[0]))+margin,minZ=Math.min(...points.map(p=>p[2]))-margin,maxZ=Math.max(...points.map(p=>p[2]))+margin;
 const x=(minX+maxX)/2,z=(minZ+maxZ)/2,r=Math.max(maxX-minX,maxZ-minZ)/2;
 const boxes=r<=640&&Math.abs(x)<=8400&&Math.abs(z)<=5200?shovelNearbySoil(soil,x,z,r):shovelSoilBoxes(soil);
 return boxes.filter(b=>b.position[0]+b.size/2>=minX&&b.position[0]-b.size/2<=maxX&&b.position[2]+b.size/2>=minZ&&b.position[2]-b.size/2<=maxZ);
}

// The geometry/material belong to the enclosing view. Only instance buffers
// belong to this layer; dispose them without disposing the shared cube.
export function createSoilInstanceLayer(parent,geometry,material){
 const matrix=new THREE.Matrix4();
 let mesh=null,capacity=0,disposed=false,reallocations=0,uploads=0,writtenInstances=0;
 return {
  sync(boxes){
   if(disposed)throw Error('土の表示は終了しています。');
   const count=boxes.length;
   if(count>capacity){
    let next=Math.max(1,capacity);while(next<count)next*=2;
    const replacement=new THREE.InstancedMesh(geometry,material,next);
    replacement.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if(mesh){mesh.removeFromParent();mesh.dispose();}
    mesh=replacement;capacity=next;reallocations++;parent.add(mesh);
   }
   if(!mesh)return;
   mesh.count=count;mesh.visible=count>0;
   if(!count)return;
   for(let i=0;i<count;i++){
    const box=boxes[i];matrix.makeScale(box.size,box.size,box.size);matrix.setPosition(...box.position);
    mesh.setMatrixAt(i,matrix);
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
   uploads++;writtenInstances+=count;
  },
  get proof(){return {count:mesh?.count??0,capacity,reallocations,uploads,writtenInstances};},
  dispose(){if(disposed)return;disposed=true;if(mesh){mesh.removeFromParent();mesh.dispose();mesh=null;}capacity=0;},
 };
}

// A saved block describes 4×4×4 two-unit soil grains. Use the same occupancy
// for the visible surface, and omit only faces that touch another grain.
const TERRAIN_CHUNK_SIZE=16;
const AXES=[1,4,16].map((stride,axis)=>{
 let low=0n,high=0n;
 const faceBits=Array.from({length:4},()=>[]);
 for(let i=0;i<64;i++){
  const grid=[i%4,(i>>2)%4,i>>4],bit=1n<<BigInt(i);
  const plane=grid[axis],u=grid[(axis+1)%3],v=grid[(axis+2)%3];
  if(plane===0)low|=bit;
  if(plane===3)high|=bit;
  faceBits[plane][v*4+u]=bit;
 }
 return {step:BigInt(stride),edge:BigInt(3*stride),low,high,faceBits};
});

const blockKey=(x,y,z)=>x+','+y+','+z;
const chunkKey=(x,z)=>Math.floor(x/TERRAIN_CHUNK_SIZE)+','+Math.floor(z/TERRAIN_CHUNK_SIZE);

function rockSurfaceColor(x,z,tint,color){
 const variation=Math.sin(x*.0035+z*.0021);
 color.setHSL(.082+variation*.003,.23,.38+variation*.008);
 return [color.r*tint[0],color.g*tint[1],color.b*tint[2]];
}
function exposedSoilGeometry(chunk,blocks,tint,surface){
 const color=new THREE.Color();
 const positions=[],normals=[],indices=[],colors=tint?[]:null;
 for(const {cell,bits} of chunk.members.values()){
  for(const [axis,dir] of AXES.entries()){
   for(const normal of [-1,1]){
    const next=cell.slice();
    next[axis]+=normal;
    const neighbor=blocks.get(blockKey(...next))?.bits??0n;
    const touching=normal===1
     ? ((bits>>dir.step)&~dir.high)|((neighbor&dir.low)<<dir.edge)
     : ((bits<<dir.step)&~dir.low)|((neighbor&dir.high)>>dir.edge);
    const exposed=bits&~touching;
    if(!exposed)continue;
    const a=(axis+1)%3,b=(axis+2)%3;
    for(const [layer,bitsOnPlane] of dir.faceBits.entries()){
     let mask=0;
     for(let i=0;i<16;i++)if(exposed&bitsOnPlane[i])mask|=1<<i;
     for(let v=0;v<4;v++)for(let u=0;u<4;u++){
      if(!(mask&(1<<(v*4+u))))continue;
      let width=1;
      while(u+width<4&&(mask&(1<<(v*4+u+width))))width++;
      const row=((1<<width)-1)<<u;
      let height=1;
      while(v+height<4&&((mask>>((v+height)*4))&row)===row)height++;
      for(let j=0;j<height;j++)mask&=~(row<<((v+j)*4));
      const vertex=cell.map(n=>n*8);
      vertex[axis]+=(layer+(normal+1)/2)*2;
      vertex[a]+=u*2;vertex[b]+=v*2;
      const n=[0,0,0];n[axis]=normal;
      // Split exposed summit faces at grain boundaries. A cut remains
      // visible; the intact top and its shoulder share their slope.
      const inStock=surface?.plots.some(r=>cell[0]*8+8>r.minX&&cell[0]*8<r.maxX&&cell[2]*8+8>r.minZ&&cell[2]*8<r.maxZ);
      const duStep=inStock?1:width,dvStep=inStock?1:height;
      for(let j=0;j<height;j+=dvStep)for(let i=0;i<width;i+=duStep){
       const base=positions.length/3,mid=vertex.slice();
       mid[a]+=(i+duStep/2)*2;mid[b]+=(j+dvStep/2)*2;mid[axis]-=normal*.5;
       const cap=inStock?surface.stockTop(mid[0],mid[2]):-1;
       for(const [du,dv] of [[i,j],[i+duStep,j],[i+duStep,j+dvStep],[i,j+dvStep]]){
        const p=vertex.slice();p[a]+=du*2;p[b]+=dv*2;
        const intact=cap>=0&&p[1]===cap;
        if(intact)p[1]=surface.coarse(p[0],p[2]);
        positions.push(...p);
        if(intact&&axis===1&&normal===1){
         const dx=surface.coarse(p[0]-2,p[2])-surface.coarse(p[0]+2,p[2]);
         const dz=surface.coarse(p[0],p[2]-2)-surface.coarse(p[0],p[2]+2),len=Math.hypot(dx,4,dz);
         normals.push(dx/len,4/len,dz/len);
        }else normals.push(...n);
        if(colors)colors.push(...(surface?rockSurfaceColor(p[0],p[2],tint(...p),color):tint(...p)));
       }
       if(normal===1)indices.push(base,base+1,base+3,base+3,base+1,base+2);
       else indices.push(base,base+2,base+1,base,base+3,base+2);
      }
     }
    }
   }
  }
 }
 if(!positions.length)return null;
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
 if(colors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);
 geometry.computeBoundingSphere();
 return geometry;
}

// The private soil reducer certifies the still-referenced source and exact
// set of potentially changed cells. A load or unrelated edit gets a full scan.
function changedScoopSurfaceKeys(next,previous){
 if(!previous)return null;
 const keys=new Set();
 for(let step=0;next!==previous&&step<2;step++){
  const delta=scoopTerrainDelta(next);
  if(!delta)return null;
  const c=delta.command;
  if(c.type==='reserve-batch'){
   for(const part of c.segments)if(part.from==='terrain')for(const [x,y,z] of part.positions)
    keys.add(blockKey(Math.floor(x/4),Math.floor(y/4),Math.floor(z/4)));
  }else if(c.type==='open-ground'){
   for(const patch of c.patches)for(const [x,z] of patchColumns(delta.previous,patch))
    for(let y=-4;y<0;y++)keys.add(blockKey(x,y,z));
  }else return null;
  next=delta.previous;
 }
 return next===previous?keys:null;
}

export function createSoilSurfaceLayer(parent,material){
 const blocks=new Map(),chunks=new Map();
 let lastBlocks=null,lastCap=null,uploads=0,disposed=false,quarryMaterial=null,capMaterial=null;
 function removeMesh(chunk){if(!chunk.mesh)return;chunk.mesh.removeFromParent();chunk.mesh.geometry.dispose();chunk.mesh=null;}
 return {
  sync(next,rock=null,changedKeys=null){
   if(disposed)throw Error('土の表示は終了しています。');
   const cap=(rock?.layers??[rock]).find(r=>r?.surface)?.surface??null;
   if(lastBlocks===next&&cap===lastCap)return;
   const dirty=new Set();
   if(lastBlocks&&cap!==lastCap)for(const key of chunks.keys())dirty.add(key);
   lastCap=cap;
   function needsFaces(cell){
    const [x,,z]=cell;
    // Changing a grain on a chunk boundary can uncover a face on a neighbour.
    for(const [dx,dz] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]])dirty.add(chunkKey(x+dx,z+dz));
   }
   const removed=changedKeys??blocks.keys();
   for(const key of removed)if(!Object.hasOwn(next,key)){
    const block=blocks.get(key);
    if(!block)continue;
    chunks.get(block.chunk).members.delete(key);blocks.delete(key);needsFaces(block.cell);
   }
   const additions=changedKeys??Object.keys(next);
   for(const key of additions){
    const mask=next[key]?.mask,old=blocks.get(key);
    if(!mask)continue;
    if(old?.mask===mask)continue;
    const cell=old?.cell??key.split(',').map(Number),chunk=chunkKey(cell[0],cell[2]);
    const block={cell,chunk,mask,bits:BigInt('0x'+mask)};
    if(!chunks.has(chunk))chunks.set(chunk,{members:new Map(),mesh:null});
    chunks.get(chunk).members.set(key,block);blocks.set(key,block);needsFaces(cell);
   }
   for(const key of dirty){
    const chunk=chunks.get(key);
    if(!chunk)continue;
    removeMesh(chunk);
    if(!chunk.members.size){chunks.delete(key);continue;}
    const [cx,cz]=key.split(',').map(n=>Number(n)*TERRAIN_CHUNK_SIZE*8),span=TERRAIN_CHUNK_SIZE*8;
    const layer=rock&&(rock.layers??[rock]).find(r=>cx+span>=r.x0*2&&cx<=(r.x0+r.width)*2&&cz+span>=r.z0*2&&cz<=(r.z0+r.depth)*2),tint=layer?.tint;
    const geometry=exposedSoilGeometry(chunk,blocks,tint,layer?.surface);
    if(!geometry)continue;
    if(tint&&!layer?.surface&&!quarryMaterial)quarryMaterial=createConstructionEarthMaterial({color:material.color,vertexColors:true});
    if(layer?.surface&&!capMaterial)capMaterial=createConstructionEarthMaterial({vertexColors:true,naturalRock:true});
    chunk.mesh=new THREE.Mesh(geometry,layer?.surface?capMaterial:tint?quarryMaterial:material);
    chunk.mesh.name='construction-exposed-soil';
    chunk.mesh.receiveShadow=true;
    parent.add(chunk.mesh);uploads++;
   }
   lastBlocks=next;
  },
  get proof(){return {count:blocks.size,chunks:chunks.size,uploads,triangles:[...chunks.values()].reduce((n,c)=>n+(c.mesh?.geometry.index.count??0)/3,0)};},
  dispose(){if(disposed)return;disposed=true;for(const chunk of chunks.values())removeMesh(chunk);chunks.clear();blocks.clear();lastBlocks=null;quarryMaterial?.dispose();capMaterial?.dispose();quarryMaterial=capMaterial=null;},
 };
}

function buildSlopingRock(root,rock,material){
 const {surface}=rock,{coarse:at,bedAt,step,plots,originX,originZ}=surface,color=new THREE.Color();
 const endX=(rock.x0+rock.width)*2,endZ=(rock.z0+rock.depth)*2,tile=384;
 function patch(x0,x1,z0,z1,spacing){
  const cols=Math.ceil((x1-x0)/spacing)+1,rows=Math.ceil((z1-z0)/spacing)+1,count=cols*rows;
  const positions=new Array(count*3),normals=new Array(count*3),colors=new Array(count*3),faces=[];
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
   const x=Math.min(x1,x0+spacing*i),z=Math.min(z1,z0+spacing*j),a=j*cols+i,h=at(x,z),p=a*3;
   positions[p]=x;positions[p+1]=h;positions[p+2]=z;
   const dx=at(x-2,z)-at(x+2,z),dz=at(x,z-2)-at(x,z+2),length=Math.hypot(dx,4,dz);
   normals[p]=dx/length;normals[p+1]=4/length;normals[p+2]=dz/length;
   const tint=rock.tint(x,h,z);
   // Layering belongs on exposed rock. Dark bands across an uninterrupted
   // driving lane read as steps even when both axles are on the same grade.
   [colors[p],colors[p+1],colors[p+2]]=rockSurfaceColor(x,z,tint,color);
   if(i&&j){
    const nw=a-cols-1,ne=a-cols,sw=a-1;
    const bed=spacing===2?bedAt(x-1,z-1):-1;
    if(bed<0){
     const diagonal=positions[ne*3+1]>0||positions[sw*3+1]>0;
     if(diagonal||positions[nw*3+1]>0)faces.push(nw,sw,ne);
     if(diagonal||h>0)faces.push(ne,sw,a);
    }else{
     const quad=(p,q,r,t,n)=>{
      const k=positions.length/3;
      for(const v of [p,q,r,t]){positions.push(...v);normals.push(...n);colors.push(colors[a*3],colors[a*3+1],colors[a*3+2]);}
      faces.push(k,k+1,k+2,k,k+2,k+3);
     };
     const tile=[[x-2,bed,z-2],[x-2,bed,z],[x,bed,z],[x,bed,z-2]];
     quad(...tile,[0,1,0]);
     const neighbours=[[-3,-1],[-1,1],[1,-1],[-1,-3]];
     for(let edge=0;edge<4;edge++){
      const [dx,dz]=neighbours[edge],other=bedAt(x+dx,z+dz);
      if(other>=0&&other<=bed)continue;
      const p=tile[edge],q=tile[(edge+1)%4],ha=other>=0?other:at(p[0],p[2]),hb=other>=0?other:at(q[0],q[2]);
      const nx=(q[2]-p[2])/2,nz=(p[0]-q[0])/2;
      quad(q,p,[p[0],ha,p[2]],[q[0],hb,q[2]],[nx,0,nz]);
     }
    }
   }
  }
  if(!faces.length)return;
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geom.setIndex(faces);geom.computeBoundingSphere();
  const mesh=new THREE.Mesh(geom,material);mesh.receiveShadow=true;root.add(mesh);
 }
 for(let z=originZ;z<endZ;z+=tile)for(let x=originX;x<endX;x+=tile){
  const right=Math.min(endX,x+tile),far=Math.min(endZ,z+tile);
  const nearby=plots.filter(r=>r.minX<right&&r.maxX>x&&r.minZ<far&&r.maxZ>z);
  const cuts=(start,end,lo,hi)=>[start,...new Set(nearby.flatMap(r=>[r[lo],r[hi]]).filter(n=>n>start&&n<end).sort((a,b)=>a-b)),end];
  const xs=cuts(x,right,'minX','maxX'),zs=cuts(z,far,'minZ','maxZ');
  for(let j=1;j<zs.length;j++)for(let i=1;i<xs.length;i++){
   const detail=nearby.some(r=>xs[i-1]>=r.minX&&xs[i]<=r.maxX&&zs[j-1]>=r.minZ&&zs[j]<=r.maxZ);
   patch(xs[i-1],xs[i],zs[j-1],zs[j],detail?2:step);
  }
 }
 return root;
}
export function makeQuarryRockMesh(rock,{firstView=null}={}){
 const root=new THREE.Group(),color=new THREE.Color();
 const material=rock.surface?createConstructionEarthMaterial({vertexColors:true,naturalRock:true}):new THREE.MeshStandardMaterial({vertexColors:true,roughness:.96});
 root.name='construction-quarry-rock';root.userData.quarryMaterial=material;
 if(rock.surface)return buildSlopingRock(root,rock,material);
 const {x0,z0,width,depth,heights}=rock;
 const exactHeight=(i,j)=>i>=0&&j>=0&&i<width&&j<depth?heights[j*width+i]*2:0;
 const span=96,detail=[];
 const coarseCentre=(value,start,end)=>Math.min(end-2,start+5+Math.floor((value-start-1)/8)*8);
 function terrainTile(x1,x2,z1,z2,readHeight){
  // Greedy faces sample the same cell and its neighbours many times.
  // Cache this tile and its one-cell border before building either LOD.
  const stride=x2-x1+2,heights=new Uint16Array(stride*(z2-z1+2));
  for(let j=z1-1;j<=z2;j++)for(let i=x1-1;i<=x2;i++)heights[(j-z1+1)*stride+i-x1+1]=readHeight(i,j);
  const heightAt=(i,j)=>heights[(j-z1+1)*stride+i-x1+1];
  const positions=[],normals=[],colors=[],indices=[],covered=new Uint8Array(span*span);
  function face(a,b,c,d,axis,sign,tint){
   const first=positions.length/3;
   for(const p of [a,b,c,d]){
    positions.push(p[0],p[1],p[2]);
    normals.push(axis===0?sign:0,axis===1?sign:0,axis===2?sign:0);
    const band=Math.sin(p[1]*.27+p[0]*.017)+.38*Math.sin(p[1]*.72+p[2]*.051);
    color.setHSL(.082+band*.007,rock.range?.23:.16,.38+band*.03);
    colors.push(color.r*tint[0],color.g*tint[1],color.b*tint[2]);
   }
   indices.push(first,first+1,first+2,first,first+2,first+3);
  }
  const ground=(x,h,z)=>rock.range?rock.tint(x,h,z):[1,1,1];
  for(let j=z1;j<z2;j++)for(let i=x1;i<x2;i++){
   const h=heightAt(i,j);if(!h)continue;
   const x=(x0+i)*2,z=(z0+j)*2,k=(j-z1)*span+i-x1;
   if(!covered[k]){
    let end=i+1,rows=j+1;
    while(end<x2&&heightAt(end,j)===h&&!covered[k+end-i])end++;
    extend:while(rows<z2){
     const base=(rows-z1)*span-x1;
     for(let q=i;q<end;q++)if(heightAt(q,rows)!==h||covered[base+q])break extend;
     rows++;
    }
    for(let p=j;p<rows;p++)covered.fill(1,(p-z1)*span+i-x1,(p-z1)*span+end-x1);
    const right=(x0+end)*2,bottom=(z0+rows)*2;
    face([x,h,bottom],[right,h,bottom],[right,h,z],[x,h,z],1,1,ground((x+right)/2,h,(z+bottom)/2));
   }
   for(const dx of [-1,1]){
    const low=heightAt(i+dx,j);
    if(low>=h||j>z1&&heightAt(i,j-1)===h&&heightAt(i+dx,j-1)===low)continue;
    let n=j+1;while(n<z2&&heightAt(i,n)===h&&heightAt(i+dx,n)===low)n++;
    const edge=x+1+dx,end=(z0+n)*2,tint=ground(edge,(low+h)/2,(z+end)/2);
    if(dx<0)face([edge,low,z],[edge,low,end],[edge,h,end],[edge,h,z],0,-1,tint);
    else face([edge,low,end],[edge,low,z],[edge,h,z],[edge,h,end],0,1,tint);
   }
   for(const dz of [-1,1]){
    const low=heightAt(i,j+dz);
    if(low>=h||i>x1&&heightAt(i-1,j)===h&&heightAt(i-1,j+dz)===low)continue;
    let n=i+1;while(n<x2&&heightAt(n,j)===h&&heightAt(n,j+dz)===low)n++;
    const edge=z+1+dz,end=(x0+n)*2,tint=ground((x+end)/2,(low+h)/2,edge);
    if(dz<0)face([end,low,edge],[x,low,edge],[x,h,edge],[end,h,edge],2,-1,tint);
    else face([x,low,edge],[end,low,edge],[end,h,edge],[x,h,edge],2,1,tint);
   }
  }
  if(!indices.length)return null;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;
  return mesh;
 }
 for(let z1=0;z1<depth;z1+=span)for(let x1=0;x1<width;x1+=span){
  const x2=Math.min(x1+span,width),z2=Math.min(z1+span,depth);
  if(!rock.range){
   const mesh=terrainTile(x1,x2,z1,z2,exactHeight);
   if(mesh)root.add(mesh);
   continue;
  }
  // Both levels agree on every column along the shared edge, including the
  // vertical faces. Only the interior is reduced. Lighting and tint stay the
  // same as the exact mesh so the mountainside does not change colour in bands.
  const distantHeight=(i,j)=>{
   if(i<=x1||i>=x2-1||j<=z1||j>=z2-1)return exactHeight(i,j);
   return exactHeight(coarseCentre(i,x1,x2),coarseCentre(j,z1,z2));
  };
  const far=terrainTile(x1,x2,z1,z2,distantHeight);
  const exact=!firstView||!far?terrainTile(x1,x2,z1,z2,exactHeight):null;
  if(!far){if(exact)root.add(exact);continue;}
  const center=(exact??far).geometry.boundingSphere.center,lod=new THREE.LOD();
  lod.position.copy(center);far.position.copy(center).negate();
  lod.addLevel(far,750,.17);root.add(lod);
  const addDetail=()=>{
   const mesh=exact??terrainTile(x1,x2,z1,z2,exactHeight);
   if(mesh){mesh.position.copy(center).negate();lod.addLevel(mesh,0);mesh.visible=false;}
  };
  // Start with exactly the same distant geometry. Allocate full detail
  // just before the camera comes within the existing LOD transition.
  if(firstView&&Math.hypot(center.x-firstView.x,center.z-firstView.z)>930)detail.push({center,addDetail});
  else addDetail();
 }
 if(detail.length)root.userData.prepareDetail=eye=>{
  let nearest=-1,limit=930*930;
  for(let i=0;i<detail.length;i++){
   const {center}=detail[i],distance=(eye.x-center.x)**2+(eye.z-center.z)**2;
   if(distance<limit){nearest=i;limit=distance;}
  }
  if(nearest>=0)detail.splice(nearest,1)[0].addDetail();
 };
 return root;
}

// A pending hand/bucket source can appear or disappear without changing any
// terrain. Keep its small upload independent of the full field of soil.
export function createSoilRenderLayers(parent,geometry,material,{terrainBoxes,sourceBoxes,fieldSurface=false,progressiveQuarry=false}){
 const terrain=createSoilInstanceLayer(parent,geometry,material),source=createSoilInstanceLayer(parent,geometry,material);
 const surface=fieldSurface?createSoilSurfaceLayer(parent,material):null;
 let lastSoil=null,lastLoose=null,sourceKey=null;
 const rockMeshes=new Map();
 function syncRock(rock,firstView){
  const active=rock?(rock.layers??[rock]):[];
  for(const [old,mesh] of rockMeshes)if(!active.includes(old)){
   mesh.removeFromParent();mesh.traverse(o=>o.geometry?.dispose());mesh.userData.quarryMaterial.dispose();rockMeshes.delete(old);
  }
  for(const layer of active)if(!rockMeshes.has(layer)){const mesh=makeQuarryRockMesh(layer,{firstView:progressiveQuarry?firstView:null});parent.add(mesh);rockMeshes.set(layer,mesh);}
 }
 return {
  sync(frame,extra=[]){
   if(lastSoil!==frame.soil){
    if(surface){
     const rock=quarryRock(frame.soil);
     syncRock(rock,frame.player);
     surface.sync(frame.soil.blocks,rock,changedScoopSurfaceKeys(frame.soil,lastSoil));
     if(lastLoose!==frame.soil.loose){
      terrain.sync(soilTransportGeometry({blocks:{},loose:frame.soil.loose}));lastLoose=frame.soil.loose;
     }
    }else terrain.sync(terrainBoxes(frame.soil));
    lastSoil=frame.soil;
   }
   const visible=sourceBoxes(frame,extra),key=visible.map(b=>b.position.join(',')+'/'+b.size).join('|');
   if(key!==sourceKey){source.sync(visible);sourceKey=key;}
  },
  prepareRockDetail(eye){for(const mesh of rockMeshes.values())mesh.userData.prepareDetail?.(eye);},
  get proof(){return {terrain:surface?.proof??terrain.proof,source:source.proof};},
  dispose(){terrain.dispose();surface?.dispose();source.dispose();syncRock(null);lastSoil=lastLoose=null;sourceKey=null;},
 };
}
