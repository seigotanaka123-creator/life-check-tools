const WORLD_SIZE = 1000;
const CENTER = Object.freeze({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
const ARENA_RADIUS = 386;
const PUCK_RADIUS = 20;
const MALLET_RADIUS = 37;
const GOAL_HALF_ANGLE = 0.235;
const GOAL_DEPTH = 58;
const FIXED_STEP = 1 / 120;
const MATCH_SECONDS = 90;
const MAX_PUCK_SPEED = 980;
const MALLET_MAX_SPEED = 690;
const MALLET_MIN_RADIUS = ARENA_RADIUS * 0.27;
const MALLET_MAX_RADIUS = ARENA_RADIUS * 0.78;
const MALLET_HALF_SECTOR = Math.PI * 0.285;
const PLAYER_ANGLES = Object.freeze([
  Math.PI / 2,
  Math.PI * 7 / 6,
  Math.PI * 11 / 6
]);
const FALLBACK_COLORS = Object.freeze(["#ff7180", "#ffd16c", "#69dfc0"]);

let mountedGame = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function length(x, y) {
  return Math.hypot(x, y);
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

function cleanParticipant(raw, index) {
  return {
    id: String(raw?.id || `player-${index}`),
    name: String(raw?.name || `相棒${index + 1}`),
    role: String(raw?.role || (index === 0 ? "current" : "companion")),
    roleLabel: String(raw?.roleLabel || (index === 0 ? "育成中・あなた" : "AI相棒")),
    art: String(raw?.art || ""),
    color: safeColor(raw?.color, FALLBACK_COLORS[index] || "#8de5ff"),
    appearance: raw?.appearance && typeof raw.appearance === "object" ? { ...raw.appearance } : {}
  };
}

class ImasoraTriLinkGame {
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
    this.dragging = false;
    this.pointerId = null;
    this.lastTimestamp = 0;
    this.accumulator = 0;
    this.timeRemaining = MATCH_SECONDS;
    this.serveTimer = 0;
    this.finishTimer = 0;
    this.finishTimeout = 0;
    this.resultPresented = false;
    this.goalFlash = null;
    this.statusTimer = 0;
    this.lastContactAt = 0;
    this.puckTrail = [];
    this.decisivePath = [];
    this.roundPath = [];
    this.matchId = `tri-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.frame = 0;
    this.resizeObserver = null;
    this.audioContext = null;
    this.boundLoop = timestamp => this.loop(timestamp);
    this.boundResize = () => this.resize();
    this.keyState = new Set();
    this.players = this.participants.map((participant, index) => ({
      ...participant,
      index,
      angle: PLAYER_ANGLES[index],
      lives: 3,
      active: true,
      goalsFor: 0,
      x: CENTER.x + Math.cos(PLAYER_ANGLES[index]) * ARENA_RADIUS * 0.62,
      y: CENTER.y + Math.sin(PLAYER_ANGLES[index]) * ARENA_RADIUS * 0.62,
      vx: 0,
      vy: 0,
      targetX: CENTER.x + Math.cos(PLAYER_ANGLES[index]) * ARENA_RADIUS * 0.62,
      targetY: CENTER.y + Math.sin(PLAYER_ANGLES[index]) * ARENA_RADIUS * 0.62
    }));
    this.puck = { x: CENTER.x, y: CENTER.y, vx: 0, vy: 0 };
  }

  mount() {
    this.root.innerHTML = this.markup();
    this.canvas = this.root.querySelector("[data-itl-canvas]");
    this.ctx = this.canvas?.getContext("2d", { alpha: false });
    this.overlay = this.root.querySelector("[data-itl-overlay]");
    this.clockValue = this.root.querySelector("[data-itl-clock]");
    this.statusTitle = this.root.querySelector("[data-itl-status-title]");
    this.statusCopy = this.root.querySelector("[data-itl-status-copy]");
    this.startButton = this.root.querySelector("[data-itl-start]");
    this.memoryList = this.root.querySelector("[data-itl-memory-list]");
    this.bindEvents();
    this.renderMemories();
    this.resize();
    this.updateScoreboard();
    this.draw();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  markup() {
    return `<section class="itl-shell" aria-label="イマソラ・トライリンク">
      <header class="itl-gamebar">
        <div><small>PHYSICS AIR TABLE · THREE WAY</small><strong>イマソラ・トライリンク</strong></div>
        <div class="itl-clock"><span>TIME</span><b data-itl-clock>${MATCH_SECONDS}</b></div>
      </header>
      <div class="itl-scoreboard" data-itl-scoreboard>
        ${this.players.map(player => this.playerCardMarkup(player)).join("")}
      </div>
      <div class="itl-arena-wrap">
        <canvas class="itl-canvas" data-itl-canvas width="1000" height="1000" aria-label="三者対戦の物理エアホッケー盤"></canvas>
        <div class="itl-arena-overlay" data-itl-overlay>
          <div class="itl-status-card">
            <small>THREE-WAY PHYSICS MATCH</small>
            <strong data-itl-status-title>3つのゴールを巡る一戦</strong>
            <span data-itl-status-copy>育成中の相棒のマレットを指でなぞって動かします。3本の防衛ライトを最後まで守れば勝利です。</span>
            <button class="itl-primary" type="button" data-itl-start>試合開始</button>
          </div>
        </div>
      </div>
      <div class="itl-hint-row"><i aria-hidden="true"></i><span>盤面を押したままなぞる　／　自動照準・能力補正なし</span></div>
      ${this.testMode ? '<div class="itl-testbar" aria-label="トライリンク検証操作"><button type="button" data-itl-test-goal="0">あなた側を失点</button><button type="button" data-itl-test-goal="1">引退相棒側を失点</button><button type="button" data-itl-test-goal="2">白レン側を失点</button></div>' : ""}
      <section class="itl-memory-panel" aria-label="トライリンク記念カード">
        <div class="itl-memory-heading"><strong>試合後の記念カード</strong><small>最新12試合</small></div>
        <div class="itl-memory-list" data-itl-memory-list></div>
      </section>
    </section>`;
  }

  playerCardMarkup(player) {
    return `<article class="itl-player-card" data-itl-player="${player.index}" style="--itl-color:${escapeHtml(player.color)}">
      <div class="itl-player-portrait">${player.art || `<b>${escapeHtml(player.name.slice(0, 1))}</b>`}</div>
      <div class="itl-player-copy"><small>${escapeHtml(player.roleLabel)}</small><strong>${escapeHtml(player.name)}</strong><div class="itl-lives" data-itl-lives>${[0, 1, 2].map(() => '<i class="itl-life is-on"></i>').join("")}</div></div>
    </article>`;
  }

  bindEvents() {
    this.startButton?.addEventListener("click", () => this.startMatch());
    this.root.querySelectorAll("[data-itl-test-goal]").forEach(button => {
      button.addEventListener("click", () => {
        if (!this.testMode || !this.running) return;
        const defender = this.players[Number(button.dataset.itlTestGoal)];
        if (defender?.active) this.registerGoal(defender);
      });
    });
    if (this.canvas) {
      this.canvas.addEventListener("pointerdown", event => this.onPointerDown(event));
      this.canvas.addEventListener("pointermove", event => this.onPointerMove(event));
      this.canvas.addEventListener("pointerup", event => this.onPointerUp(event));
      this.canvas.addEventListener("pointercancel", event => this.onPointerUp(event));
      this.canvas.addEventListener("contextmenu", event => event.preventDefault());
    }
    this.onKeyDown = event => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) {
        this.keyState.add(event.key.toLowerCase());
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
    this.resizeObserver?.observe(this.canvas);
    window.addEventListener("resize", this.boundResize);
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const cssSize = Math.max(300, Math.round(this.canvas.getBoundingClientRect().width || 700));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const target = Math.round(cssSize * dpr);
    if (this.canvas.width !== target || this.canvas.height !== target) {
      this.canvas.width = target;
      this.canvas.height = target;
    }
    this.pixelScale = target / WORLD_SIZE;
    this.draw();
  }

  startMatch() {
    if (this.destroyed) return;
    clearTimeout(this.finishTimeout);
    this.resumeAudio();
    this.running = true;
    this.finished = false;
    this.timeRemaining = MATCH_SECONDS;
    this.finishTimer = 0;
    this.resultPresented = false;
    this.goalFlash = null;
    this.matchId = `tri-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    this.players.forEach(player => {
      player.lives = 3;
      player.active = true;
      player.goalsFor = 0;
      const radius = ARENA_RADIUS * 0.62;
      player.x = CENTER.x + Math.cos(player.angle) * radius;
      player.y = CENTER.y + Math.sin(player.angle) * radius;
      player.vx = 0;
      player.vy = 0;
      player.targetX = player.x;
      player.targetY = player.y;
    });
    this.roundPath = [];
    this.decisivePath = [];
    this.puckTrail = [];
    this.resetPuck(0.8);
    if (this.overlay) this.overlay.hidden = true;
    this.updateScoreboard();
    this.setTransientStatus("READY", 0.8);
  }

  resetPuck(delay = 0.65) {
    this.puck.x = CENTER.x;
    this.puck.y = CENTER.y;
    this.puck.vx = 0;
    this.puck.vy = 0;
    this.serveTimer = delay;
    this.roundPath = [{ x: CENTER.x, y: CENTER.y }];
  }

  launchPuck() {
    const phase = (Date.now() % 997) / 997;
    const baseAngle = -Math.PI / 2 + (phase - 0.5) * 0.88;
    const speed = 365;
    this.puck.vx = Math.cos(baseAngle) * speed;
    this.puck.vy = Math.sin(baseAngle) * speed;
    this.beep(390, 0.045, 0.025);
  }

  canvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width) * WORLD_SIZE,
      y: (event.clientY - rect.top) / Math.max(1, rect.height) * WORLD_SIZE
    };
  }

  onPointerDown(event) {
    if (!this.running || !this.players[0].active) return;
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.canvas.classList.add("is-dragging");
    const point = this.canvasPoint(event);
    this.setPlayerTarget(point.x, point.y);
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return;
    const point = this.canvasPoint(event);
    this.setPlayerTarget(point.x, point.y);
    event.preventDefault();
  }

  onPointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.canvas.classList.remove("is-dragging");
  }

  setPlayerTarget(x, y) {
    const player = this.players[0];
    const target = this.constrainToSector(x, y, player.angle);
    player.targetX = target.x;
    player.targetY = target.y;
  }

  constrainToSector(x, y, anchorAngle) {
    const dx = x - CENTER.x;
    const dy = y - CENTER.y;
    const radius = clamp(length(dx, dy), MALLET_MIN_RADIUS, MALLET_MAX_RADIUS);
    const rawAngle = Math.atan2(dy, dx);
    const delta = clamp(angleDifference(rawAngle, anchorAngle), -MALLET_HALF_SECTOR, MALLET_HALF_SECTOR);
    const angle = anchorAngle + delta;
    return {
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius
    };
  }

  updateKeyboardTarget(dt) {
    if (!this.running || !this.players[0].active || !this.keyState.size) return;
    const player = this.players[0];
    let dx = 0;
    let dy = 0;
    if (this.keyState.has("arrowleft") || this.keyState.has("a")) dx -= 1;
    if (this.keyState.has("arrowright") || this.keyState.has("d")) dx += 1;
    if (this.keyState.has("arrowup") || this.keyState.has("w")) dy -= 1;
    if (this.keyState.has("arrowdown") || this.keyState.has("s")) dy += 1;
    if (!dx && !dy) return;
    const scale = 460 * dt / Math.max(1, Math.hypot(dx, dy));
    this.setPlayerTarget(player.targetX + dx * scale, player.targetY + dy * scale);
  }

  updateAi(player, dt) {
    if (!player.active) return;
    const puckAngle = Math.atan2(this.puck.y - CENTER.y, this.puck.x - CENTER.x);
    const puckRadius = length(this.puck.x - CENTER.x, this.puck.y - CENTER.y);
    const inTerritory = Math.abs(angleDifference(puckAngle, player.angle)) < Math.PI * 0.43;
    const homeRadius = ARENA_RADIUS * 0.61;
    let targetX = CENTER.x + Math.cos(player.angle) * homeRadius;
    let targetY = CENTER.y + Math.sin(player.angle) * homeRadius;

    if (inTerritory || length(this.puck.x - player.x, this.puck.y - player.y) < 235) {
      const prediction = clamp((puckRadius - homeRadius) / Math.max(150, length(this.puck.vx, this.puck.vy)), 0.05, 0.32);
      targetX = this.puck.x + this.puck.vx * prediction;
      targetY = this.puck.y + this.puck.vy * prediction;
      const attackBias = puckRadius < ARENA_RADIUS * 0.58 ? 0.82 : 0.93;
      targetX = CENTER.x + (targetX - CENTER.x) * attackBias;
      targetY = CENTER.y + (targetY - CENTER.y) * attackBias;
    } else {
      const tangent = Math.sin(performance.now() * 0.0012 + player.index * 2.1) * 24;
      targetX += -Math.sin(player.angle) * tangent;
      targetY += Math.cos(player.angle) * tangent;
    }
    const constrained = this.constrainToSector(targetX, targetY, player.angle);
    const responsiveness = 1 - Math.exp(-dt * 7.5);
    player.targetX += (constrained.x - player.targetX) * responsiveness;
    player.targetY += (constrained.y - player.targetY) * responsiveness;
  }

  moveMallet(player, dt) {
    if (!player.active) {
      player.vx = 0;
      player.vy = 0;
      return;
    }
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distance = length(dx, dy);
    const maxMove = MALLET_MAX_SPEED * dt;
    const move = Math.min(distance, maxMove);
    const oldX = player.x;
    const oldY = player.y;
    if (distance > 0.0001) {
      player.x += dx / distance * move;
      player.y += dy / distance * move;
    }
    const constrained = this.constrainToSector(player.x, player.y, player.angle);
    player.x = constrained.x;
    player.y = constrained.y;
    player.vx = (player.x - oldX) / dt;
    player.vy = (player.y - oldY) / dt;
  }

  physicsStep(dt) {
    if (!this.running || this.finished) return;
    this.timeRemaining = Math.max(0, this.timeRemaining - dt);
    if (this.timeRemaining <= 0) {
      this.finishMatch("time");
      return;
    }
    this.updateKeyboardTarget(dt);
    this.players.slice(1).forEach(player => this.updateAi(player, dt));
    this.players.forEach(player => this.moveMallet(player, dt));

    if (this.serveTimer > 0) {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) this.launchPuck();
      return;
    }

    this.puck.x += this.puck.vx * dt;
    this.puck.y += this.puck.vy * dt;
    const airDrag = Math.pow(0.9988, dt * 60);
    this.puck.vx *= airDrag;
    this.puck.vy *= airDrag;

    this.players.forEach(player => this.resolveMalletCollision(player));
    this.resolveArenaBoundary();
    this.limitPuckSpeed();
    this.trackPath();
  }

  resolveMalletCollision(player) {
    if (!player.active) return;
    const dx = this.puck.x - player.x;
    const dy = this.puck.y - player.y;
    const distance = length(dx, dy);
    const minDistance = PUCK_RADIUS + MALLET_RADIUS;
    if (distance >= minDistance) return;
    const nx = distance > 0.001 ? dx / distance : Math.cos(player.angle + Math.PI);
    const ny = distance > 0.001 ? dy / distance : Math.sin(player.angle + Math.PI);
    const overlap = minDistance - Math.max(distance, 0.001);
    this.puck.x += nx * overlap;
    this.puck.y += ny * overlap;
    const relativeX = this.puck.vx - player.vx;
    const relativeY = this.puck.vy - player.vy;
    const relativeNormal = relativeX * nx + relativeY * ny;
    if (relativeNormal < 0) {
      const restitution = 1.04;
      this.puck.vx -= (1 + restitution) * relativeNormal * nx;
      this.puck.vy -= (1 + restitution) * relativeNormal * ny;
      this.puck.vx += player.vx * 0.12;
      this.puck.vy += player.vy * 0.12;
    } else {
      this.puck.vx += nx * 18;
      this.puck.vy += ny * 18;
    }
    this.lastContactAt = performance.now();
    this.goalFlash = { type: "hit", x: this.puck.x, y: this.puck.y, life: 0.12, color: player.color };
    this.beep(180 + length(this.puck.vx, this.puck.vy) * 0.25, 0.018, 0.008);
  }

  goalOwnerAtAngle(angle) {
    let owner = null;
    let smallest = Infinity;
    this.players.forEach(player => {
      const difference = Math.abs(angleDifference(angle, player.angle));
      if (difference < GOAL_HALF_ANGLE && difference < smallest) {
        owner = player;
        smallest = difference;
      }
    });
    return owner;
  }

  resolveArenaBoundary() {
    const dx = this.puck.x - CENTER.x;
    const dy = this.puck.y - CENTER.y;
    const distance = length(dx, dy);
    if (distance < ARENA_RADIUS - PUCK_RADIUS) return;
    const angle = Math.atan2(dy, dx);
    const goalOwner = this.goalOwnerAtAngle(angle);
    const outward = distance > 0 ? (this.puck.vx * dx + this.puck.vy * dy) / distance : 0;
    if (goalOwner?.active && outward > -20) {
      if (distance > ARENA_RADIUS + GOAL_DEPTH) this.registerGoal(goalOwner);
      return;
    }
    const nx = distance > 0 ? dx / distance : 1;
    const ny = distance > 0 ? dy / distance : 0;
    const allowed = ARENA_RADIUS - PUCK_RADIUS;
    this.puck.x = CENTER.x + nx * allowed;
    this.puck.y = CENTER.y + ny * allowed;
    const normalVelocity = this.puck.vx * nx + this.puck.vy * ny;
    if (normalVelocity > 0) {
      this.puck.vx -= 1.94 * normalVelocity * nx;
      this.puck.vy -= 1.94 * normalVelocity * ny;
      this.beep(125 + Math.min(260, Math.abs(normalVelocity) * 0.32), 0.016, 0.006);
    }
  }

  registerGoal(defender) {
    if (!this.running || this.finished || !defender.active) return;
    defender.lives = Math.max(0, defender.lives - 1);
    if (defender.lives === 0) defender.active = false;
    const scorer = this.findLikelyScorer(defender);
    if (scorer) scorer.goalsFor += 1;
    this.decisivePath = this.roundPath.slice(-64);
    this.goalFlash = { type: "goal", owner: defender.index, life: 0.82, color: defender.color };
    this.updateScoreboard();
    this.beep(620, 0.10, 0.045);
    setTimeout(() => !this.destroyed && this.beep(810, 0.12, 0.035), 90);
    const remaining = this.players.filter(player => player.active);
    if (remaining.length <= 1) {
      this.running = false;
      this.finished = true;
      this.pendingWinner = remaining[0] || null;
      this.pendingFinishReason = "elimination";
      this.scheduleResult(0.72);
      return;
    }
    this.setTransientStatus(`${defender.name} の防衛ライトが1つ消灯`, 1.15);
    this.resetPuck(1.0);
  }

  findLikelyScorer(defender) {
    const candidates = this.players.filter(player => player.active && player !== defender);
    if (!candidates.length) return null;
    return candidates.sort((a, b) => {
      const da = length(a.x - this.puck.x, a.y - this.puck.y);
      const db = length(b.x - this.puck.x, b.y - this.puck.y);
      return da - db;
    })[0];
  }

  limitPuckSpeed() {
    const speed = length(this.puck.vx, this.puck.vy);
    if (speed > MAX_PUCK_SPEED) {
      const scale = MAX_PUCK_SPEED / speed;
      this.puck.vx *= scale;
      this.puck.vy *= scale;
    }
    if (speed < 72 && performance.now() - this.lastContactAt > 1600) {
      const angle = Math.atan2(this.puck.vy, this.puck.vx) || -Math.PI / 2;
      this.puck.vx = Math.cos(angle) * 72;
      this.puck.vy = Math.sin(angle) * 72;
    }
  }

  trackPath() {
    const last = this.roundPath[this.roundPath.length - 1];
    if (!last || length(this.puck.x - last.x, this.puck.y - last.y) > 9) {
      this.roundPath.push({ x: this.puck.x, y: this.puck.y });
      if (this.roundPath.length > 120) this.roundPath.shift();
    }
    const trailLast = this.puckTrail[this.puckTrail.length - 1];
    if (!trailLast || length(this.puck.x - trailLast.x, this.puck.y - trailLast.y) > 12) {
      this.puckTrail.push({ x: this.puck.x, y: this.puck.y });
      if (this.puckTrail.length > 20) this.puckTrail.shift();
    }
  }

  finishMatch(reason = "elimination") {
    if (this.resultPresented || this.finishTimeout) return;
    this.running = false;
    this.finished = true;
    const alive = this.players.filter(player => player.active);
    let winner = alive.length === 1 ? alive[0] : null;
    if (!winner) {
      const ranking = [...this.players].sort((a, b) => (b.lives - a.lives) || (b.goalsFor - a.goalsFor));
      if (ranking[0] && (ranking[0].lives !== ranking[1]?.lives || ranking[0].goalsFor !== ranking[1]?.goalsFor)) winner = ranking[0];
    }
    this.pendingWinner = winner;
    this.pendingFinishReason = reason;
    this.scheduleResult(0.55);
  }

  scheduleResult(delaySeconds) {
    clearTimeout(this.finishTimeout);
    this.finishTimeout = window.setTimeout(() => {
      this.finishTimeout = 0;
      if (!this.destroyed) this.presentResult();
    }, Math.max(0, Number(delaySeconds) || 0) * 1000);
  }

  presentResult() {
    if (this.resultPresented) return;
    this.resultPresented = true;
    const winner = this.pendingWinner;
    const isPlayerWinner = winner?.index === 0;
    const title = winner ? `${winner.name}\nの勝利` : "引き分け";
    const copy = isPlayerWinner
      ? "最後までゴールを守り切りました。3人の一戦を記念カードに残しました。"
      : winner
        ? `${winner.name} が最後の防衛ライトを守りました。試合の軌跡を記念カードに残しました。`
        : "90秒の物理戦は決着せず。互角の一戦を記念カードに残しました。";
    if (this.statusTitle) this.statusTitle.textContent = title;
    if (this.statusCopy) this.statusCopy.textContent = copy;
    if (this.startButton) this.startButton.textContent = "もう一度対戦";
    if (this.overlay) this.overlay.hidden = false;
    const memory = this.createMemory(winner);
    this.memories = [memory, ...this.memories.filter(item => item?.id !== memory.id)].slice(0, 12);
    this.renderMemories();
    if (!this.testMode) {
      try {
        this.onRecord?.(this.serializableMemory(memory));
      } catch (error) {
        console.error("トライリンク記念カードを保存できませんでした。", error);
      }
    }
    this.beep(isPlayerWinner ? 880 : 520, 0.16, 0.05);
  }

  createMemory(winner) {
    const path = (this.decisivePath.length ? this.decisivePath : this.roundPath).slice(-54).map(point => ({
      x: Math.round(clamp(point.x / WORLD_SIZE * 100, 0, 100) * 10) / 10,
      y: Math.round(clamp(point.y / WORLD_SIZE * 100, 0, 100) * 10) / 10
    }));
    return {
      id: this.matchId,
      savedAt: Date.now(),
      winnerId: winner?.id || "",
      resultLabel: winner ? `${winner.name} 勝利` : "引き分け",
      durationSeconds: Math.round(MATCH_SECONDS - this.timeRemaining),
      participants: this.players.map(player => ({
        id: player.id,
        name: player.name,
        role: player.role,
        roleLabel: player.roleLabel,
        lives: player.lives,
        goalsFor: player.goalsFor,
        color: player.color,
        appearance: { ...player.appearance },
        art: player.art
      })),
      path
    };
  }

  serializableMemory(memory) {
    return {
      ...memory,
      participants: memory.participants.map(({ art, ...participant }) => participant)
    };
  }

  renderMemories() {
    if (!this.memoryList) return;
    if (!this.memories.length) {
      this.memoryList.innerHTML = '<div class="itl-memory-empty">最初の試合が終わると、3人の記念写真風カードと決着直前のパック軌跡がここに残ります。</div>';
      return;
    }
    this.memoryList.innerHTML = this.memories.slice(0, 12).map(memory => this.memoryCardMarkup(memory)).join("");
  }

  memoryCardMarkup(memory) {
    const people = Array.isArray(memory?.participants) ? memory.participants.slice(0, 3) : [];
    const path = Array.isArray(memory?.path) ? memory.path : [];
    const polyline = path.map(point => `${clamp(Number(point.x) || 0, 0, 100) * .82},${clamp(Number(point.y) || 0, 0, 100) * .43}`).join(" ");
    return `<article class="itl-photo-card">
      <div class="itl-card-head"><b>TRI-LINK MEMORY</b><span>${escapeHtml(formatDate(memory?.savedAt))}</span></div>
      <div class="itl-card-photos">
        ${people.map(person => `<div class="itl-card-person${person.id === memory?.winnerId ? " is-winner" : ""}" style="--itl-color:${escapeHtml(safeColor(person.color, "#8de5ff"))}">
          <div class="itl-card-photo">${person.art || `<b>${escapeHtml(String(person.name || "相").slice(0, 1))}</b>`}</div><span>${escapeHtml(person.name || "相棒")}</span>
        </div>`).join("")}
      </div>
      <div class="itl-card-foot">
        <div class="itl-card-result"><strong>${escapeHtml(memory?.resultLabel || "試合記録")}</strong><small>${Math.max(0, Number(memory?.durationSeconds) || 0)}秒 ／ 防衛ライト ${people.map(person => Math.max(0, Number(person.lives) || 0)).join("・")}</small></div>
        <svg class="itl-path-map" viewBox="0 0 82 43" aria-label="決着直前のパック軌跡"><ellipse cx="41" cy="21.5" rx="39" ry="19.5" fill="rgba(1,18,32,.38)" stroke="rgba(255,255,255,.35)"/>${polyline ? `<polyline points="${polyline}" fill="none" stroke="#fff3a0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}</svg>
      </div>
    </article>`;
  }

  updateScoreboard() {
    const maxLives = Math.max(...this.players.map(player => player.lives));
    this.players.forEach(player => {
      const card = this.root.querySelector(`[data-itl-player="${player.index}"]`);
      card?.classList.toggle("is-out", !player.active);
      card?.classList.toggle("is-leading", player.active && player.lives === maxLives && this.players.filter(item => item.active && item.lives === maxLives).length === 1);
      card?.querySelectorAll(".itl-life").forEach((light, index) => light.classList.toggle("is-on", index < player.lives));
    });
  }

  setTransientStatus(text, seconds) {
    this.transientStatus = text;
    this.statusTimer = seconds;
  }

  updateFrame(delta) {
    if (this.goalFlash) {
      this.goalFlash.life -= delta;
      if (this.goalFlash.life <= 0) this.goalFlash = null;
    }
    if (this.statusTimer > 0) this.statusTimer = Math.max(0, this.statusTimer - delta);
    if (this.clockValue) this.clockValue.textContent = String(Math.ceil(this.timeRemaining)).padStart(2, "0");
  }

  loop(timestamp) {
    if (this.destroyed) return;
    const previous = this.lastTimestamp || timestamp;
    const delta = clamp((timestamp - previous) / 1000, 0, 0.05);
    this.lastTimestamp = timestamp;
    this.accumulator = Math.min(0.09, this.accumulator + delta);
    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < 10) {
      this.physicsStep(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }
    this.updateFrame(delta);
    this.draw();
    this.frame = requestAnimationFrame(this.boundLoop);
  }

  draw() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const scale = this.pixelScale || this.canvas.width / WORLD_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    const bg = ctx.createLinearGradient(0, 0, WORLD_SIZE, WORLD_SIZE);
    bg.addColorStop(0, "#071b2c");
    bg.addColorStop(.55, "#0a3553");
    bg.addColorStop(1, "#061523");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    this.drawArena(ctx);
    this.drawTrails(ctx);
    this.players.forEach(player => this.drawMallet(ctx, player));
    this.drawPuck(ctx);
    this.drawTransient(ctx);
  }

  drawArena(ctx) {
    ctx.save();
    ctx.shadowColor = "rgba(53, 210, 255, .35)";
    ctx.shadowBlur = 34;
    const rink = ctx.createRadialGradient(CENTER.x - 90, CENTER.y - 120, 35, CENTER.x, CENTER.y, ARENA_RADIUS);
    rink.addColorStop(0, "#20a2c5");
    rink.addColorStop(.5, "#0f719c");
    rink.addColorStop(1, "#084468");
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, ARENA_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = rink;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, ARENA_RADIUS - 8, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalAlpha = .11;
    ctx.strokeStyle = "#e1f9ff";
    ctx.lineWidth = 2;
    for (let r = 82; r < ARENA_RADIUS; r += 72) {
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    PLAYER_ANGLES.forEach(angle => {
      ctx.beginPath();
      ctx.moveTo(CENTER.x, CENTER.y);
      ctx.lineTo(CENTER.x + Math.cos(angle) * ARENA_RADIUS, CENTER.y + Math.sin(angle) * ARENA_RADIUS);
      ctx.stroke();
    });
    ctx.restore();

    this.players.forEach(player => this.drawGoal(ctx, player));
    this.drawRails(ctx);

    ctx.save();
    ctx.translate(CENTER.x, CENTER.y);
    ctx.strokeStyle = "rgba(231, 251, 255, .44)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 3; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
      const x = Math.cos(angle) * 61;
      const y = Math.sin(angle) * 61;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawRails(ctx) {
    const sorted = [...this.players].sort((a, b) => a.angle - b.angle);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 20;
    ctx.strokeStyle = "#d9f5ff";
    ctx.shadowColor = "rgba(102, 221, 255, .6)";
    ctx.shadowBlur = 14;
    let cursor = -Math.PI;
    const openings = sorted.map(player => ({
      start: normalizeAngle(player.angle - GOAL_HALF_ANGLE),
      end: normalizeAngle(player.angle + GOAL_HALF_ANGLE),
      active: player.active
    })).sort((a, b) => a.start - b.start);
    const segments = [];
    for (let sample = -Math.PI; sample < Math.PI; sample += .012) {
      const inOpenGoal = this.players.some(player => player.active && Math.abs(angleDifference(sample, player.angle)) < GOAL_HALF_ANGLE);
      if (!inOpenGoal && cursor === null) cursor = sample;
      if (inOpenGoal && cursor !== null) {
        segments.push([cursor, sample]);
        cursor = null;
      }
    }
    if (cursor !== null) segments.push([cursor, Math.PI]);
    segments.forEach(([start, end]) => {
      ctx.beginPath();
      ctx.arc(CENTER.x, CENTER.y, ARENA_RADIUS, start, end);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawGoal(ctx, player) {
    const angle = player.angle;
    const tangentX = -Math.sin(angle);
    const tangentY = Math.cos(angle);
    const normalX = Math.cos(angle);
    const normalY = Math.sin(angle);
    const mouthHalf = ARENA_RADIUS * Math.sin(GOAL_HALF_ANGLE) * .88;
    const innerX = CENTER.x + normalX * (ARENA_RADIUS - 1);
    const innerY = CENTER.y + normalY * (ARENA_RADIUS - 1);
    const outerX = CENTER.x + normalX * (ARENA_RADIUS + GOAL_DEPTH);
    const outerY = CENTER.y + normalY * (ARENA_RADIUS + GOAL_DEPTH);
    ctx.save();
    ctx.fillStyle = player.active ? "rgba(1, 10, 19, .9)" : "rgba(181, 215, 225, .7)";
    ctx.strokeStyle = player.active ? player.color : "#d9f5ff";
    ctx.lineWidth = player.active ? 7 : 14;
    ctx.shadowColor = player.active ? player.color : "rgba(255,255,255,.45)";
    ctx.shadowBlur = player.active ? 17 : 8;
    ctx.beginPath();
    ctx.moveTo(innerX + tangentX * mouthHalf, innerY + tangentY * mouthHalf);
    ctx.lineTo(outerX + tangentX * mouthHalf * .78, outerY + tangentY * mouthHalf * .78);
    ctx.lineTo(outerX - tangentX * mouthHalf * .78, outerY - tangentY * mouthHalf * .78);
    ctx.lineTo(innerX - tangentX * mouthHalf, innerY - tangentY * mouthHalf);
    if (!player.active) ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawTrails(ctx) {
    if (this.puckTrail.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    for (let i = 1; i < this.puckTrail.length; i += 1) {
      const a = this.puckTrail[i - 1];
      const b = this.puckTrail[i];
      ctx.globalAlpha = i / this.puckTrail.length * .28;
      ctx.strokeStyle = "#fff3ad";
      ctx.lineWidth = 3 + i / this.puckTrail.length * 4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMallet(ctx, player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.globalAlpha = player.active ? 1 : .28;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = player.active ? 20 : 0;
    const gradient = ctx.createRadialGradient(-10, -12, 4, 0, 0, MALLET_RADIUS);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(.25, player.color);
    gradient.addColorStop(1, "#0b253b");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(255,255,255,.86)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, MALLET_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#062034";
    ctx.font = "900 18px 'Yu Gothic', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.index === 0 ? "相棒" : `AI${player.index}`, 0, 1);
    ctx.restore();
  }

  drawPuck(ctx) {
    ctx.save();
    ctx.translate(this.puck.x, this.puck.y);
    ctx.shadowColor = "rgba(255, 218, 100, .85)";
    ctx.shadowBlur = 20;
    const gradient = ctx.createRadialGradient(-7, -8, 2, 0, 0, PUCK_RADIUS);
    gradient.addColorStop(0, "#fffde0");
    gradient.addColorStop(.3, "#ffd66b");
    gradient.addColorStop(.75, "#f06872");
    gradient.addColorStop(1, "#a52f55");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, PUCK_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawTransient(ctx) {
    if (this.goalFlash?.type === "hit") {
      ctx.save();
      ctx.globalAlpha = clamp(this.goalFlash.life / .12, 0, 1);
      ctx.strokeStyle = this.goalFlash.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(this.goalFlash.x, this.goalFlash.y, 34 + (1 - this.goalFlash.life / .12) * 32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (this.goalFlash?.type === "goal") {
      ctx.save();
      ctx.globalAlpha = clamp(this.goalFlash.life / .82, 0, .72);
      ctx.fillStyle = this.goalFlash.color;
      ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);
      ctx.restore();
    }
    if (this.statusTimer > 0 && this.transientStatus) {
      ctx.save();
      ctx.globalAlpha = clamp(this.statusTimer * 2, 0, 1);
      ctx.fillStyle = "rgba(2, 17, 30, .76)";
      ctx.beginPath();
      ctx.roundRect(220, 455, 560, 90, 26);
      ctx.fill();
      ctx.fillStyle = "#f3fbff";
      ctx.font = "900 25px 'Yu Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.transientStatus, CENTER.x, CENTER.y);
      ctx.restore();
    }
  }

  resumeAudio() {
    try {
      if (!this.audioContext) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (AudioCtor) this.audioContext = new AudioCtor();
      }
      this.audioContext?.resume?.();
    } catch (error) {
      this.audioContext = null;
    }
  }

  beep(frequency, duration, volume) {
    if (!this.audioContext || this.audioContext.state !== "running") return;
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(clamp(frequency, 80, 1200), now);
    gain.gain.setValueAtTime(Math.max(.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .01);
  }

  destroy() {
    this.destroyed = true;
    clearTimeout(this.finishTimeout);
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.audioContext?.close?.().catch?.(() => {});
    this.root.innerHTML = "";
  }
}

window.ImasoraTriLink = Object.freeze({
  mount(root, options = {}) {
    if (!root) return;
    if (mountedGame) mountedGame.destroy();
    mountedGame = new ImasoraTriLinkGame(root, options);
    mountedGame.mount();
  },
  unmount() {
    if (!mountedGame) return;
    mountedGame.destroy();
    mountedGame = null;
  }
});
