import {nativeSoilLayers} from './imasora-construction-native-soil-layers.mjs?v=120pv';
import {nativeDeckHeight,nativeDeckGeometry,validateNativeDecks} from './imasora-construction-native-decks.mjs?v=120ps';
import {earthBaseReader,earthPatches,hasContinuousQuarry,hasQuarryRange,quarryRange,quarryRock} from './imasora-construction-field-earth.mjs?v=120ov';
import {transportArea,transportDigProtectedRegions} from './imasora-construction-transport-field.mjs?v=120ov';
import {soilTransportGeometry,SOIL_CAPACITY} from './imasora-construction-soil-transport.mjs?v=120pv';
import {PLOT} from './imasora-construction-excavator.js?v=120ov';
import {SITE} from './imasora-construction-loader-physics.js?v=120ov';

// Native terrain is a 2-unit grid. Inspect every cell touched by the tyre,
// Include steering and the projected shift from tilt/suspension. Five isolated
// sample points can miss a small hole.
// This read model never replays commands or invents/imports practice soil.
const surfaces=new WeakMap(),supports=new WeakMap(),depressions=new WeakMap(),finite=n=>typeof n==='number'&&Number.isFinite(n);
const rad=n=>n*Math.PI/180;
function surface(soil){
 let top=surfaces.get(soil);if(top)return top;top=new Map();
 // Loose fragments are objects, not a continuous ground foundation. Existing
 // body/arm collision checks still protect them. Only placed terrain supports.
 for(const b of soilTransportGeometry({blocks:soil.blocks,loose:{}})){
  const r=b.size/2,h=b.position[1]+r;
  for(let x=Math.floor((b.position[0]-r)/2);x<Math.ceil((b.position[0]+r)/2);x++)for(let z=Math.floor((b.position[2]-r)/2);z<Math.ceil((b.position[2]+r)/2);z++){
   const key=x+','+z;top.set(key,Math.max(top.get(key)??-Infinity,h));
  }
 }
 surfaces.set(soil,top);return top;
}
const heightReaders=new WeakMap();
export function nativeEarthHeightReader(frame){
 const soil=frame?.soil;if(!soil||![2,3].includes(soil.schema))return()=>undefined;
 let entry=heightReaders.get(soil);if(entry&&entry.revision===soil.revision&&entry.decks===frame.decks)return entry.read;
 const area=transportArea(frame),baseAt=earthBaseReader(soil),top=frame.decks?null:surface(soil),layers=frame.decks?nativeSoilLayers(soil):null;
 const read=(x,z,reference=null)=>{
  if(!finite(x)||!finite(z)||x<area.minX||x>=area.maxX||z<area.minZ||z>=area.maxZ)return undefined;
  if(layers)return layers.read(x,z,reference);
  const base=(baseAt.surface??baseAt)(x,z);
  return Math.max(base,top.get(Math.floor(x/2)+','+Math.floor(z/2))??base);
 };
 if(layers?.isEmptyArea&&baseAt.isZeroArea)read.isZeroArea=(minX,maxX,minZ,maxZ)=>
  minX>=area.minX&&maxX<area.maxX&&minZ>=area.minZ&&maxZ<area.maxZ&&
  baseAt.isZeroArea(minX,maxX,minZ,maxZ)&&layers.isEmptyArea(minX,maxX,minZ,maxZ);
 // Every native ground column is a 2-unit cell. Reuse its depression test
 // across successive half-unit drive steps on the same immutable soil.
 read.isPit=(x,z,h)=>isDepression(frame,{x:Math.floor(x/2)*2+1,z:Math.floor(z/2)*2+1,h});
 if(layers&&hasQuarryRange(soil)&&(layers.floating.length===0||hasContinuousQuarry(soil))){
  read.referenceIndependent=layers.floating.length===0;
  const paving=transportDigProtectedRegions(soil),width=192,margin=42;
  if(hasContinuousQuarry(soil)){
   const {bounds,rock}=quarryRange(soil);
   const patches=earthPatches(soil);
   const otherRocks=(quarryRock(soil)?.layers??[]).filter(layer=>layer!==rock);
   const overlaps=(r,left,right,near,far)=>right>=r.minX&&left<=r.maxX&&far>=r.minZ&&near<=r.maxZ;
   const plots=rock.surface?.plots??[],tileChecks=new Map();
   // An untouched deposit has the same visible triangle surface as the rest
   // of the mountain. Only edited or overhanging columns need voxel support.
   function intactTile(i,j){
    const key=i+','+j;
    if(tileChecks.has(key))return tileChecks.get(key);
    let intact=true;
    for(let x=i*16+1;x<(i+1)*16&&intact;x+=2)for(let z=j*16+1;z<(j+1)*16;z+=2){
     const top=rock.surface.stockTop(x,z),col=layers.columnAt(x,z);
     if(top>=0?(!col||col.ground!==top||col.intervals.at(-1)?.[1]!==top):!!col){intact=false;break;}
    }
    tileChecks.set(key,intact);return intact;
   }
   const clear=(left,right,near,far)=>{
    // The last triangle joins ordinary field ground. A wheel sampling across
    // the survey boundary must not switch the whole vehicle to stair physics.
    if(right<bounds.minX-90||left>bounds.maxX+90||far<bounds.minZ-90||near>bounds.maxZ+90||
       paving.some(r=>overlaps(r,left,right,near,far))||
       otherRocks.some(layer=>layer.upperBound(left,right,near,far)>0))return false;
    if(patches.size)for(let i=Math.floor(left/32);i<=Math.floor(right/32);i++)
     for(let j=Math.floor(near/32);j<=Math.floor(far/32);j++)if(patches.has(i+','+j))return false;
    if(!plots.some(r=>overlaps(r,left,right,near,far)))return layers.isEmptyArea(left,right,near,far);
    for(let i=Math.floor(left/16);i<=Math.floor(right/16);i++)for(let j=Math.floor(near/16);j<=Math.floor(far/16);j++)if(!intactTile(i,j))return false;
    return true;
   };
   // Most half-unit wheel steps use the very same patch of immutable ground.
   // Certify all footprints in that tile once. Near a cut use the exact bounds.
   const footprints=new Map();
   read.isNaturalQuarry=(x,z)=>{
    const i=Math.floor(x/32),j=Math.floor(z/32),key=i+','+j;
    let wholeTile=footprints.get(key);
    if(wholeTile===undefined){
     wholeTile=clear(i*32-65,(i+1)*32+65,j*32-65,(j+1)*32+65);
     footprints.set(key,wholeTile);
    }
    return wholeTile||clear(x-65,x+65,z-65,z+65);
   };
   if(rock.surface){
    read.slopeAt=(x,z)=>{
     if(x<area.minX||x>=area.maxX||z<area.minZ||z>=area.maxZ)return NaN;
     return x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ?0:rock.surface.coarse(x,z);
    };
    read.slopeAt.cliffAt=rock.surface.cliffAt??rock.surface.coarse.cliffAt;
   }
  }
  let grid=null,left=0,near=0;
  const samples=(x,z,reference)=>{
   const i=Math.floor(x/2)-left,j=Math.floor(z/2)-near;
   if(i<0||i>=width||j<0||j>=width)return read(x,z,reference);
   const at=j*width+i,value=grid[at];
   if(!Number.isNaN(value))return value;
   return grid[at]=read((i+left)*2+1,(j+near)*2+1,reference);
  };
  samples.isZeroArea=read.isZeroArea;
  samples.isPit=read.isPit;
  read.trackSamples=({x,z})=>{
   // Pad the complete projected chassis. Inside this rectangle native soil
   // is constant across each 2-unit column. Paving edges use exact coordinates.
   if(read.slopeAt&&read.isNaturalQuarry(x,z))return read.slopeAt;
   if(read.slopeAt)return read;
   const minX=x-84,maxX=x+84,minZ=z-84,maxZ=z+84;
   if(minX<area.minX||maxX>=area.maxX||minZ<area.minZ||maxZ>=area.maxZ||
      paving.some(r=>minX<=r.maxX&&maxX>=r.minX&&minZ<=r.maxZ&&maxZ>=r.minZ))return read;
   const i=Math.floor(x/2),j=Math.floor(z/2);
   if(!grid||i-left<margin||i-left>=width-margin||j-near<margin||j-near>=width-margin){
    grid??=new Float64Array(width*width);grid.fill(NaN);
    left=i-width/2;near=j-width/2;
   }
   return samples;
  };
 }
 heightReaders.set(soil,{revision:soil.revision,decks:frame.decks,read});return read;
}
const deckReaders=new WeakMap();
export function nativeDumpHeightReader(frame){
 const earth=nativeEarthHeightReader(frame),decks=frame.decks;
 if(!decks)return earth;
 const prior=deckReaders.get(decks);
 if(prior?.soil===frame.soil)return prior.read;
 const hasDecks=validateNativeDecks(decks).rooms.length>0;
 const read=hasDecks?(x,z,reference=0)=>nativeDeckHeight(frame,x,z,earth(x,z,reference),reference):(x,z,reference=0)=>earth(x,z,reference);
 if(!hasDecks){
  read.referenceIndependent=earth.referenceIndependent;
  read.isZeroArea=earth.isZeroArea;read.isNaturalQuarry=earth.isNaturalQuarry;read.slopeAt=earth.slopeAt;
 }else if(earth.slopeAt){
  // Construction on the other side of the map does not alter these wheels.
  const geometry=nativeDeckGeometry(decks),[ox,oz]=frame.soil.field.origin;
  read.slopeAt=earth.slopeAt;
  read.isNaturalQuarry=(x,z)=>earth.isNaturalQuarry(x,z)&&!geometry.near(x+ox,z+oz,80)
   .some(p=>Math.abs(x+ox-p.x)<=80+p.w/2&&Math.abs(z+oz-p.z)<=80+p.d/2)
   &&!geometry.ramps.some(p=>{
    const a=p.axis==='x'?x+ox:z+oz,b=p.axis==='x'?z+oz:x+ox;
    return a>=Math.min(p.a,p.a+p.length)-80&&a<=Math.max(p.a,p.a+p.length)+80&&Math.abs(b-p.cross)<=80+p.width/2;
   });
  read.trackSamples=v=>read.isNaturalQuarry(v.x,v.z)?read.slopeAt:read;
 }
 read.isPit=(x,z,h)=>Math.abs(earth(x,z)-h)<.15&&earth.isPit?.(x,z,h);
 if(!hasDecks&&earth.trackSamples){
  const physicalSamples=(x,z,reference)=>earthSamples(x,z,reference);
  let earthSamples;
  physicalSamples.isZeroArea=read.isZeroArea;
  physicalSamples.isPit=read.isPit;
  read.trackSamples=vehicle=>{earthSamples=earth.trackSamples(vehicle);return earthSamples===earth?read:earthSamples===earth.slopeAt?earthSamples:physicalSamples;};
 }
 deckReaders.set(decks,{soil:frame.soil,read});
 return read;
}
export function nativeQuarryWorldHeight(frame,x,z){
 const origin=frame?.soil?.field?.origin;
 if(!origin)return undefined;
 const read=nativeDumpHeightReader(frame),px=x-origin[0],pz=z-origin[1];
 return read.isNaturalQuarry?.(px,pz)?read.slopeAt(px,pz):undefined;
}
export function nativeDumpHeightAt(frame,x,z,reference=0){return nativeDumpHeightReader(frame)(x,z,reference);}
const point=(v,x,z)=>({x:v.x+Math.cos(v.heading)*x+Math.sin(v.heading)*z,z:v.z-Math.sin(v.heading)*x+Math.cos(v.heading)*z});
function isDepression(frame,q){
 const owner=frame.decks??frame.soil;let entry=depressions.get(owner);if(!entry||entry.soil!==frame.soil){entry={soil:frame.soil,cache:new Map()};depressions.set(owner,entry);}const cache=entry.cache;
 const key=(frame.version??1)+':'+q.x+','+q.z+','+q.h;if(cache.has(key))return cache.get(key);
 let hole=false;
 for(const [dx,dz] of [[1,0],[0,1]]){
  let lower=false,upper=false;
  for(let distance=2;distance<=24&&!(lower&&upper);distance+=2){
   if(!lower)lower=nativeDumpHeightAt(frame,q.x-dx*distance,q.z-dz*distance,q.h)>q.h+1.99;
   if(!upper)upper=nativeDumpHeightAt(frame,q.x+dx*distance,q.z+dz*distance,q.h)>q.h+1.99;
  }
  if(lower&&upper){hole=true;break;}
 }
 // Terrain is immutable. A changed soil object gets a new diagnosis; moving
 // vehicles may reuse these cell results without keeping an unbounded trail.
 if(cache.size>=8192)cache.delete(cache.keys().next().value);cache.set(key,hole);return hole;
}
function overlapArea(dx,dz,c,s,hx,hz){
 let p=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>[c*(dx+x)-s*(dz+z),s*(dx+x)+c*(dz+z)]);
 for(const [axis,sign,limit]of[[0,1,hx],[0,-1,hx],[1,1,hz],[1,-1,hz]]){const next=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],aa=sign*a[axis]-limit,bb=sign*b[axis]-limit;if(aa<=0)next.push(a);if((aa<=0)!==(bb<=0)){const u=aa/(aa-bb);next.push(a.map((v,k)=>v+(b[k]-v)*u));}}p=next;}
 return Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
}
function visitCells(read,reference,centre,heading,hx,hz,visit){
 const c=Math.cos(heading),s=Math.sin(heading),ac=Math.abs(c),as=Math.abs(s),ex=hx*ac+hz*as,ez=hx*as+hz*ac;
 const right=Math.ceil((centre.x+ex)/2),front=Math.ceil((centre.z+ez)/2),rear=Math.floor((centre.z-ez)/2);
 let count=0;
 for(let x=Math.floor((centre.x-ex)/2);x<right;x++)for(let z=rear;z<front;z++){
  const px=x*2+1,pz=z*2+1,dx=px-centre.x,dz=pz-centre.z;
  // All intersecting grid cells, including a single corner of the tyre.
  if(Math.abs(dx)>=ex+1-1e-9||Math.abs(dz)>=ez+1-1e-9||Math.abs(c*dx-s*dz)>=hx+ac+as-1e-9||Math.abs(s*dx+c*dz)>=hz+ac+as-1e-9)continue;
  count++;
  if(visit(px,pz,read(px,pz,reference)))return count;
 }
 return count;
}
// Only the uninterrupted natural surface qualifies. A saved cut, grain,
// paved border, deck or building continues through the detailed contact path.
function continuousDumpSupport(v,sample,load){
 const c=Math.cos(v.heading),s=Math.sin(v.heading);
 const h=(x,z)=>sample(v.x+c*x+s*z,v.z-s*x+c*z);
 const wheels=[];
 for(const z of [-31,18])for(const x of [-25.5,25.5]){
  const height=h(x,z);
  let min=height,max=height;
  for(const dx of [-7.5,0,7.5])for(const dz of [-12.65,0,12.65]){
   const p=h(x+dx,z+dz);min=Math.min(min,p);max=Math.max(max,p);
  }
  wheels.push({x,z,height,min,max,cells:9});
 }
 const rear=(wheels[0].height+wheels[1].height)/2,front=(wheels[2].height+wheels[3].height)/2;
 const forward=(front-rear)/49,side=(wheels[1].height+wheels[3].height-wheels[0].height-wheels[2].height)/102;
 const y=rear+forward*31,pitch=Math.atan(forward),roll=Math.atan(side);
 let low=0,high=0;
 for(const x of [-29,-15,0,15,29])for(const z of [-39,-20,0,20,39]){
  const error=h(x,z)-(y+x*side+z*forward);
  low=Math.min(low,error);high=Math.max(high,error);
 }
 const ledge=sample.cliffAt(v.x,v.z);
 const driveReady=!ledge||(Math.abs(pitch)<=rad(load?32:36)&&Math.abs(roll)<=rad(load?25:29)&&low>=-11&&high<=8);
 const flatReady=driveReady&&wheels.every(w=>Math.abs(w.min-y)<.05&&Math.abs(w.max-y)<.05);
 return {ok:driveReady,flatReady,driveReady,y:y+Math.max(0,high-4),pitch,roll,wheels,defects:[],chassisCells:25,natural:true,reason:driveReady?'':'斜面の縁です。'};
}
function calculate(frame){
 const SITE=transportArea(frame),v=frame?.dump,stored=frame?.soil?.containers?.dump?.amount;
 const load=stored+(frame?.soil?.pending?.from==='dump'?frame.soil.pending.amount:0);
 if(!v||!['x','z','heading'].every(k=>finite(v[k]))||v.x<SITE.minX||v.x>SITE.maxX||v.z<SITE.minZ||v.z>SITE.maxZ||Math.abs(v.heading)>Math.PI||!finite(load)||load<0||load>SOIL_CAPACITY.dump||![2,3].includes(frame.soil.schema))return{ok:false,flatReady:false,reason:'車の位置と地面を確認できません。'};
 const ground=nativeDumpHeightReader(frame),read=ground.trackSamples?.(v)??ground,reference=v.groundY??0;
 if(ground.slopeAt&&read===ground.slopeAt)return continuousDumpSupport(v,read,load);
 const wheels=[],centres=[],defects=[];let issue='';
 for(const z of[-31,18])for(const x of[-25.5,25.5]){
  const p=point(v,x,z);
  let min=Infinity,max=-Infinity,outside=false;
  const count=visitCells(read,reference,p,v.heading,7.5,12.65,(_x,_z,h)=>{
   if(h===undefined){outside=true;return true;}
   min=Math.min(min,h);max=Math.max(max,h);return false;
  });
  if(!count||outside)return{ok:false,flatReady:false,reason:'道の端です。後退して戻ってください。'};
  centres.push(p);
  if(max-min>4.5)issue='タイヤの下に大きな段差があります。後退して戻ってください。';
  wheels.push({x,z,height:read(p.x,p.z,reference),min,max,cells:count});
 }
 const rear=(wheels[0].height+wheels[1].height)/2,front=(wheels[2].height+wheels[3].height)/2,left=(wheels[0].height+wheels[2].height)/2,right=(wheels[1].height+wheels[3].height)/2;
 const y=rear+(front-rear)*31/49,pitch=Math.atan2(front-rear,49),roll=Math.atan2(right-left,51);
 const c=Math.cos(v.heading),s=Math.sin(v.heading),forward=Math.tan(pitch),side=Math.tan(roll);
 if(Math.abs(pitch)>rad(load?15:19)||Math.abs(roll)>rad(load?10:13))issue='車が傾きすぎます。後退して戻ってください。';
 const chassisCells=visitCells(read,reference,v,v.heading,29,39,(x,z,h)=>{
  const dx=x-v.x,dz=z-v.z,lx=c*dx-s*dz,lz=s*dx+c*dz,plane=y+forward*lz+side*lx;
  if(h===undefined||h>plane+3.75||h<plane-5)issue='車の下に穴や段差があります。後退して戻ってください。';
 });
 const flatReady=!issue&&wheels.every(w=>Math.abs(w.min-(frame.decks?y:0))<.05&&Math.abs(w.max-(frame.decks?y:0))<.05);
 // A continuous ramp has an open low side. Only wheel patches with more than
 // one terrain level can contain a depression, so revisit those patches.
 let hole=false;
 for(const [i,p] of centres.entries()){
  if(hole)break;
  const cutoff=wheels[i].max-1.99;
  if(wheels[i].min>=cutoff)continue;
  visitCells(read,reference,p,v.heading,7.5,12.65,(x,z,h)=>{
   if(h<cutoff)hole=isDepression(frame,{x,z,h});
   return hole;
  });
 }
 const driveReady=!issue&&!hole;
 // Calculate overlap areas only for recovering historic unsupported poses.
 if(!driveReady){
  for(const [i,p] of centres.entries())visitCells(read,reference,p,v.heading,7.5,12.65,(x,z,h)=>{
   if(h!==0)defects.push({key:i+':'+x+','+z,area:h===undefined?Infinity:overlapArea(x-p.x,z-p.z,c,s,7.5,12.65)});
  });
  visitCells(read,reference,v,v.heading,29,39,(x,z,h)=>{
   if(h===undefined||h>3.2||h< -5)defects.push({key:'body:'+x+','+z,area:h===undefined?Infinity:overlapArea(x-v.x,z-v.z,c,s,29,39)});
  });
 }
 return{ok:!issue,flatReady,driveReady,y,pitch,roll,wheels,defects,chassisCells,reason:issue||(hole||!driveReady?'タイヤの下に穴や段差があります。進む向きを変えてください。':'')};
}

