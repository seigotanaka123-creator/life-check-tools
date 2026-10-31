import * as T from './three.module.min.js';
const mix=(a,b,t)=>a+(b-a)*t;
function terrainNoise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),hash=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};return mix(mix(hash(ix,iy),hash(ix+1,iy),u),mix(hash(ix,iy+1),hash(ix+1,iy+1),u),v);}

// Keep only three immutable pixel templates across map visits. Each owner
// still receives its own texture/pixel copy and disposes its own GPU resource.
// Re-entering the coast must not regenerate the same wood/stone/leaf noise.
const surfacePixels=new Map();
export function coastSurfaceTexture(kind){
 const size=128,known=kind==='wood'||kind==='stone'||kind==='foliage';let pixels=known&&surfacePixels.get(kind);
 if(!pixels){pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=((Math.imul(x+11,1973)^Math.imul(y+37,9277))>>>0)%23;
  const grain=kind==='wood'?Math.sin(x*.65+Math.sin(y*.07)*2)*13+Math.sin(x*2.1)*5:Math.sin(x*.23)*Math.cos(y*.19)*9;
  const joint=kind==='stone'&&(y%32<2||(x+(Math.floor(y/32)%2)*32)%64<2)?-45:0;
  const foliage=kind==='foliage'?terrainNoise(x*.2,y*.2)*85+terrainNoise(x*.65,y*.65)*45-95:0;
  const c=Math.max(90,Math.min(255,220+n+grain+joint+foliage)),i=(y*size+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=c;pixels[i+3]=255;
 }
 if(known)surfacePixels.set(kind,pixels);}
 const data=pixels.slice();
 const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;return map;
}

export function coastTree({add,solid,trunk,leaves,x,y,z,index=0}){
 const h=29+(index*7%15),lean=Math.sin(index*3.7)*4;
 const pole=add(new T.CylinderGeometry(1.15,2.7,h,9),trunk,x+lean/2,y+h/2,z);pole.rotation.z=-Math.atan2(lean,h);solid(pole,'tree-'+index);
 for(let j=0;j<3;j++){
  const a=index*2.39+j*2.1,end=new T.Vector3(Math.cos(a)*9,h*.74+j*3,Math.sin(a)*8),start=new T.Vector3(lean,h*.48,0),d=end.clone().sub(start);
  const branch=add(new T.CylinderGeometry(.55,1.1,d.length(),6),trunk,x+(end.x+start.x)/2,y+(end.y+start.y)/2,z+end.z/2);branch.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());
 }
 for(let j=0;j<7;j++){
  const a=index*2.399+j*2.13,r=j?8+(j%3)*2:0;
  const geo=new T.SphereGeometry(1,9,7),p=geo.attributes.position;
  for(let k=0;k<p.count;k++){const v=new T.Vector3().fromBufferAttribute(p,k),s=1+.12*Math.sin(v.x*8+j)*Math.sin(v.y*9+index)*Math.cos(v.z*7);p.setXYZ(k,v.x*s,v.y*s,v.z*s);}geo.computeVertexNormals();
  const leaf=add(geo,leaves,x+Math.cos(a)*r+lean,y+h-2+(j%3)*4,z+Math.sin(a)*r);leaf.scale.set(9+j%3,7+j%2,8+j%4);
 }
}

export function coastRidgeGeometry(){
 const g=new T.PlaneGeometry(11000,2600,192,48);g.rotateX(-Math.PI/2);g.translate(0,0,-2300);const p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i),v=(z+3600)/2600;
  const edge=Math.sin(Math.PI*Math.max(0,Math.min(1,v))),ridge=220+95*Math.sin(x*.0023)+65*Math.sin(x*.0067+1.7)+34*Math.cos(x*.014);
  const folds=terrainNoise(x/230,z/185)*.6+terrainNoise(x/86,z/72)*.28+terrainNoise(x/31,z/27)*.12;
  const h=-8+Math.pow(edge,.72)*(ridge*(.72+.28*Math.sin(z*.004+x*.001))+(folds-.5)*165);p.setY(i,h);
  const c=new T.Color(0x54715b).lerp(new T.Color(0x909783),Math.max(0,(h-120)/220)*.75+folds*.18);c.multiplyScalar(.73+folds*.35);colors.push(c.r,c.g,c.b);
 }g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

export function coastTownHouse({box,add,solid,wall,roof,trim,window,wood,x,z,index}){
 const w=47+(index%3)*7,d=46+(index%4)*4,h=30+(index%3)*15;
 const body=box(w,h,d,x,h/2,z,wall);solid(body,'town-house-'+index);
 const pitch=.42,half=w/2+4,rise=Math.tan(pitch)*half,length=half/Math.cos(pitch);
 for(const side of[-1,1]){const r=box(length,2.5,d+8,x+side*half/2,h+rise/2,z,roof);r.rotation.z=-side*pitch;}
 const triangle=new T.BufferGeometry();triangle.setAttribute('position',new T.Float32BufferAttribute([-w/2,0,0,w/2,0,0,0,rise,0],3));triangle.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,.5,1],2));triangle.setIndex([0,1,2]);triangle.computeVertexNormals();
 for(const side of[-1,1]){const face=add(triangle.clone(),wall,x,h,z+side*d/2);face.rotation.y=side<0?Math.PI:0;}triangle.dispose();
 box(5,16,6,x-w*.23,h+rise-2,z-8,trim);box(7,2,8,x-w*.23,h+rise+7,z-8,roof);
 box(w+2,2,d+2,x,1,z,trim);box(w+2,1.5,d+2,x,h-2,z,trim);
 for(let row=0;row<(h>40?3:2);row++)for(const col of[-1,1]){
  const px=x+col*w*.25,py=10+row*14;
  box(9,11,1,px,py,z+d/2+.4,trim);box(7.4,9,.4,px,py,z+d/2+1,window);
  box(.6,9,.5,px,py,z+d/2+1.3,wood);box(7.5,.6,.5,px,py,z+d/2+1.3,wood);
 }
 box(8,17,1,x,8.5,z+d/2+.7,wood);box(10,1,4,x,.5,z+d/2+2,trim);
}
