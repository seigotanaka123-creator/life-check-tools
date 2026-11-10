// Tournament presentation only. This module never simulates a match, awards
// anything, writes a save, or changes a canonical monster model.
export const TOURNAMENT_ARENAS=Object.freeze({
 rookie:{name:'はじまりの競技場',sky:0x79b5d3,horizon:0xe6ecd9,floor:0xceb78b,accent:0x679d79,landmark:'wooden-pavilion'},
 green:{name:'木立の競技場',sky:0x8dbbca,horizon:0xe9edc9,floor:0xc6c7a0,accent:0x599968,landmark:'forest-terraces'},
 city:{name:'街のスタジアム',sky:0x7195c3,horizon:0xf4dac5,floor:0xaebfcb,accent:0x7b71b5,landmark:'skyline'},
 sky:{name:'雲上の競技場',sky:0x568cbd,horizon:0xf1f7f4,floor:0xe5e8df,accent:0x66b7ce,landmark:'cloud-islands'},
 river:{name:'水辺の競技場',sky:0x80bbd0,horizon:0xe1eee6,floor:0xbccdc1,accent:0x4fa8aa,landmark:'water-arcades'},
 grand:{name:'グランド・スタジアム',sky:0x6e9fca,horizon:0xf2e3c5,floor:0xe4d9bd,accent:0xc6a45a,landmark:'grand-colonnade'}
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const hash=text=>{let n=2166136261;for(const c of String(text||''))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
export function tournamentMoveFamily(style='route'){
 if(/thunder|spark|electric|lightning/.test(style))return'thunder';
 if(/water|river|tide|wave|bubble|mirror/.test(style))return'water';
 if(/wind|air|yura|wing|cloud|storm/.test(style))return'wind';
 if(/bloom|flower|leaf|sprout|petal|forest/.test(style))return'bloom';
 if(/ember|fire|flame|solar/.test(style))return'flame';
 if(/laser|beam|flash|prism|lamp|light|city|gate/.test(style))return'beam';
 if(/star|comet|meteor/.test(style))return'star';
 return'dash';
}
export function tournamentPresentationFrame(seconds,cue={}){
 const t=Math.max(0,Number(seconds)||0),release=Math.max(.1,Number(cue.releaseAt)||2.7),impact=Math.max(release+.2,Number(cue.impactAt)||5.32),flight=smooth((t-release)/(impact-release)),after=t-impact;
 return {time:t,cast:smooth((t-.5)/Math.max(.4,release-.5)),flight,travelling:t>=release&&t<impact,impact:after>=0&&after<.72,impactAge:Math.max(0,after),flash:cue.hit===false?0:Math.max(0,1-after/.48)*(after>=0?1:0),dodge:cue.hit===false?Math.sin(clamp((t-(impact-.5))/1.05)*Math.PI):0,recoil:tournamentHitReactionFrame(t,cue).recoil,hitReaction:tournamentHitReactionFrame(t,cue),decided:typeof cue.winner==='string'&&t>=(cue.decisionAt??impact+1.8),family:tournamentMoveFamily(cue.visualType||cue.baseType||cue.style),seed:hash(cue.visualType||cue.moveName)};
}
function disposeTree(root){const geometries=new Set(),materials=new Set(),textures=new Set();root?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());root?.removeFromParent();}
function stoneTexture(T,documentTarget){
 if(!documentTarget?.createElement)return null;
 const canvas=documentTarget.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');if(!c)return null;
 c.fillStyle='#d7d4c5';c.fillRect(0,0,256,256);let seed=91403;
 for(let i=0;i<7000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%256;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=seed%256;c.fillStyle=i%3?'#b4b3a519':'#fffbed37';c.fillRect(x,y,1+i%3,1);}
 c.strokeStyle='#8d9c952b';c.lineWidth=1;for(let x=0;x<=256;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,256);c.stroke();}for(let y=0;y<=256;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();}
 const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(5,5);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export const TOURNAMENT_AUTHORED_MOVES=Object.freeze([{"name":"こみちの灯","family":"walk","tier":"weak","style":"walk-lamp-step","motif":"steps","accent":"#ffe47a","travel":"none","impact":"ground"},{"name":"風標のきらめき","family":"walk","tier":"medium","style":"walk-signpost-beam","motif":"chevron","accent":"#9ff2cb","travel":"none","impact":"burst"},{"name":"路地星フレア","family":"walk","tier":"strong","style":"walk-roadstar-comet","motif":"comet","accent":"#ffd35c","travel":"arc","impact":"star"},{"name":"そよ雲","family":"sky","tier":"weak","style":"sky-cloud-puff","motif":"cloud","accent":"#e6fbff","travel":"none","impact":"cloud"},{"name":"気流の紋","family":"sky","tier":"medium","style":"sky-jetstream-rune","motif":"rune","accent":"#82e8ff","travel":"arc","impact":"ring"},{"name":"ソラノフレア","family":"sky","tier":"strong","style":"sky-sunburst-column","motif":"sunColumn","accent":"#fff09a","travel":"none","impact":"column"},{"name":"街灯の粒","family":"city","tier":"weak","style":"city-lamppost-pop","motif":"lamps","accent":"#ffd58a","travel":"none","impact":"ground"},{"name":"街灯ルーン","family":"city","tier":"medium","style":"city-rune-grid","motif":"grid","accent":"#d9a7ff","travel":"none","impact":"grid"},{"name":"シティスター","family":"city","tier":"strong","style":"city-tower-laser","motif":"tower","accent":"#9cecff","travel":"none","impact":"column"},{"name":"しずく弾","family":"river","tier":"weak","style":"river-drop-arc","motif":"drop","accent":"#78e4ff","travel":"arc","impact":"wave"},{"name":"波紋ライト","family":"river","tier":"medium","style":"river-ripple-gate","motif":"waterGate","accent":"#79cfff","travel":"none","impact":"gate"},{"name":"アクアミラージュ","family":"river","tier":"strong","style":"river-mirage-tide","motif":"tide","accent":"#91efff","travel":"none","impact":"wave"},{"name":"朝焼けの粒","family":"night","tier":"weak","style":"ake-ember-rise","motif":"embers","accent":"#ff9f68","travel":"none","impact":"burst"},{"name":"暁のルーン","family":"night","tier":"medium","style":"ake-sunrise-fan","motif":"sunFan","accent":"#ffc25f","travel":"none","impact":"fan"},{"name":"アケノフレア","family":"night","tier":"strong","style":"ake-solar-crown","motif":"solarCrown","accent":"#ffe36e","travel":"none","impact":"crown"},{"name":"ゆらぎの粒","family":"luck","tier":"weak","style":"yura-wobble-orbit","motif":"orbit","accent":"#d8b1ff","travel":"none","impact":"orbit"},{"name":"幻灯ルーン","family":"luck","tier":"medium","style":"yura-phantom-lanterns","motif":"phantomLanternArray","accent":"#f2c1ff","travel":"none","impact":"grid"},{"name":"ユラノミラージュ","family":"luck","tier":"strong","style":"yura-mirror-maze","motif":"mirrors","accent":"#b8edff","travel":"none","impact":"shards"},{"name":"若葉の灯","family":"leaf","tier":"weak","style":"leaf-sprout-pop","motif":"sprout","accent":"#aaef7f","travel":"none","impact":"ground"},{"name":"森風の紋","family":"leaf","tier":"medium","style":"leaf-forest-crest","motif":"forestCrest","accent":"#74dc96","travel":"none","impact":"crest"},{"name":"深緑ルミナ","family":"leaf","tier":"strong","style":"leaf-vine-bloom","motif":"vineBloom","accent":"#ffb7dd","travel":"none","impact":"petals"},{"name":"光の粒","family":"default","tier":"weak","style":"white-prism-dot","motif":"prism","accent":"#ffffff","travel":"none","impact":"prism"},{"name":"魔法の紋","family":"default","tier":"medium","style":"white-magic-gate","motif":"magicGate","accent":"#d8f7ff","travel":"none","impact":"gate"},{"name":"星光フレア","family":"default","tier":"strong","style":"white-star-crest","motif":"starCrest","accent":"#fff0a5","travel":"none","impact":"star"}]);
// The same baked, irregular cloud technique used by the coastal scenic sky.
let tournamentBakedCloudPixels=null;
function tournamentCloudMap(T,doc){
 if(!doc?.createElement)return null;
 if(!tournamentBakedCloudPixels){const c=doc.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');if(!ctx)return null;const im=ctx.createImageData(c.width,c.height),densities=new Float32Array(c.width*c.height);
  const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^8917;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;};
  const noise=(x,y,period)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash((ix+period)%period,iy),b=hash((ix+1+period)%period,iy),d=hash((ix+period)%period,iy+1),e=hash((ix+1+period)%period,iy+1);return a+(b-a)*u+(d-a)*v+(a-b-d+e)*u*v;};
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){let value=0,weight=.54;for(let k=0;k<5;k++){const f=2**k;value+=noise(x/c.width*24*f,y/c.height*9*f,24*f)*weight;weight*=.49;}densities[y*c.width+x]=value;}
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=y*c.width+x,d=densities[i],edge=clamp((d-.49)/.18),up=densities[Math.max(0,y-3)*c.width+x],shade=clamp(.7+(d-up)*5);im.data[i*4]=174+shade*80;im.data[i*4+1]=190+shade*64;im.data[i*4+2]=205+shade*49;im.data[i*4+3]=Math.round(edge*edge*(3-2*edge)*255);}ctx.putImageData(im,0,0);tournamentBakedCloudPixels=c;
 }
 const texture=new T.CanvasTexture(tournamentBakedCloudPixels);texture.wrapS=T.RepeatWrapping;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;return texture;
}
function createTournamentScenicSkyMaterial(T,doc,key){return new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{uTime:{value:0},uClouds:{value:tournamentCloudMap(T,doc)},uCloudSea:{value:key==='sky'?1:0},uZenith:{value:new T.Color(key==='city'?0x5784a2:0x477fa7)},uHorizon:{value:new T.Color(key==='city'?0xe2cebd:0xc9dce1)},uSun:{value:new T.Vector3(-.48,.4,.74).normalize()}},vertexShader:'varying vec3 vP;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vP;uniform float uTime,uCloudSea;uniform vec3 uZenith,uHorizon,uSun;uniform sampler2D uClouds;void main(){vec3 d=normalize(vP-cameraPosition);float h=max(d.y,0.),sd=max(0.,dot(d,uSun));vec3 c=mix(uHorizon,uZenith,pow(h,.55));c+=vec3(1.,.8,.56)*(pow(sd,180.)*.32+pow(sd,2600.)*2.);vec2 uv=vec2(atan(d.x,d.z)/6.283185+.5+uTime*.00035,1.-clamp(d.y*1.5,0.,1.));vec4 cloud=texture2D(uClouds,uv);float cover=cloud.a*smoothstep(.025,.08,h)*(1.-smoothstep(.55,.86,h));vec3 light=mix(cloud.rgb*.86,uHorizon,.17);c=mix(c,light,cover*.96);if(uCloudSea>.5){float lower=1.-smoothstep(-.09,.025,d.y);vec4 billow=texture2D(uClouds,vec2(atan(d.x,d.z)/6.283185+.5+uTime*.00008,clamp(-d.y*.8,.02,.98)));vec3 mist=mix(uHorizon,vec3(.92,.96,1.),.38);c=mix(c,mix(mist,billow.rgb,billow.a*.65),lower);}gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});}

// Presentation artwork. Original competition identities and battle rules are inputs.
function tournamentNoise(x,z,seed=0){const s=Math.sin(x*127.1+z*311.7+seed*74.7)*43758.5453;return s-Math.floor(s);}
function tournamentFbm(x,z){let v=0,a=.5;for(let i=0;i<5;i++){const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),w=fz*fz*(3-2*fz);v+=a*((1-u)*(1-w)*tournamentNoise(ix,iz)+u*(1-w)*tournamentNoise(ix+1,iz)+(1-u)*w*tournamentNoise(ix,iz+1)+u*w*tournamentNoise(ix+1,iz+1));x=x*2.03+17.8;z=z*2.03-8.2;a*=.5;}return v;}
function tournamentSurfaceMaps(T,doc,kind){
 if(!doc?.createElement)return{};const c=doc.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');if(!g)return{};
 const marble=kind==='marble',bark=kind==='bark';g.fillStyle=bark?'#635548':marble?'#b6bab5':'#a3a18e';g.fillRect(0,0,512,512);
 let random=78231;const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
 if(!bark){for(let row=0;row<8;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*64;g.fillStyle=`hsl(${marble?53:43} ${marble?6:11}% ${55+next()*4}%)`;g.fillRect(x+1,y+1,125,61);g.strokeStyle='#edead22b';g.strokeRect(x+3,y+3,121,57);}}
 for(let i=0;i<28000;i++){const x=next()*512,y=next()*512,q=next();g.fillStyle=q<.5?'#151b1222':'#faf7df24';g.fillRect(x,y,bark?.5:next()*2+.4,bark?next()*42+2:next()*2+.4);}
 for(let i=0;i<(bark?90:30);i++){const x=next()*512,y=next()*512;g.beginPath();g.moveTo(x,y);for(let j=0;j<8;j++)g.lineTo(x+(j-4)*(bark?2:8)+Math.sin(j*2+i)*3,y+j*(bark?12:4));g.strokeStyle=marble?'#414c4135':'#20251832';g.lineWidth=.4+next();g.stroke();}
 const color=new T.CanvasTexture(c);color.colorSpace=T.SRGBColorSpace;color.wrapS=color.wrapT=T.RepeatWrapping;color.repeat.set(bark?1:7,bark?3:7);color.anisotropy=4;
 const rough=c.cloneNode();const r=rough.getContext('2d');r.drawImage(c,0,0);const data=r.getImageData(0,0,512,512);for(let i=0;i<data.data.length;i+=4){const v=(data.data[i]+data.data[i+1]+data.data[i+2])/3;data.data[i]=data.data[i+1]=data.data[i+2]=v;}r.putImageData(data,0,0);const bump=new T.CanvasTexture(rough);bump.wrapS=bump.wrapT=T.RepeatWrapping;bump.repeat.copy(color.repeat);return{map:color,bumpMap:bump,bumpScale:bark?.13:.055,roughnessMap:bump};
}
function tournamentLeafTexture(T,doc){if(!doc?.createElement)return null;const c=doc.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');if(!g)return null;for(let i=0;i<55;i++){const a=i*2.39996,r=Math.sqrt((i+.5)/55)*49,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;g.fillStyle=i%3?'#90a673':'#b6bd89';g.beginPath();g.ellipse(x,y,7+i%4,3+i%3,a,0,Math.PI*2);g.fill();}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
function createTournamentCinematicArena(T,key='rookie',{documentTarget=globalThis.document}={}){
 const theme=TOURNAMENT_ARENAS[key]||TOURNAMENT_ARENAS.rookie,root=new T.Group(),animated=[];root.name='tournament-arena-'+key;root.userData.landmark=theme.landmark;root.userData.artRevision='12138';
 const stoneMaps=tournamentSurfaceMaps(T,documentTarget,key==='grand'||key==='sky'?'marble':'stone'),barkMaps=tournamentSurfaceMaps(T,documentTarget,'bark');
 const mat=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.87,...opts});
 const stone=mat(key==='grand'?0xb8b2a1:key==='sky'?0xb5c1c2:0xaba693,{...stoneMaps}),edge=mat(0xb2aa96,{...stoneMaps}),mortar=mat(0x746e60,{...stoneMaps,bumpScale:.09}),wood=mat(0xb5aa98,{...barkMaps}),metal=mat(0x3f4a45,{metalness:.78,roughness:.36}),bronze=mat(0x9b824e,{metalness:.65,roughness:.33}),leafMaterial=mat(key==='rookie'?0x72845a:0x5b7451,{side:T.DoubleSide,alphaTest:.45,map:tournamentLeafTexture(T,documentTarget)});
 const mesh=(geo,m,x=0,y=0,z=0,parent=root)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o;};
 const box=(w,h,d,x,y,z,m=stone,parent=root)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const cyl=(a,b,h,x,y,z,m=stone,parent=root,n=48)=>mesh(new T.CylinderGeometry(a,b,h,n),m,x,y,z,parent);
 const beam=(from,to,r,m,parent=root)=>{const a=new T.Vector3(...from),b=new T.Vector3(...to),delta=b.clone().sub(a),o=mesh(new T.CylinderGeometry(r,r*1.12,delta.length(),10),m,...a.clone().add(b).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;};
 const annulus=(inner,outer,y,m,begin=0,arc=Math.PI*2,parent=root)=>{const geo=new T.RingGeometry(inner,outer,128,1,begin,arc);geo.rotateX(-Math.PI/2);return mesh(geo,m,0,y,0,parent);};
 const skyMaterial=createTournamentScenicSkyMaterial(T,documentTarget,key);const dome=mesh(new T.SphereGeometry(360,40,24),skyMaterial);dome.castShadow=dome.receiveShadow=false;
 // The arena is a built stone floor; broad terraces have solid front and back walls.
 cyl(27.6,28.2,1.8,0,-.9,0,mortar);cyl(27.5,27.5,.18,0,-.01,0,stone);annulus(25.7,26.1,.095,bronze);annulus(22.7,22.78,.096,mortar);annulus(5.8,5.86,.097,mortar);
 for(const x of[-9,9]){const r=mesh(new T.RingGeometry(3.7,3.75,72),bronze,x,.1,0);r.rotation.x=-Math.PI/2;}
 for(let level=0;level<(key==='river'?1:key==='sky'?3:7);level++){const inner=29+level*1.9,outer=inner+1.9,y=.65+level*.72;const section=new T.Shape();section.absarc(0,0,outer,0,Math.PI,false);section.absarc(0,0,inner,Math.PI,0,true);section.closePath();const geometry=new T.ExtrudeGeometry(section,{depth:.72,bevelEnabled:true,bevelThickness:.05,bevelSize:.07,bevelSegments:2,curveSegments:64,steps:1});geometry.rotateX(-Math.PI/2);mesh(geometry,stone,0,y-.72,0);}
 const seats=new T.InstancedMesh(new T.BoxGeometry(3.45,.17,.75),wood,7*27),seatPose=new T.Object3D();let seatIndex=0;for(let row=0;row<(key==='river'?1:key==='sky'?3:7);row++)for(let col=0;col<27;col++){const a=(col+.5)/27*Math.PI,r=29.9+row*1.9;seatPose.position.set(Math.cos(a)*r,.84+row*.72,-Math.sin(a)*r);seatPose.rotation.y=a+Math.PI/2;seatPose.updateMatrix();seats.setMatrixAt(seatIndex++,seatPose.matrix);}seats.count=seatIndex;seats.castShadow=seats.receiveShadow=true;root.add(seats);
 // Organic terrain and several depths of forest keep the buildings in a real landscape.
 if(key!=='sky'){
  const terrain=new T.PlaneGeometry(700,700,95,95);terrain.rotateX(-Math.PI/2);const p=terrain.attributes.position,colors=[];for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),amount=smooth((r-140)/130),n=tournamentFbm(x*.012,z*.012);p.setY(i,-2+amount*(n*62-8)+(r>140?Math.sin(x*.015)*9:0));const c=new T.Color().setHSL(.23+n*.035,.16,.24+n*.18);colors.push(c.r,c.g,c.b);}terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();mesh(terrain,mat(0xffffff,{vertexColors:true,roughness:1}));
 }
 function forest(count,radius,zOffset=0){const trunkGeo=new T.CylinderGeometry(.38,.62,1,10),trunks=new T.InstancedMesh(trunkGeo,wood,count*4),crownGeo=new T.SphereGeometry(1,16,12),p=crownGeo.attributes.position,c=[];for(let i=0;i<p.count;i++){const n=tournamentNoise(i,31),k=.82+n*.36;p.setXYZ(i,p.getX(i)*k,p.getY(i)*k,p.getZ(i)*k);const color=new T.Color().setHSL(.25,.21,.17+n*.12);c.push(color.r,color.g,color.b);}crownGeo.setAttribute('color',new T.Float32BufferAttribute(c,3));crownGeo.computeVertexNormals();const crownMaterial=mat(0xffffff,{vertexColors:true,roughness:.85,bumpMap:leafMaterial.map,bumpScale:.035}),leaves=new T.InstancedMesh(crownGeo,crownMaterial,count*13),dummy=new T.Object3D();let ti=0,li=0;for(let i=0;i<count;i++){const angle=.12+i/count*Math.PI*.93,r=radius+(i%4)*11,x=Math.cos(angle)*r,z=-Math.sin(angle)*r+zOffset,dist=Math.hypot(x,z),ground=-2+smooth((dist-140)/130)*(tournamentFbm(x*.012,z*.012)*62-8)+(dist>140?Math.sin(x*.015)*9:0),h=13+tournamentNoise(i,7)*9;dummy.position.set(x,ground+h*.43,z);dummy.scale.set(1,h,.95);dummy.rotation.set(0,i*1.2,0);dummy.updateMatrix();trunks.setMatrixAt(ti++,dummy.matrix);for(let j=0;j<3;j++){dummy.position.set(x+Math.sin(j*2+i)*1.2,ground+h*(.43+j*.12),z+Math.cos(j*2+i));dummy.rotation.set(.5*Math.sin(j+i),0,.55*Math.cos(j+i));dummy.scale.set(.5,h*.45,.5);dummy.updateMatrix();trunks.setMatrixAt(ti++,dummy.matrix);}for(let j=0;j<13;j++){const a=j*2.39996+i,rj=Math.sqrt((j+.3)/13)*5.0;dummy.position.set(x+Math.cos(a)*rj,ground+h*.74+Math.sin(j*1.7)*3.3,z+Math.sin(a)*rj);dummy.rotation.set(Math.sin(j+i)*.4,a,0);dummy.scale.set(3.0+j%3*.7,2.4+j%4*.5,3.0+j%3*.6);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);}}trunks.castShadow=trunks.receiveShadow=true;leaves.castShadow=leaves.receiveShadow=true;root.add(trunks,leaves);}
 if(key!=='sky')forest(key==='green'?52:key==='city'?14:28,key==='green'?68:83,key==='city'?-28:0);
 const railing=(x,z,angle=0)=>{const group=new T.Group();group.position.set(x,0,z);group.rotation.y=angle;root.add(group);for(const px of[-3,3]){cyl(.09,.13,3,px,1.5,0,metal,group,8);cyl(.19,.19,.12,px,3.1,0,bronze,group,12);}for(const y of[1.1,2.9])beam([-3,y,0],[3,y,0],.08,metal,group);return group;};
 for(let i=0;i<10;i++){const a=i/9*Math.PI,p=new T.Vector3(Math.cos(a)*27.9,0,-Math.sin(a)*27.9);railing(p.x,p.z,-a-Math.PI/2);}
 function arch(x,z,w,h,depth=1.6){const group=new T.Group();group.position.set(x,0,z);root.add(group);const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h);shape.lineTo(-w/2,h);shape.closePath();const hole=new T.Path(),r=w*.32,cy=h*.7;hole.moveTo(-r,0);hole.lineTo(-r,cy);hole.absarc(0,cy,r,Math.PI,0,true);hole.lineTo(r,0);hole.closePath();shape.holes.push(hole);const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.06,bevelThickness:.06,curveSegments:18});mesh(g,stone,0,0,-depth/2,group);box(w+.35,.55,depth+.4,0,h+.24,0,edge,group);box(w+.5,.6,depth+.55,0,.3,0,edge,group);for(const side of[-1,1]){box(.32,h*.7,.24,side*(r+.2),h*.35,depth*.55,edge,group);}return group;}
 function pavilion(x,z){const g=new T.Group();g.position.set(x,0,z);root.add(g);for(const a of[-4.5,4.5])for(const b of[-3.3,3.3]){box(.48,8.5,.48,a,4.25,b,wood,g);box(.9,.45,.9,a,.22,b,edge,g);beam([a,6.3,b],[a-Math.sign(a)*1.6,8.1,b],.16,wood,g);}for(const b of[-3.3,3.3])box(10.2,.45,.45,0,8.15,b,wood,g);for(const side of[-1,1]){const roof=box(6.1,.22,9.2,side*2.6,9.4,0,mat(0x4c5651,{...stoneMaps}),g);roof.rotation.z=-side*.43;}beam([0,10.6,-4.5],[0,10.6,4.5],.16,wood,g);box(9,.6,1.6,0,1.35,2.4,wood,g);for(const a of[-3.5,3.5])box(.4,1.4,1.4,a,.7,2.4,wood,g);}
 if(key==='rookie'){pavilion(-21,-28);pavilion(21,-28);box(21,3,1,0,1.5,-40,mortar);for(const x of[-7,0,7]){const plaque=box(3.6,1.8,.18,x,2,-39.4,bronze);plaque.userData.arenaDetail='carved-plaque';}}
 if(key==='green'){for(const x of[-24,24]){arch(x,-29,7,10,2.8);const roof=box(8.7,.45,5,x,11,-29,wood);roof.rotation.z=x<0?.04:-.04;}for(const x of[-12,0,12]){box(9,.65,2,x,1.2,-31,wood);for(const dx of[-3,3])box(.6,1.1,1.5,x+dx,.55,-31,mortar);}}
 if(key==='city'){
  const walls=mat(0x73818a,{...stoneMaps,metalness:.12,roughness:.68}),glass=mat(0x57717c,{metalness:.55,roughness:.19}),lit=mat(0xc9b48b,{emissive:0xd6b57d,emissiveIntensity:.18}),windows=new T.InstancedMesh(new T.BoxGeometry(.92,1.38,.12),glass,1500),warmWindows=new T.InstancedMesh(new T.BoxGeometry(.9,1.36,.13),lit,500),floorBands=new T.InstancedMesh(new T.BoxGeometry(7.15,.14,.24),metal,500),dummy=new T.Object3D();let n=0,warm=0,bands=0;
  for(let i=0;i<17;i++){const x=(i-8)*9,z=-65-(i%3)*12,h=15+(i*17%37),m=i%3===0?glass:walls;box(7,h,8,x,h/2-1,z,m);box(7.5,.6,8.5,x,h-.7,z,metal);for(let y=2;y<h-2;y+=2.7){dummy.position.set(x,y-.87,z+4.15);dummy.updateMatrix();floorBands.setMatrixAt(bands++,dummy.matrix);for(let k=0;k<3;k++){dummy.position.set(x-2.1+k*2.1,y,z+4.1);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();windows.setMatrixAt(n++,dummy.matrix);if((Math.round(y)*3+k+i*7)%5===0)warmWindows.setMatrixAt(warm++,dummy.matrix);}}for(const sx of[-3,3])box(.2,h,.2,x+sx,h/2-1,z+4.18,metal);}windows.count=n;warmWindows.count=warm;floorBands.count=bands;root.add(windows,warmWindows,floorBands);for(const x of[-23,23]){arch(x,-31,9,13,2);cyl(.13,.22,11,x,5.5,-16,metal,root,12);const lamp=cyl(1.1,1.5,.35,x,11,-16,metal,root,20);cyl(.8,.8,.1,x,10.8,-16,lit,root,20);}
 }
 if(key==='grand'){for(let i=-4;i<=4;i++){const x=i*8.3;arch(x,-36,8.1,i===0?17:14.3,2.4);if(i!==0){const banner=box(1.7,6,.08,x,10.3,-34.6,mat(i%2?0x354f64:0x6d4340));banner.name='woven-championship-banner';}}box(78,1,3.7,0,15,-36,edge);for(const x of[-34,34]){cyl(1.1,1.4,16,x,8,-30,stone);box(3.6,.8,3.6,x,16,-30,edge);cyl(1.7,1.2,1,x,17,-30,bronze);}}
 if(key==='river'){
  const waterMaterial=new T.ShaderMaterial({transparent:true,uniforms:{uTime:{value:0}},vertexShader:'varying vec3 p;varying vec3 world;void main(){p=position;world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',fragmentShader:`varying vec3 p,world;uniform float uTime;void main(){vec2 q=world.xz;float waves=sin(q.x*.32+uTime*.8)*cos(q.y*.23-uTime*.6)+sin(q.x*.79-q.y*.52+uTime)*.35;vec3 normal=normalize(vec3(cos(q.x*.32+uTime*.8)*.12,1.,sin(q.y*.23-uTime*.6)*.1));vec3 viewDir=normalize(cameraPosition-world);float fresnel=pow(1.-max(dot(normal,viewDir),0.),3.);float spec=pow(max(dot(reflect(-normalize(vec3(-.4,.7,.5)),normal),viewDir),0.),150.);vec3 c=mix(vec3(.075,.22,.24),vec3(.47,.61,.61),fresnel)+waves*.018+spec*vec3(1.,.88,.65)*2.;gl_FragColor=vec4(c,.97);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});const water=mesh(new T.PlaneGeometry(550,550),waterMaterial,0,-1.8,-100);water.rotation.x=-Math.PI/2;water.castShadow=false;animated.push(waterMaterial);for(const x of[-42,42]){box(13,2.5,82,x,-.75,-42,mortar);for(const z of[-25,-36,-47,-58])arch(x,z,9,8,1.6);}box(14,1.4,27,0,-.65,-40,stone);for(const x of[-7,7])for(const z of[-32,-40,-48])railing(x,z,Math.PI/2);
 }
 if(key==='sky'){
  const cliff=new T.CylinderGeometry(27,9,37,75,12),p=cliff.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+(tournamentNoise(i%76,Math.round(y)*2)-.5)*.16;p.setXYZ(i,x*k,y,z*k);}cliff.computeVertexNormals();mesh(cliff,mat(0x747d7d,{...stoneMaps,bumpScale:.2}),0,-20,0);for(const x of[-22,22])arch(x,-29,9,12,2.3);box(12,1,24,0,-.4,-35,stone);for(const x of[-6,6])railing(x,-39,Math.PI/2);
 }
 return{root,key:TOURNAMENT_ARENAS[key]?key:'rookie',theme,update(time){skyMaterial.uniforms.uTime.value=time;for(const m of animated)m.uniforms.uTime.value=time;},dispose(){skyMaterial.uniforms.uClouds.value?.dispose();disposeTree(root);}};
}

function createTournamentLightingEnvironment(T,doc){if(!doc?.createElement)return null;const faces=[];for(let i=0;i<6;i++){const c=doc.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');if(!g)return null;const sky=g.createLinearGradient(0,0,0,64);sky.addColorStop(0,i===3?'#65635a':'#b1c8d7');sky.addColorStop(.48,i===2?'#e4e9e4':'#d8d9cc');sky.addColorStop(.53,'#929a88');sky.addColorStop(1,'#65695b');g.fillStyle=sky;g.fillRect(0,0,64,64);if(i===4){const light=g.createRadialGradient(12,12,0,12,12,28);light.addColorStop(0,'#fff2c7');light.addColorStop(.2,'#e3d6ad');light.addColorStop(1,'#ddddcc00');g.fillStyle=light;g.fillRect(0,0,64,64);}faces.push(c);}const texture=new T.CubeTexture(faces);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;return texture;}

// One circle is added by each existing strength sound. The audible path advances
// on actual media playback; the silent/seeking path uses its original 0.45s beat.
export function tournamentChargeFrame(tier,seconds,releaseAt,sequence=null){
 const limit=tier==='strong'?3:tier==='medium'?2:1,startAt=1.4,interval=.45;
 const state=sequence?.sample?.(),audible=!!state?.audible;
 const raw=audible?state.count:seconds<startAt?0:Math.min(limit,1+Math.floor((seconds-startAt+1e-8)/interval));
 const count=seconds<=releaseAt+.14?Math.max(0,Math.min(limit,raw)):0;
 const age=audible?state.age:seconds-(startAt+(Math.max(1,count)-1)*interval);
 const fade=Math.max(0,Math.min(1,(releaseAt+.14-seconds)/.14));
 return{count,limit,startAt,interval,age,pulse:count?Math.exp(-Math.max(0,age)/.105):0,alpha:count?fade:0};
}
export function createTournamentChargeSequence(tier,{audible=false,clock=()=>performance.now()/1000}={}){
 const limit=tier==='strong'?3:tier==='medium'?2:1,heard=new Set();let count=0,last=-Infinity,active=audible;
 return{notify(index){if(index<0){active=false;return;}if(!heard.has(index)&&count<limit){heard.add(index);count++;last=clock();}},sample(){return{audible:active,count,age:clock()-last};}};
}

// GENERATED from the original authored renderer. Do not approximate its paths.
export const TOURNAMENT_ORIGINAL_ART_SHA256="f3b41c5e8c3eba9840f127401ddeab87191dc0aedc47a6350ef55c8adb3f9757";
export function createTournamentAuthoredSource(){
function battleModernVfxClamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
function battleModernVfxEase(value) {
  const progress = battleModernVfxClamp(value);
  return 1 - Math.pow(1 - progress, 3);
}
function battleModernVfxHash(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function battleModernVfxRandom(seed) {
  let value = seed >>> 0 || 1;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
function battleModernVfxRgb(color) {
  let hex = String(color || "").trim().replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(char => char + char).join("");
  if (!/^[0-9a-f]{6}$/i.test(hex)) hex = "8ee7ff";
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
function battleModernVfxRgba(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${battleModernVfxClamp(alpha)})`;
}
function battleModernVfxFamily(baseType, sceneType) {
  if (baseType !== "custom") return baseType;
  if (sceneType.startsWith("walk-")) return "route";
  if (sceneType.startsWith("sky-")) return sceneType.includes("sunburst") ? "starfall" : "wind";
  if (sceneType.startsWith("city-")) return "city-spark";
  if (sceneType.startsWith("river-")) return "water";
  if (sceneType.startsWith("ake-")) return "flash";
  if (sceneType.startsWith("yura-")) return "wind";
  if (sceneType.startsWith("leaf-")) return "wind";
  if (sceneType.startsWith("white-")) return sceneType.includes("gate") ? "route" : "flash";
  return "route";
}
/* Each authored move keeps a distinct foreground silhouette instead of sharing one generic projectile. */
const battleModernVfxProfiles = Object.freeze({
  "walk-lamp-step": { motif: "steps", accent: "#ffe47a", travel: "none", impact: "ground" },
  "walk-signpost-beam": { motif: "chevron", accent: "#9ff2cb", travel: "none", impact: "burst" },
  "walk-roadstar-comet": { motif: "comet", accent: "#ffd35c", travel: "arc", impact: "star" },
  "sky-cloud-puff": { motif: "cloud", accent: "#e6fbff", travel: "none", impact: "cloud" },
  "sky-jetstream-rune": { motif: "rune", accent: "#82e8ff", travel: "arc", impact: "ring" },
  "sky-sunburst-column": { motif: "sunColumn", accent: "#fff09a", travel: "none", impact: "column" },
  "city-lamppost-pop": { motif: "lamps", accent: "#ffd58a", travel: "none", impact: "ground" },
  "city-rune-grid": { motif: "grid", accent: "#d9a7ff", travel: "none", impact: "grid" },
  "city-tower-laser": { motif: "tower", accent: "#9cecff", travel: "none", impact: "column" },
  "river-drop-arc": { motif: "drop", accent: "#78e4ff", travel: "arc", impact: "wave" },
  "river-ripple-gate": { motif: "waterGate", accent: "#79cfff", travel: "none", impact: "gate" },
  "river-mirage-tide": { motif: "tide", accent: "#91efff", travel: "none", impact: "wave" },
  "ake-ember-rise": { motif: "embers", accent: "#ff9f68", travel: "none", impact: "burst" },
  "ake-sunrise-fan": { motif: "sunFan", accent: "#ffc25f", travel: "none", impact: "fan" },
  "ake-solar-crown": { motif: "solarCrown", accent: "#ffe36e", travel: "none", impact: "crown" },
  "yura-wobble-orbit": { motif: "orbit", accent: "#d8b1ff", travel: "none", impact: "orbit" },
  "yura-phantom-lanterns": { motif: "phantomLanternArray", accent: "#f2c1ff", travel: "none", impact: "grid" },
  "yura-mirror-maze": { motif: "mirrors", accent: "#b8edff", travel: "none", impact: "shards" },
  "leaf-sprout-pop": { motif: "sprout", accent: "#aaef7f", travel: "none", impact: "ground" },
  "leaf-forest-crest": { motif: "forestCrest", accent: "#74dc96", travel: "none", impact: "crest" },
  "leaf-vine-bloom": { motif: "vineBloom", accent: "#ffb7dd", travel: "none", impact: "petals" },
  "white-prism-dot": { motif: "prism", accent: "#ffffff", travel: "none", impact: "prism" },
  "white-magic-gate": { motif: "magicGate", accent: "#d8f7ff", travel: "none", impact: "gate" },
  "white-star-crest": { motif: "starCrest", accent: "#fff0a5", travel: "none", impact: "star" }
});
function battleModernVfxProfile(sceneType) {
  return battleModernVfxProfiles[String(sceneType || "")] || null;
}
function battleModernVfxPoint(start, target, progress, curveHeight) {
  const p = battleModernVfxClamp(progress);
  const inverse = 1 - p;
  const middleX = (start.x + target.x) / 2;
  const middleY = Math.min(start.y, target.y) + curveHeight;
  return {
    x: (inverse * inverse * start.x) + (2 * inverse * p * middleX) + (p * p * target.x),
    y: (inverse * inverse * start.y) + (2 * inverse * p * middleY) + (p * p * target.y)
  };
}
function battleModernVfxBloom(ctx, x, y, radius, rgb, alpha) {
  if (alpha <= 0 || radius <= 0) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255,255,255,${battleModernVfxClamp(alpha * .96)})`);
  gradient.addColorStop(.1, battleModernVfxRgba(rgb, alpha * .86));
  gradient.addColorStop(.42, battleModernVfxRgba(rgb, alpha * .28));
  gradient.addColorStop(1, battleModernVfxRgba(rgb, 0));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}
function battleModernVfxStrokeLayers(ctx, trace, rgb, accentRgb, alpha, width) {
  if (alpha <= 0 || width <= 0) return;
  const canvasWidth = ctx.canvas?.clientWidth || 420;
  const canvasHeight = ctx.canvas?.clientHeight || 360;
  const deepRgb = rgb.map(channel => Math.max(2, Math.round(channel * .16)));
  const bodyGradient = ctx.createLinearGradient(0, canvasHeight * .12, canvasWidth, canvasHeight * .88);
  bodyGradient.addColorStop(0, battleModernVfxRgba(accentRgb, alpha * .94));
  bodyGradient.addColorStop(.38, `rgba(255,255,255,${battleModernVfxClamp(alpha * .98)})`);
  bodyGradient.addColorStop(.57, battleModernVfxRgba(rgb, alpha * .96));
  bodyGradient.addColorStop(1, battleModernVfxRgba(deepRgb, alpha * .84));
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.translate(0, Math.max(1, width * .72));
  trace();
  ctx.strokeStyle = battleModernVfxRgba(deepRgb, alpha * .68);
  ctx.lineWidth = width * 2.35;
  ctx.shadowColor = "rgba(1,4,14,.72)";
  ctx.shadowBlur = width * 2.1;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  trace();
  ctx.strokeStyle = battleModernVfxRgba(accentRgb, alpha * .18);
  ctx.lineWidth = width * 5.2;
  ctx.shadowColor = battleModernVfxRgba(accentRgb, .96);
  ctx.shadowBlur = width * 7.2;
  ctx.stroke();
  ctx.save();
  ctx.translate(-Math.max(.45, width * .17), 0);
  trace();
  ctx.strokeStyle = `rgba(255,87,178,${battleModernVfxClamp(alpha * .22)})`;
  ctx.lineWidth = width * 1.9;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(Math.max(.45, width * .17), 0);
  trace();
  ctx.strokeStyle = `rgba(80,220,255,${battleModernVfxClamp(alpha * .24)})`;
  ctx.lineWidth = width * 1.75;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
  trace();
  ctx.strokeStyle = bodyGradient;
  ctx.lineWidth = width * 1.72;
  ctx.shadowColor = battleModernVfxRgba(rgb, .96);
  ctx.shadowBlur = width * 3.5;
  ctx.stroke();
  trace();
  ctx.strokeStyle = `rgba(255,255,255,${battleModernVfxClamp(alpha * .94)})`;
  ctx.lineWidth = Math.max(.65, width * .28);
  ctx.shadowColor = "rgba(255,255,255,.9)";
  ctx.shadowBlur = width * 1.25;
  ctx.stroke();
  ctx.restore();
}
function battleModernVfxFillMaterial(ctx, trace, x, y, radius, rgb, accentRgb, alpha, glass = false) {
  if (alpha <= 0 || radius <= 0) return;
  const deepRgb = rgb.map(channel => Math.max(2, Math.round(channel * .12)));
  const shadowRgb = accentRgb.map(channel => Math.max(4, Math.round(channel * .24)));
  const body = ctx.createRadialGradient(x - radius * .32, y - radius * .38, radius * .04, x, y, radius);
  body.addColorStop(0, `rgba(255,255,255,${battleModernVfxClamp(alpha * .98)})`);
  body.addColorStop(.1, battleModernVfxRgba(accentRgb, alpha * .94));
  body.addColorStop(.34, battleModernVfxRgba(rgb, alpha * (glass ? .66 : .92)));
  body.addColorStop(.7, battleModernVfxRgba(shadowRgb, alpha * (glass ? .52 : .88)));
  body.addColorStop(1, battleModernVfxRgba(deepRgb, alpha * (glass ? .28 : .82)));
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.translate(0, Math.max(1.2, radius * .045));
  trace();
  ctx.fillStyle = `rgba(1,4,14,${battleModernVfxClamp(alpha * .5)})`;
  ctx.shadowColor = "rgba(1,4,14,.78)";
  ctx.shadowBlur = radius * .22;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  trace();
  ctx.fillStyle = body;
  ctx.shadowColor = battleModernVfxRgba(accentRgb, .9);
  ctx.shadowBlur = radius * .36;
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  const sheen = ctx.createRadialGradient(x - radius * .34, y - radius * .4, 0, x - radius * .18, y - radius * .22, radius * .62);
  sheen.addColorStop(0, `rgba(255,255,255,${battleModernVfxClamp(alpha * .94)})`);
  sheen.addColorStop(.18, `rgba(255,255,255,${battleModernVfxClamp(alpha * .34)})`);
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  trace();
  ctx.fillStyle = sheen;
  ctx.fill();
  trace();
  ctx.strokeStyle = `rgba(255,255,255,${battleModernVfxClamp(alpha * .8)})`;
  ctx.lineWidth = Math.max(.75, radius * .026);
  ctx.shadowColor = battleModernVfxRgba(accentRgb, .92);
  ctx.shadowBlur = radius * .14;
  ctx.stroke();
  ctx.restore();
}
function battleModernVfxDrawLensFlare(ctx, x, y, rgb, accentRgb, alpha, size) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const horizontal = ctx.createLinearGradient(x - size, y, x + size, y);
  horizontal.addColorStop(0, battleModernVfxRgba(rgb, 0));
  horizontal.addColorStop(.32, battleModernVfxRgba(accentRgb, alpha * .22));
  horizontal.addColorStop(.49, `rgba(255,255,255,${battleModernVfxClamp(alpha * .92)})`);
  horizontal.addColorStop(.51, `rgba(255,255,255,${battleModernVfxClamp(alpha * .92)})`);
  horizontal.addColorStop(.68, battleModernVfxRgba(accentRgb, alpha * .22));
  horizontal.addColorStop(1, battleModernVfxRgba(rgb, 0));
  ctx.fillStyle = horizontal;
  ctx.fillRect(x - size, y - 1.15, size * 2, 2.3);
  const vertical = ctx.createLinearGradient(x, y - size * .44, x, y + size * .44);
  vertical.addColorStop(0, battleModernVfxRgba(rgb, 0));
  vertical.addColorStop(.47, battleModernVfxRgba(accentRgb, alpha * .45));
  vertical.addColorStop(.5, `rgba(255,255,255,${battleModernVfxClamp(alpha * .8)})`);
  vertical.addColorStop(.53, battleModernVfxRgba(accentRgb, alpha * .45));
  vertical.addColorStop(1, battleModernVfxRgba(rgb, 0));
  ctx.fillStyle = vertical;
  ctx.fillRect(x - .8, y - size * .44, 1.6, size * .88);
  for (let index = 0; index < 4; index += 1) {
    const offset = (index - 1.5) * size * .23;
    ctx.beginPath();
    ctx.arc(x + offset, y, Math.max(1, size * (.018 + index * .005)), 0, Math.PI * 2);
    ctx.fillStyle = battleModernVfxRgba(index % 2 ? accentRgb : rgb, alpha * (.25 - index * .035));
    ctx.fill();
  }
  ctx.restore();
}
function battleModernVfxStarPath(ctx, x, y, outerRadius, innerRadius, points = 5, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 ? innerRadius : outerRadius;
    const angle = rotation + index * Math.PI / points;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
}
function battleModernVfxPolygonPath(ctx, x, y, radius, sides, rotation = -Math.PI / 2) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index * Math.PI * 2 / sides;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(pointX, pointY);
    else ctx.lineTo(pointX, pointY);
  }
  ctx.closePath();
}
function battleModernVfxDrawCaster(model) {
  const {ctx,start,rgb,strength}=model,charge=model.charge;
  if(!charge?.count)return;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(start.x,start.y+21);
  for(let index=0;index<charge.count;index++){
    const radius=(29+index*13)*strength,newest=index===charge.count-1;
    const flash=charge.pulse*(newest?1:.45),alpha=charge.alpha*(.56+flash*.44);
    ctx.beginPath();ctx.ellipse(0,0,radius,radius*.28,0,0,Math.PI*2);
    ctx.strokeStyle=battleModernVfxRgba(rgb,alpha);ctx.lineWidth=(2.2+flash*1.5)*strength;
    ctx.shadowColor=battleModernVfxRgba(rgb,.95);ctx.shadowBlur=10+flash*22;ctx.stroke();
  }
  ctx.restore();
}
function battleModernVfxDrawTravel(model, opacityScale = 1) {
  const { ctx, local, attackStart, impactTime, start, target, rgb, accentRgb = rgb, strength, curveHeight } = model;
  if (local < attackStart) return null;
  const raw = battleModernVfxClamp((local - attackStart) / Math.max(.2, impactTime - attackStart));
  const progress = battleModernVfxEase(raw);
  const fade = local <= impactTime ? 1 : battleModernVfxClamp(1 - ((local - impactTime) / .52));
  const alpha = fade * opacityScale;
  if (alpha <= 0) return null;
  const tailStart = Math.max(0, progress - .46);
  const tracePath = () => {
    ctx.beginPath();
    for (let index = 0; index <= 22; index += 1) {
      const pointProgress = tailStart + ((progress - tailStart) * index / 22);
      const point = battleModernVfxPoint(start, target, pointProgress, curveHeight);
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
  };
  battleModernVfxStrokeLayers(ctx, tracePath, rgb, accentRgb, alpha, 4.1 * strength);
  const head = battleModernVfxPoint(start, target, progress, curveHeight);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let index = 1; index <= 9; index += 1) {
    const trailProgress = Math.max(0, progress - index * .025);
    const point = battleModernVfxPoint(start, target, trailProgress, curveHeight);
    const trailAlpha = alpha * (1 - index / 10) * .52;
    const prior = battleModernVfxPoint(start, target, Math.max(0, trailProgress - .018), curveHeight);
    ctx.beginPath();
    ctx.moveTo(prior.x, prior.y);
    ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = index % 3 === 0 ? `rgba(255,255,255,${trailAlpha})` : battleModernVfxRgba(index % 2 ? accentRgb : rgb, trailAlpha);
    ctx.lineWidth = Math.max(.65, (4.8 - index * .4) * strength);
    ctx.shadowColor = battleModernVfxRgba(accentRgb, .86);
    ctx.shadowBlur = 7;
    ctx.stroke();
  }
  ctx.restore();
  battleModernVfxBloom(ctx, head.x, head.y, 30 * strength, rgb, alpha * .84);
  return head;
}
function battleModernVfxDrawSlash(model) {
  const { ctx, local, impactTime, target, rgb, accentRgb = rgb, strength, actorDirection, family } = model;
  const startAt = impactTime - .88;
  const progress = battleModernVfxClamp((local - startAt) / 1.08);
  if (progress <= 0 || progress >= 1) return;
  const alpha = Math.sin(progress * Math.PI);
  const slashCount = family === "cross-slash" || strength > 1.2 ? 2 : 1;
  for (let index = 0; index < slashCount; index += 1) {
    const flip = index % 2 ? -1 : 1;
    const offset = index ? 17 : -7;
    const trace = () => {
      ctx.beginPath();
      ctx.moveTo(target.x - actorDirection * 106, target.y + 47 * flip + offset);
      ctx.quadraticCurveTo(target.x - actorDirection * 6, target.y - 72 * flip, target.x + actorDirection * 92, target.y - 39 * flip + offset);
    };
    battleModernVfxStrokeLayers(ctx, trace, rgb, accentRgb, alpha, 4.8 * strength);
  }
}
function battleModernVfxDrawStarfall(model) {
  const { ctx, local, attackStart, impactTime, target, rgb, strength, streaks } = model;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const streak of streaks) {
    const begin = attackStart + streak.delay * Math.max(.35, impactTime - attackStart - .2);
    const progress = battleModernVfxClamp((local - begin) / streak.life);
    if (progress <= 0 || progress >= 1) continue;
    const alpha = Math.sin(progress * Math.PI);
    const endX = target.x + streak.offset;
    const endY = -18 + progress * (target.y + 30);
    ctx.beginPath();
    ctx.moveTo(endX - streak.slant, endY - streak.length);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = battleModernVfxRgba(rgb, alpha * .72);
    ctx.lineWidth = streak.width * strength;
    ctx.shadowColor = battleModernVfxRgba(rgb, .9);
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endX - streak.slant * .72, endY - streak.length * .72);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = `rgba(255,255,255,${alpha * .9})`;
    ctx.lineWidth = Math.max(.7, streak.width * .32 * strength);
    ctx.shadowBlur = 4;
    ctx.stroke();
  }
  ctx.restore();
}
function battleModernVfxDrawWind(model, center) {
  if (!center) return;
  const { ctx, local, rgb, strength } = model;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(center.x, center.y);
  for (let index = 0; index < 4; index += 1) {
    ctx.save();
    ctx.rotate(local * (1.6 + index * .24) * (index % 2 ? -1 : 1));
    ctx.beginPath();
    ctx.ellipse(0, 0, (28 + index * 10) * strength, (10 + index * 4) * strength, 0, .22, Math.PI * 1.72);
    ctx.strokeStyle = index === 1 ? `rgba(255,255,255,.78)` : battleModernVfxRgba(rgb, .62 - index * .08);
    ctx.lineWidth = Math.max(1, (3.8 - index * .55) * strength);
    ctx.shadowColor = battleModernVfxRgba(rgb, .9);
    ctx.shadowBlur = 13;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
function battleModernVfxDrawWater(model, center) {
  if (!center) return;
  const { ctx, local, impactTime, target, rgb, strength } = model;
  const alpha = battleModernVfxClamp((local - (impactTime - .82)) / .28) * battleModernVfxClamp((impactTime + .45 - local) / .55);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let index = 0; index < 3; index += 1) {
    const width = (62 + index * 22) * strength;
    const y = target.y + 24 + index * 8;
    ctx.beginPath();
    ctx.moveTo(target.x - width, y);
    ctx.bezierCurveTo(target.x - width * .45, y - 34 - index * 5, target.x + width * .35, y + 20, target.x + width, y - 7);
    ctx.strokeStyle = index === 0 ? `rgba(255,255,255,${alpha * .84})` : battleModernVfxRgba(rgb, alpha * (.7 - index * .12));
    ctx.lineWidth = Math.max(1, (5.5 - index) * strength);
    ctx.shadowColor = battleModernVfxRgba(rgb, .9);
    ctx.shadowBlur = 16;
    ctx.stroke();
  }
  ctx.restore();
  battleModernVfxBloom(ctx, center.x, center.y, 26 * strength, rgb, alpha * .42);
}
function battleModernVfxDrawCity(model, center) {
  if (!center) return;
  const { ctx, local, impactTime, target, rgb, strength } = model;
  const alpha = battleModernVfxClamp((local - (impactTime - 1.05)) / .35) * battleModernVfxClamp((impactTime + .3 - local) / .48);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(target.x, target.y + 34);
  ctx.strokeStyle = battleModernVfxRgba(rgb, alpha * .6);
  ctx.shadowColor = battleModernVfxRgba(rgb, .92);
  ctx.shadowBlur = 11;
  ctx.lineWidth = 1.2 * strength;
  for (let index = -3; index <= 3; index += 1) {
    ctx.beginPath();
    ctx.moveTo(index * 12, -62);
    ctx.lineTo(index * 25, 36);
    ctx.stroke();
  }
  for (let index = 0; index < 5; index += 1) {
    const y = -48 + index * 20;
    const half = 38 + index * 12;
    ctx.beginPath();
    ctx.moveTo(-half, y);
    ctx.lineTo(half, y);
    ctx.stroke();
  }
  ctx.restore();
  battleModernVfxBloom(ctx, center.x, center.y, 24 * strength, rgb, alpha * .56);
}
function battleModernVfxDrawFlash(model, center) {
  const { ctx, local, impactTime, target, rgb, strength } = model;
  const alpha = battleModernVfxClamp((local - (impactTime - .48)) / .16) * battleModernVfxClamp((impactTime + .38 - local) / .48);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(target.x, target.y);
  ctx.rotate(local * .44);
  ctx.lineCap = "round";
  const rayCount = strength > 1.2 ? 14 : 10;
  for (let index = 0; index < rayCount; index += 1) {
    const angle = (Math.PI * 2 * index / rayCount) + (index % 2 ? .08 : 0);
    const inner = 18 * strength;
    const outer = (52 + (index % 3) * 13) * strength;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.strokeStyle = index % 3 ? battleModernVfxRgba(rgb, alpha * .72) : `rgba(255,255,255,${alpha * .9})`;
    ctx.lineWidth = Math.max(1, (3.6 - (index % 3) * .6) * strength);
    ctx.shadowColor = battleModernVfxRgba(rgb, .95);
    ctx.shadowBlur = 17;
    ctx.stroke();
  }
  ctx.restore();
  if (center) battleModernVfxBloom(ctx, center.x, center.y, 31 * strength, rgb, alpha * .76);
}
function battleModernVfxDrawThunder(model) {
  const { ctx, local, impactTime, target, rgb, strength, lightning } = model;
  const alpha = battleModernVfxClamp((local - (impactTime - .78)) / .12) * battleModernVfxClamp((impactTime + .28 - local) / .38);
  if (alpha <= 0) return;
  const trace = () => {
    ctx.beginPath();
    lightning.forEach((offset, index) => {
      const progress = index / (lightning.length - 1);
      const x = target.x + offset * (1 - progress * .72) * strength;
      const y = -16 + progress * (target.y + 16);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
  };
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  trace();
  ctx.strokeStyle = battleModernVfxRgba(rgb, alpha * .32);
  ctx.lineWidth = 17 * strength;
  ctx.shadowColor = battleModernVfxRgba(rgb, .98);
  ctx.shadowBlur = 30;
  ctx.stroke();
  trace();
  ctx.strokeStyle = battleModernVfxRgba(rgb, alpha * .94);
  ctx.lineWidth = 6 * strength;
  ctx.shadowBlur = 14;
  ctx.stroke();
  trace();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 1.7 * strength;
  ctx.shadowBlur = 5;
  ctx.stroke();
  ctx.restore();
}
function battleModernVfxDrawCinematicAtmosphere(model) {
  const { ctx, width, height, local, attackStart, impactTime, start, target, rgb, accentRgb, strength, motes } = model;
  const enter = battleModernVfxClamp((local - (attackStart - .34)) / .42);
  const leave = battleModernVfxClamp((impactTime + .86 - local) / .92);
  const alpha = enter * leave;
  if (alpha <= 0) return;
  const rawProgress = battleModernVfxClamp((local - attackStart) / Math.max(.28, impactTime - attackStart));
  const progress = battleModernVfxEase(rawProgress);
  const head = battleModernVfxPoint(start, target, progress, -height * .17);
  const centerX = start.x + (target.x - start.x) * Math.min(1, progress * 1.08);
  const centerY = start.y + (target.y - start.y) * Math.min(1, progress * 1.08);
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const groundShadow = ctx.createRadialGradient(target.x, target.y + 54 * strength, 0, target.x, target.y + 54 * strength, 86 * strength);
  groundShadow.addColorStop(0, `rgba(1,4,14,${battleModernVfxClamp(alpha * .28)})`);
  groundShadow.addColorStop(.55, `rgba(2,7,20,${battleModernVfxClamp(alpha * .12)})`);
  groundShadow.addColorStop(1, "rgba(1,4,14,0)");
  ctx.fillStyle = groundShadow;
  ctx.beginPath();
  ctx.ellipse(target.x, target.y + 54 * strength, 94 * strength, 24 * strength, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let layer = 0; layer < 3; layer += 1) {
    const radiusX = (58 + layer * 28) * strength;
    const radiusY = (34 + layer * 17) * strength;
    const driftX = Math.sin(local * (.6 + layer * .14) + layer * 1.8) * 8;
    const driftY = Math.cos(local * (.48 + layer * .1) + layer) * 5;
    const gradient = ctx.createRadialGradient(centerX + driftX, centerY + driftY, 0, centerX + driftX, centerY + driftY, radiusX);
    gradient.addColorStop(0, battleModernVfxRgba(layer % 2 ? accentRgb : rgb, alpha * (.11 - layer * .018)));
    gradient.addColorStop(.48, battleModernVfxRgba(layer % 2 ? rgb : accentRgb, alpha * (.05 - layer * .008)));
    gradient.addColorStop(1, battleModernVfxRgba(rgb, 0));
    ctx.save();
    ctx.translate(centerX + driftX, centerY + driftY);
    ctx.scale(1, radiusY / radiusX);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radiusX, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.lineCap = "round";
  for (let index = 0; index < Math.min(14, motes.length); index += 1) {
    const mote = motes[index];
    const orbit = mote.angle + local * mote.orbit * .34;
    const radius = (28 + mote.radius * (1.15 + progress * .35)) * strength;
    const x = centerX + Math.cos(orbit) * radius;
    const y = centerY + Math.sin(orbit) * radius * .48;
    const tailAngle = orbit - mote.orbit * .18;
    const tailX = centerX + Math.cos(tailAngle) * radius * .82;
    const tailY = centerY + Math.sin(tailAngle) * radius * .4;
    const moteAlpha = alpha * (.18 + (index % 4) * .035);
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.quadraticCurveTo((tailX + x) / 2 + Math.sin(local + index) * 7, (tailY + y) / 2 - 5, x, y);
    ctx.strokeStyle = index % 3 === 0 ? `rgba(255,255,255,${moteAlpha})` : battleModernVfxRgba(index % 2 ? accentRgb : rgb, moteAlpha);
    ctx.lineWidth = Math.max(.45, mote.size * strength * .55);
    ctx.shadowColor = battleModernVfxRgba(accentRgb, .72);
    ctx.shadowBlur = 5;
    ctx.stroke();
  }
  const beam = ctx.createLinearGradient(start.x, start.y, head.x, head.y);
  beam.addColorStop(0, battleModernVfxRgba(rgb, 0));
  beam.addColorStop(.42, battleModernVfxRgba(accentRgb, alpha * .1));
  beam.addColorStop(.8, battleModernVfxRgba(rgb, alpha * .2));
  beam.addColorStop(1, `rgba(255,255,255,${battleModernVfxClamp(alpha * .28)})`);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo((start.x + head.x) / 2, Math.min(start.y, head.y) - height * .1, head.x, head.y);
  ctx.strokeStyle = beam;
  ctx.lineWidth = 1.1 * strength;
  ctx.shadowColor = battleModernVfxRgba(accentRgb, .84);
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();
  const impactFlare = battleModernVfxClamp((local - (impactTime - .18)) / .12) * battleModernVfxClamp((impactTime + .34 - local) / .38);
  if (impactFlare > 0) battleModernVfxDrawLensFlare(ctx, target.x, target.y, rgb, accentRgb, impactFlare, 118 * strength);
}
function battleModernVfxDrawMaterialBody(model) {
  const { ctx, height, local, attackStart, impactTime, start, target, rgb, accentRgb, strength, profile, family, motes } = model;
  const enter = battleModernVfxClamp((local - (attackStart - .12)) / .26);
  const leave = battleModernVfxClamp((impactTime + .54 - local) / .64);
  const alpha = enter * leave;
  if (alpha <= 0) return;
  const rawProgress = battleModernVfxClamp((local - attackStart) / Math.max(.24, impactTime - attackStart));
  const progress = battleModernVfxEase(rawProgress);
  const head = battleModernVfxPoint(start, target, progress, -height * .18);
  const impactPulse = battleModernVfxClamp((local - (impactTime - .34)) / .18) * battleModernVfxClamp((impactTime + .42 - local) / .5);
  const motif = profile?.motif || family;
  const direction = target.x >= start.x ? 1 : -1;
  const sphere = (x, y, radius, opacity = alpha, glass = false, primary = rgb, accent = accentRgb) => {
    battleModernVfxFillMaterial(ctx, () => {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }, x, y, radius, primary, accent, opacity, glass);
  };
  if (motif === "steps") {
    for (let index = 0; index < 6; index += 1) {
      const phase = progress * 6.7 - index;
      if (phase <= 0 || phase > 1.6) continue;
      const stepAlpha = alpha * battleModernVfxClamp(phase / .18) * battleModernVfxClamp((1.6 - phase) / .42);
      const ratio = (index + 1) / 6.5;
      const x = start.x + (target.x - start.x) * ratio;
      const y = target.y + 53 * strength + Math.sin(index * 1.5) * 4;
      battleModernVfxFillMaterial(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(x, y, 15 * strength, 5.4 * strength, -.08 * direction, 0, Math.PI * 2);
      }, x, y, 17 * strength, rgb, accentRgb, stepAlpha, true);
    }
    return;
  }
  if (motif === "chevron") {
    const radius = 27 * strength;
    battleModernVfxFillMaterial(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(head.x + direction * radius, head.y);
      ctx.lineTo(head.x - direction * radius * .3, head.y - radius * .72);
      ctx.lineTo(head.x - direction * radius, head.y - radius * .36);
      ctx.lineTo(head.x - direction * radius * .28, head.y);
      ctx.lineTo(head.x - direction * radius, head.y + radius * .36);
      ctx.lineTo(head.x - direction * radius * .3, head.y + radius * .72);
      ctx.closePath();
    }, head.x, head.y, radius, rgb, accentRgb, alpha, true);
    return;
  }
  if (["comet", "starfall", "starCrest"].includes(motif)) {
    const radius = (motif === "starCrest" ? 43 : 22 + impactPulse * 8) * strength;
    const x = motif === "starCrest" ? target.x : head.x;
    const y = motif === "starCrest" ? target.y : head.y;
    battleModernVfxFillMaterial(ctx, () => {
      battleModernVfxStarPath(ctx, x, y, radius, radius * .43, 5, local * .45);
    }, x, y, radius, rgb, accentRgb, alpha, false);
    return;
  }
  if (motif === "cloud") {
    const centerX = start.x + (target.x - start.x) * Math.min(1, progress * 1.1);
    const centerY = target.y - 7 + Math.sin(local * 2.1) * 3;
    const puffs = [[-35, 7, 26], [-20, -13, 31], [7, -18, 36], [34, -4, 28], [19, 14, 31], [-10, 18, 29]];
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let index = puffs.length - 1; index >= 0; index -= 1) {
      const [offsetX, offsetY, radius] = puffs[index];
      const x = centerX + offsetX * strength;
      const y = centerY + offsetY * strength;
      const gradient = ctx.createRadialGradient(x - radius * .28, y - radius * .32, radius * .06, x, y, radius * strength);
      gradient.addColorStop(0, `rgba(255,255,255,${battleModernVfxClamp(alpha * .82)})`);
      gradient.addColorStop(.28, battleModernVfxRgba(accentRgb, alpha * .52));
      gradient.addColorStop(.7, battleModernVfxRgba(rgb, alpha * .18));
      gradient.addColorStop(1, "rgba(18,28,48,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * strength, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (["rune", "grid", "prism", "mirrors"].includes(motif)) {
    const x = motif === "rune" ? head.x : target.x;
    const y = motif === "rune" ? head.y : target.y;
    const radius = (motif === "prism" ? 40 : motif === "grid" ? 34 : 28) * strength;
    const sides = motif === "prism" ? 3 : motif === "grid" ? 4 : 6;
    battleModernVfxFillMaterial(ctx, () => {
      battleModernVfxPolygonPath(ctx, x, y, radius, sides, -Math.PI / 2 + local * .18);
    }, x, y, radius, rgb, accentRgb, alpha * .88, true);
    if (motif === "mirrors") {
      for (let index = 0; index < 4; index += 1) {
        const angle = index * Math.PI * .5 + .36;
        const shardX = target.x + Math.cos(angle) * 55 * strength;
        const shardY = target.y + Math.sin(angle) * 38 * strength;
        battleModernVfxFillMaterial(ctx, () => {
          battleModernVfxPolygonPath(ctx, shardX, shardY, (14 + index * 2) * strength, 3, angle + local * .08);
        }, shardX, shardY, 18 * strength, rgb, accentRgb, alpha * .68, true);
      }
    }
    return;
  }
  if (["sunColumn", "sunFan", "solarCrown", "flash"].includes(motif)) {
    const radius = (31 + impactPulse * 15) * strength;
    sphere(target.x, target.y - 4 * strength, radius, alpha, false, rgb, accentRgb);
    battleModernVfxDrawLensFlare(ctx, target.x, target.y - 4 * strength, rgb, accentRgb, alpha * (.38 + impactPulse * .62), 92 * strength);
    return;
  }
  if (motif === "phantomLanternArray") {
    const panels = [[-58, -14], [-29, 18], [0, -33], [29, 18], [58, -14]];
    for (let index = 0; index < panels.length; index += 1) {
      const x = target.x + panels[index][0] * strength;
      const y = target.y + panels[index][1] * strength + Math.sin(local * 1.35 + index * .8) * 3;
      const radius = (index === 2 ? 17 : 14) * strength;
      battleModernVfxFillMaterial(ctx, () => {
        battleModernVfxPolygonPath(ctx, x, y, radius, 6, Math.PI / 6);
      }, x, y, radius, rgb, accentRgb, alpha * (index === 2 ? .92 : .76), true);
    }
    return;
  }
  if (motif === "lamps") {
    const positions = [[-.55, 10], [-.28, -4], [0, 4], [.28, -7], [.55, 8]];
    for (let index = 0; index < positions.length; index += 1) {
      const x = start.x + (target.x - start.x) * ((index + 1) / 6);
      const y = target.y + positions[index][1] + 25 * strength;
      sphere(x, y, (9 + (index % 2) * 2) * strength, alpha * (.7 + index * .05), true, rgb, accentRgb);
    }
    return;
  }
  if (motif === "tower" || motif === "city-spark") {
    const x = target.x;
    const y = target.y + 8 * strength;
    const radius = 45 * strength;
    battleModernVfxFillMaterial(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x + radius * .38, y - radius * .28);
      ctx.lineTo(x + radius * .62, y + radius * .72);
      ctx.lineTo(x - radius * .62, y + radius * .72);
      ctx.lineTo(x - radius * .38, y - radius * .28);
      ctx.closePath();
    }, x, y, radius, rgb, accentRgb, alpha * .88, true);
    return;
  }
  if (["drop", "water"].includes(motif)) {
    const x = motif === "drop" ? head.x : target.x;
    const y = motif === "drop" ? head.y : target.y;
    const radius = 25 * strength;
    battleModernVfxFillMaterial(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(x, y - radius);
      ctx.bezierCurveTo(x + radius * .9, y - radius * .05, x + radius * .64, y + radius * .9, x, y + radius);
      ctx.bezierCurveTo(x - radius * .64, y + radius * .9, x - radius * .9, y - radius * .05, x, y - radius);
      ctx.closePath();
    }, x, y, radius, rgb, accentRgb, alpha * .9, true);
    return;
  }
  if (motif === "waterGate" || motif === "magicGate") {
    const portalAlpha = alpha * (.72 + impactPulse * .28);
    const portal = ctx.createRadialGradient(target.x - 10 * strength, target.y - 15 * strength, 4, target.x, target.y, 58 * strength);
    portal.addColorStop(0, "rgba(2,7,20,.74)");
    portal.addColorStop(.34, battleModernVfxRgba(rgb, portalAlpha * .22));
    portal.addColorStop(.63, battleModernVfxRgba(accentRgb, portalAlpha * .7));
    portal.addColorStop(.78, `rgba(255,255,255,${battleModernVfxClamp(portalAlpha * .82)})`);
    portal.addColorStop(1, battleModernVfxRgba(accentRgb, 0));
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = portal;
    ctx.beginPath();
    ctx.ellipse(target.x, target.y, 47 * strength, 72 * strength, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (motif === "tide") {
    const y = target.y + 23 * strength;
    battleModernVfxFillMaterial(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x - 105 * strength, y + 24 * strength);
      ctx.bezierCurveTo(target.x - 67 * strength, y - 54 * strength, target.x - 13 * strength, y + 8 * strength, target.x + 15 * strength, y - 37 * strength);
      ctx.bezierCurveTo(target.x + 44 * strength, y - 3 * strength, target.x + 66 * strength, y - 25 * strength, target.x + 108 * strength, y + 20 * strength);
      ctx.lineTo(target.x + 108 * strength, y + 48 * strength);
      ctx.lineTo(target.x - 105 * strength, y + 48 * strength);
      ctx.closePath();
    }, target.x, y, 112 * strength, rgb, accentRgb, alpha * .72, true);
    return;
  }
  if (motif === "embers" || motif === "thunder") {
    const radius = (22 + impactPulse * 12) * strength;
    sphere(target.x, target.y, radius, alpha * .88, false, rgb, accentRgb);
    for (let index = 0; index < Math.min(10, motes.length); index += 1) {
      const mote = motes[index];
      const rise = (local * (.38 + index * .012) + index / 10) % 1;
      const x = target.x + Math.sin(mote.angle + local) * (24 + mote.radius * .45) * strength;
      const y = target.y + 37 * strength - rise * 104 * strength;
      battleModernVfxBloom(ctx, x, y, (4 + mote.size * 3) * strength, index % 2 ? accentRgb : rgb, alpha * Math.sin(rise * Math.PI) * .58);
    }
    return;
  }
  if (motif === "orbit" || motif === "wind" || motif === "route") {
    const x = motif === "route" ? head.x : target.x;
    const y = motif === "route" ? head.y : target.y;
    sphere(x, y, 24 * strength, alpha * .82, true, rgb, accentRgb);
    return;
  }
  if (["sprout", "forestCrest", "vineBloom"].includes(motif)) {
    const leafCount = motif === "sprout" ? 3 : motif === "forestCrest" ? 7 : 9;
    for (let index = 0; index < leafCount; index += 1) {
      const angle = -Math.PI / 2 + (index - (leafCount - 1) / 2) * (motif === "sprout" ? .58 : .42);
      const distance = (18 + (index % 3) * 16) * strength;
      const x = target.x + Math.cos(angle) * distance;
      const y = target.y + 34 * strength + Math.sin(angle) * distance;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      battleModernVfxFillMaterial(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(0, 0, 13 * strength, 5.5 * strength, 0, 0, Math.PI * 2);
      }, 0, 0, 14 * strength, rgb, accentRgb, alpha * (.62 + index / leafCount * .25), true);
      ctx.restore();
    }
    return;
  }
  if (motif === "slash" || motif === "cross-slash") {
    const radius = 78 * strength;
    battleModernVfxFillMaterial(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x - direction * radius, target.y + radius * .36);
      ctx.quadraticCurveTo(target.x, target.y - radius, target.x + direction * radius, target.y - radius * .3);
      ctx.quadraticCurveTo(target.x, target.y - radius * .48, target.x - direction * radius * .74, target.y + radius * .44);
      ctx.closePath();
    }, target.x, target.y, radius, rgb, accentRgb, alpha * .58, true);
    return;
  }
  sphere(target.x, target.y, 28 * strength, alpha * .78, true, rgb, accentRgb);
}
function battleModernVfxDrawSignature(model) {
  const { ctx, width, height, local, attackStart, impactTime, start, target, rgb, accentRgb, strength, profile, actorDirection, motes } = model;
  if (!profile) return;
  const enter = battleModernVfxClamp((local - (attackStart - .18)) / .3);
  const leave = battleModernVfxClamp((impactTime + .62 - local) / .72);
  const alpha = enter * leave;
  if (alpha <= 0) return;
  const rawProgress = battleModernVfxClamp((local - attackStart) / Math.max(.24, impactTime - attackStart));
  const progress = battleModernVfxEase(rawProgress);
  const head = battleModernVfxPoint(start, target, progress, -height * .18);
  const impactPulse = battleModernVfxClamp((local - (impactTime - .38)) / .2) * battleModernVfxClamp((impactTime + .48 - local) / .58);
  const direction = target.x >= start.x ? 1 : -1;
  const groundY = target.y + 54 * strength;
  const lineWidth = Math.max(1.6, 3.2 * strength);
  if (profile.motif === "steps") {
    for (let index = 0; index < 6; index += 1) {
      const phase = progress * 6.8 - index;
      if (phase <= 0 || phase >= 1.45) continue;
      const stepAlpha = alpha * battleModernVfxClamp(phase / .16) * battleModernVfxClamp((1.45 - phase) / .42);
      const stepProgress = (index + 1) / 6.5;
      const x = start.x + (target.x - start.x) * stepProgress;
      const y = groundY + Math.sin(index * 1.7) * 5;
      battleModernVfxBloom(ctx, x, y, (18 + stepAlpha * 10) * strength, accentRgb, stepAlpha * .82);
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(x, y, 13 * strength, 4.5 * strength, -.08 * direction, 0, Math.PI * 2);
      }, rgb, accentRgb, stepAlpha, 2.2 * strength);
    }
    return;
  }
  if (profile.motif === "chevron") {
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo((start.x + target.x) / 2, start.y - 18, head.x, head.y);
    }, rgb, accentRgb, alpha * .78, lineWidth);
    for (let index = 0; index < 4; index += 1) {
      const arrowProgress = battleModernVfxClamp(progress - index * .09);
      const point = battleModernVfxPoint(start, target, arrowProgress, -height * .11);
      const arrowAlpha = alpha * (1 - index * .16);
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(point.x - direction * 17 * strength, point.y - 11 * strength);
        ctx.lineTo(point.x, point.y);
        ctx.lineTo(point.x - direction * 17 * strength, point.y + 11 * strength);
      }, rgb, accentRgb, arrowAlpha, 2.3 * strength);
    }
    battleModernVfxBloom(ctx, head.x, head.y, 27 * strength, accentRgb, alpha * .72);
    return;
  }
  if (profile.motif === "comet") {
    const starAlpha = alpha * (.66 + impactPulse * .34);
    battleModernVfxBloom(ctx, head.x, head.y, 37 * strength, accentRgb, starAlpha * .88);
    battleModernVfxStrokeLayers(ctx, () => {
      battleModernVfxStarPath(ctx, head.x, head.y, 15 * strength, 6.4 * strength, 5, local * 2.1);
    }, rgb, accentRgb, starAlpha, 2.4 * strength);
    for (let index = 0; index < 4; index += 1) {
      const tailPoint = battleModernVfxPoint(start, target, Math.max(0, progress - .08 - index * .045), -height * .18);
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        ctx.lineTo(tailPoint.x, tailPoint.y + (index - 1.5) * 5 * strength);
      }, rgb, accentRgb, starAlpha * (.48 - index * .08), 1.5 * strength);
    }
    return;
  }
  if (profile.motif === "cloud") {
    const cloudCenter = {
      x: start.x + (target.x - start.x) * Math.min(1, progress * 1.12),
      y: target.y - 12 + Math.sin(local * 3.2) * 4
    };
    const puffs = [[-34, 4, 24], [-18, -13, 30], [8, -18, 34], [31, -5, 27], [16, 13, 30], [-12, 17, 27]];
    for (let index = 0; index < puffs.length; index += 1) {
      const [offsetX, offsetY, radius] = puffs[index];
      const puffAlpha = alpha * (.42 + (index % 3) * .1);
      battleModernVfxBloom(ctx, cloudCenter.x + offsetX * strength, cloudCenter.y + offsetY * strength, radius * strength, index % 2 ? accentRgb : rgb, puffAlpha);
    }
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(cloudCenter.x - 52 * strength, cloudCenter.y + 16 * strength);
      ctx.bezierCurveTo(cloudCenter.x - 24 * strength, cloudCenter.y + 28 * strength, cloudCenter.x + 24 * strength, cloudCenter.y + 28 * strength, cloudCenter.x + 54 * strength, cloudCenter.y + 10 * strength);
    }, rgb, accentRgb, alpha * .64, 2.1 * strength);
    return;
  }
  if (profile.motif === "rune") {
    battleModernVfxBloom(ctx, head.x, head.y, 34 * strength, accentRgb, alpha * .78);
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(local * 1.8 * actorDirection);
    for (let index = 0; index < 3; index += 1) {
      const radius = (17 + index * 10) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxPolygonPath(ctx, 0, 0, radius, index === 1 ? 6 : 4, index * .22);
      }, rgb, accentRgb, alpha * (1 - index * .16), (2.5 - index * .35) * strength);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * 34 * strength, Math.sin(angle) * 34 * strength);
        ctx.lineTo(Math.cos(angle) * 43 * strength, Math.sin(angle) * 43 * strength);
      }, rgb, accentRgb, alpha * .72, 1.4 * strength);
    }
    ctx.restore();
    return;
  }
  if (profile.motif === "sunColumn") {
    const columnAlpha = alpha * (.58 + impactPulse * .42);
    const beamGradient = ctx.createLinearGradient(target.x, 0, target.x, target.y + 46);
    beamGradient.addColorStop(0, battleModernVfxRgba(accentRgb, 0));
    beamGradient.addColorStop(.28, battleModernVfxRgba(accentRgb, columnAlpha * .18));
    beamGradient.addColorStop(.82, battleModernVfxRgba(rgb, columnAlpha * .54));
    beamGradient.addColorStop(1, battleModernVfxRgba(accentRgb, 0));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = beamGradient;
    ctx.fillRect(target.x - 40 * strength, 0, 80 * strength, target.y + 54);
    ctx.restore();
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x, 0);
      ctx.lineTo(target.x, target.y + 30 * strength);
    }, rgb, accentRgb, columnAlpha, 5.2 * strength);
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.arc(target.x, target.y - 3 * strength, 36 * strength, 0, Math.PI * 2);
    }, rgb, accentRgb, columnAlpha * .82, 2.8 * strength);
    return;
  }
  if (profile.motif === "lamps") {
    for (let index = 0; index < 5; index += 1) {
      const lampProgress = (index + 1) / 6;
      const phase = progress * 6 - index;
      if (phase <= 0) continue;
      const lampAlpha = alpha * battleModernVfxClamp(phase / .2);
      const x = start.x + (target.x - start.x) * lampProgress;
      const y = groundY - Math.sin(index * 1.25) * 7;
      battleModernVfxBloom(ctx, x, y - 25 * strength, 25 * strength, accentRgb, lampAlpha * .82);
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(x, y + 6 * strength);
        ctx.lineTo(x, y - 23 * strength);
        ctx.quadraticCurveTo(x + direction * 9 * strength, y - 34 * strength, x + direction * 15 * strength, y - 25 * strength);
      }, rgb, accentRgb, lampAlpha, 2 * strength);
    }
    return;
  }
  if (profile.motif === "grid") {
    const gridAlpha = alpha * (.52 + impactPulse * .48);
    const horizonY = target.y - 24 * strength;
    const floorY = Math.min(height - 8, target.y + 72 * strength);
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      for (let index = -4; index <= 4; index += 1) {
        ctx.moveTo(target.x + index * 7 * strength, horizonY);
        ctx.lineTo(target.x + index * 30 * strength, floorY);
      }
      for (let index = 0; index < 6; index += 1) {
        const ratio = index / 5;
        const y = horizonY + Math.pow(ratio, 1.55) * (floorY - horizonY);
        const half = (18 + ratio * 104) * strength;
        ctx.moveTo(target.x - half, y);
        ctx.lineTo(target.x + half, y);
      }
    }, rgb, accentRgb, gridAlpha, 1.4 * strength);
    const scanY = horizonY + progress * (floorY - horizonY);
    battleModernVfxBloom(ctx, target.x, scanY, 31 * strength, accentRgb, gridAlpha * .62);
    return;
  }
  if (profile.motif === "tower") {
    const towerAlpha = alpha * (.55 + impactPulse * .45);
    const baseY = target.y + 48 * strength;
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x - 34 * strength, baseY);
      ctx.lineTo(target.x - 25 * strength, target.y - 16 * strength);
      ctx.lineTo(target.x - 11 * strength, target.y - 29 * strength);
      ctx.lineTo(target.x, target.y - 61 * strength);
      ctx.lineTo(target.x + 11 * strength, target.y - 29 * strength);
      ctx.lineTo(target.x + 25 * strength, target.y - 16 * strength);
      ctx.lineTo(target.x + 34 * strength, baseY);
      ctx.closePath();
      ctx.moveTo(target.x - 25 * strength, target.y - 4 * strength);
      ctx.lineTo(target.x + 25 * strength, target.y - 4 * strength);
    }, rgb, accentRgb, towerAlpha, 2.3 * strength);
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x, 0);
      ctx.lineTo(target.x, target.y - 55 * strength);
    }, rgb, accentRgb, towerAlpha * .94, 4.5 * strength);
    battleModernVfxBloom(ctx, target.x, target.y - 60 * strength, 34 * strength, accentRgb, towerAlpha * .9);
    return;
  }
  if (profile.motif === "drop") {
    battleModernVfxBloom(ctx, head.x, head.y, 32 * strength, accentRgb, alpha * .74);
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(head.x, head.y - 20 * strength);
      ctx.bezierCurveTo(head.x + 18 * strength, head.y - 1 * strength, head.x + 14 * strength, head.y + 17 * strength, head.x, head.y + 22 * strength);
      ctx.bezierCurveTo(head.x - 14 * strength, head.y + 17 * strength, head.x - 18 * strength, head.y - 1 * strength, head.x, head.y - 20 * strength);
      ctx.closePath();
    }, rgb, accentRgb, alpha, 2.4 * strength);
    return;
  }
  if (profile.motif === "waterGate" || profile.motif === "magicGate") {
    const gateAlpha = alpha * (.58 + impactPulse * .42);
    const gatePoints = profile.motif === "magicGate" ? [start, target] : [target];
    for (const gatePoint of gatePoints) {
      battleModernVfxBloom(ctx, gatePoint.x, gatePoint.y, 49 * strength, accentRgb, gateAlpha * .62);
      for (let index = 0; index < 3; index += 1) {
        const pulse = 1 + Math.sin(local * 4.2 + index) * .05;
        battleModernVfxStrokeLayers(ctx, () => {
          ctx.beginPath();
          ctx.ellipse(gatePoint.x, gatePoint.y, (23 + index * 10) * strength * pulse, (46 + index * 11) * strength * pulse, local * .15 * (index % 2 ? -1 : 1), 0, Math.PI * 2);
        }, rgb, accentRgb, gateAlpha * (1 - index * .19), (2.8 - index * .45) * strength);
      }
    }
    if (profile.motif === "magicGate") {
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.bezierCurveTo((start.x + target.x) / 2, start.y - 48, (start.x + target.x) / 2, target.y + 48, target.x, target.y);
      }, rgb, accentRgb, gateAlpha * .58, 2.6 * strength);
    } else {
      for (let index = 0; index < 3; index += 1) {
        battleModernVfxStrokeLayers(ctx, () => {
          ctx.beginPath();
          ctx.ellipse(target.x, groundY + index * 5 * strength, (32 + progress * 54 + index * 12) * strength, (8 + index * 3) * strength, 0, 0, Math.PI * 2);
        }, rgb, accentRgb, gateAlpha * (.65 - index * .13), 1.8 * strength);
      }
    }
    return;
  }
  if (profile.motif === "tide") {
    const tideAlpha = alpha * (.55 + impactPulse * .45);
    for (let index = 0; index < 5; index += 1) {
      const y = target.y - 22 * strength + index * 17 * strength;
      const shift = Math.sin(local * 3.5 + index * .9) * 18 * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x - width * .43, y + shift * .12);
        ctx.bezierCurveTo(target.x - width * .2, y - 31 * strength, target.x + width * .14, y + 28 * strength, target.x + width * .43, y - 4 * strength);
      }, rgb, accentRgb, tideAlpha * (1 - index * .1), (3.8 - index * .42) * strength);
    }
    return;
  }
  if (profile.motif === "embers") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < motes.length; index += 1) {
      const mote = motes[index];
      const rise = (local * (.33 + (index % 5) * .035) + index / motes.length) % 1;
      const x = target.x + Math.sin(mote.angle + local * .7) * (18 + mote.radius * .72) * strength;
      const y = groundY - rise * 136 * strength;
      const emberAlpha = alpha * Math.sin(rise * Math.PI) * .86;
      ctx.fillStyle = index % 3 === 0 ? `rgba(255,255,255,${emberAlpha})` : battleModernVfxRgba(index % 2 ? accentRgb : rgb, emberAlpha);
      ctx.shadowColor = battleModernVfxRgba(accentRgb, .95);
      ctx.shadowBlur = 11;
      ctx.beginPath();
      ctx.ellipse(x, y, mote.size * 1.5 * strength, mote.size * 3.8 * strength, -.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  if (profile.motif === "sunFan") {
    const fanAlpha = alpha * (.54 + impactPulse * .46);
    const originY = groundY + 8 * strength;
    for (let index = 0; index < 11; index += 1) {
      const angle = Math.PI + Math.PI * index / 10;
      const length = (58 + (index % 3) * 17) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x + Math.cos(angle) * 14 * strength, originY + Math.sin(angle) * 14 * strength);
        ctx.lineTo(target.x + Math.cos(angle) * length, originY + Math.sin(angle) * length);
      }, rgb, accentRgb, fanAlpha * (.72 + (index % 2) * .2), (2.2 + (index % 3) * .35) * strength);
    }
    battleModernVfxBloom(ctx, target.x, originY, 43 * strength, accentRgb, fanAlpha * .9);
    return;
  }
  if (profile.motif === "solarCrown") {
    const crownAlpha = alpha * (.5 + impactPulse * .5);
    const crownY = target.y - 10 * strength;
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.arc(target.x, crownY, 42 * strength, 0, Math.PI * 2);
    }, rgb, accentRgb, crownAlpha, 3.2 * strength);
    for (let index = 0; index < 14; index += 1) {
      const angle = index * Math.PI * 2 / 14 + local * .12;
      const inner = 49 * strength;
      const outer = (66 + (index % 2) * 12) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x + Math.cos(angle) * inner, crownY + Math.sin(angle) * inner);
        ctx.lineTo(target.x + Math.cos(angle) * outer, crownY + Math.sin(angle) * outer);
      }, rgb, accentRgb, crownAlpha * .82, 2.1 * strength);
    }
    battleModernVfxBloom(ctx, target.x, crownY, 57 * strength, accentRgb, crownAlpha * .72);
    return;
  }
  if (profile.motif === "orbit") {
    const orbitAlpha = alpha * (.58 + impactPulse * .42);
    ctx.save();
    ctx.translate(target.x, target.y);
    for (let index = 0; index < 3; index += 1) {
      const rotation = local * (.62 + index * .21) * (index % 2 ? -1 : 1) + index * .65;
      ctx.save();
      ctx.rotate(rotation);
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(0, 0, (42 + index * 11) * strength, (16 + index * 7) * strength, 0, 0, Math.PI * 2);
      }, rgb, accentRgb, orbitAlpha * (1 - index * .14), (2.4 - index * .3) * strength);
      const orbX = Math.cos(local * (2.2 + index * .3)) * (42 + index * 11) * strength;
      const orbY = Math.sin(local * (2.2 + index * .3)) * (16 + index * 7) * strength;
      battleModernVfxBloom(ctx, orbX, orbY, 15 * strength, index % 2 ? accentRgb : rgb, orbitAlpha * .9);
      ctx.restore();
    }
    ctx.restore();
    return;
  }
  if (profile.motif === "phantomLanternArray") {
    const panelAlpha = alpha * (.58 + impactPulse * .42);
    const panelOffsets = [[-58, -14], [-29, 18], [0, -33], [29, 18], [58, -14]];
    const panels = panelOffsets.map(([offsetX, offsetY], index) => ({
      x: target.x + offsetX * strength,
      y: target.y + offsetY * strength + Math.sin(local * 1.35 + index * .8) * 3
    }));
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(panels[0].x, panels[0].y);
      for (let index = 1; index < panels.length; index += 1) {
        ctx.lineTo(panels[index].x, panels[index].y);
      }
      ctx.moveTo(panels[0].x, panels[0].y);
      ctx.lineTo(panels[2].x, panels[2].y);
      ctx.lineTo(panels[4].x, panels[4].y);
    }, rgb, accentRgb, panelAlpha * .42, 1.15 * strength);
    for (let index = 0; index < panels.length; index += 1) {
      const panel = panels[index];
      const radius = (index === 2 ? 17 : 14) * strength;
      const panelRgb = index % 2 ? accentRgb : rgb;
      battleModernVfxBloom(ctx, panel.x, panel.y, radius * 1.55, panelRgb, panelAlpha * .48);
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxPolygonPath(ctx, panel.x, panel.y, radius, 6, Math.PI / 6);
      }, rgb, accentRgb, panelAlpha * (index === 2 ? 1 : .86), 1.65 * strength);
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxPolygonPath(
          ctx,
          panel.x,
          panel.y,
          radius * .43,
          4,
          Math.PI / 4 + local * .08 * (index % 2 ? -1 : 1)
        );
      }, accentRgb, [255, 255, 255], panelAlpha * .9, .9 * strength);
    }
    return;
  }
  if (profile.motif === "mirrors") {
    const mirrorAlpha = alpha * (.56 + impactPulse * .44);
    const shards = [[-58, -20, 22, .15], [-28, 29, 18, -.45], [8, -39, 27, .38], [42, 17, 21, -.18], [65, -29, 16, .62]];
    for (let index = 0; index < shards.length; index += 1) {
      const [offsetX, offsetY, radius, rotation] = shards[index];
      const x = target.x + offsetX * strength;
      const y = target.y + offsetY * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxPolygonPath(ctx, x, y, radius * strength, index % 2 ? 4 : 3, rotation + local * .08 * (index % 2 ? -1 : 1));
      }, rgb, accentRgb, mirrorAlpha * (1 - index * .08), 2 * strength);
      if (index < shards.length - 1) {
        const next = shards[index + 1];
        battleModernVfxStrokeLayers(ctx, () => {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(target.x + next[0] * strength, target.y + next[1] * strength);
        }, rgb, accentRgb, mirrorAlpha * .42, 1.1 * strength);
      }
    }
    return;
  }
  if (profile.motif === "sprout") {
    const grow = battleModernVfxClamp((local - attackStart) / Math.max(.3, impactTime - attackStart));
    const sproutAlpha = alpha * (.62 + impactPulse * .38);
    const topY = groundY - 88 * grow * strength;
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x, groundY);
      ctx.bezierCurveTo(target.x - 16 * direction * strength, groundY - 29 * grow * strength, target.x + 13 * direction * strength, groundY - 60 * grow * strength, target.x, topY);
      if (grow > .35) {
        ctx.moveTo(target.x - 2 * strength, groundY - 42 * grow * strength);
        ctx.quadraticCurveTo(target.x - 28 * strength, groundY - 61 * grow * strength, target.x - 35 * strength, groundY - 39 * grow * strength);
        ctx.quadraticCurveTo(target.x - 15 * strength, groundY - 34 * grow * strength, target.x - 2 * strength, groundY - 42 * grow * strength);
      }
      if (grow > .58) {
        ctx.moveTo(target.x + 2 * strength, groundY - 61 * grow * strength);
        ctx.quadraticCurveTo(target.x + 31 * strength, groundY - 77 * grow * strength, target.x + 37 * strength, groundY - 53 * grow * strength);
        ctx.quadraticCurveTo(target.x + 17 * strength, groundY - 49 * grow * strength, target.x + 2 * strength, groundY - 61 * grow * strength);
      }
    }, rgb, accentRgb, sproutAlpha, 2.8 * strength);
    battleModernVfxBloom(ctx, target.x, groundY, 34 * strength, accentRgb, sproutAlpha * .7);
    return;
  }
  if (profile.motif === "forestCrest") {
    const crestAlpha = alpha * (.55 + impactPulse * .45);
    const baseY = groundY + 4 * strength;
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x, baseY);
      ctx.lineTo(target.x, target.y - 66 * strength);
      for (let level = 0; level < 4; level += 1) {
        const branchY = target.y + 24 * strength - level * 22 * strength;
        const reach = (27 + level * 7) * strength;
        ctx.moveTo(target.x, branchY);
        ctx.quadraticCurveTo(target.x - reach * .45, branchY - 15 * strength, target.x - reach, branchY - 6 * strength);
        ctx.moveTo(target.x, branchY - 5 * strength);
        ctx.quadraticCurveTo(target.x + reach * .45, branchY - 20 * strength, target.x + reach, branchY - 10 * strength);
      }
      ctx.moveTo(target.x - 34 * strength, baseY);
      ctx.quadraticCurveTo(target.x, baseY - 18 * strength, target.x + 34 * strength, baseY);
    }, rgb, accentRgb, crestAlpha, 2.5 * strength);
    battleModernVfxBloom(ctx, target.x, target.y - 18 * strength, 58 * strength, accentRgb, crestAlpha * .48);
    return;
  }
  if (profile.motif === "vineBloom") {
    const bloomAlpha = alpha * (.56 + impactPulse * .44);
    for (let side = -1; side <= 1; side += 2) {
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x, groundY);
        ctx.bezierCurveTo(target.x + side * 74 * strength, target.y + 28 * strength, target.x - side * 64 * strength, target.y - 35 * strength, target.x + side * 18 * strength, target.y - 65 * strength);
      }, rgb, accentRgb, bloomAlpha, 2.4 * strength);
    }
    const petals = [[-52, -8], [-23, -45], [12, -66], [43, -31], [57, 8], [4, -18]];
    for (let index = 0; index < petals.length; index += 1) {
      const x = target.x + petals[index][0] * strength;
      const y = target.y + petals[index][1] * strength;
      battleModernVfxBloom(ctx, x, y, 17 * strength, index % 2 ? accentRgb : rgb, bloomAlpha * .66);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(index * .8 + local * .16);
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        for (let petal = 0; petal < 4; petal += 1) {
          const angle = petal * Math.PI / 2;
          ctx.moveTo(0, 0);
          ctx.ellipse(Math.cos(angle) * 7 * strength, Math.sin(angle) * 7 * strength, 7 * strength, 3 * strength, angle, 0, Math.PI * 2);
        }
      }, rgb, accentRgb, bloomAlpha, 1.45 * strength);
      ctx.restore();
    }
    return;
  }
  if (profile.motif === "prism") {
    const prismAlpha = alpha * (.52 + impactPulse * .48);
    const prismX = target.x - direction * 8 * strength;
    const prismY = target.y - 4 * strength;
    battleModernVfxStrokeLayers(ctx, () => {
      battleModernVfxPolygonPath(ctx, prismX, prismY, 37 * strength, 3, -Math.PI / 2);
    }, rgb, accentRgb, prismAlpha, 2.8 * strength);
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(prismX - direction * 25 * strength, prismY);
    }, [255, 255, 255], accentRgb, prismAlpha, 3.2 * strength);
    const prismColors = [[255, 112, 152], [255, 216, 91], [112, 237, 171], [91, 191, 255], [190, 127, 255]];
    for (let index = 0; index < prismColors.length; index += 1) {
      const endY = prismY - 45 * strength + index * 22 * strength;
      const rayRgb = prismColors[index];
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(prismX + direction * 24 * strength, prismY);
        ctx.lineTo(prismX + direction * 112 * strength, endY);
      }, rayRgb, rayRgb, prismAlpha * .78, 1.55 * strength);
    }
    battleModernVfxBloom(ctx, prismX, prismY, 42 * strength, accentRgb, prismAlpha * .86);
    return;
  }
  if (profile.motif === "starCrest") {
    const crestAlpha = alpha * (.52 + impactPulse * .48);
    for (let index = 0; index < 3; index += 1) {
      const radius = (30 + index * 14) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxStarPath(ctx, target.x, target.y, radius, radius * .44, 5, local * (.3 + index * .09) * (index % 2 ? -1 : 1));
      }, rgb, accentRgb, crestAlpha * (1 - index * .18), (3 - index * .55) * strength);
    }
    battleModernVfxBloom(ctx, target.x, target.y, 62 * strength, accentRgb, crestAlpha * .72);
  }
}
function battleModernVfxDrawImpact(model) {
  const { ctx, local, impactTime, target, rgb, accentRgb = rgb, strength, particles, hit, profile } = model;
  if (!hit) return;
  const progress = battleModernVfxClamp((local - impactTime) / 1.08);
  if (local < impactTime - .08 || progress >= 1) return;
  const impactKind = profile?.impact || "ring";
  const impactAlpha = battleModernVfxClamp(1 - progress);
  const expand = battleModernVfxEase(progress);
  const baseWidth = Math.max(1, (3.8 - progress * 1.5) * strength);
  if (progress < .62) {
    const bloomScale = ["ground", "wave", "grid"].includes(impactKind) ? .58 : .86;
    battleModernVfxBloom(ctx, target.x, target.y, (39 + progress * 84) * strength, accentRgb, impactAlpha * bloomScale);
  }
  if (impactKind === "ground") {
    for (let index = 0; index < 3; index += 1) {
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(target.x, target.y + 48 * strength, (25 + expand * 108 + index * 14) * strength, (6 + expand * 18 + index * 3) * strength, 0, 0, Math.PI * 2);
      }, rgb, accentRgb, impactAlpha * (1 - index * .18), baseWidth * (1 - index * .14));
    }
  } else if (impactKind === "wave") {
    for (let index = 0; index < 4; index += 1) {
      const waveWidth = (42 + expand * 116 + index * 16) * strength;
      const y = target.y + 22 * strength + index * 11 * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x - waveWidth, y);
        ctx.bezierCurveTo(target.x - waveWidth * .45, y - (22 + index * 3) * strength, target.x + waveWidth * .34, y + 19 * strength, target.x + waveWidth, y - 5 * strength);
      }, rgb, accentRgb, impactAlpha * (1 - index * .16), baseWidth * (1 - index * .12));
    }
  } else if (impactKind === "gate") {
    for (let index = 0; index < 3; index += 1) {
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(target.x, target.y, (24 + expand * 58 + index * 8) * strength, (43 + expand * 83 + index * 12) * strength, 0, 0, Math.PI * 2);
      }, rgb, accentRgb, impactAlpha * (1 - index * .18), baseWidth * (1 - index * .14));
    }
  } else if (impactKind === "column") {
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(target.x, 0);
      ctx.lineTo(target.x, target.y + 40 * strength);
    }, rgb, accentRgb, impactAlpha, baseWidth * 1.65);
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(target.x, target.y + 43 * strength, (31 + expand * 74) * strength, (8 + expand * 18) * strength, 0, 0, Math.PI * 2);
    }, rgb, accentRgb, impactAlpha * .84, baseWidth);
  } else if (impactKind === "grid") {
    for (let index = 0; index < 4; index += 1) {
      const radius = (28 + expand * 83 + index * 13) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x, target.y - radius * .42);
        ctx.lineTo(target.x + radius, target.y + 42 * strength);
        ctx.lineTo(target.x, target.y + 42 * strength + radius * .3);
        ctx.lineTo(target.x - radius, target.y + 42 * strength);
        ctx.closePath();
      }, rgb, accentRgb, impactAlpha * (1 - index * .17), baseWidth * (1 - index * .14));
    }
  } else if (impactKind === "star") {
    for (let index = 0; index < 3; index += 1) {
      const radius = (25 + expand * 77 + index * 12) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxStarPath(ctx, target.x, target.y, radius, radius * .42, 5, progress * (1.2 + index * .3) * (index % 2 ? -1 : 1));
      }, rgb, accentRgb, impactAlpha * (1 - index * .2), baseWidth * (1 - index * .16));
    }
  } else if (impactKind === "fan") {
    const originY = target.y + 51 * strength;
    for (let index = 0; index < 13; index += 1) {
      const angle = Math.PI + index * Math.PI / 12;
      const distance = (40 + expand * (64 + (index % 3) * 15)) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x, originY);
        ctx.lineTo(target.x + Math.cos(angle) * distance, originY + Math.sin(angle) * distance);
      }, rgb, accentRgb, impactAlpha * (.62 + (index % 2) * .22), baseWidth * .62);
    }
  } else if (impactKind === "crown") {
    const radius = (31 + expand * 79) * strength;
    battleModernVfxStrokeLayers(ctx, () => {
      ctx.beginPath();
      ctx.arc(target.x, target.y, radius * .62, 0, Math.PI * 2);
      for (let index = 0; index < 14; index += 1) {
        const angle = index * Math.PI * 2 / 14;
        ctx.moveTo(target.x + Math.cos(angle) * radius * .72, target.y + Math.sin(angle) * radius * .72);
        ctx.lineTo(target.x + Math.cos(angle) * radius * (index % 2 ? 1 : 1.18), target.y + Math.sin(angle) * radius * (index % 2 ? 1 : 1.18));
      }
    }, rgb, accentRgb, impactAlpha, baseWidth);
  } else if (impactKind === "shards" || impactKind === "prism") {
    for (let index = 0; index < 9; index += 1) {
      const angle = index * Math.PI * 2 / 9 + .18;
      const inner = (19 + expand * 23) * strength;
      const outer = (48 + expand * (45 + (index % 3) * 17)) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x + Math.cos(angle - .1) * inner, target.y + Math.sin(angle - .1) * inner);
        ctx.lineTo(target.x + Math.cos(angle) * outer, target.y + Math.sin(angle) * outer);
        ctx.lineTo(target.x + Math.cos(angle + .1) * inner, target.y + Math.sin(angle + .1) * inner);
      }, rgb, accentRgb, impactAlpha * (.68 + (index % 2) * .2), baseWidth * .68);
    }
  } else if (impactKind === "petals") {
    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI * 2 / 12 + progress * .8;
      const distance = (25 + expand * (61 + (index % 3) * 14)) * strength;
      const x = target.x + Math.cos(angle) * distance;
      const y = target.y + Math.sin(angle) * distance;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.ellipse(x, y, 11 * strength, 4 * strength, angle, 0, Math.PI * 2);
      }, rgb, accentRgb, impactAlpha * .82, baseWidth * .54);
    }
  } else if (impactKind === "cloud") {
    const cloudPuffs = [[-49, 7], [-27, -28], [4, -42], [36, -25], [52, 9], [15, 27], [-23, 31]];
    for (let index = 0; index < cloudPuffs.length; index += 1) {
      const radius = (17 + expand * (25 + index % 3 * 7)) * strength;
      battleModernVfxBloom(ctx, target.x + cloudPuffs[index][0] * strength, target.y + cloudPuffs[index][1] * strength, radius, index % 2 ? accentRgb : rgb, impactAlpha * .62);
    }
  } else if (impactKind === "crest") {
    for (let index = 0; index < 3; index += 1) {
      const radius = (28 + expand * 74 + index * 12) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        battleModernVfxPolygonPath(ctx, target.x, target.y, radius, index === 1 ? 6 : 8, progress * (index % 2 ? -.5 : .5));
      }, rgb, accentRgb, impactAlpha * (1 - index * .2), baseWidth * (1 - index * .15));
    }
  } else {
    for (let index = 0; index < 12; index += 1) {
      const angle = index * Math.PI * 2 / 12;
      const inner = (17 + expand * 18) * strength;
      const outer = (47 + expand * (61 + index % 3 * 12)) * strength;
      battleModernVfxStrokeLayers(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(target.x + Math.cos(angle) * inner, target.y + Math.sin(angle) * inner);
        ctx.lineTo(target.x + Math.cos(angle) * outer, target.y + Math.sin(angle) * outer);
      }, rgb, accentRgb, impactAlpha * (.64 + (index % 2) * .2), baseWidth * .66);
    }
  }
  ctx.save();
  const motif = profile?.motif || "";
  const particleMaterial = ["wave", "gate"].includes(impactKind) || ["drop", "waterGate", "tide"].includes(motif)
    ? "water"
    : motif === "cloud"
      ? "vapor"
      : ["embers", "sunFan", "sunColumn", "solarCrown"].includes(motif)
        ? "fire"
        : ["sprout", "forestCrest", "vineBloom"].includes(motif)
          ? "leaf"
          : ["rune", "grid", "mirrors", "prism", "magicGate", "phantomLanternArray"].includes(motif)
            ? "glass"
            : "energy";
  ctx.globalCompositeOperation = particleMaterial === "leaf" ? "source-over" : "lighter";
  ctx.lineCap = "round";
  for (let index = 0; index < particles.length; index += 1) {
    const particle = particles[index];
    const age = local - impactTime - particle.delay;
    if (age <= 0 || age >= particle.life) continue;
    const life = 1 - age / particle.life;
    const distance = particle.speed * age;
    let angle = particle.angle;
    if (impactKind === "ground") angle = Math.PI + (particle.angle % Math.PI);
    if (impactKind === "wave") angle = (index % 2 ? Math.PI : 0) + (particle.angle - Math.PI) * .1;
    if (impactKind === "column") angle = -Math.PI / 2 + (particle.angle - Math.PI) * .16;
    if (particleMaterial === "fire") angle = -Math.PI / 2 + (particle.angle - Math.PI) * .23;
    const gravity = particleMaterial === "water" ? 76 : particleMaterial === "fire" ? 10 : impactKind === "column" ? 18 : impactKind === "ground" ? 36 : 54;
    const x = target.x + Math.cos(angle) * distance;
    const y = target.y + Math.sin(angle) * distance + gravity * age * age;
    const particleRgb = index % 2 ? accentRgb : rgb;
    if (particleMaterial === "vapor") {
      if (index % 2 === 0) battleModernVfxBloom(ctx, x, y, (6 + particle.size * 5) * strength, particleRgb, life * .24);
      continue;
    }
    if (particleMaterial === "water") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(.8, particle.size * .72 * strength), Math.max(1.6, particle.size * 1.85 * strength), 0, 0, Math.PI * 2);
      ctx.fillStyle = particle.white ? `rgba(255,255,255,${life * .72})` : battleModernVfxRgba(particleRgb, life * .62);
      ctx.shadowColor = battleModernVfxRgba(particleRgb, .86);
      ctx.shadowBlur = 7;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-particle.size * .18, -particle.size * .55, Math.max(.35, particle.size * .18), Math.max(.55, particle.size * .38), 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${life * .76})`;
      ctx.fill();
      ctx.restore();
      continue;
    }
    if (particleMaterial === "leaf") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + age * 5 * (index % 2 ? -1 : 1));
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1.2, particle.size * 1.35 * strength), Math.max(.55, particle.size * .48 * strength), 0, 0, Math.PI * 2);
      ctx.fillStyle = battleModernVfxRgba(particleRgb, life * .7);
      ctx.strokeStyle = `rgba(255,255,255,${life * .38})`;
      ctx.lineWidth = .55;
      ctx.shadowColor = battleModernVfxRgba(particleRgb, .64);
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (particleMaterial === "glass") {
      const size = Math.max(1.5, particle.size * 2.2 * strength);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + age * 3.4);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * .55, size * .72);
      ctx.lineTo(-size * .42, size * .38);
      ctx.closePath();
      ctx.fillStyle = battleModernVfxRgba(particleRgb, life * .28);
      ctx.strokeStyle = particle.white ? `rgba(255,255,255,${life * .86})` : battleModernVfxRgba(particleRgb, life * .76);
      ctx.lineWidth = .7;
      ctx.shadowColor = battleModernVfxRgba(particleRgb, .9);
      ctx.shadowBlur = 7;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }
    const tail = (particleMaterial === "fire" ? 11 : 8) * particle.size * strength;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail);
    ctx.lineTo(x, y);
    ctx.strokeStyle = particle.white ? `rgba(255,255,255,${life * .92})` : battleModernVfxRgba(particleRgb, life * .82);
    ctx.lineWidth = Math.max(.7, particle.size * strength);
    ctx.shadowColor = battleModernVfxRgba(particleRgb, .92);
    ctx.shadowBlur = particleMaterial === "fire" ? 13 : 9;
    ctx.stroke();
  }
  ctx.restore();
}

 const originalStrokeLayers=battleModernVfxStrokeLayers,originalFillMaterial=battleModernVfxFillMaterial;
 battleModernVfxStrokeLayers=(ctx,...args)=>ctx.captureAuthoredStroke?ctx.captureAuthoredStroke(...args):originalStrokeLayers(ctx,...args);
 battleModernVfxFillMaterial=(ctx,...args)=>ctx.captureAuthoredFill?ctx.captureAuthoredFill(...args):originalFillMaterial(ctx,...args);
 const configurations=new Map();
 function config(cue){const style=String(cue.visualType||cue.style||'route'),tier=cue.tier||'weak',actor=cue.actor||'me',name=cue.casterName||'',moveName=cue.moveName||'',key=[style,tier,actor,name,moveName].join('|');if(configurations.has(key))return configurations.get(key);
  const profile=battleModernVfxProfile(style),base=profile?'custom':String(cue.baseType||style),family=battleModernVfxFamily(base,style),rgb=battleModernVfxRgb(tier==='strong'?(actor==='enemy'?'#ff8f9b':'#ffd66d'):tier==='medium'?(actor==='enemy'?'#c9a6ff':'#8ee7ff'):(actor==='enemy'?'#ffc6de':'#9ff0c0')),accentRgb=profile?battleModernVfxRgb(profile.accent):rgb,strength=tier==='strong'?1.34:tier==='medium'?1.1:.9;
  const random=battleModernVfxRandom(battleModernVfxHash(moveName+'|'+name+'|'+tier+'|'+style));
  const particles=Array.from({length:tier==='strong'?62:tier==='medium'?44:30},(_,index)=>({angle:random()*Math.PI*2,speed:(48+random()*126)*strength,delay:random()*.2,life:.42+random()*.54,size:.7+random()*2.1,white:index%4===0}));
  const motes=Array.from({length:tier==='strong'?30:tier==='medium'?23:17},()=>({angle:random()*Math.PI*2,radius:18+random()*44,orbit:(random()>.5?1:-1)*(.7+random()*1.5),size:.7+random()*1.8}));
  const streaks=Array.from({length:tier==='strong'?22:tier==='medium'?16:11},()=>({offset:(random()-.5)*190*strength,delay:random()*.72,life:.38+random()*.34,length:30+random()*62,slant:12+random()*28,width:1.2+random()*2.5}));
  const lightning=Array.from({length:16},(_,i)=>i===0||i===15?0:(random()-.5)*70);
  const offsets={route:base==='route'?2.58:.88,slash:1.22,'cross-slash':1.16,starfall:.84,wind:.92,water:.9,'city-spark':.86,flash:1.02,thunder:1.3};
  const result={tier,profile,base,family,rgb,accentRgb,strength,particles,motes,streaks,lightning,attackStart:offsets[family]??.9,impactTime:base==='route'?4.8:2.62};if(configurations.size>48)configurations.delete(configurations.keys().next().value);configurations.set(key,result);return result;
 }
 function model(ctx,cue,seconds,{width=450,height=360}={}){const cfg=config(cue),impactAt=Number(cue.impactAt)||5.32,origin=Number.isFinite(cue.effectOriginAt)?cue.effectOriginAt:impactAt-cfg.impactTime,attackStart=Number.isFinite(cue.releaseAt)?cue.releaseAt-origin:cfg.attackStart,local=seconds-origin,charge=tournamentChargeFrame(cue.tier,seconds,origin+attackStart,cue.chargeSequence);return{...cfg,charge,ctx,width,height,local,attackStart,impactTime:cfg.impactTime,start:{x:cue.actor==='enemy'?width*.75:width*.25,y:height*.63},target:{x:cue.actor==='enemy'?width*.25:width*.75,y:height*.58},actorDirection:cue.actor==='enemy'?-1:1,curveHeight:-height*(cfg.family==='water'?.1:.22),hit:cue.hit!==false,origin};}
 function paint(ctx,cue,seconds,options={}){const m=model(ctx,cue,seconds,options);const draw=(layer,fn)=>{ctx.authoredLayer=layer;fn(m);};draw('caster',battleModernVfxDrawCaster);if(m.local<0||m.local>m.impactTime+1.22)return m;draw('atmosphere',battleModernVfxDrawCinematicAtmosphere);draw('body',battleModernVfxDrawMaterialBody);let center=null;
  ctx.authoredLayer='signature';if(m.profile){if(m.profile.travel==='arc'){ctx.authoredLayer='travel';center=battleModernVfxDrawTravel(m,.42);ctx.authoredLayer='signature';}battleModernVfxDrawSignature(m);}else{if(['route','wind','water','city-spark','flash'].includes(m.family))center=battleModernVfxDrawTravel(m,m.family==='route'?1:.72);if(m.family==='slash'||m.family==='cross-slash')battleModernVfxDrawSlash(m);if(m.family==='starfall')battleModernVfxDrawStarfall(m);if(m.family==='wind')battleModernVfxDrawWind(m,center);if(m.family==='water')battleModernVfxDrawWater(m,center);if(m.family==='city-spark')battleModernVfxDrawCity(m,center);if(m.family==='flash')battleModernVfxDrawFlash(m,center);if(m.family==='thunder')battleModernVfxDrawThunder(m);}
  if(!options.reducedMotion)draw('impact',battleModernVfxDrawImpact);return m;
 }
 function reference(canvas,cue,seconds,background=null){const ctx=canvas.getContext('2d'),width=450,height=360;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);if(background)ctx.drawImage(background,0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);const facade=new Proxy(ctx,{get(target,key){if(key==='canvas')return{clientWidth:width,clientHeight:height};const value=target[key];return typeof value==='function'?value.bind(target):value;},set(target,key,value){target[key]=value;return true;}});return paint(facade,cue,seconds,{width,height});}
 return{config,model,paint,reference,createChargeSequence:createTournamentChargeSequence,sha256:TOURNAMENT_ORIGINAL_ART_SHA256};
}

