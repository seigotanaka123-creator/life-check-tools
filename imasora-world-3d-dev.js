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
} from "./assets/imasora-world-map-schema.js?v=20260905-ufo-equipment-workshop-v404";

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
// 顔認証の立ち位置はUFO乗り場中心から約332離れている。従来の355では
// 認証地点の外側へ約23しか余裕がなく、少し動くだけで足場が閉じていた。
// 保持範囲を広げ、認証後は周囲を移動しても搭乗経路を維持する。
const UFO_RAMP_KEEP_OPEN_RADIUS = 430;
// The full ring is the physical joint between the outer shell and capsule.
// These values are shared by horizontal collision and vertical jump blocking
// so the same visible seam cannot be crossed on one axis but not the other.
const UFO_CAPSULE_SEAM_RADIUS = 29;
const UFO_CAPSULE_SEAM_RADIAL_THICKNESS = 10.8;
const UFO_CAPSULE_SEAM_MIN_Y = 21.2;
const UFO_CAPSULE_SEAM_MAX_Y = 24.8;
// Keep the rendered glass unchanged and move only its physical inner face a
// fraction inward. This small buffer prevents horns/body parts from appearing
// outside the glass for one frame during a fast airborne approach.
const UFO_CAPSULE_COLLISION_INSET = .55;
// The canopy underside is a separate contact from its horizontal inner wall.
// Ren's face projects farther than the former six-unit head probe, so a jump
// could show the face outside for one rendered frame even though the body root
// was corrected. Lower only the physical underside; the visible glass and the
// legal boarding width remain unchanged.
const UFO_CAPSULE_UNDERSIDE_INSET = 1.45;
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
// 雲マップの常設案内人は歩行しないため、待機中の手振りと流星翼の
// 羽ばたきだけを独立して動かす。主キャラクターの手の往復値は共有する。
const SKY_STATION_GUIDE_WING_FLAP_SPEED = 5.1;
const SKY_STATION_GUIDE_WING_FLAP_ANGLE = .28;
const SKY_STATION_GUIDE_WING_FOLD_ANGLE = .09;
// 接触した瞬間にだけ案内会話を始める。物理接触の手前にごく小さな
// 余白を持たせ、衝突で止まったフレームでも会話が取りこぼされないようにする。
const SKY_STATION_GUIDE_DIALOG_CONTACT_MARGIN = 1.2;
// イマソラウォーカーズのホーム会話と同じ、短いRPGメッセージ音。
// 説明文を一度に置かず、文字送りに合わせて鳴らす。
const SKY_STATION_GUIDE_DIALOG_TYPE_SFX_URL = "./assets/audio/otologic_nes_rpg01_10_message_candidate.mp3";
const SKY_STATION_GUIDE_DIALOG_TYPE_SFX_VOLUME = .22;
const SKY_STATION_GUIDE_DIALOG_TYPE_INTERVAL = 7;
const SKY_STATION_GUIDE_DIALOG_TYPE_INTERVAL_MS = 34;
const SKY_STATION_GUIDE_DIALOG_GREETING = "やあ、長旅ごくろうさま！今日は何しに来たの？";
// 詳しい本文は後から差し替える前提で、現段階では選択した話題を
// ミチメバンブレイブルが受け取る最小限の会話だけを表示する。
const SKY_STATION_GUIDE_DIALOG_TOPICS = Object.freeze({
  "sky-map": {
    label: "空マップについて",
    pages: [
      "空マップについてだね。ここには、他の惑星へ行くためのUFO乗り場があるよ。",
      "それから、無事に旅を続けられるようUFOを整備するUFO装備倉庫もあるよ。UFOに乗る前に、ぜひ行ってみてね。",
    ],
  },
  ufo: {
    label: "UFOについて",
    pages: [
      "UFOに乗るには、近くの顔認証システムの前に立って、カメラへ顔を向けて認証に合格しないとだめなんだ！認証が通ると、UFOの足場が下りるよ。",
      "操縦は、スマホでは画面下の飛行操縦レバーとパッドを使うんだ。キーボードでは、W/Sで上昇・下降、A/Dで左右移動、矢印キーで前後移動と左右回転ができるよ。",
      "宇宙マップでは、スマホの「射撃」ボタンかSpaceキーで射撃できるよ。星をロックONして壊し、エネルギーや宇宙金貨、素材を回収しながら、残りのエネルギーにも気をつけて火星を目指してね！",
    ],
  },
  "ufo-equipment": {
    label: "UFO装備倉庫について",
    pages: [
      "UFO装備倉庫では、日々の散歩とゲームセンターで手に入れた素材を使って、UFOの装備を作成できるよ。",
      "散歩では雲繊維と空見結晶が、ゲームセンターのどのゲームでも整備パーツが集まるんだ。無理に急がず、遊びたい時に集めてね。",
      "作成した装備はすぐにUFOへ装着されるよ。エネルギー回復を増やすタンク、同時発射弾丸、ロックONを広げるレーダーをそろえて、火星への旅に備えよう！",
    ],
  },
  visit: {
    label: "ミチメバンブレイブルに会いに来た",
    pages: [
      "会いに来てくれたんだね！すごくうれしいなあ。",
      "ここではゆっくりしていってね。空マップやUFOのことで困ったときは、いつでも声をかけて！",
    ],
  },
});
// UFO装備倉庫は、表示されている工房モデルの物理面への接触で開く。
// 素材は宇宙航行中の星ではなく、日々の散歩とゲームセンターで得る。
// それぞれの遊びを独立して楽しめるまま、整備だけを横断的な選択肢にする。
const UFO_EQUIPMENT_WAREHOUSE_ID = "ufo-equipment-warehouse";
const UFO_EQUIPMENT_WAREHOUSE_CONTACT_MARGIN = 1.2;
const UFO_WORKSHOP_MATERIAL_STORE_KEY = "imasora-ufo-workshop-materials-v1";
const UFO_EQUIPMENT_MATERIALS = Object.freeze({
  cloudFiber: Object.freeze({ label: "雲繊維", source: "日々の散歩" }),
  skySightCrystal: Object.freeze({ label: "空見結晶", source: "日々の散歩" }),
  arcadeParts: Object.freeze({ label: "整備パーツ", source: "ゲームセンターの全ゲーム" }),
});
const UFO_EQUIPMENT_RECIPES = Object.freeze([
  Object.freeze({
    id: "energy-absorption-tank-1",
    label: "エネルギー吸収増タンク I",
    effect: "エネルギー星を破壊した時の回復量を 10 → 12 に増やす。",
    costs: Object.freeze({ cloudFiber: 4, arcadeParts: 3 }),
    value: 1,
  }),
  Object.freeze({
    id: "energy-absorption-tank-2",
    label: "エネルギー吸収増タンク II",
    effect: "エネルギー星を破壊した時の回復量を 12 → 15 に増やす。",
    costs: Object.freeze({ cloudFiber: 6, arcadeParts: 5 }),
    value: 2,
    requires: "energy-absorption-tank-1",
  }),
  Object.freeze({
    id: "simultaneous-shot",
    label: "＋α同時発射弾丸装置",
    effect: "射撃時に追尾弾を1発追加し、2発を同時に発射する。",
    costs: Object.freeze({ skySightCrystal: 4, arcadeParts: 5 }),
  }),
  Object.freeze({
    id: "lock-on-reticle-radar",
    label: "ロックオン照準1.2倍拡大レーダー",
    effect: "照準枠とロックON判定を1.2倍に広げる。",
    costs: Object.freeze({ skySightCrystal: 3, arcadeParts: 3 }),
  }),
  Object.freeze({
    id: "lock-on-range-radar",
    label: "ロックオン探知距離1.2倍拡張レーダー",
    effect: "ロックONできる探知距離を1.2倍に拡張する。",
    costs: Object.freeze({ skySightCrystal: 5, arcadeParts: 6 }),
  }),
]);
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
const UFO_CAMERA_BASE_FOV = 48;
// UFO操縦時の画角は、空間の流れを読みやすい後方固定と、
// 白ミチロードセイバーレンの目線の2種類だけにする。遠めの画角は設けない。
const UFO_CAMERA_PRESETS = Object.freeze([
  { id: "fixed", label: "固定", back: 320, up: 230, targetForward: 14, targetUp: 27 },
  { id: "monster-eye", label: "モンスター目線", back: 0, up: 0, targetForward: 20, targetUp: 7 },
]);
// 宇宙マップの固定画角だけ、地球側の床へ落ち込みすぎないように
// 注視点を少し上げ、火星側から来るチリの接近を先に読める角度にする。
const UFO_SPACE_FIXED_CAMERA_TARGET_UP = 92;
const THIRD_PERSON_BASE_PITCH = -Math.atan2(55, 112);
const THIRD_PERSON_PITCH_MIN = -.56;
const THIRD_PERSON_PITCH_MAX = .72;
const TOUCH_PAD_DEAD_ZONE = .1;
const BUILDING_SCALE = 2.5;
// 白ミチロードセイバーレン360の実際の足中心間隔を、顔認証装置の
// 建造物スケールへ換算した足マークの半間隔（ワールド換算で約10.9）。
const UFO_FACE_AUTH_FOOT_MARKER_HALF_SPACING = 2.18;
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
// 空駅からUFOへ進む向きで立つ、雲マップ常設の街案内人。
// 座標はユーザー指定の表示座標をそのまま使い、プレイヤー保存位置には依存しない。
const SKY_STATION_GUIDE = Object.freeze({
  id: "sky-station-guide-michi-meban-brave",
  characterId: "star-hero-young-seed-walk-walk-cool-a-comet",
  name: "ミチメバンブレイブル",
  x: -74.5,
  z: -163.7,
});
// The user placed Ren on the finished pilot seat and asked that exact position
// become the authoritative engine-start seat. The chair itself faces local -Z
// (backrest at +Z, controls at -Z), so the seated body must use 180 degrees
// instead of preserving the direction Ren happened to face while testing.
// The seat top is local Y=16 on a 2.5-scaled UFO, therefore its world support
// height is 40.
const UFO_ENGINE_SEAT_WORLD = Object.freeze({
  x: -159.2,
  z: 122.7,
  groundY: 40,
  heading: Math.PI,
});
const UFO_ENGINE_SEAT_TOUCH_SKIN = .55;
const UFO_ENGINE_SEAT_PHASE_SECONDS = 1.8;
const UFO_ENGINE_CLOSING_PHASE_SECONDS = 2.5;
const UFO_ENGINE_LIGHT_PHASE_SECONDS = 2.2;
const UFO_ENGINE_DOOR_CLOSE_RESPONSE = 1.6;
const UFO_ENGINE_START_AUDIO_URL = "./assets/audio/ufo-engine-start-caterpillar-01-04-high.mp3";
const UFO_ENGINE_START_AUDIO_VOLUME = .86;
const UFO_ENGINE_SWITCH_AUDIO_URLS = Object.freeze([
  "./assets/audio/ufo-engine-switch-01-dry-mid.mp3",
  "./assets/audio/ufo-engine-switch-02-dry-hard.mp3",
  "./assets/audio/ufo-engine-switch-03-dry-gentle.mp3",
  "./assets/audio/ufo-engine-switch-04-wall-mid.mp3",
  "./assets/audio/ufo-engine-switch-05-wall-hard.mp3",
]);
const UFO_ENGINE_SWITCH_AUDIO_VOLUME = .84;
const UFO_GROUND_TAKEOFF_AUDIO_URL = "./assets/audio/ufo-ground-takeoff-retro-jet-04-2.mp3";
const UFO_GROUND_TAKEOFF_AUDIO_VOLUME = .9;
const UFO_GROUND_TAKEOFF_ALTITUDE_EPSILON = .02;
const UFO_FLIGHT_LOOP_AUDIO_URL = "./assets/audio/ufo-flight-loop-retro-jet-03-02.mp3";
const UFO_FLIGHT_LOOP_AUDIO_VOLUME = .82;
const UFO_FLIGHT_LOOP_START_HEIGHT = 24;
const UFO_MECH_EQUIP_OPEN_AUDIO_URL = "./assets/audio/ufo-mech-equip-01-3-short.mp3";
const UFO_MECH_EQUIP_CLOSE_AUDIO_URL = "./assets/audio/ufo-mech-equip-01-1-long.mp3";
const UFO_MECH_EQUIP_AUDIO_VOLUME = .84;
// Keep Ren seated, but do not sink the official model below the cushion line.
// The previous 7-unit drop hid too much of the body from the rear camera.
const UFO_SEATED_BODY_DROP = 5.2;
// 搭乗中は背面カメラからも「座っている」ことが分かるよう、足を
// 操縦席側へ少し前へ出し、胴体をわずかに後傾させる。移動中の姿勢と
// 混ざらないよう、着座中だけ updateCharacterSeatedPose が適用する。
const UFO_SEATED_FOOT_FORWARD = 16;
const UFO_SEATED_BODY_TILT = .14;
const UFO_FLIGHT_FORWARD_SPEED = 13;
const UFO_FLIGHT_LIFT_SPEED = 8;
const UFO_FLIGHT_TURN_SPEED = .82;
// 宇宙マップでは、同じ入力でも広い空間を移動しやすいように、
// UFOの並進速度（前後・左右・上昇下降）だけを通常時の11倍にする。
// 旋回速度と長押し加速は通常の操作感を維持する。
const UFO_SPACE_FLIGHT_SPEED_MULTIPLIER = 11;
// 宇宙の自由航行は空マップより大きな空間を扱うため、操縦の反応だけを
// 専用に高める。長押し時の既存1.5倍加速とは別の、通常入力の基礎性能。
// 旧ミッションの左右慣性や空マップの操作には適用しない。
const UFO_SPACE_FREE_FLIGHT_FORWARD_MULTIPLIER = 1.45;
const UFO_SPACE_FREE_FLIGHT_STRAFE_MULTIPLIER = 1.8;
const UFO_SPACE_FREE_FLIGHT_LIFT_MULTIPLIER = 1.65;
const UFO_SPACE_FREE_FLIGHT_TURN_MULTIPLIER = 1.65;
// 地球から火星へ向かう前進スクロール航行。前進を主役の高速巡航にし、
// 左右・上下はGが掛かる機体の「軌道補正」として遅く、慣性を伴わせる。
// ルート所要時間を勝手に縮めず、体感は画角・機体姿勢・相対操作量で高める。
const UFO_FORWARD_SCROLL_LAUNCH_SECONDS = 3.8;
const UFO_FORWARD_SCROLL_LAUNCH_CLIMB_WORLD = 330;
// 火星までの距離は出発ごとに変動する。選択された距離・到着時間・
// 火星の実座標を同じ航路モードから決めるため、HUDだけが変わったり
// 時間だけを縮めて早く到着したりしない。
const UFO_FORWARD_SCROLL_MARS_DISTANCE_MODES = Object.freeze([
  Object.freeze({
    id: "mars-300-million-km",
    distanceKm: 300_000_000,
    totalSeconds: 180,
  }),
  Object.freeze({
    id: "mars-250-million-km",
    distanceKm: 250_000_000,
    totalSeconds: 150,
  }),
]);
const UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE = UFO_FORWARD_SCROLL_MARS_DISTANCE_MODES[0];
const UFO_FORWARD_SCROLL_TARGET_SECONDS = UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE.totalSeconds;
// 各モードの総所要時間には離脱アニメーションも含める。巡航距離はその
// 正味時間に対して実時間で同期し、更新回数やローカル座標の倍率で到着が
// 早まらないようにする。
const UFO_FORWARD_SCROLL_CRUISE_SECONDS = UFO_FORWARD_SCROLL_TARGET_SECONDS
  - UFO_FORWARD_SCROLL_LAUNCH_SECONDS;
const UFO_FORWARD_SCROLL_REFERENCE_TARGET_SECONDS = 212;
const UFO_FORWARD_SCROLL_REFERENCE_CRUISE_SECONDS = UFO_FORWARD_SCROLL_REFERENCE_TARGET_SECONDS
  - UFO_FORWARD_SCROLL_LAUNCH_SECONDS;
const UFO_FORWARD_SCROLL_CRUISE_SPEED_REFERENCE_RATIO = .97;
// 火星の見た目と到達判定を別々のタイミングにしない。航路終端の少し前から
// 火星大気圏の縁を薄く見せ、終端を越えた瞬間に同じ層を強く発光させる。
const UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_APPROACH_START = .84;
const UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_FLASH_SECONDS = 2.8;
const UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_OVERLAY_SECONDS = 2.1;
const UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_PREVIEW_SECONDS = 7.2;
// 巡航中の前進より横・上下が速いと、UFOが空間を軽く横滑りするだけに
// 見えてしまう。回避幅は残しつつ、入力から最高速度まで時間の掛かる
// 重い軌道補正へ変更する。
// 左右は前回値から一段だけ上げ、上下は大きく振り回せないまま小さな
// 高度調整として効く量にする。前進スクロールのスピード感は崩さない。
const UFO_FORWARD_SCROLL_STRAFE_SPEED = 670;
const UFO_FORWARD_SCROLL_LIFT_SPEED = 250;
// 前進スクロール時の左右は、回避の判断に遅れないよう即応寄りにする。
// 上下は従来の重いG補正を保ち、意図せず軽快な上下スライドにならないようにする。
const UFO_FORWARD_SCROLL_STRAFE_RESPONSE = 7.2;
const UFO_FORWARD_SCROLL_STRAFE_RELEASE_RESPONSE = 9.0;
const UFO_FORWARD_SCROLL_LIFT_RESPONSE = 1.34;
const UFO_FORWARD_SCROLL_LIFT_RELEASE_RESPONSE = 1.92;
// 前進スクロール中の左右・上下は、どちらも同じ短い長押しで加速へ入る。
// 通常飛行の0.8秒待機を流用しない。
const UFO_FORWARD_SCROLL_STRAFE_HOLD_SECONDS = .26;
const UFO_FORWARD_SCROLL_STRAFE_ACCEL_MULTIPLIER = 1.65;
const UFO_FORWARD_SCROLL_LIFT_HOLD_SECONDS = UFO_FORWARD_SCROLL_STRAFE_HOLD_SECONDS;
const UFO_FORWARD_SCROLL_LIFT_ACCEL_MULTIPLIER = UFO_FORWARD_SCROLL_STRAFE_ACCEL_MULTIPLIER;
// 前進スクロール中は横・上下の操縦入力そのものがUFOのノーズ方向になる。
// 通常入力より長押し時の方が深く向くため、照準も同じ方向へ大きく振れる。
const UFO_FORWARD_SCROLL_AIM_MAX_YAW = THREE.MathUtils.degToRad(18);
const UFO_FORWARD_SCROLL_AIM_MAX_PITCH = THREE.MathUtils.degToRad(18);
const UFO_FORWARD_SCROLL_AIM_MAX_DESCENT_PITCH = THREE.MathUtils.degToRad(21);
// ロックした星に対しては、手動操縦で作るノーズ角とは別に、自動追尾用の
// 角度を重ねる。画面外や後方へ急反転しない範囲だけに抑え、見えている星へ
// は可能な限り機首・照準の両方を向ける。
const UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_YAW = THREE.MathUtils.degToRad(38);
const UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_PITCH = THREE.MathUtils.degToRad(28);
const UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_DESCENT_PITCH = THREE.MathUtils.degToRad(30);
const UFO_FORWARD_SCROLL_LOCK_TRACK_RESPONSE = 7.4;
const UFO_FORWARD_SCROLL_LOCK_TRACK_RELEASE_RESPONSE = 5.2;
const UFO_FORWARD_SCROLL_CRUISE_PITCH_SCALE = .38;
// 地球離陸の数秒間だけは、地球・UFO・上昇軌道を一画面へ入れられる
// 広めの外部カメラを使う。巡航へ入ると通常の高速航行FOVへ戻す。
const UFO_FORWARD_SCROLL_DEPARTURE_FOV = 64;
const UFO_FORWARD_SCROLL_CRUISE_FOV = 66;
const UFO_FORWARD_SCROLL_PICKUP_SEGMENTS = 210;
const UFO_FORWARD_SCROLL_PICKUP_RADIUS = 42;
// 前方航行中に資源星を見失わず、かつ通り過ぎてから後追いで
// ロックしないための近接ロック距離。見つけた時点で明確に狙える
// よう、現在の高速巡航速度に対して十分な照準猶予を持たせる。大型の
// エネルギー星と同じ視認距離よりも早く小型の回収星を認識できるため、
// 表示をこれ以上大きくしなくても遠方から狙いを定められる。
const UFO_FORWARD_SCROLL_LOCK_RANGE = 18400;
// 画面上の照準枠とロック判定を同じ大きさに保つ。星の核と発光部分の
// いずれかがこの枠へ触れた時点でロックし、枠から外れても画面内にある間は保持する。
const UFO_FORWARD_SCROLL_RETICLE_SIZE = 80;
const UFO_FORWARD_SCROLL_AIM_SCREEN_DISTANCE = 3600;
const UFO_FORWARD_SCROLL_SHOT_SPEED = 38000;
const UFO_FORWARD_SCROLL_SHOT_MIN_SECONDS = .09;
const UFO_FORWARD_SCROLL_SHOT_MAX_SECONDS = .32;
const UFO_FORWARD_SCROLL_MISSILE_TURN_RESPONSE = 15;
const UFO_FORWARD_SCROLL_MISSILE_MIN_LIFETIME = .34;
const UFO_FORWARD_SCROLL_MISSILE_MAX_LIFETIME = .9;
// 長押しは狙いを保ちやすい少し遅めの連射にする。手動入力は予約せず、
// 押した瞬間に独立したパルスとして発射する。
const UFO_FORWARD_SCROLL_HOLD_FIRE_INTERVAL = .62;
// ロックONは補助であり、ロックできない時も前方へ撃てる。自由射撃は
// 実際に前方へ飛び、途中で資源星へ触れた時だけ回収する。
const UFO_FORWARD_SCROLL_FREE_SHOT_RANGE = 15000;
const UFO_FORWARD_SCROLL_FREE_SHOT_RADIUS = 18;
// 回収物を複数の星で固めず、航路の各地点に一つずつ置く。狙う・撃つ・
// 破壊する対象を明確にするため、単体星は必ず複数回の命中で回収になる。
const UFO_FORWARD_SCROLL_PICKUP_COUNT = 24;
const UFO_FORWARD_SCROLL_PICKUP_HITS_REQUIRED = 3;
// 回収用の小型星は、素材星より宇宙金貨星を少し多めにする。航路で
// 目にする金貨の密度を上げつつ、素材も十分に回収できる比率に保つ。
const UFO_FORWARD_SCROLL_COIN_STAR_RATIO = .62;
// 大型の実体恒星をエネルギー星にする割合。すべての近傍恒星を対象化
// せず少し絞り、宇宙金貨星を狙う場面との偏りを緩和する。
const UFO_FORWARD_SCROLL_ENERGY_STAR_RATIO = .7;
// 回収星は射撃対象であると同時に、UFOと実際にぶつかる実体として扱う。
// 接触ごとに航行エネルギーを30失い、星の中心へ食い込まず横・上下へ押し戻す。
const UFO_FORWARD_SCROLL_PICKUP_CONTACT_ENERGY_DAMAGE = 30;
const UFO_FORWARD_SCROLL_PICKUP_CONTACT_SKIN = 24;
const UFO_FORWARD_SCROLL_PICKUP_CONTACT_RELEASE_MARGIN = 34;
const UFO_FORWARD_SCROLL_PICKUP_CONTACT_MAX_RECOIL = 340;
// 金貨星・素材星は高速航行中にも狙いを定めやすいよう、核・発光・当たり
// 判定をまとめて少しだけ大きくする。大型のエネルギー星には適用しない。
const UFO_FORWARD_SCROLL_PICKUP_VISUAL_SCALE = 1.32;
const UFO_FORWARD_SCROLL_REWARD_FEED_LIMIT = 3;
const UFO_FORWARD_SCROLL_REWARD_FEED_LIFETIME_MS = 3200;
// 大型の実体恒星はエネルギー星として扱う。小型の回収星とは別の見た目・
// 当たり半径を持つが、3発で破壊するという射撃ルールは共通にする。
const UFO_FORWARD_SCROLL_ENERGY_STAR_REGISTRATION_RANGE = 18400;
const UFO_FORWARD_SCROLL_FIELD_SCAN_RANGE = 11200;
const UFO_FORWARD_SCROLL_FIELD_DRIFT_MIN = 28;
const UFO_FORWARD_SCROLL_FIELD_DRIFT_MAX = 92;
const UFO_FORWARD_SCROLL_HAZARD_ENERGY_DAMAGE = 42;
const UFO_FORWARD_SCROLL_ENERGY_MAX = 100;
const UFO_FORWARD_SCROLL_START_ENERGY = 100;
// 残エネルギーがこの値を下回る間だけ、コクピット灯と機体姿勢へ
// 控えめな警報演出を重ねる。移動量・衝突・照準の計算は変えない。
const UFO_FORWARD_SCROLL_LOW_ENERGY_THRESHOLD = 15;
const UFO_FORWARD_SCROLL_LOW_ENERGY_BLINK_HZ = 1.75;
const UFO_FORWARD_SCROLL_LOW_ENERGY_DIM_LIGHT_AMOUNT = .16;
const UFO_FORWARD_SCROLL_LOW_ENERGY_ROCK_MULTIPLIER = 1.32;
const UFO_FORWARD_SCROLL_LOW_ENERGY_IDLE_ROCK_ANGLE = THREE.MathUtils.degToRad(.7);
// エネルギー切れの通知を読める長さだけ残してから、雲マップの安全地点へ戻す。
const UFO_FORWARD_SCROLL_ENERGY_EMPTY_RETURN_DELAY = 1.4;
// 標準エネルギーだけでは航路の55%前後で尽きる。青い星を拾うことで
// 継続でき、寄り道した横・上下移動も実際の移動距離として消費する。
const UFO_FORWARD_SCROLL_BASE_ENERGY_RANGE_RATIO = .55;
const UFO_FORWARD_SCROLL_ENERGY_STAR_TYPE = Object.freeze({
  label: "エネルギー星",
  color: 0x63e8ff,
  emissive: 0x1c9dff,
  reward: 10,
});
const UFO_FORWARD_SCROLL_PICKUP_TYPES = Object.freeze({
  coin: Object.freeze({
    label: "宇宙金貨星",
    color: 0xffd46c,
    emissive: 0xff8a1f,
    reward: 1,
  }),
  material: Object.freeze({
    label: "素材星",
    color: 0xc091ff,
    emissive: 0x6e3dce,
    reward: 1,
  }),
});
// 旧来の横移動シューティング用速度。救助任務では使用せず、互換のため
// 定義だけを残す。
const UFO_SPACE_SHOOTER_AUTOPILOT_SPEED_FACTOR = .82;
// 宇宙戦中の左右操作は、入力を離してもすぐ停止しない慣性移動にする。
// 長押し加速（1.5倍）はこの目標速度にもそのまま反映される。
const UFO_SPACE_STRAFE_RESPONSE = 7.4;
const UFO_SPACE_STRAFE_COAST_RESPONSE = 3.15;
// 最初の物理任務は、敵を撃つのではなく回転する開拓ユニットを
// 到着リングへ牽引する。既存の左右操作だけで遊べるよう、前進は
// 緩やかな自動航行に限定し、接続・姿勢固定・位置合わせを主役にする。
const UFO_SPACE_RESCUE_AUTOPILOT_SPEED_FACTOR = .48;
const UFO_SPACE_RESCUE_ACQUIRE_DISTANCE = 1080;
const UFO_SPACE_RESCUE_GOAL_DISTANCE = 3600;
const UFO_SPACE_RESCUE_GOAL_SIDE_OFFSET = -420;
const UFO_SPACE_RESCUE_LINK_RANGE = 390;
const UFO_SPACE_RESCUE_TETHER_LENGTH = 310;
const UFO_SPACE_RESCUE_TETHER_STIFFNESS = .54;
const UFO_SPACE_RESCUE_TETHER_DAMPING = 1.42;
const UFO_SPACE_RESCUE_GOAL_RADIUS = 330;
const UFO_SPACE_RESCUE_POD_RADIUS = 118;
const UFO_SPACE_RESCUE_POD_MASS = 28;
const UFO_SPACE_RESCUE_STABILIZE_COOLDOWN = 1.15;
const UFO_SPACE_RESCUE_STABILIZE_FACTOR = .36;
const UFO_SPACE_RESCUE_DEBRIS_COLLISION_DAMAGE = 18;
const UFO_SPACE_RESCUE_MIN_INTEGRITY = 26;
// 1案目の試作「UFOグラビティ・ピンボール採掘」。これは既存の救助任務と
// 完全に別の、前方に固定された採掘盤上で重力コアを跳ね返す物理アーケード。
// 入力で自動的に進む要素は持たせず、コアの発射・磁場パルス・左右移動だけを
// プレイヤーの判断にする。
const UFO_GRAVITY_PINBALL_BOARD_DISTANCE = 740;
const UFO_GRAVITY_PINBALL_BOARD_HALF_WIDTH = 360;
const UFO_GRAVITY_PINBALL_BOARD_HALF_HEIGHT = 292;
const UFO_GRAVITY_PINBALL_CORE_RADIUS = 27;
const UFO_GRAVITY_PINBALL_GRAVITY = 170;
const UFO_GRAVITY_PINBALL_LAUNCH_SPEED = 500;
const UFO_GRAVITY_PINBALL_PULSE_COOLDOWN = .72;
const UFO_GRAVITY_PINBALL_PULSE_RANGE = 196;
const UFO_GRAVITY_PINBALL_PULSE_BOOST = 560;
const UFO_GRAVITY_PINBALL_PADDLE_HALF_WIDTH = 126;
const UFO_GRAVITY_PINBALL_PADDLE_Y = -242;
const UFO_GRAVITY_PINBALL_BUMPER_BOOST = 1.06;
const UFO_GRAVITY_PINBALL_REQUIRED_ORE_LOCKS = 3;
const UFO_GRAVITY_PINBALL_CORE_CHARGES = 2;
// 2案目の試作「宇宙コイン落とし・サルベージ港」。前案のピンボールと
// 異なり、UFOの下部プッシャーで実体のある資源片の山を押し込み、中央の
// 回収口へ物理的に落とす。静止中には資源片は進まず、押す位置と回数が
// そのまま結果になるようにしている。
const UFO_SALVAGE_PORT_DISTANCE = 780;
const UFO_SALVAGE_PORT_HALF_WIDTH = 370;
const UFO_SALVAGE_PORT_HALF_HEIGHT = 292;
const UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH = 132;
const UFO_SALVAGE_PORT_PUSHER_HALF_HEIGHT = 22;
const UFO_SALVAGE_PORT_PUSHER_REST_Y = 220;
const UFO_SALVAGE_PORT_PUSHER_STROKE_Y = -164;
const UFO_SALVAGE_PORT_PUSHER_SPEED = 690;
const UFO_SALVAGE_PORT_PUSHER_COOLDOWN = .18;
const UFO_SALVAGE_PORT_COLLECTION_GATE_HALF_WIDTH = 112;
const UFO_SALVAGE_PORT_COLLECTION_LINE_Y = -252;
const UFO_SALVAGE_PORT_REQUIRED_COLLECTION = 12;
const UFO_SALVAGE_PORT_DURATION = 45;
const UFO_SALVAGE_PORT_MAX_CHAIN_WINDOW = 1.65;
// 3案目の試作「惑星解体ボウリング」。UFOの位置で発射レーンを合わせ、
// 重い重力球で棚に積まれた惑星殻を実際に崩す。自動的な破壊や回収はせず、
// 球の衝突・殻どうしの押し合い・落下だけで解体数が決まる。
const UFO_PLANET_BOWLING_DISTANCE = 860;
const UFO_PLANET_BOWLING_HALF_WIDTH = 390;
const UFO_PLANET_BOWLING_HALF_HEIGHT = 300;
const UFO_PLANET_BOWLING_GRAVITY = 210;
const UFO_PLANET_BOWLING_BALL_RADIUS = 34;
const UFO_PLANET_BOWLING_BALL_MASS = 14;
const UFO_PLANET_BOWLING_LAUNCH_SPEED = 760;
const UFO_PLANET_BOWLING_SHOTS = 3;
const UFO_PLANET_BOWLING_DURATION = 55;
const UFO_PLANET_BOWLING_REQUIRED_DEMOLITION = 10;
const UFO_PLANET_BOWLING_CAPTURE_LINE_Y = -250;
const UFO_PLANET_BOWLING_CAPTURE_HALF_WIDTH = 302;
const UFO_PLANET_BOWLING_LAUNCH_X_LIMIT = 248;
// 4案目の試作「ゼログラビティ・リングバトル」。UFO本体から切り離した
// 質量のあるラム機を発射し、相手機との反動も利用して重力コアを移動リングへ
// 通す。得点はプレイヤーが最後にコアへ接触した場合だけ有効にする。
const UFO_RING_BATTLE_DISTANCE = 820;
const UFO_RING_BATTLE_HALF_WIDTH = 390;
const UFO_RING_BATTLE_HALF_HEIGHT = 300;
const UFO_RING_BATTLE_DURATION = 52;
const UFO_RING_BATTLE_REQUIRED_POINTS = 3;
const UFO_RING_BATTLE_PLAYER_RADIUS = 42;
const UFO_RING_BATTLE_PLAYER_MASS = 21;
const UFO_RING_BATTLE_CORE_RADIUS = 32;
const UFO_RING_BATTLE_CORE_MASS = 8;
const UFO_RING_BATTLE_RAM_SPEED = 720;
const UFO_RING_BATTLE_RETURN_DELAY = .72;
const UFO_RING_BATTLE_PLAYER_CONTACT_WINDOW = 4.8;
const UFO_RING_BATTLE_DOCK_Y = -188;
// 5案目の試作「宇宙クレーン建設港」。UFOに連動する磁力フックで、
// 慣性を持つ建設モジュールをつかみ、実際に落としてドックへ固定する。
// つかんだ物体はフックへ瞬間移動せず、ばね状の牽引で揺れながら動く。
const UFO_CRANE_PORT_DISTANCE = 900;
const UFO_CRANE_PORT_HALF_WIDTH = 390;
const UFO_CRANE_PORT_HALF_HEIGHT = 300;
const UFO_CRANE_PORT_DURATION = 68;
const UFO_CRANE_PORT_REQUIRED_BUILDS = 3;
const UFO_CRANE_PORT_HOOK_SEARCH_Y = 228;
const UFO_CRANE_PORT_HOOK_CARRY_Y = 54;
const UFO_CRANE_PORT_HOOK_LOAD_OFFSET = 70;
const UFO_CRANE_PORT_CAPTURE_RANGE = 82;
const UFO_CRANE_PORT_GRAVITY = 250;
const UFO_CRANE_PORT_FLOOR_Y = -212;
// 6案目の試作「重力迷路レース」。UFOの左右移動を重力場の横傾きへ変換し、
// 実体コアが壁にぶつかりながら蛇行コースを通る。Fキーは射撃ではなく、
// 現在の重力方向へ一度だけ加える短い重力パルスとして使う。
const UFO_GRAVITY_MAZE_DISTANCE = 920;
const UFO_GRAVITY_MAZE_HALF_WIDTH = 390;
const UFO_GRAVITY_MAZE_HALF_HEIGHT = 300;
const UFO_GRAVITY_MAZE_DURATION = 58;
const UFO_GRAVITY_MAZE_CORE_RADIUS = 27;
const UFO_GRAVITY_MAZE_DOWN_FORCE = 172;
const UFO_GRAVITY_MAZE_TILT_FORCE = 304;
const UFO_GRAVITY_MAZE_PULSE_FORCE = 242;
const UFO_GRAVITY_MAZE_PULSE_COOLDOWN = .72;
const UFO_GRAVITY_MAZE_REQUIRED_CHECKPOINTS = 3;
// 7案目の試作「火星航路・慣性スリング」。宇宙の実座標に置かれた
// 大質量岩塊へテザーを接続し、張力と慣性でUFOそのものの航路を変える。
// これは画面上の別盤面ではなく、飛行中のUFOの flight state に直接力を加える。
const UFO_INERTIA_SLINGSHOT_DURATION = 74;
const UFO_INERTIA_SLINGSHOT_CRAFT_RADIUS = 72;
const UFO_INERTIA_SLINGSHOT_GRAPPLE_RANGE = 760;
const UFO_INERTIA_SLINGSHOT_MIN_TETHER_LENGTH = 230;
const UFO_INERTIA_SLINGSHOT_SPRING = 2.36;
const UFO_INERTIA_SLINGSHOT_CRAFT_MASS = 22;
const UFO_INERTIA_SLINGSHOT_CAPTURE_DISTANCE = 3180;
const UFO_INERTIA_SLINGSHOT_CAPTURE_RADIUS = 308;
const UFO_INERTIA_SLINGSHOT_ESCAPE_DISTANCE = 3670;
// 太陽帆サーフィン試作。宇宙空間に流れる太陽風へ帆を展開して乗り、
// 風圧をそのまま実UFOの加速度として受け取る。帆を畳まないと火星側の
// 捕獲軌道へ入れないため、ただの移動演出ではなく航行判断になる。
const UFO_SOLAR_SAIL_DURATION = 86;
const UFO_SOLAR_SAIL_WIND_RADIUS = 248;
const UFO_SOLAR_SAIL_CAPTURE_DISTANCE = 4160;
const UFO_SOLAR_SAIL_CAPTURE_RADIUS = 332;
const UFO_SOLAR_SAIL_REQUIRED_CHARGE = 72;
const UFO_SOLAR_SAIL_IDLE_DRIFT = 34;
const UFO_SOLAR_SAIL_MAX_SPEED = 410;
  // 火星突入航路。これはリングを抜けるだけのレースではなく、UFOの実体に
// 慣性・重力流・デブリ衝突・残像航法を返す、地球から火星までの突破ゲーム。
// 約3分で到着できるが、速度を維持しながら航路を読まなければ生還できない。
const UFO_MARS_RACE_DURATION = 210;
const UFO_MARS_RACE_FINISH_DISTANCE = 42000;
const UFO_MARS_RACE_MARS_CENTER_DISTANCE = 46800;
const UFO_MARS_RACE_GATE_COUNT = 6;
const UFO_MARS_RACE_GATE_RADIUS = 510;
const UFO_MARS_RACE_GATE_BOOST_RADIUS = 300;
const UFO_MARS_RACE_CRAFT_RADIUS = 116;
const UFO_MARS_RACE_BASE_SPEED = 220;
const UFO_MARS_RACE_MAX_SPEED = 640;
const UFO_MARS_RACE_GATE_BOOST = 72;
const UFO_MARS_RACE_STEER_ACCELERATION = 2750;
const UFO_MARS_RACE_STEER_DRAG = 1.92;
const UFO_MARS_RACE_MAX_STRAFE_SPEED = 1240;
const UFO_MARS_RACE_HAZARD_DAMAGE = 22;
const UFO_MARS_RACE_HAZARD_SPEED_LOSS = .48;
const UFO_MARS_RACE_DASH_DISTANCE = 560;
const UFO_MARS_RACE_DASH_COOLDOWN = 2.2;
const UFO_MARS_RACE_DASH_CHARGE_MAX = 3;
const UFO_MARS_RACE_GRAVITY_PULL = 920;
const UFO_MARS_RACE_COLLISION_RESTITUTION = .62;
const UFO_MARS_RACE_PHASE_SECONDS = 3.8;
// 星間採掘航行。既存の前方固定ミッションとは分離し、UFOそのものを
// 全方向へ飛ばして、星ごとに異なる採掘反応を起こすための基礎定数。
// これは敵や時間切れを置かない「採掘庭園」のため、接近・操作・回収を
// 繰り返せる自由航行を優先する。
const UFO_STAR_MINING_INTERACTION_RANGE = 520;
const UFO_STAR_MINING_COLLECTION_RANGE = 118;
const UFO_STAR_MINING_DASH_DISTANCE = 560;
const UFO_STAR_MINING_DASH_COOLDOWN = .85;
const UFO_STAR_MINING_DASH_CHARGES = 3;
const UFO_STAR_MINING_DASH_RECHARGE_SECONDS = 3.6;
const UFO_STAR_MINING_FRAGMENT_LIFETIME = 42;
const UFO_STAR_MINING_STAR_RECOVERY_SECONDS = 8;
// UFO操作を0.8秒以上押し続けた時だけ、通常速度の1.5倍へ加速する。
// 方向を離す／反転するたび、その軸だけ通常速度からやり直す。
const UFO_FLIGHT_ACCEL_HOLD_SECONDS = .8;
const UFO_FLIGHT_ACCEL_MULTIPLIER = 1.5;
// Horizontal flight leans the complete craft toward its travel direction.
// Diagonal input is normalized so front-right, back-left, etc. remain as
// stable as the four cardinal directions instead of leaning sqrt(2) farther.
const UFO_FLIGHT_MAX_PITCH = THREE.MathUtils.degToRad(12);
const UFO_FLIGHT_MAX_ROLL = THREE.MathUtils.degToRad(12);
const UFO_FLIGHT_TILT_RESPONSE = 6.4;
const UFO_FLIGHT_LEVEL_RESPONSE = 4.8;
const UFO_FLIGHT_ROCK_ANGLE = THREE.MathUtils.degToRad(2.2);
const UFO_FLIGHT_ROCK_FREQUENCY = 1.2;
const UFO_FLIGHT_ROCK_RESPONSE = 4.6;
const UFO_FLIGHT_TILT_DIRECTIONS = Object.freeze([
  "front",
  "front-right",
  "right",
  "back-right",
  "back",
  "back-left",
  "left",
  "front-left",
]);
const UFO_FLIGHT_ROCK_AXIS_LABELS = Object.freeze({
  front: "left-right",
  "front-right": "front-left-back-right",
  right: "front-back",
  "back-right": "front-right-back-left",
  back: "left-right",
  "back-left": "front-left-back-right",
  left: "front-back",
  "front-left": "front-right-back-left",
  level: "none",
});
// 飛行中のUFOは、最大外径である底部排気口とカプセル上端を含む
// 円筒として建造物へ衝突させる。表示外へ大きな余白は足さない。
const UFO_FLIGHT_COLLISION_SKIN = .55;
const UFO_FLIGHT_COLLISION_RADIUS_LOCAL = 46.35;
const UFO_FLIGHT_COLLISION_MIN_Y_LOCAL = .35;
const UFO_FLIGHT_COLLISION_MAX_Y_LOCAL = 52.5;
// 空マップではUFO外周が端から少し見切れるところまで許可し、その後
// 宇宙マップへ遷移する。徒歩キャラクターの境界にはこの猶予を使わない。
const UFO_SKY_SPACE_TRIGGER_OVERHANG = 2.5;
const UFO_SKY_BOUNDARY_COLLISION_GRACE = 24;
const UFO_SPACE_TRANSITION_DURATION_MS = 900;
const UFO_SPACE_EARTH_RADIUS = 900;
const UFO_SPACE_MARS_RADIUS = UFO_SPACE_EARTH_RADIUS * 11;
const UFO_SPACE_MARS_EDGE_INSET = UFO_SPACE_MARS_RADIUS * .35;
// 火星航路の離陸カットで使う、地球中心から出発機までの位置関係。
// 地球の表面上に「空マップ由来の雲の発進地点」を正確に置くため、地球
// 表示と雲の発進地点で同じ値を共有する。
const UFO_FORWARD_SCROLL_DEPARTURE_EARTH_FORWARD_OFFSET = 780;
const UFO_FORWARD_SCROLL_DEPARTURE_EARTH_UP_OFFSET = 1040;
// 火星は前方のマップ端に置いたまま、空間の上方向へ大きく持ち上げる。
// X/Z の進行方向は変えず、飛行中に見上げて目指せる高さだけを分離して管理する。
const UFO_SPACE_MARS_HEIGHT_OFFSET = 0;
// 地球を大型化しても、宇宙初期位置から地表までの距離は従来と同じ
// 920ワールド単位に保つ。見た目だけ大きくなり、帰還が早まらない。
const UFO_SPACE_EARTH_CENTER_DROP = 1520;
const UFO_SPACE_EARTH_RETURN_CLEARANCE = 26;
// 宇宙マップは上下にも広く航行できる立体空間として扱う。従来の下限
// -1,000では下降がすぐ止まるため、上昇・下降ともに30,000ワールド単位
// （BUILDING_SCALE換算）の航行帯へ拡張する。
const UFO_SPACE_VERTICAL_FLIGHT_LIMIT = 12000;
const UFO_SPACE_MIN_FLIGHT_Y = -UFO_SPACE_VERTICAL_FLIGHT_LIMIT;
const UFO_SPACE_MAX_FLIGHT_Y = UFO_SPACE_VERTICAL_FLIGHT_LIMIT;
const UFO_SKY_RETURN_FLIGHT_Y = 140;
// 宇宙で見えている星を背景画像ではなく、すべて固有の三次元座標を持つ
// 実体として生成する。遠景の星点と接近時の表面は、同じ物理半径から
// 計算する。距離の閾値で別モデルへ拡大表示することは絶対にしない。
const UFO_SPACE_EXPLORABLE_STAR_COUNT = 36000;
const UFO_SPACE_EXPLORABLE_STAR_DETAIL_LIMIT = 96;
const UFO_SPACE_EXPLORABLE_STAR_CLOSE_EXCLUSION = 9000;
const UFO_SPACE_EXPLORABLE_STAR_LOD_INTERVAL = .075;
const UFO_SPACE_EXPLORABLE_STAR_VERTICAL_RANGE = 76000;
const UFO_SPACE_EXPLORABLE_STAR_DETAIL_RANGE_RADIUS_MULTIPLIER = 380;
const UFO_SPACE_EXPLORABLE_STAR_SURFACE_START_PIXELS = 7;
const UFO_SPACE_EXPLORABLE_STAR_SURFACE_FULL_PIXELS = 34;
const UFO_SPACE_EXPLORABLE_STAR_MIN_DOT_PIXELS = 1.02;
const UFO_SPACE_LIFE_MAX = 100;
// 接触したフレームで直ちにダメージを確定する。被弾後の無敵時間で
// チリを残したり、連続接触を見送ったりしない。
const UFO_SPACE_DUST_HIT_COOLDOWN = 0;
const UFO_SPACE_DUST_ESCAPE_DELAY = .72;
const UFO_SPACE_DUST_SIZE_MULTIPLIER = 3;
const UFO_SPACE_DUST_SPEED_MULTIPLIER = 1.5;
// 追従・ホーミングは使わず、生成時にだけUFOの位置へ向く直線軌道を
// 予約する。約3分の2を直撃コース、残りを広い横断コースにすることで、
// 回避の余地を残しながら「向かってくる」個体を増やす。
const UFO_SPACE_DUST_DIRECT_AIM_RATIO = 2 / 3;
const UFO_SPACE_DUST_RESPAWN_DELAY = 1.35;
const UFO_SPACE_DUST_HAZARD_SPAWN_STAGGER = 1.6;
const UFO_SPACE_HAZARD_GRACE = 3.2;
const UFO_SPACE_SHOT_SPEED = 6200;
const UFO_SPACE_SHOT_LIFETIME = 4.5;
const UFO_SPACE_SHOT_COOLDOWN = .22;
const UFO_SPACE_SHOT_HIT_RADIUS = 46;
// 衝撃弾は小型を破砕し、中型・大型は質量に応じて押し返す。
// チリ同士も球として衝突するため、押し返した一つを他のチリへ当てられる。
const UFO_SPACE_SHOT_IMPULSE = 920;
const UFO_SPACE_SHOT_GLANCING_RATIO = .46;
const UFO_SPACE_DUST_COLLISION_RESTITUTION = .62;
const UFO_SPACE_DUST_COLLISION_SKIN = 1.2;
const UFO_SPACE_DUST_COLLISION_COOLDOWN = .10;
const UFO_SPACE_DUST_COLLISION_IMPACT_SPEED = 72;
// 宇宙戦はランダムな障害物の流れではなく、火星から飛来する固定編隊を
// 撃ち抜く迎撃戦として扱う。各編隊の進路は出現時に確定し、追従しない。
const UFO_SPACE_COMBAT_START_DELAY = 1.05;
const UFO_SPACE_COMBAT_WAVE_INTERVAL = 4.15;
const UFO_SPACE_COMBAT_WAVE_MIN_INTERVAL = 2.85;
const UFO_SPACE_COMBAT_ROUTE_DISTANCE = 5100;
const UFO_SPACE_COMBAT_PASS_CLEARANCE = 780;
const UFO_SPACE_COMBAT_TRAIL_LENGTH = 320;
const UFO_SPACE_COMBAT_SHOT_ASSIST_DOT = .962;
const UFO_SPACE_COMBAT_WARNING_DISTANCE = 1900;
const UFO_SPACE_COMBAT_FORMATIONS = Object.freeze([
  Object.freeze({
    id: "fan",
    label: "扇状接近",
    slots: Object.freeze([
      Object.freeze({ typeId: "small", side: -2.5, vertical: .65, delay: .00, speed: 1.08 }),
      Object.freeze({ typeId: "medium", side: -1.15, vertical: -.22, delay: .12, speed: .98 }),
      Object.freeze({ typeId: "medium", side: 1.15, vertical: -.22, delay: .12, speed: .98 }),
      Object.freeze({ typeId: "small", side: 2.5, vertical: .65, delay: .00, speed: 1.08 }),
      Object.freeze({ typeId: "small", side: 0, vertical: 1.45, delay: .28, speed: .92 }),
    ]),
  }),
  Object.freeze({
    id: "split",
    label: "二手分散",
    slots: Object.freeze([
      Object.freeze({ typeId: "small", side: -2.85, vertical: -.72, delay: .00, speed: 1.14 }),
      Object.freeze({ typeId: "medium", side: -1.75, vertical: .42, delay: .16, speed: 1.02 }),
      Object.freeze({ typeId: "medium", side: 1.75, vertical: .42, delay: .16, speed: 1.02 }),
      Object.freeze({ typeId: "small", side: 2.85, vertical: -.72, delay: .00, speed: 1.14 }),
      Object.freeze({ typeId: "small", side: 0, vertical: -1.55, delay: .34, speed: .96 }),
    ]),
  }),
  Object.freeze({
    id: "breaker",
    label: "大型突破",
    slots: Object.freeze([
      Object.freeze({ typeId: "small", side: -2.7, vertical: .86, delay: .00, speed: 1.18 }),
      Object.freeze({ typeId: "medium", side: -1.15, vertical: -.34, delay: .15, speed: 1.04 }),
      Object.freeze({ typeId: "large", side: .20, vertical: .08, delay: .34, speed: .92 }),
      Object.freeze({ typeId: "medium", side: 1.55, vertical: .48, delay: .18, speed: 1.02 }),
      Object.freeze({ typeId: "small", side: 2.85, vertical: -.82, delay: .04, speed: 1.18 }),
    ]),
  }),
  Object.freeze({
    id: "stagger",
    label: "千鳥接近",
    slots: Object.freeze([
      Object.freeze({ typeId: "small", side: -2.35, vertical: 1.08, delay: .00, speed: 1.18 }),
      Object.freeze({ typeId: "small", side: -.75, vertical: -.98, delay: .26, speed: 1.10 }),
      Object.freeze({ typeId: "medium", side: .55, vertical: .46, delay: .48, speed: .98 }),
      Object.freeze({ typeId: "small", side: 2.1, vertical: -1.14, delay: .70, speed: 1.14 }),
      Object.freeze({ typeId: "medium", side: 3.05, vertical: .10, delay: .90, speed: 1.00 }),
    ]),
  }),
]);
// 宇宙チリはUFOの全幅を基準に3種類へ分類する。表示サイズ、当たり判定、
// ダメージ、速度段階を同じ定義から作ることで、見た目と物理のずれを防ぐ。
const UFO_SPACE_DUST_TYPES = Object.freeze([
  Object.freeze({
    id: "large",
    label: "大型チリ",
    sizeFraction: 2 / 3,
    damage: 100,
    mass: 12,
    integrity: 3,
    speedOptions: Object.freeze([38, 54, 70]),
    color: 0xdf8050,
    emissive: 0x57200c,
    emissiveIntensity: .42,
    trailColor: 0xff9c5b,
    roughness: .88,
    geometry: "dodecahedron",
  }),
  Object.freeze({
    id: "medium",
    label: "中型チリ",
    sizeFraction: 1 / 3,
    damage: 50,
    mass: 3.6,
    integrity: 2,
    speedOptions: Object.freeze([105, 145, 185]),
    color: 0x9b82df,
    emissive: 0x30205d,
    emissiveIntensity: .5,
    trailColor: 0xb497ff,
    roughness: .84,
    geometry: "icosahedron",
  }),
  Object.freeze({
    id: "small",
    label: "小型チリ",
    sizeFraction: 1 / 4,
    damage: 35,
    mass: 1,
    integrity: 1,
    speedOptions: Object.freeze([250, 320, 390]),
    color: 0xaeeeff,
    emissive: 0x185464,
    emissiveIntensity: .58,
    trailColor: 0x8df1ff,
    roughness: .78,
    geometry: "tetrahedron",
  }),
]);
const UFO_SPACE_DUST_COUNTS = Object.freeze({ large: 16, medium: 28, small: 40 });
const UFO_LIGHT_VISUAL_TEST = new URLSearchParams(location.search)
  .get("ufoLightVisualTest") === "1";
// 緊急脱出はリロード開始地点と同じ空駅前へ戻す。UFO配置とは分離する。
const SKY_EMERGENCY_START = Object.freeze({ x: -176.4, z: -132.3, heading: 0 });
// 緊急脱出直後だけ、身体の向きはそのままにカメラを反対側へ回す。
// リロード開始時の画角とは別に管理し、通常開始の設定へ影響させない。
const SKY_EMERGENCY_CAMERA_HEADING = Math.PI;
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
  ufoCameraPresetIndex: 0,
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
  ufoEngineMode: "idle",
  ufoEngineTimer: 0,
  ufoEngineRunning: false,
  ufoEngineSwitchAudioComplete: true,
  ufoCabinLightAmount: 0,
  ufoFlightX: 0,
  ufoFlightY: 0,
  ufoFlightZ: 0,
  ufoFlightHeading: 0,
  ufoFlightBasePitch: 0,
  ufoFlightBaseRoll: 0,
  ufoFlightPitch: 0,
  ufoFlightRoll: 0,
  // 前進スクロールの横操縦で、移動座標とは別にノーズだけを左右へ向ける。
  // カメラは航路基準を保つため、照準が画面上でも左右へ動いて読める。
  ufoFlightDirectionalYaw: 0,
  ufoFlightRockPhase: 0,
  ufoFlightRockBlend: 0,
  ufoFlightWarningRockBlend: 0,
  ufoFlightRockAxisForward: 0,
  ufoFlightRockAxisStrafe: 0,
  ufoFlightBlocked: false,
  ufoFlightAccelerationStage: 0,
  ufoSpaceTransitioning: false,
  ufoInSpace: false,
  ufoSpaceExitSide: null,
  ufoSpaceEntryFlightY: null,
  ufoSpaceLife: UFO_SPACE_LIFE_MAX,
  ufoSpaceDustHitCooldown: 0,
  ufoSpaceDustHitCount: 0,
  ufoSpaceDustDestroyedCount: 0,
  ufoSpaceDeflectionCount: 0,
  ufoSpaceShotCount: 0,
  ufoSpaceCombatStarted: false,
  ufoSpaceRescueState: "idle",
  ufoSpaceRescueIntegrity: 100,
  ufoSpaceRescueStability: 0,
  ufoSpaceRescueDistance: null,
  ufoGravityPinballState: "idle",
  ufoGravityPinballOre: 0,
  ufoGravityPinballCombo: 0,
  ufoGravityPinballBestCombo: 0,
  ufoGravityPinballCharges: UFO_GRAVITY_PINBALL_CORE_CHARGES,
  ufoSalvagePortState: "idle",
  ufoSalvagePortCollected: 0,
  ufoSalvagePortChain: 0,
  ufoSalvagePortBestChain: 0,
  ufoSalvagePortRemaining: 0,
  ufoPlanetBowlingState: "idle",
  ufoPlanetBowlingDemolished: 0,
  ufoPlanetBowlingChain: 0,
  ufoPlanetBowlingBestChain: 0,
  ufoPlanetBowlingShots: UFO_PLANET_BOWLING_SHOTS,
  ufoRingBattleState: "idle",
  ufoRingBattleScore: 0,
  ufoRingBattleCombo: 0,
  ufoRingBattleBestCombo: 0,
  ufoRingBattleRams: 0,
  ufoCranePortState: "idle",
  ufoCranePortBuilt: 0,
  ufoCranePortStable: 0,
  ufoCranePortHooks: 0,
  ufoGravityMazeState: "idle",
  ufoGravityMazeCheckpoints: 0,
  ufoGravityMazeTilt: 0,
  ufoGravityMazePulses: 0,
  ufoInertiaSlingshotState: "idle",
  ufoInertiaSlingshotDistance: 0,
  ufoInertiaSlingshotTension: 0,
  ufoInertiaSlingshotReleases: 0,
  ufoSolarSailState: "idle",
  ufoSolarSailCharge: 0,
  ufoSolarSailPressure: 0,
  ufoSolarSailRides: 0,
  ufoStarMiningState: "idle",
  ufoStarMiningCollected: 0,
  ufoStarMiningVisited: 0,
  ufoStarMiningNearest: "--",
  ufoStarMiningDashCharges: UFO_STAR_MINING_DASH_CHARGES,
  // 火星航路で回収したもの。航行中のエネルギー・宇宙金貨・星素材の
  // 保存だけを担当する。UFO装備倉庫の作成素材には流用しない。
  ufoResources: {
    energyCells: 0,
    spaceCoins: 0,
    starMaterials: 0,
  },
  ufoEquipment: {
    coinGainMultiplier: 1,
    coinGainDamaged: false,
    energyAbsorptionTankLevel: 0,
    simultaneousShotEnabled: false,
    lockOnReticleMultiplier: 1,
    lockOnDetectionMultiplier: 1,
  },
  ufoSpaceHazardGrace: 0,
  ufoSpaceEscapePending: false,
  ufoActualAscentObserver: false,
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
  ufoActions: document.getElementById("ufoActions"),
  ufoFlightControls: document.getElementById("ufoFlightControls"),
  ufoEngineOverlay: document.getElementById("ufoEngineOverlay"),
  ufoEnginePhase: document.getElementById("ufoEnginePhase"),
  ufoEngineDetail: document.getElementById("ufoEngineDetail"),
  spaceTransitionOverlay: document.getElementById("spaceTransitionOverlay"),
  skyStationGuideDialog: document.getElementById("skyStationGuideDialog"),
  skyStationGuideDialogSpeaker: document.getElementById("skyStationGuideDialogSpeaker"),
  skyStationGuideDialogText: document.getElementById("skyStationGuideDialogText"),
  skyStationGuideDialogChoices: document.getElementById("skyStationGuideDialogChoices"),
  skyStationGuideDialogFooter: document.getElementById("skyStationGuideDialogFooter"),
  skyStationGuideDialogPage: document.getElementById("skyStationGuideDialogPage"),
  skyStationGuideDialogNext: document.getElementById("skyStationGuideDialogNext"),
  ufoEquipmentWorkshopMenu: document.getElementById("ufoEquipmentWorkshopMenu"),
  ufoEquipmentWorkshopClose: document.getElementById("ufoEquipmentWorkshopClose"),
  ufoEquipmentWorkshopCloudFiberCount: document.getElementById("ufoEquipmentWorkshopCloudFiberCount"),
  ufoEquipmentWorkshopSkySightCrystalCount: document.getElementById("ufoEquipmentWorkshopSkySightCrystalCount"),
  ufoEquipmentWorkshopArcadePartsCount: document.getElementById("ufoEquipmentWorkshopArcadePartsCount"),
  ufoEquipmentWorkshopList: document.getElementById("ufoEquipmentWorkshopList"),
  ufoEquipmentWorkshopStatus: document.getElementById("ufoEquipmentWorkshopStatus"),
  ufoSpaceLife: document.getElementById("ufoSpaceLife"),
  ufoSpaceLifeLabel: document.getElementById("ufoSpaceLifeLabel"),
  ufoSpaceLifeFill: document.getElementById("ufoSpaceLifeFill"),
  ufoSpaceLifeValue: document.getElementById("ufoSpaceLifeValue"),
  ufoSpaceLifeNote: document.getElementById("ufoSpaceLifeNote"),
  ufoSpaceCombat: document.getElementById("ufoSpaceCombat"),
  ufoSpaceModeTitle: document.getElementById("ufoSpaceModeTitle"),
  ufoSpaceStatOneLabel: document.getElementById("ufoSpaceStatOneLabel"),
  ufoSpaceStatTwoLabel: document.getElementById("ufoSpaceStatTwoLabel"),
  ufoSpaceStatThreeLabel: document.getElementById("ufoSpaceStatThreeLabel"),
  ufoSpaceWave: document.getElementById("ufoSpaceWave"),
  ufoSpaceDustDestroyed: document.getElementById("ufoSpaceDustDestroyed"),
  ufoSpaceDeflectionCount: document.getElementById("ufoSpaceDeflectionCount"),
  ufoSpaceThreatCount: document.getElementById("ufoSpaceThreatCount"),
  ufoSpaceWaveFill: document.getElementById("ufoSpaceWaveFill"),
  ufoSpaceCombatNote: document.getElementById("ufoSpaceCombatNote"),
  ufoSpaceReticle: document.getElementById("ufoSpaceReticle"),
  ufoSpaceStartButton: document.getElementById("ufoSpaceStartButton"),
  ufoSpaceReturnButton: document.getElementById("ufoSpaceReturnButton"),
  ufoSpaceFireButton: document.getElementById("ufoSpaceFireButton"),
  ufoSpaceControlTitle: document.getElementById("ufoSpaceControlTitle"),
  ufoSpaceControlDetail: document.getElementById("ufoSpaceControlDetail"),
  ufoStatus: document.getElementById("ufoStatus"),
  cameraModeButton: document.getElementById("cameraModeButton"),
  cameraDistanceButton: document.getElementById("cameraDistanceButton"),
  emergencyEscapeButton: document.getElementById("emergencyEscapeButton"),
  labelsButton: document.getElementById("labelsButton"),
  physicsDebugButton: document.getElementById("physicsDebugButton"),
  saveButton: document.getElementById("saveButton"),
  resetButton: document.getElementById("resetButton"),
  toast: document.getElementById("toast"),
  ufoForwardScrollRewardFeed: document.getElementById("ufoForwardScrollRewardFeed"),
  touchPad: document.getElementById("touchPad"),
  touchStick: document.getElementById("touchStick"),
  touchHint: document.getElementById("touchHint"),
  ufoFlightPad: document.getElementById("ufoFlightPad"),
  ufoFlightStick: document.getElementById("ufoFlightStick"),
};

let renderer;
let scene;
let camera;
let clock;
let spaceExplorableStarSpriteTexture = null;
const spaceExplorableStarSurfaceTextures = new Map();
const ufoForwardScrollHintTextures = new Map();
let worldGroup;
let mapGroup;
// 物理は表示グループと別の近似箱を増やすのではなく、表示メッシュと
// 同じ world matrix / geometry を持つ専用レイヤーを一つだけ持つ。
let physicsMeshGroup;
let physicsDebugGroup;
let physicsContactMarker;
let character;
let characterShadow;
let skyStationGuide = null;
const skyStationGuideDialogState = {
  open: false,
  phase: "idle",
  touchLatched: false,
  pages: [],
  pageIndex: 0,
  isTyping: false,
  typeTimer: null,
};
const ufoEquipmentWorkshopMenuState = {
  open: false,
  touchLatched: false,
};
let previewGroup;
let labelsGroup;
// 雲マップの空駅にあるアナログ時計。時計本体を再構築した際だけ差し替え、
// 毎フレームは針の回転だけを日本時間へ同期する。
let skyStationClock = null;
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
let ufoFlightPadPointerId = null;
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
let ufoEngineStartAudio = null;
let ufoEngineStartAudioPrimed = false;
let ufoEngineSwitchAudios = [];
let ufoEngineSwitchAudioPrimed = false;
let ufoEngineSwitchPlaybackToken = 0;
let ufoEngineSwitchPlaybackCancel = null;
let ufoGroundTakeoffAudio = null;
let ufoGroundTakeoffAudioPrimed = false;
let ufoGroundTakeoffPlaybackSequence = 0;
let ufoFlightLoopAudio = null;
let ufoFlightLoopAudioPrimed = false;
let ufoFlightLoopAudioActive = false;
let ufoFlightLoopPlaybackSequence = 0;
let ufoMechEquipOpenAudio = null;
let ufoMechEquipOpenAudioPrimed = false;
let ufoMechEquipOpenPlaybackSequence = 0;
let ufoMechEquipCloseAudio = null;
let ufoMechEquipCloseAudioPrimed = false;
let ufoMechEquipClosePlaybackSequence = 0;
let ufoSpaceTransitionSequence = 0;
let ufoSpaceEscapeTimer = null;
let ufoForwardScrollEnergyReturnTimer = null;
const ufoFlightPointerInput = { forward: 0, turn: 0, lift: 0, strafe: 0 };
const ufoPilotSeatedOffset = new THREE.Vector3();
const ufoFlightHoldState = {
  forward: { direction: 0, seconds: 0 },
  turn: { direction: 0, seconds: 0 },
  lift: { direction: 0, seconds: 0 },
  strafe: { direction: 0, seconds: 0 },
};
const UFO_FLIGHT_INPUT_AXES = Object.freeze(["forward", "turn", "lift", "strafe"]);

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const safeJson = value => { try { return JSON.parse(value); } catch { return null; } };

function color(value) { return new THREE.Color(value); }

function makeUfoGroundGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(238,255,244,1)");
  gradient.addColorStop(.24, "rgba(195,255,236,.94)");
  gradient.addColorStop(.58, "rgba(114,238,224,.48)");
  gradient.addColorStop(1, "rgba(87,213,220,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

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

function makeMarsSurfaceTexture() {
  const cacheKey = "mars-surface-terrain-v1";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#6e281c");
  base.addColorStop(.2, "#9f482d");
  base.addColorStop(.52, "#b95f38");
  base.addColorStop(.78, "#83351f");
  base.addColorStop(1, "#542016");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // 固定シードにより、再描画しても同じ火星地形を保つ。
  let seed = 0x5a17c9d3;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let index = 0; index < 2400; index += 1) {
    const alpha = .018 + random() * .065;
    const size = .5 + random() * 2.4;
    ctx.fillStyle = random() > .52
      ? `rgba(255,196,139,${alpha})`
      : `rgba(49,15,10,${alpha})`;
    ctx.fillRect(random() * width, random() * height, size, size);
  }

  // 大小のクレーターと風で削られた筋を描く。見た目だけの凹凸なので、
  // 地表は物理判定と一致する平坦な歩行面のままにする。
  const craters = [
    [188, 168, 94, .58], [468, 252, 138, .67], [870, 176, 74, .52],
    [1210, 212, 122, .61], [1370, 512, 166, .72], [1024, 657, 98, .55],
    [640, 708, 152, .63], [274, 782, 119, .58], [132, 454, 68, .5],
  ];
  craters.forEach(([x, y, radius, flatten]) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, flatten);
    const shadow = ctx.createRadialGradient(-radius * .12, radius * .18, radius * .08, 0, 0, radius);
    shadow.addColorStop(0, "rgba(49,15,10,.63)");
    shadow.addColorStop(.57, "rgba(89,30,18,.42)");
    shadow.addColorStop(.78, "rgba(222,122,72,.3)");
    shadow.addColorStop(1, "rgba(255,174,112,0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,176,113,.36)";
    ctx.lineWidth = Math.max(2, radius * .055);
    ctx.beginPath();
    ctx.arc(0, 0, radius * .78, Math.PI * .86, Math.PI * 1.86);
    ctx.stroke();
    ctx.restore();
  });
  for (let index = 0; index < 28; index += 1) {
    const startX = random() * width;
    const startY = random() * height;
    const length = 80 + random() * 260;
    ctx.strokeStyle = `rgba(255,186,126,${.035 + random() * .06})`;
    ctx.lineWidth = 1 + random() * 4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + length * .26,
      startY + (random() - .5) * 28,
      startX + length * .72,
      startY + (random() - .5) * 34,
      startX + length,
      startY + (random() - .5) * 22,
    );
    ctx.stroke();
  }
  const texture = configureMapTexture(new THREE.CanvasTexture(canvas));
  textureCache.set(cacheKey, texture);
  return texture;
}

function sourceTextureFor(config) {
  if (config.source.texture) return loadMapTexture(config.source.texture);
  if (config.source.composite === "official-sky-layer-composite-v1") return makeSkyCompositeTexture();
  if (config.source.composite === "mars-surface-terrain-v1") return makeMarsSurfaceTexture();
  return null;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 1900);
}

function clearUfoForwardScrollRewardFeed() {
  els.ufoForwardScrollRewardFeed?.replaceChildren();
}

function showUfoForwardScrollReward(typeId, reward) {
  const feed = els.ufoForwardScrollRewardFeed;
  if (!feed) return;
  const item = document.createElement("div");
  const title = document.createElement("strong");
  const detail = document.createElement("small");
  const rewardTitle = typeId === "energy"
    ? "エネルギーゲット！"
    : typeId === "coin"
      ? "宇宙金貨ゲット！"
      : "素材ゲット！";
  item.className = "ufo-forward-scroll-reward";
  item.dataset.type = typeId;
  title.textContent = rewardTitle;
  detail.textContent = reward;
  item.append(title, detail);
  feed.prepend(item);
  while (feed.children.length > UFO_FORWARD_SCROLL_REWARD_FEED_LIMIT) {
    feed.lastElementChild?.remove();
  }
  window.setTimeout(() => {
    if (!item.isConnected) return;
    item.classList.add("is-leaving");
    window.setTimeout(() => item.remove(), 220);
  }, UFO_FORWARD_SCROLL_REWARD_FEED_LIFETIME_MS);
}

function ensureUfoEngineStartAudio() {
  if (ufoEngineStartAudio) return ufoEngineStartAudio;
  const audio = new Audio(UFO_ENGINE_START_AUDIO_URL);
  audio.id = "ufoEngineStartAudio";
  audio.hidden = true;
  audio.preload = "auto";
  audio.volume = UFO_ENGINE_START_AUDIO_VOLUME;
  document.body.appendChild(audio);
  ufoEngineStartAudio = audio;
  return audio;
}

function primeUfoEngineStartAudio() {
  if (ufoEngineStartAudioPrimed) return;
  const audio = ensureUfoEngineStartAudio();
  audio.muted = true;
  audio.currentTime = 0;
  const playback = audio.play();
  if (!playback?.then) return;
  playback.then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    ufoEngineStartAudioPrimed = true;
  }).catch(() => {
    audio.muted = false;
  });
}

function playUfoEngineStartAudio() {
  const audio = ensureUfoEngineStartAudio();
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = UFO_ENGINE_START_AUDIO_VOLUME;
  const playback = audio.play();
  playback?.catch(() => {
    // A later ordinary control gesture will prime audio if this browser has
    // not yet granted playback. The engine sequence itself keeps running.
    ufoEngineStartAudioPrimed = false;
  });
}

function stopUfoEngineStartAudio() {
  if (!ufoEngineStartAudio) return;
  ufoEngineStartAudio.pause();
  ufoEngineStartAudio.currentTime = 0;
}

function ensureUfoMechEquipOpenAudio() {
  if (ufoMechEquipOpenAudio) return ufoMechEquipOpenAudio;
  const audio = new Audio(UFO_MECH_EQUIP_OPEN_AUDIO_URL);
  audio.id = "ufoMechEquipOpenAudio";
  audio.hidden = true;
  audio.preload = "auto";
  audio.volume = UFO_MECH_EQUIP_AUDIO_VOLUME;
  document.body.appendChild(audio);
  ufoMechEquipOpenAudio = audio;
  return audio;
}

function primeUfoMechEquipOpenAudio() {
  if (ufoMechEquipOpenAudioPrimed) return;
  const audio = ensureUfoMechEquipOpenAudio();
  const playbackSequence = ufoMechEquipOpenPlaybackSequence;
  audio.muted = true;
  audio.currentTime = 0;
  const playback = audio.play();
  if (!playback?.then) return;
  playback.then(() => {
    if (ufoMechEquipOpenPlaybackSequence !== playbackSequence) return;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    ufoMechEquipOpenAudioPrimed = true;
  }).catch(() => {
    audio.muted = false;
  });
}

function playUfoMechEquipOpenAudio() {
  const audio = ensureUfoMechEquipOpenAudio();
  ufoMechEquipOpenPlaybackSequence += 1;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = UFO_MECH_EQUIP_AUDIO_VOLUME;
  const playback = audio.play();
  playback?.catch(() => {
    ufoMechEquipOpenAudioPrimed = false;
  });
}

function ensureUfoMechEquipCloseAudio() {
  if (ufoMechEquipCloseAudio) return ufoMechEquipCloseAudio;
  const audio = new Audio(UFO_MECH_EQUIP_CLOSE_AUDIO_URL);
  audio.id = "ufoMechEquipCloseAudio";
  audio.hidden = true;
  audio.preload = "auto";
  audio.volume = UFO_MECH_EQUIP_AUDIO_VOLUME;
  document.body.appendChild(audio);
  ufoMechEquipCloseAudio = audio;
  return audio;
}

function primeUfoMechEquipCloseAudio() {
  if (ufoMechEquipCloseAudioPrimed) return;
  const audio = ensureUfoMechEquipCloseAudio();
  const playbackSequence = ufoMechEquipClosePlaybackSequence;
  audio.muted = true;
  audio.currentTime = 0;
  const playback = audio.play();
  if (!playback?.then) return;
  playback.then(() => {
    if (ufoMechEquipClosePlaybackSequence !== playbackSequence) return;
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    ufoMechEquipCloseAudioPrimed = true;
  }).catch(() => {
    audio.muted = false;
  });
}

function playUfoMechEquipCloseAudio() {
  const audio = ensureUfoMechEquipCloseAudio();
  ufoMechEquipClosePlaybackSequence += 1;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = UFO_MECH_EQUIP_AUDIO_VOLUME;
  const playback = audio.play();
  playback?.catch(() => {
    ufoMechEquipCloseAudioPrimed = false;
  });
}

function primeUfoMechEquipAudio() {
  primeUfoMechEquipOpenAudio();
  primeUfoMechEquipCloseAudio();
}

function stopUfoMechEquipAudio() {
  ufoMechEquipOpenPlaybackSequence += 1;
  ufoMechEquipClosePlaybackSequence += 1;
  [ufoMechEquipOpenAudio, ufoMechEquipCloseAudio].forEach(audio => {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  });
}

function ensureUfoEngineSwitchAudios() {
  if (ufoEngineSwitchAudios.length) return ufoEngineSwitchAudios;
  ufoEngineSwitchAudios = UFO_ENGINE_SWITCH_AUDIO_URLS.map((url, index) => {
    const audio = new Audio(url);
    audio.id = `ufoEngineSwitchAudio${String(index + 1).padStart(2, "0")}`;
    audio.hidden = true;
    audio.preload = "auto";
    audio.volume = UFO_ENGINE_SWITCH_AUDIO_VOLUME;
    document.body.appendChild(audio);
    return audio;
  });
  return ufoEngineSwitchAudios;
}

function primeUfoEngineSwitchAudio() {
  if (ufoEngineSwitchAudioPrimed) return;
  const audios = ensureUfoEngineSwitchAudios();
  const playbackToken = ufoEngineSwitchPlaybackToken;
  const preloads = audios.map(audio => {
    audio.muted = true;
    audio.currentTime = 0;
    const playback = audio.play();
    if (!playback?.then) return Promise.resolve();
    return playback.then(() => {
      audio.muted = false;
      if (ufoEngineSwitchPlaybackToken !== playbackToken) return;
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {
      audio.muted = false;
    });
  });
  Promise.all(preloads).then(() => {
    ufoEngineSwitchAudioPrimed = true;
  });
}

function waitForUfoEngineSwitchAudio(audio) {
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      if (ufoEngineSwitchPlaybackCancel === finish) ufoEngineSwitchPlaybackCancel = null;
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
    ufoEngineSwitchPlaybackCancel = finish;
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = UFO_ENGINE_SWITCH_AUDIO_VOLUME;
    const playback = audio.play();
    playback?.catch(finish);
  });
}

async function playUfoEngineSwitchSequenceThenStart() {
  const playbackToken = ++ufoEngineSwitchPlaybackToken;
  const audios = ensureUfoEngineSwitchAudios();
  for (const audio of audios) {
    if (playbackToken !== ufoEngineSwitchPlaybackToken) return;
    await waitForUfoEngineSwitchAudio(audio);
  }
  if (playbackToken !== ufoEngineSwitchPlaybackToken || state.ufoEngineMode !== "lighting") return;
  state.ufoEngineSwitchAudioComplete = true;
  state.ufoEngineRunning = true;
  playUfoEngineStartAudio();
  updateUfoEngineOverlay();
  updateUfoControls();
  updateUfoEngineSequence(0);
}

function stopUfoEngineSwitchAudio() {
  ufoEngineSwitchPlaybackToken += 1;
  ufoEngineSwitchPlaybackCancel?.();
  ufoEngineSwitchPlaybackCancel = null;
  ufoEngineSwitchAudios.forEach(audio => {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.currentTime = 0;
  });
}

function ensureUfoFlightLoopAudio() {
  if (ufoFlightLoopAudio) return ufoFlightLoopAudio;
  const audio = new Audio(UFO_FLIGHT_LOOP_AUDIO_URL);
  audio.id = "ufoFlightLoopAudio";
  audio.hidden = true;
  audio.preload = "auto";
  // The retained asset/function name is historical. During flight this sound
  // now plays once per takeoff and must never loop continuously.
  audio.loop = false;
  audio.volume = UFO_FLIGHT_LOOP_AUDIO_VOLUME;
  document.body.appendChild(audio);
  ufoFlightLoopAudio = audio;
  return audio;
}

function primeUfoFlightLoopAudio() {
  if (ufoFlightLoopAudioPrimed) return;
  const audio = ensureUfoFlightLoopAudio();
  const playbackSequence = ufoFlightLoopPlaybackSequence;
  audio.muted = true;
  audio.currentTime = 0;
  audio.loop = false;
  const playback = audio.play();
  if (!playback?.then) {
    audio.muted = false;
    ufoFlightLoopAudioPrimed = true;
    return;
  }
  playback.then(() => {
    audio.muted = false;
    ufoFlightLoopAudioPrimed = true;
    if (ufoFlightLoopPlaybackSequence !== playbackSequence) return;
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {
    audio.muted = false;
  });
}

function startUfoFlightLoopAudio() {
  if (ufoFlightLoopAudioActive) return;
  const audio = ensureUfoFlightLoopAudio();
  ufoFlightLoopPlaybackSequence += 1;
  audio.loop = false;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = UFO_FLIGHT_LOOP_AUDIO_VOLUME;
  ufoFlightLoopAudioActive = true;
  const playback = audio.play();
  playback?.catch(() => {
    ufoFlightLoopAudioActive = false;
    ufoFlightLoopAudioPrimed = false;
  });
}

function stopUfoFlightLoopAudio() {
  if (!ufoFlightLoopAudio) return;
  ufoFlightLoopPlaybackSequence += 1;
  ufoFlightLoopAudioActive = false;
  ufoFlightLoopAudio.pause();
  ufoFlightLoopAudio.currentTime = 0;
}

function ensureUfoGroundTakeoffAudio() {
  if (ufoGroundTakeoffAudio) return ufoGroundTakeoffAudio;
  const audio = new Audio(UFO_GROUND_TAKEOFF_AUDIO_URL);
  audio.id = "ufoGroundTakeoffAudio";
  audio.hidden = true;
  audio.preload = "auto";
  audio.volume = UFO_GROUND_TAKEOFF_AUDIO_VOLUME;
  document.body.appendChild(audio);
  ufoGroundTakeoffAudio = audio;
  return audio;
}

function primeUfoGroundTakeoffAudio() {
  if (ufoGroundTakeoffAudioPrimed) return;
  const audio = ensureUfoGroundTakeoffAudio();
  const playbackSequence = ufoGroundTakeoffPlaybackSequence;
  audio.muted = true;
  audio.currentTime = 0;
  const playback = audio.play();
  if (!playback?.then) return;
  playback.then(() => {
    audio.muted = false;
    ufoGroundTakeoffAudioPrimed = true;
    // If the real takeoff began while the muted preload was still resolving,
    // do not let the preload callback pause or rewind the live sound.
    if (ufoGroundTakeoffPlaybackSequence !== playbackSequence) return;
    audio.pause();
    audio.currentTime = 0;
  }).catch(() => {
    audio.muted = false;
  });
}

function primeUfoAudio() {
  primeUfoEngineStartAudio();
  primeUfoEngineSwitchAudio();
  primeUfoGroundTakeoffAudio();
  primeUfoFlightLoopAudio();
  primeUfoMechEquipAudio();
}

function playUfoGroundTakeoffAudio() {
  const audio = ensureUfoGroundTakeoffAudio();
  ufoGroundTakeoffPlaybackSequence += 1;
  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = UFO_GROUND_TAKEOFF_AUDIO_VOLUME;
  const playback = audio.play();
  playback?.catch(() => {
    ufoGroundTakeoffAudioPrimed = false;
  });
}

function stopUfoGroundTakeoffAudio() {
  if (!ufoGroundTakeoffAudio) return;
  ufoGroundTakeoffPlaybackSequence += 1;
  ufoGroundTakeoffAudio.pause();
  ufoGroundTakeoffAudio.currentTime = 0;
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
    ufoResources: { ...state.ufoResources },
    ufoEquipment: { ...state.ufoEquipment },
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
  } else if (options.fromEmergency && mapKey === "sky") {
    state.viewHeading = SKY_EMERGENCY_CAMERA_HEADING;
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
  const savedResources = saved.ufoResources && typeof saved.ufoResources === "object"
    ? saved.ufoResources
    : {};
  state.ufoResources.energyCells = Math.max(0, Number(savedResources.energyCells) || 0);
  state.ufoResources.spaceCoins = Math.max(0, Number(savedResources.spaceCoins) || 0);
  state.ufoResources.starMaterials = Math.max(0, Number(savedResources.starMaterials) || 0);
  const savedEquipment = saved.ufoEquipment && typeof saved.ufoEquipment === "object"
    ? saved.ufoEquipment
    : {};
  state.ufoEquipment.coinGainMultiplier = Math.max(
    1,
    Number(savedEquipment.coinGainMultiplier) || 1,
  );
  state.ufoEquipment.coinGainDamaged = Boolean(savedEquipment.coinGainDamaged);
  state.ufoEquipment.energyAbsorptionTankLevel = clamp(
    Math.round(Number(savedEquipment.energyAbsorptionTankLevel) || 0),
    0,
    2,
  );
  state.ufoEquipment.simultaneousShotEnabled = Boolean(savedEquipment.simultaneousShotEnabled);
  state.ufoEquipment.lockOnReticleMultiplier = savedEquipment.lockOnReticleMultiplier >= 1.2
    ? 1.2
    : 1;
  state.ufoEquipment.lockOnDetectionMultiplier = savedEquipment.lockOnDetectionMultiplier >= 1.2
    ? 1.2
    : 1;
  state.saved = true;
  els.saveState.textContent = "保存済み";
}

function emergencyEscape() {
  resetUfoSpaceHazardState();
  // 移動入力と視点ドラッグを同時に解除し、ワープ直後に同じ入力で
  // 再び壁へ押し付けられないようにする。
  keys.clear();
  touchVector.set(0, 0);
  touchPointerId = null;
  lookPointerId = null;
  els.touchStick.style.transform = "translate(-50%, -50%)";
  els.viewport.classList.remove("is-looking");

  resetUfoEngineRuntime();
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
    scene.fog = new THREE.Fog(MAPS.sky.palette.fog, 360, 780);
  }
  rebuildMap();
  updateCharacter(0);
  updateCamera();
  updateUfoControls();
  saveState();
  showToast("緊急帰還：雲マップの空駅入口へ戻りました");
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
  resetUfoEngineRuntime();
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

function addMarsBoundaryFence(parent, config) {
  if (!config?.decoration?.perimeterFence) return;
  const group = new THREE.Group();
  group.name = "mars-perimeter-fence";
  const halfWidth = config.world.width / 2 - 16;
  const halfDepth = config.world.depth / 2 - 16;
  const railMaterial = physicalMaterial(0x40231f, .56, .33, 0x1c0804, .12);
  const postMaterial = physicalMaterial(0x281411, .72, .18);
  const beaconMaterial = physicalMaterial(0xff8b43, .22, .16, 0x9c260d, 1.15);
  const markPhysical = mesh => {
    mesh.userData.marsFenceCollision = true;
    return mesh;
  };
  const addHorizontalRails = z => {
    markPhysical(addBox(group, [halfWidth * 2 + 2, 2.8, 2.8], [0, 2.3, z], railMaterial));
    markPhysical(addBox(group, [halfWidth * 2 + 2, 1.4, 1.7], [0, 10.4, z], railMaterial));
  };
  const addVerticalRails = x => {
    markPhysical(addBox(group, [2.8, 2.8, halfDepth * 2 + 2], [x, 2.3, 0], railMaterial));
    markPhysical(addBox(group, [1.7, 1.4, halfDepth * 2 + 2], [x, 10.4, 0], railMaterial));
  };
  addHorizontalRails(-halfDepth);
  addHorizontalRails(halfDepth);
  addVerticalRails(-halfWidth);
  addVerticalRails(halfWidth);

  const addPost = (x, z, beacon = false) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.86, 1.08, 14, 10), postMaterial);
    post.position.set(x, 7, z);
    post.castShadow = true;
    post.receiveShadow = true;
    markPhysical(post);
    group.add(post);
    if (beacon) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(1.45, 12, 9), beaconMaterial);
      light.position.set(x, 14.35, z);
      light.userData.nonCollidable = true;
      group.add(light);
    }
  };
  const longPostCount = 25;
  const shortPostCount = 17;
  for (let index = 0; index <= longPostCount; index += 1) {
    const x = THREE.MathUtils.lerp(-halfWidth, halfWidth, index / longPostCount);
    const beacon = index % 5 === 0;
    addPost(x, -halfDepth, beacon);
    addPost(x, halfDepth, beacon);
  }
  for (let index = 1; index < shortPostCount; index += 1) {
    const z = THREE.MathUtils.lerp(-halfDepth, halfDepth, index / shortPostCount);
    const beacon = index % 4 === 0;
    addPost(-halfWidth, z, beacon);
    addPost(halfWidth, z, beacon);
  }

  parent.add(group);
  // 物理判定は、実際に表示したレール・支柱の形状と同じ world matrix
  // から抽出する。外周に別の見えない壁を足さない。
  addVisualBuildingColliders(group, "mars-perimeter-fence", {
    registerSurfaces: false,
    registerSurfaceEdges: false,
    includeObject: object => object.userData?.marsFenceCollision === true,
  });
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
  registerSurfacePerimeterColliders({
    surfaceId: id,
    buildingId,
    polygon: rectanglePolygon(x, z, size, rotation),
    minY: 0,
    maxY: height,
    obstacleHeight: height,
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

function addSurfaceDebugMesh(surface, material) {
  if (surface?.polygon?.length >= 3) {
    const center = surface.polygon.reduce(
      (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
      { x: 0, z: 0 },
    );
    center.x /= surface.polygon.length;
    center.z /= surface.polygon.length;
    const positions = [];
    for (let index = 0; index < surface.polygon.length; index += 1) {
      const current = surface.polygon[index];
      const next = surface.polygon[(index + 1) % surface.polygon.length];
      positions.push(
        center.x, surface.height + .04, center.z,
        current.x, surface.height + .04, current.z,
        next.x, surface.height + .04, next.z,
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 19;
    return mesh;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(surface.halfX * 2, surface.halfZ * 2), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = surface.rotation || 0;
  mesh.position.set(surface.x, surface.height + .04, surface.z);
  mesh.renderOrder = 19;
  return mesh;
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
    physicsDebugGroup.add(addSurfaceDebugMesh(surface, surfaceMaterial));
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

function registerSurfacePerimeterColliders({
  surfaceId,
  buildingId = null,
  polygon,
  minY = 0,
  maxY,
  obstacleHeight = maxY,
  thickness = .18,
}) {
  if (!surfaceId
    || !Array.isArray(polygon)
    || polygon.length < 3
    || !polygon.every(point => Number.isFinite(point?.x) && Number.isFinite(point?.z))
    || ![minY, maxY, obstacleHeight].every(Number.isFinite)) return [];

  // A raised surface is a horizontal top plus thin vertical faces around its
  // perimeter. Registering the complete footprint as one solid prism blocks
  // the usable top and the air above it. Splitting the hull into edge strips
  // keeps only the visible sides solid, for every authored building surface.
  const edgeThickness = Math.max(.08, Math.min(.5, thickness));
  const edgeIds = [];
  polygon.forEach((start, index) => {
    const end = polygon[(index + 1) % polygon.length];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (!(length > .05)) return;
    const halfThickness = edgeThickness / 2;
    const normalX = -dz / length * halfThickness;
    const normalZ = dx / length * halfThickness;
    const edgePolygon = [
      { x: start.x + normalX, z: start.z + normalZ },
      { x: end.x + normalX, z: end.z + normalZ },
      { x: end.x - normalX, z: end.z - normalZ },
      { x: start.x - normalX, z: start.z - normalZ },
    ];
    const edgeId = `${surfaceId}-edge-${index}`;
    registerPhysicsCollider({
      x: (start.x + end.x) / 2,
      z: (start.z + end.z) / 2,
      rotation: Math.atan2(-dz, dx),
      localHalfX: length / 2,
      localHalfZ: halfThickness,
      halfX: length / 2,
      halfZ: halfThickness,
      id: edgeId,
      surfaceId,
      buildingId,
      minY,
      maxY,
      obstacleHeight,
      stepAdjacent: true,
      surfaceEdge: true,
      clearance: 0,
      polygon: edgePolygon,
    });
    edgeIds.push(edgeId);
  });
  return edgeIds;
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
  tangentOverlap = 1.16,
) {
  const scale = control.scale || BUILDING_SCALE;
  const rotationY = control.rotation || 0;
  const tangentWidth = Math.max(1.2, (Math.PI * 2 * localRadius / segmentCount) * tangentOverlap);
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

function addUfoCircularCabinFloor(control, buildingId) {
  const scale = control.scale || BUILDING_SCALE;
  const rotationY = control.rotation || 0;
  const radius = control.cabinFloorRadius || control.ufoBottomTopRadius || 38.4;
  const topY = (control.originY || 0) + (control.cabinFloorTopY || 9.55) * scale;
  // The permanent UFO bottom is the cabin floor. Its support polygon must use
  // the complete visible top radius, not only the small area under the glass
  // capsule. Otherwise the character can walk normally inside the saucer and
  // fall through the annulus between the cockpit and the outer shell.
  const floorSegments = 96;
  const polygon = [];
  for (let index = 0; index < floorSegments; index += 1) {
    const angle = index / floorSegments * Math.PI * 2;
    polygon.push(ufoLocalToWorld(control, radius * Math.cos(angle), radius * Math.sin(angle)));
  }
  registerPhysicsFloor({
    id: `${buildingId}-ufo-cabin-floor`,
    buildingId,
    x: control.originX,
    z: control.originZ,
    rotation: rotationY,
    halfX: radius * scale,
    halfZ: radius * scale,
    height: topY,
    polygon,
    physicsSource: "ufo-cabin-floor",
  });
}

function addUfoSeatRampPhysics(control, buildingId) {
  const scale = control.scale || BUILDING_SCALE;
  const rotationY = control.rotation || 0;
  const length = control.seatRampLength || 9.8;
  const width = control.seatRampWidth || 14.5;
  const centerX = control.seatRampCenterX || 12.6;
  const centerZ = control.seatRampCenterZ || 4.08;
  const centerY = control.seatRampCenterY || 12.9;
  const rotationZ = control.seatRampRotation || 0;
  const topOffsetY = (control.seatRampThickness || .8) / 2;
  const cosSlope = Math.cos(rotationZ);
  const sinSlope = Math.sin(rotationZ);
  const stripCount = 48;
  const stripLength = length / stripCount;
  for (let index = 0; index < stripCount; index += 1) {
    const slopeX = -length / 2 + stripLength * (index + .5);
    const localX = centerX + cosSlope * slopeX - sinSlope * topOffsetY;
    const worldCenter = ufoLocalToWorld(control, localX, centerZ);
    const height = Math.max(
      0,
      (control.originY || 0)
        + (centerY + sinSlope * slopeX + cosSlope * topOffsetY) * scale,
    );
    registerPhysicsFloor({
      id: `${buildingId}-ufo-seat-ramp-${index}`,
      buildingId,
      x: worldCenter.x,
      z: worldCenter.z,
      rotation: rotationY,
      halfX: stripLength * scale * .58,
      halfZ: width * scale / 2,
      height,
      physicsSource: "ufo-seat-ramp",
    });
  }
}

function ufoCapsuleOpeningHalfAngle(control) {
  const shellOpening = control.hatchGapHalfAngle || THREE.MathUtils.degToRad(15);
  const entryHalfWidth = (control.interiorEntryWidth || control.rampWidth || 18) / 2;
  const capsuleRadius = control.capsuleRadius || 24;
  return Math.max(
    shellOpening,
    Math.asin(Math.min(.92, entryHalfWidth / capsuleRadius))
      + THREE.MathUtils.degToRad(4.5),
  );
}

function ufoCapsuleSeamOpeningHalfAngle(control) {
  // The visible drawer's white walking face is narrower than its outer body.
  // The old capsule opening angle was calculated at radius 24 and then reused
  // at the larger full-ring radius 29, plus another 4.5 degrees. That removed
  // almost twice the required arc and allowed entry beside the actual ramp.
  // Derive this opening at the ring itself and leave only a sub-unit assembly
  // tolerance, so the legal +X walkway stays usable without opening either
  // side of it to the outside.
  const rampWidth = control.rampWidth || 18;
  const visibleSurfaceHalfWidth = Math.max(0, (rampWidth - 4) / 2);
  const assemblyTolerance = .35;
  return Math.asin(Math.min(
    .92,
    (visibleSurfaceHalfWidth + assemblyTolerance) / UFO_CAPSULE_SEAM_RADIUS,
  ));
}

function isInsideUfoCapsuleOpening(control, localX, localZ) {
  const angle = Math.atan2(localZ, localX);
  return localX > 0 && Math.abs(angle) <= ufoCapsuleOpeningHalfAngle(control);
}

function addUfoStructuralColliders(control, buildingId) {
  if (!control) return;
  const openingHalfAngle = control.hatchGapHalfAngle || THREE.MathUtils.degToRad(15);
  // Lower and upper saucers are split into narrow outer-shell prisms. The
  // central cockpit remains open, while every visible outer shell segment is
  // solid at its actual height.
  addUfoRingCollision(control, buildingId, 39, 7.5, 16.5, 40, 5.5, openingHalfAngle, "lower-shell");
  addUfoRingCollision(control, buildingId, 37, 17.5, 22.5, 40, 5.2, openingHalfAngle, "upper-shell");

  // The bright full-circumference trim and the glass capsule form one real
  // structural seam.  Previously only the outer shell and capsule were
  // collidable, leaving an annular gap between them that a jumping character
  // could squeeze through.  Fill that exact annulus with narrow tangential
  // prisms instead of one broad invisible box.  Only the authored +X boarding
  // corridor remains open, and its width is derived from the visible entry
  // deck rather than from an unrelated hand-tuned angle.
  const capsuleRadius = control.capsuleRadius || 24;
  const capsuleOpeningHalfAngle = ufoCapsuleOpeningHalfAngle(control);
  const seamOpeningHalfAngle = ufoCapsuleSeamOpeningHalfAngle(control);
  addUfoRingCollision(
    control,
    buildingId,
    UFO_CAPSULE_SEAM_RADIUS,
    UFO_CAPSULE_SEAM_MIN_Y,
    UFO_CAPSULE_SEAM_MAX_Y,
    96,
    UFO_CAPSULE_SEAM_RADIAL_THICKNESS,
    seamOpeningHalfAngle,
    "capsule-ring-seam",
    1.28,
  );

  // The transparent capsule is a curved upper shell, not a box. Twelve narrow
  // height bands and 48 tangential segments follow the rendered hemisphere,
  // closing the former coarse gaps from every direction. The capsule itself
  // keeps the same narrow +X opening as the authored boarding hatch. The
  // curved vertical ceiling resolver below prevents jumping through the glass;
  // horizontal passage remains possible only through the legal hatch axis.
  const domeBaseY = 23;
  const domeHeight = capsuleRadius * 1.16;
  const bandCount = 12;
  for (let band = 0; band < bandCount; band += 1) {
    const t0 = band / bandCount;
    const t1 = (band + 1) / bandCount;
    const t = (t0 + t1) / 2;
    const visualRadius = capsuleRadius * Math.sqrt(Math.max(.001, 1 - t * t));
    // Expand only toward the cabin: increasing thickness while shifting its
    // centre inward keeps the outer edge in place and adds the requested thin
    // physical margin on the inside of the visible capsule.
    const radius = Math.max(.1, visualRadius - UFO_CAPSULE_COLLISION_INSET / 2);
    addUfoRingCollision(
      control,
      buildingId,
      radius,
      domeBaseY + domeHeight * t0,
      domeBaseY + domeHeight * t1,
      48,
      2.35 + UFO_CAPSULE_COLLISION_INSET,
      capsuleOpeningHalfAngle,
      `capsule-${band}`,
    );
  }

  addUfoCircularCabinFloor(control, buildingId);
  addUfoSeatRampPhysics(control, buildingId);
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
  // The closed panel also covers the full-ring seam height. Stopping at the
  // upper-shell height left a thin jump-through slit above the closed hatch.
  const maxY = (control.originY || 0) + UFO_CAPSULE_SEAM_MAX_Y * scale;
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
  // A continuous authored slope can touch the thin perimeter of its landing
  // before the character root reaches that landing.  At that instant the
  // from/to ground samples still belong to the slope, so the ordinary step
  // solver sees the landing edge as a wall even though both visible top faces
  // meet within one walkable rise.  Resolve this from the shared surface
  // metadata (not from a coordinate or one particular edge id): only a real
  // surface edge whose own top is the next continuation of the ramp is open.
  if (collider?.surfaceEdge && collider.surfaceId && isContinuousUfoRampTransition(transition)) {
    const landing = walkableSurfaces.find(surface => surface.id === collider.surfaceId);
    // A large character silhouette reaches the landing edge before its root
    // reaches the end of the slope. Compare the landing with the highest real
    // support sampled underneath that forward footprint, not only with the
    // root's earlier height. Using the root alone made the visible continuous
    // slope look like a tall wall and forced a jump at its final centimetres.
    const approachHeight = [
      transition.fromHeight,
      transition.toHeight,
      transition.probeHeight,
      transition.lookAheadHeight,
    ].filter(Number.isFinite).reduce((highest, height) => Math.max(highest, height), 0);
    const landingRise = Number.isFinite(landing?.height)
      ? landing.height - approachHeight
      : Infinity;
    const riseAllowance = Math.max(1.1, ufoSeatRampLandingAllowance(transition));
    if (landingRise >= -1.1 && landingRise <= riseAllowance) return true;
  }
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
  const includeObject = typeof options.includeObject === "function"
    ? options.includeObject
    : object => object.userData?.nonCollidable !== true;
  const maximumSurfaceHeight = Number.isFinite(options.maximumSurfaceHeight)
    ? options.maximumSurfaceHeight
    : 28;
  group.updateMatrixWorld(true);
  let registered = 0;
  let surfaceIndex = 0;
  group.traverse(object => {
    if (!object.isMesh || object.visible === false || !includeObject(object)) return;
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
      const surfaceId = object.userData?.physicsSurfaceId
        ? `${id}-${object.userData.physicsSurfaceId}`
        : `${id}-surface-${surfaceIndex++}`;
      registerPhysicsFloor({
        id: surfaceId,
        buildingId: id,
        x: center.x,
        z: center.z,
        rotation: worldEuler.y,
        halfX: orientedSize.x / 2,
        halfZ: orientedSize.z / 2,
        height: Math.max(0, bounds.max.y),
        physicsSource: object.userData?.physicsSource || "visual-surface",
      });
      // A visible raised floor has two physical parts: its top surface and
      // the thin vertical faces around that surface. The complete footprint
      // must not become one solid prism, because that blocks the usable top
      // and makes the empty space over a board impassable.
      const surfaceHeight = Math.max(0, bounds.max.y);
      // A floor at world Y=0 has no vertical lip.  Registering its full
      // footprint as an edge creates a phantom collider over the entire
      // ground plane, so only genuinely raised visible surfaces get an edge.
      if (registerSurfaceEdges && surfaceHeight > .2 && !object.isInstancedMesh) {
        const surfacePolygon = meshFootprintPolygon(object)
          || rectanglePolygon(center.x, center.z, [orientedSize.x, orientedSize.z], worldEuler.y);
        registerSurfacePerimeterColliders({
          surfaceId,
          buildingId: id,
          polygon: surfacePolygon,
          minY: bounds.min.y,
          maxY: bounds.max.y,
          obstacleHeight: surfaceHeight,
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

function addFaceAuthPhysicsColliders(faceAuth, buildingId) {
  if (!faceAuth?.assembly) return;
  // The scanner was deliberately excluded from the general building pass so
  // the standing marker would not become an invisible wall. Re-register only
  // the scanner's visible body parts, using their own world matrices so the
  // physical shape stays locked to the rendered device after world anchoring.
  addVisualBuildingColliders(faceAuth.assembly, `${buildingId}-face-auth`, {
    registerSurfaces: false,
    registerSurfaceEdges: false,
    includeObject: object => object.userData?.faceAuthCollision === true,
  });
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

function pointInPolygon(x, z, polygon, edgeEpsilon = 0.02) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    const edgeX = current.x - prior.x;
    const edgeZ = current.z - prior.z;
    const toPointX = x - prior.x;
    const toPointZ = z - prior.z;
    const edgeLengthSq = edgeX * edgeX + edgeZ * edgeZ;
    if (edgeLengthSq > 1e-8) {
      const projection = Math.max(0, Math.min(1, (toPointX * edgeX + toPointZ * edgeZ) / edgeLengthSq));
      const nearestX = prior.x + edgeX * projection;
      const nearestZ = prior.z + edgeZ * projection;
      if (Math.hypot(x - nearestX, z - nearestZ) <= edgeEpsilon) return true;
    }
    const crosses = ((current.z > z) !== (prior.z > z))
      && (x < (prior.x - current.x) * (z - current.z) / (prior.z - current.z) + current.x);
    if (crosses) inside = !inside;
  }
  return inside;
}

function circleIntersectsPolygon(x, z, radius, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3 || !(radius >= 0)) return false;
  if (pointInPolygon(x, z, polygon, radius > 0 ? .001 : 0)) return true;
  const radiusSquared = radius * radius;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const edgeX = end.x - start.x;
    const edgeZ = end.z - start.z;
    const edgeLengthSquared = edgeX * edgeX + edgeZ * edgeZ;
    const projection = edgeLengthSquared > 1e-8
      ? clamp(((x - start.x) * edgeX + (z - start.z) * edgeZ) / edgeLengthSquared, 0, 1)
      : 0;
    const nearestX = start.x + edgeX * projection;
    const nearestZ = start.z + edgeZ * projection;
    const distanceSquared = (x - nearestX) ** 2 + (z - nearestZ) ** 2;
    if (distanceSquared < radiusSquared) return true;
  }
  return false;
}

function surfaceContainsPoint(x, z, surface, edgeEpsilon = 0.02) {
  if (surface?.polygon?.length >= 3) return pointInPolygon(x, z, surface.polygon, edgeEpsilon);
  const local = surfaceLocalPoint(x, z, surface);
  return Math.abs(local.x) < surface.halfX + edgeEpsilon
    && Math.abs(local.z) < surface.halfZ + edgeEpsilon;
}

function authoredUfoRampHeightAt(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  let highest = null;
  const includeHeight = height => {
    if (Number.isFinite(height) && (highest === null || height > highest)) highest = height;
  };
  ufoDoorControls.forEach(control => {
    const isOpen = (control.amount || 0) > .001 || (control.target || 0) > .001;
    const local = ufoWorldToLocal(control, x, z);
    if (isOpen) {
      const rampLength = control.rampLength || 84;
      const rampWidth = control.rampWidth || 18;
      const surfaceLength = rampLength - 3;
      const surfaceWidth = rampWidth - 4;
      const centerX = control.rampOpenPosition?.x || 0;
      const centerZ = control.rampOpenPosition?.z || 0;
      const localX = local.x - centerX;
      if (Math.abs(localX) <= surfaceLength / 2 + .001
        && Math.abs(local.z - centerZ) <= surfaceWidth / 2 + .001) {
        const rampRotationZ = control.rampOpenRotation || 0;
        const surfaceTopY = 1.55 + .55 / 2;
        includeHeight(Math.max(
          0,
          (control.originY || 0)
            + (control.rampOpenPosition.y
              + Math.sin(rampRotationZ) * localX
              + Math.cos(rampRotationZ) * surfaceTopY) * (control.scale || BUILDING_SCALE),
        ));
      }

      // The short board inside the hull is also a single authored slope. Its
      // physics strips are only a debug representation; movement uses this
      // exact top plane so the character cannot catch between strips or at
      // the cockpit-floor seam while walking toward the chair.
      const entryLength = control.interiorEntryLength || 20.5;
      const entryWidth = control.interiorEntryWidth || control.rampWidth || 18;
      const entryCenterX = control.interiorEntryCenterX || 26.75;
      const entryCenterZ = control.interiorEntryCenterZ ?? 0;
      const entryCenterY = control.interiorEntryCenterY || 9.45;
      const entryRotation = control.interiorEntryRotation || 0;
      const entryTopOffsetY = .7;
      const entryCos = Math.cos(entryRotation);
      const entrySin = Math.sin(entryRotation);
      const entrySlopeX = Math.abs(entryCos) > .001
        ? (local.x - entryCenterX + entrySin * entryTopOffsetY) / entryCos
        : 0;
      if (Math.abs(entrySlopeX) <= entryLength / 2 + .001
        && Math.abs(local.z - entryCenterZ) <= entryWidth / 2 + .001) {
        includeHeight(Math.max(
          0,
          (control.originY || 0)
            + (entryCenterY
              + entrySin * entrySlopeX
              + entryCos * entryTopOffsetY) * (control.scale || BUILDING_SCALE),
        ));
      }
    }

    // The seat bridge is also one continuous authored top face.  Resolve its
    // exact slope here, rather than letting the narrow debug/support strips
    // appear as tiny stairs while walking toward the chair.
    const seatLength = control.seatRampLength || 0;
    const seatWidth = control.seatRampWidth || 0;
    if (seatLength > 0 && seatWidth > 0) {
      const rotationZ = control.seatRampRotation || 0;
      const topOffsetY = (control.seatRampThickness || .8) / 2;
      const cosSlope = Math.cos(rotationZ);
      const sinSlope = Math.sin(rotationZ);
      const slopeX = Math.abs(cosSlope) > .001
        ? (local.x - control.seatRampCenterX + sinSlope * topOffsetY) / cosSlope
        : 0;
      if (Math.abs(slopeX) <= seatLength / 2 + .001
        && Math.abs(local.z - control.seatRampCenterZ) <= seatWidth / 2 + .001) {
        includeHeight(Math.max(
          0,
          (control.originY || 0)
            + (control.seatRampCenterY
              + sinSlope * slopeX
              + cosSlope * topOffsetY) * (control.scale || BUILDING_SCALE),
        ));
      }
    }
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
    if (surface.physicsSource === "ufo-opening-ramp"
      || surface.physicsSource === "ufo-interior-entry") return;
    const inside = surfaceContainsPoint(x, z, surface);
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
    && surfaceContainsPoint(x, z, surface)
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
  const surfacePolygon = surface.polygon?.length >= 3
    ? surface.polygon
    : rectanglePolygon(
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
  const isStep = Boolean(
    collider.stepRiser
      || collider.surfaceEdge
      || collider.stepAdjacent
      || collider.stepLandingWall
  );

  // 下りはジャンプ不要。ただし、この例外は実在する段差・床縁にだけ
  // 適用する。移動先の床が低いという理由で通常の壁まで通すと、UFOの
  // 外殻や全周リングを「床から降りる動き」としてすり抜けてしまう。
  // ここで未定義の targetHeight を参照すると、段差を下りる瞬間に
  // 共通物理ループが中断して着地・移動が壊れるため、実際にサンプル
  // された低い面から判定する。
  const lowerTargetHeight = Math.min(
    transition.toHeight,
    transition.probeHeight ?? transition.toHeight,
  );
  if (isStep
    && transition.descending
    && lowerTargetHeight < transition.fromHeight - .2) return true;

  // 上段に立った後の低い縁材・手すりは、足元より低ければ通過可能。
  // 地上から同じ判定を通すことは許可しない。
  if (transition.fromHeight > .2
    && Number.isFinite(obstacleHeight)
    && obstacleHeight <= currentFeetHeight + STEP_JUMP_CLEARANCE) return true;

  // 高さ情報のない壁・柱は段差ではない。見た目の高さを推測して
  // ジャンプを許可する旧例外は廃止し、明示された段差だけを対象にする。
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

function characterVerticallyOverlapsCollider(collider, groundY = state.groundY, jumpY = state.jumpY) {
  const footprint = character?.userData?.collisionFootprint;
  const characterMinY = groundY + jumpY + (footprint?.minY ?? 0);
  const characterMaxY = groundY + jumpY + (footprint?.maxY ?? 30);
  const colliderMinY = Number.isFinite(collider.minY) ? collider.minY : -Infinity;
  const colliderMaxY = Number.isFinite(collider.maxY) ? collider.maxY : Infinity;
  return characterMaxY > colliderMinY + .02 && characterMinY < colliderMaxY - .02;
}

function characterColliderContact(x, z, collider, groundY = state.groundY, jumpY = state.jumpY) {
  if (!characterVerticallyOverlapsCollider(collider, groundY, jumpY)) {
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
  const support = walkableSurfaces.find(surface => {
    const isOwnEdge = collider.surfaceId
      ? collider.surfaceId === surface.id
      : (collider.id === `${surface.id}-edge` || collider.id?.startsWith(`${surface.id}-edge-`));
    return !isOwnEdge && Math.abs(surface.height - groundY) <= .24;
  });
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

function updateSkyStationClock(now = Date.now()) {
  if (!skyStationClock) return;
  // JST is permanently UTC+09:00. UTC getterを使うことで、閲覧端末の
  // ローカル時刻やタイムゾーン設定に左右されず常に日本時間を表示する。
  const japanTime = new Date(now + 9 * 60 * 60 * 1000);
  const hour = japanTime.getUTCHours() % 12;
  const minute = japanTime.getUTCMinutes();
  const second = japanTime.getUTCSeconds();
  const millisecond = japanTime.getUTCMilliseconds();
  const fullTurn = Math.PI * 2;
  skyStationClock.hourHand.rotation.z = -(
    (hour + minute / 60 + second / 3600) / 12 * fullTurn
  );
  skyStationClock.minuteHand.rotation.z = -(
    (minute + second / 60) / 60 * fullTurn
  );
  skyStationClock.secondHand.rotation.z = -(
    (second + millisecond / 1000) / 60 * fullTurn
  );
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
  // 時計の針は一枚の装飾板ではなく、中心を支点に回る独立した部品にする。
  // これで駅を再構築しても、毎フレーム日本時間の時・分・秒へ同期できる。
  const clockHands = new THREE.Group();
  clockHands.name = "sky-station-jst-clock-hands";
  clockHands.position.set(0, 43.5, 32.4);
  clockHands.userData.nonCollidable = true;
  const addClockHand = (name, length, width, depth, material, tail = .5) => {
    const pivot = new THREE.Group();
    pivot.name = `sky-station-clock-${name}-pivot`;
    pivot.userData.nonCollidable = true;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(width, length, depth), material);
    hand.name = `sky-station-clock-${name}-hand`;
    hand.position.y = (length - tail) / 2;
    hand.userData.nonCollidable = true;
    hand.castShadow = true;
    hand.receiveShadow = true;
    pivot.add(hand);
    clockHands.add(pivot);
    return pivot;
  };
  const hourHand = addClockHand("hour", 4.3, 1.05, .7, darkStone, 1.05);
  const minuteHand = addClockHand("minute", 6.55, .68, .62, darkStone, .82);
  const secondHand = addClockHand("second", 7.35, .26, .5, warm, 1.72);
  const clockHub = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, .72, 24), gold);
  clockHub.name = "sky-station-clock-hand-hub";
  clockHub.rotation.x = Math.PI / 2;
  clockHub.position.copy(clockHands.position);
  clockHub.position.z += .38;
  clockHub.userData.nonCollidable = true;
  clockHub.castShadow = true;
  group.add(clockHands, clockHub);
  skyStationClock = { hourHand, minuteHand, secondHand };
  updateSkyStationClock();
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
      depthWrite: false,
    });
    const cockpitDark = physicalMaterial(0x142a3b, .26, .54, 0x07131f, .22);
    const cockpitBlue = physicalMaterial(0x42d9ef, .18, .2, 0x24bfe5, 1.4);
    const cockpitAmber = physicalMaterial(0xffd37b, .28, .16, 0xf08b2d, .8);
    const seatRampBlack = physicalMaterial(0x05070a, .3, .5);
    const seatBlack = physicalMaterial(0x020304, .94, .01);
    // The landing pad remains attached to the map. Every UFO component that
    // can fly is parented to this dedicated craft assembly, so starting the
    // engine never drags the pad or the world-anchored face scanner into the
    // sky with it.
    const craftAssembly = new THREE.Group();
    craftAssembly.name = "ufo-flight-assembly";
    craftAssembly.userData.nonCollidable = true;
    group.add(craftAssembly);
    const addUfoPart = (mesh, options = {}) => {
      // Decorative UFO parts remain visual-only by default. Parts that a
      // character can physically touch explicitly opt into the shared visual
      // mesh collider extraction below.
      const isWalkableSurface = options.walkableSurface === true;
      mesh.userData.nonCollidable = options.collidable !== true && !isWalkableSurface;
      if (isWalkableSurface) mesh.userData.walkableSurface = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      craftAssembly.add(mesh);
      return mesh;
    };
    // Keep the ground-side landing place as one pale, motionless slab. The
    // former dark outer disc plus bright inner disc produced the large black
    // donut that remained visible after takeoff and was correctly identified
    // as the propeller assembly left on the pad.
    const landingSlab = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(sx, sz) * .49, Math.min(sx, sz) * .5, .12, 64),
      padWhite,
    );
    landingSlab.name = "ufo-pad-static-landing-slab";
    landingSlab.position.y = .06;
    landingSlab.userData.nonCollidable = true;
    landingSlab.castShadow = false;
    landingSlab.receiveShadow = true;
    group.add(landingSlab);
    // Preserve the exact former black/white disc design, but make it a flying
    // rotor backplate. It is deliberately not added to the landing-pad group.
    const rotorBackplate = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(sx, sz) * .49, Math.min(sx, sz) * .5, .12, 64),
      padMetal,
    );
    rotorBackplate.name = "ufo-bottom-rotor-backplate";
    rotorBackplate.userData.nonCollidable = true;
    const rotorBackplateInner = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(sx, sz) * .35, Math.min(sx, sz) * .35, .06, 64),
      padWhite,
    );
    rotorBackplateInner.name = "ufo-bottom-rotor-backplate-inner";
    rotorBackplateInner.userData.nonCollidable = true;
    // These two pieces were originally added directly to the landing pad. Even
    // after the real turbine was attached to the UFO, the large guide ring and
    // centre core still read as a second propeller left behind on the ground.
    // Construct them here for material/size continuity, but do not parent them
    // to the pad. They are transferred to the craft-owned rotor below.
    const padGuideRing = new THREE.Mesh(
      new THREE.TorusGeometry(Math.min(sx, sz) * .31, 1.05, 10, 64),
      padLight,
    );
    padGuideRing.name = "ufo-bottom-rotor-guide-ring";
    padGuideRing.rotation.x = Math.PI / 2;
    padGuideRing.userData.nonCollidable = true;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, .18, 32), padLight);
    core.name = "ufo-bottom-rotor-centre-core";
    core.userData.nonCollidable = true;

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
    // This cyan crown was not the requested cross-shaped white decoration.
    // Keep the original capsule crown intact.
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
    craftAssembly.add(rampAssembly);
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
    // The drawer is as long as the lower saucer's maximum diameter, but it
    // remains tilted while retracting. At a geometric centre of zero its high
    // inner rail therefore crossed the tapered -X shell by roughly two units.
    // Stop 2.5 units toward the real +X hatch so the complete rail and body sit
    // inside the shell; the open endpoint and all walkable physics stay fixed.
    const rampClosedPosition = new THREE.Vector3(2.5, 3.0, 0);
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
    ufoBottom.name = "ufo-bottom-shell";
    ufoBottom.position.y = ufoBottomTopY - ufoBottomThickness / 2;
    // The visible plate is paired with state-aware physics below. A permanent
    // solid volume here would behave like a low ceiling over the open ramp
    // and would stop the character before reaching the UFO interior.
    addUfoPart(ufoBottom);

    // Every propulsion component has one craft-owned parent. Nothing in this
    // assembly is allowed to remain under the map-owned landing pad when the
    // UFO translates, rotates, or climbs.
    const propulsionAssembly = new THREE.Group();
    propulsionAssembly.name = "ufo-propulsion-assembly";
    propulsionAssembly.userData.nonCollidable = true;
    craftAssembly.add(propulsionAssembly);
    const addPropulsionPart = mesh => {
      mesh.userData.nonCollidable = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      propulsionAssembly.add(mesh);
      return mesh;
    };

    // Full-width circular exhaust. Its outer diameter is exactly the same as
    // the landing pad's 92-unit circle, as requested. The housing is attached
    // directly beneath the permanent UFO bottom; the dark mouth, turbine
    // vanes, and luminous throat make it read as a propulsion nozzle rather
    // than another flat decorative plate.
    const landingPadRadius = Math.min(sx, sz) * .5;
    const exhaustOuterRadius = landingPadRadius;
    const exhaustHousingHeight = 2.6;
    const exhaustHousingTopY = ufoBottomTopY - ufoBottomThickness;
    const exhaustOutletY = exhaustHousingTopY - exhaustHousingHeight;
    const exhaustMetal = physicalMaterial(0x263b55, .24, .72, 0x102a47, .28);
    const exhaustDark = physicalMaterial(0x02070c, .18, .78, 0x031521, .18);
    const exhaustGlow = physicalMaterial(0x66eaff, .12, .22, 0x1bbfe8, 1.65);
    const exhaustHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(
        exhaustOuterRadius * .95,
        exhaustOuterRadius,
        exhaustHousingHeight,
        64,
        1,
        true,
      ),
      exhaustMetal,
    );
    exhaustHousing.position.y = exhaustHousingTopY - exhaustHousingHeight / 2;
    addPropulsionPart(exhaustHousing);
    const exhaustLip = new THREE.Mesh(
      new THREE.TorusGeometry(exhaustOuterRadius - 1.8, 1.65, 12, 64),
      exhaustMetal,
    );
    exhaustLip.rotation.x = Math.PI / 2;
    exhaustLip.position.y = exhaustOutletY;
    addPropulsionPart(exhaustLip);
    const exhaustMouthRadius = exhaustOuterRadius * .79;
    const exhaustMouth = new THREE.Mesh(
      new THREE.CylinderGeometry(exhaustMouthRadius, exhaustMouthRadius * 1.02, .8, 64),
      exhaustDark,
    );
    exhaustMouth.position.y = exhaustOutletY + .18;
    addPropulsionPart(exhaustMouth);
    const exhaustGlowRing = new THREE.Mesh(
      new THREE.TorusGeometry(exhaustMouthRadius * .78, 1.05, 10, 64),
      exhaustGlow,
    );
    exhaustGlowRing.rotation.x = Math.PI / 2;
    exhaustGlowRing.position.y = exhaustOutletY - .28;
    addPropulsionPart(exhaustGlowRing);
    // The visible turbine belongs to the UFO, not to the landing pad. Keep all
    // rotating parts in one craft-owned rotor so translation and rotation stay
    // locked to the underside of the flying saucer.
    const turbineRotor = new THREE.Group();
    turbineRotor.name = "ufo-bottom-turbine-rotor";
    turbineRotor.userData.nonCollidable = true;
    turbineRotor.userData.attachmentOwner = "ufo-bottom";
    // Attach the rotating mechanism to the actual UFO-bottom mesh, not merely
    // to a sibling group that shares the landing-pad coordinate system. The
    // local offset is measured from the visible bottom plate itself, so the
    // turbine cannot remain behind as an independent pad object.
    const turbineRotorLocalY = exhaustOutletY + .35 - ufoBottom.position.y;
    turbineRotor.position.y = turbineRotorLocalY;
    ufoBottom.add(turbineRotor);
    const addTurbinePart = mesh => {
      mesh.userData.nonCollidable = true;
      // A rotating blade shadow projected onto the receiving landing pad read
      // as a second propeller embedded in that pad. Keep ordinary shading on
      // the turbine, but never project its spinning silhouette onto the pad.
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      turbineRotor.add(mesh);
      return mesh;
    };
    // Move the exact ring/core silhouette that was previously visible on the
    // landing pad into the flying rotor. There is now no copy of either object
    // under the pad group, so they cannot remain at ground level during lift.
    padGuideRing.position.y = -1.7;
    addTurbinePart(padGuideRing);
    core.position.y = -.12;
    addTurbinePart(core);
    // The large black/white disc that used to remain on the ground now sits
    // behind the blades and shares the rotor's translation and rotation.
    rotorBackplate.position.y = 1.25;
    addTurbinePart(rotorBackplate);
    rotorBackplateInner.position.y = 1.34;
    addTurbinePart(rotorBackplateInner);
    // This collar visibly joins the bottom plate and the rotating hub. It is a
    // non-rotating child of the UFO bottom, so side views show one continuous
    // craft-mounted propulsion unit rather than a rotor floating over the pad.
    const turbineMount = new THREE.Mesh(
      new THREE.CylinderGeometry(8.8, 7.4, 1.8, 32),
      exhaustMetal,
    );
    turbineMount.name = "ufo-bottom-turbine-mount";
    turbineMount.position.y = -1.35;
    turbineMount.userData.nonCollidable = true;
    turbineMount.castShadow = true;
    turbineMount.receiveShadow = true;
    ufoBottom.add(turbineMount);
    // All following coordinates are relative to the exhaust-mounted rotor,
    // never to the landing pad or map floor.
    const turbineHub = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 5.6, 4.2, 32),
      exhaustMetal,
    );
    turbineHub.position.y = 0;
    addTurbinePart(turbineHub);
    const turbineVaneLength = exhaustMouthRadius - 10;
    for (let index = 0; index < 12; index += 1) {
      const angle = index / 12 * Math.PI * 2;
      const vane = new THREE.Mesh(
        new THREE.BoxGeometry(turbineVaneLength, 3.6, 1.5),
        exhaustMetal,
      );
      const radialCenter = 8 + turbineVaneLength / 2;
      vane.position.set(
        Math.cos(angle) * radialCenter,
        -.55,
        Math.sin(angle) * radialCenter,
      );
      vane.rotation.y = -angle;
      addTurbinePart(vane);
    }
    const turbineLowerRing = new THREE.Mesh(
      new THREE.TorusGeometry(exhaustMouthRadius * .84, .9, 10, 64),
      exhaustMetal,
    );
    turbineLowerRing.rotation.x = Math.PI / 2;
    turbineLowerRing.position.y = -2.25;
    addTurbinePart(turbineLowerRing);
    const turbineNose = new THREE.Mesh(
      new THREE.CylinderGeometry(5.6, 3.8, 1.1, 32),
      exhaustMetal,
    );
    turbineNose.position.y = -2.8;
    addTurbinePart(turbineNose);

    // Jet stream. It is dormant on the landing pad and smoothly ignites while
    // Ren is boarded. The plume ends just above the pad, avoiding a visible
    // intersection with the floor while still showing a full-width downwash.
    const jetAssembly = new THREE.Group();
    jetAssembly.userData.nonCollidable = true;
    propulsionAssembly.add(jetAssembly);
    const makeJetMaterial = (colorValue, opacity) => new THREE.MeshBasicMaterial({
      color: colorValue,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const jetOuterMaterial = makeJetMaterial(0x31c9ff, 0);
    const jetCoreMaterial = makeJetMaterial(0xdffcff, 0);
    const jetParticleMaterial = makeJetMaterial(0x8defff, 0);
    const jetHeight = Math.max(2.4, exhaustOutletY - .8);
    const jetOuter = new THREE.Mesh(
      new THREE.CylinderGeometry(
        exhaustMouthRadius * .82,
        exhaustOuterRadius * .91,
        jetHeight,
        64,
        1,
        true,
      ),
      jetOuterMaterial,
    );
    jetOuter.position.y = exhaustOutletY - jetHeight / 2;
    jetAssembly.add(jetOuter);
    const jetCore = new THREE.Mesh(
      new THREE.CylinderGeometry(
        exhaustMouthRadius * .42,
        exhaustMouthRadius * .7,
        jetHeight * .92,
        48,
        1,
        true,
      ),
      jetCoreMaterial,
    );
    jetCore.position.y = exhaustOutletY - jetHeight * .46;
    jetAssembly.add(jetCore);
    const jetParticles = [];
    const jetParticleGeometry = new THREE.SphereGeometry(.62, 8, 6);
    for (let index = 0; index < 30; index += 1) {
      const particle = new THREE.Mesh(jetParticleGeometry, jetParticleMaterial);
      particle.userData.jetOffset = index / 30;
      particle.userData.jetAngle = index * 2.399963229728653;
      particle.userData.jetRadius = exhaustMouthRadius * (.16 + ((index * 17) % 23) / 23 * .72);
      particle.userData.jetSpeed = .72 + (index % 7) * .055;
      jetAssembly.add(particle);
      jetParticles.push(particle);
    }
    const jetLight = new THREE.PointLight(0x6eeaff, 0, 100, 2);
    jetLight.position.set(0, exhaustOutletY - 1.2, 0);
    jetAssembly.add(jetLight);
    jetAssembly.visible = false;

    // Constant airborne searchlight, based on the supplied reference: a soft
    // mint-white column widens toward the terrain, creates a feathered pool on
    // the ground, and uses a real spotlight to illuminate terrain/buildings.
    // It is separate from the short engine plume and remains lit while the UFO
    // is hovering without directional input.
    const airborneLightAssembly = new THREE.Group();
    airborneLightAssembly.name = "ufo-airborne-ground-light";
    airborneLightAssembly.userData.nonCollidable = true;
    propulsionAssembly.add(airborneLightAssembly);
    const airborneBeamMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9fff0,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const airborneCoreMaterial = new THREE.MeshBasicMaterial({
      color: 0xf1fff7,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const airborneBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(.22, 1, 1, 64, 1, true),
      airborneBeamMaterial,
    );
    airborneBeam.name = "ufo-airborne-light-column";
    airborneBeam.userData.nonCollidable = true;
    airborneLightAssembly.add(airborneBeam);
    const airborneCore = new THREE.Mesh(
      new THREE.CylinderGeometry(.18, .7, 1, 48, 1, true),
      airborneCoreMaterial,
    );
    airborneCore.name = "ufo-airborne-light-core";
    airborneCore.userData.nonCollidable = true;
    airborneLightAssembly.add(airborneCore);
    const groundGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xd8fff2,
      map: makeUfoGroundGlowTexture(),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const groundGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 64), groundGlowMaterial);
    groundGlow.name = "ufo-airborne-ground-glow";
    groundGlow.rotation.x = -Math.PI / 2;
    groundGlow.userData.nonCollidable = true;
    groundGlow.renderOrder = 7;
    airborneLightAssembly.add(groundGlow);
    const airborneSpot = new THREE.SpotLight(0xc9fff0, 0, 0, .52, .72, 1.25);
    airborneSpot.name = "ufo-airborne-terrain-spotlight";
    airborneSpot.position.set(0, exhaustOutletY - .35, 0);
    airborneSpot.castShadow = false;
    const airborneSpotTarget = new THREE.Object3D();
    airborneSpotTarget.name = "ufo-airborne-light-target";
    airborneLightAssembly.add(airborneSpot, airborneSpotTarget);
    airborneSpot.target = airborneSpotTarget;
    airborneLightAssembly.visible = false;
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
    craftAssembly.add(accessHatchAssembly);
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
    // 追加する。装置本体は衝突させるが、前の認証スペースと足跡マーカーは
    // 歩行を塞がない。装置本体の個々の表示メッシュだけを後段で物理化する。
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
      mesh.userData.faceAuthCollision = true;
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
    [-UFO_FACE_AUTH_FOOT_MARKER_HALF_SPACING, UFO_FACE_AUTH_FOOT_MARKER_HALF_SPACING].forEach(z => {
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
    const cockpitFloor = addUfoPart(
      new THREE.Mesh(new THREE.BoxGeometry(34, 1.4, 29), cockpitDark),
      { walkableSurface: true },
    );
    cockpitFloor.userData.physicsSurfaceId = "ufo-cockpit-floor";
    cockpitFloor.userData.physicsSource = "ufo-cockpit-floor";
    cockpitFloor.position.set(0, 10, -6);
    // The pilot seat is reached from the +X boarding side.  A real sloped
    // bridge now joins the raised cockpit board to the seat top, so ordinary
    // walking follows a visible surface and no jump-only exception is needed.
    const cockpitFloorTopY = 10.7;
    const seatTopY = 16;
    const seatRampRun = 9.8;
    const seatRampRise = seatTopY - cockpitFloorTopY;
    const seatRampLength = Math.hypot(seatRampRun, seatRampRise);
    const seatRampWidth = 12;
    const seatRampThickness = .8;
    const seatRampRotation = -Math.atan2(seatRampRise, seatRampRun);
    const seatRampCenterX = 12.6;
    // Keep the walking line on the front half of the cushion. Centering it on
    // the chair made Ren's shoulder touch the backrest corner before his feet
    // reached the seat, which looked like the slope itself was rejecting him.
    const seatRampCenterZ = -2 + chairZCorrection - 4.8;
    const seatRampCenterY = cockpitFloorTopY
      - Math.sin(seatRampRotation) * seatRampLength / 2
      - Math.cos(seatRampRotation) * seatRampThickness / 2;
    const seatRamp = addUfoPart(new THREE.Mesh(
      new THREE.BoxGeometry(seatRampLength, seatRampThickness, seatRampWidth),
      seatRampBlack,
    ));
    seatRamp.position.set(seatRampCenterX, seatRampCenterY, seatRampCenterZ);
    seatRamp.rotation.z = seatRampRotation;
    [-1, 1].forEach(side => {
      const guide = addUfoPart(new THREE.Mesh(
        new THREE.BoxGeometry(seatRampLength - .8, .22, .42),
        cockpitBlue,
      ));
      guide.position.set(
        seatRampCenterX,
        seatRampCenterY + .52,
        seatRampCenterZ + side * (seatRampWidth / 2 - .55),
      );
      guide.rotation.z = seatRampRotation;
    });
    const seat = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(16, 4, 15), seatBlack), { collidable: true });
    // The seat is a real raised surface, not only a solid obstacle.  Mark the
    // visible seat mesh so the shared collider extractor registers its exact
    // top face and matching riser. The authored front-side slope meets that
    // top face, allowing ordinary walking without an invisible lift plane.
    seat.userData.walkableSurface = true;
    seat.position.set(0, 14, -2 + chairZCorrection);
    const seatBack = addUfoPart(new THREE.Mesh(new THREE.BoxGeometry(16, 21, 4), seatBlack), { collidable: true });
    seatBack.position.set(0, 23, 5 + chairZCorrection);
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

    // Cabin lights remain physically present but unlit until the engine-start
    // sequence reaches its lighting phase. Warm incandescent panels and three
    // overlapping local lights illuminate Ren, the controls, and the complete
    // glass capsule instead of leaving only the centre console bright.
    const cabinLampMaterial = physicalMaterial(0xfff3d1, .1, .12, 0xffb45c, .06);
    cabinLampMaterial.transparent = true;
    cabinLampMaterial.opacity = .68;
    cabinLampMaterial.depthWrite = false;
    // The four white ceiling plates formed an unwanted D-pad/cross pattern on
    // top of the capsule. Keep the actual incandescent light sources, but do
    // not create those visible decorative plates.
    const cabinLampPanels = [];
    const cabinMainLight = new THREE.PointLight(0xffffdf, 0, 190, .55);
    cabinMainLight.position.set(0, 33, -3);
    cabinMainLight.userData.nonCollidable = true;
    craftAssembly.add(cabinMainLight);
    const cabinFillLight = new THREE.PointLight(0xffd39b, 0, 175, .6);
    cabinFillLight.position.set(0, 24, -11);
    cabinFillLight.userData.nonCollidable = true;
    craftAssembly.add(cabinFillLight);
    const cabinHaloLight = new THREE.PointLight(0xffffe8, 0, 210, .5);
    cabinHaloLight.position.set(0, 28, 8);
    cabinHaloLight.userData.nonCollidable = true;
    craftAssembly.add(cabinHaloLight);
    // A soft incandescent inner dome makes the illumination readable through
    // the transparent capsule. It is additive and never writes depth, so it
    // brightens Ren and the cockpit without hiding either silhouette.
    const cabinGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffedbd,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const cabinGlow = new THREE.Mesh(
      new THREE.SphereGeometry(22.6, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      cabinGlowMaterial,
    );
    cabinGlow.position.y = 23;
    cabinGlow.scale.y = 1.12;
    cabinGlow.userData.nonCollidable = true;
    craftAssembly.add(cabinGlow);

    group.userData.ufoDoorControls = {
      craftAssembly,
      ufoBottom,
      rampAssembly,
      rampClosedPosition,
      rampOpenPosition,
      rampClosedRotation,
      rampOpenRotation,
      rampLength,
      rampWidth,
      rampRise,
      hatchGapHalfAngle,
      ufoBottomTopY,
      ufoBottomTopRadius,
      ufoBottomLowerRadius,
      ufoBottomThickness,
      // The visible permanent bottom is also the authoritative cabin floor.
      // Keep the support radius identical to that mesh so there is no hidden
      // unsupported ring inside the UFO.
      cabinFloorRadius: ufoBottomTopRadius,
      cabinFloorTopY: ufoBottomTopY,
      capsuleRadius: 24,
      capsuleBaseY: 23,
      capsuleHeight: 24 * 1.16,
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
      cockpitFloorTopY,
      seatRampLength,
      seatRampWidth,
      seatRampThickness,
      seatRampCenterX,
      seatRampCenterY,
      seatRampCenterZ,
      seatRampRise,
      seatRampRotation,
      // These values come from the same visible meshes as the chair. Engine
      // start therefore begins when Ren's real oriented body footprint touches
      // the cushion, rather than after his root reaches a tiny hidden point.
      seatContactCenterLocal: new THREE.Vector3(0, 14, -2 + chairZCorrection),
      seatContactSizeX: 16,
      seatContactSizeY: 4,
      seatContactSizeZ: 15,
      seatHeadingLocal: Math.PI,
      // Hide the chair back after boarding so the rear flight camera shows
      // the official 360-degree Ren. The cushion and chair physics remain.
      seatedViewBlockers: [seatBack],
      cabinLights: {
        panels: cabinLampPanels,
        material: cabinLampMaterial,
        lights: [cabinMainLight, cabinFillLight, cabinHaloLight],
        glassMaterial: ufoGlass,
        glowMaterial: cabinGlowMaterial,
        amount: 0,
      },
      flight: {
        heading: 0,
        forwardInput: 0,
        turnInput: 0,
        liftInput: 0,
        strafeInput: 0,
        inertialStrafeVelocity: 0,
        inertialLiftVelocity: 0,
      },
      flightCollision: {
        radiusLocal: UFO_FLIGHT_COLLISION_RADIUS_LOCAL,
        minYLocal: UFO_FLIGHT_COLLISION_MIN_Y_LOCAL,
        maxYLocal: UFO_FLIGHT_COLLISION_MAX_Y_LOCAL,
      },
      jet: {
        propulsionAssembly,
        assembly: jetAssembly,
        rotor: turbineRotor,
        rotorMount: turbineMount,
        rotorLocalY: turbineRotorLocalY,
        outer: jetOuter,
        core: jetCore,
        outerMaterial: jetOuterMaterial,
        coreMaterial: jetCoreMaterial,
        particleMaterial: jetParticleMaterial,
        particles: jetParticles,
        light: jetLight,
        glowRing: exhaustGlowRing,
        exhaustRadius: exhaustOuterRadius,
        landingPadRadius,
        outletY: exhaustOutletY,
        height: jetHeight,
        phase: 0,
        throttle: 0,
      },
      airborneLight: {
        assembly: airborneLightAssembly,
        beam: airborneBeam,
        core: airborneCore,
        beamMaterial: airborneBeamMaterial,
        coreMaterial: airborneCoreMaterial,
        groundGlow,
        groundGlowMaterial,
        spot: airborneSpot,
        spotTarget: airborneSpotTarget,
        outletY: exhaustOutletY - .4,
        amount: 0,
      },
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
    // The entry slope is authored separately below because its visible surface
    // is tilted in X/Y. The flat cockpit board and the touchable cockpit parts
    // use the same visible meshes and world matrices as every other building.
    // This prevents the board, seat, console, yoke, and instrument panels from
    // becoming pass-through props.
    const group = item.__collisionGroup;
    if (group) addVisualBuildingColliders(group, item.id, {
      registerObstacles: true,
      // Only meshes explicitly marked walkableSurface are promoted here. In
      // the UFO that is the visible cockpit board and chair seat; the entry
      // slope remains authored by setUfoRampPhysics so its tilted top face is
      // represented by the same continuous support strips as the ramp.
      registerSurfaces: true,
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
  // The underside plate is a visible part of the UFO, not a walkway. In the
  // open state it used to be registered as a second circular floor beneath
  // the ramp, entry board, and cockpit floor. That overlapping lower plane
  // created the invisible obstruction in front of the board. Keep the plate
  // rendered, but leave its upper space free of physics; the authored ramp,
  // entry deck, and cockpit floor below are the only boarding supports.
  void control;
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

    // The cockpit board is an explicit physical surface. Normally it was
    // already registered from the visible cockpitFloor mesh above; retain the
    // same values only as a defensive fallback if a future model build omits
    // that mesh.
    const cockpitFloorSizeX = control.cockpitFloorSizeX || 34;
    const cockpitFloorSizeZ = control.cockpitFloorSizeZ || 29;
    const cockpitFloorWorld = ufoLocalToWorld(
      control,
      control.cockpitFloorCenterX || 0,
      control.cockpitFloorCenterZ ?? -6,
    );
    const cockpitFloorId = `${control.buildingId}-ufo-cockpit-floor`;
    // The visible cockpit board is already registered by
    // addVisualBuildingColliders from its own world mesh. Do not add a second
    // floor with copied dimensions; that duplicate was the reason the board
    // could appear in one place while the physics analysis used another.
    if (!walkableSurfaces.some(surface => surface.id === cockpitFloorId)) {
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
    }
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

function isWithinUfoInteriorEntryCorridor(x, z, padding = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  return ufoDoorControls.some(control => {
    const isOpen = (control.amount || 0) > .001 || (control.target || 0) > .001;
    if (!isOpen) return false;
    const local = ufoWorldToLocal(control, x, z);
    const length = control.interiorEntryLength || 20.5;
    const width = control.interiorEntryWidth || control.rampWidth || 18;
    const centerX = control.interiorEntryCenterX || 26.75;
    const centerZ = control.interiorEntryCenterZ ?? 0;
    const rotationZ = control.interiorEntryRotation || 0;
    const topOffsetY = .7;
    const cosSlope = Math.cos(rotationZ);
    const sinSlope = Math.sin(rotationZ);
    const slopeX = Math.abs(cosSlope) > .001
      ? (local.x - centerX + sinSlope * topOffsetY) / cosSlope
      : 0;
    return Math.abs(slopeX) <= length / 2 + padding
      && Math.abs(local.z - centerZ) <= width / 2 + padding;
  });
}

function isWithinUfoSeatRampCorridor(x, z, padding = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  return ufoDoorControls.some(control => {
    const length = control.seatRampLength || 0;
    const width = control.seatRampWidth || 0;
    if (!(length > 0 && width > 0)) return false;
    const local = ufoWorldToLocal(control, x, z);
    const rotationZ = control.seatRampRotation || 0;
    const topOffsetY = (control.seatRampThickness || .8) / 2;
    const cosSlope = Math.cos(rotationZ);
    const sinSlope = Math.sin(rotationZ);
    const slopeX = Math.abs(cosSlope) > .001
      ? (local.x - control.seatRampCenterX + sinSlope * topOffsetY) / cosSlope
      : 0;
    return Math.abs(slopeX) <= length / 2 + padding
      && Math.abs(local.z - control.seatRampCenterZ) <= width / 2 + padding;
  });
}

function ufoSeatRampLandingAllowance(transition) {
  if (!transition) return 0;
  const touchesSeatRamp = isWithinUfoSeatRampCorridor(transition.fromX, transition.fromZ, 1.2)
    || isWithinUfoSeatRampCorridor(transition.toX, transition.toZ, 1.2);
  if (!touchesSeatRamp) return 0;
  return ufoDoorControls.reduce((maximum, control) => (
    Math.max(maximum, (control.seatRampRise || 0) * (control.scale || BUILDING_SCALE) + 1)
  ), 0);
}

function isContinuousUfoRampTransition(transition) {
  if (!transition) return false;
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
  if (isWithinUfoInteriorEntryCorridor(transition.fromX, transition.fromZ, 1.2)
    || isWithinUfoInteriorEntryCorridor(transition.toX, transition.toZ, 1.2)) {
    return true;
  }
  if (isWithinUfoSeatRampCorridor(transition.fromX, transition.fromZ, 1.2)
    || isWithinUfoSeatRampCorridor(transition.toX, transition.toZ, 1.2)) {
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
  const isSeatSlopeSurfaceAt = (x, z, height) => walkableSurfaces.some(surface => {
    if (surface.physicsSource !== "ufo-seat-ramp") return false;
    if (Math.abs(surface.height - height) > .4) return false;
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
  const fromOnSeatSlope = isSeatSlopeSurfaceAt(
    transition.fromX,
    transition.fromZ,
    transition.fromHeight,
  );
  const toOnSeatSlope = isSeatSlopeSurfaceAt(
    transition.toX,
    transition.toZ,
    transition.toHeight,
  );
  return (fromOnRamp || toOnRamp)
    ? transition.toHeight - transition.fromHeight <= 1.1
    : (fromOnInteriorSlope || toOnInteriorSlope)
      ? transition.toHeight - transition.fromHeight <= 1.1
      : (fromOnSeatSlope || toOnSeatSlope)
        && transition.toHeight - transition.fromHeight <= ufoSeatRampLandingAllowance(transition);
}

function ufoFlightWorldOrigin(
  control,
  flightX = state.ufoFlightX,
  flightY = state.ufoFlightY,
  flightZ = state.ufoFlightZ,
) {
  if (!control?.craftWorldAnchored) return { x: flightX, y: flightY, z: flightZ };
  const scale = control.scale || BUILDING_SCALE;
  const baseRotation = control.rotation || 0;
  const cos = Math.cos(baseRotation);
  const sin = Math.sin(baseRotation);
  return {
    x: (control.originX || 0) + (cos * flightX + sin * flightZ) * scale,
    y: (control.originY || 0) + flightY * scale,
    z: (control.originZ || 0) + (-sin * flightX + cos * flightZ) * scale,
  };
}

function ufoFlightBoundaryMetrics(
  control,
  flightX = state.ufoFlightX,
  flightY = state.ufoFlightY,
  flightZ = state.ufoFlightZ,
) {
  const config = MAPS[state.map];
  if (!control || !config) return null;
  const origin = ufoFlightWorldOrigin(control, flightX, flightY, flightZ);
  const scale = control.scale || BUILDING_SCALE;
  const collision = control.flightCollision || {};
  const radius = (collision.radiusLocal ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale
    + UFO_FLIGHT_COLLISION_SKIN;
  return {
    origin,
    radius,
    overhangX: Math.abs(origin.x) + radius - config.world.width / 2,
    overhangZ: Math.abs(origin.z) + radius - config.world.depth / 2,
  };
}

function isUfoSpaceLaunchMap(mapKey = state.map) {
  return mapKey === "sky" || mapKey === "mars";
}

function ufoPlanetMapSpaceExitAt(control, flightX, flightY, flightZ) {
  if (!isUfoSpaceLaunchMap()
    || state.ufoSpaceTransitioning
    || state.ufoEngineMode !== "ready"
    || !state.ufoBoarded) return null;
  const metrics = ufoFlightBoundaryMetrics(control, flightX, flightY, flightZ);
  if (!metrics) return null;
  const maximumOverhang = Math.max(metrics.overhangX, metrics.overhangZ);
  if (maximumOverhang < UFO_SKY_SPACE_TRIGGER_OVERHANG) return null;
  const exitsOnX = metrics.overhangX >= metrics.overhangZ;
  const side = exitsOnX
    ? (metrics.origin.x >= 0 ? "east" : "west")
    : (metrics.origin.z >= 0 ? "south" : "north");
  return { ...metrics, side, maximumOverhang, originMap: state.map };
}

function staticColliderVerticalRange(collider) {
  const minY = Number.isFinite(collider?.minY) ? collider.minY : 0;
  const maxY = Number.isFinite(collider?.maxY)
    ? collider.maxY
    : Number.isFinite(collider?.obstacleHeight)
      ? collider.obstacleHeight
      : Number.isFinite(collider?.stepHeight)
        ? collider.stepHeight
        : 36;
  return { minY, maxY };
}

function isOwnFlyingUfoPhysicsElement(control, element) {
  const buildingId = control?.buildingId;
  if (!buildingId || !element) return false;
  if (element.buildingId === buildingId) return true;
  return typeof element.id === "string" && element.id.startsWith(`${buildingId}-ufo-`);
}

function ufoFlightCollisionAt(control, flightX, flightY, flightZ) {
  if (!control) return { id: "missing-ufo", type: "invalid" };
  const origin = ufoFlightWorldOrigin(control, flightX, flightY, flightZ);
  const scale = control.scale || BUILDING_SCALE;
  const collision = control.flightCollision || {};
  const radius = (collision.radiusLocal ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale
    + UFO_FLIGHT_COLLISION_SKIN;
  const vertical = {
    minY: origin.y + (collision.minYLocal ?? UFO_FLIGHT_COLLISION_MIN_Y_LOCAL) * scale,
    maxY: origin.y + (collision.maxYLocal ?? UFO_FLIGHT_COLLISION_MAX_Y_LOCAL) * scale,
  };
  const config = MAPS[state.map];
  const planetTransitionGrace = isUfoSpaceLaunchMap()
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    ? UFO_SKY_BOUNDARY_COLLISION_GRACE
    : 0;
  const limitX = config.world.width / 2 - radius + planetTransitionGrace;
  const limitZ = config.world.depth / 2 - radius + planetTransitionGrace;
  if (Math.abs(origin.x) > limitX || Math.abs(origin.z) > limitZ) {
    return { id: "world-boundary", type: "boundary", radius, origin, vertical };
  }

  for (const collider of colliders) {
    if (isOwnFlyingUfoPhysicsElement(control, collider)) continue;
    const obstacle = staticColliderVerticalRange(collider);
    if (vertical.maxY <= obstacle.minY + .02 || vertical.minY >= obstacle.maxY - .02) continue;
    const horizontalContact = collider.polygon?.length >= 3
      ? circleIntersectsPolygon(origin.x, origin.z, radius, collider.polygon)
      : pointInsideCollider(origin.x, origin.z, collider, radius);
    if (horizontalContact) {
      return { id: collider.id || "building", type: "building", radius, origin, vertical, collider };
    }
  }
  // Raised walkable decks and roofs are stored as real horizontal surfaces,
  // not filled wall prisms. Include those top faces in flight collision so a
  // descending UFO cannot pass through the middle of a broad platform whose
  // perimeter is farther away than the saucer radius.
  for (const surface of walkableSurfaces) {
    if (isOwnFlyingUfoPhysicsElement(control, surface)) continue;
    if (!Number.isFinite(surface.height)) continue;
    if (vertical.maxY <= surface.height + .02 || vertical.minY >= surface.height - .02) continue;
    const horizontalContact = surface.polygon?.length >= 3
      ? circleIntersectsPolygon(origin.x, origin.z, radius, surface.polygon)
      : pointInsideCollider(origin.x, origin.z, surface, radius);
    if (horizontalContact) {
      return { id: surface.id || "building-surface", type: "building", radius, origin, vertical, surface };
    }
  }
  return null;
}

function clampUfoSpaceFlightY(flightY) {
  return clamp(flightY, UFO_SPACE_MIN_FLIGHT_Y, UFO_SPACE_MAX_FLIGHT_Y);
}

function applyUfoCraftWorldTransform(control) {
  const craft = control?.craftAssembly;
  if (!craft) return;
  const forwardScrollMission = isUfoForwardScrollActive(control)
    ? control.spaceForwardScroll
    : null;
  // 追尾角は航路・実際の移動座標を曲げず、見た目の機首と射撃方向だけへ
  // 加える。したがってロック中にもプレイヤーの上下左右の操縦は保たれる。
  const lockTrackingPitch = forwardScrollMission?.lockTrackingPitch || 0;
  const lockTrackingYaw = forwardScrollMission?.lockTrackingYaw || 0;
  const flightPitch = (state.ufoFlightPitch || 0) + lockTrackingPitch;
  const flightRoll = state.ufoFlightRoll || 0;
  // 前進スクロール中の左右操縦は、航路そのものを曲げずにノーズを
  // 操作側へ向ける。照準・射撃はこの完成した機体姿勢から求める。
  const directionalYaw = (state.ufoFlightDirectionalYaw || 0) + lockTrackingYaw;
  if (!control.craftWorldAnchored) {
    craft.position.set(state.ufoFlightX, state.ufoFlightY, state.ufoFlightZ);
    craft.rotation.set(flightPitch, state.ufoFlightHeading + directionalYaw, flightRoll, "YXZ");
    return;
  }
  const baseRotation = control.rotation || 0;
  const origin = ufoFlightWorldOrigin(control);
  craft.position.set(origin.x, origin.y, origin.z);
  craft.rotation.set(
    flightPitch,
    baseRotation + state.ufoFlightHeading + directionalYaw,
    flightRoll,
    "YXZ",
  );
}

function ufoSpaceViewMetrics() {
  const world = MAPS.space.world;
  const halfDiagonal = Math.hypot(world.width, world.depth) * .5;
  return {
    // Extend the visual field beyond the rectangular flight boundary so the
    // enlarged map does not expose a hard starfield edge first.
    environmentMaxRadius: halfDiagonal * 1.32,
    fogNear: Math.max(1050, halfDiagonal * .08),
    fogFar: halfDiagonal * 1.26,
    cameraFar: halfDiagonal * 1.55,
  };
}

function ufoSpaceEdgePointAlongDirection(origin, direction, inset = 0) {
  const halfWidth = MAPS.space.world.width * .5;
  const halfDepth = MAPS.space.world.depth * .5;
  const distances = [];
  if (direction.x > 1e-6) distances.push((halfWidth - origin.x) / direction.x);
  if (direction.x < -1e-6) distances.push((-halfWidth - origin.x) / direction.x);
  if (direction.z > 1e-6) distances.push((halfDepth - origin.z) / direction.z);
  if (direction.z < -1e-6) distances.push((-halfDepth - origin.z) / direction.z);
  const edgeDistance = distances.filter(distance => distance >= 0).sort((a, b) => a - b)[0] || 0;
  return origin.clone().addScaledVector(direction, Math.max(0, edgeDistance - inset));
}

function applySpacePlanetariumBackground() {
  // 星のテクスチャを空の一枚絵として置くと、どれだけ航行しても到達不能な
  // 背景になる。宇宙では黒い深宇宙だけを背景にし、見える光はすべて下の
  // makeSpaceEnvironment が生成する実座標つきの3D恒星に限定する。
  if (scene) scene.background = color(MAPS.space.palette.fog);
}

function makeSpaceExplorableStarSpriteTexture() {
  if (spaceExplorableStarSpriteTexture) return spaceExplorableStarSpriteTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;
  const glow = context.createRadialGradient(center, center, 0, center, center, center);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(.035, "rgba(255,255,255,.98)");
  glow.addColorStop(.11, "rgba(255,255,255,.72)");
  glow.addColorStop(.31, "rgba(255,255,255,.19)");
  glow.addColorStop(.63, "rgba(255,255,255,.025)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // 写真の明るい星にだけ見える、ごく細い回折光。星の色は描画側で与える。
  context.globalCompositeOperation = "lighter";
  context.fillStyle = "rgba(255,255,255,.09)";
  context.fillRect(center - .45, 19, .9, 218);
  context.fillRect(19, center - .45, 218, .9);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  spaceExplorableStarSpriteTexture = texture;
  return texture;
}

function makeSpaceExplorableStarPointMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uStarTexture: { value: makeSpaceExplorableStarSpriteTexture() },
      uProjectionScale: { value: 1 },
      uTime: { value: 0 },
      uMinDotPixels: { value: UFO_SPACE_EXPLORABLE_STAR_MIN_DOT_PIXELS },
      uMaxDotPixels: { value: UFO_SPACE_EXPLORABLE_STAR_SURFACE_FULL_PIXELS * 1.35 },
      uSurfaceStartPixels: { value: UFO_SPACE_EXPLORABLE_STAR_SURFACE_START_PIXELS },
      uSurfaceFullPixels: { value: UFO_SPACE_EXPLORABLE_STAR_SURFACE_FULL_PIXELS },
    },
    vertexShader: `
      attribute float aRadius;
      attribute float aBrightness;
      attribute float aDetailReady;
      attribute float aPhase;
      uniform float uProjectionScale;
      uniform float uTime;
      uniform float uMinDotPixels;
      uniform float uMaxDotPixels;
      uniform float uSurfaceStartPixels;
      uniform float uSurfaceFullPixels;
      varying vec3 vColor;
      varying float vBrightness;
      varying float vSurfaceBlend;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float cameraDistance = max(1.0, -mvPosition.z);
        // この直径は3D恒星メッシュと同じ半径・同じ投影式で求める。
        float physicalDiameter = (aRadius * uProjectionScale) / cameraDistance;
        float twinkle = 1.0 + sin(uTime * .48 + aPhase * 19.0) * (.012 + aBrightness * .018);
        float minimumDot = uMinDotPixels * (.82 + aBrightness * 1.85);
        gl_PointSize = min(uMaxDotPixels, max(minimumDot, physicalDiameter) * twinkle);
        vColor = color;
        vBrightness = aBrightness;
        vSurfaceBlend = smoothstep(uSurfaceStartPixels, uSurfaceFullPixels, physicalDiameter) * aDetailReady;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uStarTexture;
      varying vec3 vColor;
      varying float vBrightness;
      varying float vSurfaceBlend;
      void main() {
        vec2 centered = gl_PointCoord - vec2(.5);
        float radius = length(centered) * 2.0;
        if (radius > 1.0) discard;
        vec4 stamp = texture2D(uStarTexture, gl_PointCoord);
        float centerLight = pow(max(0.0, 1.0 - radius), 3.4);
        vec3 luminousColor = mix(vColor * .66, vec3(1.0), .42 + centerLight * .5);
        float alpha = stamp.a * (.54 + vBrightness * .7) * (1.0 - vSurfaceBlend);
        if (alpha < .002) discard;
        gl_FragColor = vec4(luminousColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
}

function makeSpaceExplorableStarSurfaceTexture(variant) {
  if (spaceExplorableStarSurfaceTextures.has(variant)) {
    return spaceExplorableStarSurfaceTextures.get(variant);
  }
  const palette = [
    [0x8fb7ff, 0xd9e9ff, 0x2a4f9f],
    [0xbfe7ff, 0xf5fbff, 0x356ba8],
    [0xfff1c7, 0xfffcf2, 0xa05b2a],
    [0xffc18c, 0xffeed8, 0x8a3022],
    [0xb5f0ff, 0xf3ffff, 0x1b6a86],
  ][variant % 5];
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  let seed = (0x7f4a7c15 ^ ((variant + 1) * 0x9e3779b9)) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const toCss = (hex, alpha) => {
    const tint = new THREE.Color(hex);
    return `rgba(${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},${alpha})`;
  };
  const base = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  base.addColorStop(0, toCss(palette[2], 1));
  base.addColorStop(.28, toCss(palette[0], 1));
  base.addColorStop(.56, toCss(palette[1], 1));
  base.addColorStop(.78, toCss(palette[0], 1));
  base.addColorStop(1, toCss(palette[2], 1));
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);
  // 表面は一色の球ではなく、粒状対流・暗い磁場帯・明るい活動域を重ねる。
  for (let index = 0; index < 1900; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radiusX = 1 + random() * 8;
    const radiusY = .5 + random() * 3.2;
    const hot = random() > .42;
    context.fillStyle = hot
      ? toCss(palette[1], (.025 + random() * .11).toFixed(3))
      : toCss(palette[2], (.018 + random() * .095).toFixed(3));
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  for (let index = 0; index < 34; index += 1) {
    const y = random() * canvas.height;
    const band = context.createLinearGradient(0, y - 7, 0, y + 7);
    band.addColorStop(0, "rgba(0,0,0,0)");
    band.addColorStop(.5, toCss(palette[2], (.028 + random() * .06).toFixed(3)));
    band.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = band;
    context.fillRect(0, y - 7, canvas.width, 14);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  spaceExplorableStarSurfaceTextures.set(variant, texture);
  return texture;
}

function makeSpaceExplorableStarDetail(star) {
  const group = new THREE.Group();
  group.name = `space-explorable-star-${star.id}`;
  group.position.copy(star.position);
  group.userData.nonCollidable = true;

  const starColor = new THREE.Color(star.color);
  const coreMaterial = new THREE.MeshStandardMaterial({
    map: makeSpaceExplorableStarSurfaceTexture(star.surfaceVariant),
    color: starColor.clone().lerp(new THREE.Color(0xffffff), .34),
    emissive: starColor,
    emissiveIntensity: 1.42,
    roughness: .52,
    metalness: 0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(star.radius, 48, 32),
    coreMaterial,
  );
  core.name = `${star.id}-stellar-surface`;
  group.add(core);

  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(star.radius * 1.12, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: {
        coronaColor: { value: starColor.clone() },
        coronaOpacity: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDirection = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 coronaColor;
        uniform float coronaOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.25);
          gl_FragColor = vec4(coronaColor, rim * coronaOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  corona.name = `${star.id}-stellar-corona`;
  group.add(corona);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSpaceExplorableStarSpriteTexture(),
    color: starColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  }));
  halo.name = `${star.id}-stellar-halo`;
  halo.scale.setScalar(star.radius * 5.8);
  group.add(halo);
  // group.scale は常に1。点光と球状表面は同じ物理半径から投影されるため、
  // 距離の途中で別サイズの星へ置き換わることがない。
  return { group, core, corona, halo };
}

let ufoSpaceRouteSeedSequence = 0;

function mixUfoSpaceRouteSeed(seed, salt = 0) {
  let value = (Number(seed) >>> 0) ^ (Number(salt) >>> 0);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function makeUfoSpaceSeededRandom(seed) {
  let value = (Number(seed) >>> 0) || 0x6d617273;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function nextUfoSpaceRouteSeed() {
  ufoSpaceRouteSeedSequence = (ufoSpaceRouteSeedSequence + 1) >>> 0;
  const entropy = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(entropy);
  else entropy[0] = (Date.now() ^ Math.imul(ufoSpaceRouteSeedSequence, 0x9e3779b9)) >>> 0;
  return mixUfoSpaceRouteSeed(entropy[0], ufoSpaceRouteSeedSequence || 1) || 0x51a7d3c9;
}

function getUfoForwardScrollMarsDistanceMode(routeSeed) {
  const modes = UFO_FORWARD_SCROLL_MARS_DISTANCE_MODES;
  // 航路シードから一度だけ選ぶ。飛行中に再抽選されないため、表示距離・
  // 実際の火星位置・到着時間は、出発から到着まで常に同じモードのままになる。
  const index = mixUfoSpaceRouteSeed(routeSeed, 0x4d415253) % modes.length;
  return modes[index] || UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE;
}

function getUfoForwardScrollCruiseSeconds(routeMode) {
  return Math.max(
    1,
    (routeMode?.totalSeconds || UFO_FORWARD_SCROLL_TARGET_SECONDS)
      - UFO_FORWARD_SCROLL_LAUNCH_SECONDS,
  );
}

function getUfoForwardScrollRouteDistanceRatio(routeMode) {
  return Math.max(
    0,
    (routeMode?.distanceKm || UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE.distanceKm)
      / UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE.distanceKm,
  );
}

function isUfoForwardScrollEnergyStarEligible(routeSeed, renderIndex) {
  const mixedIndex = ((Number(renderIndex) + 1) ^ (Number(routeSeed) >>> 0)) >>> 0;
  const roll = (Math.imul(mixedIndex, 1103515245) + 12345) >>> 0;
  return roll / 0x100000000 < UFO_FORWARD_SCROLL_ENERGY_STAR_RATIO;
}

function makeSpaceEnvironment(entryCraftCenter, routeSeed = 0) {
  const group = new THREE.Group();
  group.name = "ufo-space-explorable-planetarium";
  group.userData.nonCollidable = true;
  const random = makeUfoSpaceSeededRandom(mixUfoSpaceRouteSeed(routeSeed, 0x6d617273));
  const colors = [0x9ebdff, 0xc7eaff, 0xfff1c9, 0xffc893, 0xa8e9ff];
  const pointPositions = [];
  const pointColors = [];
  const pointRadii = [];
  const pointBrightness = [];
  const pointPhases = [];
  const pointDetailReady = new Float32Array(UFO_SPACE_EXPLORABLE_STAR_COUNT);
  const stars = [];
  const starById = new Map();
  const halfWidth = MAPS.space.world.width * .47;
  const halfDepth = MAPS.space.world.depth * .47;
  const origin = entryCraftCenter.clone();
  for (let index = 0; index < UFO_SPACE_EXPLORABLE_STAR_COUNT; index += 1) {
    const brightnessRoll = random();
    const brightStar = brightnessRoll > .985;
    const mediumStar = !brightStar && brightnessRoll > .89;
    const brightness = brightStar
      ? .88 + random() * .12
      : mediumStar
        ? .48 + random() * .3
        : .12 + random() * .34;
    const radiusBase = brightStar ? 760 : mediumStar ? 410 : 175;
    const radius = radiusBase * (.84 + random() * .42);
    // 初期視点のすぐ近くに大きな恒星を置かない。見え始めは空の小さな
    // 光点で、近づくほど自然な視差と大きさで正体が分かる配置にする。
    const minimumEntryDistance = Math.max(
      UFO_SPACE_EXPLORABLE_STAR_CLOSE_EXCLUSION,
      radius * 220,
    );
    let position = new THREE.Vector3();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      // 約6割を斜めの天の川帯へ寄せつつ、残りは全空間へ散らす。
      const banded = random() < .58;
      const x = origin.x + (random() * 2 - 1) * halfWidth;
      const z = origin.z + (random() * 2 - 1) * halfDepth;
      const y = banded
        ? origin.y + (x - origin.x) * .12 + (z - origin.z) * .055 + (random() * 2 - 1) * UFO_SPACE_EXPLORABLE_STAR_VERTICAL_RANGE * .13
        : origin.y + (random() * 2 - 1) * UFO_SPACE_EXPLORABLE_STAR_VERTICAL_RANGE;
      position.set(x, y, z);
      if (position.distanceToSquared(origin) >= minimumEntryDistance ** 2) break;
    }
    if (position.distanceToSquared(origin) < minimumEntryDistance ** 2) {
      // まれな大きい星で試行回数内に安全距離を満たせなかった場合も、
      // 初期画面の目の前へ置かず、到達可能なワールド内の遠い角へ置く。
      position.set(
        origin.x + (random() > .5 ? 1 : -1) * halfWidth * .94,
        origin.y + (random() > .5 ? 1 : -1) * UFO_SPACE_EXPLORABLE_STAR_VERTICAL_RANGE * .9,
        origin.z + (random() > .5 ? 1 : -1) * halfDepth * .94,
      );
    }
    const colorIndex = Math.floor(random() * colors.length);
    const starColor = new THREE.Color(colors[colorIndex]);
    pointPositions.push(position.x, position.y, position.z);
    pointColors.push(starColor.r, starColor.g, starColor.b);
    pointRadii.push(radius);
    pointBrightness.push(brightness);
    pointPhases.push(random());
    const star = {
      id: `star-${index + 1}`,
      renderIndex: index,
      position,
      radius,
      color: colors[colorIndex],
      baseColor: colors[colorIndex],
      surfaceVariant: colorIndex,
      // 表面が見え始めるより十分遠くからメッシュを待機させる。見た目の
      // 切替距離ではなく、同じ実半径を投影した時の画素径で表面を混ぜる。
      detailRange: Math.min(260000, Math.max(72000, radius * UFO_SPACE_EXPLORABLE_STAR_DETAIL_RANGE_RADIUS_MULTIPLIER)),
      spin: (.012 + random() * .024) * (random() > .5 ? 1 : -1),
      brightness,
      // 航路シードから決めるため、同じ航行中は固定だが次の出発では
      // エネルギー星の候補も別の星へ入れ替わる。
      energyTargetEligible: isUfoForwardScrollEnergyStarEligible(routeSeed, index),
      energyTarget: false,
      energyDestroyed: false,
    };
    stars.push(star);
    starById.set(star.id, star);
  }
  // すべての遠景星を一つのシェーダーで描く。点光の大きさは同じ星の
  // 物理半径から毎フレーム算出するため、近づいた時に別サイズへ跳ばない。
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pointPositions, 3));
  const pointColorAttribute = new THREE.Float32BufferAttribute(pointColors, 3);
  const pointBrightnessAttribute = new THREE.Float32BufferAttribute(pointBrightness, 1);
  pointGeometry.setAttribute("color", pointColorAttribute);
  pointGeometry.setAttribute("aRadius", new THREE.Float32BufferAttribute(pointRadii, 1));
  pointGeometry.setAttribute("aBrightness", pointBrightnessAttribute);
  pointGeometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(pointPhases, 1));
  const pointDetailReadyAttribute = new THREE.Float32BufferAttribute(pointDetailReady, 1);
  pointGeometry.setAttribute("aDetailReady", pointDetailReadyAttribute);
  const pointMaterial = makeSpaceExplorableStarPointMaterial();
  const points = new THREE.Points(pointGeometry, pointMaterial);
  points.name = "space-explorable-starfield-continuous-points";
  points.frustumCulled = false;
  points.renderOrder = -3;
  group.add(points);
  const detailGroup = new THREE.Group();
  detailGroup.name = "space-explorable-star-detail-lod";
  group.add(detailGroup);
  group.userData.starfield = {
    stars,
    starById,
    origin,
    detailGroup,
    activeDetails: new Map(),
    pointMaterial,
    pointColorAttribute,
    pointBrightnessAttribute,
    pointDetailReady,
    pointDetailReadyAttribute,
    routeSeed,
    drawingBufferSize: new THREE.Vector2(),
    projectionScale: 1,
    lodElapsed: UFO_SPACE_EXPLORABLE_STAR_LOD_INTERVAL,
    elapsed: 0,
  };
  return group;
}

function projectedSpaceStarDiameterPixels(starfield, star, distance) {
  return (star.radius * starfield.projectionScale) / Math.max(1, distance);
}

function spaceStarSurfaceBlend(projectedDiameter) {
  return THREE.MathUtils.smoothstep(
    projectedDiameter,
    UFO_SPACE_EXPLORABLE_STAR_SURFACE_START_PIXELS,
    UFO_SPACE_EXPLORABLE_STAR_SURFACE_FULL_PIXELS,
  );
}

function setSpaceStarDetailReady(starfield, star, ready) {
  const next = ready ? 1 : 0;
  if (starfield.pointDetailReady[star.renderIndex] === next) return false;
  starfield.pointDetailReady[star.renderIndex] = next;
  return true;
}

function refreshSpaceExplorableStarVisual(starfield, star) {
  if (!starfield || !star) return;
  const color = new THREE.Color(
    star.energyTarget ? UFO_FORWARD_SCROLL_ENERGY_STAR_TYPE.color : (star.baseColor ?? star.color),
  );
  star.color = color.getHex();
  if (starfield.pointColorAttribute) {
    starfield.pointColorAttribute.setXYZ(star.renderIndex, color.r, color.g, color.b);
    starfield.pointColorAttribute.needsUpdate = true;
  }
  if (starfield.pointBrightnessAttribute) {
    starfield.pointBrightnessAttribute.setX(
      star.renderIndex,
      star.energyDestroyed ? 0 : star.brightness,
    );
    starfield.pointBrightnessAttribute.needsUpdate = true;
  }
  const detail = starfield.activeDetails?.get(star.id);
  if (!detail) return;
  detail.group.visible = !star.energyDestroyed;
  detail.core.material.color.copy(color).lerp(new THREE.Color(0xffffff), .34);
  detail.core.material.emissive.copy(color);
  detail.corona.material.uniforms.coronaColor.value.copy(color);
  detail.halo.material.color.copy(color);
}

function setSpaceExplorableStarEnergyTarget(starfield, star, active) {
  if (!star) return;
  const next = Boolean(active);
  if (star.energyTarget === next) return;
  star.energyTarget = next;
  refreshSpaceExplorableStarVisual(starfield, star);
}

function setSpaceExplorableStarDestroyed(starfield, star, destroyed) {
  if (!star) return;
  const next = Boolean(destroyed);
  if (star.energyDestroyed === next) return;
  star.energyDestroyed = next;
  refreshSpaceExplorableStarVisual(starfield, star);
}

function updateSpaceExplorableStarfield(delta) {
  if (state.map !== "space" || !state.ufoInSpace) return;
  const control = ufoDoorControls[0];
  const starfield = control?.spaceExplorableStarfield;
  const craft = control?.craftAssembly;
  if (!starfield || !craft || !renderer || !camera) return;

  starfield.elapsed += delta;
  renderer.getDrawingBufferSize(starfield.drawingBufferSize);
  starfield.projectionScale = starfield.drawingBufferSize.y * camera.projectionMatrix.elements[5];
  starfield.pointMaterial.uniforms.uProjectionScale.value = starfield.projectionScale;
  starfield.pointMaterial.uniforms.uTime.value = starfield.elapsed;
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  let pointAttributeChanged = false;

  // 表面候補は距離ではなく画面上での物理直径が大きい順に選ぶ。すべての
  // 詳細モデルは表面が見え始める前から待機し、点光とのクロスフェードを行う。
  starfield.lodElapsed += delta;
  if (starfield.lodElapsed >= UFO_SPACE_EXPLORABLE_STAR_LOD_INTERVAL) {
    starfield.lodElapsed = 0;
    const candidates = [];
    for (const star of starfield.stars) {
      if (star.energyDestroyed) continue;
      const distanceSquared = craftCenter.distanceToSquared(star.position);
      if (distanceSquared > star.detailRange * star.detailRange) continue;
      const distance = Math.sqrt(distanceSquared);
      candidates.push({
        star,
        projectedDiameter: projectedSpaceStarDiameterPixels(starfield, star, distance),
      });
    }
    candidates.sort((a, b) => b.projectedDiameter - a.projectedDiameter);
    const selected = new Set(
      candidates.slice(0, UFO_SPACE_EXPLORABLE_STAR_DETAIL_LIMIT).map(candidate => candidate.star.id),
    );

    candidates.slice(0, UFO_SPACE_EXPLORABLE_STAR_DETAIL_LIMIT).forEach(({ star }) => {
      if (starfield.activeDetails.has(star.id)) return;
      const detail = makeSpaceExplorableStarDetail(star);
      starfield.activeDetails.set(star.id, detail);
      starfield.detailGroup.add(detail.group);
      pointAttributeChanged = setSpaceStarDetailReady(starfield, star, true) || pointAttributeChanged;
    });

    // 詳細を外すのは、すでに表面混合がゼロへ戻った後だけ。これにより、
    // メッシュ枠の入れ替えによる一瞬のポップ表示も発生しない。
    for (const [id, detail] of starfield.activeDetails) {
      if (selected.has(id)) continue;
      const star = starfield.starById.get(id);
      if (!star) continue;
      if (star.energyDestroyed) {
        starfield.detailGroup.remove(detail.group);
        starfield.activeDetails.delete(id);
        pointAttributeChanged = setSpaceStarDetailReady(starfield, star, false) || pointAttributeChanged;
        continue;
      }
      const distance = craftCenter.distanceTo(star.position);
      const projectedDiameter = projectedSpaceStarDiameterPixels(starfield, star, distance);
      if (projectedDiameter > UFO_SPACE_EXPLORABLE_STAR_SURFACE_START_PIXELS * .52) continue;
      starfield.detailGroup.remove(detail.group);
      starfield.activeDetails.delete(id);
      pointAttributeChanged = setSpaceStarDetailReady(starfield, star, false) || pointAttributeChanged;
    }
  }

  for (const [id, detail] of starfield.activeDetails) {
    const star = starfield.starById.get(id);
    if (!star) continue;
    if (star.energyDestroyed) continue;
    const distance = craftCenter.distanceTo(star.position);
    const surfaceBlend = spaceStarSurfaceBlend(
      projectedSpaceStarDiameterPixels(starfield, star, distance),
    );
    detail.core.rotation.y += delta * star.spin;
    detail.corona.rotation.y -= delta * star.spin * .32;
    detail.core.material.opacity = surfaceBlend;
    detail.core.visible = surfaceBlend > .002;
    detail.corona.material.uniforms.coronaOpacity.value = surfaceBlend * .44;
    detail.corona.visible = surfaceBlend > .002;
    detail.halo.material.opacity = surfaceBlend * (
      .11 + Math.sin(starfield.elapsed * 1.16 + star.radius) * .024
    );
    detail.halo.visible = surfaceBlend > .002;
  }

  if (pointAttributeChanged) starfield.pointDetailReadyAttribute.needsUpdate = true;
  document.body.dataset.ufoSpaceExplorableStarCount = String(starfield.stars.length);
  document.body.dataset.ufoSpaceExplorableStarDetails = String(starfield.activeDetails.size);
  document.body.dataset.ufoSpaceStarfieldMode = "continuous-physical-starfield";
}

function makeSpaceEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  let seed = 0x0e4a72d1;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#123774");
  ocean.addColorStop(.18, "#0b5794");
  ocean.addColorStop(.5, "#0878b7");
  ocean.addColorStop(.78, "#07558e");
  ocean.addColorStop(1, "#092d66");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 海面を一色にせず、細かな寒暖・深浅の差を控えめに重ねる。
  for (let index = 0; index < 1400; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radiusX = 4 + random() * 24;
    const radiusY = 1 + random() * 6;
    context.fillStyle = random() > .48
      ? `rgba(78,178,206,${(.012 + random() * .026).toFixed(3)})`
      : `rgba(0,30,92,${(.012 + random() * .024).toFixed(3)})`;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, random() * .35 - .175, 0, Math.PI * 2);
    context.fill();
  }

  // A hand-authored original equirectangular map. It is deliberately not a
  // copied satellite image, but keeps the large continental silhouettes that
  // make the descending globe immediately readable as Earth.
  const makeLandPath = points => {
    const path = new Path2D();
    const pixelPoints = points.map(([x, y]) => [x * canvas.width, y * canvas.height]);
    const last = pixelPoints[pixelPoints.length - 1];
    const first = pixelPoints[0];
    path.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    pixelPoints.forEach((point, index) => {
      const next = pixelPoints[(index + 1) % pixelPoints.length];
      path.quadraticCurveTo(
        point[0],
        point[1],
        (point[0] + next[0]) / 2,
        (point[1] + next[1]) / 2,
      );
    });
    path.closePath();
    return path;
  };
  const drawLand = (points, northColor, southColor) => {
    const path = makeLandPath(points);
    // 海岸の浅瀬。太い輪郭線ではなく水中へ溶ける薄い青緑にする。
    context.save();
    context.strokeStyle = "rgba(91,190,177,.16)";
    context.lineWidth = 8;
    context.lineJoin = "round";
    context.stroke(path);
    context.restore();

    const land = context.createLinearGradient(0, canvas.height * .14, 0, canvas.height * .86);
    land.addColorStop(0, northColor);
    land.addColorStop(.52, "#5f8048");
    land.addColorStop(1, southColor);
    context.fillStyle = land;
    context.fill(path);

    // 大陸内側に森林・高地・乾燥地の細かな濃淡を重ねる。
    context.save();
    context.clip(path);
    for (let index = 0; index < 1500; index += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const width = 3 + random() * 19;
      const height = 1.5 + random() * 7;
      const terrainTint = random();
      context.fillStyle = terrainTint > .78
        ? `rgba(187,151,77,${(.045 + random() * .09).toFixed(3)})`
        : terrainTint > .34
          ? `rgba(25,72,38,${(.04 + random() * .1).toFixed(3)})`
          : `rgba(215,206,151,${(.025 + random() * .065).toFixed(3)})`;
      context.beginPath();
      context.ellipse(x, y, width, height, random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
    for (let index = 0; index < 120; index += 1) {
      const x = random() * canvas.width;
      const y = random() * canvas.height;
      const length = 14 + random() * 52;
      context.strokeStyle = random() > .5
        ? `rgba(39,62,32,${(.025 + random() * .055).toFixed(3)})`
        : `rgba(225,216,159,${(.02 + random() * .045).toFixed(3)})`;
      context.lineWidth = .6 + random() * 1.5;
      context.beginPath();
      context.moveTo(x - length * .5, y + (random() - .5) * 8);
      context.quadraticCurveTo(x, y - 5 - random() * 10, x + length * .5, y + (random() - .5) * 8);
      context.stroke();
    }
    context.restore();

    context.strokeStyle = "rgba(215,235,178,.18)";
    context.lineWidth = 1.5;
    context.stroke(path);
  };
  drawLand([[.07,.27],[.12,.18],[.2,.17],[.27,.23],[.3,.33],[.25,.42],[.2,.43],[.17,.52],[.11,.48],[.08,.39]], "#668454", "#477448");
  drawLand([[.27,.47],[.33,.49],[.37,.58],[.36,.7],[.32,.84],[.28,.74],[.26,.61]], "#62834a", "#89763f");
  drawLand([[.42,.25],[.49,.18],[.61,.17],[.72,.22],[.82,.29],[.78,.39],[.68,.4],[.63,.34],[.55,.38],[.47,.34]], "#6a8052", "#607943");
  drawLand([[.48,.39],[.57,.37],[.63,.46],[.61,.6],[.56,.74],[.5,.65],[.47,.5]], "#6f8046", "#8a7443");
  drawLand([[.77,.61],[.84,.57],[.9,.62],[.88,.72],[.8,.73]], "#647846", "#846f43");
  drawLand([[.16,.14],[.21,.1],[.25,.14],[.21,.2]], "#d3dfc6", "#bdcfb4");

  // 極地は直線の白帯ではなく、透明度の異なる氷域を重ねる。
  const drawPolarIce = (north = true) => {
    const capDepth = north ? 31 : 37;
    const edgeY = north ? 0 : canvas.height;
    const gradient = context.createLinearGradient(
      0,
      edgeY,
      0,
      north ? capDepth + 22 : canvas.height - capDepth - 22,
    );
    gradient.addColorStop(0, "rgba(242,250,255,.96)");
    gradient.addColorStop(.68, "rgba(225,244,252,.82)");
    gradient.addColorStop(1, "rgba(210,238,249,0)");
    const cap = new Path2D();
    cap.moveTo(0, north ? 0 : canvas.height);
    cap.lineTo(canvas.width, north ? 0 : canvas.height);
    for (let step = 48; step >= 0; step -= 1) {
      const x = (step / 48) * canvas.width;
      const wobble = Math.sin(step * .34) * 2.8 + Math.sin(step * .71) * 1.6;
      const edge = capDepth + wobble;
      cap.lineTo(x, north ? edge : canvas.height - edge);
    }
    cap.closePath();
    context.fillStyle = gradient;
    context.fill(cap);
  };
  drawPolarIce(true);
  drawPolarIce(false);

  // Shallow-water shelves and small island chains give the globe depth when
  // seen from the wide UFO camera.
  context.fillStyle = "rgba(110,198,160,.68)";
  [[.36,.44,9],[.66,.43,7],[.75,.52,6],[.9,.45,5],[.23,.58,5],[.69,.56,4],[.92,.37,4]].forEach(([x,y,r]) => {
    context.beginPath();
    context.arc(x * canvas.width, y * canvas.height, r, 0, Math.PI * 2);
    context.fill();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeSpaceEarthCloudTexture() {
  const cacheKey = "space-earth-cloud-layer-v7";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  let seed = 0x12c0ffee;
  const random = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  };
  const drawWisp = (x, y, rx, ry, alpha, angle = 0) => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, rx);
    gradient.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    context.fill();
  };
  for (let band = 0; band < 9; band += 1) {
    const centerY = (.1 + band * .1) * canvas.height;
    for (let index = 0; index < 34; index += 1) {
      const x = random() * canvas.width;
      const y = centerY + (random() - .5) * 54;
      const rx = 18 + random() * 58;
      const ry = 4 + random() * 12;
      drawWisp(x, y, rx, ry, .1 + random() * .22, random() * .5 - .25);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

function makeSpaceEarthLaunchCloudTexture() {
  const cacheKey = "space-earth-launch-cloud-layer-v1";
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  const drawDensePuff = (x, y, radiusX, radiusY, angle = 0) => {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    // 中心は完全な白で覆い、海を透かさない。
    context.fillStyle = "rgba(255,255,255,1)";
    context.beginPath();
    context.ellipse(0, 0, radiusX * .76, radiusY * .76, 0, 0, Math.PI * 2);
    context.fill();
    // 外側だけを柔らかくし、白い塊の輪郭を雲らしく馴染ませる。
    const fringe = context.createRadialGradient(0, 0, radiusX * .56, 0, 0, radiusX);
    fringe.addColorStop(0, "rgba(255,255,255,1)");
    fringe.addColorStop(.74, "rgba(255,255,255,1)");
    fringe.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = fringe;
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };
  const centerX = 768;
  const centerY = 384;
  [
    [-58, 3, 56, 43, -.08],
    [-29, -35, 57, 46, .03],
    [20, -39, 60, 49, -.05],
    [61, -4, 58, 45, .08],
    [46, 40, 62, 42, -.09],
    [0, 52, 70, 38, .02],
    [-49, 37, 54, 40, .07],
    [0, 2, 74, 58, 0],
  ].forEach(([offsetX, offsetY, radiusX, radiusY, angle]) => {
    drawDensePuff(centerX + offsetX, centerY + offsetY, radiusX, radiusY, angle);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

function makeSpaceMarsTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  let seed = 0x6d617273;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const base = context.createLinearGradient(0, 0, 0, canvas.height);
  base.addColorStop(0, "#a94d32");
  base.addColorStop(.22, "#c76442");
  base.addColorStop(.52, "#9d3d2d");
  base.addColorStop(.8, "#6f2926");
  base.addColorStop(1, "#3b171b");
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Broad, low-contrast albedo regions keep Mars readable as a planet rather
  // than as a flat red sphere when the enlarged globe fills the view.
  for (let index = 0; index < 680; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radiusX = 12 + random() * 105;
    const radiusY = 4 + random() * 28;
    const tint = random();
    const gradient = context.createRadialGradient(x, y, 0, x, y, radiusX);
    gradient.addColorStop(0, tint > .54
      ? `rgba(224,126,77,${(.045 + random() * .11).toFixed(3)})`
      : `rgba(44,15,22,${(.04 + random() * .1).toFixed(3)})`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  // Fine dust bands and crater-like marks add restrained surface relief.
  for (let index = 0; index < 180; index += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const radius = 2 + random() * 18;
    context.strokeStyle = random() > .46
      ? `rgba(242,157,101,${(.05 + random() * .09).toFixed(3)})`
      : `rgba(39,13,20,${(.045 + random() * .08).toFixed(3)})`;
    context.lineWidth = .8 + random() * 2.2;
    context.beginPath();
    context.arc(x, y, radius, random() * .4, Math.PI * 1.6 + random() * .5);
    context.stroke();
  }

  const drawCap = (north = true) => {
    const depth = 34;
    const edgeY = north ? 0 : canvas.height;
    const gradient = context.createLinearGradient(
      0,
      edgeY,
      0,
      north ? depth + 36 : canvas.height - depth - 36,
    );
    gradient.addColorStop(0, "rgba(248,218,190,.92)");
    gradient.addColorStop(.6, "rgba(226,167,133,.52)");
    gradient.addColorStop(1, "rgba(180,94,70,0)");
    context.fillStyle = gradient;
    context.fillRect(0, north ? 0 : canvas.height - depth - 36, canvas.width, depth + 36);
  };
  drawCap(true);
  drawCap(false);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeSpaceMars(entryCraftCenter, craft) {
  const group = new THREE.Group();
  group.name = "space-mars";
  const orientation = new THREE.Quaternion();
  craft.getWorldQuaternion(orientation);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
  forward.normalize();
  const edgePoint = ufoSpaceEdgePointAlongDirection(
    entryCraftCenter,
    forward,
    UFO_SPACE_MARS_EDGE_INSET,
  );
  edgePoint.y += UFO_SPACE_MARS_HEIGHT_OFFSET;
  group.position.copy(edgePoint);
  group.userData.nonCollidable = true;
  group.userData.radius = UFO_SPACE_MARS_RADIUS;
  group.userData.edgeDistance = edgePoint.distanceTo(entryCraftCenter);
  group.userData.heightOffset = UFO_SPACE_MARS_HEIGHT_OFFSET;

  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(UFO_SPACE_MARS_RADIUS, 128, 80),
    new THREE.MeshPhysicalMaterial({
      map: makeSpaceMarsTexture(),
      color: 0xe7b09a,
      roughness: .94,
      metalness: 0,
      clearcoat: .02,
      clearcoatRoughness: 1,
      emissive: 0x180607,
      emissiveIntensity: .12,
    }),
  );
  surface.name = "space-mars-surface";
  surface.rotation.y = THREE.MathUtils.degToRad(42);
  group.add(surface);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(UFO_SPACE_MARS_RADIUS * 1.018, 96, 60),
    new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0xd66d50) } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDirection = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.55);
          gl_FragColor = vec4(glowColor, rim * 0.3);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  atmosphere.name = "space-mars-atmosphere";
  group.add(atmosphere);
  group.userData.surface = surface;
  return group;
}

function makeUfoForwardScrollHintTexture(value) {
  if (ufoForwardScrollHintTextures.has(value)) return ufoForwardScrollHintTextures.get(value);
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const palette = ["#9cfbd0", "#a8e8ff", "#ffd876", "#ffab77", "#ff7d9a"];
  const tint = palette[Math.min(palette.length - 1, Math.max(0, value))];
  const center = canvas.width / 2;
  const glow = context.createRadialGradient(center, center, 4, center, center, 118);
  glow.addColorStop(0, "rgba(5,19,39,.94)");
  glow.addColorStop(.55, "rgba(5,19,39,.78)");
  glow.addColorStop(1, "rgba(5,19,39,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = tint;
  context.globalAlpha = .88;
  context.lineWidth = 7;
  context.beginPath();
  context.arc(center, center, 79, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = "#f7fcff";
  context.font = "900 116px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(value), center, center + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  ufoForwardScrollHintTextures.set(value, texture);
  return texture;
}

function makeUfoForwardScrollBeacon(hazardCount) {
  const group = new THREE.Group();
  group.name = `ufo-forward-scroll-scan-${hazardCount}`;
  group.userData.nonCollidable = true;
  const tint = [0x9cfbd0, 0xa8e8ff, 0xffd876, 0xffab77, 0xff7d9a][
    Math.min(4, Math.max(0, hazardCount))
  ];
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(24, 2.2, 8, 32),
    new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: .72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  ring.name = "scan-ring";
  group.add(ring);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeUfoForwardScrollHintTexture(hazardCount),
    transparent: true,
    depthWrite: false,
    fog: false,
  }));
  label.name = "scan-number";
  label.scale.setScalar(112);
  label.position.z = 1.4;
  group.add(label);
  return { group, ring, label, hazardCount };
}

function makeUfoForwardScrollMarsAtmosphereEntry(mars, forward) {
  if (!mars || !forward) return null;
  const radius = mars.userData.radius || UFO_SPACE_MARS_RADIUS;
  const normal = forward.clone();
  if (normal.lengthSq() < 1e-6) normal.set(0, 0, -1);
  normal.normalize();
  const group = new THREE.Group();
  group.name = "ufo-forward-scroll-mars-atmosphere-entry";
  group.userData.nonCollidable = true;
  group.visible = false;
  // 火星の手前側に、実際の大気圏外縁と同じ向きの発光層を置く。航路の
  // 終端はこの面を通過する位置から算出されるため、画面だけの演出にはしない。
  group.position.copy(normal).multiplyScalar(-radius * 1.037);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  const makeLayer = (scale, color, edgeStart, baseIntensity) => {
    const uniforms = {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
      uEdgeStart: { value: edgeStart },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uTime;
        uniform float uEdgeStart;
        varying vec2 vUv;
        void main() {
          vec2 point = vUv * 2.0 - 1.0;
          float radius = length(point);
          if (radius > 1.0) discard;
          float rim = smoothstep(uEdgeStart, .945, radius)
            * (1.0 - smoothstep(.945, .998, radius));
          float haze = (1.0 - smoothstep(.18, .9, radius)) * .055;
          float angle = atan(point.y, point.x);
          float ripples = .78 + .22 * sin(angle * 15.0 + radius * 26.0 - uTime * 2.8);
          vec3 hot = mix(uColor, vec3(1.0, .83, .56), clamp(rim * 1.3, 0.0, 1.0));
          float alpha = (rim * (.72 + .28 * ripples) + haze) * uIntensity;
          gl_FragColor = vec4(hot, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius * scale, 128), material);
    mesh.name = "mars-atmosphere-entry-layer";
    mesh.renderOrder = 3;
    group.add(mesh);
    return { mesh, material, uniforms, baseIntensity };
  };

  const layers = [
    makeLayer(1.16, 0xc85035, .58, .24),
    makeLayer(1.075, 0xee7e45, .5, .44),
    makeLayer(.995, 0xffbb75, .44, .64),
  ];
  const waveMaterial = new THREE.MeshBasicMaterial({
    color: 0xffc17c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const completionWave = new THREE.Mesh(
    new THREE.RingGeometry(radius * .62, radius * .635, 128),
    waveMaterial,
  );
  completionWave.name = "mars-atmosphere-entry-wave";
  completionWave.renderOrder = 4;
  group.add(completionWave);
  const light = new THREE.PointLight(0xff864b, 0, radius * 2.8, 1.4);
  light.name = "mars-atmosphere-entry-light";
  light.position.z = -radius * .035;
  light.userData.nonCollidable = true;
  group.add(light);
  mars.add(group);
  return {
    group,
    layers,
    completionWave,
    waveMaterial,
    light,
    approachStart: UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_APPROACH_START,
    entered: false,
    elapsed: 0,
    flashElapsed: 0,
    overlayUntil: 0,
  };
}

function prepareUfoForwardScrollEarthDepartureVisuals(mission, earth) {
  if (!earth) return;
  const surface = earth.userData.surface;
  const globeClouds = earth.userData.clouds;
  const launchClouds = earth.userData.launchClouds;
  // 地球本体の海・大陸・白雲をそのまま出発地点として使う。
  if (surface?.material) {
    surface.visible = true;
    surface.material.opacity = 1;
    surface.material.transparent = false;
  }
  if (globeClouds?.material) {
    globeClouds.visible = true;
    globeClouds.material.opacity = .58;
  }
  if (launchClouds?.material) {
    launchClouds.visible = true;
    launchClouds.material.opacity = 1;
  }
}

function updateUfoForwardScrollEarthDepartureVisuals(mission, earth, progress) {
  // UFOは地球の実在する白雲の直上から始まり、上昇に合わせて地球が下方へ
  // 遠ざかる。雲だけを空中に浮かせる処理は行わない。
  if (earth && mission?.earthDepartureStartCenter && mission?.earthDepartureEndCenter) {
    const pullAway = THREE.MathUtils.smoothstep(progress, .04, .9);
    earth.position.lerpVectors(
      mission.earthDepartureStartCenter,
      mission.earthDepartureEndCenter,
      pullAway,
    );
  }
  if (!earth) return;
  const surface = earth.userData.surface;
  const globeClouds = earth.userData.clouds;
  const launchClouds = earth.userData.launchClouds;
  if (surface?.material) {
    surface.visible = true;
    surface.material.opacity = 1;
    surface.material.transparent = false;
  }
  if (globeClouds?.material) globeClouds.material.opacity = .58;
  if (launchClouds?.material) {
    launchClouds.visible = true;
    launchClouds.material.opacity = 1;
  }
}

function finishUfoForwardScrollEarthDepartureVisuals(mission, earth) {
  if (!earth) return;
  const surface = earth.userData.surface;
  const globeClouds = earth.userData.clouds;
  const launchClouds = earth.userData.launchClouds;
  if (surface?.material) {
    surface.visible = true;
    surface.material.opacity = 1;
    surface.material.transparent = false;
  }
  if (globeClouds?.material) globeClouds.material.opacity = .58;
  if (launchClouds?.material) {
    launchClouds.visible = true;
    launchClouds.material.opacity = 1;
  }
}

// --- Earth → Mars forward-scroll route ----------------------------------------------
// This route is intentionally separate from every older space prototype.  The UFO
// advances through one real 3D course; the blue, gold, and violet stars are world
// objects with fixed coordinates from the start, never screen overlays or a LOD swap.
function makeUfoForwardScrollMission(control, entryCraftCenter, craft, mars, starfield, routeSeed = 0) {
  const group = new THREE.Group();
  group.name = "ufo-earth-mars-forward-scroll";
  group.visible = false;
  group.userData.nonCollidable = true;

  const orientation = new THREE.Quaternion();
  craft.getWorldQuaternion(orientation);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
  forward.normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const scale = control?.scale || BUILDING_SCALE;
  const craftRadius = (control?.flightCollision?.radiusLocal
    ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale + UFO_FLIGHT_COLLISION_SKIN;
  const entryFlight = {
    x: state.ufoFlightX,
    y: state.ufoFlightY,
    z: state.ufoFlightZ,
    heading: state.ufoFlightHeading,
  };
  const routeMode = getUfoForwardScrollMarsDistanceMode(routeSeed);
  const cruiseDurationSeconds = getUfoForwardScrollCruiseSeconds(routeMode);
  const cruiseOrigin = entryCraftCenter.clone();
  cruiseOrigin.y += UFO_FORWARD_SCROLL_LAUNCH_CLIMB_WORLD;
  mars.updateWorldMatrix(true, true);
  const marsCenter = mars.getWorldPosition(new THREE.Vector3());
  const naturalForwardDistanceToMars = Math.max(
    12000,
    marsCenter.clone().sub(cruiseOrigin).dot(forward)
      - (mars.userData.radius || UFO_SPACE_MARS_RADIUS)
      - craftRadius
      - 180,
  );
  // 3億kmモードの物理コースを基準に巡航速度を決める。2.5億kmモードは
  // このコースを距離比どおりに短くし、到着時間も同じモードに合わせる。
  const targetCruiseWorldSpeed = naturalForwardDistanceToMars
    / Math.max(1, UFO_FORWARD_SCROLL_REFERENCE_CRUISE_SECONDS)
    * UFO_FORWARD_SCROLL_CRUISE_SPEED_REFERENCE_RATIO;
  const baseForwardDistanceToMars = Math.max(
    12000,
    targetCruiseWorldSpeed * UFO_FORWARD_SCROLL_CRUISE_SECONDS,
  );
  const forwardDistanceToMars = Math.max(
    1,
    baseForwardDistanceToMars * getUfoForwardScrollRouteDistanceRatio(routeMode),
  );
  // 火星の表示、当たり判定、ゴール判定、回収星の距離を同じ実コースへ揃える。
  // そのため、見えない短縮コースで先に到着することはない。
  const marsApproachDistance = forwardDistanceToMars
    + (mars.userData.radius || UFO_SPACE_MARS_RADIUS)
    + craftRadius
    + 180;
  const plannedMarsWorld = cruiseOrigin.clone().addScaledVector(forward, marsApproachDistance);
  const plannedMarsLocal = mars.parent
    ? mars.parent.worldToLocal(plannedMarsWorld.clone())
    : plannedMarsWorld;
  mars.position.copy(plannedMarsLocal);
  mars.userData.forwardScrollRouteLength = forwardDistanceToMars;
  mars.updateWorldMatrix(true, true);

  // 回収星も背景の点ではなく、同じ三次元座標にある滑らかな恒星核として
  // 描く。低ポリゴンの岩や宝石に見えないよう、球状の核と薄い発光だけで
  // 構成し、距離に応じた透視投影で自然に大きく見えるようにする。
  const geometry = new THREE.SphereGeometry(1, 20, 14);
  const haloGeometry = new THREE.SphereGeometry(1, 16, 12);
  const meshes = Object.create(null);
  const haloMeshes = Object.create(null);
  const dummies = Object.create(null);
  const haloDummies = Object.create(null);
  const spriteMaterials = Object.create(null);
  Object.entries(UFO_FORWARD_SCROLL_PICKUP_TYPES).forEach(([typeId, type]) => {
    const material = new THREE.MeshStandardMaterial({
      color: type.color,
      emissive: type.emissive,
      emissiveIntensity: 1.65,
      roughness: .34,
      metalness: 0,
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: type.color,
      transparent: true,
      opacity: .055,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    spriteMaterials[typeId] = new THREE.SpriteMaterial({
      map: makeSpaceExplorableStarSpriteTexture(),
      color: new THREE.Color(type.color).lerp(new THREE.Color(0xffffff), .36),
      transparent: true,
      opacity: .8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      UFO_FORWARD_SCROLL_PICKUP_SEGMENTS,
    );
    const halo = new THREE.InstancedMesh(
      haloGeometry,
      haloMaterial,
      UFO_FORWARD_SCROLL_PICKUP_SEGMENTS,
    );
    mesh.name = `ufo-forward-scroll-${typeId}-stars`;
    halo.name = `ufo-forward-scroll-${typeId}-halos`;
    mesh.frustumCulled = false;
    halo.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    halo.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(halo, mesh);
    meshes[typeId] = mesh;
    haloMeshes[typeId] = halo;
    dummies[typeId] = new THREE.Object3D();
    haloDummies[typeId] = new THREE.Object3D();
  });

  const random = makeUfoSpaceSeededRandom(mixUfoSpaceRouteSeed(routeSeed, 0x454d4152));
  const pickups = [];
  const fields = [];
  const typeCounts = { coin: 0, material: 0 };
  const addPickup = (typeId, basePosition, size, field) => {
    const type = UFO_FORWARD_SCROLL_PICKUP_TYPES[typeId];
    const index = typeCounts[typeId]++;
    const displaySize = size * UFO_FORWARD_SCROLL_PICKUP_VISUAL_SCALE;
    const position = basePosition.clone();
    const sprite = new THREE.Sprite(spriteMaterials[typeId]);
    sprite.name = `ufo-forward-scroll-${typeId}-star-glow-${index + 1}`;
    sprite.position.copy(position);
    sprite.scale.setScalar(displaySize * 6.2);
    sprite.renderOrder = 1;
    sprite.userData.nonCollidable = true;
    group.add(sprite);
    const pickup = {
      typeId,
      type,
      index,
      position,
      basePosition: basePosition.clone(),
      size: displaySize,
      radius: Math.max(
        UFO_FORWARD_SCROLL_PICKUP_RADIUS * UFO_FORWARD_SCROLL_PICKUP_VISUAL_SCALE,
        displaySize * .84,
      ),
      spin: random() * Math.PI * 2,
      collected: false,
      hitCount: 0,
      hitsRequired: UFO_FORWARD_SCROLL_PICKUP_HITS_REQUIRED,
      hitFlashUntil: -Infinity,
      collisionLatched: false,
      field,
      sprite,
    };
    pickups.push(pickup);
    field.nodes.push(pickup);
  };

  // 小型の青いエネルギー星は使わない。小型星は金色の宇宙金貨星と
  // 紫色の素材星だけに分け、航行エネルギーは大型の実体恒星から得る。
  for (let pickupIndex = 0; pickupIndex < UFO_FORWARD_SCROLL_PICKUP_COUNT; pickupIndex += 1) {
    const progress = .05 + pickupIndex / (UFO_FORWARD_SCROLL_PICKUP_COUNT - 1) * .88;
    const distance = forwardDistanceToMars * (progress + (random() * 2 - 1) * .011);
    const lateral = (random() * 2 - 1) * (980 + random() * 1750);
    const vertical = (random() * 2 - 1) * (430 + random() * 710);
    const depth = (random() * 2 - 1) * 280;
    const nodePosition = cruiseOrigin.clone()
      .addScaledVector(forward, distance + depth)
      .addScaledVector(right, lateral)
      .addScaledVector(up, vertical);
    const field = {
      index: pickupIndex,
      anchor: nodePosition.clone(),
      nodes: [],
      beacons: [],
      hazardCount: 0,
      driftAxis: right.clone().multiplyScalar(random() > .5 ? 1 : -1)
        .addScaledVector(up, (random() * 2 - 1) * .58).normalize(),
      driftAxisSecondary: up.clone().multiplyScalar(random() > .5 ? 1 : -1),
      driftAmplitude: UFO_FORWARD_SCROLL_FIELD_DRIFT_MIN
        + random() * (UFO_FORWARD_SCROLL_FIELD_DRIFT_MAX - UFO_FORWARD_SCROLL_FIELD_DRIFT_MIN),
      driftSpeed: .22 + random() * .34,
      driftPhase: random() * Math.PI * 2,
      revealed: false,
    };
    fields.push(field);
    const typeRoll = random();
    const typeId = typeRoll < UFO_FORWARD_SCROLL_COIN_STAR_RATIO ? "coin" : "material";
    addPickup(typeId, nodePosition, 27 + random() * 5, field);
  }
  Object.entries(typeCounts).forEach(([typeId, count]) => {
    meshes[typeId].count = Math.max(0, count);
    haloMeshes[typeId].count = Math.max(0, count);
  });
  const effectGroup = new THREE.Group();
  effectGroup.name = "ufo-forward-scroll-collection-effects";
  effectGroup.userData.nonCollidable = true;
  group.add(effectGroup);
  // 離陸雲は発進地点に置いた地球本体の白雲を使うため、別の雲デッキは持たない。
  const departureCloudDeck = null;
  const marsAtmosphereEntry = makeUfoForwardScrollMarsAtmosphereEntry(mars, forward);

  // ロックした資源星を、画面中央の固定レティクルではなく対象そのものへ
  // 重ねて示す。常にカメラ正面を向くため、飛行中でも見失わない。
  const lockIndicator = new THREE.Group();
  lockIndicator.name = "ufo-forward-scroll-resource-lock";
  lockIndicator.userData.nonCollidable = true;
  lockIndicator.visible = false;
  const lockMaterial = new THREE.MeshBasicMaterial({
    color: 0x9ff7ff,
    transparent: true,
    opacity: .96,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const lockRing = new THREE.Mesh(new THREE.TorusGeometry(1, .055, 8, 40), lockMaterial);
  lockIndicator.add(lockRing);
  const lockMarkerGeometry = new THREE.BoxGeometry(.34, .08, .08);
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2;
    const marker = new THREE.Mesh(lockMarkerGeometry, lockMaterial);
    marker.position.set(Math.cos(angle) * 1.26, Math.sin(angle) * 1.26, 0);
    marker.rotation.z = angle;
    lockIndicator.add(marker);
  }
  effectGroup.add(lockIndicator);

  const mission = {
    active: false,
    phase: "idle",
    elapsed: 0,
    phaseElapsed: 0,
    group,
    origin: cruiseOrigin,
    entryCraftCenter: entryCraftCenter.clone(),
    entryFlight,
    cruiseFlightY: entryFlight.y + UFO_FORWARD_SCROLL_LAUNCH_CLIMB_WORLD / scale,
    courseHeading: entryFlight.heading,
    routeMode,
    totalDurationSeconds: routeMode.totalSeconds,
    baseRouteLength: baseForwardDistanceToMars,
    cruiseDurationSeconds,
    cruiseWorldSpeed: forwardDistanceToMars / Math.max(1, cruiseDurationSeconds),
    cruiseSpeedLocal: forwardDistanceToMars
      / Math.max(1, cruiseDurationSeconds * scale),
    forward,
    right,
    up,
    routeLength: forwardDistanceToMars,
    routeSeed,
    routeRerollCount: 0,
    progressDistance: 0,
    cruiseElapsed: 0,
    cruiseStartedAt: null,
    cruiseCompletedAt: null,
    energy: UFO_FORWARD_SCROLL_START_ENERGY,
    maxEnergy: UFO_FORWARD_SCROLL_ENERGY_MAX,
    energyEmergencyReturnPending: false,
    energyPerWorldUnit: UFO_FORWARD_SCROLL_ENERGY_MAX
      / Math.max(1, forwardDistanceToMars * UFO_FORWARD_SCROLL_BASE_ENERGY_RANGE_RATIO),
    coinsCollected: 0,
    materialsCollected: 0,
    energyCollected: 0,
    hazardHits: 0,
    pickupCollisionCount: 0,
    pickupImpactUntil: -Infinity,
    pickupContactCenter: entryCraftCenter.clone(),
    fields,
    pickups,
    starfield,
    energyStars: new Map(),
    meshes,
    haloMeshes,
    dummies,
    haloDummies,
    craftRadius,
    effectGroup,
    departureCloudDeck,
    marsAtmosphereEntry,
    bursts: [],
    lockIndicator,
    lockedPickup: null,
    // 実際の機体姿勢へ重ねるロック追尾角。航路上の自動前進や手動の横・上下
    // 移動を変えず、対象へノーズと照準だけを滑らかに寄せる。
    lockTrackingYaw: 0,
    lockTrackingPitch: 0,
    lockTrackingVector: new THREE.Vector3(),
    lockTrackingRight: new THREE.Vector3(),
    aimOrigin: entryCraftCenter.clone(),
    aimDirection: forward.clone(),
    aimQuaternion: new THREE.Quaternion(),
    aimPoint: entryCraftCenter.clone(),
    aimProjection: new THREE.Vector3(),
    aimCameraDirection: new THREE.Vector3(),
    aimCameraVector: new THREE.Vector3(),
    aimScreen: {
      x: .5,
      y: .5,
      width: 1,
      height: 1,
      leftPercent: 50,
      topPercent: 50,
      halfSize: UFO_FORWARD_SCROLL_RETICLE_SIZE * getUfoEquipmentLockOnReticleMultiplier() / 2,
    },
    // 離陸演出専用の一時カメラ。地球とUFOを同じ実座標から見せ、画面用の
    // 偽物の地球や座標ワープを使わない。
    departureCamera: new THREE.Vector3(),
    departureTarget: new THREE.Vector3(),
    pickupProjection: new THREE.Vector3(),
    pickupCameraPosition: new THREE.Vector3(),
    pickupCameraDirection: new THREE.Vector3(),
    pickupCameraVector: new THREE.Vector3(),
    shots: [],
    holdFireReadyAt: 0,
    lastCraftCenter: entryCraftCenter.clone(),
    lastRewardToastAt: -Infinity,
    collectiblesEnabled: true,
    energySystemEnabled: true,
    handlingTrial: false,
    testMode: false,
  };
  return mission;
}

function rerollUfoForwardScrollPickupRoute(mission, routeSeed) {
  if (!mission?.fields?.length) return false;
  const random = makeUfoSpaceSeededRandom(mixUfoSpaceRouteSeed(routeSeed, 0x454d4152));
  mission.fields.forEach((field, pickupIndex) => {
    const pickup = field.nodes?.[0];
    if (!pickup) return;
    const progress = .05 + pickupIndex / Math.max(1, mission.fields.length - 1) * .88;
    const distance = mission.routeLength * (progress + (random() * 2 - 1) * .011);
    const lateral = (random() * 2 - 1) * (980 + random() * 1750);
    const vertical = (random() * 2 - 1) * (430 + random() * 710);
    const depth = (random() * 2 - 1) * 280;
    const nodePosition = mission.origin.clone()
      .addScaledVector(mission.forward, distance + depth)
      .addScaledVector(mission.right, lateral)
      .addScaledVector(mission.up, vertical);
    field.anchor.copy(nodePosition);
    field.driftAxis.copy(mission.right).multiplyScalar(random() > .5 ? 1 : -1)
      .addScaledVector(mission.up, (random() * 2 - 1) * .58).normalize();
    field.driftAxisSecondary.copy(mission.up).multiplyScalar(random() > .5 ? 1 : -1);
    field.driftAmplitude = UFO_FORWARD_SCROLL_FIELD_DRIFT_MIN
      + random() * (UFO_FORWARD_SCROLL_FIELD_DRIFT_MAX - UFO_FORWARD_SCROLL_FIELD_DRIFT_MIN);
    field.driftSpeed = .22 + random() * .34;
    field.driftPhase = random() * Math.PI * 2;
    field.motionOffset?.set(0, 0, 0);
    field.revealed = false;
    pickup.basePosition.copy(nodePosition);
    pickup.position.copy(nodePosition);
    pickup.spin = random() * Math.PI * 2;
    pickup.collected = false;
    pickup.hitCount = 0;
    pickup.hitFlashUntil = -Infinity;
    pickup.collisionLatched = false;
  });
  mission.routeSeed = routeSeed;
  mission.routeRerollCount = (mission.routeRerollCount || 0) + 1;
  updateUfoForwardScrollFieldMotion(mission);
  refreshUfoForwardScrollPickups(mission);
  return true;
}

function rerollUfoForwardScrollEnergyStarCandidates(mission, routeSeed) {
  const starfield = mission?.starfield;
  if (!starfield?.stars) return;
  starfield.routeSeed = routeSeed;
  starfield.stars.forEach(star => {
    star.energyTargetEligible = isUfoForwardScrollEnergyStarEligible(routeSeed, star.renderIndex);
  });
}

function setUfoForwardScrollPickupVisible(mission, pickup, visible) {
  if (!mission || !pickup) return;
  if (pickup.source === "space-energy-star") {
    const starfield = pickup.starfield || mission.starfield;
    // 大型の実体恒星は InstancedMesh ではなく、星空そのものの表示を
    // 使う。回収前は青いエネルギー星、回収後は星そのものを消す。
    setSpaceExplorableStarEnergyTarget(starfield, pickup.star, true);
    setSpaceExplorableStarDestroyed(starfield, pickup.star, !visible);
    return;
  }
  const dummy = mission.dummies[pickup.typeId];
  const haloDummy = mission.haloDummies[pickup.typeId];
  if (!dummy || !haloDummy) return;
  if (visible) {
    const hitRatio = clamp(pickup.hitCount / Math.max(1, pickup.hitsRequired), 0, 1);
    const hitFlash = Math.max(0, ((pickup.hitFlashUntil || -Infinity) - mission.elapsed) / .24);
    const spin = pickup.spin + mission.elapsed * (1.04 + pickup.hitCount * .22);
    const coreScale = pickup.size * (1 - hitRatio * .08 + hitFlash * .28);
    dummy.position.copy(pickup.position);
    dummy.rotation.set(spin * .41, spin, spin * .19);
    dummy.scale.setScalar(coreScale);
    haloDummy.position.copy(pickup.position);
    haloDummy.rotation.copy(dummy.rotation);
    haloDummy.scale.setScalar(pickup.size * (1.42 + hitRatio * .1 + hitFlash * .52));
    if (pickup.sprite) {
      pickup.sprite.position.copy(pickup.position);
      pickup.sprite.scale.setScalar(pickup.size * 6.2 * (1 + hitFlash * .36));
      pickup.sprite.visible = true;
    }
  } else {
    dummy.position.set(0, -1000000, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.setScalar(0);
    haloDummy.position.set(0, -1000000, 0);
    haloDummy.rotation.set(0, 0, 0);
    haloDummy.scale.setScalar(0);
    if (pickup.sprite) pickup.sprite.visible = false;
  }
  dummy.updateMatrix();
  haloDummy.updateMatrix();
  mission.meshes[pickup.typeId].setMatrixAt(pickup.index, dummy.matrix);
  mission.haloMeshes[pickup.typeId].setMatrixAt(pickup.index, haloDummy.matrix);
}

function markUfoForwardScrollPickupRenderDirty(mission, pickup) {
  if (!mission || !pickup || pickup.source === "space-energy-star") return;
  const mesh = mission.meshes?.[pickup.typeId];
  const halo = mission.haloMeshes?.[pickup.typeId];
  if (mesh) mesh.instanceMatrix.needsUpdate = true;
  if (halo) halo.instanceMatrix.needsUpdate = true;
}

function getUfoForwardScrollTargets(mission) {
  if (!mission) return [];
  const pickups = Array.isArray(mission.pickups) ? mission.pickups : [];
  const energyStars = mission.energyStars ? [...mission.energyStars.values()] : [];
  return pickups.concat(energyStars);
}

function resetUfoForwardScrollEnergyStars(mission) {
  if (!mission?.energyStars) return;
  mission.energyStars.forEach(pickup => {
    const starfield = pickup.starfield || mission.starfield;
    setSpaceExplorableStarDestroyed(starfield, pickup.star, false);
    setSpaceExplorableStarEnergyTarget(starfield, pickup.star, false);
  });
  mission.energyStars.clear();
  delete document.body.dataset.ufoForwardScrollEnergyStarTargets;
}

function syncUfoForwardScrollEnergyStars(control, mission, craftCenter) {
  if (!mission || !craftCenter) return;
  const starfield = mission.starfield || control?.spaceExplorableStarfield;
  if (!starfield?.activeDetails?.size) return;
  mission.starfield = starfield;
  const energyStars = mission.energyStars || (mission.energyStars = new Map());
  const releasePadding = 2800;
  const detectionMultiplier = getUfoEquipmentLockOnDetectionMultiplier();

  // 通り過ぎた未回収星は再び通常の星空へ戻す。破壊済み星だけはリロード／
  // 再出発時に復元できるよう、ミッション中は記録を残す。
  for (const [id, pickup] of energyStars) {
    if (pickup.collected || pickup.star?.energyDestroyed) continue;
    const releaseDistance = UFO_FORWARD_SCROLL_ENERGY_STAR_REGISTRATION_RANGE * detectionMultiplier
      + (pickup.star?.radius || pickup.radius || 0)
      + releasePadding;
    if (craftCenter.distanceToSquared(pickup.position) <= releaseDistance * releaseDistance) continue;
    if (mission.lockedPickup === pickup) mission.lockedPickup = null;
    setSpaceExplorableStarEnergyTarget(starfield, pickup.star, false);
    energyStars.delete(id);
  }

  // 近くに実体メッシュとして表示されている恒星だけを対象へ登録する。
  // 36,000個の遠景点を毎フレーム判定せず、実際に目で確認できる星と
  // ロックオン／射撃の対象を完全に一致させる。
  for (const [id] of starfield.activeDetails) {
    const star = starfield.starById?.get(id);
    if (!star || star.energyDestroyed || !star.energyTargetEligible) continue;
    const registrationDistance = UFO_FORWARD_SCROLL_ENERGY_STAR_REGISTRATION_RANGE * detectionMultiplier + star.radius;
    if (craftCenter.distanceToSquared(star.position) > registrationDistance * registrationDistance) continue;
    let pickup = energyStars.get(id);
    if (!pickup) {
      pickup = {
        source: "space-energy-star",
        typeId: "energy",
        type: UFO_FORWARD_SCROLL_ENERGY_STAR_TYPE,
        starfield,
        star,
        position: star.position,
        basePosition: star.position,
        size: clamp(star.radius * .24, 72, 240),
        projectileSize: clamp(star.radius * .03, 16, 30),
        radius: star.radius * 1.04,
        spin: 0,
        collected: false,
        hitCount: 0,
        hitsRequired: UFO_FORWARD_SCROLL_PICKUP_HITS_REQUIRED,
        hitFlashUntil: -Infinity,
        collisionLatched: false,
      };
      energyStars.set(id, pickup);
    }
    pickup.position = star.position;
    setSpaceExplorableStarEnergyTarget(starfield, star, true);
  }
  document.body.dataset.ufoForwardScrollEnergyStarTargets = String(
    [...energyStars.values()].filter(pickup => !pickup.collected).length,
  );
}

function refreshUfoForwardScrollPickups(mission) {
  if (!mission) return;
  mission.pickups.forEach(pickup => {
    setUfoForwardScrollPickupVisible(mission, pickup, !pickup.collected);
  });
  Object.values(mission.meshes).forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  Object.values(mission.haloMeshes).forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
}

function updateUfoForwardScrollFieldMotion(mission, craftCenter = null) {
  if (!mission?.fields) return;
  mission.fields.forEach(field => {
    const phase = mission.elapsed * field.driftSpeed + field.driftPhase;
    const offset = field.motionOffset || new THREE.Vector3();
    field.motionOffset = offset;
    offset.copy(field.driftAxis).multiplyScalar(Math.sin(phase) * field.driftAmplitude)
      .addScaledVector(field.driftAxisSecondary, Math.cos(phase * .73) * field.driftAmplitude * .28);
    field.nodes.forEach(pickup => {
      pickup.position.copy(pickup.basePosition).add(offset);
      if (!pickup.collected) setUfoForwardScrollPickupVisible(mission, pickup, true);
    });
    const relativeForward = craftCenter
      ? field.anchor.clone().sub(craftCenter).dot(mission.forward)
      : Infinity;
    const shouldReveal = relativeForward <= UFO_FORWARD_SCROLL_FIELD_SCAN_RANGE
      && relativeForward >= -820;
    field.revealed = shouldReveal;
    field.beacons.forEach((beacon, beaconIndex) => {
      beacon.group.position.copy(beacon.basePosition).add(offset);
      beacon.group.visible = shouldReveal;
      beacon.ring.rotation.z += .008 + beaconIndex * .0015;
      beacon.label.material.opacity = shouldReveal ? .96 : 0;
    });
  });
  Object.values(mission.meshes).forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
  Object.values(mission.haloMeshes).forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
}

function spawnUfoForwardScrollHazardBurst(mission, position) {
  if (!mission?.effectGroup) return;
  const group = new THREE.Group();
  group.name = "ufo-forward-scroll-unstable-star-burst";
  group.position.copy(position);
  group.userData.nonCollidable = true;
  const glowMaterial = new THREE.SpriteMaterial({
    map: makeSpaceExplorableStarSpriteTexture(),
    color: 0xffa066,
    transparent: true,
    opacity: .92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  glow.scale.setScalar(80);
  group.add(glow);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcf8a,
    transparent: true,
    opacity: .82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.5, 8, 40), ringMaterial);
  group.add(ring);
  mission.effectGroup.add(group);
  mission.bursts.push({ group, glow, glowMaterial, ring, ringMaterial, elapsed: 0, duration: 1.05 });
}

function spawnUfoForwardScrollCollectionBurst(mission, pickup) {
  if (!mission?.effectGroup || !pickup?.type) return;
  const group = new THREE.Group();
  group.name = `ufo-forward-scroll-${pickup.typeId}-collection-burst`;
  group.position.copy(pickup.position);
  group.userData.nonCollidable = true;
  const glowMaterial = new THREE.SpriteMaterial({
    map: makeSpaceExplorableStarSpriteTexture(),
    color: new THREE.Color(pickup.type.color).lerp(new THREE.Color(0xffffff), .28),
    transparent: true,
    opacity: .94,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  const baseGlowScale = Math.max(70, pickup.size * 4.5);
  glow.scale.setScalar(baseGlowScale);
  group.add(glow);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: pickup.type.color,
    transparent: true,
    opacity: .88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(14, pickup.size * .9), 1.45, 8, 40),
    ringMaterial,
  );
  group.add(ring);
  mission.effectGroup.add(group);
  mission.bursts.push({
    group,
    glow,
    glowMaterial,
    ring,
    ringMaterial,
    elapsed: 0,
    duration: .62,
    baseGlowScale,
    glowExpansion: Math.max(260, pickup.size * 17),
    ringExpansion: 8.5,
  });
}

function spawnUfoForwardScrollPickupHitBurst(mission, pickup) {
  if (!mission?.effectGroup || !pickup?.type) return;
  const group = new THREE.Group();
  group.name = `ufo-forward-scroll-${pickup.typeId}-hit-burst`;
  group.position.copy(pickup.position);
  group.userData.nonCollidable = true;
  const glowMaterial = new THREE.SpriteMaterial({
    map: makeSpaceExplorableStarSpriteTexture(),
    color: new THREE.Color(pickup.type.color).lerp(new THREE.Color(0xffffff), .18),
    transparent: true,
    opacity: .86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const glow = new THREE.Sprite(glowMaterial);
  const baseGlowScale = Math.max(48, pickup.size * 3.1);
  glow.scale.setScalar(baseGlowScale);
  group.add(glow);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: pickup.type.color,
    transparent: true,
    opacity: .82,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(11, pickup.size * .68), 1.1, 8, 36),
    ringMaterial,
  );
  group.add(ring);
  mission.effectGroup.add(group);
  mission.bursts.push({
    group,
    glow,
    glowMaterial,
    ring,
    ringMaterial,
    elapsed: 0,
    duration: .24,
    baseGlowScale,
    glowExpansion: Math.max(96, pickup.size * 5.6),
    ringExpansion: 2.9,
  });
}

function updateUfoForwardScrollBursts(mission, delta) {
  if (!mission?.bursts?.length) return;
  for (let index = mission.bursts.length - 1; index >= 0; index -= 1) {
    const burst = mission.bursts[index];
    burst.elapsed += delta;
    const progress = clamp(burst.elapsed / burst.duration, 0, 1);
    burst.glow.scale.setScalar((burst.baseGlowScale || 80) + progress * (burst.glowExpansion || 540));
    burst.ring.scale.setScalar(1 + progress * (burst.ringExpansion || 12));
    burst.ring.rotation.z += .14;
    burst.glowMaterial.opacity = (1 - progress) * .92;
    burst.ringMaterial.opacity = (1 - progress) * .78;
    if (progress < 1) continue;
    burst.group.parent?.remove(burst.group);
    burst.glowMaterial.dispose();
    burst.ringMaterial.dispose();
    mission.bursts.splice(index, 1);
  }
}

function disposeUfoForwardScrollShot(shot) {
  if (!shot) return;
  if (shot.projectile) {
    shot.projectile.parent?.remove(shot.projectile);
    shot.projectile.geometry?.dispose();
    shot.projectile.material?.dispose();
  }
}

function clearUfoForwardScrollShot(mission, shot = null) {
  if (!mission) return;
  const shots = mission.shots || (mission.shots = []);
  if (!shot) {
    shots.forEach(disposeUfoForwardScrollShot);
    shots.length = 0;
    return;
  }
  const index = shots.indexOf(shot);
  if (index < 0) return;
  disposeUfoForwardScrollShot(shot);
  shots.splice(index, 1);
}

function updateUfoForwardScrollAimRay(control, mission, craftCenter = null) {
  const craft = control?.craftAssembly;
  if (!mission || !craft) return false;
  craft.updateWorldMatrix(true, false);
  const origin = mission.aimOrigin || (mission.aimOrigin = new THREE.Vector3());
  if (craftCenter) origin.copy(craftCenter);
  else craft.getWorldPosition(origin);
  const direction = mission.aimDirection || (mission.aimDirection = new THREE.Vector3());
  const quaternion = mission.aimQuaternion || (mission.aimQuaternion = new THREE.Quaternion());
  craft.getWorldQuaternion(quaternion);
  direction.set(0, 0, -1).applyQuaternion(quaternion);
  if (direction.lengthSq() <= 1e-6) direction.copy(mission.forward);
  direction.normalize();
  return true;
}

function updateUfoForwardScrollAimScreenPoint(mission) {
  if (!mission?.aimOrigin || !mission?.aimDirection || !camera) return null;
  const screen = mission.aimScreen || (mission.aimScreen = {});
  const aimPoint = mission.aimPoint || (mission.aimPoint = new THREE.Vector3());
  const projection = mission.aimProjection || (mission.aimProjection = new THREE.Vector3());
  const cameraDirection = mission.aimCameraDirection || (mission.aimCameraDirection = new THREE.Vector3());
  const cameraVector = mission.aimCameraVector || (mission.aimCameraVector = new THREE.Vector3());
  const viewport = els.canvas?.getBoundingClientRect?.();
  screen.width = Math.max(1, viewport?.width || els.canvas?.clientWidth || 1);
  screen.height = Math.max(1, viewport?.height || els.canvas?.clientHeight || 1);
  screen.halfSize = UFO_FORWARD_SCROLL_RETICLE_SIZE * getUfoEquipmentLockOnReticleMultiplier() / 2;

  // 画面上の照準は、UFOノーズの実際の延長線を投影した位置に置く。
  aimPoint.copy(mission.aimOrigin).addScaledVector(
    mission.aimDirection,
    UFO_FORWARD_SCROLL_AIM_SCREEN_DISTANCE,
  );
  camera.updateMatrixWorld();
  camera.getWorldDirection(cameraDirection);
  cameraVector.copy(aimPoint).sub(camera.position);
  screen.leftPercent = 50;
  screen.topPercent = 50;
  if (cameraVector.dot(cameraDirection) > .01) {
    projection.copy(aimPoint).project(camera);
    if (Number.isFinite(projection.x) && Number.isFinite(projection.y)) {
      screen.leftPercent = clamp((projection.x + 1) * 50, 5, 95);
      screen.topPercent = clamp((1 - projection.y) * 50, 5, 95);
    }
  }
  screen.x = screen.width * screen.leftPercent / 100;
  screen.y = screen.height * screen.topPercent / 100;
  return screen;
}

function getUfoForwardScrollPickupScreenMetrics(mission, pickup, aimScreen) {
  if (!mission || !pickup || pickup.collected || !aimScreen || !camera) return null;
  const projection = mission.pickupProjection || (mission.pickupProjection = new THREE.Vector3());
  const cameraPosition = mission.pickupCameraPosition || (mission.pickupCameraPosition = new THREE.Vector3());
  const cameraDirection = mission.pickupCameraDirection || (mission.pickupCameraDirection = new THREE.Vector3());
  const cameraVector = mission.pickupCameraVector || (mission.pickupCameraVector = new THREE.Vector3());
  camera.getWorldPosition(cameraPosition);
  camera.getWorldDirection(cameraDirection);
  cameraVector.copy(pickup.position).sub(cameraPosition);
  const depth = cameraVector.dot(cameraDirection);
  // 中心がカメラの後方へ抜けた星は画面から消えたものとして扱う。
  if (depth <= .01) return null;
  projection.copy(pickup.position).project(camera);
  if (!Number.isFinite(projection.x) || !Number.isFinite(projection.y)) return null;

  // 見た目の発光スプライト（直径 size * 6.2）まで含め、星の一部が
  // 照準枠に掛かったかを画面ピクセルで判定する。
  const visualRadius = Math.max(pickup.radius || 0, (pickup.size || 0) * 3.1);
  const fovRadians = THREE.MathUtils.degToRad(Math.max(1, Number(camera.fov) || 60));
  const focalPixels = aimScreen.height / Math.max(.001, 2 * Math.tan(fovRadians / 2));
  const radiusPixels = clamp(
    visualRadius * focalPixels / Math.max(1, depth),
    1,
    Math.max(aimScreen.width, aimScreen.height) * 1.5,
  );
  const x = (projection.x + 1) * .5 * aimScreen.width;
  const y = (1 - projection.y) * .5 * aimScreen.height;
  const visible = x + radiusPixels >= 0
    && x - radiusPixels <= aimScreen.width
    && y + radiusPixels >= 0
    && y - radiusPixels <= aimScreen.height;
  const nearestX = clamp(x, aimScreen.x - aimScreen.halfSize, aimScreen.x + aimScreen.halfSize);
  const nearestY = clamp(y, aimScreen.y - aimScreen.halfSize, aimScreen.y + aimScreen.halfSize);
  const distanceToFrame = Math.hypot(x - nearestX, y - nearestY);
  return {
    depth,
    x,
    y,
    radiusPixels,
    visible,
    intersectsReticle: visible && distanceToFrame <= radiusPixels,
    centerDistance: Math.hypot(x - aimScreen.x, y - aimScreen.y),
  };
}

function getUfoForwardScrollPickupAimMetrics(mission, pickup, aimOrigin, aimDirection) {
  if (!mission || !pickup || pickup.collected || !aimOrigin || !aimDirection) return null;
  const dx = pickup.position.x - aimOrigin.x;
  const dy = pickup.position.y - aimOrigin.y;
  const dz = pickup.position.z - aimOrigin.z;
  const distanceSquared = dx * dx + dy * dy + dz * dz;
  // 大型の実体恒星は小型の資源星より物理半径が大きい。見えているのに
  // 9,000以内へ入るまで狙えない、という不自然な状態を避けるため、
  // エネルギー星だけは登録済みの視認距離までロック可能にする。
  const detectionMultiplier = getUfoEquipmentLockOnDetectionMultiplier();
  const lockRange = (pickup.source === "space-energy-star"
    ? Math.max(
      UFO_FORWARD_SCROLL_LOCK_RANGE,
      UFO_FORWARD_SCROLL_ENERGY_STAR_REGISTRATION_RANGE + (pickup.star?.radius || pickup.radius || 0),
    )
    : UFO_FORWARD_SCROLL_LOCK_RANGE) * detectionMultiplier;
  if (distanceSquared > lockRange * lockRange) return null;
  const forwardDistance = dx * aimDirection.x + dy * aimDirection.y + dz * aimDirection.z;
  return { distanceSquared, forwardDistance, lockRange };
}

function isUfoForwardScrollPickupTrackable(mission, pickup, aimScreen) {
  const screenMetrics = getUfoForwardScrollPickupScreenMetrics(mission, pickup, aimScreen);
  // ロック後は照準を外してもよい。画面内に残る限り追尾対象として保持し、
  // 前後を通り過ぎて画面から消えた瞬間だけ解除する。
  return Boolean(screenMetrics?.visible);
}

function resetUfoForwardScrollLockTracking(mission) {
  if (!mission) return;
  mission.lockTrackingYaw = 0;
  mission.lockTrackingPitch = 0;
  delete document.body.dataset.ufoForwardScrollLockTracking;
  delete document.body.dataset.ufoForwardScrollLockYaw;
  delete document.body.dataset.ufoForwardScrollLockPitch;
}

function updateUfoForwardScrollLockTracking(control, mission, craftCenter, delta) {
  if (!mission || !craftCenter || !mission.forward) return false;
  const target = mission.lockedPickup;
  let tracking = false;
  let targetYawOffset = 0;
  let targetPitchOffset = 0;

  if (target && !target.collected) {
    const toTarget = mission.lockTrackingVector || (mission.lockTrackingVector = new THREE.Vector3());
    const courseRight = mission.lockTrackingRight || (mission.lockTrackingRight = new THREE.Vector3());
    toTarget.copy(target.position).sub(craftCenter);
    // mission.right is the left-side route basis retained by the older field
    // generator. The actual positive local X (UFO's right side) is its
    // inverse and is used here to calculate the authored nose yaw.
    courseRight.set(-mission.forward.z, 0, mission.forward.x).normalize();
    const forwardDistance = toTarget.dot(mission.forward);
    const lateralDistance = toTarget.dot(courseRight);
    const verticalDistance = toTarget.dot(mission.up || new THREE.Vector3(0, 1, 0));
    const horizontalDistance = Math.hypot(forwardDistance, lateralDistance);
    // Only turn toward an object that is still ahead of the route. Once it
    // passes the nose, the lock display can finish its normal release rather
    // than making the UFO swivel backward.
    if (forwardDistance > 1 && horizontalDistance > 1) {
      const desiredYaw = clamp(
        -Math.atan2(lateralDistance, forwardDistance),
        -UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_YAW,
        UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_YAW,
      );
      const desiredPitch = clamp(
        Math.atan2(verticalDistance, horizontalDistance),
        -UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_DESCENT_PITCH,
        UFO_FORWARD_SCROLL_LOCK_TRACK_MAX_PITCH,
      );
      // The total craft angle must face the target. Subtract the manual
      // input angle so a held lever does not fight or double the auto aim.
      targetYawOffset = desiredYaw - (state.ufoFlightDirectionalYaw || 0);
      targetPitchOffset = desiredPitch - (state.ufoFlightPitch || 0);
      tracking = true;
    }
  }

  const response = tracking
    ? UFO_FORWARD_SCROLL_LOCK_TRACK_RESPONSE
    : UFO_FORWARD_SCROLL_LOCK_TRACK_RELEASE_RESPONSE;
  const amount = 1 - Math.exp(-response * Math.max(0, delta || 0));
  mission.lockTrackingYaw = THREE.MathUtils.lerp(
    mission.lockTrackingYaw || 0,
    targetYawOffset,
    amount,
  );
  mission.lockTrackingPitch = THREE.MathUtils.lerp(
    mission.lockTrackingPitch || 0,
    targetPitchOffset,
    amount,
  );
  if (!tracking && Math.abs(mission.lockTrackingYaw) < 1e-4) mission.lockTrackingYaw = 0;
  if (!tracking && Math.abs(mission.lockTrackingPitch) < 1e-4) mission.lockTrackingPitch = 0;

  document.body.dataset.ufoForwardScrollLockTracking = tracking ? "active" : "release";
  document.body.dataset.ufoForwardScrollLockYaw = mission.lockTrackingYaw.toFixed(4);
  document.body.dataset.ufoForwardScrollLockPitch = mission.lockTrackingPitch.toFixed(4);
  // Apply immediately so this frame's reticle projection and this frame's
  // shot origin use the same direction as the visible UFO nose.
  applyUfoCraftWorldTransform(control);
  return tracking;
}

function findUfoForwardScrollAimTarget(mission, aimScreen) {
  const targets = getUfoForwardScrollTargets(mission);
  if (!targets.length || !mission?.aimOrigin || !mission.aimDirection || !aimScreen) return null;
  let selected = null;
  let bestScore = Infinity;
  targets.forEach(pickup => {
    const metrics = getUfoForwardScrollPickupAimMetrics(
      mission,
      pickup,
      mission.aimOrigin,
      mission.aimDirection,
    );
    if (!metrics || metrics.forwardDistance < 0) return;
    const screenMetrics = getUfoForwardScrollPickupScreenMetrics(mission, pickup, aimScreen);
    if (!screenMetrics?.intersectsReticle) return;
    // 星の核または発光の一部が枠に触れた候補の中から、照準中心に近いものを優先する。
    const score = screenMetrics.centerDistance / Math.max(1, aimScreen.halfSize + screenMetrics.radiusPixels)
      + metrics.forwardDistance / metrics.lockRange * .035;
    if (score < bestScore) {
      bestScore = score;
      selected = pickup;
    }
  });
  return selected;
}

function updateUfoForwardScrollLockOn(control, mission, craftCenter, delta = 0) {
  if (!mission || !craftCenter || !updateUfoForwardScrollAimRay(control, mission, craftCenter)) return;
  const aimScreen = updateUfoForwardScrollAimScreenPoint(mission);
  if (!aimScreen) return;
  if (!isUfoForwardScrollPickupTrackable(
    mission,
    mission.lockedPickup,
    aimScreen,
  )) {
    // 画面の照準枠へ星の一部が入った瞬間だけ新規ロックする。
    mission.lockedPickup = findUfoForwardScrollAimTarget(mission, aimScreen);
  }
  const target = mission.lockedPickup;
  updateUfoForwardScrollLockTracking(control, mission, craftCenter, delta);
  // 追尾後の実機首から照準を作り直す。これにより枠もUFOの向きと同じ方向へ
  // 動き、射撃の起点・表示・ロック対象が同一の姿勢を共有する。
  updateUfoForwardScrollAimRay(control, mission, craftCenter);
  updateUfoForwardScrollAimScreenPoint(mission);
  const indicator = mission.lockIndicator;
  if (!indicator) return;
  if (!target || target.collected) {
    indicator.visible = false;
    return;
  }
  indicator.visible = true;
  indicator.position.copy(target.position);
  if (camera) indicator.quaternion.copy(camera.quaternion);
  const pulse = 1 + Math.sin(mission.elapsed * 8.4) * .08;
  indicator.scale.setScalar(target.size * 2.15 * pulse);
}

function fireUfoForwardScrollLockOn({ silent = false } = {}) {
  const control = ufoDoorControls[0];
  const mission = control?.spaceForwardScroll;
  const craft = control?.craftAssembly;
  if (!mission || !craft || mission.phase !== "playing") return false;
  updateUfoForwardScrollAimRay(control, mission);
  const pickup = mission.lockedPickup;
  const origin = mission.aimOrigin.clone();
  const direction = mission.aimDirection.clone();
  const isLockedShot = Boolean(pickup && !pickup.collected);
  const distance = isLockedShot ? Math.sqrt(origin.distanceToSquared(pickup.position)) : 0;
  const duration = isLockedShot
    ? clamp(
      distance / UFO_FORWARD_SCROLL_SHOT_SPEED,
      UFO_FORWARD_SCROLL_SHOT_MIN_SECONDS,
      UFO_FORWARD_SCROLL_SHOT_MAX_SECONDS,
    )
    : UFO_FORWARD_SCROLL_FREE_SHOT_RANGE / UFO_FORWARD_SCROLL_SHOT_SPEED;
  const shotCount = state.ufoEquipment.simultaneousShotEnabled ? 2 : 1;
  const craftQuaternion = craft.getWorldQuaternion(new THREE.Quaternion());
  const craftRight = new THREE.Vector3(1, 0, 0).applyQuaternion(craftQuaternion).normalize();
  for (let shotIndex = 0; shotIndex < shotCount; shotIndex += 1) {
    const extraShot = shotIndex > 0;
    const shotOrigin = origin.clone();
    if (extraShot) shotOrigin.addScaledVector(craftRight, 11);
    const projectileScale = extraShot ? .84 : 1;
    const projectileMaterial = new THREE.MeshBasicMaterial({
      color: isLockedShot ? pickup.type.color : 0xaeefff,
      transparent: true,
      opacity: extraShot ? .78 : .98,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const projectile = new THREE.Mesh(
      new THREE.SphereGeometry(
        (isLockedShot ? Math.max(10, pickup.projectileSize ?? pickup.size * .52) : 12) * projectileScale,
        16,
        12,
      ),
      projectileMaterial,
    );
    projectile.name = extraShot
      ? "ufo-forward-scroll-alpha-shot"
      : isLockedShot
        ? "ufo-forward-scroll-homing-missile"
        : "ufo-forward-scroll-free-shot";
    projectile.position.copy(shotOrigin);
    projectile.userData.nonCollidable = true;
    mission.effectGroup.add(projectile);
    const shot = isLockedShot
      ? {
        mode: "locked",
        pickup,
        origin: shotOrigin,
        direction: direction.clone(),
        projectile,
        elapsed: 0,
        duration,
        maxLifetime: clamp(
          duration * 2 + .1,
          UFO_FORWARD_SCROLL_MISSILE_MIN_LIFETIME,
          UFO_FORWARD_SCROLL_MISSILE_MAX_LIFETIME,
        ),
      }
      : {
        mode: "free",
        pickup: null,
        origin: shotOrigin,
        direction: direction.clone(),
        projectile,
        elapsed: 0,
        distance: 0,
        range: UFO_FORWARD_SCROLL_FREE_SHOT_RANGE,
        duration,
      };
    (mission.shots || (mission.shots = [])).push(shot);
  }
  mission.holdFireReadyAt = mission.elapsed + UFO_FORWARD_SCROLL_HOLD_FIRE_INTERVAL;
  document.body.dataset.ufoForwardScrollLock = isLockedShot ? pickup.typeId : "free";
  document.body.dataset.ufoSpaceShooting = isLockedShot ? "lock-shot" : "free-shot";
  if (!silent) {
    showToast(isLockedShot
      ? `${pickup.type.label}へ${shotCount === 2 ? "2発同時の" : ""}追尾ミサイルを発射します`
      : `${shotCount === 2 ? "2発同時の" : ""}回収パルスを発射します`);
  }
  return true;
}

function requestUfoForwardScrollManualShot() {
  const mission = ufoDoorControls[0]?.spaceForwardScroll;
  if (!mission || mission.phase !== "playing") return false;
  return fireUfoForwardScrollLockOn();
}

function findUfoForwardScrollFreeShotHit(mission, start, end) {
  const targets = getUfoForwardScrollTargets(mission);
  if (!targets.length) return null;
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const vz = end.z - start.z;
  const lengthSquared = vx * vx + vy * vy + vz * vz;
  if (lengthSquared < .0001) return null;
  let hit = null;
  let hitT = Infinity;
  targets.forEach(pickup => {
    if (pickup.collected) return;
    const px = pickup.position.x - start.x;
    const py = pickup.position.y - start.y;
    const pz = pickup.position.z - start.z;
    const t = clamp((px * vx + py * vy + pz * vz) / lengthSquared, 0, 1);
    const dx = pickup.position.x - (start.x + vx * t);
    const dy = pickup.position.y - (start.y + vy * t);
    const dz = pickup.position.z - (start.z + vz * t);
    const contactRadius = pickup.radius + UFO_FORWARD_SCROLL_FREE_SHOT_RADIUS;
    if (dx * dx + dy * dy + dz * dz > contactRadius * contactRadius || t >= hitT) return;
    hit = pickup;
    hitT = t;
  });
  return hit;
}

function doesUfoForwardScrollShotSegmentHitPickup(start, end, pickup, contactRadius) {
  if (!start || !end || !pickup) return false;
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const vz = end.z - start.z;
  const lengthSquared = vx * vx + vy * vy + vz * vz;
  if (lengthSquared < .0001) return start.distanceToSquared(pickup.position) <= contactRadius * contactRadius;
  const px = pickup.position.x - start.x;
  const py = pickup.position.y - start.y;
  const pz = pickup.position.z - start.z;
  const t = clamp((px * vx + py * vy + pz * vz) / lengthSquared, 0, 1);
  const dx = pickup.position.x - (start.x + vx * t);
  const dy = pickup.position.y - (start.y + vy * t);
  const dz = pickup.position.z - (start.z + vz * t);
  return dx * dx + dy * dy + dz * dz <= contactRadius * contactRadius;
}

function resolveUfoForwardScrollShotHit(mission, pickup, shot) {
  clearUfoForwardScrollShot(mission, shot);
  if (!pickup || pickup.collected) return;
  pickup.hitCount = Math.min(pickup.hitsRequired, pickup.hitCount + 1);
  pickup.hitFlashUntil = mission.elapsed + .24;
  pickup.spin = (pickup.spin || 0) + .62;
  setUfoForwardScrollPickupVisible(mission, pickup, true);
  markUfoForwardScrollPickupRenderDirty(mission, pickup);
  document.body.dataset.ufoForwardScrollHitProgress = `${pickup.hitCount}/${pickup.hitsRequired}`;
  if (pickup.hitCount >= pickup.hitsRequired) {
    if (mission.lockedPickup === pickup) mission.lockedPickup = null;
    spawnUfoForwardScrollCollectionBurst(mission, pickup);
    collectUfoForwardScrollPickup(mission, pickup);
    document.body.dataset.ufoForwardScrollLock = "none";
  } else {
    // A free shot that happens to hit a star turns it into the current target,
    // so the remaining impacts can be completed deliberately with lock-on.
    mission.lockedPickup = pickup;
    spawnUfoForwardScrollPickupHitBurst(mission, pickup);
    showToast(`${pickup.type.label}に命中：${pickup.hitCount}/${pickup.hitsRequired}発`);
  }
  document.body.dataset.ufoSpaceShooting = "lock-on";
}

function updateUfoForwardScrollShot(mission, delta) {
  if (!mission?.shots?.length) return;
  // 手動入力ごとのパルスを同時に処理する。入力を保留せず、その場で
  // それぞれの弾が発生・命中するため、連打時にも発射の遅れを作らない。
  [...mission.shots].forEach(shot => {
    if (!mission.shots.includes(shot)) return;
    shot.elapsed += delta;
    if (shot.mode === "free") {
      const previous = shot.projectile.position.clone();
      shot.distance = Math.min(
        shot.range,
        shot.distance + UFO_FORWARD_SCROLL_SHOT_SPEED * delta,
      );
      shot.projectile.position.copy(shot.origin).addScaledVector(shot.direction, shot.distance);
      shot.projectile.scale.setScalar(1 + Math.min(1, shot.distance / shot.range) * .32);
      const hit = findUfoForwardScrollFreeShotHit(mission, previous, shot.projectile.position);
      if (hit) {
        resolveUfoForwardScrollShotHit(mission, hit, shot);
        return;
      }
      if (shot.distance >= shot.range) {
        clearUfoForwardScrollShot(mission, shot);
        if (!mission.shots.length) {
          document.body.dataset.ufoForwardScrollLock = "none";
          document.body.dataset.ufoSpaceShooting = "lock-on";
        }
      }
      return;
    }
    const pickup = shot.pickup;
    if (!pickup || pickup.collected) {
      clearUfoForwardScrollShot(mission, shot);
      return;
    }
    const previous = shot.projectile.position.clone();
    const targetDirection = pickup.position.clone().sub(previous);
    const targetDistance = targetDirection.length();
    const contactRadius = pickup.radius + UFO_FORWARD_SCROLL_FREE_SHOT_RADIUS;
    if (targetDistance <= contactRadius) {
      resolveUfoForwardScrollShotHit(mission, pickup, shot);
      return;
    }
    targetDirection.multiplyScalar(1 / targetDistance);
    const steering = 1 - Math.exp(-UFO_FORWARD_SCROLL_MISSILE_TURN_RESPONSE * delta);
    shot.direction.lerp(targetDirection, steering).normalize();
    shot.projectile.position.copy(previous).addScaledVector(
      shot.direction,
      UFO_FORWARD_SCROLL_SHOT_SPEED * delta,
    );
    shot.projectile.scale.setScalar(1 + Math.min(.46, shot.elapsed * .72));
    if (doesUfoForwardScrollShotSegmentHitPickup(
      previous,
      shot.projectile.position,
      pickup,
      contactRadius,
    )) {
      resolveUfoForwardScrollShotHit(mission, pickup, shot);
      return;
    }
    if (shot.elapsed >= (shot.maxLifetime || shot.duration)) {
      clearUfoForwardScrollShot(mission, shot);
    }
  });
}

function isUfoForwardScrollActive(control = ufoDoorControls[0]) {
  return Boolean(
    control?.spaceForwardScroll?.active
    && state.map === "space"
    && state.ufoInSpace,
  );
}

function applyUfoForwardScrollMarsDistanceMode(control, mission, routeMode) {
  const mars = control?.spaceMars;
  if (!control || !mission || !mars) return false;
  const selectedMode = routeMode || UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE;
  const scale = control.scale || BUILDING_SCALE;
  const cruiseDurationSeconds = getUfoForwardScrollCruiseSeconds(selectedMode);
  const routeLength = Math.max(
    1,
    (mission.baseRouteLength || mission.routeLength || 1)
      * getUfoForwardScrollRouteDistanceRatio(selectedMode),
  );
  const cruiseOrigin = mission.entryCraftCenter.clone();
  cruiseOrigin.y += UFO_FORWARD_SCROLL_LAUNCH_CLIMB_WORLD;
  const marsApproachDistance = routeLength
    + (mars.userData.radius || UFO_SPACE_MARS_RADIUS)
    + mission.craftRadius
    + 180;
  const plannedMarsWorld = cruiseOrigin.clone()
    .addScaledVector(mission.forward, marsApproachDistance);
  const plannedMarsLocal = mars.parent
    ? mars.parent.worldToLocal(plannedMarsWorld.clone())
    : plannedMarsWorld;

  // 表示中の火星・大気圏エフェクト・当たり判定が同じ実座標を共有する。
  // ラベルだけを切り替えるのではなく、選ばれた億km距離に比例して
  // 実際のコースを再配置する。
  mars.position.copy(plannedMarsLocal);
  mars.userData.forwardScrollRouteLength = routeLength;
  mars.updateWorldMatrix(true, true);
  mission.routeMode = selectedMode;
  mission.totalDurationSeconds = selectedMode.totalSeconds;
  mission.origin.copy(cruiseOrigin);
  mission.routeLength = routeLength;
  mission.progressDistance = 0;
  mission.cruiseDurationSeconds = cruiseDurationSeconds;
  mission.cruiseWorldSpeed = routeLength / cruiseDurationSeconds;
  mission.cruiseSpeedLocal = mission.cruiseWorldSpeed / scale;
  mission.energyPerWorldUnit = UFO_FORWARD_SCROLL_ENERGY_MAX
    / Math.max(1, routeLength * UFO_FORWARD_SCROLL_BASE_ENERGY_RANGE_RATIO);
  document.body.dataset.ufoForwardScrollRouteLength = routeLength.toFixed(1);
  document.body.dataset.ufoForwardScrollTargetSeconds = String(selectedMode.totalSeconds);
  document.body.dataset.ufoForwardScrollMarsDistanceKm = String(selectedMode.distanceKm);
  document.body.dataset.ufoForwardScrollMarsDistanceMode = selectedMode.id;
  document.body.dataset.ufoForwardScrollExpectedWorldSpeed = mission.cruiseWorldSpeed.toFixed(2);
  return true;
}

function configureUfoForwardScrollCruise(control, mission, craftCenter) {
  if (!control || !mission || !craftCenter || !control.spaceMars) return false;
  const scale = control.scale || BUILDING_SCALE;
  control.spaceMars.updateWorldMatrix(true, true);
  const marsCenter = control.spaceMars.getWorldPosition(new THREE.Vector3());
  const routeLength = Math.max(
    12000,
    marsCenter.clone().sub(craftCenter).dot(mission.forward)
      - (control.spaceMars.userData.radius || UFO_SPACE_MARS_RADIUS)
      - mission.craftRadius
      - 180,
  );
  mission.origin.copy(craftCenter);
  mission.routeLength = routeLength;
  mission.progressDistance = 0;
  mission.cruiseDurationSeconds = Math.max(
    1,
    mission.cruiseDurationSeconds || getUfoForwardScrollCruiseSeconds(mission.routeMode),
  );
  mission.cruiseWorldSpeed = routeLength / mission.cruiseDurationSeconds;
  mission.cruiseSpeedLocal = mission.cruiseWorldSpeed / scale;
  mission.energyPerWorldUnit = UFO_FORWARD_SCROLL_ENERGY_MAX
    / Math.max(1, routeLength * UFO_FORWARD_SCROLL_BASE_ENERGY_RANGE_RATIO);
  document.body.dataset.ufoForwardScrollRouteLength = routeLength.toFixed(1);
  document.body.dataset.ufoForwardScrollExpectedWorldSpeed = mission.cruiseWorldSpeed.toFixed(2);
  return true;
}

function synchronizeUfoForwardScrollCruisePosition(control, mission, craft) {
  if (!control || !mission || !craft || !mission.origin) return null;
  const duration = Math.max(1, mission.cruiseDurationSeconds || UFO_FORWARD_SCROLL_CRUISE_SECONDS);
  const scheduledProgress = clamp(mission.cruiseElapsed / duration, 0, 1) * mission.routeLength;
  craft.updateWorldMatrix(true, true);
  let craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const currentProgress = craftCenter.clone().sub(mission.origin).dot(mission.forward);
  const correction = scheduledProgress - currentProgress;
  // 前進だけは「時間」と「正規の火星までの距離」に同期する。横・上下の
  // 操作は先に通常の物理入力で反映済みなので、ここではその成分に触れない。
  if (Math.abs(correction) > .0001) {
    const correctedWorld = craftCenter.clone().addScaledVector(mission.forward, correction);
    const local = ufoWorldToLocal(control, correctedWorld.x, correctedWorld.z);
    state.ufoFlightX = local.x;
    state.ufoFlightZ = local.z;
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
    craft.updateWorldMatrix(true, true);
    craftCenter = craft.getWorldPosition(new THREE.Vector3());
  }
  return {
    craftCenter,
    scheduledProgress,
    actualProgress: craftCenter.clone().sub(mission.origin).dot(mission.forward),
  };
}

function resetUfoForwardScrollMission(mission) {
  if (!mission) return;
  cancelUfoForwardScrollEnergyEmergencyReturn(mission);
  clearUfoForwardScrollShot(mission);
  resetUfoForwardScrollEnergyStars(mission);
  resetUfoForwardScrollMarsAtmosphereEntry(mission);
  clearUfoForwardScrollRewardFeed();
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.phaseElapsed = 0;
  mission.cruiseElapsed = 0;
  mission.cruiseStartedAt = null;
  mission.cruiseCompletedAt = null;
  mission.progressDistance = 0;
  mission.energy = UFO_FORWARD_SCROLL_START_ENERGY;
  mission.energyEmergencyReturnPending = false;
  mission.coinsCollected = 0;
  mission.materialsCollected = 0;
  mission.energyCollected = 0;
  mission.hazardHits = 0;
  mission.pickupCollisionCount = 0;
  mission.pickupImpactUntil = -Infinity;
  mission.pickupContactCenter?.copy(mission.entryCraftCenter);
  mission.lockedPickup = null;
  resetUfoForwardScrollLockTracking(mission);
  mission.holdFireReadyAt = 0;
  delete document.body.dataset.ufoForwardScrollTapQueue;
  delete document.body.dataset.ufoForwardScrollLowEnergyAlert;
  delete document.body.dataset.ufoEarthDeparture;
  if (mission.lockIndicator) mission.lockIndicator.visible = false;
  mission.group.visible = false;
  if (mission.departureCloudDeck) {
    mission.departureCloudDeck.group.visible = false;
    mission.departureCloudDeck.clouds.forEach(cloud => {
      cloud.material.opacity = 0;
      cloud.mesh.visible = false;
    });
    mission.departureCloudDeck.puffs.forEach(puff => {
      puff.material.opacity = 0;
      puff.mesh.visible = false;
    });
  }
  mission.bursts?.forEach(burst => {
    burst.group.parent?.remove(burst.group);
    burst.glowMaterial?.dispose();
    burst.ringMaterial?.dispose();
  });
  if (mission.bursts) mission.bursts.length = 0;
  mission.pickups.forEach(pickup => {
    pickup.collected = false;
    pickup.hitCount = 0;
    pickup.hitFlashUntil = -Infinity;
    pickup.collisionLatched = false;
  });
  updateUfoForwardScrollFieldMotion(mission);
  refreshUfoForwardScrollPickups(mission);
  [
    "ufoForwardScrollCruiseElapsed",
    "ufoForwardScrollWallElapsed",
    "ufoForwardScrollProgressDistance",
    "ufoForwardScrollActualWorldSpeed",
    "ufoForwardScrollExpectedWorldSpeed",
    "ufoForwardScrollMarsDistanceKm",
    "ufoForwardScrollMarsDistanceMode",
    "ufoForwardScrollRemainingKm",
    "ufoForwardScrollInitialProgress",
    "ufoForwardScrollCompletionSimulationSeconds",
    "ufoForwardScrollCompletionWallSeconds",
    "ufoForwardScrollLock",
    "ufoForwardScrollHitProgress",
    "ufoForwardScrollEnergyStarTargets",
    "ufoForwardScrollPickupCollision",
    "ufoForwardScrollTapQueue",
  ].forEach(key => delete document.body.dataset[key]);
  const overlay = els.spaceTransitionOverlay;
  if (overlay?.classList.contains("is-earth-departure")) {
    overlay.classList.remove("is-active", "is-earth-departure");
  }
}

function resetUfoForwardScrollMarsAtmosphereEntry(mission) {
  const entry = mission?.marsAtmosphereEntry;
  if (!entry) return;
  entry.entered = false;
  entry.elapsed = 0;
  entry.flashElapsed = 0;
  entry.overlayUntil = 0;
  entry.group.visible = false;
  entry.layers.forEach(layer => {
    layer.uniforms.uIntensity.value = 0;
    layer.uniforms.uTime.value = 0;
    layer.mesh.scale.setScalar(1);
  });
  entry.waveMaterial.opacity = 0;
  entry.completionWave.scale.setScalar(1);
  entry.light.intensity = 0;
  const overlay = els.spaceTransitionOverlay;
  if (overlay?.classList.contains("is-mars-atmosphere")) {
    overlay.classList.remove("is-active", "is-mars-atmosphere");
  }
  delete document.body.dataset.ufoMarsAtmosphereEntry;
  delete document.body.dataset.ufoMarsAtmosphereApproach;
  delete document.body.dataset.ufoMarsAtmosphereEntryTest;
}

function triggerUfoForwardScrollMarsAtmosphereEntry(mission) {
  const entry = mission?.marsAtmosphereEntry;
  if (!entry || entry.entered) return;
  entry.entered = true;
  entry.flashElapsed = 0;
  entry.overlayUntil = performance.now() + UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_OVERLAY_SECONDS * 1000;
  entry.group.visible = true;
  document.body.dataset.ufoMarsAtmosphereEntry = "entered";
  setSpaceTransitionMessage(
    "MARS ATMOSPHERE ENTRY",
    "火星大気圏へ突入",
    "火星と同じ進行ラインに到達しました。機体は火星の大気層へ入ります。",
  );
  els.spaceTransitionOverlay?.classList.add("is-mars-atmosphere", "is-active");
}

function updateUfoForwardScrollMarsAtmosphereEntry(mission, delta) {
  const entry = mission?.marsAtmosphereEntry;
  if (!entry || !mission.routeLength) return;
  const progress = clamp(mission.progressDistance / mission.routeLength, 0, 1);
  const approach = THREE.MathUtils.smoothstep(progress, entry.approachStart, 1);
  if (!entry.entered && approach <= .0001) {
    entry.group.visible = false;
    return;
  }
  entry.group.visible = true;
  entry.elapsed += delta;
  if (entry.entered) entry.flashElapsed += delta;
  const flash = entry.entered
    ? Math.max(0, 1 - entry.flashElapsed / UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_FLASH_SECONDS)
    : 0;
  const intensity = clamp(.06 + approach * .72 + flash * .46, 0, 1);
  entry.layers.forEach((layer, index) => {
    const breathing = 1 + Math.sin(entry.elapsed * (1.25 + index * .16) + index) * .012;
    layer.uniforms.uIntensity.value = intensity * layer.baseIntensity;
    layer.uniforms.uTime.value = entry.elapsed;
    layer.mesh.scale.setScalar(breathing + flash * (.024 + index * .008));
  });
  entry.completionWave.rotation.z += delta * (.34 + flash * 1.7);
  entry.completionWave.scale.setScalar(1 + flash * (1.9 - flash * .8));
  entry.waveMaterial.opacity = flash * .78;
  entry.light.intensity = intensity * (1.1 + flash * 2.3);
  document.body.dataset.ufoMarsAtmosphereApproach = approach.toFixed(3);
  if (entry.entered && entry.overlayUntil && performance.now() >= entry.overlayUntil) {
    const overlay = els.spaceTransitionOverlay;
    if (overlay?.classList.contains("is-mars-atmosphere")) {
      overlay.classList.remove("is-active", "is-mars-atmosphere");
    }
    entry.overlayUntil = 0;
  }
}

function hideLegacyUfoSpaceMissionVisuals(control) {
  if (control?.spaceDust) control.spaceDust.visible = false;
  if (control?.spaceCombat?.group) control.spaceCombat.group.visible = false;
  [
    control?.spaceStarMining,
    control?.spacePinball,
    control?.spaceSalvage,
    control?.spaceBowling,
    control?.spaceRingBattle,
    control?.spaceCranePort,
    control?.spaceGravityMaze,
    control?.spaceInertiaSlingshot,
    control?.spaceSolarSail,
    control?.spaceMarsRace,
  ].forEach(mission => {
    if (!mission) return;
    mission.active = false;
    if (mission.group) mission.group.visible = false;
  });
  if (control?.spaceRescue) {
    control.spaceRescue.phase = "idle";
    control.spaceRescue.tethered = false;
    if (control.spaceRescue.group) control.spaceRescue.group.visible = false;
  }
}

function updateUfoForwardScrollAimReticlePosition(mission) {
  const reticle = els.ufoSpaceReticle;
  const aimScreen = updateUfoForwardScrollAimScreenPoint(mission);
  if (!reticle || !aimScreen) return;
  reticle.style.left = `${aimScreen.leftPercent.toFixed(2)}%`;
  reticle.style.top = `${aimScreen.topPercent.toFixed(2)}%`;
  reticle.style.setProperty("--ufo-reticle-scale", String(getUfoEquipmentLockOnReticleMultiplier()));
}

function setUfoSpaceReturnButtonVisible(visible) {
  if (!els.ufoSpaceReturnButton) return;
  els.ufoSpaceReturnButton.hidden = !visible;
  els.ufoSpaceReturnButton.disabled = !visible;
}

function formatUfoForwardScrollMarsDistance(distanceKm) {
  const okuKm = Math.max(0, distanceKm) / 100_000_000;
  return `${okuKm.toFixed(2).replace(/\.?0+$/, "")}億km`;
}

function updateUfoForwardScrollHud() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceForwardScroll;
  const visible = Boolean(
    mission?.active
    && state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready",
  );
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) {
    setUfoSpaceReturnButtonVisible(false);
    if (els.ufoSpaceReticle) {
      els.ufoSpaceReticle.hidden = true;
      delete els.ufoSpaceReticle.dataset.lock;
      delete els.ufoSpaceReticle.dataset.firing;
      els.ufoSpaceReticle.style.removeProperty("color");
      els.ufoSpaceReticle.style.removeProperty("left");
      els.ufoSpaceReticle.style.removeProperty("top");
      els.ufoSpaceReticle.style.removeProperty("--ufo-reticle-scale");
    }
    return;
  }
  const progress = clamp(mission.progressDistance / Math.max(1, mission.routeLength), 0, 1);
  const routeMode = mission.routeMode || UFO_FORWARD_SCROLL_DEFAULT_MARS_DISTANCE_MODE;
  const remainingDistanceKm = routeMode.distanceKm * (1 - progress);
  document.body.dataset.ufoForwardScrollRemainingKm = String(Math.round(remainingDistanceKm));
  const activeShots = mission.shots || [];
  const activeLockedShot = activeShots.find(shot => shot.mode === "locked" && !shot.pickup?.collected);
  const lockedPickup = mission.lockedPickup || activeLockedShot?.pickup || null;
  const lockedHitLabel = lockedPickup
    ? `${lockedPickup.hitCount}/${lockedPickup.hitsRequired}発`
    : "";
  const pickupImpactActive = mission.elapsed < (mission.pickupImpactUntil || -Infinity);
  const energyReturnPending = mission.phase === "empty" && mission.energyEmergencyReturnPending;
  const phaseLabel = pickupImpactActive
    ? `資源星に衝突：航行エネルギー -${UFO_FORWARD_SCROLL_PICKUP_CONTACT_ENERGY_DAMAGE}`
    : mission.phase === "launch"
    ? "大気圏離脱"
    : mission.phase === "playing"
      ? activeShots.length
        ? activeLockedShot
          ? `${lockedPickup?.type.label || "資源星"}へ${activeShots.length}発射撃中 ${lockedHitLabel}`
          : `前方へ${activeShots.length}発射撃中`
        : lockedPickup
          ? `LOCK ON：${lockedPickup.type.label} ${lockedHitLabel}`
          : "資源星を探索中"
      : mission.phase === "complete"
        ? "火星到着"
        : mission.phase === "empty"
          ? energyReturnPending
            ? "緊急帰還中"
            : "エネルギー切れ"
          : "待機";
  setUfoSpaceHudLabels({ title: "地球→火星 航行", first: "宇宙金貨", second: "素材", third: "火星まであと" });
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = String(state.ufoResources.spaceCoins);
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = String(state.ufoResources.starMaterials);
  if (els.ufoSpaceThreatCount) {
    els.ufoSpaceThreatCount.textContent = formatUfoForwardScrollMarsDistance(remainingDistanceKm);
  }
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "launch"
      ? "地球の大気圏を離脱しています。まもなく火星航路へ入ります。"
      : mission.phase === "playing"
        ? lockedPickup
          ? `${lockedPickup.type.label}をロックON中。${lockedHitLabel}命中済みで、残り${Math.max(0, lockedPickup.hitsRequired - lockedPickup.hitCount)}発で報酬を獲得します。`
          : "大型の青いエネルギー星、金色の宇宙金貨星、紫色の素材星を照準内でロックONできます。各星は追尾ミサイルを3発命中させると回収できます。"
        : mission.phase === "complete"
          ? "火星に到着しました。地球から再出発して、別の回収ルートを走れます。"
          : energyReturnPending
            ? "エネルギー切れのため緊急帰還します"
            : "エネルギーが尽きました。地球から再出発して、大型の青いエネルギー星を3発で破壊してください。";
  }
  const canRestart = ["complete", "empty"].includes(mission.phase) && !energyReturnPending;
  if (els.ufoSpaceStartButton) {
    els.ufoSpaceStartButton.hidden = !canRestart;
    els.ufoSpaceStartButton.disabled = !canRestart;
    els.ufoSpaceStartButton.textContent = "地球から再出発";
    els.ufoSpaceStartButton.setAttribute("aria-label", "地球から火星航路を再出発する");
  }
  setUfoSpaceReturnButtonVisible(canRestart);
  if (els.ufoSpaceFireButton) {
    const canShoot = mission.phase === "playing";
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canShoot;
    els.ufoSpaceFireButton.textContent = mission.lockedPickup
      ? `追尾ミサイル ${mission.lockedPickup.hitCount}/${mission.lockedPickup.hitsRequired}`
      : "射撃";
    els.ufoSpaceFireButton.setAttribute(
      "aria-label",
      canShoot
        ? mission.lockedPickup
          ? `ロックした資源星へ${mission.lockedPickup.hitCount + 1}発目の追尾ミサイルを撃つ`
          : "UFOのノーズ方向へ回収パルスを射撃する"
        : "現在は射撃できません",
    );
  }
  if (els.ufoSpaceReticle) {
    const reticleVisible = mission.phase === "playing";
    els.ufoSpaceReticle.hidden = !reticleVisible;
    if (reticleVisible) {
      updateUfoForwardScrollAimReticlePosition(mission);
      const locked = Boolean(lockedPickup && !lockedPickup.collected);
      const reticleColor = locked && Number.isFinite(lockedPickup.type?.color)
        ? lockedPickup.type.color
        : 0xc7fffb;
      els.ufoSpaceReticle.style.color = `#${reticleColor.toString(16).padStart(6, "0")}`;
      els.ufoSpaceReticle.dataset.lock = String(locked);
      els.ufoSpaceReticle.dataset.firing = String(activeShots.length > 0);
    } else {
      els.ufoSpaceReticle.style.removeProperty("left");
      els.ufoSpaceReticle.style.removeProperty("top");
      els.ufoSpaceReticle.style.removeProperty("--ufo-reticle-scale");
    }
  }
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
    els.ufoSpaceCombat.dataset.hit = String(activeShots.length > 0 || pickupImpactActive);
  }
}

function isUfoForwardScrollLowEnergyAlert(mission = ufoDoorControls[0]?.spaceForwardScroll) {
  return Boolean(
    mission?.active
    && mission.energySystemEnabled
    && mission.energy < UFO_FORWARD_SCROLL_LOW_ENERGY_THRESHOLD
    && mission.phase !== "complete"
    && state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready",
  );
}

function updateUfoForwardScrollLowEnergyAlert(control, mission) {
  const active = isUfoForwardScrollLowEnergyAlert(mission);
  if (control?.cabinLights && state.ufoBoarded && state.ufoEngineMode === "ready") {
    // 暗い拍でも完全消灯にはしない。操縦席と白ミチロードセイバーレンの
    // 輪郭を残しつつ、残量不足をはっきり伝える暖色の点滅にする。
    const blinkOn = !active || Math.sin(
      (mission?.elapsed || 0) * Math.PI * 2 * UFO_FORWARD_SCROLL_LOW_ENERGY_BLINK_HZ,
    ) >= 0;
    setUfoCabinLightAmount(
      control,
      blinkOn ? 1 : UFO_FORWARD_SCROLL_LOW_ENERGY_DIM_LIGHT_AMOUNT,
    );
  }
  document.body.dataset.ufoForwardScrollLowEnergyAlert = active ? "true" : "false";
  return active;
}

function cancelUfoForwardScrollEnergyEmergencyReturn(mission = ufoDoorControls[0]?.spaceForwardScroll) {
  if (ufoForwardScrollEnergyReturnTimer !== null) {
    window.clearTimeout(ufoForwardScrollEnergyReturnTimer);
    ufoForwardScrollEnergyReturnTimer = null;
  }
  if (mission) mission.energyEmergencyReturnPending = false;
  const overlay = els.spaceTransitionOverlay;
  if (overlay?.classList.contains("is-energy-empty")) {
    overlay.classList.remove("is-active", "is-energy-empty");
  }
}

function triggerUfoForwardScrollEnergyEmergencyReturn(control, mission) {
  if (!mission
    || mission.energyEmergencyReturnPending
    || state.map !== "space"
    || !state.ufoInSpace) return false;

  mission.energyEmergencyReturnPending = true;
  clearUfoForwardScrollShot(mission);
  keys.clear();
  touchVector.set(0, 0);
  resetUfoFlightHoldAcceleration();
  ufoFlightPointerInput.forward = 0;
  ufoFlightPointerInput.turn = 0;
  ufoFlightPointerInput.lift = 0;
  ufoFlightPointerInput.strafe = 0;
  if (control?.flight) {
    control.flight.inertialStrafeVelocity = 0;
    control.flight.inertialLiftVelocity = 0;
  }
  setSpaceTransitionMessage(
    "ENERGY EMPTY",
    "エネルギー切れのため緊急帰還します",
    "雲マップへ帰還します。",
  );
  els.spaceTransitionOverlay?.classList.remove("is-earth-departure", "is-mars-atmosphere");
  els.spaceTransitionOverlay?.classList.add("is-energy-empty", "is-active");
  showToast("エネルギー切れのため緊急帰還します");
  ufoForwardScrollEnergyReturnTimer = window.setTimeout(() => {
    ufoForwardScrollEnergyReturnTimer = null;
    if (state.map === "space"
      && state.ufoInSpace
      && ufoDoorControls[0] === control
      && mission.active
      && mission.phase === "empty"
      && mission.energyEmergencyReturnPending) {
      emergencyEscape();
    }
  }, UFO_FORWARD_SCROLL_ENERGY_EMPTY_RETURN_DELAY * 1000);
  return true;
}

function updateUfoForwardScrollEnergyHud() {
  const mission = ufoDoorControls[0]?.spaceForwardScroll;
  const visible = Boolean(
    mission?.active
    && state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready",
  );
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const percentage = clamp(mission.energy / Math.max(1, mission.maxEnergy) * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "航行エネルギー";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${Math.ceil(mission.energy)}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percentage}%`;
  if (els.ufoSpaceLifeNote) {
    const energyReturnPending = mission.phase === "empty" && mission.energyEmergencyReturnPending;
    els.ufoSpaceLifeNote.textContent = mission.phase === "complete"
      ? "火星到着。回収した素材は空マップの整備に使えるよう保存されます。"
      : mission.phase === "empty"
        ? energyReturnPending
          ? "エネルギー切れのため緊急帰還します"
          : "エネルギー切れ。大型の青いエネルギー星を3発で破壊して回復します。"
        : "前進・左右・上下の実移動距離に応じて消費。大型の青いエネルギー星を3発で破壊すると航行エネルギーが10回復します。";
  }
  els.ufoSpaceLife.dataset.danger = String(
    (percentage <= 22 && mission.phase === "playing") || mission.energyEmergencyReturnPending,
  );
}

function refreshUfoForwardScrollHud() {
  updateUfoForwardScrollEnergyHud();
  updateUfoForwardScrollHud();
}

function activateUfoForwardScrollMission(control, { testMode = false, silent = false } = {}) {
  const mission = control?.spaceForwardScroll;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !control?.craftAssembly) return false;
  hideLegacyUfoSpaceMissionVisuals(control);
  const rerollRoute = mission.hasStarted === true;
  const routeSeed = rerollRoute ? nextUfoSpaceRouteSeed() : mission.routeSeed;
  const routeMode = getUfoForwardScrollMarsDistanceMode(routeSeed);
  resetUfoForwardScrollMission(mission);
  applyUfoForwardScrollMarsDistanceMode(control, mission, routeMode);
  if (rerollRoute) {
    rerollUfoForwardScrollPickupRoute(mission, routeSeed);
    rerollUfoForwardScrollEnergyStarCandidates(mission, routeSeed);
    control.spaceRouteSeed = routeSeed;
  }
  mission.hasStarted = true;
  state.ufoFlightX = mission.entryFlight.x;
  state.ufoFlightY = mission.entryFlight.y;
  state.ufoFlightZ = mission.entryFlight.z;
  state.ufoFlightHeading = mission.courseHeading;
  state.ufoFlightBasePitch = 0;
  state.ufoFlightBaseRoll = 0;
  state.ufoFlightPitch = 0;
  state.ufoFlightRoll = 0;
  state.ufoFlightDirectionalYaw = 0;
  state.ufoFlightRockBlend = 0;
  state.ufoFlightWarningRockBlend = 0;
  if (control.flight) {
    control.flight.inertialStrafeVelocity = 0;
    control.flight.inertialLiftVelocity = 0;
  }
  mission.active = true;
  mission.phase = "launch";
  mission.testMode = testMode;
  mission.energySystemEnabled = true;
  mission.marsAtmospherePreviewTest = testMode
    && new URLSearchParams(location.search).get("ufoMarsAtmosphereEntryTest") === "1";
  if (mission.marsAtmospherePreviewTest) mission.energySystemEnabled = false;
  mission.group.visible = true;
  mission.lastCraftCenter.copy(mission.entryCraftCenter);
  if (control.spaceMars) {
    control.spaceMars.position.y = mission.origin.y;
    control.spaceMars.visible = true;
  }
  if (control.spaceEarth) {
    // 発進時は地球の白雲の直上から始める。地球そのものを離陸演出の間に
    // 実座標で遠ざけるため、別の雲や画面用の飾りは使わない。
    const earthLaunchNormal = mission.forward.clone()
      .multiplyScalar(UFO_FORWARD_SCROLL_DEPARTURE_EARTH_FORWARD_OFFSET)
      .addScaledVector(mission.up, UFO_FORWARD_SCROLL_DEPARTURE_EARTH_UP_OFFSET)
      .normalize();
    const launchCloudRadius = UFO_SPACE_EARTH_RADIUS * 1.011;
    mission.earthDepartureStartCenter = mission.entryCraftCenter.clone()
      .addScaledVector(earthLaunchNormal, -(launchCloudRadius + 34));
    mission.earthDepartureEndCenter = mission.entryCraftCenter.clone()
      .addScaledVector(mission.forward, -UFO_FORWARD_SCROLL_DEPARTURE_EARTH_FORWARD_OFFSET)
      .addScaledVector(mission.up, -UFO_FORWARD_SCROLL_DEPARTURE_EARTH_UP_OFFSET);
    mission.earthDepartureLaunchNormal = earthLaunchNormal;
    control.spaceEarth.visible = true;
    control.spaceEarth.position.copy(mission.earthDepartureStartCenter);
    alignSpaceEarthCloudLayerToLaunch(control.spaceEarth, earthLaunchNormal);
    control.spaceEarth.userData.departureActive = true;
    control.spaceEarth.userData.departureProgress = 0;
  }
  prepareUfoForwardScrollEarthDepartureVisuals(mission, control.spaceEarth);
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceMission = "earth-mars-forward-scroll";
  document.body.dataset.ufoForwardScroll = "launch";
  document.body.dataset.ufoForwardScrollRouteLength = mission.routeLength.toFixed(1);
  document.body.dataset.ufoForwardScrollRouteSeed = String(mission.routeSeed >>> 0);
  document.body.dataset.ufoForwardScrollTargetSeconds = String(mission.totalDurationSeconds);
  document.body.dataset.ufoForwardScrollMarsDistanceKm = String(mission.routeMode.distanceKm);
  document.body.dataset.ufoForwardScrollMarsDistanceMode = mission.routeMode.id;
  document.body.dataset.ufoForwardScrollExpectedWorldSpeed = mission.cruiseWorldSpeed.toFixed(2);
  document.body.dataset.ufoForwardScrollEnergy = mission.energy.toFixed(2);
  document.body.dataset.ufoSpaceShooting = "lock-on";
  setUfoSpaceControlLabels("高速火星航行", "自動前進・G軌道補正・近距離ロック射撃");
  setSpaceTransitionMessage(
    "EARTH ATMOSPHERE EXIT",
    "地球大気圏を離脱",
    "空マップの雲海を抜けて上昇し、火星航路へ加速します。",
  );
  els.spaceTransitionOverlay?.classList.remove("is-mars-atmosphere");
  els.spaceTransitionOverlay?.classList.add("is-earth-departure", "is-active");
  updateUfoForwardScrollLowEnergyAlert(control, mission);
  refreshUfoForwardScrollHud();
  updateUfoControls();
  if (!silent) showToast("地球大気圏を離脱。高速火星航行テストを開始します");
  return true;
}

function triggerUfoForwardScrollHazard(mission, pickup) {
  mission.hazardHits += 1;
  mission.energy = Math.max(0, mission.energy - UFO_FORWARD_SCROLL_HAZARD_ENERGY_DAMAGE);
  spawnUfoForwardScrollHazardBurst(mission, pickup.position);
  // There is no crafted enhancement in the first playable run. Once the
  // coin booster has been fitted at the future workshop, an incorrect mining
  // hit disables that equipment and requires materials to restore it.
  const damagedCoinBooster = state.ufoEquipment.coinGainMultiplier > 1;
  if (damagedCoinBooster) {
    state.ufoEquipment.coinGainMultiplier = 1;
    state.ufoEquipment.coinGainDamaged = true;
  }
  document.body.dataset.ufoForwardScrollLastPickup = "unstable";
  document.body.dataset.ufoForwardScrollEnergy = mission.energy.toFixed(2);
  document.body.dataset.ufoForwardScrollHazards = String(mission.hazardHits);
  if (!mission.testMode && damagedCoinBooster) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(worldStateSnapshot()));
    state.saved = true;
    if (els.saveState) els.saveState.textContent = "保存済み";
  }
  showToast(damagedCoinBooster
    ? "不安定星が崩壊。航行エネルギー -42、宇宙金貨ブースターが損傷しました"
    : "不安定星が崩壊。航行エネルギー -42");
}

function collectUfoForwardScrollPickup(mission, pickup) {
  if (!mission || !pickup || pickup.collected) return;
  pickup.collected = true;
  setUfoForwardScrollPickupVisible(mission, pickup, false);
  markUfoForwardScrollPickupRenderDirty(mission, pickup);
  let reward;
  if (pickup.typeId === "energy") {
    const gain = Math.max(1, Math.round(
      pickup.type.reward * getUfoEquipmentEnergyAbsorptionMultiplier(),
    ));
    mission.energy = Math.min(mission.maxEnergy, mission.energy + gain);
    mission.energyCollected += gain;
    state.ufoResources.energyCells += 1;
    reward = `エネルギー +${gain}`;
  } else if (pickup.typeId === "coin") {
    const gain = Math.max(1, Math.round(pickup.type.reward * state.ufoEquipment.coinGainMultiplier));
    mission.coinsCollected += gain;
    state.ufoResources.spaceCoins += gain;
    reward = `宇宙金貨 +${gain}`;
  } else {
    mission.materialsCollected += pickup.type.reward;
    state.ufoResources.starMaterials += pickup.type.reward;
    reward = `素材 +${pickup.type.reward}`;
  }
  showUfoForwardScrollReward(pickup.typeId, reward);
  document.body.dataset.ufoForwardScrollLastPickup = pickup.typeId;
  document.body.dataset.ufoForwardScrollEnergy = mission.energy.toFixed(2);
  // Resource acquisition is saved without forcing the player-facing save toast.
  // The dedicated URL-driven development route must never add test rewards to
  // the user's real save data.
  if (!mission.testMode) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(worldStateSnapshot()));
    state.saved = true;
    if (els.saveState) els.saveState.textContent = "保存済み";
  }
  if (mission.elapsed - mission.lastRewardToastAt >= .9) {
    showToast(`${pickup.type.label}を回収：${reward}`);
    mission.lastRewardToastAt = mission.elapsed;
  }
}

function resolveUfoForwardScrollPickupContact(control, mission, craftCenter) {
  if (!control?.craftAssembly || !mission || !craftCenter) return craftCenter;
  const previousCenter = mission.pickupContactCenter
    || (mission.pickupContactCenter = craftCenter.clone());
  const targets = getUfoForwardScrollTargets(mission);
  let contact = null;
  let bestDistanceSquared = Infinity;

  targets.forEach(pickup => {
    if (!pickup || pickup.collected) return;
    const minimumDistance = Math.max(1, mission.craftRadius + (pickup.radius || pickup.size || 0));
    const currentDistanceSquared = craftCenter.distanceToSquared(pickup.position);
    const sweptDistanceSquared = pointToSegmentDistanceSquared(
      pickup.position,
      previousCenter,
      craftCenter,
    );
    const releaseDistance = minimumDistance + UFO_FORWARD_SCROLL_PICKUP_CONTACT_RELEASE_MARGIN;
    if (currentDistanceSquared > releaseDistance * releaseDistance) {
      pickup.collisionLatched = false;
    }
    if (pickup.collisionLatched
      || sweptDistanceSquared > minimumDistance * minimumDistance) return;
    if (sweptDistanceSquared >= bestDistanceSquared) return;
    bestDistanceSquared = sweptDistanceSquared;
    contact = { pickup, minimumDistance, currentDistanceSquared };
  });

  if (!contact) {
    previousCenter.copy(craftCenter);
    return craftCenter;
  }

  const { pickup, minimumDistance, currentDistanceSquared } = contact;
  const separation = craftCenter.clone().sub(pickup.position);
  if (separation.lengthSq() <= 1e-8) {
    separation.copy(craftCenter).sub(previousCenter);
  }
  // 前進スクロールの到達時間は変えず、横・上下だけへ衝撃を逃がす。
  // 正面衝突で横成分がゼロの時も、左右交互の退避方向を必ず与える。
  separation.addScaledVector(mission.forward, -separation.dot(mission.forward));
  if (separation.lengthSq() <= 1e-8) {
    separation.copy(mission.right);
    if ((mission.pickupCollisionCount || 0) % 2) separation.multiplyScalar(-1);
    separation.addScaledVector(mission.up, .32);
  }
  separation.normalize();

  const currentDistance = Math.sqrt(Math.max(0, currentDistanceSquared));
  const penetration = Math.max(0, minimumDistance - currentDistance);
  const recoilDistance = Math.min(
    UFO_FORWARD_SCROLL_PICKUP_CONTACT_MAX_RECOIL,
    Math.max(UFO_FORWARD_SCROLL_PICKUP_CONTACT_SKIN, penetration + UFO_FORWARD_SCROLL_PICKUP_CONTACT_SKIN),
  );
  const pushedWorld = craftCenter.clone().addScaledVector(separation, recoilDistance);
  const local = ufoWorldToLocal(control, pushedWorld.x, pushedWorld.z);
  const scale = control.scale || BUILDING_SCALE;
  state.ufoFlightX = local.x;
  state.ufoFlightZ = local.z;
  state.ufoFlightY = control.craftWorldAnchored
    ? clampUfoSpaceFlightY((pushedWorld.y - (control.originY || 0)) / scale)
    : clampUfoSpaceFlightY(pushedWorld.y);

  const courseRight = new THREE.Vector3(-mission.forward.z, 0, mission.forward.x).normalize();
  const flight = control.flight;
  if (flight) {
    const strafeImpulse = separation.dot(courseRight) * UFO_FORWARD_SCROLL_STRAFE_SPEED * .68;
    const liftImpulse = separation.dot(mission.up) * UFO_FORWARD_SCROLL_LIFT_SPEED * .68;
    flight.inertialStrafeVelocity = clamp(
      (flight.inertialStrafeVelocity || 0) + strafeImpulse,
      -UFO_FORWARD_SCROLL_STRAFE_SPEED * 1.7,
      UFO_FORWARD_SCROLL_STRAFE_SPEED * 1.7,
    );
    flight.inertialLiftVelocity = clamp(
      (flight.inertialLiftVelocity || 0) + liftImpulse,
      -UFO_FORWARD_SCROLL_LIFT_SPEED * 1.7,
      UFO_FORWARD_SCROLL_LIFT_SPEED * 1.7,
    );
  }
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  control.craftAssembly.updateWorldMatrix(true, true);
  const resolvedCenter = control.craftAssembly.getWorldPosition(new THREE.Vector3());

  pickup.collisionLatched = true;
  pickup.hitFlashUntil = mission.elapsed + .34;
  mission.pickupCollisionCount = (mission.pickupCollisionCount || 0) + 1;
  mission.pickupImpactUntil = mission.elapsed + .5;
  mission.energy = Math.max(0, mission.energy - UFO_FORWARD_SCROLL_PICKUP_CONTACT_ENERGY_DAMAGE);
  mission.lastCraftCenter.copy(resolvedCenter);
  previousCenter.copy(resolvedCenter);
  spawnUfoForwardScrollPickupHitBurst(mission, pickup);
  document.body.dataset.ufoForwardScrollEnergy = mission.energy.toFixed(2);
  document.body.dataset.ufoForwardScrollPickupCollision = String(mission.pickupCollisionCount);
  showToast(`${pickup.type.label}に衝突：航行エネルギー -${UFO_FORWARD_SCROLL_PICKUP_CONTACT_ENERGY_DAMAGE}`);
  return resolvedCenter;
}

function updateUfoForwardScrollMission(delta) {
  const control = ufoDoorControls[0];
  const mission = control?.spaceForwardScroll;
  const craft = control?.craftAssembly;
  if (!mission?.active || !craft || state.map !== "space" || !state.ufoInSpace) return;
  const frameDelta = Math.min(.05, Math.max(0, delta || 0));
  mission.elapsed += frameDelta;
  mission.phaseElapsed += frameDelta;
  if (mission.phase === "launch") {
    const progress = clamp(mission.phaseElapsed / UFO_FORWARD_SCROLL_LAUNCH_SECONDS, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    if (control.spaceEarth) {
      control.spaceEarth.userData.departureActive = true;
      control.spaceEarth.userData.departureProgress = progress;
    }
    updateUfoForwardScrollEarthDepartureVisuals(mission, control.spaceEarth, progress);
    document.body.dataset.ufoEarthDeparture = progress.toFixed(3);
    state.ufoFlightY = THREE.MathUtils.lerp(
      mission.entryFlight.y,
      mission.cruiseFlightY,
      eased,
    );
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
    if (progress >= 1) {
      mission.phase = "playing";
      mission.phaseElapsed = 0;
      mission.cruiseElapsed = 0;
      finishUfoForwardScrollEarthDepartureVisuals(mission, control.spaceEarth);
      control.spaceEarth.visible = false;
      control.spaceEarth.userData.departureActive = false;
      craft.updateWorldMatrix(true, true);
      mission.lastCraftCenter.copy(craft.getWorldPosition(new THREE.Vector3()));
      mission.pickupContactCenter.copy(mission.lastCraftCenter);
      configureUfoForwardScrollCruise(control, mission, mission.lastCraftCenter);
      mission.cruiseStartedAt = performance.now();
      if (mission.marsAtmospherePreviewTest) {
        // 開発確認時だけ、通常の180秒航路を最後の大気圏接近へ短縮して
        // 見られるようにする。本番の到達時間・位置・判定には一切使わない。
        mission.cruiseStartedAt -= Math.max(
          0,
          mission.cruiseDurationSeconds - UFO_FORWARD_SCROLL_MARS_ATMOSPHERE_PREVIEW_SECONDS,
        ) * 1000;
        document.body.dataset.ufoMarsAtmosphereEntryTest = "approach";
      }
      document.body.dataset.ufoForwardScrollInitialProgress = mission.progressDistance.toFixed(2);
      els.spaceTransitionOverlay?.classList.remove("is-active", "is-earth-departure");
      delete document.body.dataset.ufoEarthDeparture;
      document.body.dataset.ufoForwardScroll = "playing";
      showToast("火星航路開始。大型の青いエネルギー星、金色の宇宙金貨星、紫色の素材星を照準に入れ、追尾ミサイル3発で回収してください");
    }
    updateUfoForwardScrollLowEnergyAlert(control, mission);
    refreshUfoForwardScrollHud();
    return;
  }

  if (mission.phase === "playing") {
    if (mission.cruiseStartedAt === null) mission.cruiseStartedAt = performance.now();
    mission.cruiseElapsed = clamp(
      (performance.now() - mission.cruiseStartedAt) / 1000,
      0,
      mission.cruiseDurationSeconds || UFO_FORWARD_SCROLL_CRUISE_SECONDS,
    );
    const synchronized = synchronizeUfoForwardScrollCruisePosition(control, mission, craft);
    let craftCenter = synchronized?.craftCenter || craft.getWorldPosition(new THREE.Vector3());
    if (mission.collectiblesEnabled) {
      updateUfoForwardScrollFieldMotion(mission, craftCenter);
      syncUfoForwardScrollEnergyStars(control, mission, craftCenter);
      updateUfoForwardScrollBursts(mission, frameDelta);
      updateUfoForwardScrollShot(mission, frameDelta);
      updateUfoForwardScrollLockOn(control, mission, craftCenter, frameDelta);
    }
    const movedDistance = craftCenter.distanceTo(mission.lastCraftCenter);
    if (mission.energySystemEnabled && movedDistance > 1e-4) {
      mission.energy = Math.max(0, mission.energy - movedDistance * mission.energyPerWorldUnit);
      mission.lastCraftCenter.copy(craftCenter);
      document.body.dataset.ufoForwardScrollEnergy = mission.energy.toFixed(2);
    } else {
      mission.lastCraftCenter.copy(craftCenter);
    }
    if (mission.collectiblesEnabled) {
      craftCenter = resolveUfoForwardScrollPickupContact(control, mission, craftCenter);
    }
    mission.progressDistance = clamp(
      synchronized?.actualProgress ?? craftCenter.clone().sub(mission.origin).dot(mission.forward),
      0,
      mission.routeLength,
    );
    const wallElapsed = mission.cruiseElapsed;
    const actualWorldSpeed = mission.progressDistance / Math.max(.001, wallElapsed);
    document.body.dataset.ufoForwardScrollCruiseElapsed = mission.cruiseElapsed.toFixed(3);
    document.body.dataset.ufoForwardScrollWallElapsed = wallElapsed.toFixed(3);
    document.body.dataset.ufoForwardScrollProgressDistance = mission.progressDistance.toFixed(2);
    document.body.dataset.ufoForwardScrollActualWorldSpeed = actualWorldSpeed.toFixed(2);
    updateUfoForwardScrollMarsAtmosphereEntry(mission, frameDelta);
    // 接触や通過だけでは資源を取得しない。近距離でのロックON後、ユーザーが
    // 射撃したパルスだけが星を破壊して報酬を発生させる。
    if (mission.energySystemEnabled && mission.energy <= 0) {
      mission.energy = 0;
      mission.phase = "empty";
      document.body.dataset.ufoForwardScroll = "empty";
      mission.lockedPickup = null;
      resetUfoForwardScrollLockTracking(mission);
      if (mission.lockIndicator) mission.lockIndicator.visible = false;
      triggerUfoForwardScrollEnergyEmergencyReturn(control, mission);
    } else if (mission.cruiseElapsed >= mission.cruiseDurationSeconds) {
      mission.phase = "complete";
      mission.cruiseCompletedAt = performance.now();
      document.body.dataset.ufoForwardScroll = "complete";
      document.body.dataset.ufoForwardScrollCompletionSimulationSeconds = mission.cruiseElapsed.toFixed(3);
      document.body.dataset.ufoForwardScrollCompletionWallSeconds = (
        Math.max(0, (mission.cruiseCompletedAt - (mission.cruiseStartedAt || mission.cruiseCompletedAt)) / 1000)
      ).toFixed(3);
      clearUfoForwardScrollShot(mission);
      mission.lockedPickup = null;
      resetUfoForwardScrollLockTracking(mission);
      if (mission.lockIndicator) mission.lockIndicator.visible = false;
      triggerUfoForwardScrollMarsAtmosphereEntry(mission);
      if (mission.marsAtmospherePreviewTest) {
        document.body.dataset.ufoMarsAtmosphereEntryTest = "complete";
      }
      showToast("火星に到着しました。回収した素材は空マップのUFO整備へ使えるよう保存されています");
    }
    // 長押しだけは一定間隔の連射にする。手動入力はkeydown時に即時発射済みで、
    // ここでは予約弾や待機中の入力を処理しない。
    if (mission.phase === "playing" && mission.energy > 0
      && keys.has(" ") && mission.elapsed >= (mission.holdFireReadyAt || 0)) {
      fireUfoForwardScrollLockOn({ silent: true });
    }
  }
  if (mission.collectiblesEnabled && mission.phase !== "playing") {
    updateUfoForwardScrollBursts(mission, frameDelta);
    if (mission.lockIndicator) mission.lockIndicator.visible = false;
  }
  if (mission.phase !== "playing") {
    updateUfoForwardScrollMarsAtmosphereEntry(mission, frameDelta);
  }
  updateUfoForwardScrollLowEnergyAlert(control, mission);
  refreshUfoForwardScrollHud();
}

function makeLegacySpaceDustStream(earth, mars, control) {
  const group = new THREE.Group();
  group.name = "space-dust-stream-mars-to-earth";
  const start = mars.getWorldPosition(new THREE.Vector3());
  const end = earth.getWorldPosition(new THREE.Vector3());
  const path = end.clone().sub(start);
  const length = Math.max(1, path.length());
  const direction = path.normalize();
  const reference = Math.abs(direction.y) < .8
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const side = direction.clone().cross(reference).normalize();
  const vertical = side.clone().cross(direction).normalize();
  // チリの流れは一本の細い帯ではなく、火星から地球へ広がる3Dの流れにする。
  // side / vertical は経路に直交するため、同じ高さ・同じ横幅へ固まり続けない。
  const spreadSide = 5000;
  const spreadVertical = 3600;
  const craftCenter = control?.craftAssembly?.getWorldPosition(new THREE.Vector3()) || null;
  const craftPath = craftCenter?.clone().sub(start) || null;
  const craftDistance = craftPath && craftPath.lengthSq() > 1e-8
    ? craftPath.length()
    : length;
  const directDirection = craftPath && craftPath.lengthSq() > 1e-8
    ? craftPath.normalize()
    : direction.clone();
  const directReference = Math.abs(directDirection.y) < .8
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const directSide = directDirection.clone().cross(directReference).normalize();
  const directVertical = directSide.clone().cross(directDirection).normalize();
  const scale = control?.scale || BUILDING_SCALE;
  const craftRadius = (control?.flightCollision?.radiusLocal
    ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale
    + UFO_FLIGHT_COLLISION_SKIN;
  const craftDiameter = craftRadius * 2;
  let seed = 0x4d415253;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const meshes = Object.create(null);
  UFO_SPACE_DUST_TYPES.forEach(type => {
    const geometry = type.geometry === "dodecahedron"
      ? new THREE.DodecahedronGeometry(1, 0)
      : type.geometry === "tetrahedron"
        ? new THREE.TetrahedronGeometry(1, 0)
        : new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: type.color,
      roughness: type.roughness,
      metalness: .18,
      emissive: type.emissive,
      emissiveIntensity: type.emissiveIntensity,
      transparent: true,
      opacity: .94,
    });
    const maxCount = Math.ceil(
      UFO_SPACE_DUST_COUNTS[type.id] * UFO_SPACE_DUST_MAX_COUNT_MULTIPLIER,
    );
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      maxCount,
    );
    mesh.name = `space-dust-${type.id}`;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    meshes[type.id] = mesh;
  });

  const particles = [];
  let directAimCount = 0;
  UFO_SPACE_DUST_TYPES.forEach((type, typeIndex) => {
    const mesh = meshes[type.id];
    const count = Math.ceil(
      UFO_SPACE_DUST_COUNTS[type.id] * UFO_SPACE_DUST_MAX_COUNT_MULTIPLIER,
    );
    // 単位ジオメトリの半径1を、UFO全幅に対する指定割合へ正確に合わせ、
    // そこから今回指定された3倍の大きさへ拡大する。
    const dustRadius = craftDiameter * type.sizeFraction
      * UFO_SPACE_DUST_SIZE_MULTIPLIER * .5;
    for (let index = 0; index < count; index += 1) {
      // 各種類を経路横断方向へ均等に割り当て、同じ中央帯へ
      // 偶然集まらないようにする。高さは黄金比の並びでずらし、
      // 同じ高さにも重ならないよう少量の揺らぎだけを加える。
      // meshIndex は全予約枠へ対応させ、後段でも先頭だけを有効化しない。
      const sideSlot = (index + .5) / count;
      const verticalSlot = (index * .61803398875 + .17) % 1;
      const directAim = ((index + typeIndex) % 3) / 3
        < UFO_SPACE_DUST_DIRECT_AIM_RATIO;
      if (directAim) directAimCount += 1;
      const travelDirection = directAim ? directDirection : direction;
      const travelSide = directAim ? directSide : side;
      const travelVertical = directAim ? directVertical : vertical;
      const travelLength = directAim ? craftDistance : length;
      const crossSectionScale = directAim ? .08 : 1;
      particles.push({
        type,
        typeId: type.id,
        mesh,
        meshIndex: index,
        // 初期位置は火星側の32〜64%に限定する。宇宙マップへ入った
        // 瞬間にUFOの近くへ現れず、火星側から接近する様子を見せる。
        baseDistance: (0.32 + random() * .32) * travelLength,
        spawnDelay: random() * UFO_SPACE_DUST_HAZARD_SPAWN_STAGGER,
        sideOffset: (sideSlot - .5) * spreadSide * 2 * crossSectionScale
          + (random() - .5) * (directAim ? 420 : 560),
        verticalOffset: (verticalSlot - .5) * spreadVertical * 2 * crossSectionScale
          + (random() - .5) * (directAim ? 340 : 420),
        dustRadius,
        scale: dustRadius,
        speed: type.speedOptions[Math.floor(random() * type.speedOptions.length)]
          * UFO_SPACE_DUST_SPEED_MULTIPLIER,
        directAim,
        travelDirection: travelDirection.clone(),
        travelSide: travelSide.clone(),
        travelVertical: travelVertical.clone(),
        travelLength,
        disabledUntil: 0,
        spin: new THREE.Vector3(random() * 3.2, random() * 3.2, random() * 3.2),
        phase: random() * Math.PI * 2,
        position: new THREE.Vector3(),
        previousPosition: new THREE.Vector3(),
        initialized: false,
      });
    }
  });

  group.userData = {
    start,
    end,
    direction,
    side,
    vertical,
    length,
    spreadSide,
    spreadVertical,
    particles,
    meshes,
    dummy: new THREE.Object3D(),
    elapsed: 0,
    craftRadius,
    craftDiameter,
    maxParticleRadius: Math.max(...UFO_SPACE_DUST_TYPES.map(type => (
      craftDiameter * type.sizeFraction * UFO_SPACE_DUST_SIZE_MULTIPLIER * .5
    ))),
    flowDirection: "mars-to-earth",
    baseCounts: UFO_SPACE_DUST_COUNTS,
    maxCounts: Object.freeze(Object.fromEntries(UFO_SPACE_DUST_TYPES.map(type => [
      type.id,
      Math.ceil(UFO_SPACE_DUST_COUNTS[type.id] * UFO_SPACE_DUST_MAX_COUNT_MULTIPLIER),
    ]))),
    activeCounts: { ...UFO_SPACE_DUST_COUNTS },
    densityStageId: "far",
    densityRatio: 1,
    directAimCount,
    directAimRatio: particles.length ? directAimCount / particles.length : 0,
    motionMode: "static-direct-lines",
  };
  return group;
}

function makeSpaceDustStream(earth, mars, control) {
  const group = new THREE.Group();
  group.name = "space-combat-formations";
  const start = mars.getWorldPosition(new THREE.Vector3());
  const end = earth.getWorldPosition(new THREE.Vector3());
  const path = end.clone().sub(start);
  const length = Math.max(1, path.length());
  const direction = path.normalize();
  const reference = Math.abs(direction.y) < .8
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const side = direction.clone().cross(reference).normalize();
  const vertical = side.clone().cross(direction).normalize();
  const scale = control?.scale || BUILDING_SCALE;
  const craftRadius = (control?.flightCollision?.radiusLocal
    ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale
    + UFO_FLIGHT_COLLISION_SKIN;
  const craftDiameter = craftRadius * 2;
  const meshes = Object.create(null);

  UFO_SPACE_DUST_TYPES.forEach(type => {
    const geometry = type.geometry === "dodecahedron"
      ? new THREE.DodecahedronGeometry(1, 0)
      : type.geometry === "tetrahedron"
        ? new THREE.TetrahedronGeometry(1, 0)
        : new THREE.IcosahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
      color: type.color,
      roughness: type.roughness,
      metalness: .28,
      emissive: type.emissive,
      emissiveIntensity: type.emissiveIntensity,
      transparent: true,
      opacity: .98,
    });
    const mesh = new THREE.InstancedMesh(
      geometry,
      material,
      UFO_SPACE_DUST_COUNTS[type.id],
    );
    mesh.name = `space-combat-${type.id}`;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    meshes[type.id] = mesh;
  });

  const particles = [];
  let seed = 0x6d617273;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  UFO_SPACE_DUST_TYPES.forEach(type => {
    const mesh = meshes[type.id];
    const count = UFO_SPACE_DUST_COUNTS[type.id];
    const dustRadius = craftDiameter * type.sizeFraction
      * UFO_SPACE_DUST_SIZE_MULTIPLIER * .5;
    for (let index = 0; index < count; index += 1) {
      particles.push({
        type,
        typeId: type.id,
        mesh,
        meshIndex: index,
        dustRadius,
        scale: dustRadius,
        mass: type.mass,
        integrity: type.integrity,
        maxIntegrity: type.integrity,
        collisionCooldown: 0,
        active: false,
        spawnAt: Infinity,
        routeLength: 0,
        travelled: 0,
        target: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        position: new THREE.Vector3(),
        previousPosition: new THREE.Vector3(),
        spin: new THREE.Vector3(
          .7 + random() * 2.7,
          .7 + random() * 2.7,
          .7 + random() * 2.7,
        ),
        phase: random() * Math.PI * 2,
        trailColor: new THREE.Color(type.trailColor),
        waveIndex: 0,
      });
    }
  });

  const trailPositions = new Float32Array(particles.length * 6);
  const trailColors = new Float32Array(particles.length * 6);
  for (let index = 0; index < particles.length; index += 1) {
    const offset = index * 6;
    trailPositions[offset + 1] = -100000;
    trailPositions[offset + 4] = -100000;
  }
  const trailGeometry = new THREE.BufferGeometry();
  const trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
  const trailColorAttribute = new THREE.BufferAttribute(trailColors, 3);
  trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  trailColorAttribute.setUsage(THREE.DynamicDrawUsage);
  trailGeometry.setAttribute("position", trailPositionAttribute);
  trailGeometry.setAttribute("color", trailColorAttribute);
  trailGeometry.setDrawRange(0, particles.length * 2);
  const trail = new THREE.LineSegments(
    trailGeometry,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: .64,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  trail.name = "space-combat-approach-trails";
  trail.frustumCulled = false;
  group.add(trail);

  group.userData = {
    start,
    end,
    direction,
    side,
    vertical,
    length,
    particles,
    meshes,
    dummy: new THREE.Object3D(),
    trail,
    trailPositions,
    trailColors,
    trailPositionAttribute,
    trailColorAttribute,
    elapsed: 0,
    waveIndex: 0,
    waveLabel: "待機",
    lastWaveAt: 0,
    nextWaveAt: Infinity,
    nextWaveInterval: UFO_SPACE_COMBAT_WAVE_INTERVAL,
    craftRadius,
    craftDiameter,
    maxParticleRadius: Math.max(...UFO_SPACE_DUST_TYPES.map(type => (
      craftDiameter * type.sizeFraction * UFO_SPACE_DUST_SIZE_MULTIPLIER * .5
    ))),
    activeCount: 0,
    nearestDistance: Infinity,
    physicsCollisionCount: 0,
    physicsDeflectionCount: 0,
    motionMode: "inertial-impulse-collisions",
  };
  return group;
}

function pointToSegmentDistanceSquared(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared <= 1e-8) return point.distanceToSquared(start);
  const t = clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return point.distanceToSquared(start.clone().addScaledVector(segment, t));
}

function closestPointOnSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared <= 1e-8) return start.clone();
  const t = clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return start.clone().addScaledVector(segment, t);
}

function refreshSpaceDustVelocityDirection(particle) {
  if (particle?.velocity?.lengthSq() <= 1e-8) return;
  particle.direction.copy(particle.velocity).normalize();
}

function resolveSpaceDustParticleCollisions(stream, control, delta) {
  if (!stream?.particles?.length) return 0;
  const activeParticles = [];
  stream.particles.forEach(particle => {
    particle.collisionCooldown = Math.max(0, (particle.collisionCooldown || 0) - delta);
    if (isSpaceDustParticleActive(stream, particle)) activeParticles.push(particle);
  });

  let contacts = 0;
  for (let index = 0; index < activeParticles.length; index += 1) {
    const first = activeParticles[index];
    if (first.collisionCooldown > 0) continue;
    for (let otherIndex = index + 1; otherIndex < activeParticles.length; otherIndex += 1) {
      const second = activeParticles[otherIndex];
      if (first.collisionCooldown > 0 || second.collisionCooldown > 0) continue;
      const separation = second.position.clone().sub(first.position);
      const minimumDistance = first.dustRadius + second.dustRadius;
      const distanceSquared = separation.lengthSq();
      if (distanceSquared > minimumDistance * minimumDistance) continue;

      const distance = Math.sqrt(Math.max(distanceSquared, 1e-8));
      const normal = distance > 1e-4
        ? separation.multiplyScalar(1 / distance)
        : first.velocity.clone().sub(second.velocity);
      if (normal.lengthSq() <= 1e-8) {
        normal.set(Math.cos(first.phase), .18, Math.sin(first.phase)).normalize();
      } else {
        normal.normalize();
      }

      const firstInverseMass = 1 / Math.max(.01, first.mass);
      const secondInverseMass = 1 / Math.max(.01, second.mass);
      const inverseMassSum = firstInverseMass + secondInverseMass;
      const penetration = Math.max(
        0,
        minimumDistance - distance + UFO_SPACE_DUST_COLLISION_SKIN,
      );
      // 質量が小さいチリほど大きく押し出し、表示上のめり込みを残さない。
      first.position.addScaledVector(normal, -penetration * (firstInverseMass / inverseMassSum));
      second.position.addScaledVector(normal, penetration * (secondInverseMass / inverseMassSum));

      const normalSpeed = second.velocity.clone().sub(first.velocity).dot(normal);
      if (normalSpeed < 0) {
        const impulseMagnitude = Math.min(
          1300,
          -(1 + UFO_SPACE_DUST_COLLISION_RESTITUTION) * normalSpeed / inverseMassSum,
        );
        first.velocity.addScaledVector(normal, -impulseMagnitude * firstInverseMass);
        second.velocity.addScaledVector(normal, impulseMagnitude * secondInverseMass);
      }
      refreshSpaceDustVelocityDirection(first);
      refreshSpaceDustVelocityDirection(second);
      first.collisionCooldown = UFO_SPACE_DUST_COLLISION_COOLDOWN;
      second.collisionCooldown = UFO_SPACE_DUST_COLLISION_COOLDOWN;
      contacts += 1;

      if (Math.abs(normalSpeed) >= UFO_SPACE_DUST_COLLISION_IMPACT_SPEED) {
        const impactPosition = first.position.clone().add(second.position).multiplyScalar(.5);
        spawnUfoSpaceImpact(control, impactPosition, first);
      }
    }
  }
  if (contacts > 0) stream.physicsCollisionCount += contacts;
  return contacts;
}

function makeUfoSpaceCombat(control) {
  const group = new THREE.Group();
  group.name = "ufo-space-combat-shots";
  group.userData.owner = control?.buildingId || "ufo";
  return {
    group,
    shots: [],
    explosions: [],
    cooldown: 0,
    hitFlash: 0,
    strafeVelocity: 0,
    shotGeometry: new THREE.CylinderGeometry(1.7, 1.7, 22, 8),
    shotMaterial: new THREE.MeshBasicMaterial({
      color: 0xd9ffff,
      transparent: true,
      opacity: .96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    haloGeometry: new THREE.SphereGeometry(8, 10, 10),
    haloMaterial: new THREE.MeshBasicMaterial({
      color: 0x39dfff,
      transparent: true,
      opacity: .26,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    explosionGeometry: new THREE.SphereGeometry(1, 14, 10),
    impactRingGeometry: new THREE.RingGeometry(.58, 1, 24),
  };
}

// --- First physical arcade trial: UFO gravity pinball mining -----------------------
// The board is intentionally its own space mission. It neither advances the craft
// automatically nor reuses the rescue/dust state: the player launches one heavy
// gravity core, steers the lower magnetic catcher with the UFO, and creates a route
// through real bumper contacts to unlock the collection gate.
function makeUfoGravityPinballMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-gravity-pinball-mining";
  group.visible = false;

  const board = new THREE.Group();
  board.name = "ufo-gravity-pinball-board";
  group.add(board);

  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x102b43,
    metalness: .72,
    roughness: .28,
    emissive: 0x061523,
    emissiveIntensity: .72,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(
      UFO_GRAVITY_PINBALL_BOARD_HALF_WIDTH * 2,
      UFO_GRAVITY_PINBALL_BOARD_HALF_HEIGHT * 2,
    ),
    panelMaterial,
  );
  panel.name = "gravity-pinball-mining-panel";
  panel.position.z = 4;
  board.add(panel);

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(
      UFO_GRAVITY_PINBALL_BOARD_HALF_WIDTH * 2 + 40,
      UFO_GRAVITY_PINBALL_BOARD_HALF_HEIGHT * 2 + 40,
      28,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x06101c,
      metalness: .8,
      roughness: .24,
      emissive: 0x02080e,
      emissiveIntensity: .42,
    }),
  );
  backing.name = "gravity-pinball-mining-backing";
  backing.position.z = 19;
  board.add(backing);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x6de9ff,
    metalness: .66,
    roughness: .18,
    emissive: 0x1ba7d6,
    emissiveIntensity: 1.15,
  });
  const frameDepth = -7;
  const width = UFO_GRAVITY_PINBALL_BOARD_HALF_WIDTH;
  const height = UFO_GRAVITY_PINBALL_BOARD_HALF_HEIGHT;
  [
    [0, height + 13, width * 2 + 36, 16],
    [0, -height - 13, width * 2 + 36, 16],
    [-width - 13, 0, 16, height * 2 + 36],
    [width + 13, 0, 16, height * 2 + 36],
  ].forEach(([x, y, frameWidth, frameHeight], index) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, 16),
      frameMaterial.clone(),
    );
    rail.name = `gravity-pinball-frame-${index + 1}`;
    rail.position.set(x, y, frameDepth);
    board.add(rail);
  });

  const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x3e91af,
    transparent: true,
    opacity: .28,
    depthWrite: false,
  });
  for (let index = -4; index <= 4; index += 1) {
    const vertical = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(index * 76, -height + 12, -9),
      new THREE.Vector3(index * 76, height - 12, -9),
    ]);
    const horizontal = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-width + 12, index * 60, -9),
      new THREE.Vector3(width - 12, index * 60, -9),
    ]);
    board.add(new THREE.Line(vertical, gridMaterial), new THREE.Line(horizontal, gridMaterial));
  }

  const bumperDefinitions = [
    { id: "ore-left", x: -238, y: 126, radius: 39, color: 0xffb457, ore: true },
    { id: "ore-top", x: 0, y: 230, radius: 43, color: 0xffd86d, ore: true },
    { id: "ore-right", x: 238, y: 126, radius: 39, color: 0xff9f67, ore: true },
    { id: "side-left", x: -155, y: 2, radius: 42, color: 0x4bd9ff },
    { id: "side-right", x: 155, y: -22, radius: 42, color: 0x5ceac2 },
    {
      id: "orbit-core",
      x: 0,
      y: 20,
      radius: 37,
      color: 0x7a8fff,
      orbit: { radius: 112, speed: .84, phase: .6, baseY: 34 },
    },
  ];
  const bumpers = bumperDefinitions.map(definition => {
    const root = new THREE.Group();
    root.name = `gravity-pinball-bumper-${definition.id}`;
    root.position.set(definition.x, definition.y, -26);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: definition.color,
      metalness: .56,
      roughness: .2,
      emissive: definition.color,
      emissiveIntensity: .62,
    });
    const capMaterial = new THREE.MeshBasicMaterial({
      color: definition.color,
      transparent: true,
      opacity: .82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(definition.radius, definition.radius * .78, 20, 28),
      bodyMaterial,
    );
    body.rotation.x = Math.PI / 2;
    const cap = new THREE.Mesh(new THREE.CircleGeometry(definition.radius * .72, 28), capMaterial);
    cap.position.z = -13;
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(definition.radius * 1.14, 2.8, 8, 36),
      new THREE.MeshBasicMaterial({
        color: definition.color,
        transparent: true,
        opacity: .42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.z = -20;
    const light = new THREE.PointLight(definition.color, definition.ore ? 1.7 : 1.18, 290, 2);
    light.position.z = -90;
    light.userData.nonCollidable = true;
    root.add(body, cap, halo, light);
    board.add(root);
    return {
      ...definition,
      root,
      bodyMaterial,
      capMaterial,
      halo,
      light,
      locked: false,
      hitCooldown: 0,
      hitFlash: 0,
    };
  });

  const gate = new THREE.Group();
  gate.name = "gravity-pinball-ore-collection-gate";
  gate.position.set(0, 36, -28);
  gate.visible = false;
  const gateMaterial = new THREE.MeshBasicMaterial({
    color: 0xfef0a5,
    transparent: true,
    opacity: .95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const gateRing = new THREE.Mesh(new THREE.TorusGeometry(64, 7, 12, 48), gateMaterial);
  const gateField = new THREE.Mesh(
    new THREE.CircleGeometry(52, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffd66b,
      transparent: true,
      opacity: .18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  gateField.position.z = 2;
  const gateLight = new THREE.PointLight(0xffd778, 0, 500, 1.6);
  gateLight.position.z = -130;
  gateLight.userData.nonCollidable = true;
  gate.add(gateRing, gateField, gateLight);
  board.add(gate);

  const catcher = new THREE.Group();
  catcher.name = "gravity-pinball-ufo-magnetic-catcher";
  catcher.position.set(0, UFO_GRAVITY_PINBALL_PADDLE_Y, -48);
  const catcherBase = new THREE.Mesh(
    new THREE.BoxGeometry(UFO_GRAVITY_PINBALL_PADDLE_HALF_WIDTH * 2, 18, 16),
    new THREE.MeshStandardMaterial({
      color: 0x293947,
      metalness: .88,
      roughness: .18,
      emissive: 0x0b2938,
      emissiveIntensity: .82,
    }),
  );
  const catcherRail = new THREE.Mesh(
    new THREE.BoxGeometry(UFO_GRAVITY_PINBALL_PADDLE_HALF_WIDTH * 1.78, 6, 7),
    new THREE.MeshBasicMaterial({
      color: 0x8ffaff,
      transparent: true,
      opacity: .9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  catcherRail.position.z = -13;
  const catcherHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(UFO_GRAVITY_PINBALL_PADDLE_HALF_WIDTH * 2.15, 45),
    new THREE.MeshBasicMaterial({
      color: 0x43d7ff,
      transparent: true,
      opacity: .15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  catcherHalo.position.z = -24;
  catcher.add(catcherBase, catcherRail, catcherHalo);
  board.add(catcher);

  const core = new THREE.Group();
  core.name = "gravity-pinball-core";
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xfbfff3,
    metalness: .24,
    roughness: .08,
    emissive: 0x70eeff,
    emissiveIntensity: 2.2,
  });
  const coreBall = new THREE.Mesh(new THREE.SphereGeometry(UFO_GRAVITY_PINBALL_CORE_RADIUS, 24, 18), coreMaterial);
  const coreRingA = new THREE.Mesh(
    new THREE.TorusGeometry(UFO_GRAVITY_PINBALL_CORE_RADIUS * 1.28, 2.4, 8, 28),
    new THREE.MeshBasicMaterial({
      color: 0x80f5ff,
      transparent: true,
      opacity: .78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const coreRingB = coreRingA.clone();
  coreRingB.material = coreRingA.material.clone();
  coreRingB.rotation.x = Math.PI / 2;
  const coreLight = new THREE.PointLight(0x91f7ff, 3.2, 520, 1.7);
  coreLight.position.z = -70;
  coreLight.userData.nonCollidable = true;
  core.add(coreBall, coreRingA, coreRingB, coreLight);
  core.position.set(0, UFO_GRAVITY_PINBALL_PADDLE_Y + 48, -66);
  core.visible = false;
  board.add(core);

  const launchRail = new THREE.Mesh(
    new THREE.BoxGeometry(76, 142, 10),
    new THREE.MeshBasicMaterial({
      color: 0x5be8ff,
      transparent: true,
      opacity: .18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  launchRail.position.set(0, UFO_GRAVITY_PINBALL_PADDLE_Y + 58, -20);
  board.add(launchRail);

  const boardLight = new THREE.PointLight(0x6bdcff, 2.1, 1200, 1.7);
  boardLight.position.set(0, 20, -230);
  boardLight.userData.nonCollidable = true;
  board.add(boardLight);

  return {
    group,
    board,
    panelMaterial,
    launchRail,
    bumpers,
    gate: { group: gate, ring: gateRing, field: gateField, light: gateLight, radius: 64, active: false },
    catcher: { group: catcher, rail: catcherRail, halo: catcherHalo, x: 0, previousX: 0, velocityX: 0 },
    core: {
      group: core,
      ball: coreBall,
      ringA: coreRingA,
      ringB: coreRingB,
      light: coreLight,
      material: coreMaterial,
      position: new THREE.Vector2(),
      velocity: new THREE.Vector2(),
      radius: UFO_GRAVITY_PINBALL_CORE_RADIUS,
      miningCharge: false,
    },
    effects: [],
    active: false,
    phase: "idle",
    elapsed: 0,
    timeRemaining: 30,
    score: 0,
    combo: 0,
    bestCombo: 0,
    oreLocks: 0,
    charges: UFO_GRAVITY_PINBALL_CORE_CHARGES,
    pulseCooldown: 0,
    pulseFlash: 0,
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    lastCraftCenter: new THREE.Vector3(),
    testMode: false,
  };
}

function setUfoSpaceHudLabels({ title, first, second, third }) {
  if (els.ufoSpaceModeTitle) els.ufoSpaceModeTitle.textContent = title;
  if (els.ufoSpaceStatOneLabel) els.ufoSpaceStatOneLabel.textContent = first;
  if (els.ufoSpaceStatTwoLabel) els.ufoSpaceStatTwoLabel.textContent = second;
  if (els.ufoSpaceStatThreeLabel) els.ufoSpaceStatThreeLabel.textContent = third;
}

function setUfoSpaceControlLabels(title, detail) {
  if (els.ufoSpaceControlTitle) els.ufoSpaceControlTitle.textContent = title;
  if (els.ufoSpaceControlDetail) els.ufoSpaceControlDetail.textContent = detail;
}

// --- Planetarium mining garden --------------------------------------------------------
// This mode deliberately does not reuse the former Earth–Mars lanes.  The visible
// stars, their released fragments, and the UFO all share the same world coordinates,
// so choosing a route, closing in, pulsing a star, and collecting its material are
// all performed by flying the actual craft rather than moving a proxy on a board.
function makeUfoStarMiningMission(control, entryCraftCenter, craft) {
  const group = new THREE.Group();
  group.name = "ufo-planetarium-mining-garden";
  group.visible = false;

  const orientation = new THREE.Quaternion();
  craft?.getWorldQuaternion?.(orientation);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation);
  forward.y = 0;
  if (forward.lengthSq() < 1e-5) forward.set(0, 0, -1);
  else forward.normalize();
  const right = new THREE.Vector3(-forward.z, 0, forward.x).normalize();
  const origin = entryCraftCenter.clone();

  const makeStar = ({ id, name, shortLabel, kind, tint, coreTint, radius, distance, lateral, height, fragmentCount, note }) => {
    const root = new THREE.Group();
    root.name = `planetarium-mining-star-${id}`;
    const center = origin.clone()
      .addScaledVector(forward, distance)
      .addScaledVector(right, lateral)
      .add(new THREE.Vector3(0, height, 0));
    root.position.copy(center);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: coreTint,
      metalness: .52,
      roughness: .19,
      emissive: tint,
      emissiveIntensity: 1.45,
      transparent: true,
      opacity: .98,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * .58, 2), coreMaterial);
    core.name = `${id}-star-core`;
    root.add(core);

    const shellMaterial = new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: .16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), shellMaterial);
    shell.name = `${id}-star-aura`;
    root.add(shell);

    const rings = [0, 1].map(index => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius * (1.08 + index * .28), 2.8 + index * 1.1, 8, 56),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          opacity: .54 - index * .16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.rotation.set(index ? .76 : 1.18, index * .8, index ? .32 : -.52);
      root.add(ring);
      return ring;
    });

    const satellites = Array.from({ length: kind === "nebula" ? 6 : 4 }, (_, index) => {
      const satellite = new THREE.Mesh(
        new THREE.OctahedronGeometry(radius * (kind === "meteor" ? .14 : .1), 1),
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          opacity: .84,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      satellite.userData.phase = index / Math.max(1, kind === "nebula" ? 6 : 4) * Math.PI * 2;
      satellite.userData.orbit = radius * (1.28 + (index % 2) * .22);
      root.add(satellite);
      return satellite;
    });

    const light = new THREE.PointLight(tint, 2.4, radius * 10, 1.6);
    light.userData.nonCollidable = true;
    root.add(light);
    group.add(root);
    return {
      id,
      name,
      shortLabel,
      kind,
      tint,
      coreTint,
      radius,
      center,
      root,
      core,
      shell,
      rings,
      satellites,
      light,
      fragmentCount,
      note,
      phase: "ready",
      cooldown: 0,
      pulse: 0,
      harvestedCount: 0,
      activeFragments: 0,
      visited: false,
    };
  };

  const stars = [
    makeStar({
      id: "resonance",
      name: "共鳴結晶星",
      shortLabel: "結晶星",
      kind: "resonance",
      tint: 0x71e8ff,
      coreTint: 0xe5fdff,
      radius: 120,
      distance: 720,
      lateral: 130,
      height: 90,
      fragmentCount: 7,
      note: "近づいて採掘パルス。結晶片は星のまわりを旋回します。",
    }),
    makeStar({
      id: "meteor",
      name: "流星鉱星",
      shortLabel: "流星鉱星",
      kind: "meteor",
      tint: 0xffb765,
      coreTint: 0xfff0ca,
      radius: 138,
      distance: 1540,
      lateral: -560,
      height: -80,
      fragmentCount: 6,
      note: "採掘パルスで鉱石が放射状に流れます。進路を読んで追いかけます。",
    }),
    makeStar({
      id: "nebula",
      name: "星雲採取星",
      shortLabel: "星雲星",
      kind: "nebula",
      tint: 0xc5a4ff,
      coreTint: 0xf5edff,
      radius: 164,
      distance: 2420,
      lateral: 690,
      height: 310,
      fragmentCount: 12,
      note: "紫の採取雲へ飛び込み、ゆっくり漂う星雲粒子を回収します。",
    }),
  ];

  const afterimages = Array.from({ length: 3 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: 0x8bf8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(104 - index * 12, 132 - index * 14, 18, 40),
      material,
    );
    mesh.name = `planetarium-dash-afterimage-${index + 1}`;
    mesh.visible = false;
    mesh.userData.nonCollidable = true;
    group.add(mesh);
    return { mesh, life: 0 };
  });

  return {
    group,
    origin,
    forward,
    right,
    stars,
    fragments: [],
    afterimages,
    active: false,
    elapsed: 0,
    collected: 0,
    visited: 0,
    nearestStar: null,
    nearestDistance: Infinity,
    dashCharges: UFO_STAR_MINING_DASH_CHARGES,
    dashCooldown: 0,
    dashRecharge: 0,
    testMode: false,
  };
}

function disposeUfoStarMiningFragment(mission, fragment) {
  if (!fragment?.root) return;
  mission?.group?.remove(fragment.root);
  fragment.root.traverse(child => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) child.material.forEach(material => material?.dispose?.());
    else child.material?.dispose?.();
  });
}

function resetUfoStarMiningMission(mission) {
  if (!mission) return;
  mission.fragments.forEach(fragment => disposeUfoStarMiningFragment(mission, fragment));
  mission.fragments.length = 0;
  mission.active = false;
  mission.elapsed = 0;
  mission.collected = 0;
  mission.visited = 0;
  mission.nearestStar = null;
  mission.nearestDistance = Infinity;
  mission.dashCharges = UFO_STAR_MINING_DASH_CHARGES;
  mission.dashCooldown = 0;
  mission.dashRecharge = 0;
  mission.testMode = false;
  mission.group.visible = false;
  mission.afterimages.forEach(afterimage => {
    afterimage.life = 0;
    afterimage.mesh.visible = false;
    afterimage.mesh.material.opacity = 0;
  });
  mission.stars.forEach(star => {
    star.phase = "ready";
    star.cooldown = 0;
    star.pulse = 0;
    star.harvestedCount = 0;
    star.activeFragments = 0;
    star.visited = false;
    star.root.visible = true;
    star.core.scale.setScalar(1);
    star.core.material.emissiveIntensity = 1.45;
    star.shell.material.opacity = .16;
    star.light.intensity = 2.4;
    star.rings.forEach((ring, index) => { ring.material.opacity = .54 - index * .16; });
  });
  state.ufoStarMiningState = "idle";
  state.ufoStarMiningCollected = 0;
  state.ufoStarMiningVisited = 0;
  state.ufoStarMiningNearest = "--";
  state.ufoStarMiningDashCharges = UFO_STAR_MINING_DASH_CHARGES;
  delete document.body.dataset.ufoStarMining;
  delete document.body.dataset.ufoStarMiningNearest;
  delete document.body.dataset.ufoStarMiningDistance;
  delete document.body.dataset.ufoStarMiningCollected;
  delete document.body.dataset.ufoStarMiningFragments;
  delete document.body.dataset.ufoStarMiningDashCharges;
}

function activateUfoStarMiningMode(control, { testMode = false, silent = false } = {}) {
  const mission = control?.spaceStarMining;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(control.spaceRingBattle);
  resetUfoCranePortMission(control.spaceCranePort);
  resetUfoGravityMazeMission(control.spaceGravityMaze);
  resetUfoInertiaSlingshotMission(control.spaceInertiaSlingshot);
  resetUfoSolarSailMission(control.spaceSolarSail);
  resetUfoMarsRaceMission(control.spaceMarsRace);
  resetUfoStarMiningMission(mission);
  mission.active = true;
  mission.group.visible = true;
  mission.testMode = testMode;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  state.ufoStarMiningState = "free-flight";
  document.body.dataset.ufoSpaceCombatMode = "planetarium-mining";
  document.body.dataset.ufoSpaceMission = "planetarium-mining-free-flight";
  document.body.dataset.ufoSpaceShooting = "disabled";
  document.body.dataset.ufoStarMining = "active";
  setUfoSpaceControlLabels("自由航行", "全方向飛行");
  updateUfoStarMiningLifeHud();
  updateUfoStarMiningHud();
  updateUfoControls();
  if (!silent) showToast("星間採掘航行を開始。星へ近づき、Fキーまたは採掘パルスで資源を開放できます。");
  return true;
}

function makeUfoStarMiningFragment(mission, star, index) {
  const angle = index / Math.max(1, star.fragmentCount) * Math.PI * 2 + star.pulse * 2.4;
  const vertical = star.kind === "nebula"
    ? Math.sin(index * 1.92 + star.pulse) * .48
    : Math.cos(index * 1.41 + star.pulse) * .24;
  const radial = new THREE.Vector3(Math.cos(angle), vertical, Math.sin(angle)).normalize();
  const tangent = new THREE.Vector3(-radial.z, 0, radial.x).normalize();
  const fragmentRadius = star.kind === "nebula" ? 18 + (index % 3) * 4 : 24 + (index % 2) * 5;
  const root = new THREE.Group();
  root.name = `${star.id}-mining-fragment-${index + 1}`;
  const material = new THREE.MeshStandardMaterial({
    color: star.coreTint,
    metalness: .5,
    roughness: .2,
    emissive: star.tint,
    emissiveIntensity: 1.3,
    transparent: true,
    opacity: .96,
  });
  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(fragmentRadius, 1), material);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(fragmentRadius * 1.12, 1.8, 7, 24),
    new THREE.MeshBasicMaterial({
      color: star.tint,
      transparent: true,
      opacity: .58,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  rim.rotation.x = Math.PI / 2;
  root.add(core, rim);
  root.position.copy(star.center).addScaledVector(radial, star.radius * .7 + fragmentRadius);
  root.userData.nonCollidable = true;
  mission.group.add(root);
  const velocity = new THREE.Vector3();
  if (star.kind === "resonance") {
    velocity.copy(tangent).multiplyScalar(118 + (index % 3) * 18).addScaledVector(radial, 30 + (index % 2) * 14);
  } else if (star.kind === "meteor") {
    velocity.copy(radial).multiplyScalar(138 + (index % 3) * 28).addScaledVector(tangent, (index % 2 ? -1 : 1) * 44);
  } else {
    velocity.copy(radial).multiplyScalar(42 + (index % 3) * 14).add(new THREE.Vector3(0, 28 + (index % 4) * 7, 0));
  }
  return {
    root,
    core,
    rim,
    material,
    star,
    position: root.position.clone(),
    velocity,
    radial,
    age: 0,
    life: UFO_STAR_MINING_FRAGMENT_LIFETIME,
    radius: fragmentRadius,
    phase: angle,
  };
}

function triggerUfoStarMiningPulse(mission, star) {
  if (!mission?.active || !star || star.phase !== "ready") return false;
  star.phase = "harvesting";
  star.cooldown = 0;
  star.pulse = mission.elapsed;
  star.harvestedCount = 0;
  star.activeFragments = star.fragmentCount;
  star.core.material.emissiveIntensity = 3.4;
  star.shell.material.opacity = .5;
  star.light.intensity = 6.6;
  if (!star.visited) {
    star.visited = true;
    mission.visited += 1;
  }
  for (let index = 0; index < star.fragmentCount; index += 1) {
    mission.fragments.push(makeUfoStarMiningFragment(mission, star, index));
  }
  state.ufoStarMiningState = `mining-${star.id}`;
  state.ufoStarMiningVisited = mission.visited;
  document.body.dataset.ufoStarMining = "harvesting";
  document.body.dataset.ufoStarMiningStar = star.id;
  showToast(`${star.name}を共鳴。放出された資源を飛行して回収してください。`);
  return true;
}

function updateUfoStarMiningNearest(mission, craftCenter) {
  let nearestStar = null;
  let nearestDistance = Infinity;
  mission.stars.forEach(star => {
    const distance = craftCenter.distanceTo(star.center);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStar = star;
    }
  });
  mission.nearestStar = nearestStar;
  mission.nearestDistance = nearestDistance;
  state.ufoStarMiningNearest = nearestStar?.shortLabel || "--";
  document.body.dataset.ufoStarMiningNearest = nearestStar?.id || "none";
  document.body.dataset.ufoStarMiningDistance = Number.isFinite(nearestDistance)
    ? Math.round(nearestDistance).toString()
    : "--";
}

function collectUfoStarMiningFragment(mission, fragment) {
  const star = fragment.star;
  mission.collected += 1;
  star.harvestedCount += 1;
  star.activeFragments = Math.max(0, star.activeFragments - 1);
  disposeUfoStarMiningFragment(mission, fragment);
  state.ufoStarMiningCollected = mission.collected;
  document.body.dataset.ufoStarMiningCollected = String(mission.collected);
}

function updateUfoStarMiningMission(delta) {
  const control = ufoDoorControls[0];
  const mission = control?.spaceStarMining;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return;
  const craft = control.craftAssembly;
  if (!craft) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  updateUfoStarMiningNearest(mission, craftCenter);

  mission.stars.forEach((star, index) => {
    const spin = mission.elapsed * (star.kind === "nebula" ? .45 : .72) + index * .86;
    star.core.rotation.y += frameDelta * (star.kind === "meteor" ? 1.2 : .74);
    star.shell.rotation.set(spin * .17, spin * .23, spin * .11);
    star.rings.forEach((ring, ringIndex) => {
      ring.rotation.z += frameDelta * (ringIndex ? -.88 : .72);
      ring.rotation.x += frameDelta * (ringIndex ? .08 : -.06);
    });
    star.satellites.forEach((satellite, satelliteIndex) => {
      const phase = spin * (1.12 + satelliteIndex * .08) + satellite.userData.phase;
      const orbit = satellite.userData.orbit;
      satellite.position.set(
        Math.cos(phase) * orbit,
        Math.sin(phase * 1.6) * star.radius * .36,
        Math.sin(phase) * orbit,
      );
      satellite.rotation.set(phase, phase * .62, phase * 1.34);
    });
    if (star.phase === "harvesting") {
      star.core.scale.setScalar(1 + Math.sin(mission.elapsed * 7.2) * .08);
      star.shell.material.opacity = .34 + Math.sin(mission.elapsed * 6.2) * .14;
      star.light.intensity = 4.8 + Math.sin(mission.elapsed * 6.2) * 1.2;
    } else if (star.phase === "cooldown") {
      star.cooldown = Math.max(0, star.cooldown - frameDelta);
      star.core.material.emissiveIntensity = THREE.MathUtils.lerp(star.core.material.emissiveIntensity, 1.45, .08);
      star.shell.material.opacity = THREE.MathUtils.lerp(star.shell.material.opacity, .16, .08);
      star.light.intensity = THREE.MathUtils.lerp(star.light.intensity, 2.4, .08);
      if (star.cooldown <= 0) star.phase = "ready";
    }
  });

  for (let index = mission.fragments.length - 1; index >= 0; index -= 1) {
    const fragment = mission.fragments[index];
    const star = fragment.star;
    fragment.age += frameDelta;
    const radial = fragment.position.clone().sub(star.center);
    const radialLength = Math.max(1, radial.length());
    const radialDirection = radial.multiplyScalar(1 / radialLength);
    if (star.kind === "resonance") {
      const tangent = new THREE.Vector3(-radialDirection.z, 0, radialDirection.x);
      const preferredRadius = star.radius * (1.45 + (index % 3) * .16);
      fragment.velocity.addScaledVector(tangent, 82 * frameDelta);
      fragment.velocity.addScaledVector(radialDirection, (preferredRadius - radialLength) * .55 * frameDelta);
      fragment.velocity.multiplyScalar(Math.exp(-frameDelta * .08));
    } else if (star.kind === "meteor") {
      fragment.velocity.y += Math.sin(fragment.age * 4.6 + fragment.phase) * 14 * frameDelta;
      fragment.velocity.multiplyScalar(Math.exp(-frameDelta * .025));
    } else {
      fragment.velocity.addScaledVector(radialDirection, 5.5 * frameDelta);
      fragment.velocity.x += Math.sin(fragment.age * 2.1 + fragment.phase) * 9 * frameDelta;
      fragment.velocity.z += Math.cos(fragment.age * 1.7 + fragment.phase) * 9 * frameDelta;
      fragment.velocity.multiplyScalar(Math.exp(-frameDelta * .08));
    }
    fragment.position.addScaledVector(fragment.velocity, frameDelta);
    fragment.root.position.copy(fragment.position);
    fragment.root.rotation.set(
      fragment.age * (1.8 + (index % 2) * .4),
      fragment.age * (2.4 + (index % 3) * .28),
      fragment.age * 1.2,
    );
    const collected = craftCenter.distanceTo(fragment.position)
      <= UFO_STAR_MINING_COLLECTION_RANGE + fragment.radius;
    const expired = fragment.age >= fragment.life;
    if (collected) {
      collectUfoStarMiningFragment(mission, fragment);
      mission.fragments.splice(index, 1);
    } else if (expired) {
      star.activeFragments = Math.max(0, star.activeFragments - 1);
      disposeUfoStarMiningFragment(mission, fragment);
      mission.fragments.splice(index, 1);
    }
  }

  mission.stars.forEach(star => {
    if (star.phase === "harvesting" && star.activeFragments <= 0) {
      star.phase = "cooldown";
      star.cooldown = UFO_STAR_MINING_STAR_RECOVERY_SECONDS;
      star.core.scale.setScalar(1);
      document.body.dataset.ufoStarMining = "free-flight";
      state.ufoStarMiningState = "free-flight";
    }
  });

  mission.dashCooldown = Math.max(0, mission.dashCooldown - frameDelta);
  if (mission.dashCharges < UFO_STAR_MINING_DASH_CHARGES && mission.dashCooldown <= 0) {
    mission.dashRecharge += frameDelta;
    if (mission.dashRecharge >= UFO_STAR_MINING_DASH_RECHARGE_SECONDS) {
      mission.dashCharges += 1;
      mission.dashRecharge = 0;
    }
  } else if (mission.dashCharges >= UFO_STAR_MINING_DASH_CHARGES) {
    mission.dashRecharge = 0;
  }
  mission.afterimages.forEach(afterimage => {
    afterimage.life = Math.max(0, afterimage.life - frameDelta);
    afterimage.mesh.visible = afterimage.life > 0;
    if (afterimage.mesh.visible) afterimage.mesh.material.opacity = Math.min(.34, afterimage.life * .54);
  });
  state.ufoStarMiningDashCharges = mission.dashCharges;
  document.body.dataset.ufoStarMiningFragments = String(mission.fragments.length);
  document.body.dataset.ufoStarMiningDashCharges = String(mission.dashCharges);
  updateUfoStarMiningHud();
}

function ufoStarMiningDashDirection(control) {
  const input = readUfoFlightInput();
  const localDirection = new THREE.Vector3(input.strafe, input.lift * .78, -input.forward);
  const quaternion = new THREE.Quaternion();
  control?.craftAssembly?.getWorldQuaternion?.(quaternion);
  if (localDirection.lengthSq() <= .01) {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
  }
  return localDirection.normalize().applyQuaternion(quaternion).normalize();
}

function performUfoStarMiningDash(control, mission) {
  if (!mission?.active || mission.dashCharges <= 0 || mission.dashCooldown > 0) return false;
  const craft = control?.craftAssembly;
  if (!craft) return false;
  craft.updateWorldMatrix(true, true);
  const before = craft.getWorldPosition(new THREE.Vector3());
  const direction = ufoStarMiningDashDirection(control);
  const scale = control.scale || BUILDING_SCALE;
  let accepted = null;
  for (const amount of [1, .82, .64, .46, .3]) {
    const target = before.clone().addScaledVector(direction, UFO_STAR_MINING_DASH_DISTANCE * amount);
    const local = ufoWorldToLocal(control, target.x, target.z);
    const localY = clampUfoSpaceFlightY((target.y - (control.originY || 0)) / scale);
    if (!ufoFlightCollisionAt(control, local.x, localY, local.z)) {
      accepted = { local, localY, target };
      break;
    }
  }
  if (!accepted) {
    showToast("残像ブーストの進路が空いていません。");
    return false;
  }
  state.ufoFlightX = accepted.local.x;
  state.ufoFlightY = accepted.localY;
  state.ufoFlightZ = accepted.local.z;
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  mission.afterimages.forEach((afterimage, index) => {
    afterimage.mesh.position.copy(before).addScaledVector(direction, -index * 58);
    afterimage.mesh.rotation.set(0, state.ufoFlightHeading, 0);
    afterimage.life = .66 - index * .12;
    afterimage.mesh.visible = true;
    afterimage.mesh.material.opacity = .32 - index * .06;
  });
  mission.dashCharges -= 1;
  mission.dashCooldown = UFO_STAR_MINING_DASH_COOLDOWN;
  mission.dashRecharge = 0;
  state.ufoStarMiningDashCharges = mission.dashCharges;
  document.body.dataset.ufoStarMiningDash = "used";
  showToast("残像ブースト。進行方向へ短距離ワープしました。");
  return true;
}

function useUfoStarMiningAction() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceStarMining;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || state.ufoEngineMode !== "ready") return false;
  const canPulse = mission.nearestStar
    && mission.nearestDistance <= UFO_STAR_MINING_INTERACTION_RANGE
    && mission.nearestStar.phase === "ready";
  return canPulse
    ? triggerUfoStarMiningPulse(mission, mission.nearestStar)
    : performUfoStarMiningDash(control, mission);
}

function updateUfoStarMiningLifeHud() {
  if (!els.ufoSpaceLife) return;
  const mission = ufoDoorControls[0]?.spaceStarMining;
  els.ufoSpaceLife.hidden = !(mission?.active && state.map === "space" && state.ufoInSpace);
  if (mission?.active) els.ufoSpaceLife.hidden = true;
}

function updateUfoStarMiningHud() {
  const mission = ufoDoorControls[0]?.spaceStarMining;
  const visible = Boolean(
    mission?.active
    && state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && !state.ufoSpaceEscapePending,
  );
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  const star = mission.nearestStar;
  const inRange = Boolean(star && mission.nearestDistance <= UFO_STAR_MINING_INTERACTION_RANGE);
  const canPulse = Boolean(inRange && star.phase === "ready");
  const nearestProgress = star
    ? clamp(1 - mission.nearestDistance / UFO_STAR_MINING_INTERACTION_RANGE, 0, 1)
    : 0;
  const harvestProgress = star?.phase === "harvesting"
    ? clamp(star.harvestedCount / Math.max(1, star.fragmentCount), 0, 1)
    : nearestProgress;
  setUfoSpaceHudLabels({ title: "プラネタリウム採掘航行", first: "採集", second: "訪問星", third: "近接星" });
  if (els.ufoSpaceWave) {
    els.ufoSpaceWave.textContent = canPulse
      ? "採掘圏内"
      : star?.phase === "harvesting"
        ? "資源放出中"
        : mission.dashCooldown > 0
          ? "残像冷却"
          : "自由航行";
  }
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = String(mission.collected);
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = String(mission.visited);
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = star?.shortLabel || "--";
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(harvestProgress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = canPulse
      ? `${star.name}が採掘圏内です。採掘パルスで資源を解放できます。`
      : star?.phase === "harvesting"
        ? `${star.name}の資源が漂流中。UFOで近づいて直接回収します。`
        : star
          ? `${star.name}まで ${Math.round(mission.nearestDistance)}。${star.note}`
          : "星を探して、自由にプラネタリウムを航行してください。";
  }
  if (els.ufoSpaceStartButton) {
    els.ufoSpaceStartButton.hidden = true;
    els.ufoSpaceStartButton.disabled = true;
  }
  if (els.ufoSpaceFireButton) {
    const canDash = mission.dashCharges > 0 && mission.dashCooldown <= 0;
    els.ufoSpaceFireButton.hidden = false;
    els.ufoSpaceFireButton.disabled = !canPulse && !canDash;
    els.ufoSpaceFireButton.textContent = canPulse
      ? "採掘パルス"
      : mission.dashCooldown > 0
        ? `残像冷却 ${mission.dashCooldown.toFixed(1)}`
        : `残像ブースト ×${mission.dashCharges}`;
    els.ufoSpaceFireButton.setAttribute("aria-label", canPulse ? "近接した星へ採掘パルスを放つ" : "進行方向へ残像ブーストする");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.cooldown = String(mission.dashCooldown > 0);
    els.ufoSpaceCombat.dataset.hit = String(star?.phase === "harvesting");
    els.ufoSpaceCombat.dataset.started = "true";
  }
}

function resetUfoGravityPinballMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = 30;
  mission.score = 0;
  mission.combo = 0;
  mission.bestCombo = 0;
  mission.oreLocks = 0;
  mission.charges = UFO_GRAVITY_PINBALL_CORE_CHARGES;
  mission.pulseCooldown = 0;
  mission.pulseFlash = 0;
  mission.group.visible = false;
  mission.core.group.visible = false;
  mission.core.position.set(-148, UFO_GRAVITY_PINBALL_PADDLE_Y + 48);
  mission.core.velocity.set(0, 0);
  mission.core.miningCharge = false;
  mission.core.material.color.setHex(0xfbfff3);
  mission.core.material.emissive.setHex(0x70eeff);
  mission.core.material.emissiveIntensity = 2.2;
  mission.core.light.color.setHex(0x91f7ff);
  mission.core.group.position.set(-148, UFO_GRAVITY_PINBALL_PADDLE_Y + 48, -66);
  mission.catcher.x = 0;
  mission.catcher.previousX = 0;
  mission.catcher.velocityX = 0;
  mission.catcher.group.position.x = 0;
  mission.gate.active = false;
  mission.gate.group.visible = false;
  mission.gate.light.intensity = 0;
  mission.bumpers.forEach(bumper => {
    bumper.locked = false;
    bumper.hitCooldown = 0;
    bumper.hitFlash = 0;
    bumper.root.position.set(bumper.x, bumper.y, -26);
    bumper.bodyMaterial.color.setHex(bumper.color);
    bumper.bodyMaterial.emissive.setHex(bumper.color);
    bumper.bodyMaterial.emissiveIntensity = .62;
    bumper.capMaterial.color.setHex(bumper.color);
    bumper.capMaterial.opacity = .82;
    bumper.halo.material.color.setHex(bumper.color);
    bumper.halo.material.opacity = .42;
    bumper.light.color.setHex(bumper.color);
    bumper.light.intensity = bumper.ore ? 1.7 : 1.18;
  });
  mission.effects.forEach(effect => {
    mission.board.remove(effect.mesh);
    effect.mesh.geometry?.dispose?.();
    effect.mesh.material?.dispose?.();
  });
  mission.effects.length = 0;
  state.ufoGravityPinballState = "idle";
  state.ufoGravityPinballOre = 0;
  state.ufoGravityPinballCombo = 0;
  state.ufoGravityPinballBestCombo = 0;
  state.ufoGravityPinballCharges = UFO_GRAVITY_PINBALL_CORE_CHARGES;
  setUfoSpaceControlLabels("救助航行", "左右操縦");
  delete document.body.dataset.ufoGravityPinball;
  delete document.body.dataset.ufoGravityPinballPhase;
  delete document.body.dataset.ufoGravityPinballScore;
  delete document.body.dataset.ufoGravityPinballOre;
}

function prepareUfoGravityPinballMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  mission.origin.copy(craftCenter).addScaledVector(forward, UFO_GRAVITY_PINBALL_BOARD_DISTANCE);
  mission.forward.copy(forward);
  mission.group.position.copy(mission.origin);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.lastCraftCenter.copy(craftCenter);
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = 30;
  mission.score = 0;
  mission.combo = 0;
  mission.bestCombo = 0;
  mission.oreLocks = 0;
  mission.charges = UFO_GRAVITY_PINBALL_CORE_CHARGES;
  mission.pulseCooldown = 0;
  mission.pulseFlash = 0;
  mission.group.visible = true;
  mission.core.group.visible = false;
  mission.core.position.set(-148, UFO_GRAVITY_PINBALL_PADDLE_Y + 48);
  mission.core.velocity.set(0, 0);
  mission.core.miningCharge = false;
  mission.core.material.color.setHex(0xfbfff3);
  mission.core.material.emissive.setHex(0x70eeff);
  mission.core.material.emissiveIntensity = 2.2;
  mission.core.light.color.setHex(0x91f7ff);
  mission.core.group.position.set(-148, UFO_GRAVITY_PINBALL_PADDLE_Y + 48, -66);
  mission.catcher.x = 0;
  mission.catcher.previousX = 0;
  mission.catcher.velocityX = 0;
  mission.catcher.group.position.x = 0;
  mission.gate.active = false;
  mission.gate.group.visible = false;
  mission.gate.light.intensity = 0;
  mission.bumpers.forEach(bumper => {
    bumper.locked = false;
    bumper.hitCooldown = 0;
    bumper.hitFlash = 0;
    bumper.root.position.set(bumper.x, bumper.y, -26);
    bumper.bodyMaterial.color.setHex(bumper.color);
    bumper.bodyMaterial.emissive.setHex(bumper.color);
    bumper.bodyMaterial.emissiveIntensity = .62;
    bumper.capMaterial.color.setHex(bumper.color);
    bumper.capMaterial.opacity = .82;
    bumper.halo.material.color.setHex(bumper.color);
    bumper.halo.material.opacity = .42;
    bumper.light.color.setHex(bumper.color);
    bumper.light.intensity = bumper.ore ? 1.7 : 1.18;
  });
  state.ufoGravityPinballState = "ready";
  state.ufoGravityPinballOre = 0;
  state.ufoGravityPinballCombo = 0;
  state.ufoGravityPinballBestCombo = 0;
  state.ufoGravityPinballCharges = mission.charges;
  document.body.dataset.ufoGravityPinball = "ready";
  document.body.dataset.ufoGravityPinballPhase = "ready";
  document.body.dataset.ufoGravityPinballScore = "0";
  document.body.dataset.ufoGravityPinballOre = "0";
  return true;
}

function activateUfoGravityPinballTestMode(control) {
  const mission = control?.spacePinball;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(mission);
  if (!prepareUfoGravityPinballMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "gravity-pinball-prototype";
  document.body.dataset.ufoSpaceMission = "gravity-pinball-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("磁場操作", "左右で移動");
  updateUfoGravityPinballHud();
  updateUfoGravityPinballLifeHud();
  showToast("重力ピンボール採掘。重力コアを発射し、左右操縦で下部磁場を合わせてください。");
  return true;
}

function startUfoGravityPinballRound() {
  const control = ufoDoorControls[0];
  const mission = control?.spacePinball;
  if (!mission?.active
    || state.map !== "space"
    || !state.ufoInSpace
    || !state.ufoBoarded
    || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoGravityPinballMission(mission);
    if (!prepareUfoGravityPinballMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  mission.core.group.visible = true;
  mission.core.position.set(-148, UFO_GRAVITY_PINBALL_PADDLE_Y + 48);
  mission.core.velocity.set(-108, UFO_GRAVITY_PINBALL_LAUNCH_SPEED * .84);
  mission.core.miningCharge = false;
  mission.core.material.color.setHex(0xfbfff3);
  mission.core.material.emissive.setHex(0x70eeff);
  mission.core.material.emissiveIntensity = 2.2;
  mission.core.light.color.setHex(0x91f7ff);
  mission.core.group.position.set(mission.core.position.x, mission.core.position.y, -66);
  mission.combo = 0;
  state.ufoGravityPinballState = "playing";
  state.ufoGravityPinballCombo = 0;
  document.body.dataset.ufoGravityPinball = "playing";
  document.body.dataset.ufoGravityPinballPhase = "playing";
  showToast("重力コアを発射。Fキーまたは重力パルスで、磁場へ戻るコアを強く押し返せます。");
  updateUfoGravityPinballHud();
  updateUfoGravityPinballLifeHud();
  return true;
}

function spawnUfoGravityPinballImpact(mission, x, y, colorValue, size = 1) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(11, 18, 32),
    new THREE.MeshBasicMaterial({
      color: colorValue,
      transparent: true,
      opacity: .9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(x, y, -75);
  mission.board.add(mesh);
  mission.effects.push({ mesh, age: 0, duration: .42 + size * .08, size: 1 + size * .55 });
}

function setUfoGravityPinballMiningCharge(mission, active) {
  const core = mission?.core;
  if (!core) return;
  core.miningCharge = active;
  core.material.color.setHex(active ? 0xffffd4 : 0xfbfff3);
  core.material.emissive.setHex(active ? 0xffbe4d : 0x70eeff);
  core.material.emissiveIntensity = active ? 3.6 : 2.2;
  core.light.color.setHex(active ? 0xffd46c : 0x91f7ff);
}

function updateUfoGravityPinballEffects(mission, delta) {
  for (let index = mission.effects.length - 1; index >= 0; index -= 1) {
    const effect = mission.effects[index];
    effect.age += delta;
    const progress = clamp(effect.age / effect.duration, 0, 1);
    effect.mesh.scale.setScalar(THREE.MathUtils.lerp(.8, effect.size * 4.5, progress));
    effect.mesh.rotation.z += delta * 5.4;
    effect.mesh.material.opacity = (1 - progress) * .9;
    if (progress < 1) continue;
    mission.board.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    effect.mesh.material.dispose();
    mission.effects.splice(index, 1);
  }
}

function updateUfoGravityPinballCatcher(control, mission, delta) {
  const craft = control?.craftAssembly;
  if (!craft) return;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const rawX = craftCenter.clone().sub(mission.origin).dot(mission.right);
  const limit = UFO_GRAVITY_PINBALL_BOARD_HALF_WIDTH - UFO_GRAVITY_PINBALL_PADDLE_HALF_WIDTH - 16;
  const nextX = clamp(rawX, -limit, limit);
  mission.catcher.velocityX = clamp((nextX - mission.catcher.previousX) / Math.max(delta, .001), -780, 780);
  mission.catcher.previousX = nextX;
  mission.catcher.x = nextX;
  mission.catcher.group.position.x = nextX;
  const movementGlow = clamp(Math.abs(mission.catcher.velocityX) / 520, 0, 1);
  mission.catcher.rail.material.opacity = .7 + movementGlow * .3;
  mission.catcher.halo.material.opacity = .12 + movementGlow * .18 + mission.pulseFlash * .34;
}

function activateUfoGravityPinballGate(mission) {
  if (mission.gate.active) return;
  mission.gate.active = true;
  mission.gate.group.visible = true;
  mission.gate.light.intensity = 3.8;
  mission.panelMaterial.emissive.setHex(0x2a1704);
  mission.panelMaterial.emissiveIntensity = 1.24;
  spawnUfoGravityPinballImpact(mission, 0, 62, 0xffde7e, 2.1);
  showToast("鉱石ロックが開放。中央の回収ゲートへ重力コアを通してください。");
}

function hitUfoGravityPinballBumper(mission, bumper) {
  const core = mission.core;
  const dx = core.position.x - bumper.root.position.x;
  const dy = core.position.y - bumper.root.position.y;
  const distance = Math.hypot(dx, dy);
  const minimumDistance = core.radius + bumper.radius;
  if (distance >= minimumDistance) return false;
  const normalX = distance > .001 ? dx / distance : 0;
  const normalY = distance > .001 ? dy / distance : 1;
  const penetration = minimumDistance - distance + .6;
  core.position.x += normalX * penetration;
  core.position.y += normalY * penetration;
  const normalSpeed = core.velocity.x * normalX + core.velocity.y * normalY;
  if (normalSpeed < 0) {
    core.velocity.x -= normalX * normalSpeed * 2;
    core.velocity.y -= normalY * normalSpeed * 2;
  }
  core.velocity.multiplyScalar(UFO_GRAVITY_PINBALL_BUMPER_BOOST);
  core.velocity.x += normalX * 44;
  core.velocity.y += normalY * 44;
  if (bumper.hitCooldown > 0) return true;
  bumper.hitCooldown = .095;
  bumper.hitFlash = .34;
  mission.combo = Math.min(99, mission.combo + 1);
  mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
  mission.score += (bumper.ore ? 340 : 120) * mission.combo;
  if (bumper.ore && !bumper.locked && core.miningCharge) {
    bumper.locked = true;
    setUfoGravityPinballMiningCharge(mission, false);
    mission.oreLocks += 1;
    bumper.bodyMaterial.emissive.setHex(0xfff2ad);
    bumper.bodyMaterial.emissiveIntensity = 2.25;
    bumper.capMaterial.color.setHex(0xfff3a7);
    spawnUfoGravityPinballImpact(mission, bumper.root.position.x, bumper.root.position.y, 0xffdf77, 1.65);
    if (mission.oreLocks >= UFO_GRAVITY_PINBALL_REQUIRED_ORE_LOCKS) activateUfoGravityPinballGate(mission);
  } else {
    spawnUfoGravityPinballImpact(
      mission,
      bumper.root.position.x,
      bumper.root.position.y,
      bumper.ore ? 0x7a91a7 : bumper.color,
      .9,
    );
  }
  return true;
}

function finishUfoGravityPinballRound(mission) {
  if (mission.phase !== "playing") return;
  mission.phase = "complete";
  mission.core.velocity.set(0, 0);
  mission.core.group.visible = false;
  mission.gate.light.intensity = 6.2;
  mission.score += 2400 + Math.ceil(mission.timeRemaining * 40);
  state.ufoGravityPinballState = "complete";
  state.ufoGravityPinballOre = mission.oreLocks;
  state.ufoGravityPinballCombo = mission.combo;
  state.ufoGravityPinballBestCombo = mission.bestCombo;
  document.body.dataset.ufoGravityPinball = "complete";
  document.body.dataset.ufoGravityPinballPhase = "complete";
  document.body.dataset.ufoGravityPinballScore = String(mission.score);
  spawnUfoGravityPinballImpact(mission, 0, 62, 0xffffff, 2.8);
  showToast("採掘コアを回収しました。物理連鎖の試作は成功です。");
}

function drainUfoGravityPinballCore(mission) {
  mission.charges = Math.max(0, mission.charges - 1);
  mission.combo = 0;
  mission.core.velocity.set(0, 0);
  mission.core.group.visible = false;
  mission.phase = mission.charges > 0 && mission.timeRemaining > 0 ? "ready" : "failed";
  state.ufoGravityPinballState = mission.phase;
  state.ufoGravityPinballCombo = 0;
  state.ufoGravityPinballCharges = mission.charges;
  document.body.dataset.ufoGravityPinball = mission.phase;
  document.body.dataset.ufoGravityPinballPhase = mission.phase;
  showToast(mission.phase === "ready"
    ? "重力コアが散逸。残りコアを再発射できます。"
    : "採掘コアが尽きました。最初から再挑戦できます。");
}

function handleUfoGravityPinballAction() {
  const mission = ufoDoorControls[0]?.spacePinball;
  if (!mission?.active || mission.phase !== "playing" || mission.pulseCooldown > 0) return false;
  const dx = mission.core.position.x - mission.catcher.x;
  const dy = mission.core.position.y - UFO_GRAVITY_PINBALL_PADDLE_Y;
  if (Math.hypot(dx, dy) > UFO_GRAVITY_PINBALL_PULSE_RANGE) {
    showToast("重力パルスの有効範囲外です。下部磁場へ近づくコアに合わせてください。");
    return false;
  }
  mission.pulseCooldown = UFO_GRAVITY_PINBALL_PULSE_COOLDOWN;
  mission.pulseFlash = .22;
  setUfoGravityPinballMiningCharge(mission, true);
  mission.core.velocity.y = Math.max(mission.core.velocity.y, UFO_GRAVITY_PINBALL_PULSE_BOOST);
  mission.core.velocity.x += clamp(dx * 2.25, -260, 260) + mission.catcher.velocityX * .19;
  mission.combo = Math.min(99, mission.combo + 1);
  mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
  mission.score += 70 * mission.combo;
  spawnUfoGravityPinballImpact(mission, mission.catcher.x, UFO_GRAVITY_PINBALL_PADDLE_Y, 0x88f8ff, 1.18);
  return true;
}

function updateUfoGravityPinballMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  const mission = control?.spacePinball;
  if (!mission?.active) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  mission.pulseCooldown = Math.max(0, mission.pulseCooldown - frameDelta);
  mission.pulseFlash = Math.max(0, mission.pulseFlash - frameDelta);
  updateUfoGravityPinballCatcher(control, mission, frameDelta);
  mission.bumpers.forEach(bumper => {
    bumper.hitCooldown = Math.max(0, bumper.hitCooldown - frameDelta);
    bumper.hitFlash = Math.max(0, bumper.hitFlash - frameDelta);
    if (bumper.orbit) {
      const phase = mission.elapsed * bumper.orbit.speed + bumper.orbit.phase;
      bumper.root.position.x = Math.cos(phase) * bumper.orbit.radius;
      bumper.root.position.y = bumper.orbit.baseY + Math.sin(phase) * bumper.orbit.radius * .46;
    }
    bumper.halo.rotation.z += frameDelta * (bumper.locked ? 2.1 : 1.05);
    bumper.halo.scale.setScalar(1 + bumper.hitFlash * .38 + (bumper.locked ? .08 : 0));
    bumper.halo.material.opacity = .36 + bumper.hitFlash * .52 + (bumper.locked ? .22 : 0);
    bumper.light.intensity = (bumper.ore ? 1.7 : 1.18) + bumper.hitFlash * 3.6 + (bumper.locked ? 1.15 : 0);
  });
  mission.gate.ring.rotation.z += frameDelta * 1.9;
  mission.gate.field.material.opacity = mission.gate.active ? .17 + Math.sin(mission.elapsed * 5) * .06 : .18;
  mission.gate.light.intensity = mission.gate.active ? 3.5 + Math.sin(mission.elapsed * 4) * .7 : 0;
  mission.launchRail.material.opacity = mission.phase === "ready" ? .28 + Math.sin(mission.elapsed * 3) * .08 : .1;
  updateUfoGravityPinballEffects(mission, frameDelta);

  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - frameDelta);
    const core = mission.core;
    core.velocity.y -= UFO_GRAVITY_PINBALL_GRAVITY * frameDelta;
    core.position.addScaledVector(core.velocity, frameDelta);
    const halfWidth = UFO_GRAVITY_PINBALL_BOARD_HALF_WIDTH;
    const halfHeight = UFO_GRAVITY_PINBALL_BOARD_HALF_HEIGHT;
    if (core.position.x - core.radius < -halfWidth) {
      core.position.x = -halfWidth + core.radius;
      core.velocity.x = Math.abs(core.velocity.x) * .98;
      spawnUfoGravityPinballImpact(mission, -halfWidth, core.position.y, 0x65edff, .7);
    } else if (core.position.x + core.radius > halfWidth) {
      core.position.x = halfWidth - core.radius;
      core.velocity.x = -Math.abs(core.velocity.x) * .98;
      spawnUfoGravityPinballImpact(mission, halfWidth, core.position.y, 0x65edff, .7);
    }
    if (core.position.y + core.radius > halfHeight) {
      core.position.y = halfHeight - core.radius;
      core.velocity.y = -Math.abs(core.velocity.y) * .97;
      spawnUfoGravityPinballImpact(mission, core.position.x, halfHeight, 0x7eeeff, .8);
    }
    mission.bumpers.forEach(bumper => hitUfoGravityPinballBumper(mission, bumper));

    if (mission.gate.active
      && Math.hypot(core.position.x - mission.gate.group.position.x, core.position.y - mission.gate.group.position.y)
        <= mission.gate.radius - core.radius * .12) {
      finishUfoGravityPinballRound(mission);
    } else {
      const aboveCatcher = core.position.y - core.radius <= UFO_GRAVITY_PINBALL_PADDLE_Y + 16
        && core.position.y >= UFO_GRAVITY_PINBALL_PADDLE_Y - 64;
      const insideCatcher = Math.abs(core.position.x - mission.catcher.x)
        <= UFO_GRAVITY_PINBALL_PADDLE_HALF_WIDTH + core.radius;
      if (aboveCatcher && insideCatcher && core.velocity.y < 0) {
        core.position.y = UFO_GRAVITY_PINBALL_PADDLE_Y + 16 + core.radius;
        core.velocity.y = Math.abs(core.velocity.y) * 1.08 + 150;
        core.velocity.x += clamp(
          (core.position.x - mission.catcher.x) * 2.1 + mission.catcher.velocityX * .22,
          -430,
          430,
        );
        setUfoGravityPinballMiningCharge(mission, true);
        mission.combo = Math.min(99, mission.combo + 1);
        mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
        mission.score += 90 * mission.combo;
        spawnUfoGravityPinballImpact(mission, core.position.x, UFO_GRAVITY_PINBALL_PADDLE_Y, 0x9cfcff, 1.12);
      } else if (core.position.y < -halfHeight - core.radius * 1.6) {
        drainUfoGravityPinballCore(mission);
      }
    }
    if (mission.timeRemaining <= 0 && mission.phase === "playing") {
      mission.phase = "failed";
      mission.core.group.visible = false;
      state.ufoGravityPinballState = "failed";
      document.body.dataset.ufoGravityPinball = "failed";
      document.body.dataset.ufoGravityPinballPhase = "failed";
      showToast("採掘時間が終了しました。最初から重力コアを再装填できます。");
    }
    core.group.position.set(core.position.x, core.position.y, -66);
    core.ringA.rotation.z += frameDelta * 6.8;
    core.ringB.rotation.y += frameDelta * 5.4;
    core.light.intensity = 3.1 + Math.sin(mission.elapsed * 11) * .65;
  }

  state.ufoGravityPinballOre = mission.oreLocks;
  state.ufoGravityPinballCombo = mission.combo;
  state.ufoGravityPinballBestCombo = mission.bestCombo;
  state.ufoGravityPinballCharges = mission.charges;
  document.body.dataset.ufoGravityPinballScore = String(Math.round(mission.score));
  document.body.dataset.ufoGravityPinballOre = String(mission.oreLocks);
  updateUfoGravityPinballHud();
  updateUfoGravityPinballLifeHud();
}

function updateUfoGravityPinballLifeHud() {
  const mission = ufoDoorControls[0]?.spacePinball;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const seconds = Math.ceil(mission.timeRemaining);
  const timePercent = clamp(mission.timeRemaining / 30 * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "採掘時間";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${seconds}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${timePercent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "下部磁場で受けた帯電コアだけが鉱石を開放します"
      : mission.phase === "playing"
        ? "コアを落とさず、鉱石ロックを連鎖させます"
        : mission.phase === "complete"
          ? "中央ゲートから採掘コアを回収しました"
          : "採掘を最初から再挑戦できます";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && seconds <= 8 ? "true" : "false";
}

function updateUfoGravityPinballHud() {
  const mission = ufoDoorControls[0]?.spacePinball;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && mission?.active
    && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "UFO グラビティ・ピンボール採掘", first: "鉱石", second: "連鎖", third: "残機" });
  const phaseLabel = mission.phase === "ready" ? "発射待機"
    : mission.phase === "playing" ? `残り ${Math.ceil(mission.timeRemaining)}秒`
      : mission.phase === "complete" ? "採掘成功"
        : "再挑戦";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${mission.oreLocks}/${UFO_GRAVITY_PINBALL_REQUIRED_ORE_LOCKS}`;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `×${mission.combo}`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.charges);
  const progress = mission.phase === "complete" ? 1 : clamp(mission.oreLocks / UFO_GRAVITY_PINBALL_REQUIRED_ORE_LOCKS, 0, .92);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "重力コアを発射。左右操縦で下部磁場に受け、帯電したコアで鉱石を開放します。"
      : mission.phase === "playing"
        ? mission.gate.active
          ? "中央の回収ゲートが開きました。コアを通して採掘を完了してください。"
          : "磁場で受けた帯電コアを物理的に跳ね返し、金色の鉱石ロックを3つ開放してください。"
        : mission.phase === "complete"
          ? `採掘スコア ${Math.round(mission.score).toLocaleString("ja-JP")}。もう一度試せます。`
          : "重力コアを再装填して、最初から採掘できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready"
      ? (mission.charges < UFO_GRAVITY_PINBALL_CORE_CHARGES ? "残りコアを発射" : "重力コアを発射")
      : "採掘を再挑戦";
    els.ufoSpaceStartButton.setAttribute("aria-label", "重力コアを発射して採掘を開始");
  }
  if (els.ufoSpaceFireButton) {
    const canPulse = mission.phase === "playing" && mission.pulseCooldown <= 0;
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canPulse;
    els.ufoSpaceFireButton.textContent = mission.pulseCooldown > 0
      ? `重力パルス ${mission.pulseCooldown.toFixed(1)}`
      : "重力パルス";
    els.ufoSpaceFireButton.setAttribute("aria-label", "重力コアを押し返す重力パルス");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.cooldown = mission.pulseCooldown > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.hit = mission.pulseFlash > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.tethered = "false";
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Second physical arcade trial: space coin pusher salvage port ------------------
// The port is a physical front-facing tray rather than a shooter lane. The UFO moves
// the wide gravity pusher left/right; a press sends that pusher down through the
// stack. Pieces only leave the tray when the player's push and the resulting piece
// contacts carry them through the central collection aperture.
function makeUfoSalvagePortMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-salvage-port-mission";
  group.visible = false;

  const port = new THREE.Group();
  port.name = "ufo-salvage-port-tray";
  group.add(port);

  const width = UFO_SALVAGE_PORT_HALF_WIDTH;
  const height = UFO_SALVAGE_PORT_HALF_HEIGHT;
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x152636,
    metalness: .78,
    roughness: .24,
    emissive: 0x07131f,
    emissiveIntensity: .72,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, height * 2), panelMaterial);
  panel.name = "salvage-port-deck";
  panel.position.z = 4;
  port.add(panel);

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 2 + 44, height * 2 + 44, 32),
    new THREE.MeshStandardMaterial({
      color: 0x050a10,
      metalness: .88,
      roughness: .18,
      emissive: 0x010509,
      emissiveIntensity: .5,
    }),
  );
  backing.name = "salvage-port-backing";
  backing.position.z = 22;
  port.add(backing);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x6edaf4,
    metalness: .72,
    roughness: .16,
    emissive: 0x1d7899,
    emissiveIntensity: 1.15,
  });
  [
    [0, height + 12, width * 2 + 34, 16],
    [-width - 12, 0, 16, height * 2 + 34],
    [width + 12, 0, 16, height * 2 + 34],
  ].forEach(([x, y, frameWidth, frameHeight], index) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, 18),
      frameMaterial.clone(),
    );
    rail.name = `salvage-port-frame-${index + 1}`;
    rail.position.set(x, y, -12);
    port.add(rail);
  });

  const lipMaterial = new THREE.MeshStandardMaterial({
    color: 0x344a58,
    metalness: .92,
    roughness: .22,
    emissive: 0x0a151d,
    emissiveIntensity: .6,
  });
  const lipY = UFO_SALVAGE_PORT_COLLECTION_LINE_Y;
  const gateHalf = UFO_SALVAGE_PORT_COLLECTION_GATE_HALF_WIDTH;
  [
    [-(width + gateHalf) / 2, lipY, width - gateHalf, 22],
    [(width + gateHalf) / 2, lipY, width - gateHalf, 22],
  ].forEach(([x, y, railWidth, railHeight], index) => {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(railWidth, railHeight, 18), lipMaterial.clone());
    lip.name = `salvage-port-retaining-lip-${index + 1}`;
    lip.position.set(x, y, -20);
    port.add(lip);
  });

  const collection = new THREE.Group();
  collection.name = "salvage-port-collection-bay";
  collection.position.set(0, lipY - 19, -36);
  const collectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(gateHalf * .78, 7, 12, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffd477,
      transparent: true,
      opacity: .8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const collectionField = new THREE.Mesh(
    new THREE.CircleGeometry(gateHalf * .7, 42),
    new THREE.MeshBasicMaterial({
      color: 0x4feaff,
      transparent: true,
      opacity: .16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  collectionField.position.z = 4;
  const collectionLight = new THREE.PointLight(0x83f7ff, 2.7, 570, 1.7);
  collectionLight.position.z = -120;
  collectionLight.userData.nonCollidable = true;
  collection.add(collectionRing, collectionField, collectionLight);
  port.add(collection);

  const pusher = new THREE.Group();
  pusher.name = "salvage-port-gravity-pusher";
  const pusherBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3a46,
    metalness: .9,
    roughness: .16,
    emissive: 0x12364a,
    emissiveIntensity: .9,
  });
  const pusherBody = new THREE.Mesh(
    new THREE.BoxGeometry(UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH * 2, UFO_SALVAGE_PORT_PUSHER_HALF_HEIGHT * 2, 22),
    pusherBodyMaterial,
  );
  const pusherBlade = new THREE.Mesh(
    new THREE.BoxGeometry(UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH * 1.76, 7, 8),
    new THREE.MeshBasicMaterial({
      color: 0x8ffaff,
      transparent: true,
      opacity: .84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pusherBlade.position.z = -16;
  const pusherHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH * 2.2, 56),
    new THREE.MeshBasicMaterial({
      color: 0x3adeff,
      transparent: true,
      opacity: .15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  pusherHalo.position.z = -28;
  pusher.add(pusherBody, pusherBlade, pusherHalo);
  pusher.position.set(0, UFO_SALVAGE_PORT_PUSHER_REST_Y, -60);
  port.add(pusher);

  const guideMaterial = new THREE.MeshBasicMaterial({
    color: 0x55dcff,
    transparent: true,
    opacity: .3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  [-UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH * .72, UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH * .72].forEach((x, index) => {
    const guide = new THREE.Mesh(new THREE.BoxGeometry(6, 400, 7), guideMaterial.clone());
    guide.name = `salvage-port-pusher-guide-${index + 1}`;
    guide.position.set(x, 16, -28);
    port.add(guide);
  });

  const pieceGeometry = new THREE.CylinderGeometry(1, 1, 12, 24);
  const rimGeometry = new THREE.TorusGeometry(1.16, .11, 8, 28);
  const pieceDefinitions = [
    [-252, -164, 27, 1, 0x8edcff], [-180, -164, 32, 2, 0x6fe6b2], [-100, -164, 25, 1, 0xffc56f],
    [-25, -164, 31, 2, 0xb99cff], [58, -164, 26, 1, 0x79d5ff], [133, -164, 33, 2, 0xffb1a1], [222, -164, 28, 1, 0x8bd97e],
    [-218, -100, 30, 2, 0xffcc7d], [-140, -100, 25, 1, 0x76daf4], [-64, -100, 31, 2, 0xc4a2ff],
    [18, -100, 27, 1, 0x8ce0a8], [92, -100, 33, 2, 0xffa9bb], [180, -100, 26, 1, 0x6ccfff],
    [-174, -37, 28, 1, 0x90e2ba], [-98, -37, 32, 2, 0xffbc73], [-18, -37, 25, 1, 0xa9b7ff],
    [60, -37, 30, 2, 0x79d9ff], [140, -37, 27, 1, 0xff9f94],
    [-116, 28, 29, 2, 0x7de3ce], [-36, 28, 24, 1, 0xffd784], [40, 28, 30, 2, 0xbda4ff], [116, 28, 26, 1, 0x74d6f8],
  ];
  const pieces = pieceDefinitions.map(([x, y, radius, value, tint], index) => {
    const root = new THREE.Group();
    root.name = `salvage-port-resource-${index + 1}`;
    const material = new THREE.MeshStandardMaterial({
      color: tint,
      metalness: .65,
      roughness: .2,
      emissive: tint,
      emissiveIntensity: .5,
    });
    const body = new THREE.Mesh(pieceGeometry, material);
    body.scale.set(radius, radius, 1);
    body.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(
      rimGeometry,
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: .6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    rim.scale.setScalar(radius);
    rim.position.z = -8;
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(radius * .38, 18),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: .25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    cap.position.z = -10;
    root.add(body, rim, cap);
    root.position.set(x, y, -58);
    port.add(root);
    return {
      root,
      material,
      rim,
      cap,
      radius,
      mass: radius / 12 + value * .65,
      value,
      tint,
      home: new THREE.Vector2(x, y),
      position: new THREE.Vector2(x, y),
      velocity: new THREE.Vector2(),
      active: true,
      flash: 0,
      spin: 0,
    };
  });

  const portLight = new THREE.PointLight(0x7ee7ff, 2.6, 1300, 1.7);
  portLight.position.set(0, 24, -240);
  portLight.userData.nonCollidable = true;
  port.add(portLight);

  return {
    group,
    port,
    panelMaterial,
    pieces,
    pusher: {
      group: pusher,
      bodyMaterial: pusherBodyMaterial,
      blade: pusherBlade,
      halo: pusherHalo,
      x: 0,
      previousX: 0,
      velocityX: 0,
      y: UFO_SALVAGE_PORT_PUSHER_REST_Y,
      velocityY: 0,
      phase: "ready",
      cooldown: 0,
      flash: 0,
      strokes: 0,
    },
    collection: { group: collection, ring: collectionRing, field: collectionField, light: collectionLight, flash: 0 },
    effects: [],
    active: false,
    phase: "idle",
    elapsed: 0,
    timeRemaining: UFO_SALVAGE_PORT_DURATION,
    collected: 0,
    collectedValue: 0,
    chain: 0,
    bestChain: 0,
    lastCollectionAt: -Infinity,
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    testMode: false,
  };
}

function isUfoSpaceArcadeMissionActive(control = ufoDoorControls[0]) {
  return Boolean(
    control?.spaceForwardScroll?.active
    || control?.spaceStarMining?.active
    || control?.spacePinball?.active
    || control?.spaceSalvage?.active
    || control?.spaceBowling?.active
    || control?.spaceRingBattle?.active
    || control?.spaceCranePort?.active
    || control?.spaceGravityMaze?.active
    || control?.spaceInertiaSlingshot?.active
    || control?.spaceSolarSail?.active
    || control?.spaceMarsRace?.active,
  );
}

function isUfoSpacePlanetariumFreeFlight(control = ufoDoorControls[0]) {
  return Boolean(
    state.map === "space"
    && state.ufoInSpace
    && !state.ufoSpaceEscapePending
    && !isUfoSpaceArcadeMissionActive(control)
    && (!control?.spaceRescue || control.spaceRescue.phase === "idle"),
  );
}

function hideUfoPlanetariumMissionHud() {
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = true;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = true;
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceStartButton) {
    els.ufoSpaceStartButton.hidden = true;
    els.ufoSpaceStartButton.disabled = true;
  }
  if (els.ufoSpaceFireButton) els.ufoSpaceFireButton.disabled = true;
}

function isUfoSpaceLateralLegacyMissionActive(control = ufoDoorControls[0]) {
  // Earlier prototypes intentionally reduced the control set to a lateral
  // lane.  Keep that compatibility only while one of those missions is
  // actually active; free navigation (including the mining garden) must not
  // inherit the old left/right-only branch.
  return Boolean(
    control?.spacePinball?.active
    || control?.spaceSalvage?.active
    || control?.spaceBowling?.active
    || control?.spaceRingBattle?.active
    || control?.spaceCranePort?.active
    || control?.spaceGravityMaze?.active
    || control?.spaceInertiaSlingshot?.active
    || control?.spaceSolarSail?.active
    || control?.spaceMarsRace?.active
    || (control?.spaceRescue && control.spaceRescue.phase !== "idle"),
  );
}

function removeUfoSalvagePortEffects(mission) {
  mission?.effects?.forEach(effect => {
    mission.port.remove(effect.mesh);
    effect.mesh.geometry?.dispose?.();
    effect.mesh.material?.dispose?.();
  });
  if (mission?.effects) mission.effects.length = 0;
}

function resetUfoSalvagePortMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_SALVAGE_PORT_DURATION;
  mission.collected = 0;
  mission.collectedValue = 0;
  mission.chain = 0;
  mission.bestChain = 0;
  mission.lastCollectionAt = -Infinity;
  mission.group.visible = false;
  mission.pusher.x = 0;
  mission.pusher.previousX = 0;
  mission.pusher.velocityX = 0;
  mission.pusher.y = UFO_SALVAGE_PORT_PUSHER_REST_Y;
  mission.pusher.velocityY = 0;
  mission.pusher.phase = "ready";
  mission.pusher.cooldown = 0;
  mission.pusher.flash = 0;
  mission.pusher.strokes = 0;
  mission.pusher.group.position.set(0, UFO_SALVAGE_PORT_PUSHER_REST_Y, -60);
  mission.pusher.bodyMaterial.emissiveIntensity = .9;
  mission.pusher.blade.material.opacity = .84;
  mission.pusher.halo.material.opacity = .15;
  mission.collection.flash = 0;
  mission.collection.ring.material.opacity = .8;
  mission.collection.field.material.opacity = .16;
  mission.collection.light.intensity = 2.7;
  mission.pieces.forEach(piece => {
    piece.position.copy(piece.home);
    piece.velocity.set(0, 0);
    piece.active = true;
    piece.flash = 0;
    piece.spin = 0;
    piece.root.position.set(piece.home.x, piece.home.y, -58);
    piece.root.rotation.set(0, 0, 0);
    piece.root.visible = true;
    piece.material.color.setHex(piece.tint);
    piece.material.emissive.setHex(piece.tint);
    piece.material.emissiveIntensity = .5;
    piece.rim.material.opacity = .6;
    piece.cap.material.opacity = .25;
  });
  removeUfoSalvagePortEffects(mission);
  state.ufoSalvagePortState = "idle";
  state.ufoSalvagePortCollected = 0;
  state.ufoSalvagePortChain = 0;
  state.ufoSalvagePortBestChain = 0;
  state.ufoSalvagePortRemaining = mission.pieces.length;
  delete document.body.dataset.ufoSalvagePort;
  delete document.body.dataset.ufoSalvagePortPhase;
  delete document.body.dataset.ufoSalvagePortCollected;
  delete document.body.dataset.ufoSalvagePortChain;
  delete document.body.dataset.ufoSalvagePortRemaining;
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoSalvagePortMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  mission.origin.copy(craftCenter).addScaledVector(forward, UFO_SALVAGE_PORT_DISTANCE);
  mission.forward.copy(forward);
  mission.group.position.copy(mission.origin);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_SALVAGE_PORT_DURATION;
  mission.collected = 0;
  mission.collectedValue = 0;
  mission.chain = 0;
  mission.bestChain = 0;
  mission.lastCollectionAt = -Infinity;
  mission.group.visible = true;
  mission.pusher.x = 0;
  mission.pusher.previousX = 0;
  mission.pusher.velocityX = 0;
  mission.pusher.y = UFO_SALVAGE_PORT_PUSHER_REST_Y;
  mission.pusher.velocityY = 0;
  mission.pusher.phase = "ready";
  mission.pusher.cooldown = 0;
  mission.pusher.flash = 0;
  mission.pusher.strokes = 0;
  mission.pusher.group.position.set(0, UFO_SALVAGE_PORT_PUSHER_REST_Y, -60);
  mission.collection.flash = 0;
  mission.pieces.forEach(piece => {
    piece.position.copy(piece.home);
    piece.velocity.set(0, 0);
    piece.active = true;
    piece.flash = 0;
    piece.spin = 0;
    piece.root.position.set(piece.home.x, piece.home.y, -58);
    piece.root.rotation.set(0, 0, 0);
    piece.root.visible = true;
    piece.material.color.setHex(piece.tint);
    piece.material.emissive.setHex(piece.tint);
    piece.material.emissiveIntensity = .5;
    piece.rim.material.opacity = .6;
    piece.cap.material.opacity = .25;
  });
  removeUfoSalvagePortEffects(mission);
  state.ufoSalvagePortState = "ready";
  state.ufoSalvagePortCollected = 0;
  state.ufoSalvagePortChain = 0;
  state.ufoSalvagePortBestChain = 0;
  state.ufoSalvagePortRemaining = mission.pieces.length;
  document.body.dataset.ufoSalvagePort = "ready";
  document.body.dataset.ufoSalvagePortPhase = "ready";
  document.body.dataset.ufoSalvagePortCollected = "0";
  document.body.dataset.ufoSalvagePortChain = "0";
  document.body.dataset.ufoSalvagePortRemaining = String(mission.pieces.length);
  return true;
}

function activateUfoSalvagePortTestMode(control) {
  const mission = control?.spaceSalvage;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(mission);
  if (!prepareUfoSalvagePortMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "salvage-port-prototype";
  document.body.dataset.ufoSpaceMission = "salvage-port-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("港湾プッシャー", "左右で位置合わせ");
  updateUfoSalvagePortHud();
  updateUfoSalvagePortLifeHud();
  updateUfoControls();
  showToast("サルベージ港。左右で重力プッシャーを合わせ、資源片を中央の回収口へ押し落としてください。");
  return true;
}

function startUfoSalvagePortRound() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceSalvage;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoSalvagePortMission(mission);
    if (!prepareUfoSalvagePortMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  state.ufoSalvagePortState = "playing";
  document.body.dataset.ufoSalvagePort = "playing";
  document.body.dataset.ufoSalvagePortPhase = "playing";
  showToast("港を稼働。左右で位置を決め、Fキーまたは重力プッシャーで資源片を押し込みます。");
  updateUfoSalvagePortHud();
  updateUfoSalvagePortLifeHud();
  return true;
}

function startUfoSalvagePortPush() {
  const mission = ufoDoorControls[0]?.spaceSalvage;
  if (!mission?.active || mission.phase !== "playing" || mission.pusher.phase !== "ready" || mission.pusher.cooldown > 0) return false;
  mission.pusher.phase = "extending";
  mission.pusher.velocityY = -UFO_SALVAGE_PORT_PUSHER_SPEED;
  mission.pusher.cooldown = UFO_SALVAGE_PORT_PUSHER_COOLDOWN;
  mission.pusher.flash = .24;
  mission.pusher.strokes += 1;
  document.body.dataset.ufoSalvagePortAction = "pushing";
  showToast("重力プッシャーを作動。押し込んだ資源片が中央の回収口へ落ちれば回収です。");
  return true;
}

function spawnUfoSalvagePortEffect(mission, x, y, colorValue, scale = 1) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(9, 15, 28),
    new THREE.MeshBasicMaterial({
      color: colorValue,
      transparent: true,
      opacity: .9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(x, y, -80);
  mission.port.add(mesh);
  mission.effects.push({ mesh, age: 0, duration: .38 + scale * .09, scale: 1 + scale * .62 });
}

function updateUfoSalvagePortEffects(mission, delta) {
  for (let index = mission.effects.length - 1; index >= 0; index -= 1) {
    const effect = mission.effects[index];
    effect.age += delta;
    const progress = clamp(effect.age / effect.duration, 0, 1);
    effect.mesh.scale.setScalar(THREE.MathUtils.lerp(.85, effect.scale * 4.8, progress));
    effect.mesh.rotation.z += delta * 4.8;
    effect.mesh.material.opacity = (1 - progress) * .9;
    if (progress < 1) continue;
    mission.port.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    effect.mesh.material.dispose();
    mission.effects.splice(index, 1);
  }
}

function updateUfoSalvagePortPusher(control, mission, delta) {
  const craft = control?.craftAssembly;
  if (!craft) return;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const rawX = craftCenter.clone().sub(mission.origin).dot(mission.right);
  const limit = UFO_SALVAGE_PORT_HALF_WIDTH - UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH - 18;
  const nextX = clamp(rawX, -limit, limit);
  mission.pusher.velocityX = clamp((nextX - mission.pusher.previousX) / Math.max(delta, .001), -860, 860);
  mission.pusher.previousX = nextX;
  mission.pusher.x = nextX;
  mission.pusher.cooldown = Math.max(0, mission.pusher.cooldown - delta);
  mission.pusher.flash = Math.max(0, mission.pusher.flash - delta);
  if (mission.pusher.phase === "extending") {
    mission.pusher.velocityY = -UFO_SALVAGE_PORT_PUSHER_SPEED;
    mission.pusher.y += mission.pusher.velocityY * delta;
    if (mission.pusher.y <= UFO_SALVAGE_PORT_PUSHER_STROKE_Y) {
      mission.pusher.y = UFO_SALVAGE_PORT_PUSHER_STROKE_Y;
      mission.pusher.phase = "retracting";
      mission.pusher.velocityY = UFO_SALVAGE_PORT_PUSHER_SPEED;
    }
  } else if (mission.pusher.phase === "retracting") {
    mission.pusher.velocityY = UFO_SALVAGE_PORT_PUSHER_SPEED;
    mission.pusher.y += mission.pusher.velocityY * delta;
    if (mission.pusher.y >= UFO_SALVAGE_PORT_PUSHER_REST_Y) {
      mission.pusher.y = UFO_SALVAGE_PORT_PUSHER_REST_Y;
      mission.pusher.phase = "ready";
      mission.pusher.velocityY = 0;
      document.body.dataset.ufoSalvagePortAction = "ready";
    }
  } else {
    mission.pusher.velocityY = 0;
  }
  mission.pusher.group.position.set(mission.pusher.x, mission.pusher.y, -60);
  const pushing = mission.pusher.phase !== "ready";
  mission.pusher.bodyMaterial.emissiveIntensity = pushing ? 2.5 : .9;
  mission.pusher.blade.material.opacity = pushing ? .98 : .84;
  mission.pusher.halo.material.opacity = pushing ? .37 + mission.pusher.flash * .35 : .15;
}

function pushUfoSalvagePortPiece(mission, piece) {
  const pusher = mission.pusher;
  if (pusher.phase !== "extending" || !piece.active) return;
  const pusherBottom = pusher.y - UFO_SALVAGE_PORT_PUSHER_HALF_HEIGHT;
  const overlapsX = Math.abs(piece.position.x - pusher.x) <= UFO_SALVAGE_PORT_PUSHER_HALF_WIDTH + piece.radius;
  const overlapsY = piece.position.y + piece.radius >= pusherBottom
    && piece.position.y - piece.radius <= pusher.y + UFO_SALVAGE_PORT_PUSHER_HALF_HEIGHT;
  if (!overlapsX || !overlapsY || piece.position.y > pusher.y) return;
  piece.position.y = pusherBottom - piece.radius - .7;
  piece.velocity.y = Math.min(piece.velocity.y, pusher.velocityY * 1.12 - 34);
  piece.velocity.x += clamp(
    -piece.position.x * .92 + (piece.position.x - pusher.x) * .24 + pusher.velocityX * .16,
    -300,
    300,
  );
  piece.flash = .22;
  mission.pusher.flash = Math.max(mission.pusher.flash, .16);
}

function resolveUfoSalvagePortPieceCollisions(mission) {
  const pieces = mission.pieces;
  for (let firstIndex = 0; firstIndex < pieces.length; firstIndex += 1) {
    const first = pieces[firstIndex];
    if (!first.active) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < pieces.length; secondIndex += 1) {
      const second = pieces[secondIndex];
      if (!second.active) continue;
      const dx = second.position.x - first.position.x;
      const dy = second.position.y - first.position.y;
      const distance = Math.hypot(dx, dy);
      const minimum = first.radius + second.radius;
      if (distance >= minimum) continue;
      const normalX = distance > .001 ? dx / distance : (firstIndex % 2 ? 1 : -1);
      const normalY = distance > .001 ? dy / distance : 0;
      const inverseFirst = 1 / first.mass;
      const inverseSecond = 1 / second.mass;
      const overlap = minimum - distance + .35;
      const split = overlap / (inverseFirst + inverseSecond);
      first.position.x -= normalX * split * inverseFirst;
      first.position.y -= normalY * split * inverseFirst;
      second.position.x += normalX * split * inverseSecond;
      second.position.y += normalY * split * inverseSecond;
      const relativeVelocityX = second.velocity.x - first.velocity.x;
      const relativeVelocityY = second.velocity.y - first.velocity.y;
      const closingSpeed = relativeVelocityX * normalX + relativeVelocityY * normalY;
      if (closingSpeed < 0) {
        const impulse = -(1.16 * closingSpeed) / (inverseFirst + inverseSecond);
        first.velocity.x -= normalX * impulse * inverseFirst;
        first.velocity.y -= normalY * impulse * inverseFirst;
        second.velocity.x += normalX * impulse * inverseSecond;
        second.velocity.y += normalY * impulse * inverseSecond;
      }
      first.flash = Math.max(first.flash, .12);
      second.flash = Math.max(second.flash, .12);
    }
  }
}

function collectUfoSalvagePortPiece(mission, piece) {
  if (!piece.active) return;
  piece.active = false;
  piece.root.visible = false;
  mission.collected += 1;
  mission.collectedValue += piece.value;
  mission.chain = mission.elapsed - mission.lastCollectionAt <= UFO_SALVAGE_PORT_MAX_CHAIN_WINDOW
    ? mission.chain + 1
    : 1;
  mission.bestChain = Math.max(mission.bestChain, mission.chain);
  mission.lastCollectionAt = mission.elapsed;
  mission.collection.flash = .35;
  spawnUfoSalvagePortEffect(mission, piece.position.x, UFO_SALVAGE_PORT_COLLECTION_LINE_Y - 8, piece.tint, 1.1 + piece.value * .28);
  if (mission.collected >= UFO_SALVAGE_PORT_REQUIRED_COLLECTION) finishUfoSalvagePortRound(mission);
}

function finishUfoSalvagePortRound(mission) {
  if (mission.phase !== "playing") return;
  mission.phase = "complete";
  mission.pusher.phase = "ready";
  mission.pusher.y = UFO_SALVAGE_PORT_PUSHER_REST_Y;
  mission.pusher.velocityY = 0;
  mission.collection.flash = 1;
  state.ufoSalvagePortState = "complete";
  document.body.dataset.ufoSalvagePort = "complete";
  document.body.dataset.ufoSalvagePortPhase = "complete";
  showToast("サルベージ成功。資源片を規定数、回収港へ雪崩れ込ませました。");
}

function updateUfoSalvagePortPieces(mission, delta) {
  const halfWidth = UFO_SALVAGE_PORT_HALF_WIDTH;
  const gateHalf = UFO_SALVAGE_PORT_COLLECTION_GATE_HALF_WIDTH;
  mission.pieces.forEach(piece => {
    if (!piece.active) return;
    const damping = Math.exp(-3.2 * delta);
    piece.velocity.multiplyScalar(damping);
    if (mission.pusher.phase !== "ready") piece.velocity.y -= 13 * delta;
    piece.position.addScaledVector(piece.velocity, delta);
    pushUfoSalvagePortPiece(mission, piece);
    if (piece.position.x - piece.radius < -halfWidth) {
      piece.position.x = -halfWidth + piece.radius;
      piece.velocity.x = Math.abs(piece.velocity.x) * .28;
    } else if (piece.position.x + piece.radius > halfWidth) {
      piece.position.x = halfWidth - piece.radius;
      piece.velocity.x = -Math.abs(piece.velocity.x) * .28;
    }
    if (piece.position.y + piece.radius > UFO_SALVAGE_PORT_HALF_HEIGHT) {
      piece.position.y = UFO_SALVAGE_PORT_HALF_HEIGHT - piece.radius;
      piece.velocity.y = -Math.abs(piece.velocity.y) * .24;
    }
  });
  resolveUfoSalvagePortPieceCollisions(mission);
  mission.pieces.forEach(piece => {
    if (!piece.active) return;
    if (piece.position.y - piece.radius < UFO_SALVAGE_PORT_COLLECTION_LINE_Y) {
      if (Math.abs(piece.position.x) <= gateHalf) {
        collectUfoSalvagePortPiece(mission, piece);
        return;
      }
      piece.position.y = UFO_SALVAGE_PORT_COLLECTION_LINE_Y + piece.radius;
      piece.velocity.y = Math.abs(piece.velocity.y) * .18;
    }
    piece.flash = Math.max(0, piece.flash - delta);
    piece.spin += (piece.velocity.x * .011 - piece.velocity.y * .006) * delta;
    piece.root.position.set(piece.position.x, piece.position.y, -58);
    piece.root.rotation.z = piece.spin;
    piece.material.emissiveIntensity = .5 + piece.flash * 2.1;
    piece.rim.material.opacity = .6 + piece.flash * .32;
    piece.cap.material.opacity = .25 + piece.flash * .24;
  });
}

function updateUfoSalvagePortMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  const mission = control?.spaceSalvage;
  if (!mission?.active) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  mission.collection.flash = Math.max(0, mission.collection.flash - frameDelta);
  updateUfoSalvagePortPusher(control, mission, frameDelta);
  mission.collection.ring.rotation.z += frameDelta * (1.4 + mission.collection.flash * 3.6);
  mission.collection.field.material.opacity = .15 + Math.sin(mission.elapsed * 5.3) * .04 + mission.collection.flash * .22;
  mission.collection.light.intensity = 2.7 + Math.sin(mission.elapsed * 4.2) * .4 + mission.collection.flash * 4.2;
  updateUfoSalvagePortEffects(mission, frameDelta);
  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - frameDelta);
    updateUfoSalvagePortPieces(mission, frameDelta);
    if (mission.timeRemaining <= 0 && mission.phase === "playing") {
      mission.phase = "failed";
      mission.pusher.phase = "ready";
      mission.pusher.y = UFO_SALVAGE_PORT_PUSHER_REST_Y;
      state.ufoSalvagePortState = "failed";
      document.body.dataset.ufoSalvagePort = "failed";
      document.body.dataset.ufoSalvagePortPhase = "failed";
      showToast("港の稼働時間が終了しました。資源片を並べ直して再挑戦できます。");
    }
  }
  const remaining = mission.pieces.filter(piece => piece.active).length;
  state.ufoSalvagePortState = mission.phase;
  state.ufoSalvagePortCollected = mission.collected;
  state.ufoSalvagePortChain = mission.chain;
  state.ufoSalvagePortBestChain = mission.bestChain;
  state.ufoSalvagePortRemaining = remaining;
  document.body.dataset.ufoSalvagePortCollected = String(mission.collected);
  document.body.dataset.ufoSalvagePortChain = String(mission.chain);
  document.body.dataset.ufoSalvagePortRemaining = String(remaining);
  updateUfoSalvagePortHud();
  updateUfoSalvagePortLifeHud();
}

function updateUfoSalvagePortLifeHud() {
  const mission = ufoDoorControls[0]?.spaceSalvage;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const seconds = Math.ceil(mission.timeRemaining);
  const percent = clamp(mission.timeRemaining / UFO_SALVAGE_PORT_DURATION * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "港の稼働時間";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${seconds}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "UFOを左右へ動かすと、上部の重力プッシャーも同じ位置へ移動します"
      : mission.phase === "playing"
        ? "プッシャーで山を押し、中央の発光した回収口へ資源片を落としてください"
        : mission.phase === "complete"
          ? "回収港は規定数を受領しました"
          : "資源片を再配置して、最初から港を稼働できます";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && seconds <= 10 ? "true" : "false";
}

function updateUfoSalvagePortHud() {
  const mission = ufoDoorControls[0]?.spaceSalvage;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && mission?.active
    && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "宇宙コイン落とし・サルベージ港", first: "回収", second: "連鎖", third: "残り" });
  const phaseLabel = mission.phase === "ready" ? "港は停止中"
    : mission.phase === "playing" ? `残り ${Math.ceil(mission.timeRemaining)}秒`
      : mission.phase === "complete" ? "サルベージ成功"
        : "再挑戦";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${mission.collected}/${UFO_SALVAGE_PORT_REQUIRED_COLLECTION}`;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `×${mission.chain}`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.pieces.filter(piece => piece.active).length);
  const progress = mission.phase === "complete" ? 1 : clamp(mission.collected / UFO_SALVAGE_PORT_REQUIRED_COLLECTION, 0, .96);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "港を起動後、左右でプッシャーを合わせて資源片の山を押し、中央の回収口へ落とします。"
      : mission.phase === "playing"
        ? mission.pusher.phase === "ready"
          ? "Fキーまたは重力プッシャーで、狙った列を一度だけ強く押し込みます。"
          : "プッシャーが資源片を押し込んでいます。重なった資源片の雪崩れを見極めてください。"
        : mission.phase === "complete"
          ? `回収値 ${mission.collectedValue}。最大連鎖 ×${mission.bestChain}。`
          : "資源片の山を初期配置に戻して、もう一度挑戦できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "港を起動" : "港を再稼働";
    els.ufoSpaceStartButton.setAttribute("aria-label", "サルベージ港を起動して資源片を回収する");
  }
  if (els.ufoSpaceFireButton) {
    const canPush = mission.phase === "playing" && mission.pusher.phase === "ready" && mission.pusher.cooldown <= 0;
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canPush;
    els.ufoSpaceFireButton.textContent = mission.pusher.phase === "ready" ? "重力プッシャー" : "押し込み中";
    els.ufoSpaceFireButton.setAttribute("aria-label", "資源片を押し込む重力プッシャーを作動する");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.salvagePort = "true";
    els.ufoSpaceCombat.dataset.cooldown = mission.pusher.phase !== "ready" ? "true" : "false";
    els.ufoSpaceCombat.dataset.hit = mission.collection.flash > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.tethered = "false";
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Third physical arcade trial: planet demolition bowling -----------------------
// A gravity ball is bowled upward through a suspended planet crust. Each crust piece
// is an independent circular body: it only moves when the launched ball or another
// crust piece transfers force to it, then it has to fall through the extraction arc.
function makeUfoPlanetBowlingMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-planet-demolition-bowling";
  group.visible = false;

  const board = new THREE.Group();
  board.name = "planet-demolition-bowling-field";
  group.add(board);
  const width = UFO_PLANET_BOWLING_HALF_WIDTH;
  const height = UFO_PLANET_BOWLING_HALF_HEIGHT;
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111b2b,
    metalness: .8,
    roughness: .21,
    emissive: 0x07101d,
    emissiveIntensity: .76,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, height * 2), panelMaterial);
  panel.name = "planet-bowling-void-panel";
  panel.position.z = 4;
  board.add(panel);

  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 2 + 48, height * 2 + 48, 30),
    new THREE.MeshStandardMaterial({
      color: 0x03070e,
      metalness: .9,
      roughness: .18,
      emissive: 0x01030a,
      emissiveIntensity: .56,
    }),
  );
  backing.name = "planet-bowling-backing";
  backing.position.z = 22;
  board.add(backing);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ce8ff,
    metalness: .72,
    roughness: .15,
    emissive: 0x2478a1,
    emissiveIntensity: 1.12,
  });
  [
    [0, height + 12, width * 2 + 36, 16],
    [0, -height - 12, width * 2 + 36, 16],
    [-width - 12, 0, 16, height * 2 + 36],
    [width + 12, 0, 16, height * 2 + 36],
  ].forEach(([x, y, frameWidth, frameHeight], index) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, 18),
      frameMaterial.clone(),
    );
    rail.name = `planet-bowling-frame-${index + 1}`;
    rail.position.set(x, y, -12);
    board.add(rail);
  });

  const constellationMaterial = new THREE.MeshBasicMaterial({
    color: 0xb9eaff,
    transparent: true,
    opacity: .36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let index = 0; index < 34; index += 1) {
    const x = ((index * 97) % 680) - 340;
    const y = ((index * 151) % 510) - 230;
    const star = new THREE.Mesh(new THREE.CircleGeometry(index % 5 === 0 ? 2.6 : 1.35, 10), constellationMaterial.clone());
    star.position.set(x, y, -7);
    star.userData.twinklePhase = index * .71;
    board.add(star);
  }

  const shelfDefinitions = [
    { id: "lower-left", x: -228, y: -16, width: 244 },
    { id: "lower-right", x: 228, y: -16, width: 244 },
    { id: "middle", x: 0, y: 86, width: 332 },
    { id: "upper", x: 0, y: 194, width: 224 },
  ];
  const shelfMaterial = new THREE.MeshStandardMaterial({
    color: 0x303b50,
    metalness: .84,
    roughness: .19,
    emissive: 0x101a2b,
    emissiveIntensity: .82,
  });
  const shelves = shelfDefinitions.map((definition, index) => {
    const root = new THREE.Group();
    root.name = `planet-bowling-suspension-shelf-${definition.id}`;
    const body = new THREE.Mesh(new THREE.BoxGeometry(definition.width, 18, 18), shelfMaterial.clone());
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(definition.width * .9, 3.5, 6),
      new THREE.MeshBasicMaterial({
        color: index < 2 ? 0x59d8ff : 0xffbe6c,
        transparent: true,
        opacity: .72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    light.position.z = -13;
    const anchor = new THREE.Mesh(
      new THREE.TorusGeometry(13, 2.6, 8, 24),
      new THREE.MeshBasicMaterial({
        color: index < 2 ? 0x73eaff : 0xffc56b,
        transparent: true,
        opacity: .9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    anchor.position.set(0, 1, -24);
    root.add(body, light, anchor);
    root.position.set(definition.x, definition.y, -30);
    board.add(root);
    return {
      ...definition,
      root,
      body,
      light,
      anchor,
      height: 18,
      left: definition.x - definition.width / 2,
      right: definition.x + definition.width / 2,
      top: definition.y + 9,
      flash: 0,
      broken: false,
      triggerY: definition.y - 26,
    };
  });

  const collector = new THREE.Group();
  collector.name = "planet-bowling-extraction-arc";
  collector.position.set(0, UFO_PLANET_BOWLING_CAPTURE_LINE_Y + 8, -38);
  const collectorField = new THREE.Mesh(
    new THREE.PlaneGeometry(UFO_PLANET_BOWLING_CAPTURE_HALF_WIDTH * 2, 30),
    new THREE.MeshBasicMaterial({
      color: 0x72f5ff,
      transparent: true,
      opacity: .16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const collectorLine = new THREE.Mesh(
    new THREE.BoxGeometry(UFO_PLANET_BOWLING_CAPTURE_HALF_WIDTH * 2, 6, 7),
    new THREE.MeshBasicMaterial({
      color: 0xf8d581,
      transparent: true,
      opacity: .92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  collectorLine.position.z = -9;
  const collectorLight = new THREE.PointLight(0xa8f4ff, 2.8, 840, 1.7);
  collectorLight.position.z = -120;
  collectorLight.userData.nonCollidable = true;
  collector.add(collectorField, collectorLine, collectorLight);
  board.add(collector);

  const launcher = new THREE.Group();
  launcher.name = "planet-bowling-gravity-launcher";
  const launcherShell = new THREE.Mesh(
    new THREE.CylinderGeometry(38, 48, 72, 28),
    new THREE.MeshStandardMaterial({
      color: 0x233649,
      metalness: .9,
      roughness: .14,
      emissive: 0x0d3147,
      emissiveIntensity: 1.2,
    }),
  );
  const launcherMuzzle = new THREE.Mesh(
    new THREE.TorusGeometry(31, 5, 10, 32),
    new THREE.MeshBasicMaterial({
      color: 0x8df7ff,
      transparent: true,
      opacity: .92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  launcherMuzzle.position.y = 35;
  launcherMuzzle.rotation.x = Math.PI / 2;
  const launcherGuide = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 232),
    new THREE.MeshBasicMaterial({
      color: 0x73eaff,
      transparent: true,
      opacity: .24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  launcherGuide.position.set(0, 142, -18);
  launcher.add(launcherShell, launcherMuzzle, launcherGuide);
  launcher.position.set(0, -226, -62);
  board.add(launcher);

  const ballRoot = new THREE.Group();
  ballRoot.name = "planet-bowling-gravity-ball";
  const ballMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5fff8,
    metalness: .36,
    roughness: .09,
    emissive: 0x5deaff,
    emissiveIntensity: 2.25,
  });
  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(UFO_PLANET_BOWLING_BALL_RADIUS, 28, 20), ballMaterial);
  const ballRingA = new THREE.Mesh(
    new THREE.TorusGeometry(UFO_PLANET_BOWLING_BALL_RADIUS * 1.28, 2.8, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0x87f5ff,
      transparent: true,
      opacity: .84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const ballRingB = ballRingA.clone();
  ballRingB.material = ballRingA.material.clone();
  ballRingB.rotation.x = Math.PI / 2;
  const ballLight = new THREE.PointLight(0x8effff, 3.4, 680, 1.7);
  ballLight.position.z = -84;
  ballLight.userData.nonCollidable = true;
  ballRoot.add(ballMesh, ballRingA, ballRingB, ballLight);
  ballRoot.position.set(0, -204, -68);
  board.add(ballRoot);

  const chunkDefinitions = [
    { x: -310, y: 30, radius: 34, mass: 4.8, tint: 0xd87559, shelf: "lower-left" },
    { x: -232, y: 28, radius: 32, mass: 4.4, tint: 0xe6a45d, shelf: "lower-left" },
    { x: -151, y: 31, radius: 35, mass: 5.1, tint: 0x9f6dc7, shelf: "lower-left" },
    { x: 152, y: 31, radius: 35, mass: 5.1, tint: 0x6fa9d6, shelf: "lower-right" },
    { x: 232, y: 28, radius: 32, mass: 4.4, tint: 0xdb8e67, shelf: "lower-right" },
    { x: 310, y: 30, radius: 34, mass: 4.8, tint: 0x8fb870, shelf: "lower-right" },
    { x: -122, y: 126, radius: 32, mass: 4.5, tint: 0xf0b66e, shelf: "middle" },
    { x: -43, y: 130, radius: 36, mass: 5.4, tint: 0x8d8ee2, shelf: "middle" },
    { x: 43, y: 126, radius: 32, mass: 4.5, tint: 0x7bc3c9, shelf: "middle" },
    { x: 117, y: 130, radius: 36, mass: 5.4, tint: 0xd47a72, shelf: "middle" },
    { x: -73, y: 235, radius: 31, mass: 4.3, tint: 0x8fd59d, shelf: "upper" },
    { x: 0, y: 246, radius: 42, mass: 7.8, tint: 0xffd36f, shelf: "upper", core: true },
    { x: 76, y: 235, radius: 31, mass: 4.3, tint: 0x82a8ed, shelf: "upper" },
  ];
  const chunkGeometry = new THREE.IcosahedronGeometry(1, 1);
  const chunks = chunkDefinitions.map((definition, index) => {
    const root = new THREE.Group();
    root.name = `planet-bowling-crust-${index + 1}`;
    const material = new THREE.MeshStandardMaterial({
      color: definition.tint,
      metalness: .44,
      roughness: .46,
      emissive: definition.tint,
      emissiveIntensity: .34,
    });
    const body = new THREE.Mesh(chunkGeometry, material);
    body.scale.setScalar(definition.radius);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(definition.radius * .84, 2.4, 8, 28),
      new THREE.MeshBasicMaterial({
        color: definition.tint,
        transparent: true,
        opacity: definition.core ? .88 : .5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = -20;
    const crack = new THREE.Mesh(
      new THREE.PlaneGeometry(definition.radius * 1.28, 4),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    crack.rotation.z = index * .61;
    crack.position.z = -definition.radius * .25 - 4;
    root.add(body, ring, crack);
    root.position.set(definition.x, definition.y, -58);
    board.add(root);
    return {
      ...definition,
      root,
      material,
      ring,
      crack,
      position: new THREE.Vector2(definition.x, definition.y),
      home: new THREE.Vector2(definition.x, definition.y),
      velocity: new THREE.Vector2(),
      radius: definition.radius,
      mass: definition.mass,
      active: true,
      previousY: definition.y,
      angularVelocity: 0,
      spin: index * .27,
      impact: 0,
      cracked: 0,
      kind: "crust",
    };
  });

  const boardLight = new THREE.PointLight(0x8edfff, 2.9, 1500, 1.7);
  boardLight.position.set(0, 28, -240);
  boardLight.userData.nonCollidable = true;
  board.add(boardLight);
  return {
    group,
    board,
    panelMaterial,
    shelves,
    collector: { group: collector, field: collectorField, line: collectorLine, light: collectorLight, flash: 0 },
    launcher: { group: launcher, shell: launcherShell, muzzle: launcherMuzzle, guide: launcherGuide, x: 0, previousX: 0, velocityX: 0 },
    ball: {
      root: ballRoot,
      material: ballMaterial,
      ringA: ballRingA,
      ringB: ballRingB,
      light: ballLight,
      position: new THREE.Vector2(),
      velocity: new THREE.Vector2(),
      radius: UFO_PLANET_BOWLING_BALL_RADIUS,
      mass: UFO_PLANET_BOWLING_BALL_MASS,
      active: false,
      ready: false,
      reloadTimer: 0,
      age: 0,
      previousY: -204,
      spin: 0,
      kind: "ball",
    },
    chunks,
    effects: [],
    active: false,
    phase: "idle",
    elapsed: 0,
    timeRemaining: UFO_PLANET_BOWLING_DURATION,
    shots: UFO_PLANET_BOWLING_SHOTS,
    demolished: 0,
    chain: 0,
    bestChain: 0,
    lastDemolitionAt: -Infinity,
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    testMode: false,
  };
}

function removeUfoPlanetBowlingEffects(mission) {
  mission?.effects?.forEach(effect => {
    mission.board.remove(effect.mesh);
    effect.mesh.geometry?.dispose?.();
    effect.mesh.material?.dispose?.();
  });
  if (mission?.effects) mission.effects.length = 0;
}

function resetUfoPlanetBowlingBodies(mission) {
  if (!mission) return;
  mission.chunks.forEach(chunk => {
    chunk.position.copy(chunk.home);
    chunk.previousY = chunk.home.y;
    chunk.velocity.set(0, 0);
    chunk.angularVelocity = 0;
    chunk.spin = 0;
    chunk.impact = 0;
    chunk.cracked = 0;
    chunk.active = true;
    chunk.root.visible = true;
    chunk.root.position.set(chunk.home.x, chunk.home.y, -58);
    chunk.root.rotation.set(0, 0, 0);
    chunk.material.color.setHex(chunk.tint);
    chunk.material.emissive.setHex(chunk.tint);
    chunk.material.emissiveIntensity = .34;
    chunk.ring.material.color.setHex(chunk.tint);
    chunk.ring.material.opacity = chunk.core ? .88 : .5;
    chunk.crack.material.opacity = 0;
  });
  mission.shelves.forEach(shelf => {
    shelf.flash = 0;
    shelf.broken = false;
    shelf.root.scale.set(1, 1, 1);
    shelf.body.visible = true;
    shelf.light.visible = true;
    shelf.anchor.visible = true;
    shelf.body.material.emissiveIntensity = .82;
    shelf.light.material.opacity = .72;
    shelf.anchor.material.opacity = .9;
  });
  mission.launcher.x = 0;
  mission.launcher.previousX = 0;
  mission.launcher.velocityX = 0;
  mission.launcher.group.position.set(0, -226, -62);
  mission.launcher.group.rotation.z = 0;
  mission.ball.position.set(0, -204);
  mission.ball.velocity.set(0, 0);
  mission.ball.active = false;
  mission.ball.ready = true;
  mission.ball.reloadTimer = 0;
  mission.ball.age = 0;
  mission.ball.previousY = -204;
  mission.ball.spin = 0;
  mission.ball.root.visible = true;
  mission.ball.root.position.set(0, -204, -68);
  mission.ball.root.rotation.set(0, 0, 0);
  mission.ball.material.emissiveIntensity = 2.25;
  mission.ball.ringA.material.opacity = .84;
  mission.ball.ringB.material.opacity = .84;
  mission.collector.flash = 0;
  mission.collector.field.material.opacity = .16;
  mission.collector.light.intensity = 2.8;
}

function resetUfoPlanetBowlingMission(mission) {
  if (!mission) return;
  removeUfoPlanetBowlingEffects(mission);
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_PLANET_BOWLING_DURATION;
  mission.shots = UFO_PLANET_BOWLING_SHOTS;
  mission.demolished = 0;
  mission.chain = 0;
  mission.bestChain = 0;
  mission.lastDemolitionAt = -Infinity;
  mission.testMode = false;
  mission.group.visible = false;
  resetUfoPlanetBowlingBodies(mission);
  state.ufoPlanetBowlingState = "idle";
  state.ufoPlanetBowlingDemolished = 0;
  state.ufoPlanetBowlingChain = 0;
  state.ufoPlanetBowlingBestChain = 0;
  state.ufoPlanetBowlingShots = UFO_PLANET_BOWLING_SHOTS;
  delete document.body.dataset.ufoPlanetBowling;
  delete document.body.dataset.ufoPlanetBowlingPhase;
  delete document.body.dataset.ufoPlanetBowlingDemolished;
  delete document.body.dataset.ufoPlanetBowlingChain;
  delete document.body.dataset.ufoPlanetBowlingShots;
  delete document.body.dataset.ufoPlanetBowlingAction;
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoPlanetBowlingMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  mission.origin.copy(craftCenter).addScaledVector(forward, UFO_PLANET_BOWLING_DISTANCE);
  mission.forward.copy(forward);
  mission.group.position.copy(mission.origin);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_PLANET_BOWLING_DURATION;
  mission.shots = UFO_PLANET_BOWLING_SHOTS;
  mission.demolished = 0;
  mission.chain = 0;
  mission.bestChain = 0;
  mission.lastDemolitionAt = -Infinity;
  mission.group.visible = true;
  resetUfoPlanetBowlingBodies(mission);
  state.ufoPlanetBowlingState = "ready";
  state.ufoPlanetBowlingDemolished = 0;
  state.ufoPlanetBowlingChain = 0;
  state.ufoPlanetBowlingBestChain = 0;
  state.ufoPlanetBowlingShots = UFO_PLANET_BOWLING_SHOTS;
  document.body.dataset.ufoPlanetBowling = "ready";
  document.body.dataset.ufoPlanetBowlingPhase = "ready";
  document.body.dataset.ufoPlanetBowlingDemolished = "0";
  document.body.dataset.ufoPlanetBowlingChain = "0";
  document.body.dataset.ufoPlanetBowlingShots = String(UFO_PLANET_BOWLING_SHOTS);
  return true;
}

function activateUfoPlanetBowlingTestMode(control) {
  const mission = control?.spaceBowling;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(mission);
  if (!prepareUfoPlanetBowlingMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "planet-bowling-prototype";
  document.body.dataset.ufoSpaceMission = "planet-bowling-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("惑星解体ボウリング", "左右で発射位置合わせ");
  updateUfoPlanetBowlingHud();
  updateUfoPlanetBowlingLifeHud();
  updateUfoControls();
  showToast("惑星解体ボウリング。左右で発射位置を合わせ、重力球で惑星殻を崩して下部の抽出帯へ落とします。");
  return true;
}

function updateUfoPlanetBowlingLauncher(control, mission, delta) {
  const craft = control?.craftAssembly;
  if (!craft) return;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const rawX = craftCenter.clone().sub(mission.origin).dot(mission.right);
  const nextX = clamp(rawX, -UFO_PLANET_BOWLING_LAUNCH_X_LIMIT, UFO_PLANET_BOWLING_LAUNCH_X_LIMIT);
  mission.launcher.velocityX = clamp((nextX - mission.launcher.previousX) / Math.max(delta, .001), -940, 940);
  mission.launcher.previousX = nextX;
  mission.launcher.x = nextX;
  mission.launcher.group.position.x = nextX;
  mission.launcher.group.rotation.z = clamp(mission.launcher.velocityX * -.00022, -.12, .12);
  mission.launcher.muzzle.material.opacity = .76 + Math.sin(mission.elapsed * 7.2) * .14;
  if (!mission.ball.active && mission.ball.ready) {
    mission.ball.position.set(nextX, -204);
    mission.ball.root.position.set(nextX, -204, -68);
  }
}

function startUfoPlanetBowlingRound() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceBowling;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoPlanetBowlingMission(mission);
    if (!prepareUfoPlanetBowlingMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  state.ufoPlanetBowlingState = "playing";
  document.body.dataset.ufoPlanetBowling = "playing";
  document.body.dataset.ufoPlanetBowlingPhase = "playing";
  document.body.dataset.ufoPlanetBowlingAction = "aiming";
  showToast("解体開始。左右で発射位置を合わせ、重力球を最大3球まで射出できます。");
  updateUfoPlanetBowlingHud();
  updateUfoPlanetBowlingLifeHud();
  return true;
}

function startUfoPlanetBowlingShot() {
  const mission = ufoDoorControls[0]?.spaceBowling;
  const ball = mission?.ball;
  if (!mission?.active || mission.phase !== "playing" || !ball?.ready || ball.active || mission.shots <= 0) return false;
  ball.active = true;
  ball.ready = false;
  ball.reloadTimer = 0;
  ball.age = 0;
  ball.position.set(mission.launcher.x, -204);
  ball.velocity.set(mission.launcher.velocityX * .1, UFO_PLANET_BOWLING_LAUNCH_SPEED);
  ball.root.visible = true;
  ball.root.position.set(ball.position.x, ball.position.y, -68);
  mission.shots -= 1;
  mission.launcher.muzzle.material.opacity = 1;
  document.body.dataset.ufoPlanetBowlingAction = "launched";
  showToast("重力球を射出。惑星殻へ当てて、崩れた破片を下部の抽出帯へ落とします。");
  return true;
}

function spawnUfoPlanetBowlingImpact(mission, x, y, tint, scale = 1) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(12, 20, 28),
    new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: .92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(x, y, -76);
  mission.board.add(mesh);
  mission.effects.push({ mesh, age: 0, duration: .46, scale });
}

function updateUfoPlanetBowlingEffects(mission, delta) {
  for (let index = mission.effects.length - 1; index >= 0; index -= 1) {
    const effect = mission.effects[index];
    effect.age += delta;
    const progress = clamp(effect.age / effect.duration, 0, 1);
    effect.mesh.scale.setScalar(THREE.MathUtils.lerp(.4, effect.scale * 3.8, progress));
    effect.mesh.rotation.z += delta * 5.5;
    effect.mesh.material.opacity = (1 - progress) * .92;
    if (progress < 1) continue;
    mission.board.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    effect.mesh.material.dispose();
    mission.effects.splice(index, 1);
  }
}

function resolveUfoPlanetBowlingContact(mission, first, second) {
  if (!first.active || !second.active) return;
  const dx = second.position.x - first.position.x;
  const dy = second.position.y - first.position.y;
  const distance = Math.hypot(dx, dy);
  const minimum = first.radius + second.radius;
  if (distance >= minimum) return;
  const normalX = distance > .001 ? dx / distance : .707;
  const normalY = distance > .001 ? dy / distance : .707;
  const inverseFirst = 1 / first.mass;
  const inverseSecond = 1 / second.mass;
  const overlap = minimum - distance + .45;
  const split = overlap / (inverseFirst + inverseSecond);
  first.position.x -= normalX * split * inverseFirst;
  first.position.y -= normalY * split * inverseFirst;
  second.position.x += normalX * split * inverseSecond;
  second.position.y += normalY * split * inverseSecond;
  const relativeVelocityX = second.velocity.x - first.velocity.x;
  const relativeVelocityY = second.velocity.y - first.velocity.y;
  const closingSpeed = relativeVelocityX * normalX + relativeVelocityY * normalY;
  if (closingSpeed >= 0) return;
  const impactSpeed = Math.abs(closingSpeed);
  const restitution = first.kind === "ball" || second.kind === "ball" ? .84 : .34;
  const impulse = -(1 + restitution) * closingSpeed / (inverseFirst + inverseSecond);
  first.velocity.x -= normalX * impulse * inverseFirst;
  first.velocity.y -= normalY * impulse * inverseFirst;
  second.velocity.x += normalX * impulse * inverseSecond;
  second.velocity.y += normalY * impulse * inverseSecond;
  first.angularVelocity -= normalX * impulse * .004;
  second.angularVelocity += normalX * impulse * .004;
  const chunk = first.kind === "crust" ? first : second.kind === "crust" ? second : null;
  if (!chunk) return;
  chunk.impact = Math.max(chunk.impact, clamp(impactSpeed / 520, .08, 1));
  if (impactSpeed >= 150 && (first.kind === "ball" || second.kind === "ball")) {
    chunk.cracked = Math.min(1, chunk.cracked + impactSpeed / 680);
    spawnUfoPlanetBowlingImpact(mission, (first.position.x + second.position.x) / 2, (first.position.y + second.position.y) / 2, chunk.tint, 1 + chunk.cracked * .8);
  }
}

function resolveUfoPlanetBowlingContacts(mission) {
  const chunks = mission.chunks;
  for (let firstIndex = 0; firstIndex < chunks.length; firstIndex += 1) {
    const first = chunks[firstIndex];
    if (!first.active) continue;
    for (let secondIndex = firstIndex + 1; secondIndex < chunks.length; secondIndex += 1) {
      const second = chunks[secondIndex];
      if (!second.active) continue;
      resolveUfoPlanetBowlingContact(mission, first, second);
    }
    if (mission.ball.active) resolveUfoPlanetBowlingContact(mission, first, mission.ball);
  }
}

function breakUfoPlanetBowlingShelf(mission, shelf) {
  if (shelf.broken) return;
  shelf.broken = true;
  shelf.flash = 1;
  shelf.body.visible = false;
  shelf.light.visible = false;
  shelf.anchor.visible = false;
  spawnUfoPlanetBowlingImpact(mission, shelf.x, shelf.y, 0xffd67b, 2.3);
  spawnUfoPlanetBowlingImpact(mission, shelf.left + 18, shelf.y, 0x74ecff, 1.2);
  spawnUfoPlanetBowlingImpact(mission, shelf.right - 18, shelf.y, 0x74ecff, 1.2);
}

function applyUfoPlanetBowlingShelfSupport(mission, body) {
  if (!body.active || body.velocity.y > 0) return;
  for (const shelf of mission.shelves) {
    if (shelf.broken) continue;
    const inside = body.position.x + body.radius * .38 > shelf.left
      && body.position.x - body.radius * .38 < shelf.right;
    const crossedTop = body.previousY - body.radius >= shelf.top - 2;
    if (!inside || !crossedTop || body.position.y - body.radius > shelf.top) continue;
    body.position.y = shelf.top + body.radius;
    body.velocity.y = Math.max(0, -body.velocity.y * .22);
    body.velocity.x *= .84;
    shelf.flash = Math.max(shelf.flash, .12);
    return;
  }
}

function collectUfoPlanetBowlingChunk(mission, chunk) {
  if (!chunk.active) return;
  chunk.active = false;
  chunk.root.visible = false;
  mission.demolished += 1;
  mission.chain = mission.elapsed - mission.lastDemolitionAt <= 1.3 ? mission.chain + 1 : 1;
  mission.bestChain = Math.max(mission.bestChain, mission.chain);
  mission.lastDemolitionAt = mission.elapsed;
  mission.collector.flash = .42;
  spawnUfoPlanetBowlingImpact(mission, chunk.position.x, UFO_PLANET_BOWLING_CAPTURE_LINE_Y + 8, chunk.tint, 1.25 + chunk.radius / 55);
  if (mission.demolished >= UFO_PLANET_BOWLING_REQUIRED_DEMOLITION) finishUfoPlanetBowlingRound(mission);
}

function finishUfoPlanetBowlingRound(mission) {
  if (mission.phase !== "playing") return;
  mission.phase = "complete";
  mission.ball.active = false;
  mission.ball.ready = false;
  mission.ball.root.visible = false;
  mission.collector.flash = 1;
  state.ufoPlanetBowlingState = "complete";
  document.body.dataset.ufoPlanetBowling = "complete";
  document.body.dataset.ufoPlanetBowlingPhase = "complete";
  showToast("惑星殻の解体に成功。抽出帯へ規定数の破片を落としました。");
}

function failUfoPlanetBowlingRound(mission) {
  if (mission.phase !== "playing") return;
  mission.phase = "failed";
  mission.ball.active = false;
  mission.ball.ready = false;
  mission.ball.root.visible = false;
  state.ufoPlanetBowlingState = "failed";
  document.body.dataset.ufoPlanetBowling = "failed";
  document.body.dataset.ufoPlanetBowlingPhase = "failed";
  showToast("重力球を使い切りました。惑星殻を初期配置に戻して再挑戦できます。");
}

function updateUfoPlanetBowlingBodies(mission, delta) {
  const ball = mission.ball;
  if (ball.active) {
    ball.age += delta;
    ball.previousY = ball.position.y;
    ball.velocity.y -= UFO_PLANET_BOWLING_GRAVITY * delta;
    ball.velocity.multiplyScalar(Math.exp(-.22 * delta));
    ball.position.addScaledVector(ball.velocity, delta);
    if (ball.velocity.y > 0) {
      mission.shelves.forEach(shelf => {
        const crossedTrigger = ball.previousY < shelf.triggerY && ball.position.y >= shelf.triggerY;
        const overlapsShelf = ball.position.x + ball.radius * .35 > shelf.left
          && ball.position.x - ball.radius * .35 < shelf.right;
        if (crossedTrigger && overlapsShelf) breakUfoPlanetBowlingShelf(mission, shelf);
      });
    }
    if (ball.position.x - ball.radius < -UFO_PLANET_BOWLING_HALF_WIDTH) {
      ball.position.x = -UFO_PLANET_BOWLING_HALF_WIDTH + ball.radius;
      ball.velocity.x = Math.abs(ball.velocity.x) * .74;
    } else if (ball.position.x + ball.radius > UFO_PLANET_BOWLING_HALF_WIDTH) {
      ball.position.x = UFO_PLANET_BOWLING_HALF_WIDTH - ball.radius;
      ball.velocity.x = -Math.abs(ball.velocity.x) * .74;
    }
    if (ball.position.y + ball.radius > UFO_PLANET_BOWLING_HALF_HEIGHT) {
      ball.position.y = UFO_PLANET_BOWLING_HALF_HEIGHT - ball.radius;
      ball.velocity.y = -Math.abs(ball.velocity.y) * .64;
    }
  }
  mission.chunks.forEach(chunk => {
    if (!chunk.active) return;
    chunk.previousY = chunk.position.y;
    chunk.velocity.y -= UFO_PLANET_BOWLING_GRAVITY * delta;
    chunk.velocity.multiplyScalar(Math.exp(-.72 * delta));
    chunk.position.addScaledVector(chunk.velocity, delta);
    if (chunk.position.x - chunk.radius < -UFO_PLANET_BOWLING_HALF_WIDTH) {
      chunk.position.x = -UFO_PLANET_BOWLING_HALF_WIDTH + chunk.radius;
      chunk.velocity.x = Math.abs(chunk.velocity.x) * .42;
    } else if (chunk.position.x + chunk.radius > UFO_PLANET_BOWLING_HALF_WIDTH) {
      chunk.position.x = UFO_PLANET_BOWLING_HALF_WIDTH - chunk.radius;
      chunk.velocity.x = -Math.abs(chunk.velocity.x) * .42;
    }
    if (chunk.position.y + chunk.radius > UFO_PLANET_BOWLING_HALF_HEIGHT) {
      chunk.position.y = UFO_PLANET_BOWLING_HALF_HEIGHT - chunk.radius;
      chunk.velocity.y = -Math.abs(chunk.velocity.y) * .28;
    }
    applyUfoPlanetBowlingShelfSupport(mission, chunk);
  });
  resolveUfoPlanetBowlingContacts(mission);
  mission.chunks.forEach(chunk => {
    if (!chunk.active) return;
    applyUfoPlanetBowlingShelfSupport(mission, chunk);
    if (chunk.position.y - chunk.radius < UFO_PLANET_BOWLING_CAPTURE_LINE_Y) {
      if (Math.abs(chunk.position.x) <= UFO_PLANET_BOWLING_CAPTURE_HALF_WIDTH) {
        collectUfoPlanetBowlingChunk(mission, chunk);
        return;
      }
      chunk.position.y = UFO_PLANET_BOWLING_CAPTURE_LINE_Y + chunk.radius;
      chunk.velocity.y = Math.abs(chunk.velocity.y) * .22;
    }
    chunk.impact = Math.max(0, chunk.impact - delta * 2.8);
    chunk.angularVelocity *= Math.exp(-2.2 * delta);
    chunk.spin += chunk.angularVelocity * delta;
    chunk.root.position.set(chunk.position.x, chunk.position.y, -58);
    chunk.root.rotation.z = chunk.spin;
    chunk.material.emissiveIntensity = .34 + chunk.impact * 1.8 + chunk.cracked * .54;
    chunk.ring.material.opacity = (chunk.core ? .62 : .38) + chunk.impact * .42;
    chunk.crack.material.opacity = chunk.cracked * .78;
  });
  if (ball.active) {
    ball.spin += (ball.velocity.x * .008 + ball.velocity.y * .003) * delta;
    ball.root.position.set(ball.position.x, ball.position.y, -68);
    ball.root.rotation.z = ball.spin;
    ball.ringA.rotation.z += delta * 5.2;
    ball.ringB.rotation.y += delta * 3.5;
    ball.material.emissiveIntensity = 2.25 + Math.sin(mission.elapsed * 10) * .45;
    if (ball.position.y + ball.radius < UFO_PLANET_BOWLING_CAPTURE_LINE_Y - 20 || ball.age > 6.6) {
      ball.active = false;
      ball.root.visible = false;
      ball.reloadTimer = mission.shots > 0 ? .58 : 0;
      document.body.dataset.ufoPlanetBowlingAction = mission.shots > 0 ? "reloading" : "spent";
    }
  } else if (ball.reloadTimer > 0) {
    ball.reloadTimer = Math.max(0, ball.reloadTimer - delta);
    if (ball.reloadTimer === 0 && mission.shots > 0 && mission.phase === "playing") {
      ball.ready = true;
      ball.root.visible = true;
      ball.position.set(mission.launcher.x, -204);
      ball.root.position.set(mission.launcher.x, -204, -68);
      document.body.dataset.ufoPlanetBowlingAction = "aiming";
    }
  }
}

function updateUfoPlanetBowlingMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  const mission = control?.spaceBowling;
  if (!mission?.active) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  mission.collector.flash = Math.max(0, mission.collector.flash - frameDelta * 1.35);
  updateUfoPlanetBowlingLauncher(control, mission, frameDelta);
  mission.collector.field.material.opacity = .14 + Math.sin(mission.elapsed * 4.6) * .05 + mission.collector.flash * .32;
  mission.collector.line.material.opacity = .72 + mission.collector.flash * .28;
  mission.collector.light.intensity = 2.8 + mission.collector.flash * 5.2;
  mission.shelves.forEach(shelf => {
    shelf.flash = Math.max(0, shelf.flash - frameDelta * 2.4);
    shelf.body.material.emissiveIntensity = .82 + shelf.flash * 1.3;
    shelf.light.material.opacity = .58 + shelf.flash * .35;
  });
  updateUfoPlanetBowlingEffects(mission, frameDelta);
  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - frameDelta);
    updateUfoPlanetBowlingBodies(mission, frameDelta);
    if (mission.timeRemaining <= 0 && mission.phase === "playing") failUfoPlanetBowlingRound(mission);
    if (!mission.ball.active && !mission.ball.ready && mission.ball.reloadTimer <= 0 && mission.shots <= 0 && mission.phase === "playing") {
      failUfoPlanetBowlingRound(mission);
    }
  }
  state.ufoPlanetBowlingState = mission.phase;
  state.ufoPlanetBowlingDemolished = mission.demolished;
  state.ufoPlanetBowlingChain = mission.chain;
  state.ufoPlanetBowlingBestChain = mission.bestChain;
  state.ufoPlanetBowlingShots = mission.shots;
  document.body.dataset.ufoPlanetBowlingDemolished = String(mission.demolished);
  document.body.dataset.ufoPlanetBowlingChain = String(mission.chain);
  document.body.dataset.ufoPlanetBowlingShots = String(mission.shots);
  updateUfoPlanetBowlingHud();
  updateUfoPlanetBowlingLifeHud();
}

function updateUfoPlanetBowlingLifeHud() {
  const mission = ufoDoorControls[0]?.spaceBowling;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const seconds = Math.ceil(mission.timeRemaining);
  const percent = clamp(mission.timeRemaining / UFO_PLANET_BOWLING_DURATION * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "解体残り時間";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${seconds}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "UFOを左右へ動かすと、下部の重力球発射位置も同じ方向へ移動します"
      : mission.phase === "playing"
        ? "重力球の衝突で惑星殻を崩し、下部の金色の抽出帯へ落としてください"
        : mission.phase === "complete"
          ? "惑星殻の解体と抽出が完了しました"
          : "重力球と惑星殻を再配置して、最初から解体できます";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && seconds <= 12 ? "true" : "false";
}

function updateUfoPlanetBowlingHud() {
  const mission = ufoDoorControls[0]?.spaceBowling;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && mission?.active
    && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "惑星解体ボウリング", first: "解体", second: "連鎖", third: "重力球" });
  const phaseLabel = mission.phase === "ready" ? "解体待機"
    : mission.phase === "playing" ? `残り ${Math.ceil(mission.timeRemaining)}秒`
      : mission.phase === "complete" ? "惑星解体成功"
        : "再挑戦";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${mission.demolished}/${UFO_PLANET_BOWLING_REQUIRED_DEMOLITION}`;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `×${mission.chain}`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = `${mission.shots}球`;
  const progress = mission.phase === "complete" ? 1 : clamp(mission.demolished / UFO_PLANET_BOWLING_REQUIRED_DEMOLITION, 0, .96);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "解体を開始後、左右で発射位置を合わせ、重力球を上へ射出して惑星殻を崩します。"
      : mission.phase === "playing"
        ? mission.ball.active
          ? "重力球が惑星殻へ衝突中です。球と殻の押し合いで、下部の抽出帯へ落とします。"
          : mission.ball.ready
            ? "次の重力球を射出できます。崩れた殻がどこへ落ちるかを見て発射位置を選んでください。"
            : "重力球を回収・再装填しています。"
        : mission.phase === "complete"
          ? `解体 ${mission.demolished}個。最大連鎖 ×${mission.bestChain}。`
          : "重力球と惑星殻を初期配置に戻して、もう一度解体できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "解体を開始" : "惑星殻を再配置";
    els.ufoSpaceStartButton.setAttribute("aria-label", "惑星解体ボウリングを開始する");
  }
  if (els.ufoSpaceFireButton) {
    const canLaunch = mission.phase === "playing" && mission.ball.ready && !mission.ball.active && mission.shots > 0;
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canLaunch;
    els.ufoSpaceFireButton.textContent = mission.ball.active ? "衝突中" : mission.ball.ready ? "重力球を射出" : "再装填中";
    els.ufoSpaceFireButton.setAttribute("aria-label", "重力球を射出して惑星殻を崩す");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.planetBowling = "true";
    els.ufoSpaceCombat.dataset.cooldown = String(!mission.ball.ready || mission.ball.active);
    els.ufoSpaceCombat.dataset.hit = String(mission.collector.flash > 0);
    els.ufoSpaceCombat.dataset.tethered = "false";
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Fourth physical arcade trial: zero-gravity ring battle ------------------------
// The player launches a massive ram body, not a projectile. The ram, core, and two
// rival bodies retain velocity and transfer force through real contacts. A point only
// counts when the player has actually touched the core before it crosses the ring.
function makeUfoRingBattleMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-zero-gravity-ring-battle";
  group.visible = false;
  const arena = new THREE.Group();
  arena.name = "zero-gravity-ring-arena";
  group.add(arena);
  const width = UFO_RING_BATTLE_HALF_WIDTH;
  const height = UFO_RING_BATTLE_HALF_HEIGHT;
  const panelMaterial = new THREE.MeshStandardMaterial({
    color: 0x111728,
    metalness: .82,
    roughness: .2,
    emissive: 0x071029,
    emissiveIntensity: .8,
    side: THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width * 2, height * 2), panelMaterial);
  panel.name = "ring-battle-zero-g-field";
  panel.position.z = 4;
  arena.add(panel);
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 2 + 46, height * 2 + 46, 30),
    new THREE.MeshStandardMaterial({
      color: 0x030611,
      metalness: .92,
      roughness: .15,
      emissive: 0x01030a,
      emissiveIntensity: .64,
    }),
  );
  backing.position.z = 22;
  arena.add(backing);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8af3ff,
    metalness: .7,
    roughness: .14,
    emissive: 0x137eaf,
    emissiveIntensity: 1.22,
  });
  [
    [0, height + 12, width * 2 + 36, 16],
    [0, -height - 12, width * 2 + 36, 16],
    [-width - 12, 0, 16, height * 2 + 36],
    [width + 12, 0, 16, height * 2 + 36],
  ].forEach(([x, y, frameWidth, frameHeight], index) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, 18), frameMaterial.clone());
    frame.name = `ring-battle-frame-${index + 1}`;
    frame.position.set(x, y, -12);
    arena.add(frame);
  });

  const orbitLineMaterial = new THREE.LineBasicMaterial({
    color: 0x487ab8,
    transparent: true,
    opacity: .28,
    depthWrite: false,
  });
  [108, 202, 292].forEach((radius, index) => {
    const points = [];
    for (let step = 0; step <= 52; step += 1) {
      const angle = step / 52 * Math.PI * 2 + index * .34;
      points.push(new THREE.Vector3(Math.cos(angle) * radius * 1.18, Math.sin(angle) * radius * .62 - 6, -10));
    }
    arena.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), orbitLineMaterial.clone()));
  });

  const targetAnchors = [
    new THREE.Vector2(0, 205),
    new THREE.Vector2(-204, 168),
    new THREE.Vector2(204, 168),
  ];
  const target = new THREE.Group();
  target.name = "ring-battle-capture-ring";
  const targetOuter = new THREE.Mesh(
    new THREE.TorusGeometry(78, 8, 12, 48),
    new THREE.MeshStandardMaterial({
      color: 0xffc96b,
      metalness: .66,
      roughness: .12,
      emissive: 0xff8c3a,
      emissiveIntensity: 1.2,
    }),
  );
  const targetInner = new THREE.Mesh(
    new THREE.TorusGeometry(60, 2.8, 8, 42),
    new THREE.MeshBasicMaterial({
      color: 0xfff0a5,
      transparent: true,
      opacity: .88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const targetField = new THREE.Mesh(
    new THREE.CircleGeometry(56, 42),
    new THREE.MeshBasicMaterial({
      color: 0x73eaff,
      transparent: true,
      opacity: .12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  targetField.position.z = 4;
  const targetLight = new THREE.PointLight(0xffd67a, 3.6, 720, 1.6);
  targetLight.position.z = -130;
  targetLight.userData.nonCollidable = true;
  target.add(targetOuter, targetInner, targetField, targetLight);
  target.position.set(0, 205, -48);
  arena.add(target);

  const launchRail = new THREE.Group();
  launchRail.name = "ring-battle-launch-rail";
  const railBody = new THREE.Mesh(
    new THREE.BoxGeometry(540, 18, 20),
    new THREE.MeshStandardMaterial({
      color: 0x26384b,
      metalness: .9,
      roughness: .15,
      emissive: 0x0a293d,
      emissiveIntensity: .9,
    }),
  );
  const railLight = new THREE.Mesh(
    new THREE.BoxGeometry(508, 4, 8),
    new THREE.MeshBasicMaterial({
      color: 0x83f8ff,
      transparent: true,
      opacity: .84,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  railLight.position.z = -16;
  launchRail.add(railBody, railLight);
  launchRail.position.set(0, -230, -46);
  arena.add(launchRail);

  const makeBattleBody = ({ name, radius, tint, mass, geometry = "sphere" }) => {
    const root = new THREE.Group();
    root.name = name;
    const material = new THREE.MeshStandardMaterial({
      color: tint,
      metalness: .54,
      roughness: .22,
      emissive: tint,
      emissiveIntensity: .72,
    });
    const mesh = new THREE.Mesh(
      geometry === "icosahedron" ? new THREE.IcosahedronGeometry(radius, 2) : new THREE.SphereGeometry(radius, 24, 18),
      material,
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.14, 2.6, 8, 30),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: .66,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = -radius * .52 - 8;
    const flare = new THREE.Mesh(
      new THREE.CircleGeometry(radius * .42, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: .3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    flare.position.z = -radius * .62 - 10;
    root.add(mesh, ring, flare);
    arena.add(root);
    return {
      root,
      mesh,
      material,
      ring,
      flare,
      position: new THREE.Vector2(),
      velocity: new THREE.Vector2(),
      radius,
      mass,
      active: true,
      spin: 0,
      angularVelocity: 0,
      flash: 0,
    };
  };

  const player = makeBattleBody({
    name: "ring-battle-player-ram",
    radius: UFO_RING_BATTLE_PLAYER_RADIUS,
    tint: 0x68eaff,
    mass: UFO_RING_BATTLE_PLAYER_MASS,
  });
  player.kind = "player";
  player.docked = true;
  player.cooldown = 0;
  player.returnTimer = 0;
  player.x = 0;
  player.previousX = 0;
  player.velocityX = 0;
  player.position.set(0, UFO_RING_BATTLE_DOCK_Y);
  player.root.position.set(0, UFO_RING_BATTLE_DOCK_Y, -66);

  const core = makeBattleBody({
    name: "ring-battle-gravity-core",
    radius: UFO_RING_BATTLE_CORE_RADIUS,
    tint: 0xf7fff2,
    mass: UFO_RING_BATTLE_CORE_MASS,
    geometry: "icosahedron",
  });
  core.kind = "core";
  core.home = new THREE.Vector2(0, -6);
  core.position.copy(core.home);
  core.root.position.set(core.home.x, core.home.y, -64);
  core.lastPlayerContactAt = -Infinity;
  core.mesh.material.emissiveIntensity = 2.1;
  core.ring.material.opacity = .9;

  const rivals = [
    makeBattleBody({ name: "ring-battle-rival-left", radius: 37, tint: 0xff8d92, mass: 13, geometry: "icosahedron" }),
    makeBattleBody({ name: "ring-battle-rival-right", radius: 37, tint: 0xbb90ff, mass: 13, geometry: "icosahedron" }),
  ];
  const rivalHomes = [new THREE.Vector2(-176, 108), new THREE.Vector2(176, 108)];
  rivals.forEach((rival, index) => {
    rival.kind = "rival";
    rival.home = rivalHomes[index].clone();
    rival.position.copy(rival.home);
    rival.root.position.set(rival.home.x, rival.home.y, -62);
    rival.aiPhase = index * Math.PI;
    rival.thrust = 0;
  });

  const arenaLight = new THREE.PointLight(0x74dfff, 3.3, 1500, 1.75);
  arenaLight.position.set(0, 8, -240);
  arenaLight.userData.nonCollidable = true;
  arena.add(arenaLight);
  return {
    group,
    arena,
    panelMaterial,
    target: {
      root: target,
      outer: targetOuter,
      inner: targetInner,
      field: targetField,
      light: targetLight,
      anchors: targetAnchors,
      index: 0,
      center: targetAnchors[0].clone(),
      radius: 56,
      flash: 0,
    },
    launchRail: { group: launchRail, light: railLight },
    player,
    core,
    rivals,
    effects: [],
    active: false,
    phase: "idle",
    elapsed: 0,
    timeRemaining: UFO_RING_BATTLE_DURATION,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lastScoreAt: -Infinity,
    rams: 0,
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    testMode: false,
  };
}

function removeUfoRingBattleEffects(mission) {
  mission?.effects?.forEach(effect => {
    mission.arena.remove(effect.mesh);
    effect.mesh.geometry?.dispose?.();
    effect.mesh.material?.dispose?.();
  });
  if (mission?.effects) mission.effects.length = 0;
}

function resetUfoRingBattleBodies(mission) {
  if (!mission) return;
  const { player, core, rivals, target } = mission;
  player.docked = true;
  player.cooldown = 0;
  player.returnTimer = 0;
  player.x = 0;
  player.previousX = 0;
  player.velocityX = 0;
  player.position.set(0, UFO_RING_BATTLE_DOCK_Y);
  player.velocity.set(0, 0);
  player.spin = 0;
  player.angularVelocity = 0;
  player.flash = 0;
  player.root.visible = true;
  player.root.position.set(0, UFO_RING_BATTLE_DOCK_Y, -66);
  player.root.rotation.set(0, 0, 0);
  player.material.emissiveIntensity = .72;
  player.ring.material.opacity = .66;
  core.position.copy(core.home);
  core.velocity.set(0, 0);
  core.spin = 0;
  core.angularVelocity = 0;
  core.flash = 0;
  core.lastPlayerContactAt = -Infinity;
  core.root.visible = true;
  core.root.position.set(core.home.x, core.home.y, -64);
  core.root.rotation.set(0, 0, 0);
  core.material.emissiveIntensity = 2.1;
  core.ring.material.opacity = .9;
  rivals.forEach(rival => {
    rival.position.copy(rival.home);
    rival.velocity.set(0, 0);
    rival.spin = 0;
    rival.angularVelocity = 0;
    rival.flash = 0;
    rival.thrust = 0;
    rival.root.visible = true;
    rival.root.position.set(rival.home.x, rival.home.y, -62);
    rival.root.rotation.set(0, 0, 0);
    rival.material.emissiveIntensity = .72;
    rival.ring.material.opacity = .66;
  });
  target.index = 0;
  target.center.copy(target.anchors[0]);
  target.flash = 0;
  target.root.position.set(target.center.x, target.center.y, -48);
  target.root.rotation.set(0, 0, 0);
  target.field.material.opacity = .12;
  target.light.intensity = 3.6;
}

function resetUfoRingBattleMission(mission) {
  if (!mission) return;
  removeUfoRingBattleEffects(mission);
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_RING_BATTLE_DURATION;
  mission.score = 0;
  mission.combo = 0;
  mission.bestCombo = 0;
  mission.lastScoreAt = -Infinity;
  mission.rams = 0;
  mission.testMode = false;
  mission.group.visible = false;
  resetUfoRingBattleBodies(mission);
  state.ufoRingBattleState = "idle";
  state.ufoRingBattleScore = 0;
  state.ufoRingBattleCombo = 0;
  state.ufoRingBattleBestCombo = 0;
  state.ufoRingBattleRams = 0;
  delete document.body.dataset.ufoRingBattle;
  delete document.body.dataset.ufoRingBattlePhase;
  delete document.body.dataset.ufoRingBattleScore;
  delete document.body.dataset.ufoRingBattleCombo;
  delete document.body.dataset.ufoRingBattleRams;
  delete document.body.dataset.ufoRingBattleAction;
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoRingBattleMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  mission.origin.copy(craftCenter).addScaledVector(forward, UFO_RING_BATTLE_DISTANCE);
  mission.forward.copy(forward);
  mission.group.position.copy(mission.origin);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_RING_BATTLE_DURATION;
  mission.score = 0;
  mission.combo = 0;
  mission.bestCombo = 0;
  mission.lastScoreAt = -Infinity;
  mission.rams = 0;
  mission.group.visible = true;
  resetUfoRingBattleBodies(mission);
  state.ufoRingBattleState = "ready";
  state.ufoRingBattleScore = 0;
  state.ufoRingBattleCombo = 0;
  state.ufoRingBattleBestCombo = 0;
  state.ufoRingBattleRams = 0;
  document.body.dataset.ufoRingBattle = "ready";
  document.body.dataset.ufoRingBattlePhase = "ready";
  document.body.dataset.ufoRingBattleScore = "0";
  document.body.dataset.ufoRingBattleCombo = "0";
  document.body.dataset.ufoRingBattleRams = "0";
  return true;
}

function activateUfoRingBattleTestMode(control) {
  const mission = control?.spaceRingBattle;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(mission);
  if (!prepareUfoRingBattleMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "ring-battle-prototype";
  document.body.dataset.ufoSpaceMission = "ring-battle-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("ゼログラビティ・リングバトル", "左右でラム位置合わせ");
  updateUfoRingBattleHud();
  updateUfoRingBattleLifeHud();
  updateUfoControls();
  showToast("ゼログラビティ・リングバトル。左右でラムを合わせ、重力コアを得点リングへ物理的に押し込みます。");
  return true;
}

function updateUfoRingBattlePlayerDock(control, mission, delta) {
  const player = mission.player;
  player.cooldown = Math.max(0, player.cooldown - delta);
  if (!player.docked) return;
  const craft = control?.craftAssembly;
  if (!craft) return;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const rawX = craftCenter.clone().sub(mission.origin).dot(mission.right);
  const nextX = clamp(rawX, -250, 250);
  player.velocityX = clamp((nextX - player.previousX) / Math.max(delta, .001), -900, 900);
  player.previousX = nextX;
  player.x = nextX;
  player.position.set(nextX, UFO_RING_BATTLE_DOCK_Y);
  player.velocity.set(0, 0);
  player.root.position.set(nextX, UFO_RING_BATTLE_DOCK_Y, -66);
  player.root.rotation.z = clamp(player.velocityX * -.00022, -.12, .12);
}

function startUfoRingBattleRound() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceRingBattle;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoRingBattleMission(mission);
    if (!prepareUfoRingBattleMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  state.ufoRingBattleState = "playing";
  document.body.dataset.ufoRingBattle = "playing";
  document.body.dataset.ufoRingBattlePhase = "playing";
  document.body.dataset.ufoRingBattleAction = "aiming";
  showToast("バトル開始。左右でラム位置を決め、Fキーまたはラム発進で重力コアを押し出します。");
  updateUfoRingBattleHud();
  updateUfoRingBattleLifeHud();
  return true;
}

function startUfoRingBattleRam() {
  const mission = ufoDoorControls[0]?.spaceRingBattle;
  const player = mission?.player;
  if (!mission?.active || mission.phase !== "playing" || !player?.docked || player.cooldown > 0) return false;
  player.docked = false;
  player.position.set(player.x, UFO_RING_BATTLE_DOCK_Y);
  player.velocity.set(player.velocityX * .12, UFO_RING_BATTLE_RAM_SPEED);
  player.flash = .8;
  player.cooldown = .6;
  mission.rams += 1;
  document.body.dataset.ufoRingBattleAction = "ramming";
  showToast("ラム発進。重い機体の反動で重力コアを押し込み、リングを通してください。");
  return true;
}

function spawnUfoRingBattleImpact(mission, x, y, tint, scale = 1) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(10, 18, 28),
    new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: .92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.position.set(x, y, -76);
  mission.arena.add(mesh);
  mission.effects.push({ mesh, age: 0, duration: .42, scale });
}

function updateUfoRingBattleEffects(mission, delta) {
  for (let index = mission.effects.length - 1; index >= 0; index -= 1) {
    const effect = mission.effects[index];
    effect.age += delta;
    const progress = clamp(effect.age / effect.duration, 0, 1);
    effect.mesh.scale.setScalar(THREE.MathUtils.lerp(.45, effect.scale * 4.1, progress));
    effect.mesh.rotation.z += delta * 6.2;
    effect.mesh.material.opacity = (1 - progress) * .92;
    if (progress < 1) continue;
    mission.arena.remove(effect.mesh);
    effect.mesh.geometry.dispose();
    effect.mesh.material.dispose();
    mission.effects.splice(index, 1);
  }
}

function resolveUfoRingBattleContact(mission, first, second) {
  const dx = second.position.x - first.position.x;
  const dy = second.position.y - first.position.y;
  const distance = Math.hypot(dx, dy);
  const minimum = first.radius + second.radius;
  if (distance >= minimum) return;
  const normalX = distance > .001 ? dx / distance : .707;
  const normalY = distance > .001 ? dy / distance : .707;
  const inverseFirst = 1 / first.mass;
  const inverseSecond = 1 / second.mass;
  const overlap = minimum - distance + .35;
  const split = overlap / (inverseFirst + inverseSecond);
  first.position.x -= normalX * split * inverseFirst;
  first.position.y -= normalY * split * inverseFirst;
  second.position.x += normalX * split * inverseSecond;
  second.position.y += normalY * split * inverseSecond;
  const relativeVelocityX = second.velocity.x - first.velocity.x;
  const relativeVelocityY = second.velocity.y - first.velocity.y;
  const closingSpeed = relativeVelocityX * normalX + relativeVelocityY * normalY;
  if (closingSpeed >= 0) return;
  const impactSpeed = Math.abs(closingSpeed);
  const restitution = first.kind === "player" || second.kind === "player" ? .76 : .62;
  const impulse = -(1 + restitution) * closingSpeed / (inverseFirst + inverseSecond);
  first.velocity.x -= normalX * impulse * inverseFirst;
  first.velocity.y -= normalY * impulse * inverseFirst;
  second.velocity.x += normalX * impulse * inverseSecond;
  second.velocity.y += normalY * impulse * inverseSecond;
  first.angularVelocity -= normalX * impulse * .0038;
  second.angularVelocity += normalX * impulse * .0038;
  first.flash = Math.max(first.flash, clamp(impactSpeed / 500, .08, .85));
  second.flash = Math.max(second.flash, clamp(impactSpeed / 500, .08, .85));
  const core = first.kind === "core" ? first : second.kind === "core" ? second : null;
  const player = first.kind === "player" ? first : second.kind === "player" ? second : null;
  if (core && player) core.lastPlayerContactAt = mission.elapsed;
  if (impactSpeed >= 105) spawnUfoRingBattleImpact(mission, (first.position.x + second.position.x) / 2, (first.position.y + second.position.y) / 2, core ? 0xf8f3b5 : 0x86ecff, 1 + impactSpeed / 660);
}

function clampUfoRingBattleBody(body) {
  const left = -UFO_RING_BATTLE_HALF_WIDTH + body.radius;
  const right = UFO_RING_BATTLE_HALF_WIDTH - body.radius;
  const bottom = -UFO_RING_BATTLE_HALF_HEIGHT + body.radius;
  const top = UFO_RING_BATTLE_HALF_HEIGHT - body.radius;
  if (body.position.x < left) {
    body.position.x = left;
    body.velocity.x = Math.abs(body.velocity.x) * .72;
  } else if (body.position.x > right) {
    body.position.x = right;
    body.velocity.x = -Math.abs(body.velocity.x) * .72;
  }
  if (body.position.y < bottom) {
    body.position.y = bottom;
    body.velocity.y = Math.abs(body.velocity.y) * .68;
  } else if (body.position.y > top) {
    body.position.y = top;
    body.velocity.y = -Math.abs(body.velocity.y) * .68;
  }
}

function resetUfoRingBattleCore(mission) {
  const core = mission.core;
  core.position.copy(core.home);
  core.velocity.set(0, 0);
  core.spin = 0;
  core.angularVelocity = 0;
  core.lastPlayerContactAt = -Infinity;
  core.root.position.set(core.home.x, core.home.y, -64);
  mission.rivals.forEach(rival => {
    rival.position.copy(rival.home);
    rival.velocity.set(0, 0);
    rival.root.position.set(rival.home.x, rival.home.y, -62);
  });
  const player = mission.player;
  player.docked = true;
  player.position.set(player.x, UFO_RING_BATTLE_DOCK_Y);
  player.velocity.set(0, 0);
  player.root.position.set(player.x, UFO_RING_BATTLE_DOCK_Y, -66);
}

function scoreUfoRingBattlePoint(mission) {
  if (mission.phase !== "playing") return;
  mission.score += 1;
  mission.combo = mission.elapsed - mission.lastScoreAt <= 4.4 ? mission.combo + 1 : 1;
  mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
  mission.lastScoreAt = mission.elapsed;
  mission.target.flash = 1;
  spawnUfoRingBattleImpact(mission, mission.target.center.x, mission.target.center.y, 0xffe797, 3.1);
  mission.target.index = (mission.target.index + 1) % mission.target.anchors.length;
  mission.target.center.copy(mission.target.anchors[mission.target.index]);
  resetUfoRingBattleCore(mission);
  if (mission.score >= UFO_RING_BATTLE_REQUIRED_POINTS) {
    mission.phase = "complete";
    state.ufoRingBattleState = "complete";
    document.body.dataset.ufoRingBattle = "complete";
    document.body.dataset.ufoRingBattlePhase = "complete";
    showToast("リングバトル勝利。重力コアをすべての得点リングへ通しました。");
  } else {
    document.body.dataset.ufoRingBattleAction = "aiming";
    showToast("得点。次のリング位置へ移動しました。左右でラム位置を合わせて再発進できます。");
  }
}

function failUfoRingBattleRound(mission) {
  if (mission.phase !== "playing") return;
  mission.phase = "failed";
  mission.player.docked = true;
  mission.player.velocity.set(0, 0);
  state.ufoRingBattleState = "failed";
  document.body.dataset.ufoRingBattle = "failed";
  document.body.dataset.ufoRingBattlePhase = "failed";
  showToast("バトル時間が終了しました。リング位置と重力コアを初期化して再挑戦できます。");
}

function updateUfoRingBattleBodies(mission, delta) {
  const bodies = [mission.player, mission.core, ...mission.rivals];
  const player = mission.player;
  if (!player.docked) {
    player.position.addScaledVector(player.velocity, delta);
    player.velocity.multiplyScalar(Math.exp(-.45 * delta));
    player.returnTimer += delta;
    clampUfoRingBattleBody(player);
    if ((player.position.y <= -UFO_RING_BATTLE_HALF_HEIGHT + player.radius + 1 && player.velocity.y < 55) || player.returnTimer >= 4.6) {
      player.docked = true;
      player.returnTimer = 0;
      player.velocity.set(0, 0);
      player.position.set(player.x, UFO_RING_BATTLE_DOCK_Y);
      player.root.position.set(player.x, UFO_RING_BATTLE_DOCK_Y, -66);
      document.body.dataset.ufoRingBattleAction = "aiming";
    }
  }
  const core = mission.core;
  core.position.addScaledVector(core.velocity, delta);
  core.velocity.multiplyScalar(Math.exp((player.docked ? -4.2 : -.38) * delta));
  clampUfoRingBattleBody(core);
  mission.rivals.forEach((rival, index) => {
    if (!player.docked) {
      const toCore = core.position.clone().sub(rival.position);
      const distance = Math.max(1, toCore.length());
      const pursuit = toCore.multiplyScalar(1 / distance);
      const orbit = new THREE.Vector2(-pursuit.y, pursuit.x).multiplyScalar(index ? -.36 : .36);
      const drive = pursuit.multiplyScalar(118).add(orbit.multiplyScalar(58));
      rival.velocity.addScaledVector(drive, delta);
    }
    rival.velocity.multiplyScalar(Math.exp((player.docked ? -4.8 : -.64) * delta));
    rival.position.addScaledVector(rival.velocity, delta);
    clampUfoRingBattleBody(rival);
    rival.thrust = clamp(rival.velocity.length() / 220, 0, 1);
  });
  for (let firstIndex = 0; firstIndex < bodies.length; firstIndex += 1) {
    const first = bodies[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < bodies.length; secondIndex += 1) {
      const second = bodies[secondIndex];
      if (player.docked && (first === player || second === player)) continue;
      resolveUfoRingBattleContact(mission, first, second);
    }
  }
  if (mission.elapsed - core.lastPlayerContactAt <= UFO_RING_BATTLE_PLAYER_CONTACT_WINDOW) {
    const dx = core.position.x - mission.target.center.x;
    const dy = core.position.y - mission.target.center.y;
    const insideRing = Math.hypot(dx, dy) <= mission.target.radius - core.radius * .42;
    if (insideRing && core.velocity.y > 40) scoreUfoRingBattlePoint(mission);
  }
  bodies.forEach(body => {
    body.flash = Math.max(0, body.flash - delta * 2.4);
    body.angularVelocity *= Math.exp(-2.1 * delta);
    body.spin += body.angularVelocity * delta;
    body.root.position.set(body.position.x, body.position.y, body === core ? -64 : -62);
    body.root.rotation.z = body.spin;
    body.material.emissiveIntensity = (body === core ? 2.1 : .72) + body.flash * 1.8 + (body.thrust || 0) * .54;
    body.ring.material.opacity = (body === core ? .76 : .5) + body.flash * .34;
    body.flare.material.opacity = .18 + body.flash * .48;
  });
}

function updateUfoRingBattleMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  const mission = control?.spaceRingBattle;
  if (!mission?.active) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  updateUfoRingBattlePlayerDock(control, mission, frameDelta);
  mission.target.flash = Math.max(0, mission.target.flash - frameDelta * 1.2);
  mission.target.root.position.set(
    mission.target.center.x + Math.sin(mission.elapsed * 1.8 + mission.target.index) * 9,
    mission.target.center.y + Math.cos(mission.elapsed * 1.45 + mission.target.index) * 5,
    -48,
  );
  mission.target.outer.rotation.z += frameDelta * 1.35;
  mission.target.inner.rotation.z -= frameDelta * 2.4;
  mission.target.field.material.opacity = .1 + Math.sin(mission.elapsed * 5.4) * .04 + mission.target.flash * .42;
  mission.target.light.intensity = 3.5 + mission.target.flash * 5.2;
  mission.launchRail.light.material.opacity = .66 + (mission.player.docked ? Math.sin(mission.elapsed * 5) * .12 : .28);
  updateUfoRingBattleEffects(mission, frameDelta);
  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - frameDelta);
    updateUfoRingBattleBodies(mission, frameDelta);
    if (mission.timeRemaining <= 0 && mission.phase === "playing") failUfoRingBattleRound(mission);
  }
  state.ufoRingBattleState = mission.phase;
  state.ufoRingBattleScore = mission.score;
  state.ufoRingBattleCombo = mission.combo;
  state.ufoRingBattleBestCombo = mission.bestCombo;
  state.ufoRingBattleRams = mission.rams;
  document.body.dataset.ufoRingBattleScore = String(mission.score);
  document.body.dataset.ufoRingBattleCombo = String(mission.combo);
  document.body.dataset.ufoRingBattleRams = String(mission.rams);
  updateUfoRingBattleHud();
  updateUfoRingBattleLifeHud();
}

function updateUfoRingBattleLifeHud() {
  const mission = ufoDoorControls[0]?.spaceRingBattle;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const seconds = Math.ceil(mission.timeRemaining);
  const percent = clamp(mission.timeRemaining / UFO_RING_BATTLE_DURATION * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "バトル残り時間";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${seconds}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "UFOを左右へ動かすと、下部の質量ラムも同じ位置へ移動します"
      : mission.phase === "playing"
        ? "ラムと相手機の反動を読み、プレイヤーが触れた重力コアだけを得点リングへ通してください"
        : mission.phase === "complete"
          ? "ゼログラビティ・リングバトルに勝利しました"
          : "重力コアと相手機を初期位置へ戻して、もう一度バトルできます";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && seconds <= 12 ? "true" : "false";
}

function updateUfoRingBattleHud() {
  const mission = ufoDoorControls[0]?.spaceRingBattle;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && mission?.active
    && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "ゼログラビティ・リングバトル", first: "得点", second: "連鎖", third: "ラム" });
  const phaseLabel = mission.phase === "ready" ? "バトル待機"
    : mission.phase === "playing" ? `残り ${Math.ceil(mission.timeRemaining)}秒`
      : mission.phase === "complete" ? "バトル勝利"
        : "再挑戦";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${mission.score}/${UFO_RING_BATTLE_REQUIRED_POINTS}`;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `×${mission.combo}`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.rams);
  const progress = mission.phase === "complete" ? 1 : clamp(mission.score / UFO_RING_BATTLE_REQUIRED_POINTS, 0, .96);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "バトル開始後、左右でラム位置を決め、重力コアを得点リングへ押し込みます。"
      : mission.phase === "playing"
        ? mission.player.docked
          ? "ラム発進ができます。相手機の位置も読んで、重力コアの進行線を作ってください。"
          : "ラムと相手機が衝突中です。重力コアがリングへ入るまで、反動の軌道を見てください。"
        : mission.phase === "complete"
          ? `得点 ${mission.score}。最大連鎖 ×${mission.bestCombo}。`
          : "重力コアと相手機を初期位置に戻して、もう一度勝負できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "バトル開始" : "リングを再配置";
    els.ufoSpaceStartButton.setAttribute("aria-label", "ゼログラビティ・リングバトルを開始する");
  }
  if (els.ufoSpaceFireButton) {
    const canRam = mission.phase === "playing" && mission.player.docked && mission.player.cooldown <= 0;
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canRam;
    els.ufoSpaceFireButton.textContent = mission.player.docked ? "ラム発進" : "反動中";
    els.ufoSpaceFireButton.setAttribute("aria-label", "質量ラムを発進して重力コアを押し出す");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.ringBattle = "true";
    els.ufoSpaceCombat.dataset.cooldown = String(!mission.player.docked || mission.player.cooldown > 0);
    els.ufoSpaceCombat.dataset.hit = String(mission.target.flash > 0);
    els.ufoSpaceCombat.dataset.tethered = "false";
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Fifth physical arcade trial: space crane construction port -------------------
// The crane is intentionally not an inventory menu. Cargo bodies keep inertia while
// the magnetic hook pulls them by a spring-like tether; a module only locks after it
// actually touches the currently lit dock socket. A bad release therefore bounces or
// returns to the salvage rack instead of being silently placed by the UI.
function makeUfoCranePortMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-space-crane-construction-port";
  group.visible = false;
  const yard = new THREE.Group();
  yard.name = "space-crane-construction-yard";
  group.add(yard);
  const width = UFO_CRANE_PORT_HALF_WIDTH;
  const height = UFO_CRANE_PORT_HALF_HEIGHT;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 2, height * 2),
    new THREE.MeshStandardMaterial({
      color: 0x101727,
      metalness: .78,
      roughness: .2,
      emissive: 0x061129,
      emissiveIntensity: .72,
      side: THREE.DoubleSide,
    }),
  );
  panel.name = "space-crane-construction-field";
  panel.position.z = 5;
  yard.add(panel);
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 2 + 52, height * 2 + 52, 34),
    new THREE.MeshStandardMaterial({
      color: 0x030711,
      metalness: .92,
      roughness: .14,
      emissive: 0x01040d,
      emissiveIntensity: .6,
    }),
  );
  backing.position.z = 24;
  yard.add(backing);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x79e7ff,
    metalness: .78,
    roughness: .16,
    emissive: 0x126a9b,
    emissiveIntensity: 1.12,
  });
  [
    [0, height + 12, width * 2 + 40, 16],
    [0, -height - 12, width * 2 + 40, 16],
    [-width - 12, 0, 16, height * 2 + 40],
    [width + 12, 0, 16, height * 2 + 40],
  ].forEach(([x, y, frameWidth, frameHeight], index) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, 18), frameMaterial.clone());
    frame.name = `space-crane-frame-${index + 1}`;
    frame.position.set(x, y, -12);
    yard.add(frame);
  });

  const gridMaterial = new THREE.LineBasicMaterial({ color: 0x487ca6, transparent: true, opacity: .18, depthWrite: false });
  [-260, -130, 0, 130, 260].forEach(x => {
    yard.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -194, -10), new THREE.Vector3(x, 238, -10),
    ]), gridMaterial.clone()));
  });
  [160, 66, -28, -122].forEach(y => {
    yard.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-338, y, -10), new THREE.Vector3(338, y, -10),
    ]), gridMaterial.clone()));
  });

  const dock = new THREE.Group();
  dock.name = "space-crane-dock-structure";
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(714, 28, 62),
    new THREE.MeshStandardMaterial({
      color: 0x25374a,
      metalness: .9,
      roughness: .14,
      emissive: 0x0a263a,
      emissiveIntensity: .88,
    }),
  );
  deck.position.set(0, UFO_CRANE_PORT_FLOOR_Y - 14, -40);
  dock.add(deck);
  const deckLight = new THREE.Mesh(
    new THREE.BoxGeometry(670, 5, 8),
    new THREE.MeshBasicMaterial({ color: 0x75f6ff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  deckLight.position.set(0, UFO_CRANE_PORT_FLOOR_Y + 2, -73);
  dock.add(deckLight);
  [-274, 274].forEach((x, index) => {
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(26, 236, 46),
      new THREE.MeshStandardMaterial({ color: 0x1f3044, metalness: .9, roughness: .15, emissive: 0x092037, emissiveIntensity: .7 }),
    );
    tower.name = `space-crane-dock-tower-${index + 1}`;
    tower.position.set(x, -94, -35);
    dock.add(tower);
  });
  yard.add(dock);

  const socketXs = [0, -184, 184];
  const socketTints = [0x6eeeff, 0xffd58a, 0xcba6ff];
  const sockets = socketXs.map((x, index) => {
    const root = new THREE.Group();
    root.name = `space-crane-build-socket-${index + 1}`;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(138, 10, 18),
      new THREE.MeshStandardMaterial({ color: 0x2d4356, metalness: .84, roughness: .16, emissive: 0x0b2538, emissiveIntensity: .76 }),
    );
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(42, 57, 32),
      new THREE.MeshBasicMaterial({ color: socketTints[index], transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    halo.position.z = -42;
    const ghost = new THREE.Mesh(
      new THREE.BoxGeometry(96, 58, 24),
      new THREE.MeshBasicMaterial({ color: socketTints[index], transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ghost.position.y = 31;
    ghost.position.z = -42;
    const light = new THREE.PointLight(socketTints[index], 2.1, 390, 1.8);
    light.position.set(0, 42, -108);
    light.userData.nonCollidable = true;
    root.add(rail, halo, ghost, light);
    root.position.set(x, UFO_CRANE_PORT_FLOOR_Y + 8, -65);
    yard.add(root);
    return { root, rail, halo, ghost, light, x, width: 64, locked: false, flash: 0, tint: socketTints[index] };
  });

  const crane = new THREE.Group();
  crane.name = "space-crane-magnetic-gantry";
  const craneRail = new THREE.Mesh(
    new THREE.BoxGeometry(692, 22, 28),
    new THREE.MeshStandardMaterial({ color: 0x3b5061, metalness: .94, roughness: .13, emissive: 0x113349, emissiveIntensity: .98 }),
  );
  craneRail.position.set(0, 250, -46);
  crane.add(craneRail);
  const railGlow = new THREE.Mesh(
    new THREE.BoxGeometry(654, 5, 9),
    new THREE.MeshBasicMaterial({ color: 0x84f5ff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  railGlow.position.set(0, 250, -66);
  crane.add(railGlow);
  const cable = new THREE.Mesh(
    new THREE.BoxGeometry(6, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0x8adfff, metalness: .8, roughness: .14, emissive: 0x2b78a0, emissiveIntensity: .8 }),
  );
  cable.position.set(0, 238, -58);
  crane.add(cable);
  const hookRoot = new THREE.Group();
  hookRoot.name = "space-crane-magnetic-hook";
  const hookBody = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 32, 22, 18),
    new THREE.MeshStandardMaterial({ color: 0x263b4d, metalness: .9, roughness: .16, emissive: 0x0d2e45, emissiveIntensity: 1.1 }),
  );
  const hookRing = new THREE.Mesh(
    new THREE.TorusGeometry(36, 4, 9, 36),
    new THREE.MeshBasicMaterial({ color: 0x82f6ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  hookRing.rotation.x = Math.PI / 2;
  hookRing.position.z = -18;
  const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 10), hookBody.material.clone());
  const clawRight = new THREE.Mesh(new THREE.BoxGeometry(10, 30, 10), hookBody.material.clone());
  clawLeft.position.set(-24, -24, 0);
  clawRight.position.set(24, -24, 0);
  hookRoot.add(hookBody, hookRing, clawLeft, clawRight);
  hookRoot.position.set(0, UFO_CRANE_PORT_HOOK_SEARCH_Y, -67);
  crane.add(hookRoot);
  const beamGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const beam = new THREE.Line(
    beamGeometry,
    new THREE.LineBasicMaterial({ color: 0x95fbff, transparent: true, opacity: .72, depthWrite: false }),
  );
  beam.name = "space-crane-magnetic-tether";
  beam.visible = false;
  crane.add(beam);
  yard.add(crane);

  const makeCargo = ({ name, tint, mass, radius, home, geometry }) => {
    const root = new THREE.Group();
    root.name = name;
    const material = new THREE.MeshStandardMaterial({ color: tint, metalness: .68, roughness: .2, emissive: tint, emissiveIntensity: .58 });
    const mesh = new THREE.Mesh(geometry, material);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(radius * .76, 3.2, 9, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .48, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    band.rotation.x = Math.PI / 2;
    band.position.z = -radius * .58 - 4;
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(radius * .16, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    beacon.position.set(0, radius * .58, -radius * .38);
    root.add(mesh, band, beacon);
    yard.add(root);
    return {
      root, mesh, material, band, beacon, mass, radius,
      home: home.clone(), position: home.clone(), velocity: new THREE.Vector2(),
      mode: "staged", held: false, locked: false, spin: 0, angularVelocity: 0,
      flash: 0, respawnAt: 0, active: true,
    };
  };
  const cargos = [
    makeCargo({ name: "space-crane-module-core", tint: 0x73f0ff, mass: 16, radius: 42, home: new THREE.Vector2(0, 176), geometry: new THREE.BoxGeometry(92, 56, 36) }),
    makeCargo({ name: "space-crane-module-truss", tint: 0xffc56b, mass: 12, radius: 37, home: new THREE.Vector2(-224, 186), geometry: new THREE.CylinderGeometry(30, 30, 82, 12) }),
    makeCargo({ name: "space-crane-module-cap", tint: 0xc4a2ff, mass: 10, radius: 35, home: new THREE.Vector2(218, 164), geometry: new THREE.IcosahedronGeometry(38, 1) }),
  ];
  cargos.forEach(cargo => cargo.root.position.set(cargo.position.x, cargo.position.y, -62));
  const ambientLight = new THREE.PointLight(0x72e6ff, 3.6, 1500, 1.75);
  ambientLight.position.set(0, 20, -230);
  ambientLight.userData.nonCollidable = true;
  yard.add(ambientLight);

  return {
    group, yard, panel, dock, sockets, crane, cargos,
    hook: {
      root: hookRoot, cable, ring: hookRing, beam, beamGeometry,
      x: 0, previousX: 0, velocityX: 0, y: UFO_CRANE_PORT_HOOK_SEARCH_Y,
      targetY: UFO_CRANE_PORT_HOOK_SEARCH_Y, phase: "search", grabbed: null,
      cooldown: 0, flash: 0,
    },
    active: false, phase: "idle", elapsed: 0, timeRemaining: UFO_CRANE_PORT_DURATION,
    built: 0, hooks: 0, currentSocket: 0, origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0),
    testMode: false,
  };
}

function resetUfoCranePortBodies(mission) {
  if (!mission) return;
  mission.hook.x = 0;
  mission.hook.previousX = 0;
  mission.hook.velocityX = 0;
  mission.hook.y = UFO_CRANE_PORT_HOOK_SEARCH_Y;
  mission.hook.targetY = UFO_CRANE_PORT_HOOK_SEARCH_Y;
  mission.hook.phase = "search";
  mission.hook.grabbed = null;
  mission.hook.cooldown = 0;
  mission.hook.flash = 0;
  mission.hook.root.position.set(0, UFO_CRANE_PORT_HOOK_SEARCH_Y, -67);
  mission.hook.cable.scale.y = 1;
  mission.hook.beam.visible = false;
  mission.cargos.forEach(cargo => {
    cargo.position.copy(cargo.home);
    cargo.velocity.set(0, 0);
    cargo.mode = "staged";
    cargo.held = false;
    cargo.locked = false;
    cargo.spin = 0;
    cargo.angularVelocity = 0;
    cargo.flash = 0;
    cargo.respawnAt = 0;
    cargo.root.visible = true;
    cargo.root.position.set(cargo.home.x, cargo.home.y, -62);
    cargo.root.rotation.set(0, 0, 0);
    cargo.material.emissiveIntensity = .58;
    cargo.band.material.opacity = .48;
  });
  mission.sockets.forEach((socket, index) => {
    socket.locked = false;
    socket.flash = 0;
    socket.halo.material.opacity = index === 0 ? .54 : .17;
    socket.ghost.material.opacity = index === 0 ? .22 : .07;
    socket.light.intensity = index === 0 ? 4.2 : 1.1;
  });
}

function resetUfoCranePortMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_CRANE_PORT_DURATION;
  mission.built = 0;
  mission.hooks = 0;
  mission.currentSocket = 0;
  mission.group.visible = false;
  resetUfoCranePortBodies(mission);
  state.ufoCranePortState = "idle";
  state.ufoCranePortBuilt = 0;
  state.ufoCranePortStable = 0;
  state.ufoCranePortHooks = 0;
  delete document.body.dataset.ufoCranePort;
  delete document.body.dataset.ufoCranePortPhase;
  delete document.body.dataset.ufoCranePortBuilt;
  delete document.body.dataset.ufoCranePortStable;
  delete document.body.dataset.ufoCranePortHooks;
  delete document.body.dataset.ufoCranePortAction;
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoCranePortMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  mission.origin.copy(craftCenter).addScaledVector(forward, UFO_CRANE_PORT_DISTANCE);
  mission.forward.copy(forward);
  mission.group.position.copy(mission.origin);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_CRANE_PORT_DURATION;
  mission.built = 0;
  mission.hooks = 0;
  mission.currentSocket = 0;
  mission.group.visible = true;
  resetUfoCranePortBodies(mission);
  state.ufoCranePortState = "ready";
  state.ufoCranePortBuilt = 0;
  state.ufoCranePortStable = 100;
  state.ufoCranePortHooks = 0;
  document.body.dataset.ufoCranePort = "ready";
  document.body.dataset.ufoCranePortPhase = "ready";
  document.body.dataset.ufoCranePortBuilt = "0";
  document.body.dataset.ufoCranePortStable = "100";
  document.body.dataset.ufoCranePortHooks = "0";
  document.body.dataset.ufoCranePortAction = "capture";
  return true;
}

function activateUfoCranePortTestMode(control) {
  const mission = control?.spaceCranePort;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(control.spaceRingBattle);
  resetUfoCranePortMission(mission);
  if (!prepareUfoCranePortMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "crane-port-prototype";
  document.body.dataset.ufoSpaceMission = "crane-port-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("宇宙クレーン建設港", "左右でフック位置合わせ");
  updateUfoCranePortHud();
  updateUfoCranePortLifeHud();
  updateUfoControls();
  showToast("宇宙クレーン建設港。磁場で資材をつかみ、揺れを抑えて光るソケットへ実際に荷下ろしします。");
  return true;
}

function startUfoCranePortRound() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceCranePort;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoCranePortMission(mission);
    if (!prepareUfoCranePortMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  state.ufoCranePortState = "playing";
  document.body.dataset.ufoCranePort = "playing";
  document.body.dataset.ufoCranePortPhase = "playing";
  document.body.dataset.ufoCranePortAction = "capture";
  showToast("建設開始。フックを資材へ合わせて磁場接続し、光るソケットの真上で荷下ろししてください。");
  updateUfoCranePortHud();
  updateUfoCranePortLifeHud();
  return true;
}

function captureUfoCranePortCargo(mission) {
  const hook = mission?.hook;
  if (!mission || !hook || hook.phase !== "search" || hook.cooldown > 0) return false;
  const cargo = mission.cargos
    .filter(item => !item.locked && (item.mode === "staged" || item.mode === "loose"))
    .sort((first, second) => first.position.distanceTo(new THREE.Vector2(hook.x, hook.y)) - second.position.distanceTo(new THREE.Vector2(hook.x, hook.y)))[0];
  if (!cargo || cargo.position.distanceTo(new THREE.Vector2(hook.x, hook.y)) > UFO_CRANE_PORT_CAPTURE_RANGE) {
    showToast("磁場の届く範囲に資材がありません。左右でフックを資材の真上へ合わせてください。");
    return false;
  }
  hook.grabbed = cargo;
  hook.phase = "carry";
  hook.targetY = UFO_CRANE_PORT_HOOK_CARRY_Y;
  cargo.mode = "held";
  cargo.held = true;
  cargo.flash = 1;
  mission.hooks += 1;
  document.body.dataset.ufoCranePortAction = "release";
  showToast("磁場接続。資材は慣性で揺れます。光るソケットへ位置を合わせて荷下ろししてください。");
  return true;
}

function releaseUfoCranePortCargo(mission) {
  const hook = mission?.hook;
  const cargo = hook?.grabbed;
  if (!mission || !hook || !cargo || hook.phase !== "carry") return false;
  cargo.held = false;
  cargo.mode = "loose";
  cargo.velocity.x += hook.velocityX * .24;
  cargo.velocity.y = Math.min(cargo.velocity.y, -16);
  cargo.flash = .7;
  hook.grabbed = null;
  hook.phase = "return";
  hook.targetY = UFO_CRANE_PORT_HOOK_SEARCH_Y;
  hook.cooldown = .22;
  document.body.dataset.ufoCranePortAction = "returning";
  showToast("荷下ろし。資材がソケットへ触れた位置と勢いで、固定できるかが決まります。");
  return true;
}

function handleUfoCranePortAction() {
  const mission = ufoDoorControls[0]?.spaceCranePort;
  if (!mission?.active || mission.phase !== "playing") return false;
  if (mission.hook.phase === "carry") return releaseUfoCranePortCargo(mission);
  return captureUfoCranePortCargo(mission);
}

function updateUfoCranePortHook(control, mission, delta) {
  const hook = mission.hook;
  hook.cooldown = Math.max(0, hook.cooldown - delta);
  const craft = control?.craftAssembly;
  if (!craft) return;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const rawX = craftCenter.clone().sub(mission.origin).dot(mission.right);
  const targetX = clamp(rawX, -310, 310);
  hook.velocityX = clamp((targetX - hook.previousX) / Math.max(delta, .001), -1000, 1000);
  hook.previousX = targetX;
  hook.x += (targetX - hook.x) * (1 - Math.exp(-11 * delta));
  hook.y += (hook.targetY - hook.y) * (1 - Math.exp(-4.9 * delta));
  if (hook.phase === "return" && Math.abs(hook.y - UFO_CRANE_PORT_HOOK_SEARCH_Y) < 3) {
    hook.phase = "search";
    hook.targetY = UFO_CRANE_PORT_HOOK_SEARCH_Y;
    document.body.dataset.ufoCranePortAction = "capture";
  }
  hook.root.position.set(hook.x, hook.y, -67);
  hook.root.rotation.z = clamp(hook.velocityX * -.00018, -.16, .16);
  const cableLength = Math.max(12, 250 - hook.y);
  hook.cable.scale.y = cableLength;
  hook.cable.position.set(hook.x, hook.y + cableLength / 2, -58);
  hook.ring.material.opacity = .48 + Math.sin(mission.elapsed * 7) * .12 + (hook.grabbed ? .36 : 0);
  hook.ring.material.color.setHex(hook.grabbed ? 0xafffff : 0x82f6ff);
  const positions = hook.beamGeometry.attributes.position.array;
  if (hook.grabbed) {
    positions[0] = hook.x; positions[1] = hook.y - 20; positions[2] = -70;
    positions[3] = hook.grabbed.position.x; positions[4] = hook.grabbed.position.y; positions[5] = -70;
    hook.beamGeometry.attributes.position.needsUpdate = true;
    hook.beam.visible = true;
  } else {
    hook.beam.visible = false;
  }
}

function resolveUfoCranePortCargoContact(first, second) {
  if (!first?.active || !second?.active || (first.locked && second.locked)) return;
  const offset = second.position.clone().sub(first.position);
  let distance = offset.length();
  const minimum = first.radius + second.radius;
  if (distance >= minimum) return;
  if (distance < .001) {
    offset.set(1, 0);
    distance = 1;
  } else {
    offset.multiplyScalar(1 / distance);
  }
  const firstInverseMass = first.locked ? 0 : 1 / first.mass;
  const secondInverseMass = second.locked ? 0 : 1 / second.mass;
  const totalInverseMass = firstInverseMass + secondInverseMass;
  if (totalInverseMass <= 0) return;
  const overlap = minimum - distance + .2;
  if (firstInverseMass) first.position.addScaledVector(offset, -overlap * firstInverseMass / totalInverseMass);
  if (secondInverseMass) second.position.addScaledVector(offset, overlap * secondInverseMass / totalInverseMass);
  const relativeVelocity = second.velocity.clone().sub(first.velocity);
  const normalSpeed = relativeVelocity.dot(offset);
  if (normalSpeed < 0) {
    const impulse = -normalSpeed * .72 / totalInverseMass;
    if (firstInverseMass) first.velocity.addScaledVector(offset, -impulse * firstInverseMass);
    if (secondInverseMass) second.velocity.addScaledVector(offset, impulse * secondInverseMass);
    first.angularVelocity -= normalSpeed * .008;
    second.angularVelocity += normalSpeed * .008;
  }
  first.flash = Math.max(first.flash, .35);
  second.flash = Math.max(second.flash, .35);
}

function lockUfoCranePortCargo(mission, cargo, socket) {
  if (!mission || !cargo || !socket || socket.locked || mission.phase !== "playing") return;
  cargo.mode = "locked";
  cargo.held = false;
  cargo.locked = true;
  cargo.velocity.set(0, 0);
  cargo.position.set(socket.x, UFO_CRANE_PORT_FLOOR_Y + cargo.radius);
  cargo.root.position.set(cargo.position.x, cargo.position.y, -62);
  cargo.root.rotation.set(0, 0, 0);
  cargo.material.emissiveIntensity = 1.45;
  cargo.band.material.opacity = .9;
  socket.locked = true;
  socket.flash = 1;
  socket.halo.material.opacity = .86;
  socket.ghost.material.opacity = .04;
  socket.light.intensity = 6.4;
  mission.built += 1;
  mission.currentSocket += 1;
  if (mission.currentSocket < mission.sockets.length) {
    const next = mission.sockets[mission.currentSocket];
    next.halo.material.opacity = .58;
    next.ghost.material.opacity = .25;
    next.light.intensity = 4.6;
  }
  document.body.dataset.ufoCranePortAction = "capture";
  if (mission.built >= UFO_CRANE_PORT_REQUIRED_BUILDS) {
    mission.phase = "complete";
    state.ufoCranePortState = "complete";
    document.body.dataset.ufoCranePort = "complete";
    document.body.dataset.ufoCranePortPhase = "complete";
    showToast("建設港が完成。3つの実体モジュールをソケットへ固定しました。");
  } else {
    showToast("固定成功。次のソケットが点灯しました。次の資材を磁場接続できます。");
  }
}

function updateUfoCranePortCargoBodies(mission, delta) {
  const hook = mission.hook;
  const target = mission.sockets[mission.currentSocket];
  mission.cargos.forEach((cargo, index) => {
    cargo.flash = Math.max(0, cargo.flash - delta * 2.2);
    if (cargo.locked) {
      cargo.root.position.set(cargo.position.x, cargo.position.y, -62);
      cargo.material.emissiveIntensity = 1.32 + Math.sin(mission.elapsed * 4 + index) * .12;
      return;
    }
    if (cargo.mode === "staged") {
      const hover = cargo.home.clone();
      hover.y += Math.sin(mission.elapsed * 1.7 + index * 1.8) * 9;
      cargo.velocity.addScaledVector(hover.sub(cargo.position), delta * 3.4);
      cargo.velocity.multiplyScalar(Math.exp(-2.7 * delta));
    } else if (cargo.mode === "held") {
      const anchor = new THREE.Vector2(hook.x, hook.y - UFO_CRANE_PORT_HOOK_LOAD_OFFSET);
      const spring = anchor.sub(cargo.position);
      cargo.velocity.addScaledVector(spring, delta * 15.5);
      cargo.velocity.y -= UFO_CRANE_PORT_GRAVITY * delta * .26;
      cargo.velocity.multiplyScalar(Math.exp(-.48 * delta));
    } else if (cargo.mode === "loose") {
      cargo.velocity.y -= UFO_CRANE_PORT_GRAVITY * delta;
      cargo.velocity.multiplyScalar(Math.exp(-.17 * delta));
    }
    cargo.position.addScaledVector(cargo.velocity, delta);
    const side = UFO_CRANE_PORT_HALF_WIDTH - cargo.radius - 20;
    if (cargo.position.x < -side) {
      cargo.position.x = -side;
      cargo.velocity.x = Math.abs(cargo.velocity.x) * .58;
    } else if (cargo.position.x > side) {
      cargo.position.x = side;
      cargo.velocity.x = -Math.abs(cargo.velocity.x) * .58;
    }
    if (cargo.mode === "loose" && cargo.position.y - cargo.radius <= UFO_CRANE_PORT_FLOOR_Y) {
      const impact = Math.abs(cargo.velocity.y);
      cargo.position.y = UFO_CRANE_PORT_FLOOR_Y + cargo.radius;
      cargo.velocity.y = Math.abs(cargo.velocity.y) * .18;
      const isCurrentSocket = target && !target.locked
        && Math.abs(cargo.position.x - target.x) <= target.width - cargo.radius * .28;
      if (isCurrentSocket && impact >= 38) {
        lockUfoCranePortCargo(mission, cargo, target);
        return;
      }
      cargo.respawnAt = mission.elapsed + 1.12;
      cargo.mode = "returning";
      cargo.flash = .8;
    }
    if (cargo.mode === "returning") {
      cargo.velocity.multiplyScalar(Math.exp(-3.5 * delta));
      if (mission.elapsed >= cargo.respawnAt) {
        cargo.mode = "staged";
        cargo.position.copy(cargo.home);
        cargo.velocity.set(0, 0);
        cargo.flash = .65;
        showToast("資材はソケット外へ落ちたため、回収レールへ戻りました。位置を合わせてやり直せます。");
      }
    }
    cargo.angularVelocity *= Math.exp(-1.8 * delta);
    cargo.spin += cargo.angularVelocity * delta + cargo.velocity.x * delta * .0015;
    cargo.root.position.set(cargo.position.x, cargo.position.y, -62);
    cargo.root.rotation.z = cargo.spin;
    cargo.material.emissiveIntensity = .58 + cargo.flash * 1.35 + (cargo.held ? .75 : 0);
    cargo.band.material.opacity = .4 + cargo.flash * .34 + (cargo.held ? .28 : 0);
  });
  for (let firstIndex = 0; firstIndex < mission.cargos.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < mission.cargos.length; secondIndex += 1) {
      resolveUfoCranePortCargoContact(mission.cargos[firstIndex], mission.cargos[secondIndex]);
    }
  }
  mission.sockets.forEach((socket, index) => {
    socket.flash = Math.max(0, socket.flash - delta * 1.35);
    const isCurrent = index === mission.currentSocket && !socket.locked;
    socket.halo.rotation.z += delta * (isCurrent ? 1.55 : .42);
    socket.halo.material.opacity = socket.locked
      ? .58 + Math.sin(mission.elapsed * 5 + index) * .16
      : isCurrent
        ? .42 + Math.sin(mission.elapsed * 5.7) * .18
        : .15;
    socket.light.intensity = socket.locked ? 4.8 + socket.flash * 3 : isCurrent ? 3.4 + socket.flash * 3 : .9;
  });
}

function failUfoCranePortRound(mission) {
  if (mission.phase !== "playing") return;
  mission.phase = "failed";
  mission.hook.grabbed = null;
  mission.hook.phase = "search";
  state.ufoCranePortState = "failed";
  document.body.dataset.ufoCranePort = "failed";
  document.body.dataset.ufoCranePortPhase = "failed";
  document.body.dataset.ufoCranePortAction = "retry";
  showToast("建設時間が終了しました。ドックと資材を初期化して再挑戦できます。");
}

function updateUfoCranePortMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  const mission = control?.spaceCranePort;
  if (!mission?.active) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  updateUfoCranePortHook(control, mission, frameDelta);
  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - frameDelta);
    updateUfoCranePortCargoBodies(mission, frameDelta);
    if (mission.timeRemaining <= 0 && mission.phase === "playing") failUfoCranePortRound(mission);
  } else {
    updateUfoCranePortCargoBodies(mission, frameDelta);
  }
  const payload = mission.hook.grabbed;
  const stable = payload ? Math.round(clamp(100 - payload.velocity.length() * .13, 0, 100)) : 100;
  state.ufoCranePortState = mission.phase;
  state.ufoCranePortBuilt = mission.built;
  state.ufoCranePortStable = stable;
  state.ufoCranePortHooks = mission.hooks;
  document.body.dataset.ufoCranePortBuilt = String(mission.built);
  document.body.dataset.ufoCranePortStable = String(stable);
  document.body.dataset.ufoCranePortHooks = String(mission.hooks);
  updateUfoCranePortHud();
  updateUfoCranePortLifeHud();
}

function updateUfoCranePortLifeHud() {
  const mission = ufoDoorControls[0]?.spaceCranePort;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const seconds = Math.ceil(mission.timeRemaining);
  const percent = clamp(mission.timeRemaining / UFO_CRANE_PORT_DURATION * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "建設残り時間";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${seconds}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "最初の資材は中央にあります。磁場フックを資材へ合わせて建設を始めます。"
      : mission.phase === "playing"
        ? mission.hook.grabbed
          ? "磁場接続中。資材の横揺れが収まるまで待つと、ソケットへ安定して降ろせます。"
          : "光るソケットが次の固定位置です。資材を実際に接地させて固定します。"
        : mission.phase === "complete"
          ? "宇宙クレーン建設港が完成しました"
          : "時間切れです。港を再展開してもう一度組み立てられます";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && seconds <= 14 ? "true" : "false";
}

function updateUfoCranePortHud() {
  const mission = ufoDoorControls[0]?.spaceCranePort;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && mission?.active
    && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "宇宙クレーン建設港", first: "建造", second: "安定", third: "接続" });
  const phaseLabel = mission.phase === "ready" ? "港湾待機"
    : mission.phase === "playing" ? `残り ${Math.ceil(mission.timeRemaining)}秒`
      : mission.phase === "complete" ? "建設完了"
        : "再展開";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${mission.built}/${UFO_CRANE_PORT_REQUIRED_BUILDS}`;
  const payload = mission.hook.grabbed;
  const stability = payload ? Math.round(clamp(100 - payload.velocity.length() * .13, 0, 100)) : 100;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `${stability}%`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.hooks);
  const progress = mission.phase === "complete" ? 1 : clamp(mission.built / UFO_CRANE_PORT_REQUIRED_BUILDS, 0, .96);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "建設開始後、左右で磁場フックを資材へ合わせます。"
      : mission.phase === "playing"
        ? mission.hook.phase === "search"
          ? "資材の真上で磁場接続します。つかんだ後は同じ操作で荷下ろしに切り替わります。"
          : mission.hook.phase === "carry"
            ? "荷重が揺れています。光るソケットの真上へ移動し、揺れを読んで荷下ろししてください。"
            : "フックが回収レールへ戻っています。つぎの資材を接続できます。"
        : mission.phase === "complete"
          ? "3つのモジュールが実際に接地・固定され、建設港が完成しました。"
          : "建設港と資材を初期位置へ戻して、もう一度組み立てられます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "建設開始" : "港を再展開";
    els.ufoSpaceStartButton.setAttribute("aria-label", "宇宙クレーン建設港を開始する");
  }
  if (els.ufoSpaceFireButton) {
    const canAction = mission.phase === "playing" && (mission.hook.phase === "carry" || mission.hook.phase === "search");
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canAction;
    els.ufoSpaceFireButton.textContent = mission.hook.phase === "carry" ? "荷下ろし" : mission.hook.phase === "search" ? "磁場接続" : "フック回収中";
    els.ufoSpaceFireButton.setAttribute("aria-label", mission.hook.phase === "carry" ? "接続中の資材を荷下ろしする" : "磁場で資材を接続する");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.cranePort = "true";
    els.ufoSpaceCombat.dataset.cooldown = String(mission.hook.cooldown > 0 || mission.hook.phase === "return");
    els.ufoSpaceCombat.dataset.hit = String(mission.sockets.some(socket => socket.flash > 0));
    els.ufoSpaceCombat.dataset.tethered = String(Boolean(mission.hook.grabbed));
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Sixth physical arcade trial: gravity maze race -------------------------------
// The maze has no invisible lane switching. The core is one circular rigid body and
// every visible barrier is also used by the collision solver. The UFO's left/right
// movement tilts the gravity vector; a short pulse is only an extra impulse along
// that same direction, not an auto-correct or an aim assist.
function makeUfoGravityMazeMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-gravity-maze-race";
  group.visible = false;
  const board = new THREE.Group();
  board.name = "gravity-maze-race-board";
  group.add(board);
  const width = UFO_GRAVITY_MAZE_HALF_WIDTH;
  const height = UFO_GRAVITY_MAZE_HALF_HEIGHT;
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 2, height * 2),
    new THREE.MeshStandardMaterial({ color: 0x10182b, metalness: .78, roughness: .19, emissive: 0x061328, emissiveIntensity: .78, side: THREE.DoubleSide }),
  );
  panel.name = "gravity-maze-race-field";
  panel.position.z = 5;
  board.add(panel);
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(width * 2 + 52, height * 2 + 52, 34),
    new THREE.MeshStandardMaterial({ color: 0x030711, metalness: .93, roughness: .14, emissive: 0x01040d, emissiveIntensity: .62 }),
  );
  backing.position.z = 24;
  board.add(backing);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x87ecff, metalness: .8, roughness: .15, emissive: 0x16719b, emissiveIntensity: 1.16 });
  [
    [0, height + 12, width * 2 + 40, 16], [0, -height - 12, width * 2 + 40, 16],
    [-width - 12, 0, 16, height * 2 + 40], [width + 12, 0, 16, height * 2 + 40],
  ].forEach(([x, y, frameWidth, frameHeight], index) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, 18), frameMaterial.clone());
    frame.name = `gravity-maze-frame-${index + 1}`;
    frame.position.set(x, y, -12);
    board.add(frame);
  });

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2f4660, metalness: .9, roughness: .15, emissive: 0x0c2941, emissiveIntensity: .82 });
  const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0x76e8ff, transparent: true, opacity: .56, blending: THREE.AdditiveBlending, depthWrite: false });
  const makeWall = (name, x, y, wallWidth, wallHeight) => {
    const root = new THREE.Group();
    root.name = name;
    const body = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, wallHeight, 22), wallMaterial.clone());
    const edge = new THREE.Mesh(new THREE.BoxGeometry(Math.max(8, wallWidth - 18), 4, 8), edgeMaterial.clone());
    edge.position.z = -15;
    root.add(body, edge);
    root.position.set(x, y, -42);
    board.add(root);
    return { root, body, edge, x, y, width: wallWidth, height: wallHeight, left: x - wallWidth / 2, right: x + wallWidth / 2, top: y + wallHeight / 2, bottom: y - wallHeight / 2 };
  };
  // Upper-right → middle-left → lower-right → final-left. The openings are real gaps,
  // so the same geometry that looks passable is also passable in physics.
  const walls = [
    makeWall("gravity-maze-wall-one", -104, 166, 528, 24),
    makeWall("gravity-maze-wall-two", 104, 64, 548, 24),
    makeWall("gravity-maze-wall-three", -104, -40, 528, 24),
    makeWall("gravity-maze-wall-four", 104, -144, 548, 24),
  ];
  const checkpointSpecs = [
    { x: 265, y: 126, minX: 172, maxX: 360, tint: 0x80f8ff },
    { x: -265, y: 24, minX: -360, maxX: -172, tint: 0xffd681 },
    { x: 265, y: -80, minX: 172, maxX: 360, tint: 0xc6a7ff },
  ];
  const checkpoints = checkpointSpecs.map((spec, index) => {
    const root = new THREE.Group();
    root.name = `gravity-maze-checkpoint-${index + 1}`;
    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(14, 64, 14), new THREE.MeshStandardMaterial({ color: spec.tint, metalness: .7, roughness: .18, emissive: spec.tint, emissiveIntensity: .72 }));
    const rightPost = leftPost.clone();
    leftPost.position.x = -68;
    rightPost.position.x = 68;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(64, 4.5, 8, 28, Math.PI),
      new THREE.MeshBasicMaterial({ color: spec.tint, transparent: true, opacity: .58, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    arch.rotation.z = Math.PI;
    arch.position.y = 18;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(128, 5, 8), new THREE.MeshBasicMaterial({ color: spec.tint, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.z = -16;
    root.add(leftPost, rightPost, arch, beam);
    root.position.set(spec.x, spec.y, -62);
    board.add(root);
    return { ...spec, root, arch, beam, completed: false, flash: 0 };
  });
  const goal = new THREE.Group();
  goal.name = "gravity-maze-goal-dock";
  const goalOuter = new THREE.Mesh(
    new THREE.TorusGeometry(62, 9, 12, 48),
    new THREE.MeshStandardMaterial({ color: 0xffd275, metalness: .72, roughness: .15, emissive: 0xff8638, emissiveIntensity: 1.12 }),
  );
  const goalInner = new THREE.Mesh(
    new THREE.TorusGeometry(48, 3, 8, 42),
    new THREE.MeshBasicMaterial({ color: 0xfff3b3, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const goalField = new THREE.Mesh(
    new THREE.CircleGeometry(44, 36),
    new THREE.MeshBasicMaterial({ color: 0xffc36b, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  goalField.position.z = 4;
  const goalLight = new THREE.PointLight(0xffc872, 3.6, 600, 1.6);
  goalLight.position.z = -118;
  goalLight.userData.nonCollidable = true;
  goal.add(goalOuter, goalInner, goalField, goalLight);
  goal.position.set(-246, -236, -62);
  board.add(goal);

  const coreRoot = new THREE.Group();
  coreRoot.name = "gravity-maze-race-core";
  const coreMaterial = new THREE.MeshStandardMaterial({ color: 0xeaffff, metalness: .62, roughness: .18, emissive: 0x69eaff, emissiveIntensity: 2.1 });
  const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(UFO_GRAVITY_MAZE_CORE_RADIUS, 26, 18), coreMaterial);
  const coreRingA = new THREE.Mesh(new THREE.TorusGeometry(UFO_GRAVITY_MAZE_CORE_RADIUS * 1.26, 2.8, 8, 28), new THREE.MeshBasicMaterial({ color: 0x8bfbff, transparent: true, opacity: .78, blending: THREE.AdditiveBlending, depthWrite: false }));
  coreRingA.rotation.x = Math.PI / 2;
  coreRingA.position.z = -UFO_GRAVITY_MAZE_CORE_RADIUS * .56 - 8;
  const coreRingB = coreRingA.clone();
  coreRingB.scale.setScalar(.7);
  coreRingB.rotation.z = Math.PI / 2;
  const coreLight = new THREE.PointLight(0x97f8ff, 2.5, 440, 1.7);
  coreLight.position.z = -70;
  coreLight.userData.nonCollidable = true;
  coreRoot.add(coreMesh, coreRingA, coreRingB, coreLight);
  coreRoot.position.set(0, 242, -68);
  board.add(coreRoot);

  const gravityIndicator = new THREE.Group();
  gravityIndicator.name = "gravity-maze-gravity-indicator";
  const indicatorDial = new THREE.Mesh(
    new THREE.RingGeometry(35, 42, 32),
    new THREE.MeshBasicMaterial({ color: 0x83f7ff, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  const indicatorArrow = new THREE.Mesh(
    new THREE.ConeGeometry(14, 42, 3),
    new THREE.MeshBasicMaterial({ color: 0xe9ffff, transparent: true, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  indicatorArrow.rotation.z = Math.PI;
  indicatorArrow.position.y = -6;
  gravityIndicator.add(indicatorDial, indicatorArrow);
  gravityIndicator.position.set(0, 258, -76);
  board.add(gravityIndicator);
  const gravityLight = new THREE.PointLight(0x78e8ff, 3.4, 1500, 1.7);
  gravityLight.position.set(0, 0, -240);
  gravityLight.userData.nonCollidable = true;
  board.add(gravityLight);

  const trailPoints = Array.from({ length: 24 }, () => new THREE.Vector3(0, 242, -70));
  const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({ color: 0x85faff, transparent: true, opacity: .33, depthWrite: false }));
  trail.name = "gravity-maze-core-trail";
  board.add(trail);
  return {
    group, board, walls, checkpoints, goal: { root: goal, outer: goalOuter, inner: goalInner, field: goalField, light: goalLight, x: -246, y: -236, radius: 54, flash: 0 },
    core: { root: coreRoot, mesh: coreMesh, material: coreMaterial, ringA: coreRingA, ringB: coreRingB, position: new THREE.Vector2(0, 242), previousPosition: new THREE.Vector2(0, 242), velocity: new THREE.Vector2(), radius: UFO_GRAVITY_MAZE_CORE_RADIUS, flash: 0, spin: 0, pulseCooldown: 0 },
    indicator: { root: gravityIndicator, arrow: indicatorArrow, dial: indicatorDial },
    trail: { mesh: trail, points: trailPoints, geometry: trailGeometry },
    active: false, phase: "idle", elapsed: 0, timeRemaining: UFO_GRAVITY_MAZE_DURATION, checkpointsCleared: 0, pulses: 0, tilt: 0, tiltTarget: 0, origin: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), testMode: false,
  };
}

function resetUfoGravityMazeCore(mission, { resetCheckpoints = true } = {}) {
  if (!mission) return;
  const core = mission.core;
  core.position.set(0, 242);
  core.previousPosition.copy(core.position);
  core.velocity.set(0, 0);
  core.flash = 0;
  core.spin = 0;
  core.pulseCooldown = 0;
  core.root.position.set(0, 242, -68);
  core.root.rotation.set(0, 0, 0);
  if (resetCheckpoints) {
    mission.checkpointsCleared = 0;
    mission.checkpoints.forEach((checkpoint, index) => {
      checkpoint.completed = false;
      checkpoint.flash = 0;
      checkpoint.arch.material.opacity = index === 0 ? .86 : .28;
      checkpoint.beam.material.opacity = index === 0 ? .48 : .12;
    });
  }
  mission.goal.flash = 0;
  mission.goal.field.material.opacity = .16;
  mission.trail.points.forEach(point => point.set(0, 242, -70));
  mission.trail.geometry.setFromPoints(mission.trail.points);
}

function resetUfoGravityMazeMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_GRAVITY_MAZE_DURATION;
  mission.checkpointsCleared = 0;
  mission.pulses = 0;
  mission.tilt = 0;
  mission.tiltTarget = 0;
  mission.group.visible = false;
  resetUfoGravityMazeCore(mission);
  state.ufoGravityMazeState = "idle";
  state.ufoGravityMazeCheckpoints = 0;
  state.ufoGravityMazeTilt = 0;
  state.ufoGravityMazePulses = 0;
  delete document.body.dataset.ufoGravityMaze;
  delete document.body.dataset.ufoGravityMazePhase;
  delete document.body.dataset.ufoGravityMazeCheckpoints;
  delete document.body.dataset.ufoGravityMazeTilt;
  delete document.body.dataset.ufoGravityMazePulses;
  delete document.body.dataset.ufoGravityMazeAction;
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoGravityMazeMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  mission.origin.copy(craftCenter).addScaledVector(forward, UFO_GRAVITY_MAZE_DISTANCE);
  mission.forward.copy(forward);
  mission.group.position.copy(mission.origin);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_GRAVITY_MAZE_DURATION;
  mission.pulses = 0;
  mission.tilt = 0;
  mission.tiltTarget = 0;
  mission.group.visible = true;
  resetUfoGravityMazeCore(mission);
  state.ufoGravityMazeState = "ready";
  state.ufoGravityMazeCheckpoints = 0;
  state.ufoGravityMazeTilt = 0;
  state.ufoGravityMazePulses = 0;
  document.body.dataset.ufoGravityMaze = "ready";
  document.body.dataset.ufoGravityMazePhase = "ready";
  document.body.dataset.ufoGravityMazeCheckpoints = "0";
  document.body.dataset.ufoGravityMazeTilt = "0";
  document.body.dataset.ufoGravityMazePulses = "0";
  document.body.dataset.ufoGravityMazeAction = "pulse";
  return true;
}

function activateUfoGravityMazeTestMode(control) {
  const mission = control?.spaceGravityMaze;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(control.spaceRingBattle);
  resetUfoCranePortMission(control.spaceCranePort);
  resetUfoGravityMazeMission(mission);
  if (!prepareUfoGravityMazeMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "gravity-maze-race-prototype";
  document.body.dataset.ufoSpaceMission = "gravity-maze-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("重力迷路レース", "左右で重力を傾ける");
  updateUfoGravityMazeHud();
  updateUfoGravityMazeLifeHud();
  updateUfoControls();
  showToast("重力迷路レース。UFOを左右へ動かすと重力が傾きます。コアを実際の壁と開口部の迷路へ通してください。");
  return true;
}

function startUfoGravityMazeRound() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceGravityMaze;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoGravityMazeMission(mission);
    if (!prepareUfoGravityMazeMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  state.ufoGravityMazeState = "playing";
  document.body.dataset.ufoGravityMaze = "playing";
  document.body.dataset.ufoGravityMazePhase = "playing";
  document.body.dataset.ufoGravityMazeAction = "pulse";
  showToast("レース開始。上から順に右・左・右の開口部を通り、最後は左のゴールドゴールを目指します。");
  updateUfoGravityMazeHud();
  updateUfoGravityMazeLifeHud();
  return true;
}

function useUfoGravityMazePulse() {
  const mission = ufoDoorControls[0]?.spaceGravityMaze;
  const core = mission?.core;
  if (!mission?.active || mission.phase !== "playing" || !core || core.pulseCooldown > 0) return false;
  const gravity = new THREE.Vector2(mission.tilt * UFO_GRAVITY_MAZE_TILT_FORCE, -UFO_GRAVITY_MAZE_DOWN_FORCE);
  if (gravity.lengthSq() < .001) gravity.set(0, -1);
  gravity.normalize();
  core.velocity.addScaledVector(gravity, UFO_GRAVITY_MAZE_PULSE_FORCE);
  core.flash = 1;
  core.pulseCooldown = UFO_GRAVITY_MAZE_PULSE_COOLDOWN;
  mission.pulses += 1;
  document.body.dataset.ufoGravityMazeAction = "cooldown";
  showToast("重力パルス。現在の傾き方向へコアを押し出しました。");
  return true;
}

function resolveUfoGravityMazeCircleWall(core, wall) {
  const closestX = clamp(core.position.x, wall.left, wall.right);
  const closestY = clamp(core.position.y, wall.bottom, wall.top);
  let normal = core.position.clone().sub(new THREE.Vector2(closestX, closestY));
  let distance = normal.length();
  if (distance >= core.radius) return false;
  if (distance < .001) {
    const options = [
      { distance: Math.abs(core.position.x - wall.left), normal: new THREE.Vector2(-1, 0) },
      { distance: Math.abs(wall.right - core.position.x), normal: new THREE.Vector2(1, 0) },
      { distance: Math.abs(core.position.y - wall.bottom), normal: new THREE.Vector2(0, -1) },
      { distance: Math.abs(wall.top - core.position.y), normal: new THREE.Vector2(0, 1) },
    ].sort((first, second) => first.distance - second.distance);
    normal = options[0].normal;
    distance = 0;
  } else {
    normal.multiplyScalar(1 / distance);
  }
  core.position.addScaledVector(normal, core.radius - distance + .24);
  const normalSpeed = core.velocity.dot(normal);
  if (normalSpeed < 0) {
    core.velocity.addScaledVector(normal, -normalSpeed * 1.56);
    const tangent = new THREE.Vector2(-normal.y, normal.x);
    const tangentialSpeed = core.velocity.dot(tangent);
    core.velocity.addScaledVector(tangent, -tangentialSpeed * .1);
  }
  core.flash = Math.max(core.flash, .46);
  return true;
}

function resetUfoGravityMazeAfterDrop(mission) {
  if (!mission || mission.phase !== "playing") return;
  resetUfoGravityMazeCore(mission);
  document.body.dataset.ufoGravityMazeAction = "pulse";
  showToast("コアが迷路の外へ落ちました。開始位置へ再投下しました。チェックポイントは最初からです。");
}

function scoreUfoGravityMazeCheckpoint(mission, checkpoint) {
  if (!mission || checkpoint.completed) return;
  checkpoint.completed = true;
  checkpoint.flash = 1;
  checkpoint.arch.material.opacity = .98;
  checkpoint.beam.material.opacity = .74;
  mission.checkpointsCleared += 1;
  showToast(`チェックポイント ${mission.checkpointsCleared}/${UFO_GRAVITY_MAZE_REQUIRED_CHECKPOINTS}。次の開口部へ重力を傾けてください。`);
}

function completeUfoGravityMazeRace(mission) {
  if (!mission || mission.phase !== "playing") return;
  mission.phase = "complete";
  mission.goal.flash = 1;
  state.ufoGravityMazeState = "complete";
  document.body.dataset.ufoGravityMaze = "complete";
  document.body.dataset.ufoGravityMazePhase = "complete";
  document.body.dataset.ufoGravityMazeAction = "complete";
  showToast("重力迷路レース完走。すべての実体ゲートを通り、ゴールドゴールへ到着しました。");
}

function failUfoGravityMazeRace(mission) {
  if (!mission || mission.phase !== "playing") return;
  mission.phase = "failed";
  state.ufoGravityMazeState = "failed";
  document.body.dataset.ufoGravityMaze = "failed";
  document.body.dataset.ufoGravityMazePhase = "failed";
  document.body.dataset.ufoGravityMazeAction = "retry";
  showToast("レース時間が終了しました。重力コアとゲートを初期化して再挑戦できます。");
}

function updateUfoGravityMazePhysics(control, mission, delta) {
  const craft = control?.craftAssembly;
  const core = mission.core;
  if (!craft) return;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const rawX = craftCenter.clone().sub(mission.origin).dot(mission.right);
  mission.tiltTarget = clamp(rawX / 282, -1, 1);
  mission.tilt += (mission.tiltTarget - mission.tilt) * (1 - Math.exp(-4.8 * delta));
  core.pulseCooldown = Math.max(0, core.pulseCooldown - delta);
  const gravity = new THREE.Vector2(mission.tilt * UFO_GRAVITY_MAZE_TILT_FORCE, -UFO_GRAVITY_MAZE_DOWN_FORCE);
  core.previousPosition.copy(core.position);
  core.velocity.addScaledVector(gravity, delta);
  core.velocity.multiplyScalar(Math.exp(-.34 * delta));
  core.position.addScaledVector(core.velocity, delta);
  mission.walls.forEach(wall => resolveUfoGravityMazeCircleWall(core, wall));
  const side = UFO_GRAVITY_MAZE_HALF_WIDTH - core.radius - 3;
  if (core.position.x < -side) {
    core.position.x = -side;
    core.velocity.x = Math.abs(core.velocity.x) * .6;
    core.flash = Math.max(core.flash, .35);
  } else if (core.position.x > side) {
    core.position.x = side;
    core.velocity.x = -Math.abs(core.velocity.x) * .6;
    core.flash = Math.max(core.flash, .35);
  }
  mission.checkpoints.forEach(checkpoint => {
    const crossed = core.previousPosition.y > checkpoint.y && core.position.y <= checkpoint.y;
    if (!checkpoint.completed && crossed && core.position.x >= checkpoint.minX && core.position.x <= checkpoint.maxX) {
      scoreUfoGravityMazeCheckpoint(mission, checkpoint);
    }
  });
  if (mission.checkpointsCleared >= UFO_GRAVITY_MAZE_REQUIRED_CHECKPOINTS) {
    const distanceToGoal = core.position.distanceTo(new THREE.Vector2(mission.goal.x, mission.goal.y));
    if (distanceToGoal <= mission.goal.radius) completeUfoGravityMazeRace(mission);
  }
  if (core.position.y < -UFO_GRAVITY_MAZE_HALF_HEIGHT - core.radius * 2) resetUfoGravityMazeAfterDrop(mission);
  core.flash = Math.max(0, core.flash - delta * 2.8);
  core.spin += (core.velocity.x * .012 - core.velocity.y * .006) * delta;
  core.root.position.set(core.position.x, core.position.y, -68);
  core.root.rotation.z = core.spin;
  core.material.emissiveIntensity = 2.05 + core.flash * 2.1;
  core.ringA.material.opacity = .58 + core.flash * .34;
  core.ringB.material.opacity = .42 + core.flash * .4;
  mission.indicator.root.rotation.z = -mission.tilt * .54;
  mission.indicator.dial.material.opacity = .48 + Math.abs(mission.tilt) * .26;
  mission.indicator.arrow.material.opacity = .7 + Math.abs(mission.tilt) * .22;
  mission.trail.points.pop();
  mission.trail.points.unshift(new THREE.Vector3(core.position.x, core.position.y, -70));
  mission.trail.geometry.setFromPoints(mission.trail.points);
  mission.checkpoints.forEach((checkpoint, index) => {
    checkpoint.flash = Math.max(0, checkpoint.flash - delta * 1.2);
    const next = !checkpoint.completed && index === mission.checkpointsCleared;
    checkpoint.arch.rotation.z += delta * (next ? 1.45 : .34);
    checkpoint.arch.material.opacity = checkpoint.completed ? .84 + Math.sin(mission.elapsed * 5 + index) * .12 : next ? .62 + Math.sin(mission.elapsed * 5.8) * .19 : .22;
    checkpoint.beam.material.opacity = checkpoint.completed ? .54 : next ? .36 : .08;
  });
  mission.goal.flash = Math.max(0, mission.goal.flash - delta * .9);
  mission.goal.outer.rotation.z += delta * 1.22;
  mission.goal.inner.rotation.z -= delta * 2.1;
  mission.goal.field.material.opacity = .11 + Math.sin(mission.elapsed * 5) * .05 + mission.goal.flash * .44;
  mission.goal.light.intensity = 3.3 + mission.goal.flash * 4.4 + (mission.checkpointsCleared >= 3 ? 1.6 : 0);
}

function updateUfoGravityMazeMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  const mission = control?.spaceGravityMaze;
  if (!mission?.active) return;
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, mission.timeRemaining - frameDelta);
    updateUfoGravityMazePhysics(control, mission, frameDelta);
    if (mission.timeRemaining <= 0 && mission.phase === "playing") failUfoGravityMazeRace(mission);
  } else {
    mission.indicator.root.rotation.z = -mission.tilt * .54;
    mission.goal.outer.rotation.z += frameDelta * .35;
  }
  state.ufoGravityMazeState = mission.phase;
  state.ufoGravityMazeCheckpoints = mission.checkpointsCleared;
  state.ufoGravityMazeTilt = Math.round(mission.tilt * 100);
  state.ufoGravityMazePulses = mission.pulses;
  document.body.dataset.ufoGravityMazeCheckpoints = String(mission.checkpointsCleared);
  document.body.dataset.ufoGravityMazeTilt = String(Math.round(mission.tilt * 100));
  document.body.dataset.ufoGravityMazePulses = String(mission.pulses);
  document.body.dataset.ufoGravityMazeAction = mission.core.pulseCooldown > 0 ? "cooldown" : "pulse";
  updateUfoGravityMazeHud();
  updateUfoGravityMazeLifeHud();
}

function updateUfoGravityMazeLifeHud() {
  const mission = ufoDoorControls[0]?.spaceGravityMaze;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const seconds = Math.ceil(mission.timeRemaining);
  const percent = clamp(mission.timeRemaining / UFO_GRAVITY_MAZE_DURATION * 100, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "レース残り時間";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${seconds}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "最初の開口部は右側です。建設物のような見た目だけの隙間ではなく、物理上も通れる空間です。"
      : mission.phase === "playing"
        ? "UFOを左右へ動かすと重力の横傾きが変わります。Fキーは現在の重力方向へ短く加速します。"
        : mission.phase === "complete"
          ? "重力迷路レースを完走しました"
          : "時間切れです。コアと全ゲートを初期位置へ戻して再挑戦できます";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && seconds <= 12 ? "true" : "false";
}

function updateUfoGravityMazeHud() {
  const mission = ufoDoorControls[0]?.spaceGravityMaze;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && state.ufoEngineMode === "ready" && mission?.active && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "重力迷路レース", first: "ゲート", second: "傾き", third: "パルス" });
  const phaseLabel = mission.phase === "ready" ? "重力待機"
    : mission.phase === "playing" ? `残り ${Math.ceil(mission.timeRemaining)}秒`
      : mission.phase === "complete" ? "完走"
        : "再挑戦";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${mission.checkpointsCleared}/${UFO_GRAVITY_MAZE_REQUIRED_CHECKPOINTS}`;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `${mission.tilt > 0 ? "+" : ""}${Math.round(mission.tilt * 100)}%`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.pulses);
  const progress = mission.phase === "complete" ? 1 : clamp(mission.checkpointsCleared / (UFO_GRAVITY_MAZE_REQUIRED_CHECKPOINTS + 1), 0, .94);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "開始後、最初は右の開口部を目指します。UFOの左右移動がそのまま重力の左右傾きです。"
      : mission.phase === "playing"
        ? `次の開口部：${mission.checkpointsCleared === 0 ? "右" : mission.checkpointsCleared === 1 ? "左" : mission.checkpointsCleared === 2 ? "右" : "左のゴールドゴール"}。壁との衝突と勢いを読みながら傾けてください。`
        : mission.phase === "complete"
          ? `ゲート ${mission.checkpointsCleared}/${UFO_GRAVITY_MAZE_REQUIRED_CHECKPOINTS} を通過して完走しました。`
          : "コアとゲートを初期位置へ戻して、もう一度レースできます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "レース開始" : "コアを再投下";
    els.ufoSpaceStartButton.setAttribute("aria-label", "重力迷路レースを開始する");
  }
  if (els.ufoSpaceFireButton) {
    const canPulse = mission.phase === "playing" && mission.core.pulseCooldown <= 0;
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canPulse;
    els.ufoSpaceFireButton.textContent = canPulse ? "重力パルス" : "充填中";
    els.ufoSpaceFireButton.setAttribute("aria-label", "現在の重力方向へコアを押し出す重力パルス");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.gravityMaze = "true";
    els.ufoSpaceCombat.dataset.cooldown = String(mission.core.pulseCooldown > 0);
    els.ufoSpaceCombat.dataset.hit = String(mission.checkpoints.some(checkpoint => checkpoint.flash > 0));
    els.ufoSpaceCombat.dataset.tethered = "false";
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Seventh physical flight trial: Mars inertia slingshot ---------------------------
// This route stays in the actual space scene.  The rocks, tether and capture gate are
// world-space objects; the resulting velocity is written back into the real UFO flight
// state rather than moving a separate token on an overlay board.
function makeUfoInertiaSlingshotMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-inertia-slingshot-route";
  group.visible = false;

  const tetherMaterial = new THREE.LineBasicMaterial({ color: 0x8df6ff, transparent: true, opacity: .9, depthWrite: false });
  const tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), tetherMaterial);
  tether.name = "mars-route-physical-tether";
  tether.visible = false;
  group.add(tether);

  const makeAnchor = (name, x, z, y, radius, mass, tint, drift) => {
    const root = new THREE.Group();
    root.name = name;
    const material = new THREE.MeshStandardMaterial({ color: tint, metalness: .38, roughness: .78, emissive: 0x091426, emissiveIntensity: .44 });
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), material);
    body.scale.set(1.15, .82, .96);
    body.castShadow = true;
    const fissureMaterial = new THREE.MeshBasicMaterial({ color: 0x5af4ff, transparent: true, opacity: .52, blending: THREE.AdditiveBlending, depthWrite: false });
    const fissureA = new THREE.Mesh(new THREE.TorusGeometry(radius * .72, 3.8, 7, 36), fissureMaterial);
    fissureA.rotation.x = Math.PI / 2.8;
    fissureA.rotation.z = .32;
    const fissureB = new THREE.Mesh(new THREE.TorusGeometry(radius * .46, 2.4, 7, 30), fissureMaterial.clone());
    fissureB.rotation.x = Math.PI / 3.4;
    fissureB.rotation.y = .48;
    const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 1.08, radius * 1.16, 42), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -radius * .82;
    const light = new THREE.PointLight(tint, 3.1, radius * 9, 1.65);
    light.userData.nonCollidable = true;
    root.add(body, fissureA, fissureB, halo, light);
    root.position.set(x, y, z);
    group.add(root);
    return {
      root, body, fissures: [fissureA, fissureB], halo, light, radius, mass,
      basePosition: new THREE.Vector2(x, z), position: new THREE.Vector2(x, z), velocity: new THREE.Vector2(drift[0], drift[1]), initialVelocity: new THREE.Vector2(drift[0], drift[1]), y, spin: Math.random() * Math.PI * 2,
    };
  };

  const anchors = [
    makeAnchor("mars-route-anchor-amber", 182, 690, 24, 164, 620, 0x4f88a5, [-4, 3]),
    makeAnchor("mars-route-anchor-indigo", -268, 1580, -32, 148, 520, 0x6a5c9c, [5, -2]),
    makeAnchor("mars-route-anchor-gold", 116, 2390, 44, 182, 760, 0x91654a, [-3, 2]),
  ];

  const capture = new THREE.Group();
  capture.name = "mars-capture-orbit";
  const outerMaterial = new THREE.MeshStandardMaterial({ color: 0xffaf61, metalness: .72, roughness: .16, emissive: 0xb94618, emissiveIntensity: 1.15 });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(UFO_INERTIA_SLINGSHOT_CAPTURE_RADIUS, 11, 12, 72), outerMaterial);
  const innerMaterial = new THREE.MeshBasicMaterial({ color: 0xffe4a8, transparent: true, opacity: .48, blending: THREE.AdditiveBlending, depthWrite: false });
  const inner = new THREE.Mesh(new THREE.TorusGeometry(UFO_INERTIA_SLINGSHOT_CAPTURE_RADIUS * .74, 4, 9, 54), innerMaterial);
  const fieldMaterial = new THREE.MeshBasicMaterial({ color: 0xff8b4a, transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const field = new THREE.Mesh(new THREE.CircleGeometry(UFO_INERTIA_SLINGSHOT_CAPTURE_RADIUS * .92, 64), fieldMaterial);
  field.position.z = 4;
  const light = new THREE.PointLight(0xff9e54, 7.4, 2200, 1.55);
  light.userData.nonCollidable = true;
  capture.add(outer, inner, field, light);
  capture.position.set(0, 10, UFO_INERTIA_SLINGSHOT_CAPTURE_DISTANCE);
  group.add(capture);

  const routeMarkers = [];
  [420, 1120, 1980, 2800].forEach((distance, index) => {
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(13, 20, 24),
      new THREE.MeshBasicMaterial({ color: index === 3 ? 0xffc272 : 0x77edff, transparent: true, opacity: .52, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    marker.rotation.x = Math.PI / 2;
    marker.position.set(index % 2 ? -34 : 34, -12, distance);
    group.add(marker);
    routeMarkers.push(marker);
  });

  return {
    group, anchors, tether: { mesh: tether, material: tetherMaterial, geometry: tether.geometry }, capture: { root: capture, outer, inner, field, light }, routeMarkers,
    active: false, phase: "idle", elapsed: 0, timeRemaining: UFO_INERTIA_SLINGSHOT_DURATION,
    origin: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0),
    craftLocal: new THREE.Vector2(), shipVelocity: new THREE.Vector2(), tetheredAnchor: null, tetherLength: 0,
    tension: 0, maxTension: 0, releases: 0, releaseQualified: false, integrity: 100, impactCooldown: 0, captureMissed: false, completed: false, testMode: false,
  };
}

function resetUfoInertiaSlingshotMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_INERTIA_SLINGSHOT_DURATION;
  mission.shipVelocity.set(0, 0);
  mission.tetheredAnchor = null;
  mission.tetherLength = 0;
  mission.tension = 0;
  mission.maxTension = 0;
  mission.releases = 0;
  mission.releaseQualified = false;
  mission.integrity = 100;
  mission.impactCooldown = 0;
  mission.captureMissed = false;
  mission.completed = false;
  mission.group.visible = false;
  mission.tether.mesh.visible = false;
  mission.anchors.forEach(anchor => {
    anchor.position.copy(anchor.basePosition);
    anchor.velocity.copy(anchor.initialVelocity);
    anchor.root.position.set(anchor.position.x, anchor.y, anchor.position.y);
    anchor.root.rotation.set(0, 0, 0);
  });
  state.ufoInertiaSlingshotState = "idle";
  state.ufoInertiaSlingshotDistance = 0;
  state.ufoInertiaSlingshotTension = 0;
  state.ufoInertiaSlingshotReleases = 0;
  ["ufoInertiaSlingshot", "ufoInertiaSlingshotPhase", "ufoInertiaSlingshotDistance", "ufoInertiaSlingshotTension", "ufoInertiaSlingshotReleases", "ufoInertiaSlingshotAction"].forEach(key => delete document.body.dataset[key]);
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoInertiaSlingshotMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control).setY(0);
  if (forward.lengthSq() < .001) forward.set(0, 0, -1);
  forward.normalize();
  mission.origin.copy(craftCenter);
  mission.forward.copy(forward);
  mission.group.position.copy(craftCenter);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_INERTIA_SLINGSHOT_DURATION;
  mission.shipVelocity.set(0, 0);
  mission.craftLocal.set(0, 0);
  mission.tetheredAnchor = null;
  mission.tetherLength = 0;
  mission.tension = 0;
  mission.maxTension = 0;
  mission.releases = 0;
  mission.releaseQualified = false;
  mission.integrity = 100;
  mission.impactCooldown = 0;
  mission.captureMissed = false;
  mission.completed = false;
  mission.anchors.forEach(anchor => {
    anchor.position.copy(anchor.basePosition);
    anchor.velocity.copy(anchor.initialVelocity);
    anchor.root.position.set(anchor.position.x, anchor.y, anchor.position.y);
  });
  mission.tether.mesh.visible = false;
  mission.group.visible = true;
  state.ufoInertiaSlingshotState = "ready";
  state.ufoInertiaSlingshotDistance = 0;
  state.ufoInertiaSlingshotTension = 0;
  state.ufoInertiaSlingshotReleases = 0;
  document.body.dataset.ufoInertiaSlingshot = "ready";
  document.body.dataset.ufoInertiaSlingshotPhase = "ready";
  document.body.dataset.ufoInertiaSlingshotDistance = "0";
  document.body.dataset.ufoInertiaSlingshotTension = "0";
  document.body.dataset.ufoInertiaSlingshotReleases = "0";
  document.body.dataset.ufoInertiaSlingshotAction = "connect";
  return true;
}

function activateUfoInertiaSlingshotTestMode(control) {
  const mission = control?.spaceInertiaSlingshot;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(control.spaceRingBattle);
  resetUfoCranePortMission(control.spaceCranePort);
  resetUfoGravityMazeMission(control.spaceGravityMaze);
  resetUfoInertiaSlingshotMission(mission);
  if (!prepareUfoInertiaSlingshotMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "mars-inertia-slingshot-prototype";
  document.body.dataset.ufoSpaceMission = "mars-inertia-slingshot-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("火星航路・慣性スリング", "左右で軌道補正 / Fでテザー");
  updateUfoInertiaSlingshotHud();
  updateUfoInertiaSlingshotLifeHud();
  updateUfoControls();
  showToast("火星航路・慣性スリング。岩塊へテザーを接続し、張力が乗った瞬間に解放して火星側の捕獲軌道へ抜けます。");
  return true;
}

function startUfoInertiaSlingshotRoute() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceInertiaSlingshot;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoInertiaSlingshotMission(mission);
    if (!prepareUfoInertiaSlingshotMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  mission.shipVelocity.set(0, 144);
  state.ufoInertiaSlingshotState = "playing";
  document.body.dataset.ufoInertiaSlingshot = "playing";
  document.body.dataset.ufoInertiaSlingshotPhase = "playing";
  document.body.dataset.ufoInertiaSlingshotAction = "connect";
  showToast("航路開始。最初の青い岩塊へ近づき、Fでテザーを接続してください。左右の操縦で張力と解放方向を整えます。");
  updateUfoInertiaSlingshotHud();
  updateUfoInertiaSlingshotLifeHud();
  return true;
}

function getUfoInertiaSlingshotCraftLocal(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return new THREE.Vector2();
  craft.updateWorldMatrix(true, true);
  const world = craft.getWorldPosition(new THREE.Vector3());
  const local = mission.group.worldToLocal(world);
  return new THREE.Vector2(local.x, local.z);
}

function setUfoInertiaSlingshotCraftLocal(control, mission, local) {
  const nextWorld = mission.group.localToWorld(new THREE.Vector3(local.x, 0, local.y));
  const flight = ufoWorldToLocal(control, nextWorld.x, nextWorld.z);
  const scale = control.scale || BUILDING_SCALE;
  state.ufoFlightX = flight.x;
  state.ufoFlightZ = flight.z;
  state.ufoFlightY = clampUfoSpaceFlightY((nextWorld.y - (control.originY || 0)) / scale);
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
}

function finishUfoInertiaSlingshotMission(mission, phase, message) {
  if (!mission || !mission.active) return;
  mission.phase = phase;
  mission.completed = phase === "complete";
  mission.shipVelocity.multiplyScalar(.14);
  mission.tetheredAnchor = null;
  mission.tension = 0;
  mission.tether.mesh.visible = false;
  state.ufoInertiaSlingshotState = phase;
  document.body.dataset.ufoInertiaSlingshot = phase;
  document.body.dataset.ufoInertiaSlingshotPhase = phase;
  document.body.dataset.ufoInertiaSlingshotAction = phase === "complete" ? "complete" : "retry";
  if (message) showToast(message);
}

function useUfoInertiaSlingshotTether() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceInertiaSlingshot;
  if (!mission?.active || mission.phase !== "playing") return false;
  const craft = getUfoInertiaSlingshotCraftLocal(control, mission);
  if (mission.tetheredAnchor) {
    const qualified = mission.tension >= 46 || mission.maxTension >= 112;
    mission.releaseQualified = mission.releaseQualified || qualified;
    mission.releases += 1;
    mission.tetheredAnchor = null;
    mission.tension = 0;
    mission.tether.mesh.visible = false;
    document.body.dataset.ufoInertiaSlingshotAction = "connect";
    showToast(qualified ? "テザー解放。蓄えた張力が実際の慣性として航路に残ります。" : "テザー解放。まだ張力が足りません。岩塊の外側へ引き出してから離すと加速します。");
    return true;
  }
  const candidates = mission.anchors
    .map(anchor => ({ anchor, distance: craft.distanceTo(anchor.position) }))
    .filter(candidate => candidate.distance <= UFO_INERTIA_SLINGSHOT_GRAPPLE_RANGE)
    .sort((a, b) => a.distance - b.distance);
  if (!candidates.length) {
    showToast("テザー圏外です。青い岩塊へさらに近づいてください。");
    return false;
  }
  const selected = candidates[0];
  mission.tetheredAnchor = selected.anchor;
  mission.tetherLength = Math.max(UFO_INERTIA_SLINGSHOT_MIN_TETHER_LENGTH, selected.distance * .64);
  mission.tension = 0;
  mission.tether.mesh.visible = true;
  document.body.dataset.ufoInertiaSlingshotAction = "release";
  showToast("テザー接続。岩塊の外側へ抜けると張力が生まれます。十分に引かれた瞬間に同じ操作で解放してください。");
  return true;
}

function updateUfoInertiaSlingshotMission(delta) {
  const control = ufoDoorControls[0];
  const mission = control?.spaceInertiaSlingshot;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace) return;
  const frameDelta = Math.min(.05, Math.max(0, delta || 0));
  mission.anchors.forEach((anchor, index) => {
    anchor.spin += frameDelta * (.24 + index * .08);
    anchor.body.rotation.y += frameDelta * (.38 + index * .13);
    anchor.fissures[0].rotation.z += frameDelta * (.33 + index * .06);
    anchor.fissures[1].rotation.y -= frameDelta * (.26 + index * .05);
    anchor.halo.rotation.z += frameDelta * (.16 + index * .04);
    anchor.light.intensity = 2.5 + Math.sin(anchor.spin * 2.1) * .45;
  });
  mission.capture.root.rotation.z += frameDelta * .26;
  mission.capture.inner.rotation.z -= frameDelta * .44;
  mission.capture.field.material.opacity = mission.phase === "complete" ? .34 : mission.releaseQualified ? .19 : .08;
  mission.routeMarkers.forEach((marker, index) => {
    marker.rotation.z += frameDelta * (index % 2 ? -1.4 : 1.2);
    marker.material.opacity = .32 + Math.sin(mission.elapsed * 2.2 + index) * .13;
  });

  if (mission.phase === "playing") {
    mission.elapsed += frameDelta;
    mission.timeRemaining = Math.max(0, UFO_INERTIA_SLINGSHOT_DURATION - mission.elapsed);
    mission.impactCooldown = Math.max(0, mission.impactCooldown - frameDelta);
    const craft = getUfoInertiaSlingshotCraftLocal(control, mission);
    mission.craftLocal.copy(craft);

    if (mission.tetheredAnchor) {
      const anchor = mission.tetheredAnchor;
      const deltaToAnchor = anchor.position.clone().sub(craft);
      const distance = deltaToAnchor.length();
      const stretch = Math.max(0, distance - mission.tetherLength);
      mission.tension = stretch * UFO_INERTIA_SLINGSHOT_SPRING;
      if (distance > .001 && mission.tension > 0) {
        const direction = deltaToAnchor.multiplyScalar(1 / distance);
        const force = Math.min(460, mission.tension);
        mission.shipVelocity.addScaledVector(direction, force * frameDelta / UFO_INERTIA_SLINGSHOT_CRAFT_MASS);
        anchor.velocity.addScaledVector(direction, -force * frameDelta / anchor.mass);
        mission.maxTension = Math.max(mission.maxTension, mission.tension);
      }
    } else {
      mission.tension = 0;
    }

    mission.anchors.forEach(anchor => {
      anchor.position.addScaledVector(anchor.velocity, frameDelta);
      anchor.velocity.multiplyScalar(Math.exp(-frameDelta * .16));
      anchor.root.position.set(anchor.position.x, anchor.y + Math.sin(anchor.spin * 1.4) * 14, anchor.position.y);
    });

    mission.shipVelocity.multiplyScalar(Math.exp(-frameDelta * .035));
    const next = craft.clone().addScaledVector(mission.shipVelocity, frameDelta);
    mission.anchors.forEach(anchor => {
      const offset = next.clone().sub(anchor.position);
      let distance = offset.length();
      const minimum = anchor.radius + UFO_INERTIA_SLINGSHOT_CRAFT_RADIUS;
      if (distance >= minimum) return;
      const normal = distance > .001 ? offset.multiplyScalar(1 / distance) : new THREE.Vector2(0, -1);
      next.addScaledVector(normal, minimum - distance + .8);
      const normalVelocity = mission.shipVelocity.dot(normal);
      if (normalVelocity < 0) mission.shipVelocity.addScaledVector(normal, -normalVelocity * 1.72);
      mission.shipVelocity.multiplyScalar(.78);
      if (mission.impactCooldown <= 0) {
        mission.integrity = Math.max(0, mission.integrity - 18);
        mission.impactCooldown = .68;
        showToast("岩塊へ接触。UFOの慣性が反射し、航路安定度が低下しました。");
      }
      distance = minimum;
    });
    mission.craftLocal.copy(next);
    setUfoInertiaSlingshotCraftLocal(control, mission, next);

    const captureDelta = next.clone().sub(new THREE.Vector2(0, UFO_INERTIA_SLINGSHOT_CAPTURE_DISTANCE));
    const captureDistance = captureDelta.length();
    if (captureDistance <= UFO_INERTIA_SLINGSHOT_CAPTURE_RADIUS) {
      if (mission.releaseQualified && mission.maxTension >= 112) {
        finishUfoInertiaSlingshotMission(mission, "complete", "火星側の捕獲軌道へ進入。テザーの張力と慣性でUFO本体を正しい進行方向へ導けました。");
      } else if (!mission.captureMissed) {
        mission.captureMissed = true;
        showToast("捕獲軌道へ近づきましたが、慣性解放が不足しています。岩塊へ接続して張力を作り、解放後に再進入してください。");
      }
    }
    if (mission.integrity <= 0) {
      finishUfoInertiaSlingshotMission(mission, "failed", "岩塊との接触で航路が崩れました。再展開して、正面衝突ではなく外側へ回り込んでください。");
    } else if (mission.timeRemaining <= 0) {
      finishUfoInertiaSlingshotMission(mission, "failed", "航路時間切れです。テザーを張る位置と解放のタイミングを変えて再挑戦できます。");
    } else if (next.y > UFO_INERTIA_SLINGSHOT_ESCAPE_DISTANCE) {
      finishUfoInertiaSlingshotMission(mission, "failed", "火星捕獲軌道を通り過ぎました。張力を作ってから横方向の慣性を残す必要があります。");
    }
  }

  const visibleCraft = getUfoInertiaSlingshotCraftLocal(control, mission);
  if (mission.tetheredAnchor) {
    const anchor = mission.tetheredAnchor;
    mission.tether.geometry.setFromPoints([
      new THREE.Vector3(visibleCraft.x, 0, visibleCraft.y),
      new THREE.Vector3(anchor.position.x, anchor.y, anchor.position.y),
    ]);
    mission.tether.mesh.visible = true;
    mission.tether.material.color.setHex(mission.tension > 112 ? 0xffc66d : 0x8df6ff);
    mission.tether.material.opacity = .68 + Math.min(.3, mission.tension / 460);
  } else {
    mission.tether.mesh.visible = false;
  }
  state.ufoInertiaSlingshotState = mission.phase;
  state.ufoInertiaSlingshotDistance = Math.max(0, Math.round(mission.craftLocal.y));
  state.ufoInertiaSlingshotTension = Math.round(mission.tension);
  state.ufoInertiaSlingshotReleases = mission.releases;
  document.body.dataset.ufoInertiaSlingshotDistance = String(state.ufoInertiaSlingshotDistance);
  document.body.dataset.ufoInertiaSlingshotTension = String(state.ufoInertiaSlingshotTension);
  document.body.dataset.ufoInertiaSlingshotReleases = String(mission.releases);
  updateUfoInertiaSlingshotHud();
  updateUfoInertiaSlingshotLifeHud();
}

function updateUfoInertiaSlingshotLifeHud() {
  const mission = ufoDoorControls[0]?.spaceInertiaSlingshot;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const percent = mission.phase === "playing"
    ? clamp(mission.timeRemaining / UFO_INERTIA_SLINGSHOT_DURATION * 100, 0, 100)
    : mission.integrity;
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = mission.phase === "playing" ? "航路時間" : "航路安定度";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = mission.phase === "playing" ? `${Math.ceil(mission.timeRemaining)}` : `${Math.round(mission.integrity)}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "準備完了。航路へ出るとUFO本体に前方の慣性が生まれます。"
      : mission.phase === "playing"
        ? mission.tetheredAnchor
          ? `テザー接続中。張力 ${Math.round(mission.tension)}。外側まで引かれた瞬間に解放します。`
          : "左右で軌道を補正し、岩塊のテザー圏へ入ってください。"
        : mission.phase === "complete"
          ? "火星側の捕獲軌道へ進入しました。"
          : "航路が崩れました。再展開して慣性の作り方を変えられます。";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && (mission.timeRemaining <= 15 || mission.integrity <= 38) ? "true" : "false";
}

function updateUfoInertiaSlingshotHud() {
  const mission = ufoDoorControls[0]?.spaceInertiaSlingshot;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && state.ufoEngineMode === "ready" && mission?.active && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "火星航路・慣性スリング", first: "航路", second: "張力", third: "解放" });
  const phaseLabel = mission.phase === "ready" ? "航路待機"
    : mission.phase === "playing" ? `火星へ ${Math.max(0, Math.round(mission.craftLocal.y))}`
      : mission.phase === "complete" ? "捕獲成功"
        : "再展開";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = `${Math.max(0, Math.round(mission.craftLocal.y))}/${UFO_INERTIA_SLINGSHOT_CAPTURE_DISTANCE}`;
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = String(Math.round(mission.tension));
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.releases);
  const progress = mission.phase === "complete" ? 1 : clamp(Math.max(0, mission.craftLocal.y) / UFO_INERTIA_SLINGSHOT_CAPTURE_DISTANCE, 0, .96);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "岩塊は宇宙空間に固定された実体です。開始後、UFO本体が前方慣性で進みます。"
      : mission.phase === "playing"
        ? mission.tetheredAnchor
          ? "テザーを張っています。岩塊との距離が伸びるほど張力が増え、解放した瞬間の速度が航路に残ります。"
          : mission.releaseQualified
            ? "張力を解放済みです。火星側のオレンジ捕獲軌道へ姿勢を合わせて進入してください。"
            : "岩塊のテザー圏でFを押し、外側へ回り込んで張力を作ります。"
        : mission.phase === "complete"
          ? "火星へ直接ぶつけるのではなく、捕獲軌道へ入れて減速できました。"
          : "同じUFOの慣性・接触・テザー物理で、航路を最初から再展開できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "航路へ出る" : "航路を再展開";
    els.ufoSpaceStartButton.setAttribute("aria-label", "火星航路・慣性スリングを開始する");
  }
  if (els.ufoSpaceFireButton) {
    const inRange = mission.phase === "playing" && (mission.tetheredAnchor || mission.anchors.some(anchor => mission.craftLocal.distanceTo(anchor.position) <= UFO_INERTIA_SLINGSHOT_GRAPPLE_RANGE));
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !inRange;
    els.ufoSpaceFireButton.textContent = mission.tetheredAnchor ? "テザー解放" : "テザー接続";
    els.ufoSpaceFireButton.setAttribute("aria-label", mission.tetheredAnchor ? "岩塊からテザーを解放する" : "近くの岩塊へテザーを接続する");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.inertiaSlingshot = "true";
    els.ufoSpaceCombat.dataset.cooldown = "false";
    els.ufoSpaceCombat.dataset.hit = String(mission.impactCooldown > 0);
    els.ufoSpaceCombat.dataset.tethered = String(Boolean(mission.tetheredAnchor));
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Solar-sail flight trial ----------------------------------------------------------
// The sail and every wind lane exist in the same world space as the UFO.  The player
// is not steering a proxy: wind pressure updates the actual flight coordinates after
// the ordinary left/right input has been applied for the frame.
function makeUfoSolarSailMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-solar-sail-route";
  group.visible = false;

  const craft = control?.craftAssembly;
  const sailAssembly = new THREE.Group();
  sailAssembly.name = "ufo-deployable-solar-sail";
  sailAssembly.userData.nonCollidable = true;
  sailAssembly.visible = false;
  const hubMaterial = new THREE.MeshStandardMaterial({ color: 0x314b63, metalness: .82, roughness: .18, emissive: 0x0d314a, emissiveIntensity: .8 });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xb9e9f3, metalness: .72, roughness: .16, emissive: 0x2aa6d8, emissiveIntensity: .8 });
  const panelMaterial = new THREE.MeshPhysicalMaterial({ color: 0x9df2ff, transparent: true, opacity: .48, transmission: .52, roughness: .12, metalness: .04, emissive: 0x207da1, emissiveIntensity: .9, side: THREE.DoubleSide, depthWrite: false });
  const accentMaterial = new THREE.MeshBasicMaterial({ color: 0xd9fbff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const hub = new THREE.Mesh(new THREE.TorusGeometry(13, 1.4, 10, 40), hubMaterial);
  hub.rotation.x = Math.PI / 2;
  hub.position.y = 49;
  sailAssembly.add(hub);
  const sailLight = new THREE.PointLight(0x88efff, 3.2, 360, 1.55);
  sailLight.position.set(0, 54, 0);
  sailLight.userData.nonCollidable = true;
  sailAssembly.add(sailLight);
  const panels = [];
  for (let index = 0; index < 4; index += 1) {
    const angle = index / 4 * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(angle), .12, Math.sin(angle)).normalize();
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.25, 58, 8), frameMaterial);
    boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    boom.position.copy(direction).multiplyScalar(29).add(new THREE.Vector3(0, 49, 0));
    sailAssembly.add(boom);
    const panelRoot = new THREE.Group();
    panelRoot.name = `solar-sail-panel-${index + 1}`;
    panelRoot.position.copy(direction).multiplyScalar(72).add(new THREE.Vector3(0, 54, 0));
    panelRoot.rotation.y = Math.PI / 2 - angle;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(56, 86, 7, 1), panelMaterial.clone());
    const accent = new THREE.Mesh(new THREE.PlaneGeometry(5, 80), accentMaterial.clone());
    accent.position.z = .18;
    const edgeA = new THREE.Mesh(new THREE.BoxGeometry(1.7, 88, 1.2), frameMaterial.clone());
    edgeA.position.x = -28;
    const edgeB = edgeA.clone();
    edgeB.position.x = 28;
    panelRoot.add(panel, accent, edgeA, edgeB);
    sailAssembly.add(panelRoot);
    panels.push({ root: panelRoot, panel, accent, boom, baseAngle: angle, phase: index * 1.4 });
  }
  craft?.add(sailAssembly);

  const makeRibbon = (points, halfWidth, material) => {
    const vertices = [];
    const indices = [];
    points.forEach((point, index) => {
      const before = points[Math.max(0, index - 1)];
      const after = points[Math.min(points.length - 1, index + 1)];
      const tangent = after.clone().sub(before).setY(0).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(halfWidth);
      const left = point.clone().add(side);
      const right = point.clone().sub(side);
      vertices.push(left.x, left.y, left.z, right.x, right.y, right.z);
      if (index < points.length - 1) {
        const start = index * 2;
        indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
      }
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
  };
  const interpolateWindPoint = (points, progress) => {
    const segment = (points.length - 1) * ((progress % 1 + 1) % 1);
    const index = Math.floor(segment);
    return points[index].clone().lerp(points[Math.min(points.length - 1, index + 1)], segment - index);
  };
  const makeWind = (name, tint, strength, specs, phase) => {
    const root = new THREE.Group();
    root.name = name;
    const points = specs.map(([x, z]) => new THREE.Vector3(x, 0, z));
    const wideMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const coreMaterial = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const wide = makeRibbon(points, UFO_SOLAR_SAIL_WIND_RADIUS, wideMaterial);
    const core = makeRibbon(points, 44, coreMaterial);
    wide.position.y = -8;
    core.position.y = -5;
    root.add(wide, core);
    const pulses = Array.from({ length: 9 }, (_, index) => {
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(11 + (index % 3) * 2.4, 14, 10), new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: .78, blending: THREE.AdditiveBlending, depthWrite: false }));
      pulse.userData.progress = index / 9;
      pulse.userData.cooldown = 0;
      root.add(pulse);
      return pulse;
    });
    group.add(root);
    return { root, points, tint, strength, phase, wide, core, pulses, currentOpacity: .11, interpolate: progress => interpolateWindPoint(points, progress) };
  };

  const winds = [
    makeWind("solar-wind-azure", 0x5cecff, 238, [[0, 90], [0, 500], [108, 940], [-82, 1440], [-126, 1920], [22, 2520], [74, 3080], [0, 3670], [0, UFO_SOLAR_SAIL_CAPTURE_DISTANCE]], 0),
    makeWind("solar-wind-gold", 0xffd878, 286, [[480, 260], [388, 730], [246, 1160], [114, 1650], [202, 2170], [124, 2740], [38, 3370], [0, UFO_SOLAR_SAIL_CAPTURE_DISTANCE]], 1.7),
    makeWind("solar-wind-violet", 0xd3a8ff, 264, [[-480, 250], [-398, 780], [-264, 1260], [-156, 1810], [-230, 2300], [-120, 2880], [-38, 3440], [0, UFO_SOLAR_SAIL_CAPTURE_DISTANCE]], 3.2),
  ];

  const capture = new THREE.Group();
  capture.name = "mars-solar-sail-capture";
  const captureOuter = new THREE.Mesh(new THREE.TorusGeometry(UFO_SOLAR_SAIL_CAPTURE_RADIUS, 12, 12, 72), new THREE.MeshStandardMaterial({ color: 0xff9e58, metalness: .74, roughness: .16, emissive: 0xb83d18, emissiveIntensity: 1.25 }));
  const captureInner = new THREE.Mesh(new THREE.TorusGeometry(UFO_SOLAR_SAIL_CAPTURE_RADIUS * .73, 4, 8, 54), new THREE.MeshBasicMaterial({ color: 0xffe5aa, transparent: true, opacity: .62, blending: THREE.AdditiveBlending, depthWrite: false }));
  const captureField = new THREE.Mesh(new THREE.CircleGeometry(UFO_SOLAR_SAIL_CAPTURE_RADIUS * .9, 60), new THREE.MeshBasicMaterial({ color: 0xff9352, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  captureField.position.z = 4;
  const captureLight = new THREE.PointLight(0xffa65d, 8.5, 2300, 1.5);
  captureLight.userData.nonCollidable = true;
  capture.add(captureOuter, captureInner, captureField, captureLight);
  capture.position.set(0, 16, UFO_SOLAR_SAIL_CAPTURE_DISTANCE);
  group.add(capture);

  return {
    group, winds, capture: { root: capture, outer: captureOuter, inner: captureInner, field: captureField, light: captureLight },
    sail: { assembly: sailAssembly, hub, light: sailLight, panels, amount: 0, target: 0 },
    active: false, phase: "idle", elapsed: 0, timeRemaining: UFO_SOLAR_SAIL_DURATION,
    origin: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0),
    craftLocal: new THREE.Vector2(), velocity: new THREE.Vector2(), sailsDeployed: false, pressure: 0, charge: 0, rides: 0, currentWind: null, currentWindName: "--", windSwitchCooldown: 0, boostCooldown: 0, captureMissed: false, testMode: false,
  };
}

function resetUfoSolarSailMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_SOLAR_SAIL_DURATION;
  mission.velocity.set(0, 0);
  mission.craftLocal.set(0, 0);
  mission.sailsDeployed = false;
  mission.sail.amount = 0;
  mission.sail.target = 0;
  mission.sail.assembly.visible = false;
  mission.pressure = 0;
  mission.charge = 0;
  mission.rides = 0;
  mission.currentWind = null;
  mission.currentWindName = "--";
  mission.windSwitchCooldown = 0;
  mission.boostCooldown = 0;
  mission.captureMissed = false;
  state.ufoSolarSailState = "idle";
  state.ufoSolarSailCharge = 0;
  state.ufoSolarSailPressure = 0;
  state.ufoSolarSailRides = 0;
  ["ufoSolarSail", "ufoSolarSailPhase", "ufoSolarSailCharge", "ufoSolarSailPressure", "ufoSolarSailRides", "ufoSolarSailAction"].forEach(key => delete document.body.dataset[key]);
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function prepareUfoSolarSailMission(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control).setY(0);
  if (forward.lengthSq() < .001) forward.set(0, 0, -1);
  forward.normalize();
  mission.origin.copy(craftCenter);
  mission.forward.copy(forward);
  mission.group.position.copy(craftCenter);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_SOLAR_SAIL_DURATION;
  mission.velocity.set(0, 0);
  mission.craftLocal.set(0, 0);
  mission.sailsDeployed = false;
  mission.sail.amount = 0;
  mission.sail.target = 0;
  mission.sail.assembly.visible = true;
  mission.pressure = 0;
  mission.charge = 0;
  mission.rides = 0;
  mission.currentWind = null;
  mission.currentWindName = "--";
  mission.windSwitchCooldown = 0;
  mission.boostCooldown = 0;
  mission.captureMissed = false;
  mission.group.visible = true;
  state.ufoSolarSailState = "ready";
  state.ufoSolarSailCharge = 0;
  state.ufoSolarSailPressure = 0;
  state.ufoSolarSailRides = 0;
  document.body.dataset.ufoSolarSail = "ready";
  document.body.dataset.ufoSolarSailPhase = "ready";
  document.body.dataset.ufoSolarSailCharge = "0";
  document.body.dataset.ufoSolarSailPressure = "0";
  document.body.dataset.ufoSolarSailRides = "0";
  document.body.dataset.ufoSolarSailAction = "deploy";
  return true;
}

function activateUfoSolarSailTestMode(control) {
  const mission = control?.spaceSolarSail;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(control.spaceRingBattle);
  resetUfoCranePortMission(control.spaceCranePort);
  resetUfoGravityMazeMission(control.spaceGravityMaze);
  resetUfoInertiaSlingshotMission(control.spaceInertiaSlingshot);
  resetUfoSolarSailMission(mission);
  if (!prepareUfoSolarSailMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "solar-sail-surfing-prototype";
  document.body.dataset.ufoSpaceMission = "solar-sail-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("太陽帆サーフィン", "左右で風路へ / Fで帆を開閉");
  updateUfoSolarSailHud();
  updateUfoSolarSailLifeHud();
  updateUfoControls();
  showToast("太陽帆サーフィン。帆を開いて光る太陽風へ乗ると、UFO本体が風圧で火星方向へ加速します。捕獲軌道の前では帆を畳んでください。");
  return true;
}

function startUfoSolarSailRoute() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceSolarSail;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoSolarSailMission(mission);
    if (!prepareUfoSolarSailMission(control, mission)) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  mission.velocity.set(0, UFO_SOLAR_SAIL_IDLE_DRIFT);
  state.ufoSolarSailState = "playing";
  document.body.dataset.ufoSolarSail = "playing";
  document.body.dataset.ufoSolarSailPhase = "playing";
  document.body.dataset.ufoSolarSailAction = "deploy";
  showToast("太陽風航路へ進入。最初の青い流れに重なったらFで帆を開き、風圧を受けて進んでください。");
  updateUfoSolarSailHud();
  updateUfoSolarSailLifeHud();
  return true;
}

function useUfoSolarSailAction() {
  const mission = ufoDoorControls[0]?.spaceSolarSail;
  if (!mission?.active || mission.phase !== "playing") return false;
  mission.sailsDeployed = !mission.sailsDeployed;
  mission.sail.target = mission.sailsDeployed ? 1 : 0;
  document.body.dataset.ufoSolarSailAction = mission.sailsDeployed ? "reef" : "deploy";
  showToast(mission.sailsDeployed ? "太陽帆を展開。光る太陽風へ入ると風圧がUFOの慣性に加わります。" : "太陽帆を収納。慣性を残したまま火星側の捕獲軌道へ進入できます。");
  return true;
}

function getUfoSolarSailCraftLocal(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return new THREE.Vector2();
  craft.updateWorldMatrix(true, true);
  const world = craft.getWorldPosition(new THREE.Vector3());
  const local = mission.group.worldToLocal(world);
  return new THREE.Vector2(local.x, local.z);
}

function setUfoSolarSailCraftLocal(control, mission, local) {
  const nextWorld = mission.group.localToWorld(new THREE.Vector3(local.x, 0, local.y));
  const flight = ufoWorldToLocal(control, nextWorld.x, nextWorld.z);
  const scale = control.scale || BUILDING_SCALE;
  state.ufoFlightX = flight.x;
  state.ufoFlightZ = flight.z;
  state.ufoFlightY = clampUfoSpaceFlightY((nextWorld.y - (control.originY || 0)) / scale);
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
}

function nearestUfoSolarWind(mission, position) {
  let closest = null;
  mission.winds.forEach(wind => {
    for (let index = 0; index < wind.points.length - 1; index += 1) {
      const start = wind.points[index];
      const end = wind.points[index + 1];
      const delta = new THREE.Vector2(end.x - start.x, end.z - start.z);
      const lengthSq = delta.lengthSq();
      const toPoint = new THREE.Vector2(position.x - start.x, position.y - start.z);
      const ratio = clamp(lengthSq > .0001 ? toPoint.dot(delta) / lengthSq : 0, 0, 1);
      const sample = new THREE.Vector2(start.x, start.z).addScaledVector(delta, ratio);
      const distance = position.distanceTo(sample);
      if (!closest || distance < closest.distance) {
        closest = { wind, distance, sample, tangent: delta.normalize(), segment: index, ratio };
      }
    }
  });
  return closest;
}

function updateUfoSolarSailVisual(mission, delta) {
  const sail = mission.sail;
  sail.amount += (sail.target - sail.amount) * Math.min(1, delta * (sail.target > sail.amount ? 2.6 : 5.8));
  sail.assembly.visible = mission.active && sail.amount > .012;
  const windRatio = clamp(mission.pressure / 330, 0, 1);
  sail.hub.rotation.z += delta * (.3 + windRatio * 1.9);
  sail.light.intensity = .6 + sail.amount * (2.4 + windRatio * 4.6);
  sail.panels.forEach((panel, index) => {
    const radius = THREE.MathUtils.lerp(24, 74, sail.amount);
    const lift = THREE.MathUtils.lerp(40, 54, sail.amount);
    const direction = new THREE.Vector3(Math.cos(panel.baseAngle), .12, Math.sin(panel.baseAngle)).normalize();
    panel.root.position.copy(direction).multiplyScalar(radius).add(new THREE.Vector3(0, lift, 0));
    panel.root.scale.set(
      THREE.MathUtils.lerp(.13, 1, sail.amount),
      THREE.MathUtils.lerp(.16, 1, sail.amount),
      1,
    );
    panel.root.rotation.z = Math.sin(mission.elapsed * (2.8 + windRatio * 2) + panel.phase) * windRatio * .16;
    panel.panel.material.opacity = .18 + sail.amount * (.2 + windRatio * .26);
    panel.panel.material.emissiveIntensity = .3 + sail.amount * (.52 + windRatio * 1.05);
    panel.accent.material.opacity = .2 + sail.amount * (.22 + windRatio * .48);
    panel.boom.material.emissiveIntensity = .34 + sail.amount * .72;
  });
}

function updateUfoSolarSailMission(delta) {
  const control = ufoDoorControls[0];
  const mission = control?.spaceSolarSail;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace) return;
  const frameDelta = Math.min(.05, Math.max(0, delta || 0));
  mission.winds.forEach((wind, windIndex) => {
    wind.phase += frameDelta;
    const pulseSpeed = .045 + windIndex * .006;
    wind.pulses.forEach((pulse, index) => {
      pulse.userData.progress = (pulse.userData.progress + frameDelta * pulseSpeed) % 1;
      const point = wind.interpolate(pulse.userData.progress);
      pulse.position.copy(point).add(new THREE.Vector3(0, 16 + Math.sin(wind.phase * 3 + index) * 14, 0));
      const scale = .75 + Math.sin(wind.phase * 3.4 + index) * .2;
      pulse.scale.setScalar(scale);
      pulse.material.opacity = .5 + Math.sin(wind.phase * 2.1 + index) * .25;
    });
    wind.wide.material.opacity = .075 + Math.sin(wind.phase * 1.4 + windIndex) * .026;
    wind.core.material.opacity = .24 + Math.sin(wind.phase * 2.2 + windIndex) * .1;
  });
  mission.capture.root.rotation.z += frameDelta * .22;
  mission.capture.inner.rotation.z -= frameDelta * .38;

  if (mission.phase === "playing") {
    mission.elapsed += frameDelta;
    mission.timeRemaining = Math.max(0, UFO_SOLAR_SAIL_DURATION - mission.elapsed);
    mission.windSwitchCooldown = Math.max(0, mission.windSwitchCooldown - frameDelta);
    mission.boostCooldown = Math.max(0, mission.boostCooldown - frameDelta);
    const craft = getUfoSolarSailCraftLocal(control, mission);
    mission.craftLocal.copy(craft);
    const nearest = nearestUfoSolarWind(mission, craft);
    mission.pressure = 0;
    if (mission.sailsDeployed && nearest && nearest.distance <= UFO_SOLAR_SAIL_WIND_RADIUS) {
      const laneRatio = 1 - Math.pow(nearest.distance / UFO_SOLAR_SAIL_WIND_RADIUS, 1.55);
      const pulse = .78 + Math.sin(mission.elapsed * 2.6 + nearest.wind.phase) * .18;
      mission.pressure = nearest.wind.strength * laneRatio * pulse;
      mission.velocity.addScaledVector(nearest.tangent, mission.pressure * frameDelta);
      mission.charge = clamp(mission.charge + mission.pressure / 300 * frameDelta * 8.4, 0, 100);
      mission.currentWindName = nearest.wind.root.name.replace("solar-wind-", "");
      if (mission.currentWind !== nearest.wind && mission.windSwitchCooldown <= 0) {
        mission.currentWind = nearest.wind;
        mission.rides += 1;
        mission.windSwitchCooldown = 1.25;
        showToast(`太陽風 ${mission.currentWindName} に乗りました。帆圧がUFO本体の進行方向へ加わります。`);
      }
      const crest = nearest.wind.pulses.find(pulse => pulse.position.distanceToSquared(new THREE.Vector3(craft.x, pulse.position.y, craft.y)) <= 84 ** 2);
      if (crest && mission.boostCooldown <= 0) {
        mission.velocity.addScaledVector(nearest.tangent, 108);
        mission.charge = clamp(mission.charge + 7, 0, 100);
        mission.boostCooldown = .85;
        showToast("太陽風の波頭を捉えました。帆へ強い風圧が入り、一段加速します。");
      }
    } else {
      mission.currentWind = null;
      mission.currentWindName = mission.sailsDeployed ? "風路外" : "帆を収納";
    }
    mission.velocity.multiplyScalar(Math.exp(-frameDelta * .085));
    if (mission.velocity.length() > UFO_SOLAR_SAIL_MAX_SPEED) mission.velocity.setLength(UFO_SOLAR_SAIL_MAX_SPEED);
    const next = craft.clone().addScaledVector(mission.velocity, frameDelta);
    mission.craftLocal.copy(next);
    setUfoSolarSailCraftLocal(control, mission, next);
    const captureDelta = next.clone().sub(new THREE.Vector2(0, UFO_SOLAR_SAIL_CAPTURE_DISTANCE));
    if (captureDelta.length() <= UFO_SOLAR_SAIL_CAPTURE_RADIUS) {
      if (!mission.sailsDeployed && mission.charge >= UFO_SOLAR_SAIL_REQUIRED_CHARGE) {
        mission.phase = "complete";
        mission.velocity.multiplyScalar(.18);
        state.ufoSolarSailState = "complete";
        document.body.dataset.ufoSolarSail = "complete";
        document.body.dataset.ufoSolarSailPhase = "complete";
        document.body.dataset.ufoSolarSailAction = "complete";
        showToast("火星側の捕獲軌道へ進入。太陽風で得た推進力を残し、帆を畳んで火星接近へ切り替えました。");
      } else if (!mission.captureMissed) {
        mission.captureMissed = true;
        showToast(mission.sailsDeployed ? "捕獲軌道の手前です。帆を開いたままでは減速できません。Fで収納して進入してください。" : "推進力が不足しています。太陽風へ戻り、帆を開いて蓄光を増やしてください。");
      }
    }
    if (mission.timeRemaining <= 0) {
      mission.phase = "failed";
      mission.velocity.multiplyScalar(.1);
      state.ufoSolarSailState = "failed";
      document.body.dataset.ufoSolarSail = "failed";
      document.body.dataset.ufoSolarSailPhase = "failed";
      document.body.dataset.ufoSolarSailAction = "retry";
      showToast("太陽風航路が閉じました。帆を開くタイミングと、風路を乗り換える位置を変えて再挑戦できます。");
    }
  }

  updateUfoSolarSailVisual(mission, frameDelta);
  mission.capture.field.material.opacity = mission.phase === "complete" ? .32 : mission.sailsDeployed ? .06 : .16;
  state.ufoSolarSailState = mission.phase;
  state.ufoSolarSailCharge = Math.round(mission.charge);
  state.ufoSolarSailPressure = Math.round(mission.pressure);
  state.ufoSolarSailRides = mission.rides;
  document.body.dataset.ufoSolarSailCharge = String(state.ufoSolarSailCharge);
  document.body.dataset.ufoSolarSailPressure = String(state.ufoSolarSailPressure);
  document.body.dataset.ufoSolarSailRides = String(mission.rides);
  updateUfoSolarSailHud();
  updateUfoSolarSailLifeHud();
}

function updateUfoSolarSailLifeHud() {
  const mission = ufoDoorControls[0]?.spaceSolarSail;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const percent = mission.phase === "playing" ? clamp(mission.timeRemaining / UFO_SOLAR_SAIL_DURATION * 100, 0, 100) : mission.charge;
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = mission.phase === "playing" ? "航路時間" : "太陽帆蓄光";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = mission.phase === "playing" ? `${Math.ceil(mission.timeRemaining)}` : `${Math.round(mission.charge)}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${percent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "帆は収納されています。開始後、青・金・紫の太陽風の流れへ入り、Fで帆を開きます。"
      : mission.phase === "playing"
        ? mission.sailsDeployed
          ? mission.pressure > 0
            ? `${mission.currentWindName}の風圧 ${Math.round(mission.pressure)}。流れに沿ってUFO本体が加速しています。`
            : "帆を展開中ですが、太陽風の流れから外れています。左右で光る帯へ入り直してください。"
          : "帆を収納中。慣性だけで進みます。強い加速が必要なら風路内でFを押して帆を開きます。"
        : mission.phase === "complete"
          ? "太陽帆を畳んで火星側の捕獲軌道へ進入しました。"
          : "太陽風航路が閉じました。再展開して風路を選び直せます。";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && mission.timeRemaining <= 16 ? "true" : "false";
}

function updateUfoSolarSailHud() {
  const mission = ufoDoorControls[0]?.spaceSolarSail;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && state.ufoEngineMode === "ready" && mission?.active && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "太陽帆サーフィン", first: "帆圧", second: "蓄光", third: "波乗り" });
  const phaseLabel = mission.phase === "ready" ? "帆を待機"
    : mission.phase === "playing" ? `火星へ ${Math.max(0, Math.round(mission.craftLocal.y))}`
      : mission.phase === "complete" ? "火星接近"
        : "再展開";
  if (els.ufoSpaceWave) els.ufoSpaceWave.textContent = phaseLabel;
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = String(Math.round(mission.pressure));
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `${Math.round(mission.charge)}%`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(mission.rides);
  const progress = mission.phase === "complete" ? 1 : clamp(Math.max(0, mission.craftLocal.y) / UFO_SOLAR_SAIL_CAPTURE_DISTANCE, 0, .96);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "帆を開くほど光る太陽風から実際の風圧を受けます。広い帯の中心ほど速く、波頭を取ると一段加速します。"
      : mission.phase === "playing"
        ? mission.sailsDeployed
          ? mission.pressure > 0
            ? "帆が太陽風を受けています。左右で帯の中心を保つほど、慣性を強く火星方向へ残せます。"
            : "帆を開いたまま風路外へ出ています。横移動で青・金・紫の流れへ戻してください。"
          : mission.charge >= UFO_SOLAR_SAIL_REQUIRED_CHARGE
            ? "蓄光は十分です。火星側のオレンジ捕獲軌道に近づいたら、帆を畳んだまま進入してください。"
            : "蓄光が不足しています。太陽風へ戻り、帆を開いて推進力を蓄えてください。"
        : mission.phase === "complete"
          ? "火星接近用の帆走を終えました。到着ではなく、火星へ安全に近づくための推進航行です。"
          : "太陽風の帯・帆の展開・収納の判断を最初からやり直せます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "太陽風へ出る" : "帆走を再展開";
    els.ufoSpaceStartButton.setAttribute("aria-label", "太陽帆サーフィンを開始する");
  }
  if (els.ufoSpaceFireButton) {
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = mission.phase !== "playing";
    els.ufoSpaceFireButton.textContent = mission.sailsDeployed ? "帆を畳む" : "帆を開く";
    els.ufoSpaceFireButton.setAttribute("aria-label", mission.sailsDeployed ? "太陽帆を収納する" : "太陽帆を展開する");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.solarSail = "true";
    els.ufoSpaceCombat.dataset.cooldown = "false";
    els.ufoSpaceCombat.dataset.hit = String(mission.pressure > 180);
    els.ufoSpaceCombat.dataset.tethered = String(mission.sailsDeployed);
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- Earth-to-Mars UFO Grand Prix ----------------------------------------------------
// This is a continuous route in the same world-space as Earth, Mars and the UFO.  The
// gates and drifting rocks are not a separate board: every boost and impact feeds back
// into state.ufoFlightX/Z and therefore moves the visible, controllable UFO itself.
function makeUfoMarsRaceMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-earth-mars-grand-prix";
  group.visible = false;

  const gateTints = [0x8ceeff, 0x8dbdff, 0xffd884, 0xcf9dff];
  const routeOffsets = [
    0, 280, -360, 460, -420, 180, 520, -260, 350, -500,
    430, -160, 300, -440, 510, -320, 240, -380, 180, 0,
  ];
  // The opening gate begins far enough ahead that the player can read the
  // course before the first steering decision; it never pops into contact.
  const gateSpacing = (UFO_MARS_RACE_FINISH_DISTANCE - 1850) / (UFO_MARS_RACE_GATE_COUNT - 1);
  const gates = [];
  const routePoints = [new THREE.Vector3(0, -156, 0)];
  const makeGate = (index, position, tint, isFinish = false) => {
    const root = new THREE.Group();
    root.name = isFinish ? "mars-arrival-gate" : `mars-race-gate-${index + 1}`;
    root.position.set(position.x, 0, position.y);
    const radius = isFinish ? UFO_MARS_RACE_GATE_RADIUS * 1.32 : UFO_MARS_RACE_GATE_RADIUS;
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: tint,
      metalness: .78,
      roughness: .16,
      emissive: tint,
      emissiveIntensity: isFinish ? 1.7 : 1.05,
    });
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: tint,
      transparent: true,
      opacity: isFinish ? .22 : .14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, isFinish ? 14 : 10, 12, 72), ringMaterial);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(radius * .74, 3.4, 8, 56), glowMaterial);
    const field = new THREE.Mesh(new THREE.CircleGeometry(radius * .72, 54), glowMaterial.clone());
    field.position.z = -3;
    const beaconTop = new THREE.Mesh(new THREE.SphereGeometry(isFinish ? 24 : 16, 16, 12), glowMaterial.clone());
    beaconTop.position.y = radius;
    const beaconBottom = beaconTop.clone();
    beaconBottom.position.y = -radius;
    const light = new THREE.PointLight(tint, isFinish ? 9 : 4.8, isFinish ? 2600 : 1500, 1.55);
    light.userData.nonCollidable = true;
    root.add(rim, inner, field, beaconTop, beaconBottom, light);
    group.add(root);
    return {
      index,
      root,
      rim,
      inner,
      field,
      light,
      position: position.clone(),
      radius,
      boostRadius: radius * (isFinish ? .72 : UFO_MARS_RACE_GATE_BOOST_RADIUS / UFO_MARS_RACE_GATE_RADIUS),
      isFinish,
      resolved: false,
      passed: false,
      flash: 0,
    };
  };

  for (let index = 0; index < UFO_MARS_RACE_GATE_COUNT; index += 1) {
    const isFinish = index === UFO_MARS_RACE_GATE_COUNT - 1;
    const z = isFinish ? UFO_MARS_RACE_FINISH_DISTANCE : 1850 + gateSpacing * index;
    const x = isFinish ? 0 : routeOffsets[index] + Math.sin(index * 1.41) * 78;
    const position = new THREE.Vector2(x, z);
    gates.push(makeGate(index, position, isFinish ? 0xff875d : gateTints[index % gateTints.length], isFinish));
    routePoints.push(new THREE.Vector3(x, -156, z));
  }
  routePoints.push(new THREE.Vector3(0, -156, UFO_MARS_RACE_FINISH_DISTANCE + 800));

  const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, "centripetal", .45);
  const routeMaterial = new THREE.MeshBasicMaterial({
    color: 0x335a82,
    transparent: true,
    opacity: .13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const routeSurface = new THREE.Mesh(new THREE.TubeGeometry(routeCurve, 300, 120, 12, false), routeMaterial);
  routeSurface.name = "mars-race-transfer-corridor";
  routeSurface.userData.nonCollidable = true;
  group.add(routeSurface);
  [-1, 1].forEach(side => {
    const railPoints = routePoints.map((point, index) => {
      const before = routePoints[Math.max(0, index - 1)];
      const after = routePoints[Math.min(routePoints.length - 1, index + 1)];
      const tangent = after.clone().sub(before).setY(0).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(350 * side);
      return point.clone().add(normal).add(new THREE.Vector3(0, 18, 0));
    });
    const rail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(railPoints),
      new THREE.LineBasicMaterial({ color: side > 0 ? 0x7ceaff : 0xbd98ff, transparent: true, opacity: .54 }),
    );
    rail.userData.nonCollidable = true;
    group.add(rail);
  });

  // The course is readable as a physical flight corridor, not as a flat line.
  // These ribs give the player a stable sense of speed and show the next
  // decision point before it reaches the craft.
  const corridorRibs = [];
  const ribMaterial = new THREE.MeshStandardMaterial({
    color: 0x39708d,
    metalness: .86,
    roughness: .2,
    emissive: 0x0d3348,
    emissiveIntensity: .7,
  });
  const ribLightMaterial = new THREE.MeshBasicMaterial({
    color: 0x9deeff,
    transparent: true,
    opacity: .8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let index = 0; index < 44; index += 1) {
    const z = 820 + index * 940;
    const rib = new THREE.Group();
    rib.name = `mars-route-rib-${index + 1}`;
    rib.position.set(0, -105, z);
    const width = 1180 + Math.sin(index * .77) * 120;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(width, 16, 18), ribMaterial.clone());
    const light = new THREE.Mesh(new THREE.BoxGeometry(width * .72, 3, 4), ribLightMaterial.clone());
    light.position.y = 10;
    rib.add(beam, light);
    group.add(rib);
    corridorRibs.push({ rib, light, phase: index * .39 });
  }

  const hazardMaterial = new THREE.MeshStandardMaterial({
    color: 0x5e4a49,
    roughness: .94,
    metalness: .12,
    emissive: 0x16080a,
    emissiveIntensity: .4,
  });
  const hazardGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xff8b6e,
    transparent: true,
    opacity: .23,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const hazards = [];
  for (let section = 1; section < UFO_MARS_RACE_GATE_COUNT - 1; section += 1) {
    const gate = gates[section];
    const nextGate = gates[Math.min(gates.length - 1, section + 1)];
    const amount = section > 7 ? 2 : 1;
    for (let offsetIndex = 0; offsetIndex < amount; offsetIndex += 1) {
      const sign = (section + offsetIndex) % 2 === 0 ? 1 : -1;
      const radius = 92 + ((section * 37 + offsetIndex * 41) % 72);
      const x = THREE.MathUtils.lerp(gate.position.x, nextGate.position.x, .42 + offsetIndex * .19)
        + sign * (248 + (section % 4) * 68);
      const z = THREE.MathUtils.lerp(gate.position.y, nextGate.position.y, .48 + offsetIndex * .12);
      const root = new THREE.Group();
      root.name = `mars-race-asteroid-${section}-${offsetIndex}`;
      root.position.set(x, ((section + offsetIndex) % 3 - 1) * 42, z);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), hazardMaterial.clone());
      rock.rotation.set(section * .31, offsetIndex * .72, section * .48);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.14, 18, 12), hazardGlowMaterial.clone());
      root.add(rock, halo);
      group.add(root);
      hazards.push({
        root,
        rock,
        halo,
        position: new THREE.Vector2(x, z),
        baseX: x,
        radius,
        amplitude: 44 + (section % 4) * 24,
        phase: section * .79 + offsetIndex * 1.8,
        speed: .32 + (section % 3) * .08,
        active: true,
        spin: new THREE.Vector3(.17 + offsetIndex * .04, .24 + (section % 4) * .03, .12 + (section % 5) * .02),
      });
    }
  }

  // Additional bodies are deliberately distributed across the whole corridor.
  // Their forward drift and lateral velocity make contacts physical events
  // rather than static targets placed in the centre of the screen.
  const expandedHazardLayouts = [
    [-720, 3600, 118, 34, 18], [560, 4300, 148, -42, -24], [-160, 5050, 86, 58, 20],
    [820, 6300, 132, -34, 26], [-610, 7100, 104, 46, -16], [120, 7950, 166, -54, 30],
    [-860, 9100, 96, 38, -22], [420, 10100, 126, 62, 18], [-320, 11250, 156, -48, -28],
    [760, 12400, 102, -58, 24], [-740, 13600, 142, 44, 16], [220, 14850, 92, -64, -20],
    [-520, 16200, 172, 36, 32], [690, 17600, 112, -52, -26], [-100, 18950, 132, 48, 20],
    [850, 20400, 108, -44, 28], [-780, 21800, 154, 52, -18], [360, 23400, 94, -60, 22],
    [-300, 24900, 126, 42, -30], [710, 26400, 164, -46, 18], [-820, 28100, 104, 58, -22],
    [90, 29800, 136, -52, 26], [620, 31800, 110, 46, -24], [-540, 34000, 150, -42, 20],
    [260, 36400, 98, 54, -26], [-720, 38700, 142, -48, 22],
  ];
  expandedHazardLayouts.forEach(([x, z, radius, lateralSpeed, verticalSpeed], index) => {
    const root = new THREE.Group();
    root.name = `mars-route-body-${index + 1}`;
    root.position.set(x, ((index % 5) - 2) * 56, z);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), hazardMaterial.clone());
    rock.rotation.set(index * .27, index * .41, index * .63);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.16, 20, 14), hazardGlowMaterial.clone());
    root.add(rock, halo);
    group.add(root);
    hazards.push({
      root,
      rock,
      halo,
      position: new THREE.Vector2(x, z),
      baseX: x,
      baseZ: z,
      radius,
      amplitude: 90 + (index % 5) * 22,
      zAmplitude: 150 + (index % 4) * 38,
      phase: index * .63 + 1.4,
      speed: .54 + (index % 4) * .11,
      forwardSpeed: verticalSpeed,
      lateralSpeed,
      active: true,
      spin: new THREE.Vector3(.24 + index * .006, .18 + (index % 4) * .05, .16 + (index % 5) * .035),
    });
  });

  const flowGroup = new THREE.Group();
  flowGroup.name = "mars-breakthrough-gravity-flow";
  const flowMaterial = new THREE.MeshBasicMaterial({
    color: 0x5de3ff,
    transparent: true,
    opacity: .11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flowDefinitions = [
    { x: -330, z: 5200, width: 560, depth: 2300, strength: 1 },
    { x: 270, z: 10600, width: 440, depth: 2800, strength: -1 },
    { x: -210, z: 16800, width: 620, depth: 2400, strength: 1 },
    { x: 360, z: 23100, width: 500, depth: 3000, strength: -1 },
    { x: 0, z: 27900, width: 760, depth: 2600, strength: 1 },
  ];
  const gravityFlows = flowDefinitions.map(definition => {
    const root = new THREE.Group();
    root.position.set(definition.x, -60, definition.z);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(definition.width, definition.depth),
      flowMaterial.clone(),
    );
    plane.rotation.x = -Math.PI / 2;
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(definition.width * .12, definition.depth * .9),
      flowMaterial.clone(),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.x = definition.strength * definition.width * .18;
    root.add(plane, stripe);
    flowGroup.add(root);
    return { root, plane, stripe, strength: definition.strength, phase: definition.z * .0007, passed: false };
  });
  group.add(flowGroup);

  const gravityWells = [
    { x: 210, z: 7800, strength: -1, radius: 660 },
    { x: -260, z: 14200, strength: 1, radius: 760 },
    { x: 300, z: 20100, strength: -1, radius: 620 },
    { x: -120, z: 26100, strength: 1, radius: 820 },
  ].map((definition, index) => {
    const root = new THREE.Group();
    root.name = `mars-gravity-well-${index + 1}`;
    root.position.set(definition.x, -42, definition.z);
    const tint = definition.strength > 0 ? 0x68dbff : 0xffa06d;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(46, 20, 16),
      new THREE.MeshStandardMaterial({
        color: tint,
        emissive: tint,
        emissiveIntensity: 1.25,
        metalness: .5,
        roughness: .2,
      }),
    );
    const orbit = new THREE.Mesh(
      new THREE.TorusGeometry(definition.radius * .16, 5, 8, 42),
      new THREE.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: .62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    orbit.rotation.x = Math.PI / 2;
    const light = new THREE.PointLight(tint, 2.4, 900, 1.7);
    light.userData.nonCollidable = true;
    root.add(core, orbit, light);
    flowGroup.add(root);
    return { root, core, orbit, strength: definition.strength, radius: definition.radius, phase: index * 1.7 };
  });

  const afterimages = Array.from({ length: 3 }, (_, index) => {
    const ghost = new THREE.Mesh(
      new THREE.CylinderGeometry(82 - index * 13, 112 - index * 15, 16, 32),
      new THREE.MeshBasicMaterial({
        color: 0x8ff5ff,
        transparent: true,
        opacity: .24 - index * .055,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ghost.rotation.x = Math.PI / 2;
    ghost.visible = false;
    group.add(ghost);
    return { mesh: ghost, life: 0, offset: (index + 1) * 150 };
  });

  return {
    group,
    routeSurface,
    corridorRibs,
    flowGroup,
    gravityFlows,
    gravityWells,
    afterimages,
    gates,
    hazards,
    active: false,
    phase: "idle",
    elapsed: 0,
    timeRemaining: UFO_MARS_RACE_DURATION,
    origin: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    craftLocal: new THREE.Vector2(),
    steerVelocity: 0,
    speed: UFO_MARS_RACE_BASE_SPEED,
    boost: 0,
    integrity: 100,
    gatesPassed: 0,
    combo: 0,
    bestCombo: 0,
    impactFlash: 0,
    dashCooldown: 0,
    dashCharges: UFO_MARS_RACE_DASH_CHARGE_MAX,
    distance: 0,
    steeringInput: 0,
    lastCollisionAt: -10,
    sector: 0,
    phaseName: "地球圏離脱",
    dashInvulnerable: 0,
    decisionPulse: 0,
    testMode: false,
    startFlight: null,
    marsOriginalPosition: null,
  };
}

function resetUfoMarsRaceMission(mission) {
  if (!mission) return;
  mission.active = false;
  mission.phase = "idle";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_MARS_RACE_DURATION;
  mission.craftLocal.set(0, 0);
  mission.steerVelocity = 0;
  mission.speed = UFO_MARS_RACE_BASE_SPEED;
  mission.boost = 0;
  mission.integrity = 100;
  mission.gatesPassed = 0;
  mission.combo = 0;
  mission.bestCombo = 0;
  mission.impactFlash = 0;
  mission.dashCooldown = 0;
  mission.dashCharges = UFO_MARS_RACE_DASH_CHARGE_MAX;
  mission.distance = 0;
  mission.steeringInput = 0;
  mission.lastCollisionAt = -10;
  mission.sector = 0;
  mission.phaseName = "地球圏離脱";
  mission.dashInvulnerable = 0;
  mission.decisionPulse = 0;
  mission.group.visible = false;
  mission.gates.forEach(gate => {
    gate.resolved = false;
    gate.passed = false;
    gate.flash = 0;
    gate.root.visible = false;
  });
  mission.hazards.forEach(hazard => {
    hazard.active = true;
    hazard.root.visible = true;
    hazard.root.position.x = hazard.baseX;
    if (Number.isFinite(hazard.baseZ)) hazard.root.position.z = hazard.baseZ;
    hazard.position.x = hazard.baseX;
    if (Number.isFinite(hazard.baseZ)) hazard.position.y = hazard.baseZ;
  });
  mission.gravityFlows?.forEach(flow => { flow.root.visible = false; });
  mission.gravityFlows?.forEach(flow => { flow.passed = false; });
  mission.gravityWells?.forEach(well => { well.root.visible = false; });
  mission.afterimages?.forEach(afterimage => {
    afterimage.life = 0;
    afterimage.mesh.visible = false;
  });
  const control = ufoDoorControls[0];
  if (mission.marsOriginalPosition && control?.spaceMars?.parent) {
    control.spaceMars.position.copy(mission.marsOriginalPosition);
  }
  ["ufoMarsRace", "ufoMarsRacePhase", "ufoMarsRaceSpeed", "ufoMarsRaceGates", "ufoMarsRaceIntegrity", "ufoMarsRaceCombo", "ufoMarsRaceDash", "ufoMarsRaceDistance"].forEach(key => delete document.body.dataset[key]);
  setUfoSpaceControlLabels("救助航行", "左右操縦");
}

function setUfoMarsRaceCraftLocal(control, mission, local) {
  const nextWorld = mission.group.localToWorld(new THREE.Vector3(local.x, 0, local.y));
  const flight = ufoWorldToLocal(control, nextWorld.x, nextWorld.z);
  const scale = control.scale || BUILDING_SCALE;
  state.ufoFlightX = flight.x;
  state.ufoFlightZ = flight.z;
  state.ufoFlightY = clampUfoSpaceFlightY((nextWorld.y - (control.originY || 0)) / scale);
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
}

function getUfoMarsRaceCraftLocal(control, mission) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return new THREE.Vector2();
  craft.updateWorldMatrix(true, true);
  const local = mission.group.worldToLocal(craft.getWorldPosition(new THREE.Vector3()));
  return new THREE.Vector2(local.x, local.z);
}

function prepareUfoMarsRaceMission(control, mission, { restart = false } = {}) {
  const craft = control?.craftAssembly;
  if (!craft || !mission) return false;
  if (restart && mission.startFlight) {
    state.ufoFlightX = mission.startFlight.x;
    state.ufoFlightY = mission.startFlight.y;
    state.ufoFlightZ = mission.startFlight.z;
    state.ufoFlightHeading = mission.startFlight.heading;
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
  } else if (!restart) {
    mission.startFlight = {
      x: state.ufoFlightX,
      y: state.ufoFlightY,
      z: state.ufoFlightZ,
      heading: state.ufoFlightHeading,
    };
  }
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control).setY(0);
  if (forward.lengthSq() < .001) forward.set(0, 0, -1);
  forward.normalize();
  mission.origin.copy(craftCenter);
  mission.forward.copy(forward);
  mission.group.position.copy(craftCenter);
  mission.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.right.set(1, 0, 0).applyQuaternion(mission.group.quaternion).normalize();
  const mars = control.spaceMars;
  if (mars) {
    if (!mission.marsOriginalPosition) mission.marsOriginalPosition = mars.position.clone();
    const marsWorld = mission.group.localToWorld(new THREE.Vector3(0, 0, UFO_MARS_RACE_MARS_CENTER_DISTANCE));
    const marsLocal = mars.parent ? mars.parent.worldToLocal(marsWorld.clone()) : marsWorld;
    mars.position.copy(marsLocal);
    mars.visible = true;
  }
  mission.active = true;
  mission.phase = "ready";
  mission.elapsed = 0;
  mission.timeRemaining = UFO_MARS_RACE_DURATION;
  mission.craftLocal.set(0, 0);
  mission.steerVelocity = 0;
  mission.speed = UFO_MARS_RACE_BASE_SPEED;
  mission.boost = 0;
  mission.integrity = 100;
  mission.gatesPassed = 0;
  mission.combo = 0;
  mission.bestCombo = 0;
  mission.impactFlash = 0;
  mission.dashCooldown = 0;
  mission.dashCharges = UFO_MARS_RACE_DASH_CHARGE_MAX;
  mission.distance = 0;
  mission.steeringInput = 0;
  mission.lastCollisionAt = -10;
  mission.sector = 0;
  mission.phaseName = "地球圏離脱";
  mission.dashInvulnerable = 0;
  mission.decisionPulse = 0;
  mission.gates.forEach(gate => {
    gate.resolved = false;
    gate.passed = false;
    gate.flash = 0;
    gate.root.visible = false;
  });
  mission.hazards.forEach(hazard => {
    hazard.active = true;
    hazard.root.visible = true;
    hazard.root.position.x = hazard.baseX;
    if (Number.isFinite(hazard.baseZ)) hazard.root.position.z = hazard.baseZ;
    hazard.position.x = hazard.baseX;
    if (Number.isFinite(hazard.baseZ)) hazard.position.y = hazard.baseZ;
  });
  mission.gravityFlows?.forEach(flow => { flow.root.visible = true; });
  mission.gravityFlows?.forEach(flow => { flow.passed = false; });
  mission.gravityWells?.forEach(well => { well.root.visible = true; });
  mission.afterimages?.forEach(afterimage => {
    afterimage.life = 0;
    afterimage.mesh.visible = false;
  });
  mission.group.visible = true;
  document.body.dataset.ufoMarsRace = "ready";
  document.body.dataset.ufoMarsRacePhase = "ready";
  document.body.dataset.ufoMarsRaceSpeed = "0";
  document.body.dataset.ufoMarsRaceGates = "0";
  document.body.dataset.ufoMarsRaceIntegrity = "100";
  document.body.dataset.ufoMarsRaceCombo = "0";
  document.body.dataset.ufoMarsRaceDash = String(UFO_MARS_RACE_DASH_CHARGE_MAX);
  document.body.dataset.ufoMarsRaceDistance = "0";
  return true;
}

function activateUfoMarsRaceTestMode(control) {
  const mission = control?.spaceMarsRace;
  if (!mission || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded) return false;
  resetUfoSpaceRescueMission(control.spaceRescue);
  resetUfoGravityPinballMission(control.spacePinball);
  resetUfoSalvagePortMission(control.spaceSalvage);
  resetUfoPlanetBowlingMission(control.spaceBowling);
  resetUfoRingBattleMission(control.spaceRingBattle);
  resetUfoCranePortMission(control.spaceCranePort);
  resetUfoGravityMazeMission(control.spaceGravityMaze);
  resetUfoInertiaSlingshotMission(control.spaceInertiaSlingshot);
  resetUfoSolarSailMission(control.spaceSolarSail);
  resetUfoMarsRaceMission(mission);
  if (!prepareUfoMarsRaceMission(control, mission)) return false;
  mission.testMode = true;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  state.ufoSpaceCombatStarted = false;
  document.body.dataset.ufoSpaceCombatMode = "mars-entry-operation";
  document.body.dataset.ufoSpaceMission = "mars-entry-ready";
  document.body.dataset.ufoSpaceShooting = "disabled";
  setUfoSpaceControlLabels("火星突入航路", "左右で慣性を操縦");
  updateUfoMarsRaceHud();
  updateUfoMarsRaceLifeHud();
  updateUfoControls();
  showToast("火星突入航路。左右の慣性を制御し、重力流と残骸帯を抜けて火星へ到達します。");
  return true;
}

function startUfoMarsRace() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceMarsRace;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace || !state.ufoBoarded || state.ufoEngineMode !== "ready") return false;
  if (["failed", "complete"].includes(mission.phase)) {
    resetUfoMarsRaceMission(mission);
    if (!prepareUfoMarsRaceMission(control, mission, { restart: true })) return false;
    mission.testMode = true;
  }
  if (mission.phase !== "ready") return false;
  mission.phase = "playing";
  mission.speed = UFO_MARS_RACE_BASE_SPEED;
  mission.dashCharges = UFO_MARS_RACE_DASH_CHARGE_MAX;
  mission.dashCooldown = 0;
  document.body.dataset.ufoMarsRace = "playing";
  document.body.dataset.ufoMarsRacePhase = "playing";
  showToast("発進。入力を離してもUFOは滑ります。切り返しと残像航法を使い、航路ラインを捉えて火星へ向かってください。");
  updateUfoMarsRaceHud();
  updateUfoMarsRaceLifeHud();
  return true;
}

function useUfoMarsRaceAfterimage() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceMarsRace;
  if (!mission?.active || mission.phase !== "playing" || mission.dashCooldown > 0 || mission.dashCharges <= 0) return false;
  const current = getUfoMarsRaceCraftLocal(control, mission);
  const before = current.clone();
  const lateral = clamp(mission.steerVelocity / UFO_MARS_RACE_MAX_STRAFE_SPEED, -1, 1);
  const after = current.clone();
  // A phase dash is a committed line choice: it advances a short distance,
  // preserves the current drift, and grants only a brief collision phase.
  // It cannot be spammed or used as a free teleport to the finish.
  after.x = clamp(after.x + lateral * 180, -1180, 1180);
  after.y += UFO_MARS_RACE_DASH_DISTANCE;
  mission.afterimages.forEach((afterimage, index) => {
    afterimage.mesh.position.set(before.x, -70, before.y - index * 155);
    afterimage.mesh.visible = true;
    afterimage.life = .62 - index * .1;
    afterimage.mesh.material.opacity = .28 - index * .055;
  });
  mission.craftLocal.copy(after);
  mission.distance = after.y;
  mission.speed = Math.min(UFO_MARS_RACE_MAX_SPEED, mission.speed + 96);
  mission.steerVelocity *= .68;
  mission.dashCooldown = UFO_MARS_RACE_DASH_COOLDOWN;
  mission.dashCharges -= 1;
  mission.dashInvulnerable = .5;
  mission.impactFlash = .42;
  setUfoMarsRaceCraftLocal(control, mission, after);
  showToast(`残像航法。半秒だけ位相をずらして前方へ突破（残り${mission.dashCharges}回）`);
  return true;
}

function resolveUfoMarsRaceImpact(mission, normalX, damage, message) {
  mission.integrity = Math.max(0, mission.integrity - damage);
  mission.speed = Math.max(UFO_MARS_RACE_BASE_SPEED * .42, mission.speed * UFO_MARS_RACE_HAZARD_SPEED_LOSS);
  mission.steerVelocity += normalX * 360;
  mission.combo = 0;
  mission.impactFlash = 1;
  showToast(message);
}

function updateUfoMarsBreakthroughMission(control, mission, frameDelta) {
  mission.dashCooldown = Math.max(0, mission.dashCooldown - frameDelta);
  mission.impactFlash = Math.max(0, mission.impactFlash - frameDelta * 2.4);
  mission.afterimages?.forEach(afterimage => {
    afterimage.life = Math.max(0, afterimage.life - frameDelta);
    afterimage.mesh.visible = afterimage.life > 0;
    if (afterimage.mesh.visible) afterimage.mesh.material.opacity = Math.min(.3, afterimage.life * .48);
  });
  mission.gravityFlows?.forEach((flow, index) => {
    const pulse = .5 + Math.sin(mission.elapsed * (1.8 + index * .12) + flow.phase) * .5;
    flow.plane.material.opacity = .055 + pulse * .07;
    flow.stripe.material.opacity = .09 + pulse * .1;
    flow.stripe.position.x = flow.strength * (90 + pulse * 88);
  });
  mission.gravityWells?.forEach((well, index) => {
    const pulse = .9 + Math.sin(mission.elapsed * 2.2 + well.phase + index) * .12;
    well.core.scale.setScalar(pulse);
    well.orbit.rotation.z += frameDelta * (well.strength > 0 ? .9 : -.9);
  });

  const input = readUfoFlightInput();
  const steer = clamp(input.strafe || 0, -1, 1);
  mission.steeringInput = steer;
  mission.steerVelocity += steer * UFO_MARS_RACE_STEER_ACCELERATION * frameDelta;
  const current = mission.craftLocal.clone();
  const next = current.clone();
  const activeFlows = mission.gravityFlows?.filter(flow => {
    const dz = Math.abs(current.y - flow.root.position.z);
    return dz < 1150 && Math.abs(current.x - flow.root.position.x) < 410;
  }) ?? [];
  const flowBoost = activeFlows.reduce((sum, flow) => sum + (flow.strength > 0 ? 54 : 32), 0);
  const flowDrag = activeFlows.some(flow => flow.strength < 0) ? 36 : 0;
  mission.gravityWells?.forEach(well => {
    const dx = well.root.position.x - current.x;
    const dz = well.root.position.z - current.y;
    if (Math.abs(dz) > well.radius) return;
    const influence = 1 - Math.abs(dz) / well.radius;
    mission.steerVelocity += Math.sign(dx || well.strength) * well.strength * UFO_MARS_RACE_GRAVITY_PULL * influence * frameDelta;
  });
  mission.steerVelocity *= Math.exp(-UFO_MARS_RACE_STEER_DRAG * frameDelta);
  mission.steerVelocity = clamp(mission.steerVelocity, -UFO_MARS_RACE_MAX_STRAFE_SPEED, UFO_MARS_RACE_MAX_STRAFE_SPEED);
  const targetSpeed = UFO_MARS_RACE_BASE_SPEED + flowBoost - flowDrag;
  mission.speed += (targetSpeed - mission.speed) * Math.min(1, frameDelta * .7);
  mission.speed = clamp(mission.speed, UFO_MARS_RACE_BASE_SPEED * .52, UFO_MARS_RACE_MAX_SPEED);
  next.x = clamp(current.x + mission.steerVelocity * frameDelta, -1120, 1120);
  next.y += mission.speed * frameDelta;

  mission.gravityFlows?.forEach(flow => {
    if (flow.passed || next.y < flow.root.position.z) return;
    flow.passed = true;
    mission.gatesPassed += 1;
    mission.combo += 1;
    mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
    mission.speed = Math.min(UFO_MARS_RACE_MAX_SPEED, mission.speed + 88);
    if (mission.combo >= 2) mission.dashCharges = Math.min(UFO_MARS_RACE_DASH_CHARGE_MAX, mission.dashCharges + 1);
    showToast(`重力流を捕捉。推進加速 ×${mission.combo}（残像航法 +${mission.combo >= 2 ? 1 : 0}）`);
  });

  mission.hazards.forEach(hazard => {
    if (!hazard.active || current.y > hazard.position.y || next.y < hazard.position.y) return;
    const travelRatio = (hazard.position.y - current.y) / Math.max(.001, next.y - current.y);
    const craftXAtImpact = THREE.MathUtils.lerp(current.x, next.x, clamp(travelRatio, 0, 1));
    const dx = craftXAtImpact - hazard.position.x;
    const contactDistance = hazard.radius + UFO_MARS_RACE_CRAFT_RADIUS;
    if (Math.abs(dx) > contactDistance) return;
    hazard.active = false;
    hazard.root.visible = false;
    const impactSpeed = Math.abs(mission.speed - (hazard.speed || 0));
    const damage = clamp(Math.round(UFO_MARS_RACE_HAZARD_DAMAGE * (impactSpeed / 210)), 10, 30);
    const normalX = Math.sign(dx) || (mission.steerVelocity >= 0 ? 1 : -1);
    resolveUfoMarsRaceImpact(mission, normalX, damage, `デブリ接触。衝突角度で船体が${damage}損傷、航路が横滑りしました。`);
    next.x = clamp(craftXAtImpact + normalX * 28, -1120, 1120);
    mission.combo = 0;
  });

  mission.craftLocal.copy(next);
  mission.distance = clamp(next.y, 0, UFO_MARS_RACE_FINISH_DISTANCE);
  setUfoMarsRaceCraftLocal(control, mission, next);
  updateUfoFlightTilt({ forward: 0, turn: 0, lift: 0, strafe: clamp(mission.steerVelocity / UFO_MARS_RACE_MAX_STRAFE_SPEED, -1, 1) }, frameDelta);

  if (next.y >= UFO_MARS_RACE_FINISH_DISTANCE) {
    mission.phase = "complete";
    mission.speed = 0;
    showToast(`火星重力圏へ到達。${Math.round(mission.integrity)}%の船体で航路を突破しました。`);
  } else if (mission.integrity <= 0) {
    mission.phase = "failed";
    mission.speed = 0;
    showToast("船体耐久が尽きました。緊急帰還で空マップへ帰還します。");
    window.setTimeout(() => { if (state.map === "space" && mission.phase === "failed") emergencyEscape(); }, 700);
  } else if (mission.timeRemaining <= 0) {
    mission.phase = "failed";
    mission.speed = 0;
    showToast("航路時間を使い切りました。再挑戦で地球側から再出発できます。");
  }
}

// The production direction for the Mars game: the player owns a physical
// flight line. Forward thrust is the route's engine, while left/right input
// controls lateral momentum. Every section asks for a different correction;
// there is no invisible steering assist that quietly puts the craft back on
// the centre line.
function updateUfoMarsBreakthroughMissionV2(control, mission, frameDelta) {
  mission.dashCooldown = Math.max(0, mission.dashCooldown - frameDelta);
  mission.dashInvulnerable = Math.max(0, mission.dashInvulnerable - frameDelta);
  mission.impactFlash = Math.max(0, mission.impactFlash - frameDelta * 2.6);
  mission.decisionPulse = Math.max(0, mission.decisionPulse - frameDelta);

  mission.afterimages?.forEach(afterimage => {
    afterimage.life = Math.max(0, afterimage.life - frameDelta);
    afterimage.mesh.visible = afterimage.life > 0;
    if (afterimage.mesh.visible) afterimage.mesh.material.opacity = Math.min(.34, afterimage.life * .58);
  });
  mission.corridorRibs?.forEach((rib, index) => {
    const pulse = .5 + Math.sin(mission.elapsed * 2.2 + rib.phase) * .5;
    rib.light.material.opacity = .34 + pulse * .46;
    rib.rib.position.x = Math.sin(mission.elapsed * .34 + index * .17) * 26;
  });
  mission.gravityFlows?.forEach((flow, index) => {
    const pulse = .5 + Math.sin(mission.elapsed * (1.7 + index * .12) + flow.phase) * .5;
    flow.plane.material.opacity = .045 + pulse * .095;
    flow.stripe.material.opacity = .08 + pulse * .14;
    flow.stripe.position.x = flow.strength * (70 + pulse * 120);
  });
  mission.gravityWells?.forEach((well, index) => {
    const pulse = .9 + Math.sin(mission.elapsed * 2.1 + well.phase + index) * .14;
    well.core.scale.setScalar(pulse);
    well.orbit.rotation.z += frameDelta * (well.strength > 0 ? .86 : -.86);
  });

  const input = readUfoFlightInput();
  const steer = clamp(input.strafe || 0, -1, 1);
  mission.steeringInput = steer;
  const current = mission.craftLocal.clone();
  const next = current.clone();
  const inFlow = mission.gravityFlows?.filter(flow => {
    const forwardDistance = Math.abs(current.y - flow.root.position.z);
    return forwardDistance < 1250 && Math.abs(current.x - flow.root.position.x) < flow.root.children[0].geometry.parameters.width * .5;
  }) ?? [];
  const flowPush = inFlow.reduce((sum, flow) => sum + flow.strength * 175, 0);
  const flowBoost = inFlow.reduce((sum, flow) => sum + (flow.strength > 0 ? 92 : 28), 0);
  const flowDrag = inFlow.some(flow => flow.strength < 0) ? 74 : 0;
  mission.steerVelocity += steer * UFO_MARS_RACE_STEER_ACCELERATION * frameDelta;
  mission.steerVelocity += flowPush * frameDelta;
  mission.gravityWells?.forEach(well => {
    const dx = well.root.position.x - current.x;
    const dz = well.root.position.z - current.y;
    if (Math.abs(dz) > well.radius) return;
    const influence = 1 - Math.abs(dz) / well.radius;
    mission.steerVelocity += Math.sign(dx || well.strength) * well.strength * UFO_MARS_RACE_GRAVITY_PULL * influence * frameDelta;
  });
  mission.steerVelocity *= Math.exp(-UFO_MARS_RACE_STEER_DRAG * frameDelta);
  mission.steerVelocity = clamp(mission.steerVelocity, -UFO_MARS_RACE_MAX_STRAFE_SPEED, UFO_MARS_RACE_MAX_STRAFE_SPEED);

  const targetSpeed = UFO_MARS_RACE_BASE_SPEED + flowBoost + Math.min(96, mission.combo * 12) - flowDrag;
  mission.speed += (targetSpeed - mission.speed) * Math.min(1, frameDelta * 1.25);
  mission.speed = clamp(mission.speed, UFO_MARS_RACE_BASE_SPEED * .46, UFO_MARS_RACE_MAX_SPEED);
  next.x = clamp(current.x + mission.steerVelocity * frameDelta, -1240, 1240);
  next.y += mission.speed * frameDelta;

  // A checkpoint is a physical line through the route. Centre-line passage
  // rewards speed and a miss costs momentum and hull, so the route has a
  // readable risk/reward instead of a decorative ring.
  mission.gates.forEach(gate => {
    if (gate.resolved || next.y < gate.position.y) return;
    gate.resolved = true;
    const lateralError = Math.abs(next.x - gate.position.x);
    if (lateralError <= gate.boostRadius) {
      gate.passed = true;
      gate.flash = 1;
      mission.gatesPassed += 1;
      mission.combo += 1;
      mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
      const precision = 1 - lateralError / gate.boostRadius;
      mission.speed = Math.min(UFO_MARS_RACE_MAX_SPEED, mission.speed + UFO_MARS_RACE_GATE_BOOST + precision * 84);
      mission.dashCharges = Math.min(UFO_MARS_RACE_DASH_CHARGE_MAX, mission.dashCharges + (precision > .72 ? 1 : 0));
      mission.decisionPulse = 1;
      showToast(gate.isFinish
        ? "火星到着ラインを捕捉。最終進入姿勢を維持します。"
        : `航路ライン捕捉。精度 ${Math.round(precision * 100)}%、推進が跳ね上がりました。`);
    } else {
      gate.flash = .35;
      mission.integrity = Math.max(0, mission.integrity - (lateralError <= gate.radius + UFO_MARS_RACE_CRAFT_RADIUS ? 10 : 5));
      mission.speed = Math.max(UFO_MARS_RACE_BASE_SPEED * .46, mission.speed * .72);
      mission.steerVelocity *= .35;
      mission.combo = 0;
      showToast(lateralError <= gate.radius + UFO_MARS_RACE_CRAFT_RADIUS
        ? "航路ラインの外周へ接触。船体と速度を失いました。"
        : "航路ラインを外しました。次の区画まで加速が戻りません。");
    }
  });

  if (mission.dashInvulnerable <= 0) {
    mission.hazards.forEach(hazard => {
      if (!hazard.active || current.y > hazard.position.y || next.y < hazard.position.y) return;
      const ratio = (hazard.position.y - current.y) / Math.max(.001, next.y - current.y);
      const craftXAtImpact = THREE.MathUtils.lerp(current.x, next.x, clamp(ratio, 0, 1));
      const dx = craftXAtImpact - hazard.position.x;
      const contactDistance = hazard.radius + UFO_MARS_RACE_CRAFT_RADIUS;
      if (Math.abs(dx) > contactDistance) return;
      hazard.active = false;
      hazard.root.visible = false;
      const normalX = Math.sign(dx) || (mission.steerVelocity >= 0 ? 1 : -1);
      const relativeSpeed = Math.abs(mission.speed - (hazard.forwardSpeed || 0));
      const damage = clamp(Math.round(UFO_MARS_RACE_HAZARD_DAMAGE * (.72 + relativeSpeed / 520)), 12, 38);
      mission.integrity = Math.max(0, mission.integrity - damage);
      mission.speed = Math.max(UFO_MARS_RACE_BASE_SPEED * .46, mission.speed * UFO_MARS_RACE_HAZARD_SPEED_LOSS);
      mission.steerVelocity += normalX * 520 * UFO_MARS_RACE_COLLISION_RESTITUTION;
      mission.combo = 0;
      mission.impactFlash = 1;
      mission.decisionPulse = .5;
      next.x = clamp(craftXAtImpact + normalX * (contactDistance + 18), -1240, 1240);
      showToast(`航路残骸に衝突。船体 -${damage}、横滑りが発生しました。`);
    });
  }

  // The corridor wall is a real limit: grazing it costs control, but does not
  // teleport the craft or silently centre it.
  if (Math.abs(next.x) >= 1240) {
    const normalX = next.x > 0 ? -1 : 1;
    next.x = normalX * 1240;
    mission.steerVelocity = normalX * Math.abs(mission.steerVelocity) * .42;
    mission.speed = Math.max(UFO_MARS_RACE_BASE_SPEED * .46, mission.speed * .86);
    mission.integrity = Math.max(0, mission.integrity - 3);
  }

  const sector = Math.min(3, Math.floor((Math.max(0, next.y) / UFO_MARS_RACE_FINISH_DISTANCE) * 4));
  const sectorNames = ["地球圏離脱", "重力流航路", "残骸帯突破", "火星最終進入"];
  if (sector !== mission.sector) {
    mission.sector = sector;
    mission.phaseName = sectorNames[sector];
    showToast(`${mission.phaseName}へ進入。航路の性質が変わります。`);
  }
  mission.craftLocal.copy(next);
  mission.distance = clamp(next.y, 0, UFO_MARS_RACE_FINISH_DISTANCE);
  setUfoMarsRaceCraftLocal(control, mission, next);
  updateUfoFlightTilt({ forward: 0, turn: 0, lift: 0, strafe: clamp(mission.steerVelocity / UFO_MARS_RACE_MAX_STRAFE_SPEED, -1, 1) }, frameDelta);

  if (next.y >= UFO_MARS_RACE_FINISH_DISTANCE && mission.gates[mission.gates.length - 1]?.passed) {
    mission.phase = "complete";
    mission.speed = 0;
    showToast(`火星へ到達。${Math.round(mission.integrity)}%の船体で航路を完走しました。`);
  } else if (mission.integrity <= 0) {
    mission.phase = "failed";
    mission.speed = 0;
    showToast("船体耐久が尽きました。緊急帰還で雲マップへ帰還します。");
    window.setTimeout(() => { if (state.map === "space" && mission.phase === "failed") emergencyEscape(); }, 700);
  } else if (mission.timeRemaining <= 0) {
    mission.phase = "failed";
    mission.speed = 0;
    showToast("制限時間を超えました。航路を再展開して再挑戦できます。");
  }
}

function updateUfoMarsRaceMission(delta) {
  const control = ufoDoorControls[0];
  const mission = control?.spaceMarsRace;
  if (!mission?.active || state.map !== "space" || !state.ufoInSpace) return;
  const frameDelta = Math.min(.05, Math.max(0, delta || 0));
  mission.elapsed += mission.phase === "playing" ? frameDelta : 0;
  mission.gates.forEach((gate, index) => {
    // Keep the route readable: show the next decision line and the final
    // arrival line, rather than flooding the view with every checkpoint.
    const ahead = gate.position.y - mission.craftLocal.y;
    gate.root.visible = (ahead > -720 && ahead < 2500) || gate.isFinish || gate.passed;
    const passedGlow = gate.passed ? .9 : .24;
    gate.flash = Math.max(0, gate.flash - frameDelta * 1.6);
    gate.root.rotation.z += frameDelta * (.12 + index % 3 * .025);
    gate.inner.rotation.z -= frameDelta * (.28 + index % 4 * .035);
    gate.field.material.opacity = passedGlow * .18 + gate.flash * .3;
    gate.light.intensity = (gate.passed ? 8.4 : 3.4) + gate.flash * 9;
  });
  mission.hazards.forEach(hazard => {
    if (!hazard.active) return;
    const nextX = hazard.baseX + Math.sin(mission.elapsed * hazard.speed + hazard.phase) * hazard.amplitude;
    const nextZ = Number.isFinite(hazard.baseZ)
      ? hazard.baseZ + Math.sin(mission.elapsed * hazard.speed * .72 + hazard.phase * 1.3) * (hazard.zAmplitude || 0)
      : hazard.root.position.z;
    hazard.root.position.x = nextX;
    hazard.root.position.z = nextZ;
    hazard.position.x = nextX;
    hazard.position.y = nextZ;
    hazard.rock.rotation.x += frameDelta * hazard.spin.x;
    hazard.rock.rotation.y += frameDelta * hazard.spin.y;
    hazard.rock.rotation.z += frameDelta * hazard.spin.z;
    hazard.halo.material.opacity = .12 + Math.sin(mission.elapsed * 1.7 + hazard.phase) * .06;
  });

  if (mission.phase === "playing") {
    updateUfoMarsBreakthroughMissionV2(control, mission, frameDelta);
    mission.timeRemaining = Math.max(0, UFO_MARS_RACE_DURATION - mission.elapsed);
    document.body.dataset.ufoMarsRace = mission.phase;
    document.body.dataset.ufoMarsRacePhase = mission.phase;
    document.body.dataset.ufoMarsRaceSpeed = String(Math.round(mission.speed));
    document.body.dataset.ufoMarsRaceGates = String(mission.gatesPassed);
    document.body.dataset.ufoMarsRaceIntegrity = String(Math.round(mission.integrity));
    document.body.dataset.ufoMarsRaceCombo = String(mission.combo);
    document.body.dataset.ufoMarsRaceDash = String(mission.dashCharges);
    document.body.dataset.ufoMarsRaceDistance = String(Math.round(mission.distance));
    updateUfoMarsRaceHud();
    updateUfoMarsRaceLifeHud();
    return;
  }

  if (mission.phase === "playing") {
    mission.timeRemaining = Math.max(0, UFO_MARS_RACE_DURATION - mission.elapsed);
    mission.impactFlash = Math.max(0, mission.impactFlash - frameDelta * 2.8);
    const raceInput = readUfoFlightInput();
    const steer = clamp(raceInput.strafe || 0, -1, 1);
    mission.steerVelocity += steer * UFO_MARS_RACE_STEER_ACCELERATION * frameDelta;
    mission.steerVelocity *= Math.exp(-UFO_MARS_RACE_STEER_DRAG * frameDelta);
    mission.steerVelocity = clamp(mission.steerVelocity, -UFO_MARS_RACE_MAX_STRAFE_SPEED, UFO_MARS_RACE_MAX_STRAFE_SPEED);
    const targetSpeed = UFO_MARS_RACE_BASE_SPEED + Math.min(108, mission.boost);
    mission.speed += (targetSpeed - mission.speed) * Math.min(1, frameDelta * .82);
    mission.speed = clamp(mission.speed, UFO_MARS_RACE_BASE_SPEED * .4, UFO_MARS_RACE_MAX_SPEED);
    mission.boost = Math.max(0, mission.boost - frameDelta * 12.5);

    const current = getUfoMarsRaceCraftLocal(control, mission);
    const next = current.clone();
    next.x += mission.steerVelocity * frameDelta;
    next.y += mission.speed * frameDelta;

    mission.gates.forEach(gate => {
      if (gate.resolved || next.y < gate.position.y) return;
      gate.resolved = true;
      const lateralError = Math.abs(next.x - gate.position.x);
      if (lateralError <= gate.boostRadius) {
        gate.passed = true;
        gate.flash = 1;
        mission.gatesPassed += 1;
        mission.combo += 1;
        mission.bestCombo = Math.max(mission.bestCombo, mission.combo);
        const precision = 1 - lateralError / gate.boostRadius;
        const boost = UFO_MARS_RACE_GATE_BOOST + precision * 44 + Math.min(36, mission.combo * 3.4);
        mission.boost = Math.min(126, mission.boost + boost);
        mission.speed = Math.min(UFO_MARS_RACE_MAX_SPEED, mission.speed + boost * .72);
        if (gate.isFinish) {
          mission.phase = "complete";
          mission.speed *= .28;
          showToast(`火星到着ゲートへ進入。${mission.gatesPassed}/${UFO_MARS_RACE_GATE_COUNT}ゲートを通過して完走しました。`);
        } else if (mission.combo >= 3 && mission.combo % 3 === 0) {
          showToast(`連続ゲート ×${mission.combo}。UFO推進器が強く加速しています。`);
        }
      } else {
        const normal = Math.sign(next.x - gate.position.x) || 1;
        resolveUfoMarsRaceImpact(
          mission,
          normal,
          lateralError <= gate.radius + UFO_MARS_RACE_CRAFT_RADIUS ? 5 : 2,
          lateralError <= gate.radius + UFO_MARS_RACE_CRAFT_RADIUS
            ? "ゲート枠に接触。UFO本体が減速して走行ラインを外れました。"
            : "ゲートを外しました。連続加速が途切れ、推進速度が落ちます。",
        );
      }
    });

    mission.hazards.forEach(hazard => {
      if (!hazard.active) return;
      const deltaToHazard = next.clone().sub(hazard.position);
      const contactDistance = hazard.radius + UFO_MARS_RACE_CRAFT_RADIUS;
      if (deltaToHazard.lengthSq() > contactDistance ** 2) return;
      const normalX = deltaToHazard.lengthSq() > .001 ? deltaToHazard.x / deltaToHazard.length() : (mission.steerVelocity >= 0 ? 1 : -1);
      hazard.active = false;
      hazard.root.visible = false;
      resolveUfoMarsRaceImpact(mission, normalX, UFO_MARS_RACE_HAZARD_DAMAGE, "小惑星へ接触。実UFOが押し返され、速度と船体が削られました。");
    });

    mission.craftLocal.copy(next);
    setUfoMarsRaceCraftLocal(control, mission, next);
    updateUfoFlightTilt({ forward: 0, turn: 0, lift: 0, strafe: clamp(mission.steerVelocity / UFO_MARS_RACE_MAX_STRAFE_SPEED, -1, 1) }, frameDelta);

    const finalGate = mission.gates[mission.gates.length - 1];
    if (mission.phase === "playing" && next.y >= UFO_MARS_RACE_FINISH_DISTANCE + 560 && !finalGate.passed) {
      mission.phase = "failed";
      mission.speed *= .22;
      showToast("火星到着ゲートを外しました。入口の中心へ合わせ直して再挑戦できます。");
    }
    if (mission.integrity <= 0 && mission.phase === "playing") {
      mission.phase = "failed";
      mission.speed = 0;
      showToast("UFOの船体が耐えられなくなりました。レース航路を再展開できます。");
    }
    if (mission.timeRemaining <= 0 && mission.phase === "playing") {
      mission.phase = "failed";
      mission.speed *= .18;
      showToast("火星到着制限時間を超えました。ゲートを連続で抜けて推進速度を維持してください。");
    }
  }

  document.body.dataset.ufoMarsRace = mission.phase;
  document.body.dataset.ufoMarsRacePhase = mission.phase;
  document.body.dataset.ufoMarsRaceSpeed = String(Math.round(mission.speed));
  document.body.dataset.ufoMarsRaceGates = String(mission.gatesPassed);
  document.body.dataset.ufoMarsRaceIntegrity = String(Math.round(mission.integrity));
  document.body.dataset.ufoMarsRaceCombo = String(mission.combo);
  updateUfoMarsRaceHud();
  updateUfoMarsRaceLifeHud();
}

function updateUfoMarsRaceLifeHud() {
  const mission = ufoDoorControls[0]?.spaceMarsRace;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && mission?.active;
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const integrityPercent = clamp(mission.integrity, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "UFO船体";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${Math.round(integrityPercent)}%`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${integrityPercent}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "ready"
      ? "地球から火星へ。左右の慣性を操り、航路ラインをつないで突破します。"
      : mission.phase === "playing"
        ? `${mission.phaseName}｜火星まで ${Math.max(0, Math.round(UFO_MARS_RACE_FINISH_DISTANCE - mission.distance)).toLocaleString("ja-JP")}m。`
        : mission.phase === "complete"
          ? "火星重力圏へ到達しました。突破航路を完了しています。"
          : "再挑戦すると、地球側の発進位置から再出発できます。";
  }
  els.ufoSpaceLife.dataset.danger = mission.phase === "playing" && mission.integrity <= 34 ? "true" : "false";
}

function updateUfoMarsRaceHud() {
  const mission = ufoDoorControls[0]?.spaceMarsRace;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded && state.ufoEngineMode === "ready" && mission?.active && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "火星突入航路", first: "速度", second: "進行", third: "船体" });
  const distanceLeft = Math.max(0, Math.round(UFO_MARS_RACE_FINISH_DISTANCE - mission.distance));
  if (els.ufoSpaceWave) {
    els.ufoSpaceWave.textContent = mission.phase === "ready" ? "地球・発進待機"
      : mission.phase === "playing" ? mission.phaseName
        : mission.phase === "complete" ? "火星到着"
          : "再挑戦";
  }
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = String(Math.round(mission.speed));
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `${Math.round(mission.distance).toLocaleString("ja-JP")}m`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = `${Math.round(mission.integrity)}%`;
  const progress = mission.phase === "complete" ? 1 : clamp(mission.craftLocal.y / UFO_MARS_RACE_FINISH_DISTANCE, 0, .98);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = mission.phase === "ready"
      ? "同じUFOで地球から火星へ。慣性・重力流・残骸衝突・残像航法が実際の機体へ作用します。"
      : mission.phase === "playing"
        ? mission.combo > 1
          ? `航路ライン連続捕捉 ×${mission.combo}。速度が上がっています。次の危険帯へ備えてください。`
          : "左右で慣性を抑え、流れの芯を通ります。残骸への衝突角度で速度と船体が変わります。"
        : mission.phase === "complete"
          ? `火星到着。船体 ${Math.round(mission.integrity)}%で航路を完走しました。`
          : "火星突入航路を再展開すると、地球側の同じ発進位置から再挑戦できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["ready", "failed", "complete"].includes(mission.phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = mission.phase === "ready" ? "火星突入航路を開始" : "地球側から再挑戦";
    els.ufoSpaceStartButton.setAttribute("aria-label", "火星突入航路を開始する");
  }
  if (els.ufoSpaceFireButton) {
    const canDash = mission.phase === "playing" && mission.dashCooldown <= 0 && mission.dashCharges > 0;
    els.ufoSpaceFireButton.hidden = mission.phase !== "playing";
    els.ufoSpaceFireButton.disabled = !canDash;
    els.ufoSpaceFireButton.textContent = mission.dashCooldown > 0
      ? `残像充填 ${mission.dashCooldown.toFixed(1)}`
      : `残像航法（${mission.dashCharges}）`;
    els.ufoSpaceFireButton.setAttribute("aria-label", "残像航法で残骸帯を突破する");
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    delete els.ufoSpaceCombat.dataset.solarSail;
    els.ufoSpaceCombat.dataset.marsRace = "true";
    els.ufoSpaceCombat.dataset.cooldown = "false";
    els.ufoSpaceCombat.dataset.hit = String(mission.impactFlash > 0);
    els.ufoSpaceCombat.dataset.tethered = String(mission.dashCooldown > 0);
    els.ufoSpaceCombat.dataset.complete = String(mission.phase === "complete");
  }
}

// --- First playable physics mission: orbital rescue ---------------------------------
// This is deliberately separate from the former dust-shooter. The pod, the tow line,
// the arrival ring, and the drifting obstacles all have persistent positions and
// velocities. There is no enemy HP or disappearing target in this loop.
function makeUfoSpaceRescueMission(control) {
  const group = new THREE.Group();
  group.name = "ufo-space-rescue-mission";
  group.visible = false;

  const podGroup = new THREE.Group();
  podGroup.name = "space-rescue-colony-unit";
  const podShellMaterial = new THREE.MeshStandardMaterial({
    color: 0x3c6d86,
    metalness: .72,
    roughness: .28,
    emissive: 0x092231,
    emissiveIntensity: .52,
  });
  const podFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0xd9f8ff,
    metalness: .62,
    roughness: .2,
    emissive: 0x6edbf5,
    emissiveIntensity: .38,
  });
  const podBeaconMaterial = new THREE.MeshBasicMaterial({
    color: 0x9ffff1,
    transparent: true,
    opacity: .88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const podCore = new THREE.Mesh(
    new THREE.BoxGeometry(150, 78, 112, 3, 2, 2),
    podShellMaterial,
  );
  podCore.name = "rescue-unit-core";
  podGroup.add(podCore);
  const podRim = new THREE.Mesh(
    new THREE.TorusGeometry(72, 6, 10, 42),
    podFrameMaterial,
  );
  podRim.rotation.x = Math.PI / 2;
  podGroup.add(podRim);
  const podBraceA = new THREE.Mesh(new THREE.BoxGeometry(176, 10, 10), podFrameMaterial);
  const podBraceB = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 136), podFrameMaterial);
  podBraceA.position.y = 26;
  podBraceB.position.y = -26;
  podGroup.add(podBraceA, podBraceB);
  const podBeacon = new THREE.Mesh(new THREE.SphereGeometry(12, 18, 12), podBeaconMaterial);
  podBeacon.position.y = 48;
  podGroup.add(podBeacon);
  const podLight = new THREE.PointLight(0x8fffe5, 2.4, 700, 1.7);
  podLight.position.y = 52;
  podLight.userData.nonCollidable = true;
  podGroup.add(podLight);
  group.add(podGroup);

  const arrivalGroup = new THREE.Group();
  arrivalGroup.name = "space-rescue-arrival-ring";
  const arrivalRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x80ffe6,
    transparent: true,
    opacity: .92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const arrivalRing = new THREE.Mesh(
    new THREE.TorusGeometry(UFO_SPACE_RESCUE_GOAL_RADIUS, 10, 14, 72),
    arrivalRingMaterial,
  );
  const arrivalHalo = new THREE.Mesh(
    new THREE.RingGeometry(UFO_SPACE_RESCUE_GOAL_RADIUS * .74, UFO_SPACE_RESCUE_GOAL_RADIUS * .98, 72),
    new THREE.MeshBasicMaterial({
      color: 0x54eaff,
      transparent: true,
      opacity: .14,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  arrivalHalo.position.z = -2;
  arrivalGroup.add(arrivalRing, arrivalHalo);
  const arrivalLight = new THREE.PointLight(0x83ffe6, 2.2, 1100, 1.5);
  arrivalLight.userData.nonCollidable = true;
  arrivalGroup.add(arrivalLight);
  group.add(arrivalGroup);

  const makeTetherLine = colorValue => {
    const geometry = new THREE.BufferGeometry();
    const attribute = new THREE.BufferAttribute(new Float32Array(6), 3);
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", attribute);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color: colorValue,
        transparent: true,
        opacity: .94,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    line.visible = false;
    group.add(line);
    return { line, attribute };
  };
  const tetherA = makeTetherLine(0x9affea);
  const tetherB = makeTetherLine(0x5ec8ff);

  const obstacleMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a516d,
    metalness: .64,
    roughness: .46,
    emissive: 0x1c0e24,
    emissiveIntensity: .36,
  });
  const obstacles = [
    { radius: 112, phase: .2, lateralSpeed: 17 },
    { radius: 138, phase: 2.7, lateralSpeed: -13 },
    { radius: 96, phase: 4.5, lateralSpeed: 19 },
  ].map((definition, index) => {
    const mesh = new THREE.Mesh(
      new THREE.DodecahedronGeometry(definition.radius, 1),
      obstacleMaterial.clone(),
    );
    mesh.name = `space-rescue-drifting-debris-${index + 1}`;
    mesh.visible = false;
    group.add(mesh);
    return {
      ...definition,
      mesh,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      hitCooldown: 0,
    };
  });

  return {
    group,
    pod: {
      group: podGroup,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      radius: UFO_SPACE_RESCUE_POD_RADIUS,
      mass: UFO_SPACE_RESCUE_POD_MASS,
      integrity: 100,
    },
    goal: {
      group: arrivalGroup,
      ring: arrivalRing,
      halo: arrivalHalo,
      position: new THREE.Vector3(),
      radius: UFO_SPACE_RESCUE_GOAL_RADIUS,
    },
    tetherA,
    tetherB,
    obstacles,
    phase: "idle",
    tethered: false,
    elapsed: 0,
    stabilizeCooldown: 0,
    impactFlash: 0,
    startedAt: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    lastCraftCenter: new THREE.Vector3(),
    craftVelocity: new THREE.Vector3(),
    distanceToObjective: null,
    stabilizerUses: 0,
    completed: false,
    goalNoticeShown: false,
  };
}

function setUfoSpaceRescueTetherLine(tether, start, end) {
  if (!tether?.attribute) return;
  const values = tether.attribute.array;
  values[0] = start.x; values[1] = start.y; values[2] = start.z;
  values[3] = end.x; values[4] = end.y; values[5] = end.z;
  tether.attribute.needsUpdate = true;
}

function updateUfoSpaceRescueTethers(mission, craftCenter, forward, right) {
  if (!mission?.tethered) {
    if (mission?.tetherA?.line) mission.tetherA.line.visible = false;
    if (mission?.tetherB?.line) mission.tetherB.line.visible = false;
    return;
  }
  const pod = mission.pod;
  const startA = craftCenter.clone()
    .addScaledVector(forward, -74)
    .addScaledVector(right, -72)
    .add(new THREE.Vector3(0, -22, 0));
  const startB = craftCenter.clone()
    .addScaledVector(forward, -74)
    .addScaledVector(right, 72)
    .add(new THREE.Vector3(0, -22, 0));
  const endA = pod.position.clone().addScaledVector(right, -54);
  const endB = pod.position.clone().addScaledVector(right, 54);
  setUfoSpaceRescueTetherLine(mission.tetherA, startA, endA);
  setUfoSpaceRescueTetherLine(mission.tetherB, startB, endB);
  mission.tetherA.line.visible = true;
  mission.tetherB.line.visible = true;
}

function resetUfoSpaceRescueMission(mission) {
  if (!mission) return;
  mission.phase = "idle";
  mission.tethered = false;
  mission.elapsed = 0;
  mission.stabilizeCooldown = 0;
  mission.impactFlash = 0;
  mission.distanceToObjective = null;
  mission.stabilizerUses = 0;
  mission.completed = false;
  mission.goalNoticeShown = false;
  mission.group.visible = false;
  mission.pod.group.visible = false;
  mission.goal.group.visible = false;
  mission.pod.velocity.set(0, 0, 0);
  mission.pod.angularVelocity.set(0, 0, 0);
  mission.pod.integrity = 100;
  mission.obstacles.forEach(obstacle => {
    obstacle.mesh.visible = false;
    obstacle.hitCooldown = 0;
    obstacle.inContact = false;
    obstacle.hasDamaged = false;
  });
  updateUfoSpaceRescueTethers(mission, new THREE.Vector3(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0));
  state.ufoSpaceRescueState = "idle";
  state.ufoSpaceRescueIntegrity = 100;
  state.ufoSpaceRescueStability = 0;
  state.ufoSpaceRescueDistance = null;
}

function activateUfoSpaceRescueMission(control) {
  const mission = control?.spaceRescue;
  const craft = control?.craftAssembly;
  if (!mission || !craft) return false;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);

  mission.group.visible = true;
  mission.phase = "acquire";
  mission.tethered = false;
  mission.elapsed = 0;
  mission.stabilizeCooldown = 0;
  mission.impactFlash = 0;
  mission.completed = false;
  mission.goalNoticeShown = false;
  mission.startedAt.copy(craftCenter);
  mission.forward.copy(forward);
  mission.right.copy(right);
  mission.lastCraftCenter.copy(craftCenter);
  mission.craftVelocity.set(0, 0, 0);

  mission.pod.position.copy(craftCenter)
    .addScaledVector(forward, UFO_SPACE_RESCUE_ACQUIRE_DISTANCE)
    .addScaledVector(right, 190);
  mission.pod.velocity.copy(right).multiplyScalar(-10);
  mission.pod.angularVelocity.set(.36, .78, -.44);
  mission.pod.integrity = 100;
  mission.pod.group.position.copy(mission.pod.position);
  mission.pod.group.rotation.set(.28, -.52, .17);
  mission.pod.group.visible = true;

  mission.goal.position.copy(craftCenter)
    .addScaledVector(forward, UFO_SPACE_RESCUE_GOAL_DISTANCE)
    .addScaledVector(right, UFO_SPACE_RESCUE_GOAL_SIDE_OFFSET);
  mission.goal.group.position.copy(mission.goal.position);
  mission.goal.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mission.goal.group.visible = true;

  const obstacleLayout = [
    { forward: 1540, side: -210, y: -28 },
    { forward: 2330, side: 260, y: 36 },
    { forward: 3030, side: -75, y: -48 },
  ];
  mission.obstacles.forEach((obstacle, index) => {
    const layout = obstacleLayout[index];
    obstacle.position.copy(craftCenter)
      .addScaledVector(forward, layout.forward)
      .addScaledVector(right, layout.side)
      .add(new THREE.Vector3(0, layout.y, 0));
    obstacle.velocity.copy(right).multiplyScalar(obstacle.lateralSpeed);
    obstacle.hitCooldown = 0;
    obstacle.inContact = false;
    obstacle.hasDamaged = false;
    obstacle.mesh.position.copy(obstacle.position);
    obstacle.mesh.rotation.set(index * .7, index * 1.1, index * .45);
    obstacle.mesh.visible = true;
  });

  state.ufoSpaceRescueState = "acquire";
  state.ufoSpaceRescueIntegrity = 100;
  state.ufoSpaceRescueStability = 0;
  state.ufoSpaceRescueDistance = mission.pod.position.distanceTo(craftCenter);
  document.body.dataset.ufoSpaceMission = "rescue-acquire";
  document.body.dataset.ufoSpaceShooting = "disabled";
  return true;
}

function startUfoSpaceRescueMission() {
  if (state.map !== "space"
    || !state.ufoInSpace
    || !state.ufoBoarded
    || state.ufoEngineMode !== "ready"
    || state.ufoSpaceEscapePending) return false;
  const control = ufoDoorControls[0];
  const mission = control?.spaceRescue;
  if (!mission) return false;
  resetUfoSpaceRescueMission(mission);
  if (!activateUfoSpaceRescueMission(control)) return false;
  state.ufoSpaceCombatStarted = false;
  if (control.spaceDust) control.spaceDust.visible = false;
  if (control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
  updateUfoSpaceRescueHud();
  updateUfoSpaceLifeHud();
  showToast("救助任務開始。回転する開拓ユニットへ近づき、牽引索を接続してください。");
  return true;
}

function tryUfoSpaceRescueTether() {
  const control = ufoDoorControls[0];
  const mission = control?.spaceRescue;
  const craft = control?.craftAssembly;
  if (!mission || !craft || mission.phase !== "acquire") return false;
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const distance = mission.pod.position.distanceTo(craftCenter);
  if (distance > UFO_SPACE_RESCUE_LINK_RANGE) {
    showToast(`接続範囲外です。開拓ユニットまであと ${Math.ceil(distance)}。`);
    return false;
  }
  mission.tethered = true;
  mission.phase = "towing";
  mission.pod.velocity.addScaledVector(getUfoSpaceForward(control), 32);
  state.ufoSpaceRescueState = "towing";
  document.body.dataset.ufoSpaceMission = "rescue-towing";
  showToast("牽引索を接続。左右操縦で到着リングへ導いてください。");
  return true;
}

function activateUfoSpaceRescueStabilizer() {
  const mission = ufoDoorControls[0]?.spaceRescue;
  if (!mission || mission.phase !== "towing") return false;
  if (mission.stabilizeCooldown > 0) return false;
  mission.pod.angularVelocity.multiplyScalar(UFO_SPACE_RESCUE_STABILIZE_FACTOR);
  mission.pod.velocity.lerp(mission.craftVelocity, .24);
  mission.stabilizeCooldown = UFO_SPACE_RESCUE_STABILIZE_COOLDOWN;
  mission.stabilizerUses += 1;
  mission.impactFlash = .32;
  spawnUfoSpaceImpact(ufoDoorControls[0], mission.pod.position, {
    dustRadius: mission.pod.radius,
    trailColor: 0x8fffe5,
  });
  showToast("姿勢固定パルスを作動。開拓ユニットの回転を抑えました。");
  return true;
}

function handleUfoSpaceRescueAction() {
  const mission = ufoDoorControls[0]?.spaceRescue;
  if (!mission) return false;
  if (mission.phase === "acquire") return tryUfoSpaceRescueTether();
  if (mission.phase === "towing") return activateUfoSpaceRescueStabilizer();
  return false;
}

function updateUfoSpaceRescueObstacleCollisions(control, mission, delta) {
  const pod = mission.pod;
  mission.obstacles.forEach(obstacle => {
    obstacle.hitCooldown = Math.max(0, obstacle.hitCooldown - delta);
    obstacle.position.addScaledVector(obstacle.velocity, delta);
    const lateralTravel = obstacle.position.clone().sub(mission.startedAt).dot(mission.right);
    if (Math.abs(lateralTravel) > 900) obstacle.velocity.multiplyScalar(-1);
    obstacle.mesh.position.copy(obstacle.position);
    obstacle.mesh.rotation.x += delta * .47;
    obstacle.mesh.rotation.y += delta * .7;
    obstacle.mesh.rotation.z -= delta * .36;
    if (!mission.tethered) return;
    const separation = pod.position.clone().sub(obstacle.position);
    const minimumDistance = pod.radius + obstacle.radius;
    const distance = separation.length();
    if (distance >= minimumDistance) {
      obstacle.inContact = false;
      return;
    }
    const normal = distance > .001
      ? separation.multiplyScalar(1 / distance)
      : mission.right.clone();
    const penetration = minimumDistance - distance + 1;
    pod.position.addScaledVector(normal, penetration);
    const incomingSpeed = pod.velocity.clone().sub(obstacle.velocity).dot(normal);
    if (incomingSpeed < 0) {
      pod.velocity.addScaledVector(normal, -incomingSpeed * 1.32);
      pod.velocity.multiplyScalar(.62);
    }
    pod.angularVelocity.addScaledVector(normal, .58);
    // A single physical contact must have one impact. The earlier cooldown
    // damaged the unit repeatedly while it was still interpenetrating one
    // obstacle, so an otherwise recoverable scrape could drain all integrity.
    if (obstacle.hasDamaged || obstacle.inContact || obstacle.hitCooldown > 0) return;
    obstacle.inContact = true;
    obstacle.hasDamaged = true;
    obstacle.hitCooldown = .72;
    pod.integrity = clamp(
      pod.integrity - UFO_SPACE_RESCUE_DEBRIS_COLLISION_DAMAGE,
      0,
      100,
    );
    mission.impactFlash = .48;
    spawnUfoSpaceImpact(control, pod.position, {
      dustRadius: pod.radius,
      trailColor: 0xffb885,
    }, { hostile: true });
    showToast(`漂流残骸と接触。開拓ユニットの状態 ${Math.ceil(pod.integrity)}。`);
  });
}

function updateUfoSpaceRescueMission(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  if (isUfoSpaceArcadeMissionActive(control)) return;
  const mission = control?.spaceRescue;
  const craft = control?.craftAssembly;
  if (!mission || !craft) return;
  const active = ["acquire", "towing"].includes(mission.phase);
  if (!active) {
    updateUfoSpaceRescueHud();
    return;
  }
  const frameDelta = Math.min(delta, .05);
  mission.elapsed += frameDelta;
  mission.stabilizeCooldown = Math.max(0, mission.stabilizeCooldown - frameDelta);
  mission.impactFlash = Math.max(0, mission.impactFlash - frameDelta);
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  const right = forward.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  mission.craftVelocity.copy(craftCenter).sub(mission.lastCraftCenter).multiplyScalar(1 / Math.max(.001, frameDelta));
  mission.lastCraftCenter.copy(craftCenter);

  const pod = mission.pod;
  if (mission.phase === "acquire") {
    pod.position.addScaledVector(pod.velocity, frameDelta);
    pod.angularVelocity.multiplyScalar(Math.exp(-.03 * frameDelta));
    mission.distanceToObjective = pod.position.distanceTo(craftCenter);
  } else if (mission.phase === "towing") {
    const tetherTarget = craftCenter.clone().addScaledVector(forward, -UFO_SPACE_RESCUE_TETHER_LENGTH);
    const toTarget = tetherTarget.clone().sub(pod.position);
    const relativeVelocity = pod.velocity.clone().sub(mission.craftVelocity);
    const springForce = toTarget.multiplyScalar(UFO_SPACE_RESCUE_TETHER_STIFFNESS)
      .addScaledVector(relativeVelocity, -UFO_SPACE_RESCUE_TETHER_DAMPING);
    pod.velocity.addScaledVector(springForce, frameDelta);
    pod.position.addScaledVector(pod.velocity, frameDelta);
    const tension = tetherTarget.distanceTo(pod.position);
    pod.angularVelocity.multiplyScalar(Math.exp(-.22 * frameDelta));
    pod.angularVelocity.addScaledVector(right, clamp(tension / 2600, 0, .13) * frameDelta);
    mission.distanceToObjective = pod.position.distanceTo(mission.goal.position);
  }

  updateUfoSpaceRescueObstacleCollisions(control, mission, frameDelta);
  pod.group.position.copy(pod.position);
  pod.group.rotation.x += pod.angularVelocity.x * frameDelta;
  pod.group.rotation.y += pod.angularVelocity.y * frameDelta;
  pod.group.rotation.z += pod.angularVelocity.z * frameDelta;
  mission.goal.group.rotateZ(frameDelta * .32);
  mission.goal.halo.material.opacity = .1 + Math.sin(mission.elapsed * 2.4) * .035;
  updateUfoSpaceRescueTethers(mission, craftCenter, forward, right);

  const angularSpeed = pod.angularVelocity.length();
  const stability = clamp(100 - angularSpeed * 68 - pod.velocity.clone().sub(mission.craftVelocity).length() * .12, 0, 100);
  state.ufoSpaceRescueIntegrity = pod.integrity;
  state.ufoSpaceRescueStability = stability;
  state.ufoSpaceRescueDistance = mission.distanceToObjective;
  document.body.dataset.ufoSpaceRescueIntegrity = pod.integrity.toFixed(1);
  document.body.dataset.ufoSpaceRescueStability = stability.toFixed(1);
  document.body.dataset.ufoSpaceRescueDistance = Number.isFinite(mission.distanceToObjective)
    ? mission.distanceToObjective.toFixed(1)
    : "none";

  if (pod.integrity <= 0) {
    mission.phase = "failed";
    mission.tethered = false;
    state.ufoSpaceRescueState = "failed";
    document.body.dataset.ufoSpaceMission = "rescue-failed";
    showToast("開拓ユニットが損傷しました。救助任務を再開できます。");
  } else if (mission.phase === "towing") {
    const insideGoal = mission.distanceToObjective <= mission.goal.radius - pod.radius * .28;
    if (insideGoal && stability >= 45 && pod.integrity >= UFO_SPACE_RESCUE_MIN_INTEGRITY) {
      mission.phase = "complete";
      mission.completed = true;
      mission.tethered = false;
      state.ufoSpaceRescueState = "complete";
      document.body.dataset.ufoSpaceMission = "rescue-complete";
      showToast("救助成功。開拓ユニットを到着リングへ収容しました。");
    } else if (insideGoal && !mission.goalNoticeShown) {
      mission.goalNoticeShown = true;
      showToast("到着リング内です。姿勢を安定させてから収容してください。");
    }
  }
  updateUfoSpaceLifeHud();
  updateUfoSpaceRescueHud();
}

function updateUfoSpaceRescueLifeHud() {
  const mission = ufoDoorControls[0]?.spaceRescue;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && mission
    && mission.phase !== "idle";
  if (els.ufoSpaceLife) els.ufoSpaceLife.hidden = !visible;
  if (!visible || !mission) return;
  const integrity = clamp(mission.pod.integrity, 0, 100);
  if (els.ufoSpaceLifeLabel) els.ufoSpaceLifeLabel.textContent = "開拓ユニット";
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${Math.ceil(integrity)}`;
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${integrity}%`;
  if (els.ufoSpaceLifeNote) {
    els.ufoSpaceLifeNote.textContent = mission.phase === "acquire"
      ? "接続範囲まで近づいてください"
      : mission.phase === "towing"
        ? `牽引中：姿勢安定 ${Math.round(state.ufoSpaceRescueStability)}%`
        : mission.phase === "complete"
          ? "到着リングへの収容に成功しました"
          : "損傷しました。任務を再開できます";
  }
  els.ufoSpaceLife.dataset.danger = integrity <= 35 ? "true" : "false";
}

function updateUfoSpaceRescueHud() {
  const mission = ufoDoorControls[0]?.spaceRescue;
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && !state.ufoSpaceEscapePending;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  if (!visible || !mission) return;
  setUfoSpaceHudLabels({ title: "開拓ユニット救助", first: "接続", second: "安定", third: "距離" });
  const phase = mission.phase;
  const linked = mission.tethered;
  const distance = state.ufoSpaceRescueDistance;
  const distanceLabel = Number.isFinite(distance)
    ? Math.max(0, Math.round(distance)).toLocaleString("ja-JP")
    : "--";
  if (els.ufoSpaceWave) {
    els.ufoSpaceWave.textContent = phase === "idle" ? "待機"
      : phase === "acquire" ? "接続準備"
        : phase === "towing" ? "牽引中"
          : phase === "complete" ? "救助成功"
            : "再挑戦可";
  }
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = linked ? "ON" : "--";
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = `${Math.round(state.ufoSpaceRescueStability)}%`;
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = distanceLabel;
  const progress = phase === "acquire"
    ? clamp(1 - (distance || UFO_SPACE_RESCUE_ACQUIRE_DISTANCE) / UFO_SPACE_RESCUE_ACQUIRE_DISTANCE, 0, .32)
    : phase === "towing"
      ? clamp(1 - (distance || UFO_SPACE_RESCUE_GOAL_DISTANCE) / UFO_SPACE_RESCUE_GOAL_DISTANCE, .32, .95)
      : phase === "complete" ? 1 : 0;
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(progress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = phase === "idle"
      ? "開始すると、回転中の開拓ユニットが出現します。"
      : phase === "acquire"
        ? distance <= UFO_SPACE_RESCUE_LINK_RANGE
          ? "接続圏内で航行を維持しています。牽引索を接続してください。"
          : `開拓ユニットまで ${distanceLabel}。範囲内で牽引索を接続します。`
        : phase === "towing"
          ? distance <= mission.goal.radius
            ? "到着リング内で航行を維持しています。姿勢固定パルスで収容してください。"
            : "左右操縦で到着リングへ。必要に応じて姿勢固定パルスを使います。"
          : phase === "complete"
            ? "この試作任務は完了です。再度開始して別の航行を試せます。"
            : "開拓ユニットが損傷しました。救助任務を再開できます。";
  }
  if (els.ufoSpaceStartButton) {
    const canStart = ["idle", "failed", "complete"].includes(phase);
    els.ufoSpaceStartButton.hidden = !canStart;
    els.ufoSpaceStartButton.disabled = !canStart;
    els.ufoSpaceStartButton.textContent = phase === "idle" ? "救助任務を開始" : "救助任務を再開";
  }
  if (els.ufoSpaceFireButton) {
    const canConnect = phase === "acquire" && (distance || Infinity) <= UFO_SPACE_RESCUE_LINK_RANGE;
    const canStabilize = phase === "towing" && mission.stabilizeCooldown <= 0;
    els.ufoSpaceFireButton.hidden = !["acquire", "towing"].includes(phase);
    els.ufoSpaceFireButton.disabled = !(canConnect || canStabilize);
    els.ufoSpaceFireButton.textContent = phase === "towing" ? "姿勢固定パルス" : "牽引索を接続";
    els.ufoSpaceFireButton.setAttribute(
      "aria-label",
      phase === "towing" ? "開拓ユニットの姿勢を固定する" : "開拓ユニットへ牽引索を接続する",
    );
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = true;
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.cooldown = mission.stabilizeCooldown > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.hit = mission.impactFlash > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.tethered = String(linked);
    els.ufoSpaceCombat.dataset.complete = String(phase === "complete");
  }
}

function spawnUfoSpaceImpact(control, position, type, { hostile = false } = {}) {
  const combat = control?.spaceCombat;
  if (!combat) return;
  const color = new THREE.Color(hostile ? 0xff8f62 : (type?.trailColor || 0x94f6ff));
  const group = new THREE.Group();
  group.name = hostile ? "ufo-space-hit-impact" : "ufo-space-dust-burst";
  group.position.copy(position);
  const core = new THREE.Mesh(
    combat.explosionGeometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: hostile ? .72 : .88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const ringA = new THREE.Mesh(
    combat.impactRingGeometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: hostile ? .44 : .62,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const ringB = ringA.clone();
  ringB.material = ringA.material.clone();
  ringA.rotation.x = Math.PI / 2;
  ringB.rotation.y = Math.PI / 2;
  group.add(core, ringA, ringB);
  combat.group.add(group);
  combat.explosions.push({
    mesh: group,
    core,
    rings: [ringA, ringB],
    age: 0,
    duration: hostile ? .42 : .58,
    size: Math.max(34, (type?.dustRadius || 74) * (hostile ? 1.15 : 1.55)),
  });
}

function updateUfoSpaceImpacts(combat, delta) {
  if (!combat?.explosions?.length) return;
  for (let index = combat.explosions.length - 1; index >= 0; index -= 1) {
    const impact = combat.explosions[index];
    impact.age += delta;
    const progress = clamp(impact.age / impact.duration, 0, 1);
    const scale = THREE.MathUtils.lerp(impact.size * .16, impact.size, Math.pow(progress, .64));
    impact.core.scale.setScalar(scale);
    impact.core.material.opacity = (1 - progress) * .86;
    impact.rings.forEach((ring, ringIndex) => {
      ring.scale.setScalar(scale * (1.05 + ringIndex * .24));
      ring.material.opacity = (1 - progress) * (.58 - ringIndex * .12);
      ring.rotation.z += delta * (ringIndex ? -7 : 6);
    });
    if (progress < 1) continue;
    combat.group.remove(impact.mesh);
    impact.core.material.dispose();
    impact.rings.forEach(ring => ring.material.dispose());
    combat.explosions.splice(index, 1);
  }
}

function updateUfoSpaceCombatHud() {
  if (isUfoForwardScrollActive()) {
    updateUfoForwardScrollHud();
    return;
  }
  setUfoSpaceReturnButtonVisible(false);
  if (isUfoSpacePlanetariumFreeFlight()) {
    hideUfoPlanetariumMissionHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceStarMining?.active) {
    updateUfoStarMiningHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceMarsRace?.active) {
    updateUfoMarsRaceHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceSolarSail?.active) {
    updateUfoSolarSailHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceInertiaSlingshot?.active) {
    updateUfoInertiaSlingshotHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceGravityMaze?.active) {
    updateUfoGravityMazeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceCranePort?.active) {
    updateUfoCranePortHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceRingBattle?.active) {
    updateUfoRingBattleHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceBowling?.active) {
    updateUfoPlanetBowlingHud();
    return;
  }
  if (ufoDoorControls[0]?.spacePinball?.active) {
    updateUfoGravityPinballHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceSalvage?.active) {
    updateUfoSalvagePortHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceRescue) {
    updateUfoSpaceRescueHud();
    return;
  }
  const visible = state.map === "space"
    && state.ufoInSpace
    && state.ufoBoarded
    && state.ufoEngineMode === "ready"
    && !state.ufoSpaceEscapePending;
  const started = state.ufoSpaceCombatStarted;
  if (els.ufoSpaceCombat) els.ufoSpaceCombat.hidden = !visible;
  const combat = ufoDoorControls[0]?.spaceCombat;
  const stream = ufoDoorControls[0]?.spaceDust?.userData;
  const waveIndex = stream?.waveIndex || 0;
  const activeCount = stream?.activeCount || 0;
  const nextWaveProgress = stream && Number.isFinite(stream.nextWaveAt)
    ? clamp((stream.elapsed - stream.lastWaveAt) / Math.max(.1, stream.nextWaveInterval), 0, 1)
    : 0;
  if (els.ufoSpaceWave) {
    els.ufoSpaceWave.textContent = !started
      ? "待機"
      : waveIndex > 0
        ? `第${waveIndex}波 ${stream.waveLabel}`
        : "接近準備";
  }
  if (els.ufoSpaceDustDestroyed) els.ufoSpaceDustDestroyed.textContent = String(state.ufoSpaceDustDestroyedCount);
  if (els.ufoSpaceDeflectionCount) els.ufoSpaceDeflectionCount.textContent = String(state.ufoSpaceDeflectionCount);
  if (els.ufoSpaceThreatCount) els.ufoSpaceThreatCount.textContent = String(activeCount);
  if (els.ufoSpaceWaveFill) els.ufoSpaceWaveFill.style.width = `${Math.round(nextWaveProgress * 100)}%`;
  if (els.ufoSpaceCombatNote) {
    els.ufoSpaceCombatNote.textContent = !started
      ? "開始後、衝撃弾でチリの軌道を変えます"
      : state.ufoSpaceHazardGrace > 0
        ? `第1波を捕捉中　射撃準備 ${state.ufoSpaceHazardGrace.toFixed(1)}秒`
        : activeCount > 0
          ? `${stream.waveLabel}が接近中　Fキーで衝撃弾を放つ`
          : "次の編隊を探知中";
  }
  if (els.ufoSpaceCombat) {
    els.ufoSpaceCombat.dataset.cooldown = combat?.cooldown > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.hit = combat?.hitFlash > 0 ? "true" : "false";
    els.ufoSpaceCombat.dataset.started = String(started);
  }
  if (els.ufoSpaceStartButton) {
    els.ufoSpaceStartButton.hidden = !visible || started;
    els.ufoSpaceStartButton.disabled = !visible || started;
  }
  if (els.ufoSpaceFireButton) {
    els.ufoSpaceFireButton.disabled = !visible || !started || (combat?.cooldown || 0) > 0;
  }
  if (els.ufoSpaceReticle) els.ufoSpaceReticle.hidden = !visible || !started;
}

function startUfoSpaceCombat() {
  if (state.map !== "space"
    || !state.ufoInSpace
    || !state.ufoBoarded
    || state.ufoEngineMode !== "ready"
    || state.ufoSpaceEscapePending
    || state.ufoSpaceCombatStarted) return false;
  state.ufoSpaceCombatStarted = true;
  const combat = ufoDoorControls[0]?.spaceCombat;
  if (combat) combat.strafeVelocity = 0;
  state.ufoSpaceHazardGrace = Math.max(
    UFO_SPACE_HAZARD_GRACE,
    UFO_SPACE_COMBAT_START_DELAY + .8,
  );
  beginSpaceDustEncounter(ufoDoorControls[0]?.spaceDust?.userData);
  document.body.dataset.ufoSpaceCombat = "started";
  updateUfoSpaceLifeHud();
  updateUfoSpaceCombatHud();
  showToast("火星航路を開始。接近する第1波を迎撃してください");
  return true;
}

function getUfoSpaceForward(control) {
  const craft = control?.craftAssembly;
  if (!craft) return new THREE.Vector3(0, 0, -1);
  const quaternion = new THREE.Quaternion();
  craft.getWorldQuaternion(quaternion);
  return new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
}

function isSpaceDustParticleActive(stream, particle) {
  return Boolean(
    stream
    && particle?.active
    && stream.elapsed >= (particle.spawnAt ?? Infinity),
  );
}

function makeSpaceCombatFrame(direction) {
  const reference = Math.abs(direction.y) < .8
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const side = direction.clone().cross(reference).normalize();
  const vertical = side.clone().cross(direction).normalize();
  return { direction, side, vertical };
}

function hideSpaceDustParticle(particle, stream) {
  const dummy = stream.dummy;
  dummy.position.set(0, -100000, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(0);
  dummy.updateMatrix();
  particle.mesh.setMatrixAt(particle.meshIndex, dummy.matrix);
}

function writeSpaceDustParticleInstance(particle, stream) {
  const dummy = stream.dummy;
  dummy.position.copy(particle.position);
  dummy.rotation.set(
    particle.spin.x * stream.elapsed + particle.phase,
    particle.spin.y * stream.elapsed + particle.phase * .7,
    particle.spin.z * stream.elapsed + particle.phase * 1.2,
  );
  dummy.scale.setScalar(particle.scale);
  dummy.updateMatrix();
  particle.mesh.setMatrixAt(particle.meshIndex, dummy.matrix);
}

function refreshSpaceDustTrails(stream) {
  stream.particles.forEach((particle, index) => {
    const offset = index * 6;
    if (!isSpaceDustParticleActive(stream, particle)) {
      stream.trailPositions[offset] = 0;
      stream.trailPositions[offset + 1] = -100000;
      stream.trailPositions[offset + 2] = 0;
      stream.trailPositions[offset + 3] = 0;
      stream.trailPositions[offset + 4] = -100000;
      stream.trailPositions[offset + 5] = 0;
      return;
    }
    const tailLength = Math.min(
      UFO_SPACE_COMBAT_TRAIL_LENGTH + particle.dustRadius * .46,
      76 + particle.travelled * .22,
    );
    const tail = particle.position.clone().addScaledVector(particle.direction, -tailLength);
    stream.trailPositions[offset] = particle.position.x;
    stream.trailPositions[offset + 1] = particle.position.y;
    stream.trailPositions[offset + 2] = particle.position.z;
    stream.trailPositions[offset + 3] = tail.x;
    stream.trailPositions[offset + 4] = tail.y;
    stream.trailPositions[offset + 5] = tail.z;
    const intensity = particle.typeId === "large" ? .92 : particle.typeId === "medium" ? .76 : .66;
    for (let vertex = 0; vertex < 2; vertex += 1) {
      const colorOffset = offset + vertex * 3;
      const fade = vertex === 0 ? intensity : intensity * .08;
      stream.trailColors[colorOffset] = particle.trailColor.r * fade;
      stream.trailColors[colorOffset + 1] = particle.trailColor.g * fade;
      stream.trailColors[colorOffset + 2] = particle.trailColor.b * fade;
    }
  });
  stream.trailPositionAttribute.needsUpdate = true;
  stream.trailColorAttribute.needsUpdate = true;
}

function resetSpaceDustEncounter(stream) {
  if (!stream) return;
  stream.elapsed = 0;
  stream.waveIndex = 0;
  stream.waveLabel = "待機";
  stream.lastWaveAt = 0;
  stream.nextWaveAt = Infinity;
  stream.nextWaveInterval = UFO_SPACE_COMBAT_WAVE_INTERVAL;
  stream.activeCount = 0;
  stream.nearestDistance = Infinity;
  stream.physicsCollisionCount = 0;
  stream.physicsDeflectionCount = 0;
  stream.particles.forEach(particle => {
    particle.active = false;
    particle.spawnAt = Infinity;
    particle.routeLength = 0;
    particle.travelled = 0;
    particle.integrity = particle.maxIntegrity;
    particle.collisionCooldown = 0;
    hideSpaceDustParticle(particle, stream);
  });
  Object.values(stream.meshes).forEach(mesh => {
    mesh.instanceMatrix.needsUpdate = true;
  });
  refreshSpaceDustTrails(stream);
}

function beginSpaceDustEncounter(stream) {
  resetSpaceDustEncounter(stream);
  stream.waveLabel = "接近準備";
  stream.nextWaveAt = UFO_SPACE_COMBAT_START_DELAY;
}

function takeInactiveSpaceDustParticle(stream, typeId) {
  return stream.particles.find(particle => (
    particle.typeId === typeId && !particle.active
  )) || null;
}

function spawnSpaceDustWave(stream, craftCenter) {
  const formation = UFO_SPACE_COMBAT_FORMATIONS[
    stream.waveIndex % UFO_SPACE_COMBAT_FORMATIONS.length
  ];
  const targetPath = craftCenter.clone().sub(stream.start);
  const targetDistance = Math.max(1, targetPath.length());
  const frame = makeSpaceCombatFrame(targetPath.normalize());
  const pressure = clamp(1 - targetDistance / Math.max(1, stream.length), 0, 1);
  const laneWidth = stream.craftRadius * 3.65;
  const laneHeight = stream.craftRadius * 2.55;
  stream.waveIndex += 1;
  stream.waveLabel = formation.label;
  stream.lastWaveAt = stream.elapsed;
  stream.nextWaveInterval = THREE.MathUtils.lerp(
    UFO_SPACE_COMBAT_WAVE_INTERVAL,
    UFO_SPACE_COMBAT_WAVE_MIN_INTERVAL,
    pressure,
  );
  stream.nextWaveAt = stream.elapsed + stream.nextWaveInterval;

  formation.slots.forEach((slot, slotIndex) => {
    const particle = takeInactiveSpaceDustParticle(stream, slot.typeId);
    if (!particle) return;
    // 多数は生成時点のUFO位置をほぼ通る危険航路にする。ただし
    // 以後の位置追従は行わず、操縦で外せる直線コースのままにする。
    const directApproach = (slotIndex + stream.waveIndex) % 3 !== 0;
    const laneBias = directApproach ? .085 : 1;
    const target = craftCenter.clone()
      .addScaledVector(frame.side, slot.side * laneWidth * laneBias)
      .addScaledVector(frame.vertical, slot.vertical * laneHeight * laneBias);
    const routeVector = target.clone().sub(stream.start);
    const routeDirection = routeVector.normalize();
    const baseDistance = Math.min(
      UFO_SPACE_COMBAT_ROUTE_DISTANCE + slotIndex * 85,
      Math.max(1550, target.distanceTo(stream.start) * .9),
    );
    const start = target.clone().addScaledVector(routeDirection, -baseDistance);
    const speedOptions = particle.type.speedOptions;
    const speedIndex = (stream.waveIndex + particle.meshIndex + slotIndex) % speedOptions.length;
    const speed = speedOptions[speedIndex] * UFO_SPACE_DUST_SPEED_MULTIPLIER * slot.speed;
    particle.active = true;
    particle.spawnAt = stream.elapsed + slot.delay;
    particle.target.copy(target);
    particle.position.copy(start);
    particle.previousPosition.copy(start);
    particle.direction.copy(routeDirection);
    particle.velocity.copy(routeDirection).multiplyScalar(speed);
    particle.routeLength = baseDistance;
    particle.travelled = 0;
    particle.waveIndex = stream.waveIndex;
    particle.directApproach = directApproach;
    particle.integrity = particle.maxIntegrity;
    particle.collisionCooldown = 0;
  });
  return formation;
}

function retireSpaceDustParticle(particle, stream) {
  if (!particle) return;
  particle.active = false;
  particle.spawnAt = Infinity;
  particle.routeLength = 0;
  particle.travelled = 0;
  hideSpaceDustParticle(particle, stream);
}

function findUfoSpaceAimTarget(control, origin, forward, stream) {
  if (!stream?.particles?.length) {
    return { direction: forward.clone(), particle: null };
  }
  let bestParticle = null;
  let bestScore = Infinity;
  stream.particles.forEach(particle => {
    if (!isSpaceDustParticleActive(stream, particle)
      || particle.routeLength <= 0) return;
    const toParticle = particle.position.clone().sub(origin);
    const distance = toParticle.length();
    if (distance < 40 || distance > 7200) return;
    const alignment = toParticle.normalize().dot(forward);
    // 発射方向は常に機体の正面。照準にほぼ重なった敵だけを一瞬だけ
    // 補正し、弾が飛行中に敵を追い続ける自動追尾にはしない。
    if (alignment < UFO_SPACE_COMBAT_SHOT_ASSIST_DOT) return;
    const score = distance * (1.08 - alignment * .08);
    if (score < bestScore) {
      bestScore = score;
      bestParticle = particle;
    }
  });
  return {
    direction: bestParticle
      ? bestParticle.position.clone().sub(origin).normalize()
      : forward.clone(),
    particle: bestParticle,
  };
}

function applyUfoSpaceShotImpulse(particle, stream, shot) {
  if (!particle || !stream || !shot) return false;
  const shotDirection = shot.velocity.clone().normalize();
  const closestPoint = closestPointOnSegment(
    particle.position,
    shot.previousPosition,
    shot.mesh.position,
  );
  const surfaceNormal = particle.position.clone().sub(closestPoint);
  surfaceNormal.addScaledVector(shotDirection, -surfaceNormal.dot(shotDirection));
  if (surfaceNormal.lengthSq() <= 1e-8) {
    const reference = Math.abs(shotDirection.y) < .82
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    surfaceNormal.copy(shotDirection).cross(reference).normalize();
    if (Math.sin(particle.phase * 1.7) < 0) surfaceNormal.multiplyScalar(-1);
  } else {
    surfaceNormal.normalize();
  }

  const impulseDirection = shotDirection
    .clone()
    .addScaledVector(surfaceNormal, UFO_SPACE_SHOT_GLANCING_RATIO)
    .normalize();
  particle.velocity.addScaledVector(
    impulseDirection,
    UFO_SPACE_SHOT_IMPULSE / Math.max(.01, particle.mass),
  );
  particle.spin.addScaledVector(surfaceNormal, 2.2 / Math.max(.5, particle.mass));
  particle.integrity -= 1;
  particle.collisionCooldown = UFO_SPACE_DUST_COLLISION_COOLDOWN;
  refreshSpaceDustVelocityDirection(particle);

  if (particle.integrity <= 0) {
    destroySpaceDustParticle(particle, stream, { playerKill: true });
    return true;
  }

  stream.physicsDeflectionCount += 1;
  state.ufoSpaceDeflectionCount += 1;
  document.body.dataset.ufoSpaceDeflectionCount = String(state.ufoSpaceDeflectionCount);
  spawnUfoSpaceImpact(ufoDoorControls[0], particle.position, particle);
  updateUfoSpaceCombatHud();
  return true;
}

function fireUfoSpaceShot() {
  if (state.map !== "space"
    || !state.ufoInSpace
    || !state.ufoBoarded
    || state.ufoEngineMode !== "ready"
    || !state.ufoSpaceCombatStarted
    || state.ufoSpaceEscapePending) return false;
  const control = ufoDoorControls[0];
  const combat = control?.spaceCombat;
  const craft = control?.craftAssembly;
  if (!combat || !craft || combat.cooldown > 0) return false;
  craft.updateWorldMatrix(true, true);
  const origin = craft.getWorldPosition(new THREE.Vector3());
  const forward = getUfoSpaceForward(control);
  const stream = control.spaceDust?.userData;
  const aim = findUfoSpaceAimTarget(control, origin, forward, stream);
  const direction = aim.direction.clone().normalize();
  const shot = new THREE.Group();
  shot.name = "ufo-space-shot";
  shot.position.copy(origin).addScaledVector(direction, 58);
  const bolt = new THREE.Mesh(combat.shotGeometry, combat.shotMaterial);
  bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const halo = new THREE.Mesh(combat.haloGeometry, combat.haloMaterial);
  shot.add(bolt, halo);
  combat.group.add(shot);
  combat.shots.push({
    mesh: shot,
    previousPosition: shot.position.clone(),
    velocity: direction.multiplyScalar(UFO_SPACE_SHOT_SPEED),
    age: 0,
  });
  combat.cooldown = UFO_SPACE_SHOT_COOLDOWN;
  state.ufoSpaceShotCount += 1;
  document.body.dataset.ufoSpaceShotCount = String(state.ufoSpaceShotCount);
  document.body.dataset.ufoSpaceLastShot = String(Date.now());
  updateUfoSpaceCombatHud();
  return true;
}

function destroySpaceDustParticle(particle, stream, { playerKill = false, hostile = false } = {}) {
  if (!particle || !stream) return;
  const position = particle.position.clone();
  retireSpaceDustParticle(particle, stream);
  particle.mesh.instanceMatrix.needsUpdate = true;
  const control = ufoDoorControls[0];
  const combat = control?.spaceCombat;
  if (combat) combat.hitFlash = hostile ? .16 : .26;
  spawnUfoSpaceImpact(control, position, particle, { hostile });
  if (playerKill) {
    state.ufoSpaceDustDestroyedCount += 1;
    document.body.dataset.ufoSpaceDustDestroyed = String(state.ufoSpaceDustDestroyedCount);
  }
  updateUfoSpaceCombatHud();
}

function updateUfoSpaceCombat(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  if (isUfoSpaceArcadeMissionActive(control)) return;
  const combat = control?.spaceCombat;
  const stream = control?.spaceDust?.userData;
  if (!combat || !stream) {
    updateUfoSpaceCombatHud();
    return;
  }
  combat.cooldown = Math.max(0, combat.cooldown - delta);
  combat.hitFlash = Math.max(0, combat.hitFlash - delta);
  updateUfoSpaceImpacts(combat, delta);
  if (state.ufoSpaceEscapePending
    || state.ufoEngineMode !== "ready"
    || !state.ufoBoarded
    || !state.ufoSpaceCombatStarted) {
    updateUfoSpaceCombatHud();
    return;
  }
  for (let index = combat.shots.length - 1; index >= 0; index -= 1) {
    const shot = combat.shots[index];
    shot.age += delta;
    shot.previousPosition.copy(shot.mesh.position);
    shot.mesh.position.addScaledVector(shot.velocity, delta);
    let hitParticle = null;
    for (const particle of stream.particles) {
      if (!isSpaceDustParticleActive(stream, particle)) continue;
      const hitRadius = particle.dustRadius + UFO_SPACE_SHOT_HIT_RADIUS;
      if (pointToSegmentDistanceSquared(
        particle.position,
        shot.previousPosition,
        shot.mesh.position,
      ) <= hitRadius * hitRadius) {
        hitParticle = particle;
        break;
      }
    }
    if (hitParticle || shot.age >= UFO_SPACE_SHOT_LIFETIME) {
      if (hitParticle) applyUfoSpaceShotImpulse(hitParticle, stream, shot);
      combat.group.remove(shot.mesh);
      combat.shots.splice(index, 1);
    }
  }
  updateUfoSpaceCombatHud();
}

function resetUfoSpaceHazardState() {
  if (ufoSpaceEscapeTimer) {
    window.clearTimeout(ufoSpaceEscapeTimer);
    ufoSpaceEscapeTimer = null;
  }
  state.ufoSpaceLife = UFO_SPACE_LIFE_MAX;
  state.ufoSpaceDustHitCooldown = 0;
  state.ufoSpaceDustHitCount = 0;
  state.ufoSpaceDustDestroyedCount = 0;
  state.ufoSpaceDeflectionCount = 0;
  state.ufoSpaceShotCount = 0;
  state.ufoSpaceCombatStarted = false;
  state.ufoSpaceHazardGrace = UFO_SPACE_HAZARD_GRACE;
  state.ufoSpaceEscapePending = false;
  const combat = ufoDoorControls[0]?.spaceCombat;
  if (combat) combat.strafeVelocity = 0;
  resetSpaceDustEncounter(ufoDoorControls[0]?.spaceDust?.userData);
  if (ufoDoorControls[0]?.spaceDust) ufoDoorControls[0].spaceDust.visible = false;
  resetUfoSpaceRescueMission(ufoDoorControls[0]?.spaceRescue);
  resetUfoStarMiningMission(ufoDoorControls[0]?.spaceStarMining);
  resetUfoGravityPinballMission(ufoDoorControls[0]?.spacePinball);
  resetUfoSalvagePortMission(ufoDoorControls[0]?.spaceSalvage);
  resetUfoPlanetBowlingMission(ufoDoorControls[0]?.spaceBowling);
  resetUfoRingBattleMission(ufoDoorControls[0]?.spaceRingBattle);
  document.body.dataset.ufoSpaceLife = String(UFO_SPACE_LIFE_MAX);
  delete document.body.dataset.ufoSpaceDustHits;
  delete document.body.dataset.ufoSpaceDustDestroyed;
  delete document.body.dataset.ufoSpaceDeflectionCount;
  delete document.body.dataset.ufoSpaceShotCount;
  delete document.body.dataset.ufoSpaceLastShot;
  document.body.dataset.ufoSpaceCombat = "waiting";
  document.body.dataset.ufoSpaceMission = "rescue-idle";
  updateUfoSpaceLifeHud();
  updateUfoSpaceCombatHud();
}

function updateUfoSpaceLifeHud() {
  if (isUfoForwardScrollActive()) {
    updateUfoForwardScrollEnergyHud();
    return;
  }
  if (isUfoSpacePlanetariumFreeFlight()) {
    hideUfoPlanetariumMissionHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceStarMining?.active) {
    updateUfoStarMiningLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceMarsRace?.active) {
    updateUfoMarsRaceLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceSolarSail?.active) {
    updateUfoSolarSailLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceInertiaSlingshot?.active) {
    updateUfoInertiaSlingshotLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceGravityMaze?.active) {
    updateUfoGravityMazeLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceCranePort?.active) {
    updateUfoCranePortLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceRingBattle?.active) {
    updateUfoRingBattleLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceBowling?.active) {
    updateUfoPlanetBowlingLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spacePinball?.active) {
    updateUfoGravityPinballLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceSalvage?.active) {
    updateUfoSalvagePortLifeHud();
    return;
  }
  if (ufoDoorControls[0]?.spaceRescue) {
    updateUfoSpaceRescueLifeHud();
    return;
  }
  const hud = els.ufoSpaceLife;
  if (!hud) return;
  const visible = state.map === "space" && state.ufoInSpace && state.ufoBoarded;
  hud.hidden = !visible;
  const life = clamp(state.ufoSpaceLife, 0, UFO_SPACE_LIFE_MAX);
  if (els.ufoSpaceLifeFill) els.ufoSpaceLifeFill.style.width = `${life}%`;
  if (els.ufoSpaceLifeValue) els.ufoSpaceLifeValue.textContent = `${Math.ceil(life)}`;
  if (els.ufoSpaceLifeNote) {
    const stream = ufoDoorControls[0]?.spaceDust?.userData;
    els.ufoSpaceLifeNote.textContent = state.ufoSpaceEscapePending
      ? "ライフが尽きました。緊急帰還します。"
      : !state.ufoSpaceCombatStarted
        ? "シューティング開始を選ぶまで安全です"
      : state.ufoSpaceHazardGrace > 0
        ? `火星編隊を捕捉中：${state.ufoSpaceHazardGrace.toFixed(1)}秒`
        : stream?.activeCount
          ? `${stream.waveLabel}が接近中。被弾前に迎撃してください`
          : "次の編隊を索敵中です";
  }
  hud.dataset.danger = life <= 30 ? "true" : "false";
  updateUfoSpaceCombatHud();
}

function triggerUfoSpaceEmergencyEscape() {
  if (state.ufoSpaceEscapePending || state.map !== "space") return;
  state.ufoSpaceEscapePending = true;
  keys.clear();
  touchVector.set(0, 0);
  ufoFlightPointerInput.forward = 0;
  ufoFlightPointerInput.turn = 0;
  ufoFlightPointerInput.lift = 0;
  ufoFlightPointerInput.strafe = 0;
  setSpaceTransitionMessage(
    "UFO DAMAGE",
    "緊急帰還",
    "宇宙のチリでUFOのライフが尽きました。雲マップへ帰還します。",
  );
  els.spaceTransitionOverlay?.classList.add("is-active");
  updateUfoSpaceLifeHud();
  ufoSpaceEscapeTimer = window.setTimeout(() => {
    ufoSpaceEscapeTimer = null;
    if (state.map === "space") emergencyEscape();
  }, UFO_SPACE_DUST_ESCAPE_DELAY * 1000);
}

function damageUfoBySpaceDust(particle) {
  if (state.map !== "space"
    || !state.ufoBoarded
    || state.ufoEngineMode !== "ready"
    || state.ufoSpaceEscapePending) return;
  const type = particle?.type || UFO_SPACE_DUST_TYPES[2];
  // 将来の装備はここで type.damage を軽減・無効化するフックを追加できる。
  const damage = type.damage;
  state.ufoSpaceLife = clamp(
    state.ufoSpaceLife - damage,
    0,
    UFO_SPACE_LIFE_MAX,
  );
  state.ufoSpaceDustHitCount += 1;
  state.ufoSpaceDustHitCooldown = UFO_SPACE_DUST_HIT_COOLDOWN;
  document.body.dataset.ufoSpaceLife = String(state.ufoSpaceLife);
  document.body.dataset.ufoSpaceDustHits = String(state.ufoSpaceDustHitCount);
  updateUfoSpaceLifeHud();
  if (state.ufoSpaceLife <= 0) {
    triggerUfoSpaceEmergencyEscape();
  } else {
    showToast(`${type.label}が衝突。ダメージ ${damage} / UFOライフ ${Math.ceil(state.ufoSpaceLife)}`);
  }
}

function updateSpaceDustAnimation(delta) {
  if (state.map !== "space") return;
  const control = ufoDoorControls[0];
  if (isUfoSpaceArcadeMissionActive(control)) return;
  const stream = control?.spaceDust?.userData;
  if (!stream?.meshes || !stream.particles?.length) {
    updateUfoSpaceLifeHud();
    return;
  }
  const combatStarted = state.ufoSpaceCombatStarted;
  if (!combatStarted) {
    stream.activeCount = 0;
    stream.nearestDistance = Infinity;
    updateUfoSpaceLifeHud();
    return;
  }

  const frameDelta = Math.min(delta, .05);
  stream.elapsed += frameDelta;
  state.ufoSpaceHazardGrace = Math.max(0, state.ufoSpaceHazardGrace - frameDelta);
  const craft = control?.craftAssembly;
  const craftCenter = craft?.getWorldPosition(new THREE.Vector3());
  if (!craftCenter) {
    updateUfoSpaceLifeHud();
    return;
  }

  if (!state.ufoSpaceEscapePending && stream.elapsed >= stream.nextWaveAt) {
    spawnSpaceDustWave(stream, craftCenter);
  }

  stream.particles.forEach(particle => {
    if (!particle.active || stream.elapsed < particle.spawnAt) {
      hideSpaceDustParticle(particle, stream);
      return;
    }
    particle.previousPosition.copy(particle.position);
    particle.position.addScaledVector(particle.velocity, frameDelta);
    particle.travelled += particle.velocity.length() * frameDelta;
    if (particle.travelled > particle.routeLength + UFO_SPACE_COMBAT_PASS_CLEARANCE) {
      retireSpaceDustParticle(particle, stream);
      return;
    }
    refreshSpaceDustVelocityDirection(particle);
  });
  // 編隊は単なる重なった表示ではなく、各チリの半径・質量・速度から
  // 接触を解決する。衝撃弾で押し返したチリもここで他のチリに当たる。
  const physicsContacts = resolveSpaceDustParticleCollisions(stream, control, frameDelta);
  let activeCount = 0;
  let nearestDistance = Infinity;
  stream.particles.forEach(particle => {
    if (!isSpaceDustParticleActive(stream, particle)) return;
    activeCount += 1;
    nearestDistance = Math.min(nearestDistance, particle.position.distanceTo(craftCenter));
    writeSpaceDustParticleInstance(particle, stream);
  });
  Object.values(stream.meshes).forEach(mesh => {
    mesh.instanceMatrix.needsUpdate = true;
  });
  stream.activeCount = activeCount;
  stream.nearestDistance = nearestDistance;
  refreshSpaceDustTrails(stream);
  document.body.dataset.ufoSpaceDustActiveCount = String(activeCount);
  document.body.dataset.ufoSpaceDustNearestDistance = Number.isFinite(nearestDistance)
    ? nearestDistance.toFixed(1)
    : "none";
  document.body.dataset.ufoSpaceDustMotion = "inertial-impulse-collisions";
  document.body.dataset.ufoSpaceDustPhysicsContacts = String(stream.physicsCollisionCount);
  document.body.dataset.ufoSpaceDustPhysicsFrameContacts = String(physicsContacts);

  if (state.ufoSpaceEscapePending
    || state.ufoEngineMode !== "ready"
    || !state.ufoBoarded
    || state.ufoSpaceHazardGrace > 0) {
    updateUfoSpaceLifeHud();
    return;
  }

  const craftRadius = stream.craftRadius;
  const hitParticle = stream.particles.find(particle => (
    isSpaceDustParticleActive(stream, particle)
    && pointToSegmentDistanceSquared(
      craftCenter,
      particle.previousPosition,
      particle.position,
    ) <= (craftRadius + particle.dustRadius) ** 2
  ));
  if (hitParticle) {
    damageUfoBySpaceDust(hitParticle);
    destroySpaceDustParticle(hitParticle, stream, { hostile: true });
  }
  updateUfoSpaceLifeHud();
}

function makeSpaceEarth(entryCraftCenter) {
  const group = new THREE.Group();
  group.name = "space-earth";
  group.position.set(
    entryCraftCenter.x,
    entryCraftCenter.y - UFO_SPACE_EARTH_CENTER_DROP,
    entryCraftCenter.z,
  );
  // 真上から北極だけを見る構図を避け、接近中に海・大陸・雲が同時に
  // 読める中緯度側をUFOへ向ける。回転軸は地球全体で共有する。
  group.rotation.z = THREE.MathUtils.degToRad(50);
  group.rotation.x = THREE.MathUtils.degToRad(-7);
  group.userData.nonCollidable = true;
  group.userData.radius = UFO_SPACE_EARTH_RADIUS;

  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(UFO_SPACE_EARTH_RADIUS, 120, 72),
    new THREE.MeshPhysicalMaterial({
      map: makeSpaceEarthTexture(),
      color: 0xe2e9ee,
      roughness: .72,
      metalness: 0,
      clearcoat: .08,
      clearcoatRoughness: .78,
      emissive: 0x020815,
      emissiveIntensity: .08,
    }),
  );
  surface.name = "space-earth-surface";
  surface.rotation.y = THREE.MathUtils.degToRad(104);
  group.add(surface);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(UFO_SPACE_EARTH_RADIUS * 1.011, 96, 60),
    new THREE.MeshStandardMaterial({
      map: makeSpaceEarthCloudTexture(),
      transparent: true,
      opacity: .58,
      alphaTest: .012,
      depthWrite: false,
      roughness: 1,
    }),
  );
  clouds.name = "space-earth-clouds";
  clouds.rotation.y = THREE.MathUtils.degToRad(110);
  group.add(clouds);

  // 発進地点の雲だけは、地球の表面を完全に隠せる純白レイヤーとして
  // 別に重ねる。通常の薄い雲レイヤーの透過率には左右されない。
  const launchClouds = new THREE.Mesh(
    new THREE.SphereGeometry(UFO_SPACE_EARTH_RADIUS * 1.014, 96, 60),
    new THREE.MeshBasicMaterial({
      map: makeSpaceEarthLaunchCloudTexture(),
      transparent: true,
      opacity: 1,
      alphaTest: .002,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  launchClouds.name = "space-earth-launch-clouds";
  launchClouds.rotation.y = THREE.MathUtils.degToRad(110);
  launchClouds.visible = false;
  group.add(launchClouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(UFO_SPACE_EARTH_RADIUS * 1.065, 96, 60),
    new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(0x63cfff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewDirection = normalize(-mvPosition.xyz);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vViewDirection;
        void main() {
          float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDirection))), 2.35);
          gl_FragColor = vec4(glowColor, rim * 0.52);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  atmosphere.name = "space-earth-atmosphere";
  group.add(atmosphere);
  group.userData.surface = surface;
  group.userData.clouds = clouds;
  group.userData.launchClouds = launchClouds;
  return group;
}

function alignSpaceEarthCloudLayerToLaunch(earth, launchNormal) {
  const clouds = earth?.userData?.clouds;
  const launchClouds = earth?.userData?.launchClouds;
  if (!clouds || !launchNormal) return;
  // 通常雲と不透明な発進雲の中央を、実際の離陸地点の真下へ同時に合わせる。
  earth.updateWorldMatrix(true, false);
  const earthOrientation = earth.getWorldQuaternion(new THREE.Quaternion()).invert();
  const localLaunchNormal = launchNormal.clone()
    .applyQuaternion(earthOrientation)
    .normalize();
  clouds.quaternion.setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    localLaunchNormal,
  );
  if (launchClouds) {
    launchClouds.quaternion.copy(clouds.quaternion);
    launchClouds.visible = true;
  }
  clouds.userData.launchCloudAligned = true;
}

function updateSpaceEarthAnimation(delta) {
  if (state.map !== "space") return;
  const earth = ufoDoorControls[0]?.spaceEarth;
  if (!earth) return;
  earth.userData.surface.rotation.y += delta * .012;
  earth.userData.clouds.rotation.y += delta * .019;
  if (earth.userData.launchClouds) {
    earth.userData.launchClouds.rotation.y += delta * .019;
  }
  const mars = ufoDoorControls[0]?.spaceMars;
  if (mars?.userData?.surface) mars.userData.surface.rotation.y += delta * .006;
}

function setSpaceTransitionMessage(label, title, detail) {
  const overlay = els.spaceTransitionOverlay;
  if (!overlay) return;
  const labelElement = overlay.querySelector("span");
  const titleElement = overlay.querySelector("strong");
  const detailElement = overlay.querySelector("small");
  if (labelElement) labelElement.textContent = label;
  if (titleElement) titleElement.textContent = title;
  if (detailElement) detailElement.textContent = detail;
}

function shouldAutoActivateUfoForwardScroll() {
  const params = new URLSearchParams(location.search);
  if (params.get("ufoForwardScrollTest") === "1") return true;
  // Rejected/legacy prototype URLs remain isolated so they can still be
  // inspected during development without silently starting the new route.
  return ![
    "ufoSpaceTransitionTest",
    "ufoSpaceCombatTest",
    "ufoSpaceRescueTest",
    "ufoGravityPinballTest",
    "ufoSalvagePortTest",
    "ufoPlanetBowlingTest",
    "ufoRingBattleTest",
    "ufoCranePortTest",
    "ufoGravityMazeTest",
    "ufoInertiaSlingshotTest",
    "ufoSolarSailTest",
    "ufoMarsRaceTest",
    "ufoStarMiningTest",
    "ufoPlanetariumTest",
    "ufoEarthReturnTest",
  ].some(key => params.has(key));
}

function enterUfoSpaceMap(control, exit, sequence) {
  if (sequence !== ufoSpaceTransitionSequence
    || !state.ufoSpaceTransitioning
    || !isUfoSpaceLaunchMap()
    || !control?.craftAssembly) return;
  const launchMap = state.map;
  const craft = control.craftAssembly;
  craft.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());

  // The flying craft is already anchored directly under mapGroup. Remove the
  // planet terrain and its physical layer while preserving that exact object and
  // its transform; rebuilding the map would recreate the UFO at its pad.
  [...mapGroup.children].forEach(child => {
    if (child !== craft) mapGroup.remove(child);
  });
  if (craft.parent !== mapGroup) mapGroup.attach(craft);
  colliders.length = 0;
  walkableSurfaces.length = 0;
  physicsElements.floors.length = 0;
  physicsElements.risers.length = 0;
  physicsElements.walls.length = 0;
  ufoRampPhysicsIds.length = 0;
  clearThreeGroup(physicsMeshGroup);
  clearThreeGroup(physicsDebugGroup);
  labelsGroup = new THREE.Group();
  labelsGroup.name = "space-labels";
  // 宇宙へ入るたびに新しい航路シードを発行する。星空と回収星はその
  // 出発中だけ同じ位置を保ち、次の出発では別の配置になる。
  const spaceRouteSeed = nextUfoSpaceRouteSeed();
  const spaceEnvironment = makeSpaceEnvironment(craftCenter, spaceRouteSeed);
  mapGroup.add(spaceEnvironment);
  // Anchor Earth to the actual flying craft centre, not Ren's seated point.
  // The readout may use the seat anchor, but the approach detector must share
  // the same origin as the visible UFO or a lateral approach can appear close
  // on screen while being evaluated against a stale offset point.
  const earthEntryAnchor = craftCenter.clone();
  const earth = makeSpaceEarth(earthEntryAnchor);
  // Earth remains an invisible navigation anchor for existing return code,
  // but the planetarium itself presents Mars as its sole visible planet.
  earth.visible = false;
  earth.userData.planetariumHidden = true;
  mapGroup.add(earth);
  // Place Mars on the straight-ahead X/Z ray from the actual space entry point,
  // stopping just inside the expanded map edge, then raise it by the authored
  // space height offset. Its position is calculated from the UFO nose
  // direction, not from a fixed screen direction.
  const mars = makeSpaceMars(craftCenter, craft);
  mapGroup.add(mars);
  earth.updateWorldMatrix(true, true);
  mars.updateWorldMatrix(true, true);
  const spaceDust = makeSpaceDustStream(earth, mars, control);
  mapGroup.add(spaceDust);
  const spaceCombat = makeUfoSpaceCombat(control);
  mapGroup.add(spaceCombat.group);
  const spaceRescue = makeUfoSpaceRescueMission(control);
  mapGroup.add(spaceRescue.group);
  const spacePinball = makeUfoGravityPinballMission(control);
  mapGroup.add(spacePinball.group);
  const spaceSalvage = makeUfoSalvagePortMission(control);
  mapGroup.add(spaceSalvage.group);
  const spaceBowling = makeUfoPlanetBowlingMission(control);
  mapGroup.add(spaceBowling.group);
  const spaceRingBattle = makeUfoRingBattleMission(control);
  mapGroup.add(spaceRingBattle.group);
  const spaceCranePort = makeUfoCranePortMission(control);
  mapGroup.add(spaceCranePort.group);
  const spaceGravityMaze = makeUfoGravityMazeMission(control);
  mapGroup.add(spaceGravityMaze.group);
  const spaceInertiaSlingshot = makeUfoInertiaSlingshotMission(control);
  mapGroup.add(spaceInertiaSlingshot.group);
  const spaceSolarSail = makeUfoSolarSailMission(control);
  mapGroup.add(spaceSolarSail.group);
  const spaceMarsRace = makeUfoMarsRaceMission(control);
  mapGroup.add(spaceMarsRace.group);
  const spaceStarMining = makeUfoStarMiningMission(control, craftCenter, craft);
  mapGroup.add(spaceStarMining.group);
  const spaceForwardScroll = makeUfoForwardScrollMission(
    control,
    craftCenter,
    craft,
    mars,
    spaceEnvironment.userData.starfield,
    spaceRouteSeed,
  );
  mapGroup.add(spaceForwardScroll.group);
  mapGroup.add(labelsGroup);
  control.buildingGroup = null;
  control.spaceEarth = earth;
  control.spaceMars = mars;
  control.spaceDust = spaceDust;
  control.spaceCombat = spaceCombat;
  control.spaceRescue = spaceRescue;
  control.spacePinball = spacePinball;
  control.spaceSalvage = spaceSalvage;
  control.spaceBowling = spaceBowling;
  control.spaceRingBattle = spaceRingBattle;
  control.spaceCranePort = spaceCranePort;
  control.spaceGravityMaze = spaceGravityMaze;
  control.spaceInertiaSlingshot = spaceInertiaSlingshot;
  control.spaceSolarSail = spaceSolarSail;
  control.spaceMarsRace = spaceMarsRace;
  control.spaceStarMining = spaceStarMining;
  control.spaceForwardScroll = spaceForwardScroll;
  control.spaceExplorableStarfield = spaceEnvironment.userData.starfield;
  control.spaceRouteSeed = spaceRouteSeed;
  control.spaceLaunchMap = launchMap;
  earth.updateWorldMatrix(true, true);
  control.spaceEarthWorldCenter = earth.getWorldPosition(new THREE.Vector3());
  control.spaceEarthEntryCraftY = craftCenter.y;

  state.map = "space";
  state.ufoInSpace = true;
  resetUfoSpaceHazardState();
  state.ufoSpaceTransitioning = false;
  state.ufoSpaceExitSide = exit.side;
  state.ufoSpaceEntryFlightY = state.ufoFlightY;
  state.selectedBuildId = null;
  previewGroup = null;
  applySpacePlanetariumBackground();
  const spaceView = ufoSpaceViewMetrics();
  // 星は遠方でも実体として見え続ける。大気のような距離霧は使わない。
  scene.fog = null;
  camera.far = spaceView.cameraFar;
  camera.updateProjectionMatrix();
  document.body.dataset.ufoWorldMap = "space";
  document.body.dataset.ufoSpaceTransition = "complete";
  document.body.dataset.ufoSpaceOrigin = launchMap;
  document.body.dataset.ufoSpaceExitSide = exit.side;
  document.body.dataset.ufoSpaceMars = "ready";
  document.body.dataset.ufoSpaceMarsRadius = String(UFO_SPACE_MARS_RADIUS);
  document.body.dataset.ufoSpaceMarsEdgeDistance = mars.userData.edgeDistance.toFixed(1);
  document.body.dataset.ufoSpaceMarsHeightOffset = String(UFO_SPACE_MARS_HEIGHT_OFFSET);
  document.body.dataset.ufoSpaceDustCount = String(
    Object.values(UFO_SPACE_DUST_COUNTS).reduce((sum, count) => sum + count, 0),
  );
  document.body.dataset.ufoSpaceDustSizeMultiplier = String(UFO_SPACE_DUST_SIZE_MULTIPLIER);
  document.body.dataset.ufoSpaceDustSpeedMultiplier = String(UFO_SPACE_DUST_SPEED_MULTIPLIER);
  document.body.dataset.ufoSpaceDustHoming = "disabled";
  document.body.dataset.ufoSpaceDustMotion = spaceDust.userData.motionMode;
  document.body.dataset.ufoSpacePhysicsMode = "inertia-impulse-collisions";
  document.body.dataset.ufoSpaceCombatMode = "planetarium-free-flight";
  document.body.dataset.ufoSpaceStarfieldMode = "continuous-physical-starfield";
  document.body.dataset.ufoSpaceRouteSeed = String(spaceRouteSeed);
  document.body.dataset.ufoSpaceExplorableStarCount = String(
    control.spaceExplorableStarfield.stars.length,
  );
  document.body.dataset.ufoSpaceShooting = "disabled";
  // The default is deliberately quiet free flight. Experimental game modes
  // remain opt-in development routes and never place colored mining objects
  // or a task HUD into the normal planetarium scene.
  if (new URLSearchParams(location.search).get("ufoSpaceTransitionTest") === "1") {
    document.body.dataset.ufoSpaceTransitionTest = "pass";
  }
  const earthReturnTest = new URLSearchParams(location.search).get("ufoEarthReturnTest");
  if (earthReturnTest === "auto") {
    document.body.dataset.ufoEarthReturnTest = "descending";
    window.setTimeout(() => keys.add("s"), 300);
    window.setTimeout(() => keys.delete("s"), 13000);
  } else if (earthReturnTest === "lateral") {
    document.body.dataset.ufoEarthReturnTest = "lateral-approach";
    // Diagnostic only: use the same flight inputs as a player. Move away
    // from the entry meridian, descend to Earth's surface band, then return
    // horizontally so the lateral route is exercised without teleporting.
    window.setTimeout(() => keys.add("d"), 300);
    window.setTimeout(() => keys.delete("d"), 7600);
    window.setTimeout(() => keys.add("s"), 7800);
    window.setTimeout(() => keys.delete("s"), 19800);
    window.setTimeout(() => keys.add("a"), 20000);
    window.setTimeout(() => keys.delete("a"), 22400);
  }
  els.spaceTransitionOverlay?.classList.remove("is-active");
  // 火星側からの出発は帰還航行。地球→火星用の自動スクロール任務を
  // 勝手に再開せず、通常の自由飛行と地球接近判定を使う。
  if (launchMap !== "mars" && shouldAutoActivateUfoForwardScroll()) {
    activateUfoForwardScrollMission(control, {
      testMode: new URLSearchParams(location.search).get("ufoForwardScrollTest") === "1",
      silent: true,
    });
  }
  updateBuildList();
  updateMapReadout();
  updateUfoControls();
  if (!isUfoForwardScrollActive(control)) {
    showToast(`${launchMap === "mars" ? "火星" : "空"}の外周を越え、宇宙マップへ移動しました`);
  }
}

function beginUfoSpaceTransition(control, exit) {
  if (!control?.craftAssembly || !exit || state.ufoSpaceTransitioning || !isUfoSpaceLaunchMap()) return false;
  const launchMap = state.map;
  state.ufoSpaceTransitioning = true;
  state.ufoSpaceExitSide = exit.side;
  keys.clear();
  touchVector.set(0, 0);
  ufoFlightPointerInput.forward = 0;
  ufoFlightPointerInput.turn = 0;
  ufoFlightPointerInput.lift = 0;
  ufoFlightPointerInput.strafe = 0;
  resetUfoFlightHoldAcceleration();
  if (control.flight) {
    control.flight.forwardInput = 0;
    control.flight.turnInput = 0;
    control.flight.liftInput = 0;
    control.flight.strafeInput = 0;
  }
  document.body.dataset.ufoSpaceTransition = "starting";
  document.body.dataset.ufoSpaceExitSide = exit.side;
  setSpaceTransitionMessage(
    launchMap === "mars" ? "MARS LIMIT PASSED" : "SKY LIMIT PASSED",
    "宇宙マップへ移動",
    launchMap === "mars"
      ? "火星の外周を越えました。UFOの航行状態を維持したまま宇宙へ接続します。"
      : "空の外周を越えました。UFOの航行状態を維持したまま宇宙へ接続します。",
  );
  els.spaceTransitionOverlay?.classList.add("is-active");
  const sequence = ++ufoSpaceTransitionSequence;
  window.setTimeout(
    () => enterUfoSpaceMap(control, exit, sequence),
    UFO_SPACE_TRANSITION_DURATION_MS,
  );
  return true;
}

function ufoEarthApproachAt(control) {
  if (state.map !== "space" || !control?.spaceEarthWorldCenter) return null;
  const craftCenter = control.craftAssembly.getWorldPosition(new THREE.Vector3());
  const offset = craftCenter.clone().sub(control.spaceEarthWorldCenter);
  const distance = offset.length();
  const horizontalDistance = Math.hypot(offset.x, offset.z);
  const verticalDistance = Math.abs(offset.y);
  const scale = control.scale || BUILDING_SCALE;
  const craftHorizontalRadius = (control.flightCollision?.radiusLocal
    ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale + UFO_FLIGHT_COLLISION_SKIN;
  const craftBottomOffset = Math.max(
    0,
    (control.flightCollision?.minYLocal ?? UFO_FLIGHT_COLLISION_MIN_Y_LOCAL) * scale,
  );
  const craftTopOffset = Math.max(
    craftBottomOffset,
    (control.flightCollision?.maxYLocal ?? UFO_FLIGHT_COLLISION_MAX_Y_LOCAL) * scale,
  );
  // 地球の上側からは底面、下側からは上面、斜めからは外周を接触面
  // として使う。さらに地球の表面付近ではXZ距離も独立して判定する。
  // これがないと、同じ高度で横から接近した時に3D距離だけが大きく
  // 残り、下降入力を入れない限り帰還できない。
  const horizontalWeight = distance > 1e-6 ? Math.hypot(offset.x, offset.z) / distance : 0;
  const verticalWeight = distance > 1e-6 ? Math.abs(offset.y) / distance : 0;
  const verticalContactOffset = offset.y >= 0 ? craftBottomOffset : craftTopOffset;
  const directionalCraftClearance = Math.hypot(
    craftHorizontalRadius * horizontalWeight,
    verticalContactOffset * verticalWeight,
  );
  const triggerDistance = UFO_SPACE_EARTH_RADIUS
    + directionalCraftClearance
    + UFO_SPACE_EARTH_RETURN_CLEARANCE;
  const radialContact = distance > 1e-6 && distance <= triggerDistance;
  const lateralTriggerDistance = UFO_SPACE_EARTH_RADIUS
    + craftHorizontalRadius
    + UFO_SPACE_EARTH_RETURN_CLEARANCE;
  const lateralVerticalBand = UFO_SPACE_EARTH_RADIUS
    + Math.max(craftBottomOffset, craftTopOffset)
    + UFO_SPACE_EARTH_RETURN_CLEARANCE;
  const lateralContact = verticalDistance <= lateralVerticalBand
    && horizontalDistance <= lateralTriggerDistance;
  if (!radialContact && !lateralContact) return null;
  const approachMode = radialContact ? "surface" : "lateral";
  const surfaceGap = radialContact
    ? distance - UFO_SPACE_EARTH_RADIUS - directionalCraftClearance
    : horizontalDistance - UFO_SPACE_EARTH_RADIUS - craftHorizontalRadius;
  return {
    mode: approachMode,
    distance,
    horizontalDistance,
    verticalDistance,
    triggerDistance: radialContact ? triggerDistance : lateralTriggerDistance,
    surfaceGap,
    directionalCraftClearance,
    craftCenter,
  };
}

function returnUfoToSkyMap(sequence) {
  if (sequence !== ufoSpaceTransitionSequence
    || !state.ufoSpaceTransitioning
    || state.map !== "space") return;
  const preservedHeading = state.ufoFlightHeading;
  keys.clear();
  state.map = "sky";
  state.ufoInSpace = false;
  resetUfoSpaceHazardState();
  state.ufoSpaceTransitioning = false;
  state.ufoSpaceExitSide = null;
  state.ufoSpaceEntryFlightY = null;
  state.ufoFlightX = 0;
  state.ufoFlightY = UFO_SKY_RETURN_FLIGHT_Y;
  state.ufoFlightZ = 0;
  state.ufoFlightHeading = preservedHeading;
  state.ufoFlightBasePitch = 0;
  state.ufoFlightBaseRoll = 0;
  state.ufoFlightPitch = 0;
  state.ufoFlightRoll = 0;
  state.ufoFlightDirectionalYaw = 0;
  state.ufoFlightRockBlend = 0;
  state.ufoFlightWarningRockBlend = 0;
  state.ufoDoorOpen = false;
  state.ufoFaceAuth = false;
  state.ufoFaceAuthLatched = false;
  state.ufoBoarded = true;
  state.ufoEngineMode = "ready";
  state.ufoEngineRunning = true;
  state.ufoCabinLightAmount = 1;
  scene.background = color(MAPS.sky.palette.fog);
  scene.fog = new THREE.Fog(MAPS.sky.palette.fog, 360, 780);
  camera.far = 6000;
  camera.updateProjectionMatrix();
  rebuildMap();
  const control = ufoDoorControls[0];
  if (!control?.craftAssembly) {
    emergencyEscape();
    return;
  }
  control.amount = 0;
  control.target = 0;
  setUfoCabinLightAmount(control, 1);
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  const seatAnchor = ufoSeatWorldAnchor(control);
  state.position.set(seatAnchor.x, 0, seatAnchor.z);
  state.groundY = seatAnchor.y;
  state.heading = control.seatHeadingLocal + control.rotation + state.ufoFlightHeading;
  state.viewHeading = state.heading;
  document.body.dataset.ufoWorldMap = "sky";
  document.body.dataset.ufoSpaceTransition = "earth-return-complete";
  delete document.body.dataset.ufoSpaceExitSide;
  delete document.body.dataset.ufoSpaceMars;
  delete document.body.dataset.ufoSpaceMarsRadius;
  delete document.body.dataset.ufoSpaceMarsEdgeDistance;
  delete document.body.dataset.ufoEarthApproach;
  delete document.body.dataset.ufoEarthHorizontalDistance;
  delete document.body.dataset.ufoEarthVerticalDistance;
  delete document.body.dataset.ufoEarthReveal;
  if (["auto", "lateral"].includes(new URLSearchParams(location.search).get("ufoEarthReturnTest"))) {
    document.body.dataset.ufoEarthReturnTest = "pass";
  }
  els.spaceTransitionOverlay?.classList.remove("is-active");
  updateCharacter(0);
  updateCamera();
  updateUfoControls();
  showToast("地球への接近を検知し、空マップ上空へ帰還しました");
}

function beginUfoSkyReturn(control, approach) {
  if (!control?.craftAssembly
    || !approach
    || state.ufoSpaceTransitioning
    || state.map !== "space") return false;
  state.ufoSpaceTransitioning = true;
  keys.clear();
  touchVector.set(0, 0);
  ufoFlightPointerInput.forward = 0;
  ufoFlightPointerInput.turn = 0;
  ufoFlightPointerInput.lift = 0;
  ufoFlightPointerInput.strafe = 0;
  resetUfoFlightHoldAcceleration();
  document.body.dataset.ufoSpaceTransition = "earth-approach";
  document.body.dataset.ufoEarthApproach = approach.mode || "surface";
  document.body.dataset.ufoEarthDistance = approach.distance.toFixed(1);
  document.body.dataset.ufoEarthHorizontalDistance = approach.horizontalDistance.toFixed(1);
  document.body.dataset.ufoEarthVerticalDistance = approach.verticalDistance.toFixed(1);
  setSpaceTransitionMessage(
    "EARTH APPROACH",
    "空マップへ帰還",
    "地球への接近を検知しました。安全高度を確保し、空マップ上空へ自動帰還します。",
  );
  els.spaceTransitionOverlay?.classList.add("is-active");
  const sequence = ++ufoSpaceTransitionSequence;
  window.setTimeout(() => returnUfoToSkyMap(sequence), UFO_SPACE_TRANSITION_DURATION_MS);
  return true;
}

function enforceUfoTurbineAttachment(control) {
  const bottom = control?.ufoBottom;
  const rotor = control?.jet?.rotor;
  if (!bottom || !rotor) return;
  const expectedLocalY = Number.isFinite(control.jet.rotorLocalY)
    ? control.jet.rotorLocalY
    : rotor.position.y;
  if (rotor.parent !== bottom) bottom.add(rotor);
  // No animation is allowed to alter the attachment point itself. Rotation is
  // applied around this fixed local origin only.
  rotor.position.set(0, expectedLocalY, 0);
  rotor.scale.set(1, 1, 1);
  bottom.updateWorldMatrix(true, true);
  const expectedWorld = bottom.localToWorld(new THREE.Vector3(0, expectedLocalY, 0));
  const actualWorld = rotor.getWorldPosition(new THREE.Vector3());
  const attachmentError = actualWorld.distanceTo(expectedWorld);
  document.body.dataset.ufoTurbineParent = rotor.parent?.name || "missing";
  document.body.dataset.ufoTurbineAttachmentError = attachmentError.toFixed(5);
  document.body.dataset.ufoCraftWorldY = control.craftAssembly
    ?.getWorldPosition(new THREE.Vector3()).y.toFixed(3) || "missing";
  document.body.dataset.ufoTurbineWorldY = actualWorld.y.toFixed(3);
  // Runtime proof that no rotor-like visual remains under the landing-pad
  // hierarchy. This is intentionally derived from the live Three.js tree,
  // rather than from source assumptions, so browser testing can catch a
  // future accidental reparent immediately.
  const padRotorParts = [];
  control.buildingGroup?.traverse(object => {
    if (/rotor|turbine|propeller/i.test(object.name || "")) {
      padRotorParts.push(object.name);
    }
  });
  const craftRotorParts = [];
  control.craftAssembly?.traverse(object => {
    if (/rotor|turbine|propeller/i.test(object.name || "")) {
      craftRotorParts.push(object.name);
    }
  });
  document.body.dataset.ufoPadRotorParts = padRotorParts.join(",") || "none";
  document.body.dataset.ufoCraftRotorParts = craftRotorParts.join(",") || "none";
}

function runUfoLiftAttachmentSelfTest(control) {
  const pad = control?.buildingGroup;
  const craft = control?.craftAssembly;
  const rotor = control?.jet?.rotor;
  if (!pad || !craft || !rotor) {
    document.body.dataset.ufoLiftSelfTest = "missing-object";
    return;
  }
  const originalFlightY = state.ufoFlightY;
  const testLift = 4;
  const worldY = object => object.getWorldPosition(new THREE.Vector3()).y;
  pad.updateWorldMatrix(true, true);
  craft.updateWorldMatrix(true, true);
  const before = {
    pad: worldY(pad),
    craft: worldY(craft),
    rotor: worldY(rotor),
    rotorOffset: worldY(rotor) - worldY(craft),
  };
  try {
    state.ufoFlightY = originalFlightY + testLift;
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
    pad.updateWorldMatrix(true, true);
    craft.updateWorldMatrix(true, true);
    const after = {
      pad: worldY(pad),
      craft: worldY(craft),
      rotor: worldY(rotor),
      rotorOffset: worldY(rotor) - worldY(craft),
    };
    const expectedRise = testLift * (control.scale || BUILDING_SCALE);
    const padRise = after.pad - before.pad;
    const craftRise = after.craft - before.craft;
    const rotorRise = after.rotor - before.rotor;
    const offsetDrift = after.rotorOffset - before.rotorOffset;
    const passed = Math.abs(padRise) < .0001
      && Math.abs(craftRise - expectedRise) < .0001
      && Math.abs(rotorRise - expectedRise) < .0001
      && Math.abs(offsetDrift) < .0001;
    document.body.dataset.ufoLiftSelfTest = passed ? "pass" : "fail";
    document.body.dataset.ufoLiftPadRise = padRise.toFixed(4);
    document.body.dataset.ufoLiftCraftRise = craftRise.toFixed(4);
    document.body.dataset.ufoLiftRotorRise = rotorRise.toFixed(4);
    document.body.dataset.ufoLiftRotorOffsetDrift = offsetDrift.toFixed(4);
  } finally {
    state.ufoFlightY = originalFlightY;
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
  }
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
      const control = group.userData.ufoDoorControls;
      control.buildingId = item.id;
      control.originX = item.position[0];
      control.originY = item.position[1] || 0;
      control.originZ = item.position[2];
      control.rotation = group.rotation.y;
      control.scale = BUILDING_SCALE;
      control.buildingGroup = group;
      control.seatAnchorLocal = new THREE.Vector3(
        (UFO_ENGINE_SEAT_WORLD.x - item.position[0]) / BUILDING_SCALE,
        (UFO_ENGINE_SEAT_WORLD.groundY - (item.position[1] || 0)) / BUILDING_SCALE,
        (UFO_ENGINE_SEAT_WORLD.z - item.position[2]) / BUILDING_SCALE,
      );
      control.seatHeadingLocal = Number.isFinite(
        control.seatHeadingLocal,
      )
        ? control.seatHeadingLocal
        : UFO_ENGINE_SEAT_WORLD.heading - group.rotation.y;
      // Build collision data while the visual craft still has the exact
      // original pad transform. Once extracted, the visual craft is detached
      // and becomes a map-root flying object of its own.
      control.craftAssembly.position.set(
        state.ufoFlightX,
        state.ufoFlightY,
        state.ufoFlightZ,
      );
      control.craftAssembly.rotation.y = state.ufoFlightHeading;
      setUfoCabinLightAmount(control, state.ufoCabinLightAmount);
      addUfoStructuralColliders(control, item.id);

      // The landing pad and the UFO are now separate scene objects. The pad
      // remains under `group`; the full craft, including its bottom-mounted
      // turbine, is promoted to the map root and receives an explicit world
      // transform on every flight frame.
      group.remove(control.craftAssembly);
      control.craftAssembly.scale.setScalar(BUILDING_SCALE);
      control.craftAssembly.userData.worldAnchoredCraft = true;
      control.craftWorldAnchored = true;
      control.craftSceneParent = parent;
      parent.add(control.craftAssembly);
      applyUfoCraftWorldTransform(control);
      enforceUfoTurbineAttachment(control);

      const faceAuth = control.faceAuth;
      // The scanner is a map object, not a part of the UFO hull. Detach it
      // before the UFO group is added so its world position cannot be pulled
      // into the craft by the hull's local transform.
      group.remove(faceAuth.assembly);
      faceAuth.assembly.scale.setScalar(BUILDING_SCALE);
      faceAuth.worldAnchored = true;
      parent.add(faceAuth.assembly);
      placeUfoFaceAuthAtWorldPosition(
        control,
        item.faceAuthPosition,
      );
      addFaceAuthPhysicsColliders(faceAuth, item.id);
      ufoDoorControls.push(control);
      runUfoLiftAttachmentSelfTest(control);
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

function ensureMarsReturnUfoPad() {
  if (state.map !== "mars") return false;
  const items = Array.isArray(builtByMap.mars) ? builtByMap.mars : [];
  if (items.some(item => item?.catalogId === "ufo-pad")) return false;
  // 火星のUFO乗り場と顔認証システムは、空マップと同じ世界座標を
  // そのまま使用する常設設備。ユーザー配置物ではないため、初期化後も
  // 次の再構築で必ず戻る。
  builtByMap.mars = [
    ...items,
    {
      id: "mars-return-ufo-pad",
      catalogId: "ufo-pad",
      name: "UFO乗り場",
      fixed: true,
      position: [UFO_PLACEMENT_POSITION.x, 0, UFO_PLACEMENT_POSITION.z],
      faceAuthPosition: [
        UFO_FACE_AUTH_FIXED_WORLD_ANCHOR.x,
        UFO_FACE_AUTH_FIXED_WORLD_ANCHOR.z,
      ],
      faceAuthAnchorLocked: true,
    },
  ];
  return true;
}

function currentUfoPadItem() {
  return buildItemsForMap().find(item => item.catalogId === "ufo-pad") || null;
}

function updateUfoDoorAnimation(delta) {
  ufoDoorControls.forEach(control => {
    const response = state.ufoEngineMode === "closing" ? UFO_ENGINE_DOOR_CLOSE_RESPONSE : 8;
    control.amount += (control.target - control.amount) * Math.min(1, delta * response);
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

function setUfoCabinLightAmount(control, amount) {
  const cabin = control?.cabinLights;
  if (!cabin) return;
  const nextAmount = clamp(amount, 0, 1);
  cabin.amount = nextAmount;
  cabin.material.emissive.setHex(nextAmount > .02 ? 0xffa13f : 0x8cecff);
  cabin.material.emissiveIntensity = .08 + nextAmount * 24;
  cabin.material.color.setHex(nextAmount > .02 ? 0xffffea : 0xc7d9e0);
  cabin.material.opacity = nextAmount > .02 ? .76 : .42;
  cabin.material.needsUpdate = true;
  const lightIntensity = [260, 220, 180];
  cabin.lights.forEach((light, index) => {
    light.intensity = nextAmount * (lightIntensity[index] || 10);
  });
  // The glass itself receives a restrained warm emission so the whole dome
  // reads as one illuminated cabin from outside, while retaining transparency.
  cabin.glassMaterial.color.setHex(nextAmount > .02 ? 0xffe7bd : 0x88e8f4);
  cabin.glassMaterial.emissive.setHex(nextAmount > .02 ? 0xffbd68 : 0x164c62);
  cabin.glassMaterial.emissiveIntensity = .24 + nextAmount * 3.4;
  // Keep the warm lamp readable without turning the whole capsule into an
  // opaque yellow shell. The character and cockpit controls remain visible
  // through the illuminated dome.
  cabin.glassMaterial.opacity = nextAmount > .02 ? .34 : .68;
  cabin.glassMaterial.transmission = nextAmount > .02 ? .58 : .18;
  cabin.glassMaterial.needsUpdate = true;
  if (cabin.glowMaterial) {
    cabin.glowMaterial.opacity = nextAmount * .3;
    cabin.glowMaterial.needsUpdate = true;
  }
}

function resetUfoEngineRuntime({ resetCraft = true } = {}) {
  cancelUfoForwardScrollEnergyEmergencyReturn();
  ufoSpaceTransitionSequence += 1;
  state.ufoSpaceTransitioning = false;
  state.ufoInSpace = false;
  state.ufoSpaceCombatStarted = false;
  state.ufoSpaceExitSide = null;
  state.ufoSpaceEntryFlightY = null;
  els.spaceTransitionOverlay?.classList.remove("is-active");
  delete document.body.dataset.ufoSpaceTransition;
  delete document.body.dataset.ufoSpaceExitSide;
  delete document.body.dataset.ufoEarthDistance;
  delete document.body.dataset.ufoEarthApproach;
  delete document.body.dataset.ufoEarthHorizontalDistance;
  delete document.body.dataset.ufoEarthVerticalDistance;
  delete document.body.dataset.ufoEarthReveal;
  delete document.body.dataset.ufoSpaceMarsHeightOffset;
  delete document.body.dataset.ufoSpaceDustCount;
  delete document.body.dataset.ufoSpaceDustSizeMultiplier;
  delete document.body.dataset.ufoSpaceDustSpeedMultiplier;
  delete document.body.dataset.ufoSpaceDustHoming;
  delete document.body.dataset.ufoSpaceDustHomingRange;
  delete document.body.dataset.ufoSpaceDustMotion;
  delete document.body.dataset.ufoSpacePhysicsMode;
  delete document.body.dataset.ufoSpaceDustPhysicsContacts;
  delete document.body.dataset.ufoSpaceDustPhysicsFrameContacts;
  delete document.body.dataset.ufoSpaceDustDirectAimRatio;
  delete document.body.dataset.ufoSpaceCombatMode;
  delete document.body.dataset.ufoSpaceCombat;
  delete document.body.dataset.ufoSpaceDustHomingActiveCount;
  delete document.body.dataset.ufoSpaceDustNearestDistance;
  delete document.body.dataset.ufoSpaceShooting;
  delete document.body.dataset.ufoSpaceDustDestroyed;
  delete document.body.dataset.ufoSpaceDeflectionCount;
  delete document.body.dataset.ufoSpaceShotCount;
  delete document.body.dataset.ufoSpaceDustActiveCount;
  delete document.body.dataset.ufoSpaceDustDensity;
  delete document.body.dataset.ufoSpaceDustDistanceRatio;
  delete document.body.dataset.ufoGravityPinball;
  delete document.body.dataset.ufoGravityPinballPhase;
  delete document.body.dataset.ufoGravityPinballScore;
  delete document.body.dataset.ufoGravityPinballOre;
  delete document.body.dataset.ufoGravityPinballTest;
  delete document.body.dataset.ufoSalvagePort;
  delete document.body.dataset.ufoSalvagePortPhase;
  delete document.body.dataset.ufoSalvagePortCollected;
  delete document.body.dataset.ufoSalvagePortChain;
  delete document.body.dataset.ufoSalvagePortRemaining;
  delete document.body.dataset.ufoSalvagePortAction;
  delete document.body.dataset.ufoSalvagePortTest;
  delete document.body.dataset.ufoPlanetBowling;
  delete document.body.dataset.ufoPlanetBowlingPhase;
  delete document.body.dataset.ufoPlanetBowlingDemolished;
  delete document.body.dataset.ufoPlanetBowlingChain;
  delete document.body.dataset.ufoPlanetBowlingShots;
  delete document.body.dataset.ufoPlanetBowlingAction;
  delete document.body.dataset.ufoPlanetBowlingTest;
  delete document.body.dataset.ufoRingBattle;
  delete document.body.dataset.ufoRingBattlePhase;
  delete document.body.dataset.ufoRingBattleScore;
  delete document.body.dataset.ufoRingBattleCombo;
  delete document.body.dataset.ufoRingBattleRams;
  delete document.body.dataset.ufoRingBattleAction;
  delete document.body.dataset.ufoRingBattleTest;
  delete document.body.dataset.ufoCranePort;
  delete document.body.dataset.ufoCranePortPhase;
  delete document.body.dataset.ufoCranePortBuilt;
  delete document.body.dataset.ufoCranePortStable;
  delete document.body.dataset.ufoCranePortHooks;
  delete document.body.dataset.ufoCranePortAction;
  delete document.body.dataset.ufoCranePortTest;
  delete document.body.dataset.ufoGravityMaze;
  delete document.body.dataset.ufoGravityMazePhase;
  delete document.body.dataset.ufoGravityMazeCheckpoints;
  delete document.body.dataset.ufoGravityMazeTilt;
  delete document.body.dataset.ufoGravityMazePulses;
  delete document.body.dataset.ufoGravityMazeAction;
  delete document.body.dataset.ufoGravityMazeTest;
  delete document.body.dataset.ufoInertiaSlingshot;
  delete document.body.dataset.ufoInertiaSlingshotPhase;
  delete document.body.dataset.ufoInertiaSlingshotDistance;
  delete document.body.dataset.ufoInertiaSlingshotTension;
  delete document.body.dataset.ufoInertiaSlingshotReleases;
  delete document.body.dataset.ufoInertiaSlingshotAction;
  delete document.body.dataset.ufoInertiaSlingshotTest;
  delete document.body.dataset.ufoSolarSail;
  delete document.body.dataset.ufoSolarSailPhase;
  delete document.body.dataset.ufoSolarSailCharge;
  delete document.body.dataset.ufoSolarSailPressure;
  delete document.body.dataset.ufoSolarSailRides;
  delete document.body.dataset.ufoSolarSailAction;
  delete document.body.dataset.ufoSolarSailTest;
  delete document.body.dataset.ufoMarsRace;
  delete document.body.dataset.ufoMarsRacePhase;
  delete document.body.dataset.ufoMarsRaceSpeed;
  delete document.body.dataset.ufoMarsRaceGates;
  delete document.body.dataset.ufoMarsRaceIntegrity;
  delete document.body.dataset.ufoMarsRaceCombo;
  delete document.body.dataset.ufoMarsRaceTest;
  document.body.dataset.ufoWorldMap = state.map;
  stopUfoEngineStartAudio();
  stopUfoEngineSwitchAudio();
  stopUfoGroundTakeoffAudio();
  stopUfoFlightLoopAudio();
  stopUfoMechEquipAudio();
  state.ufoBoarded = false;
  state.ufoEngineMode = "idle";
  state.ufoEngineTimer = 0;
  state.ufoEngineRunning = false;
  state.ufoEngineSwitchAudioComplete = true;
  state.ufoCabinLightAmount = 0;
  state.ufoFlightBlocked = false;
  state.ufoFlightBasePitch = 0;
  state.ufoFlightBaseRoll = 0;
  state.ufoFlightPitch = 0;
  state.ufoFlightRoll = 0;
  state.ufoFlightDirectionalYaw = 0;
  state.ufoFlightRockPhase = 0;
  state.ufoFlightRockBlend = 0;
  state.ufoFlightWarningRockBlend = 0;
  state.ufoFlightRockAxisForward = 0;
  state.ufoFlightRockAxisStrafe = 0;
  delete document.body.dataset.ufoFlightCollision;
  document.body.dataset.ufoFlightTiltDirection = "level";
  document.body.dataset.ufoFlightPitch = "0.0000";
  document.body.dataset.ufoFlightRoll = "0.0000";
  document.body.dataset.ufoFlightDirectionalYaw = "0.0000";
  document.body.dataset.ufoFlightRockAxis = "none";
  document.body.dataset.ufoFlightRockPitch = "0.0000";
  document.body.dataset.ufoFlightRockRoll = "0.0000";
  resetUfoFlightHoldAcceleration();
  ufoFlightPointerInput.forward = 0;
  ufoFlightPointerInput.turn = 0;
  ufoFlightPointerInput.lift = 0;
  ufoFlightPointerInput.strafe = 0;
  touchVector.set(0, 0);
  ufoFlightPadPointerId = null;
  if (els.ufoFlightStick) els.ufoFlightStick.style.transform = "translate(-50%, -50%)";
  if (resetCraft) {
    state.ufoFlightX = 0;
    state.ufoFlightY = 0;
    state.ufoFlightZ = 0;
    state.ufoFlightHeading = 0;
  }
  ufoDoorControls.forEach(control => {
    if (resetCraft && control.craftAssembly) {
      applyUfoCraftWorldTransform(control);
      enforceUfoTurbineAttachment(control);
    }
    control.seatedViewBlockers?.forEach(mesh => { mesh.visible = true; });
    setUfoCabinLightAmount(control, 0);
  });
  updateUfoEngineOverlay();
}

function ufoSeatWorldAnchor(control) {
  if (!control?.craftAssembly || !control?.seatAnchorLocal) {
    return new THREE.Vector3(
      UFO_ENGINE_SEAT_WORLD.x,
      UFO_ENGINE_SEAT_WORLD.groundY,
      UFO_ENGINE_SEAT_WORLD.z,
    );
  }
  control.buildingGroup?.updateWorldMatrix(true, true);
  control.craftAssembly.updateWorldMatrix(true, true);
  return control.craftAssembly.localToWorld(control.seatAnchorLocal.clone());
}

function ufoSeatContactPolygon(control) {
  if (!control?.craftAssembly || !control?.seatContactCenterLocal) return null;
  control.buildingGroup?.updateWorldMatrix(true, true);
  control.craftAssembly.updateWorldMatrix(true, true);
  const halfX = (control.seatContactSizeX || 16) / 2;
  const halfZ = (control.seatContactSizeZ || 15) / 2;
  const center = control.seatContactCenterLocal;
  return [
    [-halfX, -halfZ],
    [halfX, -halfZ],
    [halfX, halfZ],
    [-halfX, halfZ],
  ].map(([x, z]) => {
    const point = control.craftAssembly.localToWorld(
      new THREE.Vector3(center.x + x, center.y, center.z + z),
    );
    return { x: point.x, z: point.z };
  });
}

function isCharacterTouchingUfoSeat(control) {
  const seatPolygon = ufoSeatContactPolygon(control);
  if (!seatPolygon || !character) return false;
  const seatAnchor = ufoSeatWorldAnchor(control);
  const seatHeight = (control.seatContactSizeY || 4) * (control.scale || BUILDING_SCALE);
  const seatBottomY = seatAnchor.y - seatHeight;
  const footprint = character.userData?.collisionFootprint;
  const characterBottomY = state.groundY + state.jumpY + (footprint?.minY ?? 0);
  const characterTopY = state.groundY + state.jumpY + (footprint?.maxY ?? 30);
  // A horizontal overlap from the cloud floor underneath the craft is not a
  // chair touch. Ren must already be on the cockpit floor or its seat ramp;
  // the small allowance includes the visible lower edge of the cushion.
  if (characterBottomY < seatBottomY - 4.5) return false;
  const verticallyTouching = characterTopY >= seatBottomY - UFO_ENGINE_SEAT_TOUCH_SKIN
    && characterBottomY <= seatAnchor.y + UFO_ENGINE_SEAT_TOUCH_SKIN;
  if (!verticallyTouching) return false;
  return polygonContact(
    characterCollisionObb(state.position.x, state.position.z),
    seatPolygon,
    UFO_ENGINE_SEAT_TOUCH_SKIN,
  ).intersects;
}

function updateUfoEngineOverlay() {
  if (!els.ufoEngineOverlay) return;
  const mode = state.ufoEngineMode;
  const active = mode === "seating" || mode === "closing" || mode === "lighting";
  els.ufoEngineOverlay.classList.toggle("is-active", active);
  els.viewport.classList.toggle("is-ufo-engine", active || mode === "ready");
  if (!active) return;
  if (mode === "seating") {
    els.ufoEnginePhase.textContent = "着座位置を固定";
    els.ufoEngineDetail.textContent = "白ミチロードセイバーレンを操縦席へ固定しています";
  } else if (mode === "closing") {
    els.ufoEnginePhase.textContent = "搭乗口を密閉";
    els.ufoEngineDetail.textContent = "顔認証で展開した足場を収納し、UFOの扉を閉じています";
  } else {
    els.ufoEnginePhase.textContent = "ENGINE START";
    els.ufoEngineDetail.textContent = state.ufoEngineSwitchAudioComplete
      ? "エンジン始動・カプセル車内灯を点灯しています"
      : "始動スイッチを操作しています";
  }
}

function beginUfoEngineStart() {
  const control = ufoDoorControls[0];
  if (!control || state.ufoEngineMode !== "idle") return false;
  const seatAnchor = ufoSeatWorldAnchor(control);
  const seatHeading = control.seatHeadingLocal + control.rotation + state.ufoFlightHeading;
  state.position.set(seatAnchor.x, 0, seatAnchor.z);
  state.groundY = seatAnchor.y;
  state.jumpY = 0;
  state.jumpVelocity = 0;
  state.falling = false;
  state.jumpCount = 0;
  state.supportSurfaceId = null;
  state.heading = seatHeading;
  state.viewHeading = seatHeading;
  state.viewPitch = 0;
  state.fastWalking = false;
  state.moving = false;
  state.ufoBoarded = true;
  state.ufoEngineMode = "seating";
  state.ufoEngineTimer = 0;
  state.ufoEngineRunning = false;
  state.ufoCabinLightAmount = 0;
  state.ufoFaceAuth = false;
  state.ufoFaceAuthLatched = false;
  keys.clear();
  setUfoCabinLightAmount(control, 0);
  updateUfoEngineOverlay();
  updateUfoControls();
  showToast("エンジン始動モードに入ります");
  return true;
}

function detectUfoEngineSeatArrival() {
  if (state.ufoEngineMode !== "idle" || state.ufoBoarded || !state.ufoDoorOpen) return false;
  const control = ufoDoorControls[0];
  return isCharacterTouchingUfoSeat(control) && beginUfoEngineStart();
}

function updateUfoEngineSequence(delta) {
  const control = ufoDoorControls[0];
  const mode = state.ufoEngineMode;
  if (!control || mode === "idle" || mode === "ready") {
    updateUfoEngineOverlay();
    return;
  }
  state.ufoEngineTimer += delta;
  if (mode === "seating" && state.ufoEngineTimer >= UFO_ENGINE_SEAT_PHASE_SECONDS) {
    state.ufoEngineMode = "closing";
    state.ufoEngineTimer = 0;
    playUfoMechEquipCloseAudio();
    setUfoDoorState(false);
    updateUfoEngineOverlay();
    updateUfoControls();
    return;
  }
  if (mode === "closing"
    && control.amount <= .025
    && state.ufoEngineTimer >= UFO_ENGINE_CLOSING_PHASE_SECONDS) {
    state.ufoEngineMode = "lighting";
    state.ufoEngineTimer = 0;
    state.ufoEngineRunning = false;
    state.ufoEngineSwitchAudioComplete = false;
    void playUfoEngineSwitchSequenceThenStart();
    updateUfoEngineOverlay();
    updateUfoControls();
    return;
  }
  if (mode === "lighting") {
    const lightAmount = clamp(state.ufoEngineTimer / UFO_ENGINE_LIGHT_PHASE_SECONDS, 0, 1);
    state.ufoCabinLightAmount = lightAmount;
    setUfoCabinLightAmount(control, lightAmount);
    if (lightAmount >= 1 && state.ufoEngineSwitchAudioComplete) {
      state.ufoEngineMode = "ready";
      state.ufoEngineTimer = 0;
      state.ufoCabinLightAmount = 1;
      setUfoCabinLightAmount(control, 1);
      updateUfoEngineOverlay();
      updateUfoControls();
      showToast("エンジン始動完了。UFOを操縦できます");
    }
  }
}

function readUfoFlightInput() {
  const forwardScroll = isUfoForwardScrollActive();
  const forwardScrollMission = ufoDoorControls[0]?.spaceForwardScroll;
  if (forwardScroll) {
    // 前進は航路エンジンが受け持ち、プレイヤーは上下・左右だけを直接
    // 操作する。横スクロールの読みやすさを保ちながら3Dの高さも使える。
    if (forwardScrollMission?.phase !== "playing") {
      return { forward: 0, turn: 0, lift: 0, strafe: 0 };
    }
    const keyboardLift = (keys.has("w") || keys.has("arrowup") ? 1 : 0)
      - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const keyboardStrafe = (keys.has("d") || keys.has("arrowright") ? 1 : 0)
      - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    return {
      forward: 0,
      turn: 0,
      lift: clamp(keyboardLift + ufoFlightPointerInput.lift - touchVector.y, -1, 1),
      strafe: clamp(keyboardStrafe + ufoFlightPointerInput.strafe + touchVector.x, -1, 1),
    };
  }
  const spaceShooter = state.map === "space"
    && state.ufoInSpace
    && isUfoSpaceLateralLegacyMissionActive();
  if (spaceShooter) {
    const keyboardStrafe = (keys.has("d") || keys.has("arrowright") ? 1 : 0)
      - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    // 宇宙戦では前後・上昇下降・旋回は読まない。左右だけを避け操作として
    // 受け取り、航路そのものは戦闘開始後に自動で前進する。
    return {
      forward: 0,
      turn: 0,
      lift: 0,
      strafe: clamp(keyboardStrafe + ufoFlightPointerInput.strafe, -1, 1),
    };
  }
  // UFO keyboard profile: A/D strafes, W/S controls vertical flight.
  // Forward/backward and turning remain available from the on-screen levers
  // (and the arrow-key alternatives) so they cannot conflict with this layout.
  const keyboardForward = (keys.has("arrowup") ? 1 : 0)
    - (keys.has("arrowdown") ? 1 : 0);
  const keyboardTurn = (keys.has("arrowleft") ? 1 : 0)
    - (keys.has("arrowright") ? 1 : 0);
  const keyboardStrafe = (keys.has("d") ? 1 : 0)
    - (keys.has("a") ? 1 : 0);
  const keyboardLift = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
  return {
    forward: clamp(keyboardForward + ufoFlightPointerInput.forward - touchVector.y, -1, 1),
    turn: clamp(keyboardTurn + ufoFlightPointerInput.turn, -1, 1),
    lift: clamp(keyboardLift + ufoFlightPointerInput.lift, -1, 1),
    strafe: clamp(keyboardStrafe + ufoFlightPointerInput.strafe + touchVector.x, -1, 1),
  };
}

function resetUfoFlightHoldAcceleration() {
  UFO_FLIGHT_INPUT_AXES.forEach(axis => {
    ufoFlightHoldState[axis].direction = 0;
    ufoFlightHoldState[axis].seconds = 0;
  });
  state.ufoFlightAccelerationStage = 0;
  document.body.dataset.ufoFlightAccelerationStage = "0";
  document.body.dataset.ufoFlightAccelerationMultiplier = "1.00";
}

function accelerateHeldUfoFlightInput(input, delta, options = {}) {
  const strafeHoldSeconds = options.strafeHoldSeconds ?? UFO_FLIGHT_ACCEL_HOLD_SECONDS;
  const strafeMultiplier = options.strafeMultiplier ?? UFO_FLIGHT_ACCEL_MULTIPLIER;
  const liftHoldSeconds = options.liftHoldSeconds ?? UFO_FLIGHT_ACCEL_HOLD_SECONDS;
  const liftMultiplier = options.liftMultiplier ?? UFO_FLIGHT_ACCEL_MULTIPLIER;
  const acceleratedInput = { ...input };
  let highestStage = 0;
  let highestMultiplier = 1;

  UFO_FLIGHT_INPUT_AXES.forEach(axis => {
    const value = input[axis];
    const direction = Math.abs(value) > .08 ? Math.sign(value) : 0;
    const hold = ufoFlightHoldState[axis];

    if (!direction) {
      hold.direction = 0;
      hold.seconds = 0;
      return;
    }

    if (hold.direction !== direction) {
      hold.direction = direction;
      hold.seconds = 0;
    } else {
      hold.seconds += delta;
    }

    const holdSeconds = axis === "strafe"
      ? strafeHoldSeconds
      : axis === "lift"
        ? liftHoldSeconds
        : UFO_FLIGHT_ACCEL_HOLD_SECONDS;
    const multiplier = axis === "strafe"
      ? strafeMultiplier
      : axis === "lift"
        ? liftMultiplier
        : UFO_FLIGHT_ACCEL_MULTIPLIER;
    const stage = hold.seconds >= holdSeconds ? 1 : 0;
    highestStage = Math.max(highestStage, stage);
    if (stage) highestMultiplier = Math.max(highestMultiplier, multiplier);
    acceleratedInput[axis] = value * (stage ? multiplier : 1);
  });

  state.ufoFlightAccelerationStage = highestStage;
  document.body.dataset.ufoFlightAccelerationStage = String(highestStage);
  document.body.dataset.ufoFlightAccelerationMultiplier =
    highestMultiplier.toFixed(2);
  return acceleratedInput;
}

function updateUfoFlightTilt(input, delta) {
  const forwardInput = clamp(Number(input?.forward) || 0, -1, 1);
  const strafeInput = clamp(Number(input?.strafe) || 0, -1, 1);
  const liftInput = clamp(Number(input?.lift) || 0, -1, 1);
  const directionalAim = input?.directionalAim === true;
  const directionalAcceleration = Math.max(
    1,
    Number(input?.directionalAcceleration) || 1,
  );
  // 長押し後は入力値が1を越える。視覚上の最大傾きは安全な範囲へ収めつつ、
  // ノーズ／照準の左右・上下の振れだけは長押し分まで大きくする。
  const aimStrafe = clamp(
    (Number.isFinite(input?.aimStrafe) ? input.aimStrafe : strafeInput) / directionalAcceleration,
    -1,
    1,
  );
  const aimLift = clamp(
    (Number.isFinite(input?.aimLift) ? input.aimLift : liftInput) / directionalAcceleration,
    -1,
    1,
  );
  const maneuverMagnitude = Math.hypot(forwardInput, strafeInput, liftInput);
  // The visible nose points toward local -Z. Positive X rotation raises that
  // nose, while negative Z rotation lowers the local +X (right) side.
  // Up input therefore raises the front of the UFO; down input lowers it.
  const targetPitch = directionalAim
    ? clamp(
      -forwardInput * UFO_FLIGHT_MAX_PITCH
        + aimLift * UFO_FORWARD_SCROLL_AIM_MAX_PITCH,
      -UFO_FORWARD_SCROLL_AIM_MAX_DESCENT_PITCH,
      UFO_FORWARD_SCROLL_AIM_MAX_PITCH,
    )
    : clamp(
      -forwardInput * UFO_FLIGHT_MAX_PITCH + liftInput * UFO_FLIGHT_MAX_PITCH,
      -UFO_FLIGHT_MAX_PITCH,
      UFO_FLIGHT_MAX_PITCH,
    );
  const targetRoll = -strafeInput * UFO_FLIGHT_MAX_ROLL;
  // 左右入力でノーズもその側へ向ける。これを機体の実回転へ加えることで、
  // 射撃と照準は見た目の傾きではなく実際のUFOの向きと一致する。
  const targetDirectionalYaw = directionalAim
    ? -aimStrafe * UFO_FORWARD_SCROLL_AIM_MAX_YAW
    : 0;
  const response = maneuverMagnitude > .02
    ? UFO_FLIGHT_TILT_RESPONSE
    : UFO_FLIGHT_LEVEL_RESPONSE;
  const amount = 1 - Math.exp(-response * delta);
  state.ufoFlightBasePitch = THREE.MathUtils.lerp(
    state.ufoFlightBasePitch,
    targetPitch,
    amount,
  );
  state.ufoFlightBaseRoll = THREE.MathUtils.lerp(
    state.ufoFlightBaseRoll,
    targetRoll,
    amount,
  );
  state.ufoFlightDirectionalYaw = THREE.MathUtils.lerp(
    state.ufoFlightDirectionalYaw || 0,
    targetDirectionalYaw,
    amount,
  );
  if (maneuverMagnitude <= .02 && Math.abs(state.ufoFlightBasePitch) < 1e-4) {
    state.ufoFlightBasePitch = 0;
  }
  if (maneuverMagnitude <= .02 && Math.abs(state.ufoFlightBaseRoll) < 1e-4) {
    state.ufoFlightBaseRoll = 0;
  }
  if (!directionalAim && Math.abs(state.ufoFlightDirectionalYaw) < 1e-4) {
    state.ufoFlightDirectionalYaw = 0;
  }

  let direction = "level";
  if (Math.hypot(forwardInput, strafeInput) > .08) {
    const sector = Math.round(
      Math.atan2(strafeInput, forwardInput) / (Math.PI / 4),
    );
    direction = UFO_FLIGHT_TILT_DIRECTIONS[(sector + 8) % 8];
  } else if (liftInput > .08) {
    direction = "up";
  } else if (liftInput < -.08) {
    direction = "down";
  }

  // Rock on the axis perpendicular to travel: right/left travel rocks front
  // to back, forward/back travel rocks left to right, and diagonal travel
  // rocks along the opposite diagonal requested for that direction.
  const lowEnergyAlert = isUfoForwardScrollLowEnergyAlert();
  const horizontalMagnitude = Math.hypot(forwardInput, strafeInput);
  if (horizontalMagnitude > .02) {
    const inverseMagnitude = 1 / horizontalMagnitude;
    state.ufoFlightRockAxisForward = -strafeInput * inverseMagnitude;
    state.ufoFlightRockAxisStrafe = forwardInput * inverseMagnitude;
  } else if (lowEnergyAlert) {
    // 自動前進中に操縦レバーを離していても、低残量の警報として小さな
    // 交差揺れを続ける。物理移動ではなく機体姿勢だけの演出に限定する。
    state.ufoFlightRockAxisForward = .58;
    state.ufoFlightRockAxisStrafe = .82;
  }
  if (horizontalMagnitude > .02 || lowEnergyAlert) {
    state.ufoFlightRockPhase = (
      state.ufoFlightRockPhase + delta * Math.PI * 2 * UFO_FLIGHT_ROCK_FREQUENCY
    ) % (Math.PI * 2);
  }
  const targetRockBlend = lowEnergyAlert
    ? Math.max(.42, clamp(horizontalMagnitude, 0, 1))
    : clamp(horizontalMagnitude, 0, 1);
  const rockResponseAmount = 1 - Math.exp(-UFO_FLIGHT_ROCK_RESPONSE * delta);
  state.ufoFlightRockBlend = THREE.MathUtils.lerp(
    state.ufoFlightRockBlend,
    targetRockBlend,
    rockResponseAmount,
  );
  if (targetRockBlend === 0 && state.ufoFlightRockBlend < 1e-3) {
    state.ufoFlightRockBlend = 0;
  }
  const targetWarningRockBlend = lowEnergyAlert ? 1 : 0;
  state.ufoFlightWarningRockBlend = THREE.MathUtils.lerp(
    state.ufoFlightWarningRockBlend || 0,
    targetWarningRockBlend,
    rockResponseAmount,
  );
  if (!lowEnergyAlert && state.ufoFlightWarningRockBlend < 1e-3) {
    state.ufoFlightWarningRockBlend = 0;
  }
  const rockWave = Math.sin(state.ufoFlightRockPhase)
    * UFO_FLIGHT_ROCK_ANGLE
    * state.ufoFlightRockBlend
    * (lowEnergyAlert ? UFO_FORWARD_SCROLL_LOW_ENERGY_ROCK_MULTIPLIER : 1);
  const warningCrossWave = Math.sin(state.ufoFlightRockPhase * 1.67 + .8)
    * UFO_FORWARD_SCROLL_LOW_ENERGY_IDLE_ROCK_ANGLE
    * state.ufoFlightWarningRockBlend;
  const rockPitch = -state.ufoFlightRockAxisForward * rockWave + warningCrossWave * .58;
  const rockRoll = -state.ufoFlightRockAxisStrafe * rockWave + warningCrossWave;
  state.ufoFlightPitch = state.ufoFlightBasePitch + rockPitch;
  state.ufoFlightRoll = state.ufoFlightBaseRoll + rockRoll;

  document.body.dataset.ufoFlightTiltDirection = direction;
  document.body.dataset.ufoFlightPitch = state.ufoFlightPitch.toFixed(4);
  document.body.dataset.ufoFlightRoll = state.ufoFlightRoll.toFixed(4);
  document.body.dataset.ufoFlightDirectionalYaw = state.ufoFlightDirectionalYaw.toFixed(4);
  document.body.dataset.ufoFlightRockAxis = UFO_FLIGHT_ROCK_AXIS_LABELS[direction] || "none";
  document.body.dataset.ufoFlightRockPitch = rockPitch.toFixed(4);
  document.body.dataset.ufoFlightRockRoll = rockRoll.toFixed(4);
}

function updateUfoSpaceStrafeInertia(control, strafeInput, speedMultiplier, delta) {
  const combat = control?.spaceCombat;
  const normalSpeed = UFO_FLIGHT_FORWARD_SPEED * speedMultiplier;
  if (!combat) return strafeInput * normalSpeed;
  const targetVelocity = strafeInput * normalSpeed;
  const response = Math.abs(strafeInput) > .02
    ? UFO_SPACE_STRAFE_RESPONSE
    : UFO_SPACE_STRAFE_COAST_RESPONSE;
  const amount = 1 - Math.exp(-response * delta);
  combat.strafeVelocity = THREE.MathUtils.lerp(
    combat.strafeVelocity || 0,
    targetVelocity,
    amount,
  );
  if (Math.abs(strafeInput) <= .02 && Math.abs(combat.strafeVelocity) < .08) {
    combat.strafeVelocity = 0;
  }
  document.body.dataset.ufoSpaceStrafeVelocity = combat.strafeVelocity.toFixed(2);
  return combat.strafeVelocity;
}

function updateUfoForwardScrollManeuverInertia(control, axis, input, maximumSpeed, delta) {
  const flight = control?.flight;
  if (!flight) return input * maximumSpeed;
  const velocityKey = axis === "lift" ? "inertialLiftVelocity" : "inertialStrafeVelocity";
  const currentVelocity = Number.isFinite(flight[velocityKey]) ? flight[velocityKey] : 0;
  const targetVelocity = input * maximumSpeed;
  // A direction change must first overcome the existing trajectory.  This is
  // deliberately not a spring-back: releasing the lever lets the ship settle
  // smoothly, while reversing takes a visible moment like a high-G craft.
  const response = axis === "strafe"
    ? (Math.abs(input) > .02
      ? UFO_FORWARD_SCROLL_STRAFE_RESPONSE
      : UFO_FORWARD_SCROLL_STRAFE_RELEASE_RESPONSE)
    : (Math.abs(input) > .02
      ? UFO_FORWARD_SCROLL_LIFT_RESPONSE
      : UFO_FORWARD_SCROLL_LIFT_RELEASE_RESPONSE);
  const amount = 1 - Math.exp(-response * delta);
  const nextVelocity = THREE.MathUtils.lerp(currentVelocity, targetVelocity, amount);
  flight[velocityKey] = Math.abs(input) <= .02 && Math.abs(nextVelocity) < .035
    ? 0
    : nextVelocity;
  return flight[velocityKey];
}

function updateUfoFlight(delta) {
  const control = ufoDoorControls[0];
  if (!control?.craftAssembly || state.ufoEngineMode !== "ready") return;
  if (state.ufoSpaceTransitioning) {
    const neutralInput = { forward: 0, turn: 0, lift: 0, strafe: 0 };
    updateUfoFlightTilt(neutralInput, delta);
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
    return;
  }
  const rawInput = readUfoFlightInput();
  const forwardScroll = isUfoForwardScrollActive(control);
  const forwardScrollMission = control.spaceForwardScroll;
  const forwardScrollPlaying = forwardScroll && forwardScrollMission?.phase === "playing";
  const forwardScrollEmergencyReturn = forwardScroll
    && forwardScrollMission?.energyEmergencyReturnPending;
  const spaceShooter = state.map === "space"
    && state.ufoInSpace
    && isUfoSpaceLateralLegacyMissionActive(control);
  // The grand prix owns the actual world-space translation while it is active.
  // Reading the raw pad again inside the race preserves left/right steering, but
  // prevents the normal free-flight axes from adding a second, invisible movement.
  const raceLocked = spaceShooter && control.spaceMarsRace?.active
    && ["ready", "playing"].includes(control.spaceMarsRace.phase);
  const input = raceLocked || forwardScrollEmergencyReturn
    ? { forward: 0, turn: 0, lift: 0, strafe: 0 }
    : rawInput;
  const acceleratedInput = accelerateHeldUfoFlightInput(
    input,
    delta,
    forwardScroll
      ? {
        strafeHoldSeconds: UFO_FORWARD_SCROLL_STRAFE_HOLD_SECONDS,
        strafeMultiplier: UFO_FORWARD_SCROLL_STRAFE_ACCEL_MULTIPLIER,
        liftHoldSeconds: UFO_FORWARD_SCROLL_LIFT_HOLD_SECONDS,
        liftMultiplier: UFO_FORWARD_SCROLL_LIFT_ACCEL_MULTIPLIER,
      }
      : undefined,
  );
  const rescueMission = control.spaceRescue;
  const rescueAutopilot = ["acquire", "towing"].includes(state.ufoSpaceRescueState);
  // The first approach must stop inside the cable's valid range. Letting the
  // unit slip past the player turns a timing miss into a several-kilometre
  // chase, which is neither readable nor a useful physical decision.
  const holdingForLink = rescueMission?.phase === "acquire"
    && Number.isFinite(rescueMission.distanceToObjective)
    && rescueMission.distanceToObjective <= UFO_SPACE_RESCUE_LINK_RANGE * .82;
  // The same rule applies at the arrival ring. The pilot must be able to
  // stabilize the spinning unit inside the ring instead of being carried
  // straight through it by a non-cancellable autopilot.
  const holdingForArrival = rescueMission?.phase === "towing"
    && Number.isFinite(rescueMission.distanceToObjective)
    && rescueMission.distanceToObjective <= rescueMission.goal.radius * .75;
  const autoAdvance = spaceShooter && rescueAutopilot && !holdingForLink && !holdingForArrival
    ? UFO_SPACE_RESCUE_AUTOPILOT_SPEED_FACTOR
    : 0;
  const spaceFlightSpeedMultiplier = state.map === "space"
    ? UFO_SPACE_FLIGHT_SPEED_MULTIPLIER
    : 1;
  // Normal free flight receives a decisive maneuverability increase without
  // touching the older lateral mission controls or the hold-to-1.5x rule.
  const responsiveSpaceFlight = state.map === "space"
    && state.ufoInSpace
    && !spaceShooter
    && !raceLocked
    && !forwardScroll;
  const manualForwardSpeed = UFO_FLIGHT_FORWARD_SPEED
    * spaceFlightSpeedMultiplier
    * (responsiveSpaceFlight ? UFO_SPACE_FREE_FLIGHT_FORWARD_MULTIPLIER : 1);
  const manualStrafeSpeed = UFO_FLIGHT_FORWARD_SPEED
    * spaceFlightSpeedMultiplier
    * (responsiveSpaceFlight ? UFO_SPACE_FREE_FLIGHT_STRAFE_MULTIPLIER : 1);
  const manualLiftSpeed = UFO_FLIGHT_LIFT_SPEED
    * spaceFlightSpeedMultiplier
    * (responsiveSpaceFlight ? UFO_SPACE_FREE_FLIGHT_LIFT_MULTIPLIER : 1);
  const turnSpeed = UFO_FLIGHT_TURN_SPEED
    * (responsiveSpaceFlight ? UFO_SPACE_FREE_FLIGHT_TURN_MULTIPLIER : 1);
  // 前進スクロール中の前進成分は下の通常移動では扱わない。
  // updateUfoForwardScrollMission が実時間と火星距離から一度だけ位置を
  // 決めるため、ここで重ねて移動させると所要時間が崩れてしまう。
  const forwardSpeed = forwardScroll ? 0 : manualForwardSpeed;
  const strafeSpeed = forwardScroll ? UFO_FORWARD_SCROLL_STRAFE_SPEED : manualStrafeSpeed;
  const liftSpeed = forwardScroll ? UFO_FORWARD_SCROLL_LIFT_SPEED : manualLiftSpeed;
  document.body.dataset.ufoSpaceFlightSpeedMultiplier =
    spaceFlightSpeedMultiplier.toFixed(2);
  document.body.dataset.ufoSpaceManeuverMode = forwardScroll
    ? "forward-scroll"
    : responsiveSpaceFlight
      ? "responsive-free-flight"
      : "standard";
  const strafeVelocity = forwardScroll
    ? updateUfoForwardScrollManeuverInertia(
      control,
      "strafe",
      acceleratedInput.strafe,
      strafeSpeed,
      delta,
    )
    : spaceShooter
      ? updateUfoSpaceStrafeInertia(
        control,
        acceleratedInput.strafe,
        spaceFlightSpeedMultiplier,
        delta,
      )
      : acceleratedInput.strafe * strafeSpeed;
  const liftVelocity = forwardScroll
    ? updateUfoForwardScrollManeuverInertia(
      control,
      "lift",
      acceleratedInput.lift,
      liftSpeed,
      delta,
    )
    : acceleratedInput.lift * liftSpeed;
  // Auto-cruise is a real movement vector, so its pitch and gentle cross-axis
  // rocking must be visible even with no lever held.  Side tilt follows the
  // achieved inertial velocity rather than the raw finger input.
  const tiltInput = forwardScrollPlaying
    ? {
      // 自動前進の小さな前傾は残すが、左右・上下を押した時はその操作を
      // UFOのノーズ方向として扱う。長押しで加速した入力ほど照準も遠くへ動く。
      forward: UFO_FORWARD_SCROLL_CRUISE_PITCH_SCALE,
      strafe: acceleratedInput.strafe,
      lift: acceleratedInput.lift,
      directionalAim: true,
      directionalAcceleration: UFO_FORWARD_SCROLL_STRAFE_ACCEL_MULTIPLIER,
      aimStrafe: acceleratedInput.strafe,
      aimLift: acceleratedInput.lift,
    }
    : input;
  updateUfoFlightTilt(tiltInput, delta);
  const previousFlightX = state.ufoFlightX;
  const previousFlightY = state.ufoFlightY;
  const previousFlightZ = state.ufoFlightZ;
  const nextHeading = forwardScroll
    ? forwardScrollMission.courseHeading
    : state.ufoFlightHeading + acceleratedInput.turn * turnSpeed * delta;
  // The craft's authored nose points along the opposite local axis from the
  // camera's forward vector. During the rescue mission, the craft keeps
  // moving toward that nose automatically; only the lateral lane is player-driven.
  const travelInput = forwardScroll
    ? 0
    : spaceShooter
      ? -autoAdvance
      : -acceleratedInput.forward;
  const rightX = Math.cos(nextHeading);
  const rightZ = -Math.sin(nextHeading);
  const movementX = (
    Math.sin(nextHeading) * travelInput * forwardSpeed
    + rightX * strafeVelocity
  ) * delta;
  const movementZ = (
    Math.cos(nextHeading) * travelInput * forwardSpeed
    + rightZ * strafeVelocity
  ) * delta;
  const proposedFlightX = previousFlightX + movementX;
  const proposedFlightZ = previousFlightZ + movementZ;
  const proposedFlightY = state.map === "space"
    ? clampUfoSpaceFlightY(previousFlightY + liftVelocity * delta)
    : Math.max(0, previousFlightY + liftVelocity * delta);

  // Resolve vertical motion first. Descending onto a roof or rising into an
  // overhang stops at the previous safe altitude instead of snapping or
  // rebounding the camera.
  let acceptedFlightY = proposedFlightY;
  let collision = null;
  if (Math.abs(proposedFlightY - previousFlightY) > 1e-7) {
    const verticalContact = ufoFlightCollisionAt(
      control,
      previousFlightX,
      proposedFlightY,
      previousFlightZ,
    );
    if (verticalContact) {
      acceptedFlightY = previousFlightY;
      collision = verticalContact;
    }
  }

  // The saucer is circular in plan view. Check the complete proposed move,
  // then allow one clear axis when approaching diagonally so the UFO slides
  // naturally along a wall without ever entering it.
  let acceptedFlightX = proposedFlightX;
  let acceptedFlightZ = proposedFlightZ;
  if (Math.abs(movementX) + Math.abs(movementZ) > 1e-7) {
    const fullContact = ufoFlightCollisionAt(
      control,
      proposedFlightX,
      acceptedFlightY,
      proposedFlightZ,
    );
    if (fullContact) {
      collision = fullContact;
      const xContact = Math.abs(movementX) > 1e-7
        ? ufoFlightCollisionAt(control, proposedFlightX, acceptedFlightY, previousFlightZ)
        : fullContact;
      const zContact = Math.abs(movementZ) > 1e-7
        ? ufoFlightCollisionAt(control, previousFlightX, acceptedFlightY, proposedFlightZ)
        : fullContact;
      const canMoveX = !xContact;
      const canMoveZ = !zContact;
      if (canMoveX && canMoveZ) {
        if (Math.abs(movementX) >= Math.abs(movementZ)) acceptedFlightZ = previousFlightZ;
        else acceptedFlightX = previousFlightX;
      } else if (canMoveX) {
        acceptedFlightZ = previousFlightZ;
      } else if (canMoveZ) {
        acceptedFlightX = previousFlightX;
      } else {
        acceptedFlightX = previousFlightX;
        acceptedFlightZ = previousFlightZ;
      }
    }
  }

  state.ufoFlightHeading = nextHeading;
  state.ufoFlightX = acceptedFlightX;
  state.ufoFlightY = acceptedFlightY;
  state.ufoFlightZ = acceptedFlightZ;
  if (collision) {
    if (spaceShooter && control.spaceCombat) control.spaceCombat.strafeVelocity = 0;
    document.body.dataset.ufoFlightCollision = collision.id;
    if (!state.ufoFlightBlocked) showToast("UFOが建造物に接触したため、安全位置で停止しました");
    state.ufoFlightBlocked = true;
  } else {
    delete document.body.dataset.ufoFlightCollision;
    state.ufoFlightBlocked = false;
  }

  // This sound belongs only to the instant the craft leaves the landing pad.
  // Further upward input while already airborne must never restart it.
  if (input.lift > 0
    && previousFlightY <= UFO_GROUND_TAKEOFF_ALTITUDE_EPSILON
    && acceptedFlightY > UFO_GROUND_TAKEOFF_ALTITUDE_EPSILON) {
    playUfoGroundTakeoffAudio();
  }
  if (acceptedFlightY >= UFO_FLIGHT_LOOP_START_HEIGHT) startUfoFlightLoopAudio();
  if (acceptedFlightY <= UFO_GROUND_TAKEOFF_ALTITUDE_EPSILON
    && previousFlightY > UFO_GROUND_TAKEOFF_ALTITUDE_EPSILON) {
    stopUfoFlightLoopAudio();
  }
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  control.flight.forwardInput = input.forward;
  control.flight.turnInput = input.turn;
  control.flight.liftInput = input.lift;
  control.flight.strafeInput = input.strafe;
  control.flight.inertialStrafeVelocity = (spaceShooter || forwardScroll) ? strafeVelocity : 0;
  control.flight.inertialLiftVelocity = forwardScroll ? liftVelocity : 0;
  control.flight.autoAdvanceInput = forwardScrollPlaying ? 1 : autoAdvance;
  const spaceExit = ufoPlanetMapSpaceExitAt(
    control,
    state.ufoFlightX,
    state.ufoFlightY,
    state.ufoFlightZ,
  );
  if (spaceExit) beginUfoSpaceTransition(control, spaceExit);
  const earthApproach = forwardScroll || isUfoSpacePlanetariumFreeFlight(control)
    ? null
    : ufoEarthApproachAt(control);
  if (earthApproach) beginUfoSkyReturn(control, earthApproach);
}

function runUfoFlightCollisionSelfTestIfRequested() {
  const params = new URLSearchParams(location.search);
  if (params.get("ufoFlightCollisionTest") !== "1") return;
  const control = ufoDoorControls[0];
  if (!control?.craftAssembly) {
    document.body.dataset.ufoFlightCollisionSelfTest = "missing-ufo";
    return;
  }
  const scale = control.scale || BUILDING_SCALE;
  const radius = (control.flightCollision?.radiusLocal ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale
    + UFO_FLIGHT_COLLISION_SKIN;
  const config = MAPS[state.map];
  const limitX = config.world.width / 2 - radius;
  const limitZ = config.world.depth / 2 - radius;
  let testCandidate = null;
  for (const collider of colliders) {
    if (isOwnFlyingUfoPhysicsElement(control, collider)) continue;
    if (![collider.x, collider.z].every(Number.isFinite)) continue;
    if (Math.abs(collider.x) >= limitX || Math.abs(collider.z) >= limitZ) continue;
    const local = ufoWorldToLocal(control, collider.x, collider.z);
    const contact = ufoFlightCollisionAt(control, local.x, 0, local.z);
    if (contact?.type === "building") {
      testCandidate = { collider, local, contact };
      break;
    }
  }
  if (!testCandidate) {
    document.body.dataset.ufoFlightCollisionSelfTest = "missing-building-candidate";
    return;
  }
  const highestObstacleY = colliders.reduce((highest, collider) => {
    if (isOwnFlyingUfoPhysicsElement(control, collider)) return highest;
    return Math.max(highest, staticColliderVerticalRange(collider).maxY);
  }, walkableSurfaces.reduce((highest, surface) => (
    isOwnFlyingUfoPhysicsElement(control, surface)
      ? highest
      : Math.max(highest, Number.isFinite(surface.height) ? surface.height : 0)
  ), 0));
  const minimumLocalY = control.flightCollision?.minYLocal ?? UFO_FLIGHT_COLLISION_MIN_Y_LOCAL;
  const highFlightY = Math.max(
    0,
    (highestObstacleY + 10 - (control.originY || 0)) / scale - minimumLocalY,
  );
  const highContact = ufoFlightCollisionAt(
    control,
    testCandidate.local.x,
    highFlightY,
    testCandidate.local.z,
  );
  const launchContact = ufoFlightCollisionAt(control, 0, 0, 0);
  const passed = testCandidate.contact.type === "building" && !highContact && !launchContact;
  document.body.dataset.ufoFlightCollisionSelfTest = passed ? "pass" : "fail";
  document.body.dataset.ufoFlightCollisionRadius = radius.toFixed(3);
  document.body.dataset.ufoFlightCollisionLowContact = testCandidate.contact.id;
  document.body.dataset.ufoFlightCollisionHighClear = String(!highContact);
  document.body.dataset.ufoFlightCollisionLaunchClear = String(!launchContact);
}

function updateUfoAirborneGroundLight(control, delta) {
  const effect = control?.airborneLight;
  if (!effect) return;
  const airborne = state.ufoEngineRunning
    && state.ufoEngineMode === "ready"
    && state.ufoFlightY > .3;
  const targetAmount = airborne ? 1 : 0;
  const response = targetAmount > effect.amount ? 2.8 : 5.5;
  effect.amount += (targetAmount - effect.amount) * Math.min(1, delta * response);
  if (effect.amount < .002) {
    effect.amount = 0;
    effect.assembly.visible = false;
    effect.spot.intensity = 0;
    effect.beamMaterial.opacity = 0;
    effect.coreMaterial.opacity = 0;
    effect.groundGlowMaterial.opacity = 0;
    return;
  }
  effect.assembly.visible = true;
  const localHeight = Math.max(3.5, state.ufoFlightY + effect.outletY);
  const bottomRadius = clamp(22 + localHeight * .34, 26, 82);
  const columnCenterY = effect.outletY - localHeight / 2;
  effect.beam.position.set(0, columnCenterY, 0);
  effect.beam.scale.set(bottomRadius, localHeight, bottomRadius);
  effect.core.position.set(0, columnCenterY, 0);
  effect.core.scale.set(bottomRadius * .72, localHeight * .98, bottomRadius * .72);
  // Counter the craft's local altitude so the pool remains on the real map
  // floor directly below the moving UFO, rather than climbing with the hull.
  effect.groundGlow.position.set(0, -state.ufoFlightY + .12, 0);
  effect.groundGlow.scale.setScalar(bottomRadius * 1.28);
  effect.spotTarget.position.set(0, -state.ufoFlightY, 0);
  effect.spot.distance = localHeight * (control.scale || BUILDING_SCALE) + 120;
  effect.spot.angle = clamp(Math.atan2(bottomRadius, localHeight), .3, .72);
  effect.spot.intensity = effect.amount * (64 + Math.min(28, state.ufoFlightY * .45));
  effect.beamMaterial.opacity = effect.amount * .12;
  effect.coreMaterial.opacity = effect.amount * .065;
  effect.groundGlowMaterial.opacity = effect.amount * .3;
  document.body.dataset.ufoAirborneLightAmount = effect.amount.toFixed(3);
  document.body.dataset.ufoAirborneLightHeight = localHeight.toFixed(3);
  document.body.dataset.ufoAirborneLightGroundY = effect.groundGlow
    .getWorldPosition(new THREE.Vector3()).y.toFixed(3);
}

function updateUfoJetAnimation(delta) {
  ufoDoorControls.forEach(control => {
    const jet = control.jet;
    if (!jet) return;
    enforceUfoTurbineAttachment(control);
    updateUfoAirborneGroundLight(control, delta);
    jet.phase += delta;
    const flightActivity = Math.max(
      Math.abs(control.flight?.forwardInput || 0),
      Math.abs(control.flight?.turnInput || 0),
      Math.abs(control.flight?.liftInput || 0),
      Math.abs(control.flight?.strafeInput || 0),
    );
    const targetThrottle = state.ufoEngineRunning ? .58 + flightActivity * .42 : 0;
    const response = targetThrottle > jet.throttle ? 4.8 : 7.2;
    jet.throttle += (targetThrottle - jet.throttle) * Math.min(1, delta * response);
    // Rotate the actual UFO-bottom turbine. The landing pad lights remain
    // completely static; only this craft-owned rotor reacts to the engine.
    if (jet.rotor && jet.throttle > .001) {
      const rotorSpeed = 21 * jet.throttle;
      jet.rotor.rotation.y = (jet.rotor.rotation.y + delta * rotorSpeed) % (Math.PI * 2);
    }
    if (jet.throttle < .004) {
      jet.throttle = 0;
      jet.assembly.visible = false;
      jet.light.intensity = 0;
      jet.outerMaterial.opacity = 0;
      jet.coreMaterial.opacity = 0;
      jet.particleMaterial.opacity = 0;
      jet.glowRing.material.emissiveIntensity = 1.65;
      return;
    }

    jet.assembly.visible = true;
    const pulse = .5 + .5 * Math.sin(jet.phase * 14.5);
    const thrust = jet.throttle * (.9 + pulse * .1);
    jet.outerMaterial.opacity = .2 * thrust;
    jet.coreMaterial.opacity = .34 * thrust;
    jet.particleMaterial.opacity = .62 * thrust;
    jet.outer.scale.set(1 + pulse * .012, .94 + pulse * .12, 1 + pulse * .012);
    jet.core.scale.set(1 - pulse * .018, .9 + pulse * .17, 1 - pulse * .018);
    jet.light.intensity = 5.8 * thrust;
    jet.glowRing.material.emissiveIntensity = 1.65 + 2.6 * thrust;
    jet.particles.forEach(particle => {
      const progress = (jet.phase * particle.userData.jetSpeed + particle.userData.jetOffset) % 1;
      const spread = .45 + progress * .55;
      const radius = particle.userData.jetRadius * spread;
      // The exhaust travels downward without orbiting around the landing pad.
      // Rotational motion is now represented by the physical turbine above.
      const angle = particle.userData.jetAngle;
      particle.position.set(
        Math.cos(angle) * radius,
        jet.outletY - .45 - progress * (jet.height - .65),
        Math.sin(angle) * radius,
      );
      const scale = (.58 + (1 - progress) * .78) * thrust;
      particle.scale.setScalar(scale);
    });
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

function ufoCapsuleCeilingHeightForCharacter(rootX, rootZ) {
  if (!character || !ufoDoorControls.length) return null;
  const body = characterCollisionObb(rootX, rootZ);
  // The top of Ren is near the horizontal centre of the body. Sample a small
  // head-sized ring as well as its centre so a vertical jump cannot tunnel
  // through the curved glass near an edge while avoiding the overly large
  // arm/cape footprint used for ordinary wall collision.
  const headRadius = Math.max(
    2.5,
    Math.min(9.5, Math.max(body.halfX, body.halfZ) * .62),
  );
  const samples = [{ x: body.x, z: body.z }];
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    samples.push({
      x: body.x + Math.cos(angle) * headRadius,
      z: body.z + Math.sin(angle) * headRadius,
    });
  }

  let lowestCeiling = null;
  ufoDoorControls.forEach(control => {
    const radius = control.capsuleRadius || 24;
    const baseY = control.capsuleBaseY || 23;
    const domeHeight = control.capsuleHeight || 24 * 1.16;
    const scale = control.scale || BUILDING_SCALE;
    const bodyLocal = ufoWorldToLocal(control, body.x, body.z);
    const bodyInsideCapsule = Math.hypot(bodyLocal.x, bodyLocal.z) < radius;
    samples.forEach(sample => {
      const local = ufoWorldToLocal(control, sample.x, sample.z);
      const radialDistance = Math.hypot(local.x, local.z);
      const seamHalfThickness = UFO_CAPSULE_SEAM_RADIAL_THICKNESS / 2;
      const insideSeamAnnulus = radialDistance >= UFO_CAPSULE_SEAM_RADIUS - seamHalfThickness
        && radialDistance <= UFO_CAPSULE_SEAM_RADIUS + seamHalfThickness;
      if (insideSeamAnnulus && !isInsideUfoCapsuleOpening(control, local.x, local.z)) {
        const seamUnderside = (control.originY || 0) + UFO_CAPSULE_SEAM_MIN_Y * scale;
        if (lowestCeiling === null || seamUnderside < lowestCeiling) lowestCeiling = seamUnderside;
      }
      if (radialDistance >= radius) {
        // If the body centre is inside but a face/head sample has crossed the
        // rim, ignoring that sample is exactly what allowed the brief visual
        // escape. The underside at the rim is the capsule base itself.
        if (bodyInsideCapsule) {
          const rimUnderside = (control.originY || 0)
            + (baseY - UFO_CAPSULE_UNDERSIDE_INSET) * scale;
          if (lowestCeiling === null || rimUnderside < lowestCeiling) lowestCeiling = rimUnderside;
        }
        return;
      }
      const normalizedRadius = radialDistance / radius;
      const localCeiling = baseY
        + domeHeight * Math.sqrt(Math.max(0, 1 - normalizedRadius * normalizedRadius))
        - UFO_CAPSULE_UNDERSIDE_INSET;
      const worldCeiling = (control.originY || 0) + localCeiling * scale;
      if (lowestCeiling === null || worldCeiling < lowestCeiling) lowestCeiling = worldCeiling;
    });
  });
  return lowestCeiling;
}

function constrainCharacterBelowUfoCapsule() {
  if (state.jumpY <= 0 && state.jumpVelocity <= 0) return false;
  const ceiling = ufoCapsuleCeilingHeightForCharacter(state.position.x, state.position.z);
  if (!Number.isFinite(ceiling)) return false;
  const characterTop = character?.userData?.collisionFootprint?.maxY ?? 0;
  const maximumJumpY = Math.max(0, ceiling - state.groundY - characterTop - .12);
  if (state.jumpY <= maximumJumpY) return false;
  state.jumpY = maximumJumpY;
  // A ceiling contact cancels only upward velocity. During descent retain the
  // real gravity speed so the character never hovers below the glass.
  if (state.jumpVelocity > 0) state.jumpVelocity = 0;
  return true;
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
    playUfoMechEquipOpenAudio();
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

function setUfoFlightLeverText(command, glyph, label, ariaLabel) {
  const button = els.ufoFlightControls?.querySelector(`[data-ufo-flight="${command}"]`);
  if (!button) return;
  const glyphElement = button.querySelector("b");
  const labelElement = button.querySelector("small");
  if (glyphElement) glyphElement.textContent = glyph;
  if (labelElement) labelElement.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  button.title = ariaLabel;
}

function updateUfoFlightControlPresentation(forwardScroll) {
  if (!els.ufoFlightControls) return;
  const title = els.ufoFlightControls.querySelector(".flight-console-inline-title");
  const pad = els.ufoFlightPad;
  if (forwardScroll) {
    setUfoFlightLeverText("lift-up", "▲", "上へ", "上へ移動");
    setUfoFlightLeverText("lift-down", "▼", "下へ", "下へ移動");
    setUfoFlightLeverText("turn-left", "◀", "左へ", "左へ移動");
    setUfoFlightLeverText("turn-right", "▶", "右へ", "右へ移動");
    if (title) title.textContent = "高速火星航行";
    if (pad) pad.setAttribute("aria-label", "高速前進中の上下左右・G軌道補正パッド");
    return;
  }
  setUfoFlightLeverText("lift-up", "▲", "上昇", "上昇");
  setUfoFlightLeverText("lift-down", "▼", "下降", "下降");
  setUfoFlightLeverText("turn-left", "↶", "左回転", "左回転");
  setUfoFlightLeverText("turn-right", "↷", "右回転", "右回転");
  if (title) title.textContent = "飛行操縦";
  if (pad) pad.setAttribute("aria-label", "UFO前後左右移動パッド");
}

function updateUfoControls() {
  if (!els.ufoDoorButton || !els.ufoBoardButton || !els.ufoStatus) return;
  updateUfoSpaceLifeHud();
  if (state.ufoEngineMode === "idle") updateUfoFaceAuthentication();
  const pad = currentUfoPadItem();
  const hasPad = Boolean(pad);
  const nearPad = hasPad && Math.hypot(state.position.x - pad.position[0], state.position.z - pad.position[2]) <= UFO_ACCESS_RADIUS;
  const sequenceActive = ["seating", "closing", "lighting"].includes(state.ufoEngineMode);
  const flightReady = state.ufoEngineMode === "ready";
  const cockpitActive = state.ufoBoarded;
  if (els.ufoActions) els.ufoActions.hidden = flightReady;
  if (els.ufoFlightControls) {
    const forwardScroll = flightReady && isUfoForwardScrollActive();
    els.ufoFlightControls.hidden = !flightReady;
    els.ufoFlightControls.classList.toggle(
      "is-space-shooter",
      flightReady
        && state.map === "space"
        && state.ufoInSpace
        && isUfoSpaceLateralLegacyMissionActive(),
    );
    els.ufoFlightControls.classList.toggle("is-forward-scroll", forwardScroll);
    updateUfoFlightControlPresentation(forwardScroll);
  }
  if (els.touchPad) els.touchPad.hidden = cockpitActive;
  if (els.touchHint) els.touchHint.hidden = cockpitActive;
  els.ufoDoorButton.disabled = !hasPad || state.ufoBoarded || state.ufoEngineMode !== "idle";
  els.ufoDoorButton.textContent = state.ufoDoorOpen ? "右側搭乗足場を収納" : "右側搭乗足場を手動で展開";
  els.ufoBoardButton.textContent = sequenceActive ? "エンジン始動中" : "操縦席へ歩いて着座";
  els.ufoBoardButton.disabled = true;
  if (flightReady && state.map === "space" && isUfoForwardScrollActive()) {
    const mission = ufoDoorControls[0].spaceForwardScroll;
    els.ufoStatus.textContent = mission.phase === "launch"
      ? "地球大気圏を離脱しています。まもなく前進スクロール航行を開始します。"
      : mission.phase === "playing"
        ? "高速自動前進中。左右・上下はGの掛かる軌道補正です。急な切り返しではなく、先を読んで機体を流してください。"
        : mission.phase === "complete"
          ? "火星大気圏へ到達しました。今回の操縦感テストはここで完了です。"
          : mission.energyEmergencyReturnPending
            ? "エネルギー切れのため緊急帰還します"
          : "高速火星航行を停止しました。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceStarMining?.active) {
    const mission = ufoDoorControls[0].spaceStarMining;
    const star = mission.nearestStar;
    els.ufoStatus.textContent = star
      ? `星間採掘航行。${star.name}へ自由飛行で近づき、採掘圏内でFキーを押してください。`
      : "星間採掘航行。前後・左右・上昇・下降・旋回で自由にプラネタリウムを飛行できます。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceMarsRace?.active) {
    els.ufoStatus.textContent = "火星突入航路中。左右で慣性を操り、航路ラインをつないで残骸帯を突破します。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceSolarSail?.active) {
    els.ufoStatus.textContent = "左右で光る太陽風の帯へ乗り、Fで太陽帆を開閉します。帆の風圧が実際のUFO航路へ加わります。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceInertiaSlingshot?.active) {
    els.ufoStatus.textContent = "左右で実際のUFO軌道を補正し、Fで岩塊へテザーを接続・解放して火星側の捕獲軌道へ進みます。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceGravityMaze?.active) {
    els.ufoStatus.textContent = "左右操縦で重力を傾け、重力コアを実体の迷路の開口部へ通します。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceCranePort?.active) {
    els.ufoStatus.textContent = "左右操縦で磁場フックを合わせ、資材を揺らしながら建設ソケットへ荷下ろしします。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceRingBattle?.active) {
    els.ufoStatus.textContent = "左右操縦で質量ラムを合わせ、重力コアを得点リングへ押し込みます。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceBowling?.active) {
    els.ufoStatus.textContent = "左右操縦で重力球の発射位置を合わせ、惑星殻を崩して抽出帯へ落とします。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spaceSalvage?.active) {
    els.ufoStatus.textContent = "左右操縦で重力プッシャーを合わせ、資源片を中央の回収口へ押し込めます。";
  } else if (flightReady && state.map === "space" && ufoDoorControls[0]?.spacePinball?.active) {
    els.ufoStatus.textContent = "左右操縦で下部磁場を動かし、重力コアを受け止めて連鎖させます。";
  } else if (flightReady && state.map === "space") {
    els.ufoStatus.textContent = "プラネタリウム航行。火星を目印に、前後・左右・上昇・下降・回転で自由に飛行できます。";
  }
  else if (flightReady) els.ufoStatus.textContent = "エンジン始動完了。前後左右はパッド、上昇・下降・回転はレバーで操縦できます。";
  else if (!hasPad) els.ufoStatus.textContent = "UFO乗り場を建造してください。";
  else if (state.ufoEngineMode === "lighting") els.ufoStatus.textContent = "エンジン始動。カプセル内部の車内灯を点灯しています。";
  else if (state.ufoEngineMode === "closing") els.ufoStatus.textContent = "搭乗足場を収納し、UFOの入口を閉じています。";
  else if (state.ufoEngineMode === "seating") els.ufoStatus.textContent = "白ミチロードセイバーレンを固定着座位置へ合わせています。";
  else if (state.ufoFaceAuth) els.ufoStatus.textContent = "顔認証済み。右側搭乗足場を引き出しています。";
  else if (!nearPad) els.ufoStatus.textContent = "顔認証装置の前まで移動してください。";
  else if (!state.ufoDoorOpen) els.ufoStatus.textContent = "顔認証装置の前に立つと、搭乗足場が自動で引き出されます。";
  else els.ufoStatus.textContent = "足場から椅子へ進んでください。椅子に触れるとエンジン始動モードへ入ります。";
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
  closeSkyStationGuideDialog({ resetTouchLatch: true });
  closeUfoEquipmentWorkshopMenu({ resetTouchLatch: true });
  while (mapGroup.children.length) mapGroup.remove(mapGroup.children[0]);
  skyStationClock = null;
  skyStationGuide = null;
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
  ensureMarsReturnUfoPad();
  labelsGroup = new THREE.Group();
  mapGroup.add(makeGround(MAPS[state.map]));
  addMarsBoundaryFence(mapGroup, MAPS[state.map]);
  addMapEntry(mapGroup, MAPS[state.map]);
  if (state.map === "sky") {
    skyStationGuide = makeSkyStationGuide();
    mapGroup.add(skyStationGuide);
    addSkyStationGuidePhysics(skyStationGuide);
  }
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
  const inSpace = state.map === "space";
  els.sceneTitle.textContent = inSpace
    ? `${config.source.title}・UFO航行3D`
    : `${config.source.title}・正式3D`;
  els.mapDescription.textContent = config.source.description;
  document.querySelectorAll("[data-map]").forEach(button => button.classList.toggle("is-active", button.dataset.map === state.map));
  els.labelsButton.textContent = `建物名：${state.labels ? "表示" : "非表示"}`;
  els.labelsButton.disabled = inSpace;
  els.resetButton.disabled = inSpace;
  els.placeButton.disabled = inSpace || !state.selectedBuildId;
  els.cancelBuildButton.disabled = inSpace || !state.selectedBuildId;
  document.body.dataset.ufoWorldMap = state.map;
}

function updateBuildList() {
  els.buildList.innerHTML = "";
  const catalog = (MAPS[state.map].buildCatalog || []).filter(item => !item.internal);
  catalog.forEach(item => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "build-choice"; button.dataset.buildId = item.id;
    button.innerHTML = `<strong>${item.name}</strong><span>${item.note}</span>`;
    button.addEventListener("click", () => selectBuild(item.id));
    els.buildList.appendChild(button);
  });
  const selected = els.buildList.querySelector(`[data-build-id="${state.selectedBuildId}"]`);
  selected?.classList.add("is-selected");
  if (!catalog.length) {
    if (state.map === "space") {
      els.buildList.innerHTML = '<p class="muted">宇宙航行中は建造できません。</p>';
      els.buildMessage.textContent = "緊急帰還で雲マップの空駅入口へ戻れます。";
    } else if (state.map === "mars") {
      els.buildList.innerHTML = '<p class="muted">火星のUFO乗り場は常設です。</p>';
      els.buildMessage.textContent = "顔認証システムから搭乗して、UFOで帰還できます。";
    }
  }
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
    hands: hands.map(part => ({ part, basePosition: part.position.clone(), baseRotation: part.rotation.clone() })),
    feet: feet.map(part => ({ part, basePosition: part.position.clone(), baseRotation: part.rotation.clone() })),
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

function makeSkyStationGuide() {
  const guide = buildMatureStarCharacter360(SKY_STATION_GUIDE.characterId, { scale: .36 });
  guide.name = SKY_STATION_GUIDE.id;
  guide.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  const grounding = measureCharacterGrounding(guide, guide.userData?.feet ?? []);
  const [stationX, , stationZ] = normalizedPoint(MAPS.sky, MAPS.sky.entry.point);
  // 「駅からUFOの向き」を基準にする。案内人自身の位置からUFOへ振り向く
  // のではなく、空駅を出てUFOへ向かう進行方向をそのまま向かせる。
  const stationToUfoHeading = Math.atan2(
    UFO_PLACEMENT_POSITION.x - stationX,
    UFO_PLACEMENT_POSITION.z - stationZ,
  );
  guide.position.set(
    SKY_STATION_GUIDE.x,
    grounding.verticalOffset,
    SKY_STATION_GUIDE.z,
  );
  guide.rotation.set(0, stationToUfoHeading, 0);
  guide.userData.staticGuide = true;
  guide.userData.guideName = SKY_STATION_GUIDE.name;
  guide.userData.guideMotionRig = makeSkyStationGuideMotionRig(guide);
  return guide;
}

function makeSkyStationGuideMotionRig(guide) {
  const hands = guide.userData?.hands ?? [];
  const wingParts = [
    { side: -1, wingName: "comet-wing-left", veinName: "comet-wing-vein-left" },
    { side: 1, wingName: "comet-wing-right", veinName: "comet-wing-vein-right" },
  ].map(({ side, wingName, veinName }) => {
    const wing = guide.getObjectByName(wingName);
    const vein = guide.getObjectByName(veinName);
    if (!wing) return null;
    return {
      side,
      wing,
      wingBaseRotation: wing.rotation.clone(),
      vein,
      veinBaseRotation: vein?.rotation.clone() ?? null,
    };
  }).filter(Boolean);
  return {
    handPhase: 0,
    wingPhase: 0,
    hands: hands.map(part => ({
      part,
      basePosition: part.position.clone(),
      baseRotation: part.rotation.clone(),
    })),
    wings: wingParts,
  };
}

function addSkyStationGuidePhysics(guide) {
  // 手と羽根は待機アニメーションで常に位置が変わる。固定した見えない
  // 箱を残さないため、衝突面には停止している胴体・足の表示メッシュだけを
  // 使う。各メッシュの実際の world matrix と輪郭から当たり面を作る。
  const stableParts = [
    guide?.userData?.body,
    ...(guide?.userData?.feet ?? []),
  ].filter(part => part?.isMesh);
  if (!stableParts.length) return;
  const physicalParts = new Set(stableParts);
  const colliderStart = colliders.length;
  addVisualBuildingColliders(guide, `${SKY_STATION_GUIDE.id}-body`, {
    registerSurfaces: false,
    registerSurfaceEdges: false,
    includeObject: object => physicalParts.has(object),
  });
  // 会話を始める対象も、別の近似範囲ではなく上で登録した実表示メッシュの
  // 当たり面だけを参照する。案内人の物理と会話開始判定を同じ形状に保つ。
  guide.userData.guideColliders = colliders.slice(colliderStart);
}

function updateSkyStationGuideAnimation(delta) {
  const guide = skyStationGuide;
  const rig = guide?.userData?.guideMotionRig;
  if (!guide || !rig || state.map !== "sky") return;

  // メインキャラと同じ周期・可動幅で両手を左右へ往復させる。
  rig.handPhase = (rig.handPhase + delta * IDLE_HAND_CYCLE_SPEED) % (Math.PI * 2);
  const handSway = Math.sin(rig.handPhase);
  const [leftHand, rightHand] = rig.hands;
  if (leftHand && rightHand) {
    leftHand.part.position.set(
      leftHand.basePosition.x + IDLE_HAND_BODY_INSET + handSway * IDLE_HAND_SWING,
      leftHand.basePosition.y,
      leftHand.basePosition.z,
    );
    rightHand.part.position.set(
      rightHand.basePosition.x - IDLE_HAND_BODY_INSET - handSway * IDLE_HAND_SWING,
      rightHand.basePosition.y,
      rightHand.basePosition.z,
    );
    leftHand.part.rotation.copy(leftHand.baseRotation);
    rightHand.part.rotation.copy(rightHand.baseRotation);
  }

  // 翼本体と翼脈を同じ根元角度で揃えて動かし、片方だけ取り残されない
  // 「パタパタ」した羽ばたきにする。
  rig.wingPhase = (rig.wingPhase + delta * SKY_STATION_GUIDE_WING_FLAP_SPEED) % (Math.PI * 2);
  const flap = Math.sin(rig.wingPhase) * SKY_STATION_GUIDE_WING_FLAP_ANGLE;
  const fold = Math.sin(rig.wingPhase * 2) * SKY_STATION_GUIDE_WING_FOLD_ANGLE;
  rig.wings.forEach(({ side, wing, wingBaseRotation, vein, veinBaseRotation }) => {
    const applyWingPose = (part, baseRotation) => {
      if (!part || !baseRotation) return;
      part.rotation.set(
        baseRotation.x,
        baseRotation.y + side * fold,
        baseRotation.z + side * flap,
      );
    };
    applyWingPose(wing, wingBaseRotation);
    applyWingPose(vein, veinBaseRotation);
  });
}

function isSkyStationGuideDialogOpen() {
  return skyStationGuideDialogState.open;
}

function stopSkyStationGuideDialogTyping() {
  if (skyStationGuideDialogState.typeTimer !== null) {
    window.clearInterval(skyStationGuideDialogState.typeTimer);
    skyStationGuideDialogState.typeTimer = null;
  }
}

function playSkyStationGuideDialogTypeSfx() {
  const audio = new Audio(SKY_STATION_GUIDE_DIALOG_TYPE_SFX_URL);
  audio.preload = "auto";
  audio.volume = SKY_STATION_GUIDE_DIALOG_TYPE_SFX_VOLUME;
  audio.play().catch(() => {});
}

function updateSkyStationGuideDialogFooter() {
  const isReply = skyStationGuideDialogState.phase === "reply";
  const pageCount = skyStationGuideDialogState.pages.length;
  const isLastPage = skyStationGuideDialogState.pageIndex >= pageCount - 1;
  if (els.skyStationGuideDialogFooter) els.skyStationGuideDialogFooter.hidden = !isReply;
  if (els.skyStationGuideDialogPage) {
    els.skyStationGuideDialogPage.hidden = !isReply || pageCount < 2;
    els.skyStationGuideDialogPage.textContent = pageCount > 1
      ? `${skyStationGuideDialogState.pageIndex + 1} / ${pageCount}`
      : "";
  }
  if (els.skyStationGuideDialogNext) {
    els.skyStationGuideDialogNext.hidden = !isReply || skyStationGuideDialogState.isTyping;
    els.skyStationGuideDialogNext.textContent = isLastPage ? "とじる" : "つぎへ";
    els.skyStationGuideDialogNext.dataset.lastPage = String(isLastPage);
  }
}

function finishSkyStationGuideDialogPage() {
  const page = skyStationGuideDialogState.pages[skyStationGuideDialogState.pageIndex] ?? "";
  stopSkyStationGuideDialogTyping();
  skyStationGuideDialogState.isTyping = false;
  if (els.skyStationGuideDialogText) els.skyStationGuideDialogText.textContent = page;
  if (els.skyStationGuideDialog) els.skyStationGuideDialog.dataset.typing = "false";
  updateSkyStationGuideDialogFooter();
}

function showSkyStationGuideDialogPage(pageIndex) {
  const pages = skyStationGuideDialogState.pages;
  if (!pages.length || !els.skyStationGuideDialogText) return;
  stopSkyStationGuideDialogTyping();
  skyStationGuideDialogState.pageIndex = Math.max(0, Math.min(pages.length - 1, pageIndex));
  const page = String(pages[skyStationGuideDialogState.pageIndex] ?? "");
  const chars = [...page];
  let charIndex = 0;
  skyStationGuideDialogState.isTyping = chars.length > 0;
  els.skyStationGuideDialogText.textContent = "";
  if (els.skyStationGuideDialog) els.skyStationGuideDialog.dataset.typing = String(skyStationGuideDialogState.isTyping);
  updateSkyStationGuideDialogFooter();

  const revealNextCharacter = () => {
    if (!skyStationGuideDialogState.open || skyStationGuideDialogState.phase !== "reply") {
      stopSkyStationGuideDialogTyping();
      return;
    }
    els.skyStationGuideDialogText.textContent += chars[charIndex];
    if (charIndex % SKY_STATION_GUIDE_DIALOG_TYPE_INTERVAL === 0) playSkyStationGuideDialogTypeSfx();
    charIndex += 1;
    if (charIndex >= chars.length) finishSkyStationGuideDialogPage();
  };

  if (!chars.length) {
    finishSkyStationGuideDialogPage();
    return;
  }
  revealNextCharacter();
  if (skyStationGuideDialogState.isTyping) {
    skyStationGuideDialogState.typeTimer = window.setInterval(revealNextCharacter, SKY_STATION_GUIDE_DIALOG_TYPE_INTERVAL_MS);
  }
}

function advanceSkyStationGuideDialogPage() {
  if (!skyStationGuideDialogState.open || skyStationGuideDialogState.phase !== "reply") return;
  if (skyStationGuideDialogState.isTyping) {
    finishSkyStationGuideDialogPage();
    return;
  }
  if (skyStationGuideDialogState.pageIndex < skyStationGuideDialogState.pages.length - 1) {
    showSkyStationGuideDialogPage(skyStationGuideDialogState.pageIndex + 1);
    return;
  }
  closeSkyStationGuideDialog();
}

function closeSkyStationGuideDialog({ resetTouchLatch = false } = {}) {
  stopSkyStationGuideDialogTyping();
  skyStationGuideDialogState.open = false;
  skyStationGuideDialogState.phase = "idle";
  skyStationGuideDialogState.pages = [];
  skyStationGuideDialogState.pageIndex = 0;
  skyStationGuideDialogState.isTyping = false;
  if (resetTouchLatch) skyStationGuideDialogState.touchLatched = false;
  if (!els.skyStationGuideDialog) return;
  els.skyStationGuideDialog.hidden = true;
  els.skyStationGuideDialog.dataset.phase = "idle";
  els.skyStationGuideDialog.dataset.typing = "false";
  if (els.skyStationGuideDialogChoices) els.skyStationGuideDialogChoices.hidden = false;
  updateSkyStationGuideDialogFooter();
}

function openSkyStationGuideDialog() {
  if (!els.skyStationGuideDialog || skyStationGuideDialogState.open) return;
  skyStationGuideDialogState.open = true;
  skyStationGuideDialogState.phase = "greeting";
  skyStationGuideDialogState.pages = [];
  skyStationGuideDialogState.pageIndex = 0;
  skyStationGuideDialogState.isTyping = false;
  els.skyStationGuideDialog.hidden = false;
  els.skyStationGuideDialog.dataset.phase = "greeting";
  els.skyStationGuideDialog.dataset.typing = "false";
  if (els.skyStationGuideDialogSpeaker) els.skyStationGuideDialogSpeaker.textContent = SKY_STATION_GUIDE.name;
  if (els.skyStationGuideDialogText) els.skyStationGuideDialogText.textContent = SKY_STATION_GUIDE_DIALOG_GREETING;
  if (els.skyStationGuideDialogChoices) els.skyStationGuideDialogChoices.hidden = false;
  updateSkyStationGuideDialogFooter();
  window.requestAnimationFrame(() => {
    els.skyStationGuideDialogChoices?.querySelector("button")?.focus({ preventScroll: true });
  });
}

function selectSkyStationGuideDialogTopic(topicId) {
  const topic = SKY_STATION_GUIDE_DIALOG_TOPICS[topicId];
  if (!topic || !skyStationGuideDialogState.open || skyStationGuideDialogState.phase !== "greeting") return;
  const pages = Array.isArray(topic.pages) && topic.pages.length ? topic.pages : [topic.reply];
  skyStationGuideDialogState.pages = pages.map(page => String(page || "")).filter(Boolean);
  if (!skyStationGuideDialogState.pages.length) return;
  skyStationGuideDialogState.phase = "reply";
  skyStationGuideDialogState.pageIndex = 0;
  if (els.skyStationGuideDialogChoices) els.skyStationGuideDialogChoices.hidden = true;
  if (els.skyStationGuideDialog) els.skyStationGuideDialog.dataset.phase = "reply";
  showSkyStationGuideDialogPage(0);
}

function isTouchingSkyStationGuide() {
  const guideColliders = skyStationGuide?.userData?.guideColliders;
  if (state.map !== "sky" || !character || !Array.isArray(guideColliders) || !guideColliders.length) return false;
  const playerObb = characterCollisionObb(state.position.x, state.position.z);
  return guideColliders.some(collider => {
    if (!characterVerticallyOverlapsCollider(collider)) return false;
    if (collider.polygon?.length >= 3) {
      return polygonContact(playerObb, collider.polygon, SKY_STATION_GUIDE_DIALOG_CONTACT_MARGIN)?.intersects;
    }
    const guideObb = structureCollisionObb(collider);
    guideObb.halfX += SKY_STATION_GUIDE_DIALOG_CONTACT_MARGIN;
    guideObb.halfZ += SKY_STATION_GUIDE_DIALOG_CONTACT_MARGIN;
    return obbContact(playerObb, guideObb).intersects;
  });
}

function updateSkyStationGuideDialog() {
  const touching = isTouchingSkyStationGuide();
  if (!touching) {
    skyStationGuideDialogState.touchLatched = false;
    return;
  }
  if (!skyStationGuideDialogState.touchLatched && !skyStationGuideDialogState.open) {
    skyStationGuideDialogState.touchLatched = true;
    openSkyStationGuideDialog();
  }
}

function isUfoEquipmentWorkshopMenuOpen() {
  return ufoEquipmentWorkshopMenuState.open;
}

function getUfoEquipmentRecipe(recipeId) {
  return UFO_EQUIPMENT_RECIPES.find(recipe => recipe.id === recipeId) || null;
}

function isUfoEquipmentRecipeCrafted(recipe) {
  if (!recipe) return false;
  const equipment = state.ufoEquipment;
  if (recipe.id.startsWith("energy-absorption-tank")) {
    return equipment.energyAbsorptionTankLevel >= recipe.value;
  }
  if (recipe.id === "simultaneous-shot") return equipment.simultaneousShotEnabled === true;
  if (recipe.id === "lock-on-reticle-radar") return equipment.lockOnReticleMultiplier >= 1.2;
  if (recipe.id === "lock-on-range-radar") return equipment.lockOnDetectionMultiplier >= 1.2;
  return false;
}

function getUfoEquipmentEnergyAbsorptionMultiplier() {
  const level = clamp(Math.round(Number(state.ufoEquipment.energyAbsorptionTankLevel) || 0), 0, 2);
  return level >= 2 ? 1.5 : level === 1 ? 1.2 : 1;
}

function getUfoEquipmentLockOnReticleMultiplier() {
  return state.ufoEquipment.lockOnReticleMultiplier >= 1.2 ? 1.2 : 1;
}

function getUfoEquipmentLockOnDetectionMultiplier() {
  return state.ufoEquipment.lockOnDetectionMultiplier >= 1.2 ? 1.2 : 1;
}

function persistUfoEquipmentWorkshopState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(worldStateSnapshot()));
  state.saved = true;
  if (els.saveState) els.saveState.textContent = "保存済み";
}

function normalizeUfoWorkshopMaterialLedger(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const amount = candidate => Math.max(0, Math.floor(Number(candidate) || 0));
  // v1でゲームごとに分かれていた素材は、今回の共通素材へ失わず合算する。
  // 次回の保存で旧フィールドは書き出さないため、移行は一度だけ適用される。
  const legacyArcadeParts = amount(raw.arcadeAlloy) + amount(raw.controlChip);
  const ledger = {
    version: 2,
    cloudFiber: 0,
    skySightCrystal: 0,
    arcadeParts: amount(raw.arcadeParts) + legacyArcadeParts,
    updatedAt: amount(raw.updatedAt),
  };
  Object.keys(UFO_EQUIPMENT_MATERIALS).forEach(id => {
    if (id !== "arcadeParts") ledger[id] = amount(raw[id]);
  });
  return ledger;
}

function readUfoWorkshopMaterialLedger() {
  return normalizeUfoWorkshopMaterialLedger(safeJson(localStorage.getItem(UFO_WORKSHOP_MATERIAL_STORE_KEY)));
}

function writeUfoWorkshopMaterialLedger(value) {
  const ledger = normalizeUfoWorkshopMaterialLedger(value);
  ledger.updatedAt = Date.now();
  try {
    localStorage.setItem(UFO_WORKSHOP_MATERIAL_STORE_KEY, JSON.stringify(ledger));
  } catch (error) {
    console.warn("UFO倉庫素材を保存できませんでした。", error);
  }
  return ledger;
}

function getUfoEquipmentRecipeCostEntries(recipe) {
  return Object.entries(recipe?.costs || {})
    .map(([id, amount]) => ({
      id,
      amount: Math.max(0, Math.floor(Number(amount) || 0)),
      ...(UFO_EQUIPMENT_MATERIALS[id] || { label: id }),
    }))
    .filter(entry => entry.amount > 0);
}

function formatUfoEquipmentRecipeCost(recipe) {
  return getUfoEquipmentRecipeCostEntries(recipe)
    .map(entry => `${entry.label} ×${entry.amount}`)
    .join(" / ");
}

function getUfoEquipmentRecipeAvailability(recipe, materials = readUfoWorkshopMaterialLedger()) {
  const crafted = isUfoEquipmentRecipeCrafted(recipe);
  const prerequisite = recipe.requires ? getUfoEquipmentRecipe(recipe.requires) : null;
  const prerequisiteMissing = Boolean(prerequisite && !isUfoEquipmentRecipeCrafted(prerequisite));
  const missingCosts = getUfoEquipmentRecipeCostEntries(recipe)
    .map(entry => {
      const owned = Math.max(0, Math.floor(Number(materials[entry.id]) || 0));
      return { ...entry, owned, missing: Math.max(0, entry.amount - owned) };
    })
    .filter(entry => entry.missing > 0);
  return {
    crafted,
    prerequisite,
    prerequisiteMissing,
    missingCosts,
    canCraft: !crafted && !prerequisiteMissing && missingCosts.length === 0,
  };
}

function renderUfoEquipmentWorkshopMenu() {
  if (!els.ufoEquipmentWorkshopMenu) return;
  const materials = readUfoWorkshopMaterialLedger();
  const materialCountElements = {
    cloudFiber: els.ufoEquipmentWorkshopCloudFiberCount,
    skySightCrystal: els.ufoEquipmentWorkshopSkySightCrystalCount,
    arcadeParts: els.ufoEquipmentWorkshopArcadePartsCount,
  };
  Object.entries(materialCountElements).forEach(([id, element]) => {
    if (element) element.textContent = String(Math.max(0, Math.floor(Number(materials[id]) || 0)));
  });
  const list = els.ufoEquipmentWorkshopList;
  if (!list) return;
  list.replaceChildren();
  UFO_EQUIPMENT_RECIPES.forEach(recipe => {
    const availability = getUfoEquipmentRecipeAvailability(recipe, materials);
    const card = document.createElement("article");
    card.className = "ufo-equipment-workshop-card";
    card.dataset.status = availability.crafted
      ? "crafted"
      : availability.prerequisiteMissing
        ? "locked"
        : availability.canCraft
          ? "ready"
          : "missing-material";
    const title = document.createElement("h3");
    title.textContent = recipe.label;
    const cost = document.createElement("span");
    cost.className = "ufo-equipment-workshop-cost";
    cost.textContent = `必要素材：${formatUfoEquipmentRecipeCost(recipe)}`;
    const effect = document.createElement("p");
    effect.textContent = recipe.effect;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.ufoEquipmentRecipe = recipe.id;
    button.disabled = !availability.canCraft;
    if (availability.crafted) button.textContent = "装備済み";
    else if (availability.prerequisiteMissing) button.textContent = "Iを先に作成";
    else if (availability.missingCosts.length > 0) {
      button.textContent = `素材不足（${availability.missingCosts.map(entry => `${entry.label}あと${entry.missing}`).join(" / ")}）`;
    }
    else button.textContent = "作成して装備";
    button.addEventListener("click", () => craftUfoEquipment(recipe.id));
    button.addEventListener("pointerdown", event => event.stopPropagation());
    card.append(title, cost, effect, button);
    list.appendChild(card);
  });
  if (els.ufoEquipmentWorkshopStatus) {
    els.ufoEquipmentWorkshopStatus.textContent = "雲繊維・空見結晶は散歩、整備パーツはゲームセンターの全ゲームで入手。作成済みの装備は、次回の宇宙航行にも持ち越されます。";
  }
}

function craftUfoEquipment(recipeId) {
  const recipe = getUfoEquipmentRecipe(recipeId);
  if (!recipe) return false;
  const materials = readUfoWorkshopMaterialLedger();
  const availability = getUfoEquipmentRecipeAvailability(recipe, materials);
  if (availability.crafted) {
    showToast(`${recipe.label}はすでに装備済みです`);
    return false;
  }
  if (availability.prerequisiteMissing) {
    showToast(`${availability.prerequisite.label}を先に作成してください`);
    return false;
  }
  if (!availability.canCraft) {
    showToast(`素材不足：${availability.missingCosts.map(entry => `${entry.label} あと${entry.missing}`).join(" / ")}`);
    return false;
  }
  const updatedMaterials = { ...materials };
  getUfoEquipmentRecipeCostEntries(recipe).forEach(entry => {
    updatedMaterials[entry.id] = Math.max(0, (Number(updatedMaterials[entry.id]) || 0) - entry.amount);
  });
  writeUfoWorkshopMaterialLedger(updatedMaterials);
  if (recipe.id.startsWith("energy-absorption-tank")) {
    state.ufoEquipment.energyAbsorptionTankLevel = Math.max(
      state.ufoEquipment.energyAbsorptionTankLevel,
      recipe.value,
    );
  } else if (recipe.id === "simultaneous-shot") {
    state.ufoEquipment.simultaneousShotEnabled = true;
  } else if (recipe.id === "lock-on-reticle-radar") {
    state.ufoEquipment.lockOnReticleMultiplier = 1.2;
  } else if (recipe.id === "lock-on-range-radar") {
    state.ufoEquipment.lockOnDetectionMultiplier = 1.2;
  }
  persistUfoEquipmentWorkshopState();
  renderUfoEquipmentWorkshopMenu();
  showToast(`${recipe.label}を作成し、UFOへ装備しました`);
  return true;
}

function openUfoEquipmentWorkshopMenu() {
  if (!els.ufoEquipmentWorkshopMenu || ufoEquipmentWorkshopMenuState.open) return;
  keys.clear();
  touchVector.set(0, 0);
  touchPointerId = null;
  els.touchStick.style.transform = "translate(-50%, -50%)";
  ufoEquipmentWorkshopMenuState.open = true;
  els.ufoEquipmentWorkshopMenu.hidden = false;
  renderUfoEquipmentWorkshopMenu();
  window.requestAnimationFrame(() => {
    const firstAction = els.ufoEquipmentWorkshopList?.querySelector("button:not(:disabled)");
    (firstAction || els.ufoEquipmentWorkshopClose)?.focus({ preventScroll: true });
  });
}

function closeUfoEquipmentWorkshopMenu({ resetTouchLatch = false } = {}) {
  ufoEquipmentWorkshopMenuState.open = false;
  if (resetTouchLatch) ufoEquipmentWorkshopMenuState.touchLatched = false;
  if (els.ufoEquipmentWorkshopMenu) els.ufoEquipmentWorkshopMenu.hidden = true;
}

function isTouchingUfoEquipmentWarehouse() {
  if (state.map !== "sky" || !character) return false;
  const playerObb = characterCollisionObb(state.position.x, state.position.z);
  return colliders.some(collider => {
    if (collider.buildingId !== UFO_EQUIPMENT_WAREHOUSE_ID) return false;
    if (!characterVerticallyOverlapsCollider(collider)) return false;
    if (collider.polygon?.length >= 3) {
      return polygonContact(playerObb, collider.polygon, UFO_EQUIPMENT_WAREHOUSE_CONTACT_MARGIN)?.intersects;
    }
    const warehouseObb = structureCollisionObb(collider);
    warehouseObb.halfX += UFO_EQUIPMENT_WAREHOUSE_CONTACT_MARGIN;
    warehouseObb.halfZ += UFO_EQUIPMENT_WAREHOUSE_CONTACT_MARGIN;
    return obbContact(playerObb, warehouseObb).intersects;
  });
}

function updateUfoEquipmentWorkshopMenu() {
  if (state.map !== "sky") {
    if (ufoEquipmentWorkshopMenuState.open) closeUfoEquipmentWorkshopMenu({ resetTouchLatch: true });
    return;
  }
  const touching = isTouchingUfoEquipmentWarehouse();
  if (!touching) {
    ufoEquipmentWorkshopMenuState.touchLatched = false;
    return;
  }
  if (!ufoEquipmentWorkshopMenuState.touchLatched
    && !ufoEquipmentWorkshopMenuState.open
    && !isSkyStationGuideDialogOpen()) {
    ufoEquipmentWorkshopMenuState.touchLatched = true;
    openUfoEquipmentWorkshopMenu();
  }
}

function updateCharacterWalkAnimation(delta, active, movementScale = 1) {
  const rig = character?.userData?.walkRig;
  if (!rig || rig.hands.length < 2 || rig.feet.length < 2) return;
  character.rotation.x = 0;
  // UFO搭乗中に機体と共有した横傾斜を、降機後の歩行へ持ち越さない。
  character.rotation.z = 0;
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
  rig.feet.forEach(({ part, baseRotation }) => part.rotation.copy(baseRotation));

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

function updateCharacterSeatedPose(delta) {
  updateCharacterWalkAnimation(delta, false);
  const rig = character?.userData?.walkRig;
  if (!rig || rig.feet.length < 2) return;
  // The pilot seat faces local -Z. Keep the rear of Ren toward the rear
  // camera while giving the silhouette a small, readable seated lean instead
  // of leaving the full standing pose inside the cockpit.
  character.rotation.x = UFO_SEATED_BODY_TILT;
  rig.footBlend = 0;
  rig.feet.forEach(({ part, basePosition, baseRotation }, index) => {
    part.position.set(
      basePosition.x,
      basePosition.y - 2.2,
      rig.neutralFootZ + UFO_SEATED_FOOT_FORWARD + (index === 0 ? -1.2 : 1.2),
    );
    // Cancel the parent lean on the soles so both feet stay visually planted
    // on the seat/floor line rather than pointing down with the torso.
    part.rotation.copy(baseRotation);
    part.rotation.x -= UFO_SEATED_BODY_TILT;
  });
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
    // A raised surface is often touched by the character footprint before the
    // root reaches its top edge.  Resolve the shared step rule before the
    // penetration guard; otherwise that guard treats the valid jump onto a
    // seat, stair, or deck as deeper wall penetration and rejects the move.
    // This is deliberately based only on authored step metadata, so ordinary
    // walls and furniture remain solid.
    if (canPassStepCollider(c, stepTransition)) return false;
    if (fromInside) {
      // A safety margin is not a one-way trap. If an earlier landing leaves the
      // body inside that margin, any movement that strictly reduces overlap is
      // an escape movement and must remain available. Tangential movement that
      // preserves the same contact is also valid; only deeper penetration is
      // blocked. Requiring strict reduction here made a landed character freeze
      // beside every long wall or platform edge.
      if (!toInside || toContact.penetration <= fromContact.penetration + .001) return false;
    }
    // 終点だけが外側でも、移動線分が薄い柱・縁・角を横切っていれば
    // 表示メッシュの内部を通過している。移動は最大2.5単位に分割
    // されているが、薄い部材では始点と終点の両方が外側になり得るため、
    // ここで同じ衝突矩形を線分としても評価する。
    if (!fromInside && !toInside
      && characterVerticallyOverlapsCollider(c)
      && segmentIntersectsCollider(fromX, fromZ, x, z, c, 0)) {
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
  // RPG会話中は移動入力を止め、選択肢の操作に集中できるようにする。
  if (isSkyStationGuideDialogOpen() || isUfoEquipmentWorkshopMenuOpen()) return new THREE.Vector3();
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
  const control = ufoDoorControls[0];
  if ((!pad && state.map !== "space") || !control || !character) {
    resetUfoEngineRuntime({ resetCraft: false });
    return false;
  }
  const seatAnchor = ufoSeatWorldAnchor(control);
  state.position.set(seatAnchor.x, 0, seatAnchor.z);
  state.groundY = seatAnchor.y;
  state.jumpY = 0;
  state.jumpVelocity = 0;
  state.falling = false;
  state.moving = false;
  state.fastWalking = false;
  state.heading = control.seatHeadingLocal + control.rotation + state.ufoFlightHeading;
  // The same official 360-degree model used while walking remains the pilot.
  // Remove the box-shaped chair pieces from this rear view so they cannot be
  // mistaken for Ren's head or replace his silhouette.
  control.seatedViewBlockers?.forEach(mesh => { mesh.visible = false; });
  character.visible = true;
  updateCharacterSeatedPose(delta);
  // Inherit the complete craft attitude first, then add Ren's authored local
  // seat-facing direction and small seated-body lean. This keeps the pilot at
  // exactly the same pitch/roll as the UFO in all eight travel directions.
  character.quaternion.copy(control.craftAssembly.quaternion);
  character.rotateY(control.seatHeadingLocal || 0);
  character.rotateX(UFO_SEATED_BODY_TILT);
  const verticalOffset = character.userData?.grounding?.verticalOffset ?? 0;
  ufoPilotSeatedOffset.set(0, verticalOffset - UFO_SEATED_BODY_DROP, 0)
    .applyQuaternion(control.craftAssembly.quaternion);
  character.position.copy(seatAnchor).add(ufoPilotSeatedOffset);
  document.body.dataset.ufoPilotTiltDirection =
    document.body.dataset.ufoFlightTiltDirection || "level";
  document.body.dataset.ufoPilotPitch = (state.ufoFlightPitch || 0).toFixed(4);
  document.body.dataset.ufoPilotRoll = (state.ufoFlightRoll || 0).toFixed(4);
  if (characterShadow) characterShadow.visible = false;
  const flightInput = control.flight || {};
  const activeFlight = Math.abs(flightInput.forwardInput || 0)
    + Math.abs(flightInput.turnInput || 0)
    + Math.abs(flightInput.liftInput || 0)
    + Math.abs(flightInput.strafeInput || 0)
    + Math.abs(flightInput.autoAdvanceInput || 0) > .01;
  const accelerationLabel = state.ufoFlightAccelerationStage > 0
    ? "・加速中"
    : "";
  els.motionReadout.textContent = state.ufoEngineMode === "ready"
    ? (state.map === "space" && flightInput.autoAdvanceInput
      ? (isUfoForwardScrollActive(control)
        ? (Math.abs(flightInput.strafeInput || 0) + Math.abs(flightInput.liftInput || 0) > .01
          ? `火星航行を自動前進・回収中${accelerationLabel}`
          : "火星航行を自動前進中")
        : (Math.abs(flightInput.strafeInput || 0) > .01
          ? `救助航路を自動前進・左右操縦中${accelerationLabel}`
          : "救助航路を自動前進中"))
      : activeFlight ? `UFO操縦中${accelerationLabel}` : "UFO操縦待機")
    : "エンジン始動中";
  els.positionReadout.textContent = `${state.position.x.toFixed(1)}, ${state.position.z.toFixed(1)}`;
  els.coords.textContent = `X ${state.position.x.toFixed(1)} / Z ${state.position.z.toFixed(1)}`;
  els.headingReadout.textContent = state.ufoEngineMode === "ready" ? "UFO操縦席" : "固定着座";
  updateUfoControls();
  return true;
}

function updateCharacter(delta) {
  if (state.ufoBoarded && updateBoardedCharacter(delta)) return;
  ufoDoorControls.forEach(control => {
    control.seatedViewBlockers?.forEach(mesh => { mesh.visible = true; });
  });
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
  // Horizontal wall tests cannot detect a character moving only upward.
  // Resolve the rendered hemispherical canopy on the vertical axis as well,
  // so jumping in place or using a second/third jump never passes through it.
  constrainCharacterBelowUfoCapsule();
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
  // Horizontal movement can enter a lower part of the curved dome after the
  // pre-movement ceiling sample has already run. Re-sample at the accepted
  // end position in the same frame so no rendered frame can protrude through
  // the capsule before the next update corrects it.
  constrainCharacterBelowUfoCapsule();
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
  // Normal movement is already accepted/rejected by isBlocked(), and a turn
  // that would deepen an overlap is rejected by the orientation guard above.
  // Never run static SAT depenetration after an accepted walking or landing
  // frame: without the movement origin it mistakes a valid ramp-to-floor
  // transition for a stale embedded spawn and pushes the character backward.
  // Static recovery remains confined to map rebuild/spawn handling, where it
  // is explicitly requested and has an actual recovery purpose.
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
  detectUfoEngineSeatArrival();
  updateUfoControls();
}

function lerpAngle(a, b, t) { let delta = (b - a + Math.PI) % (Math.PI * 2) - Math.PI; return a + delta * t; }

function updateUfoFlightCameraFov() {
  if (!camera) return;
  const mission = ufoDoorControls[0]?.spaceForwardScroll;
  const forwardScroll = isUfoForwardScrollActive() && mission;
  const targetFov = forwardScroll
    ? (mission.phase === "playing" ? UFO_FORWARD_SCROLL_CRUISE_FOV : UFO_FORWARD_SCROLL_DEPARTURE_FOV)
    : UFO_CAMERA_BASE_FOV;
  // A wider fixed rear view increases peripheral flow without moving the
  // camera closer to the UFO or compromising the user-selected camera preset.
  const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, .105);
  if (Math.abs(nextFov - camera.fov) <= .015) return;
  camera.fov = nextFov;
  camera.updateProjectionMatrix();
}

function applyUfoForwardScrollDepartureCamera(control, mission, cameraPosition, cameraTarget) {
  const earth = control?.spaceEarth;
  const craft = control?.craftAssembly;
  if (!earth?.visible || !craft || mission?.phase !== "launch") return false;

  const progress = clamp(
    mission.phaseElapsed / Math.max(.001, UFO_FORWARD_SCROLL_LAUNCH_SECONDS),
    0,
    1,
  );
  // 外部ショットは上昇の後半で通常の操縦視点へ滑らかに引き継ぐ。切替の
  // 一瞬で地球が消えたり、カメラが跳んだりしないようにする。
  const exteriorWeight = 1 - THREE.MathUtils.smoothstep(progress, .58, .94);
  if (exteriorWeight <= .0001) return false;

  craft.updateWorldMatrix(true, true);
  earth.updateWorldMatrix(true, true);
  const craftCenter = craft.getWorldPosition(new THREE.Vector3());
  const earthCenter = earth.getWorldPosition(new THREE.Vector3());
  const forward = mission.forward;
  const right = mission.right;
  const up = mission.up;
  const departureCamera = mission.departureCamera;
  const departureTarget = mission.departureTarget;

  // 火星側・やや右上から、まず雲海を見下ろす構図。UFOは雲とカメラの間を
  // 上昇し、雲を抜けた後だけ地球が遠景として現れる。
  departureCamera.copy(craftCenter)
    .addScaledVector(forward, 940 - progress * 130)
    .addScaledVector(right, 620)
    .addScaledVector(up, 460 + progress * 85);
  const departureFocus = mission.departureCloudDeck?.focus || earthCenter;
  departureTarget.copy(departureFocus)
    .lerp(craftCenter, .38 + progress * .16)
    .addScaledVector(up, 76 + progress * 34);

  cameraPosition.lerp(departureCamera, exteriorWeight);
  cameraTarget.lerp(departureTarget, exteriorWeight);
  document.body.dataset.ufoEarthDepartureCamera = "external-earthside";
  return true;
}

function updateCamera() {
  updateUfoFlightCameraFov();
  const target = new THREE.Vector3(state.position.x, 38 + state.groundY + state.jumpY, state.position.z);
  if (UFO_LIGHT_VISUAL_TEST && state.ufoEngineMode === "ready") {
    const control = ufoDoorControls[0];
    const craftWorld = control?.craftAssembly
      ?.getWorldPosition(new THREE.Vector3()) || new THREE.Vector3();
    camera.position.set(craftWorld.x + 420, craftWorld.y + 225, craftWorld.z + 420);
    camera.lookAt(new THREE.Vector3(craftWorld.x, craftWorld.y - 80, craftWorld.z));
    return;
  }
  if (state.ufoActualAscentObserver) {
    const padTarget = new THREE.Vector3(UFO_PLACEMENT_POSITION.x, 10, UFO_PLACEMENT_POSITION.z);
    camera.position.set(
      UFO_PLACEMENT_POSITION.x + 175,
      155,
      UFO_PLACEMENT_POSITION.z + 185,
    );
    camera.lookAt(padTarget);
    return;
  }
  if (state.ufoBoarded && state.ufoEngineMode !== "idle") {
    // The engine-start sequence retains its established fixed cinematic shot.
    // Once piloting is ready, the button alternates only between the fixed
    // space view and the monster-eye view.
    const seat = new THREE.Vector3(state.position.x, state.groundY, state.position.z);
    const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));
    const selectedPreset = UFO_CAMERA_PRESETS[state.ufoCameraPresetIndex] || UFO_CAMERA_PRESETS[0];
    const activePreset = state.ufoEngineMode === "ready" ? selectedPreset : UFO_CAMERA_PRESETS[0];
    const cockpitTarget = seat.clone()
      .addScaledVector(forward, activePreset.targetForward)
      .add(new THREE.Vector3(0, activePreset.targetUp, 0));
    let cockpitCamera = seat.clone()
      .addScaledVector(forward, -activePreset.back)
      .add(new THREE.Vector3(0, activePreset.up, 0));
    if (state.ufoEngineMode === "ready" && activePreset.id === "monster-eye") {
      // 公式360度モデルの顔パーツ中心を使い、胴体の中央ではなく
      // 白ミチロードセイバーレンの目の高さ・前後位置から見る。
      character?.updateMatrixWorld(true);
      const eyeFeatures = character?.userData?.faceFeatures ?? [];
      if (eyeFeatures.length) {
        cockpitCamera = new THREE.Vector3();
        eyeFeatures.forEach(feature => cockpitCamera.add(feature.getWorldPosition(new THREE.Vector3())));
        cockpitCamera.multiplyScalar(1 / eyeFeatures.length);
      } else {
        cockpitCamera = seat.clone().add(new THREE.Vector3(0, 31, 0));
      }
      cockpitCamera.addScaledVector(forward, FIRST_PERSON_EYE_CLEARANCE);
      cockpitTarget.copy(cockpitCamera).addScaledVector(forward, activePreset.targetForward);
      cockpitTarget.y += activePreset.targetUp;
    } else if (state.map === "space") {
      // 固定画角は少し上向きにし、到着直後から火星側の流れを視界へ入れる。
      cockpitTarget.y = seat.y + UFO_SPACE_FIXED_CAMERA_TARGET_UP;
    }
    const forwardScrollMission = state.map === "space"
      ? ufoDoorControls[0]?.spaceForwardScroll
      : null;
    if (!applyUfoForwardScrollDepartureCamera(
      ufoDoorControls[0],
      forwardScrollMission,
      cockpitCamera,
      cockpitTarget,
    )) {
      delete document.body.dataset.ufoEarthDepartureCamera;
    }
    if (state.map === "space") {
      const control = ufoDoorControls[0];
      const earthCenter = control?.spaceEarthWorldCenter;
      const entryCraftY = control?.spaceEarthEntryCraftY;
      if (earthCenter && Number.isFinite(entryCraftY) && !control?.spaceEarth?.userData?.planetariumHidden) {
        const craftY = control.craftAssembly.getWorldPosition(new THREE.Vector3()).y;
        const descended = Math.max(0, entryCraftY - craftY);
        const earthReveal = THREE.MathUtils.smoothstep(descended, 110, 720);
        // At entry the established rear camera remains unchanged. As the UFO
        // descends, the target eases toward Earth so the globe rises naturally
        // into the lower half of the screen instead of popping into view.
        cockpitTarget.lerp(earthCenter, earthReveal * .78);
        document.body.dataset.ufoEarthReveal = earthReveal.toFixed(3);
      }
    }
    camera.position.copy(cockpitCamera);
    camera.lookAt(cockpitTarget);
    els.viewport.classList.remove("is-first-person");
    document.body.dataset.ufoCameraPreset = activePreset.id;
    document.body.dataset.ufoCameraDistance = camera.position.distanceTo(seat).toFixed(1);
    if (state.map === "space") {
      document.body.dataset.ufoSpaceCameraPreset = activePreset.id;
      document.body.dataset.ufoSpaceCameraPitch = activePreset.id === "monster-eye" ? "eye" : "upward-fixed";
    } else {
      delete document.body.dataset.ufoSpaceCameraPreset;
      delete document.body.dataset.ufoSpaceCameraPitch;
    }
    const cameraLabel = state.ufoEngineMode === "ready"
      ? `UFO・${activePreset.label}`
      : "エンジン始動演出";
    els.viewReadout.textContent = cameraLabel;
    els.cameraModeButton.textContent = `視点：${cameraLabel}`;
    els.cameraDistanceButton.textContent = `画角：${activePreset.label}`;
    els.touchHint.textContent = state.ufoEngineMode === "ready"
      ? isUfoForwardScrollActive()
        ? "高速火星航行：自動前進 / W・S 上下　A・D 左右（Gの掛かる軌道補正）"
        : "UFO操縦：W 上昇 / S 下降 / A 左移動 / D 右移動（前後・回転は画面レバー）"
      : "エンジン始動シーケンス中";
    return;
  }
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
  resetUfoEngineRuntime();
  state.map = key; resetPlayerToMapSpawn(key); state.selectedBuildId = null; state.ufoBoarded = false; state.ufoDoorOpen = false; state.ufoFaceAuth = false; state.ufoFaceAuthLatched = false; cancelBuild();
  if (scene) {
    scene.background = color(MAPS[key].palette.fog);
    scene.fog = new THREE.Fog(MAPS[key].palette.fog, 360, 780);
  }
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
    if (event.target.closest("#touchPad, #cameraDistanceButton, #emergencyEscapeButton, #ufoFlightControls, #ufoSpaceCombat")) return;
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

function setupUfoFlightControls() {
  if (!els.ufoFlightControls) return;
  const commandValues = {
    "lift-up": ["lift", 1],
    "lift-down": ["lift", -1],
    forward: ["forward", 1],
    reverse: ["forward", -1],
    "strafe-left": ["strafe", -1],
    "strafe-right": ["strafe", 1],
    "turn-left": ["turn", 1],
    "turn-right": ["turn", -1],
  };
  els.ufoFlightControls.querySelectorAll("[data-ufo-flight]").forEach(button => {
    let activeAxis = null;
    let activeValue = 0;
    const resolveCommand = () => {
      const command = button.dataset.ufoFlight;
      if (isUfoForwardScrollActive()) {
        if (command === "turn-left") return ["strafe", -1];
        if (command === "turn-right") return ["strafe", 1];
      }
      return commandValues[command] || [];
    };
    const release = event => {
      if (event && button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId);
      if (activeAxis && ufoFlightPointerInput[activeAxis] === activeValue) {
        ufoFlightPointerInput[activeAxis] = 0;
      }
      activeAxis = null;
      activeValue = 0;
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerdown", event => {
      if (state.ufoEngineMode !== "ready") return;
      const [axis, value] = resolveCommand();
      if (!axis) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      activeAxis = axis;
      activeValue = value;
      ufoFlightPointerInput[axis] = value;
      button.classList.add("is-pressed");
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => {
      if (activeAxis && ufoFlightPointerInput[activeAxis] === activeValue) {
        ufoFlightPointerInput[activeAxis] = 0;
      }
      activeAxis = null;
      activeValue = 0;
      button.classList.remove("is-pressed");
    });
  });
}

function setupUfoFlightPad() {
  if (!els.ufoFlightPad || !els.ufoFlightStick) return;
  const update = event => {
    const rect = els.ufoFlightPad.getBoundingClientRect();
    const radius = rect.width * .34;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.min(radius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    els.ufoFlightStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
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
  const end = event => {
    if (event.pointerId !== ufoFlightPadPointerId) return;
    ufoFlightPadPointerId = null;
    touchVector.set(0, 0);
    els.ufoFlightStick.style.transform = "translate(-50%, -50%)";
  };
  els.ufoFlightPad.addEventListener("pointerdown", event => {
    if (state.ufoEngineMode !== "ready") return;
    event.preventDefault();
    ufoFlightPadPointerId = event.pointerId;
    els.ufoFlightPad.setPointerCapture(event.pointerId);
    update(event);
  });
  els.ufoFlightPad.addEventListener("pointermove", event => {
    if (event.pointerId === ufoFlightPadPointerId) update(event);
  });
  els.ufoFlightPad.addEventListener("pointerup", end);
  els.ufoFlightPad.addEventListener("pointercancel", end);
  els.ufoFlightPad.addEventListener("lostpointercapture", end);
}

function startUfoActualAscentTestIfRequested() {
  const params = new URLSearchParams(location.search);
  if (params.get("ufoActualAscentTest") !== "1") return;
  const control = ufoDoorControls[0];
  if (!control?.craftAssembly || !control?.jet?.rotor) {
    document.body.dataset.ufoActualAscentTest = "missing-ufo";
    return;
  }
  state.ufoFlightX = 0;
  state.ufoFlightY = 0;
  state.ufoFlightZ = 0;
  state.ufoFlightHeading = 0;
  state.ufoFlightBasePitch = 0;
  state.ufoFlightBaseRoll = 0;
  state.ufoFlightPitch = 0;
  state.ufoFlightRoll = 0;
  state.ufoFlightDirectionalYaw = 0;
  state.ufoFlightRockPhase = 0;
  state.ufoFlightRockBlend = 0;
  state.ufoFlightWarningRockBlend = 0;
  state.ufoFlightRockAxisForward = 0;
  state.ufoFlightRockAxisStrafe = 0;
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  const seatAnchor = ufoSeatWorldAnchor(control);
  state.position.set(seatAnchor.x, 0, seatAnchor.z);
  state.groundY = seatAnchor.y;
  state.jumpY = 0;
  state.jumpVelocity = 0;
  state.falling = false;
  state.ufoBoarded = true;
  state.ufoEngineMode = "ready";
  state.ufoEngineRunning = true;
  state.ufoCabinLightAmount = 1;
  state.heading = control.seatHeadingLocal + control.rotation;
  state.viewHeading = state.heading;
  control.amount = 0;
  control.target = 0;
  setUfoCabinLightAmount(control, 1);
  updateUfoControls();
  const padStartY = control.buildingGroup.getWorldPosition(new THREE.Vector3()).y;
  const craftStartY = control.craftAssembly.getWorldPosition(new THREE.Vector3()).y;
  const rotorStartY = control.jet.rotor.getWorldPosition(new THREE.Vector3()).y;
  document.body.dataset.ufoActualAscentTest = "armed";
  // Use the same W-key input path as normal piloting. This is not a
  // transform shortcut: updateUfoFlight and updateUfoJetAnimation run every
  // rendered frame exactly as they do during user control.
  window.setTimeout(() => {
    keys.add("w");
    document.body.dataset.ufoActualAscentTest = "lifting";
  }, 500);
  const liftEndAt = UFO_LIGHT_VISUAL_TEST ? 14000 : 6500;
  window.setTimeout(() => {
    keys.delete("w");
    if (!UFO_LIGHT_VISUAL_TEST) keys.add("d");
    document.body.dataset.ufoActualAscentTest = UFO_LIGHT_VISUAL_TEST
      ? "hovering"
      : "moving-away";
  }, liftEndAt);
  window.setTimeout(() => {
    keys.delete("d");
    control.buildingGroup.updateWorldMatrix(true, true);
    control.craftAssembly.updateWorldMatrix(true, true);
    const padEndY = control.buildingGroup.getWorldPosition(new THREE.Vector3()).y;
    const craftEnd = control.craftAssembly.getWorldPosition(new THREE.Vector3());
    const rotorEnd = control.jet.rotor.getWorldPosition(new THREE.Vector3());
    document.body.dataset.ufoActualAscentPadRise = (padEndY - padStartY).toFixed(3);
    document.body.dataset.ufoActualAscentCraftRise = (craftEnd.y - craftStartY).toFixed(3);
    document.body.dataset.ufoActualAscentRotorRise = (rotorEnd.y - rotorStartY).toFixed(3);
    document.body.dataset.ufoActualAscentCraftX = craftEnd.x.toFixed(3);
    document.body.dataset.ufoActualAscentCraftZ = craftEnd.z.toFixed(3);
    document.body.dataset.ufoActualAscentTest = "complete";
    if (!UFO_LIGHT_VISUAL_TEST) {
      // The real-input measurement above is already complete. Move the craft
      // farther away only for the diagnostic camera, so the landing pad can be
      // inspected without the large saucer obscuring it.
      state.ufoFlightX += 220;
      applyUfoCraftWorldTransform(control);
      enforceUfoTurbineAttachment(control);
      state.ufoActualAscentObserver = true;
    }
  }, 14500);
}

function startUfoSpaceTransitionTestIfRequested() {
  const params = new URLSearchParams(location.search);
  const spaceTransitionTest = params.get("ufoSpaceTransitionTest") === "1";
  const spaceCombatTest = params.get("ufoSpaceCombatTest") === "1";
  const spaceRescueTest = params.get("ufoSpaceRescueTest") === "1";
  const gravityPinballTest = params.get("ufoGravityPinballTest") === "1";
  const salvagePortTest = params.get("ufoSalvagePortTest") === "1";
  const planetBowlingTest = params.get("ufoPlanetBowlingTest") === "1";
  const ringBattleTest = params.get("ufoRingBattleTest") === "1";
  const cranePortTest = params.get("ufoCranePortTest") === "1";
  const gravityMazeTest = params.get("ufoGravityMazeTest") === "1";
  const inertiaSlingshotTest = params.get("ufoInertiaSlingshotTest") === "1";
  const solarSailTest = params.get("ufoSolarSailTest") === "1";
  const marsRaceTest = params.get("ufoMarsRaceTest") === "1";
  const starMiningTest = params.get("ufoStarMiningTest") === "1";
  const planetariumTest = params.get("ufoPlanetariumTest") === "1";
  const forwardScrollTest = params.get("ufoForwardScrollTest") === "1";
  const earthReturnTestMode = params.get("ufoEarthReturnTest");
  const earthReturnTest = ["auto", "lateral"].includes(earthReturnTestMode);
  if (!spaceTransitionTest && !spaceCombatTest && !spaceRescueTest && !gravityPinballTest && !salvagePortTest && !planetBowlingTest && !ringBattleTest && !cranePortTest && !gravityMazeTest && !inertiaSlingshotTest && !solarSailTest && !marsRaceTest && !starMiningTest && !planetariumTest && !forwardScrollTest && !earthReturnTest) return;
  const control = ufoDoorControls[0];
  if (!control?.craftAssembly) {
    if (spaceTransitionTest) document.body.dataset.ufoSpaceTransitionTest = "missing-ufo";
    if (spaceCombatTest) document.body.dataset.ufoSpaceCombatTest = "missing-ufo";
    if (spaceRescueTest) document.body.dataset.ufoSpaceRescueTest = "missing-ufo";
    if (gravityPinballTest) document.body.dataset.ufoGravityPinballTest = "missing-ufo";
    if (salvagePortTest) document.body.dataset.ufoSalvagePortTest = "missing-ufo";
    if (planetBowlingTest) document.body.dataset.ufoPlanetBowlingTest = "missing-ufo";
    if (ringBattleTest) document.body.dataset.ufoRingBattleTest = "missing-ufo";
    if (cranePortTest) document.body.dataset.ufoCranePortTest = "missing-ufo";
    if (gravityMazeTest) document.body.dataset.ufoGravityMazeTest = "missing-ufo";
    if (inertiaSlingshotTest) document.body.dataset.ufoInertiaSlingshotTest = "missing-ufo";
    if (solarSailTest) document.body.dataset.ufoSolarSailTest = "missing-ufo";
    if (marsRaceTest) document.body.dataset.ufoMarsRaceTest = "missing-ufo";
    if (starMiningTest) document.body.dataset.ufoStarMiningTest = "missing-ufo";
    if (planetariumTest) document.body.dataset.ufoPlanetariumTest = "missing-ufo";
    if (forwardScrollTest) document.body.dataset.ufoForwardScrollTest = "missing-ufo";
    if (earthReturnTest) document.body.dataset.ufoEarthReturnTest = "missing-ufo";
    return;
  }
  if (spaceCombatTest || spaceRescueTest || gravityPinballTest || salvagePortTest || planetBowlingTest || ringBattleTest || cranePortTest || gravityMazeTest || inertiaSlingshotTest || solarSailTest || marsRaceTest || starMiningTest || planetariumTest || forwardScrollTest) {
    // Development-only direct entry for testing the rescue loop without the
    // long sky-edge traversal. Normal play always uses the real transition.
    // The UFO is normally already driven by the flight state when it reaches
    // the sky edge. A direct entry must first reconstruct that same local
    // flight state from the currently displayed craft transform; otherwise
    // the first flight frame snaps the UFO back to its old origin while the
    // rescue unit remains at the pre-snap position.
    control.craftAssembly.updateWorldMatrix(true, true);
    const craftWorldPosition = control.craftAssembly.getWorldPosition(new THREE.Vector3());
    const localFlightPosition = ufoWorldToLocal(
      control,
      craftWorldPosition.x,
      craftWorldPosition.z,
    );
    const scale = control.scale || BUILDING_SCALE;
    state.ufoFlightX = localFlightPosition.x;
    state.ufoFlightY = (craftWorldPosition.y - (control.originY || 0)) / scale;
    state.ufoFlightZ = localFlightPosition.z;
    state.ufoBoarded = true;
    state.ufoEngineMode = "ready";
    state.ufoEngineRunning = true;
    state.ufoCabinLightAmount = 1;
    setUfoCabinLightAmount(control, 1);
    applyUfoCraftWorldTransform(control);
    enforceUfoTurbineAttachment(control);
    state.ufoSpaceTransitioning = true;
    enterUfoSpaceMap(control, { side: "combat-test" }, ufoSpaceTransitionSequence);
    if (spaceCombatTest) document.body.dataset.ufoSpaceCombatTest = "armed";
    if (spaceRescueTest) document.body.dataset.ufoSpaceRescueTest = "armed";
    if (gravityPinballTest) {
      const armed = activateUfoGravityPinballTestMode(control);
      document.body.dataset.ufoGravityPinballTest = armed ? "armed" : "failed";
    }
    if (salvagePortTest) {
      const armed = activateUfoSalvagePortTestMode(control);
      document.body.dataset.ufoSalvagePortTest = armed ? "armed" : "failed";
    }
    if (planetBowlingTest) {
      const armed = activateUfoPlanetBowlingTestMode(control);
      document.body.dataset.ufoPlanetBowlingTest = armed ? "armed" : "failed";
    }
    if (ringBattleTest) {
      const armed = activateUfoRingBattleTestMode(control);
      document.body.dataset.ufoRingBattleTest = armed ? "armed" : "failed";
    }
    if (cranePortTest) {
      const armed = activateUfoCranePortTestMode(control);
      document.body.dataset.ufoCranePortTest = armed ? "armed" : "failed";
    }
    if (gravityMazeTest) {
      const armed = activateUfoGravityMazeTestMode(control);
      document.body.dataset.ufoGravityMazeTest = armed ? "armed" : "failed";
    }
    if (inertiaSlingshotTest) {
      const armed = activateUfoInertiaSlingshotTestMode(control);
      document.body.dataset.ufoInertiaSlingshotTest = armed ? "armed" : "failed";
    }
    if (solarSailTest) {
      const armed = activateUfoSolarSailTestMode(control);
      document.body.dataset.ufoSolarSailTest = armed ? "armed" : "failed";
    }
    if (marsRaceTest) {
      const armed = activateUfoMarsRaceTestMode(control);
      document.body.dataset.ufoMarsRaceTest = armed ? "armed" : "failed";
    }
    if (starMiningTest) {
      const armed = activateUfoStarMiningMode(control, { testMode: true, silent: true });
      document.body.dataset.ufoStarMiningTest = armed ? "armed" : "failed";
    }
    if (planetariumTest) document.body.dataset.ufoPlanetariumTest = "armed";
    if (forwardScrollTest) {
      document.body.dataset.ufoForwardScrollTest = isUfoForwardScrollActive(control)
        ? "armed"
        : "failed";
    }
    return;
  }
  const scale = control.scale || BUILDING_SCALE;
  const collision = control.flightCollision || {};
  const radius = (collision.radiusLocal ?? UFO_FLIGHT_COLLISION_RADIUS_LOCAL) * scale
    + UFO_FLIGHT_COLLISION_SKIN;
  const targetWorldX = MAPS.sky.world.width / 2 - radius - 1;
  const local = ufoWorldToLocal(control, targetWorldX, 0);
  state.ufoFlightX = local.x;
  state.ufoFlightY = 48;
  state.ufoFlightZ = local.z;
  // D入力がワールド東方向になる機首角度。実際の操縦入力経路で境界を
  // 越えさせ、座標の直接変更だけでテストを通さない。
  state.ufoFlightHeading = -(control.rotation || 0);
  state.ufoFlightBasePitch = 0;
  state.ufoFlightBaseRoll = 0;
  state.ufoFlightPitch = 0;
  state.ufoFlightRoll = 0;
  state.ufoFlightDirectionalYaw = 0;
  state.ufoBoarded = true;
  state.ufoEngineMode = "ready";
  state.ufoEngineRunning = true;
  state.ufoCabinLightAmount = 1;
  control.amount = 0;
  control.target = 0;
  setUfoCabinLightAmount(control, 1);
  applyUfoCraftWorldTransform(control);
  enforceUfoTurbineAttachment(control);
  const seatAnchor = ufoSeatWorldAnchor(control);
  state.position.set(seatAnchor.x, 0, seatAnchor.z);
  state.groundY = seatAnchor.y;
  state.heading = control.seatHeadingLocal + control.rotation + state.ufoFlightHeading;
  if (spaceTransitionTest) document.body.dataset.ufoSpaceTransitionTest = "armed";
  if (earthReturnTest) document.body.dataset.ufoEarthReturnTest = `${earthReturnTestMode}-armed`;
  updateUfoControls();
  window.setTimeout(() => {
    keys.add("d");
    if (spaceTransitionTest) document.body.dataset.ufoSpaceTransitionTest = "crossing";
    if (earthReturnTest) document.body.dataset.ufoEarthReturnTest = "crossing-space-edge";
  }, 350);
  // 地球帰還の内部表示テストは、広い空マップでも確実に外周を越えるまで
  // 横移動を保持する。通常プレイや公開URL（=1）には一切作用しない。
  const initialExitHoldMs = earthReturnTestMode === "lateral"
    ? 9000
    : earthReturnTest ? 3600 : 1500;
  window.setTimeout(() => keys.delete("d"), initialExitHoldMs);
}

function setupScene() {
  renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const initialSpaceView = state.map === "space" ? ufoSpaceViewMetrics() : null;
  scene = new THREE.Scene(); scene.background = color(MAPS[state.map].palette.fog); scene.fog = initialSpaceView
    ? new THREE.Fog(MAPS.space.palette.fog, initialSpaceView.fogNear, initialSpaceView.fogFar)
    : new THREE.Fog(MAPS[state.map].palette.fog, 360, 780); clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(UFO_CAMERA_BASE_FOV, 1, .1, initialSpaceView?.cameraFar ?? 6000); camera.position.set(0, 110, 190);
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
  rebuildMap();
  runUfoFlightCollisionSelfTestIfRequested();
  startUfoSpaceTransitionTestIfRequested();
  startUfoActualAscentTestIfRequested();
  updateCamera();
  const resize = () => { const rect = els.viewport.getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); camera.aspect = rect.width / Math.max(1, rect.height); camera.updateProjectionMatrix(); }; window.addEventListener("resize", resize); resize();
  els.statusText.textContent = "歩行可能";
  requestAnimationFrame(frame);
}

function frame() {
  const delta = Math.min(.05, clock.getDelta());
  updateSkyStationClock();
  updateUfoEngineSequence(delta); updateUfoDoorAnimation(delta); updateUfoFlight(delta); updateUfoForwardScrollMission(delta); updateUfoStarMiningMission(delta); updateUfoMarsRaceMission(delta); updateUfoSolarSailMission(delta); updateUfoInertiaSlingshotMission(delta); updateUfoJetAnimation(delta); updateSpaceEarthAnimation(delta); updateSpaceExplorableStarfield(delta); updateUfoGravityPinballMission(delta); updateUfoSalvagePortMission(delta); updateUfoPlanetBowlingMission(delta); updateUfoRingBattleMission(delta); updateUfoCranePortMission(delta); updateUfoGravityMazeMission(delta); updateUfoSpaceRescueMission(delta); updateSpaceDustAnimation(delta); updateUfoSpaceCombat(delta); updateCharacter(delta); updateSkyStationGuideAnimation(delta); updateSkyStationGuideDialog(); updateUfoEquipmentWorkshopMenu(); updateCamera(); updatePhysicsDebugContact(); renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function wireUI() {
  // Engine start and ground takeoff happen after earlier player actions. Prime
  // both supplied sounds on the first real gesture so delayed playback remains
  // reliable on mobile and desktop browsers.
  window.addEventListener("pointerdown", primeUfoAudio, { once: true, capture: true });
  window.addEventListener("keydown", primeUfoAudio, { once: true, capture: true });
  window.addEventListener("storage", event => {
    if (event.key !== UFO_WORKSHOP_MATERIAL_STORE_KEY || !isUfoEquipmentWorkshopMenuOpen()) return;
    renderUfoEquipmentWorkshopMenu();
  });
  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (isUfoEquipmentWorkshopMenuOpen()) {
      if (key === "escape") closeUfoEquipmentWorkshopMenu();
      const gameInput = [" ", "w", "a", "s", "d", "x", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key);
      if (key === "escape" || gameInput) event.preventDefault();
      return;
    }
    if (isSkyStationGuideDialogOpen()) {
      const gameInput = [" ", "w", "a", "s", "d", "x", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key);
      if (gameInput) event.preventDefault();
      return;
    }
    if (state.ufoEngineMode === "ready" && key === "f" && !event.repeat) {
      if (state.map === "space" && isUfoForwardScrollActive()) {
        // 前進スクロール中のロック星射撃はSpaceキーに限定する。
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceStarMining?.active) {
        useUfoStarMiningAction();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceSolarSail?.active) {
        useUfoSolarSailAction();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceInertiaSlingshot?.active) {
        useUfoInertiaSlingshotTether();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceGravityMaze?.active) {
        useUfoGravityMazePulse();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceCranePort?.active) {
        handleUfoCranePortAction();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceRingBattle?.active) {
        startUfoRingBattleRam();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceBowling?.active) {
        startUfoPlanetBowlingShot();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceSalvage?.active) {
        startUfoSalvagePortPush();
      } else if (state.map === "space" && ufoDoorControls[0]?.spacePinball?.active) {
        handleUfoGravityPinballAction();
      } else if (state.map === "space" && ufoDoorControls[0]?.spaceRescue) {
        handleUfoSpaceRescueAction();
      } else {
        fireUfoSpaceShot();
      }
      event.preventDefault();
      return;
    }
    if (state.ufoEngineMode === "ready"
      && key === " "
      && state.map === "space"
      && isUfoForwardScrollActive()) {
      // OSごとのキーリピートは、物理的にSpaceを離さない限り連打に
      // 数えない。これにより長押しでは必ず低速連射だけが動く。
      const isFreshSpacePress = !keys.has(key);
      keys.add(key);
      if (isFreshSpacePress) requestUfoForwardScrollManualShot();
      event.preventDefault();
      return;
    }
    if (state.ufoEngineMode === "ready" && (key === " " || key === "x")) {
      event.preventDefault();
      return;
    }
    if (key === " " && !event.repeat) {
      triggerJump();
      event.preventDefault();
      return;
    }
    const movementKey = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key);
    if (state.ufoEngineMode === "ready" && movementKey) {
      keys.add(key);
      event.preventDefault();
      return;
    }
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
    if (state.ufoBoarded && state.ufoEngineMode !== "idle") {
      state.ufoCameraPresetIndex = (state.ufoCameraPresetIndex + 1) % UFO_CAMERA_PRESETS.length;
      const preset = UFO_CAMERA_PRESETS[state.ufoCameraPresetIndex];
      showToast(`UFOカメラ：${preset.label}`);
      return;
    }
    state.cameraDistanceIndex = (state.cameraDistanceIndex + 1) % THIRD_PERSON_DISTANCE_PRESETS.length;
    const preset = THIRD_PERSON_DISTANCE_PRESETS[state.cameraDistanceIndex];
    showToast(`三人称カメラ：${preset.label}`);
  });
  els.cameraDistanceButton.addEventListener("pointerdown", event => event.stopPropagation());
  els.emergencyEscapeButton.addEventListener("click", emergencyEscape);
  els.emergencyEscapeButton.addEventListener("pointerdown", event => event.stopPropagation());
  els.skyStationGuideDialogChoices?.querySelectorAll("[data-guide-dialog-topic]").forEach(button => {
    button.addEventListener("click", () => selectSkyStationGuideDialogTopic(button.dataset.guideDialogTopic));
    button.addEventListener("pointerdown", event => event.stopPropagation());
  });
  els.skyStationGuideDialogNext?.addEventListener("click", advanceSkyStationGuideDialogPage);
  els.skyStationGuideDialogNext?.addEventListener("pointerdown", event => event.stopPropagation());
  els.ufoEquipmentWorkshopClose?.addEventListener("click", () => closeUfoEquipmentWorkshopMenu());
  els.ufoEquipmentWorkshopClose?.addEventListener("pointerdown", event => event.stopPropagation());
  els.ufoEquipmentWorkshopMenu?.addEventListener("pointerdown", event => event.stopPropagation());
  els.ufoSpaceFireButton?.addEventListener("click", () => {
    if (isUfoForwardScrollActive()) {
      fireUfoForwardScrollLockOn();
      return;
    } else if (ufoDoorControls[0]?.spaceStarMining?.active) useUfoStarMiningAction();
    else if (ufoDoorControls[0]?.spaceMarsRace?.active) useUfoMarsRaceAfterimage();
    else if (ufoDoorControls[0]?.spaceSolarSail?.active) useUfoSolarSailAction();
    else if (ufoDoorControls[0]?.spaceInertiaSlingshot?.active) useUfoInertiaSlingshotTether();
    else if (ufoDoorControls[0]?.spaceGravityMaze?.active) useUfoGravityMazePulse();
    else if (ufoDoorControls[0]?.spaceCranePort?.active) handleUfoCranePortAction();
    else if (ufoDoorControls[0]?.spaceRingBattle?.active) startUfoRingBattleRam();
    else if (ufoDoorControls[0]?.spaceBowling?.active) startUfoPlanetBowlingShot();
    else if (ufoDoorControls[0]?.spaceSalvage?.active) startUfoSalvagePortPush();
    else if (ufoDoorControls[0]?.spacePinball?.active) handleUfoGravityPinballAction();
    else handleUfoSpaceRescueAction();
  });
  els.ufoSpaceFireButton?.addEventListener("pointerdown", event => event.stopPropagation());
  els.ufoSpaceStartButton?.addEventListener("click", () => {
    if (isUfoForwardScrollActive()) activateUfoForwardScrollMission(ufoDoorControls[0]);
    else if (ufoDoorControls[0]?.spaceMarsRace?.active) startUfoMarsRace();
    else if (ufoDoorControls[0]?.spaceSolarSail?.active) startUfoSolarSailRoute();
    else if (ufoDoorControls[0]?.spaceInertiaSlingshot?.active) startUfoInertiaSlingshotRoute();
    else if (ufoDoorControls[0]?.spaceGravityMaze?.active) startUfoGravityMazeRound();
    else if (ufoDoorControls[0]?.spaceCranePort?.active) startUfoCranePortRound();
    else if (ufoDoorControls[0]?.spaceRingBattle?.active) startUfoRingBattleRound();
    else if (ufoDoorControls[0]?.spaceBowling?.active) startUfoPlanetBowlingRound();
    else if (ufoDoorControls[0]?.spaceSalvage?.active) startUfoSalvagePortRound();
    else if (ufoDoorControls[0]?.spacePinball?.active) startUfoGravityPinballRound();
    else startUfoSpaceRescueMission();
  });
  els.ufoSpaceStartButton?.addEventListener("pointerdown", event => event.stopPropagation());
  els.ufoSpaceReturnButton?.addEventListener("click", emergencyEscape);
  els.ufoSpaceReturnButton?.addEventListener("pointerdown", event => event.stopPropagation());
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
  setupUfoFlightControls();
  setupUfoFlightPad();
}

loadState();
wireUI();
setupScene();
