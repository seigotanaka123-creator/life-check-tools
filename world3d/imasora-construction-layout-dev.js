import * as THREE from './assets/three.module.min.js';
import { IMASORA_WORLD_MAPS } from './assets/imasora-world-map-schema.js';
import { officialCharacter, vehicleDimensions, parkingProposal, inspectProposal, bayExitPath, footprint, overlaps, rectPolygon, savedBuildingVolumes, createVehicleScaleMock, box } from './assets/imasora-construction-layout.js';

const $ = id => document.getElementById(id);
const status = $('status');
window.addEventListener('error', e => { status.textContent = `表示エラー：${e.message}`; status.classList.add('warning'); });
window.addEventListener('unhandledrejection', e => { status.textContent = `読み込みエラー：${e.reason?.message || e.reason}`; status.classList.add('warning'); });
const d = vehicleDimensions(), proposal = parkingProposal(d), inspection = inspectProposal(proposal);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe4edf1);
const camera = new THREE.PerspectiveCamera(40, 1, .1, 6000);
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
let renderRequest = 0, renderedOnce = false;
function requestRender() {
  if (renderRequest) return;
  renderRequest = requestAnimationFrame(() => {
    renderRequest = 0; renderer.render(scene, camera);
    if (!renderedOnce) {
      renderedOnce = true;
      status.textContent = `${inspectionText.length ? '配置上の要確認あり' : '表示・寸法検査 OK'} ／ ドラッグで回転・ホイール／ピンチで拡大縮小 ／ 保存は行いません`;
    }
  });
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
scene.add(new THREE.HemisphereLight(0xe8f7ff, 0x88846c, 2.4));
const sunlight = new THREE.DirectionalLight(0xfff6e6, 3.1); sunlight.position.set(90, 180, 100); sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048); Object.assign(sunlight.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, far: 700 });
sunlight.shadow.normalBias = .3; scene.add(sunlight);
const softFill = new THREE.DirectionalLight(0xbbdaff, 1); softFill.position.set(-100, 40, -80); scene.add(softFill);
const studio = new THREE.Group(), layout = new THREE.Group(); scene.add(studio, layout); layout.visible = false;
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
const studioGround = mat(0xe1e7e5), lineColor = 0x67918e;
box(studio, 540, 1, 540, 0, -.6, 0, studioGround);
const grid = new THREE.GridHelper(260, 10, 0xc1d0cf, 0xcbd7d6); grid.position.y = .02; studio.add(grid);
const car = createVehicleScaleMock(d); studio.add(car); car.userData.roof.visible = false;
const standing = officialCharacter(); standing.position.set(-68, .12 - d.measurement.footBottom, 5); studio.add(standing);
const guides = new THREE.Group(); studio.add(guides);
function line(parent, points, color = lineColor, dashed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const line = new THREE.Line(geometry, dashed ? new THREE.LineDashedMaterial({ color, dashSize: 4, gapSize: 2 }) : new THREE.LineBasicMaterial({ color }));
  if (dashed) line.computeLineDistances(); parent.add(line); return line;
}
function label(parent, text, x, y, z, width = 48, color = '#345766') {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 36px "Yu Gothic", Meiryo, sans-serif';
  canvas.width = Math.max(80, Math.ceil(ctx.measureText(text).width + 40));
  ctx.fillStyle = '#fffffff5'; ctx.beginPath(); ctx.roundRect(2, 2, canvas.width - 4, 76, 12); ctx.fill();
  ctx.font = 'bold 36px "Yu Gothic", Meiryo, sans-serif'; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, canvas.width / 2, 43);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, toneMapped: false }));
  sprite.scale.set(width, width * 80 / canvas.width, 1); sprite.position.set(x, y, z); sprite.renderOrder = 10; parent.add(sprite); return sprite;
}
function dimension(a, b, text, labelPos) {
  line(guides, [a, b], 0x3a7c7a);
  for (const p of [a, b]) line(guides, [[p[0], p[1] - 2, p[2]], [p[0], p[1] + 2, p[2]]], 0x3a7c7a);
  label(guides, text, ...labelPos, 42);
}
dimension([-30, 2, 52], [30, 2, 52], '車幅 60', [0, 4, 57]);
dimension([43, 2, -43], [43, 2, 43], '全長 86', [54, 4, 0]);
dimension([-86, .12, 5], [-86, .12 + d.measurement.height, 5], '高さ 26.5', [-80, 34, 5]);
label(guides, '運転席', -14, 43, 5, 22); label(guides, '助手席', 14, 48, 5, 22);
// Transparent side wedges show the reserved approach volume, not an implemented ramp.
for (const sign of [-1, 1]) {
  const points = [[sign * 30, .15, -10], [sign * 60, .15, -10], [sign * 60, .15, 20], [sign * 30, .15, 20], [sign * 30, .15, -10]];
  line(guides, points, 0x45a59c, true);
  line(guides, [[sign * 30, 9, 5], [sign * 60, .2, 5]], 0x45a59c, true);
}
label(guides, '降車余白 30', 0, 3, -58, 53);

