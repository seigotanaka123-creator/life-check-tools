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

const SKY_RACE_PATH = [
 // Z from the old shore, X centre, half-width of the solid cloud.
 [0, -330, 48], [44, -338, 37], [96, -358, 30], [151, -387, 32],
 [190, -413, 38], [218, -434, 46], [238, -440, 68], [264, -439, 94],
 [294, -428, 108], [326, -418, 94], [352, -409, 66], [373, -401, 34], [383, -399, 0],
];
const SKY_RACE_PATH_END = SKY_RACE_PATH.at(-1)[0];

export function skyRaceEntryZ({depth}) {
 return depth / 2 + 218;
}

function racePathSection(distance) {
 const index = SKY_RACE_PATH.findIndex(([z]) => z >= distance);
 if (index < 1) return SKY_RACE_PATH[index];
 const [start, x, half] = SKY_RACE_PATH[index - 1];
 const [end, endX, endHalf] = SKY_RACE_PATH[index];
 const t = (distance - start) / (end - start);
 const ease = t * t * (3 - 2 * t);
 return [distance, T.MathUtils.lerp(x, endX, t), T.MathUtils.lerp(half, endHalf, ease)];
}

export function skyRaceShoreContains({depth}, x, z, margin = 0) {
 const distance = z - depth / 2;
 if (!Number.isFinite(x) || !Number.isFinite(z) || distance < -margin) return false;
 for (const offset of [-margin, margin]) {
  const section = racePathSection(Math.max(0, distance + offset));
  if (!section || Math.abs(x - section[1]) + margin > section[2]) return false;
 }
 return true;
}

