import * as THREE from "./three.module.min.js";
import * as CANNON from "./cannon-es.js";
import { PRODUCTION_JACKPOT_LAYOUT } from "./imasora-jackpot-production-layout.js";

const FIXED_STEP = 1 / 60;
const MAX_SUB_STEPS = 5;
const TABLE_COIN_CLEANUP_THRESHOLD = 180;
const TABLE_COIN_INSTANCE_INITIAL_CAPACITY = 256;
const STARTING_CREDITS = 250;
const BOARD_Z = -2.02;
const PACHINKO_FIELD_CENTER_Y = 3.31;
const PACHINKO_FIELD_RADIUS = 2.3;
const PACHINKO_FRAME_RADIUS = 2.34;
const PACHINKO_LAUNCH_FRAME_GAP_ANGLE = 0.52;
const TABLE_TOP_Y = 0.56;
const STATIC_BED_SURFACE_Y = 0.625;
const MACHINE_CABINET_WIDTH = 6.1;
const FRONT_EDGE_Z = 2.38;
const NORMAL_BIG_RATE = 0.02;
const NORMAL_SMALL_RATE = 0.075;
const AUTO_FIRE_INTERVAL = 0.6;
const STROKE_MIN = 0.2;
const STROKE_MAX = 1;
const STROKE_DISPLAY_MIN = 20;
const STROKE_DISPLAY_MAX = 100;
const STROKE_DISPLAY_DEFAULT = 58;
// The visible minimum now uses the launch strength formerly selected at 27.
const STROKE_AT_DISPLAY_MIN = 0.27;
const MIN_LAUNCH_SPEED = 8.72;
const MAX_LAUNCH_SPEED = 11.1;
export const PUSHER_START_DELAY = 1.1;
const PUSHER_PLATE_ORIGINAL_DEPTH = 1.32;
export const PUSHER_PLATE_DEPTH_SCALE = 2 / 3;
export const PUSHER_PLATE_DEPTH = PUSHER_PLATE_ORIGINAL_DEPTH * PUSHER_PLATE_DEPTH_SCALE;
export const PUSHER_PLATE_REAR_OFFSET_Z = -0.66;
export const PUSHER_PLATE_CENTER_OFFSET_Z = PUSHER_PLATE_REAR_OFFSET_Z + PUSHER_PLATE_DEPTH / 2;
export const PUSHER_PLATE_FRONT_OFFSET_Z = PUSHER_PLATE_REAR_OFFSET_Z + PUSHER_PLATE_DEPTH;
const PUSHER_BODY_REAR_Z = -1.56;
const PUSHER_BODY_NEAREST_Z = -0.48;
const NEXT_ROLE_RAIL_STAGE_DEPTH = (PUSHER_BODY_NEAREST_Z - PUSHER_BODY_REAR_Z) / 3;
const NEXT_ROLE_RAIL_Z = PUSHER_BODY_NEAREST_Z
  + PUSHER_PLATE_FRONT_OFFSET_Z
  + NEXT_ROLE_RAIL_STAGE_DEPTH * 2.5;
const NEXT_ROLE_RAIL_SLOT_WIDTH = 0.04;
const SHARK_ROLE_START_X = 4.15;
const SHARK_ROLE_END_X = -4.25;
const SHARK_ROLE_INITIAL_DELAY = 120;
const SHARK_ROLE_TRAVEL_SECONDS = 9.6;
const SHARK_ROLE_ALTERNATING_SLOT_SECONDS = 120;
const SHARK_ROLE_NOSE_LOCAL_X = -2.18;
const SHARK_ROLE_TAIL_LOCAL_X = 2.12;
const SHARK_ROLE_BODY_LENGTH = SHARK_ROLE_TAIL_LOCAL_X - SHARK_ROLE_NOSE_LOCAL_X;
const SHARK_ROLE_LEFT_LINE_X = -MACHINE_CABINET_WIDTH / 2;
const SHARK_ROLE_TURN_PASSED_FRACTION = 2 / 3;
const SHARK_ROLE_TURN_PIVOT_LOCAL_X = SHARK_ROLE_NOSE_LOCAL_X
  + SHARK_ROLE_BODY_LENGTH * SHARK_ROLE_TURN_PASSED_FRACTION;
const SHARK_ROLE_INCOMING_SPEED = (
  SHARK_ROLE_START_X - SHARK_ROLE_END_X
) / SHARK_ROLE_TRAVEL_SECONDS;
const SHARK_ROLE_TURN_X = SHARK_ROLE_LEFT_LINE_X
  - SHARK_ROLE_NOSE_LOCAL_X
  - SHARK_ROLE_BODY_LENGTH * SHARK_ROLE_TURN_PASSED_FRACTION;
const SHARK_ROLE_TURN_SECONDS = (
  SHARK_ROLE_START_X - SHARK_ROLE_TURN_X
) / SHARK_ROLE_INCOMING_SPEED;
const SHARK_ROLE_EXIT_FADE_SECONDS = 2.4;
const SHARK_ROLE_EXIT_DISTANCE = (
  SHARK_ROLE_INCOMING_SPEED * SHARK_ROLE_EXIT_FADE_SECONDS
);
const SHARK_ROLE_CYCLE_SECONDS = SHARK_ROLE_ALTERNATING_SLOT_SECONDS;
const SHARK_ROLE_ALTERNATING_PAIR_SECONDS = SHARK_ROLE_CYCLE_SECONDS * 2;
export const SMALL_SHARK_ROLE_SCALE = 1 / 2;
export const SHARK_ROLE_ALTERNATION_TIMING = Object.freeze({
  initialDelay: SHARK_ROLE_INITIAL_DELAY,
  slotSeconds: SHARK_ROLE_ALTERNATING_SLOT_SECONDS,
  sameVariantSeconds: SHARK_ROLE_ALTERNATING_PAIR_SECONDS,
  firstVariant: "small"
});
const SHARK_DANGER_WARNING_LEAD_SECONDS = 5;
const SHARK_DANGER_TEXT_BLINK_PERIOD_SECONDS = 0.7;
const SHARK_DANGER_TEXT_BLINK_OFF_OPACITY = 0.08;
const SHARK_DANGER_PANEL_BRIGHT_OPACITY = 0.96;
const SHARK_DANGER_PANEL_DARK_OPACITY = 0.68;
const SHARK_DANGER_TEXT_DARK_BRIGHTNESS = 0.5;
const NORMAL_ROOM_EXPOSURE = 1.16;
const SHARK_DANGER_ROOM_BRIGHTNESS = 1.18;
const SHARK_DANGER_ROOM_DARKNESS = 0.58;
const SHARK_DANGER_ROOM_BRIGHT_OVERLAY_OPACITY = 0.08;
const SHARK_DANGER_ROOM_DARK_OVERLAY_OPACITY = 0.24;
const SHARK_DANGER_LARGE_SHAKE_START_DELAY_SECONDS = 0.2;
const SHARK_DANGER_LARGE_SHAKE_RAMP_IN_SECONDS = 0.14;
const SHARK_DANGER_LARGE_SHAKE_RAMP_OUT_SECONDS = 0.24;
const SHARK_DANGER_LARGE_SHAKE_STRENGTH = 0.6;
export const SHARK_DANGER_WARNING_TIMING = Object.freeze({
  leadSeconds: SHARK_DANGER_WARNING_LEAD_SECONDS,
  blinkPeriodSeconds: SHARK_DANGER_TEXT_BLINK_PERIOD_SECONDS,
  blinkOffOpacity: SHARK_DANGER_TEXT_BLINK_OFF_OPACITY,
  brightestAtTextAppearance: true,
  darkestAtBlinkMidpoint: true,
  initialDelay: SHARK_ROLE_INITIAL_DELAY,
  slotSeconds: SHARK_ROLE_ALTERNATING_SLOT_SECONDS,
  firstVariant: "small",
  smallColor: "yellow",
  largeColor: "red"
});
const SHARK_ROLE_BASE_Y = STATIC_BED_SURFACE_Y + 0.075;
const SHARK_ROLE_EXIT_LINE_X = SHARK_ROLE_LEFT_LINE_X;
const SHARK_ROLE_EXIT_START_Y = (
  SHARK_ROLE_BASE_Y - SHARK_ROLE_TURN_PIVOT_LOCAL_X
);
const SHARK_ROLE_MOUTH_LOCAL_X = -1.48;
const SHARK_ROLE_MOUTH_LOCAL_Y = 0.08;
const SHARK_ROLE_MOUTH_LOCAL_Z = 0.08;
const SHARK_ROLE_SUCTION_FORWARD_REACH = 0.56;
const SHARK_ROLE_SUCTION_REAR_REACH = 0.16;
const SHARK_ROLE_SUCTION_HALF_DEPTH = 0.43;
const SHARK_ROLE_SUCTION_X_STIFFNESS = 46;
const SHARK_ROLE_SUCTION_X_DAMPING = 9;
const SHARK_ROLE_SUCTION_Z_STIFFNESS = 50;
const SHARK_ROLE_SUCTION_Z_DAMPING = 9;
const SHARK_ROLE_SUCTION_Y_STIFFNESS = 32;
const SHARK_ROLE_SUCTION_Y_DAMPING = 6;
const SHARK_ROLE_SUCTION_MAX_ACCELERATION = 18;
const SHARK_ROLE_MOUTH_ARM_X = -0.06;
const SHARK_ROLE_CAPTURE_MIN_X = 0.025;
const SHARK_ROLE_CAPTURE_MAX_X = 0.2;
const SHARK_ROLE_CAPTURE_MIN_Z = -0.26;
const SHARK_ROLE_CAPTURE_MAX_Z = 0.2;
const SHARK_ROLE_CAPTURE_APERTURE_MIN_Y = -0.135;
const SHARK_ROLE_CAPTURE_APERTURE_MAX_Y = 0.21;
const SHARK_ROLE_CAPTURE_MAX_WORLD_Y = STATIC_BED_SURFACE_Y + 0.34;
export const SHARK_ROLE_EXIT_PATH = Object.freeze({
  initialDelay: SHARK_ROLE_INITIAL_DELAY,
  lineX: SHARK_ROLE_LEFT_LINE_X,
  noseLocalX: SHARK_ROLE_NOSE_LOCAL_X,
  tailLocalX: SHARK_ROLE_TAIL_LOCAL_X,
  bodyLength: SHARK_ROLE_BODY_LENGTH,
  passedFraction: SHARK_ROLE_TURN_PASSED_FRACTION,
  turnPivotLocalX: SHARK_ROLE_TURN_PIVOT_LOCAL_X,
  turnX: SHARK_ROLE_TURN_X,
  turnSeconds: SHARK_ROLE_TURN_SECONDS,
  turnElapsed: SHARK_ROLE_INITIAL_DELAY + SHARK_ROLE_TURN_SECONDS,
  incomingSpeed: SHARK_ROLE_INCOMING_SPEED,
  lineY: SHARK_ROLE_BASE_Y,
  exitLineX: SHARK_ROLE_EXIT_LINE_X,
  exitStartY: SHARK_ROLE_EXIT_START_Y,
  fadeSeconds: SHARK_ROLE_EXIT_FADE_SECONDS,
  exitDistance: SHARK_ROLE_EXIT_DISTANCE,
  exitEndX: SHARK_ROLE_EXIT_LINE_X,
  exitEndY: SHARK_ROLE_EXIT_START_Y - SHARK_ROLE_EXIT_DISTANCE,
  exitEndZ: NEXT_ROLE_RAIL_Z
});
const SHARK_ROLE_EAT_ANIMATION_SECONDS = 0.34;
const PUSHER_COIN_CONTACT_FRICTION = 0.9;
const PUSHER_COIN_TRACTION_MAX_ACCELERATION = 7.2;
const PUSHER_COIN_TOP_CONTACT_NORMAL_MIN_Y = 0.65;
const PUSHER_COIN_CONTACT_GRACE_SECONDS = 0.12;
const PUSHER_COIN_SUPPORT_Y_TOLERANCE = 0.035;
const PUSHER_COIN_SUPPORT_MAX_VERTICAL_SPEED = 0.45;
const PUSHER_COIN_SUPPORT_MIN_FLATNESS = 0.88;
const PUSHER_COIN_SUPPORT_EDGE_RADIUS_RATIO = 0.8;
const PUSHER_COIN_WAKE_SWEEP_MARGIN = 0.01;
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
const PACHINKO_FRONT_COLLISION_GROUP = 1;
const ROLE_OUT_COLLISION_GROUP = 2;
const PACHINKO_TOKEN_FRONT_VISUAL_Z = -1.48;
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
const TABLE_COIN_HORIZONTAL_SPEED_LIMIT = 2.2;
export const PAYOUT_RELEASE_INTERVAL = 0.3;
const PAYOUT_CHUTE_RELEASE_SPEED_MIN = 0.64;
const PAYOUT_CHUTE_RELEASE_SPEED_VARIATION = 0.08;
const PAYOUT_CHUTE_RELEASE_X_BIAS = 0.1;
const PAYOUT_CHUTE_EXIT_VELOCITY_BOOST_MIN = 0.2;
const PAYOUT_CHUTE_EXIT_VELOCITY_BOOST_MAX = 3.4;
const PAYOUT_CHUTE_EXIT_SPEED_LIMIT = 4.9;
const PAYOUT_CHUTE_LANDING_MOMENTUM_END_DISTANCE_X = 1.35;
const PAYOUT_CHUTE_STATIC_BED_MOMENTUM_END_DISTANCE_X = 1.2;
const PAYOUT_CHUTE_STATIC_BED_MOMENTUM_RETENTION = 0.96;
const PAYOUT_CHUTE_LANDING_MOMENTUM_MAX_SECONDS = 1.2;
const PAYOUT_CHUTE_GUIDED_ANGULAR_SPEED_MAX = 10;
export const PAYOUT_CHUTE_START_X = 2.54;
export const PAYOUT_CHUTE_END_X = 2.24;
export const PAYOUT_CHUTE_WIDTH = 0.09;
export const PAYOUT_CHUTE_SEGMENT_COUNT = 16;
const PAYOUT_CHUTE_START_Y = 1.32;
const PAYOUT_CHUTE_CONTROL_1_X = 2.51;
const PAYOUT_CHUTE_CONTROL_1_Y = 1.23;
const PAYOUT_CHUTE_CONTROL_2_X = 2.39;
const PAYOUT_CHUTE_CONTROL_2_Y = 1;
const PAYOUT_CHUTE_END_Y = 0.92;
const PAYOUT_CHUTE_FLOOR_THICKNESS = 0.032;
const PAYOUT_CHUTE_RAIL_HEIGHT = 0.07;
const PAYOUT_CHUTE_RAIL_THICKNESS = 0.022;
export const PAYOUT_CHUTE_FIXED_Z = -0.78;
const PAYOUT_OUTLET_SLOT_WIDTH = 0.042;
const PAYOUT_OUTLET_SLOT_HEIGHT = 0.19;
const PAYOUT_OUTLET_RIM_WIDTH = 0.084;
const PAYOUT_OUTLET_RIM_HEIGHT = 0.232;
const PAYOUT_OUTLET_X = 2.605;
const PAYOUT_OUTLET_Y = 1.4;
const PAYOUT_CHUTE_WALL_SIDES = [1, -1];
const PAYOUT_SIDE_WALL_X = 2.68;
const PAYOUT_SIDE_WALL_WIDTH = 0.12;
const PAYOUT_SIDE_WALL_COLLIDER_HALF_WIDTH = 0.07;
const PAYOUT_SIDE_WALL_HEIGHT = 1.07;
const PAYOUT_SIDE_WALL_CENTER_Y = 1.11;
const PAYOUT_SIDE_WALL_DEPTH = 4.92;
const PAYOUT_SIDE_WALL_CENTER_Z = 0.05;
const PAYOUT_SIDE_WALL_MIN_Y = PAYOUT_SIDE_WALL_CENTER_Y - PAYOUT_SIDE_WALL_HEIGHT / 2;
const PAYOUT_SIDE_WALL_MAX_Y = PAYOUT_SIDE_WALL_CENTER_Y + PAYOUT_SIDE_WALL_HEIGHT / 2;
const PAYOUT_SIDE_WALL_MIN_Z = PAYOUT_SIDE_WALL_CENTER_Z - PAYOUT_SIDE_WALL_DEPTH / 2;
const PAYOUT_SIDE_WALL_MAX_Z = PAYOUT_SIDE_WALL_CENTER_Z + PAYOUT_SIDE_WALL_DEPTH / 2;
const SHARK_SIDE_WALL_OPENING_REAR_Z = NEXT_ROLE_RAIL_Z - 0.72;
const SHARK_SIDE_WALL_OPENING_FRONT_Z = NEXT_ROLE_RAIL_Z + 1.16;
const SHARK_SIDE_WALL_OPENING_BOTTOM_Y = PAYOUT_SIDE_WALL_MIN_Y;
const SHARK_SIDE_WALL_OPENING_TOP_Y = PAYOUT_SIDE_WALL_MAX_Y;
const SHARK_SIDE_WALL_COIN_GUARD_TOP_Y = STATIC_BED_SURFACE_Y + TABLE_COIN_RADIUS * 1.75;
const SHARK_SIDE_WALL_RIM_THICKNESS = 0.035;
export const SHARK_SIDE_WALL_OPENING = Object.freeze({
  wallX: PAYOUT_SIDE_WALL_X,
  rearZ: SHARK_SIDE_WALL_OPENING_REAR_Z,
  frontZ: SHARK_SIDE_WALL_OPENING_FRONT_Z,
  bottomY: SHARK_SIDE_WALL_OPENING_BOTTOM_Y,
  topY: SHARK_SIDE_WALL_OPENING_TOP_Y,
  coinGuardTopY: SHARK_SIDE_WALL_COIN_GUARD_TOP_Y,
  coinGuardHeight: SHARK_SIDE_WALL_COIN_GUARD_TOP_Y - PAYOUT_SIDE_WALL_MIN_Y
});
export const PAYOUT_SIDE_WALL_SURFACE = Object.freeze({
  centerZ: PAYOUT_SIDE_WALL_CENTER_Z,
  depth: PAYOUT_SIDE_WALL_DEPTH,
  minZ: PAYOUT_SIDE_WALL_MIN_Z,
  maxZ: PAYOUT_SIDE_WALL_MAX_Z,
  rearGlassMinZ: PAYOUT_SIDE_WALL_MIN_Z,
  rearGlassMaxZ: SHARK_SIDE_WALL_OPENING_REAR_Z,
  rearGlassCenterZ: (
    PAYOUT_SIDE_WALL_MIN_Z + SHARK_SIDE_WALL_OPENING_REAR_Z
  ) / 2,
  rearGlassDepth: SHARK_SIDE_WALL_OPENING_REAR_Z - PAYOUT_SIDE_WALL_MIN_Z,
  topY: PAYOUT_SIDE_WALL_MAX_Y
});
export const NEXT_ROLE_RAIL_MARKER = Object.freeze({
  length: MACHINE_CABINET_WIDTH,
  width: NEXT_ROLE_RAIL_SLOT_WIDTH,
  z: NEXT_ROLE_RAIL_Z
});
const PAYOUT_STATIC_BED_HALF_WIDTH = PAYOUT_SIDE_WALL_X
  - PAYOUT_SIDE_WALL_COLLIDER_HALF_WIDTH
  + 0.01;

function payoutChutePointAt(t) {
  const remaining = 1 - t;
  return {
    x: remaining ** 3 * PAYOUT_CHUTE_START_X
      + 3 * remaining * remaining * t * PAYOUT_CHUTE_CONTROL_1_X
      + 3 * remaining * t * t * PAYOUT_CHUTE_CONTROL_2_X
      + t ** 3 * PAYOUT_CHUTE_END_X,
    y: remaining ** 3 * PAYOUT_CHUTE_START_Y
      + 3 * remaining * remaining * t * PAYOUT_CHUTE_CONTROL_1_Y
      + 3 * remaining * t * t * PAYOUT_CHUTE_CONTROL_2_Y
      + t ** 3 * PAYOUT_CHUTE_END_Y
  };
}

