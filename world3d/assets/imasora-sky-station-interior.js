import * as THREE from './three.module.min.js';
import {coastTime} from './imasora-coast-layout.mjs?v=120mx';
import {positionCoastCrewCharacter} from './imasora-coast-crew-character.mjs?v=120oc';

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

const SKY_INSPECTION_RAMPS = Object.freeze([
  { axis: 'x', lowAt: 84, highAt: 111, lowY: 0, highY: 14, minX: 84, maxX: 111, minZ: -59.8, maxZ: -44.2 },
  { axis: 'x', lowAt: 56, highAt: 99, lowY: 0, highY: 5, minX: 56, maxX: 99, minZ: -81.5, maxZ: -66.5 },
]);
const SKY_STATION_RAMPS = [...SKY_STATION_INTERIOR.ramps, ...SKY_INSPECTION_RAMPS];

export function skyStationRampHeightAt(station, x, z) {
  if (!station) return null;
  const point = station.worldToLocal(new THREE.Vector3(x, 0, z));
  for (const ramp of SKY_STATION_RAMPS) {
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

function makeStationBrochureTexture() {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=384;canvas.height=208;
  const c=canvas.getContext('2d');if(!c)return null;
  c.fillStyle='#f6ecd1';c.fillRect(0,0,384,208);
  c.fillStyle='#deeff0';c.fillRect(194,12,177,184);
  c.fillStyle='#b9dfec';c.fillRect(15,16,157,76);
  c.fillStyle='#fbf7ea';
  for(const [x,y,r] of [[57,55,19],[80,45,26],[107,52,22],[133,62,16]]){
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
  }
  c.fillStyle='#1b4054';c.font='bold 25px sans-serif';c.fillText('空駅の道案内',17,128);
  c.fillStyle='#617f80';c.fillRect(18,145,146,3);c.fillRect(18,164,117,3);
  c.strokeStyle='#417382';c.lineWidth=6;c.beginPath();c.moveTo(231,163);c.lineTo(269,115);c.lineTo(319,114);c.lineTo(344,49);c.stroke();
  for(const [x,y] of [[231,163],[269,115],[344,49]]){
    c.fillStyle='#c07639';c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fill();
  }
  c.fillStyle='#aba18c';c.fillRect(188,0,3,208);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}

function makeStationTicketScreen() {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=222;
  const c=canvas.getContext('2d');if(!c)return null;
  const light=c.createLinearGradient(0,0,256,222);
  light.addColorStop(0,'#c8f8f9');light.addColorStop(.43,'#61d5e0');light.addColorStop(1,'#168294');
  c.fillStyle=light;c.fillRect(0,0,256,222);
  c.fillStyle='#0b4a5e';c.fillRect(13,13,230,196);
  c.fillStyle='#167284';c.fillRect(22,22,212,178);
  c.fillStyle='#ffd891';c.fillRect(72,52,112,64);
  c.fillStyle='#167284';
  for(const x of [72,184]){c.beginPath();c.arc(x,84,10,0,Math.PI*2);c.fill();}
  c.strokeStyle='#ae7443';c.setLineDash([5,5]);c.lineWidth=3;c.beginPath();c.moveTo(151,56);c.lineTo(151,112);c.stroke();c.setLineDash([]);
  c.font='bold 32px sans-serif';c.textAlign='center';c.fillStyle='#fff6dd';c.fillText('記念きっぷ',128,164);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
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
  const box = (name, size, pos, material, decorative = false, parent = group) => {
    const mesh = addBox(parent, size, pos, material);
    mesh.name = `sky-station-${name}`;
    if (decorative) mesh.userData.nonCollidable = true;
    return mesh;
  };
  const labelTexture = (text, bg) => {
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
    return texture;
  };
  const sign = (name, text, pos, size, rotationY = 0, bg = '#10354c', backText = null, parent = group) => {
    const texture = labelTexture(text, bg);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture || null, color: texture ? 0xffffff : 0xffedbd, side: THREE.FrontSide, toneMapped: false }));
    mesh.name = `sky-station-sign-${name}`; mesh.position.set(...pos); mesh.rotation.y = rotationY;
    mesh.userData.nonCollidable = true; mesh.userData.text = text; parent.add(mesh);
    const rearTexture = backText ? labelTexture(backText, bg) : null;
    const back = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ map: rearTexture || null, color: rearTexture ? 0xffffff : bg, side: backText ? THREE.FrontSide : THREE.BackSide, toneMapped: false }));
    back.name = `sky-station-sign-${name}-back`; back.position.copy(mesh.position); back.rotation.copy(mesh.rotation);
    // Separate faces have real depth; rear text is upright rather than mirrored.
    back.position.add(new THREE.Vector3(0, 0, -.08).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY));
    if (backText) { back.rotation.y += Math.PI; back.userData.text = backText; }
    back.userData.nonCollidable = true; parent.add(back);
    return mesh;
  };

  // Real separated walls: no solid building-wide box behind either doorway.
  box('wall-east', [2, 26, 54], [42, 20.3, -2], stone);
  box('wall-rear', [86, 26, 2], [0, 20.3, -28], stone);

  // Keep the closed entrance in the open rear yard, clear of the station's
  // narrow perimeter landing and the railway on the other side.
  const passage = new THREE.Group();
  passage.name = 'sky-station-old-passage';
  passage.position.set(64, 0, -28);
  passage.rotation.y = -Math.PI / 2;
  group.add(passage);
  const passageBox = (name, size, pos, material, decorative = false) =>
    box(`old-passage-${name}`, size, pos, material, decorative, passage);
  const passageSteel = new THREE.MeshStandardMaterial({ color: 0x38545d, roughness: .84, metalness: .2 });
  const passageIron = new THREE.MeshStandardMaterial({ color: 0x383632, roughness: .72, metalness: .38 });
  const passageBronze = new THREE.MeshStandardMaterial({ color: 0xa48654, roughness: .62, metalness: .49 });
  // The closed façade keeps its original silhouette. Behind it there is now
  // an actual hollow corridor for the rescue, with the masonry on both sides.
  for(const side of [-1,1])passageBox('stonework-'+side,[1.35,20,10],[side*7.675,10,5],stone);
  passageBox('stonework-top',[14,1.6,10],[0,19.2,5],stone);
  const passageRoof = passageBox('roof', [17.4, 1.3, 11.2], [0, 20.4, 4.75], stoneLight);
  passageRoof.userData.physicsCeiling = true;
  passageRoof.userData.walkableSurface = true;
  passageBox('door', [14, 18.4, 1.05], [0, 9.2, -.66], passageSteel);
  for (const side of [-1, 1]) {
    passageBox(`jamb-${side}`, [1.45, 18.8, 1.8], [side * 7.62, 9.4, -1.03], darkStone, true);
    passageBox(`inset-${side}`, [5.9, 14.9, .22], [side * 3.38, 9.15, -1.19], passageIron, true);
    passageBox(`panel-${side}`, [5.46, 14.43, .21], [side * 3.38, 9.15, -1.28], passageSteel, true);
    for (const y of [2.5, 15.85]) {
      passageBox(`hinge-${side}-${y}`, [2.9, .78, .4], [side * 6.14, y, -1.54], passageBronze, true);
    }
  }
  passageBox('lintel', [16.7, 1.7, 1.96], [0, 19.1, -.99], darkStone, true);
  passageBox('seam', [.23, 18, .18], [0, 9.2, -1.25], passageIron, true);
  passageBox('latch', [5.2, .75, .53], [0, 8.2, -1.65], passageBronze, true);
  for (const x of [-1.95, 1.95]) {
    passageBox(`latch-keeper-${x}`, [.84, 1.55, .5], [x, 8.2, -1.89], passageIron, true);
  }
  sign('old-passage', '旧連絡通路\n閉鎖中', [0, 13, -1.72], [12.1, 3.45], Math.PI, '#2c3d42', null, passage);
  const passageLeaf=new THREE.Group();passageLeaf.name='old-passage-leaf';
  passageLeaf.position.set(-6.94,0,-.66);
  const leaves=passage.children.filter(mesh=>/^sky-station-(old-passage-(door|inset|panel|hinge|seam|latch)|sign-old-passage)/.test(mesh.name));
  passage.add(passageLeaf);
  for(const mesh of leaves){mesh.position.sub(passageLeaf.position);passageLeaf.add(mesh);}
  const insideLatch=passageBox('inside-latch',[2.45,.36,.52],[.04,4.7,.07],passageBronze,true);
  insideLatch.position.sub(passageLeaf.position);passageLeaf.add(insideLatch);
  passage.userData.leaf=passageLeaf;
  passage.userData.rear=passageBox('rear-grate',[13.8,18.25,.30],[0,9.15,9.8],passageIron);

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

  // Two retracting gate lanes, wide enough for the complete character.
  [-22, 0, 22].forEach((z, i) => {
    box(`ticket-gate-${i}`, [10, 7.5, 3.6], [-20, 11.05, z], metal);
    box(`ticket-gate-top-${i}`, [10.4, .5, 4], [-20, 15.05, z], blue);
    box(`ticket-reader-${i}`, [2.4, .35, 2.5], [-16.8, 15.45, z], green, true);
    box(`ticket-slot-${i}`, [.25, .6, 1.7], [-14.9, 12.2, z], screen, true);
  });
  const gatePanel = new THREE.MeshStandardMaterial({color:0x244c68, metalness:.22, roughness:.48});
  const gateStripe = new THREE.MeshStandardMaterial({color:0xffca77, emissive:0x9b5814, emissiveIntensity:.48, roughness:.4});
  station.userData.ticketLanes = [-11,11].map(z=>{
    const lane={z,openBy:0,phase:0,leaves:[]};
    for(const side of [-1,1]){
      const leaf=new THREE.Group();leaf.position.set(-19.4,7.31,z+side*9.2);
      group.add(leaf);
      const plate=new THREE.Mesh(new THREE.BoxGeometry(.74,5.9,9.2),gatePanel);
      plate.position.set(0,2.95,-side*4.6);
      plate.name='sky-station-ticket-gate-leaf';
      plate.userData.stationGate={isOpen:()=>lane.phase>=.94};
      leaf.add(plate);
      const edge=new THREE.Mesh(new THREE.BoxGeometry(.82,.45,9.05),gateStripe);
      edge.position.set(0,5.69,-side*4.6);edge.userData.nonCollidable=true;leaf.add(edge);
      lane.leaves.push(leaf);
    }
    return lane;
  });
  // Hang beyond the entrance jambs so the whole board is visible from the hall.
  // The opposite face reverses the arrow to keep pointing towards the same platform.
  sign('gates', '改札口　← ホーム', [-21, 26.5, -3], [34, 6], 0, '#10354c', '改札口　ホーム →');
  [-34, -8].forEach((x, i) => box(`gate-sign-hanger-${i}`, [.4, 2.2, .4], [x, 30.65, -3], gold, true));
  sign('exit', '出口　駅前広場', [0, 26, 22.8], [21, 4], Math.PI);

  // Ticket machines face the concourse, with screens, fare buttons and tray.
  const displayInk = new THREE.MeshStandardMaterial({color:0xb5f8ff,emissive:0x54eafb,emissiveIntensity:.78,roughness:.36});
  const ticketLight = new THREE.MeshStandardMaterial({color:0x9ef5bc,emissive:0x49d88d,emissiveIntensity:1.25,roughness:.36});
  const ticketScreen=makeStationTicketScreen();
  for (const [i,z] of [-4,7].entries()) {
    const face=31.86;
    box('ticket-machine-'+i, [6, 15, 8], [35, 14.8, z], blue);
    box('ticket-display-frame-'+i,[.45,5.85,6.25],[31.92,18.6,z],metal,true);
    box('ticket-machine-screen-'+i,[.25,4.68,5.36],[face-.15,18.6,z],displayInk,true);
    if(ticketScreen){
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(5.29,4.6),new THREE.MeshBasicMaterial({map:ticketScreen,toneMapped:false}));
      panel.name='sky-station-ticket-display-label-'+i;
      panel.position.set(face-.291,18.6,z);
      panel.rotation.y=-Math.PI/2;panel.userData.nonCollidable=true;group.add(panel);
    }
    box('ticket-ready-'+i,[.36,.22,5.3],[face-.29,15.93,z],ticketLight,true);
    for(let row=0;row<2;row++)for(let col=0;col<3;col++)box('ticket-button-'+i+'-'+row+'-'+col,[.3,.76,.9],[31.7,14-row*1.25,z-1.7+col*1.7],row===1&&col===1?ticketLight:white,true);
    box('ticket-output-'+i,[.24,1.42,4.9],[face-.13,11.4,z],screen,true);
    box('ticket-tray-'+i,[1.5,.42,4.5],[31.5,10.6,z],metal);
  }
  sign('tickets', '記念きっぷ', [31.4, 24, 1.5], [18, 3.7], -Math.PI / 2);
  // Staff counter and timetable, positioned away from both walk-through lanes.
  box('information-counter', [20, 8, 7], [25, 11.3, 18], wood);
  box('information-counter-top', [21, .6, 8], [25, 15.6, 18], stoneLight);
  const leaflet = new THREE.MeshStandardMaterial({ color: 0xf9e5b6, roughness: .92 });
  box('information-leaflet-tray', [4.6, .25, 3], [18.9, 16.02, 16.7], wood, true);
  for (let i = 0; i < 3; i++) {
    box('information-leaflet-' + i, [1.05, .12, 2.25], [17.65 + i * 1.22, 16.19, 16.7], i === 1 ? blue : leaflet, true);
  }
  const guideBase=box('information-open-guide', [8.4, .25, 4.6], [27, 16.03, 16.9], blue, true);
  guideBase.rotation.y=-.15;
  const guideCover = makeStationBrochureTexture();
  if (guideCover) {
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(8.14, 4.4),
      new THREE.MeshBasicMaterial({ map: guideCover, toneMapped: false }));
    cover.name = 'sky-station-information-guide-cover';
    cover.userData.nonCollidable = true;
    cover.position.set(27, 16.172, 16.9);
    cover.rotation.set(-Math.PI/2,0,Math.PI+.15);
    group.add(cover);
  }
  [12, 25].forEach((x, i) => {
    const seat = box(`waiting-seat-${i}`, [12, 1.2, 7.2], [x, 11.4, -17.9], wood);
    seat.userData.walkableSurface = true;
    seat.userData.physicsSource = 'sky-station-bench';
    seat.userData.physicsSurfaceId = 'waiting-seat-' + i;
    box(`waiting-back-${i}`, [12, 5, 1], [x, 14, -21.5], wood);
    [-4, 4].forEach(dx => box(`waiting-leg-${i}-${dx}`, [1, 3.6, 3], [x + dx, 9.1, -19], metal));
  });
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

