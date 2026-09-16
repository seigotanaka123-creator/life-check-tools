import * as THREE from "./three.module.min.js";
import {
  ALL_FLOWERING_HERO_CHARACTERS,
  ALL_MATURE_STAR_CHARACTERS,
  WHITE_MICHI_ROAD_SABER_REN_ID,
  buildFloweringHeroCharacter360,
  buildMatureStarCharacter360,
  buildWhiteMichiRoadSaberRen360,
  getFloweringHeroCharacter,
  getMatureStarCharacter
} from "./imasora-character-360.js";

const ARENA_RADIUS = 360;
const PUCK_RADIUS = 18;
const MALLET_RADIUS = 33;
const GOAL_HALF_ANGLE = 0.225;
const GOAL_WIDTH_SCALE = 1.76;
const GOAL_DEPTH = 74;
const GOAL_MOUTH_WIDTH = 2 * ARENA_RADIUS * Math.sin(GOAL_HALF_ANGLE) * GOAL_WIDTH_SCALE;
const GOAL_POST_CENTER_HALF_WIDTH = GOAL_MOUTH_WIDTH * .46;
const GOAL_POST_HALF_THICKNESS = 6;
const GOAL_POST_INNER_PHYSICS_RELIEF = 3;
const GOAL_POST_INNER_HALF_WIDTH = GOAL_POST_CENTER_HALF_WIDTH - GOAL_POST_HALF_THICKNESS;
// A corner shot is judged from the puck's visible overlap with the goal
// opening, not from its centre. Requiring only this small, real overlap keeps
// true outside hits physical while allowing the familiar football-like
// "post-and-in" result when the puck visibly reaches the inside corner.
const GOAL_POST_MIN_VISIBLE_CORNER_OVERLAP = 1.5;
const GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH = GOAL_POST_INNER_HALF_WIDTH
  + PUCK_RADIUS
  - GOAL_POST_MIN_VISIBLE_CORNER_OVERLAP;
const GOAL_POST_COLLISION_SLOP = .7;
const GOAL_POST_SCORE_TOLERANCE = .35;
const GOAL_PUCK_CENTER_HALF_WIDTH = GOAL_POST_INNER_HALF_WIDTH + GOAL_POST_INNER_PHYSICS_RELIEF - PUCK_RADIUS - GOAL_POST_COLLISION_SLOP + GOAL_POST_SCORE_TOLERANCE;
const GOAL_POST_RADIAL_CENTER = ARENA_RADIUS + GOAL_DEPTH * .48;
const GOAL_POST_FRONT_RADIAL = GOAL_POST_RADIAL_CENTER - GOAL_DEPTH * .52;
const GOAL_POST_PHYSICS_CENTER_HALF_WIDTH = GOAL_POST_CENTER_HALF_WIDTH + GOAL_POST_INNER_PHYSICS_RELIEF;
const GOAL_SCORE_RADIAL = ARENA_RADIUS + GOAL_DEPTH * .59;
const GOAL_LIVE_ENTRY_TARGET_RADIAL = GOAL_SCORE_RADIAL + PUCK_RADIUS * .85;
const GOAL_LIVE_ENTRY_MIN_SECONDS = .18;
const GOAL_LIVE_ENTRY_MAX_SECONDS = .55;
const GOAL_LIVE_ENTRY_MIN_SPEED = 90;
const GOAL_LIVE_ENTRY_MAX_SPEED = 140;
const WALL_RESTITUTION = .95;
const GOAL_POST_RESTITUTION = .84;
const GOAL_POST_REFLECTION_INWARD_SHIFT = 6 * Math.PI / 180;
const GOAL_POST_INNER_CAPTURE_TARGET_RATIO = .96;
const GOAL_POST_INNER_CAPTURE_MIN_SPEED = 380;
const GOAL_POST_INNER_CAPTURE_SPEED_RETENTION = .98;
const GOAL_POST_INNER_CAPTURE_ENTRY_BLEND = .16;
const GOAL_POST_INNER_CAPTURE_MIN_RADIAL_RATIO = .9;
const GOAL_POST_INNER_CAPTURE_STEER_RESPONSE = 30;
const GOAL_POST_INNER_CAPTURE_STEER_RESPONSE_MAX = 78;
const GOAL_POST_INNER_CAPTURE_SECONDS = 1.25;
const GOAL_CORNER_APPROACH_SECONDS = 1.25;
const GOAL_CORNER_APPROACH_MIN_RADIAL_RATIO = .5;
const GOAL_POST_PROJECTED_SCORE_TOLERANCE = 2;
const GOAL_POST_INWARD_VELOCITY_EPSILON = 1;
const GOAL_CLEAR_MOUTH_PROJECTION_EPSILON = .1;
const GOAL_CLEAR_HEIGHT = 86;
const GOAL_KEEPER_CLEARANCE = 1.5;
const FIXED_STEP = 1 / 120;
const GOAL_CORNER_APPROACH_RETRY_BLOCK_SECONDS = FIXED_STEP * 2;
const MATCH_SECONDS = 120;
const GOAL_REPLAY_DURATION = 5.8;
const GOAL_REPLAY_PATH_PROGRESS_SCALE = 1.04;
const GOAL_REPLAY_CAMERA_PULLBACK = 30;
const GOAL_REPLAY_CAMERA_HEIGHT_LIFT = 18;
// 120 Hzで約3.05秒分を再生する。ゴール認定後の進入描写を最大
// 0.55秒含んでも、得点の約2.5秒前から必ず見返せる長さ。
const GOAL_REPLAY_PATH_POINTS = 366;
const GOAL_REPLAY_HISTORY_POINTS = 480;
const GOAL_REPLAY_SERVE_PADDING = .1;
const TERRITORY_SECTOR_COUNT = 12;
const TERRITORY_PER_PLAYER = TERRITORY_SECTOR_COUNT / 3;
const TERRITORY_INNER_RADIUS = 76;
const TERRITORY_OUTER_RADIUS = ARENA_RADIUS - 18;
const TERRITORY_PANEL_BASE_OPACITY = .68;
const TERRITORY_PANEL_GLOW_OPACITY = .24;
const TERRITORY_PANEL_BORDER_OPACITY = .98;
const TERRITORY_GOAL_FLASH_PRECHANGE_DURATION = .42;
const TERRITORY_GOAL_FLASH_COLOR_CHANGE_DURATION = .34;
const TERRITORY_GOAL_FLASH_PULSE_DURATION = 1.65;
const TERRITORY_GOAL_FLASH_DURATION = TERRITORY_GOAL_FLASH_PRECHANGE_DURATION + TERRITORY_GOAL_FLASH_PULSE_DURATION;
const TERRITORY_GOAL_FLASH_PULSES = 3;
const TERRITORY_GOAL_FLASH_WHITE_MIX = .78;
const MAX_PUCK_SPEED = 1040;
const GOAL_POST_ROUTE_MISS_GUARD_RADIAL = GOAL_POST_FRONT_RADIAL
  + MAX_PUCK_SPEED * FIXED_STEP
  + GOAL_POST_COLLISION_SLOP;
const MALLET_MAX_SPEED = 1260;
const MALLET_ACCELERATION = 5100;
const MALLET_RESPONSE = 17.5;
const MALLET_RESTITUTION = 1.05;
const MALLET_SMASH_RESTITUTION = 1.43;
const MALLET_SMASH_MIN_SPEED = 520;
const MALLET_SMASH_MIN_ALIGNMENT = .62;
const MALLET_SMASH_MIN_CLOSING_SPEED = 340;
const MALLET_SMASH_BURN_DURATION = 1.2;
const MALLET_SMASH_EMIT_INTERVAL = .045;
const MALLET_SMASH_SMOKE_INTERVAL = .08;
const PLAYER_MALLET_MAX_SPEED = 1320;
const PLAYER_MALLET_ACCELERATION = 55000;
const PLAYER_MALLET_RESPONSE = 110;
const WALL_SPRING_INTERVAL = 3;
const WALL_SPRING_ACTIVE_WINDOW = .54;
const WALL_SPRING_EXTEND_SECONDS = .13;
const WALL_SPRING_HOLD_SECONDS = .15;
const WALL_SPRING_SAMPLE_COUNT = 30;
const WALL_SPRING_GOAL_MARGIN = .065;
const WALL_SPRING_TRAVEL = 48;
const WALL_SPRING_REST_INSET = 7;
const WALL_SPRING_BUMPER_RADIUS = 23;
const WALL_SPRING_RESTITUTION = 1.05;
const WALL_SPRING_PUCK_MIN_KICK = 500;
const WALL_SPRING_IMPACT_RESTITUTION = 1.14;
const WALL_SPRING_IMPACT_MIN_KICK = 560;
const WALL_SPRING_MALLET_RESTITUTION = .95;
const WALL_SPRING_MALLET_MIN_KICK = 430;
const WALL_SPRING_HIT_COOLDOWN = .18;
const WALL_SPRING_RETRACTED_RESTITUTION = 1.05;
const WALL_SPRING_RETRACTED_MIN_KICK = 500;
const WALL_SPRING_RETRACTED_HALF_ANGLE = .12;
const SERVE_SPEED_MIN = 112;
const SERVE_SPEED_MAX = 148;
const SERVE_GRACE_SECONDS = .72;
const SERVE_SOFT_WINDOW = 1.35;
const SERVE_SOFT_MAX_SPEED = 330;
const KICKOFF_COUNTDOWN_SHORT_SECONDS = 1.6;
const KICKOFF_COUNTDOWN_LONG_SECONDS = 2;
const KICKOFF_COUNTDOWN_NUMERAL_COUNT = 3;
const KICKOFF_ARROW_START_RADIUS = 54;
const KICKOFF_ARROW_TIP_RADIUS = 238;
const KICKOFF_ARROW_POST_LAUNCH_MAX_SECONDS = .9;
const CENTER_PROPELLER_VERTEX_RADIUS = 60;
const CENTER_PROPELLER_SIZE_SCALE = .4;
const CENTER_PROPELLER_HUB_RADIUS = 10.5;
const CENTER_PROPELLER_ARM_INNER_RADIUS = 8;
const CENTER_PROPELLER_ARM_OUTER_RADIUS = 33;
const CENTER_PROPELLER_ARM_HALF_WIDTH = 6.5;
const CENTER_PROPELLER_STRONG_SPEED = 82.8;
const CENTER_PROPELLER_WEAK_SPEED = 23.85;
const CENTER_PROPELLER_STRONG_DURATION = 3.6;
const CENTER_PROPELLER_WEAK_DURATION = 1.35;
const CENTER_PROPELLER_SPEED_RESPONSE = 8.5;
const CENTER_PROPELLER_STRONG_RESTITUTION = 1.12;
const CENTER_PROPELLER_WEAK_RESTITUTION = .87;
const CENTER_PROPELLER_STRONG_MIN_KICK = 760;
const CENTER_PROPELLER_WEAK_MIN_KICK = 430;
const CENTER_PROPELLER_SURFACE_TRANSFER = .55;
const CENTER_PROPELLER_HIT_COOLDOWN = .12;
const CENTER_BLACK_TURNTABLE_RADIUS = TERRITORY_INNER_RADIUS - 2;
const CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED = .48;
const CENTER_BLACK_TURNTABLE_SYMMETRY_ANGLE = Math.PI * 2 / 3;
const CENTER_BLACK_TURNTABLE_KICKOFF_PHASE_SAMPLES = 720;
const CENTER_BLACK_TURNTABLE_KICKOFF_REQUIRED_CLEARANCE = Math.asin(
  (PUCK_RADIUS + (CENTER_PROPELLER_ARM_OUTER_RADIUS + CENTER_PROPELLER_ARM_HALF_WIDTH) * CENTER_PROPELLER_SIZE_SCALE)
  / CENTER_PROPELLER_VERTEX_RADIUS
);
const CENTER_PROPELLER_SEQUENCE = Object.freeze([
  Object.freeze({ id: "strong-clockwise", direction: "clockwise", strength: "strong", duration: CENTER_PROPELLER_STRONG_DURATION, speed: CENTER_PROPELLER_STRONG_SPEED }),
  Object.freeze({ id: "weak-clockwise-a", direction: "clockwise", strength: "weak", duration: CENTER_PROPELLER_WEAK_DURATION, speed: CENTER_PROPELLER_WEAK_SPEED }),
  Object.freeze({ id: "weak-counterclockwise-a", direction: "counterclockwise", strength: "weak", duration: CENTER_PROPELLER_WEAK_DURATION, speed: -CENTER_PROPELLER_WEAK_SPEED }),
  Object.freeze({ id: "strong-counterclockwise", direction: "counterclockwise", strength: "strong", duration: CENTER_PROPELLER_STRONG_DURATION, speed: -CENTER_PROPELLER_STRONG_SPEED }),
  Object.freeze({ id: "weak-counterclockwise-b", direction: "counterclockwise", strength: "weak", duration: CENTER_PROPELLER_WEAK_DURATION, speed: -CENTER_PROPELLER_WEAK_SPEED }),
  Object.freeze({ id: "weak-clockwise-b", direction: "clockwise", strength: "weak", duration: CENTER_PROPELLER_WEAK_DURATION, speed: CENTER_PROPELLER_WEAK_SPEED })
]);
const CENTER_PROPELLER_CYCLE_DURATION = CENTER_PROPELLER_SEQUENCE.reduce((total, phase) => total + phase.duration, 0);
const CHARACTER_NAME_VISIBLE_AFTER_SERVE = 2;
const PUCK_START_COLOR = "#72e8ff";
const PUCK_TRAIL_POINT_COUNT = 56;
const PUCK_TRAIL_VERTICAL_SPAN = 2.42;
const CHARACTER_OPAQUE_LAYER = 7;
const CHARACTER_FACE_LIGHT_COLOR = 0xfff4df;
const CHARACTER_FACE_LIGHT_INTENSITY = 22;
const CHARACTER_AMBIENT_FILL_INTENSITY = .85;
const CHARACTER_BODY_EMISSIVE_FLOOR = .82;
const MALLET_MIN_RADIUS = ARENA_RADIUS * 0.25;
const MALLET_MAX_RADIUS = ARENA_RADIUS * 0.80;
const AVATAR_RING_RADIUS = ARENA_RADIUS * 0.78;
const CHARACTER_GROUND_Y = 1.7;
const KEEPER_PATH_RADIUS = ARENA_RADIUS * 0.86;
const KEEPER_TRAVEL = 58;
const KEEPER_COLLIDER_RADIUS = 30;
const MALLET_KEEPER_CLEARANCE = 4;
const MALLET_GOAL_SIDE_MAX_PROJECTION = KEEPER_PATH_RADIUS
  - KEEPER_COLLIDER_RADIUS
  - MALLET_RADIUS
  - MALLET_KEEPER_CLEARANCE;
// Kickoffs begin at the lateral center of each player's movement sector and
// exactly on its goal-side (rearmost) boundary. Keep this derived from the
// same limit used by constrainToSector so the visible guide, input clamp and
// every restart can never drift apart again.
const MALLET_KICKOFF_START_RADIUS = Math.min(
  MALLET_MAX_RADIUS,
  MALLET_GOAL_SIDE_MAX_PROJECTION
);
const KEEPER_MAX_SPEED = 165;
const KEEPER_ACCELERATION = 720;
const KEEPER_RESPONSE = 26;
const KEEPER_INTERCEPT_LOOKAHEAD_MAX_SECONDS = .55;
const KEEPER_GOAL_THREAT_LOOKAHEAD_SECONDS = 1.35;
const KEEPER_TRACK_MIN_RADIAL = ARENA_RADIUS * .08;
const KEEPER_PUCK_TRACK_HALF_ANGLE = Math.PI * 100 / 180;
const KEEPER_FACING_RESPONSE = 10;
const KEEPER_FORCE_RATIO = .9;
const KEEPER_RESTITUTION = .74 * KEEPER_FORCE_RATIO;
const KEEPER_VELOCITY_TRANSFER = .41 * KEEPER_FORCE_RATIO;
const MALLET_HALF_SECTOR = Math.PI * 0.295;
const PLAYER_ANGLES = Object.freeze([
  Math.PI / 2,
  Math.PI * 7 / 6,
  Math.PI * 11 / 6
]);
const AVATAR_VIEW_RING = Object.freeze([
  "front", "front-right", "side", "back-right",
  "back", "back-left", "side-left", "front-left"
]);
const FALLBACK_COLORS = Object.freeze(["#ff708d", "#ffd268", "#69e4c4"]);
const COMPANION_HAND_COLORS = Object.freeze({
  standard: "#58bf72",
  leaf: "#6fcf7f",
  sky: "#6eb6ff",
  light: "#f0d37a",
  flower: "#e68a9b"
});
const COMPANION_FOOT_COLORS = Object.freeze({
  standard: "#8b5a34",
  soil: "#7a5131",
  stone: "#71808e",
  navy: "#405a84",
  moss: "#5f7a43"
});
const REACTIONS = Object.freeze({
  strike: ["いけっ！", "そこ！", "リンク！", "決める！"],
  cheer: ["ナイス！", "やった！", "ゴール！", "よしっ！"],
  hurt: ["くっ…！", "まだ！", "次こそ！", "うわっ！"],
  out: ["あとは任せた！", "悔しい…！", "見届けるよ！"]
});

const CHARACTER_ABILITY_DEFINITIONS = Object.freeze({
  keeperResponse: "反応速度アップ",
  keeperAcceleration: "初動加速アップ",
  keeperTopSpeed: "最高速度アップ",
  keeperLateral: "横移動特化",
  malletRange: "マレット操作範囲拡大",
  malletBrake: "マレットのブレーキ強化",
  malletRecovery: "マレットの復帰加速",
  turntableResistance: "回転盤耐性",
  consecutiveGoalGuard: "連続失点ガード",
  powerReturn: "パワーリターン",
  smashAssist: "スマッシュ補助",
  noTouchResponse: "ノータッチ反応"
});

const CHARACTER_ABILITY_PROFILES = Object.freeze({
  agility: Object.freeze({
    key: "agility",
    tier: "体格不利",
    label: "素早さ補正・大",
    abilities: Object.freeze([
      "keeperResponse", "keeperAcceleration", "keeperTopSpeed", "keeperLateral",
      "malletRange", "malletBrake", "malletRecovery"
    ]),
    tuning: Object.freeze({
      keeperResponse: 1.2,
      keeperAcceleration: 1.2,
      keeperTopSpeed: 1.15,
      keeperLateral: 1.05,
      malletHalfSector: 1.08,
      malletMinRadius: .94,
      malletGoalProjectionBonus: MALLET_KEEPER_CLEARANCE * .5,
      malletBrake: 1.2,
      malletRecovery: 1.2,
      turntableResistance: 1,
      consecutiveGoalGuard: 1,
      powerReturn: 1,
      smashAssist: 1,
      noTouchResponse: 1
    })
  }),
  balanced: Object.freeze({
    key: "balanced",
    tier: "体格並",
    label: "状況対応補正・中",
    abilities: Object.freeze(["turntableResistance", "consecutiveGoalGuard"]),
    tuning: Object.freeze({
      keeperResponse: 1,
      keeperAcceleration: 1,
      keeperTopSpeed: 1,
      keeperLateral: 1,
      malletHalfSector: 1,
      malletMinRadius: 1,
      malletGoalProjectionBonus: 0,
      malletBrake: 1,
      malletRecovery: 1,
      turntableResistance: 1.1,
      consecutiveGoalGuard: 1.1,
      powerReturn: 1,
      smashAssist: 1,
      noTouchResponse: 1
    })
  }),
  power: Object.freeze({
    key: "power",
    tier: "体格有利",
    label: "パワー補正・小",
    abilities: Object.freeze(["powerReturn", "smashAssist", "noTouchResponse"]),
    tuning: Object.freeze({
      keeperResponse: 1,
      keeperAcceleration: 1,
      keeperTopSpeed: 1,
      keeperLateral: 1,
      malletHalfSector: 1,
      malletMinRadius: 1,
      malletGoalProjectionBonus: 0,
      malletBrake: 1,
      malletRecovery: 1,
      turntableResistance: 1,
      consecutiveGoalGuard: 1,
      powerReturn: 1.04,
      smashAssist: 1.04,
      noTouchResponse: 1.04
    })
  }),
  neutral: Object.freeze({
    key: "neutral",
    tier: "未分類",
    label: "能力補正なし",
    abilities: Object.freeze([]),
    tuning: Object.freeze({
      keeperResponse: 1,
      keeperAcceleration: 1,
      keeperTopSpeed: 1,
      keeperLateral: 1,
      malletHalfSector: 1,
      malletMinRadius: 1,
      malletGoalProjectionBonus: 0,
      malletBrake: 1,
      malletRecovery: 1,
      turntableResistance: 1,
      consecutiveGoalGuard: 1,
      powerReturn: 1,
      smashAssist: 1,
      noTouchResponse: 1
    })
  })
});

const CHARACTER_ABILITY_PROFILE_BY_BODY = Object.freeze({
  walkCute: "agility",
  walkBrave: "power",
  walkSaber: "agility",
  rioCute: "balanced",
  rioBrave: "power",
  rioSaber: "balanced"
});
const TURN_TABLE_RESISTANCE_SECONDS = 1.35;
const CONSECUTIVE_GOAL_GUARD_REQUIRED = 2;
const CONSECUTIVE_GOAL_GUARD_SECONDS = 8;
const NO_TOUCH_RESPONSE_SECONDS = 4;
const DEVELOPMENT_CHARACTER_ROSTER = Object.freeze([
  ...ALL_FLOWERING_HERO_CHARACTERS,
  ...ALL_MATURE_STAR_CHARACTERS
]);

function characterAbilitySystemSelfTest() {
  const profileCounts = { agility: 0, balanced: 0, power: 0, neutral: 0 };
  const bodyCounts = {};
  DEVELOPMENT_CHARACTER_ROSTER.forEach(descriptor => {
    const profile = characterAbilityProfile(descriptor);
    profileCounts[profile.key] = (profileCounts[profile.key] || 0) + 1;
    bodyCounts[descriptor.profileKey] = (bodyCounts[descriptor.profileKey] || 0) + 1;
  });
  const abilityKeys = new Set(Object.values(CHARACTER_ABILITY_PROFILES)
    .flatMap(profile => profile.abilities));
  const expectedBodyKeys = Object.keys(CHARACTER_ABILITY_PROFILE_BY_BODY);
  const allBodiesCovered = expectedBodyKeys.every(key => bodyCounts[key] === 32);
  const allTiersBalanced = ["agility", "balanced", "power"].every(key => profileCounts[key] === 64);
  const performanceMultiplierKeys = [
    "keeperResponse", "keeperAcceleration", "keeperTopSpeed", "keeperLateral",
    "malletBrake", "malletRecovery", "turntableResistance", "consecutiveGoalGuard",
    "powerReturn", "smashAssist", "noTouchResponse"
  ];
  const gameplayProfiles = [
    CHARACTER_ABILITY_PROFILES.agility,
    CHARACTER_ABILITY_PROFILES.balanced,
    CHARACTER_ABILITY_PROFILES.power
  ];
  const currentBalancePreserved = gameplayProfiles.every(profile => (
    performanceMultiplierKeys.every(key => profile.tuning[key] >= 1)
      && profile.tuning.malletHalfSector >= 1
      && profile.tuning.malletMinRadius <= 1
      && profile.tuning.malletGoalProjectionBonus >= 0
  ));
  const allTwelveAbilitiesEnabled = (
    CHARACTER_ABILITY_PROFILES.agility.tuning.keeperResponse > 1
      && CHARACTER_ABILITY_PROFILES.agility.tuning.keeperAcceleration > 1
      && CHARACTER_ABILITY_PROFILES.agility.tuning.keeperTopSpeed > 1
      && CHARACTER_ABILITY_PROFILES.agility.tuning.keeperLateral > 1
      && CHARACTER_ABILITY_PROFILES.agility.tuning.malletHalfSector > 1
      && CHARACTER_ABILITY_PROFILES.agility.tuning.malletBrake > 1
      && CHARACTER_ABILITY_PROFILES.agility.tuning.malletRecovery > 1
      && CHARACTER_ABILITY_PROFILES.balanced.tuning.turntableResistance > 1
      && CHARACTER_ABILITY_PROFILES.balanced.tuning.consecutiveGoalGuard > 1
      && CHARACTER_ABILITY_PROFILES.power.tuning.powerReturn > 1
      && CHARACTER_ABILITY_PROFILES.power.tuning.smashAssist > 1
      && CHARACTER_ABILITY_PROFILES.power.tuning.noTouchResponse > 1
  );
  return {
    pass: DEVELOPMENT_CHARACTER_ROSTER.length === 192
      && ALL_FLOWERING_HERO_CHARACTERS.length === 48
      && ALL_MATURE_STAR_CHARACTERS.length === 144
      && profileCounts.neutral === 0
      && allBodiesCovered
      && allTiersBalanced
      && abilityKeys.size === 12
      && currentBalancePreserved
      && allTwelveAbilitiesEnabled,
    total: DEVELOPMENT_CHARACTER_ROSTER.length,
    flowering: ALL_FLOWERING_HERO_CHARACTERS.length,
    mature: ALL_MATURE_STAR_CHARACTERS.length,
    profileCounts,
    bodyCounts,
    abilityCount: abilityKeys.size,
    baseKeeperResponse: KEEPER_RESPONSE,
    currentBalancePreserved,
    allTwelveAbilitiesEnabled,
    colorAndDecorationIndependent: true
  };
}

let mountedGame = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);
const choose = values => values[Math.floor(Math.random() * values.length)];

function positiveModulo(value, period) {
  const remainder = value % period;
  return remainder < 0 ? remainder + period : remainder;
}

function normalizeAngle(value) {
  let angle = value;
  while (angle <= -Math.PI) angle += Math.PI * 2;
  while (angle > Math.PI) angle -= Math.PI * 2;
  return angle;
}

function angleDifference(value, center) {
  return normalizeAngle(value - center);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? String(value) : fallback;
}

function formatDate(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function fallbackArt(name, color) {
  const letter = escapeHtml(String(name || "相").slice(0, 1));
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="itl3-fallback" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="${escapeHtml(color)}"/></linearGradient></defs><circle cx="50" cy="51" r="38" fill="url(#itl3-fallback)" stroke="#fff" stroke-width="4"/><circle cx="37" cy="44" r="4" fill="#17304a"/><circle cx="63" cy="44" r="4" fill="#17304a"/><path d="M38 61 Q50 70 62 61" fill="none" stroke="#17304a" stroke-width="4" stroke-linecap="round"/><text x="50" y="31" text-anchor="middle" font-size="19" font-weight="900" fill="#17304a">${letter}</text></svg>`;
}

function cleanParticipant(raw, index) {
  const name = String(raw?.name || `相棒${index + 1}`);
  const color = safeColor(raw?.color, FALLBACK_COLORS[index] || "#76dfff");
  const artViews = Object.fromEntries(AVATAR_VIEW_RING
    .map(view => [view, String(raw?.artViews?.[view] || "")])
    .filter(([, art]) => art));
  return {
    id: String(raw?.id || `player-${index}`),
    name,
    role: String(raw?.role || (index === 0 ? "current" : "companion")),
    roleLabel: String(raw?.roleLabel || (index === 0 ? "育成中の相棒・操作" : "相棒・CPU")),
    art: String(raw?.art || artViews.front || fallbackArt(name, color)),
    artViews,
    color,
    appearance: raw?.appearance && typeof raw.appearance === "object" ? { ...raw.appearance } : {}
  };
}

function participantCharacterIds(player) {
  const ids = [player?.appearance?.artId, player?.id]
    .map(value => String(value || "").trim())
    .filter(Boolean);
  const prefixedId = String(player?.id || "");
  ["current-", "tri-link-practice-"].forEach(prefix => {
    if (prefixedId.startsWith(prefix)) ids.push(prefixedId.slice(prefix.length));
  });
  if (player?.role === "guide") ids.push(WHITE_MICHI_ROAD_SABER_REN_ID);
  return [...new Set(ids)];
}

function characterDescriptorById(characterId) {
  return getMatureStarCharacter(characterId) || getFloweringHeroCharacter(characterId) || null;
}

function participantCharacterDescriptor(player) {
  for (const characterId of participantCharacterIds(player)) {
    const descriptor = characterDescriptorById(characterId);
    if (descriptor) return descriptor;
  }
  return player?.role === "guide" ? getMatureStarCharacter(WHITE_MICHI_ROAD_SABER_REN_ID) : null;
}

function characterAbilityProfile(descriptor) {
  const profileKey = CHARACTER_ABILITY_PROFILE_BY_BODY[descriptor?.profileKey] || "neutral";
  return CHARACTER_ABILITY_PROFILES[profileKey] || CHARACTER_ABILITY_PROFILES.neutral;
}

function characterAbilityNames(profile) {
  return (profile?.abilities || []).map(key => CHARACTER_ABILITY_DEFINITIONS[key]).filter(Boolean);
}

function developmentCharacterOptionsMarkup(selectedId) {
  const stages = [
    { label: "開花期", roster: ALL_FLOWERING_HERO_CHARACTERS },
    { label: "満開期", roster: ALL_MATURE_STAR_CHARACTERS }
  ];
  return stages.map(stage => {
    const families = new Map();
    stage.roster.forEach(descriptor => {
      const label = descriptor.familyLabel || "その他";
      if (!families.has(label)) families.set(label, []);
      families.get(label).push(descriptor);
    });
    return [...families.entries()].map(([familyLabel, descriptors]) => (
      `<optgroup label="${escapeHtml(stage.label)}｜${escapeHtml(familyLabel)}">${descriptors.map(descriptor => (
        `<option value="${escapeHtml(descriptor.id)}"${descriptor.id === selectedId ? " selected" : ""}>${escapeHtml(descriptor.name)}</option>`
      )).join("")}</optgroup>`
    )).join("");
  }).join("");
}

function participantCharacterMaterialOptions(player) {
  const colorIds = player?.appearance?.companionColors || {};
  return {
    handColor: COMPANION_HAND_COLORS[colorIds.hand] || COMPANION_HAND_COLORS.standard,
    footColor: COMPANION_FOOT_COLORS[colorIds.foot] || COMPANION_FOOT_COLORS.standard
  };
}

function buildParticipantCharacter360(player) {
  const materialOptions = participantCharacterMaterialOptions(player);
  for (const characterId of participantCharacterIds(player)) {
    const mature = getMatureStarCharacter(characterId);
    if (mature) {
      return {
        model: buildMatureStarCharacter360(characterId, materialOptions),
        characterId,
        stage: "mature"
      };
    }
    const flowering = getFloweringHeroCharacter(characterId);
    if (flowering) {
      return {
        model: buildFloweringHeroCharacter360(characterId, materialOptions),
        characterId,
        stage: "flowering"
      };
    }
  }
  if (player?.role === "guide") {
    return {
      model: buildWhiteMichiRoadSaberRen360(materialOptions),
      characterId: WHITE_MICHI_ROAD_SABER_REN_ID,
      stage: "mature"
    };
  }
  return { model: null, characterId: null, stage: null };
}

function makeParticipantCharacterOpaque(model) {
  if (!model) return 0;
  const materials = new Set();
  model.layers.enable(CHARACTER_OPAQUE_LAYER);
  model.traverse(object => {
    if (!object.isMesh || !object.material) return;
    object.layers.enable(CHARACTER_OPAQUE_LAYER);
    object.castShadow = true;
    object.receiveShadow = false;
    const isBodySurface = object.name === "body-seamless";
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach(material => {
      if (!material || materials.has(material)) return;
      materials.add(material);
      material.transparent = false;
      material.opacity = 1;
      material.alphaTest = 0;
      if ("alphaHash" in material) material.alphaHash = false;
      if ("alphaToCoverage" in material) material.alphaToCoverage = false;
      material.depthTest = true;
      material.depthWrite = true;
      material.colorWrite = true;
      material.blending = THREE.NormalBlending;
      material.premultipliedAlpha = false;
      material.toneMapped = false;
      if (material.color?.isColor && material.emissive?.isColor) {
        const hasEmissive = material.emissive.r + material.emissive.g + material.emissive.b > .001;
        if (!hasEmissive) material.emissive.copy(material.color);
        if (isBodySurface) material.emissive.copy(material.color);
        const emissiveFloor = isBodySurface ? CHARACTER_BODY_EMISSIVE_FLOOR : hasEmissive ? .14 : .055;
        material.emissiveIntensity = Math.max(Number(material.emissiveIntensity) || 0, emissiveFloor);
      }
      if ("transmission" in material) material.transmission = 0;
      if ("thickness" in material) material.thickness = 0;
      material.needsUpdate = true;
    });
  });
  return materials.size;
}

function setVectorLength(x, z, maxLength) {
  const length = Math.hypot(x, z);
  if (length <= maxLength || length < 0.0001) return { x, z };
  const scale = maxLength / length;
  return { x: x * scale, z: z * scale };
}

class ImasoraTriLink3D {
  constructor(root, options = {}) {
    this.root = root;
    const supplied = Array.isArray(options.participants) ? options.participants.slice(0, 3) : [];
    this.participants = [0, 1, 2].map(index => cleanParticipant(supplied[index], index));
    this.memories = Array.isArray(options.memories) ? options.memories.slice(0, 12) : [];
    this.onRecord = typeof options.onRecord === "function" ? options.onRecord : null;
    this.testMode = Boolean(options.testMode);
    this.previewOnly = Boolean(options.previewOnly);
    this.autoStart = Boolean(options.autoStart);
    this.devCharacterIds = Array.isArray(options.devCharacterIds)
      ? options.devCharacterIds.slice(0, 3).map(value => String(value || ""))
      : [];
    this.destroyed = false;
    this.running = false;
    this.finished = false;
    this.resultPresented = false;
    this.countdown = 0;
    this.countdownMark = null;
    this.kickoffCountdownDuration = 0;
    this.kickoffRecipientIndex = null;
    this.kickoffSource = "initial";
    this.kickoffArrowLaunchUntil = 0;
    this.serveTimer = 0;
    this.serveGrace = 0;
    this.serveSoftWindow = 0;
    this.pendingServeRecipientIndex = null;
    this.pendingServeSpeed = null;
    this.lastServeRecipientIndex = null;
    this.lastServeDirectionX = 0;
    this.lastServeDirectionZ = 0;
    this.serveSequence = 0;
    this.characterNamesHideAt = null;
    this.timeRemaining = MATCH_SECONDS;
    this.overtime = false;
    this.lastTimestamp = 0;
    this.accumulator = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.pointerId = null;
    this.dragging = false;
    this.playerMalletReleaseCount = 0;
    this.audioContext = null;
    this.resizeObserver = null;
    this.keyState = new Set();
    this.shockRings = [];
    this.flashLights = [];
    this.trailPoints = [];
    this.cameraShake = 0;
    this.cameraMode = "attract";
    this.cameraModeTime = 0;
    this.goalCinematic = null;
    this.pendingGoal = null;
    this.territoryGoalFlash = null;
    this.victoryFocus = null;
    this.comboCount = 0;
    this.comboExpiresAt = 0;
    this.lastImpactPower = 0;
    this.smashCount = 0;
    this.lastSmashBy = -1;
    this.lastSmashPower = 0;
    this.smashBurnTime = 0;
    this.smashBurnEmitClock = 0;
    this.smashSmokeEmitClock = 0;
    this.smashBurnDirectionX = 1;
    this.smashBurnDirectionZ = 0;
    this.smashBurnVisualActive = false;
    this.avatarTextureUrls = [];
    this.avatarLoadedCount = 0;
    this.lastTouch = null;
    this.touchHistory = [];
    this.roundPath = [];
    this.decisivePath = [];
    this.nextKeeperTelemetryAt = 0;
    this.goalPostHitCount = 0;
    this.goalPostInnerCaptureCount = 0;
    this.goalPostKeeperBypassCount = 0;
    this.goalCornerApproachCount = 0;
    this.goalCornerApproachRecoveryCount = 0;
    this.goalAcceptedCount = 0;
    this.wallSpringClock = 0;
    this.wallSpringExtension = 0;
    this.wallSpringVelocity = 0;
    this.wallSpringCycle = -1;
    this.wallSpringActivationCount = 0;
    this.wallSpringHitCount = 0;
    this.wallSpringPuckHitCount = 0;
    this.wallSpringMalletHitCount = 0;
    this.nextWallSpringTelemetryAt = 0;
    this.centerPropellerClock = 0;
    this.centerPropellerAngle = 0;
    this.centerPropellerAngularVelocity = CENTER_PROPELLER_SEQUENCE[0].speed;
    this.centerPropellerPhaseIndex = 0;
    this.centerPropellerHitCount = 0;
    this.centerPropellerLastHitIndex = -1;
    this.nextCenterPropellerTelemetryAt = 0;
    this.centerBlackTurntableClock = 0;
    this.centerBlackTurntableAngle = 0;
    this.kickoffTurntableSync = null;
    this.kickoffTurntableTransitLock = false;
    this.kickoffFirstTerritoryPending = false;
    this.kickoffExpectedTerritoryIndex = null;
    this.kickoffPropellerHitsAtLaunch = 0;
    this.kickoffFirstPropellerContact = null;
    this.kickoffFirstPropellerOverlap = null;
    this.kickoffPropellerOverlapCount = 0;
    this.kickoffLaunchedAt = 0;
    this.kickoffEntryHistory = [];
    this.nextCenterBlackTurntableTelemetryAt = 0;
    this.matchId = `tri-link-3d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.puck = { x: 0, z: 0, vx: 0, vz: 0, visible: true, lastHitAt: -10, lastHitBy: -1, ownerIndex: -1, goalPostCapture: null, goalCornerApproach: null, goalCornerApproachBlockedUntil: 0 };
    this.players = this.participants.map((participant, index) => this.makePlayer(participant, index));
    this.territories = Array.from({ length: TERRITORY_SECTOR_COUNT }, (_, index) => {
      const homeIndex = Math.floor(index / TERRITORY_PER_PLAYER);
      return { index, homeIndex, ownerIndex: homeIndex, captureCount: 0, lastCapturedAt: -1 };
    });
    this.boundLoop = timestamp => this.loop(timestamp);
    this.boundResize = () => this.resize();
  }

  makePlayer(participant, index) {
    const angle = PLAYER_ANGLES[index];
    const characterDescriptor = participantCharacterDescriptor(participant);
    const abilityProfile = characterAbilityProfile(characterDescriptor);
    const tuning = abilityProfile.tuning;
    const malletMinRadius = MALLET_MIN_RADIUS * tuning.malletMinRadius;
    const malletMaxRadius = MALLET_MAX_RADIUS;
    const malletGoalSideMaxProjection = Math.min(
      KEEPER_PATH_RADIUS - KEEPER_COLLIDER_RADIUS - MALLET_RADIUS,
      MALLET_GOAL_SIDE_MAX_PROJECTION + tuning.malletGoalProjectionBonus
    );
    const malletHalfSector = MALLET_HALF_SECTOR * tuning.malletHalfSector;
    const radius = Math.min(malletMaxRadius, malletGoalSideMaxProjection);
    return {
      ...participant,
      index,
      angle,
      characterDescriptor,
      abilityProfile,
      malletMinRadius,
      malletMaxRadius,
      malletGoalSideMaxProjection,
      malletHalfSector,
      malletKickoffStartRadius: radius,
      lives: 3,
      active: true,
      goalsFor: 0,
      territoryCaptured: 0,
      territoryLost: 0,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      vx: 0,
      vz: 0,
      targetX: Math.cos(angle) * radius,
      targetZ: Math.sin(angle) * radius,
      lastStrikeAt: -10,
      activeMalletAbilityEffects: [],
      activeKeeperAbilityEffects: [],
      keeperOffset: 0,
      keeperVelocity: 0,
      keeperTargetOffset: 0,
      keeperTravel: KEEPER_TRAVEL,
      keeperVisualHalfWidth: KEEPER_COLLIDER_RADIUS,
      keeperX: Math.cos(angle) * KEEPER_PATH_RADIUS,
      keeperZ: Math.sin(angle) * KEEPER_PATH_RADIUS,
      keeperVx: 0,
      keeperVz: 0,
      keeperLastHitAt: -10,
      keeperHitCount: 0,
      lastPuckTouchAt: 0,
      centerTurntableResistanceUntil: 0,
      consecutiveGoalsConceded: 0,
      consecutiveGoalGuardUntil: 0,
      gateProgress: 0,
      brain: index === 0 ? null : {
        state: "guard",
        decisionAt: 0,
        reactionAt: 0,
        retreatUntil: 0,
        targetOpponent: index === 1 ? 2 : 1,
        shotAngleBias: 0,
        guardRadius: randomBetween(.52, .66),
        guardOffset: randomBetween(-.12, .12),
        aggression: randomBetween(.46, .72),
        caution: randomBetween(.45, .72),
        bankPreference: randomBetween(.18, .42),
        feintPreference: randomBetween(.12, .3),
        feintSide: Math.random() < .5 ? -1 : 1,
        rallySeed: Math.random(),
        lastDecision: "初期配置"
      }
    };
  }

  mount() {
    this.ensureStylesheet();
    this.root.innerHTML = this.markup();
    this.canvas = this.root.querySelector("[data-itl3-canvas]");
    this.stage = this.root.querySelector("[data-itl3-stage]");
    this.opening = this.root.querySelector("[data-itl3-opening]");
    this.clock = this.root.querySelector("[data-itl3-clock]");
    this.message = this.root.querySelector("[data-itl3-message]");
    this.messageKicker = this.root.querySelector("[data-itl3-message-kicker]");
    this.messageMain = this.root.querySelector("[data-itl3-message-main]");
    this.speedValue = this.root.querySelector("[data-itl3-speed]");
    this.speedBar = this.root.querySelector("[data-itl3-speed-bar]");
    this.comboHud = this.root.querySelector("[data-itl3-combo]");
    this.charactersLayer = this.root.querySelector("[data-itl3-characters]");
    this.memoryList = this.root.querySelector("[data-itl3-memory-list]");
    this.debugOutput = this.root.querySelector("[data-itl3-debug]");
    this.root.dataset.itl3PreviewOnly = this.previewOnly ? "1" : "0";
    this.root.dataset.itl3AutoStart = this.autoStart ? "1" : "0";
    this.root.dataset.itl3KeeperMode = "auto-physics-half-mallet";
    this.root.dataset.itl3KeeperTrackingMode = "goal-trajectory-intercept-clear-mouth-save-enabled";
    this.root.dataset.itl3KeeperForceRatio = String(KEEPER_FORCE_RATIO);
    this.root.dataset.itl3CpuMalletMaxSpeed = String(MALLET_MAX_SPEED);
    this.root.dataset.itl3PlayerMalletMaxSpeed = String(PLAYER_MALLET_MAX_SPEED);
    this.root.dataset.itl3PlayerMalletAcceleration = String(PLAYER_MALLET_ACCELERATION);
    this.root.dataset.itl3PlayerMalletResponse = String(PLAYER_MALLET_RESPONSE);
    this.root.dataset.itl3PlayerMalletReleaseMode = "hard-stop-no-coast";
    this.root.dataset.itl3PlayerMalletReleaseSpeed = "0.00";
    this.root.dataset.itl3PlayerMalletReleaseCount = "0";
    this.root.dataset.itl3CharacterAbilitySystem = "body-profile-12-abilities-v1";
    this.root.dataset.itl3CharacterAbilityProfiles = JSON.stringify(this.players.map(player => ({
      index: player.index,
      characterId: player.characterDescriptor?.id || null,
      profileKey: player.characterDescriptor?.profileKey || null,
      tier: player.abilityProfile.tier,
      abilityProfile: player.abilityProfile.key,
      abilities: characterAbilityNames(player.abilityProfile)
    })));
    this.root.dataset.itl3CharacterAbilitySelfTest = JSON.stringify(characterAbilitySystemSelfTest());
    this.root.dataset.itl3CharacterAbilityRanges = JSON.stringify(this.players.map(player => ({
      index: player.index,
      minRadius: Number(player.malletMinRadius.toFixed(2)),
      maxRadius: Number(player.malletMaxRadius.toFixed(2)),
      goalSideProjection: Number(player.malletGoalSideMaxProjection.toFixed(2)),
      halfSectorDegrees: Number((player.malletHalfSector * 180 / Math.PI).toFixed(2)),
      kickoffRadius: Number(player.malletKickoffStartRadius.toFixed(2))
    })));
    this.root.dataset.itl3ServeRule = "countdown-initial-random-monster-then-conceding-player";
    this.root.dataset.itl3ServeSequence = "0";
    this.root.dataset.itl3ServeMode = "waiting";
    this.root.dataset.itl3ServeRecipient = "none";
    this.root.dataset.itl3PendingServeRecipient = "none";
    this.root.dataset.itl3LastGoalDefender = "none";
    this.root.dataset.itl3ServeDirection = "0.000,0.000";
    this.root.dataset.itl3KickoffCountdownPattern = "3-2-1-go";
    this.root.dataset.itl3KickoffCountdownChoices = `${KICKOFF_COUNTDOWN_SHORT_SECONDS.toFixed(1)},${KICKOFF_COUNTDOWN_LONG_SECONDS.toFixed(1)}`;
    this.root.dataset.itl3KickoffCountdownDuration = "0.0";
    this.root.dataset.itl3KickoffCountdownStage = "idle";
    this.root.dataset.itl3KickoffCountdownSource = "none";
    this.root.dataset.itl3KickoffArrowVisible = "0";
    this.root.dataset.itl3KickoffArrowRecipient = "none";
    this.root.dataset.itl3KickoffArrowDirection = "0.000,0.000";
    this.root.dataset.itl3KickoffArrowMode = "every-kickoff-countdown-and-launch";
    this.root.dataset.itl3KickoffArrowPhase = "idle";
    this.root.dataset.itl3KickoffArrowSource = "none";
    this.root.dataset.itl3KickoffArrowPostLaunchSeconds = String(KICKOFF_ARROW_POST_LAUNCH_MAX_SECONDS);
    this.root.dataset.itl3KickoffTurntableSyncMode = "waiting";
    this.root.dataset.itl3KickoffTurntableSyncState = "idle";
    this.root.dataset.itl3KickoffTurntableStartDelay = "0.000";
    this.root.dataset.itl3KickoffTurntableCountdownSpeed = "0.000";
    this.root.dataset.itl3KickoffTurntableFlightSeconds = "0.000";
    this.root.dataset.itl3KickoffTurntableSafePhase = "0.000";
    this.root.dataset.itl3KickoffTurntablePredictedClearanceDegrees = "0.00";
    this.root.dataset.itl3KickoffTurntableRequiredClearanceDegrees = (CENTER_BLACK_TURNTABLE_KICKOFF_REQUIRED_CLEARANCE * 180 / Math.PI).toFixed(2);
    this.root.dataset.itl3KickoffExpectedTerritory = "none";
    this.root.dataset.itl3KickoffFirstTerritory = "none";
    this.root.dataset.itl3KickoffFirstTerritoryMatched = "pending";
    this.root.dataset.itl3KickoffPropellerHitBeforeTerritory = "pending";
    this.root.dataset.itl3KickoffEntryHistory = "[]";
    this.root.dataset.itl3GoalReplayDuration = String(GOAL_REPLAY_DURATION);
    this.root.dataset.itl3GoalReplayPathSeconds = (GOAL_REPLAY_PATH_POINTS * FIXED_STEP).toFixed(2);
    this.root.dataset.itl3GoalReplayPreGoalSeconds = (GOAL_REPLAY_PATH_POINTS * FIXED_STEP - GOAL_LIVE_ENTRY_MAX_SECONDS).toFixed(2);
    this.root.dataset.itl3GoalReplayPathPoints = String(GOAL_REPLAY_PATH_POINTS);
    this.root.dataset.itl3GoalReplayHistoryPoints = String(GOAL_REPLAY_HISTORY_POINTS);
    this.root.dataset.itl3GoalReplayMode = "much-earlier-extended-slow-motion";
    this.root.dataset.itl3GoalReplayCamera = "field-side-front";
    this.root.dataset.itl3GoalReplayCameraFraming = "slightly-pulled-back";
    this.root.dataset.itl3GoalReplayCameraPullback = String(GOAL_REPLAY_CAMERA_PULLBACK);
    this.root.dataset.itl3GoalReplayCameraHeightLift = String(GOAL_REPLAY_CAMERA_HEIGHT_LIFT);
    this.root.dataset.itl3GoalReplayCharacterFacing = "per-frame-world-pose";
    this.root.dataset.itl3GoalReplayCharacterMotion = "frame-synchronized-position-facing-reaction";
    this.root.dataset.itl3GoalReplayCharacterTracks = "0";
    this.root.dataset.itl3GoalReplayCharacterFrameCount = "0";
    this.root.dataset.itl3GoalReplayCharacterFrameIndex = "-1";
    this.root.dataset.itl3GoalReplayCharacterState = "[]";
    this.root.dataset.itl3GoalReplayMalletMotion = "frame-synchronized-position-velocity-pose";
    this.root.dataset.itl3GoalReplayMalletTracks = "0";
    this.root.dataset.itl3GoalReplayMalletFrameCount = "0";
    this.root.dataset.itl3GoalReplayMalletFrameIndex = "-1";
    this.root.dataset.itl3GoalReplayMalletState = "[]";
    this.root.dataset.itl3GoalReplayMalletFidelity = "waiting";
    this.root.dataset.itl3GoalReplayStartRule = "after-live-puck-fully-enters-goal";
    this.root.dataset.itl3GoalReplayPuckRendering = "opaque-body-luminous-rim";
    this.root.dataset.itl3GoalReplayPuckOpacity = "1.00";
    this.root.dataset.itl3GoalTransition = "idle";
    this.root.dataset.itl3GoalEntryPuckVisible = "0";
    this.root.dataset.itl3GoalCornerApproachLastRecovery = "none";
    this.root.dataset.itl3GoalEntryTargetRadial = GOAL_LIVE_ENTRY_TARGET_RADIAL.toFixed(2);
    this.root.dataset.itl3GoalReplayCapturedFacingAngles = "[]";
    this.root.dataset.itl3GoalReplayAppliedFacingAngles = "[]";
    this.root.dataset.itl3TerritoryPanelStyle = "additive-neon";
    this.root.dataset.itl3TerritoryPanelOpacity = String(TERRITORY_PANEL_BASE_OPACITY);
    this.root.dataset.itl3TerritoryPanelGlowOpacity = String(TERRITORY_PANEL_GLOW_OPACITY);
    this.root.dataset.itl3PostGoalSequence = "live-entry>slow-motion>changed-panel-old-color>changed-panel-color-flash>kickoff-countdown";
    this.root.dataset.itl3TerritoryGoalFlashState = "idle";
    this.root.dataset.itl3TerritoryGoalFlashActive = "0";
    this.root.dataset.itl3TerritoryGoalFlashScorer = "none";
    this.root.dataset.itl3TerritoryGoalFlashDuration = String(TERRITORY_GOAL_FLASH_DURATION);
    this.root.dataset.itl3TerritoryGoalFlashPrechangeDuration = String(TERRITORY_GOAL_FLASH_PRECHANGE_DURATION);
    this.root.dataset.itl3TerritoryGoalFlashPulses = String(TERRITORY_GOAL_FLASH_PULSES);
    this.root.dataset.itl3TerritoryGoalFlashIntensity = "0.000";
    this.root.dataset.itl3TerritoryGoalFlashColorMix = "0.000";
    this.root.dataset.itl3TerritoryGoalFlashTileCount = "0";
    this.root.dataset.itl3TerritoryGoalFlashTileIndex = "none";
    this.root.dataset.itl3TerritoryGoalFlashPreviousOwner = "none";
    this.root.dataset.itl3TerritoryGoalFlashChangedOnly = "1";
    this.root.dataset.itl3CharacterLighting = "shadow-free-pastel-face-fill";
    this.root.dataset.itl3CharacterFaceLightIntensity = String(CHARACTER_FACE_LIGHT_INTENSITY);
    this.root.dataset.itl3CharacterAmbientFillIntensity = String(CHARACTER_AMBIENT_FILL_INTENSITY);
    this.root.dataset.itl3CharacterBodyEmissiveFloor = String(CHARACTER_BODY_EMISSIVE_FLOOR);
    this.root.dataset.itl3CharacterReceiveShadow = "disabled";
    this.root.dataset.itl3MalletRestitution = String(MALLET_RESTITUTION);
    this.root.dataset.itl3MalletSmashRestitution = String(MALLET_SMASH_RESTITUTION);
    this.root.dataset.itl3MalletSmashMinSpeed = String(MALLET_SMASH_MIN_SPEED);
    this.root.dataset.itl3MalletSmashMinAlignment = String(MALLET_SMASH_MIN_ALIGNMENT);
    this.root.dataset.itl3MalletSmashMinClosingSpeed = String(MALLET_SMASH_MIN_CLOSING_SPEED);
    this.root.dataset.itl3MalletSmashCount = "0";
    this.root.dataset.itl3MalletSmashBurning = "0";
    this.root.dataset.itl3MalletSmashBurnMode = "rear-trailing-fire-smoke";
    this.root.dataset.itl3MalletSmashSmokeActive = "0";
    this.root.dataset.itl3PuckTrailPointCount = String(PUCK_TRAIL_POINT_COUNT);
    this.root.dataset.itl3LastSmashBy = "none";
    this.root.dataset.itl3LastSmashPower = "0";
    this.root.dataset.itl3MalletMinRadius = String(MALLET_MIN_RADIUS);
    this.root.dataset.itl3MalletMaxRadius = String(MALLET_MAX_RADIUS);
    this.root.dataset.itl3MalletRangeShape = "goal-side-straight-chord";
    this.root.dataset.itl3MalletGoalSideMaxProjection = String(MALLET_GOAL_SIDE_MAX_PROJECTION);
    this.root.dataset.itl3KickoffMalletStartMode = "goal-side-limit-center";
    this.root.dataset.itl3KickoffMalletStartRadius = String(MALLET_KICKOFF_START_RADIUS);
    this.root.dataset.itl3KickoffMalletStartLateralOffset = "0";
    this.root.dataset.itl3MalletKeeperClearance = String(MALLET_KEEPER_CLEARANCE);
    this.root.dataset.itl3WallRestitution = String(WALL_RESTITUTION);
    this.root.dataset.itl3KeeperRestitution = String(KEEPER_RESTITUTION);
    this.root.dataset.itl3KeeperVelocityTransfer = String(KEEPER_VELOCITY_TRANSFER);
    this.root.dataset.itl3WallSpringMode = "goal-safe-puck-and-mallet";
    this.root.dataset.itl3WallSpringInterval = String(WALL_SPRING_INTERVAL);
    this.root.dataset.itl3WallSpringRestitution = String(WALL_SPRING_RESTITUTION);
    this.root.dataset.itl3WallSpringPuckMinKick = String(WALL_SPRING_PUCK_MIN_KICK);
    this.root.dataset.itl3WallSpringImpactRestitution = String(WALL_SPRING_IMPACT_RESTITUTION);
    this.root.dataset.itl3WallSpringImpactMinKick = String(WALL_SPRING_IMPACT_MIN_KICK);
    this.root.dataset.itl3WallSpringMalletRestitution = String(WALL_SPRING_MALLET_RESTITUTION);
    this.root.dataset.itl3WallSpringRetractedRestitution = String(WALL_SPRING_RETRACTED_RESTITUTION);
    this.root.dataset.itl3WallSpringRetractedMinKick = String(WALL_SPRING_RETRACTED_MIN_KICK);
    this.root.dataset.itl3WallSpringLastPuckHitMode = "none";
    this.root.dataset.itl3CenterPropellerMode = "three-arm-automatic-physical";
    this.root.dataset.itl3CenterPropellerSizeScale = String(CENTER_PROPELLER_SIZE_SCALE);
    this.root.dataset.itl3CenterPropellerSequence = "strong-cw>weak-cw>weak-ccw>strong-ccw>weak-ccw>weak-cw>repeat";
    this.root.dataset.itl3CenterPropellerCount = "0";
    this.root.dataset.itl3CenterPropellerHits = "0";
    this.root.dataset.itl3CenterBlackTurntableDirection = "clockwise";
    this.root.dataset.itl3CenterBlackTurntableSpeed = String(CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED);
    this.root.dataset.itl3CenterBlackTurntablePhysics = "propeller-centers-follow-turntable";
    this.root.dataset.itl3CenterPropellerOrbitMode = "clockwise-turntable";
    this.updateKeeperTelemetry(true);
    this.bindEvents();
    this.setupThree();
    this.updateGoalPhysicsTelemetry();
    this.root.dataset.itl3GoalPhysicsSelfTest = JSON.stringify(this.goalPhysicsSelfTest());
    this.root.dataset.itl3WallSpringSelfTest = JSON.stringify(this.wallSpringSelfTest());
    this.updateCenterPropellerTelemetry(true);
    this.root.dataset.itl3CenterPropellerSelfTest = JSON.stringify(this.centerPropellerSelfTest());
    this.root.dataset.itl3KickoffTurntableSelfTest = JSON.stringify(this.kickoffTurntableSyncSelfTest());
    this.renderMemories();
    this.updateScoreboard();
    this.resize();
    if (this.autoStart && !this.previewOnly) this.startMatch();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  ensureStylesheet() {
    if (document.getElementById("imasora-tri-link-modern-style")) return;
    const link = document.createElement("link");
    link.id = "imasora-tri-link-modern-style";
    link.rel = "stylesheet";
    link.href = "./assets/imasora-tri-link-modern.css?v=20260814-territory-goal-v1";
    document.head.appendChild(link);
  }

  markup() {
    return `<section class="itl3-shell itl3-modern" aria-label="イマソラ・トライリンク 3D対戦">
      <header class="itl3-gamebar">
        <div class="itl3-brand"><i class="itl3-brand-mark" aria-hidden="true"><span></span></i><div class="itl3-brand-copy"><small>IMASORA ARCADE // NEXT MATCH SYSTEM</small><strong>TRI-LINK <em>ARENA</em></strong></div></div>
        <div class="itl3-season"><span>TERRITORY LEAGUE</span><b>3-WAY BATTLE</b></div>
        <div class="itl3-clock"><span>BATTLE TIME</span><b data-itl3-clock>${MATCH_SECONDS}</b></div>
        <button class="itl3-exit" type="button" data-itl3-exit aria-label="アリーナを終了してゲーム機選択へ戻る"><span>EXIT</span><b>終了</b></button>
      </header>
      <div class="itl3-stage-shell" data-itl3-stage>
        <canvas class="itl3-canvas" data-itl3-canvas aria-label="3人の相棒が戦う立体エアホッケー盤"></canvas>
        <div class="itl3-scoreboard">${this.players.map(player => this.scoreCardMarkup(player)).join("")}</div>
        <div class="itl3-characters" data-itl3-characters>${this.players.map(player => this.characterMarkup(player)).join("")}</div>
        <div class="itl3-message" data-itl3-message><small data-itl3-message-kicker>PHYSICS LINK</small><strong data-itl3-message-main>READY</strong></div>
        <div class="itl3-combat-hud" aria-hidden="true"><div class="itl3-speed"><small>PUCK SPEED</small><b data-itl3-speed>000</b><i><span data-itl3-speed-bar></span></i></div><div class="itl3-combo" data-itl3-combo><small>IMPACT CHAIN</small><b>LINK <span>1</span></b></div></div>
        <div class="itl3-corner-bracket itl3-corner-bracket-a" aria-hidden="true"></div><div class="itl3-corner-bracket itl3-corner-bracket-b" aria-hidden="true"></div>
        ${this.openingMarkup()}
        <div class="itl3-control-hint"><i aria-hidden="true"></i><span>DRAG TO CONTROL</span><b>育成中の相棒をなぞって操作</b></div>
        <div class="itl3-vignette" aria-hidden="true"></div>
      </div>
      ${this.testMode ? this.developmentControlsMarkup() : ""}
      ${this.testMode ? `<div class="itl3-testbar" aria-label="トライリンク検証操作"><button type="button" data-itl3-test-capture="0">育成中が領域獲得</button><button type="button" data-itl3-test-capture="1">引退相棒が領域獲得</button><button type="button" data-itl3-test-capture="2">白レンが領域獲得</button><button type="button" data-itl3-test-timeup>残り1秒</button><span class="itl3-debug" data-itl3-debug>READY</span></div>` : ""}
      <section class="itl3-memory-panel"><div class="itl3-memory-heading"><div><small>AFTER MATCH ARCHIVE</small><strong>トライリンク・メモリーズ</strong></div><span>最新12試合</span></div><div class="itl3-memory-list" data-itl3-memory-list></div></section>
    </section>`;
  }

  openingMarkup() {
    if (this.autoStart) return "";
    return `<div class="itl3-opening" data-itl3-opening>
      <div class="itl3-opening-card">
        <div class="itl3-opening-eyebrow"><span>LIVE</span> THREE SOULS // ONE PUCK</div>
        <small>3D PHYSICS BATTLE ARENA</small>
        <h2>ゴールを決め、<br><em>盤面を奪え。</em></h2>
        <p>盤面は12領域。ゴールするたび相手側の領域が自分の色へ変わる。3匹とも最後まで戦い、120秒後に最も広い領域を持つ相棒が勝者です。</p>
        <div class="itl3-roster-preview">${this.players.map(player => `<div class="itl3-roster-unit" style="--itl3-color:${escapeHtml(player.color)}"><div class="itl3-roster-art">${player.art}</div><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(player.roleLabel)}</span></div>`).join("")}</div>
        <button class="itl3-primary" type="button" data-itl3-start><span>ENTER THE ARENA</span><b>マッチ開始</b><i aria-hidden="true">›</i></button>
      </div>
    </div>`;
  }

  developmentControlsMarkup() {
    const selectors = this.players.map(player => {
      const descriptor = player.characterDescriptor || DEVELOPMENT_CHARACTER_ROSTER[0];
      const profile = characterAbilityProfile(descriptor);
      return `<label class="itl3-dev-character-field"><span>PLAYER ${player.index + 1}</span><select data-itl3-dev-character="${player.index}" aria-label="プレイヤー${player.index + 1}の開発用モンスター">${developmentCharacterOptionsMarkup(descriptor?.id || "")}</select><small data-itl3-dev-ability="${player.index}">${escapeHtml(profile.tier)}｜${escapeHtml(profile.label)}｜${escapeHtml(characterAbilityNames(profile).join("・") || "補正なし")}</small></label>`;
    }).join("");
    return `<section class="itl3-dev-character-panel" aria-label="ゲーム機2 モンスター能力検証">
      <div class="itl3-dev-character-heading"><div><small>DEVELOPMENT / 192 CHARACTERS</small><strong>モンスター能力・対戦選択</strong></div><span>開花期48種＋満開期144種</span></div>
      <div class="itl3-dev-character-grid">${selectors}</div>
      <div class="itl3-dev-character-actions"><p>色・白系・装飾では能力差を付けず、6体格系統だけで補正します。</p><button type="button" data-itl3-dev-apply>選んだ3体を適用</button></div>
    </section>`;
  }

  scoreCardMarkup(player) {
    return `<article class="itl3-player-card" data-itl3-player="${player.index}" style="--itl3-color:${escapeHtml(player.color)}"><div class="itl3-player-index">0${player.index + 1}</div><div class="itl3-player-mini">${player.art}</div><div class="itl3-player-info"><small>${player.index === 0 ? "PLAYER" : "RIVAL CPU"}</small><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(player.roleLabel)}</span></div><div class="itl3-territory" data-itl3-territory><small>AREA</small><b><span data-itl3-territory-count>${TERRITORY_PER_PLAYER}</span><em>/${TERRITORY_SECTOR_COUNT}</em></b><i><span data-itl3-territory-bar style="width:${TERRITORY_PER_PLAYER / TERRITORY_SECTOR_COUNT * 100}%"></span></i></div></article>`;
  }

  characterMarkup(player) {
    return `<div class="itl3-character" data-itl3-character="${player.index}" style="--itl3-color:${escapeHtml(player.color)}"><span class="itl3-character-name"><i></i>${escapeHtml(player.name)}</span></div>`;
  }

  updateDevelopmentAbilitySummary(index, characterId) {
    const descriptor = characterDescriptorById(characterId);
    const profile = characterAbilityProfile(descriptor);
    const summary = this.root.querySelector(`[data-itl3-dev-ability="${index}"]`);
    if (summary) {
      summary.textContent = `${profile.tier}｜${profile.label}｜${characterAbilityNames(profile).join("・") || "補正なし"}`;
    }
  }

  applyDevelopmentCharacters() {
    if (!this.testMode) return;
    const selectedIds = this.players.map((player, index) => (
      String(this.root.querySelector(`[data-itl3-dev-character="${index}"]`)?.value || player.characterDescriptor?.id || "")
    ));
    const descriptors = selectedIds.map(characterDescriptorById);
    if (descriptors.some(descriptor => !descriptor)) return;
    const participants = this.players.map((player, index) => {
      const descriptor = descriptors[index];
      return {
        ...this.participants[index],
        id: `tri-link-dev-${index}-${descriptor.id}`,
        name: descriptor.name,
        art: fallbackArt(descriptor.name, descriptor.bodyColorCss || player.color),
        artViews: {},
        appearance: {
          ...player.appearance,
          role: player.role,
          artId: descriptor.id
        }
      };
    });
    window.ImasoraTriLink?.mount?.(this.root, {
      participants,
      memories: this.memories,
      onRecord: this.onRecord,
      testMode: true,
      devCharacterIds: selectedIds
    });
  }

  bindEvents() {
    this.root.querySelectorAll("[data-itl3-dev-character]").forEach(select => {
      select.addEventListener("change", () => {
        this.updateDevelopmentAbilitySummary(Number(select.dataset.itl3DevCharacter), select.value);
      });
    });
    this.root.querySelector("[data-itl3-dev-apply]")?.addEventListener("click", () => this.applyDevelopmentCharacters());
    this.root.querySelector("[data-itl3-start]")?.addEventListener("click", () => this.startMatch());
    this.root.querySelector("[data-itl3-exit]")?.addEventListener("click", () => {
      const stopButton = this.root.closest(".arcade-game-stage")?.querySelector("[data-arcade-stop]")
        || document.querySelector("#townArcade [data-arcade-stop]");
      stopButton?.click();
    });
    this.root.querySelectorAll("[data-itl3-test-capture]").forEach(button => {
      button.addEventListener("click", () => {
        if (!this.testMode || !this.running || this.finished || this.countdown > 0 || this.serveTimer > 0) return;
        const scorer = this.players[Number(button.dataset.itl3TestCapture)];
        const defender = this.players[(scorer.index + 1) % this.players.length];
        this.lastTouch = scorer.index;
        this.touchHistory = [scorer.index];
        this.setPuckOwner(scorer.index);
        const normalX = Math.cos(defender.angle);
        const normalZ = Math.sin(defender.angle);
        this.puck.x = normalX * (GOAL_SCORE_RADIAL + .5);
        this.puck.z = normalZ * (GOAL_SCORE_RADIAL + .5);
        this.puck.vx = normalX * 460;
        this.puck.vz = normalZ * 460;
        this.puck.visible = true;
        this.puck.goalPostCapture = null;
        this.puck.goalCornerApproach = null;
        this.puck.goalCornerApproachBlockedUntil = 0;
        this.appendReplayFrame();
        this.registerGoal(defender, true);
      });
    });
    this.root.querySelector("[data-itl3-test-timeup]")?.addEventListener("click", () => {
      if (!this.testMode || !this.running || this.finished) return;
      this.timeRemaining = Math.min(this.timeRemaining, 1);
    });
    this.onPointerDownBound = event => this.onPointerDown(event);
    this.onPointerMoveBound = event => this.onPointerMove(event);
    this.onPointerUpBound = event => this.onPointerUp(event);
    this.canvas?.addEventListener("pointerdown", this.onPointerDownBound);
    this.canvas?.addEventListener("pointermove", this.onPointerMoveBound);
    this.canvas?.addEventListener("pointerup", this.onPointerUpBound);
    this.canvas?.addEventListener("pointercancel", this.onPointerUpBound);
    this.canvas?.addEventListener("lostpointercapture", this.onPointerUpBound);
    this.onContextMenuBound = event => event.preventDefault();
    this.canvas?.addEventListener("contextmenu", this.onContextMenuBound);
    this.onKeyDown = event => {
      if (this.previewOnly) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        this.keyState.add(key);
        event.preventDefault();
      }
      if ((event.key === " " || event.key === "Enter") && !this.running && !this.finished) {
        this.startMatch();
        event.preventDefault();
      }
    };
    this.onKeyUp = event => {
      if (this.previewOnly) return;
      const key = event.key.toLowerCase();
      this.keyState.delete(key);
      const movementKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
      if (movementKeys.includes(key) && !this.dragging && !movementKeys.some(activeKey => this.keyState.has(activeKey))) {
        this.stopPlayerMalletMotion();
      }
    };
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(this.boundResize) : null;
    this.resizeObserver?.observe(this.stage);
    window.addEventListener("resize", this.boundResize);
  }

  setupThree() {
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false, powerPreference: "high-performance", stencil: false });
    } catch (error) {
      this.opening?.querySelector("p")?.replaceChildren(document.createTextNode("3D描画を起動できませんでした。ページを更新してもう一度開いてください。"));
      throw error;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.setClearColor(0x01030a, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020611, 0.00072);
    this.camera = new THREE.PerspectiveCamera(36, 1, 1, 2600);
    this.cameraBase = new THREE.Vector3(0, 610, 670);
    this.camera.position.copy(this.cameraBase);
    this.camera.lookAt(0, 0, -18);
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.controlPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.pointerWorld = new THREE.Vector3();
    this.buildEnvironment();
    this.buildLighting();
    this.buildArena();
    this.buildActors();
    this.buildParticles();
    this.buildPostProcessing();
  }

  buildEnvironment() {
    const domeMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uTop: { value: new THREE.Color(0x071b38) }, uBottom: { value: new THREE.Color(0x010208) } },
      vertexShader: `varying vec3 vWorld; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uTime; uniform vec3 uTop; uniform vec3 uBottom; varying vec3 vWorld; float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} void main(){float h=clamp(normalize(vWorld).y*.5+.5,0.0,1.0); vec3 c=mix(uBottom,uTop,pow(h,1.4)); float stars=step(.9965,hash(floor(normalize(vWorld).xz*620.0))); c+=stars*(.45+.55*sin(uTime*1.7+vWorld.x)) * vec3(.55,.82,1.0); gl_FragColor=vec4(c,1.0);}`
    });
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 28), domeMaterial);
    this.scene.add(this.skyDome);

    const starCount = 520;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = randomBetween(520, 1180);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = randomBetween(40, 720);
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const tint = new THREE.Color().setHSL(randomBetween(.48, .68), .75, randomBetween(.55, .92));
      colors.set([tint.r, tint.g, tint.b], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.starField = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 2.8, vertexColors: true, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.starField);
  }

  buildLighting() {
    const ambient = new THREE.HemisphereLight(0xb8e9ff, 0x03040a, 1.55);
    this.scene.add(ambient);
    const characterAmbient = new THREE.HemisphereLight(0xfff8ed, 0x52647d, CHARACTER_AMBIENT_FILL_INTENSITY);
    characterAmbient.layers.set(CHARACTER_OPAQUE_LAYER);
    this.scene.add(characterAmbient);
    this.characterAmbient = characterAmbient;
    const key = new THREE.DirectionalLight(0xf6fbff, 3.1);
    key.position.set(-230, 620, 330);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -520;
    key.shadow.camera.right = 520;
    key.shadow.camera.top = 520;
    key.shadow.camera.bottom = -520;
    this.scene.add(key);
    const fill = new THREE.PointLight(0x3ebcff, 34, 1180, 2);
    fill.position.set(0, 310, -230);
    this.scene.add(fill);
    const rim = new THREE.SpotLight(0xff4fae, 54, 1100, Math.PI * .24, .72, 1.4);
    rim.position.set(410, 430, 210);
    rim.target.position.set(0, 0, 0);
    this.scene.add(rim, rim.target);
    const rim2 = new THREE.SpotLight(0x42f0d3, 46, 1100, Math.PI * .24, .72, 1.4);
    rim2.position.set(-410, 390, 110);
    rim2.target.position.set(0, 0, -40);
    this.scene.add(rim2, rim2.target);
    this.goalLights = this.players.map(player => {
      const light = new THREE.PointLight(new THREE.Color(player.color), 18, 300, 2);
      light.position.set(Math.cos(player.angle) * 350, 48, Math.sin(player.angle) * 350);
      this.scene.add(light);
      return light;
    });
  }

  buildPostProcessing() {
    const size = this.renderer.getSize(new THREE.Vector2());
    this.sceneTarget = new THREE.WebGLRenderTarget(Math.max(1, size.x), Math.max(1, size.y), { depthBuffer: true, stencilBuffer: false });
    this.sceneTarget.texture.colorSpace = THREE.SRGBColorSpace;
    this.postUniforms = {
      tDiffuse: { value: this.sceneTarget.texture },
      uResolution: { value: new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)) },
      uTime: { value: 0 },
      uFlash: { value: 0 }
    };
    const postMaterial = new THREE.ShaderMaterial({
      uniforms: this.postUniforms,
      depthTest: false,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uResolution; uniform float uTime; uniform float uFlash; varying vec2 vUv;
        vec3 sampleScene(vec2 uv){return texture2D(tDiffuse,uv).rgb;}
        void main(){
          vec2 px=1.0/uResolution;
          float aberration=.8+uFlash*2.4;
          vec3 base=sampleScene(vUv);
          base.r=sampleScene(vUv+vec2(px.x*aberration,0.0)).r;
          base.b=sampleScene(vUv-vec2(px.x*aberration,0.0)).b;
          vec3 bloom=vec3(0.0);
          vec2 o1=px*3.5; vec2 o2=px*7.0;
          bloom+=max(sampleScene(vUv+vec2(o1.x,0.0))-.62,0.0);
          bloom+=max(sampleScene(vUv-vec2(o1.x,0.0))-.62,0.0);
          bloom+=max(sampleScene(vUv+vec2(0.0,o1.y))-.62,0.0);
          bloom+=max(sampleScene(vUv-vec2(0.0,o1.y))-.62,0.0);
          bloom+=max(sampleScene(vUv+o2)-.68,0.0)*.65;
          bloom+=max(sampleScene(vUv-o2)-.68,0.0)*.65;
          base+=bloom*.24;
          float vignette=pow(16.0*vUv.x*vUv.y*(1.0-vUv.x)*(1.0-vUv.y),.16);
          base*=mix(.58,1.0,vignette);
          base+=sin((vUv.y*uResolution.y)+uTime*18.0)*.006;
          base=mix(base,vec3(1.0,.75,.92),uFlash*.16);
          gl_FragColor=vec4(base,1.0);
        }`
    });
    postMaterial.toneMapped = false;
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    this.postScene.add(this.postQuad);
  }

  buildArena() {
    this.arenaGroup = new THREE.Group();
    this.scene.add(this.arenaGroup);

    const baseMaterials = [
      new THREE.MeshPhysicalMaterial({ color: 0x020711, metalness: .94, roughness: .2, clearcoat: .8 }),
      new THREE.MeshPhysicalMaterial({ color: 0x111f36, metalness: .87, roughness: .16, clearcoat: 1, clearcoatRoughness: .12 }),
      new THREE.MeshStandardMaterial({ color: 0x06111f, metalness: .75, roughness: .3 })
    ];
    const baseLayers = [
      { r1: ARENA_RADIUS + 84, r2: ARENA_RADIUS + 103, h: 28, y: -47, m: baseMaterials[0] },
      { r1: ARENA_RADIUS + 67, r2: ARENA_RADIUS + 80, h: 17, y: -24, m: baseMaterials[1] },
      { r1: ARENA_RADIUS + 49, r2: ARENA_RADIUS + 58, h: 12, y: -10, m: baseMaterials[2] }
    ];
    baseLayers.forEach(layer => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(layer.r1, layer.r2, layer.h, 128), layer.m);
      mesh.position.y = layer.y;
      mesh.receiveShadow = true;
      this.arenaGroup.add(mesh);
    });

    const ringSpecs = [
      { radius: ARENA_RADIUS + 88, tube: 4, color: 0x2bdfff, y: -32, intensity: 2.2 },
      { radius: ARENA_RADIUS + 64, tube: 6, color: 0x9b61ff, y: -13, intensity: 1.45 },
      { radius: ARENA_RADIUS + 43, tube: 9, color: 0xc4f4ff, y: -1, intensity: .75 }
    ];
    this.energyRings = ringSpecs.map(spec => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(spec.radius, spec.tube, 12, 160), new THREE.MeshStandardMaterial({ color: spec.color, metalness: .8, roughness: .18, emissive: spec.color, emissiveIntensity: spec.intensity }));
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = spec.y;
      this.arenaGroup.add(mesh);
      return mesh;
    });

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS + 1, ARENA_RADIUS + 4, 15, 128), new THREE.MeshPhysicalMaterial({ color: 0x07162a, metalness: .66, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x021526, emissiveIntensity: .55 }));
    floor.position.y = -8;
    floor.receiveShadow = true;
    this.arenaGroup.add(floor);

    this.floorUniforms = { uTime: { value: 0 }, uPulse: { value: 0 } };
    const energyFloor = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS - 8, 128), new THREE.ShaderMaterial({
      uniforms: this.floorUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; varying vec3 vPos; void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform float uTime; uniform float uPulse; varying vec2 vUv; varying vec3 vPos; float line(float v,float w){return 1.0-smoothstep(0.0,w,abs(fract(v)-.5));} void main(){vec2 p=vUv-.5;float r=length(p)*2.0;float a=atan(p.y,p.x);float radial=line(a/6.28318*24.0+uTime*.018,.055)*(1.0-r);float rings=line(r*9.0-uTime*.22,.06)*.45;float sector=line(a/6.28318*3.0,.035)*.75;float sweep=pow(max(0.0,cos(a-uTime*.32)),38.0)*(1.0-r);vec3 cyan=vec3(.12,.78,1.0);vec3 violet=vec3(.65,.25,1.0);vec3 c=mix(cyan,violet,.5+.5*sin(a*3.0+uTime*.3));float alpha=(radial*.15+rings*.18+sector*.22+sweep*.42)*(1.0-smoothstep(.88,1.0,r));alpha+=uPulse*.08*(1.0-r);gl_FragColor=vec4(c,alpha);}`
    }));
    energyFloor.rotation.x = -Math.PI / 2;
    energyFloor.position.y = 1.25;
    this.arenaGroup.add(energyFloor);
    this.energyFloor = energyFloor;

    this.buildFloorGraphics();
    this.buildWallsAndGoals();
    this.buildLedRing();
    this.buildStadium();
  }

  buildStadium() {
    this.stadiumGroup = new THREE.Group();
    this.scene.add(this.stadiumGroup);
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x07101f, metalness: .72, roughness: .32, emissive: 0x030817, emissiveIntensity: .4 });
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x4ccfff, metalness: .82, roughness: .2, emissive: 0x177aa0, emissiveIntensity: 1.2 });
    [ARENA_RADIUS + 145, ARENA_RADIUS + 195, ARENA_RADIUS + 245].forEach((radius, tier) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 12 + tier * 4, 10, 144), standMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 18 + tier * 29;
      this.stadiumGroup.add(ring);
      const rail = new THREE.Mesh(new THREE.TorusGeometry(radius - 13, 2.2, 7, 144), railMaterial);
      rail.rotation.x = Math.PI / 2;
      rail.position.y = 32 + tier * 29;
      this.stadiumGroup.add(rail);
    });

    const crowdGeometry = new THREE.IcosahedronGeometry(4.2, 0);
    const crowdMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .74 });
    const count = 280;
    this.crowd = new THREE.InstancedMesh(crowdGeometry, crowdMaterial, count);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      const tier = i % 3;
      const angle = i / count * Math.PI * 2 * 3.07 + tier * .13;
      const radius = ARENA_RADIUS + 142 + tier * 50 + randomBetween(-7, 7);
      matrix.makeTranslation(Math.cos(angle) * radius, 42 + tier * 29 + randomBetween(-3, 5), Math.sin(angle) * radius);
      this.crowd.setMatrixAt(i, matrix);
      color.setHSL((i * .037 + tier * .17) % 1, .76, .64);
      this.crowd.setColorAt(i, color);
    }
    this.stadiumGroup.add(this.crowd);

    this.holoPanels = [];
    for (let i = 0; i < 9; i += 1) {
      const angle = i / 9 * Math.PI * 2;
      const colorValue = i % 3 === 0 ? 0xff4fae : i % 3 === 1 ? 0x43e7ff : 0x9a70ff;
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(112, 30), new THREE.MeshBasicMaterial({ color: colorValue, transparent: true, opacity: .18, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      panel.position.set(Math.cos(angle) * 585, 108, Math.sin(angle) * 585);
      panel.lookAt(0, 80, 0);
      this.stadiumGroup.add(panel);
      this.holoPanels.push(panel);
    }
  }

  buildFloorGraphics() {
    this.buildTerritoryField();
    const addFloorBar = (group, x1, z1, x2, z2, width, material, y = 1.8) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(length, .65, width), material);
      bar.position.set((x1 + x2) * .5, y, (z1 + z2) * .5);
      bar.rotation.y = -Math.atan2(dz, dx);
      group.add(bar);
      return bar;
    };

    const centerBlackTurntable = new THREE.Group();
    centerBlackTurntable.name = "center-black-clockwise-turntable";
    const centerBlackDisc = new THREE.Mesh(
      new THREE.CircleGeometry(CENTER_BLACK_TURNTABLE_RADIUS, 96),
      new THREE.MeshBasicMaterial({
        color: 0x01050c,
        transparent: true,
        opacity: .82,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false
      })
    );
    centerBlackDisc.rotation.x = -Math.PI / 2;
    centerBlackDisc.position.y = 1.28;
    centerBlackDisc.renderOrder = 2;
    centerBlackTurntable.add(centerBlackDisc);
    this.arenaGroup.add(centerBlackTurntable);
    this.centerBlackTurntable = centerBlackTurntable;

    const triangleShape = new THREE.Shape();
    for (let i = 0; i < 3; i += 1) {
      const angle = PLAYER_ANGLES[i];
      const x = Math.cos(angle) * 148;
      const y = Math.sin(angle) * 148;
      if (i === 0) triangleShape.moveTo(x, y); else triangleShape.lineTo(x, y);
    }
    triangleShape.closePath();
    const triangle = new THREE.Mesh(
      new THREE.ShapeGeometry(triangleShape),
      new THREE.MeshBasicMaterial({ color: 0x72e6ff, transparent: true, opacity: .13, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    triangle.rotation.x = -Math.PI / 2;
    triangle.position.y = 1.1;
    this.arenaGroup.add(triangle);

    const centerCore = new THREE.Group();
    const centerOuterMaterial = new THREE.MeshBasicMaterial({ color: 0xf8e79b, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
    const centerInnerMaterial = new THREE.MeshBasicMaterial({ color: 0x8ff2ff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false });
    const outerCorePoints = Array.from({ length: 3 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 3;
      return { x: Math.cos(angle) * 60, z: Math.sin(angle) * 60 };
    });
    const innerCorePoints = Array.from({ length: 3 }, (_, index) => {
      const angle = Math.PI / 2 + index * Math.PI * 2 / 3;
      return { x: Math.cos(angle) * 29, z: Math.sin(angle) * 29 };
    });
    outerCorePoints.forEach((point, index) => {
      const next = outerCorePoints[(index + 1) % outerCorePoints.length];
      addFloorBar(centerCore, point.x, point.z, next.x, next.z, 5.2, centerOuterMaterial, 1.7);
    });
    innerCorePoints.forEach((point, index) => {
      const next = innerCorePoints[(index + 1) % innerCorePoints.length];
      addFloorBar(centerCore, point.x, point.z, next.x, next.z, 2.8, centerInnerMaterial, 1.82);
    });
    const centerDiamond = new THREE.Mesh(new THREE.BoxGeometry(15, .8, 15), centerInnerMaterial);
    centerDiamond.rotation.y = Math.PI / 4;
    centerDiamond.position.y = 1.9;
    centerCore.add(centerDiamond);
    centerBlackTurntable.add(centerCore);
    this.centerFloorCore = centerCore;
    this.buildCenterPropellers(outerCorePoints, centerBlackTurntable);
    this.syncCenterBlackTurntable(true);

    this.sectorLines = this.players.map(player => {
      const points = [new THREE.Vector3(Math.cos(player.angle) * 68, 1.45, Math.sin(player.angle) * 68), new THREE.Vector3(Math.cos(player.angle) * 315, 1.45, Math.sin(player.angle) * 315)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .62, blending: THREE.AdditiveBlending }));
      this.arenaGroup.add(line);
      const zone = new THREE.Group();
      const zoneRadius = ARENA_RADIUS * .57;
      const zoneTangentOffset = 52;
      const zoneX = Math.cos(player.angle) * zoneRadius - Math.sin(player.angle) * zoneTangentOffset;
      const zoneZ = Math.sin(player.angle) * zoneRadius + Math.cos(player.angle) * zoneTangentOffset;
      zone.position.set(zoneX, 0, zoneZ);
      zone.rotation.y = Math.PI - Math.atan2(zoneZ, zoneX);
      const zonePlateShape = new THREE.Shape();
      zonePlateShape.moveTo(-66, -34);
      zonePlateShape.lineTo(17, -34);
      zonePlateShape.lineTo(66, 0);
      zonePlateShape.lineTo(17, 34);
      zonePlateShape.lineTo(-66, 34);
      zonePlateShape.lineTo(-40, 0);
      zonePlateShape.closePath();
      const zonePlate = new THREE.Mesh(new THREE.ShapeGeometry(zonePlateShape), new THREE.MeshBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      zonePlate.rotation.x = -Math.PI / 2;
      zonePlate.position.y = 1.58;
      zone.add(zonePlate);
      const zoneBarMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .58, blending: THREE.AdditiveBlending, depthWrite: false });
      addFloorBar(zone, -53, -27, -13, 0, 5.4, zoneBarMaterial, 1.76);
      addFloorBar(zone, -13, 0, -53, 27, 5.4, zoneBarMaterial, 1.76);
      addFloorBar(zone, -5, -27, 35, 0, 5.4, zoneBarMaterial, 1.78);
      addFloorBar(zone, 35, 0, -5, 27, 5.4, zoneBarMaterial, 1.78);
      this.arenaGroup.add(zone);
      const chevronShape = new THREE.Shape();
      chevronShape.moveTo(-18, -12); chevronShape.lineTo(16, 0); chevronShape.lineTo(-18, 12); chevronShape.lineTo(-10, 0); chevronShape.closePath();
      const chevron = new THREE.Mesh(new THREE.ShapeGeometry(chevronShape), new THREE.MeshBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .52, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      chevron.rotation.x = -Math.PI / 2;
      const chevronRadius = 112;
      const chevronTangentOffset = 30;
      const chevronX = Math.cos(player.angle) * chevronRadius - Math.sin(player.angle) * chevronTangentOffset;
      const chevronZ = Math.sin(player.angle) * chevronRadius + Math.cos(player.angle) * chevronTangentOffset;
      chevron.rotation.y = Math.PI - Math.atan2(chevronZ, chevronX);
      chevron.position.set(chevronX, 1.9, chevronZ);
      chevron.scale.setScalar(1.12);
      this.arenaGroup.add(chevron);
      line.userData.zone = zone;
      line.userData.chevron = chevron;
      return line;
    });

    this.buildMalletRangeGuides();
  }

  buildCenterPropellers(vertexPoints, parentGroup = this.arenaGroup) {
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x07101d,
      metalness: .94,
      roughness: .14,
      clearcoat: 1,
      clearcoatRoughness: .04,
      emissive: 0x16364d,
      emissiveIntensity: .7
    });
    const bladeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf7d26d,
      metalness: .86,
      roughness: .11,
      clearcoat: 1,
      clearcoatRoughness: .025,
      emissive: 0x3edfff,
      emissiveIntensity: 1.25
    });
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x78edff,
      transparent: true,
      opacity: .92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0x58e8ff,
      transparent: true,
      opacity: .22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    this.centerPropellerMaterials = { baseMaterial, bladeMaterial, edgeMaterial, haloMaterial };

    const armLength = CENTER_PROPELLER_ARM_OUTER_RADIUS - CENTER_PROPELLER_ARM_INNER_RADIUS;
    const armCenter = (CENTER_PROPELLER_ARM_OUTER_RADIUS + CENTER_PROPELLER_ARM_INNER_RADIUS) * .5;
    const armGeometry = new THREE.BoxGeometry(armLength, 7.2, CENTER_PROPELLER_ARM_HALF_WIDTH * 2);
    const edgeGeometry = new THREE.BoxGeometry(armLength + 1.8, 1.35, CENTER_PROPELLER_ARM_HALF_WIDTH * 2 + 2.4);
    const tipGeometry = new THREE.SphereGeometry(CENTER_PROPELLER_ARM_HALF_WIDTH, 18, 10);
    const hubGeometry = new THREE.CylinderGeometry(CENTER_PROPELLER_HUB_RADIUS, CENTER_PROPELLER_HUB_RADIUS * 1.08, 10, 36);

    this.centerPropellers = vertexPoints.map((point, index) => {
      const group = new THREE.Group();
      group.name = `center-three-arm-propeller-${index}`;
      group.position.set(point.x, 0, point.z);
      group.scale.setScalar(CENTER_PROPELLER_SIZE_SCALE);

      const halo = new THREE.Mesh(new THREE.CircleGeometry(CENTER_PROPELLER_ARM_OUTER_RADIUS + 8, 48), haloMaterial);
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 2.15;
      halo.renderOrder = 4;
      group.add(halo);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 17, 6.5, 40), baseMaterial);
      base.position.y = 3.2;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(14.3, 2.1, 10, 48), edgeMaterial);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 6.2;
      group.add(baseRing);

      const rotor = new THREE.Group();
      rotor.position.y = 6.1;
      const hub = new THREE.Mesh(hubGeometry, bladeMaterial);
      hub.castShadow = true;
      rotor.add(hub);
      const hubRing = new THREE.Mesh(new THREE.TorusGeometry(8.4, 1.75, 10, 36), edgeMaterial);
      hubRing.rotation.x = Math.PI / 2;
      hubRing.position.y = 5.15;
      rotor.add(hubRing);

      const arms = [];
      for (let armIndex = 0; armIndex < 3; armIndex += 1) {
        const armAngle = armIndex * Math.PI * 2 / 3;
        const cos = Math.cos(armAngle);
        const sin = Math.sin(armAngle);
        const arm = new THREE.Mesh(armGeometry, bladeMaterial);
        arm.position.set(cos * armCenter, 0, sin * armCenter);
        arm.rotation.y = -armAngle;
        arm.castShadow = true;
        rotor.add(arm);

        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.set(cos * armCenter, 4.05, sin * armCenter);
        edge.rotation.y = -armAngle;
        rotor.add(edge);

        const tip = new THREE.Mesh(tipGeometry, bladeMaterial);
        tip.position.set(cos * CENTER_PROPELLER_ARM_OUTER_RADIUS, 0, sin * CENTER_PROPELLER_ARM_OUTER_RADIUS);
        tip.scale.y = .56;
        tip.castShadow = true;
        rotor.add(tip);
        arms.push(arm);
      }
      rotor.userData.arms = arms;
      rotor.userData.hub = hub;
      rotor.userData.hubRing = hubRing;
      group.add(rotor);
      parentGroup.add(group);

      return {
        index,
        localX: point.x,
        localZ: point.z,
        x: point.x,
        z: point.z,
        group,
        rotor,
        halo,
        baseRing,
        lastPuckHitAt: -10
      };
    });
    this.syncCenterPropellerVisuals();
    this.updateCenterPropellerTelemetry(true);
  }

  buildMalletRangeGuides() {
    const arcSegments = 56;
    const guideY = 2.42;
    const white = new THREE.Color(0xffffff);
    this.malletRangeGuides = this.players.map(player => {
      const minAngle = player.angle - player.malletHalfSector;
      const maxAngle = player.angle + player.malletHalfSector;
      const points = [];
      const addPolarPoint = (radius, angle) => {
        points.push(new THREE.Vector3(Math.cos(angle) * radius, guideY, Math.sin(angle) * radius));
      };

      addPolarPoint(player.malletMinRadius, minAngle);
      addPolarPoint(this.malletOuterRadius(player, minAngle), minAngle);
      for (let index = 1; index <= arcSegments; index += 1) {
        const angle = THREE.MathUtils.lerp(minAngle, maxAngle, index / arcSegments);
        addPolarPoint(this.malletOuterRadius(player, angle), angle);
      }
      addPolarPoint(player.malletMinRadius, maxAngle);
      for (let index = arcSegments - 1; index >= 0; index -= 1) {
        const angle = THREE.MathUtils.lerp(minAngle, maxAngle, index / arcSegments);
        addPolarPoint(player.malletMinRadius, angle);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const guideColor = new THREE.Color(player.color).lerp(white, .48);
      const glow = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: guideColor,
          transparent: true,
          opacity: .32,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
          toneMapped: false
        })
      );
      glow.renderOrder = 5;

      const dashed = new THREE.Line(
        geometry,
        new THREE.LineDashedMaterial({
          color: guideColor,
          transparent: true,
          opacity: .98,
          dashSize: 11,
          gapSize: 7,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
          toneMapped: false
        })
      );
      dashed.computeLineDistances();
      dashed.renderOrder = 6;

      const guide = new THREE.Group();
      guide.userData.playerIndex = player.index;
      guide.userData.minRadius = player.malletMinRadius;
      guide.userData.maxRadius = player.malletMaxRadius;
      guide.userData.goalSideMaxProjection = player.malletGoalSideMaxProjection;
      guide.userData.halfSector = player.malletHalfSector;
      guide.userData.abilityProfile = player.abilityProfile.key;
      guide.add(glow, dashed);
      this.arenaGroup.add(guide);
      return guide;
    });
  }

  buildTerritoryField() {
    this.territoryGroup = new THREE.Group();
    const sliceAngle = Math.PI * 2 / TERRITORY_SECTOR_COUNT;
    const white = new THREE.Color(0xffffff);
    this.territoryTiles = this.territories.map(territory => {
      const localIndex = territory.index % TERRITORY_PER_PLAYER;
      const startAngle = PLAYER_ANGLES[territory.homeIndex] - Math.PI / 3 + localIndex * sliceAngle + .018;
      const geometry = new THREE.RingGeometry(
        TERRITORY_INNER_RADIUS,
        TERRITORY_OUTER_RADIUS,
        32,
        1,
        startAngle,
        sliceAngle - .036
      );
      const color = new THREE.Color(this.players[territory.ownerIndex].color).lerp(white, .3);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: TERRITORY_PANEL_BASE_OPACITY,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false
      });
      const tile = new THREE.Mesh(geometry, material);
      tile.rotation.x = Math.PI / 2;
      tile.position.y = 1.34;
      tile.renderOrder = 1;
      tile.userData.territoryIndex = territory.index;
      tile.userData.targetColor = color.clone();
      tile.userData.pulse = 0;
      const glow = new THREE.Mesh(
        geometry.clone(),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: TERRITORY_PANEL_GLOW_OPACITY,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      );
      glow.position.z = .24;
      glow.scale.setScalar(1.022);
      glow.renderOrder = 0;
      tile.userData.glow = glow;
      tile.add(glow);
      const border = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 1),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: TERRITORY_PANEL_BORDER_OPACITY,
          blending: THREE.AdditiveBlending,
          depthTest: false,
          depthWrite: false,
          toneMapped: false
        })
      );
      border.position.z = -.32;
      border.renderOrder = 2;
      tile.userData.border = border;
      tile.add(border);
      this.territoryGroup.add(tile);
      return tile;
    });
    this.arenaGroup.add(this.territoryGroup);
  }

  buildWallsAndGoals() {
    const blockGeometry = new THREE.BoxGeometry(17, 28, 20);
    const wallMaterial = new THREE.MeshPhysicalMaterial({ color: 0x334861, metalness: .9, roughness: .15, clearcoat: 1, clearcoatRoughness: .08, emissive: 0x071a2d, emissiveIntensity: .72 });
    const lightGeometry = new THREE.BoxGeometry(10, 2.8, 21.5);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x7cecff, blending: THREE.AdditiveBlending, transparent: true, opacity: .88 });
    const count = 126;
    const transforms = [];
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI + i / count * Math.PI * 2;
      const inGoal = this.players.some(player => Math.abs(angleDifference(angle, player.angle)) < GOAL_HALF_ANGLE * GOAL_WIDTH_SCALE);
      if (inGoal) continue;
      transforms.push(angle);
    }

    this.wallBlocks = new THREE.InstancedMesh(blockGeometry, wallMaterial, transforms.length);
    this.wallLights = new THREE.InstancedMesh(lightGeometry, lightMaterial, transforms.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    transforms.forEach((angle, index) => {
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle - Math.PI / 2);
      position.set(Math.cos(angle) * ARENA_RADIUS, 15, Math.sin(angle) * ARENA_RADIUS);
      matrix.compose(position, quaternion, scale);
      this.wallBlocks.setMatrixAt(index, matrix);
      position.set(Math.cos(angle) * ARENA_RADIUS, 30, Math.sin(angle) * ARENA_RADIUS);
      matrix.compose(position, quaternion, scale);
      this.wallLights.setMatrixAt(index, matrix);
    });
    this.wallBlocks.castShadow = true;
    this.wallBlocks.receiveShadow = true;
    this.arenaGroup.add(this.wallBlocks, this.wallLights);

    const glass = new THREE.Mesh(new THREE.TorusGeometry(ARENA_RADIUS + 2, 7, 10, 192), new THREE.MeshPhysicalMaterial({ color: 0x8cecff, metalness: .05, roughness: .08, transmission: .82, transparent: true, opacity: .2, thickness: .4, emissive: 0x0b6a91, emissiveIntensity: .52 }));
    glass.rotation.x = Math.PI / 2;
    glass.position.y = 34;
    this.arenaGroup.add(glass);

    this.gates = this.players.map(player => this.buildGoal(player));
    this.buildWallSprings();
  }

  buildWallSprings() {
    const springAngles = [];
    for (let index = 0; index < WALL_SPRING_SAMPLE_COUNT; index += 1) {
      const angle = -Math.PI + (index + .5) / WALL_SPRING_SAMPLE_COUNT * Math.PI * 2;
      const insideGoalOpening = this.players.some(player => (
        Math.abs(angleDifference(angle, player.angle))
          < GOAL_HALF_ANGLE * GOAL_WIDTH_SCALE + WALL_SPRING_GOAL_MARGIN
      ));
      if (!insideGoalOpening) springAngles.push(angle);
    }

    this.wallSpringGroup = new THREE.Group();
    this.wallSpringGroup.name = "goal-safe-wall-springs";
    const baseGeometry = new THREE.CylinderGeometry(15, 17, 12, 32);
    const bumperGeometry = new THREE.CylinderGeometry(
      WALL_SPRING_BUMPER_RADIUS,
      WALL_SPRING_BUMPER_RADIUS * .92,
      8,
      40
    );
    const coilGeometry = new THREE.TorusGeometry(12, 2.1, 8, 28);
    const faceGeometry = new THREE.TorusGeometry(WALL_SPRING_BUMPER_RADIUS * .72, 2.7, 10, 36);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x263b54,
      metalness: .9,
      roughness: .17,
      clearcoat: 1,
      emissive: 0x071a2d,
      emissiveIntensity: .65
    });
    const coilMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9fbff,
      metalness: .95,
      roughness: .11,
      emissive: 0x2bcfff,
      emissiveIntensity: 1.15
    });
    const bumperMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x86edff,
      metalness: .76,
      roughness: .12,
      clearcoat: 1,
      clearcoatRoughness: .04,
      emissive: 0x21cfff,
      emissiveIntensity: 1.25
    });
    const faceMaterial = new THREE.MeshBasicMaterial({
      color: 0xf5fdff,
      transparent: true,
      opacity: .86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });
    this.wallSpringMaterials = { baseMaterial, coilMaterial, bumperMaterial, faceMaterial };

    this.wallSprings = springAngles.map((angle, index) => {
      const group = new THREE.Group();
      group.position.set(Math.cos(angle) * ARENA_RADIUS, 18, Math.sin(angle) * ARENA_RADIUS);
      group.rotation.y = -angle;
      group.userData.angle = angle;
      group.userData.normalX = Math.cos(angle);
      group.userData.normalZ = Math.sin(angle);
      group.userData.lastPuckHitAt = -10;
      group.userData.lastMalletHitAt = this.players.map(() => -10);

      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.rotation.z = Math.PI / 2;
      base.castShadow = true;
      group.add(base);

      const coilRings = Array.from({ length: 5 }, (_, coilIndex) => {
        const ring = new THREE.Mesh(coilGeometry, coilMaterial);
        ring.rotation.y = Math.PI / 2;
        ring.userData.coilRatio = (coilIndex + 1) / 6;
        group.add(ring);
        return ring;
      });

      const bumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
      bumper.rotation.z = Math.PI / 2;
      bumper.castShadow = true;
      group.add(bumper);
      const face = new THREE.Mesh(faceGeometry, faceMaterial);
      face.rotation.y = Math.PI / 2;
      face.renderOrder = 13;
      group.add(face);

      group.userData.index = index;
      group.userData.coilRings = coilRings;
      group.userData.bumper = bumper;
      group.userData.face = face;
      this.wallSpringGroup.add(group);
      return group;
    });
    this.arenaGroup.add(this.wallSpringGroup);
    this.updateWallSpringVisuals();
    this.updateWallSpringTelemetry(true);
  }

  buildGoal(player) {
    const group = new THREE.Group();
    const normal = new THREE.Vector3(Math.cos(player.angle), 0, Math.sin(player.angle));
    const tangent = new THREE.Vector3(-Math.sin(player.angle), 0, Math.cos(player.angle));
    const mouth = GOAL_MOUTH_WIDTH;
    const goalCenter = normal.clone().multiplyScalar(ARENA_RADIUS + GOAL_DEPTH * .48);
    group.position.copy(goalCenter);
    group.rotation.y = Math.PI / 2 - player.angle;
    const accent = new THREE.Color(player.color);
    const darkMaterial = new THREE.MeshPhysicalMaterial({
      color: accent.clone().multiplyScalar(.11),
      metalness: .72,
      roughness: .22,
      clearcoat: .7,
      emissive: accent,
      emissiveIntensity: .24
    });
    const railMaterial = new THREE.MeshStandardMaterial({ color: accent, metalness: .72, roughness: .16, emissive: accent, emissiveIntensity: 2.3 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf4fbff, metalness: .72, roughness: .15, emissive: accent, emissiveIntensity: 1.55 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(mouth * .88, 7, GOAL_DEPTH), darkMaterial);
    floor.position.y = -4;
    group.add(floor);
    [-1, 1].forEach(side => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(GOAL_POST_HALF_THICKNESS * 2, GOAL_CLEAR_HEIGHT, GOAL_DEPTH + 8), railMaterial);
      rail.position.set(side * mouth * .46, GOAL_CLEAR_HEIGHT * .5, 0);
      rail.castShadow = true;
      group.add(rail);
    });
    const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(mouth * .94, 10, 12), frameMaterial);
    frontBeam.position.set(0, GOAL_CLEAR_HEIGHT + 5, -GOAL_DEPTH * .52);
    frontBeam.castShadow = true;
    group.add(frontBeam);
    const back = new THREE.Mesh(new THREE.BoxGeometry(mouth * .88, 24, 9), darkMaterial);
    back.position.set(0, 8, GOAL_DEPTH * .5);
    group.add(back);
    // Keep the mouth readable from the normal match camera.  These are
    // visual-only markers; goal coordinates and puck physics stay unchanged.
    const outlineColor = accent.clone().lerp(new THREE.Color(0xffffff), .34);
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: outlineColor,
      transparent: true,
      opacity: .96,
      depthTest: true,
      depthWrite: false,
      toneMapped: false
    });
    const goalFrontZ = -GOAL_DEPTH * .52;
    const goalPostX = mouth * .46;
    const frontOutline = new THREE.Group();
    [-1, 1].forEach(side => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(GOAL_POST_HALF_THICKNESS + 1, GOAL_CLEAR_HEIGHT + 7, 7), outlineMaterial);
      post.position.set(side * goalPostX, (GOAL_CLEAR_HEIGHT + 7) * .5, goalFrontZ);
      post.renderOrder = 11;
      frontOutline.add(post);
    });
    const outlineTop = new THREE.Mesh(new THREE.BoxGeometry(mouth * .96, 7, 7), outlineMaterial);
    outlineTop.position.set(0, GOAL_CLEAR_HEIGHT + 3.5, goalFrontZ);
    outlineTop.renderOrder = 11;
    frontOutline.add(outlineTop);
    const threshold = new THREE.Mesh(new THREE.BoxGeometry(mouth * .88, 2.6, 7), outlineMaterial);
    threshold.position.set(0, 2.5, goalFrontZ);
    threshold.renderOrder = 11;
    frontOutline.add(threshold);
    group.add(frontOutline);

    const netGroup = new THREE.Group();
    netGroup.name = `goal-net-${player.index}`;
    const makeNetPanel = (points, cellsX, cellsY, opacity = .72) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flatMap(point => [point.x, point.y, point.z]), 3));
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: accent.clone() },
          uCells: { value: new THREE.Vector2(cellsX, cellsY) },
          uOpacity: { value: opacity }
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 uColor;uniform vec2 uCells;uniform float uOpacity;varying vec2 vUv;void main(){vec2 tile=vUv*uCells;vec2 edge=min(fract(tile),1.0-fract(tile));float line=1.0-smoothstep(.05,.145,min(edge.x,edge.y));if(line<.02)discard;float sheen=.84+.16*sin((vUv.x+vUv.y)*18.0);vec3 bright=mix(uColor,vec3(1.0),.18);gl_FragColor=vec4(bright,line*uOpacity*sheen);}`
      });
      const panel = new THREE.Mesh(geometry, material);
      panel.renderOrder = 10;
      netGroup.add(panel);
      return panel;
    };
    const netHalfWidth = mouth * .41;
    const netFrontZ = -GOAL_DEPTH * .48;
    const netBackZ = GOAL_DEPTH * .44;
    const netFrontTop = GOAL_CLEAR_HEIGHT;
    const netBackTop = GOAL_CLEAR_HEIGHT - 10;
    const netBack = makeNetPanel([
      new THREE.Vector3(-netHalfWidth, 0, netBackZ),
      new THREE.Vector3(netHalfWidth, 0, netBackZ),
      new THREE.Vector3(netHalfWidth, netBackTop, netBackZ),
      new THREE.Vector3(-netHalfWidth, netBackTop, netBackZ)
    ], 10, 14, .94);
    const netRoof = makeNetPanel([
      new THREE.Vector3(-netHalfWidth, netFrontTop, netFrontZ),
      new THREE.Vector3(netHalfWidth, netFrontTop, netFrontZ),
      new THREE.Vector3(netHalfWidth, netBackTop, netBackZ),
      new THREE.Vector3(-netHalfWidth, netBackTop, netBackZ)
    ], 10, 8, .84);
    const netSides = [-1, 1].map(side => makeNetPanel([
      new THREE.Vector3(side * netHalfWidth, 0, netFrontZ),
      new THREE.Vector3(side * netHalfWidth, 0, netBackZ),
      new THREE.Vector3(side * netHalfWidth, netBackTop, netBackZ),
      new THREE.Vector3(side * netHalfWidth, netFrontTop, netFrontZ)
    ], 7, 14, .84));
    group.add(netGroup);

    const portal = new THREE.Mesh(new THREE.PlaneGeometry(mouth * .78, GOAL_DEPTH * .82), new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(player.color) }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform vec3 uColor;uniform float uTime;varying vec2 vUv;void main(){float edge=smoothstep(.5,.44,abs(vUv.x-.5));float scan=.22+.22*sin(vUv.y*48.0-uTime*8.0);float beam=pow(max(0.0,sin((vUv.x+vUv.y)*18.0-uTime*2.0)),12.0);gl_FragColor=vec4(uColor,(scan*.16+beam*.1)*edge);}`
    }));
    portal.rotation.x = -Math.PI / 2;
    portal.position.set(0, .3, 0);
    group.add(portal);
    const badge = new THREE.Mesh(new THREE.RingGeometry(15, 21, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    badge.rotation.x = -Math.PI / 2;
    badge.position.set(0, 1, 4);
    group.add(badge);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 7, 24), new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: .95, blending: THREE.AdditiveBlending }));
    beacon.position.set(0, GOAL_CLEAR_HEIGHT + 24, -GOAL_DEPTH * .48);
    group.add(beacon);
    this.arenaGroup.add(group);

    const gateMaterial = new THREE.MeshStandardMaterial({ color: 0xbfe9f2, metalness: .9, roughness: .18, emissive: 0x224f63, emissiveIntensity: .5 });
    const gate = new THREE.Mesh(new THREE.BoxGeometry(mouth * .94, 32, 16), gateMaterial);
    gate.position.copy(normal.clone().multiplyScalar(ARENA_RADIUS));
    gate.position.y = -20;
    gate.rotation.y = Math.PI / 2 - player.angle;
    gate.scale.x = .04;
    gate.castShadow = true;
    this.arenaGroup.add(gate);

    return { group, gate, mouth, normal, tangent, portal, badge, beacon, frontOutline, netGroup, netBack, netRoof, netSides, target: 0, playerIndex: player.index };
  }

  buildLedRing() {
    this.leds = [];
    const geometry = new THREE.SphereGeometry(3.1, 8, 6);
    for (let i = 0; i < 72; i += 1) {
      const angle = i / 72 * Math.PI * 2;
      const material = new THREE.MeshBasicMaterial({ color: 0x64dcff, transparent: true, opacity: .66 });
      const led = new THREE.Mesh(geometry, material);
      led.position.set(Math.cos(angle) * (ARENA_RADIUS + 48), 11, Math.sin(angle) * (ARENA_RADIUS + 48));
      led.userData.phase = i / 72 * Math.PI * 2;
      this.arenaGroup.add(led);
      this.leds.push(led);
    }
  }

  buildActors() {
    this.malletMeshes = this.players.map(player => {
      const group = new THREE.Group();
      const playerColor = new THREE.Color(player.color);
      const malletScale = MALLET_RADIUS / 38;
      const baseMaterial = new THREE.MeshPhysicalMaterial({ color: playerColor, metalness: .72, roughness: .12, clearcoat: 1, clearcoatRoughness: .04, emissive: playerColor, emissiveIntensity: .58 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(MALLET_RADIUS, MALLET_RADIUS * .94, 17 * malletScale, 64), baseMaterial);
      body.position.y = 10 * malletScale;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      const darkCore = new THREE.Mesh(new THREE.CylinderGeometry(27 * malletScale, 30 * malletScale, 8 * malletScale, 48), new THREE.MeshPhysicalMaterial({ color: 0x07101e, metalness: .96, roughness: .12, clearcoat: 1 }));
      darkCore.position.y = 20 * malletScale;
      group.add(darkCore);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(15 * malletScale, 23 * malletScale, 25 * malletScale, 40), new THREE.MeshPhysicalMaterial({ color: 0xe8f7ff, metalness: .9, roughness: .09, clearcoat: 1, clearcoatRoughness: .03, emissive: playerColor, emissiveIntensity: .12 }));
      grip.position.y = 34 * malletScale;
      grip.castShadow = true;
      group.add(grip);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(15.2 * malletScale, 28, 14, 0, Math.PI * 2, 0, Math.PI * .48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .62, roughness: .08, clearcoat: 1, emissive: playerColor, emissiveIntensity: .24 }));
      cap.position.y = 46 * malletScale;
      group.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(MALLET_RADIUS - 2 * malletScale, 3.2 * malletScale, 12, 64), new THREE.MeshBasicMaterial({ color: playerColor, blending: THREE.AdditiveBlending }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 19 * malletScale;
      group.add(ring);
      const underGlow = new THREE.Mesh(new THREE.CircleGeometry(MALLET_RADIUS * 1.2, 48), new THREE.MeshBasicMaterial({ color: playerColor, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      underGlow.rotation.x = -Math.PI / 2;
      underGlow.position.y = 1.8 * malletScale;
      group.add(underGlow);
      group.userData.ring = ring;
      group.userData.underGlow = underGlow;
      group.position.set(player.x, 0, player.z);
      this.scene.add(group);
      return group;
    });

    this.puckMesh = new THREE.Group();
    const puckBody = new THREE.Mesh(new THREE.CylinderGeometry(PUCK_RADIUS, PUCK_RADIUS * .96, 8, 64), new THREE.MeshPhysicalMaterial({ color: PUCK_START_COLOR, metalness: .8, roughness: .09, clearcoat: 1, clearcoatRoughness: .025, emissive: PUCK_START_COLOR, emissiveIntensity: 1.3 }));
    puckBody.position.y = 7;
    puckBody.castShadow = true;
    this.puckMesh.add(puckBody);
    const puckRing = new THREE.Mesh(new THREE.TorusGeometry(PUCK_RADIUS - 1, 2.3, 10, 64), new THREE.MeshBasicMaterial({ color: 0xe9fcff, blending: THREE.AdditiveBlending }));
    puckRing.rotation.x = Math.PI / 2;
    puckRing.position.y = 12;
    this.puckMesh.add(puckRing);
    const puckGlow = new THREE.Mesh(new THREE.CircleGeometry(PUCK_RADIUS * 2.4, 48), new THREE.MeshBasicMaterial({ color: PUCK_START_COLOR, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    puckGlow.rotation.x = -Math.PI / 2;
    puckGlow.position.y = 2.1;
    this.puckMesh.add(puckGlow);
    this.puckMesh.userData.body = puckBody;
    this.puckMesh.userData.ring = puckRing;
    this.puckMesh.userData.glow = puckGlow;
    this.scene.add(this.puckMesh);
    this.puckBurnGroup = new THREE.Group();
    this.puckBurnGroup.visible = false;
    this.puckBurnGroup.userData.flames = [];
    this.puckBurnLocalAxis = new THREE.Vector3(0, 1, 0);
    this.puckBurnWorldDirection = new THREE.Vector3(-1, 0, 0);
    [
      { radius: 10.5, height: 40, color: 0xff3b00, opacity: .38, phase: .2 },
      { radius: 7.3, height: 32, color: 0xff8a00, opacity: .64, phase: 1.7 },
      { radius: 4.4, height: 24, color: 0xfff06a, opacity: .94, phase: 3.1 }
    ].forEach(spec => {
      const material = new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(spec.radius, spec.height, 18, 1, true), material);
      flame.position.y = PUCK_RADIUS * 1.08 + spec.height * .5;
      flame.userData.baseDistance = flame.position.y;
      flame.userData.baseOpacity = spec.opacity;
      flame.userData.phase = spec.phase;
      this.puckBurnGroup.add(flame);
      this.puckBurnGroup.userData.flames.push(flame);
    });
    const burnRing = new THREE.Mesh(
      new THREE.TorusGeometry(PUCK_RADIUS * 1.16, 2.1, 12, 56),
      new THREE.MeshBasicMaterial({ color: 0xff6b00, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    burnRing.rotation.x = Math.PI / 2;
    burnRing.position.y = PUCK_RADIUS * 1.05;
    this.puckBurnGroup.add(burnRing);
    this.puckBurnGroup.userData.ring = burnRing;
    this.scene.add(this.puckBurnGroup);
    this.replayPuck = new THREE.Mesh(
      new THREE.CylinderGeometry(PUCK_RADIUS * 1.08, PUCK_RADIUS * 1.04, 7, 64),
      new THREE.MeshBasicMaterial({
        color: PUCK_START_COLOR,
        transparent: false,
        opacity: 1,
        blending: THREE.NormalBlending,
        depthWrite: true,
        depthTest: true
      })
    );
    const replayPuckRing = new THREE.Mesh(
      new THREE.TorusGeometry(PUCK_RADIUS * 1.01, 2.5, 12, 64),
      new THREE.MeshBasicMaterial({
        color: 0xe9fcff,
        transparent: false,
        opacity: 1,
        blending: THREE.NormalBlending,
        depthWrite: true,
        depthTest: true
      })
    );
    replayPuckRing.rotation.x = Math.PI / 2;
    replayPuckRing.position.y = 3.7;
    this.replayPuck.add(replayPuckRing);
    this.replayPuck.userData.ring = replayPuckRing;
    this.replayPuck.position.y = 10;
    this.replayPuck.renderOrder = 9;
    this.replayPuck.visible = false;
    this.scene.add(this.replayPuck);
    this.buildKickoffArrow();

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(PUCK_TRAIL_POINT_COUNT * 3);
    this.trailGeometry.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trail = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({ color: PUCK_START_COLOR, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
    // The translucent center turntable is deliberately rendered late. Keep the
    // puck trail later still so crossing the black disc never masks the trail.
    this.trail.renderOrder = 6;
    this.scene.add(this.trail);
    this.trailGlow = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({ color: 0xe9fcff, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trailGlow.scale.set(1.004, 1, 1.004);
    this.trailGlow.renderOrder = 5;
    this.scene.add(this.trailGlow);
    this.setPuckOwner(null);
    this.buildCharacterAvatars();
  }

  buildKickoffArrow() {
    const group = new THREE.Group();
    group.position.set(0, 22, 0);
    group.visible = false;
    group.renderOrder = 30;

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xcaf8ff,
      transparent: true,
      opacity: .9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x54dcff,
      transparent: true,
      opacity: .24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide
    });
    const ringMaterial = glowMaterial.clone();
    ringMaterial.opacity = .42;

    const headLength = 54;
    const shaftLength = KICKOFF_ARROW_TIP_RADIUS - headLength - KICKOFF_ARROW_START_RADIUS;
    const shaftCenter = KICKOFF_ARROW_START_RADIUS + shaftLength * .5;
    const glowShaft = new THREE.Mesh(new THREE.PlaneGeometry(shaftLength, 30), glowMaterial);
    glowShaft.rotation.x = -Math.PI / 2;
    glowShaft.position.x = shaftCenter;
    glowShaft.renderOrder = 29;
    group.add(glowShaft);
    const coreShaft = new THREE.Mesh(new THREE.PlaneGeometry(shaftLength, 12), coreMaterial);
    coreShaft.rotation.x = -Math.PI / 2;
    coreShaft.position.x = shaftCenter;
    coreShaft.renderOrder = 30;
    group.add(coreShaft);

    const makeHead = (length, halfWidth, material, startX, renderOrder) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, -halfWidth);
      shape.lineTo(length, 0);
      shape.lineTo(0, halfWidth);
      shape.closePath();
      const head = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
      head.rotation.x = -Math.PI / 2;
      head.position.x = startX;
      head.renderOrder = renderOrder;
      group.add(head);
      return head;
    };
    makeHead(headLength + 12, 35, glowMaterial, KICKOFF_ARROW_TIP_RADIUS - headLength - 6, 29);
    makeHead(headLength, 24, coreMaterial, KICKOFF_ARROW_TIP_RADIUS - headLength, 30);

    const targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(27, 3.4, 12, 56),
      ringMaterial
    );
    targetRing.rotation.x = Math.PI / 2;
    targetRing.position.x = KICKOFF_ARROW_TIP_RADIUS + 20;
    targetRing.renderOrder = 30;
    group.add(targetRing);
    const targetLight = new THREE.PointLight(0x66e7ff, 0, 180, 2);
    targetLight.position.set(KICKOFF_ARROW_TIP_RADIUS + 16, 30, 0);
    group.add(targetLight);

    group.userData.coreMaterial = coreMaterial;
    group.userData.glowMaterial = glowMaterial;
    group.userData.ringMaterial = ringMaterial;
    group.userData.targetRing = targetRing;
    group.userData.targetLight = targetLight;
    this.kickoffArrow = group;
    this.scene.add(group);
  }

  buildLegacyFantasyWhiteMichiRoadSaberRen() {
    const model = new THREE.Group();
    const materials = [];
    const material = (color, options = {}) => {
      const created = new THREE.MeshPhysicalMaterial({
        color,
        metalness: options.metalness ?? .12,
        roughness: options.roughness ?? .34,
        clearcoat: options.clearcoat ?? .5,
        clearcoatRoughness: options.clearcoatRoughness ?? .14,
        emissive: options.emissive ?? 0x000000,
        emissiveIntensity: options.emissiveIntensity ?? 0
      });
      materials.push(created);
      return created;
    };
    const white = material(0xf7fbff, { roughness: .28, clearcoat: .92, clearcoatRoughness: .08 });
    const whiteShade = material(0xdcecff, { roughness: .3, clearcoat: .78, clearcoatRoughness: .1 });
    const wingBlue = material(0x91e9ff, { metalness: .16, roughness: .2, clearcoat: .9, emissive: 0x1b8fb4, emissiveIntensity: .18 });
    const wingEdge = material(0x2a7da2, { metalness: .5, roughness: .2, clearcoat: .72, emissive: 0x0c536e, emissiveIntensity: .22 });
    const gold = material(0xffd65b, { metalness: .7, roughness: .2, clearcoat: .9, emissive: 0xb86d05, emissiveIntensity: .24 });
    const red = material(0xc92f3a, { metalness: .16, roughness: .3, clearcoat: .58, emissive: 0x4d0a19, emissiveIntensity: .18 });
    const redTrim = material(0x8f2948, { metalness: .28, roughness: .25, clearcoat: .68, emissive: 0x420a2d, emissiveIntensity: .2 });
    const dark = material(0x152438, { metalness: .35, roughness: .24, clearcoat: .72 });
    const foot = material(0x8d6040, { metalness: .08, roughness: .42, clearcoat: .4 });
    const eye = material(0x183048, { metalness: .05, roughness: .2, clearcoat: .65, emissive: 0x071722, emissiveIntensity: .18 });
    const blade = material(0x8cecff, { metalness: .72, roughness: .12, clearcoat: 1, emissive: 0x28b9e7, emissiveIntensity: 1.15 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(33, 24, 18), white);
    body.scale.set(1, 1.12, .88);
    body.position.set(0, 61, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    model.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(29, 24, 18), white);
    head.scale.set(1, .96, .92);
    head.position.set(0, 101, 2);
    head.castShadow = true;
    model.add(head);

    const cheekLeft = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 8), new THREE.MeshPhysicalMaterial({ color: 0xff9cae, transparent: true, opacity: .72, roughness: .3, clearcoat: .5 }));
    const cheekRight = cheekLeft.clone();
    cheekLeft.position.set(-22, 92, 22);
    cheekRight.position.set(22, 92, 22);
    model.add(cheekLeft, cheekRight);
    materials.push(cheekLeft.material);

    const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(4.3, 14, 10), eye);
    const eyeRight = eyeLeft.clone();
    eyeLeft.position.set(-11, 105, 26.4);
    eyeRight.position.set(11, 105, 26.4);
    model.add(eyeLeft, eyeRight);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(3.3, 12, 8), gold);
    nose.scale.set(.8, .7, .7);
    nose.position.set(0, 96, 28);
    model.add(nose);

    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7, 91, 27.5),
      new THREE.Vector3(0, 88.5, 29),
      new THREE.Vector3(7, 91, 27.5)
    ]);
    const mouth = new THREE.Mesh(new THREE.TubeGeometry(mouthCurve, 10, 1.35, 6, false), dark);
    model.add(mouth);

    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(20, 3.8, 8, 24), gold);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.set(0, 126, 2);
    model.add(crownBand);
    [-13, 0, 13].forEach((x, index) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(index === 1 ? 7 : 6, index === 1 ? 21 : 16, 5), gold);
      spike.position.set(x, index === 1 ? 139 : 136, 2);
      spike.rotation.y = Math.PI / 5;
      spike.castShadow = true;
      model.add(spike);
    });

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 8);
    wingShape.lineTo(-18, 28);
    wingShape.quadraticCurveTo(-42, 24, -36, 2);
    wingShape.quadraticCurveTo(-31, -18, -7, -27);
    wingShape.quadraticCurveTo(-13, -3, 0, 8);
    const wingGeometry = new THREE.ExtrudeGeometry(wingShape, { depth: 6, bevelEnabled: true, bevelSegments: 2, bevelSize: 1.7, bevelThickness: 1.5 });
    wingGeometry.center();
    const wingLeft = new THREE.Mesh(wingGeometry, wingBlue);
    const wingRight = new THREE.Mesh(wingGeometry, wingBlue);
    wingLeft.position.set(-28, 83, -5);
    wingRight.position.set(28, 83, -5);
    wingLeft.scale.x = -1;
    wingLeft.rotation.y = -.12;
    wingRight.rotation.y = .12;
    wingLeft.castShadow = wingRight.castShadow = true;
    model.add(wingLeft, wingRight);
    const wingEdgeGeometry = new THREE.TorusGeometry(16, 1.4, 6, 24, Math.PI * 1.25);
    const wingEdgeLeft = new THREE.Mesh(wingEdgeGeometry, wingEdge);
    const wingEdgeRight = wingEdgeLeft.clone();
    wingEdgeLeft.position.set(-32, 83, -9);
    wingEdgeRight.position.set(32, 83, -9);
    wingEdgeLeft.rotation.z = -.38;
    wingEdgeRight.rotation.z = .38;
    model.add(wingEdgeLeft, wingEdgeRight);

    const capeShape = new THREE.Shape();
    capeShape.moveTo(-29, 19);
    capeShape.quadraticCurveTo(-39, -2, -30, -28);
    capeShape.quadraticCurveTo(0, -19, 30, -28);
    capeShape.quadraticCurveTo(39, -2, 29, 19);
    capeShape.quadraticCurveTo(0, 8, -29, 19);
    const capeGeometry = new THREE.ExtrudeGeometry(capeShape, { depth: 5, bevelEnabled: true, bevelSegments: 2, bevelSize: 1.4, bevelThickness: 1.2 });
    capeGeometry.center();
    const cape = new THREE.Mesh(capeGeometry, red);
    cape.position.set(0, 72, -27);
    cape.rotation.x = -.05;
    cape.castShadow = true;
    model.add(cape);
    const capeTrim = new THREE.Mesh(new THREE.BoxGeometry(52, 4, 7), redTrim);
    capeTrim.position.set(0, 55, -29.5);
    capeTrim.rotation.z = .03;
    model.add(capeTrim);

    const armGeometry = new THREE.CapsuleGeometry(7, 20, 6, 12);
    const armLeft = new THREE.Mesh(armGeometry, whiteShade);
    const armRight = new THREE.Mesh(armGeometry, whiteShade);
    armLeft.position.set(-32, 70, 4);
    armRight.position.set(32, 70, 4);
    armLeft.rotation.z = -.55;
    armRight.rotation.z = .55;
    model.add(armLeft, armRight);
    const footLeft = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 10), foot);
    const footRight = footLeft.clone();
    footLeft.scale.set(1.2, .55, 1.35);
    footRight.scale.copy(footLeft.scale);
    footLeft.position.set(-16, 25, 7);
    footRight.position.set(16, 25, 7);
    model.add(footLeft, footRight);

    const swordGrip = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 19, 10), dark);
    swordGrip.position.set(38, 75, -12);
    swordGrip.rotation.z = -.25;
    model.add(swordGrip);
    const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(22, 3.5, 5), gold);
    swordGuard.position.set(38, 86, -12);
    swordGuard.rotation.z = -.25;
    model.add(swordGuard);
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(5, 42, 3.2), blade);
    swordBlade.position.set(44, 105, -12);
    swordBlade.rotation.z = -.25;
    swordBlade.castShadow = true;
    model.add(swordBlade);

    const aura = new THREE.Mesh(new THREE.TorusGeometry(43, 1.8, 8, 64), new THREE.MeshBasicMaterial({ color: 0x8cecff, transparent: true, opacity: .48, blending: THREE.AdditiveBlending }));
    aura.rotation.x = Math.PI / 2;
    aura.position.y = 12;
    model.add(aura);
    model.userData = { wings: [wingLeft, wingRight], cape, swordBlade, aura, materials };
    model.scale.setScalar(.88);
    return model;
  }

  buildDirectionalBillboardWhiteMichiRoadSaberRen() {
    const model = new THREE.Group();
    const viewMeshes = new Map();
    const shellDepth = 5.5;
    AVATAR_VIEW_RING.forEach((view, index) => {
      const angle = index * Math.PI / 4;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(124, 146),
        new THREE.MeshBasicMaterial({
          transparent: true,
          alphaTest: .025,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.NormalBlending,
          toneMapped: false
        })
      );
      mesh.position.set(Math.sin(angle) * shellDepth, 78, Math.cos(angle) * shellDepth);
      mesh.rotation.y = angle;
      mesh.renderOrder = 6;
      mesh.visible = false;
      model.add(mesh);
      viewMeshes.set(view, mesh);
    });
    const depthRing = new THREE.Mesh(
      new THREE.TorusGeometry(43, 1.3, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0x8cecff, transparent: true, opacity: .2, blending: THREE.AdditiveBlending })
    );
    depthRing.rotation.x = Math.PI / 2;
    depthRing.position.y = 12;
    model.add(depthRing);
    model.scale.setScalar(.9);
    model.userData = {
      viewMeshes,
      depthRing,
      activeView: "front",
      faithful3d: true
    };
    return model;
  }

  buildSvgExtrudedArtwork(svgMarkup, depth = 8) {
    const output = new THREE.Group();
    if (!svgMarkup || !/<svg[\s>]/i.test(svgMarkup)) return output;
    const document = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
    const root = document.documentElement;
    if (!root || root.nodeName.toLowerCase() !== "svg") return output;
    const identity = [1, 0, 0, 1, 0, 0];
    const multiply = (a, b) => [
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5]
    ];
    const transformPoint = (matrix, x, y) => ({
      x: matrix[0] * x + matrix[2] * y + matrix[4],
      y: matrix[1] * x + matrix[3] * y + matrix[5]
    });
    const parseTransform = value => {
      let matrix = identity.slice();
      const matches = String(value || "").matchAll(/(translate|scale|rotate|matrix)\s*\(([^)]*)\)/gi);
      for (const match of matches) {
        const numbers = match[2].split(/[\s,]+/).filter(Boolean).map(Number);
        const kind = match[1].toLowerCase();
        let next = identity.slice();
        if (kind === "translate") next = [1, 0, 0, 1, numbers[0] || 0, numbers[1] || 0];
        if (kind === "scale") next = [numbers[0] || 1, 0, 0, numbers.length > 1 ? numbers[1] : (numbers[0] || 1), 0, 0];
        if (kind === "rotate") {
          const radians = (numbers[0] || 0) * Math.PI / 180;
          const cos = Math.cos(radians);
          const sin = Math.sin(radians);
          next = [cos, sin, -sin, cos, 0, 0];
          if (numbers.length > 2) {
            const cx = numbers[1];
            const cy = numbers[2];
            next = multiply(multiply([1, 0, 0, 1, cx, cy], next), [1, 0, 0, 1, -cx, -cy]);
          }
        }
        if (kind === "matrix" && numbers.length >= 6) next = numbers.slice(0, 6);
        matrix = multiply(matrix, next);
      }
      return matrix;
    };
    const toWorld = (matrix, x, y) => {
      const point = transformPoint(matrix, x, y);
      return { x: (point.x - 58) * 1.04, y: (58 - point.y) * 1.04 };
    };
    const tokenizePath = value => String(value || "").match(/[a-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
    const pathShape = (value, matrix) => {
      const tokens = tokenizePath(value);
      const shape = new THREE.Shape();
      let cursor = 0;
      let command = "";
      let current = { x: 0, y: 0 };
      let start = { x: 0, y: 0 };
      let lastCubic = null;
      let lastQuadratic = null;
      let started = false;
      const isCommand = token => /^[a-z]$/i.test(token);
      const number = () => Number(tokens[cursor++]);
      const point = (x, y) => toWorld(matrix, x, y);
      const readPoint = relative => {
        const x = number();
        const y = number();
        return { x: relative ? current.x + x : x, y: relative ? current.y + y : y };
      };
      while (cursor < tokens.length) {
        if (isCommand(tokens[cursor])) command = tokens[cursor++];
        if (!command) break;
        const operation = command.toUpperCase();
        const relative = command === command.toLowerCase();
        if (operation === "Z") {
          if (started) shape.closePath();
          current = { ...start };
          lastCubic = null;
          lastQuadratic = null;
          command = "";
          continue;
        }
        const required = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 }[operation];
        if (!required || cursor + required > tokens.length) break;
        if (operation === "M" || operation === "L" || operation === "T") {
          const next = readPoint(relative);
          const mapped = point(next.x, next.y);
          if (operation === "M") {
            shape.moveTo(mapped.x, mapped.y);
            start = { ...next };
            started = true;
            command = relative ? "l" : "L";
          } else if (operation === "T") {
            const control = lastQuadratic ? { x: current.x * 2 - lastQuadratic.x, y: current.y * 2 - lastQuadratic.y } : current;
            const controlMapped = point(control.x, control.y);
            shape.quadraticCurveTo(controlMapped.x, controlMapped.y, mapped.x, mapped.y);
            lastQuadratic = control;
          } else {
            shape.lineTo(mapped.x, mapped.y);
          }
          current = next;
          lastCubic = null;
          if (operation !== "T") lastQuadratic = null;
          continue;
        }
        if (operation === "H") {
          const x = number();
          current = { x: relative ? current.x + x : x, y: current.y };
          const mapped = point(current.x, current.y);
          shape.lineTo(mapped.x, mapped.y);
          lastCubic = null;
          lastQuadratic = null;
          continue;
        }
        if (operation === "V") {
          const y = number();
          current = { x: current.x, y: relative ? current.y + y : y };
          const mapped = point(current.x, current.y);
          shape.lineTo(mapped.x, mapped.y);
          lastCubic = null;
          lastQuadratic = null;
          continue;
        }
        if (operation === "C") {
          const x1 = number();
          const y1 = number();
          const x2 = number();
          const y2 = number();
          const endX = number();
          const endY = number();
          const control1 = { x: relative ? current.x + x1 : x1, y: relative ? current.y + y1 : y1 };
          const control2 = { x: relative ? current.x + x2 : x2, y: relative ? current.y + y2 : y2 };
          const end = { x: relative ? current.x + endX : endX, y: relative ? current.y + endY : endY };
          const a = point(control1.x, control1.y);
          const b = point(control2.x, control2.y);
          const c = point(end.x, end.y);
          shape.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
          current = end;
          lastCubic = { ...control2 };
          lastQuadratic = null;
          continue;
        }
        if (operation === "S") {
          const x2 = number();
          const y2 = number();
          const endX = number();
          const endY = number();
          const control1 = lastCubic ? { x: current.x * 2 - lastCubic.x, y: current.y * 2 - lastCubic.y } : current;
          const control2 = { x: relative ? current.x + x2 : x2, y: relative ? current.y + y2 : y2 };
          const end = { x: relative ? current.x + endX : endX, y: relative ? current.y + endY : endY };
          const a = point(control1.x, control1.y);
          const b = point(control2.x, control2.y);
          const c = point(end.x, end.y);
          shape.bezierCurveTo(a.x, a.y, b.x, b.y, c.x, c.y);
          current = end;
          lastCubic = { ...control2 };
          lastQuadratic = null;
          continue;
        }
        if (operation === "Q") {
          const x1 = number();
          const y1 = number();
          const endX = number();
          const endY = number();
          const control = { x: relative ? current.x + x1 : x1, y: relative ? current.y + y1 : y1 };
          const end = { x: relative ? current.x + endX : endX, y: relative ? current.y + endY : endY };
          const a = point(control.x, control.y);
          const b = point(end.x, end.y);
          shape.quadraticCurveTo(a.x, a.y, b.x, b.y);
          current = end;
          lastQuadratic = { ...control };
          lastCubic = null;
          continue;
        }
        if (operation === "A") {
          number(); number(); number(); number(); number();
          const endX = number();
          const endY = number();
          current = { x: relative ? current.x + endX : endX, y: relative ? current.y + endY : endY };
          const mapped = point(current.x, current.y);
          shape.lineTo(mapped.x, mapped.y);
          lastCubic = null;
          lastQuadratic = null;
        }
      }
      return started ? shape : null;
    };
    const polygonShape = (points, matrix, close = true) => {
      const pairs = String(points || "").trim().split(/[\s,]+/).map(Number);
      if (pairs.length < 4) return null;
      const shape = new THREE.Shape();
      for (let index = 0; index + 1 < pairs.length; index += 2) {
        const mapped = toWorld(matrix, pairs[index], pairs[index + 1]);
        if (index === 0) shape.moveTo(mapped.x, mapped.y);
        else shape.lineTo(mapped.x, mapped.y);
      }
      if (close) shape.closePath();
      return shape;
    };
    const ellipseShape = (cx, cy, rx, ry, matrix) => {
      const shape = new THREE.Shape();
      for (let index = 0; index < 32; index += 1) {
        const angle = index / 32 * Math.PI * 2;
        const mapped = toWorld(matrix, cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
        if (index === 0) shape.moveTo(mapped.x, mapped.y);
        else shape.lineTo(mapped.x, mapped.y);
      }
      shape.closePath();
      return shape;
    };
    const paint = (value, opacity = 1) => {
      const raw = String(value || "").trim();
      if (!raw || raw === "none" || raw === "transparent") return null;
      const rgba = raw.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:[, ]+\/?)\s*([\d.]*)\s*\)?$/i);
      if (rgba) return { color: new THREE.Color(Number(rgba[1]) / 255, Number(rgba[2]) / 255, Number(rgba[3]) / 255), opacity: opacity * (rgba[4] ? Number(rgba[4]) : 1) };
      if (/^#[0-9a-f]{8}$/i.test(raw)) return { color: new THREE.Color(`#${raw.slice(1, 7)}`), opacity: opacity * (parseInt(raw.slice(7), 16) / 255) };
      try { return { color: new THREE.Color(raw), opacity }; } catch { return null; }
    };
    let layerIndex = 0;
    const walk = (node, parentMatrix = identity, inheritedFill = "#ffffff", inheritedOpacity = 1) => {
      if (node.nodeType !== 1) return;
      const matrix = multiply(parentMatrix, parseTransform(node.getAttribute("transform")));
      const fill = node.getAttribute("fill") || inheritedFill;
      const opacity = inheritedOpacity * (Number(node.getAttribute("opacity")) || 1) * (Number(node.getAttribute("fill-opacity")) || 1);
      const tag = node.nodeName.toLowerCase();
      let shape = null;
      if (tag === "path") shape = pathShape(node.getAttribute("d"), matrix);
      if (tag === "circle") shape = ellipseShape(Number(node.getAttribute("cx") || 0), Number(node.getAttribute("cy") || 0), Number(node.getAttribute("r") || 0), Number(node.getAttribute("r") || 0), matrix);
      if (tag === "ellipse") shape = ellipseShape(Number(node.getAttribute("cx") || 0), Number(node.getAttribute("cy") || 0), Number(node.getAttribute("rx") || 0), Number(node.getAttribute("ry") || 0), matrix);
      if (tag === "rect") {
        const x = Number(node.getAttribute("x") || 0);
        const y = Number(node.getAttribute("y") || 0);
        const w = Number(node.getAttribute("width") || 0);
        const h = Number(node.getAttribute("height") || 0);
        shape = polygonShape(`${x},${y} ${x + w},${y} ${x + w},${y + h} ${x},${y + h}`, matrix);
      }
      if (tag === "polygon" || tag === "polyline") shape = polygonShape(node.getAttribute("points"), matrix, tag === "polygon");
      const color = paint(fill, opacity);
      if (shape && color) {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 1, bevelSize: .42, bevelThickness: .32, curveSegments: 5, steps: 1 });
        const mesh = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: color.color, metalness: .08, roughness: .36, clearcoat: .5, transparent: color.opacity < .999, opacity: color.opacity, side: THREE.DoubleSide }));
        mesh.position.z = layerIndex++ * .14;
        mesh.renderOrder = 4 + layerIndex * .001;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        output.add(mesh);
      }
      Array.from(node.children || []).forEach(child => walk(child, matrix, fill, opacity));
    };
    walk(root);
    return output;
  }

  buildTurntableArtworkSector(viewIndex, material, radiusX = 49, radiusY = 56, radiusZ = 44) {
    const geometry = new THREE.BufferGeometry();
    const angularSegments = 8;
    const verticalSegments = 24;
    const positions = [];
    const uvs = [];
    const indices = [];
    const viewCenter = viewIndex * Math.PI / 4;
    const start = viewCenter - Math.PI / 8;
    const end = viewCenter + Math.PI / 8;
    for (let yIndex = 0; yIndex <= verticalSegments; yIndex += 1) {
      const latitude = -Math.PI / 2 + (yIndex / verticalSegments) * Math.PI;
      const heightRatio = Math.sin(latitude);
      const ringRadius = Math.cos(latitude);
      for (let angleIndex = 0; angleIndex <= angularSegments; angleIndex += 1) {
        const theta = start + (angleIndex / angularSegments) * (end - start);
        positions.push(
          radiusX * ringRadius * Math.sin(theta),
          78 + radiusY * heightRatio,
          radiusZ * ringRadius * Math.cos(theta)
        );
        uvs.push(angleIndex / angularSegments, 1 - yIndex / verticalSegments);
      }
    }
    const rowSize = angularSegments + 1;
    for (let yIndex = 0; yIndex < verticalSegments; yIndex += 1) {
      for (let angleIndex = 0; angleIndex < angularSegments; angleIndex += 1) {
        const a = yIndex * rowSize + angleIndex;
        const b = a + 1;
        const c = a + rowSize;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 4 + viewIndex * .01;
    return mesh;
  }

  buildWhiteMichiBodyGeometryFromReference() {
    const scale = 1.04;
    const depthOffset = 5.5 * scale;
    const toWorldY = svgY => 78 + (58 - svgY) * scale;
    const cubicPoint = (p0, p1, p2, p3, t) => {
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
      };
    };
    const profile = [];
    for (let step = 1; step <= 14; step += 1) {
      const point = cubicPoint(
        { x: 58, y: 23 },
        { x: 74, y: 23 },
        { x: 86, y: 33 },
        { x: 86, y: 49 },
        step / 14
      );
      profile.push({ radiusX: (point.x - 58) * scale, y: toWorldY(point.y) });
    }
    for (let step = 1; step <= 7; step += 1) {
      const svgY = 49 + (30 * step) / 7;
      profile.push({ radiusX: 28 * scale, y: toWorldY(svgY) });
    }
    for (let step = 1; step <= 12; step += 1) {
      const point = cubicPoint(
        { x: 86, y: 79 },
        { x: 75, y: 91 },
        { x: 41, y: 91 },
        { x: 30, y: 79 },
        .5 * step / 12
      );
      profile.push({ radiusX: Math.max(0, (point.x - 58) * scale), y: toWorldY(point.y) });
    }

    const radialSegments = 72;
    const positions = [0, toWorldY(23), depthOffset];
    const uvs = [.5, 1];
    const indices = [];
    const ringStart = [];
    profile.slice(0, -1).forEach((ring, ringIndex) => {
      ringStart.push(positions.length / 3);
      const radiusZ = ring.radiusX * .875;
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const angle = segment / radialSegments * Math.PI * 2;
        positions.push(
          Math.sin(angle) * ring.radiusX,
          ring.y,
          depthOffset + Math.cos(angle) * radiusZ
        );
        uvs.push(segment / radialSegments, 1 - ringIndex / Math.max(1, profile.length - 1));
      }
    });
    const bottomIndex = positions.length / 3;
    const bottom = profile[profile.length - 1];
    positions.push(0, bottom.y, depthOffset);
    uvs.push(.5, 0);

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      indices.push(0, ringStart[0] + next, ringStart[0] + segment);
    }
    for (let ring = 0; ring < ringStart.length - 1; ring += 1) {
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const next = (segment + 1) % radialSegments;
        const a = ringStart[ring] + segment;
        const b = ringStart[ring] + next;
        const c = ringStart[ring + 1] + segment;
        const d = ringStart[ring + 1] + next;
        indices.push(a, b, c, b, d, c);
      }
    }
    const lastRing = ringStart[ringStart.length - 1];
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      indices.push(lastRing + segment, lastRing + next, bottomIndex);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  buildWhiteMichiCapeGeometryFromReference() {
    const scale = 1.04;
    const toWorld = point => new THREE.Vector2((point.x - 58) * scale, 78 + (58 - point.y) * scale);
    const cubicPoint = (p0, p1, p2, p3, t) => {
      const u = 1 - t;
      return {
        x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
      };
    };
    const contour = [];
    const appendCurve = (p0, p1, p2, p3, includeStart = false) => {
      const first = includeStart ? 0 : 1;
      for (let step = first; step <= 18; step += 1) contour.push(toWorld(cubicPoint(p0, p1, p2, p3, step / 18)));
    };
    appendCurve({ x: 31, y: 53 }, { x: 19, y: 62 }, { x: 21, y: 71 }, { x: 28, y: 84 }, true);
    appendCurve({ x: 28, y: 84 }, { x: 46, y: 79 }, { x: 71, y: 79 }, { x: 89, y: 83 });
    appendCurve({ x: 89, y: 83 }, { x: 98, y: 71 }, { x: 97, y: 62 }, { x: 85, y: 53 });
    appendCurve({ x: 85, y: 53 }, { x: 69, y: 55 }, { x: 50, y: 55 }, { x: 31, y: 53 });
    contour.pop();

    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    const thickness = 2.2;
    const positions = [];
    const uvs = [];
    const indices = [];
    const zFor = point => {
      const horizontal = Math.min(1, Math.abs(point.x) / 34);
      const vertical = THREE.MathUtils.clamp((point.y - 48) / 50, 0, 1);
      return -31 + 10 * Math.pow(horizontal, 1.65) + 3 * vertical;
    };
    contour.forEach(point => {
      positions.push(point.x, point.y, zFor(point) + thickness * .5);
      uvs.push((point.x + 35) / 70, (point.y - 45) / 55);
    });
    contour.forEach(point => {
      positions.push(point.x, point.y, zFor(point) - thickness * .5);
      uvs.push((point.x + 35) / 70, (point.y - 45) / 55);
    });
    const offset = contour.length;
    faces.forEach(face => {
      indices.push(face[0], face[1], face[2]);
      indices.push(face[2] + offset, face[1] + offset, face[0] + offset);
    });
    contour.forEach((point, index) => {
      const next = (index + 1) % contour.length;
      indices.push(index, next, index + offset, next, next + offset, index + offset);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  buildFaithfulWhiteMichiRoadSaberRen(player) {
    const model = new THREE.Group();
    const makePhysical = (color, roughness = .55, clearcoat = .18) => new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      clearcoat,
      clearcoatRoughness: .45,
      metalness: 0
    });

    const body = new THREE.Mesh(this.buildWhiteMichiBodyGeometryFromReference(), makePhysical(0xf8fbff, .63, .22));
    body.castShadow = true;
    body.receiveShadow = true;
    body.renderOrder = 3;
    model.add(body);

    const eyeMaterial = makePhysical(0x16202c, .3, .5);
    const makeEye = (x, y) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), eyeMaterial);
      const radiusX = 28 * 1.04;
      const radiusZ = radiusX * .875;
      const z = 5.5 * 1.04 + radiusZ * Math.sqrt(Math.max(0, 1 - Math.pow(x / radiusX, 2)));
      eye.scale.set(3.33, 3.33, 1.72);
      eye.position.set(x, y, z + .55);
      eye.castShadow = true;
      return eye;
    };
    const eyeLeft = makeEye((49 - 58) * 1.04, 78 + (58 - 50) * 1.04);
    const eyeRight = makeEye((68 - 58) * 1.04, 78 + (58 - 50) * 1.04);
    model.add(eyeLeft, eyeRight);

    const handMaterial = makePhysical(0x58bf72, .56, .16);
    const makeHand = (x, z) => {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), handMaterial);
      hand.scale.set(6.24, 6.24, 5.55);
      hand.position.set(x, 78 + (58 - 66) * 1.04, z);
      hand.castShadow = true;
      hand.receiveShadow = true;
      return hand;
    };
    const leftHand = makeHand((28 - 58) * 1.04, (77 - 58) * 1.04);
    const rightHand = makeHand((88 - 58) * 1.04, (84 - 58) * 1.04);
    model.add(leftHand, rightHand);

    const footMaterial = makePhysical(0x8b5a34, .68, .08);
    const makeFoot = (x, z) => {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 20), footMaterial);
      foot.scale.set(8.32, 4.16, 9.2);
      foot.position.set(x, 78 + (58 - 91) * 1.04, z);
      foot.castShadow = true;
      foot.receiveShadow = true;
      return foot;
    };
    const leftFoot = makeFoot((43 - 58) * 1.04, (59 - 58) * 1.04);
    const rightFoot = makeFoot((73 - 58) * 1.04, (68 - 58) * 1.04);
    model.add(leftFoot, rightFoot);

    const cape = new THREE.Mesh(this.buildWhiteMichiCapeGeometryFromReference(), makePhysical(0xc92f3a, .66, .12));
    cape.castShadow = true;
    cape.receiveShadow = true;
    cape.renderOrder = 2;
    model.add(cape);

    const cordPoints = [];
    for (let step = 0; step <= 28; step += 1) {
      const t = step / 28;
      const u = 1 - t;
      const svgX = u * u * u * 32 + 3 * u * u * t * 44 + 3 * u * t * t * 72 + t * t * t * 84;
      const svgY = u * u * u * 61 + 3 * u * u * t * 68 + 3 * u * t * t * 68 + t * t * t * 61;
      const x = (svgX - 58) * 1.04;
      const y = 78 + (58 - svgY) * 1.04;
      const radiusX = 28 * 1.04;
      const radiusZ = radiusX * .875;
      const z = 5.5 * 1.04 + radiusZ * Math.sqrt(Math.max(0, 1 - Math.pow(x / radiusX, 2)));
      cordPoints.push(new THREE.Vector3(x, y, z + .85));
    }
    const capeCord = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPoints, false, "centripetal"), 64, 2.45, 12, false),
      makePhysical(0x8f2948, .58, .12)
    );
    capeCord.castShadow = true;
    capeCord.renderOrder = 4;
    model.add(capeCord);

    model.userData = {
      continuous3d: true,
      seamlessVolumetric3d: true,
      sourceCharacterId: "star-white-hero-young-seed-walk-sky-cool-b-forest",
      sourceSilhouette: "unique-index-5-eight-direction",
      body,
      faceFeatures: [eyeLeft, eyeRight],
      hands: [leftHand, rightHand],
      feet: [leftFoot, rightFoot],
      cape,
      capeCord
    };
    return model;
  }

  buildCharacterAvatars() {
    this.avatarMeshes = this.players.map(player => {
      const group = new THREE.Group();
      const playerColor = new THREE.Color(player.color);
      const radius = AVATAR_RING_RADIUS;
      group.position.set(Math.cos(player.angle) * radius, 0, Math.sin(player.angle) * radius);

      const neonShadowMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: playerColor },
          uTime: { value: 0 },
          uPhase: { value: player.index * 1.73 }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 uColor;uniform float uTime;uniform float uPhase;varying vec2 vUv;void main(){vec2 p=vUv-.5;float diamond=pow(abs(p.x)*1.18,1.35)+pow(abs(p.y)*1.72,1.35);float haze=1.0-smoothstep(.08,.58,diamond);float core=1.0-smoothstep(.02,.27,diamond);float wisps=(1.0-smoothstep(.02,.46,abs(p.y)))*(.55+.45*sin(p.x*18.0+uTime*1.25+uPhase));float edgeFade=smoothstep(.5,.42,abs(p.x))*smoothstep(.5,.4,abs(p.y));float pulse=.96+.16*sin(uTime*2.2+uPhase);float alpha=(haze*.48+core*.2+wisps*.075)*edgeFade*pulse;vec3 glow=mix(uColor,vec3(.86,.97,1.0),.24);gl_FragColor=vec4(glow,alpha);}`
      });
      const neonShadow = new THREE.Mesh(new THREE.PlaneGeometry(146, 100), neonShadowMaterial);
      neonShadow.rotation.x = -Math.PI / 2;
      neonShadow.position.y = CHARACTER_GROUND_Y;
      neonShadow.renderOrder = 2;
      group.add(neonShadow);

      const fallback = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(31, 32, 22), new THREE.MeshPhysicalMaterial({ color: playerColor, roughness: .3, clearcoat: .9, emissive: playerColor, emissiveIntensity: .15 }));
      body.scale.y = 1.12;
      body.position.y = 60;
      const face = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xf7f1df, roughness: .42, clearcoat: .6 }));
      face.position.y = 100;
      fallback.add(body, face);
      fallback.updateMatrixWorld(true);
      const fallbackBounds = new THREE.Box3().setFromObject(fallback);
      fallback.position.y = CHARACTER_GROUND_Y - fallbackBounds.min.y;
      let keeperVisualHalfWidth = Math.max(KEEPER_COLLIDER_RADIUS, (fallbackBounds.max.x - fallbackBounds.min.x) * .5);
      group.add(fallback);

      const planeMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .025, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(116, 136), planeMaterial);
      plane.position.y = CHARACTER_GROUND_Y + 68;
      plane.visible = false;
      plane.renderOrder = 4;
      group.add(plane);

      const scanMaterial = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: playerColor }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `uniform vec3 uColor;uniform float uTime;varying vec2 vUv;void main(){float scan=pow(max(0.0,sin(vUv.y*110.0-uTime*8.0)),20.0);float edge=smoothstep(.5,.34,abs(vUv.x-.5));gl_FragColor=vec4(uColor,scan*.12*edge);}`
      });
      const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(126, 145), scanMaterial);
      scanPlane.position.set(0, CHARACTER_GROUND_Y + 72.5, -1);
      scanPlane.renderOrder = 5;
      group.add(scanPlane);

      const character360 = buildParticipantCharacter360(player);
      const threeModel = character360.model;
      let modelBaseY = 0;
      let modelOriginalFootY = null;
      let labelAnchorY = CHARACTER_GROUND_Y + 120;
      let opaqueMaterialCount = 0;
      if (threeModel) {
        opaqueMaterialCount = makeParticipantCharacterOpaque(threeModel);
        threeModel.updateMatrixWorld(true);
        const modelBounds = new THREE.Box3().setFromObject(threeModel);
        const footBounds = new THREE.Box3();
        let hasFootBounds = false;
        threeModel.traverse(object => {
          if (object.name !== "foot-left" && object.name !== "foot-right") return;
          const partBounds = new THREE.Box3().setFromObject(object);
          if (!hasFootBounds) footBounds.copy(partBounds);
          else footBounds.union(partBounds);
          hasFootBounds = true;
        });
        modelOriginalFootY = hasFootBounds ? footBounds.min.y : modelBounds.min.y;
        modelBaseY = CHARACTER_GROUND_Y - modelOriginalFootY;
        labelAnchorY = modelBounds.max.y + modelBaseY + 22;
        keeperVisualHalfWidth = Math.max(KEEPER_COLLIDER_RADIUS, (modelBounds.max.x - modelBounds.min.x) * .5);
        threeModel.rotation.y = -player.angle - Math.PI / 2;
        threeModel.position.y = modelBaseY;
        group.add(threeModel);
      }
      player.keeperVisualHalfWidth = keeperVisualHalfWidth;
      player.keeperTravel = clamp(
        GOAL_POST_INNER_HALF_WIDTH - keeperVisualHalfWidth - GOAL_KEEPER_CLEARANCE,
        0,
        KEEPER_TRAVEL
      );

      const light = new THREE.PointLight(CHARACTER_FACE_LIGHT_COLOR, CHARACTER_FACE_LIGHT_INTENSITY, 260, 1.65);
      light.position.set(0, 118, 82);
      light.layers.set(CHARACTER_OPAQUE_LAYER);
      group.add(light);
      group.userData = {
        playerIndex: player.index,
        plane,
        fallback,
        neonShadow,
        scanPlane,
        threeModel,
        modelBaseY,
        modelOriginalFootY,
        labelAnchorY,
        character360Id: character360.characterId,
        character360Stage: character360.stage,
        opaqueMaterialCount,
        puckFacingOffset: 0,
        light,
        directionalTextures: new Map(),
        activeAvatarView: "front",
        reaction: 0,
        reactionType: "idle"
      };
      this.scene.add(group);
      if (!threeModel?.userData.continuous3d) this.loadAvatarTextures(player, group);
      return group;
    });
    this.scene.traverse(object => {
      if (object.isLight) object.layers.enable(CHARACTER_OPAQUE_LAYER);
    });
    this.root.dataset.itl3Avatar3dCount = String(this.avatarMeshes.filter(avatar => avatar.userData.threeModel).length);
    this.root.dataset.itl3Avatar360Ids = JSON.stringify(this.avatarMeshes.map(avatar => avatar.userData.character360Id || null));
    this.root.dataset.itl3Avatar360Stages = JSON.stringify(this.avatarMeshes.map(avatar => avatar.userData.character360Stage || null));
    this.root.dataset.itl3AvatarOpaqueMaterialCounts = this.avatarMeshes.map(avatar => Number(avatar.userData.opaqueMaterialCount || 0)).join(",");
    this.root.dataset.itl3AvatarOpaquePass = `layer-${CHARACTER_OPAQUE_LAYER}-depth-aware`;
    this.root.dataset.itl3AvatarFootContacts = this.avatarMeshes.map(avatar => {
      const data = avatar.userData;
      return data.modelOriginalFootY == null
        ? CHARACTER_GROUND_Y.toFixed(1)
        : (data.modelOriginalFootY + data.modelBaseY).toFixed(1);
    }).join(",");
    this.root.dataset.itl3GoalClearHeight = String(GOAL_CLEAR_HEIGHT);
    this.root.dataset.itl3KeeperTravelLimits = this.players.map(player => Number(player.keeperTravel || 0).toFixed(1)).join(",");
  }

  loadAvatarTextures(player, avatar) {
    const sources = Object.entries(player.artViews || {}).filter(([, art]) => /<svg[\s>]/i.test(art));
    if (!sources.length && /<svg[\s>]/i.test(player.art || "")) sources.push(["front", player.art]);
    if (!sources.length) return;
    const loadSource = (view, svgMarkup) => {
      const svgDocument = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
      const svgElement = svgDocument.documentElement;
      if (!svgElement || svgElement.nodeName.toLowerCase() !== "svg" || svgDocument.querySelector("parsererror")) {
        avatar.userData.loadError = "invalid-svg";
        return;
      }
      svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      if (!svgElement.getAttribute("width")) svgElement.setAttribute("width", "512");
      if (!svgElement.getAttribute("height")) svgElement.setAttribute("height", "512");
      const normalizedSvg = new XMLSerializer().serializeToString(svgElement);
      const objectUrl = URL.createObjectURL(new Blob([normalizedSvg], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (this.destroyed) return;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.clearRect(0, 0, 512, 512);
        const scale = Math.min(430 / image.naturalWidth, 430 / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(image, (512 - width) / 2, 512 - height - 18, width, height);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        avatar.userData.directionalTextures.set(view, texture);
        const turntableMaterial = avatar.userData.threeModel?.userData.artMaterials?.get(view);
        if (turntableMaterial) {
          turntableMaterial.map = texture;
          turntableMaterial.needsUpdate = true;
        }
        const faithfulMesh = avatar.userData.threeModel?.userData.viewMeshes?.get(view);
        if (faithfulMesh) {
          faithfulMesh.material.map = texture;
          faithfulMesh.material.needsUpdate = true;
        }
        if (!avatar.userData.plane.material.map) {
          avatar.userData.plane.material.map = texture;
          avatar.userData.plane.material.needsUpdate = true;
          avatar.userData.activeAvatarView = view;
          avatar.userData.texture = texture;
        }
        avatar.userData.plane.visible = true;
        avatar.userData.fallback.visible = false;
        avatar.userData.loadError = null;
        this.avatarLoadedCount += 1;
        this.root.dataset.itl3AvatarTextures = String(this.avatarLoadedCount);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        avatar.userData.loadError = "image-load-failed";
        this.root.dataset.itl3AvatarError = "1";
      };
      image.src = objectUrl;
    };
    sources.forEach(([view, svgMarkup]) => loadSource(view, svgMarkup));
  }

  buildParticles() {
    this.particles = Array.from({ length: 150 }, () => ({ x: 0, y: -1000, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, color: new THREE.Color(0xffffff) }));
    this.particlePositions = new Float32Array(this.particles.length * 3);
    this.particleColors = new Float32Array(this.particles.length * 3);
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute("color", new THREE.BufferAttribute(this.particleColors, 3));
    this.particlePoints = new THREE.Points(this.particleGeometry, new THREE.PointsMaterial({ size: 7.5, vertexColors: true, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
    this.scene.add(this.particlePoints);

    const smokeCanvas = document.createElement("canvas");
    smokeCanvas.width = 64;
    smokeCanvas.height = 64;
    const smokeContext = smokeCanvas.getContext("2d");
    const smokeGradient = smokeContext.createRadialGradient(32, 32, 2, 32, 32, 30);
    smokeGradient.addColorStop(0, "rgba(255,255,255,.78)");
    smokeGradient.addColorStop(.32, "rgba(225,232,238,.5)");
    smokeGradient.addColorStop(.72, "rgba(150,160,170,.2)");
    smokeGradient.addColorStop(1, "rgba(90,100,112,0)");
    smokeContext.fillStyle = smokeGradient;
    smokeContext.fillRect(0, 0, 64, 64);
    this.smashSmokeTexture = new THREE.CanvasTexture(smokeCanvas);
    if (THREE.SRGBColorSpace) this.smashSmokeTexture.colorSpace = THREE.SRGBColorSpace;
    this.smashSmokeParticles = Array.from({ length: 42 }, () => {
      const material = new THREE.SpriteMaterial({
        map: this.smashSmokeTexture,
        color: 0x79838e,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: false
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.position.y = -1000;
      this.scene.add(sprite);
      return { sprite, life: 0, maxLife: 1, maxOpacity: .46, vx: 0, vy: 0, vz: 0, startScale: 10, endScale: 28, spin: 0 };
    });
  }

  resetMalletStarts() {
    this.players.forEach(player => {
      if (!player.active) return;
      const radius = player.malletKickoffStartRadius;
      player.x = Math.cos(player.angle) * radius;
      player.z = Math.sin(player.angle) * radius;
      player.vx = 0;
      player.vz = 0;
      player.targetX = player.x;
      player.targetZ = player.z;
    });
    this.root.dataset.itl3KickoffMalletStartPositions = this.players
      .filter(player => player.active)
      .map(player => `${player.x.toFixed(2)},${player.z.toFixed(2)}`)
      .join("|");
  }

  holdMalletsForKickoffReceive() {
    if (!this.kickoffFirstTerritoryPending) return false;
    this.players.forEach(player => {
      if (!player.active) return;
      const radius = player.malletKickoffStartRadius;
      player.x = Math.cos(player.angle) * radius;
      player.z = Math.sin(player.angle) * radius;
      player.vx = 0;
      player.vz = 0;
      player.targetX = player.x;
      player.targetZ = player.z;
    });
    this.root.dataset.itl3KickoffMalletHold = "waiting-for-first-territory-entry";
    return true;
  }

  resetKeepers() {
    this.players.forEach(player => {
      player.keeperOffset = 0;
      player.keeperVelocity = 0;
      player.keeperTargetOffset = 0;
      player.keeperX = Math.cos(player.angle) * KEEPER_PATH_RADIUS;
      player.keeperZ = Math.sin(player.angle) * KEEPER_PATH_RADIUS;
      player.keeperVx = 0;
      player.keeperVz = 0;
      player.keeperLastHitAt = -10;
      player.keeperHitCount = 0;
    });
    this.nextKeeperTelemetryAt = 0;
    this.updateKeeperTelemetry(true);
  }

  centerPropellerPhaseAt(clock) {
    const wrapped = ((clock % CENTER_PROPELLER_CYCLE_DURATION) + CENTER_PROPELLER_CYCLE_DURATION) % CENTER_PROPELLER_CYCLE_DURATION;
    let phaseStart = 0;
    for (let index = 0; index < CENTER_PROPELLER_SEQUENCE.length; index += 1) {
      const phase = CENTER_PROPELLER_SEQUENCE[index];
      const phaseEnd = phaseStart + phase.duration;
      if (wrapped < phaseEnd || index === CENTER_PROPELLER_SEQUENCE.length - 1) {
        return {
          index,
          phase,
          elapsed: wrapped - phaseStart,
          remaining: Math.max(0, phaseEnd - wrapped),
          progress: clamp((wrapped - phaseStart) / phase.duration, 0, 1)
        };
      }
      phaseStart = phaseEnd;
    }
    return { index: 0, phase: CENTER_PROPELLER_SEQUENCE[0], elapsed: 0, remaining: CENTER_PROPELLER_SEQUENCE[0].duration, progress: 0 };
  }

  resetCenterPropellerImpacts() {
    this.centerPropellerHitCount = 0;
    this.centerPropellerLastHitIndex = -1;
    this.nextCenterPropellerTelemetryAt = 0;
    this.centerPropellers?.forEach(propeller => { propeller.lastPuckHitAt = -10; });
    this.updateCenterPropellerTelemetry(true);
  }

  kickoffTurntableLaneClearance(turntableAngle, recipientAngle) {
    if (!this.centerPropellers?.length || !Number.isFinite(recipientAngle)) return Math.PI;
    return this.centerPropellers.reduce((minimum, propeller) => {
      const localAngle = Math.atan2(propeller.localZ, propeller.localX);
      const worldAngle = localAngle - turntableAngle;
      return Math.min(minimum, Math.abs(angleDifference(worldAngle, recipientAngle)));
    }, Math.PI);
  }

  kickoffTurntableSafePhase(recipientAngle) {
    let bestPhase = 0;
    let bestClearance = -1;
    for (let sample = 0; sample < CENTER_BLACK_TURNTABLE_KICKOFF_PHASE_SAMPLES; sample += 1) {
      const phase = CENTER_BLACK_TURNTABLE_SYMMETRY_ANGLE
        * sample / CENTER_BLACK_TURNTABLE_KICKOFF_PHASE_SAMPLES;
      const clearance = this.kickoffTurntableLaneClearance(phase, recipientAngle);
      if (clearance > bestClearance) {
        bestPhase = phase;
        bestClearance = clearance;
      }
    }
    return { phase: bestPhase, clearance: bestClearance };
  }

  calculateKickoffTurntableSync(recipientAngle, serveSpeed, countdownDuration, currentAngle = this.centerBlackTurntableAngle) {
    if (!Number.isFinite(recipientAngle) || !(serveSpeed > 0) || !(countdownDuration > 0) || !this.centerPropellers?.length) return null;
    const safe = this.kickoffTurntableSafePhase(recipientAngle);
    const flightSeconds = CENTER_PROPELLER_VERTEX_RADIUS / serveSpeed;
    // The table turns clockwise (its stored angle decreases). Reach the safe
    // phase at GO, then hold that motor phase only until the puck first enters
    // a territory. This keeps all three propeller centres halfway between the
    // three serve lanes throughout the complete centre transit.
    const targetGoPhase = positiveModulo(safe.phase, CENTER_BLACK_TURNTABLE_SYMMETRY_ANGLE);
    const currentPhase = positiveModulo(currentAngle, CENTER_BLACK_TURNTABLE_SYMMETRY_ANGLE);
    const clockwiseTravel = positiveModulo(
      currentPhase - targetGoPhase,
      CENTER_BLACK_TURNTABLE_SYMMETRY_ANGLE
    );
    const normalTravelAvailable = CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED * countdownDuration;
    const normalSpeedCanReach = clockwiseTravel <= normalTravelAvailable + 1e-7;
    const startDelay = normalSpeedCanReach
      ? Math.max(0, countdownDuration - clockwiseTravel / CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED)
      : 0;
    const countdownAngularSpeed = normalSpeedCanReach
      ? CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED
      : clockwiseTravel / countdownDuration;
    const targetGoAngle = normalizeAngle(currentAngle - clockwiseTravel);
    const predictedCrossingAngle = targetGoAngle;
    const predictedClearance = this.kickoffTurntableLaneClearance(predictedCrossingAngle, recipientAngle);
    return {
      active: true,
      elapsed: 0,
      countdownDuration,
      recipientAngle,
      serveSpeed,
      flightSeconds,
      safePhase: safe.phase,
      safeClearance: safe.clearance,
      targetGoPhase,
      targetGoAngle,
      predictedCrossingAngle,
      predictedClearance,
      clockwiseTravel,
      startDelay,
      countdownAngularSpeed,
      mode: normalSpeedCanReach ? "delayed-normal-start-transit-lock" : "immediate-phase-catchup-transit-lock"
    };
  }

  planKickoffTurntableSync(recipient, serveSpeed) {
    const sync = recipient
      ? this.calculateKickoffTurntableSync(
        recipient.angle,
        serveSpeed,
        this.kickoffCountdownDuration,
        this.centerBlackTurntableAngle
      )
      : null;
    this.kickoffTurntableSync = sync;
    if (!sync) {
      this.root.dataset.itl3KickoffTurntableSyncMode = "unavailable";
      this.root.dataset.itl3KickoffTurntableSyncState = "idle";
      return null;
    }
    this.root.dataset.itl3KickoffTurntableSyncMode = sync.mode;
    this.root.dataset.itl3KickoffTurntableSyncState = sync.startDelay > 0 ? "waiting-for-calculated-start" : "clockwise-sync-running";
    this.root.dataset.itl3KickoffTurntableStartDelay = sync.startDelay.toFixed(3);
    this.root.dataset.itl3KickoffTurntableCountdownSpeed = sync.countdownAngularSpeed.toFixed(3);
    this.root.dataset.itl3KickoffTurntableFlightSeconds = sync.flightSeconds.toFixed(3);
    this.root.dataset.itl3KickoffTurntableSafePhase = sync.safePhase.toFixed(3);
    this.root.dataset.itl3KickoffTurntableTargetGoAngle = sync.targetGoAngle.toFixed(3);
    this.root.dataset.itl3KickoffTurntablePredictedCrossingAngle = sync.predictedCrossingAngle.toFixed(3);
    this.root.dataset.itl3KickoffTurntablePredictedClearanceDegrees = (sync.predictedClearance * 180 / Math.PI).toFixed(2);
    this.root.dataset.itl3KickoffTurntableRequiredClearanceDegrees = (CENTER_BLACK_TURNTABLE_KICKOFF_REQUIRED_CLEARANCE * 180 / Math.PI).toFixed(2);
    return sync;
  }

  completeKickoffTurntableSync() {
    const sync = this.kickoffTurntableSync;
    if (!sync?.active) return;
    this.centerBlackTurntableAngle = sync.targetGoAngle;
    sync.active = false;
    sync.elapsed = sync.countdownDuration;
    this.root.dataset.itl3KickoffTurntableSyncMode = `${sync.mode}-aligned-go`;
    this.root.dataset.itl3KickoffTurntableSyncState = "safe-lane-hold-until-first-entry";
    this.root.dataset.itl3KickoffTurntableActualGoAngle = this.centerBlackTurntableAngle.toFixed(3);
    this.root.dataset.itl3KickoffTurntableGoAngleError = Math.abs(
      angleDifference(this.centerBlackTurntableAngle, sync.targetGoAngle)
    ).toFixed(6);
    this.syncCenterBlackTurntable(true);
  }

  kickoffTurntableSyncSelfTest() {
    const cases = [];
    const currentAngles = Array.from({ length: 24 }, (_, index) => -Math.PI + index * Math.PI * 2 / 24);
    PLAYER_ANGLES.forEach(recipientAngle => {
      [KICKOFF_COUNTDOWN_SHORT_SECONDS, KICKOFF_COUNTDOWN_LONG_SECONDS].forEach(duration => {
        [SERVE_SPEED_MIN, (SERVE_SPEED_MIN + SERVE_SPEED_MAX) * .5, SERVE_SPEED_MAX].forEach(serveSpeed => {
          currentAngles.forEach(currentAngle => {
            const result = this.calculateKickoffTurntableSync(recipientAngle, serveSpeed, duration, currentAngle);
            if (result) cases.push(result);
          });
        });
      });
    });
    const minimumClearance = cases.length ? Math.min(...cases.map(entry => entry.predictedClearance)) : 0;
    const maximumCountdownSpeed = cases.length ? Math.max(...cases.map(entry => entry.countdownAngularSpeed)) : 0;
    return {
      mode: "predictive-safe-lane-phase-sync",
      caseCount: cases.length,
      coversThreeRecipients: PLAYER_ANGLES.length === 3,
      countdownDurations: [KICKOFF_COUNTDOWN_SHORT_SECONDS, KICKOFF_COUNTDOWN_LONG_SECONDS],
      serveSpeeds: [SERVE_SPEED_MIN, (SERVE_SPEED_MIN + SERVE_SPEED_MAX) * .5, SERVE_SPEED_MAX],
      minimumPredictedClearanceDegrees: Number((minimumClearance * 180 / Math.PI).toFixed(2)),
      requiredClearanceDegrees: Number((CENTER_BLACK_TURNTABLE_KICKOFF_REQUIRED_CLEARANCE * 180 / Math.PI).toFixed(2)),
      allCasesClear: cases.length > 0 && cases.every(entry => entry.predictedClearance >= CENTER_BLACK_TURNTABLE_KICKOFF_REQUIRED_CLEARANCE),
      maximumCountdownSpeed: Number(maximumCountdownSpeed.toFixed(3)),
      clockwiseOnly: cases.every(entry => entry.countdownAngularSpeed >= 0),
      startsDelayedWhenReachable: cases.every(entry => !entry.mode.startsWith("delayed-normal-start") || entry.startDelay >= 0),
      holdsSafePhaseThroughFirstEntry: true,
      targets: "first-entry-arrow-territory"
    };
  }

  advanceCenterBlackTurntable(delta) {
    if (!(delta > 0)) return;
    const sync = this.kickoffTurntableSync;
    if (this.kickoffTurntableTransitLock && this.countdown <= 0) {
      this.centerBlackTurntableClock += delta;
      this.root.dataset.itl3KickoffTurntableSyncState = "safe-lane-hold-until-first-entry";
      this.syncCenterBlackTurntable();
      return;
    }
    let rotationSeconds = delta;
    let angularSpeed = CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED;
    if (sync?.active && this.countdown > 0) {
      const previousElapsed = sync.elapsed;
      const nextElapsed = Math.min(sync.countdownDuration, previousElapsed + delta);
      const previousRunning = Math.max(0, previousElapsed - sync.startDelay);
      const nextRunning = Math.max(0, nextElapsed - sync.startDelay);
      rotationSeconds = Math.max(0, nextRunning - previousRunning);
      angularSpeed = sync.countdownAngularSpeed;
      sync.elapsed = nextElapsed;
      this.root.dataset.itl3KickoffTurntableSyncState = rotationSeconds > 0 ? "clockwise-sync-running" : "waiting-for-calculated-start";
    }
    this.centerBlackTurntableClock += delta;
    this.centerBlackTurntableAngle = normalizeAngle(
      this.centerBlackTurntableAngle - angularSpeed * rotationSeconds
    );
    this.syncCenterBlackTurntable();
  }

  syncCenterBlackTurntable(forceTelemetry = false) {
    if (this.centerBlackTurntable) this.centerBlackTurntable.rotation.y = this.centerBlackTurntableAngle;
    const cos = Math.cos(this.centerBlackTurntableAngle);
    const sin = Math.sin(this.centerBlackTurntableAngle);
    this.centerPropellers?.forEach(propeller => {
      propeller.x = cos * propeller.localX + sin * propeller.localZ;
      propeller.z = -sin * propeller.localX + cos * propeller.localZ;
    });
    if (!this.root) return;
    if (!forceTelemetry && this.centerBlackTurntableClock < this.nextCenterBlackTurntableTelemetryAt) return;
    this.nextCenterBlackTurntableTelemetryAt = this.centerBlackTurntableClock + .1;
    this.root.dataset.itl3CenterBlackTurntableAngle = this.centerBlackTurntableAngle.toFixed(3);
    this.root.dataset.itl3CenterBlackTurntableClock = this.centerBlackTurntableClock.toFixed(2);
    this.root.dataset.itl3CenterPropellerOrbitRadius = String(CENTER_PROPELLER_VERTEX_RADIUS);
    this.root.dataset.itl3CenterPropellerPositions = JSON.stringify((this.centerPropellers || []).map(propeller => ({
      x: Number(propeller.x.toFixed(2)),
      z: Number(propeller.z.toFixed(2))
    })));
  }

  centerPropellerWorldArmAngle(armIndex) {
    return this.centerPropellerAngle - this.centerBlackTurntableAngle + armIndex * Math.PI * 2 / 3;
  }

  advanceCenterPropellers(delta) {
    if (!(delta > 0)) return;
    this.centerPropellerClock += delta;
    const state = this.centerPropellerPhaseAt(this.centerPropellerClock);
    this.centerPropellerPhaseIndex = state.index;
    const blend = 1 - Math.exp(-CENTER_PROPELLER_SPEED_RESPONSE * delta);
    this.centerPropellerAngularVelocity = THREE.MathUtils.lerp(
      this.centerPropellerAngularVelocity,
      state.phase.speed,
      blend
    );
    this.centerPropellerAngle = normalizeAngle(
      this.centerPropellerAngle + this.centerPropellerAngularVelocity * delta
    );
    this.syncCenterPropellerVisuals();
    this.updateCenterPropellerTelemetry();
  }

  syncCenterPropellerVisuals() {
    if (!this.centerPropellers?.length || !this.centerPropellerMaterials) return;
    const state = this.centerPropellerPhaseAt(this.centerPropellerClock);
    const strong = state.phase.strength === "strong";
    const accent = new THREE.Color(state.phase.direction === "clockwise" ? 0x58e8ff : 0xff72c8);
    this.centerPropellerMaterials.bladeMaterial.emissive.copy(accent);
    this.centerPropellerMaterials.bladeMaterial.emissiveIntensity = strong ? 2.5 : 1.18;
    this.centerPropellerMaterials.edgeMaterial.color.copy(accent);
    this.centerPropellerMaterials.edgeMaterial.opacity = strong ? .98 : .72;
    this.centerPropellerMaterials.haloMaterial.color.copy(accent);
    this.centerPropellerMaterials.haloMaterial.opacity = strong ? .32 : .16;
    this.centerPropellerMaterials.baseMaterial.emissive.copy(accent).multiplyScalar(.28);
    this.centerPropellerMaterials.baseMaterial.emissiveIntensity = strong ? 1.15 : .58;
    this.centerPropellers.forEach((propeller, index) => {
      propeller.rotor.rotation.y = -this.centerPropellerAngle;
      const pulse = 1 + Math.sin(this.centerPropellerClock * (strong ? 10 : 5) + index * 2.1) * (strong ? .075 : .035);
      propeller.halo.scale.setScalar(pulse);
      propeller.baseRing.scale.setScalar(1 + (strong ? .08 : .035) + Math.sin(this.centerPropellerClock * 7 + index) * .02);
    });
  }

  centerPropellerContact() {
    if (!this.centerPropellers?.length || !this.puck.visible) return null;
    let best = null;
    const turntableAngularVelocity = CENTER_BLACK_TURNTABLE_CLOCKWISE_SPEED;
    const angularVelocity = this.centerPropellerAngularVelocity + turntableAngularVelocity;
    const hubRadius = CENTER_PROPELLER_HUB_RADIUS * CENTER_PROPELLER_SIZE_SCALE;
    const armInnerRadius = CENTER_PROPELLER_ARM_INNER_RADIUS * CENTER_PROPELLER_SIZE_SCALE;
    const armOuterRadius = CENTER_PROPELLER_ARM_OUTER_RADIUS * CENTER_PROPELLER_SIZE_SCALE;
    const armHalfWidth = CENTER_PROPELLER_ARM_HALF_WIDTH * CENTER_PROPELLER_SIZE_SCALE;
    const considerContact = (propeller, armIndex, contactX, contactZ, minimum, dx, dz) => {
      const distance = Math.hypot(dx, dz);
      if (distance >= minimum) return;
      let normalX;
      let normalZ;
      const relativeX = contactX - propeller.x;
      const relativeZ = contactZ - propeller.z;
      const orbitVelocityX = -turntableAngularVelocity * propeller.z;
      const orbitVelocityZ = turntableAngularVelocity * propeller.x;
      const surfaceVelocityX = orbitVelocityX - angularVelocity * relativeZ;
      const surfaceVelocityZ = orbitVelocityZ + angularVelocity * relativeX;
      if (distance > .001) {
        normalX = dx / distance;
        normalZ = dz / distance;
      } else if (armIndex >= 0) {
        const armAngle = this.centerPropellerWorldArmAngle(armIndex);
        normalX = -Math.sin(armAngle);
        normalZ = Math.cos(armAngle);
        const relativeNormal = (this.puck.vx - surfaceVelocityX) * normalX
          + (this.puck.vz - surfaceVelocityZ) * normalZ;
        if (relativeNormal > 0) {
          normalX *= -1;
          normalZ *= -1;
        }
      } else {
        normalX = 1;
        normalZ = 0;
      }
      const candidate = {
        propeller,
        armIndex,
        contactX,
        contactZ,
        normalX,
        normalZ,
        overlap: minimum - distance,
        distance,
        minimum,
        surfaceVelocityX,
        surfaceVelocityZ
      };
      if (!best || candidate.overlap > best.overlap) best = candidate;
    };

    this.centerPropellers.forEach(propeller => {
      const hubDx = this.puck.x - propeller.x;
      const hubDz = this.puck.z - propeller.z;
      const hubDistance = Math.hypot(hubDx, hubDz);
      const hubNormalX = hubDistance > .001 ? hubDx / hubDistance : 1;
      const hubNormalZ = hubDistance > .001 ? hubDz / hubDistance : 0;
      const hubContactX = propeller.x + hubNormalX * hubRadius;
      const hubContactZ = propeller.z + hubNormalZ * hubRadius;
      considerContact(
        propeller,
        -1,
        hubContactX,
        hubContactZ,
        PUCK_RADIUS + hubRadius,
        hubDx,
        hubDz
      );

      for (let armIndex = 0; armIndex < 3; armIndex += 1) {
        const armAngle = this.centerPropellerWorldArmAngle(armIndex);
        const unitX = Math.cos(armAngle);
        const unitZ = Math.sin(armAngle);
        const startX = propeller.x + unitX * armInnerRadius;
        const startZ = propeller.z + unitZ * armInnerRadius;
        const endX = propeller.x + unitX * armOuterRadius;
        const endZ = propeller.z + unitZ * armOuterRadius;
        const segmentX = endX - startX;
        const segmentZ = endZ - startZ;
        const segmentLengthSquared = segmentX * segmentX + segmentZ * segmentZ;
        const projection = segmentLengthSquared > .001
          ? clamp(((this.puck.x - startX) * segmentX + (this.puck.z - startZ) * segmentZ) / segmentLengthSquared, 0, 1)
          : 0;
        const contactX = startX + segmentX * projection;
        const contactZ = startZ + segmentZ * projection;
        considerContact(
          propeller,
          armIndex,
          contactX,
          contactZ,
          PUCK_RADIUS + armHalfWidth,
          this.puck.x - contactX,
          this.puck.z - contactZ
        );
      }
    });
    return best;
  }

  resolveCenterPropellerCollisions() {
    const contact = this.centerPropellerContact();
    if (!contact) return false;
    if (this.kickoffFirstTerritoryPending) {
      this.kickoffPropellerOverlapCount += 1;
      if (!this.kickoffFirstPropellerOverlap) {
        this.kickoffFirstPropellerOverlap = {
          secondsAfterLaunch: Number(Math.max(0, this.elapsed - this.kickoffLaunchedAt).toFixed(3)),
          puckX: Number(this.puck.x.toFixed(2)),
          puckZ: Number(this.puck.z.toFixed(2)),
          puckVx: Number(this.puck.vx.toFixed(2)),
          puckVz: Number(this.puck.vz.toFixed(2)),
          puckRadius: Number(Math.hypot(this.puck.x, this.puck.z).toFixed(2)),
          propellerIndex: contact.propeller.index,
          propellerX: Number(contact.propeller.x.toFixed(2)),
          propellerZ: Number(contact.propeller.z.toFixed(2)),
          armIndex: contact.armIndex,
          contactX: Number(contact.contactX.toFixed(2)),
          contactZ: Number(contact.contactZ.toFixed(2)),
          distance: Number(contact.distance.toFixed(2)),
          minimum: Number(contact.minimum.toFixed(2)),
          turntableAngle: Number(this.centerBlackTurntableAngle.toFixed(3))
        };
      }
    }
    this.puck.x += contact.normalX * (contact.overlap + .75);
    this.puck.z += contact.normalZ * (contact.overlap + .75);
    if (this.elapsed - contact.propeller.lastPuckHitAt < CENTER_PROPELLER_HIT_COOLDOWN) return false;

    const phase = this.centerPropellerPhaseAt(this.centerPropellerClock).phase;
    const strong = phase.strength === "strong";
    const restitution = strong ? CENTER_PROPELLER_STRONG_RESTITUTION : CENTER_PROPELLER_WEAK_RESTITUTION;
    const minimumKick = strong ? CENTER_PROPELLER_STRONG_MIN_KICK : CENTER_PROPELLER_WEAK_MIN_KICK;
    const relativeNormal = (this.puck.vx - contact.surfaceVelocityX) * contact.normalX
      + (this.puck.vz - contact.surfaceVelocityZ) * contact.normalZ;
    const currentNormalSpeed = this.puck.vx * contact.normalX + this.puck.vz * contact.normalZ;
    const physicalImpulse = relativeNormal < 0 ? -(1 + restitution) * relativeNormal : 0;
    const minimumImpulse = Math.max(0, minimumKick - currentNormalSpeed);
    const impulse = Math.max(physicalImpulse, minimumImpulse);
    const surfaceNormalSpeed = contact.surfaceVelocityX * contact.normalX + contact.surfaceVelocityZ * contact.normalZ;
    const tangentVelocityX = contact.surfaceVelocityX - contact.normalX * surfaceNormalSpeed;
    const tangentVelocityZ = contact.surfaceVelocityZ - contact.normalZ * surfaceNormalSpeed;
    this.puck.vx += contact.normalX * impulse + tangentVelocityX * CENTER_PROPELLER_SURFACE_TRANSFER;
    this.puck.vz += contact.normalZ * impulse + tangentVelocityZ * CENTER_PROPELLER_SURFACE_TRANSFER;
    const speed = Math.hypot(this.puck.vx, this.puck.vz);
    if (speed > MAX_PUCK_SPEED) {
      this.puck.vx *= MAX_PUCK_SPEED / speed;
      this.puck.vz *= MAX_PUCK_SPEED / speed;
    }
    this.serveSoftWindow = 0;
    contact.propeller.lastPuckHitAt = this.elapsed;
    this.centerPropellerHitCount += 1;
    this.centerPropellerLastHitIndex = contact.propeller.index;
    this.players.forEach(player => {
      if (player.abilityProfile.key === "balanced") {
        player.centerTurntableResistanceUntil = this.elapsed + TURN_TABLE_RESISTANCE_SECONDS;
      }
    });
    if (this.kickoffFirstTerritoryPending && !this.kickoffFirstPropellerContact) {
      this.kickoffFirstPropellerContact = {
        secondsAfterLaunch: Number(Math.max(0, this.elapsed - this.kickoffLaunchedAt).toFixed(3)),
        puckX: Number(this.puck.x.toFixed(2)),
        puckZ: Number(this.puck.z.toFixed(2)),
        puckRadius: Number(Math.hypot(this.puck.x, this.puck.z).toFixed(2)),
        propellerIndex: contact.propeller.index,
        propellerX: Number(contact.propeller.x.toFixed(2)),
        propellerZ: Number(contact.propeller.z.toFixed(2)),
        armIndex: contact.armIndex,
        contactX: Number(contact.contactX.toFixed(2)),
        contactZ: Number(contact.contactZ.toFixed(2)),
        distance: Number(contact.distance.toFixed(2)),
        minimum: Number(contact.minimum.toFixed(2)),
        turntableAngle: Number(this.centerBlackTurntableAngle.toFixed(3))
      };
    }
    this.centerPropellerImpact(contact, strong);
    this.updateCenterPropellerTelemetry(true);
    return true;
  }

  centerPropellerImpact(contact, strong) {
    const clockwise = this.centerPropellerAngularVelocity >= 0;
    const color = strong
      ? (clockwise ? "#ffd45f" : "#ff72c8")
      : (clockwise ? "#69eaff" : "#bd8cff");
    this.spawnBurst(contact.contactX, 10, contact.contactZ, color, strong ? 28 : 15, strong ? 340 : 210);
    this.spawnShock(contact.contactX, contact.contactZ, color, strong ? 52 : 34);
    this.cameraShake = Math.max(this.cameraShake, strong ? 11 : 6.5);
    if (this.postUniforms) this.postUniforms.uFlash.value = Math.max(this.postUniforms.uFlash.value, strong ? .82 : .42);
    this.beep(strong ? 520 : 360, strong ? .075 : .045, strong ? .045 : .026);
    this.noiseBurst(strong ? .09 : .055, strong ? .048 : .025, strong ? 1650 : 1080);
  }

  updateCenterPropellerTelemetry(force = false) {
    if (!this.root) return;
    if (!force && this.centerPropellerClock < this.nextCenterPropellerTelemetryAt) return;
    this.nextCenterPropellerTelemetryAt = this.centerPropellerClock + .1;
    const state = this.centerPropellerPhaseAt(this.centerPropellerClock);
    this.root.dataset.itl3CenterPropellerCount = String(this.centerPropellers?.length || 0);
    this.root.dataset.itl3CenterPropellerPhase = state.phase.id;
    this.root.dataset.itl3CenterPropellerDirection = state.phase.direction;
    this.root.dataset.itl3CenterPropellerStrength = state.phase.strength;
    this.root.dataset.itl3CenterPropellerPhaseRemaining = state.remaining.toFixed(2);
    this.root.dataset.itl3CenterPropellerAngularVelocity = this.centerPropellerAngularVelocity.toFixed(3);
    this.root.dataset.itl3CenterPropellerTargetVelocity = state.phase.speed.toFixed(3);
    this.root.dataset.itl3CenterPropellerHits = String(this.centerPropellerHitCount);
    this.root.dataset.itl3CenterPropellerLastHit = this.centerPropellerLastHitIndex >= 0 ? String(this.centerPropellerLastHitIndex) : "none";
    this.root.dataset.itl3CenterPropellerPositions = JSON.stringify((this.centerPropellers || []).map(propeller => ({
      x: Number(propeller.x.toFixed(2)),
      z: Number(propeller.z.toFixed(2))
    })));
  }

  centerPropellerSelfTest() {
    const expectedOrder = [
      "strong-clockwise",
      "weak-clockwise-a",
      "weak-counterclockwise-a",
      "strong-counterclockwise",
      "weak-counterclockwise-b",
      "weak-clockwise-b"
    ];
    const actualOrder = CENTER_PROPELLER_SEQUENCE.map(phase => phase.id);
    const weakLongest = Math.max(...CENTER_PROPELLER_SEQUENCE.filter(phase => phase.strength === "weak").map(phase => phase.duration));
    const strongShortest = Math.min(...CENTER_PROPELLER_SEQUENCE.filter(phase => phase.strength === "strong").map(phase => phase.duration));
    const centerStartClearance = CENTER_PROPELLER_VERTEX_RADIUS
      - CENTER_PROPELLER_ARM_OUTER_RADIUS * CENTER_PROPELLER_SIZE_SCALE
      - PUCK_RADIUS
      - CENTER_PROPELLER_ARM_HALF_WIDTH * CENTER_PROPELLER_SIZE_SCALE;
    return {
      count: this.centerPropellers?.length || 0,
      threePropellers: this.centerPropellers?.length === 3,
      threeEqualStraightArms: Boolean(this.centerPropellers?.length) && this.centerPropellers.every(propeller => propeller.rotor?.userData?.arms?.length === 3),
      onYellowTriangleVertices: Boolean(this.centerPropellers?.length) && this.centerPropellers.every(propeller => Math.abs(Math.hypot(propeller.x, propeller.z) - CENTER_PROPELLER_VERTEX_RADIUS) < .01),
      initialCenterPuckClear: centerStartClearance > 0,
      initialCenterClearance: Number(centerStartClearance.toFixed(2)),
      sizeScale: CENTER_PROPELLER_SIZE_SCALE,
      sizePercent: Math.round(CENTER_PROPELLER_SIZE_SCALE * 100),
      requestedSizeApplied: CENTER_PROPELLER_SIZE_SCALE === .4,
      sequenceCorrect: actualOrder.every((phase, index) => phase === expectedOrder[index]),
      strongPhasesLongest: strongShortest > weakLongest,
      strongDuration: CENTER_PROPELLER_STRONG_DURATION,
      weakDuration: CENTER_PROPELLER_WEAK_DURATION,
      strongMinimumKick: CENTER_PROPELLER_STRONG_MIN_KICK,
      weakMinimumKick: CENTER_PROPELLER_WEAK_MIN_KICK,
      affects: "puck-only-physical-collision"
    };
  }

  wallSpringExtensionAt(clock) {
    const wrapped = ((clock % WALL_SPRING_INTERVAL) + WALL_SPRING_INTERVAL) % WALL_SPRING_INTERVAL;
    const activeStart = WALL_SPRING_INTERVAL - WALL_SPRING_ACTIVE_WINDOW;
    if (wrapped < activeStart) return 0;
    const activeTime = wrapped - activeStart;
    const smooth = value => {
      const normalized = clamp(value, 0, 1);
      return normalized * normalized * (3 - normalized * 2);
    };
    if (activeTime < WALL_SPRING_EXTEND_SECONDS) {
      return WALL_SPRING_TRAVEL * smooth(activeTime / WALL_SPRING_EXTEND_SECONDS);
    }
    if (activeTime < WALL_SPRING_EXTEND_SECONDS + WALL_SPRING_HOLD_SECONDS) {
      return WALL_SPRING_TRAVEL;
    }
    const retractSeconds = Math.max(
      .01,
      WALL_SPRING_ACTIVE_WINDOW - WALL_SPRING_EXTEND_SECONDS - WALL_SPRING_HOLD_SECONDS
    );
    const retractTime = activeTime - WALL_SPRING_EXTEND_SECONDS - WALL_SPRING_HOLD_SECONDS;
    return WALL_SPRING_TRAVEL * (1 - smooth(retractTime / retractSeconds));
  }

  resetWallSprings() {
    this.wallSpringClock = 0;
    this.wallSpringExtension = 0;
    this.wallSpringVelocity = 0;
    this.wallSpringCycle = -1;
    this.wallSpringActivationCount = 0;
    this.wallSpringHitCount = 0;
    this.wallSpringPuckHitCount = 0;
    this.wallSpringMalletHitCount = 0;
    this.nextWallSpringTelemetryAt = 0;
    this.wallSprings?.forEach(spring => {
      spring.userData.lastPuckHitAt = -10;
      spring.userData.lastMalletHitAt = this.players.map(() => -10);
    });
    this.updateWallSpringVisuals();
    this.updateWallSpringTelemetry(true);
  }

  updateWallSprings(dt) {
    const previousExtension = this.wallSpringExtension;
    this.wallSpringClock += dt;
    this.wallSpringExtension = this.wallSpringExtensionAt(this.wallSpringClock);
    this.wallSpringVelocity = dt > 0 ? (this.wallSpringExtension - previousExtension) / dt : 0;
    const phase = this.wallSpringClock % WALL_SPRING_INTERVAL;
    const activeStart = WALL_SPRING_INTERVAL - WALL_SPRING_ACTIVE_WINDOW;
    const cycle = Math.floor(this.wallSpringClock / WALL_SPRING_INTERVAL);
    if (phase >= activeStart && cycle !== this.wallSpringCycle) {
      this.wallSpringCycle = cycle;
      this.wallSpringActivationCount += 1;
      this.beep(148, .04, .012);
    }
    this.updateWallSpringTelemetry();
  }

  updateWallSpringVisuals() {
    if (!this.wallSprings?.length) return;
    const extension = this.wallSpringExtension || 0;
    const pulse = clamp(extension / WALL_SPRING_TRAVEL, 0, 1);
    const phase = ((this.wallSpringClock % WALL_SPRING_INTERVAL) + WALL_SPRING_INTERVAL) % WALL_SPRING_INTERVAL;
    const activeStart = WALL_SPRING_INTERVAL - WALL_SPRING_ACTIVE_WINDOW;
    const warning = phase >= activeStart - .34 && phase < activeStart;
    const bumperX = -WALL_SPRING_REST_INSET - extension;
    this.wallSprings.forEach((spring, index) => {
      const bumper = spring.userData.bumper;
      const face = spring.userData.face;
      if (bumper) {
        bumper.position.x = bumperX;
        bumper.scale.setScalar(1 + pulse * .08 + (warning ? Math.sin(this.elapsed * 18 + index) * .035 : 0));
      }
      if (face) {
        face.position.x = bumperX - 4.3;
        face.scale.setScalar(1 + pulse * .15);
      }
      spring.userData.coilRings?.forEach(ring => {
        ring.position.x = THREE.MathUtils.lerp(-2.5, bumperX + 4.5, ring.userData.coilRatio);
        ring.scale.setScalar(1 - pulse * .08);
      });
    });
    if (this.wallSpringMaterials) {
      this.wallSpringMaterials.baseMaterial.emissiveIntensity = .65 + (warning ? .45 : 0) + pulse * .5;
      this.wallSpringMaterials.coilMaterial.emissiveIntensity = 1.15 + (warning ? .9 : 0) + pulse * 2.5;
      this.wallSpringMaterials.bumperMaterial.emissiveIntensity = 1.25 + (warning ? 1.1 : 0) + pulse * 3.2;
      this.wallSpringMaterials.faceMaterial.opacity = .72 + (warning ? .16 : 0) + pulse * .12;
    }
  }

  retractedWallSpringAtAngle(angle) {
    if (!this.wallSprings?.length || this.wallSpringExtension > .05) return null;
    let nearestSpring = null;
    let nearestDifference = Infinity;
    for (const spring of this.wallSprings) {
      const difference = Math.abs(angleDifference(angle, spring.userData.angle));
      if (difference < WALL_SPRING_RETRACTED_HALF_ANGLE && difference < nearestDifference) {
        nearestSpring = spring;
        nearestDifference = difference;
      }
    }
    return nearestSpring;
  }

  wallSpringContact(x, z, bodyRadius) {
    if (!this.wallSprings?.length || this.wallSpringExtension <= .05) return null;
    const springRadius = ARENA_RADIUS - WALL_SPRING_REST_INSET - this.wallSpringExtension;
    let best = null;
    for (const spring of this.wallSprings) {
      const outwardX = spring.userData.normalX;
      const outwardZ = spring.userData.normalZ;
      const centerX = outwardX * springRadius;
      const centerZ = outwardZ * springRadius;
      const dx = x - centerX;
      const dz = z - centerZ;
      const distance = Math.hypot(dx, dz);
      const minimum = bodyRadius + WALL_SPRING_BUMPER_RADIUS;
      if (distance >= minimum) continue;
      const inwardX = -outwardX;
      const inwardZ = -outwardZ;
      const rawX = distance > .001 ? dx / distance : inwardX;
      const rawZ = distance > .001 ? dz / distance : inwardZ;
      let normalX = rawX * .42 + inwardX * .58;
      let normalZ = rawZ * .42 + inwardZ * .58;
      const normalLength = Math.hypot(normalX, normalZ) || 1;
      normalX /= normalLength;
      normalZ /= normalLength;
      const contact = {
        spring,
        centerX,
        centerZ,
        normalX,
        normalZ,
        overlap: minimum - distance,
        velocityX: inwardX * this.wallSpringVelocity,
        velocityZ: inwardZ * this.wallSpringVelocity
      };
      if (!best || contact.overlap > best.overlap) best = contact;
    }
    return best;
  }

  resolveWallSpringCollisions() {
    let didHit = false;
    const puckContact = this.wallSpringContact(this.puck.x, this.puck.z, PUCK_RADIUS);
    if (puckContact) {
      this.puck.x += puckContact.normalX * (puckContact.overlap + .8);
      this.puck.z += puckContact.normalZ * (puckContact.overlap + .8);
      const relative = (this.puck.vx - puckContact.velocityX) * puckContact.normalX
        + (this.puck.vz - puckContact.velocityZ) * puckContact.normalZ;
      const recent = this.elapsed - puckContact.spring.userData.lastPuckHitAt < WALL_SPRING_HIT_COOLDOWN;
      if (!recent) {
        const extendingImpact = this.wallSpringVelocity > 1;
        const restitution = extendingImpact ? WALL_SPRING_IMPACT_RESTITUTION : WALL_SPRING_RESTITUTION;
        const minimumKick = extendingImpact ? WALL_SPRING_IMPACT_MIN_KICK : WALL_SPRING_PUCK_MIN_KICK;
        const currentNormalSpeed = this.puck.vx * puckContact.normalX + this.puck.vz * puckContact.normalZ;
        const physicalImpulse = relative < 0 ? -(1 + restitution) * relative : 0;
        const antiStallImpulse = Math.max(0, minimumKick - currentNormalSpeed);
        const impulse = Math.max(physicalImpulse, antiStallImpulse);
        this.puck.vx += puckContact.normalX * impulse;
        this.puck.vz += puckContact.normalZ * impulse;
        const speed = Math.hypot(this.puck.vx, this.puck.vz);
        if (speed > MAX_PUCK_SPEED) {
          this.puck.vx *= MAX_PUCK_SPEED / speed;
          this.puck.vz *= MAX_PUCK_SPEED / speed;
        }
        puckContact.spring.userData.lastPuckHitAt = this.elapsed;
        this.wallSpringHitCount += 1;
        this.wallSpringPuckHitCount += 1;
        this.root.dataset.itl3WallSpringLastPuckHitMode = extendingImpact
          ? "extending-impact"
          : (this.wallSpringVelocity < -1 ? "retracting" : "fully-extended");
        didHit = true;
        this.wallImpact(this.puck.x, this.puck.z);
      }
    }

    this.players.forEach(player => {
      if (!player.active) return;
      const contact = this.wallSpringContact(player.x, player.z, MALLET_RADIUS);
      if (!contact) return;
      player.x += contact.normalX * (contact.overlap + .8);
      player.z += contact.normalZ * (contact.overlap + .8);
      const constrainedPosition = this.constrainToSector(player, player.x, player.z);
      player.x = constrainedPosition.x;
      player.z = constrainedPosition.z;
      const recent = this.elapsed - contact.spring.userData.lastMalletHitAt[player.index] < WALL_SPRING_HIT_COOLDOWN;
      if (recent) return;
      const relative = (player.vx - contact.velocityX) * contact.normalX
        + (player.vz - contact.velocityZ) * contact.normalZ;
      const currentNormalSpeed = player.vx * contact.normalX + player.vz * contact.normalZ;
      const physicalImpulse = relative < 0 ? -(1 + WALL_SPRING_MALLET_RESTITUTION) * relative : 0;
      const antiStallImpulse = Math.max(0, WALL_SPRING_MALLET_MIN_KICK - currentNormalSpeed);
      const impulse = Math.max(physicalImpulse, antiStallImpulse);
      player.vx += contact.normalX * impulse;
      player.vz += contact.normalZ * impulse;
      const target = this.constrainToSector(
        player,
        player.targetX + contact.normalX * 62,
        player.targetZ + contact.normalZ * 62
      );
      player.targetX = target.x;
      player.targetZ = target.z;
      if (player.brain) {
        player.brain.retreatUntil = this.elapsed + .42;
        player.brain.state = "retreat";
        player.brain.lastDecision = "壁面スプリングから退避";
      }
      contact.spring.userData.lastMalletHitAt[player.index] = this.elapsed;
      this.wallSpringHitCount += 1;
      this.wallSpringMalletHitCount += 1;
      didHit = true;
      this.wallImpact(player.x, player.z);
    });
    if (didHit) this.updateWallSpringTelemetry(true);
  }

  updateWallSpringTelemetry(force = false) {
    if (!this.root) return;
    if (!force && this.wallSpringClock < this.nextWallSpringTelemetryAt) return;
    this.nextWallSpringTelemetryAt = this.wallSpringClock + .1;
    this.root.dataset.itl3WallSpringCount = String(this.wallSprings?.length || 0);
    this.root.dataset.itl3WallSpringExtension = Number(this.wallSpringExtension || 0).toFixed(1);
    this.root.dataset.itl3WallSpringActive = this.wallSpringExtension > .05 ? "1" : "0";
    this.root.dataset.itl3WallSpringActivations = String(this.wallSpringActivationCount);
    this.root.dataset.itl3WallSpringHits = String(this.wallSpringHitCount);
    this.root.dataset.itl3WallSpringPuckHits = String(this.wallSpringPuckHitCount);
    this.root.dataset.itl3WallSpringMalletHits = String(this.wallSpringMalletHitCount);
  }

  wallSpringSelfTest() {
    const activeStart = WALL_SPRING_INTERVAL - WALL_SPRING_ACTIVE_WINDOW;
    const goalSafe = Boolean(this.wallSprings?.length) && this.wallSprings.every(spring => (
      this.players.every(player => (
        Math.abs(angleDifference(spring.userData.angle, player.angle))
          >= GOAL_HALF_ANGLE * GOAL_WIDTH_SCALE + WALL_SPRING_GOAL_MARGIN
      ))
    ));
    const inactive = this.wallSpringExtensionAt(activeStart - .01) === 0;
    const extendsOutward = this.wallSpringExtensionAt(activeStart + WALL_SPRING_EXTEND_SECONDS * .5) > 0;
    const reachesTravel = Math.abs(
      this.wallSpringExtensionAt(activeStart + WALL_SPRING_EXTEND_SECONDS + .01) - WALL_SPRING_TRAVEL
    ) < .01;
    const retracts = this.wallSpringExtensionAt(WALL_SPRING_INTERVAL) === 0;
    const simulatedSpringVelocity = 420;
    const relativeSpeed = -simulatedSpringVelocity;
    const reflectedSpeed = relativeSpeed - (1 + WALL_SPRING_RESTITUTION) * relativeSpeed;
    return {
      intervalSeconds: WALL_SPRING_INTERVAL,
      goalSafe,
      springCount: this.wallSprings?.length || 0,
      inactive,
      extends: extendsOutward,
      reachesTravel,
      retracts,
      physicalRebound: reflectedSpeed > 0,
      normalWallRestitution: WALL_RESTITUTION,
      retractedRestitution: WALL_SPRING_RETRACTED_RESTITUTION,
      extendedRestitution: WALL_SPRING_RESTITUTION,
      impactRestitution: WALL_SPRING_IMPACT_RESTITUTION,
      retractedMinimumKick: WALL_SPRING_RETRACTED_MIN_KICK,
      extendedMinimumKick: WALL_SPRING_PUCK_MIN_KICK,
      impactMinimumKick: WALL_SPRING_IMPACT_MIN_KICK,
      impactStrongerThanExtended: WALL_SPRING_IMPACT_RESTITUTION > WALL_SPRING_RESTITUTION
        && WALL_SPRING_IMPACT_MIN_KICK > WALL_SPRING_PUCK_MIN_KICK,
      strongerThanNormalWall: WALL_SPRING_RETRACTED_RESTITUTION > WALL_RESTITUTION
        && WALL_SPRING_RESTITUTION > WALL_RESTITUTION,
      springsAtLeastNormalWall: WALL_SPRING_RETRACTED_RESTITUTION >= WALL_RESTITUTION
        && WALL_SPRING_RESTITUTION >= WALL_RESTITUTION,
      normalMatchesExtendedSpring: Math.abs(WALL_RESTITUTION - WALL_SPRING_RESTITUTION) < .0001,
      targets: "puck-and-mallet"
    };
  }

  updateKeeperTelemetry(force = false) {
    if (!force && this.elapsed < this.nextKeeperTelemetryAt) return;
    this.nextKeeperTelemetryAt = this.elapsed + .25;
    const goalRadius = ARENA_RADIUS + GOAL_DEPTH * .48;
    this.root.dataset.itl3KeeperOffsets = this.players.map(player => Number(player.keeperOffset || 0).toFixed(1)).join(",");
    this.root.dataset.itl3KeeperSpeeds = this.players.map(player => Math.abs(Number(player.keeperVelocity || 0)).toFixed(1)).join(",");
    this.root.dataset.itl3KeeperHits = this.players.map(player => Number(player.keeperHitCount || 0)).join(",");
    this.root.dataset.itl3KeeperGoalGaps = this.players.map(player => {
      const radialPosition = player.keeperX * Math.cos(player.angle) + player.keeperZ * Math.sin(player.angle);
      return (goalRadius - radialPosition).toFixed(1);
    }).join(",");
    this.root.dataset.itl3KeeperFacingOffsets = this.players.map((player, index) => {
      const offset = this.avatarMeshes?.[index]?.userData?.puckFacingOffset || 0;
      return (offset * 180 / Math.PI).toFixed(1);
    }).join(",");
    this.root.dataset.itl3KeeperTracking = JSON.stringify(this.players.map(player => ({
      index: player.index,
      tracking: Boolean(player.keeperTracking?.shouldTrack),
      goalwardThreat: Boolean(player.keeperTracking?.goalwardThreat),
      targetOffset: Number(player.keeperTargetOffset || 0).toFixed(1),
      projectedTangent: Number(player.keeperTracking?.projectedTangent || 0).toFixed(1),
      secondsToKeeperPath: Number.isFinite(player.keeperTracking?.secondsToKeeperPath)
        ? Number(player.keeperTracking.secondsToKeeperPath).toFixed(3)
        : "none"
    })));
    this.root.dataset.itl3CharacterAbilityLive = JSON.stringify(this.players.map(player => {
      const tuning = this.effectiveKeeperTuning(player);
      return {
        index: player.index,
        characterId: player.characterDescriptor?.id || null,
        profile: player.abilityProfile.key,
        keeperResponse: Number(tuning.response.toFixed(2)),
        keeperAcceleration: Number(tuning.acceleration.toFixed(2)),
        keeperTopSpeed: Number(tuning.topSpeed.toFixed(2)),
        powerReturn: Number(tuning.powerReturn.toFixed(3)),
        situational: tuning.activeSituationalAbilities,
        mallet: player.activeMalletAbilityEffects || []
      };
    }));
  }

  startMatch() {
    if (this.running && !this.finished) return;
    this.resumeAudio();
    this.finished = false;
    this.resultPresented = false;
    this.running = true;
    this.timeRemaining = MATCH_SECONDS;
    this.overtime = false;
    this.elapsed = 0;
    this.countdown = 0;
    this.countdownMark = null;
    this.kickoffCountdownDuration = 0;
    this.kickoffRecipientIndex = null;
    this.kickoffSource = "initial";
    this.kickoffArrowLaunchUntil = 0;
    this.serveTimer = 0;
    this.pendingServeRecipientIndex = null;
    this.lastServeRecipientIndex = null;
    this.lastServeDirectionX = 0;
    this.lastServeDirectionZ = 0;
    this.serveSequence = 0;
    this.root.dataset.itl3ServeSequence = "0";
    this.root.dataset.itl3ServeMode = "waiting-for-initial-kickoff";
    this.root.dataset.itl3ServeRecipient = "none";
    this.root.dataset.itl3PendingServeRecipient = "none";
    this.root.dataset.itl3LastGoalDefender = "none";
    this.root.dataset.itl3ServeDirection = "0.000,0.000";
    this.characterNamesHideAt = null;
    this.charactersLayer?.classList.remove("are-names-hidden");
    this.cameraMode = "countdown";
    this.cameraModeTime = 0;
    this.goalCinematic = null;
    this.pendingGoal = null;
    this.territoryGoalFlash = null;
    this.root.dataset.itl3TerritoryGoalFlashState = "idle";
    this.root.dataset.itl3TerritoryGoalFlashActive = "0";
    this.root.dataset.itl3TerritoryGoalFlashScorer = "none";
    this.root.dataset.itl3TerritoryGoalFlashIntensity = "0.000";
    this.root.dataset.itl3TerritoryGoalFlashColorMix = "0.000";
    this.root.dataset.itl3TerritoryGoalFlashTileCount = "0";
    this.root.dataset.itl3TerritoryGoalFlashTileIndex = "none";
    this.root.dataset.itl3TerritoryGoalFlashPreviousOwner = "none";
    this.victoryFocus = null;
    this.comboCount = 0;
    this.comboExpiresAt = 0;
    this.lastImpactPower = 0;
    this.smashCount = 0;
    this.lastSmashBy = -1;
    this.lastSmashPower = 0;
    this.root.dataset.itl3MalletSmashCount = "0";
    this.root.dataset.itl3LastSmashBy = "none";
    this.root.dataset.itl3LastSmashPower = "0";
    this.lastTouch = null;
    this.touchHistory.length = 0;
    this.roundPath.length = 0;
    this.players.forEach((player, index) => {
      player.lives = 3;
      player.active = true;
      player.goalsFor = 0;
      player.territoryCaptured = 0;
      player.territoryLost = 0;
      player.gateProgress = 0;
      player.lastStrikeAt = -10;
      player.activeMalletAbilityEffects = [];
      player.activeKeeperAbilityEffects = [];
      player.lastPuckTouchAt = 0;
      player.centerTurntableResistanceUntil = 0;
      player.consecutiveGoalsConceded = 0;
      player.consecutiveGoalGuardUntil = 0;
      if (player.brain) this.randomizeBrainForRally(player, true);
      const character = this.root.querySelector(`[data-itl3-character="${index}"]`);
      character?.classList.remove("is-out", "is-cheer", "is-hurt", "is-strike");
    });
    this.resetMalletStarts();
    this.resetKeepers();
    this.resetWallSprings();
    this.resetCenterPropellerImpacts();
    this.gates.forEach(gate => { gate.target = 0; });
    this.gates.forEach(gate => { gate.sparked = false; });
    this.resetTerritories();
    this.opening?.classList.add("is-hidden");
    this.root.querySelector("[data-itl3-result]")?.remove();
    if (this.clock) this.clock.textContent = String(MATCH_SECONDS);
    this.updateScoreboard();
    this.beginKickoffCountdown(null, "initial");
  }

  beginKickoffCountdown(recipientIndex = null, source = "post-goal") {
    if (this.finished) return;
    if (this.territoryGoalFlash) {
      this.commitTerritoryGoalFlashColor(this.territoryGoalFlash);
      this.root.dataset.itl3TerritoryGoalFlashState = "completed-before-countdown";
      this.root.dataset.itl3TerritoryGoalFlashActive = "0";
      this.root.dataset.itl3TerritoryGoalFlashIntensity = "0.000";
      this.root.dataset.itl3TerritoryGoalFlashColorMix = "1.000";
      this.territoryGoalFlash = null;
    }
    const activePlayers = this.players.filter(player => player.active);
    const requestedRecipient = Number.isInteger(recipientIndex)
      ? activePlayers.find(player => player.index === recipientIndex)
      : null;
    const recipient = requestedRecipient || choose(activePlayers) || null;
    this.kickoffRecipientIndex = recipient?.index ?? null;
    this.pendingServeRecipientIndex = recipient?.index ?? null;
    this.kickoffSource = source;
    this.kickoffArrowLaunchUntil = 0;
    this.kickoffCountdownDuration = Math.random() < .5
      ? KICKOFF_COUNTDOWN_SHORT_SECONDS
      : KICKOFF_COUNTDOWN_LONG_SECONDS;
    this.pendingServeSpeed = randomBetween(SERVE_SPEED_MIN, SERVE_SPEED_MAX);
    this.kickoffTurntableTransitLock = false;
    this.countdown = this.kickoffCountdownDuration;
    this.countdownMark = 3;
    this.serveTimer = 0;
    this.resetPuck(false);
    this.resetMalletStarts();
    this.planKickoffTurntableSync(recipient, this.pendingServeSpeed);
    this.kickoffFirstTerritoryPending = false;
    this.kickoffExpectedTerritoryIndex = recipient?.index ?? null;
    this.goalCinematic = null;
    this.cameraMode = "countdown";
    this.cameraModeTime = 0;
    this.root.dataset.itl3ServeMode = source === "initial"
      ? "kickoff-countdown-initial-random-monster"
      : "kickoff-countdown-conceding-player";
    this.root.dataset.itl3PendingServeRecipient = recipient ? String(recipient.index) : "none";
    this.root.dataset.itl3KickoffCountdownDuration = this.kickoffCountdownDuration.toFixed(1);
    this.root.dataset.itl3KickoffCountdownStage = "3";
    this.root.dataset.itl3KickoffCountdownSource = source;
    this.root.dataset.itl3KickoffArrowVisible = recipient ? "1" : "0";
    this.root.dataset.itl3KickoffArrowRecipient = recipient ? String(recipient.index) : "none";
    this.root.dataset.itl3KickoffArrowPhase = recipient ? "countdown" : "idle";
    this.root.dataset.itl3KickoffArrowSource = source;
    this.root.dataset.itl3KickoffArrowDirection = recipient
      ? `${Math.cos(recipient.angle).toFixed(3)},${Math.sin(recipient.angle).toFixed(3)}`
      : "0.000,0.000";
    this.root.dataset.itl3KickoffExpectedTerritory = recipient ? String(recipient.index) : "none";
    this.root.dataset.itl3KickoffFirstTerritory = "none";
    this.root.dataset.itl3KickoffFirstTerritoryMatched = "pending";
    this.root.dataset.itl3KickoffPropellerHitBeforeTerritory = "pending";
    this.showMessage(source === "initial" ? "KICKOFF" : "RESTART", "3");
    this.beep(360, .075, .045);
  }

  resetPuck(launch = true) {
    this.pendingGoal = null;
    this.root.dataset.itl3GoalTransition = "idle";
    this.root.dataset.itl3GoalEntryPuckVisible = "0";
    this.puck.x = 0;
    this.puck.z = 0;
    this.puck.vx = 0;
    this.puck.vz = 0;
    this.puck.visible = true;
    this.puck.lastHitAt = -10;
    this.puck.lastHitBy = -1;
    this.puck.goalPostCapture = null;
    this.puck.goalCornerApproach = null;
    this.puck.goalCornerApproachBlockedUntil = 0;
    this.lastTouch = null;
    this.touchHistory.length = 0;
    this.setPuckOwner(null);
    this.serveGrace = 0;
    this.serveSoftWindow = 0;
    this.smashBurnTime = 0;
    this.smashBurnEmitClock = 0;
    this.smashSmokeEmitClock = 0;
    this.smashBurnVisualActive = false;
    if (this.puckBurnGroup) this.puckBurnGroup.visible = false;
    this.resetSmashSmoke();
    if (this.puckMesh?.userData.body) this.puckMesh.userData.body.material.emissiveIntensity = 1.3;
    this.root.dataset.itl3MalletSmashBurning = "0";
    this.root.dataset.itl3MalletSmashBurnDirection = "none";
    this.trailPoints.length = 0;
    this.roundPath.length = 0;
    if (launch) {
      this.completeKickoffTurntableSync();
      this.resetMalletStarts();
      this.goalCinematic = null;
      this.cameraMode = "match";
      this.cameraModeTime = 0;
      const recipientIndex = Number.isInteger(this.pendingServeRecipientIndex)
        && this.players[this.pendingServeRecipientIndex]?.active
        ? this.pendingServeRecipientIndex
        : null;
      const recipient = recipientIndex == null ? null : this.players[recipientIndex];
      const angle = recipient ? recipient.angle : randomBetween(-Math.PI, Math.PI);
      // A new rally starts with a soft center tap. Once the first collision
      // happens, the normal physical impulse and speed limits take over. The
      // opening kickoff targets one randomly selected monster; after a goal,
      // the same tap targets the monster that conceded.
      const speed = Number.isFinite(this.pendingServeSpeed)
        ? this.pendingServeSpeed
        : randomBetween(SERVE_SPEED_MIN, SERVE_SPEED_MAX);
      this.pendingServeSpeed = null;
      this.serveGrace = SERVE_GRACE_SECONDS;
      this.serveSoftWindow = SERVE_SOFT_WINDOW;
      this.puck.vx = Math.cos(angle) * speed;
      this.puck.vz = Math.sin(angle) * speed;
      this.serveSequence += 1;
      this.lastServeRecipientIndex = recipientIndex;
      this.lastServeDirectionX = Math.cos(angle);
      this.lastServeDirectionZ = Math.sin(angle);
      this.pendingServeRecipientIndex = null;
      this.root.dataset.itl3ServeSequence = String(this.serveSequence);
      this.root.dataset.itl3ServeMode = recipient
        ? (this.kickoffSource === "initial" ? "initial-random-monster" : "conceding-player")
        : "fallback-neutral";
      this.root.dataset.itl3ServeRecipient = recipient ? String(recipient.index) : "fallback-neutral";
      this.root.dataset.itl3PendingServeRecipient = "none";
      this.root.dataset.itl3ServeDirection = `${Math.cos(angle).toFixed(3)},${Math.sin(angle).toFixed(3)}`;
      this.root.dataset.itl3KickoffCountdownStage = "ＧＯ！";
      this.kickoffFirstTerritoryPending = Boolean(recipient);
      this.kickoffArrowLaunchUntil = recipient
        ? this.elapsed + KICKOFF_ARROW_POST_LAUNCH_MAX_SECONDS
        : 0;
      this.root.dataset.itl3KickoffArrowVisible = recipient ? "1" : "0";
      this.root.dataset.itl3KickoffArrowPhase = recipient ? "launch" : "idle";
      this.kickoffTurntableTransitLock = Boolean(recipient);
      this.kickoffExpectedTerritoryIndex = recipientIndex;
      this.kickoffPropellerHitsAtLaunch = this.centerPropellerHitCount;
      this.kickoffFirstPropellerContact = null;
      this.kickoffFirstPropellerOverlap = null;
      this.kickoffPropellerOverlapCount = 0;
      this.kickoffLaunchedAt = this.elapsed;
      this.root.dataset.itl3KickoffExpectedTerritory = recipient ? String(recipient.index) : "none";
      this.root.dataset.itl3KickoffFirstTerritory = "none";
      this.root.dataset.itl3KickoffFirstTerritoryMatched = recipient ? "pending" : "not-applicable";
      this.root.dataset.itl3KickoffPropellerHitBeforeTerritory = recipient ? "pending" : "not-applicable";
      this.randomizeBrainsForRally();
    }
  }

  trackKickoffFirstTerritoryEntry() {
    if (!this.kickoffFirstTerritoryPending || !this.puck.visible) return;
    if (Math.hypot(this.puck.x, this.puck.z) < TERRITORY_INNER_RADIUS) return;
    const puckAngle = Math.atan2(this.puck.z, this.puck.x);
    const actualPlayer = this.players.reduce((closest, player) => {
      const difference = Math.abs(angleDifference(puckAngle, player.angle));
      return !closest || difference < closest.difference ? { player, difference } : closest;
    }, null)?.player || null;
    const actualIndex = actualPlayer?.index ?? null;
    const matched = actualIndex != null && actualIndex === this.kickoffExpectedTerritoryIndex;
    const propellerHit = this.centerPropellerHitCount > this.kickoffPropellerHitsAtLaunch;
    const expectedPlayer = Number.isInteger(this.kickoffExpectedTerritoryIndex)
      ? this.players[this.kickoffExpectedTerritoryIndex]
      : null;
    const entryClearance = expectedPlayer
      ? this.kickoffTurntableLaneClearance(this.centerBlackTurntableAngle, expectedPlayer.angle)
      : 0;
    const entryRecord = {
      sequence: this.serveSequence,
      source: this.kickoffSource,
      duration: this.kickoffCountdownDuration,
      expectedIndex: this.kickoffExpectedTerritoryIndex,
      actualIndex,
      matched,
      propellerHit,
      entrySeconds: Number(Math.max(0, this.elapsed - this.kickoffLaunchedAt).toFixed(3)),
      entryAngle: Number(puckAngle.toFixed(3)),
      turntableAngle: Number(this.centerBlackTurntableAngle.toFixed(3)),
      turntableClearanceDegrees: Number((entryClearance * 180 / Math.PI).toFixed(2)),
      predictedClearanceDegrees: Number(this.root.dataset.itl3KickoffTurntablePredictedClearanceDegrees || 0),
      syncMode: this.root.dataset.itl3KickoffTurntableSyncMode,
      launchDirection: [Number(this.lastServeDirectionX.toFixed(3)), Number(this.lastServeDirectionZ.toFixed(3))],
      propellerOverlapCount: this.kickoffPropellerOverlapCount,
      firstPropellerOverlap: this.kickoffFirstPropellerOverlap ? { ...this.kickoffFirstPropellerOverlap } : null,
      firstPropellerContact: this.kickoffFirstPropellerContact ? { ...this.kickoffFirstPropellerContact } : null
    };
    this.kickoffEntryHistory.push(entryRecord);
    if (this.kickoffEntryHistory.length > 18) this.kickoffEntryHistory.shift();
    this.kickoffFirstTerritoryPending = false;
    this.kickoffTurntableTransitLock = false;
    this.root.dataset.itl3KickoffTurntableSyncState = "normal-speed-resumed-after-first-entry";
    this.root.dataset.itl3KickoffFirstTerritory = actualIndex == null ? "none" : String(actualIndex);
    this.root.dataset.itl3KickoffFirstTerritoryMatched = matched ? "1" : "0";
    this.root.dataset.itl3KickoffPropellerHitBeforeTerritory = propellerHit ? "1" : "0";
    this.root.dataset.itl3KickoffFirstTerritoryAngle = puckAngle.toFixed(3);
    this.root.dataset.itl3KickoffTurntableEntryClearanceDegrees = entryRecord.turntableClearanceDegrees.toFixed(2);
    this.root.dataset.itl3KickoffEntryHistory = JSON.stringify(this.kickoffEntryHistory);
  }

  setPuckOwner(playerIndex) {
    const normalizedIndex = Number.isInteger(playerIndex) && this.players[playerIndex] ? playerIndex : -1;
    const player = normalizedIndex >= 0 ? this.players[normalizedIndex] : null;
    const accentColor = new THREE.Color(player?.color || PUCK_START_COLOR);
    const bodyColor = player
      ? accentColor.clone().lerp(new THREE.Color(0xffffff), .3)
      : accentColor.clone();
    const ringColor = bodyColor.clone().lerp(new THREE.Color(0xffffff), .42);
    this.puck.ownerIndex = normalizedIndex;

    const puckBody = this.puckMesh?.userData.body;
    const puckRing = this.puckMesh?.userData.ring;
    const puckGlow = this.puckMesh?.userData.glow;
    if (puckBody) {
      puckBody.material.color.copy(bodyColor);
      puckBody.material.emissive.copy(accentColor);
    }
    if (puckRing) puckRing.material.color.copy(ringColor);
    if (puckGlow) puckGlow.material.color.copy(accentColor);
    if (this.replayPuck) {
      this.replayPuck.material.color.copy(bodyColor);
      this.replayPuck.userData.ring?.material?.color.copy(ringColor);
    }
    if (this.trail) this.trail.material.color.copy(accentColor);
    if (this.trailGlow) this.trailGlow.material.color.copy(ringColor);

    this.root.dataset.itl3PuckOwner = normalizedIndex >= 0 ? String(normalizedIndex) : "none";
    this.root.dataset.itl3PuckColor = `#${bodyColor.getHexString()}`;
  }

  recordPuckTouch(player) {
    if (!player?.active) return;
    player.lastPuckTouchAt = this.elapsed;
    this.lastTouch = player.index;
    if (this.touchHistory[this.touchHistory.length - 1] !== player.index) {
      this.touchHistory.push(player.index);
      if (this.touchHistory.length > 8) this.touchHistory.shift();
    }
    this.setPuckOwner(player.index);
  }

  randomizeBrainsForRally() {
    this.players.forEach(player => { if (player.brain) this.randomizeBrainForRally(player, false); });
  }

  randomizeBrainForRally(player, first) {
    const brain = player.brain;
    const candidates = this.players.filter(other => other.active && other.index !== player.index);
    const selected = candidates.length ? choose(candidates) : null;
    brain.state = first ? "guard" : choose(["guard", "read", "guard"]);
    brain.decisionAt = this.elapsed + randomBetween(.16, .43);
    brain.reactionAt = this.elapsed + randomBetween(.08, .22);
    brain.retreatUntil = 0;
    brain.targetOpponent = selected?.index ?? 0;
    brain.shotAngleBias = randomBetween(-.32, .32);
    brain.guardRadius = randomBetween(.49, .67);
    brain.guardOffset = randomBetween(-.16, .16);
    brain.aggression = randomBetween(.44, .76);
    brain.caution = randomBetween(.4, .75);
    brain.bankPreference = randomBetween(.16, .46);
    brain.feintPreference = randomBetween(.12, .31);
    brain.feintSide = Math.random() < .5 ? -1 : 1;
    brain.rallySeed = Math.random();
    brain.lastDecision = "ラリー再判断";
  }

  loop(timestamp) {
    if (this.destroyed) return;
    const delta = this.lastTimestamp ? Math.min(.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000)) : 0;
    this.lastTimestamp = timestamp;
    this.elapsed += delta;
    this.cameraModeTime += delta;

    if (this.running && !this.finished) {
      if (this.countdown > 0) this.updateCountdown(delta);
      else {
        this.accumulator = Math.min(this.accumulator + delta, FIXED_STEP * 10);
        while (this.accumulator >= FIXED_STEP) {
          this.step(FIXED_STEP);
          this.accumulator -= FIXED_STEP;
        }
      }
    }
    if (this.characterNamesHideAt != null && this.elapsed >= this.characterNamesHideAt) {
      this.characterNamesHideAt = null;
      this.charactersLayer?.classList.add("are-names-hidden");
    }
    this.updateVisuals(delta);
    this.renderScene();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  updateCountdown(delta) {
    this.countdown = Math.max(0, this.countdown - delta);
    const stageSeconds = this.kickoffCountdownDuration / KICKOFF_COUNTDOWN_NUMERAL_COUNT;
    const elapsed = this.kickoffCountdownDuration - this.countdown;
    const mark = this.countdown <= 0
      ? 0
      : elapsed < stageSeconds
        ? 3
        : elapsed < stageSeconds * 2
          ? 2
          : 1;
    if (mark !== this.countdownMark) {
      this.countdownMark = mark;
      if (mark > 0) {
        this.root.dataset.itl3KickoffCountdownStage = String(mark);
        this.showMessage(this.kickoffSource === "initial" ? "KICKOFF" : "RESTART", String(mark));
        this.beep(330 + (3 - mark) * 100, .07, .045);
      } else {
        this.root.dataset.itl3KickoffCountdownStage = "ＧＯ！";
        this.completeKickoffTurntableSync();
        this.showMessage("KICKOFF", "ＧＯ！");
        this.beep(720, .16, .06);
        this.cameraMode = "match";
        this.cameraModeTime = 0;
        this.resetPuck(true);
        this.characterNamesHideAt = this.elapsed + CHARACTER_NAME_VISIBLE_AFTER_SERVE;
      }
    }
  }

  captureReplayCharacters() {
    return this.players.map((player, index) => {
      const avatar = this.avatarMeshes?.[index];
      const data = avatar?.userData;
      const threeModel = data?.threeModel;
      return {
        x: Number.isFinite(avatar?.position?.x) ? avatar.position.x : player.keeperX,
        y: Number.isFinite(avatar?.position?.y) ? avatar.position.y : 0,
        z: Number.isFinite(avatar?.position?.z) ? avatar.position.z : player.keeperZ,
        scale: Number.isFinite(avatar?.scale?.x) ? avatar.scale.x : 1,
        rotationY: threeModel && Number.isFinite(threeModel.rotation.y) ? threeModel.rotation.y : null,
        puckFacingOffset: Number.isFinite(data?.puckFacingOffset) ? data.puckFacingOffset : 0,
        view: data?.activeAvatarView || null,
        active: Boolean(player.active)
      };
    });
  }

  captureReplayMallets() {
    return this.players.map((player, index) => {
      const mesh = this.malletMeshes?.[index];
      const speed = Math.hypot(player.vx, player.vz);
      return {
        x: Number.isFinite(player.x) ? player.x : (mesh?.position?.x || 0),
        y: Number.isFinite(mesh?.position?.y) ? mesh.position.y : 0,
        z: Number.isFinite(player.z) ? player.z : (mesh?.position?.z || 0),
        vx: Number.isFinite(player.vx) ? player.vx : 0,
        vz: Number.isFinite(player.vz) ? player.vz : 0,
        rotationX: Number.isFinite(mesh?.rotation?.x)
          ? mesh.rotation.x
          : clamp(player.vz / MALLET_MAX_SPEED, -.08, .08),
        rotationY: Number.isFinite(mesh?.rotation?.y) ? mesh.rotation.y : 0,
        rotationZ: Number.isFinite(mesh?.rotation?.z)
          ? mesh.rotation.z
          : clamp(-player.vx / MALLET_MAX_SPEED, -.08, .08),
        ringScale: Number.isFinite(mesh?.userData?.ring?.scale?.x)
          ? mesh.userData.ring.scale.x
          : 1 + speed / MALLET_MAX_SPEED * .08,
        glowOpacity: Number.isFinite(mesh?.userData?.underGlow?.material?.opacity)
          ? mesh.userData.underGlow.material.opacity
          : .16 + speed / MALLET_MAX_SPEED * .32,
        active: Boolean(player.active)
      };
    });
  }

  appendReplayFrame() {
    this.roundPath.push({
      x: this.puck.x,
      z: this.puck.z,
      characters: this.captureReplayCharacters(),
      mallets: this.captureReplayMallets()
    });
    if (this.roundPath.length > GOAL_REPLAY_HISTORY_POINTS) this.roundPath.shift();
  }

  goalReplaySample() {
    const replay = this.goalCinematic;
    if (!replay?.path?.length) return null;
    const progress = clamp((1 - replay.life / replay.maxLife) * GOAL_REPLAY_PATH_PROGRESS_SCALE, 0, 1);
    const pathPosition = progress * Math.max(0, replay.path.length - 1);
    const index = Math.min(replay.path.length - 1, Math.floor(pathPosition));
    const nextIndex = Math.min(replay.path.length - 1, index + 1);
    return {
      replay,
      progress,
      pathPosition,
      index,
      nextIndex,
      mix: pathPosition - index,
      frame: replay.path[index],
      nextFrame: replay.path[nextIndex]
    };
  }

  replayCharacterAt(sample, index) {
    if (!sample) return null;
    const fallback = sample.replay?.characterPoses?.[index] || null;
    const from = sample.frame?.characters?.[index] || fallback;
    const to = sample.nextFrame?.characters?.[index] || from;
    if (!from) return null;
    const mix = sample.mix;
    const interpolate = (a, b, defaultValue = 0) => {
      const start = Number.isFinite(a) ? a : defaultValue;
      const end = Number.isFinite(b) ? b : start;
      return THREE.MathUtils.lerp(start, end, mix);
    };
    const fromRotation = Number.isFinite(from.rotationY) ? from.rotationY : null;
    const toRotation = Number.isFinite(to?.rotationY) ? to.rotationY : fromRotation;
    return {
      x: interpolate(from.x, to?.x),
      y: interpolate(from.y, to?.y),
      z: interpolate(from.z, to?.z),
      scale: interpolate(from.scale, to?.scale, 1),
      rotationY: fromRotation == null
        ? null
        : fromRotation + angleDifference(toRotation, fromRotation) * mix,
      puckFacingOffset: interpolate(from.puckFacingOffset, to?.puckFacingOffset),
      view: mix < .5 ? from.view : (to?.view || from.view),
      active: typeof from.active === "boolean" ? from.active : true
    };
  }

  replayMalletAt(sample, index) {
    if (!sample) return null;
    const fallback = sample.replay?.malletPoses?.[index] || null;
    const from = sample.frame?.mallets?.[index] || fallback;
    const to = sample.nextFrame?.mallets?.[index] || from;
    if (!from) return null;
    const mix = sample.mix;
    const interpolate = (a, b, defaultValue = 0) => {
      const start = Number.isFinite(a) ? a : defaultValue;
      const end = Number.isFinite(b) ? b : start;
      return THREE.MathUtils.lerp(start, end, mix);
    };
    const interpolateRotation = (a, b) => {
      const start = Number.isFinite(a) ? a : 0;
      const end = Number.isFinite(b) ? b : start;
      return start + angleDifference(end, start) * mix;
    };
    return {
      x: interpolate(from.x, to?.x),
      y: interpolate(from.y, to?.y),
      z: interpolate(from.z, to?.z),
      vx: interpolate(from.vx, to?.vx),
      vz: interpolate(from.vz, to?.vz),
      rotationX: interpolateRotation(from.rotationX, to?.rotationX),
      rotationY: interpolateRotation(from.rotationY, to?.rotationY),
      rotationZ: interpolateRotation(from.rotationZ, to?.rotationZ),
      ringScale: interpolate(from.ringScale, to?.ringScale, 1),
      glowOpacity: interpolate(from.glowOpacity, to?.glowOpacity, .16),
      active: mix < .5
        ? (typeof from.active === "boolean" ? from.active : true)
        : (typeof to?.active === "boolean" ? to.active : from.active !== false)
    };
  }

  step(dt) {
    if (this.countdown > 0) return;
    this.advanceCenterBlackTurntable(dt);
    this.advanceCenterPropellers(dt);
    if (this.serveTimer > 0) {
      this.serveTimer -= dt;
      this.advanceTerritoryGoalFlashPhase();
      if (this.serveTimer <= 0 && !this.finished) {
        this.beginKickoffCountdown(this.pendingServeRecipientIndex, "post-goal");
      }
      return;
    }
    if (this.pendingGoal) {
      this.advanceAcceptedGoal(dt);
      return;
    }
    if (!this.overtime) {
      this.timeRemaining = Math.max(0, this.timeRemaining - dt);
      if (this.clock) this.clock.textContent = String(Math.ceil(this.timeRemaining));
      if (this.timeRemaining <= 0) {
        const standing = this.territoryStanding();
        if (standing.leaders.length === 1) {
          this.finishMatch(standing.leaders[0], "TERRITORY TIME UP");
        } else {
          this.overtime = true;
          if (this.clock) this.clock.textContent = "OT";
          this.showMessage("TERRITORY TIE", "OVERTIME");
          this.beep(470, .18, .06);
        }
        return;
      }
    } else if (this.clock) {
      this.clock.textContent = "OT";
    }
    const kickoffMalletHold = this.holdMalletsForKickoffReceive();
    if (!kickoffMalletHold) {
      this.root.dataset.itl3KickoffMalletHold = "released";
      this.updatePlayerControl(dt);
      this.players.forEach(player => {
        if (player.index !== 0 && player.active) this.updateCpu(player, dt);
        this.moveMallet(player, dt);
      });
    }
    this.updateKeepers(dt);
    this.updateWallSprings(dt);
    this.integratePuck(dt);
    // Record the actual first territory crossing before any mallet, keeper or
    // wall response in this frame can move the puck back across the boundary.
    // The puck itself is never steered here; this only ends the kickoff hold at
    // the first physically reached territory.
    this.trackKickoffFirstTerritoryEntry();
    // A puck that has visibly entered a goal corner used to hit the circular
    // arena wall or keeper before it ever reached the post collider. Commit
    // that approach immediately after integration, before any object can send
    // it back toward the keeper.
    this.commitVisibleGoalCornerApproach();
    const committedBeforeContact = this.hasActiveGoalRoute();
    if (!committedBeforeContact) this.resolveMalletCollisions();
    // Resolve a visible post contact before the keeper. The keeper collider
    // reaches almost to the post face, so the former order could send a puck
    // back into the field before its clearly-inner post graze was classified.
    const goalPostContact = this.resolveGoalPostCollisions();
    const committedAfterPost = this.hasActiveGoalRoute();
    // A clear-mouth trajectory keeps the circular wall open, but it must not
    // make the goalkeeper intangible. Only a genuinely accepted inner-post
    // route is protected from a late keeper collision.
    if (!goalPostContact) this.resolveKeeperCollisions();
    if (!committedAfterPost) {
      this.resolveCenterPropellerCollisions();
      this.resolveWallSpringCollisions();
    }
    this.resolveBoundary();
    if (this.serveSoftWindow > 0) {
      this.serveSoftWindow = Math.max(0, this.serveSoftWindow - dt);
      const softSpeed = Math.hypot(this.puck.vx, this.puck.vz);
      if (softSpeed > SERVE_SOFT_MAX_SPEED) {
        this.puck.vx *= SERVE_SOFT_MAX_SPEED / softSpeed;
        this.puck.vz *= SERVE_SOFT_MAX_SPEED / softSpeed;
      }
    }
    this.appendReplayFrame();
  }

  updatePlayerControl(dt) {
    const player = this.players[0];
    if (!player.active) return;
    let dx = 0;
    let dz = 0;
    if (this.keyState.has("arrowleft") || this.keyState.has("a")) dx -= 1;
    if (this.keyState.has("arrowright") || this.keyState.has("d")) dx += 1;
    if (this.keyState.has("arrowup") || this.keyState.has("w")) dz -= 1;
    if (this.keyState.has("arrowdown") || this.keyState.has("s")) dz += 1;
    if (dx || dz) {
      const length = Math.hypot(dx, dz) || 1;
      player.targetX += dx / length * PLAYER_MALLET_MAX_SPEED * dt;
      player.targetZ += dz / length * PLAYER_MALLET_MAX_SPEED * dt;
      const target = this.constrainToSector(player, player.targetX, player.targetZ);
      player.targetX = target.x;
      player.targetZ = target.z;
    }
  }

  updateCpu(player) {
    const brain = player.brain;
    const puckRadius = Math.hypot(this.puck.x, this.puck.z);
    const puckAngle = Math.atan2(this.puck.z, this.puck.x);
    const sectorDelta = Math.abs(angleDifference(puckAngle, player.angle));
    const distanceToPuck = Math.hypot(this.puck.x - player.x, this.puck.z - player.z);
    const headingToGoal = this.puck.vx * Math.cos(player.angle) + this.puck.vz * Math.sin(player.angle);
    const threat = sectorDelta < player.malletHalfSector * 1.04
      && (puckRadius > ARENA_RADIUS * .39 || headingToGoal > 95);
    const canStrike = this.elapsed - player.lastStrikeAt > .34;

    if (this.elapsed < brain.retreatUntil) {
      brain.state = "retreat";
      const retreatAngle = player.angle + brain.guardOffset * 1.35;
      const retreatRadius = ARENA_RADIUS * randomBetween(.6, .7);
      this.setCpuTarget(player, Math.cos(retreatAngle) * retreatRadius, Math.sin(retreatAngle) * retreatRadius, "接触後に退避");
      return;
    }

    if (this.elapsed < brain.reactionAt) return;
    if (this.elapsed >= brain.decisionAt) {
      brain.decisionAt = this.elapsed + randomBetween(.17, .46);
      brain.reactionAt = this.elapsed + randomBetween(.055, .19);

      if (distanceToPuck < 128 && canStrike) {
        const targetOpponent = this.chooseTargetOpponent(player);
        brain.targetOpponent = targetOpponent.index;
        const tactic = Math.random();
        brain.state = tactic < brain.bankPreference ? "bank" : tactic < brain.bankPreference + brain.feintPreference ? "feint" : "strike";
        brain.feintSide = Math.random() < .5 ? -1 : 1;
        brain.shotAngleBias = randomBetween(-.3, .3);
      } else if (threat) {
        brain.state = Math.random() < brain.caution ? "intercept" : "counter";
      } else if (puckRadius < ARENA_RADIUS * .32 && Math.random() < brain.aggression * .58) {
        brain.state = "read";
      } else {
        brain.state = "guard";
        if (Math.random() < .56) {
          brain.guardOffset = randomBetween(-.17, .17);
          brain.guardRadius = randomBetween(.5, .67);
        }
      }
    }

    const predictTime = randomBetween(.12, .25);
    const predictedX = this.puck.x + this.puck.vx * predictTime;
    const predictedZ = this.puck.z + this.puck.vz * predictTime;
    if (brain.state === "strike" || brain.state === "bank" || brain.state === "feint") {
      const opponent = this.players[brain.targetOpponent] || this.chooseTargetOpponent(player);
      let aimAngle = opponent.angle + brain.shotAngleBias * GOAL_HALF_ANGLE;
      if (brain.state === "bank") aimAngle += brain.feintSide * randomBetween(.42, .62);
      const aimX = Math.cos(aimAngle) * (ARENA_RADIUS + 40);
      const aimZ = Math.sin(aimAngle) * (ARENA_RADIUS + 40);
      let shotX = aimX - this.puck.x;
      let shotZ = aimZ - this.puck.z;
      const shotLength = Math.hypot(shotX, shotZ) || 1;
      shotX /= shotLength;
      shotZ /= shotLength;
      const staging = distanceToPuck > 62 ? 54 : -9;
      const sideStep = brain.state === "feint" ? 44 * brain.feintSide : 0;
      const targetX = this.puck.x - shotX * staging - shotZ * sideStep;
      const targetZ = this.puck.z - shotZ * staging + shotX * sideStep;
      this.setCpuTarget(player, targetX, targetZ, brain.state === "bank" ? "壁反射を選択" : brain.state === "feint" ? "フェイント接近" : `相手${opponent.index + 1}を狙う`);
      if (brain.state === "feint" && distanceToPuck < 78 && this.elapsed >= brain.decisionAt - .08) {
        brain.state = "strike";
        brain.decisionAt = this.elapsed + randomBetween(.1, .22);
      }
    } else if (brain.state === "intercept" || brain.state === "counter") {
      const blend = brain.state === "counter" ? .96 : .78;
      const homeX = Math.cos(player.angle) * ARENA_RADIUS * .63;
      const homeZ = Math.sin(player.angle) * ARENA_RADIUS * .63;
      this.setCpuTarget(player, predictedX * blend + homeX * (1 - blend), predictedZ * blend + homeZ * (1 - blend), brain.state === "counter" ? "迎撃" : "守備予測");
    } else if (brain.state === "read") {
      const readX = predictedX * .72 + Math.cos(player.angle) * ARENA_RADIUS * .28;
      const readZ = predictedZ * .72 + Math.sin(player.angle) * ARENA_RADIUS * .28;
      this.setCpuTarget(player, readX, readZ, "中央の流れを読む");
    } else {
      const guardAngle = player.angle + brain.guardOffset;
      const guardRadius = ARENA_RADIUS * brain.guardRadius;
      this.setCpuTarget(player, Math.cos(guardAngle) * guardRadius, Math.sin(guardAngle) * guardRadius, "守備位置を変更");
    }
  }

  setCpuTarget(player, x, z, label) {
    const constrained = this.constrainToSector(player, x, z);
    player.targetX = constrained.x;
    player.targetZ = constrained.z;
    player.brain.lastDecision = label;
  }

  chooseTargetOpponent(player) {
    const candidates = this.players.filter(other => other.active && other.index !== player.index);
    if (!candidates.length) return player;
    if (candidates.length === 1) return candidates[0];
    const counts = this.territoryCounts();
    const weighted = candidates.flatMap(other => Array.from({ length: Math.max(1, 1 + counts[other.index]) }, () => other));
    return choose(weighted);
  }

  moveMallet(player, dt) {
    if (!player.active) {
      player.activeMalletAbilityEffects = [];
      player.vx *= .88;
      player.vz *= .88;
      return;
    }
    const toX = player.targetX - player.x;
    const toZ = player.targetZ - player.z;
    const distance = Math.hypot(toX, toZ);
    const profileTuning = player.abilityProfile.tuning;
    const baseMaxSpeed = player.index === 0 ? PLAYER_MALLET_MAX_SPEED : MALLET_MAX_SPEED;
    const response = player.index === 0 ? PLAYER_MALLET_RESPONSE : MALLET_RESPONSE;
    const baseAcceleration = player.index === 0 ? PLAYER_MALLET_ACCELERATION : MALLET_ACCELERATION;
    const normalX = Math.cos(player.angle);
    const normalZ = Math.sin(player.angle);
    const currentGoalProjection = player.x * normalX + player.z * normalZ;
    const targetGoalProjection = player.targetX * normalX + player.targetZ * normalZ;
    const recovering = profileTuning.malletRecovery > 1
      && this.elapsed - player.lastStrikeAt <= 1.35
      && targetGoalProjection > currentGoalProjection + 2;
    const maxSpeed = baseMaxSpeed * (recovering ? profileTuning.malletRecovery : 1);
    const desiredSpeed = clamp(distance * response, 0, maxSpeed);
    const desiredX = distance > .001 ? toX / distance * desiredSpeed : 0;
    const desiredZ = distance > .001 ? toZ / distance * desiredSpeed : 0;
    const currentSpeed = Math.hypot(player.vx, player.vz);
    const desiredVectorSpeed = Math.hypot(desiredX, desiredZ);
    const velocityAlignment = currentSpeed > .001 && desiredVectorSpeed > .001
      ? (player.vx * desiredX + player.vz * desiredZ) / (currentSpeed * desiredVectorSpeed)
      : 1;
    const braking = profileTuning.malletBrake > 1
      && currentSpeed > 40
      && (desiredSpeed < currentSpeed * .72 || velocityAlignment < .2);
    const accelerationMultiplier = Math.max(
      braking ? profileTuning.malletBrake : 1,
      recovering ? profileTuning.malletRecovery : 1
    );
    const acceleration = baseAcceleration * accelerationMultiplier;
    player.activeMalletAbilityEffects = [
      ...(braking ? ["マレットのブレーキ強化"] : []),
      ...(recovering ? ["マレットの復帰加速"] : [])
    ];
    const delta = setVectorLength(desiredX - player.vx, desiredZ - player.vz, acceleration * dt);
    player.vx += delta.x;
    player.vz += delta.z;
    const nextX = player.x + player.vx * dt;
    const nextZ = player.z + player.vz * dt;
    const nextToX = player.targetX - nextX;
    const nextToZ = player.targetZ - nextZ;
    const humanControlActive = player.index === 0 && (this.dragging || this.keyState.size > 0);
    const crossedTarget = distance > .001 && toX * nextToX + toZ * nextToZ <= 0;
    if (humanControlActive && (distance <= .12 || crossedTarget)) {
      player.x = player.targetX;
      player.z = player.targetZ;
      player.vx = 0;
      player.vz = 0;
    } else {
      player.x = nextX;
      player.z = nextZ;
    }
    const constrained = this.constrainToSector(player, player.x, player.z);
    if (Math.hypot(constrained.x - player.x, constrained.z - player.z) > .1) {
      player.vx *= .45;
      player.vz *= .45;
    }
    player.x = constrained.x;
    player.z = constrained.z;
  }

  effectiveKeeperTuning(player) {
    const profileTuning = player.abilityProfile.tuning;
    let response = profileTuning.keeperResponse;
    let acceleration = profileTuning.keeperAcceleration;
    let topSpeed = profileTuning.keeperTopSpeed * profileTuning.keeperLateral;
    const activeSituationalAbilities = [];

    if (this.elapsed < player.centerTurntableResistanceUntil) {
      response *= profileTuning.turntableResistance;
      acceleration *= profileTuning.turntableResistance;
      activeSituationalAbilities.push("回転盤耐性");
    }
    if (this.elapsed < player.consecutiveGoalGuardUntil) {
      response *= profileTuning.consecutiveGoalGuard;
      acceleration *= profileTuning.consecutiveGoalGuard;
      topSpeed *= profileTuning.consecutiveGoalGuard;
      activeSituationalAbilities.push("連続失点ガード");
    }
    if (
      this.running
      && player.active
      && profileTuning.noTouchResponse > 1
      && this.elapsed - player.lastPuckTouchAt >= NO_TOUCH_RESPONSE_SECONDS
    ) {
      response *= profileTuning.noTouchResponse;
      acceleration *= profileTuning.noTouchResponse;
      activeSituationalAbilities.push("ノータッチ反応");
    }
    return {
      response: KEEPER_RESPONSE * response,
      acceleration: KEEPER_ACCELERATION * acceleration,
      topSpeed: KEEPER_MAX_SPEED * topSpeed,
      powerReturn: profileTuning.powerReturn,
      activeSituationalAbilities
    };
  }

  keeperTrackingPlan(player, puck = this.puck) {
    const normalX = Math.cos(player.angle);
    const normalZ = Math.sin(player.angle);
    const tangentX = -normalZ;
    const tangentZ = normalX;
    const puckRadial = puck.x * normalX + puck.z * normalZ;
    const puckTangent = puck.x * tangentX + puck.z * tangentZ;
    const puckRadialVelocity = puck.vx * normalX + puck.vz * normalZ;
    const puckTangentVelocity = puck.vx * tangentX + puck.vz * tangentZ;
    const puckAngle = Math.atan2(puck.z, puck.x);
    const sectorDelta = Math.abs(angleDifference(puckAngle, player.angle));
    const keeperTravel = clamp(Number(player.keeperTravel ?? KEEPER_TRAVEL), 0, KEEPER_TRAVEL);
    const movingGoalward = puckRadialVelocity > 1;
    const secondsToKeeperPath = movingGoalward
      ? (KEEPER_PATH_RADIUS - puckRadial) / puckRadialVelocity
      : Infinity;
    const interceptSeconds = movingGoalward
      ? clamp(secondsToKeeperPath, 0, KEEPER_INTERCEPT_LOOKAHEAD_MAX_SECONDS)
      : .12;
    const projectedTangent = puckTangent + puckTangentVelocity * interceptSeconds;
    const goalwardThreat = movingGoalward
      && puckRadial > KEEPER_TRACK_MIN_RADIAL
      && secondsToKeeperPath <= KEEPER_GOAL_THREAT_LOOKAHEAD_SECONDS
      && Math.abs(projectedTangent) <= GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH + PUCK_RADIUS;
    const insideDefensiveSector = puckRadial > ARENA_RADIUS * .12
      && sectorDelta < MALLET_HALF_SECTOR * .92;
    const shouldTrack = player.active && puck.visible && this.serveTimer <= 0
      && (goalwardThreat || insideDefensiveSector);

    return {
      shouldTrack,
      goalwardThreat,
      targetOffset: shouldTrack
        ? clamp(projectedTangent, -keeperTravel, keeperTravel)
        : 0,
      projectedTangent,
      secondsToKeeperPath,
      keeperTravel
    };
  }

  updateKeepers(dt) {
    this.players.forEach(player => {
      const abilityTuning = this.effectiveKeeperTuning(player);
      player.activeKeeperAbilityEffects = abilityTuning.activeSituationalAbilities;
      const normalX = Math.cos(player.angle);
      const normalZ = Math.sin(player.angle);
      const tangentX = -normalZ;
      const tangentZ = normalX;
      const tracking = this.keeperTrackingPlan(player);
      const keeperTravel = tracking.keeperTravel;
      player.keeperTracking = tracking;
      player.keeperTargetOffset = tracking.targetOffset;

      const desiredVelocity = clamp(
        (player.keeperTargetOffset - player.keeperOffset) * abilityTuning.response,
        -abilityTuning.topSpeed,
        abilityTuning.topSpeed
      );
      const velocityDelta = clamp(
        desiredVelocity - player.keeperVelocity,
        -abilityTuning.acceleration * dt,
        abilityTuning.acceleration * dt
      );
      player.keeperVelocity += velocityDelta;
      player.keeperOffset += player.keeperVelocity * dt;
      const constrainedOffset = clamp(player.keeperOffset, -keeperTravel, keeperTravel);
      if (constrainedOffset !== player.keeperOffset) player.keeperVelocity *= .2;
      player.keeperOffset = constrainedOffset;
      player.keeperX = normalX * KEEPER_PATH_RADIUS + tangentX * player.keeperOffset;
      player.keeperZ = normalZ * KEEPER_PATH_RADIUS + tangentZ * player.keeperOffset;
      player.keeperVx = tangentX * player.keeperVelocity;
      player.keeperVz = tangentZ * player.keeperVelocity;
    });
    this.updateKeeperTelemetry();
  }

  malletOuterRadius(player, angle) {
    const outwardProjection = Math.cos(angleDifference(angle, player.angle));
    if (outwardProjection <= 0) return player.malletMaxRadius;
    return Math.min(player.malletMaxRadius, player.malletGoalSideMaxProjection / outwardProjection);
  }

  constrainToSector(player, x, z) {
    let radius = Math.hypot(x, z);
    let angle = radius > .001 ? Math.atan2(z, x) : player.angle;
    const difference = clamp(
      angleDifference(angle, player.angle),
      -player.malletHalfSector,
      player.malletHalfSector
    );
    angle = player.angle + difference;
    radius = clamp(radius, player.malletMinRadius, this.malletOuterRadius(player, angle));
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  integratePuck(dt) {
    this.puck.x += this.puck.vx * dt;
    this.puck.z += this.puck.vz * dt;
    // An air table must preserve momentum. The former prototype lost roughly
    // half its speed every second and left the CPUs waiting around a dead puck.
    const damping = Math.pow(.99915, dt * 120);
    this.puck.vx *= damping;
    this.puck.vz *= damping;
    const speed = Math.hypot(this.puck.vx, this.puck.vz);
    if (speed > MAX_PUCK_SPEED) {
      this.puck.vx *= MAX_PUCK_SPEED / speed;
      this.puck.vz *= MAX_PUCK_SPEED / speed;
    }
    if (this.serveGrace > 0) {
      this.serveGrace = Math.max(0, this.serveGrace - dt);
      return;
    }
    if (speed < 155 && this.serveTimer <= 0) {
      const nudge = 54 * dt;
      const angle = Math.atan2(this.puck.vz || .1, this.puck.vx || .1);
      this.puck.vx += Math.cos(angle) * nudge;
      this.puck.vz += Math.sin(angle) * nudge;
    }
  }

  resolveMalletCollisions() {
    for (const player of this.players) {
      if (!player.active) continue;
      const dx = this.puck.x - player.x;
      const dz = this.puck.z - player.z;
      const distance = Math.hypot(dx, dz);
      const minimum = PUCK_RADIUS + MALLET_RADIUS;
      if (distance >= minimum) continue;
      const nx = distance > .001 ? dx / distance : Math.cos(player.angle + Math.PI);
      const nz = distance > .001 ? dz / distance : Math.sin(player.angle + Math.PI);
      const overlap = minimum - distance;
      this.puck.x += nx * (overlap + .7);
      this.puck.z += nz * (overlap + .7);
      const relative = (this.puck.vx - player.vx) * nx + (this.puck.vz - player.vz) * nz;
      const repeated = this.puck.lastHitBy === player.index && this.elapsed - this.puck.lastHitAt < .085;
      if (relative < 0 && !repeated) {
        const softStart = this.serveSoftWindow > 0;
        const smashAssist = player.abilityProfile.tuning.smashAssist;
        const malletSpeed = Math.hypot(player.vx, player.vz);
        const normalDriveSpeed = player.vx * nx + player.vz * nz;
        const alignment = malletSpeed > .001 ? normalDriveSpeed / malletSpeed : 0;
        const closingSpeed = -relative;
        const smash = !softStart
          && malletSpeed >= MALLET_SMASH_MIN_SPEED / smashAssist
          && alignment >= MALLET_SMASH_MIN_ALIGNMENT / smashAssist
          && closingSpeed >= MALLET_SMASH_MIN_CLOSING_SPEED / smashAssist;
        const restitution = smash
          ? MALLET_SMASH_RESTITUTION * smashAssist
          : MALLET_RESTITUTION;
        const collisionMultiplier = softStart ? .76 : 1 + restitution;
        const impulse = (-collisionMultiplier * relative) + Math.max(0, malletSpeed * (softStart ? .08 : .18));
        this.puck.vx += nx * impulse + player.vx * (softStart ? .16 : .43);
        this.puck.vz += nz * impulse + player.vz * (softStart ? .16 : .43);
        this.puck.lastHitAt = this.elapsed;
        this.puck.lastHitBy = player.index;
        this.recordPuckTouch(player);
        player.lastStrikeAt = this.elapsed;
        if (player.brain) {
          player.brain.retreatUntil = this.elapsed + randomBetween(.34, .68);
          player.brain.guardOffset = randomBetween(-.18, .18);
          player.brain.state = "retreat";
          player.brain.lastDecision = "打撃後ドリブル防止退避";
        }
        if (smash) this.triggerSmashBurn(player, malletSpeed, closingSpeed);
        this.impact(player, this.puck.x, this.puck.z, smash);
      }
    }
  }

  activeGoalRouteForPlayer(player, puck = this.puck) {
    const routes = [puck.goalPostCapture, puck.goalCornerApproach];
    return routes.find(route => (
      route?.playerIndex === player.index
      && this.elapsed <= route.until
    )) || null;
  }

  keeperProtectedGoalRouteForPlayer(player, puck = this.puck) {
    const route = this.activeGoalRouteForPlayer(player, puck);
    if (!route) return null;
    if (route === puck.goalPostCapture || route.routeType === "inner-post") return route;
    return null;
  }

  hasActiveGoalRoute(puck = this.puck) {
    return this.players.some(player => player.active && this.activeGoalRouteForPlayer(player, puck));
  }

  cancelGoalCornerApproach(puck, reason, emitEffects = puck === this.puck) {
    if (!puck.goalCornerApproach) return false;
    puck.goalCornerApproach = null;
    puck.goalCornerApproachBlockedUntil = this.elapsed + GOAL_CORNER_APPROACH_RETRY_BLOCK_SECONDS;
    if (emitEffects) {
      this.goalCornerApproachRecoveryCount += 1;
      this.root.dataset.itl3GoalCornerApproachLastRecovery = reason;
      this.updateGoalPhysicsTelemetry();
    }
    return true;
  }

  goalCornerApproachValidity(player, puck, approach) {
    const state = this.goalPassageState(player, puck);
    const localLateralVelocity = puck.vx * state.tangentX + puck.vz * state.tangentZ;
    const secondsToScore = Math.max(0, GOAL_SCORE_RADIAL - state.radial)
      / Math.max(state.radialVelocity, 1);
    const projectedLateralAtScore = state.lateral + localLateralVelocity * secondsToScore;
    const projectedInsideClearGoal = Math.abs(projectedLateralAtScore) <= (
      GOAL_PUCK_CENTER_HALF_WIDTH + GOAL_CLEAR_MOUTH_PROJECTION_EPSILON
    );
    const insideGoalCorridor = Math.abs(state.lateral) <= GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH;
    const movingGoalward = state.radialVelocity > 0;
    const passedPostCollisionEnvelope = state.radial > GOAL_POST_ROUTE_MISS_GUARD_RADIAL;

    let reason = "valid";
    if (!player?.active || this.elapsed > approach.until) reason = "inactive-or-expired";
    else if (!movingGoalward) reason = "no-longer-goalward";
    else if (!insideGoalCorridor) reason = "outside-goal-corridor";
    else if (approach.routeType === "clear-mouth" && !projectedInsideClearGoal) reason = "clear-mouth-ray-missed";
    else if (approach.routeType === "inner-post" && passedPostCollisionEnvelope) reason = "inner-post-missed";

    return {
      valid: reason === "valid",
      reason,
      state,
      projectedLateralAtScore,
      projectedInsideClearGoal,
      insideGoalCorridor,
      passedPostCollisionEnvelope
    };
  }

  commitVisibleGoalCornerApproach(puck = this.puck, emitEffects = puck === this.puck) {
    if (this.hasActiveGoalRoute(puck)) return puck.goalPostCapture || puck.goalCornerApproach;
    if (puck.goalCornerApproach && this.elapsed > puck.goalCornerApproach.until) {
      this.cancelGoalCornerApproach(puck, "expired-before-recommit", emitEffects);
    }
    if ((puck.goalCornerApproachBlockedUntil || 0) > this.elapsed) return null;
    const arenaDistance = Math.hypot(puck.x, puck.z);
    if (arenaDistance < ARENA_RADIUS - PUCK_RADIUS - 1) return null;

    for (const player of this.players) {
      if (!player.active) continue;
      const coordinates = this.goalCoordinates(player, puck);
      const absoluteLateral = Math.abs(coordinates.lateral);
      if (absoluteLateral > GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH || coordinates.radial <= 0 || coordinates.radialVelocity <= 0) continue;

      const side = Math.sign(coordinates.lateral) || 1;
      const incomingSpeed = Math.hypot(puck.vx, puck.vz);
      const radialRatio = coordinates.radialVelocity / Math.max(incomingSpeed, 1);
      if (radialRatio < GOAL_CORNER_APPROACH_MIN_RADIAL_RATIO) continue;
      const localLateralVelocity = puck.vx * coordinates.tangentX + puck.vz * coordinates.tangentZ;
      const secondsToPost = Math.max(0, GOAL_POST_FRONT_RADIAL - coordinates.radial) / coordinates.radialVelocity;
      const secondsToScore = Math.max(0, GOAL_SCORE_RADIAL - coordinates.radial) / coordinates.radialVelocity;
      const projectedLateralAtPost = coordinates.lateral + localLateralVelocity * secondsToPost;
      const projectedLateralAtScore = coordinates.lateral + localLateralVelocity * secondsToScore;
      const projectedInsideClearGoal = Math.abs(projectedLateralAtScore) <= (
        GOAL_PUCK_CENTER_HALF_WIDTH + GOAL_CLEAR_MOUTH_PROJECTION_EPSILON
      );
      const orientedProjectedPost = side * projectedLateralAtPost;
      const projectedToInnerPost = (
        orientedProjectedPost >= GOAL_PUCK_CENTER_HALF_WIDTH - GOAL_POST_PROJECTED_SCORE_TOLERANCE
        && orientedProjectedPost <= GOAL_POST_CENTER_HALF_WIDTH
      );
      // Position alone must never pull a puck into goal. Preserve the exact
      // incoming velocity and open the circular boundary only when that ray
      // naturally reaches either the clear goal mouth or the inner post face.
      if (!projectedInsideClearGoal && !projectedToInnerPost) continue;
      const routeType = projectedInsideClearGoal ? "clear-mouth" : "inner-post";
      const approachDuration = clamp(
        (GOAL_LIVE_ENTRY_TARGET_RADIAL - coordinates.radial) / coordinates.radialVelocity + .3,
        .35,
        GOAL_CORNER_APPROACH_SECONDS
      );
      puck.goalCornerApproach = {
        playerIndex: player.index,
        side,
        until: this.elapsed + approachDuration,
        startRadial: coordinates.radial,
        routeType,
        projectedLateralAtPost,
        projectedLateralAtScore,
        incomingVx: puck.vx,
        incomingVz: puck.vz,
        keeperBypassed: false
      };
      if (emitEffects) {
        this.goalCornerApproachCount += 1;
        this.root.dataset.itl3GoalCornerApproachLastPlayer = String(player.index);
        this.root.dataset.itl3GoalCornerApproachLastSide = String(side);
        this.root.dataset.itl3GoalCornerApproachLastRoute = routeType;
        this.updateGoalPhysicsTelemetry();
      }
      return puck.goalCornerApproach;
    }
    return null;
  }

  resolveKeeperCollisions() {
    for (const player of this.players) {
      if (!player.active) continue;
      const dx = this.puck.x - player.keeperX;
      const dz = this.puck.z - player.keeperZ;
      const distance = Math.hypot(dx, dz);
      const minimum = PUCK_RADIUS + KEEPER_COLLIDER_RADIUS;
      if (distance >= minimum) continue;
      // Once the puck has visibly grazed the inside of this player's post, it
      // is already on the net-side route. Do not let the overlapping keeper
      // collider retroactively turn that accepted post contact into a save.
      const protectedRoute = this.keeperProtectedGoalRouteForPlayer(player, this.puck);
      if (protectedRoute) {
        if (!protectedRoute.keeperBypassed) {
          protectedRoute.keeperBypassed = true;
          this.goalPostKeeperBypassCount += 1;
          this.updateGoalPhysicsTelemetry();
        }
        continue;
      }
      const nx = distance > .001 ? dx / distance : Math.cos(player.angle + Math.PI);
      const nz = distance > .001 ? dz / distance : Math.sin(player.angle + Math.PI);
      const overlap = minimum - distance;
      this.puck.x += nx * (overlap + .7);
      this.puck.z += nz * (overlap + .7);
      const relative = (this.puck.vx - player.keeperVx) * nx + (this.puck.vz - player.keeperVz) * nz;
      const repeated = this.elapsed - player.keeperLastHitAt < .11;
      if (relative >= 0 || repeated) continue;

      // The keeper returns the configured share of the mallet's normal rebound
      // and receives the same share of the mallet velocity transfer.
      const powerReturn = player.abilityProfile.tuning.powerReturn;
      const keeperRestitution = KEEPER_RESTITUTION * powerReturn;
      const keeperVelocityTransfer = KEEPER_VELOCITY_TRANSFER * powerReturn;
      const impulse = -(1 + keeperRestitution) * relative;
      this.puck.vx += nx * impulse + player.keeperVx * keeperVelocityTransfer;
      this.puck.vz += nz * impulse + player.keeperVz * keeperVelocityTransfer;
      const speed = Math.hypot(this.puck.vx, this.puck.vz);
      if (speed > MAX_PUCK_SPEED) {
        this.puck.vx *= MAX_PUCK_SPEED / speed;
        this.puck.vz *= MAX_PUCK_SPEED / speed;
      }
      player.keeperLastHitAt = this.elapsed;
      player.keeperHitCount += 1;
      this.puck.lastHitAt = this.elapsed;
      this.puck.lastHitBy = player.index;
      this.recordPuckTouch(player);
      this.updateKeeperTelemetry(true);
      this.keeperImpact(player, this.puck.x, this.puck.z);
    }
  }

  keeperCollisionSuppressedByGoalPostCapture(player, puck = this.puck) {
    return Boolean(this.keeperProtectedGoalRouteForPlayer(player, puck));
  }

  goalCoordinates(player, puck = this.puck) {
    const normalX = Math.cos(player.angle);
    const normalZ = Math.sin(player.angle);
    const tangentX = -normalZ;
    const tangentZ = normalX;
    return {
      normalX,
      normalZ,
      tangentX,
      tangentZ,
      radial: puck.x * normalX + puck.z * normalZ,
      lateral: puck.x * tangentX + puck.z * tangentZ,
      radialVelocity: puck.vx * normalX + puck.vz * normalZ
    };
  }

  goalPassageState(player, puck = this.puck) {
    const coordinates = this.goalCoordinates(player, puck);
    const insideClearMouth = Math.abs(coordinates.lateral) <= GOAL_PUCK_CENTER_HALF_WIDTH;
    const crossedScoreLine = coordinates.radial >= GOAL_SCORE_RADIAL;
    const movingIntoGoal = coordinates.radialVelocity > 0;
    return {
      ...coordinates,
      insideClearMouth,
      crossedScoreLine,
      movingIntoGoal,
      isGoal: insideClearMouth && crossedScoreLine && movingIntoGoal
    };
  }

  goalPostCaptureDirection(player, puck, targetLateral, targetRadial = GOAL_LIVE_ENTRY_TARGET_RADIAL) {
    const coordinates = this.goalCoordinates(player, puck);
    const radialDistance = Math.max(
      PUCK_RADIUS,
      targetRadial - coordinates.radial
    );
    const lateralPerRadial = (targetLateral - coordinates.lateral) / radialDistance;
    const directionScale = 1 / Math.hypot(1, lateralPerRadial);
    return {
      coordinates,
      localLateral: lateralPerRadial * directionScale,
      localRadial: directionScale
    };
  }

  steerPuckWithinGoalPostCapture(player, puck, capture, dt = FIXED_STEP) {
    const target = this.goalPostCaptureDirection(player, puck, capture.targetLateral, capture.targetRadial);
    const currentLateralVelocity = puck.vx * target.coordinates.tangentX + puck.vz * target.coordinates.tangentZ;
    const currentRadialVelocity = puck.vx * target.coordinates.normalX + puck.vz * target.coordinates.normalZ;
    const currentSpeed = Math.hypot(currentLateralVelocity, currentRadialVelocity);
    const safeSpeed = Math.max(currentSpeed, GOAL_POST_INNER_CAPTURE_MIN_SPEED);
    const currentLocalLateral = currentLateralVelocity / Math.max(currentSpeed, 1);
    const currentLocalRadial = Math.max(.06, currentRadialVelocity / Math.max(currentSpeed, 1));
    const captureDistance = Math.max(
      PUCK_RADIUS * 2,
      GOAL_SCORE_RADIAL + GOAL_POST_SCORE_TOLERANCE - capture.startRadial
    );
    const captureProgress = clamp(
      (target.coordinates.radial - capture.startRadial) / captureDistance,
      0,
      1
    );
    const easedProgress = captureProgress * captureProgress * (3 - 2 * captureProgress);
    const steerResponse = THREE.MathUtils.lerp(
      GOAL_POST_INNER_CAPTURE_STEER_RESPONSE,
      GOAL_POST_INNER_CAPTURE_STEER_RESPONSE_MAX,
      easedProgress
    );
    const blend = 1 - Math.exp(-steerResponse * dt);
    let localLateral = THREE.MathUtils.lerp(currentLocalLateral, target.localLateral, blend);
    let localRadial = THREE.MathUtils.lerp(currentLocalRadial, target.localRadial, blend);
    let directionLength = Math.hypot(localLateral, localRadial) || 1;
    localLateral /= directionLength;
    localRadial /= directionLength;

    // An accepted inner-post graze is a one-way route into the net. In the old
    // progressive-steer version, a lateral component aimed back at the same
    // post survived for several frames and visibly sent the puck keeperward.
    // Remove only that wrong-way component; retain centreward motion so the
    // contact still reads as a light, physical change of angle.
    if (capture.side * localLateral > 0) localLateral = 0;
    if (localRadial < GOAL_POST_INNER_CAPTURE_MIN_RADIAL_RATIO) {
      localRadial = GOAL_POST_INNER_CAPTURE_MIN_RADIAL_RATIO;
      const lateralMagnitude = Math.sqrt(Math.max(0, 1 - localRadial * localRadial));
      localLateral = Math.sign(localLateral || -capture.side) * lateralMagnitude;
    }
    directionLength = Math.hypot(localLateral, localRadial) || 1;
    localLateral /= directionLength;
    localRadial /= directionLength;
    const guidedSpeed = Math.min(MAX_PUCK_SPEED, safeSpeed);

    puck.vx = (target.coordinates.tangentX * localLateral + target.coordinates.normalX * localRadial) * guidedSpeed;
    puck.vz = (target.coordinates.tangentZ * localLateral + target.coordinates.normalZ * localRadial) * guidedSpeed;
  }

  guidePuckFromInnerGoalPost(player, side, puck, coordinates, overlap) {
    const incomingSpeed = Math.hypot(puck.vx, puck.vz);
    const inwardX = coordinates.tangentX * -side;
    const inwardZ = coordinates.tangentZ * -side;
    // Slide only by the actual contact overlap. The puck remains visibly in
    // contact with the post, but is released from its inner half toward the net.
    const inwardSeparation = overlap + GOAL_POST_COLLISION_SLOP;
    puck.x += inwardX * inwardSeparation;
    puck.z += inwardZ * inwardSeparation;

    const adjusted = this.goalCoordinates(player, puck);
    // Keep the route near the same goal corner. The previous centreward target
    // could visually resemble a return toward the keeper even while its radial
    // component was positive.
    const targetLateral = side * GOAL_PUCK_CENTER_HALF_WIDTH * GOAL_POST_INNER_CAPTURE_TARGET_RATIO;
    const targetRadial = GOAL_LIVE_ENTRY_TARGET_RADIAL;
    const target = this.goalPostCaptureDirection(player, puck, targetLateral, targetRadial);
    const currentLateralVelocity = puck.vx * adjusted.tangentX + puck.vz * adjusted.tangentZ;
    const currentRadialVelocity = puck.vx * adjusted.normalX + puck.vz * adjusted.normalZ;
    const currentLocalLateral = currentLateralVelocity / Math.max(incomingSpeed, 1);
    const currentLocalRadial = Math.max(.04, currentRadialVelocity / Math.max(incomingSpeed, 1));
    let localLateral = THREE.MathUtils.lerp(
      currentLocalLateral,
      target.localLateral,
      GOAL_POST_INNER_CAPTURE_ENTRY_BLEND
    );
    let localRadial = THREE.MathUtils.lerp(
      currentLocalRadial,
      target.localRadial,
      GOAL_POST_INNER_CAPTURE_ENTRY_BLEND
    );
    // Do not carry a same-post/outward component into the protected route. It
    // was the direct cause of inner contacts returning toward the keeper.
    if (side * localLateral > 0) localLateral = 0;
    let directionLength = Math.hypot(localLateral, localRadial) || 1;
    localLateral /= directionLength;
    localRadial /= directionLength;
    if (localRadial < GOAL_POST_INNER_CAPTURE_MIN_RADIAL_RATIO) {
      localRadial = GOAL_POST_INNER_CAPTURE_MIN_RADIAL_RATIO;
      const lateralMagnitude = Math.sqrt(Math.max(0, 1 - localRadial * localRadial));
      localLateral = Math.sign(localLateral || -side) * lateralMagnitude;
      directionLength = Math.hypot(localLateral, localRadial) || 1;
      localLateral /= directionLength;
      localRadial /= directionLength;
    }
    const guidedSpeed = Math.min(
      MAX_PUCK_SPEED,
      Math.max(GOAL_POST_INNER_CAPTURE_MIN_SPEED, incomingSpeed * GOAL_POST_INNER_CAPTURE_SPEED_RETENTION)
    );

    // A light inner-post clip should look like a real graze: preserve most of
    // the incoming direction now, then bend it progressively toward the net.
    // This avoids the old instant ricochet toward the keeper/field center.
    puck.vx = (adjusted.tangentX * localLateral + adjusted.normalX * localRadial) * guidedSpeed;
    puck.vz = (adjusted.tangentZ * localLateral + adjusted.normalZ * localRadial) * guidedSpeed;
    puck.goalCornerApproach = null;
    puck.goalPostCapture = {
      playerIndex: player.index,
      side,
      until: this.elapsed + GOAL_POST_INNER_CAPTURE_SECONDS,
      targetLateral,
      targetRadial,
      startRadial: adjusted.radial,
      keeperBypassed: false
    };
  }

  goalPostReflectionNormal(side, localNormalLateral, localNormalRadial) {
    // Rotate the remaining rebound surface slightly toward the goal mouth.
    // On the front this means "front -> inner"; on the outside it means
    // "outside -> front". The adjustment is continuous, so there is no hard
    // seam where a one-pixel contact suddenly changes to a different bounce.
    if (localNormalRadial > 0) {
      return { localLateral: localNormalLateral, localRadial: localNormalRadial, shifted: false };
    }
    const orientedLateral = side * localNormalLateral;
    const contactAngle = Math.atan2(orientedLateral, -localNormalRadial);
    const shiftedAngle = clamp(
      contactAngle - GOAL_POST_REFLECTION_INWARD_SHIFT,
      -Math.PI / 2,
      Math.PI / 2
    );
    return {
      localLateral: side * Math.sin(shiftedAngle),
      localRadial: -Math.cos(shiftedAngle),
      shifted: true,
      contactAngle,
      shiftedAngle
    };
  }

  resolvePuckAgainstGoalPost(player, puck = this.puck, emitEffects = puck === this.puck) {
    const coordinates = this.goalCoordinates(player, puck);
    const activeCapture = puck.goalPostCapture;
    if (activeCapture?.playerIndex === player.index && this.elapsed <= activeCapture.until) return null;
    if (activeCapture && this.elapsed > activeCapture.until) puck.goalPostCapture = null;
    const combinedRadius = PUCK_RADIUS + GOAL_POST_HALF_THICKNESS;
    if (Math.abs(coordinates.radial - GOAL_POST_FRONT_RADIAL) >= combinedRadius) return null;

    for (const side of [-1, 1]) {
      const postCenter = side * GOAL_POST_PHYSICS_CENTER_HALF_WIDTH;
      const lateralDelta = coordinates.lateral - postCenter;
      const radialDelta = coordinates.radial - GOAL_POST_FRONT_RADIAL;
      const distanceSquared = lateralDelta * lateralDelta + radialDelta * radialDelta;
      if (distanceSquared >= combinedRadius * combinedRadius) continue;

      let localNormalLateral;
      let localNormalRadial;
      let distance;
      if (distanceSquared > .000001) {
        distance = Math.sqrt(distanceSquared);
        localNormalLateral = lateralDelta / distance;
        localNormalRadial = radialDelta / distance;
      } else {
        distance = 0;
        localNormalLateral = -side;
        localNormalRadial = 0;
      }
      const overlap = combinedRadius - distance;

      const worldNormalX = coordinates.tangentX * localNormalLateral + coordinates.normalX * localNormalRadial;
      const worldNormalZ = coordinates.tangentZ * localNormalLateral + coordinates.normalZ * localNormalRadial;
      const incomingNormalSpeed = puck.vx * worldNormalX + puck.vz * worldNormalZ;
      const innerFace = side * localNormalLateral < 0;
      const localLateralVelocity = puck.vx * coordinates.tangentX + puck.vz * coordinates.tangentZ;
      const orientedLateralVelocity = side * localLateralVelocity;
      const orientedPuckCenterLateral = side * coordinates.lateral;
      const puckGoalSideEdgeLateral = orientedPuckCenterLateral - PUCK_RADIUS;
      const visibleGoalCornerOverlap = GOAL_POST_INNER_HALF_WIDTH - puckGoalSideEdgeLateral;
      const visiblyInsideGoalCorner = visibleGoalCornerOverlap >= GOAL_POST_MIN_VISIBLE_CORNER_OVERLAP;
      const secondsToScore = Math.max(0, GOAL_SCORE_RADIAL - coordinates.radial)
        / Math.max(coordinates.radialVelocity, 1);
      const projectedLateralAtScore = coordinates.lateral + localLateralVelocity * secondsToScore;
      const projectedInsideClearGoal = Math.abs(projectedLateralAtScore) <= (
        GOAL_PUCK_CENTER_HALF_WIDTH + GOAL_POST_PROJECTED_SCORE_TOLERANCE
      );
      // A visible overlap alone is not permission to pull the puck into goal.
      // Capture only a real inward-facing collision whose incoming vector is
      // already travelling toward the mouth, or whose unchanged ray crosses
      // the clear scoring lane. Front/outside and outward-moving contacts keep
      // the ordinary physical rebound.
      const naturallyReachesInnerLane = (
        (innerFace && orientedLateralVelocity <= GOAL_POST_INWARD_VELOCITY_EPSILON)
        || projectedInsideClearGoal
      );
      const captured = (
        visiblyInsideGoalCorner
        && coordinates.radialVelocity > 0
        && incomingNormalSpeed < 0
        && naturallyReachesInnerLane
      );

      if (captured) {
        this.guidePuckFromInnerGoalPost(player, side, puck, coordinates, overlap);
      } else {
        // A rejected post contact closes the temporary goal opening at once.
        // Leaving this approach alive let the rebounding puck ignore the arena
        // wall and travel behind the outside of the goal.
        if (puck.goalCornerApproach?.playerIndex === player.index) {
          this.cancelGoalCornerApproach(puck, "post-contact-rejected", emitEffects);
        }
        puck.x += worldNormalX * (overlap + GOAL_POST_COLLISION_SLOP);
        puck.z += worldNormalZ * (overlap + GOAL_POST_COLLISION_SLOP);
        if (incomingNormalSpeed < 0) {
          const responseNormal = this.goalPostReflectionNormal(side, localNormalLateral, localNormalRadial);
          const responseWorldNormalX = coordinates.tangentX * responseNormal.localLateral
            + coordinates.normalX * responseNormal.localRadial;
          const responseWorldNormalZ = coordinates.tangentZ * responseNormal.localLateral
            + coordinates.normalZ * responseNormal.localRadial;
          const responseIncomingSpeed = puck.vx * responseWorldNormalX + puck.vz * responseWorldNormalZ;
          // The true geometric normal remains the separation authority. When a
          // very shallow graze has already crossed the adjusted normal, retain
          // a small guaranteed rebound instead of allowing post tunnelling.
          const adjustedIncomingSpeed = Math.min(responseIncomingSpeed, incomingNormalSpeed * .42);
          const impulse = -(1 + GOAL_POST_RESTITUTION) * adjustedIncomingSpeed;
          puck.vx += responseWorldNormalX * impulse;
          puck.vz += responseWorldNormalZ * impulse;
        }
      }
      const speed = Math.hypot(puck.vx, puck.vz);
      if (speed > MAX_PUCK_SPEED) {
        puck.vx *= MAX_PUCK_SPEED / speed;
        puck.vz *= MAX_PUCK_SPEED / speed;
      }
      if (emitEffects) {
        this.goalPostHitCount += 1;
        if (captured) this.goalPostInnerCaptureCount += 1;
        this.updateGoalPhysicsTelemetry();
        this.wallImpact(puck.x, puck.z);
      }
      return {
        playerIndex: player.index,
        side,
        incomingNormalSpeed,
        innerFace,
        orientedPuckCenterLateral,
        puckGoalSideEdgeLateral,
        visibleGoalCornerOverlap,
        visiblyInsideGoalCorner,
        localLateralVelocity,
        orientedLateralVelocity,
        projectedLateralAtScore,
        projectedInsideClearGoal,
        naturallyReachesInnerLane,
        captured,
        localNormalLateral,
        localNormalRadial
      };
    }
    return null;
  }

  resolveGoalPostCollisions() {
    for (const player of this.players) {
      if (!player.active) continue;
      if (this.resolvePuckAgainstGoalPost(player)) return true;
    }
    return false;
  }

  updateGoalPhysicsTelemetry() {
    if (!this.root) return;
    this.root.dataset.itl3GoalPostHits = String(this.goalPostHitCount);
    this.root.dataset.itl3GoalPostInnerCaptures = String(this.goalPostInnerCaptureCount);
    this.root.dataset.itl3GoalPostKeeperBypasses = String(this.goalPostKeeperBypassCount);
    this.root.dataset.itl3GoalCornerApproaches = String(this.goalCornerApproachCount);
    this.root.dataset.itl3GoalCornerApproachRecoveries = String(this.goalCornerApproachRecoveryCount);
    this.root.dataset.itl3GoalAccepted = String(this.goalAcceptedCount);
    this.root.dataset.itl3GoalPuckCenterHalfWidth = GOAL_PUCK_CENTER_HALF_WIDTH.toFixed(2);
    this.root.dataset.itl3GoalPostInnerPhysicsRelief = GOAL_POST_INNER_PHYSICS_RELIEF.toFixed(2);
    this.root.dataset.itl3GoalPostCollisionShape = "round-front-post";
    this.root.dataset.itl3GoalPostInnerCaptureMode = "boundary-corner-commit-physical-post-net-lane";
    this.root.dataset.itl3GoalCornerApproachMode = "natural-ray-with-post-rejection-and-outside-recovery";
    this.root.dataset.itl3GoalCornerApproachSeconds = GOAL_CORNER_APPROACH_SECONDS.toFixed(2);
    this.root.dataset.itl3GoalCornerApproachMinRadialRatio = GOAL_CORNER_APPROACH_MIN_RADIAL_RATIO.toFixed(2);
    this.root.dataset.itl3GoalPostRouteMissGuardRadial = GOAL_POST_ROUTE_MISS_GUARD_RADIAL.toFixed(2);
    this.root.dataset.itl3GoalPostMinVisibleCornerOverlap = GOAL_POST_MIN_VISIBLE_CORNER_OVERLAP.toFixed(2);
    this.root.dataset.itl3GoalPostVisibleCornerCenterHalfWidth = GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH.toFixed(2);
    this.root.dataset.itl3GoalPostReflectionInwardShiftDegrees = (GOAL_POST_REFLECTION_INWARD_SHIFT * 180 / Math.PI).toFixed(1);
    this.root.dataset.itl3GoalPostInnerCaptureMinSpeed = String(GOAL_POST_INNER_CAPTURE_MIN_SPEED);
    this.root.dataset.itl3GoalPostInnerCaptureEntryBlend = GOAL_POST_INNER_CAPTURE_ENTRY_BLEND.toFixed(2);
    this.root.dataset.itl3GoalPostInnerCaptureTargetRatio = GOAL_POST_INNER_CAPTURE_TARGET_RATIO.toFixed(2);
    this.root.dataset.itl3GoalPostInnerCaptureMinRadialRatio = GOAL_POST_INNER_CAPTURE_MIN_RADIAL_RATIO.toFixed(2);
    this.root.dataset.itl3GoalPostInnerCaptureSteerResponse = String(GOAL_POST_INNER_CAPTURE_STEER_RESPONSE);
    this.root.dataset.itl3GoalPostInnerCaptureSteerResponseMax = String(GOAL_POST_INNER_CAPTURE_STEER_RESPONSE_MAX);
    this.root.dataset.itl3GoalPostInnerCaptureSeconds = GOAL_POST_INNER_CAPTURE_SECONDS.toFixed(2);
    this.root.dataset.itl3GoalScoreRadial = GOAL_SCORE_RADIAL.toFixed(2);
    this.root.dataset.itl3GoalWidthScale = String(GOAL_WIDTH_SCALE);
    this.root.dataset.itl3GoalMouthWidth = GOAL_MOUTH_WIDTH.toFixed(2);
  }

  goalPhysicsSelfTest() {
    const player = this.players[0];
    const normalX = Math.cos(player.angle);
    const normalZ = Math.sin(player.angle);
    const tangentX = -normalZ;
    const tangentZ = normalX;
    const makePuck = (lateral, radial, radialSpeed) => ({
      x: normalX * radial + tangentX * lateral,
      z: normalZ * radial + tangentZ * lateral,
      vx: normalX * radialSpeed,
      vz: normalZ * radialSpeed
    });
    const center = makePuck(0, GOAL_SCORE_RADIAL + 1, 300);
    const outside = makePuck(GOAL_POST_CENTER_HALF_WIDTH + GOAL_POST_HALF_THICKNESS + PUCK_RADIUS + 4, GOAL_SCORE_RADIAL + 1, 300);
    const post = makePuck(GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH + 4, GOAL_POST_FRONT_RADIAL - PUCK_RADIUS - GOAL_POST_HALF_THICKNESS - 2, 900);
    let postHit = null;
    for (let step = 0; step < 8 && !postHit; step += 1) {
      post.x += post.vx * FIXED_STEP;
      post.z += post.vz * FIXED_STEP;
      postHit = this.resolvePuckAgainstGoalPost(player, post, false);
    }
    const innerPost = makePuck(GOAL_POST_PHYSICS_CENTER_HALF_WIDTH - PUCK_RADIUS - GOAL_POST_HALF_THICKNESS - 5, GOAL_POST_FRONT_RADIAL - 30, 700);
    innerPost.vx += tangentX * 150;
    innerPost.vz += tangentZ * 150;
    let innerPostHit = null;
    let innerPostScores = false;
    for (let step = 0; step < 24 && !innerPostScores; step += 1) {
      innerPost.x += innerPost.vx * FIXED_STEP;
      innerPost.z += innerPost.vz * FIXED_STEP;
      innerPostHit = this.resolvePuckAgainstGoalPost(player, innerPost, false) || innerPostHit;
      if (innerPost.goalPostCapture) {
        this.steerPuckWithinGoalPostCapture(player, innerPost, innerPost.goalPostCapture, FIXED_STEP);
      }
      innerPostScores = this.goalPassageState(player, innerPost).isGoal;
    }
    const innerPostFinal = this.goalCoordinates(player, innerPost);
    const runPostCenterScenario = (lateralOffset, lateralSpeed = 0) => {
      const testPuck = makePuck(
        GOAL_POST_CENTER_HALF_WIDTH + lateralOffset,
        GOAL_POST_FRONT_RADIAL - PUCK_RADIUS - GOAL_POST_HALF_THICKNESS - 2,
        700
      );
      testPuck.vx += tangentX * lateralSpeed;
      testPuck.vz += tangentZ * lateralSpeed;
      let hit = null;
      let scores = false;
      let firstTurnDegrees = null;
      for (let step = 0; step < 48 && !scores; step += 1) {
        testPuck.x += testPuck.vx * FIXED_STEP;
        testPuck.z += testPuck.vz * FIXED_STEP;
        const before = this.goalCoordinates(player, testPuck);
        const beforeAngle = Math.atan2(
          testPuck.vx * before.tangentX + testPuck.vz * before.tangentZ,
          before.radialVelocity
        );
        const currentHit = this.resolvePuckAgainstGoalPost(player, testPuck, false);
        if (currentHit && firstTurnDegrees == null) {
          const after = this.goalCoordinates(player, testPuck);
          const afterAngle = Math.atan2(
            testPuck.vx * after.tangentX + testPuck.vz * after.tangentZ,
            after.radialVelocity
          );
          firstTurnDegrees = Math.abs(angleDifference(afterAngle, beforeAngle)) * 180 / Math.PI;
        }
        hit = currentHit || hit;
        if (testPuck.goalPostCapture) {
          this.steerPuckWithinGoalPostCapture(player, testPuck, testPuck.goalPostCapture, FIXED_STEP);
        }
        scores = this.goalPassageState(player, testPuck).isGoal;
      }
      return {
        hit: Boolean(hit),
        captured: Boolean(hit?.captured || testPuck.goalPostCapture),
        scores,
        firstTurnDegrees,
        final: this.goalCoordinates(player, testPuck)
      };
    };
    const visibleCornerOffset = GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH - GOAL_POST_CENTER_HALF_WIDTH;
    const slightInnerPost = runPostCenterScenario(-.25);
    const slightOuterPost = runPostCenterScenario(.25);
    const nearVisibleCornerPost = runPostCenterScenario(visibleCornerOffset - .5);
    const justOutsideVisibleCornerPost = runPostCenterScenario(visibleCornerOffset + 2.5);
    // These vectors are already travelling into the mouth. They must retain a
    // natural post-and-in path without accepting the opposite, outward vector.
    const multiAngleInnerPost = [-320, -220, -120, 0].map(lateralSpeed => ({
      lateralSpeed,
      ...runPostCenterScenario(visibleCornerOffset - 8.5, lateralSpeed)
    }));
    const runAllGoalSideScenario = (
      testPlayer,
      side,
      relativeLateralSpeed,
      startCenterHalfWidth = GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH - 8.5,
      seedGoalCornerApproach = false
    ) => {
      const testNormalX = Math.cos(testPlayer.angle);
      const testNormalZ = Math.sin(testPlayer.angle);
      const testTangentX = -testNormalZ;
      const testTangentZ = testNormalX;
      const lateral = side * startCenterHalfWidth;
      const radial = GOAL_POST_FRONT_RADIAL - PUCK_RADIUS - GOAL_POST_HALF_THICKNESS - 2;
      const localLateralSpeed = side * relativeLateralSpeed;
      const testPuck = {
        x: testNormalX * radial + testTangentX * lateral,
        z: testNormalZ * radial + testTangentZ * lateral,
        vx: testNormalX * 700 + testTangentX * localLateralSpeed,
        vz: testNormalZ * 700 + testTangentZ * localLateralSpeed,
        goalPostCapture: null,
        goalCornerApproach: seedGoalCornerApproach ? {
          playerIndex: testPlayer.index,
          side,
          until: this.elapsed + 1,
          startRadial: radial,
          routeType: "inner-post",
          keeperBypassed: false
        } : null,
        goalCornerApproachBlockedUntil: 0
      };
      let hit = null;
      let scores = false;
      let minimumNetwardVelocity = Infinity;
      let maximumSamePostVelocity = 0;
      for (let step = 0; step < 72 && !scores; step += 1) {
        testPuck.x += testPuck.vx * FIXED_STEP;
        testPuck.z += testPuck.vz * FIXED_STEP;
        hit = this.resolvePuckAgainstGoalPost(testPlayer, testPuck, false) || hit;
        if (testPuck.goalPostCapture) {
          this.steerPuckWithinGoalPostCapture(testPlayer, testPuck, testPuck.goalPostCapture, FIXED_STEP);
          const current = this.goalCoordinates(testPlayer, testPuck);
          const currentLateralVelocity = testPuck.vx * current.tangentX + testPuck.vz * current.tangentZ;
          minimumNetwardVelocity = Math.min(minimumNetwardVelocity, current.radialVelocity);
          maximumSamePostVelocity = Math.max(maximumSamePostVelocity, side * currentLateralVelocity);
        }
        scores = this.goalPassageState(testPlayer, testPuck).isGoal;
      }
      return {
        playerIndex: testPlayer.index,
        side,
        relativeLateralSpeed,
        physicalPostHit: Boolean(hit),
        captured: Boolean(hit?.captured),
        scores,
        stayedNetward: minimumNetwardVelocity > 0,
        returnedTowardSamePost: maximumSamePostVelocity > .01,
        approachClearedAfterRejectedContact: !seedGoalCornerApproach || !testPuck.goalCornerApproach,
        approachRetryBlocked: !seedGoalCornerApproach || testPuck.goalCornerApproachBlockedUntil > this.elapsed
      };
    };
    const allGoalSideInnerPostRoutes = this.players.flatMap(testPlayer => [-1, 1].flatMap(side => (
      [-260, -130, 0].map(relativeLateralSpeed => runAllGoalSideScenario(testPlayer, side, relativeLateralSpeed))
    )));
    const allOutwardCornerPostRoutes = this.players.flatMap(testPlayer => [-1, 1].flatMap(side => (
      [0, 160, 320].map(relativeLateralSpeed => runAllGoalSideScenario(
        testPlayer,
        side,
        relativeLateralSpeed,
        GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH - .5,
        true
      ))
    )));
    const runArenaCornerApproachScenario = (testPlayer, side, relativeLateralSpeed) => {
      const testNormalX = Math.cos(testPlayer.angle);
      const testNormalZ = Math.sin(testPlayer.angle);
      const testTangentX = -testNormalZ;
      const testTangentZ = testNormalX;
      const lateral = side * (GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH - .5);
      const boundaryRadius = ARENA_RADIUS - PUCK_RADIUS + .5;
      const radial = Math.sqrt(Math.max(1, boundaryRadius * boundaryRadius - lateral * lateral));
      const localLateralSpeed = side * relativeLateralSpeed;
      const testPuck = {
        x: testNormalX * radial + testTangentX * lateral,
        z: testNormalZ * radial + testTangentZ * lateral,
        vx: testNormalX * 700 + testTangentX * localLateralSpeed,
        vz: testNormalZ * 700 + testTangentZ * localLateralSpeed,
        goalPostCapture: null,
        goalCornerApproach: null
      };
      const approach = this.commitVisibleGoalCornerApproach(testPuck, false);
      const approachValidityAtCommit = approach
        ? this.goalCornerApproachValidity(testPlayer, testPuck, approach)
        : null;
      const protectedFromKeeper = this.keeperCollisionSuppressedByGoalPostCapture(testPlayer, testPuck);
      let hit = null;
      let scores = false;
      let minimumNetwardVelocity = Infinity;
      let maximumSamePostVelocity = 0;
      for (let step = 0; step < 120 && !scores; step += 1) {
        testPuck.x += testPuck.vx * FIXED_STEP;
        testPuck.z += testPuck.vz * FIXED_STEP;
        hit = this.resolvePuckAgainstGoalPost(testPlayer, testPuck, false) || hit;
        if (testPuck.goalPostCapture) {
          this.steerPuckWithinGoalPostCapture(testPlayer, testPuck, testPuck.goalPostCapture, FIXED_STEP);
        }
        const current = this.goalCoordinates(testPlayer, testPuck);
        const currentLateralVelocity = testPuck.vx * current.tangentX + testPuck.vz * current.tangentZ;
        minimumNetwardVelocity = Math.min(minimumNetwardVelocity, current.radialVelocity);
        maximumSamePostVelocity = Math.max(maximumSamePostVelocity, side * currentLateralVelocity);
        scores = this.goalPassageState(testPlayer, testPuck).isGoal;
      }
      return {
        playerIndex: testPlayer.index,
        side,
        relativeLateralSpeed,
        approachCommitted: Boolean(approach),
        approachRouteType: approach?.routeType || null,
        approachValidAtCommit: Boolean(approachValidityAtCommit?.valid),
        protectedFromKeeper,
        physicalPostHit: Boolean(hit),
        postCaptured: Boolean(hit?.captured),
        scores,
        stayedNetward: minimumNetwardVelocity > 0,
        returnedTowardSamePost: maximumSamePostVelocity > .01
      };
    };
    const allArenaCornerApproachRoutes = this.players.flatMap(testPlayer => [-1, 1].flatMap(side => (
      [-380, -300, -220].map(relativeLateralSpeed => runArenaCornerApproachScenario(testPlayer, side, relativeLateralSpeed))
    )));
    const allRejectedArenaCornerApproachRoutes = this.players.flatMap(testPlayer => [-1, 1].flatMap(side => (
      [0, 130, 260].map(relativeLateralSpeed => runArenaCornerApproachScenario(testPlayer, side, relativeLateralSpeed))
    )));
    const allMissedInnerPostRouteGuards = this.players.flatMap(testPlayer => [-1, 1].map(side => {
      const testNormalX = Math.cos(testPlayer.angle);
      const testNormalZ = Math.sin(testPlayer.angle);
      const testTangentX = -testNormalZ;
      const testTangentZ = testNormalX;
      const lateral = side * (GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH - .5);
      const radial = GOAL_POST_ROUTE_MISS_GUARD_RADIAL + 2;
      const testPuck = {
        x: testNormalX * radial + testTangentX * lateral,
        z: testNormalZ * radial + testTangentZ * lateral,
        vx: testNormalX * 700 + testTangentX * side * 160,
        vz: testNormalZ * 700 + testTangentZ * side * 160
      };
      const approach = {
        playerIndex: testPlayer.index,
        side,
        until: this.elapsed + 1,
        routeType: "inner-post"
      };
      const validity = this.goalCornerApproachValidity(testPlayer, testPuck, approach);
      return { playerIndex: testPlayer.index, side, valid: validity.valid, reason: validity.reason };
    }));
    const keeperProtectedPuck = makePuck(0, GOAL_POST_FRONT_RADIAL, 600);
    keeperProtectedPuck.goalPostCapture = {
      playerIndex: player.index,
      until: this.elapsed + .1
    };
    const shiftedFrontNormal = this.goalPostReflectionNormal(1, 0, -1);
    const shiftedOuterNormal = this.goalPostReflectionNormal(1, 1, 0);
    return {
      centerScores: this.goalPassageState(player, center).isGoal,
      outsideScores: this.goalPassageState(player, outside).isGoal,
      postHit: Boolean(postHit),
      postReflected: this.goalCoordinates(player, post).radialVelocity < 0,
      postScores: this.goalPassageState(player, post).isGoal,
      innerPostHit: Boolean(innerPostHit),
      innerPostTurnedInward: innerPost.vx * tangentX + innerPost.vz * tangentZ < 0,
      innerPostStayedGoalward: innerPostFinal.radialVelocity > 0,
      innerPostScores,
      slightInnerPostHit: slightInnerPost.hit,
      slightInnerPostCaptured: slightInnerPost.captured,
      slightInnerPostStayedGoalward: slightInnerPost.final.radialVelocity > 0,
      slightInnerPostScores: slightInnerPost.scores,
      slightOuterPostHit: slightOuterPost.hit,
      slightOuterPostCaptured: slightOuterPost.captured,
      slightOuterPostScores: slightOuterPost.scores,
      visibleCornerPostHit: nearVisibleCornerPost.hit,
      visibleCornerPostCaptured: nearVisibleCornerPost.captured,
      visibleCornerPostScores: nearVisibleCornerPost.scores,
      visibleCornerPostFirstTurnDegrees: nearVisibleCornerPost.firstTurnDegrees,
      justOutsideVisibleCornerPostHit: justOutsideVisibleCornerPost.hit,
      justOutsideVisibleCornerPostCaptured: justOutsideVisibleCornerPost.captured,
      justOutsideVisibleCornerPostReflected: justOutsideVisibleCornerPost.final.radialVelocity < 0,
      multiAngleInnerPostAllCaptured: multiAngleInnerPost.every(result => result.captured),
      multiAngleInnerPostAllScore: multiAngleInnerPost.every(result => result.scores),
      multiAngleInnerPost: multiAngleInnerPost.map(result => ({
        lateralSpeed: result.lateralSpeed,
        captured: result.captured,
        scores: result.scores,
        firstTurnDegrees: result.firstTurnDegrees
      })),
      allGoalSideInnerPostRouteCount: allGoalSideInnerPostRoutes.length,
      allGoalSideInnerPostAllCaptured: allGoalSideInnerPostRoutes.every(result => result.captured),
      allGoalSideInnerPostAllScore: allGoalSideInnerPostRoutes.every(result => result.scores),
      allGoalSideInnerPostAllStayedNetward: allGoalSideInnerPostRoutes.every(result => result.stayedNetward),
      allGoalSideInnerPostNoneReturnedToPost: allGoalSideInnerPostRoutes.every(result => !result.returnedTowardSamePost),
      allGoalSideInnerPostRoutes,
      allOutwardCornerPostRouteCount: allOutwardCornerPostRoutes.length,
      allOutwardCornerPostRoutesRejected: allOutwardCornerPostRoutes.every(result => !result.captured),
      allOutwardCornerPostRoutesHitPhysicalPost: allOutwardCornerPostRoutes.every(result => result.physicalPostHit),
      allOutwardCornerPostRoutesClearedApproach: allOutwardCornerPostRoutes.every(result => result.approachClearedAfterRejectedContact),
      allOutwardCornerPostRoutesBlockedRetry: allOutwardCornerPostRoutes.every(result => result.approachRetryBlocked),
      allOutwardCornerPostRoutes,
      allArenaCornerApproachRouteCount: allArenaCornerApproachRoutes.length,
      allArenaCornerApproachCommitted: allArenaCornerApproachRoutes.every(result => result.approachCommitted),
      allArenaCornerApproachValidAtCommit: allArenaCornerApproachRoutes.every(result => result.approachValidAtCommit),
      allArenaCornerApproachProtectedFromKeeper: allArenaCornerApproachRoutes.every(result => result.protectedFromKeeper),
      allArenaCornerApproachHitPhysicalPost: allArenaCornerApproachRoutes.every(result => result.physicalPostHit),
      allArenaCornerApproachPostCaptured: allArenaCornerApproachRoutes.every(result => result.postCaptured),
      allArenaCornerApproachScore: allArenaCornerApproachRoutes.every(result => result.scores),
      allArenaCornerApproachStayedNetward: allArenaCornerApproachRoutes.every(result => result.stayedNetward),
      allArenaCornerApproachNoneReturnedToPost: allArenaCornerApproachRoutes.every(result => !result.returnedTowardSamePost),
      allArenaCornerApproachRoutes,
      allRejectedArenaCornerApproachRouteCount: allRejectedArenaCornerApproachRoutes.length,
      allRejectedArenaCornerApproachNoneCommitted: allRejectedArenaCornerApproachRoutes.every(result => !result.approachCommitted),
      allRejectedArenaCornerApproachNoneKeeperProtected: allRejectedArenaCornerApproachRoutes.every(result => !result.protectedFromKeeper),
      allRejectedArenaCornerApproachRoutes,
      allMissedInnerPostRouteGuardCount: allMissedInnerPostRouteGuards.length,
      allMissedInnerPostRouteGuardsRejected: allMissedInnerPostRouteGuards.every(result => !result.valid && result.reason === "inner-post-missed"),
      allMissedInnerPostRouteGuards,
      frontReflectionShiftedTowardInner: shiftedFrontNormal.localLateral < 0 && shiftedFrontNormal.localRadial < 0,
      outerReflectionShiftedTowardFront: shiftedOuterNormal.localLateral > 0 && shiftedOuterNormal.localRadial < 0,
      reflectionInwardShiftDegrees: GOAL_POST_REFLECTION_INWARD_SHIFT * 180 / Math.PI,
      capturedRouteProtectedFromDefendingKeeper: this.keeperCollisionSuppressedByGoalPostCapture(player, keeperProtectedPuck),
      capturedRouteNotProtectedFromOtherKeeper: !this.keeperCollisionSuppressedByGoalPostCapture(this.players[1], keeperProtectedPuck),
      postShape: "round-front-post",
      innerPhysicsRelief: GOAL_POST_INNER_PHYSICS_RELIEF,
      minimumVisibleCornerOverlap: GOAL_POST_MIN_VISIBLE_CORNER_OVERLAP,
      visibleCornerCenterHalfWidth: GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH,
      innerCaptureMode: "natural-ray-post-rejection-outside-recovery"
    };
  }

  resolveBoundary() {
    const capture = this.puck.goalPostCapture;
    if (capture) {
      const player = this.players[capture.playerIndex];
      if (player?.active && this.elapsed <= capture.until) {
        this.steerPuckWithinGoalPostCapture(player, this.puck, capture, FIXED_STEP);
        const state = this.goalPassageState(player);
        if (state.isGoal) {
          this.puck.goalPostCapture = null;
          this.registerGoal(player, false);
        }
        // Keep the inner-post route open while the redirected puck travels to
        // the unchanged score line. Other goal widths remain fully physical.
        return;
      }
      this.puck.goalPostCapture = null;
    }
    const approach = this.puck.goalCornerApproach;
    if (approach) {
      const player = this.players[approach.playerIndex];
      const validity = player
        ? this.goalCornerApproachValidity(player, this.puck, approach)
        : { valid: false, reason: "missing-player", state: null };
      if (validity.state?.isGoal) {
        this.puck.goalCornerApproach = null;
        this.registerGoal(player, false);
        return;
      }
      if (validity.valid) {
        // Keep the circular boundary open only while the unchanged physical
        // ray still reaches the clear mouth, or until an inner-post route
        // actually reaches its post collider.
        return;
      }
      this.cancelGoalCornerApproach(this.puck, validity.reason);
    }
    if (this.commitVisibleGoalCornerApproach()) return;
    if (this.resolveGoalPostCollisions()) return;
    const radius = Math.hypot(this.puck.x, this.puck.z);
    if (radius < ARENA_RADIUS - PUCK_RADIUS) return;
    const openGoal = this.players.map(player => ({ player, state: this.goalPassageState(player) })).find(({ player, state }) => (
      player.active
      && state.radial >= ARENA_RADIUS - PUCK_RADIUS - 1
      && state.insideClearMouth
    ));
    if (openGoal) {
      if (openGoal.state.isGoal) {
        this.registerGoal(openGoal.player, false);
      }
      return;
    }
    const nx = this.puck.x / (radius || 1);
    const nz = this.puck.z / (radius || 1);
    this.puck.x = nx * (ARENA_RADIUS - PUCK_RADIUS - .8);
    this.puck.z = nz * (ARENA_RADIUS - PUCK_RADIUS - .8);
    const outward = this.puck.vx * nx + this.puck.vz * nz;
    if (outward > 0) {
      const boundaryAngle = Math.atan2(nz, nx);
      const retractedSpring = this.retractedWallSpringAtAngle(boundaryAngle);
      const restitution = retractedSpring ? WALL_SPRING_RETRACTED_RESTITUTION : WALL_RESTITUTION;
      const minimumReturnSpeed = retractedSpring ? WALL_SPRING_RETRACTED_MIN_KICK : 0;
      const returnSpeed = Math.max(outward * restitution, minimumReturnSpeed);
      this.puck.vx -= nx * (outward + returnSpeed);
      this.puck.vz -= nz * (outward + returnSpeed);
      const tangentKick = randomBetween(-7, 7);
      this.puck.vx += -nz * tangentKick;
      this.puck.vz += nx * tangentKick;
      const speed = Math.hypot(this.puck.vx, this.puck.vz);
      if (speed > MAX_PUCK_SPEED) {
        this.puck.vx *= MAX_PUCK_SPEED / speed;
        this.puck.vz *= MAX_PUCK_SPEED / speed;
      }
      if (retractedSpring && this.elapsed - retractedSpring.userData.lastPuckHitAt >= WALL_SPRING_HIT_COOLDOWN) {
        retractedSpring.userData.lastPuckHitAt = this.elapsed;
        this.wallSpringHitCount += 1;
        this.wallSpringPuckHitCount += 1;
        this.root.dataset.itl3WallSpringLastPuckHitMode = "retracted";
        this.updateWallSpringTelemetry(true);
      }
      this.wallImpact(this.puck.x, this.puck.z);
    }
  }

  territoryCounts() {
    const counts = Array(this.players.length).fill(0);
    this.territories.forEach(territory => {
      if (Number.isInteger(territory.ownerIndex) && counts[territory.ownerIndex] != null) {
        counts[territory.ownerIndex] += 1;
      }
    });
    return counts;
  }

  territoryStanding() {
    const counts = this.territoryCounts();
    const max = Math.max(...counts);
    return {
      counts,
      max,
      leaders: this.players.filter(player => counts[player.index] === max)
    };
  }

  resetTerritories() {
    this.territories.forEach(territory => {
      territory.ownerIndex = territory.homeIndex;
      territory.captureCount = 0;
      territory.lastCapturedAt = -1;
      const tile = this.territoryTiles?.[territory.index];
      if (!tile) return;
      tile.userData.targetColor.set(this.players[territory.ownerIndex].color).lerp(new THREE.Color(0xffffff), .3);
      tile.material.color.copy(tile.userData.targetColor);
      tile.material.opacity = TERRITORY_PANEL_BASE_OPACITY;
      if (tile.userData.glow) {
        tile.userData.glow.material.color.copy(tile.userData.targetColor);
        tile.userData.glow.material.opacity = TERRITORY_PANEL_GLOW_OPACITY;
        tile.userData.glow.scale.setScalar(1.022);
      }
      if (tile.userData.border) {
        tile.userData.border.material.color.copy(tile.userData.targetColor);
        tile.userData.border.material.opacity = TERRITORY_PANEL_BORDER_OPACITY;
      }
      tile.userData.pulse = 0;
      tile.scale.setScalar(1);
    });
  }

  resolveGoalScorer(defender) {
    const lastIndex = this.touchHistory[this.touchHistory.length - 1];
    const lastPlayer = this.players[lastIndex];
    if (!lastPlayer?.active) return null;
    if (lastPlayer.index !== defender.index) return lastPlayer;

    // Own goal: award the capture only to the previous distinct puck owner.
    // If the puck had no previous owner, the goal is explicitly no-count.
    const previousIndex = this.touchHistory[this.touchHistory.length - 2];
    const previousPlayer = this.players[previousIndex];
    return previousPlayer?.active && previousPlayer.index !== defender.index ? previousPlayer : null;
  }

  captureTerritory(scorer, defender) {
    if (!scorer || !defender) return null;
    const local = this.territories.filter(territory => territory.homeIndex === defender.index && territory.ownerIndex !== scorer.index);
    const localDefender = local.filter(territory => territory.ownerIndex === defender.index);
    const defenderOwned = this.territories.filter(territory => territory.ownerIndex === defender.index && territory.ownerIndex !== scorer.index);
    const counts = this.territoryCounts();
    const otherTerritory = this.territories
      .filter(territory => territory.ownerIndex !== scorer.index)
      .sort((a, b) => counts[b.ownerIndex] - counts[a.ownerIndex] || a.captureCount - b.captureCount || a.index - b.index);
    const pool = localDefender.length ? localDefender : local.length ? local : defenderOwned.length ? defenderOwned : otherTerritory;
    if (!pool.length) return null;
    const target = [...pool].sort((a, b) => a.captureCount - b.captureCount || a.index - b.index)[0];
    const previousOwnerIndex = target.ownerIndex;
    target.ownerIndex = scorer.index;
    target.captureCount += 1;
    target.lastCapturedAt = this.elapsed;
    scorer.territoryCaptured += 1;
    if (this.players[previousOwnerIndex]) this.players[previousOwnerIndex].territoryLost += 1;
    const tile = this.territoryTiles?.[target.index];
    const previousColor = tile?.userData.targetColor?.clone()
      || new THREE.Color(this.players[previousOwnerIndex]?.color || scorer.color).lerp(new THREE.Color(0xffffff), .3);
    const newColor = new THREE.Color(scorer.color).lerp(new THREE.Color(0xffffff), .3);
    // Ownership changes immediately for scoring, but the panel itself keeps the
    // previous owner's color until the dedicated post-replay capture reveal.
    return { territoryIndex: target.index, previousOwnerIndex, ownerIndex: scorer.index, previousColor, newColor };
  }

  registerGoal(defender, testTriggered) {
    if (!defender.active || this.countdown > 0 || this.serveTimer > 0 || this.pendingGoal || this.finished) return false;
    const scorer = this.resolveGoalScorer(defender);
    let capture = null;
    if (scorer) {
      scorer.goalsFor += 1;
      capture = this.captureTerritory(scorer, defender);
      this.players.forEach(player => {
        if (player.index === defender.index) {
          player.consecutiveGoalsConceded += 1;
          if (
            player.abilityProfile.key === "balanced"
            && player.consecutiveGoalsConceded >= CONSECUTIVE_GOAL_GUARD_REQUIRED
          ) {
            player.consecutiveGoalGuardUntil = this.elapsed + CONSECUTIVE_GOAL_GUARD_SECONDS;
          }
        } else {
          player.consecutiveGoalsConceded = 0;
          player.consecutiveGoalGuardUntil = 0;
        }
      });
    }
    this.decisivePath = this.roundPath.slice(-GOAL_REPLAY_PATH_POINTS);
    const characterPoses = this.captureReplayCharacters();
    const malletPoses = this.captureReplayMallets();
    this.root.dataset.itl3GoalReplayCapturedFacingAngles = JSON.stringify(characterPoses.map(pose => (
      Number.isFinite(pose.rotationY) ? Math.round(pose.rotationY * 100000) / 100000 : null
    )));
    const coordinates = this.goalCoordinates(defender);
    const incomingSpeed = Math.hypot(this.puck.vx, this.puck.vz);
    const entrySpeed = clamp(
      Math.max(coordinates.radialVelocity, incomingSpeed * .16),
      GOAL_LIVE_ENTRY_MIN_SPEED,
      GOAL_LIVE_ENTRY_MAX_SPEED
    );
    const lateralVelocity = clamp(
      this.puck.vx * coordinates.tangentX + this.puck.vz * coordinates.tangentZ,
      -55,
      55
    );
    const targetLateral = clamp(
      coordinates.lateral,
      -GOAL_PUCK_CENTER_HALF_WIDTH + 2,
      GOAL_PUCK_CENTER_HALF_WIDTH - 2
    );
    this.puck.vx = coordinates.normalX * entrySpeed + coordinates.tangentX * lateralVelocity;
    this.puck.vz = coordinates.normalZ * entrySpeed + coordinates.tangentZ * lateralVelocity;
    this.puck.visible = true;
    this.puck.goalPostCapture = null;
    this.puck.goalCornerApproach = null;
    this.puck.goalCornerApproachBlockedUntil = 0;
    this.pendingServeRecipientIndex = defender.index;
    this.root.dataset.itl3LastGoalDefender = String(defender.index);
    this.root.dataset.itl3PendingServeRecipient = String(defender.index);
    this.goalAcceptedCount += 1;
    this.updateGoalPhysicsTelemetry();
    this.pendingGoal = {
      defenderIndex: defender.index,
      scorerIndex: scorer?.index ?? -1,
      acceptedAt: this.elapsed,
      entrySpeed,
      targetLateral,
      testTriggered,
      capture,
      characterPoses,
      malletPoses
    };
    this.root.dataset.itl3GoalTransition = "live-entry";
    this.root.dataset.itl3GoalEntryPuckVisible = "1";
    this.root.dataset.itl3GoalEntryStartRadial = coordinates.radial.toFixed(2);
    this.root.dataset.itl3GoalEntryTargetRadial = GOAL_LIVE_ENTRY_TARGET_RADIAL.toFixed(2);
    this.root.dataset.itl3GoalEntryFullyInside = "0";
    this.updateScoreboard();
    return true;
  }

  advanceAcceptedGoal(dt) {
    const pending = this.pendingGoal;
    if (!pending) return;
    const defender = this.players[pending.defenderIndex];
    if (!defender?.active) {
      this.startGoalReplay();
      return;
    }

    const coordinates = this.goalCoordinates(defender);
    const radialRemaining = GOAL_LIVE_ENTRY_TARGET_RADIAL - coordinates.radial;
    const radialVelocity = radialRemaining > .15
      ? Math.min(pending.entrySpeed, Math.max(28, radialRemaining * 10))
      : 0;
    const currentLateralVelocity = this.puck.vx * coordinates.tangentX + this.puck.vz * coordinates.tangentZ;
    const targetLateralVelocity = clamp((pending.targetLateral - coordinates.lateral) * 8, -48, 48);
    const lateralVelocity = THREE.MathUtils.lerp(
      currentLateralVelocity,
      targetLateralVelocity,
      clamp(dt * 14, 0, 1)
    );

    this.puck.vx = coordinates.normalX * radialVelocity + coordinates.tangentX * lateralVelocity;
    this.puck.vz = coordinates.normalZ * radialVelocity + coordinates.tangentZ * lateralVelocity;
    this.puck.x += this.puck.vx * dt;
    this.puck.z += this.puck.vz * dt;

    const updated = this.goalCoordinates(defender);
    if (updated.radial > GOAL_LIVE_ENTRY_TARGET_RADIAL) {
      const overshoot = updated.radial - GOAL_LIVE_ENTRY_TARGET_RADIAL;
      this.puck.x -= updated.normalX * overshoot;
      this.puck.z -= updated.normalZ * overshoot;
    }
    const lateralLimit = GOAL_PUCK_CENTER_HALF_WIDTH - 1;
    const corrected = this.goalCoordinates(defender);
    if (Math.abs(corrected.lateral) > lateralLimit) {
      const lateralCorrection = corrected.lateral - Math.sign(corrected.lateral) * lateralLimit;
      this.puck.x -= corrected.tangentX * lateralCorrection;
      this.puck.z -= corrected.tangentZ * lateralCorrection;
    }

    this.puck.visible = true;
    this.appendReplayFrame();

    const entryElapsed = this.elapsed - pending.acceptedAt;
    const finalCoordinates = this.goalCoordinates(defender);
    const fullyEntered = finalCoordinates.radial >= GOAL_LIVE_ENTRY_TARGET_RADIAL - .35;
    this.root.dataset.itl3GoalEntryRadial = finalCoordinates.radial.toFixed(2);
    this.root.dataset.itl3GoalEntrySeconds = entryElapsed.toFixed(3);
    this.root.dataset.itl3GoalEntryFullyInside = fullyEntered ? "1" : "0";
    if ((fullyEntered && entryElapsed >= GOAL_LIVE_ENTRY_MIN_SECONDS) || entryElapsed >= GOAL_LIVE_ENTRY_MAX_SECONDS) {
      this.startGoalReplay();
    }
  }

  prepareTerritoryGoalFlash(scorer, capture) {
    const territoryIndex = Number.isInteger(capture?.territoryIndex) ? capture.territoryIndex : -1;
    const tile = territoryIndex >= 0 ? this.territoryTiles?.[territoryIndex] : null;
    if (!scorer || !capture || !tile) {
      if (scorer && capture && territoryIndex >= 0) {
        const fallbackTile = this.territoryTiles?.[territoryIndex];
        if (fallbackTile) {
          fallbackTile.userData.targetColor.set(scorer.color).lerp(new THREE.Color(0xffffff), .3);
        }
      }
      this.territoryGoalFlash = null;
      this.root.dataset.itl3TerritoryGoalFlashState = scorer ? "skipped-no-changed-panel" : "skipped-no-scorer";
      this.root.dataset.itl3TerritoryGoalFlashActive = "0";
      this.root.dataset.itl3TerritoryGoalFlashScorer = scorer ? String(scorer.index) : "none";
      this.root.dataset.itl3TerritoryGoalFlashIntensity = "0.000";
      this.root.dataset.itl3TerritoryGoalFlashColorMix = "0.000";
      this.root.dataset.itl3TerritoryGoalFlashTileCount = "0";
      this.root.dataset.itl3TerritoryGoalFlashTileIndex = "none";
      this.root.dataset.itl3TerritoryGoalFlashPreviousOwner = "none";
      return null;
    }
    const previousColor = capture.previousColor?.clone?.() || tile.userData.targetColor.clone();
    const newColor = capture.newColor?.clone?.()
      || new THREE.Color(scorer.color).lerp(new THREE.Color(0xffffff), .3);
    tile.userData.targetColor.copy(previousColor);
    tile.userData.pulse = 0;
    this.territoryGoalFlash = {
      scorerIndex: scorer.index,
      territoryIndex,
      previousOwnerIndex: capture.previousOwnerIndex,
      active: false,
      complete: false,
      startedAt: null,
      colorChangeStarted: false,
      duration: TERRITORY_GOAL_FLASH_DURATION,
      pulses: TERRITORY_GOAL_FLASH_PULSES,
      previousColor,
      newColor,
      brightColor: new THREE.Color(scorer.color).lerp(new THREE.Color(0xffffff), TERRITORY_GOAL_FLASH_WHITE_MIX)
    };
    this.root.dataset.itl3TerritoryGoalFlashState = "waiting-for-slow-motion";
    this.root.dataset.itl3TerritoryGoalFlashActive = "0";
    this.root.dataset.itl3TerritoryGoalFlashScorer = String(scorer.index);
    this.root.dataset.itl3TerritoryGoalFlashIntensity = "0.000";
    this.root.dataset.itl3TerritoryGoalFlashColorMix = "0.000";
    this.root.dataset.itl3TerritoryGoalFlashTileCount = "1";
    this.root.dataset.itl3TerritoryGoalFlashTileIndex = String(territoryIndex);
    this.root.dataset.itl3TerritoryGoalFlashPreviousOwner = String(capture.previousOwnerIndex);
    return this.territoryGoalFlash;
  }

  commitTerritoryGoalFlashColor(flash) {
    if (!flash || !Number.isInteger(flash.territoryIndex)) return;
    const tile = this.territoryTiles?.[flash.territoryIndex];
    if (!tile || !flash.newColor) return;
    tile.userData.targetColor.copy(flash.newColor);
  }

  advanceTerritoryGoalFlashPhase() {
    const flash = this.territoryGoalFlash;
    if (!flash || flash.complete) return;
    const startThreshold = flash.duration + GOAL_REPLAY_SERVE_PADDING;
    if (!flash.active && this.serveTimer <= startThreshold) {
      flash.active = true;
      flash.startedAt = this.elapsed;
      this.goalCinematic = null;
      this.cameraMode = "territory-flash";
      this.cameraModeTime = 0;
      this.root.dataset.itl3TerritoryGoalFlashState = "showing-changed-panel-previous-color";
      this.root.dataset.itl3TerritoryGoalFlashActive = "1";
    }
    if (!flash.active) return;
    const elapsed = Math.max(0, this.elapsed - flash.startedAt);
    if (!flash.colorChangeStarted && elapsed >= TERRITORY_GOAL_FLASH_PRECHANGE_DURATION) {
      flash.colorChangeStarted = true;
      this.root.dataset.itl3TerritoryGoalFlashState = "changed-panel-color-flashing";
    }
    const progress = clamp(elapsed / flash.duration, 0, 1);
    if (progress >= 1 || this.serveTimer <= GOAL_REPLAY_SERVE_PADDING) {
      this.commitTerritoryGoalFlashColor(flash);
      flash.active = false;
      flash.complete = true;
      this.root.dataset.itl3TerritoryGoalFlashState = "flash-complete-waiting-countdown";
      this.root.dataset.itl3TerritoryGoalFlashActive = "0";
      this.root.dataset.itl3TerritoryGoalFlashIntensity = "0.000";
      this.root.dataset.itl3TerritoryGoalFlashColorMix = "1.000";
    }
  }

  territoryGoalFlashIntensity() {
    const flash = this.territoryGoalFlash;
    if (!flash?.active || !Number.isFinite(flash.startedAt)) return 0;
    const elapsed = Math.max(0, this.elapsed - flash.startedAt);
    if (elapsed < TERRITORY_GOAL_FLASH_PRECHANGE_DURATION) return 0;
    const progress = clamp(
      (elapsed - TERRITORY_GOAL_FLASH_PRECHANGE_DURATION) / TERRITORY_GOAL_FLASH_PULSE_DURATION,
      0,
      1
    );
    const wave = Math.sin(progress * Math.PI * flash.pulses);
    return Math.pow(wave * wave, .48);
  }

  territoryGoalFlashColorMix() {
    const flash = this.territoryGoalFlash;
    if (!flash) return 0;
    if (flash.complete) return 1;
    if (!flash.active || !Number.isFinite(flash.startedAt)) return 0;
    const elapsed = Math.max(0, this.elapsed - flash.startedAt - TERRITORY_GOAL_FLASH_PRECHANGE_DURATION);
    const linear = clamp(elapsed / TERRITORY_GOAL_FLASH_COLOR_CHANGE_DURATION, 0, 1);
    return linear * linear * (3 - 2 * linear);
  }

  startGoalReplay() {
    const pending = this.pendingGoal;
    if (!pending || this.finished) return;
    const defender = this.players[pending.defenderIndex];
    const scorer = this.players[pending.scorerIndex] || null;
    const finalCoordinates = defender ? this.goalCoordinates(defender) : null;
    const fullyEntered = Boolean(finalCoordinates && finalCoordinates.radial >= GOAL_LIVE_ENTRY_TARGET_RADIAL - .35);
    const entrySeconds = Math.max(0, this.elapsed - pending.acceptedAt);

    this.decisivePath = this.roundPath.slice(-GOAL_REPLAY_PATH_POINTS);
    this.pendingGoal = null;
    this.puck.vx = 0;
    this.puck.vz = 0;
    this.puck.visible = false;
    const territoryFlash = this.prepareTerritoryGoalFlash(scorer, pending.capture);
    this.serveTimer = GOAL_REPLAY_DURATION
      + (territoryFlash ? TERRITORY_GOAL_FLASH_DURATION : 0)
      + GOAL_REPLAY_SERVE_PADDING;
    const replayPath = this.decisivePath.slice(-GOAL_REPLAY_PATH_POINTS);
    const characterFrameCount = replayPath.filter(frame => frame?.characters?.length === this.players.length).length;
    const malletFrameCount = replayPath.filter(frame => frame?.mallets?.length === this.players.length).length;
    this.goalCinematic = {
      defenderIndex: pending.defenderIndex,
      scorerIndex: pending.scorerIndex,
      life: GOAL_REPLAY_DURATION,
      maxLife: GOAL_REPLAY_DURATION,
      path: replayPath,
      characterPoses: pending.characterPoses,
      malletPoses: pending.malletPoses
    };
    this.cameraMode = "goal";
    this.cameraModeTime = 0;
    this.root.dataset.itl3GoalTransition = "slow-motion";
    this.root.dataset.itl3GoalEntryPuckVisible = "0";
    this.root.dataset.itl3GoalEntryFullyInside = fullyEntered ? "1" : "0";
    this.root.dataset.itl3GoalEntrySeconds = entrySeconds.toFixed(3);
    this.root.dataset.itl3GoalReplayActualPathPoints = String(replayPath.length);
    this.root.dataset.itl3GoalReplayActualPathSeconds = (replayPath.length * FIXED_STEP).toFixed(2);
    this.root.dataset.itl3GoalReplayCharacterTracks = String(this.players.length);
    this.root.dataset.itl3GoalReplayCharacterFrameCount = String(characterFrameCount);
    this.root.dataset.itl3GoalReplayCharacterFrameIndex = "0";
    this.root.dataset.itl3GoalReplayMalletTracks = String(this.players.length);
    this.root.dataset.itl3GoalReplayMalletFrameCount = String(malletFrameCount);
    this.root.dataset.itl3GoalReplayMalletFrameIndex = "0";
    this.root.dataset.itl3GoalReplayMalletFidelity = malletFrameCount === replayPath.length && replayPath.length > 0
      ? "complete-frame-history"
      : "fallback-pose-used";
    this.goalEffect(defender, scorer, pending.testTriggered, pending.capture);
    this.updateScoreboard();
    const standing = this.territoryStanding();
    if (this.overtime && standing.leaders.length === 1) {
      window.setTimeout(() => {
        if (!this.destroyed && !this.finished) this.finishMatch(standing.leaders[0], "OVERTIME CAPTURE");
      }, Math.round((GOAL_REPLAY_DURATION + (territoryFlash ? TERRITORY_GOAL_FLASH_DURATION : 0)) * 1000));
    }
  }

  triggerSmashBurn(player, malletSpeed, closingSpeed) {
    this.smashBurnTime = MALLET_SMASH_BURN_DURATION;
    this.smashBurnEmitClock = 0;
    this.smashSmokeEmitClock = 0;
    const puckSpeed = Math.hypot(this.puck.vx, this.puck.vz);
    if (puckSpeed > .001) {
      this.smashBurnDirectionX = this.puck.vx / puckSpeed;
      this.smashBurnDirectionZ = this.puck.vz / puckSpeed;
    }
    this.smashCount += 1;
    this.lastSmashBy = player.index;
    this.lastSmashPower = Math.round(Math.max(malletSpeed, closingSpeed));
    this.root.dataset.itl3MalletSmashCount = String(this.smashCount);
    this.root.dataset.itl3MalletSmashBurning = "1";
    this.root.dataset.itl3LastSmashBy = String(player.index);
    this.root.dataset.itl3LastSmashPower = String(this.lastSmashPower);
  }

  impact(player, x, z, smash = false) {
    const power = Math.hypot(this.puck.vx, this.puck.vz);
    if (this.elapsed <= this.comboExpiresAt && this.puck.lastHitBy !== this.lastComboPlayer) this.comboCount = Math.min(9, this.comboCount + 1);
    else this.comboCount = 1;
    this.lastComboPlayer = player.index;
    this.comboExpiresAt = this.elapsed + 1.65;
    this.lastImpactPower = power;
    const effectColor = smash ? "#ff6500" : player.color;
    this.spawnBurst(x, 12, z, effectColor, (smash ? 38 : 20) + Math.round(power / 100), (smash ? 270 : 190) + power * .13);
    this.spawnShock(x, z, effectColor, (smash ? 46 : 30) + power * .018);
    this.cameraShake = Math.max(this.cameraShake, (smash ? 9 : 5.5) + power * .006);
    if (this.postUniforms) this.postUniforms.uFlash.value = Math.max(this.postUniforms.uFlash.value, clamp(power / 900, .22, .82));
    this.react(player.index, "strike", choose(REACTIONS.strike), 520);
    this.beep((smash ? 410 : 260) + power * .38, smash ? .07 : .045, smash ? .04 : .026);
    this.noiseBurst(smash ? .075 : .045, (smash ? .03 : .018) + clamp(power / 12000, 0, .055), (smash ? 1100 : 720) + power * .35);
  }

  keeperImpact(player, x, z) {
    const power = Math.hypot(this.puck.vx, this.puck.vz);
    if (this.elapsed <= this.comboExpiresAt && this.puck.lastHitBy !== this.lastComboPlayer) this.comboCount = Math.min(9, this.comboCount + 1);
    else this.comboCount = 1;
    this.lastComboPlayer = player.index;
    this.comboExpiresAt = this.elapsed + 1.65;
    this.lastImpactPower = power;
    this.spawnBurst(x, 10, z, player.color, 10 + Math.round(power / 180), 105 + power * .07);
    this.spawnShock(x, z, player.color, 20 + power * .01);
    this.cameraShake = Math.max(this.cameraShake, 2.8 + power * .003);
    if (this.postUniforms) this.postUniforms.uFlash.value = Math.max(this.postUniforms.uFlash.value, clamp(power / 1500, .1, .4));
    this.react(player.index, "strike", choose(REACTIONS.strike), 380);
    this.beep(210 + power * .22, .038, .018);
    this.noiseBurst(.032, .01 + clamp(power / 22000, 0, .025), 560 + power * .2);
  }

  wallImpact(x, z) {
    this.spawnBurst(x, 12, z, "#a9efff", 7, 110);
    this.spawnShock(x, z, "#76ddff", 18);
    this.cameraShake = Math.max(this.cameraShake, 2.2);
    this.beep(180, .035, .018);
  }

  goalEffect(defender, scorer, testTriggered, capture) {
    const goalX = Math.cos(defender.angle) * (ARENA_RADIUS + 28);
    const goalZ = Math.sin(defender.angle) * (ARENA_RADIUS + 28);
    const effectColor = scorer?.color || PUCK_START_COLOR;
    this.spawnBurst(goalX, 15, goalZ, effectColor, 44, 300);
    this.spawnShock(goalX, goalZ, effectColor, 72);
    if (capture && scorer) {
      const territory = this.territories[capture.territoryIndex];
      const localIndex = territory.index % TERRITORY_PER_PLAYER;
      const angle = PLAYER_ANGLES[territory.homeIndex] - Math.PI / 3 + (localIndex + .5) * (Math.PI * 2 / TERRITORY_SECTOR_COUNT);
      const radius = (TERRITORY_INNER_RADIUS + TERRITORY_OUTER_RADIUS) * .5;
      this.spawnBurst(Math.cos(angle) * radius, 9, Math.sin(angle) * radius, scorer.color, 34, 210);
      this.spawnShock(Math.cos(angle) * radius, Math.sin(angle) * radius, scorer.color, 55);
    }
    this.cameraShake = 15;
    if (this.postUniforms) this.postUniforms.uFlash.value = 1;
    this.flashLights.push({ light: this.goalLights[defender.index], life: 1.1, maxLife: 1.1, peak: 82 });
    const counts = this.territoryCounts();
    this.showMessage(
      scorer ? (testTriggered ? "CAPTURE TEST" : "TERRITORY CAPTURE") : "NO COUNT",
      scorer ? `${scorer.name} ${counts[scorer.index]}/${TERRITORY_SECTOR_COUNT}` : "得点者なしのため\nノーカウント"
    );
    this.react(defender.index, "hurt", choose(REACTIONS.hurt), 900);
    if (scorer) this.react(scorer.index, "cheer", choose(REACTIONS.cheer), 900);
    this.root.querySelector(`[data-itl3-player="${defender.index}"]`)?.classList.add("is-hit");
    window.setTimeout(() => this.root.querySelector(`[data-itl3-player="${defender.index}"]`)?.classList.remove("is-hit"), 620);
    this.beep(520, .13, .07);
    window.setTimeout(() => this.beep(710, .18, .06), 95);
    window.setTimeout(() => this.beep(940, .22, .05), 185);
    this.noiseBurst(.16, .065, 980);
  }

  react(index, type, text, duration) {
    const character = this.root.querySelector(`[data-itl3-character="${index}"]`);
    if (!character) return;
    const bubble = character.querySelector("[data-itl3-bubble]");
    if (bubble) bubble.textContent = text;
    ["strike", "cheer", "hurt"].forEach(name => character.classList.remove(`is-${name}`));
    character.classList.add(`is-${type}`, "is-reacting");
    window.clearTimeout(character._itl3ReactionTimer);
    const avatar = this.avatarMeshes?.[index];
    if (avatar) {
      avatar.userData.reaction = duration / 1000;
      avatar.userData.reactionMax = duration / 1000;
      avatar.userData.reactionType = type;
    }
    character._itl3ReactionTimer = window.setTimeout(() => {
      character.classList.remove("is-reacting", `is-${type}`);
      if (!this.players[index]?.active) character.classList.add("is-out");
    }, duration);
  }

  showMessage(kicker, main) {
    if (!this.message) return;
    if (this.messageKicker) this.messageKicker.textContent = kicker;
    if (this.messageMain) this.messageMain.textContent = main;
    this.message.classList.remove("is-visible");
    void this.message.offsetWidth;
    this.message.classList.add("is-visible");
  }

  spawnBurst(x, y, z, color, count, force) {
    const tint = new THREE.Color(color);
    let created = 0;
    for (const particle of this.particles) {
      if (particle.life > 0) continue;
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(force * .42, force);
      particle.x = x;
      particle.y = y;
      particle.z = z;
      particle.vx = Math.cos(angle) * speed;
      particle.vz = Math.sin(angle) * speed;
      particle.vy = randomBetween(55, force * .7);
      particle.life = randomBetween(.32, .72);
      particle.maxLife = particle.life;
      particle.color.copy(tint).lerp(new THREE.Color(0xffffff), Math.random() * .32);
      created += 1;
      if (created >= count) break;
    }
  }

  resetSmashSmoke() {
    this.smashSmokeParticles?.forEach(smoke => {
      smoke.life = 0;
      smoke.sprite.visible = false;
      smoke.sprite.position.y = -1000;
      smoke.sprite.material.opacity = 0;
    });
    if (this.root) this.root.dataset.itl3MalletSmashSmokeActive = "0";
  }

  spawnSmashEmbers(backX, backZ) {
    const sideX = -backZ;
    const sideZ = backX;
    let created = 0;
    for (const particle of this.particles) {
      if (particle.life > 0) continue;
      const sideScatter = randomBetween(-6.5, 6.5);
      const rearDistance = PUCK_RADIUS * .72 + randomBetween(1, 8);
      particle.x = this.puck.x + backX * rearDistance + sideX * sideScatter;
      particle.y = randomBetween(6.5, 11.5);
      particle.z = this.puck.z + backZ * rearDistance + sideZ * sideScatter;
      const trailingSpeed = randomBetween(80, 175);
      const lateralSpeed = randomBetween(-55, 55);
      particle.vx = this.puck.vx * .12 + backX * trailingSpeed + sideX * lateralSpeed;
      particle.vz = this.puck.vz * .12 + backZ * trailingSpeed + sideZ * lateralSpeed;
      particle.vy = randomBetween(35, 105);
      particle.life = randomBetween(.22, .46);
      particle.maxLife = particle.life;
      particle.color.set(Math.random() < .4 ? "#fff18a" : (Math.random() < .68 ? "#ff8b19" : "#ff3b00"));
      created += 1;
      if (created >= 4) break;
    }
  }

  spawnSmashSmoke(backX, backZ) {
    const smoke = this.smashSmokeParticles?.find(item => item.life <= 0);
    if (!smoke) return;
    const sideX = -backZ;
    const sideZ = backX;
    const sideScatter = randomBetween(-7, 7);
    const rearDistance = PUCK_RADIUS + randomBetween(5, 14);
    smoke.life = randomBetween(.72, 1.18);
    smoke.maxLife = smoke.life;
    smoke.maxOpacity = randomBetween(.3, .48);
    smoke.startScale = randomBetween(9, 14);
    smoke.endScale = smoke.startScale * randomBetween(2.2, 3.15);
    smoke.vx = this.puck.vx * .08 + backX * randomBetween(38, 82) + sideX * randomBetween(-24, 24);
    smoke.vz = this.puck.vz * .08 + backZ * randomBetween(38, 82) + sideZ * randomBetween(-24, 24);
    smoke.vy = randomBetween(22, 48);
    smoke.spin = randomBetween(-1.8, 1.8);
    smoke.sprite.position.set(
      this.puck.x + backX * rearDistance + sideX * sideScatter,
      randomBetween(8, 12),
      this.puck.z + backZ * rearDistance + sideZ * sideScatter
    );
    smoke.sprite.scale.setScalar(smoke.startScale);
    smoke.sprite.material.color.set(Math.random() < .5 ? 0x6f7882 : 0x9099a2);
    smoke.sprite.material.opacity = 0;
    smoke.sprite.visible = true;
  }

  updateSmashSmoke(delta) {
    let activeCount = 0;
    this.smashSmokeParticles?.forEach(smoke => {
      if (smoke.life <= 0) {
        smoke.sprite.visible = false;
        return;
      }
      smoke.life = Math.max(0, smoke.life - delta);
      if (smoke.life <= 0) {
        smoke.sprite.visible = false;
        smoke.sprite.material.opacity = 0;
        return;
      }
      activeCount += 1;
      const progress = 1 - smoke.life / smoke.maxLife;
      smoke.vx *= Math.pow(.965, delta * 60);
      smoke.vz *= Math.pow(.965, delta * 60);
      smoke.vy += 8 * delta;
      smoke.sprite.position.x += smoke.vx * delta;
      smoke.sprite.position.y += smoke.vy * delta;
      smoke.sprite.position.z += smoke.vz * delta;
      const scale = THREE.MathUtils.lerp(smoke.startScale, smoke.endScale, progress);
      smoke.sprite.scale.setScalar(scale);
      smoke.sprite.material.rotation += smoke.spin * delta;
      const fadeIn = clamp(progress / .16, 0, 1);
      const fadeOut = clamp(smoke.life / .34, 0, 1);
      smoke.sprite.material.opacity = smoke.maxOpacity * fadeIn * fadeOut;
    });
    this.root.dataset.itl3MalletSmashSmokeActive = String(activeCount);
  }

  spawnShock(x, z, color, radius) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * .72, radius, 48),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: .82, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 2.8, z);
    this.scene.add(mesh);
    this.shockRings.push({ mesh, life: .42, maxLife: .42 });
  }

  updateSmashBurn(delta) {
    const wasActive = this.smashBurnVisualActive;
    this.smashBurnTime = Math.max(0, this.smashBurnTime - delta);
    const active = this.smashBurnTime > 0 && this.puck.visible;
    this.smashBurnVisualActive = active;
    this.root.dataset.itl3MalletSmashBurning = active ? "1" : "0";

    const speed = Math.hypot(this.puck.vx, this.puck.vz);
    if (active && speed > 30) {
      this.smashBurnDirectionX = this.puck.vx / speed;
      this.smashBurnDirectionZ = this.puck.vz / speed;
    }
    const backX = -this.smashBurnDirectionX;
    const backZ = -this.smashBurnDirectionZ;

    if (this.puckBurnGroup) {
      this.puckBurnGroup.visible = active;
      if (active) {
        const fade = clamp(this.smashBurnTime / .22, 0, 1);
        const intensity = .92 + clamp(speed / MAX_PUCK_SPEED, 0, 1) * .24;
        this.puckBurnGroup.position.set(this.puck.x, 8, this.puck.z);
        this.puckBurnWorldDirection.set(backX, 0, backZ).normalize();
        this.puckBurnGroup.quaternion.setFromUnitVectors(this.puckBurnLocalAxis, this.puckBurnWorldDirection);
        this.puckBurnGroup.userData.flames?.forEach((flame, index) => {
          const flicker = .86 + Math.sin(this.elapsed * (19 + index * 4) + flame.userData.phase) * .14;
          const sway = Math.sin(this.elapsed * (11 + index * 2) + flame.userData.phase);
          flame.scale.set(intensity * flicker, intensity * (1 + flicker * .2), intensity * flicker);
          flame.position.x = sway * (1.2 + index * .45);
          flame.position.z = Math.cos(this.elapsed * (13 + index) + flame.userData.phase) * (1 + index * .35);
          flame.position.y = flame.userData.baseDistance + sway * 1.4;
          flame.material.opacity = flame.userData.baseOpacity * fade * (.82 + flicker * .18);
        });
        const burnRing = this.puckBurnGroup.userData.ring;
        if (burnRing) {
          const ringPulse = 1 + Math.sin(this.elapsed * 24) * .16;
          burnRing.scale.setScalar(ringPulse + clamp(speed / MAX_PUCK_SPEED, 0, 1) * .25);
          burnRing.material.opacity = (.46 + Math.sin(this.elapsed * 20) * .14) * fade;
        }
      }
    }

    if (active) {
      this.root.dataset.itl3MalletSmashBurnDirection = `${backX.toFixed(3)},${backZ.toFixed(3)}`;
      this.smashBurnEmitClock += delta;
      while (this.smashBurnEmitClock >= MALLET_SMASH_EMIT_INTERVAL) {
        this.smashBurnEmitClock -= MALLET_SMASH_EMIT_INTERVAL;
        this.spawnSmashEmbers(backX, backZ);
      }
      this.smashSmokeEmitClock += delta;
      while (this.smashSmokeEmitClock >= MALLET_SMASH_SMOKE_INTERVAL) {
        this.smashSmokeEmitClock -= MALLET_SMASH_SMOKE_INTERVAL;
        this.spawnSmashSmoke(backX, backZ);
        if (Math.random() < .32) this.spawnSmashSmoke(backX, backZ);
      }
    } else if (wasActive) {
      this.smashBurnEmitClock = 0;
      this.smashSmokeEmitClock = 0;
      this.root.dataset.itl3MalletSmashBurnDirection = "none";
      this.setPuckOwner(this.puck.ownerIndex);
    }
  }

  updateTerritoryVisuals(delta) {
    const goalFlash = this.territoryGoalFlash;
    const goalFlashIntensity = this.territoryGoalFlashIntensity();
    const goalFlashColorMix = this.territoryGoalFlashColorMix();
    const goalFlashTerritoryIndex = goalFlash?.active ? goalFlash.territoryIndex : -1;
    this.root.dataset.itl3TerritoryGoalFlashIntensity = goalFlashIntensity.toFixed(3);
    this.root.dataset.itl3TerritoryGoalFlashColorMix = goalFlashColorMix.toFixed(3);
    this.territoryTiles?.forEach((tile, index) => {
      const targetColor = tile.userData.targetColor;
      const isChangedTile = index === goalFlashTerritoryIndex;
      const flashBoost = isChangedTile ? goalFlashIntensity : 0;
      const visualColor = tile.userData.visualColor || (tile.userData.visualColor = targetColor.clone());
      if (isChangedTile && goalFlash?.previousColor && goalFlash?.newColor) {
        visualColor.copy(goalFlash.previousColor).lerp(goalFlash.newColor, goalFlashColorMix);
      } else {
        visualColor.copy(targetColor);
      }
      if (flashBoost > 0 && goalFlash?.brightColor) visualColor.lerp(goalFlash.brightColor, flashBoost);
      tile.material.color.lerp(visualColor, clamp(delta * (flashBoost > 0 ? 22 : 7.5), 0, 1));
      tile.userData.pulse = Math.max(0, (tile.userData.pulse || 0) - delta * 1.35);
      const pulse = tile.userData.pulse;
      const neonWave = .5 + .5 * Math.sin(this.elapsed * 1.8 + index);
      tile.material.opacity = clamp(TERRITORY_PANEL_BASE_OPACITY + pulse * .22 + neonWave * .045 + flashBoost * .27, 0, 1);
      if (tile.userData.glow) {
        tile.userData.glow.material.color.lerp(visualColor, clamp(delta * (flashBoost > 0 ? 24 : 6.5), 0, 1));
        tile.userData.glow.material.opacity = clamp(TERRITORY_PANEL_GLOW_OPACITY + pulse * .18 + neonWave * .055 + flashBoost * .54, 0, .96);
        tile.userData.glow.scale.setScalar(1.022 + pulse * .012 + neonWave * .004 + flashBoost * .035);
      }
      if (tile.userData.border) {
        tile.userData.border.material.color.lerp(visualColor, clamp(delta * (flashBoost > 0 ? 26 : 9), 0, 1));
        tile.userData.border.material.opacity = clamp(TERRITORY_PANEL_BORDER_OPACITY - .035 + pulse * .045 + neonWave * .055, 0, 1);
      }
      tile.scale.setScalar(1 + pulse * .018 + flashBoost * .028);
    });
  }

  updateKickoffArrow(delta) {
    const arrow = this.kickoffArrow;
    if (!arrow) return;
    const recipient = Number.isInteger(this.kickoffRecipientIndex)
      ? this.players[this.kickoffRecipientIndex]
      : null;
    const countdownActive = this.countdown > 0;
    const launchActive = this.countdown <= 0
      && this.kickoffArrowLaunchUntil > 0
      && this.elapsed <= this.kickoffArrowLaunchUntil;
    const active = Boolean(this.running && !this.finished && recipient?.active && (countdownActive || launchActive));
    arrow.visible = active;
    this.root.dataset.itl3KickoffArrowVisible = active ? "1" : "0";
    this.root.dataset.itl3KickoffArrowPhase = active
      ? (countdownActive ? "countdown" : "launch")
      : "idle";
    if (!active) return;

    arrow.rotation.y = -recipient.angle;
    const pulseElapsed = countdownActive
      ? Math.max(0, this.kickoffCountdownDuration - this.countdown)
      : Math.max(0, this.elapsed - this.kickoffLaunchedAt);
    const wave = .5 + .5 * Math.sin(pulseElapsed * Math.PI * 6.5);
    const blink = .22 + wave * .78;
    const accent = new THREE.Color(recipient.color);
    arrow.userData.coreMaterial.color.copy(accent).lerp(new THREE.Color(0xffffff), .56);
    arrow.userData.glowMaterial.color.copy(accent);
    arrow.userData.ringMaterial.color.copy(accent).lerp(new THREE.Color(0xffffff), .2);
    arrow.userData.coreMaterial.opacity = .56 + blink * .44;
    arrow.userData.glowMaterial.opacity = .1 + blink * .34;
    arrow.userData.ringMaterial.opacity = .2 + blink * .58;
    arrow.userData.targetRing.scale.setScalar(.9 + blink * .25);
    arrow.userData.targetLight.color.copy(accent);
    arrow.userData.targetLight.intensity = 12 + blink * 38;
    arrow.scale.setScalar(.98 + blink * .045);
    arrow.position.y = 22 + wave * 2.5;
    this.root.dataset.itl3KickoffArrowPulse = blink.toFixed(3);
    this.root.dataset.itl3KickoffArrowDirection = `${Math.cos(recipient.angle).toFixed(3)},${Math.sin(recipient.angle).toFixed(3)}`;
  }

  updateVisuals(delta) {
    if (!(this.running && !this.finished && this.countdown <= 0)) {
      this.advanceCenterBlackTurntable(delta);
      this.advanceCenterPropellers(delta);
    } else {
      this.syncCenterBlackTurntable();
      this.syncCenterPropellerVisuals();
    }
    const speed = Math.hypot(this.puck.vx, this.puck.vz);
    if (this.speedValue) this.speedValue.textContent = String(Math.round(speed)).padStart(3, "0");
    if (this.speedBar) this.speedBar.style.width = `${clamp(speed / MAX_PUCK_SPEED * 100, 2, 100)}%`;
    if (this.comboHud) {
      const comboActive = this.comboCount > 1 && this.elapsed < this.comboExpiresAt;
      this.comboHud.classList.toggle("is-active", comboActive);
      const value = this.comboHud.querySelector("b span");
      if (value) value.textContent = String(Math.max(1, this.comboCount));
    }
    if (this.goalCinematic) this.goalCinematic.life = Math.max(0, this.goalCinematic.life - delta);
    const replaySample = this.goalReplaySample();
    if (this.postUniforms) {
      this.postUniforms.uTime.value = this.elapsed;
      this.postUniforms.uFlash.value = Math.max(0, this.postUniforms.uFlash.value - delta * 2.25);
    }
    if (this.floorUniforms) {
      this.floorUniforms.uTime.value = this.elapsed;
      this.floorUniforms.uPulse.value = clamp(speed / MAX_PUCK_SPEED, 0, 1);
    }
    this.updateTerritoryVisuals(delta);
    this.updateKickoffArrow(delta);
    this.updateWallSpringVisuals();
    if (this.skyDome?.material?.uniforms?.uTime) this.skyDome.material.uniforms.uTime.value = this.elapsed;
    if (this.starField) this.starField.rotation.y += delta * .005;
    this.energyRings?.forEach((ring, index) => {
      ring.rotation.z += delta * (index % 2 ? -.06 : .08);
      ring.material.emissiveIntensity = .7 + (index + 1) * .32 + Math.sin(this.elapsed * (1.2 + index * .22)) * .22;
    });
    this.holoPanels?.forEach((panel, index) => {
      panel.material.opacity = .11 + .09 * Math.max(0, Math.sin(this.elapsed * 1.4 + index));
    });
    const replayMalletStates = [];
    this.malletMeshes?.forEach((mesh, index) => {
      const player = this.players[index];
      const replayMallet = this.replayMalletAt(replaySample, index);
      if (replayMallet) {
        mesh.position.set(replayMallet.x, replayMallet.y, replayMallet.z);
        mesh.visible = replayMallet.active;
        mesh.rotation.set(replayMallet.rotationX, replayMallet.rotationY, replayMallet.rotationZ);
        if (mesh.userData.ring) mesh.userData.ring.scale.setScalar(replayMallet.ringScale);
        if (mesh.userData.underGlow) mesh.userData.underGlow.material.opacity = replayMallet.glowOpacity;
        replayMalletStates.push({
          index,
          x: Math.round(replayMallet.x * 100) / 100,
          z: Math.round(replayMallet.z * 100) / 100,
          vx: Math.round(replayMallet.vx * 100) / 100,
          vz: Math.round(replayMallet.vz * 100) / 100,
          rotationX: Math.round(replayMallet.rotationX * 100000) / 100000,
          rotationY: Math.round(replayMallet.rotationY * 100000) / 100000,
          rotationZ: Math.round(replayMallet.rotationZ * 100000) / 100000,
          active: replayMallet.active
        });
        return;
      }
      mesh.position.set(player.x, 0, player.z);
      mesh.visible = player.active;
      mesh.rotation.y += delta * (index === 0 ? 1.1 : .75);
      const malletSpeed = Math.hypot(player.vx, player.vz);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, clamp(player.vz / MALLET_MAX_SPEED, -.08, .08), .40);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, clamp(-player.vx / MALLET_MAX_SPEED, -.08, .08), .40);
      if (mesh.userData.ring) mesh.userData.ring.scale.setScalar(1 + Math.sin(this.elapsed * 5 + index) * .035 + malletSpeed / MALLET_MAX_SPEED * .08);
      if (mesh.userData.underGlow) mesh.userData.underGlow.material.opacity = .16 + malletSpeed / MALLET_MAX_SPEED * .32;
    });
    if (replaySample) {
      this.root.dataset.itl3GoalReplayMalletFrameIndex = String(replaySample.index);
      this.root.dataset.itl3GoalReplayMalletState = JSON.stringify(replayMalletStates);
    }
    if (this.puckMesh) {
      this.puckMesh.position.set(this.puck.x, 0, this.puck.z);
      this.puckMesh.visible = this.puck.visible;
      this.puckMesh.rotation.y += delta * (2.2 + speed * .012);
      const glowScale = 1 + clamp(speed / MAX_PUCK_SPEED, 0, 1) * .9;
      this.puckMesh.userData.glow?.scale.setScalar(glowScale);
      if (this.puckMesh.userData.glow) this.puckMesh.userData.glow.material.opacity = .14 + clamp(speed / MAX_PUCK_SPEED, 0, 1) * .34;
    }
    this.updateSmashBurn(delta);
    if (this.replayPuck) {
      if (replaySample?.replay?.path?.length > 2 && replaySample.replay.life > .12) {
        const point = replaySample.frame;
        const nextPoint = replaySample.nextFrame || point;
        this.replayPuck.position.set(
          THREE.MathUtils.lerp(point.x, nextPoint.x, replaySample.mix),
          10,
          THREE.MathUtils.lerp(point.z, nextPoint.z, replaySample.mix)
        );
        this.replayPuck.rotation.y += delta * 8;
        this.replayPuck.scale.setScalar(1.04 + Math.sin(this.elapsed * 18) * .025);
        this.replayPuck.material.opacity = 1;
        this.replayPuck.visible = true;
      } else {
        this.replayPuck.visible = false;
      }
    }
    if (this.puck.visible && (this.running || this.trailPoints.length)) {
      this.trailPoints.unshift({ x: this.puck.x, z: this.puck.z });
      if (this.trailPoints.length > PUCK_TRAIL_POINT_COUNT) this.trailPoints.length = PUCK_TRAIL_POINT_COUNT;
    }
    for (let i = 0; i < PUCK_TRAIL_POINT_COUNT; i += 1) {
      const point = this.trailPoints[i] || this.trailPoints[this.trailPoints.length - 1] || { x: this.puck.x, z: this.puck.z };
      this.trailPositions[i * 3] = point.x;
      this.trailPositions[i * 3 + 1] = 5 + (PUCK_TRAIL_POINT_COUNT - i) / PUCK_TRAIL_POINT_COUNT * PUCK_TRAIL_VERTICAL_SPAN;
      this.trailPositions[i * 3 + 2] = point.z;
    }
    this.trailGeometry?.attributes.position && (this.trailGeometry.attributes.position.needsUpdate = true);
    if (this.trail?.material) this.trail.material.opacity = clamp(speed / 800, .05, .82);
    if (this.trailGlow?.material) this.trailGlow.material.opacity = clamp(speed / 1500, .04, .42);

    this.gates?.forEach((gate, index) => {
      if (gate.portal?.material?.uniforms?.uTime) gate.portal.material.uniforms.uTime.value = this.elapsed + index;
      if (gate.badge) gate.badge.rotation.z += delta * (index % 2 ? -.8 : .8);
    });

    this.updateParticles(delta);
    this.updateSmashSmoke(delta);
    this.updateShocks(delta);
    this.updateGates(delta);
    this.updateLeds(delta);
    this.updateAvatarMeshes(delta, replaySample);
    this.updateCharacters();
    this.updateDebug();
  }

  avatarViewFor(player, avatar) {
    const viewerX = this.camera.position.x - avatar.position.x;
    const viewerZ = this.camera.position.z - avatar.position.z;
    const viewerAngle = Math.atan2(viewerZ, viewerX);
    const facingAngle = player.angle + Math.PI;
    const sector = Math.round(angleDifference(viewerAngle, facingAngle) / (Math.PI / 4));
    return AVATAR_VIEW_RING[(sector % AVATAR_VIEW_RING.length + AVATAR_VIEW_RING.length) % AVATAR_VIEW_RING.length];
  }

  updateAvatarMeshes(delta, replaySample = null) {
    const replayCharacterStates = [];
    this.avatarMeshes?.forEach((avatar, index) => {
      const player = this.players[index];
      const data = avatar.userData;
      const replayCharacter = this.replayCharacterAt(replaySample, index);
      const characterActive = typeof replayCharacter?.active === "boolean" ? replayCharacter.active : player.active;
      data.scanPlane.material.uniforms.uTime.value = this.elapsed + index * .7;
      data.neonShadow.material.uniforms.uTime.value = this.elapsed;
      const shadowPulse = 1 + Math.sin(this.elapsed * 2.2 + index * 1.73) * .035;
      data.neonShadow.scale.set(shadowPulse, shadowPulse, 1);
      data.light.intensity = characterActive ? CHARACTER_FACE_LIGHT_INTENSITY + Math.sin(this.elapsed * 2.3 + index) * 2.2 : 4;
      data.reaction = Math.max(0, Number(data.reaction || 0) - delta);
      const progress = data.reactionMax ? 1 - data.reaction / data.reactionMax : 0;
      let lift = 0;
      if (data.reaction > 0) {
        if (data.reactionType === "strike") lift += Math.sin(progress * Math.PI) * 16;
        if (data.reactionType === "cheer") lift += Math.abs(Math.sin(progress * Math.PI * 3)) * 22;
      }
      avatar.position.x = replayCharacter
        ? replayCharacter.x
        : (Number.isFinite(player.keeperX) ? player.keeperX : Math.cos(player.angle) * KEEPER_PATH_RADIUS);
      avatar.position.y = replayCharacter ? replayCharacter.y : lift;
      avatar.position.z = replayCharacter
        ? replayCharacter.z
        : (Number.isFinite(player.keeperZ) ? player.keeperZ : Math.sin(player.angle) * KEEPER_PATH_RADIUS);
      // Keep the complete character envelope inside the structural posts.
      // Lateral scaling/rolling made wide capes and wings visually penetrate
      // the frame even when the keeper's physical center was correctly clamped.
      avatar.scale.setScalar(replayCharacter ? replayCharacter.scale : characterActive ? 1 : .82);
      avatar.rotation.z = 0;
      avatar.visible = true;
      const requestedView = replayCharacter?.view || this.avatarViewFor(player, avatar);
      if (data.threeModel) {
        data.threeModel.visible = characterActive;
        data.threeModel.position.y = data.modelBaseY;
        if (data.threeModel.userData.continuous3d) {
          if (Number.isFinite(replayCharacter?.rotationY)) {
            // Use the pose from the same recorded frame as the puck. This
            // preserves keeper travel and puck tracking throughout the replay.
            data.threeModel.rotation.y = replayCharacter.rotationY;
            data.puckFacingOffset = replayCharacter.puckFacingOffset;
          } else {
            const baseFacingAngle = normalizeAngle(player.angle + Math.PI);
            const puckDx = this.puck.x - avatar.position.x;
            const puckDz = this.puck.z - avatar.position.z;
            const hasPuckDirection = this.puck.visible && Math.hypot(puckDx, puckDz) > 1;
            const puckFacingOffset = hasPuckDirection
              ? clamp(
                angleDifference(Math.atan2(puckDz, puckDx), baseFacingAngle),
                -KEEPER_PUCK_TRACK_HALF_ANGLE,
                KEEPER_PUCK_TRACK_HALF_ANGLE
              )
              : 0;
            const targetFacingAngle = baseFacingAngle + puckFacingOffset;
            const targetRotationY = Math.PI / 2 - targetFacingAngle;
            const facingBlend = 1 - Math.exp(-KEEPER_FACING_RESPONSE * delta);
            data.threeModel.rotation.y += angleDifference(targetRotationY, data.threeModel.rotation.y) * facingBlend;
            data.puckFacingOffset = puckFacingOffset;
          }
        } else {
          data.threeModel.rotation.y = 0;
          data.threeModel.userData.depthRing.rotation.z += delta * .7;
          data.threeModel.userData.depthRing.material.opacity = .13 + Math.sin(this.elapsed * 3.2 + index) * .05;
          data.threeModel.userData.viewMeshes.forEach((mesh, view) => {
            const activeView = view === requestedView && Boolean(mesh.material.map);
            mesh.visible = characterActive && activeView;
            mesh.material.opacity = activeView ? 1 : 0;
            if (activeView) {
              mesh.position.set(0, 78, 0);
              mesh.quaternion.copy(this.camera.quaternion);
            }
          });
          data.threeModel.userData.activeView = requestedView;
        }
      }
      data.plane.visible = Boolean(data.plane.material.map) && characterActive && !data.threeModel;
      data.fallback.visible = !data.plane.material.map && characterActive && !data.threeModel;
      data.scanPlane.visible = characterActive && !data.threeModel;
      const requestedTexture = data.directionalTextures?.get(requestedView);
      if (requestedTexture && data.activeAvatarView !== requestedView) {
        data.plane.material.map = requestedTexture;
        data.plane.material.needsUpdate = true;
        data.activeAvatarView = requestedView;
        data.texture = requestedTexture;
      }
      data.plane.quaternion.copy(this.camera.quaternion);
      data.scanPlane.quaternion.copy(this.camera.quaternion);
      if (!characterActive) {
        data.plane.visible = Boolean(data.plane.material.map) && !data.threeModel;
        data.plane.material.opacity = .2;
        data.fallback.visible = !data.plane.material.map && !data.threeModel;
        data.fallback.traverse(object => { if (object.material) object.material.transparent = true, object.material.opacity = .2; });
        if (data.threeModel) data.threeModel.visible = false;
      } else if (data.plane.material) {
        data.plane.material.opacity = 1;
        data.fallback.traverse(object => { if (object.material) { object.material.transparent = false; object.material.opacity = 1; } });
      }
      if (replayCharacter) {
        replayCharacterStates.push({
          index,
          x: Math.round(avatar.position.x * 100) / 100,
          y: Math.round(avatar.position.y * 100) / 100,
          z: Math.round(avatar.position.z * 100) / 100,
          rotationY: Number.isFinite(data.threeModel?.rotation?.y)
            ? Math.round(data.threeModel.rotation.y * 100000) / 100000
            : null
        });
      }
    });
    if (replaySample) {
      this.root.dataset.itl3GoalReplayCharacterFrameIndex = String(replaySample.index);
      this.root.dataset.itl3GoalReplayCharacterState = JSON.stringify(replayCharacterStates);
    }
    if (this.cameraMode === "goal" && this.goalCinematic && !this.goalCinematic.poseTelemetryRecorded) {
      this.goalCinematic.poseTelemetryRecorded = true;
      this.root.dataset.itl3GoalReplayAppliedFacingAngles = JSON.stringify((this.avatarMeshes || []).map(avatar => {
        const rotationY = avatar?.userData?.threeModel?.rotation?.y;
        return Number.isFinite(rotationY) ? Math.round(rotationY * 100000) / 100000 : null;
      }));
    }
  }

  updateParticles(delta) {
    this.particles?.forEach((particle, index) => {
      if (particle.life > 0) {
        particle.life -= delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.z += particle.vz * delta;
        particle.vx *= Math.pow(.94, delta * 60);
        particle.vz *= Math.pow(.94, delta * 60);
        particle.vy -= 420 * delta;
        if (particle.y < 2) { particle.y = 2; particle.vy *= -.28; }
      } else {
        particle.y = -1000;
      }
      this.particlePositions[index * 3] = particle.x;
      this.particlePositions[index * 3 + 1] = particle.y;
      this.particlePositions[index * 3 + 2] = particle.z;
      const alpha = particle.life > 0 ? clamp(particle.life / particle.maxLife, 0, 1) : 0;
      this.particleColors[index * 3] = particle.color.r * alpha;
      this.particleColors[index * 3 + 1] = particle.color.g * alpha;
      this.particleColors[index * 3 + 2] = particle.color.b * alpha;
    });
    if (this.particleGeometry) {
      this.particleGeometry.attributes.position.needsUpdate = true;
      this.particleGeometry.attributes.color.needsUpdate = true;
    }
  }

  updateShocks(delta) {
    this.shockRings = this.shockRings.filter(item => {
      item.life -= delta;
      const progress = 1 - item.life / item.maxLife;
      item.mesh.scale.setScalar(1 + progress * 2.7);
      item.mesh.material.opacity = clamp(1 - progress, 0, 1) * .82;
      if (item.life > 0) return true;
      this.scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
      return false;
    });
    this.flashLights = this.flashLights.filter(item => {
      item.life -= delta;
      item.light.intensity = 18 + Math.sin(clamp(item.life / item.maxLife, 0, 1) * Math.PI) * item.peak;
      if (item.life > 0) return true;
      item.light.intensity = 18;
      return false;
    });
  }

  updateGates(delta) {
    this.gates?.forEach((gate, index) => {
      const player = this.players[index];
      const direction = gate.target > player.gateProgress ? 1 : -1;
      if (Math.abs(gate.target - player.gateProgress) > .002) {
        player.gateProgress = clamp(player.gateProgress + direction * delta * 1.45, 0, 1);
        if (direction > 0 && player.gateProgress > .94 && !gate.sparked) {
          gate.sparked = true;
          this.spawnBurst(gate.gate.position.x, 16, gate.gate.position.z, "#d6f7ff", 24, 190);
        }
      }
      gate.gate.scale.x = .04 + player.gateProgress * .96;
      gate.gate.position.y = -20 + player.gateProgress * 37;
      const pulse = .92 + Math.sin(this.elapsed * 4.2 + index * 1.7) * .08;
      if (gate.beacon) {
        gate.beacon.scale.setScalar(pulse);
        gate.beacon.rotation.y += delta * 1.4;
      }
      gate.group.visible = true;
    });
  }

  updateLeds() {
    const pace = this.finished ? 4.2 : this.running ? 2.1 : .7;
    this.leds?.forEach(led => {
      const wave = .38 + .62 * Math.max(0, Math.sin(this.elapsed * pace - led.userData.phase * 2.2));
      led.material.opacity = .25 + wave * .75;
      led.scale.setScalar(.75 + wave * .5);
      const hue = (this.elapsed * .045 + led.userData.phase / (Math.PI * 2)) % 1;
      led.material.color.setHSL(hue, .78, .64);
    });
  }

  updateCharacters() {
    if (!this.renderer || !this.camera) return;
    const rect = this.canvas.getBoundingClientRect();
    this.players.forEach(player => {
      const element = this.root.querySelector(`[data-itl3-character="${player.index}"]`);
      if (!element) return;
      const avatar = this.avatarMeshes?.[player.index];
      const labelAnchorY = avatar?.userData?.labelAnchorY ?? 142;
      const world = avatar ? avatar.localToWorld(new THREE.Vector3(0, labelAnchorY, 0)) : new THREE.Vector3(Math.cos(player.angle) * AVATAR_RING_RADIUS, labelAnchorY, Math.sin(player.angle) * AVATAR_RING_RADIUS);
      const distance = this.camera.position.distanceTo(world);
      world.project(this.camera);
      const left = (world.x * .5 + .5) * rect.width;
      const top = (-world.y * .5 + .5) * rect.height;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.setProperty("--itl3-depth", String(clamp(680 / distance, .74, 1.06)));
      element.style.zIndex = String(Math.round(80 - world.z * 30));
      element.classList.toggle("is-out", !player.active);
    });
  }

  updateDebug() {
    const malletGoalProjections = this.players.map(player => (
      player.x * Math.cos(player.angle) + player.z * Math.sin(player.angle)
    ));
    this.root.dataset.itl3MalletGoalProjections = malletGoalProjections.map(value => value.toFixed(2)).join(",");
    this.root.dataset.itl3MalletGoalCapSatisfied = malletGoalProjections.every(
      (value, index) => value <= this.players[index].malletGoalSideMaxProjection + .05
    ) ? "1" : "0";
    if (!this.debugOutput) return;
    const cpu = this.players.slice(1).map(player => `CPU${player.index}:${player.brain.state}/${player.brain.lastDecision}`).join(" | ");
    this.debugOutput.textContent = `${cpu} | puck ${Math.round(this.puck.x)},${Math.round(this.puck.z)}`;
  }

  renderScene() {
    if (!this.renderer || !this.scene || !this.camera) return;
    const portrait = Boolean(this.camera.userData.portrait);
    const targetPosition = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    let fov = portrait ? 47 : 40;
    if (this.cameraMode === "attract") {
      const orbit = this.elapsed * .115 - .35;
      const distance = portrait ? 900 : 735;
      targetPosition.set(Math.sin(orbit) * distance * .3, portrait ? 760 : 555, Math.cos(orbit) * distance);
      lookTarget.set(0, 18, -28);
      fov = portrait ? 44 : 37;
    } else if (this.cameraMode === "countdown") {
      const countdownIntroSeconds = clamp(this.kickoffCountdownDuration * .38, .52, .76);
      const intro = clamp(this.cameraModeTime / countdownIntroSeconds, 0, 1);
      targetPosition.set(THREE.MathUtils.lerp(260, 0, intro), THREE.MathUtils.lerp(portrait ? 900 : 720, portrait ? 890 : 710, intro), THREE.MathUtils.lerp(portrait ? 990 : 880, portrait ? 960 : 810, intro));
      lookTarget.set(0, THREE.MathUtils.lerp(20, 0, intro), -20);
      fov = THREE.MathUtils.lerp(42, portrait ? 47 : 40, intro);
    } else if (this.cameraMode === "goal" && this.goalCinematic) {
      const defender = this.players[this.goalCinematic.defenderIndex];
      const normalX = Math.cos(defender.angle);
      const normalZ = Math.sin(defender.angle);
      const tangentX = -normalZ;
      const tangentZ = normalX;
      const phase = 1 - this.goalCinematic.life / this.goalCinematic.maxLife;
      const side = this.goalCinematic.defenderIndex % 2 ? -1 : 1;
      const goalFocusRadius = ARENA_RADIUS - 35;
      const rearCameraRadius = (portrait ? 660 : 565) + GOAL_REPLAY_CAMERA_PULLBACK;
      // Mirror the former behind-the-net camera across the goal focus point.
      // This preserves framing while showing the replay from the field side.
      const fieldSideCameraRadius = goalFocusRadius * 2 - rearCameraRadius;
      targetPosition.set(
        normalX * fieldSideCameraRadius + tangentX * side * 145 * Math.sin(phase * Math.PI),
        (portrait ? 390 : 275) + GOAL_REPLAY_CAMERA_HEIGHT_LIFT,
        normalZ * fieldSideCameraRadius + tangentZ * side * 145 * Math.sin(phase * Math.PI)
      );
      lookTarget.set(normalX * goalFocusRadius, 18, normalZ * goalFocusRadius);
      fov = portrait ? 46 : 42;
    } else if (this.cameraMode === "territory-flash" && this.territoryGoalFlash) {
      const scorer = this.players[this.territoryGoalFlash.scorerIndex];
      const viewAngle = (scorer?.angle ?? 0) + Math.PI;
      const viewRadius = portrait ? 540 : 460;
      targetPosition.set(Math.cos(viewAngle) * viewRadius, portrait ? 930 : 735, Math.sin(viewAngle) * viewRadius);
      lookTarget.set(0, 0, 0);
      fov = portrait ? 49 : 43;
    } else if (this.cameraMode === "victory" && this.victoryFocus) {
      const winner = this.players[this.victoryFocus.index];
      const orbit = this.cameraModeTime * .5 + winner.angle;
      const distance = portrait ? 720 : 560;
      targetPosition.set(Math.cos(orbit) * distance, portrait ? 560 : 360, Math.sin(orbit) * distance);
      lookTarget.set(Math.cos(winner.angle) * 150, 65, Math.sin(winner.angle) * 150);
      fov = portrait ? 45 : 39;
    } else {
      const puckInfluence = this.puck.visible ? .12 : 0;
      const lateral = this.puck.x * puckInfluence;
      const depth = this.puck.z * puckInfluence;
      // Frame all three goal mouths during normal play, including the
      // near-side goal that used to fall below the viewport.
      targetPosition.set(lateral, portrait ? 890 : 710, (portrait ? 960 : 810) + depth * .15);
      lookTarget.set(this.puck.x * .055, 0, -12 + this.puck.z * .03);
    }
    if (this.cameraShake > .05) {
      const amount = this.cameraShake;
      targetPosition.x += randomBetween(-amount, amount);
      targetPosition.y += randomBetween(-amount * .25, amount * .25);
      targetPosition.z += randomBetween(-amount, amount);
      this.cameraShake *= .8;
    }
    this.camera.position.lerp(targetPosition, this.cameraMode === "goal" || this.cameraMode === "territory-flash" ? .12 : .075);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, .1);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(lookTarget);
    if (this.sceneTarget && this.postScene && this.postCamera) {
      this.renderer.setRenderTarget(this.sceneTarget);
      this.renderArenaWithOpaqueCharacters();
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderArenaWithOpaqueCharacters();
    }
  }

  renderArenaWithOpaqueCharacters() {
    const previousLayerMask = this.camera.layers.mask;
    const previousAutoClear = this.renderer.autoClear;
    const previousShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    try {
      this.camera.layers.set(0);
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
      if (this.avatarMeshes?.some(avatar => avatar.userData.threeModel?.visible)) {
        this.renderer.autoClear = false;
        this.renderer.shadowMap.autoUpdate = false;
        this.camera.layers.set(CHARACTER_OPAQUE_LAYER);
        this.renderer.render(this.scene, this.camera);
      }
    } finally {
      this.camera.layers.mask = previousLayerMask;
      this.renderer.autoClear = previousAutoClear;
      this.renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
    }
  }

  resize() {
    if (!this.renderer || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    const width = this.previewOnly ? Math.max(1, Math.round(rect.width)) : Math.max(320, Math.round(rect.width));
    const height = this.previewOnly ? Math.max(1, Math.round(rect.height)) : Math.max(420, Math.round(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const portrait = height > width * 1.12;
    this.camera.userData.portrait = portrait;
    this.cameraBase.set(0, portrait ? 890 : 710, portrait ? 960 : 810);
    this.camera.fov = portrait ? 47 : 40;
    this.camera.updateProjectionMatrix();
    if (this.sceneTarget && this.postUniforms) {
      const drawingSize = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.sceneTarget.setSize(Math.max(1, drawingSize.x), Math.max(1, drawingSize.y));
      this.postUniforms.uResolution.value.copy(drawingSize);
    }
  }

  stopPlayerMalletMotion() {
    const player = this.players[0];
    if (!player) return;
    player.targetX = player.x;
    player.targetZ = player.z;
    player.vx = 0;
    player.vz = 0;
    this.playerMalletReleaseCount += 1;
    this.root.dataset.itl3PlayerMalletReleaseSpeed = "0.00";
    this.root.dataset.itl3PlayerMalletReleaseCount = String(this.playerMalletReleaseCount);
  }

  onPointerDown(event) {
    if (!this.running || this.finished || this.countdown > 0 || !this.players[0].active) return;
    this.resumeAudio();
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.updatePointerTarget(event);
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    this.updatePointerTarget(event);
    event.preventDefault();
  }

  onPointerUp(event) {
    if (this.pointerId != null && event.pointerId !== this.pointerId) return;
    const wasDragging = this.dragging;
    this.dragging = false;
    if (wasDragging) this.stopPlayerMalletMotion();
    try { if (this.pointerId != null) this.canvas.releasePointerCapture?.(this.pointerId); } catch (_) {}
    this.pointerId = null;
  }

  updatePointerTarget(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.controlPlane, this.pointerWorld)) return;
    const player = this.players[0];
    const target = this.constrainToSector(player, this.pointerWorld.x, this.pointerWorld.z);
    player.targetX = target.x;
    player.targetZ = target.z;
  }

  resolveTimeWinner() {
    const counts = this.territoryCounts();
    return [...this.players].sort((a, b) => counts[b.index] - counts[a.index] || b.goalsFor - a.goalsFor || a.index - b.index)[0];
  }

  finishMatch(winner, reason) {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.puck.vx = 0;
    this.puck.vz = 0;
    this.cameraMode = "victory";
    this.cameraModeTime = 0;
    this.victoryFocus = { index: winner.index };
    this.showMessage("TERRITORY COMPLETE", `${winner.name} WIN!`);
    this.react(winner.index, "cheer", "勝ったよ！", 2400);
    this.spawnVictory(winner);
    this.beep(620, .16, .07);
    window.setTimeout(() => this.beep(820, .22, .065), 140);
    const record = this.createRecord(winner, reason);
    if (!this.testMode && this.onRecord) {
      try { this.onRecord(this.serializableRecord(record)); } catch (error) { console.warn("Tri-Link memory save failed", error); }
      this.memories = [record, ...this.memories].slice(0, 12);
      this.renderMemories();
    }
    window.setTimeout(() => {
      if (!this.destroyed) this.presentResult(record);
    }, 1050);
  }

  spawnVictory(winner) {
    for (let i = 0; i < 6; i += 1) {
      window.setTimeout(() => {
        if (this.destroyed) return;
        const angle = randomBetween(-Math.PI, Math.PI);
        const radius = randomBetween(35, 250);
        const color = i % 2 ? winner.color : choose(FALLBACK_COLORS);
        this.spawnBurst(Math.cos(angle) * radius, randomBetween(30, 80), Math.sin(angle) * radius, color, 24, randomBetween(180, 330));
      }, i * 120);
    }
  }

  createRecord(winner, reason) {
    const playedAt = Date.now();
    const duration = Math.round(this.overtime ? Math.max(MATCH_SECONDS, this.elapsed - 3.35) : MATCH_SECONDS - this.timeRemaining);
    const territoryCounts = this.territoryCounts();
    const path = this.decisivePath.map(point => ({
      x: Math.round(clamp((point.x + ARENA_RADIUS) / (ARENA_RADIUS * 2) * 100, 0, 100) * 10) / 10,
      y: Math.round(clamp((point.z + ARENA_RADIUS) / (ARENA_RADIUS * 2) * 100, 0, 100) * 10) / 10
    }));
    return {
      id: this.matchId,
      playedAt,
      savedAt: playedAt,
      winnerId: winner.id,
      winnerName: winner.name,
      resultLabel: `${winner.name} 勝利`,
      reason,
      duration,
      durationSeconds: duration,
      rule: "territory-goal",
      territoryTotal: TERRITORY_SECTOR_COUNT,
      winnerTerritory: territoryCounts[winner.index],
      participants: this.players.map(player => ({ id: player.id, name: player.name, role: player.role, roleLabel: player.roleLabel, art: player.art, appearance: { ...player.appearance }, color: player.color, lives: player.lives, goalsFor: player.goalsFor, territory: territoryCounts[player.index], territoryCaptured: player.territoryCaptured, territoryLost: player.territoryLost })),
      result: this.players.map(player => ({ id: player.id, lives: player.lives, goalsFor: player.goalsFor, territory: territoryCounts[player.index] })),
      territories: this.territories.map(territory => ({ index: territory.index, homeIndex: territory.homeIndex, ownerIndex: territory.ownerIndex })),
      decisivePath: this.decisivePath.map(point => ({ x: Math.round(point.x), z: Math.round(point.z) })),
      path
    };
  }

  serializableRecord(record) {
    return {
      ...record,
      participants: record.participants.map(({ art, ...participant }) => participant)
    };
  }

  presentResult(record) {
    this.root.querySelector("[data-itl3-result]")?.remove();
    const panel = document.createElement("div");
    panel.className = "itl3-result";
    panel.dataset.itl3Result = "";
    panel.innerHTML = `<div class="itl3-result-card"><div class="itl3-result-rank">TERRITORY RESULT <b>01</b></div><small>COMMEMORATIVE MATCH CARD</small><h2>${escapeHtml(record.winnerName)}<em>TERRITORY CHAMPION</em></h2><p>${escapeHtml(formatDate(record.playedAt))}　//　${escapeHtml(record.reason)}</p><div class="itl3-photo">${record.participants.map((participant, index) => `<div class="itl3-photo-person${participant.id === record.winnerId ? " is-winner" : ""}"><span>0${index + 1}</span><div>${participant.art || fallbackArt(participant.name, participant.color)}</div><strong>${escapeHtml(participant.name)}</strong><small>AREA ${Number(participant.territory) || 0}/${record.territoryTotal || TERRITORY_SECTOR_COUNT}</small></div>`).join("")}</div><div class="itl3-result-actions"><button type="button" class="itl3-primary" data-itl3-rematch><span>REPLAY</span><b>もう一度対戦</b><i>›</i></button><button type="button" class="itl3-secondary" data-itl3-close-result>アリーナを見る</button></div></div>`;
    this.stage.appendChild(panel);
    panel.querySelector("[data-itl3-rematch]")?.addEventListener("click", () => this.startMatch());
    panel.querySelector("[data-itl3-close-result]")?.addEventListener("click", () => panel.remove());
  }

  renderMemories() {
    if (!this.memoryList) return;
    if (!this.memories.length) {
      this.memoryList.innerHTML = '<div class="itl3-memory-empty">最初の試合を終えると、3人の記念写真風カードがここに残ります。</div>';
      return;
    }
    this.memoryList.innerHTML = this.memories.slice(0, 12).map(memory => {
      const winnerName = memory?.winnerName || memory?.winner?.name || String(memory?.resultLabel || "記録された相棒").replace(/\s*勝利$/, "");
      const reason = memory?.reason || "TRI-LINK MATCH";
      const territory = Number(memory?.winnerTerritory);
      const territoryLabel = Number.isFinite(territory) ? `　AREA ${territory}/${Number(memory?.territoryTotal) || TERRITORY_SECTOR_COUNT}` : "";
      return `<article class="itl3-memory-card"><strong>${escapeHtml(winnerName)} WIN</strong><span>${escapeHtml(formatDate(memory?.playedAt || memory?.savedAt))}　${escapeHtml(reason)}${escapeHtml(territoryLabel)}</span></article>`;
    }).join("");
  }

  updateScoreboard() {
    const standing = this.territoryStanding();
    const uniqueLeaderIndex = standing.leaders.length === 1 ? standing.leaders[0].index : -1;
    this.players.forEach(player => {
      const card = this.root.querySelector(`[data-itl3-player="${player.index}"]`);
      if (!card) return;
      card.classList.remove("is-out");
      card.classList.toggle("is-leader", player.index === uniqueLeaderIndex);
      const count = standing.counts[player.index];
      const countNode = card.querySelector("[data-itl3-territory-count]");
      const bar = card.querySelector("[data-itl3-territory-bar]");
      if (countNode) countNode.textContent = String(count);
      if (bar) bar.style.width = `${count / TERRITORY_SECTOR_COUNT * 100}%`;
    });
  }

  resumeAudio() {
    try {
      if (!this.audioContext) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioCtor) this.audioContext = new AudioCtor();
      }
      this.audioContext?.resume?.();
    } catch (_) {
      this.audioContext = null;
    }
  }

  beep(frequency, duration, volume) {
    if (!this.audioContext || this.audioContext.state !== "running") return;
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = frequency < 200 ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(clamp(frequency, 70, 1400), now);
    oscillator.frequency.exponentialRampToValueAtTime(clamp(frequency * 1.08, 70, 1600), now + duration);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .015);
  }

  noiseBurst(duration, volume, frequency) {
    if (!this.audioContext || this.audioContext.state !== "running") return;
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = Math.max(32, Math.floor(sampleRate * duration));
    const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) channel[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    const source = this.audioContext.createBufferSource();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    filter.type = "bandpass";
    filter.frequency.value = clamp(frequency, 140, 4200);
    filter.Q.value = 1.2;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, this.audioContext.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.audioContext.destination);
    source.start();
  }

  debugSnapshot() {
    return {
      mode: "modern-three-dimensional-arena",
      rendering: "three.js-webgl-postprocessed",
      rule: "territory-goal",
      charactersVisible: this.players.length,
      running: this.running,
      finished: this.finished,
      overtime: this.overtime,
      timeRemaining: Math.round(this.timeRemaining * 100) / 100,
      puck: { x: Math.round(this.puck.x), z: Math.round(this.puck.z), speed: Math.round(Math.hypot(this.puck.vx, this.puck.vz)), lastHitBy: this.puck.lastHitBy, ownerIndex: this.puck.ownerIndex, color: this.root.dataset.itl3PuckColor },
      serve: {
        rule: "countdown-initial-random-monster-then-conceding-player",
        sequence: this.serveSequence,
        mode: this.root.dataset.itl3ServeMode,
        recipientIndex: this.lastServeRecipientIndex,
        pendingRecipientIndex: this.pendingServeRecipientIndex,
        countdown: {
          active: this.countdown > 0,
          duration: this.kickoffCountdownDuration,
          stage: this.root.dataset.itl3KickoffCountdownStage,
          source: this.kickoffSource,
          recipientIndex: this.kickoffRecipientIndex,
          arrowVisible: this.root.dataset.itl3KickoffArrowVisible === "1",
          arrowDirection: this.root.dataset.itl3KickoffArrowDirection,
          turntableSync: {
            mode: this.root.dataset.itl3KickoffTurntableSyncMode,
            state: this.root.dataset.itl3KickoffTurntableSyncState,
            startDelay: Number(this.root.dataset.itl3KickoffTurntableStartDelay || 0),
            countdownAngularSpeed: Number(this.root.dataset.itl3KickoffTurntableCountdownSpeed || 0),
            serveFlightSeconds: Number(this.root.dataset.itl3KickoffTurntableFlightSeconds || 0),
            predictedClearanceDegrees: Number(this.root.dataset.itl3KickoffTurntablePredictedClearanceDegrees || 0),
            requiredClearanceDegrees: Number(this.root.dataset.itl3KickoffTurntableRequiredClearanceDegrees || 0)
          },
          firstTerritory: {
            expectedIndex: this.kickoffExpectedTerritoryIndex,
            actualIndex: this.root.dataset.itl3KickoffFirstTerritory === "none"
              ? null
              : Number(this.root.dataset.itl3KickoffFirstTerritory),
            matched: this.root.dataset.itl3KickoffFirstTerritoryMatched,
            propellerHitBeforeEntry: this.root.dataset.itl3KickoffPropellerHitBeforeTerritory
          },
          entryHistory: this.kickoffEntryHistory.map(entry => ({ ...entry }))
        },
        lastGoalDefenderIndex: this.root.dataset.itl3LastGoalDefender === "none" ? null : Number(this.root.dataset.itl3LastGoalDefender),
        direction: [
          Math.round(this.lastServeDirectionX * 1000) / 1000,
          Math.round(this.lastServeDirectionZ * 1000) / 1000
        ],
        recipientAlignment: this.lastServeRecipientIndex == null ? null : Math.round((
          this.lastServeDirectionX * Math.cos(this.players[this.lastServeRecipientIndex].angle)
          + this.lastServeDirectionZ * Math.sin(this.players[this.lastServeRecipientIndex].angle)
        ) * 1000) / 1000
      },
      touchHistory: [...this.touchHistory],
      territoryCounts: this.territoryCounts(),
      territoryOwners: this.territories.map(territory => territory.ownerIndex),
      characterAbilities: {
        selfTest: characterAbilitySystemSelfTest(),
        players: this.players.map(player => {
          const liveKeeper = this.effectiveKeeperTuning(player);
          return {
            index: player.index,
            characterId: player.characterDescriptor?.id || null,
            characterName: player.characterDescriptor?.name || player.name,
            bodyProfile: player.characterDescriptor?.profileKey || null,
            tier: player.abilityProfile.tier,
            profile: player.abilityProfile.key,
            abilities: characterAbilityNames(player.abilityProfile),
            malletRange: {
              minRadius: player.malletMinRadius,
              maxRadius: player.malletMaxRadius,
              goalSideProjection: player.malletGoalSideMaxProjection,
              halfSectorDegrees: player.malletHalfSector * 180 / Math.PI
            },
            liveKeeper: {
              response: liveKeeper.response,
              acceleration: liveKeeper.acceleration,
              topSpeed: liveKeeper.topSpeed,
              powerReturn: liveKeeper.powerReturn,
              situational: liveKeeper.activeSituationalAbilities
            },
            liveMallet: player.activeMalletAbilityEffects || []
          };
        })
      },
      players: this.players.map(player => ({ index: player.index, name: player.name, active: player.active, lives: player.lives, goalsFor: player.goalsFor, territory: this.territoryCounts()[player.index], x: Math.round(player.x), z: Math.round(player.z), speed: Math.round(Math.hypot(player.vx, player.vz) * 100) / 100, aiState: player.brain?.state || "human-control", aiDecision: player.brain?.lastDecision || "pointer" })),
      keepers: this.players.map(player => ({
        index: player.index,
        x: Math.round(player.keeperX),
        z: Math.round(player.keeperZ),
        offset: Math.round(player.keeperOffset * 10) / 10,
        targetOffset: Math.round((player.keeperTargetOffset || 0) * 10) / 10,
        tracking: Boolean(player.keeperTracking?.shouldTrack),
        goalwardThreat: Boolean(player.keeperTracking?.goalwardThreat),
        speed: Math.round(Math.abs(player.keeperVelocity) * 10) / 10,
        hits: player.keeperHitCount
      })),
      keeperForceRatio: KEEPER_FORCE_RATIO,
      reboundTuning: {
        normalWall: WALL_RESTITUTION,
        mallet: MALLET_RESTITUTION,
        smashMallet: MALLET_SMASH_RESTITUTION,
        keeper: KEEPER_RESTITUTION,
        keeperVelocityTransfer: KEEPER_VELOCITY_TRANSFER,
        retractedSpring: WALL_SPRING_RETRACTED_RESTITUTION,
        retractedSpringMinKick: WALL_SPRING_RETRACTED_MIN_KICK,
        extendedSpring: WALL_SPRING_RESTITUTION,
        extendedSpringMinKick: WALL_SPRING_PUCK_MIN_KICK,
        impactSpring: WALL_SPRING_IMPACT_RESTITUTION,
        impactSpringMinKick: WALL_SPRING_IMPACT_MIN_KICK,
        strongCenterPropeller: CENTER_PROPELLER_STRONG_RESTITUTION,
        strongCenterPropellerMinKick: CENTER_PROPELLER_STRONG_MIN_KICK,
        weakCenterPropeller: CENTER_PROPELLER_WEAK_RESTITUTION,
        weakCenterPropellerMinKick: CENTER_PROPELLER_WEAK_MIN_KICK,
        maxPuckSpeed: MAX_PUCK_SPEED
      },
      smash: {
        count: this.smashCount,
        burning: this.smashBurnTime > 0,
        burnRemaining: Math.round(this.smashBurnTime * 1000) / 1000,
        burnMode: "rear-trailing-fire-smoke",
        burnDirection: [Math.round(-this.smashBurnDirectionX * 1000) / 1000, Math.round(-this.smashBurnDirectionZ * 1000) / 1000],
        activeSmoke: this.smashSmokeParticles?.filter(smoke => smoke.life > 0).length || 0,
        lastSmashBy: this.lastSmashBy,
        lastSmashPower: this.lastSmashPower,
        restitution: MALLET_SMASH_RESTITUTION,
        multiplier: Math.round(MALLET_SMASH_RESTITUTION / MALLET_RESTITUTION * 100) / 100,
        minSpeed: MALLET_SMASH_MIN_SPEED,
        minAlignment: MALLET_SMASH_MIN_ALIGNMENT,
        minClosingSpeed: MALLET_SMASH_MIN_CLOSING_SPEED
      },
      wallSprings: {
        mode: "goal-safe-puck-and-mallet",
        intervalSeconds: WALL_SPRING_INTERVAL,
        count: this.wallSprings?.length || 0,
        extension: Math.round((this.wallSpringExtension || 0) * 10) / 10,
        activations: this.wallSpringActivationCount,
        hits: this.wallSpringHitCount,
        puckHits: this.wallSpringPuckHitCount,
        malletHits: this.wallSpringMalletHitCount,
        selfTest: this.wallSpringSelfTest()
      },
      centerPropellers: {
        mode: "three-arm-automatic-physical",
        count: this.centerPropellers?.length || 0,
        phase: this.root.dataset.itl3CenterPropellerPhase,
        direction: this.root.dataset.itl3CenterPropellerDirection,
        strength: this.root.dataset.itl3CenterPropellerStrength,
        angularVelocity: Math.round(this.centerPropellerAngularVelocity * 1000) / 1000,
        targetVelocity: Number(this.root.dataset.itl3CenterPropellerTargetVelocity || 0),
        hitCount: this.centerPropellerHitCount,
        lastHitIndex: this.centerPropellerLastHitIndex,
        positions: (this.centerPropellers || []).map(propeller => ({ x: propeller.x, z: propeller.z })),
        sequence: CENTER_PROPELLER_SEQUENCE.map(phase => ({
          id: phase.id,
          direction: phase.direction,
          strength: phase.strength,
          duration: phase.duration,
          speed: phase.speed
        })),
        selfTest: this.centerPropellerSelfTest()
      },
      goalPhysics: {
        postHits: this.goalPostHitCount,
        innerPostCaptures: this.goalPostInnerCaptureCount,
        keeperBypasses: this.goalPostKeeperBypassCount,
        cornerApproaches: this.goalCornerApproachCount,
        cornerApproachRecoveries: this.goalCornerApproachRecoveryCount,
        acceptedGoals: this.goalAcceptedCount,
        puckCenterHalfWidth: Math.round(GOAL_PUCK_CENTER_HALF_WIDTH * 100) / 100,
        minimumVisibleCornerOverlap: GOAL_POST_MIN_VISIBLE_CORNER_OVERLAP,
        visibleCornerCenterHalfWidth: Math.round(GOAL_POST_VISIBLE_CORNER_CENTER_HALF_WIDTH * 100) / 100,
        cornerApproachSeconds: GOAL_CORNER_APPROACH_SECONDS,
        cornerApproachMinRadialRatio: GOAL_CORNER_APPROACH_MIN_RADIAL_RATIO,
        innerCaptureMinSpeed: GOAL_POST_INNER_CAPTURE_MIN_SPEED,
        scoreRadial: Math.round(GOAL_SCORE_RADIAL * 100) / 100,
        selfTest: this.goalPhysicsSelfTest()
      },
      activeParticles: this.particles?.filter(particle => particle.life > 0).length || 0,
      avatarTextures: this.avatarMeshes?.filter(avatar => avatar.userData.texture).length || 0,
      avatar3d: this.avatarMeshes?.map(avatar => Boolean(avatar.userData.threeModel)) || [],
      avatar360Ids: this.avatarMeshes?.map(avatar => avatar.userData.character360Id || null) || [],
      avatar360Stages: this.avatarMeshes?.map(avatar => avatar.userData.character360Stage || null) || [],
      avatarErrors: this.avatarMeshes?.map(avatar => avatar.userData.loadError || null) || [],
      gatesClosed: 0
    };
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas?.removeEventListener("pointerdown", this.onPointerDownBound);
    this.canvas?.removeEventListener("pointermove", this.onPointerMoveBound);
    this.canvas?.removeEventListener("pointerup", this.onPointerUpBound);
    this.canvas?.removeEventListener("pointercancel", this.onPointerUpBound);
    this.canvas?.removeEventListener("lostpointercapture", this.onPointerUpBound);
    this.canvas?.removeEventListener("contextmenu", this.onContextMenuBound);
    this.root.querySelectorAll("[data-itl3-character]").forEach(element => window.clearTimeout(element._itl3ReactionTimer));
    this.audioContext?.close?.().catch?.(() => {});
    if (this.scene) {
      this.scene.traverse(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach(material => material?.dispose?.());
        else object.material?.dispose?.();
      });
    }
    this.avatarMeshes?.forEach(avatar => {
      avatar.userData.directionalTextures?.forEach(texture => texture.dispose?.());
      if (!avatar.userData.directionalTextures?.size) avatar.userData.texture?.dispose?.();
    });
    this.smashSmokeTexture?.dispose?.();
    this.sceneTarget?.dispose?.();
    this.postQuad?.geometry?.dispose?.();
    this.postQuad?.material?.dispose?.();
    this.renderer?.dispose?.();
    this.root.innerHTML = "";
  }
}

window.ImasoraTriLink = Object.freeze({
  mount(root, options = {}) {
    if (!root) return;
    if (mountedGame) mountedGame.destroy();
    mountedGame = new ImasoraTriLink3D(root, options);
    mountedGame.mount();
  },
  unmount() {
    if (!mountedGame) return;
    mountedGame.destroy();
    mountedGame = null;
  },
  debugSnapshot() {
    return mountedGame?.debugSnapshot?.() || null;
  }
});
