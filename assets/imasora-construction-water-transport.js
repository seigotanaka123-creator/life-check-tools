// 5-2b: closed water bucket, positional docking, finite transfers. No game wallet.
import {initialLoaderState,stepLoader,actLoader,vehicleBlocker,walkingClear,approach,localToWorld} from './imasora-construction-loader-physics.js';
import {bucketWorldPoint} from './imasora-construction-loader-work.js';
import {initialWater,advanceWater,waterAction,waterTotal,validateWater} from './imasora-construction-water.js';
export const TRANSPORT={scope:'mars-water-transport-development-v1',total:768,capacity:128,dt:1/120,rate:80}; // .25 L units; 20 L/s
export const SOURCE_PORT=Object.freeze({x:-130,y:9,z:-12});
export const RETURN_PORT=Object.freeze({x:57,y:9,z:0});
export const CATCHER=Object.freeze({minX:27,maxX:87,minZ:-18,maxZ:12,y:1});
export const TRANSPORT_OBSTACLES=Object.freeze([
  {id:'給水槽',x:-130,z:20,width:72,depth:54,height:58},
  {id:'観察水路の土台',x:168,z:120,width:278,depth:212,height:112}
]);
export function initialTransport(){const loader=initialLoaderState();loader.vehicle.x=-130;loader.vehicle.z=-110;loader.player={x:-188,y:0,z:-118,heading:0};const water=initialWater();water.reservoir=0;return{schema:1,scope:TRANSPORT.scope,revision:0,time:0,phase:0,paused:false,loader,bucket:{lift:0,tilt:0},source:768,load:0,water,air:[],sequence:0,task:null,direction:4,delivered:0,message:'運転席に乗り、正面の給水槽へ少し前進。停車したら「汲み取る」です。'};}
export const waterNozzle=s=>bucketWorldPoint(s.loader.vehicle,s.bucket,0,-4,13);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function pourPrediction(s){const p=bucketWorldPoint(s.loader.vehicle,{lift:.8,tilt:.7},0,-4,13),v=s.loader.vehicle,t=Math.sqrt(Math.max(0,2*(p.y-CATCHER.y)/70));return{from:p,to:{x:p.x+Math.sin(v.heading)*12*t,y:1,z:p.z+Math.cos(v.heading)*12*t},duration:t};}
const catches=p=>p.x>=CATCHER.minX+1&&p.x<=CATCHER.maxX-1&&p.z>=CATCHER.minZ+1&&p.z<=CATCHER.maxZ-1;
export function transportAvailability(s){const stopped=s.loader.mode==='driving'&&!s.loader.transition&&Math.abs(s.loader.vehicle.speed)<.8,idle=!s.task&&!s.air.length,point=bucketWorldPoint(s.loader.vehicle,{lift:0,tilt:0},0,-4,13),sourceDistance=distance(point,SOURCE_PORT),returnDistance=distance(point,RETURN_PORT),pour=pourPrediction(s);return{stopped,idle,sourceDistance,returnDistance,pour,source:stopped&&idle&&sourceDistance<=28&&s.load<128&&s.source>0,unload:stopped&&idle&&sourceDistance<=28&&s.load>0,returned:stopped&&idle&&returnDistance<=28&&s.load<128&&waterTotal(s.water)>0,pourable:stopped&&idle&&catches(pour.to)&&s.load>0,nearReturn:returnDistance<65};}
export function transportAction(state,action,value){
  let s=structuredClone(state),a=transportAvailability(s);
  if(action==='pause'){s.paused=!s.paused;s.message=s.paused?'実験を一時停止しました。':'実験を再開しました。';}
  else if(action==='home'){s.task=null;s.loader=actLoader(s.loader,'home',TRANSPORT_OBSTACLES);s.message='レンを安全エリアへ戻しました。車と水はその場所に残ります。';}
  else if(action==='interact'){if(s.task||s.air.length){s.message='水の移送が終わってから乗り降りしてください。';}else{s.loader=actLoader(s.loader,'interact',TRANSPORT_OBSTACLES);s.message=s.loader.message;}}
  else if(action==='stop'){s.task=null;s.message='新しい移送を止めました。ホース内・落下中の水は行き先へ届いてから走行できます。';}
  else if(action==='direction'){if(![1,2,4,8,16,32].includes(value))throw Error('6方向から選んでください。');if(s.task||s.air.length){s.message='注水が終わってから、次に注ぐ水の向きを選んでください。';}else{s.direction=value;s.message='次に注ぐ水の向きを選びました。離れた水路の水は変更しません。';}}
  else if(action==='flow'||action==='recover'){
    if(!a.stopped||!a.idle||!a.nearReturn)s.message='水路側の受け口付近で停車して操作してください。';
    else if(action==='recover'){s.water=waterAction(s.water,'recover');s.message='水路の水を同じ量だけ回収槽へ戻しました。「回収槽から汲む」で再利用できます。';}
    else{s.water.running=!s.water.running;s.water.feeding=s.water.running;s.message=s.water.running?'水路の流れを再開しました。':'水路の流れを止めました。';}
  }else if(['source','returned','pour','unload'].includes(action)){
    const available=action==='pour'?a.pourable:a[action];
    if(!available)s.message=!a.stopped?'停車してから作業してください。':!a.idle?'今の移送を終えるか、止めてください。':action==='pour'?(s.load?'青い着水予告を受け口に合わせてください。':'バケットに水がありません。'):s.load>=128?'バケットは満水です。':`汲み取り口へバケットを近づけてください。${action==='source'&&!s.source?'給水槽は空です。':''}`;
    else{if(action==='returned'){s.water=waterAction(s.water,'recover');}if(action==='pour'){s.water=waterAction(s.water,'direction',{region:'rise',dir:s.direction});}s.task={type:action,elapsed:0,clock:0};s.message=action==='pour'?'アームを上げて傾けています。受け口へ少しずつ注ぎます。':action==='unload'?'車載タンクからホースを通して給水槽へ戻しています。':'汲み取り中。ホースを通った分だけバケットに入ります。';}
  }else throw Error('不明な操作です。');s.revision++;return s;
}
export function transferTotals(s){const transit=s.air.reduce((n,p)=>n+p.q,0),course=Object.values(s.water.cells).reduce((n,c)=>n+c.q,0);return{source:s.source,bucket:s.load,transit,course,returnTank:s.water.reservoir,total:s.source+s.load+transit+waterTotal(s.water)};}
export function parcelPosition(p){const t=Math.min(1,p.elapsed/p.duration),pos={x:p.from.x+(p.to.x-p.from.x)*t,y:p.from.y+(p.to.y-p.from.y)*t,z:p.from.z+(p.to.z-p.from.z)*t};pos.y+=p.type==='pour'?35*p.duration*p.duration*t*(1-t):6*Math.sin(t*Math.PI);return pos;}
export function stepTransport(state,input={},dt=TRANSPORT.dt){
  if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です。');if(state.paused)return state;
  const s={...state,loader:state.loader,bucket:{...state.bucket},water:state.water,task:state.task?{...state.task}:null,air:state.air.map(p=>({...p})),time:state.time+dt};
  const busy=!!(s.task||s.air.length);s.loader=stepLoader(s.loader,busy?{brake:true}:input,dt,TRANSPORT_OBSTACLES);
  if(s.loader.mode!==state.loader.mode||s.loader.hit)s.message=s.loader.message;
  const type=s.task?.type,target=type==='pour'?{lift:.8,tilt:.7}:{lift:0,tilt:0};
  s.bucket.lift=approach(s.bucket.lift,target.lift,dt*.42);s.bucket.tilt=approach(s.bucket.tilt,target.tilt,dt*.7);
  const remaining=[];
  for(const p of s.air){p.elapsed=Math.min(p.duration,p.elapsed+dt);if(p.elapsed<p.duration-1e-9){remaining.push(p);continue;}if(p.type==='pour'){s.water={...s.water,reservoir:s.water.reservoir+p.q,running:true,feeding:true};s.delivered+=p.q;}else if(p.type==='unload')s.source+=p.q;else s.load+=p.q;}
  s.air=remaining;
  if(s.task){
    s.task.elapsed+=dt;
    const ready=Math.abs(s.bucket.lift-target.lift)<.001&&Math.abs(s.bucket.tilt-target.tilt)<.001;
    if(ready){
      s.task.clock+=dt*TRANSPORT.rate;
      const pending=s.air.filter(p=>p.type!=='pour').reduce((n,p)=>n+p.q,0),available=['pour','unload'].includes(type)?s.load:type==='source'?Math.min(s.source,128-s.load-pending):Math.min(s.water.reservoir,128-s.load-pending);
      const q=Math.min(Math.floor(s.task.clock/4)*4,available);
      if(q>0){
        let from,to,duration;
        if(type==='pour'){const pred=pourPrediction(s);from=waterNozzle(s);to=pred.to;duration=pred.duration;if(!catches(to))throw Error('受け口を外れたため注水を停止しました。');s.load-=q;}
        else if(type==='unload'){from=waterNozzle(s);to=SOURCE_PORT;duration=.35;s.load-=q;}
        else{from=type==='source'?SOURCE_PORT:RETURN_PORT;to=waterNozzle(s);duration=.35;if(type==='source')s.source-=q;else s.water={...s.water,reservoir:s.water.reservoir-q};}
        s.air.push({id:++s.sequence,type,q,from:{...from},to:{...to},duration,elapsed:0});s.task.clock-=q;
      }
      if(!available&&!s.air.length){s.task=null;s.message=type==='pour'?'注水できました。上り水路・天井水路へ流れていきます。':type==='unload'?'給水槽へ戻せました。降車して保管口へ戻れば、保管庫に収納できます。':'汲み取り完了。密閉バケットの水を、青い受け口まで運びましょう。';}
    }
  }
  s.water=advanceWater(s.water,dt);s.revision++;return s;
}
export function advanceTransport(s,input,dt){if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error('更新時間が不正です。');if(s.paused)return s;s={...s,phase:s.phase+dt};while(s.phase>=TRANSPORT.dt-1e-9){s={...s,phase:Math.max(0,s.phase-TRANSPORT.dt)};s=stepTransport(s,input);}if(s.phase<1e-9)s.phase=0;return s;}
const check=(ok,msg)=>{if(!ok)throw Error(msg);},finite=Number.isFinite;
export function validateTransport(s){
  check(s?.schema===1&&s.scope===TRANSPORT.scope,'水運搬の保存区分が不正です。');
  for(const k of['source','load','sequence','revision','delivered'])check(Number.isSafeInteger(s[k])&&s[k]>=0,'水量・保存番号が不正です。');
  check(s.source<=768&&s.load<=128&&Array.isArray(s.air)&&s.air.length<=128,'水量上限が不正です。');
  check(typeof s.paused==='boolean'&&finite(s.time)&&s.time>=0&&finite(s.phase)&&s.phase>=0&&s.phase<1/120+1e-8,'実験の時間が不正です。');
  check([1,2,4,8,16,32].includes(s.direction)&&typeof s.message==='string'&&s.message.length<600,'注水方向・説明が不正です。');
  check(s.bucket&&finite(s.bucket.lift)&&s.bucket.lift>=0&&s.bucket.lift<=.8&&finite(s.bucket.tilt)&&s.bucket.tilt>=0&&s.bucket.tilt<=.7,'バケット角度が不正です。');
  check(new Set(s.air.map(p=>p.id)).size===s.air.length,'移送が重複しています。');
  for(const p of s.air){check(['source','returned','pour','unload'].includes(p.type)&&Number.isInteger(p.q)&&p.q>0&&p.q<=128&&Number.isSafeInteger(p.id)&&p.id>0&&p.id<=s.sequence,'移送水量が不正です。');check([p.duration,p.elapsed].every(finite)&&p.duration>0&&p.duration<2&&p.elapsed>=0&&p.elapsed<=p.duration,'移送時間が不正です。');for(const v of[p.from,p.to])check(v&&[v.x,v.y,v.z].every(finite)&&Math.abs(v.x)<325&&Math.abs(v.z)<255&&v.y>=0&&v.y<70,'移送経路が不正です。');if(p.type==='pour')check(catches(p.to),'受け口の外へ注水しています。');if(p.type==='unload')check(distance(p.to,SOURCE_PORT)<.001,'給水槽への返送先が不正です。');}
  check(s.load+s.air.filter(p=>p.type!=='pour').reduce((n,p)=>n+p.q,0)<=128,'移送中を含む積載量が不正です。');
  check(transferTotals(s).total===768,'水が増減しています。上書きせず停止しました。');
  // Existing water validator checks geometry/directions; loan outside this circuit is virtual reserve for validation only.
  validateWater({...s.water,reservoir:s.water.reservoir+s.source+s.load+transferTotals(s).transit});
  const l=s.loader,v=l?.vehicle,p=l?.player;
  check(l&&['foot','boarding','driving','exiting'].includes(l.mode)&&v&&p,'乗降状態が不正です。');
  check(['x','z','heading','speed','steering','wheelTravel'].every(k=>finite(v[k]))&&Math.abs(v.speed)<=100&&Math.abs(v.steering)<=.471&&!vehicleBlocker(v,TRANSPORT_OBSTACLES),'車両位置が不正です。');
  check(['x','y','z','heading'].every(k=>finite(p[k])),'乗員位置が不正です。');
  check(l.mode!=='foot'||walkingClear(p,v,TRANSPORT_OBSTACLES),'乗員が障害物の中です。');
  check(!s.task||(['source','returned','pour','unload'].includes(s.task.type)&&finite(s.task.elapsed)&&s.task.elapsed>=0&&finite(s.task.clock)&&s.task.clock>=0&&s.task.clock<500&&l.mode==='driving'),'移送作業が不正です。');
  check((['boarding','exiting'].includes(l.mode))===!!l.transition,'乗降経路が不正です。');
  if(l.transition){const t=l.transition;check(Array.isArray(t.path)&&t.path.length>=2&&t.path.length<=8&&[t.elapsed,t.duration].every(finite)&&t.elapsed>=0&&t.duration>0&&t.elapsed<=t.duration,'乗降アニメーションが不正です。');for(const p of t.path)check(['x','y','z','heading'].every(k=>finite(p[k]))&&Math.abs(p.x)<=320&&Math.abs(p.z)<=250&&p.y>=0&&p.y<=10,'乗降座標が不正です。');}
  return s;
}
const checksum=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16);};
export function packTransport(s){validateTransport(s);const state=structuredClone(s);state.loader.vehicle.speed=0;state.paused=true;const payload=JSON.stringify(state);return{kind:TRANSPORT.scope,payload,checksum:checksum(payload)};}
export function unpackTransport(p){check(p?.kind===TRANSPORT.scope&&typeof p.payload==='string'&&p.payload.length<300000&&p.checksum===checksum(p.payload),'保存の整合性を確認できません。');return validateTransport(JSON.parse(p.payload));}
