import {RULES,OPPONENTS} from './imasora-sliding-tag-model.mjs?v=120rk';
// Deliberately no production economics or recognition lifetime yet. The host
// must supply an approved policy and a real capture/recognition authority.
export const RELEASE_POLICY=null;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const same=(a,b)=>object(a)&&object(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&a[k]===b[k]);
const check=(v,code)=>{if(!v)throw Error(code);};
const amount=v=>Number.isSafeInteger(v)&&v>=0&&v<=1e6;
const idOK=id=>typeof id==='string'&&/^tag:[A-Za-z0-9_-]{8,80}$/.test(id);
const add=(a,b)=>{check(Number.isSafeInteger(a)&&a>=0&&amount(b)&&Number.isSafeInteger(a+b),'INVALID_BALANCE');return a+b;};
export function monsterSubject(state){const m=state?.monster;check(object(m)&&Number.isSafeInteger(m.bornAt)&&m.bornAt>0&&typeof m.seedId==='string'&&/^seed-[a-z]+$/.test(m.seedId),'MONSTER_UNAVAILABLE');return JSON.stringify([m.bornAt,m.seedId]);}
export function createRewardCatalog({items,materials,seeds,skies=[],skyBonuses={}}){
 check(Array.isArray(items)&&Array.isArray(materials)&&Array.isArray(seeds),'CATALOG_UNAVAILABLE');
 check(Array.isArray(skies)&&object(skyBonuses)&&skies.every(s=>object(s)&&typeof s.id==='string'&&s.id&&['nature','city','sky'].includes(s.type)&&['nature','city','sky'].includes(skyBonuses[s.id]?.bias)),'INVALID_SKY_CATALOG');const skyMap=new Map(skies.map(s=>[s.id,Object.freeze({id:s.id,type:s.type,bias:skyBonuses[s.id]?.bias})]));check(skyMap.size===skies.length,'INVALID_SKY_CATALOG');
 const ordinary=items.filter(i=>!i.islandOnly),itemMap=new Map(ordinary.map(i=>[i.id,i])),seedMap=new Map(seeds.filter(s=>s.id!=='seed-white').map(s=>[s.id,s])),materialSet=new Set(materials);
 check(itemMap.size===ordinary.length&&seedMap.size>0&&materialSet.size===materials.length,'INVALID_CATALOG');
 return Object.freeze({item:id=>itemMap.get(id),seed:id=>seedMap.get(id),material:id=>materialSet.has(id),sky:id=>skyMap.get(id)});
}
export function readTagProgress(state){
 const p=state.slidingTag===undefined?{version:1,receipts:[],pendingItems:[],playedSeconds:0}:state.slidingTag;
 check(object(p)&&p.version===1&&Array.isArray(p.receipts)&&p.receipts.length<=50000&&p.receipts.every(idOK)&&new Set(p.receipts).size===p.receipts.length&&Array.isArray(p.pendingItems)&&p.pendingItems.length<=1000&&p.pendingItems.every(i=>object(i)&&typeof i.id==='string'&&Number.isSafeInteger(i.at)&&typeof i.reason==='string'),'TAG_PROGRESS_UNREADABLE');
 check(Number.isFinite(p.playedSeconds)&&p.playedSeconds>=0&&p.playedSeconds<=p.receipts.length*35,'TAG_TIME_UNREADABLE');return structuredClone(p);
}
function validateReceipt(r){check(object(r)&&r.version===1&&r.rules===RULES&&idOK(r.id)&&r.duration===35&&['chase','escape'].includes(r.role)&&OPPONENTS.some(p=>p.id===r.opponent)&&Number.isFinite(r.playedSeconds)&&r.playedSeconds>0&&r.playedSeconds<=35&&typeof r.caught==='boolean'&&typeof r.win==='boolean'&&r.win===(r.role==='chase'?r.caught:!r.caught)&&(r.caught||r.playedSeconds===35),'RECEIPT_UNCHECKED');}
export function prepareTagDelivery(state,receipt,{catalog,policy=RELEASE_POLICY,ticket,sky,now,canGrow,creditConstruction,receiveInventory,growthRules}={}){
 if(!policy)return{status:'practice'};
 check(policy.approved===true&&typeof policy.id==='string'&&policy.id.length>0&&Number.isSafeInteger(policy.maxRecognitionAgeMs)&&policy.maxRecognitionAgeMs>0&&typeof policy.plan==='function','POLICY_UNAVAILABLE');
 check(object(state)&&Number.isSafeInteger(now)&&now>0,'HOME_UNAVAILABLE');validateReceipt(receipt);
 const progress=readTagProgress(state);
 if(progress.receipts.includes(receipt.id))return{status:'duplicate'};
 check(progress.receipts.length<50000,'RECEIPTS_FULL');
 const subject=monsterSubject(state);
 check(object(ticket)&&ticket.id===receipt.id&&ticket.subject===subject&&ticket.policyId===policy.id&&ticket.mode==='formal'&&Number.isSafeInteger(ticket.issuedAt)&&ticket.issuedAt>0&&now-ticket.issuedAt>=receipt.playedSeconds*1000,'ROUND_NOT_ADMITTED');
 // Dates alone, an old sky diary and the legacy time-derived candidate are
 // insufficient. The host authority must bind a camera recognition to this
 // subject and to the admitted growth segment.
 if(!object(sky)||sky.source!=='camera-recognition'||sky.subject!==subject||typeof sky.id!=='string'||!sky.id||sky.id!==ticket.skyId||typeof sky.captureId!=='string'||!sky.captureId||!Number.isSafeInteger(sky.capturedAt)||sky.capturedAt<=0||!Number.isSafeInteger(sky.recognizedAt)||!Number.isSafeInteger(sky.validUntil)||sky.capturedAt>sky.recognizedAt||sky.recognizedAt>ticket.issuedAt||sky.validUntil<now||sky.validUntil<sky.recognizedAt||now-sky.capturedAt>policy.maxRecognitionAgeMs||sky.validUntil-sky.capturedAt>policy.maxRecognitionAgeMs)return{status:'awaiting-sky'};
 if(ticket.authority==='tag-admission-v1'){check(same(progress.activeRound,ticket)&&same(progress.sky,sky)&&sky.segmentId===ticket.segmentId&&sky.policyId===policy.id,'ROUND_ADMISSION_CHANGED');}
 check(typeof canGrow==='function','GROWTH_AUTHORITY_UNAVAILABLE');if(!canGrow(state))return{status:'growth-paused'};
 check(catalog&&typeof catalog.item==='function','CATALOG_UNAVAILABLE');
 const plan=policy.plan({receipt:Object.freeze({...receipt}),progress:structuredClone(progress),sky:structuredClone(sky)});
 check(object(plan)&&Object.keys(plan).every(k=>['xp','coin','items','materials','seeds','tickets','construction','growth'].includes(k)),'INVALID_PLAN');
 for(const k of ['xp','coin','tickets'])check(amount(plan[k]??0),'INVALID_AMOUNT');
 const items=plan.items??[],materials=plan.materials??{},seeds=plan.seeds??{};
 check(Array.isArray(items)&&items.length<=100&&items.every(id=>catalog.item(id)),'INVALID_ITEM');
 check(object(materials)&&Object.keys(materials).length<=6&&Object.entries(materials).every(([id,n])=>catalog.material(id)&&amount(n)),'INVALID_MATERIAL');
 check(object(seeds)&&Object.keys(seeds).length<=7&&Object.entries(seeds).every(([id,n])=>catalog.seed(id)&&amount(n)),'INVALID_SEED');
 check(Array.isArray(state.inventory)&&state.inventory.every(object),'INVENTORY_UNREADABLE');
 const next=structuredClone(state);next.slidingTag=progress;
 // The real home inventory owns both visible and held items. Legacy trial
 // overflow is migrated through the same receiver, never truncated.
 if(items.length||progress.pendingItems.length){check(typeof receiveInventory==='function','INVENTORY_BRIDGE_PENDING');receiveInventory(next,[...progress.pendingItems,...items.map(id=>({id,at:now,reason:'鬼ごっこ'}))]);progress.pendingItems=[];}
 next.monster.xp=add(next.monster.xp,plan.xp??0);next.coin=add(next.coin,plan.coin??0);
 check(object(next.skyStock)&&object(next.skyStock.materials)&&object(next.skyStock.seeds)&&object(next.mapTickets),'STOCK_UNREADABLE');
 for(const [name,n]of Object.entries(materials))next.skyStock.materials[name]=add(next.skyStock.materials[name]??0,n);
 for(const [id,n]of Object.entries(seeds)){const name=catalog.seed(id).name;next.skyStock.seeds[name]=add(next.skyStock.seeds[name]??0,n);}
 next.mapTickets.major4=add(next.mapTickets.major4??0,plan.tickets??0);
 if(plan.construction!==undefined){check(typeof creditConstruction==='function','CONSTRUCTION_BRIDGE_PENDING');next.constructionRewardLedger=creditConstruction(next.constructionRewardLedger,plan.construction,receipt);}
 if(plan.growth!==undefined){
  const flags=plan.growth;check(object(flags)&&Object.keys(flags).every(k=>['sky','evolve'].includes(k))&&Object.values(flags).every(v=>typeof v==='boolean'),'INVALID_GROWTH_PLAN');
  check(ticket.authority==='tag-admission-v1'&&growthRules&&typeof growthRules.plan==='function'&&typeof growthRules.apply==='function'&&typeof growthRules.applySky==='function','GROWTH_MILESTONE_UNAVAILABLE');
  const history=key=>{const rows=progress[key]??[];check(Array.isArray(rows)&&rows.length<=50000&&new Set(rows).size===rows.length&&rows.every(v=>typeof v==='string'&&v.length>0&&v.length<=120),'GROWTH_SEGMENTS_UNREADABLE');return rows;};
  const skyDone=history('skyGrowthSegments'),evolutionDone=history('evolutionGrowthSegments');
  if(flags.sky&&!skyDone.includes(sky.segmentId)){check(skyDone.length<50000,'GROWTH_SEGMENTS_FULL');const type=catalog.sky?.(sky.skyId);check(type,'SKY_CATALOG_UNAVAILABLE');growthRules.applySky(next.monster,type.type,type.bias);progress.skyGrowthSegments=[...skyDone,sky.segmentId];}
  if(flags.evolve&&!evolutionDone.includes(sky.segmentId)){const evolution=growthRules.plan(next.monster);if(evolution.status==='evolve'){check(evolutionDone.length<50000,'GROWTH_SEGMENTS_FULL');growthRules.apply(next.monster,evolution);progress.evolutionGrowthSegments=[...evolutionDone,sky.segmentId];}}

 }
 if(ticket.authority==='tag-admission-v1')delete progress.activeRound;
 progress.receipts.push(receipt.id);progress.playedSeconds+=receipt.playedSeconds;
 return{status:'ready',next,receipt};
}
// Bind this only after the home writer's conflict guard and sky authority are
// integrated. No host, key, rate or storage is silently supplied here.
export function createTagReceiver({verify,lock,read,writeSync,context}){
 check([verify,lock,read,writeSync,context].every(f=>typeof f==='function'),'RECEIVER_UNAVAILABLE');
 return{async receive(proof){const receipt=await verify(proof);return lock(()=>{const state=read(),prepared=prepareTagDelivery(state,receipt,context(state,receipt));if(prepared.status!=='ready')return prepared;check(writeSync(prepared.next)===true,'SAVE_UNCONFIRMED');return{status:'committed',receipt};});}};
}
