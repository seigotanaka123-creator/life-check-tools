import * as THREE from './three.module.min.js';

export const SKY_STATION_INTERIOR = Object.freeze({
  floorY: 7.3,
  ramps: Object.freeze([
    Object.freeze({ id: 'front', axis: 'z', minX: -12, maxX: 12, minZ: 26, maxZ: 58, highAt: 26, lowAt: 58, highY: 7.3, lowY: 0 }),
    Object.freeze({ id: 'platform', axis: 'x', minX: -57, maxX: -44, minZ: -17, maxZ: 11, highAt: -44, lowAt: -57, highY: 7.3, lowY: 1.656 }),
  ]),
});

function rampY(ramp, x, z) {
  const value = ramp.axis === 'x' ? x : z;
  const t = THREE.MathUtils.clamp((value - ramp.lowAt) / (ramp.highAt - ramp.lowAt), 0, 1);
  return THREE.MathUtils.lerp(ramp.lowY, ramp.highY, t);
}

export function skyStationRampHeightAt(station, x, z) {
  if (!station) return null;
  const point = station.worldToLocal(new THREE.Vector3(x, 0, z));
  for (const ramp of SKY_STATION_INTERIOR.ramps) {
    if (point.x < ramp.minX - .001 || point.x > ramp.maxX + .001
      || point.z < ramp.minZ - .001 || point.z > ramp.maxZ + .001) continue;
    point.y = rampY(ramp, point.x, point.z);
    return station.localToWorld(point).y;
  }
  return null;
}

// This changes only rendered upper-storey visibility. The camera's chosen
// distance/angle and all ceiling/wall collision descriptors remain unchanged.
export function updateSkyStationCutaway(station, position, enabled) {
  if (!station) return;
  const p = station.worldToLocal(position.clone());
  const inside = enabled && p.x > -44 && p.x < 44 && p.z > -29 && p.z < 30 && p.y < 30;
  station.userData.interiorVisible = inside;
  for (const mesh of station.userData.cutawayMeshes || []) mesh.visible = !inside;
}

