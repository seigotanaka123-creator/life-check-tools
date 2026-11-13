/* One early keyboard boundary, shared by walking, vehicles and island activities.
 * Keep the original event/target/trust and existing physics input handlers.
 * Preferences are independent of game saves and never contain game state. */
(function (global) {
  'use strict';
  if (global.IMASORA_KEYS) return;
  const storageKey = 'imasora-keyboard-controls-v1';
  const actions = [
    {id:'forward',name:'前へ',icon:'↑',group:'移動',keys:['KeyW','ArrowUp']},
    {id:'back',name:'後ろへ',icon:'↓',group:'移動',keys:['KeyS','ArrowDown']},
    {id:'left',name:'左へ',icon:'←',group:'移動',keys:['KeyA','ArrowLeft']},
    {id:'right',name:'右へ',icon:'→',group:'移動',keys:['KeyD','ArrowRight']},
    {id:'jump',name:'ジャンプ',icon:'↟',group:'歩くとき',contexts:['walk'],keys:['KeyE','KeyB','KeyJ']},
    {id:'dash',name:'ダッシュ',icon:'≫',group:'歩くとき',contexts:['walk'],keys:['Space','KeyK']},
    {id:'confirm',name:'決定・目の前のアクション',icon:'✓',group:'決定とメニュー',keys:['Space','Enter'],confirm:true},
    {id:'menu',name:'メニュー',icon:'⚙',group:'決定とメニュー',keys:['Escape'],menu:true},
    {id:'tool',name:'道具のアクション・UFOの攻撃',icon:'✦',group:'道具とUFO',contexts:['walk','raft','ufo'],keys:['KeyF']},
    {id:'secondary',name:'乗り物の補助操作',icon:'↔',group:'道具とUFO',contexts:['walk','raft','ufo'],keys:['KeyX']},
    {id:'shoot',name:'UFOの射撃',icon:'✧',group:'道具とUFO',contexts:['ufo'],keys:['Space']},
    {id:'oarLeft',name:'左のオール',icon:'↶',group:'いかだ',contexts:['raft'],keys:['KeyJ']},
    {id:'oarBoth',name:'両方のオール',icon:'⇈',group:'いかだ',contexts:['raft'],keys:['KeyK']},
    {id:'oarRight',name:'右のオール',icon:'↷',group:'いかだ',contexts:['raft'],keys:['KeyL']},
    {id:'brake',name:'いかだを減速',icon:'≋',group:'いかだ',contexts:['raft'],keys:['KeyI']},
    {id:'net',name:'網ですくう',icon:'◉',group:'シュノーケリング',contexts:['swim'],keys:['KeyE']},
    {id:'dive',name:'もぐる',icon:'↓',group:'シュノーケリング',contexts:['swim'],keys:['KeyF']},
    {id:'surface',name:'水面へ',icon:'↑',group:'シュノーケリング',contexts:['swim'],keys:['KeyR']},
    {id:'kick',name:'はやく泳ぐ',icon:'≫',group:'シュノーケリング',contexts:['swim'],keys:['Space']}
  ];
  const byId = new Map(actions.map(a=>[a.id,a]));
  const defaults = () => Object.fromEntries(actions.map(a=>[a.id,[...a.keys]]));
  const copy = value => Object.fromEntries(actions.map(a=>[a.id,[...value[a.id]]]));
  const validCode = c => typeof c==='string' && /^(?:Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Arrow(?:Up|Down|Left|Right)|Space|Enter|Escape|ShiftLeft|ShiftRight|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Comma|Period|Slash|Backslash|Semicolon|Quote|BracketLeft|BracketRight|Minus|Equal|Backquote|IntlBackslash|IntlRo|IntlYen)$/.test(c);
  function label(code) {
    const names={Space:'Space',Enter:'Enter',Escape:'Esc',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'左Shift',ShiftRight:'右Shift',Backspace:'Backspace',Delete:'Delete',Insert:'Insert',Home:'Home',End:'End',PageUp:'PageUp',PageDown:'PageDown',Comma:',',Period:'.',Slash:'/',Backslash:'\\',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Minus:'−',Equal:'=',Backquote:'`',IntlBackslash:'\\',IntlRo:'ろ',IntlYen:'¥'};
    return names[code] || (/^Key/.test(code)?code.slice(3):/^Digit/.test(code)?code.slice(5):/^Numpad/.test(code)?'テンキー '+code.slice(6):code);
  }
  function overlaps(a,b) {
    if ((a.confirm && ['dash','kick','shoot'].includes(b.id)) || (b.confirm && ['dash','kick','shoot'].includes(a.id))) return false;
    return !a.contexts || !b.contexts || a.contexts.some(c=>b.contexts.includes(c));
  }
  function problem(value) {
    if (!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(id=>!byId.has(id))) return '設定の形を確認できません。';
    for (const a of actions) {
      const keys=value[a.id];
      if (!Array.isArray(keys) || keys.length!==a.keys.length || !keys.some(Boolean) || keys.some(k=>k!==null && (!validCode(k) || k==='Escape'&&!a.menu)) || new Set(keys.filter(Boolean)).size!==keys.filter(Boolean).length) return a.name+'のキーを確認してください。';
      for (const b of actions) if (a!==b && overlaps(a,b) && keys.some(k=>k && value[b.id]?.includes(k))) return '「'+a.name+'」と「'+b.name+'」でキーが重なっています。';
    }
    return '';
  }
  function read(raw) { try { if(typeof raw!=='string'||raw.length>8192)return null;const data=JSON.parse(raw); return data?.version===1&&!problem(data.bindings)?copy(data.bindings):null; } catch { return null; } }
  let storage=null,loadProblem='';
  try { storage=global.localStorage; } catch { loadProblem='このブラウザではキー設定を保存できません。'; }
  let bindings=defaults();
  try { const raw=storage?.getItem(storageKey);if(raw){const saved=read(raw);if(saved)bindings=saved;else loadProblem='キー設定を読み取れなかったため、初期設定で操作できます。';} } catch { loadProblem='キー設定を読み取れません。初期設定で操作できます。'; }
  let runtime={enabled:()=>false,context:()=> 'walk',clearInput:()=>{},menu:()=>{}},capture=null,lastContext=null;
  const listeners=new Set(),held=new Map(),swallowed=new Set(),internal=new WeakSet();
  const doc=global.document;
  const changed=()=>listeners.forEach(fn=>fn());
  const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
  function eventCode(e) { return e.code || (e.key===' '?'Space':e.key==='Escape'?'Escape':e.key==='Enter'?'Enter':/^[a-z]$/i.test(e.key||'')?'Key'+e.key.toUpperCase():''); }
  function keyFor(code) {
    return ({Space:' ',Enter:'Enter',Escape:'Escape',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',ShiftLeft:'Shift',ShiftRight:'Shift',F24:'Unidentified'})[code] || (/^Key/.test(code)?code.slice(3).toLowerCase():/^Digit/.test(code)?code.slice(5):label(code));
  }
  function rewrite(e,code,confirm=false) {
    Object.defineProperties(e,{code:{configurable:true,value:code},key:{configurable:true,value:keyFor(code)},imasoraConfirm:{configurable:true,value:confirm}});
  }
  function releaseAll() {
    for (const [physical,item] of held) {
      swallowed.add(physical);
      const event=new global.KeyboardEvent('keyup',{code:item.code,key:keyFor(item.code),bubbles:true,cancelable:true});
      Object.defineProperty(event,'imasoraConfirm',{value:item.confirm});
      internal.add(event);global.dispatchEvent(event);
    }
    held.clear();global.IMASORA_BUTTON_FEEDBACK?.release();runtime.clearInput();
  }
  function commit(next) {
    const error=problem(next);if(error)return error;
    if(!storage)return '保存できませんでした。キー設定は変更していません。';
    try { storage.setItem(storageKey,JSON.stringify({version:1,bindings:next})); }
    catch { return '保存できませんでした。キー設定は変更していません。'; }
    releaseAll();bindings=copy(next);loadProblem='';changed();return '';
  }
  function assign(id,slot,code) {
    const a=byId.get(id);if(!a || !Number.isInteger(slot) || slot<0 || slot>=a.keys.length)return '操作を選び直してください。';
    const next=copy(bindings);next[id][slot]=code;return commit(next);
  }
  function cancelCapture() { if(!capture)return;const done=capture.done;capture=null;done('キー変更を取り消しました。'); }
  function isEditable(target) { return target?.isContentEditable || !!target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]'); }
  function topDialog() { return [...(doc?.querySelectorAll?.('dialog[open],[role="dialog"]:not([hidden]),[role="alertdialog"]:not([hidden])')??[])].filter(el=>el.checkVisibility?.()!==false && (el.getClientRects?.().length??1)>0).at(-1); }
  function down(e) {
    if(internal.has(e))return;
    const physical=eventCode(e);
    if(capture){consume(e);if(e.repeat)return;if(physical==='Escape'){swallowed.add(physical);cancelCapture();return;}if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||!validCode(physical)){capture.done('このキーは使えません。文字・数字・矢印などを押してください。',true);return;}const pending=capture,error=assign(pending.id,pending.slot,physical);swallowed.add(physical);if(!error)capture=null;pending.done(error||'保存しました。',!!error);return;}
    if(swallowed.has(physical)){consume(e);return;}
    if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||isEditable(e.target)||doc?.hidden||!runtime.enabled())return;
    const context=runtime.context();
    if(lastContext!==context){releaseAll();lastContext=context;if(e.repeat){consume(e);return;}}
    const dialog=topDialog(),confirm=bindings.confirm.includes(physical),menu=bindings.menu.includes(physical);
    if(dialog){
      if(held.size)releaseAll();
      if(menu && physical!=='Escape'){consume(e);if(!e.repeat)runtime.menu();swallowed.add(physical);return;}
      if(confirm && physical!=='Escape'){
        const button=e.target?.closest?.('button,[role="button"],a[href]');
        if(button && !button.disabled && !button.closest('[inert],[hidden]') && button.checkVisibility?.()!==false){consume(e);swallowed.add(physical);if(!e.repeat)button.click();return;}
        if(physical!=='Space'&&physical!=='Enter'){rewrite(e,'Enter',true);e.preventDefault();}
      }
      return;
    }
    if(menu){consume(e);swallowed.add(physical);if(!e.repeat){releaseAll();runtime.menu();}return;}
    const active=actions.filter(a=>!a.menu&&(!a.contexts||a.contexts.includes(context)));
    const action=active.find(a=>!a.confirm&&bindings[a.id].includes(physical));
    const original=active.some(a=>a.keys.includes(physical));
    if(!action&&!confirm){if(original){consume(e);swallowed.add(physical);}return;}
    const previous=held.get(physical);
    if(e.repeat&&!previous){consume(e);return;}
    const slot=action?bindings[action.id].indexOf(physical):-1,code=previous?.code || (action?action.keys[slot]:'Enter');
    held.set(physical,{code,confirm});rewrite(e,code,confirm);
    if(code!==physical)e.preventDefault();
  }
  function up(e) {
    if(internal.has(e))return;const physical=eventCode(e);
    if(capture){consume(e);swallowed.delete(physical);return;}
    if(swallowed.delete(physical)){consume(e);return;}
    const item=held.get(physical);if(!item)return;held.delete(physical);rewrite(e,item.code,item.confirm);if(item.code!==physical)e.preventDefault();
  }
  global.addEventListener('keydown',down,true);global.addEventListener('keyup',up,true);
  for(const type of ['blur','pagehide'])global.addEventListener(type,()=>{releaseAll();cancelCapture();});
  doc?.addEventListener('visibilitychange',()=>{if(doc.hidden){releaseAll();cancelCapture();}});
  global.addEventListener('storage',e=>{if(e.key!==storageKey)return;const next=e.newValue===null?defaults():read(e.newValue);if(!next)return;releaseAll();bindings=next;changed();});
  function createPanel({clearInput=()=>{}}={}) {
    const panel=doc.createElement('section');panel.className='keyboard-settings';panel.dataset.popSkip='';
    panel.innerHTML='<div class="keyboard-settings-intro"><span aria-hidden="true">⌨</span><div><h3>キーボード</h3><p>変えたいキーを選んで、好きなキーを押そう。</p></div></div><p class="keyboard-settings-note">すべての冒険マップで共通。設定は自動で保存されるよ。</p><p class="keyboard-settings-status" role="status" aria-live="polite"></p><div data-keyboard-groups></div><footer><button type="button" data-keyboard-reset>初期設定に戻す</button><p>Escで変更をキャンセル。文字の入力中は、ゲームの操作は動かないよ。</p></footer>';
    const status=panel.querySelector('[role="status"]'),rows=[];
    for(const group of new Set(actions.map(a=>a.group))){
      const section=doc.createElement('section');section.className='keyboard-settings-group';const heading=doc.createElement('h4');heading.textContent=group;section.append(heading);
      for(const a of actions.filter(a=>a.group===group)){
        const row=doc.createElement('div');row.className='keyboard-settings-row';row.innerHTML='<div class="keyboard-settings-action"><span aria-hidden="true"></span><strong></strong></div><div class="keyboard-settings-keys"></div>';row.querySelector('span').textContent=a.icon;row.querySelector('strong').textContent=a.name;
        const slots=[];for(let i=0;i<a.keys.length;i++){
          const slot=doc.createElement('span');slot.className='keyboard-settings-slot';const button=doc.createElement('button'),remove=doc.createElement('button');button.type=remove.type='button';button.dataset.keyAction=a.id;button.dataset.keySlot=String(i);remove.textContent='×';remove.className='keyboard-key-remove';
          button.onclick=()=>{cancelCapture();releaseAll();clearInput();capture={id:a.id,slot:i,done:(text,waiting)=>{status.textContent=text;status.dataset.error=String(!!waiting);render();}};status.textContent='「'+a.name+'」のキーを押してね。Escでキャンセル。';status.dataset.error='false';render();};
          remove.onclick=()=>{cancelCapture();const error=assign(a.id,i,null);status.textContent=error||'保存しました。';status.dataset.error=String(!!error);render();};slot.append(button,remove);row.querySelector('.keyboard-settings-keys').append(slot);slots.push({button,remove});
        }section.append(row);rows.push({a,slots});
      }panel.querySelector('[data-keyboard-groups]').append(section);
    }
    function render(){for(const{a,slots}of rows)slots.forEach(({button,remove},i)=>{const key=bindings[a.id][i],waiting=capture?.id===a.id&&capture.slot===i;button.textContent=waiting?'キーを押してね':key?label(key):'＋';button.dataset.waiting=String(waiting);button.setAttribute('aria-label',a.name+'：'+(key?label(key):'キーを追加'));remove.hidden=!key||bindings[a.id].filter(Boolean).length<2;remove.setAttribute('aria-label',a.name+'の'+label(key)+'を外す');});}
    panel.querySelector('[data-keyboard-reset]').onclick=()=>{cancelCapture();const error=commit(defaults());status.textContent=error||'初期設定に戻しました。';status.dataset.error=String(!!error);render();};
    panel.cancelCapture=cancelCapture;status.textContent=loadProblem||'同じキーでも、歩く・いかだ・泳ぐで別の操作を設定できるよ。';listeners.add(render);render();return panel;
  }
  global.IMASORA_KEYS={
    actions,storageKey,label,problem,assign,reset:()=>commit(defaults()),
    get bindings(){return copy(bindings);},get capturing(){return !!capture;},
    describe:id=>(bindings[id]??[]).filter(Boolean).map(label).join(' ／ '),
    connect(options){releaseAll();runtime={...runtime,...options};lastContext=null;},
    release:releaseAll,cancelCapture,createPanel,
    onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}
  };
})(globalThis);