const extensionMat = mat(0xceddd4), asphalt = mat(0x637982), yellowLine = mat(0xfad176);
function area(parent, rect, height, material, top = 0) {
  return box(parent, rect.maxX - rect.minX, height, rect.maxZ - rect.minZ, (rect.minX + rect.maxX) / 2, top - height / 2, (rect.minZ + rect.maxZ) / 2, material);
}
area(layout, proposal.extension, 4, extensionMat);
const original = area(layout, proposal.original, 4, mat(0xc69e70));
new THREE.TextureLoader().load(IMASORA_WORLD_MAPS.construction.source.texture, texture => {
  texture.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(540, 360), mat(0xffffff, { map: texture }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = .06; ground.receiveShadow = true; layout.add(ground);
  requestRender();
}, undefined, () => { $('diagnostics').append(' 既存地表画像を読み込めませんでした。区画寸法のみの表示です。'); });
area(layout, proposal.aisle, .3, asphalt, .25); area(layout, proposal.connector, .3, asphalt, .25);
const paths = new THREE.Group(); layout.add(paths);
const envelopeMat = mat(0xebb75d, { transparent: true, opacity: .25, depthWrite: false });
for (const bay of proposal.bays) {
  const lot = { minX: bay.x - bay.width / 2, maxX: bay.x + bay.width / 2, minZ: bay.z - bay.depth / 2, maxZ: bay.z + bay.depth / 2 };
  const corners = rectPolygon(lot).map(p => [p.x, .5, p.z]); corners.push(corners[0]); line(layout, corners, 0xffffff);
  box(layout, d.width, d.height, d.length, bay.x, d.height / 2 + .3, bay.z, envelopeMat);
  const outline = footprint(bay.x, bay.z, 0, d.width, d.length).map(p => [p.x, .65, p.z]); outline.push(outline[0]); line(layout, outline, 0xe8bd65);
  const sign = bay.index < 4 ? 1 : -1;
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, sign), new THREE.Vector3(bay.x, 45, bay.z - sign * 18), 40, 0xf6b530, 9, 7); layout.add(arrow);
  label(layout, `${bay.index + 1}`, bay.x, 56, bay.z, 54);
  line(paths, bayExitPath(proposal, bay).map(p => [p.x, .6, p.z]), 0xafe6d5);
}
// Full-radius turn guide uses the same radius as the geometric swept-volume test.
line(paths, Array.from({ length: 129 }, (_, i) => {
  const a = i / 128 * Math.PI * 2; return [proposal.centerX + d.turnRadius * Math.cos(a), .7, d.turnRadius * Math.sin(a)];
}), 0xeffad3, true);
label(layout, '旋回通路 224', -590, 12, 5, 177);
label(layout, '駐車場候補 · 拡張済み土地内', -555, 5, -287, 300);
label(layout, '元の中心区画 540 × 360', 0, 5, -214, 265);
line(layout, [[-270, 2, -260], [-270, 2, 260]], 0xe1aa49, true);
label(layout, '元の境界', -270, 3, 233, 130);
for (const zone of proposal.zones) {
  const corners = footprint(zone.x, zone.z, 0, zone.width, zone.depth).map(p => [p.x, .9, p.z]); corners.push(corners[0]); line(layout, corners, 0x247869);
  label(layout, zone.name, zone.x, 8, zone.z, 108);
}
for (const bridge of proposal.entry) {
  const points = footprint(bridge.x, bridge.z, bridge.heading, bridge.width, bridge.depth).map(p => [p.x, 1, p.z]); points.push(points[0]); line(layout, points, 0x637bcb);
  label(layout, '橋1 · 位置維持', bridge.x, 8, bridge.z, 125);
}
const spawn = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1, 24), mat(0x4cad9f)); spawn.position.fromArray(proposal.spawn); spawn.position.y = 1; layout.add(spawn);
label(layout, '開始位置', proposal.spawn[0], 9, proposal.spawn[2], 75);
let savedNote = 'この開発用オリジンには保存済み建物なし。別ポートの保存内容は参照しません。', savedIssues = [];
try {
  const buildings = savedBuildingVolumes(localStorage.getItem('imasora-world-foundation-v3'));
  if (buildings.length) savedNote = `保存済み建物 ${buildings.length}件を占有範囲で参考表示（読取専用）。`;
  for (const building of buildings) {
    box(layout, building.width, Math.min(building.height, 70), building.depth, building.x, Math.min(building.height, 70) / 2, building.z, mat(0xa05656, { transparent: true, opacity: .3 }));
    label(layout, `保存済み：${building.name}`, building.x, 80, building.z, 165, '#963e37');
    if ([proposal.extension, proposal.connector].some(rect => overlaps(rectPolygon(rect), footprint(building.x, building.z, 0, building.width, building.depth)))) savedIssues.push(`${building.name}の保存位置と候補範囲が重複。配置案の調整が必要です。`);
  }
} catch (error) { savedNote = `保存済み建物は未検証：${error.message}。保存は変更していません。`; }

