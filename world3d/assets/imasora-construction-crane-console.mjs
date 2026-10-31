// Compact direct controls. The existing actions remain the authority; this
// view only forwards a deliberate press and continuous, cancellable input.
const clamp=v=>Math.max(-1,Math.min(1,v));
export function craneStick(x,y){const n=Math.max(1,Math.hypot(x,y));return{x:Math.abs(x)<.12?0:clamp(x/n),y:Math.abs(y)<.12?0:clamp(y/n)};}
export function bindCraneStick(element,{vertical=false,enabled=()=>true,onStart=()=>{}}={}){
 let pointer=null,value={x:0,y:0};
 const paint=()=>{element.style.setProperty('--stick-x',String(value.x*25)+'px');element.style.setProperty('--stick-y',String(value.y*25)+'px');};
 const reset=()=>{pointer=null;value={x:0,y:0};paint();};
 function move(e){if(e.pointerId!==pointer)return;if(!enabled()){reset();return;}const r=element.getBoundingClientRect();value=craneStick(vertical?0:(e.clientX-r.left-r.width/2)/(r.width*.34),(e.clientY-r.top-r.height/2)/(r.height*.34));paint();e.preventDefault();}
 element.addEventListener('pointerdown',e=>{if(pointer!==null||!enabled())return;e.preventDefault();onStart();pointer=e.pointerId;element.setPointerCapture(pointer);move(e);});
 element.addEventListener('pointermove',move);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(name,e=>{if(e.pointerId===pointer)reset();});
 return{reset,read(){if(!enabled())reset();return value;}};
}
const craneIcon='<svg viewBox="0 0 80 54" aria-hidden="true"><path d="M12 45h56M19 40V30h27v10M27 30V10l36 7v12M27 10l8 20M63 29v7q-8 9-8 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="43" r="5" fill="currentColor"/><circle cx="46" cy="43" r="5" fill="currentColor"/></svg>';
export function createCraneConsole({panel,game,button,stop,clear}){
 const q=s=>panel.querySelector(s),active=q('.gv-active'),nav=q('.gv-nav'),pages=q('.gv-pages');let blocked=true,arm=false,tools=false;
 panel.classList.add('wt-console');
 const console=document.createElement('section');console.className='wc-console';console.setAttribute('aria-label','クレーンの直接操作');
 console.innerHTML='<div class="wc-stick-wrap"><span class="wc-pad-title">アーム</span><button class="wc-stick" aria-label="アーム操作パッド"><span class="wc-up">伸ばす</span><span class="wc-down">縮める</span><span class="wc-left">↶</span><span class="wc-right">↷</span><i></i></button></div><div class="wc-task"><span class="wc-picture">'+craneIcon+'</span><p class="wc-note"></p><button class="wc-primary"></button></div><div class="wc-lift-wrap"><span>フック</span><button class="wc-lift" aria-label="巻き上げ・巻き下げレバー"><span>上げる<br>▲</span><i></i><span>▼<br>下げる</span></button></div>';
 const extras=document.createElement('section');extras.className='wc-extras';extras.hidden=true;const close=document.createElement('button');close.className='wc-tools-close';close.textContent='× 操作にもどる';extras.append(close,nav,pages);active.prepend(console,extras);
 const originalJump=q('[data-hold=jump]');originalJump.classList.add('wc-jump');console.append(originalJump);
 const head=document.createElement('div');head.className='wc-head';head.innerHTML='<button class="wc-mode"></button><button class="wc-tools" aria-expanded="false">🧰 道具</button>';panel.querySelector('header').append(head);
 // Camera and lesser-used actions remain available, without occupying the dock.
 const utilities=document.createElement('div');utilities.className='wc-utilities';utilities.append(button('camera'),button('interact'));extras.prepend(utilities);
 nav.children[2].textContent='🏗 建材を動かす';nav.children[3].textContent='🪵 材料・調整';pages.children[2].classList.add('wc-material-actions');
 const primary=console.querySelector('.wc-primary'),note=console.querySelector('.wc-note'),mode=head.querySelector('.wc-mode'),toolsButton=head.querySelector('.wc-tools'),pad=console.querySelector('.wc-stick'),lift=console.querySelector('.wc-lift');let primarySource=null,lastArm=null,lastAboard=null;
 const allowed=()=>!blocked&&!tools&&!game.paused&&!game.menuOpen;
 const xy=bindCraneStick(pad,{enabled:allowed,onStart:stop}),winch=bindCraneStick(lift,{vertical:true,enabled:()=>allowed()&&arm,onStart:stop});
 function reset(){xy.reset();winch.reset();}
 function setTools(yes){reset();clear();tools=yes;extras.hidden=!yes;console.hidden=yes;panel.dataset.consoleTools=String(yes);toolsButton.setAttribute('aria-expanded',String(yes));if(yes)nav.children[2]?.click();}
 toolsButton.onclick=()=>setTools(!tools);close.onclick=()=>setTools(false);
 mode.onclick=()=>button('mode').click();primary.onclick=()=>{if(primarySource&&!primarySource.disabled)primarySource.click();};
 const text=(e,t)=>{if(e.textContent!==t)e.textContent=t;};
 return{reset,read:()=>{const p=xy.read(),h=winch.read();return{x:p.x,y:p.y,hoist:-h.y};},refresh({crane,aboard,busy,direct,hasCargo,job,issue=''}){
  if(lastArm!==crane||lastAboard!==aboard){if(tools)setTools(false);reset();lastArm=crane;lastAboard=aboard;}arm=crane;blocked=busy;if(blocked||game.paused||game.menuOpen)reset();
  const paused=game.paused&&!game.menuOpen;
  primarySource=paused?q('.gv-pause'):job?button('upper-stop'):!aboard?button('interact'):!crane?button('mode'):direct?button('girder-direct'):hasCargo?button('place'):button('pick');
  text(primary,paused?'▶ あそびにもどる':job?'■ いったん止める':primarySource?.textContent??'');primary.disabled=!!primarySource?.disabled||game.menuOpen;
  text(note,paused?'ひと休み中':issue||direct?.note||(!aboard?'パッドで車のドアへ':!crane?'パッドで運転 → 止まって作業へ':hasCargo?'パッドで運ぶ → レバーで下ろす':'フックを建材の真上へ'));
  text(mode,crane?'🚚 運転へ':'🏗 作業へ');mode.hidden=!aboard;mode.disabled=button('mode').disabled||busy;
  toolsButton.disabled=busy||game.menuOpen||paused;close.disabled=false;
  text(console.querySelector('.wc-pad-title'),crane?'アーム':'移動');pad.setAttribute('aria-label',crane?'アーム操作パッド':'移動パッド');pad.disabled=!allowed();lift.disabled=!allowed();
  text(console.querySelector('.wc-up'),crane?'伸ばす':'前へ');text(console.querySelector('.wc-down'),crane?'縮める':'後ろへ');
  console.querySelector('.wc-lift-wrap').hidden=!crane;originalJump.hidden=aboard;
  panel.dataset.consoleArm=String(crane);panel.dataset.consoleAboard=String(aboard);
 }};
}
