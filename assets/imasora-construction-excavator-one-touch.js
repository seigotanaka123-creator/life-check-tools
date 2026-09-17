// Command assistance only. Physical states/checkpoints remain the existing v3.
import {stepWorldExcavation,actWorldExcavation} from './imasora-construction-world-excavation.js';
import {armIntersections,moveArm} from './imasora-construction-excavator.js';
import {stepSpoilRecovery} from './imasora-construction-excavator-recovery.js';
import {excavationCheckpoint} from './imasora-construction-excavator-save.js';
export const DIG_READY=Object.freeze({boom:74*Math.PI/180,stick:-Math.PI/6,curl:-1.25});
export const DIG_LOWER=33*Math.PI/180;
export const DIG_CLOSE=24*Math.PI/180;
const speed={boom:.5,stick:.65,curl:.75};
// Empty-bucket return clears the pile by opening and extending before lifting.
const ready=[['curl',DIG_READY.curl,'バケットを開いています。'],['stick',DIG_READY.stick,'アームを−30°へ戻しています。'],['boom',DIG_READY.boom,'基本姿勢へブームを上げています。']];
// This queue is deliberately absent from v3 checkpoints. Limits use simulation
// time, so pausing a tab never consumes an operation's remaining movement time.
export const ONE_TOUCH_LIMITS=Object.freeze({total:45,phase:12,idle:1.25});
const loadedClear=[['stick',DIG_READY.stick,'土を保持してアームを伸ばし、排土の余地を作っています。'],['boom',DIG_READY.boom,'土を保持して持ち上げ、残りの排土を再開します。']];
const phases=new Set(['dump-clear','prepare','return','recover','lower','draw','cut','dump','close','lift']);
const phaseKey=q=>`${q.phase}:${q.index??''}`;
const validSequence=q=>q&&typeof q==='object'&&phases.has(q.phase)&&
  (q.phase!=='dump-clear'||Number.isInteger(q.index)&&q.index>=0&&q.index<2)&&
  (!['prepare','return','recover'].includes(q.phase)||(Number.isInteger(q.index)&&q.index>=0&&q.index<ready.length))&&
  (q.phase!=='recover'||['prepare','return'].includes(q.resumePhase));
