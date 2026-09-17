// Runtime-only escape assistance. It never edits the soil ledger or checkpoints.
import {armIntersections,contactBlocker,moveArm,spoilPenetrations,EX} from './imasora-construction-excavator.js';

const SPEED={boom:.5,stick:.65,curl:.75,slew:.62};
const KEYS=Object.keys(SPEED),LIMITS={boom:[EX.boomMin,EX.boomMax],stick:[-2.55,-Math.PI/6],curl:[-1.25,1.1],slew:[-EX.slewLimit,EX.slewLimit]};
const DIRECTIONS=[];
for(const boom of[-1,0,1])for(const stick of[-1,0,1])for(const curl of[-1,0,1])for(const slew of[-1,0,1])if(boom||stick||curl||slew)DIRECTIONS.push({boom,stick,curl,slew});
const score=state=>[...spoilPenetrations(state).values()].reduce((sum,n)=>sum+n,0);
const anchor=s=>[...KEYS.map(k=>s.arm[k]),s.loader.vehicle.x,s.loader.vehicle.z,s.loader.vehicle.heading,s.revision,s.serial,s.load];
const same=(a,b)=>a?.length===b.length&&a.every((v,i)=>v===b[i]);
const output=(work,cursor,done=false,blocked='')=>({work,cursor,done,blocked});
function proposed(work,direction,dt){
 const arm={...work.arm};
 for(const k of KEYS){const[low,high]=LIMITS[k];
  // Older v3 saves may be more extended. Recover by small retraction steps;
  // neither snap those saves to -30 degrees nor extend them farther.
  const maximum=k==='stick'?Math.max(high,work.arm.stick):high;
  arm[k]=Math.max(low,Math.min(maximum,arm[k]+direction[k]*SPEED[k]*dt));
 }return {...work,arm};
}
function apply(work,cursor,candidate,stepDt){
 const input={coordinated:true};
 for(const k of KEYS)input[k]=(candidate.arm[k]-work.arm[k])/(SPEED[k]*stepDt)*(k==='slew'?-1:1);
 const next=moveArm(work,input,stepDt);
 if(next.hit||KEYS.every(k=>next.arm[k]===work.arm[k]))return output(next,null,false,next.hit||'排土から離れる経路を確保できませんでした。');
 const hits=armIntersections(next);
 if(!hits.size)return output(next,null,true);
 return output(next,{...cursor,anchor:anchor(next),moves:cursor.moves+1,index:0,best:null});
}

// Search work is capped at four poses per call. An accepted direction is reused
// on later frames, while every tiny physical move still passes the core guard.
export function stepSpoilRecovery(work,cursor,dt){
 if(!Number.isFinite(dt)||dt<=0||dt>.05)throw Error('更新刻みが不正です');
 const hits=armIntersections(work);
 if(!hits.size)return output(work,null,true);
 const hard=[...hits].find(id=>!id.startsWith('排土:'));
 if(hard)return output(work,null,false,hard);
 if(work.loader.mode!=='working'||work.action)return output(work,null,false,'作業状態が変わったため、接触からの復帰を停止しました。');
 const stepDt=Math.min(dt,.004),current=anchor(work),elapsed=(cursor?.elapsed||0)+dt;
 let c={elapsed,moves:cursor?.moves||0,probes:cursor?.probes||0,anchor:current,stepDt,index:0,best:null,last:null};
 if(cursor&&same(cursor.anchor,current)&&cursor.stepDt===stepDt)c={...cursor,elapsed};
 if(c.elapsed>8||c.moves>=600||c.probes>=2048)return output(work,null,false,'排土から離れる経路を時間内に確保できませんでした。');
 const beforeScore=score(work);
 let budget=4;
 function probe(direction){
  budget--;c.probes++;
  const candidate=proposed(work,direction,stepDt);
  if(KEYS.every(k=>candidate.arm[k]===work.arm[k])||contactBlocker(work,candidate))return null;
  const value=score(candidate);
  return value<beforeScore-1e-8?{direction,value,candidate}:null;
 }
 if(c.last){const previous=probe(c.last);if(previous)return apply(work,c,previous.candidate,stepDt);c.last=null;}
 while(budget>0&&c.index<DIRECTIONS.length){
  const p=probe(DIRECTIONS[c.index++]);
  if(p&&(!c.best||p.value<c.best.value))c.best={direction:p.direction,value:p.value};
 }
 if(c.index<DIRECTIONS.length)return output(work,c);
 if(!c.best)return output(work,null,false,'排土から離れる安全な経路が見つかりませんでした。');
 c.last=c.best.direction;
 return apply(work,c,proposed(work,c.last,stepDt),stepDt);
}
