import * as T from './three.module.min.js';
import {worldPoint} from './imasora-coast-physics.mjs?v=120nz';
export function createCoastGangwayView(scene){
 const root=new T.Group();root.name='停泊中の渡り板';scene.add(root);
 const geo=new T.BoxGeometry(1,1,1),wood=new T.MeshStandardMaterial({color:0xe2b971,roughness:.7}),edge=new T.MeshStandardMaterial({color:0xffe7a2,roughness:.7});
 const planks=new T.InstancedMesh(geo,wood,15),strips=new T.InstancedMesh(geo,edge,6);root.add(planks,strips);planks.count=strips.count=0;planks.frustumCulled=strips.frustumCulled=false;planks.receiveShadow=strips.receiveShadow=true;
 const basis=new T.Matrix4(),local=new T.Matrix4(),matrix=new T.Matrix4(),xAxis=new T.Vector3(),yAxis=new T.Vector3(),zAxis=new T.Vector3(),pos=new T.Vector3(),rotation=new T.Quaternion(),one=new T.Vector3(1,1,1);let disposed=false;
 const box=(mesh,x,y,z,w,h,d)=>{local.makeScale(w,h,d);local.setPosition(x,y,z);matrix.multiplyMatrices(basis,local);mesh.setMatrixAt(mesh.count++,matrix);};
 return{root,update(play,plans){if(disposed)return;planks.count=strips.count=0;
  for(const b of play.parts.filter(p=>p.type==='board')){const p=plans.find(p=>p.id===b.id);
   if(p){zAxis.set(p.to[0]-p.from[0],p.to[1]-p.from[1],p.to[2]-p.from[2]);const length=zAxis.length();zAxis.normalize();xAxis.set(p.normal[0],0,p.normal[1]);yAxis.crossVectors(zAxis,xAxis).normalize();basis.makeBasis(xAxis,yAxis,zAxis);pos.fromArray(p.from);basis.setPosition(pos);
    for(let n=0;n<4;n++)box(planks,-13.5+n*9,-.6,length/2,8.6,1.2,length);
    box(planks,0,-2,1,36,4,4);
    for(const side of[-1,1])box(strips,side*17.6,.15,length/2,.8,.7,length);
   }else{basis.compose(pos.fromArray(worldPoint(b,[0,4.1,-15])),rotation.fromArray(b.q),one);for(let n=0;n<4;n++)box(planks,-10.5+n*7,0,0,6.6,1.2,18);}
  }
  planks.instanceMatrix.needsUpdate=strips.instanceMatrix.needsUpdate=true;
 },dispose(){if(disposed)return;disposed=true;root.removeFromParent();planks.dispose();strips.dispose();geo.dispose();wood.dispose();edge.dispose();}};
}