const smooth=(a,b,t)=>THREE.MathUtils.smoothstep(t,a,b);
const mix=THREE.MathUtils.lerp;
const v=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const SKY_RESCUE_ENTRY=Object.freeze([78,0,-52]);
export const SKY_RESCUE_EXIT=Object.freeze([86,0,-28]);
export const SKY_RESCUE_EXIT_HEADING=Math.PI;
export const SKY_RESCUE_SECONDS=79;
const skyRescueDialogue=[
 [10.9,12.8,'バルティア「……ごめんね」'],
 [17.0,22.2,'運転士「セハルネは、空駅の裏の足場に入った。あの雲が空駅にかかったら、帰りの足場が持たない」'],
 [22.7,24.7,'住民「迎えに行けないの？」'],
 [25.0,29.3,'運転士「捜しに来た人には駅で待つように伝えてくれって。……そう言って行った」'],
 [31.9,33.8,'子「……帰ってきて」'],
 [36.0,37.3,'バルティア「ごめんね……」'],
 [37.45,38.4,'セハルネ「バルティア！」'],
 [44.4,47.6,'バルティア「……駅へ戻る通路だ。あの壁の中にある」'],
 [73.7,77.2,'運転士「二人とも無事だよ。空駅に戻った」'],
];
export function skyRescueFrame(seconds){
 const t=Math.max(0,Math.min(SKY_RESCUE_SECONDS,seconds));
 const part=t<14.7?'witness':t<34.8?'town-wait':t<44?'catch':t<56?'board':t<66.7?'passage':t<71?'safe-yard':t<77.7?'town-return':'handoff';
 return {t,part,line:skyRescueDialogue.find(([a,b])=>t>=a&&t<b)?.[2]??'',done:t>=SKY_RESCUE_SECONDS};
}

