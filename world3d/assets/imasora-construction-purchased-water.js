// 8-3a: immutable purchased-stock COPY + finite water work, never a loan grant.
import {unpackWorldPurchaseLedger as unpackCopy,fingerprint} from './imasora-world-purchase-ledger.js';
import {WORLD_LEDGER} from './imasora-world-live-ledger.js';
import {initialTransport,stepTransport,transportAction,transferTotals,validateTransport} from './imasora-construction-water-transport.js';
export const OWNED_WATER_SCOPE='construction-purchased-water-copy-v1';
export const WATER_PACKAGE=128; // 32,000 mL / 250 mL per physics unit.
export const RECEIVING_BAY=Object.freeze({x:-225,z:-102});
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);};
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const validId=id=>typeof id==='string'&&/^[\w-]{8,96}$/.test(id);
const exact=(v,fields)=>ok(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===fields.sort().join('|'),'持ち帰り保存の項目が不正です。');
export function readPurchasedSource(packet,kind){
  ok(['v451-copy','v452-integration'].includes(kind),'通常保存や貸出素材は読み込めません。');
  const ledger=kind==='v451-copy'?unpackCopy(packet):WORLD_LEDGER.unpackWorldPurchaseLedger(packet);
  ok(kind!=='v451-copy'||ledger.source.kind==='copied-world','前回の購入済み複製だけを使えます。');
  ok(!ledger.pending,'未完了の購入があります。元のショップで確認してください。');
  ok(ledger.materials['mars-water']%250===0,'水量を物理単位へ変換できません。');
  return {inventory:copy(ledger.materials),coins:ledger.world.ufoResources.spaceCoins};
}
export function emptyPurchasedTransport(){const work=initialTransport();work.source=0;work.message='購入済みの素材を読み込むまで、水は出ません。';return work;}
export function initialPurchasedWater(packet,kind){
  const source={kind,packet,...readPurchasedSource(packet,kind)},work=emptyPurchasedTransport();
  work.message='持ち帰った荷物を受付で出庫。給水槽に移した水だけをローダーで運べます。';
  const s={schema:1,scope:OWNED_WATER_SCOPE,revision:0,phase:0,source,allocated:0,events:[],delivery:null,work};validatePurchasedWater(s);return s;
}
export function purchasedWaterTotals(s){
  const t=transferTotals(s.work),moving=s.delivery?(s.delivery.kind==='dispatch'?s.delivery.q-s.delivery.moved:s.delivery.moved):0;
  return {...t,moving,stock:s.source.inventory['mars-water']/250-s.allocated,purchased:s.source.inventory['mars-water']/250};
}
export function receivingAvailable(s){const w=s.work,p=w.loader.player;
  return !w.paused&&!s.delivery&&!w.task&&!w.air.length&&w.loader.mode==='foot'&&!w.loader.transition&&Math.hypot(p.x-RECEIVING_BAY.x,p.z-RECEIVING_BAY.z)<=90;
}
export function purchasedWaterAction(s,action,value){
  validatePurchasedWater(s);
  if(action==='dispatch'||action==='store'){
    ok(validId(value),'出庫番号が不正です。');const previous=s.events.find(e=>e.id===value);
    if(previous){ok(previous.kind===action,'同じ番号で別の出庫はできません。');return s;}
    ok(receivingAvailable(s),'受付の近くで降車し、移送が終わってから操作してください。');
    ok(s.events.length<2000,'作業記録が上限です。保存を保護して停止しました。');
    if(action==='dispatch'){ok(purchasedWaterTotals(s).stock>=WATER_PACKAGE,'未出庫の火星水が32 Lありません。');ok(s.allocated+WATER_PACKAGE<=768,'この確認区画の容量は192 Lです。');}
    else ok(s.work.source>=WATER_PACKAGE,'給水槽に32 L必要です。水路や車載の水を遠くから戻すことはできません。');
    const n=copy(s);n.events.push({id:value,kind:action,q:WATER_PACKAGE,status:'moving'});n.delivery={id:value,kind:action,q:WATER_PACKAGE,moved:0,clock:0};
    if(action==='dispatch')n.allocated+=WATER_PACKAGE;
    n.work.message=action==='dispatch'?'荷物の32 Lを給水槽へ移しています。':'給水槽の32 Lを密閉容器へ戻しています。';n.revision++;validatePurchasedWater(n);return n;
  }
  ok(!s.delivery||action==='pause','受付で水を移送しています。終わるまで待ってください。');
  const n={...s,work:transportAction(s.work,action,value),revision:s.revision+1};validatePurchasedWater(n);return n;
}
function tick(s,input){
  let n={...s,work:stepTransport(s.work,s.delivery?{brake:true}:input,1/120),revision:s.revision+1};
  if(s.delivery){
    const d={...s.delivery,clock:s.delivery.clock+64/120},q=Math.min(d.q-d.moved,Math.floor(d.clock+1e-9));d.clock-=q;d.moved+=q;
    n.work={...n.work,source:n.work.source+(d.kind==='dispatch'?q:-q)};n.delivery=d;
    if(d.moved===d.q){n.events=s.events.map(e=>e.id===d.id?{...e,status:'done'}:e);if(d.kind==='store')n.allocated-=d.q;n.delivery=null;n.work.message=d.kind==='dispatch'?'32 Lの出庫完了。ローダーに乗って、給水槽から汲み取ろう。':'32 Lを荷物へ戻しました。購入品の総量は変わりません。';}
  }
  return n;
}
export function advancePurchasedWater(s,input,dt){
  ok(Number.isFinite(dt)&&dt>=0&&dt<=.1,'更新刻みが不正です。');if(s.work.paused)return s;
  let n={...s,phase:s.phase+dt};while(n.phase>=1/120-1e-9){n={...n,phase:Math.max(0,n.phase-1/120)};n=tick(n,input);}if(n.phase<1e-9)n.phase=0;return n;
}
export function validatePurchasedWater(s){
  exact(s,['schema','scope','revision','phase','source','allocated','events','delivery','work']);
  ok(s.schema===1&&s.scope===OWNED_WATER_SCOPE&&integer(s.revision)&&Number.isFinite(s.phase)&&s.phase>=0&&s.phase<1/120+1e-8,'持ち帰り保存の版・時間が不正です。');
  exact(s.source,['kind','packet','inventory','coins']);const original=readPurchasedSource(s.source.packet,s.source.kind);
  ok(fingerprint(original)===fingerprint({inventory:s.source.inventory,coins:s.source.coins}),'購入元の所持品が一致しません。');
  ok(integer(s.allocated)&&s.allocated<=768&&Array.isArray(s.events)&&s.events.length<=2000,'出庫量・記録が不正です。');
  let amount=0;const seen=new Set();let moving=null;
  s.events.forEach((e,i)=>{exact(e,['id','kind','q','status']);ok(validId(e.id)&&!seen.has(e.id),'出庫番号が重複・不正です。');seen.add(e.id);
    ok(['dispatch','store'].includes(e.kind)&&e.q===128&&['moving','done'].includes(e.status),'出庫内容が不正です。');
    if(e.status==='moving'){ok(!moving&&i===s.events.length-1,'途中の移送は一件だけです。');moving=e;}
    if(e.kind==='dispatch')amount+=e.q;else if(e.status==='done')amount-=e.q;
    ok(amount>=0&&amount<=768&&amount<=s.source.inventory['mars-water']/250,'購入量を超えた出庫記録です。');
  });
  ok(amount===s.allocated&&Boolean(moving)===Boolean(s.delivery),'出庫記録と水量が一致しません。');
  if(s.delivery){const d=s.delivery;exact(d,['id','kind','q','moved','clock']);ok(d.id===moving.id&&d.kind===moving.kind&&d.q===128&&integer(d.moved)&&d.moved<128&&Number.isFinite(d.clock)&&d.clock>=-1e-8&&d.clock<1+1e-8,'受付の移送が不正です。');ok(!s.work.task&&!s.work.air.length&&s.work.loader.mode==='foot','受付の移送と車の作業が競合しています。');}
  ok(integer(s.work.source)&&s.work.source<=s.allocated&&s.work.phase===0,'給水槽・固定更新の状態が不正です。');
  const t=purchasedWaterTotals(s);ok(t.total+t.moving===s.allocated&&t.stock>=0,'荷物・移送・作業場の水量が一致しません。');
  // Validation-only reserve: reuse unchanged 192 L lab geometry validator.
  // The reserve NEVER enters the state, rendering, pump, purchase or save.
  validateTransport({...s.work,source:s.work.source+768-t.total});return s;
}
export function packPurchasedWater(s){validatePurchasedWater(s);const n=copy(s);n.work.loader.vehicle.speed=0;n.work.paused=true;validatePurchasedWater(n);return JSON.stringify({format:OWNED_WATER_SCOPE,checksum:fingerprint(n),state:n});}
export function unpackPurchasedWater(raw){ok(typeof raw==='string'&&raw.length<=24000000,'持ち帰り記録が不正です。');const p=JSON.parse(raw);exact(p,['format','checksum','state']);ok(p.format===OWNED_WATER_SCOPE&&p.checksum===fingerprint(p.state),'持ち帰り記録の整合性を確認できません。');return validatePurchasedWater(p.state);}
