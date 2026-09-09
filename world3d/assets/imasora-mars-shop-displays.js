import * as THREE from './three.module.min.js';

// Display merchandise only. No inventory, recipes, prices or purchase handlers.
export const MARS_SHOP_DISPLAY_NAMES = Object.freeze({
  ore: '赤黒い鉱石', water: '壺入りの水', soil: '土', leaves: '葉っぱ',
  gold: '金', iron: '鉄', copper: '銅', silver: '銀',
  bricks: 'レンガ', glass: 'ガラス', lumber: '木材',
});

export function disposeMarsShopDisplays(shop) {
  if (!shop) return;
  const geometries = new Set(), materials = new Set(), textures = new Set();
  shop.traverse(object => {
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if (material.map) textures.add(material.map);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

export function buildMarsShopDisplays(structure = { size: [104, 60, 88] }) {
  const shop = new THREE.Group();
  shop.name = 'mars-material-shop-merchandise';
  shop.scale.set(structure.size[0] / 104, 1, structure.size[2] / 88);
  shop.userData.visualMerchandiseOnly = true;
  shop.userData.clearAisle = { min: [-24, 0, -16], max: [24, 40, 40] };
  const mat = (color, roughness = .7, metalness = .05, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const m = {
    wood: mat(0x71452b), woodLight: mat(0xac7950), woodEnd: mat(0xd9ad71),
    brace: mat(0x302e35, .42, .5), rope: mat(0xdcc291),
    ore: mat(0x261a22, .6, .22), oreRed: mat(0xa5222d, .35, .28),
    pot: mat(0xc7784d, .43), potRim: mat(0xf1cda0, .54),
    water: mat(0x52dcea, .13, .3, { emissive: 0x114351, emissiveIntensity: .35 }),
    sack: mat(0xbca785), soil: mat(0x3d281d), leaf: mat(0x53a449),
    leafLight: mat(0x8ac566), vein: mat(0xd1d893),
    gold: mat(0xffc343, .28, .66, { emissive: 0x714005, emissiveIntensity: .16 }),
    iron: mat(0x5d6977, .48, .62),
    copper: mat(0xd47c49, .33, .62, { emissive: 0x692510, emissiveIntensity: .12 }),
    silver: mat(0xe1e9f0, .23, .62),
    brick: mat(0xb94930, .89), brickLight: mat(0xd46542, .85),
    glass: mat(0x97edee, .12, .1, { transparent: true, opacity: .58, depthWrite: false }),
    glassEdge: mat(0xc3ffff, .23, .3, { emissive: 0x397175, emissiveIntensity: .2 }),
    warm: mat(0xffe3a6, .3, 0, { emissive: 0xffc36d, emissiveIntensity: 1.6 }),
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const pebble = new THREE.DodecahedronGeometry(1, 0);
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const mesh = (parent, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], solid = false) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.fromArray(position); object.scale.fromArray(scale);
    object.castShadow = true;
    // World sunlight uses a wide shadow frustum; avoid coarse self-shadow stripes.
    object.receiveShadow = false;
    object.userData.nonCollidable = !solid;
    if (solid) object.userData.marsMaterialShopCollision = true;
    parent.add(object);
    return object;
  };
  const box = (parent, size, position, material, solid = false) => mesh(parent, unitBox, material, position, size, solid);
  const product = (id, position) => {
    const group = new THREE.Group();
    group.name = `mars-shop-product-${id}`;
    group.position.fromArray(position);
    group.userData.productId = id;
    group.userData.displayName = MARS_SHOP_DISPLAY_NAMES[id];
    group.userData.visualMerchandiseOnly = true;
    shop.add(group);
    return group;
  };
  const crate = (parent, width, depth, height, position) => {
    const group = new THREE.Group(); group.position.fromArray(position); parent.add(group);
    box(group, [width, .8, depth], [0, .4, 0], m.wood, true);
    for (const s of [-1, 1]) {
      box(group, [.65, height, depth], [s * (width / 2 - .325), height / 2, 0], m.woodLight, true);
      for (let i = 0; i < 2; i++)
        box(group, [width, height / 2 - .24, .65], [0, (i + .5) * height / 2, s * (depth / 2 - .325)], m.woodLight, true);
    }
    return group;
  };

  // Rear wall: two open shelves, four bays, with braced uprights.
  const rack = new THREE.Group(); rack.name = 'mars-shop-back-shelves'; shop.add(rack);
  for (const x of [-41, -20, 0, 20, 41]) {
    box(rack, [1.4, 40, 1.4], [x, 20.28, -29], m.brace, true);
    box(rack, [1.4, 40, 1.4], [x, 20.28, -18.9], m.wood, true);
  }
  for (const y of [10.8, 25.2, 39.5]) {
    box(rack, [84, 1.3, 12], [0, y, -24], m.wood, true);
    box(rack, [84, 1.25, .5], [0, y + .1, -17.95], m.woodLight);
    if (y > 11) box(rack, [78, .24, .6], [0, y - .7, -23], m.warm);
  }
  box(rack, [84, 3.3, .8], [0, 37, -29.6], m.woodLight);
  for (const x of [-39, 39]) {
    const brace = box(rack, [1, 22, .8], [x * .5, 22, -29.6], m.brace);
    brace.rotation.z = x < 0 ? -.8 : .8;
  }

  // Faceted red-black ores with embedded red crystalline faces.
  const ores = product('ore', [-30, 25.85, -24]);
  crate(ores, 17, 10, 2.5, [0, 0, 0]);
  for (let i = 0; i < 7; i++) {
    const x = ((i % 3) - 1) * 4.1, z = Math.floor(i / 3) * 2.4 - 2.4;
    const rock = mesh(ores, pebble, m.ore, [x, 4 + (i === 6 ? 2.3 : 0), z], [2.6, 2.5 + i % 2, 2.2]);
    rock.rotation.set(.3 * i, .8 * i, .2 * i);
    const crystal = mesh(rock, new THREE.OctahedronGeometry(.62), m.oreRed, [.32, .55, .47], [.7, .9, .4]);
    crystal.rotation.z = .35;
    mesh(rock, new THREE.OctahedronGeometry(.35), m.oreRed, [-.42, .3, .7]);
  }

  // Bevelled metal ingots, not identical coloured cubes.
  const ingotShape = new THREE.Shape();
  ingotShape.moveTo(-2.5, 0); ingotShape.lineTo(2.5, 0);
  ingotShape.lineTo(2, 1.9); ingotShape.lineTo(-2, 1.9); ingotShape.closePath();
  const ingot = new THREE.ExtrudeGeometry(ingotShape, { depth: 3.5, steps: 1, bevelEnabled: true, bevelThickness: .13, bevelSize: .13, bevelSegments: 1 });
  ingot.translate(0, 0, -1.75);
  for (const [id, x, y] of [['gold', -10, 25.85], ['silver', 10, 25.85], ['iron', -30, 11.45], ['copper', -10, 11.45]]) {
    const goods = product(id, [x, y, -24]);
    box(goods, [17, .55, 10], [0, .275, 0], m.woodLight);
    for (let layer = 0; layer < 3; layer++) {
      const count = 3 - layer;
      for (let row = 0; row < 2; row++) for (let col = 0; col < count; col++)
        mesh(goods, ingot, m[id], [(col - (count - 1) / 2) * 5.1, .7 + layer * 2.1, (row - .5) * 4.25]);
    }
  }

  const bricks = product('bricks', [10, 11.45, -24]);
  box(bricks, [17, .55, 10], [0, .275, 0], m.woodLight);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) for (let z = 0; z < 2; z++)
    box(bricks, [4.65, 1.65, 3.65], [(x - 1) * 5.1 + (y % 2) * .5, 1.42 + y * 1.85, (z - .5) * 4], (x + y) % 2 ? m.brick : m.brickLight);

  const lumber = product('lumber', [30, 11.45, -24]);
  for (let layer = 0; layer < 3; layer++) for (let col = 0; col < 4; col++) {
    box(lumber, [3.4, 1.6, 9], [(col - 1.5) * 3.9, 1.1 + layer * 1.8, 0], m.woodLight);
    box(lumber, [3.2, 1.45, .12], [(col - 1.5) * 3.9, 1.1 + layer * 1.8, 4.54], m.woodEnd);
    for (let line = 0; line < 2; line++)
      box(lumber, [.08, 1.1, .14], [(col - 1.5) * 3.9 + (line - .5), 1.1 + layer * 1.8, 4.56], m.wood);
  }
  for (const x of [-5.8, 5.8]) box(lumber, [.45, 5.8, 9.5], [x, 2.9, 0], m.rope);

  const glass = product('glass', [30, 25.85, -24]);
  box(glass, [17, 1, 10], [0, .5, 0], m.wood);
  for (let i = 0; i < 4; i++) {
    const pane = new THREE.Group(); pane.position.set(0, 1, -3 + i * 1.75); pane.rotation.x = -.09; glass.add(pane);
    box(pane, [13, 8, .18], [0, 4, 0], m.glass);
    for (const s of [-1, 1]) box(pane, [.13, 8, .24], [s * 6.5, 4, 0], m.glassEdge);
    box(pane, [13, .13, .24], [0, 8, 0], m.glassEdge);
    const gleam = box(pane, [.14, 4, .21], [-3, 4.8, .13], m.glassEdge); gleam.rotation.z = -.45;
  }

  // Produce-style side tables: all bases stay outside the 48-wide central aisle.
  const sideTable = (name, x, z, depth) => {
    const table = new THREE.Group(); table.name = name; table.position.set(x, .28, z); shop.add(table);
    for (const a of [-1, 1]) for (const b of [-1, 1])
      box(table, [1.5, 9, 1.5], [a * 6.9, 4.5, b * (depth / 2 - 1)], m.wood, true);
    box(table, [16, 1.4, depth], [0, 9, 0], m.wood, true);
    box(table, [.65, 5, depth], [Math.sign(x) * 7.7, 12, 0], m.woodLight, true);
    return table;
  };
  sideTable('mars-shop-water-stall', -35, 10, 30);
  sideTable('mars-shop-soil-stall', 35, -3, 17);
  sideTable('mars-shop-leaf-stall', 35, 18, 18);

  // Open earthenware jar profile includes inner wall and lip. The water is visible inside.
  const jarProfile = [[0, 0], [2.3, 0], [3.5, .7], [4, 2.5], [3.8, 4.3], [2.8, 5.7], [2.6, 6.5], [3, 6.65], [3, 7], [2.35, 7], [2.15, 6.4], [2.5, 5.7], [3.25, 4.1], [3.4, 2.6], [2.8, .9], [0, .9]].map(([x, y]) => new THREE.Vector2(x, y));
  const jarGeometry = new THREE.LatheGeometry(jarProfile, 24);
  const water = product('water', [-35, 9.98, 10]);
  for (const [x, z, s] of [[0, -9, 1], [1.5, 1, 1.12], [-1, 10, .92]]) {
    const jar = new THREE.Group(); jar.position.set(x, 0, z); jar.scale.setScalar(s); water.add(jar);
    mesh(jar, jarGeometry, m.pot);
    const rim = mesh(jar, new THREE.TorusGeometry(2.67, .2, 8, 24), m.potRim, [0, 6.9, 0]); rim.rotation.x = Math.PI / 2;
    const surface = mesh(jar, new THREE.CircleGeometry(2.4, 28), m.water, [0, 6.35, 0]); surface.rotation.x = -Math.PI / 2;
    const ripple = mesh(jar, new THREE.TorusGeometry(1.2, .055, 4, 24), m.glassEdge, [0, 6.37, 0]); ripple.rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      const handle = mesh(jar, new THREE.TorusGeometry(.86, .25, 7, 12), m.potRim, [side * 3.3, 5, 0]);
      handle.rotation.y = Math.PI / 2;
    }
  }

  const soil = product('soil', [35, 9.98, -3]);
  for (const [x, z] of [[-3, -3.4], [3, 3.7]]) {
    mesh(soil, sphere, m.sack, [x, 2.6, z], [3.45, 2.7, 3.6]);
    mesh(soil, sphere, m.soil, [x, 4.6, z], [2.9, .5, 3]);
    const fold = mesh(soil, new THREE.TorusGeometry(2.96, .36, 6, 20), m.sack, [x, 4.6, z]); fold.rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) mesh(soil, pebble, m.soil, [x + Math.sin(i * 2.4) * 1.6, 5.02, z + Math.cos(i * 2.4) * 1.8], [.6, .32, .55]);
  }

  const leaves = product('leaves', [35, 9.98, 18]);
  crate(leaves, 15, 16, 2.6, [0, 0, 0]);
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, -3.2);
  leafShape.bezierCurveTo(-3, -1, -2.2, 2, 0, 3.5);
  leafShape.bezierCurveTo(2.2, 2, 3, -1, 0, -3.2);
  const leafGeometry = new THREE.ExtrudeGeometry(leafShape, { depth: .16, bevelEnabled: false, curveSegments: 6 });
  for (let i = 0; i < 14; i++) {
    const leaf = new THREE.Group(); leaf.position.set((i % 3 - 1) * 3.8, 2.1 + Math.floor(i / 6) * .65, (Math.floor(i / 3) % 3 - 1) * 3.7);
    leaf.rotation.set(-1.15 + Math.sin(i) * .16, i * 1.6, .2); leaves.add(leaf);
    mesh(leaf, leafGeometry, i % 3 ? m.leaf : m.leafLight);
    box(leaf, [.12, 5.8, .12], [0, 0, .25], m.vein);
  }

  // One warm fill light makes the stock legible under the existing opaque roof.
  const light = new THREE.PointLight(0xffe4b7, 36, 100, 1);
  light.name = 'mars-shop-interior-stock-light'; light.position.set(0, 34, -3); shop.add(light);
  return shop;
}
