import {assertTransportField} from './imasora-construction-transport-field.mjs?v=120gf';
import {sharedParkingLayouts} from './imasora-construction-shared-field.mjs?v=120ey';
import {assertWorkField} from './imasora-construction-field-area.mjs?v=120ey';
export const PARKING_ADAPTERS=Object.freeze([
 {id:'water',key:'constructionWater',material:'mars-water'},
 {id:'soil',key:'constructionSoil',material:'mars-soil'},
 {id:'crane',key:'constructionTimber',material:'mars-timber'}
].map(Object.freeze));
const check=(p,m)=>{if(!p)throw Error(m);};
const exact=(p,keys)=>check(p&&Object.getPrototypeOf(p)===Object.prototype&&Object.keys(p).sort().join(',')===keys.sort().join(','),'駐車場の記録が不正です。');
export function parkingLayout(record){return sharedParkingLayouts().find(p=>p.corner===record?.corner)??null;}
export function parkingMoveProblem(record){const w=record?.work,r=w?.loader??w?.rig,p=r?.player;
 if(!r)return '車の保存がありません。';
 if(r.mode!=='foot'||r.transition)return '車から降りてから駐車場へ移そう。';
 if(w.task||record.delivery||w.air?.length||w.held||w.rotation||w.joining||w.work||w.deployment>0)return '今の作業を終え、支持脚をしまってから移そう。';
 if(Math.abs(r.vehicle.speed)>.01||Math.abs(p.y)>.05||Math.abs(p.vy??0)>.05||p.grounded===false||w.body?.grounded===false||Math.abs(w.body?.vy??0)>.05)return '地面に降りて、車を止めてから移そう。';
 return '';
}
// One atomic migration: work coordinates, water cells, floor parts and amounts
// remain unchanged. Only vehicle poses and relocatable supply equipment move.
export function prepareParkingMigration(world,corner,sites,received,adapters){
 check(!world.constructionParking,'駐車場はすでに準備されています。');
 const layout=parkingLayout({corner});check(layout,'駐車場の場所を確認できません。');
 exact(sites,PARKING_ADAPTERS.map(a=>a.id));
 const before={},records={};
 for(const a of adapters){
  check(Number.isInteger(sites[a.id])&&!!a.yards[sites[a.id]],'元の作業場所を確認できません。');
  const old=world[a.key]??a.initial(sites[a.id],received[a.material]??0);a.validate(old,received[a.material]??0);
  check(old.schema===1&&!((old.work.loader??old.work.rig).vehicle.field),'移設済みの車を重ねて移せません。');
  check(old.siteIndex===sites[a.id],'別の作業場所の保存です。');check(!parkingMoveProblem(old),parkingMoveProblem(old));
  before[a.key]=world[a.key]===undefined?null:structuredClone(old);
  const n=structuredClone(old),v=(n.work.loader??n.work.rig).vehicle,origin=a.yards[n.siteIndex],bay=layout.vehicles.find(v=>v.id===a.id);
  n.schema=2;n.revision++;n.work.revision++;n.work.paused=true;
  if(a.id==='crane')n.work.schemaVersion=2;else n.work.schema=2;
  Object.assign(v,{field:{corner,origin:[...origin]},x:bay.x-origin[0],z:bay.z-origin[1],heading:bay.heading,speed:0,steering:0});
  a.validate(n,received[a.material]??0);records[a.key]=n;
 }
 return{records,parking:{version:1,corner,vehicles:PARKING_ADAPTERS.map(a=>a.id),before}};
}
export function validateParkingRecord(world,received,adapters){const p=world.constructionParking;if(p===undefined){check(world.constructionTransport?.work?.frame?.version!==2,'土を運ぶ車の駐車場の記録が欠けています。');check(!world.constructionProfileProject?.freeBuild?.parkingCorner,'コンクリート車両の駐車場の記録が欠けています。');for(const a of adapters)check(world[a.key]?.schema!==2,'駐車場の記録が欠けています。');return;}
 exact(p,['version','corner','vehicles','before']);check([1,2,3].includes(p.version)&&!!parkingLayout(p)&&JSON.stringify(p.vehicles)===JSON.stringify([...PARKING_ADAPTERS.map(a=>a.id),...(p.version>=2?['truck','pump']:[]),...(p.version===3?['excavator','dump']:[])]),'駐車場の車種・場所が不正です。');exact(p.before,[...PARKING_ADAPTERS.map(a=>a.key),...(p.version>=2?['constructionProfileProject']:[]),...(p.version===3?['constructionTransport']:[])]);
 const concreteCorner=world.constructionProfileProject?.freeBuild?.parkingCorner;check(p.version>=2?concreteCorner===p.corner:!concreteCorner,'コンクリート車両の駐車場の記録が一致しません。');
 const transport=world.constructionTransport?.work;
 if(p.version===3){
  const before=p.before.constructionTransport;exact(before,['revision','frameRevision','soilRevision','player','dump','machineArm']);
  check(transport?.frame.version===2&&assertTransportField(transport.frame.soil)?.corner===p.corner,'土と車の移設を一緒に読み込んでください。');
  check(['revision','frameRevision','soilRevision'].every(k=>Number.isSafeInteger(before[k])&&before[k]>=0)&&before.revision<transport.revision&&before.frameRevision<transport.frame.revision&&before.soilRevision<=transport.frame.soil.revision,'移設前の記録が不正です。');
 }else check(transport?.frame.version!==2,'土と車の移設記録が一致しません。');
 for(const a of adapters){const s=world[a.key];check(s?.schema===2,'駐車場の車が欠けています。');assertWorkField(s,a.yards[s.siteIndex]);check((s.work.loader??s.work.rig).vehicle.field.corner===p.corner,'別の駐車場の車が混ざっています。');if(p.before[a.key]!==null){const old=p.before[a.key];check(old.schema===1&&old.siteIndex===s.siteIndex,'移設前の控えが不正です。');a.validate(old,received[a.material]??0);}}
}
