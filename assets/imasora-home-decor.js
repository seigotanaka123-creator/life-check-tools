(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ImasoraHomeDecor=api;})(globalThis,function(){
 'use strict';
 const ROOMS=Object.freeze({home:'ホームの部屋',extra:'もう一つの部屋'});
 const SLOTS=Object.freeze([
  {id:'home-table',room:'home',name:'テーブル',kind:'table',position:[0,.77,1.55],width:.4,height:.44,yaw:0},
  {id:'home-shelf-left',room:'home',name:'飾り台・左',kind:'shelf',position:[2.78,.52,2.37],width:.52,height:.62,yaw:0},
  {id:'home-shelf-right',room:'home',name:'飾り台・右',kind:'shelf',position:[3.55,.52,2.37],width:.52,height:.62,yaw:0},
  {id:'home-wall',room:'home',name:'扉の上の壁',kind:'wall',position:[2.8,3.28,-2.48],width:.8,height:.58,yaw:0},
  {id:'extra-shelf-left-a',room:'extra',name:'左の棚・手前',kind:'shelf',position:[-3.2,1.18,8.2],width:.7,height:.75,yaw:Math.PI},
  {id:'extra-shelf-left-b',room:'extra',name:'左の棚・奥',kind:'shelf',position:[-3.2,1.18,10],width:.7,height:.75,yaw:Math.PI},
  {id:'extra-shelf-right-a',room:'extra',name:'右の棚・手前',kind:'shelf',position:[3.2,1.18,8.2],width:.7,height:.75,yaw:Math.PI},
  {id:'extra-shelf-right-b',room:'extra',name:'右の棚・奥',kind:'shelf',position:[3.2,1.18,10],width:.7,height:.75,yaw:Math.PI},
  {id:'extra-table-left',room:'extra',name:'手前の飾り台・左',kind:'table',position:[-.8,.75,6.3],width:.65,height:.7,yaw:Math.PI},
  {id:'extra-table-right',room:'extra',name:'手前の飾り台・右',kind:'table',position:[.8,.75,6.3],width:.65,height:.7,yaw:Math.PI},
  {id:'extra-wall-left',room:'extra',name:'奥の壁・左',kind:'wall',position:[-3,2.7,12.86],width:1,height:.8,yaw:Math.PI},
  {id:'extra-wall-right',room:'extra',name:'奥の壁・右',kind:'wall',position:[3,2.7,12.86],width:1,height:.8,yaw:Math.PI}
 ].map(row=>Object.freeze({...row,position:Object.freeze(row.position)})));
 const DECOR=Object.freeze([
  ['star-lamp','星のランプ','table'],['cloud-lamp','雲のランプ','table'],['tiny-plant','小さな観葉植物','table'],['cactus','まるいサボテン','table'],
  ['sky-frame','青空の写真立て','table'],['sunset-frame','夕焼けの写真立て','table'],['star-frame','星空の写真立て','table'],['toy-ufo','UFOの置き物','table'],
  ['tiny-train','小さな汽車','table'],['glass-globe','空色のガラス玉','table'],['coffee-mug','お花のマグカップ','table'],['book-stack','小さな本のセット','table'],
  ['sky-poster','青空のポスター','wall'],['night-poster','星空のポスター','wall'],['leaf-wreath','葉っぱのリース','wall'],['star-garland','星のガーランド','wall'],
  ['rainbow-poster','虹のポスター','wall'],['moon-poster','月のポスター','wall']
 ].map(([key,name,kind])=>Object.freeze({id:'decor:'+key,key,name,pool:'decor',kind,stage:'おへやの飾り'})));
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),integer=v=>Number.isSafeInteger(v)&&v>=0,fail=code=>{throw Error(code);},check=(ok,code)=>{if(!ok)fail(code);},copy=v=>JSON.parse(JSON.stringify(v));
 function validDay(day){if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const date=new Date(day+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;}
 function createCatalog(entries){check(Array.isArray(entries)&&entries.length===224,'DECOR_CATALOG_UNAVAILABLE');const plush=entries.map(entry=>{check(typeof entry.id==='string'&&entry.id&&typeof entry.name==='string'&&entry.name,'DECOR_CATALOG_UNAVAILABLE');return Object.freeze({id:'plush:'+entry.id,monsterId:entry.id,name:entry.name,pool:'plush',kind:'plush',stage:entry.stage});}),all=Object.freeze([...plush,...DECOR]),byId=new Map(all.map(row=>[row.id,row]));check(byId.size===242,'DECOR_CATALOG_UNAVAILABLE');return Object.freeze({all,plush:Object.freeze(plush),decor:DECOR,get:id=>byId.get(id),pool:id=>id==='plush'?plush:id==='decor'?DECOR:[]});}
 function empty(){return{version:1,owned:{},layout:{},lastDraw:null};}
 function read(raw,catalog){if(raw===undefined)return empty();check(object(raw)&&raw.version===1&&object(raw.owned)&&object(raw.layout),'DECOR_SAVE_UNREADABLE');const ledger=copy(raw),placed={};
  for(const[id,n]of Object.entries(ledger.owned))check(!!catalog.get(id)&&integer(n)&&n>0,'DECOR_SAVE_UNREADABLE');
  for(const[slotId,itemId]of Object.entries(ledger.layout)){const slot=SLOTS.find(row=>row.id===slotId),item=catalog.get(itemId);check(slot&&item&&fits(item,slot),'DECOR_SAVE_UNREADABLE');placed[itemId]=(placed[itemId]||0)+1;check(placed[itemId]<=(ledger.owned[itemId]||0),'DECOR_SAVE_UNREADABLE');}
  if(ledger.lastDraw!==null){const row=ledger.lastDraw;check(object(row)&&validDay(row.date)&&['plush','decor'].includes(row.pool)&&catalog.get(row.itemId)?.pool===row.pool&&typeof row.receipt==='string'&&/^capsule:[A-Za-z0-9_-]{8,80}$/.test(row.receipt)&&ledger.owned[row.itemId]>0,'DECOR_SAVE_UNREADABLE');}
  return ledger;
 }
 function fits(item,slot){return item.kind==='wall'?slot.kind==='wall':slot.kind!=='wall';}
 function status(raw,catalog,day){check(validDay(day),'DECOR_DAY_INVALID');const ledger=read(raw,catalog);return{ledger,available:!ledger.lastDraw||day>ledger.lastDraw.date,unique:Object.keys(ledger.owned).length,total:catalog.all.length};}
 function draw(raw,catalog,{day,pool,index,receipt}={}){const current=status(raw,catalog,day);if(!current.available)return{changed:false,status:'already',ledger:current.ledger,reward:catalog.get(current.ledger.lastDraw.itemId)};check(['plush','decor'].includes(pool)&&typeof receipt==='string'&&/^capsule:[A-Za-z0-9_-]{8,80}$/.test(receipt),'DECOR_DRAW_INVALID');const all=catalog.pool(pool),unowned=all.filter(item=>!current.ledger.owned[item.id]),choices=unowned.length?unowned:all;check(integer(index)&&index<choices.length,'DECOR_DRAW_INVALID');const reward=choices[index],next=current.ledger,previous=next.owned[reward.id]||0;check(integer(previous+1),'DECOR_CAPACITY');next.owned[reward.id]=previous+1;next.lastDraw={date:day,pool,itemId:reward.id,receipt};return{changed:true,status:'drawn',ledger:next,reward,isNew:previous===0};}
 function choices(raw,catalog,pool){const ledger=read(raw,catalog),all=catalog.pool(pool),unowned=all.filter(item=>!ledger.owned[item.id]);return unowned.length?unowned:all;}
 function place(raw,catalog,{slotId,itemId}={}){const ledger=read(raw,catalog),slot=SLOTS.find(row=>row.id===slotId),item=catalog.get(itemId);check(slot&&item&&fits(item,slot)&&ledger.owned[itemId]>0,'DECOR_PLACEMENT_INVALID');if(ledger.layout[slotId]===itemId)return{changed:false,ledger};const locations=Object.keys(ledger.layout).filter(key=>ledger.layout[key]===itemId);let movedFrom=null;if(locations.length>=ledger.owned[itemId]){movedFrom=locations[0];delete ledger.layout[movedFrom];}ledger.layout[slotId]=itemId;return{changed:true,ledger,movedFrom};}
 function remove(raw,catalog,slotId){const ledger=read(raw,catalog);check(SLOTS.some(row=>row.id===slotId),'DECOR_PLACEMENT_INVALID');if(!ledger.layout[slotId])return{changed:false,ledger};delete ledger.layout[slotId];return{changed:true,ledger};}
 function scene(raw,catalog){const ledger=read(raw,catalog);return Object.entries(ledger.layout).map(([slotId,itemId])=>({...catalog.get(itemId),slotId}));}
 return Object.freeze({ROOMS,SLOTS,DECOR,createCatalog,read,status,choices,draw,place,remove,scene,fits,validDay});
});
