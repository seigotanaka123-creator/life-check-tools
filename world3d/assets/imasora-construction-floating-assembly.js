// Stage 7-2: six loan pieces, connected floating floors, isolated inventory.
import {initialCrane,actCrane,stepCrane,validateCrane,collides,pickOption} from './imasora-construction-crane.js';
import {worldToLocal} from './imasora-construction-loader-physics.js';
import {CRANE_WALK} from './imasora-construction-crane-walk.js';
import {floatingView,restoreFloatingFlags,stepFloating,releaseFloating,floatReadout,bindPlacedCargo,bindLandedCargo} from './imasora-construction-floating-assembly-physics.js';
import {component,floatingPlacement} from './imasora-construction-floating-assembly-physics.js';
import {joinOption,detachOption,beginJoin,stepJoining,alignCable,touchingFaces,JOIN_SECONDS} from './imasora-construction-floating-joints.js';
export {joinOption,detachOption,component};
export {floatReadout};
export const TIMBER_PARTS=Object.freeze([
  {id:'mars-deck',materialId:'mars-timber',name:'火星木材・浮遊床 A',w:80,h:6,d:56,x:0,z:16,color:0xaa80bd},
  {id:'mars-deck-b',materialId:'mars-timber',name:'火星木材・浮遊床 B',w:80,h:6,d:56,x:-85,z:56,color:0xa180bd},
  {id:'mars-deck-c',materialId:'mars-timber',name:'火星木材・浮遊床 C',w:80,h:6,d:56,x:85,z:56,color:0xb98bbc},
  {id:'earth-deck',materialId:'earth-timber',name:'普通の木材・比較床',w:80,h:6,d:56,x:0,z:90,color:0xdab573},
  {id:'light-weight',materialId:'earth-iron',name:'普通の鉄・小さいおもり',w:20,h:12,d:20,x:-85,z:-5,color:0x819497},
  {id:'heavy-weight',materialId:'earth-iron',name:'普通の鉄・重いおもり',w:28,h:26,d:28,x:85,z:-5,color:0x556970},
].map(Object.freeze));
export const TIMBER_MATERIALS=Object.freeze({'mars-timber':'火星木材','earth-timber':'普通の木材','earth-iron':'普通の鉄'});
export const RETURN_PAD=Object.freeze({x:0,z:16,w:116,d:84,maxBottom:8});
const fresh=p=>({...p,y:0,angle:0,vx:0,vz:0,vy:0,fixed:false,hover:null,carrierId:null});
export function materialLedger(s){
  const rows=Object.fromEntries(Object.keys(TIMBER_MATERIALS).map(id=>[id,{total:0,stored:0,loose:0,held:0,floating:0,fixed:0}]));
  for(const t of TIMBER_PARTS){
    const volume=t.w*t.h*t.d,row=rows[t.materialId],p=s.parts.find(p=>p.id===t.id);
    row.total+=volume;row[s.stock.includes(t.id)?'stored':s.held===t.id?'held':p?.hover?'floating':p?.fixed?'fixed':'loose']+=volume;
  }
  return rows;
}
const reconcile=s=>{s.ledger=materialLedger(s);return s;};
export function initialTimber(){const s=initialCrane();s.materialVersion=3;s.joints=[];s.parts=[fresh(TIMBER_PARTS[0])];s.stock=TIMBER_PARTS.slice(1).map(p=>p.id);s.message='火星木材を巻上げ、浮遊を開始してください。離した高さを覚えます。';return reconcile(s);}
function touchingWalker(s,p){
  if(s.rig.mode!=='foot')return false;
  const a=s.rig.player,q=worldToLocal({x:p.x,z:p.z,heading:p.angle},a.x,a.z);
  return a.y<p.y+p.h+.05&&a.y+CRANE_WALK.height>p.y&&Math.hypot(Math.max(0,Math.abs(q.x)-p.w/2),Math.max(0,Math.abs(q.z)-p.d/2))<CRANE_WALK.radius+1;
}
export function issueOption(s,id){
  const template=TIMBER_PARTS.find(p=>p.id===id);
  if(!template||!s.stock.includes(id))return{ok:false,reason:'この部材はすでに作業場に出ています。'};
  if(s.rig.transition||Math.abs(s.rig.vehicle.speed)>.1||s.held)return{ok:false,reason:'荷を置いて停車し、乗り降りを終えてください。'};
  const p=fresh(template),hit=collides(s,p)||(touchingWalker(s,p)?'レン':'');
  return{ok:!hit,reason:hit?`出庫位置に${hit}があります。先に移動してください。`:'指定の置場へ出せます。',part:p};
}
export function returnOption(s){
  const p=s.parts.find(p=>p.id===s.held);
  let reason=!p?'戻したい部材に吊り索を掛けてください。':
    s.rig.mode!=='driving'||!s.work||s.deployment<1?'クレーン作業中に回収できます。':
    s.rotation?'回転が止まるまで待ってください。':
    Math.abs(p.x-RETURN_PAD.x)>8||Math.abs(p.z-RETURN_PAD.z)>8?'最初の火星木材の位置にある、青い回収枠の中央へ運んでください。':
    p.y>RETURN_PAD.maxBottom?'回収枠の上へ、部材の底を高さ8以下に巻き下げてください。':
    Math.hypot(p.vx,p.vz)>12?'部材の揺れが落ち着くまで待ってください。':'';
  return{ok:!reason,reason:reason||'素材置場に戻せます。',part:p};
}
function transaction(s,action,id){s.revision++;s.history.push({revision:s.revision,action,id,transactionId:`floating-assembly-${s.revision}`});if(s.history.length>60)s.history.shift();return reconcile(s);}
export function actTimber(state,action){
  if(state.joining&&action!=='home')return{...structuredClone(state),message:'接合中です。次の操作は予約しません。'};
  if(action.startsWith('issue:')){
    const id=action.slice(6),s=structuredClone(state),o=issueOption(s,id);s.message=o.reason;
    if(!o.ok)return s;
    s.stock=s.stock.filter(key=>key!==id);s.parts.push(o.part);s.message=`${o.part.name}を指定の置場へ出しました。`;
    return transaction(s,'issue',id);
  }
  if(action==='return-stock'){
    const s=structuredClone(state),o=returnOption(s);s.message=o.reason;if(!o.ok)return s;
    const id=o.part.id;s.parts=s.parts.filter(p=>p.id!==id);s.stock.push(id);s.held=null;
    s.message=`${o.part.name}を回収しました。同じ素材・同じ量で再び使えます。`;
    return transaction(s,'return-stock',id);
  }
  if(state.joining){
    if(action!=='home')return{...structuredClone(state),message:'接合中です。次の操作は予約しません。'};
    const copy=structuredClone(state),part=copy.parts.find(p=>p.id===copy.held);
    delete copy.joining;alignCable(copy,part);return reconcile(restoreFloatingFlags(actCrane(floatingView(copy),'home')));
  }
  if(action==='join'){
    const s=structuredClone(state),o=joinOption(s);s.message=o.reason;if(o.ok)beginJoin(s,o);return reconcile(s);
  }
  const candidate=pickOption(floatingView(state));
  if(action==='detach'){const o=detachOption(state);if(!o.ok)return{...structuredClone(state),message:o.reason};}
  if(action==='pick'&&candidate?.hover&&component(state,candidate.id).length>1)return{...structuredClone(state),message:'つながった床です。「接合を外して吊る」を使ってください。'};
  if(['pick','detach'].includes(action)&&candidate?.hover&&floatReadout(state,candidate.id).load>0)return{...structuredClone(state),message:'載っているレンやおもりを先に降ろしてください。'};
  if(action==='place'){const o=floatingPlacement(state);if(o&&!o.ok)return{...structuredClone(state),message:o.reason};}
  const wasHeld=state.parts.find(p=>p.id===state.held);
  const s=restoreFloatingFlags(actCrane(floatingView(state),action==='detach'?'pick':action));
  const p=s.parts.find(p=>p.id===wasHeld?.id);
  if(action==='release'&&p&&s.held===null&&wasHeld.materialId==='mars-timber')releaseFloating(p);
  if(['pick','detach'].includes(action)&&s.held){
    const q=s.parts.find(p=>p.id===s.held);q.hover=null;q.carrierId=null;
    s.joints=s.joints.filter(j=>j.a!==q.id&&j.b!==q.id);
    if(action==='detach')s.message='この床だけ接合を外して吊りました。残った床は浮遊を保ちます。';
  }
  if(action==='place'&&p&&s.held===null)bindPlacedCargo(s,p);
  if(action==='release'&&p&&s.held===null)p.carrierId=null;
  if(action==='release'&&p?.hover)s.message='この高さに浮かせました。別の火星木材を辺へ運ぶと接合できます。';
  return reconcile(s);
}
export function stepTimber(s,input,dt){
  const view=floatingView(s);
  if(s.joining){view.parts.find(p=>p.id===s.held).fixed=true;view.held=null;}
  const next=restoreFloatingFlags(stepCrane(view,s.joining?{}:input,dt));
  if(s.joining){next.held=s.held;next.parts.find(p=>p.id===s.held).fixed=false;}
  bindLandedCargo(next,s);stepFloating(next,dt);stepJoining(next,dt);return reconcile(next);
}
export function validateTimber(s){
  if(s?.materialVersion!==3||!Array.isArray(s.stock)||!Array.isArray(s.parts))throw Error('素材保存形式が不正です。');
  const ids=[...s.stock,...s.parts.map(p=>p.id)];
  if(ids.length!==TIMBER_PARTS.length||new Set(ids).size!==ids.length||ids.some(id=>!TIMBER_PARTS.some(t=>t.id===id)))throw Error('素材IDの重複・欠落があります。');
  for(const p of s.parts)if(p.materialId!==TIMBER_PARTS.find(t=>t.id===p.id).materialId)throw Error('素材の種類が一致しません。');
  validateCrane(s,TIMBER_PARTS.filter(t=>!s.stock.includes(t.id)));
  for(const p of s.parts){
    if(p.carrierId!==null&&(p.materialId==='mars-timber'||p.id===s.held||!s.parts.some(q=>q.id===p.carrierId&&(q.hover||q.carrierId))))throw Error('浮遊床の積載状態が不正です。');
    if(p.hover!==null){
      const h=p.hover;
      if(p.materialId!=='mars-timber'||p.fixed||p.id===s.held||!h||!Number.isFinite(h.height)||h.height<0||h.height>150||typeof h.contact!=='string')throw Error('浮遊状態が不正です。');
    }
    if(Math.abs(p.vy)>(p.hover?30:2000)||Math.abs(p.vx)>200||Math.abs(p.vz)>200)throw Error('部材速度が不正です。');
  }
  if(!Array.isArray(s.joints)||s.joints.length>3)throw Error('接合台帳が不正です。');
  const edges=new Set();
  for(const j of s.joints){
    const a=s.parts.find(p=>p.id===j.a),b=s.parts.find(p=>p.id===j.b),key=[j.a,j.b].sort().join('/');
    if(!a?.hover||!b?.hover||a===b||edges.has(key)||!touchingFaces(a,b))throw Error('接合面・部材の参照が不正です。');
    edges.add(key);
    if(Math.abs(a.hover.height-b.hover.height)>1e-5||['vx','vy','vz'].some(k=>Math.abs(a[k]-b[k])>1e-5))throw Error('接合床の浮遊状態が一致しません。');
  }
  for(const p of s.parts)if(p.carrierId){
    const seen=new Set([p.id]);let q=p;
    while(q.carrierId){if(seen.has(q.carrierId))throw Error('積載の循環参照です。');seen.add(q.carrierId);q=s.parts.find(t=>t.id===q.carrierId);if(!q)throw Error('積載先がありません。');}
    if(!q.hover)throw Error('浮遊の支持元がありません。');
  }
  if(s.joining){
    const j=s.joining,p=s.parts.find(p=>p.id===s.held),q=s.parts.find(p=>p.id===j.targetId);
    if(!p||p.id!==j.partId||p.hover||!q?.hover||s.rotation||s.rig.mode!=='driving'||!Number.isFinite(j.elapsed)||j.elapsed<0||j.elapsed>=JOIN_SECONDS||![j.start,j.end].every(v=>v&&['x','y','z'].every(k=>Number.isFinite(v[k]))))throw Error('接合アニメーションの保存が不正です。');
    const t=j.elapsed/JOIN_SECONDS,e=t*t*(3-2*t);
    if(!touchingFaces({...p,...j.end},q)||['x','y','z'].some(k=>Math.abs(p[k]-(j.start[k]+(j.end[k]-j.start[k])*e))>1e-5))throw Error('接合途中の位置が一致しません。');
  }
  const expected=materialLedger(s);
  if(!s.ledger||Object.keys(s.ledger).length!==Object.keys(expected).length)throw Error('素材量の台帳が不正です。');
  for(const [id,row]of Object.entries(expected))for(const [key,amount]of Object.entries(row))if(s.ledger[id]?.[key]!==amount)throw Error('素材量の収支が一致しません。上書きせず停止します。');
  return s;
}
function checksum(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16);}
export function packTimber(s){validateTimber(s);const payload=JSON.stringify(s);return{kind:'floating-assembly-development-v1',payload,checksum:checksum(payload)};}
export function unpackTimber(p){if(p?.kind!=='floating-assembly-development-v1'||typeof p.payload!=='string'||p.checksum!==checksum(p.payload))throw Error('浮遊建築の保存データが不正です。上書きせず停止します。');return validateTimber(JSON.parse(p.payload));}
export function floatingDemo(kind){
  if(!['join','walk','load','overload'].includes(kind))throw Error('不明な比較画面です。');
  const s=initialTimber(),ids=kind==='walk'?['mars-deck','mars-deck-b','mars-deck-c']:kind==='overload'?['mars-deck','heavy-weight']:kind==='load'?['mars-deck','mars-deck-b','heavy-weight']:['mars-deck','mars-deck-b'];
  s.parts=TIMBER_PARTS.filter(p=>ids.includes(p.id)).map(fresh);s.stock=TIMBER_PARTS.filter(p=>!ids.includes(p.id)).map(p=>p.id);
  const floors=s.parts.filter(p=>p.materialId==='mars-timber');
  floors.forEach((p,i)=>{Object.assign(p,{x:kind==='walk'?(i-1)*80:i*80,z:65,y:['load','overload'].includes(kind)?24:2});releaseFloating(p);});
  if(kind==='join'){
    Object.assign(floors[0],{x:-40,z:16});Object.assign(floors[1],{x:44,y:4,z:18,hover:null});
    s.rig.mode='driving';s.work=true;s.deployment=1;s.held=floors[1].id;
    const dx=44,dz=72;s.boom.yaw=Math.atan2(dx,dz);s.boom.reach=Math.hypot(dx,dz);alignCable(s,floors[1]);
  }else{
    for(let i=1;i<floors.length;i++)s.joints.push({a:floors[i-1].id,b:floors[i].id});
    const weight=s.parts.find(p=>p.id==='heavy-weight');if(weight)Object.assign(weight,{x:0,z:65,y:30,fixed:true,carrierId:'mars-deck'});
    Object.assign(s.rig.player,{x:kind==='walk'?-80:0,z:5,y:0,heading:0});
  }
  s.message=kind==='join'?'「床に接合」を押してみてください。試験用に接合直前まで準備しています。':kind==='walk'?'前へ進んで床に乗り、左右に歩いて継ぎ目を渡れます。':'同じ重い鉄を、1枚と2枚の床で支える比較です。';
  return reconcile(s);
}
