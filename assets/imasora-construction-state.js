// Stage 2-1: development-loan data only. No legacy wallet/save access.
export const CONSTRUCTION_SCHEMA = 1;
export const SOIL_UNIT = 1000; // fixed-point volume: one displayed block
export const LOAN_VOLUME = 32 * SOIL_UNIT;
export const TERRAIN_LOAN_VOLUME = (16 * 12 * 5 + 32) * SOIL_UNIT;
export const TERRAIN_SCOPE = 'development-terrain-loan-v1';
const scopeFor = profile => {
  if (profile === 'foundation') return 'development-loan';
  if (profile === 'terrain') return TERRAIN_SCOPE;
  throw new Error('不明な建設確認区分です。');
};
export const STORAGE_FORMAT = 'imasora-construction-development-v1';
const WORLD = Object.freeze({ width: 5400, depth: 3600, cellSize: 8, chunkSize: 16 });
const ACCOUNTS = ['storage', 'held', 'vehicle', 'loose', 'terrain', 'fixed', 'fluid'];
const MOBILE = ['storage', 'held', 'vehicle', 'loose'];
const MAX_HISTORY = 128;
const MAX_TRANSACTIONS = 20000;
const copy = value => structuredClone(value);
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function integer(value, min, max) { return Number.isSafeInteger(value) && value >= min && value <= max; }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function keys(value, expected) {
  requireValue(object(value) && Object.keys(value).sort().join('|') === [...expected].sort().join('|'), '保存データの項目が不正です。');
}
function id(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,96}$/.test(value); }
export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
// Accidental-corruption check, NOT an authentication/signature or anti-cheat mechanism.
function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export function createConstructionState(now = Date.now(), { profile = 'foundation' } = {}) {
  const state = {
    schemaVersion: CONSTRUCTION_SCHEMA, mapId: 'construction', scope: scopeFor(profile), revision: 0, updatedAt: now,
    world: { ...WORLD }, materials: { 'earth-soil': { issued: LOAN_VOLUME, accounts: Object.fromEntries(ACCOUNTS.map(k => [k, k === 'storage' ? LOAN_VOLUME : 0])) } },
    chunks: {}, parts: {}, fluids: {}, vehicles: {}, history: { past: [], future: [] }, transactions: {}
  };
  if (profile === 'terrain') {
    for (let x = -8; x < 8; x++) for (let z = -6; z < 6; z++) for (let y = -5; y < 0; y++) setCell(state, [x, y, z], 'earth-soil');
    state.materials['earth-soil'].issued = TERRAIN_LOAN_VOLUME;
    state.materials['earth-soil'].accounts.terrain = TERRAIN_LOAN_VOLUME - LOAN_VOLUME;
  }
  return state;
}
function position(value) {
  requireValue(Array.isArray(value) && value.length === 3 && value.every(Number.isSafeInteger), '地形の座標が不正です。');
  const [x, y, z] = value, half = WORLD.cellSize / 2;
  requireValue(Math.abs(x * WORLD.cellSize) + half <= WORLD.width / 2 && Math.abs(z * WORLD.cellSize) + half <= WORLD.depth / 2 && y >= -32 && y <= 127, '建設用の保存範囲外です。');
}
export function cellAddress(pos) {
  position(pos);
  return { chunk: pos.map(n => Math.floor(n / WORLD.chunkSize)).join(','), local: pos.map(n => ((n % WORLD.chunkSize) + WORLD.chunkSize) % WORLD.chunkSize).join(',') };
}
export function getCell(state, pos) {
  const a = cellAddress(pos); return state.chunks[a.chunk]?.[a.local] ?? null;
}
function setCell(state, pos, material) {
  const a = cellAddress(pos);
  if (material) (state.chunks[a.chunk] ??= {})[a.local] = material;
  else {
    delete state.chunks[a.chunk][a.local];
    if (!Object.keys(state.chunks[a.chunk]).length) delete state.chunks[a.chunk];
  }
}
export function cells(state) {
  return Object.entries(state.chunks).flatMap(([chunk, values]) => Object.entries(values).map(([local, material]) => {
    const c = chunk.split(',').map(Number), l = local.split(',').map(Number);
    return { position: c.map((n, i) => n * WORLD.chunkSize + l[i]), material };
  }));
}
export function materialTotals(state) {
  return Object.fromEntries(Object.entries(state.materials).map(([key, m]) => [key, Object.values(m.accounts).reduce((a, b) => a + b, 0)]));
}
function validateOperation(op) {
  requireValue(object(op), '建設操作が不正です。');
  if (op.type === 'transfer') {
    keys(op, ['type', 'from', 'to', 'amount']);
    requireValue(MOBILE.includes(op.from) && MOBILE.includes(op.to) && op.from !== op.to && integer(op.amount, 1, TERRAIN_LOAN_VOLUME), '素材の移動先または量が不正です。');
  } else if (op.type === 'edit-cells') {
    keys(op, ['type', 'action', 'positions']);
    requireValue(['dig', 'place'].includes(op.action) && Array.isArray(op.positions) && op.positions.length > 0 && op.positions.length <= 36, '土の編集範囲が不正です。');
    op.positions.forEach(position);
    requireValue(new Set(op.positions.map(p => p.join(','))).size === op.positions.length, '同じ土を二重に編集できません。');
  } else if (op.type === 'place-cell') {
    keys(op, ['type', 'from', 'position']); position(op.position);
    requireValue(MOBILE.includes(op.from), '土の移動元が不正です。');
  } else if (op.type === 'remove-cell') {
    keys(op, ['type', 'to', 'position']); position(op.position);
    requireValue(MOBILE.includes(op.to), '土の回収先が不正です。');
  } else throw new Error('この段階では未対応の建設操作です。');
}
function applyOperation(state, op) {
  validateOperation(op);
  const ledger = state.materials['earth-soil'].accounts;
  if (op.type === 'edit-cells') {
    requireValue(state.scope === TERRAIN_SCOPE, '立体地形の確認専用操作です。');
    for (const p of op.positions) applyOperation(state, op.action === 'dig' ? { type: 'remove-cell', to: 'storage', position: p } : { type: 'place-cell', from: 'storage', position: p });
    return { type: 'edit-cells', action: op.action === 'dig' ? 'place' : 'dig', positions: copy(op.positions) };
  }
  if (op.type === 'transfer') {
    requireValue(ledger[op.from] >= op.amount, '移動元の土が足りません。');
    ledger[op.from] -= op.amount; ledger[op.to] += op.amount;
    return { type: 'transfer', from: op.to, to: op.from, amount: op.amount };
  }
  if (op.type === 'place-cell') {
    requireValue(!getCell(state, op.position), 'その場所にはすでに土があります。');
    requireValue(ledger[op.from] >= SOIL_UNIT, '配置する土が足りません。');
    setCell(state, op.position, 'earth-soil'); ledger[op.from] -= SOIL_UNIT; ledger.terrain += SOIL_UNIT;
    return { type: 'remove-cell', to: op.from, position: [...op.position] };
  }
  requireValue(getCell(state, op.position) === 'earth-soil', '回収する土がありません。');
  setCell(state, op.position, null); ledger.terrain -= SOIL_UNIT; ledger[op.to] += SOIL_UNIT;
  return { type: 'place-cell', from: op.to, position: [...op.position] };
}
function dataView(state) { return canonical({ materials: state.materials, chunks: state.chunks }); }
export function validateConstructionState(state, { verifyHistory = true } = {}) {
  keys(state, ['schemaVersion', 'mapId', 'scope', 'revision', 'updatedAt', 'world', 'materials', 'chunks', 'parts', 'fluids', 'vehicles', 'history', 'transactions']);
  requireValue(state.schemaVersion === CONSTRUCTION_SCHEMA && state.mapId === 'construction' && ['development-loan', TERRAIN_SCOPE].includes(state.scope), 'この保存版・マップ・開発区分には対応していません。');
  requireValue(integer(state.revision, 0, Number.MAX_SAFE_INTEGER - 1) && integer(state.updatedAt, 0, Number.MAX_SAFE_INTEGER), '保存番号または日時が不正です。');
  requireValue(canonical(state.world) === canonical(WORLD), '保存された建設範囲が一致しません。');
  keys(state.materials, ['earth-soil']);
  const m = state.materials['earth-soil']; keys(m, ['issued', 'accounts']); keys(m.accounts, ACCOUNTS);
  const loan = state.scope === TERRAIN_SCOPE ? TERRAIN_LOAN_VOLUME : LOAN_VOLUME;
  requireValue(m.issued === loan && Object.values(m.accounts).every(n => integer(n, 0, loan)), '素材量が不正です。');
  requireValue(materialTotals(state)['earth-soil'] === m.issued, '素材の総量が一致しません。上書きせず停止します。');
  // These records are reserved, not a claim of implemented vehicle/fluid/part physics.
  for (const reserved of ['parts', 'fluids', 'vehicles']) keys(state[reserved], []);
  requireValue(m.accounts.fixed === 0 && m.accounts.fluid === 0, '未実装の素材保管先が使われています。');
  requireValue(object(state.chunks) && Object.keys(state.chunks).length <= loan / SOIL_UNIT, '区画データが不正です。');
  for (const [chunk, values] of Object.entries(state.chunks)) {
    requireValue(/^-?\d+,-?\d+,-?\d+$/.test(chunk) && object(values) && Object.keys(values).length > 0, '区画の座標が不正です。');
    const cc = chunk.split(',').map(Number);
    requireValue(cc.join(',') === chunk, '区画の座標表記が不正です。');
    for (const [local, material] of Object.entries(values)) {
      requireValue(/^\d+,\d+,\d+$/.test(local) && material === 'earth-soil', '地形の素材が不正です。');
      const ll = local.split(',').map(Number);
      requireValue(ll.every(n => integer(n, 0, WORLD.chunkSize - 1)) && ll.join(',') === local, '区画内の座標が不正です。');
      position(cc.map((n, i) => n * WORLD.chunkSize + ll[i]));
    }
  }
  requireValue(cells(state).length * SOIL_UNIT === m.accounts.terrain, '地形と素材台帳が一致しません。');
  keys(state.history, ['past', 'future']);
  requireValue(Array.isArray(state.history.past) && Array.isArray(state.history.future) && state.history.past.length + state.history.future.length <= MAX_HISTORY, '操作履歴が不正です。');
  requireValue(object(state.transactions) && Object.keys(state.transactions).length <= MAX_TRANSACTIONS, '取引記録の上限または形式を確認してください。');
  for (const [txId, receipt] of Object.entries(state.transactions)) {
    requireValue(id(txId), '取引IDが不正です。'); keys(receipt, ['fingerprint', 'revision']);
    requireValue(typeof receipt.fingerprint === 'string' && receipt.fingerprint.length <= 2048 && integer(receipt.revision, 1, state.revision), '取引記録が不正です。');
  }
  for (const entry of [...state.history.past, ...state.history.future]) {
    keys(entry, ['id', 'forward', 'inverse']);
    requireValue(id(entry.id) && Object.hasOwn(state.transactions, entry.id), '履歴の取引が見つかりません。');
    validateOperation(entry.forward); validateOperation(entry.inverse);
  }
  if (verifyHistory) {
    const backward = copy(state), forward = copy(state);
    for (const entry of [...state.history.past].reverse()) {
      const inverse = applyOperation(backward, entry.inverse);
      requireValue(canonical(inverse) === canonical(entry.forward), '取り消し履歴が一致しません。');
    }
    for (const entry of state.history.past) applyOperation(backward, entry.forward);
    requireValue(dataView(backward) === dataView(state), '履歴からの復元結果が一致しません。');
    for (const entry of [...state.history.future].reverse()) {
      const inverse = applyOperation(forward, entry.forward);
      requireValue(canonical(inverse) === canonical(entry.inverse), 'やり直し履歴が一致しません。');
    }
  }
  return true;
}
export function reduceConstruction(state, command, txId, now = Date.now()) {
  validateConstructionState(state); requireValue(id(txId), '取引IDが不正です。');
  const fingerprint = canonical(command), prior = state.transactions[txId];
  if (Object.hasOwn(state.transactions, txId)) {
    requireValue(prior.fingerprint === fingerprint, '同じ取引IDに違う操作は指定できません。'); return state;
  }
  requireValue(Object.keys(state.transactions).length < MAX_TRANSACTIONS, '開発用取引の上限です。保存を書き出してください。');
  const next = copy(state);
  if (command?.type === 'undo' || command?.type === 'redo') {
    keys(command, ['type']);
    const undo = command.type === 'undo', source = undo ? next.history.past : next.history.future;
    requireValue(source.length > 0, undo ? '取り消せる操作がありません。' : 'やり直せる操作がありません。');
    const entry = source.pop(); applyOperation(next, undo ? entry.inverse : entry.forward);
    (undo ? next.history.future : next.history.past).push(entry);
  } else {
    const inverse = applyOperation(next, command);
    next.history.past.push({ id: txId, forward: copy(command), inverse });
    if (next.history.past.length > MAX_HISTORY) next.history.past.shift();
    next.history.future = [];
  }
  next.revision++; next.updatedAt = now;
  next.transactions[txId] = { fingerprint, revision: next.revision };
  validateConstructionState(next); return next;
}
export function packConstruction(state) {
  validateConstructionState(state);
  return JSON.stringify({ format: STORAGE_FORMAT, checksum: checksum(canonical(state)), state });
}
export function unpackConstruction(text) {
  requireValue(typeof text === 'string' && text.length <= 8_000_000, '保存ファイルの形式・サイズが不正です。');
  const packet = JSON.parse(text); keys(packet, ['format', 'checksum', 'state']);
  requireValue(packet.format === STORAGE_FORMAT && packet.checksum === checksum(canonical(packet.state)), '保存ファイルの整合性を確認できません。');
  validateConstructionState(packet.state); return packet.state;
}

