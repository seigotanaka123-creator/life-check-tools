import{LIVE_WINDOW_TITLE}from'./imasora-live-broadcast-obs.mjs';
// The live window owns its audio destination, including partially connected taps.
export function createLiveOutputAudio(audio){
 const context=audio?.context;if(!context?.createMediaStreamDestination||context.state==='closed')return null;
 let destination,released=false,monitorMuted=false;
 function release(){
  if(released)return;released=true;
  if(monitorMuted)try{audio.setMonitor?.(true);}catch{}
  if(destination)try{audio.untap(destination);}catch{}
  const tracks=new Set();for(const method of['getTracks','getAudioTracks'])try{for(const track of destination?.stream?.[method]?.()??[])tracks.add(track);}catch{}
  for(const track of tracks)try{track.stop();}catch{}
 }
 try{destination=context.createMediaStreamDestination();audio.tap(destination);return{stream:destination.stream,monitor(value){if(released)return;if(value===false)monitorMuted=true;audio.setMonitor?.(value);if(value===true)monitorMuted=false;},release};}
 catch(error){release();throw error;}
}
// A separate, game-only live window. OBS captures this window, not the desktop.
export function createLiveOutput({canvas,captureCanvas=()=>canvas,windowTarget=globalThis.window,makeAudio=()=>null,gameName='鬼ごっこ',onLost=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const owner='imasora-live-'+Math.random().toString(36).slice(2);let child=null,stream=null,audio=null,check=null,video=null,ready=false,lastHud='',generation=0,audioRetryBlocked=false;
 function close(notify=false){generation++;const old=child,capture=stream,tap=audio,player=video;child=null;stream=null;audio=null;video=null;ready=false;audioRetryBlocked=false;if(check!==null)clearTimer(check);check=null;try{player?.pause();if(player)player.srcObject=null;}catch{}for(const track of capture?.getVideoTracks?.()??[])try{track.stop();}catch{}try{tap?.release();}catch{}try{old?.close();}catch{}if(notify&&old)onLost();}
 function attachAudio(){if(audio||!stream||audioRetryBlocked)return;let candidate;const added=[];try{candidate=makeAudio();for(const track of candidate?.stream?.getAudioTracks?.()??[]){added.push(track);stream.addTrack(track);}if(candidate&&ready&&!video?.muted)candidate.monitor?.(false);audio=candidate;}catch(error){for(const track of added)try{stream?.removeTrack?.(track);}catch{}try{candidate?.release();}catch{}audioRetryBlocked=true;throw error;}}
 function watch(){const id=generation;check=setTimer(()=>{if(id!==generation)return;check=null;if(!child||child.closed){close(true);return;}audioRetryBlocked=false;watch();},500);}
 function open(){if(child&&!child.closed){child.focus();return true;}if(child)close(true);const source=captureCanvas();if(typeof source?.captureStream!=='function')throw Error('このブラウザでは配信用画面を作れません。OBSでゲームのウィンドウを選んでください。');
  child=windowTarget.open('about:blank','imasora_walk_live_output_v1','popup,width=1280,height=720');if(!child)throw Error('配信用画面が開けません。ポップアップの設定を確認してください。');
  try{const previous=child.document.documentElement?.dataset.liveOwner;if(previous&&previous!==owner){child=null;throw Error('別のゲームの配信用画面が開いています。先にそちらで配信を終了してください。');}}catch(e){child=null;throw e;}

  try{const id=++generation;lastHud='';const doc=child.document;doc.open();doc.write('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#102231;color:white;font:600 18px system-ui}video{width:100%;height:100%;object-fit:contain}header{position:absolute;left:20px;right:20px;top:16px;display:flex;justify-content:space-between;gap:18px;text-shadow:0 2px 5px #000}small{font-size:13px;opacity:.8}button{position:absolute;bottom:18px;right:20px;padding:10px 18px;border:0;border-radius:12px}#waiting{position:absolute;inset:0;display:grid;place-items:center;background:#102231}</style><video autoplay playsinline></video><header><span>イマソラーズウォーク <small>鬼ごっこ</small></span><span id="live-hud"></span></header><div id="waiting">ゲーム映像を準備中</div><button hidden>音を有効にする</button></html>');doc.close();if(doc.documentElement)doc.documentElement.dataset.liveOwner=owner;doc.title=LIVE_WINDOW_TITLE;doc.querySelector('small').textContent=String(gameName).slice(0,30);
   video=doc.querySelector('video');stream=source.captureStream(30);attachAudio();video.srcObject=stream;
   const player=video,openedChild=child,enable=doc.querySelector('button'),waiting=doc.querySelector('#waiting');
   let playback=0;
   // A rejected play() may arrive after this popup is closed or replaced.
   // Both the output and the latest user activation must still own the reply.
   const current=attempt=>id===generation&&child===openedChild&&!openedChild.closed&&video===player&&attempt===playback;
   const monitor=value=>{try{audio?.monitor?.(value);}catch{}};
   async function play(){
    const attempt=++playback;
    try{
     await player.play();
     if(!current(attempt))return;
     ready=true;waiting.hidden=true;waiting.style.display='none';enable.hidden=true;
     monitor(false);
    }catch{
     if(!current(attempt))return;
     player.muted=true;
     try{
      await player.play();
      if(!current(attempt))return;
      ready=true;waiting.hidden=true;waiting.style.display='none';
      enable.textContent='音を有効にする';enable.hidden=false;
      monitor(true);
     }catch{
      if(!current(attempt))return;
      ready=false;waiting.hidden=false;waiting.style.display='grid';
      waiting.textContent='映像を再開するには、右下のボタンを押してください';
      enable.textContent='映像を再開する';enable.hidden=false;
      monitor(true);
     }
    }
   }
   enable.onclick=()=>{player.muted=false;void play();};void play();for(const track of stream.getVideoTracks())track.addEventListener?.('ended',()=>{if(id===generation)close(true);},{once:true});watch();return true;
  }catch(e){close();throw Error('配信用画面を準備できませんでした。');}}
 function update(text){if(!child||child.closed)return;try{attachAudio();}catch{}const value=String(text).slice(0,160);if(value===lastHud)return;lastHud=value;try{child.document.querySelector('#live-hud').textContent=value;}catch{close(true);}}
 return{open,close,update,get ready(){return ready&&!!child&&!child.closed&&stream?.getVideoTracks?.().some(t=>t.readyState==='live');},get opened(){return!!child&&!child.closed;}};
}
