import * as T from './three.module.min.js';

let cloudCanvas=null;
function cloudFloorTexture(){
 if(!cloudCanvas){
  const c=document.createElement('canvas');c.width=1024;c.height=768;const ctx=c.getContext('2d');
  ctx.fillStyle='#f5faff';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<110;i++){
   const x=(i*137.31)%1024,y=(i*219.71)%768,r=58+(i*31)%71;
   const shade=ctx.createRadialGradient(x,y+12,r*.2,x,y+12,r);
   shade.addColorStop(0,'rgba(154,184,207,.25)');shade.addColorStop(1,'rgba(154,184,207,0)');ctx.fillStyle=shade;ctx.fillRect(x-r,y+12-r,r*2,r*2);
   const puff=ctx.createRadialGradient(x-8,y-10,0,x-8,y-10,r*.85);
   puff.addColorStop(0,'rgba(255,255,255,.95)');puff.addColorStop(.55,'rgba(255,255,255,.65)');puff.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=puff;ctx.fillRect(x-r-8,y-r-10,r*2,r*2);
  }
  cloudCanvas=c;
 }
 const texture=new T.CanvasTexture(cloudCanvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}

// Cloud lobes grow outwards from the original walkable rectangle. All existing
// saved positions, rails, floors, buildings and UFO departure limits stay put.
export function skyCloudLobes({width,depth}){
 const lobes=[];
 for(const side of [-1,1]){
  const nx=Math.ceil(width/72),nz=Math.ceil(depth/72);
  for(let i=0;i<=nx;i++)lobes.push({x:-width/2+width*i/nx,z:side*depth/2,r:64+15*Math.sin(i*2.1+side)**2});
  for(let i=1;i<nz;i++)lobes.push({x:side*width/2,z:-depth/2+depth*i/nz,r:66+17*Math.cos(i*1.7+side)**2});
 }
 return lobes;
}

export function skyCloudRadius(angle,{width,depth},lobes=skyCloudLobes({width,depth})){
 const x=Math.cos(angle),z=Math.sin(angle);
 const core=Math.min(width/2/Math.max(1e-12,Math.abs(x)),depth/2/Math.max(1e-12,Math.abs(z)));
 let outer=core;
 for(const p of lobes){
  const dot=x*p.x+z*p.z,disc=p.r*p.r-(p.x*p.x+p.z*p.z-dot*dot);
  if(disc>=0)outer=Math.max(outer,dot+Math.sqrt(disc));
 }
 return {core,outer};
}

export function createSkyCloudGround(world,{map=null}={}){
 const group=new T.Group();group.name='sky-cloud-island';
 const lobes=skyCloudLobes(world),angles=new Set();
 for(let i=0;i<512;i++)angles.add(i*Math.PI*2/512);
 // Exact corner rays retain every point of the old rectangular walking floor.
 for(const x of [-1,1])for(const z of [-1,1])angles.add((Math.atan2(z*world.depth,x*world.width)+Math.PI*2)%(Math.PI*2));
 const rays=[...angles].sort((a,b)=>a-b).map(a=>({a,...skyCloudRadius(a,world,lobes)})),n=rays.length;
 const profiles=[['core',.35,0],['core',.75,0],['core',1,0],['edge',.35,-2],['edge',.65,-8],['edge',.85,-17],['edge',1,-30],['bottom',.98,-48],['bottom',.86,-76],['bottom',.6,-96]];
 const positions=[0,0,0],uvs=[.5,.5],colors=[1,1,1],indices=[];
 const underside=new T.Color(0xd3e4ee),white=new T.Color(0xffffff);
 for(const [kind,t,y] of profiles)for(const p of rays){
  const radius=kind==='core'?p.core*t:kind==='edge'?p.core+(p.outer-p.core)*t:p.outer*t;
  const x=Math.cos(p.a)*radius,z=Math.sin(p.a)*radius;
  positions.push(x,y,z);uvs.push(x/world.width+.5,.5-z/world.depth);
  const c=white.clone().lerp(underside,Math.min(1,-y/110));colors.push(c.r,c.g,c.b);
 }
 for(let i=0;i<n;i++)indices.push(0,1+(i+1)%n,1+i);
 for(let row=0;row<profiles.length-1;row++)for(let i=0;i<n;i++){
  const a=1+row*n+i,b=1+row*n+(i+1)%n,c=a+n,d=b+n;
  indices.push(a,b,c,b,d,c);
 }
 const bottom=positions.length/3;positions.push(0,-108,0);uvs.push(.5,.5);colors.push(underside.r,underside.g,underside.b);
 for(let i=0;i<n;i++)indices.push(bottom,1+(profiles.length-1)*n+i,1+(profiles.length-1)*n+(i+1)%n);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const ownTexture=map?null:cloudFloorTexture();
 const material=new T.MeshStandardMaterial({color:0xffffff,map:map||ownTexture,vertexColors:true,roughness:1,metalness:0,emissive:0xffffff,emissiveIntensity:.08});
 const mesh=new T.Mesh(geometry,material);mesh.name='soft-cloud-ground';mesh.receiveShadow=true;group.add(mesh);
 // Visible billows sit entirely outside the original walking rectangle.
 // One instanced draw keeps the rim light, with no floating walking surfaces.
 const puffGeometry=new T.SphereGeometry(1,18,12),puffMaterial=new T.MeshStandardMaterial({color:0xf7fbff,roughness:1,metalness:0,emissive:0xe3f2ff,emissiveIntensity:.12});
 const puffMeshes=new T.InstancedMesh(puffGeometry,puffMaterial,lobes.length),matrix=new T.Matrix4(),quaternion=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();puffMeshes.name='cloud-rim-billows';puffMeshes.receiveShadow=true;
 lobes.forEach((p,i)=>{
  const alongZ=Math.abs(p.z)===world.depth/2,ry=29+12*Math.sin(i*1.8)**2;
  position.set(p.x,-ry*.7,p.z);scale.set(alongZ?p.r*.9:42,ry,alongZ?42:p.r*.9);
  if(alongZ)position.z+=Math.sign(p.z)*42;else position.x+=Math.sign(p.x)*42;
  matrix.compose(position,quaternion,scale);puffMeshes.setMatrixAt(i,matrix);
 });
 group.add(puffMeshes);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();material.dispose();ownTexture?.dispose();puffGeometry.dispose();puffMaterial.dispose();puffMeshes.dispose();}};
}
