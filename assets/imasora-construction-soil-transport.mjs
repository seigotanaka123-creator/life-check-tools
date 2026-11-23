import {earthPatches,patchColumns,earthAllocated,earthBaseReader,hasContinuousQuarry,hasSummitFace,summitFaceDeposit,cutBank,hasCutBank,hasQuarryMountain,hasQuarryRange,quarryMountain,quarryRange} from './imasora-construction-field-earth.mjs?v=120ov';
import {assertTransportField,clusteredStorageBin,nativeStorageBin,transportArea,transportDigProtection} from './imasora-construction-transport-field.mjs?v=120ov';
import {canonical} from './imasora-construction-state.js';
import {rainFoundationPad,RAIN_FOUNDATION_LOAD,RAIN_FOUNDATION_PAD_SOIL} from './imasora-construction-guide-data.mjs?v=121cf';
import {sameValidatedConstructionRecordValue} from './imasora-construction-record-equality.mjs';
import {captureConstructionJson,isCapturedConstructionJson,capturedJsonInfo,capturedSoilJson} from './imasora-construction-json-capture.mjs';
import {nativeSoilOpening,SOIL_NATIVE_TRANSPORT_SCOPE,SOIL_NATIVE_TRANSPORT_FORMAT} from './imasora-construction-soil-native-source.mjs?v=120ov';
export {SOIL_NATIVE_TRANSPORT_SCOPE,SOIL_NATIVE_TRANSPORT_FORMAT};

