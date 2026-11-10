import {tournamentPreviewCue} from './imasora-tournament-preview-cues.mjs';
// A read-only cinema, with its own graphics and audio lifecycle.
export function installTournamentPreview({documentTarget=globalThis.document,windowTarget=globalThis,makeView,loadResources,buildCharacter,arenas,moves,source,makeAudio,presentation,readSound=()=>({}),beforeOpen=()=>true,onOpen=()=>{},onClose=()=>{}}={}){
 const doc=documentTarget,win=windowTarget,entry=doc.getElementById('tournamentPreviewButton');let current=null;
 if(!entry)return{open:()=>false,close(){}};
 const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function close(){const c=current;if(!c)return;current=null;c.closed=true;c.serial++;c.audio?.stop();c.view?.dispose();for(const id of c.timers)win.clearTimeout(id);c.timers.clear();for(const id of c.frames)win.cancelAnimationFrame(id);c.frames.clear();doc.removeEventListener('visibilitychange',c.visibility);c.dialog.remove();try{onClose();}finally{c.focus?.focus?.({preventScroll:true});}}
 async function open(){
  if(current)return true;if(!beforeOpen())return false;
  const dialog=doc.createElement('dialog');dialog.className='tournament-preview-dialog';dialog.setAttribute('aria-labelledby','tournamentPreviewTitle');
  dialog.innerHTML=`<header class="tp-heading"><div><span class="tp-eyebrow">TOURNAMENT CINEMA</span><h2 id="tournamentPreviewTitle">大会の映像を見る</h2></div><button type="button" data-tp-close aria-label="映像を閉じる">とじる ×</button></header><p class="tp-intro">好きな会場と技を、音といっしょに楽しもう。育成中でも見られます。</p><div class="tp-controls"><label>会場<select data-tp-arena>${Object.entries(arenas).map(([id,a])=>`<option value="${esc(id)}">${esc(a.name)}</option>`).join('')}</select></label><label>技<select data-tp-move>${moves.map(m=>`<option value="${esc(m.style)}">${esc(m.name)}</option>`).join('')}</select></label><label>BGM<select data-tp-music><option value="preliminary">予選</option><option value="final">決勝</option></select></label></div><div class="tp-actions"><button type="button" data-tp-play>▶ 技を再生</button><button type="button" data-tp-dodge>回避する映像</button><label><input type="checkbox" data-tp-side> 相手の技にする</label></div><p class="tp-status" role="status" data-tp-status>会場へ入っています…</p><section class="battle-field tournament-opening" data-tp-field aria-label="大会の観戦映像"></section><p class="tp-note">登場するモンスターは映像用です。大会への出場や育成・持ちもの・報酬は変わりません。</p>`;
  const c={dialog,focus:doc.activeElement,closed:false,serial:0,clockAt:0,clockReal:win.performance.now(),speed:0,timers:new Set(),frames:new Set(),audio:null,view:null,resources:null};current=c;
  const $=s=>dialog.querySelector(s),field=$('[data-tp-field]'),status=$('[data-tp-status]');c.field=field;
  const now=()=>c.clockAt+(win.performance.now()-c.clockReal)*c.speed;
  const clock=(at,speed)=>{c.clockAt=at;c.clockReal=win.performance.now();c.speed=speed;};
  const schedule=(fn,ms)=>{const id=win.setTimeout(()=>{c.timers.delete(id);if(!c.closed)fn();},ms);c.timers.add(id);return id;};
  function halt(){c.serial++;c.audio?.stop();c.audio=null;for(const id of c.timers)win.clearTimeout(id);c.timers.clear();for(const id of c.frames)win.cancelAnimationFrame(id);c.frames.clear();field.classList.remove('battle-screen-shake');clock(now(),0);}
  function drainHp(cue){if(cue.from===cue.to)return;schedule(()=>{const el=field.querySelector('#'+(cue.target==='me'?'tpMyFighter':'tpEnemyFighter')+' .hp-current');if(!el)return;const started=win.performance.now();const tick=()=>{if(c.closed)return;const progress=Math.min(1,(win.performance.now()-started)/(cue.drainDuration*1000));el.textContent=String(Math.round(cue.from+(cue.to-cue.from)*progress));if(progress<1){const id=win.requestAnimationFrame(()=>{c.frames.delete(id);tick();});c.frames.add(id);}};tick();},cue.drainAt*1000);}
  function shake(){if(c.closed)return;field.classList.remove('battle-screen-shake');void field.offsetWidth;field.classList.add('battle-screen-shake');field.dataset.previewShakes=String((Number(field.dataset.previewShakes)||0)+1);schedule(()=>field.classList.remove('battle-screen-shake'),520);}
  const viewWindow={performance:{now},devicePixelRatio:win.devicePixelRatio,matchMedia:q=>win.matchMedia(q),requestAnimationFrame:fn=>win.requestAnimationFrame(()=>fn(now())),cancelAnimationFrame:id=>win.cancelAnimationFrame(id),addEventListener:(...a)=>win.addEventListener(...a),removeEventListener:(...a)=>win.removeEventListener(...a),MutationObserver:win.MutationObserver,ResizeObserver:win.ResizeObserver,IntersectionObserver:win.IntersectionObserver};
  async function show({play=false,hit=true}={}){
   halt();const token=c.serial;status.textContent=play?'技を準備しています…':'会場へ入っています…';
   let audioReady;if(play){c.audio=makeAudio({settings:readSound(),onNotice:text=>{if(!c.closed)status.textContent=text;}});audioReady=c.audio.prepare($('[data-tp-arena]').value,$('[data-tp-music]').value==='final');}
   try{
    const [T,C]=await c.resources;await audioReady;if(c.closed||token!==c.serial)return;
    const m=moves.find(m=>m.style===$('[data-tp-move]').value)||moves[0],side=$('[data-tp-side]').checked?'enemy':'me',family=m.family==='default'?'white':m.family;
    const caster=C.MonsterNames.entries.find(e=>e.family===family&&e.stage==='開花期'),other=C.MonsterNames.entries.find(e=>e.family===(family==='river'?'walk':'river')&&e.stage==='開花期');
    if(!caster||!other)throw Error('NO_PREVIEW_ACTORS');
    const ids=side==='me'?[caster.id,other.id]:[other.id,caster.id],names=ids.map(id=>C.MonsterNames.name(id));
    const cfg=source.config({visualType:m.style,tier:m.tier,actor:side});const impactAt=2.7+cfg.impactTime;
    const chargeSequence=play?source.createChargeSequence(m.tier,{audible:!!c.audio?.audible,clock:()=>win.performance.now()/1000}):null;
    const cue=play?tournamentPreviewCue({presentation,move:m,side,names,ids,hit}):null;
    field.className='battle-field '+(play?'watching magic-scene-'+m.tier+' magic-style-custom magic-variant-'+m.style+' technique-'+(hit?'hit':'miss'):'tournament-opening');field.style.setProperty('--magic-start-delay','2.7s');
    field.innerHTML=`<div class="battle-hud"><span class="battle-title">${esc(arenas[$('[data-tp-arena]').value].name)}${play?' / '+esc(m.name):''}</span></div>`+names.map((name,i)=>`<div class="fighter" id="${i?'tpEnemyFighter':'tpMyFighter'}"><div class="pixel-fighter">${cue?cue.hp(i):'<span class="hp-number">HP100/100</span><span class="hp-strip"><i style="--hp:100%"></i></span>'}<span>${esc(name)}</span></div></div>`).join('')+(cue?`<div class="battle-effect-layer">${cue.html}</div>`:'');
    clock(0,0);const shown=await c.view.show(field,{cupId:$('[data-tp-arena]').value,mode:play?'battle':'opening',chargeSequence,playerId:ids[0],enemyId:ids[1],actor:side,hit,tier:m.tier,visualType:m.style,moveName:m.name,casterName:caster.name,effectOriginAt:2.7,releaseAt:2.7+cfg.attackStart,impactAt,decisionAt:12,targetHpAfter:cue?.to,hurtUntil:cue?cue.drainAt+cue.drainDuration:undefined,cameraHoldUntil:cue?.cameraHoldUntil});
    if(!shown)throw Error('PREVIEW_VIEW_UNAVAILABLE');
    if(c.closed||token!==c.serial)return;
    if(play){clock(0,1);c.audio.technique({tier:m.tier,style:m.style,impactAt,releaseAt:2.7+cfg.attackStart,hit,onShake:shake,cue,chargeSequence});drainHp(cue);status.textContent=m.name+(hit?' — 命中する映像':' — 回避する映像');schedule(()=>{clock(now(),0);status.textContent='もう一度再生したり、別の会場や技を選べます。';},10500);}else status.textContent='会場と技を選んで「技を再生」を押してね。';
   }catch{if(c.closed||token!==c.serial)return;halt();status.textContent='映像を準備できませんでした。再生ボタンでもう一度試せます。';}
  }
  c.visibility=()=>{if(doc.hidden){halt();status.textContent='映像を休止しました。「技を再生」で再開できます。';}};doc.addEventListener('visibilitychange',c.visibility);
  $('[data-tp-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);$('[data-tp-play]').onclick=()=>show({play:true});$('[data-tp-dodge]').onclick=()=>show({play:true,hit:false});for(const s of['[data-tp-arena]','[data-tp-move]','[data-tp-side]','[data-tp-music]'])$(s).onchange=()=>show();
  doc.body.append(dialog);try{onOpen();dialog.showModal();}catch{close();return false;}
  c.resources=Promise.resolve().then(loadResources);c.view=makeView({windowTarget:viewWindow,documentTarget:doc,renderClock:()=>win.performance.now(),loadResources:()=>c.resources,buildCharacter,onFailure:()=>{if(!c.closed)status.textContent='3D映像を表示できませんでした。再生ボタンでもう一度試せます。';}});
  await show();return !c.closed;
 }
 entry.onclick=()=>{void open();};win.addEventListener('pagehide',close);
 return{open,close,get active(){return!!current;}};
}
