import * as THREE from './three.module.min.js';

export const MARS_LANDSCAPE_REACH = 30000;
const RINGS = [0, 40, 90, 180, 300, 500, 800, 1200, 1800, 2600, 3800, 5200, 7000, 10000, 14500, 20000, MARS_LANDSCAPE_REACH];
const SIDE_SEGMENTS = 48;

export function marsLandscapeHeight(x, z, outsideDistance) {
  // The flat inner edge exactly joins the unchanged playable surface.
  const t = THREE.MathUtils.smoothstep(outsideDistance, 100, 1100);
  const rolling = Math.sin(x*.0017 + Math.sin(z*.0011)*1.8) * 52
    + Math.cos(z*.0023 - x*.0008) * 38
    + Math.sin(x*.0043 + z*.0031) * 17;
  const ridge = Math.pow(.5 + .5*Math.sin(x*.00075+z*.00125), 3) * 155;
  // Far ground curves gently below the real horizon instead of ending as a
  // rectangular floating board. This affects scenery, not the playable map.
  return (70+rolling+ridge)*t - outsideDistance*outsideDistance/2400000;
}

export function createMarsLandscape(config, sourceTexture) {
  const {width,depth}=config.world;
  const hw=width/2, hd=depth/2;
  const corners=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]];
  const contour=[];
  for(let side=0;side<4;side++) for(let i=0;i<SIDE_SEGMENTS;i++) {
    const a=corners[side], b=corners[(side+1)%4], t=i/SIDE_SEGMENTS;
    contour.push([THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t)]);
  }
  const positions=[], uv=[], indices=[];
  for(const distance of RINGS) for(const [ix,iz] of contour) {
    const length=Math.hypot(ix,iz);
    const x=ix+ix/length*distance, z=iz+iz/length*distance;
    positions.push(x,marsLandscapeHeight(x,z,distance),z);
    // Keep exactly the same grain/crater scale and edge texels as the local
    // terrain; mirrored repetition avoids discontinuous texture seams.
    uv.push(.5+x/width,.5-z/depth);
  }
  const n=contour.length;
  for(let r=0;r<RINGS.length-1;r++) for(let i=0;i<n;i++) {
    const j=(i+1)%n, a=r*n+i,b=(r+1)*n+i,c=r*n+j,d=(r+1)*n+j;
    indices.push(a,c,b,c,d,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const texture=sourceTexture?.clone() || null;
  if(texture) {
    texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;
    texture.needsUpdate=true;
  }
  const material=new THREE.MeshStandardMaterial({ map:texture,
    color:texture ? 0xffffff : config.palette.ground, roughness:.88,metalness:.01 });
  const terrain=new THREE.Mesh(geometry,material);
  terrain.name='mars-distant-landscape';
  terrain.receiveShadow=true;
  terrain.userData.nonCollidable=true;
  terrain.userData.sceneryOnly=true;
  terrain.userData.reach=MARS_LANDSCAPE_REACH;
  terrain.userData.innerContourCount=n;
  return terrain;
}

export function disposeMarsLandscape(terrain) {
  if(!terrain)return;
  terrain.removeFromParent(); terrain.geometry.dispose();
  terrain.material.map?.dispose(); terrain.material.dispose();
}
