// Capture transport only. Recognition is supplied by a real provider; no
// time-derived guess, production validity period or reward is supplied here.
export function createSkyCamera({openStream,readFrame,recognize,now=Date.now,newId=()=>crypto.randomUUID()}){
 if(![openStream,readFrame,recognize,now,newId].every(f=>typeof f==='function'))throw Error('CAMERA_PROVIDER_UNAVAILABLE');
 let generation=0,busy=false,stream=null,abort=null,activeFrame=null;
 const stop=s=>{for(const track of s?.getTracks?.()??[])try{track.stop();}catch{}};
 function cancel(){generation++;activeFrame?.fill(0);activeFrame=null;abort?.abort();stop(stream);stream=null;busy=false;}
 async function capture(){if(busy)return{status:'busy'};busy=true;const token=++generation,controller=new AbortController();abort=controller;let ownStream=null,frame=null;
  try{ownStream=await openStream(controller.signal);if(token!==generation)return{status:'cancelled'};stream=ownStream;
   frame=await readFrame(ownStream,controller.signal);if(token!==generation)return{status:'cancelled'};
   if(!frame||!Number.isSafeInteger(frame.width)||!Number.isSafeInteger(frame.height)||frame.width<16||frame.height<16||frame.width*frame.height>160*120||!(frame.data instanceof Uint8ClampedArray)||frame.data.length!==frame.width*frame.height*4)throw Error('CAMERA_FRAME_UNREADABLE');
   activeFrame=frame.data;const capturedAt=now(),captureId=newId();if(!Number.isSafeInteger(capturedAt)||capturedAt<=0||typeof captureId!=='string'||!captureId)throw Error('CAMERA_CLOCK_UNAVAILABLE');
   const result=await recognize({width:frame.width,height:frame.height,data:frame.data,captureId,capturedAt,signal:controller.signal});if(token!==generation)return{status:'cancelled'};
   if(result?.verified===false&&['blue','cloud','sunset'].includes(result.candidate?.skyId)&&typeof result.candidate?.label==='string'&&result.candidate.label.length<40&&Number.isFinite(result.candidate.score)&&result.candidate.score>=0&&result.candidate.score<=1)return{status:'candidate',candidate:{source:'camera-candidate',captureId,capturedAt,skyId:result.candidate.skyId,label:result.candidate.label,score:result.candidate.score}};
   if(result?.verified===false&&['unavailable','timeout'].includes(result.reason))return{status:'unavailable',code:'SKY_ANALYSIS_UNAVAILABLE'};
   if(result?.verified===false&&['not-sky','dark','flat','glare','incomplete','mixed','uncertain'].includes(result.reason))return{status:'unrecognized',reason:result.reason};
   if(result?.verified!==true||!['blue','cloud','morning','sunset'].includes(result.skyId)||typeof result.providerId!=='string'||!result.providerId||typeof result.providerVersion!=='string'||!result.providerVersion)return{status:'unrecognized'};
   const recognizedAt=now();if(!Number.isSafeInteger(recognizedAt)||recognizedAt<capturedAt)throw Error('CAMERA_CLOCK_UNAVAILABLE');
   return{status:'recognized',recognition:{source:'camera-recognition',captureId,capturedAt,recognizedAt,skyId:result.skyId,providerId:result.providerId,providerVersion:result.providerVersion}};
  }catch(error){return{status:token!==generation?'cancelled':'unavailable',code:typeof error?.name==='string'?error.name:'CAMERA_UNAVAILABLE'};}
  finally{if(frame?.data instanceof Uint8ClampedArray)frame.data.fill(0);if(activeFrame===frame?.data)activeFrame=null;stop(ownStream);if(token===generation){stream=null;abort=null;busy=false;}}
 }
 return Object.freeze({capture,cancel});
}
export function createBrowserSkyCamera({recognize,environment=globalThis}){
 const env=environment,doc=env.document;let video=null;
 const closeVideo=()=>{if(video){video.pause();video.srcObject=null;video.remove();video=null;}};
 const camera=createSkyCamera({recognize,openStream:async signal=>{if(!env.isSecureContext||!env.navigator?.mediaDevices?.getUserMedia)throw Error('CAMERA_SECURE_CONTEXT_REQUIRED');return env.navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480}}});},readFrame:async(stream,signal)=>{const own=doc.createElement('video');video=own;own.muted=true;own.playsInline=true;own.srcObject=stream;own.setAttribute('aria-hidden','true');own.style.cssText='position:fixed;left:-10000px;width:1px;height:1px;pointer-events:none';doc.body.append(own);try{await own.play();if(signal.aborted)throw Error('CANCELLED');if(!own.videoWidth||!own.videoHeight)throw Error('CAMERA_NOT_READY');const canvas=doc.createElement('canvas'),scale=Math.min(160/own.videoWidth,120/own.videoHeight),w=Math.max(16,Math.floor(own.videoWidth*scale)),h=Math.max(16,Math.floor(own.videoHeight*scale));canvas.width=w;canvas.height=h;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(own,0,0,w,h);const frame=context.getImageData(0,0,w,h);canvas.width=0;canvas.height=0;return frame;}finally{own.pause();own.srcObject=null;own.remove();if(video===own)video=null;}}});
 return Object.freeze({capture:camera.capture,cancel(){camera.cancel();closeVideo();}});
}
