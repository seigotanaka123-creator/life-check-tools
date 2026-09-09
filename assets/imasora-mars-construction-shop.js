// Stage 8-1: isolated purchase ledger. These are trial prices, not the live economy.
import {canonical} from './imasora-construction-state.js';

export const SHOP_SCOPE = 'mars-construction-shop-development-v1';
export const TRIAL_COINS = 60;
export const MAX_ORDERS = 2000;
export const SHOP_OFFERS = Object.freeze([
  Object.freeze({id:'mars-water',name:'火星水',price:12,amount:32000,unit:'mL',pack:'32 Lの密閉容器',
    description:'矢印の方向へ流れる水。上を向ければ、天井へ向かう水路に。',
    vehicle:'ローダーで運び、バケットから注ぐ',look:'water'}),
  Object.freeze({id:'mars-soil',name:'火星土',price:10,amount:8000,unit:'土量',pack:'8ブロック分',
    description:'足元に敷くと、ジャンプの到達高が通常の3倍に。重ねても倍率は増えません。',
    vehicle:'ローダーで運び、地面に敷く（接続予定）',look:'soil'}),
  Object.freeze({id:'mars-timber',name:'火星木材',price:18,amount:26880,unit:'材積',pack:'浮遊床1枚分',
    description:'離した高さに浮く木材。つなげれば、広い空中の床を作れます。',
    vehicle:'クレーンで吊り上げ、床同士を接合',look:'timber'}),
]);
const ids=SHOP_OFFERS.map(o=>o.id), clone=s=>structuredClone(s);
const ok=(test,message)=>{if(!test)throw Error(message);};
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function keys(value,expected){
  ok(value&&Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).sort().join('|')===[...expected].sort().join('|'),'取引データの項目が不正です。');
}
function validId(id){ok(typeof id==='string'&&/^[a-zA-Z0-9_-]{8,96}$/.test(id),'注文番号が不正です。');}
export function offerFor(id){const offer=SHOP_OFFERS.find(o=>o.id===id);ok(offer,'この素材は今回の販売対象ではありません。');return offer;}
export function quoteOrder(offerId,quantity=1){
  const o=offerFor(offerId);ok(integer(quantity,1,5),'購入数は1〜5セットで選んでください。');
  return {offerId,quantity,cost:o.price*quantity,amount:o.amount*quantity};
}
export function formatMaterial(id,amount){
  if(id==='mars-water')return `${amount/1000} L`;
  if(id==='mars-soil')return `${amount/1000}ブロック分`;
  return `床${amount/26880}枚分（材積 ${amount/1000}）`;
}
export function createShopState(){
  return {schemaVersion:1,scope:SHOP_SCOPE,catalogVersion:1,revision:0,grant:TRIAL_COINS,balance:TRIAL_COINS,
    materials:Object.fromEntries(ids.map(id=>[id,0])),orders:[],pending:null};
}
function validateOrder(order,statuses){
  keys(order,['id','offerId','quantity','cost','amount','status']);validId(order.id);
  ok(statuses.includes(order.status),'注文の状態が不正です。');
  const q=quoteOrder(order.offerId,order.quantity);
  ok(q.cost===order.cost&&q.amount===order.amount,'価格・数量が保存した注文と一致しません。');
}
export function validateShop(s){
  keys(s,['schemaVersion','scope','catalogVersion','revision','grant','balance','materials','orders','pending']);
  ok(s.schemaVersion===1&&s.scope===SHOP_SCOPE&&s.catalogVersion===1,'この保存版・開発区分は読み込めません。');
  ok(s.grant===TRIAL_COINS&&integer(s.balance,0,TRIAL_COINS),'試験用金貨の残高が不正です。');
  keys(s.materials,ids);
  ok(Array.isArray(s.orders)&&s.orders.length<=MAX_ORDERS,'注文記録の上限または形式が不正です。');
  const seen=new Set(), totals=Object.fromEntries(ids.map(id=>[id,0]));let balance=s.grant;
  for(const order of s.orders){
    validateOrder(order,['paid','cancelled']);ok(!seen.has(order.id),'同じ注文が二重に記録されています。');seen.add(order.id);
    ok(balance>=order.cost,'当時の残高では購入できない注文です。');
    if(order.status==='paid'){balance-=order.cost;totals[order.offerId]+=order.amount;}
  }
  if(s.pending){validateOrder(s.pending,['pending']);ok(s.orders.length<MAX_ORDERS,'注文記録の上限を超えます。');ok(!seen.has(s.pending.id),'処理済みの注文が保留されています。');ok(balance>=s.pending.cost,'保留した注文の金貨が足りません。');}
  ok(s.revision===s.orders.length*2+(s.pending?1:0),'注文記録と保存番号が一致しません。');
  ok(balance===s.balance&&canonical(totals)===canonical(s.materials),'金貨・建材の合計が購入記録と一致しません。上書きせず停止します。');
  return true;
}
export function prepareOrder(s,offerId,quantity,id){
  validateShop(s);validId(id);const q=quoteOrder(offerId,quantity);
  const old=s.orders.find(o=>o.id===id)||(s.pending?.id===id?s.pending:null);
  if(old){ok(old.offerId===offerId&&old.quantity===quantity,'同じ注文番号で違う商品は購入できません。');return s;}
  ok(!s.pending,'先に保留中の注文を再開するか取り消してください。');
  ok(s.orders.length<MAX_ORDERS,'試験用注文の上限です。記録を書き出してください。');
  ok(s.balance>=q.cost,'宇宙金貨が足りません。');
  const n=clone(s);n.pending={id,...q,status:'pending'};n.revision++;validateShop(n);return n;
}
export function settleOrder(s,id,{cancel=false}={}){
  validateShop(s);validId(id);const old=s.orders.find(o=>o.id===id);
  if(old){ok(old.status===(cancel?'cancelled':'paid'),'この注文はすでに別の状態で完了しています。');return s;}
  ok(s.pending?.id===id,'再開できる保留注文が見つかりません。');
  const n=clone(s),order={...n.pending,status:cancel?'cancelled':'paid'};
  // Payment, goods and receipt become visible in the same atomic snapshot.
  if(!cancel){n.balance-=order.cost;n.materials[order.offerId]+=order.amount;}
  n.orders.push(order);n.pending=null;n.revision++;validateShop(n);return n;
}
function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packShop(s){validateShop(s);return JSON.stringify({format:SHOP_SCOPE,checksum:checksum(canonical(s)),state:s});}
export function unpackShop(text){
  ok(typeof text==='string'&&text.length<=2000000,'保存の形式・サイズが不正です。');const p=JSON.parse(text);
  keys(p,['format','checksum','state']);ok(p.format===SHOP_SCOPE&&p.checksum===checksum(canonical(p.state)),'保存の整合性を確認できません。');validateShop(p.state);return p.state;
}
