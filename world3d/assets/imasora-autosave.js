(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ImasoraAutoSave=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 // Run while the game is alive as well as on backgrounding. Unload alone is
 // not a reliable opportunity to finish an asynchronous database transaction.
 function create({save,ready=()=>true,dirty=()=>true,onError=()=>{},onSaved=()=>{},window:win=globalThis.window,document:doc=globalThis.document,interval=2000}){
  let stopped=false,running=null,again=false,lastError=null,retryTimer=null,retries=0;
  function flush(reason='interval'){
   if(stopped)return Promise.resolve(false);
   if(reason!=='retry'&&reason!=='interval')retries=0;
   const retry=()=>{if(reason!=='interval'&&retries++<40){clearTimeout(retryTimer);retryTimer=setTimeout(()=>void flush('retry'),100);}};
   try{if(!ready()){retry();return Promise.resolve(false);}if(!dirty())return Promise.resolve(false);}catch(error){if(lastError?.message!==error?.message)onError(error);lastError=error;return Promise.resolve(false);}
   if(running){again=true;return running;}
   // Invoke synchronously so pagehide captures the current state before return.
   let task;try{task=save(reason);}catch(e){task=Promise.reject(e);}
   running=Promise.resolve(task).then(ok=>{if(ok!==false){lastError=null;retries=0;onSaved(reason);}else retry();return ok!==false;},error=>{const previous=lastError;lastError=error;if(previous?.message!==error?.message)onError(error);return false;}).finally(()=>{running=null;if(again){again=false;if(!stopped)void flush('followup');}});
   return running;
  }
  const hidden=()=>{if(doc.hidden)void flush('hidden');},depart=()=>void flush('pagehide'),release=()=>{clearTimeout(releaseTimer);releaseTimer=setTimeout(()=>void flush('release'),180);};
  let releaseTimer=null;const timer=setInterval(()=>{if(!doc.hidden)void flush();},interval);
  doc.addEventListener('visibilitychange',hidden);doc.addEventListener('freeze',depart);win.addEventListener('pagehide',depart);win.addEventListener('beforeunload',depart);win.addEventListener('pointerup',release);win.addEventListener('keyup',release);
  return{flush,get busy(){return!!running;},get error(){return lastError;},dispose(){stopped=true;clearInterval(timer);clearTimeout(releaseTimer);clearTimeout(retryTimer);doc.removeEventListener('visibilitychange',hidden);doc.removeEventListener('freeze',depart);win.removeEventListener('pagehide',depart);win.removeEventListener('beforeunload',depart);win.removeEventListener('pointerup',release);win.removeEventListener('keyup',release);}};
 }
 const json=value=>JSON.stringify(value);
 function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16);}
 // Deliberately refuses live meshes, bodies, DOM and cycles. Save adapters
 // choose their own gameplay fields and reconstruct engine objects on load.
 function plain(value,depth=0,seen=new Set()){
  if(value===null||typeof value==='boolean'||typeof value==='string')return value;
  if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite checkpoint');return value;}
  if(depth>24||!value||typeof value!=='object'||seen.has(value))throw Error('Invalid checkpoint tree');
  if(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype)throw Error('Runtime object in checkpoint');
  if(Array.isArray(value)&&value.length>16000)throw Error('Checkpoint array limit');
  seen.add(value);let result;
  if(Array.isArray(value))result=value.map(v=>plain(v,depth+1,seen));
  else{result={};for(const[k,v]of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Invalid checkpoint key');if(v!==undefined)result[k]=plain(v,depth+1,seen);}}
  seen.delete(value);return result;
 }
 function fields(object,keys){const result={};for(const key of keys)if(object[key]!==undefined)result[key]=plain(object[key]);return result;}
 function createCheckpoint({storage,key,kind,validate=()=>true,id=()=>globalThis.crypto.randomUUID()}){
  let raw=storage.getItem(key),packet=null,writer=id(),claimed=false;
  function decode(text){if(text===null)return null;const p=JSON.parse(text);if(p?.version!==1||p.kind!==kind||!Number.isSafeInteger(p.sequence)||p.sequence<1||typeof p.writer!=='string'||p.checksum!==checksum(json(p.value))||p.value!==null&&!validate(p.value))throw Error('CHECKPOINT_INVALID');plain(p.value);return p;}
  packet=decode(raw);
  function claim(){const current=storage.getItem(key);if(current!==raw)throw Error('CHECKPOINT_CHANGED');claimed=true;write(packet?.value??null);}
  function write(value){if(!claimed)throw Error('CHECKPOINT_NOT_CLAIMED');const current=storage.getItem(key);if(current!==raw)throw Error('CHECKPOINT_SUPERSEDED');if(value!==null&&!validate(value))throw Error('CHECKPOINT_INVALID');const checked=plain(value),next={version:1,kind,writer,sequence:(packet?.sequence??0)+1,value:checked,checksum:checksum(json(checked))},source=json(next);if(source.length>4*1024*1024)throw Error('CHECKPOINT_TOO_LARGE');storage.setItem(key,source);raw=source;packet=next;return checked;}
  return{get value(){return packet?.value??null;},get current(){return storage.getItem(key)===raw;},claim,write};
 }
 return Object.freeze({create,createCheckpoint,plain,fields,checksum});
});
