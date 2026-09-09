// 8-3b1: purchased Mars-soil COPY. No loan ledger, wallet mutation, or main-world hooks.
import {readPurchasedSource} from './imasora-construction-purchased-water.js';
import {fingerprint} from './imasora-world-purchase-ledger.js';
import {initialLoaderState,stepLoader,actLoader,localToWorld,walkingClear,vehicleBlocker,polygon,polygonsOverlap,SITE,OBSTACLES,SAFE_ZONE,WALKER} from './imasora-construction-loader-physics.js';
import {SOIL_BODY} from './imasora-construction-mars-soil.js';
export const SOIL_COPY_SCOPE='construction-purchased-soil-copy-v1';
export const SOIL_RECEIVER=Object.freeze({x:0,z:-80});
export const SOIL_BATCH=4, PATCH_SIZE=32, PATCH_HEIGHT=2, SOIL_STEP=1/120;
// Four blocks: 4*(8^3) = 32*32*2. Spreading changes shape, not volume.
export const SOIL_SITE_SOLIDS=Object.freeze([
  ...OBSTACLES.map(o=>({id:o.id,minX:o.x-o.width/2,maxX:o.x+o.width/2,minZ:o.z-o.depth/2,maxZ:o.z+o.depth/2,minY:0,maxY:o.height})),
  {id:'資材容器',minX:58,maxX:78,minZ:-66,maxZ:-42,minY:0,maxY:20},
  {id:'試し跳びの屋根',minX:-195,maxX:-115,minZ:150,maxZ:210,minY:42,maxY:48},
  ...[[-193,152],[-117,152],[-193,208],[-117,208]].map(([x,z])=>({id:'屋根の柱',minX:x-2,maxX:x+2,minZ:z-2,maxZ:z+2,minY:0,maxY:42}))
].map(Object.freeze));
const boxes=SOIL_SITE_SOLIDS.map(b=>({id:b.id,x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2,width:b.maxX-b.minX,depth:b.maxZ-b.minZ,height:b.maxY}));
const eps=1e-7,clone=structuredClone,ok=(b,m)=>{if(!b)throw Error(m);},fin=Number.isFinite;
const int=n=>Number.isSafeInteger(n)&&n>=0,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const exact=(v,ks)=>ok(v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===[...ks].sort().join('|'),'土の保存項目が不正です。');
const horiz=(p,b,r=WALKER.radius)=>p.x+r>b.minX+eps&&p.x-r<b.maxX-eps&&p.z+r>b.minZ+eps&&p.z-r<b.maxZ-eps;
const overlap=(p,b)=>horiz(p,b)&&p.y<b.maxY-eps&&p.y+WALKER.height>b.minY+eps;
export const patchBox=p=>({id:'敷いた火星土',minX:p.x-16,maxX:p.x+16,minZ:p.z-16,maxZ:p.z+16,minY:0,maxY:2});
const surfaces=s=>[...SOIL_SITE_SOLIDS,...s.patches.map(patchBox)];
const within=p=>p.x>=SITE.minX+WALKER.radius-eps&&p.x<=SITE.maxX-WALKER.radius+eps&&p.z>=SITE.minZ+WALKER.radius-eps&&p.z<=SITE.maxZ-WALKER.radius+eps&&p.y>=-eps;
function bodyClear(s,p){return within(p)&&!surfaces(s).some(b=>overlap(p,b))&&(p.y>=55||walkingClear(p,s.loader.vehicle,[]));}
function initial(source){return{schema:1,scope:SOIL_COPY_SCOPE,source,revision:0,time:0,phase:0,paused:false,stock:source.total,load:0,patches:[],task:null,nextId:1,operations:[],loader:initialLoaderState(),body:{vy:0,grounded:true,flight:null,jumpHeld:false,normal:null,mars:null},message:'運転席に乗り、受付で土を4ブロック分積み込もう。'};}
export function initialPurchasedSoil(packet,kind){const meta=readPurchasedSource(packet,kind);ok(meta.inventory['mars-soil']%1000===0,'土の購入量がブロック単位ではありません。');const s=initial({mode:'copy',kind,packet,...meta,total:meta.inventory['mars-soil']/1000});validatePurchasedSoil(s);return s;}
export function initialWorldSoilPhysics(total=0){const s=initial({mode:'world',total});s.paused=true;s.message='受取済みの火星土をローダーで4ブロックずつ使えます。';validatePurchasedSoil(s);return s;}
export function initialSoilPractice(){const s=initial({mode:'practice',total:8});s.message='保存しない操作体験：貸出8ブロック。本体・購入品には入りません。';return s;}
export function soilCopyTotals(s){const moving=s.task?4:0,ground=s.patches.length*4;return{stock:s.stock,bucket:s.load,ground,moving,total:s.stock+s.load+ground+moving,purchased:s.source.total};}
function target(s){const p=localToWorld(s.loader.vehicle,0,64);return{x:Math.round(p.x/32)*32||0,z:Math.round(p.z/32)*32||0};}
function patchAllowed(s,p,placement=true){
  if(!fin(p.x)||!fin(p.z)||p.x%32||p.z%32||Math.abs(p.x)>288||Math.abs(p.z)>208)return false;
  const b=patchBox(p),poly=polygon({...p,heading:0},32,32),v=s.loader.vehicle;
  if(placement&&polygonsOverlap(poly,polygon(v,70,90)))return false;
  if(s.patches.some(q=>Math.abs(q.x-p.x)<32&&Math.abs(q.z-p.z)<32))return false;
  if([...boxes,SAFE_ZONE].some(o=>polygonsOverlap(poly,polygon({...o,heading:0},o.width,o.depth))))return false;
  if(!placement)return true;
  // Keep the complete discharge corridor clear; no pouring through a wall.
  const from=localToWorld(v,0,39),swept={minX:Math.min(from.x-20,b.minX),maxX:Math.max(from.x+20,b.maxX),minZ:Math.min(from.z-6,b.minZ),maxZ:Math.max(from.z+6,b.maxZ)};
  return !SOIL_SITE_SOLIDS.some(o=>swept.maxX>o.minX&&swept.minX<o.maxX&&swept.maxZ>o.minZ&&swept.minZ<o.maxZ);
}
export function soilCopyOptions(s){const v=s.loader.vehicle,p=target(s),ready=!s.paused&&!s.task&&s.loader.mode==='driving'&&Math.abs(v.speed)<.01;
  const near=Math.hypot(v.x-SOIL_RECEIVER.x,v.z-SOIL_RECEIVER.z)<32;
  const q=s.patches.filter(q=>Math.hypot(q.x-p.x,q.z-p.z)<20).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
  return{ready,near,target:p,load:ready&&near&&s.stock>=4&&s.load===0,store:ready&&near&&s.load===4,lay:ready&&s.load===4&&s.patches.length<64&&patchAllowed(s,p),recover:ready&&s.load===0&&!!q&&patchAllowed({...s,patches:s.patches.filter(p=>p!==q)},q),recoverId:q?.id??null};
}
export function soilTransferVisual(s){
  const t=s.task;if(!t)return{bucket:s.load*8,tiles:[]};
  const f=t.elapsed/2,u=clamp((f-.18)/.65,0,1),ease=Math.sin(Math.PI*f),out=['lay','store'].includes(t.kind),tiles=[];
  for(let i=0;i<4;i++){
    const ox=(i%2?1:-1)*8,oz=(i<2?1:-1)*8,bp=localToWorld(s.loader.vehicle,ox,39+oz*.4),bucket={...bp,y:14+ease*9};
    const other=t.patch?{x:t.patch.x+ox,y:1,z:t.patch.z+oz}:{x:68+ox*.5,y:24,z:-54+oz*.5};
    const from=out?bucket:other,to=out?other:bucket,flat=t.kind==='lay'?clamp((u-.8)/.2,0,1):t.kind==='recover'?1-clamp(u/.2,0,1):0,w=8+8*flat;
    if(f>=.18||t.kind==='recover')tiles.push({x:from.x+(to.x-from.x)*u,y:from.y+(to.y-from.y)*u+Math.sin(Math.PI*u)*10,z:from.z+(to.z-from.z)*u,width:w,height:512/(w*w),depth:w});
  }
  return{bucket:out&&f<.18?32:0,tiles};
}
export function soilCopySurface(s,p=s.loader.player){
  const sn=Math.sin(p.heading),cs=Math.cos(p.heading);
  for(const [x,z] of[[-5.4936,.4176],[5.4936,3.7008]]){const fx=p.x+x*cs+z*sn,fz=p.z-x*sn+z*cs;
    if(Math.abs(p.y-2)<.002&&s.patches.some(q=>Math.abs(fx-q.x)<=16&&Math.abs(fz-q.z)<=16))return'mars';}
  return'normal';
}
function jump(s){const p=s.loader.player,b=s.body;if(s.paused||s.task||s.loader.mode!=='foot'||!b.grounded)return;
  const kind=soilCopySurface(s),boost=kind==='mars'?3:1;b.vy=SOIL_BODY.jump*Math.sqrt(boost);b.grounded=false;b.flight={kind,from:p.y,peak:0,hit:false};s.message=boost===3?'敷いた火星土からジャンプ！到達高は通常の3倍。':'普通の地面からジャンプ。';s.revision++;
}
export function purchasedSoilAction(s,action,id){validatePurchasedSoil(s);
  if(action==='pause'){return{...s,paused:!s.paused,revision:s.revision+1};}
  ok(!s.paused,'再開してから操作してください。');
  if(['load','store','lay','recover'].includes(action)){
    ok(typeof id==='string'&&/^[\w-]{8,96}$/.test(id),'作業番号が不正です。');const prev=s.operations.find(o=>o.id===id);if(prev){ok(prev.kind===action,'同じ番号で違う作業はできません。');return s;}
    const a=soilCopyOptions(s);ok(a[action],'停車・積載量・作業範囲を確認してください。');ok(s.operations.length<2000,'作業履歴が上限です。');
    const n=clone(s);let patch=null;if(action==='load')n.stock-=4;if(action==='store'||action==='lay')n.load-=4;
    if(action==='lay')patch={id:n.nextId++,x:a.target.x,z:a.target.z};
    if(action==='recover'){patch=n.patches.find(p=>p.id===a.recoverId);n.patches=n.patches.filter(p=>p!==patch);}
    n.operations.push({id,kind:action});n.task={id,kind:action,elapsed:0,duration:2,patch};n.revision++;
    n.message={load:'資材容器から4ブロック分を積み込んでいます。',store:'バケットの土を容器へ戻しています。',lay:'アームを動かし、土を薄く敷き広げています。',recover:'敷いた土をバケットへ回収しています。'}[action];validatePurchasedSoil(n);return n;
  }
  ok(!s.task,'機械の作業中です。次の操作は予約しません。');
  const n=clone(s);if(action==='jump')jump(n);
  else if(action==='interact'||action==='home'){
    ok(action==='home'||(s.body.grounded&&Math.abs(s.loader.player.y)<.01)||s.loader.mode==='driving','地面に着地してから乗ってください。');
    n.loader=actLoader(s.loader,action,[...boxes,...s.patches.map(p=>({id:'敷いた土',x:p.x,z:p.z,width:32,depth:32,height:2}))]);
    n.body={...n.body,vy:0,grounded:true,flight:null,jumpHeld:false};n.message=n.loader.message;n.revision++;
  }else throw Error('未対応の土作業です。');
  validatePurchasedSoil(n);return n;
}
function moveVertical(s,p,dy){let d=dy,hit='';if(dy<0&&p.y+dy<=0){d=-p.y;hit='地面';}
  for(const b of surfaces(s)){if(!horiz(p,b))continue;
    if(dy>0&&p.y+WALKER.height<=b.minY+eps&&b.minY-p.y-WALKER.height<=d+eps){d=Math.max(0,b.minY-p.y-WALKER.height);hit=b.id;}
    if(dy<0&&p.y>=b.maxY-eps&&b.maxY-p.y>=d-eps){d=Math.min(0,b.maxY-p.y);hit=b.id;}}
  p.y+=d;return hit;
}
function supported(s,p){return !!moveVertical(s,{...p},-.001);}
function stepWalker(s,input,dt){const p=s.loader.player,b=s.body;b.grounded=b.vy<=0&&supported(s,p);if(input.jump&&!b.jumpHeld)jump(s);b.jumpHeld=!!input.jump;
  const x=fin(input.x)?clamp(input.x,-1,1):0,z=fin(input.z)?clamp(input.z,-1,1):0,len=Math.max(1,Math.hypot(x,z));
  for(const axis of['x','z']){const delta=(axis==='x'?x:z)/len*48*dt,q={...p,[axis]:p[axis]+delta};if(bodyClear(s,q))p[axis]=q[axis];
    else if(b.grounded){const rise=Math.max(0,...surfaces(s).filter(o=>overlap(q,o)).map(o=>o.maxY-p.y));if(rise>0&&rise<=7&&bodyClear(s,{...q,y:p.y+rise})){p[axis]=q[axis];p.y+=rise;}}}
  b.grounded=b.vy<=0&&supported(s,p);if(!b.grounded){let left=dt;while(left>1e-10){const h=b.vy>0&&b.vy/SOIL_BODY.gravity<left?b.vy/SOIL_BODY.gravity:left;
    const dy=b.vy*h-SOIL_BODY.gravity*h*h/2,hit=moveVertical(s,p,dy);b.vy-=SOIL_BODY.gravity*h;left-=h;if(Math.abs(b.vy)<1e-9)b.vy=0;if(b.flight)b.flight.peak=Math.max(b.flight.peak,p.y-b.flight.from);
    if(hit){b.vy=0;if(dy>0){s.message='頭が屋根に当たりました。';if(b.flight)b.flight.hit=true;}else{b.grounded=true;break;}}}}
  if(x||z)p.heading=Math.atan2(x,z);if(b.flight&&b.grounded){const f=b.flight;b[f.kind]={height:f.peak,hit:f.hit};b.flight=null;s.message=`着地：上昇量 ${f.peak.toFixed(2)}${f.hit?'（頭上で停止）':''}。`;}
}
function tick(s,input){const n={...s,loader:clone(s.loader),body:clone(s.body),time:s.time+SOIL_STEP,revision:s.revision+1};
  if(s.task){n.task={...s.task,elapsed:Math.min(2,s.task.elapsed+SOIL_STEP)};if(n.task.elapsed>=2-eps){if(['load','recover'].includes(s.task.kind))n.load+=4;else if(s.task.kind==='store')n.stock+=4;else n.patches=[...s.patches,s.task.patch];n.message=s.task.kind==='lay'?'敷設完了。後退して降車し、紫の土で跳んでみよう。':'移送完了。4ブロック分の量は変わりません。';n.task=null;}return n;}
  if(s.loader.mode==='foot')stepWalker(n,input,SOIL_STEP);
  else{const previous=s.loader.mode;n.loader=stepLoader(s.loader,input,SOIL_STEP,[...boxes,...s.patches.map(p=>({id:'敷いた土',x:p.x,z:p.z,width:32,depth:32,height:2}))]);if(previous==='exiting'&&n.loader.mode==='foot')n.body.grounded=true;}
  return n;
}
export function advancePurchasedSoil(s,input={},dt){ok(fin(dt)&&dt>=0&&dt<=.1,'更新時間が不正です。');if(s.paused)return s;let n={...s,phase:s.phase+dt};while(n.phase>=SOIL_STEP-1e-9){n={...n,phase:Math.max(0,n.phase-SOIL_STEP)};n=tick(n,input);}if(n.phase<1e-9)n.phase=0;return n;}
export function validatePurchasedSoil(s){
  exact(s,['schema','scope','source','revision','time','phase','paused','stock','load','patches','task','nextId','operations','loader','body','message']);
  ok(s.schema===1&&s.scope===SOIL_COPY_SCOPE&&int(s.revision)&&fin(s.time)&&s.time>=0&&fin(s.phase)&&s.phase>=0&&s.phase<SOIL_STEP+1e-8&&typeof s.paused==='boolean','土の保存版・時間が不正です。');
  if(s.source.mode==='practice'){exact(s.source,['mode','total']);ok(s.source.total===8,'体験用の土量が不正です。');}
  else if(s.source.mode==='world'){exact(s.source,['mode','total']);}
  else{exact(s.source,['mode','kind','packet','inventory','coins','total']);ok(s.source.mode==='copy','素材区分が不正です。');const original=readPurchasedSource(s.source.packet,s.source.kind);ok(fingerprint(original)===fingerprint({inventory:s.source.inventory,coins:s.source.coins})&&s.source.total===original.inventory['mars-soil']/1000,'購入元の素材が一致しません。');}
  ok(int(s.source.total)&&s.source.total<=1000000&&int(s.stock)&&[0,4].includes(s.load)&&int(s.nextId)&&s.nextId>0&&Array.isArray(s.patches)&&s.patches.length<=64,'土量が不正です。');
  const ids=new Set();for(const p of s.patches){exact(p,['id','x','z']);ok(int(p.id)&&p.id>0&&p.id<s.nextId&&!ids.has(p.id),'地面のIDが不正です。');ids.add(p.id);ok(patchAllowed({...s,patches:s.patches.filter(q=>q!==p)},p,false),'地面が重複、または配置不可の位置です。');}
  ok(Array.isArray(s.operations)&&s.operations.length<=2000,'作業記録が不正です。');const ops=new Set();for(const o of s.operations){exact(o,['id','kind']);ok(typeof o.id==='string'&&/^[\w-]{8,96}$/.test(o.id)&&!ops.has(o.id)&&['load','store','lay','recover'].includes(o.kind),'作業番号が重複・不正です。');ops.add(o.id);}
  if(s.task){const t=s.task;exact(t,['id','kind','elapsed','duration','patch']);ok(ops.has(t.id)&&s.operations.at(-1).id===t.id&&s.operations.at(-1).kind===t.kind&&t.duration===2&&fin(t.elapsed)&&t.elapsed>=0&&t.elapsed<2&&s.loader.mode==='driving'&&Math.abs(s.loader.vehicle.speed)<.01,'移送状態が不正です。');
    if(['lay','recover'].includes(t.kind)){exact(t.patch,['id','x','z']);ok(int(t.patch.id)&&t.patch.id>0&&t.patch.id<s.nextId&&!ids.has(t.patch.id)&&patchAllowed(s,t.patch),'移送中の地面が不正です。');}else ok(t.patch===null,'不要な地面が移送に含まれています。');}
  ok(soilCopyTotals(s).total===s.source.total,'保管・車載・移送中・地面の土量が一致しません。');
  const l=s.loader,v=l.vehicle,p=l.player;ok(['foot','driving','boarding','exiting'].includes(l.mode)&&['x','z','heading','speed','steering','wheelTravel'].every(k=>fin(v[k]))&&Math.abs(v.speed)<=100.001&&Math.abs(v.steering)<=.471&&!vehicleBlocker(v,[...boxes,...s.patches.map(q=>({id:'敷いた土',x:q.x,z:q.z,width:32,depth:32,height:2}))]),'車両の位置が不正です。');
  ok(['x','y','z','heading'].every(k=>fin(p[k]))&&p.y<=1200,'身体の座標が不正です。');if(l.mode==='foot')ok(bodyClear(s,p),'身体が床や障害物に入っています。');
  if(l.transition){ok(['boarding','exiting'].includes(l.mode)&&Array.isArray(l.transition.path)&&l.transition.path.length>=6&&l.transition.path.every(q=>['x','y','z','heading'].every(k=>fin(q[k])))&&fin(l.transition.elapsed)&&l.transition.elapsed>=0&&l.transition.elapsed<l.transition.duration,'乗降状態が不正です。');}else ok(!['boarding','exiting'].includes(l.mode),'乗降経路がありません。');
  exact(s.body,['vy','grounded','flight','jumpHeld','normal','mars']);ok(fin(s.body.vy)&&Math.abs(s.body.vy)<1000&&typeof s.body.grounded==='boolean'&&typeof s.body.jumpHeld==='boolean','ジャンプ状態が不正です。');if(s.body.flight){const f=s.body.flight;exact(f,['kind','from','peak','hit']);ok(['normal','mars'].includes(f.kind)&&fin(f.from)&&f.from>=0&&fin(f.peak)&&f.peak>=0&&typeof f.hit==='boolean','跳躍記録が不正です。');}
  for(const kind of['normal','mars'])if(s.body[kind]){exact(s.body[kind],['height','hit']);ok(fin(s.body[kind].height)&&s.body[kind].height>=0&&typeof s.body[kind].hit==='boolean','比較記録が不正です。');}return s;
}
export function packPurchasedSoil(s){validatePurchasedSoil(s);ok(s.source.mode==='copy','操作体験の貸出土は保存・持出できません。');ok(!s.loader.transition,'乗降が完了してから保存してください。');const n=clone(s);n.paused=true;n.loader.vehicle.speed=0;return JSON.stringify({format:SOIL_COPY_SCOPE,checksum:fingerprint(n),state:n});}
export function unpackPurchasedSoil(raw){ok(typeof raw==='string'&&raw.length<24000000,'保存の長さが不正です。');const p=JSON.parse(raw);exact(p,['format','checksum','state']);ok(p.format===SOIL_COPY_SCOPE&&p.checksum===fingerprint(p.state)&&p.state.source.mode==='copy','土の保存区分・整合性が不正です。');return validatePurchasedSoil(p.state);}