export function addSkyStationInspectionWorks(station){
 const root=new THREE.Group();root.name='rain-inspection-platform';station.add(root);
 const solid=new THREE.BoxGeometry(1,1,1);
 const standard=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.84,...options});
 const timber=standard(0x776451),dry=[timber,standard(0x8d7960),standard(0x695b4b)];
 const iron=standard(0x2c4147,{metalness:.34}),brass=standard(0xad8754,{metalness:.45,roughness:.43});
 const stone=standard(0x66727b),sea=standard(0x335e71,{roughness:.45}),basin=standard(0x65999d,{roughness:.27});
 const box=(parent,name,x,y,z,w,h,d,material,contact='solid')=>{
  const mesh=new THREE.Mesh(solid,material);mesh.name=name;mesh.position.set(x,y,z);mesh.scale.set(w,h,d);
  mesh.receiveShadow=true;mesh.castShadow=w<85&&d<85;
  mesh.userData.nonCollidable=contact==='visual';
  mesh.userData.walkableSurface=contact==='deck'||contact==='roof';
  mesh.userData.physicsCeiling=mesh.userData.walkableSurface&&y-h/2>0;
  parent.add(mesh);return mesh;
 };
 function ramp(parent,x0,y0,x1,y1,z,width){
  const angle=Math.atan2(y1-y0,x1-x0),thick=.82,length=Math.hypot(y1-y0,x1-x0);
  const deck=box(parent,'graded-inspection-deck',(x0+x1)/2+thick/2*Math.sin(angle),(y0+y1)/2-thick/2*Math.cos(angle),z,length,thick,width,timber,'visual');
  deck.rotation.z=angle;return deck;
 }
 function decking(parent,min,max,top,z,width){
  const deckBaseY=top+parent.position.y;
  const n=Math.ceil((max-min)/1.75),step=(max-min)/n;
  const floor=box(parent,'inspection-deck',(min+max)/2,top-.42,z,max-min,.84,width,timber,'deck');
  // The plank finish and its continuous physical deck have the same top.
  // Disable rendering of the coincident base faces to avoid z-fighting.
  floor.layers.disable(0);
  floor.userData.physicsCeiling=deckBaseY>.84;
  for(let i=0;i<n;i++)box(parent,'inspection-plank',min+step*(i+.5),top-.42,z,step,.84,width,dry[i%3],'visual');
 }
 function fence(x0,x1,y,z){
  box(root,'inspection-rail',(x0+x1)/2,y+2.3,z,x1-x0,.3,.34,iron);
  for(let x=x0;x<=x1+.01;x+=(x1-x0)/4)box(root,'inspection-stanchion',x,y+1.13,z,.44,2.55,.46,iron);
 }
 for(const slope of SKY_INSPECTION_RAMPS){
  ramp(root,slope.lowAt,slope.lowY,slope.highAt,slope.highY,(slope.minZ+slope.maxZ)/2,slope.maxZ-slope.minZ);
 }
 const collapse=new THREE.Group();collapse.position.set(110.8,14,-52);root.add(collapse);
 decking(collapse,0,13.2,0,0,15.6);
 decking(root,124,153,14,-52,15.6);
 fence(124,153,14,-44.2);
 fence(133,153,14,-59.8);
 const gate=new THREE.Group();gate.name='inspection-entry-gate';gate.position.set(84,0,-52);root.add(gate);
 for(const z of [-7.7,7.7])box(root,'approach-post',84,2.0,-52+z,.68,4,.68,iron);
 const beam=box(gate,'closed-inspection-entry',0,2.05,0,1.25,2.6,15.4,iron);
 const sign=box(gate,'inspection-sign',-.67,2.27,0,.10,1.05,9.4,brass);
 if(typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=384;c.height=64;
  const ctx=c.getContext('2d');ctx.fillStyle='#344952';ctx.fillRect(0,0,384,64);
  ctx.fillStyle='#ffeecc';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('空駅 点検路',192,33);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(9,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)}));
  label.position.set(sign.position.x-.08,2.27,0);label.rotation.y=-Math.PI/2;label.userData.nonCollidable=true;gate.add(label);
 }
 decking(root,108,161,5,-76,29);
 fence(108,143,5,-62);
 for(const [x,z] of [[128,-51],[149,-51],[113,-78],[153,-80]]){
  const top=z>-60?13.55:4.55;
  box(root,'rivet-support',x,(top-11)/2,z,1.4,top+11,1.4,iron);
 }
 // This pillar is on the lower deck and carries the edge of the upper frame.
 box(root,'catch-brace',127.1,9.0,-89.25,1.6,8.2,1.6,iron);
 decking(root,46,56,0,-74,15);decking(root,46,55,0,-52,29);
 const board=new THREE.Group();board.position.set(103.5,5,-74);root.add(board);
 box(board,'gap-board',0,-.39,0,10,.78,10.7,timber,'deck').userData.physicsCeiling=true;
 for(const x of [-4.6,4.6])box(board,'board-grip',x,-.18,0,.48,.49,10.6,iron);
 for(const [x,z] of [[-4.86,5.38],[4.86,-5.38]]){
  box(board,'board-clamp-post',x,1.9,z,.44,3.8,.5,iron);
  box(board,'board-clamp-grip',x,3.8,z,.68,.36,1.28,brass);
 }
 // An open maintenance tunnel with a bend. Leave its camera side clear so
 // the board and the ordered crossing can be seen from the same side.
 box(root,'return-tunnel-wall',74,8.4,-83,52,16.8,1.5,stone);
 box(root,'return-tunnel-roof',73,17.3,-76,52,.95,15.8,stone,'roof');
 box(root,'return-tunnel-wall',40.3,5.9,-52,1.35,11.8,60.9,stone);
 box(root,'return-tunnel-roof',50.7,12.5,-52,11.5,.85,59.9,stone,'roof');
 const diverter=new THREE.Group();diverter.position.set(156,5,-65.5);root.add(diverter);
 box(diverter,'control-plinth',0,1.6,0,4.3,3.2,2.15,iron);
 const vanes=new THREE.Group();vanes.position.set(0,3.3,0);diverter.add(vanes);
 for(const z of [-.68,0,.68]){
  box(vanes,'cloud-vane',0,.73,z,4.65,1.48,.16,brass);
  box(vanes,'cloud-vane-rim',-1.88,.73,z-.11,.13,1.5,.1,iron);
 }
 box(diverter,'diverter-lever-housing',-2.04,3.42,-2.04,.75,.53,3.42,iron,'visual');
 const lever=new THREE.Group();lever.position.set(-2.14,3.25,-3.8);diverter.add(lever);
 const handle=box(lever,'diverter-lock',0,0,-.48,.34,.36,1.6,brass,'visual');
 const tool=box(root,'fallen-spanner',150,5.22,-89,.35,.4,2.05,brass,'visual');
 const far=new THREE.Group();far.name='coastal-catchment';far.visible=false;root.add(far);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(2400,1800),sea);
 water.position.set(112,-88,-540);water.rotation.x=-Math.PI/2;water.userData.nonCollidable=true;far.add(water);
 const cape=new THREE.Shape();
 cape.moveTo(-310,-480);cape.lineTo(476,-450);cape.lineTo(437,-290);cape.lineTo(300,-263);
 cape.quadraticCurveTo(246,-310,181,-267);cape.quadraticCurveTo(134,-232,84,-243);
 cape.quadraticCurveTo(32,-254,-18,-204);cape.quadraticCurveTo(-103,-225,-310,-168);cape.closePath();
 const land=new THREE.Mesh(new THREE.ShapeGeometry(cape,26),standard(0x6b806c,{roughness:1,side:THREE.DoubleSide}));
 land.rotation.x=Math.PI/2;land.position.y=-86.8;land.userData.nonCollidable=true;far.add(land);
 box(far,'harbour-breakwater',105,-85.5,-244,112,1.2,2.5,stone,'visual');
 box(far,'catchment-stone-sill',111,-86.4,-227,23,2,14,stone,'visual');
 box(far,'catchment-water',111,-85.37,-227,20,.06,11,basin,'visual');
 for(const i of [0,1,2,3])box(far,'harbour-channel',93+i*12,-87.25,-219,7,.25,1.5,stone,'visual');
 const bank=new THREE.Group();bank.visible=false;root.add(bank);
 const puff=new THREE.IcosahedronGeometry(1,2);
 const cloudInk=standard(0xabb9c8,{roughness:1});
 const clouds=Array.from({length:14},(_,i)=>{
  const row=new THREE.Group();bank.add(row);
  for(let j=0;j<4;j++){
   const cloud=new THREE.Mesh(puff,cloudInk);cloud.userData.nonCollidable=true;cloud.position.set(j*6-9,(j%2)*1.1,Math.sin(i*1.92+j)*4.6);
   cloud.scale.set(8+Math.sin(j+1)*2,2.7+(i+j)%4*.65,5.5+(j%2)*3.5);row.add(cloud);
  }
  return row;
 });
 const rainGeometry=new THREE.BufferGeometry(),droplets=new Float32Array(96*6);
 rainGeometry.setAttribute('position',new THREE.BufferAttribute(droplets,3));
 const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:0xaed4e7,transparent:true,opacity:.46,depthWrite:false}));
 rain.frustumCulled=false;rain.visible=false;root.add(rain);
 const passage=station.getObjectByName('sky-station-old-passage');
 function pose(t){
  const filming=t>=0;
  beam.visible=true;gate.position.y=filming?-3.6*smooth(.025,.43,t):0;
  collapse.rotation.x=filming?-.85*smooth(34.75,35.65,t):0;
  collapse.position.y=14-(filming?19*smooth(34.95,36.6,t):0);
  vanes.rotation.y=filming?-.72*smooth(6.35,7.45,t):0;
  lever.rotation.x=filming?-.65*smooth(6.1,6.6,t)+.65*smooth(7.6,8.1,t):0;
  handle.visible=true;
  tool.position.y=5.22-(filming?27*smooth(35.35,37.9,t):0);
  tool.rotation.x=filming?4*smooth(35.35,37.9,t):0;
  board.rotation.x=filming?.11*(1-smooth(48.8,50.0,t)):0;
  bank.visible=far.visible=filming&&t<40;
  const turn=filming?smooth(7.1,8.6,t):0;
  for(const [i,row] of clouds.entries()){
   const p=((t*.145+i*.074)%1+1)%1,k=smooth(.30,.82,p)*turn;
   row.position.set(mix(231,67,p)+Math.sin(i*1.7)*8,19+Math.cos(i*1.21)*2,mix(-151,-220,k)+Math.sin(i*1.4)*7);
   row.rotation.y=-.65*k;
  }
  rain.visible=filming&&t>=34.75&&t<65;
  if(rain.visible){
   for(let i=0;i<96;i++){
    const x=108+(i*47%93)*.64,z=-93+(i*23%71)*.48,y=5+((i*13.6-t*32)%27+27)%27,j=i*6;
    droplets.set([x,y,z,x-.46,y-2.65,z-.23],j);
   }
   rainGeometry.attributes.position.needsUpdate=true;
  }
  if(passage){
   passage.userData.rear.visible=!(filming&&t>=56&&t<66.9);
   const open=.28*smooth(59.55,60.5,t)+1.77*smooth(61.25,62.25,t);
   passage.userData.leaf.rotation.y=filming?open*(1-smooth(66.8,70.6,t)):0;
  }
 }
 root.userData.pose=pose;
 station.userData.rainInspection=root;
 pose(-1);
 return root;
}

