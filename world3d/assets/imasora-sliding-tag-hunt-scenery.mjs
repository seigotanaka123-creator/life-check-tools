import{cornerStairGeometry}from'./imasora-sliding-tag-hunt-corner-stairs.mjs';
import{huntBuildingArchitecture}from'./imasora-sliding-tag-hunt-architecture.mjs';
import * as T from './three.module.min.js';
import{huntBarkMaterial,huntCanopyMaterial,huntFoliageDetails,applyHuntWallDetail}from'./imasora-sliding-tag-hunt-city-detail.mjs';
import {WORLD,WORLD_CORNER_STAIRS,WORLD_JUMP_STEPS,WORLD_GARDEN,WORLD_GARDEN_BEDS,WORLD_BASIN,worldBasinContours,WORLD_DECK,WORLD_RISE,WORLD_RIDGE,WORLD_ICE_LOOP,WORLD_HILL,WORLD_PATHS,WORLD_BLOCKS,WORLD_TREES,worldGroundHeight,worldHeight,worldSurface} from './imasora-sliding-tag-hunt-world.mjs';
import {tagAtmosphere} from './imasora-sliding-tag-model.mjs';
import{huntSurfaceTexture,setHuntTerrainUV,huntMasonryTexture,huntRoadMarkings,createHuntSunShadows,huntEntranceMaterial,createHuntGlass,huntContactShadows}from'./imasora-sliding-tag-hunt-city-materials.mjs';
// Build the tread and retaining faces from the same profile so the slope
// meets its sides without gaps. The paint is baked into the tread geometry.
function raisedRouteGeometry(x,width,profile){
 const left=x-width/2,right=x+width/2,base=-.16;
 const tread={positions:[],colors:[]},walls={positions:[],colors:[]};
 function quad(mesh,tint,a,b,c,d){
  const color=new T.Color(tint);
  for(const p of [a,b,c,a,c,d]){
   mesh.positions.push(...p);
   mesh.colors.push(color.r,color.g,color.b);
  }
 }
 for(let i=1;i<profile.length;i++){
  const [z0,h0]=profile[i-1],[z1,h1]=profile[i];
  const top=(px,t,offset=0)=>[px,h0+(h1-h0)*t+offset,z0+(z1-z0)*t];
  quad(tread,h0===h1?0xe5cead:0xd0b894,top(left,0),top(left,1),top(right,1),top(right,0));
  const highLeft0=top(left,0),highLeft1=top(left,1);
  const highRight0=top(right,0),highRight1=top(right,1);
  quad(walls,0x506d7c,[left,base,z0],[left,base,z1],highLeft1,highLeft0);
  quad(walls,0x506d7c,[right,base,z0],highRight0,highRight1,[right,base,z1]);
  if(h0===h1)continue;
  for(const line of [left+.45,right-1.1]){
   quad(tread,0xffdc90,top(line,0,.016),top(line,1,.016),top(line+.65,1,.016),top(line+.65,0,.016));
  }
  // Chevron marks point uphill from the approach.
  for(const progress of [.19,.36,.53]){
   const direction=Math.sign(h1-h0),at=direction>0?progress:1-progress,point=at+direction*2.8/(z1-z0),depth=.65/(z1-z0);
   const a=top(x-2.4,at,.018),b=top(x,point,.018),c=top(x+2.4,at,.018);
   const a1=top(x-2.4,at+depth,.018),b1=top(x,point+depth,.018),c1=top(x+2.4,at+depth,.018);
   quad(tread,0xf8ead0,a,a1,b1,b);
   quad(tread,0xf8ead0,b,b1,c1,c);
  }
 }
 const [near,low]=profile[0],[far,high]=profile.at(-1);
 quad(walls,0x506d7c,[left,base,near],[left,low,near],[right,low,near],[right,base,near]);
 quad(walls,0x506d7c,[left,base,far],[right,base,far],[right,high,far],[left,high,far]);
 quad(walls,0x506d7c,[left,base,near],[right,base,near],[right,base,far],[left,base,far]);
 return {tread,walls};
}
function raisedRouteMesh(name,...parts){
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(parts.flatMap(p=>p.positions),3));
 geometry.setAttribute('color',new T.Float32BufferAttribute(parts.flatMap(p=>p.colors),3));
 geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.86}));
 mesh.name=name;
 return mesh;
}
export function createHuntScenery({scene,camera,canvas,hemi,sun}){
const material=color=>new T.MeshStandardMaterial({color,roughness:.65}),boxGeo=new T.BoxGeometry(1,1,1),cylinderGeo=new T.CylinderGeometry(1,1,1,10);
// Fixed opaque boxes are grouped by the exact same material colour.
const staticBoxes=new Map(),staticBoxMaterials=new Map();
function box(x,y,z,w,h,d,color,masonry=false){const style=color+(masonry?":stone":":plain"),key=style+':'+Math.floor((x+WORLD.width/2)/96)+':'+Math.floor((z+WORLD.depth/2)/96);let group=staticBoxes.get(key);if(!group)staticBoxes.set(key,group={color,masonry,style,rows:[]});group.rows.push([x,y,z,w,h,d]);}
function batch(geometry,color,rows,sharedMaterial){const mesh=new T.InstancedMesh(geometry,sharedMaterial??material(color),rows.length),matrix=new T.Matrix4(),q=new T.Quaternion(),up=new T.Vector3(0,1,0);rows.forEach((r,i)=>{if(r[6])q.setFromAxisAngle(up,r[6]);else q.identity();matrix.compose(new T.Vector3(...r.slice(0,3)),q,new T.Vector3(...r.slice(3,6)));mesh.setMatrixAt(i,matrix);});mesh.computeBoundingSphere();scene.add(mesh);return mesh;}
const frostTexture=huntSurfaceTexture('frost'),iceTexture=huntSurfaceTexture('ice');
const asphaltTexture=huntSurfaceTexture('asphalt'),pavingTexture=huntSurfaceTexture('paving');
const glass=createHuntGlass(),masonryTexture=huntMasonryTexture();
// The closed backing sits below the deepest ground instead of filling the basin.
const backingTop=-WORLD_BASIN.depth-.5;batch(boxGeo,0xa3cddd,[[0,backingTop-2.5,0,WORLD.width,5,WORLD.depth],[-WORLD.width/2,backingTop/2,0,1,-backingTop,WORLD.depth],[WORLD.width/2,backingTop/2,0,1,-backingTop,WORLD.depth],[0,backingTop/2,-WORLD.depth/2,WORLD.width,-backingTop,1],[0,backingTop/2,WORLD.depth/2,WORLD.width,-backingTop,1]]);function terrainSheet(w,d,x=0,z=0,color=0xffffff){const geometry=new T.PlaneGeometry(w,d,Math.ceil(w/4),Math.ceil(d/4)),pos=geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,worldGroundHeight(pos.getX(i)+x,-pos.getY(i)+z));geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material(color));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,0,z);scene.add(mesh);return mesh;}const ice=terrainSheet(WORLD.width,WORLD.depth,0,0,0xf1faff);ice.material.roughness=.9;ice.material.map=frostTexture;ice.material.bumpMap=frostTexture;ice.material.bumpScale=.035;setHuntTerrainUV(ice.geometry,0,0,15);ice.name='hunt-frosted-terrain';
// A baked bank tint makes depth legible without extra lights or per-frame work.
const iceVertices=ice.geometry.attributes.position,iceColors=new Float32Array(iceVertices.count*3);
for(let i=0;i<iceVertices.count;i++){
 const icy=worldSurface(iceVertices.getX(i),-iceVertices.getY(i))==='ice',depth=Math.max(0,Math.min(1,-iceVertices.getZ(i)/WORLD_BASIN.depth)),gleam=Math.sin(depth*Math.PI),at=i*3;
 const x=iceVertices.getX(i),z=-iceVertices.getY(i);
 const bankTint=.93+.064*Math.sin(x*.041+z*.026)*Math.cos(z*.069-x*.01);
 iceColors[at]=bankTint*((icy?.63:1)+.4*gleam-.15*depth);iceColors[at+1]=bankTint*((icy?.87:1)+.35*gleam-.04*depth);iceColors[at+2]=bankTint*((icy?1:.97)+.25*gleam);
}
ice.geometry.setAttribute('color',new T.BufferAttribute(iceColors,3));ice.material.vertexColors=true;
const castShadows=createHuntSunShadows(ice.geometry,WORLD,WORLD_BLOCKS,WORLD_TREES);
scene.add(castShadows.mesh);
for(const p of WORLD_PATHS){const parts=p.x===WORLD_DECK.x&&p.w===WORLD_DECK.w&&p.d===WORLD.depth?[-1,1].map(sign=>{const end=WORLD_DECK.length/2+WORLD_DECK.ramp,length=WORLD.depth/2-end;return{...p,d:length,z:sign*(end+length/2)};}):[p];for(const part of parts){const arterial=Math.min(part.w,part.d)>=22&&Math.max(part.w,part.d)>=110;
 const path=terrainSheet(part.w,part.d,part.x,part.z,arterial?0xc5d6db:0xebeee9);
 path.name=arterial?'hunt-asphalt-street':'hunt-stone-walkway';path.position.y=arterial?.061:.054;
 path.material.map=arterial?asphaltTexture:pavingTexture;path.material.roughness=arterial?.76:.89;path.material.bumpMap=path.material.map;path.material.bumpScale=arterial?.055:.08;
 path.material.polygonOffset=true;path.material.polygonOffsetFactor=arterial?-2:-1;path.material.polygonOffsetUnits=arterial?-4:-2;
 setHuntTerrainUV(path.geometry,part.x,part.z,arterial?11:14);}}
