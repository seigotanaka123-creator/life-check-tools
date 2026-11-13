export const HUNT_VIDEO_MAX_BYTES=12*1024*1024;
export const HUNT_FULL_VIDEO_MAX_BYTES=48*1024*1024;
export function huntVideoLimits(scope='finish',seconds=6){
 if(!['finish','full'].includes(scope)||!Number.isFinite(seconds)||seconds<0||seconds>180)throw Error('INVALID_VIDEO_SCOPE');
 return{maxBytes:scope==='full'?HUNT_FULL_VIDEO_MAX_BYTES:HUNT_VIDEO_MAX_BYTES,timeout:scope==='full'?Math.ceil((seconds+9)*1000):12000,bitrate:scope==='full'?1800000:2500000};
}
const VIDEO_FPS=24;
// The embedded preview's audio clock was observed shortening MP4 playback.
// Keep its complete visual replay; top-level games retain their game audio.
export function huntReplayAudioAllowed(view=globalThis){return !view.top||view.top===view.self;}
// Attach before a pending resume resolves; recording must not lose its audio
// track merely because the context was suspended on the result screen.
export function createHuntReplayAudio(audio,view=globalThis){
 if(!huntReplayAudioAllowed(view))return null;
 const context=audio?.context;if(!context?.createMediaStreamDestination||context.state==='closed')return null;
 let destination,clock,released=false;
 const release=()=>{if(released)return;released=true;if(clock){try{clock.stop();}catch{}try{clock.disconnect();}catch{}}if(destination)try{audio.untap(destination);}catch{}};
 try{
  destination=context.createMediaStreamDestination();audio.tap(destination);
  // Keep silent intervals on the exported audio timeline. This zero-valued
  // source belongs only to the recording destination, never to the speakers.
  if(context.createConstantSource){clock=context.createConstantSource();clock.offset.value=0;clock.connect(destination);clock.start();}
  return{stream:destination.stream,release};
 }catch{release();for(const t of destination?.stream?.getTracks?.()??[])try{t.stop();}catch{}return null;}
}
const mp4Type=(d,p)=>String.fromCharCode(...new Uint8Array(d.buffer,d.byteOffset+p,4));
function mp4Box(d,p,limit){
 if(p+8>d.byteLength)return null;
 let size=d.getUint32(p),header=8;
 if(size===1){if(p+16>d.byteLength)return null;size=Number(d.getBigUint64(p+8));header=16;}
 else if(size===0)size=limit-p;
 if(!Number.isSafeInteger(size)||size<header||size>limit-p)return null;
 return{type:mp4Type(d,p+4),body:p+header,end:p+size};
}
function mp4Children(d){
 const rows=[];
 for(let p=0;p<d.byteLength;){
  const box=mp4Box(d,p,d.byteLength);
  if(!box||rows.length>=1024)throw Error('MP4_BOX');
  rows.push(box);p=box.end;
 }
 return rows;
}
function mp4Child(d,type){
 const box=mp4Children(d).find(row=>row.type===type);
 return box&&mp4Payload(d,box);
}
const mp4Payload=(d,box)=>new DataView(d.buffer,d.byteOffset+box.body,box.end-box.body);
function mp4U64(d,p){const n=Number(d.getBigUint64(p));return Number.isSafeInteger(n)?n:NaN;}
function mp4Clock(d){
 if(!d||d.byteLength<4)return null;
 const version=d.getUint8(0),p=version===1?20:12;
 if(version>1||d.byteLength<p+(version===1?12:8))return null;
 const scale=d.getUint32(p),ticks=version===1?mp4U64(d,p+4):d.getUint32(p+4);
 return scale>0?{scale,duration:ticks>0&&ticks!==0xffffffff?ticks/scale:null}:null;
}
function mp4VideoTrack(movie,movieClock){
 for(const box of mp4Children(movie)){
  if(box.type!=='trak')continue;
  const track=mp4Payload(movie,box),media=mp4Child(track,'mdia');
  if(!media)continue;
  const handler=mp4Child(media,'hdlr');
  if(!handler||handler.byteLength<12||mp4Type(handler,8)!=='vide')continue;
  const header=mp4Child(track,'tkhd'),clock=mp4Clock(mp4Child(media,'mdhd'));
  if(!header||header.byteLength<24||!clock)return null;
  const version=header.getUint8(0),p=version===1?20:12;
  if(version>1||header.byteLength<p+(version===1?16:12))return null;
  const id=header.getUint32(p),ticks=version===1?mp4U64(header,p+8):header.getUint32(p+8);
  const duration=movieClock?.scale&&ticks>0&&ticks!==0xffffffff?ticks/movieClock.scale:clock.duration;
  let defaultDuration=0;
  const extensions=mp4Child(movie,'mvex');
  if(extensions)for(const ext of mp4Children(extensions)){
   if(ext.type!=='trex')continue;
   const row=mp4Payload(extensions,ext);
   if(row.byteLength>=24&&row.getUint32(4)===id)defaultDuration=row.getUint32(12);
  }
  return{id,scale:clock.scale,duration,defaultDuration,decodeEnd:0,presentEnd:0,samples:0};
 }
 return null;
}
function addMp4VideoFragment(fragment,video){
 for(const box of mp4Children(fragment)){
  if(box.type!=='traf')continue;
  const track=mp4Payload(fragment,box),header=mp4Child(track,'tfhd');
  if(!header||header.getUint32(4)!==video.id)continue;
  const flags=header.getUint32(0)&0xffffff;
  const durationOffset=8+(flags&1?8:0)+(flags&2?4:0);
  const defaultDuration=flags&8?header.getUint32(durationOffset):video.defaultDuration;
  const base=mp4Child(track,'tfdt'),version=base?.getUint8(0);
  let decode=base?(version===1?mp4U64(base,4):version===0?base.getUint32(4):NaN):video.decodeEnd;
  if(!Number.isSafeInteger(decode))throw Error('MP4_TIME');
  for(const runBox of mp4Children(track)){
   if(runBox.type!=='trun')continue;
   const run=mp4Payload(track,runBox),info=run.getUint32(0),count=run.getUint32(4);
   if((info>>>24)>1||video.samples+count>32768)throw Error('MP4_SAMPLES');
   let p=8+(info&1?4:0)+(info&4?4:0);
   const step=((info&0x100?1:0)+(info&0x200?1:0)+(info&0x400?1:0)+(info&0x800?1:0))*4;
   if(p+count*step>run.byteLength)throw Error('MP4_SAMPLES');
   for(let i=0;i<count;i++,p+=step){
    const duration=info&0x100?run.getUint32(p):defaultDuration;
    const composition=!(info&0x800)?0:info>>>24?run.getInt32(p+step-4):run.getUint32(p+step-4);
    if((!duration&&!(info&0x100))||!Number.isSafeInteger(decode+duration)||!Number.isSafeInteger(decode+duration+composition))throw Error('MP4_TIME');
    video.presentEnd=Math.max(video.presentEnd,decode+duration+composition);
    decode+=duration;
   }
   video.samples+=count;
  }
  video.decodeEnd=Math.max(video.decodeEnd,decode);
 }
}
// Check the video timeline, not the AAC or movie length. In fragmented MP4
// those summary headers can describe only the first fragment, or be zero.
// Read bounded metadata only: never copy the recorded mdat payloads.
export const huntRecordedVideoDuration=async blob=>{
 if(!blob?.type?.startsWith('video/mp4')||!blob.slice)return null;
 let movieClock=null,video=null,fragments=0,metadata=0,offset=0,boxes=0;
 try{
  for(;offset+8<=blob.size&&boxes++<1024;){
   let head=new DataView(await blob.slice(offset,offset+8).arrayBuffer());
   if(head.byteLength===8&&head.getUint32(0)===1)head=new DataView(await blob.slice(offset,offset+16).arrayBuffer());
   const box=mp4Box(head,0,blob.size-offset);
   if(!box)return null;
   if(box.type==='moov'||box.type==='moof'){
    const bytes=box.end-box.body;
    metadata+=bytes;
    if(bytes>256*1024||metadata>2*1024*1024)return null;
    const data=new DataView(await blob.slice(offset+box.body,offset+box.end).arrayBuffer());
    if(box.type==='moov'){
     movieClock=mp4Clock(mp4Child(data,'mvhd'));
     video=mp4VideoTrack(data,movieClock);
    }else{
     fragments++;
     if(video)addMp4VideoFragment(data,video);
    }
   }
   offset+=box.end;
  }
  if(offset!==blob.size)return null;
  if(fragments&&video)return video.presentEnd/video.scale;
  return video?.duration??movieClock?.duration??null;
 }catch{return null;}
};
export function huntVideoSize(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('INVALID_VIDEO_SIZE');const scale=720/Math.max(width,height);return{width:Math.max(2,Math.round(width*scale/2)*2),height:Math.max(2,Math.round(height*scale/2)*2)};}
export const HUNT_VIDEO_MP4='video/mp4;codecs=avc1.42E01E,mp4a.40.2';
// Prefer an explicit share-friendly AVC/AAC pair. A bare MP4 probe selected
// VP9/Opus in the embedded browser, so use a supported, explicit WebM pair
// before that ambiguous fallback, without guessing the device.
function huntVideoMimes(Recorder){const types=[];for(const type of[HUNT_VIDEO_MP4,'video/webm;codecs=vp8,opus','video/webm','video/mp4'])try{if(Recorder?.isTypeSupported?.(type))types.push(type);}catch{}return types;}
export function huntVideoMime(Recorder){return huntVideoMimes(Recorder)[0]??null;}
// Support probes do not guarantee that a particular encoder can be started.
// Reuse this capture's streams, and detach a failed encoder before trying another.
function startHuntRecorder(Recorder,stream,types,preferred,bitrate){const ordered=types.includes(preferred)?[preferred,...types.filter(t=>t!==preferred)]:types;for(const mime of ordered){let recorder;try{recorder=new Recorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate,audioBitsPerSecond:96000});recorder.start(500);return{recorder,mime};}catch{if(recorder){recorder.ondataavailable=recorder.onerror=recorder.onstop=null;if(recorder.state&&recorder.state!=='inactive')try{recorder.stop();}catch{throw Error('VIDEO_ENCODER_CLEANUP_FAILED');}}}}throw Error('VIDEO_ENCODER_UNAVAILABLE');}
// Only these streams belong to this recording. Audio attachment can fail
// before some destination tracks join the canvas stream; release their union.
function stopHuntCaptureTracks(...streams){const tracks=new Set();for(const stream of streams)for(const method of['getTracks','getVideoTracks','getAudioTracks'])try{for(const track of stream?.[method]?.()??[])tracks.add(track);}catch{}for(const track of tracks)try{track.stop();}catch{}}
export function createHuntReplayVideo({createCanvas=()=>document.createElement('canvas'),Recorder=globalThis.MediaRecorder,makeAudio=()=>null,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let current=null,preferredMime=null,sequence=0;
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
 function start(frame,summary,{scope='finish',seconds=6}={}){cancel();return new Promise(resolve=>{let c;try{const limits=huntVideoLimits(scope,seconds);const types=huntVideoMimes(Recorder);if(!types.length)throw Error('VIDEO_UNSUPPORTED');const size=huntVideoSize(frame.width,frame.height),canvas=createCanvas();Object.assign(canvas,size);const context=canvas.getContext('2d');if(!context)throw Error('VIDEO_CONTEXT_UNAVAILABLE');const stream=canvas.captureStream(VIDEO_FPS);const caption=summary?(summary.mode==="hunt"?"鬼役":"逃走役")+"  ·  "+summary.title+"  "+summary.time+"秒":"";c={caption,canvas,context,stream,resolve,chunks:[],bytes:0,lastSlot:-1,complete:false,cancelled:false};current=c;c.sequence=++sequence;c.audio=makeAudio();for(const t of c.audio?.stream?.getAudioTracks?.()??[])stream.addTrack(t);const selected=startHuntRecorder(Recorder,stream,types,preferredMime,limits.bitrate),mime=selected.mime;c.recorder=selected.recorder;c.types=types;c.mime=mime;preferredMime=mime;c.recorder.ondataavailable=e=>{if(!e.data?.size||c.cancelled||c.cleaned)return;c.bytes+=e.data.size;if(c.bytes>limits.maxBytes){abort(c);return;}c.chunks.push(e.data);};c.recorder.onerror=()=>{if(c.cleaned||c.cancelled)return;preferredMime=c.types[(c.types.indexOf(c.mime)+1)%c.types.length];abort(c);};c.recorder.onstop=()=>{if(c.cleaned)return;const type=(c.recorder.mimeType||mime).startsWith('video/mp4')?'video/mp4':'video/webm',blob=c.complete&&!c.cancelled&&c.chunks.length?new Blob(c.chunks,{type}):null,expected=((c.lastFrameAt??c.firstFrameAt??0)-(c.firstFrameAt??0))/1000;clean(c);if(!blob){resolve(null);return;}huntRecordedVideoDuration(blob).then(duration=>{if(c.sequence!==sequence){resolve(null);return;}if(expected>.5&&duration!==null&&Math.abs(duration-expected)>Math.max(.35,Math.min(.75,expected*.01))){preferredMime=c.types[(c.types.indexOf(c.mime)+1)%c.types.length];resolve(null);return;}resolve(blob);},()=>resolve(null));};c.timer=setTimer(()=>abort(c),limits.timeout);}catch{abort(c);resolve(null);}});}
 return{start,cancel,finish(){const c=current;if(!c||c.cancelled||c.complete)return false;c.complete=true;try{c.recorder.stop();return true;}catch{preferredMime=c.types[(c.types.indexOf(c.mime)+1)%c.types.length];c.cancelled=true;clean(c);c.resolve(null);return false;}},draw(frame,now){
  const c=current;
  if(!c||c.complete||!Number.isFinite(now))return false;
  c.firstFrameAt??=now;
  // Use the recording clock so quantization to the display refresh does not accumulate.
  const slot=Math.floor((now-c.firstFrameAt)*VIDEO_FPS/1000+1e-9);
  if(slot<=c.lastSlot)return false;
  c.lastSlot=slot;c.lastFrameAt=now;
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
export function createHuntVideoShare({nav=globalThis.navigator,urlApi=URL,makeFile=(blob,name)=>new File([blob],name,{type:blob.type}),onChange=()=>{},maxBytes=HUNT_VIDEO_MAX_BYTES,fileSuffix=''}={}){
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
   if(!blob||!['video/mp4','video/webm'].includes(blob.type)||blob.size<=0||blob.size>maxBytes)throw Error('INVALID_VIDEO');
   const name='imasora-tag-replay-'+ticket+fileSuffix+(blob.type==='video/mp4'?'.mp4':'.webm');
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