// Convert the original authored vector commands into batched 3D surfaces.
// No match simulation, item, monster, reward or save logic belongs here.
const tournamentLinearPalette=Float32Array.from({length:256},(_,i)=>{const v=i/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
function tournamentPaintColor(value){
 if(typeof value!=='string')return null;let r=255,g=255,b=255,a=1;
 if(value[0]==='#'){let s=value.slice(1);if(s.length===3)s=[...s].map(c=>c+c).join('');r=parseInt(s.slice(0,2),16);g=parseInt(s.slice(2,4),16);b=parseInt(s.slice(4,6),16);}
 else{const m=value.match(/rgba?\(\s*([-+\deE.]+)[,\s]+([-+\deE.]+)[,\s]+([-+\deE.]+)(?:[,\s/]+([-+\deE.]+))?\s*\)/);if(!m)return null;r=+m[1];g=+m[2];b=+m[3];a=m[4]===undefined?1:+m[4];}
 return{r:tournamentLinearPalette[Math.round(clamp(r,0,255))],g:tournamentLinearPalette[Math.round(clamp(g,0,255))],b:tournamentLinearPalette[Math.round(clamp(b,0,255))],a:clamp(a)};
}
function tournamentPaintSample(paint,x,y){
 if(typeof paint==='string')return tournamentPaintColor(paint)||{r:1,g:1,b:1,a:0};
 if(!paint?.stops?.length)return{r:1,g:1,b:1,a:0};const p=paint.points;let t=0;
 if(paint.kind==='linear'){const dx=p[2]-p[0],dy=p[3]-p[1];t=((x-p[0])*dx+(y-p[1])*dy)/Math.max(.00001,dx*dx+dy*dy);}
 else t=(Math.hypot(x-p[3],y-p[4])-p[2])/Math.max(.001,p[5]-p[2]);
 t=clamp(t);let left=paint.stops[0],right=paint.stops.at(-1);for(let i=1;i<paint.stops.length;i++)if(t<=paint.stops[i][0]){left=paint.stops[i-1];right=paint.stops[i];break;}const f=clamp((t-left[0])/Math.max(.0001,right[0]-left[0])),a=left[1],b=right[1];return{r:a.r+(b.r-a.r)*f,g:a.g+(b.g-a.g)*f,b:a.b+(b.b-a.b)*f,a:a.a+(b.a-a.a)*f};
}
function tournamentPaintPeak(paint){if(typeof paint==='string')return tournamentPaintColor(paint);if(!paint?.stops)return null;return paint.stops.reduce((best,s)=>s[1].a*(s[1].r+s[1].g+s[1].b)>(best?.a||0)*((best?.r||0)+(best?.g||0)+(best?.b||0))?s[1]:best,null);}
export function createTournamentVectorRecorder(){
 let transform=[1,0,0,1,0,0],stack=[],paths=[],path=null;const strokes=[],fills=[],glows=[];
 const ctx={canvas:{clientWidth:450,clientHeight:360},authoredLayer:'signature',globalAlpha:1,globalCompositeOperation:'source-over',lineWidth:1,strokeStyle:'#fff',fillStyle:'#fff',shadowBlur:0};
 const point=(x,y)=>[transform[0]*x+transform[2]*y+transform[4],transform[1]*x+transform[3]*y+transform[5]];
 const append=(x,y)=>{const p=point(x,y);if(!path){path={points:[],closed:false};paths.push(path);}const last=path.points.at(-1);if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>.0001)path.points.push(p);};
 Object.assign(ctx,{
  save(){stack.push({transform:[...transform],globalAlpha:ctx.globalAlpha,globalCompositeOperation:ctx.globalCompositeOperation,lineWidth:ctx.lineWidth,strokeStyle:ctx.strokeStyle,fillStyle:ctx.fillStyle,shadowBlur:ctx.shadowBlur});},
  restore(){const v=stack.pop();if(v){transform=v.transform;for(const k of['globalAlpha','globalCompositeOperation','lineWidth','strokeStyle','fillStyle','shadowBlur'])ctx[k]=v[k];}},
  translate(x,y){transform[4]+=transform[0]*x+transform[2]*y;transform[5]+=transform[1]*x+transform[3]*y;},
  scale(x,y){transform[0]*=x;transform[1]*=x;transform[2]*=y;transform[3]*=y;},
  rotate(a){const [x,y,c,d]=transform,co=Math.cos(a),si=Math.sin(a);transform[0]=x*co+c*si;transform[1]=y*co+d*si;transform[2]=c*co-x*si;transform[3]=d*co-y*si;},
  setTransform(a,b,c,d,e,f){transform=[a,b,c,d,e,f];},
  beginPath(){paths=[];path=null;},moveTo(x,y){path={points:[point(x,y)],closed:false};paths.push(path);},lineTo:append,
  closePath(){if(path)path.closed=true;},
  quadraticCurveTo(cx,cy,x,y){const start=path?.points.at(-1)||point(0,0),control=point(cx,cy),end=point(x,y);if(!path){path={points:[start],closed:false};paths.push(path);}for(let i=1;i<=20;i++){const t=i/20,u=1-t;path.points.push([u*u*start[0]+2*u*t*control[0]+t*t*end[0],u*u*start[1]+2*u*t*control[1]+t*t*end[1]]);}},
  bezierCurveTo(c1x,c1y,c2x,c2y,x,y){const start=path?.points.at(-1)||point(0,0),a=point(c1x,c1y),b=point(c2x,c2y),end=point(x,y);if(!path){path={points:[start],closed:false};paths.push(path);}for(let i=1;i<=28;i++){const t=i/28,u=1-t;path.points.push([u*u*u*start[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t*t*t*end[0],u*u*u*start[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t*t*t*end[1]]);}},
  ellipse(x,y,rx,ry,rotation,start,end,ccw=false){let arc=end-start;if(Math.abs(arc)>=Math.PI*2-.0001)arc=ccw?-Math.PI*2:Math.PI*2;else if(ccw&&arc>0)arc-=Math.PI*2;else if(!ccw&&arc<0)arc+=Math.PI*2;const n=Math.max(10,Math.ceil(Math.abs(arc)*Math.min(12,Math.sqrt(Math.max(rx,ry))*1.7))),co=Math.cos(rotation),si=Math.sin(rotation);for(let i=0;i<=n;i++){const a=start+arc*i/n,px=Math.cos(a)*rx,py=Math.sin(a)*ry;append(x+px*co-py*si,y+px*si+py*co);}if(Math.abs(arc)>Math.PI*2-.001&&path)path.closed=true;},
  arc(x,y,r,start,end,ccw){ctx.ellipse(x,y,r,r,0,start,end,ccw);},
  createLinearGradient(x0,y0,x1,y1){const a=point(x0,y0),b=point(x1,y1),g={kind:'linear',points:[...a,...b],stops:[],addColorStop(t,color){this.stops.push([t,tournamentPaintColor(color)]);this.stops.sort((a,b)=>a[0]-b[0]);}};return g;},
  createRadialGradient(x0,y0,r0,x1,y1,r1){const a=point(x0,y0),b=point(x1,y1),scale=Math.sqrt(Math.abs(transform[0]*transform[3]-transform[1]*transform[2])),g={kind:'radial',points:[...a,r0*scale,...b,r1*scale],stops:[],addColorStop(t,color){this.stops.push([t,tournamentPaintColor(color)]);this.stops.sort((a,b)=>a[0]-b[0]);}};return g;},
  stroke(){const paint=ctx.strokeStyle,peak=tournamentPaintPeak(paint);if(!peak||peak.a*ctx.globalAlpha<.01||Math.max(peak.r,peak.g,peak.b)<.035)return;const gradient=typeof paint!=='string';if(!gradient&&ctx.shadowBlur>ctx.lineWidth&&peak.a<.32&&ctx.authoredLayer!=='impact'&&ctx.authoredLayer!=='atmosphere')return;const width=ctx.lineWidth*Math.sqrt(Math.abs(transform[0]*transform[3]-transform[1]*transform[2]));for(const p of paths)if(p.points.length>1)strokes.push({points:p.points,closed:p.closed,width,paint,alpha:ctx.globalAlpha,layer:ctx.authoredLayer,core:!gradient});},
  fill(){const paint=ctx.fillStyle,peak=tournamentPaintPeak(paint);if(!peak||peak.a*ctx.globalAlpha<.008||Math.max(peak.r,peak.g,peak.b)<.035)return;for(const p of paths)if(p.points.length>2){if(paint?.kind==='radial'&&ctx.globalCompositeOperation==='lighter'&&ctx.authoredLayer!=='impact'){const xs=p.points.map(v=>v[0]),ys=p.points.map(v=>v[1]);glows.push({x:(Math.min(...xs)+Math.max(...xs))/2,y:(Math.min(...ys)+Math.max(...ys))/2,w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),paint,alpha:ctx.globalAlpha,layer:ctx.authoredLayer});}else fills.push({points:p.points,paint,alpha:ctx.globalAlpha,layer:ctx.authoredLayer,light:ctx.globalCompositeOperation==='lighter'});}},
  fillRect(x,y,w,h){const paint=ctx.fillStyle,peak=tournamentPaintPeak(paint);if(!peak||peak.a*ctx.globalAlpha<.008||Math.max(peak.r,peak.g,peak.b)<.035||Math.abs(w*h)>ctx.canvas.clientWidth*ctx.canvas.clientHeight*.9)return;const a=point(x,y),b=point(x+w,y+h);glows.push({x:(a[0]+b[0])/2,y:(a[1]+b[1])/2,w:Math.abs(b[0]-a[0]),h:Math.abs(b[1]-a[1]),paint,alpha:ctx.globalAlpha,layer:ctx.authoredLayer});},
  captureAuthoredStroke(trace,rgb,accent,alpha,width){if(alpha<=0||width<=0)return;ctx.save();trace();const w=ctx.canvas.clientWidth,h=ctx.canvas.clientHeight,g=ctx.createLinearGradient(0,h*.12,w,h*.88);g.addColorStop(0,'rgba('+accent.join(',')+','+clamp(alpha*.94)+')');g.addColorStop(.38,'rgba(255,255,255,'+clamp(alpha*.98)+')');g.addColorStop(.57,'rgba('+rgb.join(',')+','+clamp(alpha*.96)+')');g.addColorStop(1,'rgba('+rgb.map(v=>Math.max(2,Math.round(v*.16))).join(',')+','+clamp(alpha*.84)+')');ctx.strokeStyle=g;ctx.lineWidth=width*1.72;ctx.shadowBlur=0;const auraStart=strokes.length;ctx.stroke();for(let i=auraStart;i<strokes.length;i++)strokes[i].aura={color:accent,alpha:alpha*.18,width:width*5.2};ctx.strokeStyle='rgba(255,255,255,'+clamp(alpha*.94)+')';ctx.lineWidth=Math.max(.65,width*.28);ctx.stroke();ctx.restore();},
  captureAuthoredFill(trace,x,y,radius,rgb,accent,alpha,glass=false){
   if(alpha<=0||radius<=0)return;ctx.save();trace();
   const g=ctx.createRadialGradient(x-radius*.32,y-radius*.38,radius*.04,x,y,radius);
   g.addColorStop(0,'rgba(255,255,255,'+clamp(alpha*.98)+')');
   g.addColorStop(.1,'rgba('+accent.join(',')+','+clamp(alpha*.94)+')');
   g.addColorStop(.34,'rgba('+rgb.join(',')+','+clamp(alpha*(glass?.66:.92))+')');
   g.addColorStop(.7,'rgba('+accent.map(v=>Math.max(4,Math.round(v*.24))).join(',')+','+clamp(alpha*(glass?.52:.88))+')');
   g.addColorStop(1,'rgba('+rgb.map(v=>Math.max(2,Math.round(v*.12))).join(',')+','+clamp(alpha*(glass?.28:.82))+')');
   ctx.globalCompositeOperation='source-over';ctx.fillStyle=g;
   const first=fills.length;ctx.fill();for(let i=first;i<fills.length;i++)fills[i].surfaceGlass=glass;
   // The original material's clipped highlight is a surface, never an unbounded
   // glow rectangle. It shares the exact outline and depth of the solid body.
   const sheen=ctx.createRadialGradient(x-radius*.34,y-radius*.4,0,x-radius*.18,y-radius*.22,radius*.62);
   sheen.addColorStop(0,'rgba(255,255,255,'+clamp(alpha*.94)+')');
   sheen.addColorStop(.18,'rgba(255,255,255,'+clamp(alpha*.34)+')');
   sheen.addColorStop(1,'rgba(255,255,255,0)');
   for(const p of paths)if(p.points.length>2)fills.push({points:p.points,paint:sheen,alpha:ctx.globalAlpha,layer:ctx.authoredLayer,light:true,sheen:true,surfaceGlass:glass});
   ctx.strokeStyle='rgba(255,255,255,'+clamp(alpha*.8)+')';ctx.lineWidth=Math.max(.75,radius*.026);ctx.stroke();ctx.restore();
  },
  clearRect(){},
  reset(){transform=[1,0,0,1,0,0];stack=[];paths=[];path=null;strokes.length=fills.length=glows.length=0;ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.lineWidth=1;ctx.shadowBlur=0;},
  get strokes(){return strokes;},get fills(){return fills;},get glows(){return glows;}
 });return ctx;
}
function tournamentDynamicBatch(T,material,capacity=120000){
 const geometry=new T.BufferGeometry(),positions=new Float32Array(capacity*3),normals=new Float32Array(capacity*3),colors=new Float32Array(capacity*3),alphas=new Float32Array(capacity);geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('aAlpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));geometry.setDrawRange(0,0);const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;let used=0,overflow=false;
 return{mesh,begin(){used=0;overflow=false;},vertex(x,y,z,nx,ny,nz,c,alpha){if(used>=capacity){overflow=true;return;}const i=used*3;positions[i]=x;positions[i+1]=y;positions[i+2]=z;normals[i]=nx;normals[i+1]=ny;normals[i+2]=nz;colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;alphas[used]=clamp(c.a*alpha);used++;},end(){geometry.setDrawRange(0,used);for(const name of['position','normal','color','aAlpha']){const a=geometry.attributes[name];a.clearUpdateRanges();a.addUpdateRange(0,used*a.itemSize);a.needsUpdate=true;}mesh.visible=used>0;},get vertices(){return used;},get overflow(){return overflow;}};
}
function tournamentAuthoredMaterial(T,{light=false,solid=false,glass=false}={}){
 const material=light?new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,transparent:true,depthWrite:false,depthTest:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:true}):new T.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:solid?.13:.2,metalness:solid?.16:.32,clearcoat:1,clearcoatRoughness:.08,emissive:0xffffff,emissiveIntensity:solid?.12:.42,transparent:true,depthWrite:false,side:T.DoubleSide});
 if(glass){material.roughness=.09;material.metalness=0;material.transmission=0;material.thickness=.65;material.ior=1.44;material.dispersion=0;material.iridescence=.22;material.iridescenceIOR=1.3;material.iridescenceThicknessRange=[120,360];material.emissiveIntensity=.06;}
 material.forceSinglePass=true;
 material.onBeforeCompile=shader=>{shader.vertexShader='attribute float aAlpha;varying float vAuthoredAlpha;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAuthoredAlpha=aAlpha;');shader.fragmentShader='varying float vAuthoredAlpha;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vAuthoredAlpha;');if(light)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=3.2;');else shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=vColor.rgb;');};material.customProgramCacheKey=()=>`authored-vector-v3-${light}-${solid}-${glass}`;return material;
}
function tournamentInstancedStrokeBatch(T,{light=false,shade=false,capacity=10000}={}){
 const geometry=new T.CylinderGeometry(1,1,1,8,1,!!light),from=new Float32Array(capacity*3),to=new Float32Array(capacity*3),alpha=new Float32Array(capacity*2);for(const [name,array,size]of[['aFromColor',from,3],['aToColor',to,3],['aStrokeAlpha',alpha,2]])geometry.setAttribute(name,new T.InstancedBufferAttribute(array,size).setUsage(T.DynamicDrawUsage));
 const material=light?new T.MeshBasicMaterial({color:0xffffff,transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending}):new T.MeshPhysicalMaterial({color:0xffffff,roughness:.2,metalness:.32,clearcoat:1,clearcoatRoughness:.08,emissive:0xffffff,emissiveIntensity:shade?.035:3.0,transparent:true,depthWrite:false,depthTest:false,blending:shade?T.NormalBlending:T.AdditiveBlending});
 material.onBeforeCompile=shader=>{shader.vertexShader='attribute vec3 aFromColor,aToColor;attribute vec2 aStrokeAlpha;varying vec3 vStrokeColor;varying float vStrokeAlpha;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat strokeT=clamp(position.y+.5,0.,1.);vStrokeColor=mix(aFromColor,aToColor,strokeT);vStrokeAlpha=mix(aStrokeAlpha.x,aStrokeAlpha.y,strokeT);');shader.fragmentShader='varying vec3 vStrokeColor;varying float vStrokeAlpha;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=vStrokeColor'+(light==="halo"?'*1.4':light==='spectrum'?'*1.8':light?'*3.2':'')+';diffuseColor.a*=vStrokeAlpha;');if(!light)shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=vStrokeColor;');};if(light==='halo'){const previous=material.onBeforeCompile;material.onBeforeCompile=shader=>{previous(shader);shader.vertexShader='varying vec3 vHaloNormal,vHaloPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvHaloNormal=normalMatrix*mat3(instanceMatrix)*normal;vHaloPosition=(modelViewMatrix*instanceMatrix*vec4(position,1.)).xyz;');shader.fragmentShader='varying vec3 vHaloNormal,vHaloPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=pow(abs(dot(normalize(vHaloNormal),normalize(-vHaloPosition))),2.4)*.4;');};}material.customProgramCacheKey=()=>`authored-stroke-v5-${light}-${shade}`;
 const mesh=new T.InstancedMesh(geometry,material,capacity),dummy=new T.Object3D(),direction=new T.Vector3(),up=new T.Vector3(0,1,0);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;let count=0,overflow=false;
 return{mesh,begin(){count=0;overflow=false;},segment(a,b,radius,ca,cb,opacity){if(count>=capacity){overflow=true;return;}direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=direction.length();if(length<.00001)return;dummy.position.set((a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5);dummy.quaternion.setFromUnitVectors(up,direction.multiplyScalar(1/length));dummy.scale.set(radius,length,radius);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);const i=count*3;from[i]=ca.r;from[i+1]=ca.g;from[i+2]=ca.b;to[i]=cb.r;to[i+1]=cb.g;to[i+2]=cb.b;alpha[count*2]=ca.a*opacity;alpha[count*2+1]=cb.a*opacity;count++;},end(){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;for(const name of['aFromColor','aToColor','aStrokeAlpha']){const a=geometry.attributes[name];a.clearUpdateRanges();a.addUpdateRange(0,count*a.itemSize);a.needsUpdate=true;}},get segments(){return count;},get vertices(){return count*geometry.attributes.position.count;},get overflow(){return overflow;}};
}
function createTournamentAuthoredGlows(T){
 const max=180,geometry=new T.PlaneGeometry(1,1),tints=new Float32Array(max*3),alphas=new Float32Array(max),kinds=new Float32Array(max);geometry.setAttribute('aTint',new T.InstancedBufferAttribute(tints,3));geometry.setAttribute('aGlowAlpha',new T.InstancedBufferAttribute(alphas,1));geometry.setAttribute('aGlowKind',new T.InstancedBufferAttribute(kinds,1));
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:T.AdditiveBlending,vertexShader:'attribute vec3 aTint;attribute float aGlowAlpha,aGlowKind;varying vec2 p;varying vec3 tint;varying float alpha,kind;void main(){p=uv;tint=aTint;alpha=aGlowAlpha;kind=aGlowKind;vec4 v=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);v.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*v;}',fragmentShader:'varying vec2 p;varying vec3 tint;varying float alpha,kind;void main(){vec2 q=p*2.-1.;float r=kind<.5?length(q):abs(q.x);float a=exp(-r*r*(kind<.5?3.8:5.))*smoothstep(1.,.65,r);vec3 c=mix(tint,vec3(1.),pow(max(0.,1.-r),24.)*.82);gl_FragColor=vec4(c*1.65,alpha*a);}'}),mesh=new T.InstancedMesh(geometry,material,max),dummy=new T.Object3D();mesh.frustumCulled=false;mesh.count=0;
 return{mesh,update(records,map){let count=0;for(const r of records){if(count>=max)break;const peak=tournamentPaintPeak(r.paint);if(!peak)continue;const p=map([r.x,r.y],r,false,count),width=Math.max(.035,r.w*.08),height=Math.max(.025,r.h*.08);dummy.position.set(p[0],p[1],p[2]);dummy.scale.set(width,height,1);dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);const hue=r.paint?.stops?.find(s=>s[0]>.05&&s[0]<.65&&Math.max(s[1].r,s[1].g,s[1].b)-Math.min(s[1].r,s[1].g,s[1].b)>.04)?.[1]||peak;tints[count*3]=hue.r;tints[count*3+1]=hue.g;tints[count*3+2]=hue.b;alphas[count]=peak.a*r.alpha*(r.layer==='atmosphere'?.72:.75);kinds[count]=r.paint?.kind==='linear'?1:0;count++;}mesh.count=count;mesh.instanceMatrix.needsUpdate=true;for(const name of['aTint','aGlowAlpha','aGlowKind'])geometry.attributes[name].needsUpdate=true;mesh.visible=count>0;},get count(){return mesh.count;}};
}
export function createTournamentAuthoredEffects(T,scene){
 const source=createTournamentAuthoredSource(),recorder=createTournamentVectorRecorder(),root=new T.Group(),signature=new T.Group(),shared=new T.Group();root.name='three-dimensional-techniques';shared.name='technique-light-and-impact';root.add(signature,shared);scene.add(root);
 const solidMaterial=tournamentAuthoredMaterial(T,{solid:true}),glassMaterial=tournamentAuthoredMaterial(T,{solid:true,glass:true}),lightMaterial=tournamentAuthoredMaterial(T,{light:true,solid:true}),bodyBatch=tournamentInstancedStrokeBatch(T),coreBatch=tournamentInstancedStrokeBatch(T,{light:true}),spectrumBatch=tournamentInstancedStrokeBatch(T,{light:'spectrum',capacity:20000}),edgeShade=tournamentInstancedStrokeBatch(T,{shade:true}),haloBatch=tournamentInstancedStrokeBatch(T,{light:'halo'}),solidBatch=tournamentDynamicBatch(T,solidMaterial,90000),glassBatch=tournamentDynamicBatch(T,glassMaterial,60000),lightBatch=tournamentDynamicBatch(T,lightMaterial,60000),glows=createTournamentAuthoredGlows(T);signature.add(bodyBatch.mesh,coreBatch.mesh,haloBatch.mesh,solidBatch.mesh,lightBatch.mesh,glows.mesh,edgeShade.mesh,spectrumBatch.mesh,glassBatch.mesh);
 solidBatch.mesh.renderOrder=10;glassBatch.mesh.renderOrder=11;lightBatch.mesh.renderOrder=15;edgeShade.mesh.renderOrder=19;spectrumBatch.mesh.renderOrder=19.5;bodyBatch.mesh.renderOrder=20;haloBatch.mesh.renderOrder=21;coreBatch.mesh.renderOrder=22;glows.mesh.renderOrder=23;
 const shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float opacity;void main(){float r=length(p);gl_FragColor=vec4(.015,.025,.045,exp(-r*r*3.)*smoothstep(1.,.65,r)*opacity);}',uniforms:{opacity:{value:0}}}),shadow=new T.Mesh(new T.PlaneGeometry(1,1),shadowMaterial);shadow.rotation.x=-Math.PI/2;shared.add(shadow);const casterLight=new T.PointLight(0xffffff,0,30,2),contactLight=new T.PointLight(0xffffff,0,35,2);casterLight.name='tournament-caster-light';contactLight.name='tournament-contact-light';shared.add(casterLight,contactLight);let cue={},cfg=null,model=null,stats={},lastTime=-1,lastReduced=false;const topologyCache=new Map();
 const trig=Array.from({length:7},(_,i)=>[Math.cos(i/6*Math.PI*2),Math.sin(i/6*Math.PI*2)]);
 function floorPath(record){if(record.layer==='caster')return true;if(record.layer==='signature'&&cfg.profile?.motif==='grid')return true;if(record.layer==='impact'&&cfg.profile?.impact==='ground')return true;if(record.layer==='impact'&&cfg.profile?.impact==='column'&&record.closed){const xs=record.points.map(p=>p[0]),ys=record.points.map(p=>p[1]);return Math.max(...xs)-Math.min(...xs)>(Math.max(...ys)-Math.min(...ys))*2;}return false;}
 function map(point,record,floor=false,index=0){const x=(point[0]-model.width*.5)*.08,base=model.target.y+72;if(floor){if(record.layer==='caster')return[x,.16,-(point[1]-(model.start.y+21))*.08/.28];if(cfg.profile?.motif==='grid'&&record.layer==='signature'){const v=clamp((point[1]-(model.target.y-24*cfg.strength))/(96*cfg.strength));return[(model.target.x-model.width*.5)*.08+(point[0]-model.target.x)*.08/Math.max(.45,.45+v*.65),.17,6-v*12];}return[x,.19,-(point[1]-(model.target.y+48*cfg.strength))*.08/.25];}
  const particle=record.layer==='impact'&&record.points&&record.points.length<5,depth=record.layer==='body'?.8:record.layer==='caster'?1.4:record.layer==='atmosphere'?2.1:particle?2.8+Math.sin((record.points.reduce((v,p)=>v+p[0]+p[1],0)/record.points.length)*.016)*2:3.8;return[x,.16+(base-point[1])*.08,depth];}
 function tube(record,index){
  const batch=record.core?coreBatch:bodyBatch,points=record.closed?[...record.points,record.points[0]]:record.points,flat=floorPath(record),radius=Math.max(record.core?.014:.022,record.width*.08*.5);
  const fixed=typeof record.paint==='string'?tournamentPaintSample(record.paint,0,0):null;
  const sample=p=>fixed||tournamentPaintSample(record.paint,...p);
  let optics=null;
  if(record.aura){
   const c=record.aura.color.map(v=>tournamentLinearPalette[Math.round(v)]),deep=cfg.rgb.map(v=>tournamentLinearPalette[Math.max(2,Math.round(v*.16))]),width=record.aura.width/5.2,alpha=record.aura.alpha/.18;
   optics={width,halo:{r:c[0],g:c[1],b:c[2],a:record.aura.alpha},shade:{r:deep[0],g:deep[1],b:deep[2],a:alpha*.68},
    pink:{r:1,g:tournamentLinearPalette[87],b:tournamentLinearPalette[178],a:alpha*.22},
    cyan:{r:tournamentLinearPalette[80],g:tournamentLinearPalette[220],b:1,a:alpha*.24},
    offset:Math.max(.45,width*.17)*.08,drop:Math.max(1,width*.72)*.08};
  }
  let a=map(points[0],record,flat,index),ca=sample(points[0]);
  for(let i=0;i<points.length-1;i++){
   const b=map(points[i+1],record,flat,index),cb=sample(points[i+1]);
   batch.segment(a,b,radius,ca,cb,record.alpha);
   if(optics){const p=optics,w=p.width;
    haloBatch.segment(a,b,record.aura.width*.08*.5,p.halo,p.halo,record.alpha);
    edgeShade.segment([a[0],a[1]-p.drop,a[2]-.09],[b[0],b[1]-p.drop,b[2]-.09],w*2.35*.08*.5,p.shade,p.shade,record.alpha);
    spectrumBatch.segment([a[0]-p.offset,a[1],a[2]-.04],[b[0]-p.offset,b[1],b[2]-.04],w*1.9*.08*.5,p.pink,p.pink,record.alpha);
    spectrumBatch.segment([a[0]+p.offset,a[1],a[2]-.04],[b[0]+p.offset,b[1],b[2]-.04],w*1.75*.08*.5,p.cyan,p.cyan,record.alpha);
   }a=b;ca=cb;
  }
 }
 function surface(record,index){let points=record.points;if(points.length>3&&Math.hypot(points[0][0]-points.at(-1)[0],points[0][1]-points.at(-1)[1])<.001)points=points.slice(0,-1);if(points.length<3)return;const topologyKey=record.layer+'|'+index+'|'+points.length;let triangles=topologyCache.get(topologyKey);if(!triangles){triangles=T.ShapeUtils.triangulateShape(points.map(p=>new T.Vector2(...p)),[]);if(topologyCache.size>512)topologyCache.clear();topologyCache.set(topologyKey,triangles);}const polygonArea=Math.abs(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0))*.5,coveredArea=triangles.reduce((a,t)=>{const p=points[t[0]],q=points[t[1]],r=points[t[2]];return a+Math.abs((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]))*.5;},0);if(Math.abs(coveredArea-polygonArea)>Math.max(.01,polygonArea*.003)){triangles=T.ShapeUtils.triangulateShape(points.map(p=>new T.Vector2(...p)),[]);topologyCache.set(topologyKey,triangles);}const batch=record.light?lightBatch:record.surfaceGlass?glassBatch:solidBatch,center=[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length],extent=[Math.max(...points.map(p=>Math.abs(p[0]-center[0]))),Math.max(...points.map(p=>Math.abs(p[1]-center[1])))],softBody=record.layer==='body'&&['cloud','drop','orbit','embers','lamps','sprout','tide'].includes(cfg.profile?.motif),bulge=record.layer==='body'&&(!record.light||record.sheen)?Math.min(1.25,Math.min(...extent)*.08*.38):.025;
  const pointCache=new Map();const pointData=p=>{let value=pointCache.get(p);if(value)return value;const w=map(p,record,false,index),r=Math.hypot((p[0]-center[0])/Math.max(1,extent[0]),(p[1]-center[1])/Math.max(1,extent[1])),z=.07+bulge*Math.sqrt(Math.max(0,1-r*r));value={front:[w[0],w[1],w[2]+z],back:[w[0],w[1],w[2]-z],color:tournamentPaintSample(record.paint,...p)};pointCache.set(p,value);return value;};const at=(p,front=1)=>front>0?pointData(p).front:pointData(p).back;
  const triangle=(a,b,c,front)=>{if(front<0)[b,c]=[c,b];const pa=at(a,front),pb=at(b,front),pc=at(c,front),ab=[pb[0]-pa[0],pb[1]-pa[1],pb[2]-pa[2]],ac=[pc[0]-pa[0],pc[1]-pa[1],pc[2]-pa[2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],l=Math.hypot(...n)||1;for(const [p,w]of[[a,pa],[b,pb],[c,pc]]){let normal=n.map(v=>v/l);if(softBody&&bulge>.05){const dx=(p[0]-center[0])/Math.max(1,extent[0]),dy=(p[1]-center[1])/Math.max(1,extent[1]),edge=Math.sqrt(Math.max(.02,1-dx*dx-dy*dy)),orientation=Math.sign(n[2])||front;normal=[bulge*dx/Math.max(.08,extent[0]*.08*edge),-bulge*dy/Math.max(.08,extent[1]*.08*edge),front];const length=Math.hypot(...normal);normal=normal.map(v=>v/length*(orientation===front?1:-1));}batch.vertex(...w,...normal,pointData(p).color,record.alpha);}};
  for(const tr of triangles){const a=points[tr[0]],b=points[tr[1]],c=points[tr[2]],m=[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3];for(const front of(record.light?[1]:[1,-1])){triangle(a,b,m,front);triangle(b,c,m,front);triangle(c,a,m,front);}}
  if(bulge>.05&&!record.light)for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],af=at(a,1),ab=at(a,-1),bf=at(b,1),bb=at(b,-1),dx=bf[0]-af[0],dy=bf[1]-af[1],l=Math.hypot(dx,dy)||1;for(const [p,w]of[[a,af],[b,bf],[b,bb],[a,af],[b,bb],[a,ab]])batch.vertex(...w,dy/l,-dx/l,0,pointData(p).color,record.alpha);}
 }
 function setCue(data){cue={...data};cfg=source.config(cue);signature.name='tournament-signature-'+(cfg.profile?.motif||cfg.family);signature.userData.officialMove=cue.moveName||TOURNAMENT_AUTHORED_MOVES.find(p=>p.style===cue.visualType)?.name||'';signature.userData.impactKind=cfg.profile?.impact||'ring';signature.userData.originalSourceSha256=source.sha256;lastTime=-1;topologyCache.clear();}
 function update({time,mode,reducedMotion=false}){const impactKind=cfg?.profile?.impact||'ring',motif=cfg?.profile?.motif||cfg?.family||'';if(mode!=='battle'||!cfg){root.visible=true;signature.visible=false;shadow.visible=false;casterLight.intensity=contactLight.intensity=0;return{motif,impactKind,phase:'idle',vertices:0};}root.visible=true;signature.visible=true;shadow.visible=true;if(time===lastTime&&reducedMotion===lastReduced)return stats;lastTime=time;lastReduced=reducedMotion;recorder.reset();model=source.paint(recorder,cue,time,{reducedMotion});
  for(const batch of[bodyBatch,coreBatch,haloBatch,edgeShade,spectrumBatch,solidBatch,glassBatch,lightBatch])batch.begin();for(let i=0;i<recorder.strokes.length;i++)tube(recorder.strokes[i],i);for(let i=0;i<recorder.fills.length;i++)surface(recorder.fills[i],i);for(const batch of[bodyBatch,coreBatch,haloBatch,edgeShade,spectrumBatch,solidBatch,glassBatch,lightBatch])batch.end();glows.update(recorder.glows,map);
  const age=model.local-model.impactTime,origin=model.origin,release=origin+model.attackStart,contact=cue.hit!==false&&age>=0&&age<1.08&&!reducedMotion,palette=new T.Color(...cfg.accentRgb.map(v=>v/255)).convertSRGBToLinear();casterLight.color.copy(palette);contactLight.color.copy(palette);casterLight.position.set((model.start.x-model.width*.5)*.08,4,2);contactLight.position.set((model.target.x-model.width*.5)*.08,4,2);const casterFade=model.charge.alpha*(model.charge.count?.56+model.charge.pulse*.44:0);casterLight.intensity=casterFade*(14+cfg.strength*16)*1;contactLight.intensity=contact?Math.exp(-age*4)*clamp(1-age/1.08)*110:0;contactLight.position.z=6;shadow.position.set((model.target.x-model.width*.5)*.08,.115,0);shadow.scale.setScalar(188*.08*cfg.strength);shadowMaterial.uniforms.opacity.value=clamp((model.local-(model.attackStart-.34))/.42)*clamp((model.impactTime+.86-model.local)/.92)*.28;
  const signaturePaths=recorder.strokes.filter(r=>r.layer==='signature'&&!r.core),impactPaths=recorder.strokes.filter(r=>r.layer==='impact'&&!r.core),peak=Math.sin(clamp((model.local-model.attackStart+.3)/Math.max(.3,model.impactTime-model.attackStart+.65))*Math.PI);
  stats={motif,impactKind,phase:model.local<0?(model.charge.count?'gather':'idle'):age>=0&&age<1.08?'impact':model.local<model.attackStart?'gather':age<0?'travel':'aftermath',authoredSource:source.sha256,signaturePaths:signaturePaths.length,contactPaths:impactPaths.length,spectralSegments:spectrumBatch.segments,sheenSurfaces:recorder.fills.filter(r=>r.sheen).length,vertices:bodyBatch.vertices+spectrumBatch.vertices+edgeShade.vertices+coreBatch.vertices+haloBatch.vertices+solidBatch.vertices+glassBatch.vertices+lightBatch.vertices,overflow:[bodyBatch,coreBatch,haloBatch,edgeShade,spectrumBatch,solidBatch,glassBatch,lightBatch].some(b=>b.overflow),effectBlend:cfg.strength*peak*.14,chargeCircles:model.charge.count,chargePulse:model.charge.pulse,chargeStartAt:1.4,chargeReleaseAt:release,originalLocal:model.local};return stats;
 }
 root.traverse(o=>{if(o.isMesh)o.layers.set(1);else if(o.isLight)o.layers.enable(1);});
 for(const batch of[coreBatch,haloBatch,spectrumBatch,lightBatch,glows])batch.mesh.layers.enable(2);
 return{root,setCue,update,get records(){return recorder;},get model(){return model;}};
}

