// Dedicated test namespace. Never reads/writes localStorage or the UFO economy.
export const CONSTRUCTION_DEV_DB = 'imasora-construction-development-v1';
export const CONSTRUCTION_TERRAIN_DEV_DB = 'imasora-construction-terrain-development-v1';
export const CONSTRUCTION_STORE = 'snapshots';
const KEY = 'construction';
export class IndexedConstructionStore {
  constructor(indexedDB = globalThis.indexedDB, { profile = 'foundation' } = {}) {
    if (!['foundation', 'terrain'].includes(profile)) throw new Error('不明な保存区分です。');
    this.name = profile === 'terrain' ? CONSTRUCTION_TERRAIN_DEV_DB : CONSTRUCTION_DEV_DB;
    this.indexedDB = indexedDB; this.db = null; this.failNext = false;
  }
  async open() {
    if (this.db) return this.db;
    if (!this.indexedDB) throw new Error('この環境では建設データの保存を利用できません。');
    this.db = await new Promise((resolve, reject) => {
      let blocked = false;
      const request = this.indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(CONSTRUCTION_STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () => { blocked = true; reject(new Error('別タブの保存画面を閉じてから再読み込みしてください。')); };
      request.onsuccess = () => {
        const db = request.result;
        if (blocked) { db.close(); return; }
        db.onversionchange = () => { db.close(); this.db = null; };
        resolve(db);
      };
    });
    return this.db;
  }
  async read() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONSTRUCTION_STORE, 'readonly');
      const request = tx.objectStore(CONSTRUCTION_STORE).get(KEY);
      tx.oncomplete = () => resolve(request.result ?? null);
      tx.onabort = () => reject(tx.error ?? new Error('保存の読み込みが中断されました。'));
      tx.onerror = () => {};
    });
  }
  async commit(expectedGeneration, packet) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      // Same-store read/compare/write in ONE readwrite transaction serializes tabs.
      const tx = db.transaction(CONSTRUCTION_STORE, 'readwrite', { durability: 'strict' });
      const os = tx.objectStore(CONSTRUCTION_STORE), request = os.get(KEY);
      let next, error;
      request.onsuccess = () => {
        const prior = request.result;
        if ((prior?.generation ?? null) !== expectedGeneration) {
          error = new Error('別タブで更新されています。「保存を読み直す」で最新の内容を確認してください。'); tx.abort(); return;
        }
        if (prior && (!Number.isSafeInteger(prior.generation) || prior.generation < 1 || prior.generation >= Number.MAX_SAFE_INTEGER - 1 || !Array.isArray(prior.backups))) {
          error = new Error('保存管理情報が不正なため、上書きせず停止しました。'); tx.abort(); return;
        }
        next = { generation: (prior?.generation ?? 0) + 1, current: packet, backups: prior ? [prior.current, ...prior.backups].slice(0, 5) : [] };
        const write = os.put(next, KEY);
        write.onsuccess = () => {
          if (this.failNext) { this.failNext = false; error = new Error('確認用に保存を中断しました。'); tx.abort(); }
        };
      };
      tx.oncomplete = () => resolve(next);
      tx.onabort = () => reject(error ?? tx.error ?? new Error('保存が中断されました。'));
      tx.onerror = () => {};
    });
  }
  close() { this.db?.close(); this.db = null; }
}
