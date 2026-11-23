import {sharedParkingLayouts,CONSTRUCTION_STEERING_FACTOR} from './imasora-construction-shared-field.mjs?v=120ey';
import {quarryRangeLength,quarryRangePose,quarryRangeSummitBench} from './imasora-construction-field-earth.mjs?v=121ew';
import {nativeStorageBin} from './imasora-construction-transport-field.mjs?v=120ov';
import {dumpDoorFooting} from './imasora-construction-dump-work.mjs?v=120pv';

export const EXCAVATOR_KEYS=Object.freeze({
 boomRaise:'U',boomLower:'P',stickExtend:'I',stickRetract:'O',scoop:'H',pourDump:'G',pour:'Y',
});

// Read-only lesson descriptions. No inventory, save service or game actions.
export const LESSONS = [
 {id:'controls',stepSeconds:1.2,group:'はじめに',name:'車の乗り方',icon:'🚪',summary:'ドア横の目印から、運転席へ乗ろう。',steps:[['ドアの横へ','運転席の横にある黄色い目印まで近づこう。','丸いパッド / WASD'],['乗るボタンを押そう','目印で出てくる「運転席に乗る」を押すよ。','運転席に乗る'],['出発！','運転席に座ったら出発。作業したい所で止まろう。','丸いパッド / WASD']]},
 {id:'excavator',group:'働く車',name:'ショベルカー',icon:'🚜',summary:'山で採った土を、建築に使おう。',steps:[['土へ向けよう','上部旋回体を回し、ブームの高さとアームの伸びを合わせよう。',`J / L 旋回 · ${EXCAVATOR_KEYS.boomRaise} / ${EXCAVATOR_KEYS.boomLower} ブーム · ${EXCAVATOR_KEYS.stickExtend} / ${EXCAVATOR_KEYS.stickRetract} アーム`],['ひと押しですくう','「ここをすくう」が見えたら、バケットで土をすくおう。',EXCAVATOR_KEYS.scoop+' すくう'],['持ち上げる','バケットを閉じてからブームが上がるよ。終わるまで待とう。','すくう・自動の続き'],['採った土を預けよう','保管庫に預けると、降りて土を使える。遠い採土場では、近くに停めたダンプへ積もう。',`${EXCAVATOR_KEYS.pour} 保管庫へ預ける / ${EXCAVATOR_KEYS.pourDump} ダンプへ積む`]]},
 {id:'dump',group:'働く車',name:'ダンプカー',icon:'🚚',summary:'採土場から土をまとめて、保管庫へ運ぼう。',steps:[['土を積もう','ダンプをショベルカーのアームが届く位置に停めて、ショベルカーから土を積もう。',EXCAVATOR_KEYS.pourDump+' ダンプへ積む'],['運ぼう','車に乗って走るよ。荷下ろししたい場所で停車しよう。','丸いパッド / WASD'],['荷台を寄せよう','保管庫に荷台を向け、荷下ろしできる位置まで寄せよう。','S / X 後退'],['保管庫へ下ろそう','停止して荷台を上げると、土が保管庫に入るよ。','H 保管庫へ下ろす']]},
 {id:'water',group:'働く車',name:'給水車',icon:'💧',summary:'水ブロックをつなぐ。穴を満たして池をつくる。',steps:[['水を汲もう','給水槽の近くで停車。「給水槽から汲む」で車に入れるよ。','給水槽から汲む'],['水を運ぼう','水が入ったら受け口へ。こぼさないよう停車してね。','丸いパッド / WASD'],['水の形を選ぼう','「水ブロック」は4Lで土1個の大きさ。「形に合わせて満たす」は穴の縁まで。予告の形と必要量を見て注ごう。','水ブロック / 形に合わせて満たす'],['水を回収しよう','回収槽から汲み、給水槽へ戻せるよ。水路の水も回収できるよ。','回収槽から汲む']]},
 {id:'soil',group:'働く車',name:'アマネ星土ローダー',icon:'🟣',summary:'ふしぎな土を敷いて、床をつくろう。',steps:[['アマネ星土を積もう','土の保管口へ近づいて、土を積もう。','土を積む'],['場所を決めよう','敷きたい場所へ運んで停車しよう。','丸いパッド / WASD'],['土を敷こう','「土を敷く」で足元にアマネ星土の床をつくるよ。','土を敷く'],['回収もできるよ','「土を回収」で車へ。保管口へ戻すとしまえるよ。','土を回収']]},
 {id:'crane',group:'働く車',name:'アマネ星木材クレーン',icon:'🏗️',summary:'板をつり上げて、床や橋をつくろう。',steps:[['停車して準備','木材を用意し、車に乗ってクレーン作業へ。脚が広がるよ。','クレーン作業へ'],['フックを合わせよう','アームと巻き下げで板の上へ。「吊り索を掛ける」を押そう。','吊り索を掛ける'],['板を運ぼう','巻き上げて旋回。板を置きたい場所の上へ動かそう。','巻き上げる / 左右旋回'],['ゆっくり置こう','巻き下げて、揺れが落ち着いたら設置。床に接合もできるよ。','地面・支持面に設置']]},
 {id:'crane-kit',group:'働く車',name:'建築キットを運ぶ',icon:'🏗️',summary:'建物の部材を吊って、受取台へ渡そう。',steps:[['部材とフックを用意','建物で部材をつくろう。クレーンで作業台へ近づき、フックをキットの上へ。','建築キットを吊る'],['キットを吊り上げる','どの建物かえらんで吊るよ。建物に確保した材料なので、追加の木材は使わないよ。','建物のキットを吊る'],['受取台へ運ぼう','建物へ運ぶ→キットの受取台。黄色い枠をたしかめて「ここへ運ぶ」。','ここへ運ぶ'],['建物に渡そう','置いたら「建物にキットを渡す」。車を降り、建物で組み立てよう。元の作業台へ戻すこともできるよ。','建物にキットを渡す']]},
 {id:'mixer',group:'働く車',name:'ミキサー車',icon:'🔄',summary:'生コンを練って、ポンプへ送ろう。',steps:[['材料を積もう','建材受取所で材料を受け取り、工房から車へ積もう。','車両 → 材料とホース'],['車で練ろう','ミキサー車に乗って「ドラムで練る」。後ろのドラムが回るよ。','ドラムで練る'],['ホースをつなごう','ポンプ車と近づけて停車。ホースでつなごう。','ミキサー車とホースをつなぐ'],['ポンプへ送ろう','送液メーターを見よう。回収すると、残りは車に戻るよ。','ホースに送る（1/4杯）']]},
 {id:'pump',group:'働く車',name:'ポンプ車',icon:'🦾',summary:'アームとホースで、型枠へ生コンを注ごう。',steps:[['脚で支えよう','停車して支持脚を出そう。まわりに物がない場所で使うよ。','車両'],['型枠へ向けよう','注ぎ先を選び、アームを伸ばしてホースを型枠へ向けよう。','型枠の道具箱 → 注ぎ先'],['生コンを注ごう','生コンを送ってから「生コンを注ぐ」。量の表示も見よう。','生コンを注ぐ（1/4杯）'],['しまってから走ろう','ホースの残りを回収。接続を外し、アームと支持脚をしまおう。','材料とホース / 車両']]},
 {id:'shovel',group:'手作業',name:'シャベルで土を運ぶ',icon:'🪏',summary:'地面を選んで、土を置こう。',steps:[['土をすくおう','土の近くで「土をすくう」。手もとに土が来るよ。','土をすくう'],['置き先を選ぼう','歩かずに地面をタップ。PCも地面をクリックして選べるよ。','地面をタップ'],['黄色い枠に置こう','黄色なら置けるよ。「ここに置く」を押そう。穴や盛土にも置けるよ。','ここに置く'],['ダンプにも積めるよ','荷台の近くへ。車が停まっていたら「荷台へ入れる」。','荷台へ入れる']]},
 {id:'concrete',group:'手作業',name:'型枠で床・壁をつくる',icon:'🧱',summary:'組む・注ぐ・ならす・固める。',steps:[['形を決めて組む','つくる → 型枠の道具箱。場所と高さを選んで型枠を組もう。','型枠を組む'],['生コンを注ぐ','注ぎ先を選んで、必要な量まで注ごう。高い場所は足場を使うよ。','生コンを注ぐ'],['コテでならす','車を降りて「コテでならす」。平らになったら固めよう。','コテでならす → 生コンを固める'],['型枠を外して完成','固まったら型枠を外そう。階段と作業台は片付けるまで残るよ。','型枠を外して完成']]},
 {id:'paint',group:'手作業',name:'ローラー・刷毛・型紙',icon:'🎨',summary:'好きな色と模様で、作品を飾ろう。',steps:[['色と面を選ぼう','塗る → 色・塗る場所。色と塗りたい面を選ぼう。','色・塗る場所'],['ローラーで広く','ローラーで広い面を塗れるよ。足場が必要な場所は自分で上るよ。','ローラーで塗る'],['刷毛で細かく','色・塗る場所の小さいマスをなぞろう。指を離すと、その範囲を塗るよ。','小さいマスをなぞる'],['型紙で模様をつけよう','矢印や市松模様を選んで塗ろう。同じ色・模様は追加消費しないよ。','型紙で塗る']]}
];
export const lessonById=id=>LESSONS.find(l=>l.id===id)||LESSONS[0];
export const STEP_SECONDS=2.4;
export const stepAt=(seconds,count)=>{const duration=STEP_SECONDS, time=Math.max(0,Number.isFinite(seconds)?seconds:0)%(Math.max(1,count)*duration);return{index:Math.floor(time/duration),progress:(time%duration)/duration};};
export const blend=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

