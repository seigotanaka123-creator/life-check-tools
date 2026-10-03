(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./imasora-construction-reward-ledger.js'):root.ImasoraConstructionRewardLedger,
    typeof module==='object'&&module.exports?require('./imasora-construction-pack-ledger.js'):root.ImasoraConstructionPackLedger,
    typeof module==='object'&&module.exports?require('./imasora-construction-pack-transfer.js'):root.ImasoraConstructionPackTransfer);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ImasoraConstructionSaveGuard=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(rewards,packs,transfer){
  'use strict';
  const fields=['constructionRewardLedger','constructionMaterialLedger'];
  const fail=code=>{const error=new Error(code);error.constructionSaveConflict=true;throw error;};
  function project(value){
    if(!value||typeof value!=='object'||Array.isArray(value))fail('INVALID_HOME_SAVE');
    return {constructionRewardLedger:rewards.normalize(value.constructionRewardLedger),constructionMaterialLedger:packs.normalize(value.constructionMaterialLedger)};
  }
  function createGuard(){
    let baseline=null;
    return {
      remember(value){baseline=transfer.stable(project(value));},
      prepare(local,remote){
        if(baseline===null)fail('CONSTRUCTION_SAVE_NOT_READY');
        const current=project(local),saved=project(remote===undefined?{}:remote);
        const currentKey=transfer.stable(current),savedKey=transfer.stable(saved);
        let chosen;
        if(currentKey===savedKey||savedKey===baseline)chosen=current;
        else if(currentKey===baseline)chosen=saved;
        else fail('CONSTRUCTION_SAVE_CONFLICT');
        // A blocked remote must never be replaced by a healthy local snapshot.
        if(fields.some(field=>saved[field].blocked&&!chosen[field].blocked))fail('CONSTRUCTION_REMOTE_BLOCKED');
        return {...local,...structuredClone(chosen)};
      }
    };
  }
  return Object.freeze({createGuard});
});
