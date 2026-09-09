import * as THREE from './three.module.min.js';

export const MATERIAL_BOOK_SIZE=Object.freeze([22,32,18]);
// A stationary book on a lectern. Text is part of the stand, not a billboard.
export function createSpaceMaterialBook(){
  const root=new THREE.Group();root.name='space-material-book';
  const wood=new THREE.MeshStandardMaterial({color:0x294967,roughness:.75});
  const brass=new THREE.MeshStandardMaterial({color:0xdeb875,metalness:.35,roughness:.42});
  const paper=new THREE.MeshStandardMaterial({color:0xfff5da,roughness:.92});
  function box(name,size,position,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;}
  box('book-base',[22,3,18],[0,1.5,0],wood);
  box('book-pedestal',[12,19,10],[0,12.5,-1],wood);
  const desk=box('book-desk',[22,2,17.5],[0,24,0],wood);desk.rotation.x=.22;
  const cover=box('book-cover',[19,1,13],[0,25.6,1],brass);cover.rotation.x=.22;
  for(const side of [-1,1]){const page=box('open-book-page',[8.7,.8,11.5],[side*4.45,26.4,1],paper);page.rotation.set(.22,0,side*.035);}
  box('book-spine',[.35,.5,11.5],[0,27,1],brass).rotation.x=.22;
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#183b58';ctx.fillRect(0,0,768,256);ctx.strokeStyle='#e6c583';ctx.lineWidth=10;ctx.strokeRect(8,8,752,240);
    ctx.textAlign='center';ctx.fillStyle='#fff4d7';ctx.font='bold 70px sans-serif';ctx.fillText('宇宙素材図鑑',384,110);ctx.font='44px sans-serif';ctx.fillText('33種類 · 触れて読む',384,196);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(22,7.33),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));label.name='material-book-sign';label.position.set(0,28.3,-6.3);root.add(label);
  }
  return root;
}
export function disposeSpaceMaterialBook(root){
  if(!root)return;const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);for(const m of [].concat(object.material||[])){materials.add(m);if(m.map)textures.add(m.map);}});
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());root.removeFromParent();
}
