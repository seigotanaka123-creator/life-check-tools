// BEGIN TAG AUDIO
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ImasoraTagAudio=api;})(globalThis,function(){
 'use strict';const KEY='imasora-sliding-tag-sound-v1',types=new Set(['count','go','jump','land','step','touch','timeout','win','loss','bell','item','detect']);
 function preference(storage){try{const p=JSON.parse(storage.getItem(KEY));if(p?.version===1&&typeof p.enabled==='boolean'&&Number.isFinite(p.volume)&&p.volume>0&&p.volume<=1)return{enabled:p.enabled,volume:p.volume};}catch{}try{const level=Number(JSON.parse(storage.getItem('lifeQuestWalkV1'))?.soundVolumes?.sfx??5);if(Number.isFinite(level)&&level>=0&&level<=5)return{enabled:level>0,volume:level>0?level/5:1};}catch{}return{enabled:true,volume:1};}
 function savePreference(storage,p){try{storage.setItem(KEY,JSON.stringify({version:1,enabled:!!p.enabled,volume:p.volume}));return true;}catch{return false;}}
 function create({enabled=true,volume=1,getContext=()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;return C?new C():null;},onState=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let monitor=true,context=null,master=null,noise=null,glide=null,wanted=false,disposed=false,available=true,generation=0,suspendTimer=null,lastGlide=-Infinity;const voices=new Set(),lastCue=new Map(),counts={};
  const emit=()=>{try{onState({enabled,available,context:context?.state??'idle'});}catch{}};
  const safe=promise=>Promise.resolve(promise).catch(()=>{});
  function stopVoice(v,when){try{v.node.stop(when);}catch{} }
  function remove(v){voices.delete(v);for(const n of[v.node,v.gain,v.filter])try{n?.disconnect();}catch{} }
  function ensure(){if(disposed||!enabled)return false;if(context)return true;try{context=getContext();if(!context){available=false;emit();return false;}available=true;master=context.createGain();master.gain.value=.22*Math.max(0,Math.min(1,volume));if(monitor)master.connect(context.destination);noise=context.createBuffer(1,Math.ceil(context.sampleRate*.25),context.sampleRate);const data=noise.getChannelData(0);let seed=8273;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}context.onstatechange=emit;emit();return true;}catch{available=false;try{safe(context?.close());}catch{}context=null;emit();return false;}}
  function activate(){if(disposed||!enabled)return Promise.resolve(false);wanted=true;generation++;if(suspendTimer!==null){clearTimer(suspendTimer);suspendTimer=null;}if(!ensure())return Promise.resolve(false);const token=generation;master.gain.cancelScheduledValues(context.currentTime);master.gain.setValueAtTime(.22*volume,context.currentTime);let resumed;try{resumed=context.state==='running'?Promise.resolve():context.resume();}catch{emit();return Promise.resolve(false);}return Promise.resolve(resumed).then(()=>{if(!wanted||disposed){safe(context?.suspend());return false;}emit();return token===generation&&context.state==='running';},()=>{emit();return false;});}
  function fade(v,t){v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.006);stopVoice(v,t+.03);}
  function quiet(){if(disposed)return;wanted=false;generation++;const token=generation;if(suspendTimer!==null)clearTimer(suspendTimer);if(context){const t=context.currentTime;for(const v of voices)fade(v,t);if(glide){fade(glide,t);glide=null;}suspendTimer=setTimer(()=>{suspendTimer=null;if(token===generation&&!wanted&&!disposed)safe(context.suspend());},40);}emit();}
  function enabledState(value){enabled=!!value;if(!enabled)quiet();emit();}
  function voice(kind,frequency,duration,level,delay=0,to=frequency){if(voices.size>=8)return false;const t=context.currentTime+delay,gain=context.createGain(),node=kind==='noise'?context.createBufferSource():context.createOscillator();let filter=null;if(kind==='noise'){node.buffer=noise;filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=620;node.connect(filter);filter.connect(gain);}else{node.type=kind;node.frequency.setValueAtTime(frequency,t);node.frequency.exponentialRampToValueAtTime(Math.max(50,to),t+duration);node.connect(gain);}gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+.008);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);gain.connect(master);const v={node,gain,filter};voices.add(v);node.onended=()=>remove(v);node.start(t);node.stop(t+duration+.01);return true;}
  function play(cue){if(disposed||!enabled||!wanted||context?.state!=='running'||!cue||!types.has(cue.type))return false;const t=context.currentTime,key=cue.type,throttleKey=key==='jump'?key+cue.stage:key,interval=key==='detect'?1.2:key==='step'?.12:.06;if(t-(lastCue.get(throttleKey)??-Infinity)<interval)return false;lastCue.set(throttleKey,t);let ok=false;const tone=(frequency,duration=.12,level=.1,delay=0,to=frequency,kind='sine')=>{ok=voice(kind,frequency,duration,level,delay,to)||ok;};switch(key){
   case'detect':for(let i=0;i<4;i++)tone(1050,.045,.025,i*.13);break;
   case'bell':tone(1047,.3,.08);tone(1568,.24,.05,.07);break;
   case'item':tone(659,.12,.07);tone(988,.14,.06,.05);break;
   case'count':tone(cue.count===1?494:392,.07,.07);break;
   case'go':[523,659,784].forEach((f,i)=>tone(f,.16,.09,i*.06));break;
   case'jump':{const f=[392,523,659][Math.max(0,Math.min(2,(cue.stage||1)-1))];tone(f*.8,.12,.1,0,f*1.1);break;}
   case'land':tone(125,.09,.09,0,72);break;
   case'step':ok=voice('noise',0,.075,.07)||ok;tone(145,.055,.035,0,100);break;
   case'touch':tone(330,.16,.1,0,660);tone(880,.12,.06,.07);break;
   case'timeout':tone(392,.12,.07);break;
   case'win':[784,988,1175].forEach((f,i)=>tone(f,.23,.1,i*.095));break;
   case'loss':tone(523,.18,.08);tone(440,.23,.08,.13);break;
   default:return false;
  }if(ok)counts[key]=(counts[key]??0)+1;return ok;}
  function setGlide(value){if(!context||!wanted||!enabled||disposed||context.state!=='running')return;const amount=Math.max(0,Math.min(1,Number.isFinite(value)?value:0)),t=context.currentTime;if(!amount){if(glide){fade(glide,t);glide=null;}return;}if(!glide){const node=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();node.buffer=noise;node.loop=true;filter.type='bandpass';filter.Q.value=.6;filter.frequency.value=500;gain.gain.value=0;node.connect(filter);filter.connect(gain);gain.connect(master);const v={node,filter,gain};glide=v;node.onended=()=>{for(const n of[node,filter,gain])try{n.disconnect();}catch{}};node.start();lastGlide=-Infinity;}if(t-lastGlide<.05)return;lastGlide=t;glide.gain.gain.cancelScheduledValues(t);glide.gain.gain.setTargetAtTime(amount*.026,t,.025);glide.filter.frequency.setTargetAtTime(350+amount*700,t,.05);}
  function dispose(){if(disposed)return;quiet();disposed=true;if(suspendTimer!==null)clearTimer(suspendTimer);for(const v of voices)stopVoice(v);voices.clear();try{master?.disconnect();}catch{}safe(context?.close());}
  emit();return{activate,pause:quiet,setEnabled:enabledState,play,setGlide,dispose,setMonitor(value){const next=!!value;if(next===monitor)return;monitor=next;if(!master||!context)return;try{if(next)master.connect(context.destination);else master.disconnect(context.destination);}catch{}},get context(){return context;},stats:()=>({enabled,available,wanted,state:context?.state??'idle',voices:voices.size,gliding:!!glide,counts:{...counts}}),tap:node=>{if(master)master.connect(node);},untap:node=>{try{master?.disconnect(node);}catch{}}};
 }
 return Object.freeze({KEY,preference,savePreference,create});
});

// END TAG AUDIO
export const createHuntSound=globalThis.ImasoraTagAudio.create;
export const huntSoundPreference=globalThis.ImasoraTagAudio.preference;
export const saveHuntSound=globalThis.ImasoraTagAudio.savePreference;
