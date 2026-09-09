// Stage 5-1: bounded finite-volume experiment. No world inventory or vehicle save.
export const WATER={cell:12,nx:18,ny:9,nz:13,capacity:32,total:768,litersPerUnit:.25,flux:8,dt:.1};
export const DIRECTIONS=[{name:'右',v:[1,0,0]},{name:'左',v:[-1,0,0]},{name:'上',v:[0,1,0]},{name:'下',v:[0,-1,0]},{name:'奥',v:[0,0,-1]},{name:'手前',v:[0,0,1]}];
export const waterKey=(x,y,z)=>`${x},${y},${z}`;
export const waterCoord=k=>k.split(',').map(Number);
const line=(n,f)=>Array.from({length:n},(_,i)=>f(i));
export const WATER_REGIONS=[
  {id:'rise',name:'① 上り水路',cells:line(5,i=>waterKey(3,i+1,6)),dir:4},
  {id:'elbow',name:'② 上の曲がり角',cells:[waterKey(3,6,6)],dir:1},
  {id:'ceiling',name:'③ 天井の水路',cells:line(8,i=>waterKey(i+4,6,6)),dir:1},
  {id:'fall',name:'④ 下り水路',cells:line(5,i=>waterKey(12,i+2,6)),dir:8},
  {id:'split',name:'⑤ 分かれ道',cells:[waterKey(12,1,6)],dir:48},
  {id:'front',name:'⑥ 手前の水路',cells:line(4,i=>waterKey(12,1,i+7)),dir:32},
  {id:'back',name:'⑦ 奥の水路',cells:line(4,i=>waterKey(12,1,i+2)),dir:16}
];
export const WATER_REGION_AT=new Map(WATER_REGIONS.flatMap(r=>r.cells.map(k=>[k,r.id])));
export const WATER_SOURCE='3,1,6',WATER_OUTLETS=new Set(['12,1,1','12,1,11']);
const solids=new Set();
for(let x=0;x<WATER.nx;x++)for(let z=0;z<WATER.nz;z++)solids.add(waterKey(x,0,z));
for(let x=3;x<=12;x++){solids.add(waterKey(x,6,5));solids.add(waterKey(x,6,7));if(x>3&&x<12)solids.add(waterKey(x,5,6));}
for(let y=1;y<=5;y++)for(const x of[2,4])solids.add(waterKey(x,y,6));
for(let y=2;y<=5;y++)for(const x of[11,13])solids.add(waterKey(x,y,6));
for(let z=1;z<=11;z++)for(const x of[11,13])solids.add(waterKey(x,1,z));
export const WATER_SOLIDS=solids;
const inside=([x,y,z])=>x>=0&&x<WATER.nx&&y>=0&&y<WATER.ny&&z>=0&&z<WATER.nz;
const clone=s=>structuredClone(s);
export function initialWater(){return{schemaVersion:1,scope:'mars-water-development-v1',revision:0,tick:0,phase:0,running:false,feeding:false,gate:false,reservoir:WATER.total,cells:{},directions:Object.fromEntries(WATER_REGIONS.map(r=>[r.id,r.dir])),recovered:0,message:'「注水を始める」で、火星水が上へ流れます。水路を選んで向きを変えてみてください。'};}
export function waterTotal(s){return s.reservoir+Object.values(s.cells).reduce((n,c)=>n+c.q,0);}
export function waterDirection(s,k){return WATER_REGION_AT.has(k)?s.directions[WATER_REGION_AT.get(k)]:(s.cells[k]?.dir??8);}
export const directionName=mask=>DIRECTIONS.filter((_,i)=>mask&(1<<i)).map(d=>d.name).join('＋')||'停止';
export function waterEdgeBlocked(s,a,b,extraSolids,solids=WATER_SOLIDS){return solids.has(b)||extraSolids?.has(b)||(s.gate&&((a==='7,6,6'&&b==='8,6,6')||(a==='8,6,6'&&b==='7,6,6')))||waterCoord(b)[1]<0;}
export function waterAction(state,action,{region,dir}={}){
  const s=clone(state);
  if(action==='feed'){s.feeding=!s.feeding;if(s.feeding)s.running=true;s.message=s.feeding?'貯水槽から注水中。水の総量は192 Lのままです。':'注水を止めました。水路にある水は流れ続けます。';}
  else if(action==='pause'){s.running=!s.running;s.message=s.running?'流れを再開しました。':'流れを止めました。向きをゆっくり変更できます。';}
  else if(action==='direction'){
    const r=WATER_REGIONS.find(r=>r.id===region);if(!r||![0,1,2,4,8,16,32,48].includes(dir))throw Error('水路と方向を選んでください。');
    s.directions[region]=dir;for(const k of r.cells)if(s.cells[k])s.cells[k].dir=dir;
    s.message=`${r.name}の水を「${directionName(dir)}」へ向けました。矢印の向きが実際の流れです。`;
  }else if(action==='gate'){s.gate=!s.gate;s.message=s.gate?'天井水路の仕切りを閉じました。手前に水が溜まります。':'仕切りを開きました。溜まった水が再び流れます。';}
  else if(action==='recover'){s.reservoir=waterTotal(s);s.cells={};s.feeding=false;s.running=false;s.phase=0;s.message='水路の水を同じ量だけ貯水槽へ回収しました。192 Lすべて再利用できます。';}
  else if(action==='route'){s.directions=Object.fromEntries(WATER_REGIONS.map(r=>[r.id,r.dir]));s.gate=false;s.message='矢印を基本の上昇→横流れ→下降→分岐へ戻しました。水量・水の位置はそのままです。';}
  else throw Error('不明な水操作です。');
  s.revision++;return s;
}
export function tickWater(state,{extraSolids,solids=WATER_SOLIDS}={}){
  if(!state.running)return state;
  const s=clone(state);s.tick++;
  if(s.feeding){const amount=Math.min(WATER.flux,s.reservoir,WATER.capacity-(s.cells[WATER_SOURCE]?.q||0));if(amount){s.reservoir-=amount;const c=s.cells[WATER_SOURCE]||{q:0,dir:s.directions.rise};s.cells[WATER_SOURCE]={q:c.q+amount,dir:s.directions.rise};}}
  // All requests see the same starting occupancy. New arrivals cannot move a
  // second cell in this tick; competing branches share capacity in rotated order.
  const requests=[],old=s.cells,available=new Map(),out=new Map(),incoming=new Map();
  for(const k of Object.keys(old).sort()){
    const c=old[k],mask=waterDirection(s,k),dirs=DIRECTIONS.map((d,i)=>({d,i})).filter(({i})=>mask&(1<<i));if(!dirs.length)continue;
    const [x,y,z]=waterCoord(k),budget=Math.min(WATER.flux,c.q);
    for(let n=0;n<budget;n++){
      const {d,i}=dirs[(n+s.tick)%dirs.length],to=waterKey(x+d.v[0],y+d.v[1],z+d.v[2]);
      if(waterEdgeBlocked(s,k,to,extraSolids,solids))continue;
      requests.push({from:k,to,dir:1<<i,recover:!inside(waterCoord(to))||WATER_OUTLETS.has(to)});
    }
  }
  const offset=requests.length?s.tick%requests.length:0;
  for(let n=0;n<requests.length;n++){
    const r=requests[(n+offset)%requests.length];
    if(!r.recover){if(!available.has(r.to))available.set(r.to,WATER.capacity-(old[r.to]?.q||0));if(available.get(r.to)<1)continue;available.set(r.to,available.get(r.to)-1);}
    out.set(r.from,(out.get(r.from)||0)+1);
    if(r.recover){s.reservoir++;s.recovered++;}
    else{const entry=incoming.get(r.to)||{q:0,v:[0,0,0]};entry.q++;const d=DIRECTIONS[Math.log2(r.dir)].v;entry.v=entry.v.map((v,i)=>v+d[i]);incoming.set(r.to,entry);}
  }
  const next={};
  for(const k of new Set([...Object.keys(old),...incoming.keys()])){
    const remain=(old[k]?.q||0)-(out.get(k)||0),add=incoming.get(k),q=remain+(add?.q||0);if(!q)continue;
    let dir=waterDirection(s,k);
    if(!WATER_REGION_AT.has(k)&&add){const v=[...add.v];DIRECTIONS.forEach((d,i)=>{if(dir&(1<<i))d.v.forEach((a,j)=>v[j]+=a*remain);});dir=0;for(let axis=0;axis<3;axis++)if(v[axis]){const index=DIRECTIONS.findIndex(d=>d.v[axis]===Math.sign(v[axis]));dir|=1<<index;}}
    next[k]={q,dir};
  }
  s.cells=next;s.revision++;return s;
}
export function advanceWater(s,dt,options={}){
  if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error('水の更新刻みが不正です。');if(!s.running||!dt)return s;
  s={...s,phase:s.phase+dt};while(s.phase>=WATER.dt-1e-9){s={...s,phase:Math.max(0,s.phase-WATER.dt)};s=tickWater(s,options);}return s;
}
export function validateWater(s){
  if(s?.schemaVersion!==1||s.scope!=='mars-water-development-v1'||!Number.isSafeInteger(s.revision)||s.revision<0||!Number.isSafeInteger(s.tick)||s.tick<0||!Number.isFinite(s.phase)||s.phase<0||s.phase>=WATER.dt+1e-9)throw Error('火星水の保存形式が不正です。');
  for(const key of['running','feeding','gate'])if(typeof s[key]!=='boolean')throw Error('水の操作状態が不正です。');
  if(!Number.isSafeInteger(s.reservoir)||s.reservoir<0||s.reservoir>WATER.total||!Number.isSafeInteger(s.recovered)||s.recovered<0||!s.cells||Array.isArray(s.cells)||Object.keys(s.cells).length>WATER.total)throw Error('水量の保存状態が不正です。');
  for(const [k,c] of Object.entries(s.cells)){if(!/^\d+,\d+,\d+$/.test(k)||waterCoord(k).join(',')!==k||!inside(waterCoord(k))||WATER_SOLIDS.has(k)||WATER_OUTLETS.has(k)||!Number.isInteger(c?.q)||c.q<1||c.q>WATER.capacity||!Number.isInteger(c.dir)||c.dir<0||c.dir>63)throw Error('水の位置・量・向きが不正です。');}
  if(!s.directions||Object.keys(s.directions).length!==WATER_REGIONS.length||WATER_REGIONS.some(r=>![0,1,2,4,8,16,32,48].includes(s.directions[r.id])))throw Error('水路の矢印が不正です。');
  if(waterTotal(s)!==WATER.total)throw Error('水の総量が一致しません。上書きせず停止します。');
  if(typeof s.message!=='string'||s.message.length>500)throw Error('表示状態が不正です。');return s;
}
const checksum=text=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return(n>>>0).toString(16);};
export function packWater(s){validateWater(s);const payload=JSON.stringify(s);return{kind:'mars-water-development-v1',payload,checksum:checksum(payload)};}
export function unpackWater(p){if(p?.kind!=='mars-water-development-v1'||typeof p.payload!=='string'||p.checksum!==checksum(p.payload))throw Error('火星水の保存が壊れています。上書きせず停止しました。');return validateWater(JSON.parse(p.payload));}
