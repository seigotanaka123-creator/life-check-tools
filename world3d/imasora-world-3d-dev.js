import * as THREE from "./assets/three.module.min.js";
import {
  WHITE_MICHI_ROAD_SABER_REN_ID,
  buildMatureStarCharacter360,
  disposeMatureCharacterModel,
} from "./assets/imasora-character-360.js";
import {
  IMASORA_WORLD_MAPS,
  IMASORA_WORLD_SCHEMA_VERSION,
  mapBuildZone,
  mapSpawn,
  normalizedPoint,
} from "./assets/imasora-world-map-schema.js?v=20260825-ufo-pad-v43";

const SAVE_KEY = "imasora-world-foundation-v3";
const CHARACTER_ID = WHITE_MICHI_ROAD_SABER_REN_ID;
const WORLD_PHYSICS_REVISION = 12;
const PLAYER_RADIUS = 7;
// 360度モデルの実際の外周（胴体・手足・マント）に合わせた余白。
// 16を一律で使うと、細い柱まで大きな見えない壁になり通路を塞ぐため、
// 建物本体は10、細い部材は個別にさらに小さい余白を使う。
// 白ミチロードセイバーレン360度モデルの胴体・手・マントを
// 水平面へ投影した実外周。個別部品の余白がこれを下回らないようにする。
const CHARACTER_COLLISION_RADIUS = 12;
// Visible model against visible structure collision.  This is deliberately a
// very small contact skin: the character's actual oriented footprint is added
// separately, so using the old 4-17 unit "character margin" here would create
// another large invisible wall around every building.
const CHARACTER_STRUCTURE_CONTACT_SKIN = .35;
const VERTICAL_STRUCTURE_COLLISION_CLEARANCE = 6;
const PLAYER_SPEED = 68;
const FAST_WALK_MULTIPLIER = 2.5;
const MAX_JUMPS = 3;
const JUMP_HEIGHT_MULTIPLIER = 2;
const JUMP_VELOCITY = 44 * Math.sqrt(JUMP_HEIGHT_MULTIPLIER);
const JUMP_GRAVITY = 118;
const MAX_JUMP_RISE = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * JUMP_GRAVITY);
const UFO_ACCESS_RADIUS = 320;
const UFO_RAMP_KEEP_OPEN_RADIUS = 355;
// 段差の立ち上がりは平面上の壁ではなく、実際の高さを持つ障害物として扱う。
// これより上へ足元を持ち上げられた時だけ、ジャンプで段差を越えられる。
const STEP_JUMP_CLEARANCE = .2;
const WALK_CYCLE_SPEED = 9.2;
const WALK_FOOT_SWING = 7.2;
const WALK_FOOT_LIFT = 1.7;
const WALK_BLEND_SPEED = 11;
const IDLE_HAND_CYCLE_SPEED = 2.35;
const IDLE_HAND_SWING = 2.1;
const IDLE_HAND_BODY_INSET = 3;
const CHARACTER_GROUND_CLEARANCE = .12;
const CHARACTER_SHADOW_Y = .08;
const FIRST_PERSON_EYE_CLEARANCE = 2.4;
const LOOK_MOUSE_SENSITIVITY = .006;
const LOOK_TOUCH_SENSITIVITY = .0085;
const LOOK_PITCH_MIN = -.72;
const LOOK_PITCH_MAX = .62;
// 三人称カメラは距離だけを切り替え、上下の見下ろし角は共通にする。
// 標準を従来値に合わせ、近景・引き・遠景を順番に選べるようにする。
const THIRD_PERSON_DISTANCE_PRESETS = Object.freeze([
  { label: "近景", distance: Math.hypot(92, 45) },
  { label: "標準", distance: Math.hypot(112, 55) },
  { label: "引き", distance: Math.hypot(150, 74) },
  { label: "遠景", distance: Math.hypot(190, 94) },
]);
const DEFAULT_THIRD_PERSON_DISTANCE_INDEX = 1;
const THIRD_PERSON_BASE_PITCH = -Math.atan2(55, 112);
const THIRD_PERSON_PITCH_MIN = -.56;
const THIRD_PERSON_PITCH_MAX = .72;
const TOUCH_PAD_DEAD_ZONE = .1;
const BUILDING_SCALE = 2.5;
// 顔認証装置は、保存した立ち位置の少し手前に置く。立ち位置自体は
// 建造時のプレイヤー位置を保存し、プレイヤー移動のたびには追従させない。
const UFO_FACE_AUTH_MARKER_OFFSET_LOCAL_X = 18;
// ユーザー指定の顔認証システムの固定ワールド座標。
// UFO内部床やマップ再構築によって、この位置を再計算・移動しない。
const UFO_FACE_AUTH_FIXED_WORLD_ANCHOR = Object.freeze({ x: 163.2, z: 33.8 });
// 顔認証は「装置の前にいる」だけでは成立させない。カメラのレンズを
// 実際に正面へ捉えている時だけ反応させるため、許容角を狭く固定する。
const UFO_FACE_AUTH_FACING_TOLERANCE = THREE.MathUtils.degToRad(18);
const UFO_FACE_AUTH_LENS_LOCAL_POSITION = Object.freeze({ x: 4.66, y: 19, z: 0 });
// 起動時と緊急脱出の共通復帰地点。ユーザーが指定した空駅前の
// 安全な地面座標と、現在の「正面」向きをそのまま正式値にする。
const SKY_ENTRY_START = Object.freeze({ x: -176.4, z: -132.3, heading: 0 });
// UFOの配置地点。リロード開始地点・緊急脱出地点とは別の建造物座標
// として扱い、緊急脱出処理からUFOを移動させない。
// ユーザーが指定したUFOの固定配置座標。
const UFO_PLACEMENT_POSITION = Object.freeze({ x: -157.8, z: 118.3 });
// 緊急脱出はリロード開始地点と同じ空駅前へ戻す。UFO配置とは分離する。
const SKY_EMERGENCY_START = Object.freeze({ x: -176.4, z: -132.3, heading: 0 });
// ユーザーが指定した開始時の画角。正面を見て、現在の遠景寄りの
// 三人称距離から始める。自由視点で遊んだ後の値はリロード時に持ち越さない。
const SKY_ENTRY_CAMERA = Object.freeze({ heading: Math.PI, pitch: 0, distanceIndex: 3 });
// 正面階段は描画と物理で同じ定義を共有する。ここから別々に数字を
// 書き写すと、駅全体の BUILDING_SCALE を二重に掛けて浮遊面を作る。
const SKY_STATION_FRONT_STEPS = Object.freeze([
  Object.freeze({ width: 50, height: 1.4, z: 39, depth: 7 }),
  Object.freeze({ width: 44, height: 2.8, z: 36, depth: 7 }),
  Object.freeze({ width: 38, height: 4.2, z: 33, depth: 7 }),
]);
const SKY_STATION_FRONT_RAILS = Object.freeze([
  Object.freeze({ startX: -48, endX: -32, z: 38 }),
  Object.freeze({ startX: 32, endX: 48, z: 38 }),
]);
const SKY_STATION_FRONT_GARDENS = Object.freeze([
  Object.freeze({ centerX: -41, width: 16, depth: 14 }),
  Object.freeze({ centerX: 41, width: 16, depth: 14 }),
]);
// 空マップの線路は、マップ内のどの位置から見ても霧の奥へ消える長さにする。
// 枕木は InstancedMesh で一括描画し、長距離化による負荷を抑える。
const SKY_TRACK_VISIBLE_LENGTH = 2400;
const SKY_TRACK_TIE_SPACING = 9;

const MAPS = IMASORA_WORLD_MAPS;

const state = {
  map: "sky",
  labels: true,
  cameraMode: "third",
  cameraDistanceIndex: DEFAULT_THIRD_PERSON_DISTANCE_INDEX,
  fastWalking: false,
  position: new THREE.Vector3(0, 0, 28),
  groundY: 0,
  jumpY: 0,
  jumpVelocity: 0,
  falling: false,
  jumpCount: 0,
  // 着地した実在の上面を次フレームへ引き継ぐ。足が段差の端に
  // かかっている間に、中心点だけが低い床を拾って沈まないようにする。
  supportSurfaceId: null,
  heading: 0,
  viewHeading: 0,
  viewPitch: 0,
  moving: false,
  selectedBuildId: null,
  buildPreview: null,
  physicsDebug: false,
  ufoDoorOpen: false,
  ufoBoarded: false,
  ufoFaceAuth: false,
  ufoFaceAuthLatched: false,
  pendingSafeEntry: false,
  saved: false,
};

const els = {
  canvas: document.getElementById("worldCanvas"),
  viewport: document.getElementById("viewport"),
  statusText: document.getElementById("statusText"),
  saveState: document.getElementById("saveState"),
  sceneTitle: document.getElementById("sceneTitle"),
  mapDescription: document.getElementById("mapDescription"),
  coords: document.getElementById("coords"),
  viewReadout: document.getElementById("viewReadout"),
  headingReadout: document.getElementById("headingReadout"),
  positionReadout: document.getElementById("positionReadout"),
  motionReadout: document.getElementById("motionReadout"),
  buildList: document.getElementById("buildList"),
  buildMessage: document.getElementById("buildMessage"),
  placeButton: document.getElementById("placeButton"),
  cancelBuildButton: document.getElementById("cancelBuildButton"),
  ufoDoorButton: document.getElementById("ufoDoorButton"),
  ufoBoardButton: document.getElementById("ufoBoardButton"),
  ufoStatus: document.getElementById("ufoStatus"),
  cameraModeButton: document.getElementById("cameraModeButton"),
  cameraDistanceButton: document.getElementById("cameraDistanceButton"),
  emergencyEscapeButton: document.getElementById("emergencyEscapeButton"),
  labelsButton: document.getElementById("labelsButton"),
  physicsDebugButton: document.getElementById("physicsDebugButton"),
  saveButton: document.getElementById("saveButton"),
  resetButton: document.getElementById("resetButton"),
  toast: document.getElementById("toast"),
  touchPad: document.getElementById("touchPad"),
  touchStick: document.getElementById("touchStick"),
  touchHint: document.getElementById("touchHint"),
};

let renderer;
let scene;
let camera;
let clock;
let worldGroup;
let mapGroup;
// 物理は表示グループと別の近似箱を増やすのではなく、表示メッシュと
// 同じ world matrix / geometry を持つ専用レイヤーを一つだけ持つ。
let physicsMeshGroup;
let physicsDebugGroup;
let physicsContactMarker;
let character;
let characterShadow;
let previewGroup;
let labelsGroup;
let ufoDoorControls = [];
let ufoRampPhysicsIds = [];
let colliders = [];
let walkableSurfaces = [];
// The authoritative physics layer is explicitly partitioned by role. These
// buckets are populated together with the single collider/surface arrays used
// by movement, so floors, risers, and walls cannot silently become one generic
// building rectangle during later maintenance.
const physicsElements = {
  floors: [],
  risers: [],
  walls: [],
};
let builtByMap = {};
let keys = new Set();
let touchVector = new THREE.Vector2();
let touchPointerId = null;
let touchStartAt = 0;
let touchStartX = 0;
let touchStartY = 0;
let lastTouchTapAt = 0;
let lastMovementTapAt = 0;
let lastMovementTapKey = "";
let lookPointerId = null;
let lookLastX = 0;
let lookLastY = 0;
let toastTimer;

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const safeJson = value => { try { return JSON.parse(value); } catch { return null; } };

function color(value) { return new THREE.Color(value); }

const textureCache = new Map();

function configureMapTexture(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  return texture;
}

function loadMapTexture(url) {
  if (!textureCache.has(url)) {
    const texture = new THREE.TextureLoader().load(url);
    textureCache.set(url, configureMapTexture(texture));
  }
  return textureCache.get(url);
}

function makeSkyCompositeTexture() {
  const cacheKey = "official-sky-cloud-floor-v2";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#dff5ff");
  sky.addColorStop(.18, "#edf9ff");
  sky.addColorStop(.48, "#d9edf8");
  sky.addColorStop(1, "#aecfe7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  [
    [180, 170, 360, 170, "rgba(255,255,255,.72)"],
    [760, 115, 520, 210, "rgba(255,255,255,.62)"],
    [1310, 205, 430, 230, "rgba(255,255,255,.58)"],
    [370, 660, 560, 260, "rgba(255,255,255,.42)"],
    [1110, 720, 650, 300, "rgba(238,249,255,.5)"],
  ].forEach(([x, y, rx, ry, tint]) => {
    const puff = ctx.createRadialGradient(x, y, 0, x, y, rx);
    puff.addColorStop(0, tint);
    puff.addColorStop(.68, "rgba(255,255,255,.12)");
    puff.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.scale(1, ry / rx);
    ctx.fillStyle = puff;
    ctx.fillRect(0, 0, canvas.width, canvas.height * rx / ry);
    ctx.restore();
  });
  const texture = configureMapTexture(new THREE.CanvasTexture(canvas));
  textureCache.set(cacheKey, texture);
  // 街マップ画像に焼き込まれた平面線路は重ねない。
  // 空マップの床は全面を白い雲にし、線路は3Dモデルだけを表示する。
  return texture;
}

function sourceTextureFor(config) {
  if (config.source.texture) return loadMapTexture(config.source.texture);
  if (config.source.composite === "official-sky-layer-composite-v1") return makeSkyCompositeTexture();
  return null;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 1900);
}

function worldStateSnapshot() {
  return {
    version: 3,
    mapSchemaVersion: IMASORA_WORLD_SCHEMA_VERSION,
    physicsRevision: WORLD_PHYSICS_REVISION,
    characterId: CHARACTER_ID,
    map: state.map,
    position: { x: state.position.x, z: state.position.z },
    heading: state.heading,
    cameraDistanceIndex: state.cameraDistanceIndex,
    labels: state.labels,
    builtByMap,
    updatedAt: Date.now(),
  };
}

function mapEntryStart(mapKey = "sky") {
  if (mapKey === "sky") return { ...SKY_ENTRY_START };
  const config = MAPS[mapKey] || MAPS.sky;
  const entry = config.entry;
  const [entryX, , entryZ] = normalizedPoint(config, entry.point);
  const rotation = THREE.MathUtils.degToRad(entry.rotationDeg || 0);
  const distance = 42;
  return {
    x: entryX + Math.sin(rotation) * distance,
    z: entryZ + Math.cos(rotation) * distance,
    heading: rotation + Math.PI,
  };
}

function resetPlayerToMapSpawn(mapKey = state.map, options = {}) {
  const spawn = options.fromEntry
    ? mapEntryStart(mapKey)
    : options.fromEmergency && mapKey === "sky"
    ? SKY_EMERGENCY_START
    : mapSpawn(MAPS[mapKey]);
  state.position.set(spawn.x, spawn.y, spawn.z);
  state.heading = spawn.heading;
  state.viewHeading = spawn.heading;
  state.viewPitch = 0;
  if (options.fromEntry && mapKey === "sky") {
    state.viewHeading = SKY_ENTRY_CAMERA.heading;
    state.viewPitch = SKY_ENTRY_CAMERA.pitch;
    state.cameraDistanceIndex = SKY_ENTRY_CAMERA.distanceIndex;
  }
  state.groundY = 0;
  state.jumpY = 0;
  state.jumpVelocity = 0;
  state.falling = false;
  state.jumpCount = 0;
  state.supportSurfaceId = null;
  state.ufoFaceAuth = false;
  state.ufoFaceAuthLatched = false;
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(worldStateSnapshot()));
  state.saved = true;
  els.saveState.textContent = "保存済み";
  showToast("建造状態と位置を保存しました");
}

function loadState() {
  const saved = safeJson(localStorage.getItem(SAVE_KEY));
  if (!saved || saved.version !== 3 || saved.mapSchemaVersion !== IMASORA_WORLD_SCHEMA_VERSION) {
    state.map = "sky";
    state.pendingSafeEntry = true;
    resetPlayerToMapSpawn("sky", { fromEntry: true });
    return;
  }
  // 建造状態・表示設定は復元するが、位置は安全な駅入口から始める。
  // 保存位置をそのまま戻すと、前回の閉じ込め場所を再びロードするため、
  // 位置復元だけは意図的に使わない。
  state.map = "sky";
  state.pendingSafeEntry = true;
  resetPlayerToMapSpawn("sky", { fromEntry: true });
  state.cameraDistanceIndex = SKY_ENTRY_CAMERA.distanceIndex;
  state.labels = saved.labels !== false;
  builtByMap = saved.builtByMap && typeof saved.builtByMap === "object" ? saved.builtByMap : {};
  state.saved = true;
  els.saveState.textContent = "保存済み";
}

function emergencyEscape() {
  // 移動入力と視点ドラッグを同時に解除し、ワープ直後に同じ入力で
  // 再び壁へ押し付けられないようにする。
  keys.clear();
  touchVector.set(0, 0);
  touchPointerId = null;
  lookPointerId = null;
  els.touchStick.style.transform = "translate(-50%, -50%)";
  els.viewport.classList.remove("is-looking");

  state.map = "sky";
  state.selectedBuildId = null;
  state.ufoBoarded = false;
  state.ufoDoorOpen = false;
  state.ufoFaceAuth = false;
  state.ufoFaceAuthLatched = false;
  state.fastWalking = false;
  state.pendingSafeEntry = false;
  cancelBuild();
  resetPlayerToMapSpawn("sky", { fromEmergency: true });
  if (scene) {
    scene.background = color(MAPS.sky.palette.fog);
    scene.fog.color.copy(color(MAPS.sky.palette.fog));
  }
  rebuildMap();
  updateCharacter(0);
  updateCamera();
  updateUfoControls();
  saveState();
  showToast("緊急脱出：空駅の入口へ戻りました");
}

function repairLegacySkyStationApproach(saved) {
  if (saved.physicsRevision === WORLD_PHYSICS_REVISION || state.map !== "sky" || !saved.position) return false;
  const local = stationLocalPoint(state.position.x, state.position.z);
  const outerStep = SKY_STATION_FRONT_STEPS[0];
  const outerEdge = outerStep.z + outerStep.depth / 2;
  const inFrontApproach = local.z >= outerEdge - 1 && local.z <= outerEdge + 16;
  if (!inFrontApproach || Math.abs(local.x) < 8) return false;
  const [stationX] = normalizedPoint(MAPS.sky, MAPS.sky.entry.point);
  // 旧保存位置が左右の柱・花壇へ重なる場合だけ、同じ入口の中央軸へ
  // 一度復旧する。プレイ中の移動を押し戻す処理ではない。
  state.position.x = stationX;
  return true;
}

function clearCurrentMapSave() {
  builtByMap[state.map] = [];
  state.selectedBuildId = null;
  state.ufoBoarded = false;
  state.ufoDoorOpen = false;
  state.ufoFaceAuth = false;
  state.ufoFaceAuthLatched = false;
  state.saved = false;
  localStorage.setItem(SAVE_KEY, JSON.stringify(worldStateSnapshot()));
  state.saved = true;
  els.saveState.textContent = "保存済み";
  rebuildMap();
  showToast("このマップの建造物を初期化しました");
}

function makeTextLabel(text, tint = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(4,17,35,.82)";
  ctx.roundRect(10, 20, 492, 86, 22);
  ctx.fill();
  ctx.fillStyle = tint;
  ctx.font = "900 42px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(24, 6, 1);
  return sprite;
}

function addCloudCluster(parent, x, z, scale = 1, tint = 0xf6fbff) {
  const group = new THREE.Group();
  group.position.set(x, .6, z);
  group.scale.setScalar(scale);
  const material = new THREE.MeshStandardMaterial({ color: tint, roughness: .98, metalness: 0, transparent: true, opacity: .96 });
  [[0, 0, 0, 12], [12, 1, 1, 10], [-12, .8, 2, 10], [0, 2.2, -8, 9]].forEach(([px, py, pz, radius]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 14), material);
    puff.position.set(px, py, pz); puff.scale.y = .34; puff.castShadow = true; puff.receiveShadow = true; group.add(puff);
  });
  parent.add(group);
}

function makeGround(config) {
  const group = new THREE.Group();
  const { width, depth } = config.world;
  const sourceTexture = sourceTextureFor(config);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth, 1, 1),
    new THREE.MeshStandardMaterial({
      color: sourceTexture ? 0xffffff : config.palette.ground,
      map: sourceTexture,
      roughness: .88,
      metalness: .01,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(width + 4, 2.2, depth + 4),
    new THREE.MeshStandardMaterial({ color: config.palette.edge, roughness: .92 })
  );
  rim.position.y = -3.1;
  group.add(rim);
  (config.decoration.cloudClusters || []).forEach(item => {
    const [x, , z] = normalizedPoint(config, item.point);
    // 雲は土地ではなく景観パーツ。ワールド3倍化をそのまま掛けると
    // キャラクターや建物を覆うため、白レン基準の景観サイズに留める。
    addCloudCluster(group, x, z, item.scale * 1.45);
  });
  (!sourceTexture ? config.decoration.waterPlanes || [] : []).forEach(item => {
    const [x, , z] = normalizedPoint(config, item.point);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(item.size[0], item.size[1]), new THREE.MeshStandardMaterial({ color: item.color, roughness: .32, metalness: .08 }));
    water.rotation.x = -Math.PI / 2; water.position.set(x, .05, z); group.add(water);
  });
  (!sourceTexture ? config.decoration.tireTracks || [] : []).forEach(normalizedX => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12, .18, depth * .7), new THREE.MeshStandardMaterial({ color: 0xc08a55, roughness: 1 }));
    beam.position.set(normalizedX * width, .08, depth * .1); group.add(beam);
  });
  (!sourceTexture ? config.decoration.materialPiles || [] : []).forEach(item => {
    const [x, , z] = normalizedPoint(config, item.point);
    const pile = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, 16, 16), new THREE.MeshStandardMaterial({ color: 0x686a70, roughness: .92 }));
    pile.position.set(x, 8, z); pile.castShadow = true; group.add(pile);
  });
  return group;
}

function physicalMaterial(colorValue, roughness = .68, metalness = .04, emissive = 0x000000, emissiveIntensity = 0) {
  return new THREE.MeshStandardMaterial({ color: colorValue, roughness, metalness, emissive, emissiveIntensity });
}

function addBox(parent, size, position, material, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.rotation.y = rotationY;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWalkableBox(parent, size, position, material, rotationY = 0) {
  const mesh = addBox(parent, size, position, material, rotationY);
  mesh.userData.walkableSurface = true;
  return mesh;
}

function clearThreeGroup(group) {
  if (!group) return;
  while (group.children.length) group.remove(group.children[0]);
}

function registerPhysicsFloor(surface) {
  walkableSurfaces.push(surface);
  physicsElements.floors.push(surface);
  return surface;
}

function registerPhysicsCollider(collider) {
  colliders.push(collider);
  const isRiser = Boolean(
    collider.stepRiser
    || collider.surfaceEdge
    || collider.stepAdjacent
    || collider.stepLandingWall,
  );
  physicsElements[isRiser ? "risers" : "walls"].push(collider);
  return collider;
}

function addPhysicsMeshReplica(object, id, role = "solid") {
  if (!physicsMeshGroup || !object?.geometry) return;
  object.updateWorldMatrix(true, false);
  const replica = new THREE.Mesh(
    object.geometry.clone(),
    new THREE.MeshBasicMaterial({
      color: role === "surface" ? 0x35e5ff : 0xff5e75,
      wireframe: true,
      transparent: true,
      opacity: .24,
      depthTest: false,
    }),
  );
  replica.name = `physics-${id}`;
  replica.matrixAutoUpdate = false;
  replica.matrix.copy(object.matrixWorld);
  replica.userData.physicsOnly = true;
  replica.userData.physicsRole = role;
  replica.renderOrder = 18;
  physicsMeshGroup.add(replica);
}

function addAuthoritativeSurface({ id, buildingId = null, x, z, rotation = 0, size, height }) {
  if (![x, z, rotation, size?.[0], size?.[1], height].every(Number.isFinite)) return;
  registerPhysicsFloor({
    id,
    buildingId,
    x,
    z,
    rotation,
    halfX: size[0] / 2,
    halfZ: size[1] / 2,
    height,
    physicsSource: "authored-physics-mesh",
  });
  // 手作りの上面にも、表示された縁の高さを持つ有限の段差面を
  // 対で登録する。上面だけを置くと登り口で別の無限壁に当たり、
  // 逆に縁だけを置くと着地直後に床を失うため、床と立ち上がりを
  // 同じ座標・回転・寸法から生成する。
  registerPhysicsCollider({
    x,
    z,
    rotation,
    localHalfX: size[0] / 2,
    localHalfZ: size[1] / 2,
    halfX: size[0] / 2,
    halfZ: size[1] / 2,
    id: `${id}-edge`,
    buildingId,
    minY: 0,
    maxY: height,
    obstacleHeight: height,
    stepAdjacent: true,
    surfaceEdge: true,
    clearance: 0,
    polygon: rectanglePolygon(x, z, size, rotation),
  });
  if (physicsMeshGroup) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size[0], size[1]),
      new THREE.MeshBasicMaterial({
        color: 0x35e5ff,
        wireframe: true,
        transparent: true,
        opacity: .34,
        side: THREE.DoubleSide,
        depthTest: false,
      }),
    );
    mesh.name = `physics-surface-${id}`;
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotation;
    mesh.position.set(x, height, z);
    mesh.renderOrder = 18;
    physicsMeshGroup.add(mesh);
  }
}

function addPolygonDebugPrism(collider, material) {
  const polygon = collider.polygon;
  if (!polygon || polygon.length < 3) return null;
  const minY = Number.isFinite(collider.minY) ? collider.minY : 0;
  const maxY = Number.isFinite(collider.maxY)
    ? collider.maxY
    : (Number.isFinite(collider.obstacleHeight) ? collider.obstacleHeight : minY + 36);
  const group = new THREE.Group();
  const bottom = polygon.map(point => new THREE.Vector3(point.x, minY, point.z));
  const top = polygon.map(point => new THREE.Vector3(point.x, maxY, point.z));
  const bottomLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(bottom), material);
  const topLine = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(top), material);
  const verticalPoints = [];
  polygon.forEach((point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    verticalPoints.push(
      new THREE.Vector3(point.x, minY, point.z),
      new THREE.Vector3(point.x, maxY, point.z),
    );
    // The top/bottom loops show the exact footprint; this short edge also
    // makes a thin riser readable when it is viewed nearly edge-on.
    if (index === 0 && next) {
      verticalPoints.push(
        new THREE.Vector3(next.x, minY, next.z),
        new THREE.Vector3(next.x, maxY, next.z),
      );
    }
  });
  const verticalLine = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(verticalPoints),
    material,
  );
  group.add(bottomLine, topLine, verticalLine);
  group.renderOrder = 20;
  return group;
}

function refreshPhysicsDebugVisuals() {
  if (!physicsDebugGroup) return;
  clearThreeGroup(physicsDebugGroup);
  const solidMaterial = new THREE.MeshBasicMaterial({ color: 0xff4f6d, wireframe: true, transparent: true, opacity: .82, depthTest: false });
  const riserMaterial = new THREE.MeshBasicMaterial({ color: 0xffd34e, wireframe: true, transparent: true, opacity: .95, depthTest: false });
  const surfaceMaterial = new THREE.MeshBasicMaterial({ color: 0x37e6ff, transparent: true, opacity: .2, side: THREE.DoubleSide, depthTest: false });
  colliders.forEach(collider => {
    const exactPrism = addPolygonDebugPrism(
      collider,
      collider.stepRiser || collider.surfaceEdge ? riserMaterial : solidMaterial,
    );
    if (exactPrism) {
      physicsDebugGroup.add(exactPrism);
      return;
    }
    const half = colliderHalfSize(collider);
    const minY = Number.isFinite(collider.minY) ? collider.minY : 0;
    const maxY = Number.isFinite(collider.maxY)
      ? collider.maxY
      : (Number.isFinite(collider.obstacleHeight) ? collider.obstacleHeight : 36);
    const height = Math.max(1, maxY - minY);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(half.x * 2, height, half.z * 2),
      collider.stepRiser || collider.surfaceEdge ? riserMaterial : solidMaterial,
    );
    mesh.position.set(collider.x, minY + height / 2, collider.z);
    mesh.rotation.y = collider.rotation || 0;
    mesh.renderOrder = 20;
    physicsDebugGroup.add(mesh);
  });
  walkableSurfaces.forEach(surface => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(surface.halfX * 2, surface.halfZ * 2), surfaceMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = surface.rotation || 0;
    mesh.position.set(surface.x, surface.height + .04, surface.z);
    mesh.renderOrder = 19;
    physicsDebugGroup.add(mesh);
  });
  physicsContactMarker = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, depthTest: false }),
  );
  physicsContactMarker.renderOrder = 21;
  physicsDebugGroup.add(physicsContactMarker);
  physicsDebugGroup.visible = state.physicsDebug;
  if (physicsMeshGroup) physicsMeshGroup.visible = state.physicsDebug;
}

function updatePhysicsDebugContact() {
  if (!physicsContactMarker) return;
  physicsContactMarker.position.set(state.position.x, state.groundY + state.jumpY + .2, state.position.z);
  physicsContactMarker.visible = state.physicsDebug;
  if (physicsMeshGroup) physicsMeshGroup.visible = state.physicsDebug;
}