function inspectionCast(root,makeModel,id,stationScale){
 const model=makeModel(id,{scale:.36/stationScale,baseExpression:false,bodyEmissiveIntensity:.03});
 if(model.userData.soraDama)model.userData.soraDama.visible=false;
 const bounds=new THREE.Box3().setFromObject(model);
 const actor=new THREE.Group();root.add(actor);actor.add(model);
 model.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
 const eyes=(model.userData.faceFeatures??[]).slice(0,2).map(mesh=>({mesh,y:mesh.scale.y}));
 let mouth=null;
 if(eyes.length===2&&model.userData.body){
  const x=(eyes[0].mesh.position.x+eyes[1].mesh.position.x)*.5,y=(eyes[0].mesh.position.y+eyes[1].mesh.position.y)*.5-9;
  model.updateWorldMatrix(true,true);
  const start=model.localToWorld(v(x,y,220)),direction=model.localToWorld(v(x,y,0)).sub(start).normalize();
  const hit=new THREE.Raycaster(start,direction).intersectObject(model.userData.body,false)[0];
  if(hit){
   mouth=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),new THREE.MeshStandardMaterial({color:0x512d29,roughness:.88}));
   mouth.position.copy(model.worldToLocal(hit.point));mouth.position.z+=.26;
   mouth.visible=false;model.add(mouth);
  }
 }
 const feet=(model.userData.feet??[]).map(mesh=>({mesh,y:mesh.position.y,z:mesh.position.z,rx:mesh.rotation.x}));
 const hands=(model.userData.hands??[]).map(mesh=>({mesh,x:mesh.position.x,y:mesh.position.y,z:mesh.position.z}));
 const wings=['left','right'].flatMap((side,index)=>['comet-wing-','comet-wing-vein-'].map(name=>{
  const group=model.getObjectByName(name+side);
  return group&&{group,yaw:group.rotation.y,side:index===0?-1:1};
 })).filter(Boolean);
 return {actor,model,lift:-bounds.min.y,eyes,feet,hands,wings,mouth};
}
function walkPose(cast,track,time,reduced,deckHeight,passageClearance=0){
 const upper=track.findIndex(row=>row[0]>time);
 const i=upper<0?track.length-1:Math.max(1,upper);
 const [a,b]=[track[i-1],track[i]],u=smooth(a[0],b[0],time);
 const p=Array.from({length:5},(_,j)=>mix(a[j+1]??0,b[j+1]??0,u));
 p[1]=deckHeight?.(time,p[0],p[1])??p[1];
 const speed=Math.hypot(a[1]-b[1],a[3]-b[3]);
 const delta=b[4]-a[4];p[3]=a[4]+Math.atan2(Math.sin(delta),Math.cos(delta))*u;
 const stride=reduced?0:smooth(0,.24,u)*(1-smooth(.76,1,u))*Math.min(1,speed*.28);
 cast.actor.position.set(p[0],p[1],p[2]);
 cast.actor.rotation.y=p[3];cast.model.rotation.set(p[4],0,0);
 cast.model.position.y=cast.lift;
 for(const [n,foot] of cast.feet.entries()){
  const phase=time*10+n*Math.PI;
  foot.mesh.position.y=foot.y+Math.max(0,Math.sin(phase))*stride*1.4;
  foot.mesh.position.z=foot.z+Math.cos(phase)*stride*1.5;
  foot.mesh.rotation.x=foot.rx+Math.cos(phase)*stride*.12;
 }
 // Carry hands forward and fold the wings back before entering the narrow passage.
 const handTurn=passageClearance*.52;
 for(const [n,hand] of cast.hands.entries()){
  hand.mesh.position.x=hand.x*Math.cos(handTurn);
  hand.mesh.position.y=hand.y;
  hand.mesh.position.z=hand.z+Math.abs(hand.x)*Math.sin(handTurn)+stride*Math.cos(time*10+n*Math.PI)*.45;
 }
 for(const wing of cast.wings)wing.group.rotation.y=wing.yaw+wing.side*.84*passageClearance;
 for(const eye of cast.eyes)eye.mesh.scale.y=eye.y*(.97-.22*smooth(.91,.99,(time*.39)%1));
 // Feet stay on their supporting surface through slope changes and tilts.
 cast.actor.updateMatrixWorld(true);
 let bottom=Infinity;
 const modelParentInverse=cast.actor.parent.matrixWorld.clone().invert();
 for(const {mesh} of cast.feet){
  const e=new THREE.Matrix4().multiplyMatrices(modelParentInverse,mesh.matrixWorld).elements;
  bottom=Math.min(bottom,e[13]-Math.hypot(e[1],e[5],e[9])*(mesh.geometry.parameters.radius??1));
 }
 if(Number.isFinite(bottom))cast.model.position.y+=p[1]-bottom;
 return p;
}