const inspectionText = [...inspection.issues, ...savedIssues];
$('diagnostics').textContent = `正式モデル倍率 ${d.measurement.scale}。外周幅 ${d.measurement.width.toFixed(3)}／奥行 ${d.measurement.depth.toFixed(3)}／高さ ${d.measurement.height.toFixed(3)}。頭上余白 ${inspection.headroom.toFixed(2)}。各車の出庫 ${inspection.pathSamples}姿勢＋旋回361姿勢を幾何検査。${inspectionText.length ? inspectionText.join(' ') : '候補地内・駐車車体との干渉なし。'} ${savedNote} 実走行の衝突・乗降アニメーションは未実装です。`;
const metric = (name, value, unit = '') => `<div class="metric"><span>${name}</span><strong>${value}</strong><small>${unit}</small></div>`;
let view = 'vehicle';
const target = new THREE.Vector3(), orbit = { yaw: .7, pitch: .49, distance: 220 };
function fitView() {
  if (view === 'vehicle') { target.set(-8, 17, 0); orbit.distance = 215; orbit.yaw = .7; orbit.pitch = .48; }
  else { target.set(-290, 0, 0); orbit.distance = 1550; orbit.yaw = 0; orbit.pitch = 1.32; }
  updateCamera();
}
function updateCamera() {
  const aspect = Math.max(.35, camera.aspect);
  const distance = orbit.distance * (aspect < 1.2 ? 1.2 / aspect : 1);
  camera.position.set(target.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * distance,
    target.y + Math.sin(orbit.pitch) * distance, target.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * distance);
  camera.lookAt(target);
  requestRender();
}
function chooseView(next) {
  view = next; studio.visible = view === 'vehicle'; layout.visible = view === 'parking';
  // A scene this wide needs a farther near plane to prevent coplanar-ground z-fighting.
  camera.near = view === 'vehicle' ? .5 : 10; camera.updateProjectionMatrix();
  $('parkingFocus').hidden = view !== 'parking';
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  $('sceneTitle').textContent = view === 'vehicle' ? '正式キャラ2匹が収まる共通サイズ' : '元の中心区画の西側に、駐車場を置く案';
  $('sceneSubtitle').textContent = view === 'vehicle' ? '黄色の車は大きさの確認用。7車種の完成形ではありません。' : '現在の土地全体は5,400×3,600。この表示は駐車場付近だけの比較です。';
  $('panelTitle').textContent = view === 'vehicle' ? 'キャラ1匹 × 2席' : '7台と、建築用の余白';
  $('metrics').innerHTML = view === 'vehicle'
    ? metric('車体の幅', d.width) + metric('車体の全長', d.length) + metric('キャラの高さ', d.measurement.height.toFixed(1)) + metric('頭上の余白', inspection.headroom.toFixed(1))
    : metric('駐車区画', '7', '台') + metric('1区画', '120', '×118') + metric('旋回通路', '224') + metric('片側の降車余白', '30');
  $('explanation').innerHTML = view === 'vehicle'
    ? '<h3>サイズの確認ポイント</h3><p>運転席・助手席・横の体格見本は、歩行時と同じ正式360度モデルです。車に合わせて縮小していません。</p><p>屋根を表示して頭上を、横・後ろ・上から見て2席の間隔を比べられます。服やマントも測定に含めています。</p><p>この段階は共通の寸法模型です。車種別の腕・荷台・爪などは、各車の段階で設計します。</p>'
    : '<h3>拡張した土地の中の配置案</h3><p>工事現場全体は5,400×3,600に拡張済みです。ここでは元の中心区画540×360と、隣接する駐車場候補だけを表示します。</p><p>橋・開始位置・3つの造成区画はそのまま。駐車場は未設置の比較案で、4台＋3台を向かい合わせにしています。</p><ol>' + proposal.bays.map(b => `<li>${b.name}</li>`).join('') + '</ol>';
  fitView();
}
document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => chooseView(b.dataset.view)));
document.querySelectorAll('[data-camera]').forEach(b => b.addEventListener('click', () => {
  const mode = b.dataset.camera;
  if (mode === 'perspective') fitView();
  else if (mode === 'parkingFocus') { target.set(proposal.centerX, 0, 0); orbit.distance = 840; orbit.yaw = 0; orbit.pitch = 1.4; updateCamera(); }
  else { orbit.yaw = mode === 'rear' ? Math.PI : mode === 'side' ? Math.PI / 2 : 0; orbit.pitch = mode === 'top' ? Math.PI / 2 - .001 : .12; updateCamera(); }
}));
$('roof').addEventListener('change', e => { car.userData.roof.visible = e.target.checked; requestRender(); });
$('characters').addEventListener('change', e => { car.userData.characters.visible = standing.visible = e.target.checked; requestRender(); });
$('guides').addEventListener('change', e => { guides.visible = e.target.checked; requestRender(); });
$('paths').addEventListener('change', e => { paths.visible = e.target.checked; requestRender(); });
const canvas = $('scene'), pointers = new Map(); let gesture = null;
canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); gesture = null; });
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  const previous = pointers.get(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    orbit.yaw -= (e.clientX - previous.x) * .007; orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (e.clientY - previous.y) * .005, .06, Math.PI / 2 - .001);
  } else {
    const [a, b] = [...pointers.values()], separation = Math.hypot(a.x - b.x, a.y - b.y);
    if (gesture) orbit.distance *= gesture / Math.max(8, separation);
    gesture = separation;
  }
  orbit.distance = THREE.MathUtils.clamp(orbit.distance, view === 'vehicle' ? 95 : 650, view === 'vehicle' ? 420 : 2600); updateCamera();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, e => { pointers.delete(e.pointerId); gesture = null; });
canvas.addEventListener('wheel', e => {
  e.preventDefault(); orbit.distance = THREE.MathUtils.clamp(orbit.distance * Math.exp(e.deltaY * .001), view === 'vehicle' ? 95 : 650, view === 'vehicle' ? 420 : 2600); updateCamera();
}, { passive: false });
new ResizeObserver(() => {
  const rect = canvas.parentElement.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix(); updateCamera();
}).observe(canvas.parentElement);
chooseView('vehicle');
// Static inspection page: only draw after a user action, resize or texture load.
requestRender();