// Chapter 15 uses the same work order on the save and presentation sides.
// Durations are operating times at the vehicle's normal speed.
const worksOp=(id,key,label,seconds)=>({id,key,label,seconds});
const repeatedWork=(names,recipe)=>names.flatMap((area,batch)=>recipe(area).map(op=>({...op,area,batch})));
const numbered=['1回目','2回目','3回目','4回目'];
const pads=['手前','中央','奥'];
export const RAIN_WORKS_STAGES=[
 {vehicle:'excavator',name:'ショベルカー',jobs:repeatedWork(['手前左','手前右','奥左','奥右'],area=>[
  worksOp('aim','right',area+'の掘る印へ旋回しよう',6),worksOp('dig','lower',area+'の深さの線までバケットを下ろそう',7),
  worksOp('scoop','work','バケットを閉じて土をすくおう',8),worksOp('lift','raise','積み込める高さまで持ち上げよう',6),
  worksOp('swing','left','ダンプカーの荷台へ旋回しよう',6),worksOp('load','release','荷台へ土を下ろそう',5),
 ])},
 {vehicle:'dump',name:'ダンプカー',jobs:repeatedWork(numbered,area=>[
  worksOp('drive','forward',area+'の土を荷下ろし場所へ運ぼう',10),
  worksOp('park','back','荷台を黄色い枠に合わせよう',6),
  worksOp('tip','raise','荷台を上げて土を下ろそう',8),
  worksOp('reset','lower','荷台を最後まで下げよう',5),
  worksOp('return','back','積み込み場所に戻ろう',8),
 ])},
 {vehicle:'soil',name:'土ローダー',jobs:repeatedWork(['左の足元','右の足元','受け槽の足元'],area=>[
  worksOp('scoop','work','山から土をすくおう',10),worksOp('drive','forward',area+'まで土を運ぼう',12),
  worksOp('spread','lower',area+'を高さの印までならそう',13),worksOp('return','back','土の山へ戻ろう',8),
 ])},
 {vehicle:'truck',name:'ミキサー車',jobs:repeatedWork(numbered.slice(0,3),area=>[
  worksOp('sand','work',area+'の砂と砂利を目盛りまで入れよう',12),worksOp('cement','release','セメントと練り水を目盛りまで入れよう',10),
  worksOp('mix','work','ドラムを回して生コンを練ろう',13),worksOp('transfer','lower','練った生コンをポンプ車へ渡そう',11),
 ])},
 {vehicle:'pump',name:'ポンプ車',jobs:[
  worksOp('deploy','work','車体の支えを広げよう',8),
  ...repeatedWork(pads,area=>[
   worksOp('aim','right',area+'の型枠にホースの先を合わせよう',8),
   worksOp('pour','work',area+'の型枠を高さの線まで満たそう',17),
   worksOp('finish','left',area+'を端から端まで均等に満たそう',14),
  ]),
  worksOp('stow','lower','ポンプ車の支持脚をしまおう',8),
 ]},
 {vehicle:'crane',name:'クレーン車',jobs:[
  worksOp('deploy','work','車体の支えを広げよう',10),
  ...repeatedWork(['上流部材','下流部材'],area=>[
   worksOp('aim','left',area+'の吊り金具へブームを合わせよう',8),worksOp('hook','lower','フックを吊り金具まで下ろそう',9),
   worksOp('lift','raise','支え台より高くつり上げよう',10),worksOp('swing','right','黄色い据え付け枠まで旋回しよう',13),
   worksOp('lower','lower','継ぎ目の線を見ながら部材を降ろそう',12),
  ]),
  worksOp('stow','raise','フックを外して上げよう',10),
 ]},
 {vehicle:'water',name:'給水車',jobs:repeatedWork(['少ない流量','通常の流量'],area=>[
  worksOp('fill','work',area+'の試験に必要な水を汲もう',10),
  worksOp('drive','forward','水路の注水口まで運ぼう',11),
  worksOp('pour','release',area+'で流し、受け槽に届くか見よう',18),
  worksOp('recover','work','試験水を給水車へ回収しよう',15),
  worksOp('return','back','給水槽へ戻ろう',10),
  worksOp('drain','release','回収した試験水を給水槽へ戻そう',8),
 ])},
];
let workOffset=0;
export const RAIN_WORKS_JOBS=RAIN_WORKS_STAGES.flatMap(({vehicle,name,jobs},stage)=>{
 const offset=workOffset;workOffset+=jobs.length;
 return jobs.map((job,index)=>({...job,vehicle,name,stage,index,offset,last:index===jobs.length-1}));
});
export const RAIN_WORKS_HAUL_STEP=RAIN_WORKS_JOBS.findIndex(job=>job.vehicle==='dump');
export const RAIN_WORKS_FOUNDATION_STEP=RAIN_WORKS_JOBS.findIndex(job=>job.vehicle==='soil');
export const RAIN_WORKS_MIXER_STEP=RAIN_WORKS_JOBS.findIndex(job=>job.vehicle==='truck');
export const RAIN_WORKS_CONCRETE_BATCHES=RAIN_WORKS_STAGES[3].jobs.filter(job=>job.id==='transfer').length;
const pumpIntakeStep=RAIN_WORKS_JOBS.findIndex(job=>job.vehicle==='pump'&&job.id==='aim');
const pumpStowStep=RAIN_WORKS_JOBS.findIndex(job=>job.vehicle==='pump'&&job.id==='stow');
export const RAIN_WORKS_CUT_CELLS=Object.freeze([[-39,1],[-9,1],[-39,30],[-9,30]].map(Object.freeze));
export function rainWorksCutOrder(record){
  if(record.excavationOrder)return record.excavationOrder;
  return RAIN_WORKS_JOBS.slice(0,Math.min(record.step,RAIN_WORKS_STAGES[0].jobs.length))
    .filter(job=>job.id==='scoop').map(job=>job.batch);
}
export function advanceRainWorksExcavation(record,action){
  const job=RAIN_WORKS_JOBS[record.step],scoop=action.type==='scoop-marked-soil';
  const order=rainWorksCutOrder(record);
  if(job?.vehicle!=='excavator'||!(scoop?['aim','dig','scoop']:['lift','swing','load']).includes(job.id)){
    throw Error('作業の順番が合っていません。');
  }
  if(scoop&&(!Number.isInteger(action.cell)||!RAIN_WORKS_CUT_CELLS[action.cell]||order.includes(action.cell))){
    throw Error('まだ掘っていない土を選ぼう。');
  }
  return {...record,step:job.index-job.index%6+(scoop?4:6),excavationOrder:scoop?[...order,action.cell]:order};
}

