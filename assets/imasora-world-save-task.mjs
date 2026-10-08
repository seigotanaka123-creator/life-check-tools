import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=119bd';
import {prepareTransportRestorePlan,prepareTransportRestoreCommit} from './imasora-construction-transport-restore.mjs';

// Only encoding and full validation. Storage, receipts and write ordering
// remain owned by the save service on the caller's side.
export function executeWorldSaveTask(kind,args){
 if(kind==='pack')return L.packWorldPurchaseLedger(args.ledger);
 if(kind==='pack-checked')return {packet:L.packWorldPurchaseLedger(args.ledger),ledger:args.ledger};
 if(kind==='unpack')return L.unpackWorldPurchaseLedger(args.raw);
 if(kind==='restore-plan')return prepareTransportRestorePlan(args);
 if(kind==='restore-commit')return prepareTransportRestoreCommit(args);
 throw Error('セーブの処理を確認できませんでした。');
}
