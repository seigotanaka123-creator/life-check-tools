import {projectOperationCount} from './project-history.mjs';
import {PROFILE_PROJECT_OPERATION_LIMIT} from '../imasora-construction-profile-project.js';
export const HISTORY_READ_ACTIONS=new Set(['access','pause','leave','save','export','camera','stop','dismiss','retry','evacuate']);
export function historyActionAllowed(name,confirmation){return HISTORY_READ_ACTIONS.has(name)||name==='confirm'&&confirmation?.type==='SAFE_RETURN'&&!confirmation.extra?.vehicle;}
// The existing replayable log remains intact. Never discard entries or reset
// a project to make room: its material balance and idempotency depend on them.
export function projectHistoryStatus(project){
 const used=project?projectOperationCount(project):0,remaining=Math.max(0,PROFILE_PROJECT_OPERATION_LIMIT-used),full=remaining===0;
 return{used,remaining,full,message:full?'作業記録がいっぱいです。作品・材料は保存されています。新しい施工は停止しています。「メニュー」から作業の控えを保存できます。':remaining<=32?'作業記録の空きがあと'+remaining+'件です。メニューから作業の控えを保存しておくことをおすすめします。':'作業の控えをファイルに保存できます。作品・材料・車両の記録を含みます。'};
}
