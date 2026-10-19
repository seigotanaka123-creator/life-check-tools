import {IndexedConstructionStore} from './imasora-construction-storage.js';
import {commitTransportRestore,readTransportRestoreState,reuseCheckedTransportRestore} from './imasora-construction-transport-restore-store.mjs?v=120fw';
import {captureOwnedConstructionJson} from './imasora-construction-json-capture.mjs';
import {runWorldSaveTask} from './imasora-world-save-client.mjs?v=120fw';
let ownedStore;
// One worker-owned connection retains private certificates. Every transaction
// still re-reads and compares the current head and prior point atomically.
export async function executeTransportStorageTask(kind,args){
 if(typeof document!=='undefined'||args?.name!=='imasora-world-authority-v1')throw Error('通常保存の処理先が一致しません。');
 if(!ownedStore){ownedStore=new IndexedConstructionStore();ownedStore.name=args.name;}
 if(kind==='transport-read'){
  const result=await readTransportRestoreState(ownedStore,{soil:args.soil});
  if(result.journal)result.journal=await captureOwnedConstructionJson(result.journal);
  return result;
 }
 if(kind==='transport-commit'){
  const journal=await runWorldSaveTask('restore-point-checked',{journal:await captureOwnedConstructionJson(args.journal)},{createWorker:()=>null});
  const prior=args.priorSnapshot?await captureOwnedConstructionJson(args.priorSnapshot):null;
  const priorSnapshot=prior?(reuseCheckedTransportRestore(ownedStore,prior)??await runWorldSaveTask('restore-point-checked',{journal:prior},{createWorker:()=>null})):null;
  return commitTransportRestore(ownedStore,journal,{priorSnapshot});
 }
 throw Error('保存の処理が不正です。');
}
