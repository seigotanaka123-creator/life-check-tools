import * as THREE from './three.module.min.js';
import {createPart} from './imasora-construction-crane-model.js';
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
  root.traverse(o=>{if(!o.isMesh||!['inert-building-part','part-edge'].includes(o.name))return;
    o.material.color.setHex(iron?0x72888f:p.color);o.material.roughness=iron?.38:.88;o.material.metalness=iron?.72:0;
    if(!iron)o.material.map=woodTexture();
  });
  return root;
}
