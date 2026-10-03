import {canonical} from './imasora-construction-state.js';
import {nativeSoilOpening,SOIL_NATIVE_TRANSPORT_SCOPE,SOIL_NATIVE_TRANSPORT_FORMAT} from './imasora-construction-soil-native-source.mjs';
export {SOIL_NATIVE_TRANSPORT_SCOPE,SOIL_NATIVE_TRANSPORT_FORMAT};

// Quantity/ownership core for 9-2c1. This namespace cannot be a normal world,
// a development-loan import or a v1/v2/v3 vehicle checkpoint.
export const SOIL_TRANSPORT_SCOPE='imasora-shared-soil-transport-isolated-v1';
export const SOIL_TRANSPORT_FORMAT='imasora-shared-soil-transport-checkpoint-v1';
export const SOIL_Q=8;
export const SOIL_CAPACITY=Object.freeze({shovel:8,bucket:384,dump:1392,storage:262144});
export const SOIL_LIMITS=Object.freeze({seedCells:4096,history:2048,transfer:384,bytes:8*1024*1024});
const FULL='ffffffffffffffff',owners=Object.keys(SOIL_CAPACITY),copy=structuredClone;
const check=(ok,msg)=>{if(!ok)throw Error(`土の移送：${msg}`);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const keys=(v,names)=>check(object(v)&&Object.keys(v).sort().join('|')===[...names].sort().join('|'),'保存の項目が一致しません。');
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER-1)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,96}$/.test(v);
function json(v,depth=0,seen=new Set()){
 check(depth<=32,'保存の階層が深すぎます。');if(v===null||typeof v==='string'||typeof v==='boolean')return;
 if(typeof v==='number'){check(Number.isFinite(v),'保存できない数値です。');return;}
 check(Array.isArray(v)||object(v),'保存できない型です。');check(!seen.has(v),'循環した保存です。');seen.add(v);
 const names=Object.keys(v);if(Array.isArray(v))check(names.length===v.length&&names.every((n,i)=>n===String(i)),'配列に欠けた要素があります。');
 check(Reflect.ownKeys(v).length===names.length+(Array.isArray(v)?1:0),'保存できない属性です。');
 for(const n of names){const d=Object.getOwnPropertyDescriptor(v,n);check(Object.hasOwn(d,'value'),'動的な属性です。');json(d.value,depth+1,seen);}seen.delete(v);
}
function position(p,scale=1){check(Array.isArray(p)&&p.length===3&&integer(p[0],-640/scale,639/scale)&&integer(p[1],-80/scale,255/scale)&&integer(p[2],-640/scale,639/scale),'土の座標が範囲外です。');}
function address(p){position(p);const cell=p.map(n=>Math.floor(n/4)),l=p.map(n=>(n%4+4)%4);return{key:cell.join(','),bit:1n<<BigInt(l[0]+4*l[1]+16*l[2])};}
const mask=v=>BigInt('0x'+v),hex=v=>v.toString(16).padStart(16,'0');
function count(v){let n=0;while(v){v&=v-1n;n++;}return n;}
export function soilVoxel(s,p){const a=address(p),b=s.blocks[a.key];return b&&(mask(b.mask)&a.bit)!==0n?b.materialId:null;}
function setVoxel(s,p,material){const a=address(p),b=s.blocks[a.key];
 if(material){check(!soilVoxel(s,p),'置く場所に土があります。');check(!b||b.materialId===material,'同じ8セル内で異なる土を混ぜられません。');s.blocks[a.key]={materialId:material,mask:hex((b?mask(b.mask):0n)|a.bit)};}
 else{check(soilVoxel(s,p),'掘る土がありません。');const next=mask(b.mask)&~a.bit;if(next)s.blocks[a.key]={...b,mask:hex(next)};else delete s.blocks[a.key];}
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
const seedFor=s=>s.schema===2?nativeSeed(s.site,s.initial):seed(s.site,s.initial);
function localAddress(p){check(Array.isArray(p)&&p.length===3&&p.every(n=>integer(n,0,3)),'盛土の部分座標が不正です。');return 1n<<BigInt(p[0]+4*p[1]+16*p[2]);}
export function soilLooseVoxel(s,looseId,p){const bit=localAddress(p),b=s.loose?.[looseId];return b&&(mask(b.mask)&bit)!==0n?b.materialId:null;}
function loosePositions(p,amount){check(Array.isArray(p)&&p.length===amount,'盛土の量と範囲が一致しません。');p.forEach(localAddress);check(new Set(p.map(q=>q.join(','))).size===p.length,'同じ盛土を二重に扱えません。');}
function changeLoose(s,looseId,p,m,restore){const b=s.loose[looseId];check(b&&b.materialId===m,'盛土が見つかりません。');for(const q of p){const bit=localAddress(q),present=(mask(b.mask)&bit)!==0n;check(restore?!present:present,'盛土の所有が一致しません。');b.mask=hex(restore?mask(b.mask)|bit:mask(b.mask)&~bit);}}
function material(s,m){check(s.site.materials.includes(m),'未登録の材質です。');}
function owner(v){check(v==='terrain'||owners.includes(v),'土の所有先が不正です。');}
function positions(p,amount){check(Array.isArray(p)&&p.length===amount,'土量と編集範囲が一致しません。');p.forEach(q=>position(q));check(new Set(p.map(q=>q.join(','))).size===p.length,'同じ土を二重に扱えません。');}
function room(s,to,m){if(to==='terrain')return SOIL_LIMITS.transfer;const c=s.containers[to];check(c.materialId===null||c.materialId===m,'違う種類の土は一緒に積めません。');return SOIL_CAPACITY[to]-c.amount;}
function add(s,to,m,amount,p){if(to==='terrain')for(const q of p)setVoxel(s,q,m);else{const c=s.containers[to];check(room(s,to,m)>=amount,'積載量を超えています。');c.materialId=m;c.amount+=amount;}}
function remove(s,from,m,amount,p){if(from==='terrain')for(const q of p){check(soilVoxel(s,q)===m,'掘る場所の土が一致しません。');setVoxel(s,q,null);}else{const c=s.containers[from];check(c.materialId===m&&c.amount>=amount,'移動元の土が足りません。');c.amount-=amount;if(!c.amount)c.materialId=null;}}
function apply(s,c){
 check(s.revision<Number.MAX_SAFE_INTEGER-2&&s.journal.length<SOIL_LIMITS.history,'作業履歴が上限です。土を保持して止めます。');
 check(id(c.id)&&integer(c.expectedRevision)&&c.expectedRevision===s.revision,'別の作業で更新されています。保存を読み直してください。');
 if(c.type==='reserve'||c.type==='reserve-loose'){
  const loose=c.type==='reserve-loose';keys(c,['type','id','expectedRevision','transferId','from','to','materialId','amount','positions',...(loose?['looseId']:[])]);check(!s.pending,'進行中の土の移送を終えてください。');check(id(c.transferId)&&!s.journal.some(q=>['reserve','reserve-loose'].includes(q.type)&&q.transferId===c.transferId),'移送番号が重複しています。');
  if(loose){check(s.schema===2&&c.from==='loose'&&id(c.looseId)&&owners.includes(c.to),'盛土は現行の引継ぎから容器へ回収してください。');loosePositions(c.positions,c.amount);}
  else owner(c.from);owner(c.to);material(s,c.materialId);check(c.from!==c.to&&integer(c.amount,1,SOIL_LIMITS.transfer),'移動先または量が不正です。');
  const touches=c.from==='terrain'||c.to==='terrain';if(touches)positions(c.positions,c.amount);else if(!loose)check(Array.isArray(c.positions)&&!c.positions.length,'不要な地形の編集指定です。');
  // Clip to space at the destination, retaining the remainder at the source.
  if(loose)for(const p of c.positions)check(soilLooseVoxel(s,c.looseId,p)===c.materialId,'回収する盛土がありません。');
  const available=(c.from==='terrain'||loose)?c.amount:(s.containers[c.from].materialId===c.materialId?s.containers[c.from].amount:0),amount=Math.min(c.amount,available,room(s,c.to,c.materialId));check(amount>0,'土がないか、移動先がいっぱいです。');
  const p=(touches||loose)?copy(c.positions.slice(0,amount)):[];
  if(c.to==='terrain')for(const q of p){const a=address(q),b=s.blocks[a.key];check(!soilVoxel(s,q)&&(!b||b.materialId===c.materialId),'置く場所が塞がっています。');}
  if(loose)changeLoose(s,c.looseId,p,c.materialId,false);else remove(s,c.from,c.materialId,amount,c.from==='terrain'?p:[]);
  s.pending={id:c.transferId,phase:'reserved',from:c.from,to:c.to,materialId:c.materialId,amount,positions:p,...(loose?{looseId:c.looseId}:{})};
 }else{
  const land=c.type==='land';keys(c,land?['type','id','expectedRevision','transferId','positions']:['type','id','expectedRevision','transferId']);
  const p=s.pending;check(p&&c.transferId===p.id,'移送途中の土が見つかりません。');
  if(c.type==='release'){check(p.phase==='reserved','すでに土を放しています。');p.phase='in-flight';}
  else if(c.type==='complete'){check(p.phase==='in-flight','放した土だけを受け取れます。');add(s,p.to,p.materialId,p.amount,p.to==='terrain'?p.positions:[]);s.pending=null;}
  else if(c.type==='cancel'){check(p.phase==='reserved','放した土は元へ戻せません。落ちた地面へ残してください。');if(p.from==='loose')changeLoose(s,p.looseId,p.positions,p.materialId,true);else add(s,p.from,p.materialId,p.amount,p.from==='terrain'?p.positions:[]);s.pending=null;}
  else if(land){check(p.phase==='in-flight','落下途中の土だけを地面へ残せます。');positions(c.positions,p.amount);add(s,'terrain',p.materialId,p.amount,c.positions);s.pending=null;}
  else throw Error('土の移送：未対応の操作です。');
 }
 s.revision++;s.journal.push(copy(c));return s;
}
function projection(s){return{revision:s.revision,blocks:s.blocks,...(s.schema===2?{loose:s.loose}:{}),containers:s.containers,pending:s.pending};}
export function soilTransportTotals(s){const result=Object.fromEntries(s.site.materials.map(m=>[m,{terrain:0,shovel:0,bucket:0,dump:0,storage:0,inFlight:0,total:0}]));
 if(s.schema===2){for(const r of Object.values(result))r.loose=0;for(const b of Object.values(s.loose))result[b.materialId].loose+=count(mask(b.mask));}
 for(const b of Object.values(s.blocks))result[b.materialId].terrain+=count(mask(b.mask));
 for(const [k,c]of Object.entries(s.containers))if(c.amount)result[c.materialId][k]+=c.amount;
 if(s.pending)result[s.pending.materialId].inFlight=s.pending.amount;
 for(const r of Object.values(result))r.total=r.terrain+(r.loose??0)+r.shovel+r.bucket+r.dump+r.storage+r.inFlight;return result;
}
export function validateSoilTransport(s){
 json(s);keys(s,['format','schema','scope','site','initial','revision','blocks','containers','pending','journal',...(s.schema===2?['loose']:[])]);check((s.format===SOIL_TRANSPORT_FORMAT&&s.schema===1&&s.scope===SOIL_TRANSPORT_SCOPE)||(s.format===SOIL_NATIVE_TRANSPORT_FORMAT&&s.schema===2&&s.scope===SOIL_NATIVE_TRANSPORT_SCOPE),'旧掘削や通常保存はこの形式で読めません。');
 check(integer(s.revision)&&Array.isArray(s.journal)&&s.journal.length<=SOIL_LIMITS.history&&s.revision===s.journal.length,'保存番号と履歴が一致しません。');
 const replay=seedFor(s),initial=soilTransportTotals(replay),seen=new Set();for(const c of s.journal){check(object(c)&&id(c.id)&&!seen.has(c.id),'操作番号が重複しています。');seen.add(c.id);apply(replay,c);}
 check(canonical(projection(replay))===canonical(projection(s)),'地形・積荷・途中の土と移送履歴が一致しません。');
 const totals=soilTransportTotals(replay);for(const m of s.site.materials)check(totals[m].total===initial[m].total,'土の体積が一致しません。');
 check(new TextEncoder().encode(canonical(s)).length<=SOIL_LIMITS.bytes,'保存内容が大きすぎます。');return s;
}
export function soilTransportCommand(s,c){validateSoilTransport(s);json(c);const existing=s.journal.find(q=>q.id===c.id);if(existing){check(canonical(existing)===canonical(c),'同じ操作番号の内容が変わっています。');return s;}const n=apply(copy(s),c);return validateSoilTransport(n);}
export function validateSoilTransportContinuation(old,next){validateSoilTransport(old);validateSoilTransport(next);check(old.scope===next.scope&&old.format===next.format&&old.schema===next.schema&&canonical(old.site)===canonical(next.site)&&canonical(old.initial)===canonical(next.initial),'別の現場・初期地形へ切り替えられません。');check(next.journal.length>=old.journal.length&&old.journal.every((c,i)=>canonical(c)===canonical(next.journal[i])),'古い所有状態・一部だけの復元では土を複製するため戻せません。');return next;}
function checksum(t){let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(16).padStart(8,'0');}
export function packSoilTransport(s){validateSoilTransport(s);return JSON.stringify({kind:s.format,version:s.schema,checksum:checksum(canonical(s)),state:s});}
export function unpackSoilTransport(text){check(typeof text==='string'&&new TextEncoder().encode(text).length<=SOIL_LIMITS.bytes+1024,'保存の大きさが不正です。');let p;try{p=JSON.parse(text);}catch{throw Error('土の移送：保存ファイルを読み取れません。');}keys(p,['kind','version','checksum','state']);check(p.kind===p.state?.format&&p.version===p.state?.schema&&p.checksum===checksum(canonical(p.state)),'保存形式・チェックサムが一致しません。');return validateSoilTransport(p.state);}
// Render only edited cells at 2-unit resolution. Unedited cells stay a single
// 8-unit cube; do not expand all 64 sub-cells of untouched terrain every frame.
export function soilTransportGeometry(s){const boxes=[];for(const[k,b]of Object.entries(s.blocks)){const cell=k.split(',').map(Number);if(b.mask===FULL){boxes.push({position:cell.map(n=>n*8+4),size:8,materialId:b.materialId});continue;}const bits=mask(b.mask);for(let i=0;i<64;i++)if(bits&(1n<<BigInt(i))){const p=[i%4,Math.floor(i/4)%4,Math.floor(i/16)];boxes.push({position:p.map((n,j)=>cell[j]*8+n*2+1),size:2,materialId:b.materialId});}}
 for(const b of Object.values(s.loose??{})){if(b.mask===FULL){boxes.push({position:[...b.position],size:8,materialId:b.materialId});continue;}const bits=mask(b.mask);for(let i=0;i<64;i++)if(bits&(1n<<BigInt(i))){const p=[i%4,Math.floor(i/4)%4,Math.floor(i/16)];boxes.push({position:p.map((n,j)=>b.position[j]-4+n*2+1),size:2,materialId:b.materialId});}}return boxes;}