function convexHull(points) {
  const unique = [...new Map(points.map(point => [`${point.x.toFixed(4)}:${point.z.toFixed(4)}`, point])).values()];
  if (unique.length <= 3) return unique;
  unique.sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lower = [];
  unique.forEach(point => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
}

function rectanglePolygon(x, z, footprint, rotation = 0) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    [-footprint[0] / 2, -footprint[1] / 2],
    [footprint[0] / 2, -footprint[1] / 2],
    [footprint[0] / 2, footprint[1] / 2],
    [-footprint[0] / 2, footprint[1] / 2],
  ].map(([localX, localZ]) => ({
    x: x + cos * localX + sin * localZ,
    z: z - sin * localX + cos * localZ,
  }));
}

function meshFootprintPolygon(object) {
  const attribute = object.geometry?.getAttribute?.("position");
  if (!attribute || attribute.count < 3) return null;
  object.updateWorldMatrix(true, false);
  const points = [];
  const vertex = new THREE.Vector3();
  for (let index = 0; index < attribute.count; index += 1) {
    vertex.fromBufferAttribute(attribute, index).applyMatrix4(object.matrixWorld);
    if (Number.isFinite(vertex.x) && Number.isFinite(vertex.z)) points.push({ x: vertex.x, z: vertex.z });
  }
  const hull = convexHull(points);
  return hull.length >= 3 ? hull : null;
}

function addRotatedCollider(x, z, footprint, rotationY, id, clearance = 0, metadata = null) {
  const halfWidth = footprint[0] / 2;
  const halfDepth = footprint[1] / 2;
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const collider = {
    x,
    z,
    rotation: rotationY,
    localHalfX: halfWidth,
    localHalfZ: halfDepth,
    halfX: halfWidth * cos + halfDepth * sin,
    halfZ: halfWidth * sin + halfDepth * cos,
    id,
    clearance,
    ...(metadata || {}),
    physicsSource: "authored-physics-mesh",
    polygon: rectanglePolygon(x, z, footprint, rotationY),
  };
  registerPhysicsCollider(collider);
  if (physicsMeshGroup) {
    const physicalMinY = Number.isFinite(collider.minY) ? collider.minY : 0;
    const physicalTopY = Number.isFinite(collider.maxY)
      ? collider.maxY
      : (Number.isFinite(collider.obstacleHeight)
        ? collider.obstacleHeight
        : (Number.isFinite(collider.stepHeight) ? collider.stepHeight : 36));
    const physicalHeight = Math.max(.12, physicalTopY - physicalMinY);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(footprint[0], Math.max(.12, physicalHeight), footprint[1]),
      new THREE.MeshBasicMaterial({
        color: collider.stepRiser || collider.surfaceEdge ? 0xffd34e : 0xff4f6d,
        wireframe: true,
        transparent: true,
        opacity: .28,
        depthTest: false,
      }),
    );
    mesh.name = `physics-solid-${id}`;
    mesh.position.set(x, physicalMinY + Math.max(.12, physicalHeight) / 2, z);
    mesh.rotation.y = rotationY;
    mesh.renderOrder = 18;
    physicsMeshGroup.add(mesh);
  }
}

function scaleFootprint(footprint, scale = BUILDING_SCALE) {
  return [footprint[0] * scale, footprint[1] * scale];
}

function addLocalStructureCollider(
  x,
  z,
  rotationY,
  structureScale,
  center,
  size,
  id,
  clearance = 0,
  metadata = null,
) {
  const [localX, localZ] = center;
  const worldX = x + (Math.cos(rotationY) * localX + Math.sin(rotationY) * localZ) * structureScale;
  const worldZ = z + (-Math.sin(rotationY) * localX + Math.cos(rotationY) * localZ) * structureScale;
  addRotatedCollider(
    worldX,
    worldZ,
    scaleFootprint(size, structureScale),
    rotationY,
    id,
    clearance,
    metadata,
  );
}

function addUfoRingCollision(
  control,
  buildingId,
  localRadius,
  localMinY,
  localMaxY,
  segmentCount,
  radialThickness,
  openingHalfAngle = 0,
  idPrefix = "ring",
) {
  const scale = control.scale || BUILDING_SCALE;
  const rotationY = control.rotation || 0;
  const tangentWidth = Math.max(1.2, (Math.PI * 2 * localRadius / segmentCount) * 1.16);
  const yMin = (control.originY || 0) + localMinY * scale;
  const yMax = (control.originY || 0) + localMaxY * scale;
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = (index + .5) / segmentCount * Math.PI * 2;
    const wrappedAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
    if (openingHalfAngle > 0 && Math.abs(wrappedAngle) <= openingHalfAngle) continue;
    const centerX = localRadius * Math.cos(angle);
    const centerZ = localRadius * Math.sin(angle);
    // The rectangle's local Z axis points radially outward. This keeps the
    // authored prism aligned with the visible circular shell instead of using
    // one large square that would block the cockpit interior.
    const tangentRotation = Math.PI / 2 - angle;
    const worldCenter = ufoLocalToWorld(control, centerX, centerZ);
    addRotatedCollider(
      worldCenter.x,
      worldCenter.z,
      [tangentWidth * scale, radialThickness * scale],
      rotationY + tangentRotation,
      `${buildingId}-ufo-${idPrefix}-${index}`,
      0,
      { minY: yMin, maxY: yMax, obstacleHeight: yMax },
    );
  }
}

function addUfoStructuralColliders(control, buildingId) {
  if (!control) return;
  const openingHalfAngle = THREE.MathUtils.degToRad(28);
  // Lower and upper saucers are split into narrow outer-shell prisms. The
  // central cockpit remains open, while every visible outer shell segment is
  // solid at its actual height.
  addUfoRingCollision(control, buildingId, 39, 7.5, 16.5, 40, 5.5, openingHalfAngle, "lower-shell");
  addUfoRingCollision(control, buildingId, 37, 17.5, 22.5, 40, 5.2, openingHalfAngle, "upper-shell");

  // The transparent capsule is a curved upper shell, not a single invisible
  // box. Five concentric height bands follow the rendered hemisphere so the
  // player cannot pass through its glass wall without filling the cockpit.
  const domeBaseY = 23;
  const domeHeight = 24 * 1.16;
  const bandCount = 5;
  for (let band = 0; band < bandCount; band += 1) {
    const t0 = band / bandCount;
    const t1 = (band + 1) / bandCount;
    const t = (t0 + t1) / 2;
    const radius = 24 * Math.sqrt(Math.max(.08, 1 - t * t));
    addUfoRingCollision(
      control,
      buildingId,
      radius,
      domeBaseY + domeHeight * t0,
      domeBaseY + domeHeight * t1,
      28,
      2.8,
      0,
      `capsule-${band}`,
    );
  }
}

function addUfoClosedHatchCollider(control) {
  if (!control) return;
  const scale = control.scale || BUILDING_SCALE;
  const rotationY = control.rotation || 0;
  const localCenterX = 39;
  const localCenterZ = 0;
  const localWidth = 24;
  const localDepth = 5.5;
  const minY = (control.originY || 0) + 7.5 * scale;
  const maxY = (control.originY || 0) + 22.5 * scale;
  const id = `${control.buildingId}-ufo-closed-hatch`;
  const worldCenter = ufoLocalToWorld(control, localCenterX, localCenterZ);
  // Local X is radial at the +X doorway. Keep the hatch thin radially and
  // wide across the doorway, matching the shell opening instead of placing a
  // long bar through the craft interior.
  addRotatedCollider(
    worldCenter.x,
    worldCenter.z,
    [localDepth * scale, localWidth * scale],
    rotationY,
    id,
    0,
    { minY, maxY, obstacleHeight: maxY },
  );
  ufoRampPhysicsIds.push(id);
}

function addCloudWorkshopCollisionColliders(x, z, rotationY, structureScale, structureId, structure) {
  const [width, , depth] = structure.size;
  const wallWidth = width * .74;
  const wallDepth = depth * .69;
  const wallCenterZ = -depth * .04;
  // 正面搬入口は空け、左右の壁と奥壁だけを障害物にする。
  const sideWallWidth = width * .13;
  const sideWallX = width * .305;
  addLocalStructureCollider(x, z, rotationY, structureScale, [-sideWallX, wallCenterZ], [sideWallWidth, wallDepth], `${structureId}-left-wall`, 7);
  addLocalStructureCollider(x, z, rotationY, structureScale, [sideWallX, wallCenterZ], [sideWallWidth, wallDepth], `${structureId}-right-wall`, 7);
  addLocalStructureCollider(x, z, rotationY, structureScale, [0, wallCenterZ - wallDepth / 2 + 3], [width * .48, 6], `${structureId}-rear-wall`, 7);

  // 外周フェンスは細い線状部品として登録し、敷地全体を箱で塞がない。
  [-width * .48, width * .48].forEach((localX, index) => {
    addLocalStructureCollider(x, z, rotationY, structureScale, [localX, 0], [2.2, depth], `${structureId}-side-fence-${index}`, 8);
  });
  addLocalStructureCollider(x, z, rotationY, structureScale, [0, -depth * .48], [width, 1.5], `${structureId}-rear-fence`, 8);

  // タンク・木箱・樽は個別に当たり、空いている作業動線は残す。
  [-width * .36, width * .36].forEach((localX, index) => {
    addLocalStructureCollider(x, z, rotationY, structureScale, [localX, -depth * .24], [14.4, 14.4], `${structureId}-tank-${index}`, 8);
  });
  [[-.33, .31, 11, 10], [-.17, .33, 12, 14], [.03, .33, 10, 9], [.2, .3, 9, 12]].forEach(([rx, rz, sx, sy], index) => {
    addLocalStructureCollider(x, z, rotationY, structureScale, [width * rx, depth * rz], [sx, 11], `${structureId}-crate-${index}`, 8);
  });
  [-4, 7, 18].forEach((localX, index) => {
    addLocalStructureCollider(x, z, rotationY, structureScale, [localX, depth * .4 - index * 2], [8.2, 8.2], `${structureId}-barrel-${index}`, 8);
  });
}

function colliderClearance(collider) {
  // コライダーの矩形は表示メッシュそのものを表す。ここへ駅だけ7、
  // 一般建造物だけ12といった外周余白を足すと、見えている空間まで
  // 目に見えない壁になり、通路・段差・入口が一斉に塞がる。
  // キャラクターの実外周と構造物側の微小な接触スキンは
  // structureCollisionObb() で一元的に処理するため、追加余白は0にする。
  // 段差の立ち上がりだけは高さ判定の対象だが、平面上の余白は不要。
  return 0;
}

function getStepTransition(fromX, fromZ, toX, toZ) {
  const moveX = toX - fromX;
  const moveZ = toZ - fromZ;
  const moveLength = Math.hypot(moveX, moveZ);
  const geometricFromHeight = getGroundHeight(fromX, fromZ);
  // The character centre can leave the top-face footprint before its feet and
  // body clear the edge. Use the height it is actually standing on so a low
  // edge is read as a downward step instead of suddenly becoming a tall wall.
  // Do not use the highest nearby support here: an adjacent upper ledge must
  // never be mistaken for the character's current floor.
  const fromHeight = Math.max(geometricFromHeight, state.groundY);
  const toHeight = getGroundHeight(toX, toZ);
  if (moveLength < 1e-6) {
    return {
      fromX,
      fromZ,
      toX,
      toZ,
      fromHeight,
      toHeight,
      probeHeight: toHeight,
      ascending: false,
      descending: false,
      airborne: state.jumpVelocity !== 0 || state.jumpY > 0,
      availableJumpRise: getAvailableJumpRise(),
    };
  }
  // 体の外周が複数段へ重なる駅階段でも、移動1サンプル先にある
  // 「次の1段」だけを見る。外周半径12で探査すると3段先まで拾い、
  // 1段ずつジャンプする操作を不可能にしてしまう。
  const probeDistance = Math.min(CHARACTER_COLLISION_RADIUS, Math.max(moveLength * 1.15, .75));
  const probeX = toX + moveX / moveLength * probeDistance;
  const probeZ = toZ + moveZ / moveLength * probeDistance;
  const probeHeight = getGroundHeight(probeX, probeZ);
  // The full character footprint can touch an edge before the root reaches
  // the next walkable surface. Sample a short, bounded corridor ahead so a
  // reachable low platform is not mistaken for a solid wall. This is map-
  // independent and does not grant passage through tall structures.
  const lookAheadDistances = [PLAYER_RADIUS, PLAYER_RADIUS * 1.5, PLAYER_RADIUS * 2.25];
  const lookAheadHeight = lookAheadDistances.reduce((height, distance) => {
    const sampleX = toX + moveX / moveLength * distance;
    const sampleZ = toZ + moveZ / moveLength * distance;
    return Math.max(height, getGroundHeight(sampleX, sampleZ));
  }, Math.max(toHeight, probeHeight));
  return {
    fromX,
    fromZ,
    toX,
    toZ,
    fromHeight,
    toHeight,
    probeHeight,
    lookAheadHeight,
    // Only the surface actually reached by the movement sample defines an
    // ascent. The bounded look-ahead is used only by the adjacent-wall rule;
    // making it a global ascent would falsely block walking away from a step
    // whenever a higher roof or landing happened to be visible ahead.
    ascending: Math.max(toHeight, probeHeight) > fromHeight + .2,
    descending: Math.min(toHeight, probeHeight) < fromHeight - .2,
    airborne: state.jumpVelocity !== 0 || state.jumpY > 0,
    availableJumpRise: getAvailableJumpRise(),
  };
}

function getAvailableJumpRise() {
  // A jump is not a binary flag. At takeoff the remaining trajectory includes
  // the current upward velocity; at the apex only jumpY remains; while
  // descending no new height is available. This value is shared by the step
  // gate and the landing resolver so they cannot disagree about reachability.
  const upwardVelocity = Math.max(0, state.jumpVelocity);
  return Math.max(0, state.jumpY)
    + (upwardVelocity * upwardVelocity) / (2 * JUMP_GRAVITY);
}

function isMovingAlongCollider(transition, collider) {
  if (!transition) return false;
  const from = colliderLocalPoint(transition.fromX, transition.fromZ, collider);
  const to = colliderLocalPoint(transition.toX, transition.toZ, collider);
  const half = colliderHalfSize(collider);
  // The long local axis is the wall tangent. Movement along that axis should
  // not be rejected just because the character's real footprint is touching
  // the wall while it traverses a landing or a platform edge.
  const normalIsX = half.x < half.z;
  const moveNormal = normalIsX ? to.x - from.x : to.z - from.z;
  const moveTangent = normalIsX ? to.z - from.z : to.x - from.x;
  return Math.abs(moveNormal) <= Math.abs(moveTangent) + .001;
}

function matchingWalkableSurfaceHeight(collider, referenceHeight = state.groundY) {
  const half = colliderHalfSize(collider);
  const matchingHeights = walkableSurfaces.reduce((heights, surface) => {
    if (surface.buildingId && collider.buildingId && surface.buildingId !== collider.buildingId) return heights;
    const local = colliderLocalPoint(surface.x, surface.z, collider);
    const closeToCollider = Math.abs(local.x) <= half.x * 1.25 + 2
      && Math.abs(local.z) <= half.z * 1.25 + 2;
    if (!closeToCollider) return heights;
    // A building-wide foundation must not turn a narrow wall into a climbable
    // step. Only a top surface whose footprint is close to the collider itself
    // can describe that collider as a low ledge/deck.
    const widthRatio = surface.halfX / Math.max(half.x, .01);
    const depthRatio = surface.halfZ / Math.max(half.z, .01);
    const similarFootprint = widthRatio >= .42 && widthRatio <= 1.55
      && depthRatio >= .42 && depthRatio <= 1.55;
    if (similarFootprint) heights.push(surface.height);
    return heights;
  }, []);
  const heights = [...new Set(matchingHeights.filter(Number.isFinite))].sort((a, b) => a - b);
  const next = heights.find(height => height > referenceHeight + .24);
  if (next !== undefined) return next;
  return heights.length ? heights[heights.length - 1] : 0;
}

function canPassStepCollider(collider, transition) {
  return commonCanPassStepCollider(collider, transition);
  /* legacy step-collider solver kept below only as historical reference
  if ((collider.stepLandingWall || collider.stepAdjacent)
    && transition.fromHeight > .2
    && isMovingAlongCollider(transition, collider)) {
    return true;
  }
  // A visible surface edge must not be treated as a free passage merely
  // because a matching top surface is somewhere ahead. That allowed the
  // character to enter the side of a ledge while its centre was still on the
  // lower floor, then land with the body visibly inside the edge. Cross the
  // edge only after the current feet have cleared its real height, or after
  // the movement has actually reached the upper surface; this rule is shared
  // by every extracted building surface.
  if (collider.surfaceEdge) {
    const edgeHeight = Number.isFinite(collider.obstacleHeight) ? collider.obstacleHeight : 0;
    const currentFeetHeight = transition.fromHeight + Math.max(0, state.jumpY);
    if (transition.fromHeight + .2 >= edgeHeight || currentFeetHeight + .2 >= edgeHeight) return true;
    if (transition.descending && transition.fromHeight - Math.min(transition.toHeight, transition.probeHeight) > .2) return true;
    const selectedLanding = Math.max(transition.toHeight, transition.probeHeight);
    const selectedRise = selectedLanding - transition.fromHeight;
    // If a higher nested lip overlaps the character footprint, it belongs to
    // the next stair level. Let the current jump reach the selected lower
    // landing first; the higher lip is checked again from that new support.
    if (transition.airborne
      && selectedRise > .2
      && edgeHeight > selectedLanding + .24
      && transition.maxJumpHeight + Math.max(0, state.jumpY) + STEP_JUMP_CLEARANCE >= selectedRise) {
      return true;
    }
    // Reachable apex is not enough to cross the lip: at the instant of takeoff
    // the body is still below the visible edge.  Wait until the current feet
    // height has actually cleared it, otherwise the horizontal root enters the
    // ledge and the next landing frame embeds the character in its side.
    return transition.airborne && currentFeetHeight + STEP_JUMP_CLEARANCE >= edgeHeight;
  }
  if (!transition.ascending && !transition.descending) {
    const landingHeight = Math.max(
      transition.toHeight,
      transition.probeHeight,
      transition.lookAheadHeight ?? 0,
    );
    if (!Number.isFinite(collider.obstacleHeight)) {
      const adjacentToLanding = collider.stepAdjacent || collider.stepLandingWall;
      const landingRise = landingHeight - transition.fromHeight;
      const jumpReach = transition.maxJumpHeight + Math.max(0, state.jumpY);
      if (!transition.airborne && transition.fromHeight > .2 && adjacentToLanding) return true;
      return adjacentToLanding
        && transition.airborne
        && landingRise > .2
        && jumpReach + STEP_JUMP_CLEARANCE >= landingRise;
    }
    // A generic visible wall/body is not a stair.  Do not make it passable
    // merely because the jump apex is high enough; that lets the character
    // enter the mesh while airborne and then land inside it.  Once the feet
    // have actually cleared the top, the vertical OBB test above naturally
    // removes the contact and the character may continue over it.
    const currentFeetHeight = transition.fromHeight + Math.max(0, state.jumpY);
    return currentFeetHeight + .2 >= collider.obstacleHeight;
  }
  if (collider.stepRiser) {
    return canTraverseStepRiser(
      transition.fromX,
      transition.fromZ,
      transition.toX,
      transition.toZ,
      collider,
    );
  }
  // A landing wall can sit directly behind a real stair. When the movement
  // is an airborne, reachable climb onto that stair, the wall's broad body
  // footprint must not cancel the stair transition. This is a general
  // step-to-landing rule; it is not tied to a named door or map coordinate.
  if (collider.stepLandingWall && transition.ascending && transition.airborne) {
    const stepSurfaceHeight = Math.max(
      transition.toHeight,
      transition.probeHeight,
      transition.lookAheadHeight ?? 0,
    );
    const rise = stepSurfaceHeight - transition.fromHeight;
    const availableRise = transition.maxJumpHeight + Math.max(0, state.jumpY);
    if (rise > .2 && availableRise + STEP_JUMP_CLEARANCE >= rise) return true;
  }
  // The same landing/side walls must not trap the character on an upper
  // landing. If the sampled walkable surface is genuinely lower, let the
  // character descend without jumping; this is the downward counterpart of
  // the stair-riser rule above and applies to every marked stair wall.
  if ((collider.stepLandingWall || collider.stepAdjacent) && transition.descending) {
    const lowerSurfaceHeight = Math.min(transition.toHeight, transition.probeHeight);
    if (transition.fromHeight - lowerSurfaceHeight > .2) return true;
  }
  // Low platform lips/rails are traversable when the character is already
  // standing above their physical height. Treating these as full-height walls
  // traps the character on a landing even though the visible edge is below
  // the feet; tall pillars and building walls remain blocked by their height.
  if (Number.isFinite(collider.obstacleHeight)
    && transition.fromHeight + .2 >= collider.obstacleHeight
    && Math.max(transition.toHeight, transition.probeHeight) <= transition.fromHeight + .2) {
    return true;
  }
  // A low physical edge can be crossed only when the actual step surface is
  // high enough. A tall pillar/wall has no such exemption, so the same rule
  // applies to every station side rather than to named individual objects.
  const matchedSurfaceHeight = matchingWalkableSurfaceHeight(collider, transition.fromHeight);
  const obstacleHeight = Number.isFinite(collider.obstacleHeight)
    ? collider.obstacleHeight
    : matchedSurfaceHeight;
  if (!(obstacleHeight > 0)) return false;
  const stepSurfaceHeight = Math.max(transition.toHeight, transition.probeHeight, matchedSurfaceHeight);
  if (transition.descending) return transition.fromHeight + .2 >= obstacleHeight;
  const availableRise = transition.maxJumpHeight + Math.max(0, state.jumpY);
  return transition.ascending
    && transition.airborne
    && stepSurfaceHeight + STEP_JUMP_CLEARANCE >= obstacleHeight
    && availableRise + STEP_JUMP_CLEARANCE >= stepSurfaceHeight - transition.fromHeight; */
}

function canStandAboveAdjacentCollider(collider) {
  if (!collider.stepAdjacent && !collider.stepLandingWall) return false;
  const supportedSurfaceHeight = getSupportedGroundHeight(
    state.position.x,
    state.position.z,
  );
  const supportHeight = Math.max(
    supportedSurfaceHeight,
    getGroundHeight(state.position.x, state.position.z),
    state.groundY,
  );
  if (supportHeight <= .2) return false;
  const measuredHeight = Number.isFinite(collider.obstacleHeight)
    ? collider.obstacleHeight
    : matchingWalkableSurfaceHeight(collider);
  if (Number.isFinite(measuredHeight) && measuredHeight > .2) {
    return supportHeight + STEP_JUMP_CLEARANCE >= measuredHeight;
  }
  // Manual adjacent pieces without a height field are only ignored while the
  // character is already standing on a real raised surface. Auto-extracted
  // high walls carry obstacleHeight and remain solid through this branch.
  return !Number.isFinite(collider.obstacleHeight);
}

function movementColliderClearance(collider, transition) {
  const fromHeight = transition?.fromHeight ?? 0;
  const toHeight = transition?.toHeight ?? 0;
  const onStep = fromHeight > .2 || toHeight > .2;
  // 段差の高さより低い縁材は、その段差を越える移動だけ実面で評価する。
  // 高い柱や壁にはこの緩和を適用しないため、上空を抜けることはない。
  if (Number.isFinite(collider.obstacleHeight)
    && transition
    && (transition.ascending || transition.descending)
    && Math.max(transition.toHeight, transition.probeHeight) + STEP_JUMP_CLEARANCE >= collider.obstacleHeight) {
    return 0;
  }
  // A wall beside/behind a step is still a wall. Reducing it to the thin-riser
  // clearance lets the character's head and torso enter doors, pillars and
  // upper trim while the feet are on a stair. Keep a body-sized margin, but
  // cap adjacent decorative parts so the route itself does not become wider.
  if (collider.stepLandingWall && onStep) return colliderClearance(collider);
  if (collider.stepAdjacent && onStep) return Math.min(colliderClearance(collider), PLAYER_RADIUS);
  return colliderClearance(collider);
}

function addVisualBuildingColliders(group, id, options = {}) {
  const registerObstacles = options.registerObstacles !== false;
  const registerSurfaces = options.registerSurfaces !== false;
  const registerSurfaceEdges = options.registerSurfaceEdges !== false;
  const maximumSurfaceHeight = Number.isFinite(options.maximumSurfaceHeight)
    ? options.maximumSurfaceHeight
    : 28;
  group.updateMatrixWorld(true);
  let registered = 0;
  let surfaceIndex = 0;
  group.traverse(object => {
    if (!object.isMesh || object.visible === false || object.userData?.nonCollidable) return;
    // 物理専用レイヤーは表示メッシュの geometry / world matrix をそのまま
    // 複製する。以下の判定記述子はこの物理メッシュの部材単位で作り、
    // 表示と無関係な別座標の近似箱を新たに発生させない。
    addPhysicsMeshReplica(object, id, object.userData?.walkableSurface ? "surface" : "solid");
    const bounds = new THREE.Box3().setFromObject(object);
    if (bounds.isEmpty()) return;
    const geometry = object.geometry;
    if (!geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;
    const localCenter = geometry.boundingBox.getCenter(new THREE.Vector3());
    const localSize = geometry.boundingBox.getSize(new THREE.Vector3());
    const center = localCenter.applyMatrix4(object.matrixWorld);
    const worldScale = object.getWorldScale(new THREE.Vector3());
    const worldQuaternion = object.getWorldQuaternion(new THREE.Quaternion());
    const worldEuler = new THREE.Euler().setFromQuaternion(worldQuaternion, "YXZ");
    const orientedSize = new THREE.Vector3(
      Math.abs(localSize.x * worldScale.x),
      Math.abs(localSize.y * worldScale.y),
      Math.abs(localSize.z * worldScale.z),
    );
    const worldUp = new THREE.Vector3(0, 1, 0).applyQuaternion(worldQuaternion);
    const isHorizontal = Math.abs(worldUp.y) >= .94;
    if (![center.x, center.z, orientedSize.x, orientedSize.y, orientedSize.z, bounds.min.y, bounds.max.y].every(Number.isFinite)) return;
    if (orientedSize.x < .35 || orientedSize.z < .35) return;

    // 低い土台・デッキ・床は「壁」ではなく、全建造物で共通の歩行面として登録する。
    // 高い建物本体や手すりは下の通常コライダーへ入り、ジャンプしても抜けない。
    const footprint = orientedSize.x * orientedSize.z;
    const groundedLowBlock = bounds.min.y <= .35
      && bounds.max.y <= maximumSurfaceHeight
      && isHorizontal
      && footprint >= 36;
    const horizontalDeck = orientedSize.y <= 12.5
      && bounds.max.y <= maximumSurfaceHeight
      && isHorizontal
      && orientedSize.x >= Math.max(4, orientedSize.y * 1.4)
      && orientedSize.z >= Math.max(4, orientedSize.y * 1.4)
      && footprint >= 36;
    // Instanced decorations (for example every railway sleeper in one mesh)
    // do not describe one continuous floor and must never become a giant deck.
    // 床として扱うのは、建築側が明示した物理面だけ。低い箱や横長の
    // 装飾を自動で床へ昇格させると、何もない空間に足場が生まれる。
    const isWalkableSurface = object.userData?.walkableSurface === true;
    if (registerSurfaces && isWalkableSurface) {
      const surfaceId = `${id}-surface-${surfaceIndex++}`;
      registerPhysicsFloor({
        id: surfaceId,
        buildingId: id,
        x: center.x,
        z: center.z,
        rotation: worldEuler.y,
        halfX: orientedSize.x / 2,
        halfZ: orientedSize.z / 2,
        height: Math.max(0, bounds.max.y),
      });
      // A visible raised floor has two physical parts: its top surface and
      // the vertical edge around that surface. Previously only the top was
      // registered, so the player could enter the visible ledge from the
      // ground or from a jump and appear embedded in it. Register the exact
      // mesh footprint as a low, jumpable edge for every building uniformly.
      const surfaceHeight = Math.max(0, bounds.max.y);
      // A floor at world Y=0 has no vertical lip.  Registering its full
      // footprint as an edge creates a phantom collider over the entire
      // ground plane, so only genuinely raised visible surfaces get an edge.
      if (registerSurfaceEdges && surfaceHeight > .2 && !object.isInstancedMesh) {
        registerPhysicsCollider({
          x: center.x,
          z: center.z,
          rotation: worldEuler.y,
          localHalfX: orientedSize.x / 2,
          localHalfZ: orientedSize.z / 2,
          halfX: orientedSize.x / 2,
          halfZ: orientedSize.z / 2,
          id: `${surfaceId}-edge`,
          buildingId: id,
          minY: bounds.min.y,
          maxY: bounds.max.y,
          obstacleHeight: surfaceHeight,
          stepAdjacent: true,
           surfaceEdge: true,
           clearance: 0,
           polygon: meshFootprintPolygon(object),
         });
      }
      return;
    }

    if (!registerObstacles || object.isInstancedMesh) return;

    registerPhysicsCollider({
      x: center.x,
      z: center.z,
      rotation: worldEuler.y,
      localHalfX: orientedSize.x / 2,
      localHalfZ: orientedSize.z / 2,
      halfX: orientedSize.x / 2,
      halfZ: orientedSize.z / 2,
      id: `${id}-mesh-${registered++}`,
      buildingId: id,
      minY: bounds.min.y,
      maxY: bounds.max.y,
      obstacleHeight: Math.max(0, bounds.max.y),
      // 自動生成された細部は形状そのものを基準にし、全建物へ
      // 一律の大きな見えない壁を足さない。
      clearance: 0,
      polygon: meshFootprintPolygon(object),
    });
  });

  // ジオメトリを持たない建造物が将来追加されても、建物全体を保護する。
  if (registerObstacles && !registered) {
    const bounds = new THREE.Box3().setFromObject(group);
    if (bounds.isEmpty()) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    if (![center.x, center.z, size.x, size.z, bounds.max.y].every(Number.isFinite)) return;
    registerPhysicsCollider({
      x: center.x,
      z: center.z,
      rotation: 0,
      localHalfX: size.x / 2,
      localHalfZ: size.z / 2,
      halfX: size.x / 2,
      halfZ: size.z / 2,
      id: `${id}-fallback`,
      buildingId: id,
      minY: bounds.min.y,
      maxY: bounds.max.y,
      obstacleHeight: Math.max(0, bounds.max.y),
      clearance: 0,
      polygon: rectanglePolygon(center.x, center.z, [size.x, size.z], 0),
    });
  }
}

function colliderLocalPoint(x, z, collider) {
  const rotation = collider.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = x - collider.x;
  const dz = z - collider.z;
  return {
    x: cos * dx - sin * dz,
    z: sin * dx + cos * dz,
  };
}

function colliderHalfSize(collider) {
  return {
    x: collider.localHalfX ?? collider.halfX,
    z: collider.localHalfZ ?? collider.halfZ,
  };
}

function stationLocalPoint(x, z) {
  const entry = MAPS.sky.entry;
  const [stationX, , stationZ] = normalizedPoint(MAPS.sky, entry.point);
  const scale = BUILDING_SCALE;
  const rotation = THREE.MathUtils.degToRad(entry.rotationDeg || 0);
  const dx = (x - stationX) / scale;
  const dz = (z - stationZ) / scale;
  return {
    x: Math.cos(rotation) * dx - Math.sin(rotation) * dz,
    z: Math.sin(rotation) * dx + Math.cos(rotation) * dz,
  };
}

function surfaceLocalPoint(x, z, surface) {
  const rotation = surface.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = x - surface.x;
  const dz = z - surface.z;
  return {
    x: cos * dx - sin * dz,
    z: sin * dx + cos * dz,
  };
}

function authoredUfoRampHeightAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  let highest = null;
  ufoDoorControls.forEach(control => {
    const isOpen = (control.amount || 0) > .001 || (control.target || 0) > .001;
    if (!isOpen) return;
    const local = ufoWorldToLocal(control, x, z);
    const rampLength = control.rampLength || 84;
    const rampWidth = control.rampWidth || 18;
    const surfaceLength = rampLength - 3;
    const surfaceWidth = rampWidth - 4;
    const centerX = control.rampOpenPosition?.x || 0;
    const centerZ = control.rampOpenPosition?.z || 0;
    const localX = local.x - centerX;
    if (Math.abs(localX) > surfaceLength / 2 + .001
      || Math.abs(local.z - centerZ) > surfaceWidth / 2 + .001) return;
    const rampRotationZ = control.rampOpenRotation || 0;
    const surfaceTopY = 1.55 + .55 / 2;
    const height = Math.max(
      0,
      (control.originY || 0)
        + (control.rampOpenPosition.y
          + Math.sin(rampRotationZ) * localX
          + Math.cos(rampRotationZ) * surfaceTopY) * (control.scale || BUILDING_SCALE),
    );
    if (highest === null || height > highest) highest = height;
  });
  return highest;
}