const finiteArm=arm=>arm&&['boom','stick','curl','slew'].every(k=>Number.isFinite(arm[k]));
const validGuard=g=>!g||(typeof g.key==='string'&&['elapsed','phaseElapsed','idleElapsed'].every(k=>Number.isFinite(g[k])&&g[k]>=0));
// Only the new integration ledger stores this continuation. Legacy v3 remains unchanged.
export function oneTouchCheckpoint(work,sequence){
  const state=excavationCheckpoint(work);
  if(sequence===null)return {work:state,sequence:null};
  const q=sequence,check=(value)=>{if(!value)throw Error('一連の操作の保存内容が不正です。');};
  check(validSequence(q)&&validGuard(q.guard)&&state.loader.mode==='working');
  check(Object.keys(q).every(k=>['phase','index','haul','resumePhase','cutHit','guard','cursor','recoveries','dumpRetries'].includes(k)));
  check(q.haul===undefined||typeof q.haul==='boolean');
  check(q.cutHit===undefined||(typeof q.cutHit==='string'&&q.cutHit.length<=200));
  check(q.resumePhase===undefined||['prepare','return'].includes(q.resumePhase));
  check(q.index===undefined||(Number.isInteger(q.index)&&q.index>=0&&q.index<=2));
  check(q.recoveries===undefined||(Number.isInteger(q.recoveries)&&q.recoveries>=0&&q.recoveries<=3));
  check(q.dumpRetries===undefined||(Number.isInteger(q.dumpRetries)&&q.dumpRetries>=0&&q.dumpRetries<=1));
  check(q.phase==='cut'?state.action?.kind==='scoop':q.phase==='dump'?state.action?.kind==='dump':!state.action);
  if(q.guard)check(q.guard.key===phaseKey(q)&&q.guard.elapsed<=46&&q.guard.phaseElapsed<=13&&q.guard.idleElapsed<=2);
  const saved={};for(const key of ['phase','index','haul','resumePhase','cutHit','guard','recoveries','dumpRetries'])if(q[key]!==undefined)saved[key]=structuredClone(q[key]);
  // Recovery search candidates are disposable; elapsed limits survive their reconstruction.
  return {work:state,sequence:saved};
}
function abortSequence(work,reason){return {work:{...work,action:null,guide:null,message:`${reason}ため自動操作を停止しました。現在の姿勢と土は保持しています。手動操作または「すくう」で再開できます。`},sequence:null};}
function progressed(a,b){
  return ['boom','stick','curl','slew'].some(k=>Math.abs(a.arm[k]-b.arm[k])>1e-9)||a.load!==b.load||
    a.action?.kind!==b.action?.kind||a.action?.elapsed!==b.action?.elapsed||a.action?.loadedLift!==b.action?.loadedLift;
}
export function readyExcavation(s){return {...s,arm:{...s.arm,...DIG_READY},message:'「すくう」1回で基本姿勢→ブーム33°→アーム寄せ→すくい込み→バケットを24°まで閉じる→ブーム74°へ持上げ。排土後は基本姿勢へ戻ります。'};}
export function limitedDigInput(s,input,dt){
  // An old v3 may legitimately contain a more extended arm. Never snap it;
  // allow retracting from that pose, but refuse further extension.
  if(!(input.stick>0))return input;
  if(!(dt>0))return {...input,stick:0};
  return {...input,stick:Math.min(input.stick,Math.max(0,(DIG_READY.stick-s.arm.stick)/(.65*dt)))};
}
export function allowedDigGuide(guide){return !guide?.path||guide.path.every(n=>n.stick<=DIG_READY.stick+1e-8);}
export function beginOneTouch(work,kind){
  if(!['scoop','haul','dump'].includes(kind))return abortSequence(work,'操作の種類を確認できない');
  if(work.loader.mode!=='working'||work.action)return {work,sequence:null};
  if(kind==='dump')return {work:actWorldExcavation(work,'dump'),sequence:work.load?{phase:'dump'}:null};
  if(work.load)return {work:{...work,message:'先に「こぼす」で土を降ろしてください。'},sequence:null};
  return {work:{...work,guide:null,hit:'',message:'基本姿勢から、一連のすくい動作を始めます。'},sequence:{phase:'prepare',index:0,haul:kind==='haul'}};
}
export function stopOneTouch(work){return {...work,action:null,guide:null,hit:'',message:'一連の操作を止めました。現在の姿勢と土は保持しています。'};}
const result=(work,sequence)=>({work,sequence});
function finishCut(work,sequence){
  // The one-touch order has a distinct close phase. The boom lift is allowed
  // only after that phase has completed, so the two hydraulic movements never
  // overlap. Keep the actual pose and load from the physical scoop.
  const message='バケットを24°表示まで閉じました。ブームを74°まで上げています。';
  return result({...work,hit:'',message},{...sequence,phase:'lift',cutHit:sequence.cutHit??work.hit});
}
function finishLift(work,sequence){
  if(sequence.haul&&work.load)return result({...work,hit:'',guide:{phase:'plan-haul'},message:'すくった土を受け箱へ運ぶ経路を確認します。'},null);
  if(!work.load&&/^(土:|排土:)/.test(sequence.cutHit))return result({...work,message:'土の山にバケットが当たってすくえなかったため、ブームを74°へ戻しました。車両の位置・向きを調整してください。'},null);
  return result({...work,message:work.load?`${work.load}個の土を保持し、ブームを74°まで上げました。`:'ブームを74°へ戻しました。爪が土に届きませんでした。車両の位置・向きを調整してください。'},null);
}
function bucketClearance(work,dt,message){
  if(!/^(土:|排土:)/.test(work.hit)||work.arm.stick>=DIG_READY.stick-1e-8)return null;
  const next=moveArm(work,limitedDigInput(work,{stick:1},dt),dt);
  return next.hit?null:{...next,message};
}
function stepActiveOneTouch(work,sequence,dt){
  if(sequence.phase==='recover'){
    if(work.action||work.guide)return abortSequence(work,'退避と別の動作が重なった');
    const recovered=stepSpoilRecovery(stepWorldExcavation(work,{},dt),sequence.cursor??null,dt);
    if(recovered.blocked)return abortSequence(recovered.work,'排土との接触を減らす退避経路が見つからない');
    if(recovered.done){const {resumePhase,cursor,...rest}=sequence;return result(recovered.work,{...rest,phase:resumePhase});}
    return result(recovered.work,{...sequence,cursor:recovered.cursor});
  }
  if(sequence.phase==='cut'||sequence.phase==='dump'){
    if(work.action?.kind!==(sequence.phase==='cut'?'scoop':'dump'))return abortSequence(work,'予定していた掘削・排土動作が見つからない');
    if(!Number.isFinite(work.action.elapsed)||!Number.isFinite(work.action.duration)||work.action.duration<=0)return abortSequence(work,'掘削・排土動作の進行を確認できない');
    const next=stepWorldExcavation(work,{},dt);
    if(next.action)return result(next,sequence);
    if(sequence.phase==='dump'){
      if(next.load&&/^(土:|排土:)/.test(next.hit)&&(sequence.dumpRetries??0)<1)return result(next,{...sequence,phase:'dump-clear',index:0,dumpRetries:1});
      return result(next,!next.load?{...sequence,phase:'return',index:0}:null);
    }
    if(next.hit)return result({...next,hit:'',message:'すくい込みを終え、バケットを24°まで閉じています。'},{...sequence,phase:'close',cutHit:next.hit});
    return result({...next,message:'すくい込みを終え、バケットを24°まで閉じています。'},{...sequence,phase:'close'});
  }
  if(work.action||work.guide)return abortSequence(work,'別の動作と自動操作が重なった');
  if(['prepare','return'].includes(sequence.phase)&&work.spoil.length){
    const hits=[...armIntersections(work)];
    if(hits.length&&hits.every(hit=>hit.startsWith('排土:'))){
      if((sequence.recoveries??0)>=3)return abortSequence(work,'排土との接触が繰り返された');
      return result(work,{...sequence,phase:'recover',resumePhase:sequence.phase,cursor:null,recoveries:(sequence.recoveries??0)+1});
    }
  }
  let command;
  if(sequence.phase==='dump-clear')command=loadedClear[sequence.index];
  else if(sequence.phase==='prepare'||sequence.phase==='return')command=ready[sequence.index];
  else if(sequence.phase==='lower')command=['boom',DIG_LOWER,'ブームを33°まで下げています。'];
  else if(sequence.phase==='draw')command=['stick',-2.55,'物体に触れるまでアームを寄せています。'];
  else if(sequence.phase==='lift')command=['boom',DIG_READY.boom,work.load?'すくった土を保持し、ブームを74°まで上げています。':'ブームを74°まで上げています。'];
  else command=['curl',DIG_CLOSE,'バケットを24°まで閉じています。'];
  const [axis,target,message]=command,delta=target-work.arm[axis];
  const next=stepWorldExcavation(work,{[axis]:Math.sign(delta)*Math.min(1,Math.abs(delta)/(speed[axis]*dt))},dt);
  const reached=Math.abs(next.arm[axis]-target)<1e-8;
  if(next.hit){
    if(sequence.phase==='draw'||sequence.phase==='lower'){
      // Soil contact is the hand-off to the existing swept-tooth scoop.
      if(next.hit.startsWith('土:')||next.hit.startsWith('排土:'))return startCut({...next,hit:''},sequence);
    }
    if(sequence.phase==='close'){
      // The existing physical arm stop is about 23.7 degrees, shown as 24 in
      // the control panel. Do not disable it or snap through the attachment.
      if(next.hit==='バケットとアーム'&&Math.round(next.arm.curl*180/Math.PI)===24)return finishCut(next,sequence);
      // A full bucket cannot cut more soil. Make a little room with the stick
      // while holding the boom, then retry closing on the next bounded frame.
      // moveArm applies the same swept collisions without advancing time twice.
      const clearance=bucketClearance(next,dt,'ブームを保ち、アームで余地を作ってバケットを24°まで閉じています。');
      if(clearance)return result(clearance,sequence);
      return result({...next,message:`${next.hit}に接触し、バケットが24°まで閉じないため停止しました。現在の姿勢と土は保持しています。`},null);
    }
    if(sequence.phase==='return'&&sequence.index===0&&!next.load){
      const clearance=bucketClearance(next,dt,'排土を終え、アームで余地を作ってバケットを開いています。');
      if(clearance)return result(clearance,sequence);
    }
    if(sequence.phase==='return'&&sequence.index===1&&!next.load&&/^(土:|排土:)/.test(next.hit)&&next.arm.boom<DIG_READY.boom-1e-8){
      // After a stopped low dump, the open bucket can catch the far bank while
      // extending. Empty-bucket return may lift just enough to clear that bank.
      const raised=moveArm(next,{boom:Math.min(1,(DIG_READY.boom-next.arm.boom)/(speed.boom*dt))},dt);
      if(!raised.hit)return result({...raised,message:'空のバケットを土から離し、基本姿勢へ戻しています。'},sequence);
    }
    return result({...next,message:`${next.hit}に接触したため自動操作を停止しました。現在の姿勢と土は保持しています。`},null);
  }
  if(!reached)return result({...next,message},sequence);
  if(sequence.phase==='dump-clear'){
    if(sequence.index===0)return result(next,{...sequence,index:1});
    const dumping=actWorldExcavation(next,'dump');return result(dumping,dumping.action?{...sequence,phase:'dump'}:null);
  }
  if(sequence.phase==='prepare'||sequence.phase==='return'){
    if(sequence.index<2)return result(next,{...sequence,index:sequence.index+1});
    return sequence.phase==='return'?result({...next,message:'排土を終え、基本姿勢（根元74°・アーム−30°・バケット−72°）へ戻りました。'},null):result(next,{...sequence,phase:'lower'});
  }
  if(sequence.phase==='lower')return result(next,{...sequence,phase:'draw'});
  if(sequence.phase==='draw')return startCut(next,sequence);
  if(sequence.phase==='lift')return finishLift(next,sequence);
  return finishCut(next,sequence);
}
function startCut(work,sequence){
  const next=actWorldExcavation(work,'scoop');
  if(next.action?.kind==='scoop')return result({...next,action:{...next.action,oneTouch:true}},{...sequence,phase:'cut'});
  return result({...next,message:'すくい込みを終え、バケットを24°まで閉じています。'},{...sequence,phase:'close'});
}
export function stepOneTouch(work,sequence,input,dt){
  if(!Number.isFinite(dt)||dt<0)return abortSequence(work,'更新時間を確認できない');
  if(sequence&&(!validSequence(sequence)||!validGuard(sequence.guard)||!finiteArm(work.arm)))return abortSequence(work,'自動操作の段階・姿勢を確認できない');
  if(sequence&&work.loader.mode!=='working')return abortSequence(work,'作業モードを離れた');
  if(dt===0)return result(work,sequence);
  // The physics step accepts at most 50 ms; a delayed frame must not advance
  // an unbounded amount of mechanical work inside this call.
  dt=Math.min(dt,.05);
  if(!sequence){
    if(!allowedDigGuide(work.guide))return result({...work,guide:null,message:'アーム−30°の制限を越える運搬経路のため停止しました。土は保持しています。'},null);
    const next=stepWorldExcavation(work,limitedDigInput(work,input,dt),dt);
    const dumped=(work.action?.kind==='dump'||work.guide?.phase==='dump')&&!next.action&&!next.load&&(!next.guide||next.guide.phase==='dump');
    // Released soil can rest on the bucket. Waiting for every particle to land
    // before lifting the arm creates a circular wait; let return move it first.
    return result(dumped?{...next,guide:null}:next,dumped?{phase:'return',index:0}:null);
  }
  const key=phaseKey(sequence),old=sequence.guard,guard={key,elapsed:old?.elapsed??0,
    phaseElapsed:old?.key===key?old.phaseElapsed:0,idleElapsed:old?.key===key?old.idleElapsed:0};
  if(guard.elapsed>=ONE_TOUCH_LIMITS.total||guard.phaseElapsed>=ONE_TOUCH_LIMITS.phase)return abortSequence(work,'自動操作の制限時間に達した');
  if(guard.idleElapsed>=ONE_TOUCH_LIMITS.idle)return abortSequence(work,'姿勢や動作が進まない状態が続いた');
  const next=stepActiveOneTouch(work,sequence,dt);
  if(!next.sequence)return next;
  const nextKey=phaseKey(next.sequence),changed=key!==nextKey;
  next.sequence={...next.sequence,guard:{key:nextKey,elapsed:guard.elapsed+dt,
    phaseElapsed:changed?0:guard.phaseElapsed+dt,idleElapsed:changed||progressed(work,next.work)||sequence.cursor?.probes!==next.sequence.cursor?.probes?0:guard.idleElapsed+dt}};
  return next;
}

