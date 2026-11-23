// Transfer a completed, recorded round to the home writer. No home save is
// written by the renderer or the replay verifier.
export function createHuntGrowth({api,entryApi,companion,storage,session,now=Date.now,newId=()=> 'tag:'+crypto.randomUUID(),onNotice=()=>{},onStartNotice=onNotice}){
 let ticket=null,pending=null,latest=null,retrySessionResults=!!companion;
 const verificationByRound=new Map(),idByDisplay=new Map();
 function current(){if(!companion||!api)return null;const saved=JSON.parse(storage.getItem(entryApi.HOME_KEY));if(api.subject(saved)!==companion.subject)throw Error('TAG_SUBJECT_CHANGED');return saved;}
 function status(){if(!companion||!api)return'この対戦では育成の報酬は受け取れません。育成するときはホームから始めてね。';if((companion.growthAllowed===false||now()>=(companion.growthUntil??Infinity)))return'相棒は引退の準備中です。この対戦では育成の報酬は受け取れません。';try{const cards=api.skyCardStatus(current());return '試合の成果はホームで相棒の育成に使えます。'+(cards.rights?' 進化の権利 '+cards.rights+'回。':' 進化の権利まであと空カード '+cards.untilRight+'枚。');}catch{return'育成の保存を確認できません。ホームへ戻ってね。';}}
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
  let rows,receipts,sameCompanion;
  try{
   rows=api.readInbox(session);
   if(!rows.length&&!pending){retrySessionResults=false;return;}
   const saved=JSON.parse(storage.getItem(entryApi.HOME_KEY));
   receipts=new Set(api.progress(saved).receipts);
   sameCompanion=api.subject(saved)===companion.subject;
  }catch{return;}
  if(pending&&receipts.has(pending.ticket.id))pending=null;
  let retry=false;
  for(const row of rows){
   const id=row.ticket.id;
   if(receipts.has(id)){
    // A different tab can settle the result without clearing this tab's inbox.
    try{api.acknowledge(session,id);}catch{}
   }else if(sameCompanion&&row.ticket.subject===companion.subject&&retrySessionResults&&!retry){
    try{
     api.queueDurable(storage,row,entryApi.HOME_KEY);
     if(latest?.roundId===id)latest.durable=true;
    }catch{retry=true;}
   }
  }
  retrySessionResults=retry;
 }
 function canStart(){try{flush();if(companion){const pending=api.readResults(session,storage,entryApi.HOME_KEY);if(!pending.readable.session&&!pending.readable.durable)throw Error('TAG_RESULTS_UNAVAILABLE');if(pending.rows.length>=api.MAX_PENDING)throw Error('TAG_INBOX_FULL');}return true;}catch{onStartNotice('先にホームで成果を受け取ってね。保存できない時は、この画面を残してください。');return false;}}
 function rememberVerification(reply){
  const roundId=idByDisplay.get(reply?.id);
  if(!roundId)return;
  idByDisplay.delete(reply.id);
  if(reply.ok)verificationByRound.set(roundId,reply.receipt);
 }
 function previewEscape(saved,row,receipt,at){
  const description=api.describeResult(saved,row,receipt,{now:at});
  if(!description.card)return description;
  const progress=api.progress(saved),book=api.skyCardStatus(saved),roundId=row.ticket.id;
  const ordered=(api.readResults(session,storage,entryApi.HOME_KEY).rows??[])
   .filter(r=>r.ticket.subject===row.ticket.subject&&!progress.receipts.includes(r.ticket.id)&&
    r.ticket.id!==roundId&&r.finishedAt<=row.ticket.issuedAt&&r.ticket.config?.mode==='escape'&&
    r.proof?.claim?.win&&r.proof.claim.time===180)
   .sort((a,b)=>a.finishedAt-b.finishedAt);
  if(!ordered.length)return description;
  // Home owns the real rewards. Only predict the escape streak in a copy,
  // using earlier rounds that have already passed the replay verifier.
  const {rights,untilRight,...cards}=book;
  const projected={...saved,tagGrowth:{...progress,skyCards:cards}};
  for(const prior of ordered){
   const verified=verificationByRound.get(prior.ticket.id);
   if(!verified)return{...description,card:null,escapePending:true};
   const result=api.describeResult(projected,prior,verified,{now:at});
   if(result.card?.skyId){
    cards.earned++;cards.escape=0;
    const sky=result.card.skyId;
    cards.cards[sky]=(cards.cards[sky]??0)+1;
   }else if(result.card?.escape)cards.escape=result.card.escape;
  }
  return{...description,card:api.describeResult(projected,row,receipt,{now:at}).card};
 }
 return{status,canStart,rememberVerification,admit(config){
  let nextTicket=null;
  if(companion&&api&&companion.growthAllowed!==false){
   const admitted=api.admission(current(),{id:newId(),config,now:now(),growthUntil:companion.growthUntil,matchSky:config.matchSky});
   if(admitted.status==='ready')nextTicket=admitted.ticket;
  }
  ticket=nextTicket;
  latest=null;
 },finish(proof,displayId){if(!ticket)return{formal:false};pending={version:1,ticket,proof,finishedAt:now()};latest={id:displayId,row:pending,roundId:ticket.id};idByDisplay.set(displayId,ticket.id);if(idByDisplay.size>api.MAX_PENDING)idByDisplay.delete(idByDisplay.keys().next().value);if(verificationByRound.size>=api.MAX_PENDING)verificationByRound.delete(verificationByRound.keys().next().value);ticket=null;try{persistPending();return{formal:true,queued:true};}catch{onNotice('成果を保存できません。この画面を残して、もう一度受け取ってね。');return{formal:true,queued:false};}},describe(displayId,reply){
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
   const at=now(),row=latest.row;
   const description=row.ticket.config.mode==='escape'?previewEscape(saved,row,reply.receipt,at):api.describeResult(saved,row,reply.receipt,{now:at});
   return{...description,queued:!!latest.queued,durable};
  }catch{return{status:'unavailable',durable};}
 },flush,handoff(previous){if(!pending)throw Error('TAG_NO_PENDING_RESULT');return api.makeHandoff(previous,pending);},get waiting(){return!!pending;}};
}
