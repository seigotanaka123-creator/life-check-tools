import * as T from './three.module.min.js';
import {eveningLight,createLightHalos,createLightPools} from './imasora-evening-light.mjs?v=120mx';

// Scenery outside the existing playable rectangle: never replaces saved soil,
// holes, vehicle supports, buildings, or the town bridge's creek and landing.
export function constructionSurroundingHeight(x,z,width=5400,depth=3600){
 const outside=Math.max(Math.abs(x)-width/2,Math.abs(z)-depth/2);
 if(outside<2)return null;
 // Existing town houses/road/water have their own real authored ground.
 if(z<=-1798&&z>=-2700&&Math.abs(x+1150)<=850)return -4;
 const inland=T.MathUtils.smoothstep(outside,180,1250);
 return -2+inland*(36+24*Math.sin(x*.0017)*Math.cos(z*.0021))+T.MathUtils.smoothstep(outside,1400,3500)*(100+90*Math.sin(x*.0008+z*.0007)**2);
}

export function createConstructionSurroundings(config){
 const group=new T.Group();group.name='construction-industrial-landscape';
 group.userData.nonCollidable=true;
 const w=config.world.width/2,d=config.world.depth/2;
 const geometries=new Set(),materials=new Set(),meshes=[],batches=new Map(),lamps=[],roadPools=[];
 const own=g=>(geometries.add(g),g),material=p=>{const m=new T.MeshStandardMaterial(p);materials.add(m);return m;};
 const stone=material({color:0x89978e,roughness:1,vertexColors:true});
 const metal=material({color:0xffffff,roughness:.47,metalness:.38,vertexColors:true,emissive:0x63838f,emissiveIntensity:0});
 const steel=material({color:0xffffff,roughness:.67,metalness:.25,vertexColors:true,emissive:0x2c505c,emissiveIntensity:0});
 const neon=new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,toneMapped:false});materials.add(neon);
 // Basic material uses per-instance colours for lamp cores without adding lights.
 const cores=new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,toneMapped:false});materials.add(cores);
 const wash=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,uniforms:{strength:{value:0}},
  vertexShader:'varying vec2 p;varying vec3 tint;void main(){p=uv;tint=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float strength;varying vec2 p;varying vec3 tint;void main(){float fade=pow(1.-p.y,1.6)*smoothstep(0.,.1,p.y);gl_FragColor=vec4(tint,fade*strength*.68);\n#include <colorspace_fragment>\n}'});materials.add(wash);
 const box=own(new T.BoxGeometry(1,1,1)),cylinder=own(new T.CylinderGeometry(1,1,1,12)),washShell=own(new T.CylinderGeometry(1,1,1,12,1,true)),rod=own(new T.CylinderGeometry(1,1,1,5,1,true)),sphere=own(new T.SphereGeometry(1,12,8)),ring=own(new T.TorusGeometry(1,.025,3,12));
 for(const geometry of[box,cylinder,rod,sphere,ring])geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));
 const matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0),v=new T.Vector3(),scale=new T.Vector3(),color=new T.Color();
 function add(g,m,x,y,z,sx,sy,sz,tint,rotation=null){
  const key=g.uuid+'/'+m.uuid;if(!batches.has(key))batches.set(key,{g,m,rows:[]});
  matrix.compose(v.set(x,y,z),rotation??q.identity(),scale.set(sx,sy,sz));
  batches.get(key).rows.push({matrix:matrix.clone(),tint});
 }
 const cube=(m,x,y,z,sx,sy,sz,tint)=>add(box,m,x,y,z,sx,sy,sz,tint);
 function pipe(a,b,r=2,tint=0xa3b5bd,m=steel){
  const delta=new T.Vector3().subVectors(b,a),len=delta.length();
  if(len<.001)return;
  const rot=new T.Quaternion().setFromUnitVectors(up,delta.divideScalar(len));
  add(rod,m,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,r,len,r,tint,rot);
 }
 const P=(x,y,z)=>new T.Vector3(x,y,z);
 function lamp(x,y,z,tint=0xc3f5ff,size=26){cube(cores,x,y,z,4,3,4,tint);lamps.push({x,y,z,color:tint,size:size*1.45});}
 function outline(x,y,z,hx,hz,tint=0xbcd8d9,r=1.15,m=steel){
  pipe(P(x-hx,y,z-hz),P(x+hx,y,z-hz),r,tint,m);pipe(P(x-hx,y,z+hz),P(x+hx,y,z+hz),r,tint,m);
  pipe(P(x-hx,y,z-hz),P(x-hx,y,z+hz),r,tint,m);pipe(P(x+hx,y,z-hz),P(x+hx,y,z+hz),r,tint,m);
 }
 // Four subdivided strips, with a real open centre, meet just beyond the old
 // rim. A continuous inland apron replaces the exposed floating slab silhouette.
 const strips=[[-16000,-w-2,-16000,16000],[w+2,16000,-16000,16000],[-w-2,w+2,-16000,-d-2],[-w-2,w+2,d+2,16000]];
 const terrainPositions=[],terrainColors=[],terrainIndices=[];
 for(const[x0,x1,z0,z1]of strips){
  const axis=(a,b,extra)=>[...new Set([a,b,...Array.from({length:Math.ceil((b-a)/500)-1},(_,i)=>a+(b-a)*(i+1)/Math.ceil((b-a)/500)),...extra.filter(n=>n>a&&n<b)])].sort((a,b)=>a-b);
  const xs=axis(x0,x1,[-2000,-300]),zs=axis(z0,z1,[-2700,-1853,-1798]),nx=xs.length-1,nz=zs.length-1,base=terrainPositions.length/3;
  for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){
   const x=xs[ix],z=zs[iz];
   // Leave the existing creek exposed; its water is at -0.8.
   const creek=z>=-1853&&z<=-1798&&Math.abs(x+1150)<820;
   const y=creek?-4:constructionSurroundingHeight(x,z,w*2,d*2);
   terrainPositions.push(x,y??-2,z);
   const outer=T.MathUtils.smoothstep(Math.max(Math.abs(x)-w,Math.abs(z)-d),40,900);
   color.set(0xb7986c).lerp(new T.Color(0x5e7862),outer).multiplyScalar(.94+.07*Math.sin(x*.009)*Math.cos(z*.007));terrainColors.push(color.r,color.g,color.b);
  }
  for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const a=base+iz*(nx+1)+ix;terrainIndices.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);}
 }
 const terrain=own(new T.BufferGeometry());terrain.setAttribute('position',new T.Float32BufferAttribute(terrainPositions,3));terrain.setAttribute('color',new T.Float32BufferAttribute(terrainColors,3));terrain.setIndex(terrainIndices);terrain.computeVertexNormals();
 const land=new T.Mesh(terrain,stone);land.name='continuous-outside-land';group.add(land);meshes.push(land);

 // Road, a low retaining edge and lamps visibly mark the edge without erecting
 // scenery inside any buildable position. North-west remains the town skyline.
 for(const side of[-1,1]){
  cube(steel,side*(w+58),-.9,0,108,2,d*2,0x535f66);
  cube(stone,side*(w+5),-1,0,4,2,d*2,0xb9b5a5);
  if(side>0)cube(steel,0,-.9,side*(d+58),w*2,2,108,0x535f66);
 }
 // Keep the creek and town approach open rather than laying a road across them.
 // The north road stops on either side of that visible waterway.
 for(const[x,len]of[[-2440,520],[1000,3400]])cube(steel,x,-.9,-(d+58),len,2,108,0x535f66);
 for(let side=0;side<4;side++)for(let i=-4;i<=4;i++){
  const x=side<2?(side===0?-w-116:w+116):i*w/4.5,z=side<2?i*d/4.5:(side===2?-d-116:d+116);
  if(side===2&&Math.abs(x+1150)<850)continue;
  pipe(P(x,-2,z),P(x,44,z),1.7,0x84999e);cube(metal,x,44,z,18,2,10,0xdae0d9);lamp(x,42,z,0xffd89d,42);
  roadPools.push({x:side<2?Math.sign(x)*(w+57):x,z:side<2?z:Math.sign(z)*(d+57),radius:44});
 }

 function refinery(cx,cz,seed){
  const baseY=constructionSurroundingHeight(cx,cz,w*2,d*2)??-2;
  const y0=baseY+2;
  cube(stone,cx,baseY-3,cz,780,8,600,0xa0aaa4);
  // Different height columns, exposed catwalks and bracing give a detailed
  // industrial silhouette, rather than glowing featureless boxes.
  for(let i=0;i<5;i++){
   const x=cx-250+i*118,z=cz+(i%2?54:-52),h=150+((i*73+seed*41)%220),r=17+(i%3)*6;
   add(cylinder,metal,x,y0+h/2,z,r,h,r,[0xb1c5c6,0xc4c5af,0xadc4cb][i%3]);
   add(sphere,metal,x,y0+h,z,r,r*.5,r,0xc3d3d5);
   const tint=[0x79e7dc,0xf3ba8f,0xb3dfff][i%3];
   add(washShell,wash,x,y0+h/2,z,r+1.3,h,r+1.3,tint);
   // Narrow lit seams and exposed return pipes catch the same colour as each
   // tower's lamps. All are actual 3D parts, visible from either side.
   for(let j=0;j<3;j++){
    const angle=j*Math.PI*2/3+.35,dx=Math.cos(angle)*(r+1),dz=Math.sin(angle)*(r+1),top=h*(.66+j*.12);
    pipe(P(x+dx,y0+8,z+dz),P(x+dx,y0+top,z+dz),1.2,tint,neon);
    const px=x+dx*1.7,pz=z+dz*1.7;
    pipe(P(px,y0+5,pz),P(px,y0+top,pz),2.1,0xc6c1ad,metal);
    pipe(P(px,y0+top,pz),P(x+dx,y0+top,z+dz),2.1,0xc6c1ad,metal);
    for(let y=20;y<top;y+=42)add(ring,steel,px,y0+y,pz,3.3,3.3,3.3,0xa3b4b5,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
   }
   for(let level=42;level<h-10;level+=52){
    add(ring,steel,x,y0+level,z,r+5,r+5,r+5,0x9db7bc,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
    cube(steel,x,y0+level,z,(r+13)*2,2,(r+13)*2,0x718b95);
    outline(x,y0+level+10,z,r+13,r+13);
    outline(x,y0+level+.9,z,r+12,r+12,tint,.75,neon);
    for(const dx of[-r-13,r+13])for(const dz of[-r-13,r+13])pipe(P(x+dx,y0+Math.max(0,level-52),z+dz),P(x+dx,y0+level+12,z+dz),1.2);
    for(const dz of[-r-13,r+13])pipe(P(x-r-13,y0+level-39,z+dz),P(x+r+13,y0+level,z+dz),.85,0x99b7bb);
    for(const dx of[-r-13,0,r+13])for(const dz of[-r-13,r+13])pipe(P(x+dx,y0+level,z+dz),P(x+dx,y0+level+10,z+dz),.7);
    lamp(x-r-12,y0+level+6,z-r-12,tint,29);lamp(x+r+12,y0+level+6,z+r+12,0xd9edff,22);
   }
   const ox=x+r+16;
   pipe(P(ox,y0, z),P(ox,y0+h*.82,z),3.5,0x8caaa9,metal);
   pipe(P(ox,y0+h*.82,z),P(x,y0+h*.82,z),3.5,0x8caaa9,metal);
   for(let k=12;k<h;k+=14)cube(steel,x-r-17,y0+k,z,2,1.2,10,0xb0c2c6);
   lamp(x,y0+h+3,z,0xff9f92,30);
  }
  // Pipe rack joins the structures and creates human-scale repeating detail.
  for(let j=0;j<4;j++)pipe(P(cx-320,y0+22+j*9,cz+148),P(cx+320,y0+22+j*9,cz+148),3.5,[0xc4d5d5,0x93bcb7,0xd5bd9a,0xa4c0d3][j],metal);
  for(let x=cx-300;x<=cx+300;x+=75){for(const dz of[130,167])pipe(P(x,y0,cz+dz),P(x,y0+62,cz+dz),2);pipe(P(x,y0+60,cz+128),P(x,y0+60,cz+169),2);lamp(x,y0+62,cz+149,0x91e8e0,25);}
  // Cylindrical storage tanks, not solid monolithic blocks.
  for(let i=0;i<3;i++){
   const x=cx-205+i*200,z=cz-180,r=48+i*5,h=48+(i%2)*25;
   add(cylinder,metal,x,y0+h/2,z,r,h,r,0xb9cbcb);add(sphere,metal,x,y0+h,z,r,12,r,0xc7d4ce);
   add(washShell,wash,x,y0+h/2,z,r+1.3,h,r+1.3,i%2?0xffc080:0x6be4d9);
   outline(x,y0+h+8,z,r*.65,r*.65,0xcbd4cc);
   for(let j=0;j<2;j++)add(ring,neon,x,y0+9+j*29,z,r+.5,r+.5,r+.5,j?0xc5e5fa:0x82d6c6,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
   lamp(x,y0+h+9,z-r*.65,0xffdba8,35);
  }
  // A taller lattice tower and ribbed service buildings.
  const tx=cx+330,tz=cz-110,h=320+seed*17;
  for(const dx of[-24,24])for(const dz of[-24,24])pipe(P(tx+dx,y0,tz+dz),P(tx+dx,y0+h,tz+dz),3,0x7b939e);
  for(let y=0;y<h;y+=40){outline(tx,y0+y,tz,25,25);for(const dz of[-24,24]){pipe(P(tx-24,y0+y,tz+dz),P(tx+24,y0+Math.min(h,y+40),tz+dz),1.3);pipe(P(tx+24,y0+y,tz+dz),P(tx-24,y0+Math.min(h,y+40),tz+dz),1.3);}lamp(tx-25,y0+y,tz-25,0xb2dfff,29);}
  lamp(tx,y0+h,tz,0xffaa92,38);
  // Slim banded chimney sits behind the plant; no fire, smoke or play hazard.
  const sx=cx-345,sz=cz-205,sh=390+(seed%3)*40;
  for(let j=0;j<8;j++)add(cylinder,metal,sx,y0+(j+.5)*sh/8,sz,10,sh/8,10,j%2?0xc1d0cc:0x986952);
  lamp(sx,y0+sh,sz,0xff8174,36);
  for(let i=0;i<2;i++){
   const x=cx-170+i*300,z=cz+235;
   cube(steel,x,y0+24,z,230,48,80,0x80999d);cube(metal,x,y0+50,z,240,6,92,0xb5c5c5);
   for(let k=-4;k<=4;k++){cube(neon,x+k*23,y0+26,z-40.5,13,15,1,0xffd2a1);cube(steel,x+k*23,y0+26,z-41,1,48,2,0x9fb2b1);}
  }
 }
 // Broad industrial skyline on three sides; the established bridge/town view
 // occupies the north-west and is not covered with new structures.
 refinery(-w-535,-650,1);refinery(w+535,-650,2);refinery(w+540,680,3);
 refinery(-w-530,760,4);refinery(-900,d+535,5);refinery(650,d+535,6);refinery(1600,-d-540,7);

 // A low, irregular green belt between the road and industry, rooted in land.
 for(let i=0;i<70;i++){
  const a=i*Math.PI*2/70,x=Math.cos(a)*(w+250),z=Math.sin(a)*(d+230);
  if(Math.abs(x)<w+140&&Math.abs(z)<d+140)continue;
  if(z<-d&&x<-300)continue;
  const y=constructionSurroundingHeight(x,z,w*2,d*2)??-2;
  add(sphere,stone,x,y+9,z,24+(i%4)*9,13+(i%3)*4,23,0x52765f);
 }
 for(const{g,m,rows}of batches.values()){
  const mesh=new T.InstancedMesh(g,m,rows.length);rows.forEach((r,i)=>{mesh.setMatrixAt(i,r.matrix);mesh.setColorAt(i,color.set(r.tint));});
  mesh.name=m===cores?'industrial-lamp-cores':m===neon?'industrial-light-lines':'industrial-structure';mesh.computeBoundingSphere();group.add(mesh);meshes.push(mesh);
 }
 const halos=createLightHalos(group,lamps.length);halos.set(lamps);
 const pools=createLightPools(group,roadPools,()=>.1);
 let last=-Infinity,disposed=false;
 function update(date=new Date()){
  if(disposed||Math.abs(+date-last)<10000)return;last=+date;
  const strength=eveningLight(date).strength;
  neon.color.setScalar(.3+strength*1.5);metal.emissiveIntensity=strength*.55;steel.emissiveIntensity=strength*.34;
  // Colored light lines and cores retain their hues rather than becoming white.
  cores.color.setScalar(.16+strength*.84);halos.strength(strength*2.);
  wash.uniforms.strength.value=strength;pools.strength(strength);for(const mesh of meshes)if(mesh.material===wash)mesh.visible=strength>0;
 }
 update();
 return{group,update,stats:{draws:meshes.length+2,lamps:lamps.length,lights:0,triangles:meshes.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3*(m.count??1),0)+roadPools.length*128+lamps.length*2},
  dispose(){if(disposed)return;disposed=true;halos.dispose();pools.dispose();for(const m of meshes)if(m.isInstancedMesh)m.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