// Previous saves can finish depositing a bucket already filled at the old pads.
const legacyCutZonesByCorner=new Map(sharedParkingLayouts().map(({corner,orientation:{sx,sz}})=>[
  corner,Object.freeze([[-1695,-527],[-1615,-527],[-1695,-347],[-1615,-347]].map(([x,z],cell)=>Object.freeze({
    cell,minX:x*sx-32,maxX:x*sx+32,minZ:z*sz-32,maxZ:z*sz+32,
  }))),
]));
const noCutZones=Object.freeze([]);
const summitCutZones=new Map(sharedParkingLayouts().map(({corner})=>[corner,Object.freeze([Object.freeze(quarryRangeSummitBench(corner))])]));
export const rainWorksCutZones=corner=>summitCutZones.get(corner)??noCutZones;

export const RAIN_EXCAVATOR_TRIAL_MS=90_000;
export const RAIN_DUMP_ARRIVAL_MS=180_000;
const RAIN_DUMP_UNLOAD_MS=35_000;
const SUMMIT_LOAD_SECONDS=900;
export const rainConstructionTrialLimit=kind=>kind==='dump-unload'?RAIN_DUMP_UNLOAD_MS:
  kind==='summit-load'?SUMMIT_LOAD_SECONDS*1000:kind==='excavator-arrival'?240_000:kind==='dump-arrival'||kind==='dump-haul'?RAIN_DUMP_ARRIVAL_MS:RAIN_EXCAVATOR_TRIAL_MS;

