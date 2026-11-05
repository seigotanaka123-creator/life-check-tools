import{RANDOM_START_DATA as data}from'./imasora-sliding-tag-hunt-random-start-data.mjs';
import{WORLD_CORNER_STAIRS,worldHeight,worldValid,worldSight}from'./imasora-sliding-tag-hunt-world.mjs';
// New raised terrain must not leave a starting actor facing an immediate riser.
function groundedStart(p){let{x,z}=p;for(const c of WORLD_CORNER_STAIRS){const u=(c.x-x)*c.sx,v=(c.z-z)*c.sz;if(u>c.rampWidth&&v>c.rampWidth&&u<=c.span&&v<=c.span){if(u<=v)x=c.x-c.sx*16;else z=c.z-c.sz*16;break;}}return Object.freeze({...p,x,z,y:worldHeight(x,z)});}
export const RUNNER_STARTS=Object.freeze(data.runners.map(groundedStart));
export const HUNTER_STARTS=Object.freeze(data.hunters.map(groundedStart));
export const RANDOM_START_LAYOUTS=Object.freeze(data.layouts.map(rows=>Object.freeze(rows.map(r=>Object.freeze([...r])))));
export const MIN_OPPONENT_START_GAP=180,MIN_HUNTER_START_GAP=85;
const leads=HUNTER_STARTS.map((_,h)=>RANDOM_START_LAYOUTS.flatMap((rows,r)=>rows.filter(t=>t[0]===h).map(t=>({r,t}))));
if(RUNNER_STARTS.length!==20||HUNTER_STARTS.length!==20||leads.some(r=>!r.length))throw Error('INCOMPLETE_RANDOM_STARTS');
export function mixHuntStartSeed(n){n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);return(n^(n>>>16))>>>0;}
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function randomHuntStart(random,mode='escape'){
 if(!['escape','hunt'].includes(mode))throw Error('INVALID_RANDOM_START_MODE');
 // Mix sequential seeds before the role/start draw; all subsequent choices
 // still use the round's recorded deterministic generator.
 for(let i=0;i<4;i++)random();const pick=n=>{const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error('INVALID_START_RANDOM');return Math.floor(r*n);};
 let r,t;if(mode==='hunt'){const rows=leads[pick(20)],row=rows[pick(rows.length)];r=row.r;t=[...row.t];}else{r=pick(20);const rows=RANDOM_START_LAYOUTS[r];t=[...rows[pick(rows.length)]];for(let i=2;i>0;i--){const j=pick(i+1);[t[i],t[j]]=[t[j],t[i]];}}
 const runner={...RUNNER_STARTS[r]},hunters=t.map(i=>({...HUNTER_STARTS[i]})),all=[runner,...hunters];
 for(const p of all)if(!worldValid(p,6.2)||Math.abs(p.y-worldHeight(p.x,p.z))>.001)throw Error('UNSAFE_RANDOM_START');
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(gap(all[i],all[j])<(i===0?MIN_OPPONENT_START_GAP:MIN_HUNTER_START_GAP)||worldSight({...all[i],y:all[i].y+3},{...all[j],y:all[j].y+3}))throw Error('UNSAFE_RANDOM_START');
 return{runner,hunters};
}
