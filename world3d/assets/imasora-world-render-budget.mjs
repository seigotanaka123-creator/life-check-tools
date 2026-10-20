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
