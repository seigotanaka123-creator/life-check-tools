import * as T from '../three.module.min.js';
import {FLOOR_COLORS} from './floor-parts.mjs';
import {freeCell} from './free-build-state.mjs';
import {freePlacedFill} from './free-work-parts.mjs';
import {constructionBase} from './free-supported-build.mjs';

// Paint and boarding cues are surface graphics, not solid boxes. Keep depth
// testing so nearby characters and vehicles still occlude them, but do not
// write depth or receive the ground's self-shadow. A small bias separates the
// graphic from its supporting surface without drawing it through other walls.
export function surfaceMaterial(color,basic=false){
 const options={color,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1};
 return basic?new T.MeshBasicMaterial(options):new T.MeshStandardMaterial({...options,roughness:.8});
}
export function surfaceMesh(geometry,material){
 const mesh=new T.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=false;mesh.renderOrder=20;return mesh;
}

export function createFreePaintLayer(parent){
 const root=new T.Group();root.name='free-concrete-paint';parent.add(root);
 const plane=new T.PlaneGeometry(1,1),materials=Object.fromEntries(Object.entries(FLOOR_COLORS).map(([k,c])=>[k,surfaceMaterial(c)]));
 const faces=new Map();let current=null,key='',stroke=null;
 const id=(work,cell,face)=>`${work}:${cell}:${face}`;
 function facePixels(work,cell,face,values){
  const name=id(work,cell,face);let group=faces.get(name);
  if(!group){group=new T.Group();group.name='paint-face:'+name;faces.set(name,group);root.add(group);}
  const w=current?.completed[work];if(!w||!freePlacedFill(w,cell)){group.clear();return;}
  const c=freeCell(cell),h=w.fill[cell]/2,base=constructionBase(w),x=w.x-current.location.x+c.x,z=w.z-current.location.z+c.z;
  for(let i=0;i<16;i++){
   let mesh=group.getObjectByName('paint-pixel:'+i);const material=materials[values[i]];
   if(!material){if(mesh)group.remove(mesh);continue;}
   if(!mesh){mesh=surfaceMesh(plane,material);mesh.name='paint-pixel:'+i;mesh.userData.paint={work,cell,face,pixel:i};group.add(mesh);}else mesh.material=material;
   const col=i%4,row=Math.floor(i/4);mesh.rotation.set(0,0,0);
   if(face==='top'){mesh.rotation.x=-Math.PI/2;mesh.position.set(x-6+col*4,base+h+.026,z-6+row*4);mesh.scale.set(3.99,3.99,1);}
   else if(face==='north'||face==='south'){mesh.rotation.y=face==='north'?Math.PI:0;mesh.position.set(x-6+col*4,base+h*(row+.5)/4,z+(face==='north'?-8.025:8.025));mesh.scale.set(3.99,h/4,1);}
   else{mesh.rotation.y=face==='west'?-Math.PI/2:Math.PI/2;mesh.position.set(x+(face==='west'?-8.025:8.025),base+h*(row+.5)/4,z-6+col*4);mesh.scale.set(3.99,h/4,1);}
  }
 }
 function sync(f){
  current=f;const next=JSON.stringify([f.location,f.completed]);if(next===key)return;key=next;root.clear();faces.clear();
  for(const [work,w]of f.completed.entries())for(const [name,values]of Object.entries(w.paint)){const [cell,face]=name.split(':');facePixels(work,Number(cell),face,values);}
  if(stroke)facePixels(stroke.work,stroke.cell,stroke.face,stroke.values);
 }
 return{root,sync,
  draw(f,a,pixels){
   if(!stroke){sync(f);stroke={work:a.work,cell:a.cell,face:a.face,original:[...(f.completed[a.work].paint[`${a.cell}:${a.face}`]??Array(16).fill(null))],values:null};stroke.values=[...stroke.original];}
   let changed=false;for(const i of pixels)if(stroke.values[i]!==a.color){stroke.values[i]=a.color;changed=true;}
   if(changed)facePixels(stroke.work,stroke.cell,stroke.face,stroke.values);
  },
  // Success leaves the same meshes in place until sync installs the saved
  // project in this same JS turn. Failure restores the old face immediately.
  finish(success){if(!stroke)return;if(!success)facePixels(stroke.work,stroke.cell,stroke.face,stroke.original);stroke=null;},
 };
}
