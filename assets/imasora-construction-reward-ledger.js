(function attachConstructionRewardLedger(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImasoraConstructionRewardLedger = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createConstructionRewardLedger() {
  "use strict";

  const allowedWalkSources = new Set(["歩数計", "イマソラ認識"]);
  const maxTournamentAwards = 10000;
  const maxArcadeAwards = 50000;
  const arcadeBoxRewards = Object.freeze({ catcher: 2, triLink: 1, pachicoin: 3 });

  function defaultLedger() {
    return {
      version: 3,
      unopenedBoxes: 0,
      starterToolkitEntitled: false,
      walkCursor: { dayKey: "", lastPosition: 0 },
      tournamentAwards: [],
      arcadeAwards: [],
      blocked: false
    };
  }

  function preservedCopy(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return String(value);
    }
  }

  function invalidLedger(value) {
    return {
      ...defaultLedger(),
      blocked: true,
      recoveryRaw: preservedCopy(value)
    };
  }

  function normalize(value) {
    if (value === undefined) return defaultLedger();
    if (!value || typeof value !== "object" || Array.isArray(value)) return invalidLedger(value);
    const cursor = value.walkCursor;
    const versionOne = value.version === 1;
    const versionTwo = value.version === 2;
    if ((!versionOne && !versionTwo && value.version !== 3)
      || !Number.isSafeInteger(value.unopenedBoxes)
      || value.unopenedBoxes < 0
      || typeof value.starterToolkitEntitled !== "boolean"
      || !cursor || typeof cursor !== "object" || Array.isArray(cursor)
      || typeof cursor.dayKey !== "string"
      || (cursor.dayKey !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(cursor.dayKey))
      || !Number.isSafeInteger(cursor.lastPosition)
      || cursor.lastPosition < 0) {
      return invalidLedger(value);
    }
    const tournamentAwards = versionOne ? [] : value.tournamentAwards;
    if (!Array.isArray(tournamentAwards)
      || tournamentAwards.length > maxTournamentAwards
      || tournamentAwards.some(id => typeof id !== "string" || !/^tournament:[a-z0-9-]{1,32}:[1-9][0-9]{0,15}$/.test(id))
      || new Set(tournamentAwards).size !== tournamentAwards.length) {
      return invalidLedger(value);
    }
    const arcadeAwards = versionOne || versionTwo ? [] : value.arcadeAwards;
    if (!Array.isArray(arcadeAwards)
      || arcadeAwards.length > maxArcadeAwards
      || arcadeAwards.some(id => typeof id !== "string" || !/^arcade:(catcher|triLink|pachicoin):[A-Za-z0-9_-]{8,180}$/.test(id))
      || new Set(arcadeAwards).size !== arcadeAwards.length) {
      return invalidLedger(value);
    }
    return {
      ...value,
      version: 3,
      unopenedBoxes: value.unopenedBoxes,
      starterToolkitEntitled: value.starterToolkitEntitled,
      walkCursor: { ...cursor },
      tournamentAwards: [...tournamentAwards],
      arcadeAwards: [...arcadeAwards],
      blocked: Boolean(value.blocked)
    };
  }

  function awardWalkTile(current, event = {}) {
    const ledger = normalize(current);
    if (ledger.blocked) return { ledger, status: "blocked", granted: false, toolkitGranted: false };
    const { dayKey, position, source } = event;
    if (!allowedWalkSources.has(source)
      || typeof dayKey !== "string"
      || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)
      || !Number.isSafeInteger(position)
      || position <= 0
      || !Number.isSafeInteger(ledger.unopenedBoxes + 1)) {
      return { ledger, status: "unavailable", granted: false, toolkitGranted: false };
    }

    const cursor = ledger.walkCursor.dayKey === dayKey
      ? ledger.walkCursor
      : { dayKey, lastPosition: 0 };
    if (position <= cursor.lastPosition) {
      ledger.walkCursor = cursor;
      return { ledger, status: "duplicate", granted: false, toolkitGranted: false };
    }

    const toolkitGranted = !ledger.starterToolkitEntitled;
    ledger.unopenedBoxes += 1;
    ledger.starterToolkitEntitled = true;
    ledger.walkCursor = { dayKey, lastPosition: position };
    return { ledger, status: "granted", granted: true, toolkitGranted };
  }

  function awardTournamentWin(current, event = {}) {
    const ledger = normalize(current);
    if (ledger.blocked) return { ledger, status: "blocked", granted: false, toolkitGranted: false, boxes: 0 };
    const { cupId, enteredAt, official } = event;
    if (official !== true
      || typeof cupId !== "string"
      || !/^[a-z0-9-]{1,32}$/.test(cupId)
      || !Number.isSafeInteger(enteredAt)
      || enteredAt <= 0
      || !Number.isSafeInteger(ledger.unopenedBoxes + 8)) {
      return { ledger, status: "unavailable", granted: false, toolkitGranted: false, boxes: 0 };
    }
    const id = `tournament:${cupId}:${enteredAt}`;
    if (ledger.tournamentAwards.includes(id)) {
      return { ledger, status: "duplicate", granted: false, toolkitGranted: false, boxes: 0 };
    }
    if (ledger.tournamentAwards.length >= maxTournamentAwards) {
      return { ledger, status: "unavailable", granted: false, toolkitGranted: false, boxes: 0 };
    }
    const toolkitGranted = !ledger.starterToolkitEntitled;
    ledger.unopenedBoxes += 8;
    ledger.starterToolkitEntitled = true;
    ledger.tournamentAwards.push(id);
    return { ledger, status: "granted", granted: true, toolkitGranted, boxes: 8, id };
  }

  function awardArcadeEvent(current, event = {}) {
    const ledger = normalize(current);
    if (ledger.blocked) return { ledger, status: "blocked", granted: false, toolkitGranted: false, boxes: 0 };
    const { game, eventId, kind, official, playerWon = false } = event;
    const kindAllowed = (game === "catcher" && kind === "capture")
      || (game === "triLink" && kind === "match-complete")
      || (game === "pachicoin" && kind === "exchange");
    if (official !== true
      || !kindAllowed
      || typeof eventId !== "string"
      || !/^[A-Za-z0-9_-]{8,180}$/.test(eventId)) {
      return { ledger, status: "unavailable", granted: false, toolkitGranted: false, boxes: 0 };
    }
    const id = `arcade:${game}:${eventId}`;
    if (ledger.arcadeAwards.includes(id)) {
      return { ledger, status: "duplicate", granted: false, toolkitGranted: false, boxes: 0, id };
    }
    if (ledger.arcadeAwards.length >= maxArcadeAwards) {
      return { ledger, status: "unavailable", granted: false, toolkitGranted: false, boxes: 0 };
    }
    const boxes = game === "triLink" && playerWon === true
      ? arcadeBoxRewards.triLink + 1
      : arcadeBoxRewards[game];
    if (!Number.isSafeInteger(ledger.unopenedBoxes + boxes)) {
      return { ledger, status: "unavailable", granted: false, toolkitGranted: false, boxes: 0 };
    }
    const toolkitGranted = !ledger.starterToolkitEntitled;
    ledger.unopenedBoxes += boxes;
    ledger.starterToolkitEntitled = true;
    ledger.arcadeAwards.push(id);
    return { ledger, status: "granted", granted: true, toolkitGranted, boxes, id };
  }

  return Object.freeze({ defaultLedger, normalize, awardWalkTile, awardTournamentWin, awardArcadeEvent });
});
