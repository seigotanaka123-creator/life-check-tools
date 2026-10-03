(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ImasoraPendingRewards=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Failed awards stay here until an explicit retry succeeds. No timer writes or game-loop work.
  function createQueue(onChange=()=>{}){
    const entries=new Map();
    const snapshot=()=>Array.from(entries.values(),e=>({id:e.id,label:e.label,busy:!!e.promise,failed:e.failed}));
    const notify=()=>{try{onChange(snapshot());}catch{}};
    function attempt(entry){
      if(entry.promise)return entry.promise;
      entry.promise=Promise.resolve().then(entry.action).then(result=>{
        if(result?.committed===true||result?.status==='duplicate')entries.delete(entry.id);
        else entry.failed=true;
        return result;
      },error=>{entry.failed=true;return{status:'failed',granted:false,boxes:0,error};}).finally(()=>{entry.promise=null;notify();});
      notify();return entry.promise;
    }
    return Object.freeze({
      submit(id,label,action){if(typeof id!=='string'||!id||typeof action!=='function')throw Error('Invalid reward request');let entry=entries.get(id);if(entry?.promise)return entry.promise.then(result=>result?.committed===true?{...result,status:'duplicate',granted:false,boxes:0,constructionRewardBoxesAwarded:0}:result);if(!entry){entry={id,label,action,failed:false,promise:null};entries.set(id,entry);}return attempt(entry);},
      retry(){return Promise.all(Array.from(entries.values(),attempt));},snapshot,
      hasPending:()=>entries.size>0
    });
  }
  return Object.freeze({createQueue});
});
