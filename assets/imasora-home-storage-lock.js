(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ImasoraHomeStorageLock=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const database='imasora-home-writer-lock-v1';
  function create({indexedDB,nativeLocks}={}){
    let opening=null;
    function open(){
      if(!indexedDB?.open)return Promise.reject(Error('このブラウザーでは保存を安全に確認できません。'));
      if(!opening)opening=new Promise((resolve,reject)=>{
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
          db.onversionchange=()=>{db.close();opening=null;};
          resolve(db);
        };
      }).catch(error=>{opening=null;throw error;});
      return opening;
    }
    async function request(name,action){
      if(typeof action!=='function')throw TypeError('保存する操作がありません。');
      if(nativeLocks?.request)return nativeLocks.request(name,action);
      // Existing reward and material writers finish synchronously. A read/write
      // transaction serializes those writers across tabs and receipt iframes.
      // Their existing journals own crash recovery for the localStorage values.
      if(action.constructor?.name==='AsyncFunction')throw TypeError('この保存方法では、記録の変更をひとつの操作で完了させてください。');
      const db=await open();
      return new Promise((resolve,reject)=>{
        let result,error,tx;
        try{
          tx=db.transaction('writers','readwrite');
          const read=tx.objectStore('writers').get(String(name));
          read.onsuccess=()=>{
            try{
              result=action();
              if(result&&typeof result.then==='function')throw TypeError('保存処理は同期した操作で完了させてください。');
            }catch(cause){error=cause;tx.abort();}
          };
          tx.oncomplete=()=>resolve(result);
          tx.onabort=()=>reject(error||tx.error||Error('保存を完了できませんでした。'));
          tx.onerror=()=>{};
        }catch(cause){reject(cause);}
      });
    }
    return Object.freeze({request});
  }
  return Object.freeze({create,database});
});
