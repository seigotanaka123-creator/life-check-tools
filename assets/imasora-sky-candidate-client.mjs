export function createSkyCandidateClient({workerFactory=()=>new Worker(new URL('./imasora-sky-candidate-worker.mjs?v=120qh',import.meta.url),{type:'module'}),timeoutMs=5000}={}){
 let worker=null,pending=null,sequence=0;function finish(value){if(!pending)return;const p=pending;pending=null;clearTimeout(p.timer);p.signal?.removeEventListener('abort',p.abort);p.resolve(value);}
 // Retire ownership before termination: a queued event from the old Worker
 // must never finish or terminate a newer capture's Worker.
 function reset(){const retired=worker;worker=null;try{retired?.terminate();}catch{}}
 function cancel(){finish({verified:false,reason:'cancelled'});reset();}
 function getWorker(){if(!worker){const own=workerFactory();worker=own;own.onmessage=event=>{if(worker!==own||!pending||event.data?.id!==pending.id)return;const result=event.data.result;if(!result||result.verified!==false){finish({verified:false,reason:'unavailable'});reset();return;}finish(result);if(result.reason==='unavailable')reset();};own.onerror=()=>{if(worker!==own)return;finish({verified:false,reason:'unavailable'});reset();};}return worker;}
 function prepare(){try{getWorker().postMessage({type:'prepare'});}catch{reset();}}
 async function recognize(frame){if(pending)return{verified:false,reason:'busy'};if(frame.signal?.aborted)return{verified:false,reason:'cancelled'};const n=frame.width*frame.height;if(!Number.isSafeInteger(frame.width)||!Number.isSafeInteger(frame.height)||frame.width<16||frame.height<16||n>19200||!(frame.data instanceof Uint8ClampedArray)||frame.data.length!==n*4)return{verified:false,reason:'unavailable'};
  return new Promise(resolve=>{const id=++sequence,abort=()=>{if(pending?.id===id)cancel();},timer=setTimeout(()=>{if(pending?.id!==id)return;finish({verified:false,reason:'timeout'});reset();},timeoutMs);pending={id,resolve,abort,signal:frame.signal,timer};frame.signal?.addEventListener('abort',abort,{once:true});try{const own=getWorker(),data=frame.data.slice();try{own.postMessage({id,frame:{width:frame.width,height:frame.height,data}},[data.buffer]);}catch(error){if(data.byteLength)data.fill(0);throw error;}}catch{finish({verified:false,reason:'unavailable'});reset();}});
 }
 return Object.freeze({prepare,recognize,cancel,dispose:cancel});
}