function groundHeightCandidates(x, z) {
  const heights = [0];
  // Keep only surfaces registered by the authoritative physics layer. A low
  // plinth and the platform on top of it are separate real supports; visual
  // bounding boxes are never promoted to floors by this function.
  walkableSurfaces.forEach(surface => {
    // The UFO ramp is authored as one continuous sloped top face. Its narrow
    // debug strips are not independent steps and must never compete with that
    // face when selecting a ground height; doing so creates a false 0 -> strip
    // jump at strip boundaries and freezes walking at the visible entrance.
    if (surface.physicsSource === "ufo-opening-ramp") return;
    const local = surfaceLocalPoint(x, z, surface);
    const inside = Math.abs(local.x) < surface.halfX
      && Math.abs(local.z) < surface.halfZ;
    if (inside) heights.push(surface.height);
  });
  // The visible ramp is one continuous sloped top face. The narrow physics
  // strips remain useful for debug/support bookkeeping, but the movement and
  // landing height must also be available at every point on that face so a
  // character cannot catch on a strip boundary at the outer entrance.
  const authoredRampHeight = authoredUfoRampHeightAt(x, z);
  if (Number.isFinite(authoredRampHeight)) heights.push(authoredRampHeight);
  return [...new Set(heights.filter(Number.isFinite))].sort((a, b) => a - b);
}

function highestReachableSurface(candidates, referenceHeight, availableRise = getAvailableJumpRise()) {
  const reachable = candidates.filter(height => (
    height > referenceHeight + .24
    && height - referenceHeight <= availableRise + STEP_JUMP_CLEARANCE
  ));
  return reachable.length ? reachable[reachable.length - 1] : undefined;
}

function getGroundHeight(x, z) {
  const candidates = groundHeightCandidates(x, z);
  const referenceHeight = Number.isFinite(state.groundY) ? state.groundY : 0;
  const atCurrentRoot = Math.hypot(x - state.position.x, z - state.position.z) < .01;

  // Holding the current root on its current surface must not make it climb a
  // stacked platform merely because the upper surface overlaps the same X/Z.
  // This keeps a low landing stable until the player actually moves toward
  // the next level.
  if (atCurrentRoot) {
    const authoredCurrentRampHeight = authoredUfoRampHeightAt(x, z);
    if (Number.isFinite(authoredCurrentRampHeight)
      && authoredCurrentRampHeight > referenceHeight + .24) {
      return authoredCurrentRampHeight;
    }
    const current = candidates.find(height => Math.abs(height - referenceHeight) <= .24);
    if (current !== undefined) return current;
  }

  // Overlapping visible slabs form one stair system. During a jump, resolve
  // the highest landing that this jump can reach so a higher future lip does
  // not cancel the lower step before the feet arrive there.
  if (!atCurrentRoot && (state.jumpVelocity !== 0 || state.jumpY > 0)) {
    const reachable = highestReachableSurface(candidates, referenceHeight);
    if (reachable !== undefined) return reachable;
  }

  // For a movement sample, take only the next surface above the current feet.
  // A jump can then reach stacked ledges one at a time; a tall top surface no
  // longer hides the lower step and creates an impossible single jump.
  const next = candidates.find(height => height > referenceHeight + .24);
  if (next !== undefined) return next;

  // On descent, retain the highest surface that is still below the feet.
  const supported = candidates.filter(height => height <= referenceHeight + .24);
  return supported.length ? supported[supported.length - 1] : 0;
}

function getLandingGroundHeight(x, z, takeoffHeight) {
  const candidates = groundHeightCandidates(x, z);
  const referenceHeight = Number.isFinite(takeoffHeight) ? takeoffHeight : 0;
  const footSupportHeight = getFootSupportHeight(x, z, {
    referenceHeight,
    allowHigher: true,
    maxRise: MAX_JUMP_RISE,
  });
  if (footSupportHeight > .2) candidates.push(footSupportHeight);
  // At the exact landing frame jumpVelocity has already reached zero. The
  // landing resolver must still use the jump's actual maximum rise, otherwise
  // a reachable raised surface is discarded and the character drops through
  // it to the lower floor.
  const reachable = highestReachableSurface(candidates, referenceHeight, MAX_JUMP_RISE);
  if (reachable !== undefined) return reachable;
  const current = candidates.find(height => Math.abs(height - referenceHeight) <= .24);
  if (current !== undefined) return current;
  const supported = candidates.filter(height => height <= referenceHeight + .24);
  return supported.length ? supported[supported.length - 1] : 0;
}

function hasAuthoritativeSupportAt(x, z, height) {
  if (height <= .2) return true;
  const authoredRampHeight = authoredUfoRampHeightAt(x, z);
  if (Number.isFinite(authoredRampHeight)
    && Math.abs(authoredRampHeight - height) <= .24) return true;
  const centerSupported = walkableSurfaces.some(surface => (
    Math.abs(surface.height - height) <= .24
    && (() => {
      const local = surfaceLocalPoint(x, z, surface);
      return Math.abs(local.x) < surface.halfX && Math.abs(local.z) < surface.halfZ;
    })()
  ));
  if (centerSupported) return true;
  // A landing is valid when either foot actually overlaps the visible top
  // surface. The root/center is not the support point for a character whose
  // foot is already on the edge of a platform.
  return Math.abs(getFootSupportHeight(x, z, {
    referenceHeight: height,
    allowHigher: false,
  }) - height) <= .24;
}

function getCharacterFootBoxes(rootX = state.position.x, rootZ = state.position.z) {
  const rigFeet = character?.userData?.walkRig?.feet ?? [];
  if (!character || !rigFeet.length) return [];
  // The walk pose is updated before support resolution. The model may still
  // carry the previous frame's world position, so translate each measured
  // foot box to the physics root being resolved instead of measuring a stale
  // map position.
  character.updateMatrixWorld(true);
  const offsetX = rootX - character.position.x;
  const offsetZ = rootZ - character.position.z;
  const physicsRootY = state.groundY + state.jumpY;
  const offsetY = physicsRootY - character.position.y;
  return rigFeet.map(({ part }) => {
    const bounds = new THREE.Box3().setFromObject(part);
    if (bounds.isEmpty()) return null;
    return {
      minX: bounds.min.x + offsetX,
      maxX: bounds.max.x + offsetX,
      minZ: bounds.min.z + offsetZ,
      maxZ: bounds.max.z + offsetZ,
      minY: bounds.min.y + offsetY,
      maxY: bounds.max.y + offsetY,
    };
  }).filter(Boolean);
}

function footOverlapsSurface(box, surface) {
  const footObb = {
    x: (box.minX + box.maxX) / 2,
    z: (box.minZ + box.maxZ) / 2,
    halfX: Math.max(.01, (box.maxX - box.minX) / 2),
    halfZ: Math.max(.01, (box.maxZ - box.minZ) / 2),
    axes: obbAxes(0),
  };
  const surfacePolygon = rectanglePolygon(
    surface.x,
    surface.z,
    [surface.halfX * 2, surface.halfZ * 2],
    surface.rotation || 0,
  );
  return Boolean(polygonContact(footObb, surfacePolygon)?.intersects);
}

function getFootSupportSurface(
  rootX = state.position.x,
  rootZ = state.position.z,
  options = {},
) {
  const referenceHeight = Number.isFinite(options.referenceHeight)
    ? options.referenceHeight
    : (Number.isFinite(state.groundY) ? state.groundY : 0);
  const allowHigher = options.allowHigher === true;
  const maxRise = Number.isFinite(options.maxRise)
    ? options.maxRise
    : getAvailableJumpRise();
  const boxes = getCharacterFootBoxes(rootX, rootZ);
  if (!boxes.length) return null;
  return walkableSurfaces.reduce((best, surface) => {
    if (surface.physicsSource === "ufo-opening-ramp") return best;
    if (!Number.isFinite(surface.height)) return best;
    if (!boxes.some(box => footOverlapsSurface(box, surface))) return best;
    const delta = surface.height - referenceHeight;
    if (!allowHigher && Math.abs(delta) > .24) return best;
    if (allowHigher && delta > .24 && delta > maxRise + STEP_JUMP_CLEARANCE) return best;
    return !best || surface.height > best.height ? surface : best;
  }, null);
}

function getFootSupportHeight(
  rootX = state.position.x,
  rootZ = state.position.z,
  options = {},
) {
  const authoredRampHeight = authoredUfoRampHeightAt(rootX, rootZ);
  if (Number.isFinite(authoredRampHeight)) {
    const referenceHeight = Number.isFinite(options.referenceHeight)
      ? options.referenceHeight
      : (Number.isFinite(state.groundY) ? state.groundY : 0);
    const allowHigher = options.allowHigher === true;
    const maxRise = Number.isFinite(options.maxRise) ? options.maxRise : getAvailableJumpRise();
    const rise = authoredRampHeight - referenceHeight;
    if ((allowHigher && rise <= maxRise + STEP_JUMP_CLEARANCE)
      || (!allowHigher && Math.abs(rise) <= .24)) {
      return authoredRampHeight;
    }
  }
  return getFootSupportSurface(rootX, rootZ, options)?.height ?? 0;
}

function getSupportedGroundHeight(x, z, supportRadius = CHARACTER_COLLISION_RADIUS) {
  // The support point is the actual pair of feet, not the character root.
  // Either foot may remain on a raised top while the centre is already past
  // its edge; keep that surface until both feet have left it.
  const footSupport = getFootSupportHeight(x, z, {
    referenceHeight: state.groundY,
    allowHigher: false,
  });
  return Math.max(footSupport, getGroundHeight(x, z));
}

function canTraverseStepRiser(fromX, fromZ, toX, toZ, collider) {
  // 立ち上がりも他の段差と同じ共通判定を使う。旧実装の駅専用探査は
  // その場で別の高さを選び、同じ場所を登れたり登れなかったりさせた。
  return commonCanPassStepCollider(collider, getStepTransition(fromX, fromZ, toX, toZ));
  /* legacy step-riser solver kept below only as historical reference
  if (!collider.stepRiser || state.map !== "sky") return false;
  const geometricFromHeight = getGroundHeight(fromX, fromZ);
  const fromHeight = Math.max(geometricFromHeight, state.groundY);
  const toHeight = getGroundHeight(toX, toZ);
  const moveX = toX - fromX;
  const moveZ = toZ - fromZ;
  const moveLength = Math.hypot(moveX, moveZ);
  // ここも1回の移動で次の1段だけを調べる。プレイヤー半径をそのまま
  // 探査距離にすると、白レンの外周が重なる複数の立ち上がりを一括で
  // 参照してしまう。
  const probeDistance = Math.min(PLAYER_RADIUS, Math.max(moveLength * 1.15, .75));
  const probeX = moveLength > 1e-6 ? toX + moveX / moveLength * probeDistance : toX;
  const probeZ = moveLength > 1e-6 ? toZ + moveZ / moveLength * probeDistance : toZ;
  const probeHeight = getGroundHeight(probeX, probeZ);
  const fromLocal = colliderLocalPoint(fromX, fromZ, collider);
  const toLocal = colliderLocalPoint(toX, toZ, collider);
  const half = colliderHalfSize(collider);
  const normalIsX = half.x < half.z;
  const fromNormal = normalIsX ? fromLocal.x : fromLocal.z;
  const moveNormal = (normalIsX ? toLocal.x - fromLocal.x : toLocal.z - fromLocal.z);
  const moveTangent = (normalIsX ? toLocal.z - fromLocal.z : toLocal.x - fromLocal.x);
  // A riser is a wall only when the character crosses its normal direction.
  // Walking sideways along a stair, or moving away from its face, must remain
  // possible even while the full character footprint overlaps the thin riser.
  if (Math.abs(moveNormal) <= Math.abs(moveTangent) + .001) return true;
  if (fromNormal * moveNormal > .001) return true;
  // When the feet are already on this riser's top height, crossing it means
  // stepping down/along the same level, not climbing the wall again.
  if (Number.isFinite(collider.stepHeight)
    && fromHeight + .2 >= collider.stepHeight
    && Math.max(toHeight, probeHeight) <= fromHeight + .2) return true;
  // The character's depth can overlap more than one stair riser at once.
  // Only the first raised surface in the movement direction is relevant;
  // deeper, higher risers must wait until the character has reached their
  // preceding step instead of blocking the current jump.
  const nextSurfaceHeight = Math.max(toHeight, probeHeight);
  if (Number.isFinite(collider.stepHeight) && collider.stepHeight > nextSurfaceHeight + .2) return true;
  // 判定余白の手前側にいるフレームでも、これから越える段の高さを
  // 参照する。from/to がまだ同じ平面に見える瞬間だけを理由に
  // ジャンプを止めると、段差の実面へ到達する前に固定されてしまう。
  const stepRise = Number.isFinite(collider.stepHeight)
    ? Math.max(0, collider.stepHeight - fromHeight)
    : 0;
  const heightDelta = Math.max(
    Math.abs(toHeight - fromHeight),
    Math.abs(probeHeight - fromHeight),
    stepRise,
  );
  // 下りは段差から降りるだけなので通過できる。
  if (toHeight < fromHeight || probeHeight < fromHeight - .2) return true;
  // 上りはジャンプ入力中だけ通過を許可する。ジャンプ開始直後は
  // jumpY がまだ0に近いため、現在高さだけで判定すると最初の移動
  // フレームで立ち上がりに固定されてしまう。最大到達高度を超える
  // 段差は引き続き通過させない。
  const airborne = state.jumpVelocity !== 0 || state.jumpY > 0;
  const maxJumpHeight = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * JUMP_GRAVITY);
  return airborne && maxJumpHeight + STEP_JUMP_CLEARANCE >= heightDelta; */
}

function commonCanPassStepCollider(collider, transition) {
  if (!transition) return false;
  const currentFeetHeight = transition.fromHeight + Math.max(0, state.jumpY);
  const matchedSurfaceHeight = matchingWalkableSurfaceHeight(collider, transition.fromHeight);
  const obstacleHeight = Number.isFinite(collider.obstacleHeight)
    ? collider.obstacleHeight
    : matchedSurfaceHeight;

  // 下りはジャンプ不要。現在の足元より低い実在面へ移るだけなら通す。
  // ここで未定義の targetHeight を参照すると、段差を下りる瞬間に
  // 共通物理ループが中断して着地・移動が壊れるため、実際にサンプル
  // された低い面から判定する。
  const lowerTargetHeight = Math.min(
    transition.toHeight,
    transition.probeHeight ?? transition.toHeight,
  );
  if (transition.descending && lowerTargetHeight < transition.fromHeight - .2) return true;

  // 上段に立った後の低い縁材・手すりは、足元より低ければ通過可能。
  // 地上から同じ判定を通すことは許可しない。
  if (transition.fromHeight > .2
    && Number.isFinite(obstacleHeight)
    && obstacleHeight <= currentFeetHeight + STEP_JUMP_CLEARANCE) return true;

  // 高さ情報のない壁・柱は段差ではない。見た目の高さを推測して
  // ジャンプを許可する旧例外は廃止し、明示された段差だけを対象にする。
  const isStep = Boolean(collider.stepRiser || collider.surfaceEdge || collider.stepAdjacent || collider.stepLandingWall);
  if (!isStep || !Number.isFinite(obstacleHeight)) return false;

  const rise = Math.max(0, obstacleHeight - transition.fromHeight);
  const availableRise = transition.availableJumpRise ?? getAvailableJumpRise();
  if (!transition.airborne || rise > availableRise + STEP_JUMP_CLEARANCE) return false;

  // ジャンプ中は、足が段の上面へ到達する前でも、現在速度から算出した
  // 軌道が段の高さを越えられるなら立ち上がりを通過できる。ここで止める
  // と段差の外周が先に身体へ触れて上面へ到達できなくなる。
  return currentFeetHeight + STEP_JUMP_CLEARANCE >= obstacleHeight
    || availableRise + transition.fromHeight + STEP_JUMP_CLEARANCE >= obstacleHeight;
}

function isColliderPassage(x, z, collider) {
  if (!collider.passages?.length) return false;
  const scale = collider.localScale || 1;
  const local = colliderLocalPoint(x, z, { ...collider, rotation: collider.localRotation ?? collider.rotation ?? 0 });
  const localX = local.x / scale;
  const localZ = local.z / scale;
  return collider.passages.some(passage => (
    Math.abs(localX - passage.center[0]) < passage.size[0] / 2
    && Math.abs(localZ - passage.center[1]) < passage.size[1] / 2
  ));
}

function setLabelWorldScale(label, parentScale = 1) {
  label.scale.set(1.35 / parentScale, .58 / parentScale, 1 / parentScale);
}

function movePlayerOutsideBuildingColliders(fromX = state.position.x, fromZ = state.position.z, options = {}) {
  // Gameplay movement must never be corrected by moving the root in the
  // opposite direction. That reads as a bounce, especially beside a step,
  // and is unpleasant in first- and third-person camera modes. This helper
  // is therefore opt-in: only map rebuild/spawn recovery may use SAT
  // depenetration. Normal movement is rejected by isBlocked() instead.
  if (options.allowStaticRecovery !== true) return false;
  const config = MAPS[state.map];
  const worldLimitX = config.world.width / 2 - PLAYER_RADIUS;
  const worldLimitZ = config.world.depth / 2 - PLAYER_RADIUS;
  const movedFrom = Math.hypot(state.position.x - fromX, state.position.z - fromZ) > .001;
  const movementTransition = movedFrom
    ? getStepTransition(fromX, fromZ, state.position.x, state.position.z)
    : null;
  let adjusted = false;
  for (let pass = 0; pass < 24; pass += 1) {
    let deepest = null;
    colliders.forEach(collider => {
      // Step risers are crossed conditionally by the jump/height solver. A
      // static depenetration pass must not turn their upper airspace into a
      // permanent wall after the movement solver has accepted the jump.
      if (collider.stepRiser) return;
      // A wall attached to a stair is intentionally traversable during the
      // same accepted up/down step transition. Do not immediately push the
      // character back into the previous floor in the depenetration pass.
      if (movementTransition && canPassStepCollider(collider, movementTransition)) return;
      // Once the feet reach a raised walkable surface, a low adjacent edge
      // must not push the character back down on the next frame. This must
      // also hold while the player keeps moving during the landing; otherwise
      // the accepted jump is visibly undone by depenetration one frame later.
      // The rule applies uniformly to every building's step geometry, while
      // high auto-extracted walls still carry obstacleHeight and remain solid.
      if (canStandAboveAdjacentCollider(collider)) return;
      if (isColliderPassage(state.position.x, state.position.z, collider)) return;
      const contact = characterColliderContact(state.position.x, state.position.z, collider);
      if (!contact.intersects) return;
      if (!deepest || contact.penetration > deepest.contact.penetration) {
        deepest = { collider, contact };
      }
    });
    if (!deepest) break;
    // The SAT minimum-translation axis points away from the structure. Moving
    // along it clears the real body silhouette without enlarging unrelated
    // corridors or treating the entire station as one box.
    state.position.x += deepest.contact.axis.x * (deepest.contact.penetration + .08);
    state.position.z += deepest.contact.axis.z * (deepest.contact.penetration + .08);
    adjusted = true;
    state.position.x = clamp(state.position.x, -worldLimitX, worldLimitX);
    state.position.z = clamp(state.position.z, -worldLimitZ, worldLimitZ);
  }
  return adjusted;
}

function pointInsideCollider(x, z, collider, margin = 0) {
  const local = colliderLocalPoint(x, z, collider);
  const half = colliderHalfSize(collider);
  const outsideX = Math.max(Math.abs(local.x) - half.x, 0);
  const outsideZ = Math.max(Math.abs(local.z) - half.z, 0);
  if (outsideX === 0 && outsideZ === 0) return true;
  return outsideX * outsideX + outsideZ * outsideZ < margin * margin;
}

function colliderPenetration(x, z, collider, margin = 0) {
  const local = colliderLocalPoint(x, z, collider);
  const half = colliderHalfSize(collider);
  const distanceX = Math.abs(local.x) - half.x;
  const distanceZ = Math.abs(local.z) - half.z;
  const outsideDistance = Math.hypot(Math.max(distanceX, 0), Math.max(distanceZ, 0));
  const insideDistance = Math.min(Math.max(distanceX, distanceZ), 0);
  const signedDistance = outsideDistance + insideDistance;
  return Math.max(0, margin - signedDistance);
}

// 終点だけの判定では、薄い柱や段差の立ち上がりを一度の移動で
// 飛び越えることがある。OBBをローカル矩形へ戻し、移動線分と
// 交差したかをスラブ法で判定して、実際に通過した衝突面を拾う。
function segmentIntersectsCollider(fromX, fromZ, toX, toZ, collider, margin = 0) {
  const from = colliderLocalPoint(fromX, fromZ, collider);
  const to = colliderLocalPoint(toX, toZ, collider);
  const half = colliderHalfSize(collider);
  const minX = -half.x - margin;
  const maxX = half.x + margin;
  const minZ = -half.z - margin;
  const maxZ = half.z + margin;
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  let tMin = 0;
  let tMax = 1;
  const axes = [
    [from.x, dx, minX, maxX],
    [from.z, dz, minZ, maxZ],
  ];
  for (const [origin, direction, min, max] of axes) {
    if (Math.abs(direction) < 1e-8) {
      if (origin < min || origin > max) return false;
      continue;
    }
    const inverse = 1 / direction;
    let near = (min - origin) * inverse;
    let far = (max - origin) * inverse;
    if (near > far) [near, far] = [far, near];
    tMin = Math.max(tMin, near);
    tMax = Math.min(tMax, far);
    if (tMin > tMax) return false;
  }
  return tMax >= 0 && tMin <= 1;
}

function obbAxes(rotation = 0) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return [
    { x: cos, z: -sin },
    { x: sin, z: cos },
  ];
}

function characterCollisionObb(rootX, rootZ) {
  const footprint = character?.userData?.collisionFootprint ?? {
    offsetX: 0,
    offsetZ: 0,
    halfX: CHARACTER_COLLISION_RADIUS,
    halfZ: CHARACTER_COLLISION_RADIUS,
  };
  // Use the model's displayed rotation, not a world-axis circle.  This keeps
  // narrow approaches usable while still preventing the head, hands and cape
  // from entering a wall when their real side is facing it.
  const rotation = character?.rotation?.y ?? state.heading;
  const axes = obbAxes(rotation);
  return {
    x: rootX + axes[0].x * footprint.offsetX + axes[1].x * footprint.offsetZ,
    z: rootZ + axes[0].z * footprint.offsetX + axes[1].z * footprint.offsetZ,
    halfX: footprint.halfX,
    halfZ: footprint.halfZ,
    axes,
  };
}

function structureCollisionObb(collider) {
  const half = colliderHalfSize(collider);
  const skin = collider.stepRiser ? .04 : CHARACTER_STRUCTURE_CONTACT_SKIN;
  return {
    x: collider.x,
    z: collider.z,
    halfX: half.x + skin,
    halfZ: half.z + skin,
    axes: obbAxes(collider.rotation || 0),
  };
}

function obbProjectionRadius(obb, axis) {
  return obb.halfX * Math.abs(obb.axes[0].x * axis.x + obb.axes[0].z * axis.z)
    + obb.halfZ * Math.abs(obb.axes[1].x * axis.x + obb.axes[1].z * axis.z);
}

function obbContact(first, second) {
  const delta = { x: first.x - second.x, z: first.z - second.z };
  let minimumOverlap = Infinity;
  let minimumAxis = { x: 1, z: 0 };
  const axes = [...first.axes, ...second.axes];
  for (const candidate of axes) {
    const centerDistance = delta.x * candidate.x + delta.z * candidate.z;
    const overlap = obbProjectionRadius(first, candidate)
      + obbProjectionRadius(second, candidate)
      - Math.abs(centerDistance);
    // Touching surfaces are valid; only actual overlap is penetration.
    if (overlap <= 0) return { intersects: false, penetration: 0, axis: minimumAxis };
    if (overlap < minimumOverlap) {
      minimumOverlap = overlap;
      const direction = centerDistance < 0 ? -1 : 1;
      minimumAxis = { x: candidate.x * direction, z: candidate.z * direction };
    }
  }
  return { intersects: true, penetration: minimumOverlap, axis: minimumAxis };
}

function obbCorners(obb) {
  const local = [
    [-obb.halfX, -obb.halfZ],
    [obb.halfX, -obb.halfZ],
    [obb.halfX, obb.halfZ],
    [-obb.halfX, obb.halfZ],
  ];
  return local.map(([x, z]) => ({
    x: obb.x + obb.axes[0].x * x + obb.axes[1].x * z,
    z: obb.z + obb.axes[0].z * x + obb.axes[1].z * z,
  }));
}

function polygonAxes(points) {
  const axes = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const dx = next.x - current.x;
    const dz = next.z - current.z;
    const length = Math.hypot(dx, dz);
    if (length > 1e-6) axes.push({ x: -dz / length, z: dx / length });
  }
  return axes;
}

