// The share controller owns the Blob URL. Release the decoder when the
// preview is out of sight, retaining the paused position for that clip.
export function createHuntVideoPreview({video,details,document:doc}){
 let url='',position=0,visible=false,pageHidden=false,disposed=false;
 function detach({remember=false}={}){
  if(video.getAttribute('src')===null)return;
  if(remember&&video.readyState>=1&&Number.isFinite(video.currentTime))position=video.currentTime;
  if(!video.paused)try{video.pause();}catch{}
  video.removeAttribute('src');
  try{video.load();}catch{}
 }
 function sync(){
  if(disposed)return;
  if(!visible||pageHidden||doc?.hidden||details.hidden||!details.open){
   detach({remember:true});
   return;
  }
  if(url&&video.getAttribute('src')!==url)video.src=url;
 }
 function onMetadata(){
  if(!position||!url||video.getAttribute('src')!==url||video.readyState<1)return;
  const duration=Number.isFinite(video.duration)?video.duration:position;
  try{video.currentTime=Math.min(position,duration);}catch{}
 }
 function clear(){
  detach();
  url='';
  position=0;
  details.open=false;
  details.hidden=true;
 }
 function onPageHide(){pageHidden=true;sync();}
 function onPageShow(){pageHidden=false;sync();}
 const listeners=[
  [video,'loadedmetadata',onMetadata],
  [details,'toggle',sync],
  [doc,'visibilitychange',sync],
  [doc?.defaultView,'pagehide',onPageHide],
  [doc?.defaultView,'pageshow',onPageShow],
 ];
 for(const [target,event,handler] of listeners)target?.addEventListener?.(event,handler);
 return{
  update(info){
   if(disposed)return false;
   const next=['ready','busy'].includes(info?.status)&&typeof info.previewUrl==='string'?info.previewUrl:'';
   if(!next){clear();return false;}
   if(url!==next){clear();url=next;}
   details.hidden=false;
   sync();
   return true;
  },
  show(){if(disposed)return;visible=true;sync();},
  hide(){visible=false;sync();},
  reset(){if(disposed)return;visible=false;clear();},
  dispose(){
   if(disposed)return;
   visible=false;
   clear();
   disposed=true;
   for(const [target,event,handler] of listeners)target?.removeEventListener?.(event,handler);
  },
 };
}
