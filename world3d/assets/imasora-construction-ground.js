import * as THREE from './three.module.min.js';

export function constructionGroundRegions(config) {
  const w = config.world.width / 2, d = config.world.depth / 2;
  const cw = (config.world.layoutWidth ?? config.world.width) / 2;
  const cd = (config.world.layoutDepth ?? config.world.depth) / 2;
  return [
    { id: 'original', minX: -cw, maxX: cw, minZ: -cd, maxZ: cd },
    { id: 'west', minX: -w, maxX: -cw, minZ: -d, maxZ: d },
    { id: 'east', minX: cw, maxX: w, minZ: -d, maxZ: d },
    { id: 'north', minX: -cw, maxX: cw, minZ: -d, maxZ: -cd },
    { id: 'south', minX: -cw, maxX: cw, minZ: cd, maxZ: d },
  ].filter(r => r.maxX > r.minX && r.maxZ > r.minZ);
}

function soilGrain() {
  const size = 128, data = new Uint8Array(size * size * 4);
  let seed = 426;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grain = 215 + Math.floor(seed / 4294967296 * 40);
    data.set([grain, grain, grain, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

// Split rectangles, rather than hiding pixels: the ground and underside rim
// must both be absent where the excavated volume exposes a real hole.
export function subtractGroundRect(regions,hole){
  if(!hole||!['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(hole[k]))||hole.maxX<=hole.minX||hole.maxZ<=hole.minZ)throw Error('掘削開口の範囲が不正です。');
  return regions.flatMap(r=>{
    const x0=Math.max(r.minX,hole.minX),x1=Math.min(r.maxX,hole.maxX),z0=Math.max(r.minZ,hole.minZ),z1=Math.min(r.maxZ,hole.maxZ);
    if(x0>=x1||z0>=z1)return[r];
    return [
      {...r,id:r.id+'-w',maxX:x0},{...r,id:r.id+'-e',minX:x1},
      {...r,id:r.id+'-n',minX:x0,maxX:x1,maxZ:z0},{...r,id:r.id+'-s',minX:x0,maxX:x1,minZ:z1}
    ].filter(b=>b.maxX>b.minX&&b.maxZ>b.minZ);
  });
}
export function createConstructionGround(config,{holes=[]}={}) {
  const group = new THREE.Group(); group.name = 'construction-expanded-ground';
  const grain = soilGrain();
  const soil = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: grain, roughness: 1 });
  const base = new THREE.Color(0xbe9159);
  const regions=holes.reduce(subtractGroundRect,constructionGroundRegions(config));
  for (const r of regions) {
    const width = r.maxX - r.minX, depth = r.maxZ - r.minZ;
    const geometry = new THREE.PlaneGeometry(width, depth, Math.ceil(width / 100), Math.ceil(depth / 100));
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((r.maxX + r.minX) / 2, 0, (r.maxZ + r.minZ) / 2);
    const positions = geometry.attributes.position;
    // Exactly level with existing floor collision; no visual-only bumps or steps.
    for (let i = 0; i < positions.count; i++) positions.setY(i, 0);
    // The original footprint uses the same world-space soil grain and tint as
    // the four extensions. Its old illustrated map is no longer a floor skin.
    const colors = [], uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const variation = .95 + .07 * Math.sin(x * .006 + Math.sin(z * .007)) + .035 * Math.cos(z * .019 - x * .013);
      const c = base.clone().multiplyScalar(variation); colors.push(c.r, c.g, c.b);
      uv.setXY(i, x / 48, z / 48);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geometry, soil); mesh.name = `construction-ground-${r.id}`;
    mesh.receiveShadow = true; mesh.userData.groundRegion = r; group.add(mesh);
  }
  const rimMaterial=new THREE.MeshStandardMaterial({ color: config.palette.edge, roughness: 1 });
  const rimRegions=holes.reduce(subtractGroundRect,[{id:'rim',minX:-config.world.width/2-2,maxX:config.world.width/2+2,minZ:-config.world.depth/2-2,maxZ:config.world.depth/2+2}]);
  for(const r of rimRegions){const rim = new THREE.Mesh(new THREE.BoxGeometry(r.maxX-r.minX,2.2,r.maxZ-r.minZ),rimMaterial);
    rim.position.set((r.minX+r.maxX)/2,-3.1,(r.minZ+r.maxZ)/2);rim.name='construction-ground-rim';group.add(rim);}
  group.userData.ownedTexture = grain;
  return group;
}

export function disposeConstructionGround(group) {
  if (!group) return;
  const geometries = new Set(), materials = new Set();
  group.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) materials.add(mesh.material); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  // The old source image belongs to the world's texture cache, not this extension.
  group.userData.ownedTexture?.dispose();
}