export function addSkyStationInterior(station, materials, { addBox, addWalkableBox, makeLabelTexture = null }) {
  const group = new THREE.Group();
  group.name = 'sky-station-interior';
  station.add(group);
  const { stone, stoneLight, gold, blue, wood, darkStone, door } = materials;
  const green = new THREE.MeshStandardMaterial({ color: 0x24ba8a, emissive: 0x13614a, emissiveIntensity: .35, roughness: .4 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb7c9cb, roughness: .4, metalness: .55 });
  const screen = new THREE.MeshBasicMaterial({ color: 0x194a61 });
  const white = new THREE.MeshBasicMaterial({ color: 0xfff4d7 });
  const box = (name, size, pos, material, decorative = false) => {
    const mesh = addBox(group, size, pos, material);
    mesh.name = `sky-station-${name}`;
    if (decorative) mesh.userData.nonCollidable = true;
    return mesh;
  };
  const sign = (name, text, pos, size, rotationY = 0, bg = '#10354c') => {
    let texture = makeLabelTexture?.(text, bg);
    if (!texture && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
      const c = canvas.getContext('2d');
      c.fillStyle = bg; c.fillRect(0, 0, 768, 192);
      c.strokeStyle = '#dfb75e'; c.lineWidth = 8; c.strokeRect(5, 5, 758, 182);
      c.fillStyle = '#fff5dc'; c.font = 'bold 48px "Yu Gothic", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const lines = text.split('\n');
      lines.forEach((line, i) => c.fillText(line, 384, 96 + (i - (lines.length - 1) / 2) * 65, 720));
      texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture || null, color: texture ? 0xffffff : 0xffedbd, side: THREE.FrontSide }));
    mesh.name = `sky-station-sign-${name}`; mesh.position.set(...pos); mesh.rotation.y = rotationY;
    mesh.userData.nonCollidable = true; mesh.userData.text = text; group.add(mesh);
    const back = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: bg, side: THREE.BackSide }));
    back.name = `sky-station-sign-${name}-back`; back.position.copy(mesh.position); back.rotation.copy(mesh.rotation);
    back.userData.nonCollidable = true; group.add(back);
    return mesh;
  };

  // Real separated walls: no solid building-wide box behind either doorway.
  box('wall-east', [2, 26, 54], [42, 20.3, -2], stone);
  box('wall-rear', [86, 26, 2], [0, 20.3, -28], stone);
  box('wall-west-rear', [2, 26, 12], [-42, 20.3, -23], stone);
  box('wall-west-front', [2, 26, 14], [-42, 20.3, 18], stone);
  box('platform-lintel', [4, 5, 28], [-43, 30.8, -3], stoneLight);
  [-27.5, 27.5].forEach((x, i) => box(`wall-front-${i}`, [31, 26, 2], [x, 20.3, 24], stone));
  [-14.5, 14.5].forEach((x, i) => box(`vestibule-side-${i}`, [5, 22, 18], [x, 18.3, 20], stoneLight));
  box('clock-tower-upper', [34, 24, 18], [0, 41.3, 20], stoneLight);
  // Open door leaves folded along the jambs, not a pane across the opening.
  [-1, 1].forEach(side => {
    box(`front-door-open-${side}`, [1.2, 20, 9], [side * 12, 17.5, 32.5], door);
    box(`front-door-inlay-${side}`, [1.3, 14, .6], [side * 12, 18, 32.5], gold, true);
    box(`platform-door-open-${side}`, [8, 20, 1], [-46.7, 17.5, -3 + side * 14], blue);
  });

  // One flush hall floor: the existing slab underneath remains authoritative.
  const floor = addWalkableBox(group, [82, .12, 52], [0, 7.24, -2], stoneLight);
  floor.name = 'sky-station-hall-floor'; floor.userData.physicsSurfaceId = 'hall-floor';
  // Flat tile joints and guidance lines are visual, never bumps/colliders.
  for (let x = -40; x <= 40; x += 8) box(`tile-x-${x}`, [.035, .02, 51], [x, 7.312, -2], darkStone, true);
  for (let z = -26; z <= 24; z += 8) box(`tile-z-${z}`, [81, .02, .035], [0, 7.312, z], darkStone, true);
  box('guidance-front', [1.4, .035, 34], [0, 7.33, 7], gold, true);
  box('guidance-platform', [43, .035, 1.4], [-21.5, 7.33, -10], gold, true);

  // Two open lanes; generous clear width for the complete REN model.
  [-22, 0, 22].forEach((z, i) => {
    box(`ticket-gate-${i}`, [10, 7.5, 3.6], [-20, 11.05, z], metal);
    box(`ticket-gate-top-${i}`, [10.4, .5, 4], [-20, 15.05, z], blue);
    box(`ticket-reader-${i}`, [2.4, .35, 2.5], [-16.8, 15.45, z], green, true);
    box(`ticket-slot-${i}`, [.25, .6, 1.7], [-14.9, 12.2, z], screen, true);
  });
  sign('gates', '改札口　← ホーム', [-21, 26.5, 5], [34, 6]);
  sign('exit', '出口　駅前広場', [0, 26, 22.8], [21, 4], Math.PI);
  sign('welcome', '空 駅\nようこそ、空の旅へ', [-4, 24, -26.8], [30, 8]);

  // Ticket machines face the concourse, with screens, fare buttons and tray.
  [-4, 7].forEach((z, i) => {
    box(`ticket-machine-${i}`, [6, 15, 8], [35, 14.8, z], blue);
    box(`ticket-machine-screen-${i}`, [.2, 5, 5.5], [31.9, 18.5, z], screen, true);
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) box(`ticket-button-${i}-${row}-${col}`, [.3, .8, .9], [31.7, 14 - row * 1.25, z - 1.7 + col * 1.7], white, true);
    box(`ticket-tray-${i}`, [1.5, .6, 4.5], [31.5, 10.6, z], metal);
  });
  sign('tickets', 'きっぷ・運賃案内', [32, 25, 1.5], [25, 5], -Math.PI / 2);
  // Staff counter and timetable, positioned away from both walk-through lanes.
  box('information-counter', [20, 8, 7], [25, 11.3, 18], wood);
  box('information-counter-top', [21, .6, 8], [25, 15.6, 18], stoneLight);
  sign('information', 'ご案内', [25, 12.4, 13.9], [13, 3.3], Math.PI);
  sign('timetable', '発車案内\n1番線　空行き鉄道', [26, 24, 22.8], [22, 6.5], Math.PI);
  [12, 27].forEach((x, i) => {
    box(`waiting-seat-${i}`, [12, 1.2, 5], [x, 11.4, -19], wood);
    box(`waiting-back-${i}`, [12, 5, 1], [x, 14, -21.5], wood);
    [-4, 4].forEach(dx => box(`waiting-leg-${i}-${dx}`, [1, 3.6, 3], [x + dx, 9.1, -19], metal));
  });
  sign('route-map', '空駅 ━ 雲海 ━ 空の街', [25, 23, -26.6], [22, 4]);
  [-31, 24].forEach((x, i) => {
    box(`ceiling-lamp-${i}`, [14, .8, 3], [x, 30, -7], white, true);
    const light = new THREE.PointLight(0xffe4b8, 1.6, 145, 1.4);
    light.position.set(x, 26, -7); group.add(light);
  });

  for (const ramp of SKY_STATION_INTERIOR.ramps) {
    const corners = [[ramp.minX, ramp.minZ], [ramp.maxX, ramp.minZ], [ramp.maxX, ramp.maxZ], [ramp.minX, ramp.maxZ]];
    const vertices = corners.map(([x, z]) => [x, rampY(ramp, x, z), z]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
    geometry.setIndex([0, 2, 1, 0, 3, 2]); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, stoneLight);
    mesh.name = `sky-station-${ramp.id}-access-ramp`;
    mesh.userData.nonCollidable = true; // Its exact sloped support plane is sampled by the movement solver.
    mesh.userData.stationRamp = ramp; mesh.receiveShadow = true; group.add(mesh);
    for (const side of [-1, 1]) {
      const strip = new THREE.Mesh(geometry.clone(), gold);
      // Thin border follows the same slope, leaving the passage itself unobstructed.
      const a = strip.geometry.getAttribute('position');
      for (let j = 0; j < a.count; j++) {
        if (ramp.axis === 'z') a.setX(j, side * 11.7 + a.getX(j) / 12 * .12);
        else a.setZ(j, -3 + side * 13.7 + (a.getZ(j) + 3) / 14 * .12);
        a.setY(j, a.getY(j) + .025);
      }
      strip.name = `sky-station-${ramp.id}-ramp-border-${side}`;
      strip.userData.nonCollidable = true; group.add(strip);
    }
  }
  return group;
}
