import { cells, getCell, TERRAIN_SCOPE, reduceConstruction } from './imasora-construction-state.js';

export const CELL = 8;
export const PILOT = Object.freeze({ radius: 15.6, height: 26.6, speed: 48, jump: 44, gravity: 90, step: 8.01 });
export const EDIT = Object.freeze({ minX: -8, maxX: 7, minY: -5, maxY: 7, minZ: -6, maxZ: 5 });
export const SPAWN = Object.freeze({ x: -86, y: 0, z: 24, vy: 0, grounded: true, heading: Math.PI / 2 });
const EPS = 1e-5;
const box = (minX, maxX, minY, maxY, minZ, maxZ, name) => ({ minX, maxX, minY, maxY, minZ, maxZ, name });
// There is NO full horizontal floor at y=0 under the editable plot.
export const FIXED = Object.freeze([
  box(-112, 112, -48, -40, -88, 88, '岩盤'),
  box(-112, -64, -40, 0, -88, 88, '西の安全通路'),
  box(64, 112, -40, 0, -88, 88, '東の安全通路'),
  box(-64, 64, -40, 0, -88, -48, '北の安全通路'),
  box(-64, 64, -40, 0, 48, 88, '南の安全通路'),
  box(-114, -112, -48, 34, -90, 90, '西の外柵'),
  box(112, 114, -48, 34, -90, 90, '東の外柵'),
  box(-112, 112, -48, 34, -90, -88, '北の外柵'),
  box(-112, 112, -48, 34, 88, 90, '南の外柵')
]);
export function cellBox(p) { return box(p[0] * CELL, (p[0] + 1) * CELL, p[1] * CELL, (p[1] + 1) * CELL, p[2] * CELL, (p[2] + 1) * CELL, '普通の土'); }
export function insideEdit(p) { return p.every(Number.isSafeInteger) && p[0] >= EDIT.minX && p[0] <= EDIT.maxX && p[1] >= EDIT.minY && p[1] <= EDIT.maxY && p[2] >= EDIT.minZ && p[2] <= EDIT.maxZ; }
const solid = (state, p) => insideEdit(p) && !!getCell(state, p);
export function validatePlot(state) {
  if (state.scope !== TERRAIN_SCOPE || cells(state).some(c => !insideEdit(c.position))) throw new Error('この小区画用の立体地形セーブではありません。');
  return state;
}
export function playerBox(p) { return box(p.x - PILOT.radius, p.x + PILOT.radius, p.y, p.y + PILOT.height, p.z - PILOT.radius, p.z + PILOT.radius, 'レン'); }
const overlap1 = (a, b, axis) => a['max' + axis] > b['min' + axis] + EPS && a['min' + axis] < b['max' + axis] - EPS;
export function overlap(a, b) { return ['X', 'Y', 'Z'].every(axis => overlap1(a, b, axis)); }
function candidates(state, bounds) {
  const out = FIXED.filter(b => overlap(bounds, b));
  for (let x = Math.max(EDIT.minX, Math.floor(bounds.minX / CELL)); x <= Math.min(EDIT.maxX, Math.floor(bounds.maxX / CELL)); x++)
    for (let y = Math.max(EDIT.minY, Math.floor(bounds.minY / CELL)); y <= Math.min(EDIT.maxY, Math.floor(bounds.maxY / CELL)); y++)
      for (let z = Math.max(EDIT.minZ, Math.floor(bounds.minZ / CELL)); z <= Math.min(EDIT.maxZ, Math.floor(bounds.maxZ / CELL)); z++)
        if (solid(state, [x, y, z])) out.push(cellBox([x, y, z]));
  return out;
}
export function playerBlocked(state, p) { const b = playerBox(p); return candidates(state, b).some(other => overlap(b, other)); }
export function previewEdit(state, command, id, player) {
  const next = reduceConstruction(state, command, id); validatePlot(next);
  if (playerBlocked(next, player)) throw new Error('この操作で体が土に埋まります。先に移動するか「入口へ戻る」を押してください。');
  return next;
}
function axisTravel(state, p, axis, distance) {
  if (!distance) return 0;
  const b = playerBox(p), swept = { ...b };
  swept['min' + axis] += Math.min(0, distance) - EPS; swept['max' + axis] += Math.max(0, distance) + EPS;
  let allowed = distance;
  for (const obstacle of candidates(state, swept)) {
    if (!['X', 'Y', 'Z'].filter(a => a !== axis).every(a => overlap1(b, obstacle, a))) continue;
    if (distance > 0 && b['max' + axis] <= obstacle['min' + axis] + EPS) allowed = Math.min(allowed, Math.max(0, obstacle['min' + axis] - b['max' + axis]));
    if (distance < 0 && b['min' + axis] >= obstacle['max' + axis] - EPS) allowed = Math.max(allowed, Math.min(0, obstacle['max' + axis] - b['min' + axis]));
  }
  return allowed;
}
export function stepPlayer(state, previous, input, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .05) throw new Error('物理の更新刻みが不正です。');
  const p = { ...previous }, n = Math.max(1, Math.hypot(input.x || 0, input.z || 0));
  const dx = (input.x || 0) / n * PILOT.speed * dt, dz = (input.z || 0) / n * PILOT.speed * dt;
  if (input.jump && p.grounded) { p.vy = PILOT.jump; p.grounded = false; }
  const old = { ...p }, move = q => { q.x += axisTravel(state, q, 'X', dx); q.z += axisTravel(state, q, 'Z', dz); };
  move(p);
  const achieved = Math.hypot(p.x - old.x, p.z - old.z);
  if (old.grounded && Math.hypot(dx, dz) > achieved + EPS) {
    const lifted = { ...old }, rise = axisTravel(state, lifted, 'Y', PILOT.step);
    if (rise >= PILOT.step - EPS) {
      lifted.y += rise; move(lifted);
      const drop = axisTravel(state, lifted, 'Y', -PILOT.step - .05);
      if (drop > -PILOT.step - .05 + EPS && Math.hypot(lifted.x - old.x, lifted.z - old.z) > achieved + EPS) {
        lifted.y += drop;
        if (!playerBlocked(state, lifted)) Object.assign(p, lifted);
      }
    }
  }
  p.vy -= PILOT.gravity * dt;
  const requestedY = p.vy * dt, actualY = axisTravel(state, p, 'Y', requestedY);
  p.y += actualY; p.grounded = requestedY < 0 && actualY > requestedY + EPS;
  p.ceilingHit = requestedY > 0 && actualY < requestedY - EPS;
  if (p.grounded || p.ceilingHit) p.vy = 0;
  if (Math.hypot(dx, dz) > EPS) p.heading = Math.atan2(dx, dz);
  return p;
}
export const FACES = Object.freeze([
  { normal: [1, 0, 0], vertices: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { normal: [-1, 0, 0], vertices: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { normal: [0, 1, 0], vertices: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { normal: [0, -1, 0], vertices: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { normal: [0, 0, 1], vertices: [[1,0,1],[1,1,1],[0,1,1],[0,0,1]] },
  { normal: [0, 0, -1], vertices: [[0,0,0],[0,1,0],[1,1,0],[1,0,0]] }
]);
export function surfaceFaces(state) {
  const out = [];
  for (const { position: p } of cells(state)) for (const face of FACES) {
    if (!solid(state, p.map((v, i) => v + face.normal[i]))) out.push({ position: p, ...face });
  }
  return out;
}
export function planEdit(state, hit, mode, width, player) {
  if (!hit || !['dig', 'place'].includes(mode) || ![1, 6].includes(width)) return { positions: [], reason: '土の面をタップして選んでください。' };
  const axis = hit.normal.findIndex(n => n !== 0), center = hit.position.map((v, i) => v + (mode === 'place' ? hit.normal[i] : 0));
  if (axis < 0) return { positions: [], reason: '土の面を選んでください。' };
  const axes = [0, 1, 2].filter(i => i !== axis), positions = [];
  for (let a = 0; a < width; a++) for (let b = 0; b < width; b++) {
    const p = [...center]; p[axes[0]] += a - Math.floor(width / 2); p[axes[1]] += b - Math.floor(width / 2);
    if (!insideEdit(p) || (mode === 'dig' ? !solid(state, p) : solid(state, p))) continue;
    if (mode === 'dig' && solid(state, p.map((v, i) => v + hit.normal[i]))) continue;
    positions.push(p);
  }
  // A placed layer must have a supporting face in the existing terrain/static boundary.
  if (mode === 'place') for (let i = positions.length - 1; i >= 0; i--) {
    const p = positions[i];
    if (!FACES.some(f => solid(state, p.map((v, j) => v + f.normal[j]))) && p[1] !== EDIT.minY) positions.splice(i, 1);
  }
  if (!positions.length) return { positions: [], reason: mode === 'dig' ? 'この面に掘れる土はありません。' : '隣の土につながる面を選んでください。' };
  if (positions.some(p => Math.hypot((p[0]+.5)*CELL-player.x, (p[1]+.5)*CELL-(player.y+PILOT.height/2), (p[2]+.5)*CELL-player.z) > 110)) return { positions, reason: '少し近づいてください（作業範囲110以内）。' };
  if (mode === 'place' && positions.some(p => overlap(cellBox(p), playerBox(player)))) return { positions, reason: '体に重なる場所には土を置けません。' };
  if (mode === 'place' && positions.length * 1000 > state.materials['earth-soil'].accounts.storage) return { positions, reason: '手持ちの土が足りません。先に土を掘って回収してください。' };
  return { positions, reason: '', command: { type: 'edit-cells', action: mode, positions } };
}