function projectPoints(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  points.forEach(point => {
    const value = point.x * axis.x + point.z * axis.z;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  return { min, max };
}

function polygonContact(first, polygon, margin = 0) {
  if (!polygon || polygon.length < 3) return null;
  const firstPoints = obbCorners(first);
  const axes = [...first.axes, ...polygonAxes(polygon)];
  let minimumOverlap = Infinity;
  let minimumAxis = { x: 1, z: 0 };
  const center = polygon.reduce((sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }), { x: 0, z: 0 });
  center.x /= polygon.length;
  center.z /= polygon.length;
  axes.forEach(axis => {
    const firstProjection = projectPoints(firstPoints, axis);
    const polygonProjection = projectPoints(polygon, axis);
    const overlap = Math.min(firstProjection.max, polygonProjection.max + margin)
      - Math.max(firstProjection.min, polygonProjection.min - margin);
    if (overlap <= 0) {
      minimumOverlap = -Infinity;
      return;
    }
    if (overlap < minimumOverlap) {
      minimumOverlap = overlap;
      const centerDistance = (first.x - center.x) * axis.x + (first.z - center.z) * axis.z;
      const direction = centerDistance < 0 ? -1 : 1;
      minimumAxis = { x: axis.x * direction, z: axis.z * direction };
    }
  });
  if (minimumOverlap === -Infinity) return { intersects: false, penetration: 0, axis: minimumAxis };
  return { intersects: true, penetration: minimumOverlap, axis: minimumAxis };
}

function characterColliderContact(x, z, collider, groundY = state.groundY, jumpY = state.jumpY) {
  const footprint = character?.userData?.collisionFootprint;
  const characterMinY = groundY + jumpY + (footprint?.minY ?? 0);
  const characterMaxY = groundY + jumpY + (footprint?.maxY ?? 30);
  const colliderMinY = Number.isFinite(collider.minY) ? collider.minY : -Infinity;
  const colliderMaxY = Number.isFinite(collider.maxY) ? collider.maxY : Infinity;
  if (characterMaxY <= colliderMinY + .02 || characterMinY >= colliderMaxY - .02) {
    return { intersects: false, penetration: 0, axis: { x: 1, z: 0 } };
  }
  const characterObb = characterCollisionObb(x, z);
  if (collider.polygon?.length >= 3) {
    return polygonContact(characterObb, collider.polygon, collider.stepRiser ? .04 : CHARACTER_STRUCTURE_CONTACT_SKIN);
  }
  return obbContact(characterObb, structureCollisionObb(collider));
}

function isHigherOverlappingSurfaceEdge(collider, x, z, groundY) {
  // A building can contain several real, nested floor slabs: the outer step,
  // its next landing, and the upper landing. Once the character has landed on
  // the lower visible slab, the side of the higher slab is not a new wall at
  // that landing height. Treating it as one made the landing guard immediately
  // reject a valid jump and sent the character back to the previous floor.
  // Movement itself still evaluates that higher edge in isBlocked(), so the
  // next jump is required to climb it; this exception is only for support and
  // penetration checks at the currently occupied lower surface.
  if (!collider.surfaceEdge || !(groundY > .2) || !Number.isFinite(collider.obstacleHeight)) return false;
  if (collider.obstacleHeight <= groundY + .24) return false;
  const support = walkableSurfaces.find(surface => (
    `${surface.id}-edge` !== collider.id
    && Math.abs(surface.height - groundY) <= .24
  ));
  if (!support) return false;
  const local = surfaceLocalPoint(x, z, support);
  return Math.abs(local.x) < support.halfX && Math.abs(local.z) < support.halfZ;
}

function hasGroundCollisionAt(x, z, groundY) {
  return colliders.some(collider => {
    if (isColliderPassage(x, z, collider)) return false;
    if (isHigherOverlappingSurfaceEdge(collider, x, z, groundY)) return false;
    return characterColliderContact(x, z, collider, groundY, 0).intersects;
  });
}

function groundCollisionPenetrationAt(x, z, groundY, jumpY = state.jumpY) {
  return colliders.reduce((maximum, collider) => {
    if (isColliderPassage(x, z, collider)) return maximum;
    if (isHigherOverlappingSurfaceEdge(collider, x, z, groundY)) return maximum;
    // The final movement guard runs during jumps too. Evaluating an airborne
    // character at jumpY=0 made every raised floor look like a ground-level
    // penetration, so a valid jump was reverted on every frame before the
    // feet could clear the visible step.
    const contact = characterColliderContact(x, z, collider, groundY, jumpY);
    return contact.intersects ? Math.max(maximum, contact.penetration) : maximum;
  }, 0);
}

function ensureSpawnCameraClearance() {
  // Camera clearance is view-only.  Never move the character to make the
  // third-person camera fit: doing so silently changed the requested build
  // position (and could place the UFO pad at a different point).  The
  // character position is owned exclusively by movement/jump physics.
  return;
}

function cameraSegmentEntry(originX, originZ, targetX, targetZ, collider, margin = 5) {
  const rotation = collider.rotation || 0;
  const origin = colliderLocalPoint(originX, originZ, collider);
  const target = colliderLocalPoint(targetX, targetZ, collider);
  const localOriginX = origin.x;
  const localOriginZ = origin.z;
  const deltaX = target.x - origin.x;
  const deltaZ = target.z - origin.z;
  const half = colliderHalfSize(collider);
  let entry = 0;
  let exit = 1;
  const axes = [
    [localOriginX, deltaX, -half.x - margin, half.x + margin],
    [localOriginZ, deltaZ, -half.z - margin, half.z + margin],
  ];
  for (const [origin, delta, min, max] of axes) {
    if (Math.abs(delta) < 1e-6) {
      if (origin < min || origin > max) return null;
      continue;
    }
    let near = (min - origin) / delta;
    let far = (max - origin) / delta;
    if (near > far) [near, far] = [far, near];
    entry = Math.max(entry, near);
    exit = Math.min(exit, far);
    if (entry > exit) return null;
  }
  return exit >= 0 && entry <= 1 ? Math.max(0, entry) : null;
}

function keepThirdPersonCameraOutsideBuildings(target, desired) {
  // A third-person camera must keep the user's selected orbit distance. The
  // old obstacle-avoidance pass shortened this vector near walls, which made
  // the view jump into an unintended close-up and made the camera angle feel
  // unstable. Buildings may occlude the view; they must not silently change
  // the selected camera distance or orbit angles.
  return desired;
}

function makeBarrelRoofGeometry(width, depth, rise, segments = 28) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const x = -width / 2 + width * t;
    const y = Math.sin(t * Math.PI) * rise;
    positions.push(x, y, -depth / 2, x, y, depth / 2);
    uvs.push(t, 0, t, 1);
  }
  for (let index = 0; index < segments; index += 1) {
    const a = index * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    // 上面から見た時に表面になる頂点順。逆順だと屋根が透明に欠け、
    // 駅全体が平らな箱に見えてしまう。
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addBarrelRoofGrid(group, centerX, centerY, centerZ, width, depth, rise, material) {
  const makeArc = z => {
    const points = [];
    for (let index = 0; index <= 24; index += 1) {
      const t = index / 24;
      points.push(new THREE.Vector3(
        centerX - width / 2 + width * t,
        centerY + Math.sin(t * Math.PI) * rise + .45,
        z,
      ));
    }
    const rib = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, .65, 8, false),
      material,
    );
    rib.castShadow = true;
    group.add(rib);
  };
  [-.5, -.25, 0, .25, .5].forEach(rate => makeArc(centerZ + depth * rate));
  [-.36, -.18, 0, .18, .36].forEach(rate => {
    const x = centerX + width * rate;
    const t = rate + .5;
    const y = centerY + Math.sin(t * Math.PI) * rise + .45;
    addBox(group, [1.1, 1.1, depth], [x, y, centerZ], material);
  });
}

function addFrontArch(group, centerX, baseY, z, radius, material, tubeRadius = .8) {
  const points = [];
  for (let index = 0; index <= 28; index += 1) {
    const angle = Math.PI - (index / 28) * Math.PI;
    points.push(new THREE.Vector3(
      centerX + Math.cos(angle) * radius,
      baseY + Math.sin(angle) * radius,
      z,
    ));
  }
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, tubeRadius, 9, false),
    material,
  );
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addStationWindow(group, x, y, z, width, height, face, glass, gold) {
  const front = face === "front";
  addBox(group, front ? [width, height, .75] : [.75, height, width], [x, y, z], glass);
  const frameDepth = 1.05;
  [-1, 1].forEach(side => {
    addBox(
      group,
      front ? [.75, height + 1.5, frameDepth] : [frameDepth, height + 1.5, .75],
      front ? [x + side * width / 2, y, z + .18] : [x + .18, y, z + side * width / 2],
      gold,
    );
  });
  addBox(
    group,
    front ? [width + 1.4, .75, frameDepth] : [frameDepth, .75, width + 1.4],
    [x, y, z],
    gold,
  );
  const awning = addBox(
    group,
    front ? [width + 3, 1.2, 5] : [5, 1.2, width + 3],
    front ? [x, y + height / 2 + 2, z + 2] : [x + 2, y + height / 2 + 2, z],
    glass,
  );
  if (front) awning.rotation.x = -.24;
  else awning.rotation.z = .24;
}

function addStationLantern(group, x, y, z, dark, gold, warm) {
  addBox(group, [1.1, 9, 1.1], [x, y + 3, z], dark);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 1.85, 5.8, 10), warm);
  glow.position.set(x, y, z);
  glow.castShadow = true;
  group.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(3, 2.8, 10), gold);
  cap.position.set(x, y + 4.3, z);
  cap.castShadow = true;
  group.add(cap);
}

function addStationFinial(group, x, y, z, stone, gold, height = 13) {
  addBox(group, [5.5, 3, 5.5], [x, y + 1.5, z], stone);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.3, height * .58, 12), gold);
  stem.position.set(x, y + 3 + height * .29, z);
  stem.castShadow = true;
  group.add(stem);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(2.25, 14, 10), gold);
  orb.position.set(x, y + height * .72, z);
  orb.castShadow = true;
  group.add(orb);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.5, height * .28, 10), gold);
  tip.position.set(x, y + height * .91, z);
  tip.castShadow = true;
  group.add(tip);
}

function addStationRailing(group, startX, endX, z, y, stone, gold) {
  addBox(group, [endX - startX, 1.2, 1.2], [(startX + endX) / 2, y + 6.2, z], gold);
  for (let x = startX; x <= endX + .01; x += 7) {
    addBox(group, [1.3, 7, 1.3], [x, y + 3.5, z], stone);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 8), gold);
    orb.position.set(x, y + 7.2, z);
    group.add(orb);
  }
}

function addStationBench(group, x, y, z, wood, gold) {
  addBox(group, [20, 1.8, 5.6], [x, y + 5.4, z], wood);
  addBox(group, [20, 7.4, 1.4], [x, y + 8.8, z - 2.2], wood);
  [-8, 8].forEach(dx => {
    addBox(group, [1.3, 6, 1.3], [x + dx, y + 2.6, z], gold);
    addBox(group, [1.2, 1.2, 7], [x + dx, y + 1, z], gold);
  });
}

function buildSkyStation(entry) {
  const group = new THREE.Group();
  const [width, depth] = entry.platformSize;
  const stone = physicalMaterial(0xead9bb, .73, .03);
  const stoneLight = physicalMaterial(0xffedd1, .66, .02);
  const darkStone = physicalMaterial(0xa38d70, .82, .02);
  const glass = physicalMaterial(0x148f9d, .16, .3, 0x0d6a73, .24);
  glass.side = THREE.DoubleSide;
  const gold = physicalMaterial(0xe2aa27, .25, .78);
  const door = physicalMaterial(0x8a501c, .44, .12);
  const blue = physicalMaterial(0x14539e, .45, .2);
  const green = physicalMaterial(0x397742, .72, .02);
  const wood = physicalMaterial(0x915327, .64, .08);
  const flowerPink = physicalMaterial(0xff78a8, .5, .02, 0x6c1733, .12);
  const flowerYellow = physicalMaterial(0xffd447, .48, .02, 0x674c00, .1);
  const warm = physicalMaterial(0xffd36a, .22, .08, 0xff9d22, 1.8);

  // 周囲の石床と建物基礎。公式レイヤーの占有範囲をそのまま使う。
  addWalkableBox(group, [width, 3.6, depth], [0, 1.8, 0], stone);
  addWalkableBox(group, [92, 2.2, 63], [0, 4.6, -1], darkStone);
  addBox(group, [86, 28, 54], [0, 19, -2], stone);
  addBox(group, [88, 2.2, 56], [0, 32.8, -2], gold);
  addWalkableBox(group, [88, 2.4, 56], [0, 6.1, -2], stoneLight);

  // 左右の大きなガラス・バレル屋根。
  [-22, 22].forEach(px => {
    const roof = new THREE.Mesh(makeBarrelRoofGeometry(42, 56, 18), glass);
    roof.position.set(px, 33.7, -2);
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
    addBarrelRoofGrid(group, px, 33.7, -2, 42, 56, 18, gold);
  });

  // 正面の時計塔。元画像同様、中央だけ前へ張り出す。
  addBox(group, [34, 47, 18], [0, 29.5, 20], stoneLight);
  addBox(group, [38, 3, 20], [0, 53.2, 20], gold);
  addFrontArch(group, 0, 42, 29.5, 17, stoneLight, 3.4);
  addFrontArch(group, 0, 42, 30.4, 13.5, gold, 1.3);

  // 屋上中央テラスと後方の小屋根。
  addBox(group, [38, 2.2, 30], [0, 48, -9], blue);
  for (let x = -17; x <= 17; x += 8.5) addBox(group, [1, 1, 30], [x, 49.3, -9], gold);
  for (let z = -23; z <= 5; z += 7) addBox(group, [38, 1, 1], [0, 49.3, z], gold);
  addStationRailing(group, -18, 18, -24, 49, stone, gold);
  addStationRailing(group, -18, 18, 6, 49, stone, gold);
  addBox(group, [30, 37, 15], [0, 32, -23], stoneLight);
  const rearRoof = new THREE.Mesh(makeBarrelRoofGeometry(32, 17, 12), glass);
  rearRoof.position.set(0, 50.5, -23);
  rearRoof.castShadow = true;
  group.add(rearRoof);
  addBarrelRoofGrid(group, 0, 50.5, -23, 32, 17, 12, gold);
  addFrontArch(group, 0, 48, -14.1, 9, gold, 1.15);
  addStationWindow(group, 0, 45, -14, 12, 10, "front", glass, gold);

  // 石柱。大面積の無地壁を残さず、元絵のリズムで外周を分節する。
  [-41, -28, 28, 41].forEach(px => {
    [-27, 25].forEach(pz => {
      addBox(group, [6.2, 39, 6.2], [px, 24, pz], darkStone);
      addBox(group, [8, 3, 8], [px, 6.8, pz], stoneLight);
      addBox(group, [8, 3, 8], [px, 43.2, pz], stoneLight);
    });
  });
  [-17, 17].forEach(px => {
    addBox(group, [6.6, 44, 6], [px, 27.5, 28], darkStone);
    addBox(group, [8.3, 3, 7.4], [px, 50.5, 28], stoneLight);
  });

  // 正面扉、左右扉、窓、庇。
  addBox(group, [20, 24, 1.8], [0, 18, 30], door);
  addFrontArch(group, 0, 29, 31.2, 10, gold, 1.2);
  addBox(group, [2, 24, 2.2], [0, 18, 31.2], gold);
  [-8.5, 8.5].forEach(px => addBox(group, [1.25, 22, 2.2], [px, 18, 31.2], gold));
  [-25.5, 25.5].forEach(px => {
    addStationWindow(group, px, 20, 26.4, 11, 15, "front", glass, gold);
  });
  [-18, 0, 18].forEach(pz => {
    addStationWindow(group, -43.2, 21, pz, 10, 14, "side", glass, gold);
    addStationWindow(group, 43.2, 21, pz, 10, 14, "side", glass, gold);
  });

  // 鉄道側（西側）の乗り場出口。ホームが駅舎の裏へ突然消えず、
  // 駅→改札出口→ホーム→車両という導線が外観から読めるようにする。
  const platformDoorZ = -3;
  addBox(group, [2.4, 25, 16], [-44.5, 17, platformDoorZ], darkStone);
  addBox(group, [2.8, 21, 12.5], [-45.1, 16.5, platformDoorZ], glass);
  [-1, 1].forEach(side => addBox(group, [3.1, 23, 1.15], [-45.5, 17, platformDoorZ + side * 6.7], gold));
  addBox(group, [3.1, 1.15, 14.5], [-45.5, 28.2, platformDoorZ], gold);
  addBox(group, [8, 1.4, 18], [-48.3, 30, platformDoorZ], blue);
  addBox(group, [8.4, .75, 18.5], [-48.5, 31, platformDoorZ], gold);
  addWalkableBox(group, [4.5, 1.3, 18], [-47.2, 4.6, platformDoorZ], stoneLight);
  addWalkableBox(group, [4.5, 1.1, 18], [-50.5, 3.1, platformDoorZ], stone);
  addWalkableBox(group, [4.5, .9, 18], [-53.5, 1.7, platformDoorZ], darkStone);

  // 時計・針・中央紋章。
  const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 1.7, 48), physicalMaterial(0xfff9de, .36, .03));
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(0, 43.5, 30.8);
  group.add(clockFace);
  const clockRim = new THREE.Mesh(new THREE.TorusGeometry(10.2, 1.2, 14, 48), gold);
  clockRim.position.copy(clockFace.position);
  group.add(clockRim);
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    addBox(group, [index % 3 === 0 ? .7 : .4, index % 3 === 0 ? 1.7 : 1, .65], [Math.sin(angle) * 6.8, 43.5 + Math.cos(angle) * 6.8, 31.9], darkStone, -angle);
  }
  addBox(group, [.85, 6.5, .8], [0, 45.2, 32], darkStone, -.16);
  addBox(group, [.8, 4.8, .8], [1.7, 42.5, 32], darkStone, .75);
  const crest = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 1.3, 28), blue);
  crest.rotation.x = Math.PI / 2;
  crest.position.set(0, 29.6, 31.4);
  group.add(crest);
  const crestRim = new THREE.Mesh(new THREE.TorusGeometry(5.6, .75, 10, 32), gold);
  crestRim.position.copy(crest.position);
  group.add(crestRim);

  // 青い垂れ幕と金模様。
  [-35.5, 35.5].forEach(px => {
    addBox(group, [6.5, 20, .75], [px, 21, 27.6], blue);
    addBox(group, [7.5, 1, 1], [px, 31.3, 28], gold);
    addBox(group, [.8, 13.5, 1], [px, 21.2, 28], gold);
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 8), gold);
    jewel.position.set(px, 22.5, 28.7);
    group.add(jewel);
  });

  // 正面灯、階段、左右の花壇。
  addStationLantern(group, -13, 24, 31.6, darkStone, gold, warm);
  addStationLantern(group, 13, 24, 31.6, darkStone, gold, warm);
  SKY_STATION_FRONT_STEPS.forEach(step => {
    addWalkableBox(group, [step.width, step.height, step.depth], [0, step.height / 2, step.z], stoneLight);
  });
  SKY_STATION_FRONT_GARDENS.forEach(garden => {
    const px = garden.centerX;
    addBox(group, [garden.width, 4.2, garden.depth], [px, 5, 32], darkStone);
    addBox(group, [garden.width - 2, 4.7, garden.depth - 3], [px, 7.5, 32], green);
    for (let ix = -2; ix <= 2; ix += 1) {
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(1.35, 10, 7), ix % 2 ? flowerYellow : flowerPink);
      bloom.position.set(px + ix * (garden.width - 4) / 5, 10.6 + Math.abs(ix % 2) * .5, 32 + (ix % 2) * 2);
      bloom.castShadow = true;
      group.add(bloom);
    }
  });

  // 建物を囲む低い石柵と、元絵左手前の木製ベンチ。
  // 正面階段の入口を物理判定と同じ定義で開ける。左右柵の端柱が
  // キャラクターの外周へ重ならず、見た目どおり中央へ直進できる。
  SKY_STATION_FRONT_RAILS.forEach(rail => {
    addStationRailing(group, rail.startX, rail.endX, rail.z, 2, stone, gold);
  });
  addStationRailing(group, -48, 48, -37, 2, stone, gold);
  addStationBench(group, -35, 2, 34, wood, gold);

  // 屋根・柵の尖塔。
  [[-43, -27], [43, -27], [-43, 25], [43, 25], [-18, -24], [18, -24], [-18, 6], [18, 6]].forEach(([x, z]) => {
    addStationFinial(group, x, z < -20 ? 43 : 48, z, stoneLight, gold, z < -20 ? 14 : 17);
  });
  addStationFinial(group, 0, 62, -23, stoneLight, gold, 16);
  return group;
}

function buildSkyTrain(structure) {
  const group = new THREE.Group();
  // 街の発展マップの正式鉄道レイヤーに合わせた配色。
  // 3D照明で青が黒ずまないよう、ごく弱い自己発光で原画の彩度を保つ。
  const blue = physicalMaterial(0x0d63bd, .24, .54, 0x052d63, .18);
  const blueLight = physicalMaterial(0x247fd1, .24, .48, 0x07386f, .16);
  const blueDark = physicalMaterial(0x082f6d, .34, .5, 0x031633, .1);
  const gold = physicalMaterial(0xf0b63b, .2, .8, 0x704000, .14);
  const goldBright = physicalMaterial(0xffd45d, .18, .78, 0x8a4f00, .16);
  const silver = physicalMaterial(0xd7d5cb, .27, .7);
  const purple = physicalMaterial(0x782272, .3, .5, 0x2e082b, .08);
  const dark = physicalMaterial(0x17202c, .38, .62);
  const glass = physicalMaterial(0x38b9bd, .13, .3, 0x0d5f68, .58);
  const wood = physicalMaterial(0x694625, .9, .02);

  // 空駅から車両へ自然に続く実物大の乗降ホーム。
  // 線路と同じローカル軸に置くことで、鉄道の角度を変えても導線を維持する。
  const platformStone = physicalMaterial(0xc7ac7a, .78, .03);
  const platformLight = physicalMaterial(0xf1d9a8, .68, .03);
  const platformEdge = physicalMaterial(0x897256, .78, .04);
  // 車両側から駅側出口までを一枚のホームで結ぶ。外縁 x=68 は、
  // 現在の駅座標・線路角度で西側出口の中心へ一致する実測値。
  const platformCenterX = 40.5;
  const platformCenterZ = 0;
  const platformLength = 205;
  addBox(group, [55, 1.6, platformLength], [platformCenterX, .8, platformCenterZ], platformStone);
  addBox(group, [53.8, .7, platformLength - 2], [platformCenterX, 1.95, platformCenterZ], platformLight);
  addBox(group, [1.3, .32, platformLength - 6], [14.8, 2.46, platformCenterZ], goldBright);
  addBox(group, [1.05, 2.2, platformLength], [67.45, 1.1, platformCenterZ], platformEdge);
  // ホーム中央の青い案内帯。雲床との境界を遠景でも判別できる。
  addBox(group, [1.15, .22, platformLength - 10], [65.7, 2.43, platformCenterZ], blueDark);

  // ホーム屋根・支柱・照明。駅側の端は空駅の基礎へ差し込み、隙間を作らない。
  [-58, -12, 34, 80].forEach(z => {
    addBox(group, [1.65, 26, 1.65], [63, 14.2, z], blueDark);
    addBox(group, [2.6, 1.2, 2.6], [63, 27.2, z], gold);
    const platformLamp = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 14, 10),
      physicalMaterial(0xffe898, .16, .08, 0xffb735, 1.7),
    );
    platformLamp.position.set(59.5, 25.8, z);
    group.add(platformLamp);
  });
  const platformCanopyGlass = physicalMaterial(0x55c5d5, .13, .28, 0x16566a, .34);
  platformCanopyGlass.transparent = true;
  platformCanopyGlass.opacity = .42;
  platformCanopyGlass.depthWrite = false;
  platformCanopyGlass.side = THREE.DoubleSide;
  const platformCanopy = new THREE.Mesh(makeBarrelRoofGeometry(48, 150, 4.2), platformCanopyGlass);
  platformCanopy.position.set(42, 27.8, 11);
  platformCanopy.castShadow = false;
  group.add(platformCanopy);
  addBarrelRoofGrid(group, 42, 27.8, 11, 48, 150, 4.2, gold);

  const addWheel = (x, z, radius = 4) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2, 24), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, radius + 1.3, z);
    wheel.castShadow = true;
    group.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * .52, radius * .52, 2.35, 20), blueDark);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x + Math.sign(x) * .18, radius + 1.3, z);
    group.add(hub);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * .64, .5, 9, 24), gold);
    rim.rotation.y = Math.PI / 2;
    rim.position.set(x + Math.sign(x) * 1.05, radius + 1.3, z);
    group.add(rim);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(radius * .15, radius * .15, 2.7, 14), goldBright);
    axle.rotation.z = Math.PI / 2;
    axle.position.set(x + Math.sign(x) * 1.18, radius + 1.3, z);
    group.add(axle);
  };
  const addTrainWindow = (x, y, z, width = 7.2, height = 7.2) => {
    const outward = Math.sign(x) || 1;
    addBox(group, [1, height + 2.2, width + 2.2], [x, y, z], blueDark);
    addBox(group, [1.16, height, width], [x + outward * .18, y, z], glass);
    [-1, 1].forEach(side => {
      addBox(group, [1.35, height + 1.2, .65], [x + outward * .34, y, z + side * width / 2], gold);
    });
    addBox(group, [1.35, .65, width + 1.25], [x + outward * .34, y + height / 2, z], gold);
    addBox(group, [1.35, .65, width + 1.25], [x + outward * .34, y - height / 2, z], gold);
    addBox(group, [1.42, .5, width - .5], [x + outward * .42, y, z], silver);
  };
  const addSideCrest = (x, y, z, scale = 1) => {
    const outward = Math.sign(x) || 1;
    const crestX = x + outward * .74;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2 * scale, .5 * scale, 9, 28), goldBright);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(crestX, y, z);
    group.add(ring);
    const stem = addBox(group, [.8 * scale, 6.7 * scale, .7 * scale], [crestX + outward * .08, y - .25 * scale, z], goldBright);
    stem.rotation.x = -.03;
    [-1, 1].forEach(side => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.45 * scale, 14, 9), goldBright);
      leaf.scale.set(.5, 1.15, .7);
      leaf.position.set(crestX + outward * .12, y + .8 * scale, z + side * 2.05 * scale);
      leaf.rotation.x = side * .72;
      group.add(leaf);
    });
    const crownLeaf = new THREE.Mesh(new THREE.SphereGeometry(1.55 * scale, 14, 9), goldBright);
    crownLeaf.scale.set(.5, 1.35, .7);
    crownLeaf.position.set(crestX + outward * .12, y + 2.25 * scale, z);
    group.add(crownLeaf);
  };
  const addCar = (z, length, rearCar = false) => {
    // 青い車体、濃紺の腰板、金の骨組み、銀縁の丸屋根を原画どおり積層。
    addBox(group, [24, 18, length], [0, 15, z], blue);
    addBox(group, [24.8, 5.3, length + .5], [0, 9.5, z], blueDark);
    addBox(group, [25.7, 1.9, length + 1.2], [0, 7, z], purple);
    addBox(group, [25.9, 1.05, length + 1.5], [0, 8.25, z], gold);
    addBox(group, [25.4, .8, length + 1], [0, 23.9, z], silver);
    const roof = new THREE.Mesh(makeBarrelRoofGeometry(26, length + 2, 8), blueLight);
    roof.position.set(0, 24, z);
    roof.castShadow = true;
    group.add(roof);
    addBarrelRoofGrid(group, 0, 24, z, 26, length + 2, 8, gold);
    [-12.35, 12.35].forEach(x => {
      [-length * .34, -length * .11, length * .12].forEach(dz => addTrainWindow(x, 17, z + dz));
      addBox(group, [1.2, 15.8, 1.35], [x + Math.sign(x) * .16, 15, z - length * .47], gold);
      addBox(group, [1.2, 15.8, 1.35], [x + Math.sign(x) * .16, 15, z + length * .47], gold);
      addBox(group, [1.25, .9, length - 1.8], [x + Math.sign(x) * .18, 11.2, z], gold);
      addSideCrest(x, 16.3, z + length * .34, rearCar ? .92 : .78);
    });
    [-length * .31, length * .31].forEach(dz => {
      addWheel(-12.2, z + dz, 3.8);
      addWheel(12.2, z + dz, 3.8);
    });
    if (rearCar) {
      [-10.5, 10.5].forEach(x => [-length / 2 + 2, length / 2 - 2].forEach(dz => addStationFinial(group, x, 31, z + dz, purple, goldBright, 10)));
      [-10.5, 10.5].forEach(x => addBox(group, [1, 3.2, length - 5], [x, 34.3, z], purple));
      addBox(group, [22, 1.1, 1.1], [0, 35.6, z + length / 2 - 2], goldBright);
    }
  };

  // 正式レイヤーと同じ直線線路。列車の長さとは分離し、視界の霧へ
  // 完全に溶ける距離まで前後へ延ばして、見える場所に終端を作らない。
  const trackLength = Math.max(SKY_TRACK_VISIBLE_LENGTH, Number(structure.trackLength) || 0);
  [-12, 12].forEach(x => {
    const rail = addBox(group, [2.2, 1.4, trackLength], [x, 1.1, 0], silver);
    rail.castShadow = false;
  });
  const tieCount = Math.floor(trackLength / SKY_TRACK_TIE_SPACING) + 1;
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(31, .9, 3),
    wood,
    tieCount,
  );
  const tieMatrix = new THREE.Matrix4();
  const firstTieZ = -(tieCount - 1) * SKY_TRACK_TIE_SPACING / 2;
  for (let index = 0; index < tieCount; index += 1) {
    tieMatrix.makeTranslation(0, .45, firstTieZ + index * SKY_TRACK_TIE_SPACING);
    ties.setMatrixAt(index, tieMatrix);
  }
  ties.instanceMatrix.needsUpdate = true;
  ties.castShadow = false;
  ties.receiveShadow = true;
  ties.frustumCulled = false;
  group.add(ties);

  // ここより後で追加する車両本体だけを、線路・ホームとは独立して反転する。
  // マップ上の進行方向へ合わせても、駅側に接続したホームの位置は変えない。
  const rollingStockStart = group.children.length;

  // 後方2客車と連結蛇腹。
  addCar(30, 48, false);
  addCar(82, 48, true);
  [5, 56].forEach(z => {
    addBox(group, [20, 17, 5], [0, 15, z], dark);
    for (let y = 9; y <= 21; y += 3) addBox(group, [21, .7, 5.8], [0, y, z], silver);
  });

  // 機関室。
  addBox(group, [24, 20, 37], [0, 16, -24], blue);
  addBox(group, [24.8, 5, 37.5], [0, 9.5, -24], blueDark);
  addBox(group, [25.7, 1.2, 38], [0, 7.2, -24], gold);
  const cabRoof = new THREE.Mesh(makeBarrelRoofGeometry(26, 39, 8), blueLight);
  cabRoof.position.set(0, 26, -24);
  cabRoof.castShadow = true;
  group.add(cabRoof);
  addBarrelRoofGrid(group, 0, 26, -24, 26, 39, 8, gold);
  [-12.35, 12.35].forEach(x => {
    [-10, 3].forEach(dz => addTrainWindow(x, 18, -24 + dz, 8, 9));
    addSideCrest(x, 15.3, -8.5, .55);
    [-11, 11].forEach(dz => addWheel(x, -24 + dz, 4));
  });

  // 蒸気機関車本体。
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 43, 30), blueLight);
  boiler.rotation.x = Math.PI / 2;
  boiler.position.set(0, 16, -62);
  boiler.castShadow = true;
  group.add(boiler);
  [-76, -64, -52, -42].forEach(z => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(9.35, .75, 10, 30), gold);
    band.position.set(0, 16, z);
    group.add(band);
  });
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 9.8, 3.5, 30), goldBright);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 16, -84.8);
  group.add(nose);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(8.7, 8.7, 1.5, 30), blueDark);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 16, -86.9);
  group.add(face);
  const starShape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 ? 2.6 : 5.4;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const sx = Math.cos(angle) * radius;
    const sy = Math.sin(angle) * radius;
    if (!index) starShape.moveTo(sx, sy); else starShape.lineTo(sx, sy);
  }
  starShape.closePath();
  const star = new THREE.Mesh(new THREE.ShapeGeometry(starShape), gold);
  star.position.set(0, 16, -87.8);
  group.add(star);
  [-12.3, 12.3].forEach(x => [-75, -62, -49].forEach(z => addWheel(x, z, z === -62 ? 5.6 : 4.7)));
  [-12.8, 12.8].forEach(x => addBox(group, [1.6, 1.8, 34], [x, 7, -62], gold));
  // 原画の側面にある金の蒸気管と連結ロッド。
  [-1, 1].forEach(side => {
    addBox(group, [1.25, 1.25, 38], [side * 10.05, 13, -62], goldBright);
    const rod = addBox(group, [1.35, 1.25, 31], [side * 13.25, 6.2, -62], goldBright);
    rod.rotation.x = side * .018;
  });

  // 煙突、蒸気ドーム、前照灯、カウキャッチャー。
  const chimneyStem = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.3, 13, 18), gold);
  chimneyStem.position.set(0, 30, -70);
  chimneyStem.castShadow = true;
  group.add(chimneyStem);
  const chimneyTop = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 3.2, 5.5, 18), goldBright);
  chimneyTop.position.set(0, 38, -70);
  group.add(chimneyTop);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.7, 7, 18), gold);
  dome.position.set(0, 29, -52);
  group.add(dome);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(3.2, 18, 12), physicalMaterial(0xffe58d, .18, .1, 0xffb126, 2.2));
  lamp.position.set(0, 24, -86.8);
  group.add(lamp);
  const catcherBase = addBox(group, [28, 2.2, 12], [0, 4.2, -94], gold);
  catcherBase.rotation.x = -.16;
  for (let x = -12; x <= 12; x += 4) {
    const bar = addBox(group, [2, 1.8, 13], [x, 5.2, -95], x % 8 === 0 ? blueLight : blueDark);
    bar.rotation.x = -.42;
  }
  const rollingStock = new THREE.Group();
  const rollingStockChildren = group.children.slice(rollingStockStart);
  rollingStockChildren.forEach(child => rollingStock.add(child));
  if (structure.reverseRollingStock) rollingStock.rotation.y = Math.PI;
  group.add(rollingStock);
  return group;
}

