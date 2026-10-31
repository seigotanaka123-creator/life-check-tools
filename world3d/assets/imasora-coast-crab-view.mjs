import * as T from './three.module.min.js';
// One shared crab, three batches, no extra light, shadow, texture or physics.
export function createCoastCrabView(){
 const root=new T.Group();root.name='石の下から海へ逃げるカニ';root.visible=false;
 const geometry=new T.SphereGeometry(1,10,7),materials=[new T.MeshStandardMaterial({color:0xf27343,roughness:.72}),new T.MeshStandardMaterial({color:0xffebc5,roughness:.8}),new T.MeshStandardMaterial({color:0x272533,roughness:.6})],counts=[22,2,2],meshes=materials.map((m,i)=>new T.InstancedMesh(geometry,m,counts[i])),pose=new T.Object3D(),up=new T.Vector3(0,1,0);meshes.forEach(m=>{m.frustumCulled=false;root.add(m);});
 function piece(mesh,index,x,y,z,sx,sy,sz){pose.position.set(x,y,z);pose.scale.set(sx,sy,sz);pose.quaternion.identity();pose.updateMatrix();mesh.setMatrixAt(index,pose.matrix);}
 function segment(index,a,b,width){pose.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);const d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);pose.scale.set(width,d.length()/2,width);pose.quaternion.setFromUnitVectors(up,d.normalize());pose.updateMatrix();meshes[0].setMatrixAt(index,pose.matrix);}
 let tick=-1,wasTreasure=false;
 function update(p){const gift=!!p.treasureVisible;root.visible=p.visible||gift;if(!root.visible)return;if(gift){wasTreasure=true;tick=-1;root.position.set(p.x,p.y+9+Math.sin(p.age*4)*1.5,p.z);root.rotation.y=p.age*1.5;meshes[0].count=8;meshes[1].count=meshes[2].count=1;for(let n=0;n<8;n++){const a=n*Math.PI/4;piece(meshes[0],n,Math.sin(a)*5,0,Math.cos(a)*5,2,1.6,2);}piece(meshes[1],0,0,0,0,5,2.5,5);piece(meshes[2],0,0,2,0,1.8,.8,1.8);meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);return;}if(wasTreasure){wasTreasure=false;counts.forEach((n,i)=>meshes[i].count=n);}root.position.set(p.x,p.y+3,p.z);root.rotation.y=p.heading+Math.PI/2;const age=p.moveAge??p.age,next=Math.floor(age*30);if(next===tick)return;tick=next;
  piece(meshes[0],0,0,1,0,5.4,2.5,3.6);let index=1;
  for(const side of[-1,1])for(let leg=0;leg<4;leg++){const phase=age*15.3+leg*1.9+side,wave=Math.sin(phase),z=(leg-1.5)*1.8,a=[side*4,1,z],b=[side*(6.5+wave*.5),.9+Math.max(0,wave),z+.9],c=[side*8.8,-2+Math.max(0,wave)*2,z+wave*1.1];segment(index++,a,b,.7);segment(index++,b,c,.55);}
  for(const side of[-1,1]){piece(meshes[0],index++,side*4.8,2,5.3,1.8,1.4,2.2);piece(meshes[0],index++,side*5.6,2.2,7,1,1,1.5);const eye=side<0?0:1;piece(meshes[1],eye,side*2.6,4.3,2.4,1.1,1.5,1.1);piece(meshes[2],eye,side*2.6,4.7,3.1,.55,.7,.5);}
  piece(meshes[0],21,0,.7,-2,3.6,1.7,2);meshes.forEach(m=>m.instanceMatrix.needsUpdate=true);
 }
 return{root,update,dispose(){geometry.dispose();materials.forEach(m=>m.dispose());meshes.forEach(m=>m.dispose());root.removeFromParent();}};
}

// Watch from in front and to the side of the crab, rather than through the
// monster's back. The original view is restored by the caller after the scene.
export function createCoastCrabCamera(){const eye=new T.Vector3(),target=new T.Vector3();let id=null,side=1;return(focus,{resolve,heightAt=()=>0,near=4,fov=55,aspect=1}={})=>{const a=focus.player,b=focus.point,h=Math.atan2(b.x-a.x,b.z-a.z),gap=Math.hypot(b.x-a.x,b.z-a.z),d=Math.min(200,120+gap*.16)*Math.max(1,Math.min(1.45,.8/aspect));if(id!==focus.id){id=focus.id;const left=h-1.12,right=h+1.12;side=heightAt(b.x+Math.sin(left)*d,b.z+Math.cos(left)*d)<heightAt(b.x+Math.sin(right)*d,b.z+Math.cos(right)*d)?-1:1;}target.set(b.x,b.y,b.z);eye.set(b.x+Math.sin(h+side*1.12)*d,b.y+d*.65+8,b.z+Math.cos(h+side*1.12)*d);if(resolve)eye.copy(resolve(target,eye,{near,fov,aspect}));return{eye,target};};}
