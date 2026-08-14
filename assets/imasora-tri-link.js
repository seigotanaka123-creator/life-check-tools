import * as THREE from "./three.module.min.js";
import { buildWhiteMichiRoadSaberRen360 } from "./imasora-character-360.js";

const ARENA_RADIUS = 360;
const PUCK_RADIUS = 18;
const MALLET_RADIUS = 38;
const GOAL_HALF_ANGLE = 0.225;
const GOAL_DEPTH = 74;
const FIXED_STEP = 1 / 120;
const MATCH_SECONDS = 90;
const MAX_PUCK_SPEED = 1040;
const MALLET_MAX_SPEED = 920;
const MALLET_ACCELERATION = 5100;
const MALLET_RESPONSE = 17.5;
const SERVE_SPEED_MIN = 112;
const SERVE_SPEED_MAX = 148;
const SERVE_GRACE_SECONDS = .72;
const SERVE_SOFT_WINDOW = 1.35;
const SERVE_SOFT_MAX_SPEED = 330;
const MALLET_MIN_RADIUS = ARENA_RADIUS * 0.25;
const MALLET_MAX_RADIUS = ARENA_RADIUS * 0.77;
const MALLET_START_RADIUS = ARENA_RADIUS * 0.74;
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
const REACTIONS = Object.freeze({
  strike: ["いけっ！", "そこ！", "リンク！", "決める！"],
  cheer: ["ナイス！", "やった！", "ゴール！", "よしっ！"],
  hurt: ["くっ…！", "まだ！", "次こそ！", "うわっ！"],
  out: ["あとは任せた！", "悔しい…！", "見届けるよ！"]
});

