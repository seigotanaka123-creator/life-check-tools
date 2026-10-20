import {createPaintMaterials} from './paint-colors.mjs?v=120ds';
import * as T from '../three.module.min.js';
import {paintResultColor} from './free-paint-removal.mjs?v=120dm';
import {FLOOR_COLORS} from './floor-parts.mjs?v=120ds';
import {freeCell} from './free-build-state.mjs?v=120gn';
import {freePlacedFill} from './free-work-parts.mjs';
import {constructionBase} from './free-supported-build.mjs?v=120gn';
import {maskingProgress} from './free-masking-operation.mjs?v=120gn';

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

export function placePaintPatch(mesh,w,origin,cell,face,pixel,bias=.026){
 const c=freeCell(cell),h=w.fill[cell]/2,base=constructionBase(w),x=w.x-origin.x+c.x,z=w.z-origin.z+c.z,col=pixel%4,row=Math.floor(pixel/4);
 mesh.rotation.set(0,0,0);
 if(face==='top'){mesh.rotation.x=-Math.PI/2;mesh.position.set(x-6+col*4,base+h+bias,z-6+row*4);mesh.scale.set(3.99,3.99,1);}
 else if(face==='north'||face==='south'){mesh.rotation.y=face==='north'?Math.PI:0;mesh.position.set(x-6+col*4,base+h*(row+.5)/4,z+(face==='north'?-8-bias:8+bias));mesh.scale.set(3.99,h/4,1);}
 else{mesh.rotation.y=face==='west'?-Math.PI/2:Math.PI/2;mesh.position.set(x+(face==='west'?-8-bias:8+bias),base+h*(row+.5)/4,z-6+col*4);mesh.scale.set(3.99,h/4,1);}
 return mesh;
}

export function createFreePaintLayer(parent){
 const root=new T.Group();root.name='free-concrete-paint';parent.add(root);
 const plane=new T.PlaneGeometry(1,1),materials=createPaintMaterials(surfaceMaterial);
 const faces=new Map();let current=null,key='',stroke=null,mask=null,maskKey='',maskWork=null;
 const tape=new T.Group();tape.name='paint-masking-preview';root.add(tape);
 const tapeMaterial=surfaceMaterial('#f2c66f',true),stripeMaterial=surfaceMaterial('#fff6d8',true);
 const draftMaterial=surfaceMaterial('#f2c66f',true);draftMaterial.transparent=true;draftMaterial.opacity=.35;draftMaterial.wireframe=true;
 function drawMask(){
  const same=(a,b)=>a&&b&&a.work===b.work&&a.cell===b.cell&&a.face===b.face;
  const selected=maskWork?{...maskWork.plan,mask:maskWork.mask,draft:maskWork.mask}:mask;
  const targets=(mask?.appliedFaces??[]).filter(t=>!same(t,selected));if(selected)targets.push(selected);
  const next=JSON.stringify([current?.location,targets,current?.completed?.map(w=>[w.x,w.z,w.baseY,w.fill,w.placedMask])]);if(next===maskKey)return;maskKey=next;tape.clear();
  for(const target of targets){const w=current?.completed[target.work];if(!w||!freePlacedFill(w,target.cell)||!['top','north','south','west','east'].includes(target.face))continue;
   for(let i=0;i<16;i++)if(target.mask&(1<<i)){
    const m=placePaintPatch(surfaceMesh(plane,tapeMaterial),w,current.location,target.cell,target.face,i,.11);m.renderOrder=21;m.name='tape-patch:'+i;m.userData.maskTarget={work:target.work,cell:target.cell,face:target.face};tape.add(m);
    for(const sign of [-1,1]){const stripe=placePaintPatch(surfaceMesh(plane,stripeMaterial),w,current.location,target.cell,target.face,i,.115);stripe.translateX(sign*1.08);stripe.scale.x=.34;stripe.renderOrder=22;stripe.name='tape-stripe:'+i;tape.add(stripe);}
   }else if((target.draft??0)&(1<<i)){const m=placePaintPatch(surfaceMesh(plane,draftMaterial),w,current.location,target.cell,target.face,i,.12);m.renderOrder=21;m.name='tape-draft:'+i;tape.add(m);}
  }
 }
 const id=(work,cell,face)=>`${work}:${cell}:${face}`;
 function facePixels(work,cell,face,values){
  const name=id(work,cell,face);let group=faces.get(name);
  if(!group){group=new T.Group();group.name='paint-face:'+name;faces.set(name,group);root.add(group);}
  const w=current?.completed[work];if(!w||!freePlacedFill(w,cell)){group.clear();return;}
  for(let i=0;i<16;i++){
   let mesh=group.getObjectByName('paint-pixel:'+i);const material=materials[values[i]];
   if(!material){if(mesh)group.remove(mesh);continue;}
   if(!mesh){mesh=surfaceMesh(plane,material);mesh.name='paint-pixel:'+i;mesh.userData.paint={work,cell,face,pixel:i};group.add(mesh);}else mesh.material=material;
   placePaintPatch(mesh,w,current.location,cell,face,i,face==='top'?.026:.025);
  }
 }
 function sync(f){
  current=f;const next=JSON.stringify([f.location,f.completed]);if(next===key)return;key=next;root.clear();root.add(tape);maskKey='';faces.clear();
  for(const [work,w]of f.completed.entries())for(const [name,values]of Object.entries(w.paint)){const [cell,face]=name.split(':');facePixels(work,Number(cell),face,values);}
  if(stroke)facePixels(stroke.work,stroke.cell,stroke.face,stroke.values);drawMask();
 }
 return{root,sync,setMask(value){mask=value?{...value}:null;drawMask();},
  beginMask(plan){if(maskWork)throw Error('テープの作業中です。');maskWork={plan,mask:plan.fromMask};drawMask();},
  drawMaskProgress(pixels){if(!maskWork)throw Error('テープの作業が始まっていません。');maskWork.mask=maskingProgress(maskWork.plan,pixels);drawMask();},
  finishMask(success){if(!maskWork)return;const {plan}=maskWork;if(success&&mask&&mask.work===plan.work&&mask.cell===plan.cell&&mask.face===plan.face)mask={...mask,mask:plan.toMask,draft:plan.toMask};maskWork=null;maskKey='';drawMask();},
  draw(f,a,pixels){
   if(!stroke){sync(f);stroke={work:a.work,cell:a.cell,face:a.face,original:[...(f.completed[a.work].paint[`${a.cell}:${a.face}`]??Array(16).fill(null))],values:null};stroke.values=[...stroke.original];}
   const color=paintResultColor(a.color);let changed=false;for(const i of pixels)if(stroke.values[i]!==color){stroke.values[i]=color;changed=true;}
   if(changed)facePixels(stroke.work,stroke.cell,stroke.face,stroke.values);
  },
  // Success leaves the same meshes in place until sync installs the saved
  // project in this same JS turn. Failure restores the old face immediately.
  finish(success){if(!stroke)return;if(!success)facePixels(stroke.work,stroke.cell,stroke.face,stroke.original);stroke=null;},
 };
}
