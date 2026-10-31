import {coastSurfaceTexture} from './imasora-coast-scenery-detail.mjs?v=120mt';
import * as T from './three.module.min.js';

// The same green/gold/stone/timber bridge is used by both terrestrial maps.
export function createTownBridge({x,z,rotation=0,id='town-bridge',collider=()=>{},surface=()=>{},weathered=false}){
 const group=new T.Group();group.name='街へ続く橋';group.position.set(x,0,z);group.rotation.y=rotation;
 group.userData.nearbyName={id,name:'街へ続く橋',hx:40,hz:130,height:38};
 const materials=new Set(),geometries=new Set();
 const mat=c=>{const m=new T.MeshStandardMaterial({color:c,roughness:.82});materials.add(m);return m;};
 const teal=mat(0x397f78),stone=mat(0xb8af94),stoneLight=mat(0xd2c9ad),deck=mat(0xc99750),gold=mat(0xeac685);
 const textures=[];if(weathered){for(const [m,kind]of[[stone,'stone'],[stoneLight,'stone'],[deck,'wood']]){const t=coastSurfaceTexture(kind);textures.push(t);m.map=t;m.bumpMap=t;m.bumpScale=.22;}gold.roughness=.6;gold.metalness=.35;}
 const parts=[],c=Math.cos(rotation),s=Math.sin(rotation);
 const piece=(w,h,d,px,y,pz,m,key)=>{parts.push({w,h,d,x:px,y,z:pz,m});if(key)collider(x+px*c+pz*s,z-px*s+pz*c,[w,d],rotation,id+'-'+key,0,{minY:y-h/2,maxY:y+h/2,obstacleHeight:y+h/2});};
 const ornament=(geo,m,px,y,pz)=>{geometries.add(geo);const mesh=new T.Mesh(geo,m);mesh.position.set(px,y,pz);group.add(mesh);return mesh;};
 for(let pz=-125;pz<=125;pz+=10)piece(66,.2,9.6,0,.05,pz,deck);
 surface({id:id+'-deck',buildingId:id,x,z,halfX:33,halfZ:130,height:.15,rotation});
 for(const px of[-36,36]){
  piece(8,3,260,px,-1,0,stone);
  for(let i=0;i<13;i++){const pz=-120+i*20,arch=5*(1-(pz/130)**2);piece(4,3,20,px,24+arch,pz,teal,'top-'+px+'-'+i);piece(3,3,20,px,8+arch,pz,teal,'lower-'+px+'-'+i);}
  for(let i=0;i<7;i++){
   const pz=-130+i*260/6,arch=5*(1-(pz/130)**2),end=i===0||i===6;
   piece(end?11:7,end?22:24,end?11:7,px,end?11:14+arch,pz,end?stone:teal,'post-'+px+'-'+i);
   piece(end?13:9,3,end?13:9,px,end?23:27+arch,pz,stoneLight);piece(end?9:8,2,end?9:8,px,end?25:29+arch,pz,gold);
   ornament(new T.SphereGeometry(end?3.5:2.8,10,8),gold,px,end?29:32+arch,pz);
   if(!end){const gem=ornament(new T.OctahedronGeometry(2.5,0),gold,px,15+arch,pz+10);gem.scale.set(.55,1.3,1);}
  }
 }
 const matrix=new T.Matrix4();
 for(const m of[teal,stone,stoneLight,deck,gold]){
  const rows=parts.filter(p=>p.m===m),geo=new T.BoxGeometry(1,1,1),mesh=new T.InstancedMesh(geo,m,rows.length);geometries.add(geo);
  rows.forEach((p,i)=>{matrix.makeScale(p.w,p.h,p.d);matrix.setPosition(p.x,p.y,p.z);mesh.setMatrixAt(i,matrix);});mesh.receiveShadow=true;group.add(mesh);
 }
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());group.removeFromParent();}};
}
