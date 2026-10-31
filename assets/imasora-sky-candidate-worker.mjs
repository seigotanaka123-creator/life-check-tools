import {skyCandidate} from './imasora-sky-candidate.mjs?v=120qh';
self.onmessage=event=>{if(event.data?.type==='prepare')return;const {id,frame}=event.data??{};try{self.postMessage({id,result:skyCandidate(frame)});}catch{self.postMessage({id,error:'FRAME_UNREADABLE'});}finally{if(frame?.data instanceof Uint8ClampedArray)frame.data.fill(0);}};
