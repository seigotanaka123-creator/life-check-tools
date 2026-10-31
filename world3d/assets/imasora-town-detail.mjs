import * as T from './three.module.min.js';
import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs';
import {eveningLight,createLightHalos,createLightPools} from './imasora-evening-light.mjs';
// Detail stays on the existing house envelope; it never changes bridge, ground,
// body collisions, saved buildings or the map connection.
export function createTownDetails({houses,wallMaterials=[],roofMaterial,roofs=false,front=false,streets=[]}){
 const group=new T.Group();group.name='town-architectural-detail';group.userData.nonCollidable=true;
 const geometry=new T.BoxGeometry(1,1,1),matrix=new T.Matrix4(),rows=new Map(),gableMatrices=[],materials=[],textures=[],lamps=[],pools=[];
 const mat=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.8,...extra});materials.push(m);return m;};
 const masonry=coastSurfaceTexture('stone');masonry.repeat.set(3,2);textures.push(masonry);for(const m of wallMaterials){m.map=masonry;m.bumpMap=masonry;m.bumpScale=.09;m.roughness=.92;}
 const roofTexture=coastSurfaceTexture('wood');roofTexture.repeat.set(4,3);textures.push(roofTexture);if(roofMaterial&&!roofMaterial.map){roofMaterial.map=roofTexture;roofMaterial.bumpMap=roofTexture;roofMaterial.bumpScale=.12;}
 const asphalt=mat(0x64747a),sill=mat(0xe4ddd0),metal=mat(0x576773,{metalness:.35,roughness:.52}),stone=mat(0xa8a498),dark=mat(0x45606a,{metalness:.18,roughness:.24}),warm=mat(0xbcd0cb,{emissive:0xffbe72,emissiveIntensity:0}),cream=mat(0xbcd0cb,{emissive:0xffe2ac,emissiveIntensity:0}),cool=mat(0xbcd0cb,{emissive:0xafd8ed,emissiveIntensity:0});const glow=[warm,cream,cool];
 const put=(m,x,y,z,w,h,d,angle=0)=>{if(!rows.has(m))rows.set(m,[]);matrix.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),angle),new T.Vector3(w,h,d));rows.get(m).push(matrix.clone());};
 houses.forEach((a,n)=>{const{x,z,h,w=68,d=62}=a;
  // Recessed side windows, projecting sills, narrow frames and floor bands.
  for(const side of[-1,1])for(let floor=0;floor<(h>45?3:2);floor++)for(const col of[-1,1]){
   const wx=x+side*(w/2+.55),wz=z+col*d*.24,y=10+floor*14,lit=(n*7+floor*5+col+9)%5!==0,m=lit?glow[(n+floor)%7===0?2:(n+floor)%2]:dark;
   put(sill,wx,y,wz,1.4,12,10);put(m,wx+side*.8,y,wz,.3,9.8,7.8);put(metal,wx+side*1.1,y,wz,.35,.65,8);put(metal,wx+side*1.1,y,wz,.35,10,.6);put(stone,wx+side*1.6,y-6,wz,3,1.3,12);
   if(lit)lamps.push({x:wx+side*1.3,y,z:wz,size:13,color:m===cool?0xbbe1ff:m===warm?0xffbd72:0xffdfab});
  }
  if(front){for(const dx of[-20,0,20])for(const y of[11,27]){if(dx===0&&y===11)continue;put(sill,x+dx,y,z+d/2+.1,12,13,.4);put(metal,x+dx,y,z+d/2+.6,.6,11,.4);put(metal,x+dx,y,z+d/2+.6,10,.6,.4);put(stone,x+dx,y-6.5,z+d/2+1,14,1.3,3);}put(metal,x,7,z+d/2+.6,9,14,.8);}
  put(stone,x,.05,z+d/2+7,w+8,.1,14);for(const y of[3,h-2])put(sill,x,y,z,w+1.8,1.2,d+1.8);
  for(const side of[-1,1]){put(metal,x+side*(w/2+3),h+1,z,1.2,1.3,d+9);put(metal,x+side*(w/2+2),h/2,z-d/2-1.4,1.2,h,1.2);}
  // Modest entrance canopy, real chimney cap and practical roof fittings.
  put(metal,x,19,z+d/2+3,13,1,7);put(warm,x,18,z+d/2+3,5,.4,3);lamps.push({x,y:18,z:z+d/2+4,size:18,color:0xffc888});pools.push({x,z:z+d/2+5,radius:17});
  put(stone,x+w*.22,h+7,z-d*.18,5,14,6);put(metal,x+w*.22,h+14.5,z-d*.18,7,1.2,8);put(metal,x-w*.2,h+2,z+d*.14,9,2,7);
  if(roofs){const pitch=.38,half=w/2+4,rise=Math.tan(pitch)*half,len=half/Math.cos(pitch);for(const side of[-1,1]){matrix.compose(new T.Vector3(x,h,z+side*d/2),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),side<0?Math.PI:0),new T.Vector3(w,rise,1));gableMatrices.push(matrix.clone());}for(const side of[-1,1])put(roofMaterial,x+side*half/2,h+rise/2,z,len,2,d+8,-side*pitch);put(metal,x,h+rise+.7,z,2,1.4,d+10);}
 });
 for(const street of streets){if(street.connector){const c=street.connector;put(asphalt,c.x,.035,c.z,c.w,.07,c.d);}put(asphalt,street.x,.035,street.z,street.w,.07,street.d);for(const side of[-1,1])put(stone,street.x,.09,street.z+side*(street.d/2+2),street.w,.16,4);for(let x=street.x-street.w/2+28;x<street.x+street.w/2;x+=110){const z=street.z+street.d/2+5;put(metal,x,12,z,1,24,1);put(metal,x+2,24,z,6,1.2,3);put(warm,x+2,23,z,4,.4,2);lamps.push({x:x+2,y:23,z,size:20,color:0xffd19a});pools.push({x:x+2,z:street.z,radius:24});}}
 for(const[m,list]of rows){const mesh=new T.InstancedMesh(geometry,m,list.length);list.forEach((v,i)=>mesh.setMatrixAt(i,v));mesh.name='town-detail-'+(glow.includes(m)?'lit-windows':'solid');mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);}
 let gableGeometry=null;if(gableMatrices.length){gableGeometry=new T.BufferGeometry();gableGeometry.setAttribute('position',new T.Float32BufferAttribute([-.5,0,0,.5,0,0,0,1,0],3));gableGeometry.computeVertexNormals();const mesh=new T.InstancedMesh(gableGeometry,sill,gableMatrices.length);gableMatrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.name='town-roof-gables';mesh.computeBoundingSphere();group.add(mesh);}
 const halos=createLightHalos(group,lamps.length);halos.set(lamps);const lightPools=createLightPools(group,pools,()=>.05);let last=-Infinity,disposed=false;
 function update(date=new Date()){if(disposed||Math.abs(+date-last)<10000)return;last=+date;const n=eveningLight(date).strength;warm.emissiveIntensity=n*2.4;cream.emissiveIntensity=n*2.1;cool.emissiveIntensity=n*1.7;halos.strength(n*1.1);lightPools.strength(n*.8);}
 update();return{group,update,stats:{houses:houses.length,draws:rows.size+2+(gableMatrices.length?1:0),realLights:0,windows:lamps.length-houses.length},dispose(){if(disposed)return;disposed=true;halos.dispose();lightPools.dispose();for(const o of group.children)if(o.isInstancedMesh)o.dispose();geometry.dispose();gableGeometry?.dispose();materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}};
}
