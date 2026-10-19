(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ImasoraHomeSaveAccess=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  // These fields identify an older or current home save. Unknown extensions are kept.
  const identityFields=['coin','position','monster','days','logs','stamps','skyStock','townBuildings','works','dex','constructionRewardLedger','constructionMaterialLedger','pendingBattle','lastPlay'];
  function createAccess(){
  let protectedSave=false,started=false,activeDocument=null;
  function blocked(code,cause){const error=new Error(code,{cause});error.homeSaveBlocked=true;return error;}
  function parseState(raw){
    if(raw===null)return undefined; // Only a missing key means a first visit.
    let value;try{value=JSON.parse(raw);}catch(error){throw blocked('HOME_SAVE_UNREADABLE',error);}
    if(!value||typeof value!=='object'||Array.isArray(value)||!identityFields.some(key=>Object.hasOwn(value,key)))throw blocked('HOME_SAVE_INVALID');
    return value;
  }
  function readState(storage,key){
    if(protectedSave)throw blocked('HOME_SAVE_PROTECTED');
    let raw;try{raw=storage.getItem(key);}catch(error){throw blocked('HOME_SAVE_ACCESS_DENIED',error);}
    return parseState(raw);
  }
  function protect(error,doc=activeDocument||root.document){
    protectedSave=true;
    if(!doc)return;
    doc.body.classList.remove('loading-screen-active','new-opening-active');
    doc.body.classList.add('home-save-protected');
    const app=doc.querySelector('.app');if(app)app.inert=true;
    const notice=doc.getElementById('homeSaveNotice');if(notice){notice.hidden=false;notice.querySelector('button')?.focus();}
  }
  function start(options={}){
    if(started)return false;
    const doc=options.document||root.document;activeDocument=doc;
    const notice=doc.getElementById('homeSaveNotice');
    const retry=notice?.querySelector('button');
    const status=notice?.querySelector('[role=status]');
    if(retry)retry.onclick=()=>{
      // Retry never writes or deletes a key, and resumes only in a fresh game instance.
      try{const storage=options.storage||root.localStorage;parseState(storage.getItem(options.key||'lifeQuestWalkV1'));(options.reload||(()=>root.location.reload()))();}
      catch(error){if(status)status.textContent='まだ読み込めません。いまの画面を残してお知らせください。';}
    };
    try{
      const storage=options.storage||root.localStorage;
      readState(storage,options.key||'lifeQuestWalkV1');
      const source=doc.getElementById(options.applicationId||'imasoraHomeApplication');
      if(!source?.textContent)throw blocked('HOME_GAME_UNAVAILABLE');
      started=true;
      const script=doc.createElement('script');script.textContent=source.textContent;
      script.setAttribute('data-imasora-home-started','');
      let bootError=null;
      const onError=event=>{bootError=event.error||blocked('HOME_GAME_START_FAILED');protect(bootError,doc);};
      root.addEventListener?.('error',onError);
      try{doc.body.append(script);source.textContent='';}finally{root.removeEventListener?.('error',onError);}
      return !bootError;
    }catch(error){protect(error,doc);return false;}
  }
  return Object.freeze({parseState,readState,protect,start});
  }
  return Object.freeze({...createAccess(),createAccess});
});
