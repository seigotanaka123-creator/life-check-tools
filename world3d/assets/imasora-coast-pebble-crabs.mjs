import {islandRelief} from './imasora-coast-sea-regions.mjs?v=120mu';
import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {coastWave,coastWaveFloor} from './imasora-coast-waves.mjs?v=120mx';
import {COAST_ISLANDS} from './imasora-coast-geography.mjs?v=120li';
const rnd=n=>{const v=Math.sin(n*127.13+43.91)*43758.5453;return v-Math.floor(v);};
export const CRAB_ACTION=Object.freeze({shift:.6,reveal:1,escape:6.3,returnView:.4,chance:.45,reach:62,handReach:18,frontCos:.5,escapeReach:760,submerge:9,minEscape:1.8});
// Select the rock in front of the body, not a centre-point radius behind it.
// Measure the gap from the real footprint; keep looking down at a close rock
// usable and reject a rock hidden behind another solid.
export function pebbleInFront(stone,player,heading,{body,obstacles=[]}={}){
 if(!stone||!Number.isFinite(heading)||stone.w>22||stone.h>18||Math.abs(player.y-stone.y)>22)return false;
 const dx=stone.worldX-player.x,dz=stone.worldZ-player.z,d=Math.hypot(dx,dz);
 if(d<1e-6||d>CRAB_ACTION.reach)return false;
 const sx=Math.sin(heading),cz=Math.cos(heading),front=(dx*sx+dz*cz)/d;
 if(front<CRAB_ACTION.frontCos)return false;
 const right=(dx*cz-dz*sx)/d;
 const extent=Math.abs(right)*(body?.halfX??20)+Math.abs(front)*(body?.halfZ??20)
  +right*(body?.offsetX??0)+front*(body?.offsetZ??0);
 if(d-extent-stone.w>CRAB_ACTION.handReach)return false;
 const y=player.y+(body?.maxY??36)*.55,dy=stone.y+stone.h*.6-y;
 const minX=Math.min(player.x,stone.worldX),maxX=Math.max(player.x,stone.worldX),minZ=Math.min(player.z,stone.worldZ),maxZ=Math.max(player.z,stone.worldZ);
 for(const c of obstacles){
  if(c.id===stone.id)continue;
  if(c.x+(c.halfX??0)<minX||c.x-(c.halfX??0)>maxX||c.z+(c.halfZ??0)<minZ||c.z-(c.halfZ??0)>maxZ)continue;
  let lo=0,hi=1;
  for(const [origin,delta,min,max]of[[player.x,dx,c.x-(c.halfX??0),c.x+(c.halfX??0)],[player.z,dz,c.z-(c.halfZ??0),c.z+(c.halfZ??0)],[y,dy,c.minY??-Infinity,c.maxY??Infinity]]){
   if(Math.abs(delta)<1e-9){if(origin<min||origin>max){hi=-1;break;}}
   else{const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)break;}
  }
  if(lo<hi&&hi>0&&lo<1)return false;
 }
 return true;
}
// Same deterministic rocks and IDs as the established island scenery.
export function islandRockRecords(i){
 const stones=[];for(let n=0;n<65;n++){const a=rnd(n+i.seed*9)*Math.PI*2,r=.8+rnd(n*13+i.seed)*.2,x=Math.cos(a)*r*i.rx,z=Math.sin(a)*r*i.rz,y=islandRelief(i,i.x+x,i.z+z);if((i.hidden&&Math.abs(x)<210&&z+i.z>i.landingZ-180&&z+i.z<i.landingZ+900)||y< -2||y>35||Math.hypot(x,z+i.z-i.landingZ)<280)continue;
  const index=stones.length;stones.push({x,y,z,n,w:9+rnd(n*4)*19,h:5+rnd(n*2)*14,index,id:'coast-rock-'+i.id+'-'+index,island:i.id,worldX:i.x+x,worldZ:i.z+z,centerX:i.x,centerZ:i.z,rx:i.rx,rz:i.rz});
 }return stones;
}
function obstructed(x,y,z,radius,obstacles,ignore){return obstacles.some(c=>c.id!==ignore&&y+6> (c.minY??-Infinity)&&y<(c.maxY??Infinity)&&Math.abs(x-c.x)<(c.halfX??0)+radius&&Math.abs(z-c.z)<(c.halfZ??0)+radius);}
export function planPebbleEscape(stone,player,{time=0,obstacles=[],heightAt=coastWalkingHeight,waterAt=(x,z)=>coastWave(x,z,time).height,clearStone}={}){
 if(!stone||stone.w>22||stone.h>18||Math.abs(player.y-stone.y)>22||Math.hypot(player.x-stone.worldX,player.z-stone.worldZ)>CRAB_ACTION.reach||stone.y<0)return null;
 const x=stone.worldX,z=stone.worldZ,base=heightAt(x,z),outward=Math.atan2((x-stone.centerX)/stone.rx**2,(z-stone.centerZ)/stone.rz**2);
 if(base<waterAt(x,z)+1)return null;
 // Broad phase only: keep every obstacle whose full extent can meet either
 // the escape lane or the sideways slide. Exact height/clearance is unchanged.
 const reach=CRAB_ACTION.escapeReach+Math.max(5,stone.w),nearby=obstacles.filter(c=>Math.abs(x-c.x)<reach+(c.halfX??0)&&Math.abs(z-c.z)<reach+(c.halfZ??0));
 let best=null;
 for(const offset of[0,.3,-.3,.65,-.65,1,-1,1.4,-1.4,Math.PI]){
  const a=outward+offset,ux=Math.sin(a),uz=Math.cos(a),points=[{x,y:base,z}];let last=base;
  for(let d=5;d<=Math.min(CRAB_ACTION.escapeReach,best?.length??Infinity);d+=5){const px=x+ux*d,pz=z+uz*d,py=heightAt(px,pz);
   if(Math.abs(py-last)>9||py>base+5||obstructed(px,py,pz,5,nearby,stone.id)||Math.hypot(px-player.x,pz-player.z)<20)break;
   points.push({x:px,y:py,z:pz});last=py;
   if(py< -13&&py<coastWaveFloor(px,pz)-CRAB_ACTION.submerge){if(!best||d<best.length)best={points,length:d,ux,uz};break;}
  }
 }
 // A safe rock can still be moved when a crab has no clear path to the sea.
 // Do not make the interaction disappear just because the random visitor
 // would have nowhere to run.
 best??={points:[{x,y:base,z},{x,y:base,z}],length:0,ux:Math.sin(outward),uz:Math.cos(outward)};
 // Slide sideways, away from the escape lane and without pushing the walker.
 const baseShift=stone.home?{x:stone.x-stone.home.x,y:stone.y-stone.home.y,z:stone.z-stone.home.z}:{x:0,y:0,z:0};
 const away=Math.atan2(x-player.x,z-player.z),step=stone.w+8;
 const shifts=Math.hypot(baseShift.x,baseShift.z)>1?[{x:-baseShift.x,z:-baseShift.z}]:[];
 shifts.push(...[1,-1].map(side=>({x:best.uz*side*step,z:-best.ux*side*step})));
 for(const offset of[0,.45,-.45,.9,-.9])shifts.push({x:Math.sin(away+offset)*step,z:Math.cos(away+offset)*step});
 const separation=Math.min(Math.hypot(x-player.x,z-player.z),stone.w+22);
 let empty=null;
 for(const shift of shifts){const dx=shift.x,dz=shift.z;let safe=true,endY=base;
  if(Math.hypot(baseShift.x+dx,baseShift.z+dz)>42)continue;
  for(let n=1;n<=8;n++){const t=n/8,px=x+dx*t,pz=z+dz*t,py=heightAt(px,pz);endY=py;
   if(Math.abs(py-base)>4||Math.hypot(px-player.x,pz-player.z)<separation-1e-7||obstructed(px,py,pz,stone.w,nearby,stone.id)||clearStone&&!clearStone(stone,{x:dx*t,y:py-base,z:dz*t})){safe=false;break;}}
  if(safe&&Math.abs(baseShift.y+endY-base)<=8){const plan={stone,time,points:best.points,length:best.length,baseShift,shift:{x:dx,y:endY-base,z:dz}};
   // An alternative slide must not leave the stone across the crab's lane.
   // Moving the stone stays available even if that leaves no animal route.
   if(!best.length||!best.points.some(p=>Math.abs(p.x-x-dx)<stone.w*.8+5&&Math.abs(p.z-z-dz)<stone.w*.65+5&&p.y+9>endY&&p.y<endY+stone.h*1.4))return plan;
   empty??={...plan,points:[{x,y:base,z},{x,y:base,z}],length:0};
  }
 }return empty;
}
let knownRockIds;
export function readCoastPebbles(value){
 if(value===undefined)return undefined;
 knownRockIds??=new Set(COAST_ISLANDS.flatMap(i=>islandRockRecords(i).map(p=>p.id)));
 const fail=()=>{throw Error('小石の記録を読み取れません。元のセーブは残しています。');};
 if(!value||value.version!==1||!Array.isArray(value.stones)||value.stones.length>knownRockIds.size)fail();const seen=new Set();
 const stones=value.stones.map(p=>{if(!p||!knownRockIds.has(p.id)||seen.has(p.id)||![p.x,p.y,p.z].every(Number.isFinite)||Math.hypot(p.x,p.z)>42||Math.abs(p.y)>8)fail();seen.add(p.id);return{id:p.id,x:p.x,y:p.y,z:p.z};});return{version:1,stones};
}
export function createPebbleSequence(plan,{random=Math.random,time,treasure=false,waterAt=(x,z,t)=>coastWave(x,z,t).height}={}){
 // The route reaches below every possible wave; normally the real water
 // covers the whole crab sooner. End the close-up then, without watching an
 // empty seabed or keeping input locked for the rest of the planned route.
 const crab=!treasure&&plan.length>0&&random()<CRAB_ACTION.chance;let end=CRAB_ACTION.shift+(treasure?1.8:crab?CRAB_ACTION.reveal+CRAB_ACTION.escape:0),total=end+(crab||treasure?CRAB_ACTION.returnView:0),elapsed=0,escaped=false;
 return{plan,crab,treasure,get busy(){return elapsed<total;},get elapsed(){return elapsed;},advance(dt,paused=false){if(!paused){elapsed=Math.min(total,elapsed+Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0)));if(crab&&!escaped&&elapsed>=CRAB_ACTION.shift+CRAB_ACTION.reveal+CRAB_ACTION.minEscape){const p=this.pose();if(p.y+CRAB_ACTION.submerge<waterAt(p.x,p.z,time?.()??(plan.time??0)+elapsed)){escaped=true;end=elapsed;total=end+CRAB_ACTION.returnView;}}}return this.pose();},pose(){
  const age=Math.max(0,elapsed-CRAB_ACTION.shift),moveAge=Math.max(0,age-CRAB_ACTION.reveal);
  const t=Math.min(1,elapsed/CRAB_ACTION.shift),slide=t*t*(3-2*t),run=treasure?0:Math.min(1,moveAge/CRAB_ACTION.escape),v=run*(plan.points.length-1),n=Math.min(plan.points.length-2,Math.floor(v)),f=Math.min(1,v-n),a=plan.points[n],b=plan.points[n+1],ret=Math.max(0,Math.min(1,(total-elapsed)/CRAB_ACTION.returnView));
  return{slide,weight:slide*ret*ret*(3-2*ret),treasureVisible:treasure&&elapsed>=CRAB_ACTION.shift&&elapsed<end,visible:crab&&!escaped&&elapsed>=CRAB_ACTION.shift&&elapsed<end,x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f,heading:Math.atan2(b.x-a.x,b.z-a.z),age,moveAge,done:elapsed>=total};
 }};
}
export const PEBBLE_TREASURE=Object.freeze({name:'星砂のパーツ',amount:2,chance:.05,period:86400000,reveal:1.8});
export const pebbleFindCycle=at=>Math.floor(at/PEBBLE_TREASURE.period);
const findHash=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);return(h^(h>>>16))>>>0;};
let findRocks;export function pebbleFindRock(id){findRocks??=new Map(COAST_ISLANDS.flatMap(islandRockRecords).filter(p=>p.w<=22&&p.h<=18&&p.y>=0).map(p=>[p.id,p]));return findRocks.get(id);}
export const pebbleFindId=(stone,cycle)=>'pebble-find-'+stone.replace('coast-rock-','')+'-'+cycle;
export function pebbleFindOffer(source,stone,cycle){if(!/^[0-9a-f]{8}$/.test(source)||!Number.isSafeInteger(cycle)||cycle<0||cycle>1e9||!pebbleFindRock(stone))return null;return findHash(source+'|'+stone+'|'+cycle+'|pebble-find-1')%10000<500?{kind:'coast-pebble-find',id:pebbleFindId(stone,cycle),source,stone,cycle,amount:PEBBLE_TREASURE.amount}:null;}
export function validatePebbleFind(e,source=e?.source){const expected=pebbleFindOffer(source,e?.stone,e?.cycle);if(!expected||!e||Object.keys(e).sort().join('|')!=='amount|cycle|id|kind|source|stone'||Object.keys(expected).some(k=>expected[k]!==e[k]))throw Error('石の下で見つけたパーツの記録を残して止めました。');return e;}
export function assertPebbleFindAccess(world,stone){const rock=pebbleFindRock(stone),p=world?.position;if(!rock||world?.map!=='coast'||world.ufoBoarded||!p||![p.x,p.y,p.z].every(Number.isFinite)||Math.hypot(p.x-rock.worldX,p.z-rock.worldZ)>CRAB_ACTION.reach+42||Math.abs(p.y-coastWalkingHeight(p.x,p.z))>24||!readCoastPebbles(world.coastPebbles))throw Error('動かした小石の近くに立ってね。');}