export function createSkyRescuePlayback(station,{start,heading,makeModel,disposeModel,heroId,baltiaId,guideExit,reduced=false}){
 const stage=station.userData.rainInspection;
 const castRoot=new THREE.Group();castRoot.name='sky-rescue-cast';station.add(castRoot);
 const hero=inspectionCast(castRoot,makeModel,heroId,station.scale.x);
 const baltia=inspectionCast(castRoot,makeModel,baltiaId,station.scale.x);
 const N=Math.PI,W=-Math.PI/2,E=Math.PI/2;
 const rise=x=>(x-84)*14/27;
 const grade=x=>(x-56)*5/43;
 // Time, position above the set's floor, facing, torso lean. Positions are
 // shared by all cameras including either side of the town intercut.
 const h=[
  [0,start.x,start.y,start.z,heading],[.9,80,0,-52,E],[1.7,84,0,-52,E],
  [3.25,97,rise(97),-52,E],[4.8,111,14,-52,E],[6.6,130,14,-52,N],
  [12.6,130,14,-52,N,.12],[34.9,130,14,-52,N,.12],[36.8,130,14,-55,N,.04],
  [37.46,127.8,14,-59.15,N,.14],[38.28,130,5,-69,N,.19],[39.32,133,5,-81,0,.15],
  [40.5,135.23,5,-83.75,.02,.12],[41.3,134.23,5,-83.73,.10,.12],
  [43,134.3,5,-82,.15,.04],[44,134.3,5,-84,.15,.14],
  [49.75,134.3,5,-84,W,.04],[52.05,115.4,5,-74.0,W,.08],[52.9,112.2,5,-72.85,W,.10],
  [55.5,93.5,grade(93.5),-74,W,.03],[57.9,66,grade(66),-74,W],
  [60.0,50,0,-57,0],[63.15,48,0,-46,0],[63.5,47.5,0,-43,0],[64.5,47.5,0,-27.9,E],
  [65.2,59,0,-28,E],[65.95,70,0,-28,E,.08],[66.85,86,0,-28,E],
  [69.2,86,0,-28,E,.135],[71,86,0,-28,E,.08],[77.8,86,0,-28,E,.08],[79,86,0,-28,SKY_RESCUE_EXIT_HEADING],
 ];
 const b=[
  [0,148,5,-73,.03,.105],[5.9,148,5,-72.3,.04,.06],[8.25,147.3,5,-73.2,0,.05],
  [9.9,147,5,-73.3,2.8,-.13],[12.8,147,5,-73.3,2.8,-.05],[34.8,147,5,-73.3,2.8,-.05],
  [35.45,147,5,-76.8,N,.23],[37.4,147.8,5,-89.4,.06,.27],[39.25,147.3,5,-85.9,0,.17],
  [40.5,147.1,5,-83.8,.01,.155],[41.3,146.3,5,-83.9,.08,.14],
  [43,146.2,5,-80.4,.23,.09],[44,146.2,5,-79,.05,.12],
  [45.9,144.9,5,-66.8,0,.085],[48.5,118.2,5,-67,W],[49.7,113.8,5,-74,W],
  [52.1,94.1,grade(94.1),-74,W,.12],[53.5,85,grade(85),-74,W,.09],
  [55.6,65,grade(65),-74,W],[57.54,51.5,0,-61,0],[59.5,49.0,0,-45,0],
  [60.0,47.5,0,-43,0],[60.36,47.65,0,-38.5,0],[60.75,48.05,0,-33,0],[61.16,49.6,0,-27.9,E,.10],[61.74,58.0,0,-28,E,.08],
  [62.8,58.5,0,-28,E,.04],[64.05,70,0,-28,E],[65.15,86,0,-27.7,E],
  [66.7,94,0,-42,0,.045],[68.8,94,0,-42,0,.20],
  // Baltia heads back to his usual station post during the report in town.
  [69.42,104.5,0,-41.2,E,.03],[71,106,0,-13,.05],[73.75,100,0,39,0],
  [75.6,66,0,59,W],[77.35,guideExit.x,0,guideExit.z,guideExit.heading],
  [79,guideExit.x,0,guideExit.z,guideExit.heading],
 ];
 const lens=[
  [0,[62,10,-37],[92,5,-52]],[2.0,[79,10,-33],[99,8,-53]],
  [5.25,[113,29,-31],[139,12,-66]],[6.45,[165,15,-90],[152,10,-69]],
  [7.65,[168,33,-111],[136,20,-176]],[9.15,[162,31,-113],[127,17,-191]],
  [10.3,[165,15,-85],[148,11,-71]],[14.7,[159,21,-88],[135,13,-74]],
  [34.8,[142,24,-36],[130,14,-58]],[36.2,[143,23,-38],[135,12,-66]],
  [37.45,[146,20,-37],[135,9,-71]],[39,[163,15,-62],[140,9,-81]],
  [43.95,[163,14,-62],[137,9,-78]],[47.7,[125,21,-48],[115,8,-74]],
  [55.9,[111,19,-51],[95,6,-74]],[57.1,[70,8.1,-55],[64,5,-73]],
  [59.6,[63,7.8,-48],[49,5,-39]],[61.65,[85,9.1,-14],[67,7,-28]],
  [66.7,[103,11,-19],[82,7,-34]],[71,[106,12,-16],[86,5.5,-36]],
  [77.7,[103,11,-19],[86,6,-34]],[79,[110,13,-14],[88,8,-33]],
 ];
 const aim=v(),eye=v();
 function sample(seconds,filmCamera){
  const frame=skyRescueFrame(seconds),{t}=frame;
  const lower=(x,y)=>Math.min(5,Math.max(0,grade(x)));
  const heroDeck=(s,x,y)=>{
   if(s>=1.7&&s<=4.8){
    const stepOntoDeck=smooth(104,107.4,x)*(1-smooth(109.45,111,x));
    return Math.min(14,Math.max(0,rise(x))+stepOntoDeck);
   }
   return s>=52.9&&s<=60?lower(x,y):y;
  };
  const baltiaDeck=(s,x,y)=>s>=49.7&&s<=57.54?lower(x,y):y;
  const tuck=smooth(59.0,60.05,t)*(1-smooth(64.4,65.45,t));
  const hp=walkPose(hero,h,t,reduced,heroDeck),bp=walkPose(baltia,b,t,reduced,baltiaDeck,tuck);
  stage.userData.pose(t);
  const shout=smooth(37.4,37.57,t)*(1-smooth(38.15,38.43,t));
  if(hero.mouth){hero.mouth.visible=shout>.02;hero.mouth.scale.set(2.1+shout*.4,.33+shout*2,.62);}
  const speaking=frame.line.startsWith('バルティア');
  if(baltia.mouth){
   baltia.mouth.visible=speaking;
   baltia.mouth.scale.set(2.16,.44+(reduced?0:(.5+.5*Math.sin(t*12))*.78),.48);
  }
  // Palms stay on their respective bodies. The small shared displacement
  // after the grab carries the contact through the slide.
  const touch=smooth(39.25,40.5,t)*(1-smooth(41.7,43,t));
  if(hero.hands[1])hero.hands[1].mesh.position.y+=touch*1.7;
  if(baltia.hands[0])baltia.hands[0].mesh.position.y+=touch*1.2;
  let i=lens.findIndex(row=>row[0]>t);if(i<0)i=lens.length-1;i=Math.max(1,i);
  const [a,z]=[lens[i-1],lens[i]],u=smooth(a[0],z[0],t);
  eye.fromArray(a[1]).lerp(v(...z[1]),u);aim.fromArray(a[2]).lerp(v(...z[2]),u);
  if(filmCamera.aspect<1.0)eye.lerp(aim,-.42*(1-filmCamera.aspect));
  filmCamera.position.copy(station.localToWorld(eye));filmCamera.lookAt(station.localToWorld(aim));
  return {...frame,hero:hp,baltia:bp};
 }
 function dispose(){
  stage.userData.pose(-1);castRoot.removeFromParent();
  disposeModel(hero.model);disposeModel(baltia.model);
 }
 return {sample,dispose,actors:[hero,baltia]};
}

export const SKY_DELIVERY_FAREWELL_SECONDS = 6.7;

