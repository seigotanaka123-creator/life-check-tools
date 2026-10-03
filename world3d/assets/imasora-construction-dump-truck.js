import {walkFactor} from './imasora-construction-travel-input.mjs';
import {DUMP_SOIL,soilSize,soilSnap,soilOnGrid,soilLevel} from './imasora-construction-dump-soil.js?v=526';
const G=DUMP_SOIL.grain;
// Stage 9-2a: finite practice soil. No normal-game inventory or storage access.
import {initialLoaderState,stepVehicle,stepLoader,actLoader,actorPose,boardOption,exitOption,localToWorld,polygon,polygonsOverlap,SITE,SAFE_ZONE,WALKER,approach} from './imasora-construction-loader-physics.js';
import {soilPlan,tailgateBlocker,targetBlocker,flightBlocker,insideSite,startGrain,cellKey} from './imasora-construction-dump-placement.js?v=526';
export const DUMP=Object.freeze({capacity:48,total:48,seatShift:26,bedMax:Math.PI/3,bedRate:.55,spreadAngle:Math.PI/5,spreadSpeed:8,grain:G});
export const LOAD_BAY=Object.freeze({x:0,z:-110,width:100,depth:106});
export const DUMP_WALLS=Object.freeze([{id:'積込所の壁',x:108,z:-110,width:12,depth:110,height:28},{id:'積込用の土置場',x:70,z:-110,width:34,depth:56,height:20},{id:'資材ブロック',x:-135,z:60,width:60,depth:65,height:32}]);
const rect=o=>polygon({...o,heading:o.angle||0},o.width,o.depth);
const cab=rig=>({...rig,vehicle:{...rig.vehicle,...localToWorld(rig.vehicle,0,DUMP.seatShift)}});
export const dumpBoardOption=(rig,obs=DUMP_WALLS)=>boardOption(cab(rig),obs);
export const dumpExitOption=(rig,obs=DUMP_WALLS)=>exitOption(cab(rig),obs);
export const dumpActorPose=rig=>actorPose(cab(rig));
export function createDumpWorld(){
 const rig=initialLoaderState();rig.vehicle.z=LOAD_BAY.z;rig.player={x:-58,z:LOAD_BAY.z+18,y:0,heading:0};
 return{rig,source:DUMP.total,load:0,ground:[],air:[],bed:0,job:null,clock:0,serial:0,pending:[],remaining:0,pattern:'pile',spreadAnchor:null,emptyRows:0,message:'運転席に乗り、積込所で「土を積む」を押してください。'};
}
export function dumpTotals(w){return{source:w.source,load:w.load,air:w.air.length,ground:w.ground.reduce((n,c)=>n+c.n,0),total:w.source+w.load+w.air.length+w.ground.reduce((n,c)=>n+c.n,0)};}
export function dumpGroundObstacles(w){return w.ground.map(c=>({id:'降ろした土',x:c.x,z:c.z,width:soilSize(c),depth:soilSize(c),height:c.n*soilSize(c)}));}
const allObstacles=(w,obs)=>[...obs,...dumpGroundObstacles(w)];
export function loadingReady(w){return w.rig.mode==='driving'&&!w.rig.transition&&Math.abs(w.rig.vehicle.speed)<.01&&w.bed===0&&!w.job&&Math.abs(w.rig.vehicle.x-LOAD_BAY.x)<12&&Math.abs(w.rig.vehicle.z-LOAD_BAY.z)<12&&Math.abs(w.rig.vehicle.heading)<.12;}
export function stoppedDumpPose(w,obs=DUMP_WALLS){
 let vehicle={...w.rig.vehicle};
 for(let i=0;i<120&&Math.abs(vehicle.speed)>.001;i++)vehicle=stepVehicle(vehicle,{brake:true},1/120,allObstacles(w,obs)).vehicle;
 return{...w,rig:{...w.rig,vehicle}};
}
export function planDump(w,options={},obs=DUMP_WALLS){return soilPlan(w.job==='spread'?w:stoppedDumpPose(w,obs),options,obs);}
export function dischargeBlocker(w,obs=DUMP_WALLS){const plan=planDump(w,{},obs);return plan.ok?'':plan.reason;}
function finishWork(w,message){w.job=w.bed>0?'lowering':null;w.pending=[];w.remaining=0;w.clock=0;w.rig.vehicle.speed=0;w.message=message;}
export function dumpAction(w,action,obs=DUMP_WALLS,amount=w.load){
 const next={...w,rig:{...w.rig,vehicle:{...w.rig.vehicle}}},rig=next.rig;
 if(action==='stop'||action==='lower'){finishWork(next,'停止しました。残りの土を保持して荷台を戻します。');return next;}
 if(action==='interact'){
  if(w.job||w.bed>0||w.air.length){next.message='荷台と落下中の土が落ち着くまでお待ちください。';return next;}
  const result=actLoader(cab(rig),'interact',allObstacles(w,obs));next.rig={...result,vehicle:{...rig.vehicle,speed:result.vehicle.speed}};next.message=result.message;return next;
 }
 if(rig.mode!=='driving'||rig.transition){next.message='運転席に乗ってから操作してください。';return next;}
 if(w.job){next.message='「停止・走行へ」で今の作業を終えられます。';return next;}
 if(w.air.length){next.message='落下中の土が落ち着いてから続けられます。';return next;}
 if(action==='load'){
  if(!loadingReady(w)){next.message='積込所にまっすぐ停車し、荷台を下げてください。';return next;}
  if(!w.source||w.load>=DUMP.capacity){next.message=w.source?'荷台が満杯です。':'積込所の土をすべて運びました。';return next;}
  next.job='loading';next.clock=0;next.message='まとめて積んでいます。最大48個、ショベルの8杯分を運べます。';
 }else if(action==='dump'||action==='spread'){
  const kind=action==='spread'?'spread':'pile',plan=planDump(w,{kind,amount},obs);
  if(!plan.ok){next.message=plan.reason;return next;}
  next.pattern=kind;next.remaining=Math.min(w.load,Number.isInteger(amount)&&amount>0?amount:w.load);next.pending=[];next.spreadAnchor=null;next.emptyRows=0;next.job='braking';next.clock=0;
  next.message=kind==='spread'?'停車して荷台を準備します。その後ゆっくり前進。左右の操作で道筋を変えられます。':'停車して、緑の形へ土を降ろします。';
 }
 return next;
}
export function dumpWalkingClear(rig,p,obstacles=DUMP_WALLS){
 const shapes=[...obstacles,{id:'車体',...rig.vehicle,width:68,depth:86,angle:rig.vehicle.heading},...[-1,1].map(side=>({id:'ステップ',...localToWorld(rig.vehicle,side*35,18),width:10,depth:28,angle:rig.vehicle.heading}))];
 const footprint=polygon({...p,heading:0},WALKER.radius*2,WALKER.radius*2);return footprint.every(v=>v.x>SITE.minX&&v.x<SITE.maxX&&v.z>SITE.minZ&&v.z<SITE.maxZ)&&!shapes.some(o=>polygonsOverlap(footprint,rect(o)));
}
function walk(rig,input,dt,obstacles){
 const p={...rig.player},len=Math.max(1,Math.hypot(input.x||0,input.z||0)),dx=(input.x||0)/len*WALKER.speed*walkFactor(input)*dt,dz=(input.z||0)/len*WALKER.speed*walkFactor(input)*dt;
 const clear=q=>dumpWalkingClear(rig,q,obstacles);
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.6));for(let i=0;i<n;i++){if(clear({...p,x:p.x+dx/n}))p.x+=dx/n;if(clear({...p,z:p.z+dz/n}))p.z+=dz/n;}
 if(Math.hypot(dx,dz)>.0001)p.heading=Math.atan2(dx,dz);return{...rig,player:p};
}
export function stepDumpWorld(w,input,dt,obs=DUMP_WALLS){
 if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です。');
 const next={...w,pending:[...(w.pending||[])],rig:{...w.rig,vehicle:{...w.rig.vehicle}},ground:w.ground.map(c=>({...c})),air:[]},obstacles=allObstacles(w,obs);
 if(w.rig.transition){const stepped=stepLoader(cab(w.rig),{},dt,obstacles);next.rig={...stepped,vehicle:next.rig.vehicle};if(stepped.mode!==w.rig.mode){next.message=stepped.message;if(stepped.mode==='foot')next.rig.player={...next.rig.player,y:0};}}
 else if(w.rig.mode==='foot')next.rig=walk(w.rig,input,dt,obstacles);
 else if(w.job==='braking')Object.assign(next.rig,stepVehicle(w.rig.vehicle,{brake:true},dt,obstacles));
 else if(w.job==='spread'){
  if(input.brake||(input.throttle||0)<0)finishWork(next,'土を敷く作業を停止しました。荷台を戻します。');
  else{
   const moved=stepVehicle(w.rig.vehicle,{throttle:DUMP.spreadSpeed/100,steer:input.steer||0},dt,obstacles),block=tailgateBlocker(moved.vehicle,obs);
   if(moved.hit||block)finishWork(next,block||moved.hit+'の手前で作業を停止しました。');
   else Object.assign(next.rig,moved);
  }
 }else if(!w.job&&w.bed===0&&!w.air.length){const moved=stepVehicle(w.rig.vehicle,{...input,throttle:(input.throttle||0)*(1-w.load/DUMP.capacity*.28)},dt,obstacles);Object.assign(next.rig,moved);if(moved.hit)next.message=moved.hit+'で停止しました。';}
 else next.rig.vehicle.speed=0;
 if(next.job==='braking'&&Math.abs(next.rig.vehicle.speed)<.001){
  next.rig.vehicle.speed=0;const plan=soilPlan(next,{kind:next.pattern,amount:next.remaining},obs);
  if(!plan.ok)finishWork(next,plan.reason);else{next.pending=next.pattern==='pile'?plan.targets:[];next.job='raising';}
 }
 if(next.job==='loading'){
  next.clock+=dt;while(next.clock>=.125&&next.source&&next.load<DUMP.capacity){next.clock-=.125;next.source--;next.load++;}
  if(!next.source||next.load===DUMP.capacity){next.job=null;next.clock=0;next.message='積込完了。好きな場所で山積み、または走りながら土を敷けます。';}
 }
 if(next.job==='raising'){
  const blocked=tailgateBlocker(next.rig.vehicle,obs);
  if(blocked)finishWork(next,blocked);else{
   const angle=next.pattern==='spread'?DUMP.spreadAngle:DUMP.bedMax;next.bed=approach(next.bed,angle,DUMP.bedRate*dt);
   if(next.bed===angle){next.job=next.pattern==='spread'?'spread':'unloading';next.message=next.pattern==='spread'?'低速で前進中。左右で道を曲げ、「停止・走行へ」で終えます。':'緑の形に土を降ろしています。';}
  }
 }
 function release(target){
  const blocked=targetBlocker(next.rig.vehicle,target,obs)||tailgateBlocker(next.rig.vehicle,obs);
  if(blocked){finishWork(next,blocked);return false;}
  next.air.push(startGrain(next.rig.vehicle,target));next.serial++;next.load--;next.remaining--;return true;
 }
 if(next.job==='unloading'){
  next.clock+=dt;while(next.clock>=.1&&next.pending.length&&next.load){const target=next.pending[0];if(!release(target))break;next.pending.shift();next.clock-=.1;}
  if(next.job==='unloading'&&(!next.pending.length||!next.load))finishWork(next,'指定した量を降ろしました。荷台を戻します。');
 }
 if(next.job==='spread'){
  const p=next.rig.vehicle,a=next.spreadAnchor;
  if(!a||Math.hypot(p.x-a.x,p.z-a.z)>=G){
   const plan=soilPlan({...next,air:[...w.air,...next.air]},{kind:'spread',amount:next.remaining},obs);
   if(!plan.ok)finishWork(next,plan.reason);
   else{
    next.emptyRows=plan.targets.length?0:next.emptyRows+1;
    for(const target of plan.targets)if(!release(target))break;
    next.spreadAnchor={x:p.x,z:p.z};
    if(!next.remaining||!next.load)finishWork(next,'土を敷き終えました。荷台を戻します。');
    else if(next.emptyRows>=10)finishWork(next,'すでに土が敷かれています。別の空いた場所から続けてください。');
   }
  }
 }
 if(next.job==='lowering'){next.bed=approach(next.bed,0,DUMP.bedRate*dt);if(next.bed===0){next.job=null;next.message+=' 走行できます。';}}
 let returnedGrain=false;
 for(const old of w.air){
  let p,landed=false;
  if(old.target){
   const elapsed=old.elapsed+dt,t=Math.min(1,elapsed/old.duration);
   p={...old,elapsed,x:old.start.x+(old.target.x-old.start.x)*t,z:old.start.z+(old.target.z-old.start.z)*t,y:Math.max(old.target.y,16-80*elapsed*elapsed)};
   landed=t===1;
  }else{p={...old,vy:old.vy-160*dt};p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;}
  if(flightBlocker(old,p,obs,soilSize(old))){
   next.load++;next.serial--;returnedGrain=true;finishWork(next,'降ろす先が塞がったため、落下中の土を積荷へ戻して停止しました。');continue;
  }
  const g=soilSize(old),x=old.target?.x??soilSnap(p.x,g),z=old.target?.z??soilSnap(p.z,g),cell=next.ground.find(c=>c.x===x&&c.z===z),floor=(cell?.n||0)*g+g/2;
  if(old.target&&landed&&floor<old.target.y-.001){next.air.push(p);continue;}
  if(old.target?landed:p.y<=floor){if(cell)cell.n++;else next.ground.push({x,z,n:1,...(g===4?{grain:4}:{})});}else next.air.push(p);
 }
 // A returned lower grain must not leave an upper grain waiting forever for support.
 if(returnedGrain){
  const columns=new Map(),keep=new Set(next.air.filter(a=>!a.target));
  for(const a of next.air)if(a.target){const key=cellKey(a.target.x,a.target.z),list=columns.get(key)||[];list.push(a);columns.set(key,list);}
  for(const [key,list] of columns){let level=next.ground.find(c=>cellKey(c.x,c.z)===key)?.n||0;
   for(const a of list.sort((a,b)=>a.target.y-b.target.y))if(soilLevel(a.target.y,soilSize(a))===level){keep.add(a);level++;}else{next.load++;next.serial--;}
  }
  next.air=next.air.filter(a=>keep.has(a));
 }
 return next;
}
// Portable, strictly practice-only snapshot. Restoring always requires UI confirmation.
export function packDumpWorld(w){
 if(w.rig.transition)throw Error('乗り降りを終えてから控えを作ってください。');
 const result=JSON.stringify({format:'imasora-dump-practice',version:3,world:{...w,job:null,clock:0,pending:[],remaining:0,spreadAnchor:null,emptyRows:0,rig:{...w.rig,vehicle:{...w.rig.vehicle,speed:0}}}});
 unpackDumpWorld(result);return result;
}
export function unpackDumpWorld(text){
 if(typeof text!=='string'||text.length>40000)throw Error('練習用の控えではありません。');
 const data=JSON.parse(text),w=data?.world,num=n=>typeof n==='number'&&Number.isFinite(n),int=n=>Number.isInteger(n)&&n>=0;
 const fail=()=>{throw Error('土量または車両の記録が不正です。現在の作業は変更しません。');};
 if(data.format!=='imasora-dump-practice'||![1,2,3].includes(data.version)||!w||!w.rig)fail();
 if(!int(w.source)||!int(w.load)||w.load>(data.version===1?16:DUMP.capacity)||!Array.isArray(w.ground)||!Array.isArray(w.air)||w.ground.length>48||w.air.length>48||!num(w.bed)||w.bed<0||w.bed>DUMP.bedMax||!int(w.serial)||w.serial>48||w.job!==null||w.clock!==0)fail();
 const v=w.rig.vehicle,p=w.rig.player;if(!v||!p||!['foot','driving'].includes(w.rig.mode)||w.rig.transition!==null)fail();
 if(!['x','z','heading','speed','steering','wheelTravel'].every(k=>num(v[k]))||v.speed!==0||Math.abs(v.heading)>Math.PI||Math.abs(v.steering)>.47||Math.abs(v.wheelTravel)>1e8||!['x','y','z','heading'].every(k=>num(p[k]))||p.y<0||p.y>10)fail();
 if(!polygon(v,68,86).every(q=>q.x>=SITE.minX&&q.x<=SITE.maxX&&q.z>=SITE.minZ&&q.z<=SITE.maxZ)||Math.abs(p.x)>320||Math.abs(p.z)>250)fail();
 // Legacy placement is not moved or enlarged across neighbouring saved objects.
 if(data.version<3){w.ground=w.ground.map(c=>({...c,grain:4}));w.air=w.air.map(a=>({...a,grain:4}));}
 // Canonicalize only valid grid coordinates, including harmless cross-engine roundoff.
 const canonical=p=>{const g=soilSize(p);return {...p,x:num(p.x)&&soilOnGrid(p.x,g)?soilSnap(p.x,g):p.x,z:num(p.z)&&soilOnGrid(p.z,g)?soilSnap(p.z,g):p.z};};
 w.ground=w.ground.map(canonical);w.air=w.air.map(a=>a.target?{...a,target:canonical({...a.target,...(a.grain===4?{grain:4}:{})})}:a);
 const keys=new Set();for(const c of w.ground){const key=c.x+','+c.z,g=soilSize(c);if((c.grain!==undefined&&c.grain!==4)||!num(c.x)||!num(c.z)||!soilOnGrid(c.x,g)||!soilOnGrid(c.z,g)||!int(c.n)||c.n<1||c.n>48||!insideSite(c,g/2+1)||keys.has(key))fail();keys.add(key);}
 const airLevels=new Map();
 for(const a of w.air){
  const g=soilSize(a),level=a.target?soilLevel(a.target.y,g):0;if(a.grain!==undefined&&a.grain!==4)fail();
  if(!['x','y','z'].every(k=>num(a[k]))||a.y<0||a.y>16||!insideSite(a,g/2+1))fail();
  if(a.target){
   if(data.version===1||!a.start||!['x','y','z'].every(k=>num(a.target[k])&&num(a.start[k]))||a.start.y!==16||level<0||level>2||Math.abs(a.target.y-(level*g+g/2))>1e-8||!soilOnGrid(a.target.x,g)||!soilOnGrid(a.target.z,g)||!insideSite(a.target,g/2+1)||!num(a.elapsed)||a.elapsed<0||a.elapsed>2||!num(a.duration)||Math.abs(a.duration-Math.sqrt((16-a.target.y)/80))>1e-8)fail();
   const t=Math.min(1,a.elapsed/a.duration);if(Math.abs(a.x-a.start.x-(a.target.x-a.start.x)*t)>1e-6||Math.abs(a.z-a.start.z-(a.target.z-a.start.z)*t)>1e-6||Math.abs(a.y-Math.max(a.target.y,16-80*a.elapsed*a.elapsed))>1e-6||flightBlocker(a.start,a.target,DUMP_WALLS,g))fail();
   const key=cellKey(a.target.x,a.target.z),levels=airLevels.get(key)||[];levels.push(level);airLevels.set(key,levels);
  }else if(!['vx','vy','vz'].every(k=>num(a[k]))||Math.hypot(a.vx,a.vz)>80||a.vy>0||a.vy< -100)fail();
 }
 for(const [key,levels] of airLevels){const ground=w.ground.find(c=>cellKey(c.x,c.z)===key)?.n||0;levels.sort((a,b)=>a-b);if(levels.some((n,i)=>n!==ground+i))fail();}
 for(const c of w.ground)if(DUMP_WALLS.concat(SAFE_ZONE).some(o=>polygonsOverlap(polygon({...c,heading:0},soilSize(c),soilSize(c)),rect(o))))fail();

 if(dumpTotals(w).total!==DUMP.total||w.serial!==dumpTotals(w).ground+w.air.length||w.source+w.load+w.serial!==48)fail();
 if(w.rig.mode==='foot'&&(w.bed!==0||w.air.length||Math.abs(p.y)>1e-8||!dumpWalkingClear(w.rig,p,allObstacles(w,DUMP_WALLS))))fail();
 if(DUMP_WALLS.concat(SAFE_ZONE,dumpGroundObstacles(w)).some(o=>polygonsOverlap(polygon(v,68,86),rect(o))))fail();
 return{...w,pending:[],remaining:0,spreadAnchor:null,emptyRows:0,pattern:'pile',rig:{...w.rig,player:{...p,y:w.rig.mode==='foot'?0:p.y}},message:'控えから戻しました。作業は停止中です。'};
}
