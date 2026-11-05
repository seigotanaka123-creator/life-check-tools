// Transfer a completed, recorded round to the home writer. No home save is
// written by the renderer or the replay verifier.
export function createHuntGrowth({api,entryApi,companion,storage,session,now=Date.now,newId=()=> 'tag:'+crypto.randomUUID(),onNotice=()=>{},onStartNotice=onNotice}){
 let ticket=null,pending=null,latest=null,retrySessionResults=!!companion;
 function current(){if(!companion||!api)return null;const saved=JSON.parse(storage.getItem(entryApi.HOME_KEY));if(api.subject(saved)!==companion.subject)throw Error('TAG_SUBJECT_CHANGED');return saved;}
 function status(){if(!companion||!api)return'試遊：育成はホームから始めます。';if((companion.growthAllowed===false||now()>=(companion.growthUntil??Infinity)))return'引退準備中：今回は試遊です。';try{const saved=current();return api.skyValid(api.progress(saved).sky,companion.subject,now())?'育成中：成果はホームで同じモンスターに反映します。':'試遊：育成するには、ホームで今の空を撮ってね。';}catch{return'育成の保存を確認できません。ホームへ戻ってね。';}}
 function persistPending(){
  if(!pending)return;
  let durable=false;
  try{api.queueDurable(storage,pending,entryApi.HOME_KEY);durable=true;}catch{}
  try{api.queue(session,pending);}catch(error){if(!durable)throw error;}
  if(latest?.roundId===pending.ticket.id){latest.queued=true;latest.durable=durable;}
  if(!durable)retrySessionResults=true;
  pending=null;
 }
 function flush(){
  if(companion)refreshSessionResults();
  persistPending();
 }
 function refreshSessionResults(){
  let rows,receipts;
  try{
   rows=api.readInbox(session);
   if(!rows.length&&!pending){retrySessionResults=false;return;}
   receipts=new Set(api.progress(current()).receipts);
  }catch{return;}
  if(pending&&receipts.has(pending.ticket.id))pending=null;
  let retry=false;
  for(const row of rows){
   if(row.ticket.subject!==companion.subject)continue;
   const id=row.ticket.id;
   if(receipts.has(id)){
    // A different tab can settle the result without clearing this tab's inbox.
    try{api.acknowledge(session,id);}catch{}
   }else if(retrySessionResults&&!retry){
    try{
     api.queueDurable(storage,row,entryApi.HOME_KEY);
     if(latest?.roundId===id)latest.durable=true;
    }catch{retry=true;}
   }
  }
  retrySessionResults=retry;
 }
 function canStart(){try{flush();if(companion){const pending=api.readResults(session,storage,entryApi.HOME_KEY);if(!pending.readable.session&&!pending.readable.durable)throw Error('TAG_RESULTS_UNAVAILABLE');if(pending.rows.length>=api.MAX_PENDING)throw Error('TAG_INBOX_FULL');}return true;}catch{onStartNotice('先にホームで成果を受け取ってね。保存できない時は、この画面を残してください。');return false;}}
 return{status,canStart,admit(config){
  let nextTicket=null;
  if(companion&&api&&companion.growthAllowed!==false){
   const admitted=api.admission(current(),{id:newId(),config,now:now(),growthUntil:companion.growthUntil});
   if(admitted.status==='ready')nextTicket=admitted.ticket;
  }
  ticket=nextTicket;
  latest=null;
 },finish(proof,displayId){if(!ticket)return{formal:false};pending={version:1,ticket,proof,finishedAt:now()};latest={id:displayId,row:pending,roundId:ticket.id};ticket=null;try{persistPending();return{formal:true,queued:true};}catch{onNotice('成果を保存できません。この画面を残して、もう一度受け取ってね。');return{formal:true,queued:false};}},describe(displayId,reply){
  if(!latest||latest.id!==displayId)return null;
  if(latest.received)return{status:'received'};
  const durable=!!latest.durable;
  try{
   const saved=current();
   if(api.progress(saved).receipts.includes(latest.roundId)){
    if(pending?.ticket.id===latest.roundId)pending=null;
    latest.received=true;
    latest.row=null;
    return{status:'received'};
   }
   if(!reply)return{status:'checking',durable};
   if(!reply.ok)return{status:reply.unavailable?'unavailable':'unverified',durable};
   const description=api.describeResult(saved,latest.row,reply.receipt,{now:now()});
   return{...description,queued:!!latest.queued,durable};
  }catch{return{status:'unavailable',durable};}
 },flush,handoff(previous){if(!pending)throw Error('TAG_NO_PENDING_RESULT');return api.makeHandoff(previous,pending);},get waiting(){return!!pending;}};
}
