// Availability here is limited to the shared transport controller. The general
// game's toolkit keeps its availability flag until its scene is connected.
export function assertTransportShovel(toolkit,profileId){
 const tool=toolkit?.tools?.find(t=>t.id==='shovel');
 if(toolkit?.profileId!==profileId||!toolkit.received||typeof toolkit.sourceTransferId!=='string'||!tool?.owned||tool.count!==1)throw Error('シャベルを持っていません。ホームで建築セットを開封し、建材受取所で受け取ってください。');
}
export function transportNeedsShovel(record){
 if(record?.version!==2)return false;
 const f=record.work.frame;
 return !!f.job||f.soil.containers.shovel.amount>0||f.soil.journal.some(e=>e.from==='shovel'||e.to==='shovel');
}
