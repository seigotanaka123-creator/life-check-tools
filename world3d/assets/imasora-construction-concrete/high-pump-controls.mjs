import {highCastings,HIGH_CAST_MS} from './high-casting-state.mjs?v=120ft';
import {upperCastingCapacity} from './high-casting-shape.mjs?v=120fl';
import {createActiveWorkClock} from './active-work-clock.mjs?v=120fk';
const clocks=new WeakMap();
export const upperCastingClock=service=>clocks.get(service)??null;
// Elapsed time here is a visual prediction only. Committed quarter-cups and
// completed pours always come from the project authority.
export function createUpperPumpControls({host,service,project,ready,run,show,paused,onView,notice}){
 const root=document.createElement('section');root.className='upper-pump-controls';root.setAttribute('aria-label','上の階へ生コンを送る');
 root.innerHTML='<strong>🏗️ 上の階へ生コンを送る</strong><div data-upper-targets></div><p data-upper-status role="status"></p><progress data-upper-meter max="8000" value="0"></progress><div class="upper-pump-actions"><button data-upper="legs">支持脚を出す</button><button data-upper="supply">ミキサー車をつなぐ</button><button data-upper="view">注ぎ口を近くで見る</button><button data-upper="connect">上階ホースをつなぐ</button><button data-upper="prime">ホースに用意する（1/4杯）</button><button data-upper="begin">上の階へ注ぐ（1/4杯）</button><button data-upper="cancel">送液をやめる</button><button data-upper="disconnect">上階ホースを外す</button></div>';
 host.append(root);const clock=createActiveWorkClock();let selected=null,key='',id=null,elapsed=0,pendingCommit=false,lastNotice='',detail=false;
 const b=n=>root.querySelector('[data-upper='+n+']'),status=root.querySelector('[data-upper-status]');
 const casting=()=>highCastings(project()?.freeBuild).find(c=>c.id===selected&&!c.stored);
 async function act(type,extra={}){if(!ready()||pendingCommit)return false;pendingCommit=true;try{const success=await run(type,extra,['FREE_PRIME','FREE_CONNECT','FREE_LEGS'].includes(type));if(success){lastNotice=({FREE_HIGH_CONNECT:'上階ホースがつながったよ。',FREE_HIGH_DISCONNECT:'上階ホースを外したよ。',FREE_HIGH_BEGIN:'上の階へ送っているよ。',FREE_HIGH_FLOW_FINISH:'送液完了！ 型枠に1/4杯届いたよ。',FREE_HIGH_FLOW_CANCEL:'送液をやめたよ。生コンはホースに戻したよ。',FREE_PRIME:'1/4杯、用意できたよ。'})[type]??lastNotice;notice(lastNotice);}return success;}finally{pendingCommit=false;refresh();}}
 b('legs').onclick=()=>act('FREE_LEGS',{deployed:true});b('supply').onclick=()=>act('FREE_CONNECT',{connected:true});b('view').onclick=()=>{if(!casting())return;detail=!detail;onView(casting().anchor,detail);refresh();};b('connect').onclick=()=>casting()&&act('FREE_HIGH_CONNECT',{castingId:selected});b('prime').onclick=()=>act('FREE_PRIME');b('begin').onclick=()=>casting()&&act('FREE_HIGH_BEGIN',{castingId:selected});b('cancel').onclick=()=>act('FREE_HIGH_FLOW_CANCEL');b('disconnect').onclick=()=>act('FREE_HIGH_DISCONNECT');
 function refresh(){const f=project()?.freeBuild,list=highCastings(f).filter(c=>!c.stored&&['framed','wet'].includes(c.stage)),pending=highCastings(f).find(c=>c.pending);root.hidden=!show()||!list.length&& !pending;if(root.hidden)return;
  if(!list.some(c=>c.id===selected))selected=pending?.id??list[0]?.id??null;const next=JSON.stringify(list.map(c=>[c.id,c.anchor.buildingId,c.anchor.floor]));if(next!==key){key=next;const targets=root.querySelector('[data-upper-targets]');targets.replaceChildren();for(const c of list){const btn=document.createElement('button');btn.dataset.upperCasting=c.id;btn.textContent='建物 '+c.anchor.buildingId.slice(9)+'・'+c.anchor.floor+'階';btn.onclick=()=>{selected=c.id;lastNotice='';refresh();};targets.append(btn);}}
  for(const btn of root.querySelectorAll('[data-upper-casting]')){btn.setAttribute('aria-pressed',String(btn.dataset.upperCasting===selected));btn.disabled=!ready()||!!pending||!!f.highPipe;}
  const c=casting(),capacity=c?upperCastingCapacity(c):0,can=ready()&&!pendingCommit;root.querySelector('[data-upper-meter]').hidden=!pending;root.querySelector('[data-upper-meter]').value=pending?elapsed:0;
  status.textContent=pending?'送液中 '+Math.min(100,Math.floor(elapsed/HIGH_CAST_MS*100))+'％'+(paused()?'（ひと休み）':'')+' ｜ '+pending.anchor.floor+'階 '+pending.fill/4+' / '+upperCastingCapacity(pending)/4+'杯・移送中 1/4杯':lastNotice||'①つなぐ → ②1/4杯を用意 → ③注ぐ。必要な量は選んだ形で変わるよ。';
  if(!pending&&c?.fill===capacity)status.textContent=f.highPipe?'いっぱいになったよ！ 上階ホースを外し、車を降りて選んだ階へ登ろう。':'型枠の量はそろったよ！ 車を降りて選んだ階へ登り、コテでならそう。';if(!pending&&c)status.textContent+=' ｜ '+c.anchor.floor+'階 '+c.fill/4+' / '+capacity/4+'杯・ホース '+f.hose/4+'杯';
  b('legs').hidden=f.pump.legs;b('legs').disabled=!can||!!pending;b('supply').hidden=f.connected;b('supply').disabled=!can||!!pending||!f.pump.legs;b('view').disabled=!c;b('view').textContent=detail?'車と注ぎ先を見る':'注ぎ口を近くで見る';b('connect').hidden=!!f.highPipe;b('connect').disabled=!can||!!pending||!c||c.fill>=capacity||f.aboard!=='pump'||!f.pump.legs||!f.connected;
  b('prime').hidden=!!pending;b('prime').disabled=!can||!!pending||!!f.hose||f.wet<1||!f.connected||c?.fill===capacity;
  b('begin').hidden=!!pending;b('begin').disabled=!can||!!pending||!c||c.fill>=capacity||f.hose<1||f.highPipe?.castingId!==selected;
  b('cancel').hidden=!pending;b('cancel').disabled=!can;b('disconnect').hidden=!f.highPipe;b('disconnect').disabled=!can||!!pending;
 }
 function tick(dt){const f=project()?.freeBuild,c=highCastings(f).find(c=>c.pending);if(!c){id=null;elapsed=0;clock.pause();clocks.delete(service);refresh();return;}if(id!==c.pending.id){id=c.pending.id;elapsed=c.pending.elapsedMs;lastNotice='';clock.pause();}elapsed=Math.max(elapsed,c.pending.elapsedMs);const advancing=!paused()&&!document.hidden,step=clock.step(advancing);
  if(advancing){elapsed=Math.min(HIGH_CAST_MS,elapsed+step);if(!pendingCommit&&ready()){const delta=Math.floor(elapsed-c.pending.elapsedMs);if(delta>=2000||elapsed===HIGH_CAST_MS&&delta>0)void act('FREE_HIGH_TICK',{elapsedMs:delta});else if(c.pending.elapsedMs===HIGH_CAST_MS)void act('FREE_HIGH_FLOW_FINISH');}}
  clocks.set(service,{id:c.pending.id,elapsed});refresh();
 }
 return{refresh,tick,pause:()=>clock.pause(),get visible(){return !root.hidden;},get pending(){return highCastings(project()?.freeBuild).some(c=>c.pending);}};
}
