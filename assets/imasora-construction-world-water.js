import {assertWorkField,inWorkArea} from './imasora-construction-field-area.mjs?v=120ey';
// Main-world finite water work. No copied wallet, purchase API, storage or loan grant.
import {initialTransport,stepTransport,transportAction,transferTotals,validateTransport,TRANSPORT_OBSTACLES,waterTransportObstacles,waterSourcePort} from './imasora-construction-water-transport.js?v=120gf';
import {flowFieldWater} from './imasora-construction-field-water-flow.mjs?v=120fb';
import {walkingClear} from './imasora-construction-loader-physics.js?v=120gf';
import {beginWaterEdit,finishWaterEdit,breakWaterEdits,undoWaterEdit,validateWaterEdits} from './imasora-construction-water-undo.mjs?v=120fb';
import {waterBuildTerrainFits,waterBuildCellSize} from './imasora-construction-water-build.mjs?v=120fb';
export const WORLD_WATER_SCOPE='construction-world-water-v1';
import{WATER_YARDS}from'./imasora-construction-yard-origins.mjs?v=120gb';
export{WATER_YARDS};
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
  return !w.paused&&!s.delivery&&!w.task&&!w.air.length&&w.loader.mode==='foot'&&!w.loader.transition&&Math.abs(p.y)<=.05&&p.grounded!==false&&Math.hypot(p.x-waterSourcePort(w).x+58,p.z-waterSourcePort(w).z+106)<=42;
}
export function enterWorldWater(s,worldPosition){
  const [x,z]=WATER_YARDS[s.siteIndex],p={x:worldPosition.x-x,z:worldPosition.z-z,y:0,heading:worldPosition.heading||0};
  ok(Number.isFinite(worldPosition.y)&&Math.abs(worldPosition.y)<=.5,'地上で作業してください。');
  ok(walkingClear(p,s.work.loader.vehicle,waterTransportObstacles(s.work)),'車体や設備から離れた地面で作業を始めてください。');
  ok(Math.hypot(p.x-s.work.loader.vehicle.x,p.z-s.work.loader.vehicle.z)<=112,'給水ローダーの近くへ来てください。');
  const n=copy(s);n.work.paused=false;n.work.loader={...n.work.loader,mode:'foot',player:p,transition:null,vehicle:{...n.work.loader.vehicle,speed:0}};n.revision++;return n;
}
export function worldWaterAction(s,action,value,receivedML,external=[],heightAt=()=>0){
  validateWorldWater(s,receivedML);
  if(action==='undo-water'){
    const n=undoWaterEdit(s,w=>{
      for(const b of w.waterBuilds??[]){if(!b.q)continue;if(!waterBuildTerrainFits(b,heightAt,external))return false;
        const half=waterBuildCellSize(b)/2,v=w.loader.vehicle,p=w.loader.player,c=Math.cos(v.heading),sn=Math.sin(v.heading);
        for(const cell of b.cells){const dx=cell.x-v.x,dz=cell.z-v.z;if(b.top>heightAt(v.x,v.z)+.05&&Math.abs(c*dx-sn*dz)<44+half&&Math.abs(sn*dx+c*dz)<46+half)return false;
          if(w.loader.mode==='foot'&&p.y<b.top&&p.y+28>cell.y&&Math.hypot(cell.x-p.x,cell.z-p.z)<14+half)return false;}
      }return true;
    });validateWorldWater(n,receivedML);return n;
  }
  if(['dispatch','store'].includes(action)){
    ok(idOK(value),'出庫番号が不正です。');const old=s.events.find(e=>e.id===value);
    if(old){ok(old.kind===action,'同じ出庫番号の操作が異なります。');return s;}
    ok(waterWarehouseAccess(s),'保管口の近くで降車し、移送を終えてください。');ok(s.events.length<2000,'出庫記録の上限です。');
    if(action==='dispatch'){ok(receivedML/250-s.allocated>=128,'保管庫の火星水が32 Lありません。先に建材受取所で受け取ってください。');ok(s.allocated+128<=768,'この給水区画の上限は192 Lです。');}
    else ok(s.work.source>=128,'給水槽に32 L必要です。車載・水路の水は先に回収してください。');
    const n=copy(breakWaterEdits(s));n.events.push({id:value,kind:action,q:128,status:'moving'});n.delivery={id:value,kind:action,moved:0,clock:0};
    if(action==='dispatch')n.allocated+=128;n.revision++;n.work.message=action==='dispatch'?'保管庫から給水槽へ移送中…':'給水槽から保管庫へ移送中…';return n;
  }
  ok(!s.delivery||action==='pause','保管口の移送が完了してから操作してください。');
  let n={...s,work:transportAction(s.work,action,value,external,heightAt),revision:s.revision+1};
  const label={source:'水をくむ',unload:'給水槽にもどす',returned:'水を回収する',pour:s.work.waterMode==='basin'?'穴に水を注ぐ':'水を注ぐ',recover:'水路の水を回収する'}[action];
  if(label&&!s.work.task&&!s.work.air.length&&(n.work.task||action==='recover'&&n.work.water!==s.work.water)){n={...n,undoWater:beginWaterEdit(s,label).undoWater};}
  if(!n.undoWater?.pending&&(action==='flow'||action==='direction'))n=breakWaterEdits(n);
  n=finishWaterEdit(n);validateWorldWater(n,receivedML);return n;
}
export function advanceWorldWater(s,input,dt,external=[],heightAt=()=>0){
  ok(Number.isFinite(dt)&&dt>=0&&dt<=.1,'更新時間が不正です。');if(s.work.paused)return s;
  let n={...s,phase:s.phase+dt};
  while(n.phase>=1/120-1e-9){
    n={...n,phase:Math.max(0,n.phase-1/120),work:stepTransport(n.work,n.delivery?{brake:true}:input,1/120,external,heightAt),revision:n.revision+1};
    if(n.delivery){
      const d={...n.delivery,clock:n.delivery.clock+64/120},q=Math.min(128-d.moved,Math.floor(d.clock+1e-9));d.clock-=q;d.moved+=q;
      n.work={...n.work,source:n.work.source+(d.kind==='dispatch'?q:-q)};n.delivery=d;
      if(d.moved===128){n.events=n.events.map(e=>e.id===d.id?{...e,status:'done'}:e);if(d.kind==='store')n.allocated-=128;n.delivery=null;n.work.message=d.kind==='dispatch'?'32 Lを給水槽に出庫しました。乗車して汲み取れます。':'32 Lを本体の保管庫へ戻しました。';}
    }
  }
  if(n.phase<1e-9)n.phase=0;
  // Autonomous flowing water may leave the last edited shape. Do not replace
  // that later flow with an obsolete checkpoint or rewind warehouse receipts.
  if(!n.undoWater?.pending&&n.undoWater?.steps.length&&(n.work.pools!==s.work.pools||n.work.water.cells!==s.work.water.cells))n=breakWaterEdits(n);
  return finishWaterEdit(n);
}
export function flowWorldFieldWater(s,external=[],heightAt=()=>0){
 const w=flowFieldWater(s.work,[...external,...waterTransportObstacles(s.work).map(b=>({x:b.x,z:b.z,y:0,w:b.width,d:b.depth,h:b.height}))],heightAt);
 return w===s.work?s:breakWaterEdits({...s,revision:s.revision+1,work:{...w,revision:w.revision+1}});
}
export function validateWorldWater(s,receivedML){
  exact(s,['schema','scope','revision','phase','siteIndex','allocated','events','delivery','work',...(s.undoWater===undefined?[]:['undoWater'])]);
  ok([1,2].includes(s.schema)&&s.scope===WORLD_WATER_SCOPE&&int(s.revision)&&Number.isInteger(s.siteIndex)&&!!WATER_YARDS[s.siteIndex],'給水作業の版・位置が不正です。');
  assertWorkField(s,WATER_YARDS[s.siteIndex]);
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
  validateTransport({...s.work,source:s.work.source+768-t.total});
  validateWaterEdits(s,w=>{ok(transferTotals(w).total===s.allocated,'もどす前後の水量が一致しません。');validateTransport({...w,source:w.source+768-s.allocated});});return s;
}
export function waterCheckpoint(s){const n=copy(s);n.work.paused=true;n.work.loader.vehicle.speed=0;return n;}
export function validateWaterContinuation(old,next){if(old&&(old.schema!==next.schema||JSON.stringify((old.work.loader??old.work.rig).vehicle.field)!==JSON.stringify((next.work.loader??next.work.rig).vehicle.field)))throw Error('駐車場の移設は専用の保存で行ってください。');
  if(!old)return;
  ok(next.siteIndex===old.siteIndex&&next.revision>=old.revision&&next.events.length>=old.events.length,'古い作業や別の区画で上書きできません。');
  old.events.forEach((e,i)=>{const n=next.events[i];ok(e.id===n.id&&e.kind===n.kind&&e.q===n.q&&(e.status!=='done'||n.status==='done'),'出庫履歴を巻き戻せません。');});
}
