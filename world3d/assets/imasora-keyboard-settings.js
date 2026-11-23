/* One early keyboard boundary, shared by walking, vehicles and island activities.
 * Keep the original event/target/trust and existing physics input handlers.
 * Preferences are independent of game saves and never contain game state. */
(function (global) {
  'use strict';
  if (global.IMASORA_KEYS) return;
  const storageKey = 'imasora-keyboard-controls-v1';
  const menuKey='F8';
  const swimLayout=2,legacySwimKeys={net:'KeyE',dive:'KeyF',surface:'KeyR',kick:'Space'};
  const actions = [
    {id:'forward',name:'前へ',icon:'↑',group:'移動',keys:['KeyW','ArrowUp']},
    {id:'back',name:'後ろへ',icon:'↓',group:'移動',keys:['KeyS','ArrowDown']},
    {id:'left',name:'左へ',icon:'←',group:'移動',keys:['KeyA','ArrowLeft']},
    {id:'right',name:'右へ',icon:'→',group:'移動',keys:['KeyD','ArrowRight']},
    {id:'jump',name:'ジャンプ',icon:'↟',group:'歩くとき',contexts:['walk'],keys:['KeyE','KeyB','KeyJ','Space']},
    {id:'dash',name:'ダッシュ',icon:'≫',group:'歩くとき',contexts:['walk'],keys:[null,'KeyK']},
    {id:'confirm',name:'決定・目の前のアクション',icon:'✓',group:'決定とメニュー',keys:['Space','Enter'],confirm:true},
    {id:'menu',name:'メニュー',icon:'⚙',group:'決定とメニュー',keys:[menuKey],menu:true},
    {id:'tool',name:'道具のアクション・UFOの攻撃',icon:'✦',group:'道具とUFO',contexts:['walk','raft','ufo'],keys:['KeyF']},
    {id:'secondary',name:'乗り物の補助操作',icon:'↔',group:'道具とUFO',contexts:['walk','raft','ufo'],keys:['KeyX']},
    {id:'shoot',name:'UFOの射撃',icon:'✧',group:'道具とUFO',contexts:['ufo'],keys:['Space']},
    {id:'oarLeft',name:'左のオール',icon:'↶',group:'いかだ',contexts:['raft'],keys:['KeyJ']},
    {id:'oarBoth',name:'両方のオール',icon:'⇈',group:'いかだ',contexts:['raft'],keys:['KeyK']},
    {id:'oarRight',name:'右のオール',icon:'↷',group:'いかだ',contexts:['raft'],keys:['KeyL']},
    {id:'brake',name:'いかだを減速',icon:'≋',group:'いかだ',contexts:['raft'],keys:['KeyI']},
    {id:'net',name:'網ですくう',icon:'◉',group:'シュノーケリング',contexts:['swim'],keys:['KeyI']},
    {id:'dive',name:'潜る',icon:'↓',group:'シュノーケリング',contexts:['swim'],keys:['KeyL']},
    {id:'surface',name:'浮上',icon:'↑',group:'シュノーケリング',contexts:['swim'],keys:['KeyJ']},
    {id:'kick',name:'はやく泳ぐ',icon:'≫',group:'シュノーケリング',contexts:['swim'],keys:['KeyK']}
  ];
  const byId = new Map(actions.map(a=>[a.id,a]));
  const defaults = () => Object.fromEntries(actions.map(a=>[a.id,[...a.keys]]));
  const copy = value => Object.fromEntries(actions.map(a=>[a.id,[...value[a.id]]]));
  const validCode = c => typeof c==='string' && /^(?:Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Arrow(?:Up|Down|Left|Right)|Space|Enter|F8|ShiftLeft|ShiftRight|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Comma|Period|Slash|Backslash|Semicolon|Quote|BracketLeft|BracketRight|Minus|Equal|Backquote|IntlBackslash|IntlRo|IntlYen)$/.test(c);
  function label(code) {
    const names={Space:'Space',Enter:'Enter',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'左Shift',ShiftRight:'右Shift',Backspace:'Backspace',Delete:'Delete',Insert:'Insert',Home:'Home',End:'End',PageUp:'PageUp',PageDown:'PageDown',Comma:',',Period:'.',Slash:'/',Backslash:'\\',Semicolon:';',Quote:"'",BracketLeft:'[',BracketRight:']',Minus:'−',Equal:'=',Backquote:'`',IntlBackslash:'\\',IntlRo:'ろ',IntlYen:'¥'};
    return names[code] || (/^Key/.test(code)?code.slice(3):/^Digit/.test(code)?code.slice(5):/^Numpad/.test(code)?'テンキー '+code.slice(6):code);
  }
  function overlaps(a,b) {
    if ((a.confirm && ['jump','dash','kick','shoot'].includes(b.id)) || (b.confirm && ['jump','dash','kick','shoot'].includes(a.id))) return false;
    return !a.contexts || !b.contexts || a.contexts.some(c=>b.contexts.includes(c));
  }
  function problem(value) {
    if (!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).some(id=>!byId.has(id))) return '設定の形を確認できません。';
    for (const a of actions) {
      const keys=value[a.id];
      if (!Array.isArray(keys) || keys.length!==a.keys.length || !keys.some(Boolean) || keys.some(k=>k!==null && (!validCode(k) || k===menuKey&&!a.menu)) || new Set(keys.filter(Boolean)).size!==keys.filter(Boolean).length) return a.name+'のキーを確認してください。';
      for (const b of actions) if (a!==b && overlaps(a,b) && keys.some(k=>k && value[b.id]?.includes(k))) return '「'+a.name+'」と「'+b.name+'」でキーが重なっています。';
    }
    return '';
  }
  function read(raw) {
    try {
      if(typeof raw!=='string'||raw.length>8192)return null;
      const data=JSON.parse(raw);
      if(data?.version!==1)return null;
      let saved=data.bindings;
      if(saved?.jump?.length===3){
        if(saved.dash?.[0]==='Space'&&saved.dash[1]==='KeyK')saved.dash[0]=null;
        const used=actions.some(a=>a.id!=='confirm'&&a.id!=='jump'&&overlaps(a,byId.get('jump'))&&saved[a.id]?.includes('Space'));
        saved.jump.push(used||saved.jump.includes('Space')?null:'Space');
      }
      if(saved?.menu?.[0]==='Escape')saved.menu=[menuKey];
      if(problem(saved))return null;
      if(data.swimLayout!==swimLayout){
        // Move the old defaults without taking a key the player assigned elsewhere.
        for(const [action,legacy] of Object.entries(legacySwimKeys)){
          if(saved[action][0]!==legacy)continue;
          const updated={...saved,[action]:byId.get(action).keys};
          if(!problem(updated))saved=updated;
        }
      }
      return copy(saved);
    }catch{return null;}
  }
  let storage=null,loadProblem='';
  try { storage=global.localStorage; } catch { loadProblem='このブラウザではキー設定を保存できません。'; }
  let bindings=defaults();
  try { const raw=storage?.getItem(storageKey);if(raw){const saved=read(raw);if(saved)bindings=saved;else loadProblem='キー設定を読み取れなかったため、初期設定で操作できます。';} } catch { loadProblem='キー設定を読み取れません。初期設定で操作できます。'; }
  const CAMERA_KEY='KeyT';
  // Give saved custom assignments priority until the player frees T.
  const cameraKey=()=>Object.values(bindings).some(keys=>keys.includes(CAMERA_KEY))?null:CAMERA_KEY;
  let runtime={enabled:()=>false,context:()=> 'walk',clearInput:()=>{},menu:()=>{},camera:null},capture=null,lastContext=null;
  const listeners=new Set(),held=new Map(),swallowed=new Set(),internal=new WeakSet();
  const doc=global.document;
  const changed=()=>listeners.forEach(fn=>fn());
  const consume=e=>{e.preventDefault();e.stopImmediatePropagation();};
  function eventCode(e) { return e.code || (e.key===' '?'Space':e.key===menuKey?menuKey:e.key==='Enter'?'Enter':/^[a-z]$/i.test(e.key||'')?'Key'+e.key.toUpperCase():''); }
  function keyFor(code) {
    return ({Space:' ',Enter:'Enter',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',ShiftLeft:'Shift',ShiftRight:'Shift',F24:'Unidentified'})[code] || (/^Key/.test(code)?code.slice(3).toLowerCase():/^Digit/.test(code)?code.slice(5):label(code));
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
    try { storage.setItem(storageKey,JSON.stringify({version:1,swimLayout,bindings:next})); }
    catch { return '保存できませんでした。キー設定は変更していません。'; }
    releaseAll();bindings=copy(next);loadProblem='';changed();return '';
  }
  function assign(id,slot,code) {
    const a=byId.get(id);if(!a || !Number.isInteger(slot) || slot<0 || slot>=a.keys.length)return '操作を選び直してください。';
    if(code===CAMERA_KEY&&bindings[id][slot]!==code)return 'Tキーはカメラの距離・角度の切り替えに使います。';
    const next=copy(bindings);next[id][slot]=code;return commit(next);
  }
  function cancelCapture() { if(!capture)return;const done=capture.done;capture=null;done('キー変更を取り消しました。'); }
  function isEditable(target) { return target?.isContentEditable || !!target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"]'); }
  function topDialog() { return [...(doc?.querySelectorAll?.('dialog[open],[role="dialog"]:not([hidden]),[role="alertdialog"]:not([hidden])')??[])].filter(el=>el.checkVisibility?.()!==false && (el.getClientRects?.().length??1)>0).at(-1); }
  function syncContext() {
    const context=runtime.context();
    if(lastContext===context)return false;
    if(lastContext!==null)releaseAll();
    lastContext=context;
    return true;
  }
  function down(e) {
    if(internal.has(e))return;
    const physical=eventCode(e);
    if(capture){consume(e);if(e.repeat)return;if(e.ctrlKey||e.metaKey||e.altKey||e.isComposing||!validCode(physical)){capture.done('このキーは使えません。文字・数字・矢印などを押してください。',true);return;}const pending=capture,error=assign(pending.id,pending.slot,physical);swallowed.add(physical);if(!error)capture=null;pending.done(error||'保存しました。',!!error);return;}
    if(swallowed.has(physical)){consume(e);return;}
    if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||isEditable(e.target)||doc?.hidden||!runtime.enabled())return;
    if(syncContext()&&e.repeat){consume(e);return;}
    const context=lastContext;
    const dialog=topDialog(),confirm=bindings.confirm.includes(physical),menu=bindings.menu.includes(physical);
    if(dialog){
      if(held.size)releaseAll();
      if(menu){
        if(e.repeat){consume(e);return;}
        if(runtime.menu()!==false){consume(e);swallowed.add(physical);return;}
        if(physical!==menuKey){rewrite(e,menuKey);e.preventDefault();}
        return;
      }
      if(confirm){
        const button=e.target?.closest?.('button,[role="button"],a[href]');
        if(button && !button.disabled && !button.closest('[inert],[hidden]') && button.checkVisibility?.()!==false){consume(e);swallowed.add(physical);if(!e.repeat)button.click();return;}
        if(physical!=='Space'&&physical!=='Enter'){rewrite(e,'Enter',true);e.preventDefault();}
      }
      return;
    }
    if(runtime.camera&&physical===cameraKey()){
      consume(e);swallowed.add(physical);
      if(!e.repeat)runtime.camera();
      return;
    }
    if(menu){
      if(e.repeat){consume(e);return;}
      releaseAll();
      if(runtime.menu()!==false){consume(e);swallowed.add(physical);return;}
      if(physical!==menuKey){rewrite(e,menuKey);e.preventDefault();}
      return;
    }
    const active=actions.filter(a=>!a.menu&&(!a.contexts||a.contexts.includes(context)));
    const action=active.find(a=>!a.confirm&&bindings[a.id].includes(physical));
    const original=active.some(a=>a.keys.includes(physical));
    if(!action&&!confirm){if(original){consume(e);swallowed.add(physical);}return;}
    const previous=held.get(physical);
    if(e.repeat&&!previous){consume(e);return;}
    const slot=action?bindings[action.id].indexOf(physical):-1;
    const code=previous?.code||(action?action.keys[slot]??action.keys.find(Boolean):'Enter');
    const confirmPress=confirm&&action?.id!=='jump';
    held.set(physical,{code,confirm:confirmPress});rewrite(e,code,confirmPress);
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
    panel.innerHTML='<div class="keyboard-settings-intro"><span aria-hidden="true">⌨</span><div><h3>キーボード</h3><p>変えたいキーを選んで、好きなキーを押そう。</p></div></div><p class="keyboard-settings-note">すべての冒険マップで共通。設定は自動で保存されるよ。</p><p class="keyboard-settings-note" data-camera-key-help data-keyboard-only></p><p class="keyboard-settings-status" role="status" aria-live="polite"></p><div data-keyboard-groups></div><footer><button type="button" data-keyboard-reset>初期設定に戻す</button><button type="button" data-keyboard-cancel hidden>キー変更を取り消す</button><p>文字の入力中は、ゲームの操作は動かないよ。</p></footer>';
    const status=panel.querySelector('[role="status"]'),rows=[];
    for(const group of new Set(actions.map(a=>a.group))){
      const section=doc.createElement('section');section.className='keyboard-settings-group';const heading=doc.createElement('h4');heading.textContent=group;section.append(heading);
      for(const a of actions.filter(a=>a.group===group)){
        const row=doc.createElement('div');row.className='keyboard-settings-row';row.innerHTML='<div class="keyboard-settings-action"><span aria-hidden="true"></span><strong></strong></div><div class="keyboard-settings-keys"></div>';row.querySelector('span').textContent=a.icon;row.querySelector('strong').textContent=a.name;
        const slots=[];for(let i=0;i<a.keys.length;i++){
          const slot=doc.createElement('span');slot.className='keyboard-settings-slot';const button=doc.createElement('button'),remove=doc.createElement('button');button.type=remove.type='button';button.dataset.keyAction=a.id;button.dataset.keySlot=String(i);remove.textContent='×';remove.className='keyboard-key-remove';
          button.onclick=()=>{cancelCapture();releaseAll();clearInput();capture={id:a.id,slot:i,done:(text,waiting)=>{status.textContent=text;status.dataset.error=String(!!waiting);render();}};status.textContent='「'+a.name+'」のキーを押してください。';status.dataset.error='false';render();};
          remove.onclick=()=>{cancelCapture();const error=assign(a.id,i,null);status.textContent=error||'保存しました。';status.dataset.error=String(!!error);render();};slot.append(button,remove);row.querySelector('.keyboard-settings-keys').append(slot);slots.push({button,remove});
        }section.append(row);rows.push({a,slots});
      }panel.querySelector('[data-keyboard-groups]').append(section);
    }
    const cancel=panel.querySelector('[data-keyboard-cancel]');
    cancel.onclick=cancelCapture;
    function render(){
      cancel.hidden=!capture;
      panel.querySelector('[data-camera-key-help]').textContent=cameraKey()
        ?'カメラの距離・角度　Tキー（三人称）'
        :'Tは変更済みの操作に使われています。カメラの距離・角度を切り替えるには、Tの割り当てを変えてください。';
      for(const{a,slots}of rows)slots.forEach(({button,remove},i)=>{const key=bindings[a.id][i],waiting=capture?.id===a.id&&capture.slot===i;button.textContent=waiting?'キーを押してね':key?label(key):'＋';button.dataset.waiting=String(waiting);button.setAttribute('aria-label',a.name+'：'+(key?label(key):'キーを追加'));remove.hidden=!key||bindings[a.id].filter(Boolean).length<2;remove.setAttribute('aria-label',a.name+'の'+label(key)+'を外す');});}
    panel.querySelector('[data-keyboard-reset]').onclick=()=>{cancelCapture();const error=commit(defaults());status.textContent=error||'初期設定に戻しました。';status.dataset.error=String(!!error);render();};
    panel.cancelCapture=cancelCapture;status.textContent=loadProblem||'同じキーでも、歩く・いかだ・泳ぐで別の操作を設定できるよ。';listeners.add(render);render();return panel;
  }
  global.IMASORA_KEYS={
    actions,storageKey,label,problem,assign,reset:()=>commit(defaults()),
    get bindings(){return copy(bindings);},get capturing(){return !!capture;},get cameraKey(){return cameraKey();},
    describe:id=>(bindings[id]??[]).filter(Boolean).map(label).join(' ／ '),
    connect(options){releaseAll();runtime={...runtime,...options};lastContext=null;},
    release:releaseAll,syncContext,cancelCapture,createPanel,
    onChange(fn){listeners.add(fn);return()=>listeners.delete(fn);}
  };
})(globalThis);

/* BEGIN GAME BUTTON FEEDBACK */
// Embedded identically in the keyboard and touch entry points. Either can load first.
(function installGameButtonFeedback(global){
 'use strict';const doc=global.document;if(!doc?.createElement||!global.addEventListener||global.IMASORA_BUTTON_FEEDBACK)return;
 const buttonSelector='button,[role="button"],input[type="button"],input[type="submit"]';
 const directionSelector='[data-key-direction]';
 const editable='input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable],[role="textbox"]';
 const style=doc.createElement('style');style.id='imasora-game-button-feedback';
 style.textContent=`:is(${buttonSelector}):not(:disabled):not([aria-disabled="true"]){translate:0 -2px;filter:drop-shadow(0 3px 0 #14394d66)}
 :is(${buttonSelector})[data-game-press="true"],body.hunt #dash[data-latched="true"]{translate:0 2px!important;filter:brightness(.94) drop-shadow(0 1px 0 #14394d66)!important;box-shadow:inset 0 3px 5px #102d4555,inset 0 -1px 1px #ffffff55!important}
 @media(prefers-reduced-motion:no-preference){:is(${buttonSelector}){transition:translate 55ms ease-out,filter 55ms ease-out}}`;
 (doc.head||doc.documentElement).append(style);
 const owners=new Map(),painted=new Set();
 let keyboardScope=()=>doc;
 const onScreen=b=>!b.closest('[hidden],[inert]')&&(b.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})??true)&&(b.getClientRects?.().length??1)>0;
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
  if(b.dataset.playerMenu!==undefined||id==='pause'&&doc.body?.classList.contains('hunt'))return 'menu';
  if(id==='use'&&doc.body?.classList.contains('hunt'))return 'huntItem';
  if(id==='dive'&&doc.body?.classList.contains('hunt'))return 'huntDive';
  if(b.dataset.freeJump!==undefined||/jump/i.test(id)||classes.contains('jump'))return 'jump';
  if(b.dataset.holdDash!==undefined||/dash/i.test(id)||classes.contains('dash'))return 'dash';
  for(const [c,a]of [['coast-snorkel-dive','dive'],['coast-snorkel-rise','surface'],['coast-snorkel-net','net'],['coast-snorkel-kick','kick']])if(classes.contains(c))return a;
  return null;
 }
 function explicitKeys(b){
  return (b.getAttribute('aria-keyshortcuts')??'').trim().split(/\s+/).filter(Boolean)
   .map(k=>/^[a-z]$/i.test(k)?'Key'+k.toUpperCase():/^[0-9]$/.test(k)?'Digit'+k:k);
 }
 function keysFor(b,e){
  const api=global.IMASORA_KEYS,bindings=api?.bindings??{},canonical=Object.prototype.hasOwnProperty.call(e,'imasoraConfirm');
  const action=actionFor(b),defaults=api?.actions?.find(a=>a.id===action)?.keys??[];
  if(action==='camera')return api?.cameraKey?[api.cameraKey]:[];
  if(action==='huntDive'||action==='huntItem'){
   const key=action==='huntDive'?'KeyH':'KeyL',conflict=['forward','back','left','right','jump','dash','tool','menu'].some(a=>bindings[a]?.includes(key));
   return [...(!conflict?[key]:[]),...(action==='huntItem'?(bindings.tool??[]):[])];
  }
  if(action&&api&&Object.hasOwn(bindings,action)){
   const keys=canonical?defaults:(bindings[action]??[]);
   const slot=b.dataset.directionSlot;
   if(slot!==undefined)return keys[slot]?[keys[slot]]:[];
   return b.id==='ufoSpaceFireButton'?[...keys,'KeyJ']:keys;
  }
  const direct=explicitKeys(b);
  if(direct.length)return direct;
  if(!api&&['jump','brake'].includes(action))return ['Space'];
  return ({forward:['KeyW','ArrowUp'],back:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']})[action]??[];
 }
 function keyDown(e){
  if(e.code==='F8'){release();return;}
  if(e.code==='Escape'){
   // Keep the game's dialogs on their assigned buttons.
   if(!e.isComposing&&doc.querySelector('dialog[open]'))e.preventDefault();
   return;
  }
  if(e.ctrlKey||e.altKey||e.metaKey||e.isComposing||global.IMASORA_KEYS?.capturing||e.target?.closest?.(editable)||doc.hidden)return;
  const scope=keyboardScope(e);
  const focused=e.target?.closest?.('button,a[href],summary,[role="button"],input[type="submit"],input[type="button"]');
  if(e.code==='Enter'&&focused&&visible(focused)&&global.IMASORA_CONTROL_DISPLAY){
   e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)focused.click();return;
  }
  if(doc.body?.classList.contains('hunt')&&!doc.body.classList.contains('playing'))return;
  if(!scope){releaseKeyboard();return;}
  if(e.repeat&&owners.has('key:'+e.code))return;
  const matches=[...scope.querySelectorAll(buttonSelector+','+directionSelector)].filter(b=>keysFor(b,e).includes(e.code)&&visible(b));
  if(matches.length){owners.set('key:'+e.code,new Set(matches));paint();}
 }
 function keyUp(e){owners.delete('key:'+e.code);paint();}
 global.addEventListener('keydown',keyDown,true);global.addEventListener('keyup',keyUp,true);
 for(const type of ['blur','pagehide'])global.addEventListener(type,release);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)release();});
 global.IMASORA_BUTTON_FEEDBACK={release,releaseKeyboard,setKeyboardScope(resolve){releaseKeyboard();keyboardScope=resolve;}};
 if(!global.MutationObserver||!doc.documentElement)return;
 const keyStore='imasora-control-display-v1',root=doc.documentElement;
 const controlSelector='button,a[href],summary,[role="button"],input[type="button"],input[type="submit"],'+directionSelector;
 const hints=doc.createElement('style');
 hints.textContent=`
 html[data-control-display="keyboard"] :is(button,a[href],summary,[role="button"]):focus-visible{outline:3px solid #167895!important;outline-offset:3px!important}
 html[data-control-display="keyboard"] :is([data-imasora-key-primary],.imasora-inline-key)::after{
  display:inline-grid;place-items:center;box-sizing:border-box;min-width:21px;height:21px;padding:0 4px;margin-inline-start:.35em;
  vertical-align:middle;border:1px solid #6e98a5;border-radius:5px;background:#214b58;color:#fff;
  box-shadow:0 2px 0 #0b2d38;font:800 12px/1 system-ui;letter-spacing:0;white-space:nowrap;pointer-events:none
 }
 html[data-control-display="keyboard"] [data-imasora-key-primary]::after{content:attr(data-imasora-key-primary);content:attr(data-imasora-key-primary) / ""}
 html[data-control-display="keyboard"] .imasora-inline-key::after{content:attr(data-keycap);content:attr(data-keycap) / ""}
 .imasora-key-source{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 html[data-control-display="keyboard"] :is([data-game-press="true"],[data-key-held="true"],.is-held,[data-hold-dash][aria-pressed="true"])[data-imasora-key-primary]::after,
 html[data-control-display="keyboard"] :is([data-game-press="true"],[data-key-held="true"],.is-held) .imasora-inline-key::after{background:#693f13;border-color:#e5b565;box-shadow:inset 0 1px 2px #361a09;color:#fff8e8}
 html[data-control-display="keyboard"] :is(button:disabled,[aria-disabled="true"])[data-imasora-key-primary]::after,
 html[data-control-display="keyboard"] :is(button:disabled,[aria-disabled="true"]) .imasora-inline-key::after{background:#47585e;border-color:#82949a;box-shadow:none;color:#f3f8f8}
 html[data-control-display="keyboard"] :is(.sea-direct-helm button,.coast-snorkel-kick)[data-imasora-key-primary]::after{margin-inline-start:0}
 body.world-player-game[data-ufo-world-map="sky"] #viewport>.world-build-open{top:calc(max(12px,env(safe-area-inset-top)) + 51px)}
 body.world-player-game .coast-snorkel-actions button:not(.coast-snorkel-kick){
  box-sizing:border-box;min-height:46px;border:1px solid #87bac6;border-radius:12px;
  background:linear-gradient(#f1fbfc,#cde9ed);color:#15333c;font-weight:800
 }
 body.world-player-game .coast-snorkel-actions button:disabled:not(.coast-snorkel-kick){
  background:#d2dee1;color:#36545c;border-color:#a2b6bd;box-shadow:none;opacity:1
 }
 body.world-player-game .transport-play .transport-actions button:disabled:not([data-id=scoop],[data-id=dig],[data-id=drop],[data-id=earthPlace]){
  background:#334951;color:#d8e7ea;border-color:#79919a;box-shadow:none;opacity:1
 }
 html[data-control-display="touch"] :is(.imasora-inline-key,.construction-keyboard-hint,[data-vehicle-key-help],[data-keyboard-only]){display:none!important}
 html[data-control-display="keyboard"] :is(#touchPad,#ufoFlightPad,[data-construction-pad],body.hunt #pad.controls,.race-pad){display:none!important}
 .imasora-direction-guide{display:grid;grid-template-columns:repeat(2,max-content);gap:5px 7px;padding:7px;border:1px solid #9fbfc6;border-radius:14px;background:#122f39ec;color:#fff;font:700 13px/1.2 system-ui;pointer-events:none;user-select:none}
 .imasora-direction-guide[hidden]{display:none!important}
 .imasora-direction-guide [data-key-direction]{display:flex;align-items:center;gap:5px;min-height:30px;padding:3px 6px;border:1px solid #769fa9;border-radius:7px;background:#f1fbfc;color:#15333c;box-shadow:0 2px 0 #6f959e;white-space:nowrap}
 .imasora-direction-guide kbd{display:inline-flex;align-items:center;justify-content:center;min-width:20px;min-height:20px;border-radius:4px;padding:0 3px;background:#214b58;color:#fff;font:800 12px/1 system-ui}
 .imasora-direction-guide [data-key-direction][data-game-press="true"]{transform:translateY(2px);background:#ffdb83;border-color:#a66b24;box-shadow:inset 0 2px 3px #5b432960}
 .imasora-direction-guide [data-key-direction][data-game-press="true"] kbd{background:#693f13}
 .world-direction-guide,.hunt-direction-guide{position:absolute;z-index:24;bottom:max(22px,env(safe-area-inset-bottom));left:max(16px,env(safe-area-inset-left))}
 .hunt-direction-guide{display:none}body.hunt.playing:not(.hunt-sky-opening-visible) .hunt-direction-guide:not([hidden]){display:grid}
 html[data-control-display="keyboard"] #viewport:has(>.world-direction-guide:not([hidden]))>#ufoFlightControls{display:none!important}
 .race-controls>.race-direction-guide{pointer-events:none;order:-1}
 body:has(.race-setup:not([hidden])) .race-direction-guide{display:none}
 html[data-control-display="keyboard"] .construction-keyboard-hint:not([hidden]){display:block!important}
 @media(max-width:360px){html[data-control-display="keyboard"] .sea-direct-helm>[data-oar="both"]{display:none!important}}
 @media(max-width:720px){.world-direction-guide,.hunt-direction-guide{left:max(6px,env(safe-area-inset-left));bottom:max(10px,env(safe-area-inset-bottom))}.imasora-direction-guide{gap:4px;padding:5px;font-size:12px}.imasora-direction-guide [data-key-direction]{gap:4px;min-height:26px;padding:2px 4px}}
 @media(max-height:500px){.world-direction-guide.is-raft{bottom:max(64px,env(safe-area-inset-bottom))}}
 
 body.world-player-game[data-world-control-owner="activity"] #viewport>:is(#touchPad,#constructionJumpButton,#walkDashButton,.world-camera-controls,.world-player-bar,#buildMenuButton){display:none!important}
 html[data-control-display="touch"] body.world-player-game[data-world-control-owner="ufo"] #viewport>#walkDashButton:not([hidden]){display:block!important}
 html[data-control-display="touch"] body.world-player-game[data-world-control-owner="walk"] #viewport>:is(#touchPad,#constructionJumpButton,#walkDashButton):not([hidden]),
 html[data-control-display="touch"] .transport-play :is(.construction-jump-button,.construction-move-pad):not([hidden]),
 html[data-control-display="touch"] .free-concrete :is(.construction-move-pad,[data-free-jump]):not([hidden]),
 html[data-control-display="touch"] body.hunt.playing :is(#pad.controls,#pair.controls,#pair #jump,#pair #dash):not([hidden]){display:block!important}
 html[data-control-display="touch"] body.hunt.playing #pair.controls{left:auto!important;right:22px!important;top:auto!important;bottom:26px!important;transform:none!important}
 .imasora-control-display-toggle{position:fixed;z-index:950;min-height:38px!important;padding:6px 12px!important;border:1px solid #cce6ed!important;border-radius:9px!important;background:#183843!important;color:#f2fafb!important;font:700 14px/1.3 system-ui!important;white-space:nowrap}
 .app-nav>.imasora-control-display-toggle{position:static;grid-column:1/-1;flex:0 0 100%;justify-self:center;margin-top:4px;min-width:0}
 .imasora-action-confirm{width:min(350px,calc(100vw - 32px));box-sizing:border-box;padding:20px;background:#173343;color:#fff5de;border:2px solid #d7bf7f;border-radius:16px;font:600 16px/1.55 system-ui}
 .imasora-action-confirm::backdrop{background:#09202fb8}.imasora-action-confirm p{margin:0 0 14px}.imasora-action-confirm .confirm-actions{display:flex;gap:12px;justify-content:flex-end}
 .imasora-action-confirm button{min-height:44px;padding:7px 14px;border:1px solid #bfdce4;border-radius:9px;background:#dbeff6;color:#193441;font:700 15px system-ui}
 .imasora-action-confirm button[value=yes]{background:#ffe3a0;border-color:#f1bf55}
 html[data-control-display="touch"] .imasora-control-display-toggle::after{content:none!important}
 `;
 (doc.head||root).append(hints);
 let mode;
 try{mode=global.localStorage?.getItem(keyStore);}catch{}
 if(mode!=='keyboard'&&mode!=='touch')mode=global.matchMedia?.('(pointer: coarse)').matches?'touch':'keyboard';
 let toggle;
 function syncMode(){
  root.dataset.controlDisplay=mode;
  if(toggle)toggle.textContent=mode==='touch'?'キーボード操作表示に切り替え':'スマホ操作用表示に切り替え';
  schedulePlacement();
 }
 function switchMode(){
  mode=mode==='touch'?'keyboard':'touch';syncMode();
  if(global.IMASORA_KEYS)global.IMASORA_KEYS.release();
  else release();
  global.dispatchEvent(new global.Event('imasora-control-display-change'));
  try{global.localStorage?.setItem(keyStore,mode);}catch{}
 }
 global.IMASORA_CONTROL_DISPLAY={get mode(){return mode;},toggle:switchMode};
 syncMode();
 global.addEventListener('keydown',e=>{
  if(e.code!=='F2'||e.repeat||e.target?.closest?.(editable)||global.IMASORA_KEYS?.capturing)return;
  e.preventDefault();e.stopImmediatePropagation();switchMode();
 },true);
 const keyNames={ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',ShiftLeft:'左Shift',ShiftRight:'右Shift'};
 const keyName=k=>global.IMASORA_KEYS?.label(k)??keyNames[k]??k.replace(/^(?:Key|Digit)/,'');
 const inlineKeys=/(?:［([\wＡ-Ｚ０-９ /／＋+・↑↓←→−-]+)］|\[([\w /／＋+・↑↓←→−-]+)\]|[（(]([A-ZＡ-Ｚ0-9０-９]|Space|Enter|Tab)キー[）)])/g;
 function inlineKeyLabel(match){
  const name=(match[1]??match[2]??match[3]).normalize('NFKC').trim();
  return /^(?:[A-Z0-9↑↓←→]|F(?:[1-9]|1[0-2])|Space|Enter|Tab|Shift)(?:[ /+・]+(?:[A-Z0-9↑↓←→]|Space|Enter|Tab|Shift))*$/.test(name)?name:'';
 }
 function setKeyDisplay(b,keys=[]){
  const codes=[...new Set(keys.filter(Boolean))];
  const label=codes.map(keyName).join(' / ');
  const primary=codes.includes('ShiftLeft')&&codes.includes('ShiftRight')&&codes.length===2?'Shift':
   codes.includes('Space')&&actionFor(b)==='jump'?'Space':
   (codes.length<3?label:keyName(codes[0]));
  for(const [key,value] of [['data-imasora-key-label',label],['data-imasora-key-primary',primary]]){
   if(!value)b.removeAttribute(key);
   else if(b.getAttribute(key)!==value)b.setAttribute(key,value);
  }
 }
 function annotate(b){
  if(!b?.isConnected||b.closest('[data-key-hint-ignore]'))return;
  if(b.matches(directionSelector)){
   const key=keysFor(b,{}).find(Boolean);
   b.hidden=!key;
   const name=key?keyName(key):'';
   if(b.firstElementChild.textContent!==name)b.firstElementChild.textContent=name;
   return;
  }
  if(b.getAttribute('role')==='button'&&!b.hasAttribute('tabindex')&&b.tabIndex<0)b.tabIndex=0;
  let inline=!!b.querySelector('.imasora-inline-key');
  const walker=doc.createTreeWalker(b,4),nodes=[];let text;
  while(text=walker.nextNode())if(!text.parentElement?.closest('.imasora-key-label,.imasora-inline-key,svg'))nodes.push(text);
  for(const n of nodes){
   const matches=[...n.data.matchAll(inlineKeys)].filter(inlineKeyLabel);
   if(!matches.length)continue;
   inline=true;
   const fragment=doc.createDocumentFragment();let end=0;
   for(const m of matches){
    fragment.append(n.data.slice(end,m.index));
    const span=doc.createElement('span');span.className='imasora-inline-key';span.dataset.keycap=inlineKeyLabel(m);
    const source=doc.createElement('span');source.className='imasora-key-source';source.textContent=m[0];span.append(source);fragment.append(span);
    end=m.index+m[0].length;
   }
   fragment.append(n.data.slice(end));n.replaceWith(fragment);
  }
  if(b.matches('.transport-exc-aux > button,.transport-excavator [data-id=excActions] > button')){
   // Keep the original layout metrics and accessible label. The game HUD
   // renders the same label independently from the shortcut position.
   const label=b.textContent.replace(inlineKeys,'').trim();
   let visual=b.querySelector('.transport-keyboard-label');
   if(!visual){
    visual=doc.createElement('span');visual.className='transport-keyboard-label';
    visual.setAttribute('aria-hidden','true');b.append(visual);
   }
   if(visual.dataset.label!==label)visual.dataset.label=label;
  }
  if(inline){setKeyDisplay(b);return;}
  if(b.matches('input')){
   if(!b.title)b.title='Tabで選び、Enterで決定';
   return;
  }
  const action=actionFor(b);
  const physical=keysFor(b,{});
  const inferred=b.dataset.gameAction||b.dataset.oar||['huntItem','huntDive','jump','dash','shoot','menu','dive','surface','net','kick'].includes(action);
  setKeyDisplay(b,inferred&&physical.length?physical:explicitKeys(b));
 }
 let placement=0,placedAt=-Infinity;
 const transportHudSelector='.transport-note,.transport-trial-time';
 function schedulePlacement(){
  if(!toggle||placement)return;
  placement=global.setTimeout(()=>{placement=0;placedAt=performance.now();placeToggle();},Math.max(0,110-(performance.now()-placedAt)));
 }
 function placeToggle(){
  const menu=[...doc.querySelectorAll('dialog[open],.world-map-menu:not([hidden]),.gv-menu:not([hidden])')].find(onScreen);
  if(menu){toggle.hidden=true;return;}
  toggle.hidden=false;
  const dock=doc.querySelector('.transport-play.transport-active .transport-top');
  const parent=dock??doc.querySelector('.app-nav')??doc.body;
  if(toggle.parentElement!==parent)parent.append(toggle);
  if(dock||parent.matches('.app-nav'))return;
  const vw=doc.documentElement.clientWidth,vh=doc.documentElement.clientHeight,w=toggle.offsetWidth,h=toggle.offsetHeight;
  if(!w||!h)return;
  const protectedArea=controlSelector+',.hunt-clock,.transport-note,.transport-trial-time,#rainStoryHint,.world-nearby-guide,.world-nearby-name,.gv-message,.free-task-card,.free-hud-top,.free-hud-notice'+(doc.body.classList.contains('world-construction-menu')?',#touchPad,.construction-move-pad':'');
  const obstacles=[...doc.querySelectorAll(protectedArea)].filter(b=>b!==toggle&&onScreen(b)).map(b=>b.getBoundingClientRect());
  const left=8,right=vw-w-8,centre=Math.round((vw-w)/2);
  const clear=(x,y)=>x>=8&&!obstacles.some(r=>x-5<r.right&&x+w+5>r.left&&y-5<r.bottom&&y+h+5>r.top);
  const yLimit=Math.min(vh-h-8,310);
  const excavator=doc.querySelector('.transport-play.transport-active.transport-excavator');
  // Keep the display switch off the excavator's arm in landscape.
  if(excavator&&vh<=480){
   for(let y=8;y<yLimit;y+=12){
    for(const x of [left,right]){
     if(!clear(x,y))continue;
     toggle.style.left=x+'px';toggle.style.top=y+'px';return;
    }
   }
  }
  for(let y=8;y<yLimit;y+=12){
   for(const x of [centre,left,right]){
    if(!clear(x,y))continue;
    toggle.style.left=x+'px';toggle.style.top=y+'px';return;
   }
  }
  toggle.hidden=true;
 }
 const confirmationText=b=>{
  if(b.closest('[data-confirm-handler],.imasora-action-confirm,.ww-undo-confirm,.free-confirm-overlay,dialog[data-parking-confirm]'))return '';
  const text=b.textContent.trim().normalize('NFKC').replace(/\s+/g,' ').replace(/^[✓↶⟲]\s*/,'');
  if(b.matches('[data-id=save],[data-action=save],#saveButton'))return '今の状態をセーブしますか？';
  if(/^1つ前に(?:もどす|戻す)|^(?:このセーブ|この記録|選んだセーブ)に戻す$/.test(text))return 'この操作を取り消しますか？';
  if(/^セーブする|^(?:木材作業|作業)を保存$|^保存する$|^.*セーブして(?:工事現場へ|戻る)$/.test(text))return '今の状態をセーブしますか？';
  return '';
 };
 function requestConfirmation(message,onAccept){
  if(doc.querySelector('.imasora-action-confirm[open]'))return;
  const ask=doc.createElement('dialog');ask.className='imasora-action-confirm';ask.setAttribute('aria-label',message);
  const label=doc.createElement('p');label.textContent=message;
  const actions=doc.createElement('div');actions.className='confirm-actions';
  const cancel=doc.createElement('button');cancel.type='button';cancel.value='no';cancel.textContent='いいえ';cancel.autofocus=true;
  const accept=doc.createElement('button');accept.type='button';accept.value='yes';accept.textContent='はい';
  actions.append(cancel,accept);ask.append(label,actions);doc.body.append(ask);
  ask.addEventListener('close',()=>ask.remove(),{once:true});
  cancel.onclick=()=>ask.close();
  accept.onclick=()=>{ask.close();onAccept();};
  ask.showModal();
 }
 global.IMASORA_CONFIRM_ACTION=requestConfirmation;
 const confirmed=new WeakSet();
 function confirmManualAction(event){
  const b=event.target?.closest?.('button');
  if(!b||b.disabled||confirmed.delete(b))return;
  const message=confirmationText(b);
  if(!message)return;
  event.preventDefault();event.stopImmediatePropagation();
  requestConfirmation(message,()=>{
   if(b.isConnected&&visible(b)){confirmed.add(b);b.click();}
  });
 }
 function addMenuNumbers(){
  for(const b of doc.querySelectorAll('.app-nav .nav-tab[data-tab]')){
   const index=['home','walk','tag','monster','town','rules'].indexOf(b.dataset.tab);
   if(index>=0)b.setAttribute('aria-keyshortcuts',String(index+1));
  }
  global.addEventListener('keydown',e=>{
   if(!/^Digit[1-6]$/.test(e.code)||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.target?.closest?.(editable)||doc.querySelector('dialog[open],[aria-modal=true]:not([hidden])'))return;
   const b=doc.querySelector('.app-nav .nav-tab[aria-keyshortcuts="'+e.code.slice(-1)+'"]');
   if(!b||!visible(b))return;
   e.preventDefault();e.stopImmediatePropagation();b.click();
  },true);
 }
 // Changing the timer or the work readout does not move a control. Recheck
 // the whole HUD only if its measured outline can cover the display switch.
 const watchedTransportHud=new WeakSet();
 const transportHudObserver=typeof global.ResizeObserver==='function'?new global.ResizeObserver(entries=>{
  if(!toggle?.isConnected)return;
  if(toggle.hidden){schedulePlacement();return;}
  const t=toggle.getBoundingClientRect();
  if(entries.some(({target})=>{
   if(target.hidden)return false;
   const r=target.getBoundingClientRect();
   return t.left-5<r.right&&t.right+5>r.left&&t.top-5<r.bottom&&t.bottom+5>r.top;
  }))schedulePlacement();
 }):null;
 function watchTransportHud(element,adding){
  if(!transportHudObserver||!element.matches('.transport-play'))return;
  for(const part of element.querySelectorAll(transportHudSelector)){
   if(adding){watchedTransportHud.add(part);transportHudObserver.observe(part);}
   else{watchedTransportHud.delete(part);transportHudObserver.unobserve(part);}
  }
 }
 const pendingButtons=new Set();let raf=0;
 global.IMASORA_BUTTON_FEEDBACK.createDirections=(host,className='')=>{
  const guide=doc.createElement('div');
  guide.className='imasora-direction-guide'+(className?' '+className:'');
  guide.dataset.keyboardOnly='';
  guide.setAttribute('role','group');
  guide.hidden=true;
  host.append(guide);
  let current=null;
  return {element:guide,show(rows,label='移動キー'){
   if(guide.hidden===!!rows)guide.hidden=!rows;
   if(!rows||rows===current)return;
   releaseKeyboard();
   current=rows;
   guide.setAttribute('aria-label',label);
   guide.replaceChildren(...rows.map(([action,name,slot])=>{
    const row=doc.createElement('span'),key=doc.createElement('kbd'),caption=doc.createElement('span');
    row.dataset.keyDirection='';
    row.dataset.gameAction=action;
    if(slot!==undefined)row.dataset.directionSlot=slot;
    caption.textContent=name;
    row.append(key,caption);
    return row;
   }));
   for(const row of guide.children)annotate(row);
  }};
 };
 function queue(node){
  const e=node.nodeType===1?node:node.parentElement;
  if(!e||e.closest('.imasora-inline-key'))return;
  const b=e.closest(controlSelector);if(b)pendingButtons.add(b);
  for(const child of e.querySelectorAll(controlSelector))pendingButtons.add(child);
  if(!raf)raf=global.requestAnimationFrame(()=>{
   raf=0;const pending=[...pendingButtons];pendingButtons.clear();
   pending.forEach(annotate);
  });
 }
 // Visibility and placement still update when the transport HUD changes layout.
 // These classes do not change any control's label or shortcut.
 function transportLayoutOnly(record){
  if(record.attributeName!=='class')return false;
  const target=record.target;
  const layoutClasses=target===doc.body?['world-excavation-playing','world-transport-playing']:
   target.id==='viewport'?['world-excavation-viewport-operating']:
   target.classList.contains('transport-play')?['transport-active','transport-on-foot']:null;
  if(!layoutClasses)return false;
  const otherClasses=value=>(value??'').split(/\s+/).filter(token=>token&&!layoutClasses.includes(token)).join(' ');
  return otherClasses(record.oldValue)===otherClasses(target.getAttribute('class'));
 }
 function startHints(){
  toggle=doc.createElement('button');toggle.type='button';toggle.className='imasora-control-display-toggle';
  toggle.setAttribute('aria-keyshortcuts','F2');toggle.onclick=switchMode;
  (doc.querySelector('.app-nav')??doc.body).append(toggle);
  addMenuNumbers();syncMode();queue(doc.body);
  doc.addEventListener('click',confirmManualAction,true);
  global.addEventListener('resize',()=>{
   if(doc.body.classList.contains('world-construction-menu'))placeToggle();
   schedulePlacement();
  });
  global.addEventListener('scroll',schedulePlacement,true);
  global.visualViewport?.addEventListener('resize',schedulePlacement);
  const observer=new MutationObserver(records=>{
   for(const r of records){
    if(r.type==='attributes'&&r.oldValue===r.target.getAttribute(r.attributeName))continue;
    if(r.target.closest?.('.imasora-inline-key'))continue;
    const transportReadout=transportHudObserver&&r.type==='childList'&&watchedTransportHud.has(r.target.closest?.(transportHudSelector))&&
      [...r.addedNodes,...r.removedNodes].every(n=>n.nodeType===3);
    if(r.target!==toggle&&!transportReadout&&(r.type==='childList'||r.target===doc.body||r.attributeName==='hidden'||r.attributeName==='open'))schedulePlacement();
    if(r.type==='childList'){
     if(r.target.closest?.(controlSelector))queue(r.target);
     for(const n of r.removedNodes)if(n.nodeType===1)watchTransportHud(n,false);
     for(const n of r.addedNodes)if(n.nodeType===1){watchTransportHud(n,true);queue(n);}
    }else if(!['hidden','open'].includes(r.attributeName)&&!transportLayoutOnly(r)&&(r.target.nodeType===1||r.target.parentElement?.closest(controlSelector)))queue(r.target);
   }
  });
  observer.observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['aria-keyshortcuts','data-game-action','hidden','open','class']});
  global.IMASORA_KEYS?.onChange(()=>queue(doc.body));
 }
 if(doc.body)startHints();else doc.addEventListener('DOMContentLoaded',startHints,{once:true});
})(globalThis);
/* END GAME BUTTON FEEDBACK */
