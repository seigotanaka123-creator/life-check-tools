import {MIX_DURATION_MS,CURE_DURATION_MS} from './mixing.mjs';

// Keep active play time separate from controls and serialized save jobs.
// Only committed elapsed time consumes the pending budget, including after retry.
export function createFreeProgressClock(){
 const tracks={mix:null,cure:null};let last='cure';
 function sync(f,seconds=0){
  const dt=Number.isFinite(seconds)?Math.max(0,Math.min(.05,seconds))*1000:0;
  const specs={mix:f.mixer.pending?{id:f.mixer.pending.id,elapsed:f.mixer.pending.elapsedMs,duration:MIX_DURATION_MS}:null,cure:f.stage==='curing'?{id:JSON.stringify([f.location,f.mask,f.fill]),elapsed:f.elapsedMs,duration:CURE_DURATION_MS}:null};
  for(const name of ['mix','cure']){
   const s=specs[name];if(!s){tracks[name]=null;continue;}
   let t=tracks[name];if(!t||t.id!==s.id||s.elapsed<t.elapsed)t=tracks[name]={...s,pending:0};
   t.pending=Math.min(s.duration-s.elapsed,Math.max(0,t.pending-(s.elapsed-t.elapsed))+dt);t.elapsed=s.elapsed;
  }
 }
 return {reset(){tracks.mix=tracks.cure=null;last='cure';},sync,next(f){sync(f);for(const name of last==='mix'?['cure','mix']:['mix','cure']){const t=tracks[name];if(!t)continue;const remaining=t.duration-t.elapsed,elapsedMs=Math.min(remaining,Math.floor(t.pending+1e-7));if(elapsedMs>=1000||elapsedMs===remaining&&remaining>0){last=name;return{type:name==='mix'?'FREE_MIX_TICK':'FREE_CURE_TICK',elapsedMs};}}return null;}};
}