function buildCloudWorkshop(structure) {
  const [width, height, depth] = structure.size;
  const group = new THREE.Group();
  const frame = physicalMaterial(0x313d4d, .42, .58);
  const frameLight = physicalMaterial(0x748393, .34, .55);
  const wall = physicalMaterial(0x596878, .53, .42);
  const dark = physicalMaterial(0x17202b, .5, .38);
  const warm = physicalMaterial(0xa96f27, .67, .14);
  const warmLight = physicalMaterial(0xd59b45, .58, .12);
  const green = physicalMaterial(0x315f55, .55, .2);
  const gold = physicalMaterial(0xd2a039, .31, .65);
  const lampGlow = physicalMaterial(0xffd66f, .2, .06, 0xffa02d, 2);
  addBox(group, [width, 3.2, depth], [0, 1.6, 0], physicalMaterial(0xbcc9cb, .78, .04));
  addBox(group, [width * .74, height * .61, depth * .69], [0, height * .32, -depth * .04], wall);

  // 正式絵と同じ、金骨組みを持つ半円形の金属屋根。
  const roofWidth = width * .76;
  const roofDepth = depth * .72;
  const roofBaseY = height * .625;
  const roof = new THREE.Mesh(makeBarrelRoofGeometry(roofWidth, roofDepth, height * .21), frameLight);
  roof.position.set(0, roofBaseY, -depth * .04);
  roof.castShadow = true;
  group.add(roof);
  addBarrelRoofGrid(group, 0, roofBaseY, -depth * .04, roofWidth, roofDepth, height * .21, gold);

  // 開放された正面搬入口と内側の奥行き。
  addBox(group, [width * .48, height * .46, 2.2], [0, height * .27, depth * .31], dark);
  addBox(group, [width * .42, 2, depth * .42], [0, 4, depth * .08], frame);
  [-width * .3, width * .3].forEach(x => {
    addBox(group, [5.2, height * .58, 5.2], [x, height * .32, depth * .27], frame);
    addBox(group, [7, 2.2, 7], [x, height * .61, depth * .27], gold);
  });

  // 外付けタンク、補強リング、接続管。
  [-width * .36, width * .36].forEach((x, tankIndex) => {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.2, height * .55, 24), frameLight);
    tank.position.set(x, height * .33, -depth * .24);
    tank.castShadow = true;
    group.add(tank);
    for (let y = height * .16; y <= height * .5; y += height * .17) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(7.45, .65, 9, 24), gold);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, -depth * .24);
      group.add(ring);
    }
    addBox(group, [2, height * .35, 2], [x + (tankIndex ? -8 : 8), height * .3, -depth * .24], gold);
    addBox(group, [10, 2, 2], [x + (tankIndex ? -4 : 4), height * .47, -depth * .24], gold);
  });

  // 木箱、樽、歯車類。
  [[-.33, .31, 11, 10], [-.17, .33, 12, 14], [.03, .33, 10, 9], [.2, .3, 9, 12]].forEach(([rx, rz, sx, sy], index) => {
    const x = width * rx;
    const z = depth * rz;
    addBox(group, [sx, sy, 11], [x, sy / 2 + 3.2, z], index % 2 ? warmLight : warm);
    addBox(group, [sx + .8, .9, 11.8], [x, sy + 3.4, z], gold);
    addBox(group, [.9, sy, 11.8], [x, sy / 2 + 3.2, z], gold);
  });
  [-4, 7, 18].forEach((x, index) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 7.5, 16), warm);
    barrel.position.set(x, 7.1, depth * .4 - index * 2);
    barrel.castShadow = true;
    group.add(barrel);
    [-2.4, 2.4].forEach(offset => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.18, .35, 8, 18), frame);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 7.1 + offset, depth * .4 - index * 2);
      group.add(ring);
    });
  });

  // 外周フェンス、街灯、植栽。
  [-width * .48, width * .48].forEach(x => {
    addBox(group, [2.2, 13, depth], [x, 6.5, 0], green);
    for (let z = -depth * .44; z <= depth * .44; z += 8) addBox(group, [1.2, 10, 1.2], [x, 6.2, z], gold);
  });
  addBox(group, [width, 1.6, 1.5], [0, 11, -depth * .48], green);
  for (let x = -width * .46; x <= width * .46; x += 8) addBox(group, [1.1, 10, 1.1], [x, 6.2, -depth * .48], gold);
  addStationLantern(group, -width * .47, 15, depth * .43, frame, gold, lampGlow);
  [-width * .38, width * .38].forEach(x => {
    for (let index = 0; index < 4; index += 1) {
      const flower = new THREE.Mesh(new THREE.SphereGeometry(1.25, 9, 7), physicalMaterial(index % 2 ? 0xffd35e : 0xff8cac, .55, .02));
      flower.position.set(x + index * 2.5 - 3.5, 5, depth * .44);
      group.add(flower);
    }
  });
  return group;
}

function addFixedStructure(parent, config, structure) {
  const [x, , z] = normalizedPoint(config, structure.point);
  const rotationY = THREE.MathUtils.degToRad(structure.rotationDeg || 0);
  let group = null;
  if (structure.type === "sky-train") group = buildSkyTrain(structure);
  if (structure.type === "cloud-workshop") group = buildCloudWorkshop(structure);
  if (!group) return;
  const structureScale = Number(structure.scale) || (structure.type === "cloud-workshop" ? BUILDING_SCALE : 1);
  group.scale.setScalar(structureScale);
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  // Fixed structures use the same visible-mesh surface extraction as every
  // player-built structure. Existing detailed obstacle colliders stay intact;
  // only low floors, platforms and decks are added as climbable top surfaces.
  addVisualBuildingColliders(group, structure.id, {
    // The workshop contains a large visible rear/body wall in addition to
    // the hand-authored fence, tanks, and crates below.  Keep the detailed
    // manual pieces, but also register the visible meshes themselves so no
    // part of a fixed building can be entered through an unregistered face.
    // This is class-wide for fixed structures, not a location exception.
    registerObstacles: structure.type === "cloud-workshop",
    registerSurfaces: false,
    maximumSurfaceHeight: 28,
  });
  if (structure.type === "cloud-workshop") {
    // 工房全体を一つの箱にせず、壁・搬入口・タンク・資材・柵を個別に判定する。
    addCloudWorkshopCollisionColliders(x, z, rotationY, structureScale, structure.id, structure);
  }
  if (state.labels) {
    const label = makeTextLabel(structure.name, "#ffe5a2");
    label.position.set(0, structure.type === "sky-train" ? 42 : 74, 0);
    setLabelWorldScale(label, structureScale);
    group.add(label);
  }
  parent.add(group);
  if (structure.type === "sky-train") {
    // 線路とホームは歩行可能にし、車両本体だけを3分割して物理障害物にする。
    // 長い線路全体を1個のAABBにすると、ホームへ近づけなくなるため分離する。
    const rollingStockDirection = structure.reverseRollingStock ? -1 : 1;
    // ホーム天面は表示モデルと同じローカル寸法・回転・高さで一度だけ登録する。
    // Three.js のY回転で表示される platformCenterX=40.5 と同じ変換を
    // そのまま使う。以前はX/Zの係数を逆にしていたため、表示ホームと
    // 足場判定が別の場所へずれていた。
    const platformWorldX = x + Math.cos(rotationY) * 40.5 * structureScale;
    const platformWorldZ = z - Math.sin(rotationY) * 40.5 * structureScale;
    const platformSurfaceHeight = 2.3 * structureScale;
    addAuthoritativeSurface({
      id: `${structure.id}-platform-surface`,
      buildingId: structure.id,
      x: platformWorldX,
      z: platformWorldZ,
      rotation: rotationY,
      size: scaleFootprint([53.8, 203], structureScale),
      height: platformSurfaceHeight,
    });
    // ホーム屋根の4本の支柱。車両本体だけを当てる設計では、
    // 見えている支柱をキャラクターがすり抜けてしまうため、1本ずつ登録する。
    // ホーム床・屋根・線路は歩けるままにし、細い柱の footprint だけを止める。
    [-58, -12, 34, 80].forEach((localZ, index) => {
      addLocalStructureCollider(
        x,
        z,
        rotationY,
        structureScale,
        [63, localZ],
        [1.65, 1.65],
        `${structure.id}-platform-pillar-${index}`,
        VERTICAL_STRUCTURE_COLLISION_CLEARANCE,
        { obstacleHeight: 26 * structureScale },
      );
    });
    addLocalStructureCollider(
      x,
      z,
      rotationY,
      structureScale,
      [67.45, 0],
      [1.3, 205],
      `${structure.id}-platform-edge`,
      4,
      {
        obstacleHeight: platformSurfaceHeight,
        minY: 0,
        maxY: platformSurfaceHeight,
        stepAdjacent: true,
        surfaceEdge: true,
      },
    );
    [
      { z: -55, size: [27, 98], id: "engine" },
      { z: 30, size: [26, 48], id: "coach-1" },
      { z: 82, size: [26, 48], id: "coach-2" },
    ].forEach(segment => {
      const localZ = segment.z * structureScale * rollingStockDirection;
      const segmentX = x + Math.sin(rotationY) * localZ;
      const segmentZ = z + Math.cos(rotationY) * localZ;
      addRotatedCollider(
        segmentX,
        segmentZ,
        scaleFootprint(segment.size, structureScale),
        rotationY,
        `${structure.id}-${segment.id}`,
      );
    });
  } else if (structure.type !== "cloud-workshop") {
    addRotatedCollider(x, z, scaleFootprint(structure.footprint, structureScale), rotationY, structure.id);
  }
}

function addMapEntry(parent, config) {
  const entry = config.entry;
  const [x, , z] = normalizedPoint(config, entry.point);
  if (entry.terrainOnly) {
    if (state.labels) {
      const label = makeTextLabel(entry.name, "#ffe5a2");
      label.position.set(x, 18, z);
      label.scale.set(1.35, .58, 1);
      parent.add(label);
    }
    return;
  }
  const group = entry.type === "rail-station" ? buildSkyStation(entry) : new THREE.Group();
  const entryScale = entry.type === "rail-station" ? BUILDING_SCALE : 1;
  group.scale.setScalar(entryScale);
  group.position.set(x, 0, z);
  const rotationY = THREE.MathUtils.degToRad(entry.rotationDeg || 0);
  group.rotation.y = rotationY;
  addVisualBuildingColliders(group, entry.id, {
    // 空駅も例外の手動箱を使わず、表示メッシュを同じ world matrix の
    // 物理メッシュへ複製する。walkableSurface を付けた床と段だけが
    // floors になり、その他の柱・壁・扉・装飾は実形状の footprint を
    // 持つ walls / risers になる。
    registerObstacles: true,
    registerSurfaces: true,
    maximumSurfaceHeight: 28,
  });
  if (state.labels) {
    const sign = makeTextLabel(entry.name, "#ffe5a2");
    sign.position.set(0, 86, 0);
    setLabelWorldScale(sign, entryScale);
    group.add(sign);
  }
  parent.add(group);
  if (entry.type === "rail-station") {
    // 駅の物理は上の表示メッシュ複製だけを情報源にする。
  } else {
    addRotatedCollider(x, z, scaleFootprint(entry.footprint, entryScale), rotationY, entry.id);
  }
}

function buildCatalogModel(source) {
  const [sx, sy, sz] = source.size;
  const group = new THREE.Group();
  const main = physicalMaterial(source.color, .67, .05);
  const trim = physicalMaterial(0xf0e5cf, .76, .03);
  const dark = physicalMaterial(0x243344, .48, .34);
  const glass = physicalMaterial(0x69d8eb, .18, .18, 0x1a5665, .26);
  if (source.id === "ufo-pad") {
    // 雲床と同じ高さに置く着陸パッド。上にはパッド径に合わせた
    // 大型UFOを常設し、扉・操縦席まで一体の表示モデルとして作る。
    const padMetal = physicalMaterial(0x263b55, .3, .58, 0x102a47, .35);
    const padLight = physicalMaterial(0x8de9ff, .18, .25, 0x2acfff, 1.8);
    const padWhite = physicalMaterial(0xd9fbff, .2, .18, 0x6eeaff, .9);
    const ufoHull = physicalMaterial(0xc9d7e4, .22, .62, 0x4b6d83, .18);
    const ufoHullDark = physicalMaterial(0x526b82, .3, .58, 0x1c3145, .24);
    const ufoTrim = physicalMaterial(0xeaf7ff, .18, .32, 0x8de9ff, .32);
    const ufoGlass = new THREE.MeshPhysicalMaterial({
      color: 0x88e8f4, roughness: .12, metalness: .1, transmission: .18,
      transparent: true, opacity: .72, emissive: 0x164c62, emissiveIntensity: .35,
    });
    const cockpitDark = physicalMaterial(0x142a3b, .26, .54, 0x07131f, .22);
    const cockpitBlue = physicalMaterial(0x42d9ef, .18, .2, 0x24bfe5, 1.4);
    const cockpitAmber = physicalMaterial(0xffd37b, .28, .16, 0xf08b2d, .8);
    const addUfoPart = (mesh, options = {}) => {
      // Decorative UFO parts remain visual-only by default. Parts that a
      // character can physically touch explicitly opt into the shared visual
      // mesh collider extraction below.
      mesh.userData.nonCollidable = options.collidable !== true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(sx, sz) * .49, Math.min(sx, sz) * .5, .12, 64), padMetal);
    base.position.y = .06;
    base.userData.nonCollidable = true;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(sx, sz) * .35, Math.min(sx, sz) * .35, .06, 64), padWhite);
    inner.position.y = .15;
    inner.userData.nonCollidable = true;
    group.add(inner);
    [
      [0, -sz * .27, 0],
      [-sx * .24, sz * .18, Math.PI / 3],
      [sx * .24, sz * .18, -Math.PI / 3],
    ].forEach(([x, z, rotation]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(sx, sz) * .13, 1.05, 10, 32), padLight);
      ring.position.set(x, .22, z);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = rotation;
      ring.userData.nonCollidable = true;
      group.add(ring);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, 1.2, 16), padLight);
      beacon.position.set(x, .52, z);
      beacon.userData.nonCollidable = true;
      group.add(beacon);
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, .18, 32), padLight);
    core.position.y = .24;
    core.userData.nonCollidable = true;
    group.add(core);

    // UFO lower saucer and landing gear. The footprint remains inside the
    // 92×92 pad while the vertical silhouette is large enough for Ren.
    // +X側に搭乗口の切り欠きを持つ下部シェル。扉だけを動かすのではなく、
    // UFO本体にも実際の開口を持たせ、展開時に足場から中へ入れるようにする。
    // 右側の入口は+X軸上に固定し、足場幅を通せる最小限の開口にする。
    // 広すぎる扇形の切り欠きは、正面や背面から見た時に別の場所が
    // 開いているように見え、外周リングまで崩れて見える原因になる。
    const hatchGapHalfAngle = THREE.MathUtils.degToRad(15);
    const lowerHull = new THREE.Mesh(new THREE.CylinderGeometry(
      35,
      42,
      9,
      64,
      1,
      true,
      Math.PI / 2 + hatchGapHalfAngle,
      Math.PI * 2 - hatchGapHalfAngle * 2,
    ), ufoHullDark);
    lowerHull.position.set(0, 12, 0); addUfoPart(lowerHull);
    // 上部外殻も同じ+X軸で切り欠く。下部だけを欠けさせると、
    // 上部外殻が入口を塞いで「別の場所が開いている」ように見える。
    const upperHull = new THREE.Mesh(new THREE.CylinderGeometry(
      40,
      34,
      5,
      64,
      1,
      true,
      Math.PI / 2 + hatchGapHalfAngle,
      Math.PI * 2 - hatchGapHalfAngle * 2,
    ), ufoHull);
    upperHull.position.set(0, 20, 0); addUfoPart(upperHull);
    // 全周リングは外観の基準パーツなので、切断せず元の連続した形を保つ。
    const lowerGlow = new THREE.Mesh(new THREE.TorusGeometry(37, 1.8, 12, 64), padLight);
    lowerGlow.rotation.x = Math.PI / 2; lowerGlow.position.y = 9; addUfoPart(lowerGlow);
    const upperTrim = new THREE.Mesh(new THREE.TorusGeometry(30, 1.5, 12, 64), ufoTrim);
    upperTrim.rotation.x = Math.PI / 2; upperTrim.position.y = 23; addUfoPart(upperTrim);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(24, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2), ufoGlass);
    dome.position.y = 23; dome.scale.y = 1.16; addUfoPart(dome);
    const domeCap = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 12), cockpitBlue);
    domeCap.position.y = 49; domeCap.scale.y = .48; addUfoPart(domeCap, { collidable: true });

    // Eight windows make the craft readable from every direction.
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const window = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 10), cockpitBlue);
      window.position.set(Math.cos(angle) * 31, 21, Math.sin(angle) * 31);
      window.scale.z = .42; addUfoPart(window);
    }
    [-1, 0, 1].forEach(index => {
      const angle = index / 3 * Math.PI * 2 + Math.PI / 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.1, 8, 12), ufoTrim);
      leg.position.set(Math.cos(angle) * 28, 5, Math.sin(angle) * 28); addUfoPart(leg);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.4, 16), padLight);
      foot.position.set(Math.cos(angle) * 28, 1.2, Math.sin(angle) * 28); addUfoPart(foot);
    });

    // 右側の足場は、扉を下へ倒すのではなく、タンスの引き出しのように
    // UFO内部から+X方向へせり出す。足場が収納されている時はUFO側面の
    // 外殻が閉じ、展開時はその外殻パネルが本体内部へ引き込まれて乗り口を開ける。
    // 外殻の入口から顔認証台の足元まで、途中で切れない長さにする。
    const rampLength = 84;
    const rampWidth = 18;
    const rampRise = 10;
    const rampAssembly = new THREE.Group();
    rampAssembly.userData.nonCollidable = true;
    group.add(rampAssembly);
    const addRampPart = mesh => {
      mesh.userData.nonCollidable = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rampAssembly.add(mesh);
      return mesh;
    };
    const rampBody = addRampPart(new THREE.Mesh(new THREE.BoxGeometry(rampLength, 2.6, rampWidth), ufoHullDark));
    rampBody.position.y = 0;
    const rampSurface = addRampPart(new THREE.Mesh(new THREE.BoxGeometry(rampLength - 3, .55, rampWidth - 4), padWhite));
    rampSurface.position.y = 1.55;
    [-1, 1].forEach(side => {
      const rail = addRampPart(new THREE.Mesh(new THREE.BoxGeometry(rampLength, 2.2, 1.15), ufoTrim));
      rail.position.set(0, 2.1, side * (rampWidth / 2 - .58));
    });
    const rampEdge = addRampPart(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, rampWidth - 3), padLight));
    rampEdge.position.set(rampLength / 2 - 1.8, 1.15, 0);
    const rampLine = addRampPart(new THREE.Mesh(new THREE.BoxGeometry(rampLength - 9, .7, .8), padLight));
    rampLine.position.set(-4.5, 1.9, 0);
    // The top face must meet the ground at the outer end and the cockpit floor
    // at the UFO end. With this centre height the rendered slope, its edge,
    // and the authored physics strips share the same two endpoints.
    // The closed drawer must be fully pulled into the saucer. Keeping its
    // centre at +39 left more than half of the 84-unit ramp outside the UFO,
    // so the stored/closing pose visibly protruded from the body.  Pull the
    // drawer a further 12 local units inward: its visible outer edge then
    // remains under the upper saucer silhouette even during the last part of
    // the closing animation.
    const rampClosedPosition = new THREE.Vector3(-12, 3.0, 0);
    const rampOpenPosition = new THREE.Vector3(77, 3.0, 0);
    const rampOpenRotation = -Math.atan2(rampRise, rampLength);
    const rampSurfaceTopY = 1.55 + .55 / 2;
    const rampInnerLocalX = -(rampLength - 3) / 2;
    // The ramp's upper face is the authored reference for the UFO underside.
    // Close the saucer with a tapered, full circular bottom whose top face is
    // exactly at the ramp's inner endpoint. This removes the visible bottom
    // hole while keeping the boarding path continuous into the cockpit.
    const ufoBottomTopY = rampOpenPosition.y
      + Math.sin(rampOpenRotation) * rampInnerLocalX
      + Math.cos(rampOpenRotation) * rampSurfaceTopY;
    // This is the permanent UFO underside, not the retractable drawer.  Its
    // earlier 42.5 radius and 2.2 thickness left a visible plate beyond the
    // lower shell, which was easily mistaken for a protruding closed ramp.
    // Keep the underside just inside the shell silhouette while retaining the
    // same top height used by the open ramp.
    const ufoBottomTopRadius = 38.4;
    const ufoBottomLowerRadius = 40.8;
    const ufoBottomThickness = 1.2;
    const ufoBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(ufoBottomTopRadius, ufoBottomLowerRadius, ufoBottomThickness, 64),
      ufoHullDark,
    );
    ufoBottom.position.y = ufoBottomTopY - ufoBottomThickness / 2;
    // The visible plate is paired with state-aware physics below. A permanent
    // solid volume here would behave like a low ceiling over the open ramp
    // and would stop the character before reaching the UFO interior.
    addUfoPart(ufoBottom);
    // 収納時も同じ傾きのまま内部へ引き込むため、開閉で折れ曲がらない。
    const rampClosedRotation = rampOpenRotation;
    rampAssembly.position.copy(rampClosedPosition);
    rampAssembly.rotation.z = rampClosedRotation;
    // 閉じている時はランプ本体をUFO側へ収納し、外観に余計な板状パーツを
    // 残さない。開く指示が出たフレームから表示し、閉じるアニメーションが
    // 完了した時に再び非表示へ戻す。
    rampAssembly.visible = state.ufoDoorOpen;

    const accessHatchAssembly = new THREE.Group();
    accessHatchAssembly.userData.nonCollidable = true;
    group.add(accessHatchAssembly);
    const addHatchPart = mesh => {
      mesh.userData.nonCollidable = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      accessHatchAssembly.add(mesh);
      return mesh;
    };
    // 黒い板や離れた敷居で開口を偽装しない。下部シェルの欠けた角度と
    // 同じ曲率を持つ「本体の一部」だけを扉として使い、閉じた時は外殻に
    // 完全に戻し、開いた時はUFO内部へ収納する。上下外殻を同時に覆うため、
    // 一枚の板ではなく上下のシェル片を同じ収納グループで動かす。
    const hatchCover = new THREE.Group();
    hatchCover.userData.nonCollidable = true;
    accessHatchAssembly.add(hatchCover);
    const addHatchShellPart = mesh => {
      mesh.userData.nonCollidable = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      hatchCover.add(mesh);
      return mesh;
    };
    const hatchLower = addHatchShellPart(new THREE.Mesh(new THREE.CylinderGeometry(
      35,
      42,
      9,
      16,
      1,
      true,
      Math.PI / 2 - hatchGapHalfAngle,
      hatchGapHalfAngle * 2,
    ), ufoHullDark));
    hatchLower.position.y = 12;
    const hatchUpper = addHatchShellPart(new THREE.Mesh(new THREE.CylinderGeometry(
      40,
      34,
      5,
      16,
      1,
      true,
      Math.PI / 2 - hatchGapHalfAngle,
      hatchGapHalfAngle * 2,
    ), ufoHull));
    hatchUpper.position.y = 20;
    const hatchClosedPosition = new THREE.Vector3(0, 0, 0);
    // +X側の開口から見て、パネルが外へ浮かないように本体中心方向へ
    // まっすぐ引き込む。上方へ持ち上げる動きは行わない。
    const hatchOpenPosition = new THREE.Vector3(-24, 12, 0);
    hatchCover.position.copy(hatchClosedPosition);

    // UFO右側のランプ先端に、白ミチロードセイバーレン専用の顔認証装置を
    // 追加する。装置そのものは非衝突で、前の認証スペースを歩行で塞がない。
    const faceAuthAssembly = new THREE.Group();
    // ランプ先端からさらに外側へ離して、装置の前に立つ空間を確保する。
    faceAuthAssembly.position.set(100, 0, 0);
    faceAuthAssembly.userData.nonCollidable = true;
    group.add(faceAuthAssembly);
    const authFrame = physicalMaterial(0x17334a, .34, .58, 0x0c6d8d, .42);
    const authTrim = physicalMaterial(0x74e7f4, .16, .3, 0x2acfff, 1.25);
    const authScreenMaterial = physicalMaterial(0x071521, .2, .42, 0x116b84, .52);
    // 顔認証装置の上部は、平たいランプではなく、外筒・ガラス・絞りを
    // 重ねたカメラレンズとして見えるようにする。
    const authLensMaterial = physicalMaterial(0x08273d, .14, .32, 0x0e9fc7, 1.15);
    const authApertureMaterial = physicalMaterial(0x020812, .2, .4, 0x031d38, .55);
    const authLensHighlight = physicalMaterial(0xdffcff, .08, .12, 0x7defff, 2.1);
    const addAuthPart = mesh => {
      mesh.userData.nonCollidable = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      faceAuthAssembly.add(mesh);
      return mesh;
    };
    const authBase = addAuthPart(new THREE.Mesh(new THREE.CylinderGeometry(8.5, 10.5, 3.2, 24), authFrame));
    authBase.position.y = 1.6;
    const authColumn = addAuthPart(new THREE.Mesh(new THREE.BoxGeometry(5.5, 17, 7.5), authFrame));
    authColumn.position.y = 10;
    const authCap = addAuthPart(new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 11.5), authTrim));
    authCap.position.y = 19.7;
    const authScreen = addAuthPart(new THREE.Mesh(new THREE.BoxGeometry(1.4, 8.8, 11), authScreenMaterial));
    authScreen.position.set(3.1, 14.8, 0);
    const authLensHousing = addAuthPart(new THREE.Mesh(new THREE.CylinderGeometry(3.9, 4.25, 2.1, 32), authFrame));
    authLensHousing.rotation.z = Math.PI / 2;
    authLensHousing.position.set(3.05, 19, 0);
    const authLens = addAuthPart(new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, .85, 32), authLensMaterial));
    authLens.rotation.z = Math.PI / 2;
    authLens.position.set(4.05, 19, 0);
    const authRing = addAuthPart(new THREE.Mesh(new THREE.TorusGeometry(3.15, .44, 12, 36), authTrim));
    authRing.rotation.y = Math.PI / 2;
    authRing.position.set(4.56, 19, 0);
    const authIris = addAuthPart(new THREE.Mesh(new THREE.TorusGeometry(1.68, .28, 10, 32), authTrim));
    authIris.rotation.y = Math.PI / 2;
    authIris.position.set(4.52, 19, 0);
    const authAperture = addAuthPart(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .24, 24), authApertureMaterial));
    authAperture.rotation.z = Math.PI / 2;
    authAperture.position.set(4.66, 19, 0);
    const authGlint = addAuthPart(new THREE.Mesh(new THREE.SphereGeometry(.38, 14, 10), authLensHighlight));
    authGlint.position.set(4.86, 19.82, -.78);
    const authReadyLamp = addAuthPart(new THREE.Mesh(new THREE.BoxGeometry(.55, 5.8, .72), authLensMaterial));
    authReadyLamp.position.set(3.9, 14.8, -5.4);
    const authScanLamp = addAuthPart(new THREE.Mesh(new THREE.BoxGeometry(.55, 5.8, .72), authLensMaterial));
    authScanLamp.position.set(3.9, 14.8, 5.4);
    const authLight = new THREE.PointLight(0x45eaff, 1.5, 32, 2);
    authLight.position.set(4.5, 18, 0);
    faceAuthAssembly.add(authLight);
    // 文字は Sprite にしない。Sprite は常にカメラへ正対するため、装置を
    // 横や背面から見ても文字だけが追従して見えてしまう。レンズ下の
    // 筐体へ薄い銘板と固定平面を組み込み、カメラ本体と同じ向きにする。
    const authLabelPlate = addAuthPart(new THREE.Mesh(
      new THREE.BoxGeometry(.46, 3.1, 8.4),
      authApertureMaterial,
    ));
    authLabelPlate.position.set(2.82, 8.45, 0);
    const authLabelCanvas = document.createElement("canvas");
    authLabelCanvas.width = 512;
    authLabelCanvas.height = 128;
    const authLabelContext = authLabelCanvas.getContext("2d");
    authLabelContext.clearRect(0, 0, authLabelCanvas.width, authLabelCanvas.height);
    authLabelContext.fillStyle = "rgba(2,8,18,.94)";
    authLabelContext.fillRect(8, 18, 496, 92);
    authLabelContext.fillStyle = "#b9fbff";
    authLabelContext.font = "900 42px system-ui, sans-serif";
    authLabelContext.textAlign = "center";
    authLabelContext.textBaseline = "middle";
    authLabelContext.fillText("REN FACE ID", 256, 64);
    const authLabelTexture = new THREE.CanvasTexture(authLabelCanvas);
    authLabelTexture.colorSpace = THREE.SRGBColorSpace;
    const authLabel = addAuthPart(new THREE.Mesh(
      new THREE.PlaneGeometry(7.35, 1.52),
      new THREE.MeshBasicMaterial({
        map: authLabelTexture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    ));
    // PlaneGeometry の正面 (+Z) を、装置のレンズ正面 (+X) へ向ける。
    authLabel.rotation.y = Math.PI / 2;
    authLabel.position.set(3.08, 8.45, 0);

    // 装置の正面（UFOから見て外側）だけが認証位置だと分かるように、
    // 2つの発光する足跡を地面へ固定する。装置の真下や側面には判定を置かない。
    const footMarkerAssembly = new THREE.Group();
    footMarkerAssembly.position.set(18, .22, 0);
    footMarkerAssembly.userData.nonCollidable = true;
    faceAuthAssembly.add(footMarkerAssembly);
    // 足跡は白ミチロードセイバーレンの実モデルと同じ足色を使う。
    // 内側に別色の飾りを重ねず、足跡そのものを単一の形状で表示する。
    const footMarkerMaterial = physicalMaterial(0x8b5a34, .68, .08);
    const footBaseMaterial = physicalMaterial(0x183246, .46, .34, 0x0a7c8e, .26);
    const footBaseTopMaterial = physicalMaterial(0x2a5962, .56, .18, 0x0b5261, .18);

    // 枠ではなく、両足で立てることが分かる薄い認証台にする。
    const footBase = new THREE.Mesh(new THREE.CylinderGeometry(7.35, 7.8, .58, 32), footBaseMaterial);
    footBase.scale.set(.72, 1, 1);
    footBase.position.y = -.18;
    footBase.userData.nonCollidable = true;
    footMarkerAssembly.add(footBase);
    const footBaseTop = new THREE.Mesh(new THREE.CylinderGeometry(6.95, 6.95, .1, 32), footBaseTopMaterial);
    footBaseTop.scale.set(.72, 1, 1);
    footBaseTop.position.y = .13;
    footBaseTop.userData.nonCollidable = true;
    footMarkerAssembly.add(footBaseTop);

    // つま先を認証装置側（-X）に向けた、単一の小さな足跡シルエット。
    const footShape = new THREE.Shape();
    footShape.moveTo(1.05, -.72);
    footShape.quadraticCurveTo(1.48, -.18, 1.16, .28);
    footShape.quadraticCurveTo(.9, .86, .28, .98);
    footShape.quadraticCurveTo(-.82, 1.02, -1.62, .7);
    footShape.quadraticCurveTo(-2.28, .42, -2.32, 0);
    footShape.quadraticCurveTo(-2.28, -.42, -1.62, -.7);
    footShape.quadraticCurveTo(-.82, -1.02, .28, -.98);
    footShape.quadraticCurveTo(.9, -.86, 1.05, -.72);
    [-4.7, 4.7].forEach(z => {
      const footMark = new THREE.Mesh(new THREE.ShapeGeometry(footShape), footMarkerMaterial);
      footMark.rotation.x = -Math.PI / 2;
      footMark.position.set(0, .2, z);
      footMark.scale.set(.92, .92, .92);
      footMark.userData.nonCollidable = true;
      footMarkerAssembly.add(footMark);
    });

    // Inside: a forward-facing pilot seat, footwell, instrument shelf,
    // illuminated displays, and a yoke rather than a generic empty cabin.
    // The ramp reaches the craft at local X≈36.5 while the cockpit floor ends
    // at X=17. Without a visible connector, the player walks through the
    // opened shell and immediately falls to the cloud floor. This sloped
    // entry deck is the actual continuous walkway between those two floors.
    const interiorEntryLength = 20.5;
    // The internal walk-on connector must have exactly the same width as the
    // retractable drawer ramp.  The former 29-unit deck was 11 units wider
    // than the 18-unit ramp and visibly protruded from the UFO side.
    const interiorEntryWidth = rampWidth;
    const interiorEntryCenterX = 26.75;
    // The visible walk-on board is authored at world Z 118.5 when the UFO
    // remains at Z 118.3. Keep its visual mesh and its physics anchor on the
    // same local Z so the board moves as one piece.
    const interiorEntryCenterZ = 0.08;
    // Move the complete chair assembly by the same local-Z correction as the
    // walk-on board, keeping the seat, backrest, and headrest together.
    const chairZCorrection = interiorEntryCenterZ - (-6);
    const interiorEntryRise = 1.1;
    const interiorEntryRotation = -Math.atan2(interiorEntryRise, interiorEntryLength);
    const interiorEntry = addUfoPart(new THREE.Mesh(
      new THREE.BoxGeometry(interiorEntryLength, 1.4, interiorEntryWidth),
      cockpitDark,
    ));
    interiorEntry.position.set(interiorEntryCenterX, 9.45, interiorEntryCenterZ);
    interiorEntry.rotation.z = interiorEntryRotation;
    const interiorEntryLight = addUfoPart(new THREE.Mesh(
      new THREE.BoxGeometry(interiorEntryLength - 2, .45, .8),
      cockpitBlue,
    ));
    interiorEntryLight.position.set(interiorEntryCenterX, 10.28, interiorEntryCenterZ - interiorEntryWidth / 2 + 1.5);
    interiorEntryLight.rotation.z = interiorEntryRotation;
    const cockpitFloor = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(34, 1.4, 29), cockpitDark));
    cockpitFloor.position.set(0, 10, -6);
    const seat = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(16, 4, 15), ufoHullDark), { collidable: true });
    seat.position.set(0, 14, -2 + chairZCorrection);
    const seatBack = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(16, 21, 4), ufoHullDark), { collidable: true });
    seatBack.position.set(0, 23, 5 + chairZCorrection);
    const headRest = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(11, 7, 3), ufoTrim), { collidable: true });
    headRest.position.set(0, 35, 5 + chairZCorrection);
    const console = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(30, 8, 5), cockpitDark), { collidable: true });
    console.position.set(0, 25, -17);
    const display = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(18, 4.5, .7), cockpitBlue), { collidable: true });
    display.position.set(0, 29, -19.7);
    const leftInstrument = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(4, 2, .7), cockpitAmber), { collidable: true });
    const rightInstrument = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(4, 2, .7), cockpitAmber), { collidable: true });
    leftInstrument.position.set(-11, 28, -19.7); rightInstrument.position.set(11, 28, -19.7);
    const yoke = new THREE.Mesh(new THREE.TorusGeometry(5, 1.1, 10, 28), cockpitAmber);
    yoke.position.set(0, 30, -22); addUfoPart(yoke, { collidable: true });
    const yokeHub = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 10), cockpitAmber);
    yokeHub.position.set(0, 30, -22); addUfoPart(yokeHub, { collidable: true });
    const yokeStem = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 7, 12), cockpitAmber);
    yokeStem.position.set(0, 26, -22); addUfoPart(yokeStem, { collidable: true });

    group.userData.ufoDoorControls = {
      rampAssembly,
      rampClosedPosition,
      rampOpenPosition,
      rampClosedRotation,
      rampOpenRotation,
      rampLength,
      rampWidth,
      rampRise,
      ufoBottomTopY,
      ufoBottomTopRadius,
      ufoBottomLowerRadius,
      ufoBottomThickness,
      interiorEntryLength,
      interiorEntryWidth,
      interiorEntryCenterX,
      interiorEntryCenterZ,
      interiorEntryRise,
      interiorEntryRotation,
      interiorEntryCenterY: 9.45,
      cockpitFloorCenterX: 0,
      cockpitFloorCenterZ: -6,
      cockpitFloorSizeX: 34,
      cockpitFloorSizeZ: 29,
      cockpitFloorTopY: 10.7,
      hatchCover,
      hatchClosedPosition,
      hatchOpenPosition,
      amount: state.ufoDoorOpen ? 1 : 0,
      target: state.ufoDoorOpen ? 1 : 0,
      faceAuth: {
        assembly: faceAuthAssembly,
        markerAssembly: footMarkerAssembly,
        screen: authScreen,
        ring: authRing,
        light: authLight,
        active: false,
        phase: 0,
        localX: 0,
        localZ: 0,
        standLocalX: 0,
        standLocalZ: 0,
        standWorldX: 0,
        standWorldZ: 0,
        worldAnchored: false,
      },
    };
    return group;
  }
  if (source.id === "sky-garden") {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(sx, sz) * .5, Math.min(sx, sz) * .56, 7, 24), main);
    base.position.y = 3.5;
    base.castShadow = base.receiveShadow = true;
    group.add(base);
    for (let i = 0; i < 12; i += 1) {
      const angle = i / 12 * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 18, 10), trim);
      pillar.position.set(Math.cos(angle) * sx * .38, 12, Math.sin(angle) * sz * .38);
      pillar.castShadow = true;
      group.add(pillar);
    }
    const canopy = new THREE.Mesh(new THREE.CylinderGeometry(sx * .34, sx * .42, 5, 24), glass);
    canopy.position.y = 23;
    canopy.castShadow = true;
    group.add(canopy);
  } else if (source.id === "coast-deck") {
    addBox(group, [sx, 6, sz], [0, 3, 0], physicalMaterial(0xa36b36, .8, .02));
    for (let x = -sx / 2 + 5; x <= sx / 2 - 5; x += 8) addBox(group, [1.3, .4, sz - 4], [x, 6.2, 0], trim);
    [-sx / 2 + 2, sx / 2 - 2].forEach(x => addBox(group, [2, 14, sz], [x, 12, 0], dark));
  } else if (source.id === "storage" || source.id === "workshop") {
    addBox(group, [sx, sy * .7, sz], [0, sy * .35, 0], main);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(sx * .5, sx * .5, sz, 28, 1, false, 0, Math.PI), dark);
    roof.rotation.x = Math.PI / 2;
    roof.rotation.z = Math.PI / 2;
    roof.position.y = sy * .7;
    roof.castShadow = true;
    group.add(roof);
    addBox(group, [sx * .42, sy * .56, 1.8], [0, sy * .3, sz / 2 + 1], physicalMaterial(0x27313b, .48, .35));
  } else {
    addBox(group, [sx, sy, sz], [0, sy / 2, 0], main);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(sx, sz) * .68, Math.max(14, sy * .34), 4), dark);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = sy + Math.max(14, sy * .34) / 2 - .5;
    roof.castShadow = true;
    group.add(roof);
    addBox(group, [sx * .24, sy * .72, 1.8], [0, sy * .36, sz / 2 + 1], physicalMaterial(0x76502c, .64, .04));
    [-sx * .29, sx * .29].forEach(x => addBox(group, [sx * .2, sy * .24, 1.3], [x, sy * .63, sz / 2 + 1], glass));
  }
  return group;
}

