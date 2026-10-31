// One bounded verification at a time, off the rendering thread. There is no
// storage, polling, reward write, or unbounded queue on the practice page.
export function createProofClient({makeWorker=()=>new Worker(new URL('./imasora-sliding-tag-proof-worker.mjs?v=120rk',import.meta.url),{type:'module'}),timeoutMs=15000}={}){
 let worker=null,pending=null,closed=false;
 function done(result){if(!pending)return;clearTimeout(pending.timer);const resolve=pending.resolve;pending=null;resolve(result);}
 function stop(){worker?.terminate();worker=null;}
 return{verify(proof){if(closed)return Promise.resolve({ok:false,status:'closed'});if(pending)return Promise.resolve({ok:false,status:'busy'});return new Promise(resolve=>{pending={id:proof.id,resolve,timer:setTimeout(()=>{stop();done({ok:false,status:'timeout'});},timeoutMs)};try{if(!worker){const current=makeWorker();worker=current;worker.onmessage=({data})=>{if(worker===current&&data?.id===pending?.id)done(data.ok?{ok:true,status:'checked',receipt:data.receipt}:{ok:false,status:'invalid'});};worker.onerror=e=>{if(worker!==current)return;e.preventDefault?.();stop();done({ok:false,status:'unavailable'});};}worker.postMessage(proof,[proof.inputs.buffer]);}catch{stop();done({ok:false,status:'unavailable'});}});},dispose(){closed=true;stop();done({ok:false,status:'closed'});}};
}