let mountedGame = null;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const randomBetween = (min, max) => min + Math.random() * (max - min);
const choose = values => values[Math.floor(Math.random() * values.length)];

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
    this.destroyed = false;
    this.running = false;
    this.finished = false;
    this.resultPresented = false;
    this.countdown = 0;
    this.countdownMark = null;
    this.serveTimer = 0;
    this.serveGrace = 0;
    this.serveSoftWindow = 0;
    this.timeRemaining = MATCH_SECONDS;
    this.lastTimestamp = 0;
    this.accumulator = 0;
    this.elapsed = 0;
    this.frame = 0;
    this.pointerId = null;
    this.dragging = false;
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
    this.victoryFocus = null;
    this.comboCount = 0;
    this.comboExpiresAt = 0;
    this.lastImpactPower = 0;
    this.avatarTextureUrls = [];
    this.avatarLoadedCount = 0;
    this.lastTouch = null;
    this.roundPath = [];
    this.decisivePath = [];
    this.matchId = `tri-link-3d-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.puck = { x: 0, z: 0, vx: 0, vz: 0, visible: true, lastHitAt: -10, lastHitBy: -1 };
    this.players = this.participants.map((participant, index) => this.makePlayer(participant, index));
    this.boundLoop = timestamp => this.loop(timestamp);
    this.boundResize = () => this.resize();
  }

  makePlayer(participant, index) {
    const angle = PLAYER_ANGLES[index];
    const radius = MALLET_START_RADIUS;
    return {
      ...participant,
      index,
      angle,
      lives: 3,
      active: true,
      goalsFor: 0,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      vx: 0,
      vz: 0,
      targetX: Math.cos(angle) * radius,
      targetZ: Math.sin(angle) * radius,
      lastStrikeAt: -10,
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
    this.bindEvents();
    this.setupThree();
    this.renderMemories();
    this.updateScoreboard();
    this.resize();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  ensureStylesheet() {
    if (document.getElementById("imasora-tri-link-modern-style")) return;
    const link = document.createElement("link");
    link.id = "imasora-tri-link-modern-style";
    link.rel = "stylesheet";
    link.href = "./assets/imasora-tri-link-modern.css?v=20260813-modern-arena";
    document.head.appendChild(link);
  }

  markup() {
    return `<section class="itl3-shell itl3-modern" aria-label="イマソラ・トライリンク 3D対戦">
      <header class="itl3-gamebar">
        <div class="itl3-brand"><i class="itl3-brand-mark" aria-hidden="true"><span></span></i><div class="itl3-brand-copy"><small>IMASORA ARCADE // NEXT MATCH SYSTEM</small><strong>TRI-LINK <em>ARENA</em></strong></div></div>
        <div class="itl3-season"><span>PHYSICS LEAGUE</span><b>EXHIBITION</b></div>
        <div class="itl3-clock"><span>ROUND TIME</span><b data-itl3-clock>${MATCH_SECONDS}</b></div>
        <button class="itl3-exit" type="button" data-itl3-exit aria-label="アリーナを終了してゲーム機選択へ戻る"><span>EXIT</span><b>終了</b></button>
      </header>
      <div class="itl3-stage-shell" data-itl3-stage>
        <canvas class="itl3-canvas" data-itl3-canvas aria-label="3人の相棒が戦う立体エアホッケー盤"></canvas>
        <div class="itl3-scoreboard">${this.players.map(player => this.scoreCardMarkup(player)).join("")}</div>
        <div class="itl3-characters" data-itl3-characters>${this.players.map(player => this.characterMarkup(player)).join("")}</div>
        <div class="itl3-message" data-itl3-message><small data-itl3-message-kicker>PHYSICS LINK</small><strong data-itl3-message-main>READY</strong></div>
        <div class="itl3-combat-hud" aria-hidden="true"><div class="itl3-speed"><small>PUCK SPEED</small><b data-itl3-speed>000</b><i><span data-itl3-speed-bar></span></i></div><div class="itl3-combo" data-itl3-combo><small>IMPACT CHAIN</small><b>LINK <span>1</span></b></div></div>
        <div class="itl3-corner-bracket itl3-corner-bracket-a" aria-hidden="true"></div><div class="itl3-corner-bracket itl3-corner-bracket-b" aria-hidden="true"></div>
        <div class="itl3-opening" data-itl3-opening>
          <div class="itl3-opening-card">
            <div class="itl3-opening-eyebrow"><span>LIVE</span> THREE SOULS // ONE PUCK</div>
            <small>3D PHYSICS BATTLE ARENA</small>
            <h2>軌道を読み、<br><em>最後の一人</em>になれ。</h2>
            <p>育成中の相棒を直接なぞって操作。反射角も衝突も、結果を決めるのは盤上の物理だけ。守備灯を3つ守り抜け。</p>
            <div class="itl3-roster-preview">${this.players.map(player => `<div class="itl3-roster-unit" style="--itl3-color:${escapeHtml(player.color)}"><div class="itl3-roster-art">${player.art}</div><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(player.roleLabel)}</span></div>`).join("")}</div>
            <button class="itl3-primary" type="button" data-itl3-start><span>ENTER THE ARENA</span><b>マッチ開始</b><i aria-hidden="true">›</i></button>
          </div>
        </div>
        <div class="itl3-control-hint"><i aria-hidden="true"></i><span>DRAG TO CONTROL</span><b>育成中の相棒をなぞって操作</b></div>
        <div class="itl3-vignette" aria-hidden="true"></div>
      </div>
      ${this.testMode ? `<div class="itl3-testbar" aria-label="トライリンク検証操作"><button type="button" data-itl3-test-goal="0">育成中側へ失点</button><button type="button" data-itl3-test-goal="1">引退相棒側へ失点</button><button type="button" data-itl3-test-goal="2">白レン側へ失点</button><span class="itl3-debug" data-itl3-debug>READY</span></div>` : ""}
      <section class="itl3-memory-panel"><div class="itl3-memory-heading"><div><small>AFTER MATCH ARCHIVE</small><strong>トライリンク・メモリーズ</strong></div><span>最新12試合</span></div><div class="itl3-memory-list" data-itl3-memory-list></div></section>
    </section>`;
  }

  scoreCardMarkup(player) {
    return `<article class="itl3-player-card" data-itl3-player="${player.index}" style="--itl3-color:${escapeHtml(player.color)}"><div class="itl3-player-index">0${player.index + 1}</div><div class="itl3-player-mini">${player.art}</div><div class="itl3-player-info"><small>${player.index === 0 ? "PLAYER" : "RIVAL CPU"}</small><strong>${escapeHtml(player.name)}</strong><span>${escapeHtml(player.roleLabel)}</span></div><div class="itl3-lives" data-itl3-lives>${[0,1,2].map(() => '<i class="itl3-life is-on"><span></span></i>').join("")}</div></article>`;
  }

  characterMarkup(player) {
    return `<div class="itl3-character" data-itl3-character="${player.index}" style="--itl3-color:${escapeHtml(player.color)}"><div class="itl3-character-bubble" data-itl3-bubble>${player.index === 0 ? "READY" : "TARGET LOCK"}</div><span class="itl3-character-name"><i></i>${escapeHtml(player.name)}</span></div>`;
  }

  bindEvents() {
    this.root.querySelector("[data-itl3-start]")?.addEventListener("click", () => this.startMatch());
    this.root.querySelector("[data-itl3-exit]")?.addEventListener("click", () => {
      const stopButton = this.root.closest(".arcade-game-stage")?.querySelector("[data-arcade-stop]")
        || document.querySelector("#townArcade [data-arcade-stop]");
      stopButton?.click();
    });
    this.root.querySelectorAll("[data-itl3-test-goal]").forEach(button => {
      button.addEventListener("click", () => {
        if (!this.testMode || !this.running || this.finished) return;
        const defender = this.players[Number(button.dataset.itl3TestGoal)];
        if (defender?.active) this.registerGoal(defender, true);
      });
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
    this.onKeyUp = event => this.keyState.delete(event.key.toLowerCase());
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

    const centerRing = new THREE.Mesh(
      new THREE.RingGeometry(61, 66, 72),
      new THREE.MeshBasicMaterial({ color: 0xf8e79b, transparent: true, opacity: .65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
    );
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 1.6;
    this.arenaGroup.add(centerRing);

    this.sectorLines = this.players.map(player => {
      const points = [new THREE.Vector3(Math.cos(player.angle) * 68, 1.45, Math.sin(player.angle) * 68), new THREE.Vector3(Math.cos(player.angle) * 315, 1.45, Math.sin(player.angle) * 315)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .62, blending: THREE.AdditiveBlending }));
      this.arenaGroup.add(line);
      const zone = new THREE.Mesh(new THREE.RingGeometry(63, 69, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .36, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(Math.cos(player.angle) * ARENA_RADIUS * .61, 1.7, Math.sin(player.angle) * ARENA_RADIUS * .61);
      this.arenaGroup.add(zone);
      const chevronShape = new THREE.Shape();
      chevronShape.moveTo(-18, -12); chevronShape.lineTo(16, 0); chevronShape.lineTo(-18, 12); chevronShape.lineTo(-10, 0); chevronShape.closePath();
      const chevron = new THREE.Mesh(new THREE.ShapeGeometry(chevronShape), new THREE.MeshBasicMaterial({ color: new THREE.Color(player.color), transparent: true, opacity: .52, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      chevron.rotation.x = -Math.PI / 2;
      chevron.rotation.z = player.angle;
      chevron.position.set(Math.cos(player.angle) * 122, 1.9, Math.sin(player.angle) * 122);
      this.arenaGroup.add(chevron);
      line.userData.zone = zone;
      line.userData.chevron = chevron;
      return line;
    });
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
      const inGoal = this.players.some(player => Math.abs(angleDifference(angle, player.angle)) < GOAL_HALF_ANGLE * .92);
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
  }

  buildGoal(player) {
    const group = new THREE.Group();
    const normal = new THREE.Vector3(Math.cos(player.angle), 0, Math.sin(player.angle));
    const tangent = new THREE.Vector3(-Math.sin(player.angle), 0, Math.cos(player.angle));
    const mouth = 2 * ARENA_RADIUS * Math.sin(GOAL_HALF_ANGLE) * .86;
    const goalCenter = normal.clone().multiplyScalar(ARENA_RADIUS + GOAL_DEPTH * .48);
    group.position.copy(goalCenter);
    group.rotation.y = Math.PI / 2 - player.angle;
    const darkMaterial = new THREE.MeshPhysicalMaterial({ color: 0x01030a, metalness: .72, roughness: .22, clearcoat: .7 });
    const accent = new THREE.Color(player.color);
    const railMaterial = new THREE.MeshStandardMaterial({ color: accent, metalness: .72, roughness: .16, emissive: accent, emissiveIntensity: 2.3 });
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xf4fbff, metalness: .72, roughness: .15, emissive: accent, emissiveIntensity: 1.55 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(mouth * .88, 7, GOAL_DEPTH), darkMaterial);
    floor.position.y = -4;
    group.add(floor);
    [-1, 1].forEach(side => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(12, 38, GOAL_DEPTH + 8), railMaterial);
      rail.position.set(side * mouth * .46, 15, 0);
      rail.castShadow = true;
      group.add(rail);
    });
    const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(mouth * .94, 10, 12), frameMaterial);
    frontBeam.position.set(0, 34, -GOAL_DEPTH * .52);
    frontBeam.castShadow = true;
    group.add(frontBeam);
    const back = new THREE.Mesh(new THREE.BoxGeometry(mouth * .88, 24, 9), darkMaterial);
    back.position.set(0, 8, GOAL_DEPTH * .5);
    group.add(back);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(mouth * .44, 5, 8, 36, Math.PI), railMaterial);
    arch.rotation.z = Math.PI;
    arch.position.set(0, 19, -GOAL_DEPTH * .5);
    group.add(arch);
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
    beacon.position.set(0, 50, -GOAL_DEPTH * .48);
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

    return { group, gate, mouth, normal, tangent, portal, badge, beacon, target: 0, playerIndex: player.index };
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
      const baseMaterial = new THREE.MeshPhysicalMaterial({ color: playerColor, metalness: .72, roughness: .12, clearcoat: 1, clearcoatRoughness: .04, emissive: playerColor, emissiveIntensity: .58 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(MALLET_RADIUS, MALLET_RADIUS * .94, 17, 64), baseMaterial);
      body.position.y = 10;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      const darkCore = new THREE.Mesh(new THREE.CylinderGeometry(27, 30, 8, 48), new THREE.MeshPhysicalMaterial({ color: 0x07101e, metalness: .96, roughness: .12, clearcoat: 1 }));
      darkCore.position.y = 20;
      group.add(darkCore);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(15, 23, 25, 40), new THREE.MeshPhysicalMaterial({ color: 0xe8f7ff, metalness: .9, roughness: .09, clearcoat: 1, clearcoatRoughness: .03, emissive: playerColor, emissiveIntensity: .12 }));
      grip.position.y = 34;
      grip.castShadow = true;
      group.add(grip);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(15.2, 28, 14, 0, Math.PI * 2, 0, Math.PI * .48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .62, roughness: .08, clearcoat: 1, emissive: playerColor, emissiveIntensity: .24 }));
      cap.position.y = 46;
      group.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(MALLET_RADIUS - 2, 3.2, 12, 64), new THREE.MeshBasicMaterial({ color: playerColor, blending: THREE.AdditiveBlending }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 19;
      group.add(ring);
      const underGlow = new THREE.Mesh(new THREE.CircleGeometry(MALLET_RADIUS * 1.2, 48), new THREE.MeshBasicMaterial({ color: playerColor, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      underGlow.rotation.x = -Math.PI / 2;
      underGlow.position.y = 1.8;
      group.add(underGlow);
      group.userData.ring = ring;
      group.userData.underGlow = underGlow;
      group.position.set(player.x, 0, player.z);
      this.scene.add(group);
      return group;
    });

    this.puckMesh = new THREE.Group();
    const puckBody = new THREE.Mesh(new THREE.CylinderGeometry(PUCK_RADIUS, PUCK_RADIUS * .96, 8, 64), new THREE.MeshPhysicalMaterial({ color: 0xffd96b, metalness: .8, roughness: .09, clearcoat: 1, clearcoatRoughness: .025, emissive: 0xff5f24, emissiveIntensity: 1.3 }));
    puckBody.position.y = 7;
    puckBody.castShadow = true;
    this.puckMesh.add(puckBody);
    const puckRing = new THREE.Mesh(new THREE.TorusGeometry(PUCK_RADIUS - 1, 2.3, 10, 64), new THREE.MeshBasicMaterial({ color: 0xffffdf, blending: THREE.AdditiveBlending }));
    puckRing.rotation.x = Math.PI / 2;
    puckRing.position.y = 12;
    this.puckMesh.add(puckRing);
    const puckGlow = new THREE.Mesh(new THREE.CircleGeometry(PUCK_RADIUS * 2.4, 48), new THREE.MeshBasicMaterial({ color: 0xff7b42, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    puckGlow.rotation.x = -Math.PI / 2;
    puckGlow.position.y = 2.1;
    this.puckMesh.add(puckGlow);
    this.puckMesh.userData.glow = puckGlow;
    this.scene.add(this.puckMesh);
    this.replayPuck = new THREE.Mesh(new THREE.CylinderGeometry(PUCK_RADIUS * 1.08, PUCK_RADIUS * 1.08, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.replayPuck.position.y = 10;
    this.replayPuck.visible = false;
    this.scene.add(this.replayPuck);

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(44 * 3);
    this.trailGeometry.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trail = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({ color: 0xffc462, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.trail);
    this.trailGlow = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({ color: 0xff5a7a, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trailGlow.scale.set(1.004, 1, 1.004);
    this.scene.add(this.trailGlow);
    this.buildCharacterAvatars();
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
      const radius = ARENA_RADIUS * .78;
      group.position.set(Math.cos(player.angle) * radius, 0, Math.sin(player.angle) * radius);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(54, 62, 12, 48), new THREE.MeshPhysicalMaterial({ color: 0x071425, metalness: .9, roughness: .14, clearcoat: 1, emissive: playerColor, emissiveIntensity: .25 }));
      pedestal.position.y = 3;
      pedestal.castShadow = true;
      group.add(pedestal);
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(51, 3, 10, 64), new THREE.MeshBasicMaterial({ color: playerColor, transparent: true, opacity: .92, blending: THREE.AdditiveBlending }));
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 10;
      group.add(baseRing);
      const holoCone = new THREE.Mesh(new THREE.CylinderGeometry(34, 50, 115, 48, 1, true), new THREE.MeshBasicMaterial({ color: playerColor, transparent: true, opacity: .035, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
      holoCone.position.y = 66;
      group.add(holoCone);

      const fallback = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(31, 32, 22), new THREE.MeshPhysicalMaterial({ color: playerColor, roughness: .3, clearcoat: .9, emissive: playerColor, emissiveIntensity: .15 }));
      body.scale.y = 1.12;
      body.position.y = 60;
      const face = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 20), new THREE.MeshPhysicalMaterial({ color: 0xf7f1df, roughness: .42, clearcoat: .6 }));
      face.position.y = 100;
      fallback.add(body, face);
      group.add(fallback);

      const planeMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .025, depthWrite: false, side: THREE.DoubleSide, blending: THREE.NormalBlending });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(116, 136), planeMaterial);
      plane.position.y = 76;
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
      scanPlane.position.set(0, 76, -1);
      scanPlane.renderOrder = 5;
      group.add(scanPlane);

      const threeModel = player.role === "guide" ? buildWhiteMichiRoadSaberRen360() : null;
      if (threeModel) {
        threeModel.position.y = 0;
        group.add(threeModel);
      }

      const light = new THREE.PointLight(playerColor, 12, 220, 2);
      light.position.y = 72;
      group.add(light);
      group.userData = {
        playerIndex: player.index,
        plane,
        fallback,
        baseRing,
        scanPlane,
        threeModel,
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
  }

  resetMalletStarts() {
    const radius = MALLET_START_RADIUS;
    this.players.forEach(player => {
      if (!player.active) return;
      player.x = Math.cos(player.angle) * radius;
      player.z = Math.sin(player.angle) * radius;
      player.vx = 0;
      player.vz = 0;
      player.targetX = player.x;
      player.targetZ = player.z;
    });
  }

  startMatch() {
    if (this.running && !this.finished) return;
    this.resumeAudio();
    this.finished = false;
    this.resultPresented = false;
    this.running = true;
    this.timeRemaining = MATCH_SECONDS;
    this.elapsed = 0;
    this.countdown = 3.35;
    this.countdownMark = null;
    this.serveTimer = 0;
    this.cameraMode = "countdown";
    this.cameraModeTime = 0;
    this.goalCinematic = null;
    this.victoryFocus = null;
    this.comboCount = 0;
    this.comboExpiresAt = 0;
    this.lastImpactPower = 0;
    this.lastTouch = null;
    this.roundPath.length = 0;
    this.players.forEach((player, index) => {
      player.lives = 3;
      player.active = true;
      player.goalsFor = 0;
      player.gateProgress = 0;
      player.lastStrikeAt = -10;
      if (player.brain) this.randomizeBrainForRally(player, true);
      const character = this.root.querySelector(`[data-itl3-character="${index}"]`);
      character?.classList.remove("is-out", "is-cheer", "is-hurt", "is-strike");
    });
    this.resetMalletStarts();
    this.gates.forEach(gate => { gate.target = 0; });
    this.gates.forEach(gate => { gate.sparked = false; });
    this.resetPuck(false);
    this.opening?.classList.add("is-hidden");
    this.root.querySelector("[data-itl3-result]")?.remove();
    this.updateScoreboard();
    this.showMessage("THREE SOULS", "3");
    this.beep(360, .09, .045);
  }

  resetPuck(launch = true) {
    this.puck.x = 0;
    this.puck.z = 0;
    this.puck.vx = 0;
    this.puck.vz = 0;
    this.puck.visible = true;
    this.puck.lastHitAt = -10;
    this.puck.lastHitBy = -1;
    this.lastTouch = null;
    this.serveGrace = 0;
    this.serveSoftWindow = 0;
    this.trailPoints.length = 0;
    this.roundPath.length = 0;
    if (launch) {
      this.resetMalletStarts();
      this.goalCinematic = null;
      this.cameraMode = "match";
      this.cameraModeTime = 0;
      const angle = randomBetween(-Math.PI, Math.PI);
      // A new rally starts with a soft center tap. Once the first collision
      // happens, the normal physical impulse and speed limits take over.
      const speed = randomBetween(SERVE_SPEED_MIN, SERVE_SPEED_MAX);
      this.serveGrace = SERVE_GRACE_SECONDS;
      this.serveSoftWindow = SERVE_SOFT_WINDOW;
      this.puck.vx = Math.cos(angle) * speed;
      this.puck.vz = Math.sin(angle) * speed;
      this.randomizeBrainsForRally();
    }
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
    this.updateVisuals(delta);
    this.renderScene();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  updateCountdown(delta) {
    this.countdown -= delta;
    const mark = this.countdown > 2.25 ? 3 : this.countdown > 1.25 ? 2 : this.countdown > .25 ? 1 : 0;
    if (mark !== this.countdownMark) {
      this.countdownMark = mark;
      if (mark > 0) {
        this.showMessage("THREE SOULS", String(mark));
        this.beep(330 + (3 - mark) * 90, .08, .045);
      } else {
        this.showMessage("PHYSICS LINK", "LINK!");
        this.beep(660, .18, .06);
        this.cameraMode = "match";
        this.cameraModeTime = 0;
        this.resetPuck(true);
      }
    }
  }

  step(dt) {
    if (this.serveTimer > 0) {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0 && !this.finished) this.resetPuck(true);
      return;
    }
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    if (this.clock) this.clock.textContent = String(Math.ceil(this.timeRemaining));
    if (this.timeRemaining <= 0) {
      this.finishMatch(this.resolveTimeWinner(), "TIME UP");
      return;
    }
    this.updatePlayerControl(dt);
    this.players.forEach(player => {
      if (player.index !== 0 && player.active) this.updateCpu(player, dt);
      this.moveMallet(player, dt);
    });
    this.integratePuck(dt);
    this.resolveMalletCollisions();
    this.resolveBoundary();
    if (this.serveSoftWindow > 0) {
      this.serveSoftWindow = Math.max(0, this.serveSoftWindow - dt);
      const softSpeed = Math.hypot(this.puck.vx, this.puck.vz);
      if (softSpeed > SERVE_SOFT_MAX_SPEED) {
        this.puck.vx *= SERVE_SOFT_MAX_SPEED / softSpeed;
        this.puck.vz *= SERVE_SOFT_MAX_SPEED / softSpeed;
      }
    }
    this.roundPath.push({ x: this.puck.x, z: this.puck.z });
    if (this.roundPath.length > 160) this.roundPath.shift();
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
      player.targetX += dx / length * MALLET_MAX_SPEED * dt;
      player.targetZ += dz / length * MALLET_MAX_SPEED * dt;
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
    const threat = sectorDelta < MALLET_HALF_SECTOR * 1.04 && (puckRadius > ARENA_RADIUS * .39 || headingToGoal > 95);
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
    const weighted = candidates.flatMap(other => Array.from({ length: Math.max(1, 5 - other.lives) }, () => other));
    return choose(weighted);
  }

  moveMallet(player, dt) {
    if (!player.active) {
      player.vx *= .88;
      player.vz *= .88;
      return;
    }
    const toX = player.targetX - player.x;
    const toZ = player.targetZ - player.z;
    const distance = Math.hypot(toX, toZ);
    const desiredSpeed = clamp(distance * MALLET_RESPONSE, 0, MALLET_MAX_SPEED);
    const desiredX = distance > .001 ? toX / distance * desiredSpeed : 0;
    const desiredZ = distance > .001 ? toZ / distance * desiredSpeed : 0;
    const delta = setVectorLength(desiredX - player.vx, desiredZ - player.vz, MALLET_ACCELERATION * dt);
    player.vx += delta.x;
    player.vz += delta.z;
    player.x += player.vx * dt;
    player.z += player.vz * dt;
    const constrained = this.constrainToSector(player, player.x, player.z);
    if (Math.hypot(constrained.x - player.x, constrained.z - player.z) > .1) {
      player.vx *= .45;
      player.vz *= .45;
    }
    player.x = constrained.x;
    player.z = constrained.z;
  }

  constrainToSector(player, x, z) {
    let radius = Math.hypot(x, z);
    let angle = radius > .001 ? Math.atan2(z, x) : player.angle;
    const difference = clamp(angleDifference(angle, player.angle), -MALLET_HALF_SECTOR, MALLET_HALF_SECTOR);
    angle = player.angle + difference;
    radius = clamp(radius, MALLET_MIN_RADIUS, MALLET_MAX_RADIUS);
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
        const impulse = (-(softStart ? .76 : 1.78) * relative) + Math.max(0, Math.hypot(player.vx, player.vz) * (softStart ? .08 : .18));
        this.puck.vx += nx * impulse + player.vx * (softStart ? .16 : .43);
        this.puck.vz += nz * impulse + player.vz * (softStart ? .16 : .43);
        this.puck.lastHitAt = this.elapsed;
        this.puck.lastHitBy = player.index;
        this.lastTouch = player.index;
        player.lastStrikeAt = this.elapsed;
        if (player.brain) {
          player.brain.retreatUntil = this.elapsed + randomBetween(.34, .68);
          player.brain.guardOffset = randomBetween(-.18, .18);
          player.brain.state = "retreat";
          player.brain.lastDecision = "打撃後ドリブル防止退避";
        }
        this.impact(player, this.puck.x, this.puck.z);
      }
    }
  }

  resolveBoundary() {
    const radius = Math.hypot(this.puck.x, this.puck.z);
    if (radius < ARENA_RADIUS - PUCK_RADIUS) return;
    const angle = Math.atan2(this.puck.z, this.puck.x);
    const openDefender = this.players.find(player => player.active && Math.abs(angleDifference(angle, player.angle)) < GOAL_HALF_ANGLE);
    if (openDefender) {
      if (radius > ARENA_RADIUS + GOAL_DEPTH * .59) this.registerGoal(openDefender, false);
      return;
    }
    const nx = this.puck.x / (radius || 1);
    const nz = this.puck.z / (radius || 1);
    this.puck.x = nx * (ARENA_RADIUS - PUCK_RADIUS - .8);
    this.puck.z = nz * (ARENA_RADIUS - PUCK_RADIUS - .8);
    const outward = this.puck.vx * nx + this.puck.vz * nz;
    if (outward > 0) {
      this.puck.vx -= nx * outward * 1.88;
      this.puck.vz -= nz * outward * 1.88;
      const tangentKick = randomBetween(-7, 7);
      this.puck.vx += -nz * tangentKick;
      this.puck.vz += nx * tangentKick;
      this.wallImpact(this.puck.x, this.puck.z);
    }
  }

  registerGoal(defender, testTriggered) {
    if (!defender.active || this.serveTimer > 0 || this.finished) return;
    defender.lives = Math.max(0, defender.lives - 1);
    const scorer = this.lastTouch != null && this.players[this.lastTouch]?.active && this.lastTouch !== defender.index ? this.players[this.lastTouch] : null;
    if (scorer) scorer.goalsFor += 1;
    this.decisivePath = this.roundPath.slice(-90);
    this.puck.vx = 0;
    this.puck.vz = 0;
    this.puck.visible = false;
    this.serveTimer = 2.25;
    this.goalCinematic = {
      defenderIndex: defender.index,
      scorerIndex: scorer?.index ?? -1,
      life: 2.15,
      maxLife: 2.15,
      path: this.decisivePath.slice(-70)
    };
    this.cameraMode = "goal";
    this.cameraModeTime = 0;
    this.goalEffect(defender, scorer, testTriggered);
    this.updateScoreboard();
    if (defender.lives <= 0) {
      defender.active = false;
      this.gates[defender.index].target = 1;
      this.react(defender.index, "out", choose(REACTIONS.out), 1400);
      this.showMessage("GATE SEALED", `${defender.name} 脱落`);
      this.beep(135, .45, .075);
    }
    const survivors = this.players.filter(player => player.active);
    if (survivors.length <= 1) {
      this.serveTimer = 0;
      window.setTimeout(() => {
        if (!this.destroyed && !this.finished) this.finishMatch(survivors[0] || this.resolveTimeWinner(), "LAST SOUL");
      }, 1150);
    }
  }

  impact(player, x, z) {
    const power = Math.hypot(this.puck.vx, this.puck.vz);
    if (this.elapsed <= this.comboExpiresAt && this.puck.lastHitBy !== this.lastComboPlayer) this.comboCount = Math.min(9, this.comboCount + 1);
    else this.comboCount = 1;
    this.lastComboPlayer = player.index;
    this.comboExpiresAt = this.elapsed + 1.65;
    this.lastImpactPower = power;
    this.spawnBurst(x, 12, z, player.color, 20 + Math.round(power / 100), 190 + power * .13);
    this.spawnShock(x, z, player.color, 30 + power * .018);
    this.cameraShake = Math.max(this.cameraShake, 5.5 + power * .006);
    if (this.postUniforms) this.postUniforms.uFlash.value = Math.max(this.postUniforms.uFlash.value, clamp(power / 900, .22, .82));
    this.react(player.index, "strike", choose(REACTIONS.strike), 520);
    this.beep(260 + power * .38, .045, .026);
    this.noiseBurst(.045, .018 + clamp(power / 12000, 0, .055), 720 + power * .35);
  }

  wallImpact(x, z) {
    this.spawnBurst(x, 12, z, "#a9efff", 7, 110);
    this.spawnShock(x, z, "#76ddff", 18);
    this.cameraShake = Math.max(this.cameraShake, 2.2);
    this.beep(180, .035, .018);
  }

  goalEffect(defender, scorer, testTriggered) {
    const goalX = Math.cos(defender.angle) * (ARENA_RADIUS + 28);
    const goalZ = Math.sin(defender.angle) * (ARENA_RADIUS + 28);
    this.spawnBurst(goalX, 15, goalZ, defender.color, 44, 300);
    this.spawnShock(goalX, goalZ, defender.color, 72);
    this.cameraShake = 15;
    if (this.postUniforms) this.postUniforms.uFlash.value = 1;
    this.flashLights.push({ light: this.goalLights[defender.index], life: 1.1, maxLife: 1.1, peak: 82 });
    this.showMessage(testTriggered ? "PHYSICS TEST" : "GOAL BREAK", scorer ? `${scorer.name} GOAL!` : `${defender.name} 失点`);
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

  updateVisuals(delta) {
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
    if (this.postUniforms) {
      this.postUniforms.uTime.value = this.elapsed;
      this.postUniforms.uFlash.value = Math.max(0, this.postUniforms.uFlash.value - delta * 2.25);
    }
    if (this.floorUniforms) {
      this.floorUniforms.uTime.value = this.elapsed;
      this.floorUniforms.uPulse.value = clamp(speed / MAX_PUCK_SPEED, 0, 1);
    }
    if (this.skyDome?.material?.uniforms?.uTime) this.skyDome.material.uniforms.uTime.value = this.elapsed;
    if (this.starField) this.starField.rotation.y += delta * .005;
    this.energyRings?.forEach((ring, index) => {
      ring.rotation.z += delta * (index % 2 ? -.06 : .08);
      ring.material.emissiveIntensity = .7 + (index + 1) * .32 + Math.sin(this.elapsed * (1.2 + index * .22)) * .22;
    });
    this.holoPanels?.forEach((panel, index) => {
      panel.material.opacity = .11 + .09 * Math.max(0, Math.sin(this.elapsed * 1.4 + index));
    });
    this.malletMeshes?.forEach((mesh, index) => {
      const player = this.players[index];
      mesh.position.x = player.x;
      mesh.position.z = player.z;
      mesh.visible = player.active;
      mesh.rotation.y += delta * (index === 0 ? 1.1 : .75);
      const malletSpeed = Math.hypot(player.vx, player.vz);
      mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, clamp(player.vz / MALLET_MAX_SPEED, -.08, .08), .40);
      mesh.rotation.z = THREE.MathUtils.lerp(mesh.rotation.z, clamp(-player.vx / MALLET_MAX_SPEED, -.08, .08), .40);
      if (mesh.userData.ring) mesh.userData.ring.scale.setScalar(1 + Math.sin(this.elapsed * 5 + index) * .035 + malletSpeed / MALLET_MAX_SPEED * .08);
      if (mesh.userData.underGlow) mesh.userData.underGlow.material.opacity = .16 + malletSpeed / MALLET_MAX_SPEED * .32;
    });
    if (this.puckMesh) {
      this.puckMesh.position.set(this.puck.x, 0, this.puck.z);
      this.puckMesh.visible = this.puck.visible;
      this.puckMesh.rotation.y += delta * (2.2 + speed * .012);
      const glowScale = 1 + clamp(speed / MAX_PUCK_SPEED, 0, 1) * .9;
      this.puckMesh.userData.glow?.scale.setScalar(glowScale);
      if (this.puckMesh.userData.glow) this.puckMesh.userData.glow.material.opacity = .14 + clamp(speed / MAX_PUCK_SPEED, 0, 1) * .34;
    }
    if (this.replayPuck) {
      const replay = this.goalCinematic;
      if (replay?.path?.length > 2 && replay.life > .12) {
        const progress = clamp((1 - replay.life / replay.maxLife) * 1.28, 0, 1);
        const pathIndex = Math.min(replay.path.length - 1, Math.floor(progress * (replay.path.length - 1)));
        const point = replay.path[pathIndex];
        this.replayPuck.position.set(point.x, 10, point.z);
        this.replayPuck.rotation.y += delta * 8;
        this.replayPuck.scale.setScalar(1 + Math.sin(this.elapsed * 18) * .12);
        this.replayPuck.material.opacity = .42 + Math.sin(this.elapsed * 24) * .18;
        this.replayPuck.visible = true;
      } else {
        this.replayPuck.visible = false;
      }
    }
    if (this.puck.visible && (this.running || this.trailPoints.length)) {
      this.trailPoints.unshift({ x: this.puck.x, z: this.puck.z });
      if (this.trailPoints.length > 44) this.trailPoints.length = 44;
    }
    for (let i = 0; i < 44; i += 1) {
      const point = this.trailPoints[i] || this.trailPoints[this.trailPoints.length - 1] || { x: this.puck.x, z: this.puck.z };
      this.trailPositions[i * 3] = point.x;
      this.trailPositions[i * 3 + 1] = 5 + (44 - i) * .055;
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
    this.updateShocks(delta);
    this.updateGates(delta);
    this.updateLeds(delta);
    this.updateAvatarMeshes(delta);
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

  updateAvatarMeshes(delta) {
    this.avatarMeshes?.forEach((avatar, index) => {
      const player = this.players[index];
      const data = avatar.userData;
      data.scanPlane.material.uniforms.uTime.value = this.elapsed + index * .7;
      data.baseRing.rotation.z += delta * (index % 2 ? -.9 : .9);
      data.light.intensity = player.active ? 9 + Math.sin(this.elapsed * 3.4 + index) * 3 : 1.5;
      data.reaction = Math.max(0, Number(data.reaction || 0) - delta);
      const progress = data.reactionMax ? 1 - data.reaction / data.reactionMax : 0;
      let lift = Math.sin(this.elapsed * 2.1 + index) * 2.2;
      let scale = 1;
      let roll = 0;
      if (data.reaction > 0) {
        if (data.reactionType === "strike") { lift += Math.sin(progress * Math.PI) * 16; scale += Math.sin(progress * Math.PI) * .1; }
        if (data.reactionType === "cheer") { lift += Math.abs(Math.sin(progress * Math.PI * 3)) * 22; roll = Math.sin(progress * Math.PI * 4) * .08; }
        if (data.reactionType === "hurt") { roll = Math.sin(progress * Math.PI * 7) * .16 * (1 - progress); }
      }
      avatar.position.y = lift;
      avatar.scale.setScalar(player.active ? scale : .82);
      avatar.rotation.z = roll;
      avatar.visible = true;
      const requestedView = this.avatarViewFor(player, avatar);
      if (data.threeModel) {
        data.threeModel.visible = player.active;
        data.threeModel.position.y = Math.sin(this.elapsed * 2.1 + index) * 1.35;
        if (data.threeModel.userData.continuous3d) {
          data.threeModel.rotation.y = -player.angle - Math.PI / 2 + Math.sin(this.elapsed * .7 + index) * .018;
        } else {
          data.threeModel.rotation.y = 0;
          data.threeModel.userData.depthRing.rotation.z += delta * .7;
          data.threeModel.userData.depthRing.material.opacity = .13 + Math.sin(this.elapsed * 3.2 + index) * .05;
          data.threeModel.userData.viewMeshes.forEach((mesh, view) => {
            const activeView = view === requestedView && Boolean(mesh.material.map);
            mesh.visible = player.active && activeView;
            mesh.material.opacity = activeView ? 1 : 0;
            if (activeView) {
              mesh.position.set(0, 78, 0);
              mesh.quaternion.copy(this.camera.quaternion);
            }
          });
          data.threeModel.userData.activeView = requestedView;
        }
      }
      data.plane.visible = Boolean(data.plane.material.map) && player.active && !data.threeModel;
      data.fallback.visible = !data.plane.material.map && player.active && !data.threeModel;
      data.scanPlane.visible = player.active && !data.threeModel;
      const requestedTexture = data.directionalTextures?.get(requestedView);
      if (requestedTexture && data.activeAvatarView !== requestedView) {
        data.plane.material.map = requestedTexture;
        data.plane.material.needsUpdate = true;
        data.activeAvatarView = requestedView;
        data.texture = requestedTexture;
      }
      data.plane.quaternion.copy(this.camera.quaternion);
      data.scanPlane.quaternion.copy(this.camera.quaternion);
      if (!player.active) {
        data.plane.visible = Boolean(data.plane.material.map) && !data.threeModel;
        data.plane.material.opacity = .2;
        data.fallback.visible = !data.plane.material.map && !data.threeModel;
        data.fallback.traverse(object => { if (object.material) object.material.transparent = true, object.material.opacity = .2; });
        if (data.threeModel) data.threeModel.visible = false;
      } else if (data.plane.material) {
        data.plane.material.opacity = 1;
        data.fallback.traverse(object => { if (object.material) { object.material.transparent = false; object.material.opacity = 1; } });
      }
    });
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
      gate.group.visible = player.active || player.gateProgress < .95;
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
      const world = avatar ? avatar.localToWorld(new THREE.Vector3(0, 142, 0)) : new THREE.Vector3(Math.cos(player.angle) * ARENA_RADIUS * .78, 142, Math.sin(player.angle) * ARENA_RADIUS * .78);
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
    if (!this.debugOutput) return;
    const cpu = this.players.slice(1).map(player => `CPU${player.index}:${player.brain.state}/${player.brain.lastDecision}`).join(" | ");
    this.debugOutput.textContent = `${cpu} | puck ${Math.round(this.puck.x)},${Math.round(this.puck.z)}`;
  }

  renderScene() {
    if (!this.renderer || !this.scene || !this.camera) return;
    const portrait = Boolean(this.camera.userData.portrait);
    const targetPosition = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    let fov = portrait ? 43 : 35;
    if (this.cameraMode === "attract") {
      const orbit = this.elapsed * .115 - .35;
      const distance = portrait ? 900 : 735;
      targetPosition.set(Math.sin(orbit) * distance * .3, portrait ? 760 : 555, Math.cos(orbit) * distance);
      lookTarget.set(0, 18, -28);
      fov = portrait ? 44 : 37;
    } else if (this.cameraMode === "countdown") {
      const intro = clamp(this.cameraModeTime / 3.2, 0, 1);
      targetPosition.set(THREE.MathUtils.lerp(260, 0, intro), THREE.MathUtils.lerp(portrait ? 830 : 640, portrait ? 760 : 565, intro), THREE.MathUtils.lerp(portrait ? 880 : 780, portrait ? 810 : 690, intro));
      lookTarget.set(0, THREE.MathUtils.lerp(20, 0, intro), -20);
      fov = THREE.MathUtils.lerp(42, portrait ? 43 : 35, intro);
    } else if (this.cameraMode === "goal" && this.goalCinematic) {
      const defender = this.players[this.goalCinematic.defenderIndex];
      const normalX = Math.cos(defender.angle);
      const normalZ = Math.sin(defender.angle);
      const tangentX = -normalZ;
      const tangentZ = normalX;
      const phase = 1 - this.goalCinematic.life / this.goalCinematic.maxLife;
      const side = this.goalCinematic.defenderIndex % 2 ? -1 : 1;
      const distance = portrait ? 660 : 565;
      targetPosition.set(normalX * distance + tangentX * side * 145 * Math.sin(phase * Math.PI), portrait ? 390 : 275, normalZ * distance + tangentZ * side * 145 * Math.sin(phase * Math.PI));
      lookTarget.set(normalX * (ARENA_RADIUS - 35), 18, normalZ * (ARENA_RADIUS - 35));
      fov = portrait ? 46 : 42;
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
      targetPosition.set(lateral, portrait ? 770 : 560, (portrait ? 820 : 690) + depth * .18);
      lookTarget.set(this.puck.x * .055, 0, -26 + this.puck.z * .04);
    }
    if (this.cameraShake > .05) {
      const amount = this.cameraShake;
      targetPosition.x += randomBetween(-amount, amount);
      targetPosition.y += randomBetween(-amount * .25, amount * .25);
      targetPosition.z += randomBetween(-amount, amount);
      this.cameraShake *= .8;
    }
    this.camera.position.lerp(targetPosition, this.cameraMode === "goal" ? .12 : .075);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, .1);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(lookTarget);
    if (this.sceneTarget && this.postScene && this.postCamera) {
      this.renderer.setRenderTarget(this.sceneTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize() {
    if (!this.renderer || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(420, Math.round(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const portrait = height > width * 1.12;
    this.camera.userData.portrait = portrait;
    this.cameraBase.set(0, portrait ? 770 : 560, portrait ? 820 : 690);
    this.camera.fov = portrait ? 43 : 35;
    this.camera.updateProjectionMatrix();
    if (this.sceneTarget && this.postUniforms) {
      const drawingSize = this.renderer.getDrawingBufferSize(new THREE.Vector2());
      this.sceneTarget.setSize(Math.max(1, drawingSize.x), Math.max(1, drawingSize.y));
      this.postUniforms.uResolution.value.copy(drawingSize);
    }
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
    this.dragging = false;
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
    return [...this.players].sort((a, b) => b.lives - a.lives || b.goalsFor - a.goalsFor || Math.random() - .5)[0];
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
    this.showMessage("MATCH COMPLETE", `${winner.name} WIN!`);
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
    const duration = Math.round(MATCH_SECONDS - this.timeRemaining);
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
      participants: this.players.map(player => ({ id: player.id, name: player.name, role: player.role, roleLabel: player.roleLabel, art: player.art, appearance: { ...player.appearance }, color: player.color, lives: player.lives, goalsFor: player.goalsFor })),
      result: this.players.map(player => ({ id: player.id, lives: player.lives, goalsFor: player.goalsFor })),
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
    panel.innerHTML = `<div class="itl3-result-card"><div class="itl3-result-rank">ARENA RESULT <b>01</b></div><small>COMMEMORATIVE MATCH CARD</small><h2>${escapeHtml(record.winnerName)}<em>WINNER</em></h2><p>${escapeHtml(formatDate(record.playedAt))}　//　${escapeHtml(record.reason)}</p><div class="itl3-photo">${record.participants.map((participant, index) => `<div class="itl3-photo-person${participant.id === record.winnerId ? " is-winner" : ""}"><span>0${index + 1}</span><div>${participant.art || fallbackArt(participant.name, participant.color)}</div><strong>${escapeHtml(participant.name)}</strong></div>`).join("")}</div><div class="itl3-result-actions"><button type="button" class="itl3-primary" data-itl3-rematch><span>REPLAY</span><b>もう一度対戦</b><i>›</i></button><button type="button" class="itl3-secondary" data-itl3-close-result>アリーナを見る</button></div></div>`;
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
      return `<article class="itl3-memory-card"><strong>${escapeHtml(winnerName)} WIN</strong><span>${escapeHtml(formatDate(memory?.playedAt || memory?.savedAt))}　${escapeHtml(reason)}</span></article>`;
    }).join("");
  }

  updateScoreboard() {
    this.players.forEach(player => {
      const card = this.root.querySelector(`[data-itl3-player="${player.index}"]`);
      if (!card) return;
      card.classList.toggle("is-out", !player.active);
      card.querySelectorAll(".itl3-life").forEach((life, index) => life.classList.toggle("is-on", index < player.lives));
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
      charactersVisible: this.players.length,
      running: this.running,
      finished: this.finished,
      timeRemaining: Math.round(this.timeRemaining * 100) / 100,
      puck: { x: Math.round(this.puck.x), z: Math.round(this.puck.z), speed: Math.round(Math.hypot(this.puck.vx, this.puck.vz)), lastHitBy: this.puck.lastHitBy },
      players: this.players.map(player => ({ index: player.index, name: player.name, active: player.active, lives: player.lives, x: Math.round(player.x), z: Math.round(player.z), aiState: player.brain?.state || "human-control", aiDecision: player.brain?.lastDecision || "pointer" })),
      activeParticles: this.particles?.filter(particle => particle.life > 0).length || 0,
      avatarTextures: this.avatarMeshes?.filter(avatar => avatar.userData.texture).length || 0,
      avatar3d: this.avatarMeshes?.map(avatar => Boolean(avatar.userData.threeModel)) || [],
      avatarErrors: this.avatarMeshes?.map(avatar => avatar.userData.loadError || null) || [],
      gatesClosed: this.players.filter(player => player.gateProgress > .9).length
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
