import {QUARRY_EXTENT} from './imasora-construction-shared-field.mjs?v=121cw';
import {transportArea,transportDigProtection,transportDigProtectedRegions} from './imasora-construction-transport-field.mjs?v=120ov';
import {CELL,EX} from './imasora-construction-excavator.js?v=120ov';
import {CONTACT_DIG} from './imasora-construction-excavator-bucket.js';
import {bucketContactGeometry} from './imasora-construction-excavator-contact.js?v=120fc';
// Natural ground is finite, 32 deep, and revealed in 32 x 32 patches. Survey
// commands only open previously untouched patches; replay never refills a cut.
// Legacy terrain's original allocation is excluded even when emptied.
const cache=new WeakMap();
// The arm is mounted beside the cab, not on its centreline. Survey its real
// lateral shoulder/bucket envelope as well as the existing forward corridor.
// Rounding the outside lip to one soil cell keeps the finite patch survey out
// ahead of the collision geometry without softening any contact tests.
const bucketHalfWidth=Math.max(...bucketContactGeometry({digMode:CONTACT_DIG,arm:{boom:0,stick:0,curl:0}},{heading:0,wrist:{x:0,y:0,z:0}}).all.map(p=>p.max[0]));
const excavationSurveySides=Object.freeze([-20,0,20,EX.shoulder.x,Math.ceil((EX.shoulder.x+bucketHalfWidth)/CELL)*CELL]);
export function earthPatches(soil){let map=cache.get(soil);if(!map||map.revision!==soil.revision){map=new Map();for(const c of soil.journal??[])if(c.type==='open-ground')for(const p of c.patches)map.set(p.join(','),p);map.revision=soil.revision;cache.set(soil,map);}return map;}
export function patchColumns(soil,patch){
 if(soil.schema!==3||!Array.isArray(patch)||patch.length!==2||!patch.every(Number.isSafeInteger))throw Error('掘る地面の場所が不正です。');
 const area=transportArea(soil),[px,pz]=patch,out=[];
 if(px< -260||px>259||pz< -160||pz>159)throw Error('現場の外の土は掘れません。');
 for(let x=px*4;x<px*4+4;x++)for(let z=pz*4;z<pz*4+4;z++){
  if(x>=-4&&x<12&&z>=6&&z<22)continue;
  if(x*8<area.minX||(x+1)*8>area.maxX||z*8<area.minZ||(z+1)*8>area.maxZ)continue;
  out.push([x,z]);
 }
 return out;
}
const bankCache=new WeakMap(),ridgeCache=new WeakMap(),mountainCache=new Map(),rockState=new WeakMap();
const oldBankEntry=soil=>soil?.journal?.find(c=>c.type==='open-cut-bank'||c.type==='open-cut-ridge');
const hasOriginalQuarry=soil=>soil?.journal?.some(c=>c.type==='open-quarry-mountain')??false;
export const hasQuarryRange=soil=>soil?.journal?.some(c=>c.type==='open-quarry-range')??false;
export const hasQuarryMountain=soil=>hasOriginalQuarry(soil)||hasQuarryRange(soil);
export const hasCutBank=soil=>!!oldBankEntry(soil)||hasQuarryMountain(soil);
export function cutBank(soil,ridge=false){
 if(soil?.schema!==3)return null;
 const memo=ridge?ridgeCache:bankCache,field=soil.field,previous=memo.get(field);
 if(previous)return previous;
 const sx=field.corner.endsWith('west')?1:-1,sz=field.corner.startsWith('north')?1:-1;
 const [ox,oz]=field.origin,rx=ridge?288:224,rz=ridge?236:192,maxY=ridge?102:60,blocks=[];
 const cx=(ridge?-1256:-1344)*sx-ox,cz=(ridge?-386:-406)*sz-oz;
 let amount=0;
 for(let x=Math.floor((cx-rx)/8);x<Math.ceil((cx+rx)/8);x++){
  for(let z=Math.floor((cz-rz)/8);z<Math.ceil((cz+rz)/8);z++){
   const dx=(x*8+4-cx)*sx,dz=(z*8+4-cz)*sz;
   // A broad, gently stepped approach toward a higher ridge. Four compacted
   // layers at the crest remain real two-unit soil grains throughout.
   const bank=Math.max(0,1-Math.pow(dx/rx,2)-Math.pow(dz/rz,2));
   const h=2*Math.floor((maxY/2)*bank*bank*(.85+.15*Math.cos(dx*.027+dz*.014)));
   for(let y=0;y*8<h;y++){
    const layers=Math.min(4,(h-y*8)/2);
    let mask=0n;
    for(let iz=0;iz<4;iz++)for(let iy=0;iy<layers;iy++)mask|=15n<<BigInt(iz*16+iy*4);
    blocks.push({key:[x,y,z].join(','),mask:mask.toString(16).padStart(16,'0')});
    amount+=16*layers;
   }
  }
 }
 const result={blocks,amount,bounds:{minX:cx-rx-4,maxX:cx+rx+4,minZ:cz-rz-4,maxZ:cz+rz+4,maxY}};
 memo.set(field,result);
 return result;
}