function dumpRoutePath(garage,waypoints,bay){
 const points=[garage,...waypoints,bay],path=[];
 let start=0;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
  path.push({a,b,dx,dz,length,start});start+=length;
 }
 return path;
}
const dumpArrivalRoutes=new Map(sharedParkingLayouts().map(({corner,orientation:{sx,sz},vehicles,pavement})=>{
 const point=([x,z,radius,height=0])=>Object.freeze({x:x*sx,z:z*sz,radius,height});
 const bench=quarryRangePose(corner,quarryRangeLength-50);
 // Align the bed opening with the excavator's reachable swing from its summit work spot.
 const bay=Object.freeze({...bench,x:bench.x+3*sx,z:bench.z-55*sz,heading:-bench.heading,width:92,depth:140,radius:0});
 const waypoints=[[-2260,-1420,34],[-2335,-1350,32],[-2580,-1358,39],[-2644,-1318,34],[-2692,-1232,40]].map(point);
 const approachEnd=quarryRangeLength-350;
 for(let distance=48;distance<approachEnd;distance+=44){
  const p=quarryRangePose(corner,distance);
  waypoints.push(Object.freeze({...p,radius:58}));
 }
 const hillStart=5,descentHill=waypoints.slice(hillStart-1).reverse(),summitStart=waypoints.length;
 // An empty truck needs 65 / steeringFactor for a full-lock radius.
 // Leave a straight approach at the end so the driver can see the bay.
 const radius=Math.ceil(65/CONSTRUCTION_STEERING_FACTOR)+3,turnX=-4880,turnZ=189+radius;
 const summitTurns=[[-4510,268,44,404],[-4640,342,38,409],[turnX+90,189+2*radius,36,417]];
 for(let i=0;i<=8;i++){
  const angle=i*Math.PI/8;
  summitTurns.push([turnX-radius*Math.sin(angle),turnZ+radius*Math.cos(angle),28,417]);
 }
 const summitCurve=summitTurns.map(point);
 waypoints.push(...summitCurve);
 const storageRoad=[[-2630,-1305,60],[-2510,-1362,62],[-2120,-1362,68],[-1765,-1362,60],[-1690,-1197,58],[-1635,-975,45]].map(point);
 const descent=Object.freeze([point([-4585,223,52,408]),...descentHill,...storageRoad]);
 const garage=vehicles.find(v=>v.id==='dump');
 return [corner,Object.freeze({bay,pavement,garage,waypoints:Object.freeze(waypoints),descent,hillStart,summitStart,
  path:dumpRoutePath(garage,waypoints,bay),exitSide:sx>0?'西':'東',garageTurn:sx*sz>0?'右':'左'})];
}));
export const rainDumpOutsideGarage=(route,x,z)=>!route.pavement.some(({minX,maxX,minZ,maxZ})=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ);
export function rainDumpHaulRoute(work){
 const route=rainDumpArrivalRoute(work),soil=work.frame.soil,bin=nativeStorageBin(soil),[ox,oz]=soil.field.origin,sign=bin.approachSign??1;
 const bay=Object.freeze({x:ox+bin.x,z:oz+bin.z+sign*74,heading:sign>0?0:Math.PI,width:88,depth:120});
 const garage=route.bay,waypoints=route.descent;
 return Object.freeze({...route,garage,bay,waypoints,path:dumpRoutePath(garage,waypoints,bay)});
}
export function rainDumpRoutePosition(route,position,guess=null){
 const path=route.path;
 function nearest(first,last){
  let best=null,rank=Infinity;
  for(let i=first;i<last;i++){
   const {a,b,dx,dz,length,start}=path[i];
   const t=length?Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.z-a.z)*dz)/(length*length))):0;
   const x=a.x+dx*t,z=a.z+dz*t,distance=Math.hypot(position.x-x,position.z-z);
   const height=(a.height??0)+((b.height??0)-(a.height??0))*t;
   const cost=distance+Math.abs((position.height??height)-height)*2.5;
   if(cost<rank-1e-6||cost===rank&&i===guess){rank=cost;best={index:i,along:start+length*t,distance,x,z};}
  }
  return best;
 }
 if(guess===null)return nearest(0,path.length);
 const nearby=nearest(Math.max(0,guess-3),Math.min(path.length,guess+6));
 return nearby.distance<144?nearby:nearest(0,path.length);
}
export function rainDumpGuidancePoints(route,position,progress){
 if(!rainDumpOutsideGarage(route,position.x,position.z))return [];
 const snap=typeof progress==='number'?rainDumpRoutePosition(route,position,progress):progress;
 const points=[];
 let target=Math.ceil((snap.along+39)/49)*49;
 for(let i=snap.index;i<route.path.length&&points.length<3;i++){
  const {a,dx,dz,length,start}=route.path[i];
  if(!length)continue;
  while(target<=start+length&&points.length<3){
   const t=(target-start)/length,x=a.x+dx*t,z=a.z+dz*t;
   if(rainDumpOutsideGarage(route,x,z))points.push({x,z,heading:Math.atan2(dx,dz)});
   target+=49;
  }
 }
 return points;
}
export const rainDumpArrivalRoute=work=>dumpArrivalRoutes.get(work?.frame.soil.field?.corner)??null;
export function rainExcavatorRoute(work){
 const route=rainDumpArrivalRoute(work);
 if(!route)return null;
 const layout=sharedParkingLayouts().find(l=>l.corner===work.frame.soil.field.corner);
 const garage=layout.vehicles.find(v=>v.id==='excavator'),{sx,sz}=layout.orientation;
 const bay={...route.bay,x:-4882*sx,z:210*sz,heading:sz>0?0:Math.PI,width:72,depth:85};
 // The parked truck occupies the direct line to the excavator bay. Lead the
 // excavator along the open side of the apron, then turn toward the cutting face.
 const summitApproach=[[-4548,217,407],[-4630,107,393],[-4820,103,388],[-4904,111,395],[-4911,150,416],[-4892,181,417]]
  .map(([x,z,height])=>({x:x*sx,z:z*sz,height,radius:38}));
 const waypoints=[{x:garage.x,z:-1420*sz,radius:34,height:0},{x:garage.x,z:-1358*sz,radius:34,height:0},
   ...route.waypoints.slice(2,route.summitStart),...summitApproach];
 return {...route,garage,bay,waypoints,path:dumpRoutePath(garage,waypoints,bay)};
}
export function rainExcavatorPoint(work){
 const v=work.frame.machineVehicle,[ox,oz]=work.frame.soil.field.origin;
 return {x:ox+v.x,z:oz+v.z,heading:v.heading,height:v.groundY??0};
}
export function rainExcavatorParked(work,route){
 if(work.mode!=='excavating'||!route)return false;
 const p=rainExcavatorPoint(work);
 return Math.hypot(p.x-route.bay.x,p.z-route.bay.z)<=27&&Math.abs(p.height-route.bay.height)<=8;
}
export function rainDumpWorldPoint(work){
 const [x,z]=work.frame.soil.field.origin,dump=work.frame.dump;
 return {x:x+dump.x,z:z+dump.z,heading:dump.heading,height:dump.groundY??0};
}
export function rainDumpParked(work,route=rainDumpArrivalRoute(work),requireFooting=false){
 if(!route||work.mode!=='driving')return false;
 const {x,z,heading}=rainDumpWorldPoint(work),bay=route.bay;
 const angle=Math.atan2(Math.sin(heading-bay.heading),Math.cos(heading-bay.heading));
 return Math.abs(x-bay.x)<=17&&Math.abs(z-bay.z)<=14&&Math.abs(angle)<=.16&&Math.abs((work.frame.dump.groundY??0)-bay.height)<=4&&
  (!requireFooting||[-1,1].some(side=>dumpDoorFooting(work.frame,side)));
}
export function rainDumpRouteStart(work,route){
 return rainDumpRoutePosition(route,rainDumpWorldPoint(work)).index;
}

// Native soil commands record two-unit cells relative to the original field.
// Credit a cut only when all of its earth came from one marked pad.
function matchCutZone(transfer,field,zones=rainWorksCutZones(field.corner)){
  if(transfer?.type!=='reserve-batch'||transfer.to!=='bucket'||transfer.materialId!=='earth-soil'||
    transfer.segments.some(segment=>segment.from!=='terrain'))return null;
  const positions=transfer.segments.flatMap(segment=>segment.positions);
  const [ox,oz]=field.origin;
  const matching=zones.filter(({minX,maxX,minZ,maxZ})=>positions.every(([x,,z])=>{
    const worldX=ox+x*2+1,worldZ=oz+z*2+1;
    return worldX>=minX&&worldX<maxX&&worldZ>=minZ&&worldZ<maxZ;
  }));
  return positions.length&&matching.length===1?{cell:matching[0].cell,amount:positions.length}:null;
}

export function rainExcavatorTrialCut(work,plan){
  const field=work?.frame.soil.field;
  if(!field||!plan?.cuts?.length)return null;
  return matchCutZone({type:'reserve-batch',to:'bucket',materialId:'earth-soil',segments:plan.cuts},field);
}

export function rainConstructionTrialKind(story,work){
  const soil=work?.frame.soil;
  if(soil?.schema!==3||story?.cargo)return null;
  const vehicle=RAIN_WORKS_JOBS[story?.step]?.vehicle;
  if(vehicle==='dump'&&story.excavatorTrial)return story.dumpAtStorage?'dump-unload':'dump-haul';
  if(vehicle!=='excavator')return null;
  const transfer=completedTransfer(soil.journal,soil.journal.length-1),scooped=story.excavatorScoop;
  if(story.dumpArrival&&scooped&&transfer?.transferId===scooped.id&&
    matchCutZone(transfer,soil.field,story.quarryArrival?undefined:legacyCutZonesByCorner.get(soil.field.corner))?.amount===soil.containers.bucket.amount)return 'excavator-load';
  return story.quarryArrival?'excavator-scoop':'dump-arrival';
}