export function nativeDumpSupport(frame){
 if(!frame?.soil||typeof frame.soil!=='object')return calculate(frame);
 let entry=supports.get(frame.decks??frame.soil);if(!entry||entry.soil!==frame.soil){entry={soil:frame.soil,cache:new Map()};supports.set(frame.decks??frame.soil,entry);}const cache=entry.cache;
 // Only the single-layer quarry reader can certify reference-independent heights.
 const reference=nativeDumpHeightReader(frame).referenceIndependent?null:frame.dump?.groundY;
 const key=JSON.stringify([frame.dump?.x,frame.dump?.z,frame.dump?.heading,reference,frame.soil.containers?.dump?.amount]);
 if(cache.has(key))return cache.get(key);const result=calculate(frame);
 for(const key of['wheels','defects'])if(result[key]){for(const value of result[key])Object.freeze(value);Object.freeze(result[key]);}Object.freeze(result);
 if(cache.size>=192)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
}
export function nativeDumpRecoveryStep(before,after){
 const a=nativeDumpSupport(before),b=nativeDumpSupport(after);
 if(a.driveReady||!a.defects?.length||!b.defects||!finite(a.defects.reduce((n,q)=>n+q.area,0)))return false;
 const keys=new Set(a.defects.map(q=>q.key));
 return b.defects.every(q=>keys.has(q.key)&&finite(q.area))&&b.defects.reduce((n,q)=>n+q.area,0)<=a.defects.reduce((n,q)=>n+q.area,0)+1e-7;
}
// Actual receiving cells and their supporting floor are checked by the plan
// and the normal soil-load guard before reserving anything.
export function nativeDumpTerrainUnloadReady(frame){return nativeDumpSupport(frame).driveReady;}
