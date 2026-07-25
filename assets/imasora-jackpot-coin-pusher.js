import * as THREE from "./three.module.min.js";
import * as CANNON from "./cannon-es.js";

const FIXED_STEP = 1 / 60;
const MAX_SUB_STEPS = 5;
const MAX_TABLE_COINS = 180;
const STARTING_CREDITS = 250;
const BOARD_Z = -2.02;
const PACHINKO_FIELD_CENTER_Y = 3.31;
const PACHINKO_FIELD_RADIUS = 2.3;
const PACHINKO_FRAME_RADIUS = 2.34;
const PACHINKO_LAUNCH_FRAME_GAP_ANGLE = 0.52;
const TABLE_TOP_Y = 0.56;
const FRONT_EDGE_Z = 2.38;
const NORMAL_BIG_RATE = 0.02;
const NORMAL_SMALL_RATE = 0.075;
const AUTO_FIRE_INTERVAL = 0.6;
const STROKE_MIN = 0.2;
const STROKE_MAX = 1;
const MIN_LAUNCH_SPEED = 8.72;
const MAX_LAUNCH_SPEED = 11.1;
const PUSHER_START_DELAY = 1.1;
const INITIAL_COIN_CLEARANCE = 0.018;
const INITIAL_COIN_REAR_Z = -0.42;
const INITIAL_COIN_ROW_GAP = 0.46;
const COLLECTOR_TRIGGER_Y = TABLE_TOP_Y - 0.18;
const COLLECTOR_TARGET_Y = 0.14;
const COLLECTOR_TARGET_Z = 2.72;
const COLLECTION_ANIMATION_SECONDS = 0.82;
const GAME_OVER_GRACE_SECONDS = 3.4;
const PACHINKO_COIN_RADIUS = 0.084;
const PACHINKO_COIN_THICKNESS = 0.024;
const PACHINKO_TOKEN_COLLIDER_RADIUS = PACHINKO_COIN_RADIUS * 0.88;
const PACHINKO_TOKEN_MASS = 0.00555;
const PACHINKO_TOKEN_LINEAR_DAMPING = 0.004;
const PACHINKO_GRAVITY = 9.82;
const PACHINKO_SLOPE_ACCELERATION_BONUS = 0.22;
const PACHINKO_SLOPE_ASSIST_MAX_SPEED = 13.8;
const WINDMILL_EQUIVALENT_INERTIA = 0.00042;
const WINDMILL_IMPACT_TRANSFER = 1.65;
const WINDMILL_WEIGHT_TRANSFER = 1.9;
const WINDMILL_IMPACT_SPEED_LIMIT = 7.8;
const WINDMILL_BEARING_DRAG = 0.2;
const WINDMILL_MAX_ANGULAR_SPEED = 14.5;
const WINDMILL_WEIGHT_CONTACT_MIN_Y = -0.09;
const WINDMILL_WEIGHT_CONTACT_RANGE = 0.1;
const SEESAW_COLLIDER_HALF_THICKNESS = 0.03;
const SEESAW_SWEEP_RESTITUTION_MIN = 0.14;
const SEESAW_SWEEP_RESTITUTION_MAX = 0.42;
const SEESAW_SWEEP_TANGENT_RETENTION = 0.94;
const SEESAW_SWEEP_EPSILON = 0.002;
const ENTRY_GUIDE_SWEEP_RESTITUTION = 0.12;
const ENTRY_GUIDE_SWEEP_TANGENT_RETENTION = 0.96;
const ENTRY_GUIDE_SWEEP_EPSILON = 0.002;
const TABLE_COIN_RADIUS = PACHINKO_COIN_RADIUS;
const TABLE_COIN_THICKNESS = PACHINKO_COIN_THICKNESS;
const TABLE_COIN_COLLIDER_THICKNESS = PACHINKO_COIN_THICKNESS;
const PACHINKO_LAUNCH_X = -2.2;
const PACHINKO_LAUNCH_Y = 1.12;
const BOARD_COMPONENT_Y_OFFSET = -0.6;
const FIXED_HAKAMA_Y_OFFSET = -0.3;
const BOARD_COMPONENT_Y_MIGRATION_STEP = -0.3;
const PIN_LAYOUT_VERSION = 7;
const ROLE_VERTICAL_SHIFT = 0.62 + BOARD_COMPONENT_Y_OFFSET;
const PACHINKO_PLAYFIELD_Z = -1.675;
const BOARD_LCD_WIDTH = 0.5;
const BOARD_LCD_HEIGHT = 0.32;
const BOARD_LCD_Y = PACHINKO_FIELD_CENTER_Y + PACHINKO_FRAME_RADIUS - BOARD_LCD_HEIGHT / 2 - 0.06;
const BOARD_LCD_RECESS_DEPTH = 0.15;
const LEFT_ENTRY_X = -0.52;
const RIGHT_ENTRY_X = 0.52;
const ENTRY_Y = 3.72 + ROLE_VERTICAL_SHIFT;
const ENTRY_UPPER_PIN_ABS_X = 0.9;
const ENTRY_MOUTH_INNER_DROP = 0.06;
const ENTRY_HALF_HEIGHT = 0.11;
const ROLE_RELEASE_Y = 3.49 + ROLE_VERTICAL_SHIFT;
const ROLE_SLOT_Y = 2.22 + ROLE_VERTICAL_SHIFT;
const PACHINKO_DRAIN_CENTER_Y = 1.12;
const PACHINKO_DRAIN_HALF_WIDTH = 0.3;
const PACHINKO_DRAIN_HALF_HEIGHT = 0.15;
const ENTRY_SEESAW_MAX_ANGLE = Math.PI / 9;
const ENTRY_SEESAW_PERIOD_SECONDS = 2.5;
const ENTRY_SEESAW_SPEED = Math.PI * 2 / ENTRY_SEESAW_PERIOD_SECONDS;
const HANE_OPEN_SECONDS = 1.3;
const HANE_OPEN_ANGLE = Math.PI / 2;
const HANE_WING_LENGTH = 0.44;
const HANE_WING_DESIGN_ID = "michimebanfuwana-representative-six-side-v1";
const HANE_WING_SOURCE_ID = "hero-young-seed-walk-walk-cute";
const HANE_WING_SOURCE_NAME = "ミチメバンフワナ";
const HANE_WING_LEFT_VIEW = "side-left";
const HANE_WING_RIGHT_VIEW = "side";
const HANE_CHUCKER_PAYOUT = 3;
const HANE_WING_PIN_PAIRS = Object.freeze([
  { side: -1, pins: [22, 67], view: "left" },
  { side: 1, pins: [28, 66], view: "right" }
]);
const ENTRY_PLASTIC_GUIDES = Object.freeze([
  { pinNumber: 69, entrySide: -1 },
  { pinNumber: 68, entrySide: 1 }
]);
const PIN_PAIR_PLASTIC_GUIDES = Object.freeze([
  { startPinNumber: 23, endPinNumber: 67, side: -1 },
  { startPinNumber: 29, endPinNumber: 66, side: 1 }
]);
const HAKAMA_CHUCKER_X = 1.52;
const HAKAMA_CHUCKER_Y = 2.27 + FIXED_HAKAMA_Y_OFFSET;
const HAKAMA_CHUCKER_HALF_WIDTH = 0.19;
const HAKAMA_CHUCKER_HALF_HEIGHT = 0.16;
const BALL_RETURN_ANGLE = Math.PI * 5 / 6;
const BALL_RETURN_MIN_RADIUS = 1.92;
const BALL_RETURN_MAX_RADIUS = 2.48;
const BALL_RETURN_GATE_DURATION = 0.34;
const PIN_LAYOUT_STORAGE_KEY = "imasoraJackpotPinLayoutV1";
const PIN_LAYOUT_CHECKPOINT_STORAGE_KEY = "imasoraJackpotPinLayoutCheckpointV1";
const EDITABLE_BOARD_OBJECT_KEYS = Object.freeze([
  "windmill-left",
  "windmill-right",
  "seesaw-left",
  "seesaw-right",
  "seesaw-upper"
]);
const PIN_EDITOR_MIN_X = -2.05;
const PIN_EDITOR_MAX_X = 2.05;
const PIN_EDITOR_MIN_Y = 0.95;
const PIN_EDITOR_MAX_Y = 5.55;
const PIN_EDITOR_MAX_PINS = 120;

export const ST_SPINS = 5;
export const ST_CONTINUATION_RATE = 0.8;
export const ST_HIT_RATE = 1 - Math.pow(1 - ST_CONTINUATION_RATE, 1 / ST_SPINS);
export const JACKPOT_PAYOUTS = Object.freeze({ "77": 48, "33": 14 });
export const RED_SPIN_PAYOUT = 7;

const SEGMENTS_BY_DIGIT = Object.freeze({
  0: "ab cdef".replace(/ /g, ""),
  1: "bc",
  2: "abdeg",
  3: "abcdg",
  4: "bcfg",
  5: "acdfg",
  6: "acdefg",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg"
});

const PHYSICS_COLORS = Object.freeze({
  balanced: 0x5ce1bd,
  box: 0xffcf5b,
  heavy: 0xff8b55,
  float: 0x8fcfff,
  round: 0xff8fc1,
  slippery: 0x9d8bff,
  wide: 0x67dd8d
});

const markup = `
  <div class="icp-shell">
    <header class="icp-hud">
      <div class="icp-hud-cell"><small>もちコイン</small><strong data-icp-credits>250</strong></div>
      <div class="icp-hud-logo"><small>IMASORA</small><strong>JACKPOT</strong></div>
      <div class="icp-hud-cell icp-hud-cell-right"><small>獲得</small><strong data-icp-collected>0</strong></div>
    </header>
    <div class="icp-stage" data-icp-stage>
      <canvas class="icp-canvas" data-icp-canvas aria-label="一発台型パチンコ盤とコインプッシャーの3Dゲーム画面"></canvas>
      <div class="icp-seven-panel" hidden aria-hidden="true">
        <small data-icp-spin-label>CHANCE SLOT</small>
        <div class="icp-seven-digits">
          <span class="icp-seven-digit" data-icp-digit-left>${segmentMarkup()}</span>
          <span class="icp-seven-digit" data-icp-digit-right>${segmentMarkup()}</span>
        </div>
      </div>
      <div class="icp-st-badge" data-icp-st hidden><strong>ST</strong><span>残り <b data-icp-st-count>5</b> 回</span><small>継続期待 80%</small></div>
      <div class="icp-heat" data-icp-heat hidden>
        <div class="icp-heat-characters" data-icp-heat-characters></div>
        <strong data-icp-heat-title>相棒登場</strong>
        <small data-icp-heat-copy>CHANCE</small>
      </div>
      <div class="icp-callout" data-icp-callout hidden></div>
      <div class="icp-payout-meter" data-icp-payout hidden><span>放出中</span><strong data-icp-payout-count>0</strong></div>
      <div class="icp-game-over" data-icp-game-over hidden>
        <div class="icp-game-over-panel">
          <small>COIN OUT</small>
          <strong>ゲームオーバー</strong>
          <p>もちコインが0枚になりました</p>
          <button type="button" data-icp-restart>もう一度遊ぶ</button>
        </div>
      </div>
    </div>
    <div class="icp-collector-window" data-icp-collector aria-label="獲得ポケット">
      <small>獲得ポケット</small>
      <span class="icp-collector-mouth" aria-hidden="true"></span>
    </div>
    <div class="icp-controls">
      <label class="icp-stroke-control">
        <span>ストローク</span>
        <input type="range" min="20" max="100" value="58" step="1" data-icp-stroke aria-label="コイン発射のストローク">
        <output data-icp-stroke-value>58</output>
      </label>
      <div class="icp-action-row">
        <button type="button" class="icp-auto-button" data-icp-auto aria-pressed="false"><span aria-hidden="true">▶</span><strong data-icp-auto-label>オート発射 OFF</strong><small>0.6秒 / 1枚</small></button>
      </div>
      <div class="icp-pocket-guide" aria-hidden="true"><span>アウト</span><span>赤SPIN・7枚</span><span>アウト</span></div>
    </div>
    <details class="icp-layout-editor" data-icp-layout-editor>
      <summary>盤面配置 開発メニュー</summary>
      <div class="icp-layout-editor-body" data-icp-editor-body>
        <p class="icp-layout-editor-help">盤面の金色の釘・風車・シーソーを直接押して移動できます。変更は自動保存され、「この端末に保存」は戻り先として保持されます。</p>
        <div class="icp-layout-camera-select" aria-label="開発カメラの表示角度">
          <span>カメラ</span>
          <button type="button" data-icp-editor-action="camera" data-icp-camera-mode="front" aria-pressed="false">正面</button>
          <button type="button" data-icp-editor-action="camera" data-icp-camera-mode="normal" aria-pressed="true">通常</button>
        </div>
        <div class="icp-layout-object-select" aria-label="風車とシーソーを選択">
          <button type="button" data-icp-editor-select-object="windmill-left">左風車</button>
          <button type="button" data-icp-editor-select-object="windmill-right">右風車</button>
          <button type="button" data-icp-editor-select-object="seesaw-left">左シーソー</button>
          <button type="button" data-icp-editor-select-object="seesaw-right">右シーソー</button>
          <button type="button" data-icp-editor-select-object="seesaw-upper">上シーソー</button>
        </div>
        <div class="icp-layout-editor-status">
          <strong data-icp-editor-selection>釘を選択してください</strong>
          <span data-icp-editor-save-state>初期配置</span>
        </div>
        <div class="icp-layout-coordinate-row">
          <label><span>X</span><input type="number" step="0.01" inputmode="decimal" data-icp-pin-x aria-label="選択中の配置物のX座標"></label>
          <label><span>Y</span><input type="number" step="0.01" inputmode="decimal" data-icp-pin-y aria-label="選択中の配置物のY座標"></label>
          <button type="button" data-icp-editor-action="apply">適用</button>
        </div>
        <label class="icp-layout-step"><span>矢印の移動幅</span>
          <select data-icp-editor-step aria-label="配置物の移動幅">
            <option value="0.01">0.01</option>
            <option value="0.05" selected>0.05</option>
            <option value="0.1">0.10</option>
          </select>
        </label>
        <div class="icp-layout-dpad" aria-label="選択中の配置物を移動">
          <button type="button" data-icp-editor-action="move" data-dx="0" data-dy="1" aria-label="上へ移動">↑</button>
          <button type="button" data-icp-editor-action="move" data-dx="-1" data-dy="0" aria-label="左へ移動">←</button>
          <span aria-hidden="true">微調整</span>
          <button type="button" data-icp-editor-action="move" data-dx="1" data-dy="0" aria-label="右へ移動">→</button>
          <button type="button" data-icp-editor-action="move" data-dx="0" data-dy="-1" aria-label="下へ移動">↓</button>
        </div>
        <div class="icp-layout-editor-actions">
          <button type="button" data-icp-editor-action="add">＋ 釘を追加</button>
          <button type="button" data-icp-editor-action="delete">選択した釘を削除</button>
          <button type="button" class="is-primary" data-icp-editor-action="save">この端末に保存</button>
          <button type="button" data-icp-editor-action="restore-saved">保存した配置へ戻す</button>
          <button type="button" data-icp-editor-action="reset">初期配置へ戻す</button>
        </div>
        <label class="icp-layout-data"><span>配置データ</span><textarea rows="4" spellcheck="false" data-icp-layout-output aria-label="盤面の配置データ"></textarea></label>
        <div class="icp-layout-data-actions">
          <button type="button" data-icp-editor-action="copy">データをコピー</button>
          <button type="button" data-icp-editor-action="import">入力した配置を反映</button>
        </div>
      </div>
    </details>
  </div>`;

function segmentMarkup() {
  return ["a", "b", "c", "d", "e", "f", "g"]
    .map(segment => `<i class="icp-segment icp-segment-${segment}" data-segment="${segment}"></i>`)
    .join("");
}

function drawBoardLcdDigit(context, digit, x, y, width, height) {
  const active = SEGMENTS_BY_DIGIT[digit] || "";
  const inset = width * 0.16;
  const middleY = y + height / 2;
  const rightX = x + width;
  const bottomY = y + height;
  const segments = {
    a: [x + inset, y, rightX - inset, y],
    b: [rightX, y + inset, rightX, middleY - inset],
    c: [rightX, middleY + inset, rightX, bottomY - inset],
    d: [x + inset, bottomY, rightX - inset, bottomY],
    e: [x, middleY + inset, x, bottomY - inset],
    f: [x, y + inset, x, middleY - inset],
    g: [x + inset, middleY, rightX - inset, middleY]
  };
  const drawSegments = (color, glow) => {
    context.strokeStyle = color;
    context.lineWidth = width * 0.16;
    context.lineCap = "round";
    context.shadowColor = glow ? "#ff315f" : "transparent";
    context.shadowBlur = glow ? width * 0.18 : 0;
    Object.entries(segments).forEach(([name, points]) => {
      if (glow !== active.includes(name)) return;
      context.beginPath();
      context.moveTo(points[0], points[1]);
      context.lineTo(points[2], points[3]);
      context.stroke();
    });
  };
  drawSegments("rgba(94, 15, 42, 0.42)", false);
  drawSegments("#ff3d69", true);
  context.shadowBlur = 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function normalizeAngle(angle) {
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

function createCoinGeometry(radius, thickness) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const bevelDepth = Math.min(0.008, thickness * 0.16);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    steps: 1,
    curveSegments: 28,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(0.011, radius * 0.052),
    bevelThickness: bevelDepth
  });
  geometry.translate(0, 0, -thickness / 2);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const uvs = geometry.getAttribute("uv");
  for (let index = 0; index < positions.count; index += 1) {
    if (Math.abs(normals.getY(index)) < 0.72) continue;
    uvs.setXY(
      index,
      positions.getX(index) / (radius * 2) + 0.5,
      positions.getZ(index) / (radius * 2) + 0.5
    );
  }
  uvs.needsUpdate = true;
  return geometry;
}

