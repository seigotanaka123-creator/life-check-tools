// N2: development-only, individually identified loan stock. No wallet or walk
// rewards. Quantities use integer geometry volume; never infer material by color.
import {initialCrane,actCrane,stepCrane,validateCrane,collides,pickOption} from './imasora-construction-crane.js';
import {worldToLocal} from './imasora-construction-loader-physics.js';
import {CRANE_WALK} from './imasora-construction-crane-walk.js';
import {floatingView,restoreFloatingFlags,stepFloating,releaseFloating,floatReadout,bindPlacedCargo,bindLandedCargo} from './imasora-construction-floating-physics.js';
export {floatReadout};
export const TIMBER_PARTS=Object.freeze([
  {id:'mars-deck',materialId:'mars-timber',name:'火星木材・浮遊床',w:80,h:6,d:56,x:0,z:16,color:0xaa80bd},
  {id:'earth-deck',materialId:'earth-timber',name:'普通の木材・比較床',w:80,h:6,d:56,x:-105,z:40,color:0xdab573},
  {id:'light-weight',materialId:'earth-iron',name:'普通の鉄・小さいおもり',w:20,h:12,d:20,x:85,z:18,color:0x819497},
  {id:'heavy-weight',materialId:'earth-iron',name:'普通の鉄・重いおもり',w:28,h:26,d:28,x:105,z:45,color:0x556970},
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
export function initialTimber(){const s=initialCrane();s.materialVersion=2;s.parts=[fresh(TIMBER_PARTS[0])];s.stock=TIMBER_PARTS.slice(1).map(p=>p.id);s.message='火星木材を巻上げ、浮遊を開始してください。離した高さを覚えます。';return reconcile(s);}
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
function transaction(s,action,id){s.revision++;s.history.push({revision:s.revision,action,id,transactionId:`floating-timber-${s.revision}`});if(s.history.length>60)s.history.shift();return reconcile(s);}
export function actTimber(state,action){
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
  const candidate=pickOption(floatingView(state));
  if(action==='pick'&&candidate?.hover){
    const info=floatReadout(state,candidate.id);
    if(info.load>0)return{...structuredClone(state),message:'載っているレンやおもりを先に降ろしてください。'};
  }
  const wasHeld=state.parts.find(p=>p.id===state.held);
  const s=restoreFloatingFlags(actCrane(floatingView(state),action));
  const p=s.parts.find(p=>p.id===wasHeld?.id);
  if(action==='release'&&p&&s.held===null&&wasHeld.materialId==='mars-timber')releaseFloating(p);
  if(action==='pick'&&s.held){const q=s.parts.find(p=>p.id===s.held);q.hover=null;q.carrierId=null;}
  if(action==='place'&&p&&s.held===null)bindPlacedCargo(s,p);
  if(action==='release'&&p&&s.held===null)p.carrierId=null;
  if(action==='release'&&p?.hover)s.message='火星木材がこの高さを覚えました。レンやおもりが乗ると沈み、降りると戻ります。';
  return reconcile(s);
}
export function stepTimber(s,input,dt){
  const next=restoreFloatingFlags(stepCrane(floatingView(s),input,dt));
  bindLandedCargo(next,s);stepFloating(next,dt);return reconcile(next);
}
export function validateTimber(s){
  if(s?.materialVersion!==2||!Array.isArray(s.stock)||!Array.isArray(s.parts))throw Error('素材保存形式が不正です。');
  const ids=[...s.stock,...s.parts.map(p=>p.id)];
  if(ids.length!==TIMBER_PARTS.length||new Set(ids).size!==ids.length||ids.some(id=>!TIMBER_PARTS.some(t=>t.id===id)))throw Error('素材IDの重複・欠落があります。');
  for(const p of s.parts)if(p.materialId!==TIMBER_PARTS.find(t=>t.id===p.id).materialId)throw Error('素材の種類が一致しません。');
  validateCrane(s,TIMBER_PARTS.filter(t=>!s.stock.includes(t.id)));
  for(const p of s.parts){
    if(p.carrierId!==null&&(p.carrierId!=='mars-deck'||p.materialId==='mars-timber'||p.id===s.held||!s.parts.some(q=>q.id===p.carrierId&&q.hover)))throw Error('浮遊床の積載状態が不正です。');
    if(p.hover!==null){
      const h=p.hover;
      if(p.materialId!=='mars-timber'||p.fixed||p.id===s.held||!h||!Number.isFinite(h.height)||h.height<0||h.height>150||typeof h.contact!=='string')throw Error('浮遊状態が不正です。');
    }
    if(Math.abs(p.vy)>(p.hover?30:2000)||Math.abs(p.vx)>200||Math.abs(p.vz)>200)throw Error('部材速度が不正です。');
  }
  const expected=materialLedger(s);
  if(!s.ledger||Object.keys(s.ledger).length!==Object.keys(expected).length)throw Error('素材量の台帳が不正です。');
  for(const [id,row]of Object.entries(expected))for(const [key,amount]of Object.entries(row))if(s.ledger[id]?.[key]!==amount)throw Error('素材量の収支が一致しません。上書きせず停止します。');
  return s;
}
function checksum(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16);}
export function packTimber(s){validateTimber(s);const payload=JSON.stringify(s);return{kind:'floating-timber-development-v1',payload,checksum:checksum(payload)};}
export function unpackTimber(p){if(p?.kind!=='floating-timber-development-v1'||typeof p.payload!=='string'||p.checksum!==checksum(p.payload))throw Error('普通素材の保存データが不正です。上書きせず停止します。');return validateTimber(JSON.parse(p.payload));}
export function floatingDemo(kind){
  if(!['drop','walk'].includes(kind))throw Error('不明な比較画面です。');
  let s=initialTimber();s=actTimber(s,'issue:earth-deck');
  const mars=s.parts.find(p=>p.id==='mars-deck'),earth=s.parts.find(p=>p.id==='earth-deck');
  Object.assign(mars,{x:60,z:65,y:kind==='drop'?24:2});
  Object.assign(earth,{x:-60,z:65,y:kind==='drop'?24:0});
  releaseFloating(mars);
  s.rig.player={...s.rig.player,x:60,z:5,y:0,heading:0};
  s.message=kind==='drop'?'同じ高さ・同じ大きさ。普通の木材は落ち、火星木材は浮きます。':'前へ歩くと高さ8の浮遊床へ上がれます。降りると元の高さへ戻ります。';
  return reconcile(s);
}
