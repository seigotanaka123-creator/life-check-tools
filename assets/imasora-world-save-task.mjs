import {WORLD_LEDGER as L} from './imasora-world-live-ledger.js?v=120gn';
import {prepareTransportRestorePlan,prepareTransportRestoreCommit,compactCheckedRestorePoints,validateTransportRestoreJournal,validateAndCompactTransportRestoreJournal,snapshotTransportRestoreJournal,sameTransportRestoreValue} from './imasora-construction-transport-restore.mjs?v=120gn';
import {validateSoilTransport} from './imasora-construction-soil-transport.mjs?v=120gn';
import {validateWorldTransport,worldTransportSoil} from './imasora-construction-transport-authority.mjs?v=120gn';
import {validateScoopDumpContinuation,basinScoopPlan,scoopDumpPlan} from './imasora-construction-fragment-scoop.mjs?v=120gn';
import {sameValidatedConstructionRecordValue as sameChecked} from './imasora-construction-record-equality.mjs';

const exactValues=(a,b)=>{if(Object.is(a,b))return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;if(Array.isArray(a)&&a.length===3&&b.length===3&&Object.keys(a).length===3&&Object.keys(b).length===3&&typeof a[0]==='number'&&typeof a[1]==='number'&&typeof a[2]==='number'&&typeof b[0]==='number'&&typeof b[1]==='number'&&typeof b[2]==='number')return Object.is(a[0],b[0])&&Object.is(a[1],b[1])&&Object.is(a[2],b[2]);const keys=Object.keys(a);return keys.length===Object.keys(b).length&&(!Array.isArray(a)||a.length===b.length)&&keys.every(k=>Object.hasOwn(b,k)&&exactValues(a[k],b[k]));};
// Only encoding and full validation. Storage, receipts and write ordering
// remain owned by the save service on the caller's side.
export function executeWorldSaveTask(kind,args){
 if(kind==='prepare-kit-transfer'){
  const next=L.transferConstructionKit(args.ledger,args.action,args.draft,args.expectedRevision),checked=executeWorldSaveTask('pack-checked',{ledger:next});
  const before=args.ledger.world.constructionTransport?.work?.frame.soil,after=checked.ledger.world.constructionTransport?.work?.frame.soil;return{...checked,exactSoil:before&&after?exactValues(before,after):false};
 }
 if(kind==='prepare-high'){
  const next=L.applyConstructionHighBuild(args.ledger,args.action,args.draft,args.expectedRevision),checked=executeWorldSaveTask('pack-checked',{ledger:next});
  const before=args.ledger.world.constructionTransport?.work?.frame.soil,after=checked.ledger.world.constructionTransport?.work?.frame.soil;
  return {...checked,exactSoil:before&&after?exactValues(before,after):false};
 }
 if(kind==='scoop-plan')return args.basin===true?basinScoopPlan(args.work):scoopDumpPlan(args.work);
 if(kind==='soil-check'){validateSoilTransport(args.soil);return true;}
 if(kind==='transport-check'){const r=args.record;validateWorldTransport(r,worldTransportSoil(r).initial.source,r.profileId);return true;}
 if(kind==='prepare-transport'){const next=L.prepareConstructionTransportCandidate(args.ledger,args.record,args.draft,args.expectedRevision),checked=executeWorldSaveTask('pack-checked',{ledger:next});return {...checked,exactTransport:exactValues(checked.ledger.world.constructionTransport,args.record)};}
 if(kind==='prepare-world'){
  const {ledger,draft,event,craft}=args;let next=ledger;if(event)next=L.awardLinkedFlightReward(next,event.resource,event.amount,event.id);
  const checked=executeWorldSaveTask('pack-checked',{ledger:L.saveLinkedWorldDraft(next,draft,{craft})});
  const soil=ledger.world.constructionTransport?.work?.frame.soil,after=checked.ledger.world.constructionTransport?.work?.frame.soil;
  return {...checked,exactSoil:soil&&after?exactValues(soil,after):false};
 }
 if(kind==='pack')return L.packWorldPurchaseLedger(args.ledger);
 if(kind==='pack-checked'){
  const packet=L.packWorldPurchaseLedger(args.ledger);
  // Adopt exactly the serialized state, including JSON's -0 -> 0 spelling.
  // Packing above fully checks the candidate; parsing its own packet is not
  // a second import and does not replay the complete terrain again.
  return {packet,ledger:L.unpackWorldPurchaseLedger(packet)};
 }
 if(kind==='unpack')return L.unpackWorldPurchaseLedger(args.raw);
 if(kind==='read-transport'){
  L.validateWorldPurchaseLedger(args.ledger);const base=args.ledger,next=L.unpackWorldPurchaseLedger(args.raw);
  if(next.world.constructionTransport?.version!==2||!sameChecked(next.source,base.source))throw Error('別の世界や旧形式の作業は読み込めません。');
  validateScoopDumpContinuation(base.world.constructionTransport.work,next.world.constructionTransport.work);return {ledger:next,exactSoil:exactValues(worldTransportSoil(base.world.constructionTransport),worldTransportSoil(next.world.constructionTransport))};
 }
 if(kind==='restore-result-check'){
  const actual=validateTransportRestoreJournal(args.actual),expected=snapshotTransportRestoreJournal(args.expected);
  if(!sameTransportRestoreValue(actual,expected))throw Error('現場の控えと復元結果が一致しません。停止して保持します。');return true;
 }
 if(kind==='restore-point-bound'){
  const point=validateAndCompactTransportRestoreJournal(args.journal),soil=worldTransportSoil(args.current),names=['beforeSaved','beforeUnsaved','applied'];
  const exactCurrent=exactValues(point.applied,args.current),soilMatches=names.map(k=>exactValues(worldTransportSoil(point[k]),soil));
  // The caller owns this immutable soil already. After the complete point
  // check and exact comparisons, return only the small differing scene fields.
  // This flag changes transfer size only; it never grants validation authority.
  if(args.bindCapturedSoil===true)for(let i=0;i<names.length;i++)if(soilMatches[i]){const k=names[i],r=point[k];point[k]={...r,work:{...r.work,frame:{...r.work.frame,soil:null}}};}
  return {point,exactCurrent,soilMatches};
 }
 if(kind==='restore-point-proof'){validateTransportRestoreJournal(args.journal);return true;}
 if(kind==='restore-point-checked')return compactCheckedRestorePoints([validateTransportRestoreJournal(args.journal)])[0];
 if(kind==='restore-plan')return prepareTransportRestorePlan(args);
 if(kind==='restore-plan-checked'){
  const result=prepareTransportRestorePlan(args),point=compactCheckedRestorePoints([result.point])[0];
  const next=L.unpackWorldPurchaseLedger(point.appliedRaw);return {next,point,packet:point.appliedRaw,exactSoil:exactValues(worldTransportSoil(next.world.constructionTransport),worldTransportSoil(point.applied)),exactBeforeSaved:exactValues(point.beforeSaved,args.ledger.world.constructionTransport),exactBeforeUnsaved:exactValues(point.beforeUnsaved,args.before),exactApplied:exactValues(point.applied,args.candidate),candidateSoilIsSaved:exactValues(worldTransportSoil(args.candidate),worldTransportSoil(args.ledger.world.constructionTransport)),unsavedSoilIsSaved:exactValues(worldTransportSoil(args.before),worldTransportSoil(args.ledger.world.constructionTransport))};
 }
 if(kind==='restore-commit'){const checked=prepareTransportRestoreCommit(args),[journal,priorPoint]=compactCheckedRestorePoints([checked.journal,checked.priorPoint]);return {journal,priorPoint};}
 throw Error('セーブの処理を確認できませんでした。');
}
