export const HUNT_VIDEO_MAX_BYTES=12*1024*1024;
const VIDEO_FPS=24;
// The embedded preview's audio clock was observed shortening MP4 playback.
// Keep its complete visual replay; top-level games retain their game audio.
export function huntReplayAudioAllowed(view=globalThis){return !view.top||view.top===view.self;}
// Attach before a pending resume resolves; recording must not lose its audio
// track merely because the context was suspended on the result screen.
export function createHuntReplayAudio(audio,view=globalThis){if(!huntReplayAudioAllowed(view))return null;const context=audio?.context;if(!context?.createMediaStreamDestination||context.state==='closed')return null;let destination;try{destination=context.createMediaStreamDestination();audio.tap(destination);return{stream:destination.stream,release:()=>audio.untap(destination)};}catch{if(destination)try{audio.untap(destination);}catch{}for(const t of destination?.stream?.getTracks?.()??[])try{t.stop();}catch{}return null;}}
export function huntVideoSize(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('INVALID_VIDEO_SIZE');const scale=720/Math.max(width,height);return{width:Math.max(2,Math.round(width*scale/2)*2),height:Math.max(2,Math.round(height*scale/2)*2)};}
function huntVideoMimes(Recorder){const types=[];for(const type of['video/mp4','video/webm;codecs=vp8,opus','video/webm'])try{if(Recorder?.isTypeSupported?.(type))types.push(type);}catch{}return types;}
export function huntVideoMime(Recorder){return huntVideoMimes(Recorder)[0]??null;}
// Support probes do not guarantee that a particular encoder can be started.
// Reuse this capture's streams, and detach a failed encoder before trying another.
function startHuntRecorder(Recorder,stream,types,preferred){const ordered=types.includes(preferred)?[preferred,...types.filter(t=>t!==preferred)]:types;for(const mime of ordered){let recorder;try{recorder=new Recorder(stream,{mimeType:mime,videoBitsPerSecond:2500000,audioBitsPerSecond:96000});recorder.start(500);return{recorder,mime};}catch{if(recorder){recorder.ondataavailable=recorder.onerror=recorder.onstop=null;if(recorder.state&&recorder.state!=='inactive')try{recorder.stop();}catch{throw Error('VIDEO_ENCODER_CLEANUP_FAILED');}}}}throw Error('VIDEO_ENCODER_UNAVAILABLE');}
// Only these streams belong to this recording. Audio attachment can fail
// before some destination tracks join the canvas stream; release their union.
function stopHuntCaptureTracks(...streams){const tracks=new Set();for(const stream of streams)for(const method of['getTracks','getVideoTracks','getAudioTracks'])try{for(const track of stream?.[method]?.()??[])tracks.add(track);}catch{}for(const track of tracks)try{track.stop();}catch{}}
export function createHuntReplayVideo({createCanvas=()=>document.createElement('canvas'),Recorder=globalThis.MediaRecorder,makeAudio=()=>null,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let current=null,preferredMime=null;
 function clean(c){
  if(c.cleaned)return;
  c.cleaned=true;
  if(current===c)current=null;
  if(c.timer!==undefined)clearTimer(c.timer);
  if(c.recorder)c.recorder.ondataavailable=c.recorder.onerror=c.recorder.onstop=null;
  c.chunks.length=0;
  stopHuntCaptureTracks(c.stream,c.audio?.stream);
  try{c.audio?.release?.();}catch{}
 }
 // Every callback owns its recording; late work must never cancel a newer one.
 function abort(c){if(!c||c.cleaned)return;c.cancelled=true;try{if(c.recorder?.state!=='inactive')c.recorder?.stop();}catch{}clean(c);c.resolve(null);}
 function cancel(){abort(current);}
 function start(frame,summary){cancel();return new Promise(resolve=>{let c;try{const types=huntVideoMimes(Recorder);if(!types.length)throw Error('VIDEO_UNSUPPORTED');const size=huntVideoSize(frame.width,frame.height),canvas=createCanvas();Object.assign(canvas,size);const context=canvas.getContext('2d');if(!context)throw Error('VIDEO_CONTEXT_UNAVAILABLE');const stream=canvas.captureStream(VIDEO_FPS);const caption=summary?(summary.mode==="hunt"?"鬼役":"逃走役")+"  ·  "+summary.title+"  "+summary.time+"秒":"";c={caption,canvas,context,stream,resolve,chunks:[],bytes:0,lastSlot:-1,complete:false,cancelled:false};current=c;c.audio=makeAudio();for(const t of c.audio?.stream?.getAudioTracks?.()??[])stream.addTrack(t);const selected=startHuntRecorder(Recorder,stream,types,preferredMime),mime=selected.mime;c.recorder=selected.recorder;c.types=types;c.mime=mime;preferredMime=mime;c.recorder.ondataavailable=e=>{if(!e.data?.size||c.cancelled||c.cleaned)return;c.bytes+=e.data.size;if(c.bytes>HUNT_VIDEO_MAX_BYTES){abort(c);return;}c.chunks.push(e.data);};c.recorder.onerror=()=>{if(c.cleaned||c.cancelled)return;preferredMime=c.types[(c.types.indexOf(c.mime)+1)%c.types.length];abort(c);};c.recorder.onstop=()=>{if(c.cleaned)return;const type=(c.recorder.mimeType||mime).startsWith('video/mp4')?'video/mp4':'video/webm',blob=c.complete&&!c.cancelled&&c.chunks.length?new Blob(c.chunks,{type}):null;clean(c);resolve(blob);};c.timer=setTimer(()=>abort(c),12000);}catch{abort(c);resolve(null);}});}
 return{start,cancel,finish(){const c=current;if(!c||c.cancelled||c.complete)return false;c.complete=true;try{c.recorder.stop();return true;}catch{preferredMime=c.types[(c.types.indexOf(c.mime)+1)%c.types.length];c.cancelled=true;clean(c);c.resolve(null);return false;}},draw(frame,now){
  const c=current;
  if(!c||c.complete||!Number.isFinite(now))return false;
  c.firstFrameAt??=now;
  // Use the recording clock so quantization to the display refresh does not accumulate.
  const slot=Math.floor((now-c.firstFrameAt)*VIDEO_FPS/1000+1e-9);
  if(slot<=c.lastSlot)return false;
  c.lastSlot=slot;
  try{
   if(!Number.isFinite(frame.width)||!Number.isFinite(frame.height)||frame.width<=0||frame.height<=0)throw Error('INVALID_VIDEO_SIZE');
   const {width:w,height:h}=c.canvas;
   const scale=Math.min(w/frame.width,h/frame.height),x=(w-frame.width*scale)/2,y=(h-frame.height*scale)/2,ctx=c.context;
   ctx.fillStyle='#102d3b';ctx.fillRect(0,0,w,h);
   ctx.drawImage(frame,x,y,frame.width*scale,frame.height*scale);
   const footerHeight=c.caption?52:34,textWidth=Math.max(1,w-24);
   ctx.fillStyle='#102d3beb';ctx.fillRect(0,h-footerHeight,w,footerHeight);
   ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';
   ctx.fillText('イマソラーズウォーク  ·  鬼ごっこ REPLAY',12,h-footerHeight+20,textWidth);
   if(c.caption){
    ctx.fillStyle='#fff1bf';ctx.font='bold 15px system-ui';
    ctx.fillText(c.caption,12,h-11,textWidth);
   }
   return true;
  }catch{abort(c);return false;}
 },get active(){return!!current;}};
}
export function createHuntVideoShare({nav=globalThis.navigator,urlApi=URL,makeFile=(blob,name)=>new File([blob],name,{type:blob.type}),onChange=()=>{}}={}){
 let current=null,generation=0;const canShare=file=>{try{return!!file&&!!nav?.canShare?.({files:[file]})&&typeof nav.share==='function';}catch{return false;}};
 const snapshot=()=>({ticket:current?.ticket??null,status:current?.status??'idle',action:current?.busyAction??(current?.share?'share':'download'),hasSaveChoice:!!current?.share,notice:current?.notice??'',previewUrl:current?.url??'',mime:current?.mime??''});
 function emit(){try{onChange(snapshot());}catch{}}
 function release(){
  generation++;
  const url=current?.url;
  current=null;
  if(url)try{urlApi.revokeObjectURL(url);}catch{}
 }
 function reset(){release();emit();}
 function prepare(ticket,work){
  if(!Number.isSafeInteger(ticket)||ticket<1)return Promise.resolve(false);
  // A second viewing can reuse a clip that is still encoding or being shared.
  if(current?.ticket===ticket&&!['idle','failed'].includes(current.status))return Promise.resolve(false);
  release();
  const token=generation;
  current={ticket,status:'preparing',notice:''};
  emit();
  if(token!==generation)return Promise.resolve(false);
  let promise;
  try{promise=work();}catch{promise=null;}
  return Promise.resolve(promise).then(blob=>{
   if(token!==generation)return false;
   if(!blob||!['video/mp4','video/webm'].includes(blob.type)||blob.size<=0||blob.size>HUNT_VIDEO_MAX_BYTES)throw Error('INVALID_VIDEO');
   const name='imasora-tag-replay-'+ticket+(blob.type==='video/mp4'?'.mp4':'.webm');
   // The Blob is sufficient for preview and download when File cannot be made.
   let file=null;
   try{file=makeFile(blob,name);}catch{}
   const share=canShare(file);
   if(token!==generation)return false;
   current={ticket,status:'ready',file,name,mime:blob.type,url:urlApi.createObjectURL(blob),share,notice:''};
   emit();
   return token===generation;
  }).catch(()=>{
   if(token!==generation)return false;
   current={ticket,status:'failed',notice:'動画を作れませんでした。もう一度試せます。'};
   emit();
   return false;
  });
 }
 // Cancelling a capture is a user choice, not an encoding failure. Invalidate
 // its pending promise before the recorder settles, but retain ready videos.
 function cancel(ticket){if(current?.ticket!==ticket||current.status!=='preparing')return false;generation++;current={ticket,status:'idle',notice:'動画作成を中止しました'};emit();return true;}
 async function activate(download,{save=false}={}){if(current?.status!=='ready')return false;const row=current,token=generation,sharing=row.share&&!save;row.status='busy';row.busyAction=sharing?'share':'download';row.notice='';emit();if(token!==generation)return false;try{if(sharing)await nav.share({files:[row.file],title:'イマソラーズウォーク',text:'#イマソラーズウォーク #鬼ごっこ'});else await download(row.url,row.name);if(token===generation)row.notice=sharing?'共有先へ動画を渡しました':'動画の保存を開始しました';return true;}catch(e){if(token===generation){if(e?.name==='AbortError')row.notice=sharing?'共有を取り消しました':'保存を取り消しました';else if(sharing){row.share=false;row.notice='動画を保存して共有できます';}else row.notice='動画を保存できませんでした。もう一度試せます。';}return false;}finally{if(token===generation){row.status='ready';delete row.busyAction;emit();}}}
 return{prepare,activate,cancel,reset,snapshot};
}
