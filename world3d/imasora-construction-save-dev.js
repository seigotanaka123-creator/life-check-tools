import * as THREE from './assets/three.module.min.js';
import { ConstructionSession, SOIL_UNIT, cells, getCell, materialTotals, canonical } from './assets/imasora-construction-state.js?v=427';
import { IndexedConstructionStore, CONSTRUCTION_DEV_DB } from './assets/imasora-construction-storage.js?v=427';
const $ = id => document.getElementById(id);
const store = new IndexedConstructionStore(), session = new ConstructionSession(store);
const local = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
let working = false, restoreText = '', persistence = '';
const txId = () => crypto.randomUUID();
function message(text, warning = false) { $('status').textContent = text; $('status').classList.toggle('warning', warning); }
window.addEventListener('error', e => message(`表示エラー：${e.message}`, true));
window.addEventListener('unhandledrejection', e => message(`処理エラー：${e.reason?.message ?? e.reason}`, true));

// This view represents committed data only; it does not simulate future digging/vehicle physics.
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xdce4d8);
const camera = new THREE.PerspectiveCamera(37, 1, .1, 1500);
const renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9178, 2.7));
const sun = new THREE.DirectionalLight(0xfff7df, 3); sun.position.set(-65, 120, 75); scene.add(sun);
const boxGeometry = new THREE.BoxGeometry(1, 1, 1), soilMaterial = new THREE.MeshStandardMaterial({ color: 0xb9864f, roughness: 1 });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xa6b29a, roughness: 1 }), palletMaterial = new THREE.MeshStandardMaterial({ color: 0x80795e });
function box(parent, x, y, z, w, h, d, material) {
  const mesh = new THREE.Mesh(boxGeometry, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
}
box(scene, 0, -1.2, 0, 170, 2, 112, floorMaterial);
const grid = new THREE.GridHelper(96, 12, 0x86987e, 0x96a58d); grid.position.set(22, .01, 0); scene.add(grid);
box(scene, -55, .5, -26, 27, 1, 26, palletMaterial); box(scene, -55, .5, 24, 27, 1, 26, palletMaterial);
function label(text, x, z) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 80;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f3f6ed'; ctx.fillRect(0, 0, 512, 80);
  ctx.font = 'bold 33px Meiryo, sans-serif'; ctx.fillStyle = '#3d5240'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 41);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, toneMapped: false }));
  sprite.position.set(x, 22, z); sprite.scale.set(35, 5.5, 1); sprite.renderOrder = 5; scene.add(sprite);
}
label('置場', -55, -29); label('仮の積荷', -55, 27);
const placed = new THREE.Group(), stock = new THREE.Group(); scene.add(placed, stock);
let angle = .76;
function draw() {
  const rect = $('scene').getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
  // Fit both pallets in the narrow in-app panel as well as on a phone.
  const distance = Math.max(230, 320 / camera.aspect);
  camera.position.set(distance * .75 * Math.sin(angle), distance * .66, distance * .75 * Math.cos(angle));
  camera.lookAt(-7, 0, 0); camera.updateProjectionMatrix(); renderer.render(scene, camera);
}
new ResizeObserver(draw).observe($('scene'));
$('rotate-left').onclick = () => { angle -= .55; draw(); };
$('rotate-right').onclick = () => { angle += .55; draw(); };
$('camera-reset').onclick = () => { angle = .76; draw(); };
function drawState() {
  placed.clear(); stock.clear();
  if (session.state) {
    for (const cell of cells(session.state)) {
      const [x, y, z] = cell.position; box(placed, x * 8 - 8, y * 8 + 4, z * 8 - 16, 7.8, 8, 7.8, soilMaterial);
    }
    const a = session.state.materials['earth-soil'].accounts;
    for (const [account, z] of [['storage', -26], ['vehicle', 24]]) {
      for (let i = 0; i < a[account] / SOIL_UNIT; i++) box(stock, -64 + (i % 4) * 6, 3.5 + Math.floor(i / 16) * 5, z - 9 + (Math.floor(i / 4) % 4) * 6, 5.4, 5, 5.4, soilMaterial);
    }
  }
  draw();
}
function refresh() {
  const state = session.state, disabled = working || session.readOnly || !state || !local;
  document.querySelectorAll('[data-edit]').forEach(button => { button.disabled = disabled; });
  $('initialize').hidden = !!state || session.generation !== null || session.readOnly || !local;
  $('initialize').disabled = working;
  $('read-save').disabled = working; $('reload').disabled = working;
  $('export').disabled = !state || working; $('raw-export').disabled = !session.rawRecord || working;
  $('recover').hidden = !(state && session.readOnly); $('recover').disabled = working;
  const restoreBlocked = working || !local || session.incompatible || (session.generation === null && session.readOnly);
  $('restore').disabled = !restoreText || restoreBlocked;
  $('restore-pasted').disabled = !$('restore-text').value.trim() || restoreBlocked;
  if (state) {
    const a = state.materials['earth-soil'].accounts;
    for (const name of ['storage', 'vehicle', 'terrain']) $(name).textContent = a[name] / SOIL_UNIT;
    $('total').textContent = materialTotals(state)['earth-soil'] / SOIL_UNIT;
    $('revision').textContent = `保存番号 ${state.revision}`;
    $('history').textContent = `取り消し ${state.history.past.length} ／ やり直し ${state.history.future.length}`;
    $('conservation').textContent = '総量32個・台帳と配置の一致を確認';
    $('undo').disabled ||= !state.history.past.length; $('redo').disabled ||= !state.history.future.length;
    $('load-soil').disabled ||= a.storage < 4 * SOIL_UNIT; $('unload-soil').disabled ||= a.vehicle < 4 * SOIL_UNIT;
    $('place-soil').disabled ||= a.storage < SOIL_UNIT; $('abort-save').disabled ||= a.storage < SOIL_UNIT;
    $('recover-soil').disabled ||= a.terrain < SOIL_UNIT;
  } else {
    for (const name of ['storage', 'vehicle', 'terrain', 'total']) $(name).textContent = '—';
    $('revision').textContent = '保存番号 —'; $('history').textContent = '取り消し — ／ やり直し —';
    $('conservation').textContent = '正常な保存データは未読込です';
  }
  $('storage-info').textContent = `保存先：${CONSTRUCTION_DEV_DB} ／ ${location.origin} ／ ${persistence || 'ブラウザー内の保存。重要な試作はファイルにも書き出してください。'}`;
  drawState();
}
async function run(action, success) {
  if (working || !local) return;
  working = true; refresh();
  try { await action(); message(session.warning || success, session.readOnly); }
  catch (error) { message(error.message, true); }
  finally { working = false; refresh(); }
}
function nextPosition() {
  for (let i = 0; i < 128; i++) {
    const pos = [i % 8, Math.floor(i / 32), Math.floor(i / 8) % 4];
    if (!getCell(session.state, pos)) return pos;
  }
  throw new Error('確認区画がいっぱいです。');
}
$('initialize').onclick = () => run(() => session.initialize(), '確認用の土32個を保存しました。土を動かして試せます。');
$('load-soil').onclick = () => run(() => session.dispatch({ type: 'transfer', from: 'storage', to: 'vehicle', amount: 4000 }, txId()), '土4個を仮の積荷へ移し、保存しました。');
$('unload-soil').onclick = () => run(() => session.dispatch({ type: 'transfer', from: 'vehicle', to: 'storage', amount: 4000 }, txId()), '土4個を置場へ戻し、保存しました。');
$('place-soil').onclick = () => run(() => session.dispatch({ type: 'place-cell', from: 'storage', position: nextPosition() }, txId()), '土1個を配置し、保存しました。');
$('recover-soil').onclick = () => run(() => session.dispatch({ type: 'remove-cell', to: 'storage', position: cells(session.state).at(-1).position }, txId()), '配置した土1個を置場へ回収し、保存しました。');
$('undo').onclick = () => run(() => session.dispatch({ type: 'undo' }, txId()), '操作をひとつ取り消し、素材と配置を保存しました。');
$('redo').onclick = () => run(() => session.dispatch({ type: 'redo' }, txId()), '取り消した操作をやり直し、保存しました。');
$('read-save').onclick = () => run(() => session.load(), '最新の保存を読み込みました。');
$('reload').onclick = () => location.reload();
$('abort-save').onclick = () => run(async () => {
  const before = canonical(session.state), saved = canonical(await store.read());
  store.failNext = true;
  let failed = false;
  try { await session.dispatch({ type: 'place-cell', from: 'storage', position: nextPosition() }, txId()); }
  catch { failed = true; } finally { store.failNext = false; }
  if (!failed || canonical(session.state) !== before || canonical(await store.read()) !== saved) throw new Error('保存失敗テストで不一致を検出しました。操作を止めて確認してください。');
  session.warning = '';
}, '保存失敗テストOK：書き込みを中断しても、土・配置・保存番号は変わりませんでした。');
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function showBackup(text) { $('backup-text').value = text; $('backup-panel').hidden = false; }
$('export').onclick = () => {
  const text = session.export(); showBackup(text);
  download(text, `construction-dev-r${session.state.revision}.json`);
  message('書き出しをブラウザーに要求しました。保存できない場合は、下のバックアップ文字列も利用できます。');
};
$('raw-export').onclick = () => download(session.exportRaw(), 'construction-dev-recovery-record.json');
$('restore-file').onchange = async e => { restoreText = ''; refresh(); const file = e.target.files[0]; if (!file) return; if (file.size > 8_000_000) { message('確認セーブの上限8MBを超えています。', true); return; } restoreText = await file.text(); refresh(); };
let confirmedAction = null;
function askRestore(messageText, action) {
  if (working) return;
  confirmedAction = action; $('confirm-message').textContent = messageText; $('restore-confirm').showModal();
}
$('confirm-cancel').onclick = () => { confirmedAction = null; $('restore-confirm').close(); };
$('restore-confirm').addEventListener('cancel', () => { confirmedAction = null; });
$('confirm-accept').onclick = () => { const action = confirmedAction; confirmedAction = null; $('restore-confirm').close(); action?.(); };
function restoreSnapshot(text) {
  askRestore('この確認画面の配置・素材・履歴を、選んだ確認セーブへ復元します。実行してよろしいですか？', () => run(async () => {
    if (session.state) showBackup(session.export()); await session.restore(text);
  }, '確認セーブを復元しました。変更前の保存も保管しています。'));
}
$('restore').onclick = () => restoreSnapshot(restoreText);
$('restore-text').oninput = refresh;
$('restore-pasted').onclick = () => restoreSnapshot($('restore-text').value.trim());
$('recover').onclick = () => askRestore('表示中の正常データで開発用セーブを復旧しますか？異常があった元データもバックアップに残します。', () => run(() => session.confirmRecovery(), '正常データで復旧しました。'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && session.state && !working) store.read().then(record => { if (record?.generation !== session.generation) message('別タブで保存が更新されました。操作前に「保存を読み直す」を押してください。', true); }).catch(e => message(e.message, true)); });
if (!local) { message('これはローカル開発専用の確認画面です。通常ゲームには接続しません。', true); refresh(); }
else {
  await run(() => session.load(), '保存の読み込みを確認しました。');
  if (!session.state && !session.readOnly) message('確認用セーブがありません。「確認用の土32個で開始」から作成できます。');
  if (navigator.storage?.persisted) { const persistent = await navigator.storage.persisted(); persistence = persistent ? '永続保存が許可されています。' : 'ブラウザーが保存を整理する場合があります。重要な試作はファイルにも書き出してください。'; refresh(); }
}
