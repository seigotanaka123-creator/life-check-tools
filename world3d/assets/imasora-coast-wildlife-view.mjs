import * as T from './three.module.min.js';
import {createCoastEncounters,coastEncounterPoint,coastWhalePresentation} from './imasora-coast-encounters.mjs?v=120oe';
import {coastHeight,COAST_WATER_Y} from './imasora-coast-layout.mjs?v=120mx';
import {coastWave,COAST_WAVE_GLSL} from './imasora-coast-waves.mjs?v=120mx';

// One encounter at a time. Geometry/materials are allocated once, with no
// shadows, new lights, textures, colliders, menus or per-frame DOM writes.
export function createCoastWildlife({uniforms,random=Math.random,ground=coastHeight}={}){
 const root=new T.Group();root.name='航海で出会う生き物と夜空';const geometries=new Set(),materials=new Set(),models=new Map(),director=createCoastEncounters({random,ground});
 const own=g=>(geometries.add(g),g),material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.65,transparent:true,depthWrite:false,forceSinglePass:true,...extra});materials.add(m);return m;};
 const pose=new T.Object3D(),direction=new T.Vector3(),rotation=new T.Quaternion(),colour=new T.Color();let disposed=false,last=-Infinity;
 function geometry(parts){const position=[],normal=[],colors=[],wing=[];for(const part of parts){let g=part.g.index?part.g.toNonIndexed():part.g;const matrix=new T.Matrix4().compose(new T.Vector3(...(part.p??[0,0,0])),new T.Quaternion().setFromEuler(new T.Euler(...(part.r??[0,0,0]))),new T.Vector3(...(part.s??[1,1,1]))),nm=new T.Matrix3().getNormalMatrix(matrix),v=new T.Vector3();colour.set(part.c??0xffffff);for(let i=0;i<g.attributes.position.count;i++){v.fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix);position.push(v.x,v.y,v.z);v.fromBufferAttribute(g.attributes.normal,i).applyMatrix3(nm).normalize();normal.push(v.x,v.y,v.z);if(part.coloured&&g.attributes.color){colors.push(g.attributes.color.getX(i),g.attributes.color.getY(i),g.attributes.color.getZ(i));}else colors.push(colour.r,colour.g,colour.b);wing.push(part.w??0);}if(g!==part.g)g.dispose();part.g.dispose();}const g=own(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(position,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('wing',new T.Float32BufferAttribute(wing,1));g.computeBoundingSphere();return g;}
 const sphere=(c,p,s)=>({g:new T.SphereGeometry(1,12,8),c,p,s});
 const fin=(c,points)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();return{g,c};};
 function mesh(g,m,count=1){const o=count===1?new T.Mesh(g,m):new T.InstancedMesh(g,m,count);o.frustumCulled=false;o.visible=false;o.castShadow=false;o.receiveShadow=false;root.add(o);return o;}
 const birdGeo=geometry([sphere(0xf5f3e9,[0,0,0],[1.3,1.2,4]),sphere(0xffffff,[0,1,3.5],[1.3,1.3,1.7]),{g:new T.ConeGeometry(.5,2,6),c:0xe7b66a,p:[0,1,5.4],r:[Math.PI/2,0,0]},...[-1,1].flatMap(s=>[{...fin(0xe7e9eb,[[s,0,1.5],[s*7,.6,1],[s*10,-.1,-3],[s,0,1.5],[s*10,-.1,-3],[s*3,-.2,-2]]),w:1},{...fin(0x617082,[[s*7,.6,1],[s*10,-.1,-3],[s*12,.1,-4]]),w:1}])]);
 const birdMat=material(0xffffff,{vertexColors:true,side:T.DoubleSide}),birdClock={value:0};birdMat.onBeforeCompile=shader=>{shader.uniforms.birdClock=birdClock;shader.vertexShader='attribute float wing;uniform float birdClock;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=wing*abs(position.x)*sin(birdClock*4.8+instanceMatrix[3].x*.013)*.32;');};birdMat.customProgramCacheKey=()=> 'coast-gulls-120le';const birds=mesh(birdGeo,birdMat,5);birds.name='風に乗るカモメ';models.set('gulls',[birds]);
 const fishGeo=geometry([fin(0xffffff,[[0,0,7],[2.4,0,2],[1.7,0,-3],[0,0,7],[1.7,0,-3],[0,0,-5],[0,0,7],[0,0,-5],[-2.4,0,2],[0,0,-4],[3,0,-8],[-3,0,-8]])]);
 const fishMat=new T.ShaderMaterial({transparent:true,depthWrite:false,forceSinglePass:true,side:T.DoubleSide,uniforms:{waveTime:uniforms.waveTime,oceanPhase:uniforms.oceanPhase,alpha:{value:0}},vertexShader:'#define COAST_LIVE_CLOCK\nuniform float waveTime;'+COAST_WAVE_GLSL+'\nvoid main(){vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);w.y='+COAST_WATER_Y.toFixed(1)+'+coastWaveHeight(w.xz,waveTime)+.45;gl_Position=projectionMatrix*viewMatrix*w;}',fragmentShader:'uniform float alpha;void main(){gl_FragColor=vec4(.035,.14,.18,alpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});materials.add(fishMat);const fish=mesh(fishGeo,fishMat,9);fish.name='水面の下を泳ぐ魚影';models.set('fish',[fish]);
 function mammal(whale){const c=whale?0x526e83:0x6d9eae,parts=[sphere(c,[0,0,0],[whale?18:4.6,whale?13:4.7,whale?60:17]),sphere(whale?0x7795a8:0xb9d6db,[0,-3,7],[whale?15:3.5,whale?8:3.3,whale?47:13])];if(!whale)parts.push(sphere(c,[0,-.3,18],[2,1.5,5.5]));
  parts.push(fin(c,[[0,3,-5],[0,whale?17:12,whale?-23:-9],[0,2,whale?-29:-14]]));
  for(const s of[-1,1]){parts.push(fin(c,[[s*(whale?10:3),-2,8],[s*(whale?32:12),-5,-12],[s*(whale?9:3),-4,-16]]));parts.push(fin(c,[[0,0,whale?-56:-15],[s*(whale?25:10),1,whale?-71:-23],[s*(whale?6:2),1,whale?-61:-23]]));parts.push(sphere(0x183749,[s*(whale?15:3.7),whale?2:1,whale?32:12],[whale?1.1:.45,whale?1.1:.45,whale?1.5:.6]));}return geometry(parts);}
 function whaleGeometry(){
  // A broad rounded head, tapered tail stock, long pectoral flippers and two
  // horizontal flukes make the silhouette readable before any close-up.
  const c=0x4b7185,belly=0xa4bcc4,parts=[],vertices=[],colors=[],indices=[],rings=[[-145,3,4],[-132,7,7],[-112,12,10],[-85,21,17],[-50,31,24],[-10,39,29],[28,41,29],[62,37,25],[88,30,20],[106,26,18],[118,18,12],[124,0,0]],n=32;
  const upper=new T.Color(c),lower=new T.Color(belly),mixed=new T.Color();
  for(const r of rings)for(let i=0;i<n;i++){const angle=i/n*Math.PI*2,y=Math.sin(angle);vertices.push(Math.cos(angle)*r[1],y*r[2],r[0]);mixed.copy(upper).lerp(lower,T.MathUtils.smoothstep(-y,-.1,.8));colors.push(mixed.r,mixed.g,mixed.b);}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const p=j*n+i,q=j*n+(i+1)%n,r=(j+1)*n+i,t=(j+1)*n+(i+1)%n;indices.push(p,r,q,q,r,t);}
  const body=new T.BufferGeometry();body.setAttribute('position',new T.Float32BufferAttribute(vertices,3));body.setAttribute('color',new T.Float32BufferAttribute(colors,3));body.setIndex(indices);body.computeVertexNormals();parts.push({g:body,c,coloured:true});
  const outline=(points,depth,color)=>{const shape=new T.Shape();shape.moveTo(...points[0]);for(let i=1;i<points.length;i++)shape.lineTo(...points[i]);shape.closePath();return {g:new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:1.2,bevelSize:1.5,bevelSegments:2,steps:1}),c:color,r:[Math.PI/2,0,0]};};
  for(const side of[-1,1]){
   const flipper=outline([[side*27,35],[side*45,27],[side*69,0],[side*83,-31],[side*76,-39],[side*59,-24],[side*34,7]],3,belly);flipper.p=[0,-5,0];parts.push(flipper);
   const tail=outline([[0,-139],[side*21,-147],[side*53,-156],[side*61,-172],[side*42,-174],[side*15,-163],[0,-155]],4,c);tail.p=[0,0,0];parts.push(tail);
   parts.push(sphere(0x183342,[side*30,3,87],[2.1,1.8,2.5]));
   const mouth=new T.CatmullRomCurve3([new T.Vector3(side*21,-4,107),new T.Vector3(side*28,-6,96),new T.Vector3(side*32,-8,77)]);parts.push({g:new T.TubeGeometry(mouth,12,.75,5,false),c:0x25485d});
  }
  const dorsal=new T.Shape();dorsal.moveTo(-74,13);dorsal.quadraticCurveTo(-60,44,-47,35);dorsal.quadraticCurveTo(-45,26,-30,22);dorsal.closePath();parts.push({g:new T.ExtrudeGeometry(dorsal,{depth:4,bevelEnabled:true,bevelSize:1,bevelThickness:1,bevelSegments:1}),c,p:[-2,0,0],r:[0,-Math.PI/2,0]});
  for(const side of[-1,1])parts.push(sphere(0x244a5c,[side*3.2,24,65],[2.3,.7,4]));
  for(const x of[-16,-8,0,8,16]){const groove=new T.CatmullRomCurve3([new T.Vector3(x,-20,102),new T.Vector3(x*1.25,-26,69),new T.Vector3(x*1.2,-25,33)]);parts.push({g:new T.TubeGeometry(groove,10,.6,4,false),c:0x6f929e});}
  return geometry(parts);
 }
 const dolphinMat=material(0xffffff,{vertexColors:true,side:T.DoubleSide}),dolphins=mesh(mammal(false),dolphinMat,2);dolphins.name='並んで泳ぐイルカ';models.set('dolphins',[dolphins]);
 const whaleMat=material(0xffffff,{vertexColors:true,side:T.DoubleSide,depthWrite:true}),whale=mesh(whaleGeometry(),whaleMat);whale.name='沖で浮上するクジラ';models.set('whale',[whale]);
 const mistSeeds=new Float32Array(96*3);for(let i=0;i<mistSeeds.length;i++){const n=Math.sin(i*127.1+311.7)*43758.5453;mistSeeds[i]=n-Math.floor(n);}
 const mistGeo=own(new T.BufferGeometry());mistGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(96*3),3));const mistMat=new T.PointsMaterial({color:0xe9f9ff,size:7.5,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});mistMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat mistRadius=length(gl_PointCoord-vec2(.5));if(mistRadius>.5)discard;diffuseColor.a*=1.-smoothstep(.15,.5,mistRadius);');};mistMat.customProgramCacheKey=()=> 'coast-breath-mist-120oe';materials.add(mistMat);const mist=new T.Points(mistGeo,mistMat);mist.frustumCulled=false;mist.visible=false;root.add(mist);models.get('whale').push(mist);models.get('dolphins').push(mist);
 const shipGeo=geometry([sphere(0xb1d7dc,[0,0,0],[27,4,27]),sphere(0x98dcf1,[0,4,0],[12,7,12]),{g:new T.TorusGeometry(23,1.5,6,40),r:[Math.PI/2,0,0],c:0xffdfaa}]),shipMat=material(0xffffff,{vertexColors:true,emissive:0x74c9da,emissiveIntensity:.65,metalness:.45}),ship=mesh(shipGeo,shipMat);ship.name='夜空を旅する小さなUFO';models.set('ufo',[ship]);
 const trailGeo=own(new T.BufferGeometry());trailGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-110,2.5,0,-110,-2.5,0],3));trailGeo.setAttribute('color',new T.Float32BufferAttribute([1,1,1,.04,.15,.3,.04,.15,.3],3));
 const trailMat=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,forceSinglePass:true,side:T.DoubleSide,blending:T.AdditiveBlending}),starMat=new T.MeshBasicMaterial({color:0xe5f6ff,transparent:true,depthWrite:false});materials.add(trailMat);materials.add(starMat);const trail=mesh(trailGeo,trailMat),star=mesh(own(new T.SphereGeometry(2.6,8,5)),starMat);trail.name='流れ星の光跡';star.name='流れ星';models.set('meteor',[trail,star]);
 function place(o,x,y,z,yaw=0,pitch=0,scale=1,index){pose.position.set(x,y,z);pose.rotation.set(pitch,yaw,0,'YXZ');pose.scale.setScalar(scale);pose.updateMatrix();if(index===undefined){o.position.copy(pose.position);o.quaternion.copy(pose.quaternion);o.scale.copy(pose.scale);}else o.setMatrixAt(index,pose.matrix);}
 function update({camera,time,waveTime,date,actor,raft,level,waterY,paused=false,watchWhale=true}){
  if(disposed||!camera||!actor)return;
  // 30 Hz presentation; rigid bodies retain their own fixed-step simulation.
  if(time>=last&&time-last<1000/30)return;last=time;
  if(raft&&(Math.hypot(actor.x-raft.p[0],actor.z-raft.p[2])>150||1-2*(raft.q[0]**2+raft.q[2]**2)<.35))raft=null;
  camera.getWorldDirection(direction);let heading=Math.atan2(direction.x,direction.z);if(raft){direction.set(0,0,1).applyQuaternion(rotation.fromArray(raft.q));heading=Math.atan2(direction.x,direction.z);}
  const e=director.update({time,night:date.getHours()>=19||date.getHours()<6,actor,heading,raft,level,waterY,paused,watchWhale});
  for(const o of root.children)o.visible=false;if(!e||e.fade<=0)return;
  for(const o of models.get(e.kind))o.visible=true;
  const fade=e.fade,t=e.age,point=coastEncounterPoint(e,t),wave=(x,z)=>coastWave(x,z,waveTime).height;
  if(e.kind==='gulls'){birdMat.opacity=fade;birdClock.value=t;for(let i=0;i<5;i++){const p=coastEncounterPoint(e,t,(i-2)*26,i%2*32);place(birds,p.x,e.altitude+Math.sin(t*.6+i)*9+i*5,p.z,e.heading+e.side*Math.PI/2,Math.sin(t*.35+i)*.07,1,i);}birds.instanceMatrix.needsUpdate=true;}
  if(e.kind==='fish'){fishMat.uniforms.alpha.value=fade*.32;for(let i=0;i<9;i++){const p=coastEncounterPoint(e,t,(i%3-1)*17+Math.sin(t*2+i)*3,Math.floor(i/3)*20);place(fish,p.x,waterY,p.z,e.heading+Math.sin(t*4+i)*.11,0,.8+i%3*.15,i);}fish.instanceMatrix.needsUpdate=true;}
  if(e.kind==='dolphins'||e.kind==='whale'){
   const big=e.kind==='whale',count=big?1:2,m=big?whaleMat:dolphinMat;m.opacity=fade;
   for(let i=0;i<count;i++){
    const p=coastEncounterPoint(e,t,i*40,i*-30),cycle=(t+i*.6)%5.5,arc=Math.sin(Math.PI*cycle/2.5),jump=!big&&cycle<2.5;
    const presentation=big?coastWhalePresentation(e):null,close=!big&&raft&&Math.hypot(p.x-raft.p[0],p.z-raft.p[2])<90,water=wave(presentation?.x??p.x,presentation?.z??p.z),y=big?water+(presentation?.y??(-10+Math.sin(Math.PI*t/e.duration)*19)):water+(jump?arc*23-8:-12),pitch=big?(presentation?.pitch??Math.sin(t*.3)*.025):jump?-Math.cos(Math.PI*cycle/2.5)*.48:0;
    if(big&&presentation){p.x=presentation.x;p.z=presentation.z;m.opacity=presentation.fade;}
    place(big?whale:dolphins,p.x,close?water-35:y,p.z,e.heading,pitch,1,big?undefined:i);
   }
   if(!big)dolphins.instanceMatrix.needsUpdate=true;
   const presentation=big?coastWhalePresentation(e):null,plume=big&&(presentation?presentation.blow>0:t>9&&t<13),phase=big?(presentation?(presentation.age-.6)/2.1:(t-9)/4):(t%5.5)/5.5,visible=big?plume:phase<.12||phase>.4&&phase<.53;
   mistMat.opacity=big&&presentation?presentation.blow*.85:fade*(big?.65:.38);const p=coastEncounterPoint(e,t,0,big?65:0);if(presentation){p.x=presentation.x+Math.sin(e.heading)*65;p.z=presentation.z+Math.cos(e.heading)*65;}const base=wave(p.x,p.z)+(big?(presentation?.y??(-10+Math.sin(Math.PI*t/e.duration)*19))+24:0);mist.visible=visible&&!(raft&&!big&&Math.hypot(p.x-raft.p[0],p.z-raft.p[2])<90);
   mistGeo.setDrawRange(0,big?96:32);for(let i=0;i<(big?96:32);i++){const a=big?mistSeeds[i*3+1]*Math.PI*2:i*2.399,n=(big?mistSeeds[i*3]+phase:i*.619+phase)%1,r=big?Math.sqrt(mistSeeds[i*3+2])*(1+24*n*n):17*n;mistGeo.attributes.position.setXYZ(i,p.x+Math.cos(a)*r,base+2+(big?90*n:9*Math.sin(n*Math.PI)),p.z+Math.sin(a)*r);}mistGeo.attributes.position.needsUpdate=true;
  }
  if(e.kind==='ufo'){shipMat.opacity=fade;place(ship,point.x,e.altitude+Math.sin(t*.3)*22,point.z,e.heading,t*.006);// Compose banking with the flight heading in one stable yaw-first frame.
   // Editing XYZ Euler Z after a quaternion decomposes rearward headings
   // through a half-turn and can put the cockpit underneath the hull.
   ship.rotation.set(t*.006,e.heading,Math.sin(t*.2)*.12,'YXZ');}
  if(e.kind==='meteor'){const f=t/e.duration,p=coastEncounterPoint(e,0,e.side*f*650,0);starMat.opacity=trailMat.opacity=Math.min(fade,Math.sin(Math.PI*f));place(star,p.x,550-f*240,p.z);trail.position.copy(star.position);trail.quaternion.copy(camera.quaternion);direction.set(Math.cos(e.heading)*e.side*650,-240,-Math.sin(e.heading)*e.side*650).applyQuaternion(rotation.copy(camera.quaternion).invert());trail.rotateZ(Math.atan2(direction.y,direction.x));}
 }
 return{root,director,update,get watchingWhale(){return !!coastWhalePresentation(director.active)?.watching;},get whaleFocus(){const e=director.active,p=coastWhalePresentation(e);return p?{...p,heading:e.heading,water:coastWave(p.x,p.z,uniforms.waveTime.value).height}:null;},cancelWhaleWatch(){const e=director.active;if(e?.whaleScene)e.whaleScene.reason='departure';},dispose(){if(disposed)return;disposed=true;director.reset();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();}};
}