export function createSkyDeliveryFarewell(station,{makeModel,disposeModel,baltiaId,reduced=false}){
 const root=new THREE.Group();root.name='sky-delivery-farewell-cast';station.add(root);
 const baltia=inspectionCast(root,makeModel,baltiaId,station.scale.x);
 const east=Math.PI/2;
 // Stay on the broad lower deck. No passage across the plank used in the rescue.
 const track=[
  [0,117,5,-74,east,.02],[4.4,147,5,-74,east,.025],
  [5.4,147,5,-74,east,.082],[SKY_DELIVERY_FAREWELL_SECONDS,147,5,-74,east,.042],
 ];
 const eye=v(),aim=v();
 function sample(seconds,camera){
  const time=THREE.MathUtils.clamp(seconds,0,SKY_DELIVERY_FAREWELL_SECONDS);
  const pose=walkPose(baltia,track,time,reduced);
  const stop=smooth(4.1,5.0,time);
  const x=pose[0],support=pose[1];
  // Keep the camera on the open side of the roof and clear of its uprights.
  eye.set(x+21-stop*7,support+10.6-stop*.8,-63+stop);
  aim.set(x+1,support+4.2,-74);
  if(camera.aspect<1)eye.lerp(aim,-(1-camera.aspect)*.58);
  camera.position.copy(station.localToWorld(eye));
  camera.lookAt(station.localToWorld(aim));
  return pose;
 }
 function dispose(){root.removeFromParent();disposeModel(baltia.model);}
 return {sample,dispose,model:baltia.model};
}

const SIT_SECONDS = .66;
const TURN_AND_STEP = .37;
const ease = (a, b, t) => THREE.MathUtils.smoothstep(t, a, b);

function localPoint(station, x, y, z) {
  return station.localToWorld(new THREE.Vector3(x, y, z));
}

export function readSkyStationActivities(station) {
  if (!station) return [];
  const heading = station.getWorldQuaternion(new THREE.Quaternion());
  const find = name => station.getObjectByName('sky-station-' + name);
  const meshList = names => names.map(find).filter(Boolean);
  const entries = [];
  const add = (kind, id, worldPoint, outward, meshes, extra = {}) => {
    const normal = new THREE.Vector3(...outward).applyQuaternion(heading);
    entries.push({kind, id, meshes, heading, stand: worldPoint, normal, ...extra});
  };
  ['waiting-seat-0', 'waiting-seat-1', 'plaza-seat'].forEach((id, index) => {
    const inside = index < 2;
    const seat = find(id);
    const back = find(id.replace('seat', 'back'));
    if (!seat || !back) return;
    const supports = inside
      ? [-4, 4].map(x => 'waiting-leg-' + index + '-' + x)
      : [-8, 8].flatMap(x => ['plaza-leg-' + x, 'plaza-foot-' + x]);
    const meshes = [seat, back, ...meshList(supports)];
    const front = seat.position.z + seat.geometry.parameters.depth / 2;
    const backFace = back.position.z + back.geometry.parameters.depth / 2;
    const ground=inside?7.3:0;
    const stands=[[0,6.5],[0,8.5],[-2.5,8.5],[2.5,8.5],[0,10.5]].map(([dx,dz])=>localPoint(station,seat.position.x+dx,ground,front+dz));
    const birdPerch=new THREE.Vector3(seat.position.x+(index===1?5:-5),ground+.06,front+4.1);
    add('bench',id,stands[0],[0,0,1],meshes,{
      stands,birdPerch,inside,
      seat: localPoint(station,seat.position.x,seat.position.y + seat.geometry.parameters.height / 2,backFace + 4.9),
    });
  });
  const counter = find('information-counter');
  if (counter) {
    add('info','information',localPoint(station,25,7.3,7.4),[0,0,-1],meshList([
      'information-counter', 'information-counter-top', 'information-open-guide',
      'information-guide-cover', 'information-leaflet-tray',
      'information-leaflet-0', 'information-leaflet-1', 'information-leaflet-2',
    ]));
  }
  for(let i=0;i<2;i++){
    const machine=find('ticket-machine-'+i);
    if(!machine)continue;
    const z=machine.position.z;
    const buttons=Array.from({length:6},(_,j)=>'ticket-button-'+i+'-'+Math.floor(j/3)+'-'+j%3);
    add('machine','ticket-machine-'+i,localPoint(station,25.2,7.3,z),[-1,0,0],[
      machine,...meshList(['ticket-machine-screen-'+i,'ticket-display-label-'+i,'ticket-display-frame-'+i,'ticket-ready-'+i,'ticket-output-'+i,'ticket-tray-'+i,...buttons]),
    ],{z,reach:18});
  }
  for(const [i,lane] of (station.userData.ticketLanes??[]).entries()){
    const readers=[i,i+1].flatMap(n=>['ticket-gate-','ticket-gate-top-','ticket-reader-','ticket-slot-'].map(name=>name+n));
    add('gate','ticket-gate-'+i,localPoint(station,-8.8,7.3,lane.z),[1,0,0],
      [...meshList(readers),...lane.leaves.map(leaf=>leaf.children[0])],{lane,z:lane.z,reach:23});
  }
  return entries;
}

function stationReach(activity,actor,groundY){
  if(Math.abs(groundY-activity.stand.y)>2)return Infinity;
  const dx=actor.x-activity.stand.x,dz=actor.z-activity.stand.z;
  if(dx*activity.normal.x+dz*activity.normal.z < -6)return Infinity;
  const distance=Math.hypot(dx,dz);
  return distance<(activity.reach??23)?distance:Infinity;
}

export function nearbySkyStationActivity(activities, actor, groundY, heading) {
  let closest = null, best = Infinity;
  for (const activity of activities) {
    const distance=stationReach(activity,actor,groundY);
    const facing=Number.isFinite(heading) && activity.kind!=='bench'
      ? (1+Math.sin(heading)*activity.normal.x+Math.cos(heading)*activity.normal.z)*Math.min(8,distance*.7) : 0;
    if(distance+facing>=best)continue;
    closest=activity;
    best=distance+facing;
  }
  return closest;
}

function readPose(character) {
  return {
    position: character.position.clone(),
    heading: character.quaternion.clone(),
    limbs: [...character.userData.walkRig.feet, ...character.userData.walkRig.hands]
      .map(({part}) => ({part, position: part.position.clone(), rotation: part.quaternion.clone()})),
  };
}

function applyPose(character, from, to, placement, turning, tucking, lift = placement) {
  character.position.lerpVectors(from.position, to.position, placement);
  character.position.y = THREE.MathUtils.lerp(from.position.y, to.position.y, lift);
  character.quaternion.slerpQuaternions(from.heading, to.heading, turning);
  for (let i = 0; i < to.limbs.length; i++) {
    const a = from.limbs[i], b = to.limbs[i];
    b.part.position.lerpVectors(a.position, b.position, tucking);
    b.part.quaternion.slerpQuaternions(a.rotation, b.rotation, tucking);
  }
}

