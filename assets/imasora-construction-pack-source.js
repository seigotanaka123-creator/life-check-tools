(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./imasora-construction-pack-ledger.js'):root.ImasoraConstructionPackLedger,typeof module==='object'&&module.exports?require('./imasora-arcade-reward-transaction.js'):root.ImasoraArcadeRewardTransaction,typeof module==='object'&&module.exports?require('./imasora-home-save-access.js'):root.ImasoraHomeSaveAccess);if(typeof module==='object'&&module.exports)module.exports=api;else root.ImasoraConstructionPackSource=api;})(typeof globalThis!=='undefined'?globalThis:this,function(packs,transaction,access){
'use strict';
const scope='imasora-material-delivery-v1',key='lifeQuestWalkV1',journal='imasoraUfoArcadeRewardPendingV1';
const fail=text=>{throw Error(text);};
const validProfile=id=>typeof id==='string'&&/^[0-9a-f]{8}$/.test(id);
const local=host=>host==='localhost'||host==='127.0.0.1';
function allowedOrigin(origin,own){try{const a=new URL(origin),b=new URL(own);return a.origin===b.origin||a.protocol===b.protocol&&a.protocol==='http:'&&a.hostname===b.hostname&&local(b.hostname);}catch{return false;}}
function createSource(storage,locks){
 function read(profileId){
  if(!validProfile(profileId))fail('受取先をたしかめ直してください。');
  if(storage.getItem(journal)||storage.getItem('imasoraPachicoinPrizeExchangePendingV1'))fail('街の保存が途中です。街の画面で保存を終えてから、もう一度受け取ってください。');
  const raw=storage.getItem(key),saved=access.parseState(raw);if(!saved)fail('街のセーブが見つかりません。同じ端末で街の工房を開いてください。');
  const available=packs.transferAvailability(saved.constructionMaterialLedger);if(available.blocked)fail('街の建材をたしかめられません。記録はそのまま残しています。');
  const ledger=packs.normalize(saved.constructionMaterialLedger);
  return {raw,saved,available,packets:ledger.transferReceipts.filter(r=>r.targetProfileId===profileId).map(r=>r.packet)};
 }
 function preview(profileId){const r=read(profileId);return {scope,profileId,openingReceipts:r.available.openingReceipts,quantities:r.available.quantities,packets:r.packets};}
 async function take(profileId,openingReceipts,eventId){
  if(!locks?.request)fail('街の建材を安全に送れません。ブラウザーの保存機能が使える画面でお試しください。');
  return locks.request('imasora-ufo-arcade-reward',()=>{
   const r=read(profileId);
   if(JSON.stringify(r.available.openingReceipts)!==JSON.stringify(openingReceipts))fail('街の建材が変わりました。もう一度内容をたしかめてください。');
   if(!r.available.ready)return preview(profileId);
   const prepared=packs.prepareTransferState(r.saved,profileId,eventId);
   if(prepared.status!=='exported'&&prepared.status!=='duplicate')fail('建材を送れませんでした。街の記録はそのまま残しています。');
   // One atomic home value is journaled under the same lock used by existing home writers.
   if(storage.getItem(key)!==r.raw)fail('街のセーブが変わりました。もう一度内容をたしかめてください。');
   const after=JSON.stringify(prepared.state);
   transaction.commit(storage,journal,[[key,after]],[key],'roll-forward');
   if(storage.getItem(key)!==after)fail('街の受渡し記録をたしかめられません。もう一度受け取ってください。');
   // The receipt stays in home history, including while the world save is pending.
   // Lost replies and failed world saves retry this exact packet, never another debit.
   return preview(profileId);
  });
 }
 return Object.freeze({preview,take});
}
function install(root){
 const nonce=new URL(root.location.href).searchParams.get('nonce');if(!/^[A-Za-z0-9_-]{16,80}$/.test(nonce||'')||root.parent===root)return;
 const source=createSource(root.localStorage,root.ImasoraHomeStorageLock.create({indexedDB:root.indexedDB,nativeLocks:root.navigator.locks}));
 root.addEventListener('message',async event=>{
  const m=event.data;if(event.source!==root.parent||!allowedOrigin(event.origin,root.location.origin)||m?.scope!==scope||m.nonce!==nonce||!Number.isSafeInteger(m.id)||!['preview','take'].includes(m.action))return;
  try{const data=m.action==='preview'?source.preview(m.profileId):await source.take(m.profileId,m.openingReceipts,m.eventId);event.source.postMessage({scope,nonce,id:m.id,data},event.origin);}
  catch(error){event.source.postMessage({scope,nonce,id:m.id,error:error.homeSaveBlocked?'街のセーブを読み込めません。記録はそのまま残しています。':error.message},event.origin);}
 });
 root.parent.postMessage({scope,nonce,ready:true},'*');
}
return Object.freeze({scope,allowedOrigin,createSource,install});
});