/* BEGIN GAME BUTTON FEEDBACK */
// Embedded identically in the keyboard and touch entry points. Either can load first.
(function installGameButtonFeedback(global){
 'use strict';const doc=global.document;if(!doc?.createElement||!global.addEventListener||global.IMASORA_BUTTON_FEEDBACK)return;
 const buttonSelector='button,[role="button"],input[type="button"],input[type="submit"]';
 const editable='input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable],[role="textbox"]';
 const style=doc.createElement('style');style.id='imasora-game-button-feedback';
 style.textContent=`:is(${buttonSelector}):not(:disabled):not([aria-disabled="true"]){translate:0 -2px;filter:drop-shadow(0 3px 0 #14394d66)}
 :is(${buttonSelector})[data-game-press="true"],body.hunt #dash[data-latched="true"]{translate:0 2px!important;filter:brightness(.94) drop-shadow(0 1px 0 #14394d66)!important;box-shadow:inset 0 3px 5px #102d4555,inset 0 -1px 1px #ffffff55!important}
 @media(prefers-reduced-motion:no-preference){:is(${buttonSelector}){transition:translate 55ms ease-out,filter 55ms ease-out}}`;
 (doc.head||doc.documentElement).append(style);
 const owners=new Map(),painted=new Set();
 let keyboardScope=()=>doc;
 const onScreen=b=>!b.closest('[hidden],[inert]')&&(b.checkVisibility?.()??true)&&(b.getClientRects?.().length??1)>0;
 const visible=b=>!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&onScreen(b);
 const button=target=>target?.closest?.(buttonSelector);
 function paint(){const next=new Set();for(const buttons of owners.values())for(const b of buttons)if(onScreen(b))next.add(b);for(const b of painted)if(!next.has(b))b.removeAttribute('data-game-press');for(const b of next)b.setAttribute('data-game-press','true');painted.clear();for(const b of next)painted.add(b);}
 function release(){owners.clear();paint();}
 function releaseKeyboard(){
  for(const owner of owners.keys())if(owner.startsWith('key:'))owners.delete(owner);
  paint();
 }
 function pointerDown(e){if(e.button>0||e.pointerType==='touch')return;const b=button(e.target);if(!b||!visible(b))return;owners.set('pointer:'+e.pointerId,new Set([b]));paint();}
 function move(id,e){const held=owners.get(id);if(!held)return;const origin=[...held][0];if(doc.body?.classList.contains('hunt')&&origin?.closest('#pair')&&['dash','jump'].includes(origin.id)){const over=button(doc.elementFromPoint(e.clientX,e.clientY));owners.set(id,new Set(over?.closest('#pair')&&['dash','jump'].includes(over.id)?[origin,over]:[origin]));paint();}}
 function pointerMove(e){move('pointer:'+e.pointerId,e);}
 function pointerUp(e){owners.delete('pointer:'+e.pointerId);paint();}
 for(const [type,fn]of [['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerUp],['lostpointercapture',pointerUp]])doc.addEventListener(type,fn,true);
 // Touch identifiers reconcile Safari's omitted pointer-up without releasing a second finger.
 function touch(e){const live=new Set(Array.from(e.touches??[],t=>'touch:'+t.identifier));for(const id of owners.keys())if(id.startsWith('touch:')&&!live.has(id))owners.delete(id);for(const t of Array.from(e.changedTouches??[])){const id='touch:'+t.identifier;if(e.type==='touchstart'){const b=button(t.target??e.target);if(b&&visible(b))owners.set(id,new Set([b]));}else if(e.type==='touchmove')move(id,t);else owners.delete(id);}paint();}
 for(const type of ['touchstart','touchmove','touchend','touchcancel'])doc.addEventListener(type,touch,{capture:true,passive:true});
 const aliases={up:'forward',down:'back',backward:'back',accelerate:'forward',throttle:'forward',reverse:'back',fire:'shoot',rise:'surface'};
 function actionFor(b){
  if(b.closest('.keyboard-settings'))return null;
  const declared=b.dataset.gameAction||b.dataset.action||b.dataset.move||b.dataset.drive||b.dataset.hold;
  if(declared)return aliases[declared]||declared;
  const id=b.id??'',classes=b.classList;
  if(b.dataset.oar)return {left:'oarLeft',both:'oarBoth',right:'oarRight',brake:'brake'}[b.dataset.oar];
  if(id==='ufoSpaceFireButton')return 'shoot';
  if(id==='use'&&doc.body?.classList.contains('hunt'))return 'huntItem';
  if(id==='dive'&&doc.body?.classList.contains('hunt'))return 'huntDive';
  if(b.dataset.freeJump!==undefined||/jump/i.test(id)||classes.contains('jump'))return 'jump';
  if(b.dataset.holdDash!==undefined||/dash/i.test(id)||classes.contains('dash'))return 'dash';
  for(const [c,a]of [['coast-snorkel-dive','dive'],['coast-snorkel-rise','surface'],['coast-snorkel-net','net'],['coast-snorkel-kick','kick']])if(classes.contains(c))return a;
  return null;
 }
 function keysFor(b,e){
  const api=global.IMASORA_KEYS,bindings=api?.bindings??{},canonical=Object.prototype.hasOwnProperty.call(e,'imasoraConfirm');
  const action=actionFor(b),defaults=api?.actions?.find(a=>a.id===action)?.keys??[];
  if(action==='huntDive'||action==='huntItem'){
   const key=action==='huntDive'?'KeyH':'KeyL',conflict=['forward','back','left','right','jump','dash','tool','menu'].some(a=>bindings[a]?.includes(key));
   return [...(!conflict?[key]:[]),...(action==='huntItem'?(bindings.tool??[]):[])];
  }
  if(action&&api){const keys=canonical?defaults:(bindings[action]??[]);return b.id==='ufoSpaceFireButton'?[...keys,'KeyJ']:keys;}
  if(!api&&['jump','brake'].includes(action))return ['Space'];
  if(action&&['forward','back','left','right'].includes(action))return {forward:['KeyW','ArrowUp'],back:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']}[action];
  // Explicit per-map shortcuts also cover controls which have no shared action.
  return (b.getAttribute('aria-keyshortcuts')??'').split(/\s+/).filter(Boolean).map(k=>/^[a-z]$/i.test(k)?'Key'+k.toUpperCase():k);
 }
 function keyDown(e){
  if(e.code==='Escape'){release();return;}
  if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing||global.IMASORA_KEYS?.capturing||e.target?.closest?.(editable)||doc.hidden)return;
  if(doc.body?.classList.contains('hunt')&&!doc.body.classList.contains('playing'))return;
  const scope=keyboardScope(e);
  if(!scope){releaseKeyboard();return;}
  if(e.repeat&&owners.has('key:'+e.code))return;
  const matches=[...scope.querySelectorAll(buttonSelector)].filter(b=>visible(b)&&keysFor(b,e).includes(e.code));
  if(matches.length){owners.set('key:'+e.code,new Set(matches));paint();}
 }
 function keyUp(e){owners.delete('key:'+e.code);paint();}
 global.addEventListener('keydown',keyDown,true);global.addEventListener('keyup',keyUp,true);
 for(const type of ['blur','pagehide'])global.addEventListener(type,release);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)release();});
 global.IMASORA_BUTTON_FEEDBACK={release,releaseKeyboard,setKeyboardScope(resolve){releaseKeyboard();keyboardScope=resolve;}};
})(globalThis);
/* END GAME BUTTON FEEDBACK */