export function createSkyStationActivities({button, label, guide, canvas, station, camera, character, state,
  allowed, clearInput, walk, isClear, ticketPreview=null, notify=()=>{},
  trainAvailable=()=>false, boardTrain=()=>{}}) {
  const trainActivity = {kind:'train'};
  let owner = null, options = [], rest = null, pointer = null, sights = null;
  let ticket = null, noticeTime = 0, offeredActivity = null;
  const readerTone = createStationReaderTone();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function reset() {
    sights?.dispose();
    sights = null;
    if (ticketPreview) ticketPreview.hidden = true;
    noticeTime = 0;
    owner = null;
    offeredActivity = null;
    options = [];
    rest = null;
    pointer = null;
    button.hidden = true;
    if (guide.open) guide.close();
  }
  function nearby() {
    const current = station();
    if (current !== owner) {
      reset();
      owner = current;
      options = readSkyStationActivities(current);
      if (current) sights = createStationSightGags(current);
    }
    return allowed() ? nearbySkyStationActivity(options, state.position, state.groundY, state.heading) : null;
  }
  function stand() {
    if (rest?.phase !== 'seated') return false;
    rest.phase = 'rising';
    rest.time = 0;
    return true;
  }
  function activate(activity = nearby()) {
    if (!activity || !allowed()) return false;
    if (rest) return stand();
    if (activity === trainActivity) {
      if (!trainAvailable()) return false;
      void boardTrain();
      return true;
    }
    if (activity.kind === 'info') {
      clearInput();
      guide.showModal();
      return true;
    }
    if (activity.kind === 'machine') {
      if (sights?.printing) return false;
      ticket = skyStationTicket();
      sights?.print(activity.z, ticket);
      noticeTime = 4;
      if (ticketPreview) {
        ticketPreview.dataset.sky = ticket.phase;
        ticketPreview.querySelector('strong').textContent = ticket.label;
        ticketPreview.hidden = false;
      }
      return true;
    }
    if (activity.kind === 'gate') {
      if (!ticket) {
        notify('券売機で記念きっぷを受け取ろう。');
        return true;
      }
      if(!sights?.openGate(activity.lane))return false;
      ticket = null;
      if (ticketPreview) ticketPreview.hidden = true;
      sights.puff(activity.z);
      readerTone();
      return true;
    }
    const actor = character();
    if (!actor?.userData.walkRig?.feet.length) return false;
    const standPoint=activity.stands.find(isClear);
    if(!standPoint){notify('ベンチの正面に回ると座れます。');return false;}
    activity={...activity,stand:standPoint};
    clearInput();
    const start = readPose(actor), startWalk = state.position.clone();
    actor.userData.walkRig.footBlend = 0;
    walk(0, false);
    actor.position.set(activity.stand.x, start.position.y + activity.stand.y - state.groundY, activity.stand.z);
    actor.quaternion.copy(activity.heading);
    const standing = readPose(actor);
    positionCoastCrewCharacter(actor, {board: {q: activity.heading.toArray()}, point: activity.seat.toArray()});
    const sitting = readPose(actor);
    applyPose(actor, start, start, 0, 0, 0);
    const distance = Math.hypot(activity.stand.x - startWalk.x, activity.stand.z - startWalk.z);
    const approach = distance < 1 ? 0 : Math.max(.18, distance / 55);
    const toBench = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      Math.atan2(activity.stand.x - startWalk.x, activity.stand.z - startWalk.z));
    rest = {activity, startWalk, start, standing, sitting, approach, toBench, phase: 'sitting', time: 0};
    return true;
  }
  function update(delta=0) {
    const activity = allowed() ? (rest?.activity ?? nearby() ?? (trainAvailable() ? trainActivity : null)) : null;
    offeredActivity=activity;
    if (owner && station() === owner) {
      sights?.tick(delta,state.position,rest?.phase==='seated'?rest.activity:null);
      if (noticeTime>0) {
        noticeTime-=delta;
        if (noticeTime<=0 && ticketPreview) ticketPreview.hidden=true;
      }
    }
    const text = rest ? '立ち上がる' : ({
      train: '街行きの列車に乗る',
      info: '駅の案内を読む',
      bench: 'ベンチに座る',
      machine: '記念きっぷを受け取る',
      gate: ticket ? 'きっぷを入れる' : '改札を調べる',
    })[activity?.kind];
    const visible = !!activity;
    if (button.hidden === visible) button.hidden = !visible;
    const disabled = (!!rest && rest.phase !== 'seated') || (activity?.kind==='machine' && sights?.printing) || false;
    if (button.disabled !== disabled) button.disabled = disabled;
    if (visible && label.textContent !== text) label.textContent = text;
  }
  button.addEventListener('click', () => {if(offeredActivity)activate(offeredActivity);});
  guide.addEventListener('close', clearInput);
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !allowed()) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
  });
  canvas.addEventListener('pointercancel', () => { pointer = null; });
  canvas.addEventListener('pointerup', event => {
    const start = pointer;
    if (start?.id !== event.pointerId) return;
    pointer = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7 || !allowed()) return;
    if (!nearby() && !rest) return;
    if (!owner) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    ndc.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(ndc, camera());
    const hit = ray.intersectObject(owner, true).find(({object}) => {
      for (let target = object; target; target = target.parent) {
        if (!target.visible) return false;
        if (target === owner) return true;
      }
      return false;
    });
    const target = rest ? (rest.activity.meshes.includes(hit?.object) ? rest.activity : null)
      : options.find(activity => activity.meshes.includes(hit?.object)
        && Number.isFinite(stationReach(activity, state.position, state.groundY)));
    if (target) activate(target);
  });
  return {
    get reading() { return guide.open; },
    get resting() { return !!rest; },
    get seated() { return rest?.phase === 'seated'; },
    stand, reset, update,
    useKey() { return !button.hidden && !button.disabled && !!offeredActivity && activate(offeredActivity); },
    step(delta) {
      if (!rest) return false;
      const actor = character(), {activity, phase, startWalk, start, standing, sitting, approach, toBench} = rest;
      rest.time += delta;
      if (phase === 'seated') return true;
      if (phase === 'sitting' && rest.time < approach) {
        const fraction = rest.time / approach;
        state.position.lerpVectors(startWalk, activity.stand, fraction);
        state.position.y = 0;
        actor.position.lerpVectors(start.position, standing.position, fraction);
        walk(delta, true);
        actor.quaternion.slerpQuaternions(start.heading, toBench, ease(0,.7,fraction));
        return true;
      }
      const t = THREE.MathUtils.clamp((rest.time - (phase === 'sitting' ? approach : 0)) / (phase === 'sitting' ? SIT_SECONDS : .36), 0, 1);
      if (phase === 'sitting' && t < TURN_AND_STEP) {
        const u = ease(0, TURN_AND_STEP, t);
        if (approach > 0) {
          state.position.set(activity.stand.x, 0, activity.stand.z);
          actor.position.copy(standing.position);
          walk(delta, false);
          actor.quaternion.slerpQuaternions(toBench, standing.heading, u);
        } else {
          applyPose(actor, start, standing, u, u, u);
        }
      } else {
        const settle = phase === 'sitting' ? ease(TURN_AND_STEP, 1, t) : 1 - ease(0, 1, t);
        const slide = ease(.16, 1, settle);
        // Lift and tuck before the body and feet reach the front edge of the seat.
        // Standing up follows the same clear path in reverse.
        const lift = ease(0, .48, settle), tuck = ease(0, .57, settle);
        applyPose(actor, standing, sitting, slide, 1, tuck, lift);
      }
      if (t === 1) {
        state.position.set(activity.stand.x, 0, activity.stand.z);
        state.groundY = activity.stand.y;
        const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(activity.heading);
        state.heading = Math.atan2(facing.x, facing.z);
        if (phase === 'sitting') { rest.phase = 'seated'; rest.time = 0; }
        else rest = null;
      }
      return true;
    },
  };
}


const STATION_TICKET_ART = Object.freeze({
  morning: {label:'朝の空', color:0x8bcbd8},
  day: {label:'昼の空', color:0x55aedd},
  evening: {label:'夕暮れの空', color:0xdf8d72},
  night: {label:'夜の空', color:0x415882},
});

export function skyStationTicket(date=new Date()){
  const {phase}=coastTime(date);
  return {phase,...STATION_TICKET_ART[phase]};
}

