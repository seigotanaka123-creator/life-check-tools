// Main-world finite water work. No copied wallet, purchase API, storage or loan grant.
import {initialTransport,stepTransport,transportAction,transferTotals,validateTransport} from './imasora-construction-water-transport.js';
import {walkingClear} from './imasora-construction-loader-physics.js';
import {TRANSPORT_OBSTACLES} from './imasora-construction-water-transport.js';
export const WORLD_WATER_SCOPE='construction-world-water-v1';
export const WATER_YARDS=Object.freeze([[-760,-480],[-760,550],[760,-480],[760,550]].map(Object.freeze));
export const WATER_PACK=128; // 32 L, in 250 mL physics units.
const copy=structuredClone,ok=(v,m)=>{if(!v)throw Error(m);},int=v=>Number.isSafeInteger(v)&&v>=0;
const exact=(o,fields)=>ok(o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===[...fields].sort().join('|'),'給水作業の項目が不正です。');
const idOK=id=>typeof id==='string'&&/^[\w-]{8,96}$/.test(id);
export function initialWorldWater(siteIndex=0){
  ok(Number.isInteger(siteIndex)&&!!WATER_YARDS[siteIndex],'給水区画が不正です。');
  const work=initialTransport();work.source=0;work.paused=true;work.message='保管済みの火星水を32 Lずつ出庫して使えます。';
  return {schema:1,scope:WORLD_WATER_SCOPE,revision:0,phase:0,siteIndex,allocated:0,events:[],delivery:null,work};
}
export function worldWaterTotals(s){
  const t=transferTotals(s.work),moving=s.delivery?(s.delivery.kind==='dispatch'?128-s.delivery.moved:s.delivery.moved):0;
  return {...t,moving,allocated:s.allocated,totalWithTransit:t.total+moving};
}
export function waterWarehouseAccess(s){const w=s.work,p=w.loader.player;
  return !w.paused&&!s.delivery&&!w.task&&!w.air.length&&w.loader.mode==='foot'&&!w.loader.transition&&Math.hypot(p.x+188,p.z+118)<=42;
}
export function enterWorldWater(s,worldPosition){
  const [x,z]=WATER_YARDS[s.siteIndex],p={x:worldPosition.x-x,z:worldPosition.z-z,y:0,heading:worldPosition.heading||0};
  ok(Number.isFinite(worldPosition.y)&&Math.abs(worldPosition.y)<=.5,'地上で作業してください。');
  ok(walkingClear(p,s.work.loader.vehicle,TRANSPORT_OBSTACLES),'車体や設備から離れた地面で作業を始めてください。');
  ok(Math.hypot(p.x-s.work.loader.vehicle.x,p.z-s.work.loader.vehicle.z)<=112,'給水ローダーの近くへ来てください。');
  const n=copy(s);n.work.paused=false;n.work.loader={...n.work.loader,mode:'foot',player:p,transition:null,vehicle:{...n.work.loader.vehicle,speed:0}};n.revision++;return n;
}
export function worldWaterAction(s,action,value,receivedML){
  validateWorldWater(s,receivedML);
  if(['dispatch','store'].includes(action)){
    ok(idOK(value),'出庫番号が不正です。');const old=s.events.find(e=>e.id===value);
    if(old){ok(old.kind===action,'同じ出庫番号の操作が異なります。');return s;}
    ok(waterWarehouseAccess(s),'保管口の近くで降車し、移送を終えてください。');ok(s.events.length<2000,'出庫記録の上限です。');
    if(action==='dispatch'){ok(receivedML/250-s.allocated>=128,'保管庫の火星水が32 Lありません。先に建材受取所で受け取ってください。');ok(s.allocated+128<=768,'この給水区画の上限は192 Lです。');}
    else ok(s.work.source>=128,'給水槽に32 L必要です。車載・水路の水は先に回収してください。');
    const n=copy(s);n.events.push({id:value,kind:action,q:128,status:'moving'});n.delivery={id:value,kind:action,moved:0,clock:0};
    if(action==='dispatch')n.allocated+=128;n.revision++;n.work.message=action==='dispatch'?'保管庫から給水槽へ移送中…':'給水槽から保管庫へ移送中…';return n;
  }
  ok(!s.delivery||action==='pause','保管口の移送が完了してから操作してください。');
  const n={...s,work:transportAction(s.work,action,value),revision:s.revision+1};validateWorldWater(n,receivedML);return n;
}
export function advanceWorldWater(s,input,dt){
  ok(Number.isFinite(dt)&&dt>=0&&dt<=.1,'更新時間が不正です。');if(s.work.paused)return s;
  let n={...s,phase:s.phase+dt};
  while(n.phase>=1/120-1e-9){
    n={...n,phase:Math.max(0,n.phase-1/120),work:stepTransport(n.work,n.delivery?{brake:true}:input,1/120),revision:n.revision+1};
    if(n.delivery){
      const d={...n.delivery,clock:n.delivery.clock+64/120},q=Math.min(128-d.moved,Math.floor(d.clock+1e-9));d.clock-=q;d.moved+=q;
      n.work={...n.work,source:n.work.source+(d.kind==='dispatch'?q:-q)};n.delivery=d;
      if(d.moved===128){n.events=n.events.map(e=>e.id===d.id?{...e,status:'done'}:e);if(d.kind==='store')n.allocated-=128;n.delivery=null;n.work.message=d.kind==='dispatch'?'32 Lを給水槽に出庫しました。乗車して汲み取れます。':'32 Lを本体の保管庫へ戻しました。';}
    }
  }
  if(n.phase<1e-9)n.phase=0;return n;
}
export function validateWorldWater(s,receivedML){
  exact(s,['schema','scope','revision','phase','siteIndex','allocated','events','delivery','work']);
  ok(s.schema===1&&s.scope===WORLD_WATER_SCOPE&&int(s.revision)&&Number.isInteger(s.siteIndex)&&!!WATER_YARDS[s.siteIndex],'給水作業の版・位置が不正です。');
  ok(Number.isFinite(s.phase)&&s.phase>=0&&s.phase<1/120+1e-8&&int(receivedML)&&receivedML%250===0,'水量・更新時刻が不正です。');
  ok(int(s.allocated)&&s.allocated<=768&&s.allocated<=receivedML/250&&Array.isArray(s.events)&&s.events.length<=2000,'保管量を超えた出庫です。');
  let amount=0,moving=null;const seen=new Set();
  for(let i=0;i<s.events.length;i++){
    const e=s.events[i];exact(e,['id','kind','q','status']);ok(idOK(e.id)&&!seen.has(e.id),'出庫番号が重複・不正です。');seen.add(e.id);
    ok(['dispatch','store'].includes(e.kind)&&e.q===128&&['moving','done'].includes(e.status),'出庫記録が不正です。');
    if(e.status==='moving'){ok(!moving&&i===s.events.length-1,'移送途中は最後の1件だけです。');moving=e;}
    if(e.kind==='dispatch')amount+=128;else if(e.status==='done')amount-=128;
    ok(amount>=0&&amount<=768&&amount<=receivedML/250,'出庫履歴の水量が不正です。');
  }
  ok(amount===s.allocated&&!!moving===!!s.delivery,'移送記録が一致しません。');
  if(s.delivery){const d=s.delivery;exact(d,['id','kind','moved','clock']);ok(d.id===moving.id&&d.kind===moving.kind&&int(d.moved)&&d.moved<128&&Number.isFinite(d.clock)&&d.clock>=-1e-8&&d.clock<1+1e-8,'移送中の水量が不正です。');ok(!s.work.task&&!s.work.air.length&&s.work.loader.mode==='foot','保管口と車両作業が競合しています。');}
  ok(int(s.work.source)&&s.work.source<=s.allocated,'給水槽の水量が不正です。');
  const t=worldWaterTotals(s);ok(t.totalWithTransit===s.allocated&&s.work.phase===0,'保管・給水槽・車載・移送・水路の水量が一致しません。');
  // Reuse the unchanged physical validator with a validation-only empty reserve.
  validateTransport({...s.work,source:s.work.source+768-t.total});return s;
}
export function waterCheckpoint(s){const n=copy(s);n.work.paused=true;n.work.loader.vehicle.speed=0;return n;}
export function validateWaterContinuation(old,next){
  if(!old)return;
  ok(next.siteIndex===old.siteIndex&&next.revision>=old.revision&&next.events.length>=old.events.length,'古い作業や別の区画で上書きできません。');
  old.events.forEach((e,i)=>{const n=next.events[i];ok(e.id===n.id&&e.kind===n.kind&&e.q===n.q&&(e.status!=='done'||n.status==='done'),'出庫履歴を巻き戻せません。');});
}
