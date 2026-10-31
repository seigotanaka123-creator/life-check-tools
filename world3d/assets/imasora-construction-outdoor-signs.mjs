import{outdoorPaintPlan,OUTDOOR_PAINT_AREA}from'./imasora-construction-outdoor-paint.mjs?v=120hh';
import{signText}from'./imasora-construction-sign-text.mjs?v=120hd';
import{roomItemParts}from'./imasora-construction-room-layout-shape.mjs?v=120hd';
import{FIELD}from'./imasora-construction-shared-field.mjs?v=120ey';
export const OUTDOOR_SIGN_WOOD=840,OUTDOOR_SIGN_LIMIT=32;
const ok=(v,m)=>{if(!v)throw Error(m);},keys=(o,k)=>!!o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).sort().join('|')===k;
export function validateOutdoorSign(i,paint=false){ok(keys(i,paint&&i.paint?'id|paint|text|turn|x|y|z':'id|text|turn|x|y|z')&&/^sign-[1-9][0-9]*$/.test(i.id)&&Number.isSafeInteger(Number(i.id.slice(5)))&&[i.x,i.z].every(v=>Number.isInteger(v/4))&&Number.isFinite(i.y)&&i.y>=-32&&i.y<=48&&Number.isInteger(i.turn)&&i.turn>=0&&i.turn<4&&i.text===signText(i.text),'外の看板の記録を保護して止めたよ。');if(i.paint){ok(paint&&Object.getPrototypeOf(i.paint)===Object.prototype&&Object.keys(i.paint).length>0&&Object.keys(i.paint).every(k=>Object.hasOwn(OUTDOOR_PAINT_AREA,k)&&/^#[0-9a-f]{6}$/.test(i.paint[k])),'ぬった色の記録を残して止めたよ。');}const b=outdoorSignParts(i).at(-1);ok(b.x-b.w/2>=FIELD.minX&&b.x+b.w/2<=FIELD.maxX&&b.z-b.d/2>=FIELD.minZ&&b.z+b.d/2<=FIELD.maxZ,'現場の内側へ看板を置こう。');return i;}
export function outdoorSignParts(i){return roomItemParts({kind:'sign',id:i.id,floor:0,x:i.x,z:i.z,turn:i.turn%2}).map(b=>({...b,y:b.y+i.y,id:i.id+'-'+b.kind,outdoorSignId:i.id,angle:0}));}
// The scene's build reservation takes a ground anchor, never a board's midair bottom.
export function outdoorSignReservation(i){const foot=outdoorSignParts(i).at(-1);return{position:[i.x,i.y,i.z],size:[foot.w,28,foot.d]};}
export function outdoorSignItems(collection){return collection?.version>=3?collection.outdoorSigns.items:[];}
export function outdoorSignWood(collection){return outdoorSignItems(collection).length*OUTDOOR_SIGN_WOOD;}
export function validateOutdoorSigns(s){
 const modern=s?.version===2;ok(keys(s,modern?'history|items|nextId|paintUsed|version':'history|items|nextId|version')&&[1,2].includes(s.version)&&Number.isSafeInteger(s.nextId)&&s.nextId>=1&&s.nextId<Number.MAX_SAFE_INTEGER&&Array.isArray(s.history)&&s.history.length<=10,'外の看板の記録を保護して止めたよ。');
 const check=(items,used)=>{ok(Array.isArray(items)&&items.length<=OUTDOOR_SIGN_LIMIT,'外の看板は32こまで置けるよ。');const seen=new Set();let painted=0;for(const i of items){validateOutdoorSign(i,modern);ok(!seen.has(i.id)&&Number(i.id.slice(5))<s.nextId,'看板の番号が重なっているよ。');seen.add(i.id);for(const k of Object.keys(i.paint??{}))painted+=OUTDOOR_PAINT_AREA[k]/64;}if(modern)ok(Number.isFinite(used)&&Number.isSafeInteger(used*64)&&used>=painted&&used<=1e9,'ペンキの使用記録を残して止めたよ。');};check(s.items,s.paintUsed);
 for(const h of s.history){ok(keys(h,modern?'items|paintUsed':'items'),'看板のもどす記録が読めないよ。');check(h.items,h.paintUsed);}return s;
}
export function editOutdoorSigns(before,a){
 const old=before??{version:1,nextId:1,items:[],history:[]};validateOutdoorSigns(old);const s=structuredClone(old);
 if(a.type==='SIGN_UNDO'){ok(keys(a,'type')&&s.history.length,'もどせる看板の作業はないよ。');const h=s.history.pop();s.items=h.items;if(s.version===2)s.paintUsed=h.paintUsed;return validateOutdoorSigns(s);}
 ok(keys(a,'edit|type')&&a.type==='SIGN_EDIT','看板の作業をえらび直そう。');const e=a.edit;ok(e&&['place','write','remove','paint'].includes(e.op),'看板の作業をえらび直そう。');
 if(e.op==='place'){ok(keys(e,'item|op')&&keys(e.item,'text|turn|x|y|z')&&s.items.length<OUTDOOR_SIGN_LIMIT,'文字と置く場所をえらぼう。');const item=validateOutdoorSign({...e.item,id:'sign-'+s.nextId});s.items.push(item);s.nextId++;}
 else{ok(keys(e,e.op==='write'?'id|op|text':e.op==='paint'?'color|id|op|part':'id|op'),'看板をえらび直そう。');const i=s.items.find(i=>i.id===e.id);ok(i,'その看板は見つからないよ。');if(e.op==='write'){ok(e.text===signText(e.text)&&e.text!==i.text,'新しい文字を入れよう。');i.text=e.text;}else if(e.op==='paint'){const q=outdoorPaintPlan(i,e.part,e.color);ok(q.changed,'もう同じ色だよ。ペンキは減らないよ。');if(s.version===1){s.version=2;s.paintUsed=0;s.history=s.history.map(h=>({...h,paintUsed:0}));}i.paint??={};i.paint[e.part]=q.color;s.paintUsed+=q.cost;}else s.items=s.items.filter(i=>i.id!==e.id);}
 s.history=[...s.history,{items:structuredClone(old.items),...(s.version===2?{paintUsed:old.paintUsed??0}:{})}].slice(-10);return validateOutdoorSigns(s);
}
export function outdoorSignTarget(collection,a){if(a.type!=='SIGN_EDIT')return null;return a.edit.op==='place'?{...a.edit.item,id:'sign-'+(collection?.outdoorSigns?.nextId??1)}:outdoorSignItems(collection).find(i=>i.id===a.edit.id)??null;}
