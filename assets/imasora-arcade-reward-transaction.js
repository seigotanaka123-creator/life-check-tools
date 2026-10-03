(function attachArcadeRewardTransaction(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ImasoraArcadeRewardTransaction = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createArcadeRewardTransaction() {
  "use strict";

  function validateEntries(entries, allowedKeys, allowNull) {
    return Array.isArray(entries) && entries.length >= 1 && entries.length <= allowedKeys.size
      && entries.every(entry => Array.isArray(entry) && entry.length === 2
        && typeof entry[0] === "string" && allowedKeys.has(entry[0])
        && (typeof entry[1] === "string" || (allowNull && entry[1] === null)))
      && new Set(entries.map(([key]) => key)).size === entries.length;
  }

  function validateJournal(record, allowedKeys) {
    if (!record || ![1, 2].includes(record.version)
      || !validateEntries(record.before, allowedKeys, true)
      || (record.version === 2 && (!validateEntries(record.after, allowedKeys, false)
        || record.before.length !== record.after.length
        || record.before.some(([key]) => !record.after.some(([afterKey]) => afterKey === key))))) {
      throw new Error("Invalid arcade reward recovery record");
    }
    return record.version === 2 ? record.after : record.before;
  }

  function recover(storage, journalKey, allowedKeyList) {
    const allowedKeys = new Set(allowedKeyList);
    const raw = storage.getItem(journalKey);
    if (!raw) return false;
    const entries = validateJournal(JSON.parse(raw), allowedKeys);
    for (const [key, value] of entries) {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    }
    storage.removeItem(journalKey);
    return true;
  }

  function commit(storage, journalKey, entries, allowedKeyList, recoveryMode = "rollback") {
    const allowedKeys = new Set(allowedKeyList);
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > allowedKeys.size
      || entries.some(entry => !Array.isArray(entry) || entry.length !== 2
        || typeof entry[0] !== "string" || !allowedKeys.has(entry[0])
        || typeof entry[1] !== "string")
      || new Set(entries.map(([key]) => key)).size !== entries.length
      || !["rollback", "roll-forward"].includes(recoveryMode)) {
      throw new Error("Invalid arcade reward transaction");
    }
    const before = entries.map(([key]) => [key, storage.getItem(key)]);
    let journalWritten = false;
    try {
      const record = recoveryMode === "roll-forward"
        ? { version: 2, before, after: entries }
        : { version: 1, before };
      storage.setItem(journalKey, JSON.stringify(record));
      journalWritten = true;
      for (const [key, value] of entries) storage.setItem(key, value);
      storage.removeItem(journalKey);
    } catch (error) {
      if (journalWritten) {
        try {
          recover(storage, journalKey, allowedKeyList);
          if (recoveryMode === "roll-forward") return true;
        } catch { error.recoveryRequired = true; }
      }
      throw error;
    }
    return true;
  }

  return Object.freeze({ commit, recover });
});