function createTournamentCinematicEffects(T,scene){return createTournamentAuthoredEffects(T,scene); }
// Keep the arena and approved monsters out of the bloom source. Only the
// original technique geometry can scatter light into this additional pass.
export function createTournamentCinematicCompositor(T,renderer){
 if(!renderer.getRenderTarget||!renderer.setRenderTarget||(renderer.extensions&&!renderer.extensions.has('EXT_color_buffer_float')))return{render:(s,c)=>renderer.render(s,c),prepare(){},resize(){},dispose(){}};
 const target=(depth=false,samples=0)=>new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:depth,samples});
 const main=target(true,4),emission=target(true),nearA=target(),nearB=target(),wideA=target(),wideB=target(),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));
 quad.material.dispose();scene.add(quad);
 const vertex='varying vec2 p;void main(){p=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const blur=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:null},stepSize:{value:new T.Vector2()},extract:{value:0}},vertexShader:vertex,fragmentShader:'varying vec2 p;uniform sampler2D image;uniform vec2 stepSize;uniform float extract;vec3 sampleAt(vec2 uv){vec3 c=texture2D(image,uv).rgb;float l=max(max(c.r,c.g),c.b);float knee=smoothstep(.7,2.,l);return c*mix(1.,knee,extract);}void main(){vec3 c=sampleAt(p)*.227027;c+=(sampleAt(p+stepSize*1.384615)+sampleAt(p-stepSize*1.384615))*.316216;c+=(sampleAt(p+stepSize*3.230769)+sampleAt(p-stepSize*3.230769))*.07027;gl_FragColor=vec4(c,1.);}'});
 const compose=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:main.texture},nearBloom:{value:nearB.texture},wideBloom:{value:wideB.texture},effect:{value:0},activeGlow:{value:0}},vertexShader:vertex,fragmentShader:`varying vec2 p;uniform sampler2D image,nearBloom,wideBloom;uniform float effect,activeGlow;void main(){vec3 c=texture2D(image,p).rgb+(texture2D(nearBloom,p).rgb*.28+texture2D(wideBloom,p).rgb*.13)*activeGlow;float edge=smoothstep(.2,.78,length((p-.5)*vec2(.85,1.)));c*=1.-edge*(.045+effect*.25);gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});
 const clearColor=new T.Color(),pass=(input,out,x,y,extract)=>{quad.material=blur;blur.uniforms.image.value=input.texture;blur.uniforms.stepSize.value.set(x/input.width,y/input.height);blur.uniforms.extract.value=extract;renderer.setRenderTarget(out);renderer.render(scene,camera);};
 let prepared=false;
 return{
  prepare(s,c){
   if(prepared||!renderer.compile)return;
   const previous=renderer.getRenderTarget(),tone=renderer.toneMapping,hidden=[];
   try{
    // Charge materials live under a hidden group before the first sound.
    // Warm their real lit shader variants before audio starts, not on beat 1.
    s.getObjectByName?.('three-dimensional-techniques')?.traverse(o=>{hidden.push([o,o.visible]);o.visible=true;});
    renderer.toneMapping=T.NoToneMapping;renderer.setRenderTarget(main);renderer.compile(s,c);renderer.render(s,c);
    const luminous=new T.Scene();luminous.environment=s.environment;luminous.fog=s.fog;
    const glowLayer=new T.Layers();glowLayer.set(2);
    s.traverse(o=>{if(o.isMesh&&o.layers.test(glowLayer)){const proxy=o.isInstancedMesh?new T.InstancedMesh(o.geometry,o.material,0):new T.Mesh(o.geometry,o.material);luminous.add(proxy);}});
    renderer.setRenderTarget(emission);renderer.compile(luminous,c);luminous.clear();
    quad.material=blur;renderer.setRenderTarget(nearA);renderer.compile(scene,camera);
    quad.material=compose;renderer.setRenderTarget(previous);renderer.toneMapping=tone;renderer.compile(scene,camera);prepared=true;
   }finally{for(const[o,visible]of hidden)o.visible=visible;renderer.toneMapping=tone;renderer.setRenderTarget(previous);}
  },
  resize(w,h){const d=renderer.getPixelRatio();for(const [t,f]of[[main,1],[emission,.6],[nearA,.6],[nearB,.6],[wideA,.28],[wideB,.28]])t.setSize(Math.max(1,Math.floor(w*d*f)),Math.max(1,Math.floor(h*d*f)));},
  render(s,c,status={}){
   const previous=renderer.getRenderTarget(),tone=renderer.toneMapping,mask=c.layers.mask,background=s.background,alpha=renderer.getClearAlpha();
   renderer.getClearColor(clearColor);const glow=Number(status.vertices)>0&&['gather','travel','impact'].includes(status.phase);
   try{
    renderer.toneMapping=T.NoToneMapping;renderer.setRenderTarget(main);renderer.render(s,c);
    if(glow){
     c.layers.set(2);s.background=null;renderer.setClearColor(0x000000,0);renderer.setRenderTarget(emission);renderer.render(s,c);
     c.layers.mask=mask;s.background=background;renderer.setClearColor(clearColor,alpha);
     pass(emission,nearA,1.3,0,1);pass(nearA,nearB,0,1.25,0);pass(nearB,wideA,2.7,0,0);pass(wideA,wideB,0,2.6,0);
    }
    quad.material=compose;compose.uniforms.effect.value=status.effectBlend||0;compose.uniforms.activeGlow.value=glow?1:0;
    renderer.toneMapping=tone;renderer.setRenderTarget(previous);renderer.render(scene,camera);
   }finally{c.layers.mask=mask;s.background=background;renderer.setClearColor(clearColor,alpha);renderer.toneMapping=tone;renderer.setRenderTarget(previous);}
  },
  dispose(){for(const t of[main,emission,nearA,nearB,wideA,wideB])t.dispose();blur.dispose();compose.dispose();quad.geometry.dispose();}
 };
}

export function createTournamentArena(T,key,options){return createTournamentCinematicArena(T,key,options);}
// Cinematic coverage follows the existing action clock, never changes an attack.
export function tournamentCameraFrame(seconds,cue={},options={}){
 const t=Math.max(0,seconds),aspect=options.aspect||1,fov=options.fov??(aspect<.85?45:40),tan=Math.tan(fov*Math.PI/360),actors=options.actors||[{x:-9,halfWidth:5},{x:9,halfWidth:5}],caster=cue.actor==='enemy'?1:0,target=1-caster,release=cue.releaseAt??3.6,impact=cue.impactAt??5.32;
 const left=Math.min(...actors.map(a=>a.x-a.halfWidth)),right=Math.max(...actors.map(a=>a.x+a.halfWidth)),openingDistance=Math.max(34,Math.max(31,(right-left)*1.12)/(2*aspect*tan)+Math.max(4,...actors.map(a=>a.halfWidth))),distance=Math.min(openingDistance,options.distance||openingDistance),shot=(name,position,look)=>({name,position,look}),wide=shot('overview',[0,10,distance],[0,4,0]);
 function portrait(index,name){const a=actors[index]||actors[0],sign=index===0?-1:1,span=(a.bodyHalfWidth??a.halfWidth??5)*2+2.4,z=Math.min(distance,Math.max(20,span/(2*Math.max(.45,aspect)*tan)+1.2)),dodgeDepth=cue.hit===false&&index===target?5:0;return shot(name,[a.x-sign*17,7,z+dodgeDepth],[a.x,4.1,1.1+dodgeDepth]);}
 const contact=portrait(target,'contact'),count=cue.tier==='strong'?3:cue.tier==='medium'?2:1,hpEnd=cue.hurtUntil??impact+2.48,holdUntil=Math.max(impact+count*.62+.12,Number.isFinite(cue.cameraHoldUntil)?cue.cameraHoldUntil:hpEnd+1.3),panStart=Math.max(.4,Math.min(release+.05,impact-1.15)),readyAt=impact-.18;
 const blend=(a,b,u)=>{u=Math.max(0,Math.min(1,u));u=u*u*(3-2*u);return{name:u<.5?a.name:b.name,position:a.position.map((n,i)=>n+(b.position[i]-n)*u),look:a.look.map((n,i)=>n+(b.look[i]-n)*u)};};
 if(options.reducedMotion)return{...wide,name:'overview'};
 function ordinary(at){if(at<=panStart)return wide;if(at<readyAt-1e-9)return{...blend(wide,contact,(at-panStart)/(readyAt-panStart)),name:'approach'};if(at<=holdUntil||typeof cue.winner==='string')return{...contact,name:at<impact+.3?'contact':'reaction'};return blend(contact,wide,(at-holdUntil)/1.25);}
 const winner=cue.winner==='enemy'?1:0,decision=Math.max(cue.decisionAt??Infinity,holdUntil);
 if(options.mode==='result')return{...portrait(winner,'winner'),transitionSeconds:1.25};
 if(typeof cue.winner==='string'&&t>=decision)return blend(ordinary(decision),portrait(winner,'winner'),(t-decision)/1.25);
 return ordinary(t);
}

function tournamentHitEase(x){x=Math.max(0,Math.min(1,x));let lo=0,hi=1;for(let i=0;i<14;i++){const t=(lo+hi)/2,v=3*(1-t)*(1-t)*t*.25+3*(1-t)*t*t*.25+t*t*t;if(v<x)lo=t;else hi=t;}const t=(lo+hi)/2;return 3*(1-t)*(1-t)*t*.1+3*(1-t)*t*t+t*t*t;}
export function tournamentHitReactionFrame(seconds,cue={}){
 const count=cue.tier==='strong'?3:cue.tier==='medium'?2:1,age=seconds-(cue.impactAt??5.32),index=Math.floor(age/.62);
 if(cue.hit===false||age<0||index>=count)return{active:false,count,index:-1,recoil:0,brightness:0};
 const p=(age-index*.62)/.62,keys=[[0,0],[.18,-7],[.38,7],[.58,-4],[1,0]];let shift=0;for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){const a=keys[i-1],b=keys[i];shift=a[1]+(b[1]-a[1])*tournamentHitEase((p-a[0])/(b[0]-a[0]));break;}
 return{active:true,count,index,recoil:-shift/7,brightness:p<.18?tournamentHitEase(p/.18):1-tournamentHitEase((p-.18)/.82)};
}
function captureTournamentHitMaterials(root){const unique=new Set();root.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m?.emissive&&m.color)unique.add(m);});return[...unique].map(material=>({material,color:material.color.clone(),emissive:material.emissive.clone(),intensity:material.emissiveIntensity}));}
function applyTournamentHitBrightness(actor,value){for(const entry of actor.hitMaterials||[]){const {material,color,emissive,intensity}=entry;material.emissive.copy(emissive);material.emissiveIntensity=intensity;if(value>0){material.emissiveIntensity=Math.max(1,intensity);material.emissive.multiplyScalar(intensity/material.emissiveIntensity);const scale=.8*value/material.emissiveIntensity;material.emissive.r+=color.r*scale;material.emissive.g+=color.g*scale;material.emissive.b+=color.b*scale;}}}

// Temporary tournament expression; the shared character and its normal face stay intact.
export function tournamentHurtMouthOutline(T,segments=96){
 const shape=new T.Shape();shape.moveTo(-50,0);
 shape.bezierCurveTo(-45,-17,-32,-17,-18,-10);
 shape.bezierCurveTo(-8,-5,-3,-5,7,-11);
 shape.bezierCurveTo(20,-24,41,-15,49,-5);
 shape.bezierCurveTo(57,5,44,15,31,12);
 shape.bezierCurveTo(24,10.3846153846,21,1.6071428571,12,9);
 shape.bezierCurveTo(-2,20.5,-14,19.5,-29,17);
 // Arrival and departure tangents agree at both lip-corner joins.
 // This is the lower-right side after the face-coordinate conversion below.
 // Keep it entirely convex; the lower indentation belongs on the left only.
 shape.bezierCurveTo(-41,15,-53,10.2,-50,0);shape.closePath();
 const points=shape.getSpacedPoints(segments).slice(0,-1).map(p=>new T.Vector2(-p.x/52,-p.y/18));let area=0;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.y-a.y*b.x;}if(area<0)points.reverse();return points;
}
const tournamentMouthTopologyCache=new WeakMap();
function tournamentMouthTopology(T){
 const cached=tournamentMouthTopologyCache.get(T);if(cached)return cached;
 const points=tournamentHurtMouthOutline(T),edgeKey=(a,b)=>a<b?a+':'+b:b+':'+a;
 let triangles=T.ShapeUtils.triangulateShape(points,[]).map(tri=>{const[a,b,c]=tri,p=points[a],q=points[b],r=points[c];return(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x)>0?tri:[a,c,b];});
 // Ear-clipped polygons support the intended lower-left notch without folded
 // fan triangles. Shared-edge refinement keeps every interior point on the body.
 for(let pass=0;pass<8;pass++){
  const split=new Map();for(const v of triangles)for(let k=0;k<3;k++){const a=v[k],b=v[(k+1)%3],p=points[a],q=points[b],dx=p.x-q.x,dy=(p.y-q.y)*.5;if(dx*dx+dy*dy>.25*.25)split.set(edgeKey(a,b),[a,b]);}
  if(!split.size){const result={points,indices:triangles.flat()};tournamentMouthTopologyCache.set(T,result);return result;}
  const mids=new Map();for(const[key,[a,b]]of split){mids.set(key,points.length);points.push(new T.Vector2().addVectors(points[a],points[b]).multiplyScalar(.5));}
  const next=[];for(const v of triangles){const m=v.map((a,k)=>mids.get(edgeKey(a,v[(k+1)%3]))),count=m.filter(n=>n!==undefined).length;if(!count){next.push(v);continue;}if(count===3){const[a,b,c]=v,[ab,bc,ca]=m;next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);continue;}
   let i=0;if(count===1){i=m.findIndex(n=>n!==undefined);const a=v[i],b=v[(i+1)%3],c=v[(i+2)%3],ab=m[i];next.push([a,ab,c],[ab,b,c]);}else{while(!(m[i]!==undefined&&m[(i+1)%3]!==undefined))i++;const a=v[i],b=v[(i+1)%3],c=v[(i+2)%3],ab=m[i],bc=m[(i+1)%3];next.push([b,bc,ab],[a,ab,c],[ab,bc,c]);}}
  triangles=next;
 }
 throw Error('Mouth surface refinement did not converge');
}
export function createTournamentHurtFace(T,model){
 const eyes=(model.userData.faceFeatures||[]).slice(0,2).filter(o=>o?.isMesh);
 if(eyes.length!==2)return{supported:false,set(){},get active(){return false;}};
 model.updateMatrixWorld(true);eyes.sort((a,b)=>a.position.x-b.position.x);
 const inverse=model.matrixWorld.clone().invert(),body=model.userData.body||model,bounds=new T.Box3().setFromObject(body).applyMatrix4(inverse),gap=Math.abs(eyes[1].position.x-eyes[0].position.x),cx=(eyes[0].position.x+eyes[1].position.x)/2,eyeY=(eyes[0].position.y+eyes[1].position.y)/2,ray=new T.Raycaster();
 function surface(x,y){const origin=model.localToWorld(new T.Vector3(x,y,bounds.max.z+Math.max(1,bounds.max.z-bounds.min.z))),direction=new T.Vector3(0,0,-1).transformDirection(model.matrixWorld);ray.set(origin,direction);const hit=ray.intersectObject(body,true)[0];return hit?model.worldToLocal(hit.point.clone()).z:bounds.max.z;}
 const normal=[];model.traverse(o=>{if(eyes.includes(o)||/^(base-expression-mouth|base-expression-brow-|little-mouth|eye-highlight)/.test(o.name))normal.push({mesh:o,visible:o.visible});});
 const group=new T.Group();group.name='tournament-hurt-face';group.visible=false;const ink=new T.MeshBasicMaterial({color:0x16202c,toneMapped:false});
 for(const eye of eyes)for(const slope of[-1,1]){const r=eye.scale.x*.16,half=eye.scale.x*.83,points=[];for(let i=0;i<=12;i++){const u=(i/12*2-1)*half,x=eye.position.x+u,y=eye.position.y+u*slope;points.push(new T.Vector3(x,y,surface(x,y)+r*1.2+.04));}const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),20,r,8,false),ink);mesh.name='tournament-hurt-cross';mesh.renderOrder=4;group.add(mesh);}
 const old=model.getObjectByName('base-expression-mouth')||model.getObjectByName('little-mouth'),oldBounds=old?new T.Box3().setFromObject(old).applyMatrix4(inverse):null,oldY=oldBounds?(oldBounds.min.y+oldBounds.max.y)/2:eyeY-gap*.28;
 const halfWidth=1.05*Math.max(gap*.25,Math.min(gap*.29,oldBounds?(oldBounds.max.x-oldBounds.min.x)/2:gap*.27));let floor=bounds.min.y+(bounds.max.y-bounds.min.y)*.3;
 const clasp=model.userData.capeClasp||model.userData.capeFastener?.userData?.clasp;if(clasp){const box=new T.Box3().setFromObject(clasp).applyMatrix4(inverse);floor=Math.max(floor,box.max.y+gap*.04);}
 const ceiling=eyeY-gap*.025,halfHeight=Math.max(gap*.07,Math.min(gap*.105,(ceiling-floor)*.4)),centerY=Math.max(floor+halfHeight,Math.min(ceiling-halfHeight,oldY));
 // Broad opening with independently curved lips and rounded ends. Avoid the
 // pinched, symmetric lobes of the former radial/peanut construction.
 const topology=tournamentMouthTopology(T);
 // Subdivide the filled interior too, so a curved body cannot cover the centre.
 const vertices=[];for(const p of topology.points){const x=cx+p.x*halfWidth,y=centerY+p.y*halfHeight;vertices.push(x,y,surface(x,y)+.08);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(topology.indices);geometry.computeVertexNormals();const mouth=new T.Mesh(geometry,ink);mouth.name='tournament-hurt-open-mouth';mouth.renderOrder=4;group.add(mouth);model.add(group);
 let active=false;return{supported:true,group,mouth,normal,set(value){value=Boolean(value);if(value===active)return;active=value;group.visible=value;for(const part of normal)part.mesh.visible=value?false:part.visible;},get active(){return active;}};
}
export function tournamentHurtFaceActive(seconds,cue={},mode='battle',index=0){
 if(mode==='result')return Number(cue.resultHp?.[index===0?'me':'enemy'])<=0;
 if(mode!=='battle'||cue.hit===false||index!==(cue.actor==='enemy'?0:1))return false;
 const impact=cue.impactAt??5.32,until=cue.hurtUntil??impact+((cue.baseType==='route'||cue.visualType==='route')?5.28:2.48);
 return seconds>=impact&&(seconds<until||cue.targetHpAfter===0);
}

// A medal belongs to the actual body mesh, not an independent approximation
// of its bounce. Preserve its world size despite each monster's body scale.
function attachTournamentMedal(T,medal,actor){
 const body=actor.root.userData.body||actor.root;actor.root.updateMatrixWorld(true);
 const bounds=body.geometry?(body.geometry.computeBoundingBox(),body.geometry.boundingBox):new T.Box3().setFromObject(body).applyMatrix4(body.matrixWorld.clone().invert());
 const goal=new T.Vector3((bounds.min.x+bounds.max.x)/2,bounds.min.y+(bounds.max.y-bounds.min.y)*.28,bounds.max.z),size=bounds.getSize(new T.Vector3()),ray=new T.Raycaster();
 const origin=body.localToWorld(new T.Vector3(goal.x,goal.y,bounds.max.z+Math.max(1,size.z))),direction=new T.Vector3(0,0,-1).transformDirection(body.matrixWorld);ray.set(origin,direction);
 const hit=ray.intersectObject(body,true)[0];if(hit)goal.copy(body.worldToLocal(hit.point.clone()));
 const scale=body.getWorldScale(new T.Vector3());goal.z+=.12/Math.max(.0001,Math.abs(scale.z));body.add(medal);medal.userData.bodyGoal=goal;medal.userData.bodyAnchor=body;
}
function updateTournamentMedal(T,medal,seconds,reducedMotion){
 const body=medal.userData.bodyAnchor;if(!body)return;body.updateWorldMatrix(true,false);const scale=body.getWorldScale(new T.Vector3()),u=reducedMotion?1:smooth(seconds/1.35),q=medal.userData.bodyGoal;
 medal.position.copy(q);medal.position.y+=(1-u)*5/Math.max(.0001,Math.abs(scale.y));medal.rotation.set(0,0,0);medal.scale.set(1/Math.abs(scale.x),1/Math.abs(scale.y),1/Math.abs(scale.z)).multiplyScalar(1+(1-u)*.35);
}
function tournamentAwardWalkOffset(seconds){const phase=((seconds%.54)+.54)%.54/.54,values=[1.3,4.3,1.3,0,1.3],i=Math.min(3,Math.floor(phase*4)),u=(phase*4-i),ease=u*u*(3-2*u);return(values[i]+(values[i+1]-values[i])*ease)*.035;}

export function createTournament3DWorld(T,C,{buildCharacter,documentTarget=globalThis.document}={}){
 const scene=new T.Scene();const environment=createTournamentLightingEnvironment(T,documentTarget);scene.environment=environment;scene.environmentIntensity=.6;scene.fog=new T.FogExp2(0xc1d6df,.003);const camera=new T.PerspectiveCamera(40,1,.1,450);camera.position.set(0,17,42);camera.lookAt(0,4,0);camera.layers.enable(1);
 const hemi=new T.HemisphereLight(0xe5f3ff,0x445046,1.4),sun=new T.DirectionalLight(0xffe5c7,2.8);sun.position.set(-20,38,24);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:110});sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;scene.add(hemi,sun,new T.AmbientLight(0xffffff,.14));
 let arena=null,mode='opening',cue={},actors=[],startedAt=0,medalAt=null,aspect=1,disposed=false,awardCamera=null,baseDistance=45,resultCameraFrom=null,cameraShot='overview';const cameraTarget=new T.Vector3(0,4,0);const fx=createTournamentCinematicEffects(T,scene),effectRoot=fx.root,dummy=new T.Object3D();
 const podium=new T.Group();podium.name='three-dimensional-award-podium';scene.add(podium);
 const podiumMaterial=new T.MeshStandardMaterial({color:0xd9e1d8,roughness:.65}),medalMaterial=new T.MeshStandardMaterial({color:0xe5b852,metalness:.85,roughness:.21});
 const rankMaterial=new T.MeshStandardMaterial({color:0x35565e,roughness:.55}),digits={1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111']};
 for(const [x,h,n]of[[-10,2,2],[0,3.6,1],[10,1.25,3]]){const block=new T.Mesh(new T.BoxGeometry(8.6,h,8.6),podiumMaterial);block.name='podium-stage-'+n;block.position.set(x,h/2,0);block.castShadow=block.receiveShadow=true;podium.add(block);const pixels=digits[n].flatMap((row,y)=>[...row].flatMap((v,i)=>v==='1'?[{x:i-1,y:2-y}]:[])),rank=new T.InstancedMesh(new T.BoxGeometry(.17,.17,.09),rankMaterial,pixels.length);rank.name='podium-rank-'+n;for(let i=0;i<pixels.length;i++){dummy.position.set(x+pixels[i].x*.18,h/2+pixels[i].y*.18,4.37);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();rank.setMatrixAt(i,dummy.matrix);}rank.instanceMatrix.needsUpdate=true;podium.add(rank);}
 const medal=new T.Group(),disc=new T.Mesh(new T.CylinderGeometry(.65,.65,.14,40),medalMaterial),stamp=new T.Mesh(new T.IcosahedronGeometry(.37,0),medalMaterial);disc.rotation.x=Math.PI/2;stamp.position.z=.12;stamp.scale.z=.25;medal.add(disc,stamp);const ribbonMaterial=new T.MeshStandardMaterial({color:0x5d91b2,roughness:.8});for(const side of[-1,1]){const strap=new T.Mesh(new T.BoxGeometry(.2,1.5,.07),ribbonMaterial);strap.position.set(side*.35,.9,-.03);strap.rotation.z=-side*.35;medal.add(strap);}medal.name="tournament-award-medal";medal.traverse(o=>{if(o.isMesh){o.material.depthTest=false;o.material.depthWrite=false;o.renderOrder=o===stamp?203:o===disc?202:201;}});scene.add(medal);
 function removeActor(a){if(!a)return;a.hurtFace?.set(false);applyTournamentHitBrightness(a,0);a.root.removeFromParent();C.disposeMatureCharacterModel?.(a.root);}
 function actor(rawId,colors={}){
  const entry=C.MonsterNames.get(rawId);if(!entry)throw Error('Unknown tournament monster ID');const root=buildCharacter(T,C,entry.id,{handColor:colors.handColor||colors.hand,footColor:colors.footColor||colors.foot});root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());if(!(size.y>0))throw Error('Empty tournament monster');const scale=8.3/size.y;root.scale.multiplyScalar(scale);root.updateMatrixWorld(true);const measured=new T.Box3().setFromObject(root),offset=-measured.min.y;root.position.y=offset;root.updateMatrixWorld(true);const bodyBox=new T.Box3().setFromObject(root.userData.body||root),chest={y:bodyBox.min.y+(bodyBox.max.y-bodyBox.min.y)*.23-offset,z:bodyBox.max.z+.18};root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});const hurtFace=createTournamentHurtFace(T,root),hitMaterials=captureTournamentHitMaterials(root);scene.add(root);return{root,hurtFace,hitMaterials,bodyHalfWidth:Math.max(bodyBox.max.x-bodyBox.min.x,bodyBox.max.z-bodyBox.min.z)*.5,id:entry.id,colors:JSON.stringify(colors),offset,chest,halfWidth:Math.max(measured.max.x-measured.min.x,measured.max.z-measured.min.z)*.5,top:measured.max.y,baseScale:root.scale.clone(),hands:(root.userData.hands||[]).map(m=>({mesh:m,rotation:m.rotation.clone()})),feet:(root.userData.feet||[]).map(m=>({mesh:m,rotation:m.rotation.clone()}))};
 }
 function setArena(key){key=TOURNAMENT_ARENAS[key]?key:'rookie';if(arena?.key===key)return;arena?.dispose();arena=createTournamentArena(T,key,{documentTarget});scene.add(arena.root);scene.fog.color.set(arena.theme.horizon);}
 function setActors(ids,colors){const old=actors,next=[];try{for(let i=0;i<ids.length;i++){const canonical=C.MonsterNames.get(ids[i])?.id,color=JSON.stringify(colors[i]||{}),found=old.find(a=>a.id===canonical&&a.colors===color&&!next.includes(a));next.push(found||actor(ids[i],colors[i]));}}catch(e){for(const a of next)if(!old.includes(a))removeActor(a);throw e;}for(const a of old)if(!next.includes(a))removeActor(a);actors=next;}
 function receivingCenters(){return[0,-(actors[0].halfWidth+actors[1].halfWidth+.8),actors[0].halfWidth+actors[2].halfWidth+.8];}
 function fit(width,height,{frameHeight=height}={}){aspect=Math.max(.2,width/Math.max(1,height));camera.aspect=aspect;const referenceHeight=mode==='award'?height:Math.max(height,frameHeight),openingFov=width/referenceHeight<.85?45:40;camera.fov=2*Math.atan(Math.tan(openingFov*Math.PI/360)*height/referenceHeight)*180/Math.PI;const centers=mode==='award'?[0,-10,10]:[-9,9],left=Math.min(...actors.map((a,i)=>centers[i]-a.halfWidth)),right=Math.max(...actors.map((a,i)=>centers[i]+a.halfWidth)),span=Math.max(31,(right-left)*1.12),depth=Math.max(4,...actors.map(a=>a.halfWidth)),distance=Math.max(34,span/(2*aspect*Math.tan(camera.fov*Math.PI/360))+depth);baseDistance=distance;camera.position.set(0,10,distance);cameraTarget.set(0,4,0);camera.lookAt(cameraTarget);
  if(mode==='award'){const c=receivingCenters(),lo=Math.min(...actors.map((a,i)=>c[i]-a.halfWidth)),hi=Math.max(...actors.map((a,i)=>c[i]+a.halfWidth)),d=Math.max(22,Math.max(24,(hi-lo)*1.12)/(2*aspect*Math.tan(camera.fov*Math.PI/360))+depth);awardCamera={start:camera.position.clone(),end:new T.Vector3(0,8.6,d)};}else awardCamera=null;camera.updateProjectionMatrix();}

 function show(data,now){if(disposed)return;resultCameraFrom=data.mode==='result'?{position:camera.position.clone(),target:cameraTarget.clone()}:null;medal.removeFromParent();scene.add(medal);delete medal.userData.bodyAnchor;setArena(data.cupId);mode=data.mode||'opening';cue={...data};startedAt=now;medalAt=null;setActors(mode==='award'?[data.playerId,data.secondId,data.thirdId]:[data.playerId,data.enemyId],[data.playerColors||{},data.enemyColors||{},{}]);for(const a of actors){a.hurtFace.set(false);applyTournamentHitBrightness(a,0);}podium.visible=mode==='award';effectRoot.visible=false;medal.visible=false;fx.setCue({...data,casterName:data.casterName||C.MonsterNames.get(data.actor==='enemy'?data.enemyId:data.playerId)?.name||''});}
 function award(now){if(mode==='award'&&medalAt===null){medalAt=now;attachTournamentMedal(T,medal,actors[0]);}}
 function update(now,{reducedMotion=false}={}){
  if(disposed)return;const t=Math.max(0,(now-startedAt)/1000),f=tournamentPresentationFrame(t,cue),awarding=mode==='award',castIndex=cue.actor==='enemy'?1:0,targetIndex=1-castIndex;arena?.update(t);const receiving=awarding&&medalAt!==null,receiveTime=receiving?Math.max(0,(now-medalAt)/1000):0;podium.visible=awarding&&!receiving;if(receiving&&awardCamera){const q=reducedMotion?1:smooth(receiveTime/1.35);camera.position.lerpVectors(awardCamera.start,awardCamera.end,q);camera.lookAt(0,4+q*.1,0);camera.updateMatrixWorld(true);}
  for(let i=0;i<actors.length;i++){
   const a=actors[i],r=a.root;let x=awarding?(receiving?receivingCenters():[0,-10,10])[i]:i===0?-9:9,y=a.offset+(awarding&&!receiving?[3.6,2,1.25][i]:0),z=receiving&&i>0?-1:0,yaw=awarding?(receiving?[0,.35,-.35][i]:.06*(i-1)):i===0?Math.PI/2:-Math.PI/2,pitch=0;
   if(mode==='battle'){
    if(i===castIndex){pitch=-Math.sin(Math.min(1,f.cast)*Math.PI)*.13;}
    if(i===targetIndex){z+=f.dodge*5;x+=(i===0?-1:1)*(reducedMotion?0:f.recoil*.56);}
   }
   const decided=mode==='result'||f.decided;if(decided){const winner=cue.winner==='enemy'?1:0;if(i===winner)y+=reducedMotion?0:Math.max(0,Math.sin((t-(cue.decisionAt||0))*4.5))*.3;else pitch=.11;}
   if(receiving&&!reducedMotion)y+=tournamentAwardWalkOffset(receiveTime+i*.12)*(i===0?1:.65);
   a.hurtFace.set(tournamentHurtFaceActive(t,cue,mode,i));applyTournamentHitBrightness(a,mode==='battle'&&i===targetIndex?f.hitReaction.brightness*(reducedMotion?.12:1):0);
   r.position.set(x,y,z);r.rotation.set(pitch,yaw,0);r.scale.copy(a.baseScale);
   for(let k=0;k<a.hands.length;k++){const h=a.hands[k];h.mesh.rotation.copy(h.rotation);h.mesh.rotation.z+=(k%2?1:-1)*(awarding&&medalAt!==null?.18:mode==='battle'&&i===castIndex?f.cast*.17:Math.sin(t*1.6+k)*.025);}
   for(let k=0;k<a.feet.length;k++){const foot=a.feet[k];foot.mesh.rotation.copy(foot.rotation);if(receiving&&!reducedMotion)foot.mesh.rotation.x+=Math.sin(receiveTime*Math.PI*2/1.08+k*Math.PI)*.075;}
  }
  if(mode==='battle'||mode==='result'){const shot=tournamentCameraFrame(t,cue,{mode,distance:baseDistance,aspect,fov:camera.fov,family:f.family,reducedMotion,actors:actors.map((a,i)=>({x:i===0?-9:9,halfWidth:a.halfWidth,bodyHalfWidth:a.bodyHalfWidth,z:i===targetIndex?f.dodge*5:0}))});cameraShot=shot.name;const toPosition=new T.Vector3(...shot.position),toTarget=new T.Vector3(...shot.look);if(mode==='result'&&resultCameraFrom&&!reducedMotion){const q=smooth(t/(shot.transitionSeconds||.9));camera.position.lerpVectors(resultCameraFrom.position,toPosition,q);cameraTarget.lerpVectors(resultCameraFrom.target,toTarget,q);}else{camera.position.copy(toPosition);cameraTarget.copy(toTarget);}camera.lookAt(cameraTarget);camera.updateMatrixWorld(true);}
  const effectStatus=fx.update({time:t,frame:f,cue,mode,reducedMotion});
  medal.visible=receiving;if(receiving)updateTournamentMedal(T,medal,receiveTime,reducedMotion);
  return {mode,hurtFaces:actors.map(a=>a.hurtFace.active),hitIndex:f.hitReaction.index,hitCount:f.hitReaction.count,hitBrightness:f.hitReaction.brightness,cameraShot,cameraPosition:camera.position.toArray(),cameraTarget:cameraTarget.toArray(),openingCameraDistance:baseDistance,awardStage:awarding?(receiving?'receiving':'podium'):'',arena:arena?.key,actors:actors.map(a=>a.id),family:f.family,motif:effectStatus?.motif,phase:effectStatus?.phase,impactKind:effectStatus?.impactKind,authoredSource:effectStatus?.authoredSource,signaturePaths:effectStatus?.signaturePaths,contactPaths:effectStatus?.contactPaths,spectralSegments:effectStatus?.spectralSegments,sheenSurfaces:effectStatus?.sheenSurfaces,vertices:effectStatus?.vertices,overflow:effectStatus?.overflow,effectBlend:effectStatus?.effectBlend,chargeCircles:effectStatus?.chargeCircles,chargeStartAt:effectStatus?.chargeStartAt,chargeReleaseAt:effectStatus?.chargeReleaseAt,originalLocal:effectStatus?.originalLocal,time:t,medal:medal.visible};
 }
 return{scene,camera,show,award,fit,update,finish(winner,now,outcome={}){if(mode==='award')return;winner=winner||cue.resolvedWinner||cue.winner;resultCameraFrom=winner?{position:camera.position.clone(),target:cameraTarget.clone()}:null;mode=winner?'result':'opening';cue={...cue,winner,decisionAt:0,resultHp:outcome.resultHp??cue.resultHp};startedAt=now;effectRoot.visible=false;},get actors(){return actors;},get mode(){return mode;},dispose(){if(disposed)return;disposed=true;medal.removeFromParent();actors.forEach(removeActor);actors=[];arena?.dispose();const trash=new T.Group();trash.add(effectRoot,podium,medal);disposeTree(trash);sun.shadow.map?.dispose();environment?.dispose();scene.clear();}};
}

export function installTournament3D({loadResources,buildCharacter,documentTarget=globalThis.document,windowTarget=globalThis,onReady=()=>{},onFailure=()=>{},renderClock=null,makeWorld=createTournament3DWorld,makeRenderer=T=>new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})}={}){
 // A module can finish loading after its iframe or page has already gone away.
 if(!documentTarget?.body)return{show:async()=>false,award(){},finish(){},dispose(){},get ready(){return false;}};
 const doc=documentTarget,win=windowTarget,frameNow=renderClock||(()=>win.performance.now());let renderer=null,compositor=null,world=null,field=null,surface=null,labels=[],loading=null,requestId=0,frame=0,closed=false,lastFrame=0,width=0,height=0,lastData=null,pendingMedalAt=null,inView=true,openingFrameHeight=0,openingFrameWidth=0;
 const reduced=()=>win.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
 const visible=()=>inView&&field?.isConnected&&field.classList.contains('has-tournament-3d')&&!doc.hidden&&!['new-opening-active','loading-screen-active','sky-evolution-open'].some(c=>doc.body.classList.contains(c))&&field.getClientRects().length>0&&(!field.closest('[data-screen]')||field.closest('[data-screen]').classList.contains('active'));
 function stop(){if(frame)win.cancelAnimationFrame(frame);frame=0;lastFrame=0;}
 function fail(target,error){stop();target?.classList.remove('has-tournament-3d');if(target)target.dataset.tournament3d='unavailable';onFailure(error);}
 function contextLost(e){e.preventDefault();requestId++;stop();fail(field,Error('3D context lost'));release();}
 function release(){stop();world?.dispose();world=null;if(renderer){renderer.domElement.removeEventListener('webglcontextlost',contextLost);compositor?.dispose();compositor=null;renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();}renderer=null;surface?.remove();surface=null;field?.classList.remove('has-tournament-3d');}
 function fit(){if(!renderer||!field)return;if(field.classList.contains('watching')){const top=Math.max(56,Math.ceil(field.querySelector?.('.battle-hud')?.getBoundingClientRect?.().height||0)),bottom=Math.max(112,Math.ceil(field.querySelector?.('.battle-cue')?.getBoundingClientRect?.().height||0));field.style?.setProperty?.('--tournament-top-band',top+'px');field.style?.setProperty?.('--tournament-bottom-band',bottom+'px');}const box=surface?.getBoundingClientRect?.()||field.getBoundingClientRect(),w=Math.round(box.width),h=Math.round(box.height);if(!w||!h)return;if(w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h,false);if(world.mode==='opening'){openingFrameWidth=w;openingFrameHeight=h;}const referenceHeight=openingFrameWidth===w?Math.max(field.clientHeight||h,openingFrameHeight):Math.max(h,field.clientHeight||h);world.fit(w,h,{frameHeight:referenceHeight});compositor?.resize(w,h);}
 function draw(now){frame=0;if(closed||!world||!visible())return;fit();const frameTime=frameNow();if(frameTime-lastFrame<1000/30){frame=win.requestAnimationFrame(draw);return;}lastFrame=frameTime-((frameTime-lastFrame)%(1000/30));const drawStart=frameNow(),status=world.update(now,{reducedMotion:reduced()});compositor.render(world.scene,world.camera,status);if(status&&surface){surface.dataset.drawCount=String((Number(surface.dataset.drawCount)||0)+1);surface.dataset.frameMs=(frameNow()-drawStart).toFixed(1);surface.dataset.chargeCircles=String(status.chargeCircles||0);surface.dataset.chargeStartAt=String(status.chargeStartAt??'');surface.dataset.chargeReleaseAt=String(status.chargeReleaseAt??'');surface.dataset.time=Number.isFinite(status.time)?status.time.toFixed(3):"";surface.dataset.awardStage=status.awardStage||'';surface.dataset.hurtFaces=JSON.stringify(status.hurtFaces||[]);surface.dataset.hitIndex=String(status.hitIndex??-1);surface.dataset.hitCount=String(status.hitCount||0);surface.dataset.cameraShot=status.cameraShot||"";surface.dataset.cameraPosition=JSON.stringify(status.cameraPosition||[]);surface.dataset.cameraTarget=JSON.stringify(status.cameraTarget||[]);surface.dataset.openingDistance=String(status.openingCameraDistance||0);surface.dataset.mode=status.mode;surface.dataset.arena=status.arena;surface.dataset.family=status.family;surface.dataset.motif=status.motif||'';surface.dataset.phase=status.phase||'';surface.dataset.impact=status.impactKind||'';surface.dataset.signaturePaths=status.signaturePaths||0;surface.dataset.contactPaths=status.contactPaths||0;surface.dataset.vertices=status.vertices||0;surface.dataset.spectralSegments=status.spectralSegments||0;surface.dataset.sheenSurfaces=status.sheenSurfaces||0;surface.dataset.overflow=String(!!status.overflow);surface.dataset.monsters=status.actors.join('|');for(let i=0;i<labels.length;i++){const label=labels[i],a=world.actors[i];label.hidden=status.mode!=='award'||!a;if(!label.hidden){const v=a.root.position.clone();v.y+=a.top+.7;v.project(world.camera);label.style.left=Math.round((v.x+1)*width/2)+'px';label.style.top=Math.round((1-v.y)*height/2)+'px';}}}frame=win.requestAnimationFrame(draw);}
 function schedule(){if(!closed&&world&&visible()&&!frame)frame=win.requestAnimationFrame(draw);else if(!visible())stop();}
 async function show(target,data){
  const token=++requestId,started=win.performance.now();if(closed||!target?.isConnected)return false;field=target;target.dataset.tournament3d='loading';
  try{
   loading??=loadResources();const [T,C]=await loading;if(closed||token!==requestId||!target.isConnected)return false;
   if(!renderer){renderer=makeRenderer(T);renderer.setPixelRatio(win.matchMedia?.('(pointer:coarse)').matches?Math.min(1.5,win.devicePixelRatio||1):2);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;compositor=createTournamentCinematicCompositor(T,renderer);renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.addEventListener('webglcontextlost',contextLost);world=makeWorld(T,C,{buildCharacter,documentTarget:doc});surface=doc.createElement('div');surface.className='tournament-3d-surface';surface.append(renderer.domElement);labels=Array.from({length:3},()=>{const el=doc.createElement('span');el.className='tournament-3d-name';el.hidden=true;surface.append(el);return el;});}
   world.show(data,started);if(data.mode==='award'&&pendingMedalAt!==null)world.award(pendingMedalAt);for(let i=0;i<labels.length;i++)labels[i].textContent=[data.playerName,data.secondName,data.thirdName][i]||'';field=target;target.prepend(surface);target.classList.add('has-tournament-3d');target.dataset.tournament3d='ready';width=height=0;fit();const initialStatus=world.update(win.performance.now(),{reducedMotion:reduced()});compositor.prepare?.(world.scene,world.camera);compositor.render(world.scene,world.camera,initialStatus);onReady(target);schedule();return true;
  }catch(e){if(token===requestId){if(!world||!surface)release();loading=null;fail(target,e);}return false;}
 }
 const resize=typeof win.ResizeObserver==='function'?new win.ResizeObserver(()=>{width=height=0;schedule();}):null;
 const intersection=typeof win.IntersectionObserver==='function'?new win.IntersectionObserver(entries=>{if(entries[0]?.target!==field)return;inView=entries[0].isIntersecting;schedule();},{threshold:0}):null;
 const observer=new win.MutationObserver(()=>{if(field&&!field.isConnected){requestId++;release();field=null;}else schedule();});observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
 doc.addEventListener('visibilitychange',schedule);win.addEventListener('resize',schedule);win.addEventListener('pagehide',stop);win.addEventListener('pageshow',schedule);
 return{show(target,data){lastData={...data};pendingMedalAt=null;resize?.disconnect();intersection?.disconnect();inView=true;if(target){resize?.observe(target);intersection?.observe(target);}return show(target,lastData);},award(){if(lastData?.mode!=='award')return;pendingMedalAt??=win.performance.now();if(world?.mode==='award')world.award(pendingMedalAt);},finish(winner,outcome={}){if(!field||!lastData||lastData.mode==='award')return;winner=winner||lastData.resolvedWinner||lastData.winner;lastData={...lastData,mode:winner?'result':'opening',winner,decisionAt:0,resultHp:outcome.resultHp??lastData.resultHp};show(field,lastData);},dispose(){if(closed)return;closed=true;requestId++;resize?.disconnect();intersection?.disconnect();observer.disconnect();doc.removeEventListener('visibilitychange',schedule);win.removeEventListener('resize',schedule);win.removeEventListener('pagehide',stop);win.removeEventListener('pageshow',schedule);release();field=null;lastData=null;},get ready(){return!!world;}};
}