// Quantity/ownership core for 9-2c1. This namespace cannot be a normal world,
// a development-loan import or a v1/v2/v3 vehicle checkpoint.
export const SOIL_TRANSPORT_SCOPE='imasora-shared-soil-transport-isolated-v1';
export const SOIL_TRANSPORT_FORMAT='imasora-shared-soil-transport-checkpoint-v1';
export const SOIL_Q=8;
export const SOIL_CAPACITY=Object.freeze({shovel:8,bucket:384,dump:1392,storage:262144});
export const SOIL_LIMITS=Object.freeze({seedCells:4096,history:2048,transfer:384,bytes:8*1024*1024});
export const HAND_EARTH_SHAPES=Object.freeze({
 step:Object.freeze({label:'土の段',height:2,amount:16}),
 block:Object.freeze({label:'土ブロック',height:8,amount:64})
});
const FULL='ffffffffffffffff',owners=Object.keys(SOIL_CAPACITY),copy=structuredClone;
const check=(ok,msg)=>{if(!ok)throw Error(`土の移送：${msg}`);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v,names)=>check(object(v)&&Object.keys(v).sort().join('|')===[...names].sort().join('|'),'保存の項目が一致しません。');
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER-1)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,96}$/.test(v);
function json(v,depth=0,seen=new Set(),immutability=null){
 const proof=v&&typeof v==='object'?capturedJsonInfo(v):null;if(proof){check(depth+proof.height<=32,'保存の階層が深すぎます。');return;}
 check(depth<=32,'保存の階層が深すぎます。');if(v===null||typeof v==='string'||typeof v==='boolean')return;
 if(typeof v==='number'){check(Number.isFinite(v),'保存できない数値です。');return;}
 check(Array.isArray(v)||object(v),'保存できない型です。');check(!seen.has(v),'循環した保存です。');seen.add(v);
 if(immutability&&(!Object.isFrozen(v)||Array.isArray(v)&&Object.getPrototypeOf(v)!==Array.prototype))immutability.frozen=false;
 // Coordinate triples dominate terrain history. Check their actual descriptors
 // once, with the same depth, density and finite-number rules as the general walk.
 if(Array.isArray(v)&&v.length===3&&Reflect.ownKeys(v).length===4){
  const a=Object.getOwnPropertyDescriptor(v,'0'),b=Object.getOwnPropertyDescriptor(v,'1'),c=Object.getOwnPropertyDescriptor(v,'2');
  if([a,b,c].every(d=>d&&d.enumerable&&Object.hasOwn(d,'value')&&typeof d.value==='number'&&Number.isFinite(d.value))){check(depth<32,'保存の階層が深すぎます。');seen.delete(v);return;}
 }
 const names=Object.keys(v);if(Array.isArray(v))check(names.length===v.length&&names.every((n,i)=>n===String(i)),'配列に欠けた要素があります。');
 check(Reflect.ownKeys(v).length===names.length+(Array.isArray(v)?1:0),'保存できない属性です。');
 for(const n of names){const d=Object.getOwnPropertyDescriptor(v,n);check(Object.hasOwn(d,'value'),'動的な属性です。');json(d.value,depth+1,seen,immutability);}seen.delete(v);
}
function position(p,scale=1,s=null){
 const lateral=s?.schema===3?4160:640,depth=s?.schema===3?2560:640;
 check(Array.isArray(p)&&p.length===3&&integer(p[0],-lateral/scale,(lateral-1)/scale)&&integer(p[1],-80/scale,255/scale)&&integer(p[2],-depth/scale,(depth-1)/scale),'土の座標が範囲外です。');
 if(s?.schema===3){const b=transportArea(s);check(p[0]*2*scale>=b.minX&&p[0]*2*scale+2*scale<=b.maxX&&p[2]*2*scale>=b.minZ&&p[2]*2*scale+2*scale<=b.maxZ,'現場の外に土を置けません。');}
}
// Cache only bounded arithmetic results, never terrain ownership or validity.
// Validate the current coordinates before lookup, including changed arrays.
const addressValues=new Map(),addressLimit=4096;
const positionCode=p=>((p[0]+4160)*336+p[1]+80)*5120+p[2]+2560;
function address(p,s){
 position(p,1,s);const code=positionCode(p);
 let result=addressValues.get(code);if(result)return result;
 const x=(p[0]%4+4)%4,y=(p[1]%4+4)%4,z=(p[2]%4+4)%4;
 result=Object.freeze({key:Math.floor(p[0]/4)+','+Math.floor(p[1]/4)+','+Math.floor(p[2]/4),bit:voxelBits[x+4*y+16*z]});
 if(addressValues.size>=addressLimit)addressValues.delete(addressValues.keys().next().value);
 addressValues.set(code,result);return result;
}
const voxelBits=Array.from({length:64},(_,i)=>1n<<BigInt(i));
// Masks and local bits repeat throughout a replay. Cache only bounded numeric
// conversions, never mutable soil or a validation verdict.
const maskValues=new Map();
const mask=v=>{let n=maskValues.get(v);if(n===undefined){n=BigInt('0x'+v);if(maskValues.size>=256)maskValues.delete(maskValues.keys().next().value);maskValues.set(v,n);}return n;},hex=v=>v.toString(16).padStart(16,'0');
const maskCounts=new Map();
function count(v){
 const cached=maskCounts.get(v);if(cached!==undefined)return cached;
 let bits=v,n=0;while(bits){bits&=bits-1n;n++;}
 if(maskCounts.size>=512)maskCounts.delete(maskCounts.keys().next().value);
 maskCounts.set(v,n);return n;
}
export function soilVoxel(s,p){const a=address(p,s),b=s.blocks[a.key];return b&&(mask(b.mask)&a.bit)!==0n?b.materialId:null;}
function setVoxel(s,p,material){const a=address(p,s),b=s.blocks[a.key];
 const bits=b?mask(b.mask):0n,present=(bits&a.bit)!==0n;
 if(material){check(!present,'置く場所に土があります。');check(!b||b.materialId===material,'同じ8セル内で異なる土を混ぜられません。');s.blocks[a.key]={materialId:material,mask:hex(bits|a.bit)};}
 else{check(present,'掘る土がありません。');const next=bits&~a.bit;if(next)s.blocks[a.key]={...b,mask:hex(next)};else delete s.blocks[a.key];}
}
function seed(site,initial){
 keys(site,['id','origin','materials']);check(id(site.id)&&Array.isArray(site.origin)&&site.origin.length===3&&site.origin.every(Number.isFinite),'現場の識別が不正です。');
 check(Array.isArray(site.materials)&&site.materials.length>=1&&site.materials.length<=32&&site.materials.every(id)&&new Set(site.materials).size===site.materials.length,'材質の識別が不正です。');
 keys(initial,['cells']);check(Array.isArray(initial.cells)&&initial.cells.length>=1&&initial.cells.length<=SOIL_LIMITS.seedCells,'初期地形の範囲が不正です。');
 const blocks={};for(const c of initial.cells){keys(c,['position','materialId']);position(c.position,4);check(site.materials.includes(c.materialId),'初期地形の材質が不正です。');const key=c.position.join(',');check(!Object.hasOwn(blocks,key),'初期地形が重複しています。');blocks[key]={materialId:c.materialId,mask:FULL};}
 return{format:SOIL_TRANSPORT_FORMAT,schema:1,scope:SOIL_TRANSPORT_SCOPE,site:copy(site),initial:copy(initial),revision:0,blocks,containers:Object.fromEntries(owners.map(k=>[k,{materialId:null,amount:0}])),pending:null,journal:[]};
}
export function createSoilTransport(site,cells){const initial={cells:copy(cells)};json({site,initial});return seed(site,initial);}
function nativeSeed(site,initial){
 keys(initial,['source']);const opening=nativeSoilOpening(initial.source);
 check(canonical(site)===canonical(opening.site),'元の現場・原点・材質を変更できません。');
 return{format:SOIL_NATIVE_TRANSPORT_FORMAT,schema:2,scope:SOIL_NATIVE_TRANSPORT_SCOPE,site:copy(opening.site),initial:copy(initial),revision:0,blocks:opening.blocks,loose:opening.loose,containers:opening.containers,pending:null,journal:[]};
}
export function createNativeSoilTransport(source){json(source);const initial={source:copy(source)},opening=nativeSoilOpening(source);return validateSoilTransport(nativeSeed(opening.site,initial));}
const seedFor=s=>s.schema===3?{...nativeSeed(s.site,s.initial),schema:3,field:copy(assertTransportField(s))}:s.schema===2?nativeSeed(s.site,s.initial):seed(s.site,s.initial);
// An explicit one-way upgrade. The source and complete ownership journal are
// retained; expanding the area never grants soil or seeds untouched land.
export function widenSoilTransport(s,corner){
 validateSoilTransport(s);check(s.schema===2&&!s.pending,'停止した元の土の記録から引き継いでください。');
 const origin=s.initial.source.yardOrigin,n={...copy(s),schema:3,field:{corner,origin:[origin[0],origin[2]]}};
 return validateSoilTransport(n);
}
function localAddress(p){check(Array.isArray(p)&&p.length===3&&p.every(n=>integer(n,0,3)),'盛土の部分座標が不正です。');return 1n<<BigInt(p[0]+4*p[1]+16*p[2]);}
export function soilLooseVoxel(s,looseId,p){const bit=localAddress(p),b=s.loose?.[looseId];return b&&(mask(b.mask)&bit)!==0n?b.materialId:null;}
function loosePositions(p,amount){check(Array.isArray(p)&&p.length===amount,'盛土の量と範囲が一致しません。');p.forEach(localAddress);check(new Set(p.map(q=>q.join(','))).size===p.length,'同じ盛土を二重に扱えません。');}
function changeLoose(s,looseId,p,m,restore){const b=s.loose[looseId];check(b&&b.materialId===m,'盛土が見つかりません。');for(const q of p){const bit=localAddress(q),present=(mask(b.mask)&bit)!==0n;check(restore?!present:present,'盛土の所有が一致しません。');b.mask=hex(restore?mask(b.mask)|bit:mask(b.mask)&~bit);}}
function material(s,m){check(s.site.materials.includes(m),'未登録の材質です。');}
function owner(v){check(v==='terrain'||owners.includes(v),'土の所有先が不正です。');}
function positions(p,amount,s){check(Array.isArray(p)&&p.length===amount,'土量と編集範囲が一致しません。');p.forEach(q=>position(q,1,s));check(new Set(p.map(positionCode)).size===p.length,'同じ土を二重に扱えません。');}
function room(s,to,m){if(to==='terrain')return SOIL_LIMITS.transfer;const c=s.containers[to];check(c.materialId===null||c.materialId===m,'違う種類の土は一緒に積めません。');return SOIL_CAPACITY[to]-c.amount;}
// Keep a cell mask as an integer while a single command edits its voxels.
// Check each requested voxel, including duplicates, before committing any cell.
function changeTerrain(s,positions,material,adding){
 const cells=new Map();
 for(const p of positions){const a=address(p,s);let cell=cells.get(a.key);
  if(!cell){const block=s.blocks[a.key];cell={block,bits:block?mask(block.mask):0n};cells.set(a.key,cell);}
  const present=(cell.bits&a.bit)!==0n;
  if(adding){check(!present,'置く場所に土があります。');check(!cell.block||cell.block.materialId===material,'同じ8セル内で異なる土を混ぜられません。');cell.bits|=a.bit;}
  else{check(present&&cell.block?.materialId===material,'掘る場所の土が一致しません。');cell.bits&=~a.bit;}
 }
 for(const [key,cell]of cells){if(cell.bits)s.blocks[key]={materialId:material,mask:hex(cell.bits)};else delete s.blocks[key];}
}
function add(s,to,m,amount,p){if(to==='terrain')changeTerrain(s,p,m,true);else{const c=s.containers[to];check(room(s,to,m)>=amount,'積載量を超えています。');c.materialId=m;c.amount+=amount;}}
function remove(s,from,m,amount,p){if(from==='terrain')changeTerrain(s,p,m,false);else{const c=s.containers[from];check(c.materialId===m&&c.amount>=amount,'移動元の土が足りません。');c.amount-=amount;if(!c.amount)c.materialId=null;}}
export function handEarthPositions(region,shape){
 if(!Object.hasOwn(HAND_EARTH_SHAPES,shape)||!Array.isArray(region)||region.length!==3||!region.every(Number.isSafeInteger)||region[0]%4||region[2]%4)return null;
 const [x,y,z]=region,ys=HAND_EARTH_SHAPES[shape].height/2,cells=[];
 for(let dx=0;dx<4;dx++)for(let dz=0;dz<4;dz++)for(let dy=0;dy<ys;dy++)cells.push([x+dx,y+dy,z+dz]);
 return cells;
}
export function handEarthOnSurface(s,[x,y,z],shape){
 // Natural ground retains its measured base. Above it the piece is supported
 // only by recorded soil, never by the abstract height of a visual model.
 const ground=earthBaseReader(s),height=HAND_EARTH_SHAPES[shape].height/2;
 for(let dx=0;dx<4;dx++)for(let dz=0;dz<4;dz++){
  const i=x+dx,k=z+dz;
  if(ground(i*2+1,k*2+1)!==y*2&&(y<=-16||!soilVoxel(s,[i,y-1,k])))return false;
  if(y+height<=255&&soilVoxel(s,[i,y+height,k]))return false;
 }
 return true;
}
export function handEarthPlacedPiece(s,base){
 for(let i=s.journal.length-1;i>=0;i--){
  const c=s.journal[i];
  if(c.type==='hand-earth'&&c.base.every((value,axis)=>value===base[axis]))return c.action==='place'?c:null;
 }
 return null;
}
function applyHandEarth(s,c){
 keys(c,['type','action','id','expectedRevision','base','shape']);
 check(s.schema===3&&!s.pending&&['place','remove'].includes(c.action),'土を動かし終えてから手作業でつくろう。');
 const cells=handEarthPositions(c.base,c.shape),shape=HAND_EARTH_SHAPES[c.shape];
 check(cells,'置く土の形が不正です。');
 positions(cells,shape.amount,s);
 const x=c.base[0]*2+4,z=c.base[2]*2+4,m='earth-soil';
 check(!transportDigProtection(s,x,z,4.001),'舗装された場所には置いたり片付けたりできません。');
 check(handEarthOnSurface(s,c.base,c.shape),'土の足元を平らにして、上が空いている場所で作業してください。');
 if(c.action==='place'){
  remove(s,'storage',m,shape.amount,[]);
  add(s,'terrain',m,shape.amount,cells);
 }else{
  check(handEarthPlacedPiece(s,c.base)?.shape===c.shape,'ここには手で置いた土がありません。');
  remove(s,'terrain',m,shape.amount,cells);
  add(s,'storage',m,shape.amount,[]);
 }
}
function applyRainFoundation(s,c){
 const loading=c.type==='rain-foundation-load',material='earth-soil';
 keys(c,['type','id','expectedRevision',...(loading?[]:['batch'])]);
 check(s.schema===3&&!s.pending,'土を動かし終えてから、水路の台座を作ろう。');
 if(loading){
  check(!s.containers.rainLoader,'先に車載の土を敷こう。');
  remove(s,'storage',material,RAIN_FOUNDATION_LOAD,[]);
  s.containers.rainLoader={materialId:material,amount:RAIN_FOUNDATION_LOAD};
  return;
 }
 const pad=rainFoundationPad(s.field,c.batch),cargo=s.containers.rainLoader;
 check(integer(c.batch,0,2)&&pad&&cargo?.amount>=RAIN_FOUNDATION_PAD_SOIL,'台座と車載の土を確認しよう。');
 check(!s.journal.some(q=>q.type==='rain-foundation-place'&&q.batch===c.batch),'この台座には土を敷いてあります。');
 for(const base of pad.pieces){
  const cells=handEarthPositions(base,'step');
  positions(cells,16,s);
  check(!transportDigProtection(s,base[0]*2+4,base[2]*2+4,4.001)&&handEarthOnSurface(s,base,'step'),
   '台座の足元をならして、舗装や段差をさけよう。');
  add(s,'terrain',material,cells.length,cells);
 }
 cargo.amount-=RAIN_FOUNDATION_PAD_SOIL;
 if(!cargo.amount)delete s.containers.rainLoader;
}
function apply(s,c,replaying=false,reservedIds=null){
 check(s.revision<Number.MAX_SAFE_INTEGER-2&&s.journal.length<SOIL_LIMITS.history,'作業履歴が上限です。土を保持して止めます。');
 check(id(c.id)&&integer(c.expectedRevision)&&c.expectedRevision===s.revision,'別の作業で更新されています。保存を読み直してください。');
 if(c.type==='hand-earth'){
  applyHandEarth(s,c);
 }else if(c.type==='rain-foundation-load'||c.type==='rain-foundation-place'){
  applyRainFoundation(s,c);
 }else if(c.type==='relocate-earth-storage'){
  keys(c,['type','id','expectedRevision']);
  const bin=clusteredStorageBin(s);
  check(bin&&!s.pending&&!nativeStorageBin(s).clustered,'土を移し終えてから保管箱の設置場所を確認してください。');
  const base=earthBaseReader(s),hx=bin.width/2,hz=bin.depth/2;
  for(let x=Math.floor((bin.x-hx)/2);x<Math.ceil((bin.x+hx)/2);x++)for(let z=Math.floor((bin.z-hz)/2);z<Math.ceil((bin.z+hz)/2);z++){
   check(base(x*2+1,z*2+1)===0,'新しい保管箱の足元に空いた平らな場所が必要です。');
   for(let y=0;y<bin.height/2;y++)check(!soilVoxel(s,[x,y,z]),'新しい保管箱の位置にすでに盛り土があります。');
  }
  check(!Object.values(s.loose).some(b=>b.position[1]+4>0&&b.position[1]-4<bin.height&&Math.abs(b.position[0]-bin.x)<hx+4&&Math.abs(b.position[2]-bin.z)<hz+4),'新しい保管箱の位置に土があります。');
 }else if(c.type==='open-summit-face'){
  keys(c,['type','id','expectedRevision','amount']);
  check(!s.pending&&hasContinuousQuarry(s)&&!hasSummitFace(s),'山頂の採土面はすでに開いているか、作業中です。');
  const face=summitFaceDeposit(s);
  check(c.amount===face.amount,'山頂の表土の量が一致しません。');
  for(const [key,mask] of face.blocks){
   const previous=s.blocks[key];
   check(!previous||previous.materialId==='earth-soil','山頂に異なる資材があります。');
   s.blocks[key]={materialId:'earth-soil',mask:(BigInt('0x'+(previous?.mask??'0'))|mask).toString(16).padStart(16,'0')};
  }
 }else if(c.type==='surface-quarry-slopes'){
  keys(c,['type','id','expectedRevision']);
  check(!s.pending&&hasQuarryRange(s)&&!hasContinuousQuarry(s),'採土場の走行面を確認できません。');
 }else if(['open-cut-bank','open-cut-ridge','open-quarry-mountain','open-quarry-range'].includes(c.type)){
  const mountain=c.type==='open-quarry-mountain',range=c.type==='open-quarry-range';
  keys(c,['type','id','expectedRevision',...(range&&c.summitOnly===true?['summitOnly']:[]),...(range&&c.summitOnly&&c.gradedFoot===true?['gradedFoot']:[]),...(range&&c.gradedFoot&&c.slopes===true?['slopes']:[])]);
  const bank=range?quarryRange(s,c.summitOnly===true,c.gradedFoot===true,c.slopes===true):mountain?quarryMountain(s):cutBank(s,c.type==='open-cut-ridge');
  check(bank&&!s.pending&&!(range?hasQuarryRange(s):mountain?hasQuarryMountain(s):hasCutBank(s)),'山の採土場はすでに開いているか、土が移動中です。');
  check(bank.blocks.every(b=>!s.blocks[b.key]),'山を開く場所に、すでに盛り土があります。');
  if(mountain||range){
   check(Object.keys(s.blocks).every(key=>{
    const [x,y,z]=key.split(',').map(Number);
    return y<0||bank.rock.upperBound(x*8,x*8+7,z*8,z*8+7)<=y*8;
   }),'山の岩盤に、すでに盛り土があります。');
  }
  for(const b of bank.blocks)s.blocks[b.key]={materialId:'earth-soil',mask:b.mask};
 }else if(c.type==='open-ground'){
  keys(c,['type','id','expectedRevision','patches']);check(s.schema===3&&!s.pending&&Array.isArray(c.patches)&&c.patches.length>0&&c.patches.length<=25,'掘る地面の準備が不正です。');
  const opened=new Set(earthPatches(s).keys());for(const p of c.patches){const key=p.join(','),columns=patchColumns(s,p);check(!opened.has(key)&&columns.length>0,'同じ地面の土を二重に増やせません。');opened.add(key);
   for(const [x,z]of columns)for(let y=-4;y<0;y++){const k=[x,y,z].join(',');check(!s.blocks[k],'保存した土に重ねて地面を作れません。');s.blocks[k]={materialId:'earth-soil',mask:FULL};}
  }
 }else if(c.type==='reserve-batch'){

  keys(c,['type','id','expectedRevision','transferId','to','materialId','segments']);
  check(s.schema>=2&&!s.pending&&c.to==='bucket'&&id(c.transferId),'共有地形から空きのあるバケットへの予約が必要です。');
  check(!(reservedIds?reservedIds.has(c.transferId):s.journal.some(q=>['reserve','reserve-loose','reserve-batch'].includes(q.type)&&q.transferId===c.transferId)),'移送番号が重複しています。');
  material(s,c.materialId);check(Array.isArray(c.segments)&&c.segments.length>=1&&c.segments.length<=SOIL_LIMITS.transfer,'取り元の数が不正です。');
  const seen=new Set();let requested=0;
  for(const q of c.segments){const loose=q.from==='loose';keys(q,['from','positions',...(loose?['looseId']:[])]);check(loose||q.from==='terrain','地面か盛土だけを回収できます。');check(Array.isArray(q.positions)&&q.positions.length>0,'回収する範囲が空です。');requested+=q.positions.length;check(requested<=SOIL_LIMITS.transfer,'回収量が上限を超えています。');
   if(loose){check(id(q.looseId),'盛土の番号が不正です。');loosePositions(q.positions,q.positions.length);}else positions(q.positions,q.positions.length,s);
   for(const p of q.positions){const key=q.from+':'+(q.looseId??'')+':'+p.join(',');check(!seen.has(key),'同じ土を二重に扱えません。');seen.add(key);check((loose?soilLooseVoxel(s,q.looseId,p):soilVoxel(s,p))===c.materialId,'回収する土が一致しません。');}
  }
  check(integer(requested,1,SOIL_LIMITS.transfer),'回収量が上限を超えています。');const amount=Math.min(requested,room(s,c.to,c.materialId));check(amount>0,'バケットがいっぱいです。');
  const segments=[];let rest=amount;for(const q of c.segments){if(!rest)break;const chosen=q.positions.slice(0,rest),p=replaying?chosen:copy(chosen),part={...q,positions:p};segments.push(part);rest-=p.length;if(q.from==='loose')changeLoose(s,q.looseId,p,c.materialId,false);else remove(s,'terrain',c.materialId,p.length,p);}
  s.pending={id:c.transferId,phase:'reserved',from:'batch',to:c.to,materialId:c.materialId,amount,positions:[],segments};
 }else if(c.type==='reserve'||c.type==='reserve-loose'){
  const loose=c.type==='reserve-loose';keys(c,['type','id','expectedRevision','transferId','from','to','materialId','amount','positions',...(loose?['looseId']:[])]);check(!s.pending,'進行中の土の移送を終えてください。');check(id(c.transferId)&&!(reservedIds?reservedIds.has(c.transferId):s.journal.some(q=>['reserve','reserve-loose','reserve-batch'].includes(q.type)&&q.transferId===c.transferId)),'移送番号が重複しています。');
  if(loose){check(s.schema>=2&&c.from==='loose'&&id(c.looseId)&&owners.includes(c.to),'盛土は現行の引継ぎから容器へ回収してください。');loosePositions(c.positions,c.amount);}
  else owner(c.from);owner(c.to);material(s,c.materialId);check(c.from!==c.to&&integer(c.amount,1,SOIL_LIMITS.transfer),'移動先または量が不正です。');
  const touches=c.from==='terrain'||c.to==='terrain';if(touches)positions(c.positions,c.amount,s);else if(!loose)check(Array.isArray(c.positions)&&!c.positions.length,'不要な地形の編集指定です。');
  // Clip to space at the destination, retaining the remainder at the source.
  if(loose)for(const p of c.positions)check(soilLooseVoxel(s,c.looseId,p)===c.materialId,'回収する盛土がありません。');
  const available=(c.from==='terrain'||loose)?c.amount:(s.containers[c.from].materialId===c.materialId?s.containers[c.from].amount:0),amount=Math.min(c.amount,available,room(s,c.to,c.materialId));check(amount>0,'土がないか、移動先がいっぱいです。');
  const chosen=(touches||loose)?c.positions.slice(0,amount):[],p=replaying?chosen:copy(chosen);
  if(c.to==='terrain')for(const q of p){const a=address(q,s),b=s.blocks[a.key];check(!soilVoxel(s,q)&&(!b||b.materialId===c.materialId),'置く場所が塞がっています。');}
  if(loose)changeLoose(s,c.looseId,p,c.materialId,false);else remove(s,c.from,c.materialId,amount,c.from==='terrain'?p:[]);
  s.pending={id:c.transferId,phase:'reserved',from:c.from,to:c.to,materialId:c.materialId,amount,positions:p,...(loose?{looseId:c.looseId}:{})};
 }else{
  const land=c.type==='land';keys(c,land?['type','id','expectedRevision','transferId','positions']:['type','id','expectedRevision','transferId']);
  const p=s.pending;check(p&&c.transferId===p.id,'移送途中の土が見つかりません。');
  if(c.type==='release'){check(p.phase==='reserved','すでに土を放しています。');p.phase='in-flight';}
  else if(c.type==='complete'){check(p.phase==='in-flight','放した土だけを受け取れます。');add(s,p.to,p.materialId,p.amount,p.to==='terrain'?p.positions:[]);s.pending=null;}
  else if(c.type==='cancel'){check(p.phase==='reserved','放した土は元へ戻せません。落ちた地面へ残してください。');if(p.from==='batch'){for(const q of p.segments)if(q.from==='loose')changeLoose(s,q.looseId,q.positions,p.materialId,true);else add(s,'terrain',p.materialId,q.positions.length,q.positions);}else if(p.from==='loose')changeLoose(s,p.looseId,p.positions,p.materialId,true);else add(s,p.from,p.materialId,p.amount,p.from==='terrain'?p.positions:[]);s.pending=null;}
  else if(land){check(p.phase==='in-flight','落下途中の土だけを地面へ残せます。');positions(c.positions,p.amount,s);add(s,'terrain',p.materialId,p.amount,c.positions);s.pending=null;}
  else throw Error('土の移送：未対応の操作です。');
 }
 // Replay is private and synchronous over descriptor-checked JSON. Nothing
 // mutates a command; only the live transition needs a separate journal copy.
 if(reservedIds&&['reserve','reserve-loose','reserve-batch'].includes(c.type))reservedIds.add(c.transferId);
 s.revision++;s.journal.push(replaying?c:copy(c));return s;
}
function projection(s){return{revision:s.revision,blocks:s.blocks,...(s.schema>=2?{loose:s.loose}:{}),containers:s.containers,pending:s.pending};}
export function soilTransportTotals(s){const result=Object.fromEntries(s.site.materials.map(m=>[m,{terrain:0,shovel:0,bucket:0,dump:0,storage:0,inFlight:0,total:0}]));
 if(s.schema>=2){for(const r of Object.values(result))r.loose=0;for(const b of Object.values(s.loose))result[b.materialId].loose+=count(mask(b.mask));}
 for(const b of Object.values(s.blocks))result[b.materialId].terrain+=count(mask(b.mask));
 for(const [k,c]of Object.entries(s.containers))if(c.amount)result[c.materialId][k]=(result[c.materialId][k]??0)+c.amount;
 if(s.pending)result[s.pending.materialId].inFlight=s.pending.amount;
 for(const r of Object.values(result))r.total=r.terrain+(r.loose??0)+r.shovel+r.bucket+r.dump+r.storage+(r.rainLoader??0)+r.inFlight;return result;
}
// Retain exact, checked values, never mutable state identities or a short
// checksum. Mutable/unproved graphs pass descriptor checks before each lookup.
// A changed external source, owner, voxel or journal requires a fresh replay.
// Bound retained UTF-16 key storage as well as entry count on mobile browsers.
// Small saves need the before/reserved/cancelled/completed values together.
// Retain up to eight exact values within the SAME byte ceiling; large saves
// still evict by bytes. Two entries made every audit evict its own inputs.
// The UTF-16 accounting must allow both maximum-size before/after scenes;
// the previous 8 MiB cache could not retain even one ordinary 4.47 MB scene.
const validatedSoilValues=new Map(),validationMemoLimit=32*1024*1024;
// An identity is trusted only after every descendant has passed the ordinary
// descriptor check AND is frozen. A frozen wrapper around mutable data never
// qualifies. Weak references keep no retired scenes alive.
const validatedFrozenSoils=new WeakSet();
const soilByteBounds=new WeakMap(),handDeltas=new WeakMap(),scoopTerrainDeltas=new WeakMap();
export function scoopTerrainDelta(soil){
 const delta=scoopTerrainDeltas.get(soil),previous=delta?.previous.deref();
 return previous?{previous,command:delta.command}:null;
}
export const isValidatedFrozenSoil=soil=>validatedFrozenSoils.has(soil);
export function handEarthSoilDelta(soil){
 const entry=handDeltas.get(soil),previous=entry?.previous.deref();
 return previous?{previous,base:entry.base,keys:entry.keys}:null;
}
let validationMemoBytes=0;
function rememberValidatedSoil(value){
 const bytes=value.length*2;if(bytes>validationMemoLimit)return;
 if(validatedSoilValues.has(value)){validationMemoBytes-=validatedSoilValues.get(value);validatedSoilValues.delete(value);}
 while(validatedSoilValues.size>=8||validationMemoBytes+bytes>validationMemoLimit){const oldest=validatedSoilValues.keys().next().value;validationMemoBytes-=validatedSoilValues.get(oldest);validatedSoilValues.delete(oldest);}
 validatedSoilValues.set(value,bytes);validationMemoBytes+=bytes;
}
function checkedSoilValue(s,immutability=null){
 json(s,0,new Set(),immutability);keys(s,['format','schema','scope','site','initial','revision','blocks','containers','pending','journal',...(s.schema>=2?['loose']:[]),...(s.schema===3?['field']:[])]);check((s.format===SOIL_TRANSPORT_FORMAT&&s.schema===1&&s.scope===SOIL_TRANSPORT_SCOPE)||(s.format===SOIL_NATIVE_TRANSPORT_FORMAT&&[2,3].includes(s.schema)&&s.scope===SOIL_NATIVE_TRANSPORT_SCOPE),'旧掘削や通常保存はこの形式で読めません。');
 check(integer(s.revision)&&Array.isArray(s.journal)&&s.journal.length<=SOIL_LIMITS.history&&s.revision===s.journal.length,'保存番号と履歴が一致しません。');
 assertTransportField(s);const value=canonical(s);check(new TextEncoder().encode(value).length<=SOIL_LIMITS.bytes,'保存内容が大きすぎます。');
 return value;
}
// A capture is immutable before yielding to the validator. Only a successful
// full replay in the same save worker grants this local immutable identity.
export async function validateSoilTransportAsync(s,{record=null,checkedPoint=null}={}){
 const owned=isCapturedConstructionJson(s)?s:await captureConstructionJson(s);
 if(record||!validatedFrozenSoils.has(owned)){
  if(record&&(!isCapturedConstructionJson(record)||record.work?.frame?.soil!==owned))throw Error('人物と土の読込みが一致しません。');
  const {runWorldSaveTask,isCheckedTransportRestorePoint}=await import('./imasora-world-save-client.mjs?v=120pv');
  if(checkedPoint!==null){if(!record||!isCheckedTransportRestorePoint(checkedPoint)||checkedPoint.applied!==record)throw Error('検査済みの現場と土が一致しません。');}
  else if(await runWorldSaveTask(record?'transport-check':'soil-check',record?{record}:{soil:owned})!==true)throw Error('土の保存を確認できませんでした。');
  validatedFrozenSoils.add(owned);
 }
 return owned;
}
export function validateSoilTransport(s){
 if(validatedFrozenSoils.has(s))return s;
 const immutability={frozen:true},value=checkedSoilValue(s,immutability);
 if(validatedSoilValues.has(value)){const bytes=validatedSoilValues.get(value);validatedSoilValues.delete(value);validatedSoilValues.set(value,bytes);if(immutability.frozen)validatedFrozenSoils.add(s);return s;}
// The private replay index contains exactly the successfully checked prefix.
 // It replaces repeated scans, without trusting ids from an unvalidated record.
 const replay=seedFor(s),initial=soilTransportTotals(replay),seen=new Set(),reservedIds=new Set();for(const c of s.journal){check(object(c)&&id(c.id)&&!seen.has(c.id),'操作番号が重複しています。');seen.add(c.id);apply(replay,c,true,reservedIds);}
 check(canonical(projection(replay))===canonical(projection(s)),'地形・積荷・途中の土と移送履歴が一致しません。');
 const totals=soilTransportTotals(replay);for(const m of s.site.materials)check(totals[m].total===initial[m].total+(m==='earth-soil'?earthAllocated(replay):0),'土の体積が一致しません。');
 rememberValidatedSoil(value);if(immutability.frozen)validatedFrozenSoils.add(s);return s;
}
// A scoop touches a bounded set of cells. Loading a dump or unloading it
// into storage changes only the owners, so keep the checked terrain shared.
const unloadToStorage=transfer=>transfer?.from==='dump'&&transfer.to==='storage';
const fixedContainerTransfer=transfer=>transfer?.from==='bucket'&&transfer.to==='dump'||unloadToStorage(transfer);
function applyOwnedSoilCommands(s,commands){
 const first=commands[0],opening=first.type==='open-ground',reserving=first.type==='reserve-batch';
 const changedOwner=first.type==='reserve'?first.from:first.type==='release'?s.pending.to:null;
 const reserveLoose=reserving&&first.segments.some(part=>part.from==='loose');
 const loose=reserveLoose?{...s.loose}:s.loose;
 if(reserveLoose)for(const {from,looseId} of first.segments){
  if(from==='loose'&&Object.hasOwn(loose,looseId))loose[looseId]={...loose[looseId]};
 }
 const n={...s,blocks:opening||reserving?{...s.blocks}:s.blocks,loose,
  containers:changedOwner?{...s.containers,[changedOwner]:{...s.containers[changedOwner]}}:s.containers,
  pending:s.pending?{...s.pending}:null,journal:[...s.journal]};
 for(const command of commands)apply(n,command);
 if(opening){
  for(const patch of first.patches)for(const [x,z] of patchColumns(s,patch)){
   for(let y=-4;y<0;y++)Object.freeze(n.blocks[x+','+y+','+z]);
  }
 }
 if(reserving){
  for(const {from,looseId} of first.segments)if(from==='loose')Object.freeze(n.loose[looseId]);
  for(const q of n.pending.segments)if(q.from==='terrain'){
   for(const p of q.positions)Object.freeze(n.blocks[address(p,s).key]);
  }
 }
 const tail=n.journal.slice(s.journal.length);
 // The journal and reservation are measured as emitted. Survey adds at most
 // 1600 bounded earth block entries. A reservation only shrinks old masks,
 // and a transfer between containers takes fixed space.
 const encoder=new TextEncoder();
 const prior=soilByteBounds.get(s)??encoder.encode(capturedSoilJson(s)??JSON.stringify(s)).length;
 const bounded=prior+256+encoder.encode(JSON.stringify([tail,n.pending])).length+(opening?25*16*4*96:0);
 const bytes=bounded<=SOIL_LIMITS.bytes?bounded:encoder.encode(checkedSoilValue(n)).length;
 const seal=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))seal(child);Object.freeze(value);}};
 Object.freeze(n.blocks);Object.freeze(n.loose);
 seal(n);
 validatedFrozenSoils.add(n);soilByteBounds.set(n,bytes);
 if(typeof WeakRef==='function')scoopTerrainDeltas.set(n,{previous:new WeakRef(s),command:tail[0]});
 return n;
}