function addCatalogCollisionColliders(item, source) {
  if (source.id === "ufo-pad") {
    // The ramp, cockpit floor, and entry deck are authored separately below.
    // For the touchable cockpit parts, however, use the same visible meshes
    // and world matrices as every other building. This prevents the seat,
    // console, yoke, and instrument panels from becoming pass-through props.
    const group = item.__collisionGroup;
    if (group) addVisualBuildingColliders(group, item.id, {
      registerObstacles: true,
      registerSurfaces: false,
    });
    return;
  }
  // 建物の種類では分岐せず、描画された全メッシュから同じ規則で
  // 歩行面と障害物を抽出する。デッキ、家、倉庫、工房、庭園を共通化する。
  const group = item.__collisionGroup;
  if (group) addVisualBuildingColliders(group, item.id, { registerSurfaces: false });
  const [sx, , sz] = source.size;
  if (source.id === "coast-deck" || source.id === "sky-garden") {
    addAuthoritativeSurface({
      id: `${item.id}-surface`,
      buildingId: item.id,
      x: item.position[0],
      z: item.position[2],
      rotation: 0,
      size: [sx * BUILDING_SCALE, sz * BUILDING_SCALE],
      height: (source.id === "coast-deck" ? 6 : 7) * BUILDING_SCALE,
    });
  }
}

function clearUfoRampPhysics() {
  if (!ufoRampPhysicsIds.length) return;
  const ids = new Set(ufoRampPhysicsIds.map(entry => (
    typeof entry === "string" ? entry : entry?.id
  )).filter(Boolean));
  const removeIds = list => {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (ids.has(list[index].id)) list.splice(index, 1);
    }
  };
  removeIds(walkableSurfaces);
  removeIds(colliders);
  removeIds(physicsElements.floors);
  removeIds(physicsElements.risers);
  removeIds(physicsElements.walls);
  ufoRampPhysicsIds.length = 0;
}

function addUfoBottomClosedCollider(control) {
  const scale = control.scale || BUILDING_SCALE;
  const topY = (control.originY || 0) + (control.ufoBottomTopY || 0) * scale;
  const thickness = (control.ufoBottomThickness || 0) * scale;
  const radius = (control.ufoBottomLowerRadius || 40.8) * scale;
  const segmentCount = 64;
  const polygon = [];
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = index / segmentCount * Math.PI * 2;
    polygon.push({
      x: control.originX + Math.cos(angle) * radius,
      z: control.originZ + Math.sin(angle) * radius,
    });
  }
  const id = `${control.buildingId}-ufo-bottom-closed`;
  registerPhysicsCollider({
    x: control.originX,
    z: control.originZ,
    rotation: 0,
    minY: Math.max(0, topY - thickness),
    maxY: topY,
    obstacleHeight: topY,
    id,
    buildingId: control.buildingId,
    clearance: 0,
    polygon,
  });
  ufoRampPhysicsIds.push(id);
}

function addUfoBottomOpenFloor(control) {
  const scale = control.scale || BUILDING_SCALE;
  const topY = Math.max(0, (control.originY || 0) + (control.ufoBottomTopY || 0) * scale);
  const radius = control.ufoBottomTopRadius || 38.4;
  // The circular bottom is represented by narrow, overlapping strips. Their
  // outer edge stays inside the authored circular mesh, while the strip at
  // the +X entry overlaps the ramp's inner end. This makes the bottom a real
  // floor without turning the round perimeter into a square invisible room.
  const segmentCount = 24;
  const stripWidth = (radius * 2) / segmentCount;
  for (let index = 0; index < segmentCount; index += 1) {
    const localX = -radius + stripWidth * (index + .5);
    const edgeX = Math.min(radius, Math.abs(localX) + stripWidth / 2);
    const halfZ = Math.sqrt(Math.max(0, radius * radius - edgeX * edgeX));
    if (halfZ < .5) continue;
    const world = ufoLocalToWorld(control, localX, 0);
    const id = `${control.buildingId}-ufo-bottom-floor-${index}`;
    registerPhysicsFloor({
      id,
      buildingId: control.buildingId,
      x: world.x,
      z: world.z,
      rotation: control.rotation || 0,
      halfX: stripWidth * scale / 2,
      halfZ: halfZ * scale,
      height: topY,
      physicsSource: "ufo-bottom-floor",
    });
    ufoRampPhysicsIds.push(id);
  }
}

function setUfoRampPhysics(open) {
  clearUfoRampPhysics();
  if (!open) {
    // The static shell intentionally leaves the +X boarding opening clear.
    // When the physical hatch is closed, add only the matching door section;
    // when it opens, remove this section together with the visual hatch.
    ufoDoorControls.forEach(control => {
      addUfoBottomClosedCollider(control);
      addUfoClosedHatchCollider(control);
    });
    refreshPhysicsDebugVisuals();
    return;
  }
  ufoDoorControls.forEach(control => {
    addUfoBottomOpenFloor(control);
    const scale = control.scale || BUILDING_SCALE;
    // Keep every height change below the normal step threshold. The player
    // can therefore walk from the cloud floor onto the ramp without jumping;
    // the rendered ramp remains one continuous slope while physics follows
    // it with small, overlapping support strips.
    const segmentCount = 160;
    const rampLength = control.rampLength || 84;
    const rampWidth = control.rampWidth || 18;
    const rampRise = control.rampRise || 10;
    // The visible walk surface is the smaller top box, not the outer body.
    // Build the same finite rectangle here and rotate it around the ramp's
    // own centre, exactly as the rendered rampAssembly does.
    const surfaceLength = rampLength - 3;
    const surfaceWidth = rampWidth - 4;
    const segmentLength = surfaceLength / segmentCount;
    const surfaceTopY = 1.55 + .55 / 2;
    // UFOの姿勢ではなく、描画足場そのものの傾斜を使う。ここを
    // group.rotation.y から取ると、見た目だけ坂で物理が水平になる。
    const rampRotationZ = control.rampOpenRotation || 0;
    const cosRamp = Math.cos(rampRotationZ);
    const sinRamp = Math.sin(rampRotationZ);
    const worldRotationY = control.rotation || 0;
    const cosWorld = Math.cos(worldRotationY);
    const sinWorld = Math.sin(worldRotationY);
    for (let index = 0; index < segmentCount; index += 1) {
      const rampLocalX = -surfaceLength / 2 + segmentLength * (index + .5);
      // Rotate the top-face centre in the same local XY plane as the visible
      // ramp. Z is its width axis and is not tilted by rotation.z. Only after
      // that do we apply the UFO's world yaw, matching the scene graph.
      const localX = control.rampOpenPosition.x + cosRamp * rampLocalX - sinRamp * surfaceTopY;
      const localZ = control.rampOpenPosition.z;
      const x = control.originX + (cosWorld * localX + sinWorld * localZ) * scale;
      const z = control.originZ + (-sinWorld * localX + cosWorld * localZ) * scale;
      const height = Math.max(
        0,
        (control.originY || 0) + (control.rampOpenPosition.y + sinRamp * rampLocalX + cosRamp * surfaceTopY) * scale,
      );
      const id = `${control.buildingId}-ufo-ramp-surface-${index}`;
      registerPhysicsFloor({
        id,
        buildingId: control.buildingId,
        x,
        z,
        rotation: worldRotationY,
        halfX: segmentLength * scale * .56,
        halfZ: surfaceWidth * scale / 2,
        height,
        physicsSource: "ufo-opening-ramp",
      });
      ufoRampPhysicsIds.push(id);
    }

    // The visible interior entry deck is a short slope from the ramp lip to
    // the cockpit floor. Keep the same finite width and rotation as the
    // rendered mesh, using small support strips so every point on the slope
    // is a real walkable surface rather than an invisible void.
    const entryLength = control.interiorEntryLength || 20.5;
    const entryWidth = control.interiorEntryWidth || control.rampWidth || 18;
    const entryCenterX = control.interiorEntryCenterX || 26.75;
    const entryCenterZ = control.interiorEntryCenterZ ?? -6;
    const entryCenterY = control.interiorEntryCenterY || 9.45;
    const entryRotation = control.interiorEntryRotation || 0;
    const entrySegmentCount = 32;
    const entrySegmentLength = entryLength / entrySegmentCount;
    const entryTopY = .7;
    const cosEntry = Math.cos(entryRotation);
    const sinEntry = Math.sin(entryRotation);
    for (let index = 0; index < entrySegmentCount; index += 1) {
      const entryLocalX = -entryLength / 2 + entrySegmentLength * (index + .5);
      const localX = entryCenterX + cosEntry * entryLocalX - sinEntry * entryTopY;
      const localZ = entryCenterZ;
      const x = control.originX + (cosWorld * localX + sinWorld * localZ) * scale;
      const z = control.originZ + (-sinWorld * localX + cosWorld * localZ) * scale;
      const height = Math.max(
        0,
        (control.originY || 0)
          + (entryCenterY + sinEntry * entryLocalX + cosEntry * entryTopY) * scale,
      );
      const id = `${control.buildingId}-ufo-interior-entry-${index}`;
      registerPhysicsFloor({
        id,
        buildingId: control.buildingId,
        x,
        z,
        rotation: worldRotationY,
        halfX: entrySegmentLength * scale * .56,
        halfZ: entryWidth * scale / 2,
        height,
        physicsSource: "ufo-interior-entry",
      });
      ufoRampPhysicsIds.push(id);
    }

    // The cockpit floor is also an explicit physical surface. The UFO hull
    // intentionally has no catch-all collider, so this floor must be added
    // independently when the side opening is active.
    const cockpitFloorSizeX = control.cockpitFloorSizeX || 34;
    const cockpitFloorSizeZ = control.cockpitFloorSizeZ || 29;
    const cockpitFloorWorld = ufoLocalToWorld(
      control,
      control.cockpitFloorCenterX || 0,
      control.cockpitFloorCenterZ ?? -6,
    );
    const cockpitFloorId = `${control.buildingId}-ufo-cockpit-floor`;
    registerPhysicsFloor({
      id: cockpitFloorId,
      buildingId: control.buildingId,
      x: cockpitFloorWorld.x,
      z: cockpitFloorWorld.z,
      rotation: worldRotationY,
      halfX: cockpitFloorSizeX * scale / 2,
      halfZ: cockpitFloorSizeZ * scale / 2,
      height: Math.max(0, (control.originY || 0) + (control.cockpitFloorTopY || 10.7) * scale),
      physicsSource: "ufo-cockpit-floor",
    });
    ufoRampPhysicsIds.push(cockpitFloorId);
  });
  refreshPhysicsDebugVisuals();
}

function isWithinOpenUfoRampCorridor(x, z, padding = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  return ufoDoorControls.some(control => {
    const isOpen = (control.amount || 0) > .001 || (control.target || 0) > .001;
    if (!isOpen) return false;
    const local = ufoWorldToLocal(control, x, z);
    const rampLength = control.rampLength || 84;
    const rampWidth = control.rampWidth || 18;
    const surfaceLength = rampLength - 3;
    const surfaceWidth = rampWidth - 4;
    const centerX = control.rampOpenPosition?.x || 0;
    const centerZ = control.rampOpenPosition?.z || 0;
    // This corridor is derived from the same visible top-face dimensions used
    // by setUfoRampPhysics. The small allowance covers the actual rounded
    // character footprint at the two finite ends; it is not a building-wide
    // exception and cannot open the UFO hull beside the ramp.
    const endAllowance = 2.4 + padding;
    const sideAllowance = 1.2 + padding;
    return Math.abs(local.x - centerX) <= surfaceLength / 2 + endAllowance
      && Math.abs(local.z - centerZ) <= surfaceWidth / 2 + sideAllowance;
  });
}

function isContinuousUfoRampTransition(transition) {
  if (!transition || !transition.ascending) return false;
  // The first movement sample at the outer lip can still be outside every
  // small support strip even though the character is visibly on the ramp
  // entrance. Treat the authored ramp rectangle as one continuous walkable
  // plane for the step gate, so the entry cannot catch on a strip boundary.
  if (isWithinOpenUfoRampCorridor(transition.fromX, transition.fromZ, 1.2)
    || isWithinOpenUfoRampCorridor(transition.toX, transition.toZ, 1.2)) {
    // The authored top face is the ramp itself. Do not apply the ordinary
    // riser threshold here: at the outer lip the old strip sampler could read
    // 0 -> 1.9 even though the rendered ramp is continuous, which made a
    // walking character stop at the exact place the user can see as a slope.
    return true;
  }
  const isRampSurfaceAt = (x, z, height) => walkableSurfaces.some(surface => {
    if (surface.physicsSource !== "ufo-opening-ramp") return false;
    if (Math.abs(surface.height - height) > .24) return false;
    const local = surfaceLocalPoint(x, z, surface);
    return Math.abs(local.x) <= surface.halfX + 1.2
      && Math.abs(local.z) <= surface.halfZ + 1.2;
  });
  // UFO内部の接続スロープも、表示上は一枚の坂であり、細片の境界を
  // 段差として扱ってはいけない。ここを通常の
  // 段差判定へ流すと、歩行速度の1フレームで複数細片をまたいだ瞬間に
  // 0.2超の上昇と誤認して止まる。
  const isInteriorSlopeSurfaceAt = (x, z, height) => walkableSurfaces.some(surface => {
    if (surface.physicsSource !== "ufo-interior-entry") return false;
    if (Math.abs(surface.height - height) > .35) return false;
    const local = surfaceLocalPoint(x, z, surface);
    return Math.abs(local.x) <= surface.halfX + 1.2
      && Math.abs(local.z) <= surface.halfZ + 1.2;
  });
  // A continuous ramp is the one case where a higher next strip is meant to
  // be reached by ordinary walking. Include the cloud-to-ramp boundary: the
  // first step used to be rejected before the character had entered a strip,
  // which made the visible ramp look walkable but physically inaccessible.
  const fromOnRamp = isRampSurfaceAt(transition.fromX, transition.fromZ, transition.fromHeight);
  const toOnRamp = isRampSurfaceAt(transition.toX, transition.toZ, transition.toHeight);
  const fromOnInteriorSlope = isInteriorSlopeSurfaceAt(
    transition.fromX,
    transition.fromZ,
    transition.fromHeight,
  );
  const toOnInteriorSlope = isInteriorSlopeSurfaceAt(
    transition.toX,
    transition.toZ,
    transition.toHeight,
  );
  return (fromOnRamp || toOnRamp)
    ? transition.toHeight - transition.fromHeight <= 1.1
    : (fromOnInteriorSlope || toOnInteriorSlope)
    && transition.toHeight - transition.fromHeight <= 1.1;
}

function addBuilding(parent, item, source = item) {
  const [sx, sy, sz] = source.size;
  const group = buildCatalogModel(source);
  group.scale.setScalar(BUILDING_SCALE);
  group.position.set(item.position[0], item.position[1], item.position[2]);
  group.userData.buildingId = item.id;
  if (!parent.userData?.preview) {
    addCatalogCollisionColliders({ ...item, __collisionGroup: group }, source);
    if (source.id === "ufo-pad" && group.userData.ufoDoorControls) {
      group.userData.ufoDoorControls.buildingId = item.id;
      group.userData.ufoDoorControls.originX = item.position[0];
      group.userData.ufoDoorControls.originY = item.position[1] || 0;
      group.userData.ufoDoorControls.originZ = item.position[2];
      group.userData.ufoDoorControls.rotation = group.rotation.y;
      group.userData.ufoDoorControls.scale = BUILDING_SCALE;
      addUfoStructuralColliders(group.userData.ufoDoorControls, item.id);
      const faceAuth = group.userData.ufoDoorControls.faceAuth;
      // The scanner is a map object, not a part of the UFO hull. Detach it
      // before the UFO group is added so its world position cannot be pulled
      // into the craft by the hull's local transform.
      group.remove(faceAuth.assembly);
      faceAuth.assembly.scale.setScalar(BUILDING_SCALE);
      faceAuth.worldAnchored = true;
      parent.add(faceAuth.assembly);
      placeUfoFaceAuthAtWorldPosition(
        group.userData.ufoDoorControls,
        item.faceAuthPosition,
      );
      ufoDoorControls.push(group.userData.ufoDoorControls);
    }
  }
  if (state.labels) {
    const label = makeTextLabel(item.name, source.fixed ? "#ffe5a2" : "#a9ffc9");
    label.position.y = sy + Math.max(20, sy * .45);
    setLabelWorldScale(label, BUILDING_SCALE);
    group.add(label);
  }
  parent.add(group);
}

