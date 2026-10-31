import {createSkyCamera} from './imasora-sky-camera.mjs?v=120qh';
export async function openBrowserSkyPreview({video,snapshot,signal,environment=globalThis}){
 const env=environment;if(!env.isSecureContext||!env.navigator?.mediaDevices?.getUserMedia)throw Error('CAMERA_SECURE_CONTEXT_REQUIRED');let stream=null;
 function stop(){for(const t of stream?.getTracks?.()??[])try{t.stop();}catch{}if(video.srcObject===stream){video.pause();video.srcObject=null;}}
 try{stream=await env.navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480}}});if(signal.aborted)throw Error('CANCELLED');video.muted=true;video.playsInline=true;video.srcObject=stream;await video.play();if(signal.aborted)throw Error('CANCELLED');if(!video.videoWidth||!video.videoHeight)throw Error('CAMERA_NOT_READY');
  return{stream,stop,captureFrame(){const w=video.videoWidth,h=video.videoHeight,scale=Math.min(640/w,480/h);snapshot.width=Math.max(1,Math.floor(w*scale));snapshot.height=Math.max(1,Math.floor(h*scale));snapshot.getContext('2d').drawImage(video,0,0,snapshot.width,snapshot.height);const canvas=env.document.createElement('canvas'),small=Math.min(160/w,120/h);canvas.width=Math.max(16,Math.floor(w*small));canvas.height=Math.max(16,Math.floor(h*small));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,0,0,canvas.width,canvas.height);const frame=ctx.getImageData(0,0,canvas.width,canvas.height);canvas.width=canvas.height=0;return frame;}};
 }catch(error){stop();throw error;}
}
export function mountSkyCamera({document:doc=globalThis.document,environment=globalThis,candidateClient,openPreview=openBrowserSkyPreview}={}){
 const e=Object.fromEntries(['screen','video','snapshot','intro','status','start','shoot','retake','back'].map(id=>[id,doc.getElementById(id)]));if(Object.values(e).some(x=>!x)||!candidateClient)throw Error('CAMERA_UI_UNAVAILABLE');
 let generation=0,preview=null,opening=null,phase='idle',disposed=false;
 function erase(){e.snapshot.width=e.snapshot.height=0;e.snapshot.hidden=true;}
 function setPhase(next,message){phase=next;e.screen.dataset.phase=next;e.status.textContent=message;e.start.hidden=!['idle','unavailable'].includes(next);e.shoot.hidden=next!=='preview';e.retake.hidden=next!=='result';e.intro.hidden=!['idle','opening','unavailable'].includes(next);e.video.hidden=next!=='preview';e.snapshot.hidden=!['checking','result'].includes(next);}
 function release(keepModel=false){opening?.abort();opening=null;camera.cancel();if(!keepModel)candidateClient.cancel();preview?.stop();preview=null;}
 const camera=createSkyCamera({openStream:async()=>{if(!preview)throw Error('PREVIEW_CLOSED');return preview.stream;},readFrame:async()=>preview.captureFrame(),recognize:candidateClient.recognize});
 async function start(){if(disposed||!['idle','unavailable','result'].includes(phase))return;release(phase==='result');erase();const token=++generation,controller=new AbortController();opening=controller;setPhase('opening','カメラをひらいているよ。');try{const own=await openPreview({video:e.video,snapshot:e.snapshot,signal:controller.signal,environment});if(token!==generation||disposed){own.stop();return;}preview=own;opening=null;candidateClient.prepare?.();setPhase('preview','空だけを枠に入れてね。');}catch(error){if(token!==generation||disposed)return;setPhase('unavailable',error?.message==='CAMERA_SECURE_CONTEXT_REQUIRED'?'カメラを使える接続で開いてね。今は撮影できません。':error?.name==='NotAllowedError'?'カメラが許可されていません。設定を確かめて、もう一度ためしてね。':'カメラをひらけませんでした。もう一度ためしてね。');}}
 async function shoot(){if(disposed||phase!=='preview')return;const token=generation,own=preview;setPhase('checking','空の色や模様をたしかめているよ。');const result=await camera.capture();own?.stop();if(preview===own)preview=null;if(token!==generation||disposed)return;setPhase('result',skyCaptureMessage(result));}
 function close(){generation++;release();erase();e.video.hidden=true;if(!disposed)setPhase('idle','写真は端末に保存せず、外にも送りません。');}
 const hidden=()=>{if(doc.hidden){close();}},leave=()=>close();e.start.addEventListener('click',start);e.shoot.addEventListener('click',shoot);e.retake.addEventListener('click',start);e.back.addEventListener('click',leave);doc.addEventListener('visibilitychange',hidden);environment.addEventListener?.('pagehide',leave);
 setPhase('idle','写真は端末に保存せず、外にも送りません。');
 return Object.freeze({start,shoot,close,dispose(){close();disposed=true;e.start.removeEventListener('click',start);e.shoot.removeEventListener('click',shoot);e.retake.removeEventListener('click',start);e.back.removeEventListener('click',leave);doc.removeEventListener('visibilitychange',hidden);environment.removeEventListener?.('pagehide',leave);candidateClient.dispose();}});
}

export function skyCaptureMessage(result){
 if(result.status==='candidate')return result.candidate.label+'に見えるよ。';
 if(result.status==='unavailable')return'空をたしかめる処理が動きませんでした。\nもう一度ためすか、閉じてね。';
 const messages={dark:'暗くて空を見分けられなかったよ。\n撮り直すか、閉じてね。',glare:'白く明るすぎて、空を見分けられなかったよ。\n太陽を枠から外して撮り直してね。',flat:'空の模様を見分けられなかったよ。\n少し向きを変えて撮り直してね。',incomplete:'写真をうまく読み取れなかったよ。\nもう一度撮り直してね。', 'not-sky':'空かどうか、はっきり分からなかったよ。\n空だけを大きくうつして撮り直してね。'};
 return messages[result.reason]??'空を見分けられなかったよ。\n空だけを大きくうつして撮り直してね。';
}
