import {planWaterBuild,waterBuildNearest,waterBuildLevel,waterBuildTerrainFits} from './imasora-construction-water-build.mjs?v=120fb';
import {fieldWaterTotal,fieldWaterTarget,nearbyFieldPool,poolKey,validateFieldPools} from './imasora-construction-field-water.mjs?v=120fb';
import {flowFieldWater,FIELD_WATER_TICK} from './imasora-construction-field-water-flow.mjs?v=120fb';
import {inWorkArea,sharedSupply,assertVehicleField,workArea} from './imasora-construction-field-area.mjs?v=120ey';
// 5-2b: closed water bucket, positional docking, finite transfers. No game wallet.
import {initialLoaderState,stepLoader,actLoader,vehicleBlocker,walkingClear,approach,localToWorld,transitionPoints} from './imasora-construction-loader-physics.js?v=120ey';
import {waterWorkFrame,waterBucketPoint,waterFallTime,waterFallPrediction,waterParcelPoint,fieldWaterPathClear,waterTransferPathClear} from './imasora-construction-water-ground.mjs?v=120ey';
import {initialWater,advanceWater,waterAction,waterTotal,validateWater} from './imasora-construction-water.js';
export const TRANSPORT={scope:'mars-water-transport-development-v1',total:768,capacity:128,dt:1/120,rate:80}; // .25 L units; 20 L/s
export const SOURCE_PORT=Object.freeze({x:-130,y:9,z:-12});
export const RETURN_PORT=Object.freeze({x:57,y:9,z:0});
export const CATCHER=Object.freeze({minX:27,maxX:87,minZ:-18,maxZ:12,y:1});
export const TRANSPORT_OBSTACLES=Object.freeze([
  {id:'給水槽',x:-130,z:20,width:72,depth:54,height:58},
  {id:'観察水路の土台',x:168,z:120,width:278,depth:212,height:112}
]);
export function waterSourcePort(s){const p=sharedSupply(s.loader.vehicle,'water-supply');return p?{x:p.x,y:9,z:p.z-32}:SOURCE_PORT;}
export function waterTransportObstacles(s){const p=sharedSupply(s.loader.vehicle,'water-supply');return p?[{...TRANSPORT_OBSTACLES[0],x:p.x,z:p.z},TRANSPORT_OBSTACLES[1]]:TRANSPORT_OBSTACLES;}
const validExternalVolume=b=>b&&[b.x,b.y,b.z,b.w,b.h,b.d,b.angle??0].every(Number.isFinite)&&b.w>0&&b.h>0&&b.d>0;
export function transportMaterialObstacles(loader,external=[]){
  const v=loader.vehicle;
  return external.filter(b=>validExternalVolume(b)&&[v,...(v.field?[loader.player]:[])].some(p=>Math.abs(b.x-p.x)<175+Math.hypot(b.w,b.d)/2&&Math.abs(b.z-p.z)<175+Math.hypot(b.w,b.d)/2)&&b.y<54&&b.y+b.h>8)
    .map(b=>({id:b.name||'建材',x:b.x,z:b.z,width:b.w,depth:b.d,height:b.y+b.h,minY:b.y,angle:b.angle||0}));
}
export function initialTransport(){const loader=initialLoaderState();loader.vehicle.x=-130;loader.vehicle.z=-110;loader.player={x:-188,y:0,z:-118,heading:0};const water=initialWater();water.reservoir=0;return{schema:1,scope:TRANSPORT.scope,revision:0,time:0,phase:0,paused:false,loader,bucket:{lift:0,tilt:0},source:768,load:0,water,air:[],sequence:0,task:null,direction:4,delivered:0,message:'運転席に乗り、正面の給水槽へ少し前進。停車したら「汲み取る」です。'};}
export function upgradeWaterTruck(s){if(s.loader.vehicle.waterTruck)return s;const loader={...s.loader,vehicle:{...s.loader.vehicle,waterTruck:true}};if(loader.transition){const t=loader.transition;loader.transition={...t,path:transitionPoints(loader.vehicle,t.side??-1,loader.mode==='boarding')};}return{...s,loader};}
 const plans=new WeakMap();
 function buildPlan(s,p,external,heightAt){
  if(!s.loader.vehicle.field||!s.loader.vehicle.waterTruck)return null;
  if(s.task?.type==='build'){const b=s.waterBuilds?.find(b=>b.id===s.task.build);return b?{ok:true,build:b,remaining:b.capacity-b.q}:null;}
  if(s.loader.mode!=='driving'||s.loader.transition||Math.abs(s.loader.vehicle.speed)>=.8)return{ok:false,message:'停車すると、水を置ける場所が見えるよ。'};
  const basin=s.waterMode==='basin',snap=basin?Math.floor:Math.round,size=basin?2:8,v=s.loader.vehicle;
  const key=[s.waterMode??'block',snap(p.x/size),snap(p.z/size),v.x,v.z,v.heading,heightAt.revision].join('|'),old=plans.get(heightAt);
  if(heightAt.revision!==undefined&&old?.key===key&&old.builds===s.waterBuilds&&old.pools===s.pools&&old.external===external)return old.plan;
  const plan=planWaterBuild(s,p,external,heightAt);if(heightAt.revision!==undefined)plans.set(heightAt,{key,builds:s.waterBuilds,pools:s.pools,external,plan});return plan;
 }
 export const waterNozzle=(s,heightAt)=>waterBucketPoint(s,s.bucket,waterWorkFrame(s,heightAt));