scene.add(huntRoadMarkings(worldGroundHeight));
// Painted contours reveal the bank and follow the physical four-unit terrain.
const{positions:basinPaint,indices:basinIndices}=worldBasinContours();
const basinGeo=new T.BufferGeometry();basinGeo.setAttribute('position',new T.Float32BufferAttribute(basinPaint,3));basinGeo.setIndex(basinIndices);basinGeo.computeVertexNormals();const basinContours=new T.Mesh(basinGeo,material(0xbde5df));basinContours.material.depthWrite=false;scene.add(basinContours);
// Ice on the lower loop and grippy roads over the rise are visible directly in the world.
for(const p of WORLD_ICE_LOOP){const track=terrainSheet(p.w,p.d,p.x,p.z,0x9ecfdf);track.position.y=.025;track.material.map=iceTexture;track.material.roughness=.19;track.material.bumpMap=iceTexture;track.material.bumpScale=.018;track.material.polygonOffset=true;track.material.polygonOffsetFactor=-1;track.material.polygonOffsetUnits=-1;track.name='hunt-polished-ice';setHuntTerrainUV(track.geometry,p.x,p.z,24);}
for(const sign of[-1,1])for(const vertical of[false,true]){const r=WORLD_RISE,edge=terrainSheet(vertical?.55:r.topW*2,vertical?r.topD*2:.55,r.x+(vertical?sign*r.topW:0),r.z+(vertical?0:sign*r.topD),vertical?0x6bbbc2:0xe7bd73);edge.position.y=.09;}
const windows=[],nightWindows=[],lampMarkers=[],roofs=[],doors=[],trim=[],bases=[],roofUnits=[];for(const [i,b]of WORLD_BLOCKS.entries()){if(b.kind==='garden')continue;if(b.kind==='arch'){box(b.x,b.base+b.h/2,b.z,b.w,b.h,b.d,0x6ebbbd);lampMarkers.push({x:b.x,y:b.base+1,z:b.z+b.d/2+.25});continue;}box(b.x,(b.base??0)+b.h/2,b.z,b.w,b.h,b.d,b.kind==='courtyard'?[0xd2b5a8,0xbbd2d0,0xdcc3a3][i%3]:[0xdedbd1,0xb0c4cf,0xc1b2b9,0xc9d4ca][i%4],true);for(const side of[-1,1])lampMarkers.push({x:b.x+side*Math.min(10,b.w/2-2),y:6.5,z:b.z+b.d/2+.25});bases.push([b.x,1,b.z,b.w+.1,2,b.d+.1]);roofUnits.push([b.x+Math.min(5,b.w/2-3),b.h+1.3,b.z-Math.min(5,b.d/2-3),5,2.6,4]);roofs.push([b.x,b.h+.3,b.z,b.w+1,.6,b.d+1]);doors.push([b.x,2.7,b.z+b.d/2+.08,3,5.4,.16]);for(const sign of[-1,1])for(let y=6;y<b.h-1;y+=4)for(let x=-b.w/2+4;x<b.w/2-2;x+=5)(Math.abs(i*13+Math.round(x)*19+Math.round(y)*3+sign*7)%7<3?nightWindows:windows).push([b.x+x,y,b.z+sign*(b.d/2+.08),2.7,2,.16]);trim.push([b.x,b.h-1,b.z+b.d/2+.15,b.w,.25,.25]);}const facadeFrames=[];let facadeBuildings=0,sideWindows=0,facadeTrim=0;for(const [i,b]of WORLD_BLOCKS.entries()){const a=huntBuildingArchitecture(b,i);if(!b.kind)facadeBuildings++;facadeFrames.push(...a.frames);trim.push(...a.trim);windows.push(...a.windows);nightWindows.push(...a.nightWindows);sideWindows+=a.windows.length+a.nightWindows.length;facadeTrim+=a.trim.length;}const frames=batch(boxGeo,0x435f71,facadeFrames);frames.name='hunt-building-facades';canvas.dataset.architecture=JSON.stringify({buildings:facadeBuildings,frames:facadeFrames.length,sideWindows,trim:facadeTrim,extraDrawBatches:1});batch(boxGeo,0x546a7b,roofs).name='hunt-building-parapets';
batch(boxGeo,0x6c9cae,windows,glass.shaded).name='hunt-reflective-window-glass';
batch(boxGeo,0x6c9cae,nightWindows,glass.lit).name='hunt-lit-window-glass';
batch(boxGeo,0x76574e,doors,huntEntranceMaterial()).name='hunt-building-doors';
batch(boxGeo,0xe5e4d8,trim).name='hunt-stone-trim';
batch(boxGeo,0x788c97,bases).name='hunt-building-foundations';
batch(boxGeo,0x8da3ab,roofUnits).name='hunt-rooftop-units';
// Solid planted beds share the exact colliders, including the open eight-unit shortcut.
const hedgeCores=[],hedgeCrowns=[],gardenStone=[],pinkFlowers=[],creamFlowers=[];
for(const b of WORLD_GARDEN_BEDS){const leaf=(x,y,z,sx,sy,sz)=>{let seed=Math.sin(x*12.9898+z*78.233+y*17.7)*43758.5453;const r=seed-Math.floor(seed);sx*=.88+r*.12;sy*=.87+(1-r)*.13;sz*=.86+r*.14;x=Math.max(b.x-b.w/2+sx,Math.min(b.x+b.w/2-sx,x+(r-.5)*1.6));z=Math.max(b.z-b.d/2+sz,Math.min(b.z+b.d/2-sz,z+(r-.5)*1.3));y=Math.min(b.h-sy,y+(r-.5)*.7);hedgeCrowns.push([x,y,z,sx,sy,sz]);};gardenStone.push([b.x,.35,b.z,b.w,.7,b.d]);hedgeCores.push([b.x,4.2,b.z,b.w-3,7.5,b.d-3]);for(let x=-b.w/2+3;x<=b.w/2-3;x+=6)for(let z=-b.d/2+3;z<=b.d/2-3;z+=6){leaf(b.x+x,7.7,b.z+z,3,1.3,3);if((Math.round(x*7+z*11)+b.x)%5===0)(hedgeCrowns.length%2?pinkFlowers:creamFlowers).push([hedgeCrowns.at(-1)[0],hedgeCrowns.at(-1)[1]+hedgeCrowns.at(-1)[4]*.93+.12,hedgeCrowns.at(-1)[2],.42,.25,.42]);}for(const side of[-1,1])for(const y of[2,4.2,6.4]){for(let x=-b.w/2+3;x<=b.w/2-3;x+=6)leaf(b.x+x,y,b.z+side*(b.d/2-1.8),3,1.7,1.8);for(let z=-b.d/2+3;z<=b.d/2-3;z+=6)leaf(b.x+side*(b.w/2-1.8),y,b.z+z,1.8,1.7,3);}}
for(const rows of[hedgeCores,hedgeCrowns,pinkFlowers,creamFlowers])for(const row of rows){row[1]*=WORLD_GARDEN.h/9;row[4]*=WORLD_GARDEN.h/9;}batch(boxGeo,0x426656,hedgeCores);batch(boxGeo,0x9caeac,gardenStone);const leafGeo=new T.IcosahedronGeometry(1,2),leafNormals=leafGeo.attributes.normal,leafVertices=leafGeo.attributes.position;for(let i=0;i<leafVertices.count;i++){const x=leafVertices.getX(i),y=leafVertices.getY(i),z=leafVertices.getZ(i),length=Math.hypot(x,y,z);leafNormals.setXYZ(i,x/length,y/length,z/length);}const gardenLeaves=batch(leafGeo,0xaabca5,hedgeCrowns),leafColor=new T.Color();for(let i=0;i<hedgeCrowns.length;i++)gardenLeaves.setColorAt(i,leafColor.set([0x527a62,0x6c9779,0x5d8565,0x83a98e][(i*7+Math.floor(i/5))%4]));batch(leafGeo,0xefb0bc,pinkFlowers);batch(leafGeo,0xf5df9b,creamFlowers);
// Painted crest edges follow the same solid bank; nothing floats above a walkable void.
for(const sign of[-1,1]){const guide=terrainSheet(WORLD_RIDGE.end-WORLD_RIDGE.start,.4,(WORLD_RIDGE.start+WORLD_RIDGE.end)/2,sign*(WORLD_RIDGE.halfTop-1),0xf4d9a6);guide.position.y=.1;}
// Continuous upper walk: two ramps, a supported deck, and the same heights in physics.
const deckX=WORLD_DECK.x,halfDeck=WORLD_DECK.length/2,deckEnd=halfDeck+WORLD_DECK.ramp,deckTop=WORLD_DECK.h+.05;
const raisedDeck=raisedRouteGeometry(deckX,WORLD_DECK.w,[[-deckEnd,.05],[-halfDeck,deckTop],[halfDeck,deckTop],[deckEnd,.05]]);
scene.add(raisedRouteMesh('hunt-raised-deck-tread',raisedDeck.tread),raisedRouteMesh('hunt-raised-deck-walls',raisedDeck.walls));
for(const side of[-1,1])box(deckX+side*(WORLD_DECK.w/2-.5),WORLD_DECK.h+.09,0,.35,.08,WORLD_DECK.length,0xe2b95d);
const trunks=[],crowns=[];
for(const [i,{x,z,y,r,h}]of WORLD_TREES.entries()){
 const variation=.89+(i*13%8)*.015;
 trunks.push([x,y+2.35,z,.55,4.7,.55]);
 crowns.push([x,y+h*.65,z,r*.96*variation,h*.33,r*.95*variation,i*.31]);
 crowns.push([x+r*.25,y+h*.48,z+r*.17,r*.69*variation,h*.24,r*.7*variation,i*.48]);
 crowns.push([x-r*.31,y+h*.54,z-r*.23,r*.64*variation,h*.24,r*.64*variation,i*.79]);
}
batch(cylinderGeo,0x796357,trunks,huntBarkMaterial()).name='hunt-tree-trunks';
const treeCoreRows=crowns.map(row=>row.map((value,i)=>i>=3&&i<=5?value*.65:value));
const treeLeaves=batch(leafGeo,0xd9dfc3,treeCoreRows,huntCanopyMaterial());treeLeaves.name='hunt-tree-crowns';
for(let i=0;i<crowns.length;i++)treeLeaves.setColorAt(i,leafColor.set([0xe9f0dc,0xf6f3df,0xdbe9d5,0xffffff][i%4]));
scene.add(huntFoliageDetails(crowns,hedgeCrowns));
const contactShadows=huntContactShadows(WORLD_BLOCKS,WORLD_TREES,worldGroundHeight);scene.add(contactShadows);
// Rolling hills and tree lines sit beyond the playable perimeter.
function surroundingHeight(x,z){
 const edge=Math.max(0,Math.abs(x)-WORLD.width/2,Math.abs(z)-WORLD.depth/2);
 const rise=Math.min(1,edge/180);
 const hills=12+31*Math.sin(x*.009+z*.004)**2+26*Math.cos(z*.011-x*.003)**2;
 return -.15+rise*hills;
}
function surroundingLand(w,d,x,z){
 const geometry=new T.PlaneGeometry(w,d,Math.ceil(w/30),Math.ceil(d/30));
 const positions=geometry.attributes.position,colors=[];
 const shade=new T.Color(),base=new T.Color(0xbbd0d6),pine=new T.Color(0x809ca8);
 for(let i=0;i<positions.count;i++){
  const wx=positions.getX(i)+x,wz=-positions.getY(i)+z;
  positions.setZ(i,surroundingHeight(wx,wz));
  const mottling=.25+.25*Math.sin(wx*.017+wz*.021)*Math.sin(wz*.03);
  shade.copy(base).lerp(pine,mottling);colors.push(shade.r,shade.g,shade.b);
 }
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
 mesh.rotation.x=-Math.PI/2;mesh.position.set(x,0,z);scene.add(mesh);
}
surroundingLand(1600,640,0,-560);surroundingLand(1600,640,0,560);surroundingLand(480,480,-560,0);surroundingLand(480,480,560,0);
const pineLower=[],pineMiddle=[],pineTips=[];
function landscapePine(x,z,index){
 const h=10+(index*37%17),radius=h*(.18+(index%4)*.018),y=surroundingHeight(x,z);
 pineLower.push([x,y+h*.34,z,radius,h*.64,radius,index*.91]);
 pineMiddle.push([x,y+h*.56,z,radius*.77,h*.60,radius*.77,index*.32]);
 pineTips.push([x,y+h*.77,z,radius*.52,h*.49,radius*.52,index*.71]);
}
for(const side of [-1,1]){
 for(let i=0;i<43;i++){
  const x=-385+i*18+(i*71%13),z=side*(278+(i*43%105));
  landscapePine(x,z,i);
 }
 for(let i=0;i<23;i++){
  const x=side*(354+(i*29%67)),z=-222+i*20+(i*41%15);
  landscapePine(x,z,i+43);
 }
}
const pineGeo=new T.ConeGeometry(1,1,6);
batch(pineGeo,0x426371,pineLower).name='hunt-distant-conifer-lower';
batch(pineGeo,0x64858b,pineMiddle).name='hunt-distant-conifer-middle';
batch(pineGeo,0xaac2c6,pineTips).name='hunt-distant-conifer-tips';
const barriers=[];for(let x=-320;x<=320;x+=20)for(const z of[-240,240])barriers.push([x,1,z,19,2,1]);for(let z=-220;z<=220;z+=20)for(const x of[-320,320])barriers.push([x,1,z,1,2,19]);batch(boxGeo,0x9aabb7,barriers);

