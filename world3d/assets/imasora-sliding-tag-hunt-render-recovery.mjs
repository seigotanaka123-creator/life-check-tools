// Rendering can disappear while a mobile browser still runs timers and input.
// Suspend the existing round, never replace it or simulate hidden catch-up.
export function createHuntRenderRecovery({canvas,isActive,suspend,restore,onStatus=()=>{}}){
 let lost=false,resumePending=false,disposed=false,losses=0,restores=0;
 const publish=()=>onStatus({lost,resumePending,losses,restores});
 function onLost(event){
  event.preventDefault();
  if(disposed||lost)return;
  resumePending=!!isActive();lost=true;losses++;
  suspend();publish();
 }
 function onRestored(){
  if(disposed||!lost)return;
  const resume=resumePending;lost=false;resumePending=false;restores++;
  restore(resume);publish();
 }
 canvas.addEventListener('webglcontextlost',onLost);
 canvas.addEventListener('webglcontextrestored',onRestored);
 return{get lost(){return lost;},cancelResume(){if(resumePending){resumePending=false;publish();}},
  dispose(){disposed=true;resumePending=false;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);},
  stats:()=>({lost,resumePending,losses,restores})};
}