function buildPlacementPosition(source) {
  if (source?.placement === "current") {
    return [state.position.x, 0, state.position.z];
  }
  return mapBuildZone(MAPS[state.map]).position;
}

function buildItemsForMap() {
  return Array.isArray(builtByMap[state.map]) ? builtByMap[state.map] : [];
}

function currentUfoPadItem() {
  return buildItemsForMap().find(item => item.catalogId === "ufo-pad") || null;
}

function updateUfoDoorAnimation(delta) {
  ufoDoorControls.forEach(control => {
    control.amount += (control.target - control.amount) * Math.min(1, delta * 8);
    const amount = control.amount;
    control.rampAssembly.visible = amount > .001 || control.target > .001;
    control.rampAssembly.position.copy(control.rampClosedPosition).lerp(control.rampOpenPosition, amount);
    control.rampAssembly.rotation.z = THREE.MathUtils.lerp(control.rampClosedRotation, control.rampOpenRotation, amount);
    if (control.hatchCover) {
      // パネルが外殻の内側へ入った後は外から見せない。これにより、
      // 開口部の中で宙に浮くような見え方を防ぎ、閉じる時だけ外殻へ戻す。
      control.hatchCover.visible = amount < .86;
      if (control.hatchCover.visible) {
        control.hatchCover.position.copy(control.hatchClosedPosition).lerp(control.hatchOpenPosition, amount);
      } else {
        control.hatchCover.position.copy(control.hatchOpenPosition);
      }
    }
    if (control.faceAuth) {
      const faceAuth = control.faceAuth;
      faceAuth.phase += delta;
      const pulse = .9 + Math.sin(faceAuth.phase * 4.2) * .1;
      faceAuth.ring.scale.setScalar(faceAuth.active ? 1.08 + pulse * .12 : 1);
      faceAuth.light.intensity = faceAuth.active ? 3.2 * pulse : 1.5;
      faceAuth.screen.material.emissive.setHex(faceAuth.active ? 0x1fbad5 : 0x116b84);
      faceAuth.screen.material.emissiveIntensity = faceAuth.active ? 1.45 : .52;
    }
  });
}

function ufoLocalPoint(control, x, z) {
  const scale = control.scale || BUILDING_SCALE;
  const rotation = control.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: control.originX + (cos * x + sin * z) * scale,
    z: control.originZ + (-sin * x + cos * z) * scale,
  };
}

function ufoWorldToLocal(control, x, z) {
  const scale = control.scale || BUILDING_SCALE;
  const rotation = control.rotation || 0;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = (x - control.originX) / scale;
  const dz = (z - control.originZ) / scale;
  return {
    x: cos * dx - sin * dz,
    z: sin * dx + cos * dz,
  };
}

function placeUfoFaceAuthAtWorldPosition(control, worldPosition) {
  const faceAuth = control?.faceAuth;
  if (!faceAuth || !Array.isArray(worldPosition) || worldPosition.length < 2) return;
  const worldX = Number(worldPosition[0]);
  const worldZ = Number(worldPosition[1]);
  if (faceAuth.worldAnchored) {
    faceAuth.assembly.position.set(
      worldX - UFO_FACE_AUTH_MARKER_OFFSET_LOCAL_X * BUILDING_SCALE,
      0,
      worldZ,
    );
    faceAuth.standWorldX = worldX;
    faceAuth.standWorldZ = worldZ;
    return;
  }
  const markerLocal = ufoWorldToLocal(control, worldX, worldZ);
  if (!Number.isFinite(markerLocal.x) || !Number.isFinite(markerLocal.z)) return;
  const deviceLocalX = markerLocal.x - UFO_FACE_AUTH_MARKER_OFFSET_LOCAL_X;
  // The marker is the saved standing point. The scanner is a short distance
  // in front of it, never at a fixed UFO coordinate and never following the
  // player after the building has been placed.
  faceAuth.assembly.position.set(deviceLocalX, 0, markerLocal.z);
  faceAuth.localX = deviceLocalX;
  faceAuth.localZ = markerLocal.z;
  faceAuth.standLocalX = markerLocal.x;
  faceAuth.standLocalZ = markerLocal.z;
}

function ufoLocalToWorld(control, localX, localZ) {
  const rotation = Number(control.rotation) || 0;
  const scale = control.scale || BUILDING_SCALE;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: control.originX + (cos * localX + sin * localZ) * scale,
    z: control.originZ + (-sin * localX + cos * localZ) * scale,
  };
}

function isUfoFaceAuthAnchorOutside(control, worldPosition) {
  if (!Array.isArray(worldPosition) || worldPosition.length < 2) return false;
  const local = ufoWorldToLocal(control, Number(worldPosition[0]), Number(worldPosition[1]));
  if (!Number.isFinite(local.x) || !Number.isFinite(local.z)) return false;
  // The hull radius is 42 local units. The ramp occupies roughly x=35..119
  // and is 18 units wide. Leave clearance so the device never lands in the
  // craft or on the boarding ramp.
  const insideHull = Math.hypot(local.x, local.z) <= 50;
  const onRamp = local.x >= 26 && local.x <= 128 && Math.abs(local.z) <= 16;
  return !insideHull && !onRamp;
}

function resolveUfoFaceAuthAnchor(control, savedPosition) {
  const currentPosition = [state.position.x, state.position.z];
  if (isUfoFaceAuthAnchorOutside(control, currentPosition)) return currentPosition;
  if (isUfoFaceAuthAnchorOutside(control, savedPosition)) return savedPosition;
  const currentLocal = ufoWorldToLocal(control, state.position.x, state.position.z);
  const safeLocalZ = clamp(currentLocal.z, -30, 30);
  const safeWorld = ufoLocalToWorld(control, 150, safeLocalZ);
  return [safeWorld.x, safeWorld.z];
}

function isCameraFacingFaceScanner(control) {
  const faceAuth = control?.faceAuth;
  if (!faceAuth?.assembly) return false;
  faceAuth.assembly.updateWorldMatrix(true, false);
  // グループ原点は装置の台座側にあり、そこを判定点にするとレンズの
  // 正面から外れていても認証できてしまう。実際に顔を向けるレンズ中心を
  // ワールド座標へ変換して、そこへの方向だけを判定に使う。
  const lensPoint = new THREE.Vector3(
    UFO_FACE_AUTH_LENS_LOCAL_POSITION.x,
    UFO_FACE_AUTH_LENS_LOCAL_POSITION.y,
    UFO_FACE_AUTH_LENS_LOCAL_POSITION.z,
  ).applyMatrix4(faceAuth.assembly.matrixWorld);
  const dx = lensPoint.x - state.position.x;
  const dz = lensPoint.z - state.position.z;
  if (Math.hypot(dx, dz) < .001) return false;
  const directionToDevice = Math.atan2(dx, dz);
  // 三人称ではカメラを周囲へ回してもキャラクターの顔は回らない。
  // 認証対象は画面の向きではなく、実際に表示されているキャラクターの
  // 顔の向き（モデルの回転）なので、ここは character.rotation.y を使う。
  const faceHeading = Number.isFinite(character?.rotation?.y)
    ? character.rotation.y
    : state.heading;
  const angleDelta = Math.atan2(
    Math.sin(directionToDevice - faceHeading),
    Math.cos(directionToDevice - faceHeading),
  );
  return Math.abs(angleDelta) <= UFO_FACE_AUTH_FACING_TOLERANCE;
}

function isWhiteRenAtFaceScanner(control) {
  const faceAuth = control?.faceAuth;
  if (!faceAuth || state.ufoBoarded || state.jumpY > .1 || state.jumpVelocity !== 0) return false;
  if (faceAuth.worldAnchored) {
    return Math.abs(state.position.x - faceAuth.standWorldX) <= 11
      && Math.abs(state.position.z - faceAuth.standWorldZ) <= 11
      && isCameraFacingFaceScanner(control)
      && !state.moving;
  }
  const local = ufoWorldToLocal(control, state.position.x, state.position.z);
  // 認証装置の正面だけを認証範囲にする。横や背面から触れただけでは
  // 開かず、装置前の一人分の立ち位置に止まった時だけ認証する。
  return local.x >= faceAuth.standLocalX - 10
    && local.x <= faceAuth.standLocalX + 11
    && Math.abs(local.z - faceAuth.standLocalZ) <= 11
    && isCameraFacingFaceScanner(control)
    && !state.moving;
}

function setUfoDoorState(open, message = null) {
  if (state.ufoDoorOpen === open) return;
  state.ufoDoorOpen = open;
  ufoDoorControls.forEach(control => {
    control.target = open ? 1 : 0;
    if (control.faceAuth) control.faceAuth.active = open && state.ufoFaceAuth;
  });
  setUfoRampPhysics(open);
  if (message) showToast(message);
}

function updateUfoFaceAuthentication() {
  const pad = currentUfoPadItem();
  const control = ufoDoorControls[0];
  if (!pad || !control || state.ufoBoarded) return;
  const recognized = isWhiteRenAtFaceScanner(control);
  // 認証ランプも現在の向きに同期させる。いったん認証して足場が出た後に
  // 進行方向へ向き直ること自体は許可するが、向いていない状態を新たな
  // 認証成功として扱ったり、認証中の表示を残したりしない。
  if (control.faceAuth) control.faceAuth.active = recognized;
  if (recognized && !state.ufoFaceAuthLatched) {
    state.ufoFaceAuthLatched = true;
    state.ufoFaceAuth = true;
    setUfoDoorState(true, "白ミチロードセイバーレンを認証。UFOの搭乗足場を引き出します");
  } else if (!recognized) {
    state.ufoFaceAuthLatched = false;
  }
  const distanceFromPad = Math.hypot(state.position.x - pad.position[0], state.position.z - pad.position[2]);
  if (state.ufoFaceAuth && distanceFromPad > UFO_RAMP_KEEP_OPEN_RADIUS && !state.ufoBoarded) {
    state.ufoFaceAuth = false;
    setUfoDoorState(false, "認証エリアを離れたため、UFOの足場を収納しました");
  }
}

function updateUfoControls() {
  if (!els.ufoDoorButton || !els.ufoBoardButton || !els.ufoStatus) return;
  updateUfoFaceAuthentication();
  const pad = currentUfoPadItem();
  const hasPad = Boolean(pad);
  const nearPad = hasPad && Math.hypot(state.position.x - pad.position[0], state.position.z - pad.position[2]) <= UFO_ACCESS_RADIUS;
  els.ufoDoorButton.disabled = !hasPad || state.ufoBoarded;
  els.ufoDoorButton.textContent = state.ufoDoorOpen ? "右側搭乗足場を収納" : "右側搭乗足場を手動で展開";
  els.ufoBoardButton.textContent = state.ufoBoarded ? "UFOから降りる" : "UFOに乗る";
  els.ufoBoardButton.disabled = !hasPad || (!state.ufoBoarded && (!state.ufoDoorOpen || !nearPad));
  if (!hasPad) els.ufoStatus.textContent = "UFO乗り場を建造してください。";
  else if (state.ufoBoarded) els.ufoStatus.textContent = "操縦席に搭乗中。もう一度押すと乗り場へ戻ります。";
  else if (state.ufoFaceAuth) els.ufoStatus.textContent = "顔認証済み。右側搭乗足場を引き出しています。";
  else if (!nearPad) els.ufoStatus.textContent = "顔認証装置の前まで移動してください。";
  else if (!state.ufoDoorOpen) els.ufoStatus.textContent = "顔認証装置の前に立つと、搭乗足場が自動で引き出されます。";
  else els.ufoStatus.textContent = "右側搭乗足場が展開されています。足場から操縦席へ進めます。";
}

function toggleUfoDoor() {
  if (!currentUfoPadItem() || state.ufoBoarded) return;
  const open = !state.ufoDoorOpen;
  if (!open) state.ufoFaceAuth = false;
  setUfoDoorState(open);
  updateUfoControls();
  showToast(open ? "UFO右側の搭乗足場を引き出しました" : "UFO右側の搭乗足場を収納しました");
}

function toggleUfoBoarding() {
  const pad = currentUfoPadItem();
  if (!pad) return;
  if (state.ufoBoarded) {
    state.ufoBoarded = false;
    state.position.set(pad.position[0], 0, pad.position[2]);
    state.groundY = 0;
    state.jumpY = 0;
    state.jumpVelocity = 0;
    state.falling = false;
    state.supportSurfaceId = null;
    updateCharacter(0);
    updateCamera();
    updateUfoControls();
    saveState();
    showToast("UFOから降りました");
    return;
  }
  if (!state.ufoDoorOpen) { showToast("先に搭乗足場を展開してください"); return; }
  if (Math.hypot(state.position.x - pad.position[0], state.position.z - pad.position[2]) > UFO_ACCESS_RADIUS) {
    showToast("UFO乗り場の近くまで移動してください");
    return;
  }
  state.ufoBoarded = true;
  state.fastWalking = false;
  state.groundY = 0;
  state.jumpY = 0;
  state.jumpVelocity = 0;
  state.falling = false;
  state.supportSurfaceId = null;
  updateCharacter(0);
  updateCamera();
  updateUfoControls();
  showToast("白ミチロードセイバーレンが操縦席に乗り込みました");
}

function rebuildMap() {
  if (!mapGroup) return;
  while (mapGroup.children.length) mapGroup.remove(mapGroup.children[0]);
  ufoDoorControls.length = 0;
  ufoRampPhysicsIds.length = 0;
  // 物理の情報源は常にこの再構築で全消去してから作り直す。
  // 前マップの床や段差を残したまま次のマップへ持ち越さない。
  colliders.length = 0;
  walkableSurfaces.length = 0;
  physicsElements.floors.length = 0;
  physicsElements.risers.length = 0;
  physicsElements.walls.length = 0;
  clearThreeGroup(physicsMeshGroup);
  clearThreeGroup(physicsDebugGroup);
  labelsGroup = new THREE.Group();
  mapGroup.add(makeGround(MAPS[state.map]));
  addMapEntry(mapGroup, MAPS[state.map]);
  (MAPS[state.map].fixedStructures || []).forEach(structure => addFixedStructure(mapGroup, MAPS[state.map], structure));
  let faceAuthAnchorRepaired = false;
  let ufoPlacementRepaired = false;
  buildItemsForMap().forEach(item => {
    const source = MAPS[state.map].buildCatalog.find(candidate => candidate.id === item.catalogId);
    if (source?.id === "ufo-pad") {
      const restoredPosition = [UFO_PLACEMENT_POSITION.x, 0, UFO_PLACEMENT_POSITION.z];
      if (!Array.isArray(item.position)
        || Number(item.position[0]) !== restoredPosition[0]
        || Number(item.position[2]) !== restoredPosition[2]) {
        item.position = restoredPosition;
        ufoPlacementRepaired = true;
      }
      const fixedAnchor = [
        UFO_FACE_AUTH_FIXED_WORLD_ANCHOR.x,
        UFO_FACE_AUTH_FIXED_WORLD_ANCHOR.z,
      ];
      // 保存値が過去の誤配置でも、今回指定された座標を唯一の正とする。
      // 以後は同じ座標を保存し、内部床の追加や再構築で移動させない。
      if (!Array.isArray(item.faceAuthPosition)
        || Number(item.faceAuthPosition[0]) !== fixedAnchor[0]
        || Number(item.faceAuthPosition[1]) !== fixedAnchor[1]) {
        item.faceAuthPosition = fixedAnchor;
        item.faceAuthAnchorLocked = true;
        faceAuthAnchorRepaired = true;
      } else if (!item.faceAuthAnchorLocked) {
        // 座標は変えず、今後の再構築で再計算されないようロックだけ付ける。
        item.faceAuthAnchorLocked = true;
        faceAuthAnchorRepaired = true;
      }
    }
    if (source) addBuilding(mapGroup, item, source);
  });
  setUfoRampPhysics(state.ufoDoorOpen);
  mapGroup.add(labelsGroup);
  MAPS[state.map].buildZones.forEach((zone, index) => {
    const plot = mapBuildZone(MAPS[state.map], index);
    const plotMesh = new THREE.Mesh(new THREE.PlaneGeometry(plot.size[0], plot.size[1]), new THREE.MeshBasicMaterial({ color: 0x9affbf, transparent: true, opacity: .07, side: THREE.DoubleSide }));
    plotMesh.rotation.x = -Math.PI / 2; plotMesh.position.set(plot.position[0], .16, plot.position[2]); plotMesh.name = `buildable-area-${plot.id}`; mapGroup.add(plotMesh);
  });
  mapGroup.updateMatrixWorld(true);
  refreshPhysicsDebugVisuals();
  // Rebuilds also happen after a building is placed.  A character merely
  // standing close to a wall must not be pushed across that wall by the
  // static recovery pass. Recover only a real, deep overlap; when a current-
  // placement UFO pad exists, it is the intended safe landing point for that
  // recovery instead of an arbitrary SAT escape direction.
  const currentUfoPad = buildItemsForMap().find(item => item.catalogId === "ufo-pad");
  const currentPenetration = groundCollisionPenetrationAt(
    state.position.x,
    state.position.z,
    state.groundY,
    state.jumpY,
  );
  let recoveredPosition = false;
  if (state.pendingSafeEntry) {
    // 起動・リロードでは指定した入口を最優先にする。既存UFOの
    // 「深い重なりならパッドへ戻す」救済処理で、安全地点を別の場所へ
    // 上書きしてはいけない。
    resetPlayerToMapSpawn("sky", { fromEntry: true });
    state.pendingSafeEntry = false;
  } else if (currentPenetration > 1.5) {
    if (currentUfoPad?.position?.length >= 3) {
      state.position.set(currentUfoPad.position[0], 0, currentUfoPad.position[2]);
      state.groundY = 0;
      state.jumpY = 0;
      state.jumpVelocity = 0;
      state.falling = false;
      state.supportSurfaceId = null;
      recoveredPosition = true;
    } else {
      recoveredPosition = movePlayerOutsideBuildingColliders(
        state.position.x,
        state.position.z,
        { allowStaticRecovery: true },
      );
    }
  }
  ensureSpawnCameraClearance();
  // Recovery may correct the saved character position after the building
  // meshes have been created. The scanner uses the saved construction anchor;
  // rebuilding must never move it into the hull or follow the character.
  // A repaired position is the new authoritative save state. Without this,
  // every reload would restore the same obsolete embedded coordinate and rely
  // on another visual snap during map construction.
  if (recoveredPosition || faceAuthAnchorRepaired || ufoPlacementRepaired) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(worldStateSnapshot()));
    state.saved = true;
    els.saveState.textContent = "保存済み";
  }
  updateBuildList();
  updateMapReadout();
  updateUfoControls();
}

function updateMapReadout() {
  const config = MAPS[state.map];
  els.sceneTitle.textContent = `${config.source.title}・正式3D`;
  els.mapDescription.textContent = config.source.description;
  document.querySelectorAll("[data-map]").forEach(button => button.classList.toggle("is-active", button.dataset.map === state.map));
  els.labelsButton.textContent = `建物名：${state.labels ? "表示" : "非表示"}`;
}

function updateBuildList() {
  els.buildList.innerHTML = "";
  MAPS[state.map].buildCatalog.forEach(item => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "build-choice"; button.dataset.buildId = item.id;
    button.innerHTML = `<strong>${item.name}</strong><span>${item.note}</span>`;
    button.addEventListener("click", () => selectBuild(item.id));
    els.buildList.appendChild(button);
  });
  const selected = els.buildList.querySelector(`[data-build-id="${state.selectedBuildId}"]`);
  selected?.classList.add("is-selected");
}

function selectBuild(id) {
  state.selectedBuildId = id;
  updateBuildList();
  if (previewGroup) mapGroup.remove(previewGroup);
  const source = MAPS[state.map].buildCatalog.find(item => item.id === id);
  if (!source) return;
  previewGroup = new THREE.Group();
  previewGroup.userData.preview = true;
  const previewItem = { ...source, position: buildPlacementPosition(source) };
  addBuilding(previewGroup, previewItem, { ...source, color: 0x7fffba });
  previewGroup.traverse(object => { if (object.material) { object.material = object.material.clone(); object.material.transparent = true; object.material.opacity = .48; } });
  mapGroup.add(previewGroup);
  els.placeButton.disabled = !isValidBuildPosition(previewItem.position, source.size, source.id);
  els.cancelBuildButton.disabled = false;
  els.buildMessage.textContent = "緑色のプレビュー位置に配置できます。";
}

function isValidBuildPosition(position, size, sourceId = null) {
  const [sx, , sz] = size;
  const inside = sourceId === "ufo-pad"
    ? Math.abs(position[0]) <= MAPS[state.map].world.width / 2 - sx / 2
      && Math.abs(position[2]) <= MAPS[state.map].world.depth / 2 - sz / 2
    : MAPS[state.map].buildZones.some((zone, index) => {
      const plot = mapBuildZone(MAPS[state.map], index);
      return Math.abs(position[0] - plot.position[0]) <= plot.size[0] / 2
        && Math.abs(position[2] - plot.position[2]) <= plot.size[1] / 2;
    });
  // UFO pads are flush with the cloud floor and deliberately do not become
  // another invisible wall. They may therefore be placed at the player's
  // current open-floor position without a rectangular overlap gate.
  const overlaps = sourceId === "ufo-pad"
    ? false
    : colliders.some(c => Math.abs(position[0] - c.x) < sx * BUILDING_SCALE / 2 + c.halfX && Math.abs(position[2] - c.z) < sz * BUILDING_SCALE / 2 + c.halfZ);
  return inside && !overlaps;
}

function placeSelectedBuild() {
  const source = MAPS[state.map].buildCatalog.find(item => item.id === state.selectedBuildId);
  if (!source) return;
  const position = buildPlacementPosition(source);
  if (!isValidBuildPosition(position, source.size, source.id)) { els.buildMessage.textContent = "この場所には建てられません。"; return; }
  const newBuild = {
    id: `${source.id}-${Date.now()}`,
    catalogId: source.id,
    name: source.name,
    position,
  };
  if (source.id === "ufo-pad") {
    const anchorControl = { originX: position[0], originZ: position[2], rotation: 0, scale: BUILDING_SCALE };
    newBuild.faceAuthPosition = resolveUfoFaceAuthAnchor(anchorControl, [state.position.x, state.position.z]);
    newBuild.faceAuthAnchorLocked = true;
  }
  builtByMap[state.map] = [...buildItemsForMap().filter(item => item.catalogId !== source.id), newBuild];
  state.selectedBuildId = null;
  if (previewGroup) { mapGroup.remove(previewGroup); previewGroup = null; }
  rebuildMap();
  if (source.placement === "current") {
    // The pad is flush with the cloud floor. Keep the player at the requested
    // placement point after rebuilding the scene instead of allowing a nearby
    // building contact to choose a different escape direction.
    state.position.set(position[0], 0, position[2]);
    state.groundY = 0;
    state.jumpY = 0;
    state.jumpVelocity = 0;
    state.falling = false;
    state.supportSurfaceId = null;
    updateCharacter(0);
    updateCamera();
  }
  saveState(); showToast(`${source.name}を建造しました`);
}

function cancelBuild() {
  state.selectedBuildId = null;
  if (previewGroup) { mapGroup.remove(previewGroup); previewGroup = null; }
  updateBuildList(); els.placeButton.disabled = true; els.cancelBuildButton.disabled = true; els.buildMessage.textContent = "建物を選択してください。";
}

function measureCharacterGrounding(model, feet) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const footBounds = new THREE.Box3();
  feet.forEach(foot => footBounds.expandByObject(foot));
  if (footBounds.isEmpty()) {
    return { verticalOffset: 0, contactOffset: new THREE.Vector3() };
  }
  const footCenter = footBounds.getCenter(new THREE.Vector3());
  return {
    verticalOffset: CHARACTER_GROUND_CLEARANCE - footBounds.min.y,
    contactOffset: new THREE.Vector3(footCenter.x, 0, footCenter.z),
  };
}

function makeCharacter() {
  const model = buildMatureStarCharacter360(CHARACTER_ID, { scale: .36 });
  model.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
  const hands = model.userData?.hands ?? [];
  const feet = model.userData?.feet ?? [];
  const neutralFootZ = feet.length
    ? feet.reduce((sum, part) => sum + part.position.z, 0) / feet.length
    : 0;
  model.userData.walkRig = {
    footPhase: 0,
    footBlend: 0,
    handPhase: 0,
    neutralFootZ,
    hands: hands.map(part => ({ part, basePosition: part.position.clone() })),
    feet: feet.map(part => ({ part, basePosition: part.position.clone() })),
  };
  // Measure the complete visible model once: head, body, moving hands, feet and
  // cape. Movement collision then rotates this same footprint with the model.
  // This replaces the old centre-point plus hand-tuned margin that could stop
  // the root correctly while still leaving the visible body inside a wall.
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const collisionBounds = new THREE.Box3().setFromObject(model);
  const collisionCenter = collisionBounds.getCenter(new THREE.Vector3());
  const collisionSize = collisionBounds.getSize(new THREE.Vector3());
  const grounding = measureCharacterGrounding(model, feet);
  model.userData.collisionFootprint = {
    offsetX: collisionCenter.x,
    offsetZ: collisionCenter.z,
    halfX: collisionSize.x / 2,
    halfZ: collisionSize.z / 2,
    minY: collisionBounds.min.y + grounding.verticalOffset,
    maxY: collisionBounds.max.y + grounding.verticalOffset,
  };
  model.userData.grounding = grounding;
  model.position.set(state.position.x, model.userData.grounding.verticalOffset, state.position.z);
  model.rotation.y = state.heading;
  return model;
}

function updateCharacterWalkAnimation(delta, active, movementScale = 1) {
  const rig = character?.userData?.walkRig;
  if (!rig || rig.hands.length < 2 || rig.feet.length < 2) return;
  const targetBlend = active ? 1 : 0;
  rig.footBlend = lerp(rig.footBlend, targetBlend, Math.min(1, delta * WALK_BLEND_SPEED));
  if (!active && rig.footBlend < .001) rig.footBlend = 0;
  if (active) rig.footPhase = (rig.footPhase + delta * WALK_CYCLE_SPEED * Math.min(1.65, movementScale)) % (Math.PI * 2);
  rig.handPhase = (rig.handPhase + delta * IDLE_HAND_CYCLE_SPEED) % (Math.PI * 2);

  const stride = Math.sin(rig.footPhase) * rig.footBlend;
  const leftStep = Math.max(0, Math.sin(rig.footPhase)) * rig.footBlend;
  const rightStep = Math.max(0, -Math.sin(rig.footPhase)) * rig.footBlend;
  const [leftFoot, rightFoot] = rig.feet;
  leftFoot.part.position.set(
    leftFoot.basePosition.x,
    leftFoot.basePosition.y + leftStep * WALK_FOOT_LIFT,
    rig.neutralFootZ + stride * WALK_FOOT_SWING
  );
  rightFoot.part.position.set(
    rightFoot.basePosition.x,
    rightFoot.basePosition.y + rightStep * WALK_FOOT_LIFT,
    rig.neutralFootZ - stride * WALK_FOOT_SWING
  );

  const handSway = Math.sin(rig.handPhase);
  const [leftHand, rightHand] = rig.hands;
  leftHand.part.position.set(
    leftHand.basePosition.x + IDLE_HAND_BODY_INSET + handSway * IDLE_HAND_SWING,
    leftHand.basePosition.y,
    leftHand.basePosition.z
  );
  rightHand.part.position.set(
    rightHand.basePosition.x - IDLE_HAND_BODY_INSET - handSway * IDLE_HAND_SWING,
    rightHand.basePosition.y,
    rightHand.basePosition.z
  );
}

function isBlocked(x, z, fromX = state.position.x, fromZ = state.position.z) {
  const config = MAPS[state.map];
  const limitX = config.world.width / 2 - PLAYER_RADIUS;
  const limitZ = config.world.depth / 2 - PLAYER_RADIUS;
  if (Math.abs(x) > limitX || Math.abs(z) > limitZ) return true;
  // If the loaded/previous position is already embedded, do not let the
  // normal upward-step gate turn the recovery path into a permanent trap.
  // The collider loop below still requires the attempted move to reduce the
  // actual overlap, so this does not make ordinary walls passable.
  const originHasContact = !state.jumpY && hasGroundCollisionAt(fromX, fromZ, state.groundY);
  const stepTransition = getStepTransition(fromX, fromZ, x, z);
  const isRampWalk = isContinuousUfoRampTransition(stepTransition);
  if (stepTransition?.ascending && !isRampWalk) {
    const targetHeight = Math.max(stepTransition.toHeight, stepTransition.probeHeight);
    const requiredRise = targetHeight - stepTransition.fromHeight;
    const availableRise = stepTransition.availableJumpRise ?? getAvailableJumpRise();
    // Every raised visible surface follows the same rule: walking cannot climb
    // it, a reachable jump can, and descending never needs another jump.
    if (!originHasContact && (!stepTransition.airborne || availableRise + STEP_JUMP_CLEARANCE < requiredRise)) return true;
  }
  return colliders.some(c => {
    if (isColliderPassage(x, z, c)) return false;
    const fromContact = characterColliderContact(fromX, fromZ, c);
    const toContact = characterColliderContact(x, z, c);
    const fromInside = fromContact.intersects;
    const toInside = toContact.intersects;
    if (fromInside) {
      // A safety margin is not a one-way trap. If an earlier landing leaves the
      // body inside that margin, any movement that strictly reduces overlap is
      // an escape movement and must remain available. Tangential movement that
      // preserves the same contact is also valid; only deeper penetration is
      // blocked. Requiring strict reduction here made a landed character freeze
      // beside every long wall or platform edge.
      if (!toInside || toContact.penetration <= fromContact.penetration + .001) return false;
    }
    if (c.stepRiser && canTraverseStepRiser(fromX, fromZ, x, z, c)) return false;
    // 終点だけが外側でも、移動線分が薄い柱・縁・角を横切っていれば
    // 表示メッシュの内部を通過している。移動は最大2.5単位に分割
    // されているが、薄い部材では始点と終点の両方が外側になり得るため、
    // ここで同じ衝突矩形を線分としても評価する。
    if (!fromInside && !toInside && segmentIntersectsCollider(fromX, fromZ, x, z, c, 0)) {
      return canPassStepCollider(c, stepTransition) ? false : true;
    }
    // Endpoint SAT handles ordinary body overlap; the swept test above handles
    // the remaining thin-part tunnel case.
    if (!toInside) return false;
    // すべての段差部材を、個別の「ここだけ通す」例外ではなく、
    // 段差の実高さとジャンプ状態で同じように評価する。
    if (canPassStepCollider(c, stepTransition)) return false;
    return true;
  });
}

