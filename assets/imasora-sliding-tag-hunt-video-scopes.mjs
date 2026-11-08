import{createHuntVideoShare,HUNT_FULL_VIDEO_MAX_BYTES,HUNT_VIDEO_MAX_BYTES}from'./imasora-sliding-tag-hunt-video.mjs';
// Two bounded clips for the current round only. Choosing a view never silently
// discards the other completed video or starts an external share.
export function createHuntScopedVideoShare({onChange=()=>{},...options}={}){
 let scope='finish',ticket=null;const banks={};
 const busy=()=>Object.values(banks).some(bank=>['preparing','busy'].includes(bank.snapshot().status));
 const snapshot=()=>({...banks[scope].snapshot(),ticket:banks[scope].snapshot().ticket??ticket,scope,blocked:busy()});
 function emit(){try{onChange(snapshot());}catch{}}
 for(const key of['finish','full'])banks[key]=createHuntVideoShare({...options,maxBytes:key==='full'?HUNT_FULL_VIDEO_MAX_BYTES:HUNT_VIDEO_MAX_BYTES,fileSuffix:key==='full'?'-full':'',onChange:()=>emit()});
 return{
  get scope(){return scope;},snapshot,
  select(next){if(!banks[next]||busy())return false;scope=next;emit();return true;},
  prepare(id,work,{scope:key=scope}={}){if(!banks[key]||busy())return Promise.resolve(false);if(ticket!==null&&id!==ticket){for(const bank of Object.values(banks))bank.reset();}ticket=id;return banks[key].prepare(id,work);},
  activate(download,options){if(busy())return Promise.resolve(false);return banks[scope].activate(download,options);},
  cancel(id,key=scope){return banks[key]?.cancel(id)??false;},
  reset(){for(const bank of Object.values(banks))bank.reset();scope='finish';ticket=null;emit();}
 };
}
