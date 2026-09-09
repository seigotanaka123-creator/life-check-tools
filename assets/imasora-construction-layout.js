import * as THREE from './three.module.min.js';
import { buildMatureStarCharacter360, WHITE_MICHI_ROAD_SABER_REN_ID, disposeMatureCharacterModel } from './imasora-character-360.js';
import { IMASORA_WORLD_MAPS, normalizedPoint } from './imasora-world-map-schema.js';

// Stage 1 only: measured volumes and a read-only layout proposal. Not gameplay physics.
export const VEHICLE_NAMES = Object.freeze(['ショベルカー', 'ダンプカー', 'ブルドーザー', 'ホイールローダー', 'クレーン車', 'フォークリフト', 'アスファルトフィニッシャー']);
export const CHARACTER_SCALE = .36;
export function officialCharacter() {
  return buildMatureStarCharacter360(WHITE_MICHI_ROAD_SABER_REN_ID, { scale: CHARACTER_SCALE });
}
export function measureCharacter() {
  const model = officialCharacter();
  model.updateMatrixWorld(true);
  const whole = new THREE.Box3().setFromObject(model);
  const feet = new THREE.Box3();
  for (const foot of model.userData.feet) feet.union(new THREE.Box3().setFromObject(foot));
  const body = new THREE.Box3().setFromObject(model.userData.body);
  const result = { id: WHITE_MICHI_ROAD_SABER_REN_ID, scale: CHARACTER_SCALE,
    width: whole.max.x - whole.min.x, height: whole.max.y - whole.min.y,
    depth: whole.max.z - whole.min.z, min: whole.min.toArray(), max: whole.max.toArray(),
    footBottom: feet.min.y, bodyBottom: body.min.y };
  disposeMatureCharacterModel(model);
  return result;
}
export function vehicleDimensions(measurement = measureCharacter()) {
  const unit = Math.ceil(Math.max(measurement.width, measurement.depth));
  return { unit, width: unit * 2 + 8, length: unit * 3 + 8, height: 43,
    floor: 9, roofUnderside: 40, seatX: [-14, 14], seatZ: 5,
    seatTop: 9.12 + measurement.bodyBottom - measurement.footBottom,
    cabinInnerWidth: 58, doorwayMinZ: -8.9, doorwayMaxZ: 19.6,
    wheelbase: 54, turnRadius: 62, measurement };
}
export function parkingProposal(dimensions = vehicleDimensions()) {
  const bayWidth = dimensions.width + 60, bayDepth = dimensions.length + 32;
  const centerX = -560, aisleHalf = 112;
  const bays = VEHICLE_NAMES.map((name, index) => ({
    name, index, x: centerX + ((index % 4) - 1.5) * bayWidth,
    z: (index < 4 ? -1 : 1) * (aisleHalf + bayDepth / 2),
    heading: index < 4 ? 0 : Math.PI, width: bayWidth, depth: bayDepth,
  }));
  const config = IMASORA_WORLD_MAPS.construction;
  return { dimensions, bays, centerX, bayWidth, bayDepth,
    original: { minX: -(config.world.layoutWidth ?? config.world.width) / 2, maxX: (config.world.layoutWidth ?? config.world.width) / 2,
      minZ: -(config.world.layoutDepth ?? config.world.depth) / 2, maxZ: (config.world.layoutDepth ?? config.world.depth) / 2 },
    extension: { minX: -850, maxX: -270, minZ: -260, maxZ: 260 },
    aisle: { minX: -800, maxX: -320, minZ: -112, maxZ: 112 },
    connector: { minX: -320, maxX: -170, minZ: -40, maxZ: 40 },
    zones: config.buildZones.map(zone => {
      const [x, , z] = normalizedPoint(config, zone.point);
      return { name: zone.name, x, z, width: zone.size[0], depth: zone.size[1] };
    }),
    spawn: normalizedPoint(config, config.spawn.point),
    entry: [config.entry].map(item => {
      const [x, , z] = normalizedPoint(config, item.point);
      return { x, z, width: item.footprint[0], depth: item.footprint[1], heading: THREE.MathUtils.degToRad(item.rotationDeg || 0) };
    }),
  };
}
export function footprint(x, z, heading, width, depth) {
  const s = Math.sin(heading), c = Math.cos(heading);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({
    x: x + a * width / 2 * c + b * depth / 2 * s,
    z: z - a * width / 2 * s + b * depth / 2 * c,
  }));
}
export function overlaps(a, b) {
  for (const polygon of [a, b]) for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length];
    const ax = -(q.z - p.z), az = q.x - p.x;
    const pa = a.map(v => v.x * ax + v.z * az), pb = b.map(v => v.x * ax + v.z * az);
    if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
  }
  return true;
}
export function rectPolygon(rect) {
  return footprint((rect.minX + rect.maxX) / 2, (rect.minZ + rect.maxZ) / 2, 0, rect.maxX - rect.minX, rect.maxZ - rect.minZ);
}
export function bayExitPath(proposal, bay) {
  const path = [], radius = proposal.dimensions.turnRadius;
  const forward = bay.index < 4 ? 1 : -1;
  const inward = bay.x < proposal.centerX ? 1 : -1;
  const endZ = -forward * radius;
  for (let i = 0; i <= 50; i++) path.push({ x: bay.x, z: THREE.MathUtils.lerp(bay.z, endZ, i / 50), heading: bay.heading });
  for (let i = 1; i <= 90; i++) {
    const angle = i / 90 * Math.PI / 2;
    path.push({ x: bay.x + inward * radius * (1 - Math.cos(angle)),
      z: endZ + forward * radius * Math.sin(angle), heading: bay.heading + inward * forward * angle });
  }
  return path;
}
export function inspectProposal(proposal) {
  const { dimensions: d } = proposal, issues = [];
  let pathSamples = 0;
  for (const bay of proposal.bays) {
    for (const pose of bayExitPath(proposal, bay)) {
      const polygon = footprint(pose.x, pose.z, pose.heading, d.width, d.length);
      pathSamples++;
      if (!polygon.every(p => p.x >= proposal.extension.minX && p.x <= proposal.extension.maxX && p.z >= proposal.extension.minZ && p.z <= proposal.extension.maxZ)) issues.push(`区画${bay.index + 1}:車体が候補地外`);
      for (const other of proposal.bays) if (other !== bay && overlaps(polygon, footprint(other.x, other.z, other.heading, d.width, d.length))) issues.push(`区画${bay.index + 1}:駐車車体に接触`);
    }
  }
  for (let i = 0; i <= 360; i++) {
    const angle = i / 360 * Math.PI * 2;
    const polygon = footprint(proposal.centerX + d.turnRadius * Math.cos(angle), d.turnRadius * Math.sin(angle), -angle, d.width, d.length);
    if (!polygon.every(p => p.x >= proposal.aisle.minX && p.x <= proposal.aisle.maxX && p.z >= proposal.aisle.minZ && p.z <= proposal.aisle.maxZ)) issues.push('旋回の車体外周が通路外');
  }
  const sideMargin = (proposal.bayWidth - d.width) / 2;
  if (sideMargin < d.measurement.width + 4) issues.push('降車余白不足');
  const characterTop = d.floor + .12 + d.measurement.height;
  if (d.roofUnderside - characterTop < 4) issues.push('頭上余白不足');
  return { issues: [...new Set(issues)], pathSamples, sideMargin, headroom: d.roofUnderside - characterTop };
}
export function savedBuildingVolumes(raw) {
  if (!raw) return [];
  const saved = JSON.parse(raw);
  const buildings = saved.builtByMap?.construction ?? [];
  if (!Array.isArray(buildings)) throw new Error('既存建物の保存形式を確認できません');
  return buildings.map(item => {
    const source = IMASORA_WORLD_MAPS.construction.buildCatalog.find(v => v.id === item.catalogId);
    if (!source || !Array.isArray(item.position) || !item.position.slice(0, 3).every(Number.isFinite)) throw new Error('既存建物に未対応のデータがあります');
    return { name: source.name, x: item.position[0], z: item.position[2], width: source.size[0] * 2.5, depth: source.size[2] * 2.5, height: source.size[1] * 2.5 };
  });
}

