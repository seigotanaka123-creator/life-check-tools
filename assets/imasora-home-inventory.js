(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ImasoraHomeInventory=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const valid=entry=>entry&&typeof entry==='object'&&!Array.isArray(entry)&&typeof entry.id==='string'&&entry.id.length>0;
 function read(state,copy=false){if(!state||typeof state!=='object')throw Error('INVENTORY_UNREADABLE');const items=state.inventory===undefined?[]:state.inventory,pending=state.inventoryPending===undefined?[]:state.inventoryPending;if(!Array.isArray(items)||!Array.isArray(pending)||!items.every(valid)||!pending.every(valid))throw Error('INVENTORY_UNREADABLE');return{items:copy?[...items]:items,pending:copy?[...pending]:pending};}
 function fill(stock){while(stock.items.length<40&&stock.pending.length)stock.items.push(stock.pending.shift());return stock;}
 function apply(state,stock){state.inventory=stock.items;state.inventoryPending=stock.pending;return state;}
 function receive(state,entries){if(!Array.isArray(entries)||!entries.every(valid))throw Error('INVALID_ITEM_GRANT');const stock=fill(read(state,true));for(const entry of entries){const copy={...entry};if(stock.items.length<40)stock.items.push(copy);else stock.pending.push(copy);}return apply(state,stock);}
 function take(state,id){const stock=read(state,true);let index=stock.items.findIndex(i=>i.id===id);if(index>=0)stock.items.splice(index,1);else{index=stock.pending.findIndex(i=>i.id===id);if(index<0)return false;stock.pending.splice(index,1);}apply(state,fill(stock));return true;}
 function counts(state){const stock=read(state),result=Object.create(null);for(const group of [stock.items,stock.pending])for(const entry of group)result[entry.id]=(result[entry.id]||0)+1;return result;}
 return Object.freeze({receive,take,counts,normalize:state=>apply(state,fill(read(state,true))),pendingCount:state=>read(state).pending.length});
});