const PAYOUT_CHUTE_PATH_POINTS = Array.from(
  { length: PAYOUT_CHUTE_SEGMENT_COUNT + 1 },
  (_, index) => payoutChutePointAt(index / PAYOUT_CHUTE_SEGMENT_COUNT)
);
const PAYOUT_CHUTE_POINT_NORMALS = PAYOUT_CHUTE_PATH_POINTS.map((point, index, points) => {
  const before = points[Math.max(0, index - 1)];
  const after = points[Math.min(points.length - 1, index + 1)];
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.max(0.0001, Math.hypot(dx, dy));
  let x = -dy / length;
  let y = dx / length;
  if (y < 0) {
    x *= -1;
    y *= -1;
  }
  return { x, y };
});
const PAYOUT_CHUTE_SEGMENTS = PAYOUT_CHUTE_PATH_POINTS.slice(0, -1).map((start, index) => {
  const end = PAYOUT_CHUTE_PATH_POINTS[index + 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  let angle = Math.atan2(dy, dx);
  if (Math.cos(angle) < 0) angle += Math.PI;
  return {
    angle,
    centerX: (start.x + end.x) / 2,
    centerY: (start.y + end.y) / 2,
    flowX: dx / length,
    flowY: dy / length,
    length,
    normalX: -Math.sin(angle),
    normalY: Math.cos(angle)
  };
});
export const PAYOUT_CHUTE_LENGTH = PAYOUT_CHUTE_SEGMENTS.reduce(
  (total, segment) => total + segment.length,
  0
);
export const PAYOUT_CHUTE_ANGLE = PAYOUT_CHUTE_SEGMENTS[0].angle;
const PAYOUT_CHUTE_RAIL_EDGE_POINTS = PAYOUT_CHUTE_PATH_POINTS.flatMap((point, index) => {
  const normal = PAYOUT_CHUTE_POINT_NORMALS[index];
  return [
    PAYOUT_CHUTE_FLOOR_THICKNESS / 2,
    PAYOUT_CHUTE_FLOOR_THICKNESS / 2 + PAYOUT_CHUTE_RAIL_HEIGHT
  ].map(offset => ({
    x: point.x + normal.x * offset,
    y: point.y + normal.y * offset
  }));
});
const PAYOUT_CHUTE_RAIL_COLLIDER_MARGIN = 0.004;
const PAYOUT_CHUTE_RAIL_MIN_X = Math.min(
  ...PAYOUT_CHUTE_RAIL_EDGE_POINTS.map(point => point.x)
) - PAYOUT_CHUTE_RAIL_COLLIDER_MARGIN;
const PAYOUT_CHUTE_RAIL_MAX_X = Math.max(
  ...PAYOUT_CHUTE_RAIL_EDGE_POINTS.map(point => point.x)
) + PAYOUT_CHUTE_RAIL_COLLIDER_MARGIN;
const PAYOUT_CHUTE_RAIL_MIN_Y = Math.min(
  ...PAYOUT_CHUTE_RAIL_EDGE_POINTS.map(point => point.y)
) - PAYOUT_CHUTE_RAIL_COLLIDER_MARGIN;
const PAYOUT_CHUTE_RAIL_MAX_Y = Math.max(
  ...PAYOUT_CHUTE_RAIL_EDGE_POINTS.map(point => point.y)
) + PAYOUT_CHUTE_RAIL_COLLIDER_MARGIN;
const PAYOUT_CHUTE_GUIDE_RELEASE_X = PAYOUT_CHUTE_END_X + 0.035;
const PAYOUT_CHUTE_GUIDE_RELEASE_Y = PAYOUT_CHUTE_END_Y + TABLE_COIN_RADIUS + 0.03;
const PAYOUT_CHUTE_GUIDE_MAX_SECONDS = 1.8;
const PAYOUT_CHUTE_SPAWN_CLEARANCE = PAYOUT_CHUTE_FLOOR_THICKNESS / 2
  + TABLE_COIN_RADIUS
  + 0.008;
const PAYOUT_CHUTE_ENTRY_POINT = PAYOUT_CHUTE_PATH_POINTS[0];
const PAYOUT_CHUTE_ENTRY_NORMAL = PAYOUT_CHUTE_POINT_NORMALS[0];
const PAYOUT_CHUTE_ENTRY_FLOW = PAYOUT_CHUTE_SEGMENTS[0];
export const PAYOUT_CHUTE_SPAWN_X = PAYOUT_CHUTE_ENTRY_POINT.x
  + PAYOUT_CHUTE_ENTRY_NORMAL.x * PAYOUT_CHUTE_SPAWN_CLEARANCE
  + PAYOUT_CHUTE_ENTRY_FLOW.flowX * 0.012;
export const PAYOUT_CHUTE_SPAWN_Y = PAYOUT_CHUTE_ENTRY_POINT.y
  + PAYOUT_CHUTE_ENTRY_NORMAL.y * PAYOUT_CHUTE_SPAWN_CLEARANCE
  + PAYOUT_CHUTE_ENTRY_FLOW.flowY * 0.012;
const PACHINKO_LAUNCH_X = -2.2;
const PACHINKO_LAUNCH_Y = 1.2;
const BOARD_COMPONENT_Y_OFFSET = -0.6;
const FIXED_HAKAMA_Y_OFFSET = -0.3;
const BOARD_COMPONENT_Y_MIGRATION_STEP = -0.3;
const PIN_LAYOUT_VERSION = 7;
const ROLE_VERTICAL_SHIFT = 0.62 + BOARD_COMPONENT_Y_OFFSET;
const PACHINKO_PLAYFIELD_Z = -1.675;
const PACHINKO_TOKEN_ATTACKER_VISUAL_OFFSET_Z = (
  PACHINKO_PLAYFIELD_Z - BOARD_Z + 0.018
);
const BOARD_LCD_WIDTH = 0.55;
const BOARD_LCD_HEIGHT = 0.35;
const BOARD_LCD_Y = PACHINKO_FIELD_CENTER_Y + PACHINKO_FRAME_RADIUS - BOARD_LCD_HEIGHT / 2 - 0.06;
const BOARD_LCD_RECESS_DEPTH = 0.15;
const LCD_SIDE_NEON_OUTER_SIZE = 0.12;
const LCD_SIDE_NEON_X = BOARD_LCD_WIDTH / 2 + 0.095;
const LCD_SIDE_NEON_Y_OFFSET = 0.088;
const LCD_SIDE_NEON_IDLE_COLOR = 0x6874ff;
const LCD_SIDE_NEON_GOLD_COLOR = 0xffc21a;
const LCD_SIDE_NEON_BLINK_SECONDS = 0.36;
const LEFT_ENTRY_X = -0.52;
const RIGHT_ENTRY_X = 0.52;
const ENTRY_Y = 3.72 + ROLE_VERTICAL_SHIFT;
const ENTRY_UPPER_PIN_ABS_X = 0.9;
const ENTRY_MOUTH_INNER_DROP = 0.06;
const ENTRY_HALF_HEIGHT = 0.11;
const ROLE_RELEASE_Y = 3.49 + ROLE_VERTICAL_SHIFT;
const ROLE_SLOT_Y = 2.22 + ROLE_VERTICAL_SHIFT;
const ROLE_BOTTOM_GUIDE_Y = 2.1 + ROLE_VERTICAL_SHIFT;
const ROLE_BOTTOM_GUIDE_HALF_WIDTH = 0.84;
const ROLE_BOTTOM_GUIDE_HALF_HEIGHT = 0.03;
const ROLE_BOTTOM_GUARD_EPSILON = 0.003;
const ROLE_BOTTOM_GUARD_TANGENT_RETENTION = 0.92;
const ROLE_BOTTOM_GUARD_RESTITUTION = 0.26;
const ROLE_BOTTOM_GUARD_MIN_REBOUND_SPEED = 0.18;
const ROLE_SIDE_NEON_COLOR = 0x6874ff;
const ROLE_SIDE_NEON_PULSE_SECONDS = 3;
const ROLE_SIDE_NEON_ALERT_COLOR = 0xff861a;
const ROLE_SIDE_NEON_ALERT_BLINK_SECONDS = 0.56;
const ROLE_SIDE_OUT_POCKET_RADIUS = 0.18;
const ROLE_SIDE_OUT_POCKET_SCALE_X = 1.28;
const ROLE_SIDE_OUT_POCKET_SCALE_Y = 0.66;
const ROLE_SIDE_OUT_POCKET_HALF_WIDTH = (
  ROLE_SIDE_OUT_POCKET_RADIUS * ROLE_SIDE_OUT_POCKET_SCALE_X
);
const ROLE_SIDE_OUT_POCKET_HALF_HEIGHT = (
  ROLE_SIDE_OUT_POCKET_RADIUS * ROLE_SIDE_OUT_POCKET_SCALE_Y
);
const ROLE_SIDE_OUT_CENTER_ABS_X = 0.56;
const ROLE_SIDE_OUT_POCKET_CENTER_Y = ROLE_SLOT_Y - 0.015;
const ROLE_SIDE_OUT_LANE_INNER_ABS_X = 0.28;
const ROLE_SIDE_OUT_LANE_OUTER_ABS_X = 0.91;
const ROLE_SIDE_OUT_GUIDE_TOP_Y = ROLE_SLOT_Y + 0.36;
const ROLE_SIDE_OUT_GUIDE_BOTTOM_Y = ROLE_SLOT_Y - 0.2;
const ROLE_SIDE_OUT_TARGET_Y = ROLE_SLOT_Y - 0.05;
const ROLE_SIDE_OUT_CAPTURE_BASE_Y = (
  ROLE_SIDE_OUT_POCKET_CENTER_Y + ROLE_SIDE_OUT_POCKET_HALF_HEIGHT * 0.42
);
const ROLE_SIDE_OUT_CAPTURE_OUTER_START_ABS_X = (
  ROLE_SIDE_OUT_CENTER_ABS_X + ROLE_SIDE_OUT_POCKET_HALF_WIDTH * 0.45
);
const ROLE_SIDE_OUT_CAPTURE_OUTER_MAX_Y = (
  ROLE_SIDE_OUT_POCKET_CENTER_Y + ROLE_SIDE_OUT_POCKET_HALF_HEIGHT - 0.005
);
const ROLE_SIDE_OUT_HORIZONTAL_STIFFNESS = 48;
const ROLE_SIDE_OUT_HORIZONTAL_DAMPING = 9;
const ROLE_SIDE_OUT_VERTICAL_STIFFNESS = 44;
const ROLE_SIDE_OUT_VERTICAL_DAMPING = 7;
const ROLE_SIDE_OUT_HORIZONTAL_MAX_ACCELERATION = 18;
const ROLE_SIDE_OUT_VERTICAL_MAX_ACCELERATION = 18;
const ROLE_SIDE_OUT_MIN_DOWNWARD_ACCELERATION = 3.5;
const ROLE_ROTATOR_X = 0;
const ROLE_ROTATOR_Y = 3.4 + ROLE_VERTICAL_SHIFT - 3 * 0.23;
const ROLE_ROTATOR_RADIUS = 0.24;
const ROLE_ROTATOR_INNER_RADIUS = 0.07;
const ROLE_ROTATOR_DIVIDER_HALF_WIDTH = 0.0175;
const ROLE_ROTATOR_CATCH_RADIUS = ROLE_ROTATOR_RADIUS - 0.018;
const ROLE_ROTATOR_RELEASE_RADIUS = ROLE_ROTATOR_CATCH_RADIUS + PACHINKO_TOKEN_COLLIDER_RADIUS;
const ROLE_ROTATOR_CONTACT_ITERATIONS = 4;
const ROLE_ROTATOR_PHYSICS_RESTITUTION = 0.1;
const ROLE_ROTATOR_PHYSICS_TANGENT_RETENTION = 0.82;
const ROLE_ROTATOR_PHYSICS_EPSILON = 0.002;
const ROLE_ROTATOR_FULL_TURN_SECONDS = 9;
const ROLE_ROTATOR_CLOCKWISE_SECONDS = 15;
const ROLE_ROTATOR_COUNTERCLOCKWISE_SECONDS = 10;
const ROLE_ROTATOR_START_ROUTE_RATIO = 0.18;
const ROLE_ROTATOR_OUT_ROUTE_RATIO = 0.32;
const ROLE_ROTATOR_SECOND_DIVIDER_ANGLE = Math.PI * 2 * ROLE_ROTATOR_START_ROUTE_RATIO;
const ROLE_OUT_REAR_BODY_Z = BOARD_Z - 0.12;
const ROLE_OUT_EXIT_BODY_Z = BOARD_Z - 0.36;
const ROLE_OUT_TRIGGER_BODY_Z = BOARD_Z - 0.3;
const ROLE_OUT_EXIT_VISUAL_Z = -1.7;
const ROLE_OUT_SUCTION_STIFFNESS = 85;
const ROLE_OUT_SUCTION_DAMPING = 17;
const ROLE_OUT_SUCTION_MAX_ACCELERATION = 10;
const ROLE_OUT_CAPTURE_RADIUS = (ROLE_ROTATOR_INNER_RADIUS + ROLE_ROTATOR_RADIUS) / 2;
const ROLE_OUT_PLANAR_VELOCITY_RETENTION = 0.3;
const ROLE_OUT_PLANAR_STIFFNESS = 90;
const ROLE_OUT_PLANAR_DAMPING = 18;
const ROLE_OUT_PLANAR_MAX_ACCELERATION = 32;
const ROLE_OUT_TARGET_ADVANCE_DELAY = 0.1;
const ROLE_OUT_TARGET_ADVANCE_SECONDS = 0.72;
const ROLE_OUT_MAX_SECONDS = 1.8;
const ROLE_OUT_PLATE_WIDTH = ROLE_ROTATOR_RADIUS * 1.9;
const ROLE_OUT_PLATE_HEIGHT = 0.045;
const ROLE_OUT_PLATE_DEPTH = 0.24;
const ROLE_OUT_PLATE_TILT = -0.16;
const ROLE_OUT_PLATE_Y = ROLE_ROTATOR_Y - ROLE_ROTATOR_RADIUS - 0.045;
const ROLE_OUT_PLATE_BODY_Z = BOARD_Z - 0.18;
const ROLE_OUT_PLATE_VISUAL_Z = -1.7;
const PACHINKO_DRAIN_CENTER_Y = 1.12;
const PACHINKO_DRAIN_HALF_WIDTH = ROLE_SIDE_OUT_POCKET_HALF_WIDTH;
const PACHINKO_DRAIN_HALF_HEIGHT = ROLE_SIDE_OUT_POCKET_HALF_HEIGHT;
// Preserve the existing aluminum-rim proportion at the smaller shared outer size.
const PACHINKO_DRAIN_RIM_INNER_RADIUS = ROLE_SIDE_OUT_POCKET_RADIUS * 6 / 7;
const ENTRY_SEESAW_MAX_ANGLE = Math.PI / 9;
const ENTRY_SEESAW_PERIOD_SECONDS = 2.5;
const ENTRY_SEESAW_SPEED = Math.PI * 2 / ENTRY_SEESAW_PERIOD_SECONDS;
const SIDE_ENTRY_SEESAW_SPEED_RATIO = 0.8;
const HANE_OPEN_SECONDS = 1.3;
const HANE_OPEN_ANGLE = Math.PI / 2;
const HANE_REPEAT_REOPEN_THRESHOLD = 0.001;
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
const HAKAMA_CHUCKER_TOP_ENTRY_EPSILON = 0.012;
const HAKAMA_ATTACKER_TOP_ENTRY_EPSILON = 0.012;
const HAKAMA_ATTACKER_ROUND_SECONDS = 30;
const HAKAMA_ATTACKER_COUNT_LIMIT = 10;
const HAKAMA_ATTACKER_PAYOUT_PER_COUNT = 10;
const HAKAMA_ATTACKER_CATCH_HOLD_SECONDS = 0.18;
const HAKAMA_ATTACKER_SENSOR_TRAVEL_SECONDS = 0.52;
const HAKAMA_ATTACKER_OPEN_ANGLE = Math.PI / 2;
const HAKAMA_ATTACKER_OPEN_WIDTH_SCALE = 1.08;
const BALL_RETURN_ANGLE = Math.PI * 7 / 9;
const BALL_RETURN_MIN_RADIUS = 1.92;
const BALL_RETURN_MAX_RADIUS = 2.48;
const BALL_RETURN_GATE_DURATION = 0.34;
const LAUNCH_LANE_MIN_FORWARD_SPEED_MIN = 1.05;
const LAUNCH_LANE_MIN_FORWARD_SPEED_MAX = 1.45;
const LAUNCH_LANE_ASSIST_ACCELERATION = 24;
const LAUNCH_LANE_ROLLBACK_FLOOR_SPEED = 0.22;
const LAUNCH_LANE_VERTICAL_MIN_X = -PACHINKO_FRAME_RADIUS - 0.09;
const LAUNCH_LANE_VERTICAL_MAX_X = -2.06 + 0.09;
const LAUNCH_LANE_VERTICAL_MIN_Y = PACHINKO_LAUNCH_Y - 0.12;
const LAUNCH_LANE_VERTICAL_MAX_Y = PACHINKO_FIELD_CENTER_Y + 0.1;
const LAUNCH_LANE_ARC_ANGLE_MARGIN = 0.035;
const PIN_LAYOUT_STORAGE_KEY = (
  window.__IMASORA_JACKPOT_PIN_LAYOUT_STORAGE_KEY__
  || "imasoraJackpotPinLayoutV1"
);
const PIN_LAYOUT_CHECKPOINT_STORAGE_KEY = (
  window.__IMASORA_JACKPOT_PIN_LAYOUT_CHECKPOINT_STORAGE_KEY__
  || "imasoraJackpotPinLayoutCheckpointV1"
);
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
export const START_SPIN_SEQUENCE_DURATION = 1.95 * 4;

const SPIN_PHASE_DURATION = START_SPIN_SEQUENCE_DURATION / 2;
const SPIN_FIRST_LOCK_AT = SPIN_PHASE_DURATION * 0.68;
export const SPIN_DIGIT_LOCK_GAP = 2;
export const MAIN_REACH_DIGIT_LOCK_GAP = 5;
const SPIN_SECOND_LOCK_AT = SPIN_FIRST_LOCK_AT + SPIN_DIGIT_LOCK_GAP;
export const PSEUDO_RESULT_BLINK_COUNT = 3;
const PSEUDO_RESULT_BLINK_HALF_CYCLE = 0.3;
const PSEUDO_RESULT_BLINK_DURATION = PSEUDO_RESULT_BLINK_COUNT * PSEUDO_RESULT_BLINK_HALF_CYCLE * 2;
export const PSEUDO_RESULT_HOLD_DURATION = 1.1;

export function getMainDigitLockGap(code) {
  const leftDigit = String(code ?? "")[0];
  return leftDigit === "3" || leftDigit === "7"
    ? MAIN_REACH_DIGIT_LOCK_GAP
    : SPIN_DIGIT_LOCK_GAP;
}

// Tier weights keep a 50% initial hit rate, matching premium rates, and an 80% five-spin ST expectation.
export const PSEUDO_CHANCE_LEVELS = Object.freeze([
  Object.freeze({ code: "99", hitRate: 1, premium: true, normalWeight: 0.015, stWeight: 0.015 }),
  Object.freeze({ code: "73", hitRate: 1, premium: true, normalWeight: 0.035, stWeight: 0.035 }),
  Object.freeze({ code: "50", hitRate: 0.5, premium: false, normalWeight: 0.8638888888888889, stWeight: 0.12271185849400995 }),
  Object.freeze({ code: "30", hitRate: 0.3, premium: false, normalWeight: 0.05, stWeight: 0.45 }),
  Object.freeze({ code: "10", hitRate: 0.1, premium: false, normalWeight: 0.025, stWeight: 0.2 }),
  Object.freeze({ code: "05", hitRate: 0.05, premium: false, normalWeight: 0.011111111111111112, stWeight: 0.17728814150599002 })
]);

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

const BOARD_LCD_DEFAULT_PALETTE = Object.freeze({
  name: "default",
  active: "#ff3d69",
  glow: "#ff315f",
  inactive: "rgba(94, 15, 42, 0.42)",
  label: "#8ef4df",
  labelGlow: "#22d2b0",
  border: "#3b1c2c",
  backgroundTop: "#101923",
  backgroundMiddle: "#04080d",
  backgroundBottom: "#120711"
});

export const PSEUDO_LCD_PALETTES = Object.freeze({
  "99": Object.freeze({
    name: "pink",
    active: "#ff63ad",
    glow: "#ff2f8b",
    inactive: "rgba(112, 19, 67, 0.46)",
    label: "#ff9dcc",
    labelGlow: "#ff3e91",
    border: "#7d2a57",
    backgroundTop: "#281322",
    backgroundMiddle: "#100711",
    backgroundBottom: "#190813"
  }),
  "73": Object.freeze({
    name: "orange",
    active: "#ff922f",
    glow: "#ff5b00",
    inactive: "rgba(116, 49, 9, 0.46)",
    label: "#ffb76d",
    labelGlow: "#ff6a13",
    border: "#804318",
    backgroundTop: "#29190e",
    backgroundMiddle: "#110904",
    backgroundBottom: "#1a0c04"
  }),
  "50": Object.freeze({
    name: "yellow",
    active: "#ffe044",
    glow: "#ffc400",
    inactive: "rgba(115, 91, 8, 0.46)",
    label: "#ffed88",
    labelGlow: "#ffd11e",
    border: "#7c6814",
    backgroundTop: "#29240d",
    backgroundMiddle: "#110f04",
    backgroundBottom: "#191405"
  }),
  "30": Object.freeze({
    name: "emerald",
    active: "#2ce6a8",
    glow: "#00c985",
    inactive: "rgba(7, 94, 69, 0.46)",
    label: "#79f5cc",
    labelGlow: "#11dba0",
    border: "#146d51",
    backgroundTop: "#0a261d",
    backgroundMiddle: "#03100c",
    backgroundBottom: "#041812"
  }),
  "10": Object.freeze({
    name: "purple",
    active: "#b87aff",
    glow: "#9048ff",
    inactive: "rgba(73, 35, 111, 0.46)",
    label: "#d5b2ff",
    labelGlow: "#a35fff",
    border: "#5c3485",
    backgroundTop: "#20142c",
    backgroundMiddle: "#0d0712",
    backgroundBottom: "#14091c"
  }),
  "05": Object.freeze({
    name: "light-blue",
    active: "#67dcff",
    glow: "#20bfff",
    inactive: "rgba(17, 82, 111, 0.46)",
    label: "#a7ecff",
    labelGlow: "#35caff",
    border: "#1c667d",
    backgroundTop: "#0c222b",
    backgroundMiddle: "#041015",
    backgroundBottom: "#061820"
  })
});

function lcdSideNeonChancePalette(chanceCode) {
  const palette = PSEUDO_LCD_PALETTES[chanceCode];
  if (!palette) return null;
  return {
    name: palette.name,
    halo: palette.glow,
    body: palette.active,
    core: palette.label,
    light: palette.active
  };
}

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
      <div class="icp-danger-room-overlay" data-icp-danger-room-overlay aria-hidden="true"></div>
      <div class="icp-seven-panel" hidden aria-hidden="true">
        <small data-icp-spin-label>CHANCE SLOT</small>
        <div class="icp-seven-digits">
          <span class="icp-seven-digit" data-icp-digit-left>${segmentMarkup()}</span>
          <span class="icp-seven-digit" data-icp-digit-right>${segmentMarkup()}</span>
        </div>
      </div>
      <div class="icp-st-badge" data-icp-st hidden><strong>ST</strong><span>残り <b data-icp-st-count>5</b> 回</span><small>継続期待 80%</small></div>
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
        <button type="button" class="icp-jam-clear-button" data-icp-clear-jam title="盤面上のコインをアウトにする"><span aria-hidden="true">↺</span><strong>玉詰まり解消</strong></button>
        <button type="button" class="icp-dev-start-button" data-icp-dev-start title="スタートチェッカー入賞を1回発生させる"><span aria-hidden="true">S</span><strong>開発用 Sチェッカー入賞</strong></button>
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

function drawBoardLcdDigit(
  context,
  digit,
  x,
  y,
  width,
  height,
  palette = BOARD_LCD_DEFAULT_PALETTE
) {
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
    context.shadowColor = glow ? palette.glow : "transparent";
    context.shadowBlur = glow ? width * 0.18 : 0;
    Object.entries(segments).forEach(([name, points]) => {
      if (glow !== active.includes(name)) return;
      context.beginPath();
      context.moveTo(points[0], points[1]);
      context.lineTo(points[2], points[3]);
      context.stroke();
    });
  };
  drawSegments(palette.inactive, false);
  drawSegments(palette.active, true);
  context.shadowBlur = 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function cubicHermitePosition(start, end, startVelocity, endVelocity, progress, duration) {
  const t = clamp(progress, 0, 1);
  const t2 = t * t;
  const t3 = t2 * t;
  const safeDuration = Math.max(Number(duration) || 0, Number.EPSILON);
  return (2 * t3 - 3 * t2 + 1) * start
    + (t3 - 2 * t2 + t) * safeDuration * startVelocity
    + (-2 * t3 + 3 * t2) * end
    + (t3 - t2) * safeDuration * endVelocity;
}

function cubicHermiteVelocity(start, end, startVelocity, endVelocity, progress, duration) {
  const t = clamp(progress, 0, 1);
  const t2 = t * t;
  const safeDuration = Math.max(Number(duration) || 0, Number.EPSILON);
  return (
    (6 * t2 - 6 * t) * start
    + (3 * t2 - 4 * t + 1) * safeDuration * startVelocity
    + (-6 * t2 + 6 * t) * end
    + (3 * t2 - 2 * t) * safeDuration * endVelocity
  ) / safeDuration;
}

export function roleSideOutPocketCaptureAt({ x = 0, y = Number.POSITIVE_INFINITY } = {}) {
  const numericX = Number.isFinite(Number(x)) ? Number(x) : 0;
  const numericY = Number(y);
  const absoluteX = Math.abs(numericX);
  const slot = absoluteX >= ROLE_SIDE_OUT_LANE_INNER_ABS_X
    ? numericX < 0 ? 0 : 2
    : -1;
  const outwardProgress = clamp(
    (absoluteX - ROLE_SIDE_OUT_CAPTURE_OUTER_START_ABS_X)
      / (
        ROLE_SIDE_OUT_LANE_OUTER_ABS_X
        - ROLE_SIDE_OUT_CAPTURE_OUTER_START_ABS_X
      ),
    0,
    1
  );
  const captureY = lerp(
    ROLE_SIDE_OUT_CAPTURE_BASE_Y,
    ROLE_SIDE_OUT_CAPTURE_OUTER_MAX_Y,
    outwardProgress
  );
  return {
    captured: slot >= 0 && Number.isFinite(numericY) && numericY <= captureY,
    slot,
    captureY,
    absoluteX,
    outwardProgress
  };
}

export function hakamaChuckerEntryAt({
  phase = "board",
  chuckerX = 0,
  chuckerY = 0,
  currentX = 0,
  currentY = 0,
  previousY = 0,
  velocityY = 0
} = {}) {
  const numericChuckerX = Number(chuckerX);
  const numericChuckerY = Number(chuckerY);
  const numericCurrentX = Number(currentX);
  const numericCurrentY = Number(currentY);
  const numericPreviousY = Number(previousY);
  const numericVelocityY = Number(velocityY);
  if (
    phase !== "board"
    || !Number.isFinite(numericChuckerX)
    || !Number.isFinite(numericChuckerY)
    || !Number.isFinite(numericCurrentX)
    || !Number.isFinite(numericCurrentY)
    || !Number.isFinite(numericPreviousY)
    || !Number.isFinite(numericVelocityY)
    || numericVelocityY > 0.45
  ) return false;

  const topEntryY = numericChuckerY + HAKAMA_CHUCKER_HALF_HEIGHT;
  const crossedTopFromAbove = (
    numericPreviousY > topEntryY + HAKAMA_CHUCKER_TOP_ENTRY_EPSILON
    && numericCurrentY <= topEntryY + HAKAMA_CHUCKER_TOP_ENTRY_EPSILON
  );
  return crossedTopFromAbove
    && numericCurrentY >= numericChuckerY - HAKAMA_CHUCKER_HALF_HEIGHT
    && Math.abs(numericCurrentX - numericChuckerX) <= HAKAMA_CHUCKER_HALF_WIDTH;
}

export function hakamaAttackerEntryAt({
  active = false,
  opened = false,
  phase = "board",
  centerX = 0,
  centerY = 0,
  halfWidth = 0,
  halfHeight = 0,
  currentX = 0,
  currentY = 0,
  previousY = 0,
  velocityY = 0
} = {}) {
  const numericCenterX = Number(centerX);
  const numericCenterY = Number(centerY);
  const numericHalfWidth = Number(halfWidth);
  const numericHalfHeight = Number(halfHeight);
  const numericCurrentX = Number(currentX);
  const numericCurrentY = Number(currentY);
  const numericPreviousY = Number(previousY);
  const numericVelocityY = Number(velocityY);
  if (
    !active
    || !opened
    || phase !== "board"
    || !Number.isFinite(numericCenterX)
    || !Number.isFinite(numericCenterY)
    || !Number.isFinite(numericHalfWidth)
    || !Number.isFinite(numericHalfHeight)
    || !Number.isFinite(numericCurrentX)
    || !Number.isFinite(numericCurrentY)
    || !Number.isFinite(numericPreviousY)
    || !Number.isFinite(numericVelocityY)
    || numericVelocityY > 0.45
  ) return false;

  const topEntryY = numericCenterY + numericHalfHeight;
  const crossedTopFromAbove = (
    numericPreviousY > topEntryY + HAKAMA_ATTACKER_TOP_ENTRY_EPSILON
    && numericCurrentY <= topEntryY + HAKAMA_ATTACKER_TOP_ENTRY_EPSILON
  );
  return crossedTopFromAbove
    && numericCurrentY >= numericCenterY - numericHalfHeight
    && Math.abs(numericCurrentX - numericCenterX) <= numericHalfWidth;
}

export function roleBottomGuardCollisionAt({
  phase = "board",
  entryAuthorized = false,
  previousX = 0,
  previousY = 0,
  currentX = 0,
  currentY = 0,
  velocityX = 0,
  velocityY = 0
} = {}) {
  if (phase !== "board" || entryAuthorized) return null;

  const undersideY = ROLE_BOTTOM_GUIDE_Y
    - ROLE_BOTTOM_GUIDE_HALF_HEIGHT
    - PACHINKO_TOKEN_COLLIDER_RADIUS;
  const movementY = currentY - previousY;
  const movingUpward = movementY > 0 || velocityY > 0;
  const crossedUnderside = previousY <= undersideY + ROLE_BOTTOM_GUARD_EPSILON;
  const recoveringOverlap = previousY <= ROLE_BOTTOM_GUIDE_Y
    + ROLE_BOTTOM_GUARD_EPSILON;
  if (
    !movingUpward
    || currentY <= undersideY
    || (!crossedUnderside && !recoveringOverlap)
  ) {
    return null;
  }

  const impactProgress = movementY > 1e-7
    ? clamp((undersideY - previousY) / movementY, 0, 1)
    : 1;
  const impactX = lerp(previousX, currentX, impactProgress);
  const horizontalLimit = ROLE_BOTTOM_GUIDE_HALF_WIDTH
    + PACHINKO_TOKEN_COLLIDER_RADIUS;
  if (Math.abs(impactX) > horizontalLimit) return null;

  return {
    x: currentX,
    y: undersideY - ROLE_BOTTOM_GUARD_EPSILON,
    velocityX: velocityX * ROLE_BOTTOM_GUARD_TANGENT_RETENTION,
    velocityY: -Math.max(
      ROLE_BOTTOM_GUARD_MIN_REBOUND_SPEED,
      Math.abs(velocityY) * ROLE_BOTTOM_GUARD_RESTITUTION
    ),
    impactX
  };
}

function sharkRolePathForScale(scale) {
  const normalizedScale = Math.max(0.001, Number(scale) || 1);
  const noseLocalX = SHARK_ROLE_NOSE_LOCAL_X * normalizedScale;
  const tailLocalX = SHARK_ROLE_TAIL_LOCAL_X * normalizedScale;
  const bodyLength = tailLocalX - noseLocalX;
  const turnPivotLocalX = noseLocalX
    + bodyLength * SHARK_ROLE_TURN_PASSED_FRACTION;
  const turnX = SHARK_ROLE_LEFT_LINE_X - turnPivotLocalX;
  const turnSeconds = (
    SHARK_ROLE_START_X - turnX
  ) / SHARK_ROLE_INCOMING_SPEED;
  return {
    scale: normalizedScale,
    noseLocalX,
    tailLocalX,
    bodyLength,
    turnPivotLocalX,
    turnX,
    turnSeconds,
    activeSeconds: turnSeconds + SHARK_ROLE_EXIT_FADE_SECONDS,
    exitStartY: SHARK_ROLE_BASE_Y - turnPivotLocalX
  };
}

export const SMALL_SHARK_ROLE_PATH = Object.freeze({
  ...sharkRolePathForScale(SMALL_SHARK_ROLE_SCALE),
  slotSeconds: SHARK_ROLE_CYCLE_SECONDS
});

function sharkRoleTravelStateAtScale(elapsed, scale = 1) {
  const path = sharkRolePathForScale(scale);
  const movingElapsed = elapsed - SHARK_ROLE_INITIAL_DELAY;
  if (movingElapsed < 0) {
    return {
      active: false,
      phase: "waiting",
      progress: 0,
      x: SHARK_ROLE_START_X,
      y: SHARK_ROLE_BASE_Y,
      z: NEXT_ROLE_RAIL_Z,
      yaw: 0,
      roll: 0,
      opacity: 0,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
      speed: 0
    };
  }
  const cycleElapsed = movingElapsed % SHARK_ROLE_CYCLE_SECONDS;
  if (cycleElapsed < path.turnSeconds) {
    const distance = cycleElapsed * SHARK_ROLE_INCOMING_SPEED;
    return {
      active: true,
      phase: "incoming",
      progress: distance / (
        SHARK_ROLE_START_X - path.turnX + SHARK_ROLE_EXIT_DISTANCE
      ),
      x: SHARK_ROLE_START_X - distance,
      y: SHARK_ROLE_BASE_Y,
      z: NEXT_ROLE_RAIL_Z,
      yaw: 0,
      roll: 0,
      opacity: 1,
      velocityX: -SHARK_ROLE_INCOMING_SPEED,
      velocityY: 0,
      velocityZ: 0,
      speed: SHARK_ROLE_INCOMING_SPEED
    };
  }
  if (cycleElapsed < path.activeSeconds) {
    const exitElapsed = cycleElapsed - path.turnSeconds;
    const exitProgress = exitElapsed / SHARK_ROLE_EXIT_FADE_SECONDS;
    const incomingDistance = SHARK_ROLE_START_X - path.turnX;
    return {
      active: true,
      phase: "exit",
      progress: (
        incomingDistance + exitProgress * SHARK_ROLE_EXIT_DISTANCE
      ) / (incomingDistance + SHARK_ROLE_EXIT_DISTANCE),
      x: SHARK_ROLE_EXIT_LINE_X,
      y: path.exitStartY - exitElapsed * SHARK_ROLE_INCOMING_SPEED,
      z: NEXT_ROLE_RAIL_Z,
      yaw: 0,
      roll: Math.PI / 2,
      opacity: 1,
      velocityX: 0,
      velocityY: -SHARK_ROLE_INCOMING_SPEED,
      velocityZ: 0,
      speed: SHARK_ROLE_INCOMING_SPEED
    };
  }
  return {
    active: false,
    phase: "pause",
    progress: 1,
    x: SHARK_ROLE_EXIT_LINE_X,
    y: path.exitStartY - SHARK_ROLE_EXIT_DISTANCE,
    z: NEXT_ROLE_RAIL_Z,
    yaw: 0,
    roll: Math.PI / 2,
    opacity: 0,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    speed: 0
  };
}

export function sharkRoleTravelStateAt(elapsed) {
  return sharkRoleTravelStateAtScale(elapsed, 1);
}

export function alternatingSharkRoleTravelStateAt(
  elapsed,
  slotIndex = 0,
  scale = slotIndex === 0 ? SMALL_SHARK_ROLE_SCALE : 1
) {
  const normalizedSlot = slotIndex === 1 ? 1 : 0;
  const movingElapsed = elapsed - SHARK_ROLE_INITIAL_DELAY;
  if (movingElapsed < 0) {
    return {
      ...sharkRoleTravelStateAtScale(elapsed, scale),
      slotIndex: normalizedSlot
    };
  }
  const pairElapsed = (
    (movingElapsed % SHARK_ROLE_ALTERNATING_PAIR_SECONDS)
    + SHARK_ROLE_ALTERNATING_PAIR_SECONDS
  ) % SHARK_ROLE_ALTERNATING_PAIR_SECONDS;
  const slotElapsed = pairElapsed - normalizedSlot * SHARK_ROLE_CYCLE_SECONDS;
  if (slotElapsed < 0 || slotElapsed >= SHARK_ROLE_CYCLE_SECONDS) {
    const path = sharkRolePathForScale(scale);
    return {
      active: false,
      phase: "alternate-waiting",
      progress: 0,
      x: SHARK_ROLE_START_X,
      y: SHARK_ROLE_BASE_Y,
      z: NEXT_ROLE_RAIL_Z,
      yaw: 0,
      roll: 0,
      opacity: 0,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
      speed: 0,
      scale: path.scale,
      slotIndex: normalizedSlot
    };
  }
  return {
    ...sharkRoleTravelStateAtScale(
      SHARK_ROLE_INITIAL_DELAY + slotElapsed,
      scale
    ),
    slotIndex: normalizedSlot
  };
}

export function sharkDangerWarningStateAt(elapsed) {
  const time = Math.max(0, Number(elapsed) || 0);
  const appearanceIndex = Math.max(0, Math.floor(
    (
      time
      - SHARK_ROLE_INITIAL_DELAY
      + SHARK_DANGER_WARNING_LEAD_SECONDS
    ) / SHARK_ROLE_ALTERNATING_SLOT_SECONDS
  ));
  const appearanceTime = SHARK_ROLE_INITIAL_DELAY
    + appearanceIndex * SHARK_ROLE_ALTERNATING_SLOT_SECONDS;
  const secondsUntilAppearance = appearanceTime - time;
  const variant = appearanceIndex % 2 === 0 ? "small" : "large";
  const scale = variant === "small" ? SMALL_SHARK_ROLE_SCALE : 1;
  const sharkActiveSeconds = sharkRolePathForScale(scale).activeSeconds;
  const warningStartTime = appearanceTime - SHARK_DANGER_WARNING_LEAD_SECONDS;
  const warningEndTime = appearanceTime + sharkActiveSeconds;
  const active = time >= warningStartTime && time < warningEndTime;
  const blinkElapsed = Math.max(0, time - warningStartTime);
  const blinkCycleElapsed = (
    blinkElapsed % SHARK_DANGER_TEXT_BLINK_PERIOD_SECONDS
  );
  const blinkCycleProgress = (
    blinkCycleElapsed / SHARK_DANGER_TEXT_BLINK_PERIOD_SECONDS
  );
  const illumination = (
    Math.cos(blinkCycleProgress * Math.PI * 2) + 1
  ) / 2;
  const textBlinkOn = (
    active
    && blinkCycleElapsed < SHARK_DANGER_TEXT_BLINK_PERIOD_SECONDS / 2
  );
  return {
    active,
    variant,
    color: variant === "small" ? "yellow" : "red",
    appearanceIndex,
    appearanceTime,
    secondsUntilAppearance,
    sharkActiveSeconds,
    warningStartTime,
    warningEndTime,
    secondsUntilDismissal: Math.max(0, warningEndTime - time),
    phase: secondsUntilAppearance > 0 ? "warning" : "shark-active",
    textBlinkOn,
    textOpacity: textBlinkOn ? 1 : SHARK_DANGER_TEXT_BLINK_OFF_OPACITY,
    blinkCycleElapsed,
    blinkCycleProgress,
    illumination
  };
}

function strokeFromDisplayValue(displayValue) {
  const ratio = clamp(
    (displayValue - STROKE_DISPLAY_MIN) / (STROKE_DISPLAY_MAX - STROKE_DISPLAY_MIN),
    0,
    1
  );
  return lerp(STROKE_AT_DISPLAY_MIN, STROKE_MAX, ratio);
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

function createPayoutChuteRibbonGeometry(lowerOffset, upperOffset, depth, wallSide = 1) {
  const lowerEdge = PAYOUT_CHUTE_PATH_POINTS.map((point, index) => {
    const normal = PAYOUT_CHUTE_POINT_NORMALS[index];
    return {
      x: wallSide * (point.x + normal.x * lowerOffset),
      y: point.y + normal.y * lowerOffset
    };
  });
  const upperEdge = PAYOUT_CHUTE_PATH_POINTS.map((point, index) => {
    const normal = PAYOUT_CHUTE_POINT_NORMALS[index];
    return {
      x: wallSide * (point.x + normal.x * upperOffset),
      y: point.y + normal.y * upperOffset
    };
  });
  const shape = new THREE.Shape();
  shape.moveTo(lowerEdge[0].x, lowerEdge[0].y);
  lowerEdge.slice(1).forEach(point => shape.lineTo(point.x, point.y));
  upperEdge.slice().reverse().forEach(point => shape.lineTo(point.x, point.y));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: false
  });
}

function createHorizontalCapsuleShape(width, height) {
  const radius = height / 2;
  const halfWidth = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth + radius, -radius);
  shape.lineTo(halfWidth - radius, -radius);
  shape.absarc(halfWidth - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-halfWidth + radius, radius);
  shape.absarc(-halfWidth + radius, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
  shape.closePath();
  return shape;
}

