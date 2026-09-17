// Disposable prediction only: the authoritative state, saves and soil ledger
// are never modified. Use this module in a worker; the controller owns timeout.
import {beginOneTouch,stepOneTouch} from './imasora-construction-excavator-one-touch.js?v=486';
import {BIN,cellCenter,totals} from './imasora-construction-excavator.js';
export const EXCAVATION_PREVIEW_MAX_STEPS=7200;
const DT=1/120,POSITION_KEYS=['x','y','z'],BIN_VISIBLE_LIMIT=200;
const position=p=>Object.fromEntries(POSITION_KEYS.map(k=>[k,p[k]]));
const finitePosition=p=>p&&POSITION_KEYS.every(k=>Number.isFinite(p[k]));
const blank=(kind,work,message,status='unavailable')=>({kind,status,removed:[],deposited:[],remainingLoad:work?.load??0,unsettled:work?.falling?.length??0,message,steps:0});
const pending=r=>!!(r.sequence||r.work.action||r.work.guide||r.work.falling.length);
function changes(before,after){
  const removed=[],deposited=[],remainingSpoil=new Set(after.spoil.map(p=>p.id)),oldSpoil=new Set(before.spoil.map(p=>p.id));
  for(const [id,cell] of Object.entries(before.terrain))if(!Object.hasOwn(after.terrain,id))removed.push({kind:'terrain',id,position:cellCenter(cell)});
  for(const p of before.spoil)if(!remainingSpoil.has(p.id))removed.push({kind:'spoil',id:p.id,position:position(p)});
  for(const p of after.spoil)if(!oldSpoil.has(p.id))deposited.push({kind:'spoil',id:p.id,position:position(p),size:{x:7.8,y:7.8,z:7.8}});
  // Match the actual bin mesh's grid and its 200-instance display limit.
  for(let i=before.bin;i<Math.min(after.bin,BIN_VISIBLE_LIMIT);i++)deposited.push({kind:'bin',id:`bin:${i}`,position:{x:BIN.x+(i%7-3)*7,y:5+Math.floor(i/35)*5,z:BIN.z+(Math.floor(i/7)%5-2)*7},size:{x:6.5,y:5,z:6.5}});
  return {removed,deposited,hiddenBin:Math.max(0,after.bin-Math.max(before.bin,BIN_VISIBLE_LIMIT))};
}
export function predictExcavation(work,kind,{maxSteps=EXCAVATION_PREVIEW_MAX_STEPS}={}){
  if(!['scoop','dump'].includes(kind))return blank(kind,work,'予測する操作を確認できません。');
  if(!Number.isInteger(maxSteps)||maxSteps<0)return blank(kind,work,'予測の計算上限を確認できません。');
  let before;
  try{before=structuredClone(work);}catch{return blank(kind,null,'作業状態を安全に複製できないため予測を表示できません。');}
  if(!before?.loader||!before.arm||!['boom','stick','curl','slew'].every(k=>Number.isFinite(before.arm[k]))||!before.terrain||typeof before.terrain!=='object'||!Array.isArray(before.spoil)||!Array.isArray(before.falling)||!Number.isInteger(before.load)||before.load<0||before.load>6||!Number.isInteger(before.bin)||before.bin<0||before.bin>1792)return blank(kind,before,'予測に必要な作業状態を確認できません。');
  if(Object.keys(before.terrain).length+before.spoil.length+before.falling.length+before.bin+before.load>1792)return blank(kind,before,'予測する土の数量が作業区画の上限を越えています。');
  if(before.loader.mode!=='working'||before.loader.transition||before.action||before.guide)return blank(kind,before,'操作が終わってから、作業モードで予測します。');
  if(kind==='scoop'&&before.load)return blank(kind,before,'土を持っています。「こぼす」の予測を確認してください。');
  if(kind==='dump'&&!before.load)return blank(kind,before,'こぼす土を持っていません。');
  const limit=Math.min(maxSteps,EXCAVATION_PREVIEW_MAX_STEPS),total=totals(before).total;
  let r,steps=0,error='';
  try{
    r=beginOneTouch(structuredClone(before),kind);
    while(pending(r)&&steps<limit){r=stepOneTouch(r.work,r.sequence,{},DT);steps++;}
  }catch(cause){error=cause instanceof Error?cause.message:String(cause);}
  if(!r)return blank(kind,before,`予測を開始できませんでした。${error}`);
  if(totals(r.work).total!==total)return {...blank(kind,before,'予測内の土の数量が一致しないため、結果を表示しません。'),steps};
  const {removed,deposited,hiddenBin}=changes(before,r.work);
  if([...removed,...deposited].some(p=>!finitePosition(p.position)))return {...blank(kind,before,'予測した位置を確認できないため、結果を表示しません。'),steps};
  const unfinished=!!error||pending(r),status=unfinished||hiddenBin?'partial':'ready';
  let message=r.work.message||'現在の姿勢からの操作結果を予測しました。';
  if(error)message=`予測の途中で計算を停止しました。表示は確定した部分だけです。${error}`;
  else if(unfinished)message=`予測の計算上限に達しました。未完了の操作・落下土を完成予想として表示していません。${message}`;
  if(hiddenBin)message+=` 受け箱は200個までの表示です。増える土のうち${hiddenBin}個は予測図に表示していません。`;
  return {kind,status,removed,deposited,remainingLoad:r.work.load,unsettled:r.work.falling.length,message,steps};
}
