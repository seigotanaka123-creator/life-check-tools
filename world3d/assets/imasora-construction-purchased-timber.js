import{isKitCargo,kitTemplate,ownedTimberParts,validateKitBinding}from'./imasora-construction-kit-cargo.mjs?v=120gm';
import{BEAM_ISSUE,beamTemplate,isBeamBundle}from'./imasora-construction-timber-cargo.mjs?v=120gl';
import{validateBoardLiftState}from'./imasora-construction-board-lift-state.mjs?v=120gd';
import {inWorkArea,sharedSupply,assertVehicleField,workArea} from './imasora-construction-field-area.mjs?v=120ey';
// 8-3b2: finite purchased floors. Source receipts are immutable READ-ONLY copies.
// This adapter reuses the approved crane + spring/load/contact solvers unchanged.
import {initialCrane,actCrane,stepCrane,validateCrane,collides,pickOption} from './imasora-construction-crane.js?v=120gn';
import {worldToLocal} from './imasora-construction-loader-physics.js?v=120gf';
import {CRANE_WALK,cranePersonBlocked,craneWalkingRouteClear} from './imasora-construction-crane-walk.js?v=120gn';
import {floatingView,restoreFloatingFlags,stepFloating,releaseFloating,floatReadout,bindPlacedCargo,bindLandedCargo} from './imasora-construction-floating-physics.js?v=120gn';
import {readPurchasedSource} from './imasora-construction-purchased-water.js?v=120gn';
import {fingerprint} from './imasora-world-purchase-ledger.js?v=120gn';
export {floatReadout};
export const OWNED_TIMBER_SCOPE='construction-purchased-timber-copy-v1';
export const FLOOR_VOLUME=26880,MAX_ACTIVE_FLOORS=8;
export const FLOOR=Object.freeze({materialId:'mars-timber',w:80,h:6,d:56,x:0,z:16,color:0xaa80bd});
export const RETURN_PAD=Object.freeze({x:0,z:16,w:116,d:84,maxBottom:8});
export const TIMBER_MATERIALS=Object.freeze({'mars-timber':'火星木材'});
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);},integer=v=>Number.isSafeInteger(v)&&v>=0;
const validId=id=>typeof id==='string'&&/^[\w-]{8,96}$/.test(id);
const template=id=>({...FLOOR,id,name:`火星木材・浮遊床 ${id.split('-').at(-1)}`});
const fresh=(id,kind='issue')=>({...(kind===BEAM_ISSUE?beamTemplate(id):template(id)),y:0,angle:0,vx:0,vz:0,vy:0,fixed:false,hover:null,carrierId:null});
export function timberCopyTotals(s){const t={stored:s.stock,loose:0,held:0,floating:0,fixed:0,total:s.source.total};for(const p of ownedTimberParts(s))t[s.held===p.id?'held':p.hover?'floating':p.fixed?'fixed':'loose']++;return t;}
export function materialLedger(s){return{'mars-timber':Object.fromEntries(Object.entries(timberCopyTotals(s)).map(([k,n])=>[k,n*FLOOR_VOLUME]))};}
const reconcile=s=>{s.ledger=materialLedger(s);return s;};
// Never deep-clone the immutable world receipt at 120 Hz or during ghost rendering.
export function timberPhysicsState(s){const {source,scope,stock,nextId,events,phase,paused,ledger,...physics}=s;return physics;}
function mergePhysics(s,physics){const n={...s,...physics};if(!physics.rotation)delete n.rotation;return n;}
function initial(source){const s=initialCrane();Object.assign(s,{scope:OWNED_TIMBER_SCOPE,source,stock:source.total,parts:[],nextId:1,events:[],phase:0,paused:false});s.message='荷物から床板を1枚出し、クレーンで吊って浮かせよう。';return reconcile(s);}
export const emptyPurchasedTimber=()=>initial({mode:'empty',total:0});
export const initialTimberPractice=()=>initial({mode:'practice',total:2});
// Received world stock has no copied wallet/receipt packet. Dedicated world save only.
export const initialWorldTimberPhysics=total=>{const s=initial({mode:'world',total});s.paused=true;return validatePurchasedTimber(s);};
export const refreshTimberLedger=s=>reconcile(s);
export function initialPurchasedTimber(packet,kind){const src=readPurchasedSource(packet,kind),volume=src.inventory['mars-timber'];ok(integer(volume)&&volume%FLOOR_VOLUME===0,'購入木材を床1枚分へ変換できません。');return validatePurchasedTimber(initial({mode:'copy',kind,packet,...src,total:volume/FLOOR_VOLUME}));}
function touches(s,p){if(s.rig.mode!=='foot')return false;const a=s.rig.player,q=worldToLocal({x:p.x,z:p.z,heading:0},a.x,a.z);return a.y<p.y+p.h&&a.y+CRANE_WALK.height>p.y&&Math.hypot(Math.max(0,Math.abs(q.x)-p.w/2),Math.max(0,Math.abs(q.z)-p.d/2))<CRANE_WALK.radius+1;}
export function timberReturnPad(s){const p=sharedSupply(s.rig.vehicle,'material-store');return p?{...RETURN_PAD,x:p.x,z:p.z+116}:RETURN_PAD;}
export function issueOption(s,external=[],kind='issue'){ok(['issue',BEAM_ISSUE].includes(kind),'出す木材をえらぼう。');const p={...fresh(`owned-deck-${s.nextId}`,kind),x:timberReturnPad(s).x,z:timberReturnPad(s).z};let reason=s.paused?'一時停止を解除してください。':s.stock<1?'保管している火星木材は0組です。':s.parts.length>=MAX_ACTIVE_FLOORS?'木材は同時に8個まで出せるよ。使わない木材を回収しよう。':s.rig.transition||Math.abs(s.rig.vehicle.speed)>.1||s.held||s.rotation?'停車し、吊り荷と乗降を終えてください。':collides(s,p,{external})||(touches(s,p)?'レンが出庫位置にいます。':'');if(!reason&&s.rig.transition&&!craneWalkingRouteClear({...s,parts:[...s.parts,p]},s.rig.transition.path))reason='乗降経路が塞がっています。';return{ok:!reason,reason:reason||(kind===BEAM_ISSUE?'回収枠に角材4本の束を出すよ。':'受付前の枠へ床板を1枚出します。'),part:p};}
export function returnOption(s){const p=s.parts.find(p=>p.id===s.held);if(isKitCargo(p))return{ok:false,reason:'建築キットは建物の受取台へ渡そう。保管へ戻す時は元の作業台へ運ぼう。',part:p};let reason=s.paused?'一時停止を解除してください。':!p?'戻す木材に吊り索を掛けてください。':s.rig.mode!=='driving'||!s.work||s.deployment<1?'作業モードで回収してください。':s.rotation?'回転が止まるまで待ってください。':Math.abs(p.x-timberReturnPad(s).x)>8||Math.abs(p.z-timberReturnPad(s).z)>8?'青い回収枠の中央へ運んでください。':p.y>8?(isBeamBundle(p)?'角材の束を回収枠へ低く下ろそう。':'床板の底を高さ8以下へ巻き下げてください。'):Math.hypot(p.vx,p.vz)>12?'揺れが落ち着くまで待ってください。':'';return{ok:!reason,reason:reason||(isBeamBundle(p)?'角材の束を木材1組分として保管へ戻すよ。':'同じ床板1枚分を保管へ戻せます。'),part:p};}
export function purchasedTimberAction(state,action,id,external=[]){
  if(action==='pause'){const s=copy(state);s.paused=!s.paused;s.message=s.paused?'一時停止中です。':'作業を再開しました。';s.revision++;return s;}
  if(action==='issue'||action===BEAM_ISSUE||action==='return-stock'){
    ok(validId(id),'操作番号が不正です。');const prior=state.events.find(e=>e.id===id);if(prior){ok(prior.kind===action,'同じ番号で別の作業はできません。');return state;}
  }
  ok(!state.paused,'一時停止中です。');ok(!state.rig.transition,'乗り降りの完了を待ってください。');validatePurchasedTimber(state);
  if(action==='issue'||action===BEAM_ISSUE||action==='return-stock'){
    ok(state.events.length<2000,'操作記録が上限です。保存を保護して停止しました。');const option=action==='return-stock'?returnOption(state):issueOption(state,external,action);ok(option.ok,option.reason);
    const s=copy(state),p=option.part;
    if(action!=='return-stock'){s.stock--;s.parts.push(p);s.nextId++;s.message=action===BEAM_ISSUE?'角材4本の束を出したよ。吊り索をかけて運ぼう！':'床板1枚を出しました。運転席に乗り「クレーン作業へ」進んでください。';}
    else{s.stock++;s.parts=s.parts.filter(q=>q.id!==p.id);s.held=null;s.message='木材1組分を保管へ回収しました。購入量は増えません。';}
    s.events.push({id,kind:action,partId:p.id});s.revision++;return validatePurchasedTimber(reconcile(s));
  }
  ok(['interact','mode','snap','home','pick','rotate','release','place'].includes(action),'不明な木材操作です。');
  ok(action!=='release'||!isBeamBundle(state.parts.find(p=>p.id===state.held))&&!isKitCargo(state.parts.find(p=>p.id===state.held)),'角材の束は浮かせず、地面や床の上に置こう。');
  const physics=timberPhysicsState(state),candidate=pickOption(floatingView(physics));if(action==='pick'&&candidate?.hover&&floatReadout(state,candidate.id).load>0)return{...copy(state),message:'上に乗っているレンや床板を先に降ろしてください。'};
  const wasHeld=state.parts.find(p=>p.id===state.held),s=mergePhysics(state,restoreFloatingFlags(actCrane(floatingView(physics),action,external))),p=s.parts.find(p=>p.id===wasHeld?.id);
  if(action==='release'&&p&&s.held===null){releaseFloating(p);p.carrierId=null;s.message='この高さで浮遊を開始しました。低く浮かせた床は歩いて乗れます。';}
  if(action==='pick'&&s.held){const q=s.parts.find(p=>p.id===s.held);q.hover=null;q.carrierId=null;}
  if(action==='place'&&p&&s.held===null)bindPlacedCargo(s,p);
  return reconcile(s);
}
export function advancePurchasedTimber(s,input,dt){ok(Number.isFinite(dt)&&dt>=0&&dt<=.1,'更新刻みが不正です。');if(s.paused)return s;let n={...s,phase:s.phase+dt};while(n.phase>=1/120-1e-9){const prior=timberPhysicsState(n),physics=restoreFloatingFlags(stepCrane(floatingView(prior),input,1/120));bindLandedCargo(physics,prior);stepFloating(physics,1/120);n=mergePhysics(n,physics);n.phase=Math.max(0,n.phase-1/120);}if(n.phase<1e-9)n.phase=0;return reconcile(n);}
export function validatePurchasedTimber(s){
  ok(s?.scope===OWNED_TIMBER_SCOPE&&s.source&&integer(s.stock)&&integer(s.nextId)&&s.nextId>0&&typeof s.paused==='boolean'&&Number.isFinite(s.phase)&&s.phase>=0&&s.phase<1/120+1e-8,'木材の保存形式が不正です。');
  const src=s.source;ok(integer(src.total),'購入量が不正です。');
  if(src.mode==='copy'){const original=readPurchasedSource(src.packet,src.kind);ok(fingerprint(original)===fingerprint({inventory:src.inventory,coins:src.coins})&&original.inventory['mars-timber']===src.total*FLOOR_VOLUME,'購入元の木材・金貨が一致しません。');}
  else ok((src.mode==='world'||src.mode==='practice'&&src.total===2||src.mode==='empty'&&src.total===0)&&Object.keys(src).sort().join(',')==='mode,total','貸出材を購入品へ混入できません。');
  ok(Array.isArray(s.parts)&&s.parts.length<=MAX_ACTIVE_FLOORS&&s.stock+ownedTimberParts(s).length===src.total,'木材の収支が一致しません。');
  ok(Array.isArray(s.events)&&s.events.length<=2000,'木材の履歴が不正です。');let next=1;const active=new Set(),seen=new Set(),kinds=new Map();
  for(const e of s.events){ok(validId(e.id)&&!seen.has(e.id)&&Object.keys(e).sort().join(',')==='id,kind,partId','操作番号が不正・重複しています。');seen.add(e.id);if(e.kind==='issue'||e.kind===BEAM_ISSUE){ok(e.partId===`owned-deck-${next++}`&&!active.has(e.partId),'床板の出庫IDが不正です。');active.add(e.partId);kinds.set(e.partId,e.kind);ok(active.size<=src.total&&active.size<=MAX_ACTIVE_FLOORS,'購入量を超える出庫です。');}else{ok(e.kind==='return-stock'&&active.has(e.partId),'存在しない床板を回収しています。');active.delete(e.partId);}}
  ok(next===s.nextId&&active.size===ownedTimberParts(s).length&&ownedTimberParts(s).every(p=>active.has(p.id))&&new Set(s.parts.map(p=>p.id)).size===s.parts.length,'床板と出庫履歴が一致しません。');
  const kits=s.buildingKits??[];ok(Array.isArray(kits)&&kits.length<=1&&(!kits.length||src.mode==='world'),'建築キットは本体の建物から受け取ろう。');kits.forEach(validateKitBinding);ok(kits.length===s.parts.filter(isKitCargo).length&&kits.every(b=>s.parts.some(p=>p.id===b.partId)),'建築キットの部材を残そう。');
  validateBoardLiftState(s);validateCrane(s,s.parts.map(p=>isKitCargo(p)?kitTemplate(kits.find(b=>b.partId===p.id)):kinds.get(p.id)===BEAM_ISSUE?beamTemplate(p.id):template(p.id)),s.highCargoVersion===1?260:180);
  for(const p of s.parts){ok(p.materialId==='mars-timber'&&Math.abs(p.vx)<=200&&Math.abs(p.vz)<=200&&Math.abs(p.vy)<=(p.hover?30:2000),'材質・速度が不正です。');
    ok(p.carrierId===null||typeof p.carrierId==='string'&&p.carrierId!==p.id&&p.id!==s.held&&!p.hover&&s.parts.some(q=>q.id===p.carrierId&&q.hover),'積載状態が不正です。');
    if(isBeamBundle(p)||isKitCargo(p))ok(p.hover===null&&!s.boardLifts?.sites.some(r=>r.partId===p.id),'角材の束は床や地面に置こう。');
    if(p.hover!==null)ok(p.hover&&!p.fixed&&p.id!==s.held&&Number.isFinite(p.hover.height)&&p.hover.height>=0&&p.hover.height<=150&&typeof p.hover.contact==='string','浮遊状態が不正です。');
    ok(!collides(s,p),'床板が車体・柵・ほかの床板と重なっています。');
  }
  ok(s.rig.player.y>=0&&s.rig.player.y<=220,'乗員の高さが不正です。');if(s.rig.mode==='foot')ok(!cranePersonBlocked(floatingView(s),s.rig.player),'レンが床板や車体に埋まっています。');
  ok(fingerprint(s.ledger)===fingerprint(materialLedger(s)),'材積の台帳が一致しません。');return s;
}
export function packPurchasedTimber(s){validatePurchasedTimber(s);ok(s.source.mode==='copy','貸出・未読込の木材は保存できません。');const n=copy(s);n.paused=true;n.rig.vehicle.speed=0;return JSON.stringify({format:OWNED_TIMBER_SCOPE,state:n,checksum:fingerprint(n)});}
export function unpackPurchasedTimber(raw){ok(typeof raw==='string'&&raw.length<24000000,'木材保存が不正です。');const p=JSON.parse(raw);ok(p.format===OWNED_TIMBER_SCOPE&&p.state?.source?.mode==='copy'&&p.checksum===fingerprint(p.state),'木材保存の整合性を確認できません。');return validatePurchasedTimber(p.state);}
