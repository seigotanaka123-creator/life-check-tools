import {createCaveCrossing,caveTime,caveExitNearby,cavePace} from './imasora-coast-cave-crossing.mjs?v=120mx';
export function createCaveCrossingUI({host,service,context,snapshot,view,groundContact=()=>null,hidden=()=>document.hidden,modalOpen=()=>!!globalThis.document?.querySelector?.('dialog[open]'),now=()=>performance.now(),canSave=()=>true}){
 const tracker=createCaveCrossing(),note=document.createElement('p');note.className='coast-cave-record';note.setAttribute('role','status');note.hidden=true;host.append(note);
 let pending=null,saving=false,saveTask=null,saveRevision=0,retryAt=0,expires=0,clock=0,disposed=false,entryShown=false,celebrateUntil=0;
 let latest=null,confirmedBest=Infinity,confirmedRecord=null,paceRecord=null,pace='',paceUntil=0,paceStone=0,tick=-1,live='';
 const best=()=>Math.min(confirmedBest,service.ledger?.world.coastExploration?.tideCave.bestMs??Infinity);
 const savedRecord=()=>[confirmedRecord,service.ledger?.world.coastExploration?.tideCave].filter(Boolean).sort((a,b)=>a.bestMs-b.bestMs||Number(!!b.splitsMs)-Number(!!a.splitsMs))[0];
 const needsSave=run=>run.milliseconds<best()||run.milliseconds===best()&&!savedRecord()?.splitsMs&&!!run.splitsMs;
 // Freeze the comparison for a whole attempt. A background save finishing
 // halfway across must not move the benchmark under the player's feet.
 const benchmark=()=>{const r=[savedRecord(),pending&&{bestMs:pending.milliseconds,splitsMs:pending.splitsMs}].filter(Boolean).sort((a,b)=>a.bestMs-b.bestMs||Number(!!b.splitsMs)-Number(!!a.splitsMs))[0];return r&&{bestMs:r.bestMs,splitsMs:r.splitsMs?.slice()};};
 const pausedFor=c=>hidden()||c.paused||modalOpen();
 const visibility=()=>{const c=context();note.hidden=pausedFor(c)||c.map!=='coast'||clock>=expires;};
 const say=(text,seconds=6,mode='polite')=>{if(note.textContent!==text)note.textContent=text;if(live!==mode){live=mode;note.setAttribute('aria-live',mode);}expires=clock+seconds;visibility();};
 function result(){
  if(!latest||tracker.running||tracker.armed||context().map!=='coast')return;
  const {run,previousBest}=latest,saved=best();let label;
  if(pending&&saved>run.milliseconds)label='記録をセーブ中';
  else if(run.milliseconds<=saved&&previousBest===Infinity)label='はじめての記録！';
  else if(run.milliseconds<=saved&&run.milliseconds<previousBest)label='自己ベスト！ '+caveTime(previousBest-run.milliseconds)+'短縮';
  else label='ベスト '+caveTime(saved)+(run.milliseconds>saved?' · あと'+caveTime(run.milliseconds-saved):'');
  say('潮の洞窟を渡りきった！ '+caveTime(run.milliseconds)+' · '+label);
 }
 async function commit(){
  if(disposed||!pending||saving||service.busy||service.blocked||!service.ready||service.mode!=='live'||!canSave())return;
  const run=pending;
  if(!needsSave(run)){pending=null;result();return;}
  if(now()<retryAt)return;
  saving=true;
  try{const record=await service.saveCoastExploration(run,snapshot(),service.ledger.revision);if(disposed)return;confirmedBest=Math.min(confirmedBest,record.tideCave.bestMs);confirmedRecord=record.tideCave;if(pending===run)pending=null;
   // A late response belongs to its saved attempt, never to a new running clock.
   result();
  }catch{if(!disposed){retryAt=now()+3000;if(latest&&!tracker.running&&!tracker.armed&&context().map==='coast')say('渡りきった記録をセーブし直しているよ。',4);}}
  finally{saving=false;}
 }
 // Join the same authority write from render frames and page lifecycle saves.
 // Only completed evidence survives the pause; no hidden movement is simulated.
 function requestCommit(){if(saving&&saveTask)return saveTask;const task=commit();if(!saving)return task;saveTask=task;const release=()=>{if(saveTask===task)saveTask=null;};void task.then(release,release);return task;}
 async function flushPending(){if(disposed)return false;if(saveTask)await saveTask;if(pending)await requestCommit();return !disposed&&!pending&&!saving;}
 // Every map renders this refresh, even while a construction controller owns
 // movement. Completed evidence must outlive the coast scenery; use a fresh
 // draft and the normal authority queue rather than retaining the old world.
 return{flushPending,get autoSaveKey(){return saveRevision;},refreshVisibility(){if(disposed)return;const c=context();visibility();if(pausedFor(c))tracker.update(0,{...c,paused:true},[]);else if(pending)void requestCommit();},update(dt){if(disposed)return;const c=context(),paused=pausedFor(c);
   if(!paused)clock+=Math.max(0,Math.min(.1,dt));
   note.hidden=paused||c.map!=='coast'||clock>=expires;
   const v=view();if(!v){tracker.reset();latest=null;if(pending&&!paused)void requestCommit();return;}
   const first=v.model.stones[0],p=c.position,nearEntry=c.map==='coast'&&p&&first&&Math.abs(p.x-first.x)<85&&p.z>=first.z-82&&p.z<=first.z-25;
   if(!nearEntry)entryShown=false;
   if(nearEntry&&!entryShown&&!paused){entryShown=true;const saved=best();say(saved<Infinity?'潮の洞窟 · 自己ベスト '+caveTime(saved):'浮き石を渡って、奥の結晶へ',5);}
   const contact=!paused&&c.grounded&&!c.riding&&tracker.running&&tracker.visited===v.model.stones.length&&caveExitNearby(p)?groundContact():null;
   const wasRunning=tracker.running,run=tracker.update(dt,{...c,groundContact:contact,paused},v.model.stones);
   if(c.map!=='coast'||tracker.armed){latest=null;tick=-1;pace='';paceRecord=null;paceStone=0;}
   if(tracker.running&&!paused){
    if(!wasRunning){latest=null;tick=-1;paceRecord=benchmark();pace='';paceStone=0;}
    if(tracker.visited!==paceStone){paceStone=tracker.visited;pace=cavePace(tracker.lastSplit,tracker.visited-2,paceRecord);paceUntil=clock+2.4;tick=-1;}
    if(pace&&clock>=paceUntil){pace='';tick=-1;}
    const now=Math.floor(tracker.elapsed/100),saved=paceRecord?.bestMs??Infinity;
    if(now!==tick||!wasRunning){tick=now;say('浮き石 '+tracker.visited+'/'+v.model.stones.length+' · '+caveTime(now*100)+(pace?'\n'+pace:saved<Infinity?' · ベスト '+caveTime(saved):''),Infinity,'off');}
   }else if(wasRunning&&!run&&!tracker.armed&&!paused&&c.map==='coast'&&!c.riding)say('もう一度なら、入口の石から。',4);
   // Keep only the finish evidence. A retry captures the CURRENT world, so a
   // late save never rewinds the walking player or replaces a newer boat pose.
   if(run){celebrateUntil=clock+6;const previousBest=Math.min(best(),pending?.milliseconds??Infinity),finished={milliseconds:run.milliseconds,finish:{...run.finish},splitsMs:run.splitsMs.slice()};latest={run:finished,previousBest};if(needsSave(finished)&&(!pending||run.milliseconds<pending.milliseconds)){pending=finished;saveRevision++;}result();}
   // The actual stone contacts drive the scene feedback. No separate buttons,
   // course numbers or persistent progress; returning to the entrance rearms it.
   v.crossing?.({visited:tracker.visited,running:tracker.running,armed:tracker.armed,complete:clock<celebrateUntil&&!tracker.armed&&!tracker.running});
   if(pending&&!paused)void requestCommit();
  },get pending(){return !!pending||saving;},get tracker(){return tracker;},dispose(){disposed=true;tracker.reset();note.remove();}};
}