// World offsets mirror by parking layout. The packed two-unit soil still
// belongs to the save's original yard origin.
const MOUNTAIN=Object.freeze({entryX:-1584,centreZ:96,straight:760,radius:132,end:128,halfRoad:76});
const rampLength=MOUNTAIN.straight+Math.PI*MOUNTAIN.radius;
const quarryLength=rampLength+MOUNTAIN.straight-MOUNTAIN.end;
const ease=n=>n*n*(3-2*n);
const clamp=n=>Math.min(1,Math.max(0,n));
const grade=.094,transition=80;
function slopedLeg(distance,length){
 // Each straight climbs; the full turn stays level so the tyres never
 // cross a height step while turning across the two-unit soil grid.
 const s=Math.min(length,Math.max(0,distance));
 if(s<transition)return grade*s*s/(2*transition);
 if(s<=length-transition)return grade*(s-transition/2);
 return grade*(length-transition-(length-s)**2/(2*transition));
}
function trailHeight(distance){
 return slopedLeg(distance,MOUNTAIN.straight)+slopedLeg(distance-rampLength,MOUNTAIN.straight-MOUNTAIN.end);
}
export const quarryTrailLength=quarryLength;
export function quarryTrailPose(corner,distance){
 const {entryX,centreZ,straight,radius}=MOUNTAIN,sx=corner.endsWith('west')?1:-1,sz=corner.startsWith('north')?1:-1;
 const u=distance<straight?distance:distance<rampLength?straight+radius*Math.sin((distance-straight)/radius):straight-(distance-rampLength);
 const angle=Math.max(0,Math.min(Math.PI,(distance-straight)/radius));
 return {x:(entryX+u)*sx,z:(centreZ-radius*Math.cos(angle))*sz,heading:Math.atan2(Math.cos(angle)*sx,Math.sin(angle)*sz),height:trailHeight(distance)};
}
function trailCoordinates(u,v){
 const {straight,radius}=MOUNTAIN;
 if(u>=straight){
  return [straight+radius*Math.atan2(u-straight,-v),Math.hypot(u-straight,v)-radius];
 }
 return v<0?[u,-v-radius]:[rampLength+straight-u,v-radius];
}
function quarryHeight(u,v){
 const {halfRoad}=MOUNTAIN,[distance,offset]=trailCoordinates(u,v),side=Math.abs(offset);
 const peakWidth=u<298?230:260;
 const peak=Math.max(0,1-((u-335)/peakWidth)**2-((v-336)/186)**2);
 const upperRidge=Math.max(0,1-((u-630)/230)**2-((v-289)/120)**2);
 const mainMass=Math.max(161*peak**.58,115*upperRidge**.56);
 if(side<=halfRoad&&distance>=0){
  const road=trailHeight(distance);
  // A level working ledge and a removable face beyond the vehicle bay.
  const face=distance>quarryLength+50&&v>27?12*ease(clamp((distance-quarryLength-50)/30)):0;
  return (road+face)*ease(clamp((u+60)/72));
 }
 const shoulder=trailHeight(distance)*(1-ease(clamp((side-halfRoad)/28)))*ease(clamp((u+60)/72));
 return Math.max(mainMass,shoulder);
}
const columnMask=[0n,1n,17n,273n,4369n];
export function quarryMountain(soil){
 if(soil?.schema!==3)return null;
 const f=soil.field,key=f.corner+'|'+f.origin.join(','),old=mountainCache.get(key);if(old)return old;
 const [ox,oz]=f.origin,sx=f.corner.endsWith('west')?1:-1,sz=f.corner.startsWith('north')?1:-1;
 const {entryX,centreZ}=MOUNTAIN;
 const [minX,maxX]=[(entryX-65)*sx-ox,(entryX+1010)*sx-ox].sort((a,b)=>a-b);
 const [minZ,maxZ]=[(centreZ-240)*sz-oz,(centreZ+525)*sz-oz].sort((a,b)=>a-b);
 const blocks=[],blockX0=Math.floor(minX/8),blockX1=Math.ceil(maxX/8),blockZ0=Math.floor(minZ/8),blockZ1=Math.ceil(maxZ/8);
 const rock={x0:blockX0*4,z0:blockZ0*4,width:(blockX1-blockX0)*4,depth:(blockZ1-blockZ0)*4};
 rock.heights=new Uint8Array(rock.width*rock.depth);
 rock.blockMax=new Uint8Array((blockX1-blockX0)*(blockZ1-blockZ0));
 rock.at=(x,z)=>{
  const i=Math.floor(x/2)-rock.x0,j=Math.floor(z/2)-rock.z0;
  return i>=0&&j>=0&&i<rock.width&&j<rock.depth?rock.heights[j*rock.width+i]*2:0;
 };
 rock.upperBound=(minX,maxX,minZ,maxZ)=>{
  let highest=0;
  for(let x=Math.max(blockX0,Math.floor(minX/8));x<Math.min(blockX1,Math.floor(maxX/8)+1);x++){
   for(let z=Math.max(blockZ0,Math.floor(minZ/8));z<Math.min(blockZ1,Math.floor(maxZ/8)+1);z++){
    highest=Math.max(highest,rock.blockMax[(z-blockZ0)*(blockX1-blockX0)+x-blockX0]);
   }
  }
  return highest*2;
 };
 rock.tint=(x,y,z)=>{
  const u=(x+ox)*sx-entryX,v=(z+oz)*sz-centreZ,[distance,offset]=trailCoordinates(u,v),width=Math.abs(offset);
  const surface=quarryHeight(u,v);
  if(surface<2||y>surface+1)return [1,1,1];
  const band=.92+.07*Math.sin(y*.27+v*.044)+.05*Math.sin(u*.087+v*.098);
  if(distance>=0&&distance<=quarryLength+52&&width<MOUNTAIN.halfRoad-1){
   const compacted=ease(clamp((MOUNTAIN.halfRoad-width)/15));
   const rut=Math.exp(-(((width-23)/6)**2))*.12;
   const wear=1+compacted*(.22-rut);
   return [wear,wear*1.02,wear*1.03];
  }
  const vegetation=ease(clamp((width-MOUNTAIN.halfRoad)/21))*.75;
  return [band*(1-.37*vegetation),band*(1+.06*vegetation),band*(1-.21*vegetation)];
 };
 let amount=0;
 for(let x=blockX0;x<blockX1;x++)for(let z=blockZ0;z<blockZ1;z++){
  const masks=[];
  let rockMax=0;
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
   const u=(x*8+i*2+1+ox)*sx-entryX,v=(z*8+j*2+1+oz)*sz-centreZ;
   const h=Math.floor(quarryHeight(u,v)/2),shift=BigInt(i+16*j);
   const deepFace=u>15&&u<235&&v>52&&v<216;
   const base=Math.max(0,h-(deepFace?12:4));
   rock.heights[((z-blockZ0)*4+j)*rock.width+(x-blockX0)*4+i]=base;
   rockMax=Math.max(rockMax,base);
   for(let y=Math.floor(base/4);y*4<h;y++){
    const low=Math.max(0,base-y*4),high=Math.min(4,h-y*4);
    masks[y]=(masks[y]??0n)|((columnMask[high]^columnMask[low])<<shift);
   }
   amount+=h-base;
  }
  rock.blockMax[(z-blockZ0)*(blockX1-blockX0)+x-blockX0]=rockMax;
  for(const [y,mask] of masks.entries())if(mask)blocks.push({key:[x,y,z].join(','),mask:mask.toString(16).padStart(16,'0')});
 }
 const result={blocks,amount,rock,bounds:{minX,maxX,minZ,maxZ,maxY:162}};
 if(mountainCache.size>=8)mountainCache.delete(mountainCache.keys().next().value);
 mountainCache.set(key,result);return result;
}
// The ridge recorded by old saves retains its original footprint and grains.
// The new range starts across the old outer road on the side of the fleet.
const RANGE=Object.freeze({edge:QUARRY_EXTENT.edge,entryZ:QUARRY_EXTENT.entryZ,far:2552,near:444,radius:184,width:96,finish:2148,legs:5,grade:.0415,blend:104});
const rangeTurn=Math.PI*RANGE.radius,rangeSpacing=2*RANGE.radius;
const legs=[];
let rangeLength=0,rangeTop=0;
for(let index=0;index<RANGE.legs;index++){
 const direction=index%2===0?1:-1,start=index===0?0:direction===1?RANGE.near:RANGE.far;
 const end=index===RANGE.legs-1?RANGE.finish:direction===1?RANGE.far:RANGE.near;
 const length=Math.abs(end-start);
 legs.push({index,start,end,length,dir:direction,v:index*rangeSpacing,d:rangeLength,y:rangeTop,last:index===RANGE.legs-1});
 rangeLength+=length+(index===RANGE.legs-1?0:rangeTurn);
 rangeTop+=(length-RANGE.blend)*RANGE.grade;
}
export const quarryRangeLength=rangeLength;
function rangeClimb(s,length){
 const t=RANGE.blend;
 if(s<=0)return 0;
 if(s<t)return RANGE.grade*s*s/(2*t);
 if(s<=length-t)return RANGE.grade*(s-t/2);
 return RANGE.grade*(length-t-Math.max(0,length-s)**2/(2*t));
}
export function quarryRangePose(corner,distance){
 const lx=corner.endsWith('west')?-1:1,lz=corner.startsWith('north')?1:-1;
 const leg=legs.find(b=>distance<b.d+b.length+rangeTurn)??legs.at(-1);
 const s=distance-leg.d;
 const theta=leg.last?0:Math.max(0,Math.min(Math.PI,(s-leg.length)/RANGE.radius));
 const u=s<=leg.length||leg.last?leg.start+leg.dir*s:leg.end+leg.dir*RANGE.radius*Math.sin(theta);
 const v=leg.v+RANGE.radius*(1-Math.cos(theta));
 return {x:lx*(RANGE.edge+u),z:lz*(RANGE.entryZ+v),heading:Math.atan2(lx*leg.dir*Math.cos(theta),lz*Math.sin(theta)),height:leg.y+rangeClimb(s,leg.length)};
}
function rangeRoad(u,v,summitOnly=false){
 const index=Math.max(0,Math.min(legs.length-1,Math.round(v/rangeSpacing)));
 let best=null;
 for(let i=Math.max(0,index-1);i<=Math.min(legs.length-1,index+1);i++){
  const leg=legs[i],s=(u-leg.start)*leg.dir,offset=v-leg.v;
  const outside=Math.max(0,-s,s-leg.length-(leg.last?(summitOnly?260:155):0)),clearance=Math.hypot(offset,outside);
  if(!best||clearance<best.clearance)best={leg,s,offset,clearance,y:leg.y+rangeClimb(s,leg.length)};
  if(!leg.last&&(u-leg.end)*leg.dir>=0){
   const side=Math.hypot(u-leg.end,v-leg.v-RANGE.radius)-RANGE.radius,d=Math.abs(side);
   if(d<best.clearance)best={leg,s:leg.length,offset:side,clearance:d,y:legs[i+1].y};
  }
 }
 return best;
}
const QUARRY_BENCH_HALF_LENGTH=156,QUARRY_BENCH_HALF_WIDTH=32;
const quarries=legs.map((leg,index)=>({
 u:leg.last?leg.end+36:leg.start+leg.dir*(index===0?635:790),
 v:leg.v+62,
}));
export function quarryRangeSummitBench(corner){
 const {u,v}=quarries.at(-1),mouth=quarryRangePose(corner,0),bench=quarryRangePose(corner,quarryRangeLength+u-RANGE.finish);
 const sz=corner.startsWith('north')?1:-1,z=mouth.z+v*sz;
 return {cell:0,minX:bench.x-QUARRY_BENCH_HALF_LENGTH,maxX:bench.x+QUARRY_BENCH_HALF_LENGTH,
  minZ:z-QUARRY_BENCH_HALF_WIDTH,maxZ:z+QUARRY_BENCH_HALF_WIDTH};
}
export const hasSummitFace=soil=>soil?.journal?.some(c=>c.type==='open-summit-face')??false;
function summitFaceRise(u,v){
 const bench=quarries.at(-1),along=u-bench.u,across=v-bench.v;
 if(across< -30||across>420)return 0;
 // A spur grows wider into the mountainside behind the cutting face.
 // Its toe ends at the bench and leaves the loading/turning lane level.
 const back=Math.max(0,across-15),centre=15*Math.sin(back*.009);
 const alongSpur=along-centre,half=146+back*.62;
 if(Math.abs(alongSpur)>=half)return 0;
 const ends=ease(clamp((half-Math.abs(alongSpur))/(52+back*.2)));
 const toe=-28+3*Math.sin(along*.028);
 const front=ease(clamp((across-toe)/52));
 const join=ease(clamp((420-across)/196));
 return ends*front*join*(34+3*Math.sin(along*.026)+58*ease(clamp(back/164)));
}
// Add actual grains above intact original columns only. Never bridge an old
// excavation or bury a player's construction with a newly surveyed face.
export function summitFaceDeposit(soil){
 const surface=quarryRange(soil).rock.surface,[ox,oz]=soil.field.origin;
 const raised=quarryRange(soil,undefined,undefined,true,true).rock.surface;
 const bench=quarryRangeSummitBench(soil.field.corner),blocks=new Map(),oldMasks=new Map();
 let amount=0;
 const occupied=(x,y,z)=>{
  const key=Math.floor(x/4)+','+Math.floor(y/4)+','+Math.floor(z/4);
  const bit=1n<<BigInt((x&3)+4*(y&3)+16*(z&3));
  let old=oldMasks.get(key);
  if(old===undefined){const block=soil.blocks[key];old=block?BigInt('0x'+block.mask):0n;oldMasks.set(key,old);}
  return {key,bit,set:(old&bit)!==0n};
 };
 for(let z=Math.floor((bench.minZ-oz)/2);z*2<bench.maxZ-oz;z++)for(let x=Math.floor((bench.minX-ox)/2);x*2<bench.maxX-ox;x++){
  const X=x*2+1,Z=z*2+1;
  const layers=(raised.stockTop(X,Z)-surface.stockTop(X,Z))/2;
  if(!layers)continue;
  const top=surface.stockTop(X,Z)/2;
  if(top<=0||!occupied(x,top-1,z).set||occupied(x,top,z).set)continue;
  for(let y=top;y<top+layers;y++){
   const c=occupied(x,y,z);if(c.set)break;
   blocks.set(c.key,(blocks.get(c.key)??0n)|c.bit);amount++;
  }
 }
 return {blocks,amount};
}
function rangeRoadWidth(road,summitOnly){
 return RANGE.width+(summitOnly&&road.leg.last?67*ease(clamp((road.s-road.leg.length+340)/120)):0);
}
function rangeSoilDepth(u,v,road,summitOnly=false){
 if(summitOnly&&!road.leg.last||road.clearance>=rangeRoadWidth(road,summitOnly))return 0;
 const bench=quarries[road.leg.index],length=QUARRY_BENCH_HALF_LENGTH-Math.abs(u-bench.u),width=QUARRY_BENCH_HALF_WIDTH-Math.abs(v-bench.v);
 return Math.floor(18*ease(clamp(length/16))*ease(clamp(width/10)));
}
function quarryRangeTop(u,v,summitOnly,gradedFoot,trail){
 if(u<0||u>3112||v< -408||v>2896)return [0,0,false];
 const tilt=u-1750;
 const crown=Math.max(0,1-((u-1660)/1640)**2-((v-1320+tilt*.23)/1720)**2);
 const shoulder=Math.max(0,1-((u-2220)/860)**2-((v-1980-tilt*.18)/935)**2);
 const rockTone=Math.sin(u*.021+v*.012)*Math.cos(v*.025-u*.006)+.34*Math.sin(u*.065+v*.017);
 let mass=Math.max(570*crown**.56,505*shoulder**.60);
 mass*=ease(clamp(u/210))*ease(clamp((3112-u)/130))*ease(clamp((v+408)/128))*ease(clamp((2896-v)/152));
 mass+=rockTone*Math.min(26,mass*.065);
 const road=trail??rangeRoad(u,v,summitOnly),width=rangeRoadWidth(road,summitOnly),shoulderWidth=76;
 let h=road.clearance<=width?road.y:road.clearance<width+shoulderWidth?road.y+(mass-road.y)*ease(clamp((road.clearance-width)/shoulderWidth)):mass;
 // Join the first leg to the field along a broad, continuous foothill.
 // Keep the original higher ridges, switchbacks and summit work pocket.
 const apron=gradedFoot?(1-ease(clamp((u-850)/850)))*(1-ease(clamp((v-140)/180))):0;
 if(apron>0&&road.clearance>width){
  const toe=ease(clamp((v+408)/305));
  const first=rangeClimb(u,legs[0].length),skirt=first*toe;
  h+=(skirt-h)*apron;
 }
 // Working pockets sit within reach of a machine stopped on the road.
 // Their adjacent through lane remains at the same supporting height.
 return [Math.max(0,h),rangeSoilDepth(u,v,road,summitOnly),road.clearance<width+shoulderWidth+16||apron>.01];
}
// Natural relief is a triangle surface. Only the removable soil in the
// working face uses the saved two-unit material cells. Physics and the mesh
// interpolate the same diagonal, including where neighbouring tiles meet.
function quarrySurface(bounds,local,benches,rockAt,summitOnly,gradedFoot,face){
 const step=16,originX=bounds.minX,originZ=bounds.minZ;
 const cols=Math.ceil((bounds.maxX-originX)/step)+1,rows=Math.ceil((bounds.maxZ-originZ)/step)+1;
 const heights=new Float32Array(cols*rows),roadFloor=new Float32Array(cols*rows),cliffs=new Float32Array(cols*rows),roadEdges=new Float32Array(cols*rows);
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const [u,v]=local(originX+i*step,originZ+j*step);
  const trail=rangeRoad(u,v,true),original=quarryRangeTop(u,v,true,true,trail)[0];
  // The loading yard includes the swept outside corners of a full-lock
  // dump turn. Blend its shoulder into the mountain beyond the driving lane.
  const last=legs.at(-1),across=v-last.v;
  const apron=ease(clamp((u-1730)/165))*ease(clamp((2580-u)/160))*
   ease(clamp((across+170)/68))*ease(clamp((320-across)/105));
  const road=last.y+rangeClimb((u-last.start)*last.dir,last.length);
  const k=j*cols+i;
  heights[k]=original+(road-original)*apron;
  roadEdges[k]=ease(clamp((trail.clearance-64)/90));
  if(trail.clearance<=60||apron>.995)roadFloor[k]=heights[k];
  // Retain the exposed rock face above the first mountain road. The rest of
  // the cross-country slopes meet the road and yard with a driveable grade.
  cliffs[k]=ease(clamp((u-390)/230))*ease(clamp((1280-u)/250))*
   ease(clamp((v-85)/76))*ease(clamp((402-v)/70));
 }
 const authored=heights.slice(),rise=step*.73,diagonal=rise*Math.SQRT2;
 function meet(i,k,d){
  heights[i]=Math.min(heights[i],heights[k]+d);
  roadFloor[i]=Math.max(roadFloor[i],roadFloor[k]-d);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const k=j*cols+i;
  if(i)meet(k,k-1,rise);
  if(j){meet(k,k-cols,rise);if(i)meet(k,k-cols-1,diagonal);if(i+1<cols)meet(k,k-cols+1,diagonal);}
 }
 for(let j=rows-1;j>=0;j--)for(let i=cols-1;i>=0;i--){
  const k=j*cols+i;
  if(i+1<cols)meet(k,k+1,rise);
  if(j+1<rows){meet(k,k+cols,rise);if(i)meet(k,k+cols-1,diagonal);if(i+1<cols)meet(k,k+cols+1,diagonal);}
 }
 for(let i=0;i<heights.length;i++){
  const grade=Math.max(heights[i],roadFloor[i]);
  const shaped=authored[i]+(grade-authored[i])*roadEdges[i];
  heights[i]=shaped+(authored[i]-shaped)*cliffs[i];
 }
 function interpolate(values,stride,x,z){
  const i=Math.floor(x),j=Math.floor(z),u=x-i,v=z-j,k=j*stride+i;
  const b=values[k+1],c=values[k+stride];
  return u+v<=1?values[k]*(1-u-v)+b*u+c*v:values[k+stride+1]*(u+v-1)+b*(1-v)+c*(1-u);
 }
 const faceHeights=face?new Float32Array(heights.length):null;
 if(face)for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const k=j*cols+i,rise=summitFaceRise(...local(originX+i*step,originZ+j*step));
  faceHeights[k]=rise;heights[k]+=rise;
 }
 function massif(x,z){
  if(x<=originX||z<=originZ||x>=bounds.maxX||z>=bounds.maxZ)return 0;
  return interpolate(heights,cols,(x-originX)/step,(z-originZ)/step);
 }
 const floorX=x=>originX+Math.floor((x-originX)/step)*step;
 const floorZ=z=>originZ+Math.floor((z-originZ)/step)*step;
 const plots=benches.map(bench=>{
  const fine={minX:floorX(bench.minX)-step,minZ:floorZ(bench.minZ)-step,
   maxX:floorX(bench.maxX)+2*step,maxZ:floorZ(bench.maxZ)+2*step};
  const stride=(fine.maxX-fine.minX)/2,beds=new Int16Array(stride*((fine.maxZ-fine.minZ)/2)).fill(-1);
  const tops=new Int16Array(beds.length).fill(-1);
  for(let z=fine.minZ;z<fine.maxZ;z+=2)for(let x=fine.minX;x<fine.maxX;x+=2){
   const [u,v]=local(x+1,z+1),[height,depth]=quarryRangeTop(u,v,summitOnly,gradedFoot);
   if(!depth)continue;
   const bed=rockAt(x+1,z+1),top=Math.floor(height/2)*2;
   // At the low end of an old quarry, the geological floor is zero.
   // Only the layers above that floor were ever added to the soil ledger.
   if(top<=bed)continue;
   const k=(z-fine.minZ)/2*stride+(x-fine.minX)/2;
   beds[k]=bed;tops[k]=top+(face?2*Math.round(interpolate(faceHeights,cols,(x+1-originX)/step,(z+1-originZ)/step)/2):0);
  }
  return {...fine,stride,beds,tops};
 });
 const inside=(p,x,z)=>x>=p.minX&&x<p.maxX&&z>=p.minZ&&z<p.maxZ;
 const pick=plots.length===1?(x,z)=>inside(plots[0],x,z)?plots[0]:null:(x,z)=>plots.find(p=>inside(p,x,z));
 const column=(x,z,key)=>{
  const p=pick(x,z);return p?p[key][Math.floor((z-p.minZ)/2)*p.stride+Math.floor((x-p.minX)/2)]:-1;
 };
 const bedAt=(x,z)=>column(x,z,'beds'),stockTop=(x,z)=>column(x,z,'tops');
 const coarse=massif;
 const at=(x,z)=>{const bed=bedAt(x,z);return bed>=0?bed:coarse(x,z);};
 const fineUpperColumns=new WeakMap();
 function fineUpperBound(fine,x,z){
  // Arm sweeps repeatedly ask for the same rock columns. The bed and the
  // four interpolated corners are fixed by this quarry, even after a cut.
  const i=(x-fine.minX)/2,j=(z-fine.minZ)/2;
  const sample=()=>Math.max(bedAt(x,z),coarse(x,z),coarse(x+2,z),coarse(x,z+2),coarse(x+2,z+2));
  if(!Number.isInteger(i)||!Number.isInteger(j))return sample();
  let values=fineUpperColumns.get(fine);
  if(!values){values=new Float64Array(fine.beds.length).fill(NaN);fineUpperColumns.set(fine,values);}
  const k=j*fine.stride+i,previous=values[k];
  return Number.isNaN(previous)?(values[k]=sample()):previous;
 }
 const upperBounds=new Map();
 function sampleRange(min,max,start,end){
  const first=Math.max(start,2*Math.floor(min/2));
  const steps=Math.min(Math.floor((max-first)/2),Math.ceil((end-first)/2)-1);
  let last=first+steps*2;
  if(last>max||last>=end)last-=2;
  else if(last+2<=max&&last+2<end)last+=2;
  return [first,last];
 }
 const upperBound=(minX,maxX,minZ,maxZ)=>{
  if(maxX<originX||maxZ<originZ||minX>bounds.maxX||minZ>bounds.maxZ)return 0;
  const left=Math.max(0,Math.floor((minX-originX)/step)),right=Math.min(cols-1,Math.ceil((maxX-originX)/step));
  const near=Math.max(0,Math.floor((minZ-originZ)/step)),far=Math.min(rows-1,Math.ceil((maxZ-originZ)/step));
  const ranges=plots.map(fine=>{
   const [x0,x1]=sampleRange(minX,maxX,fine.minX,fine.maxX),[z0,z1]=sampleRange(minZ,maxZ,fine.minZ,fine.maxZ);
   return [x0,x1,z0,z1];
  });
  // Adjacent arm samples often include precisely the same source cells.
  // Key by the discrete sample windows, so every reported bound is exact.
  const key=[left,right,near,far,...ranges.map(range=>range.join(','))].join('/');
  const cached=upperBounds.get(key);
  if(cached!==undefined)return cached;
  let high=0;
  for(let j=near;j<=far;j++)for(let i=left;i<=right;i++)high=Math.max(high,heights[j*cols+i]);
  for(let i=0;i<plots.length;i++){
   const [x0,x1,z0,z1]=ranges[i];
   for(let z=z0;z<=z1;z+=2)for(let x=x0;x<=x1;x+=2)high=Math.max(high,fineUpperBound(plots[i],x,z));
  }
  if(upperBounds.size>=384)upperBounds.delete(upperBounds.keys().next().value);
  upperBounds.set(key,high);
  return high;
 };
 const cliffAt=(x,z)=>{
  const [u,v]=local(x,z);
  return u>=390&&u<=1280&&v>=85&&v<=402;
 };
 at.cliffAt=coarse.cliffAt=cliffAt;
 return {at,coarse,bedAt,stockTop,upperBound,step,plots,originX,originZ};
}
const rangeCache=new Map();
export const hasContinuousQuarry=soil=>soil?.journal?.some(c=>c.type==='surface-quarry-slopes'||c.type==='open-quarry-range'&&c.slopes===true)??false;
export function quarryRange(soil,summitOnly,gradedFoot,slopes=hasContinuousQuarry(soil),face=slopes&&hasSummitFace(soil)){
 if(soil?.schema!==3)return null;
 if(summitOnly===undefined||gradedFoot===undefined){
  const recorded=soil.journal.find(c=>c.type==='open-quarry-range');
  summitOnly??=recorded?.summitOnly===true;gradedFoot??=recorded?.gradedFoot===true;
 }
 // Include the summit survey in the immutable surface cache key.
 const f=soil.field,key=f.corner+'|'+f.origin.join(',')+'|'+summitOnly+'|'+gradedFoot+'|'+slopes+'|'+face,stored=rangeCache.get(key);if(stored)return stored;
 const [ox,oz]=f.origin,sx=f.corner.endsWith('west')?-1:1,sz=f.corner.startsWith('north')?1:-1;
 const ax=(RANGE.edge+0)*sx-ox,bx=(RANGE.edge+QUARRY_EXTENT.width)*sx-ox,az=(RANGE.entryZ+QUARRY_EXTENT.near)*sz-oz,bz=(RANGE.entryZ+QUARRY_EXTENT.far)*sz-oz;
 const minX=Math.min(ax,bx),maxX=Math.max(ax,bx),minZ=Math.min(az,bz),maxZ=Math.max(az,bz);
 const x0=Math.floor(minX/8)*4,z0=Math.floor(minZ/8)*4,width=Math.ceil(maxX/8)*4-x0,depth=Math.ceil(maxZ/8)*4-z0;
 const heights=new Uint16Array(width*depth),maxima=new Uint16Array(width/4*depth/4),blocks=[];
 const bounds={minX,maxX,minZ,maxZ,maxY:605};
 const local=(x,z)=>[(x+ox)*sx-RANGE.edge,(z+oz)*sz-RANGE.entryZ];
 const continuous=summitOnly&&gradedFoot,blockCols=width/4,blockRows=depth/4;
 const computed=new Uint8Array(blockCols*blockRows);
 let amount=0,volume=0,maximum=0;
 function fillBlock(bx,bz){
  const index=bz*blockCols+bx;
  if(computed[index])return;
  computed[index]=1;
  const [u,v]=local((x0+bx*4)*2+4,(z0+bz*4)*2+4),middle=quarryRangeTop(u,v,summitOnly,gradedFoot);
  const masks=[];
  let peak=0;
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
   const ix=bx*4+i,iz=bz*4+j;
   const [raw,dirt]=middle[2]?quarryRangeTop(u+(i*2-3)*sx,v+(j*2-3)*sz,summitOnly,gradedFoot):middle;
   const height=middle[2]?Math.floor(raw/2):Math.floor(raw/4)*2,base=Math.max(0,height-dirt);
   heights[iz*width+ix]=base;peak=Math.max(peak,base);maximum=Math.max(maximum,height);
   volume+=height*8;
   if(!dirt)continue;
   const shift=BigInt(i+16*j);
   for(let y=Math.floor(base/4);y*4<height;y++){
    const lo=Math.max(0,base-y*4),hi=Math.min(4,height-y*4);
    masks[y]=(masks[y]??0n)|((columnMask[hi]^columnMask[lo])<<shift);
   }
   amount+=height-base;
  }
  maxima[bz*width/4+bx]=peak;
  for(const [y,mask] of masks.entries())if(mask)blocks.push({key:[x0/4+bx,y,z0/4+bz].join(','),mask:mask.toString(16).padStart(16,'0')});
 }
 const fillRange=()=>{for(let bx=0;bx<blockCols;bx++)for(let bz=0;bz<blockRows;bz++)fillBlock(bx,bz);};
 if(continuous){
  // Only this summit pocket owns removable material. Replaying the soil
  // journal need not enumerate millions of inaccessible bedrock grains.
  const b=quarryRangeSummitBench(f.corner);
  for(let bx=Math.max(0,Math.floor((b.minX-ox)/8)-x0/4-1);bx<=Math.min(blockCols-1,Math.floor((b.maxX-ox)/8)-x0/4+1);bx++)
   for(let bz=Math.max(0,Math.floor((b.minZ-oz)/8)-z0/4-1);bz<=Math.min(blockRows-1,Math.floor((b.maxZ-oz)/8)-z0/4+1);bz++)fillBlock(bx,bz);
 }else fillRange();
 const rock={x0,z0,width,depth,get heights(){if(continuous)fillRange();return heights;},bounds,range:true,
  at(x,z){
   const i=Math.floor(x/2)-x0,j=Math.floor(z/2)-z0;
   if(i<0||j<0||i>=width||j>=depth)return 0;
   if(continuous)fillBlock(i>>2,j>>2);
   return heights[j*width+i]*2;
  },
  upperBound(loX,hiX,loZ,hiZ){
   let h=0;
   for(let i=Math.max(0,Math.floor(loX/8)-x0/4);i<Math.min(width/4,Math.floor(hiX/8)-x0/4+1);i++){
    for(let j=Math.max(0,Math.floor(loZ/8)-z0/4);j<Math.min(depth/4,Math.floor(hiZ/8)-z0/4+1);j++){if(continuous)fillBlock(i,j);h=Math.max(h,maxima[j*width/4+i]);}
   }
   return h*2;
  },
  tint(x,y,z){
   const [u,v]=local(x,z),q=rangeRoad(u,v,summitOnly),grain=Math.sin(y*.18+v*.013)*.12+Math.sin(u*.036-v*.035)*.07;
   if(rangeSoilDepth(u,v,q,summitOnly)>0)return [1.32+grain,1.11+grain,.85+grain*.75];
   if(q.clearance<RANGE.width){
    const blend=ease(clamp((RANGE.width-q.clearance)/24));
    const ruts=Math.exp(-(((Math.abs(q.offset)-26)/7)**2))*.13;
    const tan=1+blend*(.29-ruts);
    return slopes?[tan*1.12,tan*.90,tan*.67]:[tan,tan*1.035,tan*1.03];
   }
   const green=ease(clamp((y-60)/365))*(.48+.18*Math.sin(v*.021+u*.015));
   return [1+grain-green*.25,1+grain+green*.17,1+grain-green*.16];
  },
 };
 if(slopes){
  const plots=(summitOnly?quarries.slice(-1):quarries).map(({u,v})=>{
   const x=(RANGE.edge+u)*sx-ox,z=(RANGE.entryZ+v)*sz-oz;
   return {minX:x-QUARRY_BENCH_HALF_LENGTH,maxX:x+QUARRY_BENCH_HALF_LENGTH,minZ:z-QUARRY_BENCH_HALF_WIDTH,maxZ:z+QUARRY_BENCH_HALF_WIDTH};
  });
  rock.surface=quarrySurface({minX:x0*2,maxX:(x0+width)*2,minZ:z0*2,maxZ:(z0+depth)*2},local,plots,rock.at,summitOnly,gradedFoot,face);
 }
 const result={blocks,amount,get volume(){if(continuous)fillRange();return volume;},get maximum(){if(continuous)fillRange();return maximum*2;},rock,bounds};
 if(rangeCache.size>=4)rangeCache.delete(rangeCache.keys().next().value);
 rangeCache.set(key,result);return result;
}
export function quarryRock(soil){
 if(soil?.schema!==3)return null;
 const hit=rockState.get(soil);
 if(hit?.revision===soil.revision)return hit.rock;
 const ridge=hasOriginalQuarry(soil)?quarryMountain(soil).rock:null,range=hasQuarryRange(soil)?quarryRange(soil).rock:null;
 const rock=!ridge||!range?range??ridge:{
  layers:[ridge,range],
  at:(x,z)=>Math.max(ridge.at(x,z),range.at(x,z)),
  upperBound:(...area)=>Math.max(ridge.upperBound(...area),range.upperBound(...area)),
  ...(range.surface?{surface:{at:(x,z)=>Math.max(ridge.at(x,z),range.surface.at(x,z)),upperBound:(...a)=>Math.max(ridge.upperBound(...a),range.surface.upperBound(...a))}}:{}),
 };
 rockState.set(soil,{revision:soil.revision,rock});
 return rock;
}
export function earthAllocated(soil){
 let q=0;
 for(const p of earthPatches(soil).values())q+=patchColumns(soil,p).length*4*64;
 const old=oldBankEntry(soil);
 if(old)q+=cutBank(soil,old.type==='open-cut-ridge').amount;
 if(hasOriginalQuarry(soil))q+=quarryMountain(soil).amount;
 if(hasQuarryRange(soil))q+=quarryRange(soil).amount;
 q+=soil.journal?.find(c=>c.type==='open-summit-face')?.amount??0;
 return q;
}
const baseReaders=new WeakMap();
export function earthBaseReader(soil){
 let entry=baseReaders.get(soil);if(entry&&entry.revision===soil.revision)return entry.read;
 const area=soil.schema===3?transportArea(soil):null,patches=area?earthPatches(soil):null;
 const pavement=area?transportDigProtectedRegions(soil):[],rock=area?quarryRock(soil):null;
 const read=(x,z)=>{
  // The grade of the paved surface is fixed. Former cuts below that grade
  // remain in the ledger and are spanned by the road, not filled with new soil.
  if(pavement.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ))return 0;
  const stone=rock?.at(x,z);if(stone)return stone;
  if(x>=-32&&x<96&&z>=48&&z<176)return -32;
  if(!patches?.size)return 0;
  const bx=Math.floor(x/8)*8,bz=Math.floor(z/8)*8;
  return bx>=area.minX&&bx+8<=area.maxX&&bz>=area.minZ&&bz+8<=area.maxZ&&patches.has([Math.floor(x/32),Math.floor(z/32)].join(','))?-32:0;
 };
 const terrain=(rock?.layers??(rock?[rock]:[])).find(layer=>layer.surface);
 if(terrain)read.mountainHeight=terrain.surface.coarse;
 if(terrain)read.soilHeight=(x,z,h)=>{
  const s=terrain.surface,top=s.stockTop(x,z);
  return top>=0&&h===top?s.coarse(x,z):h;
 };
 if(terrain)read.surface=(x,z)=>{
  const {bounds}=terrain;
  if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return read(x,z);
  if(pavement.some(r=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ))return 0;
  if(patches?.size&&patches.has(Math.floor(x/32)+','+Math.floor(z/32))&&!terrain.at(x,z))return read(x,z);
  return terrain.surface.at(x,z);
 };
 // Exact proof for a rectangle, including the full footprint of any 2-unit
 // cell or 32-unit opened patch it touches. A possible feature uses the reader.
 read.isZeroArea=(minX,maxX,minZ,maxZ)=>{
  if(pavement.some(r=>minX>=r.minX&&maxX<=r.maxX&&minZ>=r.minZ&&maxZ<=r.maxZ))return true;
  if(minX<96&&maxX>=-32&&minZ<176&&maxZ>=48)return false;
  if((rock?.surface??rock)?.upperBound(minX,maxX,minZ,maxZ)>0)return false;
  if(patches?.size)for(let x=Math.floor(minX/32);x<=Math.floor(maxX/32);x++){
   for(let z=Math.floor(minZ/32);z<=Math.floor(maxZ/32);z++)if(patches.has(x+','+z))return false;
  }
  return true;
 };
 baseReaders.set(soil,{revision:soil.revision,read});return read;
}
export function earthBase(soil,x,z){return earthBaseReader(soil)(x,z);}
const holesCache=new WeakMap();
export function earthHoles(soil){const patches=earthPatches(soil);let holes=holesCache.get(patches);if(holes)return holes;holes=[];for(const p of patches.values()){const rows=new Map();for(const [x,z] of patchColumns(soil,p)){const row=rows.get(z)??[];row.push(x);rows.set(z,row);}for(const [z,xs] of rows){const minX=Math.min(...xs)*8,maxX=(Math.max(...xs)+1)*8;const prev=holes.find(h=>h.minX===minX&&h.maxX===maxX&&h.maxZ===z*8);if(prev)prev.maxZ=(z+1)*8;else holes.push({minX,maxX,minZ:z*8,maxZ:(z+1)*8});}}holesCache.set(patches,holes);return holes;}
export function unopenedGround(s){
 const f=s.frame,soil=f.soil;if(f.version!==2||soil.pending||f.job||s.scoop||s.link||s.unload||!['foot','excavating'].includes(s.mode))return[];
 const exc=s.mode==='excavating',v=exc?f.machineVehicle:f.player,a=v.heading+(exc?f.machineArm.slew:0),sn=Math.sin(a),c=Math.cos(a),seen=new Set(),out=[];
 const rock=quarryRock(soil);
 for(const d of exc?[32,60,88,116,144]:[20,36])for(const side of exc?excavationSurveySides:[-4,4]){
  const p=[Math.floor((v.x+sn*d+c*side)/32),Math.floor((v.z+c*d-sn*side)/32)],key=p.join(',');
  if(seen.has(key)||earthPatches(soil).has(key)||p[0]< -260||p[0]>259||p[1]< -160||p[1]>159)continue;seen.add(key);
  if(patchColumns(soil,p).some(([x,z])=>!transportDigProtection(f,x*8+4,z*8+4)&&!rock?.at(x*8+4,z*8+4)))out.push(p);
 }
 return out;
}
