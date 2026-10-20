import{boardBayLevels,boardLiftInstalled,boardLiftHeight,boardBayRetrofitAfter,boardBayRetrofitJobs}from'./imasora-construction-board-bay-shape.mjs?v=120gn';
import{boardBayLevel}from'./imasora-construction-board-bay.mjs?v=120gn';
import{highProjects}from'./imasora-construction-high-world.mjs?v=120gn';
// A board on the raised receiver must retain its real support. Moving the
// board first is an ordinary crane/roller operation, not an inventory deletion.
export function assertBoardBaySupportChange(before,after,timber,origin){
 if(!timber||!origin)return true;
 for(const c of timber.work.boardLifts?.sites??[]){const next=highProjects(after).find(p=>p.id===c.projectId)?.record,w=next?{...next.work}:null;if(w&&boardBayRetrofitJobs.has(w.job?.type))w.boardBayRetrofit=boardBayRetrofitAfter(w,w.job.type);if(!w||!boardLiftInstalled(w)||c.height>boardLiftHeight(w))throw Error('荷物リフトを地上へもどし、床板を降ろしてから片付けよう。');}
 for(const p of timber.work.parts){if(!p.fixed||p.hover||p.carrierId)continue;
  for(const project of highProjects(before)){const level=boardBayLevel(project.record,p,origin);if(level===null||level<1)continue;
   const next=highProjects(after).find(r=>r.id===project.id)?.record;
   if(!next||JSON.stringify(next.site)!==JSON.stringify(project.record.site)||!boardBayLevels(next.work).includes(level)||(['BAY_CLOSE','BAY_UNBRACE'].includes(next.work.job?.type)&&(next.work.job.bayLevel??0)===level)||next.work.levels!==project.record.work.levels||next.work.job?.type==='DISMANTLE')throw Error('上の受取台や部屋に床板があるよ。先にクレーンで床板を地上へおろそう。');
  }
 }return true;
}
