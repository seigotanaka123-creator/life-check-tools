import {SHOVEL_STROKE} from './imasora-construction-shovel-work.mjs';
import {dumpUnloadVisual} from './imasora-construction-dump-work.mjs';
// Pour links store their duration inside the checked physical plan. Boarding
// links store it on the link itself. Keep both shapes finite for the DOM meter.
export function transportWorkProgress(work){
 const job=work.frame.job??work.scoop??work.unload??work.link;
 if(!job)return 0;
 const duration=work.frame.job?SHOVEL_STROKE:work.scoop?work.scoop.plan.duration:['pour','storage'].includes(work.link?.kind)?work.link.plan.duration:work.link?.duration;
 const value=work.unload?dumpUnloadVisual(work).progress*100:job.elapsed/duration*100;
 return Number.isFinite(value)?Math.max(0,Math.min(100,value)):0;
}
