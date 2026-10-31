import {UNCHARTED_ISLAND as I} from './imasora-coast-geography.mjs?v=120li';
import {coastWalkingHeight} from './imasora-coast-layout.mjs?v=120mx';
import {onCaveStone} from './imasora-coast-tide-cave.mjs?v=120mx';

const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).sort().join('|')===keys;
export function validateCoastExploration(value){
 if(value===undefined)return;
 if(!exact(value,'tideCave|version')||value.version!==1||!(exact(value.tideCave,'bestMs')||exact(value.tideCave,'bestMs|splitsMs'))||!Number.isSafeInteger(value.tideCave.bestMs)||value.tideCave.bestMs<1000||value.tideCave.bestMs>86400000)throw Error('島の冒険記録をたしかめよう。');
 if(Object.hasOwn(value.tideCave,'splitsMs')){
  const s=value.tideCave.splitsMs;
  if(!Array.isArray(s)||s.length!==6||Object.keys(s).join('|')!=='0|1|2|3|4|5'||s.some((ms,i)=>!Number.isSafeInteger(ms)||ms<0||ms>value.tideCave.bestMs||(i>0&&ms<s[i-1]))||s[5]!==value.tideCave.bestMs)throw Error('浮き石の記録をたしかめよう。');
 }
}
export function caveFinish(p){if(!p||![p.x,p.y,p.z].every(Number.isFinite)||Math.abs(p.x-I.x)>=48||p.z<I.landingZ+535||p.z>I.landingZ+680)return false;const h=coastWalkingHeight(p.x,p.z);return h>=5&&Math.abs(p.y-h)<.5;}
export function caveExitNearby(p){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x-I.x)<80&&p.z>=I.landingZ+503&&p.z<=I.landingZ+712;}
function finishContact(c){
 const p=c.position;if(caveFinish(p))return {x:p.x,y:p.y,z:p.z};
 const q=c.groundContact;
 // This is a real terrain contact supplied by the body solver, not a wider
 // finish trigger. Airborne bodies, remote points and water cannot finish.
 if(!q||![q.x,q.y,q.z,q.floor].every(Number.isFinite)||Math.abs(q.floor-p.y)>.24||Math.hypot(q.x-p.x,q.z-p.z)>32||q.y<p.y-.5||q.y-p.y>40||!caveFinish(q))return null;
 return {x:q.x,y:q.y,z:q.z};
}
export function nextCaveRecord(previous,milliseconds,splitsMs){validateCoastExploration(previous);const next={version:1,tideCave:{bestMs:milliseconds,...(splitsMs===undefined?{}:{splitsMs})}};validateCoastExploration(next);if(previous&&(previous.tideCave.bestMs<milliseconds||previous.tideCave.bestMs===milliseconds&&(previous.tideCave.splitsMs||splitsMs===undefined)))return previous;return {version:1,tideCave:{...next.tideCave,...(splitsMs===undefined?{}:{splitsMs:[...splitsMs]})}};}
export const caveTime=ms=>(ms/1000).toFixed(1)+'秒';
export function cavePace(split,index,reference){
 const expected=reference?.splitsMs?.[index];if(!Number.isFinite(split)||!Number.isFinite(expected))return '';
 const gap=split-expected;if(Math.abs(gap)<50)return 'ベストと同じペース';
 return 'ベストより '+caveTime(Math.abs(gap))+(gap<0?'速い':'ゆっくり');
}

// A run starts by stepping onto the first stone from the entrance. There is no
// start dialog, deadline or cost. A bank/boat/teleport ends only the optional run.
export function createCaveCrossing(){
 let armed=false,running=false,next=0,elapsed=0,last=null,splits=[];
 const reset=()=>{armed=running=false;next=0;elapsed=0;last=null;splits=[];};
 function update(dt,c,stones){
  if(!c||c.map!=='coast'||c.riding){reset();return null;}
  if(c.paused){last=null;return null;}
  const p=c.position;if(!p||![p.x,p.y,p.z,dt].every(Number.isFinite)||dt<0){reset();return null;}
  const dx=p.x-I.x,dz=p.z-I.landingZ;
  if(Math.abs(dx)>160||dz<100||dz>720){reset();return null;}
  if(last&&Math.hypot(p.x-last.x,p.z-last.z)>400*Math.min(.1,dt)+12){reset();return null;}
  last={x:p.x,z:p.z};
  if(c.grounded&&dz>=125&&dz<=182&&Math.abs(dx)<85){armed=true;running=false;elapsed=0;next=0;splits=[];return null;}
  const index=c.grounded?stones.findIndex(s=>onCaveStone(s,p.x,p.z)&&Math.abs(s.y-p.y)<.8):-1;
  if(!running){if(armed&&index===0){running=true;armed=false;next=1;elapsed=0;}return null;}
  elapsed+=Math.min(.1,dt)*1000;
  if(elapsed>86400000){reset();return null;}
  if(index>=0){if(index>next){reset();return null;}if(index===next){splits.push(Math.round(elapsed));next++;}return null;}
  if(c.grounded){
   const finish=next===stones.length?finishContact(c):null,ms=Math.max(1000,Math.round(elapsed)),splitsMs=[...splits,ms];reset();
   return finish?{milliseconds:ms,finish,splitsMs}:null;
  }
  return null;
 }
 return{update,reset,get armed(){return armed;},get running(){return running;},get visited(){return next;},get elapsed(){return elapsed;},get lastSplit(){return splits.at(-1);}};
}