export function completeRainConstructionTrial(story,beforeWork,work,trial,dumpCapacity,storagePlan){
  const before=beforeWork?.frame.soil,soil=work?.frame.soil,kind=rainConstructionTrialKind(story,beforeWork);
  const limit=rainConstructionTrialLimit(kind);
  if(!kind||trial.type!==kind||soil?.schema!==3||before.pending||soil.pending||
    !Number.isFinite(trial.elapsedMs)||trial.elapsedMs<0||trial.elapsedMs>=limit)return null;
  if(kind==='dump-arrival'){
    if(beforeWork.mode!=='driving'||!story.dumpArrival&&before.containers.dump.amount!==0||soil.revision!==before.revision||
      work.vehicleTravel-beforeWork.vehicleTravel<40||!rainDumpParked(work,undefined,trial.course===true))return null;
    return {...story,dumpArrival:true,quarryArrival:true};
  }
  if(kind==='dump-haul'||kind==='dump-unload'){
    if(beforeWork.mode!=='driving'||work.mode!=='driving'||beforeWork.unload||work.unload||before.containers.dump.amount!==dumpCapacity)return null;
    if(kind==='dump-haul')return soil.revision===before.revision&&storagePlan(work)?.amount===dumpCapacity?{...story,dumpAtStorage:true}:null;
    if(storagePlan(beforeWork)?.amount!==dumpCapacity||soil.containers.dump.amount!==0||
      soil.containers.storage.amount-before.containers.storage.amount!==dumpCapacity)return null;
    let deposited=0;
    for(let i=before.journal.length;i<soil.journal.length;i+=3){
      const transfer=completedTransfer(soil.journal,i+2);
      if(transfer?.from!=='dump'||transfer.to!=='storage'||transfer.materialId!=='earth-soil')return null;
      deposited+=transfer.amount;
    }
    if(deposited!==dumpCapacity)return null;
    const {dumpAtStorage,...record}=story;
    return {...record,step:RAIN_WORKS_FOUNDATION_STEP};
  }
  if(beforeWork.mode!=='excavating'||work.mode!=='excavating'||soil.journal.length<before.journal.length+3)return null;
  const transfer=completedTransfer(soil.journal,soil.journal.length-1);
  if(kind==='excavator-scoop'){
    const cut=matchCutZone(transfer,soil.field);
    if(before.containers.bucket.amount!==0||!cut||cut.cell!==trial.cell||soil.containers.bucket.amount!==cut.amount)return null;
    return {...story,excavatorScoop:{id:transfer.transferId,cell:cut.cell}};
  }
  const added=soil.containers.dump.amount-before.containers.dump.amount;
  if(transfer?.from!=='bucket'||transfer.to!=='dump'||transfer.materialId!=='earth-soil'||added<=0||
    added!==transfer.amount||before.containers.bucket.amount-soil.containers.bucket.amount!==added)return null;
  const {excavatorScoop,...record}=story;
  return soil.containers.dump.amount===dumpCapacity
    ?{...record,step:RAIN_WORKS_HAUL_STEP,excavatorTrial:{cell:excavatorScoop.cell}}
    :record;
}

export function completeSummitMission(kind,story,before,work,trial,capacity,storagePlan){
 if(trial.type!==kind||!Number.isFinite(trial.elapsedMs)||trial.elapsedMs<0||trial.elapsedMs>=rainConstructionTrialLimit(kind))return null;
 if(kind==='excavator-arrival'){
  const from=rainExcavatorPoint(before),to=rainExcavatorPoint(work);
  const travel=Math.max(Math.hypot(to.x-from.x,to.z-from.z),Math.abs(work.frame.machineVehicle.wheelTravel-before.frame.machineVehicle.wheelTravel));
  return before.mode==='excavating'&&travel>=40&&rainExcavatorParked(work,rainExcavatorRoute(work))?story:null;
 }
 if(kind!=='summit-load')return completeRainConstructionTrial(story,before,work,trial,capacity,storagePlan);
 const a=before.frame.soil,b=work.frame.soil;
 if(work.mode!=='excavating'||before.mode!=='excavating'||a.pending||b.pending||a.containers.dump.amount>=capacity||b.containers.dump.amount!==capacity)return null;
 let loaded=0,cutAmount=0;
 for(let i=a.journal.length;i<b.journal.length;i++){
  if(b.journal[i].type!=='complete')continue;
  const transfer=completedTransfer(b.journal,i);
  if(transfer?.to==='bucket'){
   const cut=matchCutZone(transfer,b.field);
   if(!cut)return null;
   cutAmount+=cut.amount;
  }else if(transfer?.from==='bucket'&&transfer.to==='dump'&&transfer.materialId==='earth-soil')loaded+=transfer.amount;
  else return null;
 }
 if(loaded!==capacity-a.containers.dump.amount||loaded+b.containers.bucket.amount!==cutAmount+a.containers.bucket.amount)return null;
 const {excavatorScoop,...progress}=story;
 return {...progress,step:RAIN_WORKS_HAUL_STEP,excavatorTrial:{cell:0}};
}
function completedTransfer(journal,index){
  const complete=journal[index],release=journal[index-1],reserve=journal[index-2];
  if(complete?.type!=='complete'||release?.type!=='release'||
    !['reserve','reserve-batch','reserve-loose'].includes(reserve?.type)||
    complete.transferId!==release.transferId||complete.transferId!==reserve.transferId)return null;
  return reserve;
}

function lastBucketCut(soil,from){
  for(let i=from;i>=2;i--){
    const transfer=completedTransfer(soil.journal,i);
    if(transfer&&(transfer.from==='bucket'||transfer.to==='bucket'))return matchCutZone(transfer,soil.field,legacyCutZonesByCorner.get(soil.field.corner));
  }
  return null;
}

// The truck can unload in several batches. Only a completed transfer to
// storage counts, including a delivery saved before the chapter was wired.
export function rainWorksDepositRecorded(soil){
 if(soil?.schema!==3||soil.pending)return false;
 for(let i=soil.journal.length-1;i>=2;i--){
  const transfer=completedTransfer(soil.journal,i);
  if(transfer?.from==='dump'&&transfer.to==='storage'&&transfer.materialId==='earth-soil')return true;
 }
 return false;
}

export function rainWorksDumpCompleted(record,before,after){
 if(RAIN_WORKS_JOBS[record?.step]?.vehicle!=='dump'||record.cargo||after?.mode!=='driving'||after.unload)return false;
 const soil=after.frame.soil,previous=before.frame.soil,transfer=completedTransfer(soil.journal,soil.journal.length-1);
 return soil.schema===3&&!soil.pending&&soil.journal.length>previous.journal.length&&
  transfer?.from==='dump'&&transfer.to==='storage'&&transfer.materialId==='earth-soil'&&
  soil.containers.storage.amount>previous.containers.storage.amount;
}

// Exported for guidance after a player empties the bucket away from the truck.
// They can take another real scoop from the same pad without losing progress.
const markedBucketCache=new WeakMap();
export function hasRainWorksMarkedBucket(record,work){
  const soil=work?.frame?.soil;
  if(!record||soil?.schema!==3||!soil.containers.bucket.amount)return false;
  let result=markedBucketCache.get(soil);
  if(result?.revision!==soil.revision){
    result={revision:soil.revision,cut:lastBucketCut(soil,soil.journal.length-1)};
    markedBucketCache.set(soil,result);
  }
  const {cut}=result;
  return !!cut&&cut.cell===rainWorksCutOrder(record).at(-1)&&cut.amount===soil.containers.bucket.amount;
}

