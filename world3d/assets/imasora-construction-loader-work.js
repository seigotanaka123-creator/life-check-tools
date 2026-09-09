// Stage 3-2: a closed 32-unit loan, separate from every existing terrain save.
import {createConstructionState,reduceConstruction,validateConstructionState,canonical,SOIL_UNIT} from './imasora-construction-state.js';
import {initialLoaderState,stepLoader,actLoader,actorPose,localToWorld,worldToLocal,polygon,polygonsOverlap,vehicleBlocker,walkingClear,SITE,OBSTACLES,SAFE_ZONE,approach} from './imasora-construction-loader-physics.js';
export const GRAIN=4, VOLUME=SOIL_UNIT/8, CAPACITY=48, WORK_SCOPE='development-loader-work-v1';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),key=(x,z)=>`${x},${z}`,sum=g=>Object.values(g).reduce((a,b)=>a+b,0),finite=n=>Number.isFinite(n);
export function soilColumns(w){return Object.entries(w.ground).map(([k,n])=>{const [x,z]=k.split(',').map(Number);return{x:(x+.5)*GRAIN,z:(z+.5)*GRAIN,width:GRAIN,depth:GRAIN,height:n*GRAIN,id:'普通の土の山',gx:x,gz:z,n};});}
export function createWorkState(){
  const ledger=reduceConstruction(createConstructionState(1),{type:'transfer',from:'storage',to:'loose',amount:32*SOIL_UNIT},'work-loan',2),ground={};
  const candidates=[];for(let x=-9;x<=8;x++)for(let z=-5;z<=12;z++)for(let y=0;y<8;y++)candidates.push({x,z,y,cost:Math.hypot((x+.5)*4,(z+.5)*4-16)/5+y*1.3});
  candidates.sort((a,b)=>a.cost-b.cost||a.y-b.y||a.z-b.z||a.x-b.x);
  for(const p of candidates.slice(0,256))ground[key(p.x,p.z)]=(ground[key(p.x,p.z)]||0)+1;
  return{schema:1,scope:WORK_SCOPE,ledger,loader:initialLoaderState(),bucket:{lift:0,tilt:0},ground,air:[],load:0,revision:0,sequence:0,soilClock:0,dumpClock:0,message:'低いバケットのまま、正面の土の山へゆっくり前進してみてください。'};
}
export function bucketFrame(vehicle,bucket){
  const a=bucket.lift*.85,s=Math.sin(a),c=Math.cos(a),p=localToWorld(vehicle,0,11+s+20*c);
  return{x:p.x,y:11-c+20*s,z:p.z,heading:vehicle.heading,tilt:bucket.tilt};
}
export function bucketWorldPoint(vehicle,bucket,x,y,z){
  const f=bucketFrame(vehicle,bucket),c=Math.cos(f.tilt),s=Math.sin(f.tilt),p=localToWorld(f,x,y*s+z*c);return{x:p.x,y:f.y+y*c-z*s,z:p.z};
}
export function bucketLocalPoint(vehicle,bucket,p){const f=bucketFrame(vehicle,bucket),q=worldToLocal(f,p.x,p.z),dy=p.y-f.y,c=Math.cos(f.tilt),s=Math.sin(f.tilt);return{x:q.x,y:dy*c+q.z*s,z:-dy*s+q.z*c};}
export function bucketBounds(vehicle,bucket){
  const points=[];for(const x of[-28.5,28.5])for(const y of[-8.5,6])for(const z of[-2,12])points.push(bucketWorldPoint(vehicle,bucket,x,y,z));
  return{minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y)),points};
}
function staticBlocked(x,z,r=2){
  if(x-r<SITE.minX||x+r>SITE.maxX||z-r<SITE.minZ||z+r>SITE.maxZ)return true;
  return[...OBSTACLES,SAFE_ZONE].some(o=>Math.abs(x-o.x)<o.width/2+r&&Math.abs(z-o.z)<o.depth/2+r);
}
function bodyShape(v){return polygon({...localToWorld(v,0,-9),heading:v.heading},68,68);}
function bodyHits(v,columns){const body=bodyShape(v);return columns.some(o=>polygonsOverlap(body,polygon({...o,heading:0},4,4)));}
function landingBlocked(w,x,z){
  if(staticBlocked(x,z,2.1))return true;
  if(polygonsOverlap(bodyShape(w.loader.vehicle),polygon({x,z,heading:0},4.2,4.2)))return true;
  if(w.loader.mode!=='driving'){const p=actorPose(w.loader);if(Math.abs(x-p.x)<18&&Math.abs(z-p.z)<18)return true;}
  return false;
}
function bucketClear(v,b){
  const box=bucketBounds(v,b);if(box.minY<.1)return false;
  if(box.points.some(p=>p.x<SITE.minX||p.x>SITE.maxX||p.z<SITE.minZ||p.z>SITE.maxZ))return false;
  const poly=polygon({...bucketFrame(v,b)},60,28);
  return !OBSTACLES.some(o=>box.minY<o.height&&polygonsOverlap(poly,polygon({...o,heading:0},o.width,o.depth)));
}
function transfer(w,from,to,n){if(n)w.ledger=reduceConstruction(w.ledger,{type:'transfer',from,to,amount:n*VOLUME},`work-${w.ledger.revision+1}`,w.ledger.updatedAt+1);}
function removeGround(w,k){if(--w.ground[k]===0)delete w.ground[k];}
function pocket(p){return Math.abs(p.x)<26&&p.z>-.3&&p.z<13.5&&p.y>-8.5&&p.y<4.2;}
function scoop(w){
  let taken=0;
  for(const o of soilColumns(w).sort((a,b)=>Math.hypot(a.x-w.loader.vehicle.x,a.z-w.loader.vehicle.z)-Math.hypot(b.x-w.loader.vehicle.x,b.z-w.loader.vehicle.z))){
    for(let y=0;y<o.n&&w.load<CAPACITY;y++){
      if(pocket(bucketLocalPoint(w.loader.vehicle,w.bucket,{x:o.x,y:(y+.5)*4,z:o.z}))){removeGround(w,key(o.gx,o.gz));w.load++;taken++;}
    }
  }
  if(taken){transfer(w,'loose','vehicle',taken);w.message=w.load===CAPACITY?'バケットがいっぱいです。後退し、「上げる」と「すくう」で土を抱えて運びましょう。':`土をすくいました。積載 ${(w.load/8).toFixed(2)} / 6。`;}
  return taken;
}
function release(w,count){
  let released=0;
  for(let i=0;i<count&&w.load;i++){
    const f=localToWorld({x:0,z:0,heading:w.loader.vehicle.heading},0,14),vx=f.x+Math.sin(w.loader.vehicle.heading)*w.loader.vehicle.speed*.5,vz=f.z+Math.cos(w.loader.vehicle.heading)*w.loader.vehicle.speed*.5;
    // A blocked corner must not jam every other outlet across the bucket.
    let p=null;
    for(let lane=0;lane<12;lane++){
      const q=bucketWorldPoint(w.loader.vehicle,w.bucket,(((w.sequence+lane)%12)-5.5)*4,-5,13);
      const t=Math.sqrt(Math.max(0,2*(q.y-2)/70)),tx=q.x+vx*t,tz=q.z+vz*t,cx=(Math.floor(tx/4)+.5)*4,cz=(Math.floor(tz/4)+.5)*4;
      if(q.y>=2&&!landingBlocked(w,q.x,q.z)&&!landingBlocked(w,tx,tz)&&!landingBlocked(w,cx,cz)){p=q;break;}
    }
    if(!p){w.message='土を落とす先が塞がっています。地面が空いている方向へ車体を向けてください。';break;}
    w.sequence++;w.air.push({id:w.sequence,x:p.x,y:p.y,z:p.z,vx,vy:0,vz});w.load--;released++;
  }
  transfer(w,'vehicle','loose',released);if(released)w.message=w.load?'土をこぼしています。傾きを戻すと止まります。':'荷下ろしできました。落とした土も、同じようにすくえます。';
}
function fall(w,dt){
  const remain=[];
  for(const old of w.air){
    const p={...old};p.vy-=70*dt;
    let x=p.x+p.vx*dt,z=p.z+p.vz*dt;
    if(landingBlocked(w,x,z)){p.vx*=-.45;p.vz*=-.45;x=p.x;z=p.z;}
    p.x=clamp(x,SITE.minX+3,SITE.maxX-3);p.z=clamp(z,SITE.minZ+3,SITE.maxZ-3);p.y+=p.vy*dt;
    const gx=Math.floor(p.x/4),gz=Math.floor(p.z/4),k=key(gx,gz),surface=(w.ground[k]||0)*4;
    if(p.y-2<=surface&&p.vy<=0&&!landingBlocked(w,(gx+.5)*4,(gz+.5)*4))w.ground[k]=(w.ground[k]||0)+1;
    else{if(p.y<2){p.y=2;p.vy=10;const v=w.loader.vehicle,dx=p.x-v.x,dz=p.z-v.z,n=Math.hypot(dx,dz)||1;p.vx=dx/n*18;p.vz=dz/n*18;}remain.push(p);}
  }w.air=remain;
}
function slump(w){
  let moved=0;
  for(const o of soilColumns(w).sort((a,b)=>b.height-a.height)){
    const neighbours=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>({gx:o.gx+dx,gz:o.gz+dz,n:w.ground[key(o.gx+dx,o.gz+dz)]||0})).sort((a,b)=>a.n-b.n);
    const low=neighbours.find(n=>!landingBlocked(w,(n.gx+.5)*4,(n.gz+.5)*4));
    const n=w.ground[key(o.gx,o.gz)]||0;if(!low||n<=low.n+2)continue;
    removeGround(w,key(o.gx,o.gz));w.sequence++;
    w.air.push({id:w.sequence,x:(low.gx+.5)*4,y:(n-.5)*4,z:(low.gz+.5)*4,vx:0,vy:0,vz:0});
    if(++moved===3)break;
  }
}
export function workAction(w,action){
  const loader=actLoader(w.loader,action,[...OBSTACLES,...soilColumns(w)]);
  return{...w,loader,revision:w.revision+1,message:loader.message};
}
export function stepWork(w,input,dt){
  const next={...w,bucket:{...w.bucket},ground:{...w.ground},air:w.air.map(p=>({...p}))};
  const driving=w.loader.mode==='driving';
  if(driving){
    const candidate={lift:clamp(w.bucket.lift+(Number(!!input.raise)-Number(!!input.lower))*.42*dt,0,1),tilt:clamp(w.bucket.tilt+(Number(!!input.tip)-Number(!!input.curl))*.7*dt,-.42,.95)};
    if(bucketClear(w.loader.vehicle,candidate))next.bucket=candidate;
    else if(input.lower||input.tip)next.message='地面や障害物に当たるため止めました。アームを少し上げてから傾けてください。';
  }
  const motion={...input};if(driving){const near=soilColumns(w).some(o=>{const p=worldToLocal(w.loader.vehicle,o.x,o.z);return p.z>15&&p.z<80&&Math.abs(p.x)<42;});motion.throttle=(input.throttle||0)*(near&&w.bucket.lift<.2?.24:w.load?.72:1);}
  next.loader=stepLoader(w.loader,motion,dt,driving?OBSTACLES:[...OBSTACLES,...soilColumns(w)]);
  next.soilClock+=dt;
  if(driving&&next.bucket.tilt<.2&&(next.loader.vehicle.speed>.1||input.curl))scoop(next);
  const cols=soilColumns(next),moving=next.loader.vehicle;
  const fullAtPile=next.load===CAPACITY&&moving.speed>0&&cols.some(o=>{for(let y=0;y<o.n;y++)if(pocket(bucketLocalPoint(moving,next.bucket,{x:o.x,y:(y+.5)*4,z:o.z})))return true;return false;});
  if(driving&&(bodyHits(moving,cols)||fullAtPile||!bucketClear(moving,next.bucket))){
    next.loader={...next.loader,vehicle:{...w.loader.vehicle,speed:0},hit:'土・作業範囲の接触'};
    next.message=fullAtPile?'バケットがいっぱいです。いったん後退して土を運びましょう。':'車体やバケットが当たるため止まりました。向きやアームの高さを調整してください。';
  }
  if(driving&&input.release!==false&&next.bucket.tilt>.32&&next.load){next.dumpClock+=dt*(12+next.bucket.tilt*28);if(next.dumpClock>=3){const n=Math.floor(next.dumpClock);next.dumpClock-=n;release(next,n);}}
  else next.dumpClock=0;
  fall(next,dt);
  if(next.soilClock>=.12){next.soilClock=0;slump(next);}
  const changed=next.ledger!==w.ledger||next.air.length||w.air.length||canonical(next.ground)!==canonical(w.ground)||next.bucket.lift!==w.bucket.lift||next.bucket.tilt!==w.bucket.tilt||canonical(next.loader)!==canonical(w.loader);
  if(changed)next.revision++;
  return next;
}
export function workTotals(w){return{ground:sum(w.ground)*VOLUME,air:w.air.length*VOLUME,bucket:w.load*VOLUME,total:(sum(w.ground)+w.air.length+w.load)*VOLUME};}
export function validateWork(w){
  const require=(ok,message)=>{if(!ok)throw new Error(message);};
  require(w&&w.schema===1&&w.scope===WORK_SCOPE,'別の開発区分・保存版です。');validateConstructionState(w.ledger);
  require(w.ledger.scope==='development-loan'&&w.ledger.materials['earth-soil'].issued===32000,'貸出土の区分が違います。');
  require(w.ground&&Object.getPrototypeOf(w.ground)===Object.prototype&&Object.keys(w.ground).length<=256,'土の山の保存が不正です。');
  for(const [k,n] of Object.entries(w.ground)){require(/^-?\d+,-?\d+$/.test(k)&&Number.isInteger(n)&&n>0&&n<=256,'土の粒数が不正です。');const [x,z]=k.split(',').map(Number);require(k===key(x,z)&&!staticBlocked((x+.5)*4,(z+.5)*4,2),'土が保護範囲に入っています。');}
  require(Number.isInteger(w.load)&&w.load>=0&&w.load<=CAPACITY&&Array.isArray(w.air)&&w.air.length<=256,'積載・落下中の土が不正です。');
  require(new Set(w.air.map(p=>p.id)).size===w.air.length,'落下する土が重複しています。');
  for(const p of w.air)require([p.x,p.y,p.z,p.vx,p.vy,p.vz].every(finite)&&Math.abs(p.x)<=321&&Math.abs(p.z)<=251&&p.y>=0&&p.y<=1100&&Number.isSafeInteger(p.id)&&p.id>0,'落下中の座標が不正です。');
  const t=workTotals(w),a=w.ledger.materials['earth-soil'].accounts;
  require(t.total===32000&&a.vehicle===t.bucket&&a.loose===t.ground+t.air&&a.storage===0&&a.held===0,'土の形と台帳の量が一致しません。');
  const v=w.loader?.vehicle,p=w.loader?.player;
  require(v&&p&&['foot','driving'].includes(w.loader.mode)&&w.loader.transition===null,'乗降中は保存できません。');
  require(['x','z','heading','speed','steering','wheelTravel'].every(k=>finite(v[k]))&&['x','y','z','heading'].every(k=>finite(p[k]))&&Math.abs(v.speed)<=100&&Math.abs(v.steering)<=.471,'車両・乗員の状態が不正です。');
  require(!vehicleBlocker(v)&&!bodyHits(v,soilColumns(w)),'車体が障害物に重なっています。');
  require(w.loader.mode==='driving'||walkingClear(p,v,[...OBSTACLES,...soilColumns(w)]),'乗員の復帰地点が塞がっています。');
  require(w.bucket&&finite(w.bucket.lift)&&w.bucket.lift>=0&&w.bucket.lift<=1&&finite(w.bucket.tilt)&&w.bucket.tilt>=-.42&&w.bucket.tilt<=.95&&bucketClear(v,w.bucket),'バケット位置が不正です。');
  require(['revision','sequence'].every(k=>Number.isSafeInteger(w[k])&&w[k]>=0)&&w.air.every(p=>p.id<=w.sequence)&&finite(w.soilClock)&&w.soilClock>=0&&w.soilClock<.13&&finite(w.dumpClock)&&w.dumpClock>=0&&w.dumpClock<3,'保存番号が不正です。');return true;
}
function checksum(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(16);}
export function packWork(w){validateWork(w);const state=structuredClone(w);state.loader.vehicle.speed=0;return JSON.stringify({format:WORK_SCOPE,checksum:checksum(canonical(state)),state});}
export function unpackWork(text){if(typeof text!=='string'||text.length>2_000_000)throw new Error('保存の形式が不正です。');const p=JSON.parse(text);if(p.format!==WORK_SCOPE||p.checksum!==checksum(canonical(p.state)))throw new Error('保存データの整合性を確認できません。');validateWork(p.state);return p.state;}
