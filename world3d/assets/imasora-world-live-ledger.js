import {createWorldLedgerAPI} from './imasora-world-ledger-engine.js';
export const WORLD_LEDGER=createWorldLedgerAPI({scope:'imasora-world-ledger-v1',kinds:['legacy-world','new-world']});