export function soilTransportCommand(s,c){
 validateSoilTransport(s);json(c);const existing=s.journal.find(q=>q.id===c.id);if(existing){check(canonical(existing)===canonical(c),'同じ操作番号の内容が変わっています。');return s;}
 if(s.schema===3&&validatedFrozenSoils.has(s)&&(c.type==='open-ground'||c.type==='reserve-batch'&&Array.isArray(c.segments)&&c.segments.every(object)||c.type==='reserve'&&fixedContainerTransfer(c)))return applyOwnedSoilCommands(s,[c]);
 if(c.type==='hand-earth'&&validatedFrozenSoils.has(s)){
  // The same replay reducer changes only the occupied cells and the stock.
  // Reuse every other certified frozen value, including the mountain.
  const beforeBytes=soilByteBounds.get(s)??new TextEncoder().encode(capturedSoilJson(s)??canonical(s)).length;
  const n=apply({...s,blocks:{...s.blocks},containers:{...s.containers,storage:{...s.containers.storage}},journal:[...s.journal]},c);
  const command=n.journal.at(-1),keys=[...new Set(handEarthPositions(command.base,command.shape).map(p=>address(p,s).key))];
  const bytes=beforeBytes+1024;
  // One short journal entry, at most two block keys, and two small counters.
  // If the conservative bound reaches the limit, use the exact check.
  const boundedBytes=bytes<=SOIL_LIMITS.bytes?bytes:new TextEncoder().encode(checkedSoilValue(n)).length;
  for(const key of keys)if(n.blocks[key])Object.freeze(n.blocks[key]);
  Object.freeze(command.base);Object.freeze(command);Object.freeze(n.blocks);Object.freeze(n.containers.storage);Object.freeze(n.containers);Object.freeze(n.journal);Object.freeze(n);
  validatedFrozenSoils.add(n);soilByteBounds.set(n,boundedBytes);
  if(typeof WeakRef==='function')handDeltas.set(n,{previous:new WeakRef(s),base:command.base,keys});
  return n;
 }
 // The prior state was fully validated and this private transition is the
 // SAME reducer used during replay. Replaying its entire prefix once more
 // cannot add evidence. Check shape/limits and conservation, then remember
 // only the exact resulting value. External/new values still replay fully.
 const n=apply(copy(s),c),value=checkedSoilValue(n),before=soilTransportTotals(s),after=soilTransportTotals(n);
 for(const m of s.site.materials)check(after[m].total===before[m].total+(m==='earth-soil'?earthAllocated(n)-earthAllocated(s):0),'土の体積が一致しません。');
 rememberValidatedSoil(value);return n;
}
// Private audit projections often release then complete the same reservation.
// Validate the source once and run the unchanged reducer on one detached copy.
// Each command keeps its revision/id/ownership checks; the final state still
// passes shape, byte limits and conservation before it enters the exact cache.
export function soilTransportCommands(s,commands){
 validateSoilTransport(s);check(Array.isArray(commands)&&commands.length===2&&commands[0]?.type==='release'&&commands[1]?.type==='complete'&&commands[0].transferId===commands[1].transferId&&commands[0].id!==commands[1].id,'同じ移送の受取と完了だけをまとめられます。');
 const fillsBucket=s.pending?.from==='batch'&&s.pending.to==='bucket';
 if(s.schema===3&&validatedFrozenSoils.has(s)&&(fillsBucket||fixedContainerTransfer(s.pending))&&commands.every(c=>!s.journal.some(q=>q.id===c.id))){
  commands.forEach(c=>json(c));
  return applyOwnedSoilCommands(s,commands);
 }
 const n=copy(s);for(const c of commands){json(c);const old=n.journal.find(q=>q.id===c.id);
  if(old){check(canonical(old)===canonical(c),'同じ操作番号の内容が変わっています。');continue;}apply(n,c);
 }
 const value=checkedSoilValue(n),before=soilTransportTotals(s),after=soilTransportTotals(n);
 for(const m of s.site.materials)check(after[m].total===before[m].total+(m==='earth-soil'?earthAllocated(n)-earthAllocated(s):0),'土の体積が一致しません。');
 rememberValidatedSoil(value);return n;
}
// A worker-side continuity check for captured soil. Derive the whole
// successor from the checked parent using the regular command reducer, then
// compare every value. An unrelated or edited record still goes
// through the full history validation at the call site.
const checkedSurveys=new WeakMap();
export function reuseScoopSoilTransition(previous,next){
 if(!validatedFrozenSoils.has(previous)||previous.schema!==3||!isCapturedConstructionJson(next)||next.schema!==3)return false;
 if(!Array.isArray(next.journal))return false;
 const tail=next.journal.slice(previous.revision);
 const survey=!previous.pending&&tail[0]?.type==='open-ground'?tail[0]:null;
 const opening=survey&&tail.length===1;
 const reserve=tail.length===(survey?2:1)&&!previous.pending&&tail.at(-1)?.type==='reserve-batch'?tail.at(-1):null;
 const containerReserve=tail.length===1&&!previous.pending&&tail[0]?.type==='reserve'&&fixedContainerTransfer(tail[0])?tail[0]:null;
 const fillsBucket=previous.pending?.from==='batch'&&previous.pending.to==='bucket';
 const nextUnloadBatch=tail.length===3&&unloadToStorage(previous.pending)&&tail[2]?.type==='reserve'&&unloadToStorage(tail[2]);
 const completing=(tail.length===2||nextUnloadBatch)&&(fillsBucket||fixedContainerTransfer(previous.pending))&&tail[0]?.type==='release'&&tail[1]?.type==='complete';
 if(!opening&&!reserve&&!containerReserve&&!completing)return false;
 const text=capturedSoilJson(next);
 if(text===null)return false;
 let parent=previous,derived;
 try{
  if(reserve&&survey){
   const checked=checkedSurveys.get(previous);
   // Planning checked this same survey against the same frozen parent.
   // Reuse its exact support layers on the later reservation pass.
   parent=checked&&sameValidatedConstructionRecordValue(checked.command,survey,true)
    ?checked.soil:soilTransportCommand(previous,survey);
  }
  const singleCommand=reserve||containerReserve||(opening?survey:null);
  derived=singleCommand?soilTransportCommand(parent,singleCommand):soilTransportCommands(parent,tail.slice(0,2));
  if(nextUnloadBatch)derived=soilTransportCommand(derived,tail[2]);
 }
 catch{return false;}
 // The source can still be the native-cloned result of opening the quarry.
 // With no signed-zero-free JSON proof for it, compare the actual numbers.
 const matches=capturedSoilJson(previous)!==null?JSON.stringify(derived)===text
  :sameValidatedConstructionRecordValue(derived,next,true);
 if(!matches)return false;
 validatedFrozenSoils.add(next);
 soilByteBounds.set(next,soilByteBounds.get(derived));
 if(opening)checkedSurveys.set(previous,{command:next.journal.at(-1),soil:next});
 if(typeof WeakRef==='function')scoopTerrainDeltas.set(next,{previous:new WeakRef(parent),command:derived.journal[parent.revision]});
 return true;
}

