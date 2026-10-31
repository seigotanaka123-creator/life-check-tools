// Keep initial scene construction in its original order, with paint/input gaps.
// Ordinary in-game rebuilds remain synchronous, so collisions never use half a map.
// An explicit trip from town must win over a bookmark on a different map.
// Reopening the same destination still resumes the saved position and work.
export function completedTownArrivalUrl(href,currentMap){
 const url=new URL(href),target={'town-bridge1':'construction','town-bridge2':'coast'}[url.searchParams.get('arrival')];
 if(!target||target!==currentMap)return null;
 url.searchParams.delete('arrival');return url.href;
}
export function shouldApplyTownArrival(saved,{arrival,auto=false}={}){
 const target={'town-bridge1':'construction','town-bridge2':'coast'}[arrival];
 if(!target)return false;
 if(saved?.map!==target)return true;
 return !auto&&saved?.autoSaveVersion!==1;
}
// Animation frames can stop entirely while a phone backgrounds or restores a
// tab. Scene preparation must not depend on receiving one to finish loading.
export function nextWorldSceneTask({frame=globalThis.requestAnimationFrame,cancel=globalThis.cancelAnimationFrame,timer=setTimeout,clear=clearTimeout}={}){
 return new Promise(resolve=>{let done=false,frameId=null,timerId=null;const finish=()=>{if(done)return;done=true;if(frameId!==null)cancel?.(frameId);if(timerId!==null)clear(timerId);resolve();};timerId=timer(finish,50);if(typeof frame==='function')frameId=frame(finish);});
}
const nextPaint=nextWorldSceneTask;
export async function buildWorldSceneSteps(steps,{yieldTask=nextPaint,sliceMs=8,now=()=>performance.now()}={}){
 let deadline=now()+sliceMs;
 for(const step of steps){if(now()>=deadline){await yieldTask();deadline=now()+sliceMs;}}
}
