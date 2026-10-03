import './imasora-construction-pack-transfer.js';

// Ownership follows the durable, validated box receipts. No extra inventory,
// currencies, or migration writes are created just to display these tools.
export const STARTER_TOOLS=Object.freeze([
 Object.freeze({id:'shovel',name:'シャベル',use:'土を掘って運ぶ',usable:false}),
 Object.freeze({id:'bucket',name:'バケツ',use:'生コンを汲む・注ぐ',usable:true}),
 Object.freeze({id:'trowel',name:'コテ',use:'生コンをならす',usable:true}),
 Object.freeze({id:'brush',name:'刷毛',use:'選んだ範囲を塗る',usable:true}),
 Object.freeze({id:'roller',name:'ローラー',use:'選んだ面を塗る',usable:true}),
 Object.freeze({id:'stencil',name:'型紙',use:'4×4の模様を選び、向きを変えて塗る',usable:true})
]);
export function projectStarterToolkit(ledger,profileId){
 const P=globalThis.ImasoraConstructionPackTransfer;
 const record=ledger??P.emptyTrialLedger(profileId);P.validateTrialLedger(record,profileId);
 const received=record.transfers.length>0;
 return {profileId,received,sourceTransferId:record.transfers[0]?.id??null,tools:STARTER_TOOLS.map(t=>({...t,owned:received,count:received?1:0}))};
}
export function requiredStarterTool(action){
 const type=action?.type;
 if(type==='STENCIL_PAINT')return 'stencil';
 if(['LOAD_BUCKET','POUR','RETURN_BUCKET','FREE_BUCKET_LOAD','FREE_BUCKET_RETURN'].includes(type)||type==='FREE_POUR'&&action.source==='bucket')return 'bucket';
 if(['FINISH_SURFACE','FREE_FINISH'].includes(type))return 'trowel';
 if(type==='PAINT_FLOOR_PANELS')return 'roller';
 if(type==='FREE_PAINT'&&['brush','roller'].includes(action.tool))return action.tool;
 return null;
}
export function assertStarterTool(toolkit,action){
 const id=requiredStarterTool(action);if(!id)return;
 const tool=toolkit?.tools.find(t=>t.id===id);
 if(!tool?.owned||tool.count!==1)throw Error(`${STARTER_TOOLS.find(t=>t.id===id).name}を持っていません。ホームで建築セットを開封し、建材受取所で受け取ってください。`);
}
export function toolkitSummary(toolkit){return toolkit?.received?'基本道具一式：所持。何度使っても減りません。':'基本道具一式：未受取。最初の建築セットを受け取ると使えます。';}
export function toolkitDetails(toolkit){return (toolkit?.tools??STARTER_TOOLS).map(t=>`${t.name} ${t.owned?'×1':'未受取'} — ${t.use}${t.usable?'':'（この作業は準備中）'}`).join('\n');}
