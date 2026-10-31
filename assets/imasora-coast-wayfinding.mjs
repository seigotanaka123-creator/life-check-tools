import {CHARTED_COAST_ISLANDS,COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
import {COAST_ATLAS,COAST_SEA_ATLAS} from './imasora-coast-navigation.mjs?v=120mx';

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
// The home beach is south, open sea is north. In the actual forward view +X
// is to port, so the paper chart and the sailing instrument share this frame.
const directions=['北','北西','西','南西','南','南東','東','北東'];
export const coastCompassName=h=>directions[((Math.round(h/(Math.PI/4))%8)+8)%8];

// These are deliberately broad sea areas, never the landing or mountain centre.
// The secret island has no entry here, even after the player has visited it.
export function coastSearchAreas(visited=[]){
 const known=new Set(visited);
 return [{id:'pier',name:'星待ちの桟橋',icon:'⚓',x:0,z:0,rx:2600,rz:1800,known:true},
  ...CHARTED_COAST_ISLANDS.map((i,n)=>({id:i.id,name:known.has(i.id)?i.name:['東の沖','西の沖','東の遠い海','西の遠い海'][n],icon:known.has(i.id)?i.icon:'⌁',
   x:(Math.floor(i.x/8000)+.5)*8000,z:(Math.floor(i.z/12000)+.5)*12000,rx:6400,rz:9000,known:known.has(i.id)}))];
}
export function coastSearchBearing({x,z,heading=0,target,visited=[]}){
 const areas=coastSearchAreas(visited),area=areas.find(i=>i.id===target);
 if(!area)return {id:null,name:'目的地なし',inside:false,unselected:true,rotation:0,heading:coastCompassName(heading),northRotation:wrap(heading)*180/Math.PI,label:'海図で選ぶ',description:'海の地図で目的地を選べるよ'};
 const dx=area.x-x,dz=area.z-z,inside=Math.abs(dx)<=area.rx&&Math.abs(dz)<=area.rz;
 // Only eight directions. Inside the search area the pointer disappears;
 // finding a silhouette and choosing a safe landing remain the player's job.
 const bearing=Math.round(Math.atan2(dx,dz)/(Math.PI/4))*(Math.PI/4),relative=wrap(bearing-heading);
 const side=['前の海','左前の海','左の海','左後ろの海','後ろの海','右後ろの海','右の海','右前の海'][((Math.round(relative/(Math.PI/4))%8)+8)%8];
 return {id:area.id,name:area.name,inside,rotation:-relative*180/Math.PI,heading:coastCompassName(heading),northRotation:wrap(heading)*180/Math.PI,
  label:inside?(area.id==='pier'?'浜を探そう':'この海域を探そう'):side,description:inside?(area.id==='pier'?'橋のある浜へ戻ろう':'島影を見つけて、自分で岸を選ぼう'):coastCompassName(bearing)+'の方角'};
}

// Only charted destinations may be selected. No secret-island coordinates,
// resource mutation, or implicit changes when a different place is previewed.
export function coastDestination(id){return coastSearchAreas().some(a=>a.id===id)?id:null;}

// The recorded voyage owns this boat. Never pick a nearer unrelated board or
// expose an island that has not actually been landed on. This is read-only.
export function coastReturnBoat(play,{map,x,z,aboard=false}={}){
 const n=play?.navigation;
 if(map!=='coast'||aboard||!n?.ashore||!n.board||![x,z].every(Number.isFinite))return null;
 const island=COAST_ISLANDS.find(i=>i.id===n.land?.island);
 if(!island||Math.abs(x-island.x)>island.rx*1.9||Math.abs(z-island.z)>island.rz*2)return null;
 const boat=play.parts.find(p=>p.type==='board'&&p.id===n.board);
 if(!boat||boat.id===play.islandBoard?.id||!Array.isArray(boat.p)||boat.p.length!==3||!boat.p.every(Number.isFinite))return null;
 return {id:boat.id,x:boat.p[0],z:boat.p[2]};
}

// Reuse the sailing device on shore. Broad directions only, relative to the
// view the player is using to walk. A near/far gap prevents wave-edge blinking.
export function createCoastBoatReturnBearing(){
 let id=null,near=false;
 return {update({map,x,z,viewHeading=0,riding=false,returnBoat}={}){
  const b=returnBoat;
  if(map!=='coast'||riding||!b||![x,z,viewHeading,b.x,b.z].every(Number.isFinite)){id=null;near=false;return null;}
  if(id!==b.id){id=b.id;near=false;}
  const distance=Math.hypot(b.x-x,b.z-z);
  if(distance<=180)near=true;else if(distance>=240)near=false;
  if(near)return null;
  const bearing=Math.round(Math.atan2(b.x-x,b.z-z)/(Math.PI/4))*(Math.PI/4),relative=wrap(bearing-viewHeading);
  const side=['前の方','左前の方','左の方','左後ろの方','後ろの方','右後ろの方','右の方','右前の方'][((Math.round(relative/(Math.PI/4))%8)+8)%8];
  return {id:b.id,name:'自分のいかだ',inside:false,rotation:-relative*180/Math.PI,heading:coastCompassName(viewHeading),northRotation:wrap(viewHeading)*180/Math.PI,label:side,description:'帰り道の目印',ashore:true};
 }};
}

// A fixed north-up paper chart: beach at the bottom, offshore at the top.
// Never shrink or rotate it with the player or the freely orbiting camera.
export function coastMapFrame(heading=0,mode='sea'){
 const a=mode==='sea'?COAST_SEA_ATLAS:COAST_ATLAS;
 return {angle:180,scale:1,point(p){return{x:a.width-p.x,y:a.height-p.y};}};
}