export function validateSoilTransportContinuation(old,next){validateSoilTransport(old);validateSoilTransport(next);check(old.scope===next.scope&&old.format===next.format&&old.schema===next.schema&&canonical(old.field??null)===canonical(next.field??null)&&canonical(old.site)===canonical(next.site)&&canonical(old.initial)===canonical(next.initial),'別の現場・初期地形へ切り替えられません。');check(next.journal.length>=old.journal.length&&old.journal.every((c,i)=>canonical(c)===canonical(next.journal[i])),'古い所有状態・一部だけの復元では土を複製するため戻せません。');return next;}
function checksum(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packSoilTransport(s){validateSoilTransport(s);return JSON.stringify({kind:s.format,version:s.schema,checksum:checksum(canonical(s)),state:s});}
export function unpackSoilTransport(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+1024,'保存の大きさが不正です。');let p;try{p=JSON.parse(text);}catch{throw Error('土の移送：保存ファイルを読み取れません。');}keys(p,['kind','version','checksum','state']);check(p.kind===p.state?.format&&p.version===p.state?.schema&&p.checksum===checksum(canonical(p.state)),'保存形式・チェックサムが一致しません。');return validateSoilTransport(p.state);}
// Render only edited cells at 2-unit resolution. Unedited cells stay a single
// 8-unit cube; do not expand all 64 sub-cells of untouched terrain every frame.
export function soilTransportGeometry(s){const boxes=[];for(const[k,b]of Object.entries(s.blocks)){const cell=k.split(',').map(Number);if(b.mask===FULL){boxes.push({position:cell.map(n=>n*8+4),size:8,materialId:b.materialId});continue;}const bits=mask(b.mask);for(let i=0;i<64;i++)if(bits&(1n<<BigInt(i))){const p=[i%4,Math.floor(i/4)%4,Math.floor(i/16)];boxes.push({position:p.map((n,j)=>cell[j]*8+n*2+1),size:2,materialId:b.materialId});}}
 for(const b of Object.values(s.loose??{})){if(b.mask===FULL){boxes.push({position:[...b.position],size:8,materialId:b.materialId});continue;}const bits=mask(b.mask);for(let i=0;i<64;i++)if(bits&(1n<<BigInt(i))){const p=[i%4,Math.floor(i/4)%4,Math.floor(i/16)];boxes.push({position:p.map((n,j)=>b.position[j]-4+n*2+1),size:2,materialId:b.materialId});}}return boxes;}
