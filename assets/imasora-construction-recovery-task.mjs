import {createTransportRecovery,inspectTransportRestoreFile,inspectSavedTransportRecord,transportRestoreSummary,validateTransportRestoreJournal} from './imasora-construction-transport-restore.mjs?v=120fw';

// Pure checks only: this module has no storage, mutation or receipt authority.
export async function executeTransportRecoveryTask(kind,args){
 if(kind==='export')return createTransportRecovery(args);
 if(kind==='inspect'||kind==='inspect-saved'){
  const result=kind==='inspect-saved'?inspectSavedTransportRecord(args.text,args.context,{includeCurrentSummary:true}):await inspectTransportRestoreFile(args.text,args.context),c=args.context;
  return {...result,currentSummary:result.currentSummary??transportRestoreSummary(c.current,c.earth,c.profile)};
 }
 if(kind==='summaries')return {summary:transportRestoreSummary(args.record,args.earth,args.profile),currentSummary:transportRestoreSummary(args.current,args.earth,args.profile)};
 if(kind==='journal')return validateTransportRestoreJournal(args.journal);
 throw Error('その控えの確認方法は使えません。');
}
