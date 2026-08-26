export const IMASORA_WORLD_SCHEMA_VERSION = 4;

const map = ({ world = {}, source, palette, spawn, entry, fixedStructures = [], buildZones, decoration, buildCatalog }) => ({
  // 正式マップは 1536 x 1024（3:2）。3Dでも同じ比率を保持し、
  // 画像上の百分率をそのままワールド座標へ変換する。
  world: { width: 540, depth: 360, ...world },
  source: { aspectRatio: 3 / 2, axis: "screen-x-to-world-x / screen-y-to-world-z", ...source },
  palette,
  spawn,
  entry,
  fixedStructures,
  buildZones,
  decoration,
  buildCatalog,
});

export const IMASORA_WORLD_MAPS = Object.freeze({
  sky: map({
    // 駅と鉄道を実寸で分離できる広さへ拡張。3:2 の正式マップ比率は維持する。
    world: { width: 1200, depth: 800 },
    source: {
      title: "空マップ",
      description: "雲の床を歩き、雲づくり工房を建てます。",
      layout: "正式マップと同一の1536×1024座標、駅・線路・鉄道・工房レイヤー",
      pixelSize: [1536, 1024],
      composite: "official-sky-layer-composite-v1",
      references: ["assets/imasora-sky-map.js", "assets/imasora-sky-map.css"],
    },
    palette: { ground: 0xb7d9ee, edge: 0x6ab7e5, fog: 0x90c9f1, accent: 0x8de9ff },
    // 空駅の正面通路から開始。正式レイヤー上の駅を最初から確認できる位置。
    spawn: { point: [.46, .3], heading: Math.PI * .25 },
    entry: {
      id: "sky-station",
      name: "空駅",
      type: "rail-station",
      point: [.3515, .15],
      sourceRect: [.259, .04, .185, .22],
      platformSize: [99.9, 79.2],
      footprint: [80, 58],
      color: 0xf3d079,
    },
    fixedStructures: [
      {
        id: "sky-train", name: "空行き鉄道", type: "sky-train",
        // 駅舎の占有範囲へ線路軸が入らない位置まで平行移動し、
        // 駅横の乗り場出口だけをホーム外縁へ接続する。
        // 白レン基準で車両幅・軌間が小さく見えない実寸寄りの倍率。
        point: [.113333, .1075], sourceRect: [-.036, .108, .4495, .1957],
        rotationDeg: -55, footprint: [34, 234], trackLength: 2400, scale: 1.8,
        reverseRollingStock: true,
      },
      {
        id: "cloud-workshop", name: "雲づくり工房", type: "cloud-workshop",
        point: [.86585, .2802], sourceRect: [.7861, .1894, .1595, .1816],
        footprint: [78, 55], size: [78, 60, 55],
      },
    ],
    buildZones: [
      { id: "sky-garden-zone", name: "空中庭園区画", point: [.65, .66], size: [112, 72] },
    ],
    decoration: {
      cloudClusters: [
        { point: [.18, .29], scale: 1.15 }, { point: [.6, .23], scale: 1.6 },
        { point: [.84, .47], scale: 1.2 },
        // UFO乗り場の上に重ならないよう、左端の雲海へ移動。
        { point: [.08, .72], scale: 1.45 },
        { point: [.61, .78], scale: 1.2 },
      ],
    },
    buildCatalog: [
      { id: "sky-garden", name: "空中庭園", note: "白レンが歩ける大型休憩所", color: 0xa8efcf, size: [74, 48, 62] },
      { id: "ufo-pad", name: "UFO乗り場", note: "今いる場所に設置する着陸パッド", color: 0x8de9ff, size: [92, 8, 92], placement: "current" },
    ],
  }),
  coast: map({
    source: {
      title: "海岸マップ",
      description: "正式な海岸マップの道路・海岸・6区画を、そのまま歩ける3Dワールドです。",
      layout: "海岸の街ベース画像に描かれた橋2・道路・海岸・6区画を同一比率で投影",
      pixelSize: [1536, 1024],
      texture: "./assets/imasora-coastal-town-base-v1.png",
      references: ["assets/imasora-coastal-town-base-v1.png", "assets/imasora-coastal-town-map.js"],
    },
    palette: { ground: 0xdabf87, edge: 0x6dbbd0, fog: 0xb2d9e4, accent: 0xffd37c },
    spawn: { point: [.27, .28], heading: Math.PI * .35 },
    entry: {
      id: "coast-bridge",
      name: "橋2",
      type: "bridge-road",
      point: [.145, .125],
      platformSize: [112, 42],
      footprint: [118, 48],
      rotationDeg: -35,
      color: 0xa7d4de,
      terrainOnly: true,
    },
    buildZones: [
      { id: "coast-plot-north", name: "海岸北区画", point: [.7344, .1426], size: [106, 58] },
      { id: "coast-plot-center", name: "海岸中央区画", point: [.5492, .2461], size: [116, 58] },
      { id: "coast-plot-west", name: "海岸西区画", point: [.3932, .3574], size: [84, 55] },
      { id: "coast-plot-east", name: "海岸東区画", point: [.6823, .3608], size: [96, 58] },
      { id: "coast-plot-southwest", name: "海岸南西区画", point: [.2542, .4541], size: [122, 72] },
      { id: "coast-plot-south", name: "海岸南区画", point: [.4004, .6006], size: [126, 66] },
    ],
    decoration: {
      waterPlanes: [{ point: [.76, .82], size: [366, 174], color: 0x218bbb }],
    },
    buildCatalog: [
      { id: "coast-house", name: "海岸の家", note: "白レンが暮らせる実寸の家", color: 0xffd8b1, size: [76, 58, 66] },
      { id: "coast-deck", name: "海辺デッキ", note: "白レンが歩ける大型デッキ", color: 0xa8e8e5, size: [82, 36, 58] },
    ],
  }),
  construction: map({
    source: {
      title: "工事現場",
      description: "橋1から続く正式な造成地を、そのまま歩いて建造できる3Dワールドです。",
      layout: "工事現場ベース画像に描かれた左上の橋1接続路と造成地を同一比率で投影",
      pixelSize: [1536, 1024],
      texture: "./assets/imasora-land-map-base-v1.png",
      references: ["assets/imasora-land-map-base-v1.png", "assets/imasora-land-map.js"],
    },
    palette: { ground: 0xa86f46, edge: 0x6e482f, fog: 0xb98e69, accent: 0xffb569 },
    spawn: { point: [.28, .27], heading: Math.PI * .25 },
    entry: {
      id: "construction-bridge",
      name: "橋1",
      type: "bridge-road",
      point: [.145, .125],
      platformSize: [126, 42],
      footprint: [132, 48],
      rotationDeg: -35,
      color: 0x4d5560,
      terrainOnly: true,
    },
    buildZones: [
      { id: "construction-main-zone", name: "中央造成区画", point: [.61, .5], size: [132, 108] },
      { id: "construction-east-zone", name: "東造成区画", point: [.78, .31], size: [108, 90] },
      { id: "construction-south-zone", name: "南造成区画", point: [.43, .72], size: [116, 96] },
    ],
    decoration: {
      tireTracks: [-.34, -.17, 0, .17, .34],
      materialPiles: [
        { point: [.28, .4] }, { point: [.52, .49] }, { point: [.76, .64] },
      ],
    },
    buildCatalog: [
      { id: "workshop", name: "街づくり工房", note: "白レンが作業できる実寸の拠点", color: 0xffc16e, size: [82, 62, 70] },
      { id: "storage", name: "資材倉庫", note: "大型資材を保管できる倉庫", color: 0xc7d8dd, size: [76, 52, 64] },
    ],
  }),
});

export function normalizedPoint(config, point, y = 0) {
  return [
    (point[0] - .5) * config.world.width,
    y,
    (point[1] - .5) * config.world.depth,
  ];
}

export function mapSpawn(config) {
  const [x, y, z] = normalizedPoint(config, config.spawn.point);
  return { x, y, z, heading: config.spawn.heading };
}

export function mapBuildZone(config, index = 0) {
  const zone = config.buildZones[index] || config.buildZones[0];
  const [x, y, z] = normalizedPoint(config, zone.point);
  return { ...zone, position: [x, y, z] };
}
