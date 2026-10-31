import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {coastHeight} from './imasora-coast-layout.mjs?v=120mx';
export const COAST_VISIT_MAX_TIER=10,COAST_VISIT_VOYAGE_DISTANCE=1200;
const exact=(v,k)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===k,ok=(v)=>{if(!v)throw Error('島の冒険のごほうびをたしかめよう。');},integer=n=>Number.isSafeInteger(n)&&n>=0;
const battle=[['focus-ramune','集中ラムネ'],['guard-tape','まもりテープ'],['wind-pin','追い風ピン']];
export function coastVisitGift(island,count){const index=COAST_ISLANDS.findIndex(i=>i.id===island);ok(index>=0&&integer(count)&&count>0);const tier=Math.min(COAST_VISIT_MAX_TIER,count),[id,name]=battle[(index+count-1)%battle.length];return{tier,battle:{id,name,amount:tier},growth:{id:'growth-seed',name:'成長のタネ',amount:tier},materials:{'mars-timber':26880*tier,'mars-soil':8000*tier,'mars-water':32000*tier}};}
export function validateCoastVisits(s){if(s===undefined)return;ok(exact(s,'islands|version')&&s.version===1&&s.islands&&Object.getPrototypeOf(s.islands)===Object.prototype&&Object.keys(s.islands).length<=COAST_ISLANDS.length);for(const[id,v]of Object.entries(s.islands))ok(COAST_ISLANDS.some(i=>i.id===id)&&exact(v,'clock|count|x|z')&&integer(v.count)&&v.count>0&&integer(v.clock)&&v.clock<1e12&&Number.isFinite(v.x)&&Number.isFinite(v.z)&&Math.abs(v.x)<35000&&Math.abs(v.z)<95000);}
export function validateCoastVisitEvent(e){ok(exact(e,'clock|count|id|island|kind|x|z')&&e.kind==='coast-visit'&&e.id==='coast-visit-'+e.island+'-'+e.count);validateCoastVisits({version:1,islands:{[e.island]:{count:e.count,clock:e.clock,x:e.x,z:e.z}}});return e;}
export function replayCoastVisits(events){const s={version:1,islands:{}};for(const e of events)if(e.kind==='coast-visit'){validateCoastVisitEvent(e);const prior=s.islands[e.island];ok(e.count===(prior?.count??0)+1&&e.clock>=(prior?.clock??0));s.islands[e.island]={count:e.count,clock:e.clock,x:e.x,z:e.z};}return s;}
// A new receipt requires a real later offshore leg. Reloading, boarding and
// walking along the same bank do not qualify; the ocean clock is not rewound.
export function coastVisitOffer(saved,island,position,navigation=saved.coastPhysics?.navigation){
 if(!COAST_ISLANDS.some(i=>i.id===island)||!position)return null;const last=saved.coastVisits?.islands[island];
 if(!last)return{island,count:1};
 if(!navigation||navigation.clock<=last.clock)return null;
 const offshore=p=>p.tick>last.clock&&p.tick<=navigation.clock&&Math.hypot(p.p[0]-last.x,p.p[2]-last.z)>=COAST_VISIT_VOYAGE_DISTANCE&&coastHeight(p.p[0],p.p[2])<-16;
 const sailed=navigation.waters?.some(offshore)||navigation.points?.some(offshore);
 return sailed?{island,count:last.count+1}:null;
}
export function applyCoastVisitMaterials(state,event){validateCoastVisitEvent(event);for(const[offerId,amount]of Object.entries(coastVisitGift(event.island,event.count).materials)){state.materials[offerId]+=amount;ok(integer(state.materials[offerId]));state.receipts.push({kind:'island-supply',id:event.id+'-'+offerId,offerId,amount});}return state;}
