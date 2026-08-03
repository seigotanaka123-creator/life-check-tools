Exit code: 0
Wall time: 1.1 seconds
Total output lines: 9815
Output:
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
const ROLE_ROTATO…81037 tokens truncated… 1;
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