const material = (color, extras = {}) => new THREE.MeshStandardMaterial({ color, roughness: .64, ...extras });
export function box(parent, width, height, depth, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function roundedPlate(parent, width, depth, thickness, y, mat, radius = 4) {
  const s = new THREE.Shape(), x = -width / 2, z = -depth / 2, r = radius;
  s.moveTo(x + r, z); s.lineTo(x + width - r, z); s.quadraticCurveTo(x + width, z, x + width, z + r);
  s.lineTo(x + width, z + depth - r); s.quadraticCurveTo(x + width, z + depth, x + width - r, z + depth);
  s.lineTo(x + r, z + depth); s.quadraticCurveTo(x, z + depth, x, z + depth - r);
  s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
  const geometry = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  geometry.rotateX(Math.PI / 2); geometry.translate(0, y + thickness / 2, 0);
  const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function createVehicleScaleMock(d = vehicleDimensions()) {
  const group = new THREE.Group(); group.name = 'stage1-common-size-mock';
  const yellow = material(0xf5b927, { metalness: .22 }), dark = material(0x26313c), rubber = material(0x18212a), metal = material(0xb8c4ce, { metalness: .65 });
  roundedPlate(group, 50, d.length, 5, 6.5, yellow);
  roundedPlate(group, 54, 36, 1, d.floor - .5, dark, 3).position.z = 5;
  // Exposed two-seat cab, rather than enclosing the characters in a solid box.
  for (const x of [-25.5, 25.5]) for (const z of [-27, 27]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 9, 32), rubber);
    tire.rotation.z = Math.PI / 2; tire.position.set(x, 9, z); tire.castShadow = true; group.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 8.8, 24), metal);
    hub.rotation.z = Math.PI / 2; hub.position.copy(tire.position); group.add(hub);
    for (let j = 0; j < 16; j++) {
      const a = j / 16 * Math.PI * 2;
      const tread = box(group, 9, 1, 3, x, 9 + 8.25 * Math.cos(a), z + 8.25 * Math.sin(a), dark);
      tread.rotation.x = a;
    }
  }
  box(group, 46, 7, 15, 0, 12.5, -33, yellow);
  for (let i = 0; i < 7; i++) box(group, 1, 3, .2, (i - 3) * 3, 12, -40.6, dark);
  box(group, 46, 6, 17, 0, 12, 33.5, yellow);
  box(group, 47, 3, 3, 0, 6, 41.5, dark);
  const lightMat = material(0xffffdd, { emissive: 0xffe0a3, emissiveIntensity: .55 });
  for (const x of [-19, 19]) box(group, 7, 3, .8, x, 12, 42.2, lightMat);
  const roof = new THREE.Group(); group.add(roof);
  roundedPlate(roof, 58, 37, 3, 41.5, yellow, 5).position.z = 5;
  for (const x of [-27.5, 27.5]) for (const z of [-9.8, 20.5]) box(group, 1.8, 31, 1.8, x, 24.5, z, dark);
  const glass = material(0xb9e6eb, { transparent: true, opacity: .12, depthWrite: false, roughness: .14, side: THREE.DoubleSide });
  box(group, 52, 20, .3, 0, 28, 20.9, glass);
  box(group, 50, 5, 3, 0, 17, 23, dark);
  const characters = new THREE.Group(); group.add(characters);
  for (const [i, x] of d.seatX.entries()) {
    const seat = roundedPlate(group, 25, 20, 2, d.seatTop - 1, dark, 3); seat.position.set(x, 0, d.seatZ);
    box(group, 25, 17, 1.6, x, d.seatTop + 8.5, -8.6, dark);
    const ren = officialCharacter(); ren.name = i ? 'passenger-size-reference' : 'driver-size-reference';
    ren.position.set(x, d.floor + .12 - d.measurement.footBottom, d.seatZ); characters.add(ren);
  }
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(4.4, .6, 8, 28), dark);
  wheel.rotation.x = -.35; wheel.position.set(-14, 22, 20.6); group.add(wheel);
  box(group, .65, 7, .7, -14, 22, 20.6, metal);
  group.userData = { roof, characters, dimensions: d };
  return group;
}