function createRaceApproach(world) {
 const shore = world.depth / 2;
 const entry = skyRaceEntryZ(world);
 const rows = Math.ceil(SKY_RACE_PATH_END / 3);
 const positions = [], shades = [], indices = [];
 const shade = new T.Color();
 const white = new T.Color(0xf4fbff), blue = new T.Color(0xb3d8f2);
 const teal = new T.Color(0x91ddda), deep = new T.Color(0x7eafcb);
 for (let row = 0; row <= rows; row++) {
  const distance = SKY_RACE_PATH_END * row / rows;
  const [, x, half] = racePathSection(distance);
  const z = shore + distance;
  const island = T.MathUtils.smoothstep(z, entry - 4, entry + 51);
  for (let layer = 0; layer < 4; layer++) {
   const radius = half * [1, 1, .92, .52][layer];
   const depth = Math.min(half * .53, 12 + 32 * island);
   const y = -depth * [0, .26, .59, 1][layer];
   for (const side of [-1, 1]) {
    positions.push(x + radius * side, y, z);
    shade.copy(white).lerp(blue, layer / 3).lerp(layer < 1 ? teal : deep, island * .76);
    shades.push(shade.r, shade.g, shade.b);
   }
  }
  if (row === 0) continue;
  const a = (row - 1) * 8, b = row * 8;
  indices.push(a, b, a+1, a+1, b, b+1);
  for (let layer = 0; layer < 3; layer++) {
   const j = 2 * layer;
   indices.push(a+j, a+j+2, b+j, b+j, a+j+2, b+j+2);
   indices.push(a+j+1, b+j+1, a+j+3, b+j+1, b+j+3, a+j+3);
  }
  indices.push(a+6, a+7, b+6, a+7, b+7, b+6);
 }
 const geometry = new T.BufferGeometry();
 geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
 geometry.setAttribute('color', new T.Float32BufferAttribute(shades, 3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 const material = new T.MeshStandardMaterial({
  vertexColors:true, roughness:.96, fog:false, emissive:0x296382, emissiveIntensity:.09,
 });
 const mesh = new T.Mesh(geometry, material);
 mesh.name = 'sky-race-approach-floor';
 mesh.receiveShadow = true;
 return {mesh, dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}};
}

// Cloud terraces trace the forks in the course. The shore itself remains
// connected to the main island up to the outlook, with a clear gap beyond.
function createRaceShoreScenery(world) {
 const scenery = new T.Group();
 scenery.name = 'sky-race-cloud-terraces';
 scenery.position.z = world.depth / 2 - 400 + 255;
 const cloudGeometry = new T.LatheGeometry([
  [0, -1], [.45, -1], [.77, -.84], [.96, -.61], [1, -.32],
  [.96, -.14], [.84, -.025], [.65, 0], [0, 0],
 ].map(([radius, y]) => new T.Vector2(radius, y)), 56);
 const vertices = cloudGeometry.getAttribute("position");
 const vertexColors = [];
 const shade = new T.Color(), crest = new T.Color(0xf6fcff), base = new T.Color(0xa0bedb);
 for (let i = 0; i < vertices.count; i++) {
  const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
  const angle = Math.atan2(z, x);
  const scallop = 1 + Math.cos(angle * 7 + .5) * .042 + Math.sin(angle * 4) * .023;
  vertices.setXYZ(i, x * scallop, y, z * scallop);
  shade.copy(crest).lerp(base, Math.min(1, -y) ** .82);
  vertexColors.push(shade.r, shade.g, shade.b);
 }
 cloudGeometry.setAttribute("color", new T.Float32BufferAttribute(vertexColors, 3));
 cloudGeometry.computeVertexNormals();
 const puffGeometry = new T.SphereGeometry(1, 18, 12);
 const ringGeometry = new T.RingGeometry(14.2, 17.4, 48);
 const diskGeometry = new T.CircleGeometry(14.2, 48);
 const courseMaterial = new T.MeshStandardMaterial({vertexColors:true,fog:false,roughness:.94,emissive:0x5185a6,emissiveIntensity:.14});
 const puffMaterial = new T.MeshStandardMaterial({color:0xdcecff,fog:false,roughness:1,emissive:0x44738e,emissiveIntensity:.1});
 const ringMaterial = new T.MeshStandardMaterial({color:0xf5dda3,fog:false,roughness:.45,metalness:.1,side:T.DoubleSide});
 const diskMaterial = new T.MeshStandardMaterial({color:0x66c6b8,fog:false,roughness:.74,side:T.DoubleSide});
 const ledges = [
  {x:-439,z:662,y:18,width:81,depth:55,thick:43,spring:true},
  {x:-535,z:791,y:66,width:66,depth:45,thick:45},
  {x:-339,z:785,y:45,width:74,depth:58,thick:45,spring:true},
  {x:-439,z:933,y:98,width:100,depth:53,thick:54,spring:true},
  {x:-554,z:1063,y:148,width:67,depth:53,thick:48},
  {x:-333,z:1052,y:125,width:69,depth:46,thick:45},
  {x:-453,z:1195,y:176,width:94,depth:57,thick:54,spring:true},
 ];
 const billows = new T.InstancedMesh(puffGeometry, puffMaterial, ledges.length * 7);
 const transform = new T.Object3D();
 let puffIndex = 0;
 for (const {x,z,y,width,depth,thick,spring} of ledges) {
  const top = new T.Mesh(cloudGeometry, courseMaterial);
  top.scale.set(width, thick, depth);
  top.position.set(x, y, z);
  scenery.add(top);
  for (let i = 0; i < 7; i++) {
   const angle = i / 7 * Math.PI * 2;
   const r = 15 + 5 * Math.sin(i * 2.7 + z);
   transform.position.set(x + Math.cos(angle) * width * .80, y - thick * .51, z + Math.sin(angle) * depth * .79);
   transform.scale.set(r * 1.35, r * .87, r);
   transform.updateMatrix();
   billows.setMatrixAt(puffIndex++, transform.matrix);
  }
  if (spring) {
   for (const [geometry, material] of [[diskGeometry,diskMaterial],[ringGeometry,ringMaterial]]) {
    const mark = new T.Mesh(geometry, material);
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(x, y + .3, z);
    scenery.add(mark);
   }
  }
 }
 scenery.add(billows);

 const wind = new T.Group();
 wind.name = 'sky-race-wind-currents';
 const windMaterial = new T.MeshBasicMaterial({color:0xb3f4ff,fog:false,transparent:true,opacity:.6,depthWrite:false});
 const windLines = [];
 const windRoutes = [
  [-438,372,8,-443,574,28],[-402,470,19,-490,613,43],
  [-497,639,38,-551,747,76],[-369,635,34,-350,739,60],
  [-452,825,71,-455,901,116],[-547,937,101,-568,1027,166],
  [-350,940,90,-337,1013,147],
 ];
 for (const [x,z,y,endX,endZ,endY] of windRoutes) {
  const curves = [];
  for (let i = 0; i < 3; i++) {
   const offset = (i - 1) * 6;
   const curve = new T.CatmullRomCurve3([
    new T.Vector3(x + offset, y + offset * .24, z),
    new T.Vector3((x + endX) / 2 + 19 + offset, (y + endY) / 2, (z + endZ) / 2),
    new T.Vector3(endX + offset, endY, endZ),
   ]);
   const geometry = new T.TubeGeometry(curve, 28, i === 1 ? .53 : .29, 5, false);
   curves.push(new T.Mesh(geometry, windMaterial));
   windLines.push(geometry);
  }
  wind.add(...curves);
 }
 scenery.add(wind);
 return {
  group:scenery,
  update(time) {
   wind.position.x = Math.sin(time * 1.35) * 3.5;
   windMaterial.opacity = .58 + Math.sin(time * 1.7) * .095;
  },
  dispose() {
   scenery.removeFromParent();
   billows.dispose();
   for (const geometry of [cloudGeometry,puffGeometry,ringGeometry,diskGeometry,...windLines]) geometry.dispose();
   for (const material of [courseMaterial,puffMaterial,diskMaterial,ringMaterial,windMaterial]) material.dispose();
  },
 };
}

export function createSkyCloudGround(world,{map=null,raceShore=false}={}){
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
 // Leave the mouth of the cloud bridge open at the old rim.
 const oldShore = world.depth / 2;
 const [, bridgeX, bridgeHalf] = racePathSection(42);
 const rimLobes = raceShore ? lobes.filter(p => p.z !== oldShore
  || Math.abs(p.x - bridgeX) >= bridgeHalf + p.r * .86) : lobes;
 const puffMeshes=new T.InstancedMesh(puffGeometry,puffMaterial,rimLobes.length),matrix=new T.Matrix4(),quaternion=new T.Quaternion(),position=new T.Vector3(),scale=new T.Vector3();puffMeshes.name='cloud-rim-billows';puffMeshes.receiveShadow=true;
 rimLobes.forEach((p,i)=>{
  const alongZ=Math.abs(p.z)===world.depth/2,ry=29+12*Math.sin(i*1.8)**2;
  position.set(p.x,-ry*.7,p.z);scale.set(alongZ?p.r*.9:42,ry,alongZ?42:p.r*.9);
  if(alongZ)position.z+=Math.sign(p.z)*42;else position.x+=Math.sign(p.x)*42;
  matrix.compose(position,quaternion,scale);puffMeshes.setMatrixAt(i,matrix);
 });
 group.add(puffMeshes);
 const raceApproach = raceShore ? createRaceApproach(world) : null;
 const raceScenery = raceShore ? createRaceShoreScenery(world) : null;
 if (raceApproach) group.add(raceApproach.mesh, raceScenery.group);
 let disposed=false;
 return {group,updateRaceShore(time){raceScenery?.update(time);},dispose(){if(disposed)return;disposed=true;raceApproach?.dispose();raceScenery?.dispose();group.removeFromParent();geometry.dispose();material.dispose();ownTexture?.dispose();puffGeometry.dispose();puffMaterial.dispose();puffMeshes.dispose();}};
}
