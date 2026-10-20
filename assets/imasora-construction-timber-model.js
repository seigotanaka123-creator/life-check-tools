import{isKitCargo,kitPieceBoxes}from'./imasora-construction-kit-cargo.mjs?v=120gm';
import * as THREE from './three.module.min.js';
import {createPart} from './imasora-construction-crane-model.js?v=120gn';
import{isBeamBundle}from'./imasora-construction-timber-cargo.mjs?v=120gl';
let grain;
function woodTexture(){
  if(grain)return grain;
  const w=128,h=128,data=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const v=.87+.08*Math.sin((y+Math.sin(x*.045)*1.8)*2.4)+.03*Math.sin(y*.38+x*.012),i=(y*w+x)*4;
    data[i]=Math.round(255*v);data[i+1]=Math.round(247*v);data[i+2]=Math.round(229*v);data[i+3]=255;
  }
  grain=new THREE.DataTexture(data,w,h);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.magFilter=THREE.LinearFilter;grain.minFilter=THREE.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;return grain;
}
export function createTimberPart(p){
  const root=createPart(p),iron=p.materialId==='earth-iron';root.userData.materialId=p.materialId;
  if(isKitCargo(p)){
    const body=root.getObjectByName('inert-building-part');root.remove(body);body.geometry.dispose();root.userData.kitPieces=[];
    for(const b of kitPieceBoxes(p.w/28)){const m=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h,b.d),body.material);m.name='inert-building-part';m.position.set(b.x,b.y,b.z);m.castShadow=m.receiveShadow=true;root.add(m);root.userData.kitPieces.push(m);}
    // Same protected kit is rendered by the crane and by its building.
    const tie=new THREE.MeshStandardMaterial({color:0xffd985,roughness:.65});
    for(const x of[-p.w*.3,p.w*.3]){const band=new THREE.Mesh(new THREE.BoxGeometry(1,p.h+.08,p.d+.08),tie);band.position.set(x,p.h/2,0);band.name='建築キットの結束帯';root.add(band);}
  }
  if(isBeamBundle(p)){
    // Four touching 14 x 6 x 80 timbers occupy the complete saved 28 x 12 x 80
    // hull. No shrunken decorative load or different collision-only volume.
    const body=root.getObjectByName('inert-building-part');root.remove(body);body.geometry.dispose();
    const geometry=new THREE.BoxGeometry(14,6,80);root.userData.beams=[];
    for(const x of[-7,7])for(const y of[3,9]){const beam=new THREE.Mesh(geometry,body.material);beam.name='inert-building-part';beam.position.set(x,y,0);beam.castShadow=beam.receiveShadow=true;root.add(beam);root.userData.beams.push(beam);}
    const tie=new THREE.MeshStandardMaterial({color:0xffd985,roughness:.65});
    for(const z of[-24,24]){const top=new THREE.Mesh(new THREE.BoxGeometry(28,.08,1.5),tie);top.position.set(0,12.04,z);top.name='角材の結束帯';root.add(top);}
    const lines=[0,12].flatMap(y=>[[0,y+.03,-40],[0,y+.03,40]]);
    for(const z of[-40.03,40.03])lines.push([-14,6,z],[14,6,z],[0,0,z],[0,12,z]);
    for(const x of[-14.03,14.03])lines.push([x,6,-40],[x,6,40]);
    const seams=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines.map(v=>new THREE.Vector3(...v))),new THREE.LineBasicMaterial({color:0x765489,depthWrite:false}));seams.name='角材4本の境目';root.add(seams);
  }
  root.traverse(o=>{if(!o.isMesh||!['inert-building-part','part-edge'].includes(o.name))return;
    o.material.color.setHex(iron?0x72888f:p.color);o.material.roughness=iron?.38:.88;o.material.metalness=iron?.72:0;
    if(!iron)o.material.map=woodTexture();
  });
  return root;
}
