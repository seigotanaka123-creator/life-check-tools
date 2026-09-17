import {RECOVERY_DATABASES,RECOVERY_LOCAL_KEYS,MAX_RECOVERY_PAYLOAD,checkRecoveryJSON} from './imasora-world-recovery-bundle.js?v=483';

// No WorldSaveService.initialize(): even opening a new save normally performs migration.
export function createRecoveryReader({idb=globalThis.indexedDB,storage=globalThis.localStorage,events=globalThis,timeoutMs=5000}={}){
  const failure=()=>Error('保存を読み取れませんでした。元の記録は変更していません。');
  function watchChanges(onChange){
    const listener=e=>{if((e.storageArea===storage||!e.storageArea)&&(e.key===null||RECOVERY_LOCAL_KEYS.includes(e.key)))onChange();};
    events.addEventListener('storage',listener);return()=>events.removeEventListener('storage',listener);
  }
  function readDatabase(info,budget){
    return new Promise((resolve,reject)=>{
      let done=false,db=null,tx=null;
      const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);db?.close();error?reject(error):resolve(value);};
      const timer=setTimeout(()=>{try{tx?.abort();}catch{}finish(Error('保存の取得が時間内に終わりませんでした。内容を省略せず停止しました。'));},timeoutMs);
      let request;
      try{request=idb.open(info.name,info.version);}catch(e){finish(e);return;}
      // Handles deletion between databases() and open(): abort prevents creation.
      request.onupgradeneeded=()=>{request.transaction.abort();finish(Error('保存領域が変更されました。もう一度取得してください。'));};
      request.onerror=()=>finish(request.error??failure());
      request.onblocked=()=>finish(Error('保存領域の更新中です。取得は中止しました。少し後に再度取得してください。'));
      request.onsuccess=()=>{
        db=request.result;if(done){db.close();return;}
        db.onversionchange=()=>{try{tx?.abort();}catch{}finish(Error('保存領域の版が変更されました。取得を中止しました。'));};
        const names=Array.from(db.objectStoreNames).sort(),result={name:info.name,version:db.version,stores:names.map(name=>({name,entries:[]}))};
        if(!names.length){finish(null,result);return;}
        try{
          tx=db.transaction(names,'readonly');
          tx.oncomplete=()=>finish(null,result);tx.onabort=()=>finish(tx.error??failure());tx.onerror=()=>{};
          for(const store of result.stores){
            const cursor=tx.objectStore(store.name).openCursor();
            cursor.onsuccess=()=>{
              const row=cursor.result;if(!row)return;
              try{
                const item={key:row.key,value:row.value};checkRecoveryJSON(item);
                budget.bytes+=new TextEncoder().encode(JSON.stringify(item)).length;budget.entries++;
                if(budget.bytes>MAX_RECOVERY_PAYLOAD||budget.entries>20000)throw Error('記録が取得上限を超えています。内容を省略せず停止しました。');
                store.entries.push(item);row.continue();
              }catch(e){try{tx.abort();}catch{}finish(e);}
            };
          }
        }catch(e){finish(e);}
      };
    });
  }
  async function inventory(){
    if(typeof idb?.databases!=='function')throw Error('このブラウザーでは保存領域の存在を安全に確認できません。記録の取得は行いません。');
    let timer;
    try{
      const result=await Promise.race([idb.databases(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(failure()),timeoutMs);})]);
      return result.filter(d=>RECOVERY_DATABASES.includes(d.name)).sort((a,b)=>a.name.localeCompare(b.name));
    }finally{clearTimeout(timer);}
  }
  async function readDomains(){
    const before=await inventory(),budget={bytes:0,entries:0};
    const local=RECOVERY_LOCAL_KEYS.map(key=>({key,raw:storage.getItem(key)}));
    for(const item of local){budget.bytes+=new TextEncoder().encode(JSON.stringify(item)).length;}
    if(budget.bytes>MAX_RECOVERY_PAYLOAD)throw Error('旧保存・装備素材が取得上限を超えています。');
    const databases=[];
    for(const name of RECOVERY_DATABASES){
      const info=before.find(d=>d.name===name);
      databases.push(info?await readDatabase(info,budget):{name,version:null,stores:[]});
    }
    if(JSON.stringify(before)!==JSON.stringify(await inventory()))throw Error('取得中に保存領域が変わりました。もう一度取得してください。');
    // Let cross-tab storage notifications arrive before the two-pass comparison.
    await new Promise(resolve=>setTimeout(resolve,0));return {local,databases};
  }
  return {readDomains,watchChanges};
}