function createCapsuleGeometry(width, height) {
  const vertical = height > width;
  const geometry = new THREE.ShapeGeometry(createHorizontalCapsuleShape(
    vertical ? height : width,
    vertical ? width : height
  ));
  if (vertical) geometry.rotateZ(Math.PI / 2);
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

function createSharkDangerWarningTexture(variant) {
  const width = 384;
  const height = 1536;
  const horizontalEdgeInset = 4;
  const horizontalCornerInset = 50;
  const accent = variant === "small" ? "#ffd83d" : "#ff3048";
  const accentBright = variant === "small" ? "#fff7c0" : "#ffd4d8";
  const panel = "rgba(2, 9, 15, 0.72)";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  const panelPath = () => {
    context.beginPath();
    context.moveTo(horizontalCornerInset, 22);
    context.lineTo(width - horizontalCornerInset, 22);
    context.lineTo(width - horizontalEdgeInset, 74);
    context.lineTo(width - horizontalEdgeInset, height - 74);
    context.lineTo(width - horizontalCornerInset, height - 22);
    context.lineTo(horizontalCornerInset, height - 22);
    context.lineTo(horizontalEdgeInset, height - 74);
    context.lineTo(horizontalEdgeInset, 74);
    context.closePath();
  };
  panelPath();
  context.fillStyle = panel;
  context.fill();
  context.save();
  context.shadowColor = accent;
  context.shadowBlur = 22;
  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.stroke();
  context.restore();

  context.strokeStyle = accentBright;
  context.lineWidth = 3;
  context.setLineDash([34, 24]);
  context.beginPath();
  context.moveTo(24, 118);
  context.lineTo(24, height - 118);
  context.moveTo(width - 24, 118);
  context.lineTo(width - 24, height - 118);
  context.stroke();
  context.setLineDash([]);

  context.save();
  context.shadowColor = accent;
  context.shadowBlur = 20;
  context.strokeStyle = accent;
  context.lineWidth = 8;
  context.beginPath();
  context.arc(width / 2, 170, 58, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 4;
  context.beginPath();
  context.arc(width / 2, 170, 35, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(width / 2, 92);
  context.lineTo(width / 2, 126);
  context.moveTo(width / 2, 214);
  context.lineTo(width / 2, 248);
  context.moveTo(width / 2 - 78, 170);
  context.lineTo(width / 2 - 44, 170);
  context.moveTo(width / 2 + 44, 170);
  context.lineTo(width / 2 + 78, 170);
  context.stroke();
  context.fillStyle = accentBright;
  context.beginPath();
  context.arc(width / 2, 170, 11, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.strokeStyle = accent;
  context.lineWidth = 7;
  context.shadowColor = accent;
  context.shadowBlur = 18;
  [0, 1, 2].forEach(index => {
    const y = height - 172 + index * 30;
    const halfWidth = 70 - index * 16;
    context.beginPath();
    context.moveTo(width / 2 - halfWidth, y);
    context.lineTo(width / 2, y + 20);
    context.lineTo(width / 2 + halfWidth, y);
    context.stroke();
  });
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData.dangerVariant = variant;
  texture.userData.dangerColor = variant === "small" ? "yellow" : "red";
  texture.userData.dangerLayout = "vertical-stacked";
  texture.userData.dangerDesignId = "right-side-wall-rear-glass-edge-aligned-radar-projection";
  texture.userData.dangerHorizontalEdgeInsetPixels = horizontalEdgeInset;
  texture.userData.dangerVisibleBorderTouchesHorizontalEdges = true;
  texture.userData.dangerLayer = "panel";
  texture.userData.dangerTextIncluded = false;
  texture.userData.usesReferenceStripeBand = false;
  texture.userData.usesReferenceTriangle = false;
  texture.userData.originalArtwork = true;
  return texture;
}

function createSharkDangerTextTexture(variant) {
  const width = 384;
  const height = 1536;
  const fontPixels = 206;
  const accent = variant === "small" ? "#ffd83d" : "#ff3048";
  const accentBright = variant === "small" ? "#fff7c0" : "#ffd4d8";
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.font = `900 ${fontPixels}px Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  ["D", "A", "N", "G", "E", "R"].forEach((letter, index) => {
    const y = 374 + index * 172;
    context.save();
    context.shadowColor = accent;
    context.shadowBlur = 30;
    context.strokeStyle = "rgba(0, 0, 0, 0.94)";
    context.lineWidth = 20;
    context.strokeText(letter, width / 2, y);
    context.fillStyle = accent;
    context.fillText(letter, width / 2, y);
    context.restore();
    if (index < 5) {
      context.strokeStyle = accentBright;
      context.globalAlpha = 0.72;
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(width / 2 - 54, y + 86);
      context.lineTo(width / 2 + 54, y + 86);
      context.stroke();
      context.globalAlpha = 1;
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData.dangerVariant = variant;
  texture.userData.dangerColor = variant === "small" ? "yellow" : "red";
  texture.userData.dangerLayout = "vertical-stacked";
  texture.userData.dangerLayer = "text";
  texture.userData.dangerFontPixels = fontPixels;
  texture.userData.dangerTextIncluded = true;
  texture.userData.originalArtwork = true;
  return texture;
}

function createCheckerMarkMesh(mark, width, height, material) {
  const group = new THREE.Group();
  const depth = 0.009;
  const thickness = height * 0.17;
  const addBar = (barWidth, barHeight, x, y, rotation = 0) => {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(barWidth, barHeight, depth),
      material
    );
    bar.position.set(x, y, 0);
    bar.rotation.z = rotation;
    bar.renderOrder = 4;
    group.add(bar);
  };

  if (mark === "1") {
    addBar(thickness, height * 0.76, width * 0.08, -height * 0.005);
    addBar(width * 0.42, thickness, -width * 0.04, height * 0.29, Math.PI * 0.12);
    addBar(width * 0.76, thickness, 0, -height * 0.415);
  } else if (mark === "2") {
    addBar(width * 0.72, thickness, 0, height * 0.35);
    addBar(thickness, height * 0.36, width * 0.33, height * 0.18);
    addBar(width * 0.72, thickness, 0, 0);
    addBar(thickness, height * 0.36, -width * 0.33, -height * 0.18);
    addBar(width * 0.72, thickness, 0, -height * 0.35);
  } else {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(width * 0.42, height * 0.32, 0),
      new THREE.Vector3(width * 0.18, height * 0.43, 0),
      new THREE.Vector3(-width * 0.18, height * 0.42, 0),
      new THREE.Vector3(-width * 0.4, height * 0.25, 0),
      new THREE.Vector3(-width * 0.32, height * 0.07, 0),
      new THREE.Vector3(width * 0.05, -height * 0.01, 0),
      new THREE.Vector3(width * 0.32, -height * 0.08, 0),
      new THREE.Vector3(width * 0.4, -height * 0.26, 0),
      new THREE.Vector3(width * 0.18, -height * 0.43, 0),
      new THREE.Vector3(-width * 0.2, -height * 0.42, 0),
      new THREE.Vector3(-width * 0.42, -height * 0.32, 0)
    ], false, "centripetal");
    const letter = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 30, height * 0.09, 8, false),
      material
    );
    letter.renderOrder = 4;
    group.add(letter);
  }

  return group;
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

export function drawPseudoChance(random = Math.random, stRemaining = 0) {
  const weightKey = stRemaining > 0 ? "stWeight" : "normalWeight";
  const randomValue = Number(random());
  const roll = clamp(
    Number.isFinite(randomValue) ? randomValue : 0.5,
    0,
    1 - Number.EPSILON
  );
  let cumulativeWeight = 0;
  let selected = PSEUDO_CHANCE_LEVELS[PSEUDO_CHANCE_LEVELS.length - 1];
  for (const level of PSEUDO_CHANCE_LEVELS) {
    cumulativeWeight += level[weightKey];
    if (roll < cumulativeWeight) {
      selected = level;
      break;
    }
  }
  return {
    code: selected.code,
    hitRate: selected.hitRate,
    premium: selected.premium
  };
}

export function drawChanceBasedJackpotOutcome(chance, random = Math.random, stRemaining = 0) {
  const inSt = stRemaining > 0;
  const numericHitRate = Number(chance?.hitRate);
  const hitRate = chance?.premium
    ? 1
    : clamp(Number.isFinite(numericHitRate) ? numericHitRate : 0, 0, 1);
  const hit = hitRate >= 1 || random() < hitRate;
  if (!hit) {
    return {
      code: randomMissDigits(random),
      kind: "miss",
      inSt,
      nextStRemaining: inSt ? Math.max(0, stRemaining - 1) : 0
    };
  }

  const conditionalBigRate = inSt
    ? 0.24
    : NORMAL_BIG_RATE / (NORMAL_BIG_RATE + NORMAL_SMALL_RATE);
  const kind = random() < conditionalBigRate ? "big" : "small";
  return {
    code: kind === "big" ? "77" : "33",
    kind,
    inSt,
    nextStRemaining: ST_SPINS
  };
}

export function resolveStartPocket(slot) {
  if (slot === 1) {
    return { kind: "red", startsSpin: true, payout: RED_SPIN_PAYOUT, creditReturn: 0 };
  }
  return { kind: "out", startsSpin: false, payout: 0, creditReturn: 0 };
}

export function pusherPositionAt(elapsed) {
  const phase = (Math.sin(elapsed * Math.PI * 0.495 - Math.PI / 2) + 1) / 2;
  return lerp(PUSHER_BODY_REAR_Z, PUSHER_BODY_NEAREST_Z, phase);
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

function loadPosterCharacterImage(markup) {
  return new Promise((resolve, reject) => {
    const template = document.createElement("template");
    template.innerHTML = String(markup || "");
    const sourceSvg = template.content.querySelector("svg");
    if (!sourceSvg) {
      reject(new Error("The original character SVG was not supplied."));
      return;
    }
    const svg = sourceSvg.cloneNode(true);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    if (!svg.getAttribute("viewBox")) svg.setAttribute("viewBox", "0 0 116 116");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    const serialized = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([serialized], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The original character SVG could not be decoded."));
    };
    image.src = url;
  });
}

async function createMemberRecruitmentPosterTexture(item, renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The recruitment poster canvas is unavailable.");
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#fff7fc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ff3f96";
  context.fillRect(0, 0, canvas.width, 420);

  context.lineJoin = "round";
  context.font = "900 190px 'Yu Gothic', 'Hiragino Sans', 'Meiryo', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#9d004e";
  context.lineWidth = 20;
  context.strokeText("会員", canvas.width / 2, 112, canvas.width - 36);
  context.strokeText("募集中", canvas.width / 2, 310, canvas.width - 36);
  context.fillStyle = "#ffffff";
  context.fillText("会員", canvas.width / 2, 112, canvas.width - 36);
  context.fillText("募集中", canvas.width / 2, 310, canvas.width - 36);

  const image = await loadPosterCharacterImage(item?.art || item?.frontSvg);
  const viewBox = image.naturalWidth && image.naturalHeight
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: 116, height: 116 };
  const maximumWidth = 704;
  const maximumHeight = 580;
  const scale = Math.min(maximumWidth / viewBox.width, maximumHeight / viewBox.height);
  const drawWidth = viewBox.width * scale;
  const drawHeight = viewBox.height * scale;
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = 430 + (maximumHeight - drawHeight) / 2;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  texture.userData.memberRecruitmentPoster = true;
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

function createExtrudedPolygonGeometry(points, depth) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.025,
    bevelThickness: 0.018
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
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
    this.effectPreferences = {
      sharkShake: options.effects?.sharkShake !== false,
      dangerIllumination: options.effects?.dangerIllumination !== false
    };
    this.random = typeof options.random === "function" ? options.random : Math.random;
    this.destroyed = false;
    this.elapsed = 0;
    this.lastTimestamp = 0;
    this.frame = 0;
    this.credits = STARTING_CREDITS;
    this.collected = 0;
    this.stroke = strokeFromDisplayValue(STROKE_DISPLAY_DEFAULT);
    this.lastLaunchStroke = null;
    this.launchCooldown = 0;
    this.autoEnabled = false;
    this.autoTimer = 0;
    this.tableCoins = [];
    this.tableCoinInstances = null;
    this.tableCoinInstanceCapacity = 0;
    this.tableCoinInstanceTransform = new THREE.Object3D();
    this.pusherPlateTopContactBodies = new Set();
    this.collectingCoins = [];
    this.pachinkoTokens = [];
    this.pachinkoWindmills = [];
    this.entrySeesaws = [];
    this.entryPlasticGuides = [];
    this.hanemonoWings = [];
    this.hakamaChuckers = [];
    this.hakamaAttacker = null;
    this.roleRotator = null;
    this.roleSideNeon = null;
    this.lcdSideNeon = null;
    this.sharkMechanism = null;
    this.smallSharkMechanism = null;
    this.sharkMechanisms = [];
    this.sharkDangerWarning = null;
    this.environmentLighting = null;
    this.sharkEatenCoins = [];
    this.haneOpenTimer = 0;
    this.haneOpeningRepeatsRemaining = 0;
    this.haneOpenAmount = 0;
    this.attackerRound = null;
    this.pendingSpins = 0;
    this.spin = null;
    this.spinDelay = 0;
    this.stRemaining = 0;
    this.pendingPayout = 0;
    this.payoutAccumulator = 0;
    this.nextSinglePayoutWallSide = 1;
    this.calloutTimer = 0;
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
    this.currentLcdPalette = BOARD_LCD_DEFAULT_PALETTE;
    this.lcdDigitsVisible = true;
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
    this.boundClearJam = this.clearPachinkoJam.bind(this);
    this.boundDevStart = this.triggerDevStartChucker.bind(this);
    this.boundStroke = this.onStrokeInput.bind(this);
    this.boundRestart = this.restartGame.bind(this);
    this.boundVisibility = this.onVisibilityChange.bind(this);
    this.boundPageHide = this.flushPinLayoutSave.bind(this);
    this.boundEditorToggle = this.onLayoutEditorToggle.bind(this);
    this.boundEditorClick = this.onLayoutEditorClick.bind(this);
    this.boundCanvasPointerDown = this.onCanvasPointerDown.bind(this);
    this.boundCanvasPointerMove = this.onCanvasPointerMove.bind(this);
    this.boundCanvasPointerUp = this.onCanvasPointerUp.bind(this);
    this.boundPusherPlatePreStep = this.applyPusherPlateTractionBeforeIntegration.bind(this);
  }

  setEffectPreferences(effects = {}) {
    this.effectPreferences = {
      sharkShake: effects.sharkShake !== false,
      dangerIllumination: effects.dangerIllumination !== false
    };
    if (!this.effectPreferences.sharkShake) {
      this.clearDangerScreenShake();
    }
    if (!this.effectPreferences.dangerIllumination && this.environmentLighting) {
      this.updateDangerRoomIllumination({ active: false });
    }
  }

  mount() {
    this.root.innerHTML = markup;
    this.els = {
      stage: this.root.querySelector("[data-icp-stage]"),
      canvas: this.root.querySelector("[data-icp-canvas]"),
      dangerRoomOverlay: this.root.querySelector("[data-icp-danger-room-overlay]"),
      collector: this.root.querySelector("[data-icp-collector]"),
      credits: this.root.querySelector("[data-icp-credits]"),
      collected: this.root.querySelector("[data-icp-collected]"),
      sevenPanel: this.root.querySelector(".icp-seven-panel"),
      digitLeft: this.root.querySelector("[data-icp-digit-left]"),
      digitRight: this.root.querySelector("[data-icp-digit-right]"),
      spinLabel: this.root.querySelector("[data-icp-spin-label]"),
      st: this.root.querySelector("[data-icp-st]"),
      stCount: this.root.querySelector("[data-icp-st-count]"),
      callout: this.root.querySelector("[data-icp-callout]"),
      payout: this.root.querySelector("[data-icp-payout]"),
      payoutCount: this.root.querySelector("[data-icp-payout-count]"),
      gameOver: this.root.querySelector("[data-icp-game-over]"),
      restart: this.root.querySelector("[data-icp-restart]"),
      stroke: this.root.querySelector("[data-icp-stroke]"),
      strokeValue: this.root.querySelector("[data-icp-stroke-value]"),
      auto: this.root.querySelector("[data-icp-auto]"),
      autoLabel: this.root.querySelector("[data-icp-auto-label]"),
      clearJam: this.root.querySelector("[data-icp-clear-jam]"),
      devStart: this.root.querySelector("[data-icp-dev-start]"),
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
    this.renderer.toneMappingExposure = NORMAL_ROOM_EXPOSURE;
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
    this.world.addEventListener("preStep", this.boundPusherPlatePreStep);

    this.coinMaterial = new CANNON.Material("coin");
    this.tableMaterial = new CANNON.Material("table");
    this.pusherMaterial = new CANNON.Material("pusher");
    this.pusherPlateMaterial = new CANNON.Material("pusher-plate");
    this.payoutChutePhysicsMaterial = new CANNON.Material("payout-chute");
    this.payoutChuteRailPhysicsMaterial = new CANNON.Material("payout-chute-rail");
    this.pinMaterial = new CANNON.Material("pin");
    this.railMaterial = new CANNON.Material("rail");
    this.tokenMaterial = new CANNON.Material("pachinko-token");
    this.attackerDoorPhysicsMaterial = new CANNON.Material("attacker-door");
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
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial, this.pusherPlateMaterial, {
      friction: PUSHER_COIN_CONTACT_FRICTION,
      restitution: 0.04
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial, this.payoutChutePhysicsMaterial, {
      friction: 0.12,
      restitution: 0.03
    }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.coinMaterial, this.payoutChuteRailPhysicsMaterial, {
      friction: 0.005,
      restitution: 0.02
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
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.tokenMaterial,
      this.attackerDoorPhysicsMaterial,
      {
        friction: 0.08,
        restitution: 0,
        contactEquationStiffness: 8e6,
        contactEquationRelaxation: 4
      }
    ));
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
    this.environmentLighting = {
      background: this.scene.background.clone(),
      fog: this.scene.fog.color.clone(),
      ambient: {
        light: ambient,
        intensity: ambient.intensity,
        color: ambient.color.clone(),
        groundColor: ambient.groundColor.clone()
      },
      key: {
        light: key,
        intensity: key.intensity,
        color: key.color.clone()
      },
      cyan: {
        light: cyan,
        intensity: cyan.intensity,
        color: cyan.color.clone()
      },
      magenta: {
        light: magenta,
        intensity: magenta.intensity,
        color: magenta.color.clone()
      }
    };

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
    const payoutChuteMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf0d29a,
      emissive: 0x6a420a,
      emissiveIntensity: 0.32,
      metalness: 0.48,
      roughness: 0.34,
      clearcoat: 0.4,
      side: THREE.DoubleSide
    });
    const bedMaterial = new THREE.MeshStandardMaterial({
      color: 0x125e8c,
      roughness: 0.28,
      metalness: 0.06
    });
    const sideWallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2d6877,
      transparent: false,
      opacity: 1,
      roughness: 0.42,
      metalness: 0.18,
      transmission: 0,
      thickness: 0.08,
      clearcoat: 0.35,
      clearcoatRoughness: 0.18,
      side: THREE.DoubleSide,
      depthWrite: true
    });
    const sharkPortalRimMaterial = new THREE.MeshStandardMaterial({
      color: 0x174f59,
      emissive: 0x08252a,
      emissiveIntensity: 0.16,
      metalness: 0.48,
      roughness: 0.34
    });

    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(MACHINE_CABINET_WIDTH, 1.35, 5.5),
      [
        baseMaterial,
        baseMaterial,
        bedMaterial,
        baseMaterial,
        baseMaterial,
        baseMaterial
      ]
    );
    cabinet.name = "icp-static-bed-surface";
    cabinet.position.set(0, -0.05, 0.12);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    this.scene.add(cabinet);

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.15, 0.22, 4.7), bedMaterial);
    shelf.name = "icp-static-bed-underlay";
    shelf.position.set(0, TABLE_TOP_Y - 0.11, 0.05);
    shelf.receiveShadow = true;
    this.scene.add(shelf);

    const nextRoleRailSlot = new THREE.Mesh(
      new THREE.PlaneGeometry(
        NEXT_ROLE_RAIL_MARKER.length,
        NEXT_ROLE_RAIL_MARKER.width
      ),
      new THREE.MeshStandardMaterial({
        color: 0x02090d,
        roughness: 1,
        metalness: 0
      })
    );
    nextRoleRailSlot.name = "icp-next-role-rail-slot";
    nextRoleRailSlot.rotation.x = -Math.PI / 2;
    nextRoleRailSlot.position.set(0, STATIC_BED_SURFACE_Y + 0.001, NEXT_ROLE_RAIL_Z);
    nextRoleRailSlot.userData.railMarker = {
      minX: -NEXT_ROLE_RAIL_MARKER.length / 2,
      maxX: NEXT_ROLE_RAIL_MARKER.length / 2,
      width: NEXT_ROLE_RAIL_MARKER.width,
      z: NEXT_ROLE_RAIL_MARKER.z,
      physical: false
    };
    nextRoleRailSlot.receiveShadow = true;
    this.scene.add(nextRoleRailSlot);

    // Keep the coin floor continuous; this narrow opening is reserved for the future mechanism.
    const shelfBody = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    // Meet both outer side walls underneath the visible shelf so neither mirrored chute opens a floor gap.
    shelfBody.addShape(new CANNON.Box(new CANNON.Vec3(PAYOUT_STATIC_BED_HALF_WIDTH, 0.11, 2.35)));
    shelfBody.position.set(0, STATIC_BED_SURFACE_Y - 0.11, 0.05);
    this.world.addBody(shelfBody);
    this.staticBedBody = shelfBody;
    this.createSharkMechanism();

    const sideWallSegments = [
      {
        key: "rear",
        minY: PAYOUT_SIDE_WALL_MIN_Y,
        maxY: PAYOUT_SIDE_WALL_MAX_Y,
        minZ: PAYOUT_SIDE_WALL_MIN_Z,
        maxZ: SHARK_SIDE_WALL_OPENING_REAR_Z
      },
      {
        key: "front",
        minY: PAYOUT_SIDE_WALL_MIN_Y,
        maxY: PAYOUT_SIDE_WALL_MAX_Y,
        minZ: SHARK_SIDE_WALL_OPENING_FRONT_Z,
        maxZ: PAYOUT_SIDE_WALL_MAX_Z
      }
    ];

    PAYOUT_CHUTE_WALL_SIDES.forEach(wallSide => {
      const x = wallSide * PAYOUT_SIDE_WALL_X;
      const wallName = wallSide > 0 ? "right" : "left";
      const wallGroup = new THREE.Group();
      wallGroup.name = `icp-payout-side-wall-${wallName}`;
      sideWallSegments.forEach(segment => {
        const height = segment.maxY - segment.minY;
        const depth = segment.maxZ - segment.minZ;
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(PAYOUT_SIDE_WALL_WIDTH, height, depth),
          sideWallMaterial
        );
        rail.name = `icp-payout-side-wall-${wallName}-${segment.key}`;
        rail.position.set(
          x,
          (segment.minY + segment.maxY) / 2,
          (segment.minZ + segment.maxZ) / 2
        );
        rail.castShadow = true;
        rail.userData.sharkSideWallSegment = {
          side: wallSide,
          key: segment.key,
          ...segment
        };
        wallGroup.add(rail);

        const body = new CANNON.Body({ mass: 0, material: this.tableMaterial });
        body.addShape(new CANNON.Box(new CANNON.Vec3(
          PAYOUT_SIDE_WALL_COLLIDER_HALF_WIDTH,
          height / 2,
          depth / 2
        )));
        body.position.set(
          x,
          (segment.minY + segment.maxY) / 2,
          (segment.minZ + segment.maxZ) / 2
        );
        body.sharkSideWallSegment = {
          side: wallSide,
          key: segment.key,
          ...segment
        };
        this.world.addBody(body);
      });

      const coinGuardSegment = {
        side: wallSide,
        key: "coin-guard",
        minY: PAYOUT_SIDE_WALL_MIN_Y,
        maxY: SHARK_SIDE_WALL_COIN_GUARD_TOP_Y,
        minZ: SHARK_SIDE_WALL_OPENING_REAR_Z,
        maxZ: SHARK_SIDE_WALL_OPENING_FRONT_Z
      };
      const coinGuardBody = new CANNON.Body({
        mass: 0,
        material: this.tableMaterial
      });
      coinGuardBody.addShape(new CANNON.Box(new CANNON.Vec3(
        PAYOUT_SIDE_WALL_COLLIDER_HALF_WIDTH,
        (coinGuardSegment.maxY - coinGuardSegment.minY) / 2,
        (coinGuardSegment.maxZ - coinGuardSegment.minZ) / 2
      )));
      coinGuardBody.position.set(
        x,
        (coinGuardSegment.minY + coinGuardSegment.maxY) / 2,
        (coinGuardSegment.minZ + coinGuardSegment.maxZ) / 2
      );
      coinGuardBody.sharkSideWallSegment = coinGuardSegment;
      this.world.addBody(coinGuardBody);

      const openingCenterY = (
        SHARK_SIDE_WALL_OPENING_BOTTOM_Y + SHARK_SIDE_WALL_OPENING_TOP_Y
      ) / 2;
      const openingHeight = (
        SHARK_SIDE_WALL_OPENING_TOP_Y - SHARK_SIDE_WALL_OPENING_BOTTOM_Y
      );
      [
        {
          key: "rear-jamb",
          y: openingCenterY,
          z: SHARK_SIDE_WALL_OPENING_REAR_Z,
          height: openingHeight,
          depth: SHARK_SIDE_WALL_RIM_THICKNESS
        },
        {
          key: "front-jamb",
          y: openingCenterY,
          z: SHARK_SIDE_WALL_OPENING_FRONT_Z,
          height: openingHeight,
          depth: SHARK_SIDE_WALL_RIM_THICKNESS
        }
      ].forEach(rim => {
        const trim = new THREE.Mesh(
          new THREE.BoxGeometry(
            PAYOUT_SIDE_WALL_WIDTH + 0.025,
            rim.height,
            rim.depth
          ),
          sharkPortalRimMaterial
        );
        trim.name = `icp-shark-side-wall-opening-${wallName}-${rim.key}`;
        trim.position.set(x, rim.y, rim.z);
        trim.castShadow = true;
        wallGroup.add(trim);
      });
      this.scene.add(wallGroup);
    });

    const backBody = new CANNON.Body({ mass: 0, material: this.tableMaterial });
    backBody.addShape(new CANNON.Box(new CANNON.Vec3(2.58, 0.5, 0.08)));
    backBody.position.set(0, 0.95, -2.28);
    this.world.addBody(backBody);

    const frontTrim = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.13, 0.17), goldMaterial);
    frontTrim.position.set(0, 0.63, FRONT_EDGE_Z);
    this.scene.add(frontTrim);

    // Cut only the upper rear lip where it crosses the launcher lane and circular frame.
    const pusherClearanceCutouts = [
      { name: "launcher", left: -2.42, right: -1.98, bottom: 0.12, top: 0.355 },
      { name: "board", left: -0.68, right: 0.68, bottom: 0.25, top: 0.355 }
    ];
    const pusherFaceSegments = [
      { left: -2.42, right: 2.42, bottom: -0.015, top: 0.12 },
      { left: -1.98, right: 2.42, bottom: 0.12, top: 0.25 },
      { left: -1.98, right: -0.68, bottom: 0.25, top: 0.355 },
      { left: 0.68, right: 2.42, bottom: 0.25, top: 0.355 }
    ];
    this.pusherBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: this.pusherMaterial });
    this.pusherPlateShape = new CANNON.Box(new CANNON.Vec3(2.42, 0.12, PUSHER_PLATE_DEPTH / 2));
    this.pusherPlateShape.material = this.pusherPlateMaterial;
    this.pusherBody.addShape(
      this.pusherPlateShape,
      new CANNON.Vec3(0, 0, PUSHER_PLATE_CENTER_OFFSET_Z)
    );
    pusherFaceSegments.forEach(({ left, right, bottom, top }) => {
      const width = right - left;
      const height = top - bottom;
      this.pusherBody.addShape(
        new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, 0.08)),
        new CANNON.Vec3((left + right) / 2, (bottom + top) / 2, -0.58)
      );
    });
    this.pusherBody.position.set(0, TABLE_TOP_Y + 0.12, PUSHER_BODY_REAR_Z);
    this.world.addBody(this.pusherBody);
    this.payoutChuteBody = new CANNON.Body({
      mass: 0,
      material: this.payoutChutePhysicsMaterial
    });
    this.payoutChuteFloorShapes = PAYOUT_CHUTE_WALL_SIDES.flatMap(wallSide => (
      PAYOUT_CHUTE_SEGMENTS.map(segment => {
        const rotation = new CANNON.Quaternion();
        rotation.setFromAxisAngle(
          new CANNON.Vec3(0, 0, 1),
          segment.angle * wallSide
        );
        const floorShape = new CANNON.Box(new CANNON.Vec3(
          segment.length / 2 + 0.003,
          PAYOUT_CHUTE_FLOOR_THICKNESS / 2,
          PAYOUT_CHUTE_WIDTH / 2
        ));
        floorShape.material = this.payoutChutePhysicsMaterial;
        this.payoutChuteBody.addShape(
          floorShape,
          new CANNON.Vec3(
            wallSide * segment.centerX,
            segment.centerY,
            PAYOUT_CHUTE_FIXED_Z
          ),
          rotation
        );
        return floorShape;
      })
    ));
    const payoutChuteRailHalfExtents = new CANNON.Vec3(
      (PAYOUT_CHUTE_RAIL_MAX_X - PAYOUT_CHUTE_RAIL_MIN_X) / 2,
      (PAYOUT_CHUTE_RAIL_MAX_Y - PAYOUT_CHUTE_RAIL_MIN_Y) / 2,
      PAYOUT_CHUTE_RAIL_THICKNESS / 2
    );
    this.payoutChuteRailShapes = PAYOUT_CHUTE_WALL_SIDES.flatMap(wallSide => (
      [-1, 1].map(depthSide => {
        const railShape = new CANNON.Box(payoutChuteRailHalfExtents);
        railShape.material = this.payoutChuteRailPhysicsMaterial;
        this.payoutChuteBody.addShape(
          railShape,
          new CANNON.Vec3(
            wallSide * (PAYOUT_CHUTE_RAIL_MIN_X + PAYOUT_CHUTE_RAIL_MAX_X) / 2,
            (PAYOUT_CHUTE_RAIL_MIN_Y + PAYOUT_CHUTE_RAIL_MAX_Y) / 2,
            PAYOUT_CHUTE_FIXED_Z
              + depthSide * (PAYOUT_CHUTE_WIDTH / 2 - PAYOUT_CHUTE_RAIL_THICKNESS / 2)
          )
        );
        return railShape;
      })
    ));
    this.payoutChuteFloorShape = this.payoutChuteFloorShapes[0];
    this.payoutChuteBody.position.set(0, 0, 0);
    this.world.addBody(this.payoutChuteBody);

    this.pusherVisual = new THREE.Group();
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(4.84, 0.24, PUSHER_PLATE_DEPTH),
      goldMaterial
    );
    plate.position.z = PUSHER_PLATE_CENTER_OFFSET_Z;
    plate.receiveShadow = true;
    plate.castShadow = true;
    const faceShape = new THREE.Shape();
    faceShape.moveTo(-2.42, -0.015);
    faceShape.lineTo(2.42, -0.015);
    faceShape.lineTo(2.42, 0.355);
    faceShape.lineTo(0.68, 0.355);
    faceShape.lineTo(0.68, 0.25);
    faceShape.lineTo(-0.68, 0.25);
    faceShape.lineTo(-0.68, 0.355);
    faceShape.lineTo(-1.98, 0.355);
    faceShape.lineTo(-1.98, 0.12);
    faceShape.lineTo(-2.42, 0.12);
    faceShape.closePath();
    const face = new THREE.Mesh(
      new THREE.ExtrudeGeometry(faceShape, {
        depth: 0.16,
        bevelEnabled: false
      }),
      baseMaterial
    );
    face.name = "icp-pusher-rear-face-cutouts";
    face.position.z = PUSHER_PLATE_REAR_OFFSET_Z;
    face.castShadow = true;
    this.pusherVisual.add(plate, face);
    this.payoutChuteVisual = new THREE.Group();
    this.payoutChuteVisual.name = "icp-payout-chute";
    PAYOUT_CHUTE_WALL_SIDES.forEach(wallSide => {
      const wallName = wallSide > 0 ? "right" : "left";
      const chuteVisual = new THREE.Group();
      chuteVisual.name = `icp-payout-chute-${wallName}`;
      const payoutChuteFloor = new THREE.Mesh(
        createPayoutChuteRibbonGeometry(
          -PAYOUT_CHUTE_FLOOR_THICKNESS / 2,
          PAYOUT_CHUTE_FLOOR_THICKNESS / 2,
          PAYOUT_CHUTE_WIDTH,
          wallSide
        ),
        payoutChuteMaterial
      );
      payoutChuteFloor.name = `icp-payout-chute-floor-${wallName}`;
      payoutChuteFloor.position.z = PAYOUT_CHUTE_FIXED_Z - PAYOUT_CHUTE_WIDTH / 2;
      payoutChuteFloor.castShadow = true;
      payoutChuteFloor.receiveShadow = true;
      chuteVisual.add(payoutChuteFloor);
      [-1, 1].forEach(depthSide => {
        const rail = new THREE.Mesh(
          createPayoutChuteRibbonGeometry(
            PAYOUT_CHUTE_FLOOR_THICKNESS / 2,
            PAYOUT_CHUTE_FLOOR_THICKNESS / 2 + PAYOUT_CHUTE_RAIL_HEIGHT,
            PAYOUT_CHUTE_RAIL_THICKNESS,
            wallSide
          ),
          payoutChuteMaterial
        );
        const depthName = depthSide < 0 ? "rear" : "front";
        rail.name = `icp-payout-chute-${depthName}-rail-${wallName}`;
        rail.position.z = depthSide < 0
          ? PAYOUT_CHUTE_FIXED_Z - PAYOUT_CHUTE_WIDTH / 2
          : PAYOUT_CHUTE_FIXED_Z + PAYOUT_CHUTE_WIDTH / 2 - PAYOUT_CHUTE_RAIL_THICKNESS;
        rail.castShadow = true;
        rail.receiveShadow = true;
        chuteVisual.add(rail);
      });
      const payoutOutletRim = new THREE.Mesh(
        createCapsuleGeometry(
          PAYOUT_OUTLET_RIM_WIDTH,
          PAYOUT_OUTLET_RIM_HEIGHT
        ),
        payoutChuteMaterial
      );
      payoutOutletRim.name = `icp-payout-outlet-rim-${wallName}`;
      payoutOutletRim.position.set(
        wallSide * PAYOUT_OUTLET_X,
        PAYOUT_OUTLET_Y,
        PAYOUT_CHUTE_FIXED_Z
      );
      payoutOutletRim.rotation.y = wallSide * -Math.PI / 2;
      payoutOutletRim.castShadow = true;
      const payoutOutletHole = new THREE.Mesh(
        createCapsuleGeometry(
          PAYOUT_OUTLET_SLOT_WIDTH,
          PAYOUT_OUTLET_SLOT_HEIGHT
        ),
        new THREE.MeshPhysicalMaterial({
          color: 0x07141d,
          emissive: 0x062b2a,
          emissiveIntensity: 0.42,
          metalness: 0.22,
          roughness: 0.44
        })
      );
      payoutOutletHole.name = `icp-payout-outlet-hole-${wallName}`;
      payoutOutletHole.position.set(
        wallSide * (PAYOUT_OUTLET_X - 0.006),
        PAYOUT_OUTLET_Y,
        PAYOUT_CHUTE_FIXED_Z
      );
      payoutOutletHole.rotation.y = wallSide * -Math.PI / 2;
      chuteVisual.add(payoutOutletRim, payoutOutletHole);
      this.payoutChuteVisual.add(chuteVisual);
    });
    pusherClearanceCutouts.forEach(({ name, left, right }) => {
      const slidingCap = new THREE.Mesh(
        new THREE.BoxGeometry(right - left, 0.008, 0.52),
        baseMaterial
      );
      slidingCap.name = `icp-pusher-${name}-cutout-sliding-cap`;
      slidingCap.position.set((left + right) / 2, 0.124, -0.4);
      slidingCap.receiveShadow = true;
      this.pusherVisual.add(slidingCap);
    });
    this.pusherVisual.position.copy(this.pusherBody.position);
    this.payoutChuteVisual.position.set(0, 0, 0);
    this.scene.add(this.pusherVisual, this.payoutChuteVisual);

    // Keep the two clearance cutouts visually deep green while the beige plate slides behind them.
    pusherClearanceCutouts.forEach(({ name, left, right, bottom, top }) => {
      const backing = new THREE.Mesh(
        new THREE.PlaneGeometry(right - left, top - bottom),
        baseMaterial
      );
      backing.name = `icp-pusher-${name}-cutout-backing`;
      backing.position.set(
        (left + right) / 2,
        TABLE_TOP_Y + 0.12 + (bottom + top) / 2,
        PACHINKO_PLAYFIELD_Z - 0.035
      );
      backing.receiveShadow = true;
      this.scene.add(backing);
    });

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
    this.ensureTableCoinInstanceCapacity(TABLE_COIN_INSTANCE_INITIAL_CAPACITY);
  }

  createSharkMechanism() {
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0x172326,
      emissiveIntensity: 0.035,
      metalness: 0.02,
      roughness: 0.58,
      clearcoat: 0.2,
      clearcoatRoughness: 0.45,
      side: THREE.DoubleSide
    });
    const finMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x4b6167,
      emissive: 0x172326,
      emissiveIntensity: 0.035,
      metalness: 0.02,
      roughness: 0.62,
      clearcoat: 0.16,
      side: THREE.DoubleSide
    });
    const jawSkinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xb9c4c1,
      emissive: 0x242c2d,
      emissiveIntensity: 0.025,
      metalness: 0.01,
      roughness: 0.62,
      clearcoat: 0.12
    });
    const mouthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x21070b,
      emissive: 0x2a0509,
      emissiveIntensity: 0.08,
      metalness: 0,
      roughness: 0.84,
      side: THREE.DoubleSide
    });
    const deepMouthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x090204,
      emissive: 0x160205,
      emissiveIntensity: 0.04,
      metalness: 0,
      roughness: 0.92,
      side: THREE.DoubleSide
    });
    const gumMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x68222b,
      emissive: 0x270508,
      emissiveIntensity: 0.05,
      metalness: 0,
      roughness: 0.62,
      clearcoat: 0.12
    });
    const toothMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf1eee2,
      emissive: 0x4a463b,
      emissiveIntensity: 0.045,
      metalness: 0.01,
      roughness: 0.42,
      clearcoat: 0.2
    });
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x05090a,
      emissive: 0x010304,
      emissiveIntensity: 0.08,
      metalness: 0.02,
      roughness: 0.24,
      clearcoat: 0.62
    });
    const eyeHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8efed
    });
    const gillMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x27383c,
      emissive: 0x090f11,
      emissiveIntensity: 0.045,
      metalness: 0.01,
      roughness: 0.76
    });

    const group = new THREE.Group();
    group.name = "icp-shark-role";
    group.position.set(SHARK_ROLE_START_X, SHARK_ROLE_BASE_Y, NEXT_ROLE_RAIL_Z);
    group.rotation.y = 0;
    group.visible = false;

    const dorsalColor = new THREE.Color(0x40585f);
    const sideColor = new THREE.Color(0x6e8285);
    const ventralColor = new THREE.Color(0xb8c2bf);

    const finishGeometry = geometry => {
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return geometry;
    };

    const createOpenHeadLoftGeometry = (stations, surface) => {
      const columns = 24;
      const positions = [];
      const colors = [];
      const indices = [];
      stations.forEach(station => {
        for (let column = 0; column <= columns; column += 1) {
          const lateral = -1 + column / columns * 2;
          const dome = Math.pow(
            Math.max(0, 1 - Math.pow(Math.abs(lateral), 1.52)),
            0.68
          );
          const y = surface === "upper"
            ? station.mouthY + (station.outerY - station.mouthY) * dome
            : station.mouthY - (station.mouthY - station.outerY) * dome;
          const z = lateral * station.halfDepth * (0.94 + dome * 0.06);
          positions.push(station.x, y, z);
          const color = new THREE.Color();
          if (surface === "upper") {
            color.lerpColors(sideColor, dorsalColor, 0.22 + dome * 0.78);
          } else {
            color.lerpColors(ventralColor, sideColor, Math.abs(lateral) * 0.2);
          }
          colors.push(color.r, color.g, color.b);
        }
      });
      for (let row = 0; row < stations.length - 1; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const a = row * (columns + 1) + column;
          const b = a + 1;
          const d = (row + 1) * (columns + 1) + column;
          const c = d + 1;
          indices.push(a, d, c, a, c, b);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setIndex(indices);
      return finishGeometry(geometry);
    };

    const createBodyLoftGeometry = stations => {
      const ringSegments = 36;
      const positions = [];
      const colors = [];
      const indices = [];
      stations.forEach(station => {
        for (let segment = 0; segment < ringSegments; segment += 1) {
          const angle = segment / ringSegments * Math.PI * 2;
          const vertical = Math.cos(angle);
          const lateral = Math.sin(angle);
          const verticalRadius = vertical >= 0
            ? station.topRadius
            : station.bottomRadius;
          const y = station.centerY + vertical * verticalRadius;
          const z = lateral * station.halfDepth
            * (0.84 + 0.16 * Math.pow(Math.abs(lateral), 0.55));
          positions.push(station.x, y, z);
          const dorsalBlend = clamp((vertical + 0.34) / 1.12, 0, 1);
          const color = new THREE.Color().lerpColors(
            ventralColor,
            dorsalColor,
            dorsalBlend
          );
          colors.push(color.r, color.g, color.b);
        }
      });
      for (let ring = 0; ring < stations.length - 1; ring += 1) {
        for (let segment = 0; segment < ringSegments; segment += 1) {
          const nextSegment = (segment + 1) % ringSegments;
          const a = ring * ringSegments + segment;
          const b = ring * ringSegments + nextSegment;
          const d = (ring + 1) * ringSegments + segment;
          const c = (ring + 1) * ringSegments + nextSegment;
          indices.push(a, d, c, a, c, b);
        }
      }
      const rear = stations[stations.length - 1];
      const rearCenter = positions.length / 3;
      positions.push(rear.x, rear.centerY, 0);
      colors.push(dorsalColor.r, dorsalColor.g, dorsalColor.b);
      const rearOffset = (stations.length - 1) * ringSegments;
      for (let segment = 0; segment < ringSegments; segment += 1) {
        indices.push(
          rearCenter,
          rearOffset + segment,
          rearOffset + (segment + 1) % ringSegments
        );
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setIndex(indices);
      return finishGeometry(geometry);
    };

    const createIntegratedUpperBodyGeometry = (headStations, bodyStations) => {
      const headColumns = 24;
      const headStride = headColumns + 1;
      const bodyRingSegments = 48;
      const positions = [];
      const colors = [];
      const indices = [];

      headStations.forEach(station => {
        for (let column = 0; column <= headColumns; column += 1) {
          const lateral = -1 + column / headColumns * 2;
          const dome = Math.pow(
            Math.max(0, 1 - Math.pow(Math.abs(lateral), 1.52)),
            0.68
          );
          positions.push(
            station.x,
            station.mouthY + (station.outerY - station.mouthY) * dome,
            lateral * station.halfDepth * (0.94 + dome * 0.06)
          );
          const color = new THREE.Color().lerpColors(
            sideColor,
            dorsalColor,
            0.22 + dome * 0.78
          );
          colors.push(color.r, color.g, color.b);
        }
      });
      for (let row = 0; row < headStations.length - 1; row += 1) {
        for (let column = 0; column < headColumns; column += 1) {
          const a = row * headStride + column;
          const b = a + 1;
          const d = (row + 1) * headStride + column;
          const c = d + 1;
          indices.push(a, d, c, a, c, b);
        }
      }

      const bodyOffset = positions.length / 3;
      bodyStations.forEach(station => {
        for (let segment = 0; segment < bodyRingSegments; segment += 1) {
          const angle = segment / bodyRingSegments * Math.PI * 2;
          const vertical = Math.cos(angle);
          const lateral = Math.sin(angle);
          const verticalRadius = vertical >= 0
            ? station.topRadius
            : station.bottomRadius;
          positions.push(
            station.x,
            station.centerY + vertical * verticalRadius,
            lateral * station.halfDepth
              * (0.84 + 0.16 * Math.pow(Math.abs(lateral), 0.55))
          );
          const color = new THREE.Color().lerpColors(
            ventralColor,
            dorsalColor,
            clamp((vertical + 0.34) / 1.12, 0, 1)
          );
          colors.push(color.r, color.g, color.b);
        }
      });

      const headRearOffset = (headStations.length - 1) * headStride;
      const topArcStart = bodyRingSegments * 3 / 4;
      for (let column = 0; column < headColumns; column += 1) {
        const a = headRearOffset + column;
        const b = a + 1;
        const d = bodyOffset
          + (topArcStart + column) % bodyRingSegments;
        const c = bodyOffset
          + (topArcStart + column + 1) % bodyRingSegments;
        indices.push(a, d, c, a, c, b);
      }

      for (let ring = 0; ring < bodyStations.length - 1; ring += 1) {
        for (let segment = 0; segment < bodyRingSegments; segment += 1) {
          const nextSegment = (segment + 1) % bodyRingSegments;
          const a = bodyOffset + ring * bodyRingSegments + segment;
          const b = bodyOffset + ring * bodyRingSegments + nextSegment;
          const d = bodyOffset + (ring + 1) * bodyRingSegments + segment;
          const c = bodyOffset + (ring + 1) * bodyRingSegments + nextSegment;
          indices.push(a, d, c, a, c, b);
        }
      }

      const rear = bodyStations[bodyStations.length - 1];
      const rearCenter = positions.length / 3;
      positions.push(rear.x, rear.centerY, 0);
      colors.push(dorsalColor.r, dorsalColor.g, dorsalColor.b);
      const rearRingOffset = bodyOffset
        + (bodyStations.length - 1) * bodyRingSegments;
      for (let segment = 0; segment < bodyRingSegments; segment += 1) {
        indices.push(
          rearCenter,
          rearRingOffset + segment,
          rearRingOffset + (segment + 1) % bodyRingSegments
        );
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
      );
      geometry.setIndex(indices);
      return finishGeometry(geometry);
    };

    const createMouthCavityGeometry = sections => {
      const positions = [];
      const indices = [];
      const recession = 0.82;
      sections.forEach(section => {
        const depth = section.halfDepth * recession;
        positions.push(
          section.x, section.topY, depth,
          section.x, section.topY, -depth,
          section.x, section.bottomY, depth,
          section.x, section.bottomY, -depth
        );
      });
      const pushQuad = (a, b, c, d) => {
        indices.push(a, b, c, a, c, d);
      };
      for (let section = 0; section < sections.length - 1; section += 1) {
        const current = section * 4;
        const next = (section + 1) * 4;
        pushQuad(current, next, next + 1, current + 1);
        pushQuad(current + 2, current + 3, next + 3, next + 2);
        pushQuad(current + 1, next + 1, next + 3, current + 3);
      }
      const rear = (sections.length - 1) * 4;
      pushQuad(rear, rear + 2, rear + 3, rear + 1);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setIndex(indices);
      return finishGeometry(geometry);
    };

    const createPectoralFinGeometry = () => {
      const upper = [
        new THREE.Vector3(-0.48, 0.18, 0.49),
        new THREE.Vector3(0.08, 0.1, 0.5),
        new THREE.Vector3(0.5, -0.06, 1.08)
      ];
      const positions = [];
      upper.forEach(point => positions.push(point.x, point.y + 0.014, point.z));
      upper.forEach(point => positions.push(point.x, point.y - 0.014, point.z));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setIndex([
        0, 1, 2,
        5, 4, 3,
        0, 3, 4, 0, 4, 1,
        1, 4, 5, 1, 5, 2,
        2, 5, 3, 2, 3, 0
      ]);
      return finishGeometry(geometry);
    };

    const upperHeadStations = [
      { x: -2.18, mouthY: 0.58, outerY: 0.58, halfDepth: 0.002 },
      { x: -2, mouthY: 0.5, outerY: 0.62, halfDepth: 0.09 },
      { x: -1.82, mouthY: 0.43, outerY: 0.68, halfDepth: 0.18 },
      { x: -1.6, mouthY: 0.31, outerY: 0.76, halfDepth: 0.33 },
      { x: -1.32, mouthY: 0.23, outerY: 0.8, halfDepth: 0.46 },
      { x: -0.98, mouthY: 0.15, outerY: 0.82, halfDepth: 0.57 },
      { x: -0.66, mouthY: 0.08, outerY: 0.8, halfDepth: 0.62 },
      { x: -0.5, mouthY: 0.15, outerY: 0.77, halfDepth: 0.61 }
    ];
    const lowerJawStations = [
      { x: -1.72, mouthY: -0.015, outerY: -0.04, halfDepth: 0.045 },
      { x: -1.55, mouthY: -0.055, outerY: -0.27, halfDepth: 0.25 },
      { x: -1.18, mouthY: -0.065, outerY: -0.46, halfDepth: 0.5 },
      { x: -0.86, mouthY: -0.03, outerY: -0.43, halfDepth: 0.58 },
      { x: -0.62, mouthY: 0.05, outerY: -0.33, halfDepth: 0.61 },
      { x: -0.5, mouthY: 0.15, outerY: -0.25, halfDepth: 0.6 }
    ];
    const bodyStations = [
      { x: -0.34, centerY: 0.21, topRadius: 0.56, bottomRadius: 0.5, halfDepth: 0.61 },
      { x: 0, centerY: 0.2, topRadius: 0.52, bottomRadius: 0.46, halfDepth: 0.57 },
      { x: 0.25, centerY: 0.18, topRadius: 0.46, bottomRadius: 0.4, halfDepth: 0.5 },
      { x: 0.68, centerY: 0.15, topRadius: 0.33, bottomRadius: 0.3, halfDepth: 0.37 },
      { x: 1.02, centerY: 0.11, topRadius: 0.22, bottomRadius: 0.21, halfDepth: 0.24 },
      { x: 1.27, centerY: 0.08, topRadius: 0.12, bottomRadius: 0.12, halfDepth: 0.13 },
      { x: 1.39, centerY: 0.07, topRadius: 0.07, bottomRadius: 0.07, halfDepth: 0.08 }
    ];
    const mouthSections = [
      { x: -1.69, topY: 0.34, bottomY: -0.015, halfDepth: 0.11 },
      { x: -1.5, topY: 0.29, bottomY: -0.055, halfDepth: 0.32 },
      { x: -1.2, topY: 0.22, bottomY: -0.065, halfDepth: 0.49 },
      { x: -0.88, topY: 0.14, bottomY: -0.03, halfDepth: 0.57 },
      { x: -0.62, topY: 0.08, bottomY: 0.05, halfDepth: 0.6 }
    ];

    const integratedBody = new THREE.Mesh(
      createIntegratedUpperBodyGeometry(upperHeadStations, bodyStations),
      bodyMaterial
    );
    integratedBody.name = "icp-shark-role-body";
    integratedBody.castShadow = true;
    integratedBody.receiveShadow = true;

    const mouthGroup = new THREE.Group();
    mouthGroup.name = "icp-shark-role-mouth";
    const lowerJawGroup = new THREE.Group();
    lowerJawGroup.name = "icp-shark-role-lower-jaw";

    const lowerJawShell = new THREE.Mesh(
      createOpenHeadLoftGeometry(lowerJawStations, "lower"),
      bodyMaterial
    );
    lowerJawShell.name = "icp-shark-role-lower-jaw-shell";
    lowerJawShell.castShadow = true;
    lowerJawShell.receiveShadow = true;
    lowerJawGroup.add(lowerJawShell);

    const mouthInterior = new THREE.Mesh(
      createMouthCavityGeometry(mouthSections),
      mouthMaterial
    );
    mouthInterior.name = "icp-shark-role-angular-mouth-cavity";
    mouthInterior.receiveShadow = true;

    const throat = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 18),
      deepMouthMaterial
    );
    throat.name = "icp-shark-role-deep-throat";
    throat.position.set(-0.86, 0.14, -0.08);
    throat.scale.set(0.26, 0.22, 0.38);

    const makeJawCurve = (edge, side, inset = 0) => new THREE.CatmullRomCurve3(
      mouthSections.map(section => new THREE.Vector3(
        section.x + inset,
        edge === "upper" ? section.topY : section.bottomY,
        side * section.halfDepth * 0.96
      ))
    );
    const addGum = (parent, name, curve, radius = 0.017) => {
      const gum = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 52, radius, 8, false),
        gumMaterial
      );
      gum.name = name;
      gum.castShadow = true;
      parent.add(gum);
      return gum;
    };

    const upperNearCurve = makeJawCurve("upper", 1);
    const upperFarCurve = makeJawCurve("upper", -1);
    const lowerNearCurve = makeJawCurve("lower", 1);
    const lowerFarCurve = makeJawCurve("lower", -1);
    const addJawSkinLip = (name, side) => {
      const curve = new THREE.CatmullRomCurve3(
        mouthSections.map(section => new THREE.Vector3(
          section.x,
          section.bottomY - 0.035,
          side * section.halfDepth * 0.985
        ))
      );
      const lip = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 52, 0.043, 9, false),
        jawSkinMaterial
      );
      lip.name = name;
      lip.castShadow = true;
      lowerJawGroup.add(lip);
    };
    addJawSkinLip("icp-shark-role-lower-jaw-lip-near", 1);
    addJawSkinLip("icp-shark-role-lower-jaw-lip-far", -1);
    const frontJawLipPoints = [];
    for (let index = 0; index <= 14; index += 1) {
      const ratio = -1 + index / 7;
      const arch = 1 - ratio ** 2;
      frontJawLipPoints.push(new THREE.Vector3(
        -1.7,
        -0.05 - arch * 0.025,
        ratio * 0.11
      ));
    }
    const frontJawLip = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(frontJawLipPoints),
        36,
        0.043,
        9,
        false
      ),
      jawSkinMaterial
    );
    frontJawLip.name = "icp-shark-role-lower-jaw-lip-front";
    frontJawLip.castShadow = true;
    lowerJawGroup.add(frontJawLip);
    addGum(mouthGroup, "icp-shark-role-upper-gum-near", upperNearCurve);
    addGum(mouthGroup, "icp-shark-role-upper-gum-far", upperFarCurve);
    addGum(lowerJawGroup, "icp-shark-role-lower-gum-near", lowerNearCurve);
    addGum(lowerJawGroup, "icp-shark-role-lower-gum-far", lowerFarCurve);

    const createFrontGumCurve = edge => {
      const points = [];
      for (let index = 0; index <= 14; index += 1) {
        const ratio = -1 + index / 7;
        const arch = 1 - ratio ** 2;
        points.push(new THREE.Vector3(
          -1.695,
          edge === "upper"
            ? 0.34 + arch * 0.035
            : -0.015 - arch * 0.025,
          ratio * 0.11
        ));
      }
      return new THREE.CatmullRomCurve3(points);
    };
    addGum(
      mouthGroup,
      "icp-shark-role-upper-front-gum",
      createFrontGumCurve("upper"),
      0.016
    );
    addGum(
      lowerJawGroup,
      "icp-shark-role-lower-front-gum",
      createFrontGumCurve("lower"),
      0.016
    );

    const toothAxis = new THREE.Vector3(0, 1, 0);
    const addTooth = (parent, name, base, direction, height, radius) => {
      const toothDirection = direction.clone().normalize();
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 3, 1, false, Math.PI / 6),
        toothMaterial
      );
      tooth.name = name;
      tooth.position.copy(base).addScaledVector(toothDirection, height / 2);
      tooth.quaternion.setFromUnitVectors(toothAxis, toothDirection);
      tooth.castShadow = true;
      parent.add(tooth);
    };

    [1, -1].forEach(side => {
      [0.08, 0.23, 0.38, 0.53, 0.68, 0.82].forEach((ratio, index) => {
        const upperBase = (side > 0 ? upperNearCurve : upperFarCurve).getPoint(ratio);
        const lowerBase = (side > 0 ? lowerNearCurve : lowerFarCurve).getPoint(ratio);
        const height = 0.112 - ratio * 0.045;
        addTooth(
          mouthGroup,
          `icp-shark-role-upper-side-tooth-${side > 0 ? "near" : "far"}-${index + 1}`,
          upperBase,
          new THREE.Vector3(0.08, -1, -side * 0.18),
          height,
          height * 0.235
        );
        addTooth(
          lowerJawGroup,
          `icp-shark-role-lower-side-tooth-${side > 0 ? "near" : "far"}-${index + 1}`,
          lowerBase,
          new THREE.Vector3(0.08, 1, -side * 0.16),
          height * 0.92,
          height * 0.22
        );
      });
    });

    [-0.78, -0.52, -0.26, 0, 0.26, 0.52, 0.78].forEach((ratio, index) => {
      const arch = 1 - ratio ** 2;
      addTooth(
        mouthGroup,
        `icp-shark-role-upper-front-tooth-${index + 1}`,
        new THREE.Vector3(-1.7, 0.34 + arch * 0.035, ratio * 0.11),
        new THREE.Vector3(0.2, -1, -ratio * 0.08),
        0.105 - Math.abs(ratio) * 0.012,
        0.025
      );
      addTooth(
        lowerJawGroup,
        `icp-shark-role-lower-front-tooth-${index + 1}`,
        new THREE.Vector3(-1.695, -0.015 - arch * 0.025, ratio * 0.11),
        new THREE.Vector3(0.18, 1, -ratio * 0.08),
        0.094 - Math.abs(ratio) * 0.01,
        0.023
      );
    });
    [-0.66, -0.33, 0, 0.33, 0.66].forEach((ratio, index) => {
      const arch = 1 - ratio ** 2;
      addTooth(
        mouthGroup,
        `icp-shark-role-inner-upper-tooth-${index + 1}`,
        new THREE.Vector3(-1.56, 0.29 + arch * 0.02, ratio * 0.17),
        new THREE.Vector3(0.16, -1, -ratio * 0.06),
        0.072,
        0.017
      );
      addTooth(
        lowerJawGroup,
        `icp-shark-role-inner-lower-tooth-${index + 1}`,
        new THREE.Vector3(-1.55, -0.055 - arch * 0.015, ratio * 0.17),
        new THREE.Vector3(0.14, 1, -ratio * 0.06),
        0.066,
        0.016
      );
    });

    mouthGroup.add(mouthInterior, throat, lowerJawGroup);

    const dorsalFin = new THREE.Mesh(
      createExtrudedPolygonGeometry([
        [-0.3, 0.68],
        [0.07, 1.31],
        [0.47, 0.58]
      ], 0.14),
      finMaterial
    );
    dorsalFin.name = "icp-shark-role-dorsal-fin";
    dorsalFin.castShadow = true;

    const pectoralFin = new THREE.Mesh(
      createPectoralFinGeometry(),
      finMaterial
    );
    pectoralFin.name = "icp-shark-role-near-pectoral-fin";
    pectoralFin.castShadow = true;

    const tailPivot = new THREE.Group();
    tailPivot.name = "icp-shark-role-tail-pivot";
    tailPivot.position.set(1.34, 0.07, 0);
    const tail = new THREE.Mesh(
      createExtrudedPolygonGeometry([
        [-0.08, 0.09],
        [0.08, 0.08],
        [0.58, 0.64],
        [0.5, 0.14],
        [0.78, 0.02],
        [0.5, -0.11],
        [0.58, -0.57],
        [0.08, -0.08],
        [-0.08, -0.08]
      ], 0.2),
      finMaterial
    );
    tail.name = "icp-shark-role-tail";
    tail.castShadow = true;
    tailPivot.add(tail);

    [
      {
        name: "near",
        z: 0.535,
        highlightZ: 0.556,
        eyeScale: 1,
        highlightScale: 0.006
      },
      {
        name: "far",
        z: -0.535,
        highlightZ: -0.556,
        eyeScale: 1,
        highlightScale: 0.006
      }
    ].forEach(({ name, z, highlightZ, eyeScale, highlightScale }) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 14),
        eyeMaterial
      );
      eye.name = `icp-shark-role-eye-${name}`;
      eye.position.set(-1.08, 0.56, z);
      eye.scale.set(
        0.036 * eyeScale,
        0.042 * eyeScale,
        0.018 * eyeScale
      );
      eye.castShadow = false;
      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 8),
        eyeHighlightMaterial
      );
      highlight.name = `icp-shark-role-eye-highlight-${name}`;
      highlight.position.set(-1.095, 0.583, highlightZ);
      highlight.scale.setScalar(highlightScale);
      group.add(eye, highlight);
    });

    const nostril = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      gillMaterial
    );
    nostril.name = "icp-shark-role-nostril-near";
    nostril.position.set(-1.72, 0.455, 0.21);
    nostril.scale.set(0.006, 0.007, 0.004);
    nostril.castShadow = false;
    group.add(nostril);

    [-0.46, -0.33, -0.2].forEach((x, index) => {
      const gillCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x - 0.02, 0.46, 0.585),
        new THREE.Vector3(x - 0.045, 0.27, 0.61),
        new THREE.Vector3(x, 0.06, 0.58)
      ]);
      const gill = new THREE.Mesh(
        new THREE.TubeGeometry(gillCurve, 20, 0.01, 7, false),
        gillMaterial
      );
      gill.name = `icp-shark-role-gill-${index + 1}`;
      group.add(gill);
    });

    group.add(
      integratedBody,
      mouthGroup,
      dorsalFin,
      pectoralFin,
      tailPivot
    );
    const fadeMaterials = [];
    group.traverse(node => {
      const nodeMaterials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      nodeMaterials.filter(Boolean).forEach(material => {
        if (fadeMaterials.some(record => record.material === material)) return;
        fadeMaterials.push({
          material,
          baseOpacity: material.opacity,
          baseTransparent: material.transparent,
          baseDepthWrite: material.depthWrite
        });
      });
    });
    this.scene.add(group);
    this.sharkMechanism = {
      variant: "large",
      slotIndex: 1,
      scale: 1,
      group,
      tailPivot,
      mouthGroup,
      mouthInterior,
      mouthMaterial,
      lowerJawGroup,
      fadeMaterials,
      chompTimer: 0,
      suctionActive: false,
      mouthLocal: {
        x: SHARK_ROLE_MOUTH_LOCAL_X,
        y: SHARK_ROLE_MOUTH_LOCAL_Y,
        z: SHARK_ROLE_MOUTH_LOCAL_Z
      },
      bodyHalfDepth: 0.62,
      pusherClearance: (
        NEXT_ROLE_RAIL_Z - 0.62
        - (PUSHER_BODY_NEAREST_Z + PUSHER_PLATE_FRONT_OFFSET_Z)
      )
    };
    this.smallSharkMechanism = this.createSmallSharkMechanism(
      this.sharkMechanism
    );
    this.sharkMechanisms = [
      this.sharkMechanism,
      this.smallSharkMechanism
    ];
  }

  createSmallSharkMechanism(sourceShark) {
    const group = sourceShark.group.clone(true);
    group.name = "icp-small-shark-role";
    group.scale.setScalar(SMALL_SHARK_ROLE_SCALE);
    group.visible = false;
    group.traverse(node => {
      if (node !== group && node.name.startsWith("icp-shark-role")) {
        node.name = node.name.replace(
          "icp-shark-role",
          "icp-small-shark-role"
        );
      }
      if (Array.isArray(node.material)) {
        node.material = node.material.map(material => material.clone());
      } else if (node.material) {
        node.material = node.material.clone();
      }
    });
    const tailPivot = group.getObjectByName("icp-small-shark-role-tail-pivot");
    const mouthGroup = group.getObjectByName("icp-small-shark-role-mouth");
    const mouthInterior = group.getObjectByName(
      "icp-small-shark-role-angular-mouth-cavity"
    );
    const lowerJawGroup = group.getObjectByName(
      "icp-small-shark-role-lower-jaw"
    );
    const fadeMaterials = [];
    group.traverse(node => {
      const nodeMaterials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      nodeMaterials.filter(Boolean).forEach(material => {
        if (fadeMaterials.some(record => record.material === material)) return;
        fadeMaterials.push({
          material,
          baseOpacity: material.opacity,
          baseTransparent: material.transparent,
          baseDepthWrite: material.depthWrite
        });
      });
    });
    this.scene.add(group);
    return {
      variant: "small",
      slotIndex: 0,
      scale: SMALL_SHARK_ROLE_SCALE,
      group,
      tailPivot,
      mouthGroup,
      mouthInterior,
      mouthMaterial: mouthInterior.material,
      lowerJawGroup,
      fadeMaterials,
      chompTimer: 0,
      suctionActive: false,
      mouthLocal: {
        x: SHARK_ROLE_MOUTH_LOCAL_X,
        y: SHARK_ROLE_MOUTH_LOCAL_Y,
        z: SHARK_ROLE_MOUTH_LOCAL_Z
      },
      bodyHalfDepth: sourceShark.bodyHalfDepth * SMALL_SHARK_ROLE_SCALE,
      pusherClearance: (
        NEXT_ROLE_RAIL_Z
        - sourceShark.bodyHalfDepth * SMALL_SHARK_ROLE_SCALE
        - (PUSHER_BODY_NEAREST_Z + PUSHER_PLATE_FRONT_OFFSET_Z)
      )
    };
  }

  createRejectedSharkMechanismStep76() {
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0x102f3a,
      emissiveIntensity: 0.045,
      metalness: 0.03,
      roughness: 0.5,
      clearcoat: 0.3,
      clearcoatRoughness: 0.36
    });
    const finMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x24566f,
      emissive: 0x0d2832,
      emissiveIntensity: 0.05,
      metalness: 0.03,
      roughness: 0.56,
      clearcoat: 0.22
    });
    const mouthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x260b10,
      emissive: 0x35080d,
      emissiveIntensity: 0.08,
      metalness: 0.02,
      roughness: 0.78,
      side: THREE.DoubleSide
    });
    const gumMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x72262e,
      emissive: 0x28070b,
      emissiveIntensity: 0.06,
      metalness: 0.02,
      roughness: 0.58,
      clearcoat: 0.2
    });
    const deepMouthMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x100407,
      emissive: 0x25070b,
      emissiveIntensity: 0.04,
      metalness: 0,
      roughness: 0.86
    });
    const eyeInkMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x071116,
      emissive: 0x02080a,
      emissiveIntensity: 0.08,
      metalness: 0.04,
      roughness: 0.34,
      clearcoat: 0.54
    });
    const eyeHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xe7f3f1
    });
    const toothMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4efe0,
      emissive: 0x5e5848,
      emissiveIntensity: 0.05,
      metalness: 0.02,
      roughness: 0.44,
      clearcoat: 0.2
    });
    const gillMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x294955,
      emissive: 0x0a1c22,
      emissiveIntensity: 0.05,
      metalness: 0.02,
      roughness: 0.68
    });

    const group = new THREE.Group();
    group.name = "icp-shark-role";
    group.position.set(SHARK_ROLE_START_X, SHARK_ROLE_BASE_Y, NEXT_ROLE_RAIL_Z);
    group.rotation.y = 0.3;
    group.visible = false;

    // One continuous tapered surface keeps the head, torso, and tail stock anatomical.
    const bodyProfile = [
      { x: -1.43, y: 0.13, radiusY: 0.41, radiusZ: 0.47 },
      { x: -1.25, y: 0.14, radiusY: 0.52, radiusZ: 0.57 },
      { x: -0.88, y: 0.15, radiusY: 0.57, radiusZ: 0.61 },
      { x: -0.3, y: 0.15, radiusY: 0.47, radiusZ: 0.51 },
      { x: 0.35, y: 0.13, radiusY: 0.36, radiusZ: 0.41 },
      { x: 0.82, y: 0.1, radiusY: 0.24, radiusZ: 0.27 },
      { x: 1.12, y: 0.075, radiusY: 0.17, radiusZ: 0.19 },
      { x: 1.29, y: 0.06, radiusY: 0.105, radiusZ: 0.12 }
    ];
    const bodyRingSegments = 40;
    const mouthOutlineControls = [
      new THREE.Vector3(0, 0.31, 0),
      new THREE.Vector3(0, 0.26, 0.2),
      new THREE.Vector3(0, 0.17, 0.34),
      new THREE.Vector3(0, 0, 0.35),
      new THREE.Vector3(0, -0.16, 0.22),
      new THREE.Vector3(0, -0.24, 0),
      new THREE.Vector3(0, -0.16, -0.22),
      new THREE.Vector3(0, 0, -0.35),
      new THREE.Vector3(0, 0.17, -0.34),
      new THREE.Vector3(0, 0.26, -0.2)
    ];
    const mouthOutlinePoints = [];
    mouthOutlineControls.forEach((point, index) => {
      const next = mouthOutlineControls[(index + 1) % mouthOutlineControls.length];
      for (let step = 0; step < 4; step += 1) {
        mouthOutlinePoints.push(
          new THREE.Vector3().lerpVectors(point, next, step / 4)
        );
      }
    });
    const bodyPositions = [];
    const bodyColors = [];
    const bodyIndices = [];
    const dorsalBodyColor = new THREE.Color(0x2f6c87);
    const ventralBodyColor = new THREE.Color(0xd7e2e0);
    bodyProfile.forEach((profile) => {
      for (let segment = 0; segment < bodyRingSegments; segment += 1) {
        const angle = segment / bodyRingSegments * Math.PI * 2;
        const vertical = Math.cos(angle);
        bodyPositions.push(
          profile.x,
          profile.y + vertical * profile.radiusY,
          Math.sin(angle) * profile.radiusZ
        );
        const dorsalBlend = clamp((vertical + 0.72) / 0.42, 0, 1);
        const vertexColor = new THREE.Color().lerpColors(
          ventralBodyColor,
          dorsalBodyColor,
          dorsalBlend
        );
        bodyColors.push(vertexColor.r, vertexColor.g, vertexColor.b);
      }
    });
    for (let ring = 0; ring < bodyProfile.length - 1; ring += 1) {
      for (let segment = 0; segment < bodyRingSegments; segment += 1) {
        const nextSegment = (segment + 1) % bodyRingSegments;
        const a = ring * bodyRingSegments + segment;
        const b = ring * bodyRingSegments + nextSegment;
        const c = (ring + 1) * bodyRingSegments + nextSegment;
        const d = (ring + 1) * bodyRingSegments + segment;
        bodyIndices.push(a, b, c, a, c, d);
      }
    }
    const mouthRingOffset = bodyPositions.length / 3;
    for (let segment = 0; segment < bodyRingSegments; segment += 1) {
      const mouthPoint = mouthOutlinePoints[segment];
      const vertical = clamp(mouthPoint.y / 0.3, -1, 1);
      bodyPositions.push(
        -1.445,
        SHARK_ROLE_MOUTH_LOCAL_Y + mouthPoint.y,
        SHARK_ROLE_MOUTH_LOCAL_Z + mouthPoint.z
      );
      const faceBlend = clamp((vertical + 0.35) / 0.8, 0, 1);
      const faceColor = new THREE.Color().lerpColors(
        ventralBodyColor,
        dorsalBodyColor,
        faceBlend
      );
      bodyColors.push(faceColor.r, faceColor.g, faceColor.b);
    }
    const rearProfile = bodyProfile[bodyProfile.length - 1];
    const rearCenterIndex = bodyPositions.length / 3;
    bodyPositions.push(rearProfile.x, rearProfile.y, 0);
    bodyColors.push(dorsalBodyColor.r, dorsalBodyColor.g, dorsalBodyColor.b);
    for (let segment = 0; segment < bodyRingSegments; segment += 1) {
      const nextSegment = (segment + 1) % bodyRingSegments;
      bodyIndices.push(
        segment,
        mouthRingOffset + nextSegment,
        nextSegment,
        segment,
        mouthRingOffset + segment,
        mouthRingOffset + nextSegment
      );
      const rearRingOffset = (bodyProfile.length - 1) * bodyRingSegments;
      bodyIndices.push(
        rearCenterIndex,
        rearRingOffset + segment,
        rearRingOffset + nextSegment
      );
    }
    const bodyGeometry = new THREE.BufferGeometry();
    bodyGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(bodyPositions, 3)
    );
    bodyGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(bodyColors, 3)
    );
    bodyGeometry.setIndex(bodyIndices);
    bodyGeometry.computeVertexNormals();
    bodyGeometry.computeBoundingBox();
    bodyGeometry.computeBoundingSphere();

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.name = "icp-shark-role-body";
    body.castShadow = true;
    body.receiveShadow = true;

    const dorsalFin = new THREE.Mesh(
      createExtrudedPolygonGeometry([
        [-0.38, 0.48],
        [0.01, 1.02],
        [0.45, 0.45]
      ], 0.16),
      finMaterial
    );
    dorsalFin.name = "icp-shark-role-dorsal-fin";
    dorsalFin.castShadow = true;

    const tailPivot = new THREE.Group();
    tailPivot.name = "icp-shark-role-tail-pivot";
    tailPivot.position.set(1.24, 0.055, 0);
    const tail = new THREE.Mesh(
      createExtrudedPolygonGeometry([
        [-0.04, 0.1],
        [0.12, 0.1],
        [0.68, 0.64],
        [0.54, 0.14],
        [0.82, -0.01],
        [0.54, -0.14],
        [0.68, -0.58],
        [0.12, -0.1],
        [-0.04, -0.08]
      ], 0.22),
      finMaterial
    );
    tail.name = "icp-shark-role-tail";
    tail.castShadow = true;
    tailPivot.add(tail);

    const sideFin = new THREE.Mesh(
      createExtrudedPolygonGeometry([
        [-0.52, 0.15],
        [-0.16, 0.05],
        [0.56, -0.14],
        [0.2, 0.29]
      ], 0.085),
      finMaterial
    );
    sideFin.name = "icp-shark-role-side-fin";
    sideFin.position.set(-0.03, 0.04, 0.515);
    sideFin.rotation.z = -0.08;
    sideFin.castShadow = true;

    const mouthGroup = new THREE.Group();
    mouthGroup.name = "icp-shark-role-mouth";
    mouthGroup.position.set(
      SHARK_ROLE_MOUTH_LOCAL_X,
      SHARK_ROLE_MOUTH_LOCAL_Y,
      SHARK_ROLE_MOUTH_LOCAL_Z
    );
    const mouthTunnelSections = [
      { x: 0.045, scaleY: 1, scaleZ: 1 },
      { x: 0.17, scaleY: 0.88, scaleZ: 0.9 },
      { x: 0.36, scaleY: 0.58, scaleZ: 0.62 },
      { x: 0.55, scaleY: 0.28, scaleZ: 0.3 }
    ];
    const mouthTunnelPositions = [];
    const mouthTunnelIndices = [];
    mouthTunnelSections.forEach((section) => {
      mouthOutlinePoints.forEach((point) => {
        mouthTunnelPositions.push(
          section.x,
          point.y * section.scaleY,
          point.z * section.scaleZ
        );
      });
    });
    for (let section = 0; section < mouthTunnelSections.length - 1; section += 1) {
      for (let segment = 0; segment < mouthOutlinePoints.length; segment += 1) {
        const nextSegment = (segment + 1) % mouthOutlinePoints.length;
        const a = section * mouthOutlinePoints.length + segment;
        const b = section * mouthOutlinePoints.length + nextSegment;
        const c = (section + 1) * mouthOutlinePoints.length + nextSegment;
        const d = (section + 1) * mouthOutlinePoints.length + segment;
        mouthTunnelIndices.push(a, c, b, a, d, c);
      }
    }
    const mouthTunnelGeometry = new THREE.BufferGeometry();
    mouthTunnelGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(mouthTunnelPositions, 3)
    );
    mouthTunnelGeometry.setIndex(mouthTunnelIndices);
    mouthTunnelGeometry.computeVertexNormals();
    mouthTunnelGeometry.computeBoundingBox();
    mouthTunnelGeometry.computeBoundingSphere();
    const mouthInterior = new THREE.Mesh(
      mouthTunnelGeometry,
      mouthMaterial
    );
    mouthInterior.name = "icp-shark-role-mouth-cavity";

    const throat = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      deepMouthMaterial
    );
    throat.name = "icp-shark-role-throat";
    throat.position.set(0.565, 0.015, 0);
    throat.scale.set(0.026, 0.06, 0.08);

    const lowerJawGroup = new THREE.Group();
    lowerJawGroup.name = "icp-shark-role-lower-jaw";

    const createJawCurve = (upper, xOffset) => {
      const points = [];
      for (let index = 0; index <= 18; index += 1) {
        const ratio = -1 + index / 9;
        const curve = 1 - ratio ** 2;
        points.push(new THREE.Vector3(
          xOffset + curve * 0.025,
          upper ? 0.19 + 0.12 * curve : -0.15 - 0.09 * curve,
          ratio * (upper ? 0.34 : 0.215)
        ));
      }
      return new THREE.CatmullRomCurve3(points);
    };
    const upperGum = new THREE.Mesh(
      new THREE.TubeGeometry(
        createJawCurve(true, 0.035),
        48,
        0.018,
        9,
        false
      ),
      gumMaterial
    );
    upperGum.name = "icp-shark-role-upper-gum";
    const lowerGum = new THREE.Mesh(
      new THREE.TubeGeometry(
        createJawCurve(false, 0.035),
        48,
        0.018,
        9,
        false
      ),
      gumMaterial
    );
    lowerGum.name = "icp-shark-role-lower-gum";
    lowerJawGroup.add(lowerGum);

    const toothAxis = new THREE.Vector3(0, 1, 0);
    const addTooth = (parent, name, base, direction, height, radius) => {
      const toothDirection = direction.clone().normalize();
      const tooth = new THREE.Mesh(
        new THREE.ConeGeometry(radius, height, 10),
        toothMaterial
      );
      tooth.name = name;
      tooth.position.copy(base).addScaledVector(toothDirection, height / 2);
      tooth.quaternion.setFromUnitVectors(toothAxis, toothDirection);
      tooth.castShadow = true;
      parent.add(tooth);
    };
    [-0.92, -0.69, -0.46, -0.23, 0, 0.23, 0.46, 0.69, 0.92].forEach((ratio, index) => {
      const curve = 1 - ratio ** 2;
      const height = 0.115 - Math.abs(ratio) * 0.014;
      addTooth(
        mouthGroup,
        `icp-shark-role-upper-tooth-${index + 1}`,
        new THREE.Vector3(0.025, 0.19 + 0.12 * curve, ratio * 0.34),
        new THREE.Vector3(0.3, -1, -ratio * 0.18),
        height,
        0.028
      );
    });
    [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9].forEach((ratio, index) => {
      const curve = 1 - ratio ** 2;
      addTooth(
        lowerJawGroup,
        `icp-shark-role-lower-tooth-${index + 1}`,
        new THREE.Vector3(0.025, -0.15 - 0.09 * curve, ratio * 0.215),
        new THREE.Vector3(0.28, 1, -ratio * 0.14),
        0.1,
        0.027
      );
    });
    [-0.78, -0.52, -0.26, 0, 0.26, 0.52, 0.78].forEach((ratio, index) => {
      const curve = 1 - ratio ** 2;
      addTooth(
        mouthGroup,
        `icp-shark-role-inner-upper-tooth-${index + 1}`,
        new THREE.Vector3(0.17, 0.15 + 0.09 * curve, ratio * 0.26),
        new THREE.Vector3(0.28, -1, -ratio * 0.13),
        0.072,
        0.02
      );
    });
    [-0.72, -0.36, 0, 0.36, 0.72].forEach((ratio, index) => {
      const curve = 1 - ratio ** 2;
      addTooth(
        lowerJawGroup,
        `icp-shark-role-inner-lower-tooth-${index + 1}`,
        new THREE.Vector3(0.17, -0.12 - 0.07 * curve, ratio * 0.16),
        new THREE.Vector3(0.26, 1, -ratio * 0.11),
        0.066,
        0.019
      );
    });
    mouthGroup.add(
      mouthInterior,
      throat,
      upperGum,
      lowerJawGroup
    );

    [
      { name: "far", z: -0.505, highlightZ: -0.526 },
      { name: "near", z: 0.535, highlightZ: 0.557 }
    ].forEach(({ name, z, highlightZ }) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), eyeInkMaterial);
      eye.name = `icp-shark-role-eye-${name}`;
      eye.position.set(-1.08, 0.43, z);
      eye.scale.set(0.052, 0.064, 0.025);
      eye.castShadow = true;
      const highlight = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 8),
        eyeHighlightMaterial
      );
      highlight.name = `icp-shark-role-eye-highlight-${name}`;
      highlight.position.set(-1.082, 0.454, highlightZ);
      highlight.scale.setScalar(0.012);
      group.add(eye, highlight);
    });

    const nostrils = new THREE.Group();
    nostrils.name = "icp-shark-role-nostrils";
    [-0.19, 0.19].forEach((z, index) => {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(1, 14, 10),
        eyeInkMaterial
      );
      nostril.name = `icp-shark-role-nostril-${index + 1}`;
      nostril.position.set(-1.448, 0.315, z);
      nostril.scale.set(0.012, 0.018, 0.022);
      nostrils.add(nostril);
    });

    [-0.62, -0.48, -0.34].forEach((x, index) => {
      const gillCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x - 0.015, 0.31, 0.545),
        new THREE.Vector3(x - 0.035, 0.18, 0.56),
        new THREE.Vector3(x, 0.045, 0.535)
      ]);
      const gill = new THREE.Mesh(
        new THREE.TubeGeometry(gillCurve, 18, 0.012, 7, false),
        gillMaterial
      );
      gill.name = `icp-shark-role-gill-${index + 1}`;
      group.add(gill);
    });

    group.add(
      body,
      dorsalFin,
      tailPivot,
      sideFin,
      mouthGroup,
      nostrils
    );
    this.scene.add(group);
    this.sharkMechanism = {
      group,
      tailPivot,
      mouthGroup,
      mouthInterior,
      mouthMaterial,
      lowerJawGroup,
      chompTimer: 0,
      suctionActive: false,
      mouthLocal: {
        x: SHARK_ROLE_MOUTH_LOCAL_X,
        y: SHARK_ROLE_MOUTH_LOCAL_Y,
        z: SHARK_ROLE_MOUTH_LOCAL_Z
      },
      bodyHalfDepth: 0.58,
      pusherClearance: (
        NEXT_ROLE_RAIL_Z - 0.58
        - (PUSHER_BODY_NEAREST_Z + PUSHER_PLATE_FRONT_OFFSET_Z)
      )
    };
  }

  updateSharkMechanism(delta) {
    const sharks = this.sharkMechanisms.filter(Boolean);
    if (sharks.length === 0) return;
    let incomingSharkActive = false;
    sharks.forEach(shark => {
      const travel = alternatingSharkRoleTravelStateAt(
        this.elapsed,
        shark.slotIndex,
        shark.scale
      );
      this.updateSingleSharkMechanism(shark, travel, delta);
      if (travel.phase === "incoming") {
        incomingSharkActive = true;
        this.applySharkSuction(delta, travel.velocityX, shark);
      }
      shark.mouthMaterial.emissiveIntensity = 0.08
        + (shark.suctionActive ? 0.06 : 0)
        + shark.chompProgress * 0.08;
    });
    if (!incomingSharkActive) {
      this.tableCoins.forEach(coin => {
        coin.sharkMouthEntryArmed = false;
      });
    }
    this.updateSharkEatenCoins(delta);
  }

  updateDangerRoomIllumination(state) {
    const warning = this.sharkDangerWarning;
    const lighting = this.environmentLighting;
    if (!warning || !lighting) return;
    this.renderer.toneMappingExposure = NORMAL_ROOM_EXPOSURE;
    this.scene.background.copy(lighting.background);
    this.scene.fog.color.copy(lighting.fog);
    lighting.ambient.light.intensity = lighting.ambient.intensity;
    lighting.ambient.light.color.copy(lighting.ambient.color);
    lighting.ambient.light.groundColor.copy(lighting.ambient.groundColor);
    ["key", "cyan", "magenta"].forEach(name => {
      lighting[name].light.intensity = lighting[name].intensity;
      lighting[name].light.color.copy(lighting[name].color);
    });

    const overlay = this.els.dangerRoomOverlay;
    if (!state.active || !this.effectPreferences.dangerIllumination) {
      this.els.canvas.style.filter = "";
      overlay.style.backgroundColor = "transparent";
      overlay.style.opacity = "0";
      return;
    }

    const colors = warning.roomColors[state.variant];
    const tint = warning.roomTint
      .copy(colors.dark)
      .lerp(colors.bright, state.illumination);
    const brightness = lerp(
      SHARK_DANGER_ROOM_DARKNESS,
      SHARK_DANGER_ROOM_BRIGHTNESS,
      state.illumination
    );
    const overlayOpacity = lerp(
      SHARK_DANGER_ROOM_DARK_OVERLAY_OPACITY,
      SHARK_DANGER_ROOM_BRIGHT_OVERLAY_OPACITY,
      state.illumination
    );
    this.els.canvas.style.filter = `brightness(${brightness.toFixed(3)})`;
    overlay.style.backgroundColor = `#${tint.getHexString()}`;
    overlay.style.opacity = overlayOpacity.toFixed(3);
  }

  updateDangerScreenShake(state) {
    const stage = this.els.stage;
    if (!stage) return;
    const sharkElapsed = this.elapsed - state.appearanceTime;
    const largeSharkShaking = (
      this.effectPreferences.sharkShake
      && state.active
      && state.variant === "large"
      && state.phase === "shark-active"
      && sharkElapsed >= SHARK_DANGER_LARGE_SHAKE_START_DELAY_SECONDS
      && sharkElapsed < SHARK_ROLE_TURN_SECONDS
    );
    if (!largeSharkShaking) {
      this.clearDangerScreenShake();
      return;
    }
    const shakeElapsed = (
      sharkElapsed - SHARK_DANGER_LARGE_SHAKE_START_DELAY_SECONDS
    );
    const rampIn = clamp(
      shakeElapsed / SHARK_DANGER_LARGE_SHAKE_RAMP_IN_SECONDS,
      0,
      1
    );
    const rampOut = clamp(
      (SHARK_ROLE_TURN_SECONDS - sharkElapsed)
        / SHARK_DANGER_LARGE_SHAKE_RAMP_OUT_SECONDS,
      0,
      1
    );
    const strength = Math.min(rampIn, rampOut)
      * SHARK_DANGER_LARGE_SHAKE_STRENGTH;
    const x = (
      Math.sin(shakeElapsed * 39.5) * 3.8
      + Math.sin(shakeElapsed * 63.7 + 0.8) * 1.8
    ) * strength;
    const y = (
      Math.sin(shakeElapsed * 52.3 + 1.4) * 1.8
      + Math.sin(shakeElapsed * 31.1) * 0.9
    ) * strength;
    stage.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    stage.style.transformOrigin = "center center";
    stage.style.willChange = "transform";
    stage.dataset.dangerContinuousShake = "true";
  }

  clearDangerScreenShake() {
    const stage = this.els?.stage;
    if (!stage || stage.dataset.dangerContinuousShake !== "true") return;
    stage.style.transform = "";
    stage.style.transformOrigin = "";
    stage.style.willChange = "";
    delete stage.dataset.dangerContinuousShake;
  }

  updateSharkDangerWarning() {
    const warning = this.sharkDangerWarning;
    if (!warning) return;
    const state = sharkDangerWarningStateAt(this.elapsed);
    warning.mesh.userData.dangerState = state;
    warning.textMesh.userData.dangerState = state;
    warning.mesh.visible = state.active;
    warning.textMesh.visible = state.active;
    const darkColor = warning.darkColors[state.variant];
    warning.material.color.copy(darkColor).lerp(warning.brightColor, state.illumination);
    warning.material.opacity = lerp(
      SHARK_DANGER_PANEL_DARK_OPACITY,
      SHARK_DANGER_PANEL_BRIGHT_OPACITY,
      state.illumination
    );
    warning.textMaterial.color.copy(darkColor).lerp(warning.brightColor, state.illumination);
    warning.textMaterial.opacity = state.textOpacity * lerp(
      SHARK_DANGER_TEXT_DARK_BRIGHTNESS,
      1,
      state.illumination
    );
    this.updateDangerRoomIllumination(state);
    this.updateDangerScreenShake(state);
    if (!state.active || warning.currentVariant === state.variant) return;
    warning.currentVariant = state.variant;
    warning.material.map = warning.textures[state.variant];
    warning.textMaterial.map = warning.textTextures[state.variant];
    warning.material.needsUpdate = true;
    warning.textMaterial.needsUpdate = true;
  }

  updateSingleSharkMechanism(shark, travel, delta) {
    const sharkOpacity = clamp(travel.opacity, 0, 1);
    const hasEatenCoin = this.sharkEatenCoins.some(
      coin => coin.shark === shark
    );
    shark.group.visible = (
      (travel.active && sharkOpacity > 0.001)
      || hasEatenCoin
    );
    shark.group.position.x = travel.x;
    shark.group.position.y = travel.y
      + (
        travel.phase === "incoming"
          ? Math.sin(travel.progress * Math.PI * 4) * 0.012
          : 0
      );
    shark.group.position.z = travel.z;
    shark.group.rotation.y = travel.yaw;
    shark.group.rotation.z = travel.roll;
    shark.fadeMaterials.forEach(record => {
      const fading = sharkOpacity < 0.999;
      const transparent = record.baseTransparent || fading;
      const depthWrite = fading ? false : record.baseDepthWrite;
      if (
        record.material.transparent !== transparent
        || record.material.depthWrite !== depthWrite
      ) {
        record.material.transparent = transparent;
        record.material.depthWrite = depthWrite;
        record.material.needsUpdate = true;
      }
      record.material.opacity = record.baseOpacity * sharkOpacity;
    });
    shark.tailPivot.rotation.y = travel.active ? Math.sin(this.elapsed * 6.2) * 0.24 : 0;

    shark.chompTimer = Math.max(0, shark.chompTimer - delta);
    shark.chompProgress = shark.chompTimer > 0
      ? Math.sin((shark.chompTimer / SHARK_ROLE_EAT_ANIMATION_SECONDS) * Math.PI)
      : 0;
    shark.mouthGroup.scale.set(1, 1, 1);
    shark.lowerJawGroup.position.y = shark.chompProgress * 0.075;
    shark.lowerJawGroup.rotation.z = -shark.chompProgress * 0.08;
    shark.suctionActive = false;
    shark.travel = travel;
  }

  applySharkSuction(delta, sharkVelocityX, shark = this.sharkMechanism) {
    if (!shark) return;
    const scale = shark.scale || 1;
    const yawCos = Math.cos(shark.group.rotation.y);
    const yawSin = Math.sin(shark.group.rotation.y);
    const mouthLocalX = SHARK_ROLE_MOUTH_LOCAL_X * scale;
    const mouthLocalY = SHARK_ROLE_MOUTH_LOCAL_Y * scale;
    const mouthLocalZ = SHARK_ROLE_MOUTH_LOCAL_Z * scale;
    const mouthX = shark.group.position.x
      + mouthLocalX * yawCos
      + mouthLocalZ * yawSin;
    const mouthY = shark.group.position.y + mouthLocalY;
    const mouthZ = shark.group.position.z
      - mouthLocalX * yawSin
      + mouthLocalZ * yawCos;
    const suctionForwardReach = Math.max(
      SHARK_ROLE_SUCTION_FORWARD_REACH * scale,
      TABLE_COIN_RADIUS * 1.15
    );
    const suctionRearReach = Math.max(
      SHARK_ROLE_SUCTION_REAR_REACH * scale,
      TABLE_COIN_RADIUS * 0.6
    );
    const suctionHalfDepth = Math.max(
      SHARK_ROLE_SUCTION_HALF_DEPTH * scale,
      TABLE_COIN_RADIUS * 1.1
    );
    const mouthArmX = SHARK_ROLE_MOUTH_ARM_X * scale;
    const captureMinX = SHARK_ROLE_CAPTURE_MIN_X * scale;
    const captureMaxX = Math.max(
      SHARK_ROLE_CAPTURE_MAX_X * scale,
      TABLE_COIN_RADIUS * 0.38
    );
    const captureMinZ = -Math.max(
      Math.abs(SHARK_ROLE_CAPTURE_MIN_Z) * scale,
      TABLE_COIN_RADIUS * 0.32
    );
    const captureMaxZ = Math.max(
      SHARK_ROLE_CAPTURE_MAX_Z * scale,
      TABLE_COIN_RADIUS * 0.32
    );
    const captureApertureMinY = SHARK_ROLE_CAPTURE_APERTURE_MIN_Y * scale;
    const captureApertureMaxY = SHARK_ROLE_CAPTURE_APERTURE_MAX_Y * scale;
    for (let index = this.tableCoins.length - 1; index >= 0; index -= 1) {
      const coin = this.tableCoins[index];
      if (!coin?.body || coin.collected || coin.payoutChuteGuideActive) continue;
      const body = coin.body;
      const relativeX = body.position.x - mouthX;
      const relativeY = body.position.y - mouthY;
      const relativeZ = body.position.z - mouthZ;
      if (
        relativeX < -suctionForwardReach
        || relativeX > suctionRearReach
        || Math.abs(relativeZ) > suctionHalfDepth
        || body.position.y < TABLE_TOP_Y - 0.08
        || body.position.y > SHARK_ROLE_CAPTURE_MAX_WORLD_Y
      ) {
        coin.sharkMouthEntryArmed = false;
        continue;
      }
      if (relativeX <= mouthArmX) {
        coin.sharkMouthEntryArmed = true;
      }
      const coinRadius = coin.radius || TABLE_COIN_RADIUS;
      const overlapsMouthApertureY = (
        relativeY + coinRadius >= captureApertureMinY
        && relativeY - coinRadius <= captureApertureMaxY
      );
      // The rail line is never a trigger; remove only after a coin crosses into the mouth cavity.
      if (
        coin.sharkMouthEntryArmed
        && relativeX >= captureMinX
        && relativeX <= captureMaxX
        && relativeZ >= captureMinZ
        && relativeZ <= captureMaxZ
        && overlapsMouthApertureY
      ) {
        this.captureTableCoinByShark(index, shark);
        continue;
      }

      const xReach = relativeX < 0
        ? suctionForwardReach
        : suctionRearReach;
      const edgeRatio = Math.max(
        Math.abs(relativeX) / xReach,
        Math.abs(relativeZ) / suctionHalfDepth
      );
      const suctionStrength = clamp(1 - edgeRatio * 0.55, 0.38, 1);
      const accelerationX = clamp(
        (mouthX - body.position.x) * SHARK_ROLE_SUCTION_X_STIFFNESS
          + (sharkVelocityX - body.velocity.x) * SHARK_ROLE_SUCTION_X_DAMPING,
        -SHARK_ROLE_SUCTION_MAX_ACCELERATION,
        SHARK_ROLE_SUCTION_MAX_ACCELERATION
      );
      const accelerationZ = clamp(
        (mouthZ - body.position.z) * SHARK_ROLE_SUCTION_Z_STIFFNESS
          - body.velocity.z * SHARK_ROLE_SUCTION_Z_DAMPING,
        -SHARK_ROLE_SUCTION_MAX_ACCELERATION,
        SHARK_ROLE_SUCTION_MAX_ACCELERATION
      );
      const accelerationY = clamp(
        (mouthY - body.position.y) * SHARK_ROLE_SUCTION_Y_STIFFNESS
          - body.velocity.y * SHARK_ROLE_SUCTION_Y_DAMPING,
        -SHARK_ROLE_SUCTION_MAX_ACCELERATION,
        SHARK_ROLE_SUCTION_MAX_ACCELERATION
      );
      body.velocity.x += accelerationX * suctionStrength * delta;
      body.velocity.y += accelerationY * suctionStrength * delta;
      body.velocity.z += accelerationZ * suctionStrength * delta;
      body.angularVelocity.z += (mouthZ - body.position.z) * delta * 8;
      body.aabbNeedsUpdate = true;
      body.wakeUp();
      shark.suctionActive = true;
    }
  }

  captureTableCoinByShark(index, shark = this.sharkMechanism) {
    const coin = this.tableCoins[index];
    if (!coin || coin.collected || !shark) return false;
    this.detachTableCoinVisual(coin);
    this.world.removeBody(coin.body);
    this.tableCoins.splice(index, 1);
    this.syncTableCoinInstances();
    this.sharkEatenCoins.push({
      shark,
      visual: coin.visual,
      start: coin.visual.position.clone(),
      startScale: coin.visual.scale.clone(),
      elapsed: 0,
      duration: SHARK_ROLE_EAT_ANIMATION_SECONDS
    });
    shark.chompTimer = SHARK_ROLE_EAT_ANIMATION_SECONDS;
    shark.suctionActive = true;
    return true;
  }

  updateSharkEatenCoins(delta) {
    if (this.sharkEatenCoins.length === 0) return;
    for (let index = this.sharkEatenCoins.length - 1; index >= 0; index -= 1) {
      const coin = this.sharkEatenCoins[index];
      const shark = coin.shark || this.sharkMechanism;
      if (!shark) continue;
      const scale = shark.scale || 1;
      const yawCos = Math.cos(shark.group.rotation.y);
      const yawSin = Math.sin(shark.group.rotation.y);
      const targetLocalX = (SHARK_ROLE_MOUTH_LOCAL_X + 0.13) * scale;
      const mouthLocalY = SHARK_ROLE_MOUTH_LOCAL_Y * scale;
      const mouthLocalZ = SHARK_ROLE_MOUTH_LOCAL_Z * scale;
      const targetX = shark.group.position.x
        + targetLocalX * yawCos
        + mouthLocalZ * yawSin;
      const targetY = shark.group.position.y + mouthLocalY;
      const targetZ = shark.group.position.z
        - targetLocalX * yawSin
        + mouthLocalZ * yawCos;
      coin.elapsed += delta;
      const progress = clamp(coin.elapsed / coin.duration, 0, 1);
      const ease = 1 - (1 - progress) ** 3;
      coin.visual.position.set(
        lerp(coin.start.x, targetX, ease),
        lerp(coin.start.y, targetY, ease),
        lerp(coin.start.z, targetZ, ease)
      );
      coin.visual.rotateY(delta * 14);
      coin.visual.rotateZ(delta * 10);
      coin.visual.scale.copy(coin.startScale).multiplyScalar(Math.max(0.02, 1 - ease));
      if (progress >= 1) {
        this.scene.remove(coin.visual);
        this.sharkEatenCoins.splice(index, 1);
      }
    }
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
    this.createLcdSideNeon();
    this.refreshBoardLcd();
  }

  createLcdSideNeon() {
    const layers = [
      {
        key: "halo",
        size: LCD_SIDE_NEON_OUTER_SIZE,
        idleColor: 0x6874ff,
        goldColor: 0xffa000,
        idleBaseOpacity: 0.03,
        idlePulseOpacity: 0.02,
        goldBaseOpacity: 0.05,
        goldPulseOpacity: 0.35
      },
      {
        key: "body",
        size: LCD_SIDE_NEON_OUTER_SIZE * 0.625,
        idleColor: 0xaab4ff,
        goldColor: 0xffc72c,
        idleBaseOpacity: 0.08,
        idlePulseOpacity: 0.03,
        goldBaseOpacity: 0.2,
        goldPulseOpacity: 0.6
      },
      {
        key: "core",
        size: LCD_SIDE_NEON_OUTER_SIZE * 0.292,
        idleColor: 0xf4f9ff,
        goldColor: 0xfff5b8,
        idleBaseOpacity: 0.22,
        idlePulseOpacity: 0.05,
        goldBaseOpacity: 0.45,
        goldPulseOpacity: 0.55
      }
    ];
    const positions = [
      {
        side: "left",
        row: "upper",
        x: -LCD_SIDE_NEON_X,
        y: BOARD_LCD_Y + LCD_SIDE_NEON_Y_OFFSET
      },
      {
        side: "left",
        row: "lower",
        x: -LCD_SIDE_NEON_X,
        y: BOARD_LCD_Y - LCD_SIDE_NEON_Y_OFFSET
      },
      {
        side: "right",
        row: "upper",
        x: LCD_SIDE_NEON_X,
        y: BOARD_LCD_Y + LCD_SIDE_NEON_Y_OFFSET
      },
      {
        side: "right",
        row: "lower",
        x: LCD_SIDE_NEON_X,
        y: BOARD_LCD_Y - LCD_SIDE_NEON_Y_OFFSET
      }
    ];
    const groups = [];
    const materials = [];
    const lights = [];

    positions.forEach(({ side, row, x, y }) => {
      const group = new THREE.Group();
      group.name = `icp-lcd-side-neon-${side}-${row}`;
      group.position.set(x, y, PACHINKO_PLAYFIELD_Z + 0.02);
      group.userData.visualOnly = true;

      layers.forEach((layer, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: layer.idleColor,
          transparent: true,
          opacity: layer.idleBaseOpacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        });
        material.userData.neonIdleColor = layer.idleColor;
        material.userData.neonGoldColor = layer.goldColor;
        material.userData.neonLayerKey = layer.key;
        material.userData.neonIdleBaseOpacity = layer.idleBaseOpacity;
        material.userData.neonIdlePulseOpacity = layer.idlePulseOpacity;
        material.userData.neonGoldBaseOpacity = layer.goldBaseOpacity;
        material.userData.neonGoldPulseOpacity = layer.goldPulseOpacity;

        const diamond = new THREE.Mesh(
          new THREE.PlaneGeometry(layer.size, layer.size),
          material
        );
        diamond.name = `icp-lcd-side-neon-${side}-${row}-${layer.key}`;
        diamond.position.z = index * 0.002;
        diamond.rotation.z = Math.PI / 4;
        diamond.renderOrder = 7 + index;
        diamond.userData.visualOnly = true;
        group.add(diamond);
        materials.push(material);
      });

      this.scene.add(group);
      groups.push(group);

      const light = new THREE.PointLight(
        LCD_SIDE_NEON_IDLE_COLOR,
        0.05,
        0.55,
        2
      );
      light.name = `icp-lcd-side-neon-light-${side}-${row}`;
      light.position.set(x, y, PACHINKO_PLAYFIELD_Z + 0.24);
      light.castShadow = false;
      light.userData.visualOnly = true;
      this.scene.add(light);
      lights.push(light);
    });

    this.lcdSideNeon = {
      groups,
      materials,
      lights,
      spinActive: false,
      blinkPulse: 0,
      mode: "idle",
      chanceCode: "",
      paletteName: ""
    };
    this.updateLcdSideNeon();
  }

  updateLcdSideNeon() {
    if (!this.lcdSideNeon) return;
    const spin = this.spin;
    const spinActive = Boolean(spin);
    const stMainChanceActive = Boolean(
      spin
      && this.stRemaining > 0
      && spin.phase === "main"
    );
    const chanceCode = stMainChanceActive ? spin.chance?.code || "" : "";
    const chancePalette = stMainChanceActive
      ? lcdSideNeonChancePalette(chanceCode)
      : null;
    const idlePhase = this.elapsed * Math.PI * 2 / ROLE_SIDE_NEON_PULSE_SECONDS;
    const idlePulse = (Math.sin(idlePhase) + 1) / 2;
    const blinkPhase = this.elapsed * Math.PI * 2 / LCD_SIDE_NEON_BLINK_SECONDS;
    const blinkPulse = Math.pow((Math.sin(blinkPhase) + 1) / 2, 1.8);

    this.lcdSideNeon.materials.forEach((material) => {
      if (chancePalette) {
        material.color.set(
          chancePalette[material.userData.neonLayerKey]
            || chancePalette.body
        );
      } else {
        material.color.setHex(
          spinActive
            ? material.userData.neonGoldColor
            : material.userData.neonIdleColor
        );
      }
      material.opacity = spinActive
        ? material.userData.neonGoldBaseOpacity
          + blinkPulse * material.userData.neonGoldPulseOpacity
        : material.userData.neonIdleBaseOpacity
          + idlePulse * material.userData.neonIdlePulseOpacity;
    });
    this.lcdSideNeon.lights.forEach((light) => {
      if (chancePalette) {
        light.color.set(chancePalette.light);
      } else {
        light.color.setHex(
          spinActive ? LCD_SIDE_NEON_GOLD_COLOR : LCD_SIDE_NEON_IDLE_COLOR
        );
      }
      light.intensity = spinActive
        ? 0.12 + blinkPulse * 1.05
        : 0.035 + idlePulse * 0.025;
    });
    this.lcdSideNeon.spinActive = spinActive;
    this.lcdSideNeon.blinkPulse = spinActive ? blinkPulse : 0;
    this.lcdSideNeon.mode = chancePalette
      ? "st-main-chance"
      : spinActive
        ? "gold-spin"
        : "idle";
    this.lcdSideNeon.chanceCode = chancePalette ? chanceCode : "";
    this.lcdSideNeon.paletteName = chancePalette ? chancePalette.name : "";
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
        color: 0x0f2350,
        emissive: 0x020816,
        emissiveIntensity: 0.3,
        metalness: 0.32,
        roughness: 0.31,
        clearcoat: 0.62
      })
    );
    playfield.name = "icp-pachinko-playfield";
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
    addArcRail(2.06, Math.PI, BALL_RETURN_ANGLE, 7, 0.05, launcherRailMaterial, "icp-launch-rail");

    const drainMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x02070b,
      emissive: 0x00151d,
      emissiveIntensity: 0.42,
      metalness: 0.16,
      roughness: 0.3,
      clearcoat: 0.38
    });
    const drain = new THREE.Mesh(
      new THREE.CircleGeometry(ROLE_SIDE_OUT_POCKET_RADIUS, 48),
      drainMaterial
    );
    drain.name = "icp-pachinko-drain";
    drain.position.set(0, PACHINKO_DRAIN_CENTER_Y, -1.51);
    drain.scale.set(ROLE_SIDE_OUT_POCKET_SCALE_X, ROLE_SIDE_OUT_POCKET_SCALE_Y, 1);
    this.scene.add(drain);

    const drainRim = new THREE.Mesh(
      new THREE.RingGeometry(
        PACHINKO_DRAIN_RIM_INNER_RADIUS,
        ROLE_SIDE_OUT_POCKET_RADIUS,
        48
      ),
      launcherRailMaterial
    );
    drainRim.name = "icp-pachinko-drain-rim";
    drainRim.position.set(0, PACHINKO_DRAIN_CENTER_Y, -1.5);
    drainRim.scale.set(ROLE_SIDE_OUT_POCKET_SCALE_X, ROLE_SIDE_OUT_POCKET_SCALE_Y, 1);
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
    this.defaultPinLayout = PRODUCTION_JACKPOT_LAYOUT.pins.map(([x, y]) => [x, y]);
    this.defaultEntryPlasticGuidePinNumbers = [...PRODUCTION_JACKPOT_LAYOUT.entryPlasticGuidePins];
    this.defaultObjectLayout = Object.fromEntries(
      Object.entries(PRODUCTION_JACKPOT_LAYOUT.objects).map(([key, point]) => [key, [...point]])
    );
    const savedPinLayout = this.loadPinLayout();
    this.pinLayoutLoadedFromStorage = savedPinLayout !== null;
    const activePinLayout = savedPinLayout ?? this.defaultPinLayout;
    activePinLayout.forEach(([x, y]) => addPin(x, y, false, true));
    const activeEntryPlasticGuidePinNumbers = new Set(
      this.loadedEntryPlasticGuidePinNumbers
        ?? this.defaultEntryPlasticGuidePinNumbers
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
    const checkerMarkMaterial = new THREE.MeshBasicMaterial({
      color: 0xd4dcda,
      toneMapped: false
    });
    const hakamaChuckerFrameWidth = 0.38;
    const hakamaChuckerFrameHeight = 0.22;
    const hakamaChuckerFrameBottomTrim = 0.03;
    const hakamaChuckerContentCenterY = hakamaChuckerFrameBottomTrim / 2;
    const hakamaAttackerWidthRatio = 3.78;
    const hakamaAttackerWidth = hakamaChuckerFrameWidth * hakamaAttackerWidthRatio;
    const hakamaAttackerHeight = hakamaChuckerFrameHeight;
    const hakamaAttackerGap = 0;
    const hakamaAttackerFrameDepth = 0.028;
    const hakamaAttackerMouthDepth = 0.012;
    const hakamaAttackerDoorDepth = 0.016;
    const hakamaAttackerMouthWidth = hakamaAttackerWidth - 0.1;
    const hakamaAttackerMouthHeight = hakamaAttackerHeight - 0.06;
    const hakamaAttackerDoorWidth = hakamaAttackerMouthWidth - 0.04;
    const hakamaAttackerDoorHeight = hakamaAttackerMouthHeight - 0.018;
    const pinAtNumber = pinNumber => {
      const activePin = activePinLayout[pinNumber - 1];
      if (Array.isArray(activePin)) return activePin;
      const migratedPinIndex = pinNumber - this.defaultPinLayout.length - 1;
      return hakamaPinLayout[migratedPinIndex] ?? null;
    };
    const pin119 = pinAtNumber(119) ?? [1.86, 3.2];
    const pin120 = pinAtNumber(120) ?? [1.22, 3];
    const sideChuckerUpwardOffset = 0.06;
    const numberTwoChuckerDownwardOffset = 0.12;
    const numberTwoChuckerPosition = [
      (pin119[0] + pin120[0]) / 2,
      (pin119[1] + pin120[1]) / 2 - numberTwoChuckerDownwardOffset
    ];
    const createHakamaChucker = ({
      side,
      name,
      markText,
      markName,
      x,
      y,
      color,
      emissive
    }) => {
      const frameMaterial = new THREE.MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 0.58,
        metalness: 0.5,
        roughness: 0.2,
        clearcoat: 0.9
      });
      const chucker = new THREE.Group();
      chucker.name = name;
      chucker.position.set(x, y, -1.5);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(hakamaChuckerFrameWidth, hakamaChuckerFrameHeight, 0.09),
        frameMaterial
      );
      frame.position.y = hakamaChuckerFrameBottomTrim / 2;
      frame.castShadow = true;
      chucker.add(frame);
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.15, 0.055), chuckerMouthMaterial);
      mouth.position.set(0, hakamaChuckerContentCenterY, 0.065);
      chucker.add(mouth);
      const mark = createCheckerMarkMesh(markText, 0.18, 0.13, checkerMarkMaterial);
      mark.name = markName;
      mark.position.y = hakamaChuckerContentCenterY;
      mark.position.z = mouth.position.z + 0.055 / 2 + 0.006;
      chucker.add(mark);
      const indicatorMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x566669,
        emissive: 0x11191a,
        emissiveIntensity: 0.12,
        metalness: 0.34,
        roughness: 0.68,
        clearcoat: 0.18
      });
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), indicatorMaterial);
      indicator.position.set(0, 0.165, 0.035);
      indicator.castShadow = true;
      chucker.add(indicator);
      this.scene.add(chucker);
      this.hakamaChuckers.push({
        side,
        color,
        visual: chucker,
        indicator,
        indicatorMaterial,
        flash: 0
      });
    };
    createHakamaChucker({
      side: -1,
      name: "icp-hakama-chucker-left",
      markText: "1",
      markName: "icp-hakama-chucker-left-mark-one",
      x: -HAKAMA_CHUCKER_X,
      y: HAKAMA_CHUCKER_Y + sideChuckerUpwardOffset,
      color: 0xff70ad,
      emissive: 0x7a1648
    });
    createHakamaChucker({
      side: 1,
      name: "icp-hakama-chucker-right",
      markText: "1",
      markName: "icp-hakama-chucker-right-mark-one",
      x: HAKAMA_CHUCKER_X,
      y: HAKAMA_CHUCKER_Y + sideChuckerUpwardOffset,
      color: 0x57e5c5,
      emissive: 0x075b50
    });
    createHakamaChucker({
      side: 2,
      name: "icp-hakama-chucker-number-two",
      markText: "2",
      markName: "icp-hakama-chucker-number-two-mark-two",
      x: numberTwoChuckerPosition[0],
      y: numberTwoChuckerPosition[1],
      color: 0x57e5c5,
      emissive: 0x075b50
    });

    const attackerFrameMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xd6e0e2,
      emissive: 0x21383d,
      emissiveIntensity: 0.22,
      metalness: 0.94,
      roughness: 0.14,
      clearcoat: 0.92,
      clearcoatRoughness: 0.08
    });
    const attackerDoorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x37767a,
      emissive: 0x062f37,
      emissiveIntensity: 0.38,
      metalness: 0.78,
      roughness: 0.2,
      clearcoat: 0.86,
      clearcoatRoughness: 0.1
    });
    const attackerAccentMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff70ad,
      emissive: 0x7a1648,
      emissiveIntensity: 0.72,
      metalness: 0.44,
      roughness: 0.24,
      clearcoat: 0.9
    });
    const attackerSensorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffdc55,
      emissive: 0xff8d17,
      emissiveIntensity: 1.35,
      metalness: 0.42,
      roughness: 0.18,
      clearcoat: 0.82,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const attacker = new THREE.Group();
    attacker.name = "icp-hakama-attacker";
    attacker.position.set(
      numberTwoChuckerPosition[0],
      numberTwoChuckerPosition[1] - hakamaChuckerFrameHeight - hakamaAttackerGap,
      PACHINKO_PLAYFIELD_Z + 0.006
    );
    Object.assign(attacker.userData, {
      anchoredBelow: "icp-hakama-chucker-number-two",
      widthRatio: hakamaAttackerWidthRatio,
      width: hakamaAttackerWidth,
      height: hakamaAttackerHeight,
      normalState: "closed-recessed",
      openingAxis: "bottom-edge",
      openAngleDegrees: 90,
      gameplayLinked: false
    });

    const attackerFrame = new THREE.Mesh(
      new THREE.BoxGeometry(
        hakamaAttackerWidth,
        hakamaAttackerHeight,
        hakamaAttackerFrameDepth
      ),
      attackerFrameMaterial
    );
    attackerFrame.name = "icp-hakama-attacker-frame";
    attacker.add(attackerFrame);

    const attackerMouth = new THREE.Mesh(
      new THREE.BoxGeometry(
        hakamaAttackerMouthWidth,
        hakamaAttackerMouthHeight,
        hakamaAttackerMouthDepth
      ),
      chuckerMouthMaterial
    );
    attackerMouth.name = "icp-hakama-attacker-mouth";
    attackerMouth.position.z = -0.003;
    attacker.add(attackerMouth);

    const attackerDoorPivot = new THREE.Group();
    attackerDoorPivot.name = "icp-hakama-attacker-door-pivot";
    attackerDoorPivot.position.set(0, -hakamaAttackerDoorHeight / 2, 0.008);
    attackerDoorPivot.userData.closedAngle = 0;
    attackerDoorPivot.userData.openAngle = HAKAMA_ATTACKER_OPEN_ANGLE;
    attacker.add(attackerDoorPivot);

    const attackerDoor = new THREE.Mesh(
      new THREE.BoxGeometry(
        hakamaAttackerDoorWidth,
        hakamaAttackerDoorHeight,
        hakamaAttackerDoorDepth
      ),
      attackerDoorMaterial
    );
    attackerDoorMaterial.side = THREE.DoubleSide;
    attackerDoorMaterial.needsUpdate = true;
    attackerDoor.name = "icp-hakama-attacker-door";
    attackerDoor.position.set(0, hakamaAttackerDoorHeight / 2, 0);
    attackerDoor.castShadow = true;
    attackerDoor.receiveShadow = true;
    attackerDoor.userData.isOpeningDoor = true;
    attackerDoor.userData.becomesTrayWhenOpen = true;
    attackerDoorPivot.add(attackerDoor);

    const attackerSensor = new THREE.Mesh(
      new THREE.BoxGeometry(hakamaAttackerDoorWidth - 0.1, 0.022, 0.026),
      attackerSensorMaterial
    );
    attackerSensor.name = "icp-hakama-attacker-entry-sensor";
    attackerSensor.position.set(
      0,
      hakamaAttackerDoorHeight * 0.7,
      hakamaAttackerDoorDepth / 2 + 0.014
    );
    attackerSensor.castShadow = true;
    attackerSensor.visible = false;
    attackerDoorPivot.add(attackerSensor);

    const attackerUpperLip = new THREE.Mesh(
      new THREE.BoxGeometry(hakamaAttackerWidth - 0.14, 0.025, 0.018),
      attackerFrameMaterial
    );
    attackerUpperLip.name = "icp-hakama-attacker-upper-lip";
    attackerUpperLip.position.set(0, hakamaAttackerHeight / 2 - 0.0125, 0.005);
    attacker.add(attackerUpperLip);

    const attackerAccent = new THREE.Mesh(
      new THREE.BoxGeometry(hakamaAttackerDoorWidth - 0.12, 0.016, 0.008),
      attackerAccentMaterial
    );
    attackerAccent.name = "icp-hakama-attacker-accent";
    attackerAccent.position.set(
      0,
      hakamaAttackerDoorHeight / 2,
      hakamaAttackerDoorDepth / 2 + 0.003
    );
    attackerDoorPivot.add(attackerAccent);

    [-1, 1].forEach(side => {
      const hinge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.018, 18),
        attackerFrameMaterial
      );
      hinge.name = side < 0
        ? "icp-hakama-attacker-hinge-left"
        : "icp-hakama-attacker-hinge-right";
      hinge.rotation.x = Math.PI / 2;
      hinge.position.set(
        side * (hakamaAttackerDoorWidth / 2 - 0.035),
        -hakamaAttackerDoorHeight / 2,
        0.008
      );
      attacker.add(hinge);
    });
    this.scene.add(attacker);
    this.hakamaAttacker = {
      visual: attacker,
      doorPivot: attackerDoorPivot,
      door: attackerDoor,
      sensor: attackerSensor,
      doorWidth: hakamaAttackerDoorWidth,
      doorHeight: hakamaAttackerDoorHeight,
      doorDepth: hakamaAttackerDoorDepth,
      physicsZ: BOARD_Z,
      closedAngle: 0,
      openAngle: HAKAMA_ATTACKER_OPEN_ANGLE,
      openProgress: 0,
      gameplayLinked: true,
      doorBody: null,
      sensorZ: BOARD_Z
    };
    const attackerDoorBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      material: this.attackerDoorPhysicsMaterial
    });
    attackerDoorBody.addShape(new CANNON.Box(new CANNON.Vec3(
      hakamaAttackerDoorWidth * HAKAMA_ATTACKER_OPEN_WIDTH_SCALE / 2,
      hakamaAttackerDoorHeight / 2,
      hakamaAttackerDoorDepth / 2
    )));
    this.world.addBody(attackerDoorBody);
    this.hakamaAttacker.doorBody = attackerDoorBody;
    this.setHakamaAttackerOpenProgress(0);

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
    const sideSeesawLength = 0.21;
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
      color: 0x4a123b,
      emissive: 0x17030f,
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
    this.createRoleSideNeon();

    const roleTopPinDrop = 0.03;
    const roleBottomInnerPinOutwardShift = 0.02;
    [2, 3, 4].forEach((count, row) => {
      const spacing = 0.31;
      const y = 3.4 + ROLE_VERTICAL_SHIFT - row * 0.23 - (row === 0 ? roleTopPinDrop : 0);
      for (let column = 0; column < count; column += 1) {
        const bottomInnerDirection = row === 2 && column === 1
          ? -1
          : row === 2 && column === 2
            ? 1
            : 0;
        const x = (column - (count - 1) / 2) * spacing
          + bottomInnerDirection * roleBottomInnerPinOutwardShift;
        addPin(x, y, true);
      }
    });
    this.createRoleRotator();

    const separatorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffd968,
      emissive: 0x7c3c00,
      emissiveIntensity: 0.5,
      metalness: 0.84,
      roughness: 0.19
    });
    [-0.84, -0.24, 0.24, 0.84].forEach(x => {
      const topY = Math.abs(x) === 0.24 ? 2.82 : 2.5;
      addRail([x, 2.1 + ROLE_VERTICAL_SHIFT], [x, topY + ROLE_VERTICAL_SHIFT], 0.052, separatorMaterial, "icp-role-separator");
    });
    addRail(
      [-ROLE_BOTTOM_GUIDE_HALF_WIDTH, ROLE_BOTTOM_GUIDE_Y],
      [ROLE_BOTTOM_GUIDE_HALF_WIDTH, ROLE_BOTTOM_GUIDE_Y],
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
    const checkerSensorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x566669,
      emissive: 0x11191a,
      emissiveIntensity: 0.12,
      metalness: 0.34,
      roughness: 0.68,
      clearcoat: 0.18
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
          new THREE.BoxGeometry(0.32, 0.16, 0.065),
          startChuckerDepthMaterial
        );
        mouth.name = "icp-role-red-start-chucker-mouth";
        mouth.position.z = 0.082;
        mouth.castShadow = true;
        startChucker.add(mouth);

        const mark = createCheckerMarkMesh("S", 0.26, 0.13, checkerMarkMaterial);
        mark.name = "icp-role-red-start-chucker-mark-s";
        mark.position.z = mouth.position.z + 0.065 / 2 + 0.006;
        startChucker.add(mark);

        const indicator = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 14, 10),
          checkerSensorMaterial
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
        new THREE.CircleGeometry(ROLE_SIDE_OUT_POCKET_RADIUS, 32),
        new THREE.MeshBasicMaterial({ color: 0x02090d })
      );
      hole.name = "icp-role-out-pocket-depth";
      hole.scale.set(ROLE_SIDE_OUT_POCKET_SCALE_X, ROLE_SIDE_OUT_POCKET_SCALE_Y, 1);
      hole.position.set(x, ROLE_SIDE_OUT_POCKET_CENTER_Y, -1.545);
      this.scene.add(hole);

      const rim = new THREE.Mesh(
        new THREE.RingGeometry(
          PACHINKO_DRAIN_RIM_INNER_RADIUS,
          ROLE_SIDE_OUT_POCKET_RADIUS,
          32
        ),
        launcherRailMaterial
      );
      rim.name = x < 0
        ? "icp-role-out-pocket-rim-left"
        : "icp-role-out-pocket-rim-right";
      rim.scale.set(ROLE_SIDE_OUT_POCKET_SCALE_X, ROLE_SIDE_OUT_POCKET_SCALE_Y, 1);
      rim.position.set(x, ROLE_SIDE_OUT_POCKET_CENTER_Y, -1.535);
      this.scene.add(rim);

      this.slotLights.push(null);
    });

    this.launcherVisual = new THREE.Mesh(
      createCoinGeometry(PACHINKO_COIN_RADIUS, PACHINKO_COIN_THICKNESS),
      [this.coinFaceMaterial, this.coinEdgeMaterial]
    );
    this.launcherVisual.rotation.set(-Math.PI / 2, 0, 0);
    this.launcherVisual.position.set(
      PACHINKO_LAUNCH_X,
      PACHINKO_LAUNCH_Y + (this.stroke - 0.58) * 0.08,
      -1.54
    );
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

    const dangerTextures = {
      small: createSharkDangerWarningTexture("small"),
      large: createSharkDangerWarningTexture("large")
    };
    const dangerTextTextures = {
      small: createSharkDangerTextTexture("small"),
      large: createSharkDangerTextTexture("large")
    };
    [
      ...Object.values(dangerTextures),
      ...Object.values(dangerTextTextures)
    ].forEach(texture => {
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.textures.add(texture);
    });
    const dangerMaterial = new THREE.MeshBasicMaterial({
      map: dangerTextures.small,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const dangerTextMaterial = new THREE.MeshBasicMaterial({
      map: dangerTextTextures.small,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const dangerBottomY = PAYOUT_SIDE_WALL_MAX_Y;
    const dangerTopY = glass.position.y + glass.geometry.parameters.height / 2;
    const dangerWidth = SHARK_SIDE_WALL_OPENING_REAR_Z - PAYOUT_SIDE_WALL_MIN_Z;
    const dangerHeight = dangerTopY - dangerBottomY;
    const dangerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(dangerWidth, dangerHeight),
      dangerMaterial
    );
    dangerMesh.name = "icp-shark-danger-warning";
    dangerMesh.position.set(
      PAYOUT_SIDE_WALL_X - PAYOUT_SIDE_WALL_WIDTH / 2 - 0.006,
      (dangerBottomY + dangerTopY) / 2,
      (PAYOUT_SIDE_WALL_MIN_Z + SHARK_SIDE_WALL_OPENING_REAR_Z) / 2
    );
    dangerMesh.rotation.y = -Math.PI / 2;
    dangerMesh.renderOrder = glass.renderOrder + 1;
    dangerMesh.visible = false;
    dangerMesh.userData.glassProjection = true;
    dangerMesh.userData.projectionRegion = "right-side-wall-rear-glass-full-surface";
    dangerMesh.userData.surfaceOrientation = "yz";
    dangerMesh.userData.surfaceCoverage = "rear-glass-full";
    const dangerTextMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(dangerWidth, dangerHeight),
      dangerTextMaterial
    );
    dangerTextMesh.name = "icp-shark-danger-warning-text";
    dangerTextMesh.position.copy(dangerMesh.position);
    dangerTextMesh.position.x -= 0.004;
    dangerTextMesh.rotation.copy(dangerMesh.rotation);
    dangerTextMesh.renderOrder = dangerMesh.renderOrder + 1;
    dangerTextMesh.visible = false;
    dangerTextMesh.userData.dangerTextLayer = true;
    this.sharkDangerWarning = {
      mesh: dangerMesh,
      textMesh: dangerTextMesh,
      material: dangerMaterial,
      textMaterial: dangerTextMaterial,
      textures: dangerTextures,
      textTextures: dangerTextTextures,
      brightColor: new THREE.Color(0xffffff),
      darkColors: {
        small: new THREE.Color(0x5c4a00),
        large: new THREE.Color(0x650914)
      },
      roomColors: {
        small: {
          bright: new THREE.Color(0xfff7c0),
          dark: new THREE.Color(0x5c4a00)
        },
        large: {
          bright: new THREE.Color(0xffd4d8),
          dark: new THREE.Color(0x650914)
        }
      },
      roomTint: new THREE.Color(),
      currentVariant: "small"
    };
    this.scene.add(dangerMesh, dangerTextMesh);
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
    const guidePosterItem = this.roster.find(item => item.name === "白ミチロードセイバーレン")
      || this.roster[1]
      || this.roster[0];
    const entries = [
      { item: this.roster[0], x: -3.23, color: 0x53edc4 },
      { item: guidePosterItem, x: 3.23, color: 0xff5ca3, memberPoster: true }
    ];
    entries.forEach(entry => {
      const frameMaterial = new THREE.MeshPhysicalMaterial({
        color: entry.color,
        emissive: entry.color,
        emissiveIntensity: 0.75,
        metalness: 0.35,
        roughness: 0.28
      });
      const frameWidth = 1.05;
      const frameHeight = 1.45;
      const artWidth = 0.92;
      const artHeight = 1.27;
      const posterY = entry.memberPoster ? 4.00 : 3.75;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, 0.12), frameMaterial);
      frame.position.set(entry.x, posterY, -2.66);
      this.scene.add(frame);
      const artMaterial = entry.memberPoster
        ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: false })
        : new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, alphaTest: 0.04, roughness: 0.75 });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(artWidth, artHeight), artMaterial);
      art.position.set(entry.x, posterY, -2.58);
      this.scene.add(art);
      if (entry.memberPoster) {
        createMemberRecruitmentPosterTexture(entry.item, this.renderer).then(texture => {
          if (this.destroyed) {
            texture.dispose();
            return;
          }
          this.textures.add(texture);
          artMaterial.map = texture;
          artMaterial.needsUpdate = true;
        }).catch(error => {
          console.error("会員募集ポスターの正規キャラクター表示に失敗しました。", error);
        });
        return;
      }
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

  ensureTableCoinInstanceCapacity(requiredCapacity) {
    if (this.tableCoinInstances && requiredCapacity <= this.tableCoinInstanceCapacity) return;
    let capacity = Math.max(TABLE_COIN_INSTANCE_INITIAL_CAPACITY, this.tableCoinInstanceCapacity || 0);
    while (capacity < requiredCapacity) capacity *= 2;

    const previousInstances = this.tableCoinInstances;
    const instances = new THREE.InstancedMesh(
      this.coinGeometry,
      [this.coinFaceMaterial, this.coinEdgeMaterial],
      capacity
    );
    instances.name = "icp-table-coin-instances";
    instances.castShadow = true;
    instances.receiveShadow = true;
    instances.frustumCulled = false;
    instances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instances.count = 0;
    this.tableCoinInstances = instances;
    this.tableCoinInstanceCapacity = capacity;
    this.scene.add(instances);
    if (previousInstances) {
      this.scene.remove(previousInstances);
      previousInstances.dispose?.();
    }
    this.syncTableCoinInstances();
  }

  syncTableCoinInstanceAt(index, coin) {
    if (!this.tableCoinInstances || !coin?.visual) return;
    const transform = this.tableCoinInstanceTransform;
    transform.position.copy(coin.visual.position);
    transform.quaternion.copy(coin.visual.quaternion);
    transform.scale.copy(coin.visual.scale);
    transform.updateMatrix();
    this.tableCoinInstances.setMatrixAt(index, transform.matrix);
  }

  syncTableCoinInstances() {
    if (!this.tableCoinInstances) return;
    if (this.tableCoins.length > this.tableCoinInstanceCapacity) {
      this.ensureTableCoinInstanceCapacity(this.tableCoins.length);
      return;
    }
    this.tableCoins.forEach((coin, index) => this.syncTableCoinInstanceAt(index, coin));
    this.tableCoinInstances.count = this.tableCoins.length;
    this.tableCoinInstances.instanceMatrix.needsUpdate = true;
  }

  detachTableCoinVisual(coin) {
    if (!coin?.visual || coin.visual.isMesh) return coin?.visual || null;
    const visual = new THREE.Mesh(
      this.coinGeometry,
      [this.coinFaceMaterial, this.coinEdgeMaterial]
    );
    visual.castShadow = true;
    visual.receiveShadow = true;
    visual.position.copy(coin.visual.position);
    visual.quaternion.copy(coin.visual.quaternion);
    visual.scale.copy(coin.visual.scale);
    this.scene.add(visual);
    coin.visual = visual;
    return visual;
  }

  spawnTableCoin(x, z, options = {}) {
    if (this.tableCoins.length >= TABLE_COIN_CLEANUP_THRESHOLD) {
      this.removeOldestLostCoin();
    }
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
    const coinShape = new CANNON.Cylinder(radius, radius, thickness, 16);
    coinShape.material = this.coinMaterial;
    body.addShape(coinShape);
    const minimumX = Number.isFinite(options.minX) ? options.minX : -2.3;
    const maximumX = Number.isFinite(options.maxX) ? options.maxX : 2.3;
    body.position.set(
      clamp(x, minimumX, maximumX),
      options.y ?? TABLE_TOP_Y + 0.42,
      z
    );
    if (options.uprightAlongZ) {
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
      body.linearFactor.set(1, 1, 0);
      body.angularFactor.set(0, 0, 1);
    } else {
      body.quaternion.setFromEuler(
        options.tiltX ?? (this.random() - 0.5) * 0.08,
        this.random() * Math.PI,
        options.tiltZ ?? (this.random() - 0.5) * 0.08
      );
    }
    body.velocity.set(options.vx || 0, options.vy || 0, options.vz || 0);
    body.angularVelocity.set(
      options.angularVelocityX || 0,
      options.angularVelocityY || 0,
      options.angularVelocityZ || 0
    );
    this.world.addBody(body);

    const visual = new THREE.Object3D();
    visual.position.copy(body.position);
    visual.quaternion.copy(body.quaternion);
    const coin = {
      body,
      visual,
      radius,
      thickness,
      value: options.value || 1,
      age: 0,
      initial: Boolean(options.initial),
      payoutChuteGuideActive: Boolean(options.uprightAlongZ),
      payoutChuteExitMomentumActive: false,
      payoutChuteLandingMomentumActive: false,
      payoutChuteLandingMomentumVelocityX: 0,
      payoutChuteLandingMomentumElapsed: 0,
      payoutChuteStaticBedMomentumAdjusted: false,
      payoutChuteFlowDirectionX: options.payoutChuteFlowDirectionX === 1 ? 1 : -1,
      payoutChuteExitVelocityBoost: Number.isFinite(options.payoutChuteExitVelocityBoost)
        ? options.payoutChuteExitVelocityBoost
        : PAYOUT_CHUTE_EXIT_VELOCITY_BOOST_MAX,
      pusherPlateContactGrace: 0,
      pusherPlateSupported: false,
      pusherPlateDirectContact: false,
      pusherPlateRelativeVelocityZ: 0,
      pusherPlateSupportFrames: 0,
      pusherPlateGraceFrames: 0,
      sharkMouthEntryArmed: false,
      collected: false
    };
    this.ensureTableCoinInstanceCapacity(this.tableCoins.length + 1);
    this.tableCoins.push(coin);
    this.syncTableCoinInstanceAt(this.tableCoins.length - 1, coin);
    this.tableCoinInstances.count = this.tableCoins.length;
    this.tableCoinInstances.instanceMatrix.needsUpdate = true;
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
      centerStroke + (variationIndex - 2) / 100,
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
      launchStrokeRatio: strokeRatio,
      phase: "board",
      previousX: body.position.x,
      previousY: body.position.y,
      previousGateAngle: normalizeAngle(Math.atan2(body.position.y - PACHINKO_FIELD_CENTER_Y, body.position.x)),
      clearedBallReturn: false,
      launcherAssistFrames: 0,
      launcherRollbackStops: 0,
      entrySide: 0,
      entryAuthorized: false,
      entrySource: "",
      roleRotatorCaptured: false,
      roleRotatorReleased: false,
      roleRotatorDividerSides: null,
      roleRotatorRoute: "",
      roleOutElapsed: 0,
      roleOutAnchorLocalX: 0,
      roleOutAnchorLocalY: 0,
      attackerElapsed: 0,
      attackerEntryZ: BOARD_Z,
      attackerEntryX: 0,
      attackerEntryY: PACHINKO_FIELD_CENTER_Y,
      attackerEntryVelocityX: 0,
      attackerEntryVelocityY: 0,
      attackerEntryVisualZ: PACHINKO_TOKEN_FRONT_VISUAL_Z,
      attackerCatchX: 0,
      attackerCatchY: PACHINKO_FIELD_CENTER_Y,
      attackerCatchRoll: 0,
      attackerVisualZ: PACHINKO_TOKEN_FRONT_VISUAL_Z,
      attackerSensorCaptured: false
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
    const value = clamp(
      Number(event.currentTarget.value) || STROKE_DISPLAY_DEFAULT,
      STROKE_DISPLAY_MIN,
      STROKE_DISPLAY_MAX
    );
    this.stroke = strokeFromDisplayValue(value);
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
    this.applyEntryPlasticGuidePinNumbers(this.defaultEntryPlasticGuidePinNumbers);
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

  clearPachinkoJam() {
    if (this.gameOver || this.layoutEditing) return 0;
    const removedCount = this.pachinkoTokens.length;
    for (let index = removedCount - 1; index >= 0; index -= 1) {
      this.removePachinkoToken(index);
    }
    if (this.autoEnabled) this.autoTimer = AUTO_FIRE_INTERVAL;
    if (removedCount > 0) {
      this.zeroCreditTimer = 0;
      this.showCallout(`玉詰まり解消・${removedCount}枚アウト`, 1.15, "warning");
    } else {
      this.showCallout("盤面にコインはありません", 0.9, "normal");
    }
    this.refreshHud();
    return removedCount;
  }

  triggerDevStartChucker() {
    if (this.destroyed || this.gameOver || this.layoutEditing) return false;
    this.handleRolePocketEntry(1);
    return true;
  }

  bindEvents() {
    this.els.auto.addEventListener("click", this.boundAuto);
    this.els.clearJam.addEventListener("click", this.boundClearJam);
    this.els.devStart.addEventListener("click", this.boundDevStart);
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

  setHakamaAttackerOpenProgress(progress = 0) {
    if (!this.hakamaAttacker) return 0;
    const attacker = this.hakamaAttacker;
    const numericProgress = Number(progress);
    const normalizedProgress = clamp(
      Number.isFinite(numericProgress) ? numericProgress : 0,
      0,
      1
    );
    attacker.openProgress = normalizedProgress;
    const angle = lerp(
      attacker.closedAngle,
      attacker.openAngle,
      normalizedProgress
    );
    attacker.doorPivot.rotation.x = angle;
    attacker.doorPivot.scale.x = lerp(
      1,
      HAKAMA_ATTACKER_OPEN_WIDTH_SCALE,
      normalizedProgress
    );
    attacker.visual.userData.openProgress = normalizedProgress;
    attacker.sensor.visible = normalizedProgress > 0.04;
    if (attacker.doorBody) {
      const pivotX = attacker.visual.position.x;
      const pivotY = attacker.visual.position.y - attacker.doorHeight / 2;
      const pivotZ = attacker.physicsZ + 0.008;
      const halfHeight = attacker.doorHeight / 2;
      attacker.doorBody.position.set(
        pivotX,
        pivotY + Math.cos(angle) * halfHeight,
        pivotZ + Math.sin(angle) * halfHeight
      );
      attacker.doorBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        angle
      );
      const doorIsOpen = normalizedProgress >= 0.999;
      attacker.doorBody.collisionFilterGroup = doorIsOpen
        ? PACHINKO_FRONT_COLLISION_GROUP
        : 0;
      attacker.doorBody.collisionFilterMask = doorIsOpen
        ? PACHINKO_FRONT_COLLISION_GROUP
        : 0;
      attacker.doorBody.aabbNeedsUpdate = true;
      attacker.doorBody.wakeUp();
      // The rear of the machine is the negative-Z direction.
      attacker.sensorZ = pivotZ - attacker.doorHeight * 0.7;
    }
    return normalizedProgress;
  }

  getHakamaAttackerEntry(token) {
    if (!this.attackerRound?.active || !this.hakamaAttacker) return false;
    const attacker = this.hakamaAttacker;
    const doorBody = attacker.doorBody;
    if (
      token.phase !== "board"
      || attacker.openProgress < 0.999
      || !doorBody
    ) return false;

    const incomingVelocityY = Number.isFinite(token.prePhysicsVelocityY)
      ? token.prePhysicsVelocityY
      : token.body.velocity.y;
    const previousY = Number.isFinite(token.prePhysicsY)
      ? token.prePhysicsY
      : token.previousY;
    const doorSurfaceY = doorBody.position.y + attacker.doorDepth / 2;
    const arrivedFromAbove = incomingVelocityY <= 0.25
      && previousY >= doorSurfaceY + PACHINKO_TOKEN_COLLIDER_RADIUS * 0.55
      && token.body.position.y >= doorSurfaceY + PACHINKO_TOKEN_COLLIDER_RADIUS * 0.35;
    if (!arrivedFromAbove) return false;

    return (this.world.contacts || []).some(contact => {
      const tokenIsBodyI = contact.bi === token.body && contact.bj === doorBody;
      const doorIsBodyI = contact.bi === doorBody && contact.bj === token.body;
      if (!tokenIsBodyI && !doorIsBodyI) return false;
      const doorToTokenNormalY = doorIsBodyI ? contact.ni.y : -contact.ni.y;
      return doorToTokenNormalY >= 0.55;
    });
  }

  enterHakamaAttacker(token) {
    if (!this.getHakamaAttackerEntry(token)) return false;
    const attacker = this.hakamaAttacker;
    const trayTopY = attacker.doorBody.position.y
      + attacker.doorDepth / 2
      + PACHINKO_TOKEN_COLLIDER_RADIUS
      + 0.001;
    const entryVelocityX = token.body.velocity.x;
    const entryVelocityY = token.body.velocity.y;
    const safeHalfWidth = Math.max(
      0,
      attacker.doorWidth * HAKAMA_ATTACKER_OPEN_WIDTH_SCALE / 2
        - PACHINKO_TOKEN_COLLIDER_RADIUS
    );
    const safeMinimumX = attacker.visual.position.x - safeHalfWidth;
    const safeMaximumX = attacker.visual.position.x + safeHalfWidth;
    const minimumCatchVelocityX = (safeMinimumX - token.body.position.x) * 3
      / HAKAMA_ATTACKER_CATCH_HOLD_SECONDS;
    const maximumCatchVelocityX = (safeMaximumX - token.body.position.x) * 3
      / HAKAMA_ATTACKER_CATCH_HOLD_SECONDS;
    const catchVelocityX = clamp(
      entryVelocityX,
      minimumCatchVelocityX,
      maximumCatchVelocityX
    );
    const projectedCatchY = token.body.position.y
      + Math.min(entryVelocityY, -0.02) * HAKAMA_ATTACKER_CATCH_HOLD_SECONDS / 3;
    const supportedY = Math.min(token.body.position.y, trayTopY);
    const catchY = Math.max(supportedY, projectedCatchY);
    token.phase = "attacker";
    token.attackerElapsed = 0;
    token.attackerEntryZ = token.body.position.z;
    token.attackerEntryX = token.body.position.x;
    token.attackerEntryY = token.body.position.y;
    token.attackerEntryVelocityX = catchVelocityX;
    token.attackerEntryVelocityY = (catchY - token.attackerEntryY) * 3
      / HAKAMA_ATTACKER_CATCH_HOLD_SECONDS;
    token.attackerEntryVisualZ = token.visual.position.z;
    token.attackerCatchX = token.attackerEntryX
      + catchVelocityX * HAKAMA_ATTACKER_CATCH_HOLD_SECONDS / 3;
    token.attackerCatchY = catchY;
    token.attackerCatchRoll = (token.attackerCatchX - token.attackerEntryX)
      / PACHINKO_TOKEN_COLLIDER_RADIUS * 0.12;
    token.attackerVisualZ = token.attackerEntryVisualZ;
    token.attackerSensorCaptured = false;
    token.body.collisionFilterMask = 0;
    token.body.velocity.x = token.attackerEntryVelocityX;
    token.body.velocity.y = token.attackerEntryVelocityY;
    token.body.velocity.z = 0;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    return true;
  }

  updateHakamaAttackerToken(token, delta) {
    if (token.phase !== "attacker" || !this.hakamaAttacker) return false;
    const attacker = this.hakamaAttacker;
    token.attackerElapsed += delta;
    const catchProgress = clamp(
      token.attackerElapsed / HAKAMA_ATTACKER_CATCH_HOLD_SECONDS,
      0,
      1
    );
    if (catchProgress < 1) {
      token.body.position.x = cubicHermitePosition(
        token.attackerEntryX,
        token.attackerCatchX,
        token.attackerEntryVelocityX,
        0,
        catchProgress,
        HAKAMA_ATTACKER_CATCH_HOLD_SECONDS
      );
      token.body.position.z = token.attackerEntryZ;
      token.body.position.y = cubicHermitePosition(
        token.attackerEntryY,
        token.attackerCatchY,
        token.attackerEntryVelocityY,
        0,
        catchProgress,
        HAKAMA_ATTACKER_CATCH_HOLD_SECONDS
      );
      token.body.velocity.x = cubicHermiteVelocity(
        token.attackerEntryX,
        token.attackerCatchX,
        token.attackerEntryVelocityX,
        0,
        catchProgress,
        HAKAMA_ATTACKER_CATCH_HOLD_SECONDS
      );
      token.body.velocity.y = cubicHermiteVelocity(
        token.attackerEntryY,
        token.attackerCatchY,
        token.attackerEntryVelocityY,
        0,
        catchProgress,
        HAKAMA_ATTACKER_CATCH_HOLD_SECONDS
      );
      token.body.velocity.z = 0;
      token.attackerVisualZ = token.attackerEntryVisualZ;
      token.attackerRoll = (token.body.position.x - token.attackerEntryX)
        / PACHINKO_TOKEN_COLLIDER_RADIUS * 0.12;
      token.body.aabbNeedsUpdate = true;
      token.body.wakeUp();
      return false;
    }

    const progress = clamp(
      (token.attackerElapsed - HAKAMA_ATTACKER_CATCH_HOLD_SECONDS)
        / HAKAMA_ATTACKER_SENSOR_TRAVEL_SECONDS,
      0,
      1
    );
    const eased = progress * progress * (3 - 2 * progress);
    const easedRate = 6 * progress * (1 - progress)
      / HAKAMA_ATTACKER_SENSOR_TRAVEL_SECONDS;
    const targetZ = lerp(token.attackerEntryZ, attacker.sensorZ, eased);
    const targetVisualZ = attacker.sensorZ + PACHINKO_TOKEN_ATTACKER_VISUAL_OFFSET_Z;
    token.body.position.x = token.attackerCatchX;
    token.body.position.z = targetZ;
    token.body.position.y = token.attackerCatchY;
    token.body.velocity.x = 0;
    token.body.velocity.y = 0;
    token.body.velocity.z = (attacker.sensorZ - token.attackerEntryZ) * easedRate;
    token.attackerVisualZ = lerp(token.attackerEntryVisualZ, targetVisualZ, eased);
    const rearwardTravel = Math.max(
      0,
      token.attackerEntryVisualZ - token.attackerVisualZ
    );
    token.attackerRoll = token.attackerCatchRoll
      + rearwardTravel / PACHINKO_TOKEN_COLLIDER_RADIUS * 0.22;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    if (progress < 1 || token.attackerSensorCaptured) return false;
    token.attackerSensorCaptured = true;
    return true;
  }

  handleHakamaAttackerEntry() {
    const round = this.attackerRound;
    if (!round?.active) return false;
    round.count += 1;
    this.pendingPayout += HAKAMA_ATTACKER_PAYOUT_PER_COUNT;
    this.setSpinLabel(
      `ATTACKER ${round.roundNumber}R ${round.count}/${HAKAMA_ATTACKER_COUNT_LIMIT}C`
    );
    this.showCallout(
      `ATTACKER ${round.count}C +${HAKAMA_ATTACKER_PAYOUT_PER_COUNT}`,
      0.55,
      "win"
    );
    if (round.count >= HAKAMA_ATTACKER_COUNT_LIMIT) {
      // Keep the door open until this frame's other overlapping coins are handled.
      round.closePending = true;
    }
    this.refreshHud();
    return true;
  }

  beginAttackerRound(outcome) {
    const totalRounds = outcome.kind === "big" ? 3 : 1;
    this.attackerRound = {
      active: true,
      code: outcome.code,
      totalRounds,
      roundNumber: 1,
      count: 0,
      elapsed: 0,
      closePending: false,
      nextStRemaining: outcome.nextStRemaining
    };
    this.setHakamaAttackerOpenProgress(1);
    this.setSpinLabel(`ATTACKER 1R 0/${HAKAMA_ATTACKER_COUNT_LIMIT}C`);
    this.showCallout(
      `${outcome.code} ${totalRounds}R ATTACKER START`,
      1.5,
      "jackpot"
    );
  }

  updateAttackerRound(delta) {
    const round = this.attackerRound;
    if (!round?.active) return;
    round.elapsed += delta;
    if (round.elapsed >= HAKAMA_ATTACKER_ROUND_SECONDS) {
      round.closePending = true;
    }
  }

  finalizeAttackerRoundIfPending() {
    const round = this.attackerRound;
    if (!round?.active || !round.closePending) return;
    this.setHakamaAttackerOpenProgress(0);
    if (round.roundNumber < round.totalRounds) {
      round.roundNumber += 1;
      round.count = 0;
      round.elapsed = 0;
      round.closePending = false;
      this.setHakamaAttackerOpenProgress(1);
      this.setSpinLabel(
        `ATTACKER ${round.roundNumber}R 0/${HAKAMA_ATTACKER_COUNT_LIMIT}C`
      );
      this.showCallout(
        `ATTACKER ${round.roundNumber}R START`,
        1.1,
        "jackpot"
      );
      return;
    }

    const nextStRemaining = round.nextStRemaining;
    this.attackerRound = null;
    this.stRemaining = nextStRemaining;
    this.setSpinLabel(this.stRemaining > 0 ? `ST ${this.stRemaining} / 5` : "CHANCE SLOT");
    this.showCallout(
      this.stRemaining > 0 ? `ATTACKER END - ST ${this.stRemaining}` : "ATTACKER END",
      1.25,
      "chance"
    );
    this.refreshHud();
  }

  triggerHanemonoOpening(openingCount = 1) {
    if (
      this.haneOpenTimer > 0
      || this.haneOpeningRepeatsRemaining > 0
      || this.isHanemonoRoleBusy()
    ) return false;
    this.haneOpenTimer = HANE_OPEN_SECONDS;
    this.haneOpeningRepeatsRemaining = Math.max(0, Math.floor(openingCount) - 1);
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
    if (
      this.haneOpenTimer <= 0
      && this.haneOpeningRepeatsRemaining > 0
      && this.haneOpenAmount <= HANE_REPEAT_REOPEN_THRESHOLD
      && !this.isHanemonoRoleBusy()
    ) {
      this.haneOpeningRepeatsRemaining -= 1;
      this.haneOpenTimer = HANE_OPEN_SECONDS;
    }
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
    const chucker = this.hakamaChuckers.find(item => {
      const x = item.visual.position.x;
      const y = item.visual.position.y;
      return hakamaChuckerEntryAt({
        phase: token.phase,
        chuckerX: x,
        chuckerY: y,
        currentX: token.body.position.x,
        currentY: token.body.position.y,
        previousY: token.previousY,
        velocityY: token.body.velocity.y
      });
    });
    return chucker?.side ?? 0;
  }

  handleHakamaChuckerEntry(side) {
    this.pendingPayout += HANE_CHUCKER_PAYOUT;
    const openingCount = side === 2 ? 2 : 1;
    const opened = this.triggerHanemonoOpening(openingCount);
    const chucker = this.hakamaChuckers.find(item => item.side === side);
    if (chucker) {
      chucker.flash = 0.72;
      chucker.opened = opened;
    }
    const openingLabel = openingCount === 2 ? "羽根OPEN×2" : "羽根OPEN";
    this.showCallout(
      opened ? `${openingLabel}・賞球${HANE_CHUCKER_PAYOUT}枚` : `賞球${HANE_CHUCKER_PAYOUT}枚`,
      0.95,
      opened ? "chance" : "normal"
    );
    this.refreshHud();
    return opened;
  }

  handleRolePocketEntry(slot) {
    const pocket = resolveStartPocket(slot);
    if (pocket.startsSpin) {
      this.pendingPayout += pocket.payout;
      this.queueSpin();
      this.flashSlot(slot, true);
      this.showCallout(`赤SPIN・${pocket.payout}枚放出`, 1.1, "chance");
    } else {
      this.flashSlot(slot, false);
    }
    this.refreshHud();
    return pocket;
  }

  updateHakamaChuckers(delta) {
    this.hakamaChuckers.forEach(chucker => {
      chucker.flash = Math.max(0, chucker.flash - delta);
      const active = chucker.flash > 0;
      const color = chucker.color;
      chucker.indicatorMaterial.color.setHex(active ? color : 0x566669);
      chucker.indicatorMaterial.emissive.setHex(active ? color : 0x11191a);
      chucker.indicatorMaterial.emissiveIntensity = active ? 1.35 : 0.12;
      const pulse = active ? 1 + Math.sin(this.elapsed * 22) * 0.12 : 1;
      chucker.indicator.scale.setScalar(pulse);
    });
  }

  createRoleSideNeon() {
    const diamondLayers = [
      {
        key: "halo",
        size: 0.24,
        color: 0x6874ff,
        alertColor: 0xff6f0f,
        baseOpacity: 0.1,
        pulseOpacity: 0.08,
        alertBaseOpacity: 0.08,
        alertPulseOpacity: 0.32
      },
      {
        key: "body",
        size: 0.15,
        color: 0xaab4ff,
        alertColor: 0xffa22b,
        baseOpacity: 0.34,
        pulseOpacity: 0.12,
        alertBaseOpacity: 0.2,
        alertPulseOpacity: 0.55
      },
      {
        key: "core",
        size: 0.07,
        color: 0xf4f9ff,
        alertColor: 0xfff0bd,
        baseOpacity: 0.84,
        pulseOpacity: 0.1,
        alertBaseOpacity: 0.42,
        alertPulseOpacity: 0.55
      }
    ];
    const sides = [
      { name: "left", x: -0.52 },
      { name: "right", x: 0.52 }
    ];
    const groups = [];
    const materials = [];
    const lights = [];

    sides.forEach(({ name, x }) => {
      const group = new THREE.Group();
      group.name = `icp-role-side-neon-diamond-${name}`;
      group.position.set(x, ROLE_ROTATOR_Y - 0.02, -1.618);
      group.userData.visualOnly = true;

      diamondLayers.forEach((layer, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.baseOpacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        });
        material.userData.neonNormalColor = layer.color;
        material.userData.neonAlertColor = layer.alertColor;
        material.userData.neonBaseOpacity = layer.baseOpacity;
        material.userData.neonPulseOpacity = layer.pulseOpacity;
        material.userData.neonAlertBaseOpacity = layer.alertBaseOpacity;
        material.userData.neonAlertPulseOpacity = layer.alertPulseOpacity;

        const diamond = new THREE.Mesh(
          new THREE.PlaneGeometry(layer.size, layer.size),
          material
        );
        diamond.name = `icp-role-side-neon-${name}-${layer.key}`;
        diamond.position.z = index * 0.002;
        diamond.rotation.z = Math.PI / 4;
        diamond.renderOrder = 4 + index;
        diamond.userData.visualOnly = true;
        group.add(diamond);
        materials.push(material);
      });

      this.scene.add(group);
      groups.push(group);

      const light = new THREE.PointLight(
        ROLE_SIDE_NEON_COLOR,
        0.42,
        0.95,
        2
      );
      light.name = `icp-role-side-neon-light-${name}`;
      light.position.set(x, ROLE_ROTATOR_Y - 0.02, -1.2);
      light.castShadow = false;
      light.userData.visualOnly = true;
      this.scene.add(light);
      lights.push(light);
    });

    this.roleSideNeon = {
      groups,
      materials,
      lights,
      roleCoinActive: false,
      alertPulse: 0
    };
    this.updateRoleSideNeon();
  }

  isRoleCoinActive() {
    return this.pachinkoTokens.some(token => (
      token.entryAuthorized
      && (token.phase === "role" || token.phase === "role-out")
    ));
  }

  updateRoleSideNeon() {
    if (!this.roleSideNeon) return;
    const roleCoinActive = this.isRoleCoinActive();
    const normalPhase = this.elapsed * Math.PI * 2 / ROLE_SIDE_NEON_PULSE_SECONDS;
    const normalPulse = (Math.sin(normalPhase) + 1) / 2;
    const alertPhase = this.elapsed * Math.PI * 2 / ROLE_SIDE_NEON_ALERT_BLINK_SECONDS;
    const alertPulse = Math.pow((Math.sin(alertPhase) + 1) / 2, 2.4);

    this.roleSideNeon.materials.forEach((material) => {
      material.color.setHex(
        roleCoinActive
          ? material.userData.neonAlertColor
          : material.userData.neonNormalColor
      );
      material.opacity = roleCoinActive
        ? material.userData.neonAlertBaseOpacity
          + alertPulse * material.userData.neonAlertPulseOpacity
        : material.userData.neonBaseOpacity
          + normalPulse * material.userData.neonPulseOpacity;
    });
    this.roleSideNeon.lights.forEach((light) => {
      light.color.setHex(
        roleCoinActive ? ROLE_SIDE_NEON_ALERT_COLOR : ROLE_SIDE_NEON_COLOR
      );
      light.intensity = roleCoinActive
        ? 0.15 + alertPulse * 1
        : 0.32 + normalPulse * 0.18;
    });
    this.roleSideNeon.roleCoinActive = roleCoinActive;
    this.roleSideNeon.alertPulse = roleCoinActive ? alertPulse : 0;
  }

  createRoleRotator() {
    const rotator = new THREE.Group();
    rotator.name = "icp-role-rotator";
    rotator.position.set(ROLE_ROTATOR_X, ROLE_ROTATOR_Y, -1.505);

    const startRouteMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfff2a6,
      emissive: 0xffc13a,
      emissiveIntensity: 0.55,
      metalness: 0.7,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    });
    const dividerMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf6fbff,
      emissive: 0x7ccfff,
      emissiveIntensity: 0.42,
      metalness: 0.94,
      roughness: 0.1,
      clearcoat: 1,
      clearcoatRoughness: 0.04
    });

    const routeRatios = [
      ROLE_ROTATOR_START_ROUTE_RATIO,
      ROLE_ROTATOR_OUT_ROUTE_RATIO,
      ROLE_ROTATOR_START_ROUTE_RATIO,
      ROLE_ROTATOR_OUT_ROUTE_RATIO
    ];
    const routeGap = 0.018;
    let routeStartAngle = 0;
    routeRatios.forEach((routeRatio, index) => {
      const routeAngle = Math.PI * 2 * routeRatio;
      if (index % 2 === 0) {
        const wedge = new THREE.Mesh(
          new THREE.RingGeometry(
            ROLE_ROTATOR_INNER_RADIUS,
            ROLE_ROTATOR_RADIUS,
            22,
            1,
            routeStartAngle + routeGap,
            routeAngle - routeGap * 2
          ),
          startRouteMaterial
        );
        wedge.name = "icp-role-rotator-start-route";
        wedge.castShadow = true;
        wedge.receiveShadow = true;
        rotator.add(wedge);
      }
      routeStartAngle += routeAngle;
    });

    const horizontal = new THREE.Mesh(
      new THREE.BoxGeometry(
        ROLE_ROTATOR_RADIUS * 2.05,
        ROLE_ROTATOR_DIVIDER_HALF_WIDTH * 2,
        0.075
      ),
      dividerMaterial
    );
    horizontal.name = "icp-role-rotator-divider-horizontal";
    horizontal.castShadow = true;
    horizontal.receiveShadow = true;
    rotator.add(horizontal);

    const angled = horizontal.clone();
    angled.name = "icp-role-rotator-divider-angled";
    angled.rotation.z = ROLE_ROTATOR_SECOND_DIVIDER_ANGLE;
    rotator.add(angled);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(ROLE_ROTATOR_RADIUS - 0.012, ROLE_ROTATOR_RADIUS + 0.018, 40),
      dividerMaterial
    );
    rim.name = "icp-role-rotator-rim";
    rim.castShadow = true;
    rotator.add(rim);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.075, 24),
      dividerMaterial
    );
    hub.name = "icp-role-rotator-hub";
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.035;
    hub.castShadow = true;
    rotator.add(hub);

    const rearOutMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x02090d,
      emissive: 0x001c25,
      emissiveIntensity: 0.42,
      metalness: 0.28,
      roughness: 0.32,
      clearcoat: 0.5
    });
    const rearOutMouth = new THREE.Mesh(
      new THREE.CircleGeometry(ROLE_ROTATOR_RADIUS * 0.97, 40),
      rearOutMaterial
    );
    rearOutMouth.name = "icp-role-rotator-rear-out-mouth";
    rearOutMouth.position.set(ROLE_ROTATOR_X, ROLE_ROTATOR_Y, -1.59);
    rearOutMouth.receiveShadow = true;
    this.scene.add(rearOutMouth);

    const rearOutPlateMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x754321,
      emissive: 0x2a1205,
      emissiveIntensity: 0.28,
      metalness: 0.5,
      roughness: 0.28,
      clearcoat: 0.5
    });
    const rearOutPlate = new THREE.Mesh(
      new THREE.BoxGeometry(
        ROLE_OUT_PLATE_WIDTH,
        ROLE_OUT_PLATE_HEIGHT,
        ROLE_OUT_PLATE_DEPTH
      ),
      rearOutPlateMaterial
    );
    rearOutPlate.name = "icp-role-rotator-rear-out-plate";
    rearOutPlate.position.set(
      ROLE_ROTATOR_X,
      ROLE_OUT_PLATE_Y,
      ROLE_OUT_PLATE_VISUAL_Z
    );
    rearOutPlate.rotation.x = ROLE_OUT_PLATE_TILT;
    rearOutPlate.castShadow = true;
    rearOutPlate.receiveShadow = true;
    this.scene.add(rearOutPlate);

    const rearOutPlateBody = new CANNON.Body({
      mass: 0,
      material: this.railMaterial
    });
    rearOutPlateBody.collisionFilterGroup = ROLE_OUT_COLLISION_GROUP;
    rearOutPlateBody.collisionFilterMask = ROLE_OUT_COLLISION_GROUP;
    rearOutPlateBody.addShape(new CANNON.Box(new CANNON.Vec3(
      ROLE_OUT_PLATE_WIDTH / 2,
      ROLE_OUT_PLATE_HEIGHT / 2,
      ROLE_OUT_PLATE_DEPTH / 2
    )));
    rearOutPlateBody.position.set(
      ROLE_ROTATOR_X,
      ROLE_OUT_PLATE_Y,
      ROLE_OUT_PLATE_BODY_Z
    );
    rearOutPlateBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      ROLE_OUT_PLATE_TILT
    );
    this.world.addBody(rearOutPlateBody);

    this.scene.add(rotator);
    this.roleRotator = {
      visual: rotator,
      rearOutMouth,
      rearOutPlate,
      rearOutPlateBody,
      elapsed: 0,
      angle: 0,
      angularVelocity: 0
    };
  }

  updateRoleRotator(delta) {
    if (!this.roleRotator?.visual) return;
    const cycle = ROLE_ROTATOR_CLOCKWISE_SECONDS + ROLE_ROTATOR_COUNTERCLOCKWISE_SECONDS;
    const time = ((this.roleRotator.elapsed % cycle) + cycle) % cycle;
    const direction = time < ROLE_ROTATOR_CLOCKWISE_SECONDS ? -1 : 1;
    const angularSpeed = Math.PI * 2 / ROLE_ROTATOR_FULL_TURN_SECONDS;
    this.roleRotator.angularVelocity = direction * angularSpeed;
    this.roleRotator.angle += this.roleRotator.angularVelocity * delta;
    this.roleRotator.visual.rotation.z = this.roleRotator.angle;
    this.roleRotator.elapsed += delta;
  }

  roleRotatorRouteFromDividerSides(dividerSides) {
    if (!Array.isArray(dividerSides) || dividerSides.length !== 2) return "";
    return dividerSides[0] === dividerSides[1] ? "out" : "start";
  }

  enterRoleOutRoute(token) {
    if (token.phase !== "role" || token.roleRotatorRoute !== "out") return false;
    const angle = this.roleRotator?.angle || 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const dx = token.body.position.x - ROLE_ROTATOR_X;
    const dy = token.body.position.y - ROLE_ROTATOR_Y;
    const localX = dx * cosine + dy * sine;
    const localY = -dx * sine + dy * cosine;
    const localDistance = Math.hypot(localX, localY);
    if (localDistance > 1e-7) {
      const anchorScale = ROLE_OUT_CAPTURE_RADIUS / localDistance;
      token.roleOutAnchorLocalX = localX * anchorScale;
      token.roleOutAnchorLocalY = localY * anchorScale;
    } else {
      const sectorDirection = token.roleRotatorDividerSides?.[0] || 1;
      const sectorCenterAngle = Math.PI / 2 + ROLE_ROTATOR_SECOND_DIVIDER_ANGLE / 2;
      token.roleOutAnchorLocalX = Math.cos(sectorCenterAngle)
        * ROLE_OUT_CAPTURE_RADIUS
        * sectorDirection;
      token.roleOutAnchorLocalY = Math.sin(sectorCenterAngle)
        * ROLE_OUT_CAPTURE_RADIUS
        * sectorDirection;
    }
    token.phase = "role-out";
    token.roleOutElapsed = 0;
    token.body.collisionFilterGroup = ROLE_OUT_COLLISION_GROUP;
    token.body.collisionFilterMask = ROLE_OUT_COLLISION_GROUP;
    token.body.velocity.x *= ROLE_OUT_PLANAR_VELOCITY_RETENTION;
    token.body.velocity.y *= ROLE_OUT_PLANAR_VELOCITY_RETENTION;
    token.body.velocity.z = Math.min(token.body.velocity.z, -0.035);
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    return true;
  }

  updateRoleOutToken(token, delta) {
    if (token.phase !== "role-out") return;
    token.roleOutElapsed += delta;
    const advanceRatio = clamp(
      (token.roleOutElapsed - ROLE_OUT_TARGET_ADVANCE_DELAY)
        / ROLE_OUT_TARGET_ADVANCE_SECONDS,
      0,
      1
    );
    const easedAdvance = advanceRatio * advanceRatio * (3 - 2 * advanceRatio);
    const targetZ = lerp(ROLE_OUT_REAR_BODY_Z, ROLE_OUT_EXIT_BODY_Z, easedAdvance);
    const acceleration = clamp(
      (targetZ - token.body.position.z) * ROLE_OUT_SUCTION_STIFFNESS
        - token.body.velocity.z * ROLE_OUT_SUCTION_DAMPING,
      -ROLE_OUT_SUCTION_MAX_ACCELERATION,
      ROLE_OUT_SUCTION_MAX_ACCELERATION
    );
    token.body.force.z += token.body.mass * acceleration;
    token.body.velocity.z = clamp(token.body.velocity.z, -1.15, 0.3);

    const angle = this.roleRotator?.angle || 0;
    const angularVelocity = this.roleRotator?.angularVelocity || 0;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const anchorOffsetX = token.roleOutAnchorLocalX * cosine
      - token.roleOutAnchorLocalY * sine;
    const anchorOffsetY = token.roleOutAnchorLocalX * sine
      + token.roleOutAnchorLocalY * cosine;
    const anchorX = ROLE_ROTATOR_X + anchorOffsetX;
    const anchorY = ROLE_ROTATOR_Y + anchorOffsetY;
    const anchorVelocityX = -angularVelocity * anchorOffsetY;
    const anchorVelocityY = angularVelocity * anchorOffsetX;
    const planarAccelerationX = clamp(
      (anchorX - token.body.position.x) * ROLE_OUT_PLANAR_STIFFNESS
        + (anchorVelocityX - token.body.velocity.x) * ROLE_OUT_PLANAR_DAMPING,
      -ROLE_OUT_PLANAR_MAX_ACCELERATION,
      ROLE_OUT_PLANAR_MAX_ACCELERATION
    );
    const planarAccelerationY = clamp(
      (anchorY - token.body.position.y) * ROLE_OUT_PLANAR_STIFFNESS
        + (anchorVelocityY - token.body.velocity.y) * ROLE_OUT_PLANAR_DAMPING
        + PACHINKO_GRAVITY,
      -ROLE_OUT_PLANAR_MAX_ACCELERATION,
      ROLE_OUT_PLANAR_MAX_ACCELERATION
    );
    token.body.force.x += token.body.mass * planarAccelerationX;
    token.body.force.y += token.body.mass * planarAccelerationY;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
  }

  separateRoleRotatorCircle(token, local, radius, keepInside) {
    const distance = Math.hypot(local.x, local.y);
    if (distance < 1e-7) return false;
    const coinRadius = PACHINKO_TOKEN_COLLIDER_RADIUS;
    const limit = keepInside ? radius - coinRadius : radius + coinRadius;
    const collides = keepInside ? distance > limit : distance < limit;
    if (!collides) return false;

    const normalDirection = keepInside ? -1 : 1;
    const normalLocalX = normalDirection * local.x / distance;
    const normalLocalY = normalDirection * local.y / distance;
    const correctedDistance = keepInside
      ? limit - ROLE_ROTATOR_PHYSICS_EPSILON
      : limit + ROLE_ROTATOR_PHYSICS_EPSILON;
    return {
      x: local.x / distance * correctedDistance,
      y: local.y / distance * correctedDistance,
      normalX: normalLocalX,
      normalY: normalLocalY
    };
  }

  separateRoleRotatorDivider(local, angle, lockedSide) {
    const coinRadius = PACHINKO_TOKEN_COLLIDER_RADIUS;
    const halfLength = ROLE_ROTATOR_CATCH_RADIUS;
    const halfWidth = ROLE_ROTATOR_DIVIDER_HALF_WIDTH + coinRadius;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const along = local.x * cosine + local.y * sine;
    const across = -local.x * sine + local.y * cosine;
    if (
      Math.abs(along) > halfLength + coinRadius
      || lockedSide * across >= halfWidth
    ) {
      return null;
    }

    const correctedAcross = lockedSide * (halfWidth + ROLE_ROTATOR_PHYSICS_EPSILON);
    return {
      x: along * cosine - correctedAcross * sine,
      y: along * sine + correctedAcross * cosine,
      normalX: -lockedSide * sine,
      normalY: lockedSide * cosine
    };
  }

  resolveRoleRotatorTokenContact(token) {
    if (
      (token.phase !== "role" && token.phase !== "role-out")
      || !this.roleRotator?.visual
    ) return false;

    const dx = token.body.position.x - ROLE_ROTATOR_X;
    const dy = token.body.position.y - ROLE_ROTATOR_Y;
    const distance = Math.hypot(dx, dy);
    const captureRadius = ROLE_ROTATOR_CATCH_RADIUS + PACHINKO_TOKEN_COLLIDER_RADIUS;
    if (
      token.phase === "role"
      && token.roleRotatorCaptured
      && dy < 0
      && distance > ROLE_ROTATOR_RELEASE_RADIUS
    ) {
      token.roleRotatorCaptured = false;
      token.roleRotatorReleased = true;
      token.roleRotatorDividerSides = null;
      return false;
    }
    if (
      !token.roleRotatorCaptured
      && !token.roleRotatorReleased
      && distance <= captureRadius
    ) {
      token.roleRotatorCaptured = true;
      token.body.velocity.x *= 0.72;
      token.body.velocity.y *= 0.72;
    }
    if (!token.roleRotatorCaptured) return false;

    const angle = this.roleRotator.angle;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const local = {
      x: dx * cosine + dy * sine,
      y: -dx * sine + dy * cosine
    };
    const dividerAngles = [0, ROLE_ROTATOR_SECOND_DIVIDER_ANGLE];
    if (!token.roleRotatorDividerSides) {
      token.roleRotatorDividerSides = dividerAngles.map(dividerAngle => {
        const dividerCosine = Math.cos(dividerAngle);
        const dividerSine = Math.sin(dividerAngle);
        const across = -local.x * dividerSine + local.y * dividerCosine;
        return across >= 0 ? 1 : -1;
      });
      token.roleRotatorRoute = this.roleRotatorRouteFromDividerSides(
        token.roleRotatorDividerSides
      );
      if (token.roleRotatorRoute === "out") this.enterRoleOutRoute(token);
    }

    const resolvedLocal = { ...local };
    let hit = null;
    let largestCorrection = -1;
    for (let iteration = 0; iteration < ROLE_ROTATOR_CONTACT_ITERATIONS; iteration += 1) {
      let corrected = false;
      const resolveSeparation = separation => {
        if (!separation) return;
        const correction = Math.hypot(
          separation.x - resolvedLocal.x,
          separation.y - resolvedLocal.y
        );
        resolvedLocal.x = separation.x;
        resolvedLocal.y = separation.y;
        if (correction > largestCorrection) {
          largestCorrection = correction;
          hit = separation;
        }
        corrected = true;
      };
      resolveSeparation(
        this.separateRoleRotatorCircle(
          token,
          resolvedLocal,
          ROLE_ROTATOR_INNER_RADIUS,
          false
        )
      );
      dividerAngles.forEach((dividerAngle, index) => {
        resolveSeparation(
          this.separateRoleRotatorDivider(
            resolvedLocal,
            dividerAngle,
            token.roleRotatorDividerSides[index]
          )
        );
      });
      if (!corrected) break;
    }
    if (!hit) return false;

    const worldNormalX = hit.normalX * cosine - hit.normalY * sine;
    const worldNormalY = hit.normalX * sine + hit.normalY * cosine;
    token.body.position.x = ROLE_ROTATOR_X
      + resolvedLocal.x * cosine
      - resolvedLocal.y * sine;
    token.body.position.y = ROLE_ROTATOR_Y
      + resolvedLocal.x * sine
      + resolvedLocal.y * cosine;

    const correctedDx = token.body.position.x - ROLE_ROTATOR_X;
    const correctedDy = token.body.position.y - ROLE_ROTATOR_Y;
    const wallVelocityX = -this.roleRotator.angularVelocity * correctedDy;
    const wallVelocityY = this.roleRotator.angularVelocity * correctedDx;
    const relativeVelocityX = token.body.velocity.x - wallVelocityX;
    const relativeVelocityY = token.body.velocity.y - wallVelocityY;
    const normalSpeed = relativeVelocityX * worldNormalX
      + relativeVelocityY * worldNormalY;
    const tangentX = -worldNormalY;
    const tangentY = worldNormalX;
    const tangentSpeed = (
      relativeVelocityX * tangentX + relativeVelocityY * tangentY
    ) * ROLE_ROTATOR_PHYSICS_TANGENT_RETENTION;
    const reboundSpeed = normalSpeed < 0
      ? -normalSpeed * ROLE_ROTATOR_PHYSICS_RESTITUTION
      : normalSpeed;
    token.body.velocity.x = wallVelocityX
      + tangentX * tangentSpeed
      + worldNormalX * reboundSpeed;
    token.body.velocity.y = wallVelocityY
      + tangentY * tangentSpeed
      + worldNormalY * reboundSpeed;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    return true;
  }

  resolveUnauthorizedRoleBottomEntry(token) {
    const collision = roleBottomGuardCollisionAt({
      phase: token.phase,
      entryAuthorized: token.entryAuthorized,
      previousX: token.previousX,
      previousY: token.previousY,
      currentX: token.body.position.x,
      currentY: token.body.position.y,
      velocityX: token.body.velocity.x,
      velocityY: token.body.velocity.y
    });
    if (!collision) return false;

    token.body.position.x = collision.x;
    token.body.position.y = collision.y;
    token.body.velocity.x = collision.velocityX;
    token.body.velocity.y = collision.velocityY;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    return true;
  }

  updatePusher(delta) {
    const targetZ = pusherPositionAt(Math.max(0, this.elapsed - PUSHER_START_DELAY));
    const physicsZ = this.pusherBody.position.z;
    const queuedPhysicsTime = Math.max(0, (this.world.accumulator || 0) + delta);
    const anticipatedSubsteps = clamp(
      Math.floor((queuedPhysicsTime + 1e-8) / FIXED_STEP),
      0,
      MAX_SUB_STEPS
    );
    const integrationWindow = Math.max(FIXED_STEP, anticipatedSubsteps * FIXED_STEP);
    this.wakeTableCoinsForPusherSweep(physicsZ, targetZ);
    this.pusherBody.wakeUp();
    this.pusherBody.velocity.set(0, 0, (targetZ - physicsZ) / integrationWindow);
    this.pusherBody.aabbNeedsUpdate = true;
  }

  syncPusherVisual() {
    this.pusherVisual.position.copy(this.pusherBody.position);
  }

  wakeTableCoinsForPusherSweep(previousZ, nextZ) {
    if (!this.pusherPlateShape || nextZ <= previousZ || this.tableCoins.length === 0) return 0;
    const halfExtents = this.pusherPlateShape.halfExtents;
    const previousFrontZ = previousZ + PUSHER_PLATE_FRONT_OFFSET_Z;
    const nextFrontZ = nextZ + PUSHER_PLATE_FRONT_OFFSET_Z;
    const pusherMinY = this.pusherBody.position.y - halfExtents.y;
    const pusherMaxY = this.pusherBody.position.y + halfExtents.y;
    let wokenCount = 0;

    // Wake only coins crossed by the forward face so Cannon resolves every physical contact.
    this.tableCoins.forEach(coin => {
      const body = coin.body;
      const radius = coin.radius || TABLE_COIN_RADIUS;
      if (Math.abs(body.position.x) > halfExtents.x + radius + PUSHER_COIN_WAKE_SWEEP_MARGIN) return;
      if (body.position.y + radius < pusherMinY - PUSHER_COIN_WAKE_SWEEP_MARGIN) return;
      if (body.position.y - radius > pusherMaxY + PUSHER_COIN_WAKE_SWEEP_MARGIN) return;
      if (body.position.z + radius < previousFrontZ - PUSHER_COIN_WAKE_SWEEP_MARGIN) return;
      if (body.position.z - radius > nextFrontZ + PUSHER_COIN_WAKE_SWEEP_MARGIN) return;
      const wasSleeping = body.sleepState === CANNON.Body.SLEEPING;
      body.wakeUp();
      if (wasSleeping) wokenCount += 1;
    });
    return wokenCount;
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
    this.entrySeesaws.forEach(seesaw => {
      const speed = ENTRY_SEESAW_SPEED * (seesaw.side === 0 ? 1 : SIDE_ENTRY_SEESAW_SPEED_RATIO);
      const swing = Math.sin(this.elapsed * speed) * ENTRY_SEESAW_MAX_ANGLE;
      const swingVelocity = Math.cos(this.elapsed * speed)
        * ENTRY_SEESAW_MAX_ANGLE
        * speed;
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

  guideRoleSideOutPocketToken(token) {
    if (token.phase !== "role") return -1;
    const absoluteX = Math.abs(token.body.position.x);
    if (
      absoluteX < ROLE_SIDE_OUT_LANE_INNER_ABS_X
      || absoluteX > ROLE_SIDE_OUT_LANE_OUTER_ABS_X
      || token.body.position.y > ROLE_SIDE_OUT_GUIDE_TOP_Y
      || token.body.position.y < ROLE_SIDE_OUT_GUIDE_BOTTOM_Y
    ) {
      return -1;
    }

    const side = token.body.position.x < 0 ? -1 : 1;
    const targetX = side * ROLE_SIDE_OUT_CENTER_ABS_X;
    const accelerationX = clamp(
      (targetX - token.body.position.x) * ROLE_SIDE_OUT_HORIZONTAL_STIFFNESS
        - token.body.velocity.x * ROLE_SIDE_OUT_HORIZONTAL_DAMPING,
      -ROLE_SIDE_OUT_HORIZONTAL_MAX_ACCELERATION,
      ROLE_SIDE_OUT_HORIZONTAL_MAX_ACCELERATION
    );
    const verticalController = (
      (ROLE_SIDE_OUT_TARGET_Y - token.body.position.y) * ROLE_SIDE_OUT_VERTICAL_STIFFNESS
        - token.body.velocity.y * ROLE_SIDE_OUT_VERTICAL_DAMPING
    );
    // Once the token overlaps the mouth approach, suction never pushes it back upward.
    const accelerationY = clamp(
      Math.min(verticalController, -ROLE_SIDE_OUT_MIN_DOWNWARD_ACCELERATION),
      -ROLE_SIDE_OUT_VERTICAL_MAX_ACCELERATION,
      -ROLE_SIDE_OUT_MIN_DOWNWARD_ACCELERATION
    );
    token.body.force.x += token.body.mass * accelerationX;
    token.body.force.y += token.body.mass * accelerationY;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    return side < 0 ? 0 : 2;
  }

  getLauncherLaneForwardVector(token) {
    if (
      token.phase !== "board"
      || token.clearedBallReturn
    ) {
      return null;
    }
    const { x, y } = token.body.position;
    if (
      x >= LAUNCH_LANE_VERTICAL_MIN_X
      && x <= LAUNCH_LANE_VERTICAL_MAX_X
      && y >= LAUNCH_LANE_VERTICAL_MIN_Y
      && y <= LAUNCH_LANE_VERTICAL_MAX_Y
    ) {
      return { x: 0, y: 1 };
    }
    const relativeY = y - PACHINKO_FIELD_CENTER_Y;
    const radius = Math.hypot(x, relativeY);
    const angle = normalizeAngle(Math.atan2(relativeY, x));
    if (
      radius < BALL_RETURN_MIN_RADIUS
      || radius > BALL_RETURN_MAX_RADIUS
      || angle < BALL_RETURN_ANGLE - LAUNCH_LANE_ARC_ANGLE_MARGIN
      || angle > Math.PI + LAUNCH_LANE_ARC_ANGLE_MARGIN
    ) {
      return null;
    }
    return {
      x: Math.sin(angle),
      y: -Math.cos(angle)
    };
  }

  applyLauncherLaneForwardAssist(token, delta) {
    const forward = this.getLauncherLaneForwardVector(token);
    if (!forward) return false;
    const forwardSpeed = token.body.velocity.x * forward.x
      + token.body.velocity.y * forward.y;
    const minimumForwardSpeed = lerp(
      LAUNCH_LANE_MIN_FORWARD_SPEED_MIN,
      LAUNCH_LANE_MIN_FORWARD_SPEED_MAX,
      clamp(token.launchStrokeRatio ?? 0, 0, 1)
    );
    if (forwardSpeed >= minimumForwardSpeed) return false;

    const rollbackStopped = forwardSpeed < 0;
    const protectedSpeed = Math.max(
      forwardSpeed,
      LAUNCH_LANE_ROLLBACK_FLOOR_SPEED
    );
    const assistedSpeed = Math.min(
      minimumForwardSpeed,
      protectedSpeed + LAUNCH_LANE_ASSIST_ACCELERATION * delta
    );
    const correction = assistedSpeed - forwardSpeed;
    token.body.velocity.x += forward.x * correction;
    token.body.velocity.y += forward.y * correction;
    token.launcherAssistFrames += 1;
    if (rollbackStopped) token.launcherRollbackStops += 1;
    token.body.aabbNeedsUpdate = true;
    token.body.wakeUp();
    return true;
  }

  updatePachinkoTokens(delta) {
    for (let index = this.pachinkoTokens.length - 1; index >= 0; index -= 1) {
      const token = this.pachinkoTokens[index];

      if (token.phase !== "role-out" && token.phase !== "attacker") {
        token.body.position.z = BOARD_Z;
        token.body.velocity.z = 0;
      }
      token.body.angularVelocity.set(0, 0, 0);
      if (token.phase === "attacker") {
        if (this.updateHakamaAttackerToken(token, delta)) {
          this.handleHakamaAttackerEntry();
          this.removePachinkoToken(index);
          continue;
        }
      }
      this.resolveSeesawTokenContact(token);
      this.resolveEntryPlasticGuideTokenContact(token);
      this.resolveUnauthorizedRoleBottomEntry(token);
      this.resolveRoleRotatorTokenContact(token);
      this.updateRoleOutToken(token, delta);
      this.guideRoleSideOutPocketToken(token);
      this.applyPachinkoSlopeAcceleration(token, delta);
      this.applyLauncherLaneForwardAssist(token, delta);
      token.visual.position.copy(token.body.position);
      if (token.phase === "role-out") {
        const depthProgress = clamp(
          (BOARD_Z - token.body.position.z) / (BOARD_Z - ROLE_OUT_EXIT_BODY_Z),
          0,
          1
        );
        token.visual.position.z = lerp(
          PACHINKO_TOKEN_FRONT_VISUAL_Z,
          ROLE_OUT_EXIT_VISUAL_Z,
          depthProgress
        );
      } else if (token.phase === "attacker") {
        token.visual.position.z = Number.isFinite(token.attackerVisualZ)
          ? token.attackerVisualZ
          : token.body.position.z + PACHINKO_TOKEN_ATTACKER_VISUAL_OFFSET_Z;
        token.visual.rotation.set(
          -Math.PI / 2 + (token.attackerRoll || 0),
          0,
          Math.sin(Math.PI * clamp(
            (token.attackerElapsed - HAKAMA_ATTACKER_CATCH_HOLD_SECONDS)
              / HAKAMA_ATTACKER_SENSOR_TRAVEL_SECONDS,
            0,
            1
          )) * 0.08
        );
      } else {
        token.visual.position.z = PACHINKO_TOKEN_FRONT_VISUAL_Z;
      }
      if (token.phase !== "attacker") token.visual.rotation.set(-Math.PI / 2, 0, 0);

      if (token.phase === "role-out") {
        const reachedRearOut = token.body.position.z <= ROLE_OUT_TRIGGER_BODY_Z;
        if (reachedRearOut || token.roleOutElapsed >= ROLE_OUT_MAX_SECONDS) {
          this.removePachinkoToken(index);
          continue;
        }
      }

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

      if (this.enterHakamaAttacker(token)) {
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

      const sideOutCapture = roleSideOutPocketCaptureAt({
        x: token.body.position.x,
        y: token.body.position.y
      });
      const enteredStartChucker = (
        sideOutCapture.slot < 0
        && token.body.position.y <= ROLE_SLOT_Y + 0.08
      );
      if (
        token.phase === "role"
        && (sideOutCapture.captured || enteredStartChucker)
      ) {
        const slot = sideOutCapture.captured ? sideOutCapture.slot : 1;
        this.handleRolePocketEntry(slot);
        this.removePachinkoToken(index);
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
    this.ballReturnGate.pivot.rotation.z = this.ballReturnGate.closedAngle + swing * 0.95;
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
    token.roleRotatorCaptured = false;
    token.roleRotatorReleased = false;
    token.roleRotatorDividerSides = null;
    token.roleRotatorRoute = "";
    token.roleOutElapsed = 0;
    token.roleOutAnchorLocalX = 0;
    token.roleOutAnchorLocalY = 0;
    token.body.type = CANNON.Body.DYNAMIC;
    token.body.mass = PACHINKO_TOKEN_MASS;
    token.body.collisionFilterGroup = PACHINKO_FRONT_COLLISION_GROUP;
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
      if (!pad) return;
      const flash = Math.max(0, (pad.userData.flash || 0) - delta);
      pad.userData.flash = flash;
      const base = index === 1 ? 0.94 : 0.52;
      pad.material.opacity = flash > 0 ? 1 : base;
      pad.scale.y = flash > 0 ? 1.18 : 1;
    });
  }

  refreshPusherPlateTopContactBodies() {
    const contactBodies = this.pusherPlateTopContactBodies;
    contactBodies.clear();
    if (!this.pusherPlateShape || !this.pusherBody) return contactBodies;
    for (const contact of this.world.contacts || []) {
      if (contact.bi === this.pusherBody) {
        if (
          contact.si === this.pusherPlateShape
          && contact.ni.y >= PUSHER_COIN_TOP_CONTACT_NORMAL_MIN_Y
        ) contactBodies.add(contact.bj);
      } else if (contact.bj === this.pusherBody) {
        if (
          contact.sj === this.pusherPlateShape
          && -contact.ni.y >= PUSHER_COIN_TOP_CONTACT_NORMAL_MIN_Y
        ) contactBodies.add(contact.bi);
      }
    }
    return contactBodies;
  }

  hasPusherPlateTopContact(coin) {
    if (!coin?.body || !this.pusherPlateShape || !this.pusherBody) return false;
    return this.pusherPlateTopContactBodies.has(coin.body);
  }

  isCoinRestingOnPusherPlate(coin) {
    if (!coin?.body || !this.pusherPlateShape || !this.pusherBody) return false;
    const body = coin.body;
    const radius = coin.radius || TABLE_COIN_RADIUS;
    const thickness = coin.thickness || TABLE_COIN_COLLIDER_THICKNESS;
    const halfExtents = this.pusherPlateShape.halfExtents;
    const plateCenterZ = this.pusherBody.position.z + PUSHER_PLATE_CENTER_OFFSET_Z;
    const expectedCenterY = this.pusherBody.position.y + halfExtents.y + thickness / 2;
    const quaternion = body.quaternion;
    const verticalAxisAlignment = Math.abs(
      1 - 2 * (quaternion.x * quaternion.x + quaternion.z * quaternion.z)
    );
    const edgeAllowance = radius * PUSHER_COIN_SUPPORT_EDGE_RADIUS_RATIO;

    return (
      verticalAxisAlignment >= PUSHER_COIN_SUPPORT_MIN_FLATNESS
      && Math.abs(body.velocity.y) <= PUSHER_COIN_SUPPORT_MAX_VERTICAL_SPEED
      && Math.abs(body.position.y - expectedCenterY) <= PUSHER_COIN_SUPPORT_Y_TOLERANCE
      && Math.abs(body.position.x) <= halfExtents.x + edgeAllowance
      && Math.abs(body.position.z - plateCenterZ) <= halfExtents.z + edgeAllowance
    );
  }

  applyPusherPlateTraction(coin, delta) {
    if (!coin?.body || !this.pusherPlateShape || !this.pusherBody) return false;
    const hasTopContact = this.hasPusherPlateTopContact(coin);
    const hasGeometricSupport = this.isCoinRestingOnPusherPlate(coin);
    if (hasTopContact) {
      coin.pusherPlateContactGrace = PUSHER_COIN_CONTACT_GRACE_SECONDS;
    } else {
      coin.pusherPlateContactGrace = Math.max(
        0,
        (coin.pusherPlateContactGrace || 0) - delta
      );
    }
    const isSupported = hasTopContact || (
      hasGeometricSupport
      && (
        coin.pusherPlateContactGrace > 0
        || Math.abs(coin.body.velocity.y) <= 0.08
      )
    );
    coin.pusherPlateDirectContact = hasTopContact;
    coin.pusherPlateSupported = isSupported;
    if (!isSupported) {
      coin.pusherPlateRelativeVelocityZ = 0;
      return false;
    }

    // Static friction sticks while the required acceleration is within the material limit.
    const relativeVelocityZ = this.pusherBody.velocity.z - coin.body.velocity.z;
    const maximumVelocityChange = PUSHER_COIN_TRACTION_MAX_ACCELERATION * delta;
    coin.body.velocity.z += clamp(
      relativeVelocityZ,
      -maximumVelocityChange,
      maximumVelocityChange
    );
    coin.pusherPlateRelativeVelocityZ = this.pusherBody.velocity.z - coin.body.velocity.z;
    coin.pusherPlateSupportFrames += 1;
    if (!hasTopContact) coin.pusherPlateGraceFrames += 1;
    coin.body.aabbNeedsUpdate = true;
    coin.body.wakeUp();
    return true;
  }

  applyPusherPlateTractionBeforeIntegration() {
    this.refreshPusherPlateTopContactBodies();
    this.tableCoins.forEach(coin => this.applyPusherPlateTraction(coin, FIXED_STEP));
  }

  updateTableCoins(delta) {
    for (let index = this.tableCoins.length - 1; index >= 0; index -= 1) {
      const coin = this.tableCoins[index];
      coin.age += delta;
      const body = coin.body;
      const payoutFlowDirectionX = coin.payoutChuteFlowDirectionX === 1 ? 1 : -1;
      if (
        coin.payoutChuteGuideActive
        && (
          (
            body.position.x * payoutFlowDirectionX >= -PAYOUT_CHUTE_GUIDE_RELEASE_X
            && body.position.y <= PAYOUT_CHUTE_GUIDE_RELEASE_Y
          )
          || coin.age >= PAYOUT_CHUTE_GUIDE_MAX_SECONDS
        )
      ) {
        coin.payoutChuteGuideActive = false;
        coin.payoutChuteExitMomentumActive = true;
        body.linearFactor.set(1, 1, 1);
        body.angularFactor.set(1, 1, 1);
        body.velocity.x += payoutFlowDirectionX * coin.payoutChuteExitVelocityBoost;
        coin.payoutChuteLandingMomentumActive = true;
        coin.payoutChuteLandingMomentumVelocityX = body.velocity.x;
        coin.payoutChuteLandingMomentumElapsed = 0;
        coin.payoutChuteStaticBedMomentumAdjusted = false;
        body.wakeUp();
      }
      if (coin.payoutChuteLandingMomentumActive) {
        coin.payoutChuteLandingMomentumElapsed += delta;
        let touchesStaticBed = false;
        const hasPhysicalBlocker = (this.world.contacts || []).some(contact => {
          let otherBody = null;
          if (contact.bi === body) otherBody = contact.bj;
          else if (contact.bj === body) otherBody = contact.bi;
          if (otherBody === this.staticBedBody) touchesStaticBed = true;
          return otherBody && otherBody.mass > 0;
        });
        if (hasPhysicalBlocker) {
          coin.payoutChuteLandingMomentumActive = false;
        } else {
          if (touchesStaticBed && !coin.payoutChuteStaticBedMomentumAdjusted) {
            coin.payoutChuteLandingMomentumVelocityX *= PAYOUT_CHUTE_STATIC_BED_MOMENTUM_RETENTION;
            body.velocity.x = payoutFlowDirectionX * Math.min(
              body.velocity.x * payoutFlowDirectionX,
              coin.payoutChuteLandingMomentumVelocityX * payoutFlowDirectionX
            );
            coin.payoutChuteStaticBedMomentumAdjusted = true;
          }
          // Carry rail-earned speed through the landing without changing vertical physics.
          body.velocity.x = payoutFlowDirectionX * Math.max(
            body.velocity.x * payoutFlowDirectionX,
            coin.payoutChuteLandingMomentumVelocityX * payoutFlowDirectionX
          );
          const momentumEndDistanceX = coin.payoutChuteStaticBedMomentumAdjusted
            ? PAYOUT_CHUTE_STATIC_BED_MOMENTUM_END_DISTANCE_X
            : PAYOUT_CHUTE_LANDING_MOMENTUM_END_DISTANCE_X;
          if (
            body.position.x * payoutFlowDirectionX >= momentumEndDistanceX
            || coin.payoutChuteLandingMomentumElapsed >= PAYOUT_CHUTE_LANDING_MOMENTUM_MAX_SECONDS
          ) {
            coin.payoutChuteLandingMomentumActive = false;
          }
        }
      }
      if (
        coin.payoutChuteExitMomentumActive
        && body.velocity.x * payoutFlowDirectionX <= TABLE_COIN_HORIZONTAL_SPEED_LIMIT
      ) {
        coin.payoutChuteExitMomentumActive = false;
      }
      const minimumVelocityX = (
        coin.payoutChuteExitMomentumActive
        && payoutFlowDirectionX < 0
      )
        ? -PAYOUT_CHUTE_EXIT_SPEED_LIMIT
        : -TABLE_COIN_HORIZONTAL_SPEED_LIMIT;
      const maximumVelocityX = (
        coin.payoutChuteExitMomentumActive
        && payoutFlowDirectionX > 0
      )
        ? PAYOUT_CHUTE_EXIT_SPEED_LIMIT
        : TABLE_COIN_HORIZONTAL_SPEED_LIMIT;
      body.velocity.x = clamp(
        body.velocity.x,
        minimumVelocityX,
        maximumVelocityX
      );
      body.velocity.y = clamp(body.velocity.y, -3.8, 2.5);
      body.velocity.z = clamp(body.velocity.z, -2.2, 2.6);
      body.angularVelocity.x = clamp(body.angularVelocity.x, -7, 7);
      body.angularVelocity.y = clamp(body.angularVelocity.y, -7, 7);
      const angularSpeedLimit = coin.payoutChuteGuideActive
        ? PAYOUT_CHUTE_GUIDED_ANGULAR_SPEED_MAX
        : 7;
      body.angularVelocity.z = clamp(
        body.angularVelocity.z,
        -angularSpeedLimit,
        angularSpeedLimit
      );
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
    this.syncTableCoinInstances();
  }

  beginCollectCoin(index) {
    const coin = this.tableCoins[index];
    if (!coin || coin.collected) return;
    coin.collected = true;
    this.detachTableCoinVisual(coin);
    this.world.removeBody(coin.body);
    this.tableCoins.splice(index, 1);
    this.syncTableCoinInstances();
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
    this.syncTableCoinInstances();
  }

  removeOldestLostCoin() {
    const candidate = this.tableCoins.findIndex(coin => (
      coin.body.position.y < -2.4
      || Math.abs(coin.body.position.x) > 4.2
      || coin.body.position.z < -3.8
    ));
    // The threshold is only a cleanup prompt; an active coin on the bed is never evicted.
    if (candidate < 0) return false;
    this.removeCoin(candidate);
    return true;
  }

  queueSpin() {
    if (this.spin || this.spinDelay > 0) this.pendingSpins += 1;
    else this.startSpin();
  }

  startSpin() {
    const chance = drawPseudoChance(this.random, this.stRemaining);
    const outcome = drawChanceBasedJackpotOutcome(chance, this.random, this.stRemaining);
    this.spin = {
      phase: "pseudo",
      stage: "rolling",
      chance,
      outcome,
      elapsed: 0,
      duration: SPIN_SECOND_LOCK_AT,
      tick: 0
    };
    this.setLcdDigitsVisible(true);
    this.setLcdPalette();
    this.setSpinLabel(this.stRemaining > 0 ? `ST ${this.stRemaining} / 5 CHANCE` : "HIT CHANCE");
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
    if (spin.phase === "pseudo" && spin.stage === "blinking") {
      spin.elapsed += delta;
      if (spin.elapsed >= PSEUDO_RESULT_BLINK_DURATION) {
        this.setLcdDigitsVisible(true);
        spin.stage = "hold";
        spin.elapsed = 0;
        return;
      }
      const blinkStep = Math.floor(spin.elapsed / PSEUDO_RESULT_BLINK_HALF_CYCLE);
      if (blinkStep !== spin.blinkStep) {
        spin.blinkStep = blinkStep;
        this.setLcdDigitsVisible(blinkStep % 2 === 0);
      }
      return;
    }
    if (spin.phase === "pseudo" && spin.stage === "hold") {
      spin.elapsed += delta;
      if (spin.elapsed < PSEUDO_RESULT_HOLD_DURATION) return;
      spin.phase = "main";
      spin.stage = "rolling";
      spin.elapsed = 0;
      spin.duration = SPIN_FIRST_LOCK_AT + getMainDigitLockGap(spin.outcome.code);
      spin.tick = 0;
      this.setLcdDigitsVisible(true);
      this.setLcdPalette();
      this.setSpinLabel(this.stRemaining > 0 ? `ST ${this.stRemaining} / 5 MAIN` : "MAIN SPIN");
      return;
    }
    spin.elapsed += delta;
    spin.tick -= delta;
    const displayCode = spin.phase === "pseudo" ? spin.chance.code : spin.outcome.code;
    const lockLeftAt = spin.phase === "pseudo" ? SPIN_SECOND_LOCK_AT : SPIN_FIRST_LOCK_AT;
    const lockRightAt = spin.phase === "pseudo" ? SPIN_FIRST_LOCK_AT : spin.duration;
    if (spin.tick <= 0) {
      spin.tick = 0.065;
      const left = spin.elapsed >= lockLeftAt ? displayCode[0] : String(Math.floor(this.random() * 10));
      const right = spin.elapsed >= lockRightAt ? displayCode[1] : String(Math.floor(this.random() * 10));
      this.setDigits(`${left}${right}`);
    }
    if (spin.elapsed < spin.duration) return;
    this.setDigits(displayCode);
    if (spin.phase === "pseudo") {
      this.setLcdPalette(PSEUDO_LCD_PALETTES[spin.chance.code]);
      spin.stage = "blinking";
      spin.elapsed = 0;
      spin.tick = 0;
      spin.blinkStep = 0;
      this.setLcdDigitsVisible(true);
      return;
    }
    this.resolveSpin();
  }

  resolveSpin() {
    const { outcome } = this.spin;
    this.setDigits(outcome.code);
    if (outcome.kind !== "big" && outcome.kind !== "small") {
      this.stRemaining = outcome.nextStRemaining;
    }
    this.root.classList.remove("is-spinning", "is-jackpot-big", "is-jackpot-small");
    if (outcome.kind === "big") {
      this.root.classList.add("is-jackpot-big");
      this.showCallout("77 JACKPOT・48枚大量放出", 3.5, "jackpot");
      this.setSpinLabel("SUPER JACKPOT");
      this.cameraShake = 0.12;
      this.beginAttackerRound(outcome);
    } else if (outcome.kind === "small") {
      this.root.classList.add("is-jackpot-small");
      this.showCallout("33 HIT・14枚放出", 2.6, "small-hit");
      this.setSpinLabel("MINI JACKPOT");
      this.cameraShake = 0.075;
      this.beginAttackerRound(outcome);
    } else {
      this.showCallout(this.stRemaining > 0 ? `ST残り ${this.stRemaining} 回` : "次のSPINを狙おう", 1.25, "normal");
      this.setSpinLabel(this.stRemaining > 0 ? `ST ${this.stRemaining} / 5` : "CHANCE SLOT");
    }
    this.spin = null;
    this.spinDelay = 0.8;
    this.refreshHud();
  }

  spawnPayoutCoin(wallSide) {
    const normalizedWallSide = wallSide < 0 ? -1 : 1;
    const flowDirectionX = -normalizedWallSide;
    const chuteZ = this.payoutChuteBody.position.z + PAYOUT_CHUTE_FIXED_Z;
    const payoutStrength = clamp(Number(this.random()), 0, 1 - Number.EPSILON);
    const releaseSpeed = PAYOUT_CHUTE_RELEASE_SPEED_MIN
      + payoutStrength * PAYOUT_CHUTE_RELEASE_SPEED_VARIATION;
    const entryFlowX = normalizedWallSide * PAYOUT_CHUTE_ENTRY_FLOW.flowX;
    const releaseVelocityX = entryFlowX * releaseSpeed
      + flowDirectionX * PAYOUT_CHUTE_RELEASE_X_BIAS;
    const releaseVelocityY = PAYOUT_CHUTE_ENTRY_FLOW.flowY * releaseSpeed;
    const rollingSpeed = releaseVelocityX * entryFlowX
      + releaseVelocityY * PAYOUT_CHUTE_ENTRY_FLOW.flowY;
    return this.spawnTableCoin(normalizedWallSide * PAYOUT_CHUTE_SPAWN_X, chuteZ, {
      y: this.payoutChuteBody.position.y + PAYOUT_CHUTE_SPAWN_Y,
      vx: releaseVelocityX,
      vy: releaseVelocityY,
      uprightAlongZ: true,
      angularVelocityZ: normalizedWallSide * rollingSpeed / TABLE_COIN_RADIUS,
      payoutChuteFlowDirectionX: flowDirectionX,
      payoutChuteExitVelocityBoost: lerp(
        PAYOUT_CHUTE_EXIT_VELOCITY_BOOST_MIN,
        PAYOUT_CHUTE_EXIT_VELOCITY_BOOST_MAX,
        payoutStrength
      ),
      minX: -PAYOUT_CHUTE_START_X,
      maxX: PAYOUT_CHUTE_START_X,
      value: 1
    });
  }

  updatePayout(delta) {
    if (this.pendingPayout <= 0) {
      this.payoutAccumulator = 0;
      this.els.payout.hidden = true;
      if (!this.attackerRound) {
        this.root.classList.remove("is-jackpot-big", "is-jackpot-small");
      }
      return;
    }
    this.els.payout.hidden = false;
    this.els.payoutCount.textContent = String(this.pendingPayout);
    this.payoutAccumulator += delta;
    while (this.payoutAccumulator >= PAYOUT_RELEASE_INTERVAL && this.pendingPayout > 0) {
      this.payoutAccumulator -= PAYOUT_RELEASE_INTERVAL;
      const releaseSides = this.pendingPayout >= 2
        ? PAYOUT_CHUTE_WALL_SIDES
        : [this.nextSinglePayoutWallSide];
      releaseSides.forEach(wallSide => {
        if (this.pendingPayout <= 0) return;
        this.spawnPayoutCoin(wallSide);
        this.pendingPayout -= 1;
      });
      if (releaseSides.length === 1) {
        this.nextSinglePayoutWallSide *= -1;
      }
    }
    this.els.payoutCount.textContent = String(this.pendingPayout);
    if (this.pendingPayout <= 0) {
      this.payoutAccumulator = 0;
      this.els.payout.hidden = true;
      if (!this.attackerRound) {
        this.root.classList.remove("is-jackpot-big", "is-jackpot-small");
      }
    }
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
    const visible = this.lcdDigitsVisible !== false;
    this.setDigit(this.els.digitLeft, visible ? normalized[0] : "");
    this.setDigit(this.els.digitRight, visible ? normalized[1] : "");
    this.refreshBoardLcd();
  }

  setLcdDigitsVisible(visible) {
    const nextVisible = Boolean(visible);
    if (this.lcdDigitsVisible === nextVisible) return;
    this.lcdDigitsVisible = nextVisible;
    const code = String(this.currentLcdCode || "00").padStart(2, "0").slice(-2);
    this.setDigit(this.els.digitLeft, nextVisible ? code[0] : "");
    this.setDigit(this.els.digitRight, nextVisible ? code[1] : "");
    this.refreshBoardLcd();
  }

  setSpinLabel(label) {
    this.currentLcdLabel = String(label || "CHANCE SLOT");
    this.els.spinLabel.textContent = this.currentLcdLabel;
    this.refreshBoardLcd();
  }

  setLcdPalette(palette = BOARD_LCD_DEFAULT_PALETTE) {
    this.currentLcdPalette = palette || BOARD_LCD_DEFAULT_PALETTE;
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
    const palette = this.currentLcdPalette || BOARD_LCD_DEFAULT_PALETTE;
    const background = context.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, palette.backgroundTop);
    background.addColorStop(0.55, palette.backgroundMiddle);
    background.addColorStop(1, palette.backgroundBottom);
    context.clearRect(0, 0, width, height);
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = palette.border;
    context.lineWidth = 7;
    context.strokeRect(8, 8, width - 16, height - 16);

    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = palette.label;
    context.shadowColor = palette.labelGlow;
    context.shadowBlur = 10;
    context.font = "700 27px 'Segoe UI', sans-serif";
    context.fillText(this.currentLcdLabel || "CHANCE SLOT", width / 2, 42, width - 40);
    context.shadowBlur = 0;

    const code = String(this.currentLcdCode || "00").padStart(2, "0").slice(-2);
    const leftDigit = this.lcdDigitsVisible === false ? "" : code[0];
    const rightDigit = this.lcdDigitsVisible === false ? "" : code[1];
    drawBoardLcdDigit(context, leftDigit, 128, 82, 82, 160, palette);
    drawBoardLcdDigit(context, rightDigit, 270, 82, 82, 160, palette);
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
      || this.sharkEatenCoins.length > 0
      || this.pendingPayout > 0
      || this.pendingSpins > 0
      || Boolean(this.spin)
      || Boolean(this.attackerRound)
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
    this.els.clearJam.disabled = this.gameOver || this.layoutEditing;
    this.els.devStart.disabled = this.gameOver || this.layoutEditing;
    this.els.stroke.disabled = this.gameOver || this.layoutEditing;
    this.root.classList.toggle("is-auto-firing", this.autoEnabled);
    this.root.classList.toggle("is-st", this.stRemaining > 0);
  }

  updateUiTimers(delta) {
    if (this.calloutTimer > 0) {
      this.calloutTimer -= delta;
      if (this.calloutTimer <= 0) this.els.callout.hidden = true;
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
    this.updateSharkMechanism(delta);
    this.updateSharkDangerWarning();
    this.updateUiTimers(delta);
    this.updateSpin(delta);
    this.updateAttackerRound(delta);
    this.updatePayout(delta);
    this.updateSlotLights(delta);
    this.updateEntrySeesaws();
    this.updateEntryPlasticGuides();
    this.updateHanemonoWings(delta);
    this.updateHakamaChuckers(delta);
    this.updateRoleRotator(delta);
    this.pachinkoTokens.forEach(token => {
      if (token.phase !== "board") return;
      token.prePhysicsY = token.body.position.y;
      token.prePhysicsVelocityY = token.body.velocity.y;
    });
    this.world.step(FIXED_STEP, delta, MAX_SUB_STEPS);
    this.syncPusherVisual();
    this.updatePachinkoWindmills(delta);
    this.updatePachinkoTokens(delta);
    this.finalizeAttackerRoundIfPending();
    this.updateRoleSideNeon();
    this.updateLcdSideNeon();
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
    this.els?.clearJam?.removeEventListener("click", this.boundClearJam);
    this.els?.devStart?.removeEventListener("click", this.boundDevStart);
    this.els?.stroke?.removeEventListener("input", this.boundStroke);
    this.els?.restart?.removeEventListener("click", this.boundRestart);
    this.els?.layoutEditor?.removeEventListener("toggle", this.boundEditorToggle);
    this.els?.editorBody?.removeEventListener("click", this.boundEditorClick);
    this.els?.canvas?.removeEventListener("pointerdown", this.boundCanvasPointerDown);
    this.els?.canvas?.removeEventListener("pointermove", this.boundCanvasPointerMove);
    this.els?.canvas?.removeEventListener("pointerup", this.boundCanvasPointerUp);
    this.els?.canvas?.removeEventListener("pointercancel", this.boundCanvasPointerUp);
    this.world?.removeEventListener("preStep", this.boundPusherPlatePreStep);
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
  },
  setEffects(effects = {}) {
    mountedGame?.setEffectPreferences(effects);
  }
});

export { ImasoraJackpotCoinPusherGame };
