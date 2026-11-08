import {mountSkyCamera} from './imasora-sky-camera-ui.mjs?v=1210p';
import {createSkyCandidateClient} from './imasora-sky-candidate-client.mjs?v=120qm';
// Both playable routes use the same camera, pixel classifier and confirmation.
// A route can only transfer metadata for the subject and walk it opened with.
export function createSkyPhotoDestination({url,storage,session,entry,growth,now=Date.now,navigate}={}){
 const params=new URL(url).searchParams,source=params.get('from'),walk=source==='walk-growth',tag=source==='tag-growth',enabled=!['semantic','balanced'].includes(params.get('skyAnalysis'))&&(walk||tag);
 const returnHome='../life-quest-walk.html?from='+(walk?'walk-sky-camera':params.get('return')==='monster'?'sky-camera':'tag-sky-camera');
 let subject=null,request=null;
 const read=()=>JSON.parse(storage.getItem(entry.HOME_KEY));
 if(enabled)try{const state=read();subject=growth.subject(state);if(walk){request=state.walkSkyRequest;if(request?.subject!==subject)subject=null;}}catch{}
 return{enabled,walk,returnHome,ready:!!subject,confirm:enabled&&subject?candidate=>{
  const state=read();if(growth.subject(state)!==subject)throw Error('MONSTER_CHANGED');
  const photo={version:1,route:walk?'walk':'tag',subject,candidate,confirmedAt:now(),...walk?{request}:{}};
  growth.photoEnvelope(photo,now());if(walk)growth.prepareWalkPhoto(state,photo,{now:now(),mapKey:request.mapKey});
  const previous=session.getItem(growth.SKY_INBOX);
  if(previous){
   let old;try{old=JSON.parse(previous);}catch{}
   const same=old?.subject===photo.subject&&old?.route===photo.route&&['source','captureId','capturedAt','skyId','score'].every(key=>old.candidate?.[key]===candidate[key])&&JSON.stringify(old.request)===JSON.stringify(photo.request);
   if(same){navigate(returnHome);return;}
   const pending=growth.prepareSkyInbox(state,previous,{now:now(),mapKey:state.walkSkyRequest?.mapKey,canGrow:false});
   if(pending.status==='ready')throw Error('SKY_PHOTO_PENDING');
  }
  session.setItem(growth.SKY_INBOX,JSON.stringify(photo));navigate(returnHome);
 }:undefined};
}
const params=new URL(location.href).searchParams,semantic=params.get('skyAnalysis')==='semantic',balanced=params.get('skyAnalysis')==='balanced';
const client=createSkyCandidateClient(semantic||balanced?{workerFactory:()=>new Worker(new URL(balanced?'./imasora-sky-semantic-worker.mjs?v=120qk&input=balanced':'./imasora-sky-semantic-worker.mjs?v=120qk',import.meta.url),{type:'module'})}:{});
let photoStorage,photoSession;try{photoStorage=localStorage;photoSession=sessionStorage;}catch{}
const destination=createSkyPhotoDestination({url:location.href,storage:photoStorage,session:photoSession,entry:globalThis.ImasoraSlidingTagEntry,growth:globalThis.ImasoraTagGrowth,navigate:url=>location.assign(url)});
if(destination.enabled){document.querySelector('footer small').textContent=destination.ready?'写真から空を推定します。写真と合っていることを確認して、同じモンスターの育成に使います。':'育成の準備を確認できません。ホームから撮影を開き直してください。';document.querySelector('#back').href=destination.returnHome;document.querySelector('#back').setAttribute('aria-label',destination.walk?'閉じて散歩へ戻る':params.get('return')==='monster'?'閉じて育成大会へ戻る':'閉じて鬼ごっこへ戻る');}
const screen=mountSkyCamera({candidateClient:client,...destination.confirm?{onConfirm:destination.confirm}:{}});
if(semantic||balanced)document.querySelector('footer small').textContent=balanced?'明るさを整える比較版です。育成には反映しません。':'空の見分け方を調整中です。育成には反映しません。';
addEventListener('pagehide',event=>{if(!event.persisted)screen.dispose();});