function createStationSightGags(station){
  const root=new THREE.Group();
  root.name='sky-station-small-sights';
  station.add(root);
  const dispose=[];
  const geometry=g=>{dispose.push(g);return g;};
  const material=(color,options={})=>{
    const m=new THREE.MeshStandardMaterial({color,roughness:.82,...options});
    dispose.push(m);
    return m;
  };
  const sphere=geometry(new THREE.SphereGeometry(1,12,8));
  function oval(parent,mat,position,scale){
    const mesh=new THREE.Mesh(sphere,mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  const paper=material(0x76bdda,{side:THREE.DoubleSide});
  const ticket=new THREE.Mesh(geometry(new THREE.PlaneGeometry(2.8,1.54)),paper);
  ticket.name='sky-station-souvenir-strip';ticket.rotation.x=-Math.PI/2;ticket.visible=false;root.add(ticket);
  const wool=material(0xffffff,{transparent:true,opacity:1,depthWrite:false,emissive:0x9eb5bf,emissiveIntensity:.22});
  const cloud=new THREE.Group();cloud.name='sky-station-ticket-cloud';cloud.visible=false;root.add(cloud);
  oval(cloud,wool,[0,0,0],[1.9,.91,1.05]);
  oval(cloud,wool,[.25,.52,0],[.94,.99,.91]);
  oval(cloud,wool,[-1.15,.23,.11],[.87,.77,.85]);
  oval(cloud,wool,[1.03,.14,-.14],[.85,.64,.78]);

  const bird=new THREE.Group(),head=new THREE.Group(),wings=[];
  bird.name='sky-station-rail-bird';
  root.add(bird);
  const feathers=material(0xcda770),chest=material(0xf2e7cd);
  const edge=material(0x635b46),eyes=material(0x252725),bill=material(0xc47e32);
  oval(bird,feathers,[0,.79,0],[.88,.67,1.1]);
  oval(bird,chest,[0,.65,.49],[.70,.51,.75]);
  oval(bird,edge,[0,.78,-.91],[.42,.21,1.02]).rotation.x=.19;
  head.position.set(0,1.24,.58);bird.add(head);
  oval(head,feathers,[0,.1,0],[.63,.63,.67]);
  oval(head,chest,[0,-.16,.35],[.49,.31,.37]);
  for(const side of [-1,1]){
    oval(head,eyes,[side*.46,.26,.36],[.09,.10,.09]);
    const wing=new THREE.Group();wing.position.set(side*.59,.83,-.06);bird.add(wing);wings.push({wing,side});
    oval(wing,edge,[side*.47,0,-.28],[.86,.17,.55]);
    oval(bird,bill,[side*.22,.1,.19],[.077,.14,.09]);
    oval(bird,bill,[side*.22,.027,.36],[.10,.04,.25]);
  }
  const beak=new THREE.Mesh(geometry(new THREE.ConeGeometry(.19,.45,7)),bill);
  beak.rotation.x=Math.PI/2;beak.position.set(0,.06,.77);head.add(beak);
  const perch=new THREE.Vector3(-34,10.55,38);
  const shelter=new THREE.Vector3(-67,23,49);
  bird.position.copy(perch);bird.rotation.y=.85;
  const birdPoint=localPoint(station,perch.x,perch.y,perch.z);
  let print=null,puff=null,birdState='perched',birdTime=0,priorNear=false;
  let seatVisit=null,seatTime=0,seatDeparture=false;
  const visitStart=new THREE.Vector3(),departureStart=new THREE.Vector3(),localActor=new THREE.Vector3();
  const gates=station.userData.ticketLanes??[];
  function startBird(next){birdState=next;birdTime=0;}
  function updateBird(dt,actor,seated){
    if(seated&&seatVisit?.id!==seated.id){
      seatVisit=seated;seatTime=0;seatDeparture=false;
      visitStart.copy(seated.birdPerch);
      visitStart.x+=seated.inside?-8:-11;
      visitStart.z+=seated.inside?9:13;
      visitStart.y+=seated.inside?6:9;
    }
    if(seatVisit){
      seatTime+=dt;
      if(seated){
        const t=ease(.55,1.7,seatTime),target=seatVisit.birdPerch;
        bird.visible=seatTime>=.55;
        bird.position.lerpVectors(visitStart,target,t);
        bird.position.y+=Math.sin(Math.PI*t)*2.5;
        bird.rotation.y=t<1?Math.atan2(target.x-visitStart.x,target.z-visitStart.z):.66;
        bird.scale.setScalar(1.4);
        const dip=t>=1?Math.max(0,Math.sin((seatTime-1.7)*4.8))*.75:0;
        head.rotation.set(.56*dip,-.45*dip,0);
        for(const {wing,side} of wings)wing.rotation.z=side*(t<1?.12+Math.sin(seatTime*45)*.85:.58);
        return;
      }
      if(!seatDeparture){
        seatDeparture=true;seatTime=0;departureStart.copy(bird.position);
      }
      if(bird.visible&&seatTime<1.12){
        const t=ease(0,1.12,seatTime);
        bird.position.lerpVectors(departureStart,visitStart,t);
        bird.position.y+=Math.sin(Math.PI*t)*2.6;
        bird.rotation.y=Math.atan2(visitStart.x-departureStart.x,visitStart.z-departureStart.z);
        head.rotation.set(0,0,0);
        for(const {wing,side} of wings)wing.rotation.z=side*(.12+Math.sin(seatTime*44)*.84);
        return;
      }
      seatVisit=null;seatDeparture=false;bird.scale.setScalar(1);startBird('away');
    }
    const near=Math.hypot(actor.x-birdPoint.x,actor.z-birdPoint.z)<49;
    birdTime+=dt;
    if(birdState==='perched'&&near&&!priorNear)startBird('flee');
    priorNear=near;
    if(birdState==='away'){
      if(!near&&birdTime>1.2)startBird('return');
    }
    if(birdState==='flee'||birdState==='return'){
      const leaving=birdState==='flee',raw=Math.min(1,birdTime/.97),t=ease(0,1,raw);
      bird.position.lerpVectors(leaving?perch:shelter,leaving?shelter:perch,t);
      bird.position.y+=Math.sin(t*Math.PI)*10;
      bird.rotation.y=leaving?-1.23:1.91;
      bird.visible=true;
      for(const {wing,side} of wings) wing.rotation.z=side*(.08+Math.sin(birdTime*41)*.92);
      if(raw===1)startBird(leaving?'away':'perched');
      return;
    }
    bird.visible=birdState!=='away';
    bird.position.copy(perch);
    bird.rotation.y=.86;
    const dip=.05*Math.sin(birdTime*2.5);
    head.rotation.set(.62*dip,-.79*dip,.12*dip);
    for(const {wing,side} of wings) wing.rotation.z=side*(.6-.11*dip);
  }
  return {
    openGate(gate){
      if(!gate||gate.openBy>0||gate.phase>.01)return false;
      gate.openBy=7;
      return true;
    },
    print(z,art){
      print={time:0,z};
      paper.color.setHex(art.color);
      ticket.position.set(31.1,11.0,z);ticket.visible=true;
    },
    get printing(){return print!==null;},
    puff(z){
      puff={time:0,z:z+(z<0?6:-6)};
      cloud.position.set(-13,9.2,puff.z);cloud.visible=true;cloud.scale.setScalar(.48);wool.opacity=1;
    },
    tick(dt,actor,seated){
      if(dt<=0)return;
      if(gates.length){
        station.worldToLocal(localActor.copy(actor));
        for(const g of gates){
          const offset=localActor.x+19.4,across=Math.abs(localActor.z-g.z);
          const inside=Math.abs(offset)<10&&across<13;
          // The platform side has no ticket machine: exit is free. Hold the
          // leaves open until the character is clear of the passage.
          const exiting=offset<-3&&offset>-17&&across<10;
          if(g.openBy>0)g.openBy=Math.max(0,g.openBy-dt);
          const opening=g.openBy>0||exiting||g.phase>.88&&inside;
          if(!opening&&!g.phase)continue;
          g.phase=THREE.MathUtils.clamp(g.phase+dt*(opening?2.7:-2),0,1);
          for(const leaf of g.leaves){leaf.scale.z=Math.max(.001,1-ease(0,1,g.phase));leaf.visible=g.phase<1;}
        }
      }
      if(print){
        print.time+=dt;
        const t=Math.min(1,print.time/.62);
        ticket.position.set(31.1-t*3.8,11+Math.sin(t*Math.PI)*.45,print.z);
        ticket.rotation.z=t*.17;
        if(t===1){print=null;ticket.visible=false;}
      }
      if(puff){
        puff.time+=dt;
        const t=Math.min(1,puff.time/1.43);
        const lane = THREE.MathUtils.lerp(puff.z, THREE.MathUtils.clamp(puff.z,-13,7), ease(.48,1,t));
        cloud.position.set(-13-t*28,9.2+Math.sin(t*Math.PI*4)*.31+ease(.63,1,t)*5,lane);
        cloud.scale.setScalar(.48+.39*ease(0,.17,t));
        cloud.rotation.y=puff.time*2.1;
        wool.opacity=1-ease(.63,1,t);
        if(t===1){puff=null;cloud.visible=false;}
      }
      updateBird(dt,actor,seated);
    },
    dispose(){root.removeFromParent();dispose.forEach(resource=>resource.dispose());},
  };
}

function createStationReaderTone(){
  let audio=null;
  return ()=>{
    let volume=1;
    try {
      const config=JSON.parse(localStorage.getItem('lifeQuestWalkV1')||'{}');
      volume=Number(config.soundVolumes?.sfx??1);
    } catch {}
    if(!(volume>0)||!globalThis.AudioContext)return;
    try{
      audio??=new AudioContext();
      const play=()=>{
        const now=audio.currentTime,gain=audio.createGain(),tone=audio.createOscillator();
        tone.frequency.setValueAtTime(970,now);
        tone.frequency.setValueAtTime(1150,now+.044);
        gain.gain.setValueAtTime(0,now);
        gain.gain.linearRampToValueAtTime(Math.min(volume,5)*.035,now+.013);
        gain.gain.exponentialRampToValueAtTime(.0001,now+.15);
        tone.connect(gain);gain.connect(audio.destination); tone.onended=()=>{tone.disconnect();gain.disconnect();};
        tone.start(now);tone.stop(now+.16);
      };
      if(audio.state==='running')play();
      else audio.resume().then(play,()=>{});
    }catch {}
  };
}
