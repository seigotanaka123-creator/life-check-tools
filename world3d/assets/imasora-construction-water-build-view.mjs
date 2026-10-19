import * as THREE from './three.module.min.js';
import {waterBuildLevel,waterBuildCellSize} from './imasora-construction-water-build.mjs?v=120fb';

// A joined water body has only its exterior walls/rim. Adjacent cells do not
// retain doubled transparent faces or frames inside the water.
export function waterBuildSurfaces(builds){
 const cells=[],grid=new Map(),faces=[],lines=[],corners=new Map();
 for(const b of builds??[]){if(!b.q)continue;const level=waterBuildLevel(b),size=waterBuildCellSize(b);for(const c of b.cells)if(level>c.y+.001){const o={...c,size,level,kind:b.kind};cells.push(o);grid.set(size+','+c.x+','+c.z,o);}}
 const quad=(a,b,c,d)=>faces.push(...a,...b,...c,...a,...c,...d);
 for(const c of cells){const h=c.size/2,x=c.x,z=c.z,y=c.level;
  quad([x-h,y,z-h],[x-h,y,z+h],[x+h,y,z+h],[x+h,y,z-h]);
  for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const next=grid.get(c.size+','+(x+dx*c.size)+','+(z+dz*c.size)),bottom=Math.max(c.y,next?.level??c.y);if(bottom>=y-.001)continue;
   const a=dx?[x+dx*h,y,z-h]:[x-h,y,z+dz*h],b=dx?[x+dx*h,y,z+h]:[x+h,y,z+dz*h];
   quad(a,b,[b[0],bottom,b[2]],[a[0],bottom,a[2]]);
   if(c.kind==='block'){lines.push(...a,...b);for(const [p,q]of[[a,b],[b,a]]){const key=p.join(','),corner=corners.get(key)??{p,bottom:c.y,directions:[]};corner.bottom=Math.min(corner.bottom,c.y);corner.directions.push([Math.sign(q[0]-p[0]),Math.sign(q[2]-p[2])]);corners.set(key,corner);}}
  }
 }
 for(const {p,bottom,directions:d}of corners.values())if(!(d.length===2&&d[0][0]===-d[1][0]&&d[0][1]===-d[1][1]))lines.push(...p,p[0],bottom,p[2]);
 return{faces,lines};
}
export function createWaterBuildView({preview=false}={}){
 const root=new THREE.Group(),g=new THREE.BufferGeometry(),positions=new THREE.BufferAttribute(new Float32Array(4096*5*6*3),3).setUsage(THREE.DynamicDrawUsage);g.setAttribute('position',positions);g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(positions.array.length),3).setUsage(THREE.DynamicDrawUsage));g.setDrawRange(0,0);
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x25b9e0,roughness:.28,metalness:.08,transparent:true,opacity:preview?.25:.76,depthWrite:!preview,side:THREE.DoubleSide}));mesh.frustumCulled=false;mesh.name=preview?'water-build-preview':'joined-water-volume';root.add(mesh);
 const lg=new THREE.BufferGeometry(),la=new THREE.BufferAttribute(new Float32Array(192*4*12),3).setUsage(THREE.DynamicDrawUsage);lg.setAttribute('position',la);lg.setDrawRange(0,0);const lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:preview?0xffc168:0x96eeff}));lines.frustumCulled=false;lines.name='water-outer-frame';root.add(lines);root.userData={mesh,lines,builds:null};return root;
}
export function updateWaterBuildView(root,builds){
 const d=root.userData;if(d.builds===builds)return;d.builds=builds;const {faces,lines}=waterBuildSurfaces(builds);
 for(const [o,values]of[[d.mesh,faces],[d.lines,lines]]){const a=o.geometry.attributes.position;if(values.length>a.array.length)throw Error('水の表示数を確認できません。');a.array.set(values);a.clearUpdateRanges();if(values.length){a.addUpdateRange(0,values.length);a.needsUpdate=true;}o.geometry.setDrawRange(0,values.length/3);o.visible=!!values.length;if(o===d.mesh&&values.length){const n=o.geometry.attributes.normal;for(let i=0;i<values.length;i+=9){const ax=values[i+3]-values[i],ay=values[i+4]-values[i+1],az=values[i+5]-values[i+2],bx=values[i+6]-values[i],by=values[i+7]-values[i+1],bz=values[i+8]-values[i+2],nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,len=Math.hypot(nx,ny,nz)||1;for(let v=0;v<3;v++)n.setXYZ(i/3+v,nx/len,ny/len,nz/len);}n.clearUpdateRanges();n.addUpdateRange(0,values.length);n.needsUpdate=true;}}
 root.visible=!!faces.length;
}