// Both native save paths call this after checking their append-only journal.
// Credit lives in the same commit as the physical operation, including retries.
export function readRainWorksTransportAction(record,beforeWork,afterWork){
  const job=RAIN_WORKS_JOBS[record?.step],before=beforeWork?.frame?.soil,after=afterWork?.frame?.soil;
  if(record?.cargo||job?.vehicle!=='excavator'||afterWork?.mode!=='excavating'||before?.schema!==3||after?.schema!==3||
    after.journal.length<=before.journal.length||after.pending)return null;
  const end=after.journal.length-1,transfer=completedTransfer(after.journal,end);
  if(!transfer||transfer.materialId!=='earth-soil')return null;

  const order=rainWorksCutOrder(record);
  if(['aim','dig','scoop'].includes(job.id)){
    const cut=matchCutZone(transfer,after.field,legacyCutZonesByCorner.get(after.field.corner));
    if(!cut||order.includes(cut.cell)||after.containers.bucket.amount!==cut.amount)return null;
    return {type:'scoop-marked-soil',step:record.step,cell:cut.cell};
  }
  if(transfer.type!=='reserve'||transfer.from!=='bucket'||transfer.to!=='dump'||after.containers.bucket.amount!==0)return null;
  const cut=lastBucketCut(after,end-3);
  if(!cut||cut.cell!==order.at(-1)||cut.amount!==transfer.amount||after.containers.dump.amount<transfer.amount)return null;
  return {type:'load-marked-soil',step:record.step};
}

export const RAIN_WORKS_KIT=Object.freeze({id:'amane-intake-coupling-v1',parts:Object.freeze([
 Object.freeze({id:'upstream',length:33,width:21,drop:1.75}),
 Object.freeze({id:'downstream',length:33,width:21,drop:1.75}),
])});
export const RAIN_WORKS_WATER_TESTS=Object.freeze([24,48]);

// Volume moves through the inlet, the two pieces and their outlet before
// reaching the catch tank. A dry channel cannot fill the catch tank.
export function rainWorksWater(batch,operation,progress,connected=2){
 const capacity=RAIN_WORKS_WATER_TESTS[batch],p=Math.max(0,Math.min(1,progress));
 const water={source:capacity,truck:0,sections:[0,0,0,0],catchTank:0,returned:0,spill:0};
 if(operation==='fill'||operation==='drive'){
  water.truck=capacity*(operation==='drive'?1:p);water.source-=water.truck;return water;
 }
 water.source=0;
 if(operation==='pour'){
  const drawn=capacity*Math.min(1,p/.80);
  water.truck=capacity-drawn;
  let sent=drawn;
  for(let i=0;i<water.sections.length;i++){
   if(i===connected+1&&connected<2){water.spill=sent;sent=0;break;}
   const out=capacity*Math.max(0,Math.min(1,(p-(i+1)*.048)/.8));
   water.sections[i]=sent-out;sent=out;
  }
  water.catchTank=sent;return water;
 }
 if(operation==='recover'){
  water.catchTank=capacity*(1-p);water.truck=capacity*p;
 }else if(operation==='return'){
  water.truck=capacity;
 }else{
  water.truck=capacity*(1-p);water.returned=capacity*p;
 }
 return water;
}

export const SHOVEL_ICON='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36" aria-hidden="true"><path d="M16 3h8v7h-8z" fill="none" stroke="#547b88" stroke-width="3"/><path d="M20 10v16" stroke="#a27342" stroke-width="4"/><path d="M12 25h16v5c0 5-8 8-8 8s-8-3-8-8z" fill="#89b5c5" stroke="#547b88" stroke-width="2"/></svg>';

const foundationAnchors=[[-1500,-804],[-1412,-804],[-1324,-804]];
const corners=new Map(sharedParkingLayouts().map(p=>[p.corner,p.orientation]));
export const RAIN_FOUNDATION_NAMES=Object.freeze(['上流側の台座','下流側の台座','受け槽の台座']);
export const RAIN_FOUNDATION_PAD_SOIL=32;
export const RAIN_FOUNDATION_LOAD=RAIN_FOUNDATION_NAMES.length*RAIN_FOUNDATION_PAD_SOIL;

// Align each 16 by 8 foundation with the same native earth grid used
// by collision, terrain rendering and the transport journal.
export function rainFoundationPad(field,batch){
 const position=foundationAnchors[batch],orientation=corners.get(field?.corner);
 if(!position||!orientation)return null;
 const [ox,oz]=field.origin,{sx,sz}=orientation;
 const x=Math.floor((position[0]*sx-ox)/8)*8,z=Math.floor((position[1]*sz-oz)/8)*8;
 return {x:ox+x+8,z:oz+z+4,pieces:[[x/2,0,z/2],[x/2+4,0,z/2]]};
}