function readMoveVector() {
  const strafe = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0) + touchVector.x;
  const forward = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - touchVector.y;
  const input = new THREE.Vector2(strafe, forward);
  if (input.lengthSq() > 1) input.normalize();
  // 一人称・三人称とも「画面の上＝カメラが見ている奥」へ統一する。
  // ワールドX/Zへ直接つなぐと、カメラ角度によってパッド方向が逆転する。
  const viewForward = new THREE.Vector3(Math.sin(state.viewHeading), 0, Math.cos(state.viewHeading));
  // Three.js のカメラは -Z が視線方向のため、画面右は
  // 「視線方向 × 上方向」で求める。逆順にすると左右が反転する。
  const viewRight = new THREE.Vector3(-Math.cos(state.viewHeading), 0, Math.sin(state.viewHeading));
  return viewForward.multiplyScalar(input.y).add(viewRight.multiplyScalar(input.x));
}

function isFastWalking() {
  return state.fastWalking;
}

function triggerJump() {
  if (state.jumpCount >= MAX_JUMPS) return;
  state.falling = false;
  state.jumpVelocity = JUMP_VELOCITY;
  state.jumpCount += 1;
  showToast(`${state.jumpCount}段ジャンプ`);
}

function startFastWalking() {
  if (state.fastWalking) return;
  state.fastWalking = true;
  showToast("速歩開始：移動速度2.5倍");
}

function updateBoardedCharacter(delta) {
  const pad = currentUfoPadItem();
  if (!pad || !character) {
    state.ufoBoarded = false;
    return false;
  }
  state.position.set(pad.position[0], 0, pad.position[2]);
  state.groundY = 0;
  state.jumpY = 0;
  state.jumpVelocity = 0;
  state.falling = false;
  state.moving = false;
  state.fastWalking = false;
  state.heading = 0;
  updateCharacterWalkAnimation(delta, false);
  character.rotation.y = 0;
  const verticalOffset = character.userData?.grounding?.verticalOffset ?? 0;
  character.position.set(pad.position[0], 16 + verticalOffset, pad.position[2] - 11);
  if (characterShadow) characterShadow.visible = false;
  els.motionReadout.textContent = "操縦席に搭乗中";
  els.positionReadout.textContent = `${state.position.x.toFixed(1)}, ${state.position.z.toFixed(1)}`;
  els.coords.textContent = `X ${state.position.x.toFixed(1)} / Z ${state.position.z.toFixed(1)}`;
  els.headingReadout.textContent = "操縦席";
  updateUfoControls();
  return true;
}

function updateCharacter(delta) {
  if (state.ufoBoarded && updateBoardedCharacter(delta)) return;
  if (characterShadow) characterShadow.visible = true;
  const wasAirborne = state.jumpVelocity !== 0 || state.jumpY > 0;
  if (wasAirborne) {
    state.jumpVelocity -= JUMP_GRAVITY * delta;
    state.jumpY += state.jumpVelocity * delta;
    if (state.jumpY <= 0) {
      state.jumpY = 0;
      state.jumpVelocity = 0;
      state.falling = false;
      state.jumpCount = 0;
    }
  }
  const landedThisFrame = wasAirborne && state.jumpY === 0 && state.jumpVelocity === 0;
  const move = readMoveVector();
  state.moving = move.lengthSq() > .001;
  if (!state.moving) state.fastWalking = false;
  if (state.cameraMode === "first") {
    state.heading = state.viewHeading;
    character.rotation.y = state.heading;
  }
  const movementOrigin = { x: state.position.x, z: state.position.z };
  if (state.moving) {
    const rotationBeforeMove = character.rotation.y;
    const movementScale = isFastWalking() ? FAST_WALK_MULTIPLIER : 1;
    const speed = PLAYER_SPEED * movementScale;
    const distance = speed * delta;
    const substeps = Math.max(1, Math.ceil(distance / 2.5));
    const stepX = move.x * distance / substeps;
    const stepZ = move.z * distance / substeps;
    for (let step = 0; step < substeps; step += 1) {
      const fromX = state.position.x;
      const fromZ = state.position.z;
      const nextX = state.position.x + stepX;
      const nextZ = state.position.z + stepZ;
      // Test the intended 2D direction first. Splitting X/Z before this check
      // makes a diagonal edge act like two crossing walls: both component
      // moves can be rejected even though the actual diagonal descent is free.
      const currentGroundY = getGroundHeight(fromX, fromZ);
      const nextGroundY = getGroundHeight(nextX, nextZ);
      const originHasContact = !wasAirborne && hasGroundCollisionAt(fromX, fromZ, state.groundY);
      const jumpInProgress = state.jumpVelocity !== 0 || state.jumpY > 0;
      const stepTransition = getStepTransition(fromX, fromZ, nextX, nextZ);
      const risesWithoutJump = !originHasContact
        && !jumpInProgress
        && nextGroundY > currentGroundY + .2;
      const rampWalk = isContinuousUfoRampTransition(stepTransition);
      if ((!risesWithoutJump || rampWalk) && !isBlocked(nextX, nextZ, fromX, fromZ)) {
        state.position.set(nextX, 0, nextZ);
      } else {
        // If the intended direction really is obstructed, retain conventional
        // wall sliding by trying each component separately. A component that
        // would enter a higher floor without a jump is simply not applied;
        // keeping the current legal position avoids a visible snap-back.
        const nextXGroundY = getGroundHeight(nextX, fromZ);
        const xOriginHasContact = !wasAirborne && hasGroundCollisionAt(fromX, fromZ, state.groundY);
        const xTransition = getStepTransition(fromX, fromZ, nextX, fromZ);
        if ((!(!xOriginHasContact && state.jumpY === 0 && nextXGroundY > currentGroundY + .2)
          || isContinuousUfoRampTransition(xTransition))
          && !isBlocked(nextX, fromZ, fromX, fromZ)) {
          state.position.x = nextX;
        }
        const zOriginX = state.position.x;
        const nextZGroundY = getGroundHeight(zOriginX, nextZ);
        const zOriginHasContact = !wasAirborne && hasGroundCollisionAt(zOriginX, fromZ, state.groundY);
        const zTransition = getStepTransition(zOriginX, fromZ, zOriginX, nextZ);
        if ((!(!zOriginHasContact && state.jumpY === 0 && nextZGroundY > currentGroundY + .2)
          || isContinuousUfoRampTransition(zTransition))
          && !isBlocked(zOriginX, nextZ, zOriginX, fromZ)) {
          state.position.z = nextZ;
        }
      }
    }
    if (state.cameraMode !== "first") {
      const nextHeading = Math.atan2(move.x, move.z);
      state.heading = nextHeading;
      character.rotation.y = lerpAngle(character.rotation.y, nextHeading, Math.min(1, delta * 13));
      // The collision footprint is oriented with the displayed model.  A turn
      // beside a ledge can therefore create an overlap even when the root did
      // not advance. Reject that combined turn/move as one physical sample;
      // never leave the body half inside a visible edge after the jump.
      const originPenetration = groundCollisionPenetrationAt(
        movementOrigin.x,
        movementOrigin.z,
        state.groundY,
      );
      const currentPenetration = groundCollisionPenetrationAt(
        state.position.x,
        state.position.z,
        state.groundY,
      );
      // Never move the root back to a previous position. If the displayed
      // model's new facing would make its external silhouette enter a wall,
      // preserve the already accepted position and restore only its facing.
      // Equal contact is valid sliding; only a material increase is rejected.
      if (currentPenetration > originPenetration + .02) {
        character.rotation.y = rotationBeforeMove;
        state.heading = rotationBeforeMove;
      }
    } else if (groundCollisionPenetrationAt(state.position.x, state.position.z, state.groundY) > .001) {
      // First-person mode fixes the model to the camera heading before the
      // movement sample. Apply the same final contact guard there as well;
      // changing perspective must not let the body enter a wall or raised lip.
      const originPenetration = groundCollisionPenetrationAt(
        movementOrigin.x,
        movementOrigin.z,
        state.groundY,
      );
      const currentPenetration = groundCollisionPenetrationAt(
        state.position.x,
        state.position.z,
        state.groundY,
      );
      if (currentPenetration > originPenetration + .02) {
        character.rotation.y = rotationBeforeMove;
      }
    }
  }
  // Do not run a post-movement depenetration pass. If a rotated body would
  // overlap a wall, the next movement input is rejected by isBlocked(); the
  // current frame must remain where it was instead of being pushed backward.
  // Resolve the current walk pose before selecting support. A foot that is
  // partly over the next surface is the authoritative support point for this
  // frame, even when the character root is already beyond the platform edge.
  updateCharacterWalkAnimation(delta, state.moving, isFastWalking() ? FAST_WALK_MULTIPLIER : 1);
  let exactGroundY = landedThisFrame
    ? getLandingGroundHeight(state.position.x, state.position.z, state.groundY)
    : getGroundHeight(state.position.x, state.position.z);
  // 着地時は過去の位置へ戻さない。現在の足元に実在する床だけを採用し、
  // その面がなければ必ず地面へ落とす。これで「登った直後に押し戻す」
  // 補正経路を物理から排除する。
  if (landedThisFrame && !hasAuthoritativeSupportAt(state.position.x, state.position.z, exactGroundY)) {
    exactGroundY = 0;
  }
  const footSupportHeight = getFootSupportHeight(state.position.x, state.position.z, {
    referenceHeight: state.groundY,
    allowHigher: wasAirborne,
    maxRise: wasAirborne ? MAX_JUMP_RISE : 0,
  });
  const footSupportSurface = getFootSupportSurface(state.position.x, state.position.z, {
    referenceHeight: state.groundY,
    allowHigher: wasAirborne,
    maxRise: wasAirborne ? MAX_JUMP_RISE : 0,
  });
  // 着地した瞬間に選ばれた上面を記録する。次のフレームで中心点が
  // 低い床を一瞬拾っても、実際に足が同じ段へ触れている間はその段を
  // 維持する。段差から完全に離れた時だけ通常の落下判定へ戻す。
  if (landedThisFrame) {
    state.supportSurfaceId = footSupportSurface
      && Math.abs(footSupportSurface.height - Math.max(exactGroundY, footSupportHeight)) <= .24
      ? footSupportSurface.id
      : null;
  } else if (!wasAirborne && state.supportSurfaceId) {
    const lockedSurface = walkableSurfaces.find(surface => surface.id === state.supportSurfaceId);
    const stillOnLockedSurface = lockedSurface
      && Math.abs(lockedSurface.height - state.groundY) <= .24
      && footSupportSurface?.id === lockedSurface.id;
    if (stillOnLockedSurface) exactGroundY = lockedSurface.height;
    else state.supportSurfaceId = null;
  }
  // The feet, rather than the root, decide whether a raised surface is still
  // supporting the character. If even one foot overlaps the current step,
  // preserve that height; only after both feet leave it may falling begin.
  if (footSupportHeight > .2
    && (wasAirborne || Math.abs(footSupportHeight - state.groundY) <= .24)) {
    exactGroundY = Math.max(exactGroundY, footSupportHeight);
  }
  // The character is grounded only by a real floor under the feet. A nearby
  // edge with no foot overlap must not lift the whole body over empty ground.
  let targetGroundY = exactGroundY;
  // 歩いて高所の端を離れた場合は、groundYを即座に下げて瞬間移動
  // させない。現在の足場から着地点までの差を空中距離として保持し、
  // ジャンプと同じ重力で落下させる。判定は現在の足元の実在面だけを
  // 使うため、空中に見えない床を作ったり建造物ごとの例外を増やさない。
  const walkingOffRaisedSurface = !wasAirborne
    && !landedThisFrame
    && !state.falling
    && state.moving
    && state.jumpY === 0
    && state.jumpVelocity === 0
    && targetGroundY < state.groundY - .2;
  if (walkingOffRaisedSurface) {
    const fallDistance = Math.max(0, state.groundY - targetGroundY);
    state.groundY = targetGroundY;
    state.jumpY = fallDistance;
    state.jumpVelocity = 0;
    state.falling = fallDistance > .001;
  }
  // Once the jump has ended, place the feet on the resolved surface immediately.
  const grounded = state.jumpY === 0 && state.jumpVelocity === 0;
  // Keep the take-off floor fixed for the entire airborne arc.  Interpolating
  // groundY toward a nearby platform while jumping makes the rendered body
  // rise/sink before the feet actually land and is the source of the visible
  // half-embedded landing seen beside raised geometry.
  if (grounded) state.groundY = targetGroundY;
  if (grounded && (state.moving || landedThisFrame)
    && groundCollisionPenetrationAt(state.position.x, state.position.z, state.groundY, 0) > .001) {
    // The movement gate and the orientation gate both reject new overlap, but
    // a legacy saved position or a mesh rotation can still leave the final
    // frame fractionally inside a visible wall/edge. Resolve it only while a
    // movement/landing transition is active. Never teleport an idle character
    // during placement or camera updates; that would change the requested pad
    // location without any user input.
    const recovered = movePlayerOutsideBuildingColliders(
      state.position.x,
      state.position.z,
      { allowStaticRecovery: true },
    );
    if (recovered) {
      state.supportSurfaceId = null;
      state.groundY = getGroundHeight(state.position.x, state.position.z);
    }
  }
  const grounding = character.userData?.grounding;
  const characterTarget = new THREE.Vector3(
    state.position.x,
    (grounding?.verticalOffset ?? 0) + state.groundY + state.jumpY,
    state.position.z,
  );
  // X/Y/Z must be identical to the collision-tested physics position.  The old
  // airborne Y interpolation left the visible model between the jump arc and
  // the resolved floor for several frames, which looked like sinking after a
  // landing.  The physics root is authoritative, so render it directly.
  character.position.copy(characterTarget);
  if (grounded) {
    // The 360-degree model's visible lowest point is not guaranteed to be the
    // same mesh that is registered as a foot.  Measure the complete rendered
    // model after the current walk pose and put that actual bottom on the
    // current support surface.  This is a common correction for every map and
    // every building; it does not add a per-building offset or move the
    // physics surface.
    character.updateMatrixWorld(true);
    const renderedBounds = new THREE.Box3().setFromObject(character);
    const renderedBottomY = renderedBounds.min.y;
    const supportBottomY = state.groundY + CHARACTER_GROUND_CLEARANCE;
    const visualGroundCorrection = supportBottomY - renderedBottomY;
    if (Number.isFinite(visualGroundCorrection) && Math.abs(visualGroundCorrection) > .001) {
      character.position.y += visualGroundCorrection;
      character.updateMatrixWorld(true);
    }
  }
  if (characterShadow) {
    const contact = grounding?.contactOffset ?? new THREE.Vector3();
    const sin = Math.sin(character.rotation.y);
    const cos = Math.cos(character.rotation.y);
    characterShadow.position.set(
      character.position.x + contact.x * cos + contact.z * sin,
      CHARACTER_SHADOW_Y + state.groundY,
      character.position.z - contact.x * sin + contact.z * cos
    );
    const airScale = clamp(1 - state.jumpY / 24, .62, 1);
    characterShadow.scale.setScalar((state.moving ? 1.08 : 1) * airScale);
  }
  const airborne = state.jumpY > 0 || state.jumpVelocity > 0;
  const motionLabel = airborne
    ? (state.falling
      ? "落下中"
      : `${isFastWalking() ? "速歩・" : ""}ジャンプ中（${state.jumpCount}/${MAX_JUMPS}）`)
    : (state.moving ? (isFastWalking() ? "速歩中（2.5倍）" : "歩行中") : (isFastWalking() ? "速歩待機" : "待機"));
  els.motionReadout.textContent = motionLabel;
  els.positionReadout.textContent = `${state.position.x.toFixed(1)}, ${state.position.z.toFixed(1)}`;
  els.coords.textContent = `X ${state.position.x.toFixed(1)} / Z ${state.position.z.toFixed(1)}`;
  const degrees = ((THREE.MathUtils.radToDeg(state.heading) + 360) % 360);
  const names = ["正面", "右斜め", "右", "右後ろ", "背面", "左後ろ", "左", "左斜め"];
  els.headingReadout.textContent = names[Math.round(degrees / 45) % 8];
  updateUfoControls();
}

function lerpAngle(a, b, t) { let delta = (b - a + Math.PI) % (Math.PI * 2) - Math.PI; return a + delta * t; }

function updateCamera() {
  const target = new THREE.Vector3(state.position.x, 38 + state.groundY + state.jumpY, state.position.z);
  if (state.cameraMode === "third") {
    const orbitPitch = THIRD_PERSON_BASE_PITCH + state.viewPitch;
    const cameraDistance = THIRD_PERSON_DISTANCE_PRESETS[state.cameraDistanceIndex].distance;
    const horizontalDistance = Math.cos(orbitPitch) * cameraDistance;
    const cameraForward = new THREE.Vector3(Math.sin(state.viewHeading), 0, Math.cos(state.viewHeading));
    let desired = new THREE.Vector3(
      state.position.x - cameraForward.x * horizontalDistance,
      Math.max(6, target.y - Math.sin(orbitPitch) * cameraDistance),
      state.position.z - cameraForward.z * horizontalDistance,
    );
    desired = keepThirdPersonCameraOutsideBuildings(target, desired);
    // Apply the orbit directly so the configured distance is exact even when
    // the character is beside a wall. Interpolation could create a temporary
    // close-up while the target or view heading changed.
    camera.position.copy(desired);
    camera.lookAt(target);
  } else {
    character?.updateMatrixWorld(true);
    const eyeFeatures = character?.userData?.faceFeatures ?? [];
    const eye = new THREE.Vector3(state.position.x, 31 + state.groundY, state.position.z);
    if (eyeFeatures.length) {
      eye.set(0, 0, 0);
      eyeFeatures.forEach(feature => eye.add(feature.getWorldPosition(new THREE.Vector3())));
      eye.multiplyScalar(1 / eyeFeatures.length);
    }
    const horizontalForward = new THREE.Vector3(Math.sin(state.viewHeading), 0, Math.cos(state.viewHeading)).normalize();
    const lookForward = new THREE.Vector3(
      Math.sin(state.viewHeading) * Math.cos(state.viewPitch),
      Math.sin(state.viewPitch),
      Math.cos(state.viewHeading) * Math.cos(state.viewPitch)
    ).normalize();
    eye.addScaledVector(horizontalForward, FIRST_PERSON_EYE_CLEARANCE);
    camera.position.copy(eye);
    camera.lookAt(eye.clone().addScaledVector(lookForward, 20));
  }
  const cameraLabel = state.cameraMode === "third" ? "三人称" : "一人称・目線";
  els.viewReadout.textContent = cameraLabel;
  els.cameraModeButton.textContent = `視点：${cameraLabel}`;
  els.cameraDistanceButton.textContent = `距離：${THIRD_PERSON_DISTANCE_PRESETS[state.cameraDistanceIndex].label}`;
  els.viewport.classList.toggle("is-first-person", state.cameraMode === "first");
  els.touchHint.textContent = state.cameraMode === "first"
    ? "移動：WASD / 左パッド　同じ方向を素早く2回：速歩（停止で解除）　Space：最大3段ジャンプ　視点：右側ドラッグ"
    : "左パッド：画面基準で移動　同じ方向を素早く2回：速歩（停止で解除）　Space：最大3段ジャンプ　右側ドラッグ：カメラ回転";
}

function setMap(key) {
  if (!MAPS[key] || key === state.map) return;
  state.map = key; resetPlayerToMapSpawn(key); state.selectedBuildId = null; state.ufoBoarded = false; state.ufoDoorOpen = false; state.ufoFaceAuth = false; state.ufoFaceAuthLatched = false; cancelBuild();
  if (scene) { scene.background = color(MAPS[key].palette.fog); scene.fog.color.copy(color(MAPS[key].palette.fog)); }
  rebuildMap(); showToast(`${MAPS[key].source.title}へ移動しました`);
}

function setupTouchPad() {
  const update = event => {
    const rect = els.touchPad.getBoundingClientRect();
    const radius = rect.width * .36;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.min(radius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    els.touchStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    const rawX = x / radius;
    const rawY = y / radius;
    const magnitude = Math.hypot(rawX, rawY);
    if (magnitude <= TOUCH_PAD_DEAD_ZONE) {
      touchVector.set(0, 0);
    } else {
      const normalizedMagnitude = (magnitude - TOUCH_PAD_DEAD_ZONE) / (1 - TOUCH_PAD_DEAD_ZONE);
      touchVector.set(rawX / magnitude * normalizedMagnitude, rawY / magnitude * normalizedMagnitude);
    }
  };
  els.touchPad.addEventListener("pointerdown", event => {
    const now = performance.now();
    if (now - lastTouchTapAt <= 380) {
      startFastWalking();
      lastTouchTapAt = 0;
    }
    touchPointerId = event.pointerId;
    touchStartAt = now;
    touchStartX = event.clientX;
    touchStartY = event.clientY;
    els.touchPad.setPointerCapture(touchPointerId);
    update(event);
  });
  els.touchPad.addEventListener("pointermove", event => {
    if (event.pointerId === touchPointerId) {
      update(event);
    }
  });
  const end = event => {
    if (event.pointerId !== touchPointerId) return;
    const now = performance.now();
    const wasTap = now - touchStartAt <= 280 && Math.hypot(event.clientX - touchStartX, event.clientY - touchStartY) <= 14;
    if (wasTap) {
      if (now - lastTouchTapAt <= 380) {
        startFastWalking();
        lastTouchTapAt = 0;
      } else {
        lastTouchTapAt = now;
      }
    } else {
      lastTouchTapAt = 0;
    }
    touchPointerId = null;
    touchVector.set(0, 0);
    els.touchStick.style.transform = "translate(-50%, -50%)";
  };
  els.touchPad.addEventListener("pointerup", end); els.touchPad.addEventListener("pointercancel", end);
}

function setupLookControls() {
  els.viewport.addEventListener("pointerdown", event => {
    // パッド上の距離ボタンは視点ドラッグとして扱わず、
    // タップをボタン自身のクリック処理へ渡す。
    if (event.target.closest("#touchPad, #cameraDistanceButton, #emergencyEscapeButton")) return;
    const rect = els.viewport.getBoundingClientRect();
    if (event.pointerType === "touch" && event.clientX < rect.left + rect.width * .42) return;
    lookPointerId = event.pointerId;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    els.viewport.setPointerCapture(lookPointerId);
    els.viewport.classList.add("is-looking");
  });
  els.viewport.addEventListener("pointermove", event => {
    if (event.pointerId !== lookPointerId) return;
    const sensitivity = event.pointerType === "touch" ? LOOK_TOUCH_SENSITIVITY : LOOK_MOUSE_SENSITIVITY;
    const dx = event.clientX - lookLastX;
    const dy = event.clientY - lookLastY;
    lookLastX = event.clientX;
    lookLastY = event.clientY;
    state.viewHeading -= dx * sensitivity;
    const pitchMin = state.cameraMode === "first" ? LOOK_PITCH_MIN : THIRD_PERSON_PITCH_MIN;
    const pitchMax = state.cameraMode === "first" ? LOOK_PITCH_MAX : THIRD_PERSON_PITCH_MAX;
    state.viewPitch = clamp(state.viewPitch - dy * sensitivity * .78, pitchMin, pitchMax);
  });
  const endLook = event => {
    if (event.pointerId !== lookPointerId) return;
    lookPointerId = null;
    els.viewport.classList.remove("is-looking");
  };
  els.viewport.addEventListener("pointerup", endLook);
  els.viewport.addEventListener("pointercancel", endLook);
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene(); scene.background = color(MAPS[state.map].palette.fog); scene.fog = new THREE.Fog(MAPS[state.map].palette.fog, 360, 780); clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(48, 1, .1, 1200); camera.position.set(0, 110, 190);
  worldGroup = new THREE.Group(); mapGroup = new THREE.Group(); worldGroup.add(mapGroup); scene.add(worldGroup);
  physicsMeshGroup = new THREE.Group();
  physicsMeshGroup.name = "authoritative-physics-mesh";
  physicsMeshGroup.visible = false;
  scene.add(physicsMeshGroup);
  physicsDebugGroup = new THREE.Group();
  physicsDebugGroup.name = "physics-debug-overlay";
  physicsDebugGroup.visible = state.physicsDebug;
  scene.add(physicsDebugGroup);
  scene.add(new THREE.HemisphereLight(0xd9f4ff, 0x37506b, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 3.4); sun.position.set(-160, 320, 220); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -380; sun.shadow.camera.right = 380; sun.shadow.camera.top = 380; sun.shadow.camera.bottom = -380; sun.shadow.camera.far = 900; scene.add(sun);
  character = makeCharacter(); scene.add(character);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x19355b, transparent: true, opacity: .24, depthWrite: false }); characterShadow = new THREE.Mesh(new THREE.CircleGeometry(12, 32), shadowMaterial); characterShadow.rotation.x = -Math.PI / 2; scene.add(characterShadow);
  rebuildMap(); updateCamera();
  const resize = () => { const rect = els.viewport.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / Math.max(1, rect.height); camera.updateProjectionMatrix(); }; window.addEventListener("resize", resize); resize();
  els.statusText.textContent = "歩行可能";
  requestAnimationFrame(frame);
}

function frame() {
  const delta = Math.min(.05, clock.getDelta()); updateUfoDoorAnimation(delta); updateCharacter(delta); updateCamera(); updatePhysicsDebugContact(); renderer.render(scene, camera); requestAnimationFrame(frame);
}

function wireUI() {
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (key === " " && !event.repeat) {
      triggerJump();
      event.preventDefault();
      return;
    }
    const movementKey = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key);
    if (movementKey && !event.repeat) {
      const now = performance.now();
      if (lastMovementTapKey === key && now - lastMovementTapAt <= 380) {
        startFastWalking();
        lastMovementTapAt = 0;
        lastMovementTapKey = "";
      } else {
        lastMovementTapAt = now;
        lastMovementTapKey = key;
      }
    }
    keys.add(key);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  });
  window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  document.querySelectorAll("[data-map]").forEach(button => button.addEventListener("click", () => setMap(button.dataset.map)));
  els.cameraModeButton.addEventListener("click", () => {
    state.cameraMode = state.cameraMode === "third" ? "first" : "third";
    state.viewHeading = state.heading;
    state.viewPitch = 0;
    lookPointerId = null;
    els.viewport.classList.remove("is-looking");
    showToast(`${state.cameraMode === "third" ? "三人称" : "一人称・目線"}視点に切り替えました`);
  });
  els.cameraDistanceButton.addEventListener("click", () => {
    state.cameraDistanceIndex = (state.cameraDistanceIndex + 1) % THIRD_PERSON_DISTANCE_PRESETS.length;
    const preset = THIRD_PERSON_DISTANCE_PRESETS[state.cameraDistanceIndex];
    showToast(`三人称カメラ：${preset.label}`);
  });
  els.cameraDistanceButton.addEventListener("pointerdown", event => event.stopPropagation());
  els.emergencyEscapeButton.addEventListener("click", emergencyEscape);
  els.emergencyEscapeButton.addEventListener("pointerdown", event => event.stopPropagation());
  els.labelsButton.addEventListener("click", () => { state.labels = !state.labels; rebuildMap(); updateMapReadout(); });
  els.physicsDebugButton.addEventListener("click", () => {
    state.physicsDebug = !state.physicsDebug;
    if (physicsDebugGroup) physicsDebugGroup.visible = state.physicsDebug;
    if (physicsMeshGroup) physicsMeshGroup.visible = state.physicsDebug;
    els.physicsDebugButton.dataset.debugActive = String(state.physicsDebug);
    els.physicsDebugButton.textContent = `物理表示：${state.physicsDebug ? "ON" : "OFF"}`;
    showToast(state.physicsDebug ? "物理メッシュ・床・壁・接触面を表示" : "物理表示を非表示");
  });
  els.saveButton.addEventListener("click", saveState);
  els.resetButton.addEventListener("click", clearCurrentMapSave);
  els.placeButton.addEventListener("click", placeSelectedBuild);
  els.cancelBuildButton.addEventListener("click", cancelBuild);
  els.ufoDoorButton.addEventListener("click", toggleUfoDoor);
  els.ufoBoardButton.addEventListener("click", toggleUfoBoarding);
  setupTouchPad();
  setupLookControls();
}

loadState();
wireUI();
setupScene();
