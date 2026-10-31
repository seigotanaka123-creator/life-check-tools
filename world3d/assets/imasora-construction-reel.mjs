import{makePipeLink,transferPipeLink,connectedPipe,makePipeBranch,transferPipeNetwork}from'./imasora-construction-pipe-links.mjs?v=120pl';
import{girders,girderWood}from'./imasora-construction-girder-shape.mjs?v=120pl';
import{floorParts}from'./imasora-construction-reel-stairs.mjs?v=120pi';
import{repeatLevels,levelProblem,LEVEL_MAX_Y}from'./imasora-construction-reel-levels.mjs?v=120pm';
// Shared bounded geometry/gesture model. Persistence belongs to each caller.
import{roomStructureProblem,editStructure,wallParts,structureParts}from'./imasora-construction-reel-structure.mjs?v=120pm';
import{REPEAT_TYPES,repeatRooms}from'./imasora-construction-reel-repeat.mjs?v=120pm';
import{editReelBook,placeReelBook,validateReelBook}from'./imasora-construction-reel-book.mjs?v=120ps';
import{railRun}from'./imasora-construction-reel-rails.mjs?v=120pi';
export const REEL_KEY='imasora-construction-reel-preview-v1';
export const REEL={grid:8,min:16,max:256,bound:240,height:128,rooms:16,history:10};
export const REEL_SIDES=['north','east','south','west'];
const copy=v=>JSON.parse(JSON.stringify(v)),snap=n=>Math.round(n/REEL.grid)*REEL.grid;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function newReel(){return{version:1,nextId:1,selected:null,rooms:[],past:[]};}
export function reelRect(a,b){return{x0:snap(Math.min(a.x,b.x)),z0:snap(Math.min(a.z,b.z)),x1:snap(Math.max(a.x,b.x)),z1:snap(Math.max(a.z,b.z))};}
export function reelRoomProblem(room,others=[],bounds={minX:-240,maxX:240,minZ:-240,maxZ:240}){
 if(!room||!['x0','z0','x1','z1'].every(k=>finite(room[k])&&room[k]%REEL.grid===0))return'床の場所をえらび直そう';
 if(Object.hasOwn(room,'floorMaterial')&&room.floorMaterial!=='steel')return'床の材料をえらび直そう';
 const w=room.x1-room.x0,d=room.z1-room.z0;
 if(w<REEL.min||d<REEL.min)return'もう少し広げよう';
 if(w>REEL.max||d>REEL.max)return'この床はここまで広げられるよ';
 if(room.x0<bounds.minX||room.x1>bounds.maxX||room.z0<bounds.minZ||room.z1>bounds.maxZ)return'現場の内側へ広げよう';
 if(others.some(r=>r.id!==room.id&&(r.y??0)===(room.y??0)&&room.x0<r.x1&&room.x1>r.x0&&room.z0<r.z1&&room.z1>r.z0))return'となりの床に重なるよ';
 if(room.walls&&!REEL_SIDES.every(s=>Number.isInteger(room.walls[s])&&room.walls[s]>=0&&room.walls[s]<=REEL.height&&room.walls[s]%REEL.grid===0))return'壁の高さをえらび直そう';
 return roomStructureProblem(room);
}
export function reelDraft(state,action,bounds){
 if(!action||action.type==='FLOOR'&&![action.start?.x,action.start?.z,action.end?.x,action.end?.z].every(finite))return{problem:'床の場所をえらび直そう'};
 const rooms=copy(state.rooms);let selected=state.selected,nextId=state.nextId,room;
 if(action.type==='FLOOR'){
  if(rooms.length>=REEL.rooms)return{problem:'床は16枚まで作れるよ'};
  if(Object.hasOwn(action,'material')&&action.material!=='steel')return{problem:'床の材料をえらび直そう'};
  room={id:nextId++,...(action.material?{floorMaterial:action.material}:{}),...reelRect(action.start,action.end),...(action.baseY!==undefined?{y:action.baseY}:{}),walls:Object.fromEntries(REEL_SIDES.map(s=>[s,0]))};rooms.push(room);selected=room.id;
 }else if(action.type==='RESIZE'||action.type==='WALL'){
  room=rooms.find(r=>r.id===action.id);if(!room||!REEL_SIDES.includes(action.side))return{problem:'床の持ち手をえらび直そう'};
  selected=room.id;
  if(action.type==='WALL')room.walls[action.side]=Math.max(0,Math.min(REEL.height,snap(action.height)));
  else room[({north:'z0',east:'x1',south:'z1',west:'x0'})[action.side]]=snap(action.coordinate);
 }else if(action.type==='LEVEL_COPY'){const draft=repeatLevels(rooms,action,nextId);if(draft.problem)return draft;for(const r of rooms){const problem=reelRoomProblem(r,rooms,bounds);if(problem)return{...draft,problem};}const problem=levelProblem(rooms);return{...draft,problem};}
 else if(action.type==='RAIL_RUN'){const draft=railRun(rooms,action,nextId);if(draft.problem)return draft;for(const r of rooms){const problem=reelRoomProblem(r,rooms,bounds);if(problem)return{...draft,problem};}return{...draft,problem:levelProblem(draft.rooms)};}
 else if(action.type==='BOOK_PLACE'){const draft=placeReelBook(state,action);if(draft.problem)return draft;for(const r of draft.previewRooms){const problem=reelRoomProblem(r,draft.rooms,bounds);if(problem)return{...draft,problem};}return{...draft,problem:levelProblem(draft.rooms)};}
 else if(REPEAT_TYPES.includes(action.type)){const draft=repeatRooms(rooms,action,nextId);if(draft.problem)return draft;for(const r of rooms){const problem=reelRoomProblem(r,rooms,bounds);if(problem)return{...draft,problem};}return{...draft,problem:levelProblem(draft.rooms)};}
 else if(action.type==='PIPE_BRANCH'||action.type==='PIPE_NETWORK_SEND'){room=rooms.find(r=>r.id===action.id);if(!room)return{problem:'床をえらぼう。'};try{if(action.type==='PIPE_BRANCH'){const item=makePipeBranch(rooms,room.id,action.parentId,action.segment,action.side,action.toRoom,action.to),problem=editStructure(room,{type:'DETAIL',item});if(problem)throw Error(problem);}else transferPipeNetwork(rooms,action);}catch(e){return{problem:e.message,room};}selected=room.id;}
 else if(action.type==='PIPE_LINK'||action.type==='PIPE_SEND'){room=rooms.find(r=>r.id===action.id);if(!room)return{problem:'床をえらぼう。'};try{if(action.type==='PIPE_LINK'){if(connectedPipe(rooms,room.id,action.from)||connectedPipe(rooms,action.toRoom,action.to))throw Error('この出口には配管があるよ。先に外そう。');const item=makePipeLink(rooms,room.id,action.from,action.toRoom,action.to,action.side),problem=editStructure(room,{type:'DETAIL',item});if(problem)throw Error(problem);}else transferPipeLink(rooms,room,action);}catch(e){return{problem:e.message,room};}selected=room.id;}
 else if(['DETAIL','DETAIL_REMOVE','DOOR_TOGGLE','PIPE_TRANSFER'].includes(action.type)){room=rooms.find(r=>r.id===action.id);if(!room)return{problem:'床をえらぼう。'};if(action.type==='DETAIL_REMOVE'&&room.structure?.items.some(i=>i.id===action.detailId&&i.shape==='cistern')&&connectedPipe(rooms,room.id,action.detailId))return{problem:'先に、タンクにつながっている配管を外そう。',room};const problem=editStructure(room,action);if(problem)return{problem,room};selected=room.id;}else return{problem:'道具をえらび直そう'};
 const problem=reelRoomProblem(room,rooms,bounds)||levelProblem(rooms);if(problem)return{problem,room};
 return{rooms,selected,nextId,room,problem:''};
}
export function commitReel(state,action,bounds){
 if(action?.type==='BOOK_SAVE'||action?.type==='BOOK_REMOVE'){try{const next=editReelBook(state,action);return{state:next,changed:JSON.stringify(next)!==JSON.stringify(state),problem:''};}catch(e){return{state,changed:false,problem:e.message};}}
 const draft=reelDraft(state,action,bounds);draft.problem ||= draft.rooms?levelProblem(draft.rooms):'';if(draft.problem)return{state,changed:false,problem:draft.problem};
 if(JSON.stringify(draft.rooms)===JSON.stringify(state.rooms))return{state,changed:false,problem:''};
 const past=[...state.past,{rooms:copy(state.rooms),selected:state.selected}].slice(-REEL.history);
 return{state:{version:state.version===6?6:state.version===5||draft.rooms.some(r=>r.floorMaterial)?5:action.type==='LEVEL_COPY'||state.version===4?4:state.version===3?3:state.version===2||draft.rooms.some(r=>r.structure)?2:1,nextId:draft.nextId,selected:draft.selected,rooms:draft.rooms,past,...(state.book?{book:state.book}:action.type==='LEVEL_COPY'||draft.rooms.some(r=>r.floorMaterial)?{book:{nextId:1,entries:[]}}:{})},changed:true,problem:''};
}
export function undoReel(state){if(!state.past.length)return state;const last=state.past.at(-1),rooms=copy(last.rooms);for(const r of rooms){const s=state.rooms.find(p=>p.id===r.id)?.structure;if(s){r.structure??={version:1,nextId:1,items:[]};r.structure.nextId=Math.max(r.structure.nextId,s.nextId);}}return{...state,rooms,selected:last.selected,past:state.past.slice(0,-1)};}
export function reelParts(rooms){
 const parts=[];for(const r of rooms){const w=r.x1-r.x0,d=r.z1-r.z0,x=(r.x0+r.x1)/2,z=(r.z0+r.z1)/2;
  parts.push(...floorParts(r));
  for(const side of REEL_SIDES)parts.push(...wallParts(r,side));parts.push(...structureParts(r));
 }return parts;
}
export function reelHandles(room,mode){
 if(!room)return[];return REEL_SIDES.map(side=>({side,x:side==='west'?room.x0:side==='east'?room.x1:(room.x0+room.x1)/2,z:side==='north'?room.z0:side==='south'?room.z1:(room.z0+room.z1)/2,y:(room.y??0)+3+(mode==='wall'?room.walls[side]:0)}));
}
export const reelVolume=rooms=>Math.max(0,Math.ceil(reelParts(rooms).filter(p=>p.kind!=='glass'&&!p.girder&&p.structuralMaterial!=='steel').reduce((n,p)=>n+p.w*p.h*p.d,0)+girders(rooms).reduce((n,{room,item})=>n+girderWood(room,item),0)-.000001));
export function reelEstimate(rooms){return reelVolume(rooms)/768;}
export function readReel(raw,bounds){
 try{
  if(typeof raw!=='string'||raw.length>1000000)return null;const s=JSON.parse(raw);
  if(![1,2,3,4,5,6].includes(s?.version)||!Number.isSafeInteger(s.nextId)||s.nextId<1||s.nextId>1e8||!Array.isArray(s.rooms)||!Array.isArray(s.past)||s.past.length>10||!validateReelBook(s,reelRoomProblem,bounds??{minX:-240,maxX:240,minZ:-240,maxZ:240}))return null;
  function valid(rooms,selected){if(!Array.isArray(rooms)||rooms.length>16)return false;const ids=new Set();for(const r of rooms){if(!Number.isInteger(r.id)||r.id<1||r.id>=s.nextId||ids.has(r.id)||r.floorMaterial!==undefined&&s.version<5||!r.walls||Object.keys(r.walls).length!==4||reelRoomProblem(r,rooms,bounds)||r.y!==undefined&&(!finite(r.y)||r.y< -32||r.y>(s.version>=4?LEVEL_MAX_Y:48)))return false;ids.add(r.id);}return !levelProblem(rooms)&&(selected===null||ids.has(selected));}
  return valid(s.rooms,s.selected)&&s.past.every(p=>valid(p.rooms,p.selected))?s:null;
 }catch{return null;}
}
