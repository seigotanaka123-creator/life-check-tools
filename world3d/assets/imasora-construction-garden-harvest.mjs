import{projectCoastForage,applyCoastEvent}from'./imasora-coast-forage.mjs?v=120ps';
// Harvest shares the garden transaction and the pouch journal. Neither side
// is ever committed on its own, including an undo or an acknowledged retry.
export function stampGardenAction(s,a,now=Date.now()){
 const n=structuredClone(a);if(n.type!=='GARDEN_EDIT'||!['harvest','water'].includes(n.edit?.op))return n;const last=projectCoastForage(s.events,s.source.fingerprint).lastAt;
 if(n.type==='GARDEN_EDIT'&&n.edit?.op==='harvest')Object.assign(n.edit,{at:Math.max(now,last+1),receiptId:'garden-petal-'+s.source.fingerprint+'-'+s.revision});
 if(n.type==='GARDEN_EDIT'&&n.edit?.op==='water')n.edit.at=Math.max(now,last+1);
 return n;
}
export function gardenHarvestEvent(s,a,high,now=Date.now()){
 if(!(a.type==='GARDEN_EDIT'&&a.edit.op==='harvest')&&!(a.type==='GARDEN_UNDO'&&s.world.constructionHighBuild?.garden?.history.at(-1)?.harvest))return null;let event=null;const p=projectCoastForage(s.events,s.source.fingerprint);
 if(a.type==='GARDEN_EDIT'&&a.edit.op==='harvest'){
  const receipt=high.garden.history.at(-1).harvest;
  if(receipt.id!=='garden-petal-'+s.source.fingerprint+'-'+s.revision)throw Error('花びらの受取先をたしかめよう。');
  event={kind:'coast',id:receipt.id,action:{type:'harvest',at:receipt.at,receipt}};
 }else if(a.type==='GARDEN_UNDO'){
  const receipt=s.world.constructionHighBuild?.garden?.history.at(-1)?.harvest;
  if(receipt)event={kind:'coast',id:'garden-petal-undo-'+s.source.fingerprint+'-'+s.revision,action:{type:'undo-harvest',at:Math.max(now,p.lastAt+1),receiptId:receipt.id}};
 }
 if(event)applyCoastEvent(p,event,s.source.fingerprint);
 return event;
}
