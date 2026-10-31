import {groundLimit} from './ground-grid.mjs?v=120hb';
import {UPPER_DESIGN_ACTIONS,canonicalUpperDesignAction,applyUpperDesignAction} from './upper-designs.mjs?v=120hb';
import {designGeometry,designLevels,sameDesign} from './design-levels.mjs?v=120hb';
import {designFromWork} from './design-book.mjs?v=120pv';
import {designName} from './design-name.mjs?v=120gv';
import {decodeDesignWord} from './design-exchange.mjs?v=120pv';
export {designName} from './design-name.mjs?v=120gv';
export const SAVED_DESIGN_LIMIT=24;
export const DESIGN_BOOK_ACTIONS=new Set([...UPPER_DESIGN_ACTIONS,'SAVE_WORK_DESIGN','RENAME_WORK_DESIGN','FORGET_WORK_DESIGN','IMPORT_WORK_DESIGN']);
const ok=(v,m)=>{if(!v)throw Error(m);};
const validId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(s)&&!['__proto__','prototype','constructor'].includes(s);
export function canonicalDesignAction(raw){
 if(UPPER_DESIGN_ACTIONS.has(raw.type))return canonicalUpperDesignAction(raw);
 const receive=raw.type==='IMPORT_WORK_DESIGN',save=raw.type==='SAVE_WORK_DESIGN',forget=raw.type==='FORGET_WORK_DESIGN',fields=receive?['code']:save?['work','name']:forget?['designId']:['designId','name'];
 ok(DESIGN_BOOK_ACTIONS.has(raw.type)&&validId(raw.operationId)&&Object.keys(raw).every(k=>['type','operationId',...fields].includes(k))&&fields.every(k=>Object.hasOwn(raw,k)),'設計帳のボタンからえらび直そう。');
 const a={type:raw.type,operationId:raw.operationId};if(receive){a.code=decodeDesignWord(raw.code).code;return a;}if(save){ok(Number.isInteger(raw.work)&&raw.work>=0&&raw.work<16,'残したい作品をえらぼう。');a.work=raw.work;}else{ok(validId(raw.designId),'設計をえらび直そう。');a.designId=raw.designId;}
 if(!forget)a.name=designName(raw.name);return a;
}
export function savedDesignEntries(p){
 const list=p?.savedWorkDesigns??[];ok(Array.isArray(list)&&list.length<=SAVED_DESIGN_LIMIT,'設計帳の記録をたしかめてね。');const seen=new Set();
 return list.map(d=>{ok(d&&['height|id|mask|name','height|id|levels|mask|name','height|id|layout|mask|name','height|id|layout|levels|mask|name'].includes(Object.keys(d).sort().join('|'))&&validId(d.id)&&!seen.has(d.id)&&designName(d.name)===d.name&&Number.isInteger(d.mask)&&d.mask>0&&d.mask<=65535&&[2,4,8].includes(d.height),'設計帳の記録を保護したよ。');seen.add(d.id);const geometry=designGeometry(d);ok(!!geometry.levels===Object.hasOwn(d,'levels'),'設計帳の高さをたしかめてね。');const plan=designFromWork({...(d.layout?{layout:d.layout}:{}),fill:designLevels(d).map((h,i)=>groundLimit(d,i,h))});return{...d,plan};});
}
export function applyDesignAction(p,a){
 if(UPPER_DESIGN_ACTIONS.has(a.type))return applyUpperDesignAction(p,a);
 a=canonicalDesignAction(a);savedDesignEntries(p);ok(p.freeBuild,'先に自由づくりをはじめよう。');
 if(a.type==='IMPORT_WORK_DESIGN'){
  const d=decodeDesignWord(a.code),list=p.savedWorkDesigns??[];if(list.some(s=>sameDesign(s,d)))return;
  ok(list.length<SAVED_DESIGN_LIMIT,'設計帳は24こまでだよ。使わない設計をノートからはずそう。');p.savedWorkDesigns??=[];p.savedWorkDesigns.push({id:a.operationId,name:d.name,...designGeometry(d)});
 }else if(a.type==='SAVE_WORK_DESIGN'){
  const plan=designFromWork(p.freeBuild.completed[a.work]),list=p.savedWorkDesigns??[],same=list.find(d=>sameDesign(d,plan));
  ok(same||list.length<SAVED_DESIGN_LIMIT,'設計帳は24こまでだよ。使わない設計をノートからはずそう。');
  if(same)same.name=a.name;else{p.savedWorkDesigns??=[];p.savedWorkDesigns.push({id:a.operationId,name:a.name,...designGeometry(plan)});}
 }else{
  const list=p.savedWorkDesigns??[],index=list.findIndex(d=>d.id===a.designId);ok(index>=0,'その設計はもうノートにないよ。');
  if(a.type==='RENAME_WORK_DESIGN')list[index].name=a.name;else list.splice(index,1);
 }
}