function createCoinReliefTexture() {
  const size = 128;
  const center = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#dddddd";
  context.fillRect(0, 0, size, size);

  context.strokeStyle = "#ffffff";
  context.lineWidth = 7;
  context.beginPath();
  context.arc(center, center, 51, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "#909090";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(center, center, 43, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "#ffffff";
  const points = 10;
  context.beginPath();
  for (let index = 0; index < points; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 25 : 11;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.strokeStyle = "#989898";
  context.lineWidth = 2;
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function randomMissDigits(random) {
  let left;
  let right;
  do {
    left = Math.floor(random() * 10);
    right = Math.floor(random() * 10);
  } while ((left === 7 && right === 7) || (left === 3 && right === 3));
  return `${left}${right}`;
}

export function drawJackpotOutcome(random = Math.random, stRemaining = 0) {
  const inSt = stRemaining > 0;
  if (inSt) {
    const hit = random() < ST_HIT_RATE;
    if (!hit) {
      return {
        code: randomMissDigits(random),
        kind: "miss",
        inSt: true,
        nextStRemaining: Math.max(0, stRemaining - 1)
      };
    }
    const kind = random() < 0.24 ? "big" : "small";
    return {
      code: kind === "big" ? "77" : "33",
      kind,
      inSt: true,
      nextStRemaining: ST_SPINS
    };
  }

  const roll = random();
  if (roll < NORMAL_BIG_RATE) {
    return { code: "77", kind: "big", inSt: false, nextStRemaining: ST_SPINS };
  }
  if (roll < NORMAL_BIG_RATE + NORMAL_SMALL_RATE) {
    return { code: "33", kind: "small", inSt: false, nextStRemaining: ST_SPINS };
  }
  return { code: randomMissDigits(random), kind: "miss", inSt: false, nextStRemaining: 0 };
}

export function selectHeatCue(kind, random = Math.random) {
  const roll = random();
  if (kind === "big") {
    if (roll < 0.58) return "swarm";
    if (roll < 0.88) return "trio";
    return "single";
  }
  if (kind === "small") {
    if (roll < 0.12) return "swarm";
    if (roll < 0.58) return "trio";
    return "single";
  }
  if (roll < 0.025) return "swarm";
  if (roll < 0.14) return "trio";
  if (roll < 0.42) return "single";
  return "none";
}

export function resolveStartPocket(slot) {
  if (slot === 1) {
    return { kind: "red", startsSpin: true, payout: RED_SPIN_PAYOUT, creditReturn: 0 };
  }
  return { kind: "out", startsSpin: false, payout: 0, creditReturn: 0 };
}

export function pusherPositionAt(elapsed) {
  const phase = (Math.sin(elapsed * Math.PI * 0.66 - Math.PI / 2) + 1) / 2;
  return lerp(-1.56, -0.48, phase);
}

function sanitizeSvg(svg) {
  return String(svg || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");
}

function svgDataUrl(svg) {
  const safe = sanitizeSvg(svg);
  if (!safe.includes("<svg")) return "";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(safe)}`;
}

function createFallbackTexture(item) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 512, 512);
  context.fillStyle = item?.bodyColor || "#a9ddff";
  context.strokeStyle = "#24374b";
  context.lineWidth = 18;
  context.beginPath();
  if (typeof context.roundRect === "function") context.roundRect(82, 64, 348, 374, 82);
  else context.rect(82, 64, 348, 374);
  context.fill();
  context.stroke();
  context.fillStyle = item?.accentColor || "#57cf9b";
  context.fillRect(112, 330, 288, 30);
  context.fillStyle = "#1c2b3a";
  context.beginPath();
  context.arc(198, 224, 18, 0, Math.PI * 2);
  context.arc(314, 224, 18, 0, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function svgTexture(svg, renderer, fallbackItem, options = {}) {
  return new Promise((resolve, reject) => {
    const safe = sanitizeSvg(svg);
    const strict = Boolean(options.strict);
    const designId = String(options.designId || "");
    const fail = reason => {
      const message = `SVG texture failed${designId ? ` (${designId})` : ""}: ${reason}`;
      if (strict) {
        reject(new Error(message));
        return;
      }
      console.warn(message);
      resolve(createFallbackTexture(fallbackItem));
    };
    const url = svgDataUrl(safe);
    if (!url) {
      fail("valid SVG markup was not supplied");
      return;
    }
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 640;
      const context = canvas.getContext("2d");
      if (!context) {
        fail("2D canvas context is unavailable");
        return;
      }
      context.clearRect(0, 0, 640, 640);
      const sourceWidth = image.naturalWidth || image.width || 116;
      const sourceHeight = image.naturalHeight || image.height || 116;
      const scale = Math.min(600 / sourceWidth, 600 / sourceHeight);
      const width = sourceWidth * scale;
      const height = sourceHeight * scale;
      context.drawImage(image, (640 - width) / 2, (640 - height) / 2, width, height);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      texture.userData.wingDesignId = designId;
      texture.userData.svgFallbackUsed = false;
      resolve(texture);
    };
    image.onerror = () => fail("the browser could not decode the SVG data URL");
    image.src = url;
  });
}

function createStarShape(outer = 1, inner = 0.48) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? outer : inner;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

class ImasoraJackpotCoinPusherGame {
  constructor(root, options = {}) {
    this.root = root;
    this.roster = Array.isArray(options.roster)
      ? options.roster.filter(item => item?.id && item?.frontSvg)
      : [];
    this.wingArt = options.wingArt && typeof options.wingArt === "object"
      ? options.wingArt
      : {};
    this.random = typeof options.random === "function" ? options.random : Math.random;
    this.destroyed = false;
    this.elapsed = 0;
    this.lastTimestamp = 0;
    this.frame = 0;
    this.credits = STARTING_CREDITS;
    this.collected = 0;
    this.stroke = 0.58;
    this.lastLaunchStroke = null;
    this.launchCooldown = 0;
    this.autoEnabled = false;
    this.autoTimer = 0;
    this.tableCoins = [];
    this.collectingCoins = [];
    this.pachinkoTokens = [];
    this.pachinkoWindmills = [];
    this.entrySeesaws = [];
    this.entryPlasticGuides = [];
    this.hanemonoWings = [];
    this.hakamaChuckers = [];
    this.haneOpenTimer = 0;
    this.haneOpenAmount = 0;
    this.pendingSpins = 0;
    this.spin = null;
    this.spinDelay = 0;
    this.stRemaining = 0;
    this.pendingPayout = 0;
    this.payoutAccumulator = 0;
    this.calloutTimer = 0;
    this.heatTimer = 0;
    this.cameraShake = 0;
    this.cameraMode = "normal";
    this.collectionFlash = 0;
    this.ballReturnGate = null;
    this.ballReturnGateTimer = 0;
    this.collectionWindowTimer = 0;
    this.zeroCreditTimer = 0;
    this.gameOver = false;
    this.currentLcdCode = "00";
    this.currentLcdLabel = "CHANCE SLOT";
    this.textures = new Set();
    this.editablePins = [];
    this.editableObjects = [];
    this.selectedEditablePin = null;
    this.layoutEditing = false;
    this.draggingPin = false;
    this.dragPointerId = null;
    this.pinLayoutDirty = false;
    this.pinLayoutSaveTimer = 0;
    this.pinLayoutLoadedFromStorage = false;
    this.pinLayoutCheckpointAvailable = false;
    this.loadedPinLayoutVersion = 1;
    this.loadedObjectLayout = null;
    this.loadedEntryPlasticGuidePinNumbers = null;
    this.pinRaycaster = new THREE.Raycaster();
    this.pinPointer = new THREE.Vector2();
    this.pinDragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1.6);
    this.pinDragPoint = new THREE.Vector3();
    this.boundLoop = this.loop.bind(this);
    this.boundResize = this.resize.bind(this);
    this.boundAuto = this.toggleAuto.bind(this);
    this.boundStroke = this.onStrokeInput.bind(this);
    this.boundRestart = this.restartGame.bind(this);
    this.boundVisibility = this.onVisibilityChange.bind(this);
    this.boundPageHide = this.flushPinLayoutSave.bind(this);
    this.boundEditorToggle = this.onLayoutEditorToggle.bind(this);
    this.boundEditorClick = this.onLayoutEditorClick.bind(this);
    this.boundCanvasPointerDown = this.onCanvasPointerDown.bind(this);
    this.boundCanvasPointerMove = this.onCanvasPointerMove.bind(this);
    this.boundCanvasPointerUp = this.onCanvasPointerUp.bind(this);
  }

  mount() {
    this.root.innerHTML = markup;
    this.els = {
      stage: this.root.querySelector("[data-icp-stage]"),
      canvas: this.root.querySelector("[data-icp-canvas]"),
      collector: this.root.querySelector("[data-icp-collector]"),
      credits: this.root.querySelector("[data-icp-credits]"),
      collected: this.root.querySelector("[data-icp-collected]"),
      sevenPanel: this.root.querySelector(".icp-seven-panel"),
      digitLeft: this.root.querySelector("[data-icp-digit-left]"),
      digitRight: this.root.querySelector("[data-icp-digit-right]"),
      spinLabel: this.root.querySelector("[data-icp-spin-label]"),
      st: this.root.querySelector("[data-icp-st]"),
      stCount: this.root.querySelector("[data-icp-st-count]"),
      heat: this.root.querySelector("[data-icp-heat]"),
      heatCharacters: this.root.querySelector("[data-icp-heat-characters]"),
      heatTitle: this.root.querySelector("[data-icp-heat-title]"),
      heatCopy: this.root.querySelector("[data-icp-heat-copy]"),
      callout: this.root.querySelector("[data-icp-callout]"),
      payout: this.root.querySelector("[data-icp-payout]"),
      payoutCount: this.root.querySelector("[data-icp-payout-count]"),
      gameOver: this.root.querySelector("[data-icp-game-over]"),
      restart: this.root.querySelector("[data-icp-restart]"),
      stroke: this.root.querySelector("[data-icp-stroke]"),
      strokeValue: this.root.querySelector("[data-icp-stroke-value]"),
      auto: this.root.querySelector("[data-icp-auto]"),
      autoLabel: this.root.querySelector("[data-icp-auto-label]"),
      layoutEditor: this.root.querySelector("[data-icp-layout-editor]"),
      editorBody: this.root.querySelector("[data-icp-editor-body]"),
      editorSelection: this.root.querySelector("[data-icp-editor-selection]"),
      editorSaveState: this.root.querySelector("[data-icp-editor-save-state]"),
      pinX: this.root.querySelector("[data-icp-pin-x]"),
      pinY: this.root.querySelector("[data-icp-pin-y]"),
      editorStep: this.root.querySelector("[data-icp-editor-step]"),
      layoutOutput: this.root.querySelector("[data-icp-layout-output]")
    };
    this.setupRenderer();
    this.setupPhysics();
    this.createEnvironment();
    this.createMachine();
    this.createPachinkoBoard();
    this.createInitialCoins();
    this.createCompanionMarquee();
    this.bindEvents();
    this.setDigits("00");
    this.refreshHud();
    this.resize();
    this.lastTimestamp = performance.now();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.els.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x13263c);
    this.scene.fog = new THREE.FogExp2(0x18324b, 0.035);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 70);
    this.cameraTarget = new THREE.Vector3(0, 2.25, -0.55);
    this.cameraBase = new THREE.Vector3(-5.45, 5.4, 8.2);
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.cameraTarget);
  }

  setupPhysics() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -PACHINKO_GRAVITY, 0) });
    this.world.allowSleep = true;
    this.world.solver.iterations = 14;
    this.world.solver.tolerance = 0.0015;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    this.coinMaterial = new CANNON.Material("coin");
    this.tableMaterial = new CANNON.Material("table");
    this.pusherMaterial = new CANNON.Material("pusher");
    this.pinMaterial = new CANNON.Material("pin");
    this.railMaterial = new CANNON.Material("rail");
    this.tokenMaterial = new CANNON.Material("pachinko-token");
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial, this.tableMaterial, {
      friction: 0.31,
      restitution: 0.06,
      contactEquationStiffness: 8e6,
      contactEquationRelaxation: 4
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial, this.pusherMaterial, {
      friction: 0.42,
      restitution: 0.04
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial, this.coinMaterial, {
      friction: 0.22,
      restitution: 0.08
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.tokenMaterial, this.pinMaterial, {
      friction: 0.01,
      restitution: 0.44
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.tokenMaterial, this.railMaterial, {
      friction: 0.006,
      restitution: 0.18
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.tokenMaterial, this.tableMaterial, {
      friction: 0.012,
      restitution: 0.08
    }));
  }

  createEnvironment() {
    const ambient = new THREE.HemisphereLight(0xbfefff, 0x19263b, 2.25);
    this.scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff1c7, 4.6);
    key.position.set(4.5, 8.5, 6.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -7;
    key.shadow.camera.right = 7;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -5;
    this.scene.add(key);

    const cyan = new THREE.PointLight(0x20f2cf, 18, 9, 2);
    cyan.position.set(-4.2, 3.8, 2.6);
    const magenta = new THREE.PointLight(0xff2f9a, 16, 8, 2);
    magenta.position.set(4, 4.4, -1.8);
    this.scene.add(cyan, magenta);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a3548, roughness: 0.74, metalness: 0.16 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.45;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x233f53, roughness: 0.6, metalness: 0.2 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 0.35), wallMaterial);
    wall.position.set(0, 3.3, -3.35);
    wall.receiveShadow = true;
    this.scene.add(wall);

    const trimMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffdb62,
      emissive: 0xb86b0d,
      emissiveIntensity: 1.05,
      metalness: 0.72,
      roughness: 0.22
    });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.65, 0.09, 12, 70, Math.PI), trimMaterial);
    arch.position.set(0, 3.25, -3.08);
    arch.rotation.z = Math.PI;
    this.scene.add(arch);

    [-3.65, 3.65].forEach((x, index) => {
      const starMaterial = new THREE.MeshBasicMaterial({ color: index ? 0xff4ba4 : 0x44f1cc });
      const star = new THREE.Mesh(new THREE.ShapeGeometry(createStarShape(0.56, 0.26)), starMaterial);
      star.position.set(x, 5.65, -3.04);
      this.scene.add(star);
    });
  }

  createMachine() {
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x26647b,
      metalness: 0.48,
      roughness: 0.3,
      clearcoat: 0.4
    });
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffca45,
      emissive: 0x8a4700,
      emissiveIntensity: 0.5,
      metalness: 0.82,
      roughness: 0.2
    });
    const bedMaterial = new THREE.MeshStandardMaterial({ color: 0xd7f7ed, roughness: 0.4, metalness: 0.08 });
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xaeefff,
      transparent: true,
      opacity: 0.18,
      roughness: 0.08,
      metalness: 0,
      transmission: 0.45,
      depthWrite: false
    });

    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(6.1, 1.35, 5.5), baseMaterial);
    cabinet.position.set(0, -0.05, 0.12);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    this.scene.add(cabinet);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.15, 0.22, 4.7), bedMaterial);
    shelf.position.set(0, TABLE_TOP_Y - 0.11, 0.05);
    shelf.receiveShadow = true;
    this.scene.add(shelf);

    const shelfBody = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    shelfBody.addShape(new CANNON.Box(new CANNON.Vec3(2.575, 0.11, 2.35)));
    shelfBody.position.set(0, TABLE_TOP_Y - 0.11, 0.05);
    this.world.addBody(shelfBody);

    [-2.68, 2.68].forEach(x => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 4.92), glassMaterial);
      rail.position.set(x, 0.9, 0.05);
      rail.castShadow = true;
      this.scene.add(rail);
      const body = new CANNON.Body({ mass: 0, material: this.tableMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.07, 0.42, 2.48)));
      body.position.set(x, 0.92, 0.05);
      this.world.addBody(body);
    });

    const backBody = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    backBody.addShape(new CANNON.Box(new CANNON.Vec3(2.58, 0.5, 0.08)));
    backBody.position.set(0, 0.95, -2.28);
    this.world.addBody(backBody);

    const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.13, 0.17), goldMaterial);
    frontTrim.position.set(0, 0.63, FRONT_EDGE_Z);
    this.scene.add(frontTrim);

    this.pusherBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.pusherMaterial });
    this.pusherBody.addShape(new CANNON.Box(new CANNON.Vec3(2.42, 0.12, 0.66)));
    this.pusherBody.addShape(new CANNON.Box(new CANNON.Vec3(2.42, 0.19, 0.08)), new CANNON.Vec3(0, 0.17, -0.58));
    this.pusherBody.position.set(0, TABLE_TOP_Y + 0.12, -1.56);
    this.world.addBody(this.pusherBody);

    this.pusherVisual = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.BoxGeometry(4.84, 0.24, 1.32), goldMaterial);
    plate.receiveShadow = true;
    plate.castShadow = true;
    const face = new THREE.Mesh(new THREE.BoxGeometry(4.84, 0.37, 0.16), baseMaterial);
    face.position.set(0, 0.17, -0.58);
    face.castShadow = true;
    this.pusherVisual.add(plate, face);
    this.pusherVisual.position.copy(this.pusherBody.position);
    this.scene.add(this.pusherVisual);

    const collectorDarkMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x07151f,
      emissive: 0x073735,
      emissiveIntensity: 0.48,
      metalness: 0.35,
      roughness: 0.32
    });
    const collectorBack = new THREE.Mesh(new THREE.BoxGeometry(4.92, 0.1, 0.62), collectorDarkMaterial);
    collectorBack.position.set(0, 0.32, 2.7);
    this.scene.add(collectorBack);

    const collectorFrame = new THREE.Group();
    const collectorTop = new THREE.Mesh(new THREE.BoxGeometry(5.12, 0.1, 0.12), goldMaterial);
    const collectorBottom = collectorTop.clone();
    collectorTop.position.set(0, 0.4, 2.38);
    collectorBottom.position.set(0, 0.4, 3.02);
    const collectorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.72), goldMaterial);
    const collectorRight = collectorLeft.clone();
    collectorLeft.position.set(-2.51, 0.4, 2.7);
    collectorRight.position.set(2.51, 0.4, 2.7);
    collectorFrame.add(collectorTop, collectorBottom, collectorLeft, collectorRight);
    this.scene.add(collectorFrame);

    this.collectionGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.74, 0.5),
      new THREE.MeshBasicMaterial({
        color: 0x52f2c4,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.collectionGlow.rotation.x = -Math.PI / 2;
    this.collectionGlow.position.set(0, 0.39, 2.7);
    this.scene.add(this.collectionGlow);

    this.coinGeometry = createCoinGeometry(TABLE_COIN_RADIUS, TABLE_COIN_THICKNESS);
    this.coinReliefTexture = createCoinReliefTexture();
    this.textures.add(this.coinReliefTexture);
    this.coinFaceTexture = this.coinReliefTexture.clone();
    this.coinFaceTexture.colorSpace = THREE.SRGBColorSpace;
    this.coinFaceTexture.needsUpdate = true;
    this.textures.add(this.coinFaceTexture);
    this.coinEdgeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffc72e,
      emissive: 0x6a3200,
      emissiveIntensity: 0.32,
      metalness: 0.88,
      roughness: 0.23,
      clearcoat: 0.35
    });
    this.coinFaceMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffe477,
      emissive: 0x7a4000,
      emissiveIntensity: 0.28,
      metalness: 0.78,
      roughness: 0.24,
      clearcoat: 0.42,
      clearcoatRoughness: 0.18,
      map: this.coinFaceTexture,
      bumpMap: this.coinReliefTexture,
      bumpScale: 0.016
    });
  }

  createBoardLcd() {
    this.boardLcdCanvas = document.createElement("canvas");
    this.boardLcdCanvas.width = 480;
    this.boardLcdCanvas.height = 300;
    this.boardLcdContext = this.boardLcdCanvas.getContext("2d");
    this.boardLcdTexture = new THREE.CanvasTexture(this.boardLcdCanvas);
    this.boardLcdTexture.colorSpace = THREE.SRGBColorSpace;
    this.boardLcdTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures.add(this.boardLcdTexture);

    const lcd = new THREE.Group();
    lcd.name = "icp-board-mounted-lcd";
    lcd.position.set(0, BOARD_LCD_Y, PACHINKO_PLAYFIELD_Z - BOARD_LCD_RECESS_DEPTH);

    const recess = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_LCD_WIDTH, BOARD_LCD_HEIGHT),
      new THREE.MeshBasicMaterial({
        color: 0x020508,
        toneMapped: false
      })
    );
    recess.name = "icp-board-lcd-recess";
    lcd.add(recess);

    const cavityDepth = BOARD_LCD_RECESS_DEPTH;
    const cavityWallDepth = cavityDepth;
    const cavityWallThickness = 0.026;
    const cavityWallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x080b0f,
      metalness: 0.44,
      roughness: 0.34,
      clearcoat: 0.28
    });
    const horizontalCavityWallGeometry = new THREE.BoxGeometry(
      BOARD_LCD_WIDTH,
      cavityWallThickness,
      cavityWallDepth
    );
    const verticalCavityWallGeometry = new THREE.BoxGeometry(
      cavityWallThickness,
      BOARD_LCD_HEIGHT - cavityWallThickness * 2,
      cavityWallDepth
    );
    [
      {
        geometry: horizontalCavityWallGeometry,
        x: 0,
        y: (BOARD_LCD_HEIGHT - cavityWallThickness) / 2
      },
      {
        geometry: horizontalCavityWallGeometry,
        x: 0,
        y: -(BOARD_LCD_HEIGHT - cavityWallThickness) / 2
      },
      {
        geometry: verticalCavityWallGeometry,
        x: (BOARD_LCD_WIDTH - cavityWallThickness) / 2,
        y: 0
      },
      {
        geometry: verticalCavityWallGeometry,
        x: -(BOARD_LCD_WIDTH - cavityWallThickness) / 2,
        y: 0
      }
    ].forEach(({ geometry, x, y }) => {
      const wall = new THREE.Mesh(geometry, cavityWallMaterial);
      wall.position.set(x, y, cavityWallDepth / 2);
      lcd.add(wall);
    });

    this.boardLcdScreenMaterial = new THREE.MeshBasicMaterial({
      map: this.boardLcdTexture,
      toneMapped: false
    });
    const screenWidth = BOARD_LCD_WIDTH - 0.055;
    const screenHeight = BOARD_LCD_HEIGHT - 0.055;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(screenWidth, screenHeight),
      this.boardLcdScreenMaterial
    );
    screen.name = "icp-board-lcd-screen";
    screen.position.z = 0.006;
    lcd.add(screen);

    const rimMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd454,
      emissive: 0x7d3d00,
      emissiveIntensity: 0.62,
      metalness: 0.9,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.04
    });
    const outerHalfWidth = (BOARD_LCD_WIDTH - 0.006) / 2;
    const outerHalfHeight = (BOARD_LCD_HEIGHT - 0.006) / 2;
    const innerHalfWidth = (screenWidth + 0.006) / 2;
    const innerHalfHeight = (screenHeight + 0.006) / 2;
    const bezelShape = new THREE.Shape();
    bezelShape.moveTo(-outerHalfWidth, -outerHalfHeight);
    bezelShape.lineTo(outerHalfWidth, -outerHalfHeight);
    bezelShape.lineTo(outerHalfWidth, outerHalfHeight);
    bezelShape.lineTo(-outerHalfWidth, outerHalfHeight);
    bezelShape.closePath();
    const bezelOpening = new THREE.Path();
    bezelOpening.moveTo(-innerHalfWidth, -innerHalfHeight);
    bezelOpening.lineTo(-innerHalfWidth, innerHalfHeight);
    bezelOpening.lineTo(innerHalfWidth, innerHalfHeight);
    bezelOpening.lineTo(innerHalfWidth, -innerHalfHeight);
    bezelOpening.closePath();
    bezelShape.holes.push(bezelOpening);
    const bezelGeometry = new THREE.ExtrudeGeometry(bezelShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.004,
      bevelThickness: 0.004,
      curveSegments: 1,
      steps: 1
    });
    const bezel = new THREE.Mesh(bezelGeometry, rimMaterial);
    bezel.name = "icp-board-lcd-panel-aligned-bezel";
    bezel.position.z = 0.002;
    lcd.add(bezel);

    this.boardLcd = lcd;
    this.scene.add(lcd);
    this.refreshBoardLcd();
  }

  createPachinkoBoard() {
    const boardMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x184b5d,
      metalness: 0.46,
      roughness: 0.27,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.25, 4.76, 0.22), boardMaterial);
    board.position.set(0, PACHINKO_FIELD_CENTER_Y, -2.3);
    board.receiveShadow = true;
    board.castShadow = true;
    this.scene.add(board);

    const playfieldShape = new THREE.Shape();
    playfieldShape.absarc(0, 0, PACHINKO_FIELD_RADIUS, 0, Math.PI * 2, false);
    playfieldShape.closePath();
    const lcdOpeningHalfWidth = BOARD_LCD_WIDTH / 2;
    const lcdOpeningHalfHeight = BOARD_LCD_HEIGHT / 2;
    const lcdOpeningCenterY = BOARD_LCD_Y - PACHINKO_FIELD_CENTER_Y;
    const lcdOpening = new THREE.Path();
    lcdOpening.moveTo(-lcdOpeningHalfWidth, lcdOpeningCenterY - lcdOpeningHalfHeight);
    lcdOpening.lineTo(lcdOpeningHalfWidth, lcdOpeningCenterY - lcdOpeningHalfHeight);
    lcdOpening.lineTo(lcdOpeningHalfWidth, lcdOpeningCenterY + lcdOpeningHalfHeight);
    lcdOpening.lineTo(-lcdOpeningHalfWidth, lcdOpeningCenterY + lcdOpeningHalfHeight);
    lcdOpening.closePath();
    playfieldShape.holes.push(lcdOpening);

    const playfield = new THREE.Mesh(
      new THREE.ShapeGeometry(playfieldShape, 80),
      new THREE.MeshPhysicalMaterial({
        color: 0x26758a,
        emissive: 0x062e3b,
        emissiveIntensity: 0.42,
        metalness: 0.32,
        roughness: 0.31,
        clearcoat: 0.62
      })
    );
    playfield.position.set(0, PACHINKO_FIELD_CENTER_Y, PACHINKO_PLAYFIELD_Z);
    playfield.receiveShadow = true;
    this.scene.add(playfield);
    this.createBoardLcd();

    const boardBackBody = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    boardBackBody.addShape(new CANNON.Box(new CANNON.Vec3(2.58, 2.38, 0.06)));
    boardBackBody.position.set(0, PACHINKO_FIELD_CENTER_Y, -2.29);
    this.world.addBody(boardBackBody);

    const boardFrontBody = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    boardFrontBody.addShape(new CANNON.Box(new CANNON.Vec3(2.58, 2.38, 0.035)));
    boardFrontBody.position.set(0, PACHINKO_FIELD_CENTER_Y, -1.78);
    this.world.addBody(boardFrontBody);

    [-2.58, 2.58].forEach(x => {
      const side = new CANNON.Body({ mass: 0, material: this.tableMaterial });
      side.addShape(new CANNON.Box(new CANNON.Vec3(0.055, 2.38, 0.28)));
      side.position.set(x, PACHINKO_FIELD_CENTER_Y, BOARD_Z);
      this.world.addBody(side);
    });

    const pinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffed78,
      emissive: 0xffb20a,
      emissiveIntensity: 1.15,
      metalness: 1,
      roughness: 0.07,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      reflectivity: 1
    });
    const gaugePinGeometry = new THREE.CylinderGeometry(0.033, 0.038, 0.19, 16);
    gaugePinGeometry.rotateX(Math.PI / 2);
    const rolePinGeometry = new THREE.CylinderGeometry(0.03, 0.035, 0.17, 14);
    rolePinGeometry.rotateX(Math.PI / 2);
    this.boardPins = [];
    this.rolePins = [];
    this.editablePins = [];
    this.editableObjects = [];

    const addPin = (x, y, role = false, editable = false) => {
      const radius = role ? 0.04 : 0.044;
      const pin = new THREE.Mesh(role ? rolePinGeometry : gaugePinGeometry, pinMaterial);
      pin.name = role ? "icp-role-pin" : "icp-pachinko-pin";
      pin.position.set(x, y, role ? -1.56 : -1.6);
      pin.castShadow = true;
      this.scene.add(pin);
      const body = new CANNON.Body({ mass: 0, material: this.pinMaterial });
      body.addShape(new CANNON.Sphere(radius));
      body.position.set(x, y, BOARD_Z);
      this.world.addBody(body);
      (role ? this.rolePins : this.boardPins).push(pin);
      if (!editable) return null;
      const record = {
        visual: pin,
        body,
        kind: "pin",
        label: "釘",
        hitRadius: 0.24,
        markerScale: 1
      };
      pin.userData.icpEditablePin = record;
      this.editablePins.push(record);
      return record;
    };
    this.createEditableBoardPin = (x, y) => addPin(x, y, false, true);

    const railMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf6d777,
      emissive: 0x6e3900,
      emissiveIntensity: 0.34,
      metalness: 0.9,
      roughness: 0.17
    });
    const launcherRailMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5fbff,
      emissive: 0x9ab4c2,
      emissiveIntensity: 0.5,
      metalness: 0.97,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.045,
      envMapIntensity: 1.65
    });
    const addRail = (from, to, width = 0.055, material = railMaterial, name = "icp-gauge-rail") => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, width, 0.15), material);
      rail.name = name;
      rail.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, -1.61);
      rail.rotation.z = angle;
      rail.castShadow = true;
      this.scene.add(rail);
      const body = new CANNON.Body({ mass: 0, material: this.railMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(length / 2, width / 2, 0.2)));
      body.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, BOARD_Z);
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle);
      this.world.addBody(body);
      return rail;
    };

    const addArcRail = (
      radius,
      startAngle,
      endAngle,
      segments,
      width = 0.05,
      material = launcherRailMaterial,
      name = "icp-launch-rail"
    ) => {
      let previous = [radius * Math.cos(startAngle), PACHINKO_FIELD_CENTER_Y + radius * Math.sin(startAngle)];
      for (let index = 1; index <= segments; index += 1) {
        const angle = lerp(startAngle, endAngle, index / segments);
        const next = [radius * Math.cos(angle), PACHINKO_FIELD_CENTER_Y + radius * Math.sin(angle)];
        addRail(previous, next, width, material, name);
        previous = next;
      }
    };

    // The outer frame follows the enlarged playfield, but stops before it
    // reconnects across the launcher lane. The inner rail still opens at 10 o'clock.
    addRail([-PACHINKO_FRAME_RADIUS, 0.82], [-PACHINKO_FRAME_RADIUS, PACHINKO_FIELD_CENTER_Y], 0.05, launcherRailMaterial, "icp-launch-outer-frame");
    addRail([-2.06, 0.82], [-2.06, PACHINKO_FIELD_CENTER_Y], 0.05, launcherRailMaterial, "icp-launch-rail");
    addArcRail(PACHINKO_FRAME_RADIUS, Math.PI, 0, 30, 0.05, launcherRailMaterial, "icp-launch-outer-frame");
    addArcRail(
      PACHINKO_FRAME_RADIUS,
      0,
      -Math.PI + PACHINKO_LAUNCH_FRAME_GAP_ANGLE,
      29,
      0.05,
      launcherRailMaterial,
      "icp-launch-outer-frame"
    );
    addArcRail(2.06, Math.PI, Math.PI * 5 / 6, 7, 0.05, launcherRailMaterial, "icp-launch-rail");

    const drainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x02070b,
      emissive: 0x00151d,
      emissiveIntensity: 0.42,
      metalness: 0.16,
      roughness: 0.3,
      clearcoat: 0.38
    });
    const drain = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), drainMaterial);
    drain.name = "icp-pachinko-drain";
    drain.position.set(0, PACHINKO_DRAIN_CENTER_Y, -1.51);
    drain.scale.set(1, 0.43, 1);
    this.scene.add(drain);

    const drainRim = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.35, 48),
      launcherRailMaterial
    );
    drainRim.name = "icp-pachinko-drain-rim";
    drainRim.position.set(0, PACHINKO_DRAIN_CENTER_Y, -1.5);
    drainRim.scale.set(1, 0.43, 1);
    this.scene.add(drainRim);

    const gateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4fbff,
      emissive: 0x96b0bd,
      emissiveIntensity: 0.48,
      metalness: 0.96,
      roughness: 0.11,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.6
    });
    const gateHingeRadius = PACHINKO_FRAME_RADIUS;
    const gateClosedAngle = BALL_RETURN_ANGLE + Math.PI;
    const gatePivot = new THREE.Group();
    gatePivot.name = "icp-ball-return-gate";
    gatePivot.position.set(
      gateHingeRadius * Math.cos(BALL_RETURN_ANGLE),
      PACHINKO_FIELD_CENTER_Y + gateHingeRadius * Math.sin(BALL_RETURN_ANGLE),
      -1.44
    );
    gatePivot.rotation.z = gateClosedAngle;
    const gateFlap = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.052, 0.14), gateMaterial);
    gateFlap.position.x = 0.155;
    gateFlap.castShadow = true;
    gatePivot.add(gateFlap);
    const gateHinge = new THREE.Mesh(new THREE.SphereGeometry(0.068, 18, 12), gateMaterial);
    gateHinge.castShadow = true;
    gatePivot.add(gateHinge);
    this.scene.add(gatePivot);
    this.ballReturnGate = { pivot: gatePivot, closedAngle: gateClosedAngle };

    // The launcher exit and the horizontal entry guide stay completely clear.
    // Pins form a few close-set chains like the reference machine, not a grid.
    const oneShotGauge = [
      [-0.456, 5.25], [-0.573, 5.214], [-0.688, 5.17],
      [-0.799, 5.118], [-0.906, 5.059], [-1.009, 4.992],
      [-1.108, 4.918], [-1.2, 4.837], [-1.287, 4.75],
      [-1.368, 4.658], [-1.442, 4.559],

      [0.456, 5.25], [0.573, 5.214], [0.688, 5.17],
      [0.799, 5.118], [0.906, 5.059], [1.009, 4.992],
      [1.108, 4.918], [1.2, 4.837], [1.287, 4.75],
      [1.368, 4.658], [1.442, 4.559],

      [-0.56, 5.34], [-0.42, 5.393], [-0.28, 5.43],
      [-0.14, 5.453], [0, 5.46], [0.14, 5.453],
      [0.28, 5.43], [0.42, 5.393], [0.56, 5.34],

      [-0.141, 4.893], [-0.234, 4.879], [-0.327, 4.86],
      [-0.417, 4.834], [-0.506, 4.802], [-0.592, 4.763],
      [0.141, 4.893], [0.234, 4.879], [0.327, 4.86],
      [0.417, 4.834], [0.506, 4.802], [0.592, 4.763]
    ].map(([x, y]) => [x, y + BOARD_COMPONENT_Y_OFFSET]);
    const hakamaPinLayout = [];
    [-1, 1].forEach(side => {
      const centerX = side * 1.52;
      const halfWidths = [0.34, 0.3, 0.26, 0.22, 0.18];
      hakamaPinLayout.push(
        [centerX - 0.11, 3.74 + FIXED_HAKAMA_Y_OFFSET],
        [centerX + 0.11, 3.74 + FIXED_HAKAMA_Y_OFFSET]
      );
      halfWidths.forEach((halfWidth, row) => {
        const y = 3.5 - row * 0.2 + FIXED_HAKAMA_Y_OFFSET;
        hakamaPinLayout.push([centerX - halfWidth, y], [centerX + halfWidth, y]);
      });
      hakamaPinLayout.push(
        [centerX - 0.1, 2.48 + FIXED_HAKAMA_Y_OFFSET],
        [centerX + 0.1, 2.48 + FIXED_HAKAMA_Y_OFFSET]
      );
    });
    this.hakamaPinLayout = hakamaPinLayout.map(([x, y]) => [x, y]);
    this.defaultPinLayout = [...oneShotGauge, ...this.hakamaPinLayout].map(([x, y]) => [x, y]);
    this.defaultObjectLayout = {
      "windmill-left": [-1.28, 4.18 + BOARD_COMPONENT_Y_OFFSET],
      "windmill-right": [1.28, 4.18 + BOARD_COMPONENT_Y_OFFSET],
      "seesaw-left": [-0.145, ROLE_RELEASE_Y + 0.08],
      "seesaw-right": [0.145, ROLE_RELEASE_Y + 0.08],
      "seesaw-upper": [0, ROLE_RELEASE_Y + 0.53]
    };
    const savedPinLayout = this.loadPinLayout();
    this.pinLayoutLoadedFromStorage = savedPinLayout !== null;
    const activePinLayout = savedPinLayout ?? this.defaultPinLayout;
    activePinLayout.forEach(([x, y]) => addPin(x, y, false, true));
    const activeEntryPlasticGuidePinNumbers = new Set(
      this.loadedEntryPlasticGuidePinNumbers
        ?? ENTRY_PLASTIC_GUIDES.map(config => config.pinNumber)
    );
    const activeObjectLayout = this.loadedObjectLayout ?? this.defaultObjectLayout;
    const objectPosition = key => activeObjectLayout[key] ?? this.defaultObjectLayout[key];

    const chuckerMouthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x031014,
      emissive: 0x001c24,
      emissiveIntensity: 0.46,
      metalness: 0.28,
      roughness: 0.22,
      clearcoat: 0.72
    });
    [-1, 1].forEach(side => {
      const frameMaterial = new THREE.MeshPhysicalMaterial({
        color: side < 0 ? 0xff70ad : 0x57e5c5,
        emissive: side < 0 ? 0x7a1648 : 0x075b50,
        emissiveIntensity: 0.58,
        metalness: 0.5,
        roughness: 0.2,
        clearcoat: 0.9
      });
      const chucker = new THREE.Group();
      chucker.name = side < 0 ? "icp-hakama-chucker-left" : "icp-hakama-chucker-right";
      chucker.position.set(side * 1.52, 2.27 + FIXED_HAKAMA_Y_OFFSET, -1.5);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.25, 0.09), frameMaterial);
      frame.castShadow = true;
      chucker.add(frame);
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.055), chuckerMouthMaterial);
      mouth.position.z = 0.065;
      chucker.add(mouth);
      const indicatorMaterial = pinMaterial.clone();
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 10), indicatorMaterial);
      indicator.position.set(0, 0.165, 0.035);
      indicator.castShadow = true;
      chucker.add(indicator);
      this.scene.add(chucker);
      this.hakamaChuckers.push({
        side,
        visual: chucker,
        indicator,
        indicatorMaterial,
        flash: 0
      });
    });

    const wingSpineMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8fdff,
      emissive: 0x8fb7c7,
      emissiveIntensity: 0.42,
      metalness: 0.95,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.05
    });
    const wingFallbackItem = {
      bodyColor: this.wingArt.bodyColor || "#ffd098",
      accentColor: this.wingArt.accentColor || "#56c477",
      sparkColor: this.wingArt.sparkColor || "#dff7ff"
    };
    const wingDesignId = String(this.wingArt.designId || "");
    const wingIdentityValid = wingDesignId === HANE_WING_DESIGN_ID
      && this.wingArt.sourceMonsterId === HANE_WING_SOURCE_ID
      && this.wingArt.sourceMonsterName === HANE_WING_SOURCE_NAME
      && this.wingArt.leftView === HANE_WING_LEFT_VIEW
      && this.wingArt.rightView === HANE_WING_RIGHT_VIEW;
    if (!wingIdentityValid) {
      console.error(
        "羽根デザインの識別情報が一致しないため、誤った羽根画像の表示を停止しました。"
      );
    }
    HANE_WING_PIN_PAIRS.forEach(config => {
      const geometry = this.getHanemonoWingGeometry(config);
      const pivot = new THREE.Group();
      pivot.name = config.side < 0 ? "icp-hanemono-wing-left" : "icp-hanemono-wing-right";
      pivot.userData.wingDesignId = wingDesignId;
      pivot.userData.wingView = config.side < 0 ? this.wingArt.leftView : this.wingArt.rightView;
      pivot.position.set(geometry.lower.x, geometry.lower.y, -1.47);
      pivot.rotation.z = geometry.closedAngle;

      const spine = new THREE.Mesh(
        new THREE.BoxGeometry(0.082, HANE_WING_LENGTH, 0.1),
        wingSpineMaterial
      );
      spine.position.y = geometry.length * 0.5;
      spine.scale.y = geometry.length / HANE_WING_LENGTH;
      spine.castShadow = true;
      pivot.add(spine);

      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.1, 20),
        wingSpineMaterial
      );
      hinge.rotation.x = Math.PI / 2;
      hinge.castShadow = true;
      pivot.add(hinge);

      const artMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        alphaTest: 0.035,
        roughness: 0.72,
        side: THREE.DoubleSide
      });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.48), artMaterial);
      art.position.set(0, geometry.length * 0.5, 0.075);
      art.scale.y = geometry.length / HANE_WING_LENGTH;
      art.castShadow = true;
      pivot.add(art);
      this.scene.add(pivot);

      const body = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: this.pinMaterial
      });
      const shape = new CANNON.Box(new CANNON.Vec3(0.105, geometry.length * 0.5, 0.19));
      body.addShape(shape);
      body.position.set(geometry.center.x, geometry.center.y, BOARD_Z);
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), geometry.closedAngle);
      this.world.addBody(body);

      const wing = {
        side: config.side,
        view: config.view,
        pinNumbers: [...config.pins],
        upperPinNumber: config.pins[0],
        lowerPinNumber: config.pins[1],
        pivot,
        spine,
        art,
        artMaterial,
        body,
        shape,
        anchor: geometry.center,
        upper: geometry.upper,
        lower: geometry.lower,
        length: geometry.length,
        closedAngle: geometry.closedAngle,
        angle: geometry.closedAngle,
        designId: wingDesignId,
        sourceMonsterId: this.wingArt.sourceMonsterId || "",
        sourceMonsterName: this.wingArt.sourceMonsterName || ""
      };
      this.hanemonoWings.push(wing);

      if (!wingIdentityValid) return;
      const svg = config.side < 0 ? this.wingArt.leftSvg : this.wingArt.rightSvg;
      svgTexture(svg, this.renderer, wingFallbackItem, {
        strict: true,
        designId: wingDesignId
      }).then(texture => {
        if (this.destroyed) {
          texture.dispose();
          return;
        }
        this.textures.add(texture);
        artMaterial.map = texture;
        artMaterial.opacity = 1;
        artMaterial.needsUpdate = true;
      }).catch(error => {
        artMaterial.opacity = 0;
        artMaterial.needsUpdate = true;
        console.error("ミチメバンフワナの羽根SVGを表示できませんでした。旧デザインには戻しません。", error);
      });
    });

    this.pinSelectionMarker = new THREE.Mesh(
      new THREE.TorusGeometry(0.12, 0.018, 10, 28),
      new THREE.MeshBasicMaterial({
        color: 0x5fffe0,
        transparent: true,
        opacity: 0.96,
        depthTest: false
      })
    );
    this.pinSelectionMarker.name = "icp-pin-selection-marker";
    this.pinSelectionMarker.position.z = -1.43;
    this.pinSelectionMarker.renderOrder = 100;
    this.pinSelectionMarker.visible = false;
    this.scene.add(this.pinSelectionMarker);
    const windmillGoldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd85c,
      emissive: 0x8a4100,
      emissiveIntensity: 0.46,
      metalness: 0.88,
      roughness: 0.18,
      clearcoat: 0.72
    });
    const windmillPinkMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff4f9b,
      emissive: 0x7f103f,
      emissiveIntensity: 0.52,
      metalness: 0.38,
      roughness: 0.24,
      clearcoat: 0.78
    });
    const windmillMintMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x52e0c0,
      emissive: 0x075b50,
      emissiveIntensity: 0.5,
      metalness: 0.34,
      roughness: 0.24,
      clearcoat: 0.78
    });
    const windmillBladeGeometry = new THREE.BoxGeometry(0.2, 0.058, 0.07);
    const windmillTipGeometry = new THREE.SphereGeometry(0.05, 14, 10);
    const windmillScale = 0.94;

    const addWindmill = (key, label, initialAngle) => {
      const [x, y] = objectPosition(key);
      const visual = new THREE.Group();
      visual.name = "icp-pachinko-windmill";
      visual.position.set(x, y, -1.49);
      for (let index = 0; index < 6; index += 1) {
        const arm = new THREE.Group();
        arm.rotation.z = index * Math.PI / 3;
        const material = index % 2 === 0 ? windmillPinkMaterial : windmillMintMaterial;
        const blade = new THREE.Mesh(windmillBladeGeometry, material);
        blade.position.x = 0.126;
        blade.castShadow = true;
        arm.add(blade);
        const tip = new THREE.Mesh(windmillTipGeometry, material);
        tip.position.x = 0.23;
        tip.castShadow = true;
        arm.add(tip);
        visual.add(arm);
      }
      visual.scale.setScalar(windmillScale);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.074, 0.074, 0.09, 20),
        windmillGoldMaterial
      );
      hub.rotation.x = Math.PI / 2;
      hub.castShadow = true;
      visual.add(hub);
      visual.rotation.z = initialAngle;
      this.scene.add(visual);

      const body = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: this.pinMaterial
      });
      const bladeHalfExtents = new CANNON.Vec3(
        0.238 * windmillScale,
        0.03 * windmillScale,
        0.18
      );
      for (let index = 0; index < 3; index += 1) {
        const bladeRotation = new CANNON.Quaternion();
        bladeRotation.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), index * Math.PI / 3);
        body.addShape(new CANNON.Box(bladeHalfExtents), new CANNON.Vec3(), bladeRotation);
      }
      body.addShape(new CANNON.Sphere(0.066 * windmillScale));
      body.position.set(x, y, BOARD_Z);
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), initialAngle);
      this.world.addBody(body);
      const windmill = {
        visual,
        body,
        x,
        y,
        angle: initialAngle,
        angularVelocity: 0,
        contacts: new Set()
      };
      this.pachinkoWindmills.push(windmill);
      const editableRecord = {
        key,
        label,
        kind: "windmill",
        visual,
        body,
        hitRadius: 0.34 * windmillScale,
        markerScale: 2.75,
        syncPosition: (nextX, nextY) => {
          windmill.x = nextX;
          windmill.y = nextY;
          visual.position.x = nextX;
          visual.position.y = nextY;
          body.position.x = nextX;
          body.position.y = nextY;
        }
      };
      visual.userData.icpEditableObject = editableRecord;
      this.editableObjects.push(editableRecord);
    };

    addWindmill("windmill-left", "左風車", Math.PI / 12);
    addWindmill("windmill-right", "右風車", -Math.PI / 12);

    const mouthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x061319,
      emissive: 0x32d7bb,
      emissiveIntensity: 0.5,
      metalness: 0.4,
      roughness: 0.22
    });
    const seesawLength = 0.29;
    const sideSeesawLength = 0.27;
    const addSeesaw = ({
      key,
      label,
      name,
      routeSide = 0,
      motionDirection = 1,
      length = seesawLength
    }) => {
      const [seesawCenterX, seesawCenterY] = objectPosition(key);
      const seesaw = new THREE.Group();
      seesaw.name = name;
      seesaw.position.set(seesawCenterX, seesawCenterY, -1.53);
      [-0.052, 0.052].forEach(offset => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(length, 0.03, 0.12),
          railMaterial
        );
        rail.position.y = offset;
        rail.castShadow = true;
        seesaw.add(rail);
      });
      const pivotGeometry = new THREE.CylinderGeometry(0.052, 0.052, 0.09, 20);
      pivotGeometry.rotateX(Math.PI / 2);
      const pivot = new THREE.Mesh(pivotGeometry, pinMaterial);
      pivot.position.z = 0.035;
      pivot.castShadow = true;
      seesaw.add(pivot);
      this.scene.add(seesaw);

      const seesawBody = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: this.railMaterial
      });
      const seesawHalfExtents = new CANNON.Vec3(
        length / 2,
        SEESAW_COLLIDER_HALF_THICKNESS,
        0.18
      );
      seesawBody.addShape(new CANNON.Box(seesawHalfExtents), new CANNON.Vec3(0, -0.052, 0));
      seesawBody.addShape(new CANNON.Box(seesawHalfExtents), new CANNON.Vec3(0, 0.052, 0));
      seesawBody.position.set(seesawCenterX, seesawCenterY, BOARD_Z);
      this.world.addBody(seesawBody);
      const seesawRecord = {
        side: routeSide,
        motionDirection,
        visual: seesaw,
        body: seesawBody,
        centerX: seesawCenterX,
        centerY: seesawCenterY,
        halfLength: length / 2,
        halfHeight: 0.052 + SEESAW_COLLIDER_HALF_THICKNESS,
        angle: 0
      };
      this.entrySeesaws.push(seesawRecord);
      const editableRecord = {
        key,
        label,
        kind: "seesaw",
        visual: seesaw,
        body: seesawBody,
        hitRadius: 0.27,
        markerScale: 1.85,
        syncPosition: (nextX, nextY) => {
          seesawRecord.centerX = nextX;
          seesawRecord.centerY = nextY;
          seesaw.position.x = nextX;
          seesaw.position.y = nextY;
          seesawBody.position.x = nextX;
          seesawBody.position.y = nextY;
        }
      };
      seesaw.userData.icpEditableObject = editableRecord;
      this.editableObjects.push(editableRecord);
    };

    [
      { side: -1, x: LEFT_ENTRY_X },
      { side: 1, x: RIGHT_ENTRY_X }
    ].forEach(({ side, x }) => {
      const outerX = side * 0.88;
      const lowerEntryPinX = side < 0 ? -0.97 : 1.0;
      const lowerEntryPinY = ENTRY_Y - 0.07;
      const guideInnerX = x + side * 0.04;
      const guideCenterInnerY = ENTRY_Y - ENTRY_MOUTH_INNER_DROP;
      const guideCenterOuterY = ENTRY_Y + 0.05;
      const guideAngle = Math.atan2(
        guideCenterOuterY - guideCenterInnerY,
        outerX - guideInnerX
      );
      const entryMouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.07), mouthMaterial);
      entryMouth.name = side < 0 ? "icp-entry-mouth-left" : "icp-entry-mouth-right";
      entryMouth.position.set(x, guideCenterInnerY, -1.54);
      entryMouth.rotation.z = side < 0 ? guideAngle - Math.PI : guideAngle;
      this.scene.add(entryMouth);

      addRail(
        [x + side * 0.04, ENTRY_Y + 0.12 - ENTRY_MOUTH_INNER_DROP],
        [outerX, ENTRY_Y + 0.18],
        0.034,
        railMaterial,
        "icp-entry-guide"
      );
      addRail(
        [x + side * 0.04, ENTRY_Y - 0.12 - ENTRY_MOUTH_INNER_DROP],
        [lowerEntryPinX, lowerEntryPinY],
        0.034,
        railMaterial,
        "icp-entry-guide"
      );
      addPin(side * ENTRY_UPPER_PIN_ABS_X, ENTRY_Y + 0.19);
      addPin(lowerEntryPinX, lowerEntryPinY);

      addSeesaw({
        key: side < 0 ? "seesaw-left" : "seesaw-right",
        label: side < 0 ? "左シーソー" : "右シーソー",
        name: side < 0 ? "icp-entry-seesaw-left" : "icp-entry-seesaw-right",
        routeSide: side,
        motionDirection: side,
        length: sideSeesawLength
      });
    });
    addSeesaw({
      key: "seesaw-upper",
      label: "上シーソー",
      name: "icp-entry-seesaw-upper",
      motionDirection: 1
    });

    const entryPlasticMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xdff9ff,
      emissive: 0x2f8094,
      emissiveIntensity: 0.2,
      metalness: 0.02,
      roughness: 0.08,
      transparent: true,
      opacity: 0.62,
      transmission: 0.38,
      thickness: 0.08,
      ior: 1.46,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      side: THREE.DoubleSide
    });
    const entryPlasticGeometry = new THREE.BoxGeometry(1, 0.105, 0.075);
    ENTRY_PLASTIC_GUIDES.forEach(config => {
      const visual = new THREE.Mesh(entryPlasticGeometry, entryPlasticMaterial);
      visual.name = config.entrySide < 0
        ? "icp-entry-plastic-guide-left"
        : "icp-entry-plastic-guide-right";
      visual.castShadow = true;
      visual.receiveShadow = true;
      this.scene.add(visual);

      const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.0525, 0.18));
      const body = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: this.railMaterial
      });
      body.addShape(shape);
      this.world.addBody(body);

      this.entryPlasticGuides.push({
        pinNumber: config.pinNumber,
        anchorPin: activeEntryPlasticGuidePinNumbers.has(config.pinNumber)
          ? this.editablePins[config.pinNumber - 1] ?? null
          : null,
        entryX: config.entrySide * ENTRY_UPPER_PIN_ABS_X,
        entryY: ENTRY_Y + 0.19,
        visual,
        body,
        shape,
        lastX: Number.NaN,
        lastY: Number.NaN,
        lastLength: Number.NaN,
        lastAngle: Number.NaN
      });
    });
    PIN_PAIR_PLASTIC_GUIDES.forEach(config => {
      const visual = new THREE.Mesh(entryPlasticGeometry, entryPlasticMaterial);
      visual.name = config.side < 0
        ? "icp-pin-pair-plastic-guide-left"
        : "icp-pin-pair-plastic-guide-right";
      visual.castShadow = true;
      visual.receiveShadow = true;
      this.scene.add(visual);

      const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.0525, 0.18));
      const body = new CANNON.Body({
        mass: 0,
        type: CANNON.Body.KINEMATIC,
        material: this.railMaterial
      });
      body.addShape(shape);
      this.world.addBody(body);

      this.entryPlasticGuides.push({
        startPinNumber: config.startPinNumber,
        endPinNumber: config.endPinNumber,
        visual,
        body,
        shape,
        lastX: Number.NaN,
        lastY: Number.NaN,
        lastLength: Number.NaN,
        lastAngle: Number.NaN
      });
    });
    this.updateEntryPlasticGuides(true);
    this.updatePinLayoutOutput();
    this.updatePinEditorUi();

    const roleBackMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2c8190,
      emissive: 0x082d36,
      emissiveIntensity: 0.36,
      metalness: 0.35,
      roughness: 0.28,
      clearcoat: 0.62
    });
    const roleBack = new THREE.Mesh(new THREE.BoxGeometry(1.92, 1.62, 0.12), roleBackMaterial);
    roleBack.name = "icp-role-housing";
    roleBack.position.set(0, 2.88 + ROLE_VERTICAL_SHIFT, -1.69);
    roleBack.receiveShadow = true;
    this.scene.add(roleBack);

    [2, 3, 4, 5].forEach((count, row) => {
      const spacing = 0.31;
      const y = 3.4 + ROLE_VERTICAL_SHIFT - row * 0.23;
      for (let column = 0; column < count; column += 1) {
        const x = (column - (count - 1) / 2) * spacing;
        addPin(x, y, true);
      }
    });

    const separatorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd968,
      emissive: 0x7c3c00,
      emissiveIntensity: 0.5,
      metalness: 0.84,
      roughness: 0.19
    });
    [-0.84, -0.28, 0.28, 0.84].forEach(x => {
      addRail([x, 2.1 + ROLE_VERTICAL_SHIFT], [x, 2.5 + ROLE_VERTICAL_SHIFT], 0.052, separatorMaterial, "icp-role-separator");
    });
    const roleBottomGuideY = 2.1 + ROLE_VERTICAL_SHIFT;
    addRail(
      [-0.84, roleBottomGuideY],
      [0.84, roleBottomGuideY],
      0.06,
      entryPlasticMaterial,
      "icp-role-bottom-plastic-guide"
    );
    const roleOuterSeparatorTopY = 2.5 + ROLE_VERTICAL_SHIFT;
    [-1, 1].forEach(side => {
      addRail(
        [side * 0.84, roleOuterSeparatorTopY],
        [side * 0.91, ENTRY_Y - 0.09],
        0.06,
        entryPlasticMaterial,
        side < 0
          ? "icp-role-side-plastic-guide-left"
          : "icp-role-side-plastic-guide-right"
      );
    });

    const outPocketMaterial = new THREE.MeshBasicMaterial({
      color: 0x58cfe0,
      transparent: true,
      opacity: 0.52
    });
    const startChuckerFrameMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff547c,
      emissive: 0x941d42,
      emissiveIntensity: 0.72,
      metalness: 0.58,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.98
    });
    const startChuckerDepthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x02090d,
      emissive: 0x001820,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 0.72
    });
    this.slotLights = [];
    [-0.56, 0, 0.56].forEach((x, index) => {
      if (index === 1) {
        const startChucker = new THREE.Group();
        startChucker.name = "icp-role-red-start-chucker";
        startChucker.position.set(x, ROLE_SLOT_Y + 0.005, -1.54);

        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.44, 0.26, 0.11),
          startChuckerFrameMaterial
        );
        frame.name = "icp-role-red-start-chucker-frame";
        frame.castShadow = true;
        frame.receiveShadow = true;
        startChucker.add(frame);

        const mouth = new THREE.Mesh(
          new THREE.BoxGeometry(0.27, 0.13, 0.065),
          startChuckerDepthMaterial
        );
        mouth.name = "icp-role-red-start-chucker-mouth";
        mouth.position.z = 0.082;
        mouth.castShadow = true;
        startChucker.add(mouth);

        const indicator = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 14, 10),
          separatorMaterial
        );
        indicator.name = "icp-role-red-start-chucker-indicator";
        indicator.position.set(0, 0.17, 0.065);
        indicator.castShadow = true;
        startChucker.add(indicator);

        this.scene.add(startChucker);
        this.slotLights.push(frame);
        return;
      }

      const hole = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 32),
        new THREE.MeshBasicMaterial({ color: 0x02090d })
      );
      hole.name = "icp-role-out-pocket-depth";
      hole.scale.set(1.28, 0.66, 1);
      hole.position.set(x, ROLE_SLOT_Y - 0.015, -1.545);
      this.scene.add(hole);

      const pad = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.222, 32),
        outPocketMaterial.clone()
      );
      pad.name = "icp-role-out-pocket";
      pad.scale.set(1.28, 0.66, 1);
      pad.position.set(x, ROLE_SLOT_Y - 0.015, -1.535);
      this.scene.add(pad);
      this.slotLights.push(pad);
    });

    this.launcherVisual = new THREE.Mesh(
      createCoinGeometry(PACHINKO_COIN_RADIUS, PACHINKO_COIN_THICKNESS),
      [this.coinFaceMaterial, this.coinEdgeMaterial]
    );
    this.launcherVisual.rotation.set(-Math.PI / 2, 0, 0);
    this.launcherVisual.position.set(PACHINKO_LAUNCH_X, PACHINKO_LAUNCH_Y, -1.54);
    this.scene.add(this.launcherVisual);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(5.02, 4.28),
      new THREE.MeshPhysicalMaterial({
        color: 0xf7feff,
        transparent: true,
        opacity: 0.055,
        metalness: 0,
        roughness: 0.025,
        clearcoat: 1,
        clearcoatRoughness: 0.018,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    glass.name = "icp-clear-glass";
    glass.position.set(0, 3.55, -1.36);
    glass.renderOrder = 8;
    this.scene.add(glass);
  }

  createInitialCoins() {
    const rows = 10;
    const columns = 12;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column - (columns - 1) / 2) * 0.38 + (row % 2 ? 0.095 : -0.095);
        const z = INITIAL_COIN_REAR_Z + row * 0.27;
        if (Math.abs(x) > 2.32) continue;
        this.spawnTableCoin(x, z, {
          y: TABLE_TOP_Y + TABLE_COIN_COLLIDER_THICKNESS / 2 + INITIAL_COIN_CLEARANCE,
          tiltX: 0,
          tiltZ: 0,
          initial: true,
          value: 1
        });
      }
    }
  }

  createCompanionMarquee() {
    if (!this.roster.length) return;
    const entries = [
      { item: this.roster[0], x: -3.23, color: 0x53edc4 },
      { item: this.roster[1] || this.roster[0], x: 3.23, color: 0xff5ca3 }
    ];
    entries.forEach(entry => {
      const frameMaterial = new THREE.MeshPhysicalMaterial({
        color: entry.color,
        emissive: entry.color,
        emissiveIntensity: 0.75,
        metalness: 0.35,
        roughness: 0.28
      });
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.45, 0.12), frameMaterial);
      frame.position.set(entry.x, 3.75, -2.66);
      this.scene.add(frame);
      const artMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, alphaTest: 0.04, roughness: 0.75 });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 1.27), artMaterial);
      art.position.set(entry.x, 3.75, -2.58);
      this.scene.add(art);
      svgTexture(entry.item.frontSvg, this.renderer, entry.item).then(texture => {
        if (this.destroyed) {
          texture.dispose();
          return;
        }
        this.textures.add(texture);
        artMaterial.map = texture;
        artMaterial.needsUpdate = true;
      });
    });
  }

  spawnTableCoin(x, z, options = {}) {
    if (this.tableCoins.length >= MAX_TABLE_COINS) this.removeOldestLostCoin();
    const radius = options.radius || TABLE_COIN_RADIUS;
    const thickness = TABLE_COIN_COLLIDER_THICKNESS;
    const body = new CANNON.Body({
      mass: 0.04,
      material: this.coinMaterial,
      linearDamping: 0.16,
      angularDamping: 0.28,
      allowSleep: true,
      sleepSpeedLimit: 0.08,
      sleepTimeLimit: 0.8
    });
    body.addShape(new CANNON.Cylinder(radius, radius, thickness, 16));
    body.position.set(
      clamp(x, -2.3, 2.3),
      options.y ?? TABLE_TOP_Y + 0.42,
      z
    );
    body.quaternion.setFromEuler(
      options.tiltX ?? (this.random() - 0.5) * 0.08,
      this.random() * Math.PI,
      options.tiltZ ?? (this.random() - 0.5) * 0.08
    );
    body.velocity.set(options.vx || 0, options.vy || 0, options.vz || 0);
    this.world.addBody(body);

    const visual = new THREE.Mesh(this.coinGeometry, [this.coinFaceMaterial, this.coinEdgeMaterial]);
    visual.castShadow = true;
    visual.receiveShadow = true;
    visual.position.copy(body.position);
    visual.quaternion.copy(body.quaternion);
    this.scene.add(visual);
    const coin = {
      body,
      visual,
      value: options.value || 1,
      age: 0,
      initial: Boolean(options.initial),
      collected: false
    };
    this.tableCoins.push(coin);
    return coin;
  }

  getNextLaunchStroke() {
    const centerStroke = Number.isFinite(this.lastLaunchStroke)
      ? this.lastLaunchStroke
      : this.stroke;
    const randomValue = Number(this.random());
    const variationIndex = clamp(
      Math.floor((Number.isFinite(randomValue) ? randomValue : 0.5) * 5),
      0,
      4
    );
    const launchStroke = clamp(
      (Math.round(centerStroke * 100) + variationIndex - 2) / 100,
      STROKE_MIN,
      STROKE_MAX
    );
    this.lastLaunchStroke = launchStroke;
    return launchStroke;
  }

  spawnPachinkoToken() {
    const launchStroke = this.getNextLaunchStroke();
    const strokeRatio = clamp(
      (launchStroke - STROKE_MIN) / (STROKE_MAX - STROKE_MIN),
      0,
      1
    );
    const power = lerp(MIN_LAUNCH_SPEED, MAX_LAUNCH_SPEED, strokeRatio);
    const body = new CANNON.Body({
      mass: PACHINKO_TOKEN_MASS,
      material: this.tokenMaterial,
      linearDamping: PACHINKO_TOKEN_LINEAR_DAMPING,
      angularDamping: 0.04,
      allowSleep: false
    });
    body.addShape(new CANNON.Sphere(PACHINKO_TOKEN_COLLIDER_RADIUS));
    body.position.set(PACHINKO_LAUNCH_X, PACHINKO_LAUNCH_Y, BOARD_Z);
    body.velocity.set(0.045 + launchStroke * 0.035, power, 0);
    body.angularVelocity.set(0, 0, 0);
    this.world.addBody(body);

    const visual = new THREE.Mesh(
      createCoinGeometry(PACHINKO_COIN_RADIUS, PACHINKO_COIN_THICKNESS),
      [this.coinFaceMaterial, this.coinEdgeMaterial]
    );
    visual.rotation.set(-Math.PI / 2, 0, 0);
    visual.castShadow = true;
    this.scene.add(visual);
    this.pachinkoTokens.push({
      body,
      visual,
      launchStroke,
      phase: "board",
      previousX: body.position.x,
      previousY: body.position.y,
      previousGateAngle: normalizeAngle(Math.atan2(body.position.y - PACHINKO_FIELD_CENTER_Y, body.position.x)),
      clearedBallReturn: false,
      entrySide: 0,
      entryAuthorized: false,
      entrySource: ""
    });
    this.cameraShake = Math.max(this.cameraShake, 0.012);
  }

  launchCoin() {
    if (this.gameOver || this.launchCooldown > 0) return false;
    if (this.credits <= 0) {
      this.showCallout("もちコインがありません", 1.3, "warning");
      this.autoEnabled = false;
      this.refreshHud();
      return false;
    }
    this.credits -= 1;
    this.zeroCreditTimer = 0;
    this.launchCooldown = 0.12;
    this.spawnPachinkoToken();
    this.refreshHud();
    return true;
  }

  onStrokeInput(event) {
    const value = clamp(Number(event.currentTarget.value) || 58, 20, 100);
    this.stroke = value / 100;
    this.lastLaunchStroke = null;
    this.els.strokeValue.textContent = String(Math.round(value));
    this.launcherVisual.position.y = PACHINKO_LAUNCH_Y + (this.stroke - 0.58) * 0.08;
  }

  normalizePinLayout(value) {
    const pins = Array.isArray(value) ? value : value?.pins;
    if (!Array.isArray(pins) || pins.length > PIN_EDITOR_MAX_PINS) return null;
    const normalized = [];
    for (const pin of pins) {
      if (!Array.isArray(pin) || pin.length < 2) return null;
      const x = Number(pin[0]);
      const y = Number(pin[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      normalized.push([
        Math.round(clamp(x, PIN_EDITOR_MIN_X, PIN_EDITOR_MAX_X) * 1000) / 1000,
        Math.round(clamp(y, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000) / 1000
      ]);
    }
    return normalized;
  }

  normalizeObjectLayout(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const normalized = {};
    EDITABLE_BOARD_OBJECT_KEYS.forEach(key => {
      const point = value[key];
      if (!Array.isArray(point) || point.length < 2) return;
      const x = Number(point[0]);
      const y = Number(point[1]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      normalized[key] = [
        Math.round(clamp(x, PIN_EDITOR_MIN_X, PIN_EDITOR_MAX_X) * 1000) / 1000,
        Math.round(clamp(y, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000) / 1000
      ];
    });
    return Object.keys(normalized).length ? normalized : null;
  }

  isFixedHakamaPinPosition(x, y) {
    const absoluteX = Math.abs(x);
    return absoluteX >= 1.05 && absoluteX <= 1.99 && y >= 2 && y <= 3.62;
  }

  migratePinLayout(value) {
    const version = Math.max(1, Number(value?.version) || 1);
    let pins = this.normalizePinLayout(value);
    if (pins === null) return null;
    let objects = this.normalizeObjectLayout(value?.objects);
    const highestLegacyGuidePin = Math.max(...ENTRY_PLASTIC_GUIDES.map(config => config.pinNumber));
    let entryPlasticGuidePins = Array.isArray(value?.entryPlasticGuidePins)
      ? value.entryPlasticGuidePins
        .map(Number)
        .filter(pinNumber => ENTRY_PLASTIC_GUIDES.some(config => config.pinNumber === pinNumber))
      : pins.length >= highestLegacyGuidePin
        ? ENTRY_PLASTIC_GUIDES.map(config => config.pinNumber)
        : [];
    if (version < 7 && pins.length >= highestLegacyGuidePin) {
      entryPlasticGuidePins = ENTRY_PLASTIC_GUIDES.map(config => config.pinNumber);
    }

    if (version < 3) {
      pins = pins.map(([x, y]) => [
        x,
        Math.round(clamp(y + FIXED_HAKAMA_Y_OFFSET, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000) / 1000
      ]);
      if (objects) {
        Object.keys(objects).forEach(key => {
          objects[key][1] = Math.round(
            clamp(objects[key][1] + FIXED_HAKAMA_Y_OFFSET, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000
          ) / 1000;
        });
      }
    }

    if (version < 2) {
      pins = [...pins, ...this.hakamaPinLayout.map(([x, y]) => [x, y])];
    }

    if (version < 4) {
      pins = pins.map(([x, y]) => [
        x,
        this.isFixedHakamaPinPosition(x, y)
          ? y
          : Math.round(
            clamp(y + BOARD_COMPONENT_Y_MIGRATION_STEP, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000
          ) / 1000
      ]);
      if (objects) {
        Object.keys(objects).forEach(key => {
          objects[key][1] = Math.round(
            clamp(objects[key][1] + BOARD_COMPONENT_Y_MIGRATION_STEP, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000
          ) / 1000;
        });
      }
    }

    return {
      version: PIN_LAYOUT_VERSION,
      pins,
      entryPlasticGuidePins,
      objects: objects ?? Object.fromEntries(
        Object.entries(this.defaultObjectLayout).map(([key, point]) => [key, [...point]])
      )
    };
  }

  loadPinLayout() {
    try {
      const checkpointSource = window.localStorage.getItem(PIN_LAYOUT_CHECKPOINT_STORAGE_KEY);
      let checkpointLayout = null;
      if (checkpointSource !== null) {
        checkpointLayout = this.migratePinLayout(JSON.parse(checkpointSource));
        if (checkpointLayout) {
          window.localStorage.setItem(PIN_LAYOUT_CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpointLayout));
        }
      }
      this.pinLayoutCheckpointAvailable = checkpointLayout !== null;
      const source = window.localStorage.getItem(PIN_LAYOUT_STORAGE_KEY);
      if (source === null) return null;
      const layout = this.migratePinLayout(JSON.parse(source));
      if (layout === null) return null;
      const canonicalSource = JSON.stringify(layout);
      window.localStorage.setItem(PIN_LAYOUT_STORAGE_KEY, canonicalSource);
      if (!this.pinLayoutCheckpointAvailable) {
        window.localStorage.setItem(PIN_LAYOUT_CHECKPOINT_STORAGE_KEY, canonicalSource);
        this.pinLayoutCheckpointAvailable = true;
      }
      this.loadedPinLayoutVersion = PIN_LAYOUT_VERSION;
      this.loadedObjectLayout = layout.objects;
      this.loadedEntryPlasticGuidePinNumbers = layout.entryPlasticGuidePins;
      return layout.pins;
    } catch {
      return null;
    }
  }

  getPinLayoutData() {
    return this.editablePins.map(record => [
      Math.round(record.visual.position.x * 1000) / 1000,
      Math.round(record.visual.position.y * 1000) / 1000
    ]);
  }

  getBoardObjectLayoutData() {
    const data = {};
    this.editableObjects.forEach(record => {
      if (!record.key) return;
      data[record.key] = [
        Math.round(record.visual.position.x * 1000) / 1000,
        Math.round(record.visual.position.y * 1000) / 1000
      ];
    });
    return data;
  }

  getEntryPlasticGuidePinNumbers() {
    return this.entryPlasticGuides
      .filter(guide => guide.anchorPin && this.editablePins.includes(guide.anchorPin))
      .map(guide => guide.pinNumber);
  }

  applyEntryPlasticGuidePinNumbers(pinNumbers) {
    const enabledPinNumbers = new Set(Array.isArray(pinNumbers) ? pinNumbers : []);
    this.entryPlasticGuides.forEach(guide => {
      guide.anchorPin = enabledPinNumbers.has(guide.pinNumber)
        ? this.editablePins[guide.pinNumber - 1] ?? null
        : null;
      guide.lastX = Number.NaN;
      guide.lastY = Number.NaN;
      guide.lastLength = Number.NaN;
      guide.lastAngle = Number.NaN;
    });
    this.updateEntryPlasticGuides(true);
  }

  updatePinLayoutOutput() {
    if (!this.els?.layoutOutput) return;
    this.els.layoutOutput.value = JSON.stringify({
      version: PIN_LAYOUT_VERSION,
      pins: this.getPinLayoutData(),
      entryPlasticGuidePins: this.getEntryPlasticGuidePinNumbers(),
      objects: this.getBoardObjectLayoutData()
    }, null, 2);
  }

  updatePinEditorUi() {
    if (!this.els?.editorSelection) return;
    const selectedPinIndex = this.selectedEditablePin?.kind === "pin"
      ? this.editablePins.indexOf(this.selectedEditablePin)
      : -1;
    const hasSelection = Boolean(this.selectedEditablePin);
    if (hasSelection) {
      const { x, y } = this.selectedEditablePin.visual.position;
      this.els.editorSelection.textContent = selectedPinIndex >= 0
        ? `釘 ${selectedPinIndex + 1} / ${this.editablePins.length}`
        : this.selectedEditablePin.label;
      this.els.pinX.value = x.toFixed(3);
      this.els.pinY.value = y.toFixed(3);
    } else {
      this.els.editorSelection.textContent = this.editablePins.length
        ? `釘を選択してください（全${this.editablePins.length}本）`
        : "配置する釘がありません";
      this.els.pinX.value = "";
      this.els.pinY.value = "";
    }
    this.els.pinX.disabled = !hasSelection;
    this.els.pinY.disabled = !hasSelection;
    this.els.editorBody.querySelectorAll('[data-icp-editor-action="move"], [data-icp-editor-action="apply"]')
      .forEach(button => { button.disabled = !hasSelection; });
    const deleteButton = this.els.editorBody.querySelector('[data-icp-editor-action="delete"]');
    if (deleteButton) deleteButton.disabled = selectedPinIndex < 0;
    const restoreButton = this.els.editorBody.querySelector('[data-icp-editor-action="restore-saved"]');
    if (restoreButton) restoreButton.disabled = !this.pinLayoutCheckpointAvailable;
    this.els.editorBody.querySelectorAll("[data-icp-editor-select-object]").forEach(button => {
      button.classList.toggle("is-selected", button.dataset.icpEditorSelectObject === this.selectedEditablePin?.key);
    });
    this.els.editorBody.querySelectorAll("[data-icp-camera-mode]").forEach(button => {
      const selected = button.dataset.icpCameraMode === this.cameraMode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (this.pinLayoutDirty) this.els.editorSaveState.textContent = "未保存";
    else this.els.editorSaveState.textContent = this.pinLayoutLoadedFromStorage ? "保存済み" : "初期配置";
  }

  selectEditablePin(record) {
    const validRecord = this.editablePins.includes(record) || this.editableObjects.includes(record);
    this.selectedEditablePin = validRecord ? record : null;
    if (this.pinSelectionMarker) {
      this.pinSelectionMarker.visible = Boolean(this.selectedEditablePin && this.layoutEditing);
      if (this.selectedEditablePin) {
        this.pinSelectionMarker.position.x = this.selectedEditablePin.visual.position.x;
        this.pinSelectionMarker.position.y = this.selectedEditablePin.visual.position.y;
        this.pinSelectionMarker.scale.setScalar(this.selectedEditablePin.markerScale || 1);
      }
    }
    this.updatePinEditorUi();
  }

  moveEditablePin(record, x, y, markDirty = true) {
    if (!record || (!this.editablePins.includes(record) && !this.editableObjects.includes(record))) return;
    const nextX = Math.round(clamp(Number(x), PIN_EDITOR_MIN_X, PIN_EDITOR_MAX_X) * 1000) / 1000;
    const nextY = Math.round(clamp(Number(y), PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y) * 1000) / 1000;
    if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;
    if (record.syncPosition) record.syncPosition(nextX, nextY);
    else {
      record.visual.position.x = nextX;
      record.visual.position.y = nextY;
      record.body.position.x = nextX;
      record.body.position.y = nextY;
    }
    record.body.velocity.set(0, 0, 0);
    record.body.angularVelocity.set(0, 0, 0);
    record.body.aabbNeedsUpdate = true;
    if (this.world?.broadphase) this.world.broadphase.dirty = true;
    if (markDirty) {
      this.pinLayoutDirty = true;
      this.updatePinLayoutOutput();
      this.schedulePinLayoutSave();
    }
    this.selectEditablePin(record);
  }

  removeEditablePin(record, silent = false) {
    const index = this.editablePins.indexOf(record);
    if (index < 0) return;
    this.editablePins.splice(index, 1);
    const boardIndex = this.boardPins.indexOf(record.visual);
    if (boardIndex >= 0) this.boardPins.splice(boardIndex, 1);
    record.visual.userData.icpEditablePin = null;
    this.scene.remove(record.visual);
    this.world.removeBody(record.body);
    if (!silent) {
      this.pinLayoutDirty = true;
      this.selectEditablePin(this.editablePins[Math.min(index, this.editablePins.length - 1)] ?? null);
      this.updatePinLayoutOutput();
      this.schedulePinLayoutSave();
    }
  }

  replaceEditablePinLayout(layout, markDirty = true) {
    this.editablePins.slice().forEach(record => this.removeEditablePin(record, true));
    layout.forEach(([x, y]) => this.createEditableBoardPin(x, y));
    this.pinLayoutDirty = markDirty;
    this.selectEditablePin(this.editablePins[0] ?? null);
    this.updatePinLayoutOutput();
    this.updatePinEditorUi();
    if (markDirty) this.schedulePinLayoutSave();
  }

  pointerPointOnPinPlane(event) {
    const rect = this.els.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pinPointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.pinRaycaster.setFromCamera(this.pinPointer, this.camera);
    return this.pinRaycaster.ray.intersectPlane(this.pinDragPlane, this.pinDragPoint)
      ? this.pinDragPoint
      : null;
  }

  pinAtPointer(event) {
    const point = this.pointerPointOnPinPlane(event);
    if (!point) return null;
    let closest = null;
    let closestScore = Infinity;
    [...this.editableObjects, ...this.editablePins].forEach(record => {
      const distance = Math.hypot(
        record.visual.position.x - point.x,
        record.visual.position.y - point.y
      );
      const score = distance / (record.hitRadius || 0.24);
      if (score > 1 || score >= closestScore) return;
      closest = record;
      closestScore = score;
    });
    return closest;
  }

  onCanvasPointerDown(event) {
    if (!this.layoutEditing) return;
    const record = this.pinAtPointer(event);
    if (!record) return;
    event.preventDefault();
    this.selectEditablePin(record);
    this.draggingPin = true;
    this.dragPointerId = event.pointerId;
    this.els.canvas.setPointerCapture?.(event.pointerId);
  }

  onCanvasPointerMove(event) {
    if (!this.layoutEditing || !this.draggingPin || event.pointerId !== this.dragPointerId) return;
    const point = this.pointerPointOnPinPlane(event);
    if (!point) return;
    event.preventDefault();
    this.moveEditablePin(this.selectedEditablePin, point.x, point.y);
  }

  onCanvasPointerUp(event) {
    if (event.pointerId !== this.dragPointerId) return;
    this.draggingPin = false;
    this.dragPointerId = null;
    if (this.els.canvas.hasPointerCapture?.(event.pointerId)) {
      this.els.canvas.releasePointerCapture(event.pointerId);
    }
    this.flushPinLayoutSave();
  }

  onLayoutEditorToggle() {
    this.layoutEditing = Boolean(this.els.layoutEditor.open);
    this.root.classList.toggle("is-layout-editing", this.layoutEditing);
    if (this.layoutEditing) {
      this.autoEnabled = false;
      this.setCameraMode("front");
      if (!this.selectedEditablePin) this.selectEditablePin(this.editablePins[0] ?? null);
      else this.selectEditablePin(this.selectedEditablePin);
    } else {
      this.flushPinLayoutSave();
      this.setCameraMode("normal");
      this.draggingPin = false;
      this.dragPointerId = null;
      if (this.pinSelectionMarker) this.pinSelectionMarker.visible = false;
    }
    this.refreshHud();
  }

  applyBoardObjectLayout(layout, markDirty = true) {
    if (!layout) return;
    const previousSelection = this.selectedEditablePin;
    this.editableObjects.forEach(record => {
      const point = layout[record.key] ?? this.defaultObjectLayout?.[record.key];
      if (!point) return;
      this.moveEditablePin(record, point[0], point[1], false);
    });
    this.pinLayoutDirty = markDirty;
    if (previousSelection && (this.editablePins.includes(previousSelection) || this.editableObjects.includes(previousSelection))) {
      this.selectEditablePin(previousSelection);
    } else {
      this.selectEditablePin(this.editablePins[0] ?? this.editableObjects[0] ?? null);
    }
    this.updatePinLayoutOutput();
    this.updatePinEditorUi();
    if (markDirty) this.schedulePinLayoutSave();
  }

  schedulePinLayoutSave() {
    if (!this.pinLayoutDirty) return;
    clearTimeout(this.pinLayoutSaveTimer);
    this.pinLayoutSaveTimer = window.setTimeout(() => {
      this.pinLayoutSaveTimer = 0;
      this.savePinLayout();
    }, 180);
  }

  flushPinLayoutSave() {
    clearTimeout(this.pinLayoutSaveTimer);
    this.pinLayoutSaveTimer = 0;
    if (this.pinLayoutDirty) this.savePinLayout();
  }

  savePinLayout(createCheckpoint = false) {
    clearTimeout(this.pinLayoutSaveTimer);
    this.pinLayoutSaveTimer = 0;
    try {
      const source = JSON.stringify({
        version: PIN_LAYOUT_VERSION,
        pins: this.getPinLayoutData(),
        entryPlasticGuidePins: this.getEntryPlasticGuidePinNumbers(),
        objects: this.getBoardObjectLayoutData()
      });
      window.localStorage.setItem(PIN_LAYOUT_STORAGE_KEY, source);
      if (createCheckpoint) {
        window.localStorage.setItem(PIN_LAYOUT_CHECKPOINT_STORAGE_KEY, source);
        this.pinLayoutCheckpointAvailable = true;
      }
      this.pinLayoutDirty = false;
      this.pinLayoutLoadedFromStorage = true;
      this.updatePinEditorUi();
      if (createCheckpoint) this.els.editorSaveState.textContent = "保存地点を更新しました";
    } catch {
      this.els.editorSaveState.textContent = "保存できませんでした";
    }
  }

  restoreSavedPinLayout() {
    clearTimeout(this.pinLayoutSaveTimer);
    this.pinLayoutSaveTimer = 0;
    try {
      const source = window.localStorage.getItem(PIN_LAYOUT_CHECKPOINT_STORAGE_KEY);
      if (source === null) {
        this.pinLayoutCheckpointAvailable = false;
        this.updatePinEditorUi();
        this.els.editorSaveState.textContent = "保存した配置がありません";
        return;
      }
      const layout = this.migratePinLayout(JSON.parse(source));
      if (layout === null) throw new Error("Invalid saved pin layout");
      const canonicalSource = JSON.stringify(layout);
      this.replaceEditablePinLayout(layout.pins, false);
      this.applyEntryPlasticGuidePinNumbers(layout.entryPlasticGuidePins);
      this.applyBoardObjectLayout(layout.objects, false);
      window.localStorage.setItem(PIN_LAYOUT_STORAGE_KEY, canonicalSource);
      window.localStorage.setItem(PIN_LAYOUT_CHECKPOINT_STORAGE_KEY, canonicalSource);
      this.pinLayoutDirty = false;
      this.pinLayoutLoadedFromStorage = true;
      this.pinLayoutCheckpointAvailable = true;
      this.updatePinEditorUi();
      this.els.editorSaveState.textContent = "保存した配置へ戻しました";
    } catch {
      this.els.editorSaveState.textContent = "保存した配置を読み込めませんでした";
    }
  }

  resetPinLayout() {
    clearTimeout(this.pinLayoutSaveTimer);
    this.pinLayoutSaveTimer = 0;
    this.replaceEditablePinLayout(this.defaultPinLayout, false);
    this.applyEntryPlasticGuidePinNumbers(ENTRY_PLASTIC_GUIDES.map(config => config.pinNumber));
    this.applyBoardObjectLayout(this.defaultObjectLayout, false);
    this.pinLayoutDirty = true;
    this.savePinLayout();
    this.els.editorSaveState.textContent = this.pinLayoutCheckpointAvailable
      ? "初期配置に戻しました（保存地点は保持）"
      : "初期配置に戻しました";
  }

  async copyPinLayoutData() {
    const value = this.els.layoutOutput.value;
    try {
      await navigator.clipboard.writeText(value);
      this.els.editorSaveState.textContent = "コピーしました";
    } catch {
      this.els.layoutOutput.focus();
      this.els.layoutOutput.select();
      document.execCommand?.("copy");
      this.els.editorSaveState.textContent = "選択しました";
    }
  }

  onLayoutEditorClick(event) {
    const objectButton = event.target.closest("[data-icp-editor-select-object]");
    if (objectButton && this.els.editorBody.contains(objectButton)) {
      const record = this.editableObjects.find(item => item.key === objectButton.dataset.icpEditorSelectObject);
      this.selectEditablePin(record ?? null);
      return;
    }
    const button = event.target.closest("[data-icp-editor-action]");
    if (!button || !this.els.editorBody.contains(button)) return;
    const action = button.dataset.icpEditorAction;
    if (action === "camera") {
      this.setCameraMode(button.dataset.icpCameraMode);
      return;
    }
    if (action === "move" && this.selectedEditablePin) {
      const step = Number(this.els.editorStep.value) || 0.05;
      this.moveEditablePin(
        this.selectedEditablePin,
        this.selectedEditablePin.visual.position.x + Number(button.dataset.dx || 0) * step,
        this.selectedEditablePin.visual.position.y + Number(button.dataset.dy || 0) * step
      );
      return;
    }
    if (action === "apply" && this.selectedEditablePin) {
      this.moveEditablePin(this.selectedEditablePin, this.els.pinX.value, this.els.pinY.value);
      return;
    }
    if (action === "add") {
      if (this.editablePins.length >= PIN_EDITOR_MAX_PINS) {
        this.els.editorSaveState.textContent = `上限${PIN_EDITOR_MAX_PINS}本です`;
        return;
      }
      const base = this.selectedEditablePin?.visual.position;
      const record = this.createEditableBoardPin(
        clamp(base ? base.x + 0.14 : 0, PIN_EDITOR_MIN_X, PIN_EDITOR_MAX_X),
        clamp(base ? base.y + 0.14 : 5, PIN_EDITOR_MIN_Y, PIN_EDITOR_MAX_Y)
      );
      this.pinLayoutDirty = true;
      this.selectEditablePin(record);
      this.updatePinLayoutOutput();
      this.schedulePinLayoutSave();
      return;
    }
    if (action === "delete" && this.selectedEditablePin?.kind === "pin") {
      this.removeEditablePin(this.selectedEditablePin);
      return;
    }
    if (action === "save") {
      this.savePinLayout(true);
      return;
    }
    if (action === "restore-saved") {
      this.restoreSavedPinLayout();
      return;
    }
    if (action === "reset") {
      const confirmed = window.confirm(
        "初期配置へ戻しますか？\n「この端末に保存」した配置は残り、「保存した配置へ戻す」から復元できます。"
      );
      if (!confirmed) return;
      this.resetPinLayout();
      return;
    }
    if (action === "copy") {
      void this.copyPinLayoutData();
      return;
    }
    if (action === "import") {
      try {
        const parsed = JSON.parse(this.els.layoutOutput.value);
        const layout = this.migratePinLayout(parsed);
        if (layout === null) throw new Error("invalid layout");
        this.replaceEditablePinLayout(layout.pins, true);
        this.applyEntryPlasticGuidePinNumbers(layout.entryPlasticGuidePins);
        this.applyBoardObjectLayout(layout.objects, true);
      } catch {
        this.els.editorSaveState.textContent = "配置データを確認してください";
      }
    }
  }

  toggleAuto() {
    if (this.gameOver || this.credits <= 0 || this.layoutEditing) return;
    this.autoEnabled = !this.autoEnabled;
    this.autoTimer = 0;
    this.showCallout(this.autoEnabled ? "オート発射 ON" : "オート発射 OFF", 0.7, this.autoEnabled ? "chance" : "normal");
    this.refreshHud();
  }

  bindEvents() {
    this.els.auto.addEventListener("click", this.boundAuto);
    this.els.stroke.addEventListener("input", this.boundStroke);
    this.els.restart.addEventListener("click", this.boundRestart);
    this.els.layoutEditor.addEventListener("toggle", this.boundEditorToggle);
    this.els.editorBody.addEventListener("click", this.boundEditorClick);
    this.els.canvas.addEventListener("pointerdown", this.boundCanvasPointerDown);
    this.els.canvas.addEventListener("pointermove", this.boundCanvasPointerMove);
    this.els.canvas.addEventListener("pointerup", this.boundCanvasPointerUp);
    this.els.canvas.addEventListener("pointercancel", this.boundCanvasPointerUp);
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("pagehide", this.boundPageHide);
    document.addEventListener("visibilitychange", this.boundVisibility);
    this.resizeObserver = new ResizeObserver(this.boundResize);
    this.resizeObserver.observe(this.els.stage);
  }

  updateEntryPlasticGuides(force = false) {
    this.entryPlasticGuides.forEach(guide => {
      const pairStartPin = Number.isInteger(guide.startPinNumber)
        ? this.editablePins[guide.startPinNumber - 1]
        : null;
      const pairEndPin = Number.isInteger(guide.endPinNumber)
        ? this.editablePins[guide.endPinNumber - 1]
        : null;
      const start = pairStartPin
        ? pairStartPin.visual.position
        : guide.anchorPin && this.editablePins.includes(guide.anchorPin)
          ? guide.anchorPin.visual.position
          : null;
      const end = pairEndPin
        ? pairEndPin.visual.position
        : Number.isFinite(guide.entryX) && Number.isFinite(guide.entryY)
          ? { x: guide.entryX, y: guide.entryY }
          : null;
      if (!start || !end) {
        guide.visual.visible = false;
        guide.body.position.set(0, -100, BOARD_Z);
        guide.body.aabbNeedsUpdate = true;
        return;
      }

      guide.visual.visible = true;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.max(0.02, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      const centerX = (start.x + end.x) * 0.5;
      const centerY = (start.y + end.y) * 0.5;
      const unchanged = Math.abs(centerX - guide.lastX) < 0.0001
        && Math.abs(centerY - guide.lastY) < 0.0001
        && Math.abs(length - guide.lastLength) < 0.0001
        && Math.abs(angle - guide.lastAngle) < 0.0001;
      if (!force && unchanged) return;

      guide.lastX = centerX;
      guide.lastY = centerY;
      guide.lastLength = length;
      guide.lastAngle = angle;

      guide.visual.position.set(centerX, centerY, -1.62);
      guide.visual.rotation.z = angle;
      guide.visual.scale.set(length, 1, 1);

      guide.shape.halfExtents.set(length * 0.5, 0.0525, 0.18);
      guide.shape.updateConvexPolyhedronRepresentation();
      guide.shape.updateBoundingSphereRadius();
      guide.body.position.set(centerX, centerY, BOARD_Z);
      guide.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle);
      guide.body.updateBoundingRadius();
      guide.body.aabbNeedsUpdate = true;
    });
  }

  getHanemonoWingGeometry(config) {
    const pinNumbers = config?.pinNumbers || config?.pins || [];
    const points = pinNumbers
      .map(number => this.editablePins[number - 1]?.visual?.position)
      .filter(Boolean);
    if (points.length === 2) {
      const upper = { x: points[0].x, y: points[0].y };
      const lower = { x: points[1].x, y: points[1].y };
      const dx = upper.x - lower.x;
      const dy = upper.y - lower.y;
      return {
        upper,
        lower,
        center: {
          x: (upper.x + lower.x) * 0.5,
          y: (upper.y + lower.y) * 0.5
        },
        length: Math.max(0.08, Math.hypot(dx, dy)),
        closedAngle: Math.atan2(dy, dx) - Math.PI * 0.5
      };
    }
    const side = Number(config?.side) || 1;
    const lower = { x: side * 0.48, y: ENTRY_Y + 0.18 - HANE_WING_LENGTH * 0.5 };
    const upper = { x: lower.x, y: lower.y + HANE_WING_LENGTH };
    return {
      upper,
      lower,
      center: { x: lower.x, y: lower.y + HANE_WING_LENGTH * 0.5 },
      length: HANE_WING_LENGTH,
      closedAngle: 0
    };
  }

  isHanemonoRoleBusy() {
    return this.pachinkoTokens.some(token =>
      token.entryAuthorized && token.phase === "role"
    );
  }

  triggerHanemonoOpening() {
    if (this.haneOpenTimer > 0 || this.isHanemonoRoleBusy()) return false;
    this.haneOpenTimer = HANE_OPEN_SECONDS;
    return true;
  }

  updateHanemonoWings(delta) {
    this.haneOpenTimer = Math.max(0, this.haneOpenTimer - delta);
    const target = this.haneOpenTimer > 0 ? 1 : 0;
    this.haneOpenAmount += clamp(
      target - this.haneOpenAmount,
      -delta * 5.8,
      delta * 5.8
    );
    const eased = this.haneOpenAmount * this.haneOpenAmount * (3 - 2 * this.haneOpenAmount);
    this.hanemonoWings.forEach(wing => {
      const geometry = this.getHanemonoWingGeometry(wing);
      const lengthChanged = Math.abs(wing.length - geometry.length) > 0.0001;
      const openAngle = -wing.side * HANE_OPEN_ANGLE * eased;
      wing.anchor = geometry.center;
      wing.upper = geometry.upper;
      wing.lower = geometry.lower;
      wing.length = geometry.length;
      wing.closedAngle = geometry.closedAngle;
      wing.angle = geometry.closedAngle + openAngle;
      wing.pivot.position.x = geometry.lower.x;
      wing.pivot.position.y = geometry.lower.y;
      wing.pivot.rotation.z = wing.angle;
      wing.spine.position.y = geometry.length * 0.5;
      wing.spine.scale.y = geometry.length / HANE_WING_LENGTH;
      wing.art.position.y = geometry.length * 0.5;
      wing.art.scale.y = geometry.length / HANE_WING_LENGTH;
      wing.anchor = {
        x: geometry.lower.x - Math.sin(wing.angle) * geometry.length * 0.5,
        y: geometry.lower.y + Math.cos(wing.angle) * geometry.length * 0.5
      };
      if (lengthChanged) {
        wing.shape.halfExtents.y = geometry.length * 0.5;
        wing.shape.updateConvexPolyhedronRepresentation();
        wing.shape.updateBoundingSphereRadius();
        wing.body.updateBoundingRadius();
      }
      wing.body.position.x = wing.anchor.x;
      wing.body.position.y = wing.anchor.y;
      wing.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), wing.angle);
      wing.body.angularVelocity.set(0, 0, 0);
      wing.body.aabbNeedsUpdate = true;
    });
  }

  getHakamaChuckerSide(token) {
    if (token.phase !== "board" || token.body.velocity.y > 0.45) return 0;
    if (
      token.body.position.y < HAKAMA_CHUCKER_Y - HAKAMA_CHUCKER_HALF_HEIGHT
      || token.body.position.y > HAKAMA_CHUCKER_Y + HAKAMA_CHUCKER_HALF_HEIGHT
      || token.previousY <= HAKAMA_CHUCKER_Y + 0.02
    ) return 0;
    if (Math.abs(token.body.position.x + HAKAMA_CHUCKER_X) <= HAKAMA_CHUCKER_HALF_WIDTH) return -1;
    if (Math.abs(token.body.position.x - HAKAMA_CHUCKER_X) <= HAKAMA_CHUCKER_HALF_WIDTH) return 1;
    return 0;
  }

  handleHakamaChuckerEntry(side) {
    this.pendingPayout += HANE_CHUCKER_PAYOUT;
    const opened = this.triggerHanemonoOpening();
    const chucker = this.hakamaChuckers.find(item => item.side === side);
    if (chucker) {
      chucker.flash = 0.72;
      chucker.opened = opened;
    }
    this.showCallout(
      opened ? `羽根OPEN・賞球${HANE_CHUCKER_PAYOUT}枚` : `賞球${HANE_CHUCKER_PAYOUT}枚`,
      0.95,
      opened ? "chance" : "normal"
    );
    this.refreshHud();
    return opened;
  }

  updateHakamaChuckers(delta) {
    this.hakamaChuckers.forEach(chucker => {
      chucker.flash = Math.max(0, chucker.flash - delta);
      const active = chucker.flash > 0;
      const color = chucker.side < 0 ? 0xff70ad : 0x57e5c5;
      chucker.indicatorMaterial.color.setHex(active ? color : 0xffdc55);
      chucker.indicatorMaterial.emissive.setHex(active ? color : 0xb96800);
      chucker.indicatorMaterial.emissiveIntensity = active ? 1.35 : 0.56;
      const pulse = active ? 1 + Math.sin(this.elapsed * 22) * 0.12 : 1;
      chucker.indicator.scale.setScalar(pulse);
    });
  }

  updatePusher(delta) {
    const nextZ = pusherPositionAt(Math.max(0, this.elapsed - PUSHER_START_DELAY));
    const previousZ = this.pusherBody.position.z;
    this.pusherBody.position.z = nextZ;
    this.pusherBody.velocity.set(0, 0, (nextZ - previousZ) / Math.max(delta, 0.001));
    this.pusherBody.aabbNeedsUpdate = true;
    this.pusherVisual.position.copy(this.pusherBody.position);
  }

  updatePachinkoWindmills(delta) {
    this.pachinkoWindmills.forEach(windmill => {
      const touching = new Set();
      this.pachinkoTokens.forEach(token => {
        if (token.phase !== "board") return;
        const hasPhysicalContact = (this.world.contacts || []).some(contact => (
          (contact.bi === token.body && contact.bj === windmill.body)
          || (contact.bj === token.body && contact.bi === windmill.body)
        ));
        if (!hasPhysicalContact) return;
        const dx = token.body.position.x - windmill.x;
        const dy = token.body.position.y - windmill.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 0.035 || distance > 0.36) return;
        touching.add(token);

        if (!windmill.contacts.has(token)) {
          const tokenTangentSpeed = (
            dx * token.body.velocity.y - dy * token.body.velocity.x
          ) / distance;
          const windmillTangentSpeed = windmill.angularVelocity * distance;
          const relativeTangentSpeed = tokenTangentSpeed - windmillTangentSpeed;
          const impact = relativeTangentSpeed
            * PACHINKO_TOKEN_MASS
            * distance
            / WINDMILL_EQUIVALENT_INERTIA
            * WINDMILL_IMPACT_TRANSFER;
          windmill.angularVelocity = clamp(
            windmill.angularVelocity + clamp(
              impact,
              -WINDMILL_IMPACT_SPEED_LIMIT,
              WINDMILL_IMPACT_SPEED_LIMIT
            ),
            -WINDMILL_MAX_ANGULAR_SPEED,
            WINDMILL_MAX_ANGULAR_SPEED
          );
        }

        const support = clamp(
          (dy - WINDMILL_WEIGHT_CONTACT_MIN_Y) / WINDMILL_WEIGHT_CONTACT_RANGE,
          0,
          1
        );
        const gravityTorque = -dx * PACHINKO_TOKEN_MASS * PACHINKO_GRAVITY * support;
        windmill.angularVelocity = clamp(
          windmill.angularVelocity
            + gravityTorque
              / WINDMILL_EQUIVALENT_INERTIA
              * WINDMILL_WEIGHT_TRANSFER
              * delta,
          -WINDMILL_MAX_ANGULAR_SPEED,
          WINDMILL_MAX_ANGULAR_SPEED
        );
      });
      windmill.contacts = touching;
      windmill.angularVelocity *= Math.exp(-WINDMILL_BEARING_DRAG * delta);
      if (Math.abs(windmill.angularVelocity) < 0.005) windmill.angularVelocity = 0;
      windmill.angle += windmill.angularVelocity * delta;
      windmill.visual.rotation.z = windmill.angle;
      windmill.body.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, 0, 1),
        windmill.angle
      );
      windmill.body.angularVelocity.set(0, 0, windmill.angularVelocity);
      windmill.body.aabbNeedsUpdate = true;
    });
  }

  applyPachinkoSlopeAcceleration(token, delta) {
    if (token.phase !== "board" && token.phase !== "role") return;
    const speed = Math.hypot(token.body.velocity.x, token.body.velocity.y);
    if (speed >= PACHINKO_SLOPE_ASSIST_MAX_SPEED) return;

    let strongestSlope = null;
    (this.world.contacts || []).forEach(contact => {
      let surfaceBody = null;
      if (contact.bi === token.body) surfaceBody = contact.bj;
      else if (contact.bj === token.body) surfaceBody = contact.bi;
      if (!surfaceBody) return;
      if (surfaceBody.material !== this.pinMaterial && surfaceBody.material !== this.railMaterial) return;

      const normalLength = Math.hypot(contact.ni.x, contact.ni.y);
      if (normalLength < 0.1) return;
      const normalX = contact.ni.x / normalLength;
      const normalY = contact.ni.y / normalLength;
      const tangentAccelerationX = PACHINKO_GRAVITY * normalX * normalY;
      const tangentAccelerationY = -PACHINKO_GRAVITY * (1 - normalY * normalY);
      const magnitude = Math.hypot(tangentAccelerationX, tangentAccelerationY);
      if (!strongestSlope || magnitude > strongestSlope.magnitude) {
        strongestSlope = {
          x: tangentAccelerationX,
          y: tangentAccelerationY,
          magnitude
        };
      }
    });

    if (!strongestSlope || strongestSlope.magnitude < 0.08) return;
    const speedFade = clamp(
      (PACHINKO_SLOPE_ASSIST_MAX_SPEED - speed) / 1.4,
      0,
      1
    );
    const accelerationScale = PACHINKO_SLOPE_ACCELERATION_BONUS * speedFade * delta;
    token.body.velocity.x += strongestSlope.x * accelerationScale;
    token.body.velocity.y += strongestSlope.y * accelerationScale;
  }

  updateEntrySeesaws() {
    const swing = Math.sin(this.elapsed * ENTRY_SEESAW_SPEED) * ENTRY_SEESAW_MAX_ANGLE;
    const swingVelocity = Math.cos(this.elapsed * ENTRY_SEESAW_SPEED)
      * ENTRY_SEESAW_MAX_ANGLE
      * ENTRY_SEESAW_SPEED;
    this.entrySeesaws.forEach(seesaw => {
      seesaw.angle = swing * seesaw.motionDirection;
      seesaw.visual.rotation.z = seesaw.angle;
      seesaw.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), seesaw.angle);
      seesaw.body.angularVelocity.set(0, 0, swingVelocity * seesaw.motionDirection);
      seesaw.body.aabbNeedsUpdate = true;
    });
  }

  resolveSeesawTokenContact(token) {
    if (token.phase !== "board" && token.phase !== "role") return false;

    for (const seesaw of this.entrySeesaws) {
      const cosine = Math.cos(seesaw.angle);
      const sine = Math.sin(seesaw.angle);
      const toLocal = (worldX, worldY) => {
        const dx = worldX - seesaw.centerX;
        const dy = worldY - seesaw.centerY;
        return {
          x: dx * cosine + dy * sine,
          y: -dx * sine + dy * cosine
        };
      };
      const previous = toLocal(token.previousX, token.previousY);
      const current = toLocal(token.body.position.x, token.body.position.y);
      const radius = PACHINKO_TOKEN_COLLIDER_RADIUS;
      const minX = -seesaw.halfLength - radius;
      const maxX = seesaw.halfLength + radius;
      const minY = -seesaw.halfHeight - radius;
      const maxY = seesaw.halfHeight + radius;
      const previousInside = previous.x > minX && previous.x < maxX
        && previous.y > minY && previous.y < maxY;
      const currentInside = current.x > minX && current.x < maxX
        && current.y > minY && current.y < maxY;
      const movementX = current.x - previous.x;
      const movementY = current.y - previous.y;
      let collisionTime = 0;
      let normalX = 0;
      let normalY = 0;
      let collided = false;

      if (!previousInside) {
        let entryTime = 0;
        let exitTime = 1;
        const clipAxis = (start, movement, minimum, maximum, axis) => {
          if (Math.abs(movement) < 1e-7) {
            return start >= minimum && start <= maximum;
          }
          let nearTime = (minimum - start) / movement;
          let farTime = (maximum - start) / movement;
          let nearNormal = -1;
          if (nearTime > farTime) {
            [nearTime, farTime] = [farTime, nearTime];
            nearNormal = 1;
          }
          if (nearTime > entryTime) {
            entryTime = nearTime;
            normalX = axis === "x" ? nearNormal : 0;
            normalY = axis === "y" ? nearNormal : 0;
          }
          exitTime = Math.min(exitTime, farTime);
          return entryTime <= exitTime;
        };
        const intersectsX = clipAxis(previous.x, movementX, minX, maxX, "x");
        const intersectsY = intersectsX
          && clipAxis(previous.y, movementY, minY, maxY, "y");
        if (intersectsY && entryTime >= 0 && entryTime <= 1 && exitTime >= 0) {
          collisionTime = entryTime;
          collided = true;
        }
      } else if (currentInside) {
        const distances = [
          { value: current.x - minX, x: -1, y: 0 },
          { value: maxX - current.x, x: 1, y: 0 },
          { value: current.y - minY, x: 0, y: -1 },
          { value: maxY - current.y, x: 0, y: 1 }
        ].sort((a, b) => a.value - b.value);
        normalX = distances[0].x;
        normalY = distances[0].y;
        collided = true;
      }

      if (!collided) continue;

      let correctedLocalX = current.x;
      let correctedLocalY = current.y;
      if (!previousInside) {
        correctedLocalX = previous.x + movementX * collisionTime;
        correctedLocalY = previous.y + movementY * collisionTime;
      }
      if (normalX < 0) correctedLocalX = minX - SEESAW_SWEEP_EPSILON;
      else if (normalX > 0) correctedLocalX = maxX + SEESAW_SWEEP_EPSILON;
      if (normalY < 0) correctedLocalY = minY - SEESAW_SWEEP_EPSILON;
      else if (normalY > 0) correctedLocalY = maxY + SEESAW_SWEEP_EPSILON;

      const worldNormalX = normalX * cosine - normalY * sine;
      const worldNormalY = normalX * sine + normalY * cosine;
      token.body.position.x = seesaw.centerX
        + correctedLocalX * cosine
        - correctedLocalY * sine;
      token.body.position.y = seesaw.centerY
        + correctedLocalX * sine
        + correctedLocalY * cosine;

      const contactWorldX = token.body.position.x - worldNormalX * radius;
      const contactWorldY = token.body.position.y - worldNormalY * radius;
      const contactOffsetX = contactWorldX - seesaw.centerX;
      const contactOffsetY = contactWorldY - seesaw.centerY;
      const angularVelocity = seesaw.body.angularVelocity.z;
      const surfaceVelocityX = -angularVelocity * contactOffsetY;
      const surfaceVelocityY = angularVelocity * contactOffsetX;
      let relativeVelocityX = token.body.velocity.x - surfaceVelocityX;
      let relativeVelocityY = token.body.velocity.y - surfaceVelocityY;
      const normalSpeed = relativeVelocityX * worldNormalX
        + relativeVelocityY * worldNormalY;
      if (normalSpeed < 0) {
        const impactSpeed = -normalSpeed;
        const restitution = clamp(
          SEESAW_SWEEP_RESTITUTION_MIN + impactSpeed * 0.045,
          SEESAW_SWEEP_RESTITUTION_MIN,
          SEESAW_SWEEP_RESTITUTION_MAX
        );
        const tangentX = -worldNormalY;
        const tangentY = worldNormalX;
        const tangentSpeed = (
          relativeVelocityX * tangentX + relativeVelocityY * tangentY
        ) * SEESAW_SWEEP_TANGENT_RETENTION;
        const reboundSpeed = impactSpeed * restitution;
        relativeVelocityX = tangentX * tangentSpeed + worldNormalX * reboundSpeed;
        relativeVelocityY = tangentY * tangentSpeed + worldNormalY * reboundSpeed;
        token.body.velocity.x = surfaceVelocityX + relativeVelocityX;
        token.body.velocity.y = surfaceVelocityY + relativeVelocityY;
      }
      token.body.aabbNeedsUpdate = true;
      token.body.wakeUp();
      return true;
    }
    return false;
  }

  resolveEntryPlasticGuideTokenContact(token) {
    if (token.phase !== "board" && token.phase !== "role") return false;

    for (const guide of this.entryPlasticGuides) {
      if (!guide.visual.visible || !Number.isFinite(guide.lastAngle)) continue;
      const cosine = Math.cos(guide.lastAngle);
      const sine = Math.sin(guide.lastAngle);
      const toLocal = (worldX, worldY) => {
        const dx = worldX - guide.body.position.x;
        const dy = worldY - guide.body.position.y;
        return {
          x: dx * cosine + dy * sine,
          y: -dx * sine + dy * cosine
        };
      };
      const previous = toLocal(token.previousX, token.previousY);
      const current = toLocal(token.body.position.x, token.body.position.y);
      const radius = PACHINKO_TOKEN_COLLIDER_RADIUS;
      const minX = -guide.shape.halfExtents.x - radius;
      const maxX = guide.shape.halfExtents.x + radius;
      const minY = -guide.shape.halfExtents.y - radius;
      const maxY = guide.shape.halfExtents.y + radius;
      const previousInside = previous.x > minX && previous.x < maxX
        && previous.y > minY && previous.y < maxY;
      const currentInside = current.x > minX && current.x < maxX
        && current.y > minY && current.y < maxY;
      const movementX = current.x - previous.x;
      const movementY = current.y - previous.y;
      let collisionTime = 0;
      let normalX = 0;
      let normalY = 0;
      let collided = false;

      if (!previousInside) {
        let entryTime = 0;
        let exitTime = 1;
        const clipAxis = (start, movement, minimum, maximum, axis) => {
          if (Math.abs(movement) < 1e-7) {
            return start >= minimum && start <= maximum;
          }
          let nearTime = (minimum - start) / movement;
          let farTime = (maximum - start) / movement;
          let nearNormal = -1;
          if (nearTime > farTime) {
            [nearTime, farTime] = [farTime, nearTime];
            nearNormal = 1;
          }
          if (nearTime > entryTime) {
            entryTime = nearTime;
            normalX = axis === "x" ? nearNormal : 0;
            normalY = axis === "y" ? nearNormal : 0;
          }
          exitTime = Math.min(exitTime, farTime);
          return entryTime <= exitTime;
        };
        const intersectsX = clipAxis(previous.x, movementX, minX, maxX, "x");
        const intersectsY = intersectsX
          && clipAxis(previous.y, movementY, minY, maxY, "y");
        if (intersectsY && entryTime >= 0 && entryTime <= 1 && exitTime >= 0) {
          collisionTime = entryTime;
          collided = true;
        }
      } else if (currentInside) {
        const distances = [
          { value: current.x - minX, x: -1, y: 0 },
          { value: maxX - current.x, x: 1, y: 0 },
          { value: current.y - minY, x: 0, y: -1 },
          { value: maxY - current.y, x: 0, y: 1 }
        ].sort((a, b) => a.value - b.value);
        normalX = distances[0].x;
        normalY = distances[0].y;
        collided = true;
      }

      if (!collided) continue;

      let correctedLocalX = current.x;
      let correctedLocalY = current.y;
      if (!previousInside) {
        correctedLocalX = previous.x + movementX * collisionTime;
        correctedLocalY = previous.y + movementY * collisionTime;
      }
      if (normalX < 0) correctedLocalX = minX - ENTRY_GUIDE_SWEEP_EPSILON;
      else if (normalX > 0) correctedLocalX = maxX + ENTRY_GUIDE_SWEEP_EPSILON;
      if (normalY < 0) correctedLocalY = minY - ENTRY_GUIDE_SWEEP_EPSILON;
      else if (normalY > 0) correctedLocalY = maxY + ENTRY_GUIDE_SWEEP_EPSILON;

      const worldNormalX = normalX * cosine - normalY * sine;
      const worldNormalY = normalX * sine + normalY * cosine;
      token.body.position.x = guide.body.position.x
        + correctedLocalX * cosine
        - correctedLocalY * sine;
      token.body.position.y = guide.body.position.y
        + correctedLocalX * sine
        + correctedLocalY * cosine;

      const normalSpeed = token.body.velocity.x * worldNormalX
        + token.body.velocity.y * worldNormalY;
      if (normalSpeed < 0) {
        const tangentX = -worldNormalY;
        const tangentY = worldNormalX;
        const tangentSpeed = (
          token.body.velocity.x * tangentX + token.body.velocity.y * tangentY
        ) * ENTRY_GUIDE_SWEEP_TANGENT_RETENTION;
        const reboundSpeed = -normalSpeed * ENTRY_GUIDE_SWEEP_RESTITUTION;
        token.body.velocity.x = tangentX * tangentSpeed + worldNormalX * reboundSpeed;
        token.body.velocity.y = tangentY * tangentSpeed + worldNormalY * reboundSpeed;
      }
      token.body.aabbNeedsUpdate = true;
      token.body.wakeUp();
      return true;
    }
    return false;
  }

  updatePachinkoTokens(delta) {
    for (let index = this.pachinkoTokens.length - 1; index >= 0; index -= 1) {
      const token = this.pachinkoTokens[index];

      token.body.position.z = BOARD_Z;
      token.body.velocity.z = 0;
      token.body.angularVelocity.set(0, 0, 0);
      this.resolveSeesawTokenContact(token);
      this.resolveEntryPlasticGuideTokenContact(token);
      this.applyPachinkoSlopeAcceleration(token, delta);
      token.visual.position.copy(token.body.position);
      token.visual.position.z = -1.48;
      token.visual.rotation.set(-Math.PI / 2, 0, 0);

      if (token.phase === "board") {
        const gateDx = token.body.position.x;
        const gateDy = token.body.position.y - PACHINKO_FIELD_CENTER_Y;
        const gateRadius = Math.hypot(gateDx, gateDy);
        let gateAngle = normalizeAngle(Math.atan2(gateDy, gateDx));
        const nearGate = gateRadius >= BALL_RETURN_MIN_RADIUS && gateRadius <= BALL_RETURN_MAX_RADIUS;
        const crossedOutward = nearGate
          && !token.clearedBallReturn
          && token.previousGateAngle > BALL_RETURN_ANGLE
          && token.previousGateAngle < BALL_RETURN_ANGLE + 0.42
          && gateAngle <= BALL_RETURN_ANGLE
          && gateAngle > BALL_RETURN_ANGLE - 0.42;
        if (crossedOutward) {
          token.clearedBallReturn = true;
          this.triggerBallReturnGate();
        } else {
          const crossedBack = nearGate
            && token.clearedBallReturn
            && token.previousGateAngle < BALL_RETURN_ANGLE
            && token.previousGateAngle > BALL_RETURN_ANGLE - 0.42
            && gateAngle >= BALL_RETURN_ANGLE
            && gateAngle < BALL_RETURN_ANGLE + 0.42;
          if (crossedBack) {
            const safeAngle = BALL_RETURN_ANGLE - 0.018;
            const safeRadius = clamp(gateRadius, BALL_RETURN_MIN_RADIUS + 0.03, BALL_RETURN_MAX_RADIUS - 0.03);
            token.body.position.x = safeRadius * Math.cos(safeAngle);
            token.body.position.y = PACHINKO_FIELD_CENTER_Y + safeRadius * Math.sin(safeAngle);
            const returnTangentX = -Math.sin(BALL_RETURN_ANGLE);
            const returnTangentY = Math.cos(BALL_RETURN_ANGLE);
            const returnSpeed = token.body.velocity.x * returnTangentX + token.body.velocity.y * returnTangentY;
            if (returnSpeed > 0) {
              token.body.velocity.x -= returnTangentX * returnSpeed * 1.12;
              token.body.velocity.y -= returnTangentY * returnSpeed * 1.12;
            }
            token.body.velocity.x += -Math.cos(BALL_RETURN_ANGLE) * 0.035;
            token.body.velocity.y += -Math.sin(BALL_RETURN_ANGLE) * 0.035;
            token.body.aabbNeedsUpdate = true;
            gateAngle = safeAngle;
          }
        }
        token.previousGateAngle = gateAngle;
      }

      const hakamaChuckerSide = this.getHakamaChuckerSide(token);
      if (hakamaChuckerSide !== 0) {
        this.handleHakamaChuckerEntry(hakamaChuckerSide);
        this.removePachinkoToken(index);
        continue;
      }

      const crossedLeftEntry = token.phase === "board"
        && token.body.velocity.x > 0
        && token.previousX < LEFT_ENTRY_X
        && token.body.position.x >= LEFT_ENTRY_X
        && Math.abs(token.body.position.y - ENTRY_Y) <= ENTRY_HALF_HEIGHT;
      const crossedRightEntry = token.phase === "board"
        && token.body.velocity.x < 0
        && token.previousX > RIGHT_ENTRY_X
        && token.body.position.x <= RIGHT_ENTRY_X
        && Math.abs(token.body.position.y - ENTRY_Y) <= ENTRY_HALF_HEIGHT;
      if (crossedLeftEntry || crossedRightEntry) {
        this.enterRoleFromMouth(token, crossedLeftEntry ? -1 : 1, "entry-mouth");
        continue;
      }

      if (token.phase === "role" && token.body.position.y <= ROLE_SLOT_Y + 0.08) {
        const slot = token.body.position.x < -0.28 ? 0 : token.body.position.x > 0.28 ? 2 : 1;
        const pocket = resolveStartPocket(slot);
        if (pocket.startsSpin) {
          this.pendingPayout += pocket.payout;
          this.queueSpin();
          this.flashSlot(slot, true);
          this.showCallout(`赤SPIN・${pocket.payout}枚放出`, 1.1, "chance");
        } else {
          this.flashSlot(slot, false);
        }
        this.removePachinkoToken(index);
        this.refreshHud();
        continue;
      }

      const drainX = token.body.position.x / PACHINKO_DRAIN_HALF_WIDTH;
      const drainY = (token.body.position.y - PACHINKO_DRAIN_CENTER_Y)
        / PACHINKO_DRAIN_HALF_HEIGHT;
      const enteredPachinkoDrain = token.phase === "board"
        && drainX * drainX + drainY * drainY <= 1
        && token.body.velocity.y <= 0.4;
      // A token remains physical until it reaches an actual out pocket or chucker.
      if (enteredPachinkoDrain) {
        this.removePachinkoToken(index);
        continue;
      }
      token.previousX = token.body.position.x;
      token.previousY = token.body.position.y;
    }
  }

  triggerBallReturnGate() {
    this.ballReturnGateTimer = BALL_RETURN_GATE_DURATION;
  }

  updateBallReturnGate(delta) {
    if (!this.ballReturnGate) return;
    this.ballReturnGateTimer = Math.max(0, this.ballReturnGateTimer - delta);
    const elapsed = BALL_RETURN_GATE_DURATION - this.ballReturnGateTimer;
    const progress = this.ballReturnGateTimer > 0
      ? clamp(elapsed / BALL_RETURN_GATE_DURATION, 0, 1)
      : 1;
    const swing = this.ballReturnGateTimer > 0 ? Math.sin(progress * Math.PI) : 0;
    this.ballReturnGate.pivot.rotation.z = this.ballReturnGate.closedAngle - swing * 0.95;
  }

  enterRoleFromMouth(token, entrySide, source) {
    const entryX = entrySide < 0 ? LEFT_ENTRY_X : RIGHT_ENTRY_X;
    const crossedEntry = entrySide < 0
      ? token.previousX < entryX
        && token.body.position.x >= entryX
        && token.body.velocity.x > 0
      : token.previousX > entryX
        && token.body.position.x <= entryX
        && token.body.velocity.x < 0;
    if (
      token.phase !== "board"
      || source !== "entry-mouth"
      || !crossedEntry
      || Math.abs(token.body.position.y - ENTRY_Y) > ENTRY_HALF_HEIGHT
    ) {
      return false;
    }

    token.phase = "role";
    token.entrySide = entrySide;
    token.entryAuthorized = true;
    token.entrySource = source;
    token.body.type = CANNON.Body.DYNAMIC;
    token.body.mass = PACHINKO_TOKEN_MASS;
    token.body.collisionFilterMask = -1;
    token.body.velocity.x = clamp(token.body.velocity.x, -2.4, 2.4);
    token.body.velocity.y = Math.min(token.body.velocity.y, -0.08);
    token.body.velocity.z = 0;
    token.body.angularVelocity.set(0, 0, 0);
    token.body.updateMassProperties();
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    token.previousX = token.body.position.x;
    token.previousY = token.body.position.y;
    return true;
  }

  removePachinkoToken(index) {
    const token = this.pachinkoTokens[index];
    if (!token) return;
    this.world.removeBody(token.body);
    this.scene.remove(token.visual);
    token.visual.geometry.dispose();
    this.pachinkoTokens.splice(index, 1);
  }

  flashSlot(slot, chance) {
    const pad = this.slotLights[slot];
    if (!pad) return;
    pad.userData.flash = 0.7;
    pad.userData.flashChance = chance;
  }

  updateSlotLights(delta) {
    this.slotLights.forEach((pad, index) => {
      const flash = Math.max(0, (pad.userData.flash || 0) - delta);
      pad.userData.flash = flash;
      const base = index === 1 ? 0.94 : 0.52;
      pad.material.opacity = flash > 0 ? 1 : base;
      pad.scale.y = flash > 0 ? 1.18 : 1;
    });
  }

  updateTableCoins(delta) {
    for (let index = this.tableCoins.length - 1; index >= 0; index -= 1) {
      const coin = this.tableCoins[index];
      coin.age += delta;
      const body = coin.body;
      body.velocity.x = clamp(body.velocity.x, -2.2, 2.2);
      body.velocity.y = clamp(body.velocity.y, -3.8, 2.5);
      body.velocity.z = clamp(body.velocity.z, -2.2, 2.6);
      body.angularVelocity.x = clamp(body.angularVelocity.x, -7, 7);
      body.angularVelocity.y = clamp(body.angularVelocity.y, -7, 7);
      body.angularVelocity.z = clamp(body.angularVelocity.z, -7, 7);
      coin.visual.position.copy(body.position);
      coin.visual.quaternion.copy(body.quaternion);

      const enteredCollector = body.position.z > FRONT_EDGE_Z + 0.08 && body.position.y < COLLECTOR_TRIGGER_Y;
      const lost = body.position.y < -2.4 || Math.abs(body.position.x) > 4.2 || body.position.z < -3.8;
      if (enteredCollector) {
        this.beginCollectCoin(index);
      } else if (lost) {
        this.removeCoin(index);
      }
    }
  }

  beginCollectCoin(index) {
    const coin = this.tableCoins[index];
    if (!coin || coin.collected) return;
    coin.collected = true;
    this.world.removeBody(coin.body);
    this.tableCoins.splice(index, 1);
    this.collectingCoins.push({
      visual: coin.visual,
      value: coin.value,
      elapsed: 0,
      duration: COLLECTION_ANIMATION_SECONDS,
      start: coin.visual.position.clone(),
      targetX: clamp(coin.visual.position.x * 0.18, -0.72, 0.72)
    });
    this.showCollectorDrop();
  }

  showCollectorDrop() {
    const drop = document.createElement("i");
    drop.className = "icp-collector-coin";
    drop.setAttribute("aria-hidden", "true");
    const lane = ((this.collectingCoins.length - 1) % 3) - 1;
    drop.style.setProperty("--collector-offset", `${lane * 20}px`);
    this.els.collector.appendChild(drop);
    drop.addEventListener("animationend", () => drop.remove(), { once: true });
    this.els.collector.classList.add("is-catching");
    clearTimeout(this.collectionWindowTimer);
    this.collectionWindowTimer = window.setTimeout(() => {
      this.els?.collector?.classList.remove("is-catching");
    }, 920);
  }

  updateCollectingCoins(delta) {
    for (let index = this.collectingCoins.length - 1; index >= 0; index -= 1) {
      const coin = this.collectingCoins[index];
      coin.elapsed += delta;
      const progress = clamp(coin.elapsed / coin.duration, 0, 1);
      const horizontalEase = progress * progress * (3 - 2 * progress);
      coin.visual.position.x = lerp(coin.start.x, coin.targetX, horizontalEase);
      coin.visual.position.y = lerp(coin.start.y, COLLECTOR_TARGET_Y, progress * progress);
      coin.visual.position.z = lerp(coin.start.z, COLLECTOR_TARGET_Z, horizontalEase);
      coin.visual.rotateY(delta * 5.2);
      const displayScale = 1 + Math.sin(progress * Math.PI) * 0.18;
      coin.visual.scale.setScalar(displayScale);
      if (progress >= 1) {
        this.scene.remove(coin.visual);
        this.collectingCoins.splice(index, 1);
        this.awardCollectedCoin(coin.value);
      }
    }
  }

  awardCollectedCoin(value) {
    this.collected += value;
    this.credits += value;
    this.zeroCreditTimer = 0;
    this.collectionFlash = 1;
    this.root.classList.remove("is-coin-win");
    void this.root.offsetWidth;
    this.root.classList.add("is-coin-win");
    this.showCallout(`もちコイン +${value}`, 0.85, "win");
    this.refreshHud();
  }

  removeCoin(index) {
    const coin = this.tableCoins[index];
    if (!coin) return;
    this.world.removeBody(coin.body);
    this.scene.remove(coin.visual);
    this.tableCoins.splice(index, 1);
  }

  removeOldestLostCoin() {
    let candidate = this.tableCoins.findIndex(coin => coin.body.position.y < -0.25 || coin.body.position.z > 2.15);
    if (candidate < 0) candidate = 0;
    this.removeCoin(candidate);
  }

  queueSpin() {
    if (this.spin || this.spinDelay > 0) this.pendingSpins += 1;
    else this.startSpin();
  }

  startSpin() {
    const outcome = drawJackpotOutcome(this.random, this.stRemaining);
    const cue = selectHeatCue(outcome.kind, this.random);
    this.spin = {
      outcome,
      cue,
      elapsed: 0,
      duration: cue === "swarm" ? 2.65 : cue === "trio" ? 2.25 : 1.95,
      tick: 0
    };
    this.setSpinLabel(this.stRemaining > 0 ? `ST ${this.stRemaining} / 5` : "CHANCE SPIN");
    this.showHeatCue(cue);
    this.root.classList.add("is-spinning");
  }

  updateSpin(delta) {
    if (!this.spin) {
      if (this.spinDelay > 0) {
        this.spinDelay -= delta;
        if (this.spinDelay <= 0 && this.pendingSpins > 0) {
          this.pendingSpins -= 1;
          this.startSpin();
        }
      }
      return;
    }
    const spin = this.spin;
    spin.elapsed += delta;
    spin.tick -= delta;
    const lockLeftAt = spin.duration * 0.68;
    const lockRightAt = spin.duration * 0.88;
    if (spin.tick <= 0) {
      spin.tick = 0.065;
      const left = spin.elapsed >= lockLeftAt ? spin.outcome.code[0] : String(Math.floor(this.random() * 10));
      const right = spin.elapsed >= lockRightAt ? spin.outcome.code[1] : String(Math.floor(this.random() * 10));
      this.setDigits(`${left}${right}`);
    }
    if (spin.elapsed >= spin.duration) this.resolveSpin();
  }

  resolveSpin() {
    const { outcome } = this.spin;
    this.setDigits(outcome.code);
    this.stRemaining = outcome.nextStRemaining;
    this.root.classList.remove("is-spinning", "is-jackpot-big", "is-jackpot-small");
    if (outcome.kind === "big") {
      this.pendingPayout += JACKPOT_PAYOUTS["77"];
      this.root.classList.add("is-jackpot-big");
      this.showCallout("77 JACKPOT・48枚大量放出", 3.5, "jackpot");
      this.setSpinLabel("SUPER JACKPOT");
      this.cameraShake = 0.12;
    } else if (outcome.kind === "small") {
      this.pendingPayout += JACKPOT_PAYOUTS["33"];
      this.root.classList.add("is-jackpot-small");
      this.showCallout("33 HIT・14枚放出", 2.6, "small-hit");
      this.setSpinLabel("MINI JACKPOT");
      this.cameraShake = 0.075;
    } else {
      this.showCallout(this.stRemaining > 0 ? `ST残り ${this.stRemaining} 回` : "次のSPINを狙おう", 1.25, "normal");
      this.setSpinLabel(this.stRemaining > 0 ? `ST ${this.stRemaining} / 5` : "CHANCE SLOT");
    }
    this.spin = null;
    this.spinDelay = 0.8;
    this.refreshHud();
  }

  updatePayout(delta) {
    if (this.pendingPayout <= 0) {
      this.payoutAccumulator = 0;
      this.els.payout.hidden = true;
      return;
    }
    this.els.payout.hidden = false;
    this.els.payoutCount.textContent = String(this.pendingPayout);
    this.payoutAccumulator += delta;
    const interval = this.root.classList.contains("is-jackpot-big") ? 0.075 : 0.11;
    while (this.payoutAccumulator >= interval && this.pendingPayout > 0) {
      this.payoutAccumulator -= interval;
      const side = this.pendingPayout % 2 === 0 ? -1 : 1;
      this.spawnTableCoin(side * (1.15 + this.random() * 0.65), -1.42 + this.random() * 0.3, {
        y: 1.45 + this.random() * 0.45,
        vx: -side * (0.05 + this.random() * 0.16),
        vy: 0.05 + this.random() * 0.18,
        vz: 0.18 + this.random() * 0.24,
        tiltX: (this.random() - 0.5) * 0.28,
        tiltZ: (this.random() - 0.5) * 0.28,
        value: 1
      });
      this.pendingPayout -= 1;
    }
    this.els.payoutCount.textContent = String(this.pendingPayout);
    if (this.pendingPayout <= 0) {
      this.payoutAccumulator = 0;
      this.els.payout.hidden = true;
      this.root.classList.remove("is-jackpot-big", "is-jackpot-small");
    }
  }

  showHeatCue(cue) {
    this.els.heat.className = "icp-heat";
    this.els.heatCharacters.innerHTML = "";
    if (cue === "none") {
      this.els.heat.hidden = true;
      return;
    }
    const settings = cue === "swarm"
      ? { count: 7, title: "相棒群", copy: "激アツ", duration: 2.25 }
      : cue === "trio"
        ? { count: 3, title: "相棒集合", copy: "大チャンス", duration: 1.8 }
        : { count: 1, title: "相棒登場", copy: "チャンス", duration: 1.45 };
    this.els.heat.classList.add(`is-${cue}`);
    this.els.heatTitle.textContent = settings.title;
    this.els.heatCopy.textContent = settings.copy;
    const available = this.roster.length ? this.roster : [{ id: "fallback", name: "相棒", frontSvg: "" }];
    for (let index = 0; index < settings.count; index += 1) {
      const item = available[index % available.length];
      const imageUrl = svgDataUrl(item.frontSvg);
      const figure = document.createElement("span");
      figure.className = "icp-heat-character";
      figure.style.setProperty("--heat-index", String(index));
      if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "";
        figure.appendChild(image);
      } else {
        figure.textContent = "★";
      }
      this.els.heatCharacters.appendChild(figure);
    }
    this.els.heat.hidden = false;
    this.heatTimer = settings.duration;
  }

  showCallout(text, duration = 1, tone = "normal") {
    this.els.callout.textContent = text;
    this.els.callout.dataset.tone = tone;
    this.els.callout.hidden = false;
    this.calloutTimer = duration;
  }

  setDigits(code) {
    const normalized = String(code || "00").padStart(2, "0").slice(-2);
    this.currentLcdCode = normalized;
    this.setDigit(this.els.digitLeft, normalized[0]);
    this.setDigit(this.els.digitRight, normalized[1]);
    this.refreshBoardLcd();
  }

  setSpinLabel(label) {
    this.currentLcdLabel = String(label || "CHANCE SLOT");
    this.els.spinLabel.textContent = this.currentLcdLabel;
    this.refreshBoardLcd();
  }

  setDigit(root, digit) {
    const active = SEGMENTS_BY_DIGIT[digit] || "";
    root.dataset.value = digit;
    root.querySelectorAll("[data-segment]").forEach(segment => {
      segment.classList.toggle("is-on", active.includes(segment.dataset.segment));
    });
  }

  refreshBoardLcd() {
    const context = this.boardLcdContext;
    if (!context || !this.boardLcdTexture) return;
    const width = this.boardLcdCanvas.width;
    const height = this.boardLcdCanvas.height;
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, "#101923");
    background.addColorStop(0.55, "#04080d");
    background.addColorStop(1, "#120711");
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#3b1c2c";
    context.lineWidth = 7;
    context.strokeRect(8, 8, width - 16, height - 16);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#8ef4df";
    context.shadowColor = "#22d2b0";
    context.shadowBlur = 10;
    context.font = "700 27px 'Segoe UI', sans-serif";
    context.fillText(this.currentLcdLabel || "CHANCE SLOT", width / 2, 42, width - 40);
    context.shadowBlur = 0;

    const code = String(this.currentLcdCode || "00").padStart(2, "0").slice(-2);
    drawBoardLcdDigit(context, code[0], 128, 82, 82, 160);
    drawBoardLcdDigit(context, code[1], 270, 82, 82, 160);
    this.boardLcdTexture.needsUpdate = true;
  }

  updateCollectionEffects(delta) {
    this.collectionFlash = Math.max(0, this.collectionFlash - delta * 2.35);
    if (!this.collectionGlow) return;
    this.collectionGlow.material.opacity = 0.18 + this.collectionFlash * 0.58;
    const scale = 1 + this.collectionFlash * 0.08;
    this.collectionGlow.scale.set(scale, scale, 1);
  }

  updateGameOver(delta) {
    if (this.gameOver) return;
    if (this.credits > 0) {
      this.zeroCreditTimer = 0;
      return;
    }
    if (this.autoEnabled) {
      this.autoEnabled = false;
      this.refreshHud();
    }
    const resultStillMoving = this.pachinkoTokens.length > 0
      || this.collectingCoins.length > 0
      || this.pendingPayout > 0
      || this.pendingSpins > 0
      || Boolean(this.spin)
      || this.spinDelay > 0;
    if (resultStillMoving) {
      this.zeroCreditTimer = 0;
      return;
    }
    this.zeroCreditTimer += delta;
    if (this.zeroCreditTimer >= GAME_OVER_GRACE_SECONDS) this.endGame();
  }

  endGame() {
    if (this.gameOver || this.credits > 0) return;
    this.gameOver = true;
    this.autoEnabled = false;
    this.els.gameOver.hidden = false;
    this.root.classList.add("is-game-over");
    this.refreshHud();
  }

  restartGame() {
    if (this.destroyed) return;
    window.ImasoraJackpotCoinPusher.mount(this.root, {
      roster: this.roster,
      random: this.random
    });
  }

  refreshHud() {
    this.els.credits.textContent = String(this.credits);
    this.els.collected.textContent = String(this.collected);
    this.els.st.hidden = this.stRemaining <= 0;
    this.els.stCount.textContent = String(this.stRemaining);
    this.els.auto.setAttribute("aria-pressed", String(this.autoEnabled));
    this.els.auto.classList.toggle("is-active", this.autoEnabled);
    this.els.autoLabel.textContent = this.autoEnabled ? "オート発射 ON" : "オート発射 OFF";
    this.els.auto.disabled = this.gameOver || this.credits <= 0 || this.layoutEditing;
    this.els.stroke.disabled = this.gameOver || this.layoutEditing;
    this.root.classList.toggle("is-auto-firing", this.autoEnabled);
    this.root.classList.toggle("is-st", this.stRemaining > 0);
  }

  updateUiTimers(delta) {
    if (this.calloutTimer > 0) {
      this.calloutTimer -= delta;
      if (this.calloutTimer <= 0) this.els.callout.hidden = true;
    }
    if (this.heatTimer > 0) {
      this.heatTimer -= delta;
      if (this.heatTimer <= 0) this.els.heat.hidden = true;
    }
    if (this.launchCooldown > 0) {
      this.launchCooldown = Math.max(0, this.launchCooldown - delta);
      if (this.launchCooldown === 0) this.refreshHud();
    }
    if (this.autoEnabled) {
      this.autoTimer -= delta;
      if (this.autoTimer <= 0) {
        this.autoTimer = AUTO_FIRE_INTERVAL;
        this.launchCoin();
      }
    }
  }

  updateCamera(delta) {
    this.cameraShake = Math.max(0, this.cameraShake - delta * 0.1);
    const shake = this.cameraShake;
    this.camera.position.set(
      this.cameraBase.x + (this.random() - 0.5) * shake,
      this.cameraBase.y + (this.random() - 0.5) * shake * 0.5,
      this.cameraBase.z + (this.random() - 0.5) * shake
    );
    this.camera.lookAt(this.cameraTarget);
  }

  onVisibilityChange() {
    if (document.hidden) this.flushPinLayoutSave();
    this.lastTimestamp = performance.now();
  }

  applyCameraFraming() {
    if (!this.camera) return;
    const portrait = this.camera.aspect < 0.75;
    if (this.cameraMode === "front") {
      this.camera.fov = portrait ? 38 : 34;
      this.cameraBase.set(0, 3.31, portrait ? 10.25 : 9.6);
      this.cameraTarget.set(0, 3.31, -1.35);
    } else {
      this.camera.fov = portrait ? 41 : 37;
      this.cameraBase.set(portrait ? -5.55 : -5.3, portrait ? 5.65 : 5.3, portrait ? 8.9 : 8.05);
      this.cameraTarget.set(0, portrait ? 2.2 : 2.25, -0.55);
    }
    this.camera.updateProjectionMatrix();
  }

  setCameraMode(mode) {
    this.cameraMode = mode === "front" ? "front" : "normal";
    this.cameraShake = 0;
    this.root?.classList.toggle("is-front-camera", this.cameraMode === "front");
    this.applyCameraFraming();
    if (this.camera) {
      this.camera.position.copy(this.cameraBase);
      this.camera.lookAt(this.cameraTarget);
    }
    this.els?.editorBody?.querySelectorAll("[data-icp-camera-mode]").forEach(button => {
      const selected = button.dataset.icpCameraMode === this.cameraMode;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  resize() {
    if (!this.renderer || !this.els?.stage) return;
    const width = Math.max(1, this.els.stage.clientWidth);
    const height = Math.max(1, this.els.stage.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.applyCameraFraming();
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(this.cameraTarget);
  }

  loop(timestamp) {
    if (this.destroyed) return;
    const previous = this.lastTimestamp || timestamp;
    const delta = clamp((timestamp - previous) / 1000, 0.008, 0.034);
    this.lastTimestamp = timestamp;
    this.elapsed += delta;
    this.updatePusher(delta);
    this.updateUiTimers(delta);
    this.updateSpin(delta);
    this.updatePayout(delta);
    this.updateSlotLights(delta);
    this.updateEntrySeesaws();
    this.updateEntryPlasticGuides();
    this.updateHanemonoWings(delta);
    this.updateHakamaChuckers(delta);
    this.world.step(FIXED_STEP, delta, MAX_SUB_STEPS);
    this.updatePachinkoWindmills(delta);
    this.updatePachinkoTokens(delta);
    this.updateBallReturnGate(delta);
    this.updateTableCoins(delta);
    this.updateCollectingCoins(delta);
    this.updateCollectionEffects(delta);
    this.updateGameOver(delta);
    this.updateCamera(delta);
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  destroy() {
    if (this.destroyed) return;
    this.flushPinLayoutSave();
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.collectionWindowTimer);
    this.resizeObserver?.disconnect();
    this.els?.auto?.removeEventListener("click", this.boundAuto);
    this.els?.stroke?.removeEventListener("input", this.boundStroke);
    this.els?.restart?.removeEventListener("click", this.boundRestart);
    this.els?.layoutEditor?.removeEventListener("toggle", this.boundEditorToggle);
    this.els?.editorBody?.removeEventListener("click", this.boundEditorClick);
    this.els?.canvas?.removeEventListener("pointerdown", this.boundCanvasPointerDown);
    this.els?.canvas?.removeEventListener("pointermove", this.boundCanvasPointerMove);
    this.els?.canvas?.removeEventListener("pointerup", this.boundCanvasPointerUp);
    this.els?.canvas?.removeEventListener("pointercancel", this.boundCanvasPointerUp);
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("pagehide", this.boundPageHide);
    document.removeEventListener("visibilitychange", this.boundVisibility);
    this.textures.forEach(texture => texture.dispose());
    this.scene?.traverse(node => {
      node.geometry?.dispose?.();
      if (Array.isArray(node.material)) node.material.forEach(material => material.dispose?.());
      else node.material?.dispose?.();
    });
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    if (this.root) this.root.innerHTML = "";
  }
}

let mountedGame = null;

window.ImasoraJackpotCoinPusher = Object.freeze({
  mount(root, options = {}) {
    if (!root) return;
    if (mountedGame) mountedGame.destroy();
    mountedGame = new ImasoraJackpotCoinPusherGame(root, options);
    mountedGame.mount();
    return mountedGame;
  },
  unmount() {
    if (!mountedGame) return;
    mountedGame.destroy();
    mountedGame = null;
  }
});

export { ImasoraJackpotCoinPusherGame };
