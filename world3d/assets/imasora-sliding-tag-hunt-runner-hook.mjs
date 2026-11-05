import{worldHeight}from'./imasora-sliding-tag-hunt-world.mjs';
import{HOOK_POLES}from'./imasora-sliding-tag-hunt-items.mjs';
import{huntHookAnchor}from'./imasora-sliding-tag-hunt-placement.mjs';
const key=p=>p.x+':'+p.z,gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const RUNNER_HOOK=Object.freeze({scan:.4,plan:.2,memory:6,sight:132,approach:21,urgent:26});
// Observed poles and remembered threats only. Do not detour toward unseen poles.
export function runnerHookControl(s,input,{poleVisible=()=>false}={}){
 const a=s.player,m=a.brain;m.hookReady=false;m.releaseHook=false;m.hookPlan=null;
 if(a.hook||a.item!=='hook'||a.flight||a.trampolineBoost||m.trampolineApproach)return input;
 if(s.time>=(m.hookScanAt??0)){m.hookScanAt=s.time+RUNNER_HOOK.scan;const memory=m.hookMemory??{};for(const[id,p]of Object.entries(memory))if(s.time-p.at>RUNNER_HOOK.memory)delete memory[id];for(const p of HOOK_POLES){const pole={...p,y:worldHeight(p.x,p.z)+4};if(gap(a,pole)<RUNNER_HOOK.sight&&poleVisible(pole))memory[key(pole)]={...pole,at:s.time};}m.hookMemory=memory;}
 if(!Object.keys(m.hookMemory??{}).length){m.hookQuick=null;return input;}
 const n=Math.hypot(input.x??0,input.z??0),aim=n>.1?Math.atan2(input.x,input.z):a.yaw,last=m.hookQuickFrom;
 if(s.time>=(m.hookPlanAt??0)||!last||gap(a,last)>6||Math.abs(Math.atan2(Math.sin(aim-last.yaw),Math.cos(aim-last.yaw)))>.4){m.hookPlanAt=s.time+RUNNER_HOOK.plan;m.hookQuickFrom={x:a.x,z:a.z,yaw:aim};const p=huntHookAnchor({...a,yaw:aim},s,p=>!!m.hookMemory[key(p)]);m.hookQuick=p&&m.hookMemory?.[key(p)]&&(m.escapeThreats??[]).every(t=>gap(t,p.landing)>a.radius+t.radius+9)?p:null;}
 m.hookReady=!!m.hookQuick&&!!m.hookMemory?.[key(m.hookQuick)];return input;
}
