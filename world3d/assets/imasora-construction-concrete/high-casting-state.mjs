// Optional extension: old projects acquire no new fields until the first frame.
// A fill unit is the existing quarter-cup (128 volume units).
import {validateUpperMask,upperCastingCapacity,upperCastingBoards} from './high-casting-shape.mjs?v=120fl';
import {validateUpperPaintAction,upperPaintPlan,applyUpperPaint} from './high-paint.mjs?v=120fn';
export const HIGH_CAST_MS=8000;
export const UPPER_PUMP_PORT=Object.freeze({x:15,y:24,z:-47.25});
export const HIGH_CAST_SPECS={HIGH_FRAME:['anchor'],HIGH_SHAPED_FRAME:['anchor','mask'],HIGH_UNFRAME:['castingId'],HIGH_CONNECT:['castingId'],HIGH_DISCONNECT:[],HIGH_BEGIN:['castingId'],HIGH_TICK:['elapsedMs'],HIGH_FLOW_FINISH:[],HIGH_FLOW_CANCEL:[],HIGH_FINISH:['castingId'],HIGH_CURE:['castingId'],HIGH_CURE_TICK:['castingId','elapsedMs'],HIGH_DEMOLD:['castingId'],HIGH_STORE:['castingId'],HIGH_REPLACE:['castingId','anchor'],HIGH_RECOVER:['castingId']};
const ok=(v,m)=>{if(!v)throw Error(m);};
HIGH_CAST_SPECS.HIGH_ADD_FRAME=['anchor'];HIGH_CAST_SPECS.HIGH_ADD_SHAPED_FRAME=['anchor','mask'];HIGH_CAST_SPECS.HIGH_ADD_REPLACE=['castingId','anchor'];
HIGH_CAST_SPECS.HIGH_PAINT=['castingId','tiles','face','pixels','color','tool'];
export const highCastings=f=>f?.highCastings??[];
export const highCastingBoards=f=>highCastings(f).filter(c=>!c.stored&&c.stage!=='complete').reduce((n,c)=>n+upperCastingBoards(c),0);
export const highCastingStock=f=>highCastings(f).reduce((n,c)=>n+c.fill+(c.pending?1:0),0)/4;
export function validateHighCastingAction(a){
 if(a.type==='FREE_HIGH_PAINT')validateUpperPaintAction(a);
 if('mask'in a)validateUpperMask(a.mask);
 if(a.anchor){const p=a.anchor;ok(Object.keys(p).sort().join('|')===(p.version===2?'buildingId|floor|turn|version|x|y|z':'buildingId|floor|turn|x|y|z')&&/^building-[1-9][0-9]*$/.test(p.buildingId)&&Number.isInteger(p.floor)&&p.floor>=1&&p.floor<=6&&Number.isInteger(p.turn)&&p.turn>=0&&p.turn<=3&&['x','y','z'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=6000),'型枠を置く場所をえらび直そう。');}
 if('castingId'in a)ok(typeof a.castingId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(a.castingId),'上の階の型枠をえらび直そう。');
 if('elapsedMs'in a)ok(Number.isInteger(a.elapsedMs)&&a.elapsedMs>0&&a.elapsedMs<=30000,'作業の時間をたしかめよう。');
}
export function applyHighCasting(p,a,ledger,groundBoardUse){
 const f=p.freeBuild,raw=a.type.slice(5),adding=raw.startsWith('HIGH_ADD_'),name=adding?raw.replace('HIGH_ADD_','HIGH_'):raw;if(!HIGH_CAST_SPECS[raw])return false;if(adding){ok(a.anchor?.version===2,'床をえらんでから、新しくつくろう。');const active=highCastings(f).filter(c=>!c.stored&&c.anchor.buildingId===a.anchor.buildingId);ok(active.every(c=>c.anchor.version===2),'前の作品をしまって、床をえらび直して置こう。');ok(!active.some(c=>c.stage!=='complete'),'いまの作品を完成させてから、つぎをつくろう。');}
 ok(f?.location,'先にポンプ車とミキサー車を準備しよう。');
 const list=highCastings(f),c=list.find(c=>c.id===a.castingId),pending=list.find(c=>c.pending);
 if(pending)ok(['HIGH_TICK','HIGH_FLOW_FINISH','HIGH_FLOW_CANCEL'].includes(name),'上の階へ送っているよ。送液を止めてから別の作業をしよう。');
 if(name==='HIGH_FRAME'||name==='HIGH_SHAPED_FRAME'){
  ok(!f.aboard,'車を降りて、上の階へ登ろう。');ok(list.length<16,'上の階の作品は16個までだよ。');
  ok(adding||!list.some(c=>!c.stored&&c.anchor.buildingId===a.anchor.buildingId),'この上の階には型枠か作品があるよ。');
  const shape=name==='HIGH_SHAPED_FRAME'?{version:1,mask:validateUpperMask(a.mask)}:null,boards=upperCastingBoards({shape});
  ok(groundBoardUse+highCastingBoards(f)+boards<=(ledger.quantities?.auxiliaryUnits?.formwork??0),'型枠の板が'+boards+'枚必要だよ。建材受取所で受け取ろう。');
  if(adding)f.upperLayoutVersion=1;f.highCastings=[...list,{id:a.operationId,anchor:structuredClone(a.anchor),...(shape?{shape}:{}),fill:0,stage:'framed',elapsedMs:0,stored:false,pending:null}];return true;
 }
 if(name==='HIGH_DISCONNECT'){ok(f.highPipe,'上の階へつながっていないよ。');ok(!pending,'送液を止めてからホースを外そう。');delete f.highPipe;return true;}
 if(name==='HIGH_TICK'||name==='HIGH_FLOW_FINISH'||name==='HIGH_FLOW_CANCEL'){
  ok(pending,'上の階への送液はおわっているよ。');
  if(name==='HIGH_TICK'){ok(a.elapsedMs<=HIGH_CAST_MS-pending.pending.elapsedMs,'送液の時間が進みすぎたよ。');pending.pending.elapsedMs+=a.elapsedMs;}
  else if(name==='HIGH_FLOW_FINISH'){ok(pending.pending.elapsedMs===HIGH_CAST_MS,'生コンが届くまで待とう。');pending.fill++;pending.pending=null;pending.stage='wet';}
  else{f.hose++;pending.pending=null;}
  return true;
 }
 if(name==='HIGH_REPLACE'){ok(c?.stored&&!f.aboard&&!f.highPipe,'しまってある作品を、徒歩で上の階へ運ぼう。');ok(adding||!list.some(c=>!c.stored&&c.anchor.buildingId===a.anchor.buildingId),'この上の階には型枠か作品があるよ。');if(adding)f.upperLayoutVersion=1;c.anchor=structuredClone(a.anchor);c.stored=false;return true;}
 ok(c&&!c.stored,'上の階に型枠が見つからないよ。');
 if(name==='HIGH_CONNECT'){ok(f.aboard==='pump'&&f.pump.legs&&f.connected,'ポンプ車に乗り、支持脚とミキサー車のホースを準備しよう。');ok(!f.highPipe,'いまの上階ホースを外してからつなぎ直そう。');ok(['framed','wet'].includes(c.stage)&&c.fill<upperCastingCapacity(c),'注ぐ型枠をえらぼう。');f.highPipe={castingId:c.id,pump:structuredClone(f.pump)};}
 else if(name==='HIGH_BEGIN'){ok(f.aboard==='pump'&&f.pump.legs&&f.connected&&f.highPipe?.castingId===c.id,'上階へのホースをつなごう。');ok(['framed','wet'].includes(c.stage)&&c.fill<upperCastingCapacity(c),'この型枠はいっぱいだよ。');ok(f.hose>=1,'まず「ホースに送る」で1/4杯を用意しよう。');f.hose--;c.pending={id:a.operationId,elapsedMs:0};}
 else{
  ok(!f.aboard,'車を降りて、上の階へ登ろう。');ok(!f.highPipe,'ポンプ車で上階ホースを外してから仕上げよう。');
  if(name==='HIGH_UNFRAME'){ok(c.stage==='framed'&&!c.fill,'空の型枠だけ回収できるよ。');f.highCastings=list.filter(x=>x!==c);}
  else if(name==='HIGH_RECOVER'){ok(c.stage==='wet'&&c.fill>0,'まだ固めていない生コンだけ回収できるよ。');const amount=c.shape?Math.min(4-f.bucket,c.fill):c.fill;ok(amount>0&&f.bucket+amount<=4,'バケツを空にしてから回収しよう。');f.bucket+=amount;c.fill-=amount;if(!c.fill)c.stage='framed';}
  else if(name==='HIGH_FINISH'){ok(c.stage==='wet'&&c.fill===upperCastingCapacity(c),'型枠がいっぱいになってから、コテでならそう。');c.stage='finished';}
  else if(name==='HIGH_CURE'){ok(c.stage==='finished','コテでならしてから固めよう。');c.stage='curing';c.elapsedMs=0;}
  else if(name==='HIGH_CURE_TICK'){ok(c.stage==='curing'&&a.elapsedMs<=30000-c.elapsedMs,'固める時間をたしかめよう。');c.elapsedMs+=a.elapsedMs;if(c.elapsedMs===30000)c.stage='cured';}
  else if(name==='HIGH_DEMOLD'){ok(c.stage==='cured','固まるまで待とう。');c.stage='complete';}
  else if(name==='HIGH_STORE'){ok(c.stage==='complete','型枠を外してから、作品をしまおう。');c.stored=true;}
  else if(name==='HIGH_PAINT'){const plan=upperPaintPlan(c,a);ok(plan.cost<=((ledger.quantities?.paintSurfaceCredits??0)-(p.paintUsed??0))+1e-9,'ペンキが足りないよ。建材受取所で受け取ろう。');applyUpperPaint(c,a);p.paintUsed=(p.paintUsed??0)+plan.cost;}
 }
 return true;
}
