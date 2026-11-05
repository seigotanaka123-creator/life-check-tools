// The verifier owns the input trace after postMessage. Keep only the small
// result metadata here, and bound both waiting work and its lifetime.
function compactReceipt(value,expected){try{if(!value||typeof value!=='object'||typeof value.rules!=='string'||value.rules.length>100||typeof value.caught!=='boolean'||typeof value.win!=='boolean'||!Number.isFinite(value.time)||value.time<0||!(value.catcher===null||['hunter-0','hunter-1','hunter-2'].includes(value.catcher)))return null;const copy={rules:value.rules,caught:value.caught,win:value.win,time:value.time,catcher:value.catcher};return Object.keys(copy).every(k=>Object.is(copy[k],expected[k]))?Object.freeze(copy):null;}catch{return null;}}
export function createHuntProofClient({createWorker,onReply=()=>{},timeoutMs=45000,idleMs=30000,maxPending=2,setTimer=setTimeout,clearTimer=clearTimeout}){
 if(!Number.isFinite(idleMs)||idleMs<=0)throw Error('INVALID_VERIFIER_IDLE_TIMEOUT');
 const pending=new Map();let worker=null,closed=false,created=0,failures=0,idleTimer=null,idleGeneration=0,idleRetirements=0;
 function publishReply(reply,meta){try{onReply(reply,meta);}catch{}}
 function cancelIdle(){idleGeneration++;if(idleTimer!==null){clearTimer(idleTimer);idleTimer=null;}}
 function detach(w){w.onmessage=w.onerror=w.onmessageerror=null;try{w.terminate();}catch{}}
 function retire(w,notify=true){if(worker!==w)return;cancelIdle();worker=null;const waiting=[...pending];pending.clear();for(const[,r]of waiting)clearTimer(r.timer);if(w)detach(w);if(notify){failures++;for(const[id,r]of waiting)publishReply({id,ok:false,unavailable:true},r.meta);}}
 function scheduleIdle(w){if(closed||worker!==w||pending.size)return;cancelIdle();const generation=idleGeneration;
  const release=()=>{if(closed||worker!==w||generation!==idleGeneration||pending.size)return;idleTimer=null;idleRetirements++;retire(w,false);};
  try{idleTimer=setTimer(release,idleMs);}catch{release();}
 }
 function open(){if(closed)return null;if(worker)return worker;let w;try{w=createWorker();}catch{failures++;return null;}worker=w;created++;
  w.onmessage=({data})=>{if(closed||worker!==w)return;const r=pending.get(data?.id);if(!r)return;pending.delete(data.id);clearTimer(r.timer);const receipt=data.ok===true?compactReceipt(data.receipt,r.expected):null;publishReply({id:data.id,ok:!!receipt,unavailable:false,...(receipt?{receipt}:{})},r.meta);scheduleIdle(w);};
  w.onerror=w.onmessageerror=()=>{if(!closed)retire(w);};return w;
 }
 // Preparation and unfinished rounds need no verifier download or worker graph.
 return{submit(proof,id){if(closed||!Number.isSafeInteger(id)||id<1||pending.has(id)||pending.size>=maxPending||!Array.isArray(proof?.config?.opponents)||!proof?.claim)return false;
  cancelIdle();const w=open();if(!w)return false;const meta=Object.freeze({config:Object.freeze({mode:proof.config.mode,startKey:proof.config.startKey,opponents:Object.freeze([...proof.config.opponents])}),claim:Object.freeze({time:proof.claim.time,win:proof.claim.win})});
  const expected=Object.freeze({rules:proof.rules,caught:proof.claim.caught,win:proof.claim.win,time:proof.claim.time,catcher:proof.claim.catcher});
  const request={meta,expected,timer:null};
  try{
   // An already queued deadline can run after a reply or a later submission.
   request.timer=setTimer(()=>{if(worker===w&&pending.get(id)===request)retire(w);},timeoutMs);
   pending.set(id,request);
   w.postMessage({...proof,id});
   return true;
  }catch{retire(w);return false;}
 },terminate(){if(closed)return;closed=true;retire(worker,false);},stats:()=>({pending:pending.size,workersCreated:created,failures,closed,active:worker!==null,idlePending:idleTimer!==null,idleRetirements})};
}
