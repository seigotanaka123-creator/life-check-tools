import {monsterSubject,readTagProgress} from './imasora-sliding-tag-growth-bridge.mjs?v=120rk';
// The host supplies approved provider versions and an approved finite lifetime.
// This is client consistency, not a server signature or proof against tampering.
const fail=code=>{throw Error(code);},object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),id=v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,120}$/.test(v),time=v=>Number.isSafeInteger(v)&&v>0;
function policyOK(policy){if(!object(policy)||policy.approved!==true||!id(policy.id)||!Number.isSafeInteger(policy.maxRecognitionAgeMs)||policy.maxRecognitionAgeMs<=0||!Array.isArray(policy.providers)||!policy.providers.length||!policy.providers.every(p=>object(p)&&id(p.id)&&id(p.version)))fail('RECOGNITION_POLICY_UNAVAILABLE');}
export function prepareTagRecognition(state,receipt,{policy,now,subject,segmentId,recognitionId,catalog}={}){
 policyOK(policy);if(!time(now)||subject!==monsterSubject(state)||!id(segmentId)||!id(recognitionId))fail('CAPTURE_SUBJECT_CHANGED');
 if(!object(receipt)||receipt.source!=='camera-recognition'||!id(receipt.captureId)||!time(receipt.capturedAt)||!time(receipt.recognizedAt)||receipt.capturedAt>receipt.recognizedAt||receipt.recognizedAt>now||now-receipt.capturedAt>policy.maxRecognitionAgeMs||!policy.providers.some(p=>p.id===receipt.providerId&&p.version===receipt.providerVersion)||!catalog?.sky?.(receipt.skyId))fail('RECOGNITION_UNCONFIRMED');
 const p=readTagProgress(state);
 if(p.activeRound&&p.sky?.subject===subject&&p.sky?.validUntil>=now)return{status:'round-active'};
 const old=p.sky;if(old){if(!object(old)||!id(old.captureId)||!time(old.capturedAt))fail('TAG_SKY_UNREADABLE');if(old.captureId===receipt.captureId)return{status:'duplicate'};if(receipt.capturedAt<=old.capturedAt)fail('OLDER_CAPTURE');}
 const validUntil=receipt.capturedAt+policy.maxRecognitionAgeMs;if(!Number.isSafeInteger(validUntil))fail('RECOGNITION_POLICY_UNAVAILABLE');
 const next=structuredClone(state),progress=next.slidingTag=p;
 const sky={id:recognitionId,source:'camera-recognition',subject,segmentId,policyId:policy.id,captureId:receipt.captureId,capturedAt:receipt.capturedAt,recognizedAt:receipt.recognizedAt,validUntil,skyId:receipt.skyId,providerId:receipt.providerId,providerVersion:receipt.providerVersion};progress.sky=sky;delete progress.activeRound;return{status:'ready',next,sky};
}
export function prepareTagAdmission(state,{policy,id:roundId,now,canGrow}={}){
 policyOK(policy);if(!/^tag:[A-Za-z0-9_-]{8,80}$/.test(roundId)||!time(now)||typeof canGrow!=='function')fail('ADMISSION_UNAVAILABLE');if(!canGrow(state))return{status:'growth-paused'};
 const p=readTagProgress(state),sky=p.sky;if(!sky||sky.subject!==monsterSubject(state)||sky.policyId!==policy.id||sky.source!=='camera-recognition'||!time(sky.capturedAt)||!time(sky.recognizedAt)||!time(sky.validUntil)||sky.capturedAt>sky.recognizedAt||sky.validUntil<sky.recognizedAt||!id(sky.id)||!id(sky.segmentId)||!id(sky.captureId)||sky.recognizedAt>now||sky.validUntil<now||now-sky.capturedAt>policy.maxRecognitionAgeMs||sky.validUntil-sky.capturedAt>policy.maxRecognitionAgeMs||!policy.providers.some(p=>p.id===sky.providerId&&p.version===sky.providerVersion))return{status:'awaiting-sky'};
 if(!Array.isArray(p.receipts))fail('TAG_PROGRESS_UNREADABLE');if(p.receipts.includes(roundId))return{status:'duplicate'};
 if(p.activeRound){const active=p.activeRound;if(!object(active)||active.authority!=='tag-admission-v1'||active.mode!=='formal'||!/^tag:[A-Za-z0-9_-]{8,80}$/.test(active.id)||active.subject!==sky.subject||active.policyId!==policy.id||active.skyId!==sky.id||active.segmentId!==sky.segmentId||!time(active.issuedAt)||active.issuedAt<sky.recognizedAt||active.issuedAt>now)fail('ADMISSION_UNREADABLE');if(p.activeRound.id===roundId)return{status:'admitted',ticket:structuredClone(p.activeRound)};return{status:'round-active'};}
 const next=structuredClone(state),ticket={authority:'tag-admission-v1',mode:'formal',id:roundId,subject:sky.subject,policyId:policy.id,issuedAt:now,skyId:sky.id,segmentId:sky.segmentId};next.slidingTag.activeRound=ticket;return{status:'ready',next,ticket};
}

export function prepareTagAbandonment(state,{roundId,subject}={}){const p=readTagProgress(state);if(subject!==monsterSubject(state))fail('CAPTURE_SUBJECT_CHANGED');if(!p.activeRound)return{status:'absent'};if(p.activeRound.id!==roundId||p.activeRound.subject!==subject)fail('ADMISSION_CHANGED');const next=structuredClone(state);next.slidingTag=p;delete p.activeRound;return{status:'ready',next};}
