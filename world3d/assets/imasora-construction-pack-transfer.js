(function attachConstructionPackTransfer(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImasoraConstructionPackTransfer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createConstructionPackTransfer() {
  "use strict";

  const TRANSFER_SCOPE = "imasora-construction-pack-transfer-v1";
  const LEDGER_SCOPE = "imasora-construction-pack-trial-ledger-v1";
  const RECIPE_VERSION = "plan90-trial-v1";
  const BUNDLE_UNITS = Object.freeze({ formwork: 8, rebar: 8, tiles: 16, decoration: 8 });
  const RECEIPT_LIMIT = 50000;
  const fail = message => { throw new Error(`建築セット受渡し：${message}`); };
  const object = value => !!value && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
  const exactKeys = (value, names) => object(value)
    && Object.keys(value).sort().join("|") === [...names].sort().join("|");
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const validProfileId = value => typeof value === "string" && /^[0-9a-f]{8}$/.test(value);
  const validTransferId = value => typeof value === "string" && /^pack-transfer-[A-Za-z0-9_-]{8,180}$/.test(value);
  const stable = value => Array.isArray(value)
    ? `[${value.map(stable).join(",")}]`
    : object(value)
      ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`
      : JSON.stringify(value);
  function hash(text) {
    let value = 2166136261;
    for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return (value >>> 0).toString(16).padStart(8, "0");
  }
  function checkedAdd(left, right) {
    const total = left + right;
    if (!Number.isSafeInteger(total) || total < 0) fail("数量の上限を超えました。");
    return total;
  }
  function deriveQuantities(openingReceipts) {
    if (!Array.isArray(openingReceipts) || openingReceipts.length < 1 || openingReceipts.length > RECEIPT_LIMIT) {
      fail("箱の開封記録がありません、または上限を超えています。");
    }
    const seen = new Set();
    const quantities = {
      concreteBlockCredits: 0,
      paintSurfaceCredits: 0,
      auxiliaryUnits: { formwork: 0, rebar: 0, tiles: 0, decoration: 0 }
    };
    for (const receipt of openingReceipts) {
      if (!exactKeys(receipt, ["id", "boxes", "auxiliaryKind", "recipeVersion"])
        || typeof receipt.id !== "string" || !/^pack-open:[A-Za-z0-9_-]{8,180}$/.test(receipt.id)
        || seen.has(receipt.id) || !Number.isSafeInteger(receipt.boxes) || receipt.boxes < 1
        || !Object.hasOwn(BUNDLE_UNITS, receipt.auxiliaryKind) || receipt.recipeVersion !== RECIPE_VERSION) {
        fail("箱の開封記録が不正です。");
      }
      seen.add(receipt.id);
      quantities.concreteBlockCredits = checkedAdd(quantities.concreteBlockCredits, receipt.boxes * 8);
      quantities.paintSurfaceCredits = checkedAdd(quantities.paintSurfaceCredits, receipt.boxes * 64);
      quantities.auxiliaryUnits[receipt.auxiliaryKind] = checkedAdd(
        quantities.auxiliaryUnits[receipt.auxiliaryKind], receipt.boxes * BUNDLE_UNITS[receipt.auxiliaryKind]
      );
    }
    return quantities;
  }
  function packetBody(packet) {
    return {
      version: packet.version,
      scope: packet.scope,
      id: packet.id,
      recipeVersion: packet.recipeVersion,
      targetProfileId: packet.targetProfileId,
      openingReceipts: packet.openingReceipts,
      quantities: packet.quantities
    };
  }
  function createTransferPacket({ id, targetProfileId, openingReceipts }) {
    if (!validTransferId(id)) fail("移送番号が不正です。");
    if (!validProfileId(targetProfileId)) fail("受取先プロフィール番号が不正です。");
    const receipts = openingReceipts.map(receipt => ({
      id: receipt.id, boxes: receipt.boxes, auxiliaryKind: receipt.auxiliaryKind, recipeVersion: receipt.recipeVersion
    })).sort((a, b) => a.id.localeCompare(b.id));
    const packet = {
      version: 1,
      scope: TRANSFER_SCOPE,
      id,
      recipeVersion: RECIPE_VERSION,
      targetProfileId,
      openingReceipts: receipts,
      quantities: deriveQuantities(receipts),
      checksum: ""
    };
    packet.checksum = hash(stable(packetBody(packet)));
    return validateTransferPacket(packet);
  }
  function validateTransferPacket(packet) {
    if (!exactKeys(packet, ["version", "scope", "id", "recipeVersion", "targetProfileId", "openingReceipts", "quantities", "checksum"])
      || packet.version !== 1 || packet.scope !== TRANSFER_SCOPE || !validTransferId(packet.id)
      || packet.recipeVersion !== RECIPE_VERSION || !validProfileId(packet.targetProfileId)
      || typeof packet.checksum !== "string" || !/^[0-9a-f]{8}$/.test(packet.checksum)) {
      fail("移送ファイルの形式が一致しません。");
    }
    if (stable(packet.openingReceipts) !== stable([...packet.openingReceipts].sort((a, b) => a.id.localeCompare(b.id)))) {
      fail("開封記録の順序が正規形式ではありません。");
    }
    if (stable(packet.quantities) !== stable(deriveQuantities(packet.openingReceipts))) fail("ポイントと箱の開封記録が一致しません。");
    const body = packetBody(packet);
    if (hash(stable(body)) !== packet.checksum || JSON.stringify(packet).length > 8000000) fail("移送ファイルの整合性を確認できません。");
    return packet;
  }
  function emptyTrialLedger(profileId) {
    if (!validProfileId(profileId)) fail("受取先プロフィール番号が不正です。");
    return {
      version: 1,
      scope: LEDGER_SCOPE,
      profileId,
      quantities: { concreteBlockCredits: 0, paintSurfaceCredits: 0, auxiliaryUnits: { formwork: 0, rebar: 0, tiles: 0, decoration: 0 } },
      transfers: []
    };
  }
  function validateTrialLedger(ledger, profileId) {
    if (!exactKeys(ledger, ["version", "scope", "profileId", "quantities", "transfers"])
      || ledger.version !== 1 || ledger.scope !== LEDGER_SCOPE || !validProfileId(ledger.profileId)
      || ledger.profileId !== profileId || !Array.isArray(ledger.transfers) || ledger.transfers.length > RECEIPT_LIMIT) {
      fail("本体の試作保管記録が不正です。");
    }
    const ids = new Set(), openingIds = new Set();
    const totals = emptyTrialLedger(profileId).quantities;
    for (const packet of ledger.transfers) {
      validateTransferPacket(packet);
      if (packet.targetProfileId !== profileId || ids.has(packet.id)) fail("受領記録の対象または移送番号が重複しています。");
      ids.add(packet.id);
      for (const receipt of packet.openingReceipts) {
        if (openingIds.has(receipt.id)) fail("同じ箱を複数回受け取っています。");
        openingIds.add(receipt.id);
      }
      totals.concreteBlockCredits = checkedAdd(totals.concreteBlockCredits, packet.quantities.concreteBlockCredits);
      totals.paintSurfaceCredits = checkedAdd(totals.paintSurfaceCredits, packet.quantities.paintSurfaceCredits);
      for (const key of Object.keys(BUNDLE_UNITS)) totals.auxiliaryUnits[key] = checkedAdd(totals.auxiliaryUnits[key], packet.quantities.auxiliaryUnits[key]);
    }
    if (stable(ledger.quantities) !== stable(totals)) fail("受領ポイントと受領履歴が一致しません。");
    return ledger;
  }
  function receiveTransfer(current, packet, profileId) {
    validateTransferPacket(packet);
    if (packet.targetProfileId !== profileId) fail("別の保存プロフィール宛てです。");
    const ledger = current === undefined || current === null ? emptyTrialLedger(profileId) : current;
    validateTrialLedger(ledger, profileId);
    const prior = ledger.transfers.find(item => item.id === packet.id);
    if (prior) {
      if (stable(prior) !== stable(packet)) fail("同じ移送番号で異なる内容が届きました。");
      return ledger;
    }
    const receivedIds = new Set(ledger.transfers.flatMap(item => item.openingReceipts.map(receipt => receipt.id)));
    if (packet.openingReceipts.some(receipt => receivedIds.has(receipt.id))) fail("すでに受け取った箱が含まれています。");
    const quantities = {
      concreteBlockCredits: checkedAdd(ledger.quantities.concreteBlockCredits, packet.quantities.concreteBlockCredits),
      paintSurfaceCredits: checkedAdd(ledger.quantities.paintSurfaceCredits, packet.quantities.paintSurfaceCredits),
      auxiliaryUnits: Object.fromEntries(Object.keys(BUNDLE_UNITS).map(key => [
        key, checkedAdd(ledger.quantities.auxiliaryUnits[key], packet.quantities.auxiliaryUnits[key])
      ]))
    };
    const next = { ...ledger, quantities, transfers: [...ledger.transfers, packet] };
    validateTrialLedger(next, profileId);
    return next;
  }

  return Object.freeze({
    TRANSFER_SCOPE, LEDGER_SCOPE, RECIPE_VERSION, BUNDLE_UNITS,
    deriveQuantities, createTransferPacket, validateTransferPacket,
    emptyTrialLedger, validateTrialLedger, receiveTransfer, stable
  });
});