// One small baked cloud texture, one sky draw and one star draw. No bloom or shadow maps.
const cloudCanvas=document.createElement('canvas');cloudCanvas.width=512;cloudCanvas.height=128;const cloudCtx=cloudCanvas.getContext('2d');
for(let i=0;i<18;i++)for(let j=0;j<5;j++)for(const wrap of[-512,0,512]){const x=(i*137)%512+j*8+wrap,y=28+(i*29)%60-(j%3)*5,r=12+(i+j)%14,g=cloudCtx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');cloudCtx.fillStyle=g;cloudCtx.fillRect(x-r,y-r,r*2,r*2);}
const cloudTex=new T.CanvasTexture(cloudCanvas);cloudTex.wrapS=T.RepeatWrapping;cloudTex.generateMipmaps=false;cloudTex.minFilter=T.LinearFilter;
const skyUniforms={top:{value:new T.Color()},horizon:{value:new T.Color()},sun:{value:new T.Color()},sunDir:{value:new T.Vector3()},night:{value:0},time:{value:0},clouds:{value:cloudTex}};
const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:skyUniforms,vertexShader:'varying vec3 worldPoint;void main(){vec4 w=modelMatrix*vec4(position,1.);worldPoint=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;gl_Position.z=gl_Position.w;}',fragmentShader:`varying vec3 worldPoint;uniform vec3 top,horizon,sun,sunDir;uniform float night,time;uniform sampler2D clouds;void main(){vec3 d=normalize(worldPoint-cameraPosition);vec3 col=mix(horizon,top,pow(max(d.y,0.),.6));float u=atan(d.z,d.x)/6.2831853+.5+time*.0015;vec4 c=texture2D(clouds,vec2(u,clamp(d.y*1.8,0.,1.)));float mask=smoothstep(.02,.12,d.y)*(1.-smoothstep(.5,.8,d.y));col=mix(col,mix(vec3(1.,.96,.9),vec3(.04,.075,.13),night),c.a*mask*.7);float facing=max(0.,dot(d,sunDir));float horizonGlow=pow(facing,9.)*exp(-max(d.y,0.)*8.);col+=sun*(pow(facing,100.)*.18+horizonGlow*(1.-night)*.15);float disc=smoothstep(.99945,.99975,facing);col=mix(col,sun,disc);gl_FragColor=vec4(col,1.);#include <colorspace_fragment>
}`.replace(';#include',';\n#include')});
const skyMesh=new T.Mesh(new T.SphereGeometry(800,24,12),skyMaterial);skyMesh.frustumCulled=false;
// Its shader uses the far depth. Paint after opaque scenery so the depth test
// skips the expensive sky shading where buildings or terrain already fill the view.
skyMesh.renderOrder=1000;scene.add(skyMesh);
const starPositions=[];for(let i=0;i<140;i++){const a=i*2.399963,e=.08+((i*37)%100)/100*1.25,r=760;starPositions.push(Math.sin(a)*Math.cos(e)*r,Math.sin(e)*r,Math.cos(a)*Math.cos(e)*r);}const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));const starMat=new T.PointsMaterial({color:0xffefd5,size:2,sizeAttenuation:false,transparent:true,depthWrite:false,fog:false,opacity:0});const stars=new T.Points(starGeo,starMat);stars.frustumCulled=false;stars.renderOrder=-9;scene.add(stars);
// Streetlights are mounted on the existing perimeter barrier.
const posts=[],lampArms=[];
for(const z of [-240,240])for(let x=-290;x<=290;x+=48){
 posts.push([x,4.7,z,.18,9.4,.18]);
 lampArms.push([x,9.4,z-Math.sign(z)*.8,.28,.24,1.9]);
 lampMarkers.push({x,y:9.24,z:z-Math.sign(z)*1.65,poolOffset:-Math.sign(z)*3});
}
for(const x of [-320,320])for(let z=-210;z<=210;z+=48){
 posts.push([x,4.7,z,.18,9.4,.18]);
 lampArms.push([x-Math.sign(x)*.8,9.4,z,1.9,.24,.28]);
 lampMarkers.push({x:x-Math.sign(x)*1.65,y:9.24,z,poolOffset:0});
}
batch(cylinderGeo,0x536877,posts).name='hunt-perimeter-lamp-posts';
batch(boxGeo,0x536877,lampArms).name='hunt-perimeter-lamp-arms';
const lampCores=batch(boxGeo,0xfff1cf,lampMarkers.map(p=>[p.x,p.y,p.z,.65,.36,.45]));lampCores.material.emissive.set(0xffd79c);
const glowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,uniforms:{strength:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;vec4 p=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);p.xy+=position.xy*7.;gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec2 v;uniform float strength;void main(){float r=length((v-.5)*2.);gl_FragColor=vec4(1.,.68,.3,(1.-smoothstep(.0,1.,r))*strength*.24);}' });
const lampHalos=new T.InstancedMesh(new T.PlaneGeometry(1,1),glowMaterial,lampMarkers.length),lampMatrix=new T.Matrix4();lampMarkers.forEach((p,i)=>{lampMatrix.makeTranslation(p.x,p.y,p.z+.12);lampHalos.setMatrixAt(i,lampMatrix);});lampHalos.frustumCulled=false;scene.add(lampHalos);
const poolPositions=[],poolUV=[],poolIndices=[];for(const p of lampMarkers){const base=poolPositions.length/3,r=9;for(let z=0;z<=4;z++)for(let x=0;x<=4;x++){const wx=p.x+(x/4-.5)*r*2,wz=p.z+(p.poolOffset??5)+(z/4-.5)*r*2;poolPositions.push(wx,worldHeight(wx,wz)+.13,wz);poolUV.push(x/4,z/4);}for(let z=0;z<4;z++)for(let x=0;x<4;x++){const n=base+z*5+x;poolIndices.push(n,n+5,n+1,n+1,n+5,n+6);}}
const poolGeometry=new T.BufferGeometry();poolGeometry.setAttribute('position',new T.Float32BufferAttribute(poolPositions,3));poolGeometry.setAttribute('uv',new T.Float32BufferAttribute(poolUV,2));poolGeometry.setIndex(poolIndices);const poolMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{strength:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;uniform float strength;void main(){float r=length((v-.5)*2.);gl_FragColor=vec4(1.,.66,.28,(1.-smoothstep(.0,1.,r))*strength*.17);}'});const pools=new T.Mesh(poolGeometry,poolMaterial);scene.add(pools);
// Explicit preview parameter only changes this scene's lighting, never the device clock or game state.
const reviewPhase=new URL(location.href).searchParams.get('tagLightingReview'),reviewHours={morning:7.5,day:12,evening:17,night:22};
function lightingDate(){const d=new Date();if(Object.hasOwn(reviewHours,reviewPhase)){const hour=reviewHours[reviewPhase];d.setHours(Math.floor(hour),Math.round(hour%1*60),0,0);}return d;}
const nightSkyLight=new T.Color(0xb9d4f4),nightGroundLight=new T.Color(0x6c8da6);let lastLighting=-Infinity,liveLighting=null,appliedLighting=null;
function updateLighting(now,recorded){
 if(!recorded&&now-lastLighting>=10000){
  lastLighting=now;
  liveLighting=Object.freeze(tagAtmosphere(lightingDate()));
 }
 const l=recorded??liveLighting;
 if(l===appliedLighting)return;
 appliedLighting=l;
 skyUniforms.top.value.set(l.top);skyUniforms.horizon.value.set(l.horizon);skyUniforms.sun.value.set(l.sun);skyUniforms.night.value=l.night;skyUniforms.sunDir.value.set(Math.sin(l.azimuth)*Math.cos(l.elevation),Math.sin(l.elevation),Math.cos(l.azimuth)*Math.cos(l.elevation));hemi.intensity=l.ambient;hemi.color.set(0xf1f6ff).lerp(nightSkyLight,l.night);hemi.groundColor.set(0x8ba7b8).lerp(nightGroundLight,l.night);sun.intensity=l.power;sun.color.set(l.sun);sun.position.copy(skyUniforms.sunDir.value).multiplyScalar(200);scene.fog.color.set(l.horizon);scene.background.set(l.horizon);starMat.opacity=l.night*.9;stars.visible=l.night>.01;glass.update(l.lamps);castShadows.update(l);contactShadows.material.uniforms.opacity.value=.29-l.night*.075;lampCores.material.emissiveIntensity=l.lamps;glowMaterial.uniforms.strength.value=l.lamps;lampHalos.visible=l.lamps>.01;poolMaterial.uniforms.strength.value=l.lamps;pools.visible=l.lamps>.01;canvas.dataset.lightPhase=l.phase;}
for(const p of WORLD_JUMP_STEPS){
 box(p.x,p.h/2,p.z,p.w,p.h,p.d,0xc5dcd8);
 box(p.x,p.h+.03,p.z,p.w,.06,p.d,0xf2d6a8);
 const top=p.z-p.d/2,{tread,walls}=raisedRouteGeometry(p.x,p.w,[[top-p.ramp,0],[top,p.h]]);
 scene.add(raisedRouteMesh('hunt-jump-step-ramp-'+p.x,tread,walls));
}
const stairGeometry=cornerStairGeometry(WORLD_CORNER_STAIRS),stairSlabs=batch(boxGeo,0x7196a3,stairGeometry.slabs);stairSlabs.name='corner-stair-slabs';const stairEdges=batch(boxGeo,0xffdba0,stairGeometry.edges);stairEdges.name='corner-stair-tread-edges';const rampGeometry=new T.BufferGeometry();rampGeometry.setAttribute('position',new T.Float32BufferAttribute(stairGeometry.positions,3));rampGeometry.computeVertexNormals();const rampMaterial=material(0x8eabb0);rampMaterial.side=T.DoubleSide;rampMaterial.polygonOffset=true;rampMaterial.polygonOffsetFactor=-1;rampMaterial.polygonOffsetUnits=-1;const stairRamps=new T.Mesh(rampGeometry,rampMaterial);stairRamps.name='corner-stair-side-ramps';scene.add(stairRamps);canvas.dataset.cornerStairs=JSON.stringify({corners:4,count:WORLD_CORNER_STAIRS[0].count,rise:WORLD_CORNER_STAIRS[0].rise,tread:WORLD_CORNER_STAIRS[0].tread,top:WORLD_CORNER_STAIRS[0].top,rampWidth:WORLD_CORNER_STAIRS[0].rampWidth,extraDrawBatches:3});
let boxCount=0;for(const[key,{color,masonry,style,rows}]of staticBoxes){let shared=staticBoxMaterials.get(style);if(!shared){shared=material(color);if(masonry)applyHuntWallDetail(shared,masonryTexture);staticBoxMaterials.set(style,shared);}const mesh=batch(boxGeo,color,rows,shared);mesh.name='hunt-static-boxes-'+key;boxCount+=rows.length;}canvas.dataset.staticBoxes=JSON.stringify({boxes:boxCount,batches:staticBoxes.size,colours:staticBoxMaterials.size,cell:96,savedDrawBatches:boxCount-staticBoxes.size,savedMaterials:boxCount-staticBoxMaterials.size});
function centerSky(view=camera){skyMesh.position.copy(view.position);stars.position.copy(view.position);}
return{centerSky,get lighting(){return appliedLighting;},update(now,recordedLighting){updateLighting(now,recordedLighting);centerSky();skyUniforms.time.value=now/1000;}};
}
