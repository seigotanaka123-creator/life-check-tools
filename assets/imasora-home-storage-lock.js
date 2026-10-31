(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ImasoraHomeStorageLock=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const database='imasora-home-writer-lock-v1';
  function create({indexedDB,nativeLocks}={}){
    let opening=null,connection=null;
    function forget(db){if(connection===db){connection=null;opening=null;}}
    function retire(db){forget(db);try{db.close();}catch{}}
    function open(){
      if(!indexedDB?.open)return Promise.reject(Error('このブラウザーでは保存を安全に確認できません。'));
      if(!opening){let own;own=new Promise((resolve,reject)=>{
        let request,blocked=false;
        try{request=indexedDB.open(database,1);}catch(error){reject(error);return;}
        request.onupgradeneeded=()=>{
          if(!request.result.objectStoreNames.contains('writers'))request.result.createObjectStore('writers');
        };
        request.onerror=()=>reject(request.error||Error('保存の準備ができません。'));
        request.onblocked=()=>{
          blocked=true;
          reject(Error('ほかの画面で保存の準備をしています。その画面を終えてから、もう一度お試しください。'));
        };
        request.onsuccess=()=>{
          const db=request.result;
          if(blocked){db.close();return;}
          connection=db;
          db.onclose=()=>forget(db);
          db.onversionchange=()=>retire(db);
          resolve(db);
        };
      }).catch(error=>{if(opening===own)opening=null;throw error;});opening=own;}
      return opening;
    }
    async function request(name,action){
      if(typeof action!=='function')throw TypeError('保存する操作がありません。');
      if(nativeLocks?.request)return nativeLocks.request(name,action);
      // Existing reward and material writers finish synchronously. A read/write
      // transaction serializes those writers across tabs and receipt iframes.
      // Their existing journals own crash recovery for the localStorage values.
      if(action.constructor?.name==='AsyncFunction')throw TypeError('この保存方法では、記録の変更をひとつの操作で完了させてください。');
      let tx;
      for(let attempt=0;attempt<2;attempt++){
        const db=await open();
        try{tx=db.transaction('writers','readwrite');break;}
        catch(error){
          if(error?.name!=='InvalidStateError')throw error;
          // No transaction or writer has started yet: this is the only point
          // at which reopening and retrying cannot duplicate an external write.
          retire(db);
          if(attempt===1)throw error;
        }
      }
      return new Promise((resolve,reject)=>{
        let result,error;
        tx.oncomplete=()=>resolve(result);
        tx.onabort=()=>reject(error||tx.error||Error('保存を完了できませんでした。'));
        tx.onerror=()=>{};
        try{
          const read=tx.objectStore('writers').get(String(name));
          read.onsuccess=()=>{
            try{
              result=action();
              if(result&&typeof result.then==='function')throw TypeError('保存処理は同期した操作で完了させてください。');
            }catch(cause){error=cause;try{tx.abort();}catch{reject(cause);}}
          };
        }catch(cause){error=cause;try{tx.abort();}catch{}reject(cause);}
      });
    }
    return Object.freeze({request});
  }
  return Object.freeze({create,database});
});
