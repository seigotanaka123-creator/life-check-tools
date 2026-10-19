// Keep initial scene construction in its original order, with paint/input gaps.
// Ordinary in-game rebuilds remain synchronous, so collisions never use half a map.
const nextPaint=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
export async function buildWorldSceneSteps(steps,{yieldTask=nextPaint,sliceMs=8,now=()=>performance.now()}={}){
 let deadline=now()+sliceMs;
 for(const step of steps){if(now()>=deadline){await yieldTask();deadline=now()+sliceMs;}}
}
