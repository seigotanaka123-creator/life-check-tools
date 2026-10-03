import {foundationVehicleSweepBlocked} from './free-vehicle-shape.mjs';
import {lastProjectOperation} from './project-history.mjs';
import {constructionBase,preparedFrameBuild,supportedWorkMatches} from './free-supported-build.mjs';
import {foundationBoardCount} from './free-foundation-state.mjs';
import {createMixer,availableMixCells,ingredientAmount,startMix,advanceMix,cancelMix} from './mixing.mjs';
import {freeWorkMask,freePlacedFill,freeWorkCells} from './free-work-parts.mjs';
import {rotateFreeWork} from './free-work-rotation.mjs';
import {supportedWorkMoveProblem} from './free-supported-work-move.mjs';
import {freeWorkMoveProblem} from './free-work-move.mjs';
import {freeWorkPartsProblem} from './free-work-placement.mjs';
import {FLOOR_COLORS} from './floor-parts.mjs';
import {FOUNDATION_ACTIONS,validateFoundationDesign,applyFoundation} from './free-foundation-state.mjs';

// One quarter-cup is exactly 128 world volume units. No particles own stock.
export const FREE_GRID=4,FREE_TILE=16,FREE_QUARTER_VOLUME=128;
const fail=message=>{throw Error(message);};
const int=(n,a,b)=>Number.isSafeInteger(n)&&n>=a&&n<=b;
export const freeCell=i=>({x:(i%4-1.5)*16,z:(Math.floor(i/4)-1.5)*16});
export function newFreeBuild(){return{location:null,mask:0,height:2,fill:Array(16).fill(0),stage:'design',elapsedMs:0,bucket:0,wet:0,hose:0,mixer:createMixer(),truck:{x:76,z:64,heading:Math.PI,legs:false},pump:{x:-76,z:48,heading:0,legs:false},aboard:null,connected:false,completed:[],paintUndo:null};}
const specs={PLACE:['x','z'],DESIGN:['mask','height'],FRAME:[],FRAME_RAISED:['height'],UNFRAME:[],FOUNDATION_BUILD:['mask','deckY','bottoms'],FOUNDATION_REMOVE:[],SUPPLY:['cells'],MIX_START:['cells'],MIX_TICK:['elapsedMs'],MIX_CANCEL:[],BUCKET_LOAD:[],BUCKET_RETURN:[],POUR:['source','cell'],RECOVER:[],FINISH:[],CURE:[],CURE_TICK:['elapsedMs'],DEMOLD:[],NEXT:['x','z'],CHANGE_EMPTY_SITE:['x','z'],BOARD:['vehicle'],LEAVE:[],MOVE:['vehicle','x','z','heading'],LEGS:['deployed'],CONNECT:['connected'],PRIME:[],DRAIN:[],PAINT:['work','cell','face','pixels','color','tool'],UNDO_PAINT:[],SET_WORK_PARTS:['work','mask'],MOVE_WORK:['work','x','z'],TRANSFORM_WORK:['work','x','z','quarterTurns'],TRANSFORM_SUPPORTED_WORK:['work','x','z','quarterTurns']};
export function canonicalFreeAction(raw){
 const name=raw.type?.slice(5),keys=specs[name];if(!keys)fail('UNKNOWN_FREE_ACTION');
 if(Object.keys(raw).some(k=>!['type','operationId',...keys].includes(k))||keys.some(k=>!Object.hasOwn(raw,k)))fail('INVALID_FREE_FIELDS');
 const a={type:raw.type,operationId:raw.operationId};for(const k of keys)a[k]=structuredClone(raw[k]);
 for(const k of ['x','z'])if(keys.includes(k)&&!int(a[k],name==='MOVE'?-5200:-2400,name==='MOVE'?5200:2400))fail('施工場所はマップの内側を選んでください。');
 if(keys.includes('mask')&&!int(a.mask,name==='SET_WORK_PARTS'?0:1,65535))fail('型枠を1マス以上選んでください。');
 if(keys.includes('height')&&![2,4,8].includes(a.height))fail('INVALID_FORM_HEIGHT');
 if(keys.includes('cells')&&!int(a.cells,1,8))fail('一度に扱う量は1〜8杯です。');
 if(keys.includes('elapsedMs')&&!int(a.elapsedMs,1,30000))fail('INVALID_FREE_CLOCK');
 if(keys.includes('cell')&&!int(a.cell,0,15))fail('INVALID_FREE_CELL');
 if(keys.includes('vehicle')&&!['truck','pump'].includes(a.vehicle))fail('INVALID_CONCRETE_VEHICLE');
 if(keys.includes('heading')&&(!Number.isFinite(a.heading)||Math.abs(a.heading)>Math.PI*2))fail('INVALID_VEHICLE_HEADING');
 if(keys.includes('deployed')&&typeof a.deployed!=='boolean'||keys.includes('connected')&&typeof a.connected!=='boolean')fail('INVALID_SWITCH');
 if(keys.includes('source')&&!['bucket','truck','pump'].includes(a.source))fail('INVALID_POUR_SOURCE');
 if(keys.includes('work')&&!int(a.work,0,15))fail('INVALID_FREE_WORK');
 if(name==='PAINT'){
  if(!int(a.work,0,15)||!['top','north','south','east','west'].includes(a.face)||!['roller','brush'].includes(a.tool)||typeof a.color!=='string'||!Object.hasOwn(FLOOR_COLORS,a.color)||!Array.isArray(a.pixels)||!a.pixels.length||a.pixels.length>16||new Set(a.pixels).size!==a.pixels.length||a.pixels.some(n=>!int(n,0,15)))fail('INVALID_PAINT_GESTURE');
  a.pixels.sort((x,y)=>x-y);
 }
 if(name==='TRANSFORM_WORK'&&!int(a.quarterTurns,1,3))fail('回転は90度ずつ指定してください。');
 if(name==='TRANSFORM_SUPPORTED_WORK'&&!int(a.quarterTurns,0,3))fail('回転は90度ずつ指定してください。');
 if(name==='FOUNDATION_BUILD')validateFoundationDesign(a);
 return a;
}
export function freeStock(f){return availableMixCells(f.mixer)+(f.mixer.pending?.cells??0)+(f.wet+f.hose+f.bucket+f.fill.reduce((a,b)=>a+b,0)+f.completed.reduce((n,w)=>n+w.fill.reduce((a,b)=>a+b,0),0))/4;}
export function freeFormVolume(f){return f.fill.reduce((a,b)=>a+b,0)*128;}
export function freeFrameBoards(mask){
 return freeFramePanels(mask).length;
}
export function freeFramePanels(mask){
 const edges=new Set();for(let i=0;i<16;i++)if(mask&(1<<i)){const x=i%4,z=Math.floor(i/4);for(const e of [`v:${x}:${z}`,`v:${x+1}:${z}`,`h:${x}:${z}`,`h:${x}:${z+1}`])edges.add(e);}
 return [...edges].map(id=>{const [axis,a,b]=id.split(':'),x=Number(a),z=Number(b);return{id,x:-32+x*16+(axis==='h'?8:0),z:-32+z*16+(axis==='v'?8:0),width:axis==='h'?16:.35,depth:axis==='v'?16:.35};});
}
export function freeTruckLoad(f){return availableMixCells(f.mixer)+(f.mixer.pending?.cells??0)+f.wet/4;}
export function freeLocationProblem(p,position){
 if(Math.abs(position.x)>2350||Math.abs(position.z)>1450)return '施工区画がマップ外になります。';
 if(Math.abs(position.x-p.location.x)<280&&Math.abs(position.z-p.location.z)<280)return '既存の工房から離れた場所を選んでください。';
 const works=[...(p.completedFloors??[]),...(p.freeBuild?.completed??[]).filter(w=>freeWorkMask(w))];
 if(works.some(w=>Math.abs(w.x-position.x)<180&&Math.abs(w.z-position.z)<180))return '完成した作品と作業通路が重なります。';
 return '';
}
export function emptySiteProblem(p){
 const f=p.freeBuild;
 return !f?.location||f.stage!=='design'||p.foundation||f.fill.some(Boolean)||f.aboard||f.connected||f.hose||f.bucket||f.mixer.pending||f.truck.legs||f.pump.legs?'型枠・土台・作業中の道具を片付け、車を降りてから施工場所を選び直してください。':'';
}
export function freeTarget(f,cell){const c=freeCell(cell);return{x:f.location.x+c.x,z:f.location.z+c.z,y:constructionBase(f)+f.fill[cell]/2};}
export function freePourProblem(f,source,cell){
 if(!['framed','wet'].includes(f.stage)||!(f.mask&(1<<cell)))return '打設中の型枠のマスを選んでください。';
 if(f.fill[cell]>=f.height*2)return 'このマスは満杯です。';
 if(source==='bucket')return f.aboard?'車を降りてください。':f.bucket<1?'バケツへ生コンを汲んでください。':'';
 if(f.aboard!==source)return '使う車両へ乗ってください。';
 const target=freeCell(cell),v=f[source],reach=source==='truck'?72:132;
 const distance=Math.hypot(target.x-v.x,target.z-v.z);
 if(distance>reach)return source==='truck'?'注ぎ口が届く位置まで近づいてください。':'ホースの届く範囲を選んでください。';
 if(source==='truck')return f.height>2?'高い型枠はポンプを使ってください。':f.connected?'接続を外してから直接打設してください。':f.wet<1?'ミキサー車の生コンがありません。':'';
 return !f.pump.legs?'支持脚を展開してください。':!f.connected?'ミキサー車を接続してください。':f.hose<1?'ホースへ生コンを送ってください。':'';
}
export function freeVehicleProblem(f,name,x,z){
 const v=f[name],other=f[name==='truck'?'pump':'truck'];
 if(v.legs||f.connected||f.hose)return 'ホースを空にし、接続と支持脚を収納してから走行してください。';
 if(!f.location||Math.abs(f.location.x+x)>2600||Math.abs(f.location.z+z)>1700)return '工事現場の端です。';
 if(Math.hypot(x-other.x,z-other.z)<96)return 'もう1台に近すぎます。';
 // Swept chassis disks, not only the destination: no tunnelling through a form.
 const length=Math.hypot(x-v.x,z-v.z),n=Math.ceil(length/2);
 if(length>16.001)return '1回の走行距離が長すぎます。';
 for(let s=1;s<=Math.max(1,n);s++){
  const t=s/Math.max(1,n),px=v.x+(x-v.x)*t,pz=v.z+(z-v.z)*t;
  if(Math.hypot(px-other.x,pz-other.z)<96)return 'もう1台に近すぎます。';
  if(!['design','complete'].includes(f.stage))for(let i=0;i<16;i++)if(f.mask&(1<<i)){const c=freeCell(i),dx=Math.max(0,Math.abs(px-c.x)-8),dz=Math.max(0,Math.abs(pz-c.z)-8);if(Math.hypot(dx,dz)<48)return '型枠・作品の手前で止まりました。';}
 }
 return '';
}
export function freePaintCost(work,cell,face,pixels,color){
 if(!freePlacedFill(work,cell))fail('塗るコンクリートがありません。');
 const neighbor={north:cell>=4?cell-4:-1,south:cell<12?cell+4:-1,west:cell%4?cell-1:-1,east:cell%4<3?cell+1:-1}[face];
 if(neighbor>=0&&freePlacedFill(work,neighbor)>=work.fill[cell])fail('隣のコンクリートに隠れている面は塗れません。');
 const prior=work.paint[`${cell}:${face}`]??Array(16).fill(null),changed=pixels.filter(i=>prior[i]!==color);
 // Each face is divided into 4 x 4 brush patches; credits measure area / 64.
 const cost=changed.length*(face==='top'?.25:work.fill[cell]/128);
 return{prior,changed,cost};
}
export function applyFreeAction(p,a,ledger){
 const f=p.freeBuild;if(!f)fail('FREE_BUILD_SCHEMA_REQUIRED');const name=a.type.slice(5);
 if(FOUNDATION_ACTIONS.has(a.type)){applyFoundation(p,a,ledger);return true;}
 // The foundation fixes the datum and footprint until the whole work is stored.
 if(p.foundation&&name==='DESIGN')fail('設置済みの土台の形を使います。設計を変える場合は土台を回収してください。');
 if(p.foundation&&['NEXT','MOVE_WORK','TRANSFORM_WORK'].includes(name))fail('土台と型枠・作品の重なりを避けてください。先に土台を片付けられます。');
 if(p.foundation&&name==='MOVE'){const v=f[a.vehicle];if(Math.hypot(a.x-v.x,a.z-v.z)>16.001)fail('1回の走行距離が長すぎます。');if(foundationVehicleSweepBlocked(p.foundation,f.location,v,{...v,x:a.x,z:a.z,heading:a.heading}))fail('土台の手前で止まりました。');}
 const stage=(...s)=>{if(!s.includes(f.stage))fail('この工程では操作できません。');};
 if(name==='PLACE'){if(f.location)fail('施工区画は設置済みです。');const problem=freeLocationProblem(p,a);if(problem)fail(problem);f.location={x:a.x,z:a.z};}
 else{
  if(!f.location)fail('先に施工場所を決めてください。');
  if(name==='DESIGN'){stage('design');f.mask=a.mask;f.height=a.height;}
  else if(name==='FRAME'||name==='FRAME_RAISED'){stage('design');if(name==='FRAME_RAISED'&&!p.foundation)fail('高所施工には仮設土台が必要です。');if(p.foundation){if(p.schemaVersion<11)fail('SUPPORTED_BUILD_SCHEMA_REQUIRED');const prepared=preparedFrameBuild(p,a);f.mask=prepared.mask;f.baseY=prepared.baseY;if(name==='FRAME_RAISED')f.height=prepared.height;}if(!f.mask)fail('先に形を選んでください。');const loan=p.schemaVersion>=11?(p.site.formworkPanelsInUse??0)+(p.foundation?foundationBoardCount(p.foundation):0):0;if(freeFrameBoards(f.mask)+loan>(ledger.quantities?.auxiliaryUnits?.formwork??0))fail('土台と型枠に使う板が不足しています。形を小さくするか、板を受け取ってください。');f.stage='framed';}
  else if(name==='UNFRAME'){stage('framed');if(p.schemaVersion<11||!constructionBase(f)||!p.foundation||f.fill.some(Boolean)||f.aboard||f.connected||f.hose)fail('生コンが空の、土台上の型枠だけ回収できます。配管を外し、車を降りてください。');f.stage='design';f.baseY=0;}
  else if(name==='SUPPLY'){
   if(availableMixCells(p.mixer)<a.cells)fail('工房の原料が不足しています。');
   if(freeTruckLoad(f)+a.cells>8)fail('ミキサー車の容量は8杯です。');
   const q=ingredientAmount(a.cells);for(const k of Object.keys(q)){p.mixer.ingredients[k]-=q[k];f.mixer.ingredients[k]+=q[k];}f.mixer.receivedCells+=a.cells;
  }else if(name==='MIX_START'){if(f.aboard!=='truck')fail('ミキサー車へ乗ってください。');startMix(f.mixer,a.cells,a.operationId);}
  else if(name==='MIX_TICK'){if(!f.mixer.pending)fail('混練中ではありません。');f.wet+=advanceMix(f.mixer,f.mixer.pending.id,a.elapsedMs)*4;}
  else if(name==='MIX_CANCEL'){if(!f.mixer.pending)fail('混練中ではありません。');cancelMix(f.mixer,f.mixer.pending.id);}
  else if(name==='BUCKET_LOAD'){if(f.aboard||f.bucket)fail('車を降り、空のバケツを用意してください。');if(f.wet<4)fail('生コンが1杯分ありません。');f.wet-=4;f.bucket=4;}
  else if(name==='BUCKET_RETURN'){if(!f.bucket)fail('バケツは空です。');if(freeTruckLoad(f)+f.bucket/4>8)fail('車のタンクが満杯です。');f.wet+=f.bucket;f.bucket=0;}
  else if(name==='POUR'){const problem=freePourProblem(f,a.source,a.cell);if(problem)fail(problem);f[a.source==='bucket'?'bucket':a.source==='truck'?'wet':'hose']--;f.fill[a.cell]++;f.stage='wet';}
  else if(name==='RECOVER'){stage('framed','wet','finished');const q=f.fill.reduce((n,v)=>n+v,0);if(freeTruckLoad(f)+q/4>8)fail('回収先のタンクに空きがありません。');f.wet+=q;f.fill.fill(0);f.stage='framed';}
  else if(name==='FINISH'){stage('wet');if(!f.fill.some(Boolean))fail('生コンを流してください。');f.stage='finished';}
  else if(name==='CURE'){stage('finished');f.stage='curing';f.elapsedMs=0;}
  else if(name==='CURE_TICK'){stage('curing');if(a.elapsedMs>30000-f.elapsedMs)fail('INVALID_FREE_CLOCK');f.elapsedMs+=a.elapsedMs;if(f.elapsedMs===30000)f.stage='cured';}
  else if(name==='DEMOLD'){
   stage('cured');if(f.completed.length>=16)fail('自由施工の作品は16個までです。');
   f.completed.push({...f.location,mask:f.mask,height:f.height,fill:[...f.fill],paint:{},...(constructionBase(f)?{baseY:f.baseY}:{})});f.fill.fill(0);f.stage='complete';if(p.schemaVersion>=11)f.baseY=0;
  }else if(name==='CHANGE_EMPTY_SITE'){
   const issue=emptySiteProblem(p)||freeLocationProblem(p,a);if(issue)fail(issue);
   if(a.x===f.location.x&&a.z===f.location.z)fail('施工場所は変わっていません。');
   f.location={x:a.x,z:a.z};
  }else if(name==='NEXT'){
   stage('complete');const problem=freeLocationProblem(p,a);if(problem)fail(problem);
   f.location={x:a.x,z:a.z};f.mask=0;f.height=2;f.stage='design';if(p.schemaVersion>=11)f.baseY=0;f.elapsedMs=0;f.truck={x:76,z:64,heading:Math.PI,legs:false};f.pump={x:-76,z:48,heading:0,legs:false};f.connected=false;f.aboard=null;
   if(f.hose)fail('移設前にホースの残りを回収してください。');
  }else if(name==='BOARD'){if(f.aboard)fail('先に降車してください。');f.aboard=a.vehicle;}
  else if(name==='LEAVE'){if(!f.aboard)fail('すでに降車しています。');f.aboard=null;}
  else if(name==='MOVE'){if(f.aboard!==a.vehicle)fail('操作する車両へ乗ってください。');const problem=freeVehicleProblem(f,a.vehicle,a.x,a.z);if(problem)fail(problem);Object.assign(f[a.vehicle],{x:a.x,z:a.z,heading:a.heading});}
  else if(name==='LEGS'){if(f.aboard!=='pump')fail('ポンプ車へ乗ってください。');if(!a.deployed&&(f.hose||f.connected))fail('ホースを空にして接続を外してください。');if(a.deployed&&Math.abs(f.pump.x)<68&&Math.abs(f.pump.z)<68)fail('型枠から離れて支持脚を展開してください。');f.pump.legs=a.deployed;}
  else if(name==='CONNECT'){if(a.connected&&(!f.pump.legs||Math.hypot(f.pump.x-f.truck.x,f.pump.z-f.truck.z)>110))fail('支持脚を出し、ミキサー車を110以内に停めてください。');if(!a.connected&&f.hose)fail('先にホースの残りを回収してください。');f.connected=a.connected;}
  else if(name==='PRIME'){if(!f.connected||!f.pump.legs||f.hose||!f.wet)fail('接続・支持脚・空のホース・生コンを確認してください。');f.wet--;f.hose=1;}
  else if(name==='DRAIN'){if(!f.hose)fail('ホースは空です。');if(freeTruckLoad(f)+f.hose/4>8)fail('回収先のタンクに空きがありません。');f.wet+=f.hose;f.hose=0;}
  else if(name==='SET_WORK_PARTS'){
   if(p.schemaVersion<7)fail('FREE_WORK_PARTS_SCHEMA_REQUIRED');const problem=freeWorkPartsProblem(p,a.work,a.mask);if(problem)fail(problem);const restored=a.mask&~freeWorkMask(f.completed[a.work]);f.completed[a.work].placedMask=a.mask;if(p.schemaVersion>=13&&f.stage==='design'&&restored&&constructionBase(f.completed[a.work]))f.stage='complete';
  }else if(name==='TRANSFORM_SUPPORTED_WORK'){if(p.schemaVersion<13)fail('SUPPORTED_WORK_MOVE_SCHEMA_REQUIRED');const issue=supportedWorkMoveProblem(p,a.work,a,a.quarterTurns);if(issue)fail(issue);f.completed[a.work]={...rotateFreeWork(f.completed[a.work],a.quarterTurns),x:a.x,z:a.z};}
  else if(name==='MOVE_WORK'){
   if(p.schemaVersion<8)fail('FREE_WORK_MOVE_SCHEMA_REQUIRED');const problem=freeWorkMoveProblem(p,a.work,a);if(problem)fail(problem);Object.assign(f.completed[a.work],{x:a.x,z:a.z});
  }else if(name==='TRANSFORM_WORK'){
   if(p.schemaVersion<9)fail('FREE_WORK_ROTATION_SCHEMA_REQUIRED');const problem=freeWorkMoveProblem(p,a.work,a,a.quarterTurns);if(problem)fail(problem);f.completed[a.work]={...rotateFreeWork(f.completed[a.work],a.quarterTurns),x:a.x,z:a.z};
  }else if(name==='PAINT'){
   if(f.aboard)fail('塗装は車を降りて行います。');const w=f.completed[a.work];if(constructionBase(w)&&(p.schemaVersion<12||!supportedWorkMatches(p,w,1<<a.cell)))fail('元の土台と塗装用足場を確認してください。');const {prior,changed,cost}=freePaintCost(w,a.cell,a.face,a.pixels,a.color);if(!changed.length)fail('同じ色です。');
   if(cost>(ledger.quantities?.paintSurfaceCredits??0)-p.paintUsed)fail('ペンキが不足しています。');
   const key=`${a.cell}:${a.face}`;f.paintUndo={work:a.work,key,prior:[...prior],cost,operationId:a.operationId};w.paint[key]=[...prior];for(const i of changed)w.paint[key][i]=a.color;p.paintUsed+=cost;
  }else if(name==='UNDO_PAINT'){
   const u=f.paintUndo;if(!u||lastProjectOperation(p)?.operationId!==u.operationId)fail('直前の塗装だけ取り消せます。');f.completed[u.work].paint[u.key]=u.prior;p.paintUsed-=u.cost;f.paintUndo=null;
  }
 }
 return true;
}
export function freeGeometry(p){
 const f=p.freeBuild;if(!f)return[];
 return f.completed.flatMap((w,wi)=>w.fill.flatMap((q,i)=>{if(!freePlacedFill(w,i))return[];const c=freeCell(i);return[{id:`construction-concrete-free-${wi}-${i}-floor`,buildingId:'construction-concrete',x:w.x+c.x,z:w.z+c.z,height:constructionBase(w)+q/2,underside:constructionBase(w),rotation:0,halfX:8,halfZ:8,localHalfX:8,localHalfZ:8,size:[16,16],freeWork:wi,freeCell:i,paintPatches:w.paint}];}));
}
