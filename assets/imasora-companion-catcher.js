import * as THREE from "./three.module.min.js";
import * as CANNON from "./cannon-es.js";

const MAX_ATTEMPTS = 5;
const NUMBER_PLAQUE_BASE_POSITIONS = Object.freeze({
  1: Object.freeze({ x: -0.3, z: 3.23 }),
  2: Object.freeze({ x: 4.72, z: 1.27 }),
  3: Object.freeze({ x: 1.38, z: 3.23 }),
  4: Object.freeze({ x: -0.3, z: 3.85 }),
  5: Object.freeze({ x: 4.72, z: -0.06 }),
  6: Object.freeze({ x: 1.38, z: 3.85 })
});
const BELT_RX = 3.18;
const BELT_RZ = 1.95;
const BELT_HALF_WIDTH = 0.76;
const BELT_SURFACE_Y = 0.62;
const BELT_SPEED = 0.40;
const BELT_MINIMUM_SPEED_RATIO = 0.9;
const CLOUD_PUFF_HEIGHT_SCALE = 1.12;
const CLOUD_PUFF_Y_OFFSET = 0.025;
const CENTER_MOUND_RADIUS_X = 2.18;
const CENTER_MOUND_RADIUS_Z = 1.08;
const CENTER_MOUND_HEIGHT = 0.76;
const CENTER_MOUND_BASE_Y = BELT_SURFACE_Y - 0.06;
const CENTER_MOUND_TRANSITION_SCALE = 1.12;
const CENTER_MOUND_GRID_SIZE = 21;
const CENTER_MOUND_EDGE_ROUNDING = 0.18;
const MOUND_SUMMIT_EXCLUSION_RADIUS = 0.48;
const MOUND_NORMAL_SAMPLE_DISTANCE = 0.025;
const MOUND_PLUSH_START_CLEARANCE = 0;
const MOUND_PLUSH_FRICTION = 0.86;
const MOUND_IDLE_LINEAR_DAMPING = 0.38;
const MOUND_ARM_PRESS_MAX_SINK = 0.012;
const MOUND_ARM_PRESS_SURFACE_TOLERANCE = 0.006;
const MOUND_CONTACT_TOLERANCE = 0.001;
const MOUND_CONTACT_SNAP_DISTANCE = 0.14;
const PLUSH_SIZE_SCALE = 0.63;
const PLUSH_ACCESSORY_SCALE = PLUSH_SIZE_SCALE / 0.9;
const CLAW_SIZE_SCALE = 0.84;
const CLAW_CABLE_MAX_SLACK = 0.12;
const CLAW_HEAD_PLUSH_CLEARANCE = 0.025 * CLAW_SIZE_SCALE;
const CLAW_HEAD_ESCAPE_TOLERANCE = 0.035 * CLAW_SIZE_SCALE;
const PRONG_SHAFT_VISUAL_RADIUS = 0.069 * CLAW_SIZE_SCALE;
const PRONG_SHAFT_COLLIDER_RADIUS = 0.11 * CLAW_SIZE_SCALE;
const ROUND_PRONG_TIP_RADIUS = 0.14 * CLAW_SIZE_SCALE;
const PRONG_TIP_COLLISION_MARGIN = 0.012 * CLAW_SIZE_SCALE;
const PRONG_TIP_SOLVER_EPSILON = 0.002;
const ARM_PLUSH_CORRECTION_BUDGET_PER_FRAME = 0.1;
const ARM_MOUND_CLEARANCE = 0.015 * CLAW_SIZE_SCALE;
const PLUSH_MOUND_CLEARANCE = 0;
const ARM_MOUND_SPHERE_RING_SCALES = Object.freeze([0.65, 0.9]);
const ARM_MOUND_SAMPLE_DIRECTIONS = 8;
const HELD_PLUSH_VISUAL_SCALE_XZ = 0.9;
const HELD_PLUSH_VISUAL_SCALE_Y = 0.96;
const HELD_PLUSH_COMPRESSION_RATE = 14;
const TURNER_PRONG_INDEX = 0;
const TURNER_PRONG_INWARD_OFFSET = 0.13 * CLAW_SIZE_SCALE;
const TURNER_PRONG_COLLISION_MARGIN = 0.015;
const TURNER_PRONG_THICKNESS_COLLISION_MARGIN = 0.01;
const TURNER_PRONG_WIDTH = 0.5 * CLAW_SIZE_SCALE;
const TURNER_PRONG_LENGTH = 0.53 * CLAW_SIZE_SCALE;
const TURNER_PRONG_FACE_DEPTH = 0.011 * CLAW_SIZE_SCALE;
const TURNER_PRONG_BEVEL_THICKNESS = 0.0017 * CLAW_SIZE_SCALE;
const TURNER_PRONG_TOTAL_THICKNESS = TURNER_PRONG_FACE_DEPTH
  + TURNER_PRONG_BEVEL_THICKNESS * 2;
const CARRIAGE_Y = 6.05;
const MAX_GRAB_CABLE_LENGTH = 3.9;
const DESCENT_TRAVEL_SECONDS = 3.23;
const DESCENT_AUTO_CLOSE_SECONDS = 3.41;
const GRIP_EARLY_MONITOR_START_SECONDS = 0.45;
const GRIP_CONTACT_HISTORY_SECONDS = 0.2;
const GRIP_CONTACT_CHECK_SECONDS = 1.2;
const ENCLOSED_TWO_ARM_GRIP_MIN_QUALITY = 0.58;
const SLIP_RELEASE_MAX_INITIAL_DROP_SPEED = 0.18;
const SLIP_RELEASE_CONTACT_TILT_SPEED = 0.48;
const SLIP_RELEASE_MAX_TILT_SPEED = 0.5;
const SLIP_RELEASE_SOFT_FALL_MAX_SPEED = 0.92;
const SLIP_RELEASE_AIR_CUSHION_ACCELERATION = 7.5;
const SOFT_ARM_FALL_MIN_HEIGHT = 0.025;
const TIMED_STAGE_LIMIT_SECONDS = 30;
const TIMED_STAGE_WARNING_SECONDS = 10;
const TIMED_STAGE_WARNING_BLINK_HZ = 2;
const OUTER_FENCE_RX = BELT_RX + BELT_HALF_WIDTH + 0.12;
const OUTER_FENCE_RZ = BELT_RZ + BELT_HALF_WIDTH + 0.08;
const OUTER_FENCE_HALF_THICKNESS = 0.075;
const INITIAL_PLUSH_FENCE_CLEARANCE = OUTER_FENCE_HALF_THICKNESS + 0.05;
const OUTER_FENCE_BOTTOM_Y = BELT_SURFACE_Y - 0.04;
const OUTER_FENCE_TOP_Y = BELT_SURFACE_Y + 0.92;
const OUTER_FENCE_COLLISION_MARGIN = 0.008;
const HOME_POSITION = Object.freeze({ x: -1.7, z: 3.22 });
const PRIZE_HOLE_POSITION = HOME_POSITION;
const PRIZE_HOLE_RADIUS_X = 1.08;
const PRIZE_HOLE_RADIUS_Z = 0.86;
const PRIZE_HOLE_TRIGGER_SCALE = 0.74;
const PRIZE_HOLE_UNLIFTED_TRIGGER_SCALE = 0.48;
const PRIZE_HOLE_GUARANTEE_SCALE = 0.92;
const PRIZE_HOLE_REQUIRED_LIFT_DISTANCE = 1.2;
const PRIZE_HOLE_ENTRY_Y = BELT_SURFACE_Y + 1.15;
const PRIZE_HOLE_AWARD_Y = BELT_SURFACE_Y - 0.74;
const beltStart = (turn, lane = 0) => Object.freeze({ surface: "belt", turn, lane });
const moundStart = (x, z, headingTurn = 0) => {
  const normalizedX = x / CENTER_MOUND_RADIUS_X;
  const normalizedZ = z / CENTER_MOUND_RADIUS_Z;
  const radius = Math.hypot(normalizedX, normalizedZ);
  let safeX = x;
  let safeZ = z;
  if (radius < MOUND_SUMMIT_EXCLUSION_RADIUS) {
    const fallbackAngle = headingTurn * Math.PI * 2;
    const directionX = radius > 0.0001
      ? normalizedX / radius
      : Math.sin(fallbackAngle);
    const directionZ = radius > 0.0001
      ? normalizedZ / radius
      : Math.cos(fallbackAngle);
    safeX = directionX * CENTER_MOUND_RADIUS_X * MOUND_SUMMIT_EXCLUSION_RADIUS;
    safeZ = directionZ * CENTER_MOUND_RADIUS_Z * MOUND_SUMMIT_EXCLUSION_RADIUS;
  }
  return Object.freeze({
    surface: "mound",
    x: safeX,
    z: safeZ,
    headingTurn
  });
};
const createPlushStartLayout = (name, slots) => Object.freeze({
  name,
  slots: Object.freeze(slots)
});
const PLUSH_START_LAYOUTS = Object.freeze([
  createPlushStartLayout("belt-balanced-scatter", [
    beltStart(0.03, 2), beltStart(0.16, -5), beltStart(0.29, 2), beltStart(0.42, -5),
    beltStart(0.55, 2), beltStart(0.68, -5), beltStart(0.81, 2), beltStart(0.94, -5)
  ]),
  createPlushStartLayout("belt-front-opening", [
    beltStart(0.34, 2), beltStart(0.44, -4), beltStart(0.54, 2), beltStart(0.64, -4),
    beltStart(0.74, 2), beltStart(0.84, -4), beltStart(0.94, 2), beltStart(0.04, -4)
  ]),
  createPlushStartLayout("belt-two-islands", [
    beltStart(0.04, 2), beltStart(0.14, -5), beltStart(0.24, 2), beltStart(0.34, -5),
    beltStart(0.56, -5), beltStart(0.66, 2), beltStart(0.76, -5), beltStart(0.86, 2)
  ]),
  createPlushStartLayout("single-slope", [
    moundStart(1.35, 0.12, 0.25),
    beltStart(0.08, 2), beltStart(0.22, -4), beltStart(0.36, 2), beltStart(0.50, -4),
    beltStart(0.64, 2), beltStart(0.78, -4), beltStart(0.92, 2)
  ]),
  createPlushStartLayout("east-west-slopes", [
    moundStart(-1.15, 0, 0.50), moundStart(1.15, 0, 0),
    beltStart(0.08, 2), beltStart(0.24, -5), beltStart(0.40, 2),
    beltStart(0.58, -5), beltStart(0.74, 2), beltStart(0.90, -5)
  ]),
  createPlushStartLayout("front-slope-triangle", [
    moundStart(-1.05, -0.40, 0.58), moundStart(0, 0.60, 0.25), moundStart(1.05, -0.40, 0.92),
    beltStart(0.05, 2), beltStart(0.30, -5), beltStart(0.45, 2),
    beltStart(0.60, -5), beltStart(0.85, 2)
  ]),
  createPlushStartLayout("back-slope-triangle", [
    moundStart(-1.05, 0.40, 0.42), moundStart(0, -0.60, 0.75), moundStart(1.05, 0.40, 0.08),
    beltStart(0.15, 2), beltStart(0.40, -5), beltStart(0.55, 2),
    beltStart(0.80, -5), beltStart(0.95, 2)
  ]),
  createPlushStartLayout("mound-cross", [
    moundStart(-1.35, 0, 0.50), moundStart(1.35, 0, 0),
    moundStart(0, -0.72, 0.75), moundStart(0, 0.72, 0.25),
    beltStart(0.125, 2), beltStart(0.375, -5), beltStart(0.625, 2), beltStart(0.875, -5)
  ]),
  createPlushStartLayout("mound-left-arc", [
    moundStart(-1.35, 0, 0.50), moundStart(-0.35, 0.72, 0.35), moundStart(0.65, -0.65, 0.85),
    beltStart(0.03, 2), beltStart(0.18, -5), beltStart(0.43, 2),
    beltStart(0.63, -5), beltStart(0.83, 2)
  ]),
  createPlushStartLayout("mound-slope-line", [
    moundStart(-1.40, 0, 0.50), moundStart(0.20, -0.72, 0.25), moundStart(1.40, 0, 0),
    beltStart(0.10, 2), beltStart(0.30, -5), beltStart(0.50, 2),
    beltStart(0.70, -5), beltStart(0.90, 2)
  ])
]);
const FRONT_CAMERA_POSITION = Object.freeze({ x: 0.15, y: 8.1, z: 10.7 });
const FRONT_CAMERA_TARGET = Object.freeze({ x: 0, y: 1.75, z: -0.15 });
const SIDE_CAMERA_POSITION = Object.freeze({ x: 13, y: 8.2, z: 0.3 });
const SIDE_CAMERA_TARGET = Object.freeze({ x: 0, y: 1.9, z: 0 });
const CAMERA_TRANSITION_RATE = 5;
const CAMERA_SIDE_VIEW_DELAY = 1;
const AIM_LIMITS = Object.freeze({ minX: HOME_POSITION.x, maxX: 3.45, minZ: -2.15, maxZ: HOME_POSITION.z });
const TRACK_SOFT_LIMIT = 0.32;
const TRACK_HARD_LIMIT = 0.66;
const PRIMARY_HORIZONTAL_CONTROL_SPEED = 0.88;
const HORIZONTAL_CONTROL_SPEED = 1.04;
const VERTICAL_CONTROL_SPEED = 0.84;
const FINE_LEVER_CENTER_DEAD_ZONE_RATIO = 0.38;
const FINE_LEVER_CENTER_DRAG_THRESHOLD_PX = 8;
const FINE_LEVER_CENTER_DRAG_DISTANCE_SCALE = 0.4;
const ROTATION_CONTROL_SPEED = Math.PI * 0.42;
const MAX_ROTATION_TRAVEL = Math.PI * 6;
const AUTO_RETURN_ROTATION_SPEED = Math.PI * 0.32;
const AUTO_CARRIAGE_ACCELERATION = 8.6;
const AUTO_CARRIAGE_DAMPING = 4.4;
const AUTO_CARRIAGE_MAX_SPEED = 2.55;
const FIXED_STEP = 1 / 60;

const CLAW_STAR_NEON_PALETTES = Object.freeze({
  default: Object.freeze({
    shell: 0x786000,
    shellEmissive: 0xd4a400,
    face: 0xb88d00,
    faceEmissive: 0xefb900,
    glow: 0xffc400,
    outline: 0xffdf2f,
    jewel: 0xe0ad00,
    jewelEmissive: 0xf2bd00,
    light: 0xffc000,
    emissivePower: 0.72
  }),
  horizontal: Object.freeze({
    shell: 0x9d004f,
    shellEmissive: 0xff006e,
    face: 0xd00070,
    faceEmissive: 0xff0a83,
    glow: 0xff006e,
    outline: 0xff38a1,
    jewel: 0xff4bac,
    jewelEmissive: 0xff007b,
    light: 0xff007a,
    emissivePower: 1
  }),
  vertical: Object.freeze({
    shell: 0x315d00,
    shellEmissive: 0x6fb800,
    face: 0x4f8a00,
    faceEmissive: 0x8ed600,
    glow: 0x8fe800,
    outline: 0xc4ff3a,
    jewel: 0x9ddd18,
    jewelEmissive: 0x9de600,
    light: 0x8fe000,
    emissivePower: 0.82
  }),
  descending: Object.freeze({
    shell: 0x004d6f,
    shellEmissive: 0x008bb8,
    face: 0x007ca6,
    faceEmissive: 0x00a6d6,
    glow: 0x00b8e8,
    outline: 0x2cd9ff,
    jewel: 0x00a9d6,
    jewelEmissive: 0x00bce8,
    light: 0x00b7e8,
    emissivePower: 0.76
  }),
  lifting: Object.freeze({
    shell: 0x8a2400,
    shellEmissive: 0xd94300,
    face: 0xb93500,
    faceEmissive: 0xeb4a00,
    glow: 0xff5a00,
    outline: 0xff8a22,
    jewel: 0xe55200,
    jewelEmissive: 0xff5a00,
    light: 0xff4d00,
    emissivePower: 0.78
  })
});

const PLUSH_PROFILES = Object.freeze({
  balanced: { width: 1.48, height: 1.67, depth: 0.7, mass: 1.04, grip: 0.48, friction: 0.62, shape: "box", roundness: 0.28 },
  box: { width: 1.55, height: 1.56, depth: 0.78, mass: 1.28, grip: 0.53, friction: 0.78, shape: "box", roundness: 0.17 },
  round: { width: 1.5, height: 1.5, depth: 0.82, mass: 0.9, grip: 0.37, friction: 0.4, shape: "sphere", roundness: 0.48 },
  float: { width: 1.72, height: 1.34, depth: 0.65, mass: 0.74, grip: 0.41, friction: 0.48, shape: "box", roundness: 0.38 },
  slippery: { width: 1.68, height: 1.36, depth: 0.63, mass: 0.9, grip: 0.27, friction: 0.12, shape: "box", roundness: 0.36 },
  heavy: { width: 1.44, height: 1.76, depth: 0.78, mass: 1.58, grip: 0.29, friction: 0.72, shape: "box", roundness: 0.24 },
  wide: { width: 1.86, height: 1.3, depth: 0.69, mass: 1.14, grip: 0.33, friction: 0.66, shape: "box", roundness: 0.32 }
});

const gameMarkup = `
  <div class="icc-shell">
    <div class="icc-hud">
      <div class="icc-hud-item"><small>残り</small><strong data-icc-attempts>5/5</strong></div>
      <div class="icc-hud-item"><small>GET</small><strong data-icc-caught>0</strong></div>
      <div class="icc-hud-item"><small>SCORE</small><strong data-icc-score>0</strong></div>
    </div>
    <div class="icc-viewport" data-icc-viewport>
      <canvas class="icc-canvas" data-icc-canvas aria-label="3Dイマソラキャラクターキャッチャー"></canvas>
      <div class="icc-scene-label" aria-hidden="true"><strong>イマソラキャラクターキャッチャー</strong><span>3-PRONG PHYSICS</span></div>
      <div class="icc-control-deck" role="group" aria-label="アーム操作盤">
        <button class="icc-axis-handle icc-direct-button icc-horizontal-handle" type="button" data-icc-handle="horizontal" aria-label="1 右へ移動">
          <span class="icc-handle-number">1</span><span class="icc-control-glyph" aria-hidden="true">→</span>
        </button>
        <button class="icc-axis-handle icc-direct-button icc-vertical-handle" type="button" data-icc-handle="vertical" aria-label="2 東側視点で右へ移動">
          <span class="icc-handle-number">2</span><span class="icc-control-glyph" aria-hidden="true">→</span>
        </button>
        <button class="icc-axis-handle icc-direct-button icc-rotation-handle" type="button" data-icc-handle="rotation" aria-label="3 反時計回りに回転">
          <span class="icc-handle-number">3</span><span class="icc-control-glyph icc-rotation-glyph" aria-hidden="true">↺</span>
        </button>
        <div class="icc-axis-handle icc-fine-handle icc-fine-horizontal-handle" data-icc-fine-group="horizontal" role="group" aria-label="4 左右移動レバー">
          <span class="icc-handle-number">4</span>
          <div class="icc-fine-buttons icc-horizontal-lever" style="touch-action:none">
            <button type="button" data-icc-fine="left" aria-label="左へ移動">←</button>
            <span class="icc-lever-rail" aria-hidden="true"><i></i></span>
            <button type="button" data-icc-fine="right" aria-label="右へ移動">→</button>
            <span data-icc-fine-center="horizontal" aria-hidden="true" style="position:absolute;inset:0 32%;z-index:4;pointer-events:auto;touch-action:none;background:transparent"></span>
          </div>
        </div>
        <div class="icc-axis-handle icc-fine-handle icc-fine-vertical-handle" data-icc-fine-group="vertical" role="group" aria-label="5 東側視点の左右移動レバー">
          <span class="icc-handle-number">5</span>
          <div class="icc-fine-buttons icc-horizontal-lever" style="touch-action:none">
            <span class="icc-lever-rail" aria-hidden="true"><i></i></span>
            <button type="button" data-icc-fine="down" aria-label="東側視点で左へ移動">←</button>
            <button type="button" data-icc-fine="up" aria-label="東側視点で右へ移動">→</button>
            <span data-icc-fine-center="vertical" aria-hidden="true" style="position:absolute;inset:0 32%;z-index:4;pointer-events:auto;touch-action:none;background:transparent"></span>
          </div>
        </div>
        <button class="icc-axis-handle icc-direct-button icc-stop-handle" type="button" data-icc-handle="stop" aria-label="6 アームの下降を開始する">
          <span class="icc-handle-number">6</span><span class="icc-control-glyph icc-descent-glyph" aria-hidden="true">下降</span><small data-icc-stop-label>待機</small>
        </button>
      </div>
      <div class="icc-callout" data-icc-callout role="status"></div>
      <div class="icc-result" data-icc-result hidden></div>
    </div>
    <div class="icc-bottom-row">
      <button type="button" data-icc-action="restart" aria-label="最初からやり直す">↺ やり直す</button>
    </div>
  </div>`;

let mountedGame = null;
let plushStartLayoutDeck = [];
let previousPlushStartLayoutIndex = -1;

