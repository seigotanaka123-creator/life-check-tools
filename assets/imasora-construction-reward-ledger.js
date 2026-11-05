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
    if (value.sailingAwards !== undefined && (!Array.isArray(value.sailingAwards) || value.sailingAwards.length>10000 || new Set(value.sailingAwards.map(a=>a?.id)).size!==value.sailingAwards.length || value.sailingAwards.some(a=>!a || Object.keys(a).sort().join('|')!=='amount|id|route' || typeof a.id!=='string' || a.id.length>220 || a.amount!==({walk:3,tournament:4,catcher:1,triLink:2,pachicoin:2,tag:1}[a.route])))) return invalidLedger(value);
    return {
      ...value,
      sailingAwards: (value.sailingAwards||[]).map(a=>({...a})),
      version: 3,
      unopenedBoxes: value.unopenedBoxes,
      starterToolkitEntitled: value.starterToolkitEntitled,
      walkCursor: { ...cursor },
      tournamentAwards: [...tournamentAwards],
      arcadeAwards: [...arcadeAwards],
      blocked: Boolean(value.blocked)
    };
  }

  const sailingAmounts = { walk:3, tournament:4, catcher:1, triLink:2, pachicoin:2, tag:1 };
  function addSailing(ledger, route, id) {
    ledger.sailingAwards ||= [];
    if (ledger.sailingAwards.some(a => a.id === id)) return 0;
    if (ledger.sailingAwards.length >= 10000) throw Error('航海パーツの記録がいっぱいです。');
    const amount=sailingAmounts[route];ledger.sailingAwards.push({id,route,amount});return amount;
  }
  function awardWalkCheckpoint(current,event={}) {
    const ledger=normalize(current),{position,dayKey,source}=event;
    if(ledger.blocked||!allowedWalkSources.has(source)||!Number.isSafeInteger(position)||position<=0||position%25!==0||typeof dayKey!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(dayKey))return{ledger,granted:false,sailingParts:0};
    const id='walk:'+dayKey+':'+Math.floor(position/25);if((ledger.sailingAwards||[]).some(a=>a.id===id))return{ledger,granted:false,sailingParts:0};
    const sailingParts=addSailing(ledger,'walk',id);return{ledger,granted:true,sailingParts};
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

    if (Math.floor(position/25)-Math.floor(cursor.lastPosition/25)>10000-(ledger.sailingAwards||[]).length) return {ledger,status:"unavailable",granted:false,toolkitGranted:false};
    let sailingParts=0;
    // Checkpoints are recorded by day and lap; retries cannot grant them twice.
    for(let lap=Math.floor(cursor.lastPosition/25)+1;lap<=Math.floor(position/25);lap++)sailingParts+=addSailing(ledger,'walk','walk:'+dayKey+':'+lap);
    const toolkitGranted = !ledger.starterToolkitEntitled;
    ledger.unopenedBoxes += 1;
    ledger.starterToolkitEntitled = true;
    ledger.walkCursor = { dayKey, lastPosition: position };
    return { ledger, status: "granted", granted: true, toolkitGranted, sailingParts };
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
    const sailingParts=addSailing(ledger,"tournament",id);
    return { ledger, status: "granted", granted: true, toolkitGranted, boxes: 8, id, sailingParts };
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
    const sailingParts=game!=="triLink"||playerWon===true?addSailing(ledger,game,id):0;
    return { ledger, status: "granted", granted: true, toolkitGranted, boxes, id, sailingParts };
  }

  function awardTagResult(current,event={}) { const ledger=normalize(current),{id,boxes,sailingParts}=event;if(ledger.blocked||typeof id!=='string'||!/^tag:[A-Za-z0-9_-]{8,80}$/.test(id)||![boxes,sailingParts].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1))return{ledger,status:'unavailable',granted:false};const awards=ledger.tagAwards??[];if(!Array.isArray(awards)||awards.length>=50000||awards.some(v=>typeof v!=='string'||!/^tag:[A-Za-z0-9_-]{8,80}$/.test(v))||new Set(awards).size!==awards.length)return{ledger,status:'unavailable',granted:false};if(awards.includes(id))return{ledger,status:'duplicate',granted:false};if(!Number.isSafeInteger(ledger.unopenedBoxes+boxes))return{ledger,status:'unavailable',granted:false};ledger.unopenedBoxes+=boxes;if(boxes)ledger.starterToolkitEntitled=true;if(sailingParts)addSailing(ledger,'tag',id);ledger.tagAwards=[...awards,id];return{ledger,status:'granted',granted:true}; }
  return Object.freeze({ defaultLedger, normalize, awardTagResult, awardWalkCheckpoint, awardWalkTile, awardTournamentWin, awardArcadeEvent });
});
