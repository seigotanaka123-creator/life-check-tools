(function attachConstructionPackLedger(root, factory) {
  const transferApi = typeof module === "object" && module.exports
    ? require("./imasora-construction-pack-transfer.js") : root?.ImasoraConstructionPackTransfer;
  const api = factory(transferApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImasoraConstructionPackLedger = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createConstructionPackLedger(transferApi) {
  "use strict";

  const recipeVersion = "plan90-trial-v1";
  const maxOpeningReceipts = 50000;
  const auxiliaryBundles = Object.freeze({
    formwork: Object.freeze({ unitsPerBox: 8 }),
    rebar: Object.freeze({ unitsPerBox: 8 }),
    tiles: Object.freeze({ unitsPerBox: 16 }),
    decoration: Object.freeze({ unitsPerBox: 8 })
  });

  function defaultLedger() {
    return {
      version: 1,
      recipeVersion,
      concreteBlockCredits: 0,
      paintSurfaceCredits: 0,
      auxiliaryUnits: { formwork: 0, rebar: 0, tiles: 0, decoration: 0 },
      openingReceipts: [],
      transferReceipts: [],
      blocked: false
    };
  }

  function preservedCopy(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return String(value); }
  }

  function blockedLedger(value) {
    return { ...defaultLedger(), blocked: true, recoveryRaw: preservedCopy(value) };
  }

  function normalize(value) {
    if (value === undefined) return defaultLedger();
    if (!value || typeof value !== "object" || Array.isArray(value)) return blockedLedger(value);
    const aux = value.auxiliaryUnits;
    const receipts = value.openingReceipts;
    const transfers = value.transferReceipts === undefined ? [] : value.transferReceipts;
    const integer = number => Number.isSafeInteger(number) && number >= 0;
    if (value.version !== 1 || value.recipeVersion !== recipeVersion
      || !integer(value.concreteBlockCredits) || !integer(value.paintSurfaceCredits)
      || !aux || typeof aux !== "object" || Array.isArray(aux)
      || !Object.keys(auxiliaryBundles).every(key => integer(aux[key]))
      || !Array.isArray(receipts) || receipts.length > maxOpeningReceipts
      || receipts.some(item => !item || typeof item !== "object"
        || typeof item.id !== "string" || !/^pack-open:[A-Za-z0-9_-]{8,180}$/.test(item.id)
        || !integer(item.boxes) || item.boxes < 1
        || !Object.hasOwn(auxiliaryBundles, item.auxiliaryKind)
        || item.recipeVersion !== recipeVersion)
      || new Set(receipts.map(item => item.id)).size !== receipts.length
      || !Array.isArray(transfers) || transfers.length > maxOpeningReceipts
      || transfers.some(item => !item || typeof item !== "object" || Array.isArray(item)
        || Object.keys(item).sort().join("|") !== ["id", "packet", "targetProfileId"].sort().join("|")
        || item.id !== item.packet?.id || item.targetProfileId !== item.packet?.targetProfileId
        || !transferApi || (() => { try { transferApi.validateTransferPacket(item.packet); return false; } catch { return true; } })())
      || new Set(transfers.map(item => item.id)).size !== transfers.length) {
      return blockedLedger(value);
    }
    // Validate the source receipts too, before spending another unopened box.
    try {
      if (!transferApi) throw new Error("TRANSFER_RULES_UNAVAILABLE");
      if (receipts.length) transferApi.deriveQuantities(receipts);
      const byId = new Map(receipts.map(receipt => [receipt.id, receipt]));
      const sent = new Set();
      for (const transfer of transfers) for (const receipt of transfer.packet.openingReceipts) {
        if (sent.has(receipt.id) || !byId.has(receipt.id)
          || transferApi.stable(receipt) !== transferApi.stable(byId.get(receipt.id))) throw new Error("SOURCE_RECEIPT_MISMATCH");
        sent.add(receipt.id);
      }
      const unsent = receipts.filter(receipt => !sent.has(receipt.id));
      const expected = unsent.length ? transferApi.deriveQuantities(unsent) : {
        concreteBlockCredits: 0, paintSurfaceCredits: 0,
        auxiliaryUnits: { formwork: 0, rebar: 0, tiles: 0, decoration: 0 }
      };
      if (transferApi.stable(expected) !== transferApi.stable({
        concreteBlockCredits: value.concreteBlockCredits, paintSurfaceCredits: value.paintSurfaceCredits,
        auxiliaryUnits: aux
      })) throw new Error("MATERIAL_RECEIPT_MISMATCH");
    } catch { return blockedLedger(value); }
    return {
      ...value,
      version: 1,
      recipeVersion,
      concreteBlockCredits: value.concreteBlockCredits,
      paintSurfaceCredits: value.paintSurfaceCredits,
      auxiliaryUnits: Object.fromEntries(Object.keys(auxiliaryBundles).map(key => [key, aux[key]])),
      openingReceipts: receipts.map(item => ({ ...item })),
      transferReceipts: transfers.map(item => ({ ...item, packet: JSON.parse(JSON.stringify(item.packet)) })),
      blocked: Boolean(value.blocked)
    };
  }

  function preview(boxes, auxiliaryKind) {
    if (!Number.isSafeInteger(boxes) || boxes < 1 || !Number.isSafeInteger(boxes * 64)
      || !Object.hasOwn(auxiliaryBundles, auxiliaryKind)) return null;
    return {
      boxes,
      recipeVersion,
      concreteBlockCredits: boxes * 8,
      paintSurfaceCredits: boxes * 64,
      auxiliaryKind,
      auxiliaryUnits: boxes * auxiliaryBundles[auxiliaryKind].unitsPerBox
    };
  }

  function openBoxes(current, unopenedBoxes, event = {}) {
    const ledger = normalize(current);
    if (ledger.blocked) return { ledger, status: "blocked", opened: false, boxes: 0, unopenedBoxes };
    const { boxes, auxiliaryKind, eventId } = event;
    if (!Number.isSafeInteger(unopenedBoxes) || unopenedBoxes < 0
      || !Number.isSafeInteger(boxes) || boxes < 1
      || typeof eventId !== "string" || !/^[A-Za-z0-9_-]{8,180}$/.test(eventId)
      || !Object.hasOwn(auxiliaryBundles, auxiliaryKind)) {
      return { ledger, status: "unavailable", opened: false, boxes: 0, unopenedBoxes };
    }
    const id = `pack-open:${eventId}`;
    const previous = ledger.openingReceipts.find(receipt => receipt.id === id);
    if (previous) {
      const same = previous.boxes === boxes && previous.auxiliaryKind === auxiliaryKind;
      return { ledger, status: same ? "duplicate" : "conflict", opened: false, boxes: 0, unopenedBoxes, id };
    }
    if (boxes > unopenedBoxes || ledger.openingReceipts.length >= maxOpeningReceipts) {
      return { ledger, status: "unavailable", opened: false, boxes: 0, unopenedBoxes };
    }
    const plan = preview(boxes, auxiliaryKind);
    if (!plan) return { ledger, status: "unavailable", opened: false, boxes: 0, unopenedBoxes };
    const aux = { ...ledger.auxiliaryUnits };
    const nextAux = aux[auxiliaryKind] + plan.auxiliaryUnits;
    if (!Number.isSafeInteger(ledger.concreteBlockCredits + plan.concreteBlockCredits)
      || !Number.isSafeInteger(ledger.paintSurfaceCredits + plan.paintSurfaceCredits)
      || !Number.isSafeInteger(nextAux)) {
      return { ledger, status: "unavailable", opened: false, boxes: 0, unopenedBoxes };
    }
    const next = {
      ...ledger,
      concreteBlockCredits: ledger.concreteBlockCredits + plan.concreteBlockCredits,
      paintSurfaceCredits: ledger.paintSurfaceCredits + plan.paintSurfaceCredits,
      auxiliaryUnits: { ...aux, [auxiliaryKind]: nextAux },
      openingReceipts: [...ledger.openingReceipts, { id, boxes, auxiliaryKind, recipeVersion }]
    };
    return {
      ledger: next,
      status: "opened",
      opened: true,
      boxes,
      unopenedBoxes: unopenedBoxes - boxes,
      plan,
      id
    };
  }

  function prepareOpeningState(savedState, event = {}, rewardLedgerApi) {
    if (!savedState || typeof savedState !== "object" || Array.isArray(savedState)
      || !rewardLedgerApi || typeof rewardLedgerApi.normalize !== "function") {
      return { status: "unavailable", opened: false, state: savedState };
    }
    const rewardLedger = rewardLedgerApi.normalize(savedState.constructionRewardLedger);
    if (rewardLedger.blocked) return { status: "blocked", opened: false, state: savedState };
    const result = openBoxes(savedState.constructionMaterialLedger, rewardLedger.unopenedBoxes, event);
    if (!result.opened) return { ...result, state: savedState };
    const nextRewardLedger = { ...rewardLedger, unopenedBoxes: result.unopenedBoxes };
    const nextState = {
      ...savedState,
      constructionRewardLedger: nextRewardLedger,
      constructionMaterialLedger: result.ledger
    };
    if (Array.isArray(savedState.logs) && typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      const selected = auxiliaryBundles[event.auxiliaryKind];
      const label = { formwork: "型枠", rebar: "鉄筋", tiles: "タイル", decoration: "装飾材" }[event.auxiliaryKind];
      const text = `建築セットを${event.boxes}箱開封（試作 ${recipeVersion}）：コンクリートブロック相当 ${result.plan.concreteBlockCredits} / 塗装面相当 ${result.plan.paintSurfaceCredits} / ${label} ${selected.unitsPerBox * event.boxes}`;
      nextState.logs = [{ date: event.date, text }, ...savedState.logs].slice(0, 40);
    }
    return { ...result, rewardLedger: nextRewardLedger, state: nextState };
  }

  function transferAvailability(current) {
    const ledger = normalize(current);
    if (ledger.blocked) return { ready: false, blocked: true, reason: "台帳を確認できません。", openingReceipts: [] };
    try {
      const sent = new Set();
      for (const transfer of ledger.transferReceipts) {
        for (const receipt of transfer.packet.openingReceipts) {
          if (sent.has(receipt.id)) throw new Error("同じ箱の受取記録が重複しています。");
          sent.add(receipt.id);
        }
      }
      const openingReceipts = ledger.openingReceipts.filter(receipt => !sent.has(receipt.id));
      const expected = openingReceipts.length ? transferApi.deriveQuantities(openingReceipts) : {
        concreteBlockCredits: 0, paintSurfaceCredits: 0,
        auxiliaryUnits: { formwork: 0, rebar: 0, tiles: 0, decoration: 0 }
      };
      if (JSON.stringify(expected) !== JSON.stringify({
        concreteBlockCredits: ledger.concreteBlockCredits,
        paintSurfaceCredits: ledger.paintSurfaceCredits,
        auxiliaryUnits: ledger.auxiliaryUnits
      })) throw new Error("試作ポイントと未移送の箱開封記録が一致しません。");
      return { ready: openingReceipts.length > 0, blocked: false, reason: "", openingReceipts, quantities: expected };
    } catch (error) {
      return { ready: false, blocked: true, reason: error.message, openingReceipts: [] };
    }
  }

  function prepareTransferState(savedState, targetProfileId, eventId, event = {}) {
    if (!savedState || typeof savedState !== "object" || Array.isArray(savedState)
      || typeof targetProfileId !== "string" || !/^[0-9a-f]{8}$/.test(targetProfileId)
      || typeof eventId !== "string" || !/^[A-Za-z0-9_-]{8,180}$/.test(eventId)) {
      return { status: "unavailable", transferred: false, state: savedState };
    }
    const ledger = normalize(savedState.constructionMaterialLedger);
    if (ledger.blocked) return { status: "blocked", transferred: false, state: savedState };
    const id = `pack-transfer-${eventId}`;
    const existing = ledger.transferReceipts.find(item => item.id === id);
    if (existing) {
      if (existing.targetProfileId !== targetProfileId) return { status: "conflict", transferred: false, state: savedState };
      return { status: "duplicate", transferred: false, packet: existing.packet, ledger, state: savedState };
    }
    const available = transferAvailability(ledger);
    if (available.blocked) return { status: "blocked", transferred: false, reason: available.reason, state: savedState };
    if (!available.ready) return { status: "unavailable", transferred: false, state: savedState };
    let packet;
    try { packet = transferApi.createTransferPacket({ id, targetProfileId, openingReceipts: available.openingReceipts }); }
    catch (error) { return { status: "blocked", transferred: false, reason: error.message, state: savedState }; }
    const nextLedger = {
      ...ledger,
      concreteBlockCredits: ledger.concreteBlockCredits - packet.quantities.concreteBlockCredits,
      paintSurfaceCredits: ledger.paintSurfaceCredits - packet.quantities.paintSurfaceCredits,
      auxiliaryUnits: Object.fromEntries(Object.keys(auxiliaryBundles).map(key => [
        key, ledger.auxiliaryUnits[key] - packet.quantities.auxiliaryUnits[key]
      ])),
      transferReceipts: [...ledger.transferReceipts, { id, targetProfileId, packet }]
    };
    if (normalize(nextLedger).blocked) return { status: "blocked", transferred: false, state: savedState };
    const nextState = { ...savedState, constructionMaterialLedger: nextLedger };
    if (Array.isArray(savedState.logs) && typeof event.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      nextState.logs = [{ date: event.date, text: `建築セットの試作ポイントを工事現場へ移送準備（${packet.id}）。` }, ...savedState.logs].slice(0, 40);
    }
    return { status: "exported", transferred: true, packet, ledger: nextLedger, state: nextState };
  }

  return Object.freeze({ defaultLedger, normalize, preview, openBoxes, prepareOpeningState, transferAvailability, prepareTransferState, recipeVersion, auxiliaryBundles });
});
