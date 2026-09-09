// N2: development-only, individually identified loan stock. No wallet or walk
// rewards. Quantities use integer geometry volume; never infer material by color.
import {PARTS,initialCrane,actCrane,stepCrane,validateCrane,collides} from './imasora-construction-crane.js';
import {worldToLocal} from './imasora-construction-loader-physics.js';
import {CRANE_WALK} from './imasora-construction-crane-walk.js';
export const TIMBER_PARTS=Object.freeze(PARTS.map(p=>Object.freeze({...p,
  materialId:p.id.startsWith('post')?'earth-iron':'earth-timber',
  name:`${p.id.startsWith('post')?'普通の鉄':'普通の木材'}・${p.name}`,
  color:p.id.startsWith('post')?0x70868d:p.color})));
export const TIMBER_MATERIALS=Object.freeze({'earth-timber':'普通の木材','earth-iron':'普通の鉄'});
export const RETURN_PAD=Object.freeze({x:0,z:16,w:116,d:52,maxBottom:8});
const fresh=p=>({...p,y:0,angle:0,vx:0,vz:0,vy:0,fixed:false});
export function materialLedger(s){
  const rows=Object.fromEntries(Object.keys(TIMBER_MATERIALS).map(id=>[id,{total:0,stored:0,loose:0,held:0,fixed:0}]));
  for(const t of TIMBER_PARTS){
    const volume=t.w*t.h*t.d,row=rows[t.materialId],p=s.parts.find(p=>p.id===t.id);
    row.total+=volume;row[s.stock.includes(t.id)?'stored':s.held===t.id?'held':p?.fixed?'fixed':'loose']+=volume;
  }
  return rows;
}
const reconcile=s=>{s.ledger=materialLedger(s);return s;};
export function initialTimber(){const s=initialCrane();s.materialVersion=1;s.parts=[fresh(TIMBER_PARTS[0])];s.stock=TIMBER_PARTS.slice(1).map(p=>p.id);s.message='床板Aから試せます。「素材置場」で次の部材を出してください。';return reconcile(s);}
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
    Math.abs(p.x-RETURN_PAD.x)>8||Math.abs(p.z-RETURN_PAD.z)>8?'最初の床板の位置にある、青い回収枠の中央へ運んでください。':
    p.y>RETURN_PAD.maxBottom?'回収枠の上へ、部材の底を高さ8以下に巻き下げてください。':
    Math.hypot(p.vx,p.vz)>12?'部材の揺れが落ち着くまで待ってください。':'';
  return{ok:!reason,reason:reason||'素材置場に戻せます。',part:p};
}
function transaction(s,action,id){s.revision++;s.history.push({revision:s.revision,action,id,transactionId:`timber-${s.revision}`});if(s.history.length>60)s.history.shift();return reconcile(s);}
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
  return reconcile(actCrane(state,action));
}
export function stepTimber(s,input,dt){return reconcile(stepCrane(s,input,dt));}
export function validateTimber(s){
  if(s?.materialVersion!==1||!Array.isArray(s.stock)||!Array.isArray(s.parts))throw Error('素材保存形式が不正です。');
  const ids=[...s.stock,...s.parts.map(p=>p.id)];
  if(ids.length!==TIMBER_PARTS.length||new Set(ids).size!==ids.length||ids.some(id=>!TIMBER_PARTS.some(t=>t.id===id)))throw Error('素材IDの重複・欠落があります。');
  for(const p of s.parts)if(p.materialId!==TIMBER_PARTS.find(t=>t.id===p.id).materialId)throw Error('素材の種類が一致しません。');
  validateCrane(s,TIMBER_PARTS.filter(t=>!s.stock.includes(t.id)));
  const expected=materialLedger(s);
  if(!s.ledger||Object.keys(s.ledger).length!==Object.keys(expected).length)throw Error('素材量の台帳が不正です。');
  for(const [id,row]of Object.entries(expected))for(const [key,amount]of Object.entries(row))if(s.ledger[id]?.[key]!==amount)throw Error('素材量の収支が一致しません。上書きせず停止します。');
  return s;
}
function checksum(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16);}
export function packTimber(s){validateTimber(s);const payload=JSON.stringify(s);return{kind:'timber-development-v1',payload,checksum:checksum(payload)};}
export function unpackTimber(p){if(p?.kind!=='timber-development-v1'||typeof p.payload!=='string'||p.checksum!==checksum(p.payload))throw Error('普通素材の保存データが不正です。上書きせず停止します。');return validateTimber(JSON.parse(p.payload));}
