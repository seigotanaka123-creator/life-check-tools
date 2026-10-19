import {PAINT_REMOVE_COLOR} from './free-paint-removal.mjs?v=120dm';
// Bounded work steps, without copying save history, wallets or walking.
// Capture is derived by the project replay, never accepted from an action.
const names={HIGH_SHAPED_FRAME:'形をえらんで上の階の型枠を組んだ',HIGH_REPLACE:'上の階に作品を置いた',HIGH_RECOVER:'上の階の生コンを回収した',HIGH_FRAME:'上の階の型枠を組んだ',HIGH_UNFRAME:'上の階の型枠を回収した',HIGH_CONNECT:'上階ホースをつないだ',HIGH_DISCONNECT:'上階ホースを外した',HIGH_BEGIN:'上階へ生コンを注いだ',HIGH_FINISH:'上の階をコテでならした',HIGH_CURE:'上の階の生コンを固めた',HIGH_DEMOLD:'上の階の型枠を外した',HIGH_STORE:'上の階の作品をしまった',DESIGN:'形をえらんだ',FRAME:'型枠を組んだ',FRAME_RAISED:'型枠を組んだ',UNFRAME:'空の型枠を回収した',FOUNDATION_BUILD:'土台をつくった',FOUNDATION_REMOVE:'土台を片付けた',SUPPLY:'原料を積んだ',MIX_START:'生コンを練った',MIX_CANCEL:'練るのをやめた',BUCKET_LOAD:'バケツにくんだ',BUCKET_RETURN:'バケツの生コンを戻した',POUR:'生コンを注いだ',RECOVER:'生コンを回収した',FINISH:'コテでならした',CURE:'生コンを固めた',DEMOLD:'型枠を外した',LEGS:'支持脚を動かした',CONNECT:'ホースの接続を変えた',PRIME:'ホースに送った',DRAIN:'ホースから回収した',PAINT:'ペンキをぬった',SET_WORK_PARTS:'作品の部分を変えた',MOVE_WORK:'作品を動かした',TRANSFORM_WORK:'作品を回した',TRANSFORM_SUPPORTED_WORK:'土台の作品を動かした'};
names.HIGH_ADD_FRAME='上の階に次の型枠を組んだ';names.HIGH_ADD_SHAPED_FRAME='上の階に次の型枠を組んだ';names.HIGH_ADD_REPLACE='上の階に別の作品を置いた';
names.DECOR_PAINT='床・天井・家具に色をぬった';
names.BUILDING_PAINT='建物の壁・柱に色をぬった';
names.HIGH_PAINT='上の階の作品に色をぬった';
export const FREE_STEP_ACTIONS=new Set(Object.keys(names).map(n=>'FREE_'+n));
export const FREE_STEP_UNDO_LIMIT=10;
const keep=new Set(['FREE_HIGH_TICK','FREE_HIGH_FLOW_FINISH','FREE_HIGH_FLOW_CANCEL','FREE_HIGH_CURE_TICK','FREE_PARK_VEHICLES','FREE_BOARD','FREE_LEAVE','FREE_MIX_TICK','FREE_CURE_TICK']);
const fields={HIGH_ADD_FRAME:['upperLayoutVersion'],HIGH_ADD_SHAPED_FRAME:['upperLayoutVersion'],HIGH_ADD_REPLACE:['upperLayoutVersion'],DECOR_PAINT:['decorPaint'],BUILDING_PAINT:['buildingPaint'],DESIGN:['mask','height'],FRAME:['stage','mask','height','baseY'],FRAME_RAISED:['stage','mask','height','baseY'],UNFRAME:['stage','baseY'],SUPPLY:['mixer'],MIX_START:['mixer','wet'],MIX_CANCEL:['mixer','wet'],BUCKET_LOAD:['wet','bucket'],BUCKET_RETURN:['wet','bucket'],POUR:['bucket','wet','hose','fill','stage'],RECOVER:['wet','fill','stage'],FINISH:['stage'],CURE:['stage','elapsedMs'],DEMOLD:['fill','stage','baseY'],CONNECT:['connected'],PRIME:['wet','hose'],DRAIN:['wet','hose'],PAINT:['paintUndo'],SET_WORK_PARTS:['stage']};
export function captureFreeStep(p,a){
 if(!FREE_STEP_ACTIONS.has(a.type)||![true,'ten'].includes(a.recordStep))return null;
 const name=a.type.slice(5),f=p.freeBuild,before={freeBuild:{},absent:[]};
 if(name.startsWith('HIGH_'))for(const key of ['highCastings','highPipe','hose','bucket'])if(Object.hasOwn(f,key))before.freeBuild[key]=f[key];else before.absent.push(key);
 for(const key of fields[name]??[])if(Object.hasOwn(f,key))before.freeBuild[key]=f[key];else before.absent.push(key);
 if(name==='SUPPLY')before.mixer=p.mixer;
 if(name.startsWith('FOUNDATION_'))before.foundation=p.foundation;
 if(name==='DEMOLD')before.completedLength=f.completed.length;
 if(name==='LEGS')before.pumpLegs=f.pump.legs;
 if(['SET_WORK_PARTS','MOVE_WORK','TRANSFORM_WORK','TRANSFORM_SUPPORTED_WORK'].includes(name))before.work={index:a.work,value:f.completed[a.work]};
 if(name==='PAINT'){
  const key=`${a.cell}:${a.face}`,paint=f.completed[a.work].paint;
  before.paintUsed=p.paintUsed;before.paint={work:a.work,key,present:Object.hasOwn(paint,key),value:paint[key]??null};
 }
 if(name==='DECOR_PAINT'||name==='HIGH_PAINT'||name==='BUILDING_PAINT')before.paintUsed=p.paintUsed??0;
 return{operationId:a.operationId,type:a.type,before:structuredClone(before),...(Object.hasOwn(p,'workStepUndoStack')?{revision:p.revision}:{}),...(a.type==='FREE_PAINT'&&a.color===PAINT_REMOVE_COLOR?{label:'色を落とした'}:{})};
}
export function enableFreeStepHistory(p,history){
 if(Object.hasOwn(p,'workStepUndoStack'))return;
 p.workStepUndoStack=structuredClone(history.slice(-FREE_STEP_UNDO_LIMIT));
 p.workStepUndo=structuredClone(p.workStepUndoStack.at(-1)??null);
}
// Used only to build the old-save upgrade. Old operations retain their original
// stored meaning; this bounded shadow list is never written to an old save.
export function advanceLegacyStepHistory(history,a,point,oldPaintId){
 // Old saves could cancel only their latest edit. Keep one extra candidate so
 // that already-cancelled edit does not steal one of the ten available turns.
 if(point){history.push(point);if(history.length>FREE_STEP_UNDO_LIMIT+1)history.shift();}
 else if(['FREE_UNDO_STEP','FREE_UNDO_PAINT'].includes(a.type)){
  if(history.at(-1)?.operationId===(a.stepId??oldPaintId))history.pop();else history.length=0;
 }else if(!keep.has(a.type))history.length=0;
}
export function finishFreeStep(p,a,point){
 if(Object.hasOwn(p,'workStepUndoStack')){
  if(point){p.workStepUndoStack.push(point);if(p.workStepUndoStack.length>FREE_STEP_UNDO_LIMIT)p.workStepUndoStack.shift();}
  else if(!keep.has(a.type)&&a.type!=='FREE_MOVE')p.workStepUndoStack=[];
  p.workStepUndo=structuredClone(p.workStepUndoStack.at(-1)??null);return;
 }
 if(point)p.workStepUndo=point;
 else if(!keep.has(a.type)&&Object.hasOwn(p,'workStepUndo'))p.workStepUndo=null;
}
export function restoreFreeStep(p,a){
 const u=p.workStepUndo;
 if(!u||u.operationId!==a.stepId)throw Error('戻せる作業が変わったよ。もう一度たしかめてね。');
 const b=structuredClone(u.before),f=p.freeBuild;
 // A small patch owns just the fields this operation changed. Replaying a
 // long history must not clone every completed work for every brush stroke.
 Object.assign(f,b.freeBuild);for(const key of b.absent)delete f[key];
 if(Object.hasOwn(b,'mixer'))p.mixer=b.mixer;
 if(Object.hasOwn(b,'foundation'))p.foundation=b.foundation;
 if(Object.hasOwn(b,'pumpLegs'))f.pump.legs=b.pumpLegs;
 if(b.work)f.completed[b.work.index]=b.work.value;
 if(Object.hasOwn(b,'completedLength'))f.completed.length=b.completedLength;
 if(b.paint){const paint=f.completed[b.paint.work].paint;if(b.paint.present)paint[b.paint.key]=b.paint.value;else delete paint[b.paint.key];p.paintUsed=b.paintUsed;}
 if(Object.hasOwn(b,'paintUsed'))p.paintUsed=b.paintUsed;
 if(a.multiStep===true&&Object.hasOwn(p,'workStepUndoStack')){p.workStepUndoStack.pop();p.workStepUndo=structuredClone(p.workStepUndoStack.at(-1)??null);}
 else{p.workStepUndo=null;if(Object.hasOwn(p,'workStepUndoStack'))p.workStepUndoStack=[];}
}
export function freeStepUndoCount(p){return Object.hasOwn(p??{},'workStepUndoStack')?p.workStepUndoStack.length:p?.workStepUndo||p?.freeBuild?.paintUndo?1:0;}
export function freeStepUndoTarget(p){
 const u=p?.workStepUndo;if(u)return freeStepUndoPointTarget(u,Object.hasOwn(p,'workStepUndoStack'));
 if(Object.hasOwn(p??{},'workStepUndoStack'))return null;
 // Existing saved paint retains its old, validated single-paint undo.
 const old=p?.freeBuild?.paintUndo,last=p?.operations?.at(-1);
 if(old&&last?.operationId===old.operationId)return{type:'FREE_UNDO_PAINT',extra:{},label:last.color===PAINT_REMOVE_COLOR?'色を落とした':'ペンキをぬった',sourceType:'FREE_PAINT'};
 return null;
}
export function freeStepUndoPointTarget(u,multiStep=true){return u?{type:'FREE_UNDO_STEP',extra:{stepId:u.operationId,...(multiStep?{multiStep:true}:{})},label:u.label??names[u.type.slice(5)]??'さっきの作業',sourceType:u.type}:null;}
