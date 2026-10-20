import * as T from './three.module.min.js';
const vertex=`
varying vec3 vWorld;
void main(){vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const hash=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}`;

let bakedCloudCanvas=null;
function cloudTexture(){
 // Bake soft, irregular cloud volumes once. No expensive noise octaves per screen pixel.
 if(bakedCloudCanvas)return textureFromCanvas(bakedCloudCanvas);
 const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);
 const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263)^8917;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const noise=(x,y,period)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash((ix+period)%period,iy),b=hash((ix+1+period)%period,iy),d=hash((ix+period)%period,iy+1),e=hash((ix+1+period)%period,iy+1);return a+(b-a)*u+(d-a)*v+(a-b-d+e)*u*v;};
 const densities=new Float32Array(c.width*c.height);
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  let value=0,weight=.54;
  for(let k=0;k<5;k++){const f=2**k;value+=noise(x/c.width*24*f,y/c.height*9*f,24*f)*weight;weight*=.49;}
  densities[y*c.width+x]=value;
 }
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=y*c.width+x,d=densities[i],edge=Math.max(0,Math.min(1,(d-.49)/.18));
  const up=densities[Math.max(0,y-3)*c.width+x],shade=Math.max(0,Math.min(1,.7+(d-up)*5));
  im.data[i*4]=174+shade*80;im.data[i*4+1]=190+shade*64;im.data[i*4+2]=205+shade*49;im.data[i*4+3]=Math.round(edge*edge*(3-2*edge)*255);
 }
 ctx.putImageData(im,0,0);
 bakedCloudCanvas=c;return textureFromCanvas(c);
}

function textureFromCanvas(c){
 const tex=new T.CanvasTexture(c);tex.wrapS=T.RepeatWrapping;
 // Avoid a mip derivative seam at the longitude wrap.
 tex.generateMipmaps=false;tex.minFilter=T.LinearFilter;return tex;
}
/** A single background draw, with shared baked cloud pixels and owned GPU resources. */
export function createScenicSky({uniforms,radius=4500,cloudSea=false}){
 uniforms.clouds={value:cloudTexture()};uniforms.cloudSea={value:cloudSea?1:0};
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms,vertexShader:vertex,fragmentShader:`
 precision highp float;varying vec3 vWorld;uniform vec3 top,horizon,sun,sunDir;uniform float time,night,cloudSea;uniform sampler2D clouds;
 ${hash}
 void main(){
  vec3 d=normalize(vWorld-cameraPosition);
  float h=max(d.y,0.);vec3 col=mix(horizon,top,pow(h,.55));
  float sd=max(0.,dot(d,sunDir));col+=sun*(pow(sd,180.)*.32+pow(sd,2600.)*2.);
  vec2 uv=vec2(atan(d.x,d.z)/6.283185+.5+time*.00035,1.-clamp(d.y*1.5,0.,1.));
  vec4 sampleCloud=texture2D(clouds,uv);
  float cloud=sampleCloud.a*smoothstep(.025,.08,h)*(1.-smoothstep(.55,.86,h));
  vec3 cc=mix(mix(sampleCloud.rgb*.86,horizon,.17),sampleCloud.rgb*.17+vec3(.025,.04,.075),night);
  col=mix(col,cc,cloud*(.96-night*.26));
  vec2 st=vec2(atan(d.x,d.z)*550.,asin(d.y)*550.);vec2 cell=floor(st);
  float star=step(.994,hash(cell))*pow(max(0.,1.-length(fract(st)-.5)*2.),3.);
  col+=star*night*smoothstep(.04,.17,h)*vec3(1.6,1.82,2.);

  // A distant sea of clouds below the floating island; never a walking surface.
  if(cloudSea>.5){
   float lower=1.-smoothstep(-.09,.025,d.y);
   vec2 seaUV=vec2(atan(d.x,d.z)/6.283185+.5+time*.00008,clamp(-d.y*.8,.02,.98));
   vec4 billow=texture2D(clouds,seaUV);
   vec3 mist=mix(horizon,vec3(.92,.96,1.),.38)*(1.-night*.53);
   vec3 bank=mix(mist,billow.rgb*(1.-night*.68),billow.a*.65);
   col=mix(col,bank,lower);
   float moon=smoothstep(.99965,.9998,sd);
   col=mix(col,vec3(.85,.94,1.),moon*night);
  }
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});

 const sky=new T.Mesh(new T.SphereGeometry(radius,48,24),skyMat);
 sky.name='scenic-sky';sky.frustumCulled=false;sky.renderOrder=-10;
 let disposed=false;
 return {sky,update(camera,time){if(!disposed){sky.position.copy(camera.position);uniforms.time.value=time/1000;}},
  dispose(){if(disposed)return;disposed=true;sky.removeFromParent();sky.geometry.dispose();skyMat.dispose();uniforms.clouds.value.dispose();}};
}