// Finished work in the assembly yard is restored at the same control positions.
const workshopPoseLimits={
 truck:{chute:[0,1],drum:[0,2*Math.PI]},
 pump:{deployment:[0,1],nozzle:[-51,51],nozzleY:[12,30]},
 crane:{deployment:[0,1],slew:[-1.57,1.57],reach:[42,152],hookY:[5,70],holding:null},
 water:{x:[-190,-114],z:[15,156],heading:[-Math.PI,Math.PI]},
};
export function captureRainWorksPose(vehicle,machine){
 const limits=workshopPoseLimits[vehicle];
 if(!limits)return undefined;
 const pose=Object.fromEntries(Object.keys(limits).map(key=>[key,machine[key]]));
 if(vehicle==='truck')pose.drum=(pose.drum%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
 return pose;
}
export function validRainWorksPose(vehicle,pose){
 const limits=workshopPoseLimits[vehicle];
 return !!(limits&&pose&&Object.keys(pose).length===Object.keys(limits).length&&
  Object.entries(limits).every(([key,range])=>range?
   Number.isFinite(pose[key])&&pose[key]>=range[0]&&pose[key]<=range[1]:typeof pose[key]==='boolean'));
}
export function validRainWorksResult(job,result){
 if(!job||result?.progress!==1||!validRainWorksPose(job.vehicle,result.pose))return false;
 const p=result.pose;
 if(job.vehicle==='water'&&job.id==='pour'){
  return result.water?.catchTank===RAIN_WORKS_WATER_TESTS[job.batch]&&result.water.spill===0;
 }
 if(job.vehicle==='pump'&&job.id==='receive'){
  return p.deployment>=.98&&result.received===RAIN_WORKS_CONCRETE_BATCHES;
 }
 if(job.vehicle==='pump'&&job.id==='retract')return p.deployment>=.95&&result.hoseStowed===true;
 if(job.vehicle==='pump'&&job.id==='finish'){
  return Array.isArray(result.coverage)&&['left','middle','right'].every(edge=>result.coverage.includes(edge));
 }
 if(job.id==='deploy')return p.deployment>=.98;
 if(job.id==='stow')return p.deployment<.03&&(job.vehicle!=='crane'||p.hookY>37);
 if(job.vehicle==='crane'){
  if(['hook','lift','swing'].includes(job.id))return p.holding;
  if(job.id==='lower')return !p.holding;
 }
 return job.id!=='transfer'||p.chute>.84;
}

const missions=[];
function board(vehicle,name){missions.push({id:'board-'+vehicle,vehicle,title:name+'に乗ってみよう。',kind:'boarding',seconds:0});}
function trial(id,vehicle,title,seconds){missions.push({id,vehicle,title,kind:'transport',seconds});}
board('dump','ダンプカー');
trial('dump-arrival','dump','制限時間内にダンプカーで採土場を目指そう',180);
board('excavator','ショベルカー');
trial('excavator-arrival','excavator','ショベルカーで山の頂上を目指そう',240);
trial('summit-load','excavator','ショベルカーで山の頂上の土を掘り、ダンプカー満杯になるまで土を乗せよう',SUMMIT_LOAD_SECONDS);
trial('dump-haul','dump','満載のダンプカーを保管庫まで運ぼう',180);
trial('dump-unload','dump','荷台の土を保管庫へ下ろそう',35);
board('soil','アマネ星土ローダー');
missions.push({id:'foundation-load',kind:'foundation',vehicle:'soil',batch:0,op:'load',step:RAIN_WORKS_FOUNDATION_STEP,title:'保管庫で三つの台座に使う土を積もう',seconds:120});
for(const [batch,name] of RAIN_FOUNDATION_NAMES.entries()){
 missions.push({id:'foundation-'+batch+'-place',kind:'foundation',vehicle:'soil',batch,op:'place',step:RAIN_WORKS_FOUNDATION_STEP+batch*4,title:name+'に土を運んで敷こう',seconds:120});
}
for(let step=RAIN_WORKS_MIXER_STEP;step<RAIN_WORKS_JOBS.length;step++){
 const job=RAIN_WORKS_JOBS[step];
 if(!job.index)board(job.vehicle,job.name);
 missions.push({id:'works-'+step,kind:'works',vehicle:job.vehicle,step,title:job.label,seconds:Math.max(60,job.seconds*5)});
}
export const CONSTRUCTION_MISSIONS=Object.freeze(missions.map(Object.freeze));
export function constructionCourse(world){
 if(world?.constructionCourseV1)return world.constructionCourseV1;
 const old=world?.rainWorksV1;
 let index=0;
 if(old?.cargo||old?.step===RAIN_WORKS_JOBS.length)index=missions.length;
 else if(old?.step>=RAIN_WORKS_MIXER_STEP)index=missions.findIndex(m=>m.kind==='works'&&m.step===old.step)-(RAIN_WORKS_JOBS[old.step].index===0?1:0);
 else if(old?.step>=RAIN_WORKS_FOUNDATION_STEP){
  const batch=RAIN_WORKS_JOBS[old.step].batch,loaded=world.constructionTransport?.work?.frame.soil?.containers.rainLoader?.amount;
  index=missions.findIndex(m=>m.batch===batch&&m.op===(loaded||batch?'place':'load'))-(!batch&&!loaded&&old.step===RAIN_WORKS_FOUNDATION_STEP?1:0);
 }else if(old?.dumpAtStorage)index=6;
 else if(old?.step>=RAIN_WORKS_HAUL_STEP)index=5;
 else if(old?.excavatorScoop||old?.step>0)index=4;
 else if(old?.quarryArrival)index=2;
 else if(world?.constructionResume?.kind==='transport'){
  const mode=world.constructionTransport?.work?.mode;
  if(mode==='driving')index=1;
  if(mode==='excavating')index=3;
 }
 return {index,started:false};
}
// Pump operations added to existing checkpoints leave recorded mission indices intact.
const pumpInsertions=new Map([
 [pumpIntakeStep,{flag:'pumpReceived',id:'pump-receive',operation:'receive',title:'ミキサー車が届けた生コンを受け取ろう'}],
 [pumpStowStep,{flag:'pumpHoseStowed',id:'pump-retract',operation:'retract',title:'ポンプ車のホースをしまおう'}],
].map(([step,{flag,id,operation,title}])=>[step,{flag,
 mission:Object.freeze({id,kind:'works',vehicle:'pump',step,title,seconds:60}),
 job:Object.freeze({...RAIN_WORKS_JOBS[step],id:operation,label:title}),
}]));
export function validPumpCheckpoints(course,step){
 const current=missions[course.index];
 for(const [at,{flag}] of pumpInsertions)if(course[flag]!==undefined&&
   (course[flag]!==true||current?.step!==at||step!==at))return false;
 return true;
}
export function constructionWorkshopJob(mission){
 const extra=pumpInsertions.get(mission?.step);
 return extra&&extra.mission.id===mission?.id?extra.job:RAIN_WORKS_JOBS[mission?.step];
}
export function constructionMission(world){
 const course=constructionCourse(world),mission=missions[course.index];
 const extra=pumpInsertions.get(mission?.step);
 return extra&&!course[extra.flag]?extra.mission:mission;
}
export function constructionVehicleUnlocked(world,vehicle){
 const first=missions.findIndex(m=>m.kind==='boarding'&&m.vehicle===vehicle);
 const {index,started}=constructionCourse(world);
 return first<0||index>first||index===first&&started;
}
export function courseChapterStep(course){
 const mission=missions[course.index];
 if(!mission)return RAIN_WORKS_JOBS.length;
 if(mission.step!==undefined)return mission.step;
 if(mission.kind==='boarding'&&course.index>=7)return missions[course.index+1].step;
 return course.index>=5?RAIN_WORKS_HAUL_STEP:0;
}
export function advanceConstructionCourse(world,id,kind){
 const course=constructionCourse(world),mission=constructionMission(world);
 if(mission?.id!==id||mission.kind!==kind)throw Error('現在のミッションを確認してください。');
 if(kind==='boarding'&&!course.started)throw Error('まず乗車ミッションを始めてください。');
 const extra=pumpInsertions.get(mission.step);
 if(extra?.mission===mission)return {index:course.index,started:false,[extra.flag]:true};
 return {index:course.index+1,started:false};
}
const CONSTRUCTION_START_SIGNAL_MS=700;
export const CONSTRUCTION_MISSION_INTRO_MS=3000+CONSTRUCTION_START_SIGNAL_MS;
export function constructionMissionIntroText(remaining){
 return remaining>CONSTRUCTION_START_SIGNAL_MS?String(Math.ceil((remaining-CONSTRUCTION_START_SIGNAL_MS)/1000)):'スタート！';
}
export function advanceConstructionMissionIntro(remaining,delta){
 // Keep every displayed count readable after a skipped animation frame.
 return Math.max(0,remaining-Math.max(0,Math.min(100,delta)));
}
const missionIntroStyle=`[data-intro-beat]{
 --count-color:#71f8ee;
 --count-glow:#26cfba;
 position:fixed;
 z-index:190;
 inset:43% auto auto 50%;
 translate:-50% -50%;
 display:grid;
 place-items:center;
 width:max-content;
 max-width:calc(100vw - 22px);
 min-width:1.56em;
 margin:0;
 padding:.04em .29em .12em;
 isolation:isolate;
 pointer-events:none;
 white-space:nowrap;
 font:1000 clamp(4.25rem,14vw,9rem)/1 system-ui,sans-serif;
 letter-spacing:-.06em;
 color:var(--count-color);
 -webkit-text-stroke:.022em #101630;
 text-shadow:0 .064em 0 #101735,0 .095em 0 #091122,0 0 .24em var(--count-glow);
}
[data-intro-beat]::before{
 content:"";
 position:absolute;
 z-index:-1;
 inset:13% -4% 2%;
 border:2px solid var(--count-color);
 border-radius:.16em;
 background:linear-gradient(155deg,#24355a,#081023 76%);
 box-shadow:0 0 .18em var(--count-glow),inset 0 0 .18em #5b78aa82,0 .08em .17em #040718b8;
 transform:skew(-11deg);
}
[data-intro-beat="2"]{--count-color:#ef9dff;--count-glow:#b74ef3}
[data-intro-beat="1"]{--count-color:#ffdf6f;--count-glow:#ff9f32}
[data-intro-beat="go"]{
 --count-color:#fff29b;
 --count-glow:#ff8740;
 font-size:clamp(2.05rem,11vw,6.9rem);
 letter-spacing:-.085em;
 padding:.23em .56em .36em;
}
[data-intro-beat="go"]::before{
 inset:16% .05em 6%;
 border-radius:.12em;
 background:linear-gradient(142deg,#724626 0%,#361c35 52%,#131733 100%);
}
[data-intro-beat="go"]::after{
 content:"";
 width:84%;
 height:3px;
 position:absolute;
 bottom:16%;
 left:8%;
 background:linear-gradient(90deg,transparent,#ffc951 16%,#fff8c6 48%,#ffc951 84%,transparent);
 box-shadow:0 0 9px #ffae51;
}
[data-game-cue="sky"][data-intro-beat]{--count-color:#e1fbff;--count-glow:#599aec}
[data-game-cue="sky"][data-intro-beat="2"]{--count-color:#e6beff;--count-glow:#a365df}
[data-game-cue="sky"][data-intro-beat="1"]{--count-color:#ffe5a8;--count-glow:#e2a85a}
[data-game-cue="sky"][data-intro-beat]::before{border-radius:.36em;background:linear-gradient(150deg,#375a86,#102343 76%)}
[data-game-cue][data-intro-beat="result"]{
 inset:16% auto auto 50%;
 --count-color:#fff0ab;
 --count-glow:#ff9d48;
 font-size:clamp(1.45rem,6.4vw,4rem);
 padding:.28em .63em .42em;
 letter-spacing:-.04em;
}
[data-game-cue="sky"][data-intro-beat="result"]{inset:8% auto auto 50%}
[data-game-cue][data-intro-beat="result"]::before{inset:7% .04em 2%}
[data-game-cue="tournament"][data-intro-beat]{--count-color:#fff9db;--count-glow:#dca44b}
[data-game-cue="ufo"][data-intro-beat]{--count-color:#a6fff5;--count-glow:#3eeabc}
[data-game-cue="ufo"][data-intro-beat]::before{border-radius:.18em;background:linear-gradient(140deg,#165760,#071e32 70%);transform:none}
[data-game-cue="coast"][data-intro-beat]{--count-color:#c8fff3;--count-glow:#33c9b7}
[data-game-cue="music"][data-intro-beat]{--count-color:#ffedd9;--count-glow:#d799d9;font-size:clamp(1.15rem,4vw,2.25rem)}
[data-game-cue][data-intro-beat="result"]{max-width:min(680px,calc(100vw - 30px));width:max-content;text-align:center;white-space:normal;text-wrap:balance}
[data-game-cue]:is([data-game-cue="coast"],[data-game-cue="ufo"])[data-intro-beat="result"]{font-size:clamp(1.2rem,4.8vw,2.75rem)}
[data-intro-beat][hidden]{display:none}
`;
export function showConstructionIntroCue(element,label,beat=label==='スタート！'?'go':label){
 if(!label){
  if(element.dataset.introBeat){
   delete element.dataset.introBeat;
   element.getAnimations().forEach(animation=>animation.cancel());
  }
  return;
 }
 const doc=element.ownerDocument;
 if(!doc.getElementById('construction-intro-style')){
  const style=doc.createElement('style');
  style.id='construction-intro-style';style.textContent=missionIntroStyle;doc.head.append(style);
 }
 if(element.dataset.introBeat===beat)return;
 element.dataset.introBeat=beat;
 element.textContent=label;
 element.getAnimations().forEach(animation=>animation.cancel());
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 element.animate([
  {transform:beat==='go'?'scale(.85) skewX(-7deg)':'scale(.67) rotate(-8deg)',opacity:.86},
  {transform:beat==='go'?'scale(1.12) skewX(-2deg)':'scale(1.15) rotate(3deg)',opacity:1,offset:.37},
  {transform:'scale(1)',opacity:1},
 ],{duration:beat==='go'?390:290,easing:'cubic-bezier(.22,.78,.37,1)'});
}
// A transient layer shared by mini-games. Callers keep ownership of game time.
export function createGameCue(parent,theme){
 const element=parent.ownerDocument.createElement('div');
 element.dataset.gameCue=theme;
 element.hidden=true;
 element.setAttribute('aria-hidden','true');
 parent.append(element);
 let hideTimer;
 function show(label='',result=false){
  if(!result&&element.hidden===!label&&(!label||element.textContent===label))return;
  clearTimeout(hideTimer);
  element.hidden=!label;
  if(result)showConstructionIntroCue(element,'');
  showConstructionIntroCue(element,label,result?'result':undefined);
  if(result&&label)hideTimer=setTimeout(()=>show(),1050);
 }
 return {show,get attached(){return element.parentNode===parent;},remove(){clearTimeout(hideTimer);element.remove();}};
}
const milestoneCues=new WeakMap();
export function celebrateGameEvent(host,label,theme){
 if(!host?.isConnected||!label||host.ownerDocument.hidden)return;
 let entry=milestoneCues.get(host);
 if(entry?.theme!==theme||!entry.cue.attached){
  entry?.cue.remove();
  entry={theme,cue:createGameCue(host,theme)};
  milestoneCues.set(host,entry);
 }
 entry.cue.show(label,true);
}
export function pulseGameMilestone(element,theme='gold'){
 if(!element?.isConnected||element.ownerDocument.hidden)return;
 const view=element.ownerDocument.defaultView;
 if(view?.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const tint=theme==='sky'?'#71e8ff':theme==='music'?'#e8a5ff':'#ffdc79';
 element.animate?.([
  {scale:theme==='music'?'1':'0.93',filter:'drop-shadow(0 0 0 transparent)'},
  {scale:theme==='music'?'1':'1.06',filter:theme==='music'?'brightness(1.12) drop-shadow(0 0 .38rem '+tint+')':'drop-shadow(0 0 .38rem '+tint+')',offset:.34},
  {scale:'1',filter:'drop-shadow(0 0 0 transparent)'}
 ],{duration:570,easing:'cubic-bezier(.22,.78,.37,1)'});
}
export function timedMissionComplete(mission,elapsed){
 return mission?.seconds>0&&Number.isFinite(elapsed)&&elapsed>=0&&elapsed<mission.seconds*1000;
}