function refillPlushStartLayoutDeck() {
  const deck = PLUSH_START_LAYOUTS.map((_, index) => index);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  if (deck.length > 1 && deck[0] === previousPlushStartLayoutIndex) {
    const swapIndex = 1 + Math.floor(Math.random() * (deck.length - 1));
    [deck[0], deck[swapIndex]] = [deck[swapIndex], deck[0]];
  }
  plushStartLayoutDeck = deck;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function gentleMoundFalloff(value) {
  const t = clamp(value, 0, 1);
  const edge = CENTER_MOUND_EDGE_ROUNDING;
  const slope = 1 / (1 - edge);
  if (t < edge) return slope * t * t / (2 * edge);
  if (t > 1 - edge) {
    const remaining = 1 - t;
    return 1 - slope * remaining * remaining / (2 * edge);
  }
  return slope * (t - edge * 0.5);
}

function centerMoundHeightAt(x, z) {
  const radius = Math.hypot(
    x / CENTER_MOUND_RADIUS_X,
    z / CENTER_MOUND_RADIUS_Z
  );
  if (radius >= 1) return 0;
  return CENTER_MOUND_HEIGHT * (1 - gentleMoundFalloff(radius));
}

function centerMoundNormalAt(x, z) {
  const sample = MOUND_NORMAL_SAMPLE_DISTANCE;
  const slopeX = (
    centerMoundHeightAt(x + sample, z)
    - centerMoundHeightAt(x - sample, z)
  ) / (sample * 2);
  const slopeZ = (
    centerMoundHeightAt(x, z + sample)
    - centerMoundHeightAt(x, z - sample)
  ) / (sample * 2);
  const inverseLength = 1 / Math.hypot(slopeX, 1, slopeZ);
  return {
    x: -slopeX * inverseLength,
    y: inverseLength,
    z: -slopeZ * inverseLength
  };
}

function highestMoundHeightUnderBounds(minX, maxX, minZ, maxZ) {
  const xSamples = [minX, (minX + maxX) * 0.5, maxX];
  const zSamples = [minZ, (minZ + maxZ) * 0.5, maxZ];
  let highest = 0;
  xSamples.forEach(x => {
    zSamples.forEach(z => {
      highest = Math.max(highest, centerMoundHeightAt(x, z));
    });
  });
  return highest;
}

function moundRestingCenterY(body, clearance = 0) {
  body.updateAABB();
  const extentBelowCenter = body.position.y - body.aabb.lowerBound.y;
  const moundHeight = highestMoundHeightUnderBounds(
    body.aabb.lowerBound.x,
    body.aabb.upperBound.x,
    body.aabb.lowerBound.z,
    body.aabb.upperBound.z
  );
  return CENTER_MOUND_BASE_Y + moundHeight + extentBelowCenter + clearance;
}

function plushRestingYAt(spec, x, z) {
  const mainExtent = spec.shape === "sphere"
    ? Math.max(spec.width, spec.height) * 0.5 + 0.045 * PLUSH_ACCESSORY_SCALE
    : spec.height * 0.5 + 0.04 * PLUSH_ACCESSORY_SCALE;
  const footExtent = spec.height * 0.55 + 0.12 * PLUSH_ACCESSORY_SCALE;
  return CENTER_MOUND_BASE_Y
    + centerMoundHeightAt(x, z)
    + Math.max(mainExtent, footExtent);
}

function isInsideCenterMoundTransition(x, z) {
  return Math.hypot(
    x / CENTER_MOUND_RADIUS_X,
    z / CENTER_MOUND_RADIUS_Z
  ) <= CENTER_MOUND_TRANSITION_SCALE;
}

function createCenterMoundGeometry(radialSegments = 64, rings = 20) {
  const vertices = [0, CENTER_MOUND_HEIGHT, 0];
  const uvs = [0.5, 0.5];
  const indices = [];
  for (let ring = 1; ring <= rings; ring += 1) {
    const radius = ring / rings;
    const height = CENTER_MOUND_HEIGHT * (1 - gentleMoundFalloff(radius));
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      vertices.push(
        Math.cos(angle) * CENTER_MOUND_RADIUS_X * radius,
        height,
        Math.sin(angle) * CENTER_MOUND_RADIUS_Z * radius
      );
      uvs.push(
        0.5 + Math.cos(angle) * radius * 0.5,
        0.5 + Math.sin(angle) * radius * 0.5
      );
    }
    const currentStart = 1 + (ring - 1) * radialSegments;
    if (ring === 1) {
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const next = (segment + 1) % radialSegments;
        indices.push(0, currentStart + next, currentStart + segment);
      }
      continue;
    }
    const previousStart = currentStart - radialSegments;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      indices.push(
        previousStart + segment,
        previousStart + next,
        currentStart + segment,
        previousStart + next,
        currentStart + next,
        currentStart + segment
      );
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createStarShape(outerRadius, innerRadius, points = 5) {
  const shape = new THREE.Shape();
  const vertexCount = points * 2;
  for (let index = 0; index < vertexCount; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = Math.PI / 2 + (index * Math.PI) / points;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function normalizeAngle(value) {
  let angle = value;
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeSelectSound() {
  if (typeof window.playSfx !== "function") return;
  try {
    window.playSfx("select");
  } catch (error) {
    // The game remains playable when the host sound system is unavailable.
  }
}

function safeCatchSound() {
  if (typeof window.playSfx !== "function") return;
  try {
    window.playSfx("reward");
  } catch (error) {
    safeSelectSound();
  }
}

function cssColor(value, fallback = "#9ed8ff") {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function ellipsePoint(angle, rx = BELT_RX, rz = BELT_RZ) {
  return {
    x: Math.cos(angle) * rx,
    z: Math.sin(angle) * rz
  };
}

function ellipseTangent(angle, rx = BELT_RX, rz = BELT_RZ) {
  const x = -Math.sin(angle) * rx;
  const z = Math.cos(angle) * rz;
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

function advanceEllipseAngle(angle, distance) {
  const localRadius = Math.hypot(
    Math.sin(angle) * BELT_RX,
    Math.cos(angle) * BELT_RZ
  ) || 1;
  const next = angle + distance / localRadius;
  return next >= Math.PI * 2 ? next - Math.PI * 2 : next;
}

function closestPointOnSegment(point, start, end) {
  const abX = end.x - start.x;
  const abY = end.y - start.y;
  const abZ = end.z - start.z;
  const lengthSquared = abX * abX + abY * abY + abZ * abZ || 1;
  const amount = clamp(
    ((point.x - start.x) * abX + (point.y - start.y) * abY + (point.z - start.z) * abZ) / lengthSquared,
    0,
    1
  );
  return {
    x: start.x + abX * amount,
    y: start.y + abY * amount,
    z: start.z + abZ * amount
  };
}

function nearestEllipseData(x, z, rx = BELT_RX, rz = BELT_RZ) {
  const angle = Math.atan2(z / rz, x / rx);
  const point = ellipsePoint(angle, rx, rz);
  const tangent = ellipseTangent(angle, rx, rz);
  const dx = point.x - x;
  const dz = point.z - z;
  return {
    angle,
    point,
    tangent,
    distance: Math.hypot(dx, dz),
    dx,
    dz
  };
}

function setMeshBetween(mesh, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = Math.max(0.001, direction.length());
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.set(1, length, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function makeRoundedShape(width, height, radius) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + r, -halfHeight);
  shape.lineTo(halfWidth - r, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  shape.lineTo(halfWidth, halfHeight - r);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  shape.lineTo(-halfWidth + r, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  shape.lineTo(-halfWidth, -halfHeight + r);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);
  return shape;
}

function makeRoundedLoop(width, height, radius, z) {
  const points = [];
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  const corners = [
    { cx: halfWidth - r, cy: halfHeight - r, start: 0 },
    { cx: -halfWidth + r, cy: halfHeight - r, start: Math.PI / 2 },
    { cx: -halfWidth + r, cy: -halfHeight + r, start: Math.PI },
    { cx: halfWidth - r, cy: -halfHeight + r, start: Math.PI * 1.5 }
  ];
  corners.forEach(corner => {
    for (let step = 0; step < 8; step += 1) {
      const angle = corner.start + (step / 8) * (Math.PI / 2);
      points.push(new THREE.Vector3(
        corner.cx + Math.cos(angle) * r,
        corner.cy + Math.sin(angle) * r,
        z
      ));
    }
  });
  return new THREE.CatmullRomCurve3(points, true, "centripetal");
}

function sanitizeSvg(svg) {
  let value = String(svg || "");
  value = value
    .replace(/<animateTransform\b[^>]*\/>/gi, "")
    .replace(/<animate\b[^>]*\/>/gi, "")
    .replace(/<animateTransform\b[^>]*>[\s\S]*?<\/animateTransform>/gi, "")
    .replace(/<animate\b[^>]*>[\s\S]*?<\/animate>/gi, "");
  if (!/\bxmlns=/.test(value)) {
    value = value.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return value;
}

function createFabricTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = "#8f8f8f";
  context.fillRect(0, 0, 128, 128);
  for (let index = 0; index < 180; index += 1) {
    const shade = 112 + Math.round(Math.random() * 38);
    context.strokeStyle = `rgb(${shade},${shade},${shade})`;
    context.globalAlpha = 0.2 + Math.random() * 0.22;
    context.lineWidth = Math.random() > 0.6 ? 1 : 0.5;
    context.beginPath();
    if (index % 2) {
      const x = Math.random() * 128;
      context.moveTo(x, 0);
      context.lineTo(x + Math.random() * 5 - 2.5, 128);
    } else {
      const y = Math.random() * 128;
      context.moveTo(0, y);
      context.lineTo(128, y + Math.random() * 5 - 2.5);
    }
    context.stroke();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3.5, 4);
  return texture;
}

function createMachineControlFaceTexture({
  number,
  glyph,
  background = "#4c6f78",
  foreground = "#ffffff",
  layout = "button"
}) {
  const vertical = layout === "verticalLever";
  const horizontal = layout === "horizontalLever";
  const canvas = document.createElement("canvas");
  canvas.width = horizontal ? 384 : 256;
  canvas.height = vertical ? 384 : 256;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  if (layout === "button") {
    const gradient = context.createRadialGradient(
      width * 0.36,
      height * 0.28,
      width * 0.04,
      width * 0.5,
      height * 0.5,
      width * 0.7
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.08, background);
    gradient.addColorStop(0.72, background);
    gradient.addColorStop(1, "#22343a");
    context.save();
    context.beginPath();
    context.arc(width * 0.5, height * 0.5, width * 0.47, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.restore();
    context.beginPath();
    context.arc(width * 0.5, height * 0.5, width * 0.455, 0, Math.PI * 2);
    context.strokeStyle = "rgba(255,255,255,.72)";
    context.lineWidth = 9;
    context.stroke();
  }

  const iconFill = "#16384b";
  const iconOutline = "#fff9df";
  const drawSolidArrow = (centerX, centerY, direction, scale = 1) => {
    const angle = {
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
      up: -Math.PI / 2
    }[direction] || 0;
    context.save();
    context.translate(centerX, centerY);
    context.rotate(angle);
    context.scale(scale, scale);
    context.beginPath();
    context.moveTo(-72, -18);
    context.lineTo(22, -18);
    context.lineTo(22, -48);
    context.lineTo(82, 0);
    context.lineTo(22, 48);
    context.lineTo(22, 18);
    context.lineTo(-72, 18);
    context.closePath();
    context.fillStyle = iconFill;
    context.strokeStyle = iconOutline;
    context.lineJoin = "round";
    context.lineWidth = 12;
    context.stroke();
    context.fill();
    context.restore();
  };
  const drawRotationArrow = () => {
    const centerX = width * 0.5;
    const centerY = height * 0.52;
    const radius = width * 0.22;
    const startAngle = 0.2;
    const endAngle = -Math.PI - 0.06;
    const rotationFill = iconFill;
    const rotationOutline = iconOutline;
    context.save();
    context.lineCap = "round";
    context.beginPath();
    context.arc(
      centerX,
      centerY,
      radius,
      startAngle,
      endAngle,
      true
    );
    context.strokeStyle = rotationOutline;
    context.lineWidth = 51;
    context.stroke();
    context.strokeStyle = rotationFill;
    context.lineWidth = 33;
    context.stroke();
    const tipX = centerX + radius * Math.cos(endAngle);
    const tipY = centerY + radius * Math.sin(endAngle);
    const tangentX = Math.sin(endAngle);
    const tangentY = -Math.cos(endAngle);
    const headRotation = Math.PI / 9;
    const headRotationCos = Math.cos(headRotation);
    const headRotationSin = Math.sin(headRotation);
    const headTangentX = tangentX * headRotationCos - tangentY * headRotationSin;
    const headTangentY = tangentX * headRotationSin + tangentY * headRotationCos;
    const headNormalX = -headTangentY;
    const headNormalY = headTangentX;
    const headTipX = tipX + headTangentX * 54;
    const headTipY = tipY + headTangentY * 54;
    const headBaseAX = tipX - headTangentX * 33 + headNormalX * 47;
    const headBaseAY = tipY - headTangentY * 33 + headNormalY * 47;
    const headBaseBX = tipX - headTangentX * 33 - headNormalX * 47;
    const headBaseBY = tipY - headTangentY * 33 - headNormalY * 47;
    context.beginPath();
    context.moveTo(headTipX, headTipY);
    context.lineTo(headBaseAX, headBaseAY);
    context.lineTo(headBaseBX, headBaseBY);
    context.closePath();
    context.fillStyle = rotationFill;
    context.fill();
    context.beginPath();
    context.moveTo(headBaseAX, headBaseAY);
    context.lineTo(headTipX, headTipY);
    context.lineTo(headBaseBX, headBaseBY);
    context.strokeStyle = rotationOutline;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.lineWidth = 18;
    context.stroke();
    context.restore();
  };

  context.textAlign = "center";
  context.textBaseline = "middle";
  if (horizontal) {
    drawSolidArrow(width * 0.25, height * 0.52, "left", 1.06);
    drawSolidArrow(width * 0.75, height * 0.52, "right", 1.06);
  } else if (vertical) {
    drawSolidArrow(width * 0.5, height * 0.25, "up", 1.06);
    drawSolidArrow(width * 0.5, height * 0.75, "down", 1.06);
  } else if (glyph === "下降") {
    context.font = "900 106px 'Noto Sans JP', 'Yu Gothic', system-ui, sans-serif";
    context.fillStyle = iconFill;
    context.strokeStyle = iconOutline;
    context.lineJoin = "round";
    context.lineWidth = 13;
    context.strokeText("下降", width * 0.5, height * 0.54);
    context.fillText("下降", width * 0.5, height * 0.54);
  } else if (glyph === "→") {
    drawSolidArrow(width * 0.5, height * 0.52, "right", 1);
  } else if (glyph === "↑") {
    drawSolidArrow(width * 0.5, height * 0.52, "up", 1);
  } else if (glyph === "↺") {
    drawRotationArrow();
  } else {
    context.font = "900 166px system-ui, sans-serif";
    context.fillStyle = iconFill;
    context.strokeStyle = iconOutline;
    context.lineJoin = "round";
    context.lineWidth = 12;
    context.strokeText(glyph, width * 0.5, height * 0.54);
    context.fillText(glyph, width * 0.5, height * 0.54);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createMachineControlNumberTexture(number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 128, 128);
  const gradient = context.createRadialGradient(45, 35, 4, 64, 64, 60);
  gradient.addColorStop(0, "#fff9c9");
  gradient.addColorStop(0.2, "#ffd95c");
  gradient.addColorStop(1, "#d59b18");
  context.beginPath();
  context.arc(64, 64, 55, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = "#fff4ad";
  context.stroke();
  context.fillStyle = "#3d2b05";
  context.font = "900 88px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#3d2b05";
  context.lineJoin = "round";
  context.lineWidth = 2.4;
  context.strokeText(String(number), 64, 68);
  context.fillText(String(number), 64, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createMachineControlPlaqueGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.34, "rgba(255,249,183,.05)");
  gradient.addColorStop(0.66, "rgba(255,225,91,.9)");
  gradient.addColorStop(0.88, "rgba(255,184,24,.26)");
  gradient.addColorStop(1, "rgba(255,170,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function svgToFabricTexture(svg, renderer) {
  return new Promise((resolve, reject) => {
    const source = sanitizeSvg(svg);
    if (!source.includes("<svg")) {
      reject(new Error("SVG texture is missing"));
      return;
    }
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, 512, 512);
        context.drawImage(image, 0, 0, 512, 512);
        context.globalCompositeOperation = "multiply";
        context.globalAlpha = 0.08;
        context.strokeStyle = "#334047";
        context.lineWidth = 1;
        for (let position = 3; position < 512; position += 7) {
          context.beginPath();
          context.moveTo(position, 0);
          context.lineTo(position + 2, 512);
          context.stroke();
          context.beginPath();
          context.moveTo(0, position);
          context.lineTo(512, position + 2);
          context.stroke();
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = "source-over";
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        resolve(texture);
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.onerror = error => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}

class ImasoraCompanionCatcherGame {
  constructor(root, options = {}) {
    this.root = root;
    this.roster = Array.isArray(options.roster)
      ? options.roster.filter(item => item?.id && item?.frontSvg)
      : [];
    this.destroyed = false;
    this.frame = 0;
    this.lastTimestamp = 0;
    this.elapsed = 0;
    this.phase = "horizontal";
    this.clawStarNeonMode = "default";
    this.phaseTime = 0;
    this.attemptsRemaining = MAX_ATTEMPTS;
    this.caughtCount = 0;
    this.score = 0;
    this.caughtNames = [];
    this.attemptCaught = 0;
    this.lastPlushStartLayoutIndex = -1;
    this.grip = null;
    this.gripAttempted = false;
    this.releaseStarted = false;
    this.releaseProngClosure = 1;
    this.gripClosureLock = null;
    this.plushes = [];
    this.beltSlats = [];
    this.cloudPuffLayout = [];
    this.cloudConveyorPuffs = null;
    this.cloudTransform = new THREE.Object3D();
    this.prongVisuals = [];
    this.prongBodies = [];
    this.prongSegments = [];
    this.prongContactLift = [0, 0, 0];
    this.prongContactHold = [0, 0, 0];
    this.prongContactStrength = [0, 0, 0];
    this.prongStopClawY = null;
    this.moundSampleLocalPoint = new CANNON.Vec3();
    this.moundSampleWorldPoint = new CANNON.Vec3();
    this.plushMoundShapePoint = new CANNON.Vec3();
    this.plushMoundBodyPoint = new CANNON.Vec3();
    this.plushMoundWorldPoint = new CANNON.Vec3();
    this.plushMoundVisualHalfExtents = new CANNON.Vec3();
    this.plushMoundIdentity = new CANNON.Quaternion();
    this.timers = new Set();
    this.textureTasks = new Set();
    this.machineControlNumberPlaques = {};
    this.controlPointerId = null;
    this.activeHandle = null;
    this.controlCaptureElement = null;
    this.pendingFineLever = null;
    this.descentButtonPressedUntil = 0;
    this.carriage = {
      position: new THREE.Vector3(HOME_POSITION.x, CARRIAGE_Y, HOME_POSITION.z),
      target: new THREE.Vector3(HOME_POSITION.x, CARRIAGE_Y, HOME_POSITION.z),
      velocity: new THREE.Vector3()
    };
    this.cableLength = 1.25;
    this.cableTarget = 1.25;
    this.grabCableLength = MAX_GRAB_CABLE_LENGTH;
    this.prongClosure = 0;
    this.appliedProngClosure = 0;
    this.clawYaw = 0;
    this.rotationTravel = 0;
    this.clawOrientation = new CANNON.Quaternion();
    this.clawBaseOrientation = new CANNON.Quaternion();
    this.clawYawOrientation = new CANNON.Quaternion();
    this.clawYawBaseOrientation = new CANNON.Quaternion();
    this.clawContactTilt = new CANNON.Quaternion();
    this.clawCableOrientation = new CANNON.Quaternion();
    this.clawIdentity = new CANNON.Quaternion();
    this.clawInverseOrientation = new CANNON.Quaternion();
    this.clawUpAxis = new CANNON.Vec3(0, 1, 0);
    this.clawToAnchor = new CANNON.Vec3(0, 1, 0);
    this.clawRelativePosition = new CANNON.Vec3();
    this.clawHeadUpDirection = new CANNON.Vec3(0, 1, 0);
    this.clawEffectivePosition = new CANNON.Vec3();
    this.clawContactNormal = new CANNON.Vec3(0, 1, 0);
    this.clawContactLocalPoint = new CANNON.Vec3();
    this.clawBasePointOffset = new CANNON.Vec3();
    this.clawTiltedPointOffset = new CANNON.Vec3();
    this.armCollisionNormal = new CANNON.Vec3();
    this.armLocalSupportDirection = new CANNON.Vec3();
    this.armTipLocalNormal = new CANNON.Vec3();
    this.fenceWorldNormal = new CANNON.Vec3();
    this.fenceLocalNormal = new CANNON.Vec3();
    this.fenceLocalUp = new CANNON.Vec3();
    this.fenceUpAxis = new CANNON.Vec3(0, 1, 0);
    this.clawContactLiftY = 0;
    this.boundLoop = this.loop.bind(this);
    this.boundClick = this.handleClick.bind(this);
    this.boundHandleDown = this.handleHandleDown.bind(this);
    this.boundHandleMove = this.handleHandleMove.bind(this);
    this.boundHandleUp = this.handleHandleUp.bind(this);
    this.boundHandleKeyDown = this.handleHandleKeyDown.bind(this);
    this.boundHandleKeyUp = this.handleHandleKeyUp.bind(this);
    this.boundResize = this.resize.bind(this);
  }

  mount() {
    this.root.innerHTML = gameMarkup;
    this.els = {
      viewport: this.root.querySelector("[data-icc-viewport]"),
      canvas: this.root.querySelector("[data-icc-canvas]"),
      callout: this.root.querySelector("[data-icc-callout]"),
      result: this.root.querySelector("[data-icc-result]"),
      attempts: this.root.querySelector("[data-icc-attempts]"),
      caught: this.root.querySelector("[data-icc-caught]"),
      score: this.root.querySelector("[data-icc-score]"),
      horizontal: this.root.querySelector('[data-icc-handle="horizontal"]'),
      vertical: this.root.querySelector('[data-icc-handle="vertical"]'),
      rotation: this.root.querySelector('[data-icc-handle="rotation"]'),
      fineHorizontal: this.root.querySelector('[data-icc-fine-group="horizontal"]'),
      fineVertical: this.root.querySelector('[data-icc-fine-group="vertical"]'),
      fineLeft: this.root.querySelector('[data-icc-fine="left"]'),
      fineRight: this.root.querySelector('[data-icc-fine="right"]'),
      fineUp: this.root.querySelector('[data-icc-fine="up"]'),
      fineDown: this.root.querySelector('[data-icc-fine="down"]'),
      stop: this.root.querySelector('[data-icc-handle="stop"]'),
      stopLabel: this.root.querySelector("[data-icc-stop-label]")
    };
    this.root.addEventListener("click", this.boundClick);
    this.root.addEventListener("pointerdown", this.boundHandleDown);
    window.addEventListener("pointermove", this.boundHandleMove);
    window.addEventListener("pointerup", this.boundHandleUp);
    window.addEventListener("pointercancel", this.boundHandleUp);
    this.root.addEventListener("keydown", this.boundHandleKeyDown);
    this.root.addEventListener("keyup", this.boundHandleKeyUp);
    try {
      this.setupRenderer();
      this.setupPhysics();
      this.setupScene();
      this.resetGame();
      if (window.ResizeObserver) {
        this.resizeObserver = new window.ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.els.viewport);
      } else {
        window.addEventListener("resize", this.boundResize);
      }
      this.resize();
      this.frame = requestAnimationFrame(this.boundLoop);
    } catch (error) {
      console.error("イマソラキャラクターキャッチャー3Dの起動に失敗しました。", error);
      this.showFatalError();
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.calloutTimer);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.boundResize);
    this.root.removeEventListener("click", this.boundClick);
    this.root.removeEventListener("pointerdown", this.boundHandleDown);
    window.removeEventListener("pointermove", this.boundHandleMove);
    window.removeEventListener("pointerup", this.boundHandleUp);
    window.removeEventListener("pointercancel", this.boundHandleUp);
    this.root.removeEventListener("keydown", this.boundHandleKeyDown);
    this.root.removeEventListener("keyup", this.boundHandleKeyUp);
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.textureTasks.clear();
    if (this.scene) {
      this.scene.traverse(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        } else {
          object.material?.map?.dispose?.();
          object.material?.dispose?.();
        }
      });
    }
    this.fabricTexture?.dispose?.();
    this.renderer?.dispose?.();
    this.renderer?.forceContextLoss?.();
    this.root.innerHTML = "";
  }

  schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (!this.destroyed) callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.els.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance"
    });
    const lowMemory = Number(navigator.deviceMemory || 8) <= 4;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowMemory ? 1.15 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeaf8f5);
    this.scene.fog = new THREE.Fog(0xeaf8f5, 14, 27);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    this.camera.position.set(
      FRONT_CAMERA_POSITION.x,
      FRONT_CAMERA_POSITION.y,
      FRONT_CAMERA_POSITION.z
    );
    this.cameraLookTarget = new THREE.Vector3(
      FRONT_CAMERA_TARGET.x,
      FRONT_CAMERA_TARGET.y,
      FRONT_CAMERA_TARGET.z
    );
    this.cameraDesiredPosition = this.camera.position.clone();
    this.cameraDesiredLookTarget = this.cameraLookTarget.clone();
    this.camera.lookAt(this.cameraLookTarget);
    this.fabricTexture = createFabricTexture();
  }

  setupPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0)
    });
    this.world.allowSleep = true;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 20;
    this.world.solver.tolerance = 1e-8;
    this.world.defaultContactMaterial.friction = 0.58;
    this.world.defaultContactMaterial.restitution = 0.005;
    this.world.defaultContactMaterial.contactEquationStiffness = 2e8;
    this.world.defaultContactMaterial.contactEquationRelaxation = 3;
    this.world.defaultContactMaterial.frictionEquationStiffness = 8e7;
    this.world.defaultContactMaterial.frictionEquationRelaxation = 3;
    this.beltMaterial = new CANNON.Material("belt");
    this.plushMaterial = new CANNON.Material("plush");
    this.prongMaterial = new CANNON.Material("prong");
    this.moundMaterial = new CANNON.Material("center-mound");
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.beltMaterial,
      this.plushMaterial,
      { friction: 0.62, restitution: 0.035, contactEquationStiffness: 1e8 }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.prongMaterial,
      this.plushMaterial,
      {
        friction: 0.12,
        restitution: 0,
        contactEquationStiffness: 1.5e8,
        contactEquationRelaxation: 4
      }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.moundMaterial,
      this.plushMaterial,
      {
        friction: MOUND_PLUSH_FRICTION,
        restitution: 0.01,
        contactEquationStiffness: 1.2e8,
        contactEquationRelaxation: 4
      }
    ));
    const floor = new CANNON.Body({
      mass: 0,
      material: this.beltMaterial,
      shape: new CANNON.Plane()
    });
    floor.position.set(0, BELT_SURFACE_Y - 0.06, 0);
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(floor);
    this.floorBody = floor;
    this.createCenterMoundPhysics();
    this.createRailPhysics(
      OUTER_FENCE_RX,
      OUTER_FENCE_RZ,
      0.48
    );
  }

  createCenterMoundPhysics() {
    const halfExtent = CENTER_MOUND_RADIUS_X;
    const elementSize = (halfExtent * 2) / (CENTER_MOUND_GRID_SIZE - 1);
    const heightData = [];
    for (let xIndex = 0; xIndex < CENTER_MOUND_GRID_SIZE; xIndex += 1) {
      const x = -halfExtent + xIndex * elementSize;
      const column = [];
      for (let zIndex = 0; zIndex < CENTER_MOUND_GRID_SIZE; zIndex += 1) {
        const z = halfExtent - zIndex * elementSize;
        column.push(centerMoundHeightAt(x, z));
      }
      heightData.push(column);
    }
    const shape = new CANNON.Heightfield(heightData, { elementSize });
    const body = new CANNON.Body({
      mass: 0,
      material: this.moundMaterial,
      shape
    });
    body.position.set(-halfExtent, CENTER_MOUND_BASE_Y, halfExtent);
    body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(body);
    this.centerMoundBody = body;
  }

  createRailPhysics(rx, rz, halfHeight = 0.34) {
    const segments = 42;
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const point = ellipsePoint(angle, rx, rz);
      const tangent = ellipseTangent(angle, rx, rz);
      const next = ellipsePoint(angle + (Math.PI * 2) / segments, rx, rz);
      const length = Math.hypot(next.x - point.x, next.z - point.z) * 1.12;
      const body = new CANNON.Body({
        mass: 0,
        material: this.beltMaterial,
        shape: new CANNON.Box(new CANNON.Vec3(length / 2, halfHeight, 0.075))
      });
      body.position.set(point.x, BELT_SURFACE_Y - 0.04 + halfHeight, point.z);
      body.quaternion.setFromEuler(0, Math.atan2(-tangent.z, tangent.x), 0);
      this.world.addBody(body);
    }
  }

  setupScene() {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xe5bfd0, 2.35);
    this.scene.add(hemisphere);
    const key = new THREE.DirectionalLight(0xfff8e8, 3.15);
    key.position.set(4.8, 10.5, 6.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0004;
    this.scene.add(key);
    const pink = new THREE.PointLight(0xff8fba, 13, 12, 2);
    pink.position.set(-4.1, 4.2, 2.2);
    this.scene.add(pink);
    const mint = new THREE.PointLight(0x77dfc5, 12, 12, 2);
    mint.position.set(4.2, 4.5, -1.8);
    this.scene.add(mint);
    this.createPlatform();
    this.createConveyor();
    this.createPrizeHole();
    this.createMachineControlConsole();
    this.createGantry();
    this.createClaw();
  }

  createPlatform() {
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8a4ba,
      roughness: 0.72,
      metalness: 0.08
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.55, 7.4), baseMaterial);
    base.position.y = 0.25;
    base.receiveShadow = true;
    this.scene.add(base);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6d178,
      emissive: 0xd89535,
      emissiveIntensity: 0.035,
      roughness: 0.86,
      metalness: 0.015
    });
    const centerMound = new THREE.Mesh(createCenterMoundGeometry(), centerMaterial);
    centerMound.position.y = CENTER_MOUND_BASE_Y;
    centerMound.castShadow = true;
    centerMound.receiveShadow = true;
    this.scene.add(centerMound);
    const rearWall = new THREE.Mesh(
      new THREE.BoxGeometry(10.8, 6.8, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xb3a5dc, roughness: 0.84 })
    );
    rearWall.position.set(0, 3.15, -3.55);
    rearWall.receiveShadow = true;
    this.scene.add(rearWall);
    const panels = [
      { x: -3.6, color: 0xf597b9 },
      { x: 0, color: 0xf6cd69 },
      { x: 3.6, color: 0x78d7bd }
    ];
    panels.forEach(panel => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.9, 1.35, 0.12),
        new THREE.MeshStandardMaterial({
          color: panel.color,
          emissive: panel.color,
          emissiveIntensity: 0.08,
          roughness: 0.72
        })
      );
      mesh.position.set(panel.x, 4.55, -3.39);
      this.scene.add(mesh);
    });
  }

  createConveyor() {
    const cloudPathShape = new THREE.Shape();
    cloudPathShape.absellipse(
      0,
      0,
      BELT_RX + BELT_HALF_WIDTH,
      BELT_RZ + BELT_HALF_WIDTH,
      0,
      Math.PI * 2,
      false
    );
    const cloudPathOpening = new THREE.Path();
    cloudPathOpening.absellipse(
      0,
      0,
      BELT_RX - BELT_HALF_WIDTH,
      BELT_RZ - BELT_HALF_WIDTH,
      0,
      Math.PI * 2,
      true
    );
    cloudPathShape.holes.push(cloudPathOpening);
    const cloudMistBed = new THREE.Mesh(
      new THREE.ShapeGeometry(cloudPathShape, 96),
      new THREE.MeshStandardMaterial({
        color: 0xc8efff,
        emissive: 0x8ddcff,
        emissiveIntensity: 0.12,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 0.72
      })
    );
    cloudMistBed.rotation.x = -Math.PI / 2;
    cloudMistBed.position.y = BELT_SURFACE_Y - 0.105;
    cloudMistBed.receiveShadow = true;
    this.scene.add(cloudMistBed);

    this.cloudPuffLayout = [
      { x: -0.24, y: 0.005, z: -0.56, scale: [0.66, 0.58, 0.6] },
      { x: 0.2, y: 0.045, z: -0.29, scale: [0.74, 0.66, 0.66] },
      { x: -0.08, y: 0.11, z: 0.04, scale: [0.82, 0.78, 0.72] },
      { x: 0.22, y: 0.045, z: 0.39, scale: [0.7, 0.64, 0.62] },
      { x: -0.22, y: 0, z: 0.59, scale: [0.64, 0.56, 0.57] },
      { x: -0.34, y: 0.1, z: -0.15, scale: [0.56, 0.66, 0.52] },
      { x: 0.34, y: 0.095, z: 0.18, scale: [0.58, 0.68, 0.54] }
    ];
    const cloudCount = 36;
    const cloudPuffGeometry = new THREE.SphereGeometry(0.5, 14, 10);
    const cloudPuffMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xa8ddff,
      emissiveIntensity: 0.055,
      roughness: 1,
      metalness: 0
    });
    this.cloudConveyorPuffs = new THREE.InstancedMesh(
      cloudPuffGeometry,
      cloudPuffMaterial,
      cloudCount * this.cloudPuffLayout.length
    );
    this.cloudConveyorPuffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cloudConveyorPuffs.castShadow = false;
    this.cloudConveyorPuffs.receiveShadow = true;
    const cloudColors = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xe1f6ff),
      new THREE.Color(0xeafff8),
      new THREE.Color(0xffedf5)
    ];
    let instanceIndex = 0;
    for (let index = 0; index < cloudCount; index += 1) {
      this.beltSlats.push({
        userData: { angle: (index / cloudCount) * Math.PI * 2 }
      });
      this.cloudPuffLayout.forEach((puff, puffIndex) => {
        this.cloudConveyorPuffs.setColorAt(
          instanceIndex,
          cloudColors[(index + puffIndex) % cloudColors.length]
        );
        instanceIndex += 1;
      });
    }
    this.cloudConveyorPuffs.instanceColor.needsUpdate = true;
    this.scene.add(this.cloudConveyorPuffs);
    this.updateBeltVisuals(0);
    this.createOuterFence();
  }

  createOuterFence() {
    const segments = 42;
    const rx = OUTER_FENCE_RX;
    const rz = OUTER_FENCE_RZ;
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x74d6c3,
      emissive: 0x3ba98f,
      emissiveIntensity: 0.08,
      roughness: 0.34,
      metalness: 0.3
    });
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd8e8,
      emissive: 0xf582ae,
      emissiveIntensity: 0.07,
      roughness: 0.38,
      metalness: 0.22
    });
    const posts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.065, 0.075, 1, 10),
      postMaterial,
      segments
    );
    const rails = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      railMaterial,
      segments * 2
    );
    posts.castShadow = true;
    posts.receiveShadow = true;
    rails.castShadow = true;
    rails.receiveShadow = true;

    const transform = new THREE.Object3D();
    let railIndex = 0;
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const nextAngle = ((index + 1) / segments) * Math.PI * 2;
      const point = ellipsePoint(angle, rx, rz);
      const next = ellipsePoint(nextAngle, rx, rz);
      const dx = next.x - point.x;
      const dz = next.z - point.z;
      const length = Math.hypot(dx, dz) * 1.06;
      const yaw = Math.atan2(-dz, dx);

      transform.position.set(point.x, BELT_SURFACE_Y + 0.46, point.z);
      transform.rotation.set(0, 0, 0);
      transform.scale.set(1, 1, 1);
      transform.updateMatrix();
      posts.setMatrixAt(index, transform.matrix);

      [BELT_SURFACE_Y + 0.2, BELT_SURFACE_Y + 0.68].forEach(height => {
        transform.position.set((point.x + next.x) / 2, height, (point.z + next.z) / 2);
        transform.rotation.set(0, yaw, 0);
        transform.scale.set(length, 0.075, 0.075);
        transform.updateMatrix();
        rails.setMatrixAt(railIndex, transform.matrix);
        railIndex += 1;
      });
    }
    posts.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    this.scene.add(posts, rails);
  }

  createPrizeHole() {
    this.prizeHoleGroup = new THREE.Group();
    this.prizeHoleGroup.position.set(
      PRIZE_HOLE_POSITION.x,
      BELT_SURFACE_Y - 0.065,
      PRIZE_HOLE_POSITION.z
    );
    const createRectangularFrameGeometry = (outerScale, innerScale) => {
      const outerX = PRIZE_HOLE_RADIUS_X * outerScale;
      const outerZ = PRIZE_HOLE_RADIUS_Z * outerScale;
      const innerX = PRIZE_HOLE_RADIUS_X * innerScale;
      const innerZ = PRIZE_HOLE_RADIUS_Z * innerScale;
      const shape = new THREE.Shape();
      shape.moveTo(-outerX, -outerZ);
      shape.lineTo(outerX, -outerZ);
      shape.lineTo(outerX, outerZ);
      shape.lineTo(-outerX, outerZ);
      shape.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-innerX, innerZ);
      hole.lineTo(innerX, innerZ);
      hole.lineTo(innerX, -innerZ);
      hole.lineTo(-innerX, -innerZ);
      hole.closePath();
      shape.holes.push(hole);
      return new THREE.ShapeGeometry(shape);
    };
    const opening = new THREE.Mesh(
      new THREE.PlaneGeometry(
        PRIZE_HOLE_RADIUS_X * 1.6,
        PRIZE_HOLE_RADIUS_Z * 1.6
      ),
      new THREE.MeshStandardMaterial({
        color: 0x111426,
        emissive: 0x080a18,
        emissiveIntensity: 0.18,
        roughness: 0.96,
        metalness: 0.02,
        side: THREE.DoubleSide
      })
    );
    opening.rotation.x = -Math.PI / 2;
    opening.position.y = 0.012;
    opening.receiveShadow = true;
    this.prizeHoleGroup.add(opening);

    const rim = new THREE.Mesh(
      createRectangularFrameGeometry(1, 0.76),
      new THREE.MeshStandardMaterial({
        color: 0xf3a7c6,
        emissive: 0xb82f72,
        emissiveIntensity: 0.22,
        roughness: 0.34,
        metalness: 0.48,
        side: THREE.DoubleSide
      })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.026;
    rim.castShadow = true;
    rim.receiveShadow = true;
    this.prizeHoleGroup.add(rim);

    const innerGlow = new THREE.Mesh(
      createRectangularFrameGeometry(0.76, 0.68),
      new THREE.MeshBasicMaterial({
        color: 0x72f2d0,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide
      })
    );
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.y = 0.034;
    this.prizeHoleGroup.add(innerGlow);
    this.scene.add(this.prizeHoleGroup);
  }

  createMachineControlConsole() {
    const frontPanel = {
      centerX: 1.02,
      centerZ: 3.59,
      width: 3,
      depth: 1.24,
      fasciaSide: "south"
    };
    const eastPanel = {
      centerX: 4.78,
      centerZ: 0,
      width: 1,
      depth: 2.9,
      fasciaSide: "east"
    };
    const consoleGroup = new THREE.Group();
    consoleGroup.name = "companion-catcher-integrated-control-console";
    this.machineControlConsole = consoleGroup;
    this.machineControlVisuals = {};
    this.machineControlAnchors = {};
    this.machineControlNumberPlaques = {};
    this.controlProjectionPoint = new THREE.Vector3();
    this.nextControlProjectionTime = 0;

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0xe4b64f,
      emissive: 0x8a5f10,
      emissiveIntensity: 0.06,
      roughness: 0.34,
      metalness: 0.62
    });
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x8acdc3,
      emissive: 0x2f796f,
      emissiveIntensity: 0.08,
      roughness: 0.54,
      metalness: 0.24
    });
    const fasciaMaterial = new THREE.MeshStandardMaterial({
      color: 0xd681a6,
      roughness: 0.64,
      metalness: 0.16
    });
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0xdfe6e5,
      roughness: 0.22,
      metalness: 0.84
    });
    const addConsoleDeck = ({ centerX, centerZ, width, depth, fasciaSide }) => {
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.1, 0.075, depth + 0.1),
        trimMaterial
      );
      trim.position.set(centerX, 0.57, centerZ);
      trim.castShadow = true;
      trim.receiveShadow = true;
      consoleGroup.add(trim);

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.09, depth),
        panelMaterial
      );
      panel.position.set(centerX, 0.625, centerZ);
      panel.castShadow = true;
      panel.receiveShadow = true;
      consoleGroup.add(panel);

      const fascia = fasciaSide === "east"
        ? new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.25, depth + 0.06),
          fasciaMaterial
        )
        : new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.06, 0.25, 0.1),
          fasciaMaterial
        );
      if (fasciaSide === "east") {
        fascia.position.set(centerX + width * 0.5 + 0.03, 0.455, centerZ);
      } else {
        fascia.position.set(centerX, 0.455, centerZ + depth * 0.5 + 0.03);
      }
      fascia.castShadow = true;
      fascia.receiveShadow = true;
      consoleGroup.add(fascia);

      [
        [centerX - width * 0.43, centerZ - depth * 0.43],
        [centerX + width * 0.43, centerZ - depth * 0.43],
        [centerX - width * 0.43, centerZ + depth * 0.43],
        [centerX + width * 0.43, centerZ + depth * 0.43]
      ].forEach(([x, z]) => {
        const screw = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.022, 18),
          screwMaterial
        );
        screw.position.set(x, 0.69, z);
        screw.castShadow = true;
        consoleGroup.add(screw);
      });
    };
    addConsoleDeck(frontPanel);
    addConsoleDeck(eastPanel);

    const numberPlaqueRimMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9a226,
      emissive: 0x6d4300,
      emissiveIntensity: 0.08,
      roughness: 0.3,
      metalness: 0.48
    });
    const numberPlaqueGlowTexture = createMachineControlPlaqueGlowTexture();
    const addNumberPlaque = (number, x, z, rotationZ = 0) => {
      const rimMaterial = numberPlaqueRimMaterial.clone();
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.135, 0.135, 0.035, 28),
        rimMaterial
      );
      rim.position.set(x, 0.688, z);
      rim.castShadow = true;
      rim.receiveShadow = true;
      consoleGroup.add(rim);
      const faceMaterial = new THREE.MeshBasicMaterial({
        map: createMachineControlNumberTexture(number),
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.235), faceMaterial);
      face.rotation.x = -Math.PI / 2;
      face.rotation.z = rotationZ;
      face.position.set(x, 0.708, z);
      face.renderOrder = 5;
      consoleGroup.add(face);
      const glowMaterial = new THREE.MeshBasicMaterial({
        map: numberPlaqueGlowTexture,
        color: 0xffed78,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.218, 0.218), glowMaterial);
      glow.rotation.x = -Math.PI / 2;
      glow.position.set(x, 0.711, z);
      glow.renderOrder = 6;
      consoleGroup.add(glow);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd33d,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.151, 0.025, 10, 32),
        haloMaterial
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(x, 0.714, z);
      halo.renderOrder = 4;
      consoleGroup.add(halo);
      this.machineControlNumberPlaques[number] = {
        rim,
        face,
        glow,
        halo,
        rimMaterial,
        faceMaterial,
        glowMaterial,
        haloMaterial
      };
    };

    this.numberPlaqueNeonLight = new THREE.PointLight(0xffd45c, 0, 1.15, 2);
    this.numberPlaqueNeonLight.position.y = 0.93;
    consoleGroup.add(this.numberPlaqueNeonLight);

    const addPushControl = ({
      key,
      phase,
      x,
      z,
      color,
      background,
      glyph,
      radius = 0.205,
      halfWidth = 0.36,
      faceRotationZ = 0
    }) => {
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x263f46,
        emissive: color,
        emissiveIntensity: 0.03,
        roughness: 0.28,
        metalness: 0.68
      });
      const sideMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.04,
        roughness: 0.25,
        metalness: 0.36
      });
      const controlNumber = key === "stop" ? 6 : ({ horizontal: 1, vertical: 2, rotation: 3 })[key];
      const faceTexture = createMachineControlFaceTexture({
        number: controlNumber,
        glyph,
        background,
        foreground: "#ffffff"
      });
      const faceMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.06,
        roughness: 0.25,
        metalness: 0.18
      });
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.075, radius + 0.088, 0.07, 36),
        baseMaterial
      );
      base.position.set(x, 0.695, z);
      base.castShadow = true;
      base.receiveShadow = true;
      consoleGroup.add(base);

      const capGroup = new THREE.Group();
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.9, radius, 0.095, 36),
        [sideMaterial, faceMaterial, sideMaterial]
      );
      cap.castShadow = true;
      cap.receiveShadow = true;
      capGroup.add(cap);
      const faceLabel = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 1.84, radius * 1.84),
        new THREE.MeshBasicMaterial({
          map: faceTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      faceLabel.rotation.x = -Math.PI / 2;
      faceLabel.rotation.z = faceRotationZ;
      faceLabel.position.y = 0.049;
      faceLabel.renderOrder = 4;
      capGroup.add(faceLabel);
      capGroup.position.set(x, 0.775, z);
      consoleGroup.add(capGroup);

      const haloMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.085, 0.03, 10, 36),
        haloMaterial
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(x, 0.79, z);
      consoleGroup.add(halo);
      const plaquePosition = NUMBER_PLAQUE_BASE_POSITIONS[controlNumber];
      addNumberPlaque(controlNumber, plaquePosition.x, plaquePosition.z, faceRotationZ);

      this.machineControlVisuals[key] = {
        key,
        number: controlNumber,
        phase,
        kind: "button",
        baseMaterial,
        faceMaterial,
        sideMaterial,
        haloMaterial,
        capGroup,
        restY: capGroup.position.y
      };
      this.machineControlAnchors[key] = {
        x,
        y: 0.79,
        z,
        halfWidth,
        halfDepth: 0.33
      };
    };

    const createRectangularHalo = (width, depth, color) => {
      const haloMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const haloGroup = new THREE.Group();
      const thickness = 0.03;
      [
        { w: width, d: thickness, x: 0, z: -depth * 0.5 },
        { w: width, d: thickness, x: 0, z: depth * 0.5 },
        { w: thickness, d: depth, x: -width * 0.5, z: 0 },
        { w: thickness, d: depth, x: width * 0.5, z: 0 }
      ].forEach(part => {
        const strip = new THREE.Mesh(
          new THREE.BoxGeometry(part.w, 0.018, part.d),
          haloMaterial
        );
        strip.position.set(part.x, 0, part.z);
        haloGroup.add(strip);
      });
      return { haloGroup, haloMaterial };
    };

    const addLeverControl = ({
      key,
      phase,
      x,
      z,
      number,
      color,
      layout,
      sideFacing = false,
      faceRotationZ = 0,
      indicatorOffsetX = 0,
      indicatorOffsetZ = 0
    }) => {
      const horizontal = layout === "horizontalLever";
      const frameWidth = horizontal ? 0.7 : 0.35;
      const frameDepth = horizontal ? 0.35 : 0.7;
      const slotWidth = horizontal ? 0.52 : 0.1;
      const slotDepth = horizontal ? 0.1 : 0.52;
      const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xb9cece,
        emissive: color,
        emissiveIntensity: 0.03,
        roughness: 0.34,
        metalness: 0.62
      });
      const slotMaterial = new THREE.MeshStandardMaterial({
        color: 0x1c3036,
        roughness: 0.52,
        metalness: 0.44
      });
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(frameWidth, 0.065, frameDepth),
        frameMaterial
      );
      frame.position.set(x, 0.695, z);
      frame.castShadow = true;
      frame.receiveShadow = true;
      consoleGroup.add(frame);
      const slot = new THREE.Mesh(
        new THREE.BoxGeometry(slotWidth, 0.045, slotDepth),
        slotMaterial
      );
      slot.position.set(x, 0.73, z);
      slot.receiveShadow = true;
      consoleGroup.add(slot);

      const labelTexture = createMachineControlFaceTexture({
        number,
        glyph: "",
        foreground: "#fff5a6",
        layout: sideFacing ? "horizontalLever" : layout
      });
      const embedDirectionsBelowLever = number === 4 || sideFacing;
      const embedDirectionsOnEastSide = embedDirectionsBelowLever && sideFacing;
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(
          embedDirectionsBelowLever ? 0.62 : horizontal ? 0.45 : 0.24,
          embedDirectionsBelowLever ? 0.2 : horizontal ? 0.24 : 0.45
        ),
        new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      label.rotation.x = -Math.PI / 2;
      label.rotation.z = faceRotationZ;
      label.position.set(
        embedDirectionsOnEastSide
          ? x + 0.28
          : embedDirectionsBelowLever
            ? x
            : x + indicatorOffsetX,
        embedDirectionsBelowLever ? 0.686 : 0.78,
        embedDirectionsOnEastSide
          ? z
          : embedDirectionsBelowLever
            ? z + 0.28
            : z + indicatorOffsetZ
      );
      label.renderOrder = 5;
      const directionPlateColor = new THREE.Color(0xf2b39f);
      const directionPlateRim = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.018, 0.29),
        new THREE.MeshStandardMaterial({
          color: 0xd3a646,
          emissive: 0x74500f,
          emissiveIntensity: 0.04,
          roughness: 0.42,
          metalness: 0.46
        })
      );
      directionPlateRim.position.set(
        x + indicatorOffsetX,
        0.744,
        z + indicatorOffsetZ
      );
      directionPlateRim.castShadow = true;
      directionPlateRim.receiveShadow = true;
      const directionPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.03, 0.25),
        new THREE.MeshStandardMaterial({
          color: directionPlateColor,
          emissive: 0x9f4e3f,
          emissiveIntensity: 0.04,
          roughness: 0.62,
          metalness: 0.08
        })
      );
      directionPlate.position.set(
        x + indicatorOffsetX,
        0.76,
        z + indicatorOffsetZ
      );
      directionPlate.castShadow = true;
      directionPlate.receiveShadow = true;
      if (!embedDirectionsBelowLever) {
        consoleGroup.add(directionPlateRim);
        consoleGroup.add(directionPlate);
      }
      consoleGroup.add(label);

      const mover = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.047, 0.2, 16),
        new THREE.MeshStandardMaterial({
          color: 0xdfe8e8,
          roughness: 0.22,
          metalness: 0.78
        })
      );
      stem.position.y = 0.1;
      stem.castShadow = true;
      mover.add(stem);
      const knobMaterial = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.08,
        roughness: 0.27,
        metalness: 0.24
      });
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.095, 22, 16), knobMaterial);
      knob.position.y = 0.225;
      knob.castShadow = true;
      mover.add(knob);
      mover.position.set(x, 0.725, z);
      consoleGroup.add(mover);

      const { haloGroup, haloMaterial } = createRectangularHalo(
        frameWidth + 0.08,
        frameDepth + 0.08,
        color
      );
      haloGroup.position.set(x, 0.772, z);
      consoleGroup.add(haloGroup);
      const plaquePosition = NUMBER_PLAQUE_BASE_POSITIONS[number];
      addNumberPlaque(number, plaquePosition.x, plaquePosition.z, faceRotationZ);

      this.machineControlVisuals[key] = {
        key,
        number,
        phase,
        kind: horizontal ? "horizontalLever" : "verticalLever",
        frameMaterial,
        knobMaterial,
        haloMaterial,
        mover,
        restX: x,
        restZ: z,
        sideFacing
      };
      this.machineControlAnchors[key] = {
        x,
        y: 0.79,
        z,
        halfWidth: horizontal ? 0.98 : sideFacing ? 0.44 : 0.32,
        halfDepth: horizontal ? 0.32 : sideFacing ? 0.75 : 0.42
      };
    };

    const backRowZ = 3.23;
    const frontRowZ = 3.85;
    const frontLeftX = 0.2;
    const frontRightX = 1.86;
    const eastControlX = 4.72;
    const eastButtonZ = 0.78;
    const eastLeverZ = -0.58;

    addPushControl({
      key: "horizontal",
      phase: "horizontal",
      x: frontLeftX,
      z: backRowZ,
      color: 0xe85f97,
      background: "#e85f97",
      glyph: "→"
    });
    addPushControl({
      key: "rotation",
      phase: "rotation",
      x: frontRightX,
      z: backRowZ,
      color: 0x9f76d7,
      background: "#9f76d7",
      glyph: "↺"
    });
    addLeverControl({
      key: "fineHorizontal",
      phase: "fineHorizontal",
      x: frontLeftX,
      z: frontRowZ,
      number: 4,
      color: 0xeb5f9a,
      layout: "horizontalLever",
      indicatorOffsetX: 0.62
    });
    addPushControl({
      key: "stop",
      phase: "fineSettle",
      x: frontRightX,
      z: frontRowZ,
      color: 0xd8495c,
      background: "#d8495c",
      glyph: "下降",
      radius: 0.225,
      halfWidth: 0.34
    });
    addPushControl({
      key: "vertical",
      phase: "vertical",
      x: eastControlX,
      z: eastButtonZ,
      color: 0x47bda0,
      background: "#47bda0",
      glyph: "→",
      faceRotationZ: Math.PI / 2
    });
    addLeverControl({
      key: "fineVertical",
      phase: "fineVertical",
      x: eastControlX,
      z: eastLeverZ,
      number: 5,
      color: 0x82bf4b,
      layout: "verticalLever",
      sideFacing: true,
      faceRotationZ: Math.PI / 2
    });

    this.scene.add(consoleGroup);
  }

  createGantry() {
    const steel = new THREE.MeshStandardMaterial({
      color: 0xb8c4c7,
      roughness: 0.31,
      metalness: 0.78
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x59686d,
      roughness: 0.38,
      metalness: 0.66
    });
    const posts = [
      [-4.75, -3.15],
      [4.75, -3.15],
      [-4.75, 3.12],
      [4.75, 3.12]
    ];
    posts.forEach(([x, z]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.1, 0.18), dark);
      post.position.set(x, 3.25, z);
      post.castShadow = true;
      this.scene.add(post);
    });
    [
      { size: [9.7, 0.16, 0.18], position: [0, 6.24, -3.15] },
      { size: [9.7, 0.16, 0.18], position: [0, 6.24, 3.12] },
      { size: [0.18, 0.16, 6.4], position: [-4.75, 6.24, 0] },
      { size: [0.18, 0.16, 6.4], position: [4.75, 6.24, 0] },
      { size: [8.2, 0.12, 0.15], position: [0, 6.08, 0] }
    ].forEach(entry => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(...entry.size), steel);
      rail.position.set(...entry.position);
      rail.castShadow = true;
      this.scene.add(rail);
    });
  }

  createClaw() {
    this.carriageVisual = new THREE.Group();
    const carriageMaterial = new THREE.MeshStandardMaterial({
      color: 0xf0c75e,
      roughness: 0.34,
      metalness: 0.54
    });
    const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.38, 0.72), carriageMaterial);
    carriage.castShadow = true;
    this.carriageVisual.add(carriage);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x44545a, roughness: 0.5, metalness: 0.6 });
    [-0.27, 0.27].forEach(x => {
      [-0.25, 0.25].forEach(z => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 12), wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, -0.2, z);
        this.carriageVisual.add(wheel);
      });
    });
    this.scene.add(this.carriageVisual);

    this.cableMaterial = new THREE.LineBasicMaterial({
      color: 0xd2fff5,
      transparent: true,
      opacity: 0.58,
      blending: THREE.AdditiveBlending
    });
    this.cableGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0)
    ]);
    this.cableVisual = new THREE.Line(this.cableGeometry, this.cableMaterial);
    this.scene.add(this.cableVisual);

    this.clawVisual = new THREE.Group();
    const starShape = createStarShape(
      0.52 * CLAW_SIZE_SCALE,
      0.255 * CLAW_SIZE_SCALE
    );
    const starGeometry = new THREE.ExtrudeGeometry(starShape, {
      depth: 0.18 * CLAW_SIZE_SCALE,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.035 * CLAW_SIZE_SCALE,
      bevelThickness: 0.03 * CLAW_SIZE_SCALE,
      curveSegments: 12
    });
    starGeometry.center();
    this.clawStarShellMaterial = new THREE.MeshStandardMaterial({
      color: 0x8fffe2,
      emissive: 0x31d9b4,
      emissiveIntensity: 0.82,
      roughness: 0.2,
      metalness: 0.3
    });
    const starShell = new THREE.Mesh(starGeometry, this.clawStarShellMaterial);
    starShell.castShadow = true;
    this.clawVisual.add(starShell);

    const starFaceGeometry = new THREE.ShapeGeometry(
      createStarShape(0.405 * CLAW_SIZE_SCALE, 0.2 * CLAW_SIZE_SCALE),
      12
    );
    this.clawStarFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe9ac,
      emissive: 0xff6fbd,
      emissiveIntensity: 1.05,
      roughness: 0.24,
      metalness: 0.12,
      side: THREE.DoubleSide
    });
    const starFace = new THREE.Mesh(starFaceGeometry, this.clawStarFaceMaterial);
    starFace.position.z = 0.125 * CLAW_SIZE_SCALE;
    this.clawVisual.add(starFace);

    const starGlowGeometry = new THREE.ShapeGeometry(
      createStarShape(0.6 * CLAW_SIZE_SCALE, 0.295 * CLAW_SIZE_SCALE),
      12
    );
    this.clawStarGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff72bd,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const starGlow = new THREE.Mesh(starGlowGeometry, this.clawStarGlowMaterial);
    starGlow.position.z = -0.115 * CLAW_SIZE_SCALE;
    this.clawVisual.add(starGlow);

    this.clawStarOutlineMaterial = new THREE.LineBasicMaterial({
      color: 0xd2fff5,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const starOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(starGeometry, 18),
      this.clawStarOutlineMaterial
    );
    this.clawVisual.add(starOutline);

    this.clawStarJewelMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff7cf,
      emissive: 0xff9ad0,
      emissiveIntensity: 1.25,
      roughness: 0.16,
      metalness: 0.08
    });
    const starJewel = new THREE.Mesh(
      new THREE.SphereGeometry(0.095 * CLAW_SIZE_SCALE, 18, 12),
      this.clawStarJewelMaterial
    );
    starJewel.position.z = 0.145 * CLAW_SIZE_SCALE;
    this.clawVisual.add(starJewel);
    this.clawStarLight = new THREE.PointLight(0xff8fca, 2.4, 2.8, 2);
    this.clawStarLight.position.set(0, 0, 0.18 * CLAW_SIZE_SCALE);
    this.clawVisual.add(this.clawStarLight);
    const fixtureHeight = 0.32 * CLAW_SIZE_SCALE;
    const fixtureCenterY = 0.19 * CLAW_SIZE_SCALE;
    const fixtureTopY = fixtureCenterY + fixtureHeight * 0.5;
    const fixtureBottomY = fixtureCenterY - fixtureHeight * 0.5;
    const fixtureTopRadius = 0.19 * CLAW_SIZE_SCALE;
    const fixtureBottomRadius = 0.25 * CLAW_SIZE_SCALE;
    const fixtureGeometry = new THREE.CylinderGeometry(
      fixtureTopRadius,
      fixtureBottomRadius,
      fixtureHeight,
      24,
      1,
      true
    );
    this.clawFixtureShellMaterial = new THREE.MeshStandardMaterial({
      color: 0xd2fff5,
      emissive: 0x79e8d4,
      emissiveIntensity: 0.16,
      transparent: true,
      opacity: 0.16,
      roughness: 0.24,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fixtureShell = new THREE.Mesh(fixtureGeometry, this.clawFixtureShellMaterial);
    fixtureShell.position.y = fixtureCenterY;
    fixtureShell.castShadow = false;
    this.clawVisual.add(fixtureShell);

    this.clawFixtureFrameMaterial = new THREE.MeshBasicMaterial({
      color: 0xd2fff5,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending
    });
    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(fixtureTopRadius, 0.014 * CLAW_SIZE_SCALE, 8, 28),
      this.clawFixtureFrameMaterial
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = fixtureTopY;
    const bottomRing = new THREE.Mesh(
      new THREE.TorusGeometry(fixtureBottomRadius, 0.014 * CLAW_SIZE_SCALE, 8, 28),
      this.clawFixtureFrameMaterial
    );
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = fixtureBottomY;
    this.clawVisual.add(topRing, bottomRing);

    const fixtureStrutGeometry = new THREE.CapsuleGeometry(
      0.011 * CLAW_SIZE_SCALE,
      1,
      3,
      6
    );
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const strut = new THREE.Mesh(fixtureStrutGeometry, this.clawFixtureFrameMaterial);
      setMeshBetween(
        strut,
        new THREE.Vector3(
          Math.cos(angle) * fixtureTopRadius,
          fixtureTopY,
          Math.sin(angle) * fixtureTopRadius
        ),
        new THREE.Vector3(
          Math.cos(angle) * fixtureBottomRadius,
          fixtureBottomY,
          Math.sin(angle) * fixtureBottomRadius
        )
      );
      this.clawVisual.add(strut);
    }
    this.setClawStarNeonMode(this.clawStarNeonMode);
    this.createProngVisuals();
    this.scene.add(this.clawVisual);

    this.clawBody = new CANNON.Body({
      mass: 0.94,
      shape: new CANNON.Sphere(0.28 * CLAW_SIZE_SCALE),
      linearDamping: 0.11,
      angularDamping: 0.14,
      fixedRotation: true,
      collisionFilterGroup: 0x0004,
      collisionFilterMask: 0
    });
    this.clawBody.position.set(HOME_POSITION.x, CARRIAGE_Y - 1.25, HOME_POSITION.z);
    this.world.addBody(this.clawBody);
    const colliderSamples = [
      { segment: "upper", amount: 0.02 },
      { segment: "upper", amount: 0.18 },
      { segment: "upper", amount: 0.34 },
      { segment: "upper", amount: 0.5 },
      { segment: "upper", amount: 0.66 },
      { segment: "upper", amount: 0.82 },
      { segment: "upper", amount: 0.98 },
      { segment: "lower", amount: 0.04 },
      { segment: "lower", amount: 0.28 },
      { segment: "lower", amount: 0.52 },
      { segment: "lower", amount: 0.76 },
      { segment: "lower", amount: 1 }
    ];
    for (let prongIndex = 0; prongIndex < 3; prongIndex += 1) {
      colliderSamples.forEach(sample => {
        if (
          prongIndex === TURNER_PRONG_INDEX
          && sample.segment === "lower"
          && sample.amount >= 0.95
        ) return;
        const roundTip = prongIndex !== TURNER_PRONG_INDEX
          && sample.segment === "lower"
          && sample.amount >= 0.95;
        const colliderRadius = roundTip
          ? ROUND_PRONG_TIP_RADIUS + PRONG_TIP_COLLISION_MARGIN
          : PRONG_SHAFT_COLLIDER_RADIUS;
        const body = new CANNON.Body({
          mass: 0,
          type: CANNON.Body.KINEMATIC,
          material: this.prongMaterial,
          shape: new CANNON.Sphere(colliderRadius),
          collisionFilterGroup: 0x0002,
          collisionFilterMask: 0x0001
        });
        this.world.addBody(body);
        this.prongBodies.push({
          body,
          prongIndex,
          segment: sample.segment,
          amount: sample.amount,
          roundTip,
          previousPosition: new CANNON.Vec3(),
          initialized: false
        });
      });
      if (prongIndex === TURNER_PRONG_INDEX) {
        const body = new CANNON.Body({
          mass: 0,
          type: CANNON.Body.KINEMATIC,
          material: this.prongMaterial,
          shape: new CANNON.Box(new CANNON.Vec3(
            TURNER_PRONG_WIDTH / 2 + TURNER_PRONG_COLLISION_MARGIN,
            TURNER_PRONG_TOTAL_THICKNESS / 2 + TURNER_PRONG_THICKNESS_COLLISION_MARGIN,
            TURNER_PRONG_LENGTH / 2 + TURNER_PRONG_COLLISION_MARGIN
          )),
          collisionFilterGroup: 0x0002,
          collisionFilterMask: 0x0001
        });
        const localQuaternion = new CANNON.Quaternion();
        localQuaternion.setFromEuler(
          0,
          Math.PI / 2 - (prongIndex / 3) * Math.PI * 2,
          0
        );
        this.world.addBody(body);
        this.prongBodies.push({
          body,
          prongIndex,
          turnerBlade: true,
          localQuaternion,
          previousPosition: new CANNON.Vec3(),
          initialized: false
        });
      }
    }
  }

  setClawStarNeonMode(mode) {
    const resolvedMode = Object.prototype.hasOwnProperty.call(CLAW_STAR_NEON_PALETTES, mode)
      ? mode
      : "default";
    const palette = CLAW_STAR_NEON_PALETTES[resolvedMode];
    this.clawStarNeonMode = resolvedMode;
    this.clawStarNeonEmissivePower = palette.emissivePower ?? 1;
    if (!this.clawStarShellMaterial) return;
    this.clawStarShellMaterial.color.setHex(palette.shell);
    this.clawStarShellMaterial.emissive.setHex(palette.shellEmissive);
    this.clawStarFaceMaterial.color.setHex(palette.face);
    this.clawStarFaceMaterial.emissive.setHex(palette.faceEmissive);
    this.clawStarGlowMaterial.color.setHex(palette.glow);
    this.clawStarOutlineMaterial.color.setHex(palette.outline);
    this.clawStarJewelMaterial.color.setHex(palette.jewel);
    this.clawStarJewelMaterial.emissive.setHex(palette.jewelEmissive);
    this.clawStarLight.color.setHex(palette.light);
    this.cableMaterial.color.setHex(palette.outline);
    this.clawFixtureShellMaterial.color.setHex(palette.outline);
    this.clawFixtureShellMaterial.emissive.setHex(palette.light);
    this.clawFixtureFrameMaterial.color.setHex(palette.outline);
  }

  createProngVisuals() {
    // Keep every claw surface in the shared depth buffer so plushes can sit between prongs.
    const metal = new THREE.MeshStandardMaterial({
      color: 0xdce5e7,
      roughness: 0.28,
      metalness: 0.8,
      depthTest: true,
      depthWrite: true
    });
    const rubber = new THREE.MeshStandardMaterial({
      color: 0x4b5c61,
      roughness: 0.82,
      metalness: 0.08,
      depthTest: true,
      depthWrite: true
    });
    const segmentGeometry = new THREE.CapsuleGeometry(
      PRONG_SHAFT_VISUAL_RADIUS,
      1,
      5,
      10
    );
    const tipGeometry = new THREE.SphereGeometry(ROUND_PRONG_TIP_RADIUS, 16, 12);
    const turnerMaterial = new THREE.MeshStandardMaterial({
      color: 0xa9eee2,
      emissive: 0x4abda9,
      emissiveIntensity: 0.08,
      roughness: 0.3,
      metalness: 0.58,
      depthTest: true,
      depthWrite: true
    });
    const turnerShape = new THREE.Shape();
    const turnerWidth = TURNER_PRONG_WIDTH;
    const turnerLength = TURNER_PRONG_LENGTH;
    const turnerRadius = 0.075 * CLAW_SIZE_SCALE;
    const halfWidth = turnerWidth / 2;
    const halfLength = turnerLength / 2;
    turnerShape.moveTo(-halfWidth + turnerRadius, -halfLength);
    turnerShape.lineTo(halfWidth - turnerRadius, -halfLength);
    turnerShape.quadraticCurveTo(halfWidth, -halfLength, halfWidth, -halfLength + turnerRadius);
    turnerShape.lineTo(halfWidth, halfLength - turnerRadius);
    turnerShape.quadraticCurveTo(halfWidth, halfLength, halfWidth - turnerRadius, halfLength);
    turnerShape.lineTo(-halfWidth + turnerRadius, halfLength);
    turnerShape.quadraticCurveTo(-halfWidth, halfLength, -halfWidth, halfLength - turnerRadius);
    turnerShape.lineTo(-halfWidth, -halfLength + turnerRadius);
    turnerShape.quadraticCurveTo(-halfWidth, -halfLength, -halfWidth + turnerRadius, -halfLength);
    const turnerGeometry = new THREE.ExtrudeGeometry(turnerShape, {
      depth: TURNER_PRONG_FACE_DEPTH,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.011 * CLAW_SIZE_SCALE,
      bevelThickness: TURNER_PRONG_BEVEL_THICKNESS,
      curveSegments: 8,
      steps: 1
    });
    turnerGeometry.center();
    turnerGeometry.rotateX(Math.PI / 2);
    const slotGeometry = new THREE.BoxGeometry(
      0.045 * CLAW_SIZE_SCALE,
      0.018 * CLAW_SIZE_SCALE,
      0.25 * CLAW_SIZE_SCALE
    );
    for (let index = 0; index < 3; index += 1) {
      const upper = new THREE.Mesh(segmentGeometry, metal);
      const lower = new THREE.Mesh(segmentGeometry, metal);
      const isTurner = index === TURNER_PRONG_INDEX;
      const tip = isTurner ? new THREE.Group() : new THREE.Mesh(tipGeometry, rubber);
      if (isTurner) {
        const blade = new THREE.Mesh(turnerGeometry, turnerMaterial);
        blade.castShadow = true;
        blade.receiveShadow = true;
        tip.add(blade);
        [-0.11, 0, 0.11].forEach(offset => {
          const slot = new THREE.Mesh(slotGeometry, rubber);
          slot.position.set(offset * CLAW_SIZE_SCALE, 0.034 * CLAW_SIZE_SCALE, 0);
          slot.castShadow = true;
          tip.add(slot);
        });
      }
      upper.castShadow = true;
      lower.castShadow = true;
      tip.castShadow = true;
      this.clawVisual.add(upper, lower, tip);
      this.prongVisuals.push({
        upper,
        lower,
        tip,
        isTurner,
        angle: (index / 3) * Math.PI * 2
      });
    }
  }

  resetGame() {
    this.clearPlushes();
    this.releaseGrip(false);
    this.releaseActiveHandle(false);
    this.phase = "horizontal";
    this.setClawStarNeonMode("default");
    this.phaseTime = 0;
    this.attemptsRemaining = MAX_ATTEMPTS;
    this.caughtCount = 0;
    this.score = 0;
    this.caughtNames = [];
    this.attemptCaught = 0;
    this.gripAttempted = false;
    this.releaseStarted = false;
    this.releaseProngClosure = 1;
    this.gripClosureLock = null;
    this.carriage.position.set(HOME_POSITION.x, CARRIAGE_Y, HOME_POSITION.z);
    this.carriage.target.copy(this.carriage.position);
    this.carriage.velocity.set(0, 0, 0);
    this.cableLength = 1.25;
    this.cableTarget = 1.25;
    this.grabCableLength = MAX_GRAB_CABLE_LENGTH;
    this.prongClosure = 0;
    this.appliedProngClosure = 0;
    this.clawYaw = 0;
    this.rotationTravel = 0;
    this.prongSegments = [];
    this.prongContactLift.fill(0);
    this.prongContactHold.fill(0);
    this.prongContactStrength.fill(0);
    this.clawBody.position.set(HOME_POSITION.x, CARRIAGE_Y - 1.25, HOME_POSITION.z);
    this.clawOrientation.set(0, 0, 0, 1);
    this.clawBaseOrientation.set(0, 0, 0, 1);
    this.clawYawOrientation.set(0, 0, 0, 1);
    this.clawYawBaseOrientation.set(0, 0, 0, 1);
    this.clawContactTilt.set(0, 0, 0, 1);
    this.clawContactLiftY = 0;
    this.clawEffectivePosition.copy(this.clawBody.position);
    this.prongStopClawY = this.clawBody.position.y;
    this.clawBody.velocity.set(0, 0, 0);
    this.clawBody.angularVelocity.set(0, 0, 0);
    this.clawBody.quaternion.set(0, 0, 0, 1);
    this.prongBodies.forEach(entry => {
      entry.initialized = false;
      entry.previousPosition.copy(entry.body.position);
      entry.body.velocity.set(0, 0, 0);
    });
    this.els.result.hidden = true;
    this.els.result.innerHTML = "";
    this.createPlushes();
    this.refreshHud();
    this.refreshControls();
    this.showCallout("1 →ボタンを押している間、アームが右へ動きます", 2000);
  }

  clearPlushes() {
    this.plushes.forEach(plush => {
      if (this.world?.bodies.includes(plush.body)) this.world.removeBody(plush.body);
      this.scene?.remove(plush.visual);
    });
    this.plushes = [];
  }

  selectPlushStartLayout() {
    if (!plushStartLayoutDeck.length) refillPlushStartLayoutDeck();
    const layoutIndex = plushStartLayoutDeck.shift();
    previousPlushStartLayoutIndex = layoutIndex;
    this.lastPlushStartLayoutIndex = layoutIndex;
    return PLUSH_START_LAYOUTS[layoutIndex];
  }

  createPlushMoundContactPoints(visual) {
    let cushion = null;
    visual.traverse(node => {
      if (node.userData?.isPlushCushion) cushion = node;
    });
    const positionAttribute = cushion?.geometry?.attributes?.position;
    if (!cushion || !positionAttribute) return [];

    visual.updateMatrixWorld(true);
    const rootInverse = new THREE.Matrix4().copy(visual.matrixWorld).invert();
    const toVisualRoot = new THREE.Matrix4().multiplyMatrices(
      rootInverse,
      cushion.matrixWorld
    );
    const candidateMap = new Map();
    const point = new THREE.Vector3();
    for (let index = 0; index < positionAttribute.count; index += 1) {
      point.fromBufferAttribute(positionAttribute, index).applyMatrix4(toVisualRoot);
      const key = `${Math.round(point.x * 10000)}:${Math.round(point.y * 10000)}:${Math.round(point.z * 10000)}`;
      if (!candidateMap.has(key)) candidateMap.set(key, point.clone());
    }

    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1)
    ];
    const directionCount = 96;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let index = 0; index < directionCount; index += 1) {
      const y = 1 - (2 * (index + 0.5)) / directionCount;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = index * goldenAngle;
      directions.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      ));
    }

    const contactPointMap = new Map();
    const addContactPoint = candidate => {
      const key = `${Math.round(candidate.x * 10000)}:${Math.round(candidate.y * 10000)}:${Math.round(candidate.z * 10000)}`;
      if (!contactPointMap.has(key)) {
        contactPointMap.set(key, new CANNON.Vec3(candidate.x, candidate.y, candidate.z));
      }
    };
    directions.forEach(direction => {
      let bestPoint = null;
      let bestProjection = Number.NEGATIVE_INFINITY;
      candidateMap.forEach(candidate => {
        const projection = candidate.dot(direction);
        if (projection > bestProjection) {
          bestProjection = projection;
          bestPoint = candidate;
        }
      });
      if (bestPoint) addContactPoint(bestPoint);
    });

    // Rounded corners have no fabric. Add only real face-center samples so an
    // imaginary bounding-box corner can no longer hold the plush above the mound.
    cushion.geometry.computeBoundingBox();
    const bounds = cushion.geometry.boundingBox;
    if (bounds) {
      const center = bounds.getCenter(new THREE.Vector3());
      const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      const faceSamples = [];
      [-1, 1].forEach(side => {
        faceSamples.push(
          new THREE.Vector3(center.x + side * half.x, center.y, center.z),
          new THREE.Vector3(center.x + side * half.x, center.y + half.y * 0.25, center.z),
          new THREE.Vector3(center.x + side * half.x, center.y - half.y * 0.25, center.z),
          new THREE.Vector3(center.x + side * half.x, center.y, center.z + half.z * 0.25),
          new THREE.Vector3(center.x + side * half.x, center.y, center.z - half.z * 0.25),
          new THREE.Vector3(center.x, center.y + side * half.y, center.z),
          new THREE.Vector3(center.x + half.x * 0.25, center.y + side * half.y, center.z),
          new THREE.Vector3(center.x - half.x * 0.25, center.y + side * half.y, center.z),
          new THREE.Vector3(center.x, center.y + side * half.y, center.z + half.z * 0.25),
          new THREE.Vector3(center.x, center.y + side * half.y, center.z - half.z * 0.25),
          new THREE.Vector3(center.x, center.y, center.z + side * half.z),
          new THREE.Vector3(center.x + half.x * 0.25, center.y, center.z + side * half.z),
          new THREE.Vector3(center.x - half.x * 0.25, center.y, center.z + side * half.z),
          new THREE.Vector3(center.x, center.y + half.y * 0.25, center.z + side * half.z),
          new THREE.Vector3(center.x, center.y - half.y * 0.25, center.z + side * half.z)
        );
      });
      faceSamples.forEach(facePoint => {
        facePoint.applyMatrix4(toVisualRoot);
        addContactPoint(facePoint);
      });
    }
    return [...contactPointMap.values()];
  }

  createPlushes() {
    if (!this.roster.length) {
      this.showFatalError();
      return;
    }
    const count = Math.min(8, this.roster.length);
    const startLayout = this.selectPlushStartLayout();
    for (let index = 0; index < count; index += 1) {
      const item = this.roster[index];
      const profileKey = PLUSH_PROFILES[item.physics] ? item.physics : "balanced";
      const baseSpec = PLUSH_PROFILES[profileKey];
      const spec = {
        ...baseSpec,
        width: baseSpec.width * PLUSH_SIZE_SCALE,
        height: baseSpec.height * PLUSH_SIZE_SCALE,
        depth: baseSpec.depth * PLUSH_SIZE_SCALE,
        mass: baseSpec.mass * 0.92
      };
      const slotIndex = Math.floor(index * startLayout.slots.length / count);
      const startSlot = startLayout.slots[slotIndex];
      const startsOnMound = startSlot.surface === "mound";
      const angle = (startsOnMound ? startSlot.headingTurn : startSlot.turn) * Math.PI * 2;
      const point = startsOnMound
        ? { x: startSlot.x, z: startSlot.z }
        : ellipsePoint(
          angle,
          BELT_RX + startSlot.lane * 0.08,
          BELT_RZ + startSlot.lane * 0.05
        );
      const body = this.createPlushBody(
        spec,
        item,
        point,
        angle,
        slotIndex,
        startsOnMound
      );
      this.ensureInitialPlushInsideOuterFence(body);
      const visual = this.createPlushVisual(item, spec);
      this.scene.add(visual);
      const moundContactPoints = this.createPlushMoundContactPoints(visual);
      const plush = {
        ...item,
        profileKey,
        spec,
        body,
        visual,
        moundContactPoints,
        collisionRadius: Math.max(
          spec.width * 0.55 + 0.14 * PLUSH_ACCESSORY_SCALE,
          spec.depth * 0.78 + 0.08 * PLUSH_ACCESSORY_SCALE
        ),
        clawContained: false,
        gripContactSeenUntil: [0, 0, 0],
        gripSupportSeenUntil: [0, 0, 0],
        gripRecentSupportScores: [0, 0, 0],
        slipReleaseTime: 0,
        softArmFallActive: false,
        directArmSupport: false,
        liftSupportTime: 0,
        stackSupportTime: 0,
        armContactTime: 0,
        armContactBaseY: body.position.y,
        armCorrectionRemaining: ARM_PLUSH_CORRECTION_BUDGET_PER_FRAME,
        inPrizeHole: false,
        prizeLiftQualified: false,
        preserveDropPosition: false,
        outsideFenceAllowed: false,
        active: true,
        won: false,
        beltBias: 0,
        headingBias: ((slotIndex % 4) - 1.5) * 0.07
      };
      this.plushes.push(plush);
      if (startsOnMound) this.settleInitialPlushOnMound(plush);
    }
  }

  isBodyInsideInitialFence(body) {
    body.aabbNeedsUpdate = true;
    body.updateAABB();
    const radiusX = OUTER_FENCE_RX - INITIAL_PLUSH_FENCE_CLEARANCE;
    const radiusZ = OUTER_FENCE_RZ - INITIAL_PLUSH_FENCE_CLEARANCE;
    const xBounds = [body.aabb.lowerBound.x, body.aabb.upperBound.x];
    const zBounds = [body.aabb.lowerBound.z, body.aabb.upperBound.z];
    return xBounds.every(x => zBounds.every(z => (
      (x * x) / (radiusX * radiusX) + (z * z) / (radiusZ * radiusZ) <= 1
    )));
  }

  ensureInitialPlushInsideOuterFence(body) {
    if (this.isBodyInsideInitialFence(body)) return;
    const startX = body.position.x;
    const startZ = body.position.z;
    let safeScale = 0;
    let unsafeScale = 1;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const scale = (safeScale + unsafeScale) * 0.5;
      body.position.x = startX * scale;
      body.position.z = startZ * scale;
      if (this.isBodyInsideInitialFence(body)) {
        safeScale = scale;
      } else {
        unsafeScale = scale;
      }
    }
    const finalScale = Math.max(0, safeScale * 0.995);
    body.position.x = startX * finalScale;
    body.position.z = startZ * finalScale;
    body.velocity.x = 0;
    body.velocity.z = 0;
    body.aabbNeedsUpdate = true;
    body.updateAABB();
  }

  settleInitialPlushOnMound(plush) {
    const correction = this.getPlushMoundContactCorrection(plush);
    if (!Number.isFinite(correction)) return;
    plush.body.position.y += correction + MOUND_PLUSH_START_CLEARANCE;
    plush.body.velocity.set(0, 0, 0);
    plush.body.angularVelocity.set(0, 0, 0);
    plush.body.aabbNeedsUpdate = true;
    plush.body.updateAABB();
  }

  alignInitialPlushToMound(body, point, heading, supportSide) {
    const normalData = centerMoundNormalAt(point.x, point.z);
    const surfaceNormal = new THREE.Vector3(
      normalData.x,
      normalData.y,
      normalData.z
    );
    const lengthAxis = new THREE.Vector3(
      Math.sin(heading),
      0,
      Math.cos(heading)
    );
    lengthAxis.addScaledVector(
      surfaceNormal,
      -lengthAxis.dot(surfaceNormal)
    ).normalize().multiplyScalar(supportSide);
    const faceAxis = surfaceNormal.clone().multiplyScalar(-supportSide);
    const widthAxis = new THREE.Vector3()
      .crossVectors(lengthAxis, faceAxis)
      .normalize();
    const orientation = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(widthAxis, lengthAxis, faceAxis)
    );
    body.quaternion.set(
      orientation.x,
      orientation.y,
      orientation.z,
      orientation.w
    );
    body.aabbNeedsUpdate = true;
  }

  createPlushBody(spec, item, point, angle, index, startsOnMound = false) {
    const itemMaterial = new CANNON.Material(`plush-${item.id}-${index}`);
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.beltMaterial,
      itemMaterial,
      { friction: spec.friction, restitution: 0.035, contactEquationStiffness: 1e8 }
    ));
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.moundMaterial,
      itemMaterial,
      {
        friction: Math.max(MOUND_PLUSH_FRICTION, spec.friction),
        restitution: 0.005,
        contactEquationStiffness: 1.2e8,
        contactEquationRelaxation: 4
      }
    ));
    const prongFriction = Math.max(0.1, spec.grip * 0.34);
    const prongContactMaterial = new CANNON.ContactMaterial(
      this.prongMaterial,
      itemMaterial,
      {
        friction: prongFriction,
        restitution: 0,
        contactEquationStiffness: 1.5e8,
        contactEquationRelaxation: 4
      }
    );
    this.world.addContactMaterial(prongContactMaterial);
    const body = new CANNON.Body({
      mass: spec.mass,
      material: itemMaterial,
      linearDamping: 0.065,
      angularDamping: 0.88,
      allowSleep: false,
      collisionFilterGroup: 0x0001,
      collisionFilterMask: 0xFFFFFFFF
    });
    body.imasoraProngContactMaterial = prongContactMaterial;
    body.imasoraProngFriction = prongFriction;
    if (spec.shape === "sphere") {
      body.addShape(new CANNON.Sphere(
        Math.max(spec.width, spec.height) * 0.5 + 0.045 * PLUSH_ACCESSORY_SCALE
      ));
    } else {
      body.addShape(new CANNON.Box(new CANNON.Vec3(
        spec.width * 0.5 + 0.045 * PLUSH_ACCESSORY_SCALE,
        spec.height * 0.5 + 0.04 * PLUSH_ACCESSORY_SCALE,
        spec.depth * 0.5 + 0.065 * PLUSH_ACCESSORY_SCALE
      )));
    }
    const armRadius = 0.14 * PLUSH_ACCESSORY_SCALE;
    const footRadius = 0.12 * PLUSH_ACCESSORY_SCALE;
    body.addShape(
      new CANNON.Sphere(armRadius),
      new CANNON.Vec3(-spec.width * 0.55, -spec.height * 0.02, 0)
    );
    body.addShape(
      new CANNON.Sphere(armRadius),
      new CANNON.Vec3(spec.width * 0.55, -spec.height * 0.02, 0)
    );
    body.addShape(
      new CANNON.Sphere(footRadius),
      new CANNON.Vec3(
        -spec.width * 0.26,
        -spec.height * 0.55,
        0.04 * PLUSH_ACCESSORY_SCALE
      )
    );
    body.addShape(
      new CANNON.Sphere(footRadius),
      new CANNON.Vec3(
        spec.width * 0.26,
        -spec.height * 0.55,
        0.04 * PLUSH_ACCESSORY_SCALE
      )
    );
    const tangent = ellipseTangent(angle);
    const heading = Math.atan2(tangent.x, tangent.z) + ((index % 4) - 1.5) * 0.07;
    if (startsOnMound) {
      body.position.set(point.x, 0, point.z);
      this.alignInitialPlushToMound(
        body,
        point,
        heading,
        index % 2 ? 1 : -1
      );
      body.position.y = moundRestingCenterY(body, MOUND_PLUSH_START_CLEARANCE);
      body.angularVelocity.set(0, 0, 0);
    } else {
      body.position.set(point.x, plushRestingYAt(spec, point.x, point.z) + 0.025, point.z);
      body.quaternion.setFromEuler(
        (index % 2 ? 1 : -1) * 0.035,
        heading,
        ((index % 4) - 1.5) * 0.025
      );
      body.angularVelocity.set(0, 0.012 * (index % 2 ? 1 : -1), 0);
    }
    body.userData = { itemId: item.id };
    this.world.addBody(body);
    return body;
  }

  createPlushVisual(item, spec) {
    const group = new THREE.Group();
    const bodyColor = new THREE.Color(cssColor(item.bodyColor));
    const accentColor = new THREE.Color(cssColor(item.accentColor, "#55ae73"));
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.96,
      metalness: 0,
      bumpMap: this.fabricTexture,
      bumpScale: 0.075,
      depthTest: true,
      depthWrite: true
    });
    const cushionGeometry = new THREE.ExtrudeGeometry(
      makeRoundedShape(spec.width, spec.height, Math.min(spec.width, spec.height) * spec.roundness),
      {
        depth: spec.depth,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 5,
        bevelSize: 0.105 * PLUSH_ACCESSORY_SCALE,
        bevelThickness: 0.105 * PLUSH_ACCESSORY_SCALE,
        curveSegments: 10
      }
    );
    cushionGeometry.center();
    const cushion = new THREE.Mesh(cushionGeometry, bodyMaterial);
    cushion.userData.isPlushCushion = true;
    cushion.castShadow = true;
    cushion.receiveShadow = true;
    group.add(cushion);

    const limbMaterial = bodyMaterial.clone();
    limbMaterial.color.copy(bodyColor).offsetHSL(0, -0.03, -0.045);
    const limbGeometry = new THREE.SphereGeometry(0.5, 20, 14);
    const limbData = [
      { x: -spec.width * 0.55, y: -spec.height * 0.02, z: 0, scale: [0.26, 0.43, 0.22], rotate: -0.25 },
      { x: spec.width * 0.55, y: -spec.height * 0.02, z: 0, scale: [0.26, 0.43, 0.22], rotate: 0.25 },
      { x: -spec.width * 0.26, y: -spec.height * 0.55, z: 0.04 * PLUSH_ACCESSORY_SCALE, scale: [0.34, 0.21, 0.31], rotate: -0.08 },
      { x: spec.width * 0.26, y: -spec.height * 0.55, z: 0.04 * PLUSH_ACCESSORY_SCALE, scale: [0.34, 0.21, 0.31], rotate: 0.08 }
    ];
    limbData.forEach(entry => {
      const limb = new THREE.Mesh(limbGeometry, limbMaterial);
      limb.position.set(entry.x, entry.y, entry.z);
      limb.scale.set(...entry.scale.map(value => value * PLUSH_ACCESSORY_SCALE));
      limb.rotation.z = entry.rotate;
      limb.castShadow = true;
      group.add(limb);
    });

    const loop = new THREE.Mesh(
      new THREE.TorusGeometry(
        0.14 * PLUSH_ACCESSORY_SCALE,
        0.027 * PLUSH_ACCESSORY_SCALE,
        8,
        20,
        Math.PI * 1.55
      ),
      new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.82,
        metalness: 0.02
      })
    );
    loop.position.set(0, spec.height * 0.53, 0);
    loop.rotation.z = Math.PI * 0.22;
    loop.castShadow = true;
    group.add(loop);

    const seamMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4ead8,
      roughness: 0.88,
      metalness: 0
    });
    const radius = Math.min(spec.width, spec.height) * Math.max(0.14, spec.roundness - 0.025);
    [-1, 1].forEach(side => {
      const curve = makeRoundedLoop(
        spec.width * 0.93,
        spec.height * 0.93,
        radius,
        side * (spec.depth * 0.5 + 0.075 * PLUSH_ACCESSORY_SCALE)
      );
      const seam = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.021 * PLUSH_ACCESSORY_SCALE, 6, true),
        seamMaterial
      );
      seam.castShadow = true;
      group.add(seam);
    });

    const patchGeometry = new THREE.PlaneGeometry(spec.width * 1.02, spec.height * 1.02);
    const frontMaterial = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0,
      roughness: 1,
      metalness: 0,
      alphaTest: 0.015,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: true
    });
    const backMaterial = frontMaterial.clone();
    const front = new THREE.Mesh(patchGeometry, frontMaterial);
    front.position.z = spec.depth * 0.5 + 0.13 * PLUSH_ACCESSORY_SCALE;
    const back = new THREE.Mesh(patchGeometry, backMaterial);
    back.position.z = -spec.depth * 0.5 - 0.13 * PLUSH_ACCESSORY_SCALE;
    back.rotation.y = Math.PI;
    group.add(front, back);
    this.assignPlushTexture(frontMaterial, item.frontSvg);
    this.assignPlushTexture(backMaterial, item.backSvg || item.frontSvg);

    group.userData.bodyMaterial = bodyMaterial;
    group.userData.itemName = item.name;
    return group;
  }

  assignPlushTexture(material, svg) {
    const task = svgToFabricTexture(svg, this.renderer)
      .then(texture => {
        this.textureTasks.delete(task);
        if (this.destroyed) {
          texture.dispose();
          return;
        }
        material.map = texture;
        material.opacity = 0.96;
        material.needsUpdate = true;
      })
      .catch(error => {
        this.textureTasks.delete(task);
        console.warn("ぬいぐるみ刺繍テクスチャの生成を省略しました。", error);
      });
    this.textureTasks.add(task);
  }

  handleClick(event) {
    const fineButton = event.target.closest("[data-icc-fine]");
    if (fineButton && this.root.contains(fineButton)) return;
    const action = event.target.closest("[data-icc-action]");
    if (!action || !this.root.contains(action)) return;
    if (action.dataset.iccAction === "restart") {
      safeSelectSound();
      this.resetGame();
    }
  }

  handleHandleDown(event) {
    const fineButton = event.target.closest("[data-icc-fine]");
    const fineCenter = event.target.closest("[data-icc-fine-center]");
    const fineGroup = fineButton?.closest("[data-icc-fine-group]")
      || event.target.closest("[data-icc-fine-group]");
    if (fineGroup && this.root.contains(fineGroup)) {
      event.preventDefault();
      const groupAxis = fineGroup?.dataset.iccFineGroup;
      const geometry = this.getFineLeverGeometry(fineGroup);
      if (!fineGroup || !geometry || !["horizontal", "vertical"].includes(groupAxis)) return;
      const expectedPhase = groupAxis === "horizontal" ? "fineHorizontal" : "fineVertical";
      if (this.phase !== expectedPhase || this.controlPointerId !== null || this.pendingFineLever) return;
      if (fineButton && !fineCenter) {
        const direction = fineButton.dataset.iccFine;
        const directionButton = this.getFineHandleButton(direction);
        if (!directionButton || directionButton.disabled) return;
        if (!this.activateFineHandle(direction, directionButton, event.pointerId)) return;
        fineGroup.setPointerCapture?.(event.pointerId);
        this.controlCaptureElement = fineGroup;
        return;
      }
      this.pendingFineLever = {
        pointerId: event.pointerId,
        group: fineGroup,
        geometry,
        startAxisOffset: this.getFineLeverPointerOffset(geometry, event.clientX, event.clientY)
      };
      fineGroup.setPointerCapture?.(event.pointerId);
      this.controlCaptureElement = fineGroup;
      return;
    }
    const handle = event.target.closest("[data-icc-handle]");
    if (!handle || !this.root.contains(handle) || handle.disabled) return;
    const axis = handle.dataset.iccHandle;
    if (axis === "stop") {
      event.preventDefault();
      this.startAutomaticGrab();
      return;
    }
    if (!this.activateHandle(axis, handle, event.pointerId)) return;
    event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
    this.controlCaptureElement = handle;
  }

  handleHandleMove(event) {
    if (
      event.pointerId === this.controlPointerId
      && ["left", "right", "up", "down"].includes(this.activeHandle)
    ) {
      event.preventDefault();
      return;
    }
    const pending = this.pendingFineLever;
    if (!pending || event.pointerId !== pending.pointerId) return;
    const axisOffset = this.getFineLeverPointerOffset(
      pending.geometry,
      event.clientX,
      event.clientY
    );
    const dragOffset = axisOffset - pending.startAxisOffset;
    if (Math.abs(dragOffset) <= pending.geometry.threshold) return;
    const direction = dragOffset < 0
      ? pending.geometry.firstDirection
      : pending.geometry.secondDirection;
    const directionButton = this.getFineHandleButton(direction);
    if (!directionButton || directionButton.disabled) return;
    this.pendingFineLever = null;
    if (!this.activateFineHandle(direction, directionButton, event.pointerId)) return;
    this.controlCaptureElement = pending.group;
    event.preventDefault();
  }

  handleHandleUp(event) {
    if (this.pendingFineLever) {
      if (event?.pointerId !== undefined && event.pointerId !== this.pendingFineLever.pointerId) return;
      event?.preventDefault?.();
      const pending = this.pendingFineLever;
      this.pendingFineLever = null;
      if (typeof pending.pointerId === "number" && pending.group.hasPointerCapture?.(pending.pointerId)) {
        pending.group.releasePointerCapture(pending.pointerId);
      }
      this.controlCaptureElement = null;
      return;
    }
    if (this.controlPointerId === null) return;
    if (event?.pointerId !== undefined && event.pointerId !== this.controlPointerId) return;
    event?.preventDefault?.();
    this.completeActiveHandle();
  }

  getFineLeverGeometry(group) {
    if (!group) return null;
    const buttons = Array.from(group.querySelectorAll("[data-icc-fine]"));
    if (buttons.length < 2) return null;
    const firstBounds = buttons[0].getBoundingClientRect();
    const secondBounds = buttons[1].getBoundingClientRect();
    const firstX = firstBounds.left + firstBounds.width * 0.5;
    const firstY = firstBounds.top + firstBounds.height * 0.5;
    const secondX = secondBounds.left + secondBounds.width * 0.5;
    const secondY = secondBounds.top + secondBounds.height * 0.5;
    const deltaX = secondX - firstX;
    const deltaY = secondY - firstY;
    const centerDistance = Math.hypot(deltaX, deltaY);
    if (centerDistance < 1) return null;
    return {
      centerX: (firstX + secondX) * 0.5,
      centerY: (firstY + secondY) * 0.5,
      unitX: deltaX / centerDistance,
      unitY: deltaY / centerDistance,
      firstDirection: buttons[0].dataset.iccFine,
      secondDirection: buttons[1].dataset.iccFine,
      threshold: Math.max(
        FINE_LEVER_CENTER_DRAG_THRESHOLD_PX,
        centerDistance * FINE_LEVER_CENTER_DEAD_ZONE_RATIO
      ) * FINE_LEVER_CENTER_DRAG_DISTANCE_SCALE
    };
  }

  getFineLeverPointerOffset(geometry, clientX, clientY) {
    return (clientX - geometry.centerX) * geometry.unitX
      + (clientY - geometry.centerY) * geometry.unitY;
  }

  getFineHandleButton(direction) {
    return {
      left: this.els?.fineLeft,
      right: this.els?.fineRight,
      up: this.els?.fineUp,
      down: this.els?.fineDown
    }[direction] || null;
  }

  handleHandleKeyDown(event) {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const fineButton = event.target.closest("[data-icc-fine]");
    if (fineButton && this.root.contains(fineButton) && !fineButton.disabled) {
      event.preventDefault();
      this.activateFineHandle(fineButton.dataset.iccFine, fineButton, "keyboard");
      return;
    }
    const handle = event.target.closest("[data-icc-handle]");
    if (!handle || !this.root.contains(handle) || handle.disabled) return;
    event.preventDefault();
    if (handle.dataset.iccHandle === "stop") {
      this.startAutomaticGrab();
      return;
    }
    this.activateHandle(handle.dataset.iccHandle, handle, "keyboard");
  }

  handleHandleKeyUp(event) {
    if ((event.key !== "Enter" && event.key !== " ") || this.controlPointerId !== "keyboard") return;
    event.preventDefault();
    this.completeActiveHandle();
  }

  activateHandle(axis, handle, pointerId) {
    const expectedPhases = {
      horizontal: "horizontal",
      vertical: "vertical",
      rotation: "rotation"
    };
    const expectedPhase = expectedPhases[axis];
    if (!expectedPhase) return false;
    if (this.phase !== expectedPhase || this.controlPointerId !== null) return false;
    this.controlPointerId = pointerId;
    this.activeHandle = axis;
    this.setClawStarNeonMode(axis);
    handle.classList.add("is-held");
    handle.setAttribute("aria-pressed", "true");
    safeSelectSound();
    return true;
  }

  activateFineHandle(direction, button, pointerId) {
    const horizontal = ["left", "right"].includes(direction);
    const vertical = ["up", "down"].includes(direction);
    const expectedPhase = horizontal ? "fineHorizontal" : vertical ? "fineVertical" : null;
    if (!expectedPhase || this.phase !== expectedPhase || this.controlPointerId !== null) return false;
    this.controlPointerId = pointerId;
    this.activeHandle = direction;
    this.setClawStarNeonMode(horizontal ? "horizontal" : "vertical");
    button.classList.add("is-held");
    button.setAttribute("aria-pressed", "true");
    safeSelectSound();
    return true;
  }

  releaseActiveHandle(advance = true) {
    if (this.pendingFineLever) {
      const pending = this.pendingFineLever;
      this.pendingFineLever = null;
      if (typeof pending.pointerId === "number" && pending.group.hasPointerCapture?.(pending.pointerId)) {
        pending.group.releasePointerCapture(pending.pointerId);
      }
      this.controlCaptureElement = null;
    }
    if (this.controlPointerId === null && !this.activeHandle) return;
    const axis = this.activeHandle;
    const pointerId = this.controlPointerId;
    const fineHandles = {
      left: this.els?.fineLeft,
      right: this.els?.fineRight,
      up: this.els?.fineUp,
      down: this.els?.fineDown
    };
    const handle = axis ? (this.els?.[axis] || fineHandles[axis]) : null;
    const captureElement = this.controlCaptureElement || handle;
    if (captureElement && typeof pointerId === "number" && captureElement.hasPointerCapture?.(pointerId)) {
      captureElement.releasePointerCapture(pointerId);
    }
    handle?.classList.remove("is-held");
    handle?.setAttribute("aria-pressed", "false");
    this.controlPointerId = null;
    this.activeHandle = null;
    this.controlCaptureElement = null;
    if (!advance || !axis) {
      this.refreshControls();
      return;
    }
    if (axis === "horizontal" && this.phase === "horizontal") {
      this.phase = "vertical";
      this.phaseTime = 0;
      this.refreshControls();
      this.showCallout("2 →ボタンを押している間、東側視点でアームが右へ動きます", 1900);
      return;
    }
    if (axis === "vertical" && this.phase === "vertical") {
      this.phase = "rotation";
      this.phaseTime = 0;
      this.rotationTravel = 0;
      this.refreshControls();
      this.showCallout("3 ↺ボタンを押している間、アームが反時計回りに回ります", 2100);
      return;
    }
    if (axis === "rotation" && this.phase === "rotation") {
      this.phase = "fineHorizontal";
      this.phaseTime = 0;
      this.setClawStarNeonMode("horizontal");
      this.refreshControls();
      this.showCallout("4 左右レバーを倒している間、アームが左右に動きます", 2300);
      return;
    }
    if (["left", "right"].includes(axis) && this.phase === "fineHorizontal") {
      this.enterFineVerticalStage();
      return;
    }
    if (["up", "down"].includes(axis) && this.phase === "fineVertical") {
      this.enterDescentReadyStage();
      return;
    }
  }

  enterFineVerticalStage() {
    this.phase = "fineVertical";
    this.phaseTime = 0;
    this.setClawStarNeonMode("vertical");
    this.refreshControls();
    this.showCallout("5 左右レバーを倒している間、東側視点でアームが左右に動きます", 2300);
  }

  enterDescentReadyStage() {
    this.phase = "fineSettle";
    this.phaseTime = 0;
    this.setClawStarNeonMode("default");
    this.refreshControls();
    this.showCallout("位置を確定。タイミングを見て6 下降ボタンを押します", 2100);
  }

  completeActiveHandle() {
    this.releaseActiveHandle(true);
  }

  startAutomaticGrab() {
    if (this.phase !== "fineSettle" || this.attemptsRemaining <= 0) return;
    this.descentButtonPressedUntil = this.elapsed + 0.24;
    this.attemptsRemaining -= 1;
    this.attemptCaught = 0;
    this.plushes.forEach(plush => {
      plush.gripContactSeenUntil.fill(0);
      plush.gripSupportSeenUntil.fill(0);
      plush.gripRecentSupportScores.fill(0);
      if (plush.active && !plush.won && !plush.inPrizeHole) {
        plush.prizeLiftQualified = false;
      }
    });
    this.gripAttempted = false;
    this.releaseStarted = false;
    this.releaseProngClosure = 1;
    this.gripClosureLock = null;
    this.appliedProngClosure = this.prongClosure;
    this.prongContactLift.fill(0);
    this.prongContactHold.fill(0);
    this.prongContactStrength.fill(0);
    this.clawContactTilt.set(0, 0, 0, 1);
    this.clawContactLiftY = 0;
    this.clawEffectivePosition.copy(this.clawBody.position);
    this.prongStopClawY = this.clawBody.position.y;
    this.phase = "descending";
    this.setClawStarNeonMode("descending");
    this.phaseTime = 0;
    this.grabCableLength = MAX_GRAB_CABLE_LENGTH;
    this.refreshHud();
    this.refreshControls();
    safeSelectSound();
  }

  setPhase(phase) {
    if (phase === "releasing") {
      this.releaseProngClosure = this.gripClosureLock
        ?? this.grip?.holdClosure
        ?? this.prongClosure;
    }
    this.phase = phase;
    this.phaseTime = 0;
    if (["closing", "lifting", "carrying", "releasing", "returning"].includes(phase)) {
      this.setClawStarNeonMode("lifting");
    } else if (
      phase !== "descending"
      && (this.clawStarNeonMode === "descending" || this.clawStarNeonMode === "lifting")
    ) {
      this.setClawStarNeonMode("default");
    }
    if (phase === "carrying") {
      this.carriage.target.set(PRIZE_HOLE_POSITION.x, CARRIAGE_Y, PRIZE_HOLE_POSITION.z);
    }
    if (phase === "returning") {
      this.carriage.target.set(HOME_POSITION.x, CARRIAGE_Y, HOME_POSITION.z);
    }
    this.refreshControls();
  }

  updatePhase(delta) {
    const fineLeverPointerActive = ["fineHorizontal", "fineVertical"].includes(this.phase)
      && (this.controlPointerId !== null || Boolean(this.pendingFineLever));
    if (!fineLeverPointerActive) this.phaseTime += delta;
    if (this.phase === "horizontal") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      if (this.activeHandle === "horizontal") {
        this.carriage.target.x = clamp(
          this.carriage.target.x + PRIMARY_HORIZONTAL_CONTROL_SPEED * delta,
          AIM_LIMITS.minX,
          AIM_LIMITS.maxX
        );
        if (this.carriage.target.x >= AIM_LIMITS.maxX - 0.005) this.completeActiveHandle();
      }
      return;
    }
    if (this.phase === "vertical") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      if (this.activeHandle === "vertical") {
        this.carriage.target.z = clamp(
          this.carriage.target.z - VERTICAL_CONTROL_SPEED * delta,
          AIM_LIMITS.minZ,
          AIM_LIMITS.maxZ
        );
        if (this.carriage.target.z <= AIM_LIMITS.minZ + 0.005) this.completeActiveHandle();
      }
      return;
    }
    if (this.phase === "rotation") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      if (this.activeHandle === "rotation") {
        const rotationStep = Math.min(
          ROTATION_CONTROL_SPEED * delta,
          Math.max(0, MAX_ROTATION_TRAVEL - this.rotationTravel)
        );
        this.rotationTravel += rotationStep;
        this.clawYaw = normalizeAngle(
          this.clawYaw + rotationStep
        );
        if (this.rotationTravel >= MAX_ROTATION_TRAVEL - 0.000001) {
          this.completeActiveHandle();
        }
      }
      return;
    }
    if (this.phase === "fineHorizontal") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      if (!fineLeverPointerActive && this.phaseTime >= TIMED_STAGE_LIMIT_SECONDS) {
        this.releaseActiveHandle(false);
        this.enterFineVerticalStage();
        return;
      }
      if (["left", "right"].includes(this.activeHandle)) {
        const direction = this.activeHandle === "left" ? -1 : 1;
        this.carriage.target.x = clamp(
          this.carriage.target.x + direction * HORIZONTAL_CONTROL_SPEED * delta,
          AIM_LIMITS.minX,
          AIM_LIMITS.maxX
        );
      }
      return;
    }
    if (this.phase === "fineVertical") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      if (!fineLeverPointerActive && this.phaseTime >= TIMED_STAGE_LIMIT_SECONDS) {
        this.releaseActiveHandle(false);
        this.enterDescentReadyStage();
        return;
      }
      if (["up", "down"].includes(this.activeHandle)) {
        const direction = this.activeHandle === "up" ? -1 : 1;
        this.carriage.target.z = clamp(
          this.carriage.target.z + direction * VERTICAL_CONTROL_SPEED * delta,
          AIM_LIMITS.minZ,
          AIM_LIMITS.maxZ
        );
      }
      return;
    }
    if (this.phase === "fineSettle") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      if (this.phaseTime >= TIMED_STAGE_LIMIT_SECONDS) {
        this.startAutomaticGrab();
      }
      return;
    }
    if (this.phase === "descending") {
      this.cableTarget = lerp(
        1.25,
        MAX_GRAB_CABLE_LENGTH,
        smoothStep(this.phaseTime / DESCENT_TRAVEL_SECONDS)
      );
      this.prongClosure = 0;
      if (this.phaseTime >= DESCENT_AUTO_CLOSE_SECONDS) {
        this.grabCableLength = MAX_GRAB_CABLE_LENGTH;
        this.setPhase("closing");
      }
      return;
    }
    if (this.phase === "closing") {
      this.cableTarget = this.grabCableLength;
      const requestedClosure = smoothStep(this.phaseTime / 1.08);
      this.prongClosure = this.gripClosureLock ?? requestedClosure;
      if (
        !this.gripAttempted
        && this.phaseTime >= GRIP_EARLY_MONITOR_START_SECONDS
      ) {
        const finalCheck = this.phaseTime >= GRIP_CONTACT_CHECK_SECONDS;
        const gripped = this.tryGrip({ deferFailure: !finalCheck });
        if (gripped || finalCheck) this.gripAttempted = true;
      }
      if (this.phaseTime >= 1.28) this.setPhase("lifting");
      return;
    }
    if (this.phase === "lifting") {
      this.cableTarget = lerp(this.grabCableLength, 1.34, smoothStep(this.phaseTime / 3.1));
      this.prongClosure = this.gripClosureLock ?? 1;
      if (this.phaseTime >= 3.28) this.setPhase("carrying");
      return;
    }
    if (this.phase === "carrying") {
      this.cableTarget = 1.34;
      this.prongClosure = this.gripClosureLock ?? 1;
      const heldBody = this.grip?.plush?.body || null;
      if (heldBody) {
        const holeLevel = Math.max(
          Math.abs(heldBody.position.x - PRIZE_HOLE_POSITION.x) / PRIZE_HOLE_RADIUS_X,
          Math.abs(heldBody.position.z - PRIZE_HOLE_POSITION.z) / PRIZE_HOLE_RADIUS_Z
        );
        if (holeLevel <= PRIZE_HOLE_GUARANTEE_SCALE) {
          this.grip.holeDropGuaranteed = true;
          this.grip.plush.prizeLiftQualified = true;
        }
        const heldOffsetX = heldBody.position.x - this.carriage.position.x;
        const heldOffsetZ = heldBody.position.z - this.carriage.position.z;
        const alignmentBlend = clamp(delta * 3.2, 0, 1);
        this.carriage.target.x = lerp(
          this.carriage.target.x,
          PRIZE_HOLE_POSITION.x - heldOffsetX,
          alignmentBlend
        );
        this.carriage.target.z = lerp(
          this.carriage.target.z,
          PRIZE_HOLE_POSITION.z - heldOffsetZ,
          alignmentBlend
        );
      }
      const distance = this.carriage.position.distanceTo(this.carriage.target);
      const plushAligned = !heldBody || (
        Math.abs(heldBody.position.x - PRIZE_HOLE_POSITION.x) < 0.055
        && Math.abs(heldBody.position.z - PRIZE_HOLE_POSITION.z) < 0.055
      );
      const carriageSettled = distance < 0.08 && this.carriage.velocity.length() < 0.14;
      if (plushAligned && carriageSettled && this.phaseTime >= 1.8) {
        this.setPhase("releasing");
      }
      return;
    }
    if (this.phase === "releasing") {
      this.cableTarget = 1.34;
      this.prongClosure = this.releaseProngClosure
        * (1 - smoothStep(this.phaseTime / 0.48));
      if (!this.releaseStarted && this.phaseTime >= 0.12) {
        this.releaseStarted = true;
        this.releaseGrip(false, true);
      }
      if (this.phaseTime >= 1.18) this.setPhase("returning");
      return;
    }
    if (this.phase === "returning") {
      this.cableTarget = 1.25;
      this.prongClosure = 0;
      const yawDifference = normalizeAngle(-this.clawYaw);
      const yawStep = AUTO_RETURN_ROTATION_SPEED * delta;
      if (Math.abs(yawDifference) <= yawStep) {
        this.clawYaw = 0;
      } else {
        this.clawYaw = normalizeAngle(
          this.clawYaw + Math.sign(yawDifference) * yawStep
        );
      }
      const distance = this.carriage.position.distanceTo(this.carriage.target);
      const carriageSettled = distance < 0.06 && this.carriage.velocity.length() < 0.12;
      const rotationReturned = this.clawYaw === 0;
      const prizeStillFalling = this.plushes.some(plush => (
        plush.active && !plush.won && plush.inPrizeHole
      ));
      if (!prizeStillFalling && carriageSettled && rotationReturned) {
        this.finishAttempt();
      }
    }
  }

  updateCarriage(delta) {
    const difference = this.carriage.target.clone().sub(this.carriage.position);
    const autoMoving = this.phase === "carrying" || this.phase === "returning";
    const accelerationGain = autoMoving ? AUTO_CARRIAGE_ACCELERATION : 10.2;
    const dampingGain = autoMoving ? AUTO_CARRIAGE_DAMPING : 4.25;
    const maximumSpeed = autoMoving ? AUTO_CARRIAGE_MAX_SPEED : 3.15;
    const acceleration = difference
      .multiplyScalar(accelerationGain)
      .addScaledVector(this.carriage.velocity, -dampingGain);
    this.carriage.velocity.addScaledVector(acceleration, delta);
    const speed = this.carriage.velocity.length();
    if (speed > maximumSpeed) this.carriage.velocity.multiplyScalar(maximumSpeed / speed);
    this.carriage.position.addScaledVector(this.carriage.velocity, delta);
    this.carriage.position.y = CARRIAGE_Y;
  }

  applyCablePhysics() {
    this.cableLength += (this.cableTarget - this.cableLength) * 0.12;
    const anchor = new CANNON.Vec3(
      this.carriage.position.x,
      this.carriage.position.y - 0.08,
      this.carriage.position.z
    );
    const delta = this.clawBody.position.vsub(anchor);
    const distance = Math.max(0.001, delta.length());
    const extension = distance - this.cableLength;
    if (extension <= 0) return;
    const direction = delta.scale(1 / distance);
    const carriageVelocity = new CANNON.Vec3(
      this.carriage.velocity.x,
      0,
      this.carriage.velocity.z
    );
    const relativeVelocity = this.clawBody.velocity.vsub(carriageVelocity);
    const alongCable = relativeVelocity.dot(direction);
    const tension = clamp(extension * 215 + alongCable * 23, 0, 325);
    const force = direction.scale(-tension);
    const cableVelocity = direction.scale(alongCable);
    const lateralVelocity = relativeVelocity.vsub(cableVelocity);
    force.x -= lateralVelocity.x * 3.4;
    force.z -= lateralVelocity.z * 3.4;
    this.clawBody.applyForce(force, this.clawBody.position);
  }

  enforceClawCableSlackLimit() {
    if (![
      "lifting",
      "carrying",
      "releasing",
      "returning"
    ].includes(this.phase)) return false;
    const anchor = new CANNON.Vec3(
      this.carriage.position.x,
      this.carriage.position.y - 0.08,
      this.carriage.position.z
    );
    const offset = this.clawBody.position.vsub(anchor);
    const distance = offset.length();
    const minimumDistance = Math.max(0.2, this.cableLength - CLAW_CABLE_MAX_SLACK);
    if (distance >= minimumDistance) return false;
    const direction = distance > 0.001
      ? offset.scale(1 / distance)
      : new CANNON.Vec3(0, -1, 0);
    const correction = minimumDistance - distance;
    this.clawBody.position.x += direction.x * correction;
    this.clawBody.position.y += direction.y * correction;
    this.clawBody.position.z += direction.z * correction;
    const carriageVelocity = new CANNON.Vec3(
      this.carriage.velocity.x,
      0,
      this.carriage.velocity.z
    );
    const relativeVelocity = this.clawBody.velocity.vsub(carriageVelocity);
    const velocityTowardAnchor = relativeVelocity.dot(direction);
    if (velocityTowardAnchor < 0) {
      this.clawBody.velocity.x -= direction.x * velocityTowardAnchor;
      this.clawBody.velocity.y -= direction.y * velocityTowardAnchor;
      this.clawBody.velocity.z -= direction.z * velocityTowardAnchor;
    }
    this.clawBody.aabbNeedsUpdate = true;
    return true;
  }

  applyConveyorForces(delta) {
    this.plushes.forEach((plush, index) => {
      if (
        !plush.active
        || plush.won
        || plush.inPrizeHole
        || plush.preserveDropPosition
        || this.grip?.plush === plush
      ) return;
      const body = plush.body;
      let data = nearestEllipseData(body.position.x, body.position.z);
      const prizeHoleDistance = Math.hypot(
        body.position.x - PRIZE_HOLE_POSITION.x,
        body.position.z - PRIZE_HOLE_POSITION.z
      );
      if (prizeHoleDistance < 1.2 && body.position.y < 2.5) return;
      const targetSpeed = BELT_SPEED + plush.beltBias;
      if (isInsideCenterMoundTransition(body.position.x, body.position.z)) {
        const externallyMoved = plush.armContactTime > 0
          || plush.liftSupportTime > 0
          || plush.stackSupportTime > 0;
        body.linearDamping = externallyMoved ? 0.075 : MOUND_IDLE_LINEAR_DAMPING;
        body.angularDamping = externallyMoved ? 0.82 : 0.965;
        if (!externallyMoved) {
          body.velocity.y = Math.min(body.velocity.y, 0);
          // Remove only unassisted uphill inertia left by the moving conveyor.
          const downhillX = body.position.x / (CENTER_MOUND_RADIUS_X ** 2);
          const downhillZ = body.position.z / (CENTER_MOUND_RADIUS_Z ** 2);
          const downhillLength = Math.hypot(downhillX, downhillZ);
          if (downhillLength > 0.0001) {
            const normalX = downhillX / downhillLength;
            const normalZ = downhillZ / downhillLength;
            const downhillSpeed = body.velocity.x * normalX
              + body.velocity.z * normalZ;
            if (downhillSpeed < 0) {
              body.velocity.x -= normalX * downhillSpeed;
              body.velocity.z -= normalZ * downhillSpeed;
            }
          }
        }
        return;
      }
      if (
        data.distance > 1.7
        || body.position.y < -1.5
        || Math.abs(body.position.x) > 7
        || Math.abs(body.position.z) > 6
      ) {
        body.position.set(data.point.x, BELT_SURFACE_Y + plush.spec.height * 0.58, data.point.z);
        body.velocity.set(data.tangent.x * targetSpeed, 0, data.tangent.z * targetSpeed);
        body.angularVelocity.set(0, 0, 0);
        body.quaternion.setFromEuler(0, Math.atan2(data.tangent.x, data.tangent.z) + plush.headingBias, 0);
        return;
      }
      if (plush.armContactTime > 0) {
        body.angularDamping = Math.max(body.angularDamping, 0.82);
        body.wakeUp();
        return;
      }
      if (data.distance > TRACK_HARD_LIMIT) {
        const scale = TRACK_HARD_LIMIT / data.distance;
        body.position.x = data.point.x - data.dx * scale;
        body.position.z = data.point.z - data.dz * scale;
        const awayX = -data.dx / data.distance;
        const awayZ = -data.dz / data.distance;
        const awaySpeed = body.velocity.x * awayX + body.velocity.z * awayZ;
        if (awaySpeed > 0) {
          body.velocity.x -= awayX * awaySpeed * 0.92;
          body.velocity.z -= awayZ * awaySpeed * 0.92;
        }
        data = nearestEllipseData(body.position.x, body.position.z);
      }
      if (body.position.y > 2.55) {
        return;
      }
      const tangentSpeed = body.velocity.x * data.tangent.x + body.velocity.z * data.tangent.z;
      const driveGain = tangentSpeed < targetSpeed * 0.72 ? 14.5 : 8.4;
      const centeringStrength = data.distance > TRACK_SOFT_LIMIT ? 9.5 : 4.2;
      const speedError = targetSpeed - tangentSpeed;
      const forceX = data.tangent.x * speedError * body.mass * driveGain
        + data.dx * body.mass * centeringStrength;
      const forceZ = data.tangent.z * speedError * body.mass * driveGain
        + data.dz * body.mass * centeringStrength;
      body.applyForce(new CANNON.Vec3(forceX, 0, forceZ), body.position);
      const minimumSpeed = targetSpeed * BELT_MINIMUM_SPEED_RATIO;
      if (tangentSpeed < minimumSpeed) {
        const correction = (minimumSpeed - tangentSpeed) * clamp(delta * 12, 0, 0.22);
        body.velocity.x += data.tangent.x * correction;
        body.velocity.z += data.tangent.z * correction;
      }
      const front = body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
      const currentHeading = Math.atan2(front.x, front.z);
      const targetHeading = Math.atan2(data.tangent.x, data.tangent.z) + plush.headingBias;
      const headingError = normalizeAngle(targetHeading - currentHeading);
      const desiredTurnRate = clamp(headingError * 0.28, -0.105, 0.105);
      body.angularVelocity.y += (desiredTurnRate - body.angularVelocity.y) * clamp(delta * 2, 0, 0.075);
      body.angularVelocity.x = clamp(body.angularVelocity.x * 0.97, -0.065, 0.065);
      body.angularVelocity.y = clamp(body.angularVelocity.y, -0.105, 0.105);
      body.angularVelocity.z = clamp(body.angularVelocity.z * 0.97, -0.065, 0.065);
      body.wakeUp();
    });
  }

  getPlushRestingY(plush) {
    if (isInsideCenterMoundTransition(plush.body.position.x, plush.body.position.z)) {
      const correction = this.getPlushMoundContactCorrection(plush);
      if (Number.isFinite(correction)) return plush.body.position.y + correction;
    }
    return plushRestingYAt(
      plush.spec,
      plush.body.position.x,
      plush.body.position.z
    );
  }

  markArmContact(plush, duration = 0.2) {
    if (plush.armContactTime <= 0) {
      plush.armContactBaseY = plush.body.position.y;
    }
    plush.armContactTime = Math.max(plush.armContactTime, duration);
  }

  isPlushInsideClawEnvelope(plush) {
    const pose = this.getProngPose();
    const body = plush.body;
    const horizontalDistance = Math.hypot(
      body.position.x - this.clawEffectivePosition.x,
      body.position.z - this.clawEffectivePosition.z
    );
    const radialPadding = Math.min(plush.spec.width, plush.spec.depth) * 0.32;
    const captureRadius = Math.max(pose.elbowRadius, pose.tipRadius) + radialPadding;
    const localY = body.position.y - this.clawEffectivePosition.y;
    const minimumY = pose.tipY - plush.spec.height * 0.32;
    const maximumY = pose.startY + plush.spec.height * 0.42;
    return horizontalDistance <= captureRadius
      && localY >= minimumY
      && localY <= maximumY;
  }

  getPlushClawLocalPosition(plush) {
    plush.body.position.vsub(this.clawEffectivePosition, this.clawRelativePosition);
    this.clawOrientation.inverse(this.clawInverseOrientation);
    this.clawInverseOrientation.vmult(
      this.clawRelativePosition,
      this.clawRelativePosition
    );
    return this.clawRelativePosition;
  }

  getClawUpperPlushCenterLimit(plush) {
    const pose = this.getProngPose();
    this.clawOrientation.vmult(this.clawUpAxis, this.clawHeadUpDirection);
    const topSupport = this.getPlushArmSupport(
      plush,
      -this.clawHeadUpDirection.x,
      -this.clawHeadUpDirection.y,
      -this.clawHeadUpDirection.z
    );
    return pose.startY
      - PRONG_SHAFT_COLLIDER_RADIUS
      - CLAW_HEAD_PLUSH_CLEARANCE
      - topSupport;
  }

  isPlushBelowClawHead(plush, tolerance = 0) {
    const localPosition = this.getPlushClawLocalPosition(plush);
    return localPosition.y <= this.getClawUpperPlushCenterLimit(plush) + tolerance;
  }

  isPlushInValidGripVolume(plush) {
    return this.isPlushInsideClawEnvelope(plush)
      && this.isPlushBelowClawHead(plush, CLAW_HEAD_ESCAPE_TOLERANCE)
      && !this.isPlushFullyBelowProngTips(plush);
  }

  enforceClawHeadClearance() {
    if (![
      "closing",
      "lifting",
      "carrying",
      "releasing"
    ].includes(this.phase)) return false;
    const pose = this.getProngPose();
    let escapedGrip = null;
    let changed = false;
    this.plushes.forEach(plush => {
      if (!plush.active || plush.won || plush.inPrizeHole) return;
      const localPosition = this.getPlushClawLocalPosition(plush);
      const headRadius = pose.elbowRadius + plush.collisionRadius + 0.08;
      if (Math.hypot(localPosition.x, localPosition.z) > headRadius) return;
      const maximumLocalY = this.getClawUpperPlushCenterLimit(plush);
      const excess = localPosition.y - maximumLocalY;
      if (excess <= 0) return;
      this.clawOrientation.vmult(this.clawUpAxis, this.clawHeadUpDirection);
      plush.body.position.x -= this.clawHeadUpDirection.x * excess;
      plush.body.position.y -= this.clawHeadUpDirection.y * excess;
      plush.body.position.z -= this.clawHeadUpDirection.z * excess;
      const upwardSpeed = plush.body.velocity.dot(this.clawHeadUpDirection);
      if (upwardSpeed > -0.08) {
        const removal = upwardSpeed + 0.08;
        plush.body.velocity.x -= this.clawHeadUpDirection.x * removal;
        plush.body.velocity.y -= this.clawHeadUpDirection.y * removal;
        plush.body.velocity.z -= this.clawHeadUpDirection.z * removal;
      }
      plush.body.angularVelocity.scale(0.65, plush.body.angularVelocity);
      plush.body.aabbNeedsUpdate = true;
      plush.body.wakeUp();
      changed = true;
      if (
        this.grip?.plush === plush
        && excess > CLAW_HEAD_ESCAPE_TOLERANCE
      ) {
        escapedGrip = this.grip;
      }
    });
    if (escapedGrip) {
      const plush = escapedGrip.plush;
      if (escapedGrip.holeDropGuaranteed) {
        this.releaseGrip(false, true);
        return true;
      }
      plush.prizeLiftQualified = false;
      escapedGrip.holeDropGuaranteed = false;
      plush.clawContained = false;
      plush.preserveDropPosition = true;
      plush.slipReleaseTime = 0;
      plush.softArmFallActive = true;
      plush.directArmSupport = false;
      plush.liftSupportTime = 0;
      plush.stackSupportTime = 0;
      this.releaseGrip(false);
    }
    return changed;
  }

  getPlushArmSupport(plush, normalX, normalY, normalZ) {
    this.armCollisionNormal.set(normalX, normalY, normalZ);
    plush.body.vectorToLocalFrame(
      this.armCollisionNormal,
      this.armLocalSupportDirection
    );
    this.armLocalSupportDirection.scale(-1, this.armLocalSupportDirection);
    const directionLength = this.armLocalSupportDirection.length();
    if (directionLength < 0.001) {
      this.armLocalSupportDirection.set(0, 1, 0);
    } else {
      this.armLocalSupportDirection.scale(
        1 / directionLength,
        this.armLocalSupportDirection
      );
    }
    const direction = this.armLocalSupportDirection;
    let solidSupport = 0;
    plush.body.shapes.forEach((shape, index) => {
      const offset = plush.body.shapeOffsets[index];
      let shapeSupport = shape.boundingSphereRadius || 0;
      if (shape instanceof CANNON.Sphere) {
        shapeSupport = shape.radius;
      } else if (shape instanceof CANNON.Box) {
        shapeSupport = Math.abs(direction.x) * shape.halfExtents.x
          + Math.abs(direction.y) * shape.halfExtents.y
          + Math.abs(direction.z) * shape.halfExtents.z;
      }
      solidSupport = Math.max(
        solidSupport,
        offset.dot(direction) + shapeSupport
      );
    });

    // Include the visible fabric, image patches, and hanging loop that extend
    // beyond the simplified rigid body used for the general plush physics.
    const visualScaleX = plush.visual?.scale?.x || 1;
    const visualScaleY = plush.visual?.scale?.y || 1;
    const visualScaleZ = plush.visual?.scale?.z || 1;
    const absX = Math.abs(direction.x);
    const absY = Math.abs(direction.y);
    const absZ = Math.abs(direction.z);
    const cushionPadding = 0.105 * PLUSH_ACCESSORY_SCALE;
    const cushionSupport = absX * (plush.spec.width * 0.5 + cushionPadding) * visualScaleX
      + absY * (plush.spec.height * 0.5 + cushionPadding) * visualScaleY
      + absZ * (plush.spec.depth * 0.5 + cushionPadding) * visualScaleZ;
    const patchSupport = absX * plush.spec.width * 0.51 * visualScaleX
      + absY * plush.spec.height * 0.51 * visualScaleY
      + absZ * (plush.spec.depth * 0.5 + 0.13 * PLUSH_ACCESSORY_SCALE) * visualScaleZ;
    const loopRadius = (0.14 + 0.027) * PLUSH_ACCESSORY_SCALE
      * Math.max(visualScaleX, visualScaleY, visualScaleZ);
    const loopSupport = direction.y * plush.spec.height * 0.53 * visualScaleY
      + loopRadius;
    return Math.max(solidSupport, cushionSupport, patchSupport, loopSupport);
  }

  getPlushArmClearance(plush, normalX, normalY, normalZ) {
    const solidSupport = this.getPlushArmSupport(plush, normalX, normalY, normalZ);
    return clamp(
      solidSupport + PRONG_SHAFT_COLLIDER_RADIUS + PRONG_TIP_COLLISION_MARGIN,
      0.38,
      1.1
    );
  }

  getProngTipSupport(entry, normalX, normalY, normalZ) {
    const shape = entry.body.shapes[0];
    if (shape instanceof CANNON.Sphere) return shape.radius;
    this.armCollisionNormal.set(normalX, normalY, normalZ);
    entry.body.vectorToLocalFrame(this.armCollisionNormal, this.armTipLocalNormal);
    const localLength = this.armTipLocalNormal.length();
    if (localLength > 0.001) {
      this.armTipLocalNormal.scale(1 / localLength, this.armTipLocalNormal);
    } else {
      this.armTipLocalNormal.set(0, 1, 0);
    }
    if (shape instanceof CANNON.Box) {
      const half = shape.halfExtents;
      return Math.abs(this.armTipLocalNormal.x) * half.x
        + Math.abs(this.armTipLocalNormal.y) * half.y
        + Math.abs(this.armTipLocalNormal.z) * half.z;
    }
    return shape.boundingSphereRadius || ROUND_PRONG_TIP_RADIUS;
  }

  resolveProngTipPlushPenetration(passes = 10) {
    const tipEntries = this.prongBodies.filter(entry => entry.roundTip || entry.turnerBlade);
    if (!tipEntries.length) return;
    for (let pass = 0; pass < passes; pass += 1) {
      let changed = false;
      this.plushes.forEach(plush => {
        if (!plush.active || plush.won || plush.inPrizeHole) return;
        const body = plush.body;
        tipEntries.forEach(entry => {
          let normalX = body.position.x - entry.body.position.x;
          let normalY = body.position.y - entry.body.position.y;
          let normalZ = body.position.z - entry.body.position.z;
          let distance = Math.hypot(normalX, normalY, normalZ);
          if (distance > 1.65) return;
          if (distance > 0.001) {
            normalX /= distance;
            normalY /= distance;
            normalZ /= distance;
          } else {
            const lowerSegment = this.prongSegments.find(segment => (
              segment.prongIndex === entry.prongIndex && segment.kind === "lower"
            ));
            normalX = lowerSegment?.inward.x || 0;
            normalY = lowerSegment?.inward.y || 0;
            normalZ = lowerSegment?.inward.z || 1;
            distance = 0;
          }
          const plushSupport = this.getPlushArmSupport(
            plush,
            normalX,
            normalY,
            normalZ
          );
          const tipSupport = this.getProngTipSupport(
            entry,
            normalX,
            normalY,
            normalZ
          );
          const clearance = plushSupport + tipSupport + PRONG_TIP_SOLVER_EPSILON;
          if (distance >= clearance) return;
          const correction = clearance - distance;
          body.position.x += normalX * correction;
          body.position.y += normalY * correction;
          body.position.z += normalZ * correction;
          const relativeNormalSpeed = (body.velocity.x - entry.body.velocity.x) * normalX
            + (body.velocity.y - entry.body.velocity.y) * normalY
            + (body.velocity.z - entry.body.velocity.z) * normalZ;
          if (relativeNormalSpeed < 0) {
            body.velocity.x -= normalX * relativeNormalSpeed;
            body.velocity.y -= normalY * relativeNormalSpeed;
            body.velocity.z -= normalZ * relativeNormalSpeed;
          }
          this.markArmContact(plush);
          body.aabbNeedsUpdate = true;
          body.wakeUp();
          changed = true;
        });
      });
      if (!changed) break;
    }
  }

  enforceContainedPlushArmBarriers(passes = 5) {
    if (!this.prongSegments.length) return;
    this.plushes.forEach(plush => {
      if (
        !plush.active
        || plush.won
        || plush.inPrizeHole
        || !plush.clawContained
        || this.isPlushFullyBelowProngTips(plush)
      ) return;
      const body = plush.body;
      let barrierCorrected = false;
      for (let pass = 0; pass < passes; pass += 1) {
        let corrected = false;
        this.prongSegments.forEach(segment => {
          const closest = closestPointOnSegment(body.position, segment.start, segment.end);
          const offsetX = body.position.x - closest.x;
          const offsetY = body.position.y - closest.y;
          const offsetZ = body.position.z - closest.z;
          const distance = Math.hypot(offsetX, offsetY, offsetZ);
          const inwardSide = offsetX * segment.inward.x
            + offsetY * segment.inward.y
            + offsetZ * segment.inward.z;
          if (inwardSide >= -0.004) return;
          const clearance = this.getPlushArmSupport(
            plush,
            segment.inward.x,
            segment.inward.y,
            segment.inward.z
          ) + PRONG_SHAFT_COLLIDER_RADIUS + PRONG_TIP_COLLISION_MARGIN;
          if (distance > clearance + 0.16) return;
          const correction = clearance - inwardSide + PRONG_TIP_SOLVER_EPSILON;
          body.position.x += segment.inward.x * correction;
          body.position.y += segment.inward.y * correction;
          body.position.z += segment.inward.z * correction;
          const relativeInwardSpeed = (body.velocity.x - this.clawBody.velocity.x)
              * segment.inward.x
            + (body.velocity.y - this.clawBody.velocity.y) * segment.inward.y
            + (body.velocity.z - this.clawBody.velocity.z) * segment.inward.z;
          if (relativeInwardSpeed < 0) {
            body.velocity.x -= segment.inward.x * relativeInwardSpeed;
            body.velocity.y -= segment.inward.y * relativeInwardSpeed;
            body.velocity.z -= segment.inward.z * relativeInwardSpeed;
          }
          this.markArmContact(plush);
          corrected = true;
          barrierCorrected = true;
        });
        if (!corrected) break;
      }
      if (!barrierCorrected) return;
      if (this.grip?.plush === plush) {
        this.grip.integrity = Math.max(this.grip.integrity, 0.085);
        this.grip.physicalHoldLossTime = 0;
      }
      body.aabbNeedsUpdate = true;
      body.wakeUp();
    });
  }

  markPlushSupportedByArm(plush) {
    plush.directArmSupport = true;
    const restingY = this.getPlushRestingY(plush);
    if (plush.body.position.y > restingY + SOFT_ARM_FALL_MIN_HEIGHT) {
      plush.softArmFallActive = true;
    }
  }

  updatePlushLiftContacts(delta) {
    const plushByBody = new Map();
    this.plushes.forEach(plush => {
      plush.directArmSupport = false;
      plush.liftSupportTime = Math.max(0, plush.liftSupportTime - delta);
      plush.stackSupportTime = Math.max(0, plush.stackSupportTime - delta);
      plush.armContactTime = Math.max(0, plush.armContactTime - delta);
      if (plush.active && !plush.won && !plush.inPrizeHole) plushByBody.set(plush.body, plush);
    });
    const prongEntryByBody = new Map(
      this.prongBodies.map(entry => [entry.body, entry])
    );
    const registerProngContact = (plush, prongBody, contact, plushIsLeft) => {
      if (!prongEntryByBody.has(prongBody)) return;
      this.markArmContact(plush);
      const plushContactOffset = plushIsLeft ? contact.ri : contact.rj;
      const upwardSupport = plushIsLeft ? -contact.ni.y : contact.ni.y;
      const relativeLowerDepth = -plushContactOffset.y
        / Math.max(0.001, plush.spec.height);
      const lowerSupport = clamp((relativeLowerDepth - 0.1) / 0.35, 0, 1);
      const normalSupport = clamp((upwardSupport - 0.16) / 0.64, 0, 1);
      if (relativeLowerDepth > 0.05 && upwardSupport > 0.12) {
        this.markPlushSupportedByArm(plush);
      }
      if (
        this.isPlushInsideClawEnvelope(plush)
        && lowerSupport * normalSupport >= 0.07
      ) {
        plush.liftSupportTime = Math.max(plush.liftSupportTime, 0.2);
      }
    };
    this.world.contacts.forEach(contact => {
      if (!contact.enabled) return;
      const leftPlush = plushByBody.get(contact.bi);
      const rightPlush = plushByBody.get(contact.bj);
      if (leftPlush && rightPlush) {
        if (-contact.ni.y > 0.22) {
          leftPlush.liftSupportTime = Math.max(leftPlush.liftSupportTime, 0.16);
          leftPlush.stackSupportTime = Math.max(leftPlush.stackSupportTime, 0.16);
        }
        if (contact.ni.y > 0.22) {
          rightPlush.liftSupportTime = Math.max(rightPlush.liftSupportTime, 0.16);
          rightPlush.stackSupportTime = Math.max(rightPlush.stackSupportTime, 0.16);
        }
        return;
      }
      if (leftPlush) registerProngContact(leftPlush, contact.bj, contact, true);
      if (rightPlush) registerProngContact(rightPlush, contact.bi, contact, false);
    });
    this.plushes.forEach(plush => {
      if (
        plush.active
        && !plush.won
        && !plush.clawContained
        && plush.stackSupportTime <= 0
        && !this.isPlushInsideClawEnvelope(plush)
      ) {
        plush.liftSupportTime = 0;
      }
    });
  }

  applyAirbornePlushPhysics(delta = FIXED_STEP) {
    this.plushes.forEach(plush => {
      if (!plush.active || plush.won || plush.inPrizeHole) return;
      const body = plush.body;
      const held = this.grip?.plush === plush;
      if (!held && plush.slipReleaseTime > 0) {
        if (this.isPlushFullyBelowProngTips(plush)) {
          plush.slipReleaseTime = 0;
          plush.clawContained = false;
        } else {
          plush.slipReleaseTime = Math.max(0.08, plush.slipReleaseTime - delta);
        }
      }
      if (held) {
        body.linearDamping = 0.055;
        body.angularDamping = 0.78;
        return;
      }
      const prizeHoleDistance = Math.hypot(
        body.position.x - PRIZE_HOLE_POSITION.x,
        body.position.z - PRIZE_HOLE_POSITION.z
      );
      const trackDistance = nearestEllipseData(body.position.x, body.position.z).distance;
      const onConveyor = trackDistance <= TRACK_HARD_LIMIT + 0.18
        && prizeHoleDistance >= 1.2
        && body.position.y < 2.55;
      const restingY = this.getPlushRestingY(plush);
      const heightAboveBelt = body.position.y - restingY;
      if (plush.directArmSupport) {
        body.linearDamping = 0.075;
        body.angularDamping = 0.82;
        return;
      }
      const outsideArmContact = plush.armContactTime > 0
        && plush.stackSupportTime <= 0
        && !plush.clawContained
        && !this.isPlushInsideClawEnvelope(plush);
      if (outsideArmContact && body.velocity.y > 0) {
        body.velocity.y = 0;
      }
      const liftSupported = plush.liftSupportTime > 0 || plush.clawContained;
      if (
        plush.preserveDropPosition
        && onConveyor
        && !liftSupported
        && heightAboveBelt <= 0.14
        && body.velocity.y <= 0.12
      ) {
        plush.preserveDropPosition = false;
        plush.outsideFenceAllowed = false;
      }
      if (
        plush.softArmFallActive
        && heightAboveBelt <= SOFT_ARM_FALL_MIN_HEIGHT
      ) {
        plush.softArmFallActive = false;
      }
      const softArmFall = plush.softArmFallActive
        && heightAboveBelt > SOFT_ARM_FALL_MIN_HEIGHT;
      if (softArmFall) {
        body.linearDamping = 0.28;
        body.angularDamping = 0.66;
        body.velocity.y = clamp(
          body.velocity.y,
          -SLIP_RELEASE_SOFT_FALL_MAX_SPEED,
          0.12
        );
        body.applyForce(
          new CANNON.Vec3(
            0,
            body.mass * SLIP_RELEASE_AIR_CUSHION_ACCELERATION,
            0
          ),
          body.position
        );
        return;
      }
      if (onConveyor && !liftSupported) {
        body.linearDamping = 0.075;
        body.angularDamping = 0.9;
        if (heightAboveBelt > 0.045 && body.velocity.y > 0) {
          body.velocity.y = 0;
        } else if (heightAboveBelt >= -0.02 && body.velocity.y > 0.04) {
          body.velocity.y = 0.04;
        }
        if (heightAboveBelt > 0.015) {
          const settleAcceleration = clamp(3.2 + heightAboveBelt * 8, 3.2, 9);
          body.applyForce(
            new CANNON.Vec3(0, -body.mass * settleAcceleration, 0),
            body.position
          );
        }
        return;
      }
      if (body.position.y <= restingY + SOFT_ARM_FALL_MIN_HEIGHT) {
        plush.softArmFallActive = false;
        body.linearDamping = 0.065;
        body.angularDamping = 0.88;
        return;
      }
      body.linearDamping = 0.025;
      body.angularDamping = 0.68;
      body.velocity.y = Math.min(body.velocity.y, 1.65);
      body.applyForce(new CANNON.Vec3(0, -body.mass * 4.1, 0), body.position);
      const spin = body.angularVelocity.length();
      if (spin > 0.65) {
        body.angularVelocity.scale(0.65 / spin, body.angularVelocity);
      }
    });
  }

  suppressOutsideClawLift() {
    this.plushes.forEach(plush => {
      if (
        !plush.active
        || plush.won
        || this.grip?.plush === plush
        || plush.clawContained
        || plush.softArmFallActive
        || plush.armContactTime <= 0
        || plush.stackSupportTime > 0
        || this.isPlushInsideClawEnvelope(plush)
      ) return;
      const body = plush.body;
      const restingY = this.getPlushRestingY(plush);
      const maximumY = Math.max(restingY + 0.025, plush.armContactBaseY + 0.015);
      body.velocity.y = Math.min(body.velocity.y, 0);
      if (body.position.y > maximumY) {
        body.position.y = maximumY;
        body.velocity.y = Math.min(body.velocity.y, -0.035);
        body.aabbNeedsUpdate = true;
      }
    });
  }

  hasPlushMoundPhysicsContact(plush) {
    const body = plush.body;
    return this.world.contacts.some(contact => (
      (contact.bi === body && contact.bj === this.centerMoundBody)
      || (contact.bj === body && contact.bi === this.centerMoundBody)
    ));
  }

  suppressUnsupportedLift(delta = FIXED_STEP) {
    this.plushes.forEach(plush => {
      if (
        !plush.active
        || plush.won
        || this.grip?.plush === plush
        || plush.clawContained
        || plush.softArmFallActive
        || plush.liftSupportTime > 0
        || plush.stackSupportTime > 0
      ) return;
      const body = plush.body;
      const prizeHoleDistance = Math.hypot(
        body.position.x - PRIZE_HOLE_POSITION.x,
        body.position.z - PRIZE_HOLE_POSITION.z
      );
      const trackDistance = nearestEllipseData(
        body.position.x,
        body.position.z
      ).distance;
      const onSupportedSurface = trackDistance <= TRACK_HARD_LIMIT + 0.18
        || isInsideCenterMoundTransition(body.position.x, body.position.z);
      if (
        prizeHoleDistance < 1.2
        || !onSupportedSurface
      ) return;
      const moundCorrection = isInsideCenterMoundTransition(
        body.position.x,
        body.position.z
      )
        ? this.getPlushMoundContactCorrection(plush)
        : Number.NEGATIVE_INFINITY;
      const onCenterMound = Number.isFinite(moundCorrection);
      const restingY = onCenterMound
        ? body.position.y + moundCorrection
        : this.getPlushRestingY(plush);
      const maximumY = restingY + (onCenterMound ? MOUND_CONTACT_TOLERANCE : 0.04);
      body.velocity.y = Math.min(body.velocity.y, 0);
      if (body.position.y > maximumY) {
        if (onCenterMound) {
          const contactGap = body.position.y - restingY;
          if (
            contactGap <= MOUND_CONTACT_SNAP_DISTANCE
            || this.hasPlushMoundPhysicsContact(plush)
          ) {
            body.position.y = restingY;
            body.velocity.y = 0;
          } else {
            const settleSpeed = clamp(0.18 + contactGap * 2.4, 0.18, 0.9);
            body.velocity.y = Math.min(body.velocity.y, -settleSpeed);
          }
          body.aabbNeedsUpdate = true;
          body.wakeUp();
          return;
        }
        const excess = body.position.y - maximumY;
        body.position.y -= Math.min(excess, 0.12);
        body.velocity.y = Math.min(body.velocity.y, -0.12);
        body.aabbNeedsUpdate = true;
      }
    });
  }

  limitArmPressDepth(plush) {
    if (
      !plush.active
      || plush.won
      || this.grip?.plush === plush
      || plush.armContactTime <= 0
    ) return;
    const body = plush.body;
    const prizeHoleDistance = Math.hypot(
      body.position.x - PRIZE_HOLE_POSITION.x,
      body.position.z - PRIZE_HOLE_POSITION.z
    );
    const trackDistance = nearestEllipseData(body.position.x, body.position.z).distance;
    const onCenterMound = isInsideCenterMoundTransition(
      body.position.x,
      body.position.z
    );
    if (
      prizeHoleDistance < 1.2
      || (trackDistance > TRACK_HARD_LIMIT + 0.22 && !onCenterMound)
    ) return;
    const restingY = this.getPlushRestingY(plush);
    const surfaceTolerance = onCenterMound
      ? MOUND_ARM_PRESS_SURFACE_TOLERANCE
      : 0.022;
    const maximumSink = onCenterMound ? MOUND_ARM_PRESS_MAX_SINK : 0.032;
    const minimumY = Math.max(
      restingY - surfaceTolerance,
      plush.armContactBaseY - maximumSink
    );
    if (body.position.y < minimumY) {
      body.position.y = minimumY;
      body.velocity.y = onCenterMound
        ? Math.max(body.velocity.y, 0)
        : Math.max(body.velocity.y, -0.08);
      body.aabbNeedsUpdate = true;
    }
  }

  limitArmDeflectionSpeed(plush) {
    if (
      !plush.active
      || plush.won
      || this.grip?.plush === plush
      || plush.armContactTime <= 0
    ) return;
    const body = plush.body;
    const maximumHorizontalSpeed = BELT_SPEED + 0.22;
    const horizontalSpeed = Math.hypot(body.velocity.x, body.velocity.z);
    if (horizontalSpeed > maximumHorizontalSpeed) {
      const scale = maximumHorizontalSpeed / horizontalSpeed;
      body.velocity.x *= scale;
      body.velocity.z *= scale;
    }
    const liftSupported = plush.liftSupportTime > 0 || plush.stackSupportTime > 0;
    body.velocity.y = clamp(body.velocity.y, -0.75, liftSupported ? 0.58 : 0);
    const spin = body.angularVelocity.length();
    if (spin > 0.36) {
      body.angularVelocity.scale(0.36 / spin, body.angularVelocity);
    }
  }

  resolvePlushOverlaps() {
    const active = this.plushes.filter(plush => (
      plush.active
      && !plush.won
      && !plush.inPrizeHole
      && this.grip?.plush !== plush
      && plush.body.position.y < 2.45
    ));
    for (let pass = 0; pass < 4; pass += 1) {
      for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
        const left = active[leftIndex];
        for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
          const right = active[rightIndex];
          const verticalDistance = Math.abs(left.body.position.y - right.body.position.y);
          if (verticalDistance > Math.min(left.spec.height, right.spec.height) * 0.78) continue;
          let dx = right.body.position.x - left.body.position.x;
          let dz = right.body.position.z - left.body.position.z;
          let distance = Math.hypot(dx, dz);
          const minimumDistance = (left.collisionRadius + right.collisionRadius) * 0.97;
          if (distance >= minimumDistance) continue;
          if (distance < 0.001) {
            const angle = ((leftIndex + 1) * 1.7 + rightIndex * 0.9) % (Math.PI * 2);
            dx = Math.cos(angle);
            dz = Math.sin(angle);
            distance = 1;
          }
          const normalX = dx / distance;
          const normalZ = dz / distance;
          const correction = (minimumDistance - distance) * 0.505;
          left.body.position.x -= normalX * correction;
          left.body.position.z -= normalZ * correction;
          right.body.position.x += normalX * correction;
          right.body.position.z += normalZ * correction;
          const relativeSpeed = (
            (right.body.velocity.x - left.body.velocity.x) * normalX
            + (right.body.velocity.z - left.body.velocity.z) * normalZ
          );
          if (relativeSpeed < 0) {
            const cancelSpeed = -relativeSpeed * 0.58;
            left.body.velocity.x -= normalX * cancelSpeed * 0.5;
            left.body.velocity.z -= normalZ * cancelSpeed * 0.5;
            right.body.velocity.x += normalX * cancelSpeed * 0.5;
            right.body.velocity.z += normalZ * cancelSpeed * 0.5;
          }
          left.body.angularVelocity.scale(0.34, left.body.angularVelocity);
          right.body.angularVelocity.scale(0.34, right.body.angularVelocity);
          left.body.aabbNeedsUpdate = true;
          right.body.aabbNeedsUpdate = true;
        }
      }
    }
  }

  maintainConveyorMotion() {
    this.plushes.forEach(plush => {
      if (
        !plush.active
        || plush.won
        || plush.inPrizeHole
        || plush.preserveDropPosition
        || this.grip?.plush === plush
      ) return;
      const body = plush.body;
      if (isInsideCenterMoundTransition(body.position.x, body.position.z)) return;
      const prizeHoleDistance = Math.hypot(
        body.position.x - PRIZE_HOLE_POSITION.x,
        body.position.z - PRIZE_HOLE_POSITION.z
      );
      if (prizeHoleDistance < 1.2 && body.position.y < 2.5) return;
      let data = nearestEllipseData(body.position.x, body.position.z);
      if (data.distance > 1.2 || body.position.y > 2.45) return;
      if (plush.armContactTime > 0) return;
      if (data.distance > TRACK_HARD_LIMIT) {
        const scale = TRACK_HARD_LIMIT / data.distance;
        body.position.x = data.point.x - data.dx * scale;
        body.position.z = data.point.z - data.dz * scale;
        data = nearestEllipseData(body.position.x, body.position.z);
      }
      const tangentSpeed = body.velocity.x * data.tangent.x + body.velocity.z * data.tangent.z;
      const minimumSpeed = (BELT_SPEED + plush.beltBias) * BELT_MINIMUM_SPEED_RATIO;
      if (tangentSpeed < minimumSpeed) {
        const correction = minimumSpeed - tangentSpeed;
        body.velocity.x += data.tangent.x * correction;
        body.velocity.z += data.tangent.z * correction;
      }
      body.angularVelocity.x = clamp(body.angularVelocity.x, -0.065, 0.065);
      body.angularVelocity.y = clamp(body.angularVelocity.y, -0.105, 0.105);
      body.angularVelocity.z = clamp(body.angularVelocity.z, -0.065, 0.065);
    });
  }

  confinePlushesToOuterFence() {
    this.plushes.forEach(plush => {
      if (!plush.active || plush.won || plush.inPrizeHole) return;
      const body = plush.body;
      const inset = plush.collisionRadius + 0.035;
      const allowedRx = Math.max(0.5, OUTER_FENCE_RX - inset);
      const allowedRz = Math.max(0.5, OUTER_FENCE_RZ - inset);
      const insideLevel = Math.hypot(
        body.position.x / allowedRx,
        body.position.z / allowedRz
      );
      const outsideRx = OUTER_FENCE_RX + inset;
      const outsideRz = OUTER_FENCE_RZ + inset;
      const outsideLevel = Math.hypot(
        body.position.x / outsideRx,
        body.position.z / outsideRz
      );
      body.updateAABB();
      const fullyAboveFence = body.aabb.lowerBound.y
        > OUTER_FENCE_TOP_Y + OUTER_FENCE_COLLISION_MARGIN;

      if (fullyAboveFence) {
        if (plush.outsideFenceAllowed && insideLevel <= 1) {
          plush.outsideFenceAllowed = false;
        } else if (!plush.outsideFenceAllowed && outsideLevel >= 1) {
          plush.outsideFenceAllowed = true;
        }
        return;
      }

      const keepOutside = plush.outsideFenceAllowed;
      if ((!keepOutside && insideLevel <= 1) || (keepOutside && outsideLevel >= 1)) return;

      const boundaryLevel = keepOutside
        ? Math.max(outsideLevel, 0.001)
        : insideLevel;
      body.position.x /= boundaryLevel;
      body.position.z /= boundaryLevel;
      const boundaryRx = keepOutside ? outsideRx : allowedRx;
      const boundaryRz = keepOutside ? outsideRz : allowedRz;
      const normalX = body.position.x / (boundaryRx * boundaryRx);
      const normalZ = body.position.z / (boundaryRz * boundaryRz);
      const normalLength = Math.hypot(normalX, normalZ) || 1;
      const outwardX = normalX / normalLength;
      const outwardZ = normalZ / normalLength;
      const outwardSpeed = body.velocity.x * outwardX + body.velocity.z * outwardZ;
      const movingThroughFence = keepOutside ? outwardSpeed < 0 : outwardSpeed > 0;
      if (movingThroughFence) {
        body.velocity.x -= outwardX * outwardSpeed;
        body.velocity.z -= outwardZ * outwardSpeed;
      }

      body.angularVelocity.scale(0.78, body.angularVelocity);
      body.aabbNeedsUpdate = true;
    });
  }

  updateClawOrientation() {
    this.clawToAnchor.set(
      this.carriage.position.x - this.clawBody.position.x,
      this.carriage.position.y - 0.08 - this.clawBody.position.y,
      this.carriage.position.z - this.clawBody.position.z
    );
    if (this.clawToAnchor.normalize() < 0.001) {
      this.clawCableOrientation.set(0, 0, 0, 1);
    } else {
      this.clawCableOrientation.setFromVectors(this.clawUpAxis, this.clawToAnchor);
    }
    this.clawIdentity.slerp(this.clawCableOrientation, 0.2, this.clawBaseOrientation);
    this.updateRigidClawContactTransform();
  }

  updateRigidClawContactTransform() {
    const pose = this.getProngPose();
    const tipRadii = [0, 1, 2].map(index => this.getProngTipRadius(pose, index));
    const radius = Math.max(
      0.2,
      tipRadii.reduce((total, value) => total + value, 0) / tipRadii.length
    );
    let slopeX = 0;
    let slopeZ = 0;
    for (let index = 0; index < 3; index += 1) {
      const angle = (index / 3) * Math.PI * 2;
      const lift = this.prongContactLift[index] || 0;
      slopeX += lift * Math.cos(angle);
      slopeZ += lift * Math.sin(angle);
    }
    const planeScale = 2 / (3 * radius);
    slopeX *= planeScale;
    slopeZ *= planeScale;
    const maximumSlope = Math.tan(0.36);
    const slopeLength = Math.hypot(slopeX, slopeZ);
    if (slopeLength > maximumSlope) {
      const scale = maximumSlope / slopeLength;
      slopeX *= scale;
      slopeZ *= scale;
    }

    // Fit one rigid claw plane to the three per-prong stop heights.
    this.clawContactNormal.set(-slopeX, 1, -slopeZ);
    this.clawContactNormal.normalize();
    this.clawContactTilt.setFromVectors(this.clawUpAxis, this.clawContactNormal);
    this.clawYawOrientation.setFromAxisAngle(this.clawUpAxis, this.clawYaw);
    this.clawBaseOrientation.mult(this.clawYawOrientation, this.clawYawBaseOrientation);
    this.clawYawBaseOrientation.mult(this.clawContactTilt, this.clawOrientation);

    let requiredLift = 0;
    for (let index = 0; index < 3; index += 1) {
      const lift = this.prongContactLift[index] || 0;
      if (lift <= 0.0001) continue;
      const angle = (index / 3) * Math.PI * 2;
      const pointRadius = tipRadii[index];
      this.clawContactLocalPoint.set(
        Math.cos(angle) * pointRadius,
        pose.tipY,
        Math.sin(angle) * pointRadius
      );
      this.clawYawBaseOrientation.vmult(this.clawContactLocalPoint, this.clawBasePointOffset);
      this.clawOrientation.vmult(this.clawContactLocalPoint, this.clawTiltedPointOffset);
      const tiltLift = this.clawTiltedPointOffset.y - this.clawBasePointOffset.y;
      requiredLift = Math.max(requiredLift, lift - tiltLift);
    }
    this.clawContactLiftY = Math.max(0, requiredLift);
    this.clawEffectivePosition.set(
      this.clawBody.position.x,
      this.clawBody.position.y + this.clawContactLiftY,
      this.clawBody.position.z
    );
  }

  getProngPose() {
    return {
      startRadius: 0.2 * CLAW_SIZE_SCALE,
      elbowRadius: lerp(1.27, 0.91, this.prongClosure) * CLAW_SIZE_SCALE,
      tipRadius: lerp(1.1, 0.67, this.prongClosure) * CLAW_SIZE_SCALE,
      startY: -0.06 * CLAW_SIZE_SCALE,
      elbowY: -0.72 * CLAW_SIZE_SCALE,
      tipY: -1.4 * CLAW_SIZE_SCALE
    };
  }

  getProngTipRadius(pose, prongIndex) {
    const inwardOffset = prongIndex === TURNER_PRONG_INDEX
      ? TURNER_PRONG_INWARD_OFFSET
      : 0;
    return Math.max(pose.startRadius, pose.tipRadius - inwardOffset);
  }

  getGripTargetY() {
    return this.getProngPose().tipY + ROUND_PRONG_TIP_RADIUS;
  }

  isPlushFullyBelowProngTips(plush) {
    const tipHeights = this.prongSegments
      .filter(segment => segment.kind === "lower")
      .map(segment => segment.end.y);
    if (tipHeights.length < 3) return false;
    const lowestTipY = Math.min(...tipHeights);
    const topSupport = this.getPlushArmSupport(plush, 0, -1, 0);
    return plush.body.position.y + topSupport
      < lowestTipY - PRONG_TIP_COLLISION_MARGIN;
  }

  updateProngBodies(delta) {
    if (
      this.gripClosureLock !== null
      && ["closing", "lifting", "carrying"].includes(this.phase)
    ) {
      this.prongClosure = this.gripClosureLock;
    }
    this.updateClawOrientation();
    const previousSegments = this.prongSegments;
    const headPosition = new CANNON.Vec3(
      this.clawEffectivePosition.x,
      this.clawEffectivePosition.y,
      this.clawEffectivePosition.z
    );
    const pose = this.getProngPose();
    this.appliedProngClosure = this.prongClosure;
    const worldProngs = [];
    for (let prongIndex = 0; prongIndex < 3; prongIndex += 1) {
      const angle = (prongIndex / 3) * Math.PI * 2;
      const radialX = Math.cos(angle);
      const radialZ = Math.sin(angle);
      const localStart = new CANNON.Vec3(
        radialX * pose.startRadius,
        pose.startY,
        radialZ * pose.startRadius
      );
      const localMiddle = new CANNON.Vec3(
        radialX * pose.elbowRadius,
        pose.elbowY,
        radialZ * pose.elbowRadius
      );
      const tipRadius = this.getProngTipRadius(pose, prongIndex);
      const localTip = new CANNON.Vec3(
        radialX * tipRadius,
        pose.tipY,
        radialZ * tipRadius
      );
      const inward = this.clawOrientation.vmult(new CANNON.Vec3(-radialX, 0, -radialZ));
      inward.normalize();
      worldProngs.push({
        start: headPosition.vadd(this.clawOrientation.vmult(localStart)),
        middle: headPosition.vadd(this.clawOrientation.vmult(localMiddle)),
        tip: headPosition.vadd(this.clawOrientation.vmult(localTip)),
        inward
      });
    }
    this.prongSegments = worldProngs.flatMap((prong, prongIndex) => [
      { start: prong.start, end: prong.middle, inward: prong.inward, prongIndex, kind: "upper" },
      { start: prong.middle, end: prong.tip, inward: prong.inward, prongIndex, kind: "lower" }
    ]);
    this.prongSegments.forEach((segment, index) => {
      const previous = previousSegments[index];
      const velocity = new CANNON.Vec3();
      if (previous && delta > 0) {
        velocity.set(
          ((segment.start.x + segment.end.x) - (previous.start.x + previous.end.x)) / (2 * delta),
          ((segment.start.y + segment.end.y) - (previous.start.y + previous.end.y)) / (2 * delta),
          ((segment.start.z + segment.end.z) - (previous.start.z + previous.end.z)) / (2 * delta)
        );
      }
      segment.velocity = velocity;
    });
    this.prongBodies.forEach(entry => {
      const prong = worldProngs[entry.prongIndex];
      let next;
      if (entry.turnerBlade) {
        next = prong.tip.clone();
      } else {
        const from = entry.segment === "upper" ? prong.start : prong.middle;
        const to = entry.segment === "upper" ? prong.middle : prong.tip;
        next = new CANNON.Vec3(
          lerp(from.x, to.x, entry.amount),
          lerp(from.y, to.y, entry.amount),
          lerp(from.z, to.z, entry.amount)
        );
      }
      const body = entry.body;
      const previous = body.position.clone();
      if (entry.initialized && delta > 0) {
        entry.previousPosition.copy(previous);
      } else if (!entry.initialized) {
        entry.previousPosition.copy(next);
      }
      body.position.copy(next);
      if (entry.initialized && delta > 0) {
        body.velocity.set(
          (next.x - previous.x) / delta,
          (next.y - previous.y) / delta,
          (next.z - previous.z) / delta
        );
      } else {
        body.velocity.set(0, 0, 0);
        entry.initialized = true;
      }
      if (entry.turnerBlade) {
        this.clawOrientation.mult(entry.localQuaternion, body.quaternion);
      } else {
        body.quaternion.copy(this.clawOrientation);
      }
      body.aabbNeedsUpdate = true;
    });
  }

  getProngFenceExtents(entry, outwardX, outwardZ) {
    const shape = entry.body.shapes[0];
    if (shape instanceof CANNON.Sphere) {
      return { horizontal: shape.radius, vertical: shape.radius };
    }
    if (shape instanceof CANNON.Box) {
      this.fenceWorldNormal.set(outwardX, 0, outwardZ);
      entry.body.vectorToLocalFrame(this.fenceWorldNormal, this.fenceLocalNormal);
      entry.body.vectorToLocalFrame(this.fenceUpAxis, this.fenceLocalUp);
      const half = shape.halfExtents;
      return {
        horizontal: Math.abs(this.fenceLocalNormal.x) * half.x
          + Math.abs(this.fenceLocalNormal.y) * half.y
          + Math.abs(this.fenceLocalNormal.z) * half.z,
        vertical: Math.abs(this.fenceLocalUp.x) * half.x
          + Math.abs(this.fenceLocalUp.y) * half.y
          + Math.abs(this.fenceLocalUp.z) * half.z
      };
    }
    const radius = shape.boundingSphereRadius || 0.12 * CLAW_SIZE_SCALE;
    return { horizontal: radius, vertical: radius };
  }

  getArmMoundPointPenetration(x, y, z) {
    const moundHeight = centerMoundHeightAt(x, z);
    if (moundHeight <= 0) return 0;
    const surfaceY = CENTER_MOUND_BASE_Y + moundHeight + ARM_MOUND_CLEARANCE;
    return Math.max(0, surfaceY - y);
  }

  getPlushMoundPointCorrection(x, y, z) {
    const moundHeight = centerMoundHeightAt(x, z);
    if (moundHeight <= 0) return Number.NEGATIVE_INFINITY;
    const surfaceY = CENTER_MOUND_BASE_Y + moundHeight + PLUSH_MOUND_CLEARANCE;
    return surfaceY - y;
  }

  getPlushSphereMoundCorrection(position, radius) {
    let correction = this.getPlushMoundPointCorrection(
      position.x,
      position.y - radius,
      position.z
    );
    ARM_MOUND_SPHERE_RING_SCALES.forEach(ringScale => {
      const horizontalRadius = radius * ringScale;
      const lowerOffset = radius * Math.sqrt(1 - ringScale * ringScale);
      for (let index = 0; index < ARM_MOUND_SAMPLE_DIRECTIONS; index += 1) {
        const angle = (index / ARM_MOUND_SAMPLE_DIRECTIONS) * Math.PI * 2;
        correction = Math.max(
          correction,
          this.getPlushMoundPointCorrection(
            position.x + Math.cos(angle) * horizontalRadius,
            position.y - lowerOffset,
            position.z + Math.sin(angle) * horizontalRadius
          )
        );
      }
    });
    return correction;
  }

  getPlushBoxMoundCorrection(body, offset, orientation, halfExtents) {
    let correction = Number.NEGATIVE_INFINITY;
    for (let xIndex = -1; xIndex <= 1; xIndex += 1) {
      for (let yIndex = -1; yIndex <= 1; yIndex += 1) {
        for (let zIndex = -1; zIndex <= 1; zIndex += 1) {
          this.plushMoundShapePoint.set(
            halfExtents.x * xIndex,
            halfExtents.y * yIndex,
            halfExtents.z * zIndex
          );
          orientation.vmult(this.plushMoundShapePoint, this.plushMoundBodyPoint);
          this.plushMoundBodyPoint.vadd(offset, this.plushMoundBodyPoint);
          body.quaternion.vmult(this.plushMoundBodyPoint, this.plushMoundWorldPoint);
          this.plushMoundWorldPoint.vadd(body.position, this.plushMoundWorldPoint);
          correction = Math.max(
            correction,
            this.getPlushMoundPointCorrection(
              this.plushMoundWorldPoint.x,
              this.plushMoundWorldPoint.y,
              this.plushMoundWorldPoint.z
            )
          );
        }
      }
    }
    return correction;
  }

  getPlushMoundContactCorrection(plush) {
    const body = plush.body;
    let correction = Number.NEGATIVE_INFINITY;
    const visualScaleX = plush.visual?.scale?.x || 1;
    const visualScaleY = plush.visual?.scale?.y || 1;
    const visualScaleZ = plush.visual?.scale?.z || 1;
    const contactPoints = plush.moundContactPoints || [];
    contactPoints.forEach(contactPoint => {
      this.plushMoundBodyPoint.set(
        contactPoint.x * visualScaleX,
        contactPoint.y * visualScaleY,
        contactPoint.z * visualScaleZ
      );
      body.quaternion.vmult(this.plushMoundBodyPoint, this.plushMoundWorldPoint);
      this.plushMoundWorldPoint.vadd(body.position, this.plushMoundWorldPoint);
      correction = Math.max(
        correction,
        this.getPlushMoundPointCorrection(
          this.plushMoundWorldPoint.x,
          this.plushMoundWorldPoint.y,
          this.plushMoundWorldPoint.z
        )
      );
    });
    return correction;
  }

  getPlushMoundPenetration(plush) {
    return Math.max(0, this.getPlushMoundContactCorrection(plush));
  }

  resolvePlushMoundPenetration() {
    let changed = false;
    this.plushes.forEach(plush => {
      if (!plush.active || plush.won || plush.inPrizeHole) return;
      const body = plush.body;
      const prizeHoleDistance = Math.hypot(
        body.position.x - PRIZE_HOLE_POSITION.x,
        body.position.z - PRIZE_HOLE_POSITION.z
      );
      if (prizeHoleDistance < 1.2) return;
      const penetration = this.getPlushMoundPenetration(plush);
      if (penetration <= 0.0001) return;
      const externallyLifted = this.grip?.plush === plush
        || plush.armContactTime > 0
        || plush.liftSupportTime > 0
        || plush.stackSupportTime > 0;
      body.position.y += penetration;
      if (externallyLifted) {
        body.velocity.y = Math.max(0, body.velocity.y);
      } else {
        body.velocity.y = 0;
        body.angularVelocity.x *= 0.86;
        body.angularVelocity.z *= 0.86;
      }
      body.aabbNeedsUpdate = true;
      body.wakeUp();
      changed = true;
    });
    return changed;
  }

  getSphereMoundPenetration(position, radius) {
    let penetration = this.getArmMoundPointPenetration(
      position.x,
      position.y - radius,
      position.z
    );
    ARM_MOUND_SPHERE_RING_SCALES.forEach(ringScale => {
      const horizontalRadius = radius * ringScale;
      const lowerOffset = radius * Math.sqrt(1 - ringScale * ringScale);
      for (let index = 0; index < ARM_MOUND_SAMPLE_DIRECTIONS; index += 1) {
        const angle = (index / ARM_MOUND_SAMPLE_DIRECTIONS) * Math.PI * 2;
        penetration = Math.max(
          penetration,
          this.getArmMoundPointPenetration(
            position.x + Math.cos(angle) * horizontalRadius,
            position.y - lowerOffset,
            position.z + Math.sin(angle) * horizontalRadius
          )
        );
      }
    });
    return penetration;
  }

  getBoxMoundPenetration(body, halfExtents) {
    let penetration = 0;
    for (let xIndex = -1; xIndex <= 1; xIndex += 1) {
      for (let yIndex = -1; yIndex <= 1; yIndex += 2) {
        for (let zIndex = -1; zIndex <= 1; zIndex += 1) {
          this.moundSampleLocalPoint.set(
            halfExtents.x * xIndex,
            halfExtents.y * yIndex,
            halfExtents.z * zIndex
          );
          body.quaternion.vmult(this.moundSampleLocalPoint, this.moundSampleWorldPoint);
          this.moundSampleWorldPoint.vadd(body.position, this.moundSampleWorldPoint);
          penetration = Math.max(
            penetration,
            this.getArmMoundPointPenetration(
              this.moundSampleWorldPoint.x,
              this.moundSampleWorldPoint.y,
              this.moundSampleWorldPoint.z
            )
          );
        }
      }
    }
    return penetration;
  }

  getProngMoundPenetration(entry) {
    const shape = entry.body.shapes[0];
    if (shape instanceof CANNON.Sphere) {
      const includesRoundTip = entry.segment === "lower" && entry.amount >= 0.95;
      const visualRadius = includesRoundTip ? ROUND_PRONG_TIP_RADIUS : 0;
      return this.getSphereMoundPenetration(
        entry.body.position,
        Math.max(shape.radius, visualRadius)
      );
    }
    if (shape instanceof CANNON.Box) {
      return this.getBoxMoundPenetration(entry.body, shape.halfExtents);
    }
    const radius = shape.boundingSphereRadius || 0.12 * CLAW_SIZE_SCALE;
    return this.getSphereMoundPenetration(entry.body.position, radius);
  }

  resolveArmMoundPenetration() {
    if (this.phase !== "descending" && this.phase !== "closing") return false;
    const penetrationByProng = [0, 0, 0];
    this.prongBodies.forEach(entry => {
      penetrationByProng[entry.prongIndex] = Math.max(
        penetrationByProng[entry.prongIndex],
        this.getProngMoundPenetration(entry)
      );
    });
    let changed = false;
    penetrationByProng.forEach((penetration, index) => {
      if (penetration <= 0.0001) return;
      this.prongContactHold[index] = Math.max(this.prongContactHold[index], 0.16);
      this.prongContactStrength[index] = 1;
      const oldLift = this.prongContactLift[index];
      const nextLift = Math.min(
        1.45 * CLAW_SIZE_SCALE,
        oldLift + penetration
      );
      if (Math.abs(nextLift - oldLift) <= 0.0001) return;
      this.prongContactLift[index] = nextLift;
      changed = true;
    });
    return changed;
  }

  collectArmFenceContacts() {
    const contacts = [];
    this.prongBodies.forEach(entry => {
      const position = entry.body.position;
      const data = nearestEllipseData(
        position.x,
        position.z,
        OUTER_FENCE_RX,
        OUTER_FENCE_RZ
      );
      let outwardX = data.point.x / (OUTER_FENCE_RX * OUTER_FENCE_RX);
      let outwardZ = data.point.z / (OUTER_FENCE_RZ * OUTER_FENCE_RZ);
      const outwardLength = Math.hypot(outwardX, outwardZ) || 1;
      outwardX /= outwardLength;
      outwardZ /= outwardLength;
      const signedDistance = (position.x - data.point.x) * outwardX
        + (position.z - data.point.z) * outwardZ;
      const previous = entry.previousPosition || position;
      const previousSignedDistance = (previous.x - data.point.x) * outwardX
        + (previous.z - data.point.z) * outwardZ;
      const extents = this.getProngFenceExtents(entry, outwardX, outwardZ);
      const inner = -OUTER_FENCE_HALF_THICKNESS
        - extents.horizontal
        - OUTER_FENCE_COLLISION_MARGIN;
      const outer = OUTER_FENCE_HALF_THICKNESS
        + extents.horizontal
        + OUTER_FENCE_COLLISION_MARGIN;
      const bottom = OUTER_FENCE_BOTTOM_Y
        - extents.vertical
        - OUTER_FENCE_COLLISION_MARGIN;
      const top = OUTER_FENCE_TOP_Y
        + extents.vertical
        + OUTER_FENCE_COLLISION_MARGIN;
      const insideNow = signedDistance >= inner
        && signedDistance <= outer
        && position.y >= bottom
        && position.y <= top;
      const distanceTravel = signedDistance - previousSignedDistance;
      const verticalTravel = position.y - previous.y;
      const crossings = [];
      const addHorizontalCrossing = (boundary, direction) => {
        if (Math.abs(distanceTravel) < 0.000001) return;
        const time = (boundary - previousSignedDistance) / distanceTravel;
        if (time < 0 || time > 1) return;
        const crossingY = previous.y + verticalTravel * time;
        if (crossingY < bottom || crossingY > top) return;
        crossings.push({ time, direction });
      };
      const addVerticalCrossing = (boundary, direction) => {
        if (Math.abs(verticalTravel) < 0.000001) return;
        const time = (boundary - previous.y) / verticalTravel;
        if (time < 0 || time > 1) return;
        const crossingDistance = previousSignedDistance + distanceTravel * time;
        if (crossingDistance < inner || crossingDistance > outer) return;
        crossings.push({ time, direction });
      };
      if (previousSignedDistance > outer && signedDistance <= outer) {
        addHorizontalCrossing(outer, "outward");
      }
      if (previousSignedDistance < inner && signedDistance >= inner) {
        addHorizontalCrossing(inner, "inward");
      }
      if (previous.y > top && position.y <= top) {
        addVerticalCrossing(top, "up");
      }
      if (previous.y < bottom && position.y >= bottom) {
        addVerticalCrossing(bottom, "down");
      }
      if (!insideNow && crossings.length === 0) return;

      crossings.sort((left, right) => left.time - right.time);
      let direction = crossings[0]?.direction;
      if (!direction) {
        const candidates = [
          { direction: "outward", penetration: outer - signedDistance },
          { direction: "inward", penetration: signedDistance - inner },
          { direction: "up", penetration: top - position.y },
          { direction: "down", penetration: position.y - bottom }
        ];
        candidates.sort((left, right) => left.penetration - right.penetration);
        direction = candidates[0].direction;
      }

      let normalX = 0;
      let normalY = 0;
      let normalZ = 0;
      let penetration = 0;
      if (direction === "outward") {
        normalX = outwardX;
        normalZ = outwardZ;
        penetration = outer - signedDistance;
      } else if (direction === "inward") {
        normalX = -outwardX;
        normalZ = -outwardZ;
        penetration = signedDistance - inner;
      } else if (direction === "up") {
        normalY = 1;
        penetration = top - position.y;
      } else {
        normalY = -1;
        penetration = position.y - bottom;
      }
      if (penetration <= 0.00001) return;
      contacts.push({
        entry,
        normalX,
        normalY,
        normalZ,
        penetration
      });
    });
    return contacts;
  }

  resolveArmFencePenetration(contacts) {
    const constraints = contacts.filter(contact => !(
      this.phase === "descending" && contact.normalY > 0.5
    ));
    if (!constraints.length) return false;
    let correctionX = 0;
    let correctionY = 0;
    let correctionZ = 0;
    for (let pass = 0; pass < 4; pass += 1) {
      constraints.forEach(contact => {
        const projection = correctionX * contact.normalX
          + correctionY * contact.normalY
          + correctionZ * contact.normalZ;
        const shortfall = contact.penetration - projection;
        if (shortfall <= 0) return;
        correctionX += contact.normalX * shortfall;
        correctionY += contact.normalY * shortfall;
        correctionZ += contact.normalZ * shortfall;
      });
    }
    const correctionLength = Math.hypot(correctionX, correctionY, correctionZ);
    if (correctionLength <= 0.00001) return false;
    const maximumCorrection = 0.55;
    if (correctionLength > maximumCorrection) {
      const scale = maximumCorrection / correctionLength;
      correctionX *= scale;
      correctionY *= scale;
      correctionZ *= scale;
    }
    this.clawBody.position.x += correctionX;
    this.clawBody.position.y += correctionY;
    this.clawBody.position.z += correctionZ;
    const normalLength = Math.hypot(correctionX, correctionY, correctionZ) || 1;
    const normalX = correctionX / normalLength;
    const normalY = correctionY / normalLength;
    const normalZ = correctionZ / normalLength;
    const inwardVelocity = this.clawBody.velocity.x * normalX
      + this.clawBody.velocity.y * normalY
      + this.clawBody.velocity.z * normalZ;
    if (inwardVelocity < 0) {
      this.clawBody.velocity.x -= normalX * inwardVelocity;
      this.clawBody.velocity.y -= normalY * inwardVelocity;
      this.clawBody.velocity.z -= normalZ * inwardVelocity;
    }
    this.clawBody.aabbNeedsUpdate = true;
    return true;
  }

  updateDescendingProngStops(delta, fenceContacts = []) {
    const currentClawY = this.clawBody.position.y;
    const previousClawY = Number.isFinite(this.prongStopClawY)
      ? this.prongStopClawY
      : currentClawY;
    const downwardTravel = Math.max(0, previousClawY - currentClawY);
    const upwardTravel = Math.max(0, currentClawY - previousClawY);
    this.prongStopClawY = currentClawY;
    let changed = false;

    if (this.phase !== "descending") {
      this.prongContactHold = this.prongContactHold.map(value => Math.max(0, value - delta));
      if (this.phase === "closing") return false;
      const recovery = this.phase === "lifting"
        ? Math.max(upwardTravel * 0.96, delta * 0.32)
        : delta * 2.2;
      this.prongContactLift = this.prongContactLift.map(value => {
        const next = Math.max(0, value - recovery);
        if (Math.abs(next - value) > 0.0001) changed = true;
        return next;
      });
      return changed;
    }

    const activePlushBodies = new Set(
      this.plushes
        .filter(plush => plush.active && !plush.won && !plush.inPrizeHole)
        .map(plush => plush.body)
    );
    const prongEntryByBody = new Map(
      this.prongBodies.map(entry => [entry.body, entry])
    );
    const frameStrength = [0, 0, 0];

    this.world.contacts.forEach(contact => {
      if (!contact.enabled) return;
      let entry = prongEntryByBody.get(contact.bi);
      let otherBody = contact.bj;
      if (!entry) {
        entry = prongEntryByBody.get(contact.bj);
        otherBody = contact.bi;
      }
      if (!entry || !activePlushBodies.has(otherBody)) return;
      const verticalNormal = Math.abs(contact.ni.y);
      const stopStrength = clamp((verticalNormal - 0.35) / 0.55, 0, 1);
      if (stopStrength <= 0.05) return;
      const index = entry.prongIndex;
      frameStrength[index] = Math.max(frameStrength[index], stopStrength);
    });
    fenceContacts.forEach(contact => {
      if (contact.normalY <= 0.35) return;
      const index = contact.entry.prongIndex;
      const stopStrength = clamp((contact.normalY - 0.25) / 0.75, 0, 1);
      frameStrength[index] = Math.max(frameStrength[index], stopStrength);
    });

    for (let index = 0; index < 3; index += 1) {
      if (frameStrength[index] > 0) {
        this.prongContactHold[index] = 0.14;
        this.prongContactStrength[index] = frameStrength[index];
      } else {
        this.prongContactHold[index] = Math.max(0, this.prongContactHold[index] - delta);
      }
      const oldLift = this.prongContactLift[index];
      let nextLift = oldLift;
      if (this.prongContactHold[index] > 0 && downwardTravel > 0) {
        const liftIncrease = downwardTravel
          * this.prongContactStrength[index];
        nextLift = Math.min(1.45 * CLAW_SIZE_SCALE, oldLift + liftIncrease);
      } else if (this.prongContactHold[index] <= 0 && downwardTravel > 0) {
        nextLift = Math.max(0, oldLift - downwardTravel * 0.18);
      }
      if (Math.abs(nextLift - oldLift) > 0.0001) changed = true;
      this.prongContactLift[index] = nextLift;
    }
    return changed;
  }

  resolveArmPlushPenetration(passes = 3) {
    if (!this.prongSegments.length) return;
    this.plushes.forEach(plush => {
      if (!plush.active || plush.won || plush.inPrizeHole) return;
      const body = plush.body;
      const insideClaw = this.isPlushInsideClawEnvelope(plush);
      const horizontalDistance = Math.hypot(
        body.position.x - this.clawEffectivePosition.x,
        body.position.z - this.clawEffectivePosition.z
      );
      if (
        horizontalDistance > 2.35 * CLAW_SIZE_SCALE
        || body.position.y > this.clawEffectivePosition.y + 0.75 * CLAW_SIZE_SCALE
      ) return;
      if (this.isPlushFullyBelowProngTips(plush)) {
        plush.clawContained = false;
        plush.slipReleaseTime = 0;
      }
      for (let pass = 0; pass < passes; pass += 1) {
        this.prongSegments.forEach(segment => {
          const closest = closestPointOnSegment(body.position, segment.start, segment.end);
          const dx = body.position.x - closest.x;
          const dy = body.position.y - closest.y;
          const dz = body.position.z - closest.z;
          let distance = Math.hypot(dx, dy, dz);
          let normalX;
          let normalY;
          let normalZ;
          const inwardSide = dx * segment.inward.x
            + dy * segment.inward.y
            + dz * segment.inward.z;
          const containedOnInnerSide = plush.clawContained && inwardSide >= -0.001;
          if (containedOnInnerSide) {
            normalX = segment.inward.x;
            normalY = segment.inward.y;
            normalZ = segment.inward.z;
          } else if (distance > 0.001) {
            normalX = dx / distance;
            normalY = dy / distance;
            normalZ = dz / distance;
          } else {
            normalX = -segment.inward.x;
            normalY = -segment.inward.y;
            normalZ = -segment.inward.z;
            distance = 0;
          }
          const supportFromBelow = !plush.clawContained
            && insideClaw
            && normalY > 0.16
            && body.position.y - closest.y > plush.spec.height * 0.08;
          if (
            !plush.clawContained
            && !insideClaw
            && plush.stackSupportTime <= 0
            && !supportFromBelow
            && normalY > 0
          ) {
            normalY = 0;
            const horizontalNormalLength = Math.hypot(normalX, normalZ);
            if (horizontalNormalLength > 0.001) {
              normalX /= horizontalNormalLength;
              normalZ /= horizontalNormalLength;
            } else {
              normalX = -segment.inward.x;
              normalY = -Math.abs(segment.inward.y);
              normalZ = -segment.inward.z;
            }
          }
          const normalLength = Math.hypot(normalX, normalY, normalZ);
          if (normalLength > 0.001) {
            normalX /= normalLength;
            normalY /= normalLength;
            normalZ /= normalLength;
          }
          const clearance = this.getPlushArmClearance(
            plush,
            normalX,
            normalY,
            normalZ
          );
          if (distance >= clearance) return;
          this.markArmContact(plush);
          if (supportFromBelow) {
            this.markPlushSupportedByArm(plush);
            plush.liftSupportTime = Math.max(plush.liftSupportTime, 0.2);
          }
          const desiredCorrection = (clearance - distance) * 0.78 + 0.003;
          const correctionBudget = Number.isFinite(plush.armCorrectionRemaining)
            ? plush.armCorrectionRemaining
            : ARM_PLUSH_CORRECTION_BUDGET_PER_FRAME;
          const correction = Math.min(desiredCorrection, 0.055, correctionBudget);
          plush.armCorrectionRemaining = Math.max(0, correctionBudget - correction);
          body.position.x += normalX * correction;
          body.position.y += normalY * correction;
          body.position.z += normalZ * correction;
          const armVelocity = segment.velocity || CANNON.Vec3.ZERO;
          const relativeVelocityX = body.velocity.x - armVelocity.x;
          const relativeVelocityY = body.velocity.y - armVelocity.y;
          const relativeVelocityZ = body.velocity.z - armVelocity.z;
          const relativeNormalSpeed = relativeVelocityX * normalX
            + relativeVelocityY * normalY
            + relativeVelocityZ * normalZ;
          if (relativeNormalSpeed < 0) {
            const closingContact = this.phase === "closing";
            const maximumNormalTransfer = closingContact ? 0.148 : 0.21;
            const normalTransferScale = closingContact ? 0.285 : 0.49;
            const normalTransfer = Math.min(
              -relativeNormalSpeed * normalTransferScale,
              maximumNormalTransfer
            );
            body.velocity.x += normalX * normalTransfer;
            body.velocity.y += normalY * normalTransfer;
            body.velocity.z += normalZ * normalTransfer;
          }
          const tangentialBlend = this.phase === "closing" ? 0.075 : 0.05;
          const armDifferenceX = armVelocity.x - body.velocity.x;
          const armDifferenceY = armVelocity.y - body.velocity.y;
          const armDifferenceZ = armVelocity.z - body.velocity.z;
          const armDifferenceNormal = armDifferenceX * normalX
            + armDifferenceY * normalY
            + armDifferenceZ * normalZ;
          body.velocity.x += clamp(
            (armDifferenceX - normalX * armDifferenceNormal) * tangentialBlend,
            -0.055,
            0.055
          );
          body.velocity.z += clamp(
            (armDifferenceZ - normalZ * armDifferenceNormal) * tangentialBlend,
            -0.055,
            0.055
          );
          if (insideClaw) {
            body.velocity.y += clamp(
              (armDifferenceY - normalY * armDifferenceNormal) * tangentialBlend,
              -0.055,
              0.055
            );
          } else if (plush.stackSupportTime <= 0) {
            body.velocity.y = Math.min(body.velocity.y, 0);
          }
          if (containedOnInnerSide) {
            const outwardSpeed = -(
              body.velocity.x * segment.inward.x
              + body.velocity.y * segment.inward.y
              + body.velocity.z * segment.inward.z
            );
            if (outwardSpeed > 0) {
              body.velocity.x += segment.inward.x * outwardSpeed * 0.96;
              body.velocity.y += segment.inward.y * outwardSpeed * 0.96;
              body.velocity.z += segment.inward.z * outwardSpeed * 0.96;
            }
          }
          body.angularVelocity.scale(0.72, body.angularVelocity);
          body.aabbNeedsUpdate = true;
        });
      }
      this.limitArmPressDepth(plush);
      this.limitArmDeflectionSpeed(plush);
    });
  }

  rejectPartialGrip(plush) {
    if (!plush) return;
    plush.clawContained = false;
    if (plush.body.imasoraProngContactMaterial) {
      plush.body.imasoraProngContactMaterial.friction = plush.body.imasoraProngFriction;
    }
    plush.body.angularVelocity.scale(0.75, plush.body.angularVelocity);
    plush.body.wakeUp();
  }

  getGripProngContacts(plush, { includeRecent = false } = {}) {
    const prongEntryByBody = new Map(
      this.prongBodies.map(entry => [entry.body, entry])
    );
    const contactIndices = new Set();
    const supportiveIndices = new Set();
    const supportScores = [0, 0, 0];
    let supportScore = 0;
    this.world.contacts.forEach(contact => {
      if (!contact.enabled) return;
      let prongEntry = null;
      let plushContactOffset = null;
      let upwardSupport = 0;
      if (contact.bi === plush.body) {
        prongEntry = prongEntryByBody.get(contact.bj);
        plushContactOffset = contact.ri;
        upwardSupport = -contact.ni.y;
      } else if (contact.bj === plush.body) {
        prongEntry = prongEntryByBody.get(contact.bi);
        plushContactOffset = contact.rj;
        upwardSupport = contact.ni.y;
      }
      if (!prongEntry || !plushContactOffset) return;
      contactIndices.add(prongEntry.prongIndex);

      const relativeLowerDepth = -plushContactOffset.y / Math.max(0.001, plush.spec.height);
      const lowerSupport = clamp((relativeLowerDepth - 0.1) / 0.35, 0, 1);
      const normalSupport = clamp((upwardSupport - 0.16) / 0.64, 0, 1);
      const contactSupport = lowerSupport * normalSupport;
      supportScores[prongEntry.prongIndex] = Math.max(
        supportScores[prongEntry.prongIndex],
        contactSupport
      );
      supportScore = Math.max(supportScore, contactSupport);
      if (contactSupport >= 0.07) supportiveIndices.add(prongEntry.prongIndex);
    });
    if (includeRecent) {
      const now = this.elapsed;
      for (let index = 0; index < 3; index += 1) {
        if (contactIndices.has(index)) {
          plush.gripContactSeenUntil[index] = now + GRIP_CONTACT_HISTORY_SECONDS;
        }
        if (supportiveIndices.has(index)) {
          plush.gripSupportSeenUntil[index] = now + GRIP_CONTACT_HISTORY_SECONDS;
          plush.gripRecentSupportScores[index] = supportScores[index];
        }
        if (plush.gripContactSeenUntil[index] > now) {
          contactIndices.add(index);
        }
        if (plush.gripSupportSeenUntil[index] > now) {
          supportiveIndices.add(index);
          supportScore = Math.max(
            supportScore,
            plush.gripRecentSupportScores[index]
          );
        } else {
          plush.gripRecentSupportScores[index] = 0;
        }
      }
    }
    return { contactIndices, supportiveIndices, supportScore };
  }

  isNaturalSlipPathClear(grip, releaseVelocity) {
    const plush = grip?.plush;
    if (!plush?.active || plush.won) return false;
    if (this.isPlushFullyBelowProngTips(plush)) return true;
    const contacts = this.getGripProngContacts(plush);
    if (contacts.contactIndices.size >= 2 && contacts.supportiveIndices.size >= 1) {
      return false;
    }

    const armVelocity = this.clawBody?.velocity || CANNON.Vec3.ZERO;
    const relativeDropY = releaseVelocity.y - armVelocity.y;
    if (relativeDropY > -0.05) return false;
    const start = plush.body.position;
    const gravityY = this.world?.gravity?.y ?? -9.82;
    const sampleCount = 18;
    const horizon = 0.54;
    const lowerSegments = this.prongSegments.filter(segment => segment.kind === "lower");
    if (lowerSegments.length < 3) return false;
    const lowerTipY = Math.min(...lowerSegments.map(segment => segment.end.y));
    const topSupport = this.getPlushArmSupport(plush, 0, -1, 0);
    const getSegmentState = (point, segment, shiftX = 0, shiftY = 0, shiftZ = 0) => {
      const shiftedStart = {
        x: segment.start.x + shiftX,
        y: segment.start.y + shiftY,
        z: segment.start.z + shiftZ
      };
      const shiftedEnd = {
        x: segment.end.x + shiftX,
        y: segment.end.y + shiftY,
        z: segment.end.z + shiftZ
      };
      const closest = closestPointOnSegment(point, shiftedStart, shiftedEnd);
      let normalX = point.x - closest.x;
      let normalY = point.y - closest.y;
      let normalZ = point.z - closest.z;
      const inwardSide = normalX * segment.inward.x
        + normalY * segment.inward.y
        + normalZ * segment.inward.z;
      const distance = Math.hypot(normalX, normalY, normalZ);
      if (distance > 0.001) {
        normalX /= distance;
        normalY /= distance;
        normalZ /= distance;
      } else {
        normalX = segment.inward.x;
        normalY = segment.inward.y;
        normalZ = segment.inward.z;
      }
      return {
        distance,
        inwardSide,
        clearance: this.getPlushArmSupport(plush, normalX, normalY, normalZ)
          + PRONG_SHAFT_COLLIDER_RADIUS
          + PRONG_TIP_COLLISION_MARGIN
      };
    };
    const getTipState = (point, entry, shiftX = 0, shiftY = 0, shiftZ = 0) => {
      let normalX = point.x - entry.body.position.x - shiftX;
      let normalY = point.y - entry.body.position.y - shiftY;
      let normalZ = point.z - entry.body.position.z - shiftZ;
      const distance = Math.hypot(normalX, normalY, normalZ);
      if (distance > 0.001) {
        normalX /= distance;
        normalY /= distance;
        normalZ /= distance;
      } else {
        const lowerSegment = this.prongSegments.find(segment => (
          segment.prongIndex === entry.prongIndex && segment.kind === "lower"
        ));
        normalX = lowerSegment?.inward.x || 0;
        normalY = lowerSegment?.inward.y || 0;
        normalZ = lowerSegment?.inward.z || 1;
      }
      return {
        distance,
        clearance: this.getPlushArmSupport(plush, normalX, normalY, normalZ)
          + this.getProngTipSupport(entry, normalX, normalY, normalZ)
          + PRONG_TIP_SOLVER_EPSILON
      };
    };

    const initialSegments = this.prongSegments.map(segment => (
      getSegmentState(start, segment)
    ));
    const tipEntries = this.prongBodies.filter(entry => entry.roundTip || entry.turnerBlade);
    const initialTips = tipEntries.map(entry => getTipState(start, entry));
    for (let sample = 1; sample <= sampleCount; sample += 1) {
      const time = horizon * sample / sampleCount;
      const armShiftX = armVelocity.x * time;
      const armShiftY = armVelocity.y * time;
      const armShiftZ = armVelocity.z * time;
      const point = {
        x: start.x + releaseVelocity.x * time,
        y: start.y + releaseVelocity.y * time + gravityY * time * time * 0.5,
        z: start.z + releaseVelocity.z * time
      };
      const fullyBelow = point.y + topSupport
        < lowerTipY + armShiftY - PRONG_TIP_COLLISION_MARGIN;
      for (let index = 0; index < this.prongSegments.length; index += 1) {
        const state = getSegmentState(
          point,
          this.prongSegments[index],
          armShiftX,
          armShiftY,
          armShiftZ
        );
        const initial = initialSegments[index];
        const crossedArmCenter = initial.inwardSide >= -0.006
          && state.inwardSide < -0.006;
        const enteredSolid = initial.distance >= initial.clearance - 0.008
          && state.distance < state.clearance - 0.008;
        const pressedDeeper = initial.distance < initial.clearance - 0.008
          && state.distance < initial.distance - 0.018;
        if (!fullyBelow && (crossedArmCenter || enteredSolid || pressedDeeper)) {
          return false;
        }
      }
      for (let index = 0; index < tipEntries.length; index += 1) {
        const state = getTipState(
          point,
          tipEntries[index],
          armShiftX,
          armShiftY,
          armShiftZ
        );
        const initial = initialTips[index];
        const enteredSolid = initial.distance >= initial.clearance - 0.008
          && state.distance < state.clearance - 0.008;
        const pressedDeeper = initial.distance < initial.clearance - 0.008
          && state.distance < initial.distance - 0.018;
        if (!fullyBelow && (enteredSolid || pressedDeeper)) return false;
      }
      if (fullyBelow) return true;
    }
    return true;
  }

  captureGripReleaseInfluence(grip, delta) {
    const plush = grip?.plush;
    if (!plush?.active || plush.won) return;
    const prongBodies = new Set(this.prongBodies.map(entry => entry.body));
    const weightedOffset = new CANNON.Vec3();
    const weightedNormal = new CANNON.Vec3();
    let totalWeight = 0;
    this.world.contacts.forEach(contact => {
      if (!contact.enabled) return;
      let prongBody = null;
      let contactOffset = null;
      let normalX = 0;
      let normalY = 0;
      let normalZ = 0;
      if (contact.bi === plush.body && prongBodies.has(contact.bj)) {
        prongBody = contact.bj;
        contactOffset = contact.ri;
        normalX = -contact.ni.x;
        normalY = -contact.ni.y;
        normalZ = -contact.ni.z;
      } else if (contact.bj === plush.body && prongBodies.has(contact.bi)) {
        prongBody = contact.bi;
        contactOffset = contact.rj;
        normalX = contact.ni.x;
        normalY = contact.ni.y;
        normalZ = contact.ni.z;
      }
      if (!prongBody || !contactOffset) return;
      const relativeLowerDepth = -contactOffset.y / Math.max(0.001, plush.spec.height);
      const lowerWeight = clamp((relativeLowerDepth + 0.12) / 0.62, 0, 1);
      const upwardWeight = clamp((normalY + 0.18) / 1.05, 0, 1);
      const weight = 0.1 + lowerWeight * 0.42 + upwardWeight * 0.48;
      weightedOffset.x += contactOffset.x * weight;
      weightedOffset.y += contactOffset.y * weight;
      weightedOffset.z += contactOffset.z * weight;
      weightedNormal.x += normalX * weight;
      weightedNormal.y += normalY * weight;
      weightedNormal.z += normalZ * weight;
      totalWeight += weight;
    });
    if (totalWeight <= 0.001) {
      grip.lastContactAge += delta;
      return;
    }
    weightedOffset.scale(1 / totalWeight, weightedOffset);
    weightedNormal.scale(1 / totalWeight, weightedNormal);
    const normalLength = weightedNormal.length();
    if (normalLength > 0.001) weightedNormal.scale(1 / normalLength, weightedNormal);
    const firstContact = !Number.isFinite(grip.lastContactAge)
      || grip.lastContactAge > 0.12;
    const blend = firstContact ? 1 : clamp(delta * 20, 0.18, 0.58);
    grip.lastContactOffset.x = lerp(grip.lastContactOffset.x, weightedOffset.x, blend);
    grip.lastContactOffset.y = lerp(grip.lastContactOffset.y, weightedOffset.y, blend);
    grip.lastContactOffset.z = lerp(grip.lastContactOffset.z, weightedOffset.z, blend);
    grip.lastContactNormal.x = lerp(grip.lastContactNormal.x, weightedNormal.x, blend);
    grip.lastContactNormal.y = lerp(grip.lastContactNormal.y, weightedNormal.y, blend);
    grip.lastContactNormal.z = lerp(grip.lastContactNormal.z, weightedNormal.z, blend);
    grip.lastContactStrength = lerp(
      grip.lastContactStrength,
      clamp(totalWeight / 1.6, 0, 1),
      blend
    );
    grip.lastContactAge = 0;
  }

  tryGrip({ deferFailure = false } = {}) {
    this.updateClawOrientation();
    const holdClosure = clamp(
      Number.isFinite(this.appliedProngClosure)
        ? this.appliedProngClosure
        : this.prongClosure,
      0,
      1
    );
    const localTipOffset = this.clawOrientation.vmult(
      new CANNON.Vec3(0, this.getGripTargetY(), 0)
    );
    const grabPoint = this.clawEffectivePosition.vadd(localTipOffset);
    const candidates = this.plushes
      .filter(plush => plush.active && !plush.won && !plush.inPrizeHole)
      .map(plush => {
        const dx = plush.body.position.x - grabPoint.x;
        const dy = plush.body.position.y - grabPoint.y;
        const dz = plush.body.position.z - grabPoint.z;
        const horizontal = Math.hypot(dx, dz);
        const vertical = Math.abs(dy);
        const centered = clamp(1 - horizontal / (1.05 * CLAW_SIZE_SCALE), 0, 1);
        const heightMatch = clamp(1 - vertical / (0.95 * CLAW_SIZE_SCALE), 0, 1);
        const quality = centered * 0.72 + heightMatch * 0.28;
        const prongContacts = this.getGripProngContacts(plush, { includeRecent: true });
        return {
          plush,
          horizontal,
          vertical,
          quality,
          contactCount: prongContacts.contactIndices.size,
          supportContactCount: prongContacts.supportiveIndices.size,
          supportScore: prongContacts.supportScore
        };
      })
      .filter(candidate => (
        candidate.horizontal < 1.08 * CLAW_SIZE_SCALE
        && candidate.vertical < 0.98 * CLAW_SIZE_SCALE
        && this.isPlushInValidGripVolume(candidate.plush)
      ))
      .sort((left, right) => (
        right.contactCount - left.contactCount
        || right.supportContactCount - left.supportContactCount
        || right.supportScore - left.supportScore
        || right.quality - left.quality
      ));
    const candidate = candidates.find(entry => {
      const threeArmGrip = entry.contactCount === 3 && entry.quality >= 0.2;
      const centeredTwoArmGrip = entry.contactCount === 2
        && entry.quality >= ENCLOSED_TWO_ARM_GRIP_MIN_QUALITY;
      return entry.supportContactCount >= 1
        && (threeArmGrip || centeredTwoArmGrip);
    });
    if (!candidate) {
      if (deferFailure) return false;
      const bestCandidate = candidates[0];
      const bestContactCount = bestCandidate?.contactCount || 0;
      const bestSupportContactCount = bestCandidate?.supportContactCount || 0;
      const sideOnlyGrip = bestContactCount === 3 && bestSupportContactCount === 0;
      this.rejectPartialGrip(bestCandidate?.plush);
      if (sideOnlyGrip) {
        return false;
      }
      if (bestContactCount === 2) {
        return false;
      }
      return false;
    }
    const body = candidate.plush.body;
    const localGrabPoint = body.pointToLocalFrame(grabPoint);
    const noise = 0.88 + Math.random() * 0.18;
    const supportFactor = lerp(0.72, 1, smoothStep(candidate.supportScore));
    const integrity = clamp(
      candidate.plush.spec.grip * candidate.quality * supportFactor * noise + 0.08,
      0.12,
      0.56
    );
    this.grip = {
      plush: candidate.plush,
      localGrabPoint,
      lastTarget: grabPoint.clone(),
      transportVelocity: this.clawBody.velocity.clone(),
      slipOffsetY: 0,
      physicalHoldLossTime: 0,
      lastContactOffset: new CANNON.Vec3(),
      lastContactNormal: new CANNON.Vec3(),
      lastContactStrength: 0,
      lastContactAge: Number.POSITIVE_INFINITY,
      heldQuaternion: body.quaternion.clone(),
      integrity,
      startingIntegrity: integrity,
      startingY: body.position.y,
      maximumLiftDistance: 0,
      holeDropGuaranteed: false,
      quality: candidate.quality,
      contactCount: candidate.contactCount,
      supportScore: candidate.supportScore,
      holdClosure,
      centerOffsetRatio: clamp(
        candidate.horizontal / (1.05 * CLAW_SIZE_SCALE),
        0,
        1
      ),
      midairInstabilityTime: 0
    };
    this.gripClosureLock = holdClosure;
    this.prongClosure = holdClosure;
    this.updateProngBodies(0);
    candidate.plush.clawContained = true;
    candidate.plush.slipReleaseTime = 0;
    safeSelectSound();
    return true;
  }

  updateGrip(delta) {
    const grip = this.grip;
    if (!grip || !grip.plush.active || grip.plush.won) return;
    const body = grip.plush.body;
    const liftDistance = Math.max(0, body.position.y - grip.startingY);
    grip.maximumLiftDistance = Math.max(grip.maximumLiftDistance, liftDistance);
    if (
      this.isPlushInValidGripVolume(grip.plush)
      && grip.maximumLiftDistance >= PRIZE_HOLE_REQUIRED_LIFT_DISTANCE
    ) {
      grip.plush.prizeLiftQualified = true;
    }
    this.captureGripReleaseInfluence(grip, delta);
    if (this.isPlushFullyBelowProngTips(grip.plush)) {
      if (grip.holeDropGuaranteed) {
        this.releaseGrip(false, true);
      } else {
        this.releaseSlippedPlush(grip, false);
      }
      return;
    }
    const slipSpan = Math.max(0.001, grip.startingIntegrity - 0.055);
    const gripWear = clamp(
      (grip.startingIntegrity - grip.integrity) / slipSpan,
      0,
      1
    );
    const visibleSlip = smoothStep(clamp((gripWear - 0.38) / 0.62, 0, 1));
    const slipTargetY = -0.34 * CLAW_SIZE_SCALE * visibleSlip;
    const slipBlend = 1 - Math.exp(-7 * delta);
    grip.slipOffsetY = lerp(grip.slipOffsetY, slipTargetY, slipBlend);
    const localTarget = new CANNON.Vec3(
      0,
      this.getGripTargetY() + grip.slipOffsetY,
      0
    );
    const rotatedTarget = this.clawOrientation.vmult(localTarget);
    const target = this.clawEffectivePosition.vadd(rotatedTarget);
    const targetVelocity = target.vsub(grip.lastTarget).scale(1 / Math.max(delta, 0.001));
    const targetSpeed = targetVelocity.length();
    if (targetSpeed > 3.2) targetVelocity.scale(3.2 / targetSpeed, targetVelocity);
    const transportBlend = clamp(delta * 10, 0, 0.35);
    grip.transportVelocity.x = lerp(grip.transportVelocity.x, targetVelocity.x, transportBlend);
    grip.transportVelocity.y = lerp(grip.transportVelocity.y, targetVelocity.y, transportBlend);
    grip.transportVelocity.z = lerp(grip.transportVelocity.z, targetVelocity.z, transportBlend);
    grip.lastTarget.copy(target);
    const grabPoint = body.pointToWorldFrame(grip.localGrabPoint);
    const displacement = target.vsub(grabPoint);
    const relativeVelocity = body.velocity.vsub(this.clawBody.velocity);
    let holdForceScale = 1;
    let sustainedInstabilityWear = 0;
    if (this.phase === "lifting" || this.phase === "carrying") {
      const prongContacts = this.getGripProngContacts(grip.plush);
      const insideClaw = this.isPlushInsideClawEnvelope(grip.plush);
      const supportContactCount = prongContacts.supportiveIndices.size;
      const supportWeakness = 1 - clamp(prongContacts.supportScore, 0, 1);
      const unstableHold = supportContactCount <= 1
        || supportWeakness > 0.55
        || grip.centerOffsetRatio > 0.4;
      if (unstableHold) {
        grip.midairInstabilityTime += delta;
      } else {
        grip.midairInstabilityTime = Math.max(
          0,
          grip.midairInstabilityTime - delta * 2
        );
      }
      // Only sustained instability adds wear, so one-frame contact jitter cannot cause a drop.
      const instabilityBlend = smoothStep(clamp(
        (grip.midairInstabilityTime - 0.3) / 0.7,
        0,
        1
      ));
      const supportCountWear = supportContactCount <= 1
        ? 0.008
        : supportContactCount === 2
          ? 0.002
          : 0;
      sustainedInstabilityWear = instabilityBlend * (
        supportCountWear
        + supportWeakness * 0.008
        + grip.centerOffsetRatio * 0.006
      );
      const physicallyHeld = insideClaw
        && prongContacts.contactIndices.size >= 2
        && prongContacts.supportiveIndices.size >= 1;
      if (physicallyHeld) {
        grip.physicalHoldLossTime = Math.max(0, grip.physicalHoldLossTime - delta * 3);
      } else {
        grip.physicalHoldLossTime += delta;
      }
      if (!physicallyHeld) {
        holdForceScale = 0.78 * clamp(
          1 - grip.physicalHoldLossTime / 0.26,
          0,
          1
        );
      }
      if (grip.physicalHoldLossTime >= 0.26) {
        if (grip.holeDropGuaranteed) {
          this.releaseGrip(false, true);
          return;
        } else {
          const released = this.releaseSlippedPlush(grip, insideClaw);
          if (released) {
            return;
          }
          grip.physicalHoldLossTime = 0;
          grip.integrity = Math.max(grip.integrity, 0.085);
          holdForceScale = 1;
        }
      }
    }
    const springForce = displacement.scale(34 * holdForceScale);
    const dampingForce = relativeVelocity.scale(-5.2 * holdForceScale);
    const totalForce = springForce.vadd(dampingForce);
    const maximumForce = 16.5 + grip.integrity * 24;
    const forceLength = totalForce.length();
    if (forceLength > maximumForce) {
      const scale = maximumForce / forceLength;
      totalForce.x *= scale;
      totalForce.y *= scale;
      totalForce.z *= scale;
    }
    if ((this.phase === "lifting" || this.phase === "carrying") && !grip.holeDropGuaranteed) {
      const demand = forceLength / maximumForce;
      const sway = Math.hypot(this.clawBody.velocity.x, this.clawBody.velocity.z);
      const offset = displacement.length();
      const massPenalty = Math.max(0, body.mass - 0.9) * 0.065;
      const slipRate = 0.028
        + Math.max(0, demand - 0.57) * 0.28
        + sway * 0.022
        + offset * 0.035
        + massPenalty
        + sustainedInstabilityWear;
      grip.integrity -= slipRate * delta;
      if (grip.integrity <= 0.055 || offset > 1.45 * CLAW_SIZE_SCALE) {
        const released = this.releaseSlippedPlush(grip);
        if (released) {
          return;
        }
        grip.integrity = Math.max(grip.integrity, 0.085);
        grip.physicalHoldLossTime = 0;
        holdForceScale = 1;
      }
    }

    body.applyForce(totalForce);
    this.clawBody.applyForce(
      new CANNON.Vec3(-totalForce.x, -totalForce.y, -totalForce.z)
    );
  }

  releaseSlippedPlush(grip, keepClawContact = true) {
    const slippedPlush = grip?.plush;
    if (!slippedPlush?.active || slippedPlush.won) return false;
    const body = slippedPlush.body;
    const dropPosition = body.position.clone();
    const dropQuaternion = body.quaternion.clone();
    const transportVelocity = grip.transportVelocity || this.clawBody.velocity;
    const releaseVelocity = new CANNON.Vec3(
      lerp(body.velocity.x, transportVelocity.x, 0.54),
      clamp(
        lerp(body.velocity.y, transportVelocity.y, 0.22),
        -SLIP_RELEASE_MAX_INITIAL_DROP_SPEED,
        -0.08
      ),
      lerp(body.velocity.z, transportVelocity.z, 0.54)
    );
    let contactSpinX = 0;
    let contactSpinZ = 0;
    const contactAge = Number(grip.lastContactAge);
    const contactOffset = grip.lastContactOffset;
    const contactNormal = grip.lastContactNormal;
    const horizontalOffset = contactOffset
      ? Math.hypot(contactOffset.x, contactOffset.z)
      : 0;
    if (
      Number.isFinite(contactAge)
      && contactAge <= 0.5
      && grip.lastContactStrength > 0.05
      && horizontalOffset > 0.035
    ) {
      let slideX = -contactOffset.x / horizontalOffset;
      let slideZ = -contactOffset.z / horizontalOffset;
      const normalHorizontal = Math.hypot(contactNormal.x, contactNormal.z);
      if (normalHorizontal > 0.01) {
        slideX = slideX * 0.72 + (contactNormal.x / normalHorizontal) * 0.28;
        slideZ = slideZ * 0.72 + (contactNormal.z / normalHorizontal) * 0.28;
        const slideLength = Math.hypot(slideX, slideZ);
        if (slideLength > 0.001) {
          slideX /= slideLength;
          slideZ /= slideLength;
        }
      }
      const referenceRadius = Math.max(
        0.2,
        Math.max(slippedPlush.spec.width, slippedPlush.spec.depth) * 0.52
      );
      const asymmetry = clamp(horizontalOffset / referenceRadius, 0, 1);
      const freshness = clamp(1 - contactAge / 0.5, 0, 1);
      const contactInfluence = asymmetry * grip.lastContactStrength * freshness;
      const slideSpeed = 0.34 * contactInfluence;
      releaseVelocity.x += slideX * slideSpeed;
      releaseVelocity.z += slideZ * slideSpeed;
      contactSpinX = (-contactOffset.z / horizontalOffset)
        * SLIP_RELEASE_CONTACT_TILT_SPEED * contactInfluence;
      contactSpinZ = (contactOffset.x / horizontalOffset)
        * SLIP_RELEASE_CONTACT_TILT_SPEED * contactInfluence;
    }
    const horizontalSpeed = Math.hypot(releaseVelocity.x, releaseVelocity.z);
    if (horizontalSpeed > 1.75) {
      const speedScale = 1.75 / horizontalSpeed;
      releaseVelocity.x *= speedScale;
      releaseVelocity.z *= speedScale;
    }
    if (!this.isNaturalSlipPathClear(grip, releaseVelocity)) return false;

    const retainClawContact = keepClawContact
      && this.isPlushInsideClawEnvelope(slippedPlush);
    slippedPlush.preserveDropPosition = true;
    slippedPlush.clawContained = retainClawContact;
    slippedPlush.slipReleaseTime = retainClawContact ? 0.42 : 0;
    slippedPlush.softArmFallActive = true;
    slippedPlush.directArmSupport = false;
    slippedPlush.liftSupportTime = 0;
    slippedPlush.stackSupportTime = 0;
    slippedPlush.armContactTime = 0;
    this.releaseGrip(false);
    body.position.copy(dropPosition);
    body.quaternion.copy(dropQuaternion);
    body.velocity.copy(releaseVelocity);
    body.angularVelocity.x += contactSpinX;
    body.angularVelocity.z += contactSpinZ;
    const spin = body.angularVelocity.length();
    if (spin > SLIP_RELEASE_MAX_TILT_SPEED) {
      body.angularVelocity.scale(SLIP_RELEASE_MAX_TILT_SPEED / spin, body.angularVelocity);
    }
    body.linearDamping = 0.025;
    body.angularDamping = 0.58;
    body.aabbNeedsUpdate = true;
    body.wakeUp();
    return true;
  }

  stabilizeHeldPlushRotation() {
    const grip = this.grip;
    if (!grip || !grip.plush.active || grip.plush.won) return;
    const body = grip.plush.body;
    const slipSpan = Math.max(0.001, grip.startingIntegrity - 0.055);
    const slipProgress = clamp(
      (grip.startingIntegrity - grip.integrity) / slipSpan,
      0,
      1
    );
    const rotationFreedom = smoothStep(clamp((slipProgress - 0.82) / 0.18, 0, 1));
    grip.heldQuaternion.slerp(body.quaternion, rotationFreedom, body.quaternion);
    if (rotationFreedom <= 0.05) {
      body.angularVelocity.set(0, 0, 0);
    } else {
      body.angularVelocity.scale(0.45 + rotationFreedom * 0.45, body.angularVelocity);
      const maximumSpin = lerp(0.01, 0.24, rotationFreedom);
      const spin = body.angularVelocity.length();
      if (spin > maximumSpin) {
        body.angularVelocity.scale(maximumSpin / spin, body.angularVelocity);
      }
    }
    body.aabbNeedsUpdate = true;
  }

  releaseGrip(showMessage = false, dropImmediately = false) {
    if (!this.grip) return;
    const releasedPlush = this.grip.plush;
    if (dropImmediately && releasedPlush) {
      const body = releasedPlush.body;
      releasedPlush.clawContained = false;
      releasedPlush.liftSupportTime = 0;
      releasedPlush.stackSupportTime = 0;
      releasedPlush.armContactTime = 0;
      releasedPlush.softArmFallActive = false;
      releasedPlush.directArmSupport = false;
      releasedPlush.preserveDropPosition = false;
      releasedPlush.inPrizeHole = true;
      body.position.x = PRIZE_HOLE_POSITION.x;
      body.position.z = PRIZE_HOLE_POSITION.z;
      body.velocity.x = 0;
      body.velocity.z = 0;
      body.velocity.y = Math.min(body.velocity.y, -0.52);
      body.angularVelocity.scale(0.3, body.angularVelocity);
      body.collisionFilterMask = 0;
      body.collisionResponse = false;
      body.linearDamping = 0.2;
      body.angularDamping = 0.94;
      body.aabbNeedsUpdate = true;
      body.wakeUp();
    }
    this.grip = null;
  }

  detectPrizes(delta) {
    this.plushes.forEach(plush => {
      if (!plush.active || plush.won) return;
      const body = plush.body;
      if (plush.inPrizeHole) {
        const pullAmount = clamp(delta * 7.5, 0, 1);
        const targetVelocityX = (PRIZE_HOLE_POSITION.x - body.position.x) * 2.4;
        const targetVelocityZ = (PRIZE_HOLE_POSITION.z - body.position.z) * 2.4;
        body.velocity.x = lerp(body.velocity.x, targetVelocityX, pullAmount);
        body.velocity.z = lerp(body.velocity.z, targetVelocityZ, pullAmount);
        body.velocity.y = Math.min(body.velocity.y, -0.28);
        body.angularVelocity.scale(0.9, body.angularVelocity);
        if (body.position.y <= PRIZE_HOLE_AWARD_Y) this.markPrizeWon(plush);
        return;
      }
      if (this.grip?.plush === plush || body.position.y > PRIZE_HOLE_ENTRY_Y) return;
      const holeLevel = Math.max(
        Math.abs(body.position.x - PRIZE_HOLE_POSITION.x) / PRIZE_HOLE_RADIUS_X,
        Math.abs(body.position.z - PRIZE_HOLE_POSITION.z) / PRIZE_HOLE_RADIUS_Z
      );
      const triggerScale = plush.prizeLiftQualified
        ? PRIZE_HOLE_TRIGGER_SCALE
        : PRIZE_HOLE_UNLIFTED_TRIGGER_SCALE;
      if (holeLevel > triggerScale) return;
      plush.inPrizeHole = true;
      plush.clawContained = false;
      body.collisionFilterMask = 0;
      body.collisionResponse = false;
      body.linearDamping = 0.2;
      body.angularDamping = 0.94;
      body.velocity.x *= 0.3;
      body.velocity.z *= 0.3;
      body.velocity.y = Math.min(body.velocity.y, -0.38);
      body.angularVelocity.scale(0.45, body.angularVelocity);
      body.aabbNeedsUpdate = true;
      body.wakeUp();
    });
  }

  markPrizeWon(plush) {
    plush.won = true;
    plush.active = false;
    plush.clawContained = false;
    if (this.grip?.plush === plush) this.releaseGrip(false);
    if (this.world.bodies.includes(plush.body)) this.world.removeBody(plush.body);
    plush.visual.userData.caughtAt = this.elapsed;
    this.caughtCount += 1;
    this.attemptCaught += 1;
    const value = Math.max(100, Number(plush.value || 160));
    this.score += value;
    this.caughtNames.push(plush.name);
    this.refreshHud();
    safeCatchSound();
  }

  finishAttempt() {
    this.releaseGrip(false);
    this.plushes.forEach(plush => {
      plush.clawContained = false;
      if (plush.body.imasoraProngContactMaterial) {
        plush.body.imasoraProngContactMaterial.friction = plush.body.imasoraProngFriction;
      }
    });
    this.gripAttempted = false;
    this.releaseStarted = false;
    this.releaseActiveHandle(false);
    this.setClawStarNeonMode("default");
    this.attemptCaught = 0;
    if (this.attemptsRemaining <= 0 || this.activePlushCount() <= 0) {
      this.showResult();
      return;
    }
    this.phase = "horizontal";
    this.phaseTime = 0;
    this.carriage.target.set(HOME_POSITION.x, CARRIAGE_Y, HOME_POSITION.z);
    this.refreshControls();
  }

  activePlushCount() {
    return this.plushes.filter(plush => plush.active && !plush.won).length;
  }

  showResult() {
    this.phase = "result";
    this.releaseGrip(false);
    this.refreshControls();
    const title = this.caughtCount >= 4
      ? "相棒キャッチャーマスター"
      : this.caughtCount >= 2
        ? "揺れを読んだナイスキャッチ"
        : this.caughtCount >= 1
          ? "相棒ぬいぐるみをキャッチ"
          : "ベルトと揺れを読んで再挑戦";
    const description = this.caughtCount
      ? `${this.caughtCount}体をキャッチしました。中心の合わせ方と、持ち上げ中の揺れが結果を分けます。`
      : "爪の中心、ベルトの速度、持ち上げ時の揺れを合わせるとキャッチしやすくなります。";
    const prizes = this.caughtNames.length
      ? this.caughtNames.map(escapeHtml).join(" / ")
      : "今回のキャッチはありません";
    this.els.result.innerHTML = `<div class="icc-result-panel">
      <small>RESULT</small>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
      <div class="icc-result-score">${this.score}</div>
      <div class="icc-result-prizes">${prizes}</div>
      <button type="button" data-icc-action="restart">もう一度あそぶ</button>
    </div>`;
    this.els.result.hidden = false;
    this.refreshHud();
  }

  refreshHud() {
    this.els.attempts.textContent = `${this.attemptsRemaining}/${MAX_ATTEMPTS}`;
    this.els.caught.textContent = String(this.caughtCount);
    this.els.score.textContent = String(this.score);
  }

  refreshControls() {
    if (
      !this.els?.horizontal
      || !this.els?.vertical
      || !this.els?.rotation
      || !this.els?.fineHorizontal
      || !this.els?.fineVertical
      || !this.els?.fineLeft
      || !this.els?.fineRight
      || !this.els?.fineUp
      || !this.els?.fineDown
      || !this.els?.stop
    ) return;
    const horizontalReady = this.phase === "horizontal" && this.attemptsRemaining > 0;
    const verticalReady = this.phase === "vertical" && this.attemptsRemaining > 0;
    const rotationReady = this.phase === "rotation" && this.attemptsRemaining > 0;
    const fineHorizontalReady = this.phase === "fineHorizontal" && this.attemptsRemaining > 0;
    const fineVerticalReady = this.phase === "fineVertical" && this.attemptsRemaining > 0;
    const descentReady = this.phase === "fineSettle" && this.attemptsRemaining > 0;
    this.els.horizontal.disabled = !horizontalReady;
    this.els.vertical.disabled = !verticalReady;
    this.els.rotation.disabled = !rotationReady;
    this.els.fineLeft.disabled = !fineHorizontalReady;
    this.els.fineRight.disabled = !fineHorizontalReady;
    this.els.fineUp.disabled = !fineVerticalReady;
    this.els.fineDown.disabled = !fineVerticalReady;
    this.els.stop.disabled = !descentReady;
    this.els.horizontal.classList.toggle("is-active", horizontalReady);
    this.els.vertical.classList.toggle("is-active", verticalReady);
    this.els.rotation.classList.toggle("is-active", rotationReady);
    this.els.fineHorizontal.classList.toggle("is-active", fineHorizontalReady);
    this.els.fineVertical.classList.toggle("is-active", fineVerticalReady);
    this.els.fineHorizontal.setAttribute("aria-disabled", String(!fineHorizontalReady));
    this.els.fineVertical.setAttribute("aria-disabled", String(!fineVerticalReady));
    this.els.horizontal.classList.toggle("is-complete", this.phase !== "horizontal");
    this.els.vertical.classList.toggle(
      "is-complete",
      !["horizontal", "vertical"].includes(this.phase)
    );
    this.els.rotation.classList.toggle(
      "is-complete",
      !["horizontal", "vertical", "rotation"].includes(this.phase)
    );
    this.els.fineHorizontal.classList.toggle(
      "is-complete",
      !["horizontal", "vertical", "rotation", "fineHorizontal"].includes(this.phase)
    );
    this.els.fineVertical.classList.toggle(
      "is-complete",
      !["horizontal", "vertical", "rotation", "fineHorizontal", "fineVertical"].includes(this.phase)
    );
    this.els.stop.classList.toggle("is-active", descentReady);
    this.els.stop.classList.toggle(
      "is-complete",
      ![
        "horizontal",
        "vertical",
        "rotation",
        "fineHorizontal",
        "fineVertical",
        "fineSettle"
      ].includes(this.phase)
    );
    this.els.horizontal.setAttribute("aria-pressed", String(this.activeHandle === "horizontal"));
    this.els.vertical.setAttribute("aria-pressed", String(this.activeHandle === "vertical"));
    this.els.rotation.setAttribute("aria-pressed", String(this.activeHandle === "rotation"));
    this.els.fineLeft.setAttribute("aria-pressed", String(this.activeHandle === "left"));
    this.els.fineRight.setAttribute("aria-pressed", String(this.activeHandle === "right"));
    this.els.fineUp.setAttribute("aria-pressed", String(this.activeHandle === "up"));
    this.els.fineDown.setAttribute("aria-pressed", String(this.activeHandle === "down"));
    const labels = {
      horizontal: "待機",
      vertical: "待機",
      rotation: "待機",
      fineHorizontal: "待機",
      fineVertical: "待機",
      fineSettle: "押して開始",
      descending: "下降中",
      closing: "爪を閉じる",
      lifting: "自動上昇",
      carrying: "自動移動",
      releasing: "自動開放",
      returning: "自動復帰",
      result: "終了"
    };
    this.els.stopLabel.textContent = labels[this.phase] || "待機";
  }

  showCallout(text, duration = 900) {
    clearTimeout(this.calloutTimer);
    this.els.callout.textContent = text;
    this.els.callout.classList.add("is-visible");
    this.calloutTimer = window.setTimeout(() => {
      if (!this.destroyed) this.els.callout.classList.remove("is-visible");
    }, duration);
  }

  showFatalError() {
    if (!this.els?.viewport) {
      this.root.innerHTML = `<div class="icc-load-error"><div><strong>3Dキャッチャーを起動できませんでした</strong><p>ページを更新して、もう一度ゲームセンターから開いてください。</p></div></div>`;
      return;
    }
    this.phase = "result";
    this.els.result.hidden = false;
    this.els.result.innerHTML = `<div class="icc-result-panel">
      <small>3D LOAD ERROR</small>
      <strong>3Dキャッチャーを起動できませんでした</strong>
      <p>ページを更新して、もう一度ゲームセンターから開いてください。</p>
      <button type="button" data-icc-action="restart">もう一度試す</button>
    </div>`;
  }

  updateBeltVisuals(delta) {
    if (!this.cloudConveyorPuffs || !this.cloudPuffLayout.length) return;
    let instanceIndex = 0;
    this.beltSlats.forEach(cloud => {
      const angle = advanceEllipseAngle(cloud.userData.angle, BELT_SPEED * delta);
      cloud.userData.angle = angle;
      const point = ellipsePoint(angle);
      const tangent = ellipseTangent(angle);
      const yaw = Math.atan2(-tangent.z, tangent.x);
      const cosine = Math.cos(yaw);
      const sine = Math.sin(yaw);
      this.cloudPuffLayout.forEach(puff => {
        this.cloudTransform.position.set(
          point.x + cosine * puff.x + sine * puff.z,
          BELT_SURFACE_Y - 0.24 + puff.y + CLOUD_PUFF_Y_OFFSET,
          point.z - sine * puff.x + cosine * puff.z
        );
        this.cloudTransform.rotation.set(0, yaw, 0);
        this.cloudTransform.scale.set(
          puff.scale[0],
          puff.scale[1] * CLOUD_PUFF_HEIGHT_SCALE,
          puff.scale[2]
        );
        this.cloudTransform.updateMatrix();
        this.cloudConveyorPuffs.setMatrixAt(instanceIndex, this.cloudTransform.matrix);
        instanceIndex += 1;
      });
    });
    this.cloudConveyorPuffs.instanceMatrix.needsUpdate = true;
  }

  updateClawVisual() {
    this.updateClawOrientation();
    const neonPulse = 0.5 + Math.sin(this.elapsed * 2.8) * 0.5;
    const timedStageWarningStart = TIMED_STAGE_LIMIT_SECONDS - TIMED_STAGE_WARNING_SECONDS;
    const timedStageWarningActive = (
      this.phase === "fineHorizontal"
      || this.phase === "fineVertical"
      || this.phase === "fineSettle"
    ) && this.phaseTime >= timedStageWarningStart;
    const timedStageWarningElapsed = Math.max(0, this.phaseTime - timedStageWarningStart);
    const timedStageWarningOn = !timedStageWarningActive
      || Math.floor(timedStageWarningElapsed * TIMED_STAGE_WARNING_BLINK_HZ * 2) % 2 === 0;
    const timedStageWarningBrightness = timedStageWarningOn ? 1 : 0.08;
    if (this.clawStarShellMaterial) {
      const emissivePower = this.clawStarNeonEmissivePower ?? 1;
      this.clawStarShellMaterial.emissiveIntensity = (1.02 + neonPulse * 0.28)
        * emissivePower * timedStageWarningBrightness;
      this.clawStarFaceMaterial.emissiveIntensity = (1.18 + neonPulse * 0.32)
        * emissivePower * timedStageWarningBrightness;
      this.clawStarJewelMaterial.emissiveIntensity = (1.3 + neonPulse * 0.3)
        * emissivePower * timedStageWarningBrightness;
      this.clawStarGlowMaterial.opacity = (0.18 + neonPulse * 0.09) * timedStageWarningBrightness;
      this.clawStarLight.intensity = (2.8 + neonPulse * 0.95) * timedStageWarningBrightness;
    }
    this.carriageVisual.position.copy(this.carriage.position);
    this.clawVisual.position.set(
      this.clawEffectivePosition.x,
      this.clawEffectivePosition.y,
      this.clawEffectivePosition.z
    );
    this.clawVisual.quaternion.set(
      this.clawOrientation.x,
      this.clawOrientation.y,
      this.clawOrientation.z,
      this.clawOrientation.w
    );
    const cablePositions = this.cableGeometry.attributes.position.array;
    cablePositions[0] = this.carriage.position.x;
    cablePositions[1] = this.carriage.position.y - 0.1;
    cablePositions[2] = this.carriage.position.z;
    cablePositions[3] = this.clawEffectivePosition.x;
    cablePositions[4] = this.clawEffectivePosition.y + 0.25;
    cablePositions[5] = this.clawEffectivePosition.z;
    this.cableGeometry.attributes.position.needsUpdate = true;

    const pose = this.getProngPose();
    this.prongVisuals.forEach((prong, prongIndex) => {
      const radialX = Math.cos(prong.angle);
      const radialZ = Math.sin(prong.angle);
      const start = new THREE.Vector3(
        radialX * pose.startRadius,
        pose.startY,
        radialZ * pose.startRadius
      );
      const middle = new THREE.Vector3(
        radialX * pose.elbowRadius,
        pose.elbowY,
        radialZ * pose.elbowRadius
      );
      const tipRadius = this.getProngTipRadius(pose, prongIndex);
      const tipPoint = new THREE.Vector3(
        radialX * tipRadius,
        pose.tipY,
        radialZ * tipRadius
      );
      setMeshBetween(prong.upper, start, middle);
      setMeshBetween(prong.lower, middle, tipPoint);
      prong.tip.position.copy(tipPoint);
      if (prong.isTurner) {
        prong.tip.rotation.set(0, Math.PI / 2 - prong.angle, 0);
      }
    });
  }

  syncPlushVisuals(delta) {
    const heldPlush = this.grip?.plush?.active && !this.grip.plush.won
      ? this.grip.plush
      : null;
    const compressionBlend = 1 - Math.exp(-HELD_PLUSH_COMPRESSION_RATE * delta);
    this.plushes.forEach(plush => {
      if (plush.won) {
        const elapsed = this.elapsed - Number(plush.visual.userData.caughtAt || this.elapsed);
        const scale = clamp(1 - elapsed * 2.4, 0, 1);
        plush.visual.scale.setScalar(scale);
        plush.visual.position.y -= 0.025;
        if (scale <= 0.01) plush.visual.visible = false;
        return;
      }
      plush.visual.position.set(
        plush.body.position.x,
        plush.body.position.y,
        plush.body.position.z
      );
      plush.visual.quaternion.set(
        plush.body.quaternion.x,
        plush.body.quaternion.y,
        plush.body.quaternion.z,
        plush.body.quaternion.w
      );
      const isHeld = plush === heldPlush;
      const targetScaleXZ = isHeld ? HELD_PLUSH_VISUAL_SCALE_XZ : 1;
      const targetScaleY = isHeld ? HELD_PLUSH_VISUAL_SCALE_Y : 1;
      plush.visual.scale.x = lerp(plush.visual.scale.x, targetScaleXZ, compressionBlend);
      plush.visual.scale.y = lerp(plush.visual.scale.y, targetScaleY, compressionBlend);
      plush.visual.scale.z = lerp(plush.visual.scale.z, targetScaleXZ, compressionBlend);
    });
  }

  updateMachineControlVisuals() {
    if (!this.machineControlVisuals) return;
    const pulse = 0.5 + Math.sin(this.elapsed * 5.2) * 0.5;
    if (this.numberPlaqueNeonLight) this.numberPlaqueNeonLight.intensity = 0;
    Object.values(this.machineControlVisuals).forEach(visual => {
      const active = this.phase === visual.phase && this.attemptsRemaining > 0;
      const glowPower = active ? 0.68 + pulse * 0.52 : 0.025;
      visual.haloMaterial.opacity = active ? 0.38 + pulse * 0.25 : 0.035;
      const plaque = this.machineControlNumberPlaques?.[visual.number];
      if (plaque) {
        plaque.rimMaterial.emissive.setHex(0x6d4300);
        plaque.rimMaterial.emissiveIntensity = 0.08;
        plaque.glowMaterial.opacity = active ? 0.42 + pulse * 0.3 : 0;
        plaque.glow.scale.setScalar(1);
        plaque.haloMaterial.opacity = 0;
        plaque.halo.scale.setScalar(1);
      }
      if (visual.kind === "button") {
        visual.baseMaterial.emissiveIntensity = active ? 0.42 + pulse * 0.34 : 0.025;
        visual.faceMaterial.emissiveIntensity = glowPower;
        visual.sideMaterial.emissiveIntensity = active ? 0.38 + pulse * 0.3 : 0.035;
        const pressed = this.activeHandle === visual.key
          || (visual.key === "stop" && Number(this.descentButtonPressedUntil || 0) > this.elapsed);
        const targetY = visual.restY - (pressed ? 0.035 : 0);
        visual.capGroup.position.y = lerp(visual.capGroup.position.y, targetY, 0.34);
        return;
      }
      visual.frameMaterial.emissiveIntensity = active ? 0.5 + pulse * 0.38 : 0.025;
      visual.knobMaterial.emissiveIntensity = active ? 0.48 + pulse * 0.34 : 0.055;
      if (visual.kind === "horizontalLever") {
        const direction = this.activeHandle === "left" ? -1 : this.activeHandle === "right" ? 1 : 0;
        visual.mover.position.x = lerp(visual.mover.position.x, visual.restX + direction * 0.155, 0.28);
        visual.mover.rotation.z = lerp(visual.mover.rotation.z, -direction * 0.32, 0.28);
      } else {
        const direction = this.activeHandle === "up" ? -1 : this.activeHandle === "down" ? 1 : 0;
        visual.mover.position.z = lerp(
          visual.mover.position.z,
          visual.restZ + direction * 0.155,
          0.28
        );
        visual.mover.rotation.x = lerp(
          visual.mover.rotation.x,
          direction * 0.32,
          0.28
        );
      }
    });
  }

  updateControlHitTargets(force = false) {
    if (
      !this.machineControlAnchors
      || !this.controlProjectionPoint
      || !this.els?.viewport
      || !this.camera
    ) return;
    if (!force && this.elapsed < this.nextControlProjectionTime) return;
    this.nextControlProjectionTime = this.elapsed + 0.05;
    const width = Math.max(1, this.els.viewport.clientWidth);
    const height = Math.max(1, this.els.viewport.clientHeight);
    const elements = {
      horizontal: this.els.horizontal,
      vertical: this.els.vertical,
      rotation: this.els.rotation,
      fineHorizontal: this.els.fineHorizontal,
      fineVertical: this.els.fineVertical,
      stop: this.els.stop
    };
    Object.entries(this.machineControlAnchors).forEach(([key, anchor]) => {
      const element = elements[key];
      if (!element) return;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let visibleDepth = false;
      [-1, 1].forEach(xDirection => {
        [-1, 1].forEach(zDirection => {
          this.controlProjectionPoint.set(
            anchor.x + anchor.halfWidth * xDirection,
            anchor.y,
            anchor.z + anchor.halfDepth * zDirection
          ).project(this.camera);
          if (this.controlProjectionPoint.z >= -1 && this.controlProjectionPoint.z <= 1) {
            visibleDepth = true;
          }
          const screenX = (this.controlProjectionPoint.x * 0.5 + 0.5) * width;
          const screenY = (-this.controlProjectionPoint.y * 0.5 + 0.5) * height;
          minX = Math.min(minX, screenX);
          maxX = Math.max(maxX, screenX);
          minY = Math.min(minY, screenY);
          maxY = Math.max(maxY, screenY);
        });
      });
      const targetWidth = Math.max(44, maxX - minX + 10);
      const targetHeight = Math.max(44, maxY - minY + 12);
      const centerX = (minX + maxX) * 0.5;
      const centerY = (minY + maxY) * 0.5;
      element.style.left = `${clamp(centerX - targetWidth * 0.5, 0, width - targetWidth)}px`;
      element.style.top = `${clamp(centerY - targetHeight * 0.5, 0, height - targetHeight)}px`;
      element.style.width = `${Math.min(width, targetWidth)}px`;
      element.style.height = `${Math.min(height, targetHeight)}px`;
      element.style.visibility = visibleDepth ? "visible" : "hidden";
    });
  }

  updateCameraView(delta) {
    if (!this.camera || !this.cameraLookTarget) return;
    const enteringSideView = (
      this.phase === "vertical" || this.phase === "fineVertical"
    ) && this.phaseTime >= CAMERA_SIDE_VIEW_DELAY;
    const leavingSideView = (
      this.phase === "rotation" || this.phase === "fineSettle"
    ) && this.phaseTime < CAMERA_SIDE_VIEW_DELAY;
    const useSideView = enteringSideView || leavingSideView;
    const position = useSideView ? SIDE_CAMERA_POSITION : FRONT_CAMERA_POSITION;
    const target = useSideView ? SIDE_CAMERA_TARGET : FRONT_CAMERA_TARGET;
    this.cameraDesiredPosition.set(position.x, position.y, position.z);
    this.cameraDesiredLookTarget.set(target.x, target.y, target.z);
    const blend = 1 - Math.exp(-CAMERA_TRANSITION_RATE * delta);
    this.camera.position.lerp(this.cameraDesiredPosition, blend);
    this.cameraLookTarget.lerp(this.cameraDesiredLookTarget, blend);
    this.camera.lookAt(this.cameraLookTarget);
  }

  resize() {
    if (!this.renderer || !this.camera || !this.els?.viewport) return;
    const width = Math.max(1, this.els.viewport.clientWidth);
    const height = Math.max(1, this.els.viewport.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.updateControlHitTargets(true);
  }

  loop(timestamp) {
    if (this.destroyed) return;
    const previous = this.lastTimestamp || timestamp;
    const delta = clamp((timestamp - previous) / 1000, 0.008, 0.034);
    this.lastTimestamp = timestamp;
    this.elapsed += delta;
    if (this.phase !== "result") {
      this.plushes.forEach(plush => {
        plush.armCorrectionRemaining = ARM_PLUSH_CORRECTION_BUDGET_PER_FRAME;
      });
      this.updatePhase(delta);
      this.updateCarriage(delta);
      this.applyCablePhysics();
      this.applyConveyorForces(delta);
      this.updateGrip(delta);
      this.applyAirbornePlushPhysics(delta);
      this.updateProngBodies(delta);
      this.resolveArmPlushPenetration(4);
      this.world.step(FIXED_STEP, delta, 6);
      this.enforceClawCableSlackLimit();
      this.resolvePlushMoundPenetration();
      this.updateProngBodies(0);
      let fenceContacts = this.collectArmFenceContacts();
      const prongStopsChanged = this.updateDescendingProngStops(delta, fenceContacts);
      if (prongStopsChanged) this.updateProngBodies(0);
      for (let pass = 0; pass < 3; pass += 1) {
        fenceContacts = this.collectArmFenceContacts();
        if (!this.resolveArmFencePenetration(fenceContacts)) break;
        this.updateProngBodies(0);
      }
      for (let pass = 0; pass < 5; pass += 1) {
        if (!this.resolveArmMoundPenetration()) break;
        this.updateProngBodies(0);
      }
      this.updatePlushLiftContacts(delta);
      this.resolveArmPlushPenetration(8);
      this.suppressOutsideClawLift();
      this.stabilizeHeldPlushRotation();
      this.resolvePlushOverlaps();
      this.resolvePlushMoundPenetration();
      this.resolveArmPlushPenetration(8);
      this.suppressOutsideClawLift();
      this.suppressUnsupportedLift(delta);
      this.maintainConveyorMotion();
      this.enforceClawHeadClearance();
      this.detectPrizes(delta);
      this.confinePlushesToOuterFence();
      this.resolveProngTipPlushPenetration(12);
      this.enforceContainedPlushArmBarriers(5);
      this.resolveProngTipPlushPenetration(6);
      this.resolvePlushMoundPenetration();
      this.plushes.forEach(plush => this.limitArmPressDepth(plush));
      this.resolvePlushMoundPenetration();
      this.enforceClawHeadClearance();
    }
    this.updateBeltVisuals(delta);
    this.updateClawVisual();
    this.syncPlushVisuals(delta);
    this.updateCameraView(delta);
    this.updateMachineControlVisuals();
    this.updateControlHitTargets();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.boundLoop);
  }
}

window.ImasoraCompanionCatcher = Object.freeze({
  mount(root, options = {}) {
    if (!root) return;
    if (mountedGame) mountedGame.destroy();
    mountedGame = new ImasoraCompanionCatcherGame(root, options);
    mountedGame.mount();
  },
  unmount() {
    if (!mountedGame) return;
    mountedGame.destroy();
    mountedGame = null;
  }
});
