import {MATCH_SECONDS} from './imasora-sliding-tag-hunt-match.mjs';

const validTime = time => Number.isFinite(time) && time >= 0 && time <= MATCH_SECONDS;
function bestTime(mode, a, b) {
  if (!validTime(a)) return validTime(b) ? b : undefined;
  if (!validTime(b)) return a;
  return mode === 'hunt' ? Math.min(a, b) : Math.max(a, b);
}
function combinationKey({mode, opponents, startKey}) {
  return mode + ':' + opponents.join('|') + ':' + startKey + ':empty';
}

export function createHuntBestRecords({storage, key, locks = globalThis.navigator?.locks}) {
  const session = new Map();
  function readSaved() {
    const raw = storage.getItem(key);
    if (raw === null) return {};
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw Error('INVALID_HUNT_BESTS');
    return saved;
  }
  function readState(config) {
    const combination = combinationKey(config);
    let saved;
    try { saved = readSaved()[combination]; } catch {}
    const time = bestTime(config.mode, saved, session.get(combination)?.time);
    return {time, temporary: time !== undefined && time !== saved};
  }
  async function retry() {
    if (!session.size) return;
    function save() {
      if (!session.size) return;
      const saved = readSaved();
      let changed = false;
      for (const [combination, {mode, time}] of session) {
        const next = bestTime(mode, saved[combination], time);
        if (saved[combination] === next) continue;
        saved[combination] = next;
        changed = true;
      }
      if (changed) storage.setItem(key, JSON.stringify(saved));
      session.clear();
    }
    try {
      if (typeof locks?.request === 'function') await locks.request(key, save);
      else save();
    } catch {
      // Keep every verified result in this tab until the batch can be saved.
    }
  }
  async function store(config, claim) {
    const {mode} = config;
    if (!validTime(claim.time) || (mode !== 'hunt' && mode !== 'escape') ||
        (mode === 'hunt' && claim.win !== true)) return undefined;
    const combination = combinationKey(config);
    session.set(combination, {mode, time: bestTime(mode, claim.time, session.get(combination)?.time)});
    await retry();
    return readState(config).time;
  }
  return {read: config => readState(config).time, readState, store, retry, get hasPending(){return session.size>0;}};
}
