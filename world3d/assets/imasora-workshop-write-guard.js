// Same origin only. The home page uses this exact lock for walking and arcade rewards.
export const WORKSHOP_WRITE_LOCK = 'imasora-ufo-arcade-reward';
export const CRAFT_RECEIPTS = 'worldCraftReceipts';
export const REWARD_JOURNALS = ['imasoraUfoArcadeRewardPendingV1', 'imasoraPachicoinPrizeExchangePendingV1'];

export function withWorkshopWriteLock(action, {locks=globalThis.navigator?.locks, storage=globalThis.localStorage}={}) {
  if (!locks?.request) return Promise.reject(Error('このブラウザーでは素材を安全に保存できません。'));
  return locks.request(WORKSHOP_WRITE_LOCK, () => {
    // Home must finish its rollback before a craft may debit this shared ledger.
    if (REWARD_JOURNALS.some(key => storage.getItem(key) !== null))
      throw Error('ゲームセンターの獲得記録を確認する必要があります。ホームを開いて復旧してから再試行してください。');
    return action();
  });
}

function receipts(raw) {
  const values=raw?.[CRAFT_RECEIPTS]??{};
  if (!values || typeof values!=='object' || Array.isArray(values) || Object.keys(values).length>64
    || Object.entries(values).some(([key,value])=>!/^[\w-]{8,96}$/.test(key)||typeof value!=='string'||!/^[\w-]{8,96}$/.test(value)))
    throw Error('装備素材の消費済み記録が不正です。');
  return values;
}

export function createEquipmentCraft({id,beforeRaw,afterRaw,equipment}, token=globalThis.crypto.randomUUID()) {
  const before=JSON.parse(beforeRaw??'{}'), after=JSON.parse(afterRaw), previous=receipts(before);
  if (Object.hasOwn(previous,id)) throw Error('同じ装備作成番号は再使用できません。');
  // The receipt is written with the debit in ONE localStorage value. Home rewards retain it.
  after[CRAFT_RECEIPTS]={...previous,[id]:token};
  const pending={version:2,id,beforeRaw,afterRaw:JSON.stringify(after),equipment:structuredClone(equipment),receipt:token,debitPhase:'prepared'};
  validateEquipmentCraft(pending);return pending;
}

export function validateEquipmentCraft(p) {
  if (!p||![1,2].includes(p.version)||typeof p.id!=='string'||!/^[\w-]{8,96}$/.test(p.id)
    ||!(p.beforeRaw===null||typeof p.beforeRaw==='string')||typeof p.afterRaw!=='string'||p.afterRaw.length>100000
    ||!p.equipment||typeof p.equipment!=='object'||Array.isArray(p.equipment)) throw Error('装備作成の復旧記録が不正です。');
  const after=JSON.parse(p.afterRaw);
  if (after?.version!==2||!['cloudFiber','skySightCrystal','arcadeParts'].every(k=>Number.isSafeInteger(after[k])&&after[k]>=0))
    throw Error('装備素材の復旧記録が不正です。');
  if (p.version===2) {
    if(!['prepared','attempted'].includes(p.debitPhase))throw Error('装備素材の消費段階が不正です。');
    const previous=receipts(JSON.parse(p.beforeRaw??'{}')), next=receipts(after);
    if (Object.hasOwn(previous,p.id)||typeof p.receipt!=='string'||next[p.id]!==p.receipt
      ||Object.keys(next).length!==Object.keys(previous).length+1
      ||Object.entries(previous).some(([key,value])=>next[key]!==value)) throw Error('装備素材の消費済み記録が一致しません。');
  }
}

export function equipmentCraftWasPaid(p, raw) {
  validateEquipmentCraft(p);
  if (raw===p.beforeRaw) {
    if(p.version===2&&p.debitPhase==='attempted')throw Error('素材消費の途中で中断され、消費済み記録を確認できません。二重消費を避けるため両方の記録を保護しています。');
    return false;
  }
  if (raw===p.afterRaw) return true;
  // Other rewards may arrive after a crash. A retained receipt proves that this debit happened.
  if (p.version===2 && receipts(JSON.parse(raw??'{}'))[p.id]===p.receipt) return true;
  throw Error('作成途中に装備素材が別の画面で更新されました。両方の記録を保護して停止しています。');
}