const hoseTargets=new WeakMap();
export function waterBuildHoseTarget(b,no,external,heightAt){
 if(!b)return null;const level=waterBuildLevel(b),key=[no.x,no.y,no.z,level,heightAt.revision].join('|'),old=hoseTargets.get(b.cells);
 if(heightAt.revision!==undefined&&old?.key===key&&old.external===external&&old.sampler===heightAt)return old.target;
 const candidates=[b.cells[0],...b.cells.slice(1).sort((a,c)=>Math.hypot(a.x-no.x,a.z-no.z)-Math.hypot(c.x-no.x,c.z-no.z))];let target=null;
 for(const cell of candidates){const to={x:cell.x,y:Math.max(cell.y+.15,level),z:cell.z};if(Math.hypot(to.x-no.x,to.z-no.z)<=56&&waterTransferPathClear({type:'source',from:no,to,duration:.35},external,heightAt)){target=to;break;}}
 if(heightAt.revision!==undefined)hoseTargets.set(b.cells,{key,external,sampler:heightAt,target});return target;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function pourPrediction(s,heightAt=()=>0){return waterFallPrediction(s,waterWorkFrame(s,heightAt),heightAt);}
const catches=p=>p.x>=CATCHER.minX+1&&p.x<=CATCHER.maxX-1&&p.z>=CATCHER.minZ+1&&p.z<=CATCHER.maxZ-1;
export function transportAvailability(s,external=[],heightAt=()=>0){
 const stopped=s.loader.mode==='driving'&&!s.loader.transition&&Math.abs(s.loader.vehicle.speed)<.8,idle=!s.task&&!s.air.length;
 let g=null,workIssue='';try{g=waterWorkFrame(s,heightAt);}catch(e){workIssue=e.message;}
 const point=waterBucketPoint(s,{lift:0,tilt:0},g),sourceDistance=distance(point,waterSourcePort(s)),returnDistance=distance(point,RETURN_PORT);
 let pour,pourIssue='';try{pour=waterFallPrediction(s,g,heightAt);}catch(e){pourIssue=e.message;pour=waterFallPrediction(s,null);}
 const volumes=[...external,...waterTransportObstacles(s).map(b=>({x:b.x,z:b.z,y:0,w:b.width,d:b.depth,h:b.height}))];
 // A raised surface at the old catch-basin X/Z is ground, not the basin below it.
 const atCatcher=!pourIssue&&catches(pour.to)&&(!s.loader.vehicle.field||Math.abs(heightAt(pour.to.x,pour.to.z))<.05);
 let fieldTarget=!workIssue&&!pourIssue&&!atCatcher?fieldWaterTarget(s,pour.to,volumes,heightAt):null;
 if(fieldTarget){const candidate={from:pour.from,to:fieldTarget,duration:waterFallTime(pour.from.y,fieldTarget.y,pour.vy)};
  if(fieldWaterPathClear(candidate,volumes,heightAt)){pour={...pour,...candidate};}else fieldTarget=null;
 }
 const plan=!workIssue&&!pourIssue&&!atCatcher&&s.loader.vehicle.field?buildPlan(s,pour.to,external,heightAt):null;
 let buildPool=waterBuildNearest(s,point);
 const supported=!workIssue,nozzle=waterBucketPoint(s,s.bucket,g),pool=supported?nearbyFieldPool(s,point):null;
 const hoseClear=from=>!s.loader.vehicle.field||waterTransferPathClear({type:'source',from,to:point,duration:.35},external,heightAt);
 if(buildPool&&!waterBuildHoseTarget(buildPool.b,point,external,heightAt))buildPool=null;
 const pathOK=!plan?.build||!!waterBuildHoseTarget(plan.build,point,external,heightAt);
 return{stopped,idle,plan,buildPool,workIssue,pourIssue,nozzle,sourceDistance,returnDistance,pour,fieldTarget,pool,source:supported&&stopped&&idle&&sourceDistance<=28&&hoseClear(waterSourcePort(s))&&s.load<128&&s.source>0,unload:supported&&stopped&&idle&&sourceDistance<=28&&hoseClear(waterSourcePort(s))&&s.load>0,returned:supported&&stopped&&idle&&s.load<128&&(returnDistance<=28&&waterTotal(s.water)>0&&hoseClear(RETURN_PORT)||!!pool&&hoseClear(pool[1])||!!buildPool),pourable:supported&&!pourIssue&&stopped&&idle&&(atCatcher||(plan?plan.ok&&pathOK:!!fieldTarget))&&s.load>0,nearReturn:supported&&returnDistance<65};
}
export function transportAction(state,action,value,external=[],heightAt=()=>0){
  let s=structuredClone(state),a=transportAvailability(s,external,heightAt);
  if(action==='pause'){s.paused=!s.paused;s.message=s.paused?'実験を一時停止しました。':'実験を再開しました。';}
  else if(action==='home'){s.task=null;s.loader=actLoader(s.loader,'home',waterTransportObstacles(s));s.message='レンを安全エリアへ戻しました。車と水はその場所に残ります。';}
  else if(action==='interact'){if(s.task||s.air.length){s.message='水の移送が終わってから乗り降りしてください。';}else{s.loader=actLoader(s.loader,'interact',[...waterTransportObstacles(s),...transportMaterialObstacles(s.loader,external)]);s.message=s.loader.message;}}
  else if(action==='stop'){s.task=null;s.message='新しい移送を止めました。ホース内・落下中の水は行き先へ届いてから走行できます。';}
  else if(action==='water-mode'){if(!['block','basin'].includes(value))throw Error('水の置き方を選ぼう。');if(s.task||s.air.length)s.message='注水が終わってから選ぼう。';else{s.waterMode=value;s.message=value==='block'?'土と同じ大きさの水ブロック。隣につなぐと間の枠が消えるよ。':'穴の縁まで水をためるよ。必要な量は注ぐ前にわかるよ。';}}
  else if(action==='direction'){if(![1,2,4,8,16,32].includes(value))throw Error('6方向から選んでください。');if(s.task||s.air.length){s.message='注水が終わってから、次に注ぐ水の向きを選んでください。';}else{s.direction=value;s.message='次に注ぐ水の向きを選びました。離れた水路の水は変更しません。';}}
  else if(action==='flow'||action==='recover'){
    if(!a.stopped||!a.idle||!a.nearReturn)s.message='水路側の受け口付近で停車して操作してください。';
    else if(action==='recover'){s.water=waterAction(s.water,'recover');s.message='水路の水を同じ量だけ回収槽へ戻しました。「回収槽から汲む」で再利用できます。';}
    else{s.water.running=!s.water.running;s.water.feeding=s.water.running;s.message=s.water.running?'水路の流れを再開しました。':'水路の流れを止めました。';}
  }else if(['source','returned','pour','unload'].includes(action)){
    const available=action==='pour'?a.pourable:a[action];
    if(!available)s.message=a.workIssue||(action==='pour'?(a.plan?.message||a.pourIssue):'')||(!a.stopped?'停車してから作業してください。':!a.idle?'今の移送を終えるか、止めてください。':action==='pour'?(s.load?'青い丸が出る地面や受け口に合わせてね。':'車載タンクに水がありません。'):s.load>=128?'車載タンクは満水です。':`汲み取り口へ車載タンクを近づけてください。${action==='source'&&!s.source?'給水槽は空です。':''}`);
    else if(action==='pour'&&a.plan?.ok){const b=a.plan.build;s.waterBuilds??=[];if(!s.waterBuilds.some(v=>v.id===b.id)){if(s.waterBuilds.length>=192||s.waterBuilds.reduce((n,b)=>n+b.cells.length,0)+b.cells.length>4096){s.message='水が多くなったよ。使わない水を回収しよう。';s.revision++;return s;}s.waterBuilds.push(structuredClone(b));}s.task={type:'build',build:b.id,elapsed:0,clock:0};s.message='水を注いでいます。水位が上がる様子を見てね。';}
    else if(action==='returned'&&a.buildPool){s.task={type:'build-return',build:a.buildPool.b.id,elapsed:0,clock:0};s.message='ホースで水を回収しています。';}
    else{const type=action==='pour'&&a.fieldTarget?'field':action==='returned'&&a.pool?'field-return':action;
      if(type==='returned'){s.water=waterAction(s.water,'recover');}if(type==='pour'){s.water=waterAction(s.water,'direction',{region:'rise',dir:s.direction});}s.task={type,elapsed:0,clock:0,...(type==='field'?{target:a.fieldTarget}:type==='field-return'?{pool:a.pool[0]}:{})};s.message=action==='pour'?'青い丸へ水を注いでいます。注いだ水は、近づいて回収できるよ。':action==='unload'?'車載タンクからホースを通して給水槽へ戻しています。':'汲み取り中。ホースを通った分だけ車載タンクに入ります。';}
  }else throw Error('不明な操作です。');s.revision++;return s;
}
export function transferTotals(s){const transit=s.air.reduce((n,p)=>n+p.q,0),course=Object.values(s.water.cells).reduce((n,c)=>n+c.q,0);return{source:s.source,bucket:s.load,transit,course,returnTank:s.water.reservoir,field:fieldWaterTotal(s),total:s.source+s.load+transit+waterTotal(s.water)+fieldWaterTotal(s)};}
export function parcelPosition(p){return waterParcelPoint(p,p.elapsed/p.duration);}
export function stepTransport(state,input={},dt=TRANSPORT.dt,external=[],heightAt=()=>0){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です。');if(state.paused)return state;
  
  let s={...state,loader:state.loader,bucket:{...state.bucket},water:state.water,task:state.task?{...state.task}:null,air:state.air.map(p=>({...p})),time:state.time+dt};
  if(Math.floor((s.time+1e-8)/FIELD_WATER_TICK)!==Math.floor((state.time+1e-8)/FIELD_WATER_TICK))s=flowFieldWater(s,[...external,...waterTransportObstacles(s).map(b=>({x:b.x,z:b.z,y:0,w:b.width,d:b.depth,h:b.height}))],heightAt);
  if(s.task?.type==='field-return'&&!s.pools?.[s.task.pool]){
    try{const pool=nearbyFieldPool(s,waterNozzle(s,heightAt));if(pool)s.task={...s.task,pool:pool[0]};}
    catch(e){s.task=null;s.message=e.message;}
  }
  const busy=!!(s.task||s.air.length),obstacles=[...waterTransportObstacles(s),...transportMaterialObstacles(s.loader,external)];s.loader=stepLoader(s.loader,busy?{brake:true}:input,dt,obstacles);
  if(s.loader.mode!==state.loader.mode||s.loader.hit)s.message=s.loader.message;
  const type=s.task?.type,target=['pour','field'].includes(type)?{lift:.8,tilt:.7}:{lift:0,tilt:0};
  s.bucket.lift=approach(s.bucket.lift,target.lift,dt*.42);s.bucket.tilt=approach(s.bucket.tilt,target.tilt,dt*.7);
  const remaining=[];
  for(const p of s.air){p.elapsed=Math.min(p.duration,p.elapsed+dt);if(p.elapsed<p.duration-1e-9){remaining.push(p);continue;}if(p.type==='field'){const pools={...s.pools},k=poolKey(p.to),old=pools[k];pools[k]={...p.to,q:(old?.q??0)+p.q,dir:p.dir};s.pools=pools;s.delivered+=p.q;}else if(p.type==='pour'){s.water={...s.water,reservoir:s.water.reservoir+p.q,running:true,feeding:true};s.delivered+=p.q;}else if(p.type==='unload')s.source+=p.q;else s.load+=p.q;}
  s.air=remaining;
  if(['build','build-return'].includes(s.task?.type)){
   const task=s.task,b=s.waterBuilds.find(b=>b.id===task.build),filling=task.type==='build';task.elapsed+=dt;task.clock+=dt*(filling?16:32);
   const no=waterNozzle(s,heightAt),to=waterBuildHoseTarget(b,no,external,heightAt);
   const safe=b&&to&&(!filling||waterBuildTerrainFits(b,heightAt,external));
   if(!safe){s.task=null;s.message='水の通り道が変わったよ。水は残して止めました。';}
   else{const q=Math.min(Math.floor(task.clock),filling?Math.min(s.load,b.capacity-b.q):Math.min(b.q,128-s.load));
    if(q){s.load+=filling?-q:q;s.waterBuilds=s.waterBuilds.map(v=>v.id===b.id?{...v,q:v.q+(filling?q:-q)}:v).filter(v=>v.q||v.id===b.id&&filling);task.clock-=q;}
    const now=s.waterBuilds.find(v=>v.id===b.id);if(filling?(!s.load||now.q===now.capacity):(!now||s.load===128)){s.task=null;s.message=filling?(now.q===now.capacity?'できたよ！ 水が満タンになりました。':'車の水を使い切ったよ。補給して続きを注げるよ。'):'水を回収したよ！';}
   }
   s.revision++;return s;
  }
  if(s.task){
    s.task.elapsed+=dt;
    const ready=Math.abs(s.bucket.lift-target.lift)<.001&&Math.abs(s.bucket.tilt-target.tilt)<.001;
    if(ready){
      s.task.clock+=dt*TRANSPORT.rate;
      const pending=s.air.filter(p=>!['pour','field'].includes(p.type)).reduce((n,p)=>n+p.q,0),available=['pour','field','unload'].includes(type)?s.load:type==='source'?Math.min(s.source,128-s.load-pending):type==='field-return'?Math.min(s.pools?.[s.task.pool]?.q??0,128-s.load-pending):Math.min(s.water.reservoir,128-s.load-pending);
      const q=Math.min(Math.floor(s.task.clock/4)*4,available);
      if(q>0){
        // Recheck before removing any finite water. In-flight parcels keep their
        // saved world endpoints; an obstruction stops only the next transfer.
        let nozzle,g;try{g=waterWorkFrame(s,heightAt);nozzle=waterBucketPoint(s,s.bucket,g);}catch(e){s.task=null;s.message=e.message;}
        if(!s.task){s.water=advanceWater(s.water,dt);s.revision++;return s;}
        if(type==='field'){
          const volumes=[...external,...waterTransportObstacles(s).map(b=>({x:b.x,z:b.z,y:0,w:b.width,d:b.depth,h:b.height}))],target=fieldWaterTarget(s,s.task.target,volumes,heightAt),duration=waterFallTime(nozzle.y,s.task.target.y,(g?.axes[2][1]??0)*12);
          if(!target||distance(target,s.task.target)>.001||!fieldWaterPathClear({from:nozzle,to:target,duration},volumes,heightAt)){s.task=null;s.message='注ぐ先が変わったよ。水は車に残したので、場所を選び直そう。';s.water=advanceWater(s.water,dt);s.revision++;return s;}
        }
        let from,to,duration;
        if(type==='field'){from=nozzle;to={...s.task.target};duration=waterFallTime(from.y,to.y,(g?.axes[2][1]??0)*12);s.load-=q;}else if(type==='field-return'){from={...s.pools[s.task.pool]};delete from.q;delete from.dir;to=nozzle;duration=.35;}else if(type==='pour'){const pred=pourPrediction(s,heightAt);from=nozzle;to=pred.to;duration=pred.duration;if(!catches(to)||s.loader.vehicle.field&&Math.abs(heightAt(to.x,to.z))>=.05){s.task=null;s.message='受け口の上に物があるよ。水は車に残したので、注ぐ先を変えよう。';s.water=advanceWater(s.water,dt);s.revision++;return s;}s.load-=q;}
        else if(type==='unload'){from=nozzle;to=waterSourcePort(s);duration=.35;}
        else{from=type==='source'?waterSourcePort(s):RETURN_PORT;to=nozzle;duration=.35;}
        if(!['field','pour'].includes(type)){
          if(s.loader.vehicle.field&&!waterTransferPathClear({type,from,to,duration},external,heightAt)){s.task=null;s.message='ホースの通り道がふさがったよ。水は残したので、場所を変えよう。';s.water=advanceWater(s.water,dt);s.revision++;return s;}
          if(type==='field-return'){const pools={...s.pools},left=pools[s.task.pool].q-q;if(left)pools[s.task.pool]={...pools[s.task.pool],q:left};else delete pools[s.task.pool];s.pools=pools;}
          else if(type==='unload')s.load-=q;else if(type==='source')s.source-=q;else s.water={...s.water,reservoir:s.water.reservoir-q};
        }
        s.air.push({id:++s.sequence,type,q,from:{...from},to:{...to},duration,elapsed:0,...(type==='field'?{dir:s.direction}:{})});s.task.clock-=q;
      }
      if(!available&&!s.air.length){s.task=null;s.message=type==='field'?'水を注いだよ！坂では低い方へ流れます。近づくと回収できるよ。':type==='field-return'?(s.load===128?'車の水がいっぱいになったよ！':fieldWaterTotal(s)?'近くの水を回収したよ。残った水へ車を近づけよう。':'地面の水をぜんぶ回収したよ！'):type==='pour'?'注水できました。上り水路・天井水路へ流れていきます。':type==='unload'?'給水槽へ戻せました。降車して保管口へ戻れば、保管庫に収納できます。':'汲み取り完了。車載タンクの水を、青い受け口まで運びましょう。';}
    }
  }
  s.water=advanceWater(s.water,dt);s.revision++;return s;
}
export function advanceTransport(s,input,dt){if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error('更新時間が不正です。');if(s.paused)return s;s={...s,phase:s.phase+dt};while(s.phase>=TRANSPORT.dt-1e-9){s={...s,phase:Math.max(0,s.phase-TRANSPORT.dt)};s=stepTransport(s,input);}if(s.phase<1e-9)s.phase=0;return s;}
const check=(ok,msg)=>{if(!ok)throw Error(msg);},finite=Number.isFinite;
export function validateTransport(s){
  validateFieldPools(s);assertVehicleField(s?.loader?.vehicle);check(s?.schema===(s?.loader?.vehicle?.field?2:1)&&s.scope===TRANSPORT.scope,'水運搬の保存区分が不正です。');
  for(const k of['source','load','sequence','revision','delivered'])check(Number.isSafeInteger(s[k])&&s[k]>=0,'水量・保存番号が不正です。');
  check(s.source<=768&&s.load<=128&&Array.isArray(s.air)&&s.air.length<=128,'水量上限が不正です。');
  check(typeof s.paused==='boolean'&&finite(s.time)&&s.time>=0&&finite(s.phase)&&s.phase>=0&&s.phase<1/120+1e-8,'実験の時間が不正です。');
  check([1,2,4,8,16,32].includes(s.direction)&&typeof s.message==='string'&&s.message.length<600,'注水方向・説明が不正です。');
  check(s.bucket&&finite(s.bucket.lift)&&s.bucket.lift>=0&&s.bucket.lift<=.8&&finite(s.bucket.tilt)&&s.bucket.tilt>=0&&s.bucket.tilt<=.7,'車載タンク角度が不正です。');
  check(new Set(s.air.map(p=>p.id)).size===s.air.length,'移送が重複しています。');
  for(const p of s.air){check(['source','returned','pour','unload','field','field-return'].includes(p.type)&&Number.isInteger(p.q)&&p.q>0&&p.q<=128&&Number.isSafeInteger(p.id)&&p.id>0&&p.id<=s.sequence,'移送水量が不正です。');check([p.duration,p.elapsed].every(finite)&&p.duration>0&&p.duration<2&&p.elapsed>=0&&p.elapsed<=p.duration,'移送時間が不正です。');for(const v of[p.from,p.to])check(v&&[v.x,v.y,v.z].every(finite)&&inWorkArea(v,s.loader.vehicle)&&v.y>=-32&&v.y<70,'移送経路が不正です。');if(p.type==='pour')check(catches(p.to),'受け口の外へ注水しています。');if(['field','field-return'].includes(p.type))check(!!s.loader.vehicle.field,'現場の外へ注げません。');if(p.type==='field')check([1,2,4,8,16,32].includes(p.dir)&&p.to.x%8===0&&p.to.z%8===0,'着水先が不正です。');if(p.type==='unload')check(distance(p.to,waterSourcePort(s))<.001,'給水槽への返送先が不正です。');}
  check(s.load+s.air.filter(p=>!['pour','field'].includes(p.type)).reduce((n,p)=>n+p.q,0)<=128,'移送中を含む積載量が不正です。');
  check(transferTotals(s).total===768,'水が増減しています。上書きせず停止しました。');
  // Existing water validator checks geometry/directions; loan outside this circuit is virtual reserve for validation only.
  validateWater({...s.water,reservoir:s.water.reservoir+s.source+s.load+transferTotals(s).transit+fieldWaterTotal(s)});
  const l=s.loader,v=l?.vehicle,p=l?.player;
  check(l&&['foot','boarding','driving','exiting'].includes(l.mode)&&v&&p,'乗降状態が不正です。');
  check(['x','z','heading','speed','steering','wheelTravel'].every(k=>finite(v[k]))&&Math.abs(v.speed)<=200&&Math.abs(v.steering)<=.471&&!vehicleBlocker(v,waterTransportObstacles(s)),'車両位置が不正です。');
  check(['x','y','z','heading'].every(k=>finite(p[k])),'乗員位置が不正です。');
  check(l.mode!=='foot'||walkingClear(p,v,waterTransportObstacles(s)),'乗員が障害物の中です。');
  check(!s.task||(['source','returned','pour','unload','field','field-return','build','build-return'].includes(s.task.type)&&finite(s.task.elapsed)&&s.task.elapsed>=0&&finite(s.task.clock)&&s.task.clock>=0&&s.task.clock<500&&l.mode==='driving'),'移送作業が不正です。');
  if(['build','build-return'].includes(s.task?.type))check(s.waterBuilds?.some(b=>b.id===s.task.build),'注水中の水が見つかりません。');
  if(s.task?.type==='field')check(!!s.loader.vehicle.field&&s.task.target&&[s.task.target.x,s.task.target.y,s.task.target.z].every(finite)&&inWorkArea(s.task.target,v)&&s.task.target.y>=-32&&s.task.target.y<=48&&s.task.target.x%8===0&&s.task.target.z%8===0,'注ぐ場所が不正です。');
  if(s.task?.type==='field-return')check(!!s.loader.vehicle.field&&typeof s.task.pool==='string'&&(s.pools?.[s.task.pool]||s.air.some(p=>p.type==='field-return')||!s.task.clock),'回収する水が見つかりません。');
  check((['boarding','exiting'].includes(l.mode))===!!l.transition,'乗降経路が不正です。');
  if(l.transition){const t=l.transition;check(Array.isArray(t.path)&&t.path.length>=2&&t.path.length<=8&&[t.elapsed,t.duration].every(finite)&&t.elapsed>=0&&t.duration>0&&t.elapsed<=t.duration,'乗降アニメーションが不正です。');for(const p of t.path)check(['x','y','z','heading'].every(k=>finite(p[k]))&&inWorkArea(p,v)&&p.y>=0&&p.y<=(v.waterTruck?20:10),'乗降座標が不正です。');}
  return s;
}
const checksum=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16);};
export function packTransport(s){validateTransport(s);const state=structuredClone(s);state.loader.vehicle.speed=0;state.paused=true;const payload=JSON.stringify(state);return{kind:TRANSPORT.scope,payload,checksum:checksum(payload)};}
export function unpackTransport(p){check(p?.kind===TRANSPORT.scope&&typeof p.payload==='string'&&p.payload.length<300000&&p.checksum===checksum(p.payload),'保存の整合性を確認できません。');return validateTransport(JSON.parse(p.payload));}
