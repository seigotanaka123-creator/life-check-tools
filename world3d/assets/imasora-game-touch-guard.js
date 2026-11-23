// Shared by the home/arcade, 3D maps and construction vehicle pages.
// Native text fields remain editable; ordinary menu scrolling is preserved.
(function installGameTouchGuard(doc){
 'use strict';if(!doc||doc.getElementById('imasora-game-touch-guard'))return;
 const controls='button,[role="button"],[role="tab"],summary,a,canvas,input[type="button"],input[type="submit"],input[type="reset"],input[type="range"],.touch-pad,.ufo-flight-pad';
 const directionSelector='[data-key-direction]';
 const editable='input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]),textarea,select,[contenteditable]:not([contenteditable="false"]),[data-allow-text-selection]';
 const surface='[data-game-gesture-surface]';
 const style=doc.createElement('style');style.id='imasora-game-touch-guard';
 style.textContent=`:is(${controls}),:is(${controls}) *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important;-webkit-user-drag:none!important}
 :is(${editable}),:is(${editable}) *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}
 button,[role="button"],[role="tab"],summary,a{touch-action:manipulation}
 .concrete-controls [data-drive],.concrete-controls [data-move]{touch-action:none!important}
 ${surface}{touch-action:pan-y}`;
 (doc.head||doc.documentElement).append(style);
 const guard=e=>{const target=e.target?.nodeType===3?e.target.parentElement:e.target;if(!target?.closest||target.closest(editable)||!target.closest(controls))return;e.preventDefault();};
 for(const event of ['selectstart','contextmenu','dragstart'])doc.addEventListener(event,guard,{capture:true,passive:false});
 // Safari can recognize a page pinch across separate controls. Cancel only
 // its browser default, so both fingers still reach the movement handlers.
 const touches=new Map();let gameGesture=false;
 const inGame=target=>!!target?.closest&&!target.closest(editable)&&!!target.closest(surface);
 function reconcile(e){
  if(e.touches){const live=new Set();for(const t of Array.from(e.touches)){live.add(t.identifier);if(t.target)touches.set(t.identifier,inGame(t.target));else if(!touches.has(t.identifier))touches.set(t.identifier,inGame(e.target));}for(const id of touches.keys())if(!live.has(id))touches.delete(id);}
  else for(const t of Array.from(e.changedTouches??[])){if(e.type==='touchend'||e.type==='touchcancel')touches.delete(t.identifier);else touches.set(t.identifier,inGame(t.target??e.target));}
 }
 const prevent=e=>{if(e.cancelable!==false)e.preventDefault();};
 const hasGameTouch=()=>Array.from(touches.values()).some(Boolean);
 function multiTouch(e){reconcile(e);if(touches.size>1&&hasGameTouch())prevent(e);}
 for(const event of ['touchstart','touchmove'])doc.addEventListener(event,multiTouch,{capture:true,passive:false});
 for(const event of ['touchend','touchcancel'])doc.addEventListener(event,e=>{reconcile(e);if(touches.size<2)gameGesture=false;},{capture:true,passive:true});
 doc.addEventListener('gesturestart',e=>{gameGesture=hasGameTouch()||inGame(e.target);if(gameGesture)prevent(e);},{capture:true,passive:false});
 doc.addEventListener('gesturechange',e=>{if(gameGesture||hasGameTouch()||inGame(e.target))prevent(e);},{capture:true,passive:false});
 doc.addEventListener('gestureend',e=>{if(gameGesture||hasGameTouch()||inGame(e.target))prevent(e);gameGesture=false;},{capture:true,passive:false});
 const reset=()=>{touches.clear();gameGesture=false;};
 for(const event of ['blur','pagehide'])doc.defaultView?.addEventListener(event,reset);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)reset();});
})(typeof document==='undefined'?null:document);

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