// Store contract: read() -> record|null; commit(expectedGeneration, packet) atomically CAS-writes
// { generation, current, backups[] }. A failed commit must leave ALL data untouched.
export class ConstructionSession {
  constructor(store, { profile = 'foundation' } = {}) { this.store = store; this.profile = profile; this.scope = scopeFor(profile); this.state = null; this.generation = null; this.readOnly = false; this.incompatible = false; this.warning = ''; this.busy = false; this.rawRecord = null; }
  async load() {
    requireValue(!this.busy, '保存処理中です。'); this.busy = true;
    try {
      const record = await this.store.read();
      this.state = null; this.rawRecord = record; this.readOnly = false; this.incompatible = false; this.warning = '';
      this.generation = record?.generation ?? null;
      if (!record) return null;
      requireValue(integer(record.generation, 1, Number.MAX_SAFE_INTEGER - 1) && Array.isArray(record.backups), '保存管理情報が不正です。元データを保護したまま停止します。');
      try { const candidate = unpackConstruction(record.current); requireValue(candidate.scope === this.scope, '別の開発区分の保存です。'); this.state = candidate; }
      catch (error) {
        this.readOnly = true;
        // Never roll a future schema backwards, even if an older backup parses.
        let newer = false;
        try { newer = JSON.parse(record.current)?.state?.schemaVersion > CONSTRUCTION_SCHEMA; } catch {}
        if (newer) { this.incompatible = true; throw new Error('新しい版の保存データです。この開発画面では上書きしません。'); }
        for (const backup of record.backups) {
          try { const candidate = unpackConstruction(backup); requireValue(candidate.scope === this.scope, '別の開発区分の保存です。'); this.state = candidate; break; } catch {}
        }
        this.warning = this.state ? '最新の保存に異常があります。直近の正常データを読み取り専用で表示中です。復旧を確定するまで変更しません。' : '正常な保存を読み込めません。元データを保護しています。書き出し後に復元してください。';
        if (!this.state) throw new Error(this.warning);
      }
      return copy(this.state);
    } catch (error) { this.readOnly = true; this.warning = error.message; throw error; }
    finally { this.busy = false; }
  }
  async initialize() {
    requireValue(this.generation === null && !this.readOnly && !this.state, '既存の保存は初期化できません。');
    return this.commitState(createConstructionState(Date.now(), { profile: this.profile }));
  }
  async commitState(next, { recovery = false } = {}) {
    requireValue(!this.busy, '保存処理中です。');
    requireValue(!this.incompatible, '新しい版の保存データは上書きできません。');
    requireValue(!this.readOnly || recovery, '読み取り専用です。復旧を確定してください。');
    requireValue(next.scope === this.scope, '別の開発区分の保存は書き込めません。');
    this.busy = true;
    try {
      const packet = packConstruction(next);
      const record = await this.store.commit(this.generation, packet);
      // Publish only AFTER transaction.oncomplete. No optimistic material subtraction.
      this.state = copy(next); this.generation = record.generation; this.rawRecord = record; this.readOnly = false; this.warning = '';
      return copy(this.state);
    } catch (error) { this.warning = '保存できませんでした。今回の変更は適用していません。' + error.message; throw new Error(this.warning, { cause: error }); }
    finally { this.busy = false; }
  }
  async dispatch(command, txId) {
    requireValue(this.state && !this.busy && !this.readOnly, '読み込み・保存状況を確認してください。');
    const next = reduceConstruction(this.state, command, txId);
    return next === this.state ? copy(this.state) : this.commitState(next);
  }
  async confirmRecovery() {
    requireValue(this.readOnly && this.state, '復旧できる正常データがありません。');
    const next = copy(this.state); next.revision++; next.updatedAt = Date.now();
    return this.commitState(next, { recovery: true });
  }
  async restore(text) {
    // Explicit development-only snapshot replacement; no purchase/wallet rollback API.
    const emptyDestination = this.generation === null && !this.readOnly && this.rawRecord === null;
    requireValue(!this.busy && (emptyDestination || integer(this.generation, 1, Number.MAX_SAFE_INTEGER - 1)), '復元先の保存状態を確認してください。');
    requireValue(!this.incompatible, '新しい版の保存データは上書きできません。');
    const next = unpackConstruction(text);
    next.revision = Math.max(next.revision, this.state?.revision ?? 0) + 1;
    next.updatedAt = Date.now();
    if (this.state) for (const [txId, receipt] of Object.entries(this.state.transactions)) {
      if (!Object.hasOwn(next.transactions, txId)) next.transactions[txId] = copy(receipt);
      else requireValue(next.transactions[txId].fingerprint === receipt.fingerprint, '復元データの取引IDが既存記録と衝突しています。');
    }
    return this.commitState(next, { recovery: true });
  }
  export() { requireValue(this.state, '書き出せる正常データがありません。'); return packConstruction(this.state); }
  exportRaw() { return JSON.stringify(this.rawRecord, null, 2); }
}
