import{huntFanExposure}from'./imasora-sliding-tag-hunt-fan.mjs';
import{huntPermanentToolUseful}from'./imasora-sliding-tag-hunt-sight.mjs';
import{huntGadgetPlacement,huntGadgetRadius,huntHookAnchor}from'./imasora-sliding-tag-hunt-placement.mjs';
import{BODY,worldHeight,worldSurface,worldSight,worldTraversable,worldRoute,worldRouteLookahead,worldSteering}from'./imasora-sliding-tag-hunt-world.mjs';
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const priority={radar:4,cloak:7,speed:6,curtain:5,clone:4,cushion:4,hook:6,fan:6,sheet:2};
const optical=item=>item==='cloak'||item==='curtain';
function fooledByCover(s,t){return!((t.clearSightUntil??0)>s.time)&&!(t.airborne&&(t.airborneUntil??t.at+.9)>s.time);}
function usefulCover(s){const near=(s.player.brain.escapeThreats??[]).filter(t=>gap(s.player,t)<76);return!near.length||near.some(t=>fooledByCover(s,t));}
function safeReplacementSeen(s){const a=s.player,m=a.brain;return(m.escapeThreats??[]).every(t=>gap(a,t)>55)&&Object.values(m.supplyMemory??{}).some(p=>!optical(p.type)&&priority[p.type]&&s.time-p.at<=.5&&gap(a,p)<20&&worldTraversable(a,p,a.radius+.2));}
function safeSupply(a,p,path,threats){let travelled=0,from=a;const speed=BODY.dash*(a.tuning?.speed??1);for(const to of path){travelled+=gap(from,to);const at=travelled/Math.max(15,speed)+.85;for(const t of threats){const visible=worldSight({...t,y:t.y+3},{...to,y:worldHeight(to.x,to.z)+3}),reach=BODY.dash*at*(visible?1:.35);if(gap(t,to)-a.radius-t.radius-reach<9)return false;}from=to;}return threats.every(t=>gap(a,t)>a.radius+t.radius+12);}
function safeRemainingSupply(s,a,plan,seen,threats){
 // Immediate danger never waits for the bounded route review. Only observed
 // threats enter this check; the next three bends are enough for this horizon.
 if(threats.some(t=>gap(a,t)<=a.radius+t.radius+12))return false;
 if(s.time<(plan.riskCheckAt??0))return true;plan.riskCheckAt=s.time+.2;
 const at=plan.at??0,path=seen.pullUntil>s.time?[seen]:plan.path.slice(at,at+3);
 // A jump or fall may leave the remembered walking route on another tread.
 // Replan through the normal routes instead of pushing forever at its riser.
 if(a.grounded&&path[0]&&!worldTraversable(a,path[0],a.radius+.2))return false;
 return safeSupply(a,seen,path.length?path:[seen],threats);
}
// Remember only supplies actually seen. At most two extra routes per .6 s.
export function runnerSupplyControl(s,input,{itemVisible=()=>false,usableOnly=false}={}){const a=s.player,m=a.brain,threats=m.escapeThreats??[];
 if(s.time>=(m.runnerScanAt??0)){m.runnerScanAt=s.time+.4;const memory=m.supplyMemory??{};for(const [id,p]of Object.entries(memory))if(s.time-p.at>6)delete memory[id];for(const p of s.pickups)if(p.audience==='player'&&gap(a,p)<72&&itemVisible(p)){const ownPull=p.pull?.owner===a.owner&&p.pull.until>s.time;if(p.readyAt<=s.time&&(!p.pull||ownPull)&&(!usableOnly||huntPermanentToolUseful(s,a,p.type)))memory[p.id]={id:p.id,x:p.x,y:p.y,z:p.z,lift:p.lift,type:p.type,at:s.time,pullUntil:ownPull?p.pull.until:0};else delete memory[p.id];}m.supplyMemory=memory;}
 if(a.item||a.trampolineBoost||m.trampolineApproach||a.flight||a.hook){m.supply=null;return input;}
 const coverUseful=usefulCover(s),prior=m.supply;if(prior){const seen=m.supplyMemory?.[prior.id];if(!prior.point||!prior.path||!seen||usableOnly&&!huntPermanentToolUseful(s,a,seen.type)||optical(seen.type)&&!coverUseful||!safeRemainingSupply(s,a,prior,seen,threats))m.supply=null;
  else if(seen.pullUntil>s.time){
   // Follow a moving tool only while our own pull is still seen. Physical
   // movement and collision still decide when the tool is actually touched.
   if(s.time-seen.at>.5)m.supply=null;else if(s.time>=(prior.pullCheckAt??0)){prior.pullCheckAt=s.time+.2;if(!worldTraversable(a,seen,a.radius+.2))m.supply=null;}
   if(m.supply){if(prior.point!==seen||prior.path.length!==1){prior.path=[seen];prior.at=0;}prior.point=seen;}
  }else if(gap(prior.point,seen)>1.5)m.supply=null;else prior.point=seen;
 }
 if(!m.supply&&a.grounded&&s.time>=(m.runnerSupplyAt??0)){m.runnerSupplyAt=s.time+.6;const options=Object.values(m.supplyMemory??{}).filter(p=>(!usableOnly||huntPermanentToolUseful(s,a,p.type))&&(!optical(p.type)||coverUseful)&&gap(a,p)<76&&(!(p.pullUntil>s.time)||s.time-p.at<=.5)).sort((p,q)=>((q.pullUntil>s.time?100:0)+priority[q.type]*3-gap(a,q)*.15)-((p.pullUntil>s.time?100:0)+priority[p.type]*3-gap(a,p)*.15));for(const p of options.slice(0,2)){const path=worldRoute(a,p);if(path.length&&safeSupply(a,p,path,threats)){m.supply={id:p.id,point:p,path,at:worldRouteLookahead(a,path,0,threats)};break;}}}
 const supply=m.supply;if(!supply)return input;const p=supply.point,d=gap(a,p);
 const path=supply.path;while(supply.at<path.length-1&&gap(a,path[supply.at])<3)supply.at++;const goal=path[supply.at]??p;
 // An elevated sole can stop a fraction outside the ordinary jump range.
 // Begin slightly earlier at a raised pickup; flat-ground timing is unchanged.
 if(d>a.radius+6+(p.y>a.y+.3?.5:0))return worldSteering(a,goal,path[supply.at+1],{sprint:true,room:6});
 // Plan ordinary repeated jumps and steering; contact can collect sooner.
 const out={...input,dash:false,x:clamp((p.x-a.x)*.35-a.vx*.45,-1,1),z:clamp((p.z-a.z)*.35-a.vz*.45,-1,1)};
 if(a.grounded){m.supplyJumpAt=s.time+.24;out.jump=true;}else if(a.jumps===1&&s.time>=m.supplyJumpAt)out.jump=!a.jumpHeld;else out.jump=a.vy>0;return out;
}
// A tactic returns an aim, not a position/velocity/stat change. Every action is
// still subject to the ordinary inventory, range, collision and cooldown rules.
function cushionThreatInLane(runner,threat,time){
 if(!threat||threat.radar||!(time-threat.at<.15&&Math.abs(threat.y-runner.y)<6))return false;
 const distance=gap(runner,threat);
 if(distance<=8||distance>=42)return false;
 const lead=Math.min(.45,distance/32),dx=threat.x+(threat.vx??0)*lead-runner.x,dz=threat.z+(threat.vz??0)*lead-runner.z;
 const sin=Math.sin(runner.yaw),cos=Math.cos(runner.yaw);
 const back=-(dx*sin+dz*cos),across=Math.abs(dx*cos-dz*sin);
 return back>8&&across<3+(threat.radius??3)+1.5;
}
export function runnerItemTactic(s,input,{checkAllCushionThreats=false,checkFanExposure=false}={}){const a=s.player,m=a.brain,item=a.item,threats=m.escapeThreats??[],t=threats[0],distance=t?gap(a,t):Infinity,now=s.time,active=k=>(a.effects[k]??0)>now;
 if(a.hook&&m.releaseHook&&!a.flight)return{yaw:a.yaw,item:'hook-release'};if(!item||a.flight||now<(m.nextToolAt??0)||item==='hook'&&!m.hookReady)return null;const speed=Math.hypot(a.vx,a.vz),n=Math.hypot(input.x,input.z),heading=n>.1?Math.atan2(input.x,input.z):a.yaw;
 const straight=worldTraversable(a,{x:a.x+Math.sin(heading)*24,z:a.z+Math.cos(heading)*24},a.radius+.2),visible=t&&!t.radar&&now-t.at<.15,closing=t?((a.vx-t.vx)*(t.x-a.x)+(a.vz-t.vz)*(t.z-a.z))/(distance||1):0;
 let yaw=heading,use=false;
 if(item==='speed')use=!active('speed')&&distance<75&&straight&&(distance<45||closing>2||threats.length>1);
 else if(item==='cloak'){
  const cover=threats.filter(t=>fooledByCover(s,t)&&gap(a,t)<55),p=cover[0],d=p?gap(a,p):Infinity,closingCover=p?((a.vx-p.vx)*(p.x-a.x)+(a.vz-p.vz)*(p.z-a.z))/(d||1):0;
  use=!active('cloak')&&(p&&(d<32||cover.length>1||closingCover>3)||!usefulCover(s)&&safeReplacementSeen(s));
 }
 else if(item==='hook')use=!!m.hookReady;
 else if(item==='cushion'){
  yaw=a.yaw;
  use=checkAllCushionThreats?threats.some(threat=>cushionThreatInLane(a,threat,now)):cushionThreatInLane(a,t,now);
 }
 else if(item==='clone'){if(distance<85&&(!visible||distance<38||!straight)){for(const offset of[(s.config.seed&1?1:-1)*.95,(s.config.seed&1?-1:1)*.95]){const p={x:a.x+Math.sin(heading+offset)*28,z:a.z+Math.cos(heading+offset)*28};if(worldTraversable(a,p,a.radius+.2)&&(!t||gap(p,t)>distance*.75)){yaw=heading+offset;use=true;break;}}}}
 else if(item==='curtain'){
  const p=threats.find(p=>fooledByCover(s,p)&&gap(a,p)>20&&gap(a,p)<75&&p.y-a.y<5);
  if(p){yaw=Math.atan2(p.x-a.x,p.z-a.z);use=true;}
  else if(!usefulCover(s)&&safeReplacementSeen(s)){yaw=heading+Math.PI;use=true;}
 }
 else if(item==='sheet'){if(distance>20&&distance<75&&t.y-a.y<5){yaw=Math.atan2(t.x-a.x,t.z-a.z);use=true;}}
 else if(item==='fan'&&checkFanExposure){
  for(const threat of threats){
   if(threat.radar||!(now-threat.at<.15))continue;
   const aim=Math.atan2(threat.x-a.x,threat.z-a.z);
   const placement=huntGadgetPlacement(s,a,item,aim);
   if(placement&&huntFanExposure(threat,{...placement,kind:item,yaw:aim,until:now+1},now))return{yaw:aim,item};
  }
  return null;
 }
 else if(item==='fan'){if(visible&&distance>20&&distance<55){yaw=Math.atan2(t.x-a.x,t.z-a.z);use=true;}}
 else if(item==='radar')use=!active('radar')&&!visible;
 if(!use)return null;
 if(item==='hook'&&!huntHookAnchor({...a,yaw},s)){m.nextToolAt=now+.25;return null;}
 if(huntGadgetRadius(item,a)!==null){const alternatives=['curtain','sheet'].includes(item)?[0,.5,-.5,1,-1,Math.PI]:['clone'].includes(item)?[0,.25,-.25]:[0];let found=null;for(const offset of alternatives){const aim=yaw+offset,placement=huntGadgetPlacement(s,a,item,aim);if(!placement)continue;if(['clone'].includes(item)&&!worldTraversable(a,{x:a.x+Math.sin(aim)*28,z:a.z+Math.cos(aim)*28},a.radius+.2))continue;found=aim;break;}if(found===null){m.nextToolAt=now+.25;return null;}yaw=found;}
 return{yaw,item};
}
