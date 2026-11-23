// Bound queued construction draws while leaving enough frames for the GPU
// pipeline. Input and simulation advance on every callback.
export function createWorldDrawBackpressure(gl){
 const fences=[],queueLimit=3;
 let unavailable=typeof gl?.fenceSync!=='function'||typeof gl.clientWaitSync!=='function';
 const release=()=>{for(const fence of fences)gl.deleteSync(fence);fences.length=0;};
 return {
  ready(active){
   if(!active){release();return true;}
   if(unavailable||fences.length<queueLimit)return true;
   while(fences.length){
    const status=gl.clientWaitSync(fences[0],0,0);
    if(status===gl.TIMEOUT_EXPIRED)break;
    gl.deleteSync(fences.shift());
    if(status===gl.WAIT_FAILED){release();unavailable=true;return true;}
   }
   return fences.length<queueLimit;
  },
  submitted(active){
   if(!active||unavailable)return;
   const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);
   if(fence!==null){fences.push(fence);gl.flush();}
  }
 };
}

// Presentation only: lower expensive shadow/pixel work after sustained slow
// frames. A single save, startup compilation or a hidden tab is not a signal.
export function createRenderBudget({apply}={}) {
 let level=0,last=null,warmUntil=null,start=null,samples=[];
 const reset=()=>{start=null;samples=[];};
 return {get level(){return level;},observe(now,{active=true}={}){
  if(!Number.isFinite(now))return;
  if(!active){last=null;warmUntil=null;reset();return;}
  if(last===null){last=now;warmUntil=now+1500;return;}
  const elapsed=now-last;last=now;
  if(elapsed<=0||elapsed>1000){reset();return;}
  if(now<warmUntil||level>=2)return;
  start??=now;samples.push(elapsed);
  if(samples.length<12||now-start<1000)return;
  const sorted=samples.slice().sort((a,b)=>a-b),mean=samples.reduce((a,b)=>a+b,0)/samples.length;
  const slow=mean>36&&sorted[Math.floor(sorted.length*.9)]>42;
  reset();if(!slow)return;
  level++;apply?.(level);warmUntil=now+2000;
 }};
}
