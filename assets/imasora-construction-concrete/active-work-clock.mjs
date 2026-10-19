// Fixed plumbing and curing do not need a physics substep. Measure visible,
// active time instead of the world's capped movement delta at a low frame rate.
// Pausing clears the first interval, so closing a tab earns no offline progress.
export function createActiveWorkClock(now=()=>performance.now()){
 let last=null,resuming=true;
 return{pause(){last=null;resuming=true;},step(active){const t=now(),delta=last===null?0:Math.max(0,Math.min(1000,t-last));last=t;if(!active){resuming=true;return 0;}if(resuming){resuming=false;return 0;}return delta;}};
}
